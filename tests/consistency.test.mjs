// V11, round three (consistency): a block that lands inside a soft block (Work, a routine) says what it
// took, in the place panel's words ("Takes 30 min from Work"), whichever way it got there: dropped on a
// day's row (dropTile, rail), dropped on a whole day (dropTile, day), or placed from the place panel
// (placeIt). When the placement moves something, that is what it says instead, as the panel does. And
// "to-do" is spelled one way in what a screen reader hears too. The functions are cut out of
// board/src/app.js whole and run with the desk and the sounds as no-ops.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const thursday = '2026-10-15', friday = '2026-10-16';

function rig(board, nowMin) {
  const parts = [
    app('  const cap = (s) =>', '  /* V11: the part of the board for time with people is People'),
    app('  const plural = (n, one, many) =>'),
    app('  /* a date said the way a person would', '  /* V11: anyone grown up at home can cook'),
    app('  /* full (V11): the toast after a drop that didn', '  /* what letting go on a whole day will do'),
    app('  function specAdd(spec) {', '  /* Which board is under the pointer'),
    app('  function dropTile(e) {', '  /* V11: someone who lives with you (\'p:\' and their id) is cooking too'),
    app('  /* Place it, and send the block from the panel to its spot on the desk. */', '  const reducedMotion = () =>'),
    app('  function monthList(ms) {', '  function yearMonths(focus) {'),
    app('  const srWords = '),
    app('  function dayChip(date, spec) {', '  function dropTile(e) {')
  ];
  const script = `
    const FEEL = true;
    let state = __board, today = __today, nowMin = __now;
    let tdrag = null, dayChipMemo = null;
    const view = { got: {}, zoom: 'month', calm: true }, undoStack = [], toasts = [], landings = [];
    const day = (d) => M.calendarDay(state, d);
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
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
    ${parts.join('\n')}
    ({
      get state() { return state; }, toasts, specAdd, dayFit, cutWords, monthList, srWords,
      blockedText, movesWords, afterDue, landWords, dayChip, undoStack,
      drop(spec, target) { tdrag = { started: true, spec, target }; dropTile(null); },
      place(spec, date, start) { placeIt({ getBoundingClientRect: () => ({}) }, specAdd(spec), date, start); }
    });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin, console });
}
const last = (r) => r.toasts[r.toasts.length - 1];
/* the soft Work block on a day that holds a time, and a start inside it where a block of dur fits
   without moving anything */
function insideWork(st, date, dur) {
  const w = M.calendarDay(st, date).blocks.filter((b) => b.soft && b.cat === 'work').sort((a, b) => b.dur - a.dur)[0];
  assert.ok(w, 'a day with Work on it');
  for (let s = w.start + 60; s + dur <= w.start + w.dur; s += 15) {
    const c = M.canPlace(st, date, dur, s);
    if (c.ok && !(c.pushes || []).some((p) => p.delta)) return { work: w, start: s };
  }
  assert.fail('no quiet start inside Work');
}

test('dropped on a row inside Work: the toast says the time it takes from Work', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const spec = { kind: 'block', id: 'run' }, add = r.specAdd(spec), dur = M.gridDur(add.dur);
  const { work, start } = insideWork(st, thursday, dur);
  r.drop(spec, { type: 'rail', ok: true, date: thursday, start, add });
  assert.equal(last(r).text, 'Run tomorrow at ' + M.clock(start) + '. Takes ' + M.dur(dur) + ' from ' + (work.label || work.name));
  assert.equal(last(r).act.what, 'Run is off tomorrow', 'Undo says what it takes back, and nothing moved');
});

test('placed from the panel inside Work: the same words', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const spec = { kind: 'block', id: 'run' }, dur = M.gridDur(r.specAdd(spec).dur);
  const { work, start } = insideWork(st, friday, dur);
  r.place(spec, friday, start);
  assert.match(last(r).text, new RegExp('^Run .*at ' + M.clock(start).replace(/ /g, ' ') + '\\. Takes ' + M.dur(dur) + ' from ' + (work.label || work.name) + '$'));
});

test('a placement that moves something says what moves, not what it takes', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const spec = { kind: 'block', id: 'run' }, add = r.specAdd(spec), dur = M.gridDur(add.dur);
  let push = null;
  for (let s = 12 * 60; s + dur <= 22 * 60 && push == null; s += 15) { const c = M.canPlace(st, friday, dur, s); if (c.ok && (c.pushes || []).some((p) => p.delta)) push = s; }
  assert.ok(push != null, 'a time on Friday that slides a block');
  r.drop(spec, { type: 'rail', ok: true, date: friday, start: push, add });
  assert.match(last(r).text, /\. (.+ moves to .+|\d+ blocks move to make room)$/);
  assert.doesNotMatch(last(r).text, /Takes/);
  assert.match(last(r).act.what, /What it moved is back$/);
});

test('into open time: where it landed and nothing more', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const spec = { kind: 'block', id: 'run' }, add = r.specAdd(spec), dur = M.gridDur(add.dur);
  const sunday = '2026-10-18', d = M.calendarDay(st, sunday);
  const gap = M.gaps(d).find((g) => g[1] - g[0] >= dur + 30);
  assert.ok(gap, 'open time on Sunday');
  const s = Math.ceil(gap[0] / 15) * 15;
  r.drop(spec, { type: 'rail', ok: true, date: sunday, start: s, add });
  assert.match(last(r).text, new RegExp('^Run .*at ' + M.clock(s) + '$'));
});

test('dropped on a whole day: its first open time, and what that takes from Work', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const spec = { kind: 'block', id: 'workout' }, at = r.dayFit(friday, spec);
  const dur = M.gridDur(r.specAdd(spec).dur);
  const w = M.calendarDay(st, friday).blocks.find((b) => b.soft && b.start < at + dur && b.start + b.dur > at);
  r.drop(spec, { type: 'day', date: friday });
  if (w) assert.match(last(r).text, new RegExp('\\. Takes .+ from ' + (w.label || w.name) + '$'));
  else assert.doesNotMatch(last(r).text, /Takes/);
});

test('cutWords: pieces of one block are one, and a second block is named', () => {
  const r = rig(D.sampleState(today), 10 * 60);
  const d = { blocks: [{ soft: true, name: 'Work', start: 540, dur: 60 }, { soft: true, name: 'Work', start: 630, dur: 60 }, { soft: true, name: 'Wind down', start: 700, dur: 60 }, { name: 'Lunch', start: 600, dur: 30 }] };
  assert.equal(r.cutWords(d, 560, 160), 'Takes 1 h 40 min from Work and 20 min from Wind down');
  assert.equal(r.cutWords(d, 600, 30), '', 'a hard block is never "taken from"');
  assert.equal(r.cutWords(null, 600, 30), '');
});

test('to-do is one word in what a screen reader hears: the month summary and what is said', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const due = r.monthList(M.monthStart(today)).find((x) => x.kind === 'due');
  assert.ok(due, 'the sample has to-dos due this month');
  assert.match(due.name, /^\d+ to-dos?$/);
  assert.equal(r.srWords('Due: 7 to dos.'), 'Due: 7 to-dos.');
  assert.equal(r.srWords('Find a to do by name'), 'Find a to-do by name');
  assert.equal(r.srWords('To dos, Block library'), 'To-dos, Block library');
  assert.equal(r.srWords('Pick one thing to do with Sam this week.'), 'Pick one thing to do with Sam this week.', 'the verb stays');
});

// Round three fixes: a time picked by a tap, a key, or typed words (the slot panel, quick add, the place
// panel) says what to do instead in words for that, never "Drop it"; quick add offers the closest time
// where nothing moves when the time asked for is over and something already happened in it; the slot
// panel says where a block landed, what it took or moved, with Undo; two blocks that move are named in the
// toast as the place panel names them; a to-do given a time after it's due says so; and time that's over
// "took" its time from Work. slotPanel and quick add are cut out whole, with the page's parts as stubs.
function rig2(board, nowMin) {
  const parts = [
    app('  const cap = (s) =>', '  /* V11: the part of the board for time with people is People'),
    app('  const plural = (n, one, many) =>'),
    app('  /* a date said the way a person would', '  /* V11: anyone grown up at home can cook'),
    app('  function boardTime(date, min) {', '  function timeSpan(date, start, end) {'),
    app('  /* Try a change on a scratch copy of the dates', '  /* == what the board shows =='),
    app('  /* full (V11): the toast after a drop that didn', '  /* what letting go on a whole day will do'),
    app('  function specAdd(spec) {', '  /* Which board is under the pointer'),
    app('  /* tapping an empty spot on the board */', '  /* one date: wake, bed, and the week\'s shape */'),
    app('  /* == quick add in plain words ==', '  /* A list pasted from Notes')
  ];
  const script = `
    const FEEL = true, QUICK_OPTS = undefined;
    let state = __board, today = __today, nowMin = __now;
    const view = { got: {} }, undoStack = [], toasts = [], lines = [];
    let picks = {}, buttons = {}, nameBox = null;
    const day = (d) => M.calendarDay(state, d), boardDay = (d) => M.resolveWindow(state, d);
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    const quiet = new Proxy(function () {}, { get: (t, k) => (k === 'layout' ? 'week' : quiet), apply: () => undefined });
    const W = quiet, Snd = quiet;
    const node = () => ({ value: '', hidden: true, style: {}, dataset: {}, appendChild(c) { return c; }, append() {}, setAttribute() {}, addEventListener() {}, focus() {}, classList: { add() {}, toggle() {} } });
    const $ = () => node(), el = () => node();
    const closeSel = () => {}, kicker = () => {}, title = () => {}, field = () => {}, actions = () => {}, noteMove = () => {};
    /* (the Planner walk's slot panel: a rule, the setup's lean, the week's days, and the phone's day) */
    const divider = () => {}, kitLead = () => [], weekOf = () => [], phoneDay = () => false;
    function line(p, text) { lines.push(text); }
    function chips(list, cur, fn) { list.forEach((x) => { picks[x.name] = () => fn(x.id); }); return node(); }
    const libGroups = (list) => [{ name: 'Blocks', list }], library = () => state.palette.filter((x) => !x.hidden);
    const cat = () => ({ base: '#000' }), liveStepper = () => node(), catChips = () => node(), toggle = () => node();
    const textInput = (v) => (nameBox = Object.assign(node(), { value: v }));
    const button = (text, cls, fn) => { buttons[text] = fn; return node(); };
    const ideaById = () => null, ideaGroup = () => 'partner', ideaCat = () => 'us', ideaWho = () => '';
    function toast(text, kind, act) { toasts.push({ text, kind: kind || '', act: act || null }); }
    function undoAct(what) { return { label: 'Undo', what }; }
    const undoSay = (what) => undoAct(what);
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
      get state() { return state; }, toasts, lines, undo, blockedText, quickPlan,
      parse(text) { return M.parseQuick(text, today, state.palette, nowMin); },
      add(text) { quick.p = M.parseQuick(text, today, state.palette, nowMin); quick.plan = quickPlan(quick.p); return quickCommit(false); },
      slot(date, start) { picks = {}; buttons = {}; lines.length = 0; slotPanel(node(), date, start); },
      tap(name) { assert(picks[name], 'no chip ' + name); picks[name](); },
      addIt(name, keep) { nameBox.value = name; view.got.slotKeep = !!keep; buttons['Add it'](); }
    });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin, console, assert });
}
const adds = (st, date) => (st.dates[date] && st.dates[date].adds) || [];
/* (a toast keeps a time and a length on one line with a no-break space; the words are the same) */
const plainTime = (s) => s.replace(/ /g, ' ');

test('tap words: a time picked without a drag never says "Drop it"', () => {
  const r = rig(D.sampleState(today), 10 * 60);
  for (const reason of ['past', 'room', 'fixed', 'long']) {
    const tr = { reason, blocker: { name: 'Church' } };
    assert.doesNotMatch(r.blockedText(tr, 'tap'), /Drop/, reason);
    assert.match(r.blockedText(tr, 'tap'), /\. (Pick|Try) /, reason + ' says what to do instead');
  }
  assert.match(r.blockedText({ reason: 'past' }, true), /Drop it on open time\.$/, 'a drop still says drop');
});

test('slot panel: placed inside Work, it says where and what it took, with Undo', () => {
  const st = D.sampleState(today), r = rig2(st, 15 * 60 + 17);
  r.slot(thursday, 15 * 60);
  assert.ok(r.lines.includes('Pick a block. It takes its time from Work.'), 'the line says what the toast will: ' + r.lines);
  r.tap('Run');
  const t = r.toasts[r.toasts.length - 1];
  assert.equal(plainTime(t.text), 'Run tomorrow at 3 pm. Takes 30 min from Work');
  assert.equal(t.kind, 'good');
  assert.equal(t.act.what, 'Run is off tomorrow');
  assert.ok(adds(r.state, thursday).some((a) => a.name === 'Run' && a.start === 900));
  r.undo();
  assert.ok(!adds(r.state, thursday).some((a) => a.name === 'Run'), 'one Undo takes it back');
});

test('slot panel: in open time it says things move, and Add it with Keep says Block library too', () => {
  const st = D.sampleState(today), r = rig2(st, 15 * 60 + 17);
  const sunday = '2026-10-18';
  r.slot(sunday, 14 * 60);
  assert.ok(r.lines.includes('Pick a block. Anything in its way moves to make room.'), String(r.lines));
  r.addIt('Bike ride', true);
  const t = r.toasts[r.toasts.length - 1];
  assert.match(plainTime(t.text), /^Bike ride on Sunday at 2 pm\. It’s in Block library too$/);
  assert.match(t.act.what, /It’s out of Block library too$/);
  assert.ok(r.state.palette.some((p) => p.name === 'Bike ride'));
  r.undo();
  assert.ok(!r.state.palette.some((p) => p.name === 'Bike ride'), 'one Undo takes back the block and its place');
});

test('slot panel: a tap that can’t land says so in tap words', () => {
  const st = D.sampleState(today), r = rig2(st, 15 * 60 + 17);
  r.slot(today, 7 * 60 + 30);
  r.tap('Workout');
  assert.match(plainTime(r.toasts[r.toasts.length - 1].text), /^Workout today at 7:30 am, marked done/);
  r.slot(today, 7 * 60 + 30);
  r.tap('Walk');
  const t = r.toasts[r.toasts.length - 1];
  assert.equal(t.kind, 'bad');
  assert.doesNotMatch(t.text, /Drop/);
});

test('slot panel: a to-do given a time after it’s due says so', () => {
  const st = D.sampleState(today), r = rig2(st, 10 * 60);
  r.slot(thursday, 15 * 60);
  r.tap('Book a cleaning for Robin');
  assert.match(plainTime(r.toasts[r.toasts.length - 1].text), /\. That’s after it’s due \(today\)$/);
});

test('quick add: a time that’s over inside Work goes in as done, and it took the time', () => {
  const st = D.sampleState(today), r = rig2(st, 15 * 60 + 17);
  const plan = r.quickPlan(r.parse('Walk today 9am'));
  assert.equal(plan.ok, true);
  assert.equal(plan.text, 'It goes in as done. Took 30 min from Work.', 'in the toast’s order and tense');
  assert.equal(r.add('Walk today 9am'), true);
  assert.equal(plainTime(r.toasts[r.toasts.length - 1].text), 'Walk today at 9 am, marked done. Took 30 min from Work');
  assert.equal(adds(r.state, today).find((a) => a.name === 'Walk' && a.start === 540).done, true);
});

test('quick add: a time that’s over with something in it offers the closest time where nothing moves', () => {
  const st = D.sampleState(today), r = rig2(st, 15 * 60 + 17);
  // 1:30 pm is inside Deep work (1 to 2:30 pm), which already happened
  const plan = r.quickPlan(r.parse('Read today 1:30pm'));
  assert.equal(plan.ok, true, 'it offers a time instead of refusing: ' + plan.text);
  assert.match(plan.text, /^That time is over and already has something in it, so it goes at .+, the closest time that fits\. /);
  assert.notEqual(plan.start, 13 * 60 + 30);
  const c = M.canPlace(r.state, plan.date, plan.add.dur, plan.start);
  assert.ok(c.ok && !(c.pushes || []).some((p) => p.delta), 'nothing moves there');
  assert.equal(r.add('Read today 1:30pm'), true);
  assert.doesNotMatch(r.toasts[r.toasts.length - 1].text, /Drop/);
});

test('two blocks that move are named in the toast, as the place panel names them', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const c = M.canPlace(st, thursday, 240, 1110);
  assert.ok(c.ok && c.pushes.filter((p) => p.delta).length >= 2, 'a time that moves two blocks');
  const named = r.movesWords(c, true);
  assert.match(named, /^.+ moves to .+\. .+ moves to .+$/);
  assert.match(r.movesWords(c), /^\d+ blocks move to make room$/, 'a chip only counts them');
  const spec = { kind: 'block', id: 'workout' }, add = Object.assign({}, r.specAdd(spec), { dur: 240 });
  r.drop(spec, { type: 'rail', ok: true, date: thursday, start: 1110, add });
  assert.ok(last(r).text.endsWith('. ' + named), last(r).text);
});

test('a to-do placed after its due date says so in the chip and the toast; time that’s over took its time', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const spec = { kind: 'task', id: 'dentist-call' };
  assert.equal(r.afterDue(spec, thursday, 600, 30), 'That’s after it’s due (today)');
  assert.equal(r.afterDue(spec, today, 600, 30), '');
  assert.equal(r.afterDue({ type: 'task', id: 'dentist-call' }, thursday, 600, 30), 'That’s after it’s due (today)', 'an add’s src too');
  assert.match(r.dayChip(thursday, spec), / · After it’s due$/);
  r.place(spec, thursday, 600);
  assert.match(last(r).text, /\. That’s after it’s due \(today\)$/);
  assert.equal(r.landWords('Walk', today, 540, { past: true, cut: 'Took 30 min from Work' }), 'Walk today at 9 am, marked done. Took 30 min from Work');
  const d = { blocks: [{ soft: true, name: 'Work', start: 540, dur: 120 }] };
  assert.equal(r.cutWords(d, 540, 30, true), 'Took 30 min from Work');
});

test('the month says a trip with its month, for a screen reader', () => {
  const st = D.sampleState(today), r = rig(st, 10 * 60);
  const trip = r.monthList(M.monthStart(today)).find((x) => x.kind === 'trip');
  assert.ok(trip, 'the sample has a trip this month');
  assert.match(trip.full, /^[A-Z][a-z]{2} \d+/, 'the span keeps its month: ' + trip.full);
});
