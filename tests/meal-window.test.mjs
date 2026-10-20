// V11-2: meals keep their time (Grok's audit of V11 saw earlier adds push Lunch to 9:15 am and Dinner to 4:45 pm).
// A meal is a Dinner block, anything that's Meals, or a template Breakfast, Lunch, or Dinner. Its window is its usual
// time, an hour either way. Making room never moves a meal further out than that without a yes: Model.pushInsert keeps
// the least moving way that keeps every meal in its window, and when only one that moves a meal out would do, it says
// so (reason 'meal', with where the meal would go), for the app to ask "This moves Dinner to 4:45 pm. Move it?". The
// yes is opts.meals, or Model.withMeals around any change.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const TODAY = '2026-10-20', WED = '2026-10-21';
const copy = (v) => JSON.parse(JSON.stringify(v));
/* someone on their own who works 9 to 5, with breakfast, lunch, and dinner on the board */
const sam = () => D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 }, meals: { breakfast: true, lunch: true } }, TODAY);
const blockOn = (st, d, name) => M.calendarDay(st, d).blocks.find((b) => b.name === name);
const add = (name, dur) => ({ name, cat: 'yours', icon: 'star', dur, src: { type: 'custom' } });

test('what a meal is, and its window: its usual time, an hour either way', () => {
  const st = sam();
  const meals = M.calendarDay(st, WED).blocks.filter((b) => M.mealBlock(b)).map((b) => b.name);
  assert.deepEqual(meals, ['Breakfast', 'Lunch', 'Dinner']);
  assert.equal(M.mealBlock({ name: 'Meal prep', cat: 'meals', start: 600, dur: 90 }), true, 'anything that’s Meals');
  assert.equal(M.mealBlock({ name: 'Tacos', dinner: true, cat: 'meals' }), true);
  assert.equal(M.mealBlock({ name: 'Lunch, pack them up', tpl: 'lunch', cat: 'family', start: 720, dur: 120 }), true, 'a template lunch by its name');
  assert.equal(M.mealBlock({ name: 'Lunch with Jo', cat: 'friends', add: 'a1' }), false, 'a placed block is a meal by its kind of time, not its name');
  assert.equal(M.mealBlock({ name: 'Free evening', soft: true, cat: 'yours' }), false);
  assert.equal(M.mealBlock({ name: 'Dinner', dinner: true, sleep: 'pm' }), false);
  const din = blockOn(st, WED, 'Dinner');
  assert.deepEqual(M.mealWindow(st, din, WED), { lo: 1020, hi: 1140, at: 1080 });
  // a dinner moved by hand keeps its window around the usual time
  st.dates[WED] = { edits: { dinner: { start: 1140, dur: 45 } } };
  assert.deepEqual(M.mealWindow(st, blockOn(st, WED, 'Dinner'), WED), { lo: 1020, hi: 1140, at: 1080 });
  // a placed meal's window is its own start
  assert.deepEqual(M.mealWindow(st, { name: 'Meal prep', cat: 'meals', add: 'mp', sourceDate: WED, sourceStart: 840, start: 840, dur: 90 }, WED), { lo: 780, hi: 900, at: 840 });
  assert.equal(M.mealWindow(st, blockOn(st, WED, 'Get ready'), WED), null);
});

test('pushInsert: the least moving way that keeps a meal in its window, or it says which meal and where', () => {
  const win = { lo: 1020, hi: 1140, at: 1080 };
  const dinner = { base: 'tpl:dinner', name: 'Dinner', start: 1080, dur: 45, win };
  // an hour at 5:30 pm: Dinner slides to 6:30 pm, inside its window
  const a = M.pushInsert([dinner], [], { start: 1050, dur: 60 }, 360, 1380);
  assert.equal(a.ok, true);
  assert.deepEqual(a.pushes.map((p) => [p.base, p.start]), [['tpl:dinner', 1110]]);
  // two hours at 5:30 pm: right would be 7:30 pm, left 4:45 pm; both are out of its window, so it asks
  const b = M.pushInsert([dinner], [], { start: 1050, dur: 120 }, 360, 1380);
  assert.equal(b.ok, false);
  assert.equal(b.reason, 'meal');
  assert.deepEqual(b.meal, { name: 'Dinner', key: 'tpl:dinner', from: 1080, to: 1005 }, 'the least moving way: 4:45 pm');
  assert.deepEqual(b.pushes.map((p) => [p.base, p.start]), [['tpl:dinner', 1005]], 'what the yes would do');
  // the yes
  const c = M.pushInsert([dinner], [], { start: 1050, dur: 120 }, 360, 1380, false, true);
  assert.equal(c.ok, true);
  assert.deepEqual(c.pushes.map((p) => p.start), [1005]);
  assert.equal(M.withMeals(true, () => M.pushInsert([dinner], [], { start: 1050, dur: 120 }, 360, 1380)).ok, true, 'or withMeals');
  // a way that moves more but keeps it in its window wins over one that moves it out: a walk before dinner goes left,
  // dinner stays
  const walk = { base: 'tpl:walk', name: 'Walk', start: 1020, dur: 60 };
  const d = M.pushInsert([walk, dinner], [], { start: 1050, dur: 60 }, 360, 1380);
  assert.equal(d.ok, true);
  const at = Object.fromEntries(d.pushes.map((p) => [p.base, p.start]));
  assert.ok(at['tpl:dinner'] == null || (at['tpl:dinner'] >= 1020 && at['tpl:dinner'] <= 1140), JSON.stringify(d.pushes));
  // a meal already outside its window (moved by hand) may come back toward its time, never go further out
  const late = { base: 'tpl:dinner', name: 'Dinner', start: 1170, dur: 45, win };
  const meeting = { base: 'mt:club', name: 'Club', start: 1080, dur: 60, fixed: true };
  assert.equal(M.pushInsert([late], [meeting], { start: 1140, dur: 60 }, 360, 1440).reason, 'meal', 'only further out is left: it asks');
  const back = M.pushInsert([late], [], { start: 1140, dur: 60 }, 360, 1440);
  assert.equal(back.ok, true, 'back toward its time: fine');
  assert.equal(back.pushes[0].start, 1095);
  // a locked meal is a wall, as always
  assert.equal(M.pushInsert([], [Object.assign({}, dinner, { fixed: true })], { start: 1050, dur: 60 }, 360, 1380).reason, 'fixed');
});

test('canPlace and placeAdd: never a quiet push of a meal out of its window, and the yes moves it', () => {
  const st = sam(), before = copy(st);
  const r = M.canPlace(st, WED, 120, 1050);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'meal');
  assert.deepEqual(r.meal, { name: 'Dinner', key: 'tpl:dinner', fromDate: WED, from: 1080, date: WED, to: 1005 });
  assert.equal(M.canPlace(st, WED, 60, 1035).ok, true, 'an hour at 5:15 pm moves Dinner to 6:15 pm, inside its window');
  assert.equal(M.canPlace(st, WED, 180, 660).meal.name, 'Lunch', 'three hours at 11 am would put Lunch at 10:30 am');
  const no = M.placeAdd(st, WED, add('Movie', 120), 1050);
  assert.equal(no.ok, false);
  assert.equal(no.reason, 'meal');
  assert.deepEqual(st, before, 'nothing changed');
  const yes = M.placeAdd(st, WED, add('Movie', 120), 1050, { meals: true });
  assert.equal(yes.ok, true);
  assert.equal(blockOn(st, WED, 'Dinner').start, 1005, 'with the yes, Dinner moves to 4:45 pm');
  // moving a block, moving a routine, and withMeals keep the same rule
  const s2 = sam(), x = M.placeAdd(s2, WED, add('Call', 30), 900);
  assert.equal(M.moveAdd(s2, x.add.id, WED, 1050).ok, true, 'half an hour moves nothing out');
  const big = M.placeAdd(s2, WED, add('Errands', 120), 780);
  assert.equal(M.moveAdd(s2, big.add.id, WED, 1050).reason, 'meal');
  assert.equal(M.moveAdd(s2, big.add.id, WED, 1050, { meals: true }).ok, true);
  const s3 = sam();
  assert.equal(M.moveTemplate(s3, WED, 'winddown', 1050, 120).reason, 'meal', 'a routine dragged onto dinner asks too');
  assert.equal(M.withMeals(true, () => M.moveTemplate(s3, WED, 'winddown', 1050, 120)).ok, true);
  // dragging the meal itself is the person's own choice
  assert.equal(M.moveTemplate(sam(), WED, 'dinner', 1260).ok, true);
});

test('a stretch stops where a meal’s window does, and 15 more minutes asks first', () => {
  const st = sam();
  const r = M.placeAdd(st, WED, add('Errands', 60), 1020);
  assert.equal(r.ok, true);
  const grown = M.resizeBlock(st, WED, 'add:' + r.add.id, 180);
  assert.equal(grown.ok, true);
  const din = blockOn(st, WED, 'Dinner');
  assert.ok(din.start <= 1140, 'Dinner stays inside its window: ' + din.start);
  assert.ok(grown.dur < 180, 'the stretch stops short instead: ' + grown.dur);
  // with Dinner already at the window's edge, 15 more minutes before it would push it out
  const s2 = sam();
  s2.dates[WED] = { edits: { dinner: { start: 1140, dur: 45 } } };
  const e = M.placeAdd(s2, WED, add('Errands', 60), 1080);
  assert.equal(e.ok, true);
  const ext = M.previewExtend(s2, WED, 'add:' + e.add.id, 15, 1100);
  assert.equal(ext.ok, false);
  assert.equal(ext.reason, 'meal');
  assert.equal(M.withMeals(true, () => M.previewExtend(s2, WED, 'add:' + e.add.id, 15, 1100)).ok, true);
});

test('random placements on Russell’s week never move a meal out of its window without a yes', () => {
  const st = D.defaultState('2026-09-27'), span = M.range('2026-10-05', 21);
  let seed = 7;
  const rnd = (n) => { seed = (seed * 16807) % 2147483647; return Math.floor((seed / 2147483647) * n); };
  const meals = () => span.flatMap((d) => M.calendarDay(st, d).blocks.filter((b) => M.mealBlock(b) && !b.add).map((b) => ({ d, key: b.sourceDate + ':' + b.sourceKey, start: M.windowTime(d, b.sourceDate, b.sourceStart), w: M.mealWindow(st, b, d) })));
  let refused = 0;
  for (let i = 0; i < 300; i++) {
    const was = new Map(meals().map((m) => [m.key, m]));
    const d = span[rnd(span.length)], start = 360 + rnd(64) * 15, dur = 15 * (1 + rnd(12));
    const r = M.placeAdd(st, d, add('X', dur), start);
    if (!r.ok && r.reason === 'meal') { refused++; assert.ok(r.meal && r.meal.name, 'it says which meal'); }
    for (const m of meals()) {
      const b = was.get(m.key);
      if (!b || b.start === m.start) continue;
      const inside = m.start >= m.w.lo && m.start <= m.w.hi, closer = Math.abs(m.start - m.w.at) <= Math.abs(b.start - m.w.at);
      assert.ok(inside || closer, 'step ' + i + ': ' + m.key + ' moved from ' + b.start + ' to ' + m.start + ' without a yes');
    }
    for (const day of span) {
      const bl = M.calendarDay(st, day).blocks.slice().sort((x, y) => x.start - y.start);
      for (let k = 1; k < bl.length; k++) assert.ok(bl[k].start >= bl[k - 1].start + bl[k - 1].dur, 'step ' + i + ', ' + day + ': no overlaps');
    }
  }
  assert.ok(refused > 0, 'some placements asked first: ' + refused);
});
