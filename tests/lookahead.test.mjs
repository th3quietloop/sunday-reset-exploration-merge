// V11: Look ahead's rules in the board's model: what to get ready and when, what shows past five
// weeks, and holidays (none assumed, real dates, your own dates kept as yours).
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model, D = globalThis.Data;
const today = '2026-10-14';
const H = (id) => D.HOLIDAYS.find((h) => h.id === id);

test('no holiday is on until someone picks it', () => {
  const st = D.sampleState(today);
  assert.equal(st.settings.holidays, undefined);
  assert.equal(st.events.some((e) => e.holiday), false);
  assert.equal(M.lookAhead(st, today, 32, today, 400).some((x) => x.holiday), false);
});

test('holiday dates are real, and each listed year is there', () => {
  const day = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
  for (const h of D.HOLIDAYS) {
    if (h.md) { assert.match(h.md, /^\d\d-\d\d$/); continue; }
    assert.deepEqual(h.dates.map((d) => d.slice(0, 4)), ['2026', '2027', '2028'], h.id);
  }
  // rules that can be checked by hand: fourth Thursday of November, second Sunday of May, third Sunday of June
  H('thanksgiving').dates.forEach((d) => { assert.equal(day(d), 4); assert.ok(+d.slice(8) >= 22 && +d.slice(8) <= 28); });
  H('mother').dates.forEach((d) => { assert.equal(day(d), 0); assert.ok(+d.slice(8) >= 8 && +d.slice(8) <= 14); });
  H('father').dates.forEach((d) => { assert.equal(day(d), 0); assert.ok(+d.slice(8) >= 15 && +d.slice(8) <= 21); });
  assert.deepEqual(H('easter').dates, ['2026-04-05', '2027-03-28', '2028-04-16']);
  // Jewish holidays are dated the evening they begin
  assert.deepEqual(H('hanukkah').dates, ['2026-12-04', '2027-12-24', '2028-12-12']);
  assert.deepEqual(H('passover').dates, ['2026-04-01', '2027-04-21', '2028-04-10']);
});

test('a birthday asks for a gift three weeks out, with a to-do due three days before', () => {
  const st = D.sampleState(today);
  st.tasks = st.tasks.filter((t) => !/gift/i.test(t.name));
  const jordan = st.events.find((e) => e.name === 'Jordan’s birthday');
  const [r] = M.readyFor(st, jordan, jordan.date, today);
  assert.equal(r.k, 'gift');
  assert.equal(r.start, M.addDays(jordan.date, -21));
  assert.equal(r.due, M.addDays(jordan.date, -3));
  assert.equal(r.when, 'now');
  assert.equal(r.todo, 'Gift for Jordan’s birthday');
});

test('your own birthday asks for nothing', () => {
  assert.deepEqual(M.readyKeys({ kind: 'marker', name: 'Your birthday', icon: 'cake' }), []);
});

test('Christmas shows up when it is time to think about gifts, not before', () => {
  const st = D.sampleState(today);
  st.events.push(...M.holidayEvents(st, H('christmas'), today));
  const at = (d) => M.lookAhead(st, d, 35, d, 400).find((x) => x.name === 'Christmas');
  assert.equal(at('2026-08-01'), undefined);
  const x = at(today);
  assert.ok(x && x.far);
  assert.equal(x.ready[0].k, 'gifts');
  assert.equal(x.ready[0].start, '2026-10-30');
  assert.equal(x.ready[0].when, 'later');
});

test('a to-do made for it, or a skip, is kept per date', () => {
  const st = D.sampleState(today);
  const e = st.events.find((x) => x.name === 'Jordan’s birthday');
  e.prep = { ['gift@' + e.date]: 'skip' };
  assert.equal(M.readyFor(st, e, e.date, today)[0].when, 'skip');
  assert.equal(M.lookAhead(st, today, 32, today).find((x) => x.id === e.id).ready.length, 0);
  st.tasks.push({ id: 'tg', name: 'Gift for Jordan’s birthday', due: '2026-10-18', done: false, steps: [] });
  e.prep = { ['gift@' + e.date]: 'tg' };
  assert.equal(M.readyFor(st, e, e.date, today)[0].when, 'added');
  st.tasks = st.tasks.filter((t) => t.id !== 'tg');
  assert.equal(M.readyFor(st, e, e.date, today)[0].when, 'now');
});

test('booking a trip days away is past asking', () => {
  const e = { id: 't', kind: 'trip', name: 'A visit', date: '2026-10-17', end: '2026-10-19' };
  const st = D.sampleState(today);
  const keys = M.readyFor(st, e, e.date, today).map((r) => r.k + ':' + r.when);
  assert.deepEqual(keys, ['travel:past', 'pack:now']);
});

test('a holiday you already have stays yours, with no second copy', () => {
  const st = D.defaultState(today);
  const xmas = H('christmas');
  assert.deepEqual(M.holidayEvents(st, xmas, today), []);
  assert.deepEqual(M.holidayTwins(st, xmas, today).map((m) => m.id), ['christmas']);
  const tg = M.holidayEvents(st, H('thanksgiving'), today).map((e) => e.date);
  assert.deepEqual(tg, ['2027-11-25', '2028-11-23']);
});

test('a to-do already on the list counts, so Look ahead never offers a second one', () => {
  const st = D.sampleState(today);
  const x = M.lookAhead(st, today, 32, today, 400).find((v) => v.name === 'Jordan’s birthday');
  assert.equal(x.ready[0].when, 'added');
  assert.equal(x.ready[0].task.name, 'Birthday gift for Jordan');
  // a holiday takes a gift to-do that names no other date, and leaves one that does
  const ru = D.defaultState(today), xmas = H('christmas');
  M.holidayTwins(ru, xmas, today).forEach((m) => { m.ready = M.holidayReady(ru, xmas); m.readyFrom = xmas.id; });
  const c = M.lookAhead(ru, today, 32, today, 400).find((v) => v.name === 'Christmas');
  assert.equal(c.ready[0].when, 'added');
  st.events.push(...M.holidayEvents(st, H('diwali'), today));
  assert.equal(M.lookAhead(st, today, 35, today, 400).find((v) => v.name === 'Diwali').ready[0].when, 'now');
});

test('booking travel stops asking four weeks out', () => {
  const st = D.sampleState(today);
  const lake = M.lookAhead(st, today, 32, today, 400).find((v) => v.name === 'Weekend at the lake');
  assert.deepEqual(lake.ready.map((r) => r.k), []);
  const far = { id: 'f', kind: 'trip', name: 'Lisbon', date: '2026-12-01', end: '2026-12-08' };
  assert.equal(M.readyFor(st, far, far.date, today)[0].when, 'now');
});

test('a birthday named for the board’s own person asks for nothing', () => {
  const st = D.sampleState(today);
  assert.deepEqual(M.readyKeys({ kind: 'marker', name: st.profile.name + '’s birthday', icon: 'cake' }, st), []);
  assert.deepEqual(M.readyKeys({ kind: 'marker', name: 'Jordan’s birthday', icon: 'cake' }, st), ['gift']);
});

test('a yearly date added this reset shows once, at its first date', () => {
  const st = D.sampleState(today);
  st.events.push({ id: 'mom', kind: 'marker', name: 'Mom’s birthday', date: '2026-10-20', yearly: true, icon: 'cake' });
  assert.deepEqual(M.lookAhead(st, today, 32, today, 400, ['mom']).filter((x) => x.id === 'mom').map((x) => x.date), ['2026-10-20']);
  // a far one you added stays while the reset keeps it
  st.events.push({ id: 'dent', kind: 'timed', name: 'Dentist', date: '2026-12-14', start: 600, dur: 60, big: true });
  assert.equal(M.lookAhead(st, today, 32, today, 400, ['mom', 'dent']).filter((x) => x.id === 'dent').length, 1);
  assert.equal(M.lookAhead(st, today, 32, today, 400).filter((x) => x.id === 'dent').length, 0);
});

test('your own Christmas that doesn’t repeat keeps this year, and the holiday covers the years after', () => {
  const st = D.sampleState(today);
  st.events.push({ id: 'myx', kind: 'marker', name: 'Christmas', date: '2026-12-25', icon: 'tree' });
  assert.deepEqual(M.holidayEvents(st, H('christmas'), today).map((e) => e.date), ['2027-12-25', '2028-12-25', '2029-12-25']);
});

test('Halloween gets ready for costumes only with kids at home', () => {
  assert.deepEqual(M.holidayReady(D.sampleState(today), H('halloween')).map((r) => r.k), ['costume']);
  assert.deepEqual(M.holidayReady({ profile: { kids: [] } }, H('halloween')).map((r) => r.k), ['plans']);
});
