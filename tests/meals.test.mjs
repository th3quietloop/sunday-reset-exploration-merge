// V11: the meal board. A meal's parts ("sweet potatoes, scrambled eggs, toast"), each part as it goes
// on the grocery list, what a home leaves out, breakfast and lunch on the list beside dinner
// (Model.groceries with state.meals), and how many of a week's meals are planned. Cut out of
// variants/corners11/variant.js and run on the sample family's week.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, mealRig, srOf, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const ws = M.weekStart(today);
const rig = (st) => { const r = appRig(st || D.sampleState(today), today, 600); return { r, SR: srOf(r), ml: mealRig(srOf(r)) }; };
const { ml } = rig();

test('a meal’s parts: commas and a last "and" split it, a dish named with "and" stays whole', () => {
  assert.deepEqual(plain(ml.partsOf('sweet potatoes, scrambled eggs, toast, and beef sausage')), ['Sweet potatoes', 'Scrambled eggs', 'Toast', 'Beef sausage']);
  assert.deepEqual(plain(ml.partsOf('mac and cheese')), [], 'one dish, no parts');
  assert.deepEqual(plain(ml.partsOf('Tacos')), []);
  assert.deepEqual(plain(ml.partsOf('salad, mac and cheese')), ['Salad', 'Mac and cheese'], 'the dish at the end stays whole');
  assert.deepEqual(plain(ml.partsOf('rice and beans, chicken')), ['Rice and beans', 'Chicken']);
  assert.deepEqual(plain(ml.partsOf('pasta + salad')), ['Pasta', 'Salad']);
  assert.deepEqual(plain(ml.partsOf('oatmeal, berries & honey')), ['Oatmeal', 'Berries', 'Honey']);
  assert.deepEqual(plain(ml.partsOf('')), []);
});

test('a part as it goes on the list: what you buy, never what’s left over', () => {
  assert.equal(ml.groceryName('scrambled eggs'), 'Eggs');
  assert.equal(ml.groceryName('toast'), 'Bread');
  assert.equal(ml.groceryName('Toasted bagels'), 'Bagels');
  assert.equal(ml.groceryName('fresh spinach'), 'Spinach');
  assert.equal(ml.groceryName('and some bacon'), 'Bacon');
  assert.equal(ml.groceryName('Beef sausage'), 'Beef sausage');
  for (const none of ['leftovers', 'Leftover chili', 'takeout', 'nothing', 'skip', '']) assert.equal(ml.groceryName(none), '', none);
});

test('what a home leaves out: a diet, a thing, or a word, with the usual exceptions', () => {
  const { SR, ml: m } = rig();
  const set = (book) => { SR.state.mealbook = book; };
  set({ diet: 'all', out: [] });
  assert.equal(m.leftOut('roast chicken'), null, 'nothing is left out until something is');
  // vegetarian, the way the meal board sets it: the diet and what it leaves out
  set({ diet: 'vegetarian', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'] });
  assert.equal(m.leftOut('Roast chicken, potatoes'), 'Chicken');
  assert.equal(m.leftOut('lamb curry'), 'Vegetarian', 'meat by any other name');
  assert.equal(m.leftOut('lentil soup'), null);
  assert.equal(m.leftOut('veggie sausage, eggs'), null, 'a veggie sausage isn’t pork');
  // one thing at a time
  set({ diet: 'all', out: ['dairy'] });
  assert.equal(m.leftOut('peanut butter toast'), null, 'peanut butter isn’t dairy');
  assert.equal(m.leftOut('oatmeal with almond milk'), null);
  assert.equal(m.leftOut('grilled cheese'), 'Dairy');
  assert.equal(m.leftOut('toast and butter'), 'Dairy');
  set({ diet: 'all', out: ['pork'] });
  assert.equal(m.leftOut('sweet potatoes, scrambled eggs, toast, and beef sausage'), null, 'beef sausage isn’t pork');
  assert.equal(m.leftOut('turkey sausage'), null);
  assert.equal(m.leftOut('sausage and eggs'), 'Pork');
  assert.equal(m.leftOut('bacon'), 'Pork');
  set({ diet: 'all', out: ['eggs'] });
  assert.equal(m.leftOut('eggplant parm'), null, 'an eggplant isn’t an egg');
  assert.equal(m.leftOut('scrambled eggs'), 'Eggs');
  set({ diet: 'vegan', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish', 'eggs', 'dairy'] });
  assert.equal(m.leftOut('yogurt and honey'), 'Dairy');
  assert.equal(m.leftOut('toast with honey'), 'Vegan');
  set({ diet: 'all', out: [], words: ['mushrooms'] });
  assert.equal(m.leftOut('mushroom risotto'), 'mushrooms', 'a word you added, in either number');
});

test('breakfast and lunch parts go on the grocery list with dinner, once each, with their days', () => {
  const { SR, ml: m } = rig();
  const st = SR.state;
  const parts = m.partsOf('sweet potatoes, scrambled eggs, toast, and beef sausage');
  m.putMeal(st, '2026-10-15', 'breakfast', { name: 'Sweet potatoes, scrambled eggs, toast, and beef sausage', parts, items: m.pantryIds(st, parts), how: 'home' });
  const lunch = m.partsOf('eggs, toast');
  m.putMeal(st, '2026-10-16', 'lunch', { name: 'Eggs, toast', parts: lunch, items: m.pantryIds(st, lunch), how: 'home' });
  const dates = M.range(ws, 7), list = plain(M.groceries(st, dates));
  const line = (name) => list.find((x) => x.name === name);
  assert.deepEqual(line('Eggs').days, ['2026-10-15', '2026-10-16'], 'one line for eggs, both days');
  assert.deepEqual(line('Bread').days, ['2026-10-15', '2026-10-16']);
  assert.ok(line('Sweet potatoes') || line('Sweet potato'), 'sweet potatoes, or the pantry’s own sweet potato');
  assert.ok(line('Beef sausage'));
  assert.ok(line('Chicken'), 'Thursday’s dinner is still on it');
  assert.equal(st.meals['2026-10-15'].breakfast.items.length, 4, 'four parts, four things to buy');
  // the same pantry thing is never added twice
  assert.equal(st.pantry.filter((p) => p.name === 'Eggs').length, 1);
  // a meal that isn't cooked puts nothing on the list
  m.putMeal(st, '2026-10-17', 'lunch', { name: 'Pizza place', how: 'out' });
  m.putMeal(st, '2026-10-17', 'breakfast', { name: '', how: 'leftovers' });
  assert.equal(plain(M.groceries(st, dates)).length, list.length);
  assert.equal(st.meals['2026-10-17'].lunch.how, 'out');
  // what the meal board shows for it: the same meal back
  assert.deepEqual(plain(m.mealAt('2026-10-17', 'lunch')), { name: 'Pizza place', parts: [], items: [], how: 'out', cook: '', recipe: null });
  // a meal saved as plain words, the old way, still reads, and buys nothing
  st.meals['2026-10-18'] = { breakfast: 'Cereal' };
  assert.equal(m.mealAt('2026-10-18', 'breakfast').name, 'Cereal');
  assert.doesNotThrow(() => M.groceries(st, M.range('2026-10-18', 7)));
  // clearing a meal takes it off the board, and the date with it when it was the last one
  m.putMeal(st, '2026-10-17', 'lunch', null);
  m.putMeal(st, '2026-10-17', 'breakfast', null);
  assert.equal(st.meals['2026-10-17'], undefined);
});

test('the grocery count says what’s on the list now', () => {
  const { r, SR, ml: m } = rig();
  const st = SR.state, dates = M.range(ws, 7);
  const before = M.groceryProgress(st, dates).total;
  const parts = ['Oats', 'Berries'];
  m.putMeal(st, '2026-10-15', 'breakfast', { name: 'Oats, berries', parts, items: m.pantryIds(st, parts), how: 'home' });
  const g = M.groceryProgress(st, dates);
  assert.equal(g.total, before + 2);
  assert.equal(r.grocerySub(dates), (before + 2) + ' things to get');
});

test('a week’s meals: from today on midweek, the whole week otherwise, and never a day away', () => {
  const { ml: m } = rig();
  const all = ['breakfast', 'lunch', 'dinner'];
  // Wednesday to Saturday: four days, three meals each; Wednesday’s leftovers and Thursday’s dinner are set
  assert.deepEqual(plain(m.mealCount(M.range(ws, 7), all)), { n: 2, of: 12, span: 'Wed to Sat' });
  assert.deepEqual(plain(m.mealCount(M.range('2026-10-04', 7), all)), { n: 0, of: 21, span: '' }, 'a week that’s over counts whole');
  // the week of the lake trip leaves Friday and Saturday out
  assert.deepEqual(plain(m.mealCount(M.range('2026-10-25', 7), all)), { n: 0, of: 15, span: '' });
  assert.deepEqual(plain(m.mealCount(M.range('2026-10-25', 7), ['dinner'])), { n: 0, of: 5, span: '' }, 'only the rows shown');
});

test('a skipped meal is decided, and isn’t counted as a meal planned', () => {
  const { SR, ml: m } = rig();
  const all = ['breakfast', 'lunch', 'dinner'];
  SR.state.dinners['2026-10-16'] = { name: '', cook: 'skip', items: [] };
  assert.equal(m.mealCount(M.range(ws, 7), all).n, 2);
  SR.state.dinners['2026-10-17'] = { name: 'Pizza', cook: 'order', items: [] };
  assert.equal(m.mealCount(M.range(ws, 7), all).n, 3, 'ordering in is a meal');
});
