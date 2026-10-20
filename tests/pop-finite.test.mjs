// A board that rises or sinks keeps its numbers. The week board starts shown and has never taken a step of
// its pop, so a hide and then a show before the first step (a boot that opens Today and then the Planner, a
// tab in the background, Dev holding another day in Today) started the show from popK, which no step had
// written yet: the week board rose from a number that isn't one, and the day's blocks flying home to it went
// with it (the watchdog caught them: "a block (2026-10-20|2026-10-20:sleep:am|0) had a number that is not a
// number"). This test cuts the pop code out of board/src/scene.js by the lines that start each part (as
// tests/motion-finite.test.mjs does) and runs it with the real three.js: the week and the day board turned
// around before a step and in flight, any run of hides, shows, and steps, and the net that finishes a board's
// pop when a number that isn't one gets in anyway. When a cut can't find its marker, the test says which one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as THREE from 'three';

const SCENE = readFileSync(new URL('../board/src/scene.js', import.meta.url), 'utf8');
/* from the line that starts with `from` up to (not including) the one that starts with `to` */
function cut(from, to) {
  const a = SCENE.indexOf(from);
  assert.ok(a >= 0, 'board/src/scene.js: lost the marker ' + JSON.stringify(from.trim()));
  const b = SCENE.indexOf(to, a + from.length);
  assert.ok(b > a, 'board/src/scene.js: lost the end marker ' + JSON.stringify(to.trim()) + ' after ' + JSON.stringify(from.trim()));
  return SCENE.slice(a, b);
}
const POPS = () => [
  cut('  const finite3 = ', '  /* everything a block moves by is a number'),
  cut('  function popItems(list, show, origin, onTick) {', '  /* Motion: short rises with a gentle settle'),
  cut('  const easeOutSoft = ', '\n'),
  cut('  function stepPops(dt) {', '  function layoutItems(name) {'),
  cut('  function shown(obj, on, origin, onTick) {', '  /* Week, day, and bench share the desk')
];
const NET = () => cut('  /* (V11-2: the boards the blocks sit on', '  /* == feel: how a block moves ==');

/* the desk around the pop code: the week board as buildWeek leaves it (shown, never popped), the day board
   hidden, the bench, and what the console was told */
function rig(withNet) {
  const errors = [], ticks = [];
  const script = `
    let reduced = false;
    const ONE = new T.Vector3(1, 1, 1);
    const pops = [], kinds = { on: false };
    const week = { group: new T.Group() }, dayb = { group: new T.Group(), blocks: new Map() }, bench = { group: new T.Group() };
    const waveTiles = () => {};
    ${POPS().join('\n')}
    ${withNet ? NET() : ''}
    week.group.userData.shown = true;
    dayb.group.userData.shown = false; dayb.group.visible = false;
    /* how far up a board is: 1 at rest on the desk, 0 sunk into it (stepPops puts it at baseY + (v - 1) * 1.1) */
    const level = (o) => 1 + (o.position.y - (o.userData.baseY || 0)) / 1.1;
    const fin = (o) => [o.position.x, o.position.y, o.position.z, o.scale.x, o.scale.y, o.scale.z].every(Number.isFinite)
      && (o.userData.popK === undefined || Number.isFinite(o.userData.popK));
    ({ week, dayb, bench, pops, repairs, shown, popItems, stepPops, level, fin, setReduced: (v) => { reduced = !!v; },
       watchBoards: typeof watchBoards === 'function' ? watchBoards : null });`;
  const sandbox = { T: THREE, Math, Number, Array, Object, Map, Set, Date, JSON, console: { error: (...a) => errors.push(a.join(' ')), warn: () => {}, log: () => {} } };
  const r = runInNewContext(script, sandbox);
  r.errors = errors; r.ticks = ticks;
  return r;
}
const nums = (o) => JSON.stringify({ y: o.position.y, scale: o.scale.toArray(), popK: o.userData.popK, from: o.userData.pop && o.userData.pop.from });

test('the week board, hidden and shown again before its first step, rises from where it is', () => {
  const r = rig(), g = r.week.group;
  r.shown(g, false);
  r.shown(g, true);
  r.stepPops(1 / 60);
  assert.ok(r.fin(g), 'after the first step: ' + nums(g));
  assert.equal(r.level(g), 1, 'it never sank, so it starts at rest, not sunk: ' + nums(g));
  for (let i = 0; i < 90; i++) { r.stepPops(1 / 60); assert.ok(r.fin(g), 'step ' + (i + 2) + ': ' + nums(g)); }
  assert.equal(g.visible, true);
  assert.equal(g.position.y, 0);
  assert.deepEqual(g.scale.toArray(), [1, 1, 1]);
  assert.equal(g.userData.pop, null);
  assert.equal(g.userData.popK, 1);
  assert.equal(r.pops.length, 0);
});

test('the day board, shown and hidden again before its first step, stays down and ends hidden', () => {
  const r = rig(), g = r.dayb.group;
  r.shown(g, true);
  r.shown(g, false);
  /* (a sink that ends puts the board back at rest, out of sight: it only has to stay down while it's drawn) */
  for (let i = 0; i < 60; i++) { r.stepPops(1 / 60); assert.ok(r.fin(g), 'step ' + (i + 1) + ': ' + nums(g)); assert.ok(!g.visible || r.level(g) <= 1e-9, 'it never rose: ' + nums(g)); }
  assert.equal(g.visible, false);
  assert.equal(g.userData.pop, null);
  assert.equal(g.userData.popK, 0);
});

test('a board turned around carries on from where it is, before a step and in flight', () => {
  /* [board, the steps it takes first, then the way it turns] */
  const cases = [];
  for (const which of ['week', 'dayb']) for (const before of [0, 1, 5, 12, 30]) cases.push([which, before]);
  for (const [which, before] of cases) {
    const r = rig(), g = r[which].group;
    const first = which === 'week' ? false : true;
    /* where a board is to the eye: a board out of sight is sunk, wherever a finished sink left it */
    const seen = () => g.visible ? r.level(g) : 0;
    r.shown(g, first);
    for (let i = 0; i < before; i++) r.stepPops(1 / 60);
    const v0 = seen();
    r.shown(g, !first);
    r.stepPops(1 / 60);
    assert.ok(r.fin(g), which + ' after ' + before + ' steps: ' + nums(g));
    /* a show waits out its delay where it is; a hide moves at most a hair in one step */
    assert.ok(Math.abs(seen() - v0) <= 0.01, which + ' after ' + before + ' steps jumped from ' + v0 + ' to ' + seen());
  }
});

test('any run of hides, shows, and steps keeps a board\'s numbers finite, and it ends where it was last told', () => {
  /* a small seeded generator, so a failure is the same failure every time */
  let seed = 20261020;
  const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const steps = [0, 1 / 240, 1 / 60, 1 / 60, 1 / 30, 0.1];
  for (let run = 0; run < 600; run++) {
    const r = rig(), boards = [r.week.group, r.dayb.group, r.bench.group];
    const want = new Map([[r.week.group, true], [r.dayb.group, false], [r.bench.group, false]]);
    r.setReduced(rand() < 0.2);
    const n = 1 + Math.floor(rand() * 40), log = [];
    for (let i = 0; i < n; i++) {
      const x = rand();
      if (x < 0.45) {
        const g = boards[Math.floor(rand() * boards.length)], on = rand() < 0.5;
        r.shown(g, on); want.set(g, on); log.push((g === r.week.group ? 'week' : g === r.dayb.group ? 'day' : 'bench') + (on ? ' on' : ' off'));
      } else if (x < 0.5) { const v = rand() < 0.5; r.setReduced(v); log.push(v ? 'calm' : 'full'); }
      else { const dt = steps[Math.floor(rand() * steps.length)]; r.stepPops(dt); log.push('step ' + dt.toFixed(3)); }
      boards.forEach((g) => assert.ok(r.fin(g), 'run ' + run + ': ' + log.join(', ') + ': ' + nums(g)));
    }
    for (let i = 0; i < 40; i++) r.stepPops(0.1);
    boards.forEach((g) => {
      assert.ok(r.fin(g), 'run ' + run + ' at rest: ' + log.join(', ') + ': ' + nums(g));
      if (!g.userData.pop && g.userData.popK === undefined) return;
      assert.equal(g.userData.pop, null, 'run ' + run + ': still popping');
      assert.equal(g.visible, want.get(g), 'run ' + run + ': ' + log.join(', '));
      assert.equal(g.position.y, 0);
      assert.equal(g.userData.popK, want.get(g) ? 1 : 0);
      if (want.get(g)) assert.deepEqual(g.scale.toArray(), [1, 1, 1]);
    });
    assert.equal(r.pops.length, 0);
  }
});

test('a board with a number that isn\'t one finishes where it was going, and the desk says so once', () => {
  const r = rig(true), g = r.week.group;
  assert.ok(r.watchBoards, 'board/src/scene.js: watchBoards is missing');
  /* a sink in flight goes wrong: it ends sunk, hidden, at rest */
  r.shown(g, false);
  r.stepPops(1 / 60);
  g.userData.pop.from = NaN;
  r.stepPops(1 / 60);
  assert.ok(!Number.isFinite(g.position.y), 'the test put a number that isn\'t one in');
  r.watchBoards();
  assert.ok(r.fin(g), nums(g));
  assert.equal(g.visible, false);
  assert.equal(g.userData.pop, null);
  assert.equal(g.userData.popK, 0);
  assert.equal(r.repairs.count, 1);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /a board \(week\) had a number that is not a number/);
  r.stepPops(1 / 60);
  assert.equal(r.pops.length, 0, 'the next step lets go of it');
  /* a rise that goes wrong ends shown, on the desk, at its own size, and the desk doesn't say it twice */
  r.shown(g, true);
  r.stepPops(1 / 60);
  g.scale.set(NaN, NaN, NaN);
  r.watchBoards();
  assert.equal(g.visible, true);
  assert.equal(g.position.y, 0);
  assert.deepEqual(g.scale.toArray(), [1, 1, 1]);
  assert.equal(g.userData.popK, 1);
  assert.equal(r.repairs.count, 2);
  assert.equal(r.errors.length, 1);
  /* a board at rest, or popping with good numbers, is left alone */
  r.stepPops(1 / 60);
  r.shown(r.dayb.group, true);
  r.stepPops(1 / 60);
  const before = nums(r.dayb.group);
  r.watchBoards();
  assert.equal(nums(r.dayb.group), before);
  assert.equal(r.repairs.count, 2);
});
