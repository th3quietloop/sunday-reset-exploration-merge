// V11-2, big moments (docs/BIG-MOMENTS.md): the engine under the countdown, in the board's model. Saved data
// version 9, getting ready for more kinds of dates (a heads-up per person, hosting, deadlines, moves, steps after
// the date, and the household's own shape), fuzzy dates, goals with no date, an exam's stages and practice
// exams, the countdown's shape, suggested texts, and the two new questions. Today is Tuesday, Oct 20, 2026, as in
// the mock; every board is made up but Russell's.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const TODAY = '2026-10-20';
const copy = (v) => JSON.parse(JSON.stringify(v));
const byK = (list) => list.map((r) => r.k);
const keyed = (st, e, on, today) => Object.fromEntries(M.readyFor(st, e, on, today || TODAY).map((r) => [r.k + (r.who ? ':' + r.who : ''), r]));
/* someone on their own who works 9 to 5 */
const sam = (today) => D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, today || TODAY);
/* someone on their own with no work on the board */
const ana = () => D.buildState({ name: 'Ana', kids: [], wake: { wd: 420, we: 480 }, bed: { wd: 1380, we: 1380 }, work: null }, TODAY);
/* a parent of five */
const five = () => D.buildState({ name: 'Pat', partner: 'Lee', kids: ['Ava', 'Ben', 'Cy', 'Di', 'Ed'], wake: { wd: 360, we: 420 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 }, cares: [{ kids: ['Ava', 'Ben'], days: [1, 2, 3, 4, 5], drop: 480, pick: 930 }] }, TODAY);
/* a shift worker: Wednesday to Saturday, 3 pm to 11 pm, set hours */
const shift = () => D.buildState({ name: 'Rae', kids: [], wake: { wd: 600, we: 600 }, bed: { wd: 1560, we: 1500 }, work: { days: [3, 4, 5, 6], start: 900, end: 1380, fixed: true } }, TODAY);
/* a new date made the way the app makes one: what it gets ready for kept on it (readySuggest) */
function addEvent(st, e) {
  const ev = Object.assign({}, e);
  ev.ready = M.readySuggest(ev, st);
  st.events.push(ev);
  return ev;
}
/* every string a person reads, in the house voice */
const BANNED = /[—–]|--|\b(just|really|simply|actually|easily|please)\b/i;
const voice = (s, what) => { assert.equal(typeof s, 'string', what); assert.doesNotMatch(s, BANNED, what + ': ' + s); };

/* == saved data, version 9 == */

/* a board as version 8 left it: goals with sessions, a spread to-do, dates with their prep, and an event with no
   list of its own */
function v8Board() {
  const st = D.sampleState('2026-10-14');
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ id: 'gbar', name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, date: '2027-02-24', today: '2026-10-14', parts: ex.parts, mix: ex.mix, rhythm: { wd: 60, we: 120 } });
  st.goals.push(g);
  M.planGoal(st, g.id, '2026-10-14', 600);
  M.applySpread(st, 'garage', M.spreadPlan(st, 'garage', { cap: 60 }, '2026-10-14', 600));
  st.events.push({ id: 'w8', kind: 'timed', occasion: true, name: 'Jo’s wedding', icon: 'people', cat: 'family', date: '2026-11-07', start: 960, dur: 240, big: true });
  st.events.find((e) => e.id === 'jordan-bday').prep = { ['gift@' + st.events.find((e) => e.id === 'jordan-bday').date]: 'gift' };
  st.v = 8;
  return copy(st);
}

test('Data.VERSION is 10; a version 8 board comes forward with only its number changed, and reads the same', () => {
  assert.equal(D.VERSION, 10);
  for (const st of [D.defaultState(TODAY), D.sampleState(TODAY), sam(), ana()]) assert.equal(st.v, D.VERSION);
  const old = v8Board(), st = D.migrate(copy(old));
  assert.equal(st.v, D.VERSION);
  assert.deepEqual(Object.assign(copy(st), { v: 8 }), old, 'every field and every date as it was');
  for (const d of M.range('2026-10-11', 60)) assert.deepEqual(copy(M.calendarDay(st, d)), copy(M.calendarDay(old, d)), d);
  assert.deepEqual(copy(M.lookAhead(st, TODAY, 35, TODAY, 400)), copy(M.lookAhead(old, TODAY, 35, TODAY, 400)), 'Look ahead too');
  // an event saved without a list of its own keeps what version 8 offered it
  assert.deepEqual(M.readyKeys(st.events.find((e) => e.id === 'w8'), st), ['gift']);
  assert.deepEqual(M.readyKeys(st.events.find((e) => e.id === 'lake'), st), ['travel', 'pack']);
  const lake = M.lookAhead(st, '2026-10-14', 32, '2026-10-14', 400).find((x) => x.id === 'lake');
  assert.deepEqual(lake.ready, [], 'booking a trip three weeks out is past asking, and packing is a way off');
  for (const e of D.defaultState(TODAY).events) assert.deepEqual(M.readyKeys(e, D.defaultState(TODAY)), e.kind === 'trip' ? ['travel', 'pack'] : /birthday/.test(e.name) && !/^Your/.test(e.name) ? ['gift'] : [], e.name);
});

test('a version 9 board round trips with every new field, and a newer one is left alone', () => {
  const st = D.migrate(v8Board());
  st.events.push({ id: 'mv', kind: 'marker', name: 'Move to a new place', icon: 'house', date: null, window: { from: '2027-03-01', to: '2027-05-31' } });
  st.events.push({ id: 'tg', kind: 'timed', host: true, name: 'Thanksgiving dinner', icon: 'pot', cat: 'family', date: '2026-11-26', start: 960, dur: 240, big: true, ready: ['invites', 'thanks'] });
  st.events.push({ id: 'w9', kind: 'timed', occasion: true, away: true, name: 'Sam’s wedding', date: '2027-01-16', start: 960, dur: 240, big: true });
  st.events.push({ id: 'tx', kind: 'marker', name: 'Grant', date: '2027-04-15', deadline: true });
  st.events.push({ id: 'cal', kind: 'trip', name: 'California', date: '2026-12-18', end: '2026-12-22', ready: ['travel', { k: 'headsup', who: 'Aunt Lisa', place: 'LA' }] });
  st.tasks.push({ id: 'hl', name: 'Give Aunt Lisa a heads-up', group: 'inbox', icon: 'chat', cat: 'family', dur: 5, due: '2026-11-20', done: false, repeat: null, steps: [], of: 'cal', msg: { to: 'Aunt Lisa', text: 'Lunch while I’m in LA?' } });
  st.tasks.push({ id: 'pk', name: 'Pack for California', group: 'inbox', icon: 'shirt', cat: 'home', dur: 45, due: '2026-12-17', done: false, repeat: null, steps: [{ id: 'pk1', name: 'Lay it out', dur: 15, done: true, doneOn: TODAY }], list: [{ id: 'li1', name: 'Chargers', done: true }], of: 'cal' });
  st.goals.push(M.newGoal({ id: 'gs', name: 'Get stronger', kind: 'skill', today: TODAY, parts: [{ name: 'Strength', min: 0 }], rhythm: { n: 3, chunk: 45 } }));
  st.dates['2026-12-26'] = { adds: [{ id: 'px', name: 'Practice exam', cat: 'work', icon: 'book', start: 525, dur: 180, src: { type: 'goal', id: 'gbar', part: null }, practice: true }] };
  const saved = JSON.stringify(st);
  assert.equal(JSON.stringify(D.migrate(JSON.parse(saved))), saved, 'exactly as saved');
  assert.equal(JSON.stringify(D.migrate(D.migrate(JSON.parse(saved)))), saved, 'migrating twice changes nothing');
  const newer = Object.assign(copy(st), { v: 10 });
  assert.equal(D.migrate(copy(newer)).v, 10);
  assert.deepEqual(D.migrate(copy(newer)), newer);
});

/* == the bar exam == */

function barExam(st, extra) {
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal(Object.assign({ name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, date: '2027-02-24', today: TODAY, parts: ex.parts, mix: ex.mix, rhythm: { wd: 120, we: 180, when: 'any', chunk: 60 } }, extra || {}));
  st.goals.push(g);
  return g;
}

test('the bar exam: its stages across the months, and a practice exam every other Saturday', () => {
  const st = sam(), g = barExam(st);
  const s = M.examStages(st, g);
  assert.deepEqual(s.stages, [
    { from: '2026-10-20', to: '2026-12-19', name: 'Learn' },
    { from: '2026-12-20', to: '2027-01-09', name: 'Practice' },
    { from: '2027-01-10', to: '2027-02-20', name: 'Review' },
    { from: '2027-02-21', to: '2027-02-23', name: 'Lighter days' }
  ], 'Learn to about half the time, Practice to about the last six weeks, Review to three days out, then the lighter days');
  assert.deepEqual(s.practice, ['2026-12-26', '2027-01-09', '2027-01-23', '2027-02-06', '2027-02-20']);
  for (let i = 0; i < s.practice.length; i++) {
    assert.equal(M.weekday(s.practice[i]), 6, 'a Saturday');
    if (i) assert.equal(M.diffDays(s.practice[i - 1], s.practice[i]), 14, 'every other one');
    assert.ok(s.practice[i] >= '2026-12-20' && s.practice[i] <= '2027-02-20', 'in Practice and Review only');
  }
  // the stages turn at a week's start on a long run
  assert.ok(s.stages.slice(1, 3).every((x) => M.weekday(x.from) === 0));
  // a short run keeps its shares, and one under two weeks is Review and the last days
  const short = sam(), sg = barExam(short, { date: '2026-11-17' });
  const ss = M.examStages(short, sg).stages;
  assert.deepEqual(ss.map((x) => x.name), ['Learn', 'Practice', 'Review', 'Lighter days']);
  assert.equal(ss[0].from, TODAY);
  assert.equal(ss[ss.length - 1].to, '2026-11-16');
  for (let i = 1; i < ss.length; i++) assert.equal(ss[i].from, M.addDays(ss[i - 1].to, 1), 'one after another, no gaps');
  const tiny = sam(), tg = barExam(tiny, { date: '2026-10-28' });
  assert.deepEqual(M.examStages(tiny, tg).stages.map((x) => x.name), ['Review', 'Lighter days']);
  // a goal that isn't an exam, or has no date, has no stages
  assert.deepEqual(M.examStages(st, M.newGoal({ name: 'Run a marathon', kind: 'event', date: '2027-04-01', today: TODAY })), { stages: [], practice: [] });
  assert.deepEqual(M.examStages(st, M.newGoal({ name: 'Get stronger', today: TODAY })), { stages: [], practice: [] });
});

test('the bar exam: the plan puts a practice exam on each of those Saturdays, in one sitting, and keeps every day whole', () => {
  const st = sam(), g = barExam(st);
  const locked = () => M.range(TODAY, 130).map((d) => M.calendarDay(st, d).blocks.filter((b) => b.fixed && !b.sleep).map((b) => b.key + '@' + b.start).join());
  const was = locked();
  M.planGoal(st, g.id, TODAY, 600, { horizon: 130 });
  const all = M.goalSessions(st, g.id), practice = all.filter((x) => x.add.practice);
  assert.deepEqual(practice.map((x) => x.date), M.examStages(st, g).practice);
  for (const x of practice) {
    assert.equal(x.add.name, 'Practice exam');
    assert.ok(x.add.dur > 60 && x.add.dur <= 240, 'one sitting, longer than an hour and four hours at most: ' + x.add.dur);
    assert.equal(x.add.src.type, 'goal');
  }
  assert.ok(all.filter((x) => !x.add.practice).every((x) => x.add.dur <= 60), 'every other session keeps to its hour');
  assert.ok(!all.some((x) => x.date >= g.date), 'nothing on or after the exam');
  const cap = (d) => ([0, 6].includes(M.weekday(d)) ? 180 : 120) / (d >= '2027-02-21' ? 2 : 1);
  for (const d of M.range(TODAY, 127)) {
    assert.ok(all.filter((x) => x.date === d).reduce((a, x) => a + x.add.dur, 0) <= cap(d), d + ' stays under its cap');
    const bl = M.calendarDay(st, d).blocks.slice().sort((a, b) => a.start - b.start);
    for (let i = 1; i < bl.length; i++) assert.ok(bl[i].start >= bl[i - 1].start + bl[i - 1].dur, d + ': no overlaps');
  }
  assert.deepEqual(locked(), was, 'locked blocks stay put');
  // planned again, nothing doubles: one practice exam a Saturday
  M.planGoal(st, g.id, TODAY, 600, { horizon: 130 });
  assert.deepEqual(M.goalSessions(st, g.id).filter((x) => x.add.practice).map((x) => x.date), M.examStages(st, g).practice);
});

test('the bar exam’s countdown: its date, how it stands, its stages and marks, and only this week’s share', () => {
  const st = sam(), g = barExam(st);
  g.parts.filter((p) => /Essay|Performance/.test(p.name)).forEach((p) => { p.done = true; });
  M.planGoal(st, g.id, TODAY, 600);
  const p = M.goalProgress(st, g.id, TODAY, 600);
  assert.equal(p.onTrack, true);
  const c = M.countdown(st, { goal: g.id }, TODAY, 600);
  assert.equal(c.shape, 'goal');
  assert.equal(c.title, 'Pass the bar exam');
  assert.equal(c.date, '2027-02-24');
  assert.equal(c.words, 'Feb 24 · in 18 weeks');
  assert.equal(c.stand, 'On track');
  assert.deepEqual(c.road.stages, M.examStages(st, g).stages);
  assert.deepEqual(c.road.marks, M.examStages(st, g).practice.map((d) => ({ date: d, name: 'Practice exam' })).concat([{ date: '2027-02-24', name: 'Exam day' }]));
  // (V11-3, D5) hours that came from the library are a guess, and a guess is never behind
  const gg = Object.assign({}, g, { hoursGuess: true, id: g.id });
  const stG = Object.assign({}, st, { goals: st.goals.map((x) => (x.id === g.id ? gg : x)) });
  const cG = M.countdown(stG, { goal: g.id }, TODAY, 600);
  assert.equal(cG.stand, 'On track', 'never Behind or Days hold about');
  assert.deepEqual([c.road.from, c.road.to, c.road.now], [TODAY, '2027-02-24', TODAY]);
  assert.equal(c.weeks, null);
  // this week's share: what's planned and done, the next session loud, the rest of the week folded
  const ws = M.weekStart(TODAY), we = M.addDays(ws, 6);
  assert.equal(c.week.planned, p.week.plannedMin);
  assert.equal(c.week.done, 0);
  assert.ok(c.week.items.every((x) => x.date >= ws && x.date <= we));
  assert.equal(c.next.status, 'next');
  assert.deepEqual(c.next.placed, { date: p.nextSession.date, start: p.nextSession.start });
  assert.ok(c.next.placed.date > TODAY || c.next.placed.start >= 600, 'from now on');
  assert.ok(c.rest.length && c.rest.every((x) => x.status === 'later' && x.date <= we), 'only this week');
  for (const x of [c.next].concat(c.rest)) assert.deepEqual(Object.keys(x).sort(), ['cat', 'date', 'dur', 'icon', 'id', 'msg', 'name', 'placed', 'start', 'status', 'task', 'why']);
  // a session marked done counts in the week, and the next one moves down
  const first = M.findAdd(st, c.next.id).add;
  first.done = true;
  const c2 = M.countdown(st, { goal: g.id }, TODAY, first.start + first.dur);
  assert.equal(c2.week.done, first.dur);
  assert.notEqual(c2.next.id, c.next.id);
  // a missed session moves, and says so
  const r = M.skipGoalSession(st, c2.next.placed.date, c2.next.id, TODAY, 600, 'all');
  assert.match(r.message, /spread over the days before Feb 24\.$/);
  // short of time, its first week says what the days hold, and after that by how much it's behind
  const heavy = sam(), hg = barExam(heavy);
  assert.equal(M.goalProgress(heavy, hg.id, TODAY, 600).firstWeek, true);
  assert.match(M.countdown(heavy, { goal: hg.id }, TODAY, 600).stand, /^Days hold about \d+ h$/, 'never Behind in its first week');
  assert.match(M.countdown(heavy, { goal: hg.id }, M.addDays(TODAY, 6), 600).stand, /^Days hold about \d+ h$/);
  assert.equal(M.goalProgress(heavy, hg.id, M.addDays(TODAY, 7), 600).firstWeek, false);
  assert.match(M.countdown(heavy, { goal: hg.id }, M.addDays(TODAY, 7), 600).stand, /^Behind by \d+(\.5)? h$/);
});

test('a goal’s first week counts only from when it was made, and own time only on a yes, through the day it was given', () => {
  const THU = '2026-10-22';
  const st = sam(), g = barExam(st, { today: THU, start: THU, rhythm: { wd: 60, we: 60, when: 'evening', chunk: 60 } });
  // made on a Thursday: the days before it never count, as room or as a share
  const p = M.goalProgress(st, g.id, THU, 600);
  assert.equal(p.firstWeek, true);
  const early = sam(), ge = barExam(early, { today: '2026-10-18', start: '2026-10-18', rhythm: g.rhythm });
  assert.equal(M.goalProgress(early, ge.id, THU, 600).capacityMin, p.capacityMin, 'the same room from Thursday on');
  // Sam's evenings are a Free evening, time of her own: without a yes the plan never takes it
  const open = M.planGoal(st, g.id, THU, 600);
  assert.equal(open.own, undefined);
  assert.ok(M.goalSessions(st, g.id).every((x) => x.date >= THU && M.ownTimeOf(st, x.date, x.add.start, x.add.dur).min === 0));
  // with a yes for this week, it takes her evenings through Saturday, pins them, and says how much
  const yes = sam(), gy = barExam(yes, { today: THU, start: THU, rhythm: g.rhythm });
  const sat = M.addDays(M.weekStart(THU), 6);
  const own0 = (d) => M.ownTimeOf(yes, d, 0, 1440).min;
  const before = { THU: own0(THU) };
  const r = M.planGoal(yes, gy.id, THU, 600, { own: sat });
  assert.ok(r.own.min > 0);
  assert.deepEqual(r.own.days.map((x) => x.date), ['2026-10-22', '2026-10-23', '2026-10-24']);
  assert.ok(r.own.days.every((x) => x.part === 'evening' && x.name === 'Free evening' && x.min > 0));
  assert.equal(r.own.min, r.own.days.reduce((a, x) => a + x.min, 0));
  const inOwn = M.goalSessions(yes, gy.id).filter((x) => x.date <= sat);
  assert.ok(inOwn.length && inOwn.every((x) => x.add.own && !x.add.pinned), 'the yes stays, as its own flag (V11-3, C16)');
  assert.ok(M.goalSessions(yes, gy.id).filter((x) => x.date > sat).every((x) => !x.add.pinned && !x.add.own), 'and goes no further than the day it was given');
  assert.ok(before.THU > 0);
  M.planGoal(yes, gy.id, THU, 600);
  assert.deepEqual(M.goalSessions(yes, gy.id).filter((x) => x.date <= sat).map((x) => x.add.id), inOwn.map((x) => x.add.id), 'planned again, they stay');
  // own: true is every day of the horizon
  const all = sam(), ga = barExam(all, { today: THU, start: THU, rhythm: g.rhythm });
  assert.ok(M.planGoal(all, ga.id, THU, 600, { own: true }).own.days.some((x) => x.date > sat));
});

/* == a trip with people in it == */

function california() {
  const st = D.defaultState(TODAY);
  const trip = addEvent(st, { id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-18', end: '2026-12-22', leave: 450, back: 1020 });
  return { st, trip };
}

test('a trip offers travel, a place to stay, time off, who’s covering what it leaves behind, packing, and unpacking and groceries after', () => {
  const { st, trip } = california();
  assert.deepEqual(trip.ready, ['travel', 'stay', 'timeoff', 'cover', 'pack', 'unpack', 'groceries']);
  const r = keyed(st, trip, trip.date);
  assert.deepEqual([r.stay.start, r.stay.ideal], ['2026-10-23', '2026-11-20'], 'a place to stay: eight weeks out, done four weeks before');
  assert.deepEqual([r.timeoff.start, r.timeoff.ideal], ['2026-11-06', '2026-11-20']);
  for (const k of ['unpack', 'groceries']) {
    assert.equal(r[k].after, true);
    assert.equal(r[k].start, '2026-12-23', k + ' starts the day after the trip ends');
    assert.equal(r[k].ideal, '2026-12-23', 'and its last good day is that day');
    assert.equal(r[k].when, 'later');
  }
  assert.equal(r.unpack.todo, 'Unpack after California');
  assert.equal(r.groceries.todo, 'Groceries after California');
  // (Elijah's daycare drop-offs and pick-ups fall on its weekdays: four weeks out, done two weeks before)
  assert.deepEqual([r.cover.todo, r.cover.start, r.cover.ideal, r.cover.msg], ['Line up who’s covering Elijah’s drop-offs and pick-ups while you’re away', '2026-11-20', '2026-12-04', true]);
  // the old kinds keep their numbers
  assert.deepEqual([r.travel.start, r.travel.ideal, r.pack.start, r.pack.ideal], ['2026-10-23', '2026-11-20', '2026-12-15', '2026-12-17']);
});

test('a trip with two people to see: a heads-up each, a month before, with a suggested text to send yourself', () => {
  const { st, trip } = california();
  const lisa = M.addHeadsUp(st, 'cal', 'Aunt Lisa', 'LA'), marco = M.addHeadsUp(st, trip, 'Marco');
  assert.deepEqual(lisa, { k: 'headsup', who: 'Aunt Lisa', place: 'LA' });
  assert.deepEqual(marco, { k: 'headsup', who: 'Marco' });
  assert.equal(M.addHeadsUp(st, 'cal', '  aunt lisa '), lisa, 'once a person');
  assert.equal(M.addHeadsUp(st, 'cal', ' '), null);
  assert.equal(trip.ready.filter((x) => x.k === 'headsup').length, 2);
  const r = keyed(st, trip, trip.date);
  const h = r['headsup:Aunt Lisa'];
  assert.equal(h.key, 'headsup:Aunt Lisa@2026-12-18');
  assert.equal(r['headsup:Marco'].key, 'headsup:Marco@2026-12-18');
  assert.equal(h.todo, 'Give Aunt Lisa a heads-up');
  assert.equal(h.start, '2026-11-06', 'it starts asking six weeks out');
  assert.equal(h.ideal, '2026-11-20', 'By Nov 20, a month before');
  assert.equal(h.why, 'A month’s notice');
  assert.equal(h.msg, true);
  assert.equal(h.place, 'LA');
  assert.equal(r.travel.why, null, 'a why only where a kind has one');
  // the to-do it becomes: a message step on the trip
  const t = M.prepTodo(st, 'cal', h, { group: 'inbox' });
  assert.deepEqual([t.name, t.of, t.due, t.group, t.done], ['Give Aunt Lisa a heads-up', 'cal', '2026-11-20', 'inbox', false]);
  assert.deepEqual(t.msg, { to: 'Aunt Lisa' }, 'no text is kept until the person edits it');
  assert.equal(trip.prep['headsup:Aunt Lisa@2026-12-18'], t.id);
  assert.equal(keyed(st, trip, trip.date)['headsup:Aunt Lisa'].when, 'added');
  // what the message shows: the suggestion, three quick versions, and the person's own words once they edit
  const m = M.msgFor(st, t.id, TODAY);
  assert.equal(m.kind, 'headsup');
  assert.equal(m.to, 'Aunt Lisa');
  assert.equal(m.suggested, 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?');
  assert.equal(m.text, m.suggested);
  assert.deepEqual(m.versions, [
    { id: 'shorter', name: 'Shorter', text: 'Hey Aunt Lisa! In LA Dec 18 to 22. Free to meet up?' },
    { id: 'warmer', name: 'Warmer', text: 'Hi Aunt Lisa! I\'m coming to LA Dec 18 to 22 and it would mean a lot to see you. Any day work for you?' },
    { id: 'day', name: 'Ask about a day', text: 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22. Could we get together on the 19th or 20th?' }
  ]);
  assert.deepEqual(M.tripOpenDays(st, trip, 2), ['2026-12-19', '2026-12-20'], 'the days in the middle of the trip are the open ones');
  t.msg.text = 'Lunch on the 19th could be fun';
  assert.equal(M.msgFor(st, t.id, TODAY).text, 'Lunch on the 19th could be fun');
  assert.equal(M.msgFor(st, t.id, TODAY).suggested, m.suggested);
  // found through the trip's prep even without of; a to-do that isn't a message has none
  delete t.of;
  assert.equal(M.msgFor(st, t.id, TODAY).kind, 'headsup');
  const plain = M.prepTodo(st, 'cal', keyed(st, trip, trip.date).travel);
  assert.equal(M.msgFor(st, plain.id, TODAY), null);
  // Marco has no place of his own: the trip's name
  const mt = M.prepTodo(st, 'cal', keyed(st, trip, trip.date)['headsup:Marco']);
  assert.equal(M.msgFor(st, mt.id, TODAY).suggested, 'Hey Marco! I\'ll be in California Dec 18 to 22 and would love to see you. Are you around?');
});

test('a trip named the way people name trips: the heads-up names its place, or says in town when there isn’t one', () => {
  const place = (n) => M.placeOf(n);
  for (const [n, p] of [['Denver', 'Denver'], ['California', 'California'], ['LA', 'LA'], ['Portland, Maine', 'Portland, Maine'],
    ['Visit to Denver', 'Denver'], ['Trip to Chicago', 'Chicago'], ['Weekend in Napa', 'Napa'], ['Denver trip', 'Denver'], ['Napa weekend', 'Napa'],
    ['Family reunion in Ohio', 'Ohio'], ['Drive to Portland in June', 'Portland'], ['Denver for Thanksgiving', 'Denver'], ['Weekend in Napa with Sam', 'Napa'],
    ['Lake Tahoe trip', 'Lake Tahoe'], ['Weekend at Lake Tahoe', 'Lake Tahoe'], ['Trip to the Grand Canyon', 'the Grand Canyon'], ['trip to chicago', 'Chicago'], ['new york', 'New York'],
    ['Visit Mom', ''], ['Family weekend', ''], ['Weekend at the lake', ''], ['Thanksgiving at Mom’s', ''], ['Trip to see Grandma', ''], ['Visit Sarah', ''],
    ['Ski trip', ''], ['October trip', ''], ['Home for Christmas', ''], ['Move to a new place', ''], ['', '']]) assert.equal(place(n), p, JSON.stringify(n));
  assert.equal(M.placeOf({ name: 'Trip to Chicago' }), 'Chicago', 'an event works too');
  const words = {};
  for (const name of ['Visit to Denver', 'Trip to Chicago', 'Weekend in Napa', 'Visit Mom', 'Family weekend']) {
    const st = D.defaultState(TODAY);
    const e = addEvent(st, { id: 't', kind: 'trip', name, icon: 'plane', date: '2026-11-24', end: '2026-11-27', leave: 450, back: 1020 });
    M.addHeadsUp(st, 't', 'Aunt Lisa');
    const m = M.momentFor(st, TODAY, 14 * 60, {}, null, { big: true });
    const t = M.prepTodo(st, e, keyed(st, e, e.date)['headsup:Aunt Lisa']);
    const msg = M.msgFor(st, t.id, TODAY), c = M.countdown(st, { event: 't' }, TODAY, 600);
    words[name] = { place: m.place, question: m.words, text: msg.suggested, versions: Object.fromEntries(msg.versions.map((v) => [v.id, v.text])), countdown: [c.next].concat(c.rest).find((x) => x.msg).msg.text, moment: m.text };
  }
  const where = { 'Visit to Denver': 'Denver', 'Trip to Chicago': 'Chicago', 'Weekend in Napa': 'Napa' };
  for (const name of Object.keys(where)) {
    const x = words[name], p = where[name];
    assert.equal(x.place, p);
    assert.equal(x.question, 'Your aunt would love some notice about ' + p + '. Text her this week?');
    assert.equal(x.text, 'Hey Aunt Lisa! I\'ll be in ' + p + ' Nov 24 to 27 and would love to see you. Are you around?');
    assert.deepEqual(x.versions, {
      shorter: 'Hey Aunt Lisa! In ' + p + ' Nov 24 to 27. Free to meet up?',
      warmer: 'Hi Aunt Lisa! I\'m coming to ' + p + ' Nov 24 to 27 and it would mean a lot to see you. Any day work for you?',
      day: 'Hey Aunt Lisa! I\'ll be in ' + p + ' Nov 24 to 27. Could we get together on the 25th or 26th?'
    });
    assert.equal(x.countdown, x.text);
    assert.equal(x.moment, x.text);
  }
  for (const name of ['Visit Mom', 'Family weekend']) {
    const x = words[name];
    assert.equal(x.place, null, name + ' names no place');
    assert.equal(x.question, 'Your aunt would love some notice. Text her this week?');
    assert.equal(x.text, 'Hey Aunt Lisa! I\'ll be in town Nov 24 to 27 and would love to see you. Are you around?');
    assert.deepEqual(x.versions, {
      shorter: 'Hey Aunt Lisa! In town Nov 24 to 27. Free to meet up?',
      warmer: 'Hi Aunt Lisa! I\'m coming to town Nov 24 to 27 and it would mean a lot to see you. Any day work for you?',
      day: 'Hey Aunt Lisa! I\'ll be in town Nov 24 to 27. Could we get together on the 25th or 26th?'
    });
    assert.equal(x.countdown, x.text);
  }
  for (const x of Object.values(words)) for (const v of [x.question, x.text].concat(Object.values(x.versions))) voice(v, 'a heads-up');
  // a place the person gave for someone comes before the trip's own name
  const st = D.defaultState(TODAY);
  const e = addEvent(st, { id: 'v', kind: 'trip', name: 'Visit Mom', icon: 'plane', date: '2026-11-24', end: '2026-11-27', leave: 450, back: 1020 });
  M.addHeadsUp(st, 'v', 'Uncle Joe', 'Tacoma');
  assert.equal(M.momentFor(st, TODAY, 14 * 60, {}, null, { big: true }).words, 'Your uncle would love some notice about Tacoma. Text him this week?');
  assert.equal(M.msgFor(st, M.prepTodo(st, e, keyed(st, e, e.date)['headsup:Uncle Joe']).id, TODAY).suggested, 'Hey Uncle Joe! I\'ll be in Tacoma Nov 24 to 27 and would love to see you. Are you around?');
});

test('a trip whose days are all taken has no "Ask about a day"', () => {
  const { st, trip } = california();
  M.addHeadsUp(st, 'cal', 'Marco');
  for (const d of M.range('2026-12-18', 5)) st.events.push({ id: 'all-' + d, kind: 'timed', name: 'Conference', cat: 'work', icon: 'people', date: d, start: 300, dur: 1140 });
  assert.deepEqual(M.tripOpenDays(st, trip, 2), []);
  const t = M.prepTodo(st, 'cal', keyed(st, trip, trip.date)['headsup:Marco']);
  assert.deepEqual(M.msgFor(st, t.id, TODAY).versions.map((v) => v.id), ['shorter', 'warmer']);
  assert.equal(M.suggestText('headsup', { who: 'Marco', place: 'California', dates: 'Dec 18 to 22', days: [] }, 'day'), M.suggestText('headsup', { who: 'Marco', place: 'California', dates: 'Dec 18 to 22' }), 'Ask about a day with no open day is the suggestion');
});

test('a trip’s packing list rides inside the Pack block, with each kid’s bag by name', () => {
  const { st, trip } = california();
  const t = M.prepTodo(st, 'cal', keyed(st, trip, trip.date).pack);
  assert.deepEqual(t.list.map((x) => x.name), ['Clothes for 5 days', 'Toiletries', 'Meds', 'Chargers', 'ID and wallet', 'Elijah’s bag']);
  assert.ok(t.list.every((x) => /^li/.test(x.id) && x.done === false));
  assert.equal(new Set(t.list.map((x) => x.id)).size, t.list.length);
  assert.deepEqual(M.packList(five(), { kind: 'trip', date: '2026-11-01', end: '2026-11-04' }).map((x) => x.name).slice(-5), ['Ava’s bag', 'Ben’s bag', 'Cy’s bag', 'Di’s bag', 'Ed’s bag']);
  assert.deepEqual(M.packList(ana(), { kind: 'trip', date: '2026-11-01', end: '2026-11-01' }).map((x) => x.name), ['Clothes for 1 day', 'Toiletries', 'Meds', 'Chargers', 'ID and wallet'], 'no bags on a board with no kids');
  // a repeat copy's list starts with nothing ticked, and its steps forget the day they were checked
  t.list[0].done = true;
  Object.assign(t, { repeat: 'yearly', steps: [{ id: 's1', name: 'Lay it all out', dur: 15, done: true, doneOn: TODAY }] });
  const nt = M.completeTask(st, t.id, TODAY);
  assert.ok(nt.list.every((x) => x.done === false) && nt.list.length === t.list.length);
  assert.equal(t.list[0].done, true, 'the one that was done keeps its ticks');
  assert.equal(nt.steps[0].doneOn, undefined);
  assert.equal(nt.steps[0].done, false);
  assert.equal(t.steps[0].doneOn, TODAY);
});

test('the trip’s countdown: the road to scale, one loud step, and the steps after', () => {
  const { st, trip } = california();
  M.addHeadsUp(st, 'cal', 'Aunt Lisa', 'LA');
  const c = M.countdown(st, { event: 'cal' }, TODAY, 600);
  assert.equal(c.shape, 'date');
  assert.deepEqual([c.title, c.icon, c.cat, c.date, c.end, c.window, c.stand, c.week, c.weeks], ['California', 'plane', 'away', '2026-12-18', '2026-12-22', null, null, null, null]);
  assert.equal(c.words, 'Dec 18 to 22 · in 8 weeks');
  assert.deepEqual(c.road.spans, [{ from: '2026-12-18', to: '2026-12-22', name: 'California', cat: 'away' }]);
  assert.deepEqual([c.road.from, c.road.to, c.road.now, c.road.window], [TODAY, '2026-12-23', TODAY, null]);
  const items = [c.next].concat(c.rest);
  for (const x of items) assert.deepEqual(Object.keys(x).sort(), ['cat', 'date', 'dur', 'icon', 'id', 'msg', 'name', 'placed', 'start', 'status', 'task', 'why']);
  assert.equal(items.filter((x) => x.status === 'next').length, 1, 'only the next step is loud');
  // (V11-3, D20) the heads-up shares its last good day with the travel: the message leads, the way the mock does
  assert.equal(c.next.name, 'Give Aunt Lisa a heads-up');
  assert.ok(c.next.msg);
  assert.deepEqual(c.road.pins.map((p) => p.id).sort(), items.map((x) => x.id).sort(), 'a pin on each step’s last good day');
  for (const p of c.road.pins) assert.equal(p.date, items.find((x) => x.id === p.id).date);
  assert.deepEqual(items.filter((x) => x.status === 'after').map((x) => x.name), ['Unpack after California', 'Groceries after California']);
  const dates = items.map((x) => x.date);
  assert.deepEqual(dates, dates.slice().sort(), 'in order of their last good days');
  // book the travel, the place, and the time off: the heads-up is next, with its text
  for (const k of ['travel', 'stay', 'timeoff']) M.prepTodo(st, 'cal', keyed(st, trip, trip.date)[k]).done = true;
  const c2 = M.countdown(st, { event: 'cal' }, TODAY, 600);
  assert.equal(c2.next.name, 'Give Aunt Lisa a heads-up');
  assert.equal(c2.next.date, '2026-11-20');
  assert.equal(c2.next.why, 'A month’s notice');
  assert.deepEqual(c2.next.msg, { to: 'Aunt Lisa', text: 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?' });
  assert.deepEqual(c2.rest.filter((x) => x.status === 'done').map((x) => x.name), ['Book travel for California', 'Book a place to stay for California', 'Ask for time off for California']);
  // a step on the board says where
  const pack = M.prepTodo(st, 'cal', keyed(st, trip, trip.date).pack);
  M.placeAdd(st, '2026-12-17', { name: pack.name, cat: 'home', icon: 'shirt', dur: 45, src: { type: 'task', id: pack.id } }, 20 * 60);
  assert.deepEqual(M.countdown(st, { event: 'cal' }, TODAY, 600).rest.find((x) => x.task === pack.id).placed, { date: '2026-12-17', start: 1200 });
  // the day after the trip, what comes after it is next, and Look ahead shows it while it's due
  const after = M.countdown(st, { event: 'cal' }, '2026-12-23', 600);
  assert.equal(after.words, 'Dec 18 to 22 · 5 days ago');
  assert.equal(after.next.name, 'Unpack after California');
  const la = M.lookAhead(st, '2026-12-23', 35, '2026-12-23', 400).find((x) => x.id === 'cal');
  assert.equal(la.over, true);
  assert.deepEqual(la.ready.map((r) => r.k + ':' + r.when), ['unpack:now', 'groceries:now']);
  assert.equal(M.lookAhead(st, '2027-01-10', 35, '2027-01-10', 400).find((x) => x.id === 'cal'), undefined, 'and then it’s gone');
  // during the trip, it's now
  assert.equal(M.countdown(st, { event: 'cal' }, '2026-12-20', 600).words, 'Dec 18 to 22 · now');
});

test('Today asks once about a heads-up when it’s time, after dinner and the kind of day', () => {
  const { st } = california();
  M.addHeadsUp(st, 'cal', 'Aunt Lisa', 'LA');
  M.addHeadsUp(st, 'cal', 'Marco');
  const big = { big: true };
  assert.equal(M.momentFor(st, '2026-11-05', 14 * 60, {}, null, big), null, 'not before its start');
  const m = M.momentFor(st, '2026-11-06', 14 * 60, {}, null, big);
  assert.equal(m.kind, 'headsup');
  assert.equal(m.key, 'headsup:Aunt Lisa@2026-12-18');
  assert.deepEqual([m.event, m.who, m.place, m.date, m.start, m.task], ['cal', 'Aunt Lisa', 'LA', '2026-11-20', '2026-11-06', null]);
  assert.equal(m.words, 'Your aunt would love some notice about LA. Text her this week?');
  assert.equal(m.text, 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?');
  // put off by name, the next person; put off for the day, none
  const next = M.momentFor(st, '2026-11-06', 14 * 60, { headsup: { [m.key]: true } }, null, big);
  assert.equal(next.words, 'Marco would love some notice about California. Text Marco this week?');
  assert.equal(M.momentFor(st, '2026-11-06', 14 * 60, { headsup: [m.key, next.key] }, null, big), null);
  assert.equal(M.momentFor(st, '2026-11-06', 14 * 60, { headsup: true }, null, big), null);
  // a version that doesn't ask never sees it
  assert.equal(M.momentFor(st, '2026-11-06', 14 * 60, {}), null);
  // the kind of day and dinner come first
  assert.equal(M.momentFor(st, '2026-11-06', 7 * 60, {}, null, big).kind, 'kind');
  assert.equal(M.momentFor(st, '2026-11-06', 7 * 60, { kind: true }, null, big).kind, 'headsup');
  assert.equal(M.momentFor(st, '2026-11-05', 18 * 60 + 30, {}, null, big).kind, 'dinner');
  // its to-do carries the person's own words into the question
  const t = M.prepTodo(st, 'cal', keyed(st, st.events.find((e) => e.id === 'cal'), '2026-12-18')['headsup:Aunt Lisa']);
  t.msg.text = 'Free for lunch on the 19th?';
  const m2 = M.momentFor(st, '2026-11-06', 14 * 60, {}, null, big);
  assert.deepEqual([m2.task, m2.text], [t.id, 'Free for lunch on the 19th?']);
  // done, it isn't asked again
  t.done = true;
  assert.equal(M.momentFor(st, '2026-11-06', 14 * 60, {}, null, big).who, 'Marco');
  // asleep, nothing
  assert.equal(M.momentFor(st, '2026-11-06', 23 * 60 + 30, {}, null, big), null);
});

/* == weddings, hosting, deadlines == */

test('going to a wedding out of town: the reply, the outfit, and the gift, with travel, a place to stay, and time off', () => {
  const st = D.defaultState(TODAY);
  const w = addEvent(st, { id: 'w', kind: 'timed', occasion: true, away: true, name: 'Sam and Alex’s wedding', icon: 'people', cat: 'family', date: '2027-01-16', start: 960, dur: 300, big: true });
  assert.deepEqual(byK(M.readyList(w, st)), ['rsvp', 'outfit', 'gift', 'travel', 'stay', 'timeoff']);
  const r = keyed(st, w, w.date);
  assert.deepEqual([r.outfit.start, r.outfit.ideal], ['2026-11-21', '2026-12-26'], 'the outfit eight weeks out, done three weeks before');
  assert.equal(r.outfit.why, 'Leaves time for tailoring and shipping');
  assert.equal(r.outfit.todo, 'Get the outfit for Sam and Alex’s wedding');
  assert.deepEqual([r.gift.start, r.gift.ideal], ['2026-12-19', '2027-01-09'], 'a wedding’s gift four weeks out, done a week before');
  assert.deepEqual([r.rsvp.start, r.rsvp.ideal, r.rsvp.msg, r.rsvp.todo], ['2026-12-05', '2026-12-19', true, 'Reply to Sam and Alex’s wedding']);
  const t = M.prepTodo(st, w, r.rsvp);
  const m = M.msgFor(st, t.id, TODAY);
  assert.deepEqual([m.kind, m.to], ['rsvp', '']);
  assert.equal(m.text, 'Hi! I\'d love to come to Sam and Alex’s wedding on Jan 16. Count me in.');
  assert.deepEqual(m.versions.map((v) => v.id), ['shorter', 'warmer'], 'Ask about a day is a heads-up’s only');
  // each on its last good day in the countdown
  const c = M.countdown(st, { event: 'w' }, TODAY, 600);
  assert.equal(c.words, 'Jan 16 · in 13 weeks');
  assert.deepEqual(c.road.spans, [{ from: '2027-01-16', to: '2027-01-16', name: 'Sam and Alex’s wedding', cat: 'family' }]);
  for (const k of ['rsvp', 'outfit', 'gift', 'travel', 'stay', 'timeoff']) assert.equal(c.road.pins.find((p) => p.id === k + '@2027-01-16').date, r[k].ideal, k);
  // no work on the board, no time off to ask for
  const a = ana();
  assert.deepEqual(M.readySuggest({ kind: 'timed', occasion: true, away: true, name: 'A wedding' }, a), ['rsvp', 'outfit', { k: 'gift', lead: 28, by: 7 }, 'travel', 'stay']);
});

test('going to a wedding in town: the reply, the outfit, and the gift, and a party or a show the way it was', () => {
  const st = D.defaultState(TODAY);
  const w = addEvent(st, { id: 'w', kind: 'timed', occasion: true, name: 'Jo’s wedding', icon: 'people', cat: 'family', date: '2027-01-30', start: 960, dur: 300, big: true });
  assert.deepEqual(byK(M.readyList(w, st)), ['rsvp', 'outfit', 'gift']);
  assert.deepEqual(M.readySuggest({ kind: 'timed', occasion: true, name: 'Maya’s birthday party' }, st), ['gift', 'rsvp']);
  assert.deepEqual(M.readySuggest({ kind: 'timed', occasion: true, name: 'Graduation' }, st), ['gift', 'rsvp']);
  assert.deepEqual(M.readySuggest({ kind: 'timed', occasion: true, name: 'The concert' }, st), ['tickets']);
  // a wedding saved before keeps its gift three weeks out
  const old = { id: 'old', kind: 'timed', occasion: true, name: 'A wedding', date: '2026-12-12', start: 900, dur: 240, big: true };
  assert.deepEqual(M.readyKeys(old, st), ['gift']);
  assert.equal(M.readyFor(st, old, old.date, TODAY)[0].start, '2026-11-21');
});

test('hosting: invites, the food, shopping, the place, and thank-you notes after', () => {
  const st = D.defaultState(TODAY);
  const h = addEvent(st, { id: 'tg', kind: 'timed', host: true, name: 'Thanksgiving dinner', icon: 'pot', cat: 'family', date: '2026-11-26', start: 960, dur: 240, big: true });
  assert.deepEqual(h.ready, ['invites', 'food', 'shop', 'tidy', 'thanks']);
  const r = keyed(st, h, h.date);
  assert.deepEqual([r.invites.start, r.invites.ideal, r.invites.msg], ['2026-10-22', '2026-11-05', true]);
  assert.deepEqual([r.food.start, r.food.ideal], ['2026-11-12', '2026-11-21']);
  assert.deepEqual([r.shop.start, r.shop.ideal], ['2026-11-23', '2026-11-25']);
  assert.deepEqual([r.tidy.start, r.tidy.ideal], ['2026-11-24', '2026-11-25']);
  assert.deepEqual([r.thanks.start, r.thanks.ideal, r.thanks.after, r.thanks.msg], ['2026-11-27', '2026-12-10', true, true]);
  assert.deepEqual([r.invites.todo, r.food.todo, r.shop.todo, r.tidy.todo, r.thanks.todo], ['Send the invites for Thanksgiving dinner', 'Plan the food for Thanksgiving dinner', 'Shop for Thanksgiving dinner', 'Get the place ready for Thanksgiving dinner', 'Thank-you notes for Thanksgiving dinner']);
  const inv = M.msgFor(st, M.prepTodo(st, h, r.invites).id, TODAY);
  assert.equal(inv.text, 'Hey! I\'m having Thanksgiving dinner on Nov 26. Would love for you to come. Can you make it?');
  const th = M.msgFor(st, M.prepTodo(st, h, r.thanks).id, TODAY);
  assert.equal(th.kind, 'thanks');
  assert.equal(th.text, 'Thank you so much for coming to Thanksgiving dinner. It meant a lot.');
  // a host's set time shows in Look ahead even without Show on the month, and the day after, the notes are next
  delete h.big;
  assert.ok(M.lookAhead(st, TODAY, 42, TODAY, 400).some((x) => x.id === 'tg'));
  assert.equal(M.countdown(st, { event: 'tg' }, '2026-11-27', 600).next.name, 'Thank-you notes for Thanksgiving dinner');
  const la = M.lookAhead(st, '2026-11-27', 35, '2026-11-27', 400).find((x) => x.id === 'tg');
  assert.deepEqual([la.over, la.ready.map((x) => x.k)], [true, ['thanks']]);
});

test('a deadline: gather what it needs, then finish it', () => {
  const st = D.defaultState(TODAY);
  const tax = addEvent(st, { id: 'tax', kind: 'marker', name: 'Taxes due', icon: 'receipt', date: '2027-04-15' });
  assert.deepEqual(tax.ready, ['papers', 'finish']);
  const r = keyed(st, tax, tax.date);
  assert.deepEqual([r.papers.todo, r.papers.start, r.papers.ideal], ['Gather what Taxes due needs', '2027-03-18', '2027-04-01']);
  assert.deepEqual([r.finish.todo, r.finish.start, r.finish.ideal], ['Finish Taxes due', '2027-04-01', '2027-04-12']);
  assert.deepEqual(M.readySuggest({ kind: 'marker', name: 'Grant', deadline: true }, st), ['papers', 'finish'], 'anything marked as one');
  assert.deepEqual(M.readySuggest({ kind: 'marker', name: 'Passport renewal' }, st), ['papers', 'finish']);
  assert.deepEqual(M.readySuggest({ kind: 'marker', name: 'Jo’s birthday', icon: 'cake' }, st), ['gift'], 'a birthday is still a birthday');
  assert.deepEqual(M.readySuggest({ kind: 'timed', name: 'Tax appointment' }, st), [], 'a set time is an appointment, not the deadline');
  assert.deepEqual(M.readySuggest({ kind: 'timed', name: 'Grant', deadline: true }, st), ['papers', 'finish']);
});

/* == fuzzy dates == */

test('"Not sure yet": this month, next month, a season, or a few months, in plain words', () => {
  assert.deepEqual(M.windowFor('this-month', TODAY), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(M.windowFor('next-month', TODAY), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(M.windowFor('few-months', TODAY), { from: '2026-11-01', to: '2027-01-31' });
  assert.deepEqual(M.windowFor('spring', TODAY), { from: '2027-03-01', to: '2027-05-31' });
  assert.deepEqual(M.windowFor('summer', TODAY), { from: '2027-06-01', to: '2027-08-31' });
  assert.deepEqual(M.windowFor('fall', TODAY), { from: '2026-09-01', to: '2026-11-30' }, 'the one under way');
  assert.deepEqual(M.windowFor('winter', TODAY), { from: '2026-12-01', to: '2027-02-28' });
  assert.deepEqual(M.windowFor('winter', '2027-02-01'), { from: '2026-12-01', to: '2027-02-28' });
  // (V11-3, C26: three weeks or less left of it, a season means the next one; this winter keeps the one under way)
  assert.deepEqual(M.windowFor('winter', '2027-02-10'), { from: '2027-12-01', to: '2028-02-29' });
  assert.deepEqual(M.windowFor('spring', '2027-05-25'), { from: '2028-03-01', to: '2028-05-31' });
  assert.deepEqual(M.windowFor('winter', '2027-02-10', true), { from: '2026-12-01', to: '2027-02-28' });
  assert.equal(M.windowFor('someday', TODAY), null);
  const say = (c) => M.windowWords(M.windowFor(c, TODAY), TODAY);
  assert.equal(say('spring'), 'Sometime in spring · Mar to May');
  assert.equal(say('winter'), 'Sometime in winter · Dec to Feb');
  assert.equal(say('this-month'), 'Sometime this month');
  assert.equal(say('next-month'), 'Sometime next month');
  assert.equal(say('few-months'), 'Sometime between Nov and Jan');
  assert.equal(M.windowWords({ from: '2027-03-01', to: '2027-03-31' }, TODAY), 'Sometime in March');
  assert.equal(M.windowWords({ from: '2028-03-01', to: '2028-05-31' }, TODAY), 'Sometime in spring 2028 · Mar to May');
  assert.equal(M.windowWords({ from: '2027-03-03', to: '2027-04-20' }, TODAY), 'Sometime between Mar 3 and Apr 20');
});

test('a move in spring: a window and no date puts nothing on the board, and its only step now is picking the date', () => {
  const st = D.defaultState(TODAY), base = D.defaultState(TODAY);
  const mv = addEvent(st, { id: 'mv', kind: 'marker', name: 'Move to a new place', icon: 'house', date: null, window: M.windowFor('spring', TODAY) });
  assert.equal(M.isFuzzy(mv), true);
  assert.deepEqual(mv.ready, ['pickdate', 'notice', 'movers', 'address', 'packup', 'unpack']);
  const ft = addEvent(st, { id: 'jp', kind: 'trip', name: 'Japan', icon: 'plane', date: null, end: null, window: M.windowFor('summer', TODAY) });
  assert.deepEqual(byK(M.readyList(ft, st)), ['pickdate', 'travel', 'stay', 'timeoff', 'pack', 'unpack', 'groceries']);
  // never on a day, never a trip day: every day reads as it does without them, and nothing clashes or reminds
  for (const d of M.range('2027-02-20', 200)) {
    assert.equal(M.tripOn(st, d), null, d);
    assert.ok(!M.markersOn(st, d).some((m) => m.id === 'mv'), d);
  }
  for (const d of M.range('2027-03-01', 30).concat(M.range('2027-06-01', 30))) {
    assert.deepEqual(copy(M.calendarDay(st, d)), copy(M.calendarDay(base, d)), d);
    assert.deepEqual(copy(M.resolveDay(st, d)), copy(M.resolveDay(base, d)), d);
    assert.deepEqual(M.clashes(st, d), M.clashes(base, d), d);
    assert.deepEqual(M.remindersFor(st, d), M.remindersFor(base, d), d);
  }
  assert.ok(M.liveEvents(st).includes(mv), 'still a live event');
  assert.equal(M.findFree(st, '2027-03-01', 'day').date, M.findFree(base, '2027-03-01', 'day').date);
  // picking the date is due early enough for the longest lead (movers, eight weeks) before the window opens
  const r = keyed(st, mv, null);
  assert.deepEqual([r.pickdate.key, r.pickdate.when, r.pickdate.ideal, r.pickdate.todo], ['pickdate@2027-03-01', 'now', '2027-01-04', 'Pick the date for Move to a new place']);
  for (const k of ['notice', 'movers', 'address', 'packup', 'unpack']) assert.equal(r[k].when, 'waiting', k);
  assert.equal(M.diffDays(r.notice.ideal, '2027-03-01'), 30, 'a waiting step counts from the window’s first day');
  // Look ahead shows it under its window, asking for its date
  const la = M.lookAhead(st, TODAY, 35, TODAY, 400).find((x) => x.id === 'mv');
  assert.deepEqual([la.fuzzy, la.window, la.date, la.far, la.ready.map((x) => x.k)], [true, { from: '2027-03-01', to: '2027-05-31' }, '2027-03-01', true, ['pickdate']]);
  // the countdown: the window, the pick as the only loud step, the rest waiting
  const c = M.countdown(st, { event: 'mv' }, TODAY, 600);
  assert.deepEqual([c.shape, c.date, c.end, c.words], ['window', null, null, 'Sometime in spring · Mar to May']);
  assert.deepEqual(c.window, { from: '2027-03-01', to: '2027-05-31' });
  assert.deepEqual(c.road.window, c.window);
  assert.deepEqual(c.road.spans, []);
  assert.deepEqual([c.road.from, c.road.to], [TODAY, '2027-05-31']);
  assert.equal(c.next.name, 'Pick the date for Move to a new place');
  assert.ok(c.rest.length === 5 && c.rest.every((x) => x.status === 'waiting'));
  assert.deepEqual(c.road.pins.map((p) => p.id), ['pickdate@2027-03-01'], 'the waiting steps have no day to pin yet');
});

test('picking the move’s date makes it an ordinary date: every step gets its day', () => {
  const st = D.defaultState(TODAY);
  const mv = addEvent(st, { id: 'mv', kind: 'marker', name: 'Move to a new place', icon: 'house', date: null, window: M.windowFor('spring', TODAY) });
  const pick = M.prepTodo(st, mv, keyed(st, mv, null).pickdate);
  const early = M.prepTodo(st, mv, keyed(st, mv, null).movers);
  assert.equal(M.pickDate(st, 'mv', 'soon'), null);
  assert.equal(M.pickDate(st, 'mv', '2027-04-10', null, '2026-11-02'), mv);
  assert.equal(mv.date, '2027-04-10');
  assert.equal(mv.window, undefined);
  assert.equal(M.isFuzzy(mv), false);
  assert.equal(st.tasks.find((t) => t.id === pick.id).done, true, 'picking it is done');
  assert.equal(mv.prep['movers@2027-04-10'], early.id, 'what it kept while it waited moves to the date');
  const r = keyed(st, mv, mv.date);
  assert.equal(r.pickdate, undefined);
  assert.deepEqual(['notice', 'movers', 'address', 'packup', 'unpack'].map((k) => r[k].ideal), ['2027-03-11', '2027-02-27', '2027-04-03', '2027-04-08', '2027-04-11']);
  assert.equal(r.movers.when, 'added');
  assert.equal(r.notice.when, 'later');
  assert.ok(M.markersOn(st, '2027-04-10').some((m) => m.id === 'mv'));
  assert.equal(M.countdown(st, { event: 'mv' }, TODAY, 600).words, 'Apr 10 · in 25 weeks');
  // packing up a little each day spreads from when it starts
  const pu = M.prepTodo(st, mv, r.packup);
  assert.deepEqual(pu.spread, { days: 'daily', cap: 30, when: 'any', from: '2027-03-20' });
  // a trip picks its end too
  const jp = addEvent(st, { id: 'jp', kind: 'trip', name: 'Japan', icon: 'plane', date: null, end: null, window: M.windowFor('summer', TODAY) });
  M.pickDate(st, 'jp', '2027-07-03', '2027-07-12');
  assert.deepEqual([jp.date, jp.end], ['2027-07-03', '2027-07-12']);
  assert.equal(M.tripOn(st, '2027-07-05').id, 'jp');
});

/* == a goal with no date == */

function stronger(st, rhythm) {
  const g = M.newGoal({ name: 'Get stronger', kind: 'skill', today: TODAY, parts: [{ name: 'Strength', min: 0 }], rhythm: Object.assign({ n: 3, chunk: 45, when: 'morning' }, rhythm || {}) });
  st.goals.push(g);
  return g;
}

test('"get stronger" with no date: three times a week, spread over the week, in the morning', () => {
  const st = sam(), g = stronger(st);
  assert.equal(g.date, null);
  assert.equal(g.rhythm.n, 3);
  assert.equal(M.newGoal({ name: 'x', rhythm: { n: 12 } }).rhythm.n, 7);
  assert.equal(M.newGoal({ name: 'x' }).rhythm.n, undefined, 'kept only when it’s said');
  const r = M.planGoal(st, g.id, TODAY, 600);
  assert.equal(r.shortMin, 0, 'never behind');
  assert.equal(r.message, 'This week: Wednesday, Friday, and Saturday.');
  const s = M.goalSessions(st, g.id);
  assert.deepEqual(s.map((x) => x.date), ['2026-10-21', '2026-10-23', '2026-10-24', '2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02']);
  for (const x of s) {
    assert.equal(x.add.dur, 45);
    assert.equal(x.add.name, 'Strength');
    assert.ok(x.add.start < 720, 'in the morning');
  }
  assert.equal(new Set(s.map((x) => x.date)).size, s.length, 'one a day at most');
  // planned again, the same
  M.planGoal(st, g.id, TODAY, 600);
  assert.deepEqual(M.goalSessions(st, g.id).map((x) => x.date), s.map((x) => x.date));
  // a goal set up to start later starts then
  const later = sam(), lg = stronger(later);
  lg.start = '2026-11-02';
  assert.equal(M.planGoal(later, lg.id, TODAY, 600).message, 'It starts Nov 2.');
  assert.ok(M.goalSessions(later, lg.id).every((x) => x.date >= '2026-11-02'));
  // without n, once on each of its days
  const days = sam(), dg = M.newGoal({ name: 'Guitar', kind: 'skill', today: TODAY, rhythm: { days: [1, 3], chunk: 30 } });
  days.goals.push(dg);
  M.planGoal(days, dg.id, TODAY, 600);
  assert.deepEqual(M.goalSessions(days, dg.id).map((x) => M.weekday(x.date)), [3, 1, 3, 1]);
});

test('"get stronger": its progress, its countdown with weeks as dots, and no streaks', () => {
  const st = sam(), g = stronger(st);
  M.planGoal(st, g.id, TODAY, 600);
  const p = M.goalProgress(st, g.id, TODAY, 600);
  assert.deepEqual([p.totalMin, p.leftMin, p.behindMin, p.onTrack, p.daysLeft], [0, 0, 0, true, null]);
  assert.deepEqual(p.perWeek, { n: 3, done: 0, planned: 3 });
  const c0 = M.countdown(st, { goal: g.id }, TODAY, 600);
  assert.deepEqual([c0.shape, c0.words, c0.stand, c0.date, c0.week], ['rhythm', '3 times a week · no end date', null, null, null]);
  // (D4) made today: this week alone, never empty weeks from before it existed
  assert.deepEqual(c0.weeks, [{ from: '2026-10-18', done: 0, of: 3 }], 'this week, and nothing before the goal began');
  assert.deepEqual([c0.road.from, c0.road.to, c0.road.now], ['2026-10-18', '2026-10-24', TODAY]);
  // one begun three weeks back shows four; one begun months back, the last eight
  const older = (start) => { g.start = start; return M.countdown(st, { goal: g.id }, TODAY, 600); };
  const c3 = older('2026-09-29');
  assert.deepEqual(c3.weeks.map((w) => w.from), ['2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18']);
  const c8 = older('2026-03-01');
  assert.equal(c8.weeks.length, 8);
  assert.deepEqual(c8.weeks[0].from, '2026-08-30');
  assert.deepEqual(c8.weeks[7], { from: '2026-10-18', done: 0, of: 3 }, 'this week last');
  assert.deepEqual([c8.road.from, c8.road.to], ['2026-08-30', '2026-10-24']);
  g.start = TODAY;
  const c = M.countdown(st, { goal: g.id }, TODAY, 600);
  assert.deepEqual([c.next.name, c.next.status, c.next.placed], ['Strength', 'next', { date: '2026-10-21', start: 420 }]);
  assert.deepEqual(c.rest.map((x) => x.placed.date), ['2026-10-23', '2026-10-24']);
  // done on Wednesday: one of three this week
  M.findAdd(st, c.next.id).add.done = true;
  assert.deepEqual(M.goalProgress(st, g.id, '2026-10-22', 600).perWeek, { n: 3, done: 1, planned: 3 });
  assert.deepEqual(M.countdown(st, { goal: g.id }, '2026-10-22', 600).weeks, [{ from: '2026-10-18', done: 1, of: 3 }]);
  // a week whose days are taken shows what isn't on the week yet
  const busy = sam(), bg = stronger(busy);
  busy.events.push({ id: 'away', kind: 'trip', name: 'Away', icon: 'plane', date: '2026-10-22', end: '2026-10-24', leave: 450, back: 1020 });
  M.planGoal(busy, bg.id, TODAY, 600);
  const bc = M.countdown(busy, { goal: bg.id }, TODAY, 600);
  assert.equal(M.goalSessions(busy, bg.id).filter((x) => x.date <= '2026-10-24').length, 1, 'only Wednesday has room this week');
  const loose = bc.rest.filter((x) => !x.placed);
  assert.equal(loose.length, 2, 'two of three not on the week yet');
  assert.ok(loose.every((x) => x.status === 'later' && x.dur === 45 && x.name === 'Strength'));
  assert.equal(M.planGoal(busy, bg.id, TODAY, 600).message, '1 of 3 fit this week: Wednesday.');
});

test('"get stronger": the morning after, a session asks once; No gives its slot back to the week', () => {
  const st = sam(), g = stronger(st);
  M.planGoal(st, g.id, TODAY, 600);
  const ask = M.goalCheckIn(st, '2026-10-22');
  assert.deepEqual(ask.map((x) => [x.goal, x.date, x.min]), [[g.id, '2026-10-21', 45]]);
  const r = M.answerCheckIn(st, g.id, '2026-10-21', 'no', { today: '2026-10-22', nowMin: 420 });
  assert.equal(r.ok, true);
  assert.doesNotMatch(r.message, /behind/i);
  const week = M.goalSessions(st, g.id).filter((x) => x.date >= '2026-10-18' && x.date <= '2026-10-24');
  assert.equal(week.filter((x) => x.add.skipped).length, 1);
  assert.equal(week.filter((x) => !x.add.skipped).length, 3, 'the week has its three again');
  assert.deepEqual(M.goalCheckIn(st, '2026-10-22'), []);
  // a paused one plans nothing and asks nothing
  g.paused = true;
  assert.equal(M.planGoal(st, g.id, '2026-10-22', 420).message, 'Paused. Nothing new goes on the board.');
});

/* == the household == */

test('boards that aren’t Russell’s: alone, no work, five kids, a shift worker', () => {
  const trip = { kind: 'trip', name: 'Lisbon' };
  assert.equal(M.boardWorks(ana()), false);
  assert.deepEqual(M.readySuggest(trip, ana()), ['travel', 'stay', 'pack', 'unpack', 'groceries'], 'no time off without work');
  assert.equal(M.boardWorks(sam()), true);
  assert.equal(M.boardWorks(shift()), true, 'a set shift is work');
  assert.deepEqual(M.readySuggest(trip, shift()), ['travel', 'stay', 'timeoff', 'pack', 'unpack', 'groceries']);
  assert.equal(M.boardWorks(five()), true);
  const meet = ana();
  meet.meetings.push({ id: 'm', name: 'Standup', days: [1], start: 600, dur: 15 });
  assert.equal(M.boardWorks(meet), true, 'a weekly meeting is work');
  // a panel's choices: time off only with work; never a heads-up (by name) or a pick (it comes by itself)
  assert.deepEqual(M.READY_FOR.trip.filter((k) => M.readyFits(k, ana())), ['travel', 'stay', 'pack', 'unpack', 'groceries']);
  assert.deepEqual(M.READY_FOR.trip.filter((k) => M.readyFits(k, sam())), M.READY_FOR.trip);
  assert.equal(M.readyFits('headsup', sam()), false);
  assert.equal(M.readyFits('pickdate', sam()), false);
  assert.deepEqual(Object.keys(M.READY_FOR).sort(), ['deadline', 'host', 'marker', 'move', 'occasion', 'timed', 'trip']);
  for (const k of Object.keys(M.READY_FOR)) for (const r of M.READY_FOR[k]) assert.ok(M.READY[r], k + ': ' + r);
  // the old kinds keep their numbers
  assert.deepEqual(['gift', 'gifts', 'plans', 'travel', 'pack', 'tickets', 'wear', 'costume'].map((k) => [M.READY[k].lead, M.READY[k].by]), [[21, 3], [56, 10], [21, 7], [56, 28], [3, 1], [28, 14], [21, 5], [28, 5]]);
  // someone alone can still send a heads-up, and a five-kid trip packs five bags
  const st = ana();
  const t = addEvent(st, { id: 'l', kind: 'trip', name: 'Lisbon', icon: 'plane', date: '2027-03-10', end: '2027-03-14' });
  M.addHeadsUp(st, t, 'Inês');
  assert.equal(M.msgFor(st, M.prepTodo(st, t, keyed(st, t, t.date)['headsup:Inês']).id, TODAY).suggested, 'Hey Inês! I\'ll be in Lisbon Mar 10 to 14 and would love to see you. Are you around?');
  const f = five(), ft = addEvent(f, { id: 'f', kind: 'trip', name: 'The lake', icon: 'plane', date: '2026-11-13', end: '2026-11-15' });
  assert.equal(M.prepTodo(f, ft, keyed(f, ft, ft.date).pack).list.filter((x) => /’s bag$/.test(x.name)).length, 5);
});

test('a board that doesn’t help with meals is never offered groceries after a trip, the way one without work isn’t offered time off', () => {
  const noMeals = D.buildState({ name: 'Kai', kids: [], wake: { wd: 420, we: 480 }, bed: { wd: 1380, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 }, help: { dinners: false } }, TODAY);
  assert.equal(noMeals.settings.modules.dinners, false);
  assert.equal(M.boardMeals(noMeals), false);
  assert.equal(M.boardMeals(sam()), true);
  assert.equal(M.boardMeals(), true, 'with no board, meals count as on, the way the app reads it');
  const trip = { kind: 'trip', name: 'Lisbon' };
  assert.deepEqual(M.readySuggest(trip, noMeals), ['travel', 'stay', 'timeoff', 'pack', 'unpack']);
  assert.deepEqual(M.readySuggest(trip, sam()), ['travel', 'stay', 'timeoff', 'pack', 'unpack', 'groceries']);
  assert.deepEqual(M.readySuggest(Object.assign({ window: M.windowFor('summer', TODAY), date: null }, trip), noMeals), ['pickdate', 'travel', 'stay', 'timeoff', 'pack', 'unpack'], 'a fuzzy trip too');
  // neither meals nor work: neither groceries nor time off
  const off = ana();
  off.settings.modules = Object.assign({}, off.settings.modules, { dinners: false });
  assert.deepEqual(M.readySuggest(trip, off), ['travel', 'stay', 'pack', 'unpack']);
  // a panel's choices leave it out too
  assert.equal(M.readyFits('groceries', noMeals), false);
  assert.equal(M.readyFits('groceries', sam()), true);
  assert.deepEqual(M.READY_FOR.trip.filter((k) => M.readyFits(k, noMeals)), ['travel', 'stay', 'timeoff', 'pack', 'unpack']);
  // a date made there gets ready without it; a list the person kept stays theirs
  const t = addEvent(noMeals, { id: 'l', kind: 'trip', name: 'Lisbon', icon: 'plane', date: '2027-03-10', end: '2027-03-14' });
  assert.ok(!M.readyFor(noMeals, t, t.date, TODAY).some((r) => r.k === 'groceries'));
  assert.ok(!M.countdown(noMeals, { event: 'l' }, TODAY, 600).rest.some((x) => /^Groceries/.test(x.name)));
  const kept = { id: 'k', kind: 'trip', name: 'Porto', date: '2027-04-01', end: '2027-04-03', ready: ['travel', 'groceries'] };
  assert.deepEqual(M.readyKeys(kept, noMeals), ['travel', 'groceries']);
});

/* == suggested texts == */

test('suggested texts: four kinds, each with a shorter and a warmer version, and Ask about a day for a heads-up', () => {
  const h = { who: 'Aunt Lisa', place: 'LA', dates: 'Dec 18 to 22', days: ['2026-12-19', '2026-12-20'] };
  assert.equal(M.suggestText('headsup', h), 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?');
  assert.equal(M.suggestText('headsup', h, 'shorter'), 'Hey Aunt Lisa! In LA Dec 18 to 22. Free to meet up?');
  assert.equal(M.suggestText('headsup', h, 'warmer'), 'Hi Aunt Lisa! I\'m coming to LA Dec 18 to 22 and it would mean a lot to see you. Any day work for you?');
  assert.equal(M.suggestText('headsup', h, 'day'), 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22. Could we get together on the 19th or 20th?');
  assert.equal(M.suggestText('headsup', Object.assign({}, h, { days: ['2026-12-31', '2027-01-01'] }), 'day'), 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22. Could we get together on Dec 31 or Jan 1?');
  assert.equal(M.suggestText('headsup', Object.assign({}, h, { days: ['2026-12-21'] }), 'day'), 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22. Could we get together on the 21st?');
  assert.equal(M.suggestText('headsup', { who: 'Sam', place: 'Denver', from: '2026-12-03' }), 'Hey Sam! I\'ll be in Denver on Dec 3 and would love to see you. Are you around?');
  assert.equal(M.suggestText('headsup', { who: 'Sam', place: 'Denver', from: '2026-12-03', to: '2026-12-06' }, 'shorter'), 'Hey Sam! In Denver Dec 3 to 6. Free to meet up?');
  const ev = { name: 'Sam’s wedding', date: '2027-01-16' };
  assert.equal(M.suggestText('rsvp', ev), 'Hi! I\'d love to come to Sam’s wedding on Jan 16. Count me in.');
  assert.equal(M.suggestText('rsvp', ev, 'shorter'), 'Hi! Count me in for Sam’s wedding on Jan 16.');
  assert.equal(M.suggestText('rsvp', ev, 'warmer'), 'Hi! Thank you for thinking of me. I\'d love to come to Sam’s wedding on Jan 16. Count me in.');
  assert.equal(M.suggestText('rsvp', ev, 'day'), M.suggestText('rsvp', ev), 'Ask about a day is a heads-up’s only');
  const party = { name: 'The block party', date: 'Jun 6' };
  assert.equal(M.suggestText('invites', party), 'Hey! I\'m having the block party on Jun 6. Would love for you to come. Can you make it?');
  assert.equal(M.suggestText('invites', party, 'shorter'), 'Hey! I\'m having the block party on Jun 6. Can you make it?');
  assert.equal(M.suggestText('invites', party, 'warmer'), 'Hey! I\'m having the block party on Jun 6, and it wouldn\'t be the same without you. Can you make it?');
  assert.equal(M.suggestText('thanks', { name: 'the flowers' }), 'Thank you so much for the flowers. It meant a lot.');
  assert.equal(M.suggestText('thanks', { name: 'the flowers' }, 'shorter'), 'Thank you for the flowers!');
  assert.equal(M.suggestText('thanks', { name: 'the flowers' }, 'warmer'), 'Thank you so much for the flowers. It meant a lot, and I\'m so glad you were there.');
  assert.equal(M.suggestText('nope', {}), '');
});

test('everything a person reads here is in the house voice: no dashes, none of the filler words, and to-do with its hyphen', () => {
  for (const k of Object.keys(M.READY)) {
    const R = M.READY[k];
    for (const s of [R.name, R.short, R.todo].concat(R.why ? [R.why] : [])) voice(s, k);
    assert.doesNotMatch(R.todo + ' ' + (R.why || ''), /\bto do\b|\btodo\b|\$|\bfee/i, k);
  }
  const facts = [{ who: 'Aunt Lisa', place: 'LA', dates: 'Dec 18 to 22', days: ['2026-12-19', '2026-12-20'] }, { name: 'Sam’s wedding', date: 'Jan 16' }, {}];
  for (const kind of ['headsup', 'rsvp', 'invites', 'thanks']) for (const f of facts) for (const style of [undefined, 'shorter', 'warmer', 'day']) voice(M.suggestText(kind, f, style), kind + ' ' + style);
  for (const c of ['this-month', 'next-month', 'few-months', 'spring', 'summer', 'fall', 'winter']) voice(M.windowWords(M.windowFor(c, TODAY), TODAY), c);
  for (const n of [-30, -1, 0, 1, 5, 20, 100, 300, 900]) voice(M.awayWords(M.addDays(TODAY, n), TODAY), 'away ' + n);
  const { st } = california();
  M.addHeadsUp(st, 'cal', 'Uncle Joe');
  voice(M.momentFor(st, '2026-11-06', 14 * 60, {}, null, { big: true }).words, 'the heads-up question');
  assert.equal(M.momentFor(st, '2026-11-06', 14 * 60, {}, null, { big: true }).words, 'Your uncle would love some notice about California. Text him this week?');
  const s = sam(), g = stronger(s);
  voice(M.planGoal(s, g.id, TODAY, 600).message, 'a weekly plan');
});

/* == yesterday == */

function yesterdayBoard() {
  const st = D.sampleState(TODAY), Y = '2026-10-20';
  st.tasks.push({ id: 'call', name: 'Call the bank', group: 'inbox', icon: 'handset', cat: 'home', due: '2026-10-22', dur: 15, done: false, repeat: null, steps: [] });
  M.placeAdd(st, Y, { name: 'Call the bank', cat: 'home', icon: 'handset', dur: 15, src: { type: 'task', id: 'call' } }, 12 * 60);
  const reg = st.tasks.find((t) => t.id === 'registration');
  M.placeAdd(st, Y, { name: reg.steps[0].name, cat: 'home', icon: 'car', dur: 15, src: { type: 'step', task: 'registration', id: reg.steps[0].id } }, 12 * 60 + 30);
  M.placeAdd(st, Y, { name: reg.steps[1].name, cat: 'home', icon: 'car', dur: 15, src: { type: 'step', task: 'registration', id: reg.steps[1].id } }, 13 * 60);
  reg.steps[1].done = true;
  reg.steps[1].doneOn = Y;
  const g = M.newGoal({ name: 'Get stronger', kind: 'skill', today: '2026-10-13', parts: [{ name: 'Strength', min: 0 }], rhythm: { n: 3, chunk: 45 } });
  st.goals.push(g);
  M.placeAdd(st, Y, { name: 'Strength', cat: 'yours', icon: 'dumbbell', dur: 45, src: { type: 'goal', id: g.id, part: g.parts[0].id } }, 18 * 60 + 30);
  return { st, g, reg };
}

test('yesterday: what went by with no check, and the morning question that asks about it once', () => {
  const { st, g, reg } = yesterdayBoard();
  const WED = '2026-10-21';
  const loose = M.yesterdayLoose(st, WED, 7 * 60);
  assert.deepEqual(loose.map((x) => [x.kind, x.name, x.date, x.start, x.dur]), [['task', 'Call the bank', '2026-10-20', 720, 15], ['step', 'Find the notice', '2026-10-20', 750, 15], ['goal', 'Strength', '2026-10-20', 1110, 45]]);
  assert.deepEqual([loose[0].task, loose[1].task, loose[1].step, loose[2].goal], ['call', 'registration', reg.steps[0].id, g.id]);
  for (const x of loose) assert.deepEqual(Object.keys(x).sort(), ['add', 'cat', 'date', 'dur', 'goal', 'icon', 'kind', 'name', 'start', 'step', 'task']);
  // the morning after, from wake until noon: before the kind of day, and only when it's asked for
  const big = { big: true };
  assert.equal(M.momentFor(st, WED, 5 * 60, {}, null, big), null, 'not before wake');
  const m = M.momentFor(st, WED, 7 * 60, {}, null, big);
  assert.deepEqual([m.kind, m.count, m.words], ['yesterday', 3, '3 things from yesterday didn’t get a check.']);
  assert.deepEqual(m.items, loose);
  assert.equal(M.momentFor(st, WED, 7 * 60, { yesterday: true }, null, big).kind, 'kind', 'put off, the kind of day is next');
  assert.equal(M.momentFor(st, WED, 7 * 60, {}).kind, 'kind', 'a version that doesn’t ask goes straight to the kind of day');
  assert.equal(M.momentFor(st, WED, 7 * 60, {}, null, { yesterday: true }).kind, 'yesterday');
  assert.notEqual((M.momentFor(st, WED, 12 * 60 + 30, { kind: true }, null, big) || {}).kind, 'yesterday', 'not after noon');
  // done, checked, answered, moved ahead, or let go: it's off the list, and letting go never marks a to-do done
  st.tasks.find((t) => t.id === 'call').done = true;
  g.answers['2026-10-20'] = 'yes';
  M.placeAdd(st, '2026-10-22', { name: reg.steps[0].name, cat: 'home', icon: 'car', dur: 15, src: { type: 'step', task: 'registration', id: reg.steps[0].id } }, 7 * 60);
  assert.deepEqual(M.yesterdayLoose(st, WED, 7 * 60), []);
  const again = yesterdayBoard();
  const add = M.yesterdayLoose(again.st, WED, 7 * 60)[0].add;
  M.removeAdd(again.st, add);
  assert.equal(again.st.tasks.find((t) => t.id === 'call').done, false);
  assert.deepEqual(M.yesterdayLoose(again.st, WED, 7 * 60).map((x) => x.kind), ['step', 'goal']);
  assert.equal(M.momentFor(again.st, WED, 7 * 60, {}, null, big).words, '2 things from yesterday didn’t get a check.');
  // a skipped session or one on a trip day doesn't count; something late last night still running doesn't either
  const late = yesterdayBoard();
  late.st.dates['2026-10-20'].adds.filter((a) => a.src.type === 'goal').forEach((a) => { a.skipped = true; });
  M.placeAdd(late.st, '2026-10-20', { name: 'Call Grandma', cat: 'family', icon: 'handset', dur: 120, src: { type: 'task', id: 'call2' } }, 23 * 60);
  late.st.tasks.push({ id: 'call2', name: 'Call Grandma', group: 'inbox', icon: 'handset', cat: 'family', due: WED, dur: 120, done: false, repeat: null, steps: [] });
  assert.deepEqual(M.yesterdayLoose(late.st, WED, 30).map((x) => x.name), ['Call the bank', 'Find the notice'], 'at half past midnight the late call is still going');
  assert.deepEqual(M.yesterdayLoose(late.st, WED, 7 * 60).map((x) => x.name), ['Call the bank', 'Find the notice', 'Call Grandma']);
});

/* == a countdown for anything == */

test('the countdown has one shape for every big thing, and answers nothing for what isn’t there', () => {
  const st = D.defaultState(TODAY);
  M.addHeadsUp(st, 'virginia', 'Grandma');
  st.events.push({ id: 'mv', kind: 'marker', name: 'Move', date: null, window: M.windowFor('spring', TODAY) });
  const g1 = barExam(st), g2 = stronger(st);
  const keys = ['cat', 'date', 'end', 'icon', 'next', 'rest', 'road', 'shape', 'stand', 'title', 'week', 'weeks', 'window', 'words'];
  const road = ['from', 'marks', 'now', 'pins', 'spans', 'stages', 'to', 'window'];
  const shapes = [];
  for (const ref of [{ event: 'virginia' }, { event: 'salty' }, { event: 'kim-bday' }, { event: 'mv' }, { goal: g1.id }, { goal: g2.id }]) {
    const c = M.countdown(st, ref, TODAY, 600);
    assert.deepEqual(Object.keys(c).sort(), keys, JSON.stringify(ref));
    assert.deepEqual(Object.keys(c.road).sort(), road);
    assert.ok(c.road.from <= c.road.now && c.road.now <= c.road.to, JSON.stringify(ref));
    for (const x of (c.next ? [c.next] : []).concat(c.rest)) {
      assert.ok(['done', 'next', 'later', 'after', 'waiting'].includes(x.status), x.status);
      voice(x.name, 'item');
    }
    voice(c.words, 'words');
    shapes.push(c.shape);
  }
  assert.deepEqual(shapes, ['date', 'date', 'date', 'window', 'goal', 'rhythm']);
  // a yearly date counts to its next day
  assert.equal(M.countdown(st, { event: 'kim-bday' }, '2027-03-01', 600).date, '2028-02-24');
  assert.equal(M.countdown(st, { event: 'nope' }, TODAY, 600), null);
  // a date with neither a day nor a window has nothing to count down to, and says nothing wrong
  st.events.push({ id: 'odd', kind: 'marker', name: 'Someday', date: null });
  const odd = M.countdown(st, { event: 'odd' }, TODAY, 600);
  assert.deepEqual([odd.next, odd.rest, odd.words, odd.road.from, odd.road.to], [null, [], '', TODAY, TODAY]);
  assert.deepEqual(M.readyFor(st, st.events.find((e) => e.id === 'odd'), null, TODAY), []);
  assert.equal(M.countdown(st, { goal: 'nope' }, TODAY, 600), null);
  assert.equal(M.countdown(st, {}, TODAY, 600), null);
  // Russell's own Virginia trip, saved before, keeps its two steps and gains the heads-up
  assert.deepEqual(M.readyKeys(st.events.find((e) => e.id === 'virginia'), st), ['travel', 'pack', 'headsup']);
});
