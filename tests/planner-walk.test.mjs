// V11, the Planner walk (Oct 15, docs/walk/planner.md): what Russell and Kim needed on a Sunday afternoon and what a new
// person needed in their first Planner. The model's parts run here on their own: a hand-off's outline (Sam has it),
// "every Saturday" in quick add and a block made part of the usual week, and Find a free day and a free evening. The
// app's parts are cut out of app.js and variant.js by the comment or line that starts them: the bottom bar's Undo and
// Redo and the words they name, what a kind of day says it did, a saved kind's name, a far day's words, what needs a
// look on a day (an overlap, a dinner still open, Keep both), what counts as a workout, a layout card's marks, and
// Getting started folded to its next thing.
// The boards are made up: the sample family (Alex, Sam, Robin) and the Heavy week (Morgan, Casey, three kids).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { M, D, app, variant, plain } from './v11-rig.mjs';

await import('../board/src/scenarios.js');
await import('../board/src/kit/themes.js');
await import('../board/src/onboard.js');
const S = globalThis.Scenarios, K = globalThis.DeskThemes, OB = globalThis.Onboard;
const SUN = '2026-10-18', WED = '2026-10-21', SAT = '2026-10-24';
const sample = () => D.sampleState(SUN);

/* == the hand-off: Sam has it == */
test('a hand-off keeps an outline on the board, "Sam: Pick up Robin", open time for you, never a commitment', () => {
  const st = sample();
  const rec = M.dateRec(st, WED);
  rec.edits = { pickup: { gone: true, by: 'Sam' } };
  M.setHandoffs(false);
  assert.ok(!M.calendarDay(st, WED).blocks.some((b) => b.handoff), 'off: every other version reads as it always did');
  const off = M.totals(M.calendarDay(st, WED));
  M.setHandoffs(true);
  try {
    const d = M.calendarDay(st, WED), ho = d.blocks.find((b) => b.handoff);
    assert.ok(ho, 'the outline is on the day');
    assert.equal(ho.label, 'Sam: Pick up Robin');
    assert.equal(ho.handoff, 'Sam');
    assert.equal(ho.free, true, 'printed on the wood, like free time');
    assert.equal(ho.soft, true, 'what you add makes room in it');
    assert.equal(ho.fixed, false, 'never locked');
    /* it lies under the day's own routines: Work runs to its usual 5 pm again, and the outline shows the rest of the
       pick up's half hour */
    assert.ok(ho.start >= 1005 && ho.start + ho.dur === 1035, 'inside the pick up\'s 4:45 to 5:15: ' + ho.start + '+' + ho.dur);
    assert.equal(d.blocks.filter((b) => b.cat === 'work' && b.start < 1035 && b.start + b.dur > 1005).reduce((a, b) => Math.max(a, b.start + b.dur), 0), 1020, 'Work keeps its usual end');
    /* its time counts the way the gap it was did: open, not family time */
    const on = M.totals(d);
    assert.equal(on.free, off.free, 'the same open time as before the outline');
    assert.equal(on.family || 0, off.family || 0, 'not counted as family time');
    assert.ok(!M.clashes(st, WED).some((c) => /Pick up/.test(c.a.name + c.b.name)), 'not a commitment that can overlap');
    assert.ok(M.capacity(st, WED, 1, SUN, 0).room >= 30, 'room for to-dos');
    assert.ok(M.quietWindows(st, WED, 'afternoon', 0).concat(M.quietWindows(st, WED, 'evening', 0)).some((w) => !w.free && w.start <= ho.start && w.end >= Math.min(1080, ho.start + ho.dur)), 'quiet time a goal can use');
    /* a day off with a blank slate leaves who has it alone */
    M.applyPreset(st, WED, D.PRESETS.find((p) => p.id === 'empty'), st.palette);
    assert.equal(st.dates[WED].edits.pickup.by, 'Sam');
  } finally { M.setHandoffs(false); }
});

/* == quick add in plain words: every Saturday == */
test('"every Saturday" in quick add is a weekday it repeats on, and never stays in the name', () => {
  const p = M.parseQuick('Swim lessons every Saturday 10am', SUN, [], 930);
  assert.equal(p.kind, 'block');
  assert.equal(p.name, 'Swim lessons');
  assert.equal(p.every, 6);
  assert.equal(p.date, SAT, 'the next Saturday');
  assert.equal(p.start, 600);
  assert.equal(M.parseQuick('Swim lessons Saturdays 10am', SUN, [], 930).every, 6, 'Saturdays says the same');
  assert.equal(M.parseQuick('Run every sat 7am 45m', SUN, [], 930).dur, 45);
  /* asked on the day itself after its time, the first one is next week's */
  assert.equal(M.parseQuick('Church every Sunday 9am', SUN, [], 930).date, '2026-10-25');
  assert.equal(M.parseQuick('Church every Sunday 6pm', SUN, [], 930).date, SUN);
  assert.ok(!('every' in M.parseQuick('Dentist next Tuesday 3:30pm', SUN, [], 930)), 'nothing changes for a one off');
});

test('a block made part of the usual weekday joins its routine, and never cuts a routine already there', () => {
  const st = sample();
  const r = M.addToUsual(st, SAT, { name: 'Swim lessons', cat: 'family', icon: 'star', start: 600, dur: 45 });
  assert.equal(r.ok, true);
  const tpl = M.templateFor(st, SAT), b = tpl.blocks.find((x) => x.id === r.id);
  assert.deepEqual(plain({ name: b.name, cat: b.cat, start: b.start, dur: b.dur }), { name: 'Swim lessons', cat: 'family', start: 600, dur: 45 });
  assert.ok(M.calendarDay(st, '2026-10-31').blocks.some((x) => x.name === 'Swim lessons' && x.start === 600), 'the next Saturday too');
  /* a routine that isn't open time at that time says no, and names itself */
  const hit = tpl.blocks.find((x) => !x.soft && !x.sleep);
  const no = M.addToUsual(st, SAT, { name: 'Brunch', start: hit.start, dur: 30 });
  assert.equal(no.ok, false);
  assert.equal(no.blocker.name, hit.name);
});

/* == Find a free day, and a free evening == */
test('Find a free day finds a weekend day with four open hours, and a free evening one with three and nothing locked', () => {
  const st = sample();
  const day = M.findFree(st, SUN, 'day');
  assert.equal(day.date, '2026-10-25', 'the next Sunday: the sample has things placed on Saturday');
  assert.ok(day.open >= 240);
  assert.equal(M.findFree(st, day.date, 'day').date, '2026-10-31', 'the next one after it');
  const eve = M.findFree(st, SUN, 'evening');
  assert.ok(eve, 'an evening');
  assert.ok(eve.open >= 180);
  /* weekday evenings have the pick up at 4:45, locked, inside 5 pm: not free */
  assert.ok([0, 6].includes(M.weekday(eve.date)), 'a weekend evening on the sample');
  /* nothing in six months says so */
  const busy = sample();
  busy.events.push({ id: 'away', kind: 'trip', name: 'Away', icon: 'plane', date: '2026-10-19', end: '2027-06-01', leave: 540, back: 1020 });
  assert.equal(M.findFree(busy, SUN, 'day'), null);
});

/* == the bottom bar's Undo and Redo == */
function undoRig() {
  const script = `
    const FEEL = true, noDesk = false, window = {};
    let state = { n: 0 }, undoStack = [], redoStack = [];
    const undoSaid = new Map(), toasts = [], view = { list: false, phone: false }, W = {};
    const Snd = { slide() {} }, changed = () => {}, landed = () => {}, logError = () => {}, feelMoves = () => false, phoneDay = () => false;
    function toast(text, kind, act) { toasts.push({ text, kind: kind || '', act: act || null }); }
    ${app('  /* what (V11): the toast after says what was taken back', '  /* V11: what an Undo says, from the toast it was on')}
    ${app('  const UNDO_FLIPS = [', '  function staleActs() {')}
    /* a change, as commit makes one, told in a toast with its Undo (toastFeel notes its words) */
    function change(n, words) { undoStack.push(JSON.stringify(state)); redoStack.length = 0; state = { n }; pruneSaid(); const a = undoAct(); noteSaid(a.top, words); return a; }
    ({ get state() { return state; }, toasts, undoInfo, undoLast, redoLast, change, get said() { return undoSaid; }, get stack() { return undoStack; } });`;
  return runInNewContext(script, { M, D, console });
}
test('the bottom bar\'s Undo names what it takes back after its toast is gone, and Redo brings it back in the same words', () => {
  const r = undoRig();
  assert.deepEqual(plain(r.undoInfo()), { undo: false, redo: false, undoSaid: '', redoSaid: '' }, 'nothing yet');
  r.change(1, 'Date night moved to Saturday at 7 pm.');
  assert.equal(r.undoInfo().undoSaid, 'Date night moved to Saturday at 7 pm.');
  r.undoLast();
  assert.equal(r.state.n, 0, 'taken back');
  const t = r.toasts[r.toasts.length - 1];
  assert.equal(t.text, 'Date night is back where it was.', 'said as what\'s true now');
  assert.equal(t.act.label, 'Redo');
  assert.deepEqual(plain(r.undoInfo()), { undo: false, redo: true, undoSaid: '', redoSaid: 'Date night moved to Saturday at 7 pm.' });
  r.redoLast();
  assert.equal(r.state.n, 1, 'and back again');
  assert.equal(r.toasts[r.toasts.length - 1].text, 'Date night moved to Saturday at 7 pm.', 'in the words it was first told in');
  assert.equal(r.undoInfo().undoSaid, 'Date night moved to Saturday at 7 pm.', 'Undo names it again');
  /* a step with no words still undoes; it says Undone */
  r.change(2, '');
  assert.equal(r.undoInfo().undoSaid, '');
  r.undoLast();
  assert.equal(r.state.n, 1);
  /* words go with their step: a new change clears what Redo could have named */
  r.change(3, 'Walk 15 minutes later');
  assert.equal(r.undoInfo().redo, false);
  assert.ok(r.said.size <= r.stack.length, 'no words kept for steps that left the stacks');
});

/* == kinds of day == */
test('a kind of day says what it put where: "A focus Thursday: Deep work 9:45 to 11:45 am, ..."', () => {
  const st = sample(), THU = '2026-10-22';
  const p = D.PRESETS.find((x) => x.id === 'focus');
  M.applyPreset(st, THU, p, st.palette, { today: SUN, nowMin: 930 });
  const script = `
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    let state = __st;
    ${app('  function kindDid(p, date, wdName) {', '  /* A plain text version of what the board shows')}
    ({ kindDid });`;
  const f = runInNewContext(script, { M, __st: st });
  const said = f.kindDid(p, THU, 'Thursday');
  assert.match(said, /^A focus Thursday: Deep work \d/);
  assert.match(said, /, and Walk /);
  assert.ok(said.endsWith('.'));
  const mine = { id: 'pr1', name: 'Workout and deep work', mine: true };
  assert.equal(f.kindDid(mine, THU, 'Thursday'), 'Workout and deep work on Thursday.', 'nothing of its own placed: its name alone');
});
test('a saved kind is named for what\'s in it, never for a weekday', () => {
  const script = `${app('  function kindNameFrom(items, clear, wd) {', '  function saveKindPanel(')} ({ kindNameFrom });`;
  const f = runInNewContext(script, {});
  assert.equal(f.kindNameFrom([{ name: 'Workout' }, { name: 'Deep work' }, { name: 'Deep work' }], false, 'Thursday'), 'Workout and deep work');
  assert.equal(f.kindNameFrom([{ name: 'Walk' }], true, 'Thursday'), 'Clear, with walk');
  assert.equal(f.kindNameFrom([], true, 'Thursday'), 'A clear day');
  assert.doesNotMatch(f.kindNameFrom([], false, 'Thursday'), /Thursday/);
});

/* == days named one way == */
test('a day further off keeps its weekday: "on Sunday, Oct 25"', () => {
  const script = `
    const FEEL = true, today = '2026-10-18';
    ${app('  /* a date said the way a person would', '  /* V11: anyone grown up at home can cook')}
    ({ whenWord });`;
  const f = runInNewContext(script, { M });
  assert.equal(f.whenWord('2026-10-19'), 'tomorrow');
  assert.equal(f.whenWord('2026-10-24'), 'on Saturday');
  assert.equal(f.whenWord('2026-10-25'), 'on Sunday, Oct 25');
  assert.equal(f.whenWord('2026-11-07'), 'on Saturday, Nov 7');
});

/* == what needs a look on a day == */
function lookRig(st, today, nowMin) {
  const script = `
    const FEEL = true, today = __today, nowMin = __now;
    let state = __st;
    const cache = new Map(), day = (d) => M.calendarDay(state, d), useDinners = () => true;
    const dinnerOver = (b, date) => date < today || (date === today && b.start + b.dur <= nowMin);
    ${app('  /* V11, the Planner walk (6.1): two commitments someone chose to keep both of', '  /* Seven day buttons in the top panel')}
    ({ dayLook, liveClashes, clashKey, keptBoth, cache });`;
  return runInNewContext(script, { M, __st: st, __today: today, __now: nowMin });
}
test('a day that needs a look says why: an overlap at its time, or a dinner still open; Keep both stops the asking', () => {
  const st = S.build('heavy', D, M, SUN, null), TUE = '2026-10-20';
  const r = lookRig(st, SUN, 930);
  const lk = r.dayLook(TUE);
  assert.ok(lk && lk.clash, 'Tuesday\'s pick up and soccer practice');
  assert.match(lk.words, /^Overlap at 5:30 pm/);
  /* keep both: the pair is kept on the date, and the day stops asking about it */
  const c = r.liveClashes(TUE)[0];
  st.dates[TUE] = st.dates[TUE] || {};
  st.dates[TUE].keepBoth = [r.clashKey(c)];
  r.cache.clear();
  assert.equal(r.liveClashes(TUE).length, 0);
  assert.ok(!(r.dayLook(TUE) || {}).clash, 'no overlap to look at');
  assert.ok(M.clashes(st, TUE).length > 0, 'both are still real on the board');
  /* the sample's Sunday at 3:30 pm: tonight's dinner is still open */
  const s = sample(), r2 = lookRig(s, SUN, 930);
  assert.equal((r2.dayLook(SUN) || {}).words, 'Dinner open');
  const r3 = lookRig(s, SUN, 23 * 60);
  assert.equal(r3.dayLook(SUN), null, 'once its time is over it isn\'t a question');
});

/* == what counts as a workout == */
test('Plan a routine is offered for a workout, never for a name that only contains a word like one', () => {
  const script = `${variant('    const MOVE_KIT = [', '    window.SR_isMove = isMove;')} ({ isMove });`;
  const f = runInNewContext(script, {});
  const yes = ['Workout', 'Run', 'Morning run', 'Long walk', 'Yoga', 'Gym', 'Strength training', 'Evening swim'];
  const no = ['Brunch with Sam', 'Errand run', 'Drive to the train', 'Swim lessons', 'Walk the dog to school', 'Dinner'];
  yes.forEach((n) => assert.equal(f.isMove({ name: n }), true, n));
  no.forEach((n) => assert.equal(f.isMove({ name: n }), false, n));
  assert.equal(f.isMove({ name: 'Morning', src: { type: 'block', id: 'walk' } }), true, 'Block library\'s Move group');
  assert.equal(f.isMove({ name: 'Walk with Sam', src: { type: 'idea', id: 'x' } }), false, 'an idea for time with someone');
  assert.equal(f.isMove({ name: 'Long runs', src: { type: 'goal', id: 'g' } }), false, 'a goal\'s session is the goal\'s');
});

/* == a layout card's marks == */
test('each thing on a layout card has a mark of its own', () => {
  const script = `${app('  /* the mark a desk thing is drawn with', '  /* Weeks that alternate')} ({ thingMark });`;
  const f = runInNewContext(script, {});
  const names = new Set(Object.keys(JSON.parse(JSON.stringify(readFileSync(new URL('../board/src/icon-paths.js', import.meta.url), 'utf8').match(/"([a-z0-9_-]+)":/g).map((x) => x.slice(1, -2)).reduce((o, k) => Object.assign(o, { [k]: 1 }), {})))));
  const things = K.LAYOUT_ORDER.flatMap((id) => K.LAYOUTS[id].L.flat().concat(K.LAYOUTS[id].R.flat()));
  things.forEach((t) => assert.ok(names.has(f.thingMark(t)), t + ' draws as ' + f.thingMark(t)));
  assert.equal(f.thingMark('lamp'), 'lamp');
  assert.equal(f.thingMark('mug'), 'cup');
  assert.equal(f.thingMark('plant'), 'leaf');
  /* the layouts differ before one is picked: no two show the same marks in the same order */
  const sig = (id) => K.LAYOUTS[id].L.flat().concat(['|'], K.LAYOUTS[id].R.flat()).map((t) => (t === '|' ? t : f.thingMark(t))).join(',');
  const seen = new Set(K.LAYOUT_ORDER.map(sig));
  assert.equal(seen.size, K.LAYOUT_ORDER.length);
});

/* == the walk's CSS keeps to the HUD's type scale == */
test('planner.css sizes its words on the HUD\'s scale only, and a finger\'s targets are 44 px', () => {
  const css = readFileSync(new URL('../variants/corners11/css/planner.css', import.meta.url), 'utf8');
  const sizes = [...css.matchAll(/font-size:\s*(\d+)px/g)].map((m) => +m[1]);
  assert.ok(sizes.length > 3);
  sizes.forEach((s) => assert.ok([12, 13, 14, 16, 19, 22, 26, 30].includes(s), s + ' px is off the scale'));
  const coarse = css.slice(css.indexOf('@media (pointer: coarse)'));
  ['.k-arrow', '.c-br .k-pill', '.c-tr .k-seg button', '.k .c-rchip'].forEach((sel) => assert.ok(coarse.includes(sel), sel + ' at 44 px under a finger'));
  assert.match(coarse, /\.k-arrow \{ width: 44px; height: 44px; \}/);
  assert.doesNotMatch(css, /[—–]|--(?![a-z])/, 'no dashes in the words');
});

/* == Getting started, folded to its next thing (1.2) == */
test('after the setup the Planner folds Getting started to its next thing, never the list over the new week', () => {
  const store = new Map(), timers = [], opened = [], renders = { n: 0 };
  const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
  const script = `
    const FEEL = true, OB = __OB, today = '2026-10-14', nowMin = 600, view = { phone: false, preview: null, sel: null };
    const phoneDay = () => false, firstDeskOk = () => false, setupOnPhone = () => false, useDinners = () => true, useTogether = () => false;
    const renderToday = () => {}, renderRack = () => {}, layoutInsets = () => {}, openSel = (x) => { __opened.push(x); }, setTimeout = (f, ms) => { __timers.push(ms); return 0; };
    const resetAtNow = () => ({ day: 0, min: 1140 }), onbWhenReset = () => 'Sunday at 7 pm', window = { SR_onRender() { __renders.n++; } };
    ${app("  const MOVES_KEY = 'sundayreset.moves';", '  /* something on the list happened')}
    ${app('  /* V11 (the Planner walk, 1.2): a move as Getting started says it', '  /* a list for someone who never did the setup here')}
    const deskOnly = (id) => !!view.phone && !!OB.MOVES[id].phone, moveLine = (id) => OB.MOVES[id].line;
    ({ startMoves, movesNext, foldMoves, get moves() { return moves; } });`;
  const f = runInNewContext(script, { M, D, __OB: OB, __timers: timers, __opened: opened, __renders: renders, localStorage: ls });
  const a = { name: 'Nate', pains: ['head', 'big'], help: { dinners: true, together: true }, focus: [], resetAt: { day: 0, min: 1140 }, placed: { date: '2026-10-15', start: 1125, dur: 60, stretched: true, add: { name: 'Study' } }, todo: { text: 'Study for the bar exam', name: 'Study for the bar exam', kind: 'task' }, soon: { name: 'Bar exam', date: '2027-02-23' }, dinner: null };
  f.startMoves(a);
  assert.equal(timers.length, 0, 'nothing waits to open the list over the week');
  assert.equal(opened.length, 0);
  /* the next thing to try, by its words: the goal the setup heard, by its name */
  const next = f.movesNext();
  assert.deepEqual(plain({ id: next.id, name: next.name, show: next.show }), { id: 'goal', name: 'Make Bar exam a goal', show: true });
  /* folded into its button, kept on this device with the list, and the bar told */
  f.foldMoves(true);
  assert.equal(JSON.parse(store.get('sundayreset.moves')).folded, true);
  assert.equal(renders.n, 1);
  f.foldMoves(false);
  assert.equal(JSON.parse(store.get('sundayreset.moves')).folded, false);
  /* the reset says when yours is */
  f.moves.done.goal = true; f.moves.done.dinner = true;
  const last = f.movesNext();
  assert.equal(last.id, 'reset');
  assert.equal(last.line, 'Yours is Sunday at 7 pm. ' + OB.MOVES.reset.line);
  f.moves.done.reset = true;
  assert.equal(f.movesNext(), null, 'all done: no card');
});

/* == the side panel's corner (Oct 20, Russell's to-do panel, where More sat over the x) == */
function cornerPage() {
  const all = {};
  const mk = (tag, cls) => {
    const e = {
      tagName: String(tag).toUpperCase(), children: [], parentNode: null, attrs: {}, className: cls || '', textContent: '', on: {},
      get classList() { const names = () => e.className.split(/\s+/).filter(Boolean); return { contains: (c) => names().includes(c), add: (c) => { if (!names().includes(c)) e.className += ' ' + c; } }; },
      get firstChild() { return e.children[0] || null; },
      appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = e; e.children.push(c); return c; },
      append(...cs) { cs.forEach((c) => e.appendChild(c)); },
      insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = e; const i = e.children.indexOf(ref); if (i < 0) e.children.push(c); else e.children.splice(i, 0, c); return c; },
      removeChild(c) { e.children = e.children.filter((x) => x !== c); c.parentNode = null; return c; },
      replaceChildren(...cs) { e.children.forEach((c) => { c.parentNode = null; }); e.children = []; cs.forEach((c) => e.appendChild(c)); },
      setAttribute(k, v) { e.attrs[k] = String(v); },
      getAttribute(k) { return e.attrs[k]; },
      addEventListener(type, fn) { e.on[type] = fn; },
      querySelector(sel) { const want = sel.replace(/^\./, ''); const walk = (n) => { for (const c of n.children) { if (c.classList.contains(want)) return c; const f = walk(c); if (f) return f; } return null; }; return walk(e); }
    };
    return e;
  };
  const side = mk('aside', 'panel side'), x = mk('button', 'side-x'), inn = mk('div', 'side-in');
  side.append(x, inn);
  Object.assign(all, { side, 'side-x': x, 'side-in': inn });
  return { mk, side, x, inn, $: (id) => all[id] };
}
test('on the desk More stands beside the panel\'s x, one row in its corner; on a phone both are in the header', () => {
  const pg = cornerPage(), view = { phone: false };
  const script = `
    const FEEL = true, view = __view, phoneDay = () => false, $ = __p.$, sheetDrag = () => {};
    const el = (tag, cls) => __p.mk(tag, cls);
    const button = (text, cls, fn) => { const b = __p.mk('button', cls || 'small'); b.addEventListener('click', fn); return b; };
    const icon = (name) => __p.mk('canvas', 'mark-' + name);
    ${app('  const phoneSheet = () =>', '  /* a drag down on the header pulls the sheet down with the finger')}
    ({ sheetChrome, sheetMore, sheetHead });`;
  const f = runInNewContext(script, { __view: view, __p: pg });
  f.sheetChrome();
  const head = pg.side.querySelector('.c-shead'), more = f.sheetMore();
  const order = () => pg.side.children.map((c) => (c === pg.x ? 'x' : c === more ? 'more' : c === head ? 'head' : c === pg.inn ? 'body' : '?'));
  assert.deepEqual(order(), ['x', 'more', 'head', 'body'], 'the x first, More beside it, then the header and the body');
  /* a panel fills More where it is now */
  more.appendChild(pg.mk('button', 'c-smore-btn'));
  f.sheetChrome();
  assert.equal(more.children.length, 0, 'the next panel starts with More empty');
  /* the window narrows to a phone: More and Done go into the header, More first */
  view.phone = true;
  f.sheetChrome();
  assert.equal(more.parentNode, head);
  assert.equal(pg.x.parentNode, head);
  assert.ok(head.children.indexOf(more) < head.children.indexOf(pg.x), 'More before Done');
  assert.equal(pg.x.getAttribute('aria-label'), 'Done');
  /* and back */
  view.phone = false;
  f.sheetChrome();
  assert.deepEqual(order(), ['x', 'more', 'head', 'body']);
  assert.equal(pg.x.getAttribute('aria-label'), 'Close');
});
test('the corner\'s buttons are round, 36 px to the eye and 44 to a finger, 8 apart, and only the title makes room', () => {
  const css = readFileSync(new URL('../variants/corners11/css/planner.css', import.meta.url), 'utf8');
  const at = css.indexOf("The side panel's corner"), part = css.slice(at);
  assert.ok(at > 0);
  /* (they stay while the panel scrolls: the panel is a column on the desk, and each sticks where cornerAt puts it,
     giving its height back so the words start where they did) */
  assert.match(part, /body\.feel:not\(\.phone\):not\(\.phone-desk\) #side \{ display: flex; flex-direction: column; \}/);
  assert.match(part, /#side > \.side-x,\s*body\.feel:not\(\.phone\):not\(\.phone-desk\) #side > \.c-smore \{[^}]*position: sticky; z-index: 4;[^}]*top: var\(--corner-mt, 0px\); right: auto; left: auto;[^}]*width: 36px; height: 36px;[^}]*margin: var\(--corner-mt, 0px\) 0 calc\(-36px - var\(--corner-mt, 0px\)\) 0;/, 'one row where cornerAt puts it, staying while the panel scrolls, taking no room');
  assert.match(part, /#side > \.side-x \{ margin-right: calc\(18px - var\(--side-pr, 20px\)\); border-radius: 50%; background: linear-gradient\(var\(--sf-raised\), var\(--sf-raised\)\), var\(--sf-solid\); \}/, '18 px from the panel\'s edge, and solid');
  assert.match(part, /#side > \.c-smore \{ margin-right: calc\(62px - var\(--side-pr, 20px\)\); \}/, 'More 8 px from the x: 18 + 36 + 8');
  assert.match(part, /\.c-smore-btn::after \{ content: ''; position: absolute; inset: -4px; border-radius: 50%; \}/, 'a ring of 4 px makes each 44 to a finger');
  assert.match(part, /#side \.c-cornered \{ padding-right: 40px; \}/, 'the title wraps before the x');
  assert.match(part, /#side:has\(> \.c-smore:not\(:empty\)\) \.c-cornered \{ padding-right: 84px; \}/, 'and before More');
  /* no panel places the x on its own any more: only the phone's header does */
  for (const f of ['consistency.css', 'firstvisit.css', 'goals.css']) {
    const other = readFileSync(new URL('../variants/corners11/css/' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(other, /> \.side-x/, f + ' leaves the x to the corner');
  }
});

/* == the panel's top stays (Oct 20, after the corner: closing is one tap however far down you are) == */
test('a desk panel\'s title, the line under it, and its corner stick on a solid plate, with a hairline once scrolled', () => {
  const css = readFileSync(new URL('../variants/corners11/css/planner.css', import.meta.url), 'utf8');
  const at = css.indexOf("The panel's top"), part = css.slice(at);
  assert.ok(at > 0);
  const D = 'body\\.feel:not\\(\\.phone\\):not\\(\\.phone-desk\\) ';
  assert.match(part, new RegExp(D + '#side \\.c-pstick \\{ position: sticky !important; z-index: 3; \\}'), 'the title and its line, over the plate, even a header row kept relative');
  assert.match(part, new RegExp(D + '#side\\.c-plated > \\.c-splate \\{[^}]*display: block; position: sticky; top: calc\\(0px - var\\(--side-pt, 20px\\)\\); z-index: 2;[^}]*height: var\\(--plate-h, 0px\\);[^}]*background: var\\(--sf-solid\\);'), 'a solid plate under them, the panel\'s color');
  assert.match(part, /margin: calc\(0px - var\(--side-pt, 20px\)\) calc\(1px - var\(--side-pr, 20px\)\) calc\(var\(--side-pt, 20px\) - var\(--plate-h, 0px\)\) calc\(1px - var\(--side-pl, 20px\)\);/, 'from the panel\'s top edge, inside its sides, giving its height back');
  assert.match(part, new RegExp(D + '#side\\.c-plated\\.scrolled > \\.c-splate \\{ box-shadow: inset 0 1px 0 var\\(--sf-edge\\), 0 1px 0 var\\(--sf-edge\\); \\}'), 'a hairline under it once the panel has scrolled');
  assert.match(part, /#side\.c-plated \{ scroll-padding-top: var\(--plate-h, 0px\); \}/, 'a field you Tab to scrolls clear of it');
  assert.match(part, new RegExp(D + '#side\\.c-plated:not\\(\\.scrolled\\) > \\.c-splate \\{ background: transparent; box-shadow: none; \\}'), 'clear until something is under it, so the panel at rest looks as it did');
  /* (the buttons over the title, the title over the plate, the plate over the words) */
  const z = (sel) => { const m = css.match(new RegExp(sel + '[^{]*\\{[^}]*z-index: (\\d+)')); return m ? +m[1] : null; };
  assert.ok(z('#side > \\.c-smore') > z('#side \\.c-pstick') && z('#side \\.c-pstick') > z('#side\\.c-plated > \\.c-splate'));
  /* the desk's only: the phone's sheet keeps its own header */
  const rules = part.split('\n').filter((l) => l.includes('{'));
  assert.ok(rules[0] === '#side > .c-splate { display: none; }', 'no plate unless the desk shows it');
  assert.ok(rules.length >= 5 && rules.slice(1).every((l) => l.startsWith('body.feel:not(.phone):not(.phone-desk) #side')), 'every other rule is the desk\'s');
});

/* cornerAt run on a made up layout: each thing has its top and height in the panel, as offsets give them */
function topPage(spec) {
  const mk = (cls, o = {}) => {
    const e = {
      className: cls, style: { top: '', position: '', props: {}, setProperty(k, v) { this.props[k] = v; }, getPropertyValue(k) { return this.props[k] || ''; }, removeProperty(k) { if (k === 'top') this.top = ''; delete this.props[k]; } },
      offsetTop: o.top || 0, offsetHeight: o.h || 0, offsetParent: null, parentNode: null, nextElementSibling: null, children: [], pos: o.pos || 'static', lh: o.lh, attrs: {},
      setAttribute(k, v) { e.attrs[k] = String(v); },
      insertBefore(c, ref) { e.children = e.children.filter((x) => x !== c); const i = e.children.indexOf(ref); e.children.splice(i < 0 ? e.children.length : i, 0, c); c.parentNode = e; return c; },
      get classList() {
        const names = () => e.className.split(/\s+/).filter(Boolean);
        return { contains: (c) => names().includes(c), add: (c) => { if (!names().includes(c)) e.className = (e.className + ' ' + c).trim(); }, remove: (c) => { e.className = names().filter((n) => n !== c).join(' '); }, toggle: (c, on) => { if (on) e.classList.add(c); else e.classList.remove(c); } };
      },
      matches(sel) { return sel.split(',').some((s) => s.trim().replace(/^\./, '').split('.').every((c) => e.classList.contains(c))); },
      querySelector(sel) { const want = sel.replace(/^\./, ''); return e.children.find((c) => c.classList.contains(want)) || null; }
    };
    return e;
  };
  const side = mk('side'), inn = mk('side-in');
  side.hidden = false; side.clientHeight = spec.clientHeight;
  inn.parentNode = side; inn.offsetParent = side; side.children = [inn];
  const kids = spec.kids.map(([cls, top, h, o]) => { const k = mk(cls, Object.assign({ top, h }, o || {})); k.parentNode = inn; k.offsetParent = side; return k; });
  kids.forEach((k, i) => { k.nextElementSibling = kids[i + 1] || null; });
  inn.children = kids; inn.firstElementChild = kids[0] || null;
  const head = kids.find((k) => k.classList.contains('c-ts-head'));
  if (head && spec.mark) { const m = mk('c-ts-mark', { top: spec.mark[0], h: spec.mark[1] }); m.offsetParent = side; head.children.push(m); }
  const sel = (root, q) => {
    if (q === ':scope > .c-ts-head, :scope > .side-title:not(.sr-only)') return root.children.find((c) => c.classList.contains('c-ts-head') || (c.classList.contains('side-title') && !c.classList.contains('sr-only'))) || null;
    if (q === ':scope > .side-kicker') return root.children.find((c) => c.classList.contains('side-kicker')) || null;
    if (q === ':scope > .c-shead') return null;
    throw new Error('no fake for ' + q);
  };
  inn.querySelector = (q) => sel(inn, q);
  side.querySelector = (q) => sel(side, q);
  side.querySelectorAll = (q) => { assert.equal(q, '.c-pstick'); return kids.filter((k) => k.classList.contains('c-pstick')); };
  const all = { side, 'side-in': inn };
  const cs = (e) => (e === side ? { paddingTop: '20px', paddingLeft: '20px', paddingRight: '20px', borderTopLeftRadius: '18px' } : { position: e.pos, lineHeight: e.lh ? e.lh + 'px' : 'normal' });
  return { side, inn, kids, $: (id) => all[id], cs, el: (tag, cls) => mk(cls) };
}
const cornerRun = (pg, phone) => {
  const script = `
    const $ = __p.$, getComputedStyle = __p.cs, phoneSheet = () => __phone, window = {}, requestAnimationFrame = () => 0, el = __p.el;
    ${app('  let cornerSeen = null', '  function kicker(parent')}
    cornerAt;`;
  return runInNewContext(script, { __p: pg, __phone: !!phone })();
};
const stuck = (pg) => pg.kids.filter((k) => k.classList.contains('c-pstick')).map((k) => k.className.split(' ')[0] + ' ' + k.style.top);
test('the to-do\'s name and the line under it stick where they sit; the plate ends a little under them', () => {
  const kids = [['side-title sr-only', 0, 1, { pos: 'absolute' }], ['c-ts-head', 20, 40], ['c-ts-facts', 64, 20], ['c-ts-chips', 96, 32], ['c-tsteps', 140, 400]];
  const pg = topPage({ clientHeight: 600, kids, mark: [20, 40] });
  cornerRun(pg);
  assert.deepEqual(stuck(pg), ['c-ts-head 0px', 'c-ts-facts 44px'], 'the name and its facts, each at its own place (less the panel\'s padding, where a sticky top counts from); not the hidden heading, not the chips');
  assert.equal(pg.side.style.getPropertyValue('--corner-y'), '22px', 'the corner centers on the mark');
  assert.equal(pg.side.style.getPropertyValue('--corner-mt'), '2px');
  assert.equal(pg.side.style.getPropertyValue('--plate-h'), '94px', '84, and 10 of the 12 before the chips');
  assert.ok(pg.side.classList.contains('c-plated'));
  assert.deepEqual(pg.side.children.map((c) => c.className), ['c-splate', 'side-in'], 'the plate, in the panel before its words');
  assert.equal(pg.side.children[0].attrs['aria-hidden'], 'true');
  assert.ok(pg.kids[1].classList.contains('c-cornered'), 'the name still makes room for the corner');
  /* again, as after a scroll or a resize: it lets go first and measures the same */
  cornerRun(pg);
  assert.deepEqual(stuck(pg), ['c-ts-head 0px', 'c-ts-facts 44px']);
  assert.equal(pg.side.style.getPropertyValue('--plate-h'), '94px');
});
test('a top taller than two fifths of the panel keeps fewer lines, from the bottom up; the corner stays either way', () => {
  const kids = [['c-ts-head', 20, 40], ['c-ts-facts', 64, 20], ['c-ts-chips', 96, 32]];
  let pg = topPage({ clientHeight: 200, kids, mark: [20, 40] });
  cornerRun(pg);
  assert.deepEqual(stuck(pg), ['c-ts-head 0px'], 'the facts go, the name stays');
  assert.equal(pg.side.style.getPropertyValue('--plate-h'), '64px', 'to the facts, never over them');
  pg = topPage({ clientHeight: 100, kids, mark: [20, 40] });
  cornerRun(pg);
  assert.deepEqual(stuck(pg), [], 'nothing sticks');
  assert.ok(!pg.side.classList.contains('c-plated'), 'and no plate');
  assert.equal(pg.side.style.getPropertyValue('--corner-y'), '22px', 'the corner still has its place');
});
test('a kicker over a block\'s card sticks alone; Getting started keeps its kicker, title, and line', () => {
  let pg = topPage({ clientHeight: 600, kids: [['side-kicker', 20, 16, { lh: 16, pos: 'sticky' }], ['bprev', 54, 64], ['field', 136, 60]] });
  cornerRun(pg);
  assert.deepEqual(stuck(pg), ['side-kicker 0px'], 'the card scrolls under the kicker');
  assert.equal(pg.kids[0].style.position, '', 'a kicker that sticks by a rule of its own was measured unstuck, then left to its rules');
  assert.equal(pg.side.style.getPropertyValue('--corner-y'), '10px');
  assert.equal(pg.side.style.getPropertyValue('--corner-mt'), '-10px', 'above the panel\'s padding, on the kicker\'s line');
  assert.equal(pg.side.style.getPropertyValue('--plate-h'), '46px');
  pg = topPage({ clientHeight: 600, kids: [['side-kicker', 20, 16, { lh: 16 }], ['side-title', 54, 26, { lh: 26 }], ['side-line', 88, 40], ['moves', 146, 300]] });
  cornerRun(pg);
  assert.deepEqual(stuck(pg), ['side-kicker 0px', 'side-title 34px', 'side-line 68px']);
  assert.equal(pg.side.style.getPropertyValue('--corner-y'), '49px', 'the corner on the title\'s line');
});
test('on a phone nothing on the panel sticks this way: the sheet\'s header has Done', () => {
  const kids = [['c-ts-head', 20, 40], ['c-ts-facts', 64, 20], ['c-ts-chips', 96, 32]];
  const pg = topPage({ clientHeight: 600, kids, mark: [20, 40] });
  cornerRun(pg);
  assert.equal(stuck(pg).length, 2);
  cornerRun(pg, true);
  assert.deepEqual(stuck(pg), [], 'let go');
  assert.ok(!pg.side.classList.contains('c-plated'));
});

/* == 19.3: the desk had Autumn, Winter, and Spring; Summer finishes the year (Oct 20) == */
test('the desk has all four seasons: Summer, made of things the kit already has', () => {
  assert.deepEqual(K.LAYOUT_ORDER.slice(-4), ['autumn', 'winter', 'spring', 'summer']);
  assert.deepEqual(plain(K.LAYOUTS.summer), { name: 'Summer', L: ['monstera', 'tumbler', 'notes'], R: ['fruit', 'lamp', 'radio'] });
  assert.deepEqual(K.LAYOUT_ORDER.slice().sort(), Object.keys(K.LAYOUTS).sort(), 'every layout is in the order, once');
  /* (each thing is in a pack already built; the lamp is one of the eight props) */
  const packs = ['data', 'plants', 'drinks', 'home'].map((p) => readFileSync(new URL('../board/src/kit/kit-' + p + '.js', import.meta.url), 'utf8')).join('\n');
  for (const id of ['monstera', 'tumbler', 'notes', 'fruit', 'radio']) assert.ok(packs.includes('"' + id + '":{'), id + ' is in the kit');
});
