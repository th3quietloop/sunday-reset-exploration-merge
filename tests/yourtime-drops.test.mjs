// V11: a block of yours placed on time that's over went in as done, the same whichever way it got there:
// dropped on a day's row (dropTile, rail), dropped on a whole day (dropTile, day), or placed from the place
// panel (placeIt). A to-do keeps its own status, and nothing that already happened moves. The two
// functions are cut out of board/src/app.js whole and run with the desk and the sounds as no-ops.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const yesterday = '2026-10-13', monday = '2026-10-12';

function rig(board, nowMin) {
  const parts = [
    app('  const cap = (s) =>', '  /* V11: the part of the board for time with people is People'),
    app('  const plural = (n, one, many) =>'),
    app('  /* a date said the way a person would', '  /* V11: anyone grown up at home can cook'),
    app('  /* full (V11): the toast after a drop that didn', '  /* what letting go on a whole day will do'),
    app('  function specAdd(spec) {', '  /* Which board is under the pointer'),
    app('  function dropTile(e) {', '  /* V11: someone who lives with you (\'p:\' and their id) is cooking too'),
    app('  /* Place it, and send the block from the panel to its spot on the desk. */', '  const reducedMotion = () =>')
  ];
  const script = `
    const FEEL = true;
    let state = __board, today = __today, nowMin = __now;
    let tdrag = null, dayChipMemo = null;
    const view = { got: {}, zoom: 'month', calm: true }, undoStack = [], toasts = [], landings = [];
    const day = (d) => M.calendarDay(state, d);
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    /* the desk, the sounds, and the page: anything asked of them does nothing */
    const quiet = new Proxy(function () {}, { get: (t, k) => (k === 'layout' ? 'week' : quiet), apply: () => undefined });
    const W = quiet, Snd = quiet;
    const $ = () => ({ hidden: true, style: {} });
    const document = { querySelectorAll: () => [], elementFromPoint: () => null };
    const carry = { x: 0, y: 0, raf: 0, g: null };
    const cancelAnimationFrame = () => {}, settleHand = () => {}, hideChip = () => {}, unaim = () => {}, carryHome = () => {}, closeSel = () => {};
    const reducedMotion = () => true, weekOf = () => [];
    const landed = (date, key) => landings.push(key);
    const setDinnerFrom = () => { throw new Error('not food'); };
    const ideaById = () => null, ideaGroup = () => 'partner', ideaCat = () => 'us', ideaWho = () => '';
    function toast(text, kind, act) { toasts.push({ text, kind: kind || '', act: act || null }); }
    function undoAct(what) { return { label: 'Undo', what }; }
    function commit(fn) {
      const snap = JSON.stringify(state);
      const r = fn();
      if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; }
      undoStack.push(snap);
      return r;
    }
    function undo() { const s = undoStack.pop(); if (s) state = JSON.parse(s); }
    ${parts.join('\n')}
    ({
      get state() { return state; }, toasts, landings, undo, specAdd, dayFit,
      /* a drag let go on a target, the way the desk hands it over */
      drop(spec, target) { tdrag = { started: true, spec, target }; dropTile(null); },
      place(spec, date, start) { placeIt({ getBoundingClientRect: () => ({}) }, specAdd(spec), date, start); }
    });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin, console });
}
const addAt = (st, date, start) => (st.dates[date] && st.dates[date].adds || []).find((a) => a.start === start) || null;
const last = (r) => r.toasts[r.toasts.length - 1];
// (what the toast says before the time it takes or took from Work or a routine, which
// tests/consistency.test.mjs holds)
const said = (r) => last(r).text.replace(/\. T(?:akes|ook) .+$/, '');

test('placed from the panel on time that’s over: it goes in as done, and the toast says so with Undo', () => {
  const r = rig(D.sampleState(today), 14 * 60);
  const spec = { kind: 'block', id: 'stretch' }, at = r.dayFit(yesterday, spec);
  assert.ok(at != null);
  r.place(spec, yesterday, at);
  const a = addAt(r.state, yesterday, at);
  assert.ok(a, 'it landed');
  assert.equal(a.done, true);
  assert.equal(said(r), 'Stretch yesterday at ' + M.clock(at) + ', marked done');
  assert.equal(last(r).act.label, 'Undo');
  r.undo();
  assert.equal(addAt(r.state, yesterday, at), null, 'one Undo takes it off');
});

test('placed from the panel later today: not done', () => {
  const r = rig(D.sampleState(today), 14 * 60);
  const spec = { kind: 'block', id: 'stretch' }, at = r.dayFit(today, spec);
  r.place(spec, today, at);
  assert.equal(addAt(r.state, today, at).done, undefined);
  assert.doesNotMatch(last(r).text, /marked done/);
});

test('a to-do on time that’s over keeps its own status, and says the time is over', () => {
  const r = rig(D.sampleState(today), 14 * 60);
  const spec = { kind: 'task', id: 'garage' }, at = r.dayFit(yesterday, spec);
  assert.ok(at != null);
  r.place(spec, yesterday, at);
  assert.equal(addAt(r.state, yesterday, at).done, undefined);
  assert.match(said(r), /, a time that’s over$/);
});

test('dropped on a day’s row that’s over: done; and never by moving what already happened', () => {
  const st = D.sampleState(today);
  const r = rig(st, 14 * 60);
  const spec = { kind: 'block', id: 'run' }, add = r.specAdd(spec), at = r.dayFit(monday, spec);
  r.drop(spec, { type: 'rail', ok: true, date: monday, start: at, add });
  assert.equal(addAt(r.state, monday, at).done, true);
  assert.equal(said(r), 'Run on Monday at ' + M.clock(at) + ', marked done');
  assert.deepEqual(r.landings.length, 1);
  // a time yesterday that would slide something that happened says no, and changes nothing
  const dur = M.gridDur(add.dur);
  let push = null;
  for (let s = 9 * 60; s + dur <= 21 * 60 && push == null; s += 15) { const c = M.canPlace(r.state, yesterday, dur, s); if (c.ok && (c.pushes || []).some((p) => p.delta)) push = s; }
  assert.ok(push != null, 'a time yesterday that moves something');
  const before = JSON.stringify(r.state);
  r.drop(spec, { type: 'rail', ok: true, date: yesterday, start: push, add });
  assert.equal(JSON.stringify(r.state), before);
  assert.equal(last(r).kind, 'bad');
  assert.equal(last(r).text, 'That time is over and already has something in it. Drop it on open time.');
});

test('dropped on a whole day that’s over: its first open time, as done', () => {
  const r = rig(D.sampleState(today), 14 * 60);
  const spec = { kind: 'block', id: 'workout' }, at = r.dayFit(yesterday, spec);
  r.drop(spec, { type: 'day', date: yesterday });
  const a = addAt(r.state, yesterday, at);
  assert.ok(a && a.done === true);
  assert.equal(said(r), 'Workout yesterday at ' + M.clock(at) + ', marked done');
  // and on a day to come, not done
  const later = r.dayFit('2026-10-16', spec);
  r.drop(spec, { type: 'day', date: '2026-10-16' });
  assert.equal(addAt(r.state, '2026-10-16', later).done, undefined);
  assert.doesNotMatch(last(r).text, /marked done/);
});

test('a to-do dropped on a row that’s over keeps its status', () => {
  const r = rig(D.sampleState(today), 14 * 60);
  const spec = { kind: 'task', id: 'garage' }, add = r.specAdd(spec), at = r.dayFit(yesterday, spec);
  r.drop(spec, { type: 'rail', ok: true, date: yesterday, start: at, add });
  assert.equal(addAt(r.state, yesterday, at).done, undefined);
  assert.match(said(r), /, a time that’s over$/);
});
