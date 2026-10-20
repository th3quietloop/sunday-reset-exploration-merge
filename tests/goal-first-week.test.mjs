/* V11-2: a goal never starts out behind. On the caregiver's board (Dev, Caregiver for a parent) a half marathon made in
   the goal flow read Behind by 30 min the moment it was made: the time the flow suggests (sayRhythm) was sized from an
   average a day that leaves out a race's lighter last days and the days the run has. Now the time it starts with holds
   the whole plan when time in reach can; its first week never says Behind (Model.goalProgress's firstWeek); and when
   the first week's share can't fit in open time and the person's own time can, the flow asks once before it starts
   (goalOwnAsk, in ownWords' words), with Use it and Start next week. Cut out of app.js and run with the real Model and
   Data, the way tests/goal-sheet.test.mjs does. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D } from './v11-rig.mjs';

await import('../board/src/onboard.js');
await import('../board/src/scenarios.js');
const O = globalThis.Onboard, S = globalThis.Scenarios;

const TODAY = '2026-10-20'; // a Tuesday
const NOW = 600;
/* (a time or a length keeps its unit with a no-break space; read here as a space) */
const sp = (x) => (typeof x === 'string' ? x.replace(/ /g, ' ') : x);
const caregiver = () => S.build('caregiver', D, M, TODAY, O);

/* the goal flow's words and sums on a board, at a time of day */
function goalWorld(board, nowMin) {
  const script = `
    const FEEL = true;
    let state = __board;
    const today = '${TODAY}', nowMin = ${nowMin == null ? NOW : nowMin};
    const cache = new Map();
    const day = (d) => { let x = cache.get('day|' + d); if (!x) { x = M.calendarDay(state, d); cache.set('day|' + d, x); } return x; };
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const view = { got: {} };
    ${app('  /* V11 goals: words and sums', '  /* V11 goals: the panels (the end of what tests/ui-goals.test.mjs cuts) */')}
    ${app('  /* the goal a draft would make: the same id as the goal it changes, so its sessions count */', '  function goStepTo(step) {')}
    ${app('  /* a number and its unit stay together on one line: 3 h 15 min */', '  function newGoalPanel(p, sel) {')}
    ${app('  /* why the rhythm\'s Next waits, in goals-fix\'s words */', '  /* a fix tried on the draft:')}
    ${app('  /* V11-2 (your own time stays yours): a new goal whose first week', '  /* how (V11-2, the own-time question')}
    ${app('  /* V11-2 (your own time stays yours): what a whole plan asks', '  /* the plan with the person\'s own time, when the open time')}
    ${app('  const joinNames = ')}
    ({ sayableRhythm, sayRhythm, draftNeed, draftGoal, goalHolds, standWords, goalOwnAsk, ownWords, aboutMin, planSaid });`;
  return runInNewContext(script, { M, D, __board: board, console });
}
/* a new goal's draft, the way New goal keeps one, for a half marathon by `date` */
function race(date, o) {
  const ex = M.goalForExam('Run a half marathon', D);
  return Object.assign({ edit: null, name: 'Run a half marathon', seed: '', date, start: TODAY, parts: ex.parts.map((p, i) => ({ id: 'gp' + i, name: p.name, min: p.min })), partsFor: 'Run a half marathon', kind: ex.kind, cat: ex.cat, mix: ex.mix, exam: ex.exam, rhythm: { days: [1, 2, 3, 4, 5, 6, 0], wd: 60, we: 60, when: 'any', chunk: 60 } }, o || {});
}
/* where it stands once it's started: planned on the board the way Start the plan does */
function started(board, w, d) {
  const g = w.draftGoal(d);
  g.id = 'g1';
  board.goals.push(g);
  const r = M.planGoal(board, g.id, TODAY, NOW, { horizon: 14 });
  return { g, r, p: M.goalProgress(board, g.id, TODAY, NOW) };
}

test('a half marathon made in the goal flow starts on track when its days can hold it', () => {
  for (const weeks of [10, 19, 29]) {
    const date = M.addDays(TODAY, weeks * 7), board = caregiver(), w = goalWorld(board);
    const d = race(date);
    /* the time sized from the average a day alone came up short: the race's last three days are lighter */
    const avg = Object.assign({}, d, { rhythm: Object.assign({}, d.rhythm, w.sayableRhythm(w.draftNeed(d).perDay)) });
    assert.ok(M.goalProgress(board, w.draftGoal(avg), TODAY, NOW).behindMin >= 15, weeks + ' weeks: the average alone was short');
    w.sayRhythm(d);
    assert.ok(d.rhythm.wd <= 120 && d.rhythm.we <= 180 && d.rhythm.we - d.rhythm.wd <= 75, JSON.stringify(d.rhythm));
    const h = w.goalHolds(d);
    assert.equal(h.short, false, weeks + ' weeks: ' + sp(h.line));
    assert.match(sp(h.line), /^Holds all 100 h by /);
    const { r, p } = started(board, w, d);
    assert.equal(r.shortMin, 0, weeks + ' weeks: ' + r.message);
    assert.ok(p.behindMin < 15);
    assert.equal(w.standWords(board.goals[0], p), 'On track');
  }
  /* seven weeks out it asks more than the most the flow offers (2 h and 3 h): the page says what the days hold, and so
     does its first week, never Behind by */
  const board = caregiver(), w = goalWorld(board), d = race(M.addDays(TODAY, 49));
  w.sayRhythm(d);
  assert.deepEqual([d.rhythm.wd, d.rhythm.we], [120, 180]);
  assert.equal(sp(w.goalHolds(d).line), 'Holds about 99 of 100 h by Dec 8.');
  const { g, r, p } = started(board, w, d);
  assert.equal(sp(w.standWords(g, p)), 'Days hold about 99 h');
  assert.equal(sp(w.planSaid(g, r)), 'Your days hold about 99 of 100 h by Dec 8.');
});

test('the time it starts with steps up only while a step holds more, and stays where a person can say yes', () => {
  const board = caregiver(), w = goalWorld(board);
  /* a plan nothing in reach can hold: it keeps 2 h and 3 h, the most it offers, and the page says what that holds */
  const ex = M.goalForExam('Pass the bar exam', D);
  const bar = race('2026-12-15', { name: 'Pass the bar exam', partsFor: 'Pass the bar exam', parts: ex.parts.map((p, i) => ({ id: 'gp' + i, name: p.name, min: p.min })), kind: ex.kind, cat: ex.cat, mix: ex.mix });
  w.sayRhythm(bar);
  assert.deepEqual([bar.rhythm.wd, bar.rhythm.we], [120, 180]);
  assert.equal(w.goalHolds(bar).short, true);
  /* a small need stays the same every day */
  const small = race(M.addDays(TODAY, 200), { parts: [{ id: 'p1', name: 'Easy runs', min: 40 * 60 }] });
  w.sayRhythm(small);
  assert.equal(small.rhythm.wd, small.rhythm.we);
  assert.equal(w.goalHolds(small).short, false);
});

test('its first week never says Behind: what its days hold, and Behind by only after that', () => {
  const board = caregiver(), w = goalWorld(board);
  const ex = M.goalForExam('Pass the bar exam', D);
  const d = race('2026-12-15', { name: 'Pass the bar exam', partsFor: 'Pass the bar exam', parts: ex.parts.map((p, i) => ({ id: 'gp' + i, name: p.name, min: p.min })), kind: ex.kind, cat: ex.cat, mix: ex.mix, rhythm: { days: [1, 2, 3, 4, 5, 6, 0], wd: 120, we: 180, when: 'any', chunk: 60 } });
  const { g, p } = started(board, w, d);
  assert.ok(p.behindMin >= 15 && p.firstWeek);
  assert.match(sp(w.standWords(g, p)), /^Days hold about \d+ h$/);
  const later = M.addDays(TODAY, 7);
  const p2 = M.goalProgress(board, g.id, later, NOW);
  assert.equal(p2.firstWeek, false);
  /* (a world a week on says Behind by: liveGoal there reads that world's today) */
  const script = `const today = '${later}'; ${app('  /* V11 goals: words and sums', '  /* V11 goals: the panels (the end of what tests/ui-goals.test.mjs cuts) */')} ${app('  /* why the rhythm\'s Next waits, in goals-fix\'s words */', '  /* a fix tried on the draft:')} ({ standWords });`;
  const wl = runInNewContext('let state = __board; const nowMin = 600, cache = new Map(), day = (d) => M.calendarDay(state, d), view = { got: {} }, FEEL = true, plural = (n, a, b) => n + " " + (n === 1 ? a : b);' + script, { M, D, __board: board });
  assert.match(sp(wl.standWords(g, p2)), /^Behind by \d+(\.5)? h$/);
});

test('when its first week can’t hold its share in open time and own time can, it asks once, in the to-do plan’s words', () => {
  /* the caregiver's evenings after dinner are her Free evening, her own time: an evening plan has no open time there */
  const board = caregiver(), w = goalWorld(board);
  const d = race('2027-03-07', { rhythm: { days: [1, 2, 3, 4, 5, 6, 0], wd: 45, we: 90, when: 'evening', chunk: 60 } });
  const ask = w.goalOwnAsk(d);
  assert.ok(ask && ask.own, 'it asks');
  assert.deepEqual(ask.own.days.map((x) => [x.date, x.part, x.name]), [['2026-10-20', 'evening', 'Free evening'], ['2026-10-21', 'evening', 'Free evening'], ['2026-10-22', 'evening', 'Free evening'], ['2026-10-23', 'evening', 'Free evening'], ['2026-10-24', 'evening', 'Free evening']], 'only this week');
  assert.equal(ask.own.min, 270);
  assert.equal(sp(w.ownWords(ask)), 'This needs 4 h 30 min of your own time, today, tomorrow, and 3 more evenings.');
  assert.equal(w.goalOwnAsk(d), ask, 'worked out once');
  /* one day short, the way the phone helper's words say it */
  assert.equal(sp(w.ownWords({ own: { min: 30, days: [{ date: '2026-10-22', min: 30, part: 'evening', name: 'Free evening' }] } })), 'This needs 30 min of your own time, Thursday evening.');
  /* a plan its open time holds doesn't ask; nor does a goal being changed, or one with no end date */
  const fits = race(M.addDays(TODAY, 19 * 7));
  w.sayRhythm(fits);
  assert.equal(w.goalOwnAsk(fits), null);
  assert.equal(w.goalOwnAsk(Object.assign({}, d, { edit: 'g0' })), null);
  assert.equal(w.goalOwnAsk(Object.assign({}, d, { noDate: true, date: '' })), null);
  /* nothing on the board moved while it worked that out */
  assert.deepEqual(M.goalSessions(board, 'g-draft'), []);
  assert.equal((board.goals || []).length, 0);
});

test('Use it puts the first week’s sessions in her own time and keeps them; Start next week starts it a week on, calmly', () => {
  /* Use it: what startGoal does with { own: true }, planned with own time through the week's last day */
  const board = caregiver(), w = goalWorld(board);
  const d = race('2027-03-07', { rhythm: { days: [1, 2, 3, 4, 5, 6, 0], wd: 45, we: 90, when: 'evening', chunk: 60 } });
  const g = w.draftGoal(d);
  g.id = 'g1';
  board.goals.push(g);
  const end = M.addDays(M.weekStart(TODAY), 6);
  const r = M.planGoal(board, g.id, TODAY, NOW, { horizon: 14, own: end });
  assert.equal(r.own.min, 270);
  const mine = M.goalSessions(board, g.id);
  assert.ok(mine.length && mine.every((x) => x.date <= end), 'own time only in the week it asked about');
  assert.ok(mine.every((x) => x.add.pinned), 'a yes stays: planned again, they keep their place');
  M.planGoal(board, g.id, TODAY, NOW, { horizon: 14 });
  assert.deepEqual(M.goalSessions(board, g.id).map((x) => x.add.id), mine.map((x) => x.add.id));
  assert.match(sp(w.standWords(g, M.goalProgress(board, g.id, TODAY, NOW))), /^Days hold about/, 'never Behind in its first week');
  /* Start next week: what startGoal does with { next: true } */
  const b2 = caregiver(), w2 = goalWorld(b2), g2 = w2.draftGoal(d);
  g2.id = 'g2';
  g2.start = M.addDays(M.weekStart(TODAY), 7);
  b2.goals.push(g2);
  const r2 = M.planGoal(b2, g2.id, TODAY, NOW, { horizon: M.diffDays(TODAY, g2.start) + 14 });
  assert.ok(M.goalSessions(b2, g2.id).every((x) => x.date >= g2.start), 'nothing this week');
  assert.doesNotMatch(sp(w2.planSaid(g2, r2)), /Behind/, 'the plan’s words are said calmly');
  const p2 = M.goalProgress(b2, g2.id, TODAY, NOW);
  assert.equal(p2.firstWeek, true);
  assert.notEqual(M.countdown(b2, { goal: g2.id }, TODAY, NOW).stand.slice(0, 6), 'Behind');
});
