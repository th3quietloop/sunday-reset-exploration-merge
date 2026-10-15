// V11, round three (frame): where a panel opened from a reset step stands, and where its toasts go so
// they never land on it (placePanelToasts and the math it asks: asideBox, toastSpot); the step bar's
// marks kept apart per preview (markKey); a pinch out that a pinch in takes back (the pinch trail); the
// panel's fade only when something is below (sideFade); hidden chrome keeping its room (chromeEdges); and
// the Undo on a block taken off a day (offToast's words). The functions are cut out of board/src/app.js
// and variants/corners11/variant.js whole and run on a few plain objects standing in for the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, variant, plain } from './v11-rig.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* == a page small enough to measure: the toasts, the panel, the reset's own panel, and the body's classes == */
function page(o) {
  const vh = o.vh, cls = new Set(o.cls || []);
  const zoom = o.zoom || 1;
  const toasts = {
    id: 'toasts', vars: {}, children: Array.from({ length: o.toasts || 0 }), _zoom: zoom,
    style: { setProperty(k, v) { toasts.vars[k] = v; } },
    getBoundingClientRect() {
      // a stack of toasts stands on its foot: the bottom it was given, drawn at its zoom
      const foot = parseFloat(toasts.vars['--toast-bottom'] || '16') * zoom, h = toasts.children.length ? o.stack : 0;
      return { top: vh - foot - h, bottom: vh - foot, height: h };
    }
  };
  const s = o.side;
  const side = {
    id: 'side', hidden: !s, _zoom: zoom, fades: 0,
    style: { maxHeight: o.base || '' },
    getBoundingClientRect: () => ({ left: s.left, right: s.right, top: s.top, bottom: s.bottom || vh - 12, width: s.right - s.left })
  };
  const r = o.rack;
  const rack = { id: 'rack', offsetParent: r ? {} : null, dataset: { edge: r ? r.edge : '' }, _vis: r && r.vis, getBoundingClientRect: () => ({ left: 16, right: r ? r.right : 0, top: 0, bottom: vh }) };
  const els = { toasts, side, rack };
  const body = { classList: { contains: (c) => cls.has(c), toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } } };
  return { els, cls, body };
}

function toastRig(o) {
  const pg = page(o);
  const script = `
    const FEEL = true;
    const view = __view;
    const $ = (id) => __els[id];
    const document = { body: __body };
    const getComputedStyle = (x) => ({ zoom: String(x._zoom || 1), visibility: x._vis || 'visible' });
    const phoneDay = () => false;
    const safeEdges = () => __safe;
    function sideFade() { __els.side.fades++; }
    ${app('  const zoomOf = (x) =>')}
    ${app('  /* where a toast\'s foot sits', '  function layoutInsets() {')}
    ({ placePanelToasts, toastSpot, asideBox, toastFoot });`;
  const fns = runInNewContext(script, {
    __view: o.view || { reset: { step: 2 }, phone: false }, __els: pg.els, __body: pg.body, __safe: o.safe || { top: 0, bottom: 0 }
  });
  return Object.assign(fns, pg);
}

test('a phone: toasts sit under the panel, and the panel lifts over them only while they show', () => {
  const p = toastRig({ vh: 844, side: { left: 16, right: 374, top: 12 }, base: '820px', cls: ['c-resetting', 'c-sheet-aside'], toasts: 1, stack: 48 });
  p.placePanelToasts(true);
  const t = p.els.toasts.vars;
  assert.ok(p.cls.has('c-toasts-side'));
  assert.deepEqual([t['--toast-x'], t['--toast-room'], t['--toast-bottom']], ['195px', '358px', '16px'], 'the width of the panel, at the foot of the screen');
  // the toast stands from 780 to 828; the panel ends 8 above it
  assert.equal(p.els.side.style.maxHeight, (780 - 8 - 12) + 'px');
  // two toasts, then none: the panel follows them up and comes back down to the height it had
  p.els.toasts.children.push({});
  p.placePanelToasts(false);
  assert.equal(p.els.side.style.maxHeight, (844 - 16 - 48 - 8 - 12) + 'px', 'the stack is measured, not a fixed lane');
  p.els.toasts.children.length = 0;
  p.placePanelToasts(false);
  assert.equal(p.els.side.style.maxHeight, '820px');
});

test('no toast, no lane: a panel with nothing under it keeps its whole height', () => {
  const p = toastRig({ vh: 540, side: { left: 16, right: 374, top: 12 }, base: '516px', cls: ['c-sheet-aside'], toasts: 0, stack: 0 });
  p.placePanelToasts(true);
  assert.equal(p.els.side.style.maxHeight, '516px');
  assert.equal(p.els.side.fades, 0);
});

test('a short phone still puts a toast under the panel, never on its close at the top', () => {
  const p = toastRig({ vh: 540, side: { left: 16, right: 374, top: 12 }, base: '516px', cls: ['c-sheet-aside'], toasts: 1, stack: 48 });
  p.placePanelToasts(true);
  assert.equal(p.els.toasts.vars['--toast-bottom'], '16px');
  assert.equal(p.els.side.style.maxHeight, (540 - 16 - 48 - 8 - 12) + 'px');
});

test('safe edges: the panel starts under the status bar and the toasts stand over the home bar', () => {
  const safe = { top: 59, bottom: 34 };
  const p = toastRig({ vh: 852, side: { left: 16, right: 377, top: 67 }, base: '743px', cls: ['c-sheet-aside'], toasts: 1, stack: 66, safe });
  assert.deepEqual(plain(p.asideBox({ vh: 852, safe })), { top: 67, max: 852 - 67 - 42 });
  assert.equal(p.toastFoot(safe), 42);
  p.placePanelToasts(true);
  assert.equal(p.els.toasts.vars['--toast-bottom'], '42px');
  assert.equal(p.els.side.style.maxHeight, (852 - 42 - 66 - 8 - 67) + 'px');
  // with no safe edges, the old 12 and 16
  assert.deepEqual(plain(p.asideBox({ vh: 844, safe: { top: 0, bottom: 0 } })), { top: 12, max: 820 });
});

test('Bigger text: what is set on a zoomed panel or toast is divided by its zoom, so it lands where it was measured', () => {
  const p = toastRig({ vh: 844, zoom: 1.14, side: { left: 18, right: 372, top: 13 }, base: '719px', cls: ['c-sheet-aside'], toasts: 1, stack: 55 });
  p.placePanelToasts(true);
  const t = p.els.toasts.vars;
  assert.deepEqual([t['--toast-x'], t['--toast-room'], t['--toast-bottom']], [Math.round(195 / 1.14) + 'px', Math.round(354 / 1.14) + 'px', Math.round(16 / 1.14) + 'px']);
  // the stack's top is measured on the screen; the panel's height is set in its own zoomed px
  const foot = Math.round(16 / 1.14) * 1.14, top = 844 - foot - 55;
  assert.equal(p.els.side.style.maxHeight, Math.round((top - 8 - 13) / 1.14) + 'px');
});

test('a tablet standing up: toasts in the middle of the room left of the panel, at the foot, and the panel stays', () => {
  const p = toastRig({ vh: 1180, side: { left: 388, right: 808, top: 12 }, base: '1156px', cls: ['c-sheet-aside'], toasts: 2, stack: 102 });
  p.placePanelToasts(true);
  const t = p.els.toasts.vars;
  assert.deepEqual([t['--toast-x'], t['--toast-room'], t['--toast-bottom']], ['194px', '356px', '16px']);
  assert.equal(p.els.side.style.maxHeight, '1156px', 'nothing under it, so it never lifts');
});

test('a window with the reset on the left and a panel on the right: toasts between them, where they were', () => {
  const p = toastRig({ vh: 900, side: { left: 1044, right: 1424, top: 76 }, base: '800px', rack: { edge: 'left', right: 456 }, cls: ['c-resetting'], toasts: 1, stack: 48 });
  p.placePanelToasts(true);
  const t = p.els.toasts.vars;
  assert.deepEqual([t['--toast-x'], t['--toast-room']], ['750px', '556px']);
  assert.equal(t['--toast-bottom'], undefined, 'the bottom layoutInsets gave stays');
  // the reset's panel folded away (a to-do's panel): the room starts at the edge
  const q = toastRig({ vh: 768, side: { left: 628, right: 1008, top: 76 }, rack: { edge: 'left', right: 412 }, cls: ['c-resetting', 'c-panel-off'], toasts: 1, stack: 48 });
  q.placePanelToasts(true);
  assert.deepEqual([q.els.toasts.vars['--toast-x'], q.els.toasts.vars['--toast-room']], ['314px', '596px']);
});

test('too little room beside the panel for two lines: under it, and the panel lifts', () => {
  assert.equal(toastRig({ vh: 700 }).toastSpot({ side: { left: 504, right: 884 }, from: 396, sheet: false, safe: { top: 0, bottom: 0 } }).mode, 'under');
  assert.equal(toastRig({ vh: 700 }).toastSpot({ side: { left: 312, right: 732 }, from: 0, sheet: true, safe: { top: 0, bottom: 0 } }).mode, 'under', 'a small tablet');
  assert.equal(toastRig({ vh: 700 }).toastSpot({ side: { left: 388, right: 808 }, from: 0, sheet: true, safe: { top: 0, bottom: 0 } }).mode, 'beside');
  const p = toastRig({ vh: 700, side: { left: 504, right: 884, top: 76, bottom: 690 }, base: '614px', rack: { edge: 'left', right: 396 }, cls: ['c-resetting'], toasts: 1, stack: 67 });
  p.placePanelToasts(true);
  assert.deepEqual([p.els.toasts.vars['--toast-x'], p.els.toasts.vars['--toast-room'], p.els.toasts.vars['--toast-bottom']], ['694px', '380px', '16px']);
  assert.equal(p.els.side.style.maxHeight, (700 - 16 - 67 - 8 - 76) + 'px');
});

test('outside the reset, the place panel, the meal board, and a block\'s own mat keep their toasts where they were', () => {
  for (const o of [{ view: { reset: null, phone: false } }, { cls: ['c-sheet-aside', 'c-sheet-place'] }, { cls: ['c-toasts-top'] }, { cls: ['c-detail'] }, { view: { reset: { step: 1 }, phone: true } }]) {
    const p = toastRig(Object.assign({ vh: 844, side: { left: 16, right: 374, top: 12 }, base: '820px', toasts: 1, stack: 48 }, o, { cls: (o.cls || []).concat('c-toasts-side') }));
    p.placePanelToasts(true);
    assert.ok(!p.cls.has('c-toasts-side'), JSON.stringify(o));
    assert.deepEqual(p.els.toasts.vars, {});
    assert.equal(p.els.side.style.maxHeight, '820px');
  }
  // a panel lifted while the reset ran comes back down when its toast leaves after the reset ended
  const view = { reset: { step: 2 }, phone: false };
  const p = toastRig({ vh: 844, view, side: { left: 16, right: 374, top: 12 }, base: '820px', cls: ['c-sheet-aside'], toasts: 1, stack: 48 });
  p.placePanelToasts(true);
  assert.notEqual(p.els.side.style.maxHeight, '820px');
  view.reset = null;
  p.placePanelToasts(false);
  assert.equal(p.els.side.style.maxHeight, '820px');
});

/* == the step bar's marks: kept per board and per opening of a preview == */
test('the step bar\'s marks: a preview\'s are its own, and the last preview\'s are let go', () => {
  const script = `
    const SR = { view: { preview: null } }, marksMem = {};
    ${variant('    const markKey = (r) => {', '    function marksFor(r, steps) {')}
    ({ SR, marksMem, markKey });`;
  const x = runInNewContext(script, {});
  const r = { week: '2026-10-11', catchup: false };
  assert.equal(x.markKey(r), '2026-10-11');
  assert.equal(x.markKey({ week: '2026-10-11', catchup: true }), '2026-10-11:c');
  x.SR.view.preview = { id: 'heavy', open: 1 };
  const a = x.markKey(r);
  assert.equal(a, 'p:heavy:1:2026-10-11');
  x.marksMem[a] = { passed: ['ahead'], visited: [] };
  x.marksMem['2026-10-11'] = { passed: ['ahead', 'yours'], visited: [] };
  // another scenario, or the same one opened again, starts with no marks; the real board keeps its own
  x.SR.view.preview = { id: 'light', open: 2 };
  assert.equal(x.markKey(r), 'p:light:2:2026-10-11');
  assert.deepEqual(Object.keys(x.marksMem), ['2026-10-11']);
});

/* == a pinch out that a pinch in takes back == */
function pinchRig(start) {
  const script = `
    const FEEL = true, window = {}, ZOOMS = ['day', 'week', 'month', 'year'];
    const today = '2026-10-14';
    const view = __start;
    const inToday = () => !!view.today;
    function setMode(m) { view.today = m === 'today'; }
    function setZoom(z, f) { view.zoom = z; if (f) view.focus = f; }
    function zoomStep(dir) { const i = ZOOMS.indexOf(view.zoom) + dir; if (i >= 0 && i < ZOOMS.length) view.zoom = ZOOMS[i]; }
    function render() {}
    ${app('  let pinchTrail = [];', '  stage.addEventListener(\'wheel\'')}
    ({ view, levelGesture, levelBack, pinchBack, setZoom });`;
  return runInNewContext(script, { __start: start });
}

test('pinching in at the fit of a level a pinch out opened goes back to where it came from', () => {
  const p = pinchRig({ zoom: 'week', focus: '2026-10-21', today: false });
  assert.equal(p.pinchBack(), false, 'nothing opened by a pinch yet: pinching in never changes the level');
  p.levelGesture(1);
  assert.equal(p.view.zoom, 'month');
  assert.equal(p.pinchBack(), true);
  p.levelGesture(1);
  assert.equal(p.view.zoom, 'year');
  p.levelBack();
  assert.deepEqual([p.view.zoom, p.view.focus], ['month', '2026-10-21']);
  p.levelBack();
  assert.deepEqual([p.view.zoom, p.view.focus], ['week', '2026-10-21'], 'back to the same week');
  assert.equal(p.pinchBack(), false);
});

test('Now opens the week with a pinch out, and a pinch in at the week goes back to Now', () => {
  const p = pinchRig({ zoom: 'day', focus: '2026-10-14', today: true });
  p.levelGesture(-1);
  assert.equal(p.view.today, true, 'pinching in on Now changes nothing');
  p.levelGesture(1);
  assert.deepEqual([p.view.today, p.view.zoom], [false, 'week']);
  assert.equal(p.pinchBack(), true);
  p.levelBack();
  assert.equal(p.view.today, true);
});

test('a level reached any other way, or moved along, is off the trail', () => {
  const p = pinchRig({ zoom: 'week', focus: '2026-10-14', today: false });
  p.levelGesture(1);
  p.setZoom('month', '2026-11-01');
  assert.equal(p.pinchBack(), false, 'the month moved on with the arrows: a pinch in stays put');
  p.levelGesture(1);
  p.setZoom('day', '2026-11-03');
  assert.equal(p.pinchBack(), false, 'a day opened by a tap');
});

/* == the panel's fade, only when something is below == */
test('the panel\'s bottom fade shows only while there is more to scroll to', () => {
  /* (each class kept apart: V11 also marks whether the panel has scrolled, for the phone sheet's header) */
  const side = { scrollHeight: 400, scrollTop: 0, clientHeight: 400, more: null, scrolled: null, classList: { toggle(c, on) { side[c] = on; } } };
  const { sideFade } = runInNewContext(`const FEEL = true; const $ = () => __side; ${app('  function sideFade() {')} ({ sideFade });`, { __side: side });
  sideFade();
  assert.equal(side.more, false, 'everything fits: its last button stays bright');
  assert.equal(side.scrolled, false);
  side.scrollHeight = 900;
  sideFade();
  assert.equal(side.more, true);
  side.scrollTop = 500;
  sideFade();
  assert.equal(side.more, false, 'scrolled to the end');
  assert.equal(side.scrolled, true, 'the words have gone under the phone sheet\'s header: its hairline shows');
});

/* the phone's sheet (docs/PHONE-REDESIGN.md, 5.1): no fade at all; its foot, and the footer pinned there, are solid */
test('on a phone the sheet never fades: it and its footer are solid, down to the bottom edge', () => {
  const css = readFileSync(join(root, 'variants', 'corners11', 'css', 'sheet.css'), 'utf8');
  const rule = (sel) => { const i = css.indexOf(sel + ' {'); assert.ok(i >= 0, 'no rule for ' + sel); return css.slice(i, css.indexOf('}', i)); };
  const sheet = rule('body.feel.phone #side, body.feel.phone-desk #side');
  assert.match(sheet, /mask-image: none !important/, 'no see-through fade at the sheet\'s foot');
  assert.match(sheet, /background: var\(--sf-sheet\) !important/);
  assert.match(sheet, /bottom: 0;/, 'attached to the bottom edge');
  const tok = css.match(/--sf-sheet: (#[0-9A-Fa-f]+);/);
  assert.ok(tok && tok[1].length === 7, 'the sheet\'s color is solid (no alpha)');
  const foot = rule('body.feel.phone #side .c-sfoot, body.feel.phone-desk #side .c-sfoot,\nbody.feel.phone #side .place-foot, body.feel.phone-desk #side .place-foot,\nbody.feel.phone #side .c-gl-foot, body.feel.phone-desk #side .c-gl-foot');
  assert.match(foot, /background: var\(--sf-sheet\)/, 'the footer is the sheet\'s own solid color');
  assert.match(foot, /position: sticky; bottom: 0;/, 'pinned at the bottom edge');
  assert.match(foot, /env\(safe-area-inset-bottom/, 'with the safe area under it');
});

/* == hidden chrome keeps its room, except the place panel's == */
test('chrome hidden for a moment keeps its room, so the week never moves for it; the place panel\'s sheet doesn\'t', () => {
  const edge = (k, r, vis) => ({ hidden: false, offsetParent: {}, dataset: { edge: k }, _vis: vis, getBoundingClientRect: () => Object.assign({ width: r.right - r.left, height: r.bottom - r.top }, r) });
  const els = [edge('bottom', { left: 12, right: 808, top: 548, bottom: 1168 }, 'hidden'), edge('top', { left: 200, right: 620, top: 12, bottom: 60 }, 'hidden')];
  const run = (cls) => runInNewContext(`
    const FEEL = true, window = { innerWidth: 820, innerHeight: 1180 };
    const document = { querySelectorAll: () => __els, body: { classList: { contains: (c) => __cls.includes(c) } } };
    const getComputedStyle = (x) => ({ visibility: x._vis || 'visible' });
    ${app('  function chromeEdges() {', '  /* == V11: a panel and its toasts during the reset ==')}
    chromeEdges();`, { __els: els, __cls: cls });
  const aside = run(['c-sheet-aside']);
  assert.deepEqual([aside.top, aside.bottom], [60, 1180 - 548], 'a to-do\'s panel over the sheet: the week stays framed above the sheet');
  const kit = run(['k-sheet-open']);
  assert.deepEqual([kit.top, kit.bottom], [60, 632], 'a sheet of the version\'s own hiding the rack');
  const place = run(['c-sheet-aside', 'c-sheet-place']);
  assert.deepEqual([place.top, place.bottom], [0, 0], 'the place panel: the week fits above it');
});

/* == a block taken off a day says so with its own Undo, and the Undo says it's back == */
test('Undo after a block comes off a day, or a kind of day is removed, says what is true again', () => {
  const { undoWords } = runInNewContext(`${app('  const UNDO_FLIPS = [', '  function staleActs() {')} ({ undoWords });`, {});
  assert.equal(undoWords('Walk is off Saturday.'), 'Walk is back on Saturday.');
  assert.equal(undoWords('Date night is off Wednesday. Undo brings it back.'), 'Date night is back on Wednesday.');
  assert.equal(undoWords('Busy Monday is gone.'), 'Busy Monday is back.');
  assert.equal(undoWords('Laundry is off your list.'), 'Laundry is back on your list.', 'the flips before it still win');
  const src = app('  const offToast = (text) =>');
  assert.match(src, /FEEL \? toast\(text \+ '\.', '', \{ label: 'Undo', fn: undo \}\)/, 'V11 gives the toast its own Undo');
});
