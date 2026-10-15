// V11 goals: cook once, eat twice. Leftovers know the meal they come from (Model.cookExtra, servingsOf,
// leftoversOf, syncLeftovers), the grocery list says how many servings each line feeds (Model.groceries),
// and a prep week is suggested from the home's own meals first (Model.prepPlan, applyPrepPlan).
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const SUN = '2026-10-11';
const at = (n) => M.addDays(SUN, n);
const NEXT = at(7);
const sample = () => D.sampleState(SUN);
const hard = (st, d) => M.calendarDay(st, d).blocks.filter((b) => !b.soft && !(b.src && b.src.type === 'prep')).map((b) => b.key + '@' + b.start + '+' + b.dur).sort();

test('cook extra: later meals become leftovers of the meal they come from', () => {
  const st = sample();
  st.dinners[SUN] = { name: 'Chicken and rice', cook: 'me', items: ['chicken', 'rice', 'broccoli'] };
  const r = M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }, { date: at(5), slot: 'dinner' }, { date: at(-1), slot: 'lunch' }, { date: SUN, slot: 'lunch' }]);
  assert.equal(r.ok, true);
  assert.equal(r.linked, 3, 'only meals after it');
  assert.equal(r.name, 'Leftovers: Chicken and rice');
  assert.deepEqual(st.meals[at(1)].lunch, { name: 'Leftovers: Chicken and rice', how: 'leftovers', from: { date: SUN, slot: 'dinner' } });
  assert.deepEqual(st.dinners[at(5)], { name: 'Leftovers: Chicken and rice', cook: 'leftovers', items: [], from: { date: SUN, slot: 'dinner' } }, 'a dinner keeps the board’s own shape');
  assert.equal(st.meals[at(-1)], undefined);
  assert.deepEqual(M.leftoversOf(st, SUN, 'dinner'), [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }, { date: at(5), slot: 'dinner' }]);
  // a leftovers dinner is a decided dinner on the board
  const fri = M.calendarDay(st, at(5)).blocks.find((b) => b.dinner);
  assert.ok(fri.planned && fri.label === 'Leftovers: Chicken and rice' && fri.cook === 'leftovers');
  // only cooking makes leftovers
  assert.equal(M.cookExtra(st, { date: at(2), slot: 'dinner' }, [{ date: at(3), slot: 'lunch' }]).ok, false, 'ordering in makes none');
  assert.equal(M.cookExtra(st, { date: at(9), slot: 'dinner' }, [{ date: at(10), slot: 'lunch' }]).ok, false, 'no meal, no leftovers');
  // breakfast and lunch cook extra too
  st.meals[at(3)] = { lunch: { name: 'Lentil soup', items: ['onion'] } };
  assert.equal(M.cookExtra(st, { date: at(3), slot: 'lunch' }, [{ date: at(3), slot: 'dinner' }]).linked, 1);
  assert.equal(st.dinners[at(3)].name, 'Leftovers: Lentil soup');
});

test('servings: the meal and its leftovers', () => {
  const st = sample();
  st.dinners[SUN] = { name: 'Turkey chili', cook: 'kim', items: ['turkey', 'beans', 'peppers', 'onion'] };
  assert.equal(M.servingsOf(st, SUN, 'dinner'), 1);
  M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }]);
  assert.equal(M.servingsOf(st, SUN, 'dinner'), 3);
  assert.equal(M.servingsOf(st, at(1), 'lunch'), 1, 'a leftovers lunch is one serving');
  assert.equal(M.servingsOf(st, at(9), 'dinner'), 0);
  // a leftovers lunch changed to something else stops counting
  st.meals[at(2)].lunch = Object.assign({}, st.meals[at(2)].lunch, { how: 'out', name: 'Pizza place' });
  assert.equal(M.servingsOf(st, SUN, 'dinner'), 2);
});

test('groceries say how many servings each line feeds, and the cart counts the same as before', () => {
  const st = sample(), week = M.range(SUN, 7);
  st.dinners[SUN] = { name: 'Chicken and rice', cook: 'me', items: ['chicken', 'rice', 'broccoli'] };
  const before = M.groceryProgress(st, week);
  M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }]);
  const after = M.groceryProgress(st, week);
  assert.deepEqual(after.list.map((x) => x.id), before.list.map((x) => x.id), 'leftovers add nothing to buy');
  assert.equal(after.total, before.total);
  const chicken = after.list.find((x) => x.id === 'chicken');
  assert.deepEqual(chicken.servings, [{ date: SUN, slot: 'dinner', serves: 3 }, { date: at(4), slot: 'dinner', serves: 1 }], 'Sunday’s and Thursday’s');
  assert.equal(chicken.serves, 4);
  assert.deepEqual(chicken.days, [SUN, at(4)]);
  assert.equal(after.list.find((x) => x.id === 'rice').serves, 3);
  st.shopping[M.weekStart(SUN)] = { chicken: true };
  assert.equal(M.groceryProgress(st, week).got, 1);
  assert.equal(M.groceryProgress(st, week).left, after.total - 1);
});

test('when the meal a leftover comes from changes or goes, its leftovers follow sensibly', () => {
  const st = sample();
  st.dinners[SUN] = { name: 'Chicken and rice', cook: 'me', items: ['chicken', 'rice'] };
  M.cookExtra(st, { date: SUN, slot: 'dinner' }, [{ date: at(1), slot: 'lunch' }, { date: at(2), slot: 'lunch' }, { date: at(5), slot: 'dinner' }]);
  assert.equal(M.syncLeftovers(st), 0, 'nothing to change');
  st.meals[at(2)].lunch.name = 'Rice bowls';
  st.dinners[SUN].name = 'Chicken, rice, and broccoli';
  assert.equal(M.syncLeftovers(st), 2);
  assert.equal(st.meals[at(1)].lunch.name, 'Leftovers: Chicken, rice, and broccoli', 'a new name follows');
  assert.equal(st.meals[at(2)].lunch.name, 'Rice bowls', 'a name you gave it stays');
  // ordering in instead: the leftovers stay leftovers, without a name or a link
  st.dinners[SUN] = { name: 'Thai place', cook: 'order', items: [] };
  M.syncLeftovers(st);
  assert.deepEqual(st.meals[at(1)].lunch, { name: '', how: 'leftovers' });
  assert.deepEqual(st.meals[at(2)].lunch, { name: 'Rice bowls', how: 'leftovers' });
  assert.deepEqual(st.dinners[at(5)], { name: '', cook: 'leftovers', items: [] }, 'still a decided dinner');
  // cleared: the same
  st.dinners[at(1)] = { name: 'Stew', cook: 'me', items: [] };
  M.cookExtra(st, { date: at(1), slot: 'dinner' }, [{ date: at(3), slot: 'lunch' }]);
  delete st.dinners[at(1)];
  M.syncLeftovers(st);
  assert.deepEqual(st.meals[at(3)].lunch, { name: '', how: 'leftovers' });
  assert.equal(M.syncLeftovers(st), 0, 'calling it again changes nothing');
});

test('a prep week from the sample: two batch cooks with their leftovers, and fresh nights, not applied', () => {
  const st = sample(), before = JSON.stringify(st);
  const plan = M.prepPlan(st, NEXT, { today: SUN }, D);
  assert.equal(JSON.stringify(st), before, 'a suggestion changes nothing');
  assert.equal(plan.week, NEXT);
  assert.deepEqual(plan.batches.map((b) => M.weekday(b.date)), [0, 3], 'Sunday and Wednesday dinners');
  assert.deepEqual(plan.batches.map((b) => b.name), ['Sheet pan chicken', 'Turkey chili'], 'the home’s own meals first');
  assert.ok(plan.batches.every((b) => b.source === 'yours' && !b.keep && b.slot === 'dinner'));
  for (const [i, b] of plan.batches.entries()) {
    assert.ok(b.makes.length >= 2 && b.makes.length <= 3, b.name + ' covers two or three meals');
    const next = plan.batches[i + 1] ? plan.batches[i + 1].date : M.addDays(NEXT, 7);
    assert.ok(b.makes.every((x) => x.date > b.date && x.date < next), 'later, before the next batch');
  }
  assert.deepEqual(plan.batches[0].makes, [{ date: at(8), slot: 'lunch' }, { date: at(9), slot: 'lunch' }], 'Monday and Tuesday lunch');
  assert.equal(plan.batches[1].makes.length, 3, 'Wednesday’s covers Thursday to Saturday');
  const fresh = plan.fresh.map((f) => f.date);
  assert.ok(fresh.length >= 3 && fresh.every((d) => !plan.batches.some((b) => b.date === d)));
  assert.ok(plan.fresh.every((f) => f.name), 'fresh nights from the home’s own meals');
  assert.deepEqual(plan.list.map((x) => x.kind), ['batch', 'leftovers', 'leftovers', 'batch', 'leftovers', 'leftovers', 'leftovers'].concat(fresh.map(() => 'fresh')));
  const left = plan.list.find((x) => x.kind === 'leftovers');
  assert.deepEqual(left.meal, { name: 'Leftovers: Sheet pan chicken', how: 'leftovers', from: { date: NEXT, slot: 'dinner' } });
  /* (the rituals walk: nobody is picked to cook it; who cooks is asked, so the batch dinner's cook is empty) */
  assert.deepEqual(plan.list[0].meal, { name: 'Sheet pan chicken', cook: '', items: ['chicken', 'broccoli', 'sweetpotato'], recipe: 'sheetpan' });
  assert.equal(plan.message, 'Two batch cooks, Sunday and Wednesday, cover 5 more meals, with ' + fresh.length + ' fresh nights.');
  // a Meal prep block for Sunday afternoon, with what it makes
  assert.equal(plan.block.date, NEXT);
  assert.ok(plan.block.start >= 720 && plan.block.start < 1080);
  assert.deepEqual(plan.block.add.src, { type: 'prep', week: NEXT });
  assert.deepEqual(plan.block.add.makes.map((x) => x.slot), ['dinner', 'lunch', 'lunch']);
});

test('applying a prep week fills only empty meals, links the leftovers, and puts Meal prep where nothing moves', () => {
  const st = sample();
  const plan = M.prepPlan(st, NEXT, { today: SUN }, D);
  st.dinners[at(12)] = { name: 'Pizza night', cook: 'order', items: [] };
  const was = hard(st, NEXT);
  const r = M.applyPrepPlan(st, plan, { block: true });
  assert.equal(r.meals, plan.list.length - (plan.list.some((x) => x.date === at(12) && x.slot === 'dinner') ? 1 : 0));
  assert.equal(st.dinners[at(12)].name, 'Pizza night', 'a meal planned since stays');
  assert.equal(M.servingsOf(st, NEXT, 'dinner'), 3);
  assert.equal(M.servingsOf(st, at(10), 'dinner'), 4, 'Wednesday’s chili feeds four meals');
  assert.equal(st.meals[at(8)].lunch.name, 'Leftovers: Sheet pan chicken');
  assert.ok(r.block && r.block.src.type === 'prep' && r.block.cat === 'meals');
  assert.deepEqual(hard(st, NEXT), was, 'nothing moved for it');
  const chili = M.groceries(st, M.range(NEXT, 7)).find((x) => x.id === 'turkey');
  assert.equal(chili.serves, 4);
  // the block is safe everywhere a placed block is
  assert.ok(!M.placements(st).has(NEXT));
  M.applyPreset(st, NEXT, D.PRESETS.find((p) => p.id === 'usual'), st.palette);
  assert.ok((st.dates[NEXT].adds || []).some((a) => a.src.type === 'prep'), 'your usual keeps Meal prep');
  assert.ok(M.calendarDay(st, NEXT).blocks.some((b) => b.src && b.src.type === 'prep' && b.makes.length === 3));
});

test('a batch-friendly dinner already planned is the batch cook, and a home that leaves things out gets meals without them', () => {
  const st = sample();
  st.dinners[NEXT] = { name: 'Beef stew', cook: 'me', items: ['beef', 'potatoes', 'onion'] };
  const plan = M.prepPlan(st, NEXT, { today: SUN }, D);
  assert.equal(plan.batches[0].name, 'Beef stew');
  assert.equal(plan.batches[0].keep, true);
  assert.ok(!plan.list.some((x) => x.kind === 'batch' && x.date === NEXT), 'kept as it is');
  assert.ok(plan.list.some((x) => x.kind === 'leftovers' && x.meal.from.date === NEXT));
  const veg = sample();
  veg.recipes = []; veg.dinners = {};
  veg.mealbook = { diet: 'vegetarian', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'] };
  const vp = M.prepPlan(veg, NEXT, { today: SUN }, D);
  assert.equal(vp.batches.length, 2);
  for (const b of vp.batches) {
    const m = D.BATCH.meals.find((x) => x.name === b.name);
    assert.ok(m && !m.has.some((h) => veg.mealbook.out.includes(h)), b.name);
    assert.equal(b.source, 'list');
  }
  // a Monday week cooks Monday and Thursday; a trip day gets nothing
  const mon = sample();
  mon.events.push({ id: 'away', kind: 'trip', name: 'Away', icon: 'plane', date: at(13), end: at(13), leave: 450, back: 1020 });
  const mp = M.prepPlan(mon, at(8), { today: SUN }, D);
  assert.deepEqual(mp.batches.map((b) => M.weekday(b.date)), [1, 4]);
  assert.ok(!mp.list.some((x) => x.date === at(13)));
});
