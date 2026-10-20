// The contrast checker's engine: measure one screen as it is drawn, and judge what's on it.
// For each state: the page lists what has to be read or seen (lib/contrast-probe.js), every word on the
// page goes transparent for one screenshot, and what's behind each word is read from those pixels. A word's
// color is its CSS color with its own alpha and every ancestor's opacity, laid over that background, so a
// gradient, the 3D desk, glass, or a fade is measured as the eye gets it. Lists that scroll are walked a
// screen at a time. Focus rings are read with focus forced on through DevTools (no focus handler runs).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './png.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROBE = readFileSync(join(HERE, 'contrast-probe.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* WCAG 2.2: relative luminance of an sRGB color, and the ratio between two */
export const lum = (c) => {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
export const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/* a color with alpha k laid over an opaque one */
export const over = (fg, k, bg) => [0, 1, 2].map((i) => bg[i] + k * (fg[i] - bg[i]));
export const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const median = (cols) => {
  if (!cols.length) return null;
  return [0, 1, 2].map((i) => { const v = cols.map((c) => c[i]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; });
};
const r2 = (v) => Math.round(v * 100) / 100;

/* the pixels of a screenshot, read at CSS pixels */
function pixels(img, dpr) {
  const at = (x, y) => {
    const X = Math.max(0, Math.min(img.width - 1, Math.floor(x * dpr))), Y = Math.max(0, Math.min(img.height - 1, Math.floor(y * dpr)));
    const o = (Y * img.width + X) * 4;
    return [img.data[o], img.data[o + 1], img.data[o + 2]];
  };
  /* every device pixel in a box, thinned so a big box gives about n */
  const area = (x, y, w, h, n = 700) => {
    const out = [];
    const X0 = Math.max(0, Math.floor(x * dpr)), Y0 = Math.max(0, Math.floor(y * dpr));
    const X1 = Math.min(img.width, Math.ceil((x + w) * dpr)), Y1 = Math.min(img.height, Math.ceil((y + h) * dpr));
    const step = Math.max(1, Math.floor(Math.sqrt(((X1 - X0) * (Y1 - Y0)) / n)));
    for (let Y = Y0; Y < Y1; Y += step) for (let X = X0; X < X1; X += step) { const o = (Y * img.width + X) * 4; out.push([img.data[o], img.data[o + 1], img.data[o + 2]]); }
    return out;
  };
  return { at, area };
}

/* the colors around a box: just outside each side's middle third, a line just inside its edge, and inside */
function around(px, [x, y, w, h], radius = 0) {
  const outside = [], edge = [], inside = [];
  const k = Math.min(radius, Math.min(w, h) / 2);
  for (let t = 0.34; t <= 0.66; t += 0.04) {
    const X = x + w * t, Y = y + h * t;
    outside.push(px.at(X, y - 3.5), px.at(X, y + h + 3.5), px.at(x - 3.5, Y), px.at(x + w + 3.5, Y));
    /* (an edge is sampled at a few depths, since a 1 px border at a fractional position can fall between pixels, and
       the browser snaps it to whole pixels, which can put it right on the box's line: the meal board's day card at
       the open Duo, x 344.125, drew its top and right edges there) */
    for (const d of [0, 0.5, 1, 1.5, 2.2]) edge.push([px.at(X, y + d), px.at(X, y + h - d), px.at(x + d, Y), px.at(x + w - d, Y)]);
  }
  const ix = x + Math.max(3, k * 0.6), iy = y + Math.max(3, k * 0.6), iw = w - 2 * Math.max(3, k * 0.6), ih = h - 2 * Math.max(3, k * 0.6);
  if (iw > 1 && ih > 1) inside.push(...px.area(ix, iy, iw, ih, 200));
  return { outside: median(outside), inside: median(inside), edges: edge };
}

/* judge what the page listed, against the screenshot with its words hidden */
export function judge(list, img) {
  const px = pixels(img, list.dpr);
  const lit = img.lit ? pixels(img.lit, list.dpr) : null;
  /* how much of a box the spotlight's dim lies over (the picture with the dim and the one without differ there) */
  const dimmed = (boxes) => {
    if (!lit) return 0;
    let n = 0, d = 0;
    for (const [x, y, w, h] of boxes) for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const X = x + (w * (i + 0.5)) / 5, Y = y + (h * (j + 0.5)) / 3, a = px.at(X, Y), b = lit.at(X, Y);
      n++; if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 10) d++;
    }
    return n ? d / n : 0;
  };
  const out = [];
  for (const it of list.items) {
    if (it.kind === 'covered') continue;
    if (lit && dimmed(it.rects || [it.rect]) > 0.5) continue;
    if (it.kind === 'text' || it.kind === 'placeholder' || it.kind === 'value' || it.kind === 'pseudo') {
      const k = Math.max(0, Math.min(1, it.fill[3] * it.op));
      const need = it.large ? 3 : 4.5;
      let rs = [], bgs = [];
      if (it.bg) { bgs = [it.bg.slice(0, 3)]; rs = [ratio(over(it.fill, k, bgs[0]), bgs[0])]; }
      else {
        /* (a box cut into the pieces nothing covers is sampled in proportion to each piece) */
        const total = it.rects.reduce((a, q) => a + q[2] * q[3], 0) || 1;
        /* (a line box's top and bottom pixel rows are leading, not letters: an edge of something over it, a sheet's or
           a header's, can sit there, so they're left out) */
        for (const [x, y, w, h] of it.rects) for (const b of px.area(x, h > 8 ? y + 1 : y, w, h > 8 ? h - 2 : h, Math.max(12, Math.round((1200 * w * h) / total)))) { bgs.push(b); rs.push(ratio(over(it.fill, k, b), b)); }
      }
      if (!rs.length) continue;
      const order = rs.map((r, i) => [r, i]).sort((a, b) => a[0] - b[0]);
      const p5 = order[Math.floor(order.length * 0.05)];
      const bg = bgs[p5[1]], seen = over(it.fill, k, bg);
      const flat = order[order.length - 1][0] - order[0][0] < 0.05;
      out.push({ kind: it.kind, text: it.text, path: it.path, ratio: r2(p5[0]), min: r2(order[0][0]), need, pass: p5[0] >= need, fg: hex(it.fill) + (it.fill[3] < 0.999 ? ' at ' + r2(it.fill[3]) : ''), seen: hex(seen), bg: hex(bg), flat, px: it.size, weight: it.weight, large: it.large, alpha: it.fill[3] < 0.999 || it.op < 0.999, op: it.op, disabled: it.disabled, rect: it.rects[0] });
    } else if (it.kind === 'checkbox') {
      /* a check box's own box is what shows it's there: its edge (or its fill, checked) against what's
         around it, wherever inside its target the box is drawn */
      const a = around(px, it.rect, it.radius);
      if (!a.outside) continue;
      const [x, y, w, h] = it.rect;
      const ink = px.area(x, y, w, h, 900).map((p) => ratio(p, a.outside)).filter((r) => r > 1.12).sort((p, q) => p - q);
      const r = ink.length >= 4 ? ink[Math.floor(ink.length * 0.85)] : 1;
      out.push({ kind: 'checkbox', text: it.text, path: it.path, ratio: r2(r), need: 3, pass: r >= 3, outside: hex(a.outside), checked: it.checked, disabled: it.disabled, rect: it.rect });
    } else if (it.kind === 'field' || it.kind === 'selected') {
      const a = around(px, it.rect, it.radius);
      if (!a.outside) continue;
      let edge = a.inside || a.outside, best = 1;
      for (const four of a.edges) for (const e of four) { const r = ratio(e, a.outside); if (r > best) { best = r; edge = e; } }
      /* an edge the eye can follow is the strongest edge pixel that shows on most sides, not one stray */
      /* (top, bottom, left, right, as measured: kept in the result, so a weak side can be found) */
      const each = [0, 1, 2, 3].map((s) => Math.max(...a.edges.map((four) => ratio(four[s], a.outside))));
      const sides = each.slice().sort((p, q) => p - q);
      const edgeR = sides[1];
      const fillR = a.inside ? ratio(a.inside, a.outside) : 1;
      let r = Math.max(edgeR, fillR), markR = 1;
      /* a selected state can be shown by what's inside it (a switch's knob, a check) instead of its fill */
      if (it.kind === 'selected' && r < 3 && a.inside) {
        const [x, y, w, h] = it.rect;
        const ink = px.area(x, y, w, h, 900).map((p) => ratio(p, a.inside)).filter((q) => q > 1.12).sort((p, q) => p - q);
        markR = ink.length >= 12 ? ink[Math.floor(ink.length * 0.85)] : 1;
        r = Math.max(r, markR);
      }
      /* a field with no edge, fill, or ring at rest has nothing to measure: it's read as words (it's listed) */
      const bare = it.kind === 'field' && it.bare;
      out.push({ kind: it.kind, text: it.text, path: it.path, ratio: r2(r), need: 3, pass: bare || r >= 3, bare: bare || undefined, edge: r2(edgeR), sides: each.map(r2), fill: r2(fillR), inner: markR > 1 ? r2(markR) : undefined, inside: a.inside && hex(a.inside), outside: hex(a.outside), edgeColor: hex(edge), disabled: it.disabled, rect: it.rect });
    } else if (it.kind === 'mark') {
      const [x, y, w, h] = it.mark;
      if (w < 3 || h < 3) continue;
      /* what's behind the mark: the line just inside its own box (a mark has room around it) */
      const frame = [];
      for (let t = 0; t <= 1; t += 0.1) frame.push(px.at(x + w * t, y + 0.6), px.at(x + w * t, y + h - 0.6), px.at(x + 0.6, y + h * t), px.at(x + w - 0.6, y + h * t));
      const bg = median(frame);
      const ink = px.area(x, y, w, h, 900).map((p) => ratio(p, bg)).filter((r) => r > 1.12).sort((a, b) => a - b);
      const r = ink.length >= 4 ? ink[Math.floor(ink.length * 0.85)] : 1;
      out.push({ kind: 'mark', text: it.text, path: it.path, ratio: r2(r), need: 3, pass: r >= 3, bg: hex(bg), disabled: it.disabled, rect: it.rect });
    }
  }
  return out;
}

/* focus rings, with focus forced on each control in turn (one of each look on the screen), and
   :focus-within forced on the four things around it, since a row can draw the ring for the field in it */
async function rings(c, img, dpr, seen) {
  const list = await c.ev('__cx.focusables(60, ' + JSON.stringify(seen ? Array.from(seen) : []) + ')');
  if (!Array.isArray(list) || !list.length) return [];
  const px = pixels(img, dpr);
  await c.send('DOM.enable');
  await c.send('CSS.enable');
  const doc = await c.send('DOM.getDocument', { depth: 0 });
  const ids = {}, anc = {};
  for (const sel of ['[data-cx-f]', '[data-cx-a]']) {
    const { nodeIds } = await c.send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: sel });
    for (const id of nodeIds) {
      const at = (await c.send('DOM.getAttributes', { nodeId: id })).attributes;
      for (let i = 0; i < at.length; i += 2) {
        if (at[i] === 'data-cx-f') ids[at[i + 1]] = id;
        if (at[i] === 'data-cx-a') for (const tag of at[i + 1].split(' ')) anc[tag] = id;
      }
    }
  }
  const shadows = async (str) => JSON.parse((await c.ev('JSON.stringify(__cx.parseShadows(' + JSON.stringify(str) + '))')) || '[]');
  /* the surface a ring sits on: just outside a box, where an outline or a ring shadow is drawn */
  const outAt = ([x, y, w, h], d) => median([0.3, 0.5, 0.7].flatMap((t) => [px.at(x + w * t, y - d), px.at(x + w * t, y + h + d), px.at(x - d, y + h * t), px.at(x + w + d, y + h * t)]));
  const inAt = ([x, y, w, h]) => median([0.3, 0.5, 0.7].flatMap((t) => [px.at(x + w * t, y + 2), px.at(x + w * t, y + h - 2)]));
  /* what focus added to one box: an outline, a ring shadow, or (weakest) a fill or edge change */
  const added = async (rest, on) => {
    if (on.outline && (!rest.outline || rest.outline.color.join() !== on.outline.color.join() || rest.outline.width !== on.outline.width || rest.outline.style !== on.outline.style)) {
      const o = on.outline;
      let bg = o.offset >= 0 ? outAt(on.rect, Math.max(1, o.offset + o.width / 2)) : inAt(on.rect), two = '';
      /* a ring of two colors: a dark halo (an outer shadow focus adds) under the outline is what it's seen against */
      if (on.shadow !== rest.shadow && o.offset >= 0) {
        const was = new Set((await shadows(rest.shadow)).map((x) => x.raw));
        const halo = (await shadows(on.shadow)).filter((x) => !was.has(x.raw) && !x.inset && x.spread >= o.offset + o.width && x.color[3] > 0.5).sort((a, b) => b.color[3] - a.color[3])[0];
        if (halo) { bg = over(halo.color, halo.color[3], bg); two = ' on a ' + hex(halo.color) + ' halo'; }
      }
      return { how: 'outline ' + o.width + 'px' + two + (o.style === 'auto' ? ' (the browser’s own)' : ''), r: ratio(over(o.color, o.color[3] * on.op, bg), bg), color: hex(o.color) };
    }
    if (on.shadow !== rest.shadow) {
      const was = new Set((await shadows(rest.shadow)).map((x) => x.raw));
      const fresh = (await shadows(on.shadow)).filter((x) => !was.has(x.raw) && (x.spread > 0.5 || x.blur > 0.5) && x.color[3] > 0.05);
      if (fresh.length) {
        const ring = fresh.sort((a, b) => b.spread * b.color[3] - a.spread * a.color[3])[0];
        const bg = ring.inset ? inAt(on.rect) : outAt(on.rect, Math.max(1, ring.spread / 2));
        return { how: (ring.inset ? 'inset ring ' : 'ring ') + ring.spread + 'px', r: ratio(over(ring.color, ring.color[3] * on.op, bg), bg), color: hex(ring.color) };
      }
    }
    return null;
  };
  const lit = img.lit ? pixels(img.lit, dpr) : null;
  const out = [];
  for (const f of list) {
    const nodeId = ids[String(f.i)];
    if (!nodeId) continue;
    /* (a control under a spotlight's dim waits for a view without it) */
    if (lit) { const [x, y, w, h] = f.rect, a = px.at(x + w / 2, y + h / 2), b = lit.at(x + w / 2, y + h / 2); if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 10) continue; }
    if (seen) seen.add(f.sig);
    const ks = [0, 1, 2, 3].filter((k) => anc[f.i + '-' + k]);
    /* (focus that came back to it since the screen was taken, a menu putting focus on its first item, would show
       its ring at rest too, and the ring would read as nothing) */
    const a0 = await c.ev('(() => { const el = document.querySelector(\'[data-cx-f="' + f.i + '"]\'), a = document.activeElement; if (el && a && a !== document.body && (a === el || el.contains(a) || a.contains(el)) && a.blur) a.blur(); return __cx.ringAll(' + f.i + '); })()');
    await Promise.all([c.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] })].concat(ks.map((k) => c.send('CSS.forcePseudoState', { nodeId: anc[f.i + '-' + k], forcedPseudoClasses: ['focus-within'] }))));
    const a1 = await c.ev('__cx.ringAll(' + f.i + ')');
    await Promise.all([c.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })].concat(ks.map((k) => c.send('CSS.forcePseudoState', { nodeId: anc[f.i + '-' + k], forcedPseudoClasses: [] }))));
    const rest = a0 && a0.self, on = a1 && a1.self, restA = a0 ? a0.anc : [], onA = a1 ? a1.anc : [];
    if (!rest || !on) continue;
    let got = await added(rest, on);
    for (const k of ks) { if (got) break; if (restA[k] && onA[k]) { const a = await added(restA[k], onA[k]); if (a) got = Object.assign(a, { how: a.how + ' on the row around it' }); } }
    if (!got && (on.bg.join() !== rest.bg.join() || on.border.color.join() !== rest.border.color.join())) {
      const base = inAt(on.rect);
      const a = over(rest.bg, rest.bg[3], base), b = over(on.bg, on.bg[3], base);
      got = { how: 'a fill or edge change only', r: Math.max(ratio(a, b), on.border.width ? ratio(over(on.border.color, on.border.color[3], base), over(rest.border.color, rest.border.color[3], base)) : 1), color: hex(on.bg) };
    }
    if (!got) got = { how: 'nothing shows focus', r: 1, color: null };
    out.push({ kind: 'focus', text: f.text, path: f.path, ratio: r2(got.r), need: 3, pass: got.r >= 3, how: got.how, color: got.color, rect: f.rect });
  }
  await c.ev('__cx.done()');
  return out;
}

/* wait for what's moving to finish (a run that never ends, a spinner, doesn't count) */
export async function settle(c, max = 2500) {
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const n = await c.ev(`document.getAnimations().filter((a) => a.playState === 'running' && !(a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming().iterations === Infinity)).length`);
    if (!n) return;
    await sleep(80);
  }
}

/* what's listed and the picture behind it have to be the same moment: when something moved, faded, or
   flipped in between (a timer, a card that turns over), it waits and measures again */
async function snap(c) {
  for (let k = 0; ; k++) {
    const list = await c.ev('__cx.collect({})');
    if (!list || list.__error) throw new Error('collect: ' + (list && list.__error));
    await c.ev('__cx.hide(true)');
    const shot = await c.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
    /* with a spotlight on, a second picture without its dim says what's under it */
    let lit = null;
    if (list.dims) {
      await c.ev('__cx.undim(true)');
      lit = await c.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
      await c.ev('__cx.undim(false)');
    }
    await c.ev('__cx.hide(false)');
    const same = await c.ev('__cx.sig() === __cx.sigNow');
    if (!same && k < 5) { await sleep(500); await settle(c, 1500); continue; }
    const img = readPng(Buffer.from(shot.data, 'base64'));
    if (lit) img.lit = readPng(Buffer.from(lit.data, 'base64'));
    return { list, img, png: shot.data, moved: !same };
  }
}

/* one screen: what shows, then each list that scrolls, a screen at a time; focus rings on the first view */
export async function measure(c, o = {}) {
  if (!(await c.ev('!!window.__cx'))) await c.ev(PROBE);
  /* nothing holds focus while it measures (a focus ring is measured on its own, with focus forced on) */
  await c.ev(`(() => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); return 1; })()`);
  await settle(c, o.settle || 2500);
  const all = [];
  const first = await snap(c);
  all.push(...judge(first.list, first.img));
  if (o.focus !== false) {
    if (!c.cxSeen) c.cxSeen = new Set();
    try { all.push(...(await rings(c, first.img, first.list.dpr, o.everyRing ? null : c.cxSeen))); } catch (e) { all.push({ kind: 'error', text: 'focus pass: ' + String(e.message || e).slice(0, 120), pass: true }); }
  }
  if (o.scroll !== false) {
    const n = Math.min(4, (await c.ev('__cx.scrollers().length')) || 0);
    for (let i = 0; i < n; i++) {
      const start = await c.ev(`(() => { const e = __cx.scrollers()[${i}]; return e ? e.scrollTop : null; })()`);
      if (start == null) continue;
      const info = await c.ev(`__cx.scrollTo(${i}, 0)`);
      if (!info || !info.max) continue;
      /* (steps of a little over half a screen, so a word in the band along one edge is clear of both bands the
         next time: the probe leaves out the fifth of a list nearest an edge with more beyond it) */
      const steps = Math.min(o.maxSteps || 10, Math.ceil(info.max / Math.max(60, info.page * 0.55)));
      for (let s = 0; s <= steps; s++) {
        if (s > 0) await c.ev(`__cx.scrollTo(${i}, ${s / steps})`);
        await sleep(160);
        await settle(c, 800);
        const v = await snap(c);
        all.push(...judge(v.list, v.img));
      }
      await c.ev(`(() => { const e = __cx.scrollers()[${i}]; if (e) e.scrollTop = ${start}; })()`);
      await sleep(120);
    }
  }
  /* the same word in the same place counts once; it keeps its worst measure */
  const seen = new Map();
  for (const r of all) {
    const key = r.kind + '|' + r.path + '|' + r.text + '|' + (r.fg || '');
    const was = seen.get(key);
    if (!was || r.ratio < was.ratio) seen.set(key, r);
  }
  return { results: Array.from(seen.values()), shot: first.png };
}
