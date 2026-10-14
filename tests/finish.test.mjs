// V11: the finish (the reset's Your week step). Its plan of the week (finishData in
// variants/corners11/variant.js) counts the way the rest of the reset counts (weekCounts in app.js),
// so the panel, the picture, and the To-dos step never disagree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, finishRig, srOf, plain, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const ws = M.weekStart(today);
const plan = (st, extra) => { const r = appRig(st, today, 600, extra); return { r, f: plain(finishRig(srOf(r)).finishData(ws)) }; };
const add = (st, date, a) => { st.dates[date] = st.dates[date] || {}; (st.dates[date].adds = st.dates[date].adds || []).push(a); };

test('its numbers are the reset’s numbers', () => {
  const st = D.sampleState(today);
  const { r, f } = plan(st);
  const c = r.weekCounts(ws);
  assert.equal(f.need, c.unplaced.length);
  assert.equal(f.late, c.lateTimes.length);
  assert.equal(f.yours, c.yours);
  assert.equal(f.open, true, 'to-dos without a time and nights without a dinner are still open');
  assert.equal(f.grocery, r.grocerySub(M.range(ws, 7)));
});

test('dinners: what’s set, what’s still to pick, and no night that’s already gone with nothing on it', () => {
  const { f } = plan(D.sampleState(today));
  // an open night's word is the shell's to choose; that it's open, and named, is the rule
  assert.deepEqual(f.dinners.map((x) => [x.day, x.state === 'open' ? '' : x.name, x.state]), [
    ['Mon', 'Tacos', 'set'], ['Tue', 'Thai place on Pacific', 'set'], ['Wed', 'Leftovers', 'set'],
    ['Thu', 'Sheet pan chicken', 'set'], ['Fri', '', 'open'], ['Sat', '', 'open']
  ]);
  assert.ok(f.dinners.filter((x) => x.state === 'open').every((x) => x.name && x.name !== 'Not planned'), 'a night still to come is never Not planned');
  assert.equal(f.dinners[2].who, null, 'leftovers is said once, as the dinner');
  // who cooks is said one way (cookTag): this screen says You, the picture and the text say the name
  assert.deepEqual([f.dinners[0].who.t, f.dinners[0].who.name, f.dinners[0].who.say], ['A', 'You cook', 'Alex']);
  assert.deepEqual([f.dinners[3].who.t, f.dinners[3].who.name, f.dinners[3].who.say], ['S', 'Sam cooks', 'Sam']);
});

test('cooks: two letters where two names share one, Anyone for anyone at home, and no tag for one cook', () => {
  const st = D.sampleState(today);
  st.profile.people = [{ id: 'an', name: 'Ana', group: 'family', home: true }];
  st.dinners['2026-10-15'] = { name: 'Stew', cook: 'p:an', items: [] };
  st.dinners['2026-10-16'] = { name: 'Pasta', cook: 'home', items: [] };
  st.dinners['2026-10-17'] = { name: '', cook: 'home', items: [] };
  const { f } = plan(st);
  const by = (d) => f.dinners.find((x) => x.day === d);
  assert.equal(by('Mon').who.t, 'Al', 'Alex, beside Ana');
  assert.equal(by('Thu').who.t, 'An');
  assert.deepEqual([by('Fri').who.t, by('Fri').who.name, by('Fri').who.say], ['Anyone', 'Anyone cooks', 'Anyone']);
  assert.deepEqual([by('Sat').name, by('Sat').who], ['Cooking', null], 'a night with no dish says Cooking, and no tag');
  // as many letters as it takes (Sam and Sara), and two people with one name told apart (Sam, Sam (family))
  const st2 = D.sampleState(today);
  st2.profile.people = [{ id: 'sa', name: 'Sara', group: 'family', home: true }, { id: 's2', name: 'Sam', group: 'family', home: true }];
  st2.dinners['2026-10-15'] = { name: 'Stew', cook: 'p:sa', items: [] };
  st2.dinners['2026-10-16'] = { name: 'Pasta', cook: 'kim', items: [] };
  st2.dinners['2026-10-17'] = { name: 'Soup', cook: 'p:s2', items: [] };
  const f2 = plan(st2).f, by2 = (d) => f2.dinners.find((x) => x.day === d).who.t;
  assert.deepEqual([by2('Thu'), by2('Fri'), by2('Sat')], ['Sar', 'Sam', 'Sam (family)']);
  // no two cooks ever share a tag: one name beginning another, one first name twice, and no name at all
  const tagsFor = (profile, cooks) => {
    const s = D.sampleState(today);
    s.profile = Object.assign({}, s.profile, { kids: [], people: [] }, profile);
    ['2026-10-12', '2026-10-13', '2026-10-15'].forEach((d, i) => { s.dinners[d] = cooks[i] ? { name: 'Dish ' + i, cook: cooks[i], items: [] } : { name: '', cook: '', items: [] }; });
    const g = plan(s).f;
    return cooks.map((c, i) => { const x = g.dinners.find((y) => y.day === ['Mon', 'Tue', 'Thu'][i]); return x.who && [x.who.t, x.who.say]; });
  };
  assert.deepEqual(tagsFor({ name: 'Dan', partner: 'Daniel' }, ['me', 'kim']), [['Dan', 'Dan'], ['Daniel', 'Daniel']]);
  assert.deepEqual(tagsFor({ name: 'Chris', partner: 'Christine' }, ['me', 'kim']), [['Chris', 'Chris'], ['Christine', 'Christine']]);
  assert.deepEqual(tagsFor({ name: 'Alex', partner: 'Sam', people: [{ id: 'sm', name: 'Samantha', group: 'family', home: true }] }, ['kim', 'p:sm']).map((x) => x[0]), ['Sam', 'Samantha']);
  assert.deepEqual(tagsFor({ name: 'Alex', partner: 'Sam', people: [{ id: 'ax', name: 'Alex', group: 'family', home: true }] }, ['me', 'p:ax']), [['You', 'Alex'], ['Alex', 'Alex (family)']]);
  assert.deepEqual(tagsFor({ name: 'Sam', partner: 'Sam' }, ['me', 'kim']), [['You', 'Sam'], ['Sam', 'Sam (partner)']]);
  assert.deepEqual(tagsFor({ name: '', partner: 'Sam' }, ['me', 'kim', 'home']), [['You', 'Me'], ['S', 'Sam'], ['Anyone', 'Anyone']]);
  // one person at home: nothing to tell apart, so no tag (as the meal board and the dinner panel do)
  const solo = D.sampleState(today);
  solo.profile = Object.assign({}, solo.profile, { partner: '', kids: [], people: [] });
  solo.dinners['2026-10-16'] = { name: 'Pasta', cook: 'home', items: [] };
  const g = plan(solo).f;
  assert.ok(g.dinners.every((x) => !x.who || x.who.cls === 'word' && x.who.t !== 'Anyone'), 'no cook tags');
});

test('whoever at home is cooking is named', () => {
  const st = D.sampleState(today);
  st.profile.people = [{ id: 'gm', name: 'Gran', group: 'family', home: true }];
  st.dinners['2026-10-16'] = { name: 'Stew', cook: 'p:gm', items: [] };
  const fri = plan(st).f.dinners.find((x) => x.day === 'Fri');
  assert.equal(fri.state, 'set');
  assert.equal(fri.who && fri.who.name, 'Gran cooks');
});

test('to-dos with a time: planned and on time, each once, and never one that’s still asked about', () => {
  const st = D.sampleState(today);
  st.tasks.push(
    { id: 'books', name: 'Return the library books', due: '2026-10-17', done: false, dur: 30, steps: [] },
    { id: 'late', name: 'Mail the forms', due: '2026-10-15', done: false, dur: 30, steps: [] },
    { id: 'half', name: 'Fix the gate', due: '2026-10-17', done: false, steps: [{ id: 'h1', name: 'Buy a hinge', dur: 30, done: true }, { id: 'h2', name: 'Put it on', dur: 30, done: false }] },
    { id: 'did', name: 'Call the vet', due: '2026-10-13', done: true, dur: 15, steps: [] }
  );
  add(st, '2026-10-16', { id: 'a1', name: 'Return the library books', cat: 'home', icon: 'book', start: 1140, dur: 30, src: { type: 'task', id: 'books' } });
  add(st, '2026-10-16', { id: 'a2', name: 'Mail the forms', cat: 'home', icon: 'box', start: 1200, dur: 30, src: { type: 'task', id: 'late' } });
  add(st, '2026-10-12', { id: 'a3', name: 'Buy a hinge', cat: 'home', icon: 'box', start: 1140, dur: 30, src: { type: 'step', task: 'half', id: 'h1' } });
  add(st, '2026-10-17', { id: 'a4', name: 'Put it on', cat: 'home', icon: 'box', start: 600, dur: 30, src: { type: 'step', task: 'half', id: 'h2' } });
  add(st, '2026-10-13', { id: 'a5', name: 'Call the vet', cat: 'home', icon: 'handset', start: 1140, dur: 15, src: { type: 'task', id: 'did' } });
  const { r, f } = plan(st);
  const ids = f.timed.map((x) => x.id);
  assert.deepEqual(ids.slice().sort(), ['books', 'did', 'half']);
  assert.equal(new Set(ids).size, ids.length, 'each once');
  assert.ok(!ids.includes('late'), 'a time after it’s due is counted as late instead');
  assert.equal(f.late, 1);
  const asked = r.weekCounts(ws).unplaced.concat(r.weekCounts(ws).lateTimes).map((x) => x.task.id);
  assert.ok(ids.every((id) => !asked.includes(id)), 'never on both lists');
  assert.equal(f.timed.find((x) => x.id === 'half').when, 'Sat 10 am', 'the open step’s time, not the done one’s');
  assert.equal(f.timed.find((x) => x.id === 'did').done, true);
  assert.deepEqual(f.timed.map((x) => x.id), ['did', 'books', 'half'], 'in the order they happen');
});

test('time with people is the People step’s list, and goes when People is off', () => {
  const st = D.sampleState(today);
  const { r, f } = plan(st);
  assert.deepEqual(f.together, plain(r.peopleWeek(ws)).map((x) => ({ name: x.name, when: x.when })));
  st.settings.modules = Object.assign({}, st.settings.modules, { people: false });
  assert.deepEqual(plan(st).f.together, []);
});

test('moves show only with Moving on, each kind once with its days', () => {
  const st = D.sampleState(today);
  assert.deepEqual(plan(st).f.moves, []);
  add(st, '2026-10-15', { id: 'r2', name: 'Run', cat: 'yours', icon: 'runner', start: 420, dur: 30, src: { type: 'block', id: 'run' } });
  const on = plan(st, { moves: { focus: ['move'] } });
  assert.deepEqual(on.f.moves, [{ name: 'Run', when: 'Tue, Thu' }, { name: 'Walk', when: 'Sat' }]);
  // a move on the Moving card isn't counted again as time to yourself
  const mvMin = on.r.weekMoves(ws).filter((x) => x.cat === 'yours').reduce((a, x) => a + x.dur, 0);
  assert.ok(mvMin > 0);
  assert.equal(on.f.yours, on.r.weekCounts(ws).yours - mvMin);
  assert.equal(plan(st).f.yours, plan(st).r.weekCounts(ws).yours, 'with Moving off, they count as yours');
});

test('free evenings and time to yourself are counted once', () => {
  const { f } = plan(D.defaultState(today));
  assert.deepEqual(f.evenings, [0], 'Sunday’s free evening');
  assert.equal(f.evFrom, 1125);
  assert.equal(f.more, f.yours - 195, 'the evening isn’t counted again as time to yourself');
});

test('what’s coming is after the week, at most four, and never a to-do', () => {
  const { f } = plan(D.sampleState(today));
  assert.ok(f.coming.length <= 4);
  assert.deepEqual(f.coming.map((x) => x.name), ['Dentist', 'Jordan’s birthday', 'Weekend at the lake']);
});

test('a week with everything decided has nothing open', () => {
  const st = D.sampleState(today);
  st.tasks = [];
  ['2026-10-16', '2026-10-17'].forEach((d) => { st.dinners[d] = { name: 'Pizza', cook: 'out', items: [] }; });
  const { f } = plan(st);
  assert.equal(f.open, false);
  assert.equal(f.need, 0);
  assert.equal(f.dinners.filter((x) => x.state === 'open').length, 0);
});
