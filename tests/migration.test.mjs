// V11 goals: saved data version 8. Data.migrate takes a version 7 board forward by adding state.goals,
// an empty list, and changes nothing else: every field, every date, every minute stays as it was.
// A version 8 board, with goals, spread steps, goal sessions (pinned and skipped), Meal prep, and
// leftovers that know where they come from, saves and loads back exactly. V11-2 (big moments) made it
// version 9, whose fields are all optional (tests/big-moments-model.test.mjs has the rest).
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const today = '2026-10-14';
const copy = (v) => JSON.parse(JSON.stringify(v));

/* a board as version 7 left it, with V11's optional fields in use and a week of things placed */
function v7Board() {
  const st = D.sampleState(today);
  st.v = 7;
  delete st.goals;
  st.profile.people = [{ id: 'gm', name: 'Gran', group: 'family', home: true }];
  st.settings.move = { on: true, n: 3, unit: 'times' };
  st.settings.holidays = ['halloween'];
  st.settings.weekStart = 1;
  st.meals = { '2026-10-15': { breakfast: { name: 'Oatmeal', parts: ['Oats', 'Berries'] }, lunch: 'Leftover soup' } };
  st.mealbook = { own: [{ id: 'o1', name: 'Soup', parts: [] }], hide: [], diet: 'all', out: [], words: [] };
  st.dinners['2026-10-17'] = { name: 'Stew', cook: 'p:gm', items: ['beef'], with: { idea: 'fr-dinner', for: 'friends', how: 'home' } };
  st.weeks['2026-10-12'] = { shape: 'usual', reset: { done: true } };
  st.shopping['2026-10-12'] = { beef: true };
  st.dates['2026-10-20'] = { wake: 330, bed: 1500, edits: { work: { start: 600, dur: 300 } }, adds: [{ id: 'late', name: 'Night shift', cat: 'work', icon: 'laptop', start: 1380, dur: 240, src: { type: 'block', id: 'deep' } }] };
  return copy(st);
}

test('Data.VERSION is 9, and a fresh board starts with no goals', () => {
  assert.equal(D.VERSION, 9);
  for (const st of [D.defaultState(today), D.sampleState(today), D.buildState({ name: 'Ana', kids: [], wake: { wd: 420, we: 480 }, bed: { wd: 1380, we: 1380 }, work: null }, today)]) {
    assert.equal(st.v, 9);
    assert.deepEqual(st.goals, []);
  }
});

test('a version 7 board comes forward unchanged except for the new empty goals', () => {
  const old = v7Board(), before = copy(old);
  const st = D.migrate(copy(old));
  assert.equal(st.v, 9);
  assert.deepEqual(st.goals, []);
  const rest = copy(st);
  delete rest.goals;
  rest.v = 7;
  assert.deepEqual(rest, before, 'every field and date as it was');
  // and the days it holds read the same
  for (const d of M.range('2026-10-11', 14)) assert.deepEqual(copy(M.calendarDay(st, d)), copy(M.calendarDay(old, d)), d);
  // a version 7 board that somehow has a goals list keeps it
  const kept = v7Board();
  kept.goals = [{ id: 'g1', name: 'Kept' }];
  assert.deepEqual(D.migrate(kept).goals, [{ id: 'g1', name: 'Kept' }]);
});

test('a version 9 board round trips: goals, spread steps, sessions, Meal prep, and leftovers', () => {
  const st = D.migrate(v7Board());
  const g = M.newGoal({ name: 'Pass the bar exam', kind: 'exam', date: '2027-02-24', today, parts: M.goalForExam('bar exam', D).parts, rhythm: { wd: 60, we: 120 } });
  st.goals.push(g);
  M.planGoal(st, g.id, today, 600);
  const s = M.goalSessions(st, g.id);
  s[0].add.skipped = true;
  s[1].add.pinned = true;
  g.answers['2026-10-13'] = 'some';
  const t = st.tasks.find((x) => x.id === 'garage');
  M.applySpread(st, 'garage', M.spreadPlan(st, 'garage', { cap: 60, when: 'morning' }, today, 600));
  assert.ok(t.spread);
  st.dinners['2026-10-18'] = { name: 'Turkey chili', cook: 'home', items: ['turkey', 'beans'] };
  M.cookExtra(st, { date: '2026-10-18', slot: 'dinner' }, [{ date: '2026-10-19', slot: 'lunch' }, { date: '2026-10-20', slot: 'dinner' }]);
  M.placeAdd(st, '2026-10-18', { name: 'Meal prep', cat: 'meals', icon: 'pot', dur: 90, src: { type: 'prep', week: '2026-10-18' }, makes: [{ date: '2026-10-19', slot: 'lunch', name: 'Leftovers: Turkey chili' }] }, 780);
  const saved = JSON.stringify(st);
  const back = D.migrate(JSON.parse(saved));
  assert.equal(back.v, 9);
  assert.equal(JSON.stringify(back), saved, 'exactly as saved');
  assert.equal(JSON.stringify(D.migrate(D.migrate(JSON.parse(saved)))), saved, 'migrating twice changes nothing');
  assert.deepEqual(copy(M.goalProgress(back, g.id, today, 600)), copy(M.goalProgress(st, g.id, today, 600)));
});

test('every older version still comes all the way forward, with goals', () => {
  for (const v of [1, 2, 3, 4, 5, 6]) {
    const old = D.defaultState('2026-09-27');
    old.v = v;
    delete old.goals;
    const st = D.migrate(old);
    assert.equal(st.v, 9, 'from version ' + v);
    assert.deepEqual(st.goals, []);
  }
});

test('a board from a newer version is left as it is', () => {
  const st = D.sampleState(today);
  st.v = 10;
  delete st.goals;
  const out = D.migrate(copy(st));
  assert.equal(out.v, 10);
  assert.equal(out.goals, undefined);
  assert.equal(D.migrate(null), null);
});

test('a board without a goals list reads safely everywhere goals are read', () => {
  const st = D.sampleState(today);
  delete st.goals;
  assert.deepEqual(M.goalCheckIn(st, today), []);
  assert.equal(M.goalProgress(st, 'nope', today, 600), null);
  assert.equal(M.planGoal(st, 'nope', today, 600).message, 'That goal is gone.');
  assert.equal(M.answerCheckIn(st, 'nope', today, 'yes').ok, false);
  const merged = M.mergeBoards(copy(st), copy(st), Object.assign(copy(st), { goals: [M.newGoal({ name: 'Run a 10k', today })] }));
  assert.equal(merged.doc.goals.length, 1, 'a goal added on one device comes through a merge with one that has none');
});
