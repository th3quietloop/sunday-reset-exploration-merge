/* The drag gate's eyes in the page (window.__mx). Loaded after every navigation; idempotent.
   It watches what the app does during a drag (the World calls, the toasts, errors, the panel being
   redrawn under a finger) and answers questions about the board (where a slot is on screen, what was
   placed, whether a block's meshes are drawn). It changes nothing in the app. */
(() => {
  if (window.__mx && window.__mx.v === 8) return 'probe ready';
  const mx = window.__mx = { v: 8, log: [], toasts: [], errs: [], dragMesh: null, dragMeshes: [], sideSwaps: [], focusLog: [], cancels: [], samples: [] };
  const now = () => Math.round(performance.now());
  /* when the first finger or the mouse went down, first moved 8 px, and lifted, as the page saw them: a busy
     machine can stretch a tap or a swipe past the app's press to lift (300 ms), and then it isn't one */
  mx.ptr = { down: 0, move8: 0, up: 0, x: 0, y: 0 };
  /* (downT, move8T: the events' own clock, which the app's hold goes by) */
  document.addEventListener('pointerdown', (e) => { if (!e.isPrimary) return; mx.ptr = { down: now(), move8: 0, up: 0, x: e.clientX, y: e.clientY, downT: e.timeStamp, move8T: 0 }; }, { capture: true, passive: true });
  document.addEventListener('pointermove', (e) => { if (!e.isPrimary || mx.ptr.move8 || !mx.ptr.down || mx.ptr.up) return; if (Math.hypot(e.clientX - mx.ptr.x, e.clientY - mx.ptr.y) >= 8) { mx.ptr.move8 = now(); mx.ptr.move8T = e.timeStamp; } }, { capture: true, passive: true });
  document.addEventListener('pointerup', (e) => { if (e.isPrimary && !mx.ptr.up) mx.ptr.up = now(); }, { capture: true, passive: true });
  const W = window.World;
  const num = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
  /* == the World calls a drag makes, in order == */
  const sum = (name, a) => {
    try {
      if (name === 'showGhost') return a[0] == null ? ['off'] : [a[0], a[1], a[2], a[3]];
      if (name === 'showDayGhost') return a[0] == null ? ['off'] : [a[0], a[1], a[2]];
      if (name === 'startDrag') return [a[0] && (a[0].name || a[0].label), a[0] && a[0].key, a[0] && a[0].dur, !!a[1], !!a[2], a[3] ? Object.keys(a[3]) : null];
      if (name === 'endDrag') { const o = a[0] && !a[0].isVector3 ? a[0] : a[1]; return [o ? Object.keys(o).join(',') : '']; }
      if (name === 'land' || name === 'adoptPosition' || name === 'squash') return [a[0], a[1], num(a[2])];
      if (name === 'dragTo') return [num(a[0]), num(a[1]), num(a[2])];
      if (name === 'lean') return [a[0] ? 'on' : 'off'];
      if (name === 'press') return [a[0] ? 'obj' : 'null'];
      return [];
    } catch (e) { return ['?']; }
  };
  const wrapped = ['showGhost', 'showDayGhost', 'startDrag', 'endDrag', 'land', 'adoptPosition', 'squash', 'lean', 'press', 'benchCarry'];
  const quiet = new Set(['dragTo']);
  if (W) {
    wrapped.concat(['dragTo']).forEach((name) => {
      const f = W[name];
      if (typeof f !== 'function' || f.__mx) return;
      const g = function () {
        const r = f.apply(this, arguments);
        try {
          if (name === 'startDrag' && r) { mx.dragMesh = r; mx.dragMeshes.push({ t: now(), m: r }); if (mx.dragMeshes.length > 20) mx.dragMeshes.shift(); }
          if (name === 'showGhost' || name === 'showDayGhost') { if (arguments[0] != null) mx.ghost = { t: now(), where: name === 'showGhost' ? 'week' : 'day', row: name === 'showGhost' ? arguments[0] : null, start: name === 'showGhost' ? arguments[1] : arguments[0], dur: name === 'showGhost' ? arguments[2] : arguments[1], ok: name === 'showGhost' ? arguments[3] : arguments[2] }; }
          if (!quiet.has(name)) { mx.log.push({ t: now(), fn: name, a: sum(name, arguments) }); if (mx.log.length > 400) mx.log.splice(0, 200); }
          else mx.lastDragTo = { t: now(), a: sum(name, arguments) };
        } catch (e) { /* fine */ }
        return r;
      };
      g.__mx = true;
      W[name] = g;
    });
  }
  /* == toasts, as they arrive (they leave on their own) == */
  const watchToasts = () => {
    const box = document.getElementById('toasts');
    if (!box || box.__mx) return;
    box.__mx = true;
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) mx.toasts.push({ t: now(), text: n.textContent, cls: String(n.className) }); }))).observe(box, { childList: true });
  };
  watchToasts();
  setInterval(watchToasts, 500);
  window.addEventListener('error', (e) => mx.errs.push({ t: now(), text: String(e.message || e), at: (e.filename || '') + ':' + (e.lineno || '') }));
  window.addEventListener('unhandledrejection', (e) => mx.errs.push({ t: now(), text: 'rejection ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300) }));
  /* == a panel redrawn while a finger is on it: tiles taken out of the page == */
  const watchSwaps = () => {
    ['rack-body', 'side', 'sheet'].forEach((id) => {
      const box = document.getElementById(id);
      if (!box || box.__mxs) return;
      box.__mxs = true;
      new MutationObserver((ms) => {
        let gone = 0;
        ms.forEach((m) => m.removedNodes.forEach((n) => { if (n.nodeType === 1 && (n.matches && n.matches('.tile, .c-drag') || (n.querySelector && n.querySelector('.tile, .c-drag')))) gone++; }));
        if (gone) { mx.sideSwaps.push({ t: now(), id, gone }); if (mx.sideSwaps.length > 200) mx.sideSwaps.splice(0, 100); }
      }).observe(box, { childList: true, subtree: true });
    });
  };
  watchSwaps();
  setInterval(watchSwaps, 500);
  document.addEventListener('focusin', (e) => { const t = e.target; mx.focusLog.push({ t: now(), el: (t.tagName || '') + (t.id ? '#' + t.id : '') + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ').slice(0, 2).join('.') : ''), text: (t.textContent || '').trim().slice(0, 40) }); if (mx.focusLog.length > 100) mx.focusLog.splice(0, 50); }, true);
  ['pointercancel', 'lostpointercapture', 'touchcancel'].forEach((k) => window.addEventListener(k, (e) => { mx.cancels.push({ t: now(), k, type: e.pointerType || '', target: (e.target && e.target.className && typeof e.target.className === 'string') ? e.target.className.slice(0, 40) : (e.target && e.target.tagName) || '' }); if (mx.cancels.length > 100) mx.cancels.splice(0, 50); }, true));
  /* scrolls inside panels while a finger drags (the list moved instead of the tile) */
  mx.scrolls = [];
  document.addEventListener('scroll', (e) => { const t = e.target; if (t && t !== document) { mx.scrolls.push({ t: now(), el: (t.id || (typeof t.className === 'string' ? t.className.split(' ')[0] : '')), top: Math.round(t.scrollTop || 0) }); if (mx.scrolls.length > 200) mx.scrolls.splice(0, 100); } }, true);

  /* frames the page drew, for the frame rate during a drag (a slow machine changes how drags feel) */
  mx.frames = [];
  const tick = (t) => { mx.frames.push(t); if (mx.frames.length > 600) mx.frames.splice(0, 300); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  mx.fps = (since) => { const f = mx.frames.filter((t) => t >= since); if (f.length < 2) return 0; let worst = 0; for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i] - f[i - 1]); return { fps: Math.round((f.length - 1) / ((f[f.length - 1] - f[0]) / 1000)), worstMs: Math.round(worst) }; };
  mx.mark = () => { const t = now(); mx.t0 = t; return t; };
  mx.since = (t) => ({
    log: mx.log.filter((x) => x.t >= t), toasts: mx.toasts.filter((x) => x.t >= t), errs: mx.errs.filter((x) => x.t >= t),
    swaps: mx.sideSwaps.filter((x) => x.t >= t), focus: mx.focusLog.filter((x) => x.t >= t), cancels: mx.cancels.filter((x) => x.t >= t), scrolls: mx.scrolls.filter((x) => x.t >= t)
  });

  /* == the board's own state == */
  mx.adds = () => {
    const out = {};
    const st = SR.state;
    Object.keys(st.dates || {}).forEach((date) => ((st.dates[date] && st.dates[date].adds) || []).forEach((a) => { out[a.id] = { id: a.id, date, start: a.start, dur: a.dur, name: a.name, src: a.src ? (a.src.type + ':' + (a.src.id || '')) : '', done: !!a.done, dinner: !!a.dinner }; }));
    return out;
  };
  mx.snap = () => ({ adds: mx.adds(), undo: (SR.state && 0) || 0, dinners: JSON.parse(JSON.stringify(SR.state.dinners || {})), meals: JSON.parse(JSON.stringify(SR.state.meals || {})), edits: JSON.stringify(SR.state.dates || {}).length });
  mx.diff = (a, b) => {
    const added = [], moved = [], gone = [];
    Object.keys(b.adds).forEach((id) => { if (!a.adds[id]) added.push(b.adds[id]); else { const x = a.adds[id], y = b.adds[id]; if (x.date !== y.date || x.start !== y.start || x.dur !== y.dur) moved.push({ id, from: [x.date, x.start, x.dur], to: [y.date, y.start, y.dur], name: y.name }); } });
    Object.keys(a.adds).forEach((id) => { if (!b.adds[id]) gone.push(a.adds[id]); });
    const dn = [];
    const ds = new Set(Object.keys(a.dinners).concat(Object.keys(b.dinners)));
    ds.forEach((d) => { if (JSON.stringify(a.dinners[d] || null) !== JSON.stringify(b.dinners[d] || null)) dn.push({ date: d, from: a.dinners[d] || null, to: b.dinners[d] || null }); });
    const ml = [];
    const ms = new Set(Object.keys(a.meals).concat(Object.keys(b.meals)));
    ms.forEach((d) => { if (JSON.stringify(a.meals[d] || null) !== JSON.stringify(b.meals[d] || null)) ml.push({ key: d, from: a.meals[d] || null, to: b.meals[d] || null }); });
    return { added, moved, gone, dinners: dn, meals: ml };
  };
  mx.week = () => SR.M.weekDates(SR.view.focus);

  /* == meshes: is a block drawn? every number finite, it and its parents visible, a real height, on screen == */
  const finiteObj = (m) => { m.updateMatrixWorld(true); return Array.from(m.matrixWorld.elements).every((v) => Number.isFinite(v)); };
  const shownChain = (m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  const inScene = (m) => { let o = m; while (o.parent) o = o.parent; return o.type === 'Scene'; };
  const opacityOf = (m) => { let op = 1; m.traverse((c) => { if (c.material && !Array.isArray(c.material) && c.material.opacity != null && c === m) op = c.material.opacity; }); return op; };
  mx.meshState = (m) => {
    if (!m) return null;
    const u = m.userData || {};
    const v = new THREE.Vector3(); m.getWorldPosition(v);
    const s = W.toScreen ? (() => { const p = v.clone().project(W.camera); const r = document.getElementById('stage').getBoundingClientRect(); const c = (document.querySelector('#stage canvas') || {}).getBoundingClientRect ? document.querySelector('#stage canvas').getBoundingClientRect() : r; return { x: Math.round(c.left + (p.x + 1) / 2 * c.width), y: Math.round(c.top + (1 - p.y) / 2 * c.height), behind: p.z > 1 }; })() : null;
    return {
      key: u.key, visible: m.visible, shown: shownChain(m), inScene: inScene(m), finite: finiteObj(m), sy: num(m.scale.y), sx: num(m.scale.x), y: num(v.y),
      held: !!u.held, heldT: num(u.heldT || 0), inHand: !!u.inHand, shrink: u.shrink == null ? null : num(u.shrink), grow: u.grow == null ? null : num(u.grow), back: !!u.back,
      pressK: num(u.pressK), opacity: num(opacityOf(m)), screen: s,
      onScreen: !!s && !s.behind && s.x >= 0 && s.y >= 0 && s.x <= innerWidth && s.y <= innerHeight
    };
  };
  mx.meshesFor = (id) => {
    const out = [];
    const D = W.debug;
    [['week', D.week.blocks], ['day', D.dayb.blocks]].forEach(([where, map]) => map.forEach((m, key) => {
      const u = m.userData, b = u.block || {};
      if (key.indexOf('add:' + id) >= 0 || b.add === id) out.push(Object.assign({ where }, mx.meshState(m)));
    }));
    return out;
  };
  /* a block counts as drawn when one mesh for it is finite, shown, in the scene, full height, and on screen
     (on a board that's showing) */
  mx.drawn = (id) => {
    const ms = mx.meshesFor(id);
    const boardOn = (w) => (w === 'day' ? SR.view.zoom === 'day' : SR.view.zoom === 'week' || SR.view.zoom === 'day');
    const good = ms.filter((m) => m.finite && m.shown && m.inScene && m.sy > 0.5 && !m.held && m.shrink == null && boardOn(m.where));
    const bad = ms.filter((m) => !m.finite || (boardOn(m.where) && (!m.shown || m.sy <= 0.5)));
    return { n: ms.length, good: good.length, bad: bad.map((m) => ({ where: m.where, key: m.key, finite: m.finite, shown: m.shown, visible: m.visible, sy: m.sy, held: m.held, inHand: m.inHand, shrink: m.shrink, grow: m.grow })), onScreen: good.some((m) => m.onScreen), meshes: ms.map((m) => ({ where: m.where, key: m.key, finite: m.finite, shown: m.shown, sy: m.sy, y: m.y, held: m.held, inHand: m.inHand, onScreen: m.onScreen })) };
  };
  /* the block in hand right now */
  mx.handState = () => { const m = mx.dragMesh; if (!m) return null; return mx.meshState(m); };
  /* V11, lift and place: how far above a finger the block in hand rides (px; 0 with a mouse or nothing in hand) */
  mx.aimLift = () => (W && W.touchLift ? W.touchLift() : 0);
  mx.stepDesk = (n = 240, dt = 0.05) => { for (let i = 0; i < n; i++) W.step(dt); W.render(); return true; };
  /* wait, in real time, until the desk has stopped moving (the camera settled), up to ms */
  mx.still = async (ms = 2000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (W.idle) return Math.round(performance.now() - t0); await new Promise((r) => setTimeout(r, 50)); } return -1; };

  /* == where things are == */
  mx.rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) }; };
  mx.visible = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)); const at = document.elementFromPoint(cx, cy); return !!at && (at === el || el.contains(at)); };
  /* the topmost thing at a point, said briefly */
  mx.at = (x, y) => { const e = document.elementFromPoint(x, y); if (!e) return null; return (e.tagName || '') + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ').slice(0, 2).join('.') : ''); };
  mx.onStage = (x, y) => { const e = document.elementFromPoint(x, y); const st = document.getElementById('stage'); return !!e && (e === st || e.parentElement === st); };
  mx.slot = (where, row, min) => { const p = W.slotScreen(where, row, min); return { x: Math.round(p.x), y: Math.round(p.y), behind: p.behind }; };
  /* tiles a drag can start from, in a container */
  mx.tiles = (sel) => Array.from(document.querySelectorAll(sel || '.tile')).filter((e) => e.offsetParent && !e.classList.contains('add')).map((e, i) => ({ i, text: (e.querySelector('.nm') || e).textContent.trim().slice(0, 40), r: mx.rect(e), vis: mx.visible(e) }));
  /* bring a tile into view, centered in its scroller, and say where it is */
  mx.tile = (sel, match) => {
    const all = Array.from(document.querySelectorAll(sel)).filter((e) => e.offsetParent && !e.classList.contains('add') && !e.classList.contains('done'));
    const el = match == null ? all[0] : typeof match === 'number' ? all[match] : all.find((e) => e.textContent.indexOf(match) >= 0);
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const r = mx.rect(el);
    return Object.assign(r, { text: el.textContent.trim().slice(0, 60), vis: mx.visible(el) });
  };
  /* an open stretch on the week or the day for a block this long, from now on, on screen and not under a panel */
  mx.openSpot = (where, dur, o = {}) => {
    const M = SR.M, dates = where === 'day' ? [SR.view.focus] : mx.week();
    const today = SR.today, nowMin = SR.nowMin;
    const skip = o.skip || [];
    const want = [];
    dates.forEach((date, row) => {
      if (date < today && !o.past) return;
      if (skip.includes(date)) return;
      const d = SR.day(date);
      M.gaps(d).forEach((g) => {
        const lo = Math.max(g[0], date === today ? Math.ceil((nowMin + 30) / 15) * 15 : 0, o.from || 0);
        const hi = Math.min(g[1], o.to || 1e9);
        if (hi - lo < dur + 30) return;
        /* a long stretch gives a few places along it, so attempts don't all aim at one spot */
        const n = Math.max(1, Math.floor((hi - lo - 30) / Math.max(90, dur + 30)));
        for (let k = 0; k < n; k++) { const a = lo + (hi - lo) * k / n, b = lo + (hi - lo) * (k + 1) / n; want.push({ date, row, lo: Math.round(a), hi: Math.round(b), mid: Math.round((a + b) / 2 / 15) * 15 }); }
      });
    });
    const ok = [];
    for (const w of want) {
      const m = Math.max(w.lo + dur / 2, Math.min(w.hi - dur / 2, w.mid));
      const p = mx.slot(where === 'day' ? 'day' : 'week', where === 'day' ? null : w.row, m);
      if (p.behind || p.x < 8 || p.y < 8 || p.x > innerWidth - 8 || p.y > innerHeight - 8) continue;
      if (!mx.onStage(p.x, p.y)) continue;
      ok.push({ date: w.date, row: w.row, min: m, x: p.x, y: p.y, lo: w.lo, hi: w.hi });
    }
    if (o.pick === 'last') return ok[ok.length - 1] || null;
    if (typeof o.pick === 'number') return ok[o.pick % Math.max(1, ok.length)] || null;
    return ok[0] || null;
  };
  /* places a block this long can go with nothing moving (inside soft blocks like Work too), spread out */
  mx.placeSpots = (where, dur, o = {}) => {
    const M = SR.M, dates = where === 'day' ? [SR.view.focus] : mx.week();
    const out = [];
    dates.forEach((date, row) => {
      if (date < SR.today && !o.past) return;
      if ((o.skip || []).includes(date)) return;
      const d = SR.day(date);
      const lo = Math.max(d.wake || 360, date === SR.today ? Math.ceil((SR.nowMin + 30) / 15) * 15 : 0);
      let run = null;
      const flush = () => { if (run && run.b - run.a >= 0) { const span = run.b - run.a; const n = Math.max(1, Math.floor(span / 120) + 1); for (let k = 0; k < n; k++) { const s = Math.round((run.a + (span * (k + 0.5)) / n) / 15) * 15; out.push({ date, row, start: s, min: s + dur / 2 }); } } run = null; };
      for (let s = lo; s + dur <= (d.bed || 1380); s += 15) {
        const r = M.canPlace(SR.state, date, dur, s);
        const clean = r && r.ok && !(r.pushes || []).some((p) => p.delta);
        if (clean) { if (!run) run = { a: s, b: s }; else run.b = s; } else flush();
      }
      flush();
    });
    return out.map((s) => { const p = mx.slot(where === 'day' ? 'day' : 'week', where === 'day' ? null : s.row, s.min); return Object.assign(s, { x: p.x, y: p.y, ok: !p.behind && p.x > 8 && p.y > 8 && p.x < innerWidth - 8 && p.y < innerHeight - 8 && mx.onStage(p.x, p.y) }); }).filter((s) => s.ok);
  };
  /* a block of the board's own to move: a placed block (add) on the week or the day, on screen */
  mx.addOnBoard = (where, o = {}) => {
    const D = W.debug, map = where === 'day' ? D.dayb.blocks : D.week.blocks;
    const list = [];
    map.forEach((m, key) => {
      const u = m.userData, b = u.block || {};
      if (!b.add || b.dinner || b.fixed || u.shrink != null || !m.visible) return;
      if (u.date < SR.today && !o.past) return;
      const s = mx.meshState(m);
      if (!s.onScreen || !mx.onStage(s.screen.x, s.screen.y)) return;
      list.push({ id: b.add, key, date: u.date, start: b.start, dur: b.dur, name: b.name, x: s.screen.x, y: s.screen.y });
    });
    return o.all ? list : list[o.pick || 0] || null;
  };
  /* the chip the board shows while carrying */
  mx.chip = () => { const c = document.getElementById('chip'); return c && !c.hidden ? c.textContent : null; };
  /* the tile copy in hand (an HTML ghost) */
  mx.dragtile = () => { const g = document.getElementById('dragtile'); if (!g || g.hidden) return null; const r = g.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), op: getComputedStyle(g).opacity }; };
  mx.ghostDom = () => { const g = document.querySelector('.c-ghost-block'); if (!g) return null; const r = g.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) }; };
  /* what's showing: mode, zoom, the reset step, panels */
  mx.where = () => ({ mode: SR.view.mode, zoom: SR.view.zoom, focus: SR.view.focus, step: SR.view.reset ? SR.view.reset.step : null, phone: !!SR.view.phone, phoneDesk: !!SR.view.phoneDesk, preview: !!SR.view.preview, calm: !!SR.view.calm, w: innerWidth, h: innerHeight, body: document.body.className });
  return 'probe ready';
})();
