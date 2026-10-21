// V11-3, the model and quick add (docs/V11-3-REVIEWS.md): the code review's C1, C2, C6, C7, C10, C16, C24 to C28, C31
// and C33, and the design review's D8 (in tests/quick-add-full.test.mjs). Today is Tuesday, Oct 20, 2026; the boards
// are made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const TODAY = '2026-10-20';
const big = (s, today, o) => M.parseQuick(s, today || TODAY, [], 600, Object.assign({ big: true }, o || {}));
const copy = (v) => JSON.parse(JSON.stringify(v));

/* == C1: a message with a day or a time in it, the person's own verb, and no made up suggestion == */
test('C1: "text Mom about dinner tomorrow 6pm" keeps its day and time, with a text to send', () => {
  const p = big('Text mom about dinner tomorrow 6pm');
  assert.deepEqual([p.kind, p.name, p.date, p.start], ['block', 'Text mom about dinner', '2026-10-21', 1080]);
  assert.deepEqual(p.msg, { to: 'Mom' });
  const q = big('Message the team about the deadline Friday');
  assert.deepEqual([q.kind, q.name, q.due], ['task', 'Message the team about the deadline', '2026-10-23']);
  assert.deepEqual(q.msg, { to: 'the team' }, 'the team keeps its small letters');
  // with nothing about a day in it, still a message, in the person's verb
  const m = big('message Marco about Lisbon');
  assert.deepEqual([m.kind, m.name, m.who], ['message', 'Message Marco about Lisbon', 'Marco']);
  assert.equal(big('text Aunt Lisa about LA').name, 'Text Aunt Lisa about LA');
  assert.equal(big('give grandma a heads-up about the lake').name, 'Give Grandma a heads-up about the lake');
  // a day in it that names a trip on the board stays a message for that trip
  const st = D.defaultState(TODAY);
  st.events.push({ id: 'den', kind: 'trip', name: 'Denver', icon: 'plane', date: '2026-12-03', end: '2026-12-06', leave: 450, back: 1020 });
  assert.equal(big('text Aunt Lisa about Denver Dec 3', TODAY, { state: st }).kind, 'message');
  assert.equal(big('text Aunt Lisa about Denver Dec 3').kind, 'task', 'with no board to look at, a day makes it a to-do');
  // without big nothing changes
  assert.equal(M.parseQuick('Text mom about dinner tomorrow 6pm', TODAY, [], 600).msg, undefined);
});

test('C1: a to-do with a text and no date it belongs to has no suggestion, never a heads-up’s words', () => {
  const st = D.defaultState(TODAY);
  st.tasks.push({ id: 'm1', name: 'Text Mom about dinner', group: 'inbox', icon: 'chat', cat: 'family', dur: 5, due: null, repeat: null, done: false, steps: [], msg: { to: 'Mom' } });
  const m = M.msgFor(st, 'm1', TODAY);
  assert.deepEqual(copy(m), { kind: 'plain', to: 'Mom', text: '', suggested: '', versions: [] });
  st.tasks[st.tasks.length - 1].msg.text = 'Dinner at 6?';
  assert.equal(M.msgFor(st, 'm1', TODAY).text, 'Dinner at 6?');
});

/* == C2, C27, C26: the words for a day in a trip or a move == */
test('C2: a trip or a move reads today, tonight, tomorrow, and next week', () => {
  const t = big('trip to the store tomorrow');
  assert.deepEqual([t.kind, t.name, t.event.date, t.event.end], ['date', 'The Store', '2026-10-21', '2026-10-21']);
  assert.deepEqual([big('trip to the lake today').event.date, big('trip to the lake tonight').event.date], [TODAY, TODAY]);
  const nw = big('trip to Denver next week');
  assert.deepEqual([nw.name, nw.event.date, nw.event.window], ['Denver', null, { from: '2026-10-25', to: '2026-10-31' }]);
  assert.equal(M.isFuzzy(nw.event), true);
  assert.deepEqual(big('move next week').event.window, { from: '2026-10-25', to: '2026-10-31' });
  assert.equal(big('move tomorrow').event.date, '2026-10-21');
});

test('C27: on a Sunday next weekend is the coming Saturday, six days out', () => {
  const SUN = '2026-10-25';
  const r = big('trip to the lake next weekend', SUN);
  assert.deepEqual([r.event.date, r.event.end], ['2026-10-31', '2026-11-01']);
  assert.deepEqual([big('trip to the lake this weekend', SUN).event.date], [SUN]);
  // any other day, as it was: the weekend after this one
  assert.deepEqual([big('trip to the lake next weekend').event.date], ['2026-10-31']);
  assert.deepEqual([big('trip to the lake next weekend', '2026-10-24').event.date], ['2026-10-31']);
});

test('C26: a season with three weeks or less left means the next one; this spring keeps the one under way', () => {
  const LATE = '2027-05-25';
  assert.deepEqual(big('move in spring', LATE).event.window, { from: '2028-03-01', to: '2028-05-31' });
  assert.deepEqual(big('move this spring', LATE).event.window, { from: '2027-03-01', to: '2027-05-31' });
  assert.deepEqual(big('move next spring', LATE).event.window, { from: '2028-03-01', to: '2028-05-31' });
  assert.deepEqual(big('move in spring', '2027-04-10').event.window, { from: '2027-03-01', to: '2027-05-31' }, 'plenty left');
});

/* == C25, C24: trips found for a message, and a fuzzy date's day == */
test('C25: a fuzzy trip whose window is over is past asking', () => {
  const st = D.defaultState(TODAY);
  st.events.push({ id: 'old', kind: 'trip', name: 'Lisbon', icon: 'plane', date: null, end: null, window: { from: '2026-03-01', to: '2026-05-31' } });
  assert.equal(M.tripFor(st, 'Lisbon', TODAY), null);
  st.events.push({ id: 'new', kind: 'trip', name: 'Lisbon', icon: 'plane', date: null, end: null, window: { from: '2026-10-01', to: '2026-12-31' } });
  assert.equal(M.tripFor(st, 'Lisbon', TODAY).event.id, 'new', 'one under way still counts');
});

test('C24: pickDate takes an end only when it is a date on or after the day', () => {
  const st = D.defaultState(TODAY);
  st.events.push({ id: 'jp', kind: 'trip', name: 'Japan', icon: 'plane', date: null, end: null, window: { from: '2027-06-01', to: '2027-08-31' } });
  assert.equal(M.pickDate(st, 'jp', '2027-06-10', 'banana', TODAY).end, '2027-06-10');
  st.events.push({ id: 'jp2', kind: 'trip', name: 'Japan', icon: 'plane', date: null, end: null, window: { from: '2027-06-01', to: '2027-08-31' } });
  assert.equal(M.pickDate(st, 'jp2', '2027-06-10', '2027-06-20', TODAY).end, '2027-06-20');
});

/* == C33, C31: who's going, and the packing list == */
function sampleTrip() {
  const st = D.sampleState(TODAY);
  const e = { id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-18', end: '2026-12-22', leave: 450, back: 1020 };
  e.ready = M.readySuggest(e, st);
  st.events.push(e);
  return { st, e };
}
test('C33: a cover to-do with a step already checked stays when the whole family goes', () => {
  const { st, e } = sampleTrip();
  const r = M.readyFor(st, e, e.date, TODAY).find((x) => x.k === 'cover');
  const t = M.prepTodo(st, e, r, { group: 'inbox', steps: [{ id: 'c1', name: 'Ask Grandma', dur: 5, done: true }, { id: 'c2', name: 'Ask the neighbors', dur: 5, done: false }] });
  assert.equal(M.setGoing(st, 'cal', 'family').removed, null);
  assert.ok(st.tasks.some((x) => x.id === t.id));
});

test('C31: the packing list names each kid at home the way homeKids does', () => {
  const { st, e } = sampleTrip();
  const kids = M.homeKids(st);
  assert.ok(kids.length);
  const names = M.packList(st, e).map((x) => x.name);
  for (const k of kids) assert.ok(names.includes(k + '’s bag'), k);
  assert.equal(names[0], 'Clothes for 5 days');
});

/* == C28, C7, C16: goals == */
const MON = '2026-10-12';
function sam() {
  return D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, MON);
}
function goal(st, o) {
  const g = M.newGoal(Object.assign({ name: 'Learn Spanish', kind: 'skill', date: '2026-12-20', today: MON, parts: [{ name: 'Lessons', min: 3000 }], rhythm: { wd: 60, we: 60, when: 'any', chunk: 60 } }, o || {}));
  st.goals = (st.goals || []).concat([g]);
  return g;
}
test('C28: a goal saved with no start counts its first week from its first session', () => {
  const st = sam(), g = goal(st);
  delete g.start;
  assert.equal(M.goalProgress(st, g.id, TODAY, 600).firstWeek, false, 'no start and no sessions: its first week is over');
  const d = M.addDays(TODAY, -2);
  st.dates[d] = { adds: [{ id: 'a1', name: 'Lessons', cat: 'yours', icon: 'flag', start: 600, dur: 60, src: { type: 'goal', id: g.id, part: g.parts[0].id } }] };
  assert.equal(M.goalProgress(st, g.id, TODAY, 600).firstWeek, true, 'a first session two days ago');
  st.dates[d].adds[0].id = 'a1';
  const old = M.addDays(TODAY, -20);
  st.dates[old] = { adds: [{ id: 'a0', name: 'Lessons', cat: 'yours', icon: 'flag', start: 600, dur: 60, src: { type: 'goal', id: g.id, part: g.parts[0].id } }] };
  assert.equal(M.goalProgress(st, g.id, TODAY, 600).firstWeek, false, 'one three weeks ago');
});

test('C7, C16: a session already in own time stays where it is when the plan runs again; a yes is marked own, never pinned', () => {
  const st = sam(), g = goal(st);
  const tue = '2026-10-27';
  const free = M.calendarDay(st, tue).blocks.find((b) => b.free);
  assert.ok(free, 'Sam has a Free evening');
  // a session a V11 plan placed in the Free evening, before own time was kept for the person: unpinned, no flag
  st.dates[tue] = { adds: [{ id: 'legacy', name: 'Lessons', cat: 'yours', icon: 'flag', start: free.start, dur: 60, src: { type: 'goal', id: g.id, part: g.parts[0].id } }] };
  M.planGoal(st, g.id, TODAY, 600);
  assert.ok(M.goalSessions(st, g.id).some((x) => x.add.id === 'legacy' && x.date === tue && x.add.start === free.start), 'kept, not shortened');
  // a yes: own, not pinned
  const st2 = sam(), g2 = goal(st2, { rhythm: { wd: 120, we: 120, when: 'evening', chunk: 60 } });
  M.planGoal(st2, g2.id, TODAY, 600, { own: true });
  const own = M.goalSessions(st2, g2.id).filter((x) => x.add.own);
  assert.ok(own.length, 'some sessions took own time');
  assert.ok(own.every((x) => !x.add.pinned));
  // a pause takes them off, as it does any session the plan made
  g2.paused = true;
  M.planGoal(st2, g2.id, TODAY, 600);
  assert.equal(M.goalSessions(st2, g2.id).filter((x) => x.add.own && x.date >= TODAY).length, 0);
});

/* == C10: the heads-up question reads only dates that name someone == */
test('C10: headsUpDue gives the same answer with hundreds of imported events on the board', () => {
  const { st, e } = sampleTrip();
  M.addHeadsUp(st, e, 'Aunt Lisa', 'LA');
  const want = M.headsUpDue(st, '2026-11-10');
  assert.ok(want && want.who === 'Aunt Lisa');
  st.calendars = (st.calendars || []).concat([{ id: 'work', name: 'Work', on: true }]);
  for (let k = 0; k < 400; k++) st.events.push({ id: 'ics' + k, cal: 'work', kind: 'timed', name: 'Meeting ' + k, date: M.addDays(TODAY, k % 60), start: 600, dur: 30 });
  assert.deepEqual(copy(M.headsUpDue(st, '2026-11-10')), copy(want));
});

/* == C6: two devices, one to-do or one date == */
test('C6: two devices editing one to-do keep both: a step ticked here, the text written there', () => {
  const base = D.defaultState(TODAY);
  base.tasks.push({ id: 'tx', name: 'Pack', group: 'inbox', icon: 'bag', cat: 'home', dur: 30, due: null, repeat: null, done: false, steps: [{ id: 's1', name: 'Socks', dur: 5, done: false }, { id: 's2', name: 'Shoes', dur: 5, done: false }], list: [{ id: 'l1', name: 'Charger', done: false }, { id: 'l2', name: 'Passport', done: false }], msg: { to: 'Sam' } });
  const mine = copy(base), theirs = copy(base);
  const tm = mine.tasks.find((t) => t.id === 'tx'), tt = theirs.tasks.find((t) => t.id === 'tx');
  tm.steps[0].done = true; tm.steps[0].doneOn = TODAY; tm.list[0].done = true;
  tt.msg.text = 'Can you water the plants?'; tt.steps[1].done = true; tt.list[1].done = true;
  const { doc } = M.mergeBoards(base, mine, theirs);
  const t = doc.tasks.find((x) => x.id === 'tx');
  assert.deepEqual(t.steps.map((s) => s.done), [true, true]);
  assert.equal(t.steps[0].doneOn, TODAY);
  assert.deepEqual(t.list.map((x) => x.done), [true, true]);
  assert.deepEqual(t.msg, { to: 'Sam', text: 'Can you water the plants?' });
  // a true clash: mine wins
  const m2 = copy(base), t2 = copy(base);
  m2.tasks.find((x) => x.id === 'tx').msg.text = 'Mine';
  t2.tasks.find((x) => x.id === 'tx').msg.text = 'Theirs';
  const r = M.mergeBoards(base, m2, t2);
  assert.equal(r.doc.tasks.find((x) => x.id === 'tx').msg.text, 'Mine');
  assert.ok(r.clashes.length);
});

test('C6: a date both devices changed keeps both getting-ready keys, who is going, and both heads-ups', () => {
  const { st: base, e } = sampleTrip();
  base.events.find((x) => x.id === 'cal').prep = {};
  const mine = copy(base), theirs = copy(base);
  const em = mine.events.find((x) => x.id === 'cal'), et = theirs.events.find((x) => x.id === 'cal');
  const rm = M.readyFor(mine, em, em.date, TODAY).find((x) => x.k === 'travel'), a = M.prepTodo(mine, em, rm, { group: 'inbox' });
  M.addHeadsUp(mine, em, 'Aunt Lisa', 'LA');
  const rt = M.readyFor(theirs, et, et.date, TODAY).find((x) => x.k === 'stay'), b = M.prepTodo(theirs, et, rt, { group: 'inbox' });
  M.addHeadsUp(theirs, et, 'Uncle Joe', 'LA');
  M.setGoing(theirs, et, 'us');
  const { doc } = M.mergeBoards(base, mine, theirs);
  const ev = doc.events.find((x) => x.id === 'cal');
  assert.equal(Object.values(ev.prep).filter((v) => v === a.id || v === b.id).length, 2, 'both keys kept');
  assert.ok(doc.tasks.some((t) => t.id === a.id) && doc.tasks.some((t) => t.id === b.id));
  assert.deepEqual(ev.ready.filter((r) => r && r.k === 'headsup').map((r) => r.who).sort(), ['Aunt Lisa', 'Uncle Joe']);
  assert.equal(ev.going, 'us');
  // and Look ahead offers neither again
  const items = M.readyFor(doc, ev, ev.date, TODAY);
  assert.ok(items.find((x) => x.k === 'travel').task && items.find((x) => x.k === 'stay').task);
  void e;
});

test('C6: a step both devices made a to-do for comes back once', () => {
  const { st: base } = sampleTrip();
  const mine = copy(base), theirs = copy(base);
  const em = mine.events.find((x) => x.id === 'cal'), et = theirs.events.find((x) => x.id === 'cal');
  const a = M.prepTodo(mine, em, M.readyFor(mine, em, em.date, TODAY).find((x) => x.k === 'travel'), { group: 'inbox' });
  const b = M.prepTodo(theirs, et, M.readyFor(theirs, et, et.date, TODAY).find((x) => x.k === 'travel'), { group: 'inbox' });
  assert.notEqual(a.id, b.id);
  const { doc } = M.mergeBoards(base, mine, theirs);
  const ev = doc.events.find((x) => x.id === 'cal'), key = Object.keys(ev.prep).find((k) => k.startsWith('travel'));
  assert.equal(ev.prep[key], a.id, 'mine is kept');
  assert.equal(doc.tasks.filter((t) => t.name === a.name).length, 1, 'theirs, held by nothing, goes');
  // steps both devices added by the same name come back once
  const b2 = D.defaultState(TODAY);
  b2.tasks.push({ id: 'room', name: 'Clean the room', group: 'inbox', icon: 'broom', cat: 'home', dur: null, due: null, repeat: null, done: false, steps: [] });
  const m3 = copy(b2), t3 = copy(b2);
  m3.tasks.find((t) => t.id === 'room').steps = [{ id: 'm-a', name: 'Dust', dur: 15, done: false }, { id: 'm-b', name: 'Vacuum', dur: 15, done: false }];
  t3.tasks.find((t) => t.id === 'room').steps = [{ id: 't-a', name: 'Dust', dur: 15, done: false }, { id: 't-b', name: 'Vacuum', dur: 15, done: false }, { id: 't-c', name: 'Windows', dur: 15, done: false }];
  const out = M.mergeBoards(b2, m3, t3).doc.tasks.find((t) => t.id === 'room');
  assert.deepEqual(out.steps.map((s) => s.id), ['m-a', 'm-b', 't-c']);
});
