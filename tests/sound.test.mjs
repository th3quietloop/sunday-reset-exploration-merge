// V11-2: the sound is made early and quietly, so the first press doesn't stop to start it, and with sound off there's
// no context at all (board/src/sound.js). A fake AudioContext counts what's made, resumed, and closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../board/src/sound.js', import.meta.url), 'utf8');

function load() {
  const made = [], idle = [];
  const gesture = { isActive: false };
  class FakeAC {
    constructor() { this.state = gesture.isActive ? 'running' : 'suspended'; this.resumed = 0; this.closed = 0; this.currentTime = 0; this.sampleRate = 48000; this.destination = {}; made.push(this); }
    resume() { this.resumed++; if (gesture.isActive) this.state = 'running'; return Promise.resolve(); }
    close() { this.closed++; this.state = 'closed'; return Promise.resolve(); }
    createGain() { return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  const win = {
    AudioContext: FakeAC,
    navigator: { userActivation: gesture },
    requestIdleCallback: (fn) => { idle.push(fn); return idle.length; },
    cancelIdleCallback: (id) => { idle[id - 1] = null; },
    setTimeout, clearTimeout
  };
  vm.runInNewContext(SRC, { window: win });
  const runIdle = () => { const fns = idle.splice(0); fns.forEach((f) => f && f()); };
  return { S: win.Sound, made, gesture, runIdle, win };
}

test('sound on at load: the context is made while the page is idle, suspended, and the first touch only resumes it', () => {
  const { S, made, gesture, runIdle } = load();
  S.set(true);
  assert.equal(made.length, 0, 'nothing is made while the page is still loading');
  assert.equal(S.state, 'soon');
  runIdle();
  assert.equal(made.length, 1);
  assert.equal(made[0].state, 'suspended');
  gesture.isActive = true;
  S.init();
  assert.equal(made.length, 1, 'the first touch makes nothing new');
  assert.equal(made[0].resumed, 1);
  assert.equal(made[0].state, 'running');
  S.init();
  assert.equal(made[0].resumed, 1, 'a running context is left alone');
});

test('sound off: no context at all, and turning it off closes the one there is', () => {
  const { S, made, gesture, runIdle } = load();
  S.set(false);
  runIdle();
  gesture.isActive = true;
  S.init();
  assert.equal(made.length, 0, 'a tap with sound off makes nothing');
  assert.equal(S.state, 'none');
  gesture.isActive = false;
  S.set(true);
  runIdle();
  assert.equal(made.length, 1);
  S.set(false);
  assert.equal(made[0].closed, 1);
  assert.equal(S.state, 'none');
  runIdle();
  assert.equal(made.length, 1, 'nothing is made after sound went off');
});

test('turned on from a tap, the sound is made right then, so its chime can play', () => {
  const { S, made, gesture } = load();
  S.set(false);
  gesture.isActive = true;
  S.set(true);
  assert.equal(made.length, 1);
  assert.equal(made[0].state, 'running');
});

test('a desk still moving waits for rest before the sound is made; steam rising on its own counts as rest', async () => {
  const { S, made, runIdle, win } = load();
  win.World = { idle: false, lazy: false };
  S.set(true);
  runIdle();
  assert.equal(made.length, 0, 'not while the boards settle');
  win.World.lazy = true;
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(made.length, 1, 'made once only steam is moving');
});

test('a touch before the idle moment makes the sound then, once, and the early one never comes', () => {
  const { S, made, gesture, runIdle } = load();
  S.set(true);
  gesture.isActive = true;
  S.init();
  assert.equal(made.length, 1);
  runIdle();
  assert.equal(made.length, 1, 'the idle moment after finds it made');
});
