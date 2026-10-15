// V11 goals, the screens' own rules: how a goal's date, hours, and rhythm are said, the one question about
// yesterday, where a goal stands (goalStand, which must agree with Model.goalProgress), and the fixes a short
// plan offers (goalFixes: a fix that says it fits does fit, worked out again by the engine). Cut out of
// board/src/app.js, from "V11 goals: words and sums" to "V11 goals: the panels", and run on two boards: the
// test board from tests/goals.test.mjs (Sam, on their own, work 9 to 5) and the sample family.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D, plain } from './v11-rig.mjs';

const TODAY = '2026-10-14'; // a Wednesday
const NOV1 = '2026-11-01', EXAM = '2027-02-24';
const NB = ' ';

function goalRig(board, today, nowMin) {
  const script = `
    let state = __board, today = __today, nowMin = __now;
    /* the app keeps resolved days until the board changes; so does this */
    const cache = new Map();
    const day = (d) => { let x = cache.get(d); if (!x) { x = M.calendarDay(state, d); cache.set(d, x); } return x; };
    ${app('  /* V11 goals: words and sums', '  /* V11 goals: the panels (the end of what tests/ui-goals.test.mjs cuts) */')}
    ({ GOAL_MARK, goalById, liveGoal, activeGoals, shownGoals, isSession, goalHrs, ofHrs, goalAway, goalWhen, rhythmWords, askWords,
      someChoices, standWords, partMinutes, partHours, goalStand, goalFixes, get state() { return state; } });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin == null ? 600 : nowMin, console });
}
const samBoard = () => D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, NOV1);
function barExam(st, rhythm, extra) {
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal(Object.assign({ name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, icon: 'star', date: EXAM, start: NOV1, today: TODAY, parts: ex.parts, rhythm }, extra || {}));
  st.goals.push(g);
  return g;
}

test('a goal’s date says how far off it is: days, then weeks, then months, with the year when it’s far', () => {
  const r = goalRig(D.sampleState(TODAY), TODAY);
  assert.equal(r.goalWhen(EXAM), 'Feb 24, in 19 weeks', 'the bar exam, as the brief says it');
  assert.equal(r.goalWhen('2026-10-15'), 'Oct 15, tomorrow');
  assert.equal(r.goalWhen('2026-10-14'), 'Oct 14, today');
  assert.equal(r.goalWhen('2026-10-24'), 'Oct 24, in 10 days');
  assert.equal(r.goalAway('2026-10-28'), 'in 2 weeks');
  assert.equal(r.goalAway('2027-06-14'), 'in 8 months');
  assert.equal(r.goalAway('2027-10-14'), 'in a year');
  assert.equal(r.goalWhen('2028-01-10'), 'Jan 10, 2028, in 15 months', 'a date past most of a year names its year');
  assert.equal(r.goalWhen('2026-10-01'), 'Oct 1, gone by');
  assert.equal(r.goalWhen(null), 'No date yet');
});

test('hours read the way the plan says them, and a number never parts from its unit', () => {
  const r = goalRig(D.sampleState(TODAY), TODAY);
  assert.equal(r.goalHrs(45), '45' + NB + 'min');
  assert.equal(r.goalHrs(120), '2' + NB + 'h');
  assert.equal(r.goalHrs(870), '14.5' + NB + 'h');
  assert.equal(r.ofHrs(0, 24000), '0 of 400' + NB + 'h', 'nothing done yet is 0, not 0 min');
  assert.equal(r.ofHrs(720, 24000), '12 of 400' + NB + 'h');
  assert.equal(r.ofHrs(30, 120), '30' + NB + 'min of 2' + NB + 'h');
});

test('a rhythm in a line', () => {
  const r = goalRig(D.sampleState(TODAY), TODAY);
  assert.equal(r.rhythmWords({ days: [0, 1, 2, 3, 4, 5, 6], wd: 60, we: 60, when: 'any', chunk: 60 }), 'Every day 1 h.');
  assert.equal(r.rhythmWords({ days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'morning', chunk: 60 }), 'Weekdays 2 h, weekends 3 h, mornings, up to 1 h at a time.');
  assert.equal(r.rhythmWords({ days: [1, 3, 5], wd: 45, we: 0, when: 'evening', chunk: 60 }), 'Mon, Wed, Fri 45 min, evenings.', 'no longest session when a day is shorter than it');
  assert.equal(r.rhythmWords({ days: [6], wd: 0, we: 180, when: 'any', chunk: 90 }), 'Saturdays 3 h, up to 1 h 30 min at a time.');
  assert.equal(r.rhythmWords({ days: [1, 2], wd: 0, we: 60, when: 'any', chunk: 60 }), 'No days yet.', 'a day with no time isn’t a day it uses');
});

test('the one question, and how much of it happened', () => {
  const r = goalRig(D.sampleState(TODAY), TODAY);
  assert.equal(r.askWords({ min: 120, name: 'Pass the bar exam' }), 'Did yesterday’s 2' + NB + 'h on Pass the bar exam happen?');
  assert.deepEqual(plain(r.someChoices(120)), [30, 60, 90]);
  assert.deepEqual(plain(r.someChoices(75)), [15, 45, 60]);
  assert.deepEqual(plain(r.someChoices(30)), [15]);
  assert.deepEqual(plain(r.someChoices(15)), [], 'a quarter hour has no some of it');
});

test('a part’s hours as typed, and back', () => {
  const r = goalRig(D.sampleState(TODAY), TODAY);
  assert.equal(r.partMinutes('35'), 2100);
  assert.equal(r.partMinutes('1.5'), 90);
  assert.equal(r.partMinutes('0,25'), 15, 'a comma reads as a decimal point');
  assert.equal(r.partMinutes(' 2 h'), 120);
  assert.equal(r.partMinutes('abc'), null);
  assert.equal(r.partMinutes('-1'), null);
  assert.equal(r.partHours(2100), '35');
  assert.equal(r.partHours(90), '1.5');
  assert.equal(r.partHours(15), '0.25');
});

test('which goals show, which are in play, and how each stands in words', () => {
  const st = D.sampleState(TODAY);
  const mk = (name, date, more) => M.newGoal(Object.assign({ name, date, today: TODAY, parts: [{ name: 'All of it', min: 600 }] }, more));
  st.goals.push(mk('Past', '2026-10-01'), mk('Later', '2027-05-01'), mk('Removed', '2027-01-01', { archived: true }), mk('Soon', '2026-11-20'), mk('Resting', '2026-12-01', { paused: true }));
  const r = goalRig(st, TODAY);
  assert.deepEqual(plain(r.shownGoals().map((g) => g.name)), ['Soon', 'Resting', 'Later', 'Past'], 'in play first, by date; removed ones never');
  assert.deepEqual(plain(r.activeGoals().map((g) => g.name)), ['Later', 'Soon'], 'paused, past, and removed goals place nothing');
  const g = (n) => r.state.goals.find((x) => x.name === n);
  assert.equal(r.standWords(g('Resting'), { behindMin: 0 }), 'Paused');
  assert.equal(r.standWords(g('Past'), { behindMin: 0 }), 'Its date has gone by');
  assert.equal(r.standWords(g('Soon'), { behindMin: 240 }), 'Behind by 4' + NB + 'h');
  assert.equal(r.standWords(g('Soon'), { behindMin: 10 }), 'On track', 'less than a quarter hour short is on track');
  assert.equal(r.isSession({ src: { type: 'goal', id: 'g1' } }), true);
  assert.equal(r.isSession({ src: { type: 'step' } }), false);
  assert.equal(r.GOAL_MARK, 'star');
});

test('where a goal stands is Model.goalProgress’s answer, before and after its sessions are planned', () => {
  for (const [name, board] of [['Sam', samBoard()], ['the sample family', D.sampleState(TODAY)]]) {
    const st = board;
    const g = barExam(st, { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'morning', chunk: 60 });
    const r = goalRig(st, TODAY, 600);
    assert.deepEqual(plain(r.goalStand(g)), plain(M.goalProgress(st, g, TODAY, 600)), name + ': a new goal');
    M.planGoal(st, g.id, TODAY, 600, { horizon: 40 });
    const r2 = goalRig(st, TODAY, 600);
    const want = M.goalProgress(st, g, TODAY, 600);
    assert.deepEqual(plain(r2.goalStand(g)), plain(want), name + ': with sessions on the board');
    assert.ok(want.capacityMin > 0 && want.totalMin === 400 * 60);
  }
});

test('a fix that says it fits does fit, and each fix changes only what it names', () => {
  const st = D.sampleState(TODAY);
  const g = barExam(st, { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'morning', chunk: 60 });
  const r = goalRig(st, TODAY, 600);
  const stand = r.goalStand(g);
  assert.ok(stand.behindMin >= 15, 'mornings with a family hold less than 400 hours');
  const fixes = plain(r.goalFixes(g, stand));
  assert.ok(fixes.length >= 2, 'a short plan offers ways to fit it');
  for (const f of fixes) {
    const fixed = Object.assign({}, g, f.patch);
    const p = M.goalProgress(st, fixed, TODAY, 600);
    if (f.fits) assert.ok(p.behindMin < 15, f.name + ' says it fits, and the engine agrees');
    else assert.ok(p.capacityMin > stand.capacityMin, f.name + ' holds more than before');
    const keys = Object.keys(f.patch);
    assert.equal(keys.length, 1, f.name + ' changes one thing');
    assert.ok(/^[A-Z]/.test(f.name) && !/[.]$/.test(f.line), f.name + ': a name, and a line the screen ends with a period');
  }
  const later = fixes.find((f) => f.id === 'date');
  if (later) {
    const dayBefore = M.addDays(later.patch.date, -1);
    assert.ok(M.goalProgress(st, Object.assign({}, g, { date: dayBefore }), TODAY, 600).behindMin >= 15, 'the later date is the first one that fits');
  }
  const fewer = fixes.find((f) => f.id === 'fewer');
  assert.ok(fewer, 'with some room, fewer hours is offered');
  assert.ok(fewer.patch.parts.every((p) => p.min % 30 === 0), 'trimmed to half hours');
  assert.equal(fewer.patch.parts.length, g.parts.length, 'every part stays');
});

test('a backup’s goals are checked like the rest of the board before it can replace it', () => {
  const read = runInNewContext(`const today = __today; ${app('  function readBackup(doc) {', '  function dataSection(box) {')} readBackup;`, { M, D, __today: TODAY, console });
  const st = D.sampleState(TODAY);
  const g = barExam(st, { days: [1, 2, 3], wd: 60, we: 0, when: 'evening', chunk: 60 });
  M.planGoal(st, g.id, TODAY, 600);
  const good = read(JSON.parse(JSON.stringify(st)));
  assert.ok(good.doc && !good.error, 'a board with a goal and its sessions reads');
  assert.equal(good.doc.goals.length, 1);
  const broken = (fn) => { const b = JSON.parse(JSON.stringify(st)); fn(b.goals[0], b); return read(b); };
  assert.ok(broken((x) => { x.parts = 'Torts'; }).error, 'parts that aren’t a list');
  assert.ok(broken((x) => { x.parts[0].min = 'lots'; }).error, 'a part without minutes');
  assert.ok(broken((x) => { x.rhythm = 5; }).error, 'a rhythm that isn’t a record');
  assert.ok(broken((x) => { x.rhythm.days = 'weekdays'; }).error, 'days that aren’t a list');
  assert.ok(broken((x) => { x.date = 'soon'; }).error, 'a date that isn’t a day');
  assert.ok(broken((x, b) => { b.goals = [7]; }).error, 'a goal that isn’t a record');
  assert.ok(broken((x) => { x.answers = []; }).error, 'answers that aren’t a record');
  assert.ok(!broken((x) => { delete x.answers; }).error, 'a goal saved without answers still reads');
});

test('a plan that fits offers no fixes', () => {
  const st = samBoard();
  const g = barExam(st, { days: [0, 1, 2, 3, 4, 5, 6], wd: 240, we: 360, when: 'any', chunk: 60 }, { parts: [{ name: 'Torts', min: 600 }] });
  const r = goalRig(st, TODAY, 600);
  const s = r.goalStand(g);
  assert.equal(s.behindMin, 0);
  assert.deepEqual(plain(r.goalFixes(g, s)), []);
});
