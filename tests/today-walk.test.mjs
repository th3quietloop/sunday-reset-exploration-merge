// V11, the Today walk (Oct 15, docs/walk/today-and-phone.md, sections 1 to 7): time from the person's day, not the
// clock (Model.ownDay, dayAt, and momentFor on a day whose evening runs past midnight), Done from the first minute
// (previewEndEarly and endEarly with { now }), your own next thing in open time (nextUp, startNext, openIdeas),
// and the band's words and buttons cut out of app.js (the evening, the countdown, Done's name, the kept line).
// The boards are made up: the sample family (Alex, Sam, Robin), Late shifts (Riley, work 3 to 11:30 pm, bed 2 am),
// and Jordan (classes 9 to 3, the bar exam, a torts essay due Thursday).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { M, D, app, plain } from './v11-rig.mjs';

await import('../board/src/scenarios.js');
const S = globalThis.Scenarios;
const TUE = '2026-10-13', MON = '2026-10-12', THU = '2026-10-15', SAT = '2026-10-17';
const late = () => S.build('late', D, M, TUE, null);
const sample = () => D.sampleState(TUE);
/* Jordan: on his own, classes Monday to Thursday 9 to 3 (locked), up at 7, bed at 11:30, a torts essay due Thursday */
function jordan(withGoal) {
  const st = D.buildState({ name: 'Jordan', kids: [], wake: { wd: 420, we: 480 }, bed: { wd: 1410, we: 1410 }, work: { days: [1, 2, 3, 4], start: 540, end: 900, hours: {}, fixed: true }, cares: [], help: { dinners: true, together: true } }, MON);
  st.tasks = [
    { id: 'torts', name: 'Torts essay', group: 'inbox', icon: 'note', cat: 'work', due: THU, dur: null, repeat: null, done: false, steps: [{ id: 'torts-s1', name: 'Outline torts essay', dur: 30, done: false }, { id: 'torts-s2', name: 'Write the first draft', dur: 90, done: false }] },
    { id: 'laundry', name: 'Laundry', group: 'inbox', icon: 'shirt', cat: 'home', due: SAT, dur: 45, repeat: null, done: false, steps: [] }
  ];
  if (withGoal) {
    const g = M.newGoal({ name: 'Pass the bar exam', kind: 'exam', date: '2027-02-23', today: MON, parts: [{ name: 'Civil Procedure', min: 3600 }, { name: 'Contracts', min: 3600 }], rhythm: { days: [1, 2, 3, 4, 5], wd: 120, we: 0, when: 'any', chunk: 60 } });
    st.goals = [g];
    M.planGoal(st, g.id, MON, 0, { horizon: 14 });
  }
  return st;
}

test('a day whose evening runs past midnight keeps its own wake, bed, and dinner (Late shifts)', () => {
  const st = late(), cal = M.calendarDay(st, TUE);
  /* the calendar line starts with last night's dinner tail, which is what fooled the band */
  assert.equal(cal.wake, 0, 'the calendar line starts at midnight');
  assert.equal(cal.blocks.find((b) => b.dinner).sourceDate, MON, 'and its first dinner is last night’s');
  assert.deepEqual(plain(M.ownDay(st, TUE)), { date: TUE, wake: 600, bed: 1560 });
  /* 1 am is still Monday's day (bed at 2 am); 3 am is asleep; 9 pm is Tuesday's */
  assert.deepEqual(plain(M.dayAt(st, TUE, 60)), { date: MON, wake: -840, bed: 120, asleep: false });
  assert.equal(M.dayAt(st, TUE, 180).asleep, true);
  assert.equal(M.dayAt(st, TUE, 1260).date, TUE);
  /* the kind of day is asked from this morning's wake to four hours after, never at 1 am on the way to bed */
  assert.equal(M.momentFor(st, TUE, 60, {}, cal), null, 'nothing at 1 am');
  assert.equal(M.momentFor(st, TUE, 600, {}, cal).kind, 'kind', 'at wake, 10 am');
  assert.equal(M.momentFor(st, TUE, 839, {}, cal).kind, 'kind', 'at 1:59 pm');
  assert.notEqual((M.momentFor(st, TUE, 840, {}, cal) || {}).kind, 'kind', 'not four hours after wake');
  /* tonight's dinner is today's own, 11:30 pm, asked mid-shift at 9 pm and until it's over at 12:15 am */
  const at9 = M.momentFor(st, TUE, 1260, {}, cal);
  assert.equal(at9.kind, 'dinner');
  assert.equal(at9.block.sourceDate, TUE);
  assert.equal(at9.block.start, 1410);
  assert.equal(M.momentFor(st, TUE, 1435, {}, cal).kind, 'dinner', 'still at 11:55 pm');
  /* the carry in (last night's dinner, over at 12:15 am) is never what's asked */
  for (const min of [0, 5, 10]) assert.notEqual((M.momentFor(st, TUE, min, {}, cal) || {}).kind, 'dinner', 'not last night’s at ' + min);
  /* a picked dinner, put off, or not tonight: as before */
  assert.equal(M.momentFor(st, TUE, 1260, { dinnerNo: true }, cal), null);
  st.dinners[TUE] = { name: 'Noodles', cook: 'order', items: [] };
  assert.equal(M.momentFor(st, TUE, 1260, {}, M.calendarDay(st, TUE)), null, 'decided doesn’t ask');
});

test('an ordinary day asks the kind of day from wake to four hours after, and less once it’s always the usual', () => {
  const st = sample(), d = M.calendarDay(st, TUE);
  assert.equal(M.ownDay(st, TUE).wake, 390);
  assert.equal(M.momentFor(st, TUE, 400, {}, d).kind, 'kind');
  assert.equal(M.momentFor(st, TUE, 629, {}, d).kind, 'kind');
  assert.equal(M.momentFor(st, TUE, 630, {}, d), null, '10:30 am is four hours after 6:30');
  /* three usual weekdays in a row: weekdays are quiet, a day unlike the rest still asks */
  assert.equal(M.momentFor(st, TUE, 460, { quietWeekdays: true }, d), null);
  assert.equal(M.dayDiffers(st, TUE), false);
  assert.equal(M.dayDiffers(st, SAT), true, 'Saturday');
  assert.equal(M.momentFor(st, SAT, 500, { quietWeekdays: true }, M.calendarDay(st, SAT)).kind, 'kind');
  /* a weekday with a trip, the day after one, and one marked off */
  st.events.push({ id: 'away', kind: 'trip', name: 'Lake', icon: 'plane', date: '2026-10-19', end: '2026-10-20', leave: 540, back: 1020 });
  assert.equal(M.dayDiffers(st, '2026-10-20'), true, 'on a trip');
  assert.equal(M.dayDiffers(st, '2026-10-21'), true, 'the day after one');
  assert.equal(M.dayDiffers(st, '2026-10-22'), false);
  /* a weekday without work, when other weekdays have it (Jordan's Friday) */
  const j = jordan(false);
  assert.equal(M.dayDiffers(j, '2026-10-16'), true, 'Friday without classes');
  assert.equal(M.dayDiffers(j, THU), false);
  /* never on Sunday, as before */
  assert.equal(M.momentFor(st, '2026-10-18', 500, {}, M.calendarDay(st, '2026-10-18')), null);
});

test('Done from the first minute: ends now rounded up, never back to before now, and the last five minutes keep the end', () => {
  const st = sample(), run = M.calendarDay(st, TUE).blocks.find((b) => b.name === 'Run');
  const key = run.sourceKey, at = (min) => M.previewEndEarly(st, TUE, key, min, { now: true });
  assert.equal(run.start, 450); assert.equal(run.dur, 30);
  /* 7:40 ends at 7:45, and gives back 15 minutes, only the time gained */
  assert.deepEqual([at(460).ok, at(460).end, at(460).back], [true, 465, 15]);
  /* the first minute ends at the first quarter hour, never at its start */
  assert.equal(at(450).end, 465);
  assert.equal(at(451).end, 465);
  /* on a quarter hour, it ends there */
  const s2 = sample(); M.placeAdd(s2, TUE, { name: 'Read', cat: 'yours', icon: 'book', dur: 60, src: { type: 'custom' } }, 600);
  const rd = M.calendarDay(s2, TUE).blocks.find((b) => b.name === 'Read');
  assert.equal(M.previewEndEarly(s2, TUE, rd.sourceKey, 630, { now: true }).end, 630);
  /* the last five minutes, or a next quarter hour that is the end: Done keeps the end, nothing changes */
  for (const min of [470, 475, 476, 479]) { const r = at(min); assert.ok(r.ok && r.keep, 'keeps its end at ' + min); assert.equal(r.end, 480); assert.equal(r.back, 0); }
  const before = JSON.stringify(st.dates);
  assert.ok(M.endEarly(st, TUE, key, 476, { now: true }).keep);
  assert.equal(JSON.stringify(st.dates), before, 'keeping the end changes nothing');
  /* ending now changes the block, and the time after it is open */
  const e = M.endEarly(st, TUE, key, 460, { now: true });
  assert.equal(e.end, 465);
  assert.equal(M.calendarDay(st, TUE).blocks.find((b) => b.name === 'Run').dur, 15);
  /* before it starts or after it's over: no */
  assert.equal(at(440).ok, false);
  /* without { now }, the other versions keep the last quarter hour, as before */
  const old = M.previewEndEarly(sample(), TUE, key, 460);
  assert.equal(old.ok, false, 'a run ten minutes in had no Done before');
  /* a session's Done in its last five minutes is done whole, not kept short */
  const j = jordan(true), x = M.goalSessions(j, j.goals[0].id).find((s) => s.date === TUE);
  const r = M.endSessionEarly(j, TUE, 'add:' + x.add.id, x.add.start + x.add.dur - 3, TUE, x.add.start + x.add.dur - 3, { now: true });
  assert.ok(r.ok && r.keep);
  assert.equal(M.findAdd(j, x.add.id).add.done, true);
  assert.ok(!M.findAdd(j, x.add.id).add.partial, 'done whole');
});

test('your own next thing: the most urgent to-do’s next step without a time, or a goal’s next session pulled forward', () => {
  /* Tuesday 4:20 pm: the essay is due Thursday, two days away, so its first step comes first */
  const j = jordan(true);
  const p = M.nextUp(j, TUE, 980, 100);
  assert.equal(p.kind, 'step');
  assert.equal(p.name, 'Outline torts essay');
  assert.equal(p.dur, 30);
  /* only what fits: in 20 minutes the outline doesn't, so the goal's next session offers 15 of its minutes */
  const small = M.nextUp(j, TUE, 980, 20);
  assert.equal(small.kind, 'goal');
  assert.equal(small.dur, 15);
  /* with the essay due later, the goal's next session comes before it */
  const j2 = jordan(true); j2.tasks[0].due = '2026-10-23';
  const g = M.nextUp(j2, TUE, 980, 100);
  assert.equal(g.kind, 'goal');
  assert.ok(g.from && g.from.date >= TUE, 'a session from later');
  /* a to-do whose steps all have a time isn't offered */
  const j3 = jordan(false);
  M.placeAdd(j3, '2026-10-14', { name: 'Outline torts essay', cat: 'work', icon: 'note', dur: 30, src: { type: 'step', task: 'torts', id: 'torts-s1' } }, 1000);
  assert.equal(M.nextUp(j3, TUE, 980, 100).step, 'torts-s2', 'the next step without a time');
  /* startNext puts it on: the step from the quarter hour you're in */
  const j4 = jordan(false), pk = M.nextUp(j4, TUE, 980, 100), r = M.startNext(j4, TUE, pk, 975);
  assert.ok(r.ok);
  assert.equal(r.add.start, 975);
  assert.deepEqual(plain(r.add.src), { type: 'step', task: 'torts', id: 'torts-s1' });
  assert.equal(M.taskPlan(j4.tasks[0], M.placements(j4).get('torts'), TUE, 980).timed, 1);
  /* a session pulled forward moves whole when it fits, and leaves the rest where it was when only a part does */
  const j5 = jordan(true); j5.tasks = [];
  const gp = M.nextUp(j5, TUE, 980, 100), was = M.findAdd(j5, gp.from.add).add.dur;
  const moved = M.startNext(j5, TUE, gp, 975);
  assert.ok(moved.ok);
  assert.equal(M.findAdd(j5, gp.from.add).date, TUE, 'the session is today now');
  assert.equal(M.findAdd(j5, gp.from.add).add.start, 975);
  assert.ok(gp.dur === was);
  const j6 = jordan(true); j6.tasks = [];
  const part = M.nextUp(j6, TUE, 980, 30), long = M.findAdd(j6, part.from.add).add;
  if (long.dur > 30) {
    const left = long.dur - 30;
    assert.ok(M.startNext(j6, TUE, part, 975).ok);
    assert.equal(M.findAdd(j6, part.from.add).add.dur, left, 'the rest stays where it was');
  }
});

test('open time offers your own thing first, two of the library’s, never a kind just done or about to start, and nothing before leaving home', () => {
  const st = sample(), rows = ['Make', 'Move', 'Keep in touch', 'Home and meals'].map((n) => D.KIT_ROWS.find((r) => r.name === n));
  const opts = { palette: st.palette, rows, max: 2 };
  /* 8:05 am, open until Drop off Robin at 8:30: shoes and a car seat, nothing offered */
  const info = M.nowInfo(M.calendarDay(st, TUE), 485);
  assert.equal(info.kind, 'open');
  const q = M.openIdeas(st, TUE, 485, info, opts);
  assert.ok(q.quiet && /Drop off/.test(q.quiet.name));
  assert.equal(q.first, null); assert.equal(q.ideas.length, 0);
  assert.ok(M.leavesHome(q.quiet));
  /* without the run-up (leave 0), the same open time offers ideas: two at most, and none of the kind of the run
     that ended at 8 */
  const far = M.openIdeas(st, TUE, 485, info, Object.assign({}, opts, { leave: 0 }));
  assert.equal(far.quiet, null);
  assert.ok(far.ideas.length > 0 && far.ideas.length <= 2, 'two at most');
  assert.ok(!far.ideas.some((p) => rows.find((r) => r.name === 'Move').ids.includes(p.id)), 'no Workout right after a run');
  /* and none of the kind about to start: Late shifts' 11 am, open until a Workout at 11:30 */
  const lt = late(), li = M.nowInfo(M.calendarDay(lt, TUE), 660);
  const lo = M.openIdeas(lt, TUE, 660, li, { palette: lt.palette, rows, max: 2 });
  assert.ok(!lo.ideas.some((p) => rows.find((r) => r.name === 'Move').ids.includes(p.id)), 'no Workout right before the workout');
  /* fillIdeas keeps its old shape without opts: up to three */
  assert.ok(M.fillIdeas(st.palette, D.KIT_ROWS, 45).length <= 3);
  assert.equal(M.fillIdeas(st.palette, D.KIT_ROWS, 45, { max: 1 }).length, 1);
  assert.ok(!M.fillIdeas(st.palette, D.KIT_ROWS, 45, { skip: ['Move'] }).some((p) => D.KIT_ROWS[0].ids.includes(p.id)));
  /* locked things that leave home, and those that don't */
  assert.equal(M.leavesHome({ fixed: true, daycare: true }), true);
  assert.equal(M.leavesHome({ fixed: true, event: 'x', cal: null }), true, 'a date on the board');
  assert.equal(M.leavesHome({ fixed: true, event: 'x', cal: 'work' }), false, 'an imported event may be a call');
  assert.equal(M.leavesHome({ fixed: true, meeting: 'standup', icon: 'people' }), false);
});

/* == the band's words and buttons, cut out of app.js and run on a board and a clock == */
function bandRig(board, today, nowMin) {
  const parts = [
    app('  const sourceDate = (b, date) =>', '  const sourceSpan = '),
    app('  const modules = () =>', '  /* V11: People is for anyone. A board without a partner'),
    app('  let soonKey = \'\';', '  function showCurrentBlock(b, kind) {'),
    app('  const blockName = (b) =>', '  function morningLine(date) {'),
    app('  /* late in the day, a quiet word on the time that was yours', '  /* V11: a goal\'s session that ended a moment ago')
  ];
  const script = `
    const FEEL = true, NEXT_WORD = 'Next: ';
    let state = __board, today = __today, nowMin = __now;
    const day = (d) => M.calendarDay(state, d);
    ${parts.join('\n')}
    ({ set nowMin(v) { nowMin = v; }, set today(v) { today = v; }, nowNow, personNow, evening, ownDinner, lockedAhead, aheadWords, leaveWords, earlyOf, doneLabel, eveningActs, tomorrowLine, keptLine, lastOfDay, nightSpan, sleepLine, momentWords });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin });
}

test('the band reads the person’s day: the evening, its buttons, the kept line, and the night (Late shifts)', () => {
  const r = bandRig(late(), TUE, 1260);
  /* 9 pm mid-shift is not the evening: Riley's bed is 2 am */
  assert.equal(r.evening(), false);
  assert.equal(r.keptLine(), '');
  assert.deepEqual(plain(r.eveningActs(r.nowNow())), []);
  /* the evening starts three hours before bed, 11 pm */
  r.nowMin = 1385;
  assert.equal(r.evening(), true);
  assert.match(r.keptLine(), /^You kept 4 h for yourself today\. $/);
  /* tomorrow's dinner waits while tonight's isn't decided */
  assert.deepEqual(plain(r.eveningActs(r.nowNow())).map((a) => a.id), ['tomorrow']);
  /* tonight's dinner is the 11:30 pm one, and at 11:40 it ends at 12:15 am, not at midnight */
  assert.equal(r.ownDinner(TUE).start, 1410);
  r.nowMin = 1420;
  const din = r.nowNow();
  assert.equal(din.block.name, 'Dinner');
  assert.equal(din.end, 1455, 'ends at 12:15 am');
  assert.equal(r.lastOfDay(din.block), false, 'the dinner isn’t the last block before a 2 am bed');
  /* 1 am: still Monday's evening; See tomorrow means the calendar's today, and the night is from 2 am */
  r.nowMin = 60;
  assert.equal(r.personNow().date, MON);
  assert.equal(r.evening(), true);
  assert.equal(plain(r.eveningActs(r.nowNow()))[0].date, TUE);
  assert.match(r.tomorrowLine(), /^Tomorrow at 3 pm: Work$/);
  r.nowMin = 180;
  const night = r.nowNow();
  assert.equal(night.kind, 'sleep');
  assert.equal(r.nightSpan(night).from, 120, 'the night started at 2 am');
  assert.match(r.sleepLine(night), /of sleep left\. Work at 3 pm$/);
});

test('the band: the countdown to the locked block ahead, Leave for in its last 15 minutes, and Done’s name', () => {
  const r = bandRig(sample(), TUE, 460);
  const lk = r.lockedAhead();
  assert.match(lk.name, /^Drop off/);
  assert.equal(r.aheadWords(lk), 'Drop off Robin in 50 min, at 8:30 am');
  r.nowMin = 500;
  assert.equal(r.leaveWords(r.lockedAhead()), 'Leave for Drop off Robin in 10 min');
  /* Done from the first minute: Done early on a run, Done in its last five minutes */
  r.nowMin = 452;
  const run = r.nowNow().block;
  assert.equal(r.doneLabel(run, r.earlyOf(run)), 'Done early');
  assert.equal(r.earlyOf(run).end, 465);
  r.nowMin = 476;
  assert.equal(r.doneLabel(run, r.earlyOf(run)), 'Done');
  /* the evening on the sample starts at 7:30 pm, three hours before a 10:30 pm bed, with minutes under an hour */
  r.nowMin = 1169;
  assert.equal(r.evening(), false);
  r.nowMin = 1170;
  assert.equal(r.evening(), true);
  assert.match(r.keptLine(), /^You kept 1 h for yourself today\. $/);
  /* the Planner's date card on today says what you're in */
  r.nowMin = 755;
  assert.match(r.momentWords(), /^Work, 4 h 10 min left$/);
});

/* == the one question: asked less once it's always the usual, and put off around a locked block == */
function askRig(board, today, nowMin) {
  const parts = [
    app('  const sourceDate = (b, date) =>', '  const sourceSpan = '),
    app('  const blockName = (b) =>', '  function lockedFirst(date)'),
    app('  /* V11 (the Today walk): the kind of day is asked less.', '  /* V11: the five ways dinner happens, answered in the strip')
  ];
  const script = `
    const FEEL = true, store = {};
    const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
    let state = __board, today = __today, nowMin = __now;
    const view = { preview: null };
    const day = (d) => M.calendarDay(state, d);
    ${parts.join('\n')}
    ({ set today(v) { today = v; }, set nowMin(v) { nowMin = v; }, kindQuiet, noteKind, setKindAsk, dinnerSnooze, store });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin });
}

test('the kind of day: three Your usual weekdays in a row make weekdays quiet; another kind, or Keep asking, brings it back', () => {
  const r = askRig(sample(), '2026-10-12', 460);
  assert.equal(r.kindQuiet(), false);
  assert.equal(r.noteKind('usual'), false);
  r.today = TUE; assert.equal(r.noteKind('x'), false, 'put away with the x counts like the usual');
  r.today = '2026-10-14'; assert.equal(r.noteKind('usual'), true, 'the third one quiets weekdays');
  assert.equal(r.kindQuiet(), true);
  /* a day unlike the rest is kept apart: Saturday's answer doesn't break the run or add to it */
  r.today = SAT; r.noteKind('other');
  assert.equal(r.kindQuiet(), true);
  /* another kind on a weekday (picked in the Planner) breaks the run */
  r.today = '2026-10-19'; r.noteKind('other');
  assert.equal(r.kindQuiet(), false);
  /* Don't ask on weekdays, and Keep asking */
  r.setKindAsk({ off: true });
  assert.equal(r.kindQuiet(), true);
  r.setKindAsk({ off: false, keep: true });
  r.today = '2026-10-20'; r.noteKind('usual'); r.today = '2026-10-21'; r.noteKind('usual'); r.today = '2026-10-22'; r.noteKind('usual');
  assert.equal(r.kindQuiet(), false, 'Keep asking keeps asking');
  /* it's this device's own, kept to the last two weeks */
  assert.ok(Object.keys(JSON.parse(r.store['sundayreset.kindAsk']).a).length <= 14);
});

test('putting dinner off says Ask again, and steps around a locked block', () => {
  const r = askRig(sample(), TUE, 15 * 60 + 35);
  /* Tuesday's dinner is at 6; 5 pm lands inside Pick up Robin (4:45 to 5:15), so it asks again after it */
  const din = M.calendarDay(sample(), TUE).blocks.find((b) => b.dinner);
  const z = r.dinnerSnooze(din);
  assert.equal(z.at, 5 * 60 + 15 + 12 * 60);
  assert.equal(z.label, 'Ask again at 5:15 pm, after Pick up Robin');
  /* after 4:30 it's an hour from now, which is clear of the pick up: plainly, and it never says Remind me */
  r.nowMin = 16 * 60 + 40;
  assert.deepEqual(plain(r.dinnerSnooze(din)), { at: 17 * 60 + 40, label: 'Ask again in an hour' });
  /* with nothing locked in the way, plainly */
  r.nowMin = 17 * 60 + 20;
  const free = r.dinnerSnooze(din);
  assert.equal(free, null, 'an hour from 5:20 is past the start of dinner');
  /* Riley at 9 pm: the shift runs until dinner, so nothing to put it off to */
  const l = askRig(late(), TUE, 1260);
  assert.equal(l.dinnerSnooze(M.calendarDay(late(), TUE).blocks.find((b) => b.dinner && b.sourceDate === TUE)), null);
});
