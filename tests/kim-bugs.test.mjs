// Kim's first try of V11-2 (Oct 20, docs/KIM-TEST.md): the bugs and rough edges on the desk after the setup. The app's
// parts are cut out of board/src/app.js and run on a stand-in world (tests/v11-rig.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D } from './v11-rig.mjs';

const today = '2026-10-20'; // a Tuesday, the evening Kim tried it

function wordsRig() {
  const script = `
    const FEEL = true, today = __today;
    ${app('  function whenWord(date, evening) {', '  /* (V11, the Planner walk, 11.2')}
      return 'on ' + (FEEL ? M.DAY_LONG[M.weekday(date)] + ', ' : '') + M.dateText(date);
    }
    ${app('  /* V11: "on Saturday", "yesterday", "today"', '  /* V11: what taking it back says')}
    ({ boardToWords, landsAsShown, toWords });`;
  return runInNewContext(script, { M, D, __today: today });
}

test('K19: a block dragged on the board lands where its preview said, or not at all', () => {
  const w = wordsRig();
  const preview = { date: '2026-10-19', start: 1155, at: { date: '2026-10-19', start: 1155 } };
  assert.equal(w.landsAsShown({ ok: true, date: '2026-10-19', start: 1155 }, preview), true);
  // the preview said 7:15 to 7:45 pm; landing at 9:15 pm is refused, so the drop changes nothing
  assert.equal(w.landsAsShown({ ok: true, date: '2026-10-19', start: 1275 }, preview), false);
  assert.equal(w.landsAsShown({ ok: true, date: '2026-10-20', start: 1155 }, preview), false);
  // the same moment said from the night lane (25:15 on Monday is 1:15 am Tuesday) is the same landing
  const night = { date: '2026-10-19', start: 1515, at: { date: '2026-10-20', start: 75 } };
  assert.equal(w.landsAsShown({ ok: true, date: '2026-10-19', start: 1515 }, night), true);
  assert.equal(w.landsAsShown({ ok: false }, preview), true, 'a refusal is said as itself');
});

test('K19: on the sample week, Wind down slid to the time its preview shows lands there', () => {
  const s = D.sampleState(today), date = '2026-10-19';
  const wd = M.calendarDay(s, date).blocks.find((b) => b.name === 'Wind down');
  for (let st = 1110; st <= 1290; st += 15) {
    // the preview runs on a copy of the dates, as tryOn does, and the drop on the board itself
    const look = JSON.parse(JSON.stringify(s)), r0 = M.moveTemplate(look, date, wd.tpl, st);
    if (!r0.ok) continue;
    const shownAt = M.dateTime(r0.date, r0.start), shown = M.windowTime(date, shownAt.date, shownAt.start);
    const real = JSON.parse(JSON.stringify(s)), r = M.moveTemplate(real, date, wd.tpl, shown);
    assert.ok(r.ok, M.clock(st));
    assert.deepEqual(M.dateTime(r.date, r.start), shownAt, 'asked ' + M.clock(st));
    assert.equal(M.calendarDay(real, date).blocks.find((b) => b.name === 'Wind down').start, shownAt.start);
  }
});

test('K19: the toast names a day on the board by its weekday, never yesterday or tomorrow', () => {
  const w = wordsRig();
  assert.equal(w.boardToWords('2026-10-19', '2026-10-19', 1275), '9:15 pm', 'within its own day, the time');
  assert.equal(w.boardToWords('2026-10-20', '2026-10-19', 1275), 'Monday at 9:15 pm');
  assert.equal(w.boardToWords('2026-10-20', '2026-10-21', 600), 'Wednesday at 10 am');
  assert.equal(w.boardToWords('2026-10-20', '2026-10-20', 600), '10 am');
  assert.doesNotMatch(w.boardToWords('2026-10-21', '2026-10-20', 600), /today|yesterday|tomorrow/);
  assert.match(w.boardToWords('2026-10-20', '2026-11-02', 600), /Monday, Nov 2/);
});

test('K17: a locked routine grabbed says so with Unlock this day; Mine to plan work is never locked', () => {
  const script = `
    const FEEL = true, benchable = () => true;
    ${app('  function lockedGrab(hit) {', '  /* K17: said where it was grabbed')}
    ({ lockedGrab });`;
  const { lockedGrab } = runInNewContext(script, {});
  const hit = (b) => ({ kind: 'block', block: Object.assign({ tpl: 'work', name: 'Work' }, b) });
  assert.equal(lockedGrab(hit({ fixed: true })), true);
  assert.equal(lockedGrab(hit({ soft: true })), false);
  assert.equal(lockedGrab(hit({ fixed: true, sleep: 'am' })), false, 'sleep moves by its edges');
  assert.equal(lockedGrab(hit({ fixed: true, handoff: true })), false);
  assert.equal(lockedGrab({ kind: 'block', block: { fixed: true, meeting: true } }), false);
  assert.match(app('  function sayLocked(b, date, e) {', '  /* V11: a finger finds'), /label: 'Unlock this day'/);
  // the setup: Mine to plan makes soft work, Set, like a shift makes it locked
  const base = { name: 'Kim', home: 'solo', wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 } };
  for (const fixed of [false, true]) {
    const st = D.buildState(Object.assign({}, base, { work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020, fixed } }), '2026-10-20');
    const w = M.calendarDay(st, '2026-10-21').blocks.find((b) => b.cat === 'work');
    assert.ok(w, 'work is on the board');
    assert.equal(!!w.fixed, fixed, fixed ? 'set work is locked' : 'Mine to plan is not locked');
    assert.equal(!!w.soft, !fixed);
  }
  // the panel leads with Unlock for a locked one
  const panel = app('  function tplPanel(p, date, b) {', '    field(p, \'Name on this day\'');
  assert.ok(panel.indexOf('if (FEEL && b.fixed) lockPart();') < panel.indexOf("field(row, 'Starts'"), 'Unlock comes before Starts and Length');
});

test('K18 and K20: a stretch says what it ends at now; picking a block up puts the picked one down', () => {
  const drop = app('  function finishBoardDrag(d) {', '  function tapped(hit, e) {');
  assert.match(drop, /' now ends at '/);
  assert.doesNotMatch(drop, /runs until/);
  // (from the routine's own start, so a stretch of the last piece of a split Work says its real end)
  assert.match(drop, /now ends at ' \+ M\.clock\(M\.dateTime\(d\.hit\.date, sourceSpan\(b, d\.hit\.date\)\.start \+ d\.preview\.dur\)/);
  const script = `
    const FEEL = true, view = { pick: { date: 'd', key: 'k' } }, picks = [];
    const document = { body: { classList: { toggle() {} } } };
    const selectBlock = (d) => { picks.push(d); view.pick = d ? { date: d } : null; };
    ${app('  /* (K20, Kim, Oct 20', '  const carryingNow = ')}
    carrying(true);
    ({ view, picks });`;
  const r = runInNewContext(script, {});
  assert.equal(r.view.pick, null, 'its bar goes away with it');
});

test('K21: the sample week tip takes room beside the board on a wide window, under it on a narrower one', () => {
  const script = `
    ${app('  const COACH_W = 340', '  function coachRoom(left, right, bottom) {')}
    ({ coachSide });`;
  const { coachSide } = runInNewContext(script, {});
  assert.equal(coachSide(1440), 'left');
  assert.equal(coachSide(1280), 'left');
  assert.equal(coachSide(1024), 'bottom');
});

test('K17: a flexible routine (Work yours to plan) moves and stretches for its day with the panel\'s edit', () => {
  const s = D.sampleState(today), date = '2026-10-21', other = '2026-10-22';
  const work = (st, d) => M.calendarDay(st, d).blocks.filter((b) => b.tpl === 'work');
  const before = JSON.stringify(M.calendarDay(s, other).blocks);
  const r = M.slideSoft(s, date, 'work', 600);
  assert.ok(r.ok);
  assert.equal(r.start, 600);
  assert.deepEqual(s.dates[date].edits.work, { start: 600, dur: 480 }, 'the per-day edit the panel makes');
  const ws = work(s, date);
  assert.equal(Math.min(...ws.map((b) => b.start)) >= 600, true);
  assert.equal(ws[0].sourceStart, 600);
  // what's locked inside it stays where it was: the stand-up and the pick up
  const day = M.calendarDay(s, date).blocks;
  assert.equal(day.find((b) => b.name === 'Standup').start, 570);
  assert.equal(day.find((b) => b.name.startsWith('Pick up')).start, 1005);
  assert.equal(JSON.stringify(M.calendarDay(s, other).blocks), before, 'other days keep their usual');
  // a stretch from its start
  const r2 = M.slideSoft(s, date, 'work', 600, 360);
  assert.equal(r2.dur, 360);
  assert.deepEqual(s.dates[date].edits.work, { start: 600, dur: 360 });
  // the preview and the drop make the same change, so the drop lands where it showed
  const look = JSON.parse(JSON.stringify(D.sampleState(today))), real = JSON.parse(JSON.stringify(D.sampleState(today)));
  const a = M.slideSoft(look, date, 'work', 615), b = M.slideSoft(real, date, 'work', a.start);
  assert.deepEqual([b.date, b.start], [a.date, a.start]);
  // it stays inside the day, and a locked or hard routine isn't moved this way
  assert.equal(M.slideSoft(D.sampleState(today), date, 'work', 1300).start, M.RAIL1 - 480);
  assert.equal(M.slideSoft(D.sampleState(today), date, 'pickup', 600).ok, false);
  assert.equal(M.slideSoft(D.sampleState(today), date, 'winddown', 600).ok, false);
  // the board: soft routines drag (slide) and stretch; locked ones don't, free time doesn't
  const script = `
    const FEEL = true;
    ${app('  const softDrags = (b) =>')}
    ({ softDrags });`;
  const { softDrags } = runInNewContext(script, {});
  assert.equal(softDrags({ soft: true, tpl: 'work' }), true);
  assert.equal(softDrags({ soft: true, tpl: 'free', free: true }), false);
  assert.equal(softDrags({ soft: true, tpl: 'work', fixed: true }), false);
  assert.equal(softDrags({ tpl: 'pickup', fixed: true }), false);
  const mode = app('  function boardMode(d, hit) {', '  /* V11: a finger finds');
  assert.match(mode, /\(!b\.soft \|\| softDrags\(b\)\)[^\n]*'resize'/);
  assert.match(mode, /\(!b\.soft \|\| softDrags\(b\)\)[^\n]*'slide'/);
});
