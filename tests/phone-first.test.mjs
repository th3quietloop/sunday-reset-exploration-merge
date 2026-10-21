// V11 (Oct 14, the polish pass), the phone's first view: which of its two views a phone used last, its own day on
// the desk or the list, is kept on this device (sundayreset.v11.phoneView) and opens next time (phoneViewKept,
// keepPhoneView, phoneDeskFirst); a new person's first look is the desk, after Look around first and after the
// setup's Open my week (firstLookDesk); and folding an iPhone Duo with the desk kept opens the phone's own day on
// the day the desk showed (crossPhone). The functions are cut out of board/src/app.js and
// variants/corners11/variant.js whole and run on a stand-in window, view, and storage, as tests/duo.test.mjs does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, variant, M, plain } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const KEY = 'sundayreset.v11.phoneView';
const desk = (o) => Object.assign({ mode: 'today', zoom: 'day', focus: today, phone: false, phoneDesk: false, pick: null, sel: null, reset: null, todayOff: 0, bench: null, level: null, dockOpen: false }, o);

/* a device's storage: a map, or one that throws on every read and write (a private window, storage off) */
function storage(stored, broken) {
  const map = new Map(stored ? [[KEY, stored]] : []);
  const ls = broken
    ? { getItem() { throw new Error('storage is off'); }, setItem() { throw new Error('storage is off'); }, removeItem() {} }
    : { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); }, removeItem: (k) => { map.delete(k); } };
  return { map, ls };
}

/* the phone's views and crossing the line, with the version's feel or without it (o.old), the desk drawing or not
   (o.noDesk), on a window of a phone's size or not (g.small) */
function phone(view, o) {
  o = o || {};
  const st = storage(o.stored, o.broken);
  const cls = new Set();
  const g = { small: o.small !== false };
  const script = `
    const FEEL = ${!o.old}, deskAlways = false, noDesk = ${!!o.noDesk}, devPhone = false;
    const view = __view, today = __today, nowMin = 620;
    const document = { body: { classList: { contains: (c) => __cls.has(c) } } };
    const inToday = () => view.mode === 'today';
    const boardTime = (date) => ({ date, start: nowMin });
    const phoneSize = () => __g.small;
    ${app('  /* V11: opening or closing an iPhone Duo', '  function openPhoneDesk() {')}
    ({ crossPhone, phoneViewKept, keepPhoneView, phoneDeskFirst, firstDeskOk });`;
  const fns = runInNewContext(script, { M, __view: view, __today: today, __cls: cls, __g: g, localStorage: st.ls });
  return Object.assign(fns, {
    view, store: st.map, g,
    fold() { g.small = true; fns.crossPhone(); if (view.phoneDesk) cls.add('phone-desk'); else view.phone = true; },
    open() { g.small = false; fns.crossPhone(); view.phone = false; cls.delete('phone-desk'); }
  });
}

test('the phone keeps the view it used last on this device: the desk, or the list', () => {
  const p = phone(desk());
  assert.equal(p.phoneViewKept(), null, 'nothing kept on a first visit, so the list opens as it always did');
  p.keepPhoneView('desk');
  assert.equal(p.store.get(KEY), 'desk');
  assert.equal(p.phoneViewKept(), 'desk');
  p.keepPhoneView('list');
  assert.equal(p.phoneViewKept(), 'list');
  // only the two words count
  p.store.set(KEY, 'bench');
  assert.equal(p.phoneViewKept(), null);
});

test('a preview, a window past a phone\'s size, and storage that is off keep nothing, and never throw', () => {
  const pv = phone(desk({ preview: { id: 'sample' } }));
  pv.keepPhoneView('desk');
  assert.equal(pv.store.has(KEY), false, 'nothing from a made up board reaches the device');
  const wide = phone(desk(), { small: false });
  wide.keepPhoneView('desk');
  assert.equal(wide.store.has(KEY), false, 'the open Duo, a laptop: not a phone\'s view');
  const off = phone(desk(), { broken: true });
  assert.doesNotThrow(() => off.keepPhoneView('desk'));
  assert.equal(off.phoneViewKept(), null, 'and the list opens');
  const old = phone(desk(), { old: true, stored: 'desk' });
  assert.equal(old.phoneViewKept(), null, 'a version without V11\'s feel keeps the list');
});

test('a phone opens on its kept view: the phone\'s own day on today with the desk kept, otherwise the list', () => {
  const p = phone(desk({ mode: 'today' }), { stored: 'desk' });
  assert.equal(p.phoneDeskFirst(), true);
  assert.deepEqual([p.view.phoneDesk, p.view.mode, p.view.zoom, p.view.focus, p.view.todayOff], [true, 'planner', 'day', today, 0]);
  assert.deepEqual(plain(p.view.phoneFrom), { mode: 'today', zoom: 'day', focus: today }, 'the desk around it comes back as it was when the window grows');
  // the list kept, nothing kept, storage off: the list, and the view as it was
  for (const o of [{ stored: 'list' }, {}, { broken: true }]) {
    const q = phone(desk({ mode: 'today' }), o);
    assert.equal(q.phoneDeskFirst(), false, JSON.stringify(o));
    assert.deepEqual([q.view.phoneDesk, q.view.mode], [false, 'today']);
  }
  // no WebGL, the open Duo (or any window past a phone's size), a running reset: never the phone's day on load
  assert.equal(phone(desk(), { stored: 'desk', noDesk: true }).phoneDeskFirst(), false, 'no WebGL means the list');
  assert.equal(phone(desk(), { stored: 'desk', small: false }).phoneDeskFirst(), false, 'the open Duo shows the desk');
  assert.equal(phone(desk({ reset: { week: '2026-10-11', step: 1 } }), { stored: 'desk' }).phoneDeskFirst(), false, 'a running reset shows the desk');
});

test('folding with the desk kept opens the phone\'s own day on the day the desk showed; opening, the desk as it was', () => {
  const p = phone(desk({ mode: 'planner', zoom: 'day', focus: '2026-10-16' }), { stored: 'desk', small: false });
  p.fold();
  assert.equal(p.view.phoneDesk, true);
  assert.deepEqual([p.view.mode, p.view.zoom, p.view.focus], ['planner', 'day', '2026-10-16'], 'Friday, the day the desk showed');
  assert.equal(p.view.todayOff, 2, 'and the list, if it goes there, is on Friday too');
  p.open();
  assert.equal(p.view.phoneDesk, false);
  assert.deepEqual([p.view.mode, p.view.zoom, p.view.focus], ['planner', 'day', '2026-10-16']);
  // from the week, or Now: the phone's day is today, and the week comes back on opening
  const w = phone(desk({ mode: 'planner', zoom: 'week', focus: '2026-10-17' }), { stored: 'desk', small: false });
  w.fold();
  assert.deepEqual([w.view.phoneDesk, w.view.zoom, w.view.focus], [true, 'day', today]);
  w.open();
  assert.deepEqual([w.view.mode, w.view.zoom, w.view.focus], ['planner', 'week', '2026-10-17']);
  const n = phone(desk({ mode: 'today' }), { stored: 'desk', small: false });
  n.fold();
  assert.deepEqual([n.view.phoneDesk, n.view.focus], [true, today]);
  n.open();
  assert.equal(n.view.mode, 'today', 'Now again');
});

test('folding with the list kept (or nothing kept) is the list, as before', () => {
  for (const o of [{ stored: 'list', small: false }, { small: false }, { broken: true, small: false }]) {
    const p = phone(desk({ mode: 'planner', zoom: 'day', focus: '2026-10-16' }), o);
    p.fold();
    assert.equal(p.view.phoneDesk, false, JSON.stringify(o));
    assert.equal(p.view.phone, true);
    assert.equal(p.view.todayOff, 2);
    p.open();
    assert.deepEqual([p.view.mode, p.view.zoom, p.view.focus], ['planner', 'day', '2026-10-16']);
  }
  // a picked block still opens the phone's day with it picked, whatever is kept
  const pick = { date: '2026-10-15', key: 'tpl:evening', displayDate: '2026-10-15', displayKey: '2026-10-15:tpl:evening' };
  const q = phone(desk({ mode: 'planner', zoom: 'week', focus: today, pick }), { stored: 'list', small: false });
  q.fold();
  assert.deepEqual([q.view.phoneDesk, q.view.focus, q.view.pick], [true, '2026-10-15', pick]);
});

/* Open the desk, and every way back to the list, with the rest of the app standing in */
function ways(view, o) {
  o = o || {};
  const st = storage(o.stored);
  const said = { moves: [], focus: 0, today: 0 };
  const script = `
    const FEEL = true, deskAlways = false, noDesk = false, devPhone = false;
    const view = __view, today = __today, nowMin = 620;
    let moves = __moves;
    const OB = {};
    const document = { body: { classList: { contains: () => false } }, querySelector: () => null };
    const inToday = () => view.mode === 'today';
    const boardTime = (date) => ({ date, start: nowMin });
    const phoneSize = () => true;
    const phoneDay = () => !!view.phoneDesk;
    const W = { setSelected() {}, wake() {} };
    const Snd = { init() {}, slide() {} };
    const $ = () => ({ querySelector: () => null });
    const noteMove = (id) => { __said.moves.push(id); };
    const saveMoves = () => { __said.saved = JSON.parse(JSON.stringify(moves)); };
    const closeSel = () => { view.sel = null; };
    const setPhone = () => { view.phone = !view.phoneDesk; };
    const render = () => {}, layoutInsets = () => {}, measureDesk = () => {}, enterToday = () => { view.zoom = 'day'; view.focus = today; };
    const renderToday = () => { __said.today++; };
    const setTimeout = () => 0;
    ${app('  /* V11: opening or closing an iPhone Duo', '  /* The first time a phone opens the desk')}
    ${app('  function leavePhoneDay() {', '  let phoneBar = null;')}
    ({ openPhoneDesk, closePhoneDesk, firstLookDesk, get moves() { return moves; } });`;
  const fns = runInNewContext(script, { M, __view: view, __today: today, __moves: o.moves || null, __said: said, localStorage: st.ls });
  return Object.assign(fns, { view, store: st.map, said });
}

test('Open the desk keeps the desk; the List button, Esc, and the notepad keep the list; the meal board\'s trip keeps neither', () => {
  const p = ways(desk({ mode: 'today', phone: true }));
  p.openPhoneDesk();
  assert.equal(p.store.get(KEY), 'desk');
  assert.deepEqual([p.view.phoneDesk, p.view.mode, p.view.zoom, p.view.focus], [true, 'planner', 'day', today]);
  // the List button passes its click; Esc and the notepad pass nothing: each keeps the list
  p.closePhoneDesk({ type: 'click' });
  assert.equal(p.store.get(KEY), 'list');
  assert.deepEqual([p.view.phoneDesk, p.view.mode], [false, 'today'], 'back on the list, the mode as it was');
  p.openPhoneDesk();
  p.closePhoneDesk();
  assert.equal(p.store.get(KEY), 'list');
  // the meal board opens over the list from the phone's desk: a trip, not a choice of the list
  p.openPhoneDesk();
  p.closePhoneDesk({ keep: true });
  assert.equal(p.store.get(KEY), 'desk');
  assert.equal(p.view.phoneDesk, false, 'it still goes to the list, where the meal board opens');
});

test('a new person\'s first look on a phone is the desk, with Getting started\'s Open the desk done quietly', () => {
  const moves = { kind: 'phone', done: { build: true }, hidden: false };
  const p = ways(desk({ mode: 'today', phone: true, todayOff: 3 }), { moves });
  assert.equal(p.firstLookDesk(), true);
  assert.equal(p.store.get(KEY), 'desk', 'and it is this phone\'s view from now on');
  assert.deepEqual([p.view.phoneDesk, p.view.zoom, p.view.focus], [true, 'day', today], 'today, whatever day the list showed');
  assert.equal(p.moves.done.desk, true);
  assert.equal(p.said.saved.done.desk, true, 'kept on the device');
  // (noteMove still hears it, and finds it done, so no second toast follows "Your week is ready.")
  assert.deepEqual(p.said.moves, ['desk']);
  // a made up board: the first look is the desk too, and nothing reaches the device
  const pv = ways(desk({ mode: 'today', phone: true, preview: { id: 'firstrun' } }), { moves: { kind: 'phone', done: { build: true } } });
  pv.firstLookDesk();
  assert.equal(pv.view.phoneDesk, true);
  assert.equal(pv.store.has(KEY), false);
  assert.equal(pv.moves.done.desk, undefined, 'the device\'s list is left as it was');
});

test('the first look waits for a phone\'s size and a desk that draws', () => {
  for (const [what, o] of [['no WebGL', { noDesk: true }], ['a laptop or the open Duo', { small: false }], ['a running reset', { reset: true }]]) {
    const p = phone(desk(o.reset ? { reset: { week: '2026-10-11', step: 0 } } : {}), o);
    assert.equal(p.firstDeskOk(), false, what);
  }
  assert.equal(phone(desk()).firstDeskOk(), true);
});

/* the front door (Oct 15, the first-visit walk: one page for a first visit and Start over, the board's own welcome).
   variant.js openSetupIntro opens it; app.js lookAround, which Look at a sample week, the x, Esc, and a tap outside
   all reach (closeSetup on the welcome), makes the phone's first look the desk; Set up my week goes to the setup */
function intro() {
  const calls = { first: 0, welcome: [], toast: 0, tip: 0, closed: 0 };
  const ctx = { SR: { openWelcome: (o) => { calls.welcome.push(o); } }, closeMenu() {} };
  runInNewContext(variant('    function openSetupIntro(opts) {', '    /* == V7: Dev mode') + '\n;this.openSetupIntro = openSetupIntro;', ctx);
  const view = { got: { setup: { mode: 'first', at: 'welcome' } } };
  const script = `
    const FEEL = true, view = __view;
    const closeSheet = () => { __calls.closed++; view.got.setup = null; };
    const firstLookDesk = () => { __calls.first++; return true; };
    const toast = () => { __calls.toast++; };
    const setTimeout = (fn) => { __calls.tip++; return 0; }, sampleTip = () => {};
    ${app('  /* Look around first, and the welcome\'s way out by Escape or a click outside it */', '  /* V11: the first look at the sample: one tip')}
    ({ lookAround });`;
  const app0 = runInNewContext(script, { __view: view, __calls: calls });
  return { calls, view, openSetupIntro: ctx.openSetupIntro, lookAround: app0.lookAround };
}

test('on a first visit, the front door is the welcome, and looking at the sample makes the phone\'s first look the desk', () => {
  const t = intro();
  t.openSetupIntro({ first: true });
  assert.deepEqual(plain(t.calls.welcome), [{ preview: false }], 'one front door: the board\'s own welcome');
  t.openSetupIntro({ preview: true, first: true });
  assert.deepEqual(plain(t.calls.welcome[1]), { preview: true }, 'Dev tries it as someone new');
  t.lookAround();
  assert.equal(t.calls.first, 1, 'Look at a sample week (and the x, Esc, a tap outside) opens the phone\'s desk');
  assert.equal(t.calls.closed, 1);
  assert.equal(t.calls.toast, 0, 'no toast: the sample says so where it\'s seen, and a tip on a block teaches the move');
  assert.equal(t.calls.tip, 1, 'the tip waits for the board to settle');
});

test('boot opens the kept view before the phone\'s views are drawn', () => {
  const boot = app('  async function boot() {', '  /* A saved week this browser couldn\'t read.');
  const first = boot.indexOf('phoneDeskFirst()'), draw = boot.indexOf('    setPhone();', first);
  assert.ok(first > 0 && draw > first, 'phoneDeskFirst runs right before setPhone');
});

/* the minute's tick on a new day (app.js clockTick), with a held day standing in for midnight */
function midnight(view, onPhoneDay) {
  const said = { modes: [], today: 0 };
  const script = `
    const FEEL = true, ready = true;
    let today = '2026-10-14', nowMin = 1439, heldMin = 0, heldDay = '2026-10-15', dinnerWasOver = null, tickLater = 0, tickHeldAt = 0;
    const view = __view;
    const carryingNow = () => false, phoneDay = () => __onPhoneDay;
    const W = { setDaylight() {} };
    const saveMode = () => {}, loadMode = () => 'today', enterToday = () => { __said.today++; view.zoom = 'day'; view.focus = today; };
    const rollGoals = () => {}, render = () => {}, autoReflow = () => {}, setTimeout = () => 0;
    ${app('  function clockTick() {', '  /* after a resize the panels reflow, so measure')}
    clockTick();
    ({ get today() { return today; } });`;
  const out = runInNewContext(script, { M, __view: view, __onPhoneDay: !!onPhoneDay, __said: said });
  return { view, today: out.today, said };
}

test('over midnight the phone\'s own day stays itself, on the new today when it showed the day before', () => {
  const p = midnight(desk({ mode: 'planner', zoom: 'day', focus: today, phoneDesk: true }), true);
  assert.equal(p.today, '2026-10-15');
  assert.deepEqual([p.view.mode, p.view.zoom, p.view.focus], ['planner', 'day', '2026-10-15'], 'still the phone\'s day, now Thursday');
  assert.equal(p.said.today, 0, 'never turned into Now under the phone\'s bar');
  const f = midnight(desk({ mode: 'planner', zoom: 'day', focus: '2026-10-16', phoneDesk: true }), true);
  assert.equal(f.view.focus, '2026-10-16', 'a day picked ahead stays picked');
  // the desk itself opens the new day in its own mode, as always
  const d = midnight(desk({ mode: 'planner', zoom: 'week', focus: today }), false);
  assert.deepEqual([d.view.mode, d.said.today], ['today', 1]);
});

/* where a phone's toasts stand (app.js phoneToasts), on a window 844 tall, after a touch at y or with focus at y */
function toastSpot(o) {
  const cls = new Set();
  const handlers = [];
  const script = `
    const FEEL = true;
    const view = __view;
    const phoneDay = () => !!__o.phoneDay;
    const document = {
      addEventListener: (type, fn) => __handlers.push(fn),
      activeElement: __o.focusY == null ? { tagName: 'BODY' } : { getBoundingClientRect: () => ({ top: __o.focusY - 20, bottom: __o.focusY + 20, height: 40 }) },
      body: { classList: { toggle: (c, on) => { if (on) __cls.add(c); else __cls.delete(c); } } }
    };
    document.body.contains = () => false;
    const window = { innerHeight: 844 };
    /* the panel (closed, unless o.sheet opens it as the phone's sheet, with its footer's top, and its header's More
       menu shut unless o.sheet.menu) and the toasts' box */
    const __props = {};
    /* (V11-3: the sheet makes room for the toasts showing, o.toastH tall, at the top of its footer, or pinned to its
       foot when it has none: app.js toastRoom) */
    const __kids = [];
    const __room = { style: {}, classList: { add() {} }, setAttribute() {}, remove() {}, getBoundingClientRect: () => ({ top: __o.sheet.foot != null ? __o.sheet.foot : 844 - __o.toastH - 8, height: __o.toastH }) };
    const el = () => __room;
    const __side = __o.sheet
      ? { hidden: false, scrollTop: 0, getClientRects: () => [1], getBoundingClientRect: () => ({ top: __o.sheet.top, bottom: 844 }),
          querySelector: (sel) => (sel === '.c-stoast' ? (__kids.length ? __room : null) : sel === '.side-in' ? { appendChild: (k) => __kids.push(k) } : /c-sfoot/.test(sel) && __o.sheet.foot != null ? { insertBefore: (k) => __kids.push(k) } : null) }
      : { hidden: true, getClientRects: () => [] };
    const __toasts = { children: __o.toastH ? [{ _gone: false, getBoundingClientRect: () => ({ height: __o.toastH }) }] : [], style: { setProperty: (k, v) => { __props[k] = v; } } };
    const $ = (id) => (id === 'side' ? __side : __toasts);
    const zoomOf = () => 1;
    ${app('  /* V11: on a phone a toast stands in the half of the screen away from the last touch', '  /* o (V11, lift and place): receipt, a drop saying where it went')}
    ({ phoneToasts, props: __props });`;
  const ctx = { __view: { phone: !!o.phone }, __o: o, __cls: cls, __handlers: handlers, Date };
  const fns = runInNewContext(script, ctx);
  if (o.touchY != null) handlers.forEach((fn) => fn({ clientY: o.touchY }));
  fns.phoneToasts();
  /* (over the phone's sheet: above its footer, or under its header, at so many pixels) */
  if (cls.has('c-toasts-sheet')) return 'sheet bottom ' + fns.props['--toast-sheet-b'];
  return cls.has('c-toasts-high') ? 'top' : 'bottom';
}

test('a phone\'s toasts stand in the half of the screen away from the last touch, so one never covers what was tapped', () => {
  assert.equal(toastSpot({ phone: true, touchY: 700 }), 'top', 'a button low on the list: the toast at the top');
  assert.equal(toastSpot({ phone: true, touchY: 200 }), 'bottom', 'a button high on the list: over the add line, as before');
  assert.equal(toastSpot({ phoneDay: true, touchY: 600 }), 'top', 'a block low on the phone\'s desk: under its bar');
  assert.equal(toastSpot({ phone: true, focusY: 760 }), 'top', 'no touch: what has focus says where');
  assert.equal(toastSpot({ phone: true }), 'bottom', 'nothing touched or focused: their usual place');
  assert.equal(toastSpot({ touchY: 700 }), 'bottom', 'the desk on a computer keeps its own places');
});

test('over the phone\'s sheet a toast stands in a room the sheet makes for it, never over the sheet\'s own buttons (V11-3, the design review\'s first finding)', () => {
  // a sheet from y 300 to the bottom (844), its footer's top at 720, a toast 60 tall: the room opens at the footer's
  // top, 60 tall, and the toast stands on it, wherever the touch was
  for (const touchY of [400, 690, 780]) assert.equal(toastSpot({ phone: true, touchY, toastH: 60, sheet: { top: 300, foot: 720 } }), 'sheet bottom 64px', 'touch at ' + touchY + ': on the room (844 - 720 - 60)');
  assert.equal(toastSpot({ phone: true, touchY: 600, toastH: 60, sheet: { top: 300, foot: null } }), 'sheet bottom 8px', 'a sheet with no footer: the room pinned to its foot, 8 above its bottom edge');
  assert.equal(toastSpot({ phoneDay: true, touchY: 300, toastH: 60, sheet: { top: 420, foot: 760 } }), 'sheet bottom 24px', 'the phone\'s own day: the same, over its shorter sheet');
  assert.equal(toastSpot({ phone: true, touchY: 400, sheet: { top: 300, foot: 720 } }), 'sheet bottom 8px', 'nothing showing yet: 8 above the bottom edge until the toast is there and the room opens');
});
