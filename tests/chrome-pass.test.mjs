/* V11-3, the chrome pass from the two reviews of V11-2 (docs/V11-3-REVIEWS.md): one Undo a screen (toastUndoUp), a More
   menu with the menu's keys (menuWire), the gold that stays gold only as the call to action (the band's last minutes,
   the pins), the morning's kind of day asked on the phone too, one word for marking done, and 44 px hit areas. Cut out
   of the sources and run in small worlds of their own. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { app, plain } from './v11-rig.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const APP = read('board/src/app.js'), STYLE = read('board/src/style.css'), SCENE = read('board/src/scene.js');

/* == one Undo a screen == */
test('while a toast offers Undo, the Undo that stays steps aside; it comes back as the toast goes', () => {
  const kids = [];
  const w = runInNewContext(`
    const view = {}, $ = (id) => (id === 'toasts' ? { children: __kids } : null);
    ${app('  function toastUndoUp() {', '  function undoSpots() {')}
    ({ toastUndoUp });`, { __kids: kids });
  assert.equal(w.toastUndoUp(), false, 'no toasts');
  kids.push({ _gone: false, _act: null });
  assert.equal(w.toastUndoUp(), false, 'a toast with nothing to take back');
  kids.push({ _gone: false, _act: { label: 'Undo' } });
  assert.equal(w.toastUndoUp(), true, 'a toast with Undo: the bar\'s and the phone\'s step aside');
  kids[1]._gone = true;
  assert.equal(w.toastUndoUp(), false, 'leaving: they come back');
});

test('the phone\'s Undo that stays lives in its foot, never in the head card that carries the day\'s facts', () => {
  const head = APP.slice(APP.indexOf('  function phoneHead('), APP.indexOf('  function freshBoard()'));
  assert.ok(head.length > 100);
  assert.doesNotMatch(head, /phoneUndo\(/, 'the head card draws no Undo');
  const foot = APP.slice(APP.indexOf('  function footUndo() {'), APP.indexOf('  function todayFoot() {'));
  assert.match(foot, /toastUndoUp\(\) \? null : phoneUndo\(/, 'the foot draws it, unless a toast is saying it');
  assert.match(read('variants/corners11/variant.js'), /undoP\.hidden = !u\.undo \|\| !!\(SR\.toastUndoUp && SR\.toastUndoUp\(\)\)/, 'the desk\'s bar steps aside too');
});

/* == a More menu keeps the menu's keys == */
function menuWorld() {
  const listeners = { doc: [] };
  const mk = (name) => {
    const e = { name, tabIndex: 0, attrs: {}, dataset: {}, disabled: false, focused: false, isConnected: true, kids: [],
      setAttribute(k, v) { e.attrs[k] = v; }, getAttribute(k) { return e.attrs[k]; },
      focus() { doc.activeElement = e; }, contains(x) { return x === e || e.kids.includes(x); },
      addEventListener(t, fn) { (e.on = e.on || {})[t] = fn; } };
    return e;
  };
  const doc = { activeElement: null, addEventListener: (t, fn) => listeners.doc.push(fn), removeEventListener: (t, fn) => { listeners.doc = listeners.doc.filter((x) => x !== fn); } };
  const items = ['Move the date', 'Rename it', 'Remove the goal'].map((n) => { const x = mk(n); x.attrs.role = 'menuitem'; return x; });
  const hr = mk('hr');
  const menu = mk('menu'); menu.kids = items.concat(hr);
  menu.querySelectorAll = (sel) => (sel === 'hr' ? [hr] : items);
  const b = mk('More'); b.dataset.fk = 'gl-menu';
  let closed = 0;
  const timers = [];
  const w = runInNewContext(`
    ${app('  /* V11-3 (the code review): a More menu keeps the menu\'s keys.', '  /* the parts, a page inside the goal\'s sheet')}
    ({ menuWire });`, { document: doc, $: () => ({ querySelector: () => b }), requestAnimationFrame: (fn) => fn(), setTimeout: (fn) => timers.push(fn) });
  w.menuWire(menu, b, () => { closed++; });
  timers.forEach((fn) => fn());
  const key = (k) => { let stopped = false; menu.on.keydown({ key: k, preventDefault() {}, stopPropagation() { stopped = true; } }); return stopped; };
  return { w, menu, b, items, hr, key, doc, listeners, closed: () => closed };
}

test('a More menu: its button says it opens a menu, the arrows, Home and End move along it, Escape puts it away and gives focus back', () => {
  const m = menuWorld();
  assert.deepEqual([m.b.attrs['aria-haspopup'], m.b.attrs['aria-controls']], ['menu', m.menu.id]);
  assert.equal(m.hr.attrs.role, 'separator', 'a rule is a separator');
  assert.deepEqual(m.items.map((x) => x.tabIndex), [0, -1, -1], 'one item in the tab order at a time');
  m.items[0].focus();
  m.key('ArrowDown');
  assert.equal(m.doc.activeElement.name, 'Rename it');
  m.key('ArrowUp'); m.key('ArrowUp');
  assert.equal(m.doc.activeElement.name, 'Remove the goal', 'it wraps round');
  m.key('Home');
  assert.equal(m.doc.activeElement.name, 'Move the date');
  m.key('End');
  assert.equal(m.doc.activeElement.name, 'Remove the goal');
  assert.deepEqual(m.items.map((x) => x.tabIndex), [-1, -1, 0]);
  m.key('Escape');
  assert.equal(m.closed(), 1);
  assert.equal(m.doc.activeElement, m.b, 'focus goes back to More');
});

test('a More menu listens for a tap elsewhere once, and lets go of it', () => {
  const m = menuWorld();
  assert.equal(m.listeners.doc.length, 1);
  m.listeners.doc[0]({ target: m.items[1] });
  assert.equal(m.closed(), 0, 'a tap inside keeps it');
  m.listeners.doc[0]({ target: { name: 'board' } });
  assert.equal(m.closed(), 1, 'a tap elsewhere puts it away');
  assert.equal(m.listeners.doc.length, 0, 'and the listener is gone');
  const n = menuWorld();
  n.menu.isConnected = false;
  n.listeners.doc[0]({ target: { name: 'board' } });
  assert.deepEqual([n.closed(), n.listeners.doc.length], [0, 0], 'a menu already closed by its button or an item: the listener goes too, nothing more');
  for (const f of ['goalMore', 'cdMore', 'tsMore']) {
    const body = APP.slice(APP.indexOf('  function ' + f + '('), APP.indexOf('\n  }\n', APP.indexOf('  function ' + f + '(')));
    assert.match(body, /menuWire\(menu, b, /, f + ' wires its menu');
    assert.doesNotMatch(body, /addEventListener\('pointerdown'/, f + ' keeps no listener of its own');
  }
});

/* == gold is the call to action, nothing else == */
test('the last five minutes keep the time white and the pins red, on the band, the phone, and the board', () => {
  assert.doesNotMatch(STYLE, /#D9A43A/, 'no gold pin in the style sheet');
  assert.match(STYLE, /\.band-in\.soon \.band-left \{ color: #FFFFFF; \}/);
  assert.match(STYLE, /\.now-left\.soon \{ color: #FFFFFF; \}/);
  assert.match(SCENE, /function setPinTone\(\) \{ \/\* red to the end: nothing to change \*\/ \}/);
  assert.match(read('variants/corners11/css/today.css'), /\.band-leave \{[^}]*color: #FFFFFF;/, 'the countdown to leaving is white too');
});

/* == the morning's kind of day on the phone == */
test('the phone asks the morning\'s kind of day when the desk would, after the goals and before a heads-up', () => {
  const q = APP.slice(APP.indexOf('  function phoneQuestions('), APP.indexOf('  /* V11-3 (the design review): the phone\'s Today asks the morning'));
  assert.match(q, /out\.push\(\{ kind: 'goal' \}\);[\s\S]*phoneKindDue\(\)\) out\.push\(\{ kind: 'kind' \}\);[\s\S]*out\.push\(\{ kind: 'headsup', m: hu \}\)/);
  const w = runInNewContext(`
    const FEEL = true, today = '2026-10-20', nowMin = __now, state = {};
    const seenToday = () => __seen, kindQuiet = () => false, day = () => ({ blocks: [] });
    const M = { momentFor: (st, d, min, seen) => (min < 660 && !seen.kind ? { kind: 'kind' } : null) };
    ${app('  /* V11-3 (the design review): the phone\'s Today asks the morning', '  function kindAskCard(')}
    ({ phoneKindDue });`, { __now: 490, __seen: {} });
  assert.equal(w.phoneKindDue(), true, '8:10 am, not answered');
  const later = runInNewContext(`const FEEL = true, today = '2026-10-20', nowMin = 700, state = {}; const seenToday = () => ({}), kindQuiet = () => false, day = () => ({ blocks: [] }); const M = { momentFor: (st, d, min) => (min < 660 ? { kind: 'kind' } : null) }; ${app('  /* V11-3 (the design review): the phone\'s Today asks the morning', '  function kindAskCard(')} ({ phoneKindDue });`, {});
  assert.equal(later.phoneKindDue(), false, 'after 11: not asked');
});

/* == one word for marking done == */
test('marking done is Done everywhere; Done early only on the band', () => {
  for (const f of ['board/src/app.js', 'board/src/focus.js']) assert.doesNotMatch(read(f), /'Mark it done'/, f);
  assert.match(APP, /spec\.kind === 'task' \? \(FEEL \? 'Add a to-do' : 'Add a to do'\)/, 'the place panel says Add a to-do under V11');
});

/* == 44 px == */
test('every hit area is 44 px at least: the drawing stays, a clear pseudo element grows the target, never shrinks it', () => {
  const css = read('variants/corners11/css/targets.css');
  assert.match(css, /top: min\(0px, calc\(\(100% - 44px\) \/ 2\)\)/);
  for (const c of ['.k-pill', '.band-btn', '.chip-btn', '.c-tr .k-seg button', '.side-x', '.now-bar', '.band-bar']) assert.ok(css.includes(c), c);
});
