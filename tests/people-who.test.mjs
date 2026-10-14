// V11: who time with people is with. An idea placed before V11 kept only its id (no group, no person),
// so it was named for the whole partner group: "with Sam and Jamie" once there's a second partner, and
// "with your partner" once there's none. The rule (ideaWith in board/src/app.js): a partner's, a kid's,
// or a date's idea with nobody picked names the one person, or nobody; never two partners at once, and
// never someone the board doesn't have. Family and friends are named as themselves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const ws = M.weekStart(today);
const fri = '2026-10-16';
/* the sample's Friday date night is an idea placed the old way: { type: 'idea', id: 'date-home' } */
const dateNight = (r) => plain(r.peopleWeek(ws)).find((x) => /^Date night at home/.test(x.name));

test('an idea placed before V11 names the one partner', () => {
  const r = appRig(D.sampleState(today), today, 600);
  assert.equal(dateNight(r).name, 'Date night at home with Sam');
});

test('with a second partner it names nobody, instead of both', () => {
  const r = appRig(D.sampleState(today), today, 600);
  r.addPerson('Jamie', 'partner');
  assert.equal(dateNight(r).name, 'Date night at home');
  assert.equal(dateNight(r).when, 'Fri');
});

test('with no partner it never says your partner', () => {
  const st = D.sampleState(today);
  st.profile.partner = '';
  const r = appRig(st, today, 600);
  assert.equal(dateNight(r).name, 'Date night at home');
  st.profile.kids = [];
  assert.doesNotMatch(plain(appRig(st, today, 600).peopleWeek(ws)).map((x) => x.name).join(' / '), /your partner|the kids/);
});

test('a person picked when it was placed is always the one named', () => {
  const st = D.sampleState(today);
  st.profile.people = [{ id: 'jm', name: 'Jamie', group: 'partner' }];
  st.dates[fri].adds.find((a) => a.id === 'sample-date').src = { type: 'idea', id: 'date-home', for: 'partner', who: 'Jamie' };
  assert.equal(dateNight(appRig(st, today, 600)).name, 'Date night at home with Jamie');
});

test('kids, family, and friends', () => {
  const st = D.sampleState(today);
  const put = (id, name, src, start) => st.dates['2026-10-17'].adds.push({ id, name, cat: 'family', icon: 'sun', start, dur: 60, src });
  st.dates['2026-10-17'] = st.dates['2026-10-17'] || {};
  st.dates['2026-10-17'].adds = st.dates['2026-10-17'].adds || [];
  put('i1', 'The park', { type: 'idea', id: 'k-park', for: 'kids' }, 600);
  put('i2', 'Call home', { type: 'idea', id: 'f-call', for: 'family' }, 840);
  put('i3', 'Game night', { type: 'idea', id: 'fr-games', for: 'friends' }, 1140);
  const rows = () => plain(appRig(st, today, 600).peopleWeek(ws)).map((x) => x.name);
  assert.ok(rows().includes('The park with Robin'), 'the only kid');
  assert.ok(rows().includes('Call home with family'));
  assert.ok(rows().includes('Game night with friends'));
  st.profile.kids = [];
  assert.ok(rows().includes('The park'), 'no kids on the board, so nobody named');
});

test('a dinner set from an idea with nobody picked is said as the idea', () => {
  const st = D.sampleState(today);
  st.profile.people = [{ id: 'a', name: 'Ana', group: 'dating' }, { id: 'l', name: 'Lee', group: 'dating' }];
  st.dinners[fri] = { name: 'Dinner with Ana and Lee', cook: 'out', items: [], with: { idea: 'd-dinner', for: 'dating', how: 'out' } };
  const r = appRig(st, today, 600);
  assert.equal(r.dinnerWith(fri).name, 'Dinner out');
  st.dinners[fri].with.who = 'Ana';
  st.dinners[fri].name = 'Dinner with Ana';
  assert.equal(appRig(st, today, 600).dinnerWith(fri).name, 'Dinner with Ana');
});
