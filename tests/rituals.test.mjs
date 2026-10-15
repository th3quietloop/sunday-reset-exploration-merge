// V11, the rituals walk (Oct 15, docs/walk/reset-meals-settings.md): the Sunday Reset, meals, and Settings as the
// people who use them found them. What's held here: the reset's day and time on the board with the device's copy as
// the fallback (resetAtNow), Look back finding the notes from before a skipped Sunday (lastSaid), the rest of the
// week starting tomorrow once tonight's dinner is over (restFrom), who cooks counted before the week is set
// (weekCounts noCook, stillOpen, finishData ask), a to-do for a date that's over asking done or let go (dateGone),
// a prep week of two different dishes with nobody picked to cook and the Meal prep block right before dinner
// (Model.prepPlan), things to get that aren't for a meal (Model.groceryProgress), and the two Dev boards the walk
// added (Batch cook week, Resets with a Sunday skipped). The boards are made up: the sample family (Alex, Sam,
// Robin) and Jordan, Riley, and Avery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { M, D, app, variant, plain, finishRig, appRig, srOf } from './v11-rig.mjs';

await import('../board/src/scenarios.js');
const S = globalThis.Scenarios;

const SUN = '2026-10-11', at = (n) => M.addDays(SUN, n), NEXT = at(7);

/* the app's reset rules for a board, today, a time of day, and this device's Getting started (moves) */
function resetRig(board, today, nowMin, moves) {
  const parts = [
    app('  const cap = (s) =>', '  /* V11: the part of the board for time with people is People'),
    app('  const plural = (n, one, many) =>'),
    app('  const modules = () =>', '  /* a date said the way a person would'),
    app('  /* V11: anyone grown up at home can cook', '  /* a dinner whose time is over isn\'t a question'),
    app('  const dinnerOver = (b, date) =>'),
    app('  const cooking = (c) =>'),
    app('  const RESET_DAYS = [6, 0, 1];', '  /* Wednesday and Thursday, with this week\'s reset not done'),
    app('  function stillOpen(c, ws) {', '  function stat(big, label, small)'),
    app('  /* What a week holds, counted the way the tray and the board count', '  /* == V11: People =='),
    app('  function lastSaid(ws) {', '  /* V11: the Your time step, laid out to read in one look.')
  ];
  const script = `
    const FEEL = true;
    let state = __board, today = __today, nowMin = __now, moves = __moves;
    const view = { got: {} };
    const day = (d) => M.calendarDay(state, d);
    ${parts.join('\n')}
    ({ resetAtNow, resetWhenWords, restFrom, lastSaid, weekCounts, stillOpen, dateGone, cookChoices });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin == null ? 600 : nowMin, __moves: moves || null, console });
}

test('the reset’s day and time live on the board; the device’s copy from the setup is the fallback', () => {
  const st = D.sampleState(SUN);
  // nothing said anywhere: Sunday at 7 pm, and it says it wasn't set
  assert.deepEqual(plain(resetRig(st, SUN).resetAtNow()), { day: 0, min: 1140, set: false, board: false });
  // the setup's answer kept on this device (Getting started), from before the board kept it
  const dev = resetRig(st, SUN, 600, { resetAt: { day: 1, min: 1200 } });
  assert.deepEqual(plain(dev.resetAtNow()), { day: 1, min: 1200, set: true, board: false });
  // Getting started tried in Dev isn't anyone's answer
  assert.equal(resetRig(st, SUN, 600, { dev: true, resetAt: { day: 1, min: 1200 } }).resetAtNow().set, false);
  // on the board it wins, and goes wherever the board goes (a backup, the household)
  st.settings.resetAt = { day: 6, min: 1170 };
  const r = resetRig(st, SUN, 600, { resetAt: { day: 1, min: 1200 } });
  assert.deepEqual(plain(r.resetAtNow()), { day: 6, min: 1170, set: true, board: true });
  assert.equal(r.resetWhenWords(r.resetAtNow()), 'Saturdays at ' + M.clock(1170));
  // a day the reset can't be on, or a time that isn't one, falls back
  for (const bad of [{ day: 3, min: 1140 }, { day: 0, min: 1500 }, { day: 0 }, null]) {
    st.settings.resetAt = bad;
    assert.equal(resetRig(st, SUN).resetAtNow().board, false, JSON.stringify(bad));
  }
  // an older build's board has no resetAt at all, and a newer one's is an optional field the migration leaves alone
  const old = D.sampleState(SUN);
  assert.equal(old.settings.resetAt, undefined);
  assert.equal(D.migrate(JSON.parse(JSON.stringify(Object.assign(old, { settings: Object.assign({}, old.settings, { resetAt: { day: 6, min: 1170 } }) })))).settings.resetAt.day, 6);
});

test('Look back finds the last notes from before a skipped Sunday, and says when they were written', () => {
  const st = S.build('skipped', D, M, SUN, null), ws = M.weekStart(SUN);
  const r = resetRig(st, SUN);
  const said = plain(r.lastSaid(ws));
  assert.equal(said.ws, M.addDays(ws, -14), 'two weeks back: last week was skipped');
  assert.equal(said.on, M.addDays(ws, -14));
  assert.deepEqual([said.rec.keep, said.rec.change], ['Date night on Friday', 'Less takeout midweek']);
  // a note kept in a week that came later is the one shown, with the day it was written
  st.weeks[M.addDays(ws, -7)] = { reset: { step: 0, done: false, keep: 'Walks after dinner', saidOn: M.addDays(ws, -5) } };
  assert.deepEqual(plain(r.lastSaid(ws)).on, M.addDays(ws, -5));
  // nothing kept in eight weeks is nothing to show
  assert.equal(resetRig(st, M.addDays(SUN, 7 * 12)).lastSaid(M.addDays(ws, 7 * 12)), null);
});

test('the rest of the week starts tomorrow once tonight’s dinner is over, or at 8 pm with no dinner', () => {
  const st = D.sampleState(SUN), wed = at(3);
  const db = M.calendarDay(st, wed).blocks.find((b) => b.dinner);
  assert.ok(db, 'the sample has a Dinner block on Wednesday');
  assert.equal(resetRig(st, wed, db.start).restFrom(), wed, 'at dinner, tonight is still in it');
  assert.equal(resetRig(st, wed, db.start + db.dur).restFrom(), at(4), 'once it’s over, tomorrow');
  // a day with no Dinner block: 8 pm
  st.settings.modules = Object.assign({}, st.settings.modules, { dinners: false });
  const none = M.calendarDay(st, wed).blocks.find((b) => b.dinner);
  if (!none) {
    assert.equal(resetRig(st, wed, 20 * 60 - 1).restFrom(), wed);
    assert.equal(resetRig(st, wed, 20 * 60).restFrom(), at(4));
  }
});

test('who cooks is part of a dinner decided before the week is set, and Anyone is an answer', () => {
  const st = D.sampleState(SUN), ws = NEXT;
  M.range(ws, 7).forEach((d) => { delete st.dinners[d]; });
  st.dinners[at(8)] = { name: 'Tacos', cook: '', items: [] };
  st.dinners[at(9)] = { name: 'Turkey chili', cook: 'home', items: [] };
  st.dinners[at(10)] = { name: 'Soup', cook: 'kim', items: [] };
  st.dinners[at(11)] = { name: '', cook: 'order', items: [] };
  st.dinners[at(12)] = { name: 'Pasta bake', items: [] };
  const r = resetRig(st, SUN, 600);
  const c = plain(r.weekCounts(ws));
  assert.deepEqual(c.noCook, [at(8), at(12)], 'a dish with nobody cooking it; Anyone and ordering in are answers');
  const open = plain(r.stillOpen(c, ws));
  const cook = open.find((x) => x.cook);
  assert.deepEqual(cook, { text: '2 nights have no cook yet', short: '2 cooks to pick', step: 'dinners', cook: true });
  // one night says has
  st.dinners[at(12)].cook = 'me';
  assert.equal(plain(r.stillOpen(r.weekCounts(ws), ws)).find((x) => x.cook).text, '1 night has no cook yet');
  // tonight's dinner, once its time is over, isn't asked about
  const db = M.calendarDay(st, at(8)).blocks.find((b) => b.dinner);
  assert.deepEqual(plain(resetRig(st, at(8), db.start + db.dur).weekCounts(ws).noCook), []);
  assert.deepEqual(plain(resetRig(st, at(8), db.start).weekCounts(ws).noCook), [at(8)]);
  // someone on their own has nobody to ask
  const solo = D.buildState({ name: 'Jordan', kids: [], wake: { wd: 420, we: 480 }, bed: { wd: 1410, we: 1410 }, work: { days: [1, 2, 3, 4], start: 540, end: 900, hours: {} }, cares: [], help: { dinners: true, together: true } }, SUN);
  solo.dinners[at(8)] = { name: 'Tacos', cook: '', items: [] };
  const sr = resetRig(solo, SUN, 600);
  assert.equal(sr.cookChoices().length, 1);
  assert.deepEqual(plain(sr.weekCounts(ws).noCook), []);
});

test('the finish asks who cooks a dish nobody is cooking, and leaves out tonight once it’s over and empty', () => {
  const today = '2026-10-14', ws = M.weekStart(today);
  const st = D.sampleState(today);
  st.dinners['2026-10-16'] = { name: 'Pasta bake', cook: '', items: [] };
  const rig = appRig(st, today, 600);
  const f = plain(finishRig(srOf(rig)).finishData(ws));
  const fri = f.dinners.find((x) => x.day === 'Fri');
  assert.deepEqual([fri.name, fri.who, fri.ask], ['Pasta bake', null, true], 'no pill, and asked');
  assert.ok(f.dinners.filter((x) => x.day !== 'Fri').every((x) => !x.ask));
  // Wednesday with nothing on it, after its dinner time: gone, not Open
  delete st.dinners[today];
  const db = M.calendarDay(st, today).blocks.find((b) => b.dinner);
  const late = plain(finishRig(srOf(appRig(st, today, db.start + db.dur))).finishData(ws));
  assert.equal(late.dinners.some((x) => x.day === 'Wed'), false);
  const early = plain(finishRig(srOf(appRig(st, today, db.start - 60))).finishData(ws));
  assert.equal(early.dinners.find((x) => x.day === 'Wed').state, 'open');
});

/* the finish's plan of the week and its words to send (variant.js finishData, keptWords, planText) */
function planRig(SR) {
  const parts = [
    'let oldMeals = null;',
    variant('    const MEAL_KINDS = [', '    /* every meal change goes through the board\'s commit'),
    variant('    const dinnerOf = (d) =>', '    /* a night with no Dinner block gets one'),
    variant('    const partnerName = () =>'),
    variant('    const cookNamed = (id) => {', '    /* V11: one name per step everywhere it shows'),
    variant('    const plural = (n, one, many) =>', '    /* what the green card says'),
    variant('    /* what the green card says', '    /* nothing planned yet and nothing due'),
    variant('    function planText(f, name) {', '    /* V11 (the rituals walk): the plan as words: the share sheet')
  ];
  return runInNewContext(parts.join('\n') + '\n({ finishData, planText });', { M, SR, console });
}

test('the plan sent as words says each night’s dinner and who cooks it, and that there’s a grocery list', () => {
  const today = '2026-10-14', ws = M.weekStart(today);
  const st = D.sampleState(today);
  const SR = Object.assign(srOf(appRig(st, today, 600)), { weekWords: () => 'this week' });
  const P = planRig(SR);
  const text = P.planText(P.finishData(ws), 'Alex');
  const lines = text.split('\n');
  assert.equal(lines[0], 'Alex’s week, ' + M.spanText(ws, M.addDays(ws, 6)));
  const meals = lines.find((l) => l.startsWith('Meals: '));
  assert.ok(meals && /Tacos, (Alex cooks|I cook)/.test(meals) && /Sheet pan chicken, Sam cooks/.test(meals), meals);
  assert.ok(lines.some((l) => /^Groceries: \d+ things? to get\.$/.test(l)), text);
  assert.equal(lines[lines.length - 1], 'Planned with Sunday Reset');
  assert.ok(!/[\u2013\u2014]|--/.test(text), 'no dashes');
});

test('a to-do made for a date that’s over asks done or let go, and isn’t a to-do that needs a time', () => {
  const today = '2026-11-08', ws = M.weekStart(today);
  const st = D.sampleState(today);
  st.tasks.push({ id: 'tcost', name: 'Costumes for Halloween', group: st.groups[0].id, icon: 'check', cat: 'family', dur: 60, due: '2026-10-30', repeat: null, done: false, steps: [] });
  st.tasks.push({ id: 'tgift', name: 'Gift for Grandma Jo', group: st.groups[0].id, icon: 'gift', cat: 'family', dur: 30, due: '2026-11-12', repeat: null, done: false, steps: [] });
  st.events.push({ id: 'ehal', kind: 'marker', name: 'Halloween', icon: 'star', date: '2026-10-31', yearly: true, prep: { 'costume@2026-10-31': 'tcost' } });
  st.events.push({ id: 'ejo', kind: 'marker', name: 'Grandma Jo’s birthday', icon: 'star', date: '2026-11-25', prep: { 'gift@2026-11-25': 'tgift' } });
  const r = resetRig(st, today, 600);
  assert.deepEqual(plain(r.dateGone(st.tasks.find((t) => t.id === 'tcost'))), { name: 'Halloween', on: '2026-10-31' });
  assert.equal(r.dateGone(st.tasks.find((t) => t.id === 'tgift')), null, 'a date still ahead');
  assert.equal(r.dateGone(st.tasks.find((t) => t.name !== 'Costumes for Halloween' && t.id !== 'tgift')), null, 'a to-do from nowhere in particular');
  const c = r.weekCounts(ws);
  assert.deepEqual(plain(c.over.map((x) => x.task.id)), ['tcost']);
  assert.ok(!c.unplaced.some((x) => x.task.id === 'tcost'), 'not counted as needing a time');
  assert.ok(c.unplaced.some((x) => x.task.id === 'tgift'));
  // done, it's nothing to ask about
  st.tasks.find((t) => t.id === 'tcost').done = true;
  assert.equal(r.dateGone(st.tasks.find((t) => t.id === 'tcost')), null);
});

test('a prep week is two different dishes, never one already in the week, with nobody picked to cook', () => {
  const st = D.sampleState(SUN);
  st.dinners[at(9)] = { name: 'Sheet pan chicken', cook: 'me', items: ['chicken'] };
  const plan = M.prepPlan(st, NEXT, { today: SUN }, D);
  const cooked = plan.list.filter((x) => x.kind !== 'leftovers');
  const names = cooked.map((x) => x.name.toLowerCase());
  assert.equal(plan.batches.length, 2);
  assert.notEqual(plan.batches[0].name, plan.batches[1].name);
  assert.ok(!names.includes('sheet pan chicken'), 'Tuesday has it already');
  assert.equal(new Set(names).size, names.length, 'no dish twice');
  assert.ok(cooked.every((x) => x.meal.cook === ''), 'who cooks is asked, not picked');
  // asked for one cook, every dish says so
  assert.ok(M.prepPlan(st, NEXT, { today: SUN, cook: 'kim' }, D).list.filter((x) => x.kind !== 'leftovers').every((x) => x.meal.cook === 'kim'));
  // the same dish on both batch days is one batch cook, not two
  const twice = D.sampleState(SUN);
  twice.dinners[NEXT] = { name: 'Turkey chili', cook: 'kim', items: ['turkey'] };
  twice.dinners[at(10)] = { name: 'Turkey chili', cook: 'me', items: ['turkey'] };
  const tp = M.prepPlan(twice, NEXT, { today: SUN }, D);
  assert.deepEqual([tp.batches[0].name, tp.batches[0].keep], ['Turkey chili', true]);
  assert.ok(tp.batches.slice(1).every((b) => b.name !== 'Turkey chili'));
});

test('the Meal prep block is the batch cook: the quiet 90 minutes right before its dinner, never before now', () => {
  const st = D.sampleState(SUN);
  const plan = M.prepPlan(st, NEXT, { today: SUN }, D);
  const db = M.calendarDay(st, NEXT).blocks.find((b) => b.dinner);
  assert.equal(plan.block.date, plan.batches[0].date);
  assert.equal(plan.block.dur, 90);
  assert.ok(plan.block.start + 90 <= db.start, 'done before dinner');
  assert.ok(db.start - (plan.block.start + 90) < 60, 'and close to it: ' + M.clock(plan.block.start));
  // on the batch day, late in the afternoon, never before now
  for (const now of [15 * 60, 16 * 60 + 50]) {
    const late = M.prepPlan(st, NEXT, { today: NEXT, nowMin: now }, D);
    if (late.block && late.block.date === NEXT) assert.ok(late.block.start >= now, M.clock(now) + ': ' + M.clock(late.block.start));
  }
});

test('things to get that aren’t for a meal are on the week’s list and checked like the rest', () => {
  const st = D.sampleState(SUN), week = M.range(NEXT, 7);
  st.dinners[NEXT] = { name: 'Chicken and rice', cook: 'me', items: ['chicken', 'rice'] };
  const before = M.groceryProgress(st, week);
  st.shopping = { [NEXT]: { extra: [{ id: 'm1', name: 'Milk' }, { id: 'p1', name: 'Paper towels' }, { id: '', name: 'No id' }, null], 'x:m1': 1 } };
  const g = M.groceryProgress(st, week);
  assert.equal(g.total, before.total + 2, 'two kept, the broken ones left out');
  assert.equal(g.got, 1);
  assert.equal(g.left, before.total + 1);
  assert.deepEqual(plain(g.list.filter((x) => x.extra)), [
    { id: 'x:m1', name: 'Milk', kind: 'more', days: [], serves: 0, servings: [], extra: true },
    { id: 'x:p1', name: 'Paper towels', kind: 'more', days: [], serves: 0, servings: [], extra: true }
  ]);
  // they belong to their week only, and the list key is never a check
  assert.equal(M.groceryProgress(st, M.range(at(14), 7)).list.some((x) => x.extra), false);
  assert.ok(!g.list.some((x) => x.id === 'extra'));
});

test('Dev’s Batch cook week: the prep plan on, two different batch cooks, Meal prep, three in the cart, and milk', () => {
  for (const day of [SUN, at(3), at(6)]) {
    const st = S.build('batchcook', D, M, day, null), ws = M.weekStart(day);
    assert.equal(JSON.stringify(st), JSON.stringify(S.build('batchcook', D, M, day, null)), 'the same board each time');
    const prep = M.range(ws, 7).flatMap((d) => ((st.dates[d] && st.dates[d].adds) || []).filter((a) => a.src && a.src.type === 'prep'));
    const batches = M.range(ws, 7).filter((d) => st.dinners[d] && M.servingsOf(st, d, 'dinner') > 1).map((d) => st.dinners[d].name);
    if (day === SUN) {
      assert.equal(prep.length, 1, 'one Meal prep block');
      assert.equal(batches.length, 2);
      assert.notEqual(batches[0], batches[1]);
    }
    assert.ok(!JSON.stringify(st.dinners).match(/chicken|turkey|beef/i), 'vegetarian');
    const g = M.groceryProgress(st, M.range(ws, 7));
    assert.ok(g.list.some((x) => x.extra && x.name === 'Milk'));
    assert.equal(g.got, Math.min(3, g.total - 1));
  }
  assert.ok(S.LIST.some((x) => x.id === 'batchcook') && S.LIST.some((x) => x.id === 'skipped'));
});

test('Dev’s Resets with a Sunday skipped: three resets, notes on two, last week missed, meals to bring back', () => {
  const st = S.build('skipped', D, M, SUN, null), ws = M.weekStart(SUN);
  assert.equal(JSON.stringify(st), JSON.stringify(S.build('skipped', D, M, SUN, null)));
  const rec = (n) => (st.weeks[M.addDays(ws, -7 * n)] || {}).reset;
  assert.ok(rec(4).done && rec(3).done && rec(2).done);
  assert.ok(!rec(1) || !rec(1).done, 'last Sunday was skipped');
  assert.ok(rec(3).keep && rec(2).keep && !rec(4).keep);
  assert.equal(M.range(M.addDays(ws, -21), 7).filter((d) => st.dinners[d] && st.dinners[d].name).length, 7);
  assert.equal(st.profile.name, 'Jordan');
});
