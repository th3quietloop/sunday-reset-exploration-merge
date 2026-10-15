/* V11: goals on the phone's sheet (docs/PHONE-REDESIGN.md, section 7). Where a new goal's time starts (sayableRhythm:
   somewhere a person can say yes to, never the whole of what the date asks), the honest number and what the days
   hold (draftNeed, goalHolds), why Next waits, a session's footer by the clock (sessionFoot), the goal sheet's next
   move (goalSheetFoot), the Goals card's calm words (holdWords), and where a toast stands while More is open. Cut
   out of app.js and run with the real Model and Data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D, plain } from './v11-rig.mjs';

const TODAY = '2026-10-15'; // a Thursday
const EXAM = '2027-02-23';
/* (a time or a length keeps its unit with a no-break space; read here as a space) */
const sp = (x) => (typeof x === 'string' ? x.replace(/ /g, ' ') : x);
const words = (n) => (n == null ? '' : typeof n === 'string' ? n : (n.text || '') + (n.kids || []).map(words).join(''));
const said = (f) => sp(f.line != null && f.line !== '' ? f.line : words(f.words));

/* the goal words and sums, and the new goal's own rules, on a board at a time of day */
function goalWorld(board, nowMin) {
  const script = `
    let state = __board;
    const today = '${TODAY}', nowMin = ${nowMin == null ? 975 : nowMin};
    const cache = new Map();
    const day = (d) => { let x = cache.get(d); if (!x) { x = M.calendarDay(state, d); cache.set(d, x); } return x; };
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const view = { got: {} };
    ${app('  /* V11 goals: words and sums', '  /* V11 goals: the panels (the end of what tests/ui-goals.test.mjs cuts) */')}
    ${app('  /* the goal a draft would make: the same id as the goal it changes, so its sessions count */', '  function goStepTo(step) {')}
    ${app('  /* a number and its unit stay together on one line: 3 h 15 min */', '  function newGoalPanel(p, sel) {')}
    ${app('  /* why the rhythm\'s Next waits, in goals-fix\'s words */', '  /* a fix tried on the draft:')}
    ${app('  /* why the first page\'s Next waits:', '  /* the first page: what it is')}
    ({ sayableRhythm, sayRhythm, draftNeed, goalHolds, rhythmWhy, partsWords, nameWhy, keepUnit, aboutMin, dayText, standWords, planSaid, dayList });`;
  return runInNewContext(script, { M, D, __board: board, console });
}
/* a new goal's draft, the way New goal keeps one */
function draft(o) {
  const ex = M.goalForExam('Pass the bar exam', D);
  return Object.assign({ edit: null, name: 'Pass the bar exam', seed: '', date: EXAM, start: TODAY, parts: ex.parts.map((p, i) => ({ id: 'gp' + i, name: p.name, min: p.min })), partsFor: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, mix: ex.mix, exam: ex.exam, rhythm: { days: [1, 2, 3, 4, 5, 6, 0], wd: 60, we: 60, when: 'any', chunk: 60 } }, o || {});
}

test('a new goal’s time starts where a person can say yes: weekdays lighter than weekends, 2 h and 3 h at most', () => {
  const w = goalWorld(D.sampleState(TODAY));
  const say = (m) => plain(w.sayableRhythm(m));
  assert.deepEqual(say(195), { wd: 120, we: 180 }, 'the bar exam asks about 3 h 15 min a day: it starts at 2 h and 3 h');
  assert.deepEqual(say(120), { wd: 105, we: 165 }, 'the least that holds a week of it: 5 weekdays and 2 weekend days an hour longer');
  assert.deepEqual(say(75), { wd: 60, we: 120 });
  assert.deepEqual(say(40), { wd: 45, we: 45 }, 'a small need is the same every day');
  assert.deepEqual(say(10), { wd: 30, we: 30 }, '30 min at least');
  [75, 120, 150].forEach((m) => { const r = say(m); assert.ok(5 * r.wd + 2 * r.we >= Math.min(7 * m, 5 * 120 + 2 * 180), m + ': a week of it fits, up to the caps'); });
});

test('the bar exam from a to-do: the honest number stays, the days start at 2 h and 3 h, and the line says what they hold', () => {
  const w = goalWorld(D.sampleState(TODAY));
  const d = draft();
  const n = w.draftNeed(d);
  assert.equal(n.left, 400 * 60, 'all 400 h to fit');
  assert.equal(sp(w.keepUnit(M.dur(Math.ceil(n.perDay / 15) * 15))), '3 h 15 min', 'To fit 400 h by Feb 23: about 3 h 15 min a day, every day');
  w.sayRhythm(d);
  assert.deepEqual([d.rhythm.wd, d.rhythm.we], [120, 180]);
  const h = w.goalHolds(d);
  assert.equal(h.short, true);
  assert.match(sp(h.line), /^Holds about \d+ of 400 h by Feb 23\.$/, 'whole hours past 20, and the date on one line');
  assert.match(sp(h.say), /^Your days hold about \d+ of 400 h by Feb 23\.$/);
  assert.ok(h.more && ['longer', 'day', 'any'].includes(h.more.id), 'one quiet way to add more time');
  /* every day 6 h: it holds it all, and says how much is to spare when that's an hour or more */
  const all = w.goalHolds(draft({ date: '2027-08-01', rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 360, we: 360, when: 'any', chunk: 60 } }));
  assert.equal(all.short, false);
  assert.match(sp(all.line), /^Holds all 400 h by Aug 1(, with \d+(\.5)? h to spare)?\.$/);
  assert.equal(w.aboutMin(264.5 * 60), 265 * 60);
  assert.equal(w.aboutMin(12.5 * 60), 12.5 * 60, 'under 20 h it stays exact');
});

test('a goal’s toasts say what its days hold, never Behind by, and name a few days by their names', () => {
  const st = D.sampleState(TODAY);
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ id: 'gbar', name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, date: EXAM, start: TODAY, today: TODAY, parts: ex.parts, mix: ex.mix, rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'any', chunk: 60 } });
  st.goals.push(g);
  const w = goalWorld(st);
  assert.match(sp(w.planSaid(g, { message: 'Behind by 137 h. Add a day, make days a little longer, or move the date.' })), /^Your days hold about \d+ of 400 h by Feb 23\.$/, 'a short plan says what its days hold');
  assert.equal(w.planSaid(g, { message: '14.5 h this week, about 2 h a day.' }), '14.5 h this week, about 2 h a day.', 'any other word from the plan stays as it is');
  assert.equal(w.planSaid(g, {}), '');
  assert.equal(w.dayList(['2026-10-16']), 'Fri');
  assert.equal(w.dayList(['2026-10-16', '2026-10-17']), 'Fri and Sat');
  assert.equal(sp(w.dayList(['2026-10-16', '2026-10-17', '2026-10-29'])), 'Fri, Sat, and Oct 29', 'a day more than a week off by its date');
});

test('Next waits with a reason, in goals-fix’s words', () => {
  const w = goalWorld(D.sampleState(TODAY));
  assert.equal(w.nameWhy(draft({ name: ' ' })), 'Name it to go on.');
  assert.equal(w.nameWhy(draft({ date: '' })), 'Pick a date to go on.');
  assert.equal(w.nameWhy(draft({ date: '' , edit: 'g1' })), '', 'renaming asks only for a name');
  assert.equal(w.nameWhy(draft()), '');
  assert.equal(w.rhythmWhy(draft({ rhythm: { days: [], wd: 60, we: 60 } })), 'Pick at least one day to go on.');
  assert.equal(w.rhythmWhy(draft({ rhythm: { days: [1, 2], wd: 0, we: 60 } })), 'Give a weekday some time to go on.');
  assert.equal(w.partsWords(draft()), '9 parts, 400 h in all.');
  assert.equal(w.partsWords(draft({ parts: [{ id: 'a', name: 'One', min: 0 }] })), 'Give a part some hours to go on.');
});

/* a session's footer, with buttons that only say what they'd do */
function sessionWorld(nowMin, o = {}) {
  const calls = [];
  const script = `
    const FEEL = true, today = '${TODAY}', nowMin = ${nowMin};
    const view = { phone: true, got: __o.got || {} };
    const window = { SR_focusBlock: __o.noFocus ? undefined : (x) => __calls.push(['focus', x.name, x.left]) };
    const el = (tag, cls, text) => { const e = { tag, text: text || '', kids: [], append(...xs) { xs.forEach((x) => e.kids.push(x)); }, appendChild(x) { e.kids.push(x); return x; } }; return e; };
    const sessionDone = (id, d) => __calls.push(['done', id, d]), skipSession = (id, how, m) => __calls.push(['skip', id, how, m]);
    const renderSide = () => __calls.push(['render']), closeSel = () => __calls.push(['close']), $ = () => ({ querySelector: () => null });
    const requestAnimationFrame = (f) => f(), day = () => ({ blocks: [] }), earlyOf = () => null, doneEarly = () => __calls.push(['early']);
    const leftText = (m) => (m < 60 ? Math.max(1, Math.round(m)) + ' min' : M.dur(Math.round(m / 5) * 5));
    const keepUnit = (s) => String(s).replace(/(\\d) (h|min)\\b/g, '$1\\u00a0$2');
    const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
    ${app('  /* hours the way the plan says them:', '  /* how far off a goal\'s date is:')}
    ${app('  /* how much of a session might have happened, for Some of it:', '  /* where a goal stands, in two words:')}
    ${app('  /* a day said the way a person says it: today, tomorrow, Thursday', '  /* V11: a box saved as focus leaves it saves once focus has landed')}
    ${app('  /* a day said short, the way the rows say it', '  /* where each step stands:')}
    ${app('  /* a session\'s next move, by the clock */', '  /* The plan keeps its next week on the board.')}
    ({ sessionFoot });`;
  return Object.assign(runInNewContext(script, { __o: o, __calls: calls, M, D }), { calls });
}
const sess = (o) => Object.assign({ id: 'a1', name: 'Contracts', start: 930, dur: 60, src: { type: 'goal', id: 'gbar' } }, o || {});
const goal = { id: 'gbar', name: 'Pass the bar exam', answers: {} };

test('a session’s footer follows the clock: when it starts, then Start, then Done, then Did it happen?', () => {
  const before = sessionWorld(910).sessionFoot(goal, TODAY, sess(), false, false);
  assert.equal(said(before), 'Starts in 20 min.');
  assert.deepEqual([before.quiet[0], before.gold], ['Skip this one', undefined], 'nothing to do yet, so no gold');
  const tomorrow = sessionWorld(975).sessionFoot(goal, '2026-10-16', sess({ start: 450 }), false, false);
  assert.equal(said(tomorrow), 'Starts tomorrow at 7:30 am.');
  const w = sessionWorld(934);
  const now = w.sessionFoot(goal, TODAY, sess(), false, true);
  assert.equal(said(now), 'Now: Contracts, 1 h.');
  assert.deepEqual([now.quiet[0], now.gold[0]], ['Didn’t get to it', 'Start']);
  now.gold[1]();
  assert.deepEqual(plain(w.calls.slice(-2)), [['focus', 'Contracts', 56], ['close']], 'Start is the desk’s timer, sized to what’s left');
  const later = sessionWorld(950).sessionFoot(goal, TODAY, sess(), false, true);
  assert.equal(said(later), '40 min left.');
  assert.equal(later.gold[0], 'Done', 'ten minutes in, the gold is Done');
  assert.equal(sessionWorld(932, { noFocus: true }).sessionFoot(goal, TODAY, sess(), false, true).gold[0], 'Done', 'no timer on this board: Done');
});

test('a session that went by asks Did it happen? with three equal answers; Some of it asks how much in place', () => {
  const w = sessionWorld(1100);
  const ask = w.sessionFoot(goal, TODAY, sess(), true, true);
  assert.equal(said(ask), 'Did it happen?');
  assert.deepEqual(plain(ask.two.map((x) => x[0])), ['Yes', 'Some of it', 'No']);
  ask.two[0][1]();
  ask.two[2][1]();
  assert.deepEqual(plain(w.calls.slice(-2)), [['done', 'a1', true], ['skip', 'a1', 'all', null]]);
  const some = sessionWorld(1100, { got: { someOf: 'a1' } }).sessionFoot(goal, TODAY, sess(), true, true);
  assert.equal(sp(some.line), 'How much of the 1 h?');
  assert.equal(some.link[0], 'Back');
  assert.deepEqual(plain(some.two.map((x) => sp(x[0]))), ['15 min', '30 min', '45 min']);
  const short = sessionWorld(1100).sessionFoot(goal, TODAY, sess({ dur: 15 }), true, true);
  assert.deepEqual(plain(short.two.map((x) => x[0])), ['Yes', 'No'], 'a 15 min session has no part of it to count');
});

test('a session answered says so, quietly, with Not done; one that didn’t happen or happened in part says where its time went', () => {
  const w = sessionWorld(1100);
  const yes = w.sessionFoot(Object.assign({}, goal, { answers: { [TODAY]: 'yes' } }), TODAY, sess({ done: true }), true, true);
  assert.equal(said(yes), 'Done. You said it happened.');
  assert.deepEqual([yes.quiet[0], yes.gold], ['Not done', undefined]);
  assert.equal(said(w.sessionFoot(goal, TODAY, sess({ done: true }), true, true)), 'Done.');
  assert.equal(said(w.sessionFoot(goal, TODAY, sess({ done: true, partial: true }), true, true)), 'Some of it happened. The rest went to the days ahead.');
  assert.equal(said(w.sessionFoot(goal, TODAY, sess({ skipped: true }), true, true)), 'This one didn’t happen. Its time went to the days ahead.');
});

/* the goal sheet's next move, with the plan's pieces said by hand */
function sheetWorld(o = {}) {
  const calls = [];
  const script = `
    const today = '${TODAY}', nowMin = 975, state = {};
    const view = { got: __o.got || {} };
    const M = Object.assign(Object.create(__M), { goalSessions: () => __o.sessions || [] });
    const goalNowSession = () => __o.now || null, sessionNowFoot = () => ({ line: 'now' });
    const goalFixes = () => __o.fixes || [], openFixes = () => __calls.push(['fixes']);
    const pauseGoal = (g, on) => __calls.push(['pause', on]), placeShare = () => __calls.push(['place']);
    const keepUnit = (s) => String(s).replace(/(\\d) (h|min)\\b/g, '$1\\u00a0$2');
    const toWords = (date, start) => (date === '2026-10-16' ? 'tomorrow' : date) + ' at ' + __M.clock(start);
    ${app('  /* the goal sheet\'s next move:', '  /* More, in the goal sheet\'s header')}
    ({ goalSheetFoot });`;
  return Object.assign(runInNewContext(script, { __o: o, __calls: calls, __M: M }), { calls });
}
const g = { id: 'gbar', name: 'Pass the bar exam', start: '2026-10-11', date: EXAM, paused: false };
const next = { name: 'Contracts', date: '2026-10-16', start: 465, dur: 45 };
const aheadThisWeek = [{ date: '2026-10-16', add: { id: 'x', start: 465, dur: 45 } }];

test('the goal sheet’s footer: what’s next in a line, gold only for something to do now', () => {
  const calm = sheetWorld({ sessions: aheadThisWeek }).goalSheetFoot(g, { behindMin: 0, nextSession: next }, true);
  assert.equal(sp(calm.line), 'Next: Contracts, tomorrow at 7:45 am, 45 min.');
  assert.equal(calm.gold, undefined, 'on track and nothing under way: no gold');
  const w = sheetWorld({ sessions: aheadThisWeek, fixes: [{ id: 'day' }] });
  const short = w.goalSheetFoot(g, { behindMin: 600, nextSession: next }, true);
  assert.equal(short.gold[0], 'Make it fit', 'short of its date: the gold opens the ways to fit it');
  short.gold[1]();
  assert.deepEqual(plain(w.calls.pop()), ['fixes']);
  assert.equal(sheetWorld({ sessions: aheadThisWeek, fixes: [{ id: 'day' }], got: { glFix: true } }).goalSheetFoot(g, { behindMin: 600, nextSession: next }, true).gold, undefined, 'the ways are open on the plate: no gold twice');
  assert.equal(sheetWorld({ sessions: aheadThisWeek, fixes: [{ id: 'fewer' }] }).goalSheetFoot(g, { behindMin: 600, nextSession: next }, true).gold, undefined, 'trimming the hours is the plan’s to offer, not a button here');
  assert.equal(sheetWorld({ sessions: [] }).goalSheetFoot(g, { behindMin: 0, nextSession: null }, true).gold[0], 'Place this week’s share', 'nothing left this week');
  assert.equal(sheetWorld({ now: { date: TODAY, add: {} } }).goalSheetFoot(g, { behindMin: 0 }, true).line, 'now', 'a session under way leads');
  const paused = sheetWorld().goalSheetFoot(Object.assign({}, g, { paused: true }), {}, true);
  assert.deepEqual([paused.line, paused.gold[0]], ['Paused. Nothing new goes on the board.', 'Resume']);
  assert.equal(sheetWorld().goalSheetFoot(g, {}, false).line, 'Its date has gone by.');
});

test('the Goals card says what the days hold, never Behind by', () => {
  const script = `
    const today = '${TODAY}';
    ${app('  /* where a goal stands, in two words:', '  /* a part\'s hours as a person types them')}
    ${app('  /* hours the way the plan says them:', '  /* how far off a goal\'s date is:')}
    const liveGoal = (g) => !!g && !g.archived && !!g.date && g.date > today;
    ${app('  /* V11 (docs/PHONE-REDESIGN.md, 7.2): where a goal stands on its card, calmly', '  /* this week\'s share in a line')}
    ({ holdWords });`;
  const w = runInNewContext(script, { M });
  assert.equal(sp(w.holdWords(g, { behindMin: 113 * 60, totalMin: 400 * 60 })), 'Days hold about 287 h');
  assert.equal(w.holdWords(g, { behindMin: 0, totalMin: 400 * 60 }), 'On track');
  assert.equal(w.holdWords(Object.assign({}, g, { paused: true }), { behindMin: 600, totalMin: 400 * 60 }), 'Paused');
});

test('with the header’s More open, a toast stays above the footer, never over the menu', () => {
  const w = runInNewContext(`${app('  function sheetToastSpot(o) {', '  /* o (V11, lift and place): receipt')} ({ sheetToastSpot });`, {});
  const o = { top: 300, bottom: 844, foot: 720, vh: 844, touch: 700, z: 1 };
  assert.deepEqual(plain(w.sheetToastSpot(o)), { at: 'top', px: 364 }, 'a touch just above the footer: under the header');
  assert.deepEqual(plain(w.sheetToastSpot(Object.assign({}, o, { menu: true }))), { at: 'bottom', px: 132 }, 'More is open there: above the footer');
});
