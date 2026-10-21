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
  /* == feel ==
     A version whose page carries the class `feel` (V11, docs/CORNERS-V11.md) moves the desk on springs:
     a block dips when it's touched, lifts with a shadow under it, swings as it's carried, falls the last
     bit, and lands with a knock at the moment it touches; the camera and the boards ease in and out.
     Every other version moves as it always did. */
  const FEEL = !!(root.document && root.document.body && root.document.body.classList.contains('feel'));
  /* a critically damped spring: x heads for `to` and keeps its speed from one frame to the next, so a
     new target never jolts it; it settles in about 4.7 / w seconds */
  function spring(x, v, to, w, dt) {
    const d = x - to, e = Math.exp(-w * dt), c = v + w * d;
    return [to + (d + c * dt) * e, (v - c * w * dt) * e];
  }
  function springV(p, v, to, w, dt) {
    let r = spring(p.x, v.x, to.x, w, dt); p.x = r[0]; v.x = r[1];
    r = spring(p.y, v.y, to.y, w, dt); p.y = r[0]; v.y = r[1];
    r = spring(p.z, v.z, to.z, w, dt); p.z = r[0]; v.z = r[1];
  }
  /* a spring that can swing past where it's going (zeta under 1), pushed by `push`: a carried block's sway */
  function sway(s, to, w, zeta, dt, push) {
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (-w * w * (s.x - to) - 2 * zeta * w * s.v + (push || 0)) * h; s.x += s.v * h; }
    /* (V11, lift and place: a spring that went to a number that isn't one heals to where it was going) */
    if (!Number.isFinite(s.x) || !Number.isFinite(s.v)) { s.x = Number.isFinite(to) ? to : 0; s.v = 0; }
  }
  /* a spring written the way the motion spec writes one (docs/LIFT-AND-PLACE.md): (response in seconds,
     damping ratio), mass 1. resp(0.22) is its pace for sway() */
  const resp = (r) => (2 * Math.PI) / Math.max(0.01, r);
  /* a soft cap: as x nears c it eases in instead of stopping dead */
  const softCap = (x, c) => c * Math.tanh(x / c);
  /* what the desk tells the app when a block touches down, comes home, or the week clicks into place, so a
     sound can play at that moment and not before (set by the app with World.onFeel) */
  let feelHook = null;
  const feelSay = (kind, a, b) => { if (feelHook) try { feelHook(kind, a, b); } catch (e) { /* fine */ } };

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

  /* A rounded rectangle, as explicit points (V11, lift and place: three keeps a zero length edge where an arc
     meets its line and the bevel tore a notch into the front wall there; points with no near duplicates and
     no closing point equal to the first close cleanly). seg: points along each corner */
  function rrShape(w, d, r, seg) {
    r = Math.max(0.001, Math.min(r, w / 2 - 0.0005, d / 2 - 0.0005));
    if (!FEEL) {
      const s = new T.Shape(), x = -w / 2, y = -d / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
      s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
      s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
      s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
      return s;
    }
    const n = seg || 8, x = -w / 2, y = -d / 2, pts = [];
    const arc = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); pts.push(new T.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); } };
    arc(x + w - r, y + r, -Math.PI / 2);
    arc(x + w - r, y + d - r, 0);
    arc(x + r, y + d - r, Math.PI / 2);
    arc(x + r, y + r, Math.PI);
    const clean = [];
    for (const p of pts) { const q = clean[clean.length - 1]; if (!q || Math.abs(q.x - p.x) > 1e-6 || Math.abs(q.y - p.y) > 1e-6) clean.push(p); }
    while (clean.length > 3 && Math.abs(clean[0].x - clean[clean.length - 1].x) <= 1e-6 && Math.abs(clean[0].y - clean[clean.length - 1].y) <= 1e-6) clean.pop();
    return new T.Shape(clean);
  }
  /* V11, lift and place: a brick's rounded ends and bevels shade smoothly (flat normals banded them, worst on a
     brick that swings), while its top and bottom stay flat (the top carries print: it stays the color it was
     made). Each side or bevel corner takes the average of the faces it touches within crease degrees */
  function creaseNormals(g, crease) {
    const pos = g.attributes.position, n = pos.count, cosC = Math.cos((crease || 50) * Math.PI / 180);
    const fn = new Float32Array(n), key = (i) => Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
    const face = [], a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      const nn = e1.subVectors(c, b).cross(e2.subVectors(a, b)).normalize().clone();
      face.push(nn); fn[i] = fn[i + 1] = fn[i + 2] = face.length - 1;
    }
    const cap = (f) => Math.abs(f.y) > 0.9995;
    const at = new Map();
    for (let i = 0; i < n; i++) { const f = face[fn[i]]; if (cap(f)) continue; const k = key(i); if (!at.has(k)) at.set(k, []); at.get(k).push(f); }
    const nor = new Float32Array(n * 3), sum = new T.Vector3();
    for (let i = 0; i < n; i++) {
      const f = face[fn[i]];
      if (cap(f) || !Number.isFinite(f.x)) { nor[i * 3] = f.x || 0; nor[i * 3 + 1] = Number.isFinite(f.y) ? f.y : 1; nor[i * 3 + 2] = f.z || 0; continue; }
      sum.set(0, 0, 0);
      for (const o of at.get(key(i)) || [f]) if (o.dot(f) >= cosC) sum.add(o);
      if (sum.lengthSq() < 1e-12) sum.copy(f);
      sum.normalize();
      nor[i * 3] = sum.x; nor[i * 3 + 1] = sum.y; nor[i * 3 + 2] = sum.z;
    }
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    return g;
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
    /* V11, lift and place: the bevel is at most a fifth of the width and the corner at most three tenths of
       the face, so a short brick stays a brick instead of a pill; four bevel steps and creased normals so
       the bevel catches the light as one curve (the bottom is darkened in the brick's shader, brickMats) */
    const b = FEEL ? Math.max(0.004, Math.min(0.06, w * 0.2, h / 2 - 0.005)) : Math.min(0.06, w / 2 - 0.012, h / 2 - 0.005);
    const fw = Math.max(0.02, w - 2 * b), fd = d - 2 * b;
    const shape = FEEL ? rrShape(fw, fd, Math.min(0.12, 0.3 * Math.min(fw, fd)), 6) : rrShape(fw, fd, 0.12);
    const g = new T.ExtrudeGeometry(shape, { depth: Math.max(0.002, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: FEEL ? 4 : 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    if (FEEL) creaseNormals(g, 50);
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
    const key = [sp.label, sp.sub, sp.icon, sp.ink, sp.wU.toFixed(2), dU, sp.done ? 1 : 0, sp.soft ? 1 : 0, sp.grip ? 1 : 0, sp.stack ? 1 : 0, sp.piece ? sp.pieceS || 1 : 0, sp.contL ? 1 : 0, sp.contR ? 1 : 0, sp.floorU ? sp.floorU.toFixed(3) : 0, sp.big ? 1 : 0].join('|');
    if (faceCache.has(key)) { const t = faceCache.get(key); faceCache.delete(key); faceCache.set(key, t); return t; }
    const k = dU > 1.5 ? 0.8 : 1;
    /* one scale across and down, so a long block's name is never stretched: a face too wide for a
       texture is drawn smaller in both directions */
    let PX = 170 * k;
    if (sp.wU * PX > 2048) PX = 2048 / sp.wU;
    /* V11: on the day board nothing prints smaller than it reads (sp.floorU is the size of 12 screen pixels
       on the desk as it's framed): a time that would print smaller is left off, and a name that would gives
       way to the block's mark. The block's panel says both */
    const minS = sp.floorU ? sp.floorU * PX : 0;
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
    /* V11, the Planner walk (7.1): a week block's name may stand taller in its face (sp.big), since the week is
       framed small: up to 0.44 of its depth where the day's stop at 0.28, so a name reads at 12 px where it fits */
    const capN = FEEL && sp.big ? 0.44 : 0.28, cap2 = FEEL && sp.big ? 0.34 : 0.24;
    if (W > H * 1.3) {
      cand.push({ k: 'icon1', s: sizeFor(g, label, iconRoom, H * capN), bonus: 1.12 });
      if (two) cand.push({ k: 'icon2', s: size2(iconRoom, H * cap2), bonus: 1.06 });
    }
    /* stacked: the name with its time printed under it, preferred on the day board whenever it fits */
    /* V11: a block marked done carries its check (the mark beside the name) from a shorter width */
    const doneMark = FEEL && sp.done;
    if (sp.stack && sp.sub && W > H * 0.95) {
      const withIcon = W > H * (doneMark ? 1.3 : 2.1), room = withIcon ? iconRoom : W - 2 * pad;
      const ns = sizeFor(g, label, room, H * 0.25);
      const subS = Math.min(H * 0.19, sizeFor(g, sp.sub, room, H * 0.19, 700, true));
      if (subS >= Math.max(14, minS) && ns >= H * 0.14) cand.push({ k: withIcon ? 'stackI' : 'stack', s: ns, subS, bonus: 1.5 });
    }
    cand.push({ k: 'text1', s: sizeFor(g, label, W - 2 * pad, H * capN), bonus: 1 });
    if (two) cand.push({ k: 'text2', s: size2(W - 2 * pad, H * cap2), bonus: 0.97 });
    /* wrapped: the name in up to three lines across a narrow block, with its time under it if there's room */
    if (W < H * 1.3 && W > H * 0.3) {
      const room = W - 2 * padX;
      const nm = wrapFit(g, label, room, H * 0.25, 3);
      let sub = null;
      if (sp.stack && sp.sub) {
        const sf = wrapFit(g, sp.sub, room, Math.min(nm.s * 0.74, H * 0.16), 2, 700, true);
        if (sf.s >= Math.max(13, minS)) sub = sf;
      }
      /* V11: done, the check sits over the name, a line of its own */
      const ck = doneMark ? nm.s * 1.0 : 0;
      const tall = (s) => ck + nm.lines.length * nm.s * 1.08 + (s ? H * 0.05 + s.lines.length * s.s * 1.18 : 0);
      if (sub && tall(sub) > H - 2 * pad) sub = null;
      if (tall(null) <= H - 2 * pad) cand.push({ k: 'wrap', s: nm.s, nm, sub, ck, bonus: sub ? 1.04 : 1 });
    }
    if (W < H * 0.9) {
      cand.push({ k: 'vert1', s: Math.min(sizeFor(g, label, H * 0.88, H * 0.3), W * 0.62), bonus: 0.92 });
      if (two && W > H * 0.34) cand.push({ k: 'vert2', s: Math.min(size2(H * 0.88, H * 0.26), W * 0.34), bonus: 0.9 });
    }
    if (minS) {
      for (let i = cand.length - 1; i >= 0; i--) if (cand[i].s < minS) cand.splice(i, 1);
      /* V11-3 (design review 6): before a block gives way to its mark, its name may stand taller in its face, the way a
         week block's does (up to half its depth on one line), so a shallow board (a phone folded, 386 wide) still
         names Sleep and Work wherever the name reads at the floor */
      if (!cand.length && label) {
        /* (at the floor or a little over it, never shouting: a fallback name is as big as it needs to be to read) */
        const at = (x) => Math.min(x, minS * 1.25);
        if (W > H * 1.3) cand.push({ k: 'icon1', s: at(sizeFor(g, label, iconRoom, H * 0.46)), bonus: 1.12 });
        cand.push({ k: 'text1', s: at(sizeFor(g, label, W - 2 * pad, H * 0.5)), bonus: 1 });
        /* two lines, as the wrap prints them (centered, a line and a little apart), up to 0.37 of the depth each */
        const nm2 = wrapFit(g, label, W - 2 * padX, at(H * 0.37), 2);
        if (nm2.lines.length === 2 && nm2.lines.length * nm2.s * 1.08 <= H - 2 * pad) cand.push({ k: 'wrap', s: nm2.s, nm: nm2, sub: null, ck: 0, bonus: 0.97 });
        if (W < H * 0.9) cand.push({ k: 'vert1', s: at(Math.min(sizeFor(g, label, H * 0.88, W * 0.62), W * 0.62)), bonus: 0.92 });
        for (let i = cand.length - 1; i >= 0; i--) if (cand[i].s < minS) cand.splice(i, 1);
      }
      if (!cand.length) {
        if (W > 8) Icons.draw(g, icon, W / 2, H / 2, Math.min(W * 0.6, H * 0.36), sp.ink);
        return keep(key, cv);
      }
    }
    /* V11: a block marked done takes a layout that shows its check whenever one fits */
    if (doneMark) {
      const marked = cand.filter((c) => c.k === 'icon1' || c.k === 'icon2' || c.k === 'stackI' || c.k === 'wrap');
      if (marked.length) cand.splice(0, cand.length, ...marked);
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
          if (subS >= Math.max(12, minS)) {
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
        const nm = best.nm, sb = best.sub, ck = best.ck || 0;
        const total = ck + nm.lines.length * nm.s * 1.08 + (sb ? H * 0.05 + sb.lines.length * sb.s * 1.18 : 0);
        let y = (H - total) / 2;
        if (ck) { Icons.draw(g, 'check', W / 2, y + ck * 0.45, ck * 0.8, sp.ink); y += ck; }
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
    const key = ['free', sp.label, sp.sub, sp.icon, sp.wU.toFixed(2), dU, ink.free, sp.floorU ? sp.floorU.toFixed(3) : 0].join('|');
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
    /* V11: as on a block, nothing on the day board prints smaller than it reads */
    const minS = sp.floorU ? sp.floorU * PX : 0;
    const big = W > H * 1.6 && (!minS || Math.min(H * 0.26, sizeFor(g, label, W - H * 1.1, H * 0.26)) >= minS);
    if (big) {
      const ns = Math.min(H * 0.26, sizeFor(g, label, W - H * 1.1, H * 0.26));
      let subS = sp.sub ? Math.min(H * 0.17, sizeFor(g, sp.sub, W - H * 1.1, H * 0.17, 700, true)) : 0;
      if (subS < minS) subS = 0;
      setFont(g, ns, 800);
      const lw = Math.max(g.measureText(label).width, subS ? (setFont(g, subS, 700, true), g.measureText(sp.sub).width) : 0);
      const iconS = H * 0.36, gap = H * 0.14, total = iconS + gap + lw, x0 = Math.max(H * 0.14, (W - total) / 2);
      Icons.draw(g, sp.icon || 'moon', x0 + iconS / 2, H / 2, iconS, pen);
      g.textAlign = 'left';
      setFont(g, ns, 800);
      if (subS >= 12) { g.fillText(label, x0 + iconS + gap, H * 0.4); setFont(g, subS, 700, true); g.fillText(sp.sub, x0 + iconS + gap, H * 0.68); }
      else g.fillText(label, x0 + iconS + gap, H / 2);
    } else if (FEEL && /^[^:]{1,24}: /.test(label) && W > H * 0.55) {
      /* V11, the Planner walk (7.2): a hand-off too narrow for "Sam: Pick up Robin" keeps its mark and says who has
         it under it ("Sam"), when that prints at the size it reads */
      const who = label.split(': ')[0], ws = Math.min(H * 0.2, sizeFor(g, who, W * 0.86, H * 0.2));
      if (ws >= Math.max(minS, H * 0.11)) {
        Icons.draw(g, sp.icon || 'moon', W / 2, H * 0.36, Math.min(W, H) * 0.34, pen);
        setFont(g, ws, 800); g.textAlign = 'center'; g.fillText(who, W / 2, H * 0.72);
      } else Icons.draw(g, sp.icon || 'moon', W / 2, H / 2, Math.min(W, H) * 0.42, pen);
    } else if (FEEL && /^[^:]{1,24}: /.test(label)) {
      /* (narrower still, the quarter hour a hand-off leaves when a routine takes back the rest: who has it, along it,
         the way a narrow block prints its name, when that prints at the size it reads) */
      const who = label.split(': ')[0], ws = Math.min(W * 0.62, sizeFor(g, who, H * 0.8, W * 0.62));
      if (ws >= Math.max(minS, 8)) { g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2); setFont(g, ws, 800); g.textAlign = 'center'; g.fillText(who, 0, 0); g.restore(); }
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
    /* V11: a kind of time a theme's own palette doesn't have yet (Friends) keeps its own color */
    const C = cats(), cat = C[b.cat] || (FEEL && Data.CATS[b.cat]) || C.yours;
    let base = cat.base, ink = cat.ink, h = H_HARD;
    if (b.sleep) { h = H_SLEEP; }
    else if (b.soft) { base = mix(cat.base, b.cat === 'work' ? '#EAF2FA' : '#FFFAF2', b.cat === 'work' ? 0.42 : 0.5); h = H_SOFT; ink = pickInk(base, cat.base); }
    if (b.done) { base = mix(base, '#E8E2D6', 0.55); ink = pickInk(base, cat.base); }
    if (b.dinner && !b.planned) { base = mix(cat.base, '#F3E7D2', 0.3); ink = pickInk(base, cat.base); }
    if (contrast(base, ink) < 4.5) ink = pickInk(base, cat.base);
    return { base, ink, h };
  }

  let focusFn = null, dimMat = null;
  /* V11: the dimmed wood is a touch lighter, so its printed name passes 4.5 to 1 (#3A2A16 on #B8946A, 4.91) */
  const DIM_INK = '#3A2A16';
  function setFocus(fn) { focusFn = typeof fn === 'function' ? fn : null; if (!dimMat) dimMat = lam(FEEL ? '#B8946A' : '#A9845C'); }

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
  /* V11, lift and place: a brick's material: one matte Lambert with a line of light along the bevel only (where
     the surface faces up between about 0.3 and 0.9: never the top, never the walls), view independent, so it
     stays matte; and the bottom a step darker (0.82), seen as it swings in your hand, in the same shader, so a
     brick is still one draw. The top's color is exactly the Lambert of the color it was made, so print on it
     keeps its contrast */
  const brickCache = new Map();
  function bevelLight(m) {
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', [
        '{',
        '  float ny = dot(normalize(normal), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));',
        '  float band = smoothstep(0.28, 0.42, ny) * (1.0 - smoothstep(0.78, 0.9, ny));',
        '  outgoingLight += diffuseColor.rgb * 0.09 * band;',
        '  outgoingLight *= mix(1.0, 0.82, step(ny, -0.5));',
        '}',
        '#include <opaque_fragment>'
      ].join('\n'));
    };
    m.customProgramCacheKey = () => 'sr-bevel-light';
    return m;
  }
  function brickMats(color) {
    let v = brickCache.get(color);
    if (!v) { v = bevelLight(new T.MeshLambertMaterial({ color })); brickCache.set(color, v); }
    return v;
  }
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
    /* (V11: every number a block moves by starts here, set: its speed, its dip, its grip, its glow. Started
       lazily in three places, one of them left the dip unset, and a block set down before its first frame
       went NaN and vanished where it landed) */
    g.userData = { body, face, pin, halo, grip, canGrip: false, key: null, w: -1, sig: '', target: new T.Vector3(), lift: 0, squash: 0, shrink: null, pickable: true, kind: 'block', vel: new T.Vector3(), pressK: 0, gripK: 0, haloK: 0 };
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
    /* V11: a day board block prints nothing smaller than it reads (dayPrintU, from the camera) */
    /* (the Planner walk, 7.1: and a week block, while the week is what's on the desk, by weekPrintU) */
    const floorU = FEEL && u.kind === 'dblock' ? dayPrintU : FEEL && u.kind === 'block' && !b.piece && zoomName === 'week' ? weekPrintU : 0;
    const sig = [themeV, b.label || b.name, sub, b.icon, lk.base, lk.ink, h, w.toFixed(3), dU, b.fixed && !b.sleep ? 1 : 0, b.done ? 1 : 0, b.soft ? 1 : 0, opts.grip ? 1 : 0, b.stack ? 1 : 0, b.free ? 1 : 0, b.piece ? b.pieceS || 1 : 0, b.contL ? 1 : 0, b.contR ? 1 : 0, floorU].join('|');
    u.block = b; u.h = h; u.hMul = hMul; u.wU = wU; u.gripOpt = !!opts.grip;
    /* a version can dim every block a moment isn't about (setFocus): plain darker wood, no print, same size */
    const dim = !!(focusFn && !b.free && !b.piece && !focusFn(b));
    const sig2 = sig + (dim ? '|dim' : '');
    if (sig2 === u.sig) return;
    /* feel: when a block's width changes where it sits (stretched, or open time cut around it), the edge
       that stays put stays put, instead of the new width arriving at once and its middle gliding over */
    if (FEEL && u.w > 0 && Math.abs(w - u.w) > 0.004 && g.visible && !u.wave && !u.dragging && !u.fall) {
      const L0 = g.position.x - u.w / 2, R0 = g.position.x + u.w / 2, L1 = u.target.x - w / 2, R1 = u.target.x + w / 2;
      if (Math.abs(L0 - L1) < 0.04 || Math.abs(R0 - R1) < 0.04) { g.position.x = u.target.x; if (u.vel) u.vel.x = 0; }
    }
    u.sig = sig2; u.w = w;
    u.haloS = { x: w + 0.9, z: dU + 0.9 };
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
      const ft = freeTex({ label: b.label || b.name, sub, icon: b.icon, wU: Math.round(w * 20) / 20, dU, floorU });
      if (u.face.material.map !== ft) { u.face.material.map = ft; u.face.material.needsUpdate = true; }
      u.pin.visible = false;
      return;
    }
    u.body.geometry = blockGeo(Math.round(w * 200) / 200, dU, h);
    u.body.material = FEEL ? brickMats(lk.base) : lam(lk.base); u.body.castShadow = !u.inHandRig;
    const face = u.face;
    face.scale.set(Math.max(0.02, w - 0.1), 1, dU - 0.1);
    face.position.y = h + 0.004;
    u.halo.scale.set(w + 0.9, 1, dU + 0.9);
    u.halo.position.y = 0.012;
    const grip = !!opts.grip && !b.soft && !b.sleep && !b.fixed && !b.done;
    /* a version can print only the mark on a week block too narrow for its name (window.SR_iconOnly); hovering names it */
    const thin = !!(window.SR_iconOnly && !opts.hMul && !b.piece && w < 0.42 && !b.free);
    /* V11: a dimmed block still says what it is, in a quiet brown on its plain wood (4.9 to 1), so you can
       aim between blocks while a moment is about something else */
    const ink = FEEL && dim ? DIM_INK : lk.ink;
    const tex = faceTex({ label: thin ? '' : b.label || b.name, sub: thin ? '' : sub, icon: b.icon, ink, wU: Math.round(w * 20) / 20, dU, done: b.done, soft: !!b.soft && !b.done, grip: grip && !dim, stack: !!b.stack, piece: !!b.piece, pieceS: b.pieceS, contL: !!b.contL, contR: !!b.contR, floorU, big: FEEL && u.kind === 'block' && !b.piece && !!floorU });
    if (face.material.map !== tex) { face.material.map = tex; face.material.needsUpdate = true; }
    u.canGrip = grip && w > dU * 0.9;
    if (u.canGrip) {
      const gs = Math.min(0.34, dU * 0.2);
      u.grip.material.map = gripTex(lk.ink); u.grip.material.needsUpdate = true;
      u.grip.scale.set(gs * 0.66, 1, gs);
      u.grip.position.set(w / 2 - gs * 0.55, h + 0.012, 0);
    }
    u.pin.visible = !!(b.fixed && !b.sleep && w > 0.3);
    face.visible = !dim || FEEL;
    if (dim) { u.body.material = dimMat; u.pin.visible = false; u.canGrip = false; }
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
    /* feel: a day that isn't your usual says what kind it is, when nothing more pressing is there */
    const kindLine = !r.trip && !(r.markers && r.markers.length) && !r.due && r.kind;
    /* V11, the Planner walk (7.3): an overlap says so on its day's tab, in the gold of an open question, after a trip or
       a date (which are the day), before what's due */
    const overLine = FEEL && !r.trip && !(r.markers && r.markers.length) && r.overlap;
    let line = r.trip ? r.trip : r.markers && r.markers.length ? r.markers[0] : overLine ? r.overlap : r.due ? r.due + (FEEL ? (r.due === 1 ? ' to-do due' : ' to-dos due') : r.due === 1 ? ' thing due' : ' things due') : kindLine ? r.kind : '';
    if (line) {
      const col = r.today ? '#FFE3A6' : r.trip ? '#2A4B90' : r.markers && r.markers.length ? '#983A5E' : overLine ? '#7A4E00' : kindLine ? '#5C4426' : '#963A28';
      const icon = r.trip ? 'plane' : r.markers && r.markers.length ? r.markerIcon || 'cake' : overLine ? 'overlap' : kindLine ? r.kindIcon || 'calendar' : 'flag';
      /* (the Planner walk, 7.1: the line prints at 12 screen pixels or more, the tab's face being about 210 to a unit;
         that big, what's due and an overlap say it in short words, "2 due", "5:30 pm", beside their marks) */
      const lineS = FEEL && weekPrintU ? Math.max(42, Math.min(72, Math.ceil(weekPrintU * 210))) : 42;
      if (lineS > 50 && !r.trip && !(r.markers && r.markers.length)) line = overLine ? r.overlap.replace(/^Overlap /, '') : r.due && !overLine ? r.due + ' due' : line;
      Icons.draw(g, icon, 56, 186, Math.max(50, lineS * 1.05), col);
      g.fillStyle = col; setFont(g, lineS, 700, true);
      g.fillText(ellipsize(g, line, W - 34 - Math.max(92, lineS * 1.6)), Math.max(92, lineS * 1.6), 202 + Math.max(0, lineS - 42) * 0.3);
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
    /* V11, the Planner walk (7.1): the hours print at 12 screen pixels or more (weekPrintU: the plank is 0.75 deep
       on the board and 150 tall here); where an hour between the threes can't, only every third prints */
    const need = FEEL && weekPrintU ? Math.ceil(weekPrintU / 0.75 * H) : 0;
    const minorS = Math.max(44, need), majorS = Math.min(104, Math.max(56, need)), minorOn = minorS <= 60;
    for (let hr = Math.ceil(RAIL0 / 60); hr <= RAIL1 / 60; hr++) {
      const x = (hr - RAIL0 / 60) * pxu;
      const major = hr % 3 === 0;
      cutRect(g, x - 3, H - (major ? 40 : 24), 6, major ? 40 : 24, 3);
      const lab = clock24 && hr < 24 ? (major ? hourLabel(hr) : String(hr)) : hourLabel(hr, major || hr === RAIL0 / 60 || hr >= 24);
      if (hr > RAIL0 / 60 && hr < RAIL1 / 60 && (major || minorOn)) {
        if (hr >= 24) {
          fitFont(g, lab.replace(' +1 day', ''), 185, major ? majorS : minorS, major ? 800 : 700, true);
          cutText(g, lab.replace(' +1 day', ''), x, H * 0.24, 3.5);
          setFont(g, Math.max(28, need), 700, true); cutText(g, '+1 day', x, H * 0.56, 2);
        } else { fitFont(g, lab, major ? 3 * pxu - 16 : pxu - 12, major ? majorS : minorS, major ? 800 : 700, true); cutText(g, lab, x, H * 0.36, 3.5); }
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

  const CAT = (c) => (cats()[c] || (FEEL && Data.CATS[c]) || cats().yours).base;
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
    /* a version can edge the days with time to yourself in gold (window.SR_starYours), to spot them across a month */
    if (window.SR_starYours && c.yours && c.inMonth) { g.strokeStyle = '#D9A93A'; g.lineWidth = 9; rr(g, 9, 9, W - 18, H - 18, 22); g.stroke(); }
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
      const more = !lines.length && !c.trip ? (c.yours ? (window.SR_starYours ? '★ ' : '') + c.yours + (window.SR_kindYours ? ' to yourself' : ' yours') : c.open ? c.open + ' open' : '') : '';
      setFont(g, 38, 700, true);
      if (more && 22 + tw + 16 + g.measureText(more).width <= W - 24) { g.fillStyle = c.yours ? '#6B4F0C' : '#5E4C36'; g.fillText(more, 22 + tw + 16, H - 76); }
    } else if (c.todo) {
      const t = c.todo + (FEEL ? (c.todo === 1 ? ' to-do' : ' to-dos') : c.todo === 1 ? ' to do' : ' to dos');
      setFont(g, 40, 700, true);
      g.fillStyle = '#1D6376'; g.fillText(t, 26, H - 74);
    } else if (c.yours && !lines.length && !c.trip) {
      setFont(g, 42, 700, true);
      g.fillStyle = '#6B4F0C'; g.fillText((window.SR_starYours ? '★ ' : '') + c.yours + (window.SR_kindYours ? ' to yourself' : ' yours'), 26, H - 72);
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
    setFont(g, FEEL ? Math.max(34, Math.min(64, yearNeed)) : 34, 800); g.fillStyle = '#6E5E4A'; g.fillText(String(m.year), 34 + nw + 16, 82); g.fillStyle = '#3A2C1E';
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
    /* V11, the Planner walk (5.4): the words on a year card print at 12 screen pixels or more where the card can hold
       them (n, from yearNeed, up to 64 on the card's canvas): fewer lines then, and "and 2 more"; the hours' words
       wrap to a second line. With n at 0 every size and place is what it was */
    const n = FEEL ? Math.min(64, yearNeed) : 0;
    const whenS = Math.max(32, n), nameS = Math.max(36, n), moreS = Math.max(30, n), yoursS = Math.max(46, n), wordsS = Math.max(30, n);
    const words = m.yours && !m.quiet ? (m.usual ? (window.SR_starYours ? 'to yourself, usually' : 'usually, to yourself') : window.SR_kindYours ? 'to yourself' : 'yours') : '';
    setFont(g, wordsS, 700, true);
    const wl = !words ? [] : n > 30 ? wrapWords(g, words, lw).slice(0, 2) : [words];
    const numY = m.quiet ? H - 40 : H - 28 - wl.length * wordsS * 1.2;
    /* a quiet month has nothing to list, and says nothing; a busy one lists what fits above its hours
       and says how many more there are */
    const bottom = m.yours ? (m.quiet ? H - 64 : numY) - yoursS * 48 / 46 : H - 24;
    for (const it of m.list) {
      setFont(g, nameS, 800);
      const wide = g.measureText(it.name).width > lw && it.name.includes(' ');
      const parts2 = wide ? twoLines(it.name) : [it.name];
      const left = m.list.length - shown - 1;
      if (y + whenS * 40 / 32 + nameS * 8 / 36 + (parts2.length - 1) * nameS * 38 / 36 > bottom - (left > 0 ? moreS * 40 / 30 : 0)) break;
      const col = it.kind === 'trip' ? '#2A4B90' : it.kind === 'marker' ? '#983A5E' : it.kind === 'due' ? '#963A28' : '#6E3F8A';
      g.fillStyle = col; setFont(g, whenS, 900);
      g.fillText(n ? ellipsize(g, it.when, lw) : it.when, lx, y);
      setFont(g, nameS, 800);
      g.fillStyle = '#3A2C1E';
      parts2.forEach((t, k) => g.fillText(ellipsize(g, t, lw), lx, y + whenS * 40 / 32 + k * nameS * 38 / 36));
      y += whenS * 40 / 32 + nameS * 46 / 36 + (parts2.length - 1) * nameS * 38 / 36;
      shown++;
    }
    if (shown < m.list.length) { g.fillStyle = '#6A5440'; setFont(g, moreS, 800); g.fillText('and ' + (m.list.length - shown) + ' more', lx, y - moreS * 8 / 30); }
    /* V11: a month after the first usual one shows its number alone (m.quiet); the words were said once */
    if (m.yours) { g.fillStyle = '#6B4F0C'; setFont(g, yoursS, 800); g.fillText((window.SR_starYours ? '★ ' : '') + (m.usual && !window.SR_starYours ? '~' : '') + m.yours, lx, numY); setFont(g, wordsS, 700, true); wl.forEach((t, i) => g.fillText(t, lx, H - 28 - (wl.length - 1 - i) * wordsS * 1.2)); }
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
  /* V11, lift and place: a groove sits level with the board (its strip stood 0.015 proud of it), so a brick
     seats into it, and what lies on the board over it (the landing outline, the shadow in hand) is never
     under it; drawn a hair in front of the board's top so the two never fight */
  const GROOVE_Y = FEEL ? BOARD_Y - 0.009 : BOARD_Y + 0.005;
  if (FEEL) { trackMat.polygonOffset = true; trackMat.polygonOffsetFactor = -1; trackMat.polygonOffsetUnits = -2; }
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
      track.position.set(X0 + railUnits() / 2, GROOVE_Y, 0);
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
    /* feel: open time cut around a block gets new names wherever the cut falls (its start is in its name).
       Its pieces keep their blocks as the cut moves, so nothing under the block you're holding pops in
       and out; and while a block is in hand, nothing on the board grows in. */
    const holding = FEEL && !!(drag.obj || drag.match);
    const spare = new Map();
    if (FEEL) {
      const want = new Set();
      rows.forEach((r) => r.blocks.forEach((b) => want.add(r.date + '|' + b.key)));
      week.blocks.forEach((m, key) => {
        const u = m.userData, b = u.block;
        if (want.has(key) || !b || u.shrink != null || (u.wave && !u.wave.show)) return;
        const base = u.date + '|' + (b.base || b.key);
        if (!spare.has(base)) spare.set(base, []);
        spare.get(base).push(key);
      });
    }
    rows.forEach((r, i) => {
      const row = week.rows[i];
      week.rowSpecs = rows;
      const sig = [r.date, r.wd, r.num, r.today, r.focus, (r.markers || []).join(','), r.trip || '', r.due || 0, r.markerIcon || '', r.kind || '', r.overlap || '', FEEL ? weekPrintU : ''].join('|');
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
        if (!m && FEEL) {
          const old = nearestSpare(spare.get(r.date + '|' + (b.base || b.key)), week.blocks, x);
          if (old) { m = week.blocks.get(old); week.blocks.delete(old); week.blocks.set(key, m); m.userData.key = key; }
        }
        if (!m) {
          m = makeBlock(b);
          m.userData.key = key;
          m.position.set(x, BOARD_Y, 0);
          m.scale.set(1, 0.001, 1);
          m.userData.grow = 0;
          m.userData.newTile = true;
          /* while a block is in hand, a new piece (the far side of a cut) comes up out of the groove quickly */
          if (holding) { m.userData.grow = 0.35; m.userData.growFast = true; m.userData.newTile = false; }
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
        if (FEEL) handShown(m, b);
      }
    });
    week.blocks.forEach((m, key) => {
      if (!seen.has(key) && m.userData.shrink == null && !(m.userData.wave && !m.userData.wave.show)) {
        if (opts.direction) moveTile(m, { show: false, delay: waveDelay({ x: m.userData.target.x, z: rowZ(m.userData.row) }, WEEK_BOX, navigationDirection), finish: () => { dropBlock(m); week.blocks.delete(key); } });
        /* feel: while a block is in hand, what the board no longer shows sinks away quickly, under your hand */
        else { m.userData.shrink = 1; if (holding) m.userData.shrinkFast = true; }
      }
    });
    setGapMarks(rows);
  }
  /* feel: of the pieces a cut block no longer needs, the one nearest where the new piece goes */
  function nearestSpare(pool, map, x) {
    if (!pool) return null;
    let best = -1, bd = Infinity;
    pool.forEach((k, i) => { const m = map.get(k); if (!m) return; const d = Math.abs(m.userData.target.x - x); if (d < bd) { bd = d; best = i; } });
    return best < 0 ? null : pool.splice(best, 1)[0];
  }
  /* feel: a block the board shows for the one in your hand stays out of sight; once you've let go (and
     it's home, if it flew home), it shows again */
  function handShown(m, b) {
    const u = m.userData;
    if (inHand(b)) { u.inHand = true; m.visible = false; }
    else if (u.inHand) { u.inHand = false; if (!u.held) m.visible = true; }
  }
  function setGapMarks(rows) {
    week.gapRows = rows;
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
      /* (the Planner walk, 7.1: a label that would print under 12 screen pixels steps out, as the day's do) */
      if (FEEL && weekPrintU && w * 46 / 420 < weekPrintU) { m.visible = false; return; }
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

  /* == kinds of day, laid out (feel) ==
     Every kind this day could be, as cards on a board under the day: the day as each kind would make it,
     morning, afternoon, and evening, with its hours to yourself. Tap one and the day becomes it. */
  const kinds = { group: null, base: null, title: null, cards: [], on: false, box: null, date: null, sig: '' };
  /* V11: a card is drawn at twice the size it will have on the screen (L.px, the room's estimate of screen
     pixels to a unit of the desk), with its words set in screen sizes: the name 16 to 19, the rest 13, nothing
     under 12, so a card reads at whatever size the room makes it. The lanes are named by their marks
     (sunrise, sun, moon), and a block's name prints only where most of it fits */
  function kindTexture(c, L) {
    const px = Math.max(6, L.px || 30), S = 2 * px, k = S / px;
    const W = Math.round(L.w * S), H = Math.round(L.d * S), cw = L.w * px;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const paper = c.current ? '#FFF7E8' : '#F4EAD8', inkD = '#3A2C1E', inkS = '#6A5440';
    const r = 12 * k;
    g.fillStyle = paper; rr(g, 2 * k, 2 * k, W - 4 * k, H - 4 * k, r); g.fill();
    if (c.current) { g.strokeStyle = '#1D5B56'; g.lineWidth = 3 * k; rr(g, 3.5 * k, 3.5 * k, W - 7 * k, H - 7 * k, r - 1.5 * k); g.stroke(); }
    const pad = 12 * k, nameS = Math.max(16, Math.min(19, cw * 0.075)) * k, smallS = 13 * k;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    /* the top line: its mark, its name, and its hours to yourself (which step down to the next line when the
       name needs the room: the name is what's read first) */
    const y1 = pad + nameS * 0.6;
    Icons.draw(g, c.icon || 'star', pad + 9 * k, y1, 18 * k, inkD);
    setFont(g, nameS, 900);
    const nameW = g.measureText(c.name).width;
    setFont(g, smallS, 800, true);
    const yt = c.yours ? '★ ' + c.yours : '', yw = yt ? g.measureText(yt).width + 8 * k : 0;
    const yoursTop = !!yt && nameW + 26 * k + yw <= W - pad * 2;
    let right = 0;
    if (yoursTop) { right = yw; g.fillStyle = '#6B4F0C'; g.textAlign = 'right'; g.fillText(yt, W - pad, y1); g.textAlign = 'left'; }
    setFont(g, nameS, 900); g.fillStyle = inkD;
    g.fillText(ellipsize(g, c.name, W - pad * 2 - 26 * k - right), pad + 26 * k, y1);
    /* the line under it: what it would take off (in red), or what it's for, with this weekday's usual kind tagged */
    const y2 = y1 + nameS * 0.6 + 6 * k + smallS * 0.6;
    let x = pad;
    if (yt && !yoursTop) { setFont(g, smallS, 800, true); g.fillStyle = '#6B4F0C'; g.fillText(yt, x, y2); x += yw + 4 * k; }
    if (c.often && !c.warn) {
      setFont(g, 12 * k, 800, true);
      const ow = g.measureText(c.often).width + 14 * k, oh = 20 * k;
      g.fillStyle = '#F2CF7A'; rr(g, x, y2 - oh / 2, ow, oh, oh / 2); g.fill();
      g.fillStyle = '#4B3A18'; g.textAlign = 'center'; g.fillText(c.often, x + ow / 2, y2 + 0.5 * k); g.textAlign = 'left';
      x += ow + 8 * k;
    }
    setFont(g, smallS, 700, true); g.fillStyle = c.warn ? '#963A28' : inkS;
    let lines = [];
    if (c.warn) { lines = wrapWords(g, c.warn, W - pad - x).slice(0, 2); if (lines[1]) lines[1] = ellipsize(g, lines[1], W - pad - x); }
    /* (V11, the Planner walk, 4.1: the line takes two lines before it ends in an ellipsis; with an Adds line, one) */
    else if (c.line && FEEL) { lines = wrapWords(g, c.line, W - pad - x).slice(0, c.adds ? 1 : 2); const last = lines.length - 1; if (last >= 0 && wrapWords(g, c.line, W - pad - x).length > lines.length) lines[last] = ellipsize(g, lines[last] + '…', W - pad - x); }
    else if (c.line) lines = [ellipsize(g, c.line, W - pad - x)];
    lines = lines.filter((t) => t && t.replace('…', '').length >= 4);
    lines.forEach((t, i) => g.fillText(t, x, y2 + i * smallS * 1.25));
    let textEnd = y2 + Math.max(0, lines.length - 1) * smallS * 1.25 + smallS * 0.6;
    /* V11, the Planner walk (4.1): what it adds, in words, under the line ("Adds: Nap 1 pm, Reading 2:30 pm"), so kinds
       can be told apart without reading colored bars; the bars stay as the picture */
    if (FEEL && c.adds) {
      setFont(g, smallS, 700, true); g.fillStyle = inkD;
      const al = wrapWords(g, c.adds, W - pad * 2).slice(0, c.warn ? 1 : 2);
      if (wrapWords(g, c.adds, W - pad * 2).length > al.length && al.length) al[al.length - 1] = ellipsize(g, al[al.length - 1] + '…', W - pad * 2);
      al.forEach((t, i) => g.fillText(t, pad, textEnd + smallS * 0.75 + i * smallS * 1.25));
      textEnd += al.length * smallS * 1.25 + 2 * k;
    }
    /* three lanes: the day, as this kind would make it */
    const n = (c.lanes || []).length || 3, gapL = 5 * k, laneTop = textEnd + 10 * k;
    const laneH = Math.max(12 * k, (H - pad - laneTop - gapL * (n - 1)) / n), lx = pad + 20 * k, lw = W - lx - pad;
    const nameF = (laneH >= 28 * k ? 13 : 12) * k;
    (c.lanes || []).forEach((Ln, i) => {
      const y = laneTop + i * (laneH + gapL);
      Icons.draw(g, Ln.icon || ['sunrise', 'sun', 'moon'][i] || 'moon', pad + 7 * k, y + laneH / 2, 14 * k, inkS);
      g.save(); rr(g, lx, y, lw, laneH, 6 * k); g.clip();
      g.fillStyle = 'rgba(120, 90, 50, 0.14)'; g.fillRect(lx, y, lw, laneH);
      const per = lw / Math.max(60, Ln.to - Ln.from);
      Ln.blocks.forEach((b) => {
        const a = Math.max(b.start, Ln.from), z = Math.min(b.start + b.dur, Ln.to);
        if (z - a < 5) return;
        const bx = lx + (a - Ln.from) * per + k, bw = Math.max(2, (z - a) * per - 2 * k);
        const base = b.sleep ? '#5C6272' : b.soft ? mix(CAT(b.cat), paper, 0.42) : CAT(b.cat);
        g.fillStyle = base; rr(g, bx, y + 2 * k, bw, laneH - 4 * k, 4 * k); g.fill();
        if (b.fresh) { g.strokeStyle = '#B5862A'; g.lineWidth = 1.5 * k; rr(g, bx + k, y + 3 * k, bw - 2 * k, laneH - 6 * k, 3.5 * k); g.stroke(); }
        if (!b.sleep && laneH >= 16 * k) {
          setFont(g, nameF, 800);
          const t = ellipsize(g, b.name || '', bw - 10 * k);
          if (t && t.replace('…', '').length >= 4) { g.fillStyle = b.soft ? inkD : pickInk(base, '#FFFFFF'); g.fillText(t, bx + 5 * k, y + laneH / 2 + 0.5 * k); }
        }
      });
      g.restore();
    });
    g.textBaseline = 'alphabetic';
    return canvasTex(cv);
  }
  /* V11: the cards are laid out by the room the camera has, in whichever number of columns makes each card
     the biggest (a card is read across, so its width counts most, and a row left short counts against it):
     two rows of four on a wide screen, two across on a tall one. Each card is as deep as the room's shape
     allows. px is about how many screen pixels a unit of the desk takes there, a little under, so print
     errs bigger (the far row is the smallest) */
  function kindsLayout(n) {
    const el = renderer && renderer.domElement.parentElement;
    const SW = (el && el.clientWidth) || root.innerWidth || 1280, SH = (el && el.clientHeight) || root.innerHeight || 800;
    const rw = Math.max(240, SW - insets.left - insets.right), rh = Math.max(200, SH - insets.top - insets.bottom);
    const W = DAY_BOX.x1 - DAY_BOX.x0, pad = 0.6, gap = 0.45, head = 1.1, edge = 2.4, lean = 0.92;
    const plan = (cols) => {
      const rows = Math.max(1, Math.ceil(n / cols)), w = (W - pad * 2 - gap * (cols - 1)) / cols;
      const wantD = (W + edge) * (rh / rw) / lean - edge;
      const d = Math.max(w * 0.5, Math.min(w * 0.95, (wantD - head - pad * 2 - gap * (rows - 1)) / rows));
      const D = head + pad + rows * d + (rows - 1) * gap + pad;
      const px = Math.min(rw / (W + edge), rh / ((D + edge) * lean)), cw = w * px, ch = d * px * lean;
      return { cols, rows, w, d, D, px, score: cw * Math.min(ch, cw * 0.7) * Math.pow(0.75, rows * cols - n) };
    };
    let best = null;
    for (let cols = 1; cols <= Math.max(1, Math.min(4, n)); cols++) { const p = plan(cols); if (!best || p.score > best.score) best = p; }
    /* it takes the day's place on the desk */
    const x0 = TF.day.x + DAY_BOX.x0, z0 = TF.day.z + (DAY_BOX.z0 + DAY_BOX.z1) / 2 - best.D / 2;
    return { cols: best.cols, rows: best.rows, w: best.w, d: best.d, W, D: best.D, x0, z0, pad, gap, head, px: 0.88 * best.px };
  }
  function setKinds(sp) {
    if (!sp) {
      if (!kinds.on) return;
      kinds.on = false;
      popItems([{ obj: kinds.base }, { obj: kinds.title }].concat(kinds.cards.filter((c) => c.visible).map((c) => ({ obj: c }))), false, null);
      kinds.cards.forEach((c) => { c.userData.pickable = false; });
      applyMode();
      maybeSolve();
      return;
    }
    const L = kindsLayout(sp.cards.length);
    /* kept, so the cards can be laid out again when the room changes (setInsets) */
    kinds.lastSp = sp;
    if (!kinds.group) {
      kinds.group = new T.Group(); world.add(kinds.group);
      kinds.base = mesh(slab(rrShape(1, 1, 0.08), BOARD_Y, 0.05, 0), woodMat());
      kinds.title = new T.Mesh(new T.PlaneGeometry(1, 1), printMat({ transparent: true, depthWrite: false }));
      kinds.title.rotation.x = -Math.PI / 2;
      kinds.group.add(kinds.base, kinds.title);
    }
    const fresh = !kinds.on;
    kinds.on = true; kinds.date = sp.date;
    /* the board: as wide as the day, deep enough for its rows, with its question cut into the wood */
    const dim = L.W.toFixed(2) + 'x' + L.D.toFixed(2);
    if (kinds.base.userData.dim !== dim) { kinds.base.userData.dim = dim; kinds.base.geometry.dispose(); kinds.base.geometry = slab(rrShape(L.W, L.D, 0.6), BOARD_Y, 0.05, 0); }
    kinds.base.position.set(L.x0 + L.W / 2, 0, L.z0 + L.D / 2);
    kinds.base.userData.baseY = 0;
    const tsig = sp.title + '|' + (sp.sub || '') + '|' + themeV;
    if (kinds.title.userData.sig !== tsig) {
      kinds.title.userData.sig = tsig;
      const TW = 2400, TH = Math.round(TW * L.head / (L.W - L.pad * 2));
      const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
      const g = cv.getContext('2d'); g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = ink.name; setFont(g, TH * 0.5, 900); cutText(g, sp.title, 0, TH * 0.5, 3);
      if (sp.sub) { const tw = g.measureText(sp.title).width; setFont(g, TH * 0.3, 700, true); g.fillStyle = ink.note || ink.name; cutText(g, sp.sub, tw + TH * 0.4, TH * 0.54, 2); }
      const old = kinds.title.material.map; kinds.title.material.map = canvasTex(cv); kinds.title.material.needsUpdate = true; if (old) old.dispose();
    }
    /* its size lives in baseScale, so the rise out of the desk keeps it */
    kinds.title.userData.baseScale = new T.Vector3(L.W - L.pad * 2, L.head, 1);
    if (!kinds.title.userData.pop) kinds.title.scale.copy(kinds.title.userData.baseScale);
    kinds.title.position.set(L.x0 + L.W / 2, BOARD_Y + 0.006, L.z0 + L.pad + L.head / 2);
    kinds.title.userData.baseY = BOARD_Y + 0.006;
    while (kinds.cards.length < sp.cards.length) {
      const c = new T.Group();
      const body = mesh(blockGeo(1, 1, 0.16), mat('#E9D8B8', { roughness: 0.8 }));
      const face = new T.Mesh(new T.PlaneGeometry(1, 1), printMat({ transparent: true, alphaTest: 0.02 }));
      face.geometry.rotateX(-Math.PI / 2); face.position.y = 0.165; face.receiveShadow = true;
      c.add(body, face);
      c.userData = { kind: 'kindcard', body, face, lift: 0, baseY: BOARD_Y };
      body.userData.owner = c; face.userData.owner = c;
      kinds.group.add(c);
      kinds.cards.push(c);
    }
    kinds.cards.forEach((c, i) => {
      const it = sp.cards[i], u = c.userData;
      if (!it) { if (c.visible && !u.pop) popItems([{ obj: c }], false, null); u.pickable = false; return; }
      u.id = it.id; u.pickable = true; u.baseY = BOARD_Y;
      const col = i % L.cols, row = Math.floor(i / L.cols);
      c.position.x = L.x0 + L.pad + L.w / 2 + col * (L.w + L.gap);
      c.position.z = L.z0 + L.pad + L.head + L.d / 2 + row * (L.d + L.gap);
      const gsig = L.w.toFixed(3) + ':' + L.d.toFixed(3);
      if (u.gsig !== gsig) { u.gsig = gsig; u.body.geometry = blockGeo(L.w, L.d, 0.16); u.face.scale.set(L.w - 0.08, 1, L.d - 0.08); }
      const sig = JSON.stringify(it) + gsig + themeV + '|' + Math.round(L.px);
      if (u.sig !== sig) { u.sig = sig; const old = u.face.material.map; u.face.material.map = kindTexture(it, L); u.face.material.needsUpdate = true; if (old) old.dispose(); }
    });
    kinds.box = { x0: L.x0, x1: L.x0 + L.W, z0: L.z0, z1: L.z0 + L.D };
    if (fresh) {
      /* they rise out of the desk, from the day outward, the way every board does */
      const origin = new T.Vector3(L.x0 + L.W / 2, 0, L.z0);
      /* a beat after the day sinks, so the two never stand in each other's place */
      const items = [{ obj: kinds.base, delay: 0.12 }, { obj: kinds.title, delay: 0.12 }].concat(kinds.cards.slice(0, sp.cards.length).map((c, i) => ({ obj: c, delay: 0.16 + 0.03 * i })));
      items.forEach((it) => { const u = it.obj.userData; if (!u.pop) { u.popK = 0; it.obj.position.y = (u.baseY || 0) - 1.1; } it.obj.visible = true; });
      popItems(items, true, origin);
      applyMode();
    }
    maybeSolve();
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
    year.months = months;
    year.cards.forEach((c, i) => {
      const m = months[i];
      c.userData.month = m.key;
      const sig = JSON.stringify(m) + (FEEL ? '|' + yearNeed : '');
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
  /* V11: the size of 12 screen pixels on the day board as the camera frames it (the player's zoom counted,
     in steps), so nothing on the board prints smaller than it reads; 0 until the day has been framed.
     dayScale is screen pixels to a unit of the board at the framed view */
  let dayPrintU = 0, dayScale = 0;
  /* V11, the Planner walk (7.1): the same for the week, so the week prints nothing smaller than it reads either:
     weekPrintU is 12 screen pixels on the week board (weekScale, from the camera, as dayScale is) */
  let weekPrintU = 0, weekScale = 0;
  function weekWatch() {
    if (!weekScale || zoomName !== 'week') return;
    const s = weekScale * Math.max(1, user.zoom || 1), q = Math.floor(Math.log2(Math.max(1, s)) * 4) / 4;
    const u = +(12 / Math.pow(2, q)).toFixed(4);
    if (u === weekPrintU) return;
    weekPrintU = u;
    week.blocks.forEach((m) => { const v = m.userData; if (v.block && v.wU && v.shrink == null) dressBlock(m, v.block, v.wU, v.dU, v.hMul && v.hMul !== 1 ? { hMul: v.hMul } : {}); });
    if (week.gapRows) setGapMarks(week.gapRows);
    if (week.header) { const old = week.header.material.map; week.header.material.map = headerTexture(); week.header.material.needsUpdate = true; if (old) old.dispose(); }
    (week.rowSpecs || []).forEach((r, i) => { const row = week.rows[i]; if (!row) return; const old = row.userData.tabFace.material.map; row.userData.tabFace.material.map = tabTexture(r); row.userData.tabFace.material.needsUpdate = true; row.userData.sig = ''; if (old) old.dispose(); });
    touch();
  }
  /* (the Planner walk, 5.4: and the year's cards: yearNeed is the size on a card's canvas that prints at 12 screen
     pixels, measured on the far row of cards, which prints smallest; the cards print again when it changes) */
  let yearNeed = 0, yearScale = 0;
  function yearWatch() {
    if (!yearScale || !year.months) return;
    const s = yearScale * Math.max(1, user.zoom || 1), q = Math.floor(Math.log2(Math.max(1, s)) * 4) / 4;
    const n = Math.ceil(12 * 134.3 / Math.pow(2, q));
    if (n === yearNeed) return;
    yearNeed = n;
    setYear(year.months);
    touch();
  }
  function printWatch() {
    if (FEEL && !directOn && !drag.obj && zoomName === 'week') { weekWatch(); return; }
    if (FEEL && !directOn && !drag.obj && zoomName === 'year') { yearWatch(); return; }
    if (!FEEL || !dayScale || directOn || drag.obj || zoomName !== 'day') return;
    const s = dayScale * Math.max(1, user.zoom || 1), q = Math.floor(Math.log2(Math.max(1, s)) * 4) / 4;
    const u = +(12 / Math.pow(2, q)).toFixed(4);
    if (u === dayPrintU) return;
    dayPrintU = u;
    /* the day's faces, its open time labels, and its header print again at the new size */
    dayb.blocks.forEach((m) => { const v = m.userData; if (v.block && v.wU && v.shrink == null) dressBlock(m, v.block, v.wU, v.dU, { hMul: v.hMul, grip: v.gripOpt }); });
    if (dayb.gapSp) setDayGaps(dayb.gapSp);
    /* (the Planner walk, 8.2: Block library beside the day prints again at the new size too) */
    if (bench.kitSp && bench.group && bench.group.userData.shown) setBench(bench.kitSp);
    if (dayb.headSp && dayb.header) { const old = dayb.header.material.map; dayb.header.material.map = dayHeaderTexture(dayb.headSp); dayb.header.material.needsUpdate = true; if (old) old.dispose(); }
    if (dayb.nowArgs) setNow.apply(null, dayb.nowArgs);
    const ru =Math.min(0.5, Math.max(0.3, Math.ceil(u * 100) / 100));
    if (ru !== rulerU) {
      rulerU = ru;
      dayb.lanes.forEach((x, i) => {
        const len = (x.l.to - x.l.from) / 60 * DU;
        replaceGeometry(x.ruler, new T.PlaneGeometry(len, rulerDepth()));
        const old = x.ruler.material.map; x.ruler.material.map = laneRulerTexture(x.l); x.ruler.material.needsUpdate = true; if (old) old.dispose();
        x.ruler.position.z = laneZ(i) - DB_D / 2 - rulerZ();
      });
    }
    touch();
  }
  /* The day board's shape. Wide is the desk's: Morning, Afternoon, and Evening side by side, named on
     the left. Tall is a portrait phone's: lanes of four hours stacked, no names (each lane's ruler
     says its hours), so the board is about as tall as it is wide and every block is about twice the
     size on the screen. docs/MOBILE-PASS.md. */
  let laneShape = 'wide';
  /* V11: how long a tall board's lanes are. Four hours on a phone; a portrait tablet's Now takes five, which
     fills its room with the day (laneMin, set by the app) */
  let tallMin = 240;
  function setDayShape(shape, laneMin) {
    shape = shape === 'tall' ? 'tall' : 'wide';
    const lm = FEEL && shape === 'tall' && laneMin >= 120 ? Math.round(laneMin / 60) * 60 : 240;
    if (shape === laneShape && lm === tallMin) return;
    laneShape = shape; tallMin = lm;
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
    for (let a = start; a < end; a += tallMin) out.push({ from: a, to: Math.min(end, a + tallMin), name: '', icon: 'sun' });
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
    /* the day's facts sit at the right end, so the name reads first and the facts read as notes on it.
       V11: they never print smaller than they read (dayPrintU); fewer fit, and the first ones step out */
    if (FEEL) dayb.headSp = sp;
    const fs0 = tall ? 48 : 54, fs = FEEL && dayPrintU ? Math.min(72, Math.max(fs0, Math.ceil(dayPrintU * H / 1.28))) : fs0, fk = fs / fs0;
    setFont(g, fs, 700, true);
    const ICON = 56 * fk, GAP = (tall ? 36 : 50) * fk, room = W - 56 - x;
    const said = (b) => (tall && b.short ? b.short : b.text);
    const bits = (sp.bits || []).map((b) => ({ b, t: said(b), w: g.measureText(said(b)).width }));
    const total = () => bits.reduce((a, it) => a + ICON + it.w, 0) + GAP * Math.max(0, bits.length - 1);
    while (bits.length && total() > room) {
      const wide = bits.reduce((m, it) => (it.w > m.w ? it : m), bits[0]);
      if (wide.w <= 160 * fk) { bits.shift(); continue; }
      /* V11-3 (design review 46): on the phone's narrow header, the first fact steps out before the longest one is cut,
         when that leaves the longest whole ("Thai place on Pacific", not "Thai place o…" beside "1 h for you") */
      if (FEEL && tall && bits.length > 1 && bits[0] !== wide && total() - bits[0].w - ICON - GAP <= room) { bits.shift(); continue; }
      const cut = ellipsize(g, said(wide.b), Math.max(160 * fk, wide.w - (total() - room)));
      /* V11: a fact cut down to a stub ("Left…") says nothing; the first one steps out instead */
      if (FEEL && cut.replace('…', '').length < 7 && cut !== said(wide.b)) { bits.shift(); continue; }
      wide.t = cut;
      wide.w = g.measureText(wide.t).width;
    }
    let bx = W - 56 - total();
    for (const it of bits) {
      const c = it.b.color || '#4A3A2A';
      g.fillStyle = c;
      Icons.draw(g, it.b.icon || 'star', bx + 22 * fk, 88, 46 * fk, c);
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
    /* V11: the ruler beside the lane already says its hours, and their span printed under the name came out
       too small to read, so the name and its mark stand alone (a lane past midnight still says Next day) */
    if (FEEL) {
      cutIcon(g, l.icon, W / 2, 130, 116, ink.mark, 4);
      g.fillStyle = ink.name; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitFont(g, l.name, W - 40, 84, 900);
      cutText(g, l.name, W / 2, 268, 4);
      if (l.from >= 1440) { g.fillStyle = ink.note; setFont(g, 50, 700, true); cutText(g, 'Next day', W / 2, 346, 3); }
      return canvasTex(cv);
    }
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
  /* V11: the ruler's hours print at least as big as they read on the screen (rulerU, set from dayPrintU),
     in a strip that grows into the room between lanes to hold them */
  let rulerU = 0.3;
  const rulerDepth = () => (rulerU > 0.3 ? rulerU + 0.22 : RULER_D);
  const rulerZ = () => (rulerU > 0.3 ? 0.11 + rulerDepth() / 2 : 0.37);
  function laneRulerTexture(l) {
    const hours = (l.to - l.from) / 60, hourPx = DU * RULER_PX;
    const W = Math.round(hours * hourPx), H = Math.round(rulerDepth() * RULER_PX);
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
        fitFont(g, lab, hourPx - 40, Math.round(rulerU * RULER_PX), 800, true);
        g.textAlign = x === 0 ? 'left' : 'center';
        cutText(g, lab, x === 0 ? x + 4 : x, rulerU > 0.3 ? (rulerU / 2 + 0.03) * RULER_PX : H * 0.31, 3.5);
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
      track.position.set(LX0 + len / 2, GROOVE_Y, laneZ(i));
      const face = new T.Mesh(new T.PlaneGeometry(2.14, DB_D - 0.06), printMat({ map: laneLabelTexture(l), transparent: true, alphaTest: 0.02 }));
      face.rotation.x = -Math.PI / 2; face.position.set(LX0 - 1.35, BOARD_Y + 0.004, laneZ(i)); face.receiveShadow = true;
      face.visible = laneShape !== 'tall';
      /* the ruler is cut into the board and lit by the same light, like the grooves under it */
      const ruler = new T.Mesh(new T.PlaneGeometry(len, rulerDepth()), printMat({ map: laneRulerTexture(l), transparent: true, depthWrite: false }));
      ruler.rotation.x = -Math.PI / 2; ruler.position.set(LX0 + len / 2, BOARD_Y + 0.006, laneZ(i) - DB_D / 2 - rulerZ()); ruler.receiveShadow = true;
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
    /* feel: as in the week, pieces of a cut block keep their bricks, and nothing flies in under your hand */
    const holdingDay = FEEL && !opts.fly && !!(drag.obj || drag.match);
    const spareDay = new Map();
    if (FEEL) {
      const want = new Set();
      for (const b of sp.blocks) for (let li = 0; li < LANES.length; li++) want.add(sp.date + '|' + b.key + '|' + li);
      dayb.blocks.forEach((m, key) => {
        const u = m.userData, b = u.orig;
        if (want.has(key) || !b || u.date !== sp.date || u.shrink != null || (u.wave && !u.wave.show)) return;
        [sp.date + '|' + (b.base || b.key) + '|' + u.lane, sp.date + '|' + (b.base || b.key)].forEach((base) => { if (!spareDay.has(base)) spareDay.set(base, []); spareDay.get(base).push(key); });
      });
    }
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
        if (!m && FEEL) {
          const at = dayX(li, s0) + (e0 - s0) / 120 * DU;
          const old = nearestSpare(spareDay.get(sp.date + '|' + (b.base || b.key) + '|' + li), dayb.blocks, at) || nearestSpare(spareDay.get(sp.date + '|' + (b.base || b.key)), dayb.blocks, at);
          if (old) { m = dayb.blocks.get(old); dayb.blocks.delete(old); dayb.blocks.set(key, m); m.userData.key = key; }
        }
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
        /* feel: while a block is in hand, a piece the board needs appears where it goes, not flying in */
        if (created && holdingDay) { m.position.copy(to); u.tileShown = true; u.grow = 0.35; u.growFast = true; }
        else if (created || (u.wave && !u.wave.show)) moveTile(m, { show: true, from, fromPosition, fresh: created && !from, duration: 0.5, delay: waveDelay(to, DAY_BOX, navigationDirection) });
        if (FEEL) handShown(m, b);
      }
    }
    dayb.blocks.forEach((m, key) => {
      const u = m.userData;
      if (seen.has(key) || u.shrink != null || (u.wave && !u.wave.show)) return;
      if (opts.fly) moveTile(m, { show: false, delay: waveDelay(u.target, DAY_BOX, navigationDirection), finish: () => { dropBlock(m); dayb.blocks.delete(key); } });
      else { u.shrink = 1; if (holdingDay) u.shrinkFast = true; }
    });
    dayb.date = sp.date;
    dayb.now = sp.now;
    dayb.onLand = opts.onLand || dayb.onLand;
    setDayGaps(sp);
  }
  function setDayGaps(sp) {
    dayb.gapSp = sp;
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
      /* V11: "1 h open" shows only where it prints at a size it reads (its words are 46 of the label's 420) */
      if (FEEL && dayPrintU && w * 46 / 420 < dayPrintU) { m.visible = false; return; }
      m.scale.set(w, w * 110 / 420, 1);
      m.position.set(dayX(it.li, (it.a + it.b) / 2), BOARD_Y + 0.022, laneZ(it.li));
    });
  }
  const dayGhostTex = new Map();
  /* a fourth argument (V11, lift and place): { past }, the time is over, so the outline shows a check */
  function showDayGhost(start, durMin, valid) {
    const go = arguments[3], kind = go && go.past ? 'past' : '';
    const segs = [];
    if (start != null) for (let li = 0; li < LANES.length; li++) {
      const L = LANES[li], a = Math.max(start, L.from), b = Math.min(start + durMin, L.to);
      if (b - a >= 1) segs.push({ li, a, b });
    }
    while (dayb.ghosts.length < LANES.length) {
      const g = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      g.rotation.x = -Math.PI / 2;
      /* V11: an outline stays hidden until it has a slot (ghostAim shows it) */
      if (FEEL) { g.visible = false; ghostLive(g); }
      dayb.group.add(g);
      dayb.ghosts.push(g);
    }
    dayb.ghosts.forEach((g, i) => {
      const sg = segs[i];
      if (FEEL) { if (!sg) { g.userData.on = false; return; } }
      else { g.visible = !!sg; if (!sg) return; }
      const w = (sg.b - sg.a) / 60 * DU;
      ghostD = DB_D;
      const key = w.toFixed(2) + valid + kind;
      if (!dayGhostTex.has(key)) dayGhostTex.set(key, ghostTexture(w, valid, kind));
      /* V11: the material is marked changed only when its picture changes, not on every move */
      if (!FEEL || g.material.map !== dayGhostTex.get(key)) { g.material.map = dayGhostTex.get(key); g.material.needsUpdate = true; }
      /* feel: a part that stays in its lane glides; one that moved to another lane starts there. V11, lift and
         place: on top of whatever it overlaps, drawn over the bricks */
      if (FEEL) { g.userData.ok = !!valid; if (g.userData.lane !== sg.li) g.userData.on = false; g.userData.lane = sg.li; const x0 = dayX(sg.li, sg.a); ghostAim(g, x0 + w / 2, BOARD_Y + (hand.use ? ghostTop(dayb.blocks, (u) => u.lane === sg.li, x0, x0 + w) + 0.01 : 0.03), laneZ(sg.li), w - GAP, DB_D); return; }
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
    /* V11: the line under the name prints larger, so it reads with the week and the bench framed together */
    g.fillStyle = '#5A4632'; fitFont(g, sp.sub || '', W - 240, FEEL ? 62 : 46, 700, true);
    g.fillText(sp.sub || '', 180, FEEL ? 184 : 180);
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
    /* (V11, the Planner walk, 8.2: Block library's words on the wood, its group names, print at 12 screen pixels too, as
       far as the band above each row holds them) */
    const fl = FEEL && sp.kit && dayPrintU ? Math.min(0.42, dayPrintU) : 0;
    const sig = JSON.stringify([sp.prints, bench.width, bench.depth, ink.name, fl]);
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
      setFont(g, Math.max(t.size || 0.34, fl) * PX, t.soft ? 700 : 800, !!t.soft);
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
    const sig = rowD + '|' + (FEEL ? dayPrintU : '') + '|' + list.map((it) => it.label + ':' + (it.w || 1.5)).join(',');
    if (sig === kitMemo.sig) return kitMemo.s;
    const g = document.createElement('canvas').getContext('2d');
    const H = Math.round(rowD * 170 * (rowD > 1.5 ? 0.8 : 1));
    const sizes = list.map((it) => wrapFit(g, it.label, ((it.w || 1.5) - GAP * 2 - 0.1) * H / rowD - H * 0.16, H * 0.2, 2).s / H).sort((a, b) => a - b);
    /* one or two very long names may shrink on their own instead of shrinking everyone */
    let s = Math.max(0.15, sizes[Math.min(2, sizes.length - 1)] || 0.17);
    /* V11, the Planner walk (8.2): the names print at 12 screen pixels or more beside the day (the rack is framed
       with it, so the day's print size is the rack's); a name too long for that wraps to its second line */
    if (FEEL && dayPrintU) s = Math.max(s, Math.min(0.3, dayPrintU / rowD));
    kitMemo = { sig, s };
    return s;
  }
  function setBench(sp) {
    bench.kitSp = sp && sp.kit ? sp : null;
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
        /* feel: the pieces drop onto the bench one after another, like tiles out of a bag, and settle */
        if (FEEL && !reduced) { m.scale.set(1, 1, 1); m.userData.grow = null; m.visible = false; m.userData.fall = { t: 0, delay: i * 0.028, dur: 0.15, y0: 1.2, fx: null, hide: true, tap: i % 2 === 0 }; }
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
      /* a pop starts where the board is: where the last step left it (popK), or, when the pop before this one
         hasn't taken a step yet, where that one starts. (V11-2: a hide and a show before any step read popK
         before anything wrote it, so the week board, shown from the start, rose from a number that isn't one,
         and the day's blocks flying home to it went with it. A boot that opens Today and then the Planner did
         it, a tab in the background, Dev holding another day in Today.) */
      const was = u.pop, at = was ? (was.t > 0 ? u.popK : was.from) : show ? 0 : 1;
      u.pop = { show, t: 0, delay: reduced ? 0 : show ? 0.08 + dist * 0.018 + (it.delay || 0) : dist * 0.006, from: Number.isFinite(at) ? at : show ? 0 : 1, ticked: false, onTick };
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
  function finishTile(obj, quiet) {
    const u = obj.userData, motion = u.wave;
    if (!motion) return;
    applyTilePose(obj, tileDestination(obj, motion));
    obj.visible = motion.show; u.tileShown = motion.show; u.wave = null;
    tileMotions.delete(obj);
    /* feel: a tile that arrives settles as it lands */
    if (FEEL) { if (u.vel) u.vel.set(0, 0, 0); if (motion.show && !quiet && !reduced && (u.kind === 'block' || u.kind === 'dblock')) u.sq = { t: 0, amp: 0.05 }; }
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
  function settleTiles() { tileMotions.forEach((o) => finishTile(o, true)); }
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
    if (!on && obj === dayb.group && dayb.blocks.size && !reduced && !kinds.on) obj.userData.pop.delay = 0.46;
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
    shown(dayb.group, dayOn && !kinds.on, null, onTick);
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
    if (dayOn && !(kinds.on && kinds.box)) list.push(placeBox(DAY_BOX, TF.day));
    if (dayOn && kinds.on && kinds.box) list.push(kinds.box);
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
    if (FEEL && !reduced) {
      /* feel: the mat moves with the boards, on the same springs */
      const v = deskMat.v || (deskMat.v = { x0: 0, x1: 0, z0: 0, z1: 0 });
      for (const key of ['x0', 'x1', 'z0', 'z1']) {
        if (Math.abs(to[key] - b[key]) > 0.005 || Math.abs(v[key]) > 0.02) { const r = spring(b[key], v[key], to[key], 9, dt); b[key] = r[0]; v[key] = r[1]; slid = true; }
        else { b[key] = to[key]; v[key] = 0; }
      }
    } else for (const key of ['x0', 'x1', 'z0', 'z1']) { const dv = to[key] - b[key]; if (Math.abs(dv) > 0.005) { b[key] += dv * k; slid = true; } else b[key] = to[key]; }
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
    const sh = mt ? sideShift(mt, sideKept, sideAt) : null;
    TF.propsL = { x: mt ? sh.L : clearSide(propBoxes.L, boards, -1), z: 0, s: 1 };
    TF.propsR = { x: mt ? sh.R : clearSide(propBoxes.R, boards, 1), z: 0, s: 1 };
  }
  /* how far each side's holder slides so the nearest thing that stays sits a hand's width off the mat */
  function sideShift(mt, keep, at) {
    const hug = (list, dir) => (!list.length ? 0 : dir > 0 ? mt.x1 + 0.45 - Math.min(...list.map((p) => p.x0)) : mt.x0 - 0.45 - Math.max(...list.map((p) => p.x1)));
    const feet = (sd) => (keep ? propList.filter((p) => p.side === sd && keep.has(p)).map((p) => footAt(p, at)) : propBoxes[sd]);
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
  /* V11, the Today walk (6.4): in Now, the notepad may stand at the place of a thing on its side that matters less (where
     the mug stood, the mug stepping out for it); sideAt holds each moved thing's step from its own place then, and
     footAt is a thing's footprint where it stands */
  let sideAt = null;
  const atOf = (p, at) => (at && at.get(p)) || null;
  const footAt = (p, at) => { const a = atOf(p, at), f = p.foot0; return a ? { x0: f.x0 + a.dx, x1: f.x1 + a.dx, z0: f.z0 + a.dz, z1: f.z1 + a.dz } : f; };
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
      /* (6.4: beside the mat, a thing moved to another's place stands there) */
      const sa = propMode === 'side' && !u ? atOf(p, sideAt) : null;
      p.tx = u ? p.rest.x + u.dx : p.rest.x + (sa ? sa.dx : 0);
      p.tz = u ? p.rest.z + u.dz : p.rest.z + (sa ? sa.dz : 0);
      /* in the back row a lamp built to face the board turns in toward the work */
      const t = u ? turnIn(p) : null;
      p.try = t != null ? t : p.rest.ry;
      if (!u) { const v = sa ? new T.Vector3(sa.dx, 0, sa.dz) : null; p.box = v ? new T.Box3(p.box0.min.clone().add(v), p.box0.max.clone().add(v)) : p.box0; continue; }
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
  let propsAway = false;
  /* V11: while a stack is framed close on the bench, the things on the desk step out, so the work is
     all there is (they come back when it's put away) */
  let benchAway = false;
  function setPropsAway(on) { on = !!on; if (on === propsAway) return; propsAway = on; camSig = ''; maybeSolve(); }
  function seenProps(cam, W, H, whole) {
    if (propsAway || benchAway) return propList.map(() => false);
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
      if (whole) p.seenR = +(seen / area).toFixed(3);
      return seen / area >= (whole || 0.8) && !p.dropped;
    });
  }
  /* A thing that rides with another (the pencil with the notepad) shows only with it. While a panel is
     open nothing new comes onto the desk; things only step out if the panel covers them. */
  function decideProps(cam, W, H) {
    /* (V11-3, design review 31: what stays is whole. The box is the thing's corners seen in 3D, which reads larger than
       the thing itself, so a thing wholly on screen measures 0.85 to 1; the lamp cut by the window's edge at 1440 wide
       measured 0.82 and stayed under the old 0.8. The camera's search keeps 0.8, so where it frames the board doesn't
       change, only what's allowed to stand there) */
    const seen = seenProps(cam, W, H, FEEL ? 0.84 : 0), at = new Map(propList.map((p, i) => [p, i]));
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
    if (FEEL && !reduced) {
      /* feel: the boards slide over on springs, so they ease off and ease in */
      for (const name of Object.keys(holds)) {
        const h = holds[name], t = TF[name], v = h.userData.v || (h.userData.v = { x: 0, z: 0, s: 0 });
        let r = spring(h.position.x, v.x, t.x, 9, dt); h.position.x = r[0]; v.x = r[1];
        r = spring(h.position.z, v.z, t.z, 9, dt); h.position.z = r[0]; v.z = r[1];
        r = spring(h.scale.x, v.s, t.s, 9, dt); h.scale.setScalar(r[0]); v.s = r[1];
        if (Math.abs(t.x - h.position.x) + Math.abs(t.z - h.position.z) + Math.abs(t.s - h.scale.x) > 0.002 || Math.abs(v.x) + Math.abs(v.z) + Math.abs(v.s) > 0.01) moving = true;
        else { h.position.x = t.x; h.position.z = t.z; h.scale.setScalar(t.s); v.x = v.z = v.s = 0; }
      }
      return;
    }
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
      if (kinds.on && kinds.box) return Object.assign(grow(kinds.box), { y1: 1.0, elev: 1.16 });
      /* V11: a tall board on a portrait tablet's Now is seen from a little higher, so its far lanes read flat too */
      if (alone && !benchOn) return Object.assign(grow(placeBox(DAY_BOX, TF.day)), { y1: 1.0, elev: FEEL && laneShape === 'tall' ? 1.3 : 1.13 });
      const bb = placeBox(benchBox(), TF.bench);
      if (dayOnly && bench.arrange === 'below') bb.z1 = Math.min(bb.z1, bb.z0 + 2.4);
      return Object.assign(grow(union([placeBox(DAY_BOX, TF.day), bb])), { y1: 1.0, elev: 1.13 });
    }
    const list = [placeBox(WEEK_BOX, TF.week)];
    if (benchOn) list.push(placeBox(benchBox(), TF.bench));
    /* with the tray open the board matters more than the mat around it: the mat's front and back
       edges may slide under the panels, and the week keeps its size */
    const u = union(list);
    /* V11-3 (design review 38): a room taller than it is wide (an iPad upright) sees the week from higher, so its seven
       rows stand taller in the height a wide board leaves empty; its width is the same, so it's never smaller */
    const elev = FEEL ? 1.1 + Math.min(0.22, Math.max(0, (roomAspect - 0.9) * 0.8)) : 1.1;
    if (tight) return { x0: u.x0 - 1.2, x1: u.x1 + 1.2, z0: u.z0 - 0.45, z1: u.z1 + 0.2, y1: 0.5, elev };
    return Object.assign(grow(u), { y1: 0.5, elev });
  }
  /* (the room the board is framed in, tall over wide, from the last solve) */
  let roomAspect = 0.6;
  let tight = false;
  function setTight(on) { on = !!on; if (on === tight) return; tight = on; maybeSolve(); }
  const tmpCam = new T.PerspectiveCamera(30, 1, 1, 400);
  /* V11 (feel): a stack laid out on the bench in the week view is framed close, so its pieces read and
     grab. The bench grows where it sits, as far as the room allows (a third at most), and the week stays
     in view beside it. Picking a piece up eases back out to the week and the bench side by side, zooming
     around the piece in your hand so it stays under the pointer; a beat after it lands, the camera eases
     back in while pieces remain. The zoom is a scale around a point on the desk (`at`) on top of the
     framed view, like the lean; `pan` keeps the view still when that point moves. Calmer motion and the
     system's reduced motion never zoom here, so nothing travels. */
  /* only as close as reading needs: a desk unit about 48 px across (a piece's name near 14 px), and never
     more than 1.7 times the framed view (the To-dos panel beside it leaves the desk the least room) */
  const BENCH_ZMAX = 1.7, BENCH_PX = 48;
  /* slack: how far (in desk units) the carried view may shift each way before the week or the bench would
     leave the room; the piece in hand stays put up to that, and the view gives way past it */
  const benchCam = { want: false, s: 1, q: new T.Vector3(), at: new T.Vector3(), z: 1, zTo: 1, zV: 0, pan: new T.Vector3(), panTo: new T.Vector3(), panV: new T.Vector3(), carry: false, back: 0, slack: { l: 0, r: 0, t: 0, b: 0 } };
  const benchTmp = new T.PerspectiveCamera(30, 1, 1, 400);
  const benchReady = () => { for (const m of bench.pieces.values()) if (m.userData.shrink == null && m.userData.piece && m.userData.piece.drag) return true; return false; };
  /* (not while a side panel is open: it's about one thing, and the week shows where that goes) */
  const benchWanted = () => FEEL && !reduced && layout === 'week' && zoomName === 'week' && benchOn && !alone && !phoneDay && !kinds.on && !insets.hold && benchReady();
  /* the zoom's center moves to p without the view jumping: the difference goes into the pan */
  function benchCenter(p) {
    const b = benchCam;
    b.pan.x += (b.z - 1) * (b.at.x - p.x); b.pan.z += (b.z - 1) * (b.at.z - p.z);
    b.at.set(p.x, 0, p.z);
  }
  /* in close on the bench, or out to the whole desk when there's nothing there to place */
  function aimBench() {
    const b = benchCam;
    if (b.want && b.s > 1.001) { benchCenter(b.q); b.zTo = b.s; } else b.zTo = 1;
    b.panTo.set(0, 0, 0);
  }
  /* a piece off the bench is in hand (obj), or let go (null; o.placed: it landed somewhere) */
  function benchCarry(obj, o) {
    const b = benchCam;
    if (!FEEL) return;
    if (obj) {
      if (!b.want || b.carry) return;
      b.carry = true; b.back = 0;
      benchCenter(obj.getWorldPosition(new T.Vector3()));
      b.panV.set(0, 0, 0);
      b.panTo.set(Math.max(-b.slack.r, Math.min(b.slack.l, b.pan.x)), 0, Math.max(-b.slack.b, Math.min(b.slack.t, b.pan.z)));
      b.zTo = 1;
      return;
    }
    if (!b.carry) return;
    b.carry = false;
    /* a beat to see it land, then back in */
    b.back = nowMs() + (o && o.placed ? 650 : 240);
  }
  function stepBenchCam(dt) {
    const b = benchCam;
    if (b.back && !b.carry && nowMs() >= b.back) { b.back = 0; aimBench(); }
    if (reduced) { b.z = b.zTo = 1; b.zV = 0; b.pan.set(0, 0, 0); b.panTo.set(0, 0, 0); b.panV.set(0, 0, 0); return; }
    const r = spring(b.z, b.zV, b.zTo, 9, dt); b.z = r[0]; b.zV = r[1];
    springV(b.pan, b.panV, b.panTo, 9, dt);
    if (Math.abs(b.z - b.zTo) > 0.0005 || Math.abs(b.zV) > 0.003 || b.pan.distanceToSquared(b.panTo) > 1e-6 || b.panV.lengthSq() > 1e-5) {
      moving = true;
      /* the piece in hand stays where it is on screen while the view moves under it (the pointer hasn't) */
      if (b.carry && drag.obj && drag.target) b.keep = drag.target.clone().project(camera);
    } else { b.z = b.zTo; b.zV = 0; b.pan.copy(b.panTo); b.panV.set(0, 0, 0); }
  }
  /* after the camera moved: the piece in hand back on the spot of the screen it was on (see stepBenchCam) */
  function keepBenchHand() {
    const b = benchCam, k = b.keep;
    b.keep = null;
    if (!k || !drag.obj || !drag.target) return;
    camera.updateMatrixWorld();
    const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2(k.x, k.y), camera);
    const hit = new T.Vector3();
    if (rc.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -drag.target.y), hit)) drag.target.set(hit.x, drag.target.y, hit.z);
  }
  /* How close the bench can be framed from the framed view in tmpCam: its box on screen grows around its
     own middle (or, when that runs into an edge, around the point that keeps its gaps to the room's edges
     in proportion), as far as it still fits, up to BENCH_ZMAX. Returns a camera at that framing, or null. */
  function benchClose(W, H, sx0, sx1, sy0, sy1) {
    const b = benchCam;
    b.want = benchWanted();
    if (!b.want) { b.s = 1; aimBench(); return null; }
    const box = (bx, y1) => { const out = []; for (const x of [bx.x0, bx.x1]) for (const z of [bx.z0, bx.z1]) for (const y of [0, y1]) out.push(new T.Vector3(x, y, z)); return out; };
    const bb = placeBox(benchBox(), TF.bench), pts = box(bb, BOARD_Y + 0.4);
    const shot = (cam, list) => {
      const r = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      for (const c of list || pts) { const p = c.clone().project(cam), px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H; r.x0 = Math.min(r.x0, px); r.x1 = Math.max(r.x1, px); r.y0 = Math.min(r.y0, py); r.y1 = Math.max(r.y1, py); }
      return r;
    };
    const m = 12, room = { x0: sx0 + m, x1: sx1 - m, y0: sy0 + m, y1: sy1 - m }, b0 = shot(tmpCam);
    /* the carried view's slack: the week and the bench together on screen, against the room, in desk units */
    {
      const all = shot(tmpCam, box(union([placeBox(WEEK_BOX, TF.week), bb]), BOARD_Y + 0.4));
      const c = new T.Vector3((bb.x0 + bb.x1) / 2, 0, (bb.z0 + bb.z1) / 2), at = (v) => { const p = v.project(tmpCam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
      const o = at(c.clone()), kx = Math.max(1, Math.abs(at(c.clone().setX(c.x + 1)).x - o.x)), kz = Math.max(1, Math.abs(at(c.clone().setZ(c.z + 1)).y - o.y));
      b.slack = { l: Math.max(0, all.x0 - room.x0) / kx, r: Math.max(0, room.x1 - all.x1) / kx, t: Math.max(0, all.y0 - room.y0) / kz, b: Math.max(0, room.y1 - all.y1) / kz };
      b.need = BENCH_PX / kx;
    }
    /* where a scale by s around a point leaves the bench's gaps to the room in the same proportion */
    const fixed = (s, lo, hi, a0, a1) => { const g0 = Math.max(0, a0 - lo), g1 = Math.max(0, hi - a1), left = (hi - lo) - s * (a1 - a0); return (lo + (g0 + g1 > 0 ? left * g0 / (g0 + g1) : left / 2) - s * a0) / (1 - s); };
    /* V11: the week comes too. The board and the bench stay inside the room together, so framing the bench
       close never pushes the week's first hours off the screen (Oct 14, To-dos at 1440 by 900): the close
       view grows only as far as the room has slack around both */
    const allPts = box(union([placeBox(WEEK_BOX, TF.week), bb]), BOARD_Y + 0.4), u0 = shot(tmpCam, allPts);
    const inRoom = (r) => r.x0 >= room.x0 - 1 && r.x1 <= room.x1 + 1 && r.y0 >= room.y0 - 1 && r.y1 <= room.y1 + 1;
    const ground = new T.Plane(new T.Vector3(0, 1, 0), 0), rc = new T.Raycaster(), c0 = tmpCam.position.clone();
    benchTmp.copy(tmpCam); benchTmp.updateProjectionMatrix();
    const place = (s, q) => { benchTmp.position.copy(q).addScaledVector(c0.clone().sub(q), 1 / s); benchTmp.updateMatrixWorld(); };
    /* the bench's middle first, so a piece carried off it moves the view the least */
    /* V11: with the week in view too, the two together sit in the middle of the room first (the point a scale
       by s turns the pair's middle into the room's), so they're never left low with bare desk above */
    const mid = (s, lo, hi, a0, a1) => ((lo + hi) / 2 - s * (a0 + a1) / 2) / (1 - s);
    const closeAt = (s) => {
      const tries = [[(b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2], [fixed(s, room.x0, room.x1, b0.x0, b0.x1), fixed(s, room.y0, room.y1, b0.y0, b0.y1)], [fixed(s, room.x0, room.x1, u0.x0, u0.x1), fixed(s, room.y0, room.y1, u0.y0, u0.y1)]];
      if (FEEL) tries.unshift([mid(s, room.x0, room.x1, u0.x0, u0.x1), mid(s, room.y0, room.y1, u0.y0, u0.y1)]);
      for (const [px, py] of tries) {
        rc.setFromCamera(new T.Vector2(px / W * 2 - 1, 1 - py / H * 2), tmpCam);
        const q = new T.Vector3();
        if (!rc.ray.intersectPlane(ground, q)) continue;
        place(s, q);
        if (inRoom(shot(benchTmp)) && (!FEEL || inRoom(shot(benchTmp, allPts)))) return q;
      }
      return null;
    };
    let lo = 1, hi = Math.min(BENCH_ZMAX, b.need || BENCH_ZMAX, (room.x1 - room.x0) / Math.max(1, b0.x1 - b0.x0), (room.y1 - room.y0) / Math.max(1, b0.y1 - b0.y0)), s = 1, q = null;
    if (FEEL) hi = Math.min(hi, (room.x1 - room.x0) / Math.max(1, u0.x1 - u0.x0), (room.y1 - room.y0) / Math.max(1, u0.y1 - u0.y0));
    if (hi > 1.06) {
      q = closeAt(hi);
      if (q) s = hi;
      else for (let k = 0; k < 12; k++) { const mid = (lo + hi) / 2, at = closeAt(mid); if (at) { lo = mid; s = mid; q = at; } else hi = mid; }
    }
    if (!q || s < 1.06) { b.s = 1; aimBench(); return null; }
    b.s = s; b.q.set(q.x, 0, q.z);
    place(s, b.q);
    if (!b.carry && !b.back) aimBench();
    return benchTmp;
  }
  function solveCamera() {
    benchAway = false;
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
    roomAspect = (sy1 - sy0) / Math.max(1, sx1 - sx0);
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
    /* V11, the Today walk (6.4): in Now, tryW weighs what a try shows by how much each thing matters (the notepad more
       than the plant and the mug together, light and time more than drinks and paper) */
    const nowRank = FEEL && alone && !phoneDay;
    let tryW = 0;
    const worth = () => { const sn = seenProps(tmpCam, W, H); return propList.reduce((a, p, i) => a + (sn[i] ? Math.pow(4, p.keep || 0) : 0), 0); };
    const tryMode = (mode, f, plan, keep, at) => { propMode = mode; backAt = plan || null; sideKept = keep ? new Set(keep) : null; sideAt = at || null; placeProps(); aimProps(); place(f); tryW = nowRank ? worth() : 0; return shown(); };
    /* V11: with a stack laid out on the bench, the things on the desk step out (benchAway), so the camera
       doesn't pull back or lift the board to make room for a back row of them: that left bare desk above
       the week and the bench, and the mat cut off below */
    const mt = layout === 'week' && propList.length && !(FEEL && benchWanted()) ? matTarget() : null;
    /* a phone's day has no room beside the mat; things there stand only along its back edge, or not at all */
    let best = { mode: 'side', f: pick, plan: null, keep: null, at: null, n: phoneDay ? -1 : tryMode('side', pick) };
    propCost = null;
    if (mt && best.n < propList.length) {
      /* while a panel is open, only what's on the desk now can stay */
      const ok = (p) => !insets.hold || p.to > 0;
      const withRiders = (p) => [p].concat((p.riders || []).filter(ok));
      /* beside the mat, things join one at a time too, the one that matters most first; the ones that
         stay hug the mat, so one blocked thing never takes its whole side with it */
      const sideFeet = (list, at) => {
        const sh = sideShift(mt, new Set(list), at);
        return list.map((p) => { const b = footAt(p, at), dx = p.side === 'L' ? sh.L : sh.R; return { x0: b.x0 + dx - 0.15, x1: b.x1 + dx + 0.15, z0: b.z0, z1: b.z1, y1: tallOf(p) }; });
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
      if (!phoneDay && sideSet.length && side.d <= pick.d * limit) tries.push({ mode: 'side', f: side, plan: null, keep: sideSet, at: null, n: tryMode('side', side, null, sideSet) });
      if (back && back.d <= pick.d * limit) tries.push({ mode: 'back', f: back, plan, keep: null, at: null, n: tryMode('back', back, plan) });
      /* more things for the least pull back */
      for (const t of tries) if (t.n > best.n || (t.n === best.n && t.f.d < best.f.d && best.mode !== 'side')) best = t;
      /* V11, the Today walk (6.4): in Now the notepad never steps out for things that matter less. When it would, it
         stands at its own place, or at the place of the nearest thing on its side that's on the desk and matters less,
         which steps out for it (its pencil too when there's no room for it); wherever costs the board least, up to the
         same pull back as ever, and only when what the desk then shows matters more */
      const top = firsts[0];
      if (nowRank && best.mode === 'side' && top && top.keep >= 3) {
        tryMode('side', best.f, null, best.keep, best.at);
        const at = new Map(propList.map((p, i) => [p, i])), on = seenProps(tmpCam, W, H), w0 = tryW;
        if (!on[at.get(top)]) {
          const far = (q) => Math.hypot(q.rest.x - top.rest.x, q.rest.z - top.rest.z);
          const spots = [null].concat(propList.filter((q, i) => on[i] && q.side === top.side && !q.rides && q !== top && (q.keep || 0) < top.keep).sort((a, b) => far(a) - far(b)));
          let pickT = null;
          for (let k = 1; k <= limit * pick.d / best.f.d + 1e-6 && !pickT; k += 0.01) {
            const f = Object.assign({}, best.f, { d: best.f.d * k });
            for (const q of spots) {
              const map = new Map();
              if (q) { const d = { dx: q.rest.x - top.rest.x, dz: q.rest.z - top.rest.z }; [top].concat(top.riders || []).forEach((e) => map.set(e, d)); }
              for (const ents of (top.riders || []).length ? [withRiders(top), [top]] : [[top]]) {
                const keep = (best.keep || propList).filter((o) => o !== q && o !== top && !(top.riders || []).includes(o)).concat(ents);
                const n = tryMode('side', f, null, keep, map);
                if (seenProps(tmpCam, W, H)[at.get(top)] && tryW > w0) { pickT = { mode: 'side', f, plan: null, keep, at: map, n }; break; }
              }
              if (pickT) break;
            }
          }
          if (pickT) best = pickT;
        }
      }
      propCost.shown = [best.n].concat(tries.map((t) => t.mode + ':' + t.n));
    }
    propMode = best.mode; backAt = best.plan; pick = best.f; sideKept = best.keep ? new Set(best.keep) : null; sideAt = best.at || null;
    placeProps();
    aimProps();
    camTo.look.copy(pick.look); camTo.elev = pick.box.elev; camTo.dist = pick.d * 1.02; camTo.offX = offX; camTo.offY = offY;
    tmpCam.position.copy(pick.look).addScaledVector(pick.dir, camTo.dist); tmpCam.lookAt(pick.look); tmpCam.updateMatrixWorld();
    /* V11: how big the day board prints on the screen, across and down, for its smallest words (printWatch) */
    if (FEEL && layout === 'week' && zoomName === 'day') {
      const c = placeBox(DAY_BOX, TF.day), mx = (c.x0 + c.x1) / 2, mz = (c.z0 + c.z1) / 2;
      const at = (x, z) => world.localToWorld(new T.Vector3(x, BOARD_Y, z)).project(tmpCam);
      const a = at(mx - 0.5, mz), b = at(mx + 0.5, mz), c0 = at(mx, mz - 0.5), c1 = at(mx, mz + 0.5);
      dayScale = Math.min(Math.abs(b.x - a.x) / 2 * W, Math.abs(c1.y - c0.y) / 2 * H);
    }
    /* (the Planner walk, 7.1: and the week's, the same way, for weekPrintU) */
    if (FEEL && layout === 'week' && zoomName === 'week') {
      const c = placeBox(WEEK_BOX, TF.week), mx = (c.x0 + c.x1) / 2, mz = (c.z0 + c.z1) / 2;
      const at = (x, z) => world.localToWorld(new T.Vector3(x, BOARD_Y, z)).project(tmpCam);
      const a = at(mx - 0.5, mz), b = at(mx + 0.5, mz), c0 = at(mx, mz - 0.5), c1 = at(mx, mz + 0.5);
      weekScale = Math.min(Math.abs(b.x - a.x) / 2 * W, Math.abs(c1.y - c0.y) / 2 * H);
    }
    /* (5.4: and the year's, at its far row of cards, for yearNeed) */
    if (FEEL && layout === 'year') {
      const z = ycardPos(0).z, at = (x, zz) => world.localToWorld(new T.Vector3(x, BOARD_Y + 0.2, zz)).project(tmpCam);
      const a = at(-0.5, z), b = at(0.5, z), c0 = at(0, z - 0.5), c1 = at(0, z + 0.5);
      yearScale = Math.min(Math.abs(b.x - a.x) / 2 * W, Math.abs(c1.y - c0.y) / 2 * H);
    }
    /* V11: with a stack framed close on the bench, the things on the desk step out */
    benchAway = FEEL && !!benchClose(W, H, sx0, sx1, sy0, sy1);
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
    const sig = [layout, zoomName, benchOn, alone, phoneDay, tight, RAIL0, RAIL1, bench.depth, bench.width, bench.arrange, month.rows, insets.top, insets.bottom, insets.left, insets.right, insets.hold, dayOnly, JSON.stringify(insets.blockers || []), el.clientWidth, el.clientHeight, FEEL && benchWanted(), FEEL && kinds.on && kinds.box ? JSON.stringify(kinds.box) : '', laneShape, tallMin].join('|');
    if (sig === camSig) return;
    camSig = sig;
    solveCamera();
  }
  function setZoom(name, row) {
    if (name !== zoomName) resetView();
    /* (the Planner walk, 7.1: the week's bricks were dressed while the day was in view, so the week prints again at its
       12 px once it's framed) */
    if (FEEL && name === 'week' && zoomName !== 'week') weekPrintU = 0;
    zoomName = name;
    if (row != null) focusRow = row;
    applyMode();
    maybeSolve();
  }
  function setBenchOpen(on) { benchOn = !!on; applyMode(); maybeSolve(); }
  /* V11, lift and place: the room around the board can be held while a copy flies from a panel to its slot,
     so the board doesn't reframe under it (a panel closing gives the desk more room); let go, the last room
     asked for is used */
  let insetsHeld = false, insetsPending = null, insetsHeldAt = 0;
  function holdInsets(on) {
    if (!FEEL) return;
    insetsHeld = !!on; insetsHeldAt = on ? nowMs() : 0;
    if (!on && insetsPending) { const v = insetsPending; insetsPending = null; setInsets(v); }
  }
  function setInsets(v) {
    /* (held, it waits; never longer than a second and a half) */
    if (FEEL && insetsHeld && nowMs() - insetsHeldAt < 1500) { insetsPending = Object.assign({}, insetsPending || {}, v); return; }
    if (FEEL && insetsHeld) { insetsHeld = false; if (insetsPending) { v = Object.assign({}, insetsPending, v); insetsPending = null; } }
    insets = Object.assign({}, insets, v);
    /* V11: the kinds of day are laid out by the room the camera has, so a new room lays them out again */
    if (FEEL && kinds.on && kinds.lastSp) setKinds(kinds.lastSp);
    maybeSolve();
  }
  function snapCamera() { cam.look.copy(camTo.look); cam.elev = camTo.elev; cam.dist = camTo.dist; cam.offX = camTo.offX; cam.offY = camTo.offY; camV.look.set(0, 0, 0); camV.elev = camV.dist = camV.offX = camV.offY = 0; }
  /* The desk was hidden and shows again: measure, frame, and let every rise finish at once, so the
     board is there the moment you look. */
  function wake() { fit(); snapCamera(); settleTiles(); for (let k = 0; k < 40 && pops.length; k++) stepPops(0.1); }
  /* true when the board is framed: the camera found a distance that shows it inside the panels */
  const framed = () => camTo.dist < 290 && cam.dist < 290 && isFinite(cam.dist) && (!FEEL || (isFinite(cam.look.x) && isFinite(cam.look.y) && isFinite(cam.look.z)));
  /* the desk leans a little toward a mouse; never on a phone's day, where a lean left behind by the
     last tap turns the board crooked */
  function parallax(nx, ny) { if (quality === 'low' || reduced || phoneDay) { parTarget.set(0, 0, 0); return; } parTarget.set(nx * 0.35, -ny * 0.2, 0); }
  /* The player's own zoom and pan on top of the framed view, and a small lean toward
     whatever is being dragged so placing a block feels precise. */
  const user = { zoom: 1, zoomTo: 1, pan: new T.Vector3(), panTo: new T.Vector3(), lean: 0, leanTo: 0, leanAt: new T.Vector3(), away: 0, awayTo: 0, panVel: new T.Vector3() };
  /* feel: while a finger or the mouse holds the desk (a pinch, a pan) it moves with you exactly; let go
     of a pan and it keeps its speed for a moment, then slows to a stop */
  let directOn = false;
  const panSamples = [];
  function direct(on) {
    on = !!on;
    if (on === directOn) return;
    directOn = on;
    if (on) { user.panVel.set(0, 0, 0); panSamples.length = 0; return; }
    const n = panSamples.length;
    if (FEEL && !reduced && n >= 2) {
      const a = panSamples[0], b = panSamples[n - 1], span = (b.t - a.t) / 1000;
      if (span > 0.016 && nowMs() - b.t < 90) user.panVel.set((b.x - a.x) / span, 0, (b.z - a.z) / span).clampLength(0, 30);
    }
    panSamples.length = 0;
  }
  /* slide the camera sideways by a share of the screen's width (1 is a whole screen to the right) */
  function setAway(f) { user.awayTo = +f || 0; }
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
    if (FEEL) { const t = nowMs(); panSamples.push({ t, x: user.panTo.x, z: user.panTo.z }); while (panSamples.length > 2 && t - panSamples[0].t > 100) panSamples.shift(); }
  }
  function resetView() { focus.pt = null; user.zoomTo = 1; user.panTo.set(0, 0, 0); user.panVel.set(0, 0, 0); }
  /* lean in toward a point on the desk (null to settle back); k is how strongly */
  function lean(p, k) {
    /* (V11: a point that isn't a number is no point to lean toward: the camera settles instead) */
    if (!p || (FEEL && (!Number.isFinite(p.x) || !Number.isFinite(p.z)))) {
      /* V11, lift and place: letting go keeps the lean a moment, and a block falling from the hand into its
         slot holds it until 250 ms after it lands (stepFalls), so the landing never plays on a board that's
         shrinking away */
      if (FEEL && !p && user.leaning && drag.hand && drag.hand.use) { if (!user.leanOffAt) user.leanOffAt = Date.now() + 60; if (!drag.hand.on) drag.hand.aimOn = false; return; }
      user.leanTo = 0; user.leaning = false; user.leanOffAt = 0; return;
    }
    /* feel: with calmer motion the camera doesn't lean at all, rather than jump */
    if (FEEL && reduced) { user.leanTo = 0; return; }
    /* V11: a piece carried off the bench keeps the week and the bench side by side, so no lean in */
    if (FEEL && benchCam.carry) { user.leanTo = 0; return; }
    user.leanAt.set(p.x, 0, p.z);
    user.leanTo = k == null ? 1 : k;
    user.leaning = true; user.leanOffAt = 0;
  }
  /* feel: how far in the lean goes while it lasts (1 all the way, 0 none); near the screen's edge the app
     eases it back, so a day at the far side of the week is never out of reach */
  function leanAmount(k) { if (!FEEL || !user.leaning || reduced) return; user.leanTo = Math.max(0, Math.min(1, k)); }
  /* feel: the lean zooms in around the point you're working on, so that point stays where it is on screen
     while the rest of the desk grows (the least sweep of motion, the least to feel queasy at). V11, lift and
     place: 12 percent, around the aim point's ray (leanStep) */
  const LEAN_Z = FEEL ? 0.12 : 0.1;
  /* V11, lift and place: the lean is a zoom about the aim point's ray, worked out a step at a time: each frame
     it scales the view about the point where that ray meets the camera's look plane (as the camera was last
     drawn), so every point on the ray, the floor point under a still hand included, stays where it is on
     screen. A center that moves with the hand never makes the view jump, since each step is only the change.
     Easing out, it scales about one fixed center back to nothing (no pan left over). Returns the zoom. */
  const leanE = new T.Vector3(), leanP = new T.Vector3();
  function leanStep(look) {
    if (!user.leanL) { user.leanL = new T.Vector3(); user.leanZ = 1; user.leanF = null; }
    const Z = 1 + LEAN_Z * Math.max(0, user.lean), Zp = user.leanZ || 1;
    if (Z <= 1.00001 && Zp <= 1.00001) { user.leanL.set(0, 0, 0); user.leanZ = 1; user.leanF = null; return 1; }
    if (!user.leaning) {
      if (!user.leanF) user.leanF = Zp - 1 > 1e-4 ? look.clone().addScaledVector(user.leanL, Zp / (Zp - 1)) : look.clone();
      if (Z > 1.00001) user.leanL.copy(user.leanF).sub(look).multiplyScalar(1 - 1 / Z); else { user.leanL.set(0, 0, 0); user.leanF = null; }
    } else {
      user.leanF = null;
      const r = Z / Zp;
      if (Math.abs(r - 1) > 1e-9) {
        let P = null;
        if (hand.aimOn) P = rayAt(hand.aim.x, hand.aim.y, look.y, leanP);
        if (!P) P = leanP.set(user.leanAt.x, look.y, user.leanAt.z);
        leanE.copy(look).add(user.leanL).sub(P).multiplyScalar(1 / r).add(P);
        user.leanL.copy(leanE).sub(look);
      }
    }
    if (!finite3(user.leanL)) { user.leanL.set(0, 0, 0); user.leanF = null; }
    user.leanZ = Z;
    return Z;
  }
  /* feel: the camera rides springs too: it eases off, eases in, and a new aim mid move keeps its speed */
  const camV = { look: new T.Vector3(), elev: 0, dist: 0, offX: 0, offY: 0, zoom: 0, pan: new T.Vector3(), lean: 0, away: 0 };
  function feelCamera(dt) {
    if (reduced) {
      cam.look.copy(camTo.look); cam.elev = camTo.elev; cam.dist = camTo.dist; cam.offX = camTo.offX; cam.offY = camTo.offY;
      user.zoom = user.zoomTo; user.pan.copy(user.panTo); user.lean = user.leanTo; user.away = user.awayTo; user.panVel.set(0, 0, 0);
      return;
    }
    const one = (key, to, w, box) => { const r = spring(box[key], camV[key], to, w, dt); box[key] = r[0]; camV[key] = r[1]; };
    springV(cam.look, camV.look, camTo.look, 10, dt);
    one('elev', camTo.elev, 10, cam); one('dist', camTo.dist, 10, cam); one('offX', camTo.offX, 10, cam); one('offY', camTo.offY, 10, cam);
    if (directOn) { user.zoom = user.zoomTo; user.pan.copy(user.panTo); camV.zoom = 0; camV.pan.set(0, 0, 0); }
    else {
      if (user.panVel.lengthSq() > 0.0004) {
        user.panTo.addScaledVector(user.panVel, dt);
        const was = user.panTo.clone();
        clampPan();
        if (was.x !== user.panTo.x) user.panVel.x = 0;
        if (was.z !== user.panTo.z) user.panVel.z = 0;
        user.panVel.multiplyScalar(Math.exp(-dt * 4.2));
        moving = true;
      } else user.panVel.set(0, 0, 0);
      one('zoom', user.zoomTo, 15, user);
      springV(user.pan, camV.pan, user.panTo, 15, dt);
    }
    /* V11, lift and place: the lean comes in on (0.35 s, 1.0) and goes out on (0.5 s, 1.0), a moment after
       letting go (lean(null)), or 250 ms after a block from the hand lands; none on the phone's desk */
    if (user.leanOffAt && Date.now() >= user.leanOffAt) { user.leanTo = 0; user.leaning = false; user.leanOffAt = 0; }
    if (phoneDay) user.leanTo = 0;
    if (user.leanOffAt) moving = true;
    one('lean', user.leanTo, user.leanTo > user.lean ? (2 * Math.PI) / 0.35 : (2 * Math.PI) / 0.5, user);
    one('away', user.awayTo, 8, user);
    const busy = cam.look.distanceToSquared(camTo.look) > 1e-6 || camV.look.lengthSq() > 1e-5 || Math.abs(camTo.dist - cam.dist) > 0.002 || Math.abs(camV.dist) > 0.01
      || Math.abs(camTo.elev - cam.elev) > 1e-4 || Math.abs(camV.elev) > 1e-3 || Math.abs(camTo.offX - cam.offX) + Math.abs(camTo.offY - cam.offY) > 0.05 || Math.abs(camV.offX) + Math.abs(camV.offY) > 0.5
      || Math.abs(user.zoomTo - user.zoom) > 0.001 || Math.abs(camV.zoom) > 0.005 || user.pan.distanceToSquared(user.panTo) > 1e-6 || camV.pan.lengthSq() > 1e-5
      || Math.abs(user.leanTo - user.lean) > 0.002 || Math.abs(camV.lean) > 0.01 || Math.abs(user.awayTo - user.away) > 0.0005 || Math.abs(camV.away) > 0.003;
    if (busy) moving = true;
    else { user.away = user.awayTo; camV.away = 0; }
  }
  function stepCamera(dt) {
    if (FEEL) { feelCamera(dt); stepBenchCam(dt); printWatch(); }
    const k = reduced ? 1 : 1 - Math.exp(-dt * 6.5);
    if (cam.look.distanceToSquared(camTo.look) > 1e-6 || Math.abs(camTo.dist - cam.dist) > 0.002 || Math.abs(camTo.elev - cam.elev) > 1e-4 || Math.abs(camTo.offX - cam.offX) + Math.abs(camTo.offY - cam.offY) > 0.05
      || Math.abs(user.zoomTo - user.zoom) > 0.001 || user.pan.distanceToSquared(user.panTo) > 1e-6 || Math.abs(user.leanTo - user.lean) > 0.002 || Math.abs(user.awayTo - user.away) > 0.0005 || par.distanceToSquared(parTarget) > 1e-6) moving = true;
    if (!FEEL) {
      cam.look.lerp(camTo.look, k);
      cam.elev += (camTo.elev - cam.elev) * k;
      cam.dist += (camTo.dist - cam.dist) * k;
      cam.offX += (camTo.offX - cam.offX) * k;
      cam.offY += (camTo.offY - cam.offY) * k;
      const ku = reduced ? 1 : 1 - Math.exp(-dt * 9), kl = reduced ? 1 : 1 - Math.exp(-dt * 4);
      user.zoom += (user.zoomTo - user.zoom) * ku;
      user.pan.lerp(user.panTo, ku);
      user.lean += (user.leanTo - user.lean) * kl;
      user.away += (user.awayTo - user.away) * (reduced ? 1 : 1 - Math.exp(-dt * 3.2));
      if (Math.abs(user.awayTo - user.away) < 0.0005) user.away = user.awayTo;
    }
    par.lerp(parTarget, 1 - Math.exp(-dt * 2.5));
    const el = renderer.domElement.parentElement;
    const W = el.clientWidth || root.innerWidth, H = el.clientHeight || root.innerHeight;
    camera.setViewOffset(W, H, cam.offX, cam.offY, W, H);
    camera.updateProjectionMatrix();
    const look = cam.look.clone().add(user.pan);
    if (user.away) look.x += user.away * 2 * (cam.dist / user.zoom) * Math.tan((camera.fov * Math.PI / 180) / 2) * (W / H);
    /* V11: the bench's close framing, a scale around a point on the desk (benchCam) */
    let bz = 1;
    if (FEEL && (benchCam.z > 1.0005 || benchCam.pan.lengthSq() > 1e-8)) {
      bz = benchCam.z;
      look.add(benchCam.pan).lerp(new T.Vector3(benchCam.at.x, look.y, benchCam.at.z), 1 - 1 / bz);
    }
    let leanZ = 1 + LEAN_Z * user.lean;
    if (FEEL) { leanZ = leanStep(look); look.add(user.leanL); }
    else if (user.lean > 0.001) look.lerp(new T.Vector3(user.leanAt.x, look.y, user.leanAt.z), 0.14 * user.lean);
    const dist = cam.dist / (user.zoom * bz * leanZ);
    const dir = new T.Vector3(0, Math.sin(cam.elev), Math.cos(cam.elev));
    camera.position.copy(look).addScaledVector(dir, dist).add(par.clone().multiplyScalar(dist / 40));
    camera.lookAt(look);
    if (FEEL && benchCam.keep) { if (hand.on) benchCam.keep = null; else keepBenchHand(); }
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

  /* == every number a block moves by stays a number ==
     V11: a number that isn't one (NaN, Infinity) in a block's place, size, or turn draws it nowhere, and a
     block that isn't drawn is a block that vanished (the demo at the Apple Store: a dip left unset, and a
     dropped block never showed). Each frame step() looks at every block on the desk (watchBlocks): one with
     such a number goes back to rest in its slot, at its own size, level and still, and the desk says so,
     once for each block and what it was (World.debug.repairs, and the console, where the drag gate sees
     it). The block in hand and the camera's aim get the same. */
  const finite3 = (v) => !!v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
  const repairs = { count: 0, list: [], said: new Set() };
  function noteRepair(what, key) {
    repairs.count++;
    if (repairs.list.length < 40) repairs.list.push({ what, key: key || null, at: Date.now() });
    const k = what + '|' + (key || '');
    if (repairs.said.has(k)) return;
    repairs.said.add(k);
    try { console.error('Sunday Reset: ' + what + (key ? ' (' + key + ')' : '') + ' had a number that is not a number, and was put back at rest'); } catch (e) { /* fine */ }
  }
  /* everything a block moves by is a number (a field it doesn't have yet is fine) */
  const num = (v) => v == null || Number.isFinite(v);
  function blockFinite(m) {
    const u = m.userData;
    return finite3(m.position) && finite3(m.scale) && finite3(m.rotation) && (!u.vel || finite3(u.vel))
      && num(u.lift) && num(u.pressK) && num(u.gripK) && num(u.haloK);
  }
  /* back to rest: in its slot, at its own size, level, still, with nothing moving it */
  function restBlock(m) {
    const u = m.userData;
    if (!finite3(u.target)) u.target.set(0, 0, 0);
    m.position.copy(u.target); m.scale.set(1, 1, 1); m.rotation.set(0, 0, 0);
    if (u.vel) u.vel.set(0, 0, 0); else u.vel = new T.Vector3();
    u.lift = 0; u.pressK = 0; u.gripK = 0; u.haloK = 0; u.squash = 0;
    u.fall = null; u.sq = null; u.rock = null; u.knock = null; u.grow = null; u.appear = null;
    if (u.wave) { u.wave = null; tileMotions.delete(m); }
  }
  /* each frame: every block on the desk, the one in hand, the ones flying home, and the camera's aim */
  function watchBlocks() {
    const look = (m) => { if (!blockFinite(m)) { restBlock(m); noteRepair('a block', m.userData.key || m.userData.bkey); } };
    week.blocks.forEach(look); dayb.blocks.forEach(look); bench.pieces.forEach(look);
    const o = drag.obj;
    if (o) {
      if (!finite3(drag.target)) { drag.target.copy(finite3(o.position) ? o.position : new T.Vector3(0, BOARD_Y + 1.1, 0)); noteRepair('the aim of the block in hand'); }
      if (!finite3(drag.vel)) { drag.vel.set(0, 0, 0); noteRepair('the speed of the block in hand'); }
      if (!Number.isFinite(drag.roll.x) || !Number.isFinite(drag.roll.v)) drag.roll = { x: 0, v: 0 };
      if (!Number.isFinite(drag.pitch.x) || !Number.isFinite(drag.pitch.v)) drag.pitch = { x: 0, v: 0 };
      /* (V11, lift and place: a block hanging in the hand heals in the hand: its springs back to rest, level) */
      const H = drag.hand, rigged = !!(H && H.on && o.parent === H.hang);
      if (rigged && (!finite3(o.position) || !finite3(o.scale) || !finite3(o.rotation) || !finite3(H.rig.position) || !finite3(H.hang.rotation))) { handHeal(); noteRepair('the block in hand'); }
      else if (!rigged && (!finite3(o.position) || !finite3(o.scale) || !finite3(o.rotation))) { o.position.copy(drag.target); o.scale.set(1, 1, 1); o.rotation.set(-0.06, 0, 0); o.userData.appear = null; noteRepair('the block in hand'); }
    }
    if (typeof falls !== 'undefined') falls.forEach((f) => { if (!finite3(f.o.position) || !finite3(f.o.scale) || !finite3(f.fromPos) || !finite3(f.toPos) || !Number.isFinite(f.dur) || !Number.isFinite(f.y0)) { f.fromPos.copy(finite3(f.toPos) ? f.toPos : f.o.position.set(0, 0, 0)); f.y0 = 0; f.dur = 0.09; f.t = f.dur; noteRepair('a block falling from the hand'); } });
    if (drag.last && (!finite3(drag.last.pos) || !finite3(drag.last.vel))) drag.last = null;
    homes.forEach((h) => { if (!finite3(h.from) || !finite3(h.to) || !finite3(h.m.position)) { if (finite3(h.to)) h.from.copy(h.to); else { h.from.set(0, 0, 0); h.to.set(0, 0, 0); } h.t = h.dur; noteRepair('a block on its way home'); } });
    if (!finite3(user.leanAt) || !Number.isFinite(user.lean) || !Number.isFinite(user.leanTo)) { user.leanAt.set(0, 0, 0); user.lean = 0; user.leanTo = 0; camV.lean = 0; user.leaning = false; noteRepair('the lean'); }
    if (!finite3(user.pan) || !finite3(user.panTo) || !finite3(user.panVel)) { user.pan.set(0, 0, 0); user.panTo.set(0, 0, 0); user.panVel.set(0, 0, 0); camV.pan.set(0, 0, 0); noteRepair('the pan'); }
    if (!Number.isFinite(user.zoom) || !Number.isFinite(user.zoomTo)) { user.zoom = 1; user.zoomTo = 1; camV.zoom = 0; noteRepair('the zoom'); }
    if (!finite3(cam.look) || !Number.isFinite(cam.dist) || !Number.isFinite(cam.elev) || !finite3(camV.look)) {
      if (finite3(camTo.look) && Number.isFinite(camTo.dist) && Number.isFinite(camTo.elev)) snapCamera();
      else { cam.look.set(0, 0, 0); camV.look.set(0, 0, 0); }
      noteRepair('the camera');
    }
  }
  /* (V11-2: the boards the blocks sit on get the same. A board rising or sinking with a number that isn't one
     draws nothing, and every block on it goes with it though each block's own numbers are fine: the board
     finishes its pop where it was going, now, and the desk says so) */
  function watchBoards() {
    pops.forEach((o) => {
      const u = o.userData, p = u.pop;
      if (!p || (Number.isFinite(p.from) && Number.isFinite(p.t) && Number.isFinite(p.delay) && finite3(o.position) && finite3(o.scale))) return;
      o.visible = p.show; o.position.y = u.baseY || 0; o.scale.copy(u.baseScale || ONE);
      u.pop = null; u.popK = p.show ? 1 : 0;
      if (p.show && !p.ticked && p.onTick) p.onTick();
      noteRepair('a board', o === week.group ? 'week' : o === dayb.group ? 'day' : o === bench.group ? 'bench' : u.kind || o.name || '');
    });
  }

  /* == feel: how a block moves ==
     One place for all of it: its lift (pointed at, picked), a dip while it's pressed, a fall and a landing
     when it's set down, and a small knock when another lands beside it. Everything rides on springs. */
  let pressObj = null, pressHold = false;
  /* the block under a finger or the mouse button dips, so it's plainly in hand before it moves. hold (V11, lift
     and place): a finger held still on it, which lifts it at 300 ms: from 120 ms it rises a little and grows,
     so the hold shows it's working (with calmer motion its picked glow fades in instead) */
  function press(obj, hold) {
    if (obj !== pressObj && obj) obj.userData.holdT = 0;
    pressObj = FEEL && obj ? obj : null;
    pressHold = !!(pressObj && hold);
  }
  /* V11, lift and place: the numbers a landing moves by (docs/LIFT-AND-PLACE.md 3.12 to 3.16): the squash, a
     damped sine with one small rebound that bulges the footprint (what reads from above); the ring of dust;
     the neighbours' hop and sideways nudge; the rock; the calmer highlight */
  const LAND = { sqW: 35, sqTau: 0.06, sqDur: 0.26, bulge: 0.5, peaks: [[0.5, 0.08], [1, 0.1], [2, 0.11]], ring: 0.28, ringOp: 0.42,
    hop: { week: 0.032, day: 0.05 }, nudge: { week: 0.045, day: 0.07 }, rockW: 26, rockZeta: 0.3, rockMax: 2.5, rockSpeed: 0.72, rockSwing: 2, flash: 0.24 };
  /* the board a block is on is the one in view (the day in the day view, the week otherwise) */
  const inView = (m) => (zoomName === 'day' && layout === 'week' ? m.userData.kind === 'dblock' : m.userData.kind === 'block');
  /* how deep a landing squashes, by its length (hours) and how fast it came down (units a second) */
  function squashFor(size, speed) {
    const P = LAND.peaks, h = Number.isFinite(size) && size > 0 ? size : 1;
    let peak = P[P.length - 1][1];
    if (h <= P[0][0]) peak = P[0][1];
    else for (let i = 1; i < P.length; i++) if (h <= P[i][0]) { const k = (h - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); peak = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k; break; }
    const sp = Number.isFinite(speed) ? speed : 30;
    return (peak / 0.53) * Math.max(0.6, Math.min(1, sp / 30));
  }
  function feelBlock(m, dt, liftTo, showGrip, sel) {
    const u = m.userData;
    /* V11: a block set down before its first frame (adoptPosition and land give it a speed first) still
       starts with no dip, grip, or glow; left unset they were NaN, and the block vanished where it landed */
    if (!u.vel) u.vel = new T.Vector3();
    else if (!finite3(u.vel)) u.vel.set(0, 0, 0);
    if (!Number.isFinite(u.pressK)) u.pressK = 0;
    if (!Number.isFinite(u.gripK)) u.gripK = 0;
    if (!Number.isFinite(u.haloK)) u.haloK = 0;
    if (!Number.isFinite(u.pressV)) u.pressV = 0;
    if (!Number.isFinite(u.holdT)) u.holdT = 0;
    /* a block placed from a panel waits, unseen, for the copy flying to it (land() lets it go) */
    if (u.held) {
      u.heldT = (u.heldT || 0) + dt;
      if (u.heldT < 1.4) { m.visible = false; return; }
      u.held = false; u.handFall = null; m.visible = true;
    }
    if (u.grow != null) {
      u.grow = Math.min(1, u.grow + dt * (reduced ? 20 : u.growFast ? 7 : 3.4));
      m.scale.y = u.grow <= 0 ? 0.001 : Math.max(0.001, easeOutSoft(Math.max(0, u.grow)));
      if (u.grow >= 1) { u.grow = null; u.growFast = false; u.newTile = false; m.scale.y = 1; }
      moving = true;
    }
    /* V11, lift and place: a finger held still on a block: from 120 ms it rises 0.12 and grows 3 percent by
       300 ms, when it lifts (with calmer motion, its glow fades in from 120 ms instead) */
    const holding = pressObj === m && pressHold;
    if (holding) { u.holdT += dt; moving = true; } else u.holdT = 0;
    const hk = holding ? Math.max(0, Math.min(1, (u.holdT - 0.12) / 0.18)) : 0, holdK = reduced ? 0 : hk * hk * (3 - 2 * hk);
    /* the drag dots fade in, and the picked glow spreads out from under the block */
    const gTo = showGrip ? 1 : 0, hTo = sel || (reduced && holding && u.holdT >= 0.12) ? 1 : 0, pTo = pressObj === m && !reduced ? 1 : 0;
    if (u.gripK !== gTo) { u.gripK = reduced ? gTo : u.gripK + (gTo - u.gripK) * (1 - Math.exp(-dt * 18)); if (Math.abs(gTo - u.gripK) < 0.01) u.gripK = gTo; moving = true; }
    u.grip.visible = u.gripK > 0.01;
    if (u.grip.visible) u.grip.material.opacity = u.gripK;
    if (u.haloK !== hTo) { u.haloK = reduced && !holding ? hTo : u.haloK + (hTo - u.haloK) * (1 - Math.exp(-dt * (hTo ? 14 : 24))); if (Math.abs(hTo - u.haloK) < 0.01) u.haloK = hTo; moving = true; }
    /* (calmer motion's landing: a highlight that fades in and out on the slot, 240 ms) */
    let flash = 0;
    if (u.flashT != null) { u.flashT += dt; const k = u.flashT / LAND.flash; moving = true; if (k >= 1) u.flashT = null; else flash = Math.sin(Math.PI * k); }
    u.halo.visible = u.haloK > 0.01 || flash > 0.01;
    if (u.halo.visible && u.haloS) { const s = 0.5 + 0.5 * Math.max(u.haloK, flash); u.halo.scale.set(u.haloS.x * s, 1, u.haloS.z * s); }
    /* the press: in on (0.07 s, 1.0), out on (0.12 s, 1.0); calmer motion has none */
    if (u.pressK !== pTo || Math.abs(u.pressV) > 0.01) {
      if (FEEL && !reduced) { const r = spring(u.pressK, u.pressV, pTo, (2 * Math.PI) / (pTo ? 0.07 : 0.12), dt); u.pressK = r[0]; u.pressV = r[1]; if (Math.abs(pTo - u.pressK) < 0.004 && Math.abs(u.pressV) < 0.02) { u.pressK = pTo; u.pressV = 0; } }
      else { u.pressK = reduced ? pTo : u.pressK + (pTo - u.pressK) * (1 - Math.exp(-dt * (pTo ? 45 : 20))); if (Math.abs(pTo - u.pressK) < 0.01) u.pressK = pTo; u.pressV = 0; }
      moving = true;
    }
    /* the knock from a block landing beside it: a small hop and a nudge away from it, nearest first */
    let hop = 0, kx = 0;
    if (u.knock) {
      const kn = u.knock, k = ((kn.t += dt) - kn.delay) / 0.15;
      moving = true;
      if (k >= 1) u.knock = null; else if (k > 0) { hop = kn.amp * Math.sin(Math.PI * k); kx = (kn.dx || 0) * Math.sin(Math.PI * k); }
    }
    const dip = FEEL ? u.pressK * (u.kind === 'dblock' ? 0.05 : 0.04) : u.pressK * 0.025;
    tmpV.set(u.target.x + kx, u.target.y + liftTo + hop - dip + 0.12 * holdK, u.target.z);
    if (u.fall) {
      /* set down: it slides the last bit into its slot as it falls, speeding up, and touches */
      const f = u.fall;
      f.t += dt; moving = true;
      if (f.hide) m.visible = f.t >= f.delay;
      if (f.x0 == null) { f.x0 = m.position.x; f.z0 = m.position.z; }
      /* it reaches its slot the moment it touches: sideways it eases in, downward it speeds up */
      const k = Math.min(1, Math.max(0, f.t - f.delay) / f.dur), side = 1 - (1 - k) * (1 - k);
      m.position.x = f.x0 + (tmpV.x - f.x0) * side;
      m.position.z = f.z0 + (tmpV.z - f.z0) * side;
      u.vel.set(0, 0, 0);
      if (k < 1) m.position.y = tmpV.y + f.y0 * (1 - k * k);
      else { m.position.y = tmpV.y; u.fall = null; f.vx = (tmpV.x - f.x0) / f.dur; f.speed = 2 * f.y0 / f.dur; touchDown(m, f); }
    } else if (reduced) { m.position.copy(tmpV); u.vel.set(0, 0, 0); }
    else {
      springV(m.position, u.vel, tmpV, 18, dt);
      if (m.position.distanceToSquared(tmpV) > 1e-6 || u.vel.lengthSq() > 1e-4) moving = true;
      else { m.position.copy(tmpV); u.vel.set(0, 0, 0); }
    }
    u.lift = Math.max(0, m.position.y - u.target.y);
    /* the landing: V11, lift and place, a damped sine (it peaks about 32 ms in, rebounds once at 120, and is
       still by 260): height 1 - A e(t), footprint 1 + 0.5 A e(t); before, a squash over in a sixth of a second */
    let sy = 1, sxz = 1;
    if (u.sq) {
      const q = u.sq;
      moving = true;
      if (q.hand) {
        const t = (q.t += dt);
        if (t >= LAND.sqDur) u.sq = null;
        else if (t > 0) { const e = Math.sin(LAND.sqW * t) * Math.exp(-t / LAND.sqTau); sy = 1 - q.amp * e; sxz = 1 + LAND.bulge * q.amp * e; }
      } else {
        const k = (q.t += dt) / (q.dur || 0.16);
        if (k >= 1) u.sq = null;
        else if (k > 0) { const g = Math.sin(Math.PI * k) * (1 - k); sy = 1 - q.amp * g; sxz = 1 + q.amp * 0.22 * g; }
      }
    }
    if (u.rock) {
      sway(u.rock, 0, LAND.rockW, LAND.rockZeta, dt);
      moving = true;
      if (Math.abs(u.rock.x) < 0.0008 && Math.abs(u.rock.v) < 0.01) { u.rock = null; m.rotation.z = 0; } else m.rotation.z = Math.max(-LAND.rockMax, Math.min(LAND.rockMax, u.rock.x * 180 / Math.PI)) * Math.PI / 180;
    }
    /* the press squeezes: height 0.94 and, V11, the footprint 0.97 too (what reads from above); a hold grows it */
    if (u.grow == null) {
      const p = 1 - u.pressK * 0.06, pf = FEEL ? (1 - u.pressK * 0.03) * (1 + 0.03 * holdK) : 1;
      m.scale.set(sxz * pf, sy * p, sxz * pf);
    }
    /* V11, lift and place: the picked glow stays on the board while the block lifts (it rode up with it) */
    if (FEEL && u.halo.visible) u.halo.position.y = (0.012 - Math.max(0, m.position.y - u.target.y)) / Math.max(0.05, m.scale.y);
  }
  /* The moment a block touches the board: it squashes a little, rocks with the speed it came in with,
     sawdust skids out from under it, and the blocks beside it in its row take a small knock. The sound is
     said now, at the touch, not when it was let go. */
  function touchDown(m, f) {
    const u = m.userData, fx = f.fx;
    /* V11, lift and place: the squash by its length and how fast it came down; a ring of dust and the
       neighbours' knock only on the board in view (its copy on the other board settles quietly) */
    if (FEEL && fx && fx.kind !== 'tap') u.sq = { t: 0, amp: squashFor(fx.size, fx.speed || f.speed), hand: true };
    else u.sq = { t: 0, amp: fx ? fx.amp : 0.07 };
    if (!fx) { if (f.tap) feelSay('tap'); return; }
    const vx = f.vx || 0, swung = (fx.swing || 0) * 180 / Math.PI;
    if (FEEL) {
      /* a rock only when it came in moving (0.72 units a second) or still swinging (2 degrees); a careful
         drop doesn't rock, the squash's rebound is its settle */
      if (Math.abs(vx) > LAND.rockSpeed || swung > LAND.rockSwing) {
        const maxV = (LAND.rockMax * Math.PI / 180) * LAND.rockW, sgn = vx ? Math.sign(vx) : 1;
        u.rock = { x: 0, v: -sgn * Math.min(maxV, Math.max(Math.abs(vx) / 12, swung / 20) * 1.4) };
      }
    } else {
      const sp = Math.max(-1, Math.min(1, vx / 12));
      if (Math.abs(sp) > 0.06) u.rock = { x: 0, v: -sp * 1.4 };
    }
    const seen = !FEEL || inView(m);
    if (seen) { if (FEEL) { ringAt(m); flecks(m); } else dust(m, fx.played ? 3 : 7); }
    if (!fx.played && seen) { fx.played = true; feelSay(fx.kind || 'land', fx.size, fx.speed || f.speed); knockAround(m); }
  }
  /* the blocks either side of one that landed hop a little, the nearest first and most */
  function knockAround(m) {
    const u = m.userData, day = u.kind === 'dblock', list = day ? dayb.blocks : u.kind === 'block' ? week.blocks : null;
    if (!list || reduced) return;
    const reach = day ? 4.5 : 2.4, half = (u.w || 1) / 2, L = u.target.x - half, R = u.target.x + half;
    list.forEach((o) => {
      const v = o.userData, b = v.orig || v.block;
      if (o === m || !o.visible || v.fall || v.wave || v.held || v.shrink != null || (b && b.free)) return;
      if (v.date !== u.date || (day ? v.lane !== u.lane : v.row !== u.row) || v.bkey === u.bkey) return;
      const ow = (v.w || 1) / 2, oL = v.target.x - ow, oR = v.target.x + ow;
      const gap = oL >= R ? oL - R : L >= oR ? L - oR : 0;
      if (gap > reach) return;
      const near = 1 - gap / reach;
      /* V11, lift and place: and a nudge away from the landing, which is what shows from above */
      v.knock = { t: 0, delay: 0.012 + gap * (day ? 0.014 : 0.03), amp: (day ? LAND.hop.day : LAND.hop.week) * near * near, dx: FEEL ? Math.sign(v.target.x - u.target.x || 1) * (day ? LAND.nudge.day : LAND.nudge.week) * near * near : 0 };
    });
  }
  /* sawdust: a few grains skid out along the board from under both long edges */
  function dust(m, n) {
    const u = m.userData, wp = m.getWorldPosition(new T.Vector3()), ws = m.parent ? m.parent.getWorldScale(new T.Vector3()) : ONE;
    const half = (u.dU || BLOCK_D) * 0.5 * ws.z, wide = (u.w || 1) * ws.x, sz = Math.max(0.7, Math.min(1.3, ws.x));
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const p = new T.Vector3(wp.x + (Math.random() - 0.5) * wide * 0.85, wp.y + 0.04, wp.z + side * (half + 0.03));
      const v = new T.Vector3((Math.random() - 0.5) * 0.9, 0.2 + Math.random() * 0.3, side * (0.7 + Math.random() * 0.8));
      puffAt(p, v, 0.3 + Math.random() * 0.18, (0.45 + Math.random() * 0.4) * sz);
    }
  }
  function puffAt(pos, v, life, s) {
    const m = new T.Mesh(puffGeo, puffMat);
    m.position.copy(pos);
    m.userData = { v, life, t: 0, s };
    world.add(m);
    puffs.push(m);
  }
  /* V11, lift and place: the landing's dust, flat on the board. A ring of light wood dust spreads from under
     the block (0.9 to 1.45 times its footprint and half a unit, 280 ms, its turn seeded by the block), drawn
     under the bricks, never over print, dimming at night; and on the day board (and the phone's desk) a few
     flat chips skid out from under a block of an hour or more. Both come from small pools. */
  const rings = [], ringPool = [], chipPool = [];
  let ringTex = null, chipMat = null;
  const seedOf = (k) => { let h = 2166136261; for (const c of String(k || '')) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000; };
  function ringAt(m) {
    if (reduced || typeof document === 'undefined' || !m.parent) return;
    if (!ringTex) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255, 238, 206, 0)'); gr.addColorStop(0.5, 'rgba(255, 238, 206, 0.9)'); gr.addColorStop(0.72, 'rgba(244, 222, 184, 0.55)'); gr.addColorStop(1, 'rgba(244, 222, 184, 0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      ringTex = new T.CanvasTexture(cv);
      if (T.SRGBColorSpace) ringTex.colorSpace = T.SRGBColorSpace;
    }
    const u = m.userData, wp = m.getWorldPosition(new T.Vector3()), ws = m.parent.getWorldScale(new T.Vector3());
    const r = ringPool.pop() || new T.Mesh(haloGeo, new T.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false }));
    r.renderOrder = 0;
    r.position.set(wp.x, wp.y + 0.006, wp.z);
    r.rotation.set(0, seedOf(u.bkey || u.key) * Math.PI * 2, 0);
    r.userData = { t: 0, w: ((u.w || 1) + 0.5) * ws.x, d: ((u.dU || BLOCK_D) + 0.5) * ws.z, chip: false };
    r.visible = true;
    world.add(r);
    rings.push(r);
  }
  function flecks(m) {
    if (reduced || typeof document === 'undefined' || !m.parent) return;
    const u = m.userData, b = u.orig || u.block || {};
    const onDay = u.kind === 'dblock';
    if (!onDay || !((b.sourceDur || b.dur || 0) >= 60)) return;
    if (!chipMat) chipMat = new T.MeshLambertMaterial({ color: '#E9CFA4' });
    const wp = m.getWorldPosition(new T.Vector3()), ws = m.parent.getWorldScale(new T.Vector3());
    const half = (u.dU || BLOCK_D) * 0.5 * ws.z, wide = (u.w || 1) * ws.x, s0 = seedOf(u.bkey);
    for (let i = 0; i < 4; i++) {
      const c = chipPool.pop() || new T.Mesh(haloGeo, chipMat);
      const side = i % 2 ? 1 : -1, k = (s0 * 7.3 + i * 0.37) % 1;
      c.position.set(wp.x + (k - 0.5) * wide * 0.8, wp.y + 0.008, wp.z + side * (half + 0.02));
      c.rotation.set(0, k * Math.PI, 0);
      c.scale.set(0.06, 1, 0.045);
      c.userData = { t: 0, life: 0.3 + 0.18 * ((k * 3.1) % 1), vx: (k - 0.5) * 0.8, vz: side * (0.9 + 0.6 * k), chip: true };
      c.visible = true;
      world.add(c);
      rings.push(c);
    }
  }
  function stepRings(dt) {
    const lk = typeof lightK === 'function' ? lightK() : 1;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i], u = r.userData;
      moving = true;
      if (u.chip) {
        const k = (u.t += dt) / u.life;
        if (k >= 1) { rings.splice(i, 1); world.remove(r); r.visible = false; chipPool.push(r); continue; }
        r.position.x += u.vx * dt * (1 - k); r.position.z += u.vz * dt * (1 - k);
        const s = 1 - k * k; r.scale.set(0.06 * s, 1, 0.045 * s);
        continue;
      }
      const k = (u.t += dt) / LAND.ring;
      if (k >= 1) { rings.splice(i, 1); world.remove(r); r.visible = false; ringPool.push(r); continue; }
      const e = 1 - Math.pow(1 - k, 3), s = 0.9 + 0.55 * e;
      r.scale.set(u.w * s, 1, u.d * s);
      r.material.opacity = LAND.ringOp * (1 - k) * (1 - k);
      r.material.color.setRGB(lk, lk, lk);
    }
  }
  /* A block was set down: dragged there, placed from a panel, or put there for you. One that's on its way
     down lands when it touches; one that appeared some other way drops in from a hand's height. However
     many pieces it shows as, it makes one sound. size: how big a clack (null for none). */
  function land(date, bkey, size) {
    const ms = blockMeshes(date, bkey).filter((m) => m.parent && (m.visible || m.userData.held));
    const fx = { size, amp: 0.16, played: false, kind: 'land' };
    /* V11, lift and place: a block falling from the hand into its slot lands when it touches, and its sound
       comes with it (stepFalls) */
    const fromHand = ms.find((m) => m.userData.handFall);
    if (FEEL && fromHand) { fromHand.userData.handFall.fx = fx; return; }
    if (!ms.length || reduced) {
      ms.forEach((m) => { m.userData.held = false; m.visible = true; if (FEEL && reduced && inView(m)) m.userData.flashT = 0; });
      feelSay('land', size);
      return;
    }
    /* (V11: only the board in view makes the sound and takes the knock; a block it doesn't show still sounds) */
    if (FEEL && !ms.some(inView)) feelSay('land', size);
    ms.forEach((m, i) => {
      const u = m.userData;
      if (!u.vel) u.vel = new T.Vector3();
      /* (V11: a block that lands starts from numbers that are numbers, whatever it carried before) */
      if (!blockFinite(m)) { restBlock(m); noteRepair('a block as it landed', u.key || u.bkey); }
      const held = u.held, own = !FEEL || inView(m);
      if (held) { u.held = false; m.visible = true; }
      if (u.fall) { u.fall.fx = own ? fx : null; return; }
      if (held || u.grow != null) {
        u.grow = null; u.newTile = false; u.wave = null; tileMotions.delete(m);
        m.scale.set(1, 1, 1); m.rotation.set(0, 0, 0);
        m.position.copy(u.target); m.position.y += 0.9; u.vel.set(0, 0, 0);
        u.fall = { t: 0, delay: i * 0.03, dur: 0.15, y0: 0.9, fx: own ? fx : null };
        return;
      }
      touchDown(m, { fx: own ? fx : null, vx: 0 });
    });
  }
  /* a block placed from a panel stays out of sight until the copy flying to it arrives */
  function holdBack(date, bkey) {
    if (!FEEL || reduced) return;
    blockMeshes(date, bkey).forEach((m) => { m.userData.held = true; m.userData.heldT = 0; m.visible = false; });
  }
  /* The Sunday Reset is done: the week clicks into place. Each day's blocks press down and settle, the
     week's first day to its last, and each day says so with a soft knock of wood. */
  const feelQueue = [];
  function weekSet() {
    if (!FEEL || reduced) return false;
    const dayView = zoomName === 'day' && layout === 'week', list = dayView ? dayb.blocks : week.blocks;
    const rows = new Set();
    list.forEach((m) => {
      const u = m.userData, b = u.orig || u.block;
      if (!m.visible || u.shrink != null || u.wave || u.fall || (b && b.free)) return;
      const r = dayView ? u.lane : u.row, at = r * (dayView ? 0.08 : 0.045) + (u.target.x - (dayView ? LX0 : X0)) * 0.003;
      u.sq = { t: -at, amp: 0.12, dur: 0.2 };
      rows.add(r);
    });
    const now = nowMs();
    Array.from(rows).sort((a, b) => a - b).forEach((r) => feelQueue.push({ at: now + (r * (dayView ? 0.08 : 0.045) + 0.05) * 1000, kind: 'roll', a: r }));
    return rows.size > 0;
  }
  /* a soft shadow pools on the board under the block in your hand, wider and fainter the higher it is */
  let blob = null;
  function stepBlob() {
    const o = drag.obj;
    if (!blob) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
      gr.addColorStop(0, 'rgba(46, 26, 10, 0.9)'); gr.addColorStop(0.55, 'rgba(46, 26, 10, 0.42)'); gr.addColorStop(1, 'rgba(46, 26, 10, 0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      blob = new T.Mesh(haloGeo, new T.MeshBasicMaterial({ map: canvasTex(cv), transparent: true, depthWrite: false }));
      blob.renderOrder = 1;
      world.add(blob);
    }
    if (!o || drag.surface == null || reduced) { blob.visible = false; return; }
    const u = o.userData, h = Math.max(0, o.position.y - drag.surface), grow = 1 + h * 0.35;
    blob.visible = true;
    /* V11: the shadow sits just above the grooves. Level with a groove's top (0.015 up), it won the depth test on
       some frames and lost on others while the camera settled, so it blinked under a lifted block for a few seconds. */
    blob.position.set(o.position.x, drag.surface + 0.03, o.position.z);
    blob.scale.set(((u.w || 1) + 0.5) * grow, 1, ((u.dU || BLOCK_D) + 0.5) * grow);
    blob.material.opacity = 0.4 * Math.max(0.25, 1 - h / 3);
  }
  /* blocks on their way back to where they came from, after a drop that didn't fit */
  const homes = [];
  const homeQ = new T.Quaternion();
  function stepHomes(dt) {
    for (let i = homes.length - 1; i >= 0; i--) {
      const h = homes[i], k = Math.min(1, (h.t += dt) / h.dur), e = 1 - Math.pow(1 - k, 3);
      moving = true;
      if (h.fold) {
        /* (V11, lift and place: a tile's block folding back into its card sinks to 0.6 where it is) */
        const s = 1 - 0.4 * (k * k);
        h.m.scale.copy(h.s0).multiplyScalar(s);
        h.m.position.y = h.from.y - 0.25 * k;
        if (k >= 1) { homes.splice(i, 1); dropBlock(h.m); if (h.done) h.done(); }
        continue;
      }
      if (h.curve) {
        /* (V11, lift and place: along a curve in the board's plane, bowed toward you, with a small arc) */
        const a = 1 - e, c = h.curve;
        h.m.position.set(a * a * h.from.x + 2 * a * e * c.x + e * e * h.to.x, h.from.y + (h.to.y - h.from.y) * e, a * a * h.from.z + 2 * a * e * c.z + e * e * h.to.z);
      } else h.m.position.lerpVectors(h.from, h.to, e);
      h.m.position.y += Math.sin(Math.PI * e) * h.arc;
      if (h.q0) { h.m.quaternion.slerpQuaternions(h.q0, homeQ.identity(), e); if (h.s1) h.m.scale.lerpVectors(h.s0, h.s1, e); }
      else { h.m.rotation.z = h.rz * (1 - e); h.m.rotation.x = h.rx * (1 - e); }
      if (h.sink) { const s = 1 - e; h.m.scale.set(1 - e * 0.2, Math.max(0.001, s * s), 1 - e * 0.2); }
      if (k >= 1) { homes.splice(i, 1); if (!h.keep) dropBlock(h.m); if (h.done) h.done(); }
    }
  }
  /* the landing outline fades in and glides from slot to slot */
  function ghostAim(g, x, y, z, sx, sz) {
    const u = g.userData;
    /* (V11: an outline aimed at a point that isn't a number isn't shown, rather than drawn nowhere) */
    if (![x, y, z, sx, sz].every(Number.isFinite)) { if (u.to) u.on = false; return; }
    const was = g.visible && u.on;
    if (!u.to) { u.to = new T.Vector3(); u.v = new T.Vector3(); u.op = 0; }
    u.to.set(x, y, z); u.sx = sx; u.sz = sz; u.on = true;
    if (!was || reduced) { g.position.set(x, y, z); g.scale.set(sx, sz, 1); u.v.set(0, 0, 0); u.snap = true; }
    if (reduced) u.op = 1;
    g.material.opacity = u.op;
    g.visible = true;
  }
  function stepGhost(g, dt) {
    const u = g.userData;
    if (!g.visible || !u.to) return;
    const to = u.on ? 1 : 0;
    if (hand.use) {
      /* V11, lift and place: it fades in over 90 ms the first time, glides from slot to slot on (0.12 s, 0.9),
         brightens once when the hand locks on, flashes red when a drop bumps what's in the way, and dims at
         night with the light. Calmer motion: it jumps, and the brightening and the flash stay (they're light) */
      u.op = u.on ? Math.min(1, u.op + dt / 0.09) : u.op - dt / 0.08;
      if (reduced && u.on) u.op = 1;
      if (!u.on && u.op <= 0.02) { g.visible = false; u.op = 0; if (u.add) u.add.visible = false; return; }
      const lk = lightK();
      g.material.color.setRGB(lk, lk, lk);
      g.material.opacity = Math.max(0, Math.min(1, u.op));
      if (!u.gs) u.gs = { x: { x: g.position.x, v: 0 }, y: { x: g.position.y, v: 0 }, z: { x: g.position.z, v: 0 }, w: { x: g.scale.x, v: 0 }, d: { x: g.scale.y, v: 0 } };
      const s = u.gs, w = resp(0.12);
      if (reduced || u.snap) { s.x.x = u.to.x; s.y.x = u.to.y; s.z.x = u.to.z; s.w.x = u.sx; s.d.x = u.sz; s.x.v = s.y.v = s.z.v = s.w.v = s.d.v = 0; u.snap = false; }
      else { sway(s.x, u.to.x, w, 0.9, dt, 0); sway(s.y, u.to.y, w, 0.9, dt, 0); sway(s.z, u.to.z, w, 0.9, dt, 0); sway(s.w, u.sx, w, 0.9, dt, 0); sway(s.d, u.sz, w, 0.9, dt, 0); }
      g.position.set(s.x.x, s.y.x, s.z.x); g.scale.set(Math.max(0.01, s.w.x), Math.max(0.01, s.d.x), 1);
      /* the brightening (0.22 to 0.34 to 0.26 over 160 ms) and the red flash (0 to 0.9 to 0 over 220 ms) */
      let add = 0, red = false;
      if (u.lock) { const k = (u.lock.t += dt) / 0.16; if (k >= 1) { u.lock = null; add = 0.04; } else add = k < 0.4 ? 0.12 * (k / 0.4) : 0.12 - 0.08 * ((k - 0.4) / 0.6); }
      else if (u.ok && hand.locked) add = 0.04;
      if (u.flash) { const k = (u.flash.t += dt) / 0.22; if (k >= 1) u.flash = null; else { add = 0.9 * Math.sin(Math.PI * k); red = true; } }
      if (u.add) {
        u.add.visible = add > 0.005;
        if (u.add.visible) { u.add.material.color.set(red ? '#C8372A' : '#28160A'); u.add.material.opacity = add * u.op; }
      }
      if (u.lock || u.flash || Math.abs(to - u.op) > 0.01 || Math.abs(s.x.v) + Math.abs(s.y.v) + Math.abs(s.z.v) + Math.abs(s.w.v) + Math.abs(s.d.v) > 1e-3 || g.position.distanceToSquared(u.to) > 1e-6 || Math.abs(u.sx - g.scale.x) > 0.001) moving = true;
      if (u.ok !== false && hand.on) { g.getWorldPosition(hand.slot); hand.slotOn = true; }
      return;
    }
    u.op += (to - u.op) * (1 - Math.exp(-dt * (u.on ? 24 : 32)));
    if (!u.on && u.op < 0.03) { g.visible = false; u.op = 0; return; }
    g.material.opacity = u.op;
    springV(g.position, u.v, u.to, 34, dt);
    const ks = 1 - Math.exp(-dt * 30);
    g.scale.x += (u.sx - g.scale.x) * ks; g.scale.y += (u.sz - g.scale.y) * ks;
    if (Math.abs(to - u.op) > 0.01 || g.position.distanceToSquared(u.to) > 1e-6 || Math.abs(u.sx - g.scale.x) > 0.001) moving = true;
  }
  /* sinking into the board: the way a block leaves (taken off, or its day changed) */
  function sinkScale(m, s) { m.scale.set(0.92 + 0.08 * s, Math.max(0.001, s * s), 0.92 + 0.08 * s); }
  /* V11-3 (design review 30): nothing on the desk throws its shadow onto a board, where the print is (the lamp's shade,
     leaning over the board's back edge, laid a round dark patch over the day's header, under 4.5 to 1). Each part of a
     thing whose shadow, along the key light, would reach the boards casts none; the rest of it keeps its shadow on the
     desk. Worked out again only when the light, the boards, or a thing has moved */
  const shadowCast = { sig: '', d: null, b: null, v: null };
  function propShadows() {
    if (!FEEL || !sun || !propList.length) return;
    const mt = matTarget();
    let sig = mt ? [mt.x0, mt.x1, mt.z0, mt.z1].map((v) => v.toFixed(2)).join() : '-';
    sig += '|' + [sun.position.x, sun.position.y, sun.position.z].map((v) => v.toFixed(2)).join();
    for (const p of propList) sig += '|' + p.mover.position.x.toFixed(2) + ',' + p.mover.position.z.toFixed(2) + ',' + p.mover.rotation.y.toFixed(2) + ',' + p.k.toFixed(2);
    if (sig === shadowCast.sig) return;
    shadowCast.sig = sig;
    if (!shadowCast.d) { shadowCast.d = new T.Vector3(); shadowCast.b = new T.Box3(); shadowCast.v = new T.Vector3(); }
    const d = shadowCast.d.copy(sun.target.position).sub(sun.position).normalize(), bb = shadowCast.b, v = shadowCast.v;
    /* the boards themselves, a little wider than their wood (matTarget is the mat: the boards and 1.1 around them) */
    const zone = mt && d.y < -0.05 ? { x0: mt.x0 + 0.8, x1: mt.x1 - 0.8, z0: mt.z0 + 0.8, z1: mt.z1 - 0.8 } : null;
    for (const p of propList) {
      p.obj.updateWorldMatrix(true, true);
      p.obj.traverse((me) => {
        if (!me.isMesh) return;
        if (me.userData.cast0 == null) me.userData.cast0 = me.castShadow;
        if (!me.userData.cast0) return;
        if (!zone) { me.castShadow = true; return; }
        if (!me.geometry.boundingBox) me.geometry.computeBoundingBox();
        bb.copy(me.geometry.boundingBox).applyMatrix4(me.matrixWorld);
        world.worldToLocal(bb.min); world.worldToLocal(bb.max);
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
          const t = Math.max(0, (y - BOARD_Y) / -d.y);
          v.set(x + d.x * t, BOARD_Y, z + d.z * t);
          x0 = Math.min(x0, v.x, x); x1 = Math.max(x1, v.x, x); z0 = Math.min(z0, v.z, z); z1 = Math.max(z1, v.z, z);
        }
        me.castShadow = !(x1 > zone.x0 && x0 < zone.x1 && z1 > zone.z0 && z0 < zone.z1);
      });
    }
  }
  function step(dt) {
    const k = 1 - Math.exp(-dt * 13);
    moving = false; steaming = false;
    stepHolds(dt);
    stepMat(dt);
    stepProps(dt);
    propShadows();
    stepSteam(dt);
    stepTiles(dt);
    /* a block taken off shrinks away (feel: it sinks into the board) */
    const gone = (m, u, rate) => {
      moving = true;
      u.shrink = Math.max(0, u.shrink - dt * (FEEL ? (u.shrinkFast ? 9 : 5) : rate));
      if (FEEL) sinkScale(m, u.shrink);
      else m.scale.set(Math.max(0.001, u.shrink), Math.max(0.001, u.shrink), 1);
      return u.shrink <= 0;
    };
    week.blocks.forEach((m, key) => {
      const u = m.userData;
      if (u.dragging || u.wave) return;
      if (u.shrink != null) { if (gone(m, u, 4)) { dropBlock(m); week.blocks.delete(key); } return; }
      const sel = selKey === key && zoomName !== 'day';
      if (FEEL) { feelBlock(m, dt, sel ? 0.2 : hoverObj === m ? 0.08 : 0, u.canGrip && (sel || hoverObj === m), sel); return; }
      u.halo.visible = sel;
      u.grip.visible = u.canGrip && (sel || hoverObj === m);
      easeBlock(m, dt, k, sel ? 0.2 : hoverObj === m ? 0.08 : 0);
    });
    dayb.blocks.forEach((m, key) => {
      const u = m.userData;
      if (u.dragging || u.wave) return;
      if (u.shrink != null) { if (gone(m, u, 4)) { dropBlock(m); dayb.blocks.delete(key); } return; }
      const sel = selKey === u.date + '|' + u.bkey;
      if (FEEL) { feelBlock(m, dt, sel ? 0.5 : hoverObj === m ? 0.14 : 0, u.canGrip && (sel || hoverObj === m), sel); return; }
      u.halo.visible = sel;
      u.grip.visible = u.canGrip && (sel || hoverObj === m);
      easeBlock(m, dt, k, sel ? 0.5 : hoverObj === m ? 0.14 : 0);
    });
    bench.pieces.forEach((m, key) => {
      const u = m.userData;
      if (u.dragging) return;
      if (u.shrink != null) { if (gone(m, u, 4.5)) { dropBlock(m); bench.pieces.delete(key); } return; }
      if (FEEL) { feelBlock(m, dt, hoverObj === m ? 0.16 : 0, u.canGrip && hoverObj === m, false); return; }
      u.grip.visible = u.canGrip && hoverObj === m;
      easeBlock(m, dt, k, hoverObj === m ? 0.16 : 0);
    });
    const hoverCard = (list) => list.forEach((c) => {
      const u = c.userData;
      if (u.pop || u.wave) return;
      const to = hoverObj === c ? 0.12 : 0;
      if (FEEL && !reduced) {
        const r = spring(u.lift, u.liftV || 0, to, 20, dt); u.lift = r[0]; u.liftV = r[1];
        if (Math.abs(to - u.lift) > 0.002 || Math.abs(u.liftV) > 0.01) moving = true; else { u.lift = to; u.liftV = 0; }
      } else {
        if (Math.abs(to - u.lift) > 0.002) moving = true;
        u.lift += (to - u.lift) * (1 - Math.exp(-dt * 14));
      }
      c.position.y = (u.baseY || 0) + u.lift;
      /* (V11, lift and place: a card that took a block presses once) */
      if (u.press) { const k = (u.press.t += dt) / 0.2; moving = true; if (!u.press.s0) u.press.s0 = c.scale.clone(); if (k >= 1) { c.scale.copy(u.press.s0); u.press = null; } else c.scale.copy(u.press.s0).multiplyScalar(1 + 0.04 * (1 - k) * (1 - k)); }
    });
    if (layout === 'month') hoverCard(month.cards);
    if (layout === 'year') hoverCard(year.cards);
    if (kinds.on) hoverCard(kinds.cards.filter((c) => c.visible));
    stepPops(dt);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const m = puffs[i], u = m.userData;
      u.t += dt;
      m.position.addScaledVector(u.v, dt);
      u.v.multiplyScalar(Math.exp(-dt * 4)); u.v.y -= dt * 1.5;
      m.scale.setScalar(u.s * Math.max(0, 1 - u.t / u.life));
      if (u.t >= u.life) { world.remove(m); puffs.splice(i, 1); }
    }
    /* (V11, lift and place: a block in the hand keeps the desk drawing only while it, the camera, or the
       outline still move: a still hand over a settled desk costs nothing, and the next move wakes it) */
    const rigged = hand.on && drag.obj && drag.obj.parent === hand.hang;
    if (pops.length || puffs.length || (drag.obj && !rigged) || homes.length || falls.length || rings.length) moving = true;
    if (rigged) { /* the hand: placed after the camera moves (handStep, below) */ }
    else if (drag.obj && FEEL && !reduced) {
      /* feel: the block in your hand rides a spring toward where it's aimed, and sways from how it speeds
         up and slows down, like a tile held by its top edge: it trails as you start, swings past level as
         you stop, and settles */
      const o = drag.obj, u = o.userData;
      if (drag.fresh) { o.position.copy(drag.target); drag.vel.set(0, 0, 0); drag.fresh = false; }
      const vx = drag.vel.x, vz = drag.vel.z, inv = 1 / Math.max(dt, 0.004);
      springV(o.position, drag.vel, drag.target, 24, dt);
      const ax = Math.max(-90, Math.min(90, (drag.vel.x - vx) * inv)), az = Math.max(-90, Math.min(90, (drag.vel.z - vz) * inv));
      sway(drag.roll, 0, 12, 0.5, dt, ax * 0.16);
      sway(drag.pitch, 0, 12, 0.55, dt, -az * 0.1);
      o.rotation.z = Math.max(-0.2, Math.min(0.2, drag.roll.x));
      o.rotation.x = -0.06 + Math.max(-0.12, Math.min(0.12, drag.pitch.x));
      if (u.appear != null) {
        u.appear += (1 - u.appear) * (1 - Math.exp(-dt * 20));
        if (1 - u.appear < 0.004) u.appear = null;
        o.scale.setScalar(u.appear == null ? 1 : u.appear);
      }
    } else if (drag.obj) {
      /* (V11, calmer motion: a block picked up off a panel starts where it's aimed, at its own size, instead of
         gliding in from the middle of the desk at the size it appears at) */
      if (drag.fresh) { drag.obj.position.copy(drag.target); drag.fresh = false; }
      if (drag.obj.userData.appear != null) { drag.obj.userData.appear = null; drag.obj.scale.setScalar(1); }
      drag.obj.position.lerp(drag.target, 1 - Math.exp(-dt * 16));
      drag.obj.rotation.z += (drag.tilt - drag.obj.rotation.z) * (1 - Math.exp(-dt * 10));
      drag.tilt *= Math.exp(-dt * 6);
    }
    if (FEEL) {
      if (!hand.use) stepBlob();
      stepHomes(dt);
      if (drag.ghost) stepGhost(drag.ghost, dt);
      dayb.ghosts.forEach((g) => stepGhost(g, dt));
      if (feelQueue.length) {
        moving = true;
        const now = nowMs();
        for (let i = feelQueue.length - 1; i >= 0; i--) if (now >= feelQueue[i].at) { const q = feelQueue.splice(i, 1)[0]; feelSay(q.kind, q.a); }
      }
      stepRings(dt);
      /* V11: nothing on the desk keeps a number that isn't one into the frame it's drawn in */
      watchBlocks();
      watchBoards();
    }
    stepCamera(dt);
    /* V11, lift and place: the hand, the fall, and the shadow, after the camera, so the block in hand never
       lags the view (it hangs over the floor point the aim point's ray finds now) */
    if (FEEL && hand.use) { handStep(dt); stepFalls(dt); stepHandShadow(dt); if (vapors.length) stepVapors(dt); }
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
      /* V11: a dimmed block wears no plate in its own color; the pin and its line still say now */
      if (FEEL && focusFn && !focusFn(b)) return;
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
    /* V11: kept, so the tag can be sized again when the board's print size changes (printWatch) */
    if (FEEL) dayb.nowArgs = [min, todayRow, soon, projected];
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
      /* V11: the time on the tag prints at a size it reads (its words are about 0.21 of a unit at full
         size): a little bigger where that's enough, and left off where it would have to grow over the
         next lane's hours; the pin and its line still say now */
      if (FEEL && dayPrintU) {
        const s0 = below ? 0.85 : 1, need = dayPrintU / 0.206, s = s0 * Math.min(1.6, Math.max(1, need));
        u.tag.visible = need <= 1.6;
        u.tag.scale.setScalar(s);
        u.tag.position.set((below ? 0.82 : 0.95) + 0.75 * (s - s0), 0.02, DB_D / 2 + (below ? 0.17 : 0.42) + 0.225 * (s - s0));
      } else if (u.tag) u.tag.visible = true;
    }
    setSpent(dayMin);
    setWeekSpent(weekMin, todayRow);
  }

  /* == dragging a block around == */
  const drag = { obj: null, target: new T.Vector3(), ghost: null, tilt: 0, vel: new T.Vector3(), roll: { x: 0, v: 0 }, pitch: { x: 0, v: 0 }, origin: null, surface: null, last: null, fresh: false, match: null };
  /* feel: the block in your hand is in your hand only. While you hold it (and while it flies home), the
     board doesn't show a second copy of it where it would land; the outline says where. */
  const inHand = (b) => { const h = drag.match; return !!(h && b && ((h.add && b.add === h.add) || (h.base && b.base === h.base))); };
  const ghostTexCache = new Map();
  let ghostD = BLOCK_D;
  /* kind (V11, lift and place): 'past', a time that's over (it goes in as done, so the outline shows a check) */
  function ghostTexture(wU, valid, kind) {
    const look = FEEL ? (valid ? (kind === 'past' ? 'past' : 'ok') : 'no') : String(valid);
    const key = wU.toFixed(2) + look + ghostD;
    if (ghostTexCache.has(key)) return ghostTexCache.get(key);
    const PX = 140, W = Math.max(16, Math.round(wU * PX)), H = Math.round(ghostD * PX);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const lw = 6;
    if (!FEEL) {
      g.fillStyle = valid ? 'rgba(255, 250, 238, 0.28)' : 'rgba(190, 60, 45, 0.2)';
      rr(g, lw, lw, W - 2 * lw, H - 2 * lw, 16); g.fill();
      g.strokeStyle = valid ? 'rgba(255, 255, 255, 0.95)' : 'rgba(190, 55, 45, 0.95)';
      g.lineWidth = lw; g.setLineDash([18, 12]); g.lineCap = 'round'; g.stroke();
    } else {
      /* V11, lift and place: a socket a little darker than what it's on, white dashes over a dark under stroke
         (so it reads over light open time and dark blocks alike), red with Apple's no (a circle with a slash)
         where it can't land, and a check where the time is over, since it goes in as done */
      g.fillStyle = look === 'no' ? 'rgba(150, 40, 30, 0.34)' : 'rgba(40, 22, 6, 0.22)';
      rr(g, lw, lw, W - 2 * lw, H - 2 * lw, 16); g.fill();
      g.lineCap = 'round'; g.setLineDash([18, 12]);
      g.strokeStyle = 'rgba(40, 22, 6, 0.55)'; g.lineWidth = lw + 5; g.stroke();
      g.strokeStyle = look === 'no' ? 'rgba(255, 214, 204, 0.98)' : 'rgba(255, 255, 255, 0.97)'; g.lineWidth = lw; g.stroke();
      g.setLineDash([]);
      const s = Math.min(H * 0.46, W * 0.62);
      const mark = (draw) => { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(40, 22, 6, 0.6)'; g.lineWidth = Math.max(5, s * 0.17) + 5; draw(); g.stroke(); g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(5, s * 0.17); draw(); g.stroke(); g.restore(); };
      if (s >= 22 && look === 'no') mark(() => { g.beginPath(); g.arc(W / 2, H / 2, s / 2, 0, Math.PI * 2); g.moveTo(W / 2 - s * 0.35, H / 2 + s * 0.35); g.lineTo(W / 2 + s * 0.35, H / 2 - s * 0.35); });
      if (s >= 22 && look === 'past') mark(() => { g.beginPath(); g.moveTo(W / 2 - s * 0.36, H / 2 + s * 0.02); g.lineTo(W / 2 - s * 0.1, H / 2 + s * 0.28); g.lineTo(W / 2 + s * 0.38, H / 2 - s * 0.26); });
    }
    const t = canvasTex(cv);
    /* the landing spot changes width as a block is stretched; a few dozen of these are plenty */
    if (ghostTexCache.size > 48) { ghostTexCache.forEach((x) => x.dispose()); ghostTexCache.clear(); dayGhostTex.clear(); }
    ghostTexCache.set(key, t);
    return t;
  }
  /* A block follows the pointer. `big` makes it a day sized brick. opts.origin: a piece on the bench it
     came from (feel: it lifts from there, and goes back there if it doesn't land) */
  function startDrag(b, fromObj, big, opts) {
    opts = opts || {};
    /* V11, lift and place: one object from pick up to landing. A block traded for a bigger or smaller one mid
       carry (between the day and the week, a bench piece over a row) is the same block in hand, changing shape
       once (handReshape), never ended and started again */
    if (FEEL && hand.on && drag.obj && !fromObj) return handReshape(b, big, opts);
    /* feel: a block traded for a bigger or smaller one mid drag (crossing between the day and the week)
       carries on from where the last one was, at its speed */
    let keep = !FEEL || hand.use ? null : drag.obj ? { pos: drag.obj.position.clone(), vel: drag.vel.clone(), origin: drag.origin, surface: drag.surface } : drag.last && nowMs() - drag.last.at < 200 ? drag.last : null;
    /* (V11: a place or a speed that isn't a number is never carried into the next block in hand) */
    if (keep && (!finite3(keep.pos) || !finite3(keep.vel))) keep = null;
    endDrag();
    drag.last = null;
    const m = makeBlock(b);
    const dayBrick = big || (fromObj && fromObj.userData.kind === 'dblock');
    const wU = (dayBrick ? DU : 1) * b.dur / 60;
    /* (a piece off the bench lifts as itself, a keycap, until it's over a row) */
    const piece = FEEL && hand.use && opts.origin && !fromObj && opts.origin.userData.kind === 'bench' && opts.origin.userData.block;
    if (piece) { const pu = opts.origin.userData; m.userData.kind = 'block'; dressBlock(m, pu.block, pu.wU, pu.dU, { hMul: pu.hMul }); }
    else dressBlock(m, b, wU, dayBrick ? DB_D : BLOCK_D, dayBrick ? { hMul: DB_HMUL } : {});
    m.userData.dragging = true;
    const origin = opts.origin || (keep && keep.origin) || null;
    /* V11, lift and place: the block hangs from where you pinched it (the hand, below) */
    if (FEEL && hand.use) {
      if (fromObj) {
        const hide = fromObj.userData.kind === 'dblock' ? Array.from(dayb.blocks.values()).filter((x) => x.userData.date === fromObj.userData.date && x.userData.bkey === fromObj.userData.bkey) : [fromObj];
        hide.forEach((x) => { x.visible = false; });
        drag.hidden = hide;
      }
      drag.obj = m;
      drag.vel = new T.Vector3(); drag.roll = { x: 0, v: 0 }; drag.pitch = { x: 0, v: 0 };
      drag.origin = origin;
      drag.surface = null;
      drag.match = b.add ? { add: b.add } : b.tpl ? { base: b.base } : null;
      handStart(m, b, !!dayBrick, fromObj || null, origin, opts.hand || {}, piece);
      return m;
    }
    if (fromObj) {
      m.position.copy(world.worldToLocal(fromObj.getWorldPosition(new T.Vector3())));
      const hide = fromObj.userData.kind === 'dblock' ? Array.from(dayb.blocks.values()).filter((x) => x.userData.date === fromObj.userData.date && x.userData.bkey === fromObj.userData.bkey) : [fromObj];
      hide.forEach((x) => { x.visible = false; });
      drag.hidden = hide;
    } else if (FEEL && keep) m.position.copy(keep.pos);
    else if (FEEL && origin) m.position.copy(world.worldToLocal(origin.getWorldPosition(new T.Vector3())));
    else if (FEEL) { drag.fresh = true; m.userData.appear = 0.86; m.scale.setScalar(0.86); }
    else m.position.set(0, 3, 8);
    m.rotation.x = -0.06;
    world.add(m);
    drag.obj = m;
    drag.target.copy(m.position);
    if (FEEL) {
      drag.vel = keep ? keep.vel.clone() : new T.Vector3();
      drag.roll = { x: 0, v: 0 }; drag.pitch = { x: 0, v: 0 };
      drag.origin = origin;
      drag.surface = keep ? keep.surface : null;
      drag.match = b.add ? { add: b.add } : b.tpl ? { base: b.base } : null;
    }
    return m;
  }
  /* feel: nothing is in hand any more; the board shows every block it has again */
  function letGo() {
    drag.match = null;
    const show = (m) => { const u = m.userData; if (u.inHand) { u.inHand = false; if (!u.held && u.shrink == null) m.visible = true; } };
    week.blocks.forEach(show); dayb.blocks.forEach(show);
  }
  /* o (feel): hand, the point under the pointer, so the block rides between it and the slot instead of
     lurching from slot to slot; surface, the height of the board under it, for its shadow */
  function dragTo(x, y, z, tilt, o) {
    if (!drag.obj) return;
    /* (V11: the block in hand is never aimed at a point that isn't a number; it stays where it was aimed) */
    if (FEEL && !(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z))) return;
    /* (V11, lift and place: a block in the hand hangs over where you aim, every frame: handAim says where) */
    if (FEEL && drag.hand && drag.hand.on) return;
    drag.target.set(x, y, z);
    if (FEEL && o) {
      if (o.hand && Number.isFinite(o.hand.x) && Number.isFinite(o.hand.z)) { drag.target.x += (o.hand.x - x) * 0.3; drag.target.z += (o.hand.z - z) * 0.3; }
      if (o.surface != null && Number.isFinite(o.surface)) drag.surface = o.surface;
    }
    drag.tilt = FEEL && reduced ? 0 : Math.max(-0.22, Math.min(0.22, (tilt || 0) * -0.035));
  }
  /* a fifth argument (V11, lift and place): { past }, the time is over, so the outline shows a check */
  function showGhost(row, start, durMin, valid) {
    const o = arguments[4];
    if (!drag.ghost) {
      drag.ghost = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      drag.ghost.rotation.x = -Math.PI / 2;
      /* V11: hidden until it has a slot (ghostAim shows it) */
      if (FEEL) { drag.ghost.visible = false; ghostLive(drag.ghost); }
      week.group.add(drag.ghost);
    }
    const gh = drag.ghost;
    if (row == null) { if (FEEL) gh.userData.on = false; else gh.visible = false; return; }
    const w = durMin / 60;
    ghostD = BLOCK_D;
    const gt = ghostTexture(w, valid, o && o.past ? 'past' : '');
    /* V11: marked changed only when its picture changes */
    if (!FEEL || gh.material.map !== gt) { gh.material.map = gt; gh.material.needsUpdate = true; }
    /* V11, lift and place: on top of whatever the slot overlaps (open time, a block it pushes, one in the
       way), drawn over the bricks, so it's never under them */
    if (FEEL) { gh.userData.ok = !!valid; ghostAim(gh, xOf(start) + w / 2, BOARD_Y + ghostTop(week.blocks, (u) => u.row === row, xOf(start), xOf(start) + w) + 0.01, rowZ(row), w - GAP, BLOCK_D); return; }
    gh.visible = true;
    gh.scale.set(w - GAP, BLOCK_D, 1);
    gh.position.set(xOf(start) + w / 2, BOARD_Y + 0.026, rowZ(row));
  }
  /* opts (feel): home, the drop didn't fit, so the block flies back to where it came from (or sinks away
     if it came from the tray); absorb, it was used up where it was let go (food on a dinner); then, what to
     do once it's there. With no opts the block is put away at once, for a hand off. */
  function endDrag(landAt, opts) {
    if (landAt && !landAt.isVector3) { opts = landAt; landAt = null; }
    opts = opts || {};
    if (!FEEL) {
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
      if (opts.then) opts.then();
      return;
    }
    /* V11, lift and place: a drop that can't land says no before it goes home (handNo): it dips toward the
       slot, bumps, shakes no, and then flies home from there */
    if (opts.no && hand.on && drag.obj && !reduced && !hand.no) { handNo(opts); return; }
    const hidden = drag.hidden, o = drag.obj, origin = drag.origin;
    const rigged = !!(o && hand.on && o.parent === hand.hang);
    const rectNow = rigged && opts.fold ? handRect() : null;
    drag.hidden = null; drag.obj = null; drag.origin = null;
    showGhost(null);
    if (dayb.ghosts.length) showDayGhost(null);
    if (blob) blob.visible = false;
    /* (the block leaves the hand where it is: its place, its turn, and its size in the world) */
    if (rigged) { world.attach(o); handEnd(o); }
    else if (hand.on) handEnd(null);
    /* a block shown again after a flight home sits in its slot at once (it moved there unseen) */
    const reveal = (settle) => (hidden || []).forEach((x) => {
      if (x.userData.shrink != null || x.userData.back || x.userData.held) return;
      x.visible = true;
      if (settle && !reduced) { x.position.copy(x.userData.target); if (x.userData.vel) x.userData.vel.set(0, 0, 0); x.userData.sq = { t: 0, amp: FEEL ? HAND_TUNE.homeSquash : 0.07, hand: true }; }
    });
    if (!o) { reveal(false); letGo(); if (opts.then) opts.then(); return; }
    if (weekSpent && weekSpent.parent === o) o.remove(weekSpent);
    if (spentMesh && spentMesh.parent === o) o.remove(spentMesh);
    /* V11, lift and place: a tile from a panel that leaves the desk folds back into its card where it is:
       the block sinks to 0.6 under the card and goes (the card grows back out of its box, app.js) */
    if (opts.fold && opts.start) { try { opts.start(rectNow); } catch (e) { /* fine */ } }
    if (opts.fold && !reduced) {
      homes.push({ m: o, from: o.position.clone(), to: o.position.clone(), t: 0, dur: HAND_TUNE.seamMs / 1000, arc: 0, fold: true, s0: o.scale.clone(), q0: o.quaternion.clone(), done: () => { reveal(false); letGo(); if (opts.then) opts.then(); } });
      return;
    }
    if (reduced || !(opts.home || opts.absorb)) {
      if (!hand.use) drag.last = { pos: o.position.clone(), vel: drag.vel.clone(), at: nowMs(), origin, surface: drag.surface };
      dropBlock(o);
      reveal(false);
      letGo();
      /* (calmer motion: home at once, with its tap) */
      if (reduced && opts.home && (hidden && hidden.length || origin)) feelSay('home');
      if (opts.then) opts.then();
      return;
    }
    const back = !opts.absorb && hidden && hidden.length ? hidden[0] : !opts.absorb ? origin : null;
    const from = o.position.clone();
    if (back) {
      /* home is the slot it belongs in, wherever it was nudged to while you aimed */
      const to = world.worldToLocal(back.parent && back.userData.target ? back.parent.localToWorld(back.userData.target.clone()) : back.getWorldPosition(new T.Vector3()));
      /* V11, lift and place: a curve in the board's plane (its middle bowed toward you) with a small arc, timed
         by how far it goes on screen, arriving level and at its true size */
      const px = hand.use ? screenDist(from, to) : 0;
      const dur = hand.use ? Math.max(HAND_TUNE.homeMin, Math.min(HAND_TUNE.homeMax, 0.2 + 0.00018 * px)) : 0.26;
      const bs = back.parent ? back.parent.getWorldScale(new T.Vector3()) : new T.Vector3(1, 1, 1);
      const bu = back.userData, ou = o.userData;
      const s1 = hand.use && ou.w > 0 && ou.h > 0 && ou.dU > 0 && bu.w > 0 ? new T.Vector3((bu.w * bs.x) / ou.w, ((bu.h || H_HARD) * bs.y) / ou.h, ((bu.dU || BLOCK_D) * bs.z) / ou.dU) : null;
      homes.push({ m: o, from, to, t: 0, dur, arc: Math.min(0.6, 0.2 + from.distanceTo(to) * 0.03), rz: o.rotation.z, rx: o.rotation.x, curve: hand.use ? homeCurve(from, to) : null, s0: o.scale.clone(), s1, q0: o.quaternion.clone(), done: () => {
        if (hidden && hidden.length) reveal(true);
        else if (back.userData.shrink == null) { back.visible = true; if (!reduced) back.userData.sq = { t: 0, amp: FEEL ? HAND_TUNE.homeSquash : 0.07, hand: true }; }
        letGo();
        feelSay('home');
        if (opts.then) opts.then();
      } });
    } else {
      /* nowhere to go back to on the desk: it sinks away where it is */
      const to = from.clone(); to.y = drag.surface != null ? drag.surface : Math.max(0, from.y - 0.8);
      homes.push({ m: o, from, to, t: 0, dur: 0.2, arc: 0, sink: true, rz: o.rotation.z, rx: o.rotation.x, done: () => { letGo(); if (opts.then) opts.then(); } });
      reveal(false);
    }
  }
  /* == the hand ==
     V11, lift and place (docs/LIFT-AND-PLACE.md). A block in hand hangs from where you pinched it. Every move
     the app gives the desk the pointer (handAim); the aim point is the pointer for a mouse, trackpad, or pen,
     and a point above the fingertip for touch. Every frame, after the camera moves, the desk finds the floor
     point where the aim point's ray meets the surface under it, hangs the block straight above that point
     (the pinch over its top face, at the spot you grabbed along it), lifts it on a spring, swings it like a
     pendulum from the pinch as the hand speeds up and slows down, and lays one soft shadow under it. Let go
     over a slot, it falls into the slot under desk scale gravity, from exactly where it hung, and lands
     (adoptPosition). HAND_TUNE holds every number; HAND_PRESETS are the three to pick from in Dev. */
  const HAND_TUNE = {
    lift: { week: 1.5, day: 1.8, mini: 0.8, desk: 1.6 }, liftResp: 0.22, liftZeta: 0.62,
    size: { mouse: 1.12, touch: 1.2 }, tilt: 0.08, hang: { week: 0.55, day: 0.75 },
    minLen: { mouse: 44, touch: 60 }, minDepthTouch: 40, maxScale: 2.2, keycapPx: 90,
    touchClear: 22, touchMin: 36, touchMax: 64, touchRampMs: 150, touchTravel: 48,
    seamMs: 140, seamResp: 0.14,
    hz0: 1.33, hzK: 0.37, touchHz: 0.93, zeta: 0.36, g: 40000, follow: 45, aMax: 30000,
    speedLean: 0.002, speedLeanMax: 3, pitchK: 0.7, droop: 3, capRoll: 14, capPitch: 9, capYaw: 7,
    yawK: 0.006, yawHz: 2.0, yawZeta: 0.45,
    sink: 0.15, rise: 0.08, sinkResp: 0.16, sinkZeta: 0.8,
    pullPx: 6, pullAfter: 100, pullSpeed: 150, pullResp: 0.12, pullZeta: 0.9, lockAfter: 100,
    lean: 0.12, leanIn: 0.35, leanOut: 0.5, leanHold: 250,
    fallG: 280, fallMin: 0.09, fallMax: 0.16,
    squash: [0.08, 0.10, 0.11], sqW: 35, sqTau: 0.06, sqDur: 0.26, bulge: 0.5,
    ring: 0.28, ringOp: 0.42,
    hop: { week: 0.032, day: 0.05 }, nudge: { week: 0.045, day: 0.07 },
    rockW: 26, rockZeta: 0.3, rockMax: 2.5, rockSpeed: 0.72, rockSwing: 2,
    homeMin: 0.22, homeMax: 0.42, homeCurve: 0.15, homeSquash: 0.04,
    noDip: 0.25, noRecoil: 0.2, noShake: 3.5, noHome: 280
  };
  const HAND_PRESETS = {
    calmer: { lift: { week: 1.1, day: 1.3, mini: 0.6, desk: 1.2 }, size: { mouse: 1.06, touch: 1.12 }, g: 60000, zeta: 0.45, capRoll: 9, capPitch: 6, capYaw: 4, speedLeanMax: 2 },
    middle: {},
    bolder: { lift: { week: 1.8, day: 2.1, mini: 1.0, desk: 1.9 }, size: { mouse: 1.18, touch: 1.26 }, g: 30000, zeta: 0.32, capRoll: 16, capPitch: 11, capYaw: 8, speedLeanMax: 4 }
  };
  const HAND_BASE = JSON.parse(JSON.stringify(HAND_TUNE));
  root.HAND_TUNE = HAND_TUNE;
  let handPresetName = 'middle';
  function handPreset(name) {
    if (!HAND_PRESETS[name]) return handPresetName;
    const base = JSON.parse(JSON.stringify(HAND_BASE));
    Object.assign(HAND_TUNE, base, JSON.parse(JSON.stringify(HAND_PRESETS[name])));
    handPresetName = name;
    return name;
  }
  const hand = drag.hand = {
    use: FEEL, on: false, rig: null, hang: null, obj: null, b: null, big: false, piece: null, from: 'card',
    over: 'week', touch: false, u: 0.5, v: 0.5, trueWU: 1, dU: BLOCK_D, hMul: 1, dur: 60,
    raw: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, press: { x: 0, y: 0 }, aimOn: false,
    off: 0, offTo: 44, offK: 0, offRamp: null, offAt: 0,
    aimTop: 0, aimY: BOARD_Y, base: { x: BOARD_Y, v: 0 }, baseTo: BOARD_Y,
    floor: new T.Vector3(), has: false, pxX: 40, pxZ: 20,
    lift: { x: 0, v: 0 }, ext: { x: 0, v: 0 }, s: { x: 1, v: 0 }, seamS: 0, seam: false,
    rx: { x: 1, v: 0 }, ry: { x: 1, v: 0 }, rz: { x: 1, v: 0 },
    roll: { x: 0, v: 0 }, pitch: { x: 0, v: 0 }, yaw: { x: 0, v: 0 },
    trk: { x: 0, y: 0, vx: 0, vy: 0, primed: false },
    pull: { x: { x: 0, v: 0 }, z: { x: 0, v: 0 } }, slow: 0,
    ok: null, okAt: 0, slotKey: '', lockAt: 0, locked: false,
    slot: new T.Vector3(), slotOn: false,
    pop: null, no: null, sub: '', face: '', wU: 1, dressAt: 0, keyAt: 0
  };
  /* the canvas's box on screen, measured at most every half a second (or after fit) */
  let canvasBox = null, canvasBoxAt = 0;
  function canvasRect() {
    const t = nowMs();
    if (!canvasBox || t - canvasBoxAt > 500) { canvasBox = renderer.domElement.getBoundingClientRect(); canvasBoxAt = t; }
    return canvasBox;
  }
  const hNdc = new T.Vector2(), hRay = new T.Raycaster(), hPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const hTmp = new T.Vector3(), hTmp2 = new T.Vector3(), hTmp3 = new T.Vector3(), hProj = new T.Vector3(), hWas = new T.Vector3();
  /* the point where a screen point's ray meets the level plane at height y (in the world) */
  function rayAt(px, py, y, out) {
    const r = canvasRect();
    if (!r.width || !r.height) return null;
    hNdc.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
    hRay.setFromCamera(hNdc, camera);
    hPlane.constant = -y;
    return hRay.ray.intersectPlane(hPlane, out);
  }
  /* a world point on screen (px), without allocating */
  function scr(v, out) {
    const r = canvasRect();
    hProj.copy(v).project(camera);
    out.x = r.left + (hProj.x + 1) / 2 * r.width; out.y = r.top + (1 - hProj.y) / 2 * r.height;
    return out;
  }
  const sA = { x: 0, y: 0 }, sB = { x: 0, y: 0 };
  function screenDist(a, b) { scr(a, sA); scr(b, sB); const d = Math.hypot(sA.x - sB.x, sA.y - sB.y); return Number.isFinite(d) ? d : 0; }
  /* the bend of a flight home: the middle of the path bowed toward you (to the side, in the board's plane) */
  function homeCurve(from, to) {
    const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz);
    if (len < 0.05) return null;
    let nx = -dz / len, nz = dx / len;
    if (nz < 0) { nx = -nx; nz = -nz; }
    return new T.Vector3((from.x + to.x) / 2 + nx * len * HAND_TUNE.homeCurve, 0, (from.z + to.z) / 2 + nz * len * HAND_TUNE.homeCurve);
  }
  /* the board a kind of target is on, and the heights the hand works from there (in the world) */
  function overGroup(over) { return over === 'day' ? dayb.group : over === 'week' || over === 'mini' ? week.group : over === 'bench' ? bench.group : null; }
  function worldY(group, y) { if (!group) return y; hTmp3.set(0, y, 0); return group.localToWorld(hTmp3).y; }
  const handDepth = () => (hand.over === 'day' ? DB_D : BLOCK_D) * (overGroup(hand.over) ? overGroup(hand.over).getWorldScale(hTmp2).z : 1);
  /* the screen scale where the hand is: px per unit across, and down the board */
  function handScale() {
    const H = hand;
    scr(H.floor, sA);
    hTmp.copy(H.floor); hTmp.x += 1; scr(hTmp, sB);
    const px = Math.hypot(sB.x - sA.x, sB.y - sA.y);
    hTmp.copy(H.floor); hTmp.z += 1; scr(hTmp, sB);
    const pz = Math.hypot(sB.x - sA.x, sB.y - sA.y);
    if (px > 0.5 && Number.isFinite(px)) H.pxX = px;
    if (pz > 0.5 && Number.isFinite(pz)) H.pxZ = pz;
  }
  /* the aim point: the pointer, or for a finger, a point above it by the touch offset, which comes in over
     150 ms at the seam (a tile from a panel) or over the first 48 px of travel (a block or a piece under the
     finger), so lifting without moving never re-aims at the row above */
  function handAimPoint() {
    const H = hand, T_ = HAND_TUNE;
    let off = 0;
    if (H.touch) {
      if (H.offRamp === 'seam') H.offK = Math.min(1, (nowMs() - H.offAt) / (reduced ? 100 : T_.touchRampMs));
      else if (H.offRamp === 'travel') H.offK = Math.max(H.offK, Math.min(1, Math.hypot(H.raw.x - H.press.x, H.raw.y - H.press.y) / T_.touchTravel));
      const k = H.offRamp === 'seam' ? 1 - (1 - H.offK) * (1 - H.offK) : H.offK * H.offK * (3 - 2 * H.offK);
      off = H.offTo * k;
    }
    H.off = off;
    H.aim.x = H.raw.x; H.aim.y = H.raw.y - off;
  }
  function handReady() {
    if (hand.rig) return;
    hand.rig = new T.Group(); hand.hang = new T.Group(); hand.hang.rotation.order = 'YXZ';
    hand.rig.add(hand.hang); world.add(hand.rig);
  }
  /* what the block in hand looks like: its name and the time it would land at, or, short on screen, its mark
     over its name (a keycap) at twice the resolution; at least 44 px long (60 on touch) */
  function handDress(force) {
    const H = hand, o = drag.obj;
    if (!o || !H.b) return;
    if (H.piece && !force) return;
    const sv = Math.max(0.5, H.sTo || 1), T_ = HAND_TUNE;
    const lenPx = H.trueWU * H.pxX * sv, minPx = H.touch ? T_.minLen.touch : T_.minLen.mouse;
    let wU = H.trueWU;
    if (lenPx < minPx && H.pxX > 0) wU = Math.ceil((minPx / (H.pxX * sv)) * 20) / 20;
    const face = wU * H.pxX * sv < T_.keycapPx ? 'key' : 'time';
    const t = nowMs();
    if (!force && wU === H.wU && face === H.face && (face === 'key' || H.sub === H.subShown)) return;
    if (!force && t - H.dressAt < 100) return;
    H.dressAt = t; H.wU = wU; H.face = face; H.subShown = H.sub;
    const b = Object.assign({}, H.b, face === 'key' ? { piece: true, pieceS: 0.21, sub: '', hi: 2 } : { sub: H.sub || H.b.sub || '', stack: true, hi: 2 });
    o.userData.inHandRig = true;
    dressBlock(o, b, wU, H.dU, H.hMul !== 1 ? { hMul: H.hMul } : {});
    o.userData.body.castShadow = false;
  }
  /* m: the block in hand; b: what it is; big: a day brick; fromObj: the block on the board it lifts out of;
     origin: the bench piece it came from; o: { px, py (where the pointer is), u, v (where it's held, 0 to 1
     along and across), touch, pen, card ({ width } of a card turning into it), roll, rollV (the card's swing,
     radians), over, top (for a block moved on the board, its own top, in board units), held (a finger held
     it still until it rose), sub (the time it would land at) }; piece: a bench piece lifting as itself */
  function handStart(m, b, big, fromObj, origin, o, piece) {
    const H = hand, T_ = HAND_TUNE;
    handReady();
    H.on = true; H.obj = m; H.b = Object.assign({}, b); H.big = big; H.piece = piece || null;
    H.touch = !!o.touch; H.dur = b.dur || 60;
    H.trueWU = piece ? m.userData.wU : (big ? DU : 1) * (b.dur || 60) / 60;
    H.dU = piece ? m.userData.dU : big ? DB_D : BLOCK_D; H.hMul = piece ? (m.userData.hMul || 1) : big ? DB_HMUL : 1;
    H.from = fromObj ? 'board' : o.card ? 'card' : origin ? 'bench' : 'card';
    H.over = o.over || (fromObj ? (fromObj.userData.kind === 'dblock' ? 'day' : 'week') : origin ? 'bench' : 'week');
    H.u = Math.max(0, Math.min(1, o.u == null ? 0.5 : o.u)); H.v = Math.max(0, Math.min(1, o.v == null ? 0.5 : o.v));
    const px = Number.isFinite(o.px) ? o.px : H.raw.x, py = Number.isFinite(o.py) ? o.py : H.raw.y;
    H.raw.x = H.press.x = px; H.raw.y = H.press.y = py; H.aimOn = true;
    H.offK = 0; H.offAt = nowMs(); H.offRamp = H.from === 'card' ? 'seam' : 'travel';
    H.aimTop = Number.isFinite(o.top) ? o.top : 0;
    const g = overGroup(H.over);
    H.baseTo = origin && !fromObj ? worldY(bench.group, BOARD_Y) : worldY(g, BOARD_Y);
    H.base.x = H.baseTo; H.base.v = 0;
    H.aimY = worldY(g, BOARD_Y + H.aimTop);
    H.lift = { x: o.held ? 0.12 : 0, v: 0 }; H.ext = { x: 0, v: 0 };
    H.s = { x: o.held ? 1.03 : 1, v: 0 }; H.seam = !!o.card; H.seamS = o.card ? o.card.width : 0;
    H.rx = { x: 1, v: 0 }; H.ry = { x: 1, v: 0 }; H.rz = { x: 1, v: 0 };
    H.roll = { x: Number.isFinite(o.roll) ? o.roll : 0, v: Number.isFinite(o.rollV) ? o.rollV : 0 }; H.pitch = { x: 0, v: 0 }; H.yaw = { x: 0, v: 0 };
    H.trk.primed = false;
    H.pull = { x: { x: 0, v: 0 }, z: { x: 0, v: 0 } }; H.slow = 0;
    H.ok = null; H.okAt = 0; H.slotKey = ''; H.lockAt = 0; H.locked = false; H.slotOn = false;
    H.pop = H.from === 'board' || H.from === 'bench' ? { t: 0 } : null;
    H.no = null; H.sub = o.sub || ''; H.subShown = null; H.face = ''; H.wU = H.trueWU; H.dressAt = 0;
    H.sTo = reduced ? 1 : H.touch ? T_.size.touch : T_.size.mouse;
    m.userData.inHandRig = true;
    if (m.userData.body) m.userData.body.castShadow = false;
    H.hang.rotation.set(0, 0, 0);
    H.hang.add(m);
    m.rotation.set(0, 0, 0);
    handAimPoint();
    /* the first frame: where it is now, so it's never a frame anywhere else */
    if (rayAt(H.aim.x, H.aim.y, H.aimY, H.floor)) { H.has = true; handScale(); }
    if (!piece) handDress(true);
    handPose(0);
    handShadowReset();
    touch();
  }
  /* the same block in hand takes another shape (a day brick over the day, a week brick over the week, a bench
     piece's keycap turning into a brick over a row): it changes once, on (0.14 s, 1.0), from the box it had */
  function handReshape(b, big, opts) {
    const H = hand, o = drag.obj, u = o.userData;
    const w0 = u.w || 1, h0 = u.h || H_HARD, d0 = u.dU || BLOCK_D;
    H.b = Object.assign({}, b); H.big = !!big; H.piece = null; H.dur = b.dur || 60;
    H.trueWU = (big ? DU : 1) * (b.dur || 60) / 60; H.dU = big ? DB_D : BLOCK_D; H.hMul = big ? DB_HMUL : 1;
    if (opts && opts.hand && opts.hand.over) H.over = opts.hand.over;
    if (b.add || b.tpl) drag.match = b.add ? { add: b.add } : { base: b.base };
    handDress(true);
    if (!reduced) { H.rx = { x: w0 / (u.w || 1), v: 0 }; H.ry = { x: h0 / (u.h || H_HARD), v: 0 }; H.rz = { x: d0 / (u.dU || BLOCK_D), v: 0 }; }
    touch();
    return o;
  }
  /* where the hand is, every move. px, py: the pointer. o: { over (week, day, mini, desk, bench), top (the plane
     it aims on, above the board, in board units), ok (true, false, or null over no slot), sub (the time it
     would land at), slotKey (a key for the slot, for the lock on), stretch (no block in hand: only the lean
     follows the pointer) } */
  function handAim(px, py, o) {
    if (!FEEL || !Number.isFinite(px) || !Number.isFinite(py)) return;
    const H = hand;
    o = o || {};
    H.raw.x = px; H.raw.y = py; H.aimOn = true;
    if (o.stretch) { H.aim.x = px; H.aim.y = py; return; }
    if (!H.on) return;
    if (o.over && o.over !== H.over) {
      H.over = o.over;
      const g = overGroup(H.over);
      H.baseTo = H.over === 'desk' ? (Number.isFinite(o.base) ? o.base : 0.02) : worldY(g, BOARD_Y);
    }
    if (o.over === 'desk' && Number.isFinite(o.base)) H.baseTo = o.base;
    if (o.top != null && Number.isFinite(o.top)) H.aimTop = o.top;
    const g = overGroup(H.over);
    H.aimY = g ? worldY(g, BOARD_Y + H.aimTop) : H.baseTo;
    if (o.ok !== undefined) {
      const k = o.slotKey || '';
      if (o.ok !== H.ok || k !== H.slotKey) { H.ok = o.ok; H.slotKey = k; H.okAt = nowMs(); H.locked = false; H.lockAt = 0; }
    }
    if (o.sub != null) H.sub = o.sub;
    handAimPoint();
  }
  /* the aim point the app works out the slot from (null when nothing is in hand) */
  function handPoint() { return hand.aimOn ? { x: hand.aim.x, y: hand.aim.y, off: hand.off, raw: { x: hand.raw.x, y: hand.raw.y } } : null; }
  /* the touch offset right now, in px (for the drag gate: a finger aims that far below the slot) */
  function touchLift() { return hand.on && hand.touch ? Math.round(hand.off) : 0; }
  /* the block in hand on screen: its box (for the note above it, and the card it came from) */
  function handRect() {
    const o = drag.obj && drag.obj.parent === hand.hang ? drag.obj : null;
    if (!o) return null;
    o.updateWorldMatrix(true, false);
    const u = o.userData, w = (u.w || 1) / 2, d = (u.dU || BLOCK_D) / 2, h = u.h || H_HARD;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const x of [-w, w]) for (const y of [0, h]) for (const z of [-d, d]) {
      hTmp.set(x, y, z); o.localToWorld(hTmp); scr(hTmp, sA);
      x0 = Math.min(x0, sA.x); x1 = Math.max(x1, sA.x); y0 = Math.min(y0, sA.y); y1 = Math.max(y1, sA.y);
    }
    if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }
  /* the hand lets go: the rig is left empty, ready for the next */
  function handEnd(o) {
    const H = hand;
    H.on = false; H.obj = null; H.has = false; H.aimOn = false; H.no = null; H.slotOn = false;
    if (o) o.userData.inHandRig = false;
    if (H.rig) H.hang.rotation.set(0, 0, 0);
  }
  /* a number in the hand that isn't one: its springs back to rest, level, over where it aims */
  function handHeal() {
    const H = hand;
    H.lift = { x: HAND_TUNE.lift[H.over] || HAND_TUNE.lift.week, v: 0 }; H.ext = { x: 0, v: 0 }; H.s = { x: H.sTo || 1, v: 0 }; H.seam = false;
    H.rx = { x: 1, v: 0 }; H.ry = { x: 1, v: 0 }; H.rz = { x: 1, v: 0 };
    H.roll = { x: 0, v: 0 }; H.pitch = { x: 0, v: 0 }; H.yaw = { x: 0, v: 0 }; H.trk.primed = false;
    H.pull = { x: { x: 0, v: 0 }, z: { x: 0, v: 0 } }; H.pop = null;
    H.base = { x: Number.isFinite(H.baseTo) ? H.baseTo : BOARD_Y, v: 0 };
    if (!finite3(H.floor)) { H.floor.set(0, BOARD_Y, 0); H.has = false; }
    if (H.has) handPose(0);
  }
  /* the release of a press: the squeeze springs into a stretch, height 1.04 at 60 ms, back by 160 ms */
  function popY(t) { if (t < 0.06) { const k = t / 0.06; return 0.94 + 0.1 * (1 - (1 - k) * (1 - k)); } if (t < 0.16) { const k = (t - 0.06) / 0.1; return 1.04 - 0.04 * (k * k * (3 - 2 * k)); } return 1; }
  function popXZ(t) { if (t >= 0.16) return 1; const k = t / 0.16; return 0.97 + 0.03 * (1 - (1 - k) * (1 - k)); }
  /* the hand's pose for this frame: springs, swing, and where the block hangs (dt 0: place it, no motion) */
  function handPose(dt) {
    const H = hand, o = drag.obj, T_ = HAND_TUNE;
    if (!o || o.parent !== H.hang || !H.has) return;
    const u = o.userData, calm = reduced;
    const big = H.over === 'day';
    const liftTo = H.over === 'desk' || H.over === 'bench' ? T_.lift.desk : T_.lift[H.over] || T_.lift.week;
    const hangA = (big ? T_.hang.day : T_.hang.week);
    /* the size in hand, at least 40 px deep on touch (scaled evenly, at most 2.2 times) */
    let sHand = calm ? 1 : H.touch ? T_.size.touch : T_.size.mouse;
    if (H.touch && !calm && H.pxZ > 0) sHand = Math.max(sHand, Math.min(T_.maxScale, T_.minDepthTouch / Math.max(1, H.pxZ * H.dU)));
    H.sTo = sHand;
    /* over a slot that fits it sinks a little (it wants to land); over one that doesn't it lifts away */
    const extTo = calm || H.ok == null ? 0 : H.ok ? -T_.sink * liftTo : T_.rise * liftTo;
    let dip = 0, shake = 0;
    if (dt > 0) {
      const cw = resp(T_.seamResp);
      if (calm) { H.lift.x = liftTo; H.lift.v = 0; H.ext.x = 0; H.ext.v = 0; H.s.x = 1; H.s.v = 0; H.rx.x = H.ry.x = H.rz.x = 1; }
      else {
        sway(H.lift, liftTo, resp(T_.liftResp), T_.liftZeta, dt, 0);
        sway(H.ext, extTo, resp(T_.sinkResp), T_.sinkZeta, dt, 0);
        if (H.seam) { const r = spring(H.s.x, H.s.v, sHand, cw, dt); H.s.x = r[0]; H.s.v = r[1]; if (Math.abs(H.s.x - sHand) < 0.002 && Math.abs(H.s.v) < 0.01) H.seam = false; }
        else sway(H.s, sHand, resp(T_.liftResp), T_.liftZeta, dt, 0);
        for (const k of ['rx', 'ry', 'rz']) { const r = spring(H[k].x, H[k].v, 1, cw, dt); H[k].x = r[0]; H[k].v = r[1]; }
      }
      /* the base it hangs over (the board, the bench, the desk) changes gently */
      const rb = spring(H.base.x, H.base.v, H.baseTo, 18, dt); H.base.x = rb[0]; H.base.v = rb[1];
      /* how the aim point speeds up and slows down: a smooth follower of it (critically damped, w 45) */
      const t = H.trk;
      if (!t.primed) { t.x = H.aim.x; t.y = H.aim.y; t.vx = 0; t.vy = 0; t.primed = true; }
      const vx0 = t.vx, vy0 = t.vy;
      let r = spring(t.x, t.vx, H.aim.x, T_.follow, dt); t.x = r[0]; t.vx = r[1];
      r = spring(t.y, t.vy, H.aim.y, T_.follow, dt); t.y = r[0]; t.vy = r[1];
      const inv = 1 / Math.max(dt, 1 / 240);
      const ax = Math.max(-T_.aMax, Math.min(T_.aMax, (t.vx - vx0) * inv)), ay = Math.max(-T_.aMax, Math.min(T_.aMax, (t.vy - vy0) * inv));
      if (!calm) {
        /* a pendulum about the pinch: a longer block swings slower (that's what reads as weight) */
        const f = (T_.hz0 + T_.hzK * Math.exp(-(H.dur - 15) / 60)) * (H.touch ? T_.touchHz : 1), w = 2 * Math.PI * f, ww = w * w, D = Math.PI / 180;
        const lx = Math.max(-T_.speedLeanMax, Math.min(T_.speedLeanMax, -T_.speedLean * t.vx)) * D;
        const ly = Math.max(-T_.speedLeanMax, Math.min(T_.speedLeanMax, T_.speedLean * t.vy)) * D * T_.pitchK;
        const W = u.w || 1, droop = W > 1.5 * H.dU ? T_.droop * (2 * H.u - 1) * D : 0;
        sway(H.roll, lx + droop, w, T_.zeta, dt, -ww * ax / T_.g);
        sway(H.pitch, ly, w, T_.zeta, dt, ww * T_.pitchK * ay / T_.g);
        const yawTo = Math.max(-T_.capYaw, Math.min(T_.capYaw, -(2 * H.u - 1) * T_.yawK * t.vy)) * D;
        sway(H.yaw, yawTo, 2 * Math.PI * T_.yawHz, T_.yawZeta, dt, 0);
        /* the mouse's small snap pull: slow over a slot that fits, the body eases toward its middle */
        const sp = Math.hypot(t.vx, t.vy);
        H.slow = sp < T_.pullSpeed ? H.slow + dt * 1000 : 0;
        let px = 0, pz = 0;
        if (!H.touch && H.ok && H.slotOn && H.slow >= T_.pullAfter) {
          const sv = H.s.x, bx = H.floor.x - (H.u - 0.5) * W * sv, bz = H.floor.z - (H.v - 0.5) * H.dU * sv;
          const lim = T_.pullPx / Math.max(1, H.pxX);
          px = Math.max(-lim, Math.min(lim, (H.slot.x - bx) / 2)); pz = Math.max(-lim, Math.min(lim, (H.slot.z - bz) / 2));
        }
        sway(H.pull.x, px, resp(T_.pullResp), T_.pullZeta, dt, 0); sway(H.pull.z, pz, resp(T_.pullResp), T_.pullZeta, dt, 0);
      } else { H.roll.x = H.pitch.x = H.yaw.x = 0; H.roll.v = H.pitch.v = H.yaw.v = 0; H.pull.x.x = H.pull.z.x = 0; }
      /* the lock on: a moment over a slot that fits, the outline brightens once and the shadow lines up */
      if (H.ok && !H.locked && H.okAt && nowMs() - H.okAt >= T_.lockAfter) { H.locked = true; H.lockAt = nowMs(); ghostLock(); }
      if (H.pop) { H.pop.t += dt; if (H.pop.t >= 0.16 || calm) H.pop = null; }
      /* the no: a dip toward the slot, a bump, a recoil, and a shake of the head, then home */
      if (H.no) {
        const n = H.no, tt = (n.t += dt);
        if (tt < 0.09) dip = -n.dip * Math.sin((tt / 0.09) * Math.PI / 2);
        else {
          if (!n.bumped) { n.bumped = true; feelSay('bad'); if (n.blocker) n.blocker.forEach((m) => { m.userData.knock = { t: 0, delay: 0, amp: 0.02 }; }); ghostFlash(); }
          if (!n.rec) n.rec = { x: -n.dip, v: 0 };
          sway(n.rec, T_.noRecoil, resp(0.18), 0.5, dt, 0);
          dip = n.rec.x;
        }
        if (tt > 0.12 && tt < 0.28) shake = T_.noShake * Math.PI / 180 * Math.sin(((tt - 0.12) / 0.16) * Math.PI * 2);
        if (tt >= T_.noHome / 1000 && !n.gone) { n.gone = true; const after = n.after; H.no = null; endDrag(after); return; }
      }
    }
    const R = Math.PI / 180;
    const sv = H.s.x, W = u.w || 1, h = u.h || H_HARD, d = u.dU || BLOCK_D;
    H.rig.position.set(H.floor.x, H.base.x + H.lift.x + H.ext.x + dip + (h + hangA) * sv, H.floor.z);
    H.hang.rotation.set(softCap(H.pitch.x, T_.capPitch * R), softCap(H.yaw.x, T_.capYaw * R) + shake, softCap(H.roll.x, T_.capRoll * R));
    const py = H.pop ? popY(H.pop.t) : 1, pxz = H.pop ? popXZ(H.pop.t) : 1;
    o.position.set(-(H.u - 0.5) * W * sv + H.pull.x.x, -(hangA + h) * sv, -(H.v - 0.5) * d * sv + H.pull.z.x);
    o.rotation.set(calm ? 0 : T_.tilt, 0, 0);
    o.scale.set(sv * pxz * H.rx.x, sv * py * H.ry.x, sv * pxz * H.rz.x);
    drag.target.copy(H.rig.position);
    drag.surface = H.base.x;
  }
  /* every frame, after the camera: the aim point, the floor point under it, and the pose */
  function handStep(dt) {
    const H = hand, o = drag.obj;
    if (!H.on || !o || o.parent !== H.hang) return;
    camera.updateMatrixWorld();
    handAimPoint();
    /* (saying no, it stays over where it was let go, whatever the camera does meanwhile) */
    if (!H.no && rayAt(H.aim.x, H.aim.y, H.aimY, hTmp2)) { H.floor.copy(hTmp2); H.has = true; }
    if (!H.has) return;
    handScale();
    /* the touch offset: the outline's near edge clears the fingertip by 22 px, the block above it */
    if (H.touch) { const T_ = HAND_TUNE; H.offTo = Math.max(T_.touchMin, Math.min(T_.touchMax, T_.touchClear + H.pxZ * handDepth() / 2)); }
    /* a card turning into the block: it starts as wide on screen as the card was (up to 2.2 times) */
    if (H.seam && H.seamS > 0) {
      const lenPx = Math.max(1, H.wU * H.pxX * H.sTo);
      H.s.x = H.sTo * Math.max(1, Math.min(HAND_TUNE.maxScale, H.seamS / lenPx)); H.s.v = 0;
      H.seamS = 0;
      if (reduced) { H.s.x = 1; H.seam = false; }
    }
    handDress(false);
    /* (no new objects in the frame: the last pose is kept in place) */
    const was = hWas.copy(H.rig.position), wx = H.hang.rotation.x, wy = H.hang.rotation.y, wz = H.hang.rotation.z;
    handPose(dt);
    const t = H.trk;
    if (H.rig.position.distanceToSquared(was) > 1e-8 || Math.abs(H.hang.rotation.x - wx) + Math.abs(H.hang.rotation.y - wy) + Math.abs(H.hang.rotation.z - wz) > 3e-4
      || Math.abs(H.lift.v) > 1e-3 || Math.abs(H.s.v) > 1e-3 || Math.abs(t.vx) + Math.abs(t.vy) > 0.5 || Math.abs(H.roll.v) + Math.abs(H.pitch.v) + Math.abs(H.yaw.v) > 3e-4
      || H.pop || H.no || (H.touch && H.offK < 1) || Math.abs(H.rx.x - 1) + Math.abs(H.ry.x - 1) + Math.abs(H.rz.x - 1) > 1e-3 || Math.abs(H.base.v) > 1e-3) moving = true;
  }
  /* a drop that can't land: it dips toward the slot to a quarter unit over what's in the way, bumps (the
     sound, the outline flashing red, what's in the way giving a little), recoils, shakes no, and at 280 ms
     flies home. o: { blocker: { date, key } }, then: when it's home */
  function handNo(o) {
    const H = hand;
    if (!H.on || !drag.obj) return false;
    const b = o && o.no && o.no.blocker;
    const bl = b ? blockMeshes(b.date, b.key).filter((m) => m.visible && (zoomName === 'day' && layout === 'week' ? m.userData.kind === 'dblock' : m.userData.kind === 'block')) : [];
    const top = bl.length ? Math.max(...bl.map((m) => (m.userData.h || H_HARD) * m.parent.getWorldScale(hTmp).y)) : 0;
    const now = H.base.x + H.lift.x + H.ext.x;
    H.no = { t: 0, dip: Math.max(0, now - (H.base.x + top + HAND_TUNE.noDip)), blocker: bl, after: (o && o.after) || { home: true, then: o && o.then } };
    H.ok = false;
    touch();
    return true;
  }

  /* == the landing: the block in hand falls into its slot ==
     From exactly where it hung (its place, its turn, its size, its length), under desk scale gravity (about
     110 ms), sideways into the slot as it falls, level and at its true size the moment it touches. Then the
     board's own block takes over in the same frame, with the knock, the clack, the ring of dust, and the
     neighbours' nudge (touchDown). */
  const falls = [];
  const fQ = new T.Quaternion();
  function handFall(targets, all) {
    const o = drag.obj, H = hand;
    if (!o || !H.on || o.parent !== H.hang || !targets.length) return false;
    world.attach(o);
    const m0 = targets.slice().sort((a, b) => (a.userData.segStart || 0) - (b.userData.segStart || 0))[0], u = m0.userData;
    const ps = m0.parent.getWorldScale(new T.Vector3());
    const toPos = world.worldToLocal(m0.parent.localToWorld(u.target.clone()));
    const ou = o.userData;
    const toS = new T.Vector3(((u.w || 1) * ps.x) / Math.max(0.01, ou.w || 1), ((u.h || H_HARD) * ps.y) / Math.max(0.01, ou.h || H_HARD), ((u.dU || BLOCK_D) * ps.z) / Math.max(0.01, ou.dU || BLOCK_D));
    /* (its base center falls to the slot's: the first piece of a block cut across lanes) */
    const fromPos = o.position.clone(), fromQ = o.quaternion.clone(), fromS = o.scale.clone();
    const y0 = Math.max(0, fromPos.y - toPos.y), g = HAND_TUNE.fallG * Math.max(0.3, ps.y);
    const dur = Math.max(HAND_TUNE.fallMin, Math.min(HAND_TUNE.fallMax, Math.sqrt(2 * y0 / g)));
    const swing = Math.abs(H.roll.x) + Math.abs(H.pitch.x);
    handEnd(o);
    const f = { o, targets, all, fromPos, fromQ, fromS, toPos, toS, t: 0, dur, y0, fx: null, vx: (toPos.x - fromPos.x) / dur, swing, ps: ps.x };
    all.forEach((m) => { m.userData.held = true; m.userData.heldT = 0; m.userData.handFall = f; m.visible = false; });
    falls.push(f);
    handShadow.fall = f;
    user.leanOffAt = Infinity;
    touch();
    return true;
  }
  function stepFalls(dt) {
    for (let i = falls.length - 1; i >= 0; i--) {
      const f = falls[i];
      f.t += dt; moving = true;
      const k = Math.min(1, f.t / f.dur), side = 1 - (1 - k) * (1 - k), ease = k * k * (3 - 2 * k);
      f.o.position.set(f.fromPos.x + (f.toPos.x - f.fromPos.x) * side, f.toPos.y + f.y0 * (1 - k * k), f.fromPos.z + (f.toPos.z - f.fromPos.z) * side);
      f.o.quaternion.slerpQuaternions(f.fromQ, fQ.identity(), 1 - (1 - k) * (1 - k));
      f.o.scale.lerpVectors(f.fromS, f.toS, ease);
      if (k < 1) continue;
      falls.splice(i, 1);
      dropBlock(f.o);
      if (handShadow.fall === f) { handShadow.fall = null; handShadow.fade = 0.06; }
      const view = zoomName === 'day' && layout === 'week' ? 'dblock' : 'block';
      f.all.forEach((m) => {
        const mu = m.userData;
        if (mu.handFall !== f) return;
        mu.handFall = null; mu.held = false; mu.inHand = false;
        m.visible = true; m.position.copy(mu.target); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
        if (mu.vel) mu.vel.set(0, 0, 0);
        mu.fall = null; mu.grow = null; mu.lift = 0;
      });
      const shown = f.all.filter((m) => m.userData.kind === view && m.parent && m.visible);
      const fx = f.fx || { size: null, played: false, kind: 'land', speed: Math.sqrt(2 * HAND_TUNE.fallG * f.ps * f.y0) };
      fx.speed = fx.speed || Math.sqrt(2 * HAND_TUNE.fallG * f.ps * f.y0);
      fx.swing = f.swing;
      (shown.length ? shown : f.targets).forEach((m) => touchDown(m, { fx, vx: f.vx }));
      /* the camera eases back a beat after it lands */
      user.leanOffAt = Date.now() + HAND_TUNE.leanHold;
    }
  }

  /* V11, lift and place: the block a room preview put on the board for the one in hand stays out of sight (the
     outline says where it goes): the app names it here; null lets go */
  function handMatch(mm) { if (!FEEL) return; drag.match = mm || (drag.obj && hand.b ? (hand.b.add ? { add: hand.b.add } : hand.b.tpl ? { base: hand.b.base } : null) : null); }
  /* how long until the latest block from the hand touches down (ms), for what's said 150 ms after */
  function fallMs() { let t = 0; falls.forEach((f) => { t = Math.max(t, (f.dur - f.t) * 1000); }); return Math.round(t); }
  /* V11, lift and place: a block dropped on a whole day (a day pill, a day's card) flies from where it was let
     go to the slot the day gave it, on the curve a flight home takes, then falls the last 0.9 and lands with
     the full beat. Returns false when there's nothing in hand or no slot on the board in view (the app then
     flies its card, or presses the day it went to) */
  function handFly(date, bkey) {
    const H = hand, o = drag.obj;
    if (!FEEL || reduced || !H.on || !o || o.parent !== H.hang) return false;
    const view = zoomName === 'day' && layout === 'week' ? 'dblock' : 'block';
    const all = blockMeshes(date, bkey).filter((m) => m.parent);
    const to = all.filter((m) => m.userData.kind === view);
    if (!to.length) return false;
    world.attach(o);
    const m0 = to.slice().sort((a, b) => (a.userData.segStart || 0) - (b.userData.segStart || 0))[0], u = m0.userData;
    const ps = m0.parent.getWorldScale(new T.Vector3());
    const slot = world.worldToLocal(m0.parent.localToWorld(u.target.clone()));
    const above = slot.clone(); above.y += 0.9;
    const from = o.position.clone();
    const px = screenDist(from, above), dur = Math.max(HAND_TUNE.homeMin, Math.min(HAND_TUNE.homeMax, 0.2 + 0.00018 * px));
    handEnd(o);
    const hidden = drag.hidden;
    drag.obj = null; drag.hidden = null; drag.origin = null;
    (hidden || []).forEach((x) => { if (x.userData.shrink == null && !x.userData.back && !x.userData.held) x.visible = true; });
    /* (the fall it ends in is named now, so the sound the app asks for at once rides with it, land()) */
    const f = { o, targets: to, all, fx: null, vx: 0, swing: 0, ps: ps.x, t: 0 };
    all.forEach((m) => { m.userData.held = true; m.userData.heldT = 0; m.userData.handFall = f; m.visible = false; });
    const ou = o.userData;
    const s1 = new T.Vector3(((u.w || 1) * ps.x) / Math.max(0.01, ou.w || 1), ((u.h || H_HARD) * ps.y) / Math.max(0.01, ou.h || H_HARD), ((u.dU || BLOCK_D) * ps.z) / Math.max(0.01, ou.dU || BLOCK_D));
    homes.push({ m: o, from, to: above, t: 0, dur, arc: Math.min(0.6, 0.2 + from.distanceTo(above) * 0.03), curve: homeCurve(from, above), s0: o.scale.clone(), s1, q0: o.quaternion.clone(), keep: true, done: () => {
      /* then the last bit down, as from the hand: the board's block takes over at the touch */
      world.add(o);
      const g = HAND_TUNE.fallG * Math.max(0.3, ps.y), fdur = Math.max(HAND_TUNE.fallMin, Math.min(HAND_TUNE.fallMax, Math.sqrt(2 * 0.9 / g)));
      Object.assign(f, { fromPos: o.position.clone(), fromQ: o.quaternion.clone(), fromS: o.scale.clone(), toPos: slot, toS: s1.clone(), t: 0, dur: fdur, y0: Math.max(0, o.position.y - slot.y) });
      all.forEach((m) => { m.userData.held = true; m.userData.heldT = Math.min(m.userData.heldT || 0, 0.6); m.userData.handFall = f; m.visible = false; });
      falls.push(f);
      handShadow.fall = f;
      user.leanOffAt = Infinity;
    } });
    letGo();
    showGhost(null); if (dayb.ghosts.length) showDayGhost(null);
    touch();
    return true;
  }
  /* V11, lift and place: a month card that took a block presses (1.04 to 1, 200 ms) */
  function cardPress(date) {
    if (!FEEL || reduced) return;
    const c = month.cards.find((x) => x.userData.date === date && x.visible);
    if (!c) return;
    c.userData.press = { t: 0 };
    touch();
  }
  /* == V11, lift and place: Undo plays a move backward ==
     blockWorld: where a block is on the board in view (its base center, in the world), read before a change.
     replayMove: the block at its slot now came from there: a copy lifts there, flies the curve a flight home
     takes to the slot (0.30 s), falls the last bit, and lands with the full beat (the board's block waits,
     unseen, until it touches). evaporate: a block about to leave lifts half a unit and fades away (180 ms). */
  const inViewKind = () => (zoomName === 'day' && layout === 'week' ? 'dblock' : 'block');
  function blockWorld(date, bkey) {
    const ms = blockMeshes(date, bkey).filter((m) => m.visible && m.parent && m.userData.kind === inViewKind());
    if (!ms.length) return null;
    const m = ms.sort((a, b) => (a.userData.segStart || 0) - (b.userData.segStart || 0))[0];
    return world.worldToLocal(m.getWorldPosition(new T.Vector3()));
  }
  function replayMove(date, bkey, from, size) {
    if (!FEEL || reduced || !from || !finite3(from)) return false;
    const all = blockMeshes(date, bkey).filter((m) => m.parent);
    const to = all.filter((m) => m.userData.kind === inViewKind());
    if (!to.length) return false;
    const m0 = to.slice().sort((a, b) => (a.userData.segStart || 0) - (b.userData.segStart || 0))[0], u = m0.userData;
    if (!u.block) return false;
    const ps = m0.parent.getWorldScale(new T.Vector3());
    const slot = world.worldToLocal(m0.parent.localToWorld(u.target.clone()));
    if (slot.distanceTo(from) < 0.05) return false;
    const o = makeBlock(u.block);
    o.userData.kind = u.kind; o.userData.dragging = true;
    dressBlock(o, u.block, u.wU, u.dU, u.hMul && u.hMul !== 1 ? { hMul: u.hMul } : {});
    o.scale.copy(ps); o.position.copy(from);
    world.add(o);
    const above = slot.clone(); above.y += 0.6;
    const f = { o, targets: to, all, fx: null, vx: 0, swing: 0, ps: ps.x, t: 0 };
    all.forEach((m) => { m.userData.held = true; m.userData.heldT = 0; m.userData.handFall = f; m.visible = false; });
    homes.push({ m: o, from: from.clone(), to: above, t: 0, dur: 0.3, arc: 0.6, curve: homeCurve(from, above), s0: o.scale.clone(), s1: ps.clone(), q0: o.quaternion.clone(), keep: true, done: () => {
      const g = HAND_TUNE.fallG * Math.max(0.3, ps.y), fdur = Math.max(HAND_TUNE.fallMin, Math.min(HAND_TUNE.fallMax, Math.sqrt(2 * 0.6 / g)));
      Object.assign(f, { fromPos: o.position.clone(), fromQ: o.quaternion.clone(), fromS: o.scale.clone(), toPos: slot, toS: ps.clone(), t: 0, dur: fdur, y0: Math.max(0, o.position.y - slot.y) });
      if (!f.fx) f.fx = { size, played: false, kind: 'landSoft' };
      else f.fx.kind = 'landSoft';
      all.forEach((m) => { m.userData.held = true; m.userData.heldT = Math.min(m.userData.heldT || 0, 0.6); m.userData.handFall = f; m.visible = false; });
      falls.push(f);
    } });
    touch();
    return true;
  }
  const vapors = [];
  /* a copy of a block to fade away, made by hand: three's clone copies userData through JSON, and a block's
     userData points back at itself, so clone throws (and took Undo down with it) */
  function shellOf(o) {
    const c = o.isMesh ? new T.Mesh(o.geometry, o.material) : o.isSprite ? new T.Sprite(o.material) : new T.Group();
    c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale);
    c.visible = o.visible; c.renderOrder = o.renderOrder;
    o.children.forEach((k) => { if (k.visible && (k.isMesh || k.isSprite || k.isGroup)) c.add(shellOf(k)); });
    return c;
  }
  function evaporate(date, bkey) {
    if (!FEEL || reduced) return false;
    const ms = blockMeshes(date, bkey).filter((m) => m.visible && m.parent && m.userData.kind === inViewKind());
    if (!ms.length) return false;
    ms.forEach((m) => {
      const c = shellOf(m);
      c.traverse((x) => { if (x.isMesh && x.material) { x.material = Array.isArray(x.material) ? x.material.map((q) => { const k = q.clone(); k.transparent = true; return k; }) : Object.assign(x.material.clone(), { transparent: true }); x.castShadow = false; } });
      const wp = m.getWorldPosition(new T.Vector3()), ws = m.getWorldScale(new T.Vector3());
      c.position.copy(world.worldToLocal(wp)); c.scale.copy(ws); c.rotation.set(0, 0, 0);
      c.userData = { t: 0, y0: c.position.y, s0: ws.clone() };
      world.add(c);
      vapors.push(c);
      m.visible = false; m.userData.gone = true;
    });
    touch();
    return true;
  }
  function stepVapors(dt) {
    for (let i = vapors.length - 1; i >= 0; i--) {
      const c = vapors[i], u = c.userData, k = Math.min(1, (u.t += dt) / 0.18), e = 1 - (1 - k) * (1 - k);
      moving = true;
      c.position.y = u.y0 + 0.5 * e;
      c.scale.copy(u.s0).multiplyScalar(1 - 0.15 * e);
      c.traverse((x) => { if (x.isMesh && x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach((q) => { q.opacity = (q.userData.op0 == null ? (q.userData.op0 = q.opacity) : q.userData.op0) * (1 - k); }); });
      if (k >= 1) { vapors.splice(i, 1); world.remove(c); c.traverse((x) => { if (x.isMesh && x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach((q) => q.dispose()); }); }
    }
  }
  /* == one soft shadow under the block in hand ==
     A rounded patch on the tallest top under its footprint (the board, open time, or a block), offset along
     the key light by half the true offset, wider and fainter the higher it hangs, tightening as it falls,
     then handing over to the block's own shadow at contact. The block in hand casts no shadow of its own. */
  const handShadow = { mesh: null, fall: null, fade: 0, op: 0, topAt: null, top: BOARD_Y, overPrint: false };
  function handShadowReset() { handShadow.op = 0; handShadow.fade = 0; handShadow.topAt = null; }
  /* (the patch fills its square: its soft edge falls inside the size it's given) */
  function shadowTex() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const g = cv.getContext('2d');
    g.filter = 'blur(10px)';
    g.fillStyle = 'rgba(46, 26, 10, 1)';
    rr(g, 22, 22, 256 - 44, 128 - 44, 22); g.fill();
    return canvasTex(cv);
  }
  /* (made while the desk loads, hidden, its texture sent and its program built, so the first carry doesn't
     pay for them in the frame the card turns into the block: on a phone that frame ran about 48 ms. The
     picked glow, the outline, and the dust ring share the program) */
  function warmHand() {
    if (!FEEL || !hand.use || handShadow.mesh || !renderer || !scene) return;
    const S = handShadow;
    S.mesh = new T.Mesh(haloGeo, new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    S.mesh.renderOrder = 2; S.mesh.visible = false;
    world.add(S.mesh);
    try { renderer.initTexture(S.mesh.material.map); renderer.compile(S.mesh, camera, scene); } catch (e) { /* the first carry builds it then */ }
  }
  /* the tallest top under a footprint (x0..x1 along a row or lane, at z), in the world; and whether it's print */
  function topUnder(cx, cz, hw, hd) {
    let top = null, print = false;
    const look = (list) => list.forEach((m) => {
      const u = m.userData;
      if (!m.visible || u.shrink != null || u.held || u.inHand || u.dragging || !m.parent) return;
      const b = u.orig || u.block;
      if (b && b.free) return;
      m.getWorldPosition(hTmp);
      const s = m.parent.getWorldScale(hTmp3);
      const w = (u.w || 1) * s.x / 2, d = (u.dU || BLOCK_D) * s.z / 2;
      if (Math.abs(hTmp.x - cx) > w + hw || Math.abs(hTmp.z - cz) > d + hd) return;
      const t = hTmp.y + (u.h || H_HARD) * s.y;
      if (top == null || t > top) { top = t; print = !(b && b.soft); }
    });
    if (zoomName === 'day' && layout === 'week') look(dayb.blocks); else if (week.group.userData.shown) look(week.blocks);
    return { top, print };
  }
  function stepHandShadow(dt) {
    const S = handShadow;
    const live = hand.on && drag.obj && drag.obj.parent === hand.hang && hand.has;
    const f = S.fall;
    if (!live && !f && S.fade <= 0) { if (S.mesh) S.mesh.visible = false; return; }
    if (!S.mesh) {
      S.mesh = new T.Mesh(haloGeo, new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
      S.mesh.renderOrder = 2;
      world.add(S.mesh);
    }
    const o = f ? f.o : live ? drag.obj : null;
    if (!o) {
      S.fade -= dt; moving = true;
      S.mesh.material.opacity = Math.max(0, S.op * S.fade / 0.06);
      if (S.fade <= 0) S.mesh.visible = false;
      return;
    }
    const u = o.userData;
    o.updateWorldMatrix(true, false);
    const ws = o.getWorldScale(hTmp3), W = (u.w || 1) * ws.x, D = (u.dU || BLOCK_D) * ws.z;
    hTmp.set(0, 0, 0); o.localToWorld(hTmp);
    const cx = hTmp.x, cz = hTmp.z, bottom = hTmp.y;
    /* (the tallest top under it, looked up when it has moved a little) */
    if (!S.topAt || Math.abs(S.topAt.x - cx) + Math.abs(S.topAt.z - cz) > 0.05 || f) {
      const r = topUnder(cx, cz, W / 2, D / 2);
      S.top = r.top == null ? (f ? f.toPos.y : hand.base.x) : r.top; S.overPrint = r.print;
      S.topAt = { x: cx, z: cz };
    }
    const top = f ? Math.min(S.top, bottom) : S.top;
    const hh = Math.max(0, bottom - top);
    const liftTo = HAND_TUNE.lift[hand.over] || HAND_TUNE.lift.week;
    const k = Math.min(1, hh / Math.max(0.3, liftTo));
    /* along the key light: half the true offset, at most 0.6; 30 percent once it's locked on */
    const L = sun ? hTmp2.copy(sun.position).sub(sun.target.position) : hTmp2.set(-4, 22, -5);
    const horiz = Math.hypot(L.x, L.z) || 1, tanE = Math.max(0.5, L.y / horiz);
    let off = Math.min(0.6, (hh / tanE) * 0.5);
    if (hand.locked && !f) off *= 0.3;
    const ox = (-L.x / horiz) * off, oz = (-L.z / horiz) * off;
    const grow = f ? 1 + 0.3 * hh : 1 + 0.3 * hh;
    S.mesh.visible = true;
    S.mesh.position.set(cx + ox, top + 0.004, cz + oz);
    S.mesh.rotation.y = hand.on ? hand.hang.rotation.y : 0;
    S.mesh.scale.set((W + (f ? 0.15 + 0.15 * k : 0.3)) * grow, 1, (D + (f ? 0.15 + 0.15 * k : 0.3)) * grow);
    let op = 0.45 - 0.25 * k;
    if (S.overPrint) op = Math.min(op, 0.35);
    /* (calmer motion: it fades in over 100 ms instead of growing with the lift) */
    S.op += (op - S.op) * Math.min(1, dt / (reduced ? 0.1 : 0.06));
    S.mesh.material.opacity = S.op * lightK();
    S.fade = 0.06;
    moving = moving || Math.abs(op - S.op) > 0.004;
  }
  /* graphics on the desk dim with the light at night, as the wood does */
  const lightK = () => (light && Number.isFinite(light.level) ? Math.min(1, Math.max(0.6, light.level * (0.75 + 0.25 * (Number.isFinite(light.dim) ? light.dim : 1)))) : 1);

  /* == the landing outline, alive ==
     It sits on top of whatever its slot overlaps, glides on (0.12 s, 0.9), fades in the first time, brightens
     once when the hand locks on, flashes red when a drop bumps what's in the way, and dims at night */
  function ghostLive(g) {
    const add = new T.Mesh(g.geometry, new T.MeshBasicMaterial({ color: '#28160A', transparent: true, opacity: 0, depthWrite: false }));
    add.renderOrder = 4; add.visible = false;
    g.add(add);
    g.userData.add = add;
    g.renderOrder = 4;
  }
  /* the tallest top a slot overlaps on a board (blocks being pushed included), above the board, in its units */
  function ghostTop(map, inRow, x0, x1) {
    let top = 0;
    map.forEach((m) => {
      const u = m.userData;
      if (!m.visible || u.shrink != null || u.held || u.inHand || !inRow(u)) return;
      const b = u.orig || u.block;
      if (b && b.free) return;
      const w = (u.w || 1) / 2, x = m.position.x;
      if (x + w <= x0 + 0.02 || x - w >= x1 - 0.02) return;
      top = Math.max(top, (u.h || H_HARD) * (m.scale.y || 1) + Math.max(0, m.position.y - u.target.y));
    });
    return top;
  }
  const ghostsLive = () => [drag.ghost].concat(dayb.ghosts).filter((g) => g && g.visible && g.userData.on);
  function ghostLock() { ghostsLive().forEach((g) => { g.userData.lock = { t: 0 }; }); touch(); }
  function ghostFlash() { ghostsLive().concat(dayb.ghosts.filter((g) => g && g.visible)).forEach((g) => { g.userData.flash = { t: 0 }; g.userData.on = true; }); touch(); }

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
  function squash(date, bkey, amp) {
    /* V11, lift and place: amp, a settle of that size only (a stretch let go: 0.03), with no dust or knock */
    if (FEEL && amp) { if (!reduced) blockMeshes(date, bkey).forEach((m) => { if (m.visible) m.userData.sq = { t: 0, amp, dur: 0.16 }; }); return; }
    /* feel: a landing, with its knock, its dust, and no sound of its own (whoever asked plays one) */
    if (FEEL) { land(date, bkey, null); return; }
    blockMeshes(date, bkey).forEach((m) => {
      if (!m.visible) return;
      m.userData.squash = 1;
      puff(m.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.1, (m.userData.dU || BLOCK_D) * 0.4)), 6);
    });
  }
  /* Place a moved block's meshes where it was dropped, so they ease from there instead of their old spot.
     feel: only on the board it was dropped on, and from there it falls the last bit and lands */
  function adoptPosition(date, bkey) {
    if (!drag.obj) return;
    /* V11, lift and place: the block in the hand falls into its slot from exactly where it hung (its place,
       its turn, its size, and its length), and the board's own block takes over at the touch (handFall) */
    if (FEEL && drag.hand && drag.hand.on && drag.obj.parent === drag.hand.hang && !reduced) {
      const all = blockMeshes(date, bkey).filter((m) => m.parent);
      const view = zoomName === 'day' && layout === 'week' ? 'dblock' : 'block';
      let to = all.filter((m) => m.userData.kind === view);
      if (!to.length && view === 'dblock') to = all.filter((m) => m.userData.kind === 'block' && week.group.userData.shown);
      if (to.length && handFall(to, all)) { drag.obj = null; return; }
    }
    /* (calmer motion: no fall, it's placed: in its slot at once) */
    if (FEEL && reduced && drag.hand && drag.hand.on) {
      blockMeshes(date, bkey).forEach((m) => { const u = m.userData; m.position.copy(u.target); m.visible = true; m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); u.fall = null; u.grow = null; u.wave = null; u.inHand = false; tileMotions.delete(m); });
      return;
    }
    const wp = drag.obj.getWorldPosition(new T.Vector3());
    /* (V11: a hand whose place isn't a number hands nothing over; the block lands from its own slot) */
    if (FEEL && !finite3(wp)) { noteRepair('the block in hand as it was let go'); return; }
    let ms = blockMeshes(date, bkey);
    if (FEEL) ms = ms.filter((m) => (zoomName === 'day' && layout === 'week' ? m.userData.kind === 'dblock' : m.userData.kind === 'block'));
    ms.forEach((m) => {
      m.position.copy(m.parent.worldToLocal(wp.clone())); m.visible = true;
      m.userData.fly = null; m.userData.wave = null; m.userData.tileShown = true;
      m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); tileMotions.delete(m);
      if (!FEEL || reduced) return;
      const u = m.userData, s = m.parent.getWorldScale(new T.Vector3()).x || 1;
      if (!u.vel) u.vel = new T.Vector3();
      if (finite3(drag.vel) && Number.isFinite(s) && s > 0) u.vel.copy(drag.vel).multiplyScalar(1 / s); else u.vel.set(0, 0, 0);
      u.grow = null; u.newTile = false; u.held = false;
      /* (V11: the motion it lands with starts from numbers: its dip, grip, and glow included) */
      if (!Number.isFinite(u.pressK)) u.pressK = 0;
      if (!Number.isFinite(u.gripK)) u.gripK = 0;
      if (!Number.isFinite(u.haloK)) u.haloK = 0;
      const y0 = Math.max(0, m.position.y - u.target.y) || 0, far = Math.hypot(m.position.x - u.target.x, m.position.z - u.target.z) || 0;
      /* a short fall from the height it was carried at, a little longer when it's still some way off its slot */
      u.fall = { t: 0, delay: 0, dur: Math.max(0.09, Math.min(0.15, 0.07 + 0.06 * Math.sqrt(y0)), Math.min(0.22, 0.05 + far * 0.06)), y0, fx: null };
    });
  }
  /* V11: is a block that was set down drawn? false when the board has it and none of its pieces shows (hidden,
     held back, still marked as in hand, a number that isn't one, flat), true when one does, null when this
     board doesn't have it (another week, another zoom) */
  function blockShown(date, bkey) {
    if (!FEEL) return null;
    const ms = blockMeshes(date, bkey).filter((m) => m.parent && (zoomName === 'day' && layout === 'week' ? m.userData.kind === 'dblock' : m.userData.kind === 'block'));
    if (!ms.length) return null;
    /* (V11, lift and place: one still flying or falling to its slot, from the hand or an Undo, isn't judged yet) */
    if (ms.some((m) => m.userData.held && m.userData.handFall && (m.userData.heldT || 0) < 1.4)) return 'flying';
    return ms.some((m) => m.visible && !m.userData.held && !m.userData.inHand && blockFinite(m) && m.scale.y > 0.5);
  }
  /* V11: and drawn again: shown at rest, nothing holding it back. o.stale: nothing is in the app's hand, so a
     block the desk still thinks is carried is put away */
  function showBlock(date, bkey, o) {
    if (!FEEL) return;
    if (o && o.stale && (drag.obj || drag.match)) endDrag();
    blockMeshes(date, bkey).forEach((m) => {
      const u = m.userData;
      u.held = false; u.inHand = false;
      if (!blockFinite(m) || m.scale.y <= 0.5) restBlock(m);
      m.visible = true;
    });
  }
  /* V11, lift and place: a block's right end on screen (the middle of its last piece's end, on its top), for the
     handle a finger stretches it by */
  function blockEnd(date, bkey) {
    const ms = blockMeshes(date, bkey).filter((m) => m.visible && m.parent && (zoomName === 'day' && layout === 'week' ? m.userData.kind === 'dblock' : m.userData.kind === 'block'));
    if (!ms.length) return null;
    const m = ms.sort((a, b) => (b.userData.segStart || 0) - (a.userData.segStart || 0))[0], u = m.userData;
    m.updateWorldMatrix(true, false);
    return toScreen(m.localToWorld(new T.Vector3((u.w || 1) / 2, u.h || H_HARD, 0)), scene);
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
    /* (V11, lift and place: the shadow in hand, ready before the first carry) */
    setTimeout(warmHand, 900);
    return { renderer, scene, camera, world };
  }
  function fit() {
    canvasBox = null;
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
  /* V11: how near a block's end counts as its stretch edge, in board units: a fixed share of a unit for a
     mouse (base); for a finger (o.edgePx), that many pixels on screen, but never more than a third of the
     block (wU), so a short block still moves when it's held in the middle. at is a point on the board in
     group's own units, where the edge is measured */
  function edgeU(group, at, base, wU, o) {
    if (!FEEL || ((!o || !o.edgePx) && !hand.use)) return base;
    const a = group.localToWorld(at.clone()).project(camera), b = group.localToWorld(at.clone().setX(at.x + 1)).project(camera);
    const pxU = Math.abs(b.x - a.x) / 2 * renderer.domElement.getBoundingClientRect().width;
    if (!(pxU > 0) || !Number.isFinite(pxU)) return base;
    /* V11, lift and place: a mouse's stretch edge is 22 px on screen, but never more than a quarter of the
       block (a 30 minute block held in the middle moves) */
    if (!o || !o.edgePx) return Math.min(22 / pxU, wU / 4);
    return Math.max(base, Math.min(o.edgePx / pxU, wU / 3));
  }
  /* V11: a finger right past a block's end, on open board: the block whose end is within edgePx to the left
     of the point, on the same row or lane, as a pick of that block's stretch edge (null when there's none) */
  function edgeAt(px, py, edgePx) {
    if (!FEEL || !(edgePx > 0)) return null;
    const o = { edgePx };
    if (layout === 'week' && zoomName === 'day') {
      const d = dayAt(px, py);
      if (!d || d.lane == null || !Number.isFinite(d.x)) return null;
      let best = null;
      dayb.blocks.forEach((m) => {
        const u = m.userData;
        if (!live(m) || u.fly || u.lane !== d.lane || !u.last || !u.orig || u.orig.dur < 30 || u.orig.free) return;
        const end = dayX(u.lane, u.segEnd), gap = d.x - end;
        if (gap < 0 || gap > edgeU(dayb.group, new T.Vector3(end, BOARD_Y, laneZ(u.lane)), 0, 1e9, o)) return;
        if (!best || gap < best.gap) best = { gap, m, u };
      });
      if (!best) return null;
      const u = best.u;
      return Object.assign({ kind: 'block', board: 'day', obj: best.m, date: u.date, displayDate: u.date, key: u.bkey, block: u.orig, min: LANES[u.lane].from + (d.x - LX0) / DU * 60, nearR: true, nearL: false, outside: true }, sourceOf(u.orig, u.date));
    }
    if (layout !== 'week' || !week.group.userData.shown) return null;
    const p = boardAt(px, py);
    if (!p || p.row == null || !Number.isFinite(p.x)) return null;
    let best = null;
    week.blocks.forEach((m) => {
      const u = m.userData, b = u.block;
      if (!live(m) || u.row !== p.row || !b || b.dur < 30 || b.free) return;
      const end = xOf(b.start + b.dur), gap = p.x - end;
      if (gap < 0 || gap > edgeU(week.group, new T.Vector3(end, BOARD_Y, rowZ(u.row)), 0, 1e9, o)) return;
      if (!best || gap < best.gap) best = { gap, m, u };
    });
    if (!best) return null;
    const u = best.u;
    return Object.assign({ kind: 'block', board: 'week', obj: best.m, date: u.date, displayDate: u.date, row: u.row, key: u.bkey, block: u.block, x: p.x, min: minOf(p.x), nearR: true, nearL: false, outside: true }, sourceOf(u.block, u.date));
  }
  /* V11, lift and place: the brick a finger meant: the nearest one it could move (placed, or a routine that
     slides) whose top is within tol px of the point on screen, and the point on its top nearest the finger */
  function nearBrick(px, py, tol, dayOn) {
    const r = canvasRect();
    let best = null;
    const pts = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()], q = { x: 0, y: 0 };
    const look = (m) => {
      const u = m.userData, b = u.orig || u.block;
      if (!live(m) || u.fly || !b || b.free || b.sleep || b.fixed || b.soft || !(b.add || b.tpl) || !m.parent) return;
      const w = (u.w || 1) / 2, d = (u.dU || BLOCK_D) / 2, h = (u.h || H_HARD);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      pts[0].set(-w, h, -d); pts[1].set(w, h, -d); pts[2].set(-w, h, d); pts[3].set(w, h, d);
      for (const p of pts) { m.localToWorld(p); scr(p, q); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      const dx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0, dy = py < y0 ? y0 - py : py > y1 ? py - y1 : 0, dist = Math.hypot(dx, dy);
      if (dist > tol || (best && dist >= best.dist)) return;
      /* the point on its top: the finger's ray on the top's plane, held inside the brick */
      const top = m.localToWorld(new T.Vector3(0, h, 0));
      const at = rayAt(px, py, top.y, new T.Vector3()) || top;
      const local = m.worldToLocal(at.clone());
      local.x = Math.max(-w + 0.01, Math.min(w - 0.01, local.x)); local.z = Math.max(-d + 0.01, Math.min(d - 0.01, local.z)); local.y = h;
      best = { m, dist, point: m.localToWorld(local) };
    };
    if (dayOn) dayb.blocks.forEach(look); else if (week.group.userData.shown && r.width) week.blocks.forEach(look);
    return best;
  }
  /* What's under the pointer: a block (on the week or the day), a day tab, a bench piece, a month card, or a year card.
     opt (V11): edgePx, the size of a stretch edge on screen for a finger (edgeU) */
  function pick(px, py, opt) {
    setNdc(px, py);
    let list = [];
    const dayOn = layout === 'week' && zoomName === 'day';
    if (layout === 'week') {
      if (dayOn) dayb.blocks.forEach((m) => { if (live(m) && !m.userData.fly) list.push(m); });
      if (week.group.userData.shown) { week.blocks.forEach((m) => { if (live(m)) list.push(m); }); week.rows.forEach((r) => list.push(r.userData.tabFace)); }
      if (bench.group.userData.shown) bench.pieces.forEach((m) => { if (live(m)) list.push(m); });
      if (kinds.on) kinds.cards.forEach((c) => { if (c.userData.pickable && c.visible && !c.userData.pop) list.push(c); });
    } else if (layout === 'month') list = month.cards.filter((c) => c.userData.present && live(c));
    else list = year.cards.filter(live);
    [lampRig.body, pad.obj].concat(thingLights.map((t) => t.owner), propList.filter((p) => p.obj && p.obj.userData.pickKind === 'clock').map((p) => p.obj)).forEach((o) => { if (o && o.visible && o.scale.x > 0.5) list.push(o); });
    const hits = ray.intersectObjects(list, true);
    /* V11, lift and place: a finger that misses takes the nearest brick it can move within 20 px on screen
       (a quarter hour is a few pixels on the week); opt.touch */
    let nearBody = null;
    if (FEEL && hand.use && opt && opt.touch && !hits.some((h) => { const o = owner(h.object); return o && (o.userData.kind === 'block' || o.userData.kind === 'dblock' || o.userData.kind === 'bench'); })) {
      const near = nearBrick(px, py, 20, dayOn);
      if (near) { nearBody = near.m.userData.body; hits.unshift({ object: nearBody, point: near.point }); }
    }
    for (const h of hits) {
      const o = owner(h.object);
      if (!o || (o.userData.halo && h.object === o.userData.halo)) continue;
      const u = o.userData;
      if (u.pickKind) return { kind: u.pickKind, obj: o };
      if (u.kind === 'bench') return { kind: 'bench', obj: o, piece: u.piece };
      if (u.kind === 'kindcard') return { kind: 'kindcard', obj: o, id: u.id };
      if (u.kind === 'dblock') {
        const local = dayb.group.worldToLocal(h.point.clone());
        const min = LANES[u.lane].from + (local.x - LX0) / DU * 60;
        const ez = edgeU(dayb.group, new T.Vector3(local.x, BOARD_Y, laneZ(u.lane)), 0.32, dayX(u.lane, u.segEnd) - dayX(u.lane, u.segStart), opt);
        /* (near: the finger missed and this is the brick it was forgiven onto; a tap there is a tap on what's under it) */
        return Object.assign({ kind: 'block', board: 'day', obj: o, date: u.date, displayDate: u.date, key: u.bkey, block: u.orig, min, nearR: u.last && dayX(u.lane, u.segEnd) - local.x < ez && u.orig.dur >= 30, nearL: u.first && local.x - dayX(u.lane, u.segStart) < ez, near: !!nearBody && h.object === nearBody }, sourceOf(u.orig, u.date));
      }
      if (u.kind === 'block') {
        if (dayOn) return { kind: 'miniRow', obj: o, row: u.row, date: u.date };
        const local = week.group.worldToLocal(h.point.clone());
        const right = xOf(u.block.start + u.block.dur), left = xOf(u.block.start);
        const ez = edgeU(week.group, new T.Vector3(local.x, BOARD_Y, rowZ(u.row)), 0.22, right - left, opt);
        return Object.assign({ kind: 'block', board: 'week', obj: o, date: u.date, displayDate: u.date, row: u.row, key: u.bkey, block: u.block, x: local.x, min: minOf(local.x), nearR: right - local.x < ez && u.block.dur >= 30, nearL: local.x - left < ez, near: !!nearBody && h.object === nearBody }, sourceOf(u.block, u.date));
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
  /* where things are on screen, for a coach that points at the board: a minute on a week row or the day,
     and a piece on the bench by its key (or the first whose label matches) */
  function projectWorld(w) {
    const p = w.clone().project(camera), r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height, behind: p.z > 1 };
  }
  function slotScreen(where, row, min) { return projectWorld(slotWorld(where, row, min)); }
  function pieceScreen(match) {
    let hit = null;
    bench.pieces.forEach((m, key) => { if (hit || m.userData.shrink != null || !m.visible) return; const it = m.userData.piece || {}; if (key === match || it.label === match || (it.id && it.id === match)) hit = m; });
    if (!hit) return null;
    const v = new T.Vector3(); hit.getWorldPosition(v);
    return projectWorld(v);
  }
  function kindCardScreen(id) {
    const c = kinds.cards.find((x) => x.userData.id === id && x.visible);
    return c ? projectWorld(c.getWorldPosition(new T.Vector3())) : null;
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
    /* (V11: a minute that isn't a number is the start of the day, so nothing aimed from here is NaN) */
    if (FEEL && !Number.isFinite(min)) min = RAIL0;
    if (FEEL && where !== 'day' && !Number.isFinite(row)) row = 3;
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
    startDrag, dragTo, showGhost, endDrag, squash, adoptPosition, puff, zoomTo, panBy, resetView, focusOn, lean, setMotion, refreshFaces, setFocus, setPropsAway, setAway,
    press, land, holdBack, weekSet, direct, leanAmount, setKinds, benchCarry, showBlock, handAim, handPreset, handMatch, handFly, cardPress, holdInsets, replayMove, evaporate,
    setLamp, setLight, setNotepad, setDayOnly, setAlone, setTheme, setDesk, setClock24, setQuality, wake, setTight, setHours };
  Object.keys(changes).forEach((k) => { const fn = changes[k]; changes[k] = function () { touch(); return fn.apply(null, arguments); }; });
  root.World = {
    init, render, step, parallax, touch, setWeekStart, setDayShape,
    pick, edgeAt, blockShown, blockEnd, blockWorld, boardAt, dayAt, slotWorld, slotScreen, pieceScreen, kindCardScreen, get kindsOn() { return kinds.on; }, toScreen, propScreen, cardWorld, ycardWorld, rowWorld, setHover, selAnchor, LANES, laneOf, blockAnchor,
    /* V11, lift and place: the hand. handPoint: the aim point the slot is worked out from; handRect: the block in
       hand on screen; touchLift: the touch offset now (px); hand: its state, for the drag gate and Dev */
    handPoint, handRect, touchLift, get handOn() { return hand.on; }, get handPresetName() { return handPresetName; }, get fallMs() { return fallMs(); },
    get camSum() { return camera ? camera.position.x * 1.37 + camera.position.y * 7.11 + camera.position.z * 13.3 + camera.quaternion.x * 101 + camera.quaternion.y * 211 + camera.zoom : 0; },
    get hand() { const H = hand, D = 180 / Math.PI; return { on: H.on, over: H.over, touch: H.touch, u: H.u, v: H.v, aim: { x: Math.round(H.aim.x), y: Math.round(H.aim.y) }, raw: { x: Math.round(H.raw.x), y: Math.round(H.raw.y) }, off: +H.off.toFixed(1), offTo: +H.offTo.toFixed(1), lift: +H.lift.x.toFixed(3), s: +H.s.x.toFixed(3), roll: +(H.roll.x * D).toFixed(2), pitch: +(H.pitch.x * D).toFixed(2), yaw: +(H.yaw.x * D).toFixed(2), ok: H.ok, locked: H.locked, floor: H.has ? [+H.floor.x.toFixed(3), +H.floor.y.toFixed(3), +H.floor.z.toFixed(3)] : null, falls: falls.length, lean: +user.lean.toFixed(3), leanZ: +(user.leanZ || 1).toFixed(4), pxX: +H.pxX.toFixed(1), pxZ: +H.pxZ.toFixed(1), wU: H.wU, face: H.face, preset: handPresetName }; },
    /* true when nothing on the desk is moving and nothing changed lately: the frame can be skipped.
       lazy: only something slow is moving (steam), so a few frames a second are plenty */
    get idle() { return stillFrames > 12; }, get lazy() { return lazyOnly && !moving && nowMs() >= activeUntil; },
    /* the light on the work right now, for the readability check */
    get light() { return { level: light.level, night: light.night, dim: light.dim, steady: light.steady, lamp: lampRig.on, accent: lampRig.spot ? lampRig.spot.intensity : 0 }; },
    get framed() { return framed(); }, get quality() { return quality; },
    /* a block's face color and label ink, the same as on the desk, for flat views like the phone's Today */
    look: (b) => { const lk = look(b); return { base: lk.base, ink: lk.ink }; },
    /* the desk's own surfaces as pictures (board wood, groove, leather), so a page drawn over the desk can wear them */
    surface: (k) => {
      const t = k === 'board' ? boardMat.map : k === 'groove' ? trackMat.map : k === 'leather' ? deskMat.mesh && deskMat.mesh.material.map : k === 'desk' ? deskTop && deskTop.material.map : null;
      const img = t && t.image;
      try { return img && img.toDataURL ? img.toDataURL('image/jpeg', 0.86) : null; } catch (e) { return null; }
    },
    set onWeekLand(fn) { week.onLand = fn; },
    /* feel: told when a block touches down ('land', with its size), comes home ('home'), a dealt piece lands
       ('tap'), or a day clicks into place ('roll') */
    set onFeel(fn) { feelHook = fn; }, get feel() { return FEEL; },
    get userZoom() { return user.zoomTo; }, get focused() { return !!focus.pt; },
    xOf, minOf, rowZ, BOARD_Y, BLOCK_D, H_HARD, DB_HMUL,
    get layout() { return layout; }, get camera() { return camera; }, get busy() { return pops.length > 0 || tileMotions.size > 0; },
    get debug() { return { week, month, year, dayb, bench, pops, cam, camTo, holds, TF, WEEK_BOX, DAY_BOX, motion: { direction: navigationDirection, active: tileMotions.size }, repairs: { count: repairs.count, list: repairs.list.slice() }, hand, handShadow, falls, vapors, drag, user }; },
    get hours() { return { start: RAIL0, end: RAIL1 }; },
    get benchOn() { return benchOn; },
    /* V11: the bench's close framing, for checking by hand: wanted, how close, where it is now, in hand */
    get benchView() { const b = benchCam; return { want: b.want, s: +b.s.toFixed(3), z: +b.z.toFixed(3), zTo: +b.zTo.toFixed(3), carry: b.carry, back: !!b.back, at: [+b.at.x.toFixed(2), +b.at.z.toFixed(2)], pan: [+b.pan.x.toFixed(2), +b.pan.z.toFixed(2)] }; },
    get stats() { return renderer ? { geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls } : null; },
    get props() { return { mode: propMode, cost: propCost, list: propList.map((p) => ({ id: p.id, side: p.side, to: p.to, keep: p.keep, rides: !!p.rides, foot: [p.foot0.x0, p.foot0.z0, p.foot0.x1, p.foot0.z1].map((v) => +v.toFixed(1)), tall: +tallOf(p).toFixed(1), k: +p.k.toFixed(2), dropped: !!p.dropped, seen: p.seenR, box: p.box && [p.box.min.x, p.box.min.z, p.box.max.x, p.box.max.z].map((v) => +v.toFixed(1)), tf: TF[p.side === 'L' ? 'propsL' : 'propsR'].x })) }; }
  };
  Object.assign(root.World, changes);
})(typeof window !== 'undefined' ? window : globalThis);
