// V11 (Oct 14), the polish pass's small fixes that can be held without a browser: a prep week never offers tonight's
// dinner once its time is over (Model.prepPlan with nowMin), and Cook extra's grid says why it can't cover a meal
// (variant.js noCover) instead of a blank dotted box. The meal board's rules are cut out of
// variants/corners11/variant.js as tests/ui-meals.test.mjs cuts them, and run on the sample family's week.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { variant, plain, M, D } from './v11-rig.mjs';

const SUN = '2026-10-11';
const at = (n) => M.addDays(SUN, n);

/* the sample family's week with no dinners planned, so a prep week has every night to offer */
function emptyWeek(today) {
  const st = D.sampleState(today);
  for (const d of M.range(M.weekStart(today), 7)) delete st.dinners[d];
  return st;
}

test('a prep week offers tonight\'s dinner only while its time is still ahead', () => {
  const st = emptyWeek(SUN), db = M.calendarDay(st, SUN).blocks.find((b) => b.dinner);
  assert.ok(db, 'the sample Sunday has a Dinner block');
  // at 3 pm the first batch cook is tonight
  const three = M.prepPlan(st, SUN, { today: SUN, nowMin: 15 * 60 }, D);
  assert.equal(three.batches[0].date, SUN);
  // at 10 pm (or the minute the Dinner block ends) tonight is over: the first batch is tomorrow, and tonight is
  // never a fresh night either
  for (const min of [22 * 60, db.start + db.dur]) {
    const late = M.prepPlan(st, SUN, { today: SUN, nowMin: min }, D);
    assert.equal(late.batches[0].date, at(1), M.clock(min));
    assert.ok(!late.list.some((x) => x.date === SUN), 'nothing on tonight at ' + M.clock(min));
    assert.match(late.message, /^Two batch cooks, Monday and Wednesday/);
  }
  // a minute before it ends, tonight is still offered
  assert.equal(M.prepPlan(st, SUN, { today: SUN, nowMin: db.start + db.dur - 1 }, D).batches[0].date, SUN);
  // with no minute given, as before: the day counts whole
  assert.equal(M.prepPlan(st, SUN, { today: SUN }, D).batches[0].date, SUN);
  // tomorrow's dinner is never over tonight
  const mon = M.prepPlan(st, SUN, { today: SUN, nowMin: 23 * 60 + 30 }, D);
  assert.ok(mon.list.some((x) => x.date === at(1) && x.slot === 'dinner'));
});

/* the meal board's rules on a board (tests/ui-meals.test.mjs's rig, cut the same way) */
function load(board, today) {
  const parts = [
    variant('    const MEAL_KINDS = [', '    /* every meal change goes through the board\'s commit'),
    variant('    /* every meal change goes through the board\'s commit', '    const dinnerOf = (d) =>'),
    variant('    const dinnerOf = (d) =>', '    /* "sweet potatoes, scrambled eggs'),
    variant('    /* == V11 goals: cook once, eat twice, on the meal board ==', '    /* V11: one meal toast at a time.')
  ];
  const script = `
    let state = __board;
    const SR = {
      get state() { return state; }, view: { preview: true }, today: __today, nowMin: 600, M, D,
      day: (d) => M.calendarDay(state, d),
      commit(fn) { const snap = JSON.stringify(state); let r; try { r = fn(); } catch (e) { state = JSON.parse(snap); throw e; } if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; } return r; }
    };
    const Kit = { renders: [] };
    ${parts.join('\n')}
    ({ SR, mealAt, putMeal, commitMeals, extraGrid, noCover });`;
  return runInNewContext(script, { M, D, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, window: {}, __board: board, __today: today || SUN, console });
}

test('Cook extra says why it can\'t cover a meal: the meal there, a day that\'s over, a trip, or the meal itself', () => {
  const r = load(D.sampleState(SUN));
  r.commitMeals((st) => r.putMeal(st, SUN, 'dinner', { name: 'Chicken and rice', how: 'home', cook: 'me', items: [] }));
  r.commitMeals((st) => r.putMeal(st, at(1), 'lunch', { name: 'Tacos', how: 'home' }));
  const g = plain(r.extraGrid(SUN, 'dinner', ['lunch', 'dinner']));
  const lunch = g.rows.find((x) => x.slot === 'lunch');
  assert.equal(lunch.cells[0], null, 'Monday lunch has a meal of its own');
  // that cell says so, by the meal's name, and in full for a screen reader and a pointer
  assert.deepEqual(plain(r.noCover(SUN, 'dinner', g.days[0], 'lunch')), { word: 'Tacos', words: 'Monday lunch: Tacos' });
  // a dinner of the sample's own (Monday's Tacos, Tuesday's order in) says what it is
  assert.deepEqual(plain(r.noCover(SUN, 'dinner', at(2), 'dinner')).words, 'Tuesday dinner: ' + r.mealAt(at(2), 'dinner').name);
  // the meal itself, for a lunch's own row
  r.commitMeals((st) => r.putMeal(st, at(5), 'lunch', { name: 'Soup', how: 'home' }));
  assert.deepEqual(plain(r.noCover(at(5), 'lunch', at(5), 'lunch')), { word: 'This one', words: 'Friday lunch is this meal' });
  // a trip day
  r.SR.state.events.push({ id: 'trip-x', kind: 'trip', name: 'The lake', date: at(4), end: at(4) });
  assert.deepEqual(plain(r.noCover(SUN, 'dinner', at(4), 'lunch')), { word: 'Away', words: 'Away on Thursday' });
  // a day that's over, seen later in the week
  const later = load(D.sampleState(SUN), at(3));
  assert.deepEqual(plain(later.noCover(at(1), 'dinner', at(2), 'lunch')), { word: 'Over', words: 'Tuesday lunch is over' });
  // every word it says follows the board's voice: no dashes, no filler words
  for (const w of [r.noCover(SUN, 'dinner', at(1), 'lunch'), r.noCover(at(5), 'lunch', at(5), 'lunch'), later.noCover(at(1), 'dinner', at(2), 'lunch')]) {
    assert.ok(!/[–—]|--|\b(just|simply|really|please|actually)\b/i.test(w.word + ' ' + w.words), w.words);
  }
});
