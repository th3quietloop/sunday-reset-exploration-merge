// V11 goals, on the meal board: cook once, eat twice. Leftovers keep the meal they come from through every
// meal change the board makes (mealAt, putMeal, commitMeals ending with Model.syncLeftovers), a cooked meal
// offers the later meals it can cover (extraGrid), the words a change says (mealsWords, coverWords,
// stayWords), leftovers follow their meal when it moves (followMoves), the week's batch cooks and their Meal
// prep blocks (batchCooks, prepOf, prepSpot, prepAdd), a prep week to look at (prepLook, prepWords), the
// grocery list buying for every meal a dish feeds (shopList), and food dropped on a dinner keeping its
// leftovers (app.js setDinnerFrom). Cut out of variants/corners11/variant.js and board/src/app.js and run on
// the sample family's week, the way tests/old-meals.test.mjs runs the meal board.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { variant, app, plain, M, D } from './v11-rig.mjs';

const SUN = '2026-10-11';
const at = (n) => M.addDays(SUN, n);
const NEXT = at(7);

/* the meal board's rules on a board, with the app's commit and undo: a change that says no leaves the board
   as it was; one that goes through can be taken back */
function load(board, today, nowMin) {
  const parts = [
    variant('    const MEAL_KINDS = [', '    /* every meal change goes through the board\'s commit'),
    variant('    /* every meal change goes through the board\'s commit', '    const dinnerOf = (d) =>'),
    variant('    const dinnerOf = (d) =>', '    /* "sweet potatoes, scrambled eggs'),
    variant('    /* == V11 goals: cook once, eat twice, on the meal board ==', '    /* V11: one meal toast at a time.'),
    variant('    /* V11: the week\'s grocery list, with the meals and days each thing is for */', '    function setGot(dates, id, on) {')
  ];
  const script = `
    let state = __board;
    const undoStack = [];
    const SR = {
      get state() { return state; }, view: { preview: true }, today: __today, nowMin: __now, M, D,
      day: (d) => M.calendarDay(state, d),
      commit(fn) {
        const snap = JSON.stringify(state);
        let r;
        try { r = fn(); } catch (e) { state = JSON.parse(snap); throw e; }
        if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; }
        undoStack.push(snap);
        return r;
      },
      undo() { const s = undoStack.pop(); if (s) state = JSON.parse(s); }
    };
    const Kit = { renders: [] };
    ${parts.join('\n')}
    ({ SR, mealAt, putMeal, commitMeals, mealLabel, canDinner, ensureDinner, sourceOf, dishOf, fromWords, leftoversNow, mealsWords, coverWords,
       extraGrid, sourceCells, linkedNow, letGoSince, stayWords, followMoves, batchCooks, prepOf, prepSpot, prepAdd, prepLook, prepWords,
       shopList, leftLine: window.SR_leftLine, leftStay: window.SR_leftStay, leftLinks: window.SR_leftLinks });`;
  return runInNewContext(script, { M, D, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, window: {}, __board: board, __today: today || SUN, __now: nowMin == null ? 600 : nowMin, console });
}
const sample = () => D.sampleState(SUN);
/* a Sunday dinner cooked to last, as the meal board writes one */
const chicken = (r, d) => r.commitMeals((st) => r.putMeal(st, d || SUN, 'dinner', { name: 'Chicken and rice', how: 'home', cook: 'me', items: ['chicken', 'rice', 'broccoli'] }));

test('leftovers keep the meal they come from through the meal board’s own writes', () => {
  const r = load(sample());
  chicken(r);
  r.commitMeals((st) => M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }]));
  assert.deepEqual(plain(r.mealAt(at(1), 'lunch')), { name: 'Leftovers: Chicken and rice', parts: [], items: [], how: 'leftovers', cook: '', recipe: null, from: { date: SUN, slot: 'dinner' } });
  // a meal with no link reads the way it always did, with no from at all
  assert.equal('from' in r.mealAt(SUN, 'dinner'), false);
  // moved by hand (the board writes the cell it read), the link comes too
  r.commitMeals((st) => { r.putMeal(st, at(3), 'lunch', r.mealAt(at(1), 'lunch')); r.putMeal(st, at(1), 'lunch', null); });
  assert.deepEqual(plain(r.SR.state.meals[at(3)].lunch.from), { date: SUN, slot: 'dinner' });
  // a dinner written as leftovers keeps the board's own shape and the link
  r.commitMeals((st) => r.putMeal(st, at(4), 'dinner', r.mealAt(at(2), 'lunch')));
  assert.deepEqual(plain(r.SR.state.dinners[at(4)]), { name: 'Leftovers: Chicken and rice', cook: 'leftovers', items: [], from: { date: SUN, slot: 'dinner' } });
  // anything that isn't leftovers never carries one
  r.commitMeals((st) => r.putMeal(st, at(2), 'lunch', Object.assign({}, r.mealAt(at(2), 'lunch'), { how: 'home', name: 'Soup' })));
  assert.equal('from' in r.SR.state.meals[at(2)].lunch, false);
  assert.equal(M.servingsOf(r.SR.state, SUN, 'dinner'), 3, 'the dinner and two leftovers');
});

test('every meal change ends with syncLeftovers: a new name follows, a meal that stops cooking lets go, under one Undo', () => {
  const r = load(sample());
  chicken(r);
  r.commitMeals((st) => M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }]));
  r.commitMeals((st) => r.putMeal(st, SUN, 'dinner', Object.assign({}, r.mealAt(SUN, 'dinner'), { name: 'Chicken, rice, and greens' })));
  assert.equal(r.SR.state.meals[at(1)].lunch.name, 'Leftovers: Chicken, rice, and greens');
  const links = r.linkedNow();
  assert.equal(links.size, 2);
  r.commitMeals((st) => r.putMeal(st, SUN, 'dinner', { name: 'Thai place', how: 'order' }));
  assert.deepEqual(plain(r.SR.state.meals[at(1)].lunch), { name: '', how: 'leftovers' }, 'leftovers from no meal now');
  const lost = r.letGoSince(links);
  assert.deepEqual(plain(lost), [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }]);
  assert.equal(r.stayWords(lost), 'Monday and Tuesday lunch stay as leftovers.');
  r.SR.undo();
  assert.equal(r.SR.state.meals[at(1)].lunch.name, 'Leftovers: Chicken, rice, and greens', 'one Undo takes the change and the unlinking back');
  assert.equal(r.SR.state.meals[at(1)].lunch.from.date, SUN);
});

test('meals said together, and what Cook extra and a lost link say', () => {
  const r = load(sample());
  const c = (d, slot) => ({ date: d, slot });
  assert.equal(r.mealsWords([c(at(2), 'lunch'), c(at(1), 'lunch')]), 'Monday and Tuesday lunch');
  assert.equal(r.mealsWords([c(at(1), 'dinner'), c(at(1), 'lunch')]), 'Monday lunch and dinner');
  assert.equal(r.mealsWords([c(at(1), 'lunch'), c(at(2), 'dinner')]), 'Monday lunch and Tuesday dinner');
  assert.equal(r.mealsWords([c(at(1), 'lunch'), c(at(2), 'lunch'), c(at(3), 'dinner')]), 'Monday and Tuesday lunch, and Wednesday dinner');
  assert.equal(r.mealsWords([c(at(1), 'lunch'), c(at(2), 'lunch'), c(at(3), 'lunch')], true), 'Mon, Tue, and Wed lunch');
  assert.equal(r.coverWords('Tacos', [c(at(1), 'lunch'), c(at(2), 'lunch')]), 'Enough Tacos for Monday and Tuesday lunch too', 'a plural dish never meets a verb');
  assert.equal(r.stayWords([c(at(1), 'lunch')]), 'Monday lunch stays as leftovers.');
  assert.equal(r.stayWords([]), '');
});

test('a leftover says the dish it is and the meal it comes from, while that meal is cooked and comes first', () => {
  const r = load(sample());
  chicken(r);
  r.commitMeals((st) => M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }]));
  assert.equal(r.dishOf(at(1), 'lunch'), 'Chicken and rice');
  assert.equal(r.fromWords(at(1), 'lunch'), 'From Sun dinner');
  assert.equal(r.fromWords(at(1), 'lunch', undefined, true), 'From Sunday dinner');
  assert.equal(r.leftLine(at(1), 'lunch'), 'Leftovers from Sunday dinner: Chicken and rice.');
  assert.equal(r.leftLine(SUN, 'dinner'), 'Enough for 2 meals, with Monday lunch.');
  // a name of its own stays its own
  r.commitMeals((st) => { st.meals[at(1)].lunch.name = 'Rice bowls'; });
  assert.equal(r.dishOf(at(1), 'lunch'), 'Rice bowls');
  // the sample's Wednesday leftovers come from no meal: no line, and the meals cooked before it to pick from
  assert.equal(r.sourceOf(at(3), 'dinner'), null);
  assert.equal(r.fromWords(at(3), 'dinner'), '');
  assert.equal(r.dishOf(at(3), 'dinner'), 'Leftovers');
  assert.deepEqual(plain(r.sourceCells(at(3), 'dinner')).map((x) => [x.date, x.slot, x.meal.name]), [[at(1), 'dinner', 'Tacos'], [SUN, 'dinner', 'Chicken and rice']], 'newest first, never the night ordered in');
});

test('Cook extra: a grid of the four days after a dinner, open meals and the ones it covers, never a meal with its own plan', () => {
  const r = load(sample());
  chicken(r);
  r.commitMeals((st) => M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }]));
  const g = plain(r.extraGrid(SUN, 'dinner', ['breakfast', 'lunch', 'dinner']));
  assert.deepEqual(g.days, [at(1), at(2), at(3), at(4)]);
  assert.deepEqual(g.rows.map((x) => x.slot), ['lunch', 'dinner'], 'no breakfasts for a dinner');
  const lunch = g.rows[0].cells, dinner = g.rows[1].cells;
  assert.deepEqual(lunch.map((c) => c && c.on), [true, false, false, false], 'Monday lunch is covered, the rest are open');
  // Monday's Tacos, Tuesday's Thai place, and Thursday's Sheet pan chicken have plans of their own; Wednesday's
  // leftovers come from no meal, so they can be these
  assert.deepEqual(dinner.map((c) => c && c.date), [null, null, at(3), null]);
  // only the meals the board shows
  assert.deepEqual(plain(r.extraGrid(SUN, 'dinner', ['dinner'])).rows.map((x) => x.slot), ['dinner']);
  // a lunch covers the same day's dinner, and a breakfast only breakfasts
  assert.deepEqual(plain(r.extraGrid(at(5), 'lunch', ['breakfast', 'lunch', 'dinner'])).days[0], at(5));
  r.commitMeals((st) => r.putMeal(st, at(5), 'breakfast', { name: 'Overnight oats', how: 'home' }));
  assert.deepEqual(plain(r.extraGrid(at(5), 'breakfast', ['breakfast', 'lunch', 'dinner'])).rows.map((x) => x.slot), ['breakfast']);
  // something not being cooked covers nothing
  assert.deepEqual(plain(r.extraGrid(at(2), 'dinner', ['lunch', 'dinner'])).rows, []);
  // the days already over aren't offered
  const later = load(sample(), at(3));
  later.commitMeals((st) => later.putMeal(st, at(1), 'dinner', Object.assign({}, later.mealAt(at(1), 'dinner'))));
  assert.deepEqual(plain(later.extraGrid(at(1), 'dinner', ['lunch'])).rows[0].cells.map((c) => c && c.date), [null, at(3), at(4), at(5)]);
});

test('leftovers follow their meal when it moves, and let go when it moves after them', () => {
  const r = load(sample());
  chicken(r);
  r.commitMeals((st) => M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }]));
  // moved to Saturday before: both lunches still come after it
  const links = r.linkedNow();
  r.commitMeals((st) => { const a = r.mealAt(SUN, 'dinner'); r.putMeal(st, at(-1), 'dinner', a); r.putMeal(st, SUN, 'dinner', null); r.followMoves(st, [[{ d: SUN, k: 'dinner' }, { d: at(-1), k: 'dinner' }]]); });
  assert.deepEqual(plain(r.SR.state.meals[at(1)].lunch.from), { date: at(-1), slot: 'dinner' });
  assert.equal(M.servingsOf(r.SR.state, at(-1), 'dinner'), 3);
  assert.deepEqual(plain(r.letGoSince(links)), []);
  // swapped with Monday's tacos: Monday lunch now comes before it, Tuesday lunch still after
  const links2 = r.linkedNow();
  r.commitMeals((st) => { const a = r.mealAt(at(-1), 'dinner'), b = r.mealAt(at(1), 'dinner'); r.putMeal(st, at(1), 'dinner', a); r.putMeal(st, at(-1), 'dinner', b); r.followMoves(st, [[{ d: at(-1), k: 'dinner' }, { d: at(1), k: 'dinner' }], [{ d: at(1), k: 'dinner' }, { d: at(-1), k: 'dinner' }]]); });
  assert.equal(r.SR.state.meals[at(2)].lunch.from.date, at(1));
  assert.deepEqual(plain(r.letGoSince(links2)), [{ date: at(1), slot: 'lunch' }]);
  assert.deepEqual(plain(r.SR.state.meals[at(1)].lunch), { name: '', how: 'leftovers' });
});

test('the week’s batch cooks and their Meal prep blocks: before the meal, in quiet time, where nothing moves', () => {
  const r = load(sample());
  chicken(r, NEXT);
  r.commitMeals((st) => M.cookExtra(st, { date: NEXT, slot: 'dinner' }, [{ date: at(8), slot: 'lunch' }, { date: at(9), slot: 'lunch' }]));
  const list = plain(r.batchCooks(M.range(NEXT, 7)));
  assert.deepEqual(list.map((b) => [b.date, b.slot, b.name, b.serves]), [[NEXT, 'dinner', 'Chicken and rice', 3]]);
  const b = r.batchCooks(M.range(NEXT, 7))[0];
  assert.equal(r.prepOf(b), null);
  const spot = plain(r.prepSpot(b));
  assert.equal(spot.date, NEXT);
  assert.ok(spot.start >= 720 && spot.start + 90 <= 1080, 'Sunday afternoon, done before the 6 pm Dinner block');
  const add = plain(r.prepAdd(b));
  assert.deepEqual(add.src, { type: 'prep', week: NEXT });
  assert.deepEqual(add.makes, [{ date: NEXT, slot: 'dinner', name: 'Chicken and rice' }, { date: at(8), slot: 'lunch', name: 'Leftovers: Chicken and rice' }, { date: at(9), slot: 'lunch', name: 'Leftovers: Chicken and rice' }]);
  const hard = (st) => M.calendarDay(st, NEXT).blocks.filter((x) => !(x.src && x.src.type === 'prep')).map((x) => x.key + '@' + x.start + '+' + x.dur).sort().join();
  const was = hard(r.SR.state);
  let put = null;
  r.commitMeals((st) => { put = M.applyPrepPlan(st, { list: [], block: { date: spot.date, start: spot.start, dur: 90, add: r.prepAdd(b) } }, { block: true }).block; return put ? { ok: true } : false; });
  assert.ok(put && put.start === spot.start);
  assert.equal(hard(r.SR.state), was, 'nothing moved for it');
  assert.equal(r.prepOf(r.batchCooks(M.range(NEXT, 7))[0]).add.id, put.id, 'the batch cook finds its block');
  // a weekday dinner with work all afternoon has no quiet time for one, and says so rather than moving things
  chicken(r, at(4));
  r.commitMeals((st) => M.cookExtra(st, { date: at(4), slot: 'dinner' }, [{ date: at(5), slot: 'lunch' }]));
  assert.equal(r.prepSpot(r.batchCooks(M.range(SUN, 7)).find((x) => x.date === at(4))), null);
  // a batch cook that's over isn't one to plan for
  const later = load(r.SR.state, at(5));
  assert.deepEqual(plain(later.batchCooks(M.range(SUN, 7))), []);
});

test('a prep week to look at: the plan’s words, one batch cook covers, and a night with no time for dinner left out', () => {
  const r = load(sample());
  const look = r.prepLook(NEXT);
  assert.equal(look.cells.size, look.plan.list.length, 'everything in it fits');
  assert.equal(r.prepWords(look), look.plan.message);
  assert.ok(look.block && look.block.date === NEXT);
  // one batch cook, said with a verb that agrees
  const one = load(sample(), at(3));
  const l1 = one.prepLook(SUN);
  assert.match(l1.plan.message, /^One batch cook, Thursday, cover /, 'the plan’s own words');
  assert.match(one.prepWords(l1), /^One batch cook, Thursday, covers 2 more meals/);
  // a template dinner taken off one night can come back, so that night can still take one
  const off = sample(), wed = at(10);
  off.dates[wed] = { edits: {} };
  M.templateFor(off, wed).blocks.filter((x) => x.dinner).forEach((x) => { off.dates[wed].edits[x.id] = { gone: true }; });
  assert.ok(load(off).prepLook(NEXT).cells.has(wed + '|dinner'));
  // a night with no Dinner block and no room for one (a conference all day) leaves its dinner out, and the
  // batch's leftovers with it
  const tight = sample();
  const tpl = M.templateFor(tight, wed);
  tpl.blocks = tpl.blocks.filter((x) => !x.dinner);
  tight.events.push({ id: 'allday', kind: 'timed', name: 'Conference', date: wed, start: 300, dur: 1140, cat: 'work', icon: 'star' });
  const t = load(tight), busy = t.prepLook(NEXT);
  assert.equal(t.canDinner(wed), false);
  assert.ok(!busy.cells.has(wed + '|dinner'));
  assert.ok(![...busy.cells.values()].some((x) => x.kind === 'leftovers' && x.meal.from.date === wed), 'its leftovers go with it');
  assert.ok(busy.block, 'Sunday’s Meal prep block is Sunday’s batch, so it stays');
  assert.match(t.prepWords(busy), /Wednesday has no time for dinner, so it’s left out\.$/);
});

test('the grocery list buys for every meal a dish feeds: a line knows its meals and how many they feed', () => {
  const r = load(sample());
  chicken(r);
  r.commitMeals((st) => M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }]));
  const { list } = r.shopList(M.range(SUN, 7));
  const line = plain(list.find((x) => x.id === 'chicken'));
  const use = (name) => line.uses.find((u) => u.meal === name);
  assert.deepEqual(use('Chicken and rice'), { meal: 'Chicken and rice', days: ['Sun'], n: 1, serves: 3 }, 'one dinner, three meals');
  assert.deepEqual(use('Sheet pan chicken'), { meal: 'Sheet pan chicken', days: ['Thu'], n: 1, serves: 1 });
  // the leftovers themselves buy nothing
  assert.ok(!list.some((x) => x.uses.some((u) => /^Leftovers/.test(u.meal))));
});

test('food dropped on a dinner (app.js): Leftovers on leftovers keeps where they come from, and any change syncs', () => {
  const st = sample();
  st.dinners[SUN] = { name: 'Chicken and rice', cook: 'me', items: ['chicken'] };
  M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(5), slot: 'dinner' }]);
  const script = `
    const FEEL = true;
    let state = __board;
    const notes = [];
    function commit(fn) { const snap = JSON.stringify(state); let r; try { r = fn(); } catch (e) { state = JSON.parse(snap); throw e; } if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; } return r; }
    const mealIdea = () => false, dinnerFromIdea = () => {}, noteMove = () => {}, openSel = () => {}, cookName = (c) => c, whenWord = (d) => d;
    const Snd = { clack() {} };
    function toast(text) { notes.push(text); }
    ${app('  /* V11: someone who lives with you (\'p:\' and their id) is cooking too */', '  /* V11: a dinner idea from People')}
    ({ get state() { return state; }, setDinnerFrom, notes });`;
  const r = runInNewContext(script, { M, window: {}, __board: st, console });
  r.setDinnerFrom(at(5), { kind: 'dish', how: 'leftovers' });
  assert.deepEqual(plain(r.state.dinners[at(5)]), { name: 'Leftovers: Chicken and rice', cook: 'leftovers', items: [], from: { date: SUN, slot: 'dinner' } }, 'kept as it was');
  // a recipe dropped on Sunday's dinner: its leftovers take the new name in the same change
  r.state.recipes = (r.state.recipes || []).concat({ id: 'stew', name: 'Beef stew', items: ['beef'] });
  r.setDinnerFrom(SUN, { kind: 'recipe', id: 'stew' });
  assert.equal(r.state.dinners[at(5)].name, 'Leftovers: Beef stew');
  // ordering in instead: its leftovers stay leftovers, from no meal
  r.setDinnerFrom(SUN, { kind: 'dish', how: 'order' });
  assert.deepEqual(plain(r.state.dinners[at(5)]), { name: '', cook: 'leftovers', items: [] });
});

test('the reset’s count: a leftovers meal is a meal planned, as the engine counts it', () => {
  const r = load(sample());
  chicken(r, NEXT);
  const parts = [
    variant('    const MEAL_KINDS = [', '    /* every meal change goes through the board\'s commit'),
    variant('    const dinnerOf = (d) =>', '    /* a night with no Dinner block gets one'),
    variant('    /* V11: how many of a week\'s meals are planned', '    /* V11: every meal on the board, as a fingerprint')
  ];
  const count = () => runInNewContext('let oldMeals = null;\n' + parts.join('\n') + '\n({ mealCount });', { M, SR: r.SR, console }).mealCount(M.range(NEXT, 7), ['lunch', 'dinner']);
  const was = plain(count()).n;
  r.commitMeals((st) => M.cookExtra(st, { date: NEXT, slot: 'dinner' }, [{ date: at(8), slot: 'lunch' }, { date: at(9), slot: 'lunch' }]));
  assert.equal(plain(count()).n, was + 2);
  // and once its meal is gone they're still decided: leftovers from no meal
  r.commitMeals((st) => r.putMeal(st, NEXT, 'dinner', null));
  assert.equal(plain(count()).n, was + 1, 'the dinner is gone, both lunches still count');
});
