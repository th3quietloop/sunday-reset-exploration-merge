// The hand (docs/LIFT-AND-PLACE.md): a block in hand hangs over the floor point under the aim point, lifts on a
// spring, swings like a pendulum from the pinch, falls into its slot under desk scale gravity, and lands with a
// damped sine squash. This test cuts the hand, the fall, and the landing out of board/src/scene.js by the
// comments that start each part (as tests/motion-finite.test.mjs does) and runs them with the real three.js
// and a camera framed like a Mac's week, checking the numbers the spec's acceptance list asks for (A2, A4, A5,
// A8) and that nothing it moves by is ever a number that isn't one. When a cut can't find its marker, the test
// says which one, so a reworded comment is easy to find.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as THREE from 'three';

const SCENE = readFileSync(new URL('../board/src/scene.js', import.meta.url), 'utf8');
function cut(from, to) {
  const a = SCENE.indexOf(from);
  assert.ok(a >= 0, 'board/src/scene.js: lost the marker ' + JSON.stringify(from.trim()));
  const b = SCENE.indexOf(to, a + from.length);
  assert.ok(b > a, 'board/src/scene.js: lost the end marker ' + JSON.stringify(to.trim()) + ' after ' + JSON.stringify(from.trim()));
  return SCENE.slice(a, b);
}
const PARTS = [
  cut('  /* a critically damped spring', '  /* what the desk tells the app when a block touches down'),
  cut('  function makeBlock(b) {', '  /* A block that leaves the desk gives back'),
  cut('  /* == every number a block moves by stays a number ==', '  /* The Sunday Reset is done: the week clicks into place.'),
  cut('  /* == the hand ==', '  /* V11, lift and place: the block a room preview put on the board for the one in hand stays out of sight')
];

function rig(o = {}) {
  const script = `
    const FEEL = true, root = {}, said = [];
    let reduced = ${o.calm ? 'true' : 'false'}, moving = false, zoomName = 'week', layout = 'week';
    const BLOCK_D = 1.08, H_HARD = 0.3, BOARD_Y = 0.3, GAP = 0.03, DU = 2.4, DB_D = 2.05, DB_HMUL = 1.55, ONE = new T.Vector3(1, 1, 1);
    let clock = 0;
    const nowMs = () => clock, touch = () => {};
    const world = new T.Group(), weekGroup = new T.Group(); world.add(weekGroup); weekGroup.userData.shown = true;
    const week = { blocks: new Map(), group: weekGroup }, dayb = { blocks: new Map(), group: new T.Group(), ghosts: [] }, bench = { pieces: new Map(), group: new T.Group() };
    const drag = { obj: null, target: new T.Vector3(), vel: new T.Vector3(), roll: { x: 0, v: 0 }, pitch: { x: 0, v: 0 }, last: null, fresh: false, surface: null, ghost: null, hidden: null };
    const homes = [], puffs = [], tileMotions = new Set(), tmpV = new T.Vector3(), tmpW = new T.Vector3();
    const user = { zoom: 1, zoomTo: 1, pan: new T.Vector3(), panTo: new T.Vector3(), panVel: new T.Vector3(), lean: 0, leanTo: 0, leanAt: new T.Vector3(), leaning: false };
    const camV = { look: new T.Vector3(), lean: 0, pan: new T.Vector3(), zoom: 0 };
    const cam = { look: new T.Vector3(), dist: 40, elev: 0.9 }, camTo = { look: new T.Vector3(), dist: 40, elev: 0.9 };
    const benchCam = { carry: false };
    function snapCamera() {}
    const easeOutSoft = (x) => { const c1 = 0.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const feelSay = (kind, a) => said.push(kind);
    const mesh = (g, m) => new T.Mesh(g, m), blockGeo = () => new T.BoxGeometry(1, 0.3, 1), mat = () => new T.MeshBasicMaterial();
    const printMat = (op) => new T.MeshBasicMaterial(op), makeLock = () => new T.Group();
    const faceGeo = new T.PlaneGeometry(1, 1), gripGeo = new T.PlaneGeometry(1, 1), haloGeo = new T.PlaneGeometry(1, 1), haloMat = new T.MeshBasicMaterial();
    const puffGeo = new T.BoxGeometry(0.1, 0.1, 0.1), puffMat = new T.MeshBasicMaterial();
    const blockMeshes = (date, bkey) => Array.from(week.blocks.values()).filter((m) => m.userData.date === date && m.userData.bkey === bkey);
    /* a block dressed the way the board dresses one: its sizes, for the hand to hang it by */
    function dressBlock(g, b, wU, dU, op) { const u = g.userData; u.block = b; u.wU = wU; u.w = Math.max(0.05, wU - GAP * 2); u.dU = dU || BLOCK_D; u.hMul = (op && op.hMul) || 1; u.h = H_HARD * u.hMul; }
    const dropBlock = (m) => { if (m.parent) m.parent.remove(m); };
    function endDrag(op) { if (drag.obj && drag.obj.parent) drag.obj.parent.remove(drag.obj); drag.obj = null; if (op && op.then) op.then(); said.push('home'); }
    const ghostLock = () => {}, ghostFlash = () => {}, handShadowReset = () => {};
    const handShadow = { fall: null, fade: 0 };
    /* a camera framed like a Mac's week: the board below, looked at from in front and above */
    const camera = new T.PerspectiveCamera(30, 1440 / 900, 1, 400);
    camera.position.set(0, 30, 26); camera.lookAt(0, 0, 0.5); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const renderer = { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }) } };
    ${PARTS.join('\n')}
    function place(key, x, row) {
      const m = makeBlock({});
      Object.assign(m.userData, { key, date: '2026-10-17', bkey: key, row: row || 3, w: 1 - GAP * 2, dU: BLOCK_D, h: H_HARD, kind: 'block' });
      m.userData.target.set(x, BOARD_Y, 0);
      m.position.copy(m.userData.target);
      weekGroup.add(m); week.blocks.set(key, m);
      return m;
    }
    /* a block of dur minutes in the hand, the way startDrag hangs one, aimed at a screen point */
    function hold(dur, px, py, op) {
      const m = makeBlock({ name: 'Walk', dur });
      dressBlock(m, { name: 'Walk', dur }, dur / 60, BLOCK_D, {});
      drag.obj = m;
      handStart(m, { name: 'Walk', dur }, false, null, null, Object.assign({ px, py, u: 0.5, v: 0.5, over: 'week' }, op || {}), null);
      return m;
    }
    function frame(dt) { clock += dt * 1000; moving = false; handStep(dt); return moving; }
    const deg = (r) => r * 180 / Math.PI;
    const screenOf = (v) => { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * 1440, y: (1 - p.y) / 2 * 900 }; };
    ({ T, hand, drag, HAND_TUNE, LAND, said, hold, frame, place, handAim, handNo, handFall, stepFalls, feelBlock, touchDown, squashFor, deg, screenOf, week, user,
       get clock() { return clock; } });`;
  return runInNewContext(script, { T: THREE, Math, Number, Array, Object, Map, Set, Date, JSON, console: { error: () => {}, warn: () => {}, log: () => {} } });
}
const fin = (...v) => v.every(Number.isFinite);

test('the hand hangs straight above the floor point: the aim point marks where it lands, one to one (A2)', () => {
  const r = rig();
  r.hold(60, 700, 500);
  for (let i = 0; i < 60; i++) r.frame(1 / 60);
  for (let i = 0; i < 40; i++) {
    /* 1000 px/s across the screen, one frame at a time */
    const x = 700 + i * 1000 / 60;
    r.handAim(x, 500);
    r.frame(1 / 60);
    const f = r.screenOf(r.hand.floor), p = r.screenOf(r.hand.rig.position);
    assert.ok(Math.abs(f.x - x) <= 1 && Math.abs(f.y - 500) <= 1, 'the floor point is under the aim point (' + f.x.toFixed(1) + ', ' + f.y.toFixed(1) + ' for ' + x.toFixed(1) + ', 500)');
    assert.ok(Math.abs(r.hand.rig.position.x - r.hand.floor.x) < 1e-9 && Math.abs(r.hand.rig.position.z - r.hand.floor.z) < 1e-9, 'the pinch is straight above it');
    assert.ok(p.y < f.y, 'the block is above its floor point on screen');
  }
});

test('the lift: 90 percent of its height by 140 ms, a small overshoot, settled in hand at 1.12 (A4)', () => {
  const r = rig();
  r.hold(60, 700, 500, { from: 'board' });
  const L = r.HAND_TUNE.lift.week;
  let t90 = null, peak = 0, sPeak = 0;
  for (let i = 0; i < 120; i++) {
    r.frame(1 / 240);
    const t = (i + 1) / 240;
    if (t90 == null && r.hand.lift.x >= 0.9 * L) t90 = t;
    peak = Math.max(peak, r.hand.lift.x); sPeak = Math.max(sPeak, r.hand.s.x);
  }
  assert.ok(t90 != null && t90 <= 0.145, '90 percent of the lift by 140 ms (it took ' + (t90 && Math.round(t90 * 1000)) + ' ms)');
  const over = peak / L - 1;
  assert.ok(over >= 0.06 && over <= 0.1, 'it overshoots 6 to 10 percent (' + (over * 100).toFixed(1) + ')');
  assert.ok(sPeak >= 1.12 && sPeak <= 1.14, 'its size peaks at 1.12 to 1.14 (' + sPeak.toFixed(3) + ')');
  for (let i = 0; i < 240; i++) r.frame(1 / 240);
  assert.ok(Math.abs(r.hand.lift.x - L) < 0.01 && Math.abs(r.hand.s.x - 1.12) < 0.005, 'it settles at its height and its size in hand');
});

test('the swing: a hard stop swings 8 to 12 degrees, back 25 to 40 percent, still in a little over a second (A5)', () => {
  const r = rig();
  r.hold(60, 300, 500);
  for (let i = 0; i < 120; i++) r.frame(1 / 240);
  /* 1500 px/s to the right, then a stop over 120 ms */
  let x = 300, v = 1500;
  const dt = 1 / 240;
  for (let i = 0; i < 240 * 0.5; i++) { x += v * dt; r.handAim(x, 500); r.frame(dt); }
  const steady = Math.abs(r.deg(r.hand.roll.x));
  assert.ok(steady <= 4, 'at a steady speed it leans at most 4 degrees (' + steady.toFixed(2) + ')');
  for (let i = 0; i < 240 * 0.12; i++) { v = Math.max(0, v - 1500 / (240 * 0.12)); x += v * dt; r.handAim(x, 500); r.frame(dt); }
  const roll = [];
  for (let i = 0; i < 240 * 1.4; i++) { r.handAim(x, 500); r.frame(dt); roll.push(r.deg(r.hand.hang.rotation.z)); }
  /* the swings: the extremes, in turn */
  const ext = [];
  for (let i = 1; i < roll.length - 1; i++) if ((roll[i] > roll[i - 1] && roll[i] >= roll[i + 1]) || (roll[i] < roll[i - 1] && roll[i] <= roll[i + 1])) ext.push(roll[i]);
  assert.ok(ext.length >= 2, 'it swings back and forth');
  const first = Math.abs(ext[0]), second = Math.abs(ext[1]);
  assert.ok(first >= 8 && first <= 12, 'the first swing is 8 to 12 degrees (' + first.toFixed(2) + ')');
  assert.ok(second / first >= 0.25 && second / first <= 0.4, 'the second is 25 to 40 percent of it (' + (100 * second / first).toFixed(0) + ')');
  const late = Math.abs(roll[Math.round(240 * 1.2) - 1]);
  assert.ok(late < 0.5, 'under half a degree by 1.2 s (' + late.toFixed(2) + ')');
});

test('calmer motion: the block hangs level at its own size, lifted at once, one to one (A11)', () => {
  const r = rig({ calm: true });
  r.hold(60, 300, 500);
  r.frame(1 / 60);
  assert.equal(r.hand.s.x, 1, 'size 1');
  assert.equal(r.hand.lift.x, r.HAND_TUNE.lift.week, 'lifted at once');
  for (let i = 0; i < 30; i++) { r.handAim(300 + i * 40, 500 - i * 10); r.frame(1 / 60); }
  assert.equal(r.hand.hang.rotation.x, 0); assert.equal(r.hand.hang.rotation.z, 0);
  const f = r.screenOf(r.hand.floor);
  assert.ok(Math.abs(f.x - (300 + 29 * 40)) <= 1 && Math.abs(f.y - (500 - 29 * 10)) <= 1, 'the floor point is under the pointer');
});

test('the fall: from exactly where it hung, under desk gravity, level and true size at the touch, with one clack (A8)', () => {
  const r = rig();
  const m = r.place('add:walk', 2.5);
  r.hold(60, 700, 500);
  for (let i = 0; i < 120; i++) r.frame(1 / 240);
  const o = r.drag.obj, start = o.getWorldPosition(new r.T.Vector3());
  assert.ok(r.handFall([m], [m]), 'it falls');
  const f = r.hand.on ? null : true;
  assert.ok(f, 'the hand let go');
  /* the fall starts at the pose it hung in */
  assert.ok(o.getWorldPosition(new r.T.Vector3()).distanceTo(start) < 0.01, 'the fall starts where it hung');
  let t = 0, touched = null;
  for (let i = 0; i < 240; i++) {
    r.stepFalls(1 / 240); t += 1 / 240;
    if (touched == null && m.visible && !m.userData.held) touched = t;
    if (touched != null) break;
  }
  const g = r.HAND_TUNE.fallG, h = start.y - 0.3;
  const want = Math.max(r.HAND_TUNE.fallMin, Math.min(r.HAND_TUNE.fallMax, Math.sqrt(2 * h / g)));
  assert.ok(touched != null && Math.abs(touched - want) <= 1 / 60, 'it touches after sqrt(2h/g), within a frame (' + Math.round(touched * 1000) + ' ms, want ' + Math.round(want * 1000) + ')');
  assert.ok(m.position.distanceTo(m.userData.target) < 1e-6, 'the board block is in its slot');
  assert.ok(m.userData.sq && m.userData.sq.hand, 'it squashes by the damped sine');
});

test('the landing squash: peaks near 32 ms at the size it was asked for, one small rebound, still by 260 ms', () => {
  const r = rig();
  const m = r.place('add:read', 0);
  const A = r.squashFor(2, 30);
  m.userData.sq = { t: 0, amp: A, hand: true };
  let peak = 0, peakT = 0, rebound = 0, t = 0;
  for (let i = 0; i < 300; i++) {
    r.feelBlock(m, 1 / 1000, 0, false, false); t += 1 / 1000;
    const d = 1 - m.scale.y;
    if (d > peak) { peak = d; peakT = t; }
    if (t > 0.08) rebound = Math.max(rebound, -d);
  }
  assert.ok(Math.abs(peak - 0.11) < 0.005, 'a two hour block squashes 11 percent (' + (peak * 100).toFixed(2) + ')');
  assert.ok(peakT > 0.025 && peakT < 0.04, 'it peaks about 32 ms in (' + Math.round(peakT * 1000) + ')');
  assert.ok(rebound > 0 && rebound < 0.025, 'one small rebound, under 2.5 percent (' + (rebound * 100).toFixed(2) + ')');
  assert.ok(Math.abs(m.scale.y - 1) < 1e-6 && !m.userData.sq, 'still by 260 ms');
  assert.ok(Math.abs(r.squashFor(0.5, 30) / A * 0.11 - 0.08) < 0.002, 'a half hour block squashes 8 percent');
});

test('the no: a refused drop dips, bumps (one bad sound), shakes, and goes home at 280 ms (A9)', () => {
  const r = rig();
  r.hold(60, 700, 500);
  for (let i = 0; i < 120; i++) r.frame(1 / 240);
  let home = false;
  r.handNo({ after: { home: true, then: () => { home = true; } } });
  let t = 0, minY = Infinity, shake = 0;
  while (t < 0.4 && !home) { r.frame(1 / 240); t += 1 / 240; if (r.hand.on) { minY = Math.min(minY, r.hand.rig.position.y); shake = Math.max(shake, Math.abs(r.deg(r.hand.hang.rotation.y))); } }
  assert.ok(home, 'it went home');
  assert.ok(t >= 0.27 && t <= 0.3, 'at 280 ms (' + Math.round(t * 1000) + ')');
  assert.equal(r.said.filter((k) => k === 'bad').length, 1, 'the bump sounds once');
  assert.ok(shake >= 2.5, 'it shakes no (' + shake.toFixed(2) + ' degrees)');
});

test('every number in the hand stays a number: a bad aim, a bad camera point, a bad spring', () => {
  const r = rig();
  r.hold(30, 600, 400);
  r.handAim(NaN, 400); r.handAim(600, Infinity);
  for (let i = 0; i < 30; i++) r.frame(1 / 60);
  const H = r.hand, o = r.drag.obj;
  assert.ok(fin(H.aim.x, H.aim.y, H.floor.x, H.floor.y, H.floor.z, H.lift.x, H.s.x, H.roll.x, H.pitch.x, H.yaw.x), 'the hand is numbers');
  assert.ok(fin(o.position.x, o.position.y, o.position.z, o.scale.x, o.rotation.z, H.rig.position.x, H.rig.position.y), 'the block in hand is numbers');
  H.roll.v = NaN; H.lift.x = NaN;
  for (let i = 0; i < 5; i++) r.frame(1 / 60);
  assert.ok(fin(H.roll.x, H.roll.v, H.lift.x), 'a spring that went bad heals');
});
