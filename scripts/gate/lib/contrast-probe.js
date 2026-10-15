/* The contrast checker, in the page (window.__cx). It finds what the eye can read or has to see: every
   visible text node (and a field's typed words and placeholder, and words a ::before or ::after prints),
   the edge of every text field and check box, every control that is only a mark, and every selected
   state. It says where each sits on screen and what color it is drawn in, with every ancestor's opacity
   multiplied in. What's behind it is read later from real pixels: hide(true) makes every word on the page
   transparent (and nothing else), the checker takes a screenshot, and hide(false) puts the words back.
   So a gradient, the 3D desk, a picture, or glass that blurs the desk is measured as it is drawn.
   Loaded by scripts/gate/contrast.mjs. */
(() => {
  const cx = window.__cx = {};
  /* (the page's content security policy refuses a <style> added later, so these are constructed sheets,
     which it allows: one makes every word transparent, one lets everything take the pointer) */
  const sheet = (css) => { const s = new CSSStyleSheet(); s.replaceSync(css); return s; };
  const HIDE = sheet('*:not(svg):not(svg *), *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; text-decoration-color: transparent !important; transition: none !important; } ::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; } ::selection { background: transparent !important; } ::marker { color: transparent !important; }');
  const HIT = sheet('*, *::before, *::after { pointer-events: auto !important; }');
  /* a spotlight (the coach's ring) dims everything around it with a huge shadow; for one picture it's lifted,
     so what's under the dim is known and left out, the way what's behind a scrim is */
  const UNDIM = sheet('.__cx-undim { box-shadow: none !important; animation: none !important; }');
  const adopt = (s, on) => {
    const list = document.adoptedStyleSheets.filter((x) => x !== s);
    document.adoptedStyleSheets = on ? list.concat([s]) : list;
  };
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const g = cv.getContext('2d', { willReadFrequently: true });
  /* any CSS color to [r, g, b, a] in sRGB (0 to 255, alpha 0 to 1) */
  const rgba = (s) => {
    if (!s || s === 'transparent') return [0, 0, 0, 0];
    let m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map((v) => (/%$/.test(v) ? parseFloat(v) / 100 : parseFloat(v))); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = /^color\(srgb ([^)]+)\)$/.exec(s);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    /* anything else (oklch, a named color): paint it and read the pixel back */
    g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = s; g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  cx.rgba = rgba;
  const r1 = (v) => Math.round(v * 10) / 10;
  const box = (r) => [r1(r.left), r1(r.top), r1(r.width), r1(r.height)];
  /* a short way to find it again: up to five ancestors, each with its id or up to three classes */
  const pathOf = (el) => {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && e !== document.body && parts.length < 5; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id && !/^f\d+l?$/.test(e.id)) { parts.unshift(s + '#' + e.id); break; }
      const cls = Array.from(e.classList).filter((c) => !/^__cx/.test(c)).slice(0, 3);
      if (cls.length) s += '.' + cls.join('.');
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  cx.pathOf = pathOf;
  /* every ancestor's opacity, multiplied (a filter: opacity() counts too) */
  const opacityOf = (el) => {
    let o = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      o *= parseFloat(cs.opacity);
      if (cs.filter && cs.filter !== 'none') { const m = /opacity\(([\d.]+)(%?)\)/.exec(cs.filter); if (m) o *= m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1]); }
      if (o < 0.01) return 0;
    }
    return o;
  };
  /* the part of a box that isn't clipped away by the window or by an ancestor that clips what overflows */
  const clipOf = (el, self) => {
    let L = 0, T = 0, R = innerWidth, B = innerHeight;
    for (let e = self ? el : el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      /* words kept only for a screen reader (clipped to nothing) aren't on screen */
      if (/rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip) || /inset\((50|100)%\)/.test(cs.clipPath)) return { L: 0, T: 0, R: 0, B: 0 };
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || /paint|strict|content/.test(cs.contain)) {
        const b = e.getBoundingClientRect();
        const l = b.left + e.clientLeft, t = b.top + e.clientTop;
        const w = e.clientWidth || b.width, h = e.clientHeight || b.height;
        if (cs.overflowX !== 'visible') { L = Math.max(L, l); R = Math.min(R, l + w); }
        if (cs.overflowY !== 'visible') { T = Math.max(T, t); B = Math.min(B, t + h); }
      }
      if (cs.position === 'fixed') break;
    }
    return { L, T, R, B };
  };
  const cut = (r, c) => { const l = Math.max(r.left, c.L), t = Math.max(r.top, c.T), rr = Math.min(r.right, c.R), b = Math.min(r.bottom, c.B); return rr - l >= 2 && b - t >= 2 ? { left: l, top: t, width: rr - l, height: b - t, right: rr, bottom: b } : null; };
  /* does it put anything on screen where it sits (so text under it is covered) */
  const paints = (e) => {
    if (/^(CANVAS|IMG|VIDEO|IFRAME|INPUT|TEXTAREA|SELECT|svg)$/i.test(e.tagName)) return true;
    const cs = getComputedStyle(e);
    if (rgba(cs.backgroundColor)[3] > 0.04 || cs.backgroundImage !== 'none') return true;
    if (cs.backdropFilter && cs.backdropFilter !== 'none') return true;
    return false;
  };
  /* text is judged where it's on top: the first thing at its middle that paints and isn't it (or inside
     it, or around it) covers it. Everything takes the pointer while this looks (hit), so an overlay that
     lets clicks through still counts as over it. */
  const coverAt = (el, x, y) => {
    const list = document.elementsFromPoint(x, y);
    const i = list.findIndex((e) => e === el || e.contains(el));
    if (i < 0) return { gone: true };
    for (let k = 0; k < i; k++) {
      const e = list[k];
      if (el.contains(e)) continue;
      if (opacityOf(e) < 0.05) continue;
      if (paints(e)) return { by: pathOf(e) };
    }
    return null;
  };
  const hit = (on) => adopt(HIT, on);
  const disabledOf = (el) => !!el.closest(':disabled, [aria-disabled="true"], .disabled, [inert]');
  /* the size on screen: Larger text zooms whole panels (zoom: 1.14), so every ancestor's zoom counts */
  const zoomOf = (el) => { let z = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) z *= parseFloat(getComputedStyle(e).zoom) || 1; return z; };
  const sizeOf = (cs, el) => { const px = parseFloat(cs.fontSize) * (el ? zoomOf(el) : 1), w = parseInt(cs.fontWeight, 10) || 400; return { size: r1(px), weight: w, large: px >= 24 || (px >= 18.66 && w >= 700) }; };
  const shown = (el) => (el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true }) : !!el.getClientRects().length);
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|OPTION|OPTGROUP|DATALIST)$/;
  const TEXTY = /^(text|search|email|url|tel|password|number|date|time|datetime-local|month|week|)$/;

  /* a list that fades out at its edge (a mask that ends transparent, the "more below" fade) shows words
     there on purpose half gone, and they're read once it scrolls; those bands aren't judged */
  const fadeMemo = new Map(), edgeMemo = new Map();
  const fadesOf = (el) => {
    const zones = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      let z = fadeMemo.get(e);
      if (z === undefined) {
        z = null;
        const cs = getComputedStyle(e), m = cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage && cs.webkitMaskImage !== 'none' ? cs.webkitMaskImage : '';
        if (/linear-gradient/.test(m)) {
          const parts = m.replace(/^.*?linear-gradient\(/, '').replace(/\)\s*$/, '').split(/,(?![^(]*\))/).map((x) => x.trim());
          const dir = /^(to |-?[\d.]+deg)/.test(parts[0]) ? parts.shift() : 'to bottom';
          const across = /to (right|left)|^(90|270|-90)deg/.test(dir), back = /to (left|top)|^(270|-90|0)deg/.test(dir);
          const clear = (x) => /rgba\([^)]*,\s*0\)|transparent/.test(x);
          const len = (x, dflt) => { const n = /(\d+(?:\.\d+)?)px/.exec(x || ''); return n ? +n[1] + 6 : dflt; };
          const b = e.getBoundingClientRect();
          const lo = across ? b.left : b.top, hi = across ? b.right : b.bottom;
          z = [];
          /* a clear stop at the end fades the far edge; one at the start fades the near edge (the length is
             the opaque stop's px beside it, or 64) */
          const endClear = clear(parts[parts.length - 1]), startClear = clear(parts[0]);
          const farLen = endClear ? len(parts[parts.length - 2], 64) : 0, nearLen = startClear ? len(parts[1], 64) : 0;
          const a1 = back ? nearLen : farLen, a0 = back ? farLen : nearLen;
          if (a1) z.push({ x: across, a: hi - a1, b: hi + 1 });
          if (a0) z.push({ x: across, a: lo - 1, b: lo + a0 });
        }
        fadeMemo.set(e, z);
      }
      if (z) zones.push(...z);
    }
    return zones;
  };
  const inFade = (zones, y, x) => zones.some((z) => (z.box ? x != null && x >= z.box.l && x <= z.box.r && y >= z.box.t && y <= z.box.b && !(x >= z.hole.l && x <= z.hole.r && y >= z.hole.t && y <= z.hole.b) : z.x ? x != null && x >= z.a && x <= z.b : y >= z.a && y <= z.b));
  /* the soft shadow a bar or a toast casts over a list that scrolls under it is an edge too: the words there
     scroll out of it. Each thing that casts one, and how far its shadow reaches past its box */
  const casters = () => {
    const out = [];
    for (const e of document.body.querySelectorAll('*')) {
      const sh = getComputedStyle(e).boxShadow;
      if (!sh || sh === 'none' || !/px/.test(sh)) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 20 || r.height < 20 || !shown(e)) continue;
      const ext = { l: 0, t: 0, r: 0, b: 0 };
      for (const x of cx.parseShadows(sh)) {
        if (x.inset || x.color[3] < 0.1 || x.spread >= 1000) continue;
        const reach = x.blur + x.spread;
        if (reach <= 2) continue;
        ext.l = Math.max(ext.l, reach - x.x); ext.r = Math.max(ext.r, reach + x.x); ext.t = Math.max(ext.t, reach - x.y); ext.b = Math.max(ext.b, reach + x.y);
      }
      if (ext.l + ext.r + ext.t + ext.b < 4) continue;
      out.push({ el: e, box: { l: r.left - ext.l, t: r.top - ext.t, r: r.right + ext.r, b: r.bottom + ext.b }, hole: { l: r.left, t: r.top, r: r.right, b: r.bottom } });
    }
    return out;
  };
  /* the band along a list's edge where there's more to scroll to (its fade, a bar's shadow, a half shown row):
     words there are read once the list moves, and the checker walks every list a screen at a time, so each word
     is measured away from the edge somewhere along the way */
  const edgesOf = (el) => {
    const out = [];
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const sy = /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1, sx = /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1;
      if (!sy && !sx) continue;
      /* (something that stays put while the list scrolls, a sticky close mark or header, is always over whatever
         scrolls under it, so it's read wherever the list is, never left for a later step) */
      if (!movesWith(el, e)) continue;
      const b = e.getBoundingClientRect(), t = b.top + e.clientTop, l = b.left + e.clientLeft;
      if (sy) {
        const B = Math.min(64, e.clientHeight * 0.2);
        /* (the edge is where the list first shows: a header laid over its top moves the band down to the
           header's foot, and a bar laid over its bottom moves it up) */
        let top = edgeMemo.get(e);
        if (top === undefined) {
          const mx = b.left + b.width / 2;
          let a = t, z = t + e.clientHeight;
          /* (over it: something that paints and doesn't scroll with it, a sticky header inside it included) */
          const over = (y) => { const list = document.elementsFromPoint(mx, y), i = list.indexOf(e); return list.slice(0, i < 0 ? 0 : i).some((k) => !k.contains(e) && (!e.contains(k) || !movesWith(k, e)) && opacityOf(k) > 0.05 && paints(k)); };
          while (a < t + Math.min(240, e.clientHeight / 2) && over(a + 1)) a += 4;
          while (z > t + Math.max(e.clientHeight / 2, e.clientHeight - 240) && over(z - 1)) z -= 4;
          top = [a, z];
          edgeMemo.set(e, top);
        }
        if (e.scrollTop > 1) out.push({ x: false, a: t - 1, b: top[0] + B });
        if (e.scrollTop < e.scrollHeight - e.clientHeight - 1) out.push({ x: false, a: top[1] - B, b: t + e.clientHeight + 1 });
      }
      if (sx) {
        const B = Math.min(64, e.clientWidth * 0.2);
        if (e.scrollLeft > 1) out.push({ x: true, a: l - 1, b: l + B });
        if (e.scrollLeft < e.scrollWidth - e.clientWidth - 1) out.push({ x: true, a: l + e.clientWidth - B, b: l + e.clientWidth + 1 });
      }
    }
    return out;
  };
  /* (a bar fixed inside a list doesn't scroll with it, so its shadow is over the list) */
  const movesWith = (e, sc) => { for (let x = e; x && x !== sc; x = x.parentElement) { const p = getComputedStyle(x).position; if (p === 'fixed' || p === 'sticky') return false; } return true; };
  const scrollerOf = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) return e; } return null; };
  /* a face turned away (a card that flips, its back hidden) isn't on screen */
  const facesAway = (el) => {
    let m = new DOMMatrix(), hides = false;
    for (let e = el; e && e.nodeType === 1 && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backfaceVisibility === 'hidden') hides = true;
      if (cs.transform && cs.transform !== 'none') m = new DOMMatrix(cs.transform).multiply(m);
    }
    return hides && m.m33 < 0;
  };
  /* the parts of a box that are on top (nothing covers them) and not in a fade: the whole box when its
     middle and corners are clear, otherwise each clear piece of a grid about 14 px wide */
  const clearParts = (el, c, zones) => {
    const pts = [[0.5, 0.5], [0.08, 0.25], [0.92, 0.25], [0.08, 0.75], [0.92, 0.75]];
    let all = true, gone = 0, by = null;
    for (const [fx, fy] of pts) {
      const x = c.left + c.width * fx, y = c.top + c.height * fy;
      if (inFade(zones, y, x)) { all = false; break; }
      const v = coverAt(el, x, y);
      if (v) { all = false; if (v.gone) gone++; else by = v.by; break; }
    }
    if (all) return { parts: [c] };
    const cols = Math.max(1, Math.min(30, Math.round(c.width / 14))), rows = c.height > 24 ? 4 : c.height > 12 ? 3 : 1;
    const parts = [];
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const q = { left: c.left + (c.width * i) / cols, top: c.top + (c.height * j) / rows, width: c.width / cols, height: c.height / rows };
      const x = q.left + q.width / 2, y = q.top + q.height / 2;
      if (inFade(zones, q.top, x) || inFade(zones, q.top + q.height, x) || inFade(zones, y, q.left) || inFade(zones, y, q.left + q.width)) continue;
      /* a piece counts when its middle and its top and bottom edges are clear (an edge of a sheet can cut it) */
      const v = coverAt(el, x, y) || coverAt(el, x, q.top + 1.5) || coverAt(el, x, q.top + q.height - 1.5) || coverAt(el, q.left + 0.6, y) || coverAt(el, q.left + q.width - 0.6, y);
      if (v) { if (v.by) by = v.by; continue; }
      parts.push(q);
    }
    return { parts, by };
  };

  cx.dimmers = () => Array.from(document.querySelectorAll('[class*="coach"], [class*="ring"], [class*="spot"], [class*="dim"]')).filter((e) => {
    const sh = getComputedStyle(e).boxShadow;
    return shown(e) && sh && sh !== 'none' && /\d{4,}px/.test(sh) && cx.parseShadows(sh).some((x) => !x.inset && x.spread >= 1000 && x.color[3] >= 0.1);
  });
  cx.undim = (on) => {
    if (on) cx._dims = cx.dimmers();
    for (const e of cx._dims || []) e.classList.toggle('__cx-undim', !!on);
    adopt(UNDIM, on);
    if (!on) cx._dims = null;
    return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(!!on))));
  };

  /* everything that has to be read or seen, as it is now */
  cx.collect = (o = {}) => {
    hit(true);
    fadeMemo.clear(); edgeMemo.clear();
    const items = [], seen = new Set();
    const shade = casters();
    const add = (it) => { items.push(it); };
    /* text nodes */
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/\S/.test(n.nodeValue) ? 1 : 2) });
    const range = document.createRange();
    const styleOf = new Map();
    for (let n; (n = walker.nextNode());) {
      const el = n.parentElement;
      if (!el || SKIP.test(el.tagName) || el.closest('svg')) continue;
      let st = styleOf.get(el);
      if (st === undefined) {
        st = null;
        if (shown(el)) {
          const cs = getComputedStyle(el);
          const op = opacityOf(el);
          const fill = rgba(cs.webkitTextFillColor || cs.color);
          if (op >= 0.05 && fill[3] > 0.02 && !/^(0px|0)$/.test(cs.fontSize) && !facesAway(el)) st = Object.assign({ cs, op, fill, clip: clipOf(el, true), path: pathOf(el), disabled: disabledOf(el), shadow: cs.textShadow !== 'none' }, sizeOf(cs, el));
        }
        styleOf.set(el, st);
      }
      if (!st) continue;
      range.selectNodeContents(n);
      const rects = [];
      let cover = null, any = false;
      if (st.zones === undefined) { const sc = scrollerOf(el); st.zones = fadesOf(el).concat(edgesOf(el), sc ? shade.filter((k) => !k.el.contains(sc) && !(sc.contains(k.el) && movesWith(k.el, sc))) : []); }
      for (const r of range.getClientRects()) {
        /* (a line squashed far under its own size is folding away under a transform, not being read) */
        if (r.width < 1.5 || r.height < 4 || r.height < 0.6 * st.size) continue;
        const c = cut(r, st.clip);
        /* (half a line or less in view, at the edge of what clips it, waits for a view that shows it) */
        if (!c || c.width * c.height < 0.5 * r.width * r.height) continue;
        any = true;
        const cp = clearParts(el, c, st.zones);
        if (cp.by) cover = cp.by;
        /* words mostly under something else (a sliver showing at a sheet's edge) aren't read there */
        const clear = cp.parts.reduce((a, q) => a + q.width * q.height, 0);
        if (clear < 0.5 * c.width * c.height) continue;
        cp.parts.forEach((q) => rects.push(box(q)));
      }
      if (!rects.length) { if (any && cover && o.covered) add({ kind: 'covered', text: n.nodeValue.trim().slice(0, 60), path: st.path, by: cover }); continue; }
      add({ kind: 'text', text: n.nodeValue.replace(/\s+/g, ' ').trim().slice(0, 80), path: st.path, fill: st.fill, op: r1(st.op * 1000) / 1000, size: st.size, weight: st.weight, large: st.large, disabled: st.disabled, shadow: st.shadow, rects });
    }
    /* words a ::before or ::after prints (a step's number, a count) */
    for (const el of document.body.querySelectorAll('*')) {
      if (SKIP.test(el.tagName) || el.closest('svg')) continue;
      for (const pe of ['::before', '::after']) {
        const ps = getComputedStyle(el, pe);
        const ct = ps.content;
        if (!ct || ct === 'none' || ct === 'normal' || ct === '""' || ct === "''" || ps.display === 'none') continue;
        const txt = /^["']/.test(ct) ? ct.slice(1, -1) : /counter/.test(ct) ? '#' : '';
        if (!/\S/.test(txt) || !shown(el)) continue;
        const op = opacityOf(el) * parseFloat(ps.opacity);
        const fill = rgba(ps.webkitTextFillColor || ps.color);
        if (op < 0.05 || fill[3] < 0.02) continue;
        const r = el.getBoundingClientRect();
        const c = cut(r, clipOf(el));
        if (!c) continue;
        if (coverAt(el, c.left + Math.min(c.width / 2, 12), c.top + c.height / 2) || inFade(fadesOf(el).concat(edgesOf(el)), c.top + c.height / 2, c.left + c.width / 2)) continue;
        /* its own fill, when it has one, is what's behind it; otherwise the pixels at the start of the box */
        const bg = rgba(ps.backgroundColor);
        const w = parseFloat(ps.width) || Math.min(c.width, 20), h = parseFloat(ps.height) || Math.min(c.height, 20);
        add(Object.assign({ kind: 'pseudo', text: pe + ' ' + txt.slice(0, 20), path: pathOf(el), fill, op: r1(op * 1000) / 1000, disabled: disabledOf(el), bg: bg[3] > 0.98 ? bg : null, rects: [box({ left: c.left, top: c.top + Math.max(0, (c.height - h) / 2), width: Math.min(w, c.width), height: Math.min(h, c.height) })] }, sizeOf(ps, el)));
      }
    }
    /* fields: what's typed, the placeholder, and the edge that says it's a field */
    for (const el of document.body.querySelectorAll('input, textarea, select, [contenteditable="true"]')) {
      if (!shown(el)) continue;
      const cs = getComputedStyle(el);
      const op = opacityOf(el);
      if (op < 0.05) continue;
      const r = el.getBoundingClientRect();
      const c = cut(r, clipOf(el));
      if (!c || c.width < 6 || c.height < 6) continue;
      if (coverAt(el, c.left + c.width / 2, c.top + c.height / 2) || inFade(fadesOf(el).concat(edgesOf(el)), c.top + c.height / 2, c.left + c.width / 2)) continue;
      /* (its edge is measured all round, so a field half scrolled away waits for the view that shows it) */
      const whole = c.width * c.height >= 0.92 * r.width * r.height && ![[0.5, 0.06], [0.5, 0.94], [0.04, 0.5], [0.96, 0.5]].some(([fx, fy]) => coverAt(el, c.left + c.width * fx, c.top + c.height * fy));
      const type = el.tagName === 'INPUT' ? (el.getAttribute('type') || '').toLowerCase() : el.tagName.toLowerCase();
      const isBox = /^(checkbox|radio)$/.test(type);
      const isText = el.tagName !== 'INPUT' || TEXTY.test(type);
      if (!isBox && !isText && type !== 'range' && type !== 'color') continue;
      /* the box inside its border and padding, where the words go */
      const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
      const pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth), pb = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
      const inner = { left: r.left + pl, top: r.top + pt, width: Math.max(4, r.width - pl - pr), height: Math.max(4, r.height - pt - pb) };
      const fs = sizeOf(cs, el);
      const lineH = Math.min(inner.height, parseFloat(cs.fontSize) * 1.3);
      const textBox = el.tagName === 'TEXTAREA' ? [inner.left, inner.top, Math.min(inner.width, 200), lineH] : [inner.left, inner.top + (inner.height - lineH) / 2, Math.min(inner.width, 200), lineH];
      if (isText && el.value && type !== 'password') add(Object.assign({ kind: 'value', text: String(el.value).slice(0, 60), path: pathOf(el), fill: rgba(cs.webkitTextFillColor || cs.color), op: r1(op * 1000) / 1000, disabled: disabledOf(el), rects: [textBox.map(r1)] }, fs));
      else if (isText && el.placeholder) {
        const ph = getComputedStyle(el, '::placeholder');
        add(Object.assign({ kind: 'placeholder', text: el.placeholder.slice(0, 60), path: pathOf(el), fill: rgba(ph.webkitTextFillColor || ph.color), op: r1(op * parseFloat(ph.opacity || 1) * 1000) / 1000, disabled: disabledOf(el), rects: [textBox.map(r1)] }, fs));
      }
      /* a field drawn with no edge, no fill, and no ring at rest (a name you edit in place, an add row) is
         read as words and shows a ring when it has focus: it has no edge to measure */
      const edgeW = Math.max(parseFloat(cs.borderTopWidth) || 0, parseFloat(cs.borderBottomWidth) || 0);
      const bare = !isBox && (edgeW < 0.5 || rgba(cs.borderBottomColor)[3] < 0.03) && rgba(cs.backgroundColor)[3] < 0.03 && (cs.boxShadow === 'none' || !/inset/.test(cs.boxShadow)) && cs.backgroundImage === 'none';
      if (type !== 'color' && whole) add({ kind: isBox ? 'checkbox' : 'field', text: (el.getAttribute('aria-label') || el.placeholder || el.name || type).slice(0, 60), path: pathOf(el), rect: box(r), radius: parseFloat(cs.borderTopLeftRadius) || 0, disabled: disabledOf(el), checked: !!el.checked, bare });
    }
    /* a control that is only a mark (an x, an arrow, a plus): the mark is what says what it does */
    const CTRL = 'button, a[href], [role=button], [role=tab], [role=switch], [role=checkbox], [role=menuitem], [role=option], summary';
    for (const el of document.body.querySelectorAll(CTRL)) {
      if (!shown(el) || seen.has(el)) continue;
      seen.add(el);
      let words = false;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/\S/.test(n.nodeValue) ? 1 : 2) });
      for (let n; (n = tw.nextNode());) { const p = n.parentElement; if (p && shown(p) && parseFloat(getComputedStyle(p).fontSize) > 0) { range.selectNodeContents(n); if (Array.from(range.getClientRects()).some((q) => q.width > 1 && q.height > 4)) { words = true; break; } } }
      const r = el.getBoundingClientRect();
      const c = cut(r, clipOf(el));
      if (!c || c.width < 6 || c.height < 6) continue;
      const op = opacityOf(el);
      if (op < 0.05 || coverAt(el, c.left + c.width / 2, c.top + c.height / 2) || inFade(fadesOf(el).concat(edgesOf(el)), c.top + c.height / 2, c.left + c.width / 2)) continue;
      const marks = Array.from(el.querySelectorAll('canvas, svg, img')).filter((m) => shown(m) && !m.closest('svg svg'));
      const name = el.getAttribute('aria-label') || el.getAttribute('title') || '';
      const pseudoWords = ['::before', '::after'].some((pe) => { const ct = getComputedStyle(el, pe).content; return ct && /^["'].*\S.*["']$/.test(ct); });
      if (!words && !pseudoWords && !facesAway(el) && (marks.length || getComputedStyle(el).maskImage !== 'none')) {
        const mr = marks.length ? marks.map((m) => m.getBoundingClientRect()).reduce((a, b) => ({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) })) : r;
        const mc = cut({ left: mr.left, top: mr.top, right: mr.right, bottom: mr.bottom }, clipOf(el));
        const ma = (mr.right - mr.left) * (mr.bottom - mr.top);
        if (mc && mc.width * mc.height >= 0.9 * ma && !coverAt(el, mc.left + mc.width / 2, mc.top + mc.height / 2)) add({ kind: 'mark', text: name.slice(0, 60) || '(no name)', path: pathOf(el), rect: box(c), mark: [r1(mr.left), r1(mr.top), r1(mr.right - mr.left), r1(mr.bottom - mr.top)], op: r1(op * 1000) / 1000, disabled: disabledOf(el) });
      }
      /* a selected state: white fill, an edge, or a mark that says this one is on */
      const sel = el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true' || (el.getAttribute('aria-current') && el.getAttribute('aria-current') !== 'false');
      if (sel && r.width < innerWidth * 0.9 && c.width * c.height >= 0.92 * r.width * r.height) add({ kind: 'selected', text: (el.textContent.trim() || name).slice(0, 60), path: pathOf(el), rect: box(c), radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, disabled: disabledOf(el) });
    }
    hit(false);
    cx.listed = items.length;
    /* (what was measured, to see whether it moved or faded before the picture was taken) */
    cx._measured = Array.from(styleOf.entries()).filter(([, v]) => v).map(([k]) => k).slice(0, 400);
    cx.sigNow = cx.sig();
    return { items, dpr: devicePixelRatio, w: innerWidth, h: innerHeight, scrollers: cx.scrollers().length, dims: cx.dimmers().length };
  };
  /* where things are and how they're drawn, in brief: the checker compares it before and after its picture,
     and measures again when something moved, faded, or flipped in between */
  cx.sig = () => {
    let h = 0;
    const add = (v) => { h = (h * 31 + Math.round(v)) | 0; };
    for (const e of cx._measured || []) {
      if (!e.isConnected) { add(7); continue; }
      const r = e.getBoundingClientRect();
      add(r.left); add(r.top); add(opacityOf(e) * 50);
    }
    for (const e of document.querySelectorAll('section, aside, main, dialog, [role=dialog], .k-chip, .side, .sheet, .k-sheet, .c-mat, .toast, .td-card, .c-shop, .onb-flip-in, figure, [class*="level"], [class*="stage"]')) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      add(r.left * 2); add(r.top * 2); add(r.width * 2); add(r.height * 2);
      const cs = getComputedStyle(e);
      add(parseFloat(cs.opacity) * 100);
      if (cs.transform !== 'none') { const m = new DOMMatrix(cs.transform); add(m.m11 * 100); add(m.m22 * 100); add(m.m33 * 100); add(m.m41); add(m.m42); }
    }
    return h;
  };

  /* every word on the page transparent, and nothing else changed; a mark drawn in an SVG keeps its color */
  cx.hide = (on) => {
    adopt(HIDE, on);
    return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok(!!on))));
  };

  /* lists that scroll and have more than shows: each is walked a screen at a time */
  cx.scrollers = () => Array.from(document.body.querySelectorAll('*')).filter((e) => {
    if (e.scrollHeight <= e.clientHeight + 40 || e.clientHeight < 80) return false;
    const cs = getComputedStyle(e);
    if (!/(auto|scroll)/.test(cs.overflowY)) return false;
    if (!shown(e)) return false;
    const r = e.getBoundingClientRect();
    if (!(r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth)) return false;
    /* a list behind a sheet or a panel isn't walked: what's on top of it is */
    hit(true);
    const x = Math.max(1, Math.min(innerWidth - 1, (Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2)), y = Math.max(1, Math.min(innerHeight - 1, (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2));
    const under = coverAt(e, x, y);
    hit(false);
    return !(under && under.by);
  });
  cx.scrollTo = (i, frac) => {
    const e = cx.scrollers()[i];
    if (!e) return null;
    const max = e.scrollHeight - e.clientHeight;
    e.scrollTop = frac == null ? 0 : Math.round(max * frac);
    return { at: e.scrollTop, max, path: pathOf(e), page: e.clientHeight };
  };

  /* controls that can take focus, one of each look (tag, classes, role), marked so CDP can find them */
  cx.focusables = (max = 60, skip = []) => {
    document.querySelectorAll('[data-cx-f]').forEach((e) => e.removeAttribute('data-cx-f'));
    document.querySelectorAll('[data-cx-a]').forEach((e) => e.removeAttribute('data-cx-a'));
    const done = new Set(skip);
    fadeMemo.clear(); edgeMemo.clear();
    hit(true);
    const out = [], sigs = new Set();
    const sel = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    for (const el of document.body.querySelectorAll(sel)) {
      if (out.length >= max) break;
      if (!shown(el) || el.disabled) continue;
      const r = el.getBoundingClientRect();
      const c = cut(r, clipOf(el));
      if (!c || c.width < 6 || c.height < 6 || c.width * c.height < 0.6 * r.width * r.height) continue;
      if (opacityOf(el) < 0.5 || coverAt(el, c.left + c.width / 2, c.top + c.height / 2) || inFade(fadesOf(el).concat(edgesOf(el)), c.top + c.height / 2, c.left + c.width / 2)) continue;
      /* one of each look: its tag, classes, role, and the classes of the two things around it */
      const up = el.parentElement, up2 = up && up.parentElement;
      const sig = el.tagName + '.' + Array.from(el.classList).sort().join('.') + '[' + (el.getAttribute('role') || '') + ']' + (up ? '<' + Array.from(up.classList).sort().join('.') : '') + (up2 ? '<' + Array.from(up2.classList).sort().join('.') : '');
      if (sigs.has(sig) || done.has(sig)) continue;
      sigs.add(sig);
      const i = out.length;
      el.setAttribute('data-cx-f', String(i));
      /* (the four things around it, for a ring drawn by :focus-within) */
      let k = 0;
      for (let a = el.parentElement; a && a !== document.body && k < 4; a = a.parentElement, k++) a.setAttribute('data-cx-a', ((a.getAttribute('data-cx-a') || '') + ' ' + i + '-' + k).trim());
      out.push({ i, sig, path: pathOf(el), text: (el.textContent.trim() || el.getAttribute('aria-label') || el.placeholder || '').slice(0, 50), rect: box(r) });
    }
    hit(false);
    return out;
  };
  /* how a control looks: its outline and its shadows (read once at rest and once with focus forced on) */
  cx.ringStyle = (i, k) => {
    const el = k == null ? document.querySelector('[data-cx-f="' + i + '"]') : document.querySelector('[data-cx-a~="' + i + '-' + k + '"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return { rect: box(b), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? { color: rgba(cs.outlineColor), width: parseFloat(cs.outlineWidth), offset: parseFloat(cs.outlineOffset) || 0, style: cs.outlineStyle } : null, shadow: cs.boxShadow, bg: rgba(cs.backgroundColor), border: { color: rgba(cs.borderTopColor), width: parseFloat(cs.borderTopWidth) || 0 }, op: opacityOf(el) };
  };
  cx.parseShadows = (s) => {
    if (!s || s === 'none') return [];
    const out = [];
    let depth = 0, cur = '';
    for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) out.push(cur.trim());
    return out.map((sh) => {
      const m = /(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+\([^)]*\))/i.exec(sh);
      const color = m ? rgba(m[1]) : [0, 0, 0, 1];
      const nums = sh.replace(m ? m[1] : '', '').replace('inset', '').trim().split(/\s+/).map(parseFloat).filter((v) => !isNaN(v));
      return { inset: /\binset\b/.test(sh), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, color, raw: sh };
    });
  };
  /* a control and the four things around it, read at once */
  cx.ringAll = (i) => ({ self: cx.ringStyle(i), anc: [0, 1, 2, 3].map((k) => cx.ringStyle(i, k)) });
  cx.done = () => { document.querySelectorAll('[data-cx-f]').forEach((e) => e.removeAttribute('data-cx-f')); document.querySelectorAll('[data-cx-a]').forEach((e) => e.removeAttribute('data-cx-a')); hit(false); cx.hide(false); };
  return 'ok';
})();
