/* V11: Today on the phone (docs/PHONE-REDESIGN.md, 8). The gold, ranked (phoneGold, 8.1): one gold at most on the
   first screen, the first rule that applies: the Sunday Reset when it's due in open time, then your next thing in
   open time, then the question with the nearest deadline, then Start in a step's or a session's first ten minutes
   (Done after that, and in your own block's last 15 minutes). Asleep, in a locked block, or in free time, none.
   Cut out of app.js and run with stand-ins that only say what they'd do. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, plain } from './v11-rig.mjs';

/* o: { now (minute), reset (the Sunday Reset's state), offer ({ first, ideas }), early (Done's preview), more,
   focus (a timer on this board), evening (the evening's buttons) } */
function world(o = {}) {
  const calls = [];
  const script = `
    const today = '2026-10-15', nowMin = ${o.now == null ? 975 : o.now}, state = {};
    const view = { got: __o.got || {} };
    const window = { SR: { resetState: () => __o.reset || null }, SR_focusBlock: __o.focus === false ? undefined : (x) => __calls.push(['focus', x.name]), SR_didnt: (b) => __calls.push(['didnt', b.name]), SR_didntStep: () => {} };
    const Snd = { init() {}, pick() {} };
    const keepUnit = (s) => String(s).replace(/(\\d) (h|min)\\b/g, '$1\\u00a0$2');
    const openOffer = () => __o.offer || null, startNextThing = (p) => __calls.push(['start', p.name]), fillWith = (p) => __calls.push(['fill', p.name]), renderToday = () => {};
    const isSession = (b) => !!(b && b.src && b.src.type === 'goal');
    const earlyOf = () => __o.early || { ok: true }, doneLabel = (b) => (b.src && (b.src.type === 'step' || b.src.type === 'goal') ? 'Done' : 'Done early');
    const doneEarly = (b) => __calls.push(['done', b.name]), moreMinutes = (b) => __calls.push(['more', b.name]);
    const sourceDate = () => today, sourceKey = (b) => b.key, sourceMinute = () => nowMin, blockName = (b) => b.name;
    const eveningActs = () => __o.evening || [];
    const who = () => (__o.sample ? { sample: true } : {});
    const addGold = () => !!__o.addGold;
    /* (a block whose to-do carries a list, BIG-MOMENTS C: none here unless o.list gives one) */
    const listTodo = () => __o.list || null, listDone = () => 'Done packing';
    const M = Object.assign(Object.create(__M), { previewExtend: () => ({ ok: __o.more !== false }) });
    ${app('  /* The gold, ranked (docs/PHONE-REDESIGN.md, 8.1)', '  /* the Now card: what you\'re in, big')}
    ({ phoneGold });`;
  return Object.assign(runInNewContext(script, { __o: o, __calls: calls, __M: M }), { calls });
}
/* the buttons, said: gold ones marked */
const said = (g) => plain(g.now.map((x) => (x[3] ? 'GOLD ' : '') + x[0].replace(/ /g, ' ')));
const open = (o) => Object.assign({ kind: 'open', start: 960, end: 1080, left: 105 }, o || {});
const block = (b, o) => Object.assign({ kind: 'block', start: 960, end: 1020, left: 45, block: Object.assign({ key: 'k', name: 'Work', tpl: 't1', fixed: false }, b) }, o || {});
const dinner = [{ kind: 'dinner' }];

test('open time: the Sunday Reset when it’s due leads, then your next thing; Something else when there’s more than one', () => {
  const offer = { first: { name: 'Outline torts essay', dur: 30 }, ideas: [{ name: 'Walk', dur: 30 }], at: 975 };
  const w = world({ reset: { strong: true, label: 'Sunday Reset', run: () => {} }, offer });
  const g = w.phoneGold(open(), []);
  assert.deepEqual(said(g), ['GOLD Start Sunday Reset', 'Start: Outline torts essay, 30 min', 'Something else']);
  assert.equal(g.q, false);
  const next = world({ offer }).phoneGold(open(), dinner);
  assert.deepEqual(said(next), ['GOLD Start: Outline torts essay, 30 min', 'Something else']);
  assert.equal(next.q, false, 'your next thing outranks the question');
  next.now[0][1]();
  const w2 = world({ offer, got: { phPick: 1 } }), g2 = w2.phoneGold(open(), []);
  assert.deepEqual(said(g2), ['GOLD Start: Walk, 30 min', 'Something else'], 'Something else shows the next idea');
  g2.now[0][1]();
  assert.deepEqual(plain(w2.calls), [['fill', 'Walk']], 'a library idea fills the time; your own next thing starts it');
  const none = world().phoneGold(open(), dinner);
  assert.deepEqual([said(none), none.q], [[], true], 'nothing of yours to start: the question holds the gold');
});

test('a step or a session: Start in its first ten minutes, then Done; Didn’t get to it beside it', () => {
  const step = { name: 'Pull the numbers', add: 'a1', tpl: null, src: { type: 'step', task: 't', id: 's' } };
  const w = world({ now: 965 });
  const first = w.phoneGold(block(step, { start: 960 }), []);
  assert.deepEqual(said(first), ['GOLD Start', 'Didn’t get to it']);
  first.now[0][1]();
  assert.deepEqual(plain(w.calls.pop()), ['focus', 'Pull the numbers']);
  assert.deepEqual(said(world({ now: 975 }).phoneGold(block(step, { start: 960 }), [])), ['GOLD Done', 'Didn’t get to it']);
  assert.deepEqual(said(world({ now: 965, focus: false }).phoneGold(block(step, { start: 960 }), [])), ['GOLD Done', 'Didn’t get to it'], 'no timer on this board: Done');
  const withQ = world({ now: 965 }).phoneGold(block(step, { start: 960 }), dinner);
  assert.deepEqual([said(withQ), withQ.q], [['Start', 'Didn’t get to it'], true], 'a question with a deadline outranks Start');
  const session = world({ now: 975 }).phoneGold(block({ name: 'Contracts', add: 'a2', tpl: null, src: { type: 'goal', id: 'g' } }, { start: 960 }), []);
  assert.deepEqual(said(session), ['GOLD Done', 'Didn’t get to it']);
});

test('your own block: Done early and 15 more min stay quiet, until its last 15 minutes; a locked block, free time, and sleep have no gold', () => {
  assert.deepEqual(said(world().phoneGold(block({}, { left: 45 }), [])), ['Done early', '15 more min']);
  assert.deepEqual(said(world().phoneGold(block({}, { left: 12 }), [])), ['GOLD Done early', '15 more min'], 'its last 15 minutes');
  const q = world().phoneGold(block({}, { left: 45 }), dinner);
  assert.equal(q.q, true, 'nothing gold here, so the question has it');
  const locked = world().phoneGold(block({ fixed: true }), dinner);
  assert.deepEqual([said(locked), locked.q], [[], false], 'a locked block: that is the answer');
  assert.equal(world().phoneGold({ kind: 'free', block: { name: 'Free evening' } }, dinner).q, false);
  const night = world({ evening: [{ id: 'tomorrow', label: 'See tomorrow', date: '2026-10-16' }] }).phoneGold({ kind: 'sleep' }, dinner);
  assert.deepEqual([said(night), night.q], [['See tomorrow'], false], 'asleep: See tomorrow, quiet, and no question');
});

test('on the sample week, Set up my week is the one gold: the Now card and the question stay quiet', () => {
  const offer = { first: { name: 'Outline torts essay', dur: 30 }, ideas: [], at: 975 };
  const g = world({ sample: true, offer, reset: { strong: true, label: 'Sunday Reset', run: () => {} } }).phoneGold(open(), dinner);
  assert.deepEqual([said(g), g.q], [['Start Sunday Reset', 'Start: Outline torts essay, 30 min'], false]);
});

test('V11-3: while Add in plain words shows a gold way on, it is the screen\'s one gold: the Now card and the question stay quiet (addGold)', () => {
  const offer = { first: { name: 'Outline torts essay', dur: 30 }, ideas: [], at: 975 };
  const g = world({ addGold: true, offer, reset: { strong: true, label: 'Sunday Reset', run: () => {} } }).phoneGold(open(), dinner);
  assert.deepEqual([said(g), g.q], [['Start Sunday Reset', 'Start: Outline torts essay, 30 min'], false]);
  const step = { name: 'Pull the numbers', add: 'a1', tpl: null, src: { type: 'step', task: 't', id: 's' } };
  assert.deepEqual(said(world({ addGold: true, now: 975 }).phoneGold(block(step, { start: 960 }), [])), ['Done', 'Didn’t get to it']);
});
