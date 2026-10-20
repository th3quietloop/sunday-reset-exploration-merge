// V11-2, big moments (docs/BIG-MOMENTS.md, B: quick add): Add reads three more things when it's asked to (parseQuick
// with { big: true }): a move ("move in spring"), a trip ("trip to Denver Dec 3 to 6"), and a message ("text Aunt Lisa
// about LA"), which lands on the trip it's about as a heads-up (tripFor). Anything else reads as it always did, and
// without big nothing changes. Today is Tuesday, Oct 20, 2026, as in the mock; the boards are made up but Russell's.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const TODAY = '2026-10-20';
const big = (s, o) => M.parseQuick(s, TODAY, [], 600, Object.assign({ big: true }, o || {}));
const BANNED = /[—–]|--|\b(just|really|simply|actually|easily|please)\b/i;

test('a move: a season, a month, next month, or a few months is a fuzzy date; a day is a date', () => {
  const spring = big('move in spring');
  assert.equal(spring.kind, 'date');
  assert.equal(spring.name, 'Moving day');
  assert.deepEqual(spring.event, { kind: 'marker', name: 'Moving day', icon: 'house', cat: 'home', date: null, window: { from: '2027-03-01', to: '2027-05-31' } });
  assert.equal(M.isFuzzy(spring.event), true);
  assert.equal(M.windowWords(spring.event.window, TODAY), 'Sometime in spring · Mar to May');
  // a place makes the name, with its capitals
  const austin = big('moving to austin next month');
  assert.deepEqual([austin.name, austin.event.window], ['Moving to Austin', { from: '2026-11-01', to: '2026-11-30' }]);
  assert.equal(big('moving to New York in the spring').name, 'Moving to New York');
  assert.deepEqual(big('we’re moving in a few months').event.window, M.windowFor('few-months', TODAY));
  assert.deepEqual(big('move this month').event.window, M.windowFor('this-month', TODAY));
  assert.deepEqual(big('move in March').event.window, { from: '2027-03-01', to: '2027-03-31' });
  assert.deepEqual(big('move in October').event.window, { from: '2026-10-01', to: '2026-10-31' }, 'this month, by its name');
  assert.deepEqual(big('move next fall').event.window, { from: '2027-09-01', to: '2027-11-30' }, 'next fall is the one after the fall under way');
  // a day: an ordinary date, and the move gets ready the way any move does
  const day = big('move Apr 10th');
  assert.deepEqual([day.event.date, day.event.window], ['2027-04-10', undefined]);
  const st = D.defaultState(TODAY);
  assert.deepEqual(M.readySuggest(spring.event, st), ['pickdate', 'notice', 'movers', 'address', 'packup', 'unpack']);
  assert.deepEqual(M.readySuggest(day.event, st), ['notice', 'movers', 'address', 'packup', 'unpack']);
  // a move needs a when; anything else that starts with move is a to-do, as it always was
  assert.equal(big('move to Austin').kind, 'task');
  assert.deepEqual([big('move the couch tomorrow').kind, big('move the couch tomorrow').name, big('move the couch tomorrow').due], ['task', 'Move the couch', '2026-10-21']);
});

test('a trip: named for the place, with its days, from today on', () => {
  const t = big('trip to Denver Dec 3 to 6');
  assert.equal(t.kind, 'date');
  assert.deepEqual(t.event, { kind: 'trip', name: 'Denver', icon: 'plane', date: '2026-12-03', end: '2026-12-06', leave: 450, back: 1020 });
  for (const s of ['trip to Denver Dec 3 to Dec 6', 'trip to Denver Dec 3-6', 'trip to Denver December 3rd through 6th', 'a trip to Denver from Dec 3 to 6', 'trip to Denver 12/3 to 12/6', 'trip to Denver 12/3-12/6', 'flying to Denver Dec 3 to 6']) {
    assert.deepEqual([big(s).event.date, big(s).event.end, big(s).name], ['2026-12-03', '2026-12-06', 'Denver'], s);
  }
  assert.deepEqual([big('trip to Denver 3/12 to 6/12', { dayFirst: true }).event.date, big('trip to Denver 3/12 to 6/12', { dayFirst: true }).event.end], ['2026-12-03', '2026-12-06'], 'where the day comes first');
  assert.deepEqual([big('trip to Denver Dec 30 to Jan 2').event.date, big('trip to Denver Dec 30 to Jan 2').event.end], ['2026-12-30', '2027-01-02'], 'into the next year');
  assert.deepEqual([big('trip to Denver Oct 2 to 4').event.date, big('trip to Denver Oct 2 to 4').event.end], ['2027-10-02', '2027-10-04'], 'a day gone by this year is next year’s');
  assert.deepEqual([big('trip to Denver Dec 3').event.date, big('trip to Denver Dec 3').event.end], ['2026-12-03', '2026-12-03'], 'one day');
  assert.deepEqual([big('trip to Denver Fri to Sun').event.date, big('trip to Denver Fri to Sun').event.end], ['2026-10-23', '2026-10-25']);
  assert.deepEqual([big('trip to the lake this weekend').event.date, big('trip to the lake this weekend').event.end], ['2026-10-24', '2026-10-25']);
  assert.deepEqual([big('trip to the lake next weekend').event.date, big('trip to the lake next weekend').event.end], ['2026-10-31', '2026-11-01']);
  assert.equal(big('trip to new york Dec 3 to 6').name, 'New York', 'a place typed in small letters gets its capitals');
  assert.equal(big('trip to LA Dec 3 to 6').name, 'LA', 'and keeps the ones it has');
  // a season or a month makes it fuzzy; with no days yet it has neither, and the app asks for them
  const jp = big('trip to Japan this summer');
  assert.deepEqual([jp.event.date, jp.event.end, jp.event.window], [null, null, { from: '2027-06-01', to: '2027-08-31' }]);
  assert.equal(M.isFuzzy(jp.event), true);
  const none = big('trip to Denver');
  assert.deepEqual([none.kind, none.event.date, none.event.window], ['date', null, undefined]);
  assert.equal(M.isFuzzy(none.event), false);
  // a trip gets ready the way any trip does
  assert.deepEqual(M.readySuggest(t.event, D.defaultState(TODAY)), ['travel', 'stay', 'timeoff', 'cover', 'pack', 'unpack', 'groceries']);
});

test('a message: who and what about, and the trip it lands on as a heads-up', () => {
  const m = big('text Aunt Lisa about LA');
  assert.deepEqual([m.kind, m.name, m.who, m.about, m.cat, m.icon], ['message', 'Text Aunt Lisa about LA', 'Aunt Lisa', 'LA', 'family', 'chat']);
  assert.equal(big('text aunt lisa about LA.').who, 'Aunt Lisa');
  assert.deepEqual([big('give Grandma a heads-up about the lake').who, big('give Grandma a heads-up about the lake').about], ['Grandma', 'the lake']);
  assert.equal(big('message Marco about Lisbon').who, 'Marco');
  // the trip it's about: by its name, by a place a heads-up already names, or a name that holds the words
  const st = D.defaultState(TODAY);
  const cal = { id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-18', end: '2026-12-22', leave: 450, back: 1020 };
  cal.ready = M.readySuggest(cal, st);
  st.events.push(cal);
  M.addHeadsUp(st, 'cal', 'Uncle Joe', 'LA');
  const of = (about) => { const r = M.tripFor(st, about, TODAY); return r && [r.event.id, r.place]; };
  assert.deepEqual(of('California'), ['cal', null], 'its own name needs no place');
  assert.deepEqual(of('california'), ['cal', null]);
  assert.deepEqual(of('the California trip'), ['cal', null]);
  assert.deepEqual(of('LA'), ['cal', 'LA'], 'a place a heads-up already names');
  assert.deepEqual(of('la'), ['cal', 'LA'], 'as it was kept');
  assert.equal(of('Denver'), null);
  st.events.push({ id: 'la', kind: 'trip', name: 'Trip to LA', icon: 'plane', date: '2027-02-10', end: '2027-02-12' });
  assert.deepEqual(of('LA'), ['la', null], 'a trip named for it comes first, and its place is in its name (placeOf), so the heads-up keeps none');
  // a trip that's over is past asking; a fuzzy one and a date you travel to count
  st.events.push({ id: 'old', kind: 'trip', name: 'Denver', icon: 'plane', date: '2026-10-01', end: '2026-10-04' });
  assert.equal(of('Denver'), null);
  st.events.push({ id: 'jp', kind: 'trip', name: 'Japan', icon: 'plane', date: null, end: null, window: M.windowFor('summer', TODAY) });
  assert.deepEqual(of('Japan'), ['jp', null]);
  st.events.push({ id: 'w', kind: 'timed', occasion: true, away: true, name: 'Jo’s wedding in Austin', date: '2027-01-16', start: 960, dur: 240, big: true });
  assert.deepEqual(of('Austin'), ['w', null], 'the place in its name');
  st.events.push({ id: 'tg', kind: 'trip', name: 'Denver for Thanksgiving', icon: 'plane', date: '2026-11-25', end: '2026-11-29' });
  assert.deepEqual(of('Denver'), ['tg', null], 'what it is for isn’t the place');
  st.events.push({ id: 'p', kind: 'timed', occasion: true, name: 'Boston party', date: '2027-01-20', start: 960, dur: 240, big: true });
  assert.equal(of('Boston'), null, 'a date in town isn’t a trip');
  // the heads-up it becomes says where the person is
  const hit = M.tripFor(st, 'LA', TODAY);
  M.addHeadsUp(st, hit.event.id, 'Aunt Lisa', hit.place);
  const r = M.readyFor(st, hit.event, hit.event.date, TODAY).find((x) => x.k === 'headsup' && x.who === 'Aunt Lisa');
  const t = M.prepTodo(st, hit.event.id, r, { group: 'inbox' });
  assert.equal(M.msgFor(st, t.id, TODAY).suggested, 'Hey Aunt Lisa! I\'ll be in LA Feb 10 to 12 and would love to see you. Are you around?');
});

test('without big, and for everything else, Add reads a line as it always did', () => {
  for (const s of ['move in spring', 'trip to Denver Dec 3 to 6', 'text Aunt Lisa about LA']) {
    const p = M.parseQuick(s, TODAY, [], 600);
    assert.equal(p.kind, 'task', s);
  }
  for (const s of ['Gym Tue 6pm 45m', 'Dentist Dec 3 at 3pm', 'Call the bank tomorrow', 'Clean out the garage', 'Pack for the trip Friday', 'Text the group chat']) {
    assert.deepEqual(big(s), M.parseQuick(s, TODAY, [], 600), s);
  }
  assert.equal(big(''), null);
  assert.equal(big('   '), null);
});

test('every name and word it makes is in the house voice', () => {
  for (const s of ['move in spring', 'moving to austin next month', 'trip to Denver Dec 3 to 6', 'trip to Japan this summer', 'text Aunt Lisa about LA']) {
    const p = big(s);
    assert.doesNotMatch(p.name, BANNED, s);
    if (p.event && p.event.window) assert.doesNotMatch(M.windowWords(p.event.window, TODAY), BANNED, s);
  }
});
