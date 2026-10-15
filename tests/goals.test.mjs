// V11 goals: a goal with a date becomes daily sessions (Model.newGoal, goalProgress, planGoal), a missed
// session spreads forward under the cap (skipGoalSession), and one question the morning after
// (goalCheckIn, answerCheckIn). The case is the bar exam from docs/PRODUCT-STRATEGY.md: November 1 to
// February 24, 2 hours on weekdays and 3 on weekends.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const NOV1 = '2026-11-01', EXAM = '2027-02-24';
const copy = (v) => JSON.parse(JSON.stringify(v));
const weekend = (d) => [0, 6].includes(M.weekday(d));
/* an exam's last three days are lighter, at half the day's time: Sunday the 21st, Monday, and Tuesday */
const capOf = (d) => (weekend(d) ? 180 : 120) / (d >= '2027-02-21' && d < EXAM ? 2 : 1);
/* someone on their own who works 9 to 5: 7 to 9 am is open on weekdays, and so is most of a weekend day */
const board = () => D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, NOV1);
function withGoal(st, extra) {
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal(Object.assign({ name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, date: EXAM, today: NOV1, parts: ex.parts, rhythm: { wd: 120, we: 180, when: 'any', chunk: 60 } }, extra || {}));
  st.goals.push(g);
  return g;
}
const sessions = (st, g) => M.goalSessions(st, g.id);
const onDay = (st, g, d, all) => sessions(st, g).filter((x) => x.date === d && (all || !x.add.skipped)).reduce((a, x) => a + x.add.dur, 0);
const ahead = (st, g, today, now) => sessions(st, g).filter((x) => !x.add.skipped && M.windowTime(today, x.date, x.add.start) + x.add.dur > now).reduce((a, x) => a + x.add.dur, 0);
const DAYS = M.range(NOV1, M.diffDays(NOV1, EXAM));
const allCaps = DAYS.reduce((a, d) => a + capOf(d), 0);
/* everything on a day that isn't open time or a goal session never moves */
const hard = (st, d) => M.calendarDay(st, d).blocks.filter((b) => !b.soft && !(b.src && b.src.type === 'goal')).map((b) => b.key + '@' + b.start + '+' + b.dur).sort();

test('newGoal fills defaults and ids', () => {
  const g = M.newGoal({ name: '  Learn guitar ', date: '2027-03-01', today: NOV1 });
  assert.match(g.id, /^g/);
  assert.equal(g.name, 'Learn guitar');
  assert.equal(g.kind, 'other');
  assert.equal(g.start, NOV1);
  assert.equal(g.parts.length, 1);
  assert.match(g.parts[0].id, /^gp/);
  assert.deepEqual(g.rhythm, { days: [0, 1, 2, 3, 4, 5, 6], wd: 60, we: 60, when: 'any', chunk: 60 });
  assert.equal(g.cat, 'yours');
  assert.equal(g.paused, false);
  assert.equal(g.archived, false);
  assert.deepEqual(g.answers, {});
  const exam = M.newGoal({ name: 'CFA', kind: 'exam', date: EXAM, parts: [{ name: 'Ethics', min: 600 }], rhythm: { days: [1, 2, 9], when: 'brunch' } });
  assert.equal(exam.cat, 'work', 'an exam takes Work’s color');
  assert.equal(exam.icon, 'book');
  assert.deepEqual(exam.rhythm.days, [1, 2], 'only real weekdays');
  assert.equal(exam.rhythm.when, 'any');
  assert.notEqual(M.newGoal({}).id, M.newGoal({}).id);
});

test('the bar exam: what the rhythm can hold by the date, and how far behind 400 hours is', () => {
  const st = board(), g = withGoal(st);
  const p = M.goalProgress(st, g, NOV1, 600);
  assert.equal(p.totalMin, 400 * 60);
  assert.equal(p.doneMin, 0);
  assert.equal(p.leftMin, 400 * 60);
  assert.equal(p.daysLeft, 115);
  assert.equal(p.capacityMin, allCaps, '2 hours each weekday and 3 each weekend day, all of it open, the last three days at half');
  assert.equal(allCaps, 259.5 * 60);
  assert.equal(p.behindMin, 400 * 60 - allCaps);
  assert.equal(p.onTrack, false);
  assert.equal(p.partsLeft, 9);
  assert.equal(p.nextSession, null);
  const r = M.planGoal(st, g.id, NOV1, 600);
  assert.equal(r.shortMin, 400 * 60 - allCaps);
  assert.equal(r.message, 'Behind by 140.5 h. Make days a little longer or move the date.', 'every day is in the rhythm already, so adding one isn’t offered');
  for (const d of M.range(NOV1, 14)) assert.equal(onDay(st, g, d), capOf(d), d + ': behind, so every day is full, and no more');
  assert.equal(M.range(NOV1, 14).filter((d) => onDay(st, g, d)).length, 14, 'two weeks ahead, no further');
  assert.ok(!sessions(st, g).some((x) => x.date >= '2026-11-15'));
});

test('with room to spare, the hours left spread evenly by each day’s cap, never over it', () => {
  const st = board(), g = withGoal(st);
  // essay practice and performance tests are done: 245 hours are left, against 263 of room
  g.parts.filter((p) => /Essay|Performance/.test(p.name)).forEach((p) => { p.done = true; });
  const was = M.range(NOV1, 14).map((d) => hard(st, d));
  const p0 = M.goalProgress(st, g, NOV1, 600);
  assert.equal(p0.leftMin, 245 * 60);
  assert.equal(p0.onTrack, true);
  const r = M.planGoal(st, g.id, NOV1, 600);
  assert.equal(r.shortMin, 0);
  assert.match(r.message, /^\d+(\.5)? h this week, about 2 h a day\.$/);
  assert.deepEqual(M.range(NOV1, 14).map((d) => hard(st, d)), was, 'nothing moved');
  for (const d of M.range(NOV1, 14)) {
    const m = onDay(st, g, d);
    assert.ok(m <= capOf(d) && m >= capOf(d) - 30, d + ': ' + m + ' is close to its share of ' + capOf(d));
  }
  for (const x of sessions(st, g)) {
    assert.ok(x.add.dur <= 60 && x.add.dur % 15 === 0 && x.add.start % 15 === 0, 'sessions of an hour at most, on the grid');
    assert.deepEqual(x.add.src.type, 'goal');
    assert.equal(x.add.cat, 'work');
  }
  // an exam's parts take turns: a subject a session, never the same one twice running, every part in the first week
  const list = sessions(st, g);
  assert.equal(list[0].add.name, 'Civil Procedure', 'the first part starts');
  for (let i = 1; i < list.length; i++) assert.notEqual(list[i].add.src.part, list[i - 1].add.src.part, 'session ' + i + ' is another part');
  const firstWeek = new Set(list.filter((x) => x.date < '2026-11-08').map((x) => x.add.src.part));
  assert.equal(firstWeek.size, 7, 'all seven subjects left get time in the first week');
  // every minute left has a place before the date
  M.planGoal(st, g.id, NOV1, 600, { horizon: 200 });
  assert.equal(ahead(st, g, NOV1, 600), 245 * 60);
  assert.ok(!sessions(st, g).some((x) => x.date >= EXAM), 'nothing on the exam day or after');
  for (const d of DAYS) assert.ok(onDay(st, g, d) <= capOf(d), d);
  const p1 = M.goalProgress(st, g, NOV1, 600);
  assert.equal(p1.week.plannedMin, onDay(st, g, NOV1) + M.range('2026-11-02', 6).reduce((a, d) => a + onDay(st, g, d), 0));
  assert.equal(p1.week.doneMin, 0);
  assert.equal(p1.nextSession.date, NOV1);
  assert.ok(p1.nextSession.start >= 600, 'from now on');
});

test('a goal set up early starts on its own start date', () => {
  const st = board(), g = withGoal(st, { today: '2026-10-14', start: NOV1 });
  assert.equal(M.goalProgress(st, g, '2026-10-14', 600).capacityMin, allCaps, 'the room it counts starts November 1');
  const r = M.planGoal(st, g.id, '2026-10-14', 600);
  assert.equal(r.placed, 0);
  assert.equal(r.message, 'Behind by 140.5 h. Make days a little longer or move the date.');
  const easy = board(), e = withGoal(easy, { today: '2026-10-14', start: NOV1, parts: [{ name: 'Torts', min: 600 }] });
  assert.equal(M.planGoal(easy, e.id, '2026-10-14', 600).message, 'It starts Nov 1.');
  M.planGoal(easy, e.id, '2026-10-14', 600, { horizon: 30 });
  assert.ok(sessions(easy, e).length > 0 && sessions(easy, e).every((x) => x.date >= NOV1));
});

test('sessions keep to the part of the day the rhythm asks for', () => {
  const st = board(), g = withGoal(st, { rhythm: { wd: 60, we: 60, when: 'evening' } });
  M.planGoal(st, g.id, NOV1, 600);
  assert.ok(sessions(st, g).length > 0);
  assert.ok(sessions(st, g).every((x) => x.add.start >= 1080), 'evening only');
  const early = board(), g2 = withGoal(early, { rhythm: { wd: 120, we: 120, when: 'morning' } });
  const p = M.goalProgress(early, g2, NOV1, 600);
  assert.ok(p.capacityMin < allCaps, 'a morning holds less: before work there are two hours, and Sunday morning is half over');
  M.planGoal(early, g2.id, NOV1, 600);
  assert.ok(sessions(early, g2).every((x) => x.add.start < 720));
});

test('a skipped session spreads forward under the cap', () => {
  const st = board(), g = withGoal(st);
  g.parts.filter((p) => /Essay|Performance/.test(p.name)).forEach((p) => { p.done = true; });
  M.planGoal(st, g.id, NOV1, 600);
  // Thursday evening: the morning's session didn't happen
  const THU = '2026-11-05', NOW = 20 * 60;
  const s = sessions(st, g).find((x) => x.date === THU);
  const left = M.goalProgress(st, g, THU, NOW).leftMin;
  const r = M.skipGoalSession(st, THU, s.add.id, THU, NOW, 'all');
  assert.equal(r.ok, true);
  assert.equal(r.back, s.add.dur);
  assert.match(r.message, /^(1 h|45 min|30 min) spread over the days before Feb 24\.$/);
  const after = M.goalProgress(st, g, THU, NOW);
  assert.equal(after.leftMin, left + s.add.dur, 'what didn’t happen is still to do');
  assert.equal(M.findAdd(st, s.add.id).add.skipped, true, 'the session stays as a record');
  assert.ok(!M.calendarDay(st, THU).blocks.some((b) => b.add === s.add.id), 'and takes no time on the board');
  for (const d of DAYS) assert.ok(onDay(st, g, d, true) <= capOf(d), d + ' never over its cap, skipped time included');
  // all of it still fits before the date
  const full = M.planGoal(st, g.id, THU, NOW, { horizon: 200 });
  assert.equal(full.shortMin, 0);
  assert.equal(ahead(st, g, THU, NOW), after.leftMin);
  // some of it: a session kept to what was done
  const fri = sessions(st, g).find((x) => x.date === '2026-11-06'), was = fri.add.dur;
  const r2 = M.skipGoalSession(st, '2026-11-06', fri.add.id, '2026-11-06', 21 * 60, 'some', 20);
  assert.equal(was - r2.back, 15, '20 minutes rounds to the 15 minute grid');
  assert.equal(M.findAdd(st, fri.add.id).add.dur, 15);
  assert.equal(M.findAdd(st, fri.add.id).add.skipped, undefined);
  assert.equal(M.skipGoalSession(st, '2026-11-06', 'nope', '2026-11-06', 0, 'all').ok, false);
});

test('a session that didn’t happen leaves the rest of its day alone; its time goes to the next days', () => {
  // the sample family, a launch on weekdays: at 5:25 pm, the 5:15 session didn't happen
  const OCT14 = '2026-10-14', st = D.sampleState(OCT14);
  const tpl = M.goalForExam('Launch my portfolio site', D);
  const g = M.newGoal({ name: 'Launch my portfolio site', kind: tpl.kind, date: '2026-11-20', today: OCT14, parts: tpl.parts, rhythm: { days: [1, 2, 3, 4, 5], wd: 60, we: 0, when: 'any' } });
  st.goals.push(g);
  M.planGoal(st, g.id, OCT14, 600);
  const today = sessions(st, g).filter((x) => x.date === OCT14);
  assert.deepEqual(today.map((x) => [x.add.start, x.add.dur]), [[1035, 45]], 'the open 45 minutes after pick up');
  const r = M.skipGoalSession(st, OCT14, today[0].add.id, OCT14, 1045, 'all');
  assert.equal(r.back, 45);
  assert.deepEqual(sessions(st, g).filter((x) => x.date === OCT14 && !x.add.skipped), [], 'nothing new five minutes later');
  assert.ok(r.spread.every((x) => x.date > OCT14));
  // planning again later the same evening still leaves it alone
  M.planGoal(st, g.id, OCT14, 1080);
  assert.deepEqual(sessions(st, g).filter((x) => x.date === OCT14 && !x.add.skipped), []);
  // a day skipped ahead of time keeps its other session where it is and gets nothing new, every time it's planned
  const solo = board(), b = withGoal(solo);
  b.parts.filter((p) => /Essay|Performance/.test(p.name)).forEach((p) => { p.done = true; });
  M.planGoal(solo, b.id, NOV1, 600);
  const THU = '2026-11-05', two = sessions(solo, b).filter((x) => x.date === THU);
  assert.equal(two.length, 2);
  M.skipGoalSession(solo, THU, two[0].add.id, NOV1, 600, 'all');
  const kept = sessions(solo, b).filter((x) => x.date === THU && !x.add.skipped);
  assert.deepEqual(kept.map((x) => x.add.id), [two[1].add.id], 'the other one stays as it was');
  M.planGoal(solo, b.id, '2026-11-02', 420);
  assert.deepEqual(sessions(solo, b).filter((x) => x.date === THU && !x.add.skipped).map((x) => [x.add.id, x.add.start]), [[two[1].add.id, two[1].add.start]]);
  // kept short (some of it happened) holds its day the same way
  const FRI = '2026-11-06', fri = sessions(solo, b).find((x) => x.date === FRI);
  const before = sessions(solo, b).filter((x) => x.date === FRI).length;
  M.skipGoalSession(solo, FRI, fri.add.id, FRI, 9 * 60, 'some', 30);
  assert.equal(M.findAdd(solo, fri.add.id).add.partial, true);
  assert.equal(sessions(solo, b).filter((x) => x.date === FRI).length, before, 'nothing new on Friday');
  for (const d of DAYS) assert.ok(onDay(solo, b, d, true) <= capOf(d), d);
});

test('behind when the cap can’t hold it, and it says so', () => {
  const st = board(), g = withGoal(st);
  M.planGoal(st, g.id, NOV1, 600);
  const before = M.goalProgress(st, g, NOV1, 600).behindMin;
  const s = sessions(st, g).find((x) => x.date === '2026-11-05');
  const r = M.skipGoalSession(st, '2026-11-05', s.add.id, NOV1, 600, 'all');
  assert.equal(M.goalProgress(st, g, NOV1, 600).behindMin, before + s.add.dur);
  assert.match(r.message, /^Behind by 14\d(\.5)? h\. Make days a little longer or move the date\.$/);
  // a rhythm that leaves days out offers one of them
  const some = board(), w = withGoal(some, { rhythm: { days: [1, 2, 3, 4, 5], wd: 120, we: 0, when: 'any', chunk: 60 } });
  assert.match(M.planGoal(some, w.id, NOV1, 600).message, /^Behind by \d+(\.5)? h\. Add a day, make days a little longer, or move the date\.$/);
  assert.equal(onDay(st, g, '2026-11-05'), 120 - s.add.dur, 'the skipped hour isn’t put back on the same day');
});

test('a trip has no sessions, and the plan works around it', () => {
  const st = board(), g = withGoal(st);
  st.events.push({ id: 'la', kind: 'trip', name: 'LA', icon: 'plane', date: '2026-11-06', end: '2026-11-09', leave: 450, back: 1020 });
  const trip = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'];
  assert.equal(M.goalProgress(st, g, NOV1, 600).capacityMin, allCaps - trip.reduce((a, d) => a + capOf(d), 0));
  M.planGoal(st, g.id, NOV1, 600);
  for (const d of trip) assert.equal(onDay(st, g, d), 0, d);
  assert.equal(onDay(st, g, '2026-11-10'), 120);
});

test('a session you moved by hand is pinned: kept where you put it, and counted', () => {
  const st = board(), g = withGoal(st);
  g.parts.filter((p) => /Essay|Performance/.test(p.name)).forEach((p) => { p.done = true; });
  M.planGoal(st, g.id, NOV1, 600);
  const TUE = '2026-11-03', s = sessions(st, g).find((x) => x.date === TUE);
  assert.ok(M.moveAdd(st, s.add.id, TUE, 17 * 60).ok);
  assert.equal(M.findAdd(st, s.add.id).add.pinned, true, 'moving it by hand pins it');
  const r = M.planGoal(st, g.id, NOV1, 600);
  const kept = M.findAdd(st, s.add.id);
  assert.ok(kept && kept.date === TUE && kept.add.start === 17 * 60);
  assert.ok(onDay(st, g, TUE) <= 120, 'the rest of the day makes room for it under the cap');
  assert.ok(sessions(st, g).filter((x) => x.date === TUE).length >= 1);
  assert.ok(r.removed > 0 && r.placed > 0);
  assert.equal(ahead(st, g, NOV1, 600) <= 245 * 60, true);
  // an unpinned session the planner placed comes off and goes back on in the same places
  const again = JSON.stringify(sessions(st, g).map((x) => [x.date, x.add.start, x.add.dur]));
  M.planGoal(st, g.id, NOV1, 600);
  assert.equal(JSON.stringify(sessions(st, g).map((x) => [x.date, x.add.start, x.add.dur])), again, 'planning again changes nothing');
});

test('check in: yesterday’s sessions, then yes, some of it, or no', () => {
  const st = board(), g = withGoal(st);
  g.parts.filter((p) => /Essay|Performance/.test(p.name)).forEach((p) => { p.done = true; });
  M.planGoal(st, g.id, NOV1, 600);
  const MON = '2026-11-02', TUE = '2026-11-03', WED = '2026-11-04', THU = '2026-11-05';
  const ask = M.goalCheckIn(st, TUE);
  assert.equal(ask[0].goal, g.id);
  assert.equal(ask[0].date, MON, 'yesterday first');
  assert.equal(ask[0].min, onDay(st, g, MON));
  assert.ok(ask[0].sessions.length >= 1 && ask[0].sessions.every((x) => x.add && x.part));
  assert.deepEqual(ask.map((x) => x.date), [MON, NOV1], 'then the day before it, never asked');
  // yes: the day's sessions are marked done, and nothing moves
  const where = () => JSON.stringify(sessions(st, g).map((x) => [x.date, x.add.start, x.add.dur, !!x.add.skipped]));
  const before = where();
  const checked = 155 * 60, p0 = M.goalProgress(st, g, TUE, 420);
  assert.equal(p0.doneMin, checked, 'only the parts checked off: no session is done until someone says so');
  assert.equal(p0.unconfirmedMin, onDay(st, g, NOV1) + onDay(st, g, MON), 'Sunday’s and Monday’s time went by with no word');
  const yes = M.answerCheckIn(st, g.id, MON, 'yes', { today: TUE, nowMin: 420 });
  assert.equal(yes.ok, true);
  assert.equal(where(), before);
  assert.ok(sessions(st, g).filter((x) => x.date === MON).every((x) => x.add.done === true));
  assert.equal(M.goalProgress(st, g, TUE, 420).doneMin, checked + onDay(st, g, MON), 'Monday’s time is done now');
  assert.equal(M.goalProgress(st, g, TUE, 420).unconfirmedMin, onDay(st, g, NOV1));
  assert.equal(g.answers[MON], 'yes');
  assert.deepEqual(M.goalCheckIn(st, TUE).map((x) => x.date), [NOV1], 'asked once: Monday isn’t asked again');
  // no: the day’s sessions are skipped and the time spreads forward
  const tue = onDay(st, g, TUE), leftTue = M.goalProgress(st, g, WED, 420).leftMin;
  const no = M.answerCheckIn(st, g.id, TUE, 'no', { today: WED, nowMin: 420 });
  assert.equal(no.back, tue);
  assert.equal(onDay(st, g, TUE), 0);
  assert.equal(M.goalProgress(st, g, WED, 420).leftMin, leftTue + tue);
  assert.match(no.message, /spread over the days before Feb 24\./);
  // some of it: what was done is kept, the rest moves on
  const wed = onDay(st, g, WED);
  const some = M.answerCheckIn(st, g.id, WED, 'some', { today: THU, nowMin: 420, minutes: 60 });
  assert.equal(onDay(st, g, WED), 60);
  assert.equal(some.back, wed - 60);
  assert.deepEqual(g.answers, { [MON]: 'yes', [TUE]: 'no', [WED]: 'some' });
  assert.equal(M.answerCheckIn(st, g.id, WED, 'maybe').ok, false);
  // a paused goal doesn’t ask
  g.paused = true;
  assert.deepEqual(M.goalCheckIn(st, '2026-11-06'), []);
});

test('paused: its sessions ahead come off and nothing new goes on', () => {
  const st = board(), g = withGoal(st);
  M.planGoal(st, g.id, NOV1, 600);
  g.paused = true;
  const r = M.planGoal(st, g.id, '2026-11-02', 420);
  assert.equal(r.message, 'Paused. Nothing new goes on the board.');
  assert.equal(r.placed, 0);
  assert.ok(r.removed > 0);
  assert.equal(ahead(st, g, '2026-11-02', 420), 0);
  assert.equal(M.planGoal(st, 'nope', NOV1, 0).message, 'That goal is gone.');
  const day = board(), today = withGoal(day, { date: NOV1 }), past = withGoal(day, { date: '2026-10-20' });
  assert.equal(M.planGoal(day, today.id, NOV1, 0).message, 'Today’s the day.');
  assert.equal(M.planGoal(day, past.id, NOV1, 0).message, 'Its date has gone by.');
  assert.equal(sessions(day, today).length + sessions(day, past).length, 0);
});

test('take it easy sends a day’s sessions back to the plan; your usual and blank slate keep them', () => {
  const st = board(), g = withGoal(st);
  g.parts.filter((p) => /Essay|Performance/.test(p.name)).forEach((p) => { p.done = true; });
  M.planGoal(st, g.id, NOV1, 600);
  const WED = '2026-11-04', THU = '2026-11-05';
  const n = sessions(st, g).filter((x) => x.date === WED).length;
  const easy = M.applyPreset(st, WED, D.PRESETS.find((p) => p.id === 'easy'), st.palette);
  assert.equal(easy.goals, n);
  assert.equal(onDay(st, g, WED), 0);
  M.planGoal(st, g.id, NOV1, 600);
  assert.equal(onDay(st, g, WED), 0, 'an easy day stays easy');
  const thu = onDay(st, g, THU);
  M.applyPreset(st, THU, D.PRESETS.find((p) => p.id === 'usual'), st.palette);
  assert.equal(onDay(st, g, THU), thu, 'your usual keeps them');
  M.applyPreset(st, THU, D.PRESETS.find((p) => p.id === 'empty'), st.palette);
  assert.equal(onDay(st, g, THU), thu, 'a blank slate keeps them');
  const kind = M.presetFromDay(st, THU, 'Study day');
  assert.ok(!kind.items.some((x) => x.name === 'Civil Procedure'), 'a saved kind of day leaves them out');
});

test('two devices answer different days: the merge keeps both answers', () => {
  const st = board(), g = withGoal(st);
  const base = copy(st), mine = copy(st), theirs = copy(st);
  mine.goals[0].answers['2026-11-02'] = 'yes';
  theirs.goals[0].answers['2026-11-03'] = 'no';
  theirs.goals[0].parts[0].done = true;
  mine.goals[0].rhythm.we = 240;
  const out = M.mergeBoards(base, mine, theirs);
  assert.deepEqual(out.doc.goals[0].answers, { '2026-11-02': 'yes', '2026-11-03': 'no' });
  assert.equal(out.doc.goals[0].parts[0].done, true);
  assert.equal(out.doc.goals[0].rhythm.we, 240);
  assert.deepEqual(out.clashes, []);
  // a goal added on each side keeps both; one removed on one side and left alone on the other goes
  const a = copy(st), b = copy(st);
  a.goals.push(M.newGoal({ name: 'Run a 10k', date: '2027-04-01', today: NOV1 }));
  b.goals = [];
  assert.deepEqual(M.mergeBoards(copy(st), a, b).doc.goals.map((x) => x.name), ['Run a 10k']);
  assert.equal(g.name, 'Pass the bar exam');
});

test('quiet time read the quick way is exactly what calendarDay says, on every day of a year', () => {
  const russell = D.defaultState('2026-09-27');
  const night = board();
  night.settings.hours = { start: 300, end: 1620 };
  night.rhythm.days[5] = Object.assign({}, night.rhythm.days[5], { bed: 1560 });
  night.dates['2026-11-20'] = { adds: [{ id: 'late', name: 'Late show', cat: 'yours', icon: 'film', start: 1380, dur: 150, src: { type: 'block', id: 'x' } }] };
  night.events.push({ id: 'long', kind: 'timed', name: 'Retreat', cat: 'family', icon: 'star', date: '2026-12-03', start: 1200, dur: 2000 });
  const fam = D.sampleState(NOV1);
  M.placeAdd(fam, '2026-11-04', { name: 'Errand', cat: 'home', icon: 'car', dur: 60, src: { type: 'block', id: 'errand' } }, 450);
  for (const st of [russell, night, fam]) {
    const cal = (d) => M.calendarDay(st, d);
    for (const d of M.range('2026-09-27', 366)) {
      for (const when of ['any', 'morning', 'evening']) assert.deepEqual(M.quietWindows(st, d, when, 0), M.quietWindows(st, d, when, 0, cal), d + ' ' + when);
    }
  }
  // and progress worked out from the app's own days is the same
  const st = board(), g = withGoal(st);
  M.planGoal(st, g.id, NOV1, 600);
  const cache = new Map(), day = (d) => { if (!cache.has(d)) cache.set(d, M.calendarDay(st, d)); return cache.get(d); };
  assert.deepEqual(M.goalProgress(st, g, NOV1, 600, { day }), M.goalProgress(st, g, NOV1, 600));
  const what = Object.assign({}, g, { date: '2027-03-24' });
  assert.ok(M.goalProgress(st, what, NOV1, 600, { day }).capacityMin > M.goalProgress(st, g, NOV1, 600, { day }).capacityMin, 'a later date, as a what-if');
});

test('random plans, misses, and edits on Russell’s week keep every day whole and never move a locked block', () => {
  const st = D.defaultState('2026-09-27'), start = '2026-10-05';
  let seed = 11;
  const r = (n) => { seed = (seed * 16807) % 2147483647; return Math.floor((seed / 2147483647) * n); };
  const span = M.range(start, 35);
  const locked = () => span.map((d) => M.calendarDay(st, d).blocks.filter((b) => b.fixed && !b.sleep && !b.add).map((b) => b.key + '@' + b.start + '+' + b.dur).join());
  const was = locked();
  const g = M.newGoal({ name: 'CFA Level I', kind: 'exam', date: '2026-12-05', today: start, parts: M.goalForExam('CFA', D).parts, rhythm: { wd: 60, we: 120, when: ['any', 'morning', 'evening'][r(3)] } });
  st.goals.push(g);
  const withSteps = st.tasks.filter((t) => (t.steps || []).length);
  for (let i = 0; i < 60; i++) {
    const today = M.addDays(start, r(21)), now = 360 + r(60) * 15, t = withSteps[r(withSteps.length)];
    const op = r(8);
    if (op === 0) M.applySpread(st, t.id, M.spreadPlan(st, t.id, { cap: [15, 30, 60][r(3)], when: ['any', 'morning', 'afternoon', 'evening'][r(4)], by: M.addDays(today, 3 + r(10)) }, today, now));
    else if (op === 1) { const on = withSteps.filter((x) => M.placements(st).has(x.id)); M.reflowTask(st, (on.length ? on[r(on.length)] : t).id, M.addDays(today, 4 + r(8)), now); }
    else if (op === 2) M.planGoal(st, g.id, today, now);
    else if (op === 3) { const s = M.goalSessions(st, g.id); if (s.length) { const x = s[r(s.length)]; M.skipGoalSession(st, x.date, x.add.id, today, now, ['all', 'some'][r(2)], 15 * (1 + r(3))); } }
    else if (op === 4) M.answerCheckIn(st, g.id, M.addDays(today, -1), ['yes', 'some', 'no'][r(3)], { today, nowMin: now });
    else if (op === 5) M.applyPreset(st, today, D.PRESETS[r(D.PRESETS.length)], st.palette);
    else if (op === 6) { const s = M.goalSessions(st, g.id).concat((M.placements(st).get(t.id) || []).map((p) => ({ date: p.date, add: p.add }))); if (s.length) { const x = s[r(s.length)]; M.moveAdd(st, x.add.id, M.addDays(today, r(5)), 360 + r(60) * 15); } }
    else M.placeAdd(st, today, { name: 'X', cat: 'yours', icon: 'star', dur: 15 * (1 + r(6)), src: { type: 'block', id: 'x' } }, 360 + r(60) * 15);
    for (const d of span) {
      const bl = M.calendarDay(st, d).blocks.slice().sort((a, b) => a.start - b.start);
      for (let k = 1; k < bl.length; k++) assert.ok(bl[k].start >= bl[k - 1].start + bl[k - 1].dur, 'step ' + i + ', ' + d + ': ' + bl[k - 1].key + ' and ' + bl[k].key);
      assert.equal(new Set(bl.map((b) => b.key)).size, bl.length, 'step ' + i + ' keys on ' + d);
    }
    assert.deepEqual(locked(), was, 'step ' + i + ': locked blocks stay put');
    assert.ok(!M.goalSessions(st, g.id).some((x) => x.date >= g.date), 'step ' + i + ': nothing on or after the goal’s date');
  }
  for (const d of M.range('2026-09-27', 400)) {
    const day = M.resolveDay(st, d);
    for (let k = 1; k < day.blocks.length; k++) assert.ok(day.blocks[k].start >= day.blocks[k - 1].start + day.blocks[k - 1].dur, d);
  }
});

test('goal sessions, skipped ones, spread steps, and Meal prep keep every day whole', () => {
  const st = board(), g = withGoal(st);
  M.planGoal(st, g.id, NOV1, 600, { horizon: 60 });
  sessions(st, g).filter((x, i) => i % 7 === 0).forEach((x) => { x.add.skipped = true; });
  st.tasks.push({ id: 'room', name: 'Clean my room', group: 'home', icon: 'broom', cat: 'home', due: '2026-11-13', dur: null, done: false, repeat: null, steps: M.breakdown('Clean my room', {}, D).steps.map((s, i) => ({ id: 'r' + i, name: s.name, dur: s.dur, done: false })) });
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', {}, NOV1, 600));
  M.placeAdd(st, '2026-11-08', { name: 'Meal prep', cat: 'meals', icon: 'pot', dur: 90, src: { type: 'prep', week: '2026-11-08' }, makes: [] }, 13 * 60);
  for (const d of M.range(NOV1, 120)) {
    for (const day of [M.resolveDay(st, d), M.calendarDay(st, d)]) {
      const bl = day.blocks.slice().sort((x, y) => x.start - y.start);
      for (let i = 1; i < bl.length; i++) assert.ok(bl[i].start >= bl[i - 1].start + bl[i - 1].dur, d + ' no overlaps');
      assert.equal(new Set(bl.map((b) => b.key)).size, bl.length, d + ' keys');
      assert.ok(bl.every((b) => b.dur >= 1 && b.start >= 0), d);
    }
  }
  // the rest of the model takes them in its stride
  assert.doesNotThrow(() => { M.dueSoon(st, NOV1, 14, 600); M.capacity(st, NOV1, 7, NOV1, 600); M.upcoming(st, NOV1, 30); M.lookAhead(st, NOV1, 35, NOV1); M.clashesIn(st, NOV1, 14); M.dayCard(st, '2026-11-02'); M.momentFor(st, '2026-11-02', 600); M.remindersFor(st, '2026-11-02'); });
  assert.ok(!M.placements(st).has(g.id), 'goal sessions aren’t to-dos');
  const rem = M.remindersFor(st, '2026-11-02').filter((r) => r.kind === 'block');
  assert.ok(rem.some((r) => g.parts.some((p) => p.name === r.title)), 'a session reminds like any block you placed');
  const skipped = sessions(st, g).find((x) => x.add.skipped);
  assert.ok(!M.remindersFor(st, skipped.date).some((r) => r.key.includes(skipped.add.id)), 'a skipped one doesn’t');
  assert.equal(M.calendarDay(st, '2026-11-08').blocks.find((b) => b.src && b.src.type === 'prep').makes.length, 0, 'a Meal prep block shows what it makes');
});
