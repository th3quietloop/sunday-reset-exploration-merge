// V11: People and Moving. What counts as time with people (withPeople, peopleWeek), adding and
// removing someone (addPerson, removePerson) and what happens to the dinners they were cooking, and
// what counts as moving (movesLike, isMoving, weekMoves, useMove). Cut out of board/src/app.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const ws = M.weekStart(today);
const sample = () => D.sampleState(today);

test('time with people: ideas, anything named for someone, time together, and calls from Block library', () => {
  const r = appRig(sample(), today, 600);
  const yes = [
    { name: 'Evening with Sam', cat: 'us' },
    // Russell's call (Oct 14): the colors of time together and of friends always count, whatever the name
    { name: 'Bedtime stories with Robin', cat: 'us' },
    { name: 'Pick up Sam from the airport', cat: 'friends' },
    // (a routine is said at the start: Catch up with Sam is time with Sam)
    { name: 'Catch up with Sam', cat: 'family' },
    // (school and ready are routines only as routines are said: a school play and getting ready for game night count)
    { name: 'Robin’s school play', cat: 'family' },
    { name: 'Ready for game night with friends', cat: 'family' },
    { name: 'Bananagrams', cat: 'us', src: { type: 'idea', id: 'bananagrams' } },
    { name: 'The park', cat: 'family', src: { type: 'idea', id: 'k-park', for: 'kids' } },
    { name: 'Coffee with a friend', cat: 'family', src: { type: 'block', id: 'coffee-friend' } },
    { name: 'Call a loved one', cat: 'family', src: { type: 'block', id: 'call-loved' } },
    { name: 'Game night', cat: 'family' },
    { name: 'Lunch with Sam', cat: 'work', event: true }
  ];
  const no = [
    { name: 'Drop off Robin', cat: 'family', daycare: true },
    { name: 'Dinner', cat: 'meals', dinner: true },
    { name: 'Standup', cat: 'work', meeting: true },
    { name: 'Free evening', cat: 'yours', free: true },
    { name: 'Call Sam about the car', cat: 'family', src: { type: 'task', id: 'x' } },
    { name: 'Ask Sam', cat: 'family', src: { type: 'step', task: 'x', id: 'y' } },
    { name: 'Get ready', cat: 'family' },
    { name: 'Get Robin ready', cat: 'family' },
    { name: 'Robin to school', cat: 'family' },
    { name: 'School run with Robin', cat: 'family' },
    // a kid's routines are caring for them, mornings and bedtimes alike (Russell's call, Oct 14)
    { name: 'Up with Robin', cat: 'family' },
    { name: 'Bedtime stories with Robin', cat: 'family' },
    { name: 'Bath with Robin', cat: 'family' },
    { name: 'Walk, bath, feed', cat: 'family' },
    { name: 'Piano practice with Robin', cat: 'family' },
    { name: 'Dentist', cat: 'family', event: true },
    { name: 'Robinson report', cat: 'work' },
    { name: 'Sleep', cat: 'sleep', sleep: true }
  ];
  yes.forEach((b) => assert.equal(r.withPeople(b), true, b.name));
  no.forEach((b) => assert.equal(r.withPeople(b), false, b.name));
});

test('a new board gives the blocks for keeping in touch the Friends color; data.js and saved boards keep theirs', () => {
  const ids = ['coffee-friend', 'texts', 'call', 'call-loved'];
  const st = sample();
  // data.js is unchanged: older versions and Russell's own board see Family
  assert.deepEqual(ids.map((id) => st.palette.find((p) => p.id === id).cat), ['family', 'family', 'family', 'family']);
  const r = appRig(st, today, 600);
  const fresh = r.friendsColor(sample());
  assert.deepEqual(ids.map((id) => fresh.palette.find((p) => p.id === id).cat), ['friends', 'friends', 'friends', 'friends']);
  // a block someone recolored keeps their color, and a placed one comes along
  const own = sample();
  own.palette.find((p) => p.id === 'texts').cat = 'us';
  own.dates['2026-10-15'] = { adds: [{ id: 'c1', name: 'Coffee with a friend', cat: 'family', icon: 'cup', start: 600, dur: 60, src: { type: 'block', id: 'coffee-friend' } }] };
  const got = r.friendsColor(own);
  assert.equal(got.palette.find((p) => p.id === 'texts').cat, 'us');
  assert.equal(got.dates['2026-10-15'].adds[0].cat, 'friends');
  // and a block in the Friends color is time with people
  assert.equal(r.withPeople({ name: 'Text friends back', cat: 'friends', src: { type: 'block', id: 'texts' } }), true);
});

test('the week with people is one row per thing with its days, never a count', () => {
  const r = appRig(sample(), today, 600);
  const rows = plain(r.peopleWeek(ws));
  const evening = rows.find((x) => x.name === 'Evening with Sam');
  assert.equal(evening.when, 'Every day');
  const date = rows.find((x) => /^Date night at home/.test(x.name));
  assert.deepEqual([date.name, date.when], ['Date night at home with Sam', 'Fri'], 'an idea says who it’s with');
  assert.ok(!rows.some((x) => /Drop off|Pick up|Dinner|Standup/.test(x.name)));
});

test('a dinner set from an idea is time with people while it’s still that dinner', () => {
  const st = sample();
  st.dinners['2026-10-16'] = { name: 'Dinner out with friends', cook: 'out', items: [], with: { idea: 'fr-dinner', for: 'friends', how: 'out' } };
  const r = appRig(st, today, 600);
  assert.ok(plain(r.peopleWeek(ws)).some((x) => x.name === 'Dinner out with friends' && x.when === 'Fri'));
  // changed to leftovers, it isn't that dinner any more
  r.state.dinners['2026-10-16'] = Object.assign({}, r.state.dinners['2026-10-16'], { cook: 'leftovers' });
  assert.ok(!plain(r.peopleWeek(ws)).some((x) => /Dinner out/.test(x.name)));
});

test('adding someone: the first partner and kids keep their fields, anyone else goes in profile.people', () => {
  const st = sample();
  st.profile.partner = '';
  const r = appRig(st, today, 600);
  assert.equal(r.addPerson('jamie', 'partner'), true);
  assert.equal(r.state.profile.partner, 'Jamie', 'a name typed in lowercase gets its capital');
  r.addPerson('Ana and Leo', 'friends');
  const people = plain(r.state.profile.people);
  assert.deepEqual(people.map((x) => [x.name, x.group]), [['Ana', 'friends'], ['Leo', 'friends']]);
  assert.ok(people.every((x) => typeof x.id === 'string' && x.id), 'each has an id, so two devices can merge them');
  assert.notEqual(people[0].id, people[1].id);
  r.addPerson('Max', 'kids');
  assert.deepEqual(plain(r.state.profile.kids), ['Robin', 'Max']);
  assert.equal(r.toasts.at(-1).text, 'Added Max to Kids.');
  // a name already in the group is turned away, and nothing changes
  const before = JSON.stringify(r.state);
  assert.equal(r.addPerson('ana', 'friends'), false);
  assert.equal(JSON.stringify(r.state), before);
  assert.match(r.toasts.at(-1).text, /^Ana is already in Friends\. Add a last initial/);
  // the same first name in another group is someone else (Ana a friend, Ana your sister)
  assert.equal(r.addPerson('Ana', 'family'), true);
  assert.equal(plain(r.state.profile.people).filter((x) => x.name === 'Ana').length, 2);
});

test('removing someone takes only them, with Undo', () => {
  const st = sample();
  st.profile.people = [{ id: 'a1', name: 'Ana', group: 'friends' }, { id: 'l1', name: 'Leo', group: 'friends' }];
  const r = appRig(st, today, 600);
  r.removePerson('friends', 'Ana');
  assert.deepEqual(plain(r.state.profile.people).map((x) => x.name), ['Leo']);
  assert.equal(r.state.profile.partner, 'Sam');
  assert.equal(r.toasts.at(-1).text, 'Removed Ana.');
  assert.equal(r.toasts.at(-1).act.label, 'Undo');
  r.undo();
  assert.deepEqual(plain(r.state.profile.people).map((x) => x.name), ['Ana', 'Leo']);
  r.removePerson('kids', 'Robin');
  assert.deepEqual(plain(r.state.profile.kids), []);
});

test('the first partner’s dinners stay decided and stop naming them; the next partner steps up', () => {
  const st = sample();
  st.profile.people = [{ id: 'jm', name: 'Jamie', group: 'partner' }];
  const r = appRig(st, today, 600);
  const thu = '2026-10-15';
  assert.equal(r.cookWho(r.state.dinners[thu].cook), 'Sam');
  r.removePerson('partner', 'Sam');
  assert.equal(r.state.profile.partner, 'Jamie');
  assert.deepEqual(plain(r.state.profile.people || []), [], 'Jamie moved to the partner field, not kept twice');
  const dn = r.state.dinners[thu];
  assert.ok(dn.cook && dn.name, 'still decided');
  assert.notEqual(r.cookWho(dn.cook), 'Sam');
  assert.notEqual(r.cookWho(dn.cook), 'Jamie', 'Sam’s dinner never becomes the next partner’s');
  assert.match(r.toasts.at(-1).text, /^Removed Sam\. .*\bSam was cooking\.$/, 'the toast says what happened to the meal');
  assert.doesNotMatch(r.toasts.at(-1).text, /\b1 meals?\b/, 'one meal is said as “the meal”');
});

test('a partner who steps up keeps the dinners they were cooking', () => {
  const st = sample();
  st.profile.people = [{ id: 'jm', name: 'Jamie', group: 'partner' }];
  st.dinners['2026-10-16'] = { name: 'Soup', cook: 'p:jm', items: [] };
  const r = appRig(st, today, 600);
  assert.equal(r.cookWho('p:jm'), 'Jamie');
  r.removePerson('partner', 'Sam');
  assert.equal(r.cookWho(r.state.dinners['2026-10-16'].cook), 'Jamie');
});

test('removing someone who was cooking says so, and their dinners stay decided', () => {
  const st = sample();
  st.profile.people = [{ id: 'gm', name: 'Gran', group: 'family', home: true }];
  st.dinners['2026-10-16'] = { name: 'Stew', cook: 'p:gm', items: [] };
  st.dinners['2026-10-17'] = { name: '', cook: 'p:gm', items: [] };
  const r = appRig(st, today, 600);
  assert.ok(plain(r.cookChoices()).some((c) => c.id === 'p:gm' && c.name === 'Gran'), 'family at home can cook');
  r.removePerson('family', 'Gran');
  ['2026-10-16', '2026-10-17'].forEach((d) => {
    const dn = r.state.dinners[d];
    assert.ok(dn && (dn.name || dn.cook), d + ' still decided');
    assert.notEqual(r.cookWho(dn.cook), 'Gran');
    assert.equal(r.cookName(dn.cook), 'Cooking');
  });
  assert.match(r.toasts.at(-1).text, /^Removed Gran\. .*\b2 (meals|dinners) Gran was cooking\b/, 'the toast says how many');
  // a breakfast or lunch they were cooking is theirs no more either
  const st2 = sample();
  st2.profile.people = [{ id: 'gm', name: 'Gran', group: 'family', home: true }];
  st2.meals = { '2026-10-15': { lunch: { name: 'Soup', cook: 'p:gm' } } };
  const r2 = appRig(st2, today, 600);
  r2.removePerson('family', 'Gran');
  assert.notEqual(r2.cookWho((r2.state.meals['2026-10-15'].lunch || {}).cook), 'Gran');
  assert.equal(r2.state.meals['2026-10-15'].lunch.name, 'Soup');
});

test('only grown ups at home are offered as cooks', () => {
  const st = sample();
  st.profile.people = [{ id: 'f1', name: 'Ana', group: 'friends' }, { id: 'g1', name: 'Gran', group: 'family' }, { id: 'p2', name: 'Jamie', group: 'partner' }];
  const ids = plain(appRig(st, today, 600).cookChoices()).map((c) => c.id);
  assert.deepEqual(ids, ['me', 'kim', 'p:p2'], 'not a friend, not family who live elsewhere, not the kids');
});

test('moving: your own time named for moving, never an errand or someone else’s practice', () => {
  const r = appRig(sample(), today, 600);
  const yes = [{ name: 'Workout', cat: 'yours' }, { name: 'Yoga', cat: 'yours' }, { name: 'Evening walk', cat: 'yours' }, { name: 'Long run', cat: 'yours' }, { name: 'Gym', cat: 'yours' }, { name: 'Something', cat: 'yours', icon: 'runner' }];
  const no = [{ name: 'Run errands', cat: 'yours' }, { name: 'Train to work', cat: 'yours' }, { name: 'Soccer practice', cat: 'family' }, { name: 'Walk the dog to pick up Robin', cat: 'yours' }, { name: 'Reading', cat: 'yours' }, { name: 'Workout', cat: 'family' }];
  yes.forEach((b) => assert.equal(r.movesLike(b), true, b.name));
  no.forEach((b) => assert.equal(r.movesLike(b), false, b.name));
  // on the board: a to-do or an idea named for moving isn't a workout of yours
  assert.equal(r.isMoving({ name: 'Run', cat: 'yours', src: { type: 'task', id: 'x' } }), false);
  assert.equal(r.isMoving({ name: 'A walk or a bike ride', cat: 'family', src: { type: 'idea', id: 'k-walk' } }), false);
  assert.equal(r.isMoving({ name: 'Morning thing', cat: 'yours', src: { type: 'block', id: 'workout' } }), true, 'a Workout from the library counts, renamed');
});

test('the week’s moves: each once a day, its pieces added up', () => {
  const st = sample();
  const r = appRig(st, today, 600);
  assert.deepEqual(plain(r.weekMoves(ws)).map((x) => [x.date, x.name, x.dur]), [['2026-10-13', 'Run', 30], ['2026-10-17', 'Walk', 30]]);
  // a workout across noon is two pieces on the board and one move
  M.placeAdd(r.state, '2026-10-17', { name: 'Workout', cat: 'yours', icon: 'dumbbell', dur: 60, src: { type: 'block', id: 'workout' } }, 11 * 60 + 30);
  const sat = plain(r.weekMoves(ws)).filter((x) => x.date === '2026-10-17' && x.name === 'Workout');
  assert.deepEqual(sat.map((x) => x.dur), [60]);
});

test('Moving is on when the setup leaned toward it or a goal is set, and off when turned off', () => {
  const st = sample();
  assert.equal(appRig(st, today, 600).useMove(), false, 'off by default');
  assert.equal(appRig(st, today, 600, { moves: { focus: ['move'] } }).useMove(), true, 'the setup leaned toward moving more');
  st.settings.move = { n: 3, unit: 'times' };
  assert.equal(appRig(st, today, 600).useMove(), true, 'a goal is set');
  st.settings.move.on = false;
  assert.equal(appRig(st, today, 600, { moves: { focus: ['move'] } }).useMove(), false, 'turned off in Settings');
});
