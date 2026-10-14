// V11: breakfasts and lunches an older build kept on this device (localStorage 'sundayreset.v7.meals',
// V7 to V10) move onto the board with V11's first meal change (moveOldMeals and commitMeals in
// variants/corners11/variant.js). Undo after that change takes back the change, never the move; the
// device keeps its copy, so an older build still shows them; and only what an older build adds or
// changes after a move moves again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { variant, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const OLD = 'sundayreset.v7.meals', MOVED = 'sundayreset.v7.meals.moved';
const SEED = { '2026-10-15': { breakfast: 'Waffles', lunch: 'Ramen' }, '2026-10-16': { breakfast: 'Bagels' } };

/* a device's storage, kept as text the way a browser keeps it */
function storage(init) {
  const m = new Map(Object.entries(init || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), read: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null) };
}

/* the meal board as it loads on a device: its storage, a board, and the app's commit and undo (a
   change that says no leaves the board as it was; one that goes through is saved) */
function load(board, store, preview) {
  const saved = { board: null };
  const parts = [
    variant('    const MEAL_KINDS = [', '    /* every meal change goes through the board\'s commit'),
    variant('    /* every meal change goes through the board\'s commit', '    const dinnerOf = (d) =>'),
    variant('    const dinnerOf = (d) =>', '    /* a night with no Dinner block gets one')
  ];
  const script = `
    let state = __board;
    const undoStack = [];
    const SR = {
      get state() { return state; }, view: { preview: __preview }, today: __today, M,
      day: (d) => M.calendarDay(state, d),
      commit(fn) {
        const snap = JSON.stringify(state);
        let r;
        try { r = fn(); } catch (e) { r = false; }
        if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; }
        undoStack.push(snap); __saved.board = JSON.stringify(state);
        return r;
      },
      undo() { const s = undoStack.pop(); if (s) { state = JSON.parse(s); __saved.board = JSON.stringify(state); } }
    };
    const Kit = { renders: [] };
    ${parts.join('\n')}
    ({ SR, mealAt, putMeal, commitMeals });`;
  const r = runInNewContext(script, { M, localStorage: store, window: {}, __board: board, __preview: !!preview, __today: today, __saved: saved, console });
  r.saved = () => (saved.board ? JSON.parse(saved.board) : null);
  return r;
}
const names = (r, cells) => cells.map(([d, k]) => (r.mealAt(d, k) || {}).name || '');
const CELLS = [['2026-10-15', 'breakfast'], ['2026-10-15', 'lunch'], ['2026-10-16', 'breakfast']];

test('the device’s meals show before anything moves, and the board isn’t written for it', () => {
  const store = storage({ [OLD]: SEED }), r = load(D.sampleState(today), store);
  assert.deepEqual(names(r, CELLS), ['Waffles', 'Ramen', 'Bagels']);
  assert.equal(r.SR.state.meals, undefined, 'nothing moved yet');
  assert.equal(r.saved(), null);
});

test('Undo after the first meal change takes back the change, and the moved meals stay', () => {
  const store = storage({ [OLD]: SEED }), r = load(D.sampleState(today), store);
  const before = plain(r.SR.state.dinners['2026-10-16']);
  r.commitMeals((st) => r.putMeal(st, '2026-10-16', 'dinner', { name: 'Pizza night', how: 'home' }));
  assert.equal(r.SR.state.dinners['2026-10-16'].name, 'Pizza night');
  assert.deepEqual(names(r, CELLS), ['Waffles', 'Ramen', 'Bagels']);
  r.SR.undo();
  assert.deepEqual(plain(r.SR.state.dinners['2026-10-16']), before, 'the dinner is taken back');
  assert.deepEqual(plain(r.SR.state.meals), { '2026-10-15': { breakfast: { name: 'Waffles' }, lunch: { name: 'Ramen' } }, '2026-10-16': { breakfast: { name: 'Bagels' } } }, 'the move is not');
  assert.deepEqual(names(r, CELLS), ['Waffles', 'Ramen', 'Bagels']);
  assert.deepEqual(r.saved().meals, plain(r.SR.state.meals), 'and the saved board has them');
  // the device keeps its own copy for older builds, and a note of what moved
  assert.deepEqual(store.read(OLD), SEED);
  assert.deepEqual(store.read(MOVED), SEED);
});

test('after a reload nothing moves twice, and a meal cleared on the board stays cleared', () => {
  const store = storage({ [OLD]: SEED }), r = load(D.sampleState(today), store);
  r.commitMeals((st) => r.putMeal(st, '2026-10-15', 'breakfast', null));
  assert.deepEqual(names(r, CELLS), ['', 'Ramen', 'Bagels']);
  const again = load(r.saved(), store);
  assert.deepEqual(names(again, CELLS), ['', 'Ramen', 'Bagels'], 'Waffles stays off');
  again.commitMeals((st) => again.putMeal(st, '2026-10-17', 'lunch', { name: 'Soup', how: 'home' }));
  assert.deepEqual(plain(again.SR.state.meals['2026-10-15']), { lunch: { name: 'Ramen' } });
});

test('a change that doesn’t go through moves nothing for good, and the next one moves them', () => {
  const store = storage({ [OLD]: SEED }), r = load(D.sampleState(today), store);
  assert.equal(r.commitMeals(() => false), false);
  assert.equal(store.read(MOVED), null, 'not noted as moved');
  assert.equal(r.saved(), null);
  assert.deepEqual(names(r, CELLS), ['Waffles', 'Ramen', 'Bagels']);
  r.commitMeals((st) => r.putMeal(st, '2026-10-17', 'lunch', { name: 'Soup', how: 'home' }));
  assert.equal(r.saved().meals['2026-10-16'].breakfast.name, 'Bagels');
});

test('what an older build adds or changes after the move moves too, unless V11 changed that meal', () => {
  const store = storage({ [OLD]: SEED }), r = load(D.sampleState(today), store);
  r.commitMeals((st) => r.putMeal(st, '2026-10-16', 'breakfast', { name: 'Pancakes', how: 'home' }));
  // then V10, on this device, changes Thursday's lunch and Friday's breakfast and adds Saturday's
  store.setItem(OLD, JSON.stringify({ '2026-10-15': { breakfast: 'Waffles', lunch: 'Pho' }, '2026-10-16': { breakfast: 'Granola' }, '2026-10-17': { lunch: 'Tacos' } }));
  const again = load(r.saved(), store);
  const cells = CELLS.concat([['2026-10-17', 'lunch']]);
  assert.deepEqual(names(again, cells), ['Waffles', 'Pho', 'Pancakes', 'Tacos'], 'Friday was changed here, so it stays Pancakes');
  again.commitMeals((st) => again.putMeal(st, '2026-10-18', 'lunch', { name: 'Soup', how: 'home' }));
  assert.deepEqual(names(again, cells), ['Waffles', 'Pho', 'Pancakes', 'Tacos']);
  assert.equal(again.saved().meals['2026-10-17'].lunch.name, 'Tacos');
});

test('a preview never moves them, never shows them, and never notes a move', () => {
  const store = storage({ [OLD]: SEED }), r = load(D.sampleState(today), store, true);
  assert.deepEqual(names(r, CELLS), ['', '', '']);
  r.commitMeals((st) => r.putMeal(st, '2026-10-17', 'lunch', { name: 'Soup', how: 'home' }));
  assert.equal(r.SR.state.meals['2026-10-15'], undefined);
  assert.equal(store.read(MOVED), null);
  assert.deepEqual(store.read(OLD), SEED);
});

test('no storage, or nothing kept on the device, is nothing to move', () => {
  const r = load(D.sampleState(today), storage());
  r.commitMeals((st) => r.putMeal(st, '2026-10-17', 'lunch', { name: 'Soup', how: 'home' }));
  assert.deepEqual(Object.keys(r.SR.state.meals), ['2026-10-17']);
  const off = { getItem() { throw new Error('storage off'); }, setItem() { throw new Error('storage off'); }, removeItem() { throw new Error('storage off'); } };
  const r2 = load(D.sampleState(today), off);
  assert.doesNotThrow(() => r2.commitMeals((st) => r2.putMeal(st, '2026-10-17', 'lunch', { name: 'Soup', how: 'home' })));
  assert.equal(r2.SR.state.meals['2026-10-17'].lunch.name, 'Soup');
});
