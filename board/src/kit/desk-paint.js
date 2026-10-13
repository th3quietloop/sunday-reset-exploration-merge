/* Sunday Reset desk kit: canvas painters for the desk woods and mats in src/kit/themes.js.
   Each takes a setting and returns a canvas, ready for a THREE.CanvasTexture with repeat wrapping.
   With the Warm settings they draw what plankTex, woodTex, grooveTex, and leatherTex in scene.js
   draw today, stroke for stroke (same seeds, same order of random draws). window.DeskPaint. */
(function (root) {
  'use strict';

  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rgba = (c, a) => 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + a + ')';
  const lerp = (r, t) => r[0] + t * (r[1] - r[0]);

  /* one grain stroke's color, drawn in the order the scene.js painters draw theirs */
  function grainStyle(rnd, sp) {
    return rnd() < 1 - sp.lightShare ? rgba(sp.dark, lerp(sp.darkA, rnd())) : rgba(sp.light, lerp(sp.lightA, rnd()));
  }

  /* The desk: planks of a few tones, grain inside each, a seam under each, and one end joint.
     Maps one tile to sp.tile world units (the desk box repeats it 120 / tile by 80 / tile). */
  function planks(sp, S) {
    S = S || 1024;
    const cv = canvas(S, S), g = cv.getContext('2d');
    const rnd = mulberry32(sp.seed), n = sp.count, ph = S / n, k = S / 1024;
    const seamD = sp.seamDark || [70, 38, 12], seamL = sp.seamLight || [255, 230, 190];
    for (let i = 0; i < n; i++) {
      const y0 = i * ph;
      g.fillStyle = sp.tones[i % sp.tones.length]; g.fillRect(0, y0, S, ph);
      for (let q = 0; q < sp.lines; q++) {
        const yy = y0 + rnd() * ph, amp = lerp(sp.amp, rnd()) * k, freq = (0.004 + rnd() * 0.006) / k, phs = rnd() * 6.28;
        g.strokeStyle = grainStyle(rnd, sp);
        g.lineWidth = lerp(sp.width, rnd()) * k;
        g.beginPath();
        for (let x = -20; x <= S + 20; x += 16 * k) { const y = Math.max(y0 + 2, Math.min(y0 + ph - 2, yy + Math.sin(x * freq + phs) * amp)); if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = rgba(seamD, sp.seam[0]); g.fillRect(0, y0, S, 3 * k);
      g.fillStyle = rgba(seamL, sp.seam[1]); g.fillRect(0, y0 + 3 * k, S, 2 * k);
      const jx = Math.round(S * (0.15 + rnd() * 0.7));
      g.fillStyle = rgba(seamD, sp.joint); g.fillRect(jx, y0, 3 * k, ph);
    }
    return cv;
  }

  /* A board top: one tone with a quiet grain. Board tops map one tile to 12 world units. */
  function board(sp, S, base) {
    S = S || 1024;
    const cv = canvas(S, S), g = cv.getContext('2d'), k = S / 1024;
    g.fillStyle = base || sp.base; g.fillRect(0, 0, S, S);
    const rnd = mulberry32(sp.seed);
    for (let i = 0; i < sp.lines; i++) {
      const y0 = rnd() * S, amp = lerp(sp.amp, rnd()) * k, freq = (0.004 + rnd() * 0.006) / k, ph = rnd() * 6.28;
      g.strokeStyle = grainStyle(rnd, sp);
      g.lineWidth = lerp(sp.width, rnd()) * k;
      g.beginPath();
      for (let x = -20; x <= S + 20; x += 16 * k) { const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.25; if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    }
    return cv;
  }

  /* A lane's groove: a shadow along its far edge, a little light along its near edge. */
  function groove(sp) {
    const cv = canvas(8, 256), g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256), at = [0, 0.1, 0.5, 0.92, 1];
    sp.groove.forEach((c, i) => gr.addColorStop(at[i], c));
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
    return cv;
  }

  /* The desk mat, by pattern. Maps one tile to sp.tile world units. */
  const MATS = {
    speckle(g, sp, S, rnd) {
      const k = S / 512, n = Math.round(sp.dots * k * k);
      const light = rgba(sp.light, sp.light[3]), dark = rgba(sp.dark, sp.dark[3]);
      for (let i = 0; i < n; i++) { g.fillStyle = rnd() < 0.5 ? light : dark; g.fillRect(rnd() * S, rnd() * S, lerp(sp.dot, rnd()) * k, lerp(sp.dot, rnd()) * k); }
    },
    /* felt: short fibers every which way, over a faint cloudiness */
    fibers(g, sp, S, rnd) {
      const k = S / 512;
      for (let i = 0; i < 40; i++) {
        const x = rnd() * S, y = rnd() * S, r = (40 + rnd() * 90) * k;
        const gr = g.createRadialGradient(x, y, 0, x, y, r), a = 0.035 * rnd();
        const c = rnd() < 0.5 ? sp.light : sp.dark;
        gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0));
        g.fillStyle = gr;
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
      }
      const n = Math.round(sp.fibers * k * k);
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, l = lerp(sp.fiber, rnd()) * k;
        const c = rnd() < 0.5 ? sp.light : sp.dark;
        g.strokeStyle = rgba(c, c[3] * (0.5 + rnd()));
        g.lineWidth = (0.6 + rnd() * 0.8) * k;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    },
    /* cork: packed granules of a few tones, with small dark pits between them */
    granules(g, sp, S, rnd) {
      const k = S / 512, n = Math.round(sp.grains * k * k);
      for (let i = 0; i < n; i++) {
        const x = rnd() * S, y = rnd() * S, r = lerp(sp.grain, rnd()) * k, a = rnd() * Math.PI;
        g.fillStyle = sp.tones[Math.floor(rnd() * sp.tones.length)];
        g.globalAlpha = 0.55 + rnd() * 0.45;
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.beginPath(); g.ellipse(x + dx, y + dy, r, r * (0.6 + rnd() * 0.4), a, 0, Math.PI * 2); g.fill(); }
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(60, 36, 16, 0.35)';
      for (let i = 0; i < n / 6; i++) g.fillRect(rnd() * S, rnd() * S, (1 + rnd()) * k, (1 + rnd()) * k);
    },
    /* linen: a fine weave of warp and weft, with a few slubs where the thread thickens */
    weave(g, sp, S, rnd) {
      const k = S / 512, step = 3 * k;
      for (let y = 0; y < S; y += step) { g.fillStyle = rgba(rnd() < 0.5 ? sp.light : sp.dark, (rnd() < 0.5 ? sp.light : sp.dark)[3] * (0.4 + rnd() * 0.6)); g.fillRect(0, y, S, 1.2 * k); }
      for (let x = 0; x < S; x += step) { g.fillStyle = rgba(rnd() < 0.5 ? sp.light : sp.dark, (rnd() < 0.5 ? sp.light : sp.dark)[3] * (0.4 + rnd() * 0.6)); g.fillRect(x, 0, 1.2 * k, S); }
      for (let i = 0; i < sp.slubs; i++) {
        const x = rnd() * S, y = rnd() * S, l = (8 + rnd() * 30) * k, across = rnd() < 0.5;
        g.fillStyle = rgba(rnd() < 0.6 ? sp.light : sp.dark, 0.18);
        if (across) g.fillRect(x, y, l, 1.6 * k); else g.fillRect(x, y, 1.6 * k, l);
      }
    },
    /* a cutting mat: a line every world unit, a stronger one every five, a faint diagonal */
    grid(g, sp, S) {
      const k = S / 512, per = S / sp.tile;
      g.save(); g.lineWidth = 1.4 * k; g.strokeStyle = rgba(sp.diagonal, sp.diagonal[3]);
      g.beginPath(); g.moveTo(0, S); g.lineTo(S, 0); g.stroke(); g.restore();
      for (let i = 1; i < sp.tile; i++) {
        g.fillStyle = rgba(sp.minor, sp.minor[3]);
        g.fillRect(i * per - 0.8 * k, 0, 1.6 * k, S); g.fillRect(0, i * per - 0.8 * k, S, 1.6 * k);
      }
      /* the five unit line sits on the tile's edge, half on each side, so it tiles whole */
      g.fillStyle = rgba(sp.major, sp.major[3]);
      g.fillRect(0, 0, 1.6 * k, S); g.fillRect(S - 1.6 * k, 0, 1.6 * k, S);
      g.fillRect(0, 0, S, 1.6 * k); g.fillRect(0, S - 1.6 * k, S, 1.6 * k);
      /* half unit ticks along the five unit lines */
      for (let i = 0; i < sp.tile; i++) {
        const p = (i + 0.5) * per;
        g.fillRect(p - 0.6 * k, 0, 1.2 * k, 9 * k); g.fillRect(0, p - 0.6 * k, 9 * k, 1.2 * k);
      }
    }
  };
  function mat(sp, S) {
    S = S || sp.size || 512;
    const cv = canvas(S, S), g = cv.getContext('2d');
    g.fillStyle = sp.color; g.fillRect(0, 0, S, S);
    (MATS[sp.pattern] || MATS.speckle)(g, sp, S, mulberry32(sp.seed || 1));
    return cv;
  }

  /* A round swatch for a menu: a wood (its planks) or a mat, drawn from the same settings. */
  function swatch(kind, sp, px) {
    px = px || 96;
    /* the desk shows a few whole planks and a seam; a board and a mat show their grain and weave */
    const src = kind === 'wood' ? planks(sp.planks, 256) : kind === 'board' ? board(sp.board, 256) : mat(sp, 256);
    const cv = canvas(px, px), g = cv.getContext('2d');
    g.save(); g.beginPath(); g.arc(px / 2, px / 2, px / 2 - 1, 0, Math.PI * 2); g.clip();
    const crop = kind === 'wood' ? 256 : 160;
    g.drawImage(src, 0, 0, crop, crop, 0, 0, px, px);
    g.restore();
    return cv;
  }

  root.DeskPaint = { mulberry32, planks, board, groove, mat, swatch };
})(typeof window !== 'undefined' ? window : globalThis);
