// V11-2, two more for big moments (Russell, Oct 20): who's going on a trip, so its suggested texts say we when more
// than the person is going (We'll be in LA, Count us in), and who's covering what the days away leave behind that needs
// a person (READY.cover: the kids' drop-offs and pick-ups, care for someone, a pet), with its own text. Checked on the
// sample family, Russell's week, and Dev's five kids, caregiver, student, and light (someone alone) boards. Today is
// Tuesday, Oct 20, 2026, as in the mock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, plain } from './v11-rig.mjs';

await import('../board/src/model.js');
await import('../board/src/data.js');
await import('../board/src/onboard.js');
await import('../board/src/scenarios.js');
const M = globalThis.Model, D = globalThis.Data, O = globalThis.Onboard, S = globalThis.Scenarios;

const TODAY = '2026-10-20';
const BANNED = /[—–]|--|\b(just|really|simply|actually|easily|please)\b/i;
/* the sample family (Alex, Sam, and Robin, whose drop-off is 8:30 and pick-up 4:45 on weekdays) with a trip */
function sample(trip) {
  const st = D.sampleState(TODAY);
  const e = Object.assign({ id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-18', end: '2026-12-22', leave: 450, back: 1020 }, trip || {});
  e.ready = M.readySuggest(e, st);
  st.events.push(e);
  return { st, e };
}
const item = (st, e, k) => M.readyFor(st, e, e.date, TODAY).find((x) => x.k === k) || null;

test('who’s going: we and us in every text when more than the person is going, I without the field', () => {
  const f = { who: 'Aunt Lisa', place: 'LA', dates: 'Dec 18 to 22' };
  assert.equal(M.suggestText('headsup', f), 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?', 'without it, as today');
  const we = Object.assign({ we: true }, f);
  assert.equal(M.suggestText('headsup', we), 'Hey Aunt Lisa! We\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?');
  assert.equal(M.suggestText('headsup', we, 'warmer'), 'Hi Aunt Lisa! We\'re coming to LA Dec 18 to 22 and it would mean a lot to see you. Any day work for you?');
  assert.equal(M.suggestText('headsup', we, 'shorter'), 'Hey Aunt Lisa! In LA Dec 18 to 22. Free to meet up?');
  const r = { name: 'Jo’s wedding', date: '2027-01-08' };
  assert.equal(M.suggestText('rsvp', r), 'Hi! I\'d love to come to Jo’s wedding on Fri Jan 8. Count me in.'.replace('Fri Jan 8', M.dateText('2027-01-08')));
  assert.equal(M.suggestText('rsvp', Object.assign({ we: true }, r)), 'Hi! We\'d love to come to Jo’s wedding on ' + M.dateText('2027-01-08') + '. Count us in.');
  assert.equal(M.suggestText('rsvp', Object.assign({ we: true }, r), 'shorter'), 'Hi! Count us in for Jo’s wedding on ' + M.dateText('2027-01-08') + '.');
  assert.equal(M.suggestText('rsvp', Object.assign({ we: true }, r), 'warmer'), 'Hi! Thank you for thinking of us. We\'d love to come to Jo’s wedding on ' + M.dateText('2027-01-08') + '. Count us in.');
  // who counts as more than the person: us, the whole family, or a list with someone else in it
  const st = D.sampleState(TODAY);
  const more = (going) => M.goingMore(st, { going });
  assert.deepEqual([more(undefined), more('me'), more('us'), more('family'), more(['Alex']), more(['alex', 'Sam']), more([])], [false, false, true, true, false, true, false]);
});

test('msgFor, its quick versions, and the heads-up the morning asks about all say we once the trip is for more than one', () => {
  const { st, e } = sample();
  M.addHeadsUp(st, e, 'Aunt Lisa', 'LA');
  const t = M.prepTodo(st, e, item(st, e, 'headsup'), { group: 'inbox' });
  assert.equal(M.msgFor(st, t.id, TODAY).text, 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?');
  M.setGoing(st, 'cal', 'us');
  const m = M.msgFor(st, t.id, TODAY);
  assert.equal(m.text, 'Hey Aunt Lisa! We\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?');
  assert.deepEqual(m.versions.map((v) => v.id), ['shorter', 'warmer', 'day']);
  assert.match(m.versions.find((v) => v.id === 'warmer').text, /^Hi Aunt Lisa! We're coming to LA/);
  assert.match(m.versions.find((v) => v.id === 'day').text, /^Hey Aunt Lisa! We'll be in LA Dec 18 to 22\. Could we get together on /);
  // the heads-up asked about in the morning, once its time to ask has come
  const due = M.headsUpDue(st, '2026-11-10');
  assert.equal(due.text, 'Hey Aunt Lisa! We\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?');
  // and the countdown's own text for a step with no to-do yet
  const { st: s2, e: e2 } = sample({ going: 'family' });
  M.addHeadsUp(s2, e2, 'Marco', 'San Diego');
  const cd = M.countdown(s2, { event: 'cal' }, TODAY, 600);
  const hu = [cd.next].concat(cd.rest).find((x) => x && /Marco/.test(x.name));
  assert.equal(hu.msg.text, 'Hey Marco! We\'ll be in San Diego Dec 18 to 22 and would love to see you. Are you around?');
  // a reply for a wedding the two of them go to
  const w = { id: 'wed', kind: 'timed', occasion: true, away: true, name: 'Jo’s wedding', icon: 'people', cat: 'family', date: '2027-01-09', start: 960, dur: 300, big: true, going: 'us' };
  w.ready = M.readySuggest(w, st);
  st.events.push(w);
  const rs = M.prepTodo(st, w, item(st, w, 'rsvp'), { group: 'inbox' });
  assert.equal(M.msgFor(st, rs.id, TODAY).text, 'Hi! We\'d love to come to Jo’s wedding on ' + M.dateText('2027-01-09') + '. Count us in.');
});

test('who’s covering: Robin’s drop-offs and pick-ups on a trip’s weekdays, with its own text', () => {
  const { st, e } = sample();
  assert.deepEqual(e.ready, ['travel', 'stay', 'timeoff', 'cover', 'pack', 'unpack', 'groceries'], 'after time off');
  assert.equal(M.READY.cover.todo, 'Line up who’s covering {what} while you’re away');
  assert.deepEqual([M.READY.cover.lead, M.READY.cover.by, M.READY.cover.msg, M.READY.cover.why], [28, 14, true, 'Someone needs time to say yes']);
  assert.equal(M.readyFits('cover', st), false, 'it comes by itself, never from a panel’s choices');
  const c = item(st, e, 'cover');
  assert.deepEqual([c.todo, c.start, c.ideal, c.when, c.what, c.why], ['Line up who’s covering Robin’s drop-offs and pick-ups while you’re away', '2026-11-20', '2026-12-04', 'later', 'Robin’s drop-offs and pick-ups', 'Someone needs time to say yes']);
  const t = M.prepTodo(st, e, c, { group: 'inbox' });
  assert.deepEqual([t.name, t.msg], [c.todo, { to: '' }]);
  const m = M.msgFor(st, t.id, TODAY);
  assert.equal(m.kind, 'cover');
  assert.equal(m.text, 'Hey! I\'ll be away Dec 18 to 22. Could you cover Robin\'s drop-offs and pick-ups that week?');
  assert.deepEqual(m.versions.map((v) => [v.id, v.text]), [
    ['shorter', 'Hey! Away Dec 18 to 22. Could you cover Robin\'s drop-offs and pick-ups?'],
    ['warmer', 'Hi! I\'ll be away Dec 18 to 22, and it would mean a lot if you could cover Robin\'s drop-offs and pick-ups that week. Would that work?']
  ]);
  M.setGoing(st, 'cal', 'us');
  assert.equal(M.msgFor(st, t.id, TODAY).text, 'Hey! We\'ll be away Dec 18 to 22. Could you cover Robin\'s drop-offs and pick-ups that week?', 'the two of them away, Robin home');
  // a to-do that says Line up who's covering, with no key, still reads as one
  const loose = { id: 'tc', name: 'Line up who’s covering the dog’s walks while you’re away', msg: { to: '' }, steps: [], done: false };
  st.tasks.push(loose);
  assert.equal(M.msgFor(st, 'tc', TODAY).kind, 'cover');
});

test('the days that matter: from leaving to getting back, a day or a week or more, and only the parts on those days', () => {
  // a one-day trip that leaves at 7:30 and is back at 10: the drop-off at 8:30 only
  let { st, e } = sample({ date: '2026-12-18', end: '2026-12-18', leave: 450, back: 600 });
  assert.equal(M.coverOf(st, e).what, 'Robin’s drop-off');
  let t = M.prepTodo(st, e, item(st, e, 'cover'), { group: 'inbox' });
  assert.equal(M.msgFor(st, t.id, TODAY).text, 'Hey! I\'ll be away on ' + M.dateText('2026-12-18') + '. Could you cover Robin\'s drop-off that day?');
  // leaving after the pick-up and back the next evening: the next day's drop-off and pick-up
  ({ st, e } = sample({ date: '2026-12-17', end: '2026-12-18', leave: 1080, back: 1200 }));
  assert.equal(M.coverOf(st, e).what, 'Robin’s drop-off and pick-up');
  // a weekend away from weekday routines leaves nothing behind, so it's never offered
  ({ st, e } = sample({ date: '2026-12-19', end: '2026-12-20' }));
  assert.equal(M.coverOf(st, e), null);
  assert.equal(e.ready.includes('cover'), false);
  assert.equal(item(st, e, 'cover'), null);
  // two weeks away: while I'm away
  ({ st, e } = sample({ date: '2026-12-07', end: '2026-12-20' }));
  t = M.prepTodo(st, e, item(st, e, 'cover'), { group: 'inbox' });
  assert.equal(M.msgFor(st, t.id, TODAY).text, 'Hey! I\'ll be away Dec 7 to 20. Could you cover Robin\'s drop-offs and pick-ups while I\'m away?');
  // a date you travel to: its whole day (a wedding out of town on a Friday)
  const w = { id: 'wed', kind: 'timed', occasion: true, away: true, name: 'Jo’s wedding', icon: 'people', cat: 'family', date: '2027-01-08', start: 960, dur: 300, big: true };
  assert.equal(M.coverOf(st, w).what, 'Robin’s drop-off and pick-up');
  assert.ok(M.readySuggest(w, st).includes('cover'));
  // a date in town never asks
  assert.equal(M.coverOf(st, Object.assign({}, w, { away: false })), null);
});

test('the kids going too takes their part off; setGoing adds and takes off who’s covering in the same change', () => {
  const { st, e } = sample();
  assert.equal(M.coverOf(st, Object.assign({}, e, { going: 'family' })), null, 'the whole family going');
  assert.equal(M.coverOf(st, Object.assign({}, e, { going: ['Alex', 'Robin'] })), null, 'Robin by name');
  assert.equal(M.coverOf(st, Object.assign({}, e, { going: 'us' })).what, 'Robin’s drop-offs and pick-ups', 'the two of them, Robin home');
  // a cover to-do nobody has touched goes when the whole family is going, and comes back when it isn't
  const t = M.prepTodo(st, e, item(st, e, 'cover'), { group: 'inbox' });
  const r1 = M.setGoing(st, 'cal', 'family');
  assert.deepEqual(r1, { going: 'family', cover: false, removed: t.id });
  assert.equal(st.tasks.some((x) => x.id === t.id), false);
  assert.equal(Object.keys(e.prep || {}).some((k) => k.startsWith('cover')), false);
  assert.equal(item(st, e, 'cover'), null, 'nothing to cover, nothing asked');
  assert.deepEqual(M.setGoing(st, 'cal', 'me'), { going: 'me', cover: true, removed: null });
  assert.ok(item(st, e, 'cover'));
  // one that was started (its text edited) stays
  const t2 = M.prepTodo(st, e, item(st, e, 'cover'), { group: 'inbox' });
  t2.msg.text = 'Could you take Robin to school Dec 18?';
  assert.equal(M.setGoing(st, 'cal', 'family').removed, null);
  assert.ok(st.tasks.some((x) => x.id === t2.id));
  assert.equal(item(st, e, 'cover').task.id, t2.id, 'and still shows, as the to-do it is');
  // a trip made with the whole family going, then changed: who's covering joins its list
  const { st: s3, e: e3 } = sample({ going: 'family' });
  assert.equal(e3.ready.includes('cover'), false);
  M.setGoing(s3, 'cal', 'us');
  assert.ok(e3.ready.includes('cover'));
  M.setGoing(s3, 'cal', null);
  assert.equal('going' in e3, false, 'null takes it off');
});

test('a fuzzy trip lines up who’s covering once it has its days', () => {
  const st = D.sampleState(TODAY);
  const e = { id: 'jp', kind: 'trip', name: 'Japan', icon: 'plane', date: null, end: null, window: M.windowFor('spring', TODAY), leave: 450, back: 1020 };
  e.ready = M.readySuggest(e, st);
  st.events.push(e);
  assert.equal(e.ready.includes('cover'), false, 'no days yet, nothing to know');
  M.pickDate(st, 'jp', '2027-04-05', '2027-04-09', TODAY);
  assert.ok(e.ready.some((r) => r.k === 'cover'));
  assert.equal(M.coverOf(st, e).what, 'Robin’s drop-offs and pick-ups');
});

test('the Dev boards: five kids, a caregiver, a student, and someone alone', () => {
  const build = (id) => S.build(id, D, M, TODAY, O);
  const away = (st, extra) => Object.assign({ id: 'x', kind: 'trip', name: 'Denver', icon: 'plane', date: M.addDays(TODAY, 36), end: M.addDays(TODAY, 39), leave: 540, back: 1080 }, extra || {});
  // five kids on four schedules: the kids' drop-offs and pick-ups
  const k5 = build('kids5');
  assert.equal(M.coverOf(k5, away(k5)).what, 'the kids’ drop-offs and pick-ups');
  assert.equal(M.coverOf(k5, away(k5, { going: 'family' })), null);
  // the caregiver: her dad's physical therapy falls while she's away, and the to-do she already has for it counts
  const cg = build('caregiver'), trip = cg.events.find((e) => e.kind === 'trip');
  assert.match(M.coverOf(cg, trip).what, /^Dad’s appointment( and groceries)?$/);
  const c = item(cg, trip, 'cover');
  assert.equal(c.when, 'added');
  assert.equal(c.task.name, 'Find someone to check on Dad while I’m away');
  // a student and someone alone, with no one to look after: never offered
  for (const id of ['student', 'light']) {
    const st = build(id), e = away(st);
    assert.equal(M.coverOf(st, e), null, id);
    assert.equal(M.readySuggest(e, st).includes('cover'), false, id);
    assert.equal(M.homeKids(st).length + (st.profile.partner ? 1 : 0), 0, id + ' is a board of one');
  }
  // someone alone with a dog to walk: the dog still needs a person
  const solo = build('light');
  const wd = solo.rhythm.days[M.weekday(M.addDays(TODAY, 37))];
  wd.blocks.push({ id: 'dog', name: 'Walk the dog', cat: 'home', icon: 'shoe', start: 1080, dur: 30 });
  assert.equal(M.coverOf(solo, away(solo)).what, 'the dog’s walks');
});

test('care is care: an appointment, groceries, meds, or a visit to look after someone, never any date that names them', () => {
  const st = D.sampleState(TODAY);
  const on = (name, n) => st.events.push({ id: 'ev' + n, kind: 'timed', name, cat: 'family', icon: 'star', date: '2026-12-21', start: 600 + n * 60, dur: 30, big: false });
  const e = { id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-19', end: '2026-12-20', leave: 450, back: 1020 };
  on('Mom’s birthday lunch', 0);
  on('Dinner with Dad', 1);
  e.end = '2026-12-21';
  assert.equal(M.coverOf(st, e).what, 'Robin’s drop-off and pick-up', 'a birthday and a dinner aren’t care');
  on('Mom’s dentist', 2);
  on('Check on Grandpa', 3);
  assert.equal(M.coverOf(st, e).what, 'Robin’s drop-off and pick-up, Mom’s appointment, and Grandpa’s care');
  for (const w of [M.coverOf(st, e).what, M.READY.cover.todo, M.READY.cover.why]) assert.doesNotMatch(w, BANNED, w);
});

/* the question itself, cut out of board/src/app.js: who's asked, and the tiles they see */
function goingRig(st) {
  return runInNewContext(`
    const FEEL = true;
    const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
    const partner = () => (state.profile && state.profile.partner) || '';
    ${app('  const andList = (n) =>')}
    ${app('  const asksGoing = (e) =>', '  function goingPanel(p, sel) {')}
    ({ asksGoing, goingTiles });`, { M, state: st });
}
const tiles = (st) => plain(goingRig(st).goingTiles()).map((x) => [x.id, x.name, x.line]);

test('Who’s going asks with tiles that fit the household, and never on a board of one', () => {
  const st = D.sampleState(TODAY), trip = { kind: 'trip', name: 'California' };
  const g = goingRig(st);
  assert.equal(g.asksGoing(trip), true);
  assert.equal(g.asksGoing({ kind: 'timed', occasion: true, away: true, name: 'Jo’s wedding' }), true, 'a date you travel to');
  assert.equal(g.asksGoing({ kind: 'timed', occasion: true, name: 'Jo’s wedding' }), false, 'a date in town');
  assert.deepEqual(tiles(st), [['me', 'Only me', 'Sam and Robin stay home'], ['us', 'Me and Sam', 'Robin stays home'], ['family', 'The whole family', 'With Sam and Robin']]);
  const k5 = S.build('kids5', D, M, TODAY, O);
  assert.deepEqual(tiles(k5), [['me', 'Only me', 'Rowan and the kids stay home'], ['us', 'Me and Rowan', 'The kids stay home'], ['family', 'The whole family', 'With Rowan and the kids']]);
  // a parent on their own, and a couple with no kids
  const solo = D.sampleState(TODAY);
  solo.profile.partner = '';
  assert.deepEqual(tiles(solo), [['me', 'Only me', 'Robin stays home'], ['family', 'The whole family', 'With Robin']]);
  const two = D.sampleState(TODAY);
  two.profile.kids = [];
  assert.deepEqual(tiles(two), [['me', 'Only me', 'Sam stays home'], ['us', 'Me and Sam', 'The two of you']]);
  // a board of one is never asked: the caregiver, the student, and someone on their own
  for (const id of ['caregiver', 'student', 'light']) assert.equal(goingRig(S.build(id, D, M, TODAY, O)).asksGoing(trip), false, id);
  for (const t of tiles(st).concat(tiles(k5))) for (const w of t.slice(1)) assert.doesNotMatch(w, BANNED, w);
});
