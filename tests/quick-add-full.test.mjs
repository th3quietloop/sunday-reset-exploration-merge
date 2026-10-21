// V11-2 (Grok's audit of V11): quick add on a full day. "Movie today 8pm 3h" used to say "There's no room at 8 pm,
// and nothing else fits that day" with Pick another time greyed out. Now it says the ask back with what's in the way,
// "Movie, 8 pm, 3 h. Tonight, Party is there until 10:30 pm.", and offers ways on the model works out (Model.roomFor):
// the same hour on the nearest day where nothing moves (Put it on Saturday), the longest it can be that day, half the
// ask at least, at the hour asked first (Make it 2 h tomorrow), and the closest time it fits where nothing moves. At the
// hour asked any soft block makes room, before bed; a time the board picks on its own stays out of work hours, own
// time, and time with people unless it's work or the ask is there already (Model.keptBy). With none, it says so and
// offers a to-do; never a greyed-out choice. And a time that would move a meal out of its usual time asks
// first: "This moves Dinner to 4:45 pm. Move it?". quickPlan, nearestStart, and quickCommit are cut out of
// board/src/app.js whole, with the page's parts as stubs, the way tests/consistency.test.mjs cuts them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D } from './v11-rig.mjs';

const TODAY = '2026-10-20'; // a Tuesday
const NOW = 600;
const plain = (v) => JSON.parse(JSON.stringify(v));
const sp = (s) => String(s).replace(/ /g, ' ');
const BANNED = /[—–]|--|\b(just|really|simply|actually|easily|please)\b/i;

function quickRig(board, today, nowMin) {
  const parts = [
    app('  const cap = (s) =>', '  /* V11: the part of the board for time with people is People'),
    app('  const plural = (n, one, many) =>'),
    app('  /* a date said the way a person would', '  /* V11: anyone grown up at home can cook'),
    app('  function boardTime(date, min) {', '  function timeSpan(date, start, end) {'),
    app('  /* Try a change on a scratch copy of the dates', '  /* == what the board shows =='),
    app('  /* full (V11): the toast after a drop that didn', '  /* what letting go on a whole day will do'),
    app('  function specAdd(spec) {', '  /* Which board is under the pointer'),
    app('  /* == quick add in plain words ==', '  /* A list pasted from Notes'),
    app('  const joinNames = ')
  ];
  const script = `
    const FEEL = true, QUICK_OPTS = undefined;
    let state = __board, today = __today, nowMin = __now;
    const view = { got: {} }, undoStack = [], toasts = [];
    const day = (d) => M.calendarDay(state, d), boardDay = (d) => M.resolveWindow(state, d);
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    const quiet = new Proxy(function () {}, { get: (t, k) => (k === 'layout' ? 'week' : quiet), apply: () => undefined });
    const W = quiet, Snd = quiet;
    const node = () => ({ value: '', hidden: true, style: {}, dataset: {}, appendChild(c) { return c; }, append() {}, setAttribute() {}, addEventListener() {}, focus() {}, classList: { add() {}, toggle() {} } });
    const $ = () => node(), el = () => node();
    const closeSel = () => {}, noteMove = () => {}, landed = () => {}, weekOf = () => [], phoneDay = () => false, render = () => {}, openSel = () => {};
    const inboxId = () => 'inbox', bdFor = () => ({ match: false, steps: [] });
    function toast(text, kind, act) { toasts.push({ text, kind: kind || '', act: act || null }); }
    function undoAct(what) { return { label: 'Undo', what }; }
    const undoSay = (what) => undoAct(what);
    function commit(fn) {
      const snap = JSON.stringify(state);
      const r = fn();
      noteMeal(fn, r);
      if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; }
      undoStack.push(snap);
      return r;
    }
    function undo() { const s = undoStack.pop(); if (s) state = JSON.parse(s); }
    ${parts.join('\n')}
    ({
      get state() { return state; }, toasts, undo, quickPlan, nearestStart, blockedText, mealWords, mealYes, tryOn,
      get mealAsk() { return mealAsk; },
      parse(text) { return M.parseQuick(text, today, state.palette, nowMin); },
      plan(text, also) { quick.p = Object.assign(M.parseQuick(text, today, state.palette, nowMin), also || {}); quick.plan = quickPlan(quick.p); return quick.plan; },
      enter() { return quickCommit(false); },
      pick(o) { quick.plan = o.plan; return quickCommit(false, true); },
      asTodo() { return quickAsTodo(quick.p, quick.plan); }
    });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin, console, assert });
}
/* someone on their own who works 9 to 5, and a party tonight from 7:30 to 10:30 */
function partyNight() {
  const st = D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, TODAY);
  st.events.push({ id: 'party', kind: 'timed', name: 'Party', cat: 'family', icon: 'people', date: TODAY, start: 1170, dur: 180 });
  return st;
}
/* a week with no 8 pm to spare: today is a conference from wake to bed, and every evening after is booked */
function fullWeek() {
  const st = partyNight();
  st.events = [{ id: 'conf', kind: 'timed', name: 'Conference', cat: 'work', icon: 'people', date: TODAY, start: 360, dur: 1020 }];
  for (let k = 1; k <= 7; k++) st.events.push({ id: 'eve' + k, kind: 'timed', name: 'Rehearsal', cat: 'yours', icon: 'star', date: M.addDays(TODAY, k), start: 1140, dur: 240 });
  return st;
}
const quietAt = (st, date, start, dur) => { const c = M.canPlace(st, date, dur, start); return c.ok && !(c.pushes || []).length; };

test('parseQuick reads the ask: a name, today, a time, and a length', () => {
  const p = M.parseQuick('Movie today 8pm 3h', TODAY, [], NOW);
  assert.deepEqual([p.kind, p.name, p.date, p.start, p.dur], ['block', 'Movie', TODAY, 1200, 180]);
  const q = M.parseQuick('Movie tonight 2h', TODAY, [], NOW);
  assert.deepEqual([q.kind, q.date, q.part, q.dur], ['block', TODAY, 'evening', 120]);
});

test('a full evening says the ask back, what’s in the way, and offers real ways on', () => {
  const st = partyNight(), r = quickRig(st, TODAY, NOW);
  const plan = r.plan('Movie today 8pm 3h');
  assert.equal(plan.ok, false);
  // (V11-3, D8: every block it reaches into is named, each with when it ends)
  assert.equal(sp(plan.text), 'Movie, 8 pm, 3 h. Tonight, Party is there until 10:30 pm and Wind down until 11 pm. Saturday at 8 pm is open.');
  // (45 minutes before the party is under half the ask, and 3 pm is in Work hours: neither is offered)
  assert.deepEqual(plain(plan.options.map((o) => [o.id, o.label])), [['day', 'Put it on Saturday']]);
  assert.equal(plan.todo, true, 'with one way on, a to-do is the second');
  const [day] = plan.options;
  assert.deepEqual(plain([day.plan.date, day.plan.start, day.plan.add.dur, day.plan.ok]), ['2026-10-24', 1200, 180, true], 'the same time on the nearest day where it fits');
  assert.ok(quietAt(st, '2026-10-24', 1200, 180), 'and nothing moves there');
  for (const s of [plan.text].concat(plan.options.map((o) => o.label))) assert.doesNotMatch(s, BANNED, s);
  // a tap on a way on places it, and says where
  assert.equal(r.pick(day), true);
  assert.ok(r.state.dates['2026-10-24'].adds.some((a) => a.name === 'Movie' && a.start === 1200 && a.dur === 180));
  assert.match(sp(r.toasts[r.toasts.length - 1].text), /^Movie on Saturday at 8 pm/);
  // Enter takes the first way on: never a dead end
  const r2 = quickRig(partyNight(), TODAY, NOW);
  r2.plan('Movie today 8pm 3h');
  assert.equal(r2.enter(), true);
  assert.ok(r2.state.dates['2026-10-24'].adds.some((a) => a.name === 'Movie'));
});

test('a full evening tomorrow names it the way a person would: tomorrow, never on tomorrow', () => {
  const st = partyNight(), TOMORROW = M.addDays(TODAY, 1);
  st.events.find((e) => e.id === 'party').date = TOMORROW;
  const plan = quickRig(st, TODAY, NOW).plan('Call tomorrow 8pm 1h');
  assert.equal(plan.ok, false);
  assert.match(sp(plan.text), /^Call, 8 pm, 1 h\. Tomorrow, Party is there until 10:30 pm\./);
  assert.deepEqual(plain(plan.options.map((o) => [o.id, sp(o.label)])), [['day', 'Put it on Thursday'], ['shorter', 'Make it 45 min tomorrow at 6:45 pm'], ['near', 'At 5 pm tomorrow']]);
  for (const o of plan.options) assert.doesNotMatch(o.label, /\bon (today|tonight|tomorrow)\b/, o.label);
  // a later night: on Thursday
  const th = partyNight();
  th.events.find((e) => e.id === 'party').date = M.addDays(TODAY, 2);
  const later = quickRig(th, TODAY, NOW).plan('Call Thursday 8pm 1h');
  assert.equal(sp(later.options.find((o) => o.id === 'shorter').label), 'Make it 45 min on Thursday at 6:45 pm');
});

/* the party starts at 8:15 pm instead: an hour and a half is open before it, after dinner */
function lateParty() {
  const st = partyNight();
  Object.assign(st.events.find((e) => e.id === 'party'), { start: 1215, dur: 135 });
  return st;
}
test('a shorter way is half the ask at least: a 3 h movie can be 1 h 30 min, never 45 min', () => {
  const add = { name: 'Movie', cat: 'yours', icon: 'star', dur: 180, src: { type: 'custom' } };
  // 45 minutes before a party at 7:30 is under half of 3 h: no shorter way
  assert.equal(M.roomFor(partyNight(), TODAY, 1200, 180, TODAY, NOW, add).shorter, null);
  assert.equal(quickRig(partyNight(), TODAY, NOW).plan('Movie today 8pm 3h').options.some((o) => o.id === 'shorter'), false);
  // an hour and a half before a party at 8:15 is half: offered
  const plan = quickRig(lateParty(), TODAY, NOW).plan('Movie today 8pm 3h');
  const shorter = plan.options.find((o) => o.id === 'shorter');
  assert.equal(sp(shorter.label), 'Make it 1 h 30 min tonight at 6:45 pm');
  assert.deepEqual(plain([shorter.plan.date, shorter.plan.start, shorter.plan.add.dur, shorter.plan.ok]), [TODAY, 1125, 90, true]);
  assert.ok(quietAt(lateParty(), TODAY, 1125, 90), 'and nothing moves there');
  // half is rounded up to the grid: 1 h 15 min can be 45 min, 1 h 45 min can't (its half is 1 h)
  assert.deepEqual(plain(M.roomFor(partyNight(), TODAY, 1200, 75, TODAY, NOW, add).shorter), { start: 1125, dur: 45 });
  assert.equal(M.roomFor(partyNight(), TODAY, 1200, 105, TODAY, NOW, add).shorter, null);
});

test('the closest time never lands in work hours or the person’s own time, unless it’s work or the ask is there', () => {
  // a movie asked for tonight: 3 pm would fit whole, but it's in Work hours, so it isn't offered
  const plan = quickRig(partyNight(), TODAY, NOW).plan('Movie today 8pm 3h');
  for (const o of plan.options) assert.ok(o.plan.date !== TODAY || o.plan.start >= 1020 || o.plan.start + o.plan.add.dur <= 540, o.label + ' is in Work hours');
  const r = quickRig(partyNight(), TODAY, NOW);
  assert.equal(r.nearestStart(TODAY, 120, 1050, true, false, { cat: 'yours' }), null, 'two hours near 5:30 pm: 4 pm is in Work hours');
  // work may go in Work hours: its kind of time, or a to-do in a work group
  assert.equal(r.nearestStart(TODAY, 120, 1050, true, false, { cat: 'work' }), 960);
  const work = quickRig(partyNight(), TODAY, NOW).plan('Report today 8pm 3h', { cat: 'work' });
  assert.deepEqual(plain(work.options.map((o) => [o.id, sp(o.label)])), [['day', 'Put it on Saturday'], ['near', 'At 3 pm today']]);
  const st = partyNight();
  st.groups.push({ id: 'g-work', name: 'Work' });
  st.tasks.push({ id: 'deck', name: 'Finish the deck', group: 'g-work', icon: 'laptop', cat: 'yours', dur: 60, due: TODAY, repeat: null, done: false, steps: [{ id: 'deck-s1', name: 'Outline', dur: 30, done: false }] });
  assert.equal(M.workThing(st, st.tasks.find((t) => t.id === 'deck')), true, 'a to-do in a work group');
  assert.equal(M.workThing(st, { name: 'Outline', cat: 'yours', dur: 30, src: { type: 'step', task: 'deck', id: 'deck-s1' } }), true, 'a block from one of its steps');
  assert.equal(M.workThing(st, { name: 'Movie', cat: 'yours', src: { type: 'custom' } }), false);
  const workBlock = M.calendarDay(st, TODAY).blocks.find((b) => b.cat === 'work');
  assert.equal(M.keptBy(st, TODAY, 1200, 60, st.tasks.find((t) => t.id === 'deck'))(workBlock), false);
  assert.equal(M.keptBy(st, TODAY, 1200, 60, { cat: 'yours' })(workBlock), true);
  // a call asked for in Work hours already may stay in them: a locked meeting at 2 pm sends it to 3 pm
  const meet = partyNight();
  meet.events.push({ id: 'meet', kind: 'timed', name: 'Meeting', cat: 'work', icon: 'people', date: TODAY, start: 840, dur: 60 });
  const call = quickRig(meet, TODAY, NOW).plan('Call today 2pm 1h');
  assert.deepEqual(plain([call.ok, call.start]), [true, 900]);
  // own time: on Saturday a game from 4 to 6 pm takes 5 pm; 6:45 pm is the free evening, so the closest time is 3 pm
  const sat = '2026-10-24', game = partyNight();
  game.events.push({ id: 'game', kind: 'timed', name: 'Game', cat: 'friends', icon: 'people', date: sat, start: 960, dur: 120 });
  const read = quickRig(game, TODAY, NOW).plan('Read Saturday 5pm 1h');
  const near = read.options.find((o) => o.id === 'near');
  assert.deepEqual(plain([near.plan.date, near.plan.start, sp(near.label)]), [sat, 900, 'At 3 pm on Saturday']);
  for (const o of read.options) assert.ok(o.plan.date !== sat || o.plan.start + o.plan.add.dur <= 1125, o.label + ' is in the free evening');
  // asked for inside the free evening, the free evening is fair: a show from 7:45 pm sends it to 6:45 pm
  const show = partyNight();
  show.events.push({ id: 'show', kind: 'timed', name: 'Show', cat: 'friends', icon: 'people', date: sat, start: 1185, dur: 105 });
  const eve = quickRig(show, TODAY, NOW).plan('Read Saturday 8pm 1h');
  assert.equal(sp(eve.options.find((o) => o.id === 'near').label), 'At 6:45 pm on Saturday');
  // a party that covers tonight's free evening leaves it the free evening: Saturday's is offered for a movie at 8 pm
  assert.equal(M.keptBy(partyNight(), TODAY, 1200, 180, { cat: 'yours' })(M.calendarDay(partyNight(), sat).blocks.find((b) => b.free)), false);
  // time with people: on the sample week a game from 2 to 6 pm on Saturday takes 4 pm, and 6:45 pm is Evening with
  // Sam, so the closest time is noon
  const sample = D.sampleState(TODAY);
  sample.events.push({ id: 'game', kind: 'timed', name: 'Game', cat: 'friends', icon: 'people', date: sat, start: 840, dur: 240 });
  const four = quickRig(sample, TODAY, NOW).plan('Read Saturday 4pm 2h');
  assert.deepEqual(plain(four.options.find((o) => o.id === 'near').plan.start), 720);
  assert.equal(sp(four.options.find((o) => o.id === 'near').label), 'At noon on Saturday');
  const withSam = M.calendarDay(sample, sat).blocks.find((b) => b.name === 'Evening with Sam');
  assert.equal(M.keptBy(sample, sat, 960, 120, { cat: 'yours' })(withSam), true, 'asked for at 4 pm: kept');
  assert.equal(M.keptBy(sample, sat, 1200, 60, { cat: 'yours' })(withSam), false, 'asked for at 8 pm, in it already: open');
});

test('the hour asked for is the person’s: any soft block there makes room, before bed (the sample’s 3 h movie)', () => {
  const WED = M.addDays(TODAY, 1), THU = M.addDays(TODAY, 2);
  // Wednesday: Evening with Sam from 6:45 to 10 pm, Wind down 10 to 10:30, bed at 10:30. Three hours from 8 pm would run
  // past bed, so it isn't carried into the night: the ways on are 2 h at 8 pm, cutting into Evening with Sam, or the
  // whole 3 h from 7 pm
  const st = D.sampleState(TODAY), r = quickRig(st, TODAY, NOW);
  const plan = r.plan('Movie tomorrow 8pm 3h');
  assert.equal(plan.ok, false);
  // (V11-3, D8: what's in the way by name, Evening with Sam too, and what both ways on take time from)
  assert.equal(sp(plan.text), 'Movie, 8 pm, 3 h. Tomorrow, Evening with Sam is there until 10 pm and Wind down until 10:30 pm. Bed is at 10:30 pm. Either way, it takes time from Evening with Sam.');
  assert.equal(plan.todo, false, 'two ways on');
  assert.deepEqual(plain(plan.options.map((o) => [o.id, sp(o.label)])), [['shorter', 'Make it 2 h tomorrow'], ['near', 'At 7 pm tomorrow']]);
  const [shorter, near] = plan.options;
  assert.deepEqual(plain([shorter.plan.date, shorter.plan.start, shorter.plan.add.dur, shorter.plan.ok]), [WED, 1200, 120, true]);
  assert.ok(quietAt(st, WED, 1200, 120), 'nothing moves: it takes the time from Evening with Sam');
  assert.match(sp(shorter.plan.text), /Evening with Sam/);
  assert.deepEqual(plain([near.plan.start, near.plan.add.dur]), [1140, 180]);
  assert.equal(r.pick(shorter), true);
  assert.ok(r.state.dates[WED].adds.some((a) => a.name === 'Movie' && a.start === 1200 && a.dur === 120));
  // two hours at 8 pm fit as asked, Evening with Sam making room
  const two = quickRig(D.sampleState(TODAY), TODAY, NOW).plan('Movie tomorrow 8pm 2h');
  assert.deepEqual(plain([two.ok, two.start, sp(two.text)]), [true, 1200, 'Takes 2 h from Evening with Sam.']);
  // the same hour on another day is the person's too: with a party tomorrow, Thursday at 8 pm, in Evening with Sam
  const party = D.sampleState(TODAY);
  party.events.push({ id: 'party', kind: 'timed', name: 'Party', cat: 'family', icon: 'people', date: WED, start: 1170, dur: 180 });
  const thu = quickRig(party, TODAY, NOW).plan('Movie tomorrow 8pm 2h');
  assert.deepEqual(plain(thu.options.map((o) => [o.id, sp(o.label)]))[0], ['day', 'Put it on Thursday']);
  assert.ok(M.calendarDay(party, THU).blocks.some((b) => b.name === 'Evening with Sam' && b.start <= 1200 && b.start + b.dur >= 1320));
  // asked for at bed or later, V11's late night stays: 11 pm is placed as asked
  const late = quickRig(D.sampleState(TODAY), TODAY, NOW).plan('Gaming tomorrow 11pm 1h');
  assert.deepEqual(plain([late.ok, late.start]), [true, 1380]);
});

test('a week with no room at that time says so, and offers the to-do list', () => {
  const st = fullWeek(), r = quickRig(st, TODAY, NOW);
  const plan = r.plan('Movie today 8pm 3h');
  assert.equal(plan.ok, false);
  assert.deepEqual(plain(plan.options), []);
  assert.equal(plan.todo, true);
  assert.equal(plan.text, 'Movie, 8 pm, 3 h. Tonight, Conference is there until 11 pm. No day this week has 3 h open at 8 pm.');
  assert.equal(r.asTodo(), true);
  const t = r.state.tasks.find((x) => x.name === 'Movie');
  assert.deepEqual(plain([t.group, t.due, t.dur, t.done]), ['inbox', TODAY, 180, false], 'on the to-do list, due today, with its length');
  // Enter does the same
  const r2 = quickRig(fullWeek(), TODAY, NOW);
  r2.plan('Movie today 8pm 3h');
  assert.equal(r2.enter(), true);
  assert.ok(r2.state.tasks.some((x) => x.name === 'Movie'));
});

test('a nudge of an hour or less says so and goes; the way it was', () => {
  const st = partyNight();
  st.events[0] = Object.assign({}, st.events[0], { start: 1260, dur: 90 });
  const r = quickRig(st, TODAY, NOW);
  const plan = r.plan('Call today 8:30pm 1h');
  assert.equal(plan.ok, true);
  assert.equal(plan.start, 1200);
  assert.match(sp(plan.text), /^Party is locked at 8:30 pm, so it goes at 8 pm, the closest time that fits\. /);
});

test('a time that would move a meal out of its usual time asks first, with the time where nothing moves beside it', () => {
  const st = partyNight(), r = quickRig(st, TODAY, NOW);
  const plan = r.plan('Movie today 5:30pm 2h');
  assert.equal(plan.ok, true);
  assert.equal(plan.meals, true);
  assert.equal(plan.text, 'Movie, 5:30 pm, 2 h. This moves Dinner to 4:45 pm. Move it?');
  assert.equal(plan.quiet, null, 'two hours where nothing moves today would be 4 pm, in Work hours: none is offered');
  assert.equal(M.calendarDay(r.state, TODAY).blocks.find((b) => b.dinner).start, 1080, 'nothing has moved yet');
  // another day says which (the phone's Add line shows no date above it)
  assert.equal(sp(quickRig(partyNight(), TODAY, NOW).plan('Movie Thursday 5:30pm 2h').text), 'Movie, Thursday, 5:30 pm, 2 h. This moves Dinner to 4:45 pm. Move it?');
  assert.equal(sp(quickRig(partyNight(), TODAY, NOW).plan('Movie tomorrow 5:30pm 2h').text), 'Movie, tomorrow, 5:30 pm, 2 h. This moves Dinner to 4:45 pm. Move it?');
  // the yes: Move it
  assert.equal(r.enter(), true);
  assert.equal(M.calendarDay(r.state, TODAY).blocks.find((b) => b.dinner).start, 1005);
  assert.equal(sp(r.toasts[r.toasts.length - 1].text), 'Movie today at 5:30 pm. Dinner moves to 4:45 pm');
  r.undo();
  assert.equal(M.calendarDay(r.state, TODAY).blocks.find((b) => b.dinner).start, 1080, 'one Undo puts Dinner back');
  // the other way: the time where nothing moves (tomorrow, with no party, after dinner: At 6:45 pm, nothing moves)
  const TOMORROW = M.addDays(TODAY, 1), r2 = quickRig(partyNight(), TODAY, NOW), p2 = r2.plan('Movie tomorrow 5:30pm 2h');
  assert.equal(p2.quiet, 1125);
  const q = r2.quickPlan(Object.assign({}, r2.parse('Movie tomorrow 5:30pm 2h'), { start: p2.quiet }), p2.start);
  assert.equal(q.ok, true);
  assert.equal(q.meals, undefined);
  assert.ok(quietAt(r2.state, TOMORROW, 1125, 120));
  assert.equal(M.calendarDay(r2.state, TOMORROW).blocks.find((b) => b.dinner).start, 1080);
});

test('anywhere else a meal would move out, the refusal asks the question and its yes moves it, with Undo', () => {
  const st = partyNight(), r = quickRig(st, TODAY, NOW);
  const meal = { name: 'Dinner', key: 'tpl:dinner', fromDate: TODAY, from: 1080, date: TODAY, to: 1005 };
  assert.equal(r.blockedText({ reason: 'meal', meal }, true), 'This moves Dinner to 4:45 pm. Move it?');
  assert.equal(r.blockedText({ reason: 'meal', meal: Object.assign({}, meal, { date: '2026-10-21', to: 30 }) }, 'tap'), 'This moves Dinner to 12:30 am on Wed Oct 21. Move it?');
  // a change tried and refused for a meal is remembered for the question; one that works forgets it
  const add = { name: 'Errands', cat: 'yours', icon: 'star', dur: 120, src: { type: 'custom' } };
  const tr = r.tryOn(() => M.placeAdd(r.state, TODAY, add, 1050), true);
  assert.equal(tr.r.reason, 'meal');
  assert.equal(r.mealAsk.words, 'This moves Dinner to 4:45 pm. Move it?');
  const a = r.mealAsk;
  // (C15) a probe or a preview nobody sees leaves the question be
  r.tryOn(() => M.placeAdd(r.state, TODAY, add, 600));
  assert.equal(r.mealAsk, a, 'a probe leaves it');
  r.tryOn(() => M.placeAdd(r.state, TODAY, add, 600), true);
  assert.equal(r.mealAsk, null);
  // the yes runs the same change with meals allowed, and says what moved
  r.mealYes(a);
  assert.equal(M.calendarDay(r.state, TODAY).blocks.find((b) => b.dinner).start, 1005);
  const t = r.toasts[r.toasts.length - 1];
  assert.equal(sp(t.text), 'Dinner moves to 4:45 pm.');
  assert.equal(t.kind, 'good');
  assert.equal(t.act.label, 'Undo');
  // (C15) a yes once the board changed since asks again, and changes nothing
  const n = r.state.dates[TODAY].adds.length;
  r.mealYes(a);
  assert.equal(r.toasts[r.toasts.length - 1].text, 'The board changed since then. Try it again.');
  assert.equal(r.state.dates[TODAY].adds.length, n);
  // and the page's own toast gives that question its yes (the real toast, cut out with its Feel half as a stub)
  const shown = [];
  const w = runInNewContext(`const FEEL = true; let mealAsk = __ask; const mealYes = (x) => __shown.push(['yes', x.words]); const toastFeel = (text, kind, act) => __shown.push([text, kind, act && act.label]);
    ${app('  function toast(text, kind, act, o) {', '  function saveView() {')} ({ toast });`, { __ask: Object.assign({}, a, { at: Date.now() }), __shown: shown });
  w.toast('This moves Dinner to 4:45 pm. Move it?', 'bad');
  assert.deepEqual(plain(shown[0]), ['This moves Dinner to 4:45 pm. Move it?', 'bad', 'Move it']);
  w.toast('No room there.', 'bad');
  assert.deepEqual(plain(shown[1]), ['No room there.', 'bad', null], 'any other toast is as it was');
});

test('nearestStart: the closest time where nothing moves, then where it fits, never before now today', () => {
  const st = partyNight(), r = quickRig(st, TODAY, NOW);
  assert.equal(r.nearestStart(TODAY, 120, 1050, true, false, { cat: 'work' }), 960, 'two hours of work near 5:30 pm with nothing moving: 4 pm');
  assert.equal(r.nearestStart(TODAY, 120, 1050, true), null, 'anything else stays out of Work hours, and nothing else today has two hours');
  assert.equal(r.nearestStart(TODAY, 60, 1200, true), 1020, 'an hour near 8 pm: 5 pm, after work and before dinner (6:45 to the party is 45 min)');
  assert.ok(r.nearestStart(TODAY, 60, 420) >= 1020, 'today, from now on, and out of Work hours');
  assert.equal(r.nearestStart(TODAY, 45, 1200, true), 1125, '45 min fits at 6:45 pm, before the party');
  assert.equal(r.nearestStart('2026-10-24', 60, 1200, true), 1215, 'on a free Saturday the closest start beside the time asked');
  assert.ok(r.nearestStart(TODAY, 60, 420) >= NOW, 'today, from now on');
  assert.equal(r.nearestStart(TODAY, 900, 720, true), null, 'nothing that long fits today');
});

test('never a dead end: every plan quick add offers can be taken, on any of these boards', () => {
  const asks = ['Movie today 8pm 3h', 'Movie today 5:30pm 2h', 'Gym today 7pm', 'Party prep today 11pm 2h', 'Read tomorrow 6am 4h', 'Walk today 7:30am', 'Long lunch today noon 3h'];
  for (const make of [partyNight, fullWeek, () => D.sampleState(TODAY), () => D.defaultState(TODAY)]) {
    for (const text of asks) {
      const r = quickRig(make(), TODAY, NOW), plan = r.plan(text);
      if (plan.ok) continue;
      assert.ok((plan.options || []).length || plan.todo, text + ': a way on or a to-do: ' + plan.text);
      for (const o of plan.options || []) assert.ok(o.plan && o.plan.ok, text + ': ' + o.label + ' can be taken');
      assert.doesNotMatch(plan.text, BANNED, plan.text);
    }
  }
});
