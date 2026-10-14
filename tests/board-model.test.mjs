// V11: the board's own model, from before V11. These are the 303 repo's tests/model.test.mjs (every day
// for a year, random placements, merging two saves, Russell's week), run on board/src/model.js and
// data.js, which every build made from board/src uses. tests/model.test.mjs is the flat calendar's
// model (src/model.js), not this one. Only the two imports changed; keep the rest as it is in 303, so a
// change there can be copied over whole.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;
const fresh = () => D.defaultState('2026-09-27');

/* The rule every day must keep: sorted, no overlaps, whole minutes on the 15 minute grid,
   inside the rail, sleep at both ends matching wake and bed. */
function checkDay(day, label) {
  let c = M.RAIL0;
  for (const b of day.blocks) {
    assert.ok(b.dur >= M.MIN_LEN, label + ': ' + b.key + ' is too short (' + b.dur + ')');
    assert.ok(b.start >= c, label + ': ' + b.key + ' overlaps the block before it');
    assert.ok(b.start + b.dur <= M.RAIL1, label + ': ' + b.key + ' runs past midnight');
    assert.equal(b.start % 5, 0, label + ': ' + b.key + ' start off grid');
    c = b.start + b.dur;
  }
  const keys = day.blocks.map((b) => b.key);
  assert.equal(new Set(keys).size, keys.length, label + ': duplicate keys ' + keys.join(','));
  const am = day.blocks.find((b) => b.sleep === 'am'), pm = day.blocks.find((b) => b.sleep === 'pm');
  if (day.wake > M.RAIL0) assert.equal(am.start + am.dur, day.wake, label + ': morning sleep ends at wake');
  if (day.bed < M.RAIL1) assert.equal(pm.start, day.bed, label + ': night sleep starts at bed');
  for (const b of day.blocks) if (!b.sleep) assert.ok(b.start >= day.wake && b.start + b.dur <= day.bed, label + ': ' + b.key + ' outside the waking day');
}

test('dates', () => {
  assert.equal(M.weekday('2026-09-27'), 0);
  assert.equal(M.weekday('2026-10-16'), 5);
  assert.equal(M.weekday('2026-11-09'), 1);
  assert.equal(M.weekStart('2026-10-01'), '2026-09-27');
  assert.equal(M.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(M.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(M.monthGrid('2026-10-05').length, 35);
  assert.equal(M.monthGrid('2026-10-05')[0], '2026-09-27');
  assert.equal(M.monthGrid('2026-08-10').length, 42);
  assert.equal(M.spanText('2026-10-16', '2026-10-19'), 'Oct 16 to 19');
  assert.equal(M.span(390, 450), '6:30 to 7:30 am');
  assert.equal(M.clock(720), 'noon');
  assert.equal(M.hours(1230), '20.5 h');
});

test('every day for a year keeps the rail rule', () => {
  const s = fresh();
  for (const d of M.range('2026-09-27', 400)) checkDay(M.resolveDay(s, d), d);
});

test('the usual week matches what Russell described', () => {
  const s = fresh();
  const tue = M.resolveDay(s, '2026-09-29');
  const names = tue.blocks.map((b) => b.name);
  for (const n of ['Up with Elijah', 'Daycare drop off', 'Work', 'Creative projects', 'Daycare pick up', 'Walk, bath, feed', 'Evening with Kim']) assert.ok(names.includes(n), n);
  assert.equal(tue.wake, 330);
  const mon = M.resolveDay(s, '2026-09-28');
  assert.equal(mon.wake, 390, 'sleeps in on Monday');
  assert.ok(mon.blocks.some((b) => b.name === 'Kim and Elijah home' && b.start === 19 * 60));
  const t = M.totals(M.weekDates('2026-09-27').map((d) => M.resolveDay(s, d)));
  assert.ok(t.yours > 15 * 60 && t.yours < 24 * 60, 'about 20 hours of your own time: ' + t.yours);
});

test('week shape: leaving Monday morning moves Sunday afternoon to family time', () => {
  const s = fresh();
  s.weeks['2026-09-27'] = { shape: 'monday' };
  const sun = M.resolveDay(s, '2026-09-27');
  assert.ok(sun.blocks.some((b) => b.name === 'Family afternoon'));
  const mon = M.resolveDay(s, '2026-09-28');
  assert.equal(mon.wake, 330);
  assert.ok(mon.blocks.some((b) => b.name === 'Kim and Elijah head out'));
  const next = M.resolveDay(s, '2026-10-04');
  assert.ok(!next.blocks.some((b) => b.name === 'Family afternoon'), 'only that week');
});

test('trips replace the days away', () => {
  const s = fresh();
  const fri = M.resolveDay(s, '2026-10-16');
  assert.ok(fri.trip && fri.trip.id === 'oct-trip');
  assert.ok(fri.blocks.some((b) => b.name === 'To the airport' && b.fixed));
  assert.ok(!fri.blocks.some((b) => b.cat === 'work'), 'no work on the way out');
  const sat = M.resolveDay(s, '2026-10-17');
  assert.ok(sat.blocks.every((b) => b.sleep || b.cat === 'away'));
  const mon = M.resolveDay(s, '2026-10-19');
  assert.ok(mon.blocks.some((b) => b.name === 'Fly home'));
  const bday = M.resolveDay(s, '2026-11-09');
  assert.ok(bday.trip && bday.markers.some((m) => m.name === 'Your birthday'));
});

test('the birthday dinner night', () => {
  const s = fresh();
  const d = M.resolveDay(s, '2026-11-13');
  const at = (n) => d.blocks.find((b) => b.name === n);
  assert.equal(at('Salty’s on the Columbia').start, 18 * 60 + 30);
  assert.equal(at('Feed him early').start, 17 * 60);
  assert.equal(at('Pick up Elijah').start, 20 * 60 + 30);
  assert.equal(at('Bedtime').start, 21 * 60);
  assert.ok(!d.blocks.some((b) => b.dinner), 'no dinner at home');
});

test('holidays drop work and daycare', () => {
  const s = fresh();
  const xmas = M.resolveDay(s, '2026-12-25');
  assert.ok(xmas.off);
  assert.ok(!xmas.blocks.some((b) => b.cat === 'work' || b.daycare));
});

test('meetings sit inside work', () => {
  const s = fresh();
  s.meetings.push({ id: 'standup', name: 'Standup', days: [2, 3, 4, 5], start: 9 * 60 + 30, dur: 30 });
  const tue = M.resolveDay(s, '2026-09-29');
  checkDay(tue, 'tue with standup');
  const st = tue.blocks.find((b) => b.name === 'Standup');
  assert.ok(st && st.fixed);
  const work = tue.blocks.filter((b) => b.base === 'tpl:work');
  assert.equal(work.length, 2, 'work splits around the meeting');
  assert.ok(!M.resolveDay(s, '2026-10-16').blocks.some((b) => b.name === 'Standup'), 'no meetings on a trip');
});

test('placing into open time cuts a hole and pushes nothing', () => {
  const s = fresh();
  const r = M.placeAdd(s, '2026-09-30', { name: 'Workout', cat: 'yours', icon: 'dumbbell', dur: 45, src: { type: 'block', id: 'workout' } }, 14 * 60);
  assert.ok(r.ok);
  assert.equal(r.pushes.length, 0);
  const d = M.resolveDay(s, '2026-09-30');
  checkDay(d, 'wed');
  const cr = d.blocks.filter((b) => b.base === 'tpl:creative');
  assert.equal(cr.length, 1);
  assert.equal(cr[0].start, 14 * 60 + 45);
});

test('placing over a routine slides it, and fixed blocks never move', () => {
  const s = fresh();
  const r = M.placeAdd(s, '2026-09-29', { name: 'Call Dad', cat: 'family', dur: 30 }, 17 * 60);
  assert.ok(r.ok, r.reason);
  const d = M.resolveDay(s, '2026-09-29');
  checkDay(d, 'tue');
  assert.equal(d.blocks.find((b) => b.base === 'tpl:pickup').start, 16 * 60 + 30, 'pick up stays');
  const bad = M.canPlace(s, '2026-09-29', 30, 8 * 60);
  assert.equal(bad.ok, false, 'cannot land on daycare drop off');
  assert.equal(bad.reason, 'fixed');
});

test('moving a placed block to another day', () => {
  const s = fresh();
  const r = M.placeAdd(s, '2026-09-29', { name: 'Laundry', cat: 'home', dur: 60, src: { type: 'task', id: 'laundry' } }, 14 * 60);
  const m = M.moveAdd(s, r.add.id, '2026-10-03', 13 * 60);
  assert.ok(m.ok);
  assert.ok(!M.resolveDay(s, '2026-09-29').blocks.some((b) => b.add === r.add.id));
  const sat = M.resolveDay(s, '2026-10-03');
  assert.ok(sat.blocks.some((b) => b.add === r.add.id && b.start === 13 * 60 && b.name === 'Laundry'));
  const fail = M.moveAdd(s, r.add.id, '2026-10-03', 10 * 60 + 30);
  assert.ok(fail.ok || M.findAdd(s, r.add.id), 'a failed move leaves it where it was');
});

test('random placements never break the rail rule', () => {
  const s = fresh();
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const dates = M.range('2026-09-27', 60);
  for (let i = 0; i < 600; i++) {
    const d = dates[Math.floor(rnd() * dates.length)];
    const dur = 15 * (1 + Math.floor(rnd() * 8));
    const start = 300 + Math.floor(rnd() * 76) * 15;
    const op = rnd();
    if (op < 0.6) M.placeAdd(s, d, { name: 'x', cat: 'yours', dur }, start);
    else if (op < 0.8) {
      const day = M.resolveDay(s, d);
      const hard = day.blocks.filter((b) => b.tpl && !b.soft && !b.fixed);
      if (hard.length) { const b = hard[Math.floor(rnd() * hard.length)]; M.moveTemplate(s, d, b.tpl, start); }
    } else {
      const day = M.resolveDay(s, d);
      const adds = day.blocks.filter((b) => b.add);
      if (adds.length) M.resizeBlock(s, d, adds[0].base, dur * 2);
    }
    checkDay(M.resolveDay(s, d), d + ' after op ' + i);
  }
});

test('wake and bed move the ends of the day', () => {
  const s = fresh();
  M.setWake(s, '2026-09-29', 5 * 60);
  M.setBed(s, '2026-09-29', 23 * 60);
  const d = M.resolveDay(s, '2026-09-29');
  checkDay(d, 'tue late');
  assert.equal(d.wake, 300);
  assert.ok(!d.blocks.some((b) => b.sleep === 'am'), 'no sleep block when you wake at 5');
  assert.equal(d.bed, 23 * 60);
});

test('first fit finds open time', () => {
  const s = fresh();
  const at = M.firstFit(s, '2026-09-29', 30, 9 * 60);
  assert.equal(at, 9 * 60, 'work is open time');
  const sat = M.firstFit(s, '2026-10-03', 120, 12 * 60);
  assert.equal(sat, 12 * 60 + 30, 'after cleaning');
});

test('to do: due soon, placing, done, and repeats', () => {
  const s = fresh();
  const soon = M.dueSoon(s, '2026-09-27', 14).map((x) => x.task.id);
  assert.equal(soon[0], 'mom-card');
  assert.deepEqual(soon.slice(1, 3).sort(), ['bills', 'dad-gift']);
  M.placeAdd(s, '2026-09-29', { name: 'Fill out Mom’s card', cat: 'family', dur: 40, src: { type: 'task', id: 'mom-card' } }, 14 * 60);
  assert.ok(!M.dueSoon(s, '2026-09-27', 14).some((x) => x.task.id === 'mom-card'), 'planned ones leave the due soon list');
  assert.equal(M.taskStatus(s.tasks[0], M.placements(s).get('mom-card'), '2026-10-01'), 'missed');
  const n = M.completeTask(s, 'bills');
  assert.equal(n.due, '2026-11-01');
  assert.ok(!M.completeTask(s, 'mom-card'), 'no repeat for the card');
  const lau = M.completeTask(s, 'laundry');
  assert.equal(lau.due, '2026-10-10');
  assert.equal(M.suggestSteps('Birthday card for Grandma', D)[0].name, 'Write the card');
  assert.equal(M.suggestSteps('Something new', D).length, 3);
});

test('dinners and groceries', () => {
  const s = fresh();
  s.dinners['2026-09-29'] = { name: 'Tacos', recipe: 'tacos', cook: 'me', items: ['beef', 'tortillas', 'peppers', 'onion'] };
  s.dinners['2026-09-30'] = { name: 'Chicken stir fry', cook: 'kim', items: ['chicken', 'peppers', 'broccoli', 'rice'] };
  s.dinners['2026-10-01'] = { name: 'Leftovers', cook: 'leftovers', items: ['beef'] };
  const g = M.groceries(s, M.weekDates('2026-09-27'));
  assert.equal(g[0].kind, 'protein');
  assert.equal(g.find((x) => x.id === 'peppers').days.length, 2);
  assert.equal(g.filter((x) => x.id === 'beef')[0].days.length, 1, 'leftovers need no shopping');
  const tue = M.resolveDay(s, '2026-09-29');
  assert.equal(tue.blocks.find((b) => b.dinner).label, 'Tacos');
  assert.equal(M.resolveDay(s, '2026-10-02').blocks.find((b) => b.dinner).label, 'Dinner');
  assert.equal(M.resolveDay(s, '2026-10-02').blocks.find((b) => b.dinner).planned, false);
  s.dinners['2026-10-02'] = { name: '', cook: 'out', items: [] };
  const fri = M.resolveDay(s, '2026-10-02').blocks.find((b) => b.dinner);
  assert.ok(fri.planned && fri.label === 'Dinner' && fri.cook === 'out', 'eating out with no place named is still a plan');
  assert.equal(M.dinnerFromItems(s, ['salmon', 'rice', 'spinach']), 'Salmon rice bowls');
  assert.equal(M.dinnerFromItems(s, ['shrimp', 'zucchini', 'quinoa']), 'Shrimp, zucchini and quinoa');
});

test('looking ahead from this Sunday', () => {
  const s = fresh();
  const up = M.upcoming(s, '2026-09-27', 28);
  const first = up.find((x) => x.kind === 'marker');
  assert.equal(first.name, 'Dad’s birthday');
  assert.ok(up.some((x) => x.kind === 'trip' && x.id === 'oct-trip'));
  assert.ok(!up.some((x) => x.id === 'virginia'), 'Virginia is more than four weeks out');
  const yr = M.upcoming(s, '2026-09-27', 365);
  assert.ok(yr.some((x) => x.id === 'kim-bday' && x.date === '2027-02-24'));
  const card = M.dayCard(s, '2026-11-13');
  assert.ok(card.flags.some((f) => f.name.startsWith('Salty’s')));
});

test('drops snap to a nearby edge instead of leaving a sliver', () => {
  const s = fresh();
  assert.equal(M.magnet(s, '2026-09-30', 14 * 60 + 15, 60), 14 * 60, 'snaps to the start of Creative projects');
  assert.equal(M.magnet(s, '2026-09-30', 14 * 60 + 45, 60), 15 * 60, 'snaps so it ends at 4 pm');
  assert.equal(M.magnet(s, '2026-09-30', 14 * 60 + 30, 60), 14 * 60 + 30, 'leaves it when both sides have room');
});

test('short steps take a 15 minute block instead of vanishing', () => {
  const s = fresh();
  const r = M.placeAdd(s, '2026-09-29', { name: 'Charge everything', cat: 'family', dur: 5, src: { type: 'step', task: 'pack-oct', id: 'pack-oct-s3' } }, 14 * 60);
  assert.ok(r.ok);
  const b = M.resolveDay(s, '2026-09-29').blocks.find((x) => x.add === r.add.id);
  assert.ok(b, 'still on the board');
  assert.equal(b.dur, 15);
});

test('an early timed event widens the waking day', () => {
  const s = fresh();
  s.events.push({ id: 'flight', kind: 'timed', name: 'Early flight', cat: 'away', icon: 'plane', date: '2026-10-07', start: 4 * 60 + 45, dur: 90 });
  const d = M.resolveDay(s, '2026-10-07');
  checkDay(d, 'early flight');
  assert.equal(d.wake, 300);
  assert.ok(d.blocks.some((b) => b.name === 'Early flight' && b.start === 300));
});

test('reopening a repeating to do removes its untouched copy', () => {
  const s = fresh();
  const before = s.tasks.length;
  const n = M.completeTask(s, 'laundry');
  assert.equal(s.tasks.length, before + 1);
  M.reopenTask(s, 'laundry');
  assert.equal(s.tasks.length, before);
  assert.ok(!s.tasks.some((t) => t.id === n.id));
  assert.equal(s.tasks.find((t) => t.id === 'laundry').done, false);
});

test('one day trips and leap day birthdays', () => {
  const s = fresh();
  s.events.push({ id: 'daytrip', kind: 'trip', name: 'Seattle', icon: 'plane', date: '2026-10-28', end: '2026-10-28', leave: 7 * 60, back: 7 * 60 + 30 });
  checkDay(M.resolveDay(s, '2026-10-28'), 'day trip');
  s.events.push({ id: 'leap', kind: 'marker', name: 'Leap birthday', icon: 'cake', date: '2028-02-29', yearly: true });
  assert.ok(M.markersOn(s, '2027-02-28').some((m) => m.id === 'leap'));
  assert.ok(!M.upcoming(s, '2026-11-01', 20).some((x) => x.id === 'aunt-drop'), 'logistics stay out of the look ahead');
});

test('church at 9, and a saved week from before gets it too', () => {
  const s = fresh();
  const sun = M.resolveDay(s, '2026-10-04');
  const ch = sun.blocks.find((b) => b.base === 'tpl:church');
  assert.equal(ch.start, 8 * 60 + 45);
  assert.ok(ch.fixed);
  const old = JSON.parse(JSON.stringify(s));
  old.v = 1;
  old.rhythm.days[0] = { wake: 330, bed: 1320, blocks: [
    { id: 'up', name: 'Up with Elijah', cat: 'family', icon: 'bottle', start: 330, dur: 180 }, { id: 'ready', name: 'Get ready', cat: 'family', icon: 'shirt', start: 510, dur: 90 },
    { id: 'church', name: 'Church', cat: 'family', icon: 'church', start: 600, dur: 120, fixed: true }, { id: 'lunch', name: 'Lunch, pack them up', cat: 'family', icon: 'fork', start: 720, dur: 120 },
    { id: 'reset', name: 'Sunday Reset', cat: 'yours', icon: 'calendar', start: 840, dur: 45 }, { id: 'workout', name: 'Workout', cat: 'yours', icon: 'dumbbell', start: 885, dur: 60 },
    { id: 'creative', name: 'Creative projects', cat: 'yours', icon: 'brush', start: 945, dur: 135, soft: true }, { id: 'dinner', name: 'Dinner', cat: 'meals', icon: 'pot', start: 1080, dur: 45, dinner: true },
    { id: 'evening', name: 'Free evening', cat: 'yours', icon: 'moon', start: 1125, dur: 195, soft: true }] };
  D.migrate(old);
  assert.equal(old.v, D.VERSION);
  assert.equal(old.rhythm.days[0].blocks.find((b) => b.id === 'church').start, 8 * 60 + 45);
  const mine = JSON.parse(JSON.stringify(old));
  mine.v = 1; mine.rhythm.days[0].blocks[0].name = 'Morning with Elijah';
  D.migrate(mine);
  assert.equal(mine.rhythm.days[0].blocks[0].name, 'Morning with Elijah', 'a changed Sunday is left alone');
});

test('unlocking a locked block lets it move', () => {
  const s = fresh();
  assert.equal(M.moveTemplate(s, '2026-09-29', 'pickup', 15 * 60).ok, true, 'the panel can still move a locked block');
  const s2 = fresh();
  M.dateRec(s2, '2026-09-29').edits = { pickup: { fixed: false } };
  const d = M.resolveDay(s2, '2026-09-29');
  assert.equal(d.blocks.find((b) => b.base === 'tpl:pickup').fixed, false);
  const r = M.canPlace(s2, '2026-09-29', 30, 16 * 60 + 30);
  assert.ok(r.ok, 'an unlocked block slides out of the way');
});

test('day recipes fill open time and swap cleanly', () => {
  const s = fresh();
  const P = (id) => D.PRESETS.find((p) => p.id === id);
  const sat = '2026-10-03';
  const r = M.applyPreset(s, sat, P('creative'), s.palette);
  assert.ok(r.placed >= 3, 'placed ' + r.placed);
  let d = M.resolveDay(s, sat);
  checkDay(d, 'creative saturday');
  const routines = ['tpl:up', 'tpl:morningwalk', 'tpl:breakfast', 'tpl:clean', 'tpl:walk', 'tpl:bedtime', 'tpl:dinner'];
  const before = M.resolveDay(fresh(), sat).blocks.filter((b) => routines.includes(b.base)).map((b) => b.base + b.start).join();
  assert.equal(d.blocks.filter((b) => routines.includes(b.base)).map((b) => b.base + b.start).join(), before, 'routines did not move');
  M.applyPreset(s, sat, P('rest'), s.palette);
  d = M.resolveDay(s, sat);
  assert.ok(!d.blocks.some((b) => b.name === 'Creative time'), 'the last recipe comes off');
  assert.ok(d.blocks.some((b) => b.name === 'Nap'));
  M.applyPreset(s, sat, { id: 'call', name: 'Call someone', additive: true, items: [{ p: 'call-loved', dur: 30, when: 'evening' }] }, s.palette);
  assert.ok(M.resolveDay(s, sat).blocks.some((b) => b.name === 'Nap'), 'an additive kind of day only adds');
  M.applyPreset(s, sat, P('usual'), s.palette);
  assert.ok(!M.resolveDay(s, sat).blocks.some((b) => b.add));
  const tue = '2026-09-29';
  M.applyPreset(s, tue, P('focus'), s.palette);
  const t = M.resolveDay(s, tue);
  checkDay(t, 'focus tuesday');
  const deep = t.blocks.filter((b) => b.name === 'Deep work');
  assert.ok(deep.length >= 1 && deep.every((b) => b.start >= 510 && b.start + b.dur <= 840), 'deep work sits inside Work');
  M.applyPreset(s, tue, P('empty'), s.palette);
  const e = M.resolveDay(s, tue);
  assert.ok(e.blocks.every((b) => b.sleep || b.fixed), 'only locked blocks and sleep are left');
  const mine = M.presetFromDay(s, tue, 'Mine');
  assert.equal(mine.items.length, 0);
  const s2 = fresh();
  M.placeAdd(s2, sat, { name: 'Workout', cat: 'yours', icon: 'dumbbell', dur: 60, src: { type: 'block', id: 'workout' } }, 13 * 60);
  const saved = M.presetFromDay(s2, sat, 'Solo Saturday');
  assert.equal(saved.items[0].start, 13 * 60);
  M.applyPreset(s2, '2026-10-10', saved, s2.palette);
  assert.ok(M.resolveDay(s2, '2026-10-10').blocks.some((b) => b.name === 'Workout' && b.start === 13 * 60));
});

test('a Dinner block added to an empty day is a dinner slot, and stays one in a saved recipe', () => {
  const s = fresh();
  const sat = '2026-10-03';
  M.applyPreset(s, sat, D.PRESETS.find((p) => p.id === 'empty'), s.palette);
  assert.ok(!M.resolveDay(s, sat).blocks.some((b) => b.dinner), 'empty day has no dinner');
  const r = M.placeAdd(s, sat, { name: 'Dinner', cat: 'meals', icon: 'pot', dur: 45, dinner: true }, 19 * 60);
  assert.ok(r.ok);
  s.dinners[sat] = { name: 'Uber Eats', cook: 'order', items: [] };
  const b = M.resolveDay(s, sat).blocks.find((x) => x.dinner);
  assert.ok(b && b.planned && b.label === 'Uber Eats');
  const saved = M.presetFromDay(s, sat, 'Takeout Saturday');
  const s2 = fresh();
  M.applyPreset(s2, '2026-10-10', D.PRESETS.find((p) => p.id === 'empty'), s2.palette);
  M.applyPreset(s2, '2026-10-10', Object.assign({}, saved, { additive: true }), s2.palette);
  assert.ok(M.resolveDay(s2, '2026-10-10').blocks.some((x) => x.dinner), 'the saved recipe brings a dinner slot');
});

test('a kind of day saved from a blank slate clears routines, then adds its blocks', () => {
  const s = fresh();
  const sat = '2026-10-03', sat2 = '2026-10-10';
  M.applyPreset(s, sat, D.PRESETS.find((p) => p.id === 'empty'), s.palette);
  const bare = M.presetFromDay(s, sat, 'Lovely and free', { clear: true });
  assert.ok(bare.clear && bare.items.length === 0, 'a free day saves with nothing on it');
  M.applyPreset(s, sat2, bare, s.palette);
  const d = M.resolveDay(s, sat2);
  assert.ok(d.blocks.every((b) => b.sleep || b.fixed), 'only locked blocks and sleep stay');
  M.placeAdd(s, sat, { name: 'Walk', cat: 'yours', icon: 'shoe', dur: 30, src: { type: 'block', id: 'walk' } }, 9 * 60);
  const withWalk = M.presetFromDay(s, sat, 'Free with a walk', { clear: true });
  M.applyPreset(s, sat2, withWalk, s.palette);
  const d2 = M.resolveDay(s, sat2);
  checkDay(d2, 'clear kind');
  assert.ok(d2.blocks.some((b) => b.name === 'Walk' && b.start === 9 * 60));
  assert.ok(!d2.blocks.some((b) => b.tpl && !b.fixed && !b.sleep), 'routines stayed off');
});

test('a free evening is soft time that stays unplanned, and old saves learn it', () => {
  const s = fresh();
  const sun = M.resolveDay(s, '2026-09-27');
  const ev = sun.blocks.find((b) => b.name === 'Free evening');
  assert.ok(ev && ev.soft && ev.free, 'free evening carries the free flag');
  const old = fresh(); old.v = 3; old.palette = old.palette.filter((p) => p.id !== 'opentime');
  Object.values(old.rhythm.days).forEach((t) => t.blocks.forEach((b) => { delete b.free; }));
  D.migrate(old);
  assert.equal(old.v, D.VERSION);
  assert.ok(old.palette.some((p) => p.id === 'opentime'), 'Open time is in the blocks');
  assert.ok(old.rhythm.days[0].blocks.find((b) => b.name === 'Free evening').free);
});

test('a calendar file becomes events: repeats, exceptions, folded lines, all day', () => {
  const ics = ['BEGIN:VCALENDAR', 'X-WR-CALNAME:Court', 'BEGIN:VEVENT', 'SUMMARY:Hearing', 'DTSTART:20261013T093000', 'DTEND:20261013T110000', 'END:VEVENT',
    'BEGIN:VEVENT', 'SUMMARY:Standup with a long', '  name', 'DTSTART;TZID=America/Los_Angeles:20260928T090000', 'DURATION:PT15M', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=5', 'EXDATE;TZID=America/Los_Angeles:20260930T090000', 'END:VEVENT',
    'BEGIN:VEVENT', 'SUMMARY:Holiday', 'DTSTART;VALUE=DATE:20261126', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const r = M.parseIcs(ics, '2026-09-27', '2027-09-27');
  assert.equal(r.name, 'Court');
  assert.equal(r.items.filter((x) => x.name === 'Standup with a long name').length, 4, 'five repeats, one skipped');
  const h = r.items.find((x) => x.name === 'Hearing');
  assert.deepEqual([h.date, h.start, h.dur], ['2026-10-13', 570, 90]);
  assert.ok(r.items.find((x) => x.name === 'Holiday').allDay);
  const s = fresh();
  s.calendars = [{ id: 'c1', name: 'Court' }];
  r.items.forEach((it, i) => s.events.push(it.allDay ? { id: 'x' + i, kind: 'marker', name: it.name, icon: 'calendar', date: it.date, cal: 'c1' } : { id: 'x' + i, kind: 'timed', name: it.name, icon: 'calendar', cat: 'work', date: it.date, start: it.start, dur: it.dur, cal: 'c1' }));
  const d = M.resolveDay(s, '2026-10-13');
  checkDay(d, 'hearing day');
  assert.ok(d.blocks.some((b) => b.name === 'Hearing' && b.fixed), 'imported events are locked');
  s.calendars[0].hidden = true;
  assert.ok(!M.resolveDay(s, '2026-10-13').blocks.some((b) => b.name === 'Hearing'), 'a hidden calendar stays off the board');
});

test('a calendar file: zones, moved and cancelled occurrences, multi day events, and a cap', () => {
  const ics = ['BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:w1', 'SUMMARY:Weekly check in', 'DTSTART:20261005T100000', 'DURATION:PT30M', 'RRULE:FREQ=WEEKLY;COUNT=3', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:w1', 'RECURRENCE-ID:20261012T100000', 'SUMMARY:Weekly check in', 'DTSTART:20261013T150000', 'DURATION:PT30M', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:c1', 'SUMMARY:Called off', 'STATUS:CANCELLED', 'DTSTART:20261014T090000', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:v1', 'SUMMARY:Fall break', 'DTSTART;VALUE=DATE:20261019', 'DTEND;VALUE=DATE:20261022', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:z1', 'SUMMARY:East coast call', 'DTSTART;TZID=America/New_York:20261016T090000', 'DURATION:PT1H', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const r = M.parseIcs(ics, '2026-09-27', '2027-09-27');
  const wk = r.items.filter((x) => x.name === 'Weekly check in').map((x) => x.date + ' ' + x.start);
  assert.deepEqual(wk, ['2026-10-05 600', '2026-10-13 900', '2026-10-19 600'], 'the moved one shows once, on its new day');
  assert.ok(!r.items.some((x) => x.name === 'Called off'), 'cancelled events stay out');
  assert.deepEqual(r.items.filter((x) => x.name === 'Fall break').map((x) => x.date), ['2026-10-19', '2026-10-20', '2026-10-21']);
  const east = r.items.find((x) => x.name === 'East coast call');
  const local = new Date(Date.UTC(2026, 9, 16, 13, 0));
  assert.equal(east.start, local.getHours() * 60 + local.getMinutes(), '9 am in New York is shown in local time');
  const capped = M.parseIcs(ics, '2026-09-27', '2027-09-27', 2);
  assert.ok(capped.more && capped.items.length === 2, 'a cap says there was more');
});

test('a starter week built from a few answers keeps every day whole for a year', () => {
  const st = D.buildState({ name: 'Ana', partner: 'Sam', kids: ['Leo'], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 }, care: { drop: 510, pick: 1005 } }, '2026-09-27');
  for (let i = 0; i < 370; i++) checkDay(M.resolveDay(st, M.addDays('2026-09-27', i)), 'starter day ' + i);
  const tue = M.resolveDay(st, '2026-09-29');
  assert.ok(tue.blocks.some((b) => b.name === 'Pick up Leo' && b.fixed));
  assert.ok(tue.blocks.some((b) => b.name === 'Evening with Sam' && b.soft));
  const solo = D.buildState({ name: 'Jo', partner: '', kids: [], wake: { wd: 420, we: 480 }, bed: { wd: 1380, we: 1410 }, work: null, care: null }, '2026-09-27');
  for (let i = 0; i < 30; i++) checkDay(M.resolveDay(solo, M.addDays('2026-09-27', i)), 'solo day ' + i);
  assert.ok(M.resolveDay(solo, '2026-09-29').blocks.some((b) => b.name === 'Free evening' && b.free));
  assert.equal(solo.tasks.length, 0);
  assert.ok(!solo.ideas.some((i) => i.id === 'first-bday'), 'Russell only ideas stay with Russell');
});

test('ordering in and skipping dinner need no groceries', () => {
  const s = fresh();
  s.dinners['2026-09-29'] = { name: 'DoorDash', cook: 'order', items: ['beef'] };
  s.dinners['2026-09-30'] = { name: 'Skipping dinner', cook: 'skip', items: ['rice'] };
  assert.equal(M.groceries(s, M.weekDates('2026-09-27')).length, 0);
  const old = fresh(); old.v = 2; delete old.presets; old.palette = old.palette.slice(0, 16);
  D.migrate(old);
  assert.equal(old.v, D.VERSION);
  assert.ok(old.palette.some((p) => p.id === 'call-loved'));
  assert.deepEqual(old.presets, []);
});

test('quick add reads plain words', () => {
  const s = fresh(), t = '2026-09-28';
  const q = (x, now) => M.parseQuick(x, t, s.palette, now == null ? 600 : now);
  let r = q('Gym Tue 6pm 45m');
  assert.deepEqual([r.kind, r.name, r.date, r.start, r.dur, r.icon], ['block', 'Gym', '2026-09-29', 1080, 45, 'dumbbell']);
  r = q('Call Dad Sunday');
  assert.deepEqual([r.kind, r.name, r.due, r.icon], ['task', 'Call Dad', '2026-10-04', 'handset'], 'no time makes a to do');
  r = q('Dentist Oct 14 at 2:15pm 1h');
  assert.deepEqual([r.date, r.start, r.dur], ['2026-10-14', 855, 60]);
  assert.equal(q('Walk 30m at 7:30am').date, '2026-09-29', 'a time already past today means tomorrow');
  assert.equal(q('Read tonight').start, 19 * 60);
  assert.equal(q('Read Thursday evening').part, 'evening', 'a part of the day is loose, so the app can find open time in it');
  assert.equal(q('Read Thursday 8pm').part, undefined);
  assert.equal(q('next fri drinks 8pm').date, '2026-10-09');
  assert.equal(q('Lunch noon').start, 720);
  assert.equal(q('Nap for an hour and a half at 1pm').dur, 90);
  assert.equal(q('Pay rent 10/1').due, '2026-10-01');
  assert.equal(q('Movie at 7').start, 7 * 60, 'a bare 7 stays morning; 1 to 6 means afternoon');
  assert.equal(q('Pick up at 3').start, 15 * 60);
  assert.equal(q('   '), null);
});

test('merging two saves keeps both people’s changes', () => {
  const base = fresh();
  const mine = JSON.parse(JSON.stringify(base)), theirs = JSON.parse(JSON.stringify(base));
  mine.dates['2026-09-29'] = { adds: [{ id: 'a1', name: 'Gym', cat: 'yours', icon: 'dumbbell', start: 1080, dur: 45, src: { type: 'custom' } }] };
  theirs.dinners['2026-10-01'] = { name: 'Tacos', cook: 'kim', items: [] };
  mine.tasks.push({ id: 'tm', name: 'Mine', steps: [], done: false });
  theirs.tasks.push({ id: 'tt', name: 'Theirs', steps: [], done: false });
  theirs.tasks = theirs.tasks.filter((t) => t.id !== 'bills');
  const r = M.mergeBoards(base, mine, theirs);
  assert.ok(r.doc.dates['2026-09-29'].adds[0].name === 'Gym', 'my Tuesday stays');
  assert.equal(r.doc.dinners['2026-10-01'].name, 'Tacos', 'their Thursday dinner stays');
  assert.ok(r.doc.tasks.some((t) => t.id === 'tm') && r.doc.tasks.some((t) => t.id === 'tt'), 'both new to dos stay');
  assert.ok(!r.doc.tasks.some((t) => t.id === 'bills'), 'their removal stays');
  assert.deepEqual(r.clashes, []);
  const both = JSON.parse(JSON.stringify(base)); both.dinners['2026-10-01'] = { name: 'Pizza', cook: 'order', items: [] };
  const r2 = M.mergeBoards(base, both, theirs);
  assert.equal(r2.doc.dinners['2026-10-01'].name, 'Pizza', 'the newer save wins a clash');
  assert.deepEqual(r2.clashes, ['dinners 2026-10-01']);
  for (let i = 0; i < 14; i++) checkDay(M.resolveDay(r.doc, M.addDays('2026-09-27', i)), 'merged ' + i);
});

test('now knows the block you’re in and what’s next', () => {
  const s = fresh(), d = M.resolveDay(s, '2026-09-29');
  const work = d.blocks.find((b) => b.cat === 'work' && b.soft);
  const n = M.nowInfo(d, work.start + 30);
  assert.equal(n.kind, 'block');
  assert.equal(n.block.base, work.base);
  assert.equal(n.left, work.dur - 30);
  assert.ok(n.next && n.next.start >= work.start + work.dur);
  assert.equal(M.nowInfo(d, d.wake - 30).kind, 'sleep');
  assert.equal(M.nowInfo(d, d.wake - 30).until, d.wake);
  const sun = M.resolveDay(s, '2026-10-04'), free = sun.blocks.find((b) => b.free);
  assert.equal(M.nowInfo(sun, free.start + 10).kind, 'free', 'free time is open, not a block');
});

test('reminders: locked things, what you added, dinner, and Sunday', () => {
  const s = fresh();
  const tue = M.remindersFor(s, '2026-09-29', { lead: 10 });
  const pick = tue.find((r) => /pick up/i.test(r.title));
  assert.ok(pick && pick.at === pick.at && pick.body.includes('in 10 minutes'), 'daycare pick up is reminded');
  assert.ok(tue.some((r) => r.kind === 'dinner' && r.at <= 15 * 60), 'an unpicked dinner asks at 3 pm');
  assert.ok(!tue.some((r) => /Walk, bath/.test(r.title)), 'routines are not reminded');
  s.dinners['2026-09-29'] = { name: 'Tacos', cook: 'me', items: [] };
  assert.ok(!M.remindersFor(s, '2026-09-29').some((r) => r.kind === 'dinner'), 'a picked dinner doesn’t ask');
  const sun = M.remindersFor(s, '2026-10-04');
  assert.ok(sun.some((r) => r.kind === 'sunday'), 'Sunday nudges the reset');
  s.weeks['2026-10-04'] = { reset: { step: 7, done: true } };
  assert.ok(!M.remindersFor(s, '2026-10-04').some((r) => r.kind === 'sunday'), 'not once it’s done');
  assert.equal(M.remindersFor(s, '2026-09-29', { locked: false, added: false, dinner: false }).length, 0);
  const keys = tue.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length, 'every reminder has its own key');
});

test('doing the day: done early, a few more minutes, ideas for open time, and one question', () => {
  const date = '2026-09-29';
  const find = (s, name) => M.resolveDay(s, date).blocks.filter((b) => b.name === name);
  /* done early ends the block at the last quarter hour, and the rest is open */
  const s = fresh();
  const work = find(s, 'Work')[0];
  const endAt = work.start + work.dur;
  const e = M.endEarly(s, date, work.base, endAt - 46);
  assert.ok(e.ok);
  assert.equal(e.end, endAt - 60);
  assert.equal(e.back, 60);
  checkDay(M.resolveDay(s, date), 'after done early');
  assert.equal(M.nowInfo(M.resolveDay(s, date), endAt - 46).kind, 'open', 'the time back is open');
  assert.equal(M.endEarly(s, date, work.base, work.start + 5).ok, false, 'not before a quarter hour has gone by');
  assert.equal(M.endEarly(s, date, 'mt:nothing', endAt).ok, false, 'meetings keep their time');
  /* a block cut in two keeps its later stretch: the first stretch can't end early, the last one can */
  const cut = fresh();
  M.placeAdd(cut, date, { name: 'Call', cat: 'people', icon: 'phone', dur: 30 }, 11 * 60);
  const halves = find(cut, 'Work');
  assert.equal(halves.length, 2, 'the call cuts Work in two');
  assert.equal(M.endEarly(cut, date, halves[0].base, 10 * 60).reason, 'continues');
  assert.ok(M.endEarly(M.clone(cut), date, halves[1].base, 12 * 60).ok, 'the last stretch can end early');
  /* fifteen more minutes: the stretch you're in, pushing what's next */
  const r1 = M.extendBlock(cut, date, halves[0].base, 15, 10 * 60);
  assert.ok(r1.ok);
  assert.equal(find(cut, 'Call')[0].start, 11 * 60 + 15, 'the call slides to 11:15');
  assert.equal(M.blockRecord(cut, date, halves[0].base).dur, work.dur, 'Work itself keeps its end');
  checkDay(M.resolveDay(cut, date), 'first stretch runs long');
  /* routines slide later */
  const s2 = fresh();
  const walk = find(s2, 'Walk, bath, feed')[0], bed0 = find(s2, 'Shower, bedtime')[0];
  const r2 = M.extendBlock(s2, date, walk.base, 15, walk.start + 30);
  assert.ok(r2.ok);
  assert.equal(find(s2, 'Shower, bedtime')[0].start, bed0.start + 15, 'bedtime slides 15 minutes');
  checkDay(M.resolveDay(s2, date), 'after fifteen more minutes');
  /* open time right after gives up the minutes, and keeps its end */
  const s3 = fresh();
  const cp0 = find(s3, 'Creative projects')[0];
  const r3 = M.extendBlock(s3, date, work.base, 15, 10 * 60);
  assert.ok(r3.ok);
  assert.equal(r3.took[0].name, 'Creative projects');
  const cp1 = find(s3, 'Creative projects')[0];
  assert.equal(cp1.start, cp0.start + 15);
  assert.equal(cp1.start + cp1.dur, cp0.start + cp0.dur);
  assert.equal(M.blockRecord(s3, date, work.base).dur, work.dur + 15);
  /* never a locked block */
  const s4 = fresh();
  const wrap = find(s4, 'Wrap up work')[0];
  const r4 = M.extendBlock(s4, date, wrap.base, 15, wrap.start + 10);
  assert.equal(r4.ok, false);
  assert.equal(r4.blocker.name, 'Daycare pick up');
  for (const b of M.resolveDay(fresh(), date).blocks.filter((x) => x.fixed && !x.sleep)) {
    const still = M.resolveDay(s2, date).blocks.find((x) => x.base === b.base);
    assert.ok(still && still.start === b.start, b.name + ' is locked and stays put');
  }
  /* the previews say what would happen and change nothing */
  const s5 = fresh(), before5 = JSON.stringify(s5.dates);
  assert.ok(M.previewExtend(s5, date, work.base, 15, 10 * 60).ok);
  assert.ok(M.previewEndEarly(s5, date, work.base, endAt - 46).ok);
  assert.equal(JSON.stringify(s5.dates), before5, 'previews leave the board alone');
  /* ideas for open time: up to three, each fits */
  const ideas = M.fillIdeas(s.palette, D.KIT_ROWS, 45);
  assert.ok(ideas.length > 0 && ideas.length <= 3);
  for (const p of ideas) assert.ok(p.dur <= 45 && p.dur >= 15, p.name + ' fits in 45 minutes');
  assert.equal(M.fillIdeas(s.palette, D.KIT_ROWS, 10).length, 0, 'nothing for ten minutes');
  /* one question at a time */
  const q = fresh();
  assert.equal(M.momentFor(q, date, 8 * 60).kind, 'kind', 'a weekday morning asks what kind of day');
  assert.equal(M.momentFor(q, date, 8 * 60, { kind: true }), null, 'asked once');
  assert.equal(M.momentFor(q, '2026-10-04', 8 * 60), null, 'not on Sunday');
  assert.equal(M.momentFor(q, date, 15 * 60 + 14).kind, 'dinner', 'dinner from 3 pm');
  assert.equal(M.momentFor(q, date, 15 * 60 + 14, { dinnerAt: 17 * 60 }), null, 'put off until 5');
  const again = M.momentFor(q, date, 17 * 60, { dinnerAt: 17 * 60 });
  assert.ok(again && again.again, 'and asks again at 5');
  assert.equal(M.momentFor(q, date, 17 * 60, { dinnerAt: 17 * 60, dinnerNo: true }), null, 'Don’t ask tonight means not tonight');
  assert.equal(M.momentFor(q, date, 15 * 60 + 14, {}, M.resolveDay(q, date)).kind, 'dinner', 'a day the app already has works the same');
  q.dinners[date] = { name: 'Tacos', cook: 'me', items: [] };
  assert.equal(M.momentFor(q, date, 15 * 60 + 14), null, 'a picked dinner doesn’t ask');
});

test('a to do is planned only when every open step has a time that has not gone by', () => {
  const s = fresh();
  const t = s.tasks.find((x) => x.id === 'dad-gift');
  M.placeAdd(s, '2026-09-30', { name: 'Pick a card or gift', cat: 'family', dur: 20, src: { type: 'step', task: 'dad-gift', id: 'dad-gift-s1' } }, 14 * 60);
  let p = M.taskPlan(t, M.placements(s).get('dad-gift'), '2026-09-29');
  assert.equal(p.status, 'partial', 'one step of three has a time');
  assert.equal(p.timed, 1);
  assert.equal(p.left, 25, 'the two steps without a time still need 25 minutes');
  assert.ok(M.dueSoon(s, '2026-09-29', 14).some((x) => x.task.id === 'dad-gift' && x.status === 'partial'), 'partly planned stays in due soon');
  M.placeAdd(s, '2026-09-30', { name: 'Order it', cat: 'family', dur: 15, src: { type: 'step', task: 'dad-gift', id: 'dad-gift-s2' } }, 15 * 60);
  M.placeAdd(s, '2026-09-30', { name: 'Write a note', cat: 'family', dur: 15, src: { type: 'step', task: 'dad-gift', id: 'dad-gift-s3' } }, 15 * 60 + 30);
  assert.equal(M.taskStatus(t, M.placements(s).get('dad-gift'), '2026-09-29'), 'planned');
  assert.equal(M.taskStatus(t, M.placements(s).get('dad-gift'), '2026-09-30', 16 * 60), 'missed', 'times earlier today that ended went by');
  assert.equal(M.taskStatus(t, M.placements(s).get('dad-gift'), '2026-09-30', 14 * 60 + 10), 'planned', 'a time still ahead today counts');
});

test('repeats: daily, weekdays, every two weeks, yearly, catching up, and skipping one', () => {
  assert.equal(M.nextDue('2026-10-02', 'weekdays'), '2026-10-05', 'Friday to Monday');
  assert.equal(M.nextDue('2026-10-02', 'daily'), '2026-10-03');
  assert.equal(M.nextDue('2026-10-02', 'biweekly'), '2026-10-16');
  assert.equal(M.nextDue('2026-10-02', 'yearly'), '2027-10-02');
  const s = fresh();
  const n = M.completeTask(s, 'laundry', '2026-10-30');
  assert.equal(n.due, '2026-10-31', 'a copy that would be late skips to the first on or after today');
  const b = M.completeTask(s, 'bills', '2026-09-27', true);
  assert.ok(s.tasks.find((x) => x.id === 'bills').skipped, 'skipped is kept on the old one');
  assert.ok(!b.skipped && !b.done && b.due === '2026-11-01');
  M.reopenTask(s, 'bills');
  assert.ok(!s.tasks.find((x) => x.id === 'bills').skipped);
});

test('your usual keeps the to dos you gave a time', () => {
  const s = fresh();
  const tue = '2026-09-29';
  M.placeAdd(s, tue, { name: 'Walk', cat: 'yours', dur: 30, src: { type: 'block', id: 'walk' } }, 14 * 60);
  M.placeAdd(s, tue, { name: 'Mail it', cat: 'family', dur: 15, src: { type: 'step', task: 'mom-card', id: 'mom-card-s3' } }, 15 * 60);
  const r = M.applyPreset(s, tue, D.PRESETS.find((p) => p.id === 'usual'), s.palette);
  assert.equal(r.kept, 1);
  const d = M.resolveDay(s, tue);
  assert.ok(d.blocks.some((b) => b.name === 'Mail it'), 'the step stays');
  assert.ok(!d.blocks.some((b) => b.name === 'Walk'), 'the walk comes off');
  checkDay(d, 'usual with a step');
});

test('weeks can alternate: every other week takes the other kind of week', () => {
  const s = fresh();
  s.rhythm.shapes.b = { name: 'Week B', days: { 2: { wake: 480, bed: 1320, blocks: [] } } };
  s.rhythm.alternate = { shape: 'b', from: '2026-09-27' };
  assert.equal(M.shapeOf(s, '2026-09-29'), 'usual', 'the week it starts from is the usual');
  assert.equal(M.shapeOf(s, '2026-10-06'), 'b', 'the next week is the other one');
  assert.equal(M.shapeOf(s, '2026-10-13'), 'usual');
  assert.equal(M.shapeOf(s, '2026-09-22'), 'b', 'and back in time too');
  assert.equal(M.resolveDay(s, '2026-10-06').wake, 480);
  s.weeks['2026-10-04'] = { shape: 'usual' };
  assert.equal(M.shapeOf(s, '2026-10-06'), 'usual', 'a week picked by hand wins');
  for (let i = 0; i < 60; i++) checkDay(M.resolveDay(s, M.addDays('2026-09-27', i)), 'alternating ' + i);
});

test('clashes keep both real commitments in view', () => {
  const s = fresh();
  s.meetings.push({ id: 'crit', name: 'Design critique', days: [2], start: 16 * 60 + 15, dur: 60 });
  const c = M.clashes(s, '2026-09-29');
  assert.equal(c.length, 1);
  assert.deepEqual([c[0].a.name, c[0].b.name].sort(), ['Daycare pick up', 'Design critique']);
  assert.equal(c[0].start, 16 * 60 + 30);
  assert.equal(M.clashes(s, '2026-09-30').length, 0, 'Wednesday has no critique');
  assert.equal(M.clashesIn(s, '2026-09-27', 7).length, 1);
});

test('capacity: open time from now on against the to dos that still need a time', () => {
  const s = fresh();
  const c = M.capacity(s, '2026-09-27', 7, '2026-09-29', 12 * 60);
  assert.ok(c.room > 0 && c.need > 0, JSON.stringify(c));
  const later = M.capacity(s, '2026-09-27', 7, '2026-09-29', 20 * 60);
  assert.ok(later.room < c.room, 'room shrinks as the day goes');
});

test('the sample week has nobody real in it and keeps every day whole', () => {
  const s = D.sampleState('2026-09-29');
  const text = JSON.stringify(s);
  assert.ok(!/Kim|Elijah|Russell|Salty/.test(text), 'no one from Russell’s life');
  for (let i = 0; i < 60; i++) checkDay(M.resolveDay(s, M.addDays('2026-09-27', i)), 'sample ' + i);
  assert.equal(s.groups[0].id, 'inbox');
  assert.ok(s.profile.sample);
});

test('two children, their own days, and work hours that change by the day', () => {
  const st = D.buildState({ name: 'Rae', partner: '', kids: ['Mia', 'Theo'], wake: { wd: 360, we: 420 }, bed: { wd: 1320, we: 1380 },
    work: { days: [1, 2, 3, 4], start: 540, end: 1020, hours: { 4: { start: 720, end: 1260 } } },
    cares: [{ kids: ['Mia'], days: [1, 2, 3, 4, 5], drop: 480, pick: 930 }, { kids: ['Theo'], days: [1, 3, 5], drop: 480, pick: 1020 }] }, '2026-09-27');
  for (let i = 0; i < 60; i++) checkDay(M.resolveDay(st, M.addDays('2026-09-27', i)), 'two kids ' + i);
  const mon = M.resolveDay(st, '2026-09-28');
  assert.ok(mon.blocks.some((b) => b.name === 'Drop off Mia and Theo' && b.fixed), 'same time, one block');
  assert.ok(mon.blocks.some((b) => b.name === 'Pick up Mia') && mon.blocks.some((b) => b.name === 'Pick up Theo'));
  const fri = M.resolveDay(st, '2026-10-02');
  assert.ok(fri.blocks.some((b) => b.name === 'Pick up Mia and Theo' || b.name === 'Pick up Theo'), 'care on a day off work');
  const thu = M.resolveDay(st, '2026-10-01');
  const work = thu.blocks.filter((b) => b.base === 'tpl:work');
  assert.ok(work.length && work[0].start >= 720, 'Thursday works a late shift');
  assert.equal(st.settings.modules.together, false, 'no partner, no together tab');
  assert.equal(st.groups[0].id, 'inbox');
});

test('a drop off or pick up 15 minutes after another rides in that block, never lost and never overlapping', () => {
  const st = D.buildState({ name: 'Sky', partner: '', kids: ['Ada', 'Ben', 'Dev'], wake: { wd: 360, we: 420 }, bed: { wd: 1320, we: 1380 }, work: null,
    cares: [{ kids: ['Ada'], days: [1, 2, 3, 4, 5], drop: 480, pick: 960 }, { kids: ['Ben'], days: [1, 2, 3, 4, 5], drop: 495, pick: 975 }, { kids: ['Dev'], days: [1, 3, 5], drop: 540, pick: 1005 }] }, '2026-09-27');
  for (let i = 0; i < 14; i++) checkDay(M.resolveDay(st, M.addDays('2026-09-27', i)), 'kids close together ' + i);
  const mon = M.resolveDay(st, '2026-09-28');
  const drops = mon.blocks.filter((b) => /^Drop off/.test(b.name)), picks = mon.blocks.filter((b) => /^Pick up/.test(b.name));
  assert.deepEqual(drops.map((b) => b.name), ['Drop off Ada and Ben', 'Drop off Dev']);
  assert.deepEqual(picks.map((b) => b.name), ['Pick up Ada and Ben', 'Pick up Dev']);
  ['Ada', 'Ben', 'Dev'].forEach((k) => { assert.ok(drops.some((b) => b.name.includes(k)), k + ' is dropped off'); assert.ok(picks.some((b) => b.name.includes(k)), k + ' is picked up'); });
});

test('a 24 hour clock', () => {
  M.setClock24(true);
  try {
    assert.equal(M.clock(19 * 60 + 30), '19:30');
    assert.equal(M.clock(7 * 60), '07:00');
    assert.equal(M.span(9 * 60, 17 * 60), '09:00 to 17:00');
    assert.equal(M.clock(1440), '24:00');
  } finally { M.setClock24(false); }
  assert.equal(M.clock(19 * 60 + 30), '7:30 pm');
});

test('an older save gets an Inbox, modules, and saved shopping', () => {
  const old = fresh(); old.v = 5; old.groups = old.groups.filter((g) => g.id !== 'inbox'); delete old.shopping; old.settings = { sound: true, motion: 'full' };
  D.migrate(old);
  assert.equal(old.v, D.VERSION);
  assert.equal(old.groups[0].id, 'inbox');
  assert.deepEqual(old.settings.modules, { dinners: true, together: true });
  assert.deepEqual(old.shopping, {});
});

test('take it easy: meals and locked blocks stay, to dos go back to the list', () => {
  const s = fresh();
  const tue = '2026-09-29';
  M.placeAdd(s, tue, { name: 'Mail it', cat: 'family', dur: 15, src: { type: 'step', task: 'mom-card', id: 'mom-card-s3' } }, 15 * 60);
  const r = M.applyPreset(s, tue, D.PRESETS.find((p) => p.id === 'easy'), s.palette);
  assert.equal(r.back, 1);
  const d = M.resolveDay(s, tue);
  checkDay(d, 'easy tuesday');
  assert.ok(d.blocks.some((b) => b.dinner), 'dinner stays');
  assert.ok(d.blocks.some((b) => b.name === 'Daycare pick up'), 'locked stays');
  assert.ok(!d.blocks.some((b) => b.name === 'Work'), 'work that isn’t locked comes off');
  assert.ok(M.dueSoon(s, '2026-09-29', 14).some((x) => x.task.id === 'mom-card'), 'the card is back on the list');
});

test('a calendar’s times are written in the board’s home zone, whatever zone the device is in', () => {
  const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:a', 'DTSTART;TZID=America/New_York:20261005T180000', 'DTEND;TZID=America/New_York:20261005T190000', 'SUMMARY:Call', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:b', 'DTSTART:20261006T013000Z', 'DURATION:PT30M', 'SUMMARY:Late', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const west = M.parseIcs(ics, '2026-09-27', '2026-12-31', 800, { tz: 'America/Los_Angeles' }).items;
  assert.deepEqual(west.map((x) => [x.name, x.date, x.start]), [['Call', '2026-10-05', 900], ['Late', '2026-10-05', 1110]], '6 pm in New York is 3 pm at home in Los Angeles');
  const tokyo = M.parseIcs(ics, '2026-09-27', '2026-12-31', 800, { tz: 'Asia/Tokyo' }).items;
  assert.deepEqual(tokyo.map((x) => [x.date, x.start]), [['2026-10-06', 420], ['2026-10-06', 630]], 'and the next morning at a home in Tokyo');
  /* a wall clock time and the instant it is, across a change of clocks */
  assert.equal(M.zoneToUtc('America/Los_Angeles', 2026, 10, 5, 18, 30).toISOString(), '2026-10-06T01:30:00.000Z');
  assert.equal(M.zoneToUtc('America/Los_Angeles', 2026, 12, 5, 18, 30).toISOString(), '2026-12-06T02:30:00.000Z');
  assert.deepEqual(M.inZone(new Date('2026-10-06T01:30:00Z'), 'America/Los_Angeles'), { date: '2026-10-05', min: 1110 });
  assert.equal(M.zoneToUtc('Not/AZone', 2026, 10, 5, 18, 30), null);
});

test('calendars: the first Monday, the last Friday, the 15th and the last day, and a date taken out', () => {
  const ics = ['BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:a', 'DTSTART:20261005T090000', 'DTEND:20261005T100000', 'RRULE:FREQ=MONTHLY;BYDAY=1MO;COUNT=4', 'SUMMARY:First Monday', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:b', 'DTSTART:20261030T170000', 'DTEND:20261030T180000', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3', 'SUMMARY:Last Friday', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:c', 'DTSTART;VALUE=DATE:20261015', 'RRULE:FREQ=MONTHLY;BYMONTHDAY=15,-1;COUNT=4', 'SUMMARY:Pay', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:d', 'DTSTART;TZID=America/Los_Angeles:20261001T190000', 'DURATION:PT1H', 'RRULE:FREQ=DAILY;COUNT=4', 'EXDATE:20261003T020000Z', 'SUMMARY:Evening', 'END:VEVENT',
    'END:VCALENDAR'].join('\r\n');
  const r = M.parseIcs(ics, '2026-09-27', '2027-03-01', 800, { tz: 'America/Los_Angeles' }).items;
  const on = (name) => r.filter((x) => x.name === name).map((x) => x.date);
  assert.deepEqual(on('First Monday'), ['2026-10-05', '2026-11-02', '2026-12-07', '2027-01-04']);
  assert.deepEqual(on('Last Friday'), ['2026-10-30', '2026-11-27', '2026-12-25']);
  assert.deepEqual(on('Pay'), ['2026-10-15', '2026-10-31', '2026-11-15', '2026-11-30']);
  /* the date taken out is written in UTC, where that evening is already the next day; it still comes out */
  assert.deepEqual(on('Evening'), ['2026-10-01', '2026-10-03', '2026-10-04'], 'the evening of October 2 is the one taken out');
});

test('plain words: 6/10 follows the place, and ids don’t repeat', () => {
  const s = D.defaultState('2026-09-27');
  assert.equal(M.parseQuick('Dentist 6/10', '2026-09-29', s.palette, 600).due, '2027-06-10');
  assert.equal(M.parseQuick('Dentist 6/10', '2026-09-29', s.palette, 600, { dayFirst: true }).due, '2026-10-06');
  const ids = new Set();
  for (let i = 0; i < 4000; i++) ids.add(M.newId('t'));
  assert.equal(ids.size, 4000);
});

test('a to do with every time it needs is still late when those times come after it’s due', () => {
  const s = fresh(), today = '2026-09-29';
  const t = { id: 'late1', name: 'Taxes', due: '2026-09-30', group: s.groups[0].id, steps: [{ id: 'a', name: 'Find the forms', dur: 30 }, { id: 'b', name: 'File', dur: 30 }] };
  s.tasks.push(t);
  const put = (date, step, id) => { const dd = (s.dates[date] = s.dates[date] || {}); dd.adds = (dd.adds || []).concat([{ id, name: 'x', cat: 'yours', start: 600, dur: 30, src: step ? { type: 'step', task: t.id, id: step } : { type: 'task', id: t.id } }]); };
  put('2026-10-06', 'a', 'p1'); put('2026-10-07', 'b', 'p2');
  let p = M.taskPlan(t, M.placements(s).get(t.id), today, 600);
  assert.equal(p.status, 'planned', 'scheduling is its own fact: every step has a time');
  assert.equal(p.ends, '2026-10-07');
  assert.equal(p.after, true, 'and the deadline is its own: those times come after it’s due');
  assert.ok(M.dueSoon(s, today, 7, 600).some((x) => x.task.id === t.id), 'so it stays in Due soon');
  assert.equal(M.upcoming(s, today, 14).find((x) => x.id === t.id).after, true);
  /* what needs a time is unchanged: nothing, so capacity doesn't count it twice */
  assert.equal(p.left, 0);
  /* due after its last time: planned, and out of Due soon */
  t.due = '2026-10-07';
  p = M.taskPlan(t, M.placements(s).get(t.id), today, 600);
  assert.equal(p.after, false);
  assert.ok(!M.dueSoon(s, today, 14, 600).some((x) => x.task.id === t.id));
  /* the whole thing placed once, in time, settles it whatever its steps say */
  t.due = '2026-09-30';
  put('2026-09-30', null, 'p3');
  p = M.taskPlan(t, M.placements(s).get(t.id), today, 600);
  assert.equal(p.ends, '2026-09-30');
  assert.equal(p.after, false);
  /* done is done */
  t.done = true;
  assert.equal(M.taskPlan(t, M.placements(s).get(t.id), today, 600).after, false);
  /* no due date, no deadline */
  const free = { id: 'free1', name: 'Someday', steps: [] };
  assert.equal(M.taskPlan(free, [{ date: '2026-10-20', add: { start: 600, dur: 30 }, step: null }], today, 600).after, false);
});

test('groceries: only what’s on the list now counts as in the cart', () => {
  const s = fresh(), ws = '2026-09-27', dates = M.range(ws, 7);
  const three = s.pantry.slice(0, 3).map((x) => x.id), other = s.pantry[3].id;
  s.dinners[dates[2]] = { name: 'Three things', cook: 'me', items: three };
  s.shopping = { [ws]: { [three[0]]: 1, [three[1]]: 1, [three[2]]: 1 } };
  let g = M.groceryProgress(s, dates);
  assert.deepEqual([g.got, g.total, g.left], [3, 3, 0]);
  /* the dinner changes to one other thing: the three checks are for things no longer on the list */
  s.dinners[dates[2]] = { name: 'One thing', cook: 'me', items: [other] };
  g = M.groceryProgress(s, dates);
  assert.deepEqual([g.got, g.total, g.left], [0, 1, 1], 'never 3 of 1');
  assert.ok(g.got <= g.total);
  /* the checks are kept: change back and they still stand */
  s.dinners[dates[2]] = { name: 'Three things', cook: 'me', items: three };
  assert.equal(M.groceryProgress(s, dates).got, 3);
  /* a night that isn't cooked adds nothing */
  s.dinners[dates[2]].cook = 'order';
  assert.deepEqual([M.groceryProgress(s, dates).got, M.groceryProgress(s, dates).total], [0, 0]);
});

test('weeks that alternate: the week says which kind it is, and a pick for one week wins', () => {
  const s = D.sampleState('2026-09-29');
  s.rhythm.shapes = { alt: { name: 'Nights', days: JSON.parse(JSON.stringify(s.rhythm.days)) } };
  s.rhythm.alternate = { shape: 'alt', from: '2026-09-27' };
  assert.equal(M.shapeOf(s, '2026-09-29'), 'usual');
  assert.equal(M.shapeOf(s, '2026-10-06'), 'alt', 'every second week takes the other kind');
  assert.equal(M.shapeOf(s, '2026-10-13'), 'usual');
  s.weeks['2026-10-04'] = { shape: 'usual' };
  assert.equal(M.shapeOf(s, '2026-10-06'), 'usual', 'a week that picked its own keeps it');
  s.weeks['2026-09-27'] = { shape: 'alt' };
  assert.equal(M.shapeOf(s, '2026-09-29'), 'alt');
});
