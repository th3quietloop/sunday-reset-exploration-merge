/* The drag gate's paths, in the page (window.__mx.paths). Each path opens the place a drag starts from
   (setup), says where the next attempt picks something up and where it puts it (plan), and says what
   should have happened (check). Coordinates are CSS pixels in the viewport. Needs lib/probe.js first. */
(() => {
  const mx = window.__mx;
  if (!mx) return 'load probe.js first';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s, root) => (root || document).querySelector(s);
  const $$ = (s, root) => Array.from((root || document).querySelectorAll(s));
  const shown = (e) => !!e && !!e.offsetParent;
  const btn = (re, root) => $$('button, [role=button]', root).find((e) => shown(e) && re.test(e.textContent.trim()));
  const M = () => SR.M;
  /* the way the list around a piece scrolls ('y' or 'x'), or null, read the way the app reads it (app.js
     scrollAxis): a finger that swipes along it scrolls, one that presses or moves across it lifts */
  /* ('xy' when a list that scrolls one way sits in one that scrolls the other: then only the hold lifts) */
  const axisOf = (el) => { let x = false, y = false; for (let p = el && el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) y = true; if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) x = true; } return x && y ? 'xy' : x ? 'x' : y ? 'y' : null; };
  mx.axisOf = axisOf;

  /* == the board every run starts from: the made up family, nothing saved, the clock held == */
  mx.boot = async (o = {}) => {
    /* o.real: the board a first visit gets (the made up family as this device's own board, saved as it
       changes), reached the way a person does: Look at a sample week (Look around first until Oct 15) */
    if (o.real) {
      for (let k = 0; k < 20 && !btn(/^(Look at a sample week|Look around first)/); k++) await wait(200);
      const look = btn(/^(Look at a sample week|Look around first)/);
      if (look) { look.click(); await wait(600); }
    } else {
      const close = $$('button').find((b) => /close/i.test(b.getAttribute('aria-label') || '') && shown(b) && b.closest('.k-sheet, .c-intro, .c-setupintro, #sheet, .sheet, [role=dialog]'));
      if (close) { close.click(); await wait(300); }
    }
    if (!o.real && (!(SR.view.preview && SR.view.preview.id === 'sample') || o.fresh)) { await SR.devBoard('sample'); await wait(900); }
    /* (since Oct 15 the welcome has no close mark, and closing it is Look at a sample week, which saves a board:
       under a made up board it's put away as closing the sheet does, with nothing saved) */
    const sheet = document.getElementById('sheet');
    if (!o.real && SR.view.preview && sheet && !sheet.hidden && SR.view.got && SR.view.got.setup && SR.view.got.setup.at === 'welcome') {
      SR.view.got.setup = null; sheet.hidden = true; sheet.className = 'panel sheet';
      const scrim = document.getElementById('scrim'), dr = document.getElementById('drawer');
      if (scrim && (!dr || dr.hidden)) scrim.hidden = true;
      SR.render(); await wait(300);
    }
    if (SR.view.reset) { SR.leaveReset(); await wait(300); }
    if (window.Kit && Kit.v7 && Kit.v7.closeMat) { try { Kit.v7.closeMat(); } catch (e) { /* fine */ } }
    if (o.at != null && !o.real && window.__reset && __reset.at) __reset.at(o.at);
    SR.view.calm = !!o.calm; World.setMotion(!!o.calm); document.body.classList.toggle('calm', !!o.calm);
    SR.view.bigText = !!o.big; document.body.classList.toggle('big-text', !!o.big);
    if (o.move) SR.commit(() => { SR.state.settings.move = Object.assign({}, SR.state.settings.move || {}, { on: true }); });
    SR.render();
    await wait(300);
    return mx.where();
  };
  const settle = async (ms = 700) => { await wait(ms); };
  /* put away what another path left open: the reset, a mat, the setup card, the phone's desk */
  mx.clearFor = async (keep = {}) => {
    if (!keep.reset && SR.view.reset) { SR.leaveReset(); await wait(500); }
    if (!keep.mat && document.querySelector('.c-mat') && window.Kit && Kit.v7) { try { Kit.v7.closeMat(); } catch (e) { /* fine */ } await wait(500); }
    if (!keep.setup) {
      const sh = document.getElementById('sheet');
      if (sh && !sh.hidden) { const x = $$('button', sh).find((b) => /close|not now|later/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent) && shown(b)); if (x) { x.click(); await wait(400); } }
      if (document.querySelector('.c-setup') && window.Kit && Kit.v7) { try { Kit.v7.closeMat(); } catch (e) { /* fine */ } await wait(400); }
    }
    if (!keep.phone && SR.view.phoneDesk && SR.closePhoneDesk) { SR.closePhoneDesk(); await wait(500); }
    /* (a panel a path opened, the to-do panel of todo-step-week and -day, is put away, so the next path finds the
       board as it left it) */
    if (!keep.side && SR.view.sel && !document.getElementById('side').hidden) { SR.view.sel = null; SR.render(); await wait(400); }
  };
  /* a spot on a board, for a block this long, from attempt i (a different day or time each time) */
  const spotFor = (where, dur, i, o = {}) => {
    let all = [];
    let k = 0;
    for (;;) { const s = mx.openSpot(where, dur, Object.assign({ pick: k }, o)); if (!s || all.some((x) => x.date === s.date && x.min === s.min)) break; all.push(s); k++; if (k > 40) break; }
    /* no bare open time (a work day, today): anywhere it goes with nothing moving, Work included */
    if (!all.length || o.soft) all = mx.placeSpots(where, dur, o).map((s) => ({ date: s.date, row: s.row, min: s.min, x: s.x, y: s.y }));
    if (o.away) all = all.filter((s) => s.date !== o.away.date || Math.abs(s.min - o.away.min) >= 120);
    if (!all.length) return null;
    return all[i % all.length];
  };
  /* where a drag is aimed: an open spot (the usual), or for the tries to break it: a locked block, time
     that's over, the desk off the board, back on the panel it came from */
  const targetFor = (where, dur, i, o, from) => {
    const sw = where === 'day' ? 'day' : 'week';
    const rowOf = (date) => (sw === 'day' ? null : mx.week().indexOf(date));
    if (o.target === 'locked') {
      const dates = sw === 'day' ? [SR.view.focus] : mx.week();
      const list = [];
      dates.forEach((date) => {
        if (date < SR.today) return;
        SR.day(date).blocks.forEach((b) => {
          if (!b.fixed || b.sleep || b.dur < 15) return;
          const m = b.start + b.dur / 2, p = mx.slot(sw, rowOf(date), m);
          if (date === SR.today && b.start < SR.nowMin) return;
          if (!p.behind && mx.onStage(p.x, p.y)) list.push({ date, row: rowOf(date), min: m, x: p.x, y: p.y, name: b.label || b.name });
        });
      });
      const s = list[i % Math.max(1, list.length)];
      return s ? { x: s.x, y: s.y, date: s.date, min: s.min, row: s.row, slot: [sw, s.row, s.min], locked: s.name } : null;
    }
    if (o.target === 'past') {
      if (sw === 'week' && rowOf(SR.today) < 0) return null;
      const d = SR.day(SR.today), m = Math.max((d.wake || 360) + 45, SR.nowMin - 150 + (i % 4) * 20);
      if (m >= SR.nowMin - 30) return null;
      const p = mx.slot(sw, rowOf(SR.today), m);
      return { x: p.x, y: p.y, date: SR.today, min: m, row: rowOf(SR.today), slot: [sw, rowOf(SR.today), m], past: true };
    }
    if (o.target === 'off') {
      const p0 = sw === 'day' ? mx.slot('day', null, (World.LANES && World.LANES[World.LANES.length - 1] ? World.LANES[World.LANES.length - 1].from + 60 : 1200)) : mx.slot('week', 6, 720);
      for (const dy of [80, 110, 150, 200, 260]) { const x = p0.x, y = p0.y + dy; if (y < innerHeight - 12 && mx.onStage(x, y) && !mx.pointAt(x, y)) { const hit = World.pick(x, y); if (!hit || (hit.kind !== 'bench' && hit.kind !== 'block')) return { x, y, off: true }; } }
      const p1 = sw === 'day' ? mx.slot('day', null, 720) : mx.slot('week', 3, 300);
      for (const dx of [-90, -130, -180]) { const x = p1.x + dx, y = p1.y; if (x > 12 && mx.onStage(x, y) && !mx.pointAt(x, y)) return { x, y, off: true }; }
      return null;
    }
    if (o.target === 'panel') return { x: Math.round(from.x + 8), y: Math.round(from.y - 24), panel: true };
    const s = spotFor(where, o.dur || 120, i, o);
    return s ? { x: s.x, y: s.y, date: s.date, min: s.min, row: s.row, slot: [sw, sw === 'day' ? null : s.row, s.min] } : null;
  };
  /* where a second finger lands, for the tries with two fingers: on a block, or on open board */
  const secondFor = (o, to) => {
    if (!o.second) return null;
    if (o.second === 'block') {
      let best = null;
      World.debug.week.blocks.forEach((m) => { if (best || !m.visible || m.userData.shrink != null) return; const s = mx.meshState(m); if (s.onScreen && mx.onStage(s.screen.x, s.screen.y) && Math.hypot(s.screen.x - to.x, s.screen.y - to.y) > 60) { const h = World.pick(s.screen.x, s.screen.y); if (h && h.kind === 'block') best = [s.screen.x, s.screen.y]; } });
      if (!best && SR.view.zoom === 'day') World.debug.dayb.blocks.forEach((m) => { if (best || !m.visible) return; const s = mx.meshState(m); if (s.onScreen && mx.onStage(s.screen.x, s.screen.y) && Math.hypot(s.screen.x - to.x, s.screen.y - to.y) > 60) best = [s.screen.x, s.screen.y]; });
      return best;
    }
    const s = mx.placeSpots(SR.view.zoom === 'day' ? 'day' : 'week', 30, {}).find((p) => Math.hypot(p.x - to.x, p.y - to.y) > 70);
    return s ? [s.x, s.y] : null;
  };
  /* the minute and day under a point on the week or the day, as the app reads it */
  mx.pointAt = (x, y) => {
    if (SR.view.zoom === 'day') { const d = World.dayAt(x, y); if (d && d.lane != null) return { where: 'day', date: SR.view.focus, min: Math.round(d.min) }; const m = World.boardAt(x, y); if (m && m.row != null) return { where: 'mini', date: mx.week()[m.row], min: Math.round(m.min) }; return null; }
    const m = World.boardAt(x, y); if (m && m.row != null) return { where: 'week', date: mx.week()[m.row], min: Math.round(m.min) };
    return null;
  };
  /* the add an attempt left behind, taken off again so the next attempt starts from the same board */
  /* (the gate's own Undo says so in a toast, with Redo, that no person put there: it's taken away again, so
     it never sits over the next path's pieces. A drop's own toast stays, as it would for a person) */
  mx.quietUndo = () => { const had = new Set(document.querySelectorAll('#toasts .toast')); SR.undo(); document.querySelectorAll('#toasts .toast').forEach((t) => { if (!had.has(t)) t.remove(); }); };
  mx.undoTo = async (n) => { for (let k = 0; k < 4 && Object.keys(mx.adds()).length !== n; k++) { mx.quietUndo(); await wait(250); } return Object.keys(mx.adds()).length === n; };

  /* == the Sunday Reset's steps with tiles: Your time, To-dos, Moving, People == */
  const stepIndex = (key) => SR.stepsNow().findIndex((s) => (s.key || s.id || s) === key);
  const openStep = async (key) => {
    if (!SR.view.reset) { SR.startReset(SR.M.weekStart(SR.today)); await wait(700); }
    const i = stepIndex(key);
    if (i < 0) return { skip: 'no ' + key + ' step on this board' };
    if (SR.view.reset.step !== i) { SR.goStep(i); await wait(900); }
    return { ok: true, step: i };
  };
  const tilePlan = (scope, i, o = {}) => {
    const all = $$(scope).filter((e) => shown(e) && !e.classList.contains('add') && !e.classList.contains('done') && !e.closest('.done'));
    if (!all.length) return { skip: 'no tiles in ' + scope };
    const el = all[(o.offset || 0) + i % all.length] || all[i % all.length];
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const r = mx.rect(el);
    /* the tile has to be the thing under its own middle (not under the sheet's edge or a toast) */
    const x = Math.min(r.cx, r.x + r.w - 10), y = r.cy;
    return { from: { x, y, text: (el.querySelector('.nm') || el).textContent.trim().slice(0, 40), vis: mx.visible(el), top: mx.at(x, y), axis: axisOf(el) } };
  };
  /* (a tile to press, for the tries that need only the tile: a tap, a drop under a toast) */
  mx.tilePlan = (i) => tilePlan('#rack-body .tile', i, {});
  const resetStep = (key) => ({
    kind: 'tile-board',
    async setup(o) {
      await mx.clearFor({ reset: true });
      if (SR.view.mode !== 'planner') { SR.setMode('planner'); await wait(600); }
      /* Moving is a step when it's on: turn it on, and start the reset again so the step is in it */
      if (key === 'move' && stepIndex('move') < 0) { SR.commit(() => { SR.state.settings.move = Object.assign({}, SR.state.settings.move || {}, { on: true }); }); if (SR.view.reset) { SR.leaveReset(); await wait(400); } }
      const r = await openStep(key);
      if (r.skip) return r;
      if (SR.view.zoom !== 'week') { SR.setZoom('week'); await wait(500); }
      return r;
    },
    async plan(i, o) {
      /* a try to break it: the step opens again and the finger goes down o.reopen ms later */
      if (o.reopen != null) { const k = stepIndex(key); SR.goStep(k > 0 ? 0 : 1); await wait(500); SR.goStep(k); await wait(o.reopen); }
      const p = tilePlan('#rack-body .tile', i, o);
      if (p.skip) return p;
      const t = targetFor('week', 120, i, o, p.from);
      if (!t) return { skip: 'no target (' + (o.target || 'open spot') + ') on the week' };
      p.to = t;
      p.expect = o.target === 'off' || o.target === 'panel' ? 'nothing' : 'land';
      p.second = secondFor(o, t);
      return p;
    }
  });
  mx.paths = {};
  mx.paths['reset-yours'] = resetStep('yours');
  mx.paths['reset-todo'] = resetStep('todo');
  mx.paths['reset-move'] = Object.assign(resetStep('move'), { needs: { move: true } });
  mx.paths['reset-people'] = resetStep('kim');

  /* == the meal board, from the reset's Meals step == */
  mx.paths['reset-meals'] = {
    kind: 'dom-dom',
    async setup() {
      await mx.clearFor({ reset: true, mat: true });
      if (SR.view.mode !== 'planner') { SR.setMode('planner'); await wait(600); }
      const r = await openStep('dinners');
      if (r.skip) return r;
      if (!$('.c-mat')) {
        /* (on a sheet, since Oct 15, the step's one way in says Plan meals) */
        const b = btn(/Open the meal board/) || $$('.c-mealgo').find(shown);
        if (!b) return { skip: 'no Open the meal board button' };
        b.click(); await wait(1400);
      }
      return $('.c-mat') ? { ok: true } : { skip: 'the meal board did not open' };
    },
    async plan(i, o) {
      const mat = $('.c-mat');
      if (!mat) return { skip: 'no meal board' };
      const pieces = $$('.c-piece.c-drag', mat).filter(shown);
      if (!pieces.length) return { skip: 'no meal pieces' };
      const el = pieces[i % Math.min(pieces.length, 6)];
      const kinds = ['dinner', 'lunch', 'breakfast'];
      const empty = () => $$('[data-zone="meal"]', mat).filter((c) => shown(c) && !c.dataset.away && c.dataset.date >= SR.today && !c.querySelector('.c-dblock'));
      /* a phone stacks the meals under the days in one scroller: scroll so the piece sits low and the days
         above it are in view, the way a person holds it before dragging up */
      const scroller = (e) => { while (e && e !== document.body) { const cs = getComputedStyle(e); if (/auto|scroll/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 4) return e; e = e.parentElement; } return null; };
      const sc = scroller(el);
      const cellSc = empty()[0] ? scroller(empty()[0]) : null;
      if (sc && sc === cellSc) {
        const er = el.getBoundingClientRect(), sr = sc.getBoundingClientRect();
        sc.scrollTop += er.top - (sr.top + sr.height * 0.8);
      } else el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      await wait(150);
      const visibleCells = empty().filter((c) => mx.visible(c));
      const want = visibleCells.filter((c) => c.dataset.kind === kinds[i % 3]);
      const pool = want.length ? want : visibleCells;
      let cell = pool[Math.floor(i / 3) % Math.max(1, pool.length)];
      if (!mx.visible(el)) return { skip: 'the piece is covered' };
      /* a screen too short to show a piece and a day at once: carry the piece up to the top edge, let the
         board scroll by itself until the day shows, then put it down there (to.climb) */
      if (!cell) {
        const all = empty().filter((c) => c.getBoundingClientRect().bottom < el.getBoundingClientRect().top);
        cell = all[all.length - 1 - (i % Math.max(1, Math.min(3, all.length)))];
        if (!cell) return { skip: 'no empty meal cell above the piece' };
        const r = mx.rect(el), sr = sc.getBoundingClientRect();
        return { from: { x: r.cx, y: r.cy, text: el.textContent.trim().slice(0, 40), vis: true, top: mx.at(r.cx, r.cy), axis: axisOf(el) }, to: { x: r.cx, y: Math.round(sr.top + 18), date: cell.dataset.date, kind: cell.dataset.kind, sel: '[data-zone="meal"][data-date="' + cell.dataset.date + '"][data-kind="' + cell.dataset.kind + '"]', climb: true }, expect: 'meal' };
      }
      const r = mx.rect(el), t = mx.rect(cell);
      return { from: { x: r.cx, y: r.cy, text: el.textContent.trim().slice(0, 40), vis: mx.visible(el), top: mx.at(r.cx, r.cy), axis: axisOf(el) }, to: { x: t.cx, y: t.cy, date: cell.dataset.date, kind: cell.dataset.kind, top: mx.at(t.cx, t.cy), sel: '[data-zone="meal"][data-date="' + cell.dataset.date + '"][data-kind="' + cell.dataset.kind + '"]' }, expect: 'meal' };
    }
  };

  /* == pieces on the bench (Block library, a to-do stack) onto the week or the day == */
  const benchPieces = () => {
    const out = [];
    World.debug.bench.pieces.forEach((m, key) => {
      const u = m.userData, pc = u.piece || {};
      if (!m.visible || u.shrink != null || !pc.drag) return;
      const s = mx.meshState(m);
      if (!s || !s.onScreen) return;
      const hit = World.pick(s.screen.x, s.screen.y);
      if (!hit || hit.kind !== 'bench' || hit.obj !== m) return;
      if (!mx.onStage(s.screen.x, s.screen.y)) return;
      out.push({ key, label: pc.label || pc.name || key, x: s.screen.x, y: s.screen.y, drag: pc.drag });
    });
    return out;
  };
  mx.benchPieces = benchPieces;
  const openBench = async (which) => {
    /* Block library or To-dos, from the corner bar. Since Oct 15, To-dos in Now opens the To-dos panel at Next 7
       days, and that list's Lay out (the first one) puts its stack on the bench beside the day */
    const re = which === 'lib' ? /^Block library/ : /^To-dos/;
    const on = which === 'lib' ? () => World.benchOn && benchPieces().some((p) => p.drag && p.drag.kind === 'block') : () => World.benchOn && benchPieces().some((p) => p.drag && (p.drag.kind === 'task' || p.drag.kind === 'step'));
    for (let k = 0; k < 3 && !on(); k++) {
      const lay = which === 'lib' ? null : $$('.c-tdlay').find(shown) || btn(/^Lay out$/);
      const b = lay || btn(re);
      if (!b) return { skip: 'no ' + (which === 'lib' ? 'Block library' : 'To-dos') + ' button' };
      b.click(); await wait(1300); mx.stepDesk(120, 0.05);
    }
    return on() ? { ok: true } : { skip: 'the bench did not open' };
  };
  /* a day for the day view with room in it: tomorrow when it has a long gap, then the next days */
  const roomyDay = () => {
    for (let k = 1; k < 7; k++) { const d = M().addDays(SR.today, k); const g = M().gaps(SR.day(d)).filter((x) => x[1] - x[0] >= 150 && x[0] >= 360); if (g.length) return d; }
    return M().addDays(SR.today, 1);
  };
  const benchPath = (which, zoom, mode) => ({
    kind: 'bench-board',
    async setup(o) {
      await mx.clearFor({});
      /* (na: this path isn't on this size. Any other setup skip is a path that broke, and the gate fails it) */
      if (SR.view.phone) return { skip: 'a phone shows its list here, with no bench', na: true };
      if (mode === 'today') { if (SR.view.mode !== 'today') { SR.setMode('today'); await wait(900); } }
      else {
        if (SR.view.mode !== 'planner') { SR.setMode('planner'); await wait(700); }
        if (SR.view.zoom !== zoom) { SR.setZoom(zoom); await wait(800); }
        if (zoom === 'day' && SR.view.focus === SR.today) { SR.setZoom('day', roomyDay()); await wait(900); }
      }
      return openBench(which);
    },
    async plan(i, o) {
      /* the camera eases back in after a drop from the bench: wait for it to rest before aiming */
      await mx.still(2500);
      const all = benchPieces().filter((p) => which === 'lib' ? p.drag.kind === 'block' : (p.drag.kind === 'task' || p.drag.kind === 'step'));
      if (!all.length) return { skip: 'no pieces on the bench' };
      const p = all[i % all.length];
      const where = SR.view.zoom === 'day' ? 'day' : 'week';
      const from = { x: p.x, y: p.y, text: p.label, top: mx.at(p.x, p.y) };
      const t = targetFor(where, 120, i, o, from);
      if (!t) return { skip: 'no target (' + (o.target || 'open spot') + ') on the ' + where };
      return { from, to: t, expect: o.target === 'off' || o.target === 'panel' ? 'nothing' : 'land', second: secondFor(o, t) };
    }
  });
  mx.paths['lib-week'] = benchPath('lib', 'week');
  mx.paths['lib-day'] = benchPath('lib', 'day');
  mx.paths['stack-week'] = benchPath('todo', 'week');
  mx.paths['stack-day'] = benchPath('todo', 'day');
  mx.paths['today-bench'] = benchPath('todo', 'day', 'today');

  /* == a block on the board, moved or stretched == */
  const placeOwn = async (where, dur, i) => {
    /* a Workout of our own, on a day with room, with room after it to stretch into */
    const date = where === 'day' ? SR.view.focus : null;
    const cands = [];
    const dates = date ? [date] : mx.week().filter((d) => d >= SR.today);
    /* on the day board a block stays in one lane, so its two ends are on one line */
    const oneLane = (s) => where !== 'day' || !World.laneOf || World.laneOf(s) === World.laneOf(s + dur + 60);
    dates.forEach((d) => M().gaps(SR.day(d)).forEach((g) => { const lo = Math.max(g[0], d === SR.today ? Math.ceil((SR.nowMin + 30) / 15) * 15 : 360); for (let s = lo + 15; s + dur + 105 <= g[1]; s += 30) { if (oneLane(s)) { cands.push({ date: d, start: s }); break; } } }));
    if (!cands.length) mx.placeSpots(where, dur + 75, {}).forEach((s) => { if ((!date || s.date === date) && oneLane(s.start)) cands.push({ date: s.date, start: s.start }); });
    if (!cands.length) return null;
    const c = cands[i % cands.length];
    const r = __reset.place(c.date, { name: 'Workout', cat: 'yours', icon: 'dumbbell', dur, src: { type: 'block', id: 'workout' } }, c.start);
    if (!r || !r.ok) return null;
    SR.render();
    await wait(400);
    mx.stepDesk(80, 0.05);
    return { id: r.add.id, date: r.date || c.date, start: r.start, dur };
  };
  /* where on screen a block's left edge, middle, and right edge are, along its row or lane */
  /* a minute on a board, on screen, at a height (0 the board, 1 a block's top) */
  mx.slotUp = (where, row, min, up = 0.9) => {
    const w = World.slotWorld(where, row, min);
    w.y += (World.H_HARD || 0.4) * (where === 'day' ? (World.DB_HMUL || 1) : 1) * up;
    const p = w.project(World.camera), r = document.querySelector('#stage canvas').getBoundingClientRect();
    return { x: Math.round(r.left + (p.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - p.y) / 2 * r.height) };
  };
  /* where a placed block's left edge, middle, and right edge are on screen, from its own minutes, on its top */
  mx.blockScreen = (id) => {
    const a = mx.adds()[id];
    if (!a) return [];
    const where = SR.view.zoom === 'day' ? 'day' : 'week';
    const row = where === 'week' ? mx.week().indexOf(a.date) : null;
    if (where === 'week' && row < 0) return [];
    if (where === 'day' && a.date !== SR.view.focus) return [];
    const L = mx.slotUp(where, row, a.start + 1), R = mx.slotUp(where, row, a.start + a.dur - 1), C = mx.slotUp(where, row, a.start + a.dur / 2);
    return [{ where, left: L, mid: C, right: R, y: C.y }];
  };
  const boardPath = (zoom, mode, act) => ({
    kind: act === 'stretch' ? 'stretch' : 'board-board',
    async setup(o) {
      await mx.clearFor({ phone: mode === 'phone' });
      /* a phone shows its own list; its desk is one day (the phone paths) */
      if (mode !== 'phone' && SR.view.phone) return { skip: 'a phone shows its list here; its desk is one day (phone-move)', na: true };
      if (mode === 'today') { if (SR.view.mode !== 'today') { SR.setMode('today'); await wait(900); } }
      else if (mode === 'phone') {
        if (!SR.view.phoneDesk) { SR.openPhoneDesk(); await wait(1200); }
        if (!SR.phoneDay()) return { skip: 'no phone desk at this size', na: true };
        /* tomorrow has room; the phone's day starts on today */
        if (SR.view.focus === SR.today) { SR.shift(1); await wait(900); }
      } else {
        if (SR.view.mode !== 'planner') { SR.setMode('planner'); await wait(700); }
        if (SR.view.zoom !== zoom) { SR.setZoom(zoom); await wait(800); }
        if (zoom === 'day' && SR.view.focus === SR.today) { SR.setZoom('day', roomyDay()); await wait(900); }
      }
      mx.stepDesk(80, 0.05);
      return { ok: true };
    },
    async plan(i, o) {
      const where = SR.view.zoom === 'day' ? 'day' : 'week';
      const dur = o.blockDur || 60;
      /* nothing picked, so the board isn't shifted up for a picked block's tools */
      if (SR.view.pick && SR.openSel) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(300); }
      const own = await placeOwn(where, dur, i);
      if (!own) return { skip: 'no room to place a block to move' };
      await mx.still(2500);
      const bs = mx.blockScreen(own.id)[0];
      if (!bs) return { skip: 'the placed block is not on screen' };
      own.row = where === 'week' ? mx.week().indexOf(own.date) : null;
      if (act === 'stretch') {
        /* V11, lift and place: a finger stretches a picked block from its handle (#sgrip: 44 px, half past
           the block's end), so a finger first picks the block, the way a tap does, then takes the handle.
           o.edge is then measured from the block's end on the handle (minus is inside) */
        if (o.input === 'touch' && SR.selectBlock && World.blockEnd) {
          /* (a finger picks the block with a tap: the page hears a finger, as it would from that tap) */
          document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', isPrimary: true, bubbles: true }));
          SR.selectBlock(own.date, 'add:' + own.id);
          SR.render(); await wait(350); mx.stepDesk(20, 0.05); World.render(); await wait(120);
          const grip = document.getElementById('sgrip');
          if (!grip || grip.hidden) return { skip: 'no stretch handle on the picked block', own };
          const gr = mx.rect(grip);
          const off = o.edge === 'fixed' ? -6 : typeof o.edge === 'number' ? o.edge : 0;
          const gx = Math.round(gr.cx + off), gy = gr.cy;
          const endMin = own.start + own.dur + 45, e = mx.slot(where, own.row, endMin - 4);
          if (where === 'day' && Math.abs(e.y - mx.slot(where, own.row, own.start).y) > 20) return { skip: 'the stretch would cross into the next lane' };
          return { from: { x: gx, y: gy, text: 'Workout stretch handle', nearR: true, hitKind: 'handle', edgePx: gr.w, top: mx.at(gx, gy) }, to: { x: e.x + (gx - gr.cx), y: gy, min: endMin, slot: [where, own.row, endMin - 4], keepY: true }, own, expect: 'stretch' };
        }
        /* the right edge: the middle of the part that stretches (found by asking the board along the
           block's top), pulled 45 minutes later (the pointer goes to the new end). o.edge: 'fixed' grabs
           a set 6 px inside the edge instead, the way a person aims at an edge they can't see */
        const fy = bs.y;
        /* a finger finds the edge the way the app looks for one under a finger (a bigger target, part of it
           right past the block's end: World.pick with edgePx, then World.edgeAt); a mouse, the plain pick */
        const po = o.input === 'touch' ? { edgePx: 22 } : undefined;
        /* (past the end only off the phone's one day, where a sideways swipe on open board changes the day) */
        const hitAt = (x) => { const h = World.pick(x, fy, po); if (h && h.block && h.block.add === own.id) return h; const e = po && World.edgeAt && !SR.phoneDay() ? World.edgeAt(x, fy, 22) : null; return e && e.block && e.block.add === own.id ? e : h; };
        let a = null, b = null;
        for (let x = Math.ceil(bs.right.x) + (po ? 30 : 6); x >= bs.left.x; x--) { const h = hitAt(x); const on = h && h.block && h.block.add === own.id && h.nearR; if (on) { if (b == null) b = x; a = x; } else if (b != null) break; }
        const zone = b == null ? 0 : b - a + 1;
        if (!zone && o.edge == null) return { skip: 'no stretch edge on this block at this size', own };
        /* o.edge: 'fixed' presses 6 px inside the end, a number that far from the end (minus is inside), the
           way a person aims at an edge they can't see; a short block whose middle that would be is skipped */
        const off = o.edge === 'fixed' ? -6 : typeof o.edge === 'number' ? o.edge : null;
        if (off != null && off < 0 && bs.right.x - bs.left.x < -off * 3) return { skip: 'the block is too short to press ' + -off + ' px inside its end', own };
        const fx = off != null ? Math.round(bs.right.x + off) : Math.round((a + b) / 2);
        const hit = hitAt(fx);
        const endMin = own.start + own.dur + 45, e = mx.slot(where, own.row, endMin - 4);
        if (where === 'day' && Math.abs(e.y - mx.slot(where, own.row, own.start).y) > 20) return { skip: 'the stretch would cross into the next lane' };
        return { from: { x: fx, y: fy, text: 'Workout right edge', nearR: !!(hit && hit.nearR), hitKind: hit && hit.kind, edgePx: zone, top: mx.at(fx, fy) }, to: { x: e.x, y: fy, min: endMin, slot: [where, own.row, endMin - 4], keepY: true }, own, expect: 'stretch' };
      }
      /* moved: grab it a third of the way in, and put it on another day (or later the same day) */
      const fx = Math.round(bs.left.x + (bs.right.x - bs.left.x) * 0.35), fy = bs.y;
      const hit = World.pick(fx, fy);
      if (!hit || !hit.block || hit.block.add !== own.id) return { skip: 'a press at the block\'s place finds ' + (hit ? hit.kind + ' ' + ((hit.block && (hit.block.label || hit.block.name)) || '') : 'nothing'), own };
      const s = spotFor(where, dur + 30, i + 1, { away: { date: own.date, min: own.start + dur / 2 } });
      if (!s) return { skip: 'no spot to move it to' };
      /* the hand holds it a third of the way in, so the point it's carried to is that far into the slot */
      const pm = Math.round(s.min - dur / 2 + dur * 0.35), pp = mx.slot(where, where === 'day' ? null : s.row, pm);
      return { from: { x: fx, y: fy, text: 'Workout', nearR: !!(hit && hit.nearR), hitKind: hit && hit.kind, top: mx.at(fx, fy) }, to: { x: pp.x, y: pp.y, date: s.date, min: s.min, row: s.row, slot: [where, where === 'day' ? null : s.row, pm] }, own, expect: 'move' };
    }
  });
  mx.paths['move-week'] = boardPath('week', 'planner', 'move');
  /* a block on the week moved while Block library is open beside it (it puts itself away after a minute) */
  mx.paths['move-week-lib'] = (() => { const p = boardPath('week', 'planner', 'move'); const s0 = p.setup; p.setup = async (o) => { const r = await s0(o); if (r.skip) return r; return openBench('lib'); }; return p; })();
  mx.paths['move-day'] = boardPath('day', 'planner', 'move');
  mx.paths['stretch-week'] = boardPath('week', 'planner', 'stretch');
  mx.paths['stretch-day'] = boardPath('day', 'planner', 'stretch');
  mx.paths['today-move'] = boardPath('day', 'today', 'move');
  mx.paths['phone-move'] = Object.assign(boardPath('day', 'phone', 'move'), { phoneOnly: true });
  mx.paths['phone-stretch'] = Object.assign(boardPath('day', 'phone', 'stretch'), { phoneOnly: true });

  /* == the setup's Try it step (the card) == */
  mx.paths['setup-try'] = {
    kind: 'setup-try',
    async setup() {
      await mx.clearFor({ setup: true });
      /* (opening the setup is a fresh start: toasts left from the paths before don't sit over its tray) */
      /* (a setup closed earlier keeps its pieces in the page, hidden: only ones on screen count) */
      const open = () => $$('.onb-piece, .onb-grip').some(shown);
      if (!open()) { document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()); __reset.openWelcome('preview', 'try'); await wait(1400); }
      return open() ? { ok: true } : { skip: 'the Try it step did not open' };
    },
    async plan(i) {
      /* a block taken off first, so the tray has its pieces */
      const grip = $('.onb-grip');
      if (grip && !$('.onb-piece')) {
        const off = btn(/Take it off|Take .* off|Put it back|Start over/i);
        if (off) off.click();
        /* (while the stretch is being shown the row has no Take it off: the step opens again, fresh) */
        else { __reset.openWelcome('preview', 'try'); await wait(1400); }
      }
      const pieces = $$('.onb-piece').filter(shown);
      if (!pieces.length) return { skip: 'no pieces in the Try it tray' };
      const el = pieces[i % pieces.length];
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const lane = $('.onb-lane') || $('.onb-board [class*=lane]');
      if (!lane) return { skip: 'no lane' };
      const r = mx.rect(el), L = mx.rect(lane);
      /* an open part of tomorrow: the middle of the widest stretch with nothing in it */
      const kids = $$('[data-add], .onb-b, .onb-block', lane).map(mx.rect).sort((a, b) => a.x - b.x);
      let best = { a: L.x, b: L.x + L.w, w: 0 }, x0 = L.x;
      kids.forEach((k) => { if (k.x - x0 > best.w) best = { a: x0, b: k.x, w: k.x - x0 }; x0 = Math.max(x0, k.x + k.w); });
      if (L.x + L.w - x0 > best.w) best = { a: x0, b: L.x + L.w, w: L.x + L.w - x0 };
      return { from: { x: r.cx, y: r.cy, text: el.textContent.trim().slice(0, 30), vis: mx.visible(el), top: mx.at(r.cx, r.cy) }, to: { x: Math.round((best.a + best.b) / 2), y: L.cy, gap: best.w }, expect: 'post', post: "!!document.querySelector('.onb-grip')" };
    }
  };
  /* == the setup's Try it step, its second half: a placed block stretched by its right edge == */
  mx.paths['setup-stretch'] = {
    kind: 'setup-try',
    async setup() { return mx.paths['setup-try'].setup(); },
    async plan(i) {
      /* start each try from a block put in by a tap, at its first roomy spot */
      const off = btn(/^Take it off$/);
      if (off) { off.click(); await wait(300); }
      const pieces = $$('.onb-piece').filter(shown);
      if (!pieces.length) return { skip: 'no pieces in the Try it tray' };
      pieces[i % pieces.length].click();
      await wait(500);
      const grip = $('.onb-grip');
      if (!grip) return { skip: 'no stretch grip after placing' };
      const sheet = document.getElementById('sheet');
      const g = mx.rect(grip), lane = mx.rect($('.onb-lane') || grip.parentElement);
      const want = Math.min(lane.x + lane.w - 6, g.cx + Math.max(40, lane.w * 0.12));
      return { from: { x: g.cx, y: g.cy, text: 'the placed block\'s right edge', w: g.w, top: mx.at(g.cx, g.cy) }, to: { x: Math.round(want), y: g.cy }, expect: 'post', post: "(document.getElementById('sheet').textContent || '').includes('whole idea')" };
    }
  };
  /* == the setup on the desk: the name's letters onto the rack, then who's at home into its row == */
  const deskOpen = async (fresh) => {
    if (fresh && $('.c-setup')) { try { Kit.v7.closeMat(); } catch (e) { /* fine */ } await wait(600); }
    if (!$('.c-setup')) { Kit.v7.openDeskSetup({ preview: true }); await wait(1600); }
    return !!$('.c-setup');
  };
  const deal = async () => {
    const inp = $('.c-setup input');
    if (!inp) return false;
    inp.value = 'Robin'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    const d = btn(/Deal my letters/, $('.c-setup'));
    if (d) { d.click(); await wait(2200); }
    return $$('.c-su-tile').filter(shown).length > 0;
  };
  mx.paths['desk-letters'] = {
    kind: 'dom-dom',
    async setup() {
      await mx.clearFor({ setup: true, mat: true });
      if (!(await deskOpen())) return { skip: 'the desk setup did not open' };
      if (!$$('.c-su-tile').filter(shown).length && !(await deal())) return { skip: 'no letters dealt' };
      return { ok: true };
    },
    async plan(i) {
      const inRack = (e) => !!e.closest('[data-zone="su-slot"]');
      let tiles = $$('.c-su-tile').filter((e) => shown(e) && !inRack(e));
      const empty = $$('[data-zone="su-slot"]').filter((z) => shown(z) && !z.querySelector('.c-su-tile'));
      if (!tiles.length || !empty.length) { await deskOpen(true); await deal(); tiles = $$('.c-su-tile').filter((e) => shown(e) && !inRack(e)); }
      const slots = $$('[data-zone="su-slot"]').filter((z) => shown(z) && !z.querySelector('.c-su-tile'));
      if (!tiles.length || !slots.length) return { skip: 'no letter or no open slot' };
      const el = tiles[0], z = slots[i % slots.length];
      const r = mx.rect(el), t = mx.rect(z);
      return { from: { x: r.cx, y: r.cy, text: el.textContent.trim(), vis: mx.visible(el), top: mx.at(r.cx, r.cy) }, to: { x: t.cx, y: t.cy, zone: 'su-slot', sel: '[data-zone="su-slot"][data-i="' + z.dataset.i + '"]', i: z.dataset.i, letter: el.textContent.trim(), top: mx.at(t.cx, t.cy) }, expect: 'post', post: "!!document.querySelector('[data-zone=\"su-slot\"][data-i=\"" + z.dataset.i + "\"] .c-su-tile')" };
    }
  };
  mx.paths['desk-home'] = {
    kind: 'dom-dom',
    async setup() {
      await mx.clearFor({ setup: true, mat: true });
      return (await deskOpen()) ? { ok: true } : { skip: 'the desk setup did not open' };
    },
    async plan(i) {
      /* each attempt starts the setup over and answers the name, so the At home row is the open one */
      await deskOpen(true);
      /* the name goes on the rack first: deal the letters, and tap R, O, B, I, N in turn */
      await deal();
      for (const ch of 'ROBIN') {
        const t = $$('.c-su-tile').find((e) => shown(e) && !e.closest('[data-zone="su-slot"]') && e.textContent.trim() === ch);
        if (!t) continue;
        const r = t.getBoundingClientRect();
        /* (a tap the way a mouse sends one: the first pointer, with its id, as the app checks) */
        t.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: r.left + 5, clientY: r.top + 5, bubbles: true, isPrimary: true, pointerId: 1, pointerType: 'mouse' }));
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: r.left + 5, clientY: r.top + 5, bubbles: true, isPrimary: true, pointerId: 1, pointerType: 'mouse' }));
        await wait(260);
      }
      await wait(600);
      const nx = btn(/^Next$/, $('.c-setup'));
      if (nx) { nx.click(); await wait(900); }
      /* the row's own button opens it, if Next stayed on the name */
      if (!$$('.c-su-piece').filter(shown).length) { const row = btn(/^2\s*At home/, $('.c-setup')); if (row) { row.click(); await wait(1200); } }
      const pieces = $$('.c-su-piece').filter(shown);
      if (!pieces.length) return { skip: 'no pieces for At home' };
      const el = pieces[i % pieces.length];
      const zone = $('[data-zone="su-home"]');
      if (!zone) return { skip: 'no At home row' };
      const r = mx.rect(el), z = mx.rect(zone);
      return { from: { x: r.cx, y: r.cy, text: el.textContent.trim().slice(0, 30), vis: mx.visible(el), top: mx.at(r.cx, r.cy) }, to: { x: z.cx, y: z.cy, zone: 'su-home', sel: '[data-zone="su-home"]', top: mx.at(z.cx, z.cy) }, expect: 'post', post: "!!document.querySelector('[data-zone=\"su-home\"] .c-su-placed') || /Robin|Question 3|In the way/.test((document.querySelector('.c-setup') || {}).textContent || '') && !!document.querySelector('[data-zone=\"su-home\"] .c-dblock')" };
    }
  };
  /* == V11-2: a step off a to-do's panel, a brick, onto the week or the day (docs/BIG-MOMENTS.md, A) ==
     Russell, Oct 15: "it wasn't super clear to me that these were blocks that I could drag". Each step is a brick
     now; this is the drag that has to keep working. A to-do of the gate's own, three steps with no time yet, its
     panel open beside the board; each attempt carries one of the outline bricks (Not on your week yet) to an open
     spot. A phone's list has no board beside its sheet (n/a there) */
  const stepPanel = (zoom) => ({
    kind: 'tile-board',
    async setup() {
      await mx.clearFor({});
      if (SR.view.phone) return { skip: 'a phone shows its list here, with no board beside the sheet', na: true };
      if (SR.view.mode !== 'planner') { SR.setMode('planner'); await wait(700); }
      if (SR.view.zoom !== zoom) { SR.setZoom(zoom); await wait(800); }
      if (zoom === 'day' && SR.view.focus === SR.today) { SR.setZoom('day', roomyDay()); await wait(900); }
      if (!SR.taskById('gate-steps')) {
        const due = M().addDays(SR.today, 6);
        window.__reset.edit((s) => {
          const inbox = (s.groups.find((g) => g.id === 'inbox') || s.groups[0]).id;
          s.tasks.push({ id: 'gate-steps', name: 'Renew the car registration', group: inbox, icon: 'car', cat: 'home', due, dur: null, repeat: null, done: false,
            steps: [{ id: 'gate-s1', name: 'Find the notice', dur: 15, done: false }, { id: 'gate-s2', name: 'Pay online', dur: 15, done: false }, { id: 'gate-s3', name: 'Put the sticker on', dur: 15, done: false }] });
        });
        await wait(300);
      }
      if (!(SR.view.sel && SR.view.sel.type === 'task' && SR.view.sel.id === 'gate-steps')) { SR.openSel({ type: 'task', id: 'gate-steps' }); await wait(900); }
      mx.stepDesk(80, 0.05);
      await mx.still(2500);
      if (!$$('#side .c-ts-brick.loose').some(shown)) return { skip: 'the to-do panel did not open with its steps as bricks' };
      /* the board has to be on stage beside the panel. An upright window (the iPad held up) lays the panel over the
         day by design, so there the path isn't on this size; anywhere else no room is a path that broke */
      const where = zoom === 'day' ? 'day' : 'week', room = mx.placeSpots(where, 30, {}).length > 0;
      if (!room) {
        SR.view.sel = null; SR.render(); await wait(300);
        if (innerHeight > innerWidth) return { skip: 'the to-do panel stands over the ' + where + ' on an upright window', na: true };
        return { skip: 'no room on the ' + where + ' beside the to-do panel' };
      }
      return { ok: true };
    },
    async plan(i, o) {
      await mx.still(2500);
      if (!$$('#side .c-ts-brick.loose').some(shown)) { SR.openSel({ type: 'task', id: 'gate-steps' }); await wait(900); }
      const p = tilePlan('#side .c-ts-brick.loose', i, o);
      if (p.skip) return p;
      const where = SR.view.zoom === 'day' ? 'day' : 'week';
      const t = targetFor(where, 120, i, o, p.from);
      if (!t) return { skip: 'no target (' + (o.target || 'open spot') + ') on the ' + where };
      p.to = t;
      p.expect = o.target === 'off' || o.target === 'panel' ? 'nothing' : 'land';
      p.second = secondFor(o, t);
      return p;
    }
  });
  mx.paths['todo-step-week'] = stepPanel('week');
  mx.paths['todo-step-day'] = stepPanel('day');
  return Object.keys(mx.paths).join(' ');
})();
