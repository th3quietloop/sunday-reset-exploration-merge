// V11: the screens for big things, small blocks (board/src/app.js, "V11: big things, small blocks"). The rules
// they share are cut out of app.js and run here on the sample family's week: how a step's time and a day's cap
// step, where a spread starts, the choices when the steps don't fit, the one line after finding new times, the
// next quiet time, and which steps Spread it out places. Then the moves themselves, with the app's commit, toast,
// and Undo stood in: finding new times when the board opens, and Didn't get to it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { M, D, app, plain } from './v11-rig.mjs';

const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14', THU = '2026-10-15', SAT = '2026-10-17';
const copy = (v) => JSON.parse(JSON.stringify(v));

/* the rules, as the app has them */
const RULES = app('  /* V11 todos: the rules the screens share', '  /* V11 todos: the screens */');
const rules = runInNewContext(RULES + '\n({ bdLen, capStep, spreadDefaults, spreadOptsOf, spreadChoices, joinNames, reflowWords, nextQuiet, spreadable, BD_LENS, SPREAD_CAPS });', { M, D });

/* the sample family's week with Clean my room due Saturday, broken down by the library */
function board(steps, due) {
  const st = D.sampleState(MON);
  const list = steps || M.breakdown('Clean my room', {}, D).steps;
  st.tasks.push({ id: 'room', name: 'Clean my room', group: 'home', icon: 'broom', cat: 'home', due: due || SAT, dur: null, done: false, repeat: null, steps: list.map((s, i) => ({ id: 'room-s' + (i + 1), name: s.name, dur: s.dur, done: false })) });
  return st;
}
const task = (st) => st.tasks.find((t) => t.id === 'room');
const mine = (st, d) => ((st.dates[d] && st.dates[d].adds) || []).filter((a) => a.src && a.src.task === 'room');

test('a step’s time steps through 5, 10, 15, 20, 30, 45, 60, and a time between two steps to the next one', () => {
  assert.equal(rules.bdLen(10, 1), 15);
  assert.equal(rules.bdLen(10, -1), 5);
  assert.equal(rules.bdLen(5, -1), 5, 'nothing under 5');
  assert.equal(rules.bdLen(60, 1), 60, 'nothing over an hour, a tap at a time');
  assert.equal(rules.bdLen(25, 1), 30);
  assert.equal(rules.bdLen(25, -1), 20);
  assert.equal(rules.bdLen(90, -1), 60, 'a long one the library gave comes down into the steps');
});

test('a day’s cap steps 15, 30, 45, 60, 90, 120, 180', () => {
  assert.equal(rules.capStep(15, 1), 30);
  assert.equal(rules.capStep(15, -1), 15);
  assert.equal(rules.capStep(20, -1), 15);
  assert.equal(rules.capStep(180, 1), 180);
});

test('a spread starts as the to-do was spread, or a little each day, 15 minutes of housework, done by its day', () => {
  const st = board();
  assert.deepEqual(plain(rules.spreadDefaults(task(st), MON)), { days: 'daily', pick: [1, 3, 5], cap: 15, when: 'any', by: SAT });
  const t = Object.assign({}, task(st), { name: 'Send the report', spread: { days: [2, 4], cap: 45, when: 'evening' } });
  assert.deepEqual(plain(rules.spreadDefaults(t, MON)), { days: 'pick', pick: [2, 4], cap: 45, when: 'evening', by: SAT });
  // a due date that went by isn't a day to be done by: the engine asks for one
  assert.equal(rules.spreadDefaults(task(board(null, MON)), WED).by, null);
  // what the engine is asked: days you pick go as weekday numbers, and no by when none is picked
  assert.deepEqual(plain(rules.spreadOptsOf({ days: 'pick', pick: [5, 1, 3], cap: 30, when: 'any', by: null })), { days: [1, 3, 5], cap: 30, when: 'any' });
  assert.deepEqual(plain(rules.spreadOptsOf({ days: 'weekdays', pick: [1], cap: 15, when: 'morning', by: SAT })), { days: 'weekdays', cap: 15, when: 'morning', by: SAT });
});

test('steps that don’t fit before the day get real choices: more a day, a later day, or a step off', () => {
  // smaller steps due Tuesday, from Monday morning: two days of 15 minutes can't hold them
  const st = board(M.breakdown('Clean my room', { size: 'small' }, D).steps, TUE);
  const before = JSON.stringify(st);
  const opts = { days: 'daily', cap: 15, when: 'any' };
  const plan = M.spreadPlan(st, 'room', opts, MON, 7 * 60);
  assert.equal(plan.ok, false);
  const ch = plain(rules.spreadChoices(st, task(st), opts, MON, 7 * 60));
  assert.equal(JSON.stringify(st), before, 'working out the choices changes nothing');
  assert.deepEqual(ch.map((c) => c.kind), ['cap', 'by', 'drop']);
  const cap = ch.find((c) => c.kind === 'cap'), by = ch.find((c) => c.kind === 'by'), drop = ch.find((c) => c.kind === 'drop');
  assert.ok(M.spreadPlan(st, 'room', Object.assign({}, opts, { cap: cap.cap }), MON, 7 * 60).ok, 'the cap it offers holds every step');
  assert.ok(!M.spreadPlan(st, 'room', Object.assign({}, opts, { cap: rules.capStep(cap.cap, -1) }), MON, 7 * 60).ok, 'and it is the least that does');
  assert.ok(M.spreadPlan(st, 'room', Object.assign({}, opts, { by: by.by }), MON, 7 * 60).ok, 'the day it offers holds every step');
  assert.ok(!M.spreadPlan(st, 'room', Object.assign({}, opts, { by: M.addDays(by.by, -1) }), MON, 7 * 60).ok, 'and it is the first that does');
  assert.equal(drop.step, plan.unplaced[plan.unplaced.length - 1], 'the step it offers to take off is the last that doesn’t fit');
  // everything fits: nothing to choose
  const fits = board();
  assert.deepEqual(plain(rules.spreadChoices(fits, task(fits), { days: 'daily', cap: 15, when: 'any' }, MON, 7 * 60)), []);
});

test('one line after finding new times: the engine’s words for one to-do, which ones for several', () => {
  const moved = { moved: [{ step: 'a', name: 'Vacuum', missed: true }], unplaced: [], message: 'Vacuum moved to Wednesday. Still done by Saturday.' };
  assert.equal(rules.reflowWords([{ name: 'Clean my room', res: moved }]), 'Vacuum moved to Wednesday. Still done by Saturday.');
  const two = { moved: [{ step: 'a', name: 'Wash', missed: true }, { step: 'b', name: 'Dry', missed: true }], unplaced: [], message: '2 steps moved to tomorrow and Friday. Still done by Saturday.' };
  assert.equal(rules.reflowWords([{ name: 'Laundry', res: two }]), 'Laundry: 2 steps moved to tomorrow and Friday. Still done by Saturday.', 'a count says whose steps they are');
  const short = { moved: [], unplaced: ['b'], message: 'This needs one more day than is left before Saturday.' };
  assert.equal(rules.reflowWords([{ name: 'Clean my room', res: short }]), 'Clean my room: this needs one more day than is left before Saturday.');
  assert.equal(rules.reflowWords([{ name: 'Clean my room', res: moved }, { name: 'Send the report', res: moved }]), 'Missed steps in Clean my room and Send the report have new times.');
  assert.equal(rules.reflowWords([{ name: 'Clean my room', res: moved }, { name: 'Send the report', res: short }]), 'Missed steps in Clean my room have new times. Send the report has steps that didn’t fit before it’s due. Open it to choose.');
  assert.equal(rules.joinNames(['A', 'B', 'C']), 'A, B, and C');
  for (const s of [rules.reflowWords([{ name: 'X', res: short }, { name: 'Y', res: short }])]) assert.doesNotMatch(s, /[—–]|--|\bjust\b/);
});

test('the next quiet time: open time where nothing moves, after now today, from the day asked', () => {
  const st = board();
  const before = JSON.stringify(st);
  const q = plain(rules.nextQuiet(st, WED, 15, MON, 7 * 60));
  assert.equal(JSON.stringify(st), before);
  assert.equal(q.date, WED, 'from the day asked, never before it');
  const c = M.canPlace(st, q.date, 15, q.start);
  assert.ok(c.ok && !(c.pushes || []).some((p) => p.delta), 'nothing moves there');
  const now = plain(rules.nextQuiet(st, MON, 15, MON, 12 * 60));
  assert.ok(now.date > MON || now.start >= 12 * 60, 'today only after now');
});

test('Spread it out places the open steps still without a time ahead', () => {
  const st = board();
  const t = task(st);
  assert.deepEqual(rules.spreadable(t, [], MON, 600).map((s) => s.id), t.steps.map((s) => s.id));
  t.steps[0].done = true;
  const at = (date, start, step) => ({ date, step, add: { start, dur: 15 } });
  const where = [at(TUE, 600, 'room-s2'), at(MON, 420, 'room-s3')];
  // s2 has a time ahead; s3's time went by, so it needs one again
  assert.deepEqual(rules.spreadable(t, where, MON, 600).map((s) => s.id), ['room-s3', 'room-s4', 'room-s5', 'room-s6']);
  // the whole thing has a time ahead: nothing to spread
  assert.deepEqual(plain(rules.spreadable(t, [{ date: TUE, step: null, add: { start: 600, dur: 90 } }], MON, 600)), []);
  assert.deepEqual(plain(rules.spreadable(Object.assign({}, t, { done: true }), [], MON, 600)), []);
  assert.deepEqual(plain(rules.spreadable(Object.assign({}, t, { steps: [] }), [], MON, 600)), []);
});

/* the moves, with the app's commit, toast, and Undo stood in */
const MOVES = app('  /* When the board opens or the day turns over, each spread to-do', '  /* V11: a to-do in the reset\'s To-dos step');
function movesRig(st, today, nowMin, opt) {
  const o = opt || {};
  const script = `
    const FEEL = true, readOnly = false, ready = true, tdrag = null, bdrag = null;
    let state = __board, today = __today, nowMin = __now;
    const view = { preview: __preview }, toasts = [], undoStack = [], landed = [], opened = [], store = {};
    const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    function commit(fn) { const snap = JSON.stringify(state); const r = fn(); if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; } undoStack.push(snap); return r; }
    function undo() { const s = undoStack.pop(); if (s) state = JSON.parse(s); }
    function toast(text, kind, act) { toasts.push({ text, kind: kind || '', act: act || null }); }
    const undoSay = (what) => ({ label: 'Undo', what });
    const landAdds = (list) => list.forEach((x) => landed.push(x));
    const toWords = (date, start) => date + ' at ' + M.clock(start);
    const blockedText = () => 'No room there.';
    const Snd = { bad() {}, slide() {}, clack() {}, good() {} };
    const inToday = () => true;
    const spreadOut = (id) => opened.push(id);
    ${RULES}
    ${MOVES}
    ({ get state() { return state; }, toasts, landed, opened, store, undo, autoReflow, didntGetTo, didntOk, set nowMin(v) { nowMin = v; } });`;
  return runInNewContext(script, { M, D, __board: st, __today: today, __now: nowMin, __preview: !!o.preview });
}

test('when the board opens, a spread to-do’s step missed on an earlier day finds a new time, once a day, with one toast and Undo', () => {
  const st = board();
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', {}, MON, 7 * 60));
  task(st).steps[0].done = true;
  const was = copy(st);
  const r = movesRig(st, WED, 7 * 60);
  r.autoReflow();
  assert.equal(r.toasts.length, 1, 'one toast');
  assert.match(r.toasts[0].text, /^Put away laundry moved to today\./);
  assert.equal(r.toasts[0].act.label, 'Undo');
  assert.deepEqual(M.missedSteps(r.state, WED, 7 * 60), [], 'nothing is missed after');
  assert.ok(r.landed.length > 0, 'what moved lands on the board');
  // again the same day: nothing, even with a step missed again (an Undo stays undone)
  r.undo();
  assert.deepEqual(plain(r.state), was);
  r.autoReflow();
  assert.equal(r.toasts.length, 1, 'once a day on this device');
  // a to-do that wasn't spread is left for its own Find new times
  const plainBoard = board();
  plainBoard.dates[TUE] = { adds: [{ id: 'a1', name: 'Pick up the floor', cat: 'home', icon: 'broom', start: 18 * 60, dur: 15, src: { type: 'step', task: 'room', id: 'room-s1' } }] };
  const q = movesRig(plainBoard, WED, 7 * 60);
  q.autoReflow();
  assert.equal(q.toasts.length, 0);
  // a step missed earlier today waits: Didn't get to it, or tomorrow
  const today = board();
  M.applySpread(today, 'room', M.spreadPlan(today, 'room', {}, MON, 7 * 60));
  const z = movesRig(today, MON, 22 * 60);
  z.autoReflow();
  assert.equal(z.toasts.length, 0);
  // a made up board isn't changed when it opens
  const pv = board();
  M.applySpread(pv, 'room', M.spreadPlan(pv, 'room', {}, MON, 7 * 60));
  const p = movesRig(pv, WED, 7 * 60, { preview: true });
  p.autoReflow();
  assert.equal(p.toasts.length, 0);
  p.autoReflow(true);
  assert.equal(p.toasts.length, 1, 'unless asked (SR.findNewTimes)');
});

test('Didn’t get to it: a spread step under way goes ahead to another day, as if its time were over', () => {
  const st = board();
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', {}, MON, 7 * 60));
  const tue = mine(st, TUE)[0];
  const b = { add: tue.id, src: tue.src, done: false };
  // a few minutes into Tuesday's step
  const r = movesRig(st, TUE, tue.start + 5);
  assert.equal(r.didntOk(b, TUE), true, 'its time has come, and it isn’t checked off');
  const hint = r.didntGetTo(b, true);
  assert.match(hint, /^Tap to move it to /);
  assert.equal(r.toasts.length, 0, 'the hint changes nothing');
  const said = r.didntGetTo(b);
  assert.ok(said && /moved to/.test(said), said);
  assert.equal(r.toasts.length, 1);
  assert.equal(r.toasts[0].act.label, 'Undo');
  assert.doesNotMatch(r.toasts[0].text, /missed|late|behind|fail/i, 'no blame');
  const now = M.findAdd(r.state, tue.id);
  assert.ok(now.date > TUE, 'never later the same day');
  for (const d of [TUE, WED, THU, '2026-10-16', SAT]) assert.ok(mine(r.state, d).reduce((a, x) => a + x.dur, 0) <= 15, d + ' stays under its cap');
  // a step whose time hasn't come yet has nothing to say
  const fri = mine(st, '2026-10-16')[0];
  assert.equal(r.didntOk({ add: fri.id, src: fri.src, done: false }, '2026-10-16'), false);
});

test('Didn’t get to it, on a to-do that wasn’t spread: the next quiet time from the day after, not pinned', () => {
  const st = board();
  st.dates[TUE] = { adds: [{ id: 'a1', name: 'Pick up the floor', cat: 'home', icon: 'broom', start: 18 * 60, dur: 15, pinned: true, src: { type: 'step', task: 'room', id: 'room-s1' } }] };
  const r = movesRig(st, TUE, 18 * 60 + 5);
  const b = { add: 'a1', src: { type: 'step', task: 'room', id: 'room-s1' }, done: false };
  assert.match(r.didntGetTo(b, true), /^Tap to move it to 2026-10-14 at .+, the next quiet time\.$/);
  const said = r.didntGetTo(b);
  assert.match(said, /^Pick up the floor moved to 2026-10-14 at /);
  const f = M.findAdd(r.state, 'a1');
  assert.equal(f.date, WED, 'the same block, the next day');
  assert.equal(f.add.pinned, undefined, 'the app moved it, so a plan may move it again');
  const c = M.canPlace(st, f.date, 15, f.add.start);
  assert.ok(c.ok, 'where nothing moves');
  r.undo();
  assert.equal(M.findAdd(r.state, 'a1').date, TUE, 'Undo puts it back');
});
