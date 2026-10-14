// V11: Your time. Time that's over keeps what happened in it (keepPast), a block dropped on a whole
// day goes in its first open time (dayFit), and a block on time that's over went in as done (overBy).
// Cut out of board/src/app.js and run on the sample family's week.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const yesterday = '2026-10-13';
const ws = M.weekStart(today);

test('over means a day gone by, or a time today that has ended', () => {
  const r = appRig(D.sampleState(today), today, 14 * 60);
  assert.equal(r.overBy(yesterday, 1200, 30), true);
  assert.equal(r.overBy(today, 780, 60), true, '1 to 2 pm is over at 2');
  assert.equal(r.overBy(today, 810, 60), false, '1:30 to 2:30 is still going');
  assert.equal(r.overBy('2026-10-15', 300, 30), false);
  assert.equal(r.startedBy(today, 830), true);
  assert.equal(r.startedBy(today, 840), false);
});

test('a past day takes a block where nothing that happened has to move', () => {
  const st = D.sampleState(today);
  const r = appRig(st, today, 14 * 60);
  const x = M.canPlace(st, yesterday, 30, 1170);
  assert.equal(x.ok, true);
  assert.equal(r.keepPast(x), x, 'a drop that moves nothing lands as it is');
  // a time to come is never held back
  const later = M.canPlace(st, '2026-10-16', 60, 600);
  assert.equal(r.keepPast(later), later);
});

test('a drop on time that’s over never moves a block that had started', () => {
  const st = D.sampleState(today);
  const r = appRig(st, today, 14 * 60);
  // 12:30 today, an hour long, slides Deep work (1 pm, already started) to make room
  const x = M.canPlace(st, today, 60, 750);
  assert.equal(x.ok, true);
  assert.ok(x.pushes.some((p) => p.base === 'add:sample-deep' && p.delta));
  const kept = r.keepPast(x);
  assert.equal(kept.ok, false);
  assert.equal(kept.reason, 'past');
  assert.equal(x.ok, true, 'what it was given is left alone');
});

test('a drop that started before now may slide a block that hasn’t started yet', () => {
  const st = D.sampleState(today);
  M.placeAdd(st, today, { name: 'Call', cat: 'family', icon: 'handset', dur: 30 }, 900);
  const r = appRig(st, today, 14 * 60 + 40);
  const x = M.canPlace(st, today, 45, 870);
  assert.equal(x.ok, true);
  assert.ok(x.pushes.some((p) => p.start === 915 && p.delta === 15), 'the 3 pm call slides to 3:15');
  assert.equal(r.keepPast(x).ok, true);
});

test('a whole day takes a block in its first open time: from 9 on another day, from now today', () => {
  const st = D.sampleState(today);
  const r = appRig(st, today, 14 * 60 + 5);
  const spec = { kind: 'block', id: 'workout' };
  assert.equal(r.dayFit('2026-10-16', spec), M.firstFit(st, '2026-10-16', 60, 540));
  const now = r.dayFit(today, spec);
  assert.ok(now >= 14 * 60 + 15, 'never before now, on the quarter hour: ' + now);
  assert.equal(now % 15, 0);
  assert.equal(r.dayFit('2026-10-17', spec), M.firstFit(st, '2026-10-17', 60, 540));
});

test('a past day takes a whole-day drop only where nothing moves', () => {
  const st = D.sampleState(today);
  const r = appRig(st, today, 14 * 60);
  for (const date of M.range(ws, 3)) {
    for (const id of ['stretch', 'run', 'workout', 'project']) {
      const s = r.dayFit(date, { kind: 'block', id });
      if (s == null) continue;
      const dur = M.gridDur(st.palette.find((p) => p.id === id).dur), x = M.canPlace(st, date, dur, s);
      assert.equal(x.ok, true, date + ' ' + id);
      assert.equal((x.pushes || []).filter((p) => p.delta).length, 0, date + ' ' + id + ' moves nothing');
    }
  }
  // a day gone by with no open time left says no, instead of moving what happened
  const d0 = M.calendarDay(st, yesterday);
  for (let s = 540; s + 15 <= d0.bed; s += 15) {
    const c = M.canPlace(st, yesterday, 15, s);
    if (c.ok && !(c.pushes || []).some((p) => p.delta)) M.placeAdd(st, yesterday, { name: 'Note', cat: 'yours', icon: 'star', dur: 15 }, s);
  }
  assert.equal(appRig(st, today, 14 * 60).dayFit(yesterday, { kind: 'block', id: 'run' }), null);
});

test('a block of yours, a to-do, and an idea each become what goes on the day', () => {
  const st = D.sampleState(today);
  const r = appRig(st, today, 600);
  assert.deepEqual(plain(r.specAdd({ kind: 'block', id: 'run' }).src), { type: 'block', id: 'run' });
  assert.equal(r.specAdd({ kind: 'task', id: 'garage' }).dur, 110, 'a to-do is as long as its steps');
  const idea = plain(r.specAdd({ kind: 'idea', id: 'k-park' }));
  assert.equal(idea.cat, 'family', 'an idea takes its group’s color');
  assert.deepEqual(idea.src, { type: 'idea', id: 'k-park', for: 'kids', who: 'Robin' }, 'the only kid is who it’s with');
  assert.equal(r.specAdd({ kind: 'block', id: 'nope' }), undefined);
});
