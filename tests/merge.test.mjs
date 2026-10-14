// V11: two devices, one board (Model.mergeBoards), for the cases a field by field merge gets wrong:
// switches inside settings.modules, a date whose meals were all cleared between the two, a diet and what
// it leaves out, two first partners, and a partner who stepped up while the other device planned a dinner
// they're cooking. Then the setup's answers, Monday weeks, and Undo after removing a cook.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, finishRig, srOf, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const copy = (v) => JSON.parse(JSON.stringify(v));
const MEATS = ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'];

test('one device turns off Meals and the other People: both stay off', () => {
  const base = D.sampleState(today), mine = copy(base), theirs = copy(base);
  mine.settings.modules = Object.assign({}, mine.settings.modules, { dinners: false });
  theirs.settings.modules = Object.assign({}, theirs.settings.modules, { people: false });
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.deepEqual(doc.settings.modules, { dinners: false, together: true, people: false });
  assert.deepEqual(clashes, []);
  // the same switch turned two ways is still a clash, and mine wins
  theirs.settings.modules.dinners = true; theirs.settings.modules.people = false;
  mine.settings.modules.people = true;
  const r = M.mergeBoards(base, mine, theirs);
  assert.equal(r.doc.settings.modules.people, true);
  assert.deepEqual(r.clashes, ['settings modules people']);
});

test('the rest of settings still merges a whole field at a time', () => {
  const base = D.sampleState(today), mine = copy(base), theirs = copy(base);
  mine.settings.hours = { start: 240, end: 1440 };
  theirs.settings.hours = { start: 300, end: 1560 };
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.deepEqual(doc.settings.hours, { start: 240, end: 1440 }, 'never a start from one and an end from the other');
  assert.deepEqual(clashes, ['settings hours']);
});

test('each device clears a different meal on the same day: the day goes', () => {
  const base = D.sampleState(today);
  base.meals = { '2026-10-15': { breakfast: { name: 'Oats' }, lunch: { name: 'Soup' } }, '2026-10-16': { lunch: { name: 'Wraps' } } };
  const mine = copy(base), theirs = copy(base);
  mine.meals['2026-10-15'] = { lunch: { name: 'Soup' } };
  theirs.meals['2026-10-15'] = { breakfast: { name: 'Oats' } };
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.deepEqual(doc.meals, { '2026-10-16': { lunch: { name: 'Wraps' } } });
  assert.deepEqual(clashes, []);
  // and when that was every meal on the board, meals stays, empty
  mine.meals = { '2026-10-15': { lunch: { name: 'Soup' } } };
  theirs.meals = { '2026-10-15': { breakfast: { name: 'Oats' } } };
  assert.deepEqual(M.mergeBoards(base, mine, theirs).doc.meals, {});
});

test('a diet and what it leaves out are one choice', () => {
  const base = D.sampleState(today);
  base.mealbook = { own: [], hide: [], diet: 'vegetarian', out: MEATS.slice(), words: [] };
  const mine = copy(base), theirs = copy(base);
  mine.mealbook.diet = 'all'; mine.mealbook.out = [];
  theirs.mealbook.diet = 'vegan'; theirs.mealbook.out = MEATS.concat(['eggs', 'dairy']);
  const { doc, clashes } = M.mergeBoards(base, mine, theirs);
  assert.deepEqual([doc.mealbook.diet, doc.mealbook.out], ['all', []], 'never Everything with eggs and dairy left out');
  assert.deepEqual(clashes, ['mealbook diet']);
  // one picks a diet and the other leaves out one more thing: both
  const m2 = copy(base), t2 = copy(base);
  m2.mealbook.diet = 'vegan'; m2.mealbook.out = MEATS.concat(['eggs', 'dairy']);
  t2.mealbook.out = MEATS.concat(['nuts']);
  const r = M.mergeBoards(base, m2, t2);
  assert.equal(r.doc.mealbook.diet, 'vegan');
  assert.deepEqual(r.doc.mealbook.out, MEATS.concat(['eggs', 'dairy', 'nuts']));
  assert.deepEqual(r.clashes, []);
});

test('two devices each add a first partner: both stay, and the dinners each planned keep their cook', () => {
  const base = D.sampleState(today);
  base.profile.partner = '';
  const a = appRig(copy(base), today, 600), b = appRig(copy(base), today, 600);
  a.addPerson('Jamie', 'partner');
  b.addPerson('Chris', 'partner');
  a.state.dinners['2026-10-16'] = { name: 'Curry', cook: 'kim', items: [] };
  b.state.dinners['2026-10-17'] = { name: 'Tacos', cook: 'kim', items: [] };
  const { doc, clashes } = M.mergeBoards(base, plain(a.state), plain(b.state));
  assert.equal(doc.profile.partner, 'Jamie');
  const chris = (doc.profile.people || []).find((x) => x.name === 'Chris');
  assert.ok(chris && chris.group === 'partner' && chris.id, 'Chris is kept, as a partner');
  assert.deepEqual(clashes, []);
  const c = appRig(doc, today, 600);
  assert.equal(c.cookName(doc.dinners['2026-10-16'].cook), 'Jamie cooks');
  assert.equal(c.cookName(doc.dinners['2026-10-17'].cook), 'Chris cooks', 'Chris’s device said kim, and meant Chris');
  // the same merge done again gives the same id, so two devices merging agree
  assert.equal(M.mergeBoards(base, plain(a.state), plain(b.state)).doc.profile.people.find((x) => x.name === 'Chris').id, chris.id);
});

test('a partner who steps up on one device still cooks what the other device planned for them', () => {
  const base = D.sampleState(today);
  base.profile.people = [{ id: 'jm', name: 'Jamie', group: 'partner' }];
  const a = appRig(copy(base), today, 600), b = appRig(copy(base), today, 600);
  a.removePerson('partner', 'Sam');
  b.state.dinners['2026-10-16'] = { name: 'Curry', cook: 'p:jm', items: [] };
  const { doc } = M.mergeBoards(base, plain(a.state), plain(b.state));
  assert.equal(doc.profile.partner, 'Jamie');
  const c = appRig(doc, today, 600);
  assert.equal(c.cookName('p:jm'), 'Jamie cooks');
  assert.equal(c.cookWho('p:jm'), 'Jamie');
  // and when Jamie comes off too, that dinner goes to Anyone, never to whoever is next
  c.removePerson('partner', 'Jamie');
  assert.equal(c.state.profile.partner, '');
  assert.notEqual(c.cookWho(c.state.dinners['2026-10-16'].cook), 'Jamie');
  assert.equal(c.cookName(c.state.dinners['2026-10-16'].cook), 'Cooking');
});

test('Undo after removing someone who was cooking gives back the person and their meals', () => {
  const st = D.sampleState(today);
  st.profile.people = [{ id: 'gm', name: 'Gran', group: 'family', home: true }];
  st.dinners['2026-10-16'] = { name: 'Stew', cook: 'p:gm', items: [] };
  st.meals = { '2026-10-15': { lunch: { name: 'Soup', cook: 'p:gm' } } };
  const r = appRig(st, today, 600), before = JSON.stringify(r.state);
  r.removePerson('family', 'Gran');
  assert.notEqual(r.state.dinners['2026-10-16'].cook, 'p:gm');
  r.undo();
  assert.equal(JSON.stringify(r.state), before);
  assert.equal(r.cookName(r.state.dinners['2026-10-16'].cook), 'Gran cooks');
  assert.equal(r.state.meals['2026-10-15'].lunch.cook, 'p:gm');
});

test('the setup: leaning toward moving more turns on Moving; People follows what it helps with', () => {
  const a = { name: 'Ada', partner: '', kids: [], wake: { wd: 420, we: 480 }, bed: { wd: 1350, we: 1380 }, work: null, help: { dinners: true } };
  const plainSt = D.buildState(a, today);
  assert.equal(plainSt.settings.move, undefined);
  assert.equal(plainSt.settings.modules.people, undefined, 'People is on for anyone, unless turned off');
  assert.equal(appRig(plainSt, today, 600).useTogether(), true);
  const moving = D.buildState(Object.assign({}, a, { focus: ['move', 'home'] }), today);
  assert.deepEqual(moving.settings.move, { on: true });
  assert.equal(appRig(moving, today, 600).useMove(), true);
  const off = D.buildState(Object.assign({}, a, { help: { dinners: true, people: false } }), today);
  assert.equal(off.settings.modules.people, false);
  assert.equal(appRig(off, today, 600).useTogether(), false);
  const noTogether = D.buildState(Object.assign({}, a, { partner: 'Lee', help: { together: false } }), today);
  assert.equal(noTogether.settings.modules.people, false);
});

test('weeks that start on Monday: the reset counts Monday to Sunday', () => {
  const st = D.sampleState(today);
  st.settings.weekStart = 1;
  M.setWeekStart(1);
  try {
    st.tasks = [
      { id: 'sun', name: 'Due Sunday', due: '2026-10-18', done: false, dur: 30, steps: [] },
      { id: 'mon', name: 'Due next Monday', due: '2026-10-19', done: false, dur: 30, steps: [] },
      { id: 'sat', name: 'Due Saturday', due: '2026-10-17', done: false, dur: 30, steps: [] }
    ];
    const ws = M.weekStart(today);
    assert.equal(ws, '2026-10-12');
    const r = appRig(st, today, 600);
    assert.deepEqual(r.weekCounts(ws).unplaced.map((x) => x.task.id).sort(), ['sat', 'sun'], 'Sunday is in this week, next Monday isn’t');
    const f = plain(finishRig(srOf(r)).finishData(ws));
    assert.equal(f.need, 2);
    assert.equal(f.dinners[0].day, 'Mon');
    assert.equal(f.dinners[f.dinners.length - 1].day, 'Sun');
  } finally { M.setWeekStart(0); }
});
