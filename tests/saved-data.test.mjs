// V11: what the board saves. V11 added fields with Data.VERSION still 7 and no migrate step:
// profile.people, settings.move, settings.holidays, dinners[date].with, a dinner's cook as a person
// ('p:' and an id), ideas[].for and .who, state.meals, and state.mealbook. Each has to be additive (an
// old board loads without it, and code that doesn't know it leaves it alone), and two devices that
// each change one have to keep both changes when their boards merge (Model.mergeBoards).
// V11 goals (Oct 14) made it version 8: migrate adds state.goals and keeps all of the above as it was
// (tests/migration.test.mjs has the rest).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, mealRig, srOf, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14';
const ws = M.weekStart(today);
const copy = (v) => JSON.parse(JSON.stringify(v));

/* a board as V11 leaves it, with every new field in use */
function v11Board() {
  const st = D.sampleState(today);
  st.profile.people = [{ id: 'jm', name: 'Jamie', group: 'partner' }, { id: 'gm', name: 'Gran', group: 'family', home: true }];
  st.settings.move = { on: true, n: 3, unit: 'times' };
  st.settings.holidays = ['halloween'];
  st.dinners['2026-10-16'] = { name: 'Dinner out with friends', cook: 'out', items: [], with: { idea: 'fr-dinner', for: 'friends', how: 'out' } };
  st.dinners['2026-10-17'] = { name: 'Stew', cook: 'p:gm', items: [] };
  st.ideas.push({ id: 'i-ada', name: 'Pancakes', kind: '', dur: 45, icon: 'person', for: 'kids', who: 'Robin' });
  st.meals = { '2026-10-15': { breakfast: { name: 'Oatmeal', parts: ['Oats', 'Berries'], items: [] }, lunch: { name: 'Pizza place', how: 'out' } } };
  st.mealbook = { own: [{ id: 'o1', name: 'Grandma’s soup', parts: [] }], hide: ['i:cereal'], diet: 'vegetarian', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'], words: [] };
  return st;
}
const NEW = (st) => ({ people: st.profile.people, move: st.settings.move, holidays: st.settings.holidays, with: st.dinners['2026-10-16'].with, cook: st.dinners['2026-10-17'].cook, idea: st.ideas.find((i) => i.id === 'i-ada'), meals: st.meals, mealbook: st.mealbook });

test('the version is 10, and migrating a V11 board saved as 7 leaves every V11 field as it was', () => {
  assert.equal(D.VERSION, 10);
  const st = v11Board(), before = copy(NEW(st));
  st.v = 7; delete st.goals;
  const out = D.migrate(copy(st));
  assert.equal(out.v, D.VERSION);
  assert.deepEqual(out.goals, [], 'goals start empty');
  assert.deepEqual(copy(NEW(out)), before);
});

test('an old board (version 4 on) comes forward without any of them, and V11 reads it', () => {
  const old = D.sampleState(today);
  old.v = 4;
  delete old.settings; delete old.shopping; delete old.calendars; delete old.groups; delete old.profile.people; delete old.goals;
  const st = D.migrate(old);
  assert.equal(st.v, D.VERSION);
  assert.deepEqual(st.goals, []);
  for (const k of ['meals', 'mealbook']) assert.equal(st[k], undefined, k + ' is never added by a migration');
  assert.equal(st.profile.people, undefined);
  assert.equal(st.settings.move, undefined);
  assert.equal(st.settings.holidays, undefined);
  // and everything V11 reads from them works without them
  const r = appRig(st, today, 600), ml = mealRig(srOf(r));
  assert.doesNotThrow(() => { r.peopleWeek(ws); r.weekMoves(ws); r.useMove(); r.cookChoices(); r.weekCounts(ws); });
  assert.deepEqual(plain(r.groupNames('friends')), []);
  assert.equal(ml.mealAt('2026-10-15', 'breakfast'), null);
  assert.equal(ml.leftOut('roast chicken'), null);
  assert.doesNotThrow(() => M.groceries(st, M.range(ws, 7)));
});

test('the old cook words still read: me, kim as the first partner, and home', () => {
  const r = appRig(D.sampleState(today), today, 600);
  assert.equal(r.cookName('me'), 'You cook');
  assert.equal(r.cookName('kim'), 'Sam cooks');
  assert.equal(r.cookWho('kim'), 'Sam');
  assert.equal(r.cookName('home'), 'Cooking');
});

test('a cook stored as a person still counts as cooking: groceries and a decided dinner', () => {
  const st = v11Board();
  st.dinners['2026-10-17'].items = ['chicken'];
  assert.ok(M.groceries(st, M.range(ws, 7)).some((x) => x.id === 'chicken' && x.days.includes('2026-10-17')));
  const din = M.calendarDay(st, '2026-10-17').blocks.find((b) => b.dinner);
  assert.equal(din.planned, true);
});

/* two devices start from the same board, each changes something, and the second to save merges */
test('two devices each add someone and each plan a different meal: the merge keeps all of it', () => {
  const base = D.sampleState(today);
  const a = appRig(copy(base), today, 600), b = appRig(copy(base), today, 600);
  a.addPerson('Ana', 'friends');
  b.addPerson('Gran', 'family');
  const ma = mealRig(srOf(a)), mb = mealRig(srOf(b));
  // different days, and the same day with different meals
  ma.putMeal(a.state, '2026-10-15', 'breakfast', { name: 'Oatmeal', how: 'home' });
  mb.putMeal(b.state, '2026-10-16', 'lunch', { name: 'Soup', how: 'home' });
  ma.putMeal(a.state, '2026-10-17', 'breakfast', { name: 'Pancakes', how: 'home' });
  mb.putMeal(b.state, '2026-10-17', 'lunch', { name: 'Leftovers', how: 'leftovers' });
  const { doc, clashes } = M.mergeBoards(base, plain(a.state), plain(b.state));
  assert.deepEqual(doc.profile.people.map((x) => x.name).sort(), ['Ana', 'Gran'], 'both people');
  assert.deepEqual(doc.meals['2026-10-15'], { breakfast: { name: 'Oatmeal' } });
  assert.deepEqual(doc.meals['2026-10-16'], { lunch: { name: 'Soup' } });
  assert.deepEqual(doc.meals['2026-10-17'], { breakfast: { name: 'Pancakes' }, lunch: { name: 'Leftovers', how: 'leftovers' } });
  assert.deepEqual(clashes, []);
});

test('the profile, settings, and meal book merge field by field, and lists of things by id', () => {
  const base = v11Board();
  const mine = copy(base), theirs = copy(base);
  mine.profile.name = 'Alexis';
  theirs.profile.people.push({ id: 'ana', name: 'Ana', group: 'friends' });
  mine.settings.move = { on: true, n: 4, unit: 'times' };
  theirs.settings.holidays = ['halloween', 'christmas'];
  mine.mealbook.own.push({ id: 'o2', name: 'Fish tacos', parts: [] });
  theirs.mealbook.own.push({ id: 'o3', name: 'Lentil stew', parts: [] });
  theirs.mealbook.diet = 'pescatarian';
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.equal(doc.profile.name, 'Alexis');
  assert.deepEqual(doc.profile.people.map((x) => x.id), ['jm', 'gm', 'ana']);
  assert.deepEqual(doc.settings.move, { on: true, n: 4, unit: 'times' });
  assert.deepEqual(doc.settings.holidays, ['halloween', 'christmas']);
  assert.deepEqual(doc.mealbook.own.map((x) => x.id), ['o1', 'o2', 'o3']);
  assert.equal(doc.mealbook.diet, 'pescatarian');
  assert.deepEqual(clashes, []);
});

test('someone removed on one device stays removed while the other adds someone new', () => {
  const base = v11Board();
  const mine = copy(base), theirs = copy(base);
  mine.profile.people = mine.profile.people.filter((x) => x.id !== 'gm');
  theirs.profile.people.push({ id: 'ana', name: 'Ana', group: 'friends' });
  const { doc } = M.mergeBoards(base, mine, theirs);
  assert.deepEqual(doc.profile.people.map((x) => x.id), ['jm', 'ana']);
});

test('lists of words merge as sets: each device’s additions stay, and a removal sticks', () => {
  const base = v11Board();
  const mine = copy(base), theirs = copy(base);
  mine.settings.holidays = ['halloween', 'diwali'];
  theirs.settings.holidays = ['christmas'];
  mine.mealbook.hide = ['i:cereal', 'i:bagels'];
  theirs.mealbook.hide = ['i:cereal', 'i:soup'];
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.deepEqual(doc.settings.holidays, ['diwali', 'christmas'], 'Halloween was turned off on their device');
  assert.deepEqual(doc.mealbook.hide, ['i:cereal', 'i:bagels', 'i:soup']);
  assert.deepEqual(clashes, []);
});

test('both devices changing the same meal: the newer save wins and the clash is named', () => {
  const base = v11Board();
  const mine = copy(base), theirs = copy(base);
  mine.meals['2026-10-15'].breakfast = { name: 'Eggs' };
  theirs.meals['2026-10-15'].breakfast = { name: 'Cereal' };
  theirs.meals['2026-10-15'].lunch = { name: 'Soup' };
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.deepEqual(doc.meals['2026-10-15'], { breakfast: { name: 'Eggs' }, lunch: { name: 'Soup' } });
  assert.deepEqual(clashes, ['meals 2026-10-15 breakfast']);
});

test('a dinner’s with, an idea’s who, and a cook by id ride their own merges', () => {
  const base = v11Board();
  const mine = copy(base), theirs = copy(base);
  mine.dinners['2026-10-17'] = { name: 'Stew', cook: 'p:jm', items: [] };
  theirs.ideas.push({ id: 'i-leo', name: 'Bike ride', kind: '', dur: 60, icon: 'shoe', for: 'kids', who: 'Robin' });
  theirs.dinners['2026-10-16'].with = { idea: 'fr-dinner', for: 'friends', who: 'Ana', how: 'out' };
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.equal(doc.dinners['2026-10-17'].cook, 'p:jm');
  assert.equal(doc.dinners['2026-10-16'].with.who, 'Ana');
  assert.ok(doc.ideas.some((i) => i.id === 'i-leo' && i.who === 'Robin'));
  assert.ok(doc.ideas.some((i) => i.id === 'i-ada'));
  assert.deepEqual(clashes, []);
});

test('300 random pairs of edits: one side’s changes come through whole, and edits that don’t overlap all stay', () => {
  let seed = 7;
  const rnd = (n) => { seed = (seed * 16807) % 2147483647; return Math.floor((seed / 2147483647) * n); };
  const dates = M.range(ws, 7), kinds = ['breakfast', 'lunch'];
  /* one random edit to a V11 field, on dates of one parity so two devices can stay apart */
  const edit = (st, odd, tag) => {
    const d = dates[(rnd(3) * 2 + (odd ? 1 : 0)) % 7];
    switch (rnd(6)) {
      case 0: st.meals = st.meals || {}; st.meals[d] = Object.assign({}, st.meals[d], { [kinds[rnd(2)]]: { name: tag + rnd(99) } }); break;
      case 1: if (st.meals && st.meals[d]) delete st.meals[d]; break;
      case 2: st.profile.people = (st.profile.people || []).concat({ id: tag + rnd(1e6), name: 'P' + tag + rnd(99), group: 'friends' }); break;
      case 3: st.mealbook.own = st.mealbook.own.concat({ id: 'o' + tag + rnd(1e6), name: 'Meal ' + tag, parts: [] }); break;
      case 4: st.dinners[d] = { name: 'Dish ' + tag + rnd(99), cook: ['me', 'kim', 'p:gm', 'order'][rnd(4)], items: [] }; break;
      default: st.mealbook.hide = st.mealbook.hide.concat('i:' + tag + rnd(99));
    }
  };
  for (let i = 0; i < 300; i++) {
    const base = v11Board(), mine = copy(base), theirs = copy(base);
    for (let k = rnd(4) + 1; k > 0; k--) edit(mine, false, 'm');
    for (let k = rnd(4) + 1; k > 0; k--) edit(theirs, true, 't');
    assert.ok(M.sameBoard(M.mergeBoards(base, mine, base).doc, mine), 'only mine changed, at ' + i);
    assert.ok(M.sameBoard(M.mergeBoards(base, base, theirs).doc, theirs), 'only theirs changed, at ' + i);
    assert.ok(M.sameBoard(M.mergeBoards(base, mine, mine).doc, mine), 'both the same, at ' + i);
    const { doc, clashes } = M.mergeBoards(base, mine, theirs);
    assert.deepEqual(clashes, [], 'edits that don’t overlap never clash, at ' + i);
    const ids = (list) => (list || []).map((x) => x.id);
    for (const id of ids(mine.profile.people).concat(ids(theirs.profile.people))) assert.ok(ids(doc.profile.people).includes(id), 'person ' + id + ' at ' + i);
    for (const id of ids(mine.mealbook.own).concat(ids(theirs.mealbook.own))) assert.ok(ids(doc.mealbook.own).includes(id), 'meal ' + id + ' at ' + i);
    for (const side of [mine, theirs]) {
      for (const d of dates) {
        if (!M.sameBoard(side.meals[d], base.meals[d])) assert.deepEqual(doc.meals[d], side.meals[d], 'meals on ' + d + ' at ' + i);
        if (!M.sameBoard(side.dinners[d], base.dinners[d])) assert.deepEqual(doc.dinners[d], side.dinners[d], 'dinner on ' + d + ' at ' + i);
      }
      side.mealbook.hide.forEach((h) => assert.ok(doc.mealbook.hide.includes(h), 'hidden ' + h + ' at ' + i));
    }
  }
});

test('a board with none of the new fields merges with one that has them', () => {
  const old = D.sampleState(today), now = v11Board();
  const { doc } = M.mergeBoards(old, old, now);
  assert.deepEqual(copy(NEW(doc)), copy(NEW(now)), 'theirs had them, mine never touched them');
  const back = M.mergeBoards(old, now, old).doc;
  assert.deepEqual(copy(NEW(back)), copy(NEW(now)), 'mine had them');
});
