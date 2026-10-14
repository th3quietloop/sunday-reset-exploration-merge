// V11: what a home leaves out (leftOut in variants/corners11/variant.js), past the cases that pass the
// easy way. A meal named for what it's made of instead (a veggie burger, black bean burgers, cauliflower
// steaks) is no meat; a dairy free or vegan cheese is no dairy, whatever follows it; honeydew isn't honey;
// and dairy by its other names (buttermilk, paneer, ghee, alfredo) is still dairy. Then a meal's parts
// and each part as it goes on the grocery list (partsOf, groceryName).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, mealRig, srOf, plain, D } from './v11-rig.mjs';

const today = '2026-10-14';
const MEATS = ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'];
function diet(book) {
  const r = appRig(D.sampleState(today), today, 600), ml = mealRig(srOf(r));
  r.state.mealbook = Object.assign({ own: [], hide: [], words: [] }, book);
  return ml;
}
const each = (ml, list, want) => list.forEach((meal) => assert.equal(ml.leftOut(meal), want, meal));

test('vegetarian: a meal named for what it’s made of instead is no meat', () => {
  const ml = diet({ diet: 'vegetarian', out: MEATS });
  each(ml, ['veggie burger', 'black bean burgers', 'impossible burger', 'beyond sausage', 'veggie meatballs', 'cauliflower steaks', 'meatless pasta', 'veggie hot dogs', 'tofu scramble, toast', 'lentil soup', 'plant based nuggets', 'mushroom burgers', 'portobello steak'], null);
});

test('vegetarian: meat is still meat, whatever else is on the plate', () => {
  const ml = diet({ diet: 'vegetarian', out: MEATS });
  assert.equal(ml.leftOut('burgers'), 'Beef');
  assert.equal(ml.leftOut('beef burgers'), 'Beef');
  assert.equal(ml.leftOut('turkey burger'), 'Turkey');
  assert.equal(ml.leftOut('lentils and chicken'), 'Chicken', 'and is two things');
  assert.equal(ml.leftOut('black bean chicken chili'), 'Chicken', 'beans beside chicken don’t make it a veggie chicken');
  assert.equal(ml.leftOut('veggie burger, bacon'), 'Pork', 'the veggie burger is one part; bacon is another');
  assert.equal(ml.leftOut('meatballs'), 'Beef');
  assert.equal(ml.leftOut('meat loaf'), 'Vegetarian');
  assert.equal(ml.leftOut('hot dogs'), 'Vegetarian');
  assert.equal(ml.leftOut('salmon steaks'), 'Fish');
  assert.equal(ml.leftOut('lamb curry'), 'Vegetarian');
});

test('one meat out: a burger or a steak of another meat isn’t that one', () => {
  const ml = diet({ diet: 'all', out: ['beef'] });
  each(ml, ['turkey burger', 'chicken burgers', 'salmon burger', 'tuna steak', 'beefsteak tomatoes', 'veggie burger'], null);
  assert.equal(ml.leftOut('steak and eggs'), 'Beef');
  assert.equal(ml.leftOut('hamburgers'), 'Beef');
  assert.equal(ml.leftOut('cheeseburger'), 'Beef');
  const pork = diet({ diet: 'all', out: ['pork'] });
  each(pork, ['turkey bacon', 'chicken sausage', 'beef hot dogs', 'veggie bacon', 'hamburger'], null);
  assert.equal(pork.leftOut('bacon'), 'Pork');
});

test('vegan: dairy free and vegan cheese are no dairy, whatever comes after', () => {
  const ml = diet({ diet: 'vegan', out: MEATS.concat(['eggs', 'dairy']) });
  each(ml, ['vegan cheese pizza', 'vegan butter toast', 'dairy free cheese', 'dairy-free ice cream', 'coconut cream curry', 'oat milk latte', 'honeydew melon', 'honeycrisp apples', 'vegan mac and cheese', 'plant based yogurt'], null);
  assert.equal(ml.leftOut('vegan pancakes, scrambled eggs'), 'Eggs', 'vegan names its own part, not the meal');
  assert.equal(ml.leftOut('toast with honey'), 'Vegan');
  assert.equal(ml.leftOut('honey-glazed carrots'), 'Vegan');
});

test('dairy by its other names is dairy', () => {
  const ml = diet({ diet: 'all', out: ['dairy'] });
  each(ml, ['buttermilk pancakes', 'palak paneer', 'rice with ghee', 'fettuccine alfredo', 'kefir', 'grilled halloumi', 'cheese pizza'], 'Dairy');
  each(ml, ['peanut butter toast', 'almond milk', 'butternut squash soup', 'apple butter'], null);
});

test('gluten free and nut free name their own part', () => {
  const g = diet({ diet: 'all', out: ['gluten'] });
  each(g, ['gluten free pasta', 'gluten-free bread', 'corn tortillas', 'rice noodles'], null);
  assert.equal(g.leftOut('gluten free pasta, garlic bread'), 'Gluten');
  const n = diet({ diet: 'all', out: ['nuts'] });
  each(n, ['nut free granola', 'coconut curry', 'butternut squash', 'nutmeg cookies'], null);
  assert.equal(n.leftOut('peanut noodles'), 'Nuts');
});

test('a meal’s parts: every comma part splits on its own “and”, a dish named with “and” stays whole', () => {
  const ml = diet({ diet: 'all', out: [] });
  assert.deepEqual(plain(ml.partsOf('sausage and eggs, toast')), ['Sausage', 'Eggs', 'Toast']);
  assert.deepEqual(plain(ml.partsOf('mac and cheese, salad')), ['Mac and cheese', 'Salad']);
  assert.deepEqual(plain(ml.partsOf('mac & cheese, salad')), ['Mac & cheese', 'Salad']);
  assert.deepEqual(plain(ml.partsOf('rice and beans, chicken and broccoli')), ['Rice and beans', 'Chicken', 'Broccoli']);
  assert.deepEqual(plain(ml.partsOf('sweet potatoes, scrambled eggs, toast, and beef sausage')), ['Sweet potatoes', 'Scrambled eggs', 'Toast', 'Beef sausage']);
  assert.deepEqual(plain(ml.partsOf('sausage and eggs')), [], 'one part with no commas is one dish');
});

test('a part as it goes on the list: no counts, and nothing that comes out of the tap', () => {
  const ml = diet({ diet: 'all', out: [] });
  assert.equal(ml.groceryName('2 eggs'), 'Eggs');
  assert.equal(ml.groceryName('3 slices of toast'), 'Bread');
  assert.equal(ml.groceryName('a cup of berries'), 'Berries');
  assert.equal(ml.groceryName('half an avocado'), 'Avocado');
  assert.equal(ml.groceryName('water'), '');
  assert.equal(ml.groceryName('a glass of water'), '');
  assert.equal(ml.groceryName('sparkling water'), 'Sparkling water', 'bought by the case');
  assert.equal(ml.groceryName('Coffee'), 'Coffee', 'bought too');
  assert.equal(ml.groceryName('7 layer dip'), '7 layer dip', 'a number that’s part of the name stays');
});
