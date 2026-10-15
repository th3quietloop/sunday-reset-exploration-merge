/* Sunday Reset sound. Synthesized with WebAudio so there are no files: wooden clacks, a tick,
   a soft slide when the boards change, and a chime when the week is set. Starts after the first tap. */
(function (root) {
  'use strict';
  let ctx = null, master = null, on = true, noiseBuf = null, lastDetent = 0, haptic = false, lastBuzz = 0;
  /* V11, lift and place (docs/LIFT-AND-PLACE.md 7): so the hundredth drop doesn't sound like the first ninety
     nine, a clack and a tap come in three versions that never repeat back to back, a little higher or lower each
     time, and as loud as the block came down hard; a detent ticks at most every 50 ms. Only a version whose page
     carries the class feel (V11); every other version sounds as it always did */
  const feel = () => !!(root.document && root.document.body && root.document.body.classList.contains('feel'));
  let lastClack = -1, lastTap = -1;
  const jitter = (k) => 1 + (Math.random() * 2 - 1) * k;
  const nextOf = (last) => { let v = Math.floor(Math.random() * 3); if (v === last) v = (v + 1 + Math.floor(Math.random() * 2)) % 3; return v; };
  const VARIANT = [1, 1.05, 0.93];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  const ok = () => on && ctx && ctx.state === 'running';
  function env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(f, type, peak, a, d, when, bend) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    const t0 = ctx.currentTime + (when || 0);
    if (bend) o.frequency.exponentialRampToValueAtTime(f * bend, t0 + a + d);
    o.connect(g); g.connect(master); env(g, t0, a, peak, d);
    o.start(t0); o.stop(t0 + a + d + 0.05);
  }
  function noise(d, f, peak, when, type, q) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const c = noiseBuf.getChannelData(0);
      for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q || 1;
    s.connect(fl); fl.connect(g); g.connect(master);
    const t0 = ctx.currentTime + (when || 0);
    env(g, t0, 0.003, peak, d); s.start(t0, Math.random() * 0.5); s.stop(t0 + d + 0.05);
  }

  root.Sound = {
    init,
    set(v) { on = !!v; },
    /* the detent's tick under the finger, for touch screens */
    setHaptic(v) { haptic = !!v; },
    get on() { return on; },
    pick() { if (!ok()) return; const j = feel() ? jitter(0.04) : 1; tone(520 * j, 'triangle', 0.08, 0.002, 0.06); noise(0.04, 2400 * j, 0.05, 0, 'bandpass', 3); },
    /* speed (V11): how fast it came down, in desk units a second (30 is a full drop); loud: a softer one (Undo's) */
    clack(size, speed, loud) {
      if (!ok()) return;
      const k = Math.max(0.55, Math.min(1.6, 1 / Math.sqrt(Math.max(0.25, size || 1))));
      if (!feel()) { tone(300 * k, 'triangle', 0.16, 0.002, 0.09, 0, 0.8); noise(0.05, 1800 * k, 0.12, 0, 'bandpass', 2.5); tone(610 * k, 'sine', 0.05, 0.002, 0.05, 0.03); return; }
      const v = lastClack = nextOf(lastClack), j = jitter(0.04), g = Math.max(0.7, Math.min(1, Number.isFinite(speed) ? 0.7 + 0.3 * Math.min(1, speed / 30) : 1)) * (loud || 1);
      tone(300 * k * j, 'triangle', 0.16 * g, 0.002, 0.09, 0, 0.8); noise(0.05, 1800 * k * j * VARIANT[v], 0.12 * g, 0, 'bandpass', 2.5); tone(610 * k * j * VARIANT[(v + 1) % 3], 'sine', 0.05 * g, 0.002, 0.05, 0.03);
    },
    stretch() { if (!ok()) return; tone(180, 'sawtooth', 0.025, 0.05, 0.5, 0, 1.6); noise(0.3, 700, 0.02, 0, 'bandpass', 3); },
    slide() { if (!ok()) return; noise(0.12, 900, 0.035, 0, 'lowpass', 0.7); },
    /* a soft knock of wood, for blocks settling into place */
    tap() {
      if (!ok()) return;
      if (!feel()) { noise(0.018, 2200, 0.03, 0, 'bandpass', 4); tone(420, 'sine', 0.035, 0.001, 0.05); return; }
      const v = lastTap = nextOf(lastTap), j = jitter(0.04);
      noise(0.018, 2200 * j * VARIANT[v], 0.03, 0, 'bandpass', 4); tone(420 * j * VARIANT[(v + 2) % 3], 'sine', 0.035, 0.001, 0.05);
    },
    tick(loud) { if (!ok()) return; noise(0.02, loud ? 2800 : 3600, loud ? 0.06 : 0.03, 0, 'bandpass', 5); },
    /* a soft ratchet click for each 15 minutes a block moves, like winding a clock.
       Rate limited so a fast drag purrs instead of rattling. A spot that won't fit clicks lower. */
    detent(fits) {
      /* on a touch screen that can, a tick you feel too, kept short and rate limited like the sound */
      if (haptic && navigator.vibrate) { const n = Date.now(); if (n - lastBuzz > 60) { lastBuzz = n; try { navigator.vibrate(6); } catch (e) { /* fine */ } } }
      if (!ok()) return;
      const t = ctx.currentTime;
      if (t - lastDetent < (feel() ? 0.05 : 0.028)) return;
      lastDetent = t;
      const k = 0.94 + Math.random() * 0.12, f = fits === false ? 0.62 : 1;
      noise(0.012, 5200 * k * f, 0.028, 0, 'bandpass', 9);
      tone(1650 * k * f, 'sine', 0.018, 0.001, 0.022);
    },
    /* the lamp's switch: a snap and a small knock, a little brighter going on */
    lamp(onNow) {
      if (!ok()) return;
      noise(0.014, onNow ? 4200 : 3400, 0.07, 0, 'bandpass', 6);
      tone(onNow ? 880 : 620, 'triangle', 0.05, 0.001, 0.04, 0.006);
      noise(0.03, 900, 0.04, 0.02, 'lowpass', 1);
    },
    thud() { if (!ok()) return; tone(120, 'sine', 0.35, 0.003, 0.25, 0, 0.6); noise(0.12, 500, 0.2, 0, 'lowpass', 0.8); tone(260, 'triangle', 0.08, 0.002, 0.08, 0.16, 0.7); },
    buzz() { if (!ok()) return; for (let i = 0; i < 2; i++) tone(170, 'square', 0.025, 0.01, 0.14, i * 0.2); },
    good() { if (!ok()) return; tone(660, 'sine', 0.08, 0.01, 0.25); tone(990, 'sine', 0.06, 0.01, 0.35, 0.09); },
    bad() { if (!ok()) return; tone(240, 'triangle', 0.08, 0.01, 0.3); tone(215, 'triangle', 0.07, 0.01, 0.4, 0.13); },
    bell() { if (!ok()) return; [[784, 0.12, 1.6], [1568, 0.04, 1.0], [2350, 0.02, 0.6]].forEach(([f, p, d]) => tone(f, 'sine', p, 0.003, d)); },
    deposit() { if (!ok()) return; for (let i = 0; i < 6; i++) { tone(900 + i * 60, 'sine', 0.04, 0.002, 0.08, i * 0.07); noise(0.03, 3500, 0.03, i * 0.07, 'bandpass', 4); } },
    zoom(out) {
      if (!ok()) return;
      noise(0.28, out ? 700 : 1300, 0.05, 0, 'lowpass', 0.8);
      tone(out ? 330 : 520, 'sine', 0.05, 0.02, 0.22, 0, out ? 1.5 : 0.66);
      tone(out ? 660 : 390, 'triangle', 0.03, 0.01, 0.12, 0.12, 0.9);
    },
    chime() { if (!ok()) return; tone(392, 'sine', 0.14, 0.01, 2.2); tone(587, 'sine', 0.07, 0.01, 1.8, 0.03); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
