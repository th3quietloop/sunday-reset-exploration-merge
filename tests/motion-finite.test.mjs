// A block set down is a block that's drawn. The demo at the Apple Store dropped a block that never showed:
// a block set down before its first frame (adoptPosition and land gave it a speed first) skipped the start
// of its motion, its dip was left unset, and every number it moved by turned to NaN. This test cuts the
// motion code out of board/src/scene.js by the comments that start each part (as tests/v11-rig.mjs does
// for app.js) and runs it with the real three.js: blocks set down every way the app sets them down, a block
// carrying the old lazy start, and the watchdog that puts a block with a number that isn't one back at rest.
// When a cut can't find its marker, the test says which one, so a reworded comment is easy to find.
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
const PARTS = [
  cut('  /* a critically damped spring', '  /* what the desk tells the app when a block touches down'),
  cut('  function makeBlock(b) {', '  /* A block that leaves the desk gives back'),
  cut('  /* lean in toward a point on the desk', '  /* feel: how far in the lean goes'),
  cut('  /* == every number a block moves by stays a number ==', '  /* The Sunday Reset is done: the week clicks into place.'),
  cut('  /* the landing outline fades in and glides from slot to slot */', '  function stepGhost(g, dt) {'),
  cut('  /* o (feel): hand, the point under the pointer', '  function showGhost(row, start, durMin, valid) {'),
  cut('  /* Place a moved block\'s meshes where it was dropped', '  /* The screen point just above the picked block')
];

/* the desk around the motion code: a world, the boards' maps of blocks, the hand, the camera, and notes
   of what it said (sounds, and the console) */
function rig() {
  const said = [], errors = [];
  const script = `
    const FEEL = true;
    let reduced = false, moving = false, zoomName = 'week', layout = 'week';
    const BLOCK_D = 1.08, H_HARD = 0.3, BOARD_Y = 0.3, GAP = 0.03, ONE = new T.Vector3(1, 1, 1);
    const world = new T.Group(), weekGroup = new T.Group(); world.add(weekGroup);
    const week = { blocks: new Map(), group: weekGroup }, dayb = { blocks: new Map() }, bench = { pieces: new Map() };
    const drag = { obj: null, target: new T.Vector3(), vel: new T.Vector3(), roll: { x: 0, v: 0 }, pitch: { x: 0, v: 0 }, last: null, fresh: false, surface: null };
    const homes = [], puffs = [], tileMotions = new Set(), tmpV = new T.Vector3(), tmpW = new T.Vector3();
    const user = { zoom: 1, zoomTo: 1, pan: new T.Vector3(), panTo: new T.Vector3(), panVel: new T.Vector3(), lean: 0, leanTo: 0, leanAt: new T.Vector3(), leaning: false };
    const camV = { look: new T.Vector3(), lean: 0, pan: new T.Vector3(), zoom: 0 };
    const cam = { look: new T.Vector3(0, 0, 0), dist: 40, elev: 0.9 }, camTo = { look: new T.Vector3(0, 0, 0), dist: 40, elev: 0.9 };
    const benchCam = { carry: false };
    function snapCamera() { cam.look.copy(camTo.look); cam.dist = camTo.dist; cam.elev = camTo.elev; camV.look.set(0, 0, 0); }
    const easeOutSoft = (x) => { const c1 = 0.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const feelSay = (kind, a) => said.push(kind);
    /* what makeBlock builds a block from, plain */
    const mesh = (g, m) => new T.Mesh(g, m), blockGeo = () => new T.BoxGeometry(1, 0.3, 1), mat = () => new T.MeshBasicMaterial();
    const printMat = (o) => new T.MeshBasicMaterial(o), makeLock = () => new T.Group();
    const faceGeo = new T.PlaneGeometry(1, 1), gripGeo = new T.PlaneGeometry(1, 1), haloGeo = new T.PlaneGeometry(1, 1), haloMat = new T.MeshBasicMaterial();
    const puffGeo = new T.BoxGeometry(0.1, 0.1, 0.1), puffMat = new T.MeshBasicMaterial();
    const blockMeshes = (date, bkey) => Array.from(week.blocks.values()).filter((m) => m.userData.date === date && m.userData.bkey === bkey);
    ${PARTS.join('\n')}
    /* a block on the week the way the board puts one there: in its slot, drawn */
    function place(key, x) {
      const m = makeBlock({});
      Object.assign(m.userData, { key, date: '2026-10-17', bkey: key, row: 5, w: 1, kind: 'block' });
      m.userData.target.set(x, BOARD_Y, 1.62 * 2);
      m.position.copy(m.userData.target);
      weekGroup.add(m); week.blocks.set(key, m);
      return m;
    }
    /* a block in hand, carried above a slot, moving */
    function carry(x) {
      const o = makeBlock({});
      o.position.set(x, BOARD_Y + 1.1, 1.62 * 2 + 0.2); world.add(o);
      drag.obj = o; drag.target.copy(o.position); drag.vel.set(3, 0, -1);
      return o;
    }
    /* a frame of the desk for every block (the order step() takes them in), then the watchdog */
    function frames(n, dt) { for (let i = 0; i < n; i++) { week.blocks.forEach((m) => feelBlock(m, dt || 1 / 60, 0, false, false)); watchBlocks(); } }
    const fin = (m) => [m.position.x, m.position.y, m.position.z, m.scale.x, m.scale.y, m.scale.z, m.rotation.x, m.rotation.z, m.userData.pressK, m.userData.gripK, m.userData.haloK].every(Number.isFinite);
    ({ T, week, drag, user, cam, repairs, said, place, carry, frames, fin, makeBlock, adoptPosition, land, holdBack, press, feelBlock, watchBlocks, lean, dragTo, ghostAim, blockShown, showBlock, get pressObj() { return pressObj; } });`;
  const sandbox = { T: THREE, Math, Number, Array, Object, Map, Set, Date, JSON, said, console: { error: (...a) => errors.push(a.join(' ')), warn: () => {}, log: () => {} } };
  const r = runInNewContext(script, sandbox);
  r.errors = errors;
  return r;
}
const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;
/* drawn: every number a number, shown, at its own size, in its slot */
function assertDrawn(r, m, label) {
  assert.ok(r.fin(m), label + ': every number it moves by is a number');
  assert.equal(m.visible, true, label + ': it is shown');
  assert.ok(near(m.scale.y, 1, 0.02), label + ': at its own height (scale ' + m.scale.y + ')');
  const t = m.userData.target;
  assert.ok(near(m.position.x, t.x, 0.01) && near(m.position.y, t.y, 0.01) && near(m.position.z, t.z, 0.01), label + ': in its slot');
}

test('a block dropped from the hand before its first frame lands, drawn, every number a number', () => {
  const r = rig();
  const m = r.place('add:walk', 2);
  r.carry(2.3);
  /* the way a drop goes: the board takes the hand's place and speed, the hand is put away, then it lands */
  r.adoptPosition('2026-10-17', 'add:walk');
  r.drag.obj = null;
  r.land('2026-10-17', 'add:walk', 1);
  for (let i = 0; i < 3; i++) { r.frames(1); assert.ok(r.fin(m), 'frame ' + i + ': every number is a number'); }
  r.frames(57);
  assertDrawn(r, m, 'dropped from the hand');
  assert.ok(r.said.includes('land'), 'it said it landed (the clack plays at the touch)');
  assert.equal(r.repairs.count, 0, 'nothing needed putting back');
});

test('a block placed from the panel (held back for the flying copy) lands when the copy arrives', () => {
  const r = rig();
  const m = r.place('add:read', -1);
  r.holdBack('2026-10-17', 'add:read');
  r.frames(5);
  assert.equal(m.visible, false, 'it waits, out of sight, for the copy');
  r.land('2026-10-17', 'add:read', 0.75);
  r.frames(60);
  assertDrawn(r, m, 'placed from the panel');
  assert.equal(r.repairs.count, 0);
});

test('a block held back with no copy arriving shows on its own within a moment and a half', () => {
  const r = rig();
  const m = r.place('add:nap', 0);
  r.holdBack('2026-10-17', 'add:nap');
  r.frames(100);
  assertDrawn(r, m, 'held back and never landed');
});

test('a block from before every number started in makeBlock still moves by numbers (the lazy start can\'t come back)', () => {
  const r = rig();
  const m = r.place('add:old', 1);
  /* what the demo's block had: a speed given by adoptPosition, and no dip, grip, or glow at all */
  delete m.userData.pressK; delete m.userData.gripK; delete m.userData.haloK;
  m.userData.vel = new r.T.Vector3(1, 0, 0);
  r.press(m);
  r.frames(10);
  r.press(null);
  r.frames(60);
  assertDrawn(r, m, 'the old lazy start');
  assert.equal(r.repairs.count, 0, 'feelBlock started it cleanly, with nothing to repair');
});

test('the watchdog puts a block with a number that isn\'t one back at rest, and says so once', () => {
  const r = rig();
  const m = r.place('add:run', 3);
  r.frames(5);
  /* (as whatever changed it last left it, before the next frame's motion runs) */
  m.position.y = NaN; m.scale.y = Infinity; m.userData.pressK = NaN;
  r.watchBlocks();
  assertDrawn(r, m, 'repaired');
  assert.equal(r.repairs.count, 1, 'one repair noted');
  assert.equal(r.errors.length, 1, 'the console heard once');
  m.position.x = NaN;
  r.watchBlocks();
  assert.equal(r.repairs.count, 2, 'a second repair is noted');
  assert.equal(r.errors.length, 1, 'the console isn\'t told the same thing twice');
  r.frames(30);
  assertDrawn(r, m, 'after the second repair');
});

test('a block landing with a number that isn\'t one lands from rest instead', () => {
  const r = rig();
  const m = r.place('add:yoga', 4);
  m.userData.vel.set(NaN, 0, 0);
  m.rotation.z = NaN;
  r.land('2026-10-17', 'add:yoga', 1);
  r.frames(60);
  assertDrawn(r, m, 'landed after a repair');
});

test('the hand never takes a number that isn\'t one: aim, lean, outline, and the block in hand', () => {
  const r = rig();
  const o = r.carry(1);
  const was = o.position.clone();
  r.dragTo(NaN, 1, 2, 0, { hand: { x: NaN, z: 1 } });
  assert.ok(Number.isFinite(r.drag.target.x), 'a NaN aim is ignored');
  r.lean({ x: NaN, z: 0 }, 1);
  assert.equal(r.user.leanTo, 0, 'a NaN point is no lean');
  const g = new r.T.Mesh(new r.T.PlaneGeometry(1, 1), new r.T.MeshBasicMaterial());
  g.userData = {};
  r.ghostAim(g, 1, 0.3, 2, 1, 1);
  r.ghostAim(g, NaN, 0.3, 2, 1, 1);
  assert.ok([g.position.x, g.position.y, g.position.z].every(Number.isFinite), 'the outline stays where a number put it');
  /* the block in hand itself, and the camera's aim */
  o.position.set(NaN, NaN, 0);
  r.user.leanAt.set(NaN, 0, 0);
  r.cam.look.set(NaN, 0, 0);
  r.watchBlocks();
  assert.ok([o.position.x, o.position.y, o.position.z].every(Number.isFinite), 'the block in hand is back where it was aimed');
  assert.ok(Number.isFinite(r.user.leanAt.x) && Number.isFinite(r.cam.look.x), 'the lean and the camera are numbers again');
  assert.ok(was, 'carried');
});

test('a block set down that isn\'t drawn is seen, and drawn again (the landing watch in app.js asks this)', () => {
  const r = rig();
  const m = r.place('add:swim', 2);
  r.land('2026-10-17', 'add:swim', 1);
  r.frames(60);
  assert.equal(r.blockShown('2026-10-17', 'add:swim'), true, 'a block that landed is drawn');
  assert.equal(r.blockShown('2026-10-17', 'add:other'), null, 'a block this board doesn\'t have can\'t be judged');
  /* the ways a dropped block went missing: still marked as in hand, held back, a number that isn't one */
  m.userData.inHand = true; m.visible = false;
  assert.equal(r.blockShown('2026-10-17', 'add:swim'), false, 'hidden as in hand: not drawn');
  r.showBlock('2026-10-17', 'add:swim');
  assert.equal(r.blockShown('2026-10-17', 'add:swim'), true, 'drawn again');
  m.position.y = NaN;
  assert.equal(r.blockShown('2026-10-17', 'add:swim'), false, 'a number that isn\'t one: not drawn');
  r.showBlock('2026-10-17', 'add:swim');
  assertDrawn(r, m, 'drawn again at rest');
});
