/* Sunday Reset desk. A warm low poly desk with a week board of seven wooden day rows,
   a month board of day cards, and a year board of month cards. Zooming slides boards down into
   the desk and pops the next one up. One world unit is one hour on a day row. Built with Three.js. */
(function (root) {
  'use strict';
  const T = root.THREE, Icons = root.Icons, Data = root.Data;
  /* A blocked 3D library leaves World absent so the app can open its existing List fallback. */
  if (!T) return;
  /* Names on the desk are set in Gabarito, a sturdy geometric sans that reads like game pieces.
     Small print (times, notes under a name) is set in Atkinson Hyperlegible Next. */
  const FONT = '"Gabarito", "Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif';
  const UIFONT = '"Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif';

  let RAIL0 = 300, RAIL1 = 1440;
  const X0 = -9.5;
  const railUnits = () => (RAIL1 - RAIL0) / 60;
  const xOf = (min) => X0 + (min - RAIL0) / 60;
  const minOf = (x) => RAIL0 + (x - X0) * 60;
  const ROW_GAP = 1.62, TRACK_D = 1.34, BLOCK_D = 1.08;
  const H_HARD = 0.3, H_SOFT = 0.13, H_SLEEP = 0.09, BOARD_Y = 0.3;
  const rowZ = (i) => (i - 3) * ROW_GAP;
  const TAB_X = -10.95, TAB_W = 2.4, TAB_D = 1.28;
  const GAP = 0.03;
  const CARD = { w: 3.45, d: 2.1, gap: 0.22 };
  const YCARD = { w: 6.1, d: 4.3, gap: 0.36 };

  let renderer, scene, camera, world, maxAniso = 4;
  let hemi, sun, fill;
  /* The desk only needs drawing while something on it moves. touch() says something changed (every
     call into World does it); step() notices anything still easing toward where it belongs. When
     neither is true the desk is at rest and the app skips the frame, shadows and all. */
  let activeUntil = 0, moving = false, stillFrames = 0, lazyOnly = false;
  const nowMs = () => (root.performance ? root.performance.now() : Date.now());
  const touch = (ms) => { activeUntil = Math.max(activeUntil, nowMs() + (ms || 600)); };
  const shadowDirty = () => touch(300);
  const props = {};

  /* == helpers == */
  const matCache = {};
  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache[key]) matCache[key] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.78, metalness: 0 }, opts || {}));
    return matCache[key];
  }
  const flat = (color, opts) => mat(color, Object.assign({ flatShading: true }, opts || {}));
  /* Anything that carries words is matte: a Lambert face has no shine, so under the metered light
     (src/kit/light.js) a printed color reaches the screen as the color it was designed to be. */
  const lamCache = {};
  function lam(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!lamCache[key]) lamCache[key] = new T.MeshLambertMaterial(Object.assign({ color }, opts || {}));
    return lamCache[key];
  }
  const printMat = (opts) => new T.MeshLambertMaterial(opts || {});
  function mesh(geo, material, cast, receive) {
    const m = new T.Mesh(geo, material);
    m.castShadow = cast !== false; m.receiveShadow = receive !== false;
    return m;
  }
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    const x = hexToRgb(a), y = hexToRgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function lum(h) { const [r, g, b] = hexToRgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  /* WCAG contrast between two colors. Labels on the desk aim for 4.5 to 1 or better. */
  function relLum(h) { const [r, g, b] = hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function contrast(a, b) { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /* The most readable label color for a block face: white, or a deep shade of the block's own color. */
  function pickInk(bg, base) {
    const tries = ['#FFFFFF', mix(base, '#141210', 0.55), mix(base, '#141210', 0.72), '#1E1A14'];
    for (const t of tries) if (contrast(bg, t) >= 4.6) return t;
    return tries.reduce((a, t) => (contrast(bg, t) > contrast(bg, a) ? t : a), tries[0]);
  }

  function rrShape(w, d, r) {
    r = Math.max(0.001, Math.min(r, w / 2 - 0.0005, d / 2 - 0.0005));
    const s = new T.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  function slab(shape, height, bevel, y0) {
    const g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.001, height - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, (y0 || 0) + bevel, 0);
    return g;
  }
  const geoCache = new Map();
  function blockGeo(w, d, h) {
    const key = w.toFixed(3) + ':' + d.toFixed(3) + ':' + h;
    if (geoCache.has(key)) return geoCache.get(key);
    const b = Math.min(0.06, w / 2 - 0.012, h / 2 - 0.005);
    const shape = rrShape(Math.max(0.02, w - 2 * b), d - 2 * b, 0.12);
    const g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.002, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    if (geoCache.size > 600) pruneGeo();
    geoCache.set(key, g);
    return g;
  }
  /* the block shapes nobody is wearing go back to the GPU; the ones in use stay cached */
  function pruneGeo() {
    const used = new Set();
    const wear = (m) => { if (m.userData.body) used.add(m.userData.body.geometry); };
    week.blocks.forEach(wear); dayb.blocks.forEach(wear); bench.pieces.forEach(wear);
    if (drag.obj) wear(drag.obj);
    month.cards.concat(year.cards).forEach((c) => c.children.forEach((x) => { if (x.geometry) used.add(x.geometry); }));
    for (const [k, g] of geoCache) { if (!used.has(g)) { g.dispose(); geoCache.delete(k); } }
  }
  function canvasTex(canvas) {
    const t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = maxAniso;
    t.needsUpdate = true;
    return t;
  }
  function setFont(g, size, weight, ui) { g.font = (ui ? Math.min(800, weight || 700) : weight || 800) + ' ' + Math.round(size) + 'px ' + (ui ? UIFONT : FONT); }
  function fitFont(g, text, maxW, size, weight, ui) {
    let s = size;
    setFont(g, s, weight, ui);
    while (s > 8 && g.measureText(text).width > maxW) { s -= 1; setFont(g, s, weight, ui); }
    return s;
  }
  function ellipsize(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }
  /* split a label into two balanced lines */
  function twoLines(text) {
    const w = text.split(' ');
    if (w.length < 2) return [text];
    let best = null;
    for (let i = 1; i < w.length; i++) {
      const a = w.slice(0, i).join(' '), b = w.slice(i).join(' ');
      const score = Math.max(a.length, b.length);
      if (!best || score < best.score) best = { score, lines: [a, b] };
    }
    return best.lines;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }

  /* == block faces == */
  const faceCache = new Map();
  /* The largest size `text` can be drawn at in `room` pixels, capped at `max`. */
  function sizeFor(g, text, room, max, weight, ui) {
    setFont(g, 100, weight || 700, ui);
    const w = g.measureText(text).width || 1;
    return Math.min(max, (100 * room) / w);
  }
  /* Words wrapped greedily into lines that fit `room` at the current font. */
  function wrapWords(g, text, room) {
    const lines = [];
    let cur = '';
    for (const w of text.split(' ')) {
      const t = cur ? cur + ' ' + w : w;
      if (!cur || g.measureText(t).width <= room) cur = t; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  /* The biggest size, up to max, at which text wraps into at most n lines inside room. */
  function wrapFit(g, text, room, max, n, weight, ui) {
    for (let s = Math.floor(max); s >= 10; s--) {
      setFont(g, s, weight || 800, ui);
      const lines = wrapWords(g, text, room);
      if (lines.length <= n && lines.every((l) => g.measureText(l).width <= room)) return { s, lines };
    }
    setFont(g, 10, weight || 800, ui);
    return { s: 10, lines: wrapWords(g, text, room).slice(0, n) };
  }
  /* The printed face of a block. Every block carries its name; the layout is whichever of icon and
     text, text alone, wrapped lines, or text along the block prints the name biggest. Sideways type
     is the last resort: a horizontal layout wins whenever it prints the name at least 0.6 as big.
     Pieces in your rack (piece) share one type size, with their mark above the name. */
  function faceTex(sp) {
    const dU = sp.dU || BLOCK_D;
    const key = [sp.label, sp.sub, sp.icon, sp.ink, sp.wU.toFixed(2), dU, sp.done ? 1 : 0, sp.soft ? 1 : 0, sp.grip ? 1 : 0, sp.stack ? 1 : 0, sp.piece ? sp.pieceS || 1 : 0, sp.contL ? 1 : 0, sp.contR ? 1 : 0].join('|');
    if (faceCache.has(key)) { const t = faceCache.get(key); faceCache.delete(key); faceCache.set(key, t); return t; }
    const k = dU > 1.5 ? 0.8 : 1;
    /* one scale across and down, so a long block's name is never stretched: a face too wide for a
       texture is drawn smaller in both directions */
    let PX = 170 * k;
    if (sp.wU * PX > 2048) PX = 2048 / sp.wU;
    const Wc = Math.max(8, Math.round(sp.wU * PX)), Hc = Math.round(dU * PX);
    const cv = document.createElement('canvas'); cv.width = Wc; cv.height = Hc;
    const g = cv.getContext('2d');
    if (sp.soft) {
      /* open time gets a faint diagonal hatch, so it reads as room to fill */
      g.save(); g.globalAlpha = 0.14; g.strokeStyle = sp.ink; g.lineWidth = Math.max(2, Hc * 0.028);
      const step = Hc * 0.2;
      for (let x = -Hc; x < Wc + Hc; x += step) { g.beginPath(); g.moveTo(x, Hc); g.lineTo(x + Hc, 0); g.stroke(); }
      g.restore();
    }
    /* a piece of a block that runs on into the next lane gets a small arrow at that end */
    const cw = Math.min(Hc * 0.13, Wc * 0.16);
    const arrow = (x, dir) => {
      g.save(); g.globalAlpha = 0.6; g.strokeStyle = sp.ink; g.lineWidth = Math.max(3, Hc * 0.028); g.lineCap = 'round'; g.lineJoin = 'round';
      const a = cw * 0.32;
      g.beginPath(); g.moveTo(x - a * dir, Hc / 2 - a * 1.4); g.lineTo(x + a * dir, Hc / 2); g.lineTo(x - a * dir, Hc / 2 + a * 1.4); g.stroke(); g.restore();
    };
    if (sp.contR) arrow(Wc - cw * 0.55, 1);
    if (sp.contL) arrow(cw * 0.55, -1);
    const left = sp.contL ? cw : 0;
    const H = Hc, W = Wc - left - (sp.contR ? cw : 0);
    g.translate(left, 0);
    g.textBaseline = 'middle'; g.fillStyle = sp.ink;
    const label = sp.label || '';
    const icon = sp.done ? 'check' : sp.icon;
    if (sp.piece) {
      const nm = wrapFit(g, label, W - H * 0.16, H * (sp.pieceS || 0.17), 2);
      Icons.draw(g, icon, W / 2, H * 0.27, H * 0.24, sp.ink);
      g.textAlign = 'center'; setFont(g, nm.s, 800);
      if (nm.lines.length === 1) g.fillText(nm.lines[0], W / 2, H * 0.68);
      else nm.lines.forEach((t, i) => g.fillText(t, W / 2, H * (0.585 + i * nm.s / H * 1.08)));
      return keep(key, cv);
    }
    const two = label.includes(' ') ? twoLines(label) : null;
    const size2 = (room, max) => (two ? Math.min(sizeFor(g, two[0], room, max), sizeFor(g, two[1], room, max)) : 0);
    const pad = H * 0.1, padX = Math.min(pad, W * 0.1);
    const iconRoom = W - H * 0.78 - pad;
    const cand = [];
    if (W > H * 1.3) {
      cand.push({ k: 'icon1', s: sizeFor(g, label, iconRoom, H * 0.28), bonus: 1.12 });
      if (two) cand.push({ k: 'icon2', s: size2(iconRoom, H * 0.24), bonus: 1.06 });
    }
    /* stacked: the name with its time printed under it, preferred on the day board whenever it fits */
    if (sp.stack && sp.sub && W > H * 0.95) {
      const withIcon = W > H * 2.1, room = withIcon ? iconRoom : W - 2 * pad;
      const ns = sizeFor(g, label, room, H * 0.25);
      const subS = Math.min(H * 0.19, sizeFor(g, sp.sub, room, H * 0.19, 700, true));
      if (subS >= 14 && ns >= H * 0.14) cand.push({ k: withIcon ? 'stackI' : 'stack', s: ns, subS, bonus: 1.5 });
    }
    cand.push({ k: 'text1', s: sizeFor(g, label, W - 2 * pad, H * 0.28), bonus: 1 });
    if (two) cand.push({ k: 'text2', s: size2(W - 2 * pad, H * 0.24), bonus: 0.97 });
    /* wrapped: the name in up to three lines across a narrow block, with its time under it if there's room */
    if (W < H * 1.3 && W > H * 0.3) {
      const room = W - 2 * padX;
      const nm = wrapFit(g, label, room, H * 0.25, 3);
      let sub = null;
      if (sp.stack && sp.sub) {
        const sf = wrapFit(g, sp.sub, room, Math.min(nm.s * 0.74, H * 0.16), 2, 700, true);
        if (sf.s >= 13) sub = sf;
      }
      const tall = (s) => nm.lines.length * nm.s * 1.08 + (s ? H * 0.05 + s.lines.length * s.s * 1.18 : 0);
      if (sub && tall(sub) > H - 2 * pad) sub = null;
      if (tall(null) <= H - 2 * pad) cand.push({ k: 'wrap', s: nm.s, nm, sub, bonus: sub ? 1.04 : 1 });
    }
    if (W < H * 0.9) {
      cand.push({ k: 'vert1', s: Math.min(sizeFor(g, label, H * 0.88, H * 0.3), W * 0.62), bonus: 0.92 });
      if (two && W > H * 0.34) cand.push({ k: 'vert2', s: Math.min(size2(H * 0.88, H * 0.26), W * 0.34), bonus: 0.9 });
    }
    cand.sort((x, y) => y.s * y.bonus - x.s * x.bonus);
    let best = cand[0];
    if (best.k === 'vert1' || best.k === 'vert2') {
      const flat = cand.filter((c) => c.k !== 'vert1' && c.k !== 'vert2' && c.s >= 20 && c.s >= best.s * 0.6);
      if (flat.length) best = flat[0];
    }
    const fs = Math.floor(best.s);
    if (fs >= 9) {
      setFont(g, fs, 800);
      if (best.k === 'icon1' || best.k === 'icon2') {
        Icons.draw(g, icon, H * 0.42, H / 2, H * 0.44, sp.ink);
        g.textAlign = 'left';
        const x0 = H * 0.78;
        if (best.k === 'icon2') { g.fillText(two[0], x0, H * 0.35); g.fillText(two[1], x0, H * 0.66); }
        else {
          const subS = sp.sub ? Math.min(fs * 0.72, sizeFor(g, sp.sub, iconRoom, H * 0.2, 700, true)) : 0;
          setFont(g, fs, 800);
          if (subS >= 12) {
            g.fillText(label, x0, H * 0.4);
            setFont(g, subS, 700, true); g.fillText(sp.sub, x0, H * 0.72);
          } else g.fillText(label, x0, H / 2);
        }
      } else if (best.k === 'stack' || best.k === 'stackI') {
        const x0 = best.k === 'stackI' ? H * 0.78 : W / 2;
        if (best.k === 'stackI') Icons.draw(g, icon, H * 0.42, H / 2, H * 0.44, sp.ink);
        g.textAlign = best.k === 'stackI' ? 'left' : 'center';
        g.fillText(label, x0, H * 0.4);
        setFont(g, best.subS, 700, true);
        g.fillText(sp.sub, x0, H * 0.72);
      } else if (best.k === 'wrap') {
        const nm = best.nm, sb = best.sub;
        const total = nm.lines.length * nm.s * 1.08 + (sb ? H * 0.05 + sb.lines.length * sb.s * 1.18 : 0);
        let y = (H - total) / 2;
        g.textAlign = 'center';
        setFont(g, nm.s, 800);
        nm.lines.forEach((t) => { g.fillText(t, W / 2, y + nm.s * 0.56); y += nm.s * 1.08; });
        if (sb) { y += H * 0.05; setFont(g, sb.s, 700, true); sb.lines.forEach((t) => { g.fillText(t, W / 2, y + sb.s * 0.58); y += sb.s * 1.18; }); }
      } else if (best.k === 'text1' || best.k === 'text2') {
        g.textAlign = 'center';
        if (best.k === 'text2') { g.fillText(two[0], W / 2, H * 0.35); g.fillText(two[1], W / 2, H * 0.66); }
        else g.fillText(label, W / 2, H / 2);
      } else {
        g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center';
        if (best.k === 'vert2') { g.fillText(two[0], 0, -fs * 0.56); g.fillText(two[1], 0, fs * 0.56); }
        else g.fillText(label, 0, 0);
        g.restore();
      }
    }
    return keep(key, cv);
  }
  function keep(key, cv) {
    const tex = canvasTex(cv);
    faceCache.set(key, tex);
    if (faceCache.size > 520) pruneFaces();
    return tex;
  }
  /* Free time isn't a block. It's printed on the wood: a faint dashed outline, its mark, its name,
     and its time, so it reads as time kept open on purpose, not a gap nobody filled. */
  function freeTex(sp) {
    const dU = sp.dU || BLOCK_D;
    const key = ['free', sp.label, sp.sub, sp.icon, sp.wU.toFixed(2), dU, ink.free].join('|');
    if (faceCache.has(key)) { const t = faceCache.get(key); faceCache.delete(key); faceCache.set(key, t); return t; }
    const k = dU > 1.5 ? 0.8 : 1;
    let PX = 170 * k;
    if (sp.wU * PX > 2048) PX = 2048 / sp.wU;
    const W = Math.max(8, Math.round(sp.wU * PX)), H = Math.round(dU * PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const pen = ink.free;
    g.save(); g.globalAlpha = 0.42; g.strokeStyle = pen; g.lineWidth = Math.max(3, H * 0.022); g.setLineDash([H * 0.07, H * 0.05]);
    rr(g, g.lineWidth, g.lineWidth, W - 2 * g.lineWidth, H - 2 * g.lineWidth, H * 0.12); g.stroke(); g.restore();
    g.fillStyle = pen; g.textBaseline = 'middle';
    const label = sp.label || '';
    if (W > H * 1.6) {
      const ns = Math.min(H * 0.26, sizeFor(g, label, W - H * 1.1, H * 0.26));
      const subS = sp.sub ? Math.min(H * 0.17, sizeFor(g, sp.sub, W - H * 1.1, H * 0.17, 700, true)) : 0;
      setFont(g, ns, 800);
      const lw = Math.max(g.measureText(label).width, subS ? (setFont(g, subS, 700, true), g.measureText(sp.sub).width) : 0);
      const iconS = H * 0.36, gap = H * 0.14, total = iconS + gap + lw, x0 = Math.max(H * 0.14, (W - total) / 2);
      Icons.draw(g, sp.icon || 'moon', x0 + iconS / 2, H / 2, iconS, pen);
      g.textAlign = 'left';
      setFont(g, ns, 800);
      if (subS >= 12) { g.fillText(label, x0 + iconS + gap, H * 0.4); setFont(g, subS, 700, true); g.fillText(sp.sub, x0 + iconS + gap, H * 0.68); }
      else g.fillText(label, x0 + iconS + gap, H / 2);
    } else if (W > H * 0.55) {
      Icons.draw(g, sp.icon || 'moon', W / 2, H / 2, Math.min(W, H) * 0.42, pen);
    }
    const tex = canvasTex(cv);
    faceCache.set(key, tex);
    if (faceCache.size > 520) pruneFaces();
    return tex;
  }
  /* Forget the oldest faces that no block on the board is wearing. */
  function pruneFaces() {
    const used = new Set();
    const wear = (m) => { if (m.userData.face && m.userData.face.material.map) used.add(m.userData.face.material.map); };
    week.blocks.forEach(wear); dayb.blocks.forEach(wear); bench.pieces.forEach(wear);
    if (drag.obj) wear(drag.obj);
    for (const [k, t] of faceCache) {
      if (faceCache.size <= 400) break;
      if (used.has(t)) continue;
      t.dispose();
      faceCache.delete(k);
    }
  }

  /* colors and height for a block, from its kind of time */
  const cats = () => (deskTheme && deskTheme.blocks) || Data.CATS;
  function look(b) {
    const C = cats(), cat = C[b.cat] || C.yours;
    let base = cat.base, ink = cat.ink, h = H_HARD;
    if (b.sleep) { h = H_SLEEP; }
    else if (b.soft) { base = mix(cat.base, b.cat === 'work' ? '#EAF2FA' : '#FFFAF2', b.cat === 'work' ? 0.42 : 0.5); h = H_SOFT; ink = pickInk(base, cat.base); }
    if (b.done) { base = mix(base, '#E8E2D6', 0.55); ink = pickInk(base, cat.base); }
    if (b.dinner && !b.planned) { base = mix(cat.base, '#F3E7D2', 0.3); ink = pickInk(base, cat.base); }
    if (contrast(base, ink) < 4.5) ink = pickInk(base, cat.base);
    return { base, ink, h };
  }

  /* == a block on a day row == */
  const haloGeo = new T.PlaneGeometry(1, 1); haloGeo.rotateX(-Math.PI / 2);
  let haloMat = null;
  /* A small brass padlock sits on locked blocks. */
  const lockBodyGeo = new T.BoxGeometry(0.2, 0.15, 0.1);
  const lockLoopGeo = new T.TorusGeometry(0.065, 0.022, 6, 14, Math.PI);
  function makeLock() {
    const g = new T.Group();
    const brass = mat('#C9A24B', { roughness: 0.35, metalness: 0.55 });
    const body = mesh(lockBodyGeo, brass); body.position.y = 0.075;
    const loop = mesh(lockLoopGeo, brass); loop.position.y = 0.15;
    g.add(body, loop);
    return g;
  }
  /* free time keeps an invisible body so it can still be tapped and dropped on */
  const freeMat = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const gripTexCache = {};
  function gripTex(ink) {
    if (gripTexCache[ink]) return gripTexCache[ink];
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96;
    const g = cv.getContext('2d'); g.fillStyle = ink; g.globalAlpha = 0.75;
    for (let c = 0; c < 2; c++) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(20 + c * 24, 20 + k * 28, 7, 0, Math.PI * 2); g.fill(); }
    return (gripTexCache[ink] = canvasTex(cv));
  }
  const gripGeo = new T.PlaneGeometry(1, 1); gripGeo.rotateX(-Math.PI / 2);
  /* every block's printed face is the same square, scaled; its material and its grip's are its own */
  const faceGeo = new T.PlaneGeometry(1, 1); faceGeo.rotateX(-Math.PI / 2);
  function makeBlock(b) {
    const g = new T.Group();
    const face = new T.Mesh(faceGeo, printMat({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.castShadow = false; face.receiveShadow = true;
    const body = mesh(blockGeo(1, BLOCK_D, H_HARD), mat('#FFFFFF'));
    g.add(body, face);
    const pin = makeLock();
    pin.visible = false;
    g.add(pin);
    const halo = new T.Mesh(haloGeo, haloMat);
    halo.visible = false; halo.renderOrder = 1;
    g.add(halo);
    const grip = new T.Mesh(gripGeo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    grip.visible = false; grip.renderOrder = 2;
    g.add(grip);
    g.userData = { body, face, pin, halo, grip, canGrip: false, key: null, w: -1, sig: '', target: new T.Vector3(), lift: 0, squash: 0, shrink: null, pickable: true, kind: 'block' };
    body.userData.owner = g; face.userData.owner = g;
    return g;
  }
  /* A block that leaves the desk gives back what only it held: its face's material and its grip's.
     Its geometry, its body's material, and its printed face are shared, and stay. */
  function dropBlock(m) {
    if (m.parent) m.parent.remove(m);
    const u = m.userData;
    if (u.face && u.face.material) u.face.material.dispose();
    if (u.grip && u.grip.material) u.grip.material.dispose();
  }
  /* a soft glow under the block you picked */
  function haloTexture() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255, 214, 120, 1)'); gr.addColorStop(0.55, 'rgba(255, 214, 120, 0.7)'); gr.addColorStop(1, 'rgba(255, 214, 120, 0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return canvasTex(cv);
  }
  /* opts: hMul (taller bricks), grip (print a drag handle on blocks you can move) */
  function dressBlock(g, b, wU, dU, opts) {
    const u = g.userData;
    opts = opts || {};
    const lk = look(b);
    dU = dU || BLOCK_D;
    const hMul = opts.hMul || 1, h = lk.h * hMul;
    const w = Math.max(0.05, wU - GAP * 2);
    const sub = b.sub != null ? b.sub : '';
    const sig = [themeV, b.label || b.name, sub, b.icon, lk.base, lk.ink, h, w.toFixed(3), dU, b.fixed && !b.sleep ? 1 : 0, b.done ? 1 : 0, b.soft ? 1 : 0, opts.grip ? 1 : 0, b.stack ? 1 : 0, b.free ? 1 : 0, b.piece ? b.pieceS || 1 : 0, b.contL ? 1 : 0, b.contR ? 1 : 0].join('|');
    u.block = b; u.h = h; u.hMul = hMul;
    if (sig === u.sig) return;
    u.sig = sig; u.w = w;
    u.dU = dU;
    if (b.free) {
      /* no brick: only the printing on the board, still there to tap */
      u.h = 0.01;
      u.body.visible = true;
      u.body.material = freeMat; u.body.castShadow = false;
      u.body.geometry = blockGeo(Math.round(w * 200) / 200, dU, 0.02);
      u.face.scale.set(Math.max(0.02, w - 0.06), 1, dU - 0.06);
      u.face.position.y = 0.026;
      u.halo.scale.set(w + 0.9, 1, dU + 0.9); u.halo.position.y = 0.012;
      const ft = freeTex({ label: b.label || b.name, sub, icon: b.icon, wU: Math.round(w * 20) / 20, dU });
      if (u.face.material.map !== ft) { u.face.material.map = ft; u.face.material.needsUpdate = true; }
      u.pin.visible = false;
      return;
    }
    u.body.geometry = blockGeo(Math.round(w * 200) / 200, dU, h);
    u.body.material = lam(lk.base); u.body.castShadow = true;
    const face = u.face;
    face.scale.set(Math.max(0.02, w - 0.1), 1, dU - 0.1);
    face.position.y = h + 0.004;
    u.halo.scale.set(w + 0.9, 1, dU + 0.9);
    u.halo.position.y = 0.012;
    const grip = !!opts.grip && !b.soft && !b.sleep && !b.fixed && !b.done;
    const tex = faceTex({ label: b.label || b.name, sub, icon: b.icon, ink: lk.ink, wU: Math.round(w * 20) / 20, dU, done: b.done, soft: !!b.soft && !b.done, grip, stack: !!b.stack, piece: !!b.piece, pieceS: b.pieceS, contL: !!b.contL, contR: !!b.contR });
    if (face.material.map !== tex) { face.material.map = tex; face.material.needsUpdate = true; }
    u.canGrip = grip && w > dU * 0.9;
    if (u.canGrip) {
      const gs = Math.min(0.34, dU * 0.2);
      u.grip.material.map = gripTex(lk.ink); u.grip.material.needsUpdate = true;
      u.grip.scale.set(gs * 0.66, 1, gs);
      u.grip.position.set(w / 2 - gs * 0.55, h + 0.012, 0);
    }
    u.pin.visible = !!(b.fixed && !b.sleep && w > 0.3);
    const lockS = dU > 1.5 ? 2.0 : 1.15;
    u.pin.scale.setScalar(lockS);
    u.pin.position.set(-w / 2 + Math.min(0.22 * lockS, w * 0.28), lk.h * (u.hMul || 1), -dU / 2 + 0.16 * lockS);
  }

  /* == textures for the boards == */
  function tabTexture(r) {
    const W = 480, H = 256;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const bg = r.today ? '#1D5B56' : r.focus ? '#FFE9B8' : '#F2E6CF';
    const ink = r.today ? '#FFFFFF' : '#4E3719';
    g.fillStyle = bg; rr(g, 6, 6, W - 12, H - 12, 34); g.fill();
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = ink;
    setFont(g, 58, 800);
    const wd = r.wd.toUpperCase();
    g.fillText(wd, 34, 106);
    const wdW = g.measureText(wd).width;
    setFont(g, 96, 900);
    g.fillText(String(r.num), 34 + wdW + 18, 110);
    const line = r.trip ? r.trip : r.markers && r.markers.length ? r.markers[0] : r.due ? r.due + (r.due === 1 ? ' thing due' : ' things due') : '';
    if (line) {
      const col = r.today ? '#FFE3A6' : r.trip ? '#2A4B90' : r.markers && r.markers.length ? '#983A5E' : '#963A28';
      const icon = r.trip ? 'plane' : r.markers && r.markers.length ? r.markerIcon || 'cake' : 'flag';
      Icons.draw(g, icon, 56, 186, 50, col);
      g.fillStyle = col; setFont(g, 42, 700, true);
      g.fillText(ellipsize(g, line, W - 110), 92, 202);
    }
    return canvasTex(cv);
  }

  /* Print on the boards takes the theme's ink set (src/kit/themes.js, INKS): Warm's is the dark set,
     which passes 4.5 to 1 on every board wood it goes with. */
  const INK0 = { name: '#2B1D0F', mark: '#3F2A14', note: '#45311C', ruler: '#35220E', hours: '#4A3016', open: '#3F2A12', free: '#3F2A12' };
  /* hour labels on the rulers: 5 am, noon, 7 pm; or 05, 12, 19 with a 24 hour clock */
  let clock24 = false;
  const hourLabel = (hr, withSuffix) => {
    const h = hr % 24;
    const text = clock24 ? String(hr === 24 && RAIL1 === 1440 ? 24 : h).padStart(2, '0') + ':00' : h === 12 ? 'noon' : hr === 24 ? 'midnight' : ((h % 12) || 12) + (withSuffix ? (h < 12 ? ' am' : ' pm') : '');
    return text + (hr >= 24 && RAIL1 > 1440 ? ' +1 day' : '');
  };
  let ink = INK0, deskTheme = null, themeV = 0;
  /* Print on the wood is cut into it, the way the grooves are: ink in the cut, and along its near
     edge a thin line where the wood catches the light. Light ink on a dark board is an inlay, so
     its edge is a shadow along the far side. One kind of mark for everything that can't move. */
  const lip = () => (lum(ink.name) < 0.45 ? { c: 'rgba(255, 244, 222, 0.5)', dy: 1 } : { c: 'rgba(0, 0, 0, 0.42)', dy: -1 });
  function cutText(g, text, x, y, px) {
    const pen = g.fillStyle, lp = lip();
    g.fillStyle = lp.c; g.fillText(text, x, y + lp.dy * (px || 2));
    g.fillStyle = pen; g.fillText(text, x, y);
  }
  function cutRect(g, x, y, w, h, px) {
    const pen = g.fillStyle, lp = lip();
    g.fillStyle = lp.c; g.fillRect(x, y + lp.dy * (px || 2), w, h);
    g.fillStyle = pen; g.fillRect(x, y, w, h);
  }
  function cutIcon(g, name, x, y, size, color, px) {
    const lp = lip();
    Icons.draw(g, name, x, y + lp.dy * (px || 2), size, lp.c);
    Icons.draw(g, name, x, y, size, color);
  }
  function headerTexture() {
    const W = Math.round(railUnits() * 200), H = 150;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const pxu = W / railUnits();
    g.fillStyle = ink.hours; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let hr = Math.ceil(RAIL0 / 60); hr <= RAIL1 / 60; hr++) {
      const x = (hr - RAIL0 / 60) * pxu;
      const major = hr % 3 === 0;
      cutRect(g, x - 3, H - (major ? 40 : 24), 6, major ? 40 : 24, 3);
      const lab = clock24 && hr < 24 ? (major ? hourLabel(hr) : String(hr)) : hourLabel(hr, major || hr === RAIL0 / 60 || hr >= 24);
      if (hr > RAIL0 / 60 && hr < RAIL1 / 60) {
        if (hr >= 24) {
          fitFont(g, lab.replace(' +1 day', ''), 185, major ? 56 : 44, major ? 800 : 700, true);
          cutText(g, lab.replace(' +1 day', ''), x, H * 0.24, 3.5);
          setFont(g, 28, 700, true); cutText(g, '+1 day', x, H * 0.56, 2);
        } else { setFont(g, major ? 56 : 44, major ? 800 : 700, true); cutText(g, lab, x, H * 0.36, 3.5); }
      }
    }
    return canvasTex(cv);
  }
  function gapTexture(text) {
    const cv = document.createElement('canvas'); cv.width = 420; cv.height = 110;
    const g = cv.getContext('2d');
    g.fillStyle = ink.open; setFont(g, 46, 800); g.textBaseline = 'middle'; g.textAlign = 'center';
    cutText(g, text, 210, 58, 2);
    return canvasTex(cv);
  }
  const gapTexCache = new Map();
  const gapTex = (t) => { if (!gapTexCache.has(t)) gapTexCache.set(t, gapTexture(t)); return gapTexCache.get(t); };

  const CAT = (c) => (cats()[c] || cats().yours).base;
  function drawStrip(g, blocks, x, y, w, h) {
    const vis = blocks.filter((b) => !b.sleep);
    if (!vis.length) return;
    const a = vis[0].start, z = vis[vis.length - 1].start + vis[vis.length - 1].dur;
    const k = w / Math.max(60, z - a);
    g.save(); rr(g, x, y, w, h, h / 2); g.clip();
    g.fillStyle = 'rgba(120, 90, 50, 0.16)'; g.fillRect(x, y, w, h);
    for (const b of vis) {
      g.fillStyle = b.soft ? mix(CAT(b.cat), '#F3E7D2', 0.4) : CAT(b.cat);
      g.fillRect(x + (b.start - a) * k, y, Math.max(1, b.dur * k - 1), h);
    }
    g.restore();
  }

  function cardTexture(c) {
    const W = 448, H = 272;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    /* past days and days outside the month get quieter cards, never faded text */
    const quiet = !c.inMonth, past = c.past && c.inMonth;
    g.fillStyle = quiet ? '#E3DDD2' : past ? '#E6DCCB' : c.weekend ? '#F4E4C8' : '#F8F0E1'; rr(g, 4, 4, W - 8, H - 8, 26); g.fill();
    if (c.trip) {
      g.fillStyle = '#2A4B90'; rr(g, 4, 4, W - 8, 74, [26, 26, 0, 0]); g.fill();
      Icons.draw(g, 'plane', 40, 41, 40, '#FFFFFF');
      g.fillStyle = '#FFFFFF'; setFont(g, 34, 800); g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText(ellipsize(g, c.trip, W - 170), 72, 43);
    }
    g.textBaseline = 'alphabetic'; g.textAlign = 'right';
    if (c.today) { g.fillStyle = '#1D5B56'; g.beginPath(); g.arc(W - 62, (c.trip ? 41 : 60), 40, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = c.today ? '#FFFFFF' : c.trip ? '#FFFFFF' : quiet ? '#5B4E40' : '#3A2C1E';
    setFont(g, c.trip ? 44 : 60, 900);
    const numW = g.measureText(String(c.num)).width;
    g.fillText(String(c.num), c.today ? W - 62 + numW / 2 : W - 26, c.trip ? 58 : 82);
    /* where the day's number starts, so a name on its row stops short of it */
    const numLeft = c.today ? W - 102 : W - 26 - numW;
    g.textAlign = 'left';
    let y = c.trip ? 124 : 70;
    const lines = (c.flags || []).filter((f) => f.kind !== 'trip').slice(0, 2);
    for (const f of lines) {
      const col = f.kind === 'marker' ? '#983A5E' : '#6E3F8A';
      Icons.draw(g, f.icon || 'star', 42, y - 12, 38, col);
      g.fillStyle = col; setFont(g, 37, 800);
      const room = !c.trip && y < 100 ? numLeft - 18 - 70 : W - 90;
      g.fillText(ellipsize(g, f.name, room), 70, y);
      y += 46;
    }
    if (c.due) {
      const t = c.due + ' due';
      setFont(g, 40, 700, true);
      const tw = g.measureText(t).width + 34;
      g.fillStyle = '#E88A6E'; rr(g, 22, H - 116, tw, 54, 27); g.fill();
      g.fillStyle = '#3A1A10'; g.fillText(t, 39, H - 76);
      /* the chip sits beside the day's hours, not over them */
      const more = !lines.length && !c.trip ? (c.yours ? c.yours + ' yours' : c.open ? c.open + ' open' : '') : '';
      setFont(g, 38, 700, true);
      if (more && 22 + tw + 16 + g.measureText(more).width <= W - 24) { g.fillStyle = c.yours ? '#6B4F0C' : '#5E4C36'; g.fillText(more, 22 + tw + 16, H - 76); }
    } else if (c.todo) {
      const t = c.todo + (c.todo === 1 ? ' to do' : ' to dos');
      setFont(g, 40, 700, true);
      g.fillStyle = '#1D6376'; g.fillText(t, 26, H - 74);
    } else if (c.yours && !lines.length && !c.trip) {
      setFont(g, 42, 700, true);
      g.fillStyle = '#6B4F0C'; g.fillText(c.yours + ' yours', 26, H - 72);
    } else if (c.open && !lines.length && !c.trip) {
      /* a day with none of your own time still says something: how much of it is open */
      setFont(g, 42, 700, true);
      g.fillStyle = '#5E4C36'; g.fillText(c.open + ' open', 26, H - 72);
    }
    if (c.dinner) { Icons.draw(g, 'pot', W - 44, H - 86, 34, '#3B7F45'); }
    drawStrip(g, c.blocks || [], 22, H - 46, W - 44, 22);
    return canvasTex(cv);
  }

  function monthTexture(m) {
    const W = 800, H = 564;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = m.current ? '#FFF7E8' : '#F4EAD8'; rr(g, 6, 6, W - 12, H - 12, 34); g.fill();
    if (m.current) { g.strokeStyle = '#1D5B56'; g.lineWidth = 8; rr(g, 10, 10, W - 20, H - 20, 30); g.stroke(); }
    g.fillStyle = '#3A2C1E'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    setFont(g, 70, 900); g.fillText(m.name, 34, 86);
    const nw = g.measureText(m.name).width;
    /* the year steps back in a real color, never faded */
    setFont(g, 34, 800); g.fillStyle = '#6E5E4A'; g.fillText(String(m.year), 34 + nw + 16, 82); g.fillStyle = '#3A2C1E';
    // mini calendar
    const cx0 = 34, cy0 = 116, cw = 50, ch = 50;
    setFont(g, 22, 800); g.textAlign = 'center'; g.fillStyle = '#6A5440';
    weekLetters().forEach((l, i) => g.fillText(l, cx0 + i * cw + cw / 2 - 3, cy0 + 18));
    m.days.forEach((d) => {
      const x = cx0 + d.col * cw, y = cy0 + 28 + d.row * ch;
      let bg = 'rgba(120, 90, 50, 0.1)', ink = '#5A4632';
      if (d.trip) { bg = '#2A4B90'; ink = '#FFFFFF'; }
      else if (d.marker) { bg = '#983A5E'; ink = '#FFFFFF'; }
      else if (d.big) { bg = '#7E4E9C'; ink = '#FFFFFF'; }
      g.fillStyle = bg; rr(g, x, y, cw - 6, ch - 6, 10); g.fill();
      if (d.today) { g.strokeStyle = '#1D5B56'; g.lineWidth = 5; rr(g, x - 1, y - 1, cw - 4, ch - 4, 11); g.stroke(); }
      if (d.trip || d.marker || d.big || d.today) { g.fillStyle = d.today && !d.trip && !d.marker && !d.big ? '#1D5B56' : ink; setFont(g, 26, 900); g.fillText(String(d.num), x + (cw - 6) / 2, y + 32); }
      if (d.due) { g.fillStyle = '#E07A5F'; g.beginPath(); g.arc(x + cw - 14, y + 8, 6, 0, Math.PI * 2); g.fill(); }
    });
    // what's big this month
    const lx = cx0 + 7 * cw + 24, lw = W - lx - 26;
    let y = 150, shown = 0;
    g.textAlign = 'left';
    /* a quiet month has nothing to list, and says nothing; a busy one lists what fits above its hours
       and says how many more there are */
    const bottom = m.yours ? H - 112 : H - 24;
    for (const it of m.list) {
      setFont(g, 36, 800);
      const wide = g.measureText(it.name).width > lw && it.name.includes(' ');
      const parts2 = wide ? twoLines(it.name) : [it.name];
      const left = m.list.length - shown - 1;
      if (y + 48 + (parts2.length - 1) * 38 > bottom - (left > 0 ? 40 : 0)) break;
      const col = it.kind === 'trip' ? '#2A4B90' : it.kind === 'marker' ? '#983A5E' : it.kind === 'due' ? '#963A28' : '#6E3F8A';
      g.fillStyle = col; setFont(g, 32, 900);
      g.fillText(it.when, lx, y);
      setFont(g, 36, 800);
      g.fillStyle = '#3A2C1E';
      parts2.forEach((t, k) => g.fillText(ellipsize(g, t, lw), lx, y + 40 + k * 38));
      y += 86 + (parts2.length - 1) * 38;
      shown++;
    }
    if (shown < m.list.length) { g.fillStyle = '#6A5440'; setFont(g, 30, 800); g.fillText('and ' + (m.list.length - shown) + ' more', lx, y - 8); }
    if (m.yours) { g.fillStyle = '#6B4F0C'; setFont(g, 46, 800); g.fillText(m.yours, lx, H - 64); setFont(g, 30, 700, true); g.fillText('yours', lx, H - 28); }
    return canvasTex(cv);
  }

  /* == building the boards == */
  /* Wood with a quiet grain, drawn once per tone. Board tops map one tile to 12 units. */
  const woodTexCache = {};
  function woodTex(base) {
    if (woodTexCache[base]) return woodTexCache[base];
    const S = 1024, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    const rnd = mulberry32(base.length * 97 + 11);
    for (let i = 0; i < 120; i++) {
      const y0 = rnd() * S, amp = 4 + rnd() * 14, freq = 0.004 + rnd() * 0.006, ph = rnd() * 6.28;
      g.strokeStyle = rnd() < 0.8 ? 'rgba(120, 72, 28, ' + (0.035 + rnd() * 0.06) + ')' : 'rgba(255, 236, 200, ' + (0.05 + rnd() * 0.05) + ')';
      g.lineWidth = 1 + rnd() * 3.5;
      g.beginPath();
      for (let x = -20; x <= S + 20; x += 16) { const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.25; if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    }
    const t = canvasTex(cv);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 12, 1 / 12);
    woodTexCache[base] = t;
    return t;
  }
  /* The desk: planks of a few tones with their seams and end joints, so the stage has some life. */
  function plankTex() {
    const S = 1024, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    const rnd = mulberry32(1234), tones = ['#C3955F', '#BD8E57', '#C79B66', '#B98A54'];
    const n = 4, ph = S / n;
    for (let i = 0; i < n; i++) {
      const y0 = i * ph;
      g.fillStyle = tones[i]; g.fillRect(0, y0, S, ph);
      for (let k = 0; k < 34; k++) {
        const yy = y0 + rnd() * ph, amp = 2 + rnd() * 7, freq = 0.004 + rnd() * 0.006, phs = rnd() * 6.28;
        g.strokeStyle = rnd() < 0.8 ? 'rgba(110, 64, 24, ' + (0.04 + rnd() * 0.06) + ')' : 'rgba(255, 236, 200, ' + (0.05 + rnd() * 0.05) + ')';
        g.lineWidth = 1 + rnd() * 3;
        g.beginPath();
        for (let x = -20; x <= S + 20; x += 16) { const y = Math.max(y0 + 2, Math.min(y0 + ph - 2, yy + Math.sin(x * freq + phs) * amp)); if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
      }
      /* the seam under each plank, and one end joint somewhere along it */
      g.fillStyle = 'rgba(70, 38, 12, 0.5)'; g.fillRect(0, y0, S, 3);
      g.fillStyle = 'rgba(255, 230, 190, 0.18)'; g.fillRect(0, y0 + 3, S, 2);
      const jx = Math.round(S * (0.15 + rnd() * 0.7));
      g.fillStyle = 'rgba(70, 38, 12, 0.45)'; g.fillRect(jx, y0, 3, ph);
    }
    const t = canvasTex(cv);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  const boardMat = new T.MeshLambertMaterial({ map: woodTex('#D8AD72') });
  const woodMat = () => boardMat;
  /* a groove: a shadow along its far edge, a little light along its near edge */
  function grooveTex() {
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 256;
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#9E7442'); gr.addColorStop(0.1, '#BF925A'); gr.addColorStop(0.5, '#C99D62'); gr.addColorStop(0.92, '#CFA56B'); gr.addColorStop(1, '#E2BE88');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
    return canvasTex(cv);
  }
  const trackMat = new T.MeshLambertMaterial({ map: grooveTex() });
  const benchMat = new T.MeshLambertMaterial({ map: woodTex('#D2A468') });

  const week = { group: null, base: null, header: null, ruler: null, rows: [], blocks: new Map(), gapMarks: [], focus: 3 };
  function buildWeek() {
    const g = new T.Group();
    const base = mesh(slab(rrShape(WEEK_BOX.x1 - WEEK_BOX.x0, 12.9, 0.6), BOARD_Y, 0.05, 0), woodMat());
    base.position.set((WEEK_BOX.x0 + WEEK_BOX.x1) / 2, 0, -0.35);
    const header = new T.Mesh(new T.PlaneGeometry(railUnits(), 0.75), printMat({ map: headerTexture(), transparent: true, depthWrite: false }));
    header.rotation.x = -Math.PI / 2; header.position.set(X0 + railUnits() / 2, BOARD_Y + 0.003, rowZ(0) - 1.12);
    g.add(base, header);
    for (let i = 0; i < 7; i++) {
      const row = new T.Group();
      row.position.z = rowZ(i);
      const track = mesh(new T.BoxGeometry(railUnits() + 0.1, 0.02, TRACK_D), trackMat, false, true);
      track.position.set(X0 + railUnits() / 2, BOARD_Y + 0.005, 0);
      const tab = mesh(slab(rrShape(TAB_W, TAB_D, 0.16), 0.12, 0.03, BOARD_Y), mat('#EFE2C8', { roughness: 0.8 }));
      tab.position.x = TAB_X;
      const tabFace = new T.Mesh(new T.PlaneGeometry(TAB_W - 0.06, TAB_D - 0.06), printMat({ transparent: true, alphaTest: 0.02 }));
      tabFace.rotation.x = -Math.PI / 2; tabFace.position.set(TAB_X, BOARD_Y + 0.125, 0); tabFace.receiveShadow = true;
      tabFace.userData = { pickable: true, kind: 'tab', row: i };
      const blocks = new T.Group();
      const lifter = new T.Group();
      lifter.add(track, blocks);
      row.add(lifter, tab, tabFace);
      row.userData = { tabFace, blocks, lifter, track, sig: '', index: i, lift: 0, liftTo: 0, depth: BLOCK_D };
      g.add(row);
      week.rows.push(row);
    }
    week.group = g; week.base = base; week.header = header;
    g.userData.shown = true;
    return g;
  }

  /* rows: [{ date, wd, num, today, focus, markers, trip, due, blocks }] */
  function setWeek(rows, opts) {
    opts = opts || {};
    const seen = new Set();
    rows.forEach((r, i) => {
      const row = week.rows[i];
      const sig = [r.date, r.wd, r.num, r.today, r.focus, (r.markers || []).join(','), r.trip || '', r.due || 0, r.markerIcon || ''].join('|');
      if (row.userData.sig !== sig) {
        row.userData.sig = sig;
        const old = row.userData.tabFace.material.map;
        row.userData.tabFace.material.map = tabTexture(r);
        row.userData.tabFace.material.needsUpdate = true;
        if (old) old.dispose();
      }
      row.userData.date = r.date;
      const depth = BLOCK_D;
      row.userData.depth = depth;
      for (const b of r.blocks) {
        const key = r.date + '|' + b.key;
        seen.add(key);
        let m = week.blocks.get(key);
        const wU = b.dur / 60;
        const x = xOf(b.start) + wU / 2;
        if (!m) {
          m = makeBlock(b);
          m.userData.key = key;
          m.position.set(x, BOARD_Y, 0);
          m.scale.set(1, 0.001, 1);
          m.userData.grow = 0;
          m.userData.newTile = true;
          row.userData.blocks.add(m);
          week.blocks.set(key, m);
        } else if (m.parent !== row.userData.blocks) {
          const wp = m.getWorldPosition(new T.Vector3());
          row.userData.blocks.add(m);
          m.position.copy(row.userData.blocks.worldToLocal(wp));
        }
        m.userData.row = i; m.userData.date = r.date; m.userData.bkey = b.key;
        m.userData.shrink = null;
        m.userData.target.set(x, BOARD_Y, 0);
        dressBlock(m, b, wU, depth);
        if (m.userData.wave && !m.userData.wave.show) moveTile(m, { show: true });
      }
    });
    week.blocks.forEach((m, key) => {
      if (!seen.has(key) && m.userData.shrink == null && !(m.userData.wave && !m.userData.wave.show)) {
        if (opts.direction) moveTile(m, { show: false, delay: waveDelay({ x: m.userData.target.x, z: rowZ(m.userData.row) }, WEEK_BOX, navigationDirection), finish: () => { dropBlock(m); week.blocks.delete(key); } });
        else m.userData.shrink = 1;
      }
    });
    setGapMarks(rows);
  }
  function setGapMarks(rows) {
    const list = [];
    rows.forEach((r, i) => (r.gaps || []).forEach((gp) => { if (gp[1] - gp[0] >= 60) list.push({ i, gp }); }));
    while (week.gapMarks.length < list.length) {
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), printMat({ transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      week.group.add(m);
      week.gapMarks.push(m);
    }
    week.gapMarks.forEach((m, k) => {
      const it = list[k];
      m.visible = !!it;
      if (!it) return;
      const mins = it.gp[1] - it.gp[0];
      const hh = Math.round(mins / 30) / 2;
      const text = (hh % 1 ? hh.toFixed(1) : String(hh)) + ' h open';
      const tex = gapTex(text);
      if (m.material.map !== tex) { m.material.map = tex; m.material.needsUpdate = true; }
      /* a long gap gets a bigger label, so a whole open day reads from across the desk */
      const gh = (it.gp[1] - it.gp[0]) / 60;
      const w = Math.min(1.9 + Math.max(0, gh - 4) * 0.12, 3.2, gh - 0.1);
      m.scale.set(w, w * 110 / 420, 1);
      m.position.set(xOf((it.gp[0] + it.gp[1]) / 2), BOARD_Y + 0.022, rowZ(it.i));
    });
  }

  const month = { group: null, base: null, cards: [], header: null, rows: 0 };
  function cardPos(i, rows) {
    const col = i % 7, row = Math.floor(i / 7);
    const w = 7 * CARD.w + 6 * CARD.gap, d = rows * CARD.d + (rows - 1) * CARD.gap;
    return new T.Vector3(-w / 2 + CARD.w / 2 + col * (CARD.w + CARD.gap), BOARD_Y, -d / 2 + CARD.d / 2 + row * (CARD.d + CARD.gap) + 0.3);
  }
  /* the week's days in the board's order: from Sunday, or from Monday (setWeekStart) */
  let weekFirst = 0;
  const DAYS7 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekNames = () => DAYS7.slice(weekFirst).concat(DAYS7.slice(0, weekFirst));
  const weekLetters = () => weekNames().map((d) => d[0]);
  function setWeekStart(n) {
    n = n === 1 ? 1 : 0;
    if (n === weekFirst) return;
    weekFirst = n;
    if (month.header) swapMap(month.header.material, weekdayHeaderTexture());
    touch();
  }
  function weekdayHeaderTexture() {
    const W = 3000, H = 90;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    /* on the board's own ink: a dark board gets light names */
    g.fillStyle = ink.hours; g.textAlign = 'center'; g.textBaseline = 'middle';
    setFont(g, 54, 900);
    const colW = W / 7;
    weekNames().forEach((d, i) => cutText(g, d, colW * (i + 0.5), H / 2, 2));
    return canvasTex(cv);
  }
  function buildMonth() {
    const g = new T.Group();
    const base = mesh(slab(rrShape(26.6, 15.4, 0.6), BOARD_Y, 0.05, 0), woodMat());
    g.add(base);
    const header = new T.Mesh(new T.PlaneGeometry(7 * CARD.w + 6 * CARD.gap, (7 * CARD.w + 6 * CARD.gap) * 90 / 3000), printMat({ map: weekdayHeaderTexture(), transparent: true, depthWrite: false }));
    header.rotation.x = -Math.PI / 2;
    g.add(header);
    const geo = blockGeo(CARD.w, CARD.d, 0.16);
    for (let i = 0; i < 42; i++) {
      const c = new T.Group();
      const body = mesh(geo, mat('#E9D8B8', { roughness: 0.8 }));
      const face = new T.Mesh(new T.PlaneGeometry(CARD.w - 0.08, CARD.d - 0.08), printMat({ transparent: true, alphaTest: 0.02 }));
      face.geometry.rotateX(-Math.PI / 2); face.position.y = 0.165; face.receiveShadow = true;
      c.add(body, face);
      c.userData = { pickable: true, kind: 'card', face, target: new T.Vector3(), lift: 0, tileShown: false };
      body.userData.owner = c; face.userData.owner = c;
      g.add(c);
      month.cards.push(c);
    }
    month.group = g; month.base = base; month.header = header;
    return g;
  }
  /* cells: [{ date, num, inMonth, today, past, trip, flags, due, todo, dinner, blocks }] */
  function setMonth(cells) {
    const changing = layout === 'month' && month.firstDate && month.firstDate !== cells[0].date;
    const rows = cells.length / 7;
    month.rows = rows;
    const d = rows * CARD.d + (rows - 1) * CARD.gap;
    month.base.userData.baseScale = new T.Vector3(1, 1, (d + 1.9) / 15.4);
    if (!month.base.userData.pop) month.base.scale.copy(month.base.userData.baseScale);
    month.base.position.z = 0.05;
    month.header.position.x = 0; month.header.position.z = -d / 2 + 0.3 - 0.5;
    if (!month.header.userData.pop) month.header.position.y = BOARD_Y + 0.004;
    month.header.userData.baseY = BOARD_Y + 0.004;
    month.cards.forEach((c, i) => {
      const cell = cells[i];
      c.userData.present = !!cell;
      c.userData.baseY = BOARD_Y;
      if (!cell) { c.visible = false; c.userData.wave = null; c.userData.tileShown = false; tileMotions.delete(c); return; }
      if (layout === 'month' && !c.userData.wave) { c.visible = true; if (!changing) c.position.y = BOARD_Y + (c.userData.lift || 0); }
      c.userData.date = cell.date;
      c.userData.target.copy(cardPos(i, rows));
      if (!c.userData.wave && !(changing && c.userData.tileShown)) { c.position.x = c.userData.target.x; c.position.z = c.userData.target.z; }
      const sig = JSON.stringify(cell);
      if (c.userData.sig !== sig) {
        c.userData.sig = sig;
        const old = c.userData.face.material.map;
        c.userData.face.material.map = cardTexture(cell);
        c.userData.face.material.needsUpdate = true;
        if (old) old.dispose();
      }
    });
    if (changing) waveTiles(month.cards.filter((c) => c.userData.present), true, { x0: -13, x1: 13, z0: -d / 2, z1: d / 2 });
    month.firstDate = cells[0].date;
  }

  const year = { group: null, base: null, cards: [] };
  function ycardPos(i) {
    const col = i % 4, row = Math.floor(i / 4);
    const w = 4 * YCARD.w + 3 * YCARD.gap, d = 3 * YCARD.d + 2 * YCARD.gap;
    return new T.Vector3(-w / 2 + YCARD.w / 2 + col * (YCARD.w + YCARD.gap), BOARD_Y, -d / 2 + YCARD.d / 2 + row * (YCARD.d + YCARD.gap));
  }
  function buildYear() {
    const g = new T.Group();
    const base = mesh(slab(rrShape(27, 15.2, 0.6), BOARD_Y, 0.05, 0), woodMat());
    g.add(base);
    const geo = blockGeo(YCARD.w, YCARD.d, 0.2);
    for (let i = 0; i < 12; i++) {
      const c = new T.Group();
      const body = mesh(geo, mat('#E9D8B8', { roughness: 0.8 }));
      const face = new T.Mesh(new T.PlaneGeometry(YCARD.w - 0.1, YCARD.d - 0.1), printMat({ transparent: true, alphaTest: 0.02 }));
      face.geometry.rotateX(-Math.PI / 2); face.position.y = 0.205; face.receiveShadow = true;
      c.add(body, face);
      c.userData = { pickable: true, kind: 'ycard', face, target: ycardPos(i), lift: 0, present: true, baseY: BOARD_Y, tileShown: false };
      body.userData.owner = c; face.userData.owner = c;
      c.position.copy(c.userData.target);
      g.add(c);
      year.cards.push(c);
    }
    year.group = g; year.base = base;
    return g;
  }
  function setYear(months) {
    year.cards.forEach((c, i) => {
      const m = months[i];
      c.userData.month = m.key;
      const sig = JSON.stringify(m);
      if (c.userData.sig !== sig) {
        c.userData.sig = sig;
        const old = c.userData.face.material.map;
        c.userData.face.material.map = monthTexture(m);
        c.userData.face.material.needsUpdate = true;
        if (old) old.dispose();
      }
    });
    if (layout === 'year' && year.firstMonth && year.firstMonth !== months[0].key) waveTiles(year.cards, true, { x0: -13, x1: 13, z0: -7, z1: 7 });
    year.firstMonth = months[0].key;
  }


  /* == the day board: a display day laid out by time of day == */
  const DU = 2.4, DB_D = 2.05, DB_GAP = 3.05, DB_HMUL = 1.55;
  const LANES = [
    { from: 300, to: 720, name: 'Morning', icon: 'sunrise', span: '5 am to noon', span24: '05:00 to 12:00' },
    { from: 720, to: 1080, name: 'Afternoon', icon: 'sun', span: 'Noon to 6 pm', span24: '12:00 to 18:00' },
    { from: 1080, to: 1440, name: 'Evening', icon: 'moon', span: '6 pm to midnight', span24: '18:00 to 24:00' }
  ];
  /* where a lane's first hour sits: past the lane names on the wide board, near the edge on the tall one */
  let LX0 = -8.1;
  const laneZ = (i) => -1.95 + i * DB_GAP;
  const dayX = (lane, min) => LX0 + (min - LANES[lane].from) / 60 * DU;
  const laneOf = (min) => {
    const i = LANES.findIndex((l) => min >= l.from && min < l.to);
    return i >= 0 ? i : min < RAIL0 ? 0 : LANES.length - 1;
  };
  const dayb = { lanes: [], group: null, base: null, header: null, headerSig: '', blocks: new Map(), gapMarks: [], ghosts: [], date: null, pawn: null, now: null, onLand: null };
  /* The day board's shape. Wide is the desk's: Morning, Afternoon, and Evening side by side, named on
     the left. Tall is a portrait phone's: lanes of four hours stacked, no names (each lane's ruler
     says its hours), so the board is about as tall as it is wide and every block is about twice the
     size on the screen. docs/MOBILE-PASS.md. */
  let laneShape = 'wide';
  function setDayShape(shape) {
    shape = shape === 'tall' ? 'tall' : 'wide';
    if (shape === laneShape) return;
    laneShape = shape;
    layLanes();
  }
  function setHours(hours) {
    const start = Number.isFinite(hours && hours.start) ? Math.max(0, Math.min(1425, Math.round(hours.start / 15) * 15)) : 300;
    let end = Number.isFinite(hours && hours.end) ? Math.round(hours.end / 15) * 15 : 1440;
    if (end <= start) end += 1440;
    end = Math.max(start + 15, Math.min(1740, start + 1440, end));
    if (start === RAIL0 && end === RAIL1) return;
    RAIL0 = start; RAIL1 = end;
    layLanes();
  }
  function tallLanes(start, end) {
    const out = [];
    for (let a = start; a < end; a += 240) out.push({ from: a, to: Math.min(end, a + 240), name: '', icon: 'sun' });
    /* a last lane under an hour and a half rides with the one before it */
    if (out.length > 1 && out[out.length - 1].to - out[out.length - 1].from < 90) { const last = out.pop(); out[out.length - 1].to = last.to; }
    out.forEach((l) => { l.span = timeText(l.from, false) + ' to ' + timeText(l.to, false); l.span24 = l.span; });
    return out;
  }
  function layLanes() {
    const start = RAIL0, end = RAIL1;
    if (laneShape === 'tall') {
      LANES.splice(0, LANES.length, ...tallLanes(start, end));
      WEEK_BOX.x1 = X0 + railUnits() + 0.8;
      LX0 = -4.8;
      DAY_BOX.x0 = LX0 - 0.9;
      DAY_BOX.x1 = LX0 + Math.max(...LANES.map((l) => (l.to - l.from) / 60 * DU)) + 0.9;
      DAY_BOX.z1 = 5.7 + (LANES.length - 3) * DB_GAP;
      if (!renderer) return;
      rebuildHourBoards();
      dayb.headerSig = '';
      camSig = ''; deskMat.sig = '';
      applyMode(); maybeSolve();
      return;
    }
    LX0 = -8.1;
    DAY_BOX.x0 = -11.2;
    const periods = [
      { from: 0, to: 720, name: 'Morning', icon: 'sunrise' },
      { from: 720, to: 1080, name: 'Afternoon', icon: 'sun' },
      { from: 1080, to: 1440, name: 'Evening', icon: 'moon' },
      { from: 1440, to: 1740, name: 'Night', icon: 'moon' }
    ].map((l) => Object.assign({}, l, { from: Math.max(l.from, start), to: Math.min(l.to, end) })).filter((l) => l.to > l.from);
    periods.forEach((l) => {
      const from = timeText(l.from, false), to = timeText(l.to, false);
      l.span = from + ' to ' + to + (l.from >= 1440 ? ' next day' : l.to > 1440 ? ' next day' : '');
      l.span24 = String(Math.floor(l.from / 60) % 24).padStart(2, '0') + ':' + String(l.from % 60).padStart(2, '0') + ' to ' + String(Math.floor(l.to / 60) % 24).padStart(2, '0') + ':' + String(l.to % 60).padStart(2, '0') + (l.from >= 1440 || l.to > 1440 ? ' next day' : '');
      if (start === 300 && end === 1440) {
        l.span = ['5 am to noon', 'Noon to 6 pm', '6 pm to midnight'][periods.indexOf(l)];
        l.span24 = ['05:00 to 12:00', '12:00 to 18:00', '18:00 to 24:00'][periods.indexOf(l)];
      }
    });
    LANES.splice(0, LANES.length, ...periods);
    WEEK_BOX.x1 = X0 + railUnits() + 0.8;
    DAY_BOX.x1 = Math.max(9.8, LX0 + Math.max(...LANES.map((l) => (l.to - l.from) / 60 * DU)) + 1.1);
    DAY_BOX.z1 = 5.7 + (LANES.length - 3) * DB_GAP;
    if (!renderer) return;
    rebuildHourBoards();
    dayb.headerSig = '';
    camSig = ''; deskMat.sig = '';
    applyMode(); maybeSolve();
  }
  function replaceGeometry(m, geo) { const old = m.geometry; m.geometry = geo; if (old) old.dispose(); }
  function rebuildHourBoards() {
    replaceGeometry(week.base, slab(rrShape(WEEK_BOX.x1 - WEEK_BOX.x0, 12.9, 0.6), BOARD_Y, 0.05, 0));
    week.base.position.x = (WEEK_BOX.x0 + WEEK_BOX.x1) / 2;
    replaceGeometry(week.header, new T.PlaneGeometry(railUnits(), 0.75));
    week.header.position.x = X0 + railUnits() / 2;
    swapMap(week.header.material, headerTexture());
    week.rows.forEach((r) => {
      replaceGeometry(r.userData.track, new T.BoxGeometry(railUnits() + 0.1, 0.02, TRACK_D));
      r.userData.track.position.x = X0 + railUnits() / 2;
    });
    replaceGeometry(dayb.base, slab(rrShape(DAY_BOX.x1 - DAY_BOX.x0, DAY_BOX.z1 - DAY_BOX.z0 + 0.3, 0.6), BOARD_Y, 0.05, 0));
    dayb.base.position.set((DAY_BOX.x0 + DAY_BOX.x1) / 2, 0, (DAY_BOX.z0 + DAY_BOX.z1) / 2);
    replaceGeometry(dayb.header, new T.PlaneGeometry(DAY_BOX.x1 - DAY_BOX.x0 - 1.4, 1.28));
    dayb.header.position.x = (DAY_BOX.x0 + DAY_BOX.x1) / 2;
    dayb.lanes.forEach((x) => [x.track, x.face, x.ruler].forEach((m) => { dayb.group.remove(m); m.geometry.dispose(); if (m === x.face || m === x.ruler) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } }));
    dayb.lanes.length = 0;
    buildDayLanes(dayb.group);
  }

  function dayHeaderTexture(sp) {
    /* drawn at the plank's own shape, so a narrower board never stretches its words */
    const H = 170, W = Math.round(H * (DAY_BOX.x1 - DAY_BOX.x0 - 1.4) / 1.28);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#F4E8D2'; rr(g, 4, 4, W - 8, H - 8, 40); g.fill();
    g.textBaseline = 'middle'; g.textAlign = 'left';
    let x = 48;
    /* the tall board's header is narrow: the phone's bar already says Today, and facts use their short words */
    const tall = laneShape === 'tall';
    if (sp.today && !tall) {
      setFont(g, 44, 900);
      const tw = g.measureText('TODAY').width + 44;
      g.fillStyle = '#1D5B56'; rr(g, x, 50, tw, 72, 36); g.fill();
      g.fillStyle = '#FFFFFF'; g.fillText('TODAY', x + 22, 88);
      x += tw + 28;
    }
    g.fillStyle = '#2F2418'; setFont(g, 70, 900);
    g.fillText(sp.title, x, 88);
    x += g.measureText(sp.title).width + 80;
    /* the day's facts sit at the right end, so the name reads first and the facts read as notes on it */
    setFont(g, tall ? 48 : 54, 700, true);
    const ICON = 56, GAP = tall ? 36 : 50, room = W - 56 - x;
    const said = (b) => (tall && b.short ? b.short : b.text);
    const bits = (sp.bits || []).map((b) => ({ b, t: said(b), w: g.measureText(said(b)).width }));
    const total = () => bits.reduce((a, it) => a + ICON + it.w, 0) + GAP * Math.max(0, bits.length - 1);
    while (bits.length && total() > room) {
      const wide = bits.reduce((m, it) => (it.w > m.w ? it : m), bits[0]);
      if (wide.w <= 160) { bits.shift(); continue; }
      wide.t = ellipsize(g, said(wide.b), Math.max(160, wide.w - (total() - room)));
      wide.w = g.measureText(wide.t).width;
    }
    let bx = W - 56 - total();
    for (const it of bits) {
      const c = it.b.color || '#4A3A2A';
      g.fillStyle = c;
      Icons.draw(g, it.b.icon || 'star', bx + 22, 88, 46, c);
      g.fillText(it.t, bx + ICON, 90);
      bx += ICON + it.w + GAP;
    }
    return canvasTex(cv);
  }
  /* Lane names are printed on the wood like the ruler, so nothing that can't move looks like a block. */
  function laneLabelTexture(l) {
    const W = 460, H = 410;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    cutIcon(g, l.icon, W / 2, 110, 116, ink.mark, 4);
    g.fillStyle = ink.name; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitFont(g, l.name, W - 40, 84, 900);
    cutText(g, l.name, W / 2, 245, 4);
    const span = (clock24 ? l.span24 : l.span).replace(' next day', '');
    g.fillStyle = ink.note; fitFont(g, span, W - 30, 50, 700, true);
    cutText(g, span, W / 2, 330, 3);
    if (l.from >= 1440) { setFont(g, 34, 700, true); cutText(g, 'Next day', W / 2, 380, 2); }
    return canvasTex(cv);
  }
  /* The ruler over each lane. Drawn at one scale across and down (it used to be drawn at 125 px to
     a unit across and 262 down, which stretched its type to twice its width), and cut into the wood. */
  const RULER_D = 0.52, RULER_PX = 200;
  function laneRulerTexture(l) {
    const hours = (l.to - l.from) / 60, hourPx = DU * RULER_PX;
    const W = Math.round(hours * hourPx), H = Math.round(RULER_D * RULER_PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = ink.ruler; g.textBaseline = 'middle';
    for (let min = Math.ceil(l.from / 15) * 15; min <= l.to; min += 15) {
      const x = (min - l.from) / 60 * hourPx, major = min % 60 === 0;
      cutRect(g, Math.min(W - (major ? 9 : 5), x) - (x ? (major ? 4.5 : 2.5) : 0), H - (major ? 32 : min % 30 === 0 ? 20 : 12), major ? 9 : 5, major ? 32 : min % 30 === 0 ? 20 : 12, major ? 3 : 2);
      if (major && min < l.to) {
        /* each label sits right over its own tick, so it reads as that hour and not the space after it */
        /* the Night lane's name already says next day, so its hours read as plain hours, full size */
        const lab = hourLabel(min / 60, true).replace(' +1 day', '');
        fitFont(g, lab, hourPx - 40, 60, 800, true);
        g.textAlign = x === 0 ? 'left' : 'center';
        cutText(g, lab, x === 0 ? x + 4 : x, H * 0.31, 3.5);
      }
    }
    return canvasTex(cv);
  }
  function buildDay() {
    const g = new T.Group();
    const base = mesh(slab(rrShape(DAY_BOX.x1 - DAY_BOX.x0, DAY_BOX.z1 - DAY_BOX.z0 + 0.3, 0.6), BOARD_Y, 0.05, 0), woodMat());
    base.position.set((DAY_BOX.x0 + DAY_BOX.x1) / 2, 0, (DAY_BOX.z0 + DAY_BOX.z1) / 2);
    g.add(base);
    const header = new T.Mesh(new T.PlaneGeometry(DAY_BOX.x1 - DAY_BOX.x0 - 1.4, 1.28), printMat({ transparent: true, alphaTest: 0.02 }));
    header.rotation.x = -Math.PI / 2; header.position.set((DAY_BOX.x0 + DAY_BOX.x1) / 2, BOARD_Y + 0.004, -4.55); header.receiveShadow = true;
    g.add(header);
    buildDayLanes(g);
    dayb.pawn = buildNowPin(true);
    g.add(dayb.pawn);
    g.visible = false;
    g.userData.shown = false;
    dayb.group = g; dayb.base = base; dayb.header = header;
    return g;
  }
  function buildDayLanes(g) {
    LANES.forEach((l, i) => {
      const len = (l.to - l.from) / 60 * DU;
      const track = mesh(new T.BoxGeometry(len + 0.1, 0.02, DB_D + 0.18), trackMat, false, true);
      track.position.set(LX0 + len / 2, BOARD_Y + 0.005, laneZ(i));
      const face = new T.Mesh(new T.PlaneGeometry(2.14, DB_D - 0.06), printMat({ map: laneLabelTexture(l), transparent: true, alphaTest: 0.02 }));
      face.rotation.x = -Math.PI / 2; face.position.set(LX0 - 1.35, BOARD_Y + 0.004, laneZ(i)); face.receiveShadow = true;
      face.visible = laneShape !== 'tall';
      /* the ruler is cut into the board and lit by the same light, like the grooves under it */
      const ruler = new T.Mesh(new T.PlaneGeometry(len, RULER_D), printMat({ map: laneRulerTexture(l), transparent: true, depthWrite: false }));
      ruler.rotation.x = -Math.PI / 2; ruler.position.set(LX0 + len / 2, BOARD_Y + 0.006, laneZ(i) - DB_D / 2 - 0.37); ruler.receiveShadow = true;
      g.add(track, face, ruler);
      dayb.lanes.push({ l, track, face, ruler });
    });
  }
  /* sp: { date, today, title, bits: [{ icon, text, color }], blocks, gaps, now } or null to put the day back */
  function setDay(sp, opts) {
    opts = opts || {};
    if (!sp) {
      dayb.blocks.forEach((m, key) => {
        const u = m.userData;
        if (u.shrink != null || (u.wave && !u.wave.show)) return;
        const wk = week.blocks.get(u.date + '|' + u.bkey);
        const target = () => wk ? dayb.group.worldToLocal(wk.getWorldPosition(new T.Vector3())) : u.target;
        moveTile(m, { show: false, target, seat: !!wk, endScale: wk ? 0.42 : 1, duration: 0.5, delay: waveDelay(u.target, DAY_BOX, navigationDirection), finish: () => { dropBlock(m); dayb.blocks.delete(key); } });
      });
      /* the day that's flying home keeps its week blocks in place while the rest of the week arrives */
      dayb.leaving = dayb.date;
      dayb.date = null;
      setDayGaps(null);
      return;
    }
    const hs = JSON.stringify([sp.title, sp.bits, sp.today]);
    if (hs !== dayb.headerSig) {
      dayb.headerSig = hs;
      const old = dayb.header.material.map;
      dayb.header.material.map = dayHeaderTexture(sp); dayb.header.material.needsUpdate = true;
      if (old) old.dispose();
    }
    const seen = new Set();
    for (const b of sp.blocks) {
      for (let li = 0; li < LANES.length; li++) {
        const L = LANES[li];
        const s0 = Math.max(b.start, L.from), e0 = Math.min(b.start + b.dur, L.to);
        if (e0 - s0 < 1) continue;
        const key = sp.date + '|' + b.key + '|' + li;
        seen.add(key);
        const wU = (e0 - s0) / 60 * DU;
        const to = new T.Vector3(dayX(li, s0) + wU / 2, BOARD_Y, laneZ(li));
        const first = s0 === b.start, last = e0 === b.start + b.dur;
        /* past midnight: a block that started the evening before says it carries on, and until when */
        const segmentTime = s0 >= 1440 ? first ? (b.daySub || clockText(s0) + ' to ' + clockText(e0) + ' next day') : 'continued, to ' + clockText(e0) : null;
        const seg = Object.assign({}, b, { sub: segmentTime || (first ? b.daySub || b.sub : 'continued'), contL: !first, contR: !last });
        let m = dayb.blocks.get(key);
        const created = !m;
        let from = null, fromPosition = null;
        if (created) {
          m = makeBlock(seg);
          m.userData.kind = 'dblock';
          m.userData.key = key;
          dayb.group.add(m);
          dayb.blocks.set(key, m);
          const wk = opts.fly ? week.blocks.get(sp.date + '|' + b.key) : null;
          const worldFrom = wk && wk.getWorldPosition(new T.Vector3());
          m.position.copy(worldFrom ? dayb.group.worldToLocal(worldFrom.clone()) : to);
          if (wk) {
            m.scale.setScalar(0.42); from = tilePose(m);
            fromPosition = () => dayb.group.worldToLocal(worldFrom.clone());
          }
        }
        const u = m.userData;
        Object.assign(u, { date: sp.date, bkey: b.key, lane: li, segStart: s0, segEnd: e0, first, last, orig: b, shrink: null, back: null });
        u.target.copy(to);
        dressBlock(m, seg, wU, DB_D, { hMul: DB_HMUL, grip: last && (!!b.add || !!b.tpl) });
        if (created || (u.wave && !u.wave.show)) moveTile(m, { show: true, from, fromPosition, fresh: created && !from, duration: 0.5, delay: waveDelay(to, DAY_BOX, navigationDirection) });
      }
    }
    dayb.blocks.forEach((m, key) => {
      const u = m.userData;
      if (seen.has(key) || u.shrink != null || (u.wave && !u.wave.show)) return;
      if (opts.fly) moveTile(m, { show: false, delay: waveDelay(u.target, DAY_BOX, navigationDirection), finish: () => { dropBlock(m); dayb.blocks.delete(key); } });
      else u.shrink = 1;
    });
    dayb.date = sp.date;
    dayb.now = sp.now;
    dayb.onLand = opts.onLand || dayb.onLand;
    setDayGaps(sp);
  }
  function setDayGaps(sp) {
    const list = [];
    if (sp) (sp.gaps || []).forEach((gp) => {
      for (let li = 0; li < LANES.length; li++) {
        const L = LANES[li], a = Math.max(gp[0], L.from), b = Math.min(gp[1], L.to);
        if (b - a >= 45) list.push({ li, a, b });
      }
    });
    while (dayb.gapMarks.length < list.length) {
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), printMat({ transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      dayb.group.add(m);
      dayb.gapMarks.push(m);
    }
    dayb.gapMarks.forEach((m, k) => {
      const it = list[k];
      m.visible = !!it;
      if (!it) return;
      const hh = Math.round((it.b - it.a) / 30) / 2;
      const tex = gapTex((hh % 1 ? hh.toFixed(1) : String(hh)) + ' h open');
      if (m.material.map !== tex) { m.material.map = tex; m.material.needsUpdate = true; }
      const w = Math.min(3.2, (it.b - it.a) / 60 * DU - 0.2);
      m.scale.set(w, w * 110 / 420, 1);
      m.position.set(dayX(it.li, (it.a + it.b) / 2), BOARD_Y + 0.022, laneZ(it.li));
    });
  }
  const dayGhostTex = new Map();
  function showDayGhost(start, durMin, valid) {
    const segs = [];
    if (start != null) for (let li = 0; li < LANES.length; li++) {
      const L = LANES[li], a = Math.max(start, L.from), b = Math.min(start + durMin, L.to);
      if (b - a >= 1) segs.push({ li, a, b });
    }
    while (dayb.ghosts.length < LANES.length) {
      const g = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      g.rotation.x = -Math.PI / 2;
      dayb.group.add(g);
      dayb.ghosts.push(g);
    }
    dayb.ghosts.forEach((g, i) => {
      const sg = segs[i];
      g.visible = !!sg;
      if (!sg) return;
      const w = (sg.b - sg.a) / 60 * DU;
      ghostD = DB_D;
      const key = w.toFixed(2) + valid;
      if (!dayGhostTex.has(key)) dayGhostTex.set(key, ghostTexture(w, valid));
      g.material.map = dayGhostTex.get(key); g.material.needsUpdate = true;
      g.scale.set(w - GAP, DB_D, 1);
      g.position.set(dayX(sg.li, sg.a) + w / 2, BOARD_Y + 0.03, laneZ(sg.li));
    });
  }

  /* == the workbench: a board on the right for pieces you play with == */
  const BENCH = { w: 8.2, d: 12.6 };
  const bench = { group: null, base: null, title: null, titleSig: '', pieces: new Map(), more: null, depth: BENCH.d, width: BENCH.w, arrange: 'beside', compact: false };
  function benchTitleTexture(sp) {
    const W = 1600, H = 250;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#F4E8D2'; rr(g, 4, 4, W - 8, H - 8, 44); g.fill();
    Icons.draw(g, sp.icon || 'box', 96, H / 2, 110, '#4E3719');
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#2F2418'; fitFont(g, sp.title, W - 240, 84, 900);
    g.fillText(sp.title, 180, 96);
    g.fillStyle = '#5A4632'; fitFont(g, sp.sub || '', W - 240, 46, 700, true);
    g.fillText(sp.sub || '', 180, 180);
    return canvasTex(cv);
  }
  function buildBench() {
    const g = new T.Group();
    const base = mesh(slab(rrShape(BENCH.w, BENCH.d, 0.5), BOARD_Y, 0.05, 0), benchMat);
    const rim = mesh(slab(rrShape(BENCH.w, BENCH.d, 0.5), 0.12, 0.03, BOARD_Y), mat('#C99A5E', { roughness: 0.86 }));
    rim.scale.set(1, 1, 1);
    const title = new T.Mesh(new T.PlaneGeometry(BENCH.w - 0.5, (BENCH.w - 0.5) * 250 / 1600), printMat({ transparent: true, alphaTest: 0.02 }));
    title.rotation.x = -Math.PI / 2; title.position.set(0, BOARD_Y + 0.13, -BENCH.d / 2 + 0.95); title.receiveShadow = true;
    g.add(base, title);
    void rim;
    bench.base = base;
    g.visible = false;
    g.userData.shown = false;
    bench.group = g; bench.title = title;
    return g;
  }
  /* sp: { title, sub, icon, items: [{ key, kind: 'plate' | 'brick', row, label, sub, icon, cat, dur, done }] } */
  function benchPrint(sp) {
    const sig = JSON.stringify([sp.prints, bench.width, bench.depth, ink.name]);
    if (sig === bench.printSig) return;
    bench.printSig = sig;
    if (!bench.print) {
      bench.print = new T.Mesh(new T.PlaneGeometry(1, 1), printMat({ transparent: true, alphaTest: 0.02 }));
      bench.print.rotation.x = -Math.PI / 2; bench.print.receiveShadow = true;
      bench.group.add(bench.print);
    }
    const PX = 90, W = Math.round(bench.width * PX), H = Math.round(bench.depth * PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.textBaseline = 'middle';
    (sp.prints || []).forEach((t) => {
      const x = (t.x + bench.width / 2) * PX, y = (t.z + bench.depth / 2) * PX;
      g.fillStyle = t.soft ? ink.note : ink.name;
      setFont(g, (t.size || 0.34) * PX, t.soft ? 700 : 800, !!t.soft);
      if (t.icon) { cutIcon(g, t.icon, x + 0.2 * PX, y, 0.36 * PX, ink.mark, 1.5); cutText(g, t.text, x + 0.5 * PX, y, 1.5); }
      else cutText(g, t.text, x, y, 1.5);
    });
    const old = bench.print.material.map;
    bench.print.material.map = canvasTex(cv); bench.print.material.needsUpdate = true;
    if (old) old.dispose();
    bench.print.scale.set(bench.width, bench.depth, 1);
    bench.print.position.set(0, BOARD_Y + 0.004, 0);
  }
  let kitMemo = { sig: '', s: 0.17 };
  function kitSize(items, rowD) {
    const list = items.filter((it) => it.kind === 'brick');
    const sig = rowD + '|' + list.map((it) => it.label + ':' + (it.w || 1.5)).join(',');
    if (sig === kitMemo.sig) return kitMemo.s;
    const g = document.createElement('canvas').getContext('2d');
    const H = Math.round(rowD * 170 * (rowD > 1.5 ? 0.8 : 1));
    const sizes = list.map((it) => wrapFit(g, it.label, ((it.w || 1.5) - GAP * 2 - 0.1) * H / rowD - H * 0.16, H * 0.2, 2).s / H).sort((a, b) => a - b);
    /* one or two very long names may shrink on their own instead of shrinking everyone */
    const s = Math.max(0.15, sizes[Math.min(2, sizes.length - 1)] || 0.17);
    kitMemo = { sig, s };
    return s;
  }
  function setBench(sp) {
    if (!sp) { bench.pieces.forEach((m) => { if (m.userData.shrink == null) m.userData.shrink = 1; }); return; }
    const ts = JSON.stringify([sp.title, sp.sub, sp.icon]);
    if (ts !== bench.titleSig) {
      bench.titleSig = ts;
      const old = bench.title.material.map;
      bench.title.material.map = benchTitleTexture(sp); bench.title.material.needsUpdate = true;
      if (old) old.dispose();
    }
    const depth = sp.depth || BENCH.d, width = sp.width || BENCH.w, compact = !!sp.compact, arrange = sp.arrange || 'beside';
    if (depth !== bench.depth || width !== bench.width || compact !== bench.compact || arrange !== bench.arrange) {
      bench.depth = depth; bench.width = width; bench.compact = compact;
      const moved = arrange !== bench.arrange;
      bench.arrange = arrange;
      bench.base.scale.set(width / BENCH.w, 1, depth / BENCH.d);
      /* a compact title is a small label in the top left corner; a full one spans the board */
      const f = compact ? 0.72 : Math.min(1.25, (width - 0.5) / (BENCH.w - 0.5));
      const tw = (BENCH.w - 0.5) * f, td = tw * 250 / 1600;
      bench.title.scale.set(f, f, 1);
      bench.title.position.x = compact ? -width / 2 + 0.3 + tw / 2 : 0;
      bench.title.position.z = -depth / 2 + 0.3 + td / 2;
      if (moved) applyMode();
      maybeSolve();
    }
    /* a bench with printed words shows no title plate: its name is printed on the wood too */
    bench.title.visible = !sp.prints;
    if (bench.print) bench.print.visible = !!sp.prints;
    if (sp.prints) benchPrint(sp);
    const left = -width / 2 + 0.35, right = width / 2 - 0.3, rowD = sp.rowD || 1.22;
    /* the rack's pieces share one type size: the biggest at which every name fits in two lines */
    const pieceS = sp.kit ? kitSize(sp.items, rowD) : 0;
    let z = -depth / 2 + 2.25, x = left, lastRow = null, i = 0, hidden = 0;
    const seen = new Set();
    for (const it of sp.items) {
      const wU = it.w || (it.kind === 'plate' ? 2.75 : Math.max(1.3, Math.min(3.4, it.dur / 60 * 1.5)));
      /* a spec can place its own pieces (the kit does); otherwise pieces flow in rows */
      if (it.x != null) { x = it.x - wU / 2; z = it.z; }
      else {
        if (lastRow !== null && it.row !== lastRow) { z += rowD + 0.36; x = left; }
        else if (x + wU > right) { z += rowD + 0.14; x = left + 0.6; }
        lastRow = it.row;
      }
      if (z > depth / 2 - 0.4) { hidden++; continue; }
      seen.add(it.key);
      let m = bench.pieces.get(it.key);
      const b = { key: it.key, name: it.label, label: it.label, sub: it.sub || '', icon: it.icon, cat: it.kind === 'brick' ? it.cat : 'open', dur: it.dur || 30, done: !!it.done, piece: !!sp.kit && it.kind === 'brick', pieceS };
      if (!m) {
        m = makeBlock(b);
        m.userData.kind = 'bench';
        m.position.set(x + wU / 2, BOARD_Y + 1.8, z);
        m.scale.set(1, 0.001, 1);
        m.userData.grow = reduced ? 1 : -(i * 0.025);
        bench.group.add(m);
        bench.pieces.set(it.key, m);
      }
      m.userData.piece = it;
      m.userData.shrink = null;
      m.userData.target.set(x + wU / 2, BOARD_Y, z + (it.nudge || 0));
      m.rotation.y = it.tilt || 0;
      dressBlock(m, b, wU, rowD, { hMul: it.kind === 'label' ? 0.35 : it.kind === 'plate' ? 0.8 : 1.1, grip: !!it.drag });
      x += wU + 0.12;
      i++;
    }
    bench.pieces.forEach((m, key) => { if (!seen.has(key) && m.userData.shrink == null) m.userData.shrink = 1; });
    bench.hidden = hidden;
  }

  /* == props == */
  /* Props modeled in Blender (blender/build_props.py), baked into src/props-data.js as triangles per
     material. recolor swaps a baked color for another, like the now pin's head. */
  let envTex = null;
  function propEnv() {
    if (envTex || !renderer) return envTex;
    /* a small warm room for metal to reflect: a cream ceiling, a wood floor, one bright window */
    const room = new T.Scene();
    const geo = new T.BoxGeometry(40, 20, 40);
    const cols = [], pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const c = new T.Color(y > 0 ? '#FFF1DC' : '#8A5A32'); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    room.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    const win = new T.Mesh(new T.PlaneGeometry(14, 8), new T.MeshBasicMaterial({ color: '#FFFFFF' }));
    win.position.set(-12, 6, -19.5); room.add(win);
    const pm = new T.PMREMGenerator(renderer);
    envTex = pm.fromScene(room, 0.04).texture;
    pm.dispose();
    return envTex;
  }
  /* Geometry never changes, so each thing's is decoded once and shared by every copy; materials are
     each copy's own, so a colorway or a theme can change them and a removed thing disposes them. */
  const propGeo = new Map();
  function bakedGeo(name, i, gr, k) {
    const key = name + '|' + i;
    if (propGeo.has(key)) return propGeo.get(key);
    const bin = atob(gr.p), u8 = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) u8[j] = bin.charCodeAt(j);
    const q = new Int16Array(u8.buffer), pos = new Float32Array(q.length);
    for (let j = 0; j < q.length; j++) pos[j] = q[j] * k;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    geo.userData.shared = true;
    propGeo.set(key, geo);
    return geo;
  }
  function bakedProp(name, recolor) {
    const d = root.PropData && root.PropData[name];
    const g = new T.Group();
    g.userData.anchors = {}; g.userData.glows = [];
    if (!d) return g;
    const k = d.ext / 32767;
    d.groups.forEach((gr, i) => {
      const geo = bakedGeo(name, i, gr, k);
      const color = (recolor && recolor[gr.c]) || gr.c;
      const m = new T.MeshStandardMaterial({ color, roughness: gr.r, metalness: gr.m || 0, flatShading: true, envMap: gr.m > 0.2 ? propEnv() : null, envMapIntensity: 0.9 });
      /* glass is drawn a little see through, and casts no solid shadow */
      if (gr.o) { m.transparent = true; m.opacity = gr.o; m.depthWrite = false; }
      const me = new T.Mesh(geo, m);
      if (gr.g) { m.emissive = new T.Color(color); m.emissiveIntensity = gr.g * 1.6; me.userData.glow = gr.g; g.userData.glows.push(me); }
      me.castShadow = !(gr.g >= 1) && !gr.o; me.receiveShadow = true;
      g.add(me);
    });
    g.userData.anchors = d.anchors || {};
    return g;
  }
  const anchorV = (g, name, fb) => { const a = g.userData.anchors[name]; return a ? new T.Vector3(a[0], a[1], a[2]) : (fb || new T.Vector3()); };
  /* The lamp stands beside the board and leans over its edge. The work itself is lit evenly, by the
     metered light (src/kit/light.js): nobody reads under a bare cone. What the lamp adds is its own
     small warm pool where it stands, leaving the mouth of the shade along the shade's axis, soft at
     its edge, with no shadow of its own, and never more than a tenth of the light on the board
     (lampPower works that out from where the lamp and the mat are). Switching it off takes the
     warmth out of the evening light and lets the desk around the work go darker. The light belongs
     to the rig, not the lamp's body, so a lamp stepped out of frame still glows from off the edge. */
  const lampRig = { rig: null, body: null, spot: null, on: true, accent: 0.1, color: '#FFC98A' };
  function buildLamp(rc) {
    const rig = new T.Group(), body = bakedProp('lamp', rc);
    rig.add(body);
    const bulb = anchorV(body, 'bulb', new T.Vector3(-4, 5, 0)), aim = anchorV(body, 'aim', bulb.clone().add(new T.Vector3(-0.6, -0.8, 0))).sub(bulb).normalize();
    const head = anchorV(body, 'head', bulb);
    const spot = new T.SpotLight('#FFC98A', 0, 30, 0.95, 1, 1.4);
    spot.position.copy(head).addScaledVector(aim, 1.08);
    spot.target.position.copy(spot.position).addScaledVector(aim, 10);
    spot.castShadow = false;
    rig.add(spot, spot.target);
    Object.assign(lampRig, { rig, body, spot });
    body.userData.pickKind = 'lamp'; body.userData.pickable = true;
    rig.position.set(19.2, 0, -1.6); rig.rotation.y = -0.22;
    return rig;
  }
  /* where the work is, as points a small light might reach: the mat, five by five */
  const poolPts = [], poolV = new T.Vector3(), poolW = new T.Vector3();
  function workPoints() {
    const mt = matTarget();
    poolPts.length = 0;
    if (!mt) return poolPts;
    for (let i = 0; i <= 4; i++) for (let k = 0; k <= 4; k++) poolPts.push([mt.x0 + 1.1 + (mt.x1 - mt.x0 - 2.2) * i / 4, BOARD_Y, mt.z0 + 1.1 + (mt.z1 - mt.z0 - 2.2) * k / 4]);
    return poolPts;
  }
  function lampPower() {
    const DL = root.DeskLight, on = lampRig.on ? 1 : 0;
    const pts = on && DL ? workPoints() : [];
    const sp = lampRig.spot;
    if (sp) {
      let I = 0;
      if (on && pts.length) {
        sp.updateWorldMatrix(true, false); sp.target.updateWorldMatrix(true, false);
        const at = sp.getWorldPosition(poolV), to = sp.target.getWorldPosition(poolW);
        const pos = world.worldToLocal(at.clone()), aim = world.worldToLocal(to.clone()).sub(pos);
        I = DL.poolIntensity({ pos: [pos.x, pos.y, pos.z], aim: [aim.x, aim.y, aim.z], angle: sp.angle, penumbra: sp.penumbra, decay: sp.decay, lum: DL.lumOf(lampRig.color) }, pts, lampRig.accent, light.level, 9);
        /* a lamp too far from the work to reach it still lights the desk under it */
        if (!I && lampRig.accent > 0) I = 4;
      }
      sp.color.set(lampRig.color);
      sp.intensity = I;
    }
    thingLights.forEach((t) => {
      let I = 0;
      if (on && pts.length) {
        t.light.updateWorldMatrix(true, false);
        const pos = world.worldToLocal(t.light.getWorldPosition(poolV).clone());
        I = DL.poolIntensity({ pos: [pos.x, pos.y, pos.z], aim: null, decay: t.light.decay, lum: DL.lumOf(t.thing.lightColor || '#FFC98A') }, pts, lampRig.accent * 0.6, light.level, (t.thing.lightLevel || 6) * 0.5) || (lampRig.accent > 0 ? 1 : 0);
      }
      t.light.intensity = I;
      t.owner.userData.glows.forEach((m) => { m.material.emissiveIntensity = on ? m.userData.glow * 1.6 : 0; });
    });
    if (lampRig.body) lampRig.body.userData.glows.forEach((m) => { m.material.emissiveIntensity = on ? m.userData.glow * 1.6 : 0; });
  }
  function setLamp(on) { lampRig.on = !!on; setDaylight(lastMin); }
  /* things that give light besides the architect lamp: a small glow at their own anchor, held to a
     few percent of the light on the work, switched with the lamp */
  const thingLights = [];
  function addPointLight(g, thing) {
    const at = anchorV(g, 'glow', new T.Vector3(0, 2, 0));
    const light = new T.PointLight(thing.lightColor || '#FFC98A', 0, thing.lightReach || 14, 1.6);
    light.position.copy(at);
    g.add(light);
    g.userData.pickKind = 'lamp'; g.userData.pickable = true;
    thingLights.push({ light, thing, owner: g });
  }
  /* now: a red enamel pin at the current time, a hairline across the lane, and a small time tag */
  const NOW_RED = '#D2503A';
  function buildNowPin(big) {
    const g = new T.Group();
    const pin = bakedProp('pin', { '#C49A45': NOW_RED });
    pin.scale.setScalar(big ? 1.05 : 0.7);
    g.add(pin);
    const line = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: NOW_RED, transparent: true, opacity: 0.85, depthWrite: false }));
    line.rotation.x = -Math.PI / 2; line.renderOrder = 3;
    g.add(line);
    g.userData = { pin, line, tag: null, tagText: '' };
    g.visible = false;
    return g;
  }
  function nowTag(g, text) {
    const u = g.userData;
    if (u.tagText === text) return;
    u.tagText = text;
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = NOW_RED; rr(c, 4, 12, 312, 72, 36); c.fill();
    c.fillStyle = '#FFFFFF'; c.textBaseline = 'middle'; c.textAlign = 'center';
    setFont(c, 44, 800, true); c.fillText(text, 160, 50);
    if (!u.tag) {
      u.tag = new T.Mesh(new T.PlaneGeometry(1.5, 0.45), new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      u.tag.rotation.x = -Math.PI / 2; u.tag.renderOrder = 4;
      g.add(u.tag);
    }
    const old = u.tag.material.map;
    u.tag.material.map = canvasTex(cv); u.tag.material.needsUpdate = true;
    if (old) old.dispose();
  }
  /* a round desk clock with the real time; its hands turn on the face the Blender model says is there */
  function buildClock(rc) {
    const g = bakedProp('clock', rc);
    addHands(g);
    g.position.set(17.9, 0, 5.4); g.rotation.y = -0.42;
    return g;
  }
  /* A face with turning hands, on the face its model says is there (anchors face, normal, up, and
     radius). Every clock on the desk tells the real time. */
  const timeHands = [];
  function addHands(g) {
    const c = anchorV(g, 'face', new T.Vector3(0, 1.6, 0.4));
    const n = anchorV(g, 'normal', c.clone().add(new T.Vector3(0, 0, 1))).sub(c).normalize();
    const up = anchorV(g, 'up', c.clone().add(new T.Vector3(0, 1, 0))).sub(c).normalize();
    const right = new T.Vector3().crossVectors(up, n).normalize();
    const r = (g.userData.anchors.radius ? g.userData.anchors.radius[0] : 1.3) / 1.3;
    const face = new T.Group();
    face.matrix.makeBasis(right, up, n); face.matrix.setPosition(c.clone().addScaledVector(n, 0.02));
    face.matrixAutoUpdate = false;
    const handMat = mat('#24211E', { roughness: 0.5 }), red = mat(NOW_RED, { roughness: 0.5 });
    const hand = (w, l, m) => { const geo = new T.BoxGeometry(w * r, l * r, 0.04); geo.translate(0, (l / 2 - 0.08) * r, 0); const h = mesh(geo, m); return h; };
    const hour = hand(0.12, 0.72, handMat), minute = hand(0.08, 1.02, handMat);
    hour.position.z = 0.02; minute.position.z = 0.05;
    const hub = mesh(new T.CylinderGeometry(0.09 * r, 0.09 * r, 0.08, 16), red); hub.rotation.x = Math.PI / 2; hub.position.z = 0.07;
    face.add(hour, minute, hub);
    g.add(face);
    timeHands.push({ hour, minute, owner: g });
    tellTime(lastMin);
  }
  function tellTime(min) {
    timeHands.forEach((h) => { h.hour.rotation.z = -((min / 60) % 12) / 12 * Math.PI * 2; h.minute.rotation.z = -(min % 60) / 60 * Math.PI * 2; });
  }
  /* The notepad lists what's due soon, printed on its top page, so out of sight isn't out of mind. */
  const pad = { obj: null, page: null, sig: '' };
  function buildNotepad(rc) {
    const g = bakedProp('notepad', rc);
    const at = anchorV(g, 'page', new T.Vector3(0, 0.25, 0)), sz = anchorV(g, 'size', new T.Vector3(3.4, 0, 4.2));
    /* the size anchor is a width and a depth on the desk */
    sz.y = Math.abs(sz.z);
    const page = new T.Mesh(new T.PlaneGeometry(sz.x, sz.y), new T.MeshStandardMaterial({ transparent: true, alphaTest: 0.02, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    page.rotation.x = -Math.PI / 2; page.position.copy(at).add(new T.Vector3(0, 0.004, 0)); page.receiveShadow = true;
    page.userData.size = [sz.x, sz.y];
    g.add(page);
    g.userData.pickKind = 'notepad'; g.userData.pickable = true;
    pad.obj = g; pad.page = page;
    g.position.set(-17.6, 0, 6.2); g.rotation.y = 0.14;
    return g;
  }
  /* sp: { title, items: [{ text, sub, late }], total, empty } */
  function setNotepad(sp) {
    const sig = JSON.stringify(sp);
    if (!pad.page || sig === pad.sig) return;
    pad.sig = sig;
    const [w, h] = pad.page.userData.size, PX = 150;
    const W = Math.round(w * PX), H = Math.round(h * PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.strokeStyle = 'rgba(96, 124, 160, 0.3)'; g.lineWidth = 3;
    for (let y = 150; y < H - 20; y += 78) { g.beginPath(); g.moveTo(24, y); g.lineTo(W - 24, y); g.stroke(); }
    g.strokeStyle = 'rgba(200, 80, 70, 0.35)'; g.beginPath(); g.moveTo(58, 0); g.lineTo(58, H); g.stroke();
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = '#2B1D0F'; fitFont(g, sp.title, W - 110, 64, 900); g.fillText(sp.title, 78, 112);
    /* each to do takes two ruled lines: its name on the first, when it's due on the second; when there
       are more than fit, the last ruled line says how many more, and nothing is ever printed over */
    const items = sp.items || [], total = sp.total != null ? sp.total : items.length;
    const fits = (floor) => { let n = 0; for (let line = 1; n < items.length && 150 + line * 78 + 64 <= floor; line += 2) n++; return n; };
    let n = fits(H - 10);
    if (n < items.length || total > items.length) n = fits(H - 88);
    items.slice(0, n).forEach((it, i) => {
      const y1 = 150 + (1 + i * 2) * 78 - 14, y2 = y1 + 78;
      g.strokeStyle = '#3F2A14'; g.lineWidth = 5; rr(g, 78, y1 - 32, 30, 30, 6); g.stroke();
      g.fillStyle = '#24190C';
      const fs = Math.max(30, fitFont(g, it.text, W - 150, 40, 800));
      setFont(g, fs, 800);
      g.fillText(ellipsize(g, it.text, W - 150), 126, y1);
      if (it.sub) { g.fillStyle = it.late ? '#A2372A' : '#5A4632'; setFont(g, 32, 700, true); g.fillText(ellipsize(g, it.sub, W - 150), 126, y2); }
    });
    const tail = total > n ? 'and ' + (total - n) + ' more' : !items.length ? sp.empty || '' : '';
    if (tail) { g.fillStyle = '#5A4632'; setFont(g, 32, 700, true); g.fillText(tail, 78, Math.min(150 + (1 + n * 2) * 78 - 14, H - 16)); }
    const old = pad.page.material.map;
    pad.page.material.map = canvasTex(cv); pad.page.material.needsUpdate = true;
    if (old) old.dispose();
  }
  /* Steam off the coffee in the morning: three soft wisps that rise, sway, and fade. */
  const steam = { wisps: [], t: 0, on: false };
  let steaming = false;
  function buildSteam(mug, at) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
    const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255, 250, 240, 0)'); gr.addColorStop(0.35, 'rgba(255, 250, 240, 0.55)'); gr.addColorStop(1, 'rgba(255, 250, 240, 0)');
    c.strokeStyle = gr; c.lineWidth = 14; c.lineCap = 'round';
    c.beginPath(); c.moveTo(32, 250); c.bezierCurveTo(4, 190, 60, 130, 32, 70); c.bezierCurveTo(14, 40, 40, 20, 32, 6); c.stroke();
    const tex = canvasTex(cv);
    for (let i = 0; i < 3; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
      s.scale.set(0.55, 2.1, 1);
      s.userData.phase = i / 3;
      s.userData.dx = (i - 1) * 0.28;
      s.userData.at = at || [0, 1.87, 0];
      s.visible = false;
      mug.add(s);
      steam.wisps.push(s);
    }
  }
  function stepSteam(dt) {
    const want = steam.on && !reduced && steam.wisps.length > 0;
    /* steam only keeps the desk drawing while the cup it rises from is in view */
    if (want && steam.wisps.some((w) => w.parent && w.parent.visible)) steaming = true;
    steam.t += dt;
    steam.wisps.forEach((s) => {
      if (!want) { s.visible = false; return; }
      const k = (steam.t / 3.6 + s.userData.phase) % 1;
      s.visible = true;
      const at = s.userData.at;
      s.position.set(at[0] + s.userData.dx + Math.sin((steam.t + s.userData.phase * 7) * 1.3) * 0.12, at[1] + 0.48 + k * 1.3, at[2]);
      s.material.opacity = Math.sin(k * Math.PI) * 0.34;
    });
  }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* == light through the real day ==
     The numbers come from DeskLight.at (src/kit/light.js): three lights that add up to one metered
     level on the work, with the key always high and behind the board. Here they are set on the
     scene, the desk and the mat around the work take their evening dimness, and things that stand
     on the desk dim a little with it, so after dark the work is the brightest thing in view. */
  let lastMin = 720;
  const LIGHT0 = { key: '#FFFFFF', keyK: 1, fill: '#FFFFFF', fillK: 1, sky: '#FFFFFF', ground: '#FFFFFF', skyK: 1, lamp: '#FFC98A', dim: [1, 0.62] };
  const light = { level: 1, night: 0, dim: 1, steady: false, sig: '' };
  /* hold the light at midday whatever the clock says, for anyone who wants the board to look the
     same all day */
  function setLight(o) { light.steady = !!(o && o.steady); light.sig = ''; setDaylight(lastMin); }
  function setDaylight(min) {
    lastMin = min;
    const DL = root.DeskLight;
    if (!DL || !hemi) return;
    const L = (deskTheme && deskTheme.light) || LIGHT0;
    /* a lamp that stepped out of frame still lights the desk from off its edge */
    const hasLamp = propList.some((p) => p.light);
    const s = DL.at(min, L, { lamp: lampRig.on, hasLamp, steady: light.steady });
    light.level = s.level; light.night = s.night;
    hemi.color.set(s.sky.color); hemi.groundColor.set(s.ground); hemi.intensity = s.sky.intensity;
    sun.color.set(s.key.color); sun.intensity = s.key.intensity; sun.position.set(s.key.pos[0], s.key.pos[1], s.key.pos[2]);
    fill.color.set(s.fill.color); fill.intensity = s.fill.intensity;
    lampRig.accent = s.accent; lampRig.color = s.lamp;
    setDim(s.dim);
    lampPower();
    /* the page's own vignette deepens a little after dark */
    const el = renderer && renderer.domElement.parentElement;
    if (el) el.style.setProperty('--night', s.night.toFixed(2));
    const sig = [s.sky.color, s.key.color, s.key.intensity.toFixed(3), s.key.pos.map((v) => v.toFixed(2)).join(), s.dim.toFixed(3), lampRig.on].join('|');
    if (sig !== light.sig) { light.sig = sig; shadowDirty(); }
  }
  /* the desk, the mat, and the things around the work dim together; the boards and blocks never do */
  function setDim(k) {
    if (Math.abs(k - light.dim) < 0.004 && light.dimSet) return;
    light.dim = k; light.dimSet = true;
    if (deskTop) deskTop.material.color.setRGB(k, k, k);
    if (deskMat.mesh) deskMat.mesh.material.color.setRGB(k, k, k);
    if (scene && scene.background) { const base = deskTheme ? deskTheme.background : '#C3955F'; scene.background.set(base).multiplyScalar(0.55 + 0.45 * k); }
    dimThings();
  }
  function dimThings() {
    const k = 1 - (1 - light.dim) * 0.55;
    propList.forEach((p) => p.mover.traverse((x) => {
      if (!x.isMesh || !x.material || !x.material.color || x.userData.glow || x.material.isMeshBasicMaterial || x.material.isMeshLambertMaterial) return;
      const u = x.material.userData;
      if (!u.base) u.base = x.material.color.clone();
      x.material.color.copy(u.base).multiplyScalar(k);
    }));
  }

  /* == the desk's theme ==
     A theme (DeskThemes.resolve, src/kit/themes.js) sets the desk's wood, the boards' wood, the mat,
     the ink printed on the boards, the light, and sometimes a block palette. Warm is today's desk,
     painted by the same functions as always. Each role has one material, so a theme swaps its map
     and every board changes at once; the old maps are disposed. */
  const swapMap = (m, t) => { const old = m.map; m.map = t; m.needsUpdate = true; if (old && old !== t && !Object.values(woodTexCache).includes(old)) old.dispose(); };
  const tiled = (cv, rx, ry) => { const t = canvasTex(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return t; };
  function setTheme(r) {
    const P = root.DeskPaint, warm = !r || r.id === 'warm' || !P;
    deskTheme = warm ? null : r;
    ink = (r && r.ink) || INK0;
    themeV++;
    if (deskTop) {
      if (warm) { const t = plankTex(); t.repeat.set(120 / 28, 80 / 28); swapMap(deskTop.material, t); deskTop.material.roughness = 0.92; }
      else { const tile = r.wood.planks.tile || 28; swapMap(deskTop.material, tiled(P.planks(r.wood.planks), 120 / tile, 80 / tile)); deskTop.material.roughness = r.wood.planks.rough; }
    }
    if (warm) { swapMap(boardMat, woodTex('#D8AD72')); swapMap(benchMat, woodTex('#D2A468')); swapMap(trackMat, grooveTex()); }
    else {
      const b = r.boards.board;
      swapMap(boardMat, tiled(P.board(b), 1 / 12, 1 / 12));
      swapMap(benchMat, tiled(P.board(b, 1024, b.bench), 1 / 12, 1 / 12));
      swapMap(trackMat, canvasTex(P.groove(b)));
    }
    if (deskMat.mesh) {
      const m = warm ? { color: '#5A3E2B', tile: 6, rough: 0.78, radius: 1.1, edge: { kind: 'stitch', color: '#A98460', inset: 0.42, dash: [0.22, 0.16], opacity: 0.8 } } : r.mat;
      swapMap(deskMat.mesh.material, warm ? leatherTex() : tiled(P.mat(r.mat), 1 / (r.mat.tile || 6), 1 / (r.mat.tile || 6)));
      deskMat.mesh.material.roughness = m.rough;
      deskMat.radius = m.radius || 1.1;
      const e = m.edge || { kind: 'none' };
      deskMat.stitch.visible = e.kind === 'stitch';
      if (e.kind === 'stitch') { deskMat.inset = e.inset; const sm = deskMat.stitch.material; sm.color.set(e.color); sm.dashSize = e.dash[0]; sm.gapSize = e.dash[1]; sm.opacity = e.opacity; }
      deskMat.sig = '';
    }
    if (scene) scene.background.set(warm ? '#C3955F' : r.background);
    /* reprint what the ink is printed on: the week's hours, the day's lanes, open time, and free time */
    if (week.header) swapMap(week.header.material, headerTexture());
    if (month.header) swapMap(month.header.material, weekdayHeaderTexture());
    dayb.lanes.forEach((x) => { swapMap(x.face.material, laneLabelTexture(x.l)); swapMap(x.ruler.material, laneRulerTexture(x.l)); });
    gapTexCache.forEach((t) => t.dispose()); gapTexCache.clear();
    bench.printSig = '';
    light.dimSet = false;
    if (hemi) setDaylight(lastMin);
  }

  /* == what sits around the board: the layout ==
     A layout (DeskThemes.LAYOUTS) names the things on each side of the mat, back to front, and
     DeskThemes.arrange lays them out; Full desk is today's hand placed desk, exactly. Each thing
     takes its colorway from the theme (or the player's own pick). The original props keep their
     builders (the lamp's light, the clock's hands, the notepad's page); a kit thing gets the same by
     what it says it does: hands, a point light, a steam anchor. A prop's footprint is its body. */
  const FULL_DESK = {
    L: [{ id: 'plant', x: -17.8, z: -4.6, rot: 0.4, round: 1.3 }, { id: 'mug', x: -16.9, z: 0.9, rot: 0.5, round: 1.95 }, { id: 'notepad', x: -17.6, z: 6.2, rot: 0.14, row: 'pad' }, { id: 'pencil', x: -14.9, z: 6.6, rot: -1.32, row: 'pad' }],
    R: [{ id: 'lamp', x: 19.2, z: -1.6, rot: -0.22, round: 1.55 }, { id: 'books', x: 19.4, z: -7.4, rot: -0.28 }, { id: 'clock', x: 17.9, z: 5.4, rot: -0.42 }]
  };
  let deskIds = { theme: 'warm', layout: 'full', sig: '' };
  function thingOf(id, thing, rc) {
    let g;
    if (id === 'lamp') g = buildLamp(rc);
    else if (id === 'clock') g = buildClock(rc);
    else if (id === 'notepad') g = buildNotepad(rc);
    else {
      g = bakedProp(id, rc);
      if (thing && thing.hands) addHands(g);
      if (thing && thing.light === 'point') addPointLight(g, thing);
    }
    const st = (g.userData.anchors || {}).steam || (id === 'mug' ? [0, 1.87, 0] : null);
    if (st) buildSteam(g, st);
    if (thing && thing.scale) g.scale.setScalar(thing.scale);
    /* a clock can be tapped: the chrome may hang a timer on it */
    if (id === 'clock' || (thing && thing.hands)) { g.userData.pickKind = 'clock'; g.userData.pickable = true; }
    return g;
  }
  function dropThing(o) {
    if (o.parent) o.parent.remove(o);
    o.traverse((x) => {
      if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      if (x.geometry && !x.geometry.userData.shared) x.geometry.dispose();
      if (x.isLight && x.dispose) x.dispose();
    });
  }
  /* what steps out first when the back row runs short */
  /* a version of the board can put the clock right after the notepad (window.SR_clockFirst), so it stays on the desk */
  const keepOf = (id, thing) => (id === 'notepad' ? 3 : window.SR_clockFirst && (id === 'clock' || (thing && thing.hands)) ? 2.5 : thing && (thing.light || thing.hands || id === 'clock') ? 2 : thing && (thing.family === 'drinks' || thing.family === 'paper') ? 1 : thing && thing.family === 'plants' ? 0 : 0.5);
  function placeThings(layoutId, themeId, ways) {
    const K = root.DeskThemes, cat = K ? K.catalog(root.PropData, root.PropKit) : {};
    const L = K && K.LAYOUTS[layoutId];
    /* beside the mat, a side's things cluster near its middle instead of spreading down the whole desk */
    const lay = !L || layoutId === 'full' ? FULL_DESK : K.arrange(layoutId, cat, { gap: 0.6, maxGap: 1.2 });
    /* rows: things listed together in a layout share a row and travel together */
    const rowOf = {};
    if (L && layoutId !== 'full') ['L', 'R'].forEach((side) => (L[side] || []).forEach((e, i) => { (Array.isArray(e) ? e : [e]).forEach((id) => { rowOf[side + id] = side + i; }); }));
    propList.forEach((p) => dropThing(p.mover));
    propList.length = 0; propBoxes.L = []; propBoxes.R = [];
    steam.wisps.length = 0; timeHands.length = 0; thingLights.length = 0;
    Object.assign(lampRig, { rig: null, body: null, spot: null });
    Object.assign(pad, { obj: null, page: null, sig: '' });
    const inner = { L: holds.propsL.children[0], R: holds.propsR.children[0] };
    const was = { L: holds.propsL.position.clone(), R: holds.propsR.position.clone() };
    holds.propsL.position.set(0, 0, 0); holds.propsR.position.set(0, 0, 0);
    /* measure against the holders at home, not wherever their last move left their matrices */
    holds.propsL.updateMatrixWorld(true); holds.propsR.updateMatrixWorld(true);
    ['L', 'R'].forEach((side) => {
      (lay[side] || []).forEach((it, i) => {
        const thing = cat[it.id];
        const way = (ways && ways[it.id]) || (K && thing ? K.wayFor(themeId, thing, i + (side === 'R' ? 1 : 0)) : 'own');
        const g = thingOf(it.id, thing, K && thing ? K.recolor(thing, way) : null);
        /* set down by hand: a small steady turn of its own (Full desk is already placed by hand); a
           face turned toward you barely moves, and a lamp aimed at the board not at all */
        const face = (thing && thing.face) || 'any';
        const turn = layoutId === 'full' || face === 'board' ? 0 : (seed(it.id, 'r') - 0.5) * (face === 'viewer' ? 0.1 : 0.26);
        const rot = it.rot + turn;
        g.position.set(it.x, 0, it.z); g.rotation.y = rot;
        inner[side].add(g);
        g.updateMatrixWorld(true);
        const body = it.id === 'lamp' && lampRig.body ? lampRig.body : g;
        const shape = new T.Box3().setFromObject(body);
        const foot = it.foot ? it.foot : it.round ? { x0: it.x - it.round, x1: it.x + it.round, z0: it.z - it.round, z1: it.z + it.round } : { x0: shape.min.x, x1: shape.max.x, z0: shape.min.z, z1: shape.max.z };
        propBoxes[side].push(foot);
        propList.push({ id: it.id, face, obj: body, mover: g, side, box: shape, box0: shape, foot0: foot, rest: { x: it.x, z: it.z, ry: rot }, light: thing && thing.light || it.id === 'lamp' ? 1 : 0, keep: keepOf(it.id, thing), row: it.row || rowOf[side + it.id] || null, base: body.scale.clone(), k: 1, to: 1 });
      });
    });
    holds.propsL.position.copy(was.L); holds.propsR.position.copy(was.R);
    holds.propsL.updateMatrixWorld(true); holds.propsR.updateMatrixWorld(true);
    /* in a shared row the thing that matters most leads and the rest ride with it */
    const rows = new Map();
    propList.forEach((p) => { if (p.row) { if (!rows.has(p.row)) rows.set(p.row, []); rows.get(p.row).push(p); } });
    rows.forEach((list) => {
      const lead = list.slice().sort((a, b) => b.keep - a.keep)[0];
      lead.riders = list.filter((p) => p !== lead);
      lead.riders.forEach((p) => { p.rides = true; p.lead = lead; });
    });
    light.dimSet = false;
    setDaylight(lastMin);
    tellTime(lastMin);
    placeProps();
    camSig = '';
    if (renderer) maybeSolve();
  }
  /* The whole desk in one call: { theme, layout, ways } by id. Only what changed is rebuilt. */
  function setDesk(o) {
    o = o || {};
    const K = root.DeskThemes;
    const themeId = K && K.THEMES[o.theme] ? o.theme : 'warm';
    const layoutId = K && K.LAYOUTS[o.layout] ? o.layout : 'full';
    if (themeId !== deskIds.theme && K) setTheme(K.resolve(themeId));
    const sig = [themeId, layoutId, JSON.stringify(o.ways || {}), root.PropKit ? Object.keys(root.PropKit.things).length : 0].join('|');
    if (sig === deskIds.sig) return;
    deskIds = { theme: themeId, layout: layoutId, sig };
    placeThings(layoutId, themeId, o.ways);
  }

  /* == the zoom: boards sink into the desk and rise out of it == */
  let layout = 'week';
  const pops = [];
  const ONE = new T.Vector3(1, 1, 1);
  function popItems(list, show, origin, onTick) {
    const cards = list.filter((it) => ['card', 'ycard'].includes(it.obj.userData.kind)).map((it) => it.obj);
    if (cards.length) waveTiles(cards, show, { x0: -13, x1: 13, z0: -8, z1: 8 });
    list.forEach((it) => {
      const o = it.obj;
      if (['card', 'ycard'].includes(o.userData.kind)) return;
      const dist = origin ? Math.hypot(o.position.x - origin.x, o.position.z - origin.z) : 0;
      const u = o.userData;
      u.pop = { show, t: 0, delay: reduced ? 0 : show ? 0.08 + dist * 0.018 + (it.delay || 0) : dist * 0.006, from: u.pop ? u.popK : show ? 0 : 1, ticked: false, onTick };
      if (!pops.includes(o)) pops.push(o);
      if (show) o.visible = true;
    });
  }
  /* Motion: short rises with a gentle settle, never a springy pop. Calmer motion (a preference, or the
     system setting) makes every move near instant. */
  const motionPreference = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
  let calmMotion = false, reduced = !!(motionPreference && motionPreference.matches);
  function setMotion(calm) {
    calmMotion = !!calm;
    reduced = !!(motionPreference && motionPreference.matches) || calmMotion;
    if (reduced) {
      settleTiles();
      pops.forEach((o) => { if (o.userData.pop) o.userData.pop.delay = 0; });
      stepPops(0.08);
    }
  }
  if (motionPreference && motionPreference.addEventListener) motionPreference.addEventListener('change', () => { touch(); setMotion(calmMotion); });
  const easeOutBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeOutSoft = (x) => { const c1 = 0.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* Tile motion uses one continuous front across the desk, not a delay per row. Positive
     navigation brings the next view from the right; going back reverses drift and order. */
  function waveDelay(point, bounds, direction) {
    const lo = bounds.x0 + bounds.z0 * 0.28, hi = bounds.x1 + bounds.z1 * 0.28;
    const at = Math.max(0, Math.min(1, (point.x + point.z * 0.28 - lo) / Math.max(0.001, hi - lo)));
    return (direction > 0 ? 1 - at : at) * 0.24;
  }
  function tilePose(obj) {
    const copy = (v, fallback) => ({ x: v.x == null ? fallback : v.x, y: v.y == null ? fallback : v.y, z: v.z == null ? fallback : v.z });
    return { position: copy(obj.position, 0), rotation: copy(obj.rotation, 0), scale: copy(obj.scale, 1) };
  }
  function tileFrame(from, to, progress, direction, crest) {
    const p = Math.max(0, Math.min(1, progress)), e = 1 - Math.pow(1 - p, 3);
    const arc = Math.sin(Math.PI * e), pose = {};
    for (const field of ['position', 'rotation', 'scale']) {
      pose[field] = {};
      for (const axis of ['x', 'y', 'z']) pose[field][axis] = from[field][axis] + (to[field][axis] - from[field][axis]) * e;
    }
    pose.position.y += arc * crest;
    pose.position.x -= arc * direction * 0.16;
    pose.rotation.z += arc * direction * 0.065;
    return pose;
  }
  function applyTilePose(obj, pose) {
    for (const field of ['position', 'rotation', 'scale']) for (const axis of ['x', 'y', 'z']) obj[field][axis] = pose[field][axis];
  }
  const tileMotions = new Set();
  let navigationDirection = 1;
  function beginNavigation(direction) { if (direction) navigationDirection = direction > 0 ? 1 : -1; }
  function tileDestination(obj, motion) {
    const target = typeof motion.target === 'function' ? motion.target() : motion.target;
    const s = motion.endScale;
    const exit = !motion.show && !motion.seat;
    return { position: { x: target.x + (exit ? -motion.direction * 0.7 : 0), y: target.y - (exit ? 0.9 : 0), z: target.z }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: s, y: s, z: s } };
  }
  function finishTile(obj) {
    const u = obj.userData, motion = u.wave;
    if (!motion) return;
    applyTilePose(obj, tileDestination(obj, motion));
    obj.visible = motion.show; u.tileShown = motion.show; u.wave = null;
    tileMotions.delete(obj);
    if (motion.finish) motion.finish();
  }
  function moveTile(obj, opts) {
    const u = obj.userData, show = opts.show !== false, direction = opts.direction || navigationDirection;
    const from = opts.from || tilePose(obj), fresh = show && !u.wave && (opts.fresh || !obj.visible || u.tileShown === false);
    const target = opts.target || u.target;
    if (fresh && !opts.from) {
      const anchor = typeof target === 'function' ? target() : target;
      from.position = { x: anchor.x + direction * 0.7, y: anchor.y - 0.9, z: anchor.z };
      from.rotation.z = -direction * 0.07;
      from.scale = { x: 1, y: 1, z: 1 };
      applyTilePose(obj, from);
    }
    u.wave = { show, direction, from, fromPosition: opts.fromPosition, target, seat: !!opts.seat, endScale: opts.endScale == null ? 1 : opts.endScale, t: 0, delay: reduced ? 0 : opts.delay || 0, duration: opts.duration || 0.46, finish: opts.finish };
    u.grow = null; u.rise = null; u.fly = null; u.back = null; u.shrink = null; u.squash = 0; u.lift = 0;
    obj.visible = true; tileMotions.add(obj);
    if (reduced) finishTile(obj);
  }
  function waveTiles(items, show, bounds, pointOf) {
    items.forEach((obj) => {
      const point = pointOf ? pointOf(obj) : obj.userData.target;
      moveTile(obj, { show, delay: waveDelay(point, bounds, navigationDirection), fresh: show && obj.userData.newTile });
      obj.userData.newTile = false;
    });
  }
  function stepTiles(dt) {
    let weekLand = 0, dayLand = 0;
    tileMotions.forEach((obj) => {
      const motion = obj.userData.wave;
      if (!motion) { tileMotions.delete(obj); return; }
      moving = true;
      motion.t += dt;
      const p = reduced ? 1 : Math.max(0, Math.min(1, (motion.t - motion.delay) / motion.duration));
      const from = motion.fromPosition ? Object.assign({}, motion.from, { position: motion.fromPosition() }) : motion.from;
      applyTilePose(obj, tileFrame(from, tileDestination(obj, motion), p, motion.direction, motion.show ? 0.24 : 0));
      if (p >= 0.9 && motion.show && !motion.landed) {
        motion.landed = true;
        if (obj.userData.kind === 'block') weekLand++;
        if (obj.userData.kind === 'dblock') dayLand++;
      }
      if (p >= 1) finishTile(obj);
    });
    if (weekLand && week.onLand) week.onLand(weekLand);
    if (dayLand && dayb.onLand) dayb.onLand(dayLand);
  }
  function settleTiles() { tileMotions.forEach(finishTile); }
  function stepPops(dt) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const o = pops[i], u = o.userData, p = u.pop;
      if (!p) { pops.splice(i, 1); continue; }
      p.t += dt;
      const dur = reduced ? 0.08 : p.show ? 0.56 : 0.3;
      const k = Math.max(0, Math.min(1, (p.t - p.delay) / dur));
      const e = p.show ? easeOutSoft(k) : 1 - k * k;
      const v = p.show ? p.from + (1 - p.from) * e : p.from * e;
      u.popK = v;
      const baseY = u.baseY || 0;
      /* rise a short way out of the desk and settle; no stretching */
      o.position.y = baseY + (v - 1) * 1.1;
      const sc = 0.95 + 0.05 * Math.min(1.02, v), bs = u.baseScale || ONE;
      o.scale.set(sc * bs.x, Math.max(0.001, 0.7 + 0.3 * Math.min(1.02, v)) * bs.y, sc * bs.z);
      if (p.show && !p.ticked && k > 0.5) { p.ticked = true; if (p.onTick) p.onTick(); }
      if (k >= 1) {
        o.visible = p.show;
        o.position.y = baseY;
        if (p.show) o.scale.copy(u.baseScale || ONE);
        u.pop = null; u.popK = p.show ? 1 : 0;
        pops.splice(i, 1);
      }
    }
  }
  function layoutItems(name) {
    if (name === 'month') return [{ obj: month.base }, { obj: month.header }].concat(month.cards.filter((c) => c.userData.present).map((c) => ({ obj: c })));
    if (name === 'year') return [{ obj: year.base }].concat(year.cards.map((c) => ({ obj: c })));
    return [];
  }
  /* Where each board sits on the desk. The holders slide; the boards inside them pop. */
  const holds = {};
  const TF = { week: { x: 0, z: 0, s: 1 }, day: { x: -3.9, z: 0, s: 1 }, bench: { x: 12.6, z: 0, s: 1 }, propsL: { x: 0, z: 0, s: 1 }, propsR: { x: 0, z: 0, s: 1 } };
  let benchOn = false;
  function shown(obj, on, origin, onTick) {
    if (!!obj.userData.shown === on) return;
    obj.userData.shown = on;
    if (on && !obj.userData.pop) { obj.visible = true; obj.userData.popK = 0; obj.position.y = (obj.userData.baseY || 0) - 1.1; }
    popItems([{ obj }], on, origin, onTick);
    if (!on && obj === dayb.group && dayb.blocks.size && !reduced) obj.userData.pop.delay = 0.46;
  }
  /* Week, day, and bench share the desk: in the day view the week slides right and shrinks into a map. */
  function applyMode(origin, onTick) {
    const wl = layout === 'week', dayOn = wl && zoomName === 'day', bOn = wl && (benchOn || (dayOn && !alone));
    if (dayOn) {
      TF.week = { x: 34, z: 0, s: 0.6 };
      if (bench.arrange === 'below') {
        /* the day on top, your blocks lined up under it like a tile rack */
        TF.day = { x: -3.9, z: 0, s: 1 };
        TF.bench = { x: -3.9 + (DAY_BOX.x0 + DAY_BOX.x1) / 2, z: DAY_BOX.z1 + 1.0 + bench.depth / 2, s: 1 };
      } else {
        TF.day = { x: -3.9, z: 0, s: 1 };
        TF.bench = { x: TF.day.x + DAY_BOX.x1 + 1.7 + bench.width / 2, z: 0.1, s: 1 };
      }
    } else {
      TF.week = { x: bOn ? -3.9 : 0, z: 0, s: 1 };
      TF.bench = { x: 12.5, z: 0, s: 1 };
      TF.day = { x: -3.9, z: 0, s: 1 };
    }
    placeProps();
    if (wl && !dayOn && !week.group.userData.shown) cascadeWeek(dayb.blocks.size ? dayb.leaving : null);
    shown(week.group, wl && !dayOn, origin, onTick);
    shown(dayb.group, dayOn, null, onTick);
    shown(bench.group, bOn, null, onTick);
  }
  /* The desk mat: dark leather with a stitched edge, sized to whatever boards are showing, so the
     work always sits on a deliberate stage and the props sit around its edge. */
  const deskMat = { mesh: null, stitch: null, box: null, to: null, sig: '', radius: 1.1, inset: 0.42 };
  let deskTop = null;
  function leatherTex() {
    const S = 512, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    g.fillStyle = '#5A3E2B'; g.fillRect(0, 0, S, S);
    const rnd = mulberry32(42);
    for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255, 230, 200, 0.035)' : 'rgba(20, 8, 0, 0.05)'; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
    const t = canvasTex(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 6, 1 / 6);
    return t;
  }
  function matTarget() {
    const wl = layout === 'week', dayOn = wl && zoomName === 'day', bOn = wl && (benchOn || (dayOn && !alone));
    const list = [];
    if (wl && !dayOn) list.push(placeBox(WEEK_BOX, TF.week));
    if (dayOn) list.push(placeBox(DAY_BOX, TF.day));
    if (bOn) list.push(placeBox(benchBox(), TF.bench));
    if (layout === 'month') { const rows = month.rows || 5, d = rows * CARD.d + (rows - 1) * CARD.gap; list.push({ x0: -13.1, x1: 13.1, z0: -d / 2 - 0.9, z1: d / 2 + 0.7 }); }
    if (layout === 'year') list.push({ x0: -13.3, x1: 13.3, z0: -7.2, z1: 7.2 });
    if (!list.length) return null;
    const u = union(list), m = 1.1;
    return { x0: u.x0 - m, x1: u.x1 + m, z0: u.z0 - m, z1: u.z1 + m };
  }
  function drawMat(b) {
    const w = b.x1 - b.x0, d = b.z1 - b.z0, sig = [w, d].map((v) => v.toFixed(2)).join();
    if (sig !== deskMat.sig) {
      deskMat.sig = sig;
      const old = deskMat.mesh.geometry;
      deskMat.mesh.geometry = slab(rrShape(w, d, deskMat.radius), 0.05, 0.02, 0);
      old.dispose();
      const inset = deskMat.inset, shape = rrShape(w - inset * 2, d - inset * 2, Math.max(0.2, deskMat.radius - 0.4)), pts = shape.getPoints(24).map((p) => new T.Vector3(p.x, 0, -p.y));
      const sg = new T.BufferGeometry().setFromPoints(pts.concat([pts[0]]));
      deskMat.stitch.geometry.dispose(); deskMat.stitch.geometry = sg; deskMat.stitch.computeLineDistances();
    }
    deskMat.mesh.position.set((b.x0 + b.x1) / 2, 0.001, (b.z0 + b.z1) / 2);
    deskMat.stitch.position.set((b.x0 + b.x1) / 2, 0.056, (b.z0 + b.z1) / 2);
  }
  function stepMat(dt) {
    if (!deskMat.mesh) return;
    const to = matTarget();
    deskMat.mesh.visible = deskMat.stitch.visible = !!to;
    if (!to) return;
    if (!deskMat.box) deskMat.box = Object.assign({}, to);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 6.5), b = deskMat.box;
    let slid = false;
    for (const key of ['x0', 'x1', 'z0', 'z1']) { const dv = to[key] - b[key]; if (Math.abs(dv) > 0.005) { b[key] += dv * k; slid = true; } else b[key] = to[key]; }
    if (slid) moving = true;
    if (slid || !deskMat.sig) drawMat(b);
  }
  /* The mug, plant, and books never sit on a board. They step out past whatever is shown,
     close enough that their shadows still fall across the edge of the work. */
  function placeProps() {
    const wl = layout === 'week', dayOn = wl && zoomName === 'day', bOn = wl && (benchOn || (dayOn && !alone));
    /* only the working part of each board counts: props may overhang a board's wooden edge */
    const inset = (b, k) => ({ x0: b.x0 + k, x1: b.x1 - k, z0: b.z0 + k, z1: b.z1 - k });
    const boards = [];
    if (wl && !dayOn) boards.push(placeBox({ x0: -12.2, x1: WEEK_BOX.x1 - 0.6, z0: -5.3, z1: 5.3 }, TF.week));
    if (dayOn) boards.push(placeBox(inset(DAY_BOX, 0.4), TF.day));
    if (bOn) boards.push(placeBox(inset(benchBox(), 0.4), TF.bench));
    if (layout === 'month') { const rows = month.rows || 5, d = rows * CARD.d + (rows - 1) * CARD.gap; boards.push({ x0: -13.1, x1: 13.1, z0: -d / 2 - 0.9, z1: d / 2 + 0.7 }); }
    if (layout === 'year') boards.push({ x0: -13.3, x1: 13.3, z0: -7.2, z1: 7.2 });
    const mt = matTarget();
    if (mt) boards.push(mt);
    /* in the back row, each prop carries its own place and the holders stay home */
    if (propMode === 'back' && mt) { TF.propsL = { x: 0, z: 0, s: 1 }; TF.propsR = { x: 0, z: 0, s: 1 }; return; }
    /* each side's props sit right beside the mat, the nearest one a hand's width from its edge */
    const sh = mt ? sideShift(mt, sideKept) : null;
    TF.propsL = { x: mt ? sh.L : clearSide(propBoxes.L, boards, -1), z: 0, s: 1 };
    TF.propsR = { x: mt ? sh.R : clearSide(propBoxes.R, boards, 1), z: 0, s: 1 };
  }
  /* how far each side's holder slides so the nearest thing that stays sits a hand's width off the mat */
  function sideShift(mt, keep) {
    const hug = (list, dir) => (!list.length ? 0 : dir > 0 ? mt.x1 + 0.45 - Math.min(...list.map((p) => p.x0)) : mt.x0 - 0.45 - Math.max(...list.map((p) => p.x1)));
    const feet = (sd) => (keep ? propList.filter((p) => p.side === sd && keep.has(p)).map((p) => p.foot0) : propBoxes[sd]);
    return { L: hug(feet('L'), -1), R: hug(feet('R'), 1) };
  }
  /* The back row: in a window without room beside the mat, things stand along its back edge the way
     they would on a desk against a wall, in two corner clusters with open desk between them. The
     space in front of the board belongs to the work. Outer ends take a light first, then the tallest
     things, standing farthest back; low things sit nearest the middle and nearest the mat. A lamp
     built to face the board stands at the back corner turned in, so its shade leans over the mat's
     corner and its light falls on the work. Things listed together travel as one. Gaps are tight
     inside a cluster, a little uneven like things set down by hand, and the middle stays open; if the
     clusters would meet, the thing that matters least steps out, the notepad last. */
  let propMode = 'side', backAt = null, propCost = null;
  /* beside the mat, the things that stay (null for all of them); the rest step out */
  let sideKept = null;
  /* a steady number from 0 to 1 per thing, so its small turn and nudge never change between frames */
  const seed = (id, k) => { let h = 2166136261; for (const c of String(id) + k) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000; };
  const tallOf = (p) => p.box0.max.y;
  const turnIn = (p) => (p.light && p.face === 'board' ? (p.side === 'R' ? 0.95 : Math.PI - 0.95) : null);
  const backOrder = (a, b) => (b.light - a.light) || (tallOf(b) - tallOf(a));
  /* seq, when given, is each side's order from the outer end in, and how far in from the end each
     side starts (a panel may cover a corner); otherwise the order above, from the ends */
  function backPlan(mt, seq) {
    const edge = mt.z0 - 0.45, middle = 2.4;
    const side = (sd) => propList.filter((p) => p.side === sd && !p.rides);
    const place = (list, fromLeft, from) => {
      let cur = fromLeft ? mt.x0 + 0.7 + (from || 0) : mt.x1 - 0.7 - (from || 0);
      return list.map((p) => {
        const ents = [p].concat(p.riders || []);
        const f = union(ents.map((e) => e.foot0));
        const h = Math.max(...ents.map(tallOf));
        const back = h > 3.2 ? 0.55 : h > 1.3 ? 0.25 : 0;
        const dx = fromLeft ? cur - f.x0 : cur - f.x1;
        const dz = edge - back + (seed(p.id, 'z') - 0.5) * 0.4 - f.z1;
        /* a lamp's shade leans in over the mat, so the next thing leaves room under it */
        const gap = 0.35 + seed(p.id, 'g') * 0.3 + (turnIn(p) != null ? 1.0 : 0);
        cur += fromLeft ? f.x1 - f.x0 + gap : -(f.x1 - f.x0 + gap);
        return { ents, dx, dz, box: { x0: f.x0 + dx, x1: f.x1 + dx, z0: f.z0 + dz, z1: f.z1 + dz, y1: h } };
      });
    };
    let L = seq ? seq.L.slice() : side('L').sort(backOrder), R = seq ? seq.R.slice() : side('R').sort(backOrder);
    for (;;) {
      const left = place(L, true, seq && seq.from.L), right = place(R, false, seq && seq.from.R);
      const meet = left.length && right.length && left[left.length - 1].box.x1 + middle > right[right.length - 1].box.x0;
      if (!meet) return { units: left.concat(right) };
      const drop = L.concat(R).reduce((a, p) => ((p.keep || 0) < (a.keep || 0) ? p : a));
      L = L.filter((p) => p !== drop); R = R.filter((p) => p !== drop);
    }
  }
  /* where each prop is headed, and the box its whole shape fills there, for deciding what's seen */
  function aimProps() {
    const placed = new Map();
    if (propMode === 'back' && backAt) backAt.units.forEach((u) => u.ents.forEach((e) => placed.set(e, u)));
    for (const p of propList) {
      const u = placed.get(p), m = p.mover;
      p.dropped = propMode === 'back' ? !u : !!(sideKept && !sideKept.has(p));
      p.tx = u ? p.rest.x + u.dx : p.rest.x;
      p.tz = u ? p.rest.z + u.dz : p.rest.z;
      /* in the back row a lamp built to face the board turns in toward the work */
      const t = u ? turnIn(p) : null;
      p.try = t != null ? t : p.rest.ry;
      if (!u) { p.box = p.box0; continue; }
      /* measured at full size and resting on the desk, whatever it's doing right now */
      const was = { x: m.position.x, z: m.position.z, ry: m.rotation.y, s: p.obj.scale.clone(), y: p.obj.position.y };
      m.position.x = p.tx; m.position.z = p.tz; m.rotation.y = p.try;
      p.obj.scale.copy(p.base); p.obj.position.y = 0;
      m.updateMatrixWorld(true);
      const hp = m.parent.getWorldPosition(new T.Vector3());
      const b = new T.Box3().setFromObject(p.obj);
      p.box = new T.Box3(b.min.clone().sub(new T.Vector3(hp.x, 0, hp.z)), b.max.clone().sub(new T.Vector3(hp.x, 0, hp.z)));
      m.position.x = was.x; m.position.z = was.z; m.rotation.y = was.ry;
      p.obj.scale.copy(was.s); p.obj.position.y = was.y;
      m.updateMatrixWorld(true);
    }
  }
  /* How far a side's props must slide (dir -1 left, 1 right) so none of them overlaps a board. */
  const propBoxes = { L: [], R: [] };
  /* Props are whole or gone: one the camera would cut to a sliver at the screen's edge, or hide under
     a panel, steps down into the desk instead. Decided for the framed view, so nothing flickers. */
  const propList = [];
  /* which props the camera would show whole (at least 0.8 of each, on screen and clear of the panels) */
  function seenProps(cam, W, H) {
    const blockers = insets.blockers || [];
    return propList.map((p) => {
      const dx = TF[p.side === 'L' ? 'propsL' : 'propsR'].x;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const x of [p.box.min.x, p.box.max.x]) for (const y of [p.box.min.y, p.box.max.y]) for (const z of [p.box.min.z, p.box.max.z]) {
        const q = new T.Vector3(x + dx, y, z).project(cam);
        const sx = (q.x + 1) / 2 * W, sy = (1 - q.y) / 2 * H;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      const area = Math.max(1, (x1 - x0) * (y1 - y0));
      const cut = (a) => Math.max(0, Math.min(x1, a.x1) - Math.max(x0, a.x0)) * Math.max(0, Math.min(y1, a.y1) - Math.max(y0, a.y0));
      let seen = cut({ x0: 0, x1: W, y0: 0, y1: H });
      blockers.forEach((b) => { seen -= cut(b); });
      return seen / area >= 0.8 && !p.dropped;
    });
  }
  /* A thing that rides with another (the pencil with the notepad) shows only with it. While a panel is
     open nothing new comes onto the desk; things only step out if the panel covers them. */
  function decideProps(cam, W, H) {
    const seen = seenProps(cam, W, H), at = new Map(propList.map((p, i) => [p, i]));
    const was = new Map(propList.map((p) => [p, p.to]));
    propList.forEach((p, i) => {
      const lead = p.rides && p.lead ? seen[at.get(p.lead)] : true;
      p.to = (!phoneDay || propMode === 'back') && seen[i] && lead && (!insets.hold || was.get(p) > 0) ? 1 : 0;
      if (!p.decided) { p.decided = true; p.k = p.to; }
    });
  }
  function stepProps(dt) {
    const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
    for (const p of propList) {
      if (p.tx != null) {
        const m = p.mover;
        if (Math.abs(p.tx - m.position.x) + Math.abs(p.tz - m.position.z) + Math.abs(p.try - m.rotation.y) > 0.002) moving = true;
        m.position.x += (p.tx - m.position.x) * k; m.position.z += (p.tz - m.position.z) * k; m.rotation.y += (p.try - m.rotation.y) * k;
      }
      if (p.to !== p.k) moving = true;
      p.k += (p.to - p.k) * k;
      if (Math.abs(p.to - p.k) < 0.002) p.k = p.to;
      const e = Math.max(0.001, p.k);
      p.obj.scale.copy(p.base).multiplyScalar(e);
      p.obj.position.y = (p.k - 1) * 0.8;
      p.obj.visible = p.k > 0.02;
    }
  }
  function clearSide(list, boards, dir) {
    let dx = 0;
    const m = 0.15;
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (const p of list) for (const b of boards) {
        const x0 = p.x0 + dx, x1 = p.x1 + dx;
        if (x1 <= b.x0 - m || x0 >= b.x1 + m || p.z1 <= b.z0 - m || p.z0 >= b.z1 + m) continue;
        dx = dir > 0 ? dx + (b.x1 + m - x0) : dx - (x1 - (b.x0 - m));
        moved = true;
      }
      if (!moved) break;
    }
    return dx;
  }
  function stepHolds(dt) {
    const k = reduced ? 1 : 1 - Math.exp(-dt * 6.5);
    for (const name of Object.keys(holds)) {
      const h = holds[name], t = TF[name];
      if (Math.abs(t.x - h.position.x) + Math.abs(t.z - h.position.z) + Math.abs(t.s - h.scale.x) > 0.002) moving = true;
      h.position.x += (t.x - h.position.x) * k;
      h.position.z += (t.z - h.position.z) * k;
      h.scale.setScalar(h.scale.x + (t.s - h.scale.x) * k);
    }
  }
  /* Switch boards. origin: where the new board should grow out from (world x, z). */
  function showLayout(name, origin, onTick) {
    if (name !== layout) {
      resetView();
      const prev = layout;
      layout = name;
      if (prev === 'month') month.group.visible = true;
      if (prev === 'year') year.group.visible = true;
      popItems(layoutItems(prev), false, origin);
      if (name === 'month') { month.group.visible = true; month.cards.forEach((c) => { if (!c.userData.present) c.visible = false; }); }
      if (name === 'year') year.group.visible = true;
      const items = layoutItems(name);
      items.forEach((it) => { if (!['card', 'ycard'].includes(it.obj.userData.kind) && !it.obj.userData.pop) { it.obj.userData.popK = 0; it.obj.position.y = (it.obj.userData.baseY || 0) - 1.1; } });
      popItems(items, true, origin, onTick);
    }
    applyMode(origin, onTick);
    maybeSolve();
  }
  /* Every block gets its own spatial beat; the wooden rows stay put. The day returning
     to the week keeps its matching blocks while its larger pieces travel home. */
  function cascadeWeek(skipDate) {
    const blocks = Array.from(week.blocks.values()).filter((m) => m.userData.date !== skipDate && m.userData.block && m.userData.shrink == null && !(m.userData.wave && !m.userData.wave.show));
    waveTiles(blocks, true, WEEK_BOX, (m) => ({ x: m.userData.target.x, z: rowZ(m.userData.row) }));
  }
  /* A date change reverses the same tile front used by the zoom controls. */
  function rippleWeek(dir) {
    beginNavigation(dir);
    cascadeWeek(null);
  }

  /* == camera == */
  const cam = { look: new T.Vector3(0, 0, 0), elev: 1, dist: 40, offX: 0, offY: 0 };
  const camTo = { look: new T.Vector3(0, 0, 0), elev: 1, dist: 40, offX: 0, offY: 0 };
  let insets = { top: 96, bottom: 250, left: 16, right: 16 };
  let zoomName = 'week', focusRow = 3;
  /* with the tray open in the day view, the camera frames the day board and the top of your blocks,
     so the day stays the biggest thing on screen */
  let dayOnly = false;
  function setDayOnly(on) { dayOnly = !!on; maybeSolve(); }
  /* Today: the day board alone on the mat, with nothing beside it unless the bench is opened */
  let alone = false;
  function setAlone(on) { on = !!on; if (on === alone) return; alone = on; applyMode(); maybeSolve(); }
  /* A phone's desk is one day: the things on the desk step away, and the camera frames the board close
     and from a little higher, so a narrow screen spends its width on the board and the print reads flat. */
  let phoneDay = false;
  function setPhoneDay(on) { on = !!on; if (on === phoneDay) return; phoneDay = on; if (on) { parTarget.set(0, 0, 0); par.set(0, 0, 0); } else focus.pt = null; maybeSolve(); }
  /* On a phone's day a tap on a block or an open slot zooms in on it: the board fills the width and
     the lane you tapped sits in the room above the panel, instead of the whole day shrinking to fit. */
  const focus = { pt: null };
  const par = new T.Vector3(), parTarget = new T.Vector3();
  const WEEK_BOX = { x0: -12.9, x1: 10.3, z0: -6.5, z1: 5.8 };
  const DAY_BOX = { x0: -11.2, x1: 9.8, z0: -5.5, z1: 5.7 };
  const benchBox = () => ({ x0: -bench.width / 2 - 0.1, x1: bench.width / 2 + 0.1, z0: -bench.depth / 2 - 0.1, z1: bench.depth / 2 + 0.1 });
  const placeBox = (b, t) => ({ x0: t.x + b.x0 * t.s, x1: t.x + b.x1 * t.s, z0: t.z + b.z0 * t.s, z1: t.z + b.z1 * t.s });
  const union = (list) => list.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), z0: Math.min(a.z0, b.z0), z1: Math.max(a.z1, b.z1) }));
  function viewBox() {
    if (layout === 'month') {
      const rows = month.rows || 5, d = rows * CARD.d + (rows - 1) * CARD.gap;
      return { x0: -14.3, x1: 14.3, z0: -d / 2 - 2.1, z1: d / 2 + 1.9, y1: 0.5, elev: 1.1 };
    }
    if (layout === 'year') return { x0: -14.5, x1: 14.5, z0: -8.4, z1: 8.4, y1: 0.5, elev: 1.12 };
    /* the camera frames the whole desk mat, so no edge of the stage ever runs under the HUD */
    const grow = (b) => ({ x0: b.x0 - 1.2, x1: b.x1 + 1.2, z0: b.z0 - 1.2, z1: b.z1 + 1.2 });
    if (zoomName === 'day') {
      if (alone && !benchOn && phoneDay) { const b = placeBox(DAY_BOX, TF.day); return { x0: b.x0 - 0.35, x1: b.x1 + 0.35, z0: b.z0 - 0.35, z1: b.z1 + 0.35, y1: 1.0, elev: laneShape === 'tall' ? 1.46 : 1.3 }; }
      if (alone && !benchOn) return Object.assign(grow(placeBox(DAY_BOX, TF.day)), { y1: 1.0, elev: 1.13 });
      const bb = placeBox(benchBox(), TF.bench);
      if (dayOnly && bench.arrange === 'below') bb.z1 = Math.min(bb.z1, bb.z0 + 2.4);
      return Object.assign(grow(union([placeBox(DAY_BOX, TF.day), bb])), { y1: 1.0, elev: 1.13 });
    }
    const list = [placeBox(WEEK_BOX, TF.week)];
    if (benchOn) list.push(placeBox(benchBox(), TF.bench));
    /* with the tray open the board matters more than the mat around it: the mat's front and back
       edges may slide under the panels, and the week keeps its size */
    const u = union(list);
    if (tight) return { x0: u.x0 - 1.2, x1: u.x1 + 1.2, z0: u.z0 - 0.45, z1: u.z1 + 0.2, y1: 0.5, elev: 1.1 };
    return Object.assign(grow(u), { y1: 0.5, elev: 1.1 });
  }
  let tight = false;
  function setTight(on) { on = !!on; if (on === tight) return; tight = on; maybeSolve(); }
  const tmpCam = new T.PerspectiveCamera(30, 1, 1, 400);
  function solveCamera() {
    const el = renderer.domElement.parentElement;
    const W = el.clientWidth || root.innerWidth, H = el.clientHeight || root.innerHeight;
    let sx0 = insets.left, sx1 = W - insets.right, sy0 = insets.top, sy1 = H - insets.bottom;
    /* panels measured while the stage was hidden (the phone's Today) can leave no room at all; frame
       the whole stage then, so the board is always somewhere in view */
    if (sx1 - sx0 < 120 || sy1 - sy0 < 90) { sx0 = 0; sx1 = W; sy0 = 0; sy1 = H; }
    const cx = (sx0 + sx1) / 2, cy = (sy0 + sy1) / 2;
    const offX = W / 2 - cx, offY = H / 2 - cy;
    tmpCam.fov = camera.fov; tmpCam.aspect = W / H;
    tmpCam.setViewOffset(W, H, offX, offY, W, H);
    tmpCam.updateProjectionMatrix();
    /* how far back the camera has to be to see all of box inside the insets */
    /* extra: things around the board, each with its own height. The board itself stays inside the
       insets; a thing around it only has to be whole on screen and clear of every panel, so it can
       stand in a corner beside a panel that only covers the middle, like Today's band. */
    const clear = insets.blockers || [];
    const frame = (box, extra, lift) => {
      const look = new T.Vector3((box.x0 + box.x1) / 2, 0, (box.z0 + box.z1) / 2 - (lift || 0));
      const corners = [];
      for (const x of [box.x0, box.x1]) for (const z of [box.z0, box.z1]) for (const y of [0, box.y1]) corners.push(new T.Vector3(x, y, z));
      const things = (extra || []).map((e) => { const c = []; for (const x of [e.x0, e.x1]) for (const z of [e.z0, e.z1]) for (const y of [0, e.y1]) c.push(new T.Vector3(x, y, z)); return c; });
      const dir = new T.Vector3(0, Math.sin(box.elev), Math.cos(box.elev));
      const fits = (d, around) => {
        tmpCam.position.copy(look).addScaledVector(dir, d);
        tmpCam.lookAt(look);
        tmpCam.updateMatrixWorld();
        for (const c of corners) {
          const p = world.localToWorld(c.clone()).project(tmpCam);
          const px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H;
          if (px < sx0 || px > sx1 || py < sy0 || py > sy1 || p.z > 1) return false;
        }
        if (!around) return true;
        for (const cs of things) {
          let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
          for (const c of cs) { const p = world.localToWorld(c.clone()).project(tmpCam); if (p.z > 1) return false; const px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
          if (x0 < 10 || x1 > W - 10 || y0 < 10 || y1 > H - 10) return false;
          if (clear.some((b) => x0 < b.x1 + 6 && x1 > b.x0 - 6 && y0 < b.y1 + 6 && y1 > b.y0 - 6)) return false;
        }
        return true;
      };
      let lo = 4, hi = 300;
      for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
      if (!things.length) return { box, look, dir, d: hi };
      /* pulling back doesn't always help the things around it: they slide toward the middle, where a
         panel like the band may be. So step back a percent at a time from the board's own distance
         and take the first that fits, or none. */
      for (let k = 0; k <= 30; k++) { const d = hi * (1 + k * 0.01); if (fits(d, true)) return { box, look, dir, d }; }
      return { box, look, dir, d: Infinity };
    };
    const vb = viewBox();
    let pick = frame(vb);
    /* Things sit beside the mat when the camera shows them there. When it would leave some out, it can
       pull back a little to keep them: up to about a tenth of the board's size in the day view, and a
       twentieth in the week view, whose seven rows need the room more. Beside the mat, or along its back
       edge when a tall or narrow window has room above, whichever keeps more for less. Past that they
       step out, whole or gone, as ever. */
    /* a phone's day spends its width on the board: things there may cost it almost nothing */
    const limit = phoneDay ? 1.02 : zoomName === 'week' ? 1.05 : 1.12;
    const place = (f) => { tmpCam.position.copy(f.look).addScaledVector(f.dir, f.d * 1.02); tmpCam.lookAt(f.look); tmpCam.updateMatrixWorld(); };
    const shown = () => seenProps(tmpCam, W, H).filter(Boolean).length;
    const tryMode = (mode, f, plan, keep) => { propMode = mode; backAt = plan || null; sideKept = keep ? new Set(keep) : null; placeProps(); aimProps(); place(f); return shown(); };
    const mt = layout === 'week' && propList.length ? matTarget() : null;
    /* a phone's day has no room beside the mat; things there stand only along its back edge, or not at all */
    let best = { mode: 'side', f: pick, plan: null, keep: null, n: phoneDay ? -1 : tryMode('side', pick) };
    propCost = null;
    if (mt && best.n < propList.length) {
      /* while a panel is open, only what's on the desk now can stay */
      const ok = (p) => !insets.hold || p.to > 0;
      const withRiders = (p) => [p].concat((p.riders || []).filter(ok));
      /* beside the mat, things join one at a time too, the one that matters most first; the ones that
         stay hug the mat, so one blocked thing never takes its whole side with it */
      const sideFeet = (list) => {
        const sh = sideShift(mt, new Set(list));
        return list.map((p) => { const b = p.foot0, dx = p.side === 'L' ? sh.L : sh.R; return { x0: b.x0 + dx - 0.15, x1: b.x1 + dx + 0.15, z0: b.z0, z1: b.z1, y1: tallOf(p) }; });
      };
      const firsts = propList.filter((p) => !p.rides && ok(p)).sort((a, b) => (b.keep || 0) - (a.keep || 0));
      let sideSet = [], side = { d: Infinity };
      for (const p of firsts) {
        const want = sideSet.concat(withRiders(p)), f = frame(vb, sideFeet(want));
        if (f.d <= pick.d * limit) { sideSet = want; side = f; }
      }
      /* the back row keeps as many as fit: things join it one at a time, the one that matters most first.
         Each tries its own place in the order first, then the other places along its side, then the same
         with its side's cluster starting a little further in from a corner a panel covers, and stays in
         the first that still fits the room there is, or steps out. */
      const leads = firsts;
      const around = (pl) => pl.units.map((u) => ({ x0: u.box.x0 - 0.3, x1: u.box.x1 + 0.3, z0: u.box.z0 - 0.3, z1: u.box.z1, y1: u.box.y1 + 0.3 }));
      /* the camera frames what's shown: with a back row it centers on the board and the row together, so a
         tall window moves the board down to make room instead of leaving bare desk below it (worth a few
         percent of pull back, since the board's front edge comes a little nearer) */
      const aim = (pl) => {
        const ex = around(pl), a = frame(vb, ex);
        if (!pl.units.length) return a;
        const z0 = Math.min(...pl.units.map((u) => u.box.z0)), b = frame(vb, ex, Math.max(0, (vb.z0 - z0) / 2));
        return b.d <= a.d * 1.03 ? b : a;
      };
      let seq = { L: [], R: [], from: { L: 0, R: 0 } }, plan = { units: [] }, back = null;
      for (const p of leads) {
        const list = seq[p.side], at = list.findIndex((q) => backOrder(p, q) < 0), home = at < 0 ? list.length : at;
        const spots = [home].concat(list.map((q, i) => i).concat([list.length]).filter((i) => i !== home));
        const f0 = seq.from[p.side], froms = [f0, f0 + 2, f0 + 4, f0 + 6];
        find: for (const from of froms) for (const i of spots) {
          const next = { L: seq.L, R: seq.R, from: Object.assign({}, seq.from, { [p.side]: from }) };
          next[p.side] = list.slice(0, i).concat([p], list.slice(i));
          const trial = backPlan(mt, next);
          if (trial.units.length !== next.L.length + next.R.length) continue;
          const f = aim(trial);
          if (f.d <= pick.d * limit) { seq = next; plan = trial; back = f; break find; }
        }
      }
      /* a side with one thing keeps it only in its corner: alone in the middle of the desk it looks dropped */
      const lone = ['L', 'R'].filter((sd) => seq[sd].length === 1 && seq.from[sd] > 2);
      if (lone.length && back) {
        lone.forEach((sd) => { seq[sd] = []; });
        plan = backPlan(mt, seq);
        back = plan.units.length ? aim(plan) : null;
      }
      propCost = { side: +(side.d / pick.d).toFixed(3), back: back ? +(back.d / pick.d).toFixed(3) : null, kept: back ? plan.units.length : 0 };
      const tries = [];
      if (!phoneDay && sideSet.length && side.d <= pick.d * limit) tries.push({ mode: 'side', f: side, plan: null, keep: sideSet, n: tryMode('side', side, null, sideSet) });
      if (back && back.d <= pick.d * limit) tries.push({ mode: 'back', f: back, plan, keep: null, n: tryMode('back', back, plan) });
      /* more things for the least pull back */
      for (const t of tries) if (t.n > best.n || (t.n === best.n && t.f.d < best.f.d && best.mode !== 'side')) best = t;
      propCost.shown = [best.n].concat(tries.map((t) => t.mode + ':' + t.n));
    }
    propMode = best.mode; backAt = best.plan; pick = best.f; sideKept = best.keep ? new Set(best.keep) : null;
    placeProps();
    aimProps();
    camTo.look.copy(pick.look); camTo.elev = pick.box.elev; camTo.dist = pick.d * 1.02; camTo.offX = offX; camTo.offY = offY;
    tmpCam.position.copy(pick.look).addScaledVector(pick.dir, camTo.dist); tmpCam.lookAt(pick.look); tmpCam.updateMatrixWorld();
    decideProps(tmpCam, W, H);
    if (phoneDay && focus.pt) aimFocus(W, sx1 - sx0);
  }
  /* the zoom that makes the board as wide as the room, with the tapped point in the middle of it */
  function aimFocus(W, room) {
    const b = placeBox(DAY_BOX, TF.day);
    const pa = world.localToWorld(new T.Vector3(b.x0, 0, focus.pt.z)).project(tmpCam);
    const pc = world.localToWorld(new T.Vector3(b.x1, 0, focus.pt.z)).project(tmpCam);
    const wide = Math.abs(pc.x - pa.x) / 2 * W;
    if (!(wide > 1)) return;
    user.zoomTo = Math.max(1, Math.min(ZOOM_MAX, room * 0.97 / wide));
    user.panTo.set((b.x0 + b.x1) / 2 - camTo.look.x, 0, focus.pt.z - camTo.look.z);
    clampPan();
  }
  /* (px, py) on screen to zoom in on; null lets go, back to the whole day */
  function focusOn(px, py) {
    if (px == null) { if (focus.pt) { focus.pt = null; resetView(); } return; }
    const p = groundAt(px, py);
    if (!p) return;
    focus.pt = { x: p.x, z: p.z };
    camSig = '';
    maybeSolve();
  }
  let camSig = '';
  /* The camera only needs solving again when what it frames changes. A hidden stage (the phone's
     Today is showing) is never measured: it solves the moment the desk shows again. */
  function maybeSolve() {
    const el = renderer.domElement.parentElement;
    if (!el.clientWidth || !el.clientHeight) { camSig = ''; return; }
    const sig = [layout, zoomName, benchOn, alone, phoneDay, tight, RAIL0, RAIL1, bench.depth, bench.width, bench.arrange, month.rows, insets.top, insets.bottom, insets.left, insets.right, insets.hold, dayOnly, JSON.stringify(insets.blockers || []), el.clientWidth, el.clientHeight].join('|');
    if (sig === camSig) return;
    camSig = sig;
    solveCamera();
  }
  function setZoom(name, row) {
    if (name !== zoomName) resetView();
    zoomName = name;
    if (row != null) focusRow = row;
    applyMode();
    maybeSolve();
  }
  function setBenchOpen(on) { benchOn = !!on; applyMode(); maybeSolve(); }
  function setInsets(v) { insets = Object.assign({}, insets, v); maybeSolve(); }
  function snapCamera() { cam.look.copy(camTo.look); cam.elev = camTo.elev; cam.dist = camTo.dist; cam.offX = camTo.offX; cam.offY = camTo.offY; }
  /* The desk was hidden and shows again: measure, frame, and let every rise finish at once, so the
     board is there the moment you look. */
  function wake() { fit(); snapCamera(); settleTiles(); for (let k = 0; k < 40 && pops.length; k++) stepPops(0.1); }
  /* true when the board is framed: the camera found a distance that shows it inside the panels */
  const framed = () => camTo.dist < 290 && cam.dist < 290 && isFinite(cam.dist);
  /* the desk leans a little toward a mouse; never on a phone's day, where a lean left behind by the
     last tap turns the board crooked */
  function parallax(nx, ny) { if (quality === 'low' || reduced || phoneDay) { parTarget.set(0, 0, 0); return; } parTarget.set(nx * 0.35, -ny * 0.2, 0); }
  /* The player's own zoom and pan on top of the framed view, and a small lean toward
     whatever is being dragged so placing a block feels precise. */
  const user = { zoom: 1, zoomTo: 1, pan: new T.Vector3(), panTo: new T.Vector3(), lean: 0, leanTo: 0, leanAt: new T.Vector3() };
  const ZOOM_MAX = 2.6;
  function groundAt(px, py) {
    setNdc(px, py);
    const hit = new T.Vector3();
    return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -BOARD_Y), hit) ? hit : null;
  }
  function clampPan() {
    const box = viewBox(), f = 1 - 1 / user.zoomTo;
    const hx = (box.x1 - box.x0) / 2 * f + 0.5, hz = (box.z1 - box.z0) / 2 * f + 0.5;
    user.panTo.x = Math.max(-hx, Math.min(hx, user.panTo.x));
    user.panTo.z = Math.max(-hz, Math.min(hz, user.panTo.z));
    if (user.zoomTo <= 1.001) user.panTo.set(0, 0, 0);
  }
  /* zoom to z, keeping the desk point under (px, py) where it is */
  function zoomTo(z, px, py) {
    focus.pt = null;
    const nz = Math.max(1, Math.min(ZOOM_MAX, z));
    const p = px != null ? groundAt(px, py) : null;
    if (p) {
      const look = cam.look.clone().add(user.pan);
      user.panTo.addScaledVector(p.sub(look).setY(0), 1 - user.zoomTo / nz);
    }
    user.zoomTo = nz;
    clampPan();
    return nz;
  }
  function panBy(dxPx, dyPx) {
    const el = renderer.domElement.parentElement, H = el.clientHeight || root.innerHeight;
    const upp = 2 * (cam.dist / user.zoom) * Math.tan((camera.fov * Math.PI / 180) / 2) / H;
    user.panTo.x -= dxPx * upp;
    user.panTo.z -= dyPx * upp / Math.max(0.5, Math.sin(cam.elev));
    clampPan();
  }
  function resetView() { focus.pt = null; user.zoomTo = 1; user.panTo.set(0, 0, 0); }
  /* lean in toward a point on the desk (null to settle back); k is how strongly */
  function lean(p, k) {
    if (!p) { user.leanTo = 0; return; }
    user.leanAt.set(p.x, 0, p.z);
    user.leanTo = k == null ? 1 : k;
  }
  function stepCamera(dt) {
    const k = reduced ? 1 : 1 - Math.exp(-dt * 6.5);
    if (cam.look.distanceToSquared(camTo.look) > 1e-6 || Math.abs(camTo.dist - cam.dist) > 0.002 || Math.abs(camTo.elev - cam.elev) > 1e-4 || Math.abs(camTo.offX - cam.offX) + Math.abs(camTo.offY - cam.offY) > 0.05
      || Math.abs(user.zoomTo - user.zoom) > 0.001 || user.pan.distanceToSquared(user.panTo) > 1e-6 || Math.abs(user.leanTo - user.lean) > 0.002 || par.distanceToSquared(parTarget) > 1e-6) moving = true;
    cam.look.lerp(camTo.look, k);
    cam.elev += (camTo.elev - cam.elev) * k;
    cam.dist += (camTo.dist - cam.dist) * k;
    cam.offX += (camTo.offX - cam.offX) * k;
    cam.offY += (camTo.offY - cam.offY) * k;
    const ku = reduced ? 1 : 1 - Math.exp(-dt * 9), kl = reduced ? 1 : 1 - Math.exp(-dt * 4);
    user.zoom += (user.zoomTo - user.zoom) * ku;
    user.pan.lerp(user.panTo, ku);
    user.lean += (user.leanTo - user.lean) * kl;
    par.lerp(parTarget, 1 - Math.exp(-dt * 2.5));
    const el = renderer.domElement.parentElement;
    const W = el.clientWidth || root.innerWidth, H = el.clientHeight || root.innerHeight;
    camera.setViewOffset(W, H, cam.offX, cam.offY, W, H);
    camera.updateProjectionMatrix();
    const look = cam.look.clone().add(user.pan);
    if (user.lean > 0.001) look.lerp(new T.Vector3(user.leanAt.x, look.y, user.leanAt.z), 0.14 * user.lean);
    const dist = cam.dist / (user.zoom * (1 + 0.1 * user.lean));
    const dir = new T.Vector3(0, Math.sin(cam.elev), Math.cos(cam.elev));
    camera.position.copy(look).addScaledVector(dir, dist).add(par.clone().multiplyScalar(dist / 40));
    camera.lookAt(look);
  }

  /* == per frame == */
  const puffs = [];
  const puffGeo = new T.IcosahedronGeometry(0.08, 0);
  const puffMat = new T.MeshStandardMaterial({ color: '#F4E7D2', roughness: 1, flatShading: true });
  function puff(pos, count) {
    for (let i = 0; i < (count || 7); i++) {
      const m = new T.Mesh(puffGeo, puffMat);
      const a = (i / (count || 7)) * Math.PI * 2 + Math.random() * 0.4;
      m.position.copy(pos);
      m.userData = { v: new T.Vector3(Math.cos(a) * (1 + Math.random()), 0.7 + Math.random() * 0.8, Math.sin(a) * (0.6 + Math.random() * 0.6)), life: 0.5 + Math.random() * 0.25, t: 0, s: 0.7 + Math.random() * 0.8 };
      world.add(m);
      puffs.push(m);
    }
  }
  let hoverObj = null, selKey = null;
  const tmpV = new T.Vector3(), tmpW = new T.Vector3();
  function setHover(obj) { if (obj !== hoverObj) touch(); hoverObj = obj; }
  /* The block you tapped: it lifts and glows until you tap somewhere else. */
  function setSelected(date, bkey) {
    if (!date || !bkey) { selKey = null; return; }
    const matches = blockMeshes(date, bkey);
    const m = matches.find((x) => (zoomName === 'day' ? x.userData.kind === 'dblock' : x.userData.kind === 'block')) || matches[0];
    selKey = m ? m.userData.date + '|' + m.userData.bkey : date + '|' + bkey;
  }
  function easeBlock(m, dt, k, liftTo) {
    const u = m.userData;
    if (u.grow != null) {
      u.grow = Math.min(1, u.grow + dt * (reduced ? 20 : 3.4));
      m.scale.y = u.grow <= 0 ? 0.001 : Math.max(0.001, easeOutSoft(Math.max(0, u.grow)));
      if (u.grow >= 1) { u.grow = null; u.newTile = false; m.scale.y = 1; }
    }
    if (u.grow != null || u.squash > 0 || Math.abs(liftTo - u.lift) > 0.002) moving = true;
    u.lift += (liftTo - u.lift) * (1 - Math.exp(-dt * 16));
    tmpV.set(u.target.x, u.target.y + u.lift, u.target.z);
    if (m.position.distanceToSquared(tmpV) > 1e-6) moving = true;
    m.position.lerp(tmpV, k);
    if (u.squash > 0) {
      u.squash = Math.max(0, u.squash - dt * 3.4);
      const w = Math.sin(u.squash * Math.PI) * u.squash;
      m.scale.set(1 + 0.025 * w, 1 - 0.14 * w, 1 + 0.025 * w);
    } else if (u.grow == null) m.scale.set(1, 1, 1);
  }
  function step(dt) {
    const k = 1 - Math.exp(-dt * 13);
    moving = false; steaming = false;
    stepHolds(dt);
    stepMat(dt);
    stepProps(dt);
    stepSteam(dt);
    stepTiles(dt);
    week.blocks.forEach((m, key) => {
      const u = m.userData;
      if (u.dragging || u.wave) return;
      if (u.shrink != null) {
        moving = true;
        u.shrink = Math.max(0, u.shrink - dt * 4);
        m.scale.set(Math.max(0.001, u.shrink), Math.max(0.001, u.shrink), 1);
        if (u.shrink <= 0) { dropBlock(m); week.blocks.delete(key); }
        return;
      }
      const sel = selKey === key && zoomName !== 'day';
      u.halo.visible = sel;
      u.grip.visible = u.canGrip && (sel || hoverObj === m);
      easeBlock(m, dt, k, sel ? 0.2 : hoverObj === m ? 0.08 : 0);
    });
    dayb.blocks.forEach((m, key) => {
      const u = m.userData;
      if (u.dragging || u.wave) return;
      if (u.shrink != null) {
        moving = true;
        u.shrink = Math.max(0, u.shrink - dt * 4);
        m.scale.set(Math.max(0.001, u.shrink), Math.max(0.001, u.shrink), 1);
        if (u.shrink <= 0) { dropBlock(m); dayb.blocks.delete(key); }
        return;
      }
      const sel = selKey === u.date + '|' + u.bkey;
      u.halo.visible = sel;
      u.grip.visible = u.canGrip && (sel || hoverObj === m);
      easeBlock(m, dt, k, sel ? 0.5 : hoverObj === m ? 0.14 : 0);
    });
    bench.pieces.forEach((m, key) => {
      const u = m.userData;
      if (u.dragging) return;
      if (u.shrink != null) {
        moving = true;
        u.shrink = Math.max(0, u.shrink - dt * 4.5);
        m.scale.set(Math.max(0.001, u.shrink), Math.max(0.001, u.shrink), 1);
        if (u.shrink <= 0) { dropBlock(m); bench.pieces.delete(key); }
        return;
      }
      u.grip.visible = u.canGrip && hoverObj === m;
      easeBlock(m, dt, k, hoverObj === m ? 0.16 : 0);
    });
    const hoverCard = (list) => list.forEach((c) => {
      const u = c.userData;
      if (u.pop || u.wave) return;
      if (Math.abs((hoverObj === c ? 0.12 : 0) - u.lift) > 0.002) moving = true;
      u.lift += ((hoverObj === c ? 0.12 : 0) - u.lift) * (1 - Math.exp(-dt * 14));
      c.position.y = (u.baseY || 0) + u.lift;
    });
    if (layout === 'month') hoverCard(month.cards);
    if (layout === 'year') hoverCard(year.cards);
    stepPops(dt);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const m = puffs[i], u = m.userData;
      u.t += dt;
      m.position.addScaledVector(u.v, dt);
      u.v.multiplyScalar(Math.exp(-dt * 4)); u.v.y -= dt * 1.5;
      m.scale.setScalar(u.s * Math.max(0, 1 - u.t / u.life));
      if (u.t >= u.life) { world.remove(m); puffs.splice(i, 1); }
    }
    if (pops.length || puffs.length || drag.obj) moving = true;
    if (drag.obj) {
      drag.obj.position.lerp(drag.target, 1 - Math.exp(-dt * 16));
      drag.obj.rotation.z += (drag.tilt - drag.obj.rotation.z) * (1 - Math.exp(-dt * 10));
      drag.tilt *= Math.exp(-dt * 6);
    }
    stepCamera(dt);
    /* a small light's pool follows its thing while the desk rearranges */
    if (moving) { poolClock += dt; if (poolClock > 0.35) { poolClock = 0; lampPower(); } }
    else if (poolClock) { poolClock = 0; lampPower(); touch(120); }
    stillFrames = moving || nowMs() < activeUntil ? 0 : stillFrames + 1;
    lazyOnly = steaming;
  }
  let poolClock = 0;

  const timeText = (m, use24) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return use24 ? String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0') : ((h % 12) || 12) + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); };
  const clockText = (m) => timeText(m, clock24);
  function setClock24(on) {
    on = !!on;
    if (on === clock24) return;
    clock24 = on;
    if (week.header) swapMap(week.header.material, headerTexture());
    dayb.lanes.forEach((x) => { swapMap(x.face.material, laneLabelTexture(x.l)); swapMap(x.ruler.material, laneRulerTexture(x.l)); });
    refreshFaces();
  }
  /* A lighter desk for older or battery powered machines: one pixel per pixel, a small soft shadow
     map, and no drifting parallax. Everything still reads the same. */
  let quality = 'full';
  function setQuality(q) {
    q = q === 'low' ? 'low' : 'full';
    if (q === quality || !renderer) return;
    quality = q;
    renderer.setPixelRatio(q === 'low' ? 1 : Math.min(2, root.devicePixelRatio || 1));
    const n = q === 'low' ? 1024 : 2048;
    sun.shadow.mapSize.set(n, n);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    renderer.shadowMap.type = q === 'low' ? T.PCFShadowMap : T.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate = true;
    fit();
  }
  /* == the real clock and you on the board == */
  /* The pins turn from red enamel to gold in the last five minutes of a block: a heads up, not an alarm. */
  const pinHeads = (g) => { const out = []; g.userData.pin.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === NOW_RED.slice(1).toLowerCase()) out.push(o); }); return out; };
  let pinGold = false;
  function setPinTone(soon) {
    if (soon === pinGold) return;
    pinGold = soon;
    [props.pawn, dayb.pawn].forEach((g) => {
      g.userData.heads = g.userData.heads || pinHeads(g);
      g.userData.heads.forEach((m) => { m.material.color.set(soon ? '#D9A43A' : NOW_RED); if (m.material.emissive) m.material.emissive.set(soon ? '#3A2600' : '#000000'); });
    });
  }
  /* The part of the block you're in that's already behind you is worn: paler where the label ink is
     dark, shaded where it's white, so the label only gains contrast. It sits under the printed face. */
  const wornGeo = new T.PlaneGeometry(1, 1); wornGeo.rotateX(-Math.PI / 2);
  function wornMat(b) {
    const lk = look(b), dark = lum(lk.ink) < 0.5;
    return lam(mix(lk.base, dark ? '#FFF8EC' : '#24170A', dark ? 0.5 : 0.24), { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  }
  function wornMesh() { const m = new T.Mesh(wornGeo, lam('#FFFFFF')); m.receiveShadow = true; m.visible = false; return m; }
  let spentMesh = null;
  function setSpent(min) {
    if (!spentMesh) { spentMesh = wornMesh(); dayb.group.add(spentMesh); }
    spentMesh.visible = false;
    if (dayb.now == null || min == null || min < RAIL0 || min >= RAIL1) return;
    const li = laneOf(min);
    for (const m of dayb.blocks.values()) {
      const u = m.userData;
      if (u.lane !== li || u.back || u.shrink != null || !u.orig || u.orig.sleep || u.orig.free) continue;
      if (!(u.segStart <= min && min < u.segEnd)) continue;
      const x0 = dayX(li, u.segStart) + GAP, x1 = dayX(li, min);
      if (x1 - x0 < 0.02) return;
      if (spentMesh.parent !== m) m.add(spentMesh);
      spentMesh.material = wornMat(u.orig);
      spentMesh.visible = true;
      spentMesh.scale.set(x1 - x0, 1, (u.dU || DB_D) - 0.1);
      spentMesh.position.set((x0 + x1) / 2 - m.userData.target.x, u.h + 0.001, 0);
      return;
    }
  }
  /* the same wear on today's row of the week, riding on the block so it lifts and squashes with it */
  let weekSpent = null;
  function setWeekSpent(min, todayRow) {
    if (!weekSpent) weekSpent = wornMesh();
    weekSpent.visible = false;
    if (todayRow == null || min == null || min < RAIL0 || min >= RAIL1) return;
    for (const m of week.blocks.values()) {
      const u = m.userData, b = u.block;
      if (u.row !== todayRow || u.shrink != null || !b || b.sleep || b.free) continue;
      if (!(b.start <= min && min < b.start + b.dur)) continue;
      const wU = b.dur / 60, x0 = -wU / 2 + GAP, x1 = -wU / 2 + (min - b.start) / 60;
      if (x1 - x0 < 0.02) return;
      if (weekSpent.parent !== m) m.add(weekSpent);
      weekSpent.material = wornMat(b);
      weekSpent.visible = true;
      weekSpent.scale.set(x1 - x0, 1, BLOCK_D - 0.08);
      weekSpent.position.set((x0 + x1) / 2, u.h + 0.001, 0);
      return;
    }
  }
  function setNow(min, todayRow, soon, projected) {
    projected = projected || {};
    const weekMin = Object.prototype.hasOwnProperty.call(projected, 'weekMin') ? projected.weekMin : min;
    const dayMin = Object.prototype.hasOwnProperty.call(projected, 'dayMin') ? projected.dayMin : min;
    setPinTone(!!soon);
    lastMin = min;
    tellTime(min);
    steam.on = min >= 300 && min < 660;
    const p = props.pawn;
    if (todayRow == null || weekMin == null || weekMin < RAIL0 || weekMin >= RAIL1) p.visible = false;
    else {
      p.visible = layout === 'week';
      p.position.set(xOf(weekMin), BOARD_Y, rowZ(todayRow));
      const u = p.userData;
      u.pin.position.set(0, 0, BLOCK_D / 2 + 0.06);
      u.line.scale.set(0.05, BLOCK_D + 0.08, 1); u.line.position.set(0, H_HARD + 0.02, 0);
    }
    const dp = dayb.pawn;
    if (dayb.now == null || dayMin == null || dayMin < RAIL0 || dayMin >= RAIL1) dp.visible = false;
    else {
      const li = laneOf(dayMin);
      dp.visible = true;
      dp.position.set(dayX(li, Math.min(dayMin, LANES[li].to)), BOARD_Y, laneZ(li));
      const u = dp.userData;
      u.pin.position.set(0, 0, DB_D / 2 + 0.14);
      u.line.scale.set(0.07, DB_D + 0.12, 1); u.line.position.set(0, H_HARD * DB_HMUL + 0.03, 0);
      nowTag(dp, clockText(dayMin) + (dayMin >= 1440 ? ' next day' : ''));
      /* with a lane below, the tag tucks in at the lane's front edge, clear of that lane's hours */
      const below = li < LANES.length - 1;
      u.tag.scale.setScalar(below ? 0.85 : 1);
      u.tag.position.set(below ? 0.82 : 0.95, 0.02, DB_D / 2 + (below ? 0.17 : 0.42));
    }
    setSpent(dayMin);
    setWeekSpent(weekMin, todayRow);
  }

  /* == dragging a block around == */
  const drag = { obj: null, target: new T.Vector3(), ghost: null, tilt: 0 };
  const ghostTexCache = new Map();
  let ghostD = BLOCK_D;
  function ghostTexture(wU, valid) {
    const key = wU.toFixed(2) + valid + ghostD;
    if (ghostTexCache.has(key)) return ghostTexCache.get(key);
    const PX = 140, W = Math.max(16, Math.round(wU * PX)), H = Math.round(ghostD * PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const lw = 6;
    g.fillStyle = valid ? 'rgba(255, 250, 238, 0.28)' : 'rgba(190, 60, 45, 0.2)';
    rr(g, lw, lw, W - 2 * lw, H - 2 * lw, 16); g.fill();
    g.strokeStyle = valid ? 'rgba(255, 255, 255, 0.95)' : 'rgba(190, 55, 45, 0.95)';
    g.lineWidth = lw; g.setLineDash([18, 12]); g.lineCap = 'round'; g.stroke();
    const t = canvasTex(cv);
    /* the landing spot changes width as a block is stretched; a few dozen of these are plenty */
    if (ghostTexCache.size > 48) { ghostTexCache.forEach((x) => x.dispose()); ghostTexCache.clear(); dayGhostTex.clear(); }
    ghostTexCache.set(key, t);
    return t;
  }
  /* A block follows the pointer. `big` makes it a day sized brick. */
  function startDrag(b, fromObj, big) {
    endDrag();
    const m = makeBlock(b);
    const dayBrick = big || (fromObj && fromObj.userData.kind === 'dblock');
    const wU = (dayBrick ? DU : 1) * b.dur / 60;
    dressBlock(m, b, wU, dayBrick ? DB_D : BLOCK_D, dayBrick ? { hMul: DB_HMUL } : {});
    m.userData.dragging = true;
    if (fromObj) {
      m.position.copy(world.worldToLocal(fromObj.getWorldPosition(new T.Vector3())));
      const hide = fromObj.userData.kind === 'dblock' ? Array.from(dayb.blocks.values()).filter((x) => x.userData.date === fromObj.userData.date && x.userData.bkey === fromObj.userData.bkey) : [fromObj];
      hide.forEach((x) => { x.visible = false; });
      drag.hidden = hide;
    } else m.position.set(0, 3, 8);
    m.rotation.x = -0.06;
    world.add(m);
    drag.obj = m;
    drag.target.copy(m.position);
    return m;
  }
  function dragTo(x, y, z, tilt) {
    if (!drag.obj) return;
    drag.target.set(x, y, z);
    drag.tilt = Math.max(-0.22, Math.min(0.22, (tilt || 0) * -0.035));
  }
  function showGhost(row, start, durMin, valid) {
    if (!drag.ghost) {
      drag.ghost = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      drag.ghost.rotation.x = -Math.PI / 2;
      week.group.add(drag.ghost);
    }
    const gh = drag.ghost;
    if (row == null) { gh.visible = false; return; }
    const w = durMin / 60;
    ghostD = BLOCK_D;
    gh.visible = true;
    gh.material.map = ghostTexture(w, valid); gh.material.needsUpdate = true;
    gh.scale.set(w - GAP, BLOCK_D, 1);
    gh.position.set(xOf(start) + w / 2, BOARD_Y + 0.026, rowZ(row));
  }
  function endDrag(landAt) {
    if (drag.hidden) { drag.hidden.forEach((x) => { if (x.userData.shrink == null && !x.userData.back) x.visible = true; }); drag.hidden = null; }
    if (drag.obj) {
      if (landAt) puff(world.localToWorld(landAt.clone()), 7);
      /* the week's worn plate may be riding on it; that one is kept */
      if (weekSpent && weekSpent.parent === drag.obj) drag.obj.remove(weekSpent);
      if (spentMesh && spentMesh.parent === drag.obj) drag.obj.remove(spentMesh);
      dropBlock(drag.obj);
      drag.obj = null;
    }
    showGhost(null);
    if (dayb.ghosts.length) showDayGhost(null);
  }
  function blockMeshes(date, bkey) {
    const all = Array.from(week.blocks.values()).concat(Array.from(dayb.blocks.values())).filter((m) => !m.userData.back && m.userData.shrink == null && !(m.userData.wave && !m.userData.wave.show));
    const exact = all.filter((m) => m.userData.date === date && m.userData.bkey === bkey);
    if (exact.length) return exact;
    return all.filter((m) => {
      const u = m.userData, b = u.orig || u.block;
      if (!b) return false;
      const ownerDate = b.sourceDate || u.date, ownerKey = b.sourceKey || b.base || b.key;
      return (ownerDate === date && ownerKey === bkey) || (u.date === date && b.add && ownerKey === bkey) || ((u.date === date || ownerDate === date) && b.base === bkey);
    });
  }
  function squash(date, bkey) {
    blockMeshes(date, bkey).forEach((m) => {
      if (!m.visible) return;
      m.userData.squash = 1;
      puff(m.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.1, (m.userData.dU || BLOCK_D) * 0.4)), 6);
    });
  }
  /* Place a moved block's meshes where it was dropped, so they ease from there instead of their old spot. */
  function adoptPosition(date, bkey) {
    if (!drag.obj) return;
    const wp = drag.obj.getWorldPosition(new T.Vector3());
    blockMeshes(date, bkey).forEach((m) => {
      m.position.copy(m.parent.worldToLocal(wp.clone())); m.visible = true;
      m.userData.fly = null; m.userData.wave = null; m.userData.tileShown = true;
      m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); tileMotions.delete(m);
    });
  }
  /* The screen point just above the picked block, for the tools that float over it. */
  function selAnchor() {
    if (!selKey) return null;
    return blockAnchor(selKey.slice(0, 10), selKey.slice(11));
  }
  /* The screen point right above a block (and its front edge as bottom), for anything that points at it. */
  function blockAnchor(date, bkey) {
    const ms = blockMeshes(date, bkey).filter((m) => m.visible && m.parent && (m.userData.kind !== 'block' || zoomName !== 'day'));
    if (!ms.length) return null;
    const m = ms.sort((a, b) => (a.userData.segStart || 0) - (b.userData.segStart || 0))[0];
    const u = m.userData;
    const wp = m.getWorldPosition(new T.Vector3());
    const top = (u.h || H_HARD) + u.lift + 0.15;
    const half = (u.dU || BLOCK_D) * 0.5 * m.parent.getWorldScale(new T.Vector3()).z;
    const p = toScreen(wp.clone().add(new T.Vector3(0, top, -half)), scene);
    /* the front edge too, so the tools can sit under the block when there's no room above */
    const q = toScreen(wp.add(new T.Vector3(0, 0, half)), scene);
    p.bottom = q.y;
    return p;
  }

  /* == setup == */
  function init(container) {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    /* no tone curve: the light is metered so a face pointing up gets a level of 1, and a color
       reaches the screen as the color it was designed to be (src/kit/light.js) */
    renderer.toneMapping = T.NoToneMapping;
    maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    container.appendChild(renderer.domElement);
    haloMat = new T.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false });

    scene = new T.Scene();
    scene.background = new T.Color('#C3955F');
    camera = new T.PerspectiveCamera(30, 16 / 9, 1, 400);

    /* three lights, set by the meter in setDaylight: the sky, the key (the only one that casts a
       shadow, always high and behind the board), and a fill from the front */
    hemi = new T.HemisphereLight('#FFF4E4', '#B0804F', 1.3);
    scene.add(hemi);
    sun = new T.DirectionalLight('#FFF8EE', 1.5);
    sun.position.set(-4, 22, -6);
    sun.target.position.set(0, 0, -1);
    sun.castShadow = true;
    /* a soft edge: the softness of this kind of shadow comes from the size of its map */
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 70;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    fill = new T.DirectionalLight('#FFF6EA', 0.8);
    fill.position.set(8, 9, 16);
    scene.add(fill);

    world = new T.Group();
    scene.add(world);
    const deskTex = plankTex(); deskTex.repeat.set(120 / 28, 80 / 28);
    const desk = mesh(new T.BoxGeometry(120, 1, 80), new T.MeshStandardMaterial({ map: deskTex, roughness: 0.92 }), false, true);
    desk.position.y = -0.5;
    world.add(desk);
    deskTop = desk;
    deskMat.mesh = mesh(new T.BufferGeometry(), new T.MeshStandardMaterial({ map: leatherTex(), roughness: 0.78 }), false, true);
    deskMat.stitch = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: '#A98460', dashSize: 0.22, gapSize: 0.16, transparent: true, opacity: 0.8 }));
    world.add(deskMat.mesh, deskMat.stitch);

    const hold = (name, inner) => { const h = new T.Group(); h.add(inner); world.add(h); holds[name] = h; const t = TF[name]; h.position.set(t.x, 0, t.z); h.scale.setScalar(t.s); return h; };
    hold('week', buildWeek());
    hold('day', buildDay());
    hold('bench', buildBench());
    world.add(buildMonth(), buildYear());
    month.group.visible = false; year.group.visible = false;
    props.pawn = buildNowPin(false);
    /* two small groups on either side of the work, today's Full desk until a layout says otherwise */
    const pl = new T.Group(), pr = new T.Group();
    hold('propsL', pl); hold('propsR', pr);
    deskIds.sig = 'warm|full|{}|0';
    placeThings('full', 'warm', null);
    /* each prop's whole shape, to tell whether the camera can see all of it */
    /* the holders start where they belong; the groups inside them stay at rest */
    holds.propsL.position.set(TF.propsL.x, 0, TF.propsL.z); holds.propsR.position.set(TF.propsR.x, 0, TF.propsR.z);
    week.group.add(props.pawn);
    fit();
    snapCamera();
    return { renderer, scene, camera, world };
  }
  function fit() {
    const el = renderer.domElement.parentElement;
    if (!el.clientWidth || !el.clientHeight) { camSig = ''; return; }
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camSig = '';
    maybeSolve();
  }

  /* == picking == */
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  function setNdc(px, py) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function owner(o) { while (o && !(o.userData && (o.userData.owner || o.userData.pickable))) o = o.parent; return o && o.userData.owner ? o.userData.owner : o; }
  const live = (m) => m.visible && m.userData.shrink == null && !m.userData.back && !m.userData.wave;
  /* What's under the pointer: a block (on the week or the day), a day tab, a bench piece, a month card, or a year card. */
  function pick(px, py) {
    setNdc(px, py);
    let list = [];
    const dayOn = layout === 'week' && zoomName === 'day';
    if (layout === 'week') {
      if (dayOn) dayb.blocks.forEach((m) => { if (live(m) && !m.userData.fly) list.push(m); });
      if (week.group.userData.shown) { week.blocks.forEach((m) => { if (live(m)) list.push(m); }); week.rows.forEach((r) => list.push(r.userData.tabFace)); }
      if (bench.group.userData.shown) bench.pieces.forEach((m) => { if (live(m)) list.push(m); });
    } else if (layout === 'month') list = month.cards.filter((c) => c.userData.present && live(c));
    else list = year.cards.filter(live);
    [lampRig.body, pad.obj].concat(thingLights.map((t) => t.owner), propList.filter((p) => p.obj && p.obj.userData.pickKind === 'clock').map((p) => p.obj)).forEach((o) => { if (o && o.visible && o.scale.x > 0.5) list.push(o); });
    const hits = ray.intersectObjects(list, true);
    for (const h of hits) {
      const o = owner(h.object);
      if (!o || (o.userData.halo && h.object === o.userData.halo)) continue;
      const u = o.userData;
      if (u.pickKind) return { kind: u.pickKind, obj: o };
      if (u.kind === 'bench') return { kind: 'bench', obj: o, piece: u.piece };
      if (u.kind === 'dblock') {
        const local = dayb.group.worldToLocal(h.point.clone());
        const min = LANES[u.lane].from + (local.x - LX0) / DU * 60;
        return Object.assign({ kind: 'block', board: 'day', obj: o, date: u.date, displayDate: u.date, key: u.bkey, block: u.orig, min, nearR: u.last && dayX(u.lane, u.segEnd) - local.x < 0.32 && u.orig.dur >= 30, nearL: u.first && local.x - dayX(u.lane, u.segStart) < 0.32 }, sourceOf(u.orig, u.date));
      }
      if (u.kind === 'block') {
        if (dayOn) return { kind: 'miniRow', obj: o, row: u.row, date: u.date };
        const local = week.group.worldToLocal(h.point.clone());
        const right = xOf(u.block.start + u.block.dur), left = xOf(u.block.start);
        return Object.assign({ kind: 'block', board: 'week', obj: o, date: u.date, displayDate: u.date, row: u.row, key: u.bkey, block: u.block, x: local.x, min: minOf(local.x), nearR: right - local.x < 0.22 && u.block.dur >= 30, nearL: local.x - left < 0.22 }, sourceOf(u.block, u.date));
      }
      if (u.kind === 'tab') return dayOn ? { kind: 'miniRow', obj: o, row: u.row } : { kind: 'tab', obj: o, row: u.row };
      if (u.kind === 'card') return { kind: 'card', obj: o, date: u.date };
      if (u.kind === 'ycard') return { kind: 'ycard', obj: o, month: u.month };
    }
    return null;
  }
  const sourceOf = (b, date) => ({ sourceDate: b.sourceDate || date, sourceKey: b.sourceKey || b.key, sourceStart: b.sourceStart == null ? b.start : b.sourceStart, sourceDur: b.sourceDur == null ? b.dur : b.sourceDur });
  const plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function planePoint(group, y) {
    const wy = group.localToWorld(new T.Vector3(0, y, 0)).y;
    plane.constant = -wy;
    return ray.ray.intersectPlane(plane, new T.Vector3());
  }
  /* The point on the week board under the pointer, and which day row and minute it is. */
  function boardAt(px, py, y) {
    setNdc(px, py);
    if (!week.group.userData.shown) return null;
    const p = planePoint(week.group, y == null ? BOARD_Y : y);
    if (!p) return null;
    const local = week.group.worldToLocal(p.clone());
    const row = Math.round(local.z / ROW_GAP + 3);
    const inRow = row >= 0 && row < 7 && Math.abs(local.z - rowZ(row)) < ROW_GAP * 0.62;
    const onRail = local.x >= X0 - 0.4 && local.x <= X0 + railUnits() + 0.4;
    const rp = week.group.localToWorld(new T.Vector3(local.x, BOARD_Y, inRow ? rowZ(row) : local.z));
    return { x: local.x, z: local.z, row: inRow && onRail ? row : null, min: minOf(local.x), wx: rp.x, wz: rp.z, wy: rp.y, s: week.group.getWorldScale(new T.Vector3()).x };
  }
  /* The point on the day board under the pointer: which lane, and what minute. */
  function dayAt(px, py, y) {
    setNdc(px, py);
    if (!(layout === 'week' && zoomName === 'day' && dayb.group.userData.shown)) return null;
    const p = planePoint(dayb.group, y == null ? BOARD_Y : y);
    if (!p) return null;
    const local = dayb.group.worldToLocal(p.clone());
    let lane = null, best = 99;
    for (let i = 0; i < LANES.length; i++) { const d = Math.abs(local.z - laneZ(i)); if (d < best) { best = d; lane = i; } }
    if (best > DB_D / 2 + 0.55 || local.x < LX0 - 0.6 || (lane != null && local.x > LX0 + (LANES[lane].to - LANES[lane].from) / 60 * DU + 0.6)) lane = null;
    const min = lane == null ? null : Math.max(LANES[lane].from, Math.min(LANES[lane].to, LANES[lane].from + (local.x - LX0) / DU * 60));
    const rp = dayb.group.localToWorld(new T.Vector3(local.x, BOARD_Y, lane == null ? local.z : laneZ(lane)));
    return { lane, min, x: local.x, z: local.z, wx: rp.x, wz: rp.z, wy: rp.y };
  }
  function toScreen(v, fromGroup) {
    const w = (fromGroup || world).localToWorld(v.clone());
    const p = w.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, behind: p.z > 1 };
  }
  /* where a desk thing is on screen, for the chrome to point at; null when it's stepped out */
  function propScreen(kind) {
    const p = propList.find((x) => x.obj && x.obj.userData.pickKind === kind && x.obj.visible && x.obj.scale.x > 0.5);
    if (!p) return null;
    const box = new T.Box3().setFromObject(p.obj), c = box.getCenter(new T.Vector3());
    const r = renderer.domElement.getBoundingClientRect(), q = c.clone().project(camera), top = new T.Vector3(c.x, box.max.y, c.z).project(camera);
    return { x: r.left + (q.x + 1) / 2 * r.width, y: r.top + (1 - q.y) / 2 * r.height, top: r.top + (1 - top.y) / 2 * r.height };
  }
  function cardWorld(date) {
    const c = month.cards.find((x) => x.userData.date === date);
    return c ? c.position.clone() : null;
  }
  function ycardWorld(key) {
    const c = year.cards.find((x) => x.userData.month === key);
    return c ? c.position.clone() : null;
  }
  const rowWorld = (i) => new T.Vector3(0, 0, rowZ(i));
  /* World point for a minute on a week row or on the day board, for placing the block you're dragging. */
  function slotWorld(where, row, min) {
    if (where === 'day') { const at = Math.max(RAIL0, Math.min(RAIL1, min)), li = laneOf(at); return dayb.group.localToWorld(new T.Vector3(dayX(li, at), BOARD_Y, laneZ(li))); }
    return week.group.localToWorld(new T.Vector3(xOf(min), BOARD_Y, rowZ(row)));
  }

  function render() { renderer.render(scene, camera); }
  /* Forget every printed face so the next pass redraws them, for when the fonts arrive late. */
  function refreshFaces() {
    faceCache.forEach((t) => t.dispose()); faceCache.clear();
    const reset = (m) => { if (m.userData) m.userData.sig = ''; };
    week.blocks.forEach(reset); dayb.blocks.forEach(reset); bench.pieces.forEach(reset);
    dayb.headerSig = ''; bench.titleSig = ''; kitMemo.sig = '';
  }

  /* every call that changes the desk says so, and the next frames are drawn; asking the desk a
     question (what's under the pointer, where a block is on screen) doesn't */
  const changes = { fit, setNow, setDaylight, setWeek, setMonth, setYear, setDay, setBench, setBenchOpen, showLayout, rippleWeek, beginNavigation, setZoom, setPhoneDay, setInsets, snapCamera, setSelected, showDayGhost,
    startDrag, dragTo, showGhost, endDrag, squash, adoptPosition, puff, zoomTo, panBy, resetView, focusOn, lean, setMotion, refreshFaces,
    setLamp, setLight, setNotepad, setDayOnly, setAlone, setTheme, setDesk, setClock24, setQuality, wake, setTight, setHours };
  Object.keys(changes).forEach((k) => { const fn = changes[k]; changes[k] = function () { touch(); return fn.apply(null, arguments); }; });
  root.World = {
    init, render, step, parallax, touch, setWeekStart, setDayShape,
    pick, boardAt, dayAt, slotWorld, toScreen, propScreen, cardWorld, ycardWorld, rowWorld, setHover, selAnchor, LANES, laneOf, blockAnchor,
    /* true when nothing on the desk is moving and nothing changed lately: the frame can be skipped.
       lazy: only something slow is moving (steam), so a few frames a second are plenty */
    get idle() { return stillFrames > 12; }, get lazy() { return lazyOnly && !moving && nowMs() >= activeUntil; },
    /* the light on the work right now, for the readability check */
    get light() { return { level: light.level, night: light.night, dim: light.dim, steady: light.steady, lamp: lampRig.on, accent: lampRig.spot ? lampRig.spot.intensity : 0 }; },
    get framed() { return framed(); }, get quality() { return quality; },
    /* a block's face color and label ink, the same as on the desk, for flat views like the phone's Today */
    look: (b) => { const lk = look(b); return { base: lk.base, ink: lk.ink }; },
    set onWeekLand(fn) { week.onLand = fn; },
    get userZoom() { return user.zoomTo; }, get focused() { return !!focus.pt; },
    xOf, minOf, rowZ, BOARD_Y, BLOCK_D, H_HARD, DB_HMUL,
    get layout() { return layout; }, get camera() { return camera; }, get busy() { return pops.length > 0 || tileMotions.size > 0; },
    get debug() { return { week, month, year, dayb, bench, pops, cam, camTo, holds, TF, WEEK_BOX, DAY_BOX, motion: { direction: navigationDirection, active: tileMotions.size } }; },
    get hours() { return { start: RAIL0, end: RAIL1 }; },
    get benchOn() { return benchOn; },
    get stats() { return renderer ? { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls } : null; },
    get props() { return { mode: propMode, cost: propCost, list: propList.map((p) => ({ id: p.id, side: p.side, to: p.to, keep: p.keep, rides: !!p.rides, foot: [p.foot0.x0, p.foot0.z0, p.foot0.x1, p.foot0.z1].map((v) => +v.toFixed(1)), tall: +tallOf(p).toFixed(1), k: +p.k.toFixed(2), dropped: !!p.dropped, box: p.box && [p.box.min.x, p.box.min.z, p.box.max.x, p.box.max.z].map((v) => +v.toFixed(1)), tf: TF[p.side === 'L' ? 'propsL' : 'propsR'].x })) }; }
  };
  Object.assign(root.World, changes);
})(typeof window !== 'undefined' ? window : globalThis);
