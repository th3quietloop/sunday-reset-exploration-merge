// V11: an older build opens a V11 board. V10 (v/corners10, the build before this one, on the same site)
// is loaded as it shipped, its own Data and Model, and handed a board with every field V11 added. Its
// migrate has to keep all of them, and it has to read what it can: a dinner cooked by someone at home
// ('p:' and an id) is still a planned dinner, and its groceries count.
// V11 goals (Oct 14) saves version 8 and V10 reads version 7, so V10 now sees a V11 board as one from a
// newer version: its boot opens it read only and never writes over it, and its backup reader refuses
// one (app.js boot and readBackup compare the board's v with Data.VERSION). Each version is its own
// site with its own storage, so the two meet only through a backup file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { D, M } from './v11-rig.mjs';

/* a file that ends in module.exports = api, run on its own the way node would run it */
const load = (p) => { const ctx = { module: { exports: {} }, console }; ctx.globalThis = ctx; runInNewContext(readFileSync(new URL(p, import.meta.url), 'utf8'), ctx); return ctx.module.exports; };
const D10 = load('../v/corners10/src/data.js'), M10 = load('../v/corners10/src/model.js');
const today = '2026-10-14';
const ws = M.weekStart(today);
const copy = (v) => JSON.parse(JSON.stringify(v));

function v11Board() {
  const st = D.sampleState(today);
  st.profile.people = [{ id: 'jm', name: 'Jamie', group: 'partner' }, { id: 'gm', name: 'Gran', group: 'family', home: true }];
  st.profile.partnerId = 'sm';
  st.settings.move = { on: true, n: 3, unit: 'times' };
  st.settings.holidays = ['halloween'];
  st.settings.modules = Object.assign({}, st.settings.modules, { people: true });
  st.dinners['2026-10-17'] = { name: 'Stew', cook: 'p:gm', items: ['chicken'], parts: ['Chicken', 'Carrots'], with: { idea: 'fr-dinner', for: 'friends', how: 'home' } };
  st.ideas.push({ id: 'i-ada', name: 'Pancakes', kind: '', dur: 45, icon: 'person', for: 'kids', who: 'Robin' });
  st.meals = { '2026-10-15': { breakfast: { name: 'Oatmeal', parts: ['Oats', 'Berries'] }, lunch: { name: 'Pizza place', how: 'out' } } };
  st.mealbook = { own: [{ id: 'o1', name: 'Soup', parts: [] }], hide: ['i:cereal'], diet: 'vegetarian', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'], words: [] };
  st.events.push({ id: 'hol-halloween', kind: 'marker', name: 'Halloween', date: '2026-10-31', yearly: true, holiday: 'halloween', ready: [{ k: 'costume', lead: 28, by: 5 }], prep: { 'costume@2026-10-31': 'skip' } });
  st.dates['2026-10-16'].adds.push({ id: 'fr1', name: 'Game night', cat: 'friends', icon: 'tiles', start: 1200, dur: 90, src: { type: 'idea', id: 'fr-games', for: 'friends' } });
  return st;
}

test('V10 reads version 7 and V11 saves 10, so V10 takes a V11 board as newer and leaves it alone', () => {
  assert.equal(D10.VERSION, 7);
  assert.equal(D.VERSION, 10);
  const out = D10.migrate(copy(v11Board()));
  assert.equal(out.v, D.VERSION, 'no step of V10’s migrate touches it');
  assert.notEqual(out.v, D10.VERSION, 'so V10’s boot opens it read only, and its backup reader refuses it');
});

test('V10’s migrate leaves every V11 field as it was, goals included', () => {
  const st = v11Board();
  st.goals = [{ id: 'g1', name: 'Pass the bar exam', kind: 'exam', date: '2027-02-24', start: today, parts: [{ id: 'p1', name: 'Torts', min: 2100, done: false }], rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'any', chunk: 60 }, cat: 'work', icon: 'book', paused: false, archived: false, answers: {} }];
  const before = copy(st);
  const out = D10.migrate(copy(st));
  for (const k of ['profile', 'settings', 'meals', 'mealbook', 'dinners', 'ideas', 'events', 'dates', 'goals']) assert.deepEqual(out[k], before[k], k);
});

test('V10 reads what it can: a dinner someone at home is cooking is planned, and its groceries count', () => {
  const out = D10.migrate(v11Board());
  const sat = M10.calendarDay(out, '2026-10-17');
  const din = sat.blocks.find((b) => b.dinner);
  assert.equal(din.planned, true);
  assert.ok(M10.groceries(out, M10.range(ws, 7)).some((x) => x.id === 'chicken' && x.days.includes('2026-10-17')));
  // a block of a kind V10 doesn't have (friends) still resolves, every day of the week
  assert.doesNotThrow(() => M10.range(ws, 7).forEach((d) => M10.calendarDay(out, d)));
  assert.ok(M10.calendarDay(out, '2026-10-16').blocks.some((b) => b.name === 'Game night'));
});
