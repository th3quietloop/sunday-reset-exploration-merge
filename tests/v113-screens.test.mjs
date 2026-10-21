// V11-3 (Oct 20, the design review of V11-2): screen sizes, the desk, setup, meals, settings, and small copy.
// The rules are cut out of board/src/app.js, board/src/scene.js, and variants/corners11/variant.js by the comments
// that start them, as tests/phone-first.test.mjs does, and run on stand-ins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { app, variant, M, D, plain } from './v11-rig.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

/* 28: the meal board's rows, until this device picks its own: Dinner, and Breakfast or Lunch only where the board has them */
function rows(board, stored) {
  const script = `
    const SR = { state: __board };
    const MEAL_ROWS = 'rows';
    const localStorage = { getItem: () => __stored };
    const MEAL_KINDS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']];
    ${variant('    /* (V11-3, design review 28: until this device picks its rows', '    const mealDayWords = ')}
    mealRows();`;
  return plain(runInNewContext(script, { __board: board, __stored: stored == null ? null : JSON.stringify(stored) }));
}

test('the meal board shows Dinner, and Breakfast or Lunch only where the board has them (design review 28)', () => {
  const sample = D.sampleState('2026-10-20');
  assert.deepEqual(rows(sample), ['breakfast', 'dinner'], 'the sample has a Breakfast block on the weekend, and no lunch');
  const bare = JSON.parse(JSON.stringify(sample));
  Object.values(bare.rhythm.days).forEach((d) => { d.blocks = d.blocks.filter((b) => !/breakfast|lunch/i.test(b.id + ' ' + b.name)); });
  assert.deepEqual(rows(bare), ['dinner'], 'no breakfast or lunch anywhere: dinner alone, no fourteen empty Add cells');
  bare.meals = { '2026-10-21': { lunch: { name: 'Soup' } } };
  assert.deepEqual(rows(bare), ['lunch', 'dinner'], 'a lunch planned on a day brings its row');
  assert.deepEqual(rows(bare, ['breakfast', 'lunch', 'dinner']), ['breakfast', 'lunch', 'dinner'], 'what this device picked wins');
});

/* 38: open time's "Tap to add something" teaches on the day this device first showed it, to a mouse only */
function tip(stored, today, preview) {
  const map = new Map(stored ? [['sundayreset.v113.openTip', stored]] : []);
  const script = `
    let today = __today; const view = { preview: __preview };
    ${app('  /* V11-3 (design review 38): open time', '  function hover(e) {')}
    ({ openTipOk, setToday: (d) => { today = d; } });`;
  const fns = runInNewContext(script, { __today: today, __preview: preview || null, localStorage: { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v) } });
  return Object.assign(fns, { map });
}

test('open time\'s tip shows to a mouse on the first day only, never to a finger (design review 38)', () => {
  const t = tip(null, '2026-10-20');
  assert.equal(t.openTipOk({ pointerType: 'touch' }), false, 'a finger never hovers, so the tip never shows unasked on an iPad');
  assert.equal(t.openTipOk({ pointerType: 'pen' }), false);
  assert.equal(t.openTipOk({ pointerType: 'mouse' }), true, 'the first visit');
  assert.equal(t.map.get('sundayreset.v113.openTip'), '2026-10-20', 'kept on the device');
  assert.equal(t.openTipOk({ pointerType: 'mouse' }), true, 'all that day');
  assert.equal(tip('2026-10-20', '2026-10-21').openTipOk({ pointerType: 'mouse' }), false, 'a later day: it has taught already');
  const pv = tip(null, '2026-10-20', { id: 'sample' });
  assert.equal(pv.openTipOk({ pointerType: 'mouse' }), true);
  assert.equal(pv.map.size, 0, 'a made up board keeps nothing on the device');
});

/* 55: the bottom bar keeps To-dos and Block library in Month and Year (each takes you to the week, toBoard) */
function bar(view, now) {
  const script = `
    const SR = { view: __view, inToday: () => __now, layoutInsets() {} };
    const M = { DAY_LONG: [] };
    const document = { getElementById: () => null, body: { classList: { toggle() {} } } };
    const requestAnimationFrame = () => 0;
    const mk = () => ({ hidden: false, setAttribute() {} });
    const lib = mk(), todos = mk(), br = mk(), undoP = mk(), redoP = mk(), add = mk(), rchip = mk(), gs = mk(), spreadBar = mk(), spreadLong = {}, spreadSave = mk();
    const spreadOn = () => false;
    let brWas = null;
    ${variant('    function onScreen() {', '    /* Today\'s band and dock make room')}
    onScreen();
    ({ lib: lib.hidden, todos: todos.hidden });`;
  return plain(runInNewContext(script, { __view: view, __now: !!now }));
}

test('Month and Year keep To-dos and Block library on the bar (design review 55)', () => {
  for (const zoom of ['day', 'week', 'month', 'year']) assert.deepEqual(bar({ zoom }), { lib: false, todos: false }, zoom);
  assert.deepEqual(bar({ zoom: 'day' }, true), { lib: true, todos: false }, 'Now keeps To-dos only, as before');
});

/* 6: on a shallow day board (the Duo folded), a block's name may stand taller in its face before it gives way to its mark */
test('a block gives way to its mark only after its name had the room to stand taller (design review 6)', () => {
  const scene = read('../board/src/scene.js');
  const at = scene.indexOf('V11-3 (design review 6)');
  assert.ok(at > 0, 'scene.js keeps the fallback');
  const part = scene.slice(at, scene.indexOf('if (!cand.length) {', at));
  assert.match(part, /k: 'icon1', s: at\(sizeFor\(g, label, iconRoom, H \* 0\.46\)\)/, 'beside its mark, up to 0.46 of the depth');
  assert.match(part, /k: 'text1', s: at\(sizeFor\(g, label, W - 2 \* pad, H \* 0\.5\)\)/, 'alone, up to half the depth');
  assert.match(part, /k: 'wrap'/, 'or on two lines');
  assert.match(part, /cand\[i\]\.s < minS/, 'still never under the floor');
  assert.match(part, /minS \* 1\.25/, 'and never shouting: at the floor or a little over');
});

/* 30: nothing on the desk throws its shadow onto a board */
test('a desk thing whose shadow would reach the boards casts none there (design review 30)', () => {
  const scene = read('../board/src/scene.js');
  const fn = scene.slice(scene.indexOf('  function propShadows() {'), scene.indexOf('  function step(dt) {'));
  assert.ok(fn.length > 100);
  assert.match(fn, /me\.castShadow = !\(x1 > zone\.x0 && x0 < zone\.x1 && z1 > zone\.z0 && z0 < zone\.z1\)/);
  assert.match(scene, /stepProps\(dt\);\n    propShadows\(\);/, 'worked out every frame, when something moved');
});

/* 47: Settings lists the same pages on the desk and the phone */
test('Goals is in Settings on the desk too, and section names are in sentence case (design review 47)', () => {
  const src = read('../board/src/app.js');
  assert.match(src, /\/\* \(V11-3, design review 47: on the desk too[^\n]*\n\s*if \(FEEL && gn === 'Your week'\) \{/);
  const css = read('../variants/corners11/css/zz-screens.css');
  assert.match(css, /body\.feel \.set-gh \{ text-transform: none; letter-spacing: 0; \}/);
});
