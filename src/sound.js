/* Soft wooden taps: a tick for each step while dragging, a tok when a block lands. */
let ctx = null;
export const sound = { on: true };

function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tap(freq, dur, gain, type = 'sine') {
  if (!sound.on) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  f.type = 'lowpass';
  f.frequency.value = 2400;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const tick = () => tap(1800, 0.03, 0.025, 'triangle');
export const lift = () => tap(520, 0.08, 0.05);
export const tok = () => { tap(340, 0.12, 0.09); setTimeout(() => tap(680, 0.05, 0.03, 'triangle'), 18); };
export const nope = () => { tap(180, 0.14, 0.06, 'triangle'); };
export const chime = () => { [523, 659, 784].forEach((f, i) => setTimeout(() => tap(f, 0.22, 0.05), i * 70)); };
