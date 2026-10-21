/* V11-2, big moments (docs/BIG-MOMENTS.md, B: the countdown; mock screens 2 to 5). The road from today to a big date
   or goal, drawn to scale: where each part of it sits (app.js cdRoad: the weeks, the months named under it, today, the
   span, an exam's stages and practice exams, a fuzzy date's window, and the pins gathered where they'd touch), the
   words each step's brick says (cdWhere, cdRel), the rest folded in a few words (cdRestWords), the stages' colors and
   the ink on them (cdShades), and goals with no date in Goals (liveGoal, goalWhenOf). Cut out of board/src/app.js and
   run with the real Model and Data, on made up boards, today Tuesday, Oct 20, 2026, as in the mock. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D, plain } from './v11-rig.mjs';

const TODAY = '2026-10-20';
const BANNED = /[—–]|--|\b(just|really|simply|actually|easily|please)\b/i;
const voice = (s, what) => { assert.equal(typeof s, 'string', what); assert.doesNotMatch(s, BANNED, what + ': ' + s); assert.doesNotMatch(s, /\bto do\b|\btodo\b/i, what + ': ' + s); };

/* the countdown's own rules in a world of their own: today, a time of day, and the words the to-do sheet uses */
function roadRig(nowMin) {
  const script = `
    const FEEL = true, today = '${TODAY}', nowMin = ${nowMin == null ? 600 : nowMin};
    const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const overBy = (date, start, dur) => date < today || (date === today && start + dur <= nowMin);
    ${app('  function timeSpan(date, start, end) {', '  function canPlaceWindow(')}
    ${app('  /* a day said the way a person says it: today, tomorrow, Thursday', '  /* V11: a box saved as focus leaves it saves once focus has landed')}
    ${app('  /* a day said short, the way the rows say it', '  /* where each step stands:')}
    ${app('  /* V11-2, the countdown\'s road to scale and its words', '  /* the road, drawn */')}
    ({ cdRoad, cdRel, cdWhere, cdRestWords, cdShades, cdInk, cdRatio, cdSaid, CD_RANK });`;
  return runInNewContext(script, { M, D, console });
}
const r = roadRig();
const copy = (v) => JSON.parse(JSON.stringify(v));

/* the trip from the mock: California, Dec 18 to 22, with Aunt Lisa to see in LA */
function california() {
  const st = D.defaultState(TODAY);
  const trip = { id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-18', end: '2026-12-22', leave: 450, back: 1020 };
  trip.ready = M.readySuggest(trip, st);
  st.events.push(trip);
  M.addHeadsUp(st, 'cal', 'Aunt Lisa', 'LA');
  return { st, trip };
}
const keyed = (st, e, on) => Object.fromEntries(M.readyFor(st, e, on, TODAY).map((x) => [x.k + (x.who ? ':' + x.who : ''), x]));

test('the trip’s road: to scale from today to the day after, its span, the months, and a pin on each last good day', () => {
  const { st } = california();
  const c = M.countdown(st, { event: 'cal' }, TODAY, 600);
  const L = r.cdRoad(c, 340);
  assert.equal(L.total, M.diffDays(c.road.from, c.road.to) + 1);
  const at = (d) => (M.diffDays(c.road.from, d) / L.total) * 100;
  // the trip is a span from its first day to the end of its last
  assert.equal(L.spans.length, 1);
  assert.ok(Math.abs(L.spans[0].l - at('2026-12-18')) < 1e-9);
  assert.ok(Math.abs(L.spans[0].l + L.spans[0].w - at('2026-12-23')) < 1e-9, 'through the end of Dec 22');
  // today, near the start, and nothing gone by on a date's road
  assert.ok(L.now > 0 && L.now < 2);
  assert.equal(L.gone, 0);
  // the months under it: October where it starts, then November and December where they start
  assert.deepEqual(plain(L.months.map((m) => m.name)), ['Oct', 'Nov', 'Dec']);
  assert.ok(Math.abs(L.months[1].at - at('2026-11-01')) < 1e-9);
  // a line at each week, inside the road
  assert.ok(L.ticks.length >= 8 && L.ticks.every((t) => t > 0 && t < 100));
  // every step is in a pin; pins never touch (28 px apart at 340 wide), and each shows its most pressing step at its own day
  const all = L.pins.reduce((a, g) => a.concat(g.items), []);
  assert.deepEqual(plain(all.map((p) => p.id).sort()), plain(c.road.pins.map((p) => p.id).sort()));
  for (let i = 1; i < L.pins.length; i++) assert.ok(L.pins[i].at - L.pins[i - 1].at >= (28 / 340) * 100 - 1e-9, 'pins ' + i + ' apart');
  for (const g of L.pins) {
    assert.ok(g.items.every((p) => r.CD_RANK[g.top.status] <= r.CD_RANK[p.status]), 'the most pressing on top');
    assert.ok(Math.abs(g.at - ((M.diffDays(c.road.from, g.top.date) + 0.5) / L.total) * 100) < 1e-9, 'at its own day');
  }
  // travel, a place to stay, and time off share Nov 20 with the heads-up: one pin, the next step on top, the count beside it
  const nov20 = L.pins.find((g) => g.items.some((p) => p.date === '2026-11-20'));
  assert.ok(nov20.items.length >= 4);
  assert.equal(nov20.top.status, 'next');
  // narrower, they gather more; wider, less
  assert.ok(r.cdRoad(c, 200).pins.length <= L.pins.length);
  assert.ok(r.cdRoad(c, 900).pins.length >= L.pins.length);
  voice(r.cdSaid(c, L), 'the road in words');
});

test('the bar exam’s road: its stages in order across the months, practice exams as marks, and the day as a pin of its own', () => {
  const st = D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, TODAY);
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, date: '2027-02-24', today: TODAY, parts: ex.parts, mix: ex.mix, rhythm: { wd: 120, we: 180, when: 'any', chunk: 60 } });
  st.goals.push(g);
  M.planGoal(st, g.id, TODAY, 600);
  const c = M.countdown(st, { goal: g.id }, TODAY, 600);
  const L = r.cdRoad(c, 340);
  assert.deepEqual(plain(L.stages.map((s) => s.name)), ['Learn', 'Practice', 'Review', 'Lighter days']);
  for (let i = 1; i < L.stages.length; i++) assert.ok(Math.abs(L.stages[i].l - (L.stages[i - 1].l + L.stages[i - 1].w)) < 1e-9, 'one after another, touching');
  assert.equal(L.stages[0].l, 0);
  assert.equal(L.stages[0].on, true, 'Learn is under way');
  assert.ok(L.stages.slice(1).every((s) => !s.on));
  assert.deepEqual(plain(L.months.map((m) => m.name)), ['Oct', 'Nov', 'Dec', 'Jan', 'Feb']);
  // the exam day is its own pin; a practice exam right beside it (four days before) steps aside for it
  assert.equal(L.day.date, '2027-02-24');
  assert.equal(L.day.name, 'Exam day');
  const practice = M.examStages(st, g).practice;
  assert.deepEqual(plain(L.marks.map((m) => m.date)), practice.filter((d) => Math.abs(M.diffDays(d, '2027-02-24')) * (340 / L.total) >= 20));
  assert.ok(L.marks.length >= 3);
  assert.equal(L.pins.length, 0, 'a goal’s road has no step pins');
  voice(r.cdSaid(c, L), 'the exam road in words');
  // the stages wear the goal's color, a shade deeper each, and the ink on each passes 4.5 to 1
  for (const k of Object.keys(D.CATS)) {
    const sh = r.cdShades(D.CATS[k].base, L.stages);
    sh.forEach((x, i) => assert.ok(r.cdRatio(x.ink, x.bg) >= 4.5, k + ' stage ' + i + ': ' + x.ink + ' on ' + x.bg));
    // (V11-3, D36) and a glance tells Learn, Practice, and Review apart: each a step lighter or deeper than the next
    for (let i = 1; i < Math.min(3, sh.length); i++) assert.ok(r.cdRatio(sh[i - 1].bg, sh[i].bg) >= 1.25, k + ': stages ' + (i - 1) + ' and ' + i + ' read as one color, ' + sh[i - 1].bg + ' and ' + sh[i].bg);
  }
});

test('a fuzzy date’s road: a dashed window and no span, and only the pick has a pin', () => {
  const st = D.defaultState(TODAY);
  const mv = { id: 'mv', kind: 'marker', name: 'Moving day', icon: 'house', date: null, window: M.windowFor('spring', TODAY) };
  mv.ready = M.readySuggest(mv, st);
  st.events.push(mv);
  const c = M.countdown(st, { event: 'mv' }, TODAY, 600);
  const L = r.cdRoad(c, 340);
  assert.equal(L.spans.length, 0);
  const at = (d) => (M.diffDays(c.road.from, d) / L.total) * 100;
  assert.ok(Math.abs(L.window.l - at('2027-03-01')) < 1e-9);
  assert.ok(Math.abs(L.window.l + L.window.w - 100) < 1e-9, 'to the end of May, the end of the road');
  assert.deepEqual(plain(L.pins.map((g) => g.top.id)), ['pickdate@2027-03-01']);
  assert.ok(L.months.length >= 4 && L.months.length <= 8, 'months named, none touching: ' + L.months.map((m) => m.name).join(' '));
  for (let i = 1; i < L.months.length; i++) assert.ok(L.months[i].at - L.months[i - 1].at >= (30 / 340) * 100 - 1e-9);
  voice(r.cdSaid(c, L), 'the fuzzy road in words');
});

test('each step says where it stands: by its last good day and how far that is from the date, waiting, on the week, done', () => {
  const { st, trip } = california();
  const c = M.countdown(st, { event: 'cal' }, TODAY, 600);
  const sp = (x) => x.replace(/ /g, ' ');
  const lisa = [c.next].concat(c.rest).find((x) => /Aunt Lisa/.test(x.name));
  assert.equal(r.cdWhere(c, lisa).words, 'By Nov 20, a month before · 5 min', 'the mock’s words');
  assert.equal(r.cdWhere(c, lisa).kind, 'loose');
  const groceries = c.rest.find((x) => x.status === 'after' && /Groceries/.test(x.name));
  assert.equal(r.cdWhere(c, groceries).words, 'By Dec 23, the day after · 45 min');
  // a step made a to-do and put on the week says when; done, it says so
  const pack = M.prepTodo(st, 'cal', keyed(st, trip, trip.date).pack);
  M.placeAdd(st, '2026-12-17', { name: pack.name, cat: 'home', icon: 'shirt', dur: 45, src: { type: 'task', id: pack.id } }, 20 * 60);
  M.prepTodo(st, 'cal', keyed(st, trip, trip.date).travel).done = true;
  const c2 = M.countdown(st, { event: 'cal' }, TODAY, 600);
  const packed = c2.rest.find((x) => x.task === pack.id), booked = c2.rest.find((x) => x.status === 'done');
  assert.equal(sp(r.cdWhere(c2, packed).words), 'Dec 17 8 pm · 45 min');
  assert.equal(r.cdWhere(c2, packed).kind, 'set');
  assert.equal(r.cdWhere(c2, booked).words, 'Done · 45 min');
  assert.equal(r.cdWhere(c2, booked).kind, 'done');
  // a fuzzy date's steps wait for its day, said by how far before it they'll be
  const mvSt = D.defaultState(TODAY);
  const mv = { id: 'mv', kind: 'marker', name: 'Moving day', icon: 'house', date: null, window: M.windowFor('spring', TODAY) };
  mv.ready = M.readySuggest(mv, mvSt);
  mvSt.events.push(mv);
  const cm = M.countdown(mvSt, { event: 'mv' }, TODAY, 600);
  const said = Object.fromEntries(cm.rest.map((x) => [x.id.split('@')[0], r.cdWhere(cm, x).words]));
  assert.equal(said.notice, 'A month before', 'thirty days, said the way a person says it');
  assert.equal(said.movers, '6 weeks before');
  assert.equal(said.packup, 'From 3 weeks before, a little each day', 'a little each day says when it starts');
  assert.equal(said.unpack, 'The day after', 'what comes after the date says so');
  assert.ok(cm.rest.every((x) => r.cdWhere(cm, x).kind === 'loose'));
  // the words a person reads
  for (const x of [c.next].concat(c.rest, c2.rest, cm.rest)) voice(r.cdWhere(x === cm.next || cm.rest.includes(x) ? cm : c2.rest.includes(x) ? c2 : c, x).words, x.name);
});

test('how far a last good day is, the way a person says it', () => {
  assert.equal(r.cdRel(28, false), 'a month before');
  assert.equal(r.cdRel(30, false), 'a month before');
  assert.equal(r.cdRel(42, false), '6 weeks before');
  assert.equal(r.cdRel(7, false), 'a week before');
  assert.equal(r.cdRel(1, false), 'the day before');
  assert.equal(r.cdRel(3, false), '3 days before');
  assert.equal(r.cdRel(0, false), 'the day of');
  assert.equal(r.cdRel(1, true), 'the day after');
  assert.equal(r.cdRel(14, true), '2 weeks after');
  assert.equal(r.cdRel(0, true), 'right after');
});

test('the rest, folded, in a few words: kinds in small letters after the first, people by name', () => {
  const { st, trip } = california();
  M.addHeadsUp(st, 'cal', 'Marco');
  const c = M.countdown(st, { event: 'cal' }, TODAY, 600);
  const words = r.cdRestWords(c.rest);
  voice(words, 'the fold');
  assert.match(words, /and \d+ more$/);
  assert.equal(r.cdRestWords(c.rest.slice(0, 1)), [c.rest[0]].map((x) => (/^headsup:/.test(x.id) ? x.id.slice(8, x.id.lastIndexOf('@')) : M.READY[x.id.split('@')[0]].short))[0]);
  const two = c.rest.filter((x) => x.status === 'after');
  assert.equal(r.cdRestWords(two), 'Unpack and groceries');
  const people = c.rest.filter((x) => /^headsup:/.test(x.id));
  if (people.length) assert.ok(people.every((x) => r.cdRestWords([x]) === x.id.slice(8, x.id.lastIndexOf('@'))), 'a heads-up by its person');
  void trip;
});

/* Goals with no date: in play for as long as they run, said by how often (ui-goals' rig: words and sums) */
test('a goal with no date is in play, places sessions, and says how often in place of a date', () => {
  const st = D.sampleState(TODAY);
  const g = M.newGoal({ name: 'Get stronger', kind: 'skill', today: TODAY, parts: [{ name: 'Strength', min: 0 }], rhythm: { n: 3, chunk: 45, when: 'morning' } });
  const two = M.newGoal({ name: 'Guitar', kind: 'skill', today: TODAY, parts: [{ name: 'Guitar', min: 0 }], rhythm: { n: 2, chunk: 30 } });
  const daily = M.newGoal({ name: 'Walk', kind: 'skill', today: TODAY, parts: [{ name: 'Walk', min: 0 }], rhythm: { n: 7, chunk: 30 } });
  st.goals.push(g, two, daily, M.newGoal({ name: 'Old', date: '2026-10-01', today: '2026-09-01', parts: [{ name: 'All', min: 60 }] }));
  const script = `
    let state = __board, today = '${TODAY}', nowMin = 600;
    const cache = new Map();
    const day = (d) => { let x = cache.get(d); if (!x) { x = M.calendarDay(state, d); cache.set(d, x); } return x; };
    ${app('  /* V11 goals: words and sums', '  /* V11 goals: the panels (the end of what tests/ui-goals.test.mjs cuts) */')}
    ({ liveGoal, activeGoals, shownGoals, goalWhenOf, timesWords, goalTimes });`;
  const w = runInNewContext(script, { M, D, __board: st, console });
  assert.equal(w.liveGoal(g), true);
  assert.equal(w.liveGoal(st.goals.find((x) => x.name === 'Old')), false, 'a date gone by is out of play, as before');
  assert.deepEqual(plain(w.activeGoals().map((x) => x.name)), ['Get stronger', 'Guitar', 'Walk']);
  assert.equal(w.goalWhenOf(g), '3 times a week, no end date');
  assert.equal(w.goalWhenOf(two), 'Twice a week, no end date');
  assert.equal(w.goalWhenOf(daily), 'Every day, no end date');
  assert.equal(w.goalWhenOf(st.goals.find((x) => x.name === 'Old')), 'Oct 1, gone by', 'a goal with a date says its date');
  assert.equal(w.goalTimes({ rhythm: { days: [1, 3], wd: 30, we: 0 } }), 2, 'with no n, once on each of its days');
  for (const x of [g, two, daily]) voice(w.goalWhenOf(x), x.name);
});

test('every ink on a pin, a span, and a stage passes: each kind of time’s own ink on its color', () => {
  for (const k of Object.keys(D.CATS)) assert.ok(r.cdRatio(D.CATS[k].ink, D.CATS[k].base) >= 4.5, k);
  assert.equal(r.cdInk('#EFB940'), '#1C1C1E', 'dark words on yellow');
  assert.equal(r.cdInk('#2D6EA6'), '#FFFFFF');
  void copy;
});
