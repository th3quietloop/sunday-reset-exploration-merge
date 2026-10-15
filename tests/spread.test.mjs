// V11 goals: spreading a to-do's steps over the days before it's due (Model.spreadPlan, applySpread), and
// finding new times when a day is missed (Model.missedSteps, reflowTask). Steps go only into quiet time
// (open gaps, and soft time that's yours or open), under a cap per day, and nothing on the board moves.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14', THU = '2026-10-15', FRI = '2026-10-16', SAT = '2026-10-17';
const WEEK = [MON, TUE, WED, THU, FRI, SAT];
const copy = (v) => JSON.parse(JSON.stringify(v));

/* the sample family's week, with Clean my room due Saturday, broken down by the library */
function board(steps) {
  const st = D.sampleState(MON);
  const list = steps || M.breakdown('Clean my room', {}, D).steps;
  st.tasks.push({ id: 'room', name: 'Clean my room', group: 'home', icon: 'broom', cat: 'home', due: SAT, dur: null, done: false, repeat: null, steps: list.map((s, i) => ({ id: 'room-s' + (i + 1), name: s.name, dur: s.dur, done: false })) });
  return st;
}
const task = (st) => st.tasks.find((t) => t.id === 'room');
const mine = (st, d) => ((st.dates[d] && st.dates[d].adds) || []).filter((a) => a.src && a.src.task === 'room');
const minutesOn = (st, d) => mine(st, d).reduce((a, x) => a + x.dur, 0);
/* everything on a day that isn't open time and isn't this to-do: it never moves */
const others = (st, d) => M.calendarDay(st, d).blocks.filter((b) => !b.soft && !(b.src && b.src.task === 'room')).map((b) => b.key + '@' + b.start + '+' + b.dur).sort();
const snapshot = (st) => WEEK.concat(['2026-10-18']).map((d) => others(st, d));
const noOverlap = (st, d) => {
  const bl = M.calendarDay(st, d).blocks.slice().sort((a, b) => a.start - b.start);
  for (let i = 1; i < bl.length; i++) assert.ok(bl[i].start >= bl[i - 1].start + bl[i - 1].dur, d + ': ' + bl[i - 1].key + ' and ' + bl[i].key + ' overlap');
};

test('clean my room over six days, about 15 minutes a day, done by Saturday', () => {
  const st = board(), before = JSON.stringify(st);
  assert.equal(M.spreadCap('Clean my room'), 15, 'housework spreads 15 minutes a day');
  const plan = M.spreadPlan(st, 'room', {}, MON, 7 * 60);
  assert.equal(JSON.stringify(st), before, 'a preview changes nothing');
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.days.map((d) => d.date), WEEK, 'one day each, Monday to Saturday');
  assert.ok(plan.days.every((d) => d.items.length === 1 && d.items[0].dur === 15));
  assert.deepEqual(plan.days.map((d) => d.items[0].name), ['Pick up the floor', 'Put away laundry', 'Make the bed', 'Clear the desk', 'Dust', 'Vacuum'], 'steps go in order');
  assert.equal(plan.message, '6 steps over 6 days, about 15 minutes a day, done by Saturday.');
  assert.equal(plan.by, SAT);
  assert.equal(plan.need, 90);
  assert.ok(plan.room >= plan.need);
  assert.deepEqual(plan.unplaced, []);
  // Monday from now on: 7:30, after the time it is now
  assert.ok(plan.days[0].items[0].start >= 7 * 60);
  // Tuesday has a run at 7:30, so the step waits for it to end
  assert.equal(plan.days[1].items[0].start, 8 * 60);
});

test('applySpread puts them on the board where nothing moves, and keeps how it was spread', () => {
  const st = board(), was = snapshot(st);
  const plan = M.spreadPlan(st, 'room', {}, MON, 7 * 60);
  assert.equal(M.applySpread(st, 'room', plan), 6);
  assert.deepEqual(snapshot(st), was, 'locked blocks, routines, and what was placed stay exactly where they were');
  assert.deepEqual(task(st).spread, { days: 'daily', cap: 15, when: 'any' }, 'the by date is the due date, so it isn’t kept twice');
  for (const d of WEEK) { assert.equal(minutesOn(st, d), 15, d); noOverlap(st, d); }
  assert.ok(mine(st, MON).every((a) => a.src.type === 'step' && a.src.task === 'room' && a.cat === 'home'));
  assert.equal(M.taskPlan(task(st), M.placements(st).get('room'), MON, 7 * 60).status, 'planned');
  // asking again: everything has a time
  assert.equal(M.spreadPlan(st, 'room', {}, MON, 7 * 60).message, 'Every step already has a time.');
});

test('a day with no room is skipped, and the plan says what’s short', () => {
  const st = board();
  M.placeAdd(st, WED, { name: 'Errand', cat: 'home', icon: 'car', dur: 60, src: { type: 'block', id: 'errand' } }, 450);
  M.placeAdd(st, WED, { name: 'Errand', cat: 'home', icon: 'car', dur: 45, src: { type: 'block', id: 'errand' } }, 1035);
  assert.deepEqual(M.quietWindows(st, WED, 'any', 0), [], 'Wednesday has no quiet time left');
  const plan = M.spreadPlan(st, 'room', {}, MON, 7 * 60);
  assert.ok(!plan.days.some((d) => d.date === WED));
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.unplaced, ['room-s6']);
  assert.equal(plan.message, 'This needs one more day than is left before Saturday.');
});

test('a trip day is skipped', () => {
  const st = board();
  st.events.push({ id: 'away', kind: 'trip', name: 'A trip', icon: 'plane', date: THU, end: FRI, leave: 540, back: 1020 });
  const plan = M.spreadPlan(st, 'room', {}, MON, 7 * 60);
  assert.deepEqual(plan.days.map((d) => d.date), [MON, TUE, WED, SAT]);
  assert.equal(plan.message, 'This needs 2 more days than are left before Saturday.');
});

test('too few days before it’s due: how many more it needs', () => {
  const plan = M.spreadPlan(board(), 'room', { by: WED }, MON, 7 * 60);
  assert.equal(plan.ok, false);
  assert.equal(plan.unplaced.length, 3);
  assert.equal(plan.message, 'This needs 3 more days than are left before Wednesday.');
  const gone = M.spreadPlan(board(), 'room', { by: '2026-10-10' }, MON, 7 * 60);
  assert.equal(gone.message, 'Its due date has gone by. Pick a day to be done by.');
});

test('weekdays, weekends, or days you pick, and a cap you set', () => {
  const ends = M.spreadPlan(board(), 'room', { days: 'weekends', cap: 30, by: '2026-10-25' }, MON, 7 * 60);
  assert.equal(ends.ok, true);
  assert.ok(ends.days.every((d) => [0, 6].includes(M.weekday(d.date))));
  assert.ok(ends.days.every((d) => d.items.reduce((a, x) => a + x.dur, 0) <= 30));
  const picked = M.spreadPlan(board(), 'room', { days: [1, 3, 5], cap: 30 }, MON, 7 * 60);
  assert.deepEqual(picked.days.map((d) => d.date), [MON, WED, FRI]);
  assert.equal(picked.message, '6 steps over 3 days, about 30 minutes a day, done by Friday.');
  const week = M.spreadPlan(board(), 'room', { days: 'weekdays' }, MON, 7 * 60);
  assert.ok(week.days.every((d) => M.weekday(d.date) >= 1 && M.weekday(d.date) <= 5));
});

test('the part of the day asked for comes first; with no room there, the rest of the day', () => {
  // someone on their own has a free evening: evening steps go there
  const solo = D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, MON);
  solo.tasks.push(Object.assign(copy(board().tasks.find((t) => t.id === 'room'))));
  const eve = M.spreadPlan(solo, 'room', { when: 'evening' }, MON, 7 * 60);
  assert.ok(eve.ok && eve.days.every((d) => d.items.every((x) => x.start >= 1080 && x.part === 'evening')));
  const morn = M.spreadPlan(solo, 'room', { when: 'morning' }, MON, 7 * 60);
  assert.ok(morn.days.every((d) => d.items.every((x) => x.start < 720)));
  // the sample family's evenings are time together, not quiet time: the steps find the afternoon instead
  const fam = M.spreadPlan(board(), 'room', { when: 'evening' }, MON, 7 * 60);
  assert.ok(fam.ok && fam.days.every((d) => d.items.every((x) => x.part !== 'evening')));
});

test('a step longer than the cap gets a day of its own', () => {
  const st = board([{ name: 'Clear the floor', dur: 10 }, { name: 'Sort the closet', dur: 40 }, { name: 'Vacuum', dur: 10 }]);
  const plan = M.spreadPlan(st, 'room', {}, MON, 7 * 60);
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.days.map((d) => d.items.map((x) => x.name)), [['Clear the floor'], ['Sort the closet'], ['Vacuum']]);
  assert.equal(plan.days[1].items[0].dur, 45);
});

test('steps placed ahead stay where they are and count toward their day', () => {
  const st = board();
  const bed = M.placeAdd(st, THU, { name: 'Make the bed', cat: 'home', icon: 'broom', dur: 15, src: { type: 'step', task: 'room', id: 'room-s3' } }, 450).add;
  assert.equal(bed.pinned, true, 'a step someone puts on a day is pinned');
  const plan = M.spreadPlan(st, 'room', {}, MON, 7 * 60);
  assert.ok(!plan.days.some((d) => d.items.some((x) => x.step === 'room-s3')));
  assert.ok(!plan.days.some((d) => d.date === THU), 'Thursday is full at 15 minutes');
  assert.equal(plan.message, '5 steps over 5 days, about 15 minutes a day, done by Saturday.');
  // a missed day slides the planned steps, never the one placed by hand
  M.applySpread(st, 'room', plan);
  task(st).steps[0].done = true;
  M.reflowTask(st, 'room', WED, 7 * 60);
  assert.ok(mine(st, THU).some((a) => a.id === bed.id && a.start === 450));
  for (const d of WEEK) assert.ok(minutesOn(st, d) <= 15, d);
});

test('a missed day: the step takes the next day and the rest slide, never over the cap', () => {
  const st = board();
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', {}, MON, 7 * 60));
  task(st).steps[0].done = true;
  const was = snapshot(st);
  // Wednesday morning: Tuesday's step didn't happen
  assert.deepEqual(M.missedSteps(st, WED, 7 * 60).map((x) => [x.step, x.date]), [['room-s2', TUE]]);
  const r = M.reflowTask(st, 'room', WED, 7 * 60);
  assert.deepEqual(r.moved.map((m) => [m.name, m.from, m.to]), [['Put away laundry', TUE, WED], ['Make the bed', WED, THU], ['Clear the desk', THU, FRI], ['Dust', FRI, SAT]]);
  assert.deepEqual(r.unplaced, ['room-s6']);
  assert.equal(r.message, 'Put away laundry moved to today. This needs one more day than is left before Saturday.');
  assert.deepEqual(mine(st, TUE), [], 'the missed time leaves Tuesday');
  for (const d of WEEK) { assert.ok(minutesOn(st, d) <= 15, d + ' stays under its cap'); noOverlap(st, d); }
  assert.deepEqual(snapshot(st), was, 'nothing else moved');
  assert.deepEqual(M.missedSteps(st, WED, 7 * 60), []);
  // found Tuesday night instead, a step missed that day moves to the next day, never later the same night
  const late = board();
  M.applySpread(late, 'room', M.spreadPlan(late, 'room', {}, MON, 7 * 60));
  task(late).steps[0].done = true;
  assert.match(M.reflowTask(late, 'room', TUE, 21 * 60).message, /^Put away laundry moved to tomorrow\./);
  assert.deepEqual(mine(late, TUE), []);
});

test('with room to spare, it’s still done by Saturday', () => {
  const st = board();
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', { cap: 30 }, MON, 7 * 60));
  assert.deepEqual([MON, TUE, WED].map((d) => minutesOn(st, d)), [30, 30, 30]);
  task(st).steps[0].done = true; task(st).steps[1].done = true;
  const r = M.reflowTask(st, 'room', WED, 7 * 60);
  assert.equal(r.message, 'Make the bed and clear the desk moved to today. Still done by Saturday.');
  assert.deepEqual(r.unplaced, []);
  assert.equal(minutesOn(st, WED), 30, 'Wednesday stays at its cap of 30');
  assert.equal(minutesOn(st, THU), 30, 'what was on Wednesday slid to Thursday');
  assert.equal(M.taskPlan(task(st), M.placements(st).get('room'), WED, 7 * 60).status, 'planned');
});

test('calling it again moves nothing, and a preview changes nothing', () => {
  const st = board();
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', {}, MON, 7 * 60));
  const before = JSON.stringify(st);
  const pv = M.reflowTask(st, 'room', WED, 7 * 60, { preview: true });
  assert.equal(JSON.stringify(st), before, 'a preview leaves the board as it was');
  assert.ok(pv.moved.length > 0);
  const r1 = M.reflowTask(st, 'room', WED, 7 * 60);
  assert.deepEqual(r1.moved.map((m) => m.to), pv.moved.map((m) => m.to), 'the preview said what would happen');
  const after = JSON.stringify(st);
  const r2 = M.reflowTask(st, 'room', WED, 7 * 60);
  assert.deepEqual(r2, { moved: [], unplaced: [], message: '' });
  assert.equal(JSON.stringify(st), after, 'nothing moves twice');
});

test('a step you pinned stays where you put it', () => {
  const st = board();
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', {}, MON, 7 * 60));
  task(st).steps[0].done = true;
  const desk = mine(st, THU)[0];
  assert.ok(M.moveAdd(st, desk.id, THU, 1035).ok, 'moved by hand to after pick up');
  assert.equal(M.findAdd(st, desk.id).add.pinned, true, 'which pins it');
  const r = M.reflowTask(st, 'room', WED, 7 * 60);
  assert.ok(mine(st, THU).some((a) => a.id === desk.id && a.start === 1035), 'pinned stays where it was put');
  assert.ok(!r.moved.some((m) => m.step === 'room-s4'));
  for (const d of WEEK) assert.ok(minutesOn(st, d) <= 15);
});

test('locked blocks never move, whatever is spread or found again', () => {
  const st = board();
  const locked = () => WEEK.map((d) => M.calendarDay(st, d).blocks.filter((b) => b.fixed).map((b) => b.key + '@' + b.start + '+' + b.dur));
  const was = locked();
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', { cap: 60, when: 'morning' }, MON, 7 * 60));
  M.reflowTask(st, 'room', THU, 9 * 60);
  assert.deepEqual(locked(), was);
  for (const d of WEEK) noOverlap(st, d);
});

test('a to-do with no steps, every step done, or gone says so plainly', () => {
  const st = board([]);
  assert.equal(M.spreadPlan(st, 'room', {}, MON, 420).message, 'Break it into steps first, then spread them out.');
  const done = board();
  task(done).steps.forEach((s) => { s.done = true; });
  assert.equal(M.spreadPlan(done, 'room', {}, MON, 420).message, 'Every step is done.');
  assert.equal(M.spreadPlan(done, 'nope', {}, MON, 420).message, 'That to-do is gone.');
  assert.equal(M.spreadCap('Send the quarterly report'), 30, 'everything else spreads 30 minutes a day');
});

test('a repeating to-do’s next copy spreads the same way, toward its own date', () => {
  const st = board();
  task(st).repeat = 'weekly';
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', { cap: 30, by: FRI }, MON, 420));
  assert.equal(task(st).spread.by, FRI, 'a by date that isn’t the due date is kept');
  const next = M.completeTask(st, 'room', MON);
  assert.deepEqual(next.spread, { days: 'daily', cap: 30, when: 'any' });
  assert.equal(next.due, '2026-10-24');
});
