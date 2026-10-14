/* Sunday Reset: the app. The board state, the tray of tiles, dragging, zooming, the side panel,
   and the Sunday Reset itself. The model (src/model.js) does the time math; this file shows it. */
(function () {
  'use strict';
  const M = window.Model, D = window.Data, Snd = window.Sound, Icons = window.Icons, Store = window.Store;
  const $ = (id) => document.getElementById(id);
  /* Only fixed error categories go in Help. Messages and stacks can contain planner data. */
  const errLog = [];
  const logError = (kind, error) => { errLog.push(window.Diagnostics.error(kind, error)); while (errLog.length > 12) errLog.shift(); };
  window.addEventListener('error', (e) => logError('runtime', e.error));
  window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason));
  /* The desk needs WebGL and Three.js. Without them (an old machine, a blocked network, a browser
     setting) the week still opens, as a list, with every block one tap from its panel. */
  const glOk = (() => {
    /* ?nodesk opens the list the way a machine without WebGL would, for trying it */
    if (!window.THREE || !window.World || new URLSearchParams(location.search).has('nodesk')) return false;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      /* browsers only allow so many of these at once; this one was only a question */
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  })();
  /* the inks the HUD draws its marks in, the same as --ink, --soft, and --gold in style.css */
  const UI = { white: '#FFFFFF', ink: '#F2EEE6', soft: '#E4DFD6', gold: '#F2CF7A', dark: '#2A2A28' };
  /* the key this machine undoes with */
  const MODKEY = /Mac|iPhone|iPad/.test((navigator.platform || '') + ' ' + (navigator.userAgent || '')) ? 'Cmd' : 'Ctrl';
  function stubWorld() {
    const fixed = { layout: 'week', userZoom: 1, framed: true, quality: 'full', busy: false, idle: true, lazy: false, light: {}, stats: null, benchOn: false, BOARD_Y: 0, H_HARD: 0, DB_HMUL: 1, props: {}, debug: {} };
    const noop = () => null;
    return new Proxy({}, {
      get(t, k) {
        if (k in fixed) return fixed[k];
        if (k === 'look') return (b) => { const c = (window.Data.CATS[b.cat] || window.Data.CATS.yours); return { base: c.base, ink: c.ink }; };
        if (k === 'toScreen') return () => ({ x: 0, y: 0 });
        return noop;
      },
      set() { return true; }
    });
  }
  let W = glOk ? window.World : stubWorld();
  let noDesk = !glOk;
  /* feel (V11, docs/CORNERS-V11.md): a block's clack plays when it touches the board, a drop that doesn't
     fit flies home, the block in hand casts a shadow and sways, and panels, tools, and toasts move too.
     Only a version whose page carries the class `feel` has it; every other version is as it was. */
  const FEEL = document.body.classList.contains('feel');
  const OUT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)', IN_EASE = 'cubic-bezier(0.4, 0, 1, 1)';
  const feelMoves = () => { if (!FEEL || view.calm) return false; try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };
  const stage = $('stage');
  /* moves into the tray bar on every render, so keep a handle on it */
  const viewctl = $('viewctl'), zbtn = { out: $('zout'), fit: $('zfit'), in: $('zin') };
  const ZOOMS = ['day', 'week', 'month', 'year'];
  const VIEW_KEY = 'sundayreset.view';

  let state = null, ready = false;
  let today = M.todayIso(), nowMin = 0;
  const view = { desk: { theme: 'warm', layout: 'full' }, mode: 'planner', zoom: 'week', focus: today, tab: 'todo', level: null, collapsed: true, collapsedDay: true, arrange: 'beside', lamp: true, sel: null, reset: null, confirm: null, suggest: null, got: {}, bench: null, pick: null, dockOpen: false,
    /* per device, kept with the view: the week as a list, a 24 hour clock, larger text, a lighter desk,
       sound, calmer motion, light held at midday, and what's on the tray bar (null is the usual bar) */
    list: false, clock24: false, bigText: false, lowPower: false, sound: null, calm: null, steady: false, bar: null, setPage: null };
  /* Today is the desk for right now; the Planner is everything else. A phone always gets its own Today. */
  const inToday = () => view.mode === 'today' && !view.phone;
  /* The tray starts folded in every view and opens when you tap a tab. It remembers how you left it.
     In Today it's the dock: three tabs in the corner that open the tray and fold again. */
  const trayCollapsed = () => (inToday() ? !view.dockOpen : view.zoom === 'day' ? view.collapsedDay !== false : !!view.collapsed);
  function setTrayCollapsed(on) { if (inToday()) { view.dockOpen = !on; return; } if (view.zoom === 'day') view.collapsedDay = on; else view.collapsed = on; saveView(); }
  let undoStack = [], redoStack = [];
  const cache = new Map();
  const day = (date) => { let d = cache.get(date); if (!d) { d = M.calendarDay(state, date); cache.set(date, d); } return d; };
  const boardDay = (date) => { const key = 'board:' + date; let d = cache.get(key); if (!d) { d = M.resolveWindow(state, date); cache.set(key, d); } return d; };
  function boardTime(date, min) {
    const h = M.visibleHours(state), at = M.dateTime(date, min);
    return h.end > 1440 && at.start < h.end - 1440
      ? { date: M.addDays(at.date, -1), start: at.start + 1440 } : at;
  }
  function timeSpan(date, start, end) {
    const a = M.dateTime(date, start), b = M.dateTime(date, end);
    if (a.date !== b.date) return (a.date !== date ? M.dateText(a.date, 'day') + ' · ' : '') + M.clock(a.start) + ' to ' + M.dateText(b.date, 'day') + ' ' + M.clock(b.start);
    return (a.date !== date ? M.dateText(a.date, 'day') + ' · ' : '') + M.span(a.start, b.start);
  }
  function canPlaceWindow(date, dur, start, key) {
    const at = M.dateTime(date, start), r = M.canPlace(state, at.date, dur, at.start, key);
    const land = M.dateTime(r.date || at.date, r.start == null ? at.start : r.start);
    return Object.assign({}, r, { actualDate: land.date, actualStart: land.start, start: M.windowTime(date, land.date, land.start) });
  }
  function magnetWindow(date, start, dur, key) {
    const at = M.dateTime(date, start), m = M.magnet(state, at.date, at.start, dur, key);
    return M.windowTime(date, at.date, m);
  }
  const sourceDate = (b, date) => b.sourceDate || date;
  const sourceKey = (b) => b.sourceKey || b.base;
  const sourceMinute = (b, date, min) => M.windowTime(sourceDate(b, date), date, min);
  const sourceSpan = (b, date) => ({ start: M.windowTime(date, sourceDate(b, date), b.sourceStart == null ? b.start : b.sourceStart), dur: b.sourceDur == null ? b.dur : b.sourceDur });

  /* == small helpers == */
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  /* A mark is drawn once for each size and color, and copied after that: a render makes a hundred
     of them, and the clock redraws some every minute. */
  const iconCache = new Map();
  function icon(name, size, color) {
    const px = Math.round((size || 24) * 2), key = name + '|' + px + '|' + (color || '#FFFFFF');
    let src = iconCache.get(key);
    if (!src) {
      src = document.createElement('canvas');
      src.width = px; src.height = px;
      Icons.draw(src.getContext('2d'), name, px / 2, px / 2, px * 0.92, color || '#FFFFFF');
      if (iconCache.size > 400) iconCache.clear();
      iconCache.set(key, src);
    }
    const c = document.createElement('canvas');
    c.width = px; c.height = px;
    c.setAttribute('aria-hidden', 'true');
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }
  function button(text, cls, fn) { const b = el('button', cls || 'small', text); b.type = 'button'; b.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); fn(e); }); return b; }
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  /* Names come from the profile, never from code: Russell's board says Kim and Elijah, someone else's says theirs. */
  const who = () => (state && state.profile) || D.RUSSELL;
  const partner = () => who().partner || '';
  const usName = () => (partner() ? 'You and ' + partner() : 'Together');
  /* kids' names as people type them: Robin, Max and Lee is three, never one called "Max and Lee" */
  const nameList = (v) => String(v || '').split(/\s*(?:,|;|&|\+|\band\b)\s*/i).map((x) => x.trim()).filter((x, k, all) => x && all.indexOf(x) === k);
  const withName = () => (partner() ? 'With ' + partner() : 'Together');
  /* App copy names people with {partner} and {kid}. Russell's own week (his shapes, the steps a to do
     breaks into) was written with his family's names, so on anyone else's board those two words
     become that board's people. */
  function named(text) {
    if (!text) return text;
    const p = who(), pn = p.partner || 'your partner', kn = (p.kids || [])[0] || 'your kid';
    const out = text.replace(/\{partner\}/g, () => pn).replace(/\{kid\}/g, () => kn);
    if (p.partner === 'Kim' && (p.kids || [])[0] === 'Elijah') return out;
    return out.replace(/\bKim\b/g, () => pn).replace(/\bElijah\b/g, () => kn);
  }
  /* block colors: the theme's palette when it has one (Pastel), laid over the named kinds of time */
  let palMemo = { id: '', pal: null };
  function palette() {
    const id = view.desk.theme;
    if (palMemo.id !== id) {
      const r = id !== 'warm' && window.DeskThemes ? DeskThemes.resolve(id) : null;
      const pal = {};
      Object.keys(D.CATS).forEach((k) => { pal[k] = Object.assign({}, D.CATS[k], r && r.blocks && r.blocks[k] ? r.blocks[k] : {}); });
      palMemo = { id, pal };
    }
    return palMemo.pal;
  }
  /* Time to yourself is good news, never a grade (window.SR_kindYours): it reads "to yourself", shows only
     when there is some, and the reset invites more instead of reporting zero. Without the switch the board says "yours" as always. */
  const kindYours = () => !!window.SR_kindYours;
  const yoursWord = () => (kindYours() ? 'to yourself' : 'yours');
  const cat = (c) => (c === 'us' ? Object.assign({}, palette().us, { name: usName() }) : palette()[c] || palette().yours);
  /* the parts of the week the board helps with: dinners and time together can each be left out */
  const modules = () => Object.assign({ dinners: true, together: true }, state && state.settings && state.settings.modules);
  const useDinners = () => modules().dinners !== false;
  const useTogether = () => modules().together !== false;
  /* Block library: the blocks you drag onto a day, less any you hid (a hidden block still serves the
     kinds of day that use it, and comes back from Settings) */
  const library = () => state.palette.filter((x) => !x.hidden);
  /* a date said the way a person would: tonight, tomorrow, Thursday, or Oct 9 */
  function whenWord(date, evening) {
    const n = M.diffDays(today, date);
    if (n === 0) return evening ? 'tonight' : 'today';
    if (n === 1) return evening ? 'tomorrow night' : 'tomorrow';
    if (n === -1) return 'yesterday';
    if (n > 1 && n < 7) return 'on ' + M.DAY_LONG[M.weekday(date)];
    return 'on ' + M.dateText(date);
  }
  const cookName = (id, past) => {
    if (id === 'kim') return (partner() || 'Someone') + (past ? ' cooked' : ' cooks');
    const c = D.COOKS.find((x) => x.id === id); return c ? (past ? c.past : c.name) : '';
  };
  /* a dinner whose time is over isn't a question any more: it reads Not planned, quietly */
  const dinnerOver = (b, date) => date < today || (date === today && b.start + b.dur <= nowMin);
  /* the small line under a dinner block: how it's happening, unless the name already says so */
  function dinnerSub(b, date) {
    /* a board that doesn't plan dinners never asks about one */
    if (!b.planned) return !useDinners() ? '' : dinnerOver(b, date) ? 'Not planned' : 'Not picked yet';
    const s = cookName(b.cook, date && date < today);
    return s && s !== b.label ? s : '';
  }
  /* steps a to do might break into, in this board's own names */
  /* a suggested step about a partner or a kid only shows on a board that has one */
  const suggested = (name) => M.suggestSteps(name, D).filter((x) => !(/\{partner\}/.test(x.name) && !partner()) && !(/\{kid\}/.test(x.name) && !(who().kids || []).length)).map((x) => Object.assign({}, x, { name: named(x.name) }));
  const taskById = (id) => state.tasks.find((t) => t.id === id);
  const groupName = (id) => { const g = state.groups.find((x) => x.id === id); return g ? g.name : 'To do'; };
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  /* A toast stays while the pointer or the keyboard is on it, so a button in it (Undo) never goes
     away under your hand; its clock starts again when you leave. */
  /* feel: a toast rises in and fades down out, the stack slides when one comes or goes, and one you pointed
     at leaves cleanly when you let it go */
  function toastFeel(text, kind, act) {
    const box = $('toasts');
    const t = el('div', 'toast feel' + (kind ? ' ' + kind : '') + (act ? ' act' : ''), text);
    const still = !feelMoves();
    /* the toasts already showing slide to make room instead of jumping (first, last, invert, play) */
    const slide = (change) => {
      const was = new Map(Array.from(box.children).map((x) => [x, x.getBoundingClientRect().top]));
      change();
      if (still) return;
      Array.from(box.children).forEach((x) => { const y0 = was.get(x); if (y0 == null || x._gone) return; const dy = y0 - x.getBoundingClientRect().top; if (Math.abs(dy) > 0.5) x.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 200, easing: OUT_EASE, composite: 'add' }); });
    };
    const leave = (x, quick) => {
      if (!x || x._gone) return;
      x._gone = true; clearTimeout(x._timer);
      if (still) { x.remove(); return; }
      x.style.pointerEvents = 'none';
      const a = x.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(6px) scale(0.98)' }], { duration: quick ? 110 : 170, easing: IN_EASE, fill: 'forwards' });
      const done = () => { if (x.isConnected) slide(() => x.remove()); };
      a.onfinish = done;
      setTimeout(done, 450);
    };
    if (act) t.appendChild(button(act.label, 'toast-act', () => { leave(t, true); act.fn(); }));
    slide(() => box.appendChild(t));
    if (!still) t.animate([{ opacity: 0, transform: 'translateY(12px) scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: OUT_EASE });
    const life = act ? 6300 : 3300;
    t._timer = setTimeout(() => leave(t), life);
    if (act) {
      const hold = () => { clearTimeout(t._timer); };
      const go = () => { clearTimeout(t._timer); t._timer = setTimeout(() => leave(t), 2600); };
      t.addEventListener('pointerenter', hold); t.addEventListener('pointerleave', go); t.addEventListener('focusin', hold); t.addEventListener('focusout', go);
    }
    const live = Array.from(box.children).filter((x) => !x._gone);
    while (live.length > 3) leave(live.shift(), true);
  }
  function toast(text, kind, act) {
    if (FEEL) { toastFeel(text, kind, act); return; }
    const t = el('div', 'toast' + (kind ? ' ' + kind : '') + (act ? ' act' : ''), text);
    if (act) t.appendChild(button(act.label, 'toast-act', () => { t.remove(); act.fn(); }));
    $('toasts').appendChild(t);
    const life = act ? 6300 : 3300;
    let timer = setTimeout(() => t.remove(), life);
    const hold = () => { clearTimeout(timer); t.classList.add('held'); };
    const go = () => { clearTimeout(timer); t.classList.remove('held'); timer = setTimeout(() => t.remove(), 2600); };
    if (act) { t.addEventListener('pointerenter', hold); t.addEventListener('pointerleave', go); t.addEventListener('focusin', hold); t.addEventListener('focusout', go); }
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  }
  function saveView() { try { localStorage.setItem(VIEW_KEY, JSON.stringify({ v: 3, zoom: inToday() && view.plannerAt ? view.plannerAt.zoom : view.zoom, tab: view.tab, collapsed: view.collapsed, collapsedDay: view.collapsedDay, arrange: view.arrange, lamp: view.lamp, desk: view.desk, list: view.list, clock24: view.clock24, bigText: view.bigText, lowPower: view.lowPower, sound: view.sound, calm: view.calm, steady: view.steady, bar: view.bar })); } catch (e) { /* fine */ } }
  function loadView() {
    try {
      const v = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null');
      if (!v) return;
      if (ZOOMS.includes(v.zoom)) view.zoom = v.zoom;
      if (['todo', 'dinners', 'kim', 'blocks'].includes(v.tab)) view.tab = v.tab;
      /* views saved before the tray folded by default start folded once */
      if (v.v >= 2) { view.collapsed = !!v.collapsed; if (v.collapsedDay != null) view.collapsedDay = !!v.collapsedDay; }
      /* Block library moved beside the day by default; views saved before that start there once */
      if (v.v >= 3 && (v.arrange === 'below' || v.arrange === 'beside')) view.arrange = v.arrange;
      if (v.lamp === false) view.lamp = false;
      ['list', 'clock24', 'bigText', 'lowPower', 'sound', 'calm', 'steady'].forEach((k) => { if (v[k] != null) view[k] = !!v[k]; });
      if (Array.isArray(v.bar)) view.bar = v.bar.filter((x) => typeof x === 'string').slice(0, 8);
      const K = window.DeskThemes;
      if (v.desk && K) view.desk = { theme: K.THEMES[v.desk.theme] ? v.desk.theme : 'warm', layout: K.LAYOUTS[v.desk.layout] ? v.desk.layout : 'full' };
    } catch (e) { /* fine */ }
  }

  /* == changing things == */
  /* Every save goes through here. A preview of someone else's setup is never saved, and neither is a
     board this build couldn't read (so an older copy never overwrites newer data). */
  let readOnly = false;
  function persist() { if (!view.preview && !readOnly) Store.save(state); }
  function changed() { cache.clear(); persist(); render(); }
  /* Run a change with undo. fn returns false or { ok: false } to cancel. */
  function commit(fn) {
    const snap = JSON.stringify(state);
    let r;
    try { r = fn(); } catch (e) { console.error(e); logError('change', e); r = false; oops('That didn’t work, and nothing changed.'); }
    if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); cache.clear(); render(); return r || false; }
    undoStack.push(snap);
    redoStack = [];
    [view.pick, view.sel && view.sel.type === 'block' ? view.sel : null].filter(Boolean).forEach((sel) => {
      if (!sel.key || !sel.key.startsWith('add:')) return;
      const found = M.findAdd(state, sel.key.slice(4));
      if (!found) return;
      sel.date = found.date;
      if (sel === view.pick) { const at = boardTime(found.date, found.add.start); sel.displayDate = at.date; const shown = M.resolveWindow(state, at.date).blocks.find((b) => b.add === found.add.id); sel.displayKey = shown ? shown.key : sel.key; }
    });
    /* keep undo under about 8 MB, but always the last 10 steps */
    let size = undoStack.reduce((a, x) => a + x.length, 0);
    while (undoStack.length > 10 && (undoStack.length > 80 || size > 8e6)) size -= undoStack.shift().length;
    changed();
    /* Getting started: anything placed on a day ticks Put a block on a day */
    if (r && r.ok && r.add) noteMove('place');
    return r;
  }
  /* Something broke that the person didn't cause. Say so once, plainly, with a way to tell us. */
  let oopsAt = 0;
  function oops(text) {
    if (Date.now() - oopsAt < 4000) return;
    oopsAt = Date.now();
    toast(text, 'bad', { label: 'Tell us', fn: () => openSel({ type: 'feedback' }) });
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return;
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(s);
    Snd.slide();
    toast('Undone', '', { label: 'Redo', fn: redo });
    changed();
  }
  /* one Undo too many is no longer the end of it */
  function redo() {
    const s = redoStack.pop();
    if (!s) return;
    undoStack.push(JSON.stringify(state));
    state = JSON.parse(s);
    Snd.slide();
    toast('Done again');
    changed();
  }
  /* Try a change on a scratch copy of the dates, for a live preview while dragging. */
  function tryOn(fn) {
    const saved = state.dates;
    state.dates = M.clone(saved);
    let r;
    try { r = fn(); } catch (e) { r = { ok: false }; }
    const dates = state.dates;
    state.dates = saved;
    return { r: r || { ok: false }, dates };
  }
  function daysWith(dates, list) {
    const saved = state.dates;
    state.dates = dates;
    const out = {};
    list.forEach((d) => { out[d] = M.resolveWindow(state, d); });
    state.dates = saved;
    return out;
  }

  /* == what the board shows == */
  const weekOf = () => M.weekDates(view.focus);
  function decorate(b, date) {
    const o = Object.assign({}, b);
    if (b.dinner) { o.label = b.label; o.sub = date ? dinnerSub(b, date) : ''; }
    else if (b.sleep) o.sub = '';
    /* a piece in hand from the tray or Block library has no day yet: its time is the plain span */
    else o.sub = date ? timeSpan(date, b.start, b.start + b.dur) : M.span(b.start, b.start + b.dur);
    return o;
  }
  function rowSpec(date, pd) {
    const d = pd || boardDay(date);
    return {
      date, wd: M.DAY_SHORT[d.wd], num: M.parts(date).d, today: date === today, focus: view.zoom === 'day' && date === view.focus,
      markers: d.markers.map((m) => m.name), markerIcon: d.markers[0] ? d.markers[0].icon : '', trip: d.trip ? d.trip.name : '',
      due: d.due.length, blocks: d.blocks.map((b) => decorate(b, date)), gaps: M.gaps(d)
    };
  }
  const aheadMode = () => !!(view.reset && stepsNow()[view.reset.step].key === 'ahead' && view.zoom === 'month');
  /* The reset's steps for this board and this run: dinners and time together only when the board helps
     with them, any the board turned off in Settings left out, and a short catch up (to dos, dinners, the
     recap) for a week that's already under way. */
  function stepsNow() {
    const off = (state && state.settings && state.settings.resetOff) || [];
    const catchup = view.reset && view.reset.catchup;
    return D.STEPS.filter((st) => {
      if (st.key === 'done') return true;
      if (catchup) return st.key === 'todo' || (st.key === 'dinners' && useDinners());
      if (st.key === 'dinners' && !useDinners()) return false;
      if (st.key === 'kim' && !useTogether()) return false;
      /* a board that's newer than last week has nothing to look back on yet */
      if (st.key === 'back' && view.reset && nothingBehind(view.reset.week)) return false;
      /* a version of the board can leave steps out of every reset (window.SR_resetSkip) */
      if ((window.SR_resetSkip || []).includes(st.key)) return false;
      return !off.includes(st.key);
    });
  }
  function nothingBehind(ws) { return !!(state.created && state.created > M.addDays(ws, -7)) && firstReset(ws); }
  const stepTitle = (st) => (st.key === 'kim' ? usName() : st.key === 'done' && view.reset && view.reset.catchup ? 'The rest of your week' : named(st.title));
  function monthCells(focus) {
    const mk = M.monthKey(focus);
    const ahead = aheadMode();
    const dates = ahead ? M.range(view.reset.week, 35) : M.monthGrid(focus);
    return dates.map((date) => {
      const d = day(date), c = M.dayCard(state, date, d), free = c.yours >= 60 ? 0 : M.totals([d]).free;
      return {
        date, num: M.parts(date).d, inMonth: ahead || date.slice(0, 7) === mk, today: date === today, past: date < today, weekend: d.wd === 0 || d.wd === 6, yours: c.yours >= 60 ? M.hours(c.yours) : '',
        open: free >= 60 ? M.hours(free) : '',
        trip: d.trip ? d.trip.name : '', flags: c.flags.filter((f) => f.kind !== 'trip').map((f) => ({ kind: f.kind, name: f.name, icon: f.icon })),
        due: c.due.length, todo: c.tasks.length, dinner: !!c.dinner,
        blocks: d.blocks.map((b) => ({ start: b.start, dur: b.dur, cat: b.cat, soft: !!b.soft, sleep: !!b.sleep }))
      };
    });
  }
  function monthList(ms) {
    const p = M.parts(ms), n = M.daysInMonth(p.y, p.m), mk = M.monthKey(ms), end = M.addDays(ms, n - 1);
    const list = [];
    for (const e of state.events) {
      if (e.kind === 'trip' && e.date <= end && e.end >= ms) list.push({ kind: 'trip', when: M.spanText(e.date, e.end).replace(/^[A-Z][a-z]{2} /, ''), name: e.name, sort: e.date });
    }
    for (let k = 0; k < n; k++) {
      const date = M.addDays(ms, k);
      for (const m of M.markersOn(state, date)) list.push({ kind: 'marker', when: M.MONTH_SHORT[p.m - 1] + ' ' + (k + 1), name: m.name, sort: date });
      for (const e of M.timedOn(state, date)) if (e.big) list.push({ kind: 'timed', when: M.MONTH_SHORT[p.m - 1] + ' ' + (k + 1), name: e.name, sort: date });
    }
    const due = state.tasks.filter((t) => !t.done && t.due && t.due.slice(0, 7) === mk).length;
    list.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
    if (due) list.push({ kind: 'due', when: 'Due', name: plural(due, 'to do', 'to dos'), sort: 'z' });
    return list;
  }
  function yearMonths(focus) {
    const first = M.monthStart(focus);
    return Array.from({ length: 12 }, (_, i) => {
      const ms = M.addMonths(first, i), p = M.parts(ms), n = M.daysInMonth(p.y, p.m), off = (M.weekday(ms) - M.weekStartDay() + 7) % 7, mk = M.monthKey(ms);
      const days = [];
      let yours = 0;
      for (let k = 0; k < n; k++) {
        const date = M.addDays(ms, k), d = day(date);
        yours += M.totals(d).yours || 0;
        days.push({ num: k + 1, col: (off + k) % 7, row: Math.floor((off + k) / 7), trip: !!d.trip, marker: d.markers.length > 0, big: M.timedOn(state, date).some((e) => e.big), today: date === today, due: d.due.length > 0 });
      }
      /* a version can mark a month nobody has planned yet as the usual week's hours (window.SR_usualYears) */
      const usual = !!window.SR_usualYears && mk > M.monthKey(today) && !Object.keys(state.dates).some((d) => d.startsWith(mk) && ((state.dates[d].adds || []).length));
      return { key: mk, name: M.MONTH_LONG[p.m - 1], year: p.y, current: mk === M.monthKey(today), days, list: monthList(ms).map((x) => ({ kind: x.kind, when: x.when, name: x.name })), yours: kindYours() && yours < 60 ? '' : M.hours(yours), usual };
    });
  }
  function rangeDates() {
    if (view.zoom === 'day') return [view.focus];
    if (view.zoom === 'week') return weekOf();
    if (view.zoom === 'month') { if (aheadMode()) return M.range(view.reset.week, 35); const ms = M.monthStart(view.focus), p = M.parts(ms); return M.range(ms, M.daysInMonth(p.y, p.m)); }
    const ms = M.monthStart(view.focus);
    return M.range(ms, M.diffDays(ms, M.addMonths(ms, 12)));
  }

  let lastWeek = null, tickAt = 0, lastZoom = null, lastDay = null, landAt = 0;
  const tick = () => { const n = performance.now(); if (n - tickAt > 45) { tickAt = n; Snd.tick(false); } };
  /* blocks settling onto the board make soft taps, a few at most */
  const landTick = () => { const n = performance.now(); if (n - landAt > 70) { landAt = n; Snd.tap(); } };
  /* a block set down: with feel, its knock and its clack come at the moment it touches the board */
  function landed(date, key, size) { if (FEEL) W.land(date, key, size); else { W.squash(date, key); Snd.clack(size); } }
  /* The day board's header and bricks. */
  /* On the day board every block prints its time under its name, so the time never has to be read off the ruler. */
  function decorateDay(b, date) {
    const o = decorate(b, date);
    if (b.dinner) { const s = dinnerSub(b, date); o.daySub = timeSpan(date, b.start, b.start + b.dur) + (s ? ' · ' + s : ''); }
    else if (!b.sleep) o.daySub = timeSpan(date, b.start, b.start + b.dur);
    o.stack = !b.sleep;
    return o;
  }
  function daySpec(date, pd) {
    const d = pd || boardDay(date);
    const t = M.totals(d);
    const dn = state.dinners[date];
    const bits = [];
    d.markers.forEach((m) => bits.push({ icon: m.icon || 'star', text: m.name, color: '#983A5E' }));
    if (d.trip) bits.push({ icon: 'plane', text: d.trip.name, color: '#2A4B90' });
    if (!kindYours() || (t.yours || 0) > 0) bits.push({ icon: 'star', text: M.hours(t.yours || 0) + ' ' + yoursWord(), short: M.hours(t.yours || 0), color: '#6B4F0C' });
    if (d.due.length) bits.push({ icon: 'flag', text: plural(d.due.length, 'thing', 'things') + ' due', short: d.due.length + ' due', color: '#963A28' });
    /* a dinner that's decided reads green; the one still open reads gold, the color of a question */
    const db = d.blocks.find((b) => b.dinner), asks = db && useDinners() && !dinnerOver(db, date);
    if (db) bits.push(dn && (dn.name || dn.cook) ? { icon: 'pot', text: 'Dinner: ' + (dn.name || cookName(dn.cook, date < today)), short: dn.name || cookName(dn.cook, date < today), color: '#2E6638' } : { icon: 'pot', text: asks ? 'Dinner not picked' : useDinners() ? 'Dinner not planned' : 'Dinner', short: asks ? 'Not picked' : useDinners() ? 'Not planned' : 'Dinner', color: asks ? '#7A4E00' : '#4A3A2A' });
    const clash = M.clashes(state, date);
    if (clash.length) bits.push({ icon: 'overlap', text: clash.length === 1 ? clash[0].a.name + ' overlaps ' + clash[0].b.name : plural(clash.length, 'overlap', 'overlaps'), color: '#7A4E00' });
    const now = boardTime(today, nowMin);
    return { date, today: date === today, title: M.DAY_LONG[d.wd], bits, blocks: d.blocks.map((b) => decorateDay(b, date)), gaps: M.gaps(d), now: date === now.date ? now.start : null };
  }
  /* The workbench: whatever you opened from the tray, laid out as pieces to pick up. */
  /* what the notepad shows: what's due this week, the same as the To do count, or the next three weeks
     when nothing is due this week */
  function dueList() {
    const week = M.dueSoon(state, today, 7, nowMin);
    return week.length ? { list: week, when: 'this week' } : { list: M.dueSoon(state, today, 21, nowMin), when: 'in three weeks' };
  }
  function benchSpec() {
    const b = view.bench;
    if (!b) return null;
    const items = [];
    let row = 0;
    if (b.tab === 'todo') {
      const pl = M.placements(state);
      const list = b.level === 'soon' ? M.dueSoon(state, today, 21, nowMin).map((x) => x.task) : state.tasks.filter((t) => t.group === b.level && !t.done && !t.archived).sort((x, y) => ((x.due || 'z') < (y.due || 'z') ? -1 : 1));
      list.forEach((t) => {
        const where = pl.get(t.id) || [];
        const plan = M.taskPlan(t, where, today, nowMin);
        const sub = (t.due ? 'Due ' + M.relText(t.due, today) : 'No due date') + (plan.status === 'planned' ? ' · has a time' : plan.status === 'partial' ? ' · ' + plan.timed + ' of ' + plan.open + ' steps have a time' : '') + (plan.after ? ', after it’s due' : '');
        items.push({ key: 't:' + t.id, kind: 'plate', row, label: t.name, sub, icon: t.icon || 'check', drag: { kind: 'task', id: t.id }, open: { type: 'task', id: t.id } });
        if (t.steps && t.steps.length) t.steps.forEach((st) => {
          const at = where.find((x) => x.step === st.id);
          items.push({ key: 's:' + st.id, kind: 'brick', row, label: st.name, sub: st.done ? 'Done' : at ? M.DAY_SHORT[M.weekday(at.date)] + ' ' + M.clock(at.add.start) : M.dur(st.dur || 15), icon: st.done || at ? 'check' : t.icon || 'check', cat: t.cat || 'yours', dur: st.dur || 15, done: !!st.done, drag: st.done ? null : { kind: 'step', task: t.id, id: st.id } });
        });
        else items.push({ key: 'w:' + t.id, kind: 'brick', row, label: 'The whole thing', sub: M.dur(M.taskDur(t)), icon: t.icon || 'check', cat: t.cat || 'yours', dur: M.taskDur(t), drag: { kind: 'task', id: t.id } });
        row++;
      });
      const g = state.groups.find((x) => x.id === b.level);
      return { title: b.level === 'soon' ? 'Due soon' : g ? g.name : 'To do', sub: list.length ? plural(list.length, 'to do', 'to dos') + '. Drag a step or a whole plate onto a day.' : 'Nothing open here.', icon: b.level === 'soon' ? 'flag' : g ? g.icon : 'check', items };
    }
    if (b.tab === 'dinners') {
      state.recipes.forEach((r, i) => items.push({ key: 'r:' + r.id, kind: 'brick', row: Math.floor(i / 2), label: r.name, sub: r.items.map((x) => (state.pantry.find((p) => p.id === x) || {}).name).filter(Boolean).slice(0, 3).join(', '), icon: 'pot', cat: 'meals', dur: 150, drag: { kind: 'recipe', id: r.id } }));
      row = Math.ceil(state.recipes.length / 2);
      D.PANTRY_KINDS.forEach((k) => {
        state.pantry.filter((p) => p.kind === k.id).forEach((p) => items.push({ key: 'p:' + p.id, kind: 'brick', row, label: p.name, sub: k.name.slice(0, -1), icon: k.icon, cat: 'open', dur: 60, drag: { kind: 'pantry', id: p.id } }));
        row++;
      });
      return { title: 'Dinners', sub: 'Drop a recipe or single things on a dinner.', icon: 'pot', items };
    }
    if (b.tab === 'kim') {
      D.IDEA_KINDS.forEach((k) => {
        state.ideas.filter((i) => i.kind === k.id).forEach((i) => items.push({ key: 'i:' + i.id, kind: 'brick', row, label: i.name, sub: M.dur(i.dur), icon: i.icon, cat: 'us', dur: i.dur, drag: { kind: 'idea', id: i.id } }));
        row++;
      });
      return { title: usName(), sub: 'Drop one on an evening. It takes that time from TV.', icon: 'heart', items };
    }
    D.CAT_ORDER.forEach((c) => {
      const list = library().filter((x) => x.cat === c);
      if (!list.length) return;
      list.forEach((x) => items.push({ key: 'b:' + x.id, kind: 'brick', row, label: x.name, sub: M.dur(x.dur), icon: x.icon, cat: x.cat, dur: x.dur, drag: { kind: 'block', id: x.id } }));
      row++;
    });
    return { title: 'Blocks', sub: 'Drag one onto any day.', icon: 'dumbbell', items };
  }
  const benchable = () => view.zoom === 'week' || view.zoom === 'day';
  /* pieces laid out on the bench: Plan only, so in Do the day stays alone and a stack fans out in the tray */
  const benchOk = () => benchable() && !inToday() && !phoneDay();
  /* The day view's kit: Block library in small tipped piles by group, a dinner group, and a piece for
     making your own. Below the day it's a wide rack; beside the day it's a tall board. */
  let kitMemo = { sig: '', spec: null };
  /* Block library leads with the groups for what the setup said gets in the way: time for yourself puts
     Move and Make first, time together puts People first, dinners and carrying the planning put Home and meals first */
  function kitLead() {
    const pains = (moves && moves.pains) || [];
    const out = [];
    const add = (names) => names.forEach((n) => { if (!out.includes(n)) out.push(n); });
    /* what the setup said to lean toward comes first, then what the pains point at */
    if (OB) ((moves && moves.focus) || []).forEach((id) => { const f = OB.FOCUS.find((x) => x.id === id); if (f) add([f.row]); });
    pains.forEach((p) => add({ me: ['Move', 'Make'], us: ['People'], dinner: ['Home and meals'], load: ['Home and meals'] }[p] || []));
    return out;
  }
  function kitSpec() {
    const sig = view.arrange + '|' + JSON.stringify(state.palette) + '|' + state.recipes.slice(0, 2).map((r) => r.id + r.name).join() + '|' + kitLead().join();
    if (sig !== kitMemo.sig) kitMemo = { sig, spec: packKit() };
    return kitMemo.spec;
  }
  function packKit() {
    const below = view.arrange !== 'beside';
    const byId = new Map(library().map((p) => [p.id, p]));
    const used = new Set();
    let k = 0;
    /* a little tipped, like tiles out of a bag, but not scattered */
    const tilt = () => { k++; return (((k * 37) % 7) - 3) * 0.011; };
    const nudge = () => (((k * 53) % 5) - 2) * 0.02;
    const piece = (p) => ({ key: 'k:' + p.id, kind: 'brick', label: p.name, sub: M.dur(p.dur), icon: p.icon, cat: p.cat, dur: p.dur, drag: { kind: 'block', id: p.id } });
    const lead = kitLead();
    const kitRows = D.KIT_ROWS.slice().sort((x, y) => (lead.includes(x.name) ? lead.indexOf(x.name) : 99) - (lead.includes(y.name) ? lead.indexOf(y.name) : 99));
    const groups = kitRows.map((r) => ({ name: r.name, list: r.ids.map((id) => byId.get(id)).filter(Boolean).map((p) => { used.add(p.id); return piece(p); }) }));
    const open = byId.get('opentime');
    if (open) used.add('opentime');
    const mine = library().filter((p) => !used.has(p.id));
    if (mine.length) groups.push({ name: 'Made by you', list: mine.map(piece) });
    groups.push({ name: 'Your own', list: (open ? [piece(open)] : []).concat([{ key: 'k:new', kind: 'plate', label: 'Make a block', sub: 'Name it, pick a length', icon: 'plus', open: { type: 'newBlock' }, w: 3.0 }]) });
    /* Group names are printed on the wood above each group, so nothing that can't move looks like a
       block. First fit packs the groups into as few rows as they fit; below the day the rack is
       exactly as wide as the day board. */
    const width = below ? 21 : 10.2, rowD = 1.2, labelD = 0.46;
    const pw = 1.5, gap = 0.1, groupGap = 0.7;
    const left = -width / 2 + 0.4, right = width / 2 - 0.4, span = right - left;
    const items = [], fill = [], prints = [];
    groups.forEach((g) => {
      const gw = g.list.reduce((a, it) => a + (it.w || pw) + gap, 0) - gap;
      const last = fill.length - 1;
      const fits = (u) => u + groupGap + gw <= span + 1e-6;
      let r = below ? fill.findIndex(fits) : last >= 0 && fits(fill[last]) ? last : -1;
      if (r < 0) { r = fill.length; fill.push(0); }
      let x = left + fill[r] + (fill[r] > 0 ? groupGap : 0), row = r;
      prints.push({ text: g.name, row, x: x });
      g.list.forEach((it) => {
        const w = it.w || pw;
        if (x + w > right + 1e-6) { fill[row] = x - gap - left; row = fill.length; fill.push(0); x = left; }
        items.push(Object.assign(it, { w, row, cx: x + w / 2, tilt: it.kind === 'brick' ? tilt() : 0, nudge: it.kind === 'brick' ? nudge() : 0 }));
        x += w + gap;
      });
      fill[row] = x - gap - left;
    });
    const rows = fill.length, titleD = 0.95, pitch = labelD + rowD + 0.24;
    const depth = titleD + rows * pitch + 0.2;
    const rowTop = (r) => -depth / 2 + titleD + r * pitch;
    items.forEach((it) => { it.x = it.cx; it.z = rowTop(it.row) + labelD + rowD / 2; });
    const printed = [{ text: 'Block library', x: left, z: -depth / 2 + 0.5, size: 0.42, icon: 'box' }, { text: 'Drag one onto the day', x: left + 4.1, z: -depth / 2 + 0.52, size: 0.3, soft: true }]
      .concat(prints.map((p) => ({ text: p.text, x: p.x + 0.02, z: rowTop(p.row) + labelD * 0.5, size: 0.3, soft: true })));
    return { title: 'Block library', sub: '', icon: 'box', items, depth, width, rowD, compact: below, arrange: below ? 'below' : 'beside', prints: printed, kit: true };
  }
  function renderBoard(previewDays) {
    /* a portrait phone's desk gets the tall board: four hour lanes stacked, blocks about twice the size */
    if (W.setDayShape) W.setDayShape(phoneDay() && window.innerHeight > window.innerWidth ? 'tall' : 'wide');
    W.setHours(M.visibleHours(state));
    W.setPhoneDay(phoneDay());
    const zoomDirection = lastZoom ? Math.sign(ZOOMS.indexOf(view.zoom) - ZOOMS.indexOf(lastZoom)) : 0;
    const direction = !previewDays && (zoomDirection || (lastDay && view.focus !== lastDay ? view.focus > lastDay ? 1 : -1 : 0));
    W.beginNavigation(direction);
    if (view.zoom === 'day' || view.zoom === 'week') {
      const ws = M.weekStart(view.focus);
      W.setWeek(weekOf().map((d) => rowSpec(d, previewDays && previewDays[d])), { direction });
      if (view.zoom === 'day') {
        const fly = lastZoom !== 'day' || lastDay !== view.focus;
        W.setDay(daySpec(view.focus, previewDays && previewDays[view.focus]), { fly, onLand: landTick });
      } else if (lastZoom === 'day') W.setDay(null);
      /* a version of the board can put the day's Block library away (window.SR_kitAway): the day then stands alone, as in Today */
      const kitAway = view.zoom === 'day' && !view.bench && !!window.SR_kitAway;
      W.setAlone(inToday() || phoneDay() || kitAway);
      const dayKit = view.zoom === 'day' && !inToday() && !phoneDay() && !kitAway;
      W.setBench(view.bench ? benchSpec() : dayKit ? kitSpec() : null);
      W.setBenchOpen(!!view.bench || dayKit);
      W.setZoom(view.zoom, M.weekday(view.focus));
      if (W.layout !== 'week') W.showLayout('week', W.rowWorld(M.weekday(view.focus)), tick);
      else if (!previewDays && lastWeek && lastWeek !== ws && view.zoom === 'week') W.rippleWeek(ws > lastWeek ? 1 : -1);
      lastWeek = ws;
      const at = boardTime(today, nowMin), tr = weekOf().indexOf(at.date);
      W.setNow(nowMin, tr >= 0 ? tr : null, nowNow().soon, { weekMin: at.start, dayMin: view.focus === at.date ? at.start : null });
    } else {
      if (lastZoom === 'day') W.setDay(null);
      W.setBenchOpen(false);
      W.setBench(null);
      if (view.zoom === 'month') {
        W.setMonth(monthCells(view.focus));
        W.setZoom('month');
        if (W.layout !== 'month') W.showLayout('month', W.cardWorld(view.focus), tick);
      } else {
        W.setYear(yearMonths(view.focus));
        W.setZoom('year');
        if (W.layout !== 'year') W.showLayout('year', W.ycardWorld(M.monthKey(view.focus)), tick);
      }
      lastWeek = null;
    }
    if (!previewDays) { lastZoom = view.zoom; lastDay = view.focus; W.setNotepad(notepadSpec()); }
    W.setSelected(view.pick && (view.pick.displayDate || view.pick.date), view.pick && (view.pick.displayKey || view.pick.key));
  }

  /* The notepad on the desk lists what's due soon, so it stays in sight with the tray folded. */
  function notepadSpec() {
    const d = dueList();
    const items = d.list.slice(0, 3).map((x) => ({ text: x.task.name, sub: 'Due ' + M.relText(x.task.due, today), late: x.task.due < today }));
    return { title: 'Due soon', items, total: d.list.length, empty: 'Nothing due in three weeks' };
  }
  function renderHud() {
    const z = view.zoom;
    let title, sub = '';
    if (z === 'day') {
      title = M.dateText(view.focus, 'long');
      const n = M.diffDays(today, view.focus);
      /* today is already the dot under its day; the line only says how far away another day is */
      sub = n === 0 ? '' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 0 ? 'In ' + n + ' days' : -n + ' days ago';
    }
    else if (z === 'week') {
      const ws = M.weekStart(view.focus), n = M.diffDays(M.weekStart(today), ws) / 7;
      title = n === 0 ? 'This week' : n === 1 ? 'Next week' : n === -1 ? 'Last week' : 'Week of ' + M.dateText(ws);
      sub = M.spanText(ws, M.addDays(ws, 6));
    } else if (z === 'month' && aheadMode()) {
      title = 'The next five weeks';
      sub = M.spanText(view.reset.week, M.addDays(view.reset.week, 34));
    } else if (z === 'month') {
      const p = M.parts(view.focus);
      title = M.MONTH_LONG[p.m - 1] + ' ' + p.y;
      sub = monthList(M.monthStart(view.focus)).filter((x) => x.kind !== 'due').slice(0, 3).map((x) => x.name).join(', ');
    } else {
      const ms = M.monthStart(view.focus), last = M.addMonths(ms, 11), p = M.parts(ms), q = M.parts(last);
      title = M.monthKey(ms) === M.monthKey(today) ? 'The next 12 months' : M.MONTH_LONG[p.m - 1] + ' on';
      sub = M.MONTH_SHORT[p.m - 1] + ' ' + p.y + ' to ' + M.MONTH_SHORT[q.m - 1] + ' ' + q.y;
    }
    $('hud-title').textContent = title;
    $('hud-sub').textContent = sub;
    $('hud-sub').hidden = !sub;
    renderOutsideHours();
    $('hud-clock').textContent = M.clock(nowMin);
    $('hud-kicker').replaceChildren(icon('sliders', 7, UI.gold), document.createTextNode('Sunday Reset'));
    /* Back to today shows only when you're somewhere else */
    const here = z === 'day' ? view.focus === today : z === 'week' ? M.weekStart(view.focus) === M.weekStart(today) : z === 'month' ? aheadMode() || M.monthKey(view.focus) === M.monthKey(today) : M.monthKey(M.monthStart(view.focus)) === M.monthKey(today);
    $('today').hidden = here;
    /* further out, the date card can find the next weekend day with room in it */
    if ($('freeday')) $('freeday').hidden = !(z === 'month' || z === 'year') || !!view.reset || !here;
    renderPills();
    renderKinds();
    srSummary();
    $('yours').hidden = z === 'day';
    /* the week the board shows, named the way the date card names it */
    const weekWord = (ws) => { const n = M.diffDays(M.weekStart(today), ws) / 7; return n === 0 ? 'this week' : n === 1 ? 'next week' : n === -1 ? 'last week' : 'that week'; };
    const span = rangeDates(), t = M.totals(span.map(day));
    const aw = M.awake(t);
    /* a month or a year ahead is a forecast from the usual week, so it's said as one, in round hours;
       a year that's already over is what happened, said plainly */
    const gone = span.length > 0 && span[span.length - 1] < today;
    const far = !gone && (z === 'year' || (z === 'month' && !aheadMode() && M.monthKey(view.focus) > M.monthKey(today)));
    $('yours-num').textContent = far ? 'about ' + Math.round((t.yours || 0) / 600) * 10 + ' h' : M.hours(t.yours || 0);
    $('yours-label').textContent = 'yours ' + (z === 'day' ? (view.focus === today ? 'today' : 'that day') : z === 'week' ? weekWord(M.weekStart(view.focus)) : z === 'month' ? (aheadMode() ? 'in five weeks' : 'this month') : gone ? 'in those 12 months' : 'in 12 months') + (far ? ', if weeks go as usual' : '');
    $('yours-sub').textContent = z === 'month' || z === 'year' ? 'Each card is a day as a strip of its blocks' : aw ? Math.round((100 * (t.yours || 0)) / aw) + '% of your waking time' : '';
    $('yours').title = 'Yours counts your own time: gold blocks like workouts and creative time, and evenings kept free. Work, family, meals, and time together don’t count.';
    const lt = $('listtoggle');
    if (lt) { lt.setAttribute('aria-pressed', String(!!view.list)); lt.hidden = noDesk || inToday(); }
    document.querySelectorAll('#zoom button[data-zoom]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zoom === z)));
    /* Undo shows once there's something to undo, and Redo once something was undone */
    $('undo').hidden = !undoStack.length;
    if ($('redo')) $('redo').hidden = !redoStack.length;
    /* someone trying it from a shared link has the person who shared it one tap away */
    if ($('tell')) { $('tell').hidden = !sharedBy || !!view.preview; $('tell').lastChild.textContent = 'Tell ' + sharedBy; }
  }
  function renderOutsideHours() {
    const b = $('outside-hours');
    if (!b) return;
    const h = M.visibleHours(state), dates = view.zoom === 'day' ? [view.focus] : view.zoom === 'week' ? weekOf() : [];
    const seen = new Set();
    dates.forEach((date) => day(date).blocks.filter((x) => !x.sleep && !x.free).forEach((x) => {
      const at = boardTime(date, x.start);
      const end = x.sourceDate === date && x.sourceStart != null ? x.sourceStart + (x.sourceDur || x.dur) : x.start + x.dur;
      if (at.start < h.start || end + (at.start - x.start) > h.end) seen.add(sourceDate(x, date) + '|' + sourceKey(x));
    }));
    b.hidden = !seen.size || view.list || noDesk;
    b.textContent = plural(seen.size, 'block outside visible hours', 'blocks outside visible hours') + ' · Show list';
    b.onclick = () => setList(true);
  }

  /* Seven day buttons in the top panel, for the day view: tap to switch, or drop a block on one to move it there. */
  function renderPills() {
    const box = $('pills');
    box.hidden = view.zoom !== 'day';
    if (box.hidden) return;
    /* a pill picked with the keyboard keeps focus through the redraw */
    const had = box.contains(document.activeElement);
    box.replaceChildren();
    if (had) setTimeout(() => { const on = box.querySelector('.daypill.on'); if (on) on.focus(); }, 0);
    weekOf().forEach((date) => {
      const b = el('button', 'daypill' + (date === view.focus ? ' on' : '') + (date === today ? ' today' : ''));
      b.type = 'button';
      b.dataset.date = date;
      b.appendChild(el('span', 'dw', M.DAY_SHORT[M.weekday(date)]));
      b.appendChild(el('span', 'dn', String(M.parts(date).d)));
      b.setAttribute('aria-label', M.dateText(date, 'long'));
      if (date === view.focus) b.setAttribute('aria-current', 'date');
      b.addEventListener('click', () => { Snd.init(); if (date === view.focus) return; view.focus = date; selectBlock(null); Snd.zoom(false); render(); });
      box.appendChild(b);
    });
  }
  /* What kind of day: one dropdown in the date card, named for the kind you're on ("Your usual Monday").
     Its list gives each kind its one line, your own kinds with a way to remove them, and Save this day
     at the end. Pick one to try it on; pick another to swap. */
  function renderKinds() {
    const box = $('kinds');
    box.hidden = view.zoom !== 'day' || !!view.reset;
    if (box.hidden) { box.classList.remove('open'); return; }
    const date = view.focus, dd = state.dates[date] || {};
    const wdName = M.DAY_LONG[M.weekday(date)];
    const cur = dd.preset || 'usual';
    const all = D.PRESETS.concat(state.presets || []);
    const onP = all.find((p) => p.id === cur) || D.PRESETS[0];
    const d0 = day(date), t0 = M.totals(d0);
    const lineOf = (p) => (p.usual ? (cur === 'usual' ? 'Up at ' + M.clock(d0.wake) + ', bed at ' + M.clock(d0.bed) + (kindYours() && !(t0.yours > 0) ? '' : ', ' + M.hours(t0.yours || 0) + ' ' + yoursWord()) : 'How ' + wdName + ' goes most weeks') : p.line || '');
    let pick = box.querySelector('.kinds-pick');
    if (!pick) {
      pick = el('button', 'kinds-pick');
      pick.type = 'button';
      pick.setAttribute('aria-haspopup', 'true');
      pick.setAttribute('aria-controls', 'kinds-row');
      pick.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); Snd.pick(); box.classList.toggle('open'); pick.setAttribute('aria-expanded', String(box.classList.contains('open'))); });
      box.insertBefore(pick, box.firstChild);
    }
    pick.replaceChildren(icon(onP.icon || 'star', 9, UI.ink), el('span', '', (onP.usual ? 'Your usual' : onP.name) + ' ' + wdName), el('span', 'chev'));
    pick.lastChild.appendChild(icon('down', 6, UI.ink));
    pick.title = 'What kind of ' + wdName + '?';
    pick.setAttribute('aria-expanded', String(box.classList.contains('open')));
    const menu = $('kinds-row');
    menu.replaceChildren(el('p', 'kinds-q', 'What kind of ' + wdName + '?'));
    const row = (p, mine) => {
      const on = p.id === cur;
      /* a kind you saved a moment ago pops in, so you can see where it went */
      const fresh = view.got.freshKind === p.id;
      if (fresh) setTimeout(() => { view.got.freshKind = null; }, 1800);
      const armed = view.got.kindArm && view.got.kindArm.id === p.id;
      const b = el('button', 'kind' + (on ? ' on' : '') + (fresh ? ' fresh' : '') + (armed ? ' armed' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(on));
      b.appendChild(icon(p.icon || 'star', 9, on ? UI.dark : UI.soft));
      const words = el('span', 'kind-words');
      /* a kind that would take off things you placed by hand says which, and waits for a second tap */
      words.append(el('b', '', p.name), el('small', '', armed ? 'Takes off ' + view.got.kindArm.names + '. Tap again to use it.' : lineOf(p)));
      b.appendChild(words);
      b.addEventListener('click', () => {
        Snd.init();
        if (!armed) { const lose = kindLoses(p); if (lose.length) { view.got.kindArm = { id: p.id, names: listText(lose) }; renderKinds(); b.focus(); return; } }
        view.got.kindArm = null;
        applyRecipe(p);
      });
      if (!mine) return b;
      /* your own kinds get a remove button beside the row, never inside it */
      const w = el('span', 'kind-wrap');
      const x = el('button', 'kind-x');
      x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + p.name); x.title = 'Remove ' + p.name;
      x.appendChild(icon('x', 7, '#D8D1C4'));
      x.addEventListener('click', (e) => { e.stopPropagation(); commit(() => { state.presets = state.presets.filter((q) => q.id !== p.id); }); toast(p.name + ' is gone. Undo brings it back.'); });
      w.append(b, x);
      return w;
    };
    /* a kind that works inside Work only shows on a day with work that's yours to plan, so a shift's day off or
       a locked shift never offers deep work it can't place */
    const plannable = d0.blocks.some((b) => b.cat === 'work' && b.soft);
    D.PRESETS.filter((p) => plannable || p.id === cur || !(p.items || []).some((it) => it.work)).forEach((p) => menu.appendChild(row(p)));
    (state.presets || []).forEach((p) => menu.appendChild(row(p, true)));
    const save = el('button', 'kind add');
    save.type = 'button';
    save.append(icon('plus', 9, UI.soft), el('span', 'kind-words', 'Save this ' + wdName + ' as a kind'));
    save.addEventListener('click', () => { Snd.init(); Snd.pick(); box.classList.remove('open'); openSel({ type: 'savePreset', date: view.focus }); });
    menu.appendChild(save);
  }
  /* names in a line: Walk, Reading, and 2 more */
  const listText = (names) => (names.length <= 2 ? names.join(' and ') : names.slice(0, 2).join(', ') + ', and ' + (names.length - 2) + ' more');
  /* what a kind of day would take off that you put there yourself: blocks you placed, to dos, ideas */
  function kindLoses(p) {
    if (p.id === ((state.dates[view.focus] || {}).preset || 'usual')) return [];
    const date = view.focus, before = day(date);
    const tr = tryOn(() => M.applyPreset(state, date, p, state.palette));
    if (!tr.r || tr.r.ok === false) return [];
    const after = daysWith(tr.dates, [date])[date];
    const keep = new Set(after.blocks.map((b) => b.base));
    return before.blocks.filter((b) => b.add && !keep.has(b.base) && !(b.src && b.src.type === 'preset')).map((b) => b.label || b.name);
  }
  function applyRecipe(p) {
    $('kinds').classList.remove('open');
    view.got.kindArm = null;
    const date = view.focus, wdName = M.DAY_LONG[M.weekday(date)];
    const r = commit(() => M.applyPreset(state, date, p, state.palette));
    if (!r) return;
    if (date === today) markSeen({ kind: true });
    selectBlock(null);
    Snd.good();
    const missed = (p.items || []).length - (r.placed || 0);
    const fit = missed > 0 ? ' ' + plural(missed, 'block didn’t fit.', 'blocks didn’t fit.') : '';
    if (p.usual) toast('Back to your usual ' + wdName + (r.kept ? '. ' + plural(r.kept, 'to do keeps its time', 'to dos keep their times') + '.' : ''), '', { label: 'Undo', fn: undo });
    else if (p.empty) toast('A blank ' + wdName + '. Only locked blocks stay.', '', { label: 'Undo', fn: undo });
    else if (p.easy) toast('An easy ' + wdName + '.' + (r.back ? ' ' + plural(r.back, 'to do is', 'to dos are') + ' back on your list.' : ''), 'good', { label: 'Undo', fn: undo });
    else if (p.mine) toast(p.name + ' on ' + wdName + '.' + fit, missed > 0 ? '' : 'good');
    else toast('A ' + p.name.toLowerCase() + ' ' + wdName + '.' + fit, missed > 0 ? '' : 'good');
  }
  /* A plain text version of what the board shows, for screen readers. */
  function srSummary() {
    const out = [];
    if (view.zoom === 'day' || view.zoom === 'week') {
      (view.zoom === 'day' ? [view.focus] : weekOf()).forEach((date) => {
        const d = boardDay(date);
        out.push(M.dateText(date, 'long') + ': ' + d.blocks.filter((b) => !b.sleep).map((b) => (b.label || b.name) + ' ' + timeSpan(date, b.start, b.start + b.dur)).join(', ') + '.');
      });
    } else if (view.zoom === 'month') {
      monthList(M.monthStart(view.focus)).forEach((x) => out.push(x.when + ': ' + x.name + '.'));
    } else {
      yearMonths(view.focus).forEach((m) => out.push(m.name + ': ' + (m.list.map((x) => x.when + ' ' + x.name).join(', ') || 'a usual month') + '.'));
    }
    $('sr').textContent = out.join(' ');
  }
  /* the board says which day a week starts on; the model and the desk follow it, whoever changed it */
  let deskWeekStart = 0;
  function syncWeekStart() {
    const n = state && state.settings && state.settings.weekStart === 1 ? 1 : 0;
    if (M.weekStartDay() !== n) { M.setWeekStart(n); cache.clear(); }
    if (deskWeekStart !== n) { deskWeekStart = n; if (W.setWeekStart) W.setWeekStart(n); }
  }
  function render() {
    if (!ready) return;
    syncWeekStart();
    rendering = true;
    applyModeClass();
    renderBoard();
    renderHud();
    renderNow();
    renderRack();
    renderModeSwitch();
    renderPhoneBar();
    renderAgenda();
    renderSide();
    layoutInsets();
    renderTools();
    renderSaveState();
    if (view.drawer) renderDrawer();
    rendering = false;
    /* the merge's top bar follows the board */
    if (window.SR_onRender) window.SR_onRender();
  }
  /* where the top of the screen ends: the band and its question in Do, the top bar in Plan */
  function headBottom() {
    if (inToday()) return Math.max($('band').getBoundingClientRect().bottom, $('moment').hidden ? 0 : $('moment').getBoundingClientRect().bottom);
    const kinds = $('kinds');
    return Math.max($('hud').getBoundingClientRect().bottom, $('topright').getBoundingClientRect().bottom, kinds.hidden ? 0 : kinds.getBoundingClientRect().bottom);
  }
  /* The merge's chrome: things marked data-edge="top|bottom|left|right" keep the board clear of them,
     and a tray that's hidden takes no room. */
  function rackBox() { const r = $('rack'); return r.offsetParent !== null && !r.dataset.edge ? r.getBoundingClientRect() : { top: window.innerHeight, bottom: window.innerHeight, left: 0, right: 0 }; }
  function chromeEdges() {
    const e = { top: 0, bottom: 0, left: 0, right: 0, boxes: [] };
    document.querySelectorAll('[data-edge]').forEach((x) => {
      if (x.hidden || x.offsetParent === null) return;
      const r = x.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const k = x.dataset.edge;
      if (k === 'top') e.top = Math.max(e.top, r.bottom);
      if (k === 'bottom') e.bottom = Math.max(e.bottom, window.innerHeight - r.top);
      if (k === 'left') e.left = Math.max(e.left, r.right);
      if (k === 'right') e.right = Math.max(e.right, window.innerWidth - r.left);
      e.boxes.push({ x0: Math.round(r.left), x1: Math.round(r.right), y0: Math.round(r.top), y1: Math.round(r.bottom) });
    });
    return e;
  }
  function layoutInsets() {
    const side = $('side'), kinds = $('kinds'), doMode = inToday(), fab = $('fab');
    /* the phone's day: the bar on top, an open panel along the bottom, and the board between them */
    const pv = $('preview-bar'), pvOn = !pv.hidden;
    if (view.phone) document.body.style.setProperty('--pv-h', pvOn ? Math.round(pv.offsetHeight + 8) + 'px' : '0px');
    if (phoneDay()) {
      /* a preview's bar sits under the phone's own bar, and the board starts below both */
      pv.style.bottom = ''; pv.style.left = '';
      const bar = (pvOn ? pv : $('phonebar')).getBoundingClientRect(), tools = $('btools');
      const sideTop = Math.min(side.hidden ? window.innerHeight : side.getBoundingClientRect().top, tools.hidden ? window.innerHeight : tools.getBoundingClientRect().top);
      side.style.top = ''; side.style.maxHeight = ''; side._keepTop = null;
      const bottom = Math.round(window.innerHeight - sideTop + 10);
      $('toasts').style.setProperty('--toast-bottom', Math.max(16, bottom) + 'px');
      if (phoneBar && phoneBar.add) phoneBar.add.hidden = !!view.pick || !side.hidden || !tools.hidden;
      /* nothing picked and nothing open: back out to the whole day from a tap's zoom */
      if (!view.pick && side.hidden && tools.hidden && W.focusOn) W.focusOn(null);
      const blockers = ['topnav', 'phonebar', 'preview-bar', 'side', 'btools', 'pd-add'].map($).filter((x) => x && !x.hidden && x.offsetParent !== null).map((x) => { const r = x.getBoundingClientRect(); return { x0: Math.round(r.left), x1: Math.round(r.right), y0: Math.round(r.top), y1: Math.round(r.bottom) }; });
      W.setDayOnly(false); W.setTight(false);
      /* Dev's phone view in a wide window frames the day in a phone's width */
      const side8 = devPhone && !phoneWidth() ? Math.max(8, Math.round(window.innerWidth / 2 - 187)) : 8;
      W.setInsets({ top: Math.round(bar.bottom + 10), bottom: Math.max(12, bottom), left: side8, right: side8, blockers, hold: !side.hidden });
      return;
    }
    /* in Plan the corner buttons sit under the switch and the zoom tabs */
    const corner = $('corner');
    corner.style.top = !doMode && !window.matchMedia('(max-width: 520px)').matches ? Math.round($('topright').getBoundingClientRect().bottom + 8) + 'px' : '';
    /* the side panel starts under the corner buttons, or under the kinds of day if they reach that far
       right; in Do it starts under the band and stops above Add */
    if (side.hidden) side._keepTop = null;
    else {
      let top;
      if (doMode) {
        /* an open panel never moves up under the pointer when the question strip folds; it takes the
           room the next time it opens */
        top = Math.max(headBottom() + 10, side._keepTop || 0);
        side._keepTop = top;
        const lim = fab.hidden ? window.innerHeight - 16 : fab.getBoundingClientRect().top - 10;
        side.style.maxHeight = Math.round(Math.max(220, lim - top)) + 'px';
      } else {
        const cr = corner.getBoundingClientRect();
        top = (cr.top < window.innerHeight / 2 ? cr.bottom : Math.max($('hud').getBoundingClientRect().bottom, $('topright').getBoundingClientRect().bottom)) + 10;
        if (!kinds.hidden) { const kr = kinds.getBoundingClientRect(), sl = window.innerWidth - 16 - side.offsetWidth; if (kr.right > sl - 8) top = Math.max(top, kr.bottom + 10); }
        /* it ends above the tray bar, never over Set up this week */
        top = Math.max(top, chromeEdges().top + 10);
        side.style.maxHeight = view.phone ? '' : Math.round(Math.max(220, Math.min(rackBox().top, window.innerHeight - chromeEdges().bottom) - 10 - top)) + 'px';
      }
      side.style.top = Math.round(top) + 'px';
    }
    placeViewCtl();
    fitBar();
    const edges = chromeEdges();
    const top = Math.max(headBottom() + 14, edges.top + 14);
    const rack = rackBox();
    let bottom = Math.max(window.innerHeight - rack.top + 12, edges.bottom + 12);
    if (doMode && !fab.hidden) bottom = Math.max(bottom, window.innerHeight - $('fab-add').getBoundingClientRect().top + 12);
    const right = Math.max($('side').hidden ? 16 : window.innerWidth - $('side').getBoundingClientRect().left + 12, edges.right + 12);
    const left = Math.max(16, edges.left + 12);
    /* A preview's bar sits on the tray's top edge, centered in the room beside an open panel; the board
       and the toasts stay above it, so it never covers the work or what a tap did. On the phone
       style.css puts it at the top. */
    if (view.phone) { pv.style.bottom = ''; pv.style.left = ''; }
    else {
      pv.style.bottom = Math.round(bottom) + 'px';
      pv.style.left = Math.round((16 + window.innerWidth - right) / 2) + 'px';
      if (pvOn) bottom += pv.offsetHeight + 10;
    }
    /* toasts sit on the tray's top edge, wherever that is, never over the middle of the board */
    $('toasts').style.setProperty('--toast-bottom', Math.round(bottom + 2) + 'px');
    const ag = $('agenda');
    if (ag && !ag.hidden) { ag.style.top = Math.round(top) + 'px'; ag.style.bottom = Math.round(bottom) + 'px'; ag.style.right = Math.round(right) + 'px'; }
    /* the panels over the desk, so a prop under one steps out instead of hiding half behind it */
    const blockers = (doMode ? ['topnav', 'band', 'moment', 'fab', 'rack', 'side', 'preview-bar'] : ['topnav', 'hud', 'yours', 'kinds', 'topright', 'corner', 'rack', 'side', 'preview-bar']).map($).filter((x) => x && !x.hidden && x.offsetParent !== null).map((x) => { const r = x.getBoundingClientRect(); return { x0: Math.round(r.left), x1: Math.round(r.right), y0: Math.round(r.top), y1: Math.round(r.bottom) }; }).concat(edges.boxes);
    /* Settings on a wide window: the desk slides over and is framed in the room beside the panel,
       above the tray bar, so a theme, a layout, the light, or the bar changes in front of you */
    const live = !!view.drawer && wideSettings() && !noDesk && !view.list;
    document.body.classList.toggle('drawer-live', live);
    if (live) {
      const dr = $('drawer').getBoundingClientRect(), rk = rackBox();
      const box = (r) => ({ x0: Math.round(r.left), x1: Math.round(r.right), y0: Math.round(r.top), y1: Math.round(r.bottom) });
      W.setDayOnly(false); W.setTight(false);
      W.setInsets({ top: 28, bottom: Math.round(window.innerHeight - rk.top + 16), left: Math.round(dr.right + 20), right: 20, blockers: [box(dr), box(rk)], hold: false });
      fitBar();
      return;
    }
    W.setDayOnly(!doMode && view.zoom === 'day' && !view.reset && !trayCollapsed());
    W.setTight(!doMode && view.zoom === 'week' && (!!view.reset || !trayCollapsed()));
    W.setInsets({ top, bottom, right, left, blockers, hold: !$('side').hidden });
  }

  /* a short spoken line for screen readers, for changes that don't move focus */
  function say(text) { const a = $('announce'); if (!a) return; a.textContent = ''; setTimeout(() => { a.textContent = text; }, 30); }
  /* == saved, and where ==
     A few words near the date, always: saved on this device, saving, shared with the household,
     offline with changes waiting here, or not saved. Tapping it opens Your data. */
  function saveState() {
    if (view.preview) return { cls: 'preview', short: 'Preview', long: 'A preview. Nothing here is saved.' };
    if (readOnly) return { cls: 'error', short: 'Read only', long: 'Saved by a newer version, so nothing here saves.' };
    if (Store.status === 'error') return { cls: 'error', short: 'Not saved', long: 'The last change didn’t save on this device.' };
    if (Store.mode === 'db') return Store.status === 'saving' ? { cls: 'saving', short: 'Saving', long: 'Saving with this artifact' } : { cls: 'saved', short: 'Saved', long: 'Saved with this artifact on claude.ai' };
    if (Cloud.linked && !Cloud.on) return { cls: 'offline', short: 'Offline', long: 'Saved on this device. Changes go to your household when you’re back online.' };
    if (Cloud.on) {
      if (Cloud.status === 'offline') return { cls: 'offline', short: 'Offline', long: 'Saved on this device. Changes go to your household when you’re back online.' };
      if (Cloud.status === 'refused') return { cls: 'error', short: 'Not shared', long: Cloud.note || 'The household didn’t take this board. It’s saved on this device.' };
      if (Store.status === 'saving' || Cloud.status === 'saving') return { cls: 'saving', short: 'Saving', long: Cloud.note && Cloud.note !== 'Saved' ? Cloud.note : 'Saving to your household' };
      return { cls: 'saved', short: 'Shared', long: 'Saved here and shared with ' + (Cloud.me.name || 'your household') };
    }
    if (Store.status === 'saving') return { cls: 'saving', short: 'Saving', long: 'Saving on this device' };
    if (who().sample && !Store.savedAt) return { cls: 'saved', short: 'Sample', long: 'A sample week. Nothing is saved until you change something.' };
    return { cls: 'saved', short: 'Saved here', long: 'Saved in this browser on this device' };
  }
  let saveSig = '';
  function renderSaveState() {
    const st = saveState(), sig = st.cls + st.short + st.long;
    if (sig === saveSig) return;
    saveSig = sig;
    document.querySelectorAll('.save-state').forEach((x) => {
      if (x.dataset.base == null) x.dataset.base = x.className;
      x.className = x.dataset.base + ' ' + st.cls;
      x.replaceChildren(el('i', 'dot'), el('span', '', st.short));
      x.title = st.long.replace(/\.$/, '') + '. Tap for Your data.';
      x.setAttribute('aria-label', st.long.replace(/\.$/, '') + '. Opens Your data.');
    });
    /* only the pages that show the status are drawn again, never the one you're typing on */
    if (view.drawer && ['overview', 'data', 'sync'].includes(view.setPage)) renderDrawer();
  }
  function openData() { if (view.drawer) goPage('data'); else openDrawer('data'); }

  /* Per device preferences that change how everything reads. */
  function applyPrefs() {
    M.setClock24(view.clock24);
    W.setClock24(view.clock24);
    W.setQuality(view.lowPower ? 'low' : 'full');
    W.setMotion(!!view.calm);
    W.setLight({ steady: !!view.steady });
    Snd.set(view.sound !== false);
    document.body.classList.toggle('big-text', !!view.bigText);
    document.body.classList.toggle('calm', !!view.calm || !!view.lowPower);
    /* a touch screen feels each quarter hour of a drag, unless motion is calmer */
    if (Snd.setHaptic) Snd.setHaptic(!view.calm && !!(window.matchMedia && matchMedia('(pointer: coarse)').matches));
    document.body.classList.toggle('list-view', !!(view.list || noDesk));
    document.body.classList.toggle('no-desk', !!noDesk);
  }

  /* == the week as a list ==
     The same week, day by day, as plain buttons: every block has a name, a time, whether it's locked
     or done, and opens its own panel, where it can be moved, stretched, locked, finished, or taken off.
     For a keyboard, a screen reader, a small or old screen, or a desk that can't draw. */
  function setList(on) {
    if (noDesk) on = true;
    const was = view.list;
    view.list = !!on;
    saveView(); applyPrefs(); render();
    if (was && !view.list) W.wake();
    if (on && $('agenda')) setTimeout(() => { const h = $('agenda').querySelector('.ag-day.today h2') || $('agenda').querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }, 30);
  }
  let agendaKey = '';
  function renderAgenda() {
    const box = $('agenda');
    if (!box) return;
    const on = (view.list || noDesk) && !view.phone;
    box.hidden = !on;
    if (!on) { agendaKey = ''; return; }
    /* a new stretch of time opens at today when today is in it, and at its top otherwise */
    const key = view.zoom + '|' + (view.zoom === 'week' ? M.weekStart(view.focus) : view.focus);
    const moved = key !== agendaKey;
    agendaKey = key;
    const keep = box.scrollTop;
    box.replaceChildren();
    if (noDesk) {
      const n = el('p', 'ag-note');
      n.textContent = 'The desk can’t draw on this device' + (window.THREE ? '' : ' (its 3D part didn’t load)') + ', so here’s your week as a list. Everything works from here.';
      box.appendChild(n);
    }
    const hours = M.visibleHours(state);
    if (hours.start !== 300 || hours.end !== 1440) box.appendChild(el('p', 'ag-note', 'All hours, on their calendar dates. The desk keeps an evening with the next morning.'));
    /* the week as a list goes on paper, or into a message, from right here */
    if (view.zoom === 'week' || view.zoom === 'day') { const acts = el('div', 'ag-acts'); acts.append(button('Print this week', 'small quiet', printWeek), button('Copy as text', 'small quiet', copyWeekText)); box.appendChild(acts); }
    let dates;
    if (view.zoom === 'day') dates = [view.focus];
    else if (view.zoom === 'week') dates = weekOf();
    else {
      /* a month or a year reads as its list of what's coming */
      const ms = view.zoom === 'month' ? [M.monthStart(view.focus)] : Array.from({ length: 12 }, (_, i) => M.addMonths(M.monthStart(view.focus), i));
      ms.forEach((m) => {
        const sec = el('section', 'ag-day');
        const p = M.parts(m);
        sec.appendChild(el('h2', '', M.MONTH_LONG[p.m - 1] + ' ' + p.y));
        const items = monthList(m);
        const ol = el('ul', 'ag-list');
        if (!items.length) ol.appendChild(el('li', 'ag-empty', 'A usual month.'));
        items.forEach((x) => ol.appendChild(el('li', 'ag-mark', x.when + ': ' + x.name)));
        sec.appendChild(ol);
        sec.appendChild(button('Open ' + M.MONTH_LONG[p.m - 1] + ' week by week', 'small quiet', () => setZoom('week', m)));
        box.appendChild(sec);
      });
      box.scrollTop = keep;
      return;
    }
    dates.forEach((date) => {
      const d = day(date), sec = el('section', 'ag-day' + (date === today ? ' today' : ''));
      const h = el('h2', '', M.dateText(date, 'long') + (date === today ? ', today' : ''));
      sec.appendChild(h);
      const facts = [];
      d.markers.forEach((m) => facts.push(m.name));
      if (d.trip) facts.push(d.trip.name);
      if (d.due.length) facts.push(plural(d.due.length, 'thing', 'things') + ' due');
      M.clashes(state, date).forEach((c) => facts.push(c.a.name + ' and ' + c.b.name + ' overlap at ' + M.clock(c.start)));
      if (facts.length) sec.appendChild(el('p', 'ag-facts', facts.join(' · ')));
      const ol = el('ol', 'ag-list');
      const rows = d.blocks.filter((b) => !b.sleep).map((b) => ({ b, start: b.start })).concat(M.gaps(d).filter((g) => g[1] - g[0] >= 30).map((g) => ({ gap: g, start: g[0] }))).sort((a, b) => a.start - b.start);
      const up = d.blocks.find((b) => b.sleep === 'am'), bed = d.blocks.find((b) => b.sleep === 'pm');
      if (up) { const li = el('li'); li.appendChild(button('Up at ' + M.clock(d.wake), 'ag-time-only', () => openSel({ type: 'day', date }))); ol.appendChild(li); }
      rows.forEach((r) => {
        const li = el('li');
        if (r.gap) {
          li.appendChild(button(M.span(r.gap[0], r.gap[1]) + ': ' + M.dur(r.gap[1] - r.gap[0]) + ' open. Add something', 'ag-open', () => openSel({ type: 'slot', date, start: r.gap[0] })));
          ol.appendChild(li);
          return;
        }
        const b = r.b, c = W.look(b), past = date < today || (date === today && b.start + b.dur <= nowMin);
        const btn = el('button', 'ag-block' + (b.soft ? ' soft' : '') + (b.free ? ' free' : '') + (past ? ' past' : '') + (view.pick && view.pick.date === date && view.pick.key === b.base ? ' on' : ''));
        btn.type = 'button';
        btn.style.setProperty('--bg', c.base); btn.style.setProperty('--ink', b.free ? '#3F2A12' : c.ink);
        btn.append(icon(b.done ? 'check' : b.icon || 'star', 9, b.free ? '#3F2A12' : c.ink));
        const t = el('span', 'ag-bt');
        const kind = b.free ? 'kept free' : b.soft ? 'open time' : b.fixed ? 'locked' : '';
        t.append(el('b', '', b.label || b.name), el('small', '', M.span(b.start, b.start + b.dur) + ' · ' + cat(b.cat).name + (kind ? ' · ' + kind : '') + (b.done ? ' · done' : '') + (b.dinner ? ' · ' + (b.planned ? cookName(b.cook, date < today) || 'decided' : 'not picked yet') : '')));
        btn.appendChild(t);
        if (b.fixed) btn.appendChild(icon('lock', 7, c.ink));
        btn.setAttribute('aria-label', (b.label || b.name) + ', ' + M.span(b.start, b.start + b.dur) + ', ' + M.dur(b.dur) + ', ' + cat(b.cat).name + (kind ? ', ' + kind : '') + (b.done ? ', done' : '') + '. Opens its details.');
        btn.addEventListener('click', () => { Snd.init(); Snd.pick(); openSel(b.dinner ? { type: 'dinner', date: sourceDate(b, date) } : { type: 'block', date: sourceDate(b, date), key: sourceKey(b) }); });
        li.appendChild(btn);
        ol.appendChild(li);
      });
      if (bed) { const li = el('li'); li.appendChild(button('Bed at ' + M.clock(d.bed), 'ag-time-only', () => openSel({ type: 'day', date }))); ol.appendChild(li); }
      sec.appendChild(ol);
      const acts = el('div', 'actions');
      acts.append(button('Add to ' + M.DAY_LONG[M.weekday(date)], 'small', () => { const g = M.gaps(d)[0]; openSel({ type: 'slot', date, start: g ? g[0] : d.wake }); }));
      if (view.zoom === 'week') acts.append(button('Only this day', 'small quiet', () => setZoom('day', date)));
      sec.appendChild(acts);
      box.appendChild(sec);
    });
    if (!moved) box.scrollTop = keep;
    else { const t = box.querySelector('.ag-day.today'); box.scrollTop = t ? t.offsetTop - 14 : 0; }
  }

  /* == help when something goes wrong ==
     A report of this screen with no names and nothing from the week in it, and a note back to us. */
  function report() {
    const n = (o) => (o ? Object.keys(o).length : 0);
    return window.Diagnostics.report({
      version: D.VERSION, where: (view.phone ? 'phone ' : '') + view.mode + ', ' + view.zoom + (view.list ? ', list' : ''),
      width: innerWidth, height: innerHeight, scale: window.devicePixelRatio || 1, userAgent: navigator.userAgent,
      available: !noDesk, framed: W.framed, lighter: view.lowPower,
      saveMode: Store.mode, saveStatus: Store.status, saveError: Store.lastError && Store.lastError.what, unreadable: Store.unreadable,
      syncState: Cloud.cfg ? (Cloud.on ? Cloud.status : 'off') : 'no-server', pending: Cloud.dirty,
      board: { tasks: state.tasks.length, dates: n(state.dates), events: state.events.length, calendars: (state.calendars || []).length, rescues: Store.rescues().length },
      deviceZone: deviceTz(), homeZone: state.settings.tz,
      errors: errLog.slice(-8)
    });
  }
  /* who a note goes to when there's no server to take it: the contact the server names, or whoever
     gave this person the app */
  /* Who shared the app: a link like ?from=Russell says so on the welcome and in feedback. It's kept on
     this device (never on the board), and the address loses the word, so it's never passed on by accident. */
  const FROM_KEY = 'sundayreset.from';
  let sharedBy = '';
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('from')) {
      const f = (q.get('from') || '').replace(/[^\p{L}\p{N} .'’-]/gu, '').trim().slice(0, 30);
      if (f) localStorage.setItem(FROM_KEY, f);
      q.delete('from');
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    }
    sharedBy = localStorage.getItem(FROM_KEY) || '';
  } catch (e) { sharedBy = ''; }
  const sendTo = () => (Cloud.cfg && Cloud.cfg.contact) || sharedBy || 'whoever shared Sunday Reset with you';
  function feedbackPanel(p) {
    /* p.ask: 'reset' asks one question after the first Sunday Reset, with answers a tap away */
    const sel = view.sel || {}, ask = sel.ask === 'reset';
    kicker(p, 'Help', 'note2');
    title(p, ask ? 'How was your first Sunday Reset?' : sharedBy ? 'Tell ' + sharedBy + ' what you think' : 'Something isn’t working?');
    line(p, ask ? 'A few words is plenty.' : sharedBy ? 'What broke, what confused you, what you liked.' : 'What you were doing, and what happened.');
    const f = view.got.fb || (view.got.fb = { text: '', send: !ask });
    const ta = el('textarea', 'input');
    if (ask) {
      field(p, 'It was', chips(['Worth the time', 'Too long', 'Confusing in places', 'I skipped parts'].map((x) => ({ id: x, name: x })), null, (v) => { f.text = (f.text ? f.text.replace(/^(Worth the time|Too long|Confusing in places|I skipped parts)\.\s*/, '') : ''); f.text = v + '. ' + f.text; ta.value = f.text; ta.focus(); }));
    }
    ta.rows = 5; ta.maxLength = 2000; ta.value = f.text; ta.placeholder = ask ? 'The dinners step took the longest.' : sharedBy ? 'I liked seeing the whole week. The dinner part confused me.' : 'I opened the desk on my phone and the board was blank.';
    ta.dataset.fk = 'fb'; ta.dataset.v0 = ta.value;
    ta.addEventListener('input', () => { f.text = ta.value; });
    ta.addEventListener('keydown', (e) => e.stopPropagation());
    field(p, ask ? 'Anything else' : 'What happened', ta);
    p.appendChild(toggle('Include the report', f.send, (v) => { f.send = v; renderSide(); }));
    const rep = el('pre', 'report');
    rep.textContent = JSON.stringify(report(), null, 1);
    const det = el('details', 'report-box');
    /* what the report holds, said once, inside its own fold */
    det.append(el('summary', '', 'What the report holds'), el('p', 'field-hint', 'Screen sizes, saving status, counts, and kinds of errors. Never what’s on your board, keys, addresses, or error text.' + (Cloud.cfg ? '' : ' It goes as a message you send to ' + sendTo() + '.')), rep);
    p.appendChild(det);
    /* without a server, a phone's share sheet sends it as a message; anywhere else it's copied */
    const canShare = !Cloud.cfg && typeof navigator.share === 'function';
    actions(p, [
      button(Cloud.cfg ? 'Send it' : canShare ? 'Send it as a message' : 'Copy it', 'small primary', async () => {
        const text = f.text.trim();
        if (!text) { toast('Say a few words first'); ta.focus(); return; }
        const body = { text: (ask ? 'First Sunday Reset: ' : '') + text, where: report().where, report: f.send ? report() : null };
        if (Cloud.cfg) {
          const r = await Cloud.feedback(body);
          if (!r.error) { view.got.fb = null; closeSel(); toast('Sent. Thank you.', 'good'); return; }
        }
        const all = 'Sunday Reset: ' + body.text + '\n\n' + (f.send ? JSON.stringify(body.report, null, 1) : '');
        if (canShare) {
          try { await navigator.share({ title: 'Sunday Reset', text: all }); view.got.fb = null; closeSel(); toast('Thank you.', 'good'); return; } catch (e) { if (e && e.name === 'AbortError') return; }
        }
        try { await navigator.clipboard.writeText(all); toast((Cloud.cfg ? 'Couldn’t send it, so it’s copied instead. ' : 'Copied. ') + 'Paste it in a message to ' + sendTo() + '.', 'good'); } catch (e) { rep.textContent = all; det.open = true; toast('Select the report and copy it'); }
      }),
      button('Copy the report only', 'small', async () => { try { await navigator.clipboard.writeText(JSON.stringify(report(), null, 1)); toast('Copied', 'good'); } catch (e) { det.open = true; } })
    ]);
  }

  /* == zoom and moving through time == */
  function setZoom(z, focus) {
    if (focus) view.focus = focus;
    if (z === view.zoom && !focus) return;
    const out = ZOOMS.indexOf(z) > ZOOMS.indexOf(view.zoom);
    view.zoom = z;
    Snd.zoom(out);
    saveView();
    render();
    if (z === 'month' || z === 'year') noteMove('month');
  }
  function zoomStep(dir) {
    const i = Math.max(0, Math.min(3, ZOOMS.indexOf(view.zoom) + dir));
    if (ZOOMS[i] !== view.zoom) setZoom(ZOOMS[i]);
  }
  function shift(dir) {
    const z = view.zoom;
    view.focus = z === 'day' ? M.addDays(view.focus, dir) : z === 'week' ? M.addDays(view.focus, 7 * dir) : z === 'month' ? M.addMonths(M.monthStart(view.focus), dir) : M.addMonths(M.monthStart(view.focus), 12 * dir);
    Snd.slide();
    render();
  }

  /* == the tray == */
  function tile(o) {
    const t = el('div', 'tile' + (o.cls ? ' ' + o.cls : ''));
    t.setAttribute('role', 'button');
    t.tabIndex = 0;
    const c = o.cat ? cat(o.cat) : null;
    const bg = o.bg || (c ? c.base : '#EFB940'), ink = o.ink || (c ? c.ink : '#4B3A18');
    t.style.setProperty('--bg', bg);
    t.style.setProperty('--ink', ink);
    /* the mark sits beside the name, so a tile is one short card */
    const head = el('div', 'tl');
    if (o.icon) head.appendChild(icon(o.icon, 11, ink));
    head.appendChild(el('div', 'nm', o.name));
    t.appendChild(head);
    /* the name keeps its whole row. The badge sits at the end of the line under it, where its room is
       measured, never guessed, and the words beside it give way before the name ever does */
    if (o.meta || o.badge) {
      const mt = el('div', 'mt');
      if (o.meta) mt.appendChild(el('span', 'mt-t', o.meta));
      if (o.badge) { mt.appendChild(el('span', 'badge' + (o.badgeCls ? ' ' + o.badgeCls : ''), o.badge)); t.classList.add('tagged'); }
      t.appendChild(mt);
    }
    if (o.title) t.title = o.title;
    if (o.drag) dragSource(t, o.drag, o.onClick);
    else if (o.onClick) t.addEventListener('click', () => { Snd.init(); Snd.pick(); o.onClick(); });
    t.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && o.onClick) { e.preventDefault(); o.onClick(); } });
    return t;
  }
  function addTile(name, fn) { return tile({ name, cls: 'add', onClick: fn }); }
  /* A call to action that opens something, drawn so it can't be mistaken for a filter chip. */
  function cta(label, sub, ic, fn, card) {
    const b = el('button', card ? 'cta cta-card' : 'cta');
    b.type = 'button';
    b.appendChild(icon(ic, 11, UI.gold));
    const t = el('span', 'grow', label);
    if (sub) t.appendChild(el('small', '', sub));
    b.appendChild(t);
    const ch = el('span', 'chev'); ch.appendChild(icon('right', 8, UI.gold));
    b.appendChild(ch);
    b.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); Snd.pick(); fn(); });
    return b;
  }
  /* one short line that never wraps; how the list fills is said inside its panel */
  /* how far the shopping is, said one way on the card, the panel, the recap, and the phone: only what
     is on the list now is counted, so a dinner that changed can't leave 3 of 1 in the cart */
  const groceryWords = (g, tail) => (!g.total ? 'Nothing to get yet' : g.got ? g.got + ' of ' + g.total + ' in the cart' : plural(g.total, 'thing', 'things') + ' to get' + (tail || ''));
  const grocerySub = (dates) => groceryWords(M.groceryProgress(state, dates));
  function stackTile(o) { return tile(Object.assign({ cls: 'stack' + (o.cls ? ' ' + o.cls : '') }, o)); }

  /* the deadline is its own fact: a to do can have every time it needs and still be late. Said the
     same way on the tile, the bench, the panel, the phone, Look ahead, and the recap. */
  const AFTER_DUE = 'its time is after it’s due';
  function taskMeta(t, plan) {
    const bits = [];
    if (t.due) bits.push('Due ' + M.relText(t.due, today));
    if (t.steps && t.steps.length) {
      bits.push(plural(t.steps.length, 'step', 'steps') + (plan.open < t.steps.length ? ', ' + plan.open + ' left' : ''));
      if (plan.status === 'partial') bits.push(M.dur(plan.left) + ' still needs a time');
    } else bits.push(M.dur(M.taskDur(t)));
    if (plan.status === 'missed') bits.push('its time went by');
    return bits.join(' · ');
  }
  /* one tile for a to do, anywhere it shows: its chip says the same thing the board and the recap do */
  function taskTile(t, pl, glow) {
    const where = pl.get(t.id);
    const plan = M.taskPlan(t, where, today, nowMin);
    let badge = '', badgeCls = '';
    /* every time it needs, but after the day it's due: the chip says that, since that's what to act on */
    if (plan.status === 'planned' && plan.after) { badge = 'After due'; badgeCls = 'late'; }
    else if (plan.status === 'planned' && plan.next) { badge = M.DAY_SHORT[M.weekday(plan.next.date)] + ' ' + M.clock(plan.next.add.start); badgeCls = 'planned'; }
    else if (plan.status === 'partial') { badge = plan.timed + ' of ' + plan.open + ' timed'; badgeCls = 'partial'; }
    /* in Due soon every card is soon, so only Late earns a chip there; its due line says when */
    else if (!t.done && t.due && M.diffDays(today, t.due) <= 7) { const late = M.diffDays(today, t.due) < 0; if (late || !glow) { badge = late ? 'Late' : 'Soon'; badgeCls = late ? 'late' : 'soon'; } }
    return tile({
      name: t.name, meta: taskMeta(t, plan), icon: t.done ? 'check' : t.icon || 'check', cat: t.cat || 'yours', badge, badgeCls,
      cls: (t.done ? 'done' : '') + (glow ? ' glow' : ''),
      drag: t.done ? null : { kind: 'task', id: t.id },
      onClick: () => openSel({ type: 'task', id: t.id })
    });
  }
  /* the group a new to do lands in when nobody picked one: the Inbox, never whatever group is first */
  const inboxId = () => { const g = state.groups.find((x) => x.id === 'inbox') || state.groups[0]; return g ? g.id : null; };
  function findBox(body) {
    const wrap = el('div', 'find');
    const inp = el('input', 'input find-in');
    inp.type = 'search'; inp.placeholder = 'Find a to do'; inp.value = view.find || '';
    inp.setAttribute('aria-label', 'Find a to do by name');
    inp.dataset.fk = 'find';
    wrap.appendChild(icon('search', 8, UI.soft));
    wrap.appendChild(inp);
    const look = () => { view.find = inp.value; const pos = inp.selectionStart; renderRack(); const again = $('rack-body').querySelector('.find-in'); if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* fine */ } } };
    /* a character still being composed (Japanese, an accent on a phone) is left alone until it's whole */
    inp.addEventListener('input', (e) => { if (!e.isComposing) look(); });
    inp.addEventListener('compositionend', look);
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { view.find = ''; renderRack(); } });
    body.appendChild(wrap);
  }
  function todoBody(body) {
    const pl = M.placements(state);
    const soon = M.dueSoon(state, today, 21, nowMin);
    if (view.level) {
      let list;
      if (view.level === 'soon') list = soon.map((x) => x.task);
      else list = state.tasks.filter((t) => t.group === view.level && !t.archived).sort((a, b) => (a.done - b.done) || ((a.due || 'z') < (b.due || 'z') ? -1 : 1));
      list.filter((t) => !t.done).forEach((t) => body.appendChild(taskTile(t, pl, view.level === 'soon')));
      if (view.level !== 'soon') body.appendChild(addTile('New to do', () => openSel({ type: 'newTask', group: view.level })));
      const done = list.filter((t) => t.done);
      if (done.length) {
        body.appendChild(el('div', 'sep'));
        done.slice(-6).forEach((t) => body.appendChild(taskTile(t, pl)));
        /* done ones can be put away, so a long list stays about what's left */
        body.appendChild(tile({ name: 'Put away done ones', meta: plural(done.length, 'done to do', 'done to dos') + '. Find still finds them.', icon: 'box', bg: '#EFE3CA', ink: '#4E3719', cls: 'mini', onClick: () => { commit(() => { done.forEach((t) => { t.archived = true; }); }); toast(plural(done.length, 'done to do is', 'done to dos are') + ' put away', '', { label: 'Undo', fn: undo }); } }));
      }
      if (!list.length) body.appendChild(el('div', 'rack-note', view.level === 'soon' ? 'Nothing is due in the next three weeks.' : 'No to dos in ' + groupName(view.level) + ' yet. Add one here, or move one in from its panel.'));
      return;
    }
    findBox(body);
    const q = (view.find || '').trim().toLowerCase();
    if (q) {
      const hits = state.tasks.filter((t) => t.name.toLowerCase().includes(q) || (t.steps || []).some((s) => s.name.toLowerCase().includes(q)))
        .sort((a, b) => (a.done - b.done) || ((a.due || 'z') < (b.due || 'z') ? -1 : 1)).slice(0, 30);
      hits.forEach((t) => body.appendChild(taskTile(t, pl)));
      if (!hits.length) body.appendChild(el('div', 'rack-note', 'No to do has “' + view.find.trim() + '” in it.'));
      body.appendChild(addTile('New to do: ' + view.find.trim(), () => { const name = view.find.trim(); view.find = ''; const id = M.newId('t'); commit(() => { state.tasks.push({ id, name: cap(name), group: inboxId(), icon: 'check', cat: 'yours', dur: null, due: null, repeat: null, done: false, steps: [] }); }); openSel({ type: 'task', id }); }));
      return;
    }
    const week = M.dueSoon(state, today, 7, nowMin).length, late = soon.filter((x) => x.task.due && x.task.due < today).length;
    /* a pile that's all past its date says so, not "30 this week" */
    body.appendChild(stackTile({ name: 'Due soon', meta: !soon.length ? 'All clear' : late === soon.length ? late + ' overdue' : (week ? week + ' this week · ' : '') + soon.length + ' in 3 weeks', icon: 'flag', bg: '#E88A6E', ink: '#3A1A10', onClick: () => openLevel('soon') }));
    const clash = M.clashesIn(state, today, 14);
    if (clash.length) body.appendChild(stackTile({ name: plural(clash.length, 'overlap', 'overlaps'), meta: clashLine(clash[0]), icon: 'overlap', bg: UI.gold, ink: '#3A2A08', onClick: () => openSel({ type: 'clashes' }) }));
    for (const g of state.groups) {
      const open = state.tasks.filter((t) => t.group === g.id && !t.done && !t.archived);
      if (g.id === 'inbox' && !open.length) continue;
      const next = open.filter((t) => t.due).sort((a, b) => (a.due < b.due ? -1 : 1))[0];
      body.appendChild(stackTile({ name: g.name, meta: plural(open.length, 'open', 'open') + (next ? (next.due < today ? ' · overdue since ' : ' · next ') + M.dateText(next.due) : ''), icon: g.icon, bg: '#EFE3CA', ink: '#5A4632', onClick: () => openLevel(g.id) }));
    }
    body.appendChild(addTile('New to do', () => openSel({ type: 'newTask', group: inboxId() })));
    body.appendChild(addTile('New group', () => openSel({ type: 'newGroup' })));
  }
  /* two real commitments at once, said plainly */
  function clashLine(c) { return M.DAY_SHORT[M.weekday(c.date)] + ' ' + M.clock(c.start) + ': ' + c.a.name + ' and ' + c.b.name; }

  /* One card per night: the day, then the dinner's name large and how it's happening small.
     An open night shows a plus. A night with no dinner block says so and can put it back. */
  function dinnerSlots(body, dates) {
    const box = el('div', 'slots');
    for (const date of dates) {
      const d = day(date), dn = state.dinners[date];
      const hasBlock = d.blocks.some((b) => b.dinner);
      const planned = hasBlock && dn && (dn.name || dn.cook);
      const s = el('div', 'slot' + (planned ? ' set' : '') + (hasBlock ? '' : ' off') + (date === today ? ' today' : ''));
      s.dataset.dinner = date;
      const top = el('div', 'dy');
      top.appendChild(el('span', '', M.DAY_SHORT[M.weekday(date)] + ' ' + M.parts(date).d));
      s.appendChild(top);
      const past = date < today;
      if (!hasBlock) {
        s.appendChild(el('div', 'dn quiet', d.trip ? 'Away' : 'No dinner'));
        if (!d.trip) {
          /* a dinner taken off comes back; a day that never had one gets one */
          const had = M.templateFor(state, date).blocks.some((b) => b.dinner);
          const back = el('button', 'slot-act', had ? 'Put it back' : 'Add dinner');
          back.type = 'button';
          back.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); restoreDinner(date); });
          s.appendChild(back);
        }
      } else if (planned) {
        const how = cookName(dn.cook, past);
        s.appendChild(el('div', 'dn', dn.name || how));
        s.appendChild(el('div', 'ck' + (dn.cook === 'me' ? ' me' : ''), dn.name ? (dn.cook === 'home' ? 'Who’s cooking?' : how) : ''));
      } else if (past) {
        /* a night that's over says so; tapping it can still fill in what happened */
        s.appendChild(el('div', 'dn quiet', 'Not planned'));
      } else {
        s.classList.add('empty');
        const plus = el('div', 'slot-plus');
        plus.appendChild(icon('plus', 11, UI.soft));
        s.appendChild(plus);
      }
      s.setAttribute('role', 'button'); s.tabIndex = hasBlock ? 0 : -1;
      s.setAttribute('aria-label', M.dateText(date, 'long') + ': ' + (planned ? (dn.name || cookName(dn.cook, past)) : hasBlock ? 'pick dinner' : 'no dinner'));
      if (hasBlock) {
        const open = () => { Snd.init(); Snd.pick(); openSel({ type: 'dinner', date }); };
        s.addEventListener('click', open);
        s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      }
      box.appendChild(s);
    }
    body.appendChild(box);
  }
  /* Put a night's dinner back on the board: the usual dinner if it was taken off, or a new one near 6:30. */
  function restoreDinner(date) {
    const dd = state.dates[date] || {};
    const tb = M.templateFor(state, date).blocks.find((b) => b.dinner);
    if (tb && dd.edits && dd.edits[tb.id] && dd.edits[tb.id].gone) { commit(() => { delete state.dates[date].edits[tb.id]; }); Snd.clack(0.6); toast('Dinner is back on ' + M.DAY_LONG[M.weekday(date)], 'good'); return; }
    const at = M.firstFit(state, date, 45, 18 * 60 + 30) ?? M.firstFit(state, date, 45, day(date).wake);
    if (at == null) { Snd.bad(); toast('No open time for dinner that day', 'bad'); return; }
    const r = commit(() => M.placeAdd(state, date, { name: 'Dinner', cat: 'meals', icon: 'pot', dur: 45, dinner: true }, at));
    if (r && r.ok) { Snd.clack(0.6); toast('Dinner on ' + M.DAY_LONG[M.weekday(date)] + ' at ' + M.clock(r.start), 'good'); }
  }
  function backTile(body) {
    if (!view.reset) return;
    const t = tile({ name: 'Back', meta: 'All groups', icon: 'flag', bg: 'rgba(255,255,255,0.1)', ink: '#FFFFFF', cls: 'mini', onClick: () => { view.level = null; renderRack(); } });
    body.appendChild(t);
  }
  function pantryBody(body) {
    if (view.level) {
      backTile(body);
      if (view.level === 'recipes') {
        state.recipes.forEach((r) => body.appendChild(tile({ name: r.name, meta: r.items.map((i) => (state.pantry.find((p) => p.id === i) || {}).name).filter(Boolean).join(', '), icon: 'pot', cat: 'meals', drag: { kind: 'recipe', id: r.id }, onClick: () => openSel({ type: 'place', spec: { kind: 'recipe', id: r.id } }) })));
      } else {
        state.pantry.filter((p) => p.kind === view.level).forEach((p) => body.appendChild(tile({ name: p.name, icon: D.PANTRY_KINDS.find((k) => k.id === p.kind).icon, bg: '#EFE3CA', ink: '#4E3719', cls: 'mini', drag: { kind: 'pantry', id: p.id }, onClick: () => openSel({ type: 'place', spec: { kind: 'pantry', id: p.id } }) })));
      }
      return;
    }
    body.appendChild(stackTile({ name: 'Recipes', meta: state.recipes.slice(0, 2).map((r) => r.name).join(', ') + (state.recipes.length > 2 ? ' and ' + (state.recipes.length - 2) + ' more' : ''), icon: 'pot', cat: 'meals', onClick: () => openLevel('recipes') }));
    const peek = (names) => names.slice(0, 3).join(', ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '');
    D.PANTRY_KINDS.forEach((k) => body.appendChild(stackTile({ name: k.name, meta: peek(state.pantry.filter((p) => p.kind === k.id).map((p) => p.name)), icon: k.icon, bg: '#EFE3CA', ink: '#4E3719', onClick: () => openLevel(k.id) })));
  }
  /* a section of the tray: a small heading close above what it names */
  function rackSection(body, heading, cls) {
    const sec = el('section', 'rsec' + (cls ? ' ' + cls : ''));
    sec.appendChild(el('h3', 'rsec-h', heading));
    const row = el('div', 'rsec-row');
    sec.appendChild(row);
    body.appendChild(sec);
    return row;
  }
  function dinnersBody(body, dates) {
    const week = rackSection(body, view.reset ? (view.reset.week > M.weekStart(today) ? 'Next week’s dinners' : 'This week’s dinners') : 'This week');
    dinnerSlots(week, dates);
    week.appendChild(cta('Grocery list', grocerySub(dates), 'cart', () => openSel({ type: 'groceries' }), true));
    pantryBody(rackSection(body, view.level ? levelName() : 'Pantry'));
  }
  function ideaTile(i) {
    return tile({ name: i.name, meta: M.dur(i.dur), icon: i.icon, cat: 'us', drag: { kind: 'idea', id: i.id }, onClick: () => openSel({ type: 'place', spec: { kind: 'idea', id: i.id } }) });
  }
  function kimBody(body) {
    if (view.level) {
      backTile(body);
      state.ideas.filter((i) => i.kind === view.level).forEach((i) => body.appendChild(ideaTile(i)));
      body.appendChild(addTile('New idea', () => openSel({ type: 'newIdea', kind: view.level })));
      return;
    }
    const wk = weekOf();
    const placed = [];
    wk.forEach((d) => day(d).blocks.forEach((b) => { if (b.src && b.src.type === 'idea') placed.push(b.name + ', ' + M.DAY_SHORT[M.weekday(d)]); }));
    D.IDEA_KINDS.forEach((k) => body.appendChild(stackTile({ name: k.name, meta: plural(state.ideas.filter((i) => i.kind === k.id).length, 'idea', 'ideas'), icon: k.icon, cat: 'us', onClick: () => openLevel(k.id) })));
    body.appendChild(el('div', 'rack-note', placed.length ? 'This week: ' + placed.join(' and ') + '.' : named('Pick one thing to bring to {partner} this week, and drop it on an evening.')));
  }
  /* Open a stack: its tiles fan out in the tray, and in the week or day view its pieces land on the bench. */
  /* Open a stack: its tiles fan out in the tray. Laying them out on the desk as pieces is its own
     step, so the tray and the bench never show the same things twice and the board keeps its size. */
  function openLevel(level) {
    view.level = level;
    if (view.bench) view.bench = { tab: view.tab, level };
    render();
  }
  const benchFor = () => benchOk() && !view.reset && (view.tab === 'todo' || view.tab === 'kim' || view.tab === 'dinners');
  function layOut() { view.bench = { tab: view.tab, level: view.level || (view.tab === 'todo' ? 'soon' : null) }; Snd.zoom(false); render(); }
  function closeBench() { if (!view.bench) return; view.bench = null; Snd.slide(); render(); }
  /* the blocks you placed most lately, newest first, from the last five weeks */
  function recentBlocks() {
    const seen = new Map(), from = M.addDays(today, -35);
    Object.keys(state.dates).filter((d) => d >= from).sort().forEach((d) => (state.dates[d].adds || []).forEach((a) => { const id = a.src && a.src.type === 'block' ? a.src.id : a.src && a.src.block; if (id) seen.set(id, d); }));
    return Array.from(seen.entries()).sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([id]) => id);
  }
  function blocksBody(body, only) {
    if (!view.reset && benchOk()) body.appendChild(stackTile({ name: 'Lay them out', meta: 'On the bench', icon: 'box', bg: '#EFE3CA', ink: '#4E3719', onClick: () => { view.bench = { tab: 'blocks', level: null }; Snd.zoom(false); render(); } }));
    const recent = recentBlocks().slice(0, 5);
    const list = library().filter((p) => !only || only.includes(p.cat));
    const tileOf = (p, cls) => tile({ name: p.name, meta: M.dur(p.dur), icon: p.icon, cat: p.cat, cls: 'mini' + (cls || ''), drag: { kind: 'block', id: p.id }, onClick: () => openSel({ type: 'place', spec: { kind: 'block', id: p.id } }), title: cls ? 'Used lately' : '' });
    /* the ones you use lead, so a long list starts with your week */
    list.filter((p) => recent.includes(p.id)).sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id)).forEach((p) => body.appendChild(tileOf(p, ' recent')));
    if (recent.length) body.appendChild(el('div', 'sep'));
    list.filter((p) => !recent.includes(p.id)).forEach((p) => body.appendChild(tileOf(p)));
    body.appendChild(addTile('New block', () => openSel({ type: 'newBlock' })));
  }

  /* == the tray bar ==
     The bar holds shortcuts, in the order this device keeps them (view.bar; null is the usual bar).
     A shortcut opens a part of the tray (To do, Dinners, time together, Block library), a stack inside
     one (Due soon, a group of to dos, recipes), or a panel (the grocery list, overlaps, weekly
     meetings), or does one thing (the week as a list, print). A part the board doesn't help with
     leaves the bar by itself. Arranged in Settings, The tray bar, or from the bar's own button. */
  const BAR_USUAL = ['todo', 'dinners', 'kim', 'blocks'], BAR_MAX = 8;
  const TAB_NAMES = { todo: 'To do', dinners: 'Dinners', kim: '', blocks: 'Block library' };
  const tabName = (id) => (id === 'kim' ? withName() : TAB_NAMES[id] || '');
  function barCatalog() {
    const out = [
      { id: 'todo', name: 'To do', icon: 'flag', tab: 'todo', kind: 'Tray sections', says: 'Opens the tray at To do' },
      { id: 'dinners', name: 'Dinners', icon: 'pot', tab: 'dinners', kind: 'Tray sections', says: 'Opens the tray at Dinners', on: useDinners() },
      { id: 'kim', name: withName(), icon: 'heart', tab: 'kim', kind: 'Tray sections', says: 'Opens the tray at ideas for time together', on: useTogether() },
      { id: 'blocks', name: 'Block library', icon: 'box', tab: 'blocks', kind: 'Tray sections', says: 'Opens the tray at the blocks you drag onto a day, in the week, month, and year' },
      { id: 'soon', name: 'Due soon', icon: 'flag', tab: 'todo', level: 'soon', kind: 'Lists inside the tray', says: 'Straight to what’s due in three weeks' }
    ];
    state.groups.forEach((g) => out.push({ id: 'g:' + g.id, name: g.name, icon: g.icon || 'check', tab: 'todo', level: g.id, kind: 'Lists inside the tray', says: 'Straight to the to dos in ' + g.name }));
    out.push({ id: 'recipes', name: 'Recipes', icon: 'bowl', tab: 'dinners', level: 'recipes', kind: 'Lists inside the tray', says: 'Straight to your recipes', on: useDinners() });
    D.IDEA_KINDS.forEach((k) => out.push({ id: 'i:' + k.id, name: k.name, icon: k.icon, tab: 'kim', level: k.id, kind: 'Lists inside the tray', says: 'Straight to ' + k.name.toLowerCase() + ' ideas for time together', on: useTogether() }));
    out.push({ id: 'groceries', name: 'Grocery list', icon: 'cart', open: { type: 'groceries' }, kind: 'Panels', says: 'Opens the week’s grocery list', on: useDinners() });
    out.push({ id: 'overlaps', name: 'Overlaps', icon: 'overlap', open: { type: 'clashes' }, kind: 'Panels', says: 'Opens what asks for the same time' });
    out.push({ id: 'meetings', name: 'Weekly meetings', icon: 'people', open: { type: 'meetings' }, kind: 'Panels', says: 'Opens your weekly meetings' });
    out.push({ id: 'howto', name: 'How it works', icon: 'help', open: { type: 'help' }, kind: 'Panels', says: 'Opens the short guide to blocks, dragging, and keys' });
    out.push({ id: 'newblock', name: 'Make a block', icon: 'plus', open: { type: 'newBlock' }, kind: 'Actions', says: 'Opens the form for a block of your own: a name, a length, a color, a mark' });
    out.push({ id: 'newtodo', name: 'New to do', icon: 'check', open: { type: 'newTask', group: null }, kind: 'Actions', says: 'Opens a new to do, with a due date and a group' });
    out.push({ id: 'list', name: 'Week as a list', icon: 'list', run: () => setList(!view.list), kind: 'Actions', says: 'Switches between the desk and the list', on: !noDesk, pressed: () => !!view.list, planner: true });
    out.push({ id: 'print', name: 'Print this week', icon: 'print', run: () => printWeek(), kind: 'Actions', says: 'Sends the week to paper' });
    return out.filter((x) => x.on !== false);
  }
  /* the usual bar is the four parts of the tray, less any this board doesn't help with */
  const barUsual = () => { const all = barCatalog(); return BAR_USUAL.filter((id) => all.some((x) => x.id === id)); };
  const barIds = () => (Array.isArray(view.bar) && view.bar.length ? view.bar : BAR_USUAL);
  function barItems() { const all = barCatalog(); const list = barIds().map((id) => all.find((x) => x.id === id)).filter(Boolean); return list.length ? list : all.filter((x) => BAR_USUAL.includes(x.id)); }
  function setBar(list) {
    view.bar = list && list.length && list.join() !== barUsual().join() ? list.slice(0, BAR_MAX) : null;
    saveView();
    if (ready) { renderRack(); layoutInsets(); }
    if (view.drawer) renderDrawer();
  }
  function barGo(it, on) {
    Snd.init(); Snd.pick();
    if (it.run) { it.run(); return; }
    if (it.open) { if (view.sel && view.sel.type === it.open.type) closeSel(); else openSel(it.open); return; }
    const dock = inToday();
    /* tapping the one that's open folds the tray; anything else opens there */
    if (on) setTrayCollapsed(true);
    else { view.tab = it.tab; view.level = it.level || null; setTrayCollapsed(false); }
    saveView();
    if (view.bench || dock) { view.bench = null; render(); } else { renderRack(); layoutInsets(); }
  }
  /* The tray bar's page in Settings: what's on it, in order, and what else can go there, each with
     what it does said out loud (not only on hover). Drag a row by its grip, or use its arrows. */
  const BAR_KINDS = [
    ['Tray sections', 'Open the tray at one of its sections.'],
    ['Lists inside the tray', 'Go straight to one stack inside a section, like one group of to dos.'],
    ['Panels', 'Open a panel beside the desk.'],
    ['Actions', 'Do one thing with a tap.']
  ];
  const COUNT_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  function barPage(p) {
    const all = barCatalog(), on = barItems(), ids = on.map((x) => x.id);
    p.appendChild(el('p', 'dsec-line', 'Shortcuts along the bottom of the desk. Put what you open most first, take off what you never use, and add anything you’d like one tap away.' + (wideSettings() ? ' The bar beside this changes as you go.' : '')));
    const sec = dsec(p, 'On the bar', ids.length + ' of ' + BAR_MAX + ' places used. Drag a row by its grip, or use its arrows.');
    const list = el('div', 'list bar-list');
    on.forEach((it, i) => {
      const row = el('div', 'list-row bar-row');
      row.dataset.id = it.id;
      const grip = el('span', 'grip');
      grip.appendChild(icon('grip', 9, UI.soft));
      grip.title = 'Drag to move ' + it.name;
      const t = el('span', 'grow', it.name);
      t.appendChild(el('small', '', it.says));
      const mv = (label, ic, to) => { const b = stepBtn(ic, label, () => { const next = ids.slice(); next.splice(i, 1); next.splice(to, 0, it.id); setBar(next); say(it.name + ', ' + (to + 1) + ' of ' + next.length); }); b.className = 'mini-btn'; b.dataset.fk = 'bar-' + ic + '-' + it.id; b.disabled = to < 0 || to >= ids.length; return b; };
      const off = stepBtn('x', 'Take ' + it.name + ' off the bar', () => { setBar(ids.filter((x) => x !== it.id)); say(it.name + ' is off the bar'); });
      off.className = 'mini-btn'; off.disabled = ids.length <= 1;
      row.append(grip, icon(it.icon, 9, UI.gold), t, mv('Move ' + it.name + ' earlier', 'up', i - 1), mv('Move ' + it.name + ' later', 'down', i + 1), off);
      list.appendChild(row);
    });
    sec.appendChild(list);
    dragOrder(list, (next) => setBar(next));
    /* the bar beside this leaves some off where they'd repeat what's on the desk (renderRack); say so,
       so a missing shortcut never reads as a bug */
    const dock = inToday(), resting = on.filter((it) => (it.tab === 'blocks' && (view.zoom === 'day' || dock)) || (dock && it.planner));
    if (resting.length) {
      const lib = resting.some((it) => it.tab === 'blocks'), other = resting.filter((it) => it.tab !== 'blocks').map((it) => it.name);
      const where = dock ? 'In Today' : 'In the day view';
      sec.appendChild(el('p', 'dsec-line', (lib ? where + ' Block library sits beside the day, so it rests off the bar there.' : '')
        + (other.length ? (lib ? ' ' : '') + (other.length > 1 ? other.slice(0, -1).join(', ') + ' and ' + other[other.length - 1] + ' are' : other[0] + ' is') + ' for the Planner, so ' + (other.length > 1 ? 'they rest' : 'it rests') + ' off the bar in Today.' : '')));
    }
    const usual = barUsual();
    if (ids.join() !== usual.join()) {
      const names = usual.map((id) => all.find((x) => x.id === id).name);
      actions(sec, [button('Back to the usual ' + (COUNT_WORDS[usual.length] || usual.length) + ': ' + (names.length > 2 ? names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1] : names.join(' and ')), 'small quiet', () => { setBar(null); say('The bar is back to the usual ' + COUNT_WORDS[usual.length]); })]);
    }
    const rest = all.filter((x) => !ids.includes(x.id));
    const full = ids.length >= BAR_MAX;
    const more = dsec(p, 'Add to the bar', full ? 'The bar holds ' + BAR_MAX + '. Take one off to add another.' : rest.length ? null : 'Everything is on the bar.');
    BAR_KINDS.forEach(([kind, what]) => {
      const items = rest.filter((x) => x.kind === kind);
      if (!items.length) return;
      const grp = el('div', 'bar-add');
      grp.appendChild(el('h5', 'bar-kind', kind));
      grp.appendChild(el('p', 'bar-kind-line', what));
      const rows = el('div', 'list');
      items.forEach((it) => {
        const row = el('div', 'list-row bar-row add');
        const t = el('span', 'grow', it.name);
        t.appendChild(el('small', '', it.says));
        const b = button('Add', 'small', () => { Snd.pick(); setBar(ids.concat(it.id)); say(it.name + ' is on the bar'); });
        b.prepend(icon('plus', 7, UI.white));
        b.setAttribute('aria-label', 'Add ' + it.name + ' to the bar');
        b.dataset.fk = 'bar-add-' + it.id;
        b.disabled = full;
        row.append(icon(it.icon, 9, UI.gold), t, b);
        rows.appendChild(row);
      });
      grp.appendChild(rows);
      more.appendChild(grp);
    });
    const own = dsec(p, 'A block of your own', 'Blocks live in Block library. Make one there, with its own name, length, color, and mark, and it shows up in the tray.');
    actions(own, [button('Open Block library', 'small', () => goPage('library')), button('Make a block', 'small primary', () => { closeDrawer(); openSel({ type: 'newBlock' }); })]);
  }
  /* rows that can be dragged into a new order by their grips; onMove gets the ids in their new order */
  function dragOrder(list, onMove) {
    list.querySelectorAll('.grip').forEach((grip) => {
      grip.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const row = grip.closest('.bar-row');
        e.preventDefault();
        try { grip.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        row.classList.add('lifting');
        const before = [...list.children].map((x) => x.dataset.id).join();
        const move = (ev) => {
          const others = [...list.children].filter((x) => x !== row);
          const next = others.find((x) => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
          if (next) { if (row.nextSibling !== next) list.insertBefore(row, next); } else if (list.lastChild !== row) list.appendChild(row);
        };
        const up = () => {
          grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
          row.classList.remove('lifting');
          const after = [...list.children].map((x) => x.dataset.id);
          if (after.join() !== before) onMove(after);
        };
        grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
      });
    });
  }
  /* the parts of the tray this board has: dinners and time together only when the board helps with them */
  const tabsOn = () => ['todo', 'dinners', 'kim', 'blocks'].filter((id) => (id !== 'dinners' || useDinners()) && (id !== 'kim' || useTogether()));
  let lastBodyKey = '';
  function renderRack() {
    const top = $('rack-top'), body = $('rack-body');
    const key = (view.reset ? 'r' + view.reset.step : view.tab) + ':' + (view.level || '');
    const scroll = key === lastBodyKey ? body.scrollLeft : 0;
    lastBodyKey = key;
    top.replaceChildren(); body.replaceChildren();
    $('rack').classList.toggle('collapsed', trayCollapsed() && !view.reset);
    $('rack').classList.toggle('resetting', !!view.reset);
    if (view.reset) { resetTop(top); resetBody(body); }
    else {
      const tabs = el('div', 'rack-tabs');
      const soon = M.dueSoon(state, today, 7, nowMin).length;
      const dock = inToday();
      if (((view.zoom === 'day' || dock) && view.tab === 'blocks') || !tabsOn().includes(view.tab)) view.tab = 'todo';
      const asking = dock && view.moment && view.moment.kind === 'dinner';
      /* Block library sits on the desk in the day view and in Today, so that shortcut rests there */
      const items = barItems().filter((it) => !(it.tab === 'blocks' && (view.zoom === 'day' || dock)) && !(dock && it.planner));
      const open = !trayCollapsed();
      /* the most exact shortcut for what's open wears the mark: Due soon over To do */
      const exact = open && items.some((it) => it.level && view.tab === it.tab && view.level === it.level);
      const counted = items.some((it) => it.id === 'todo') ? 'todo' : 'soon';
      items.forEach((it) => {
        const on = it.run ? !!(it.pressed && it.pressed()) : it.open ? false : open && view.tab === it.tab && (it.level ? view.level === it.level : !exact);
        const b = el('button');
        b.type = 'button';
        if (!it.open) b.setAttribute('aria-pressed', String(on));
        b.appendChild(icon(it.icon, 9, on ? UI.dark : UI.soft));
        b.appendChild(el('span', 'bar-name', it.name));
        b.title = it.says;
        if (it.id === counted && soon) { const c = el('span', 'count', String(soon)); c.title = plural(soon, 'thing', 'things') + ' due this week'; c.setAttribute('aria-label', c.title); b.appendChild(c); }
        /* the board and the band ask about dinner, and so does the dock */
        if (it.id === 'dinners' && asking) { const d = el('span', 'dot'); d.title = 'Dinner isn’t picked'; d.setAttribute('aria-label', d.title); b.appendChild(d); }
        b.addEventListener('click', () => barGo(it, on));
        tabs.appendChild(b);
      });
      top.appendChild(tabs);
      /* the bar can be laid out: what's on it, and in what order */
      if (!dock) {
        const ar = el('button', 'bar-edit');
        ar.type = 'button'; ar.title = 'Arrange the bar'; ar.setAttribute('aria-label', 'Arrange the bar');
        ar.appendChild(icon('sliders', 8, UI.soft));
        ar.addEventListener('click', () => { Snd.init(); openDrawer('bar'); });
        top.appendChild(ar);
      }
      if (view.level && !trayCollapsed()) {
        const cr = el('div', 'crumb');
        const back = button('', 'nav', () => { view.level = null; if (view.bench) closeBench(); else renderRack(); });
        back.setAttribute('aria-label', 'Back');
        back.appendChild(icon('left', 8, UI.white));
        cr.appendChild(back);
        cr.appendChild(el('span', '', tabName(view.tab)));
        cr.appendChild(document.createTextNode(levelName()));
        top.appendChild(cr);
      }
      /* the pieces go on the desk only when asked, and come back the same way */
      if (!trayCollapsed() && benchFor() && !view.bench && (view.level || view.tab !== 'todo')) {
        const lay = button('Lay them out on the desk', 'small quiet lay', layOut);
        lay.prepend(icon('box', 8, UI.soft));
        top.appendChild(lay);
      }
      /* zoom and where Block library sits live in the bar, next to the tabs */
      if (!dock) top.appendChild(viewctl);
      const right = el('div', 'rack-right');
      /* only where the bench shows: the month and the year have none to close */
      if (view.bench && benchable()) right.appendChild(button(view.zoom === 'day' && !dock ? 'Back to Block library' : 'Close the bench', 'small', closeBench));
      if (!dock && movesShown()) right.appendChild(movesButton());
      if (!dock) { const rb = resetButton(); rb.dataset.reset = '1'; right.appendChild(rb); }
      const hide = button('', 'small quiet tray-toggle', () => { setTrayCollapsed(!trayCollapsed()); if (dock) render(); else { renderRack(); layoutInsets(); } });
      hide.appendChild(icon(trayCollapsed() ? 'up' : 'down', 9, UI.soft));
      hide.appendChild(el('span', 'lbl-t', trayCollapsed() ? 'Show tray' : 'Hide tray'));
      hide.title = trayCollapsed() ? 'Show tray' : 'Hide tray';
      hide.setAttribute('aria-label', hide.title);
      hide.setAttribute('aria-expanded', String(!trayCollapsed()));
      right.appendChild(hide);
      top.appendChild(right);
      if (!trayCollapsed()) {
        if (view.tab === 'todo') todoBody(body);
        else if (view.tab === 'dinners') dinnersBody(body, weekOf());
        else if (view.tab === 'kim') kimBody(body);
        else blocksBody(body);
      }
    }
    body.scrollLeft = scroll;
    rackEdges();
    fitBar();
  }
  /* Step the tray bar down a notch at a time until its contents fit inside it, padding and all. */
  function fitBar() {
    const rack = $('rack'), top = $('rack-top');
    if (inToday() && trayCollapsed()) { rack.classList.remove('fit1', 'fit2', 'fit3', 'fit4', 'fit5', 'fit6'); return; }
    const steps = ['fit1', 'fit2', 'fit3', 'fit4', 'fit5', 'fit6'];
    rack.classList.remove(...steps);
    for (const c of steps) {
      if (top.scrollWidth <= top.clientWidth + 1) return;
      rack.classList.add(c);
    }
  }
  /* The tray runs sideways. Where it runs past an edge there's a fade and an arrow to press, and a
     plain mouse wheel moves it, so nothing sits out of reach of a mouse. */
  function rackEdges() {
    const b = $('rack-body'), max = b.scrollWidth - b.clientWidth;
    const more = { r: max > 4 && b.scrollLeft < max - 4, l: b.scrollLeft > 4 };
    b.classList.toggle('more-r', more.r);
    b.classList.toggle('more-l', more.l);
    ['l', 'r'].forEach((sd) => {
      let a = $('rack-more-' + sd);
      if (!a) {
        a = el('button', 'rack-more ' + sd);
        a.id = 'rack-more-' + sd; a.type = 'button';
        a.setAttribute('aria-label', sd === 'l' ? 'Earlier in the tray' : 'More in the tray');
        a.appendChild(icon(sd === 'l' ? 'left' : 'right', 9, UI.white));
        a.addEventListener('click', () => { Snd.init(); b.scrollBy({ left: (sd === 'l' ? -1 : 1) * Math.max(240, b.clientWidth * 0.7), behavior: reducedMotion() || view.calm ? 'auto' : 'smooth' }); });
        $('rack').appendChild(a);
      }
      a.hidden = !more[sd] || $('rack').classList.contains('collapsed');
    });
  }
  function levelName() {
    if (view.tab === 'todo') return view.level === 'soon' ? 'Due soon' : groupName(view.level);
    if (view.tab === 'dinners') return view.level === 'recipes' ? 'Recipes' : (D.PANTRY_KINDS.find((k) => k.id === view.level) || {}).name || '';
    if (view.tab === 'kim') return (D.IDEA_KINDS.find((k) => k.id === view.level) || {}).name || '';
    return '';
  }

  /* == the Sunday Reset == */
  /* Sunday plans the week from tomorrow on (the week starting today, or on Monday); Monday and Tuesday
     set up the week they're in; later in the week, the reset is for the next one */
  function resetWeek() {
    const wd = M.weekday(today);
    return wd === 0 ? M.weekStart(M.addDays(today, 1)) : wd <= 2 ? M.weekStart(today) : M.addDays(M.weekStart(today), 7);
  }
  /* Wednesday and Thursday, with this week's reset not done: a short catch up for the rest of the week
     is offered instead of starting on next week */
  /* a week set up from the setup counts as planned: nobody is told to catch up on the day they started */
  const catchUpDue = () => { const wd = M.weekday(today), w = state.weeks[M.weekStart(today)]; return (wd === 3 || wd === 4) && !(w && w.reset && (w.reset.done || w.reset.caught || w.reset.setup)); };
  function resetRec(ws) {
    state.weeks[ws] = state.weeks[ws] || {};
    state.weeks[ws].reset = state.weeks[ws].reset || { step: 0, done: false };
    return state.weeks[ws].reset;
  }
  /* The Sunday Reset is the gold button on Sunday, and on Monday or Tuesday if the week's isn't
     done yet. The rest of the week it's a quiet button, there when you want it. */
  const resetDue = () => { const w = state.weeks[resetWeek()]; return M.weekday(today) <= 2 && !(w && w.reset && (w.reset.done || w.reset.setup)); };
  function resetButton() {
    if (catchUpDue()) {
      const b = button('', 'small quiet', () => startReset(M.weekStart(today), true));
      b.append(el('span', 'lbl-v', 'Catch up '), 'this week');
      b.title = 'A short reset for the rest of this week: to dos and dinners';
      return b;
    }
    const ws = resetWeek();
    const w = state.weeks[ws] && state.weeks[ws].reset;
    if (w && w.done) return button('Reset done · open again', 'small quiet', () => startReset(ws));
    const due = resetDue(), sunday = M.weekday(today) === 0;
    const b = el('button', due ? 'go gold' : 'small quiet');
    if (due) b.appendChild(icon('calendar', 9, UI.gold));
    const words = el('span');
    /* Sunday starts it; on Monday or Tuesday it's setting up the week you're already in */
    if (w && w.step) words.append(el('span', 'lbl-v', 'Continue '), 'Sunday Reset');
    else if (due && !sunday) words.append('Set up this week');
    else words.append(el('span', 'lbl-v', due ? 'Start ' : ''), 'Sunday Reset');
    b.appendChild(words);
    b.type = 'button';
    b.addEventListener('click', () => { Snd.init(); startReset(ws); });
    return b;
  }
  function startReset(ws, catchup) {
    if (!view.reset) view.before = { zoom: view.zoom, focus: view.focus, tab: view.tab, mode: view.mode };
    if (view.mode === 'today') { view.mode = 'planner'; view.dockOpen = false; saveMode(); closeQuick(); }
    const rec = resetRec(ws);
    view.reset = { week: ws, step: 0, catchup: !!catchup };
    const n = stepsNow().length;
    view.reset.step = catchup || rec.done ? 0 : Math.min(rec.step || 0, n - 1);
    /* picking up where it stopped says so, once */
    view.reset.resumed = !catchup && !rec.done && (rec.step || 0) > 0 ? stepsNow()[view.reset.step].key : null;
    view.bench = null;
    persist();
    goStep(view.reset.step);
  }
  function goStep(i) {
    const r = view.reset, steps = stepsNow();
    r.step = Math.max(0, Math.min(steps.length - 1, i));
    const st = steps[r.step];
    const rec = resetRec(r.week);
    if (!r.catchup) rec.step = Math.max(rec.step || 0, r.step);
    persist();
    view.level = null;
    view.sel = null;
    /* each step brings its own workspace: nothing left on the desk from the step before */
    view.bench = null;
    if (r.resumed && r.resumed !== st.key) r.resumed = null;
    view.focus = r.catchup ? today : r.week;
    if (st.zoom !== view.zoom) Snd.zoom(ZOOMS.indexOf(st.zoom) > ZOOMS.indexOf(view.zoom));
    else Snd.slide();
    view.zoom = st.zoom;
    if (st.tab) view.tab = st.tab;
    render();
  }
  function leaveReset() {
    view.reset = null;
    const b = view.before;
    view.before = null;
    if (b && b.mode === 'today') { view.mode = 'today'; saveMode(); enterToday(); Snd.slide(); render(); return; }
    if (b) { view.focus = b.focus; view.tab = b.tab; if (b.zoom !== view.zoom) { setZoom(b.zoom); return; } }
    Snd.slide();
    render();
  }
  function finishReset() {
    const r = view.reset, rec = resetRec(r.week), first = firstReset(r.week);
    if (r.catchup) rec.caught = true;
    else { rec.done = true; rec.step = stepsNow().length - 1; }
    persist();
    const b = view.before;
    view.reset = null; view.before = null;
    if (b && b.mode === 'today') { view.mode = 'today'; saveMode(); enterToday(); }
    if (!FEEL || view.calm) Snd.chime();
    /* the last word is as honest as the recap was: set, or done with what's still open named */
    const open = stillOpen(weekCounts(r.week));
    if (open.length) toast((r.catchup ? 'Caught up. ' : 'Reset done. ') + 'Still open: ' + open.map((o) => o.short).join(', ') + '.', '');
    else toast(r.catchup ? 'The rest of your week is set' : 'Your week is set', 'good');
    render();
    /* feel: the week clicks into place, a day at a time, and the chime comes as the last day settles */
    if (FEEL && !view.calm) { if (W.weekSet()) setTimeout(() => Snd.chime(), 420); else Snd.chime(); }
    noteMove('reset');
    /* the first reset gets one question, once, when there's someone to hear the answer */
    if (!r.catchup && first && (sharedBy || Cloud.cfg) && !view.preview) setTimeout(() => { if (!view.sel && !view.reset) { view.got.fb = null; openSel({ type: 'feedback', ask: 'reset' }); } }, 1800);
  }
  function firstReset(ws) {
    return !Object.keys(state.weeks).some((k) => k < ws && state.weeks[k].reset && state.weeks[k].reset.done);
  }
  function resetTop(top) {
    const r = view.reset, steps = stepsNow(), st = steps[r.step];
    const head = el('div', 'reset-head');
    const k = el('div');
    /* a catch up names the days it covers, Thursday to Saturday, not a span of dates to work out */
    const left = M.addDays(r.week, 6), catchSpan = today >= left ? M.DAY_LONG[M.weekday(left)] : M.DAY_LONG[M.weekday(today)] + ' to ' + M.DAY_LONG[M.weekday(left)];
    /* a version can count the steps without the recap (window.SR_recapApart): 3 of 6, then Your week */
    const apart = !!window.SR_recapApart, counted = apart ? steps.length - 1 : steps.length;
    const where = apart && st.key === 'done' ? 'All ' + counted + ' done' : (r.step + 1) + ' of ' + counted;
    k.appendChild(el('div', 'reset-kicker', (r.catchup ? 'Catch up' : 'Sunday Reset') + ' · ' + where + ' · ' + (r.catchup ? catchSpan : M.spanText(r.week, left))));
    k.appendChild(el('div', 'reset-title', st.key === 'done' ? recapTitle() : stepTitle(st)));
    head.appendChild(k);
    k.className = 'reset-words';
    const lineText = r.resumed === st.key ? 'Picking up where you left off. ' + named(st.line)
      : r.catchup && st.key === 'todo' ? 'What’s left this week. Drag a to do onto a day or tap it to give it a time, or let it wait.'
      : st.key === 'back' && firstReset(r.week) ? 'Your first reset. Start with one thing to keep and one to change.'
      : st.key === 'ahead' && r.step === 0 && nothingBehind(r.week) ? 'Your first reset. There’s no week behind you yet, so start with the next five weeks. Anything coming that needs a block now?'
      : st.key === 'kim' ? 'Pick one thing to do with ' + (partner() || 'someone') + ' this week.'
      : named(st.line);
    /* the instruction sits under the title, whole, never cut off */
    k.appendChild(el('div', 'reset-line', lineText));
    /* on the first step, how long it is and a way to make it shorter */
    if (r.step === 0 && !r.catchup && r.resumed !== st.key) {
      const how = el('div', 'reset-line reset-how');
      how.append(document.createTextNode(steps.length + ' steps, about ' + Math.max(10, Math.round((steps.length * 2.5) / 5) * 5) + ' minutes. '));
      how.appendChild(button('Leave some out', 'link', () => openDrawer('reset')));
      k.appendChild(how);
    }
    top.appendChild(head);
    const dots = el('div', 'dots');
    const seen = r.catchup ? r.step : resetRec(r.week).step || 0;
    steps.forEach((stp, i) => {
      /* a step not reached yet still names its own class: an empty one falls back to .small, a taller pill */
      const b = button(String(i + 1), i === r.step ? 'on' : i <= seen ? 'done' : 'later', () => goStep(i));
      b.title = stepTitle(stp);
      b.setAttribute('aria-label', 'Step ' + (i + 1) + ', ' + stepTitle(stp));
      if (i === r.step) b.setAttribute('aria-current', 'step');
      dots.appendChild(b);
    });
    const right = el('div', 'rack-right');
    right.appendChild(dots);
    right.appendChild(button('Finish later', 'small quiet', leaveReset));
    if (r.step > 0) { const bk = button('Back', 'small', () => goStep(r.step - 1)); bk.title = 'Back to ' + stepTitle(steps[r.step - 1]); bk.setAttribute('aria-label', bk.title); right.appendChild(bk); }
    const last = r.step === steps.length - 1;
    /* Next says where it goes, so you always know what's left */
    const after = steps[r.step + 1];
    const next = el('button', 'go', last ? 'Finish' : r.step + 2 === steps.length ? 'See your week' : 'Next: ' + stepTitle(after));
    next.type = 'button';
    next.addEventListener('click', () => { Snd.init(); if (last) finishReset(); else goStep(r.step + 1); });
    right.appendChild(next);
    top.appendChild(right);
  }
  /* the recap's heading says what's true: set, or here it is with a few things still open */
  function recapTitle() {
    const r = view.reset;
    return stillOpen(weekCounts(r.week)).length ? 'Here’s your week' : r.catchup ? 'The rest of your week is set' : 'Your week is set';
  }
  /* What a week still has open, in words, each with the step that answers it. The recap's heading,
     its buttons, and the last word after Finish all read this one list, so none of them can say the
     week is set while another says it isn't. */
  function stillOpen(c) {
    const out = [];
    const n = c.lateTimes.length;
    if (useDinners() && c.openNights.length) out.push({ text: plural(c.openNights.length, 'night', 'nights') + ' without a dinner decided', short: plural(c.openNights.length, 'dinner', 'dinners') + ' to decide', step: 'dinners' });
    if (c.unplaced.length) out.push({ text: plural(c.unplaced.length, 'to do', 'to dos') + ' due this week without a time', short: plural(c.unplaced.length, 'to do', 'to dos') + ' without a time', step: 'todo' });
    if (n) out.push({ text: n === 1 ? '1 to do with a time after it’s due' : n + ' to dos with times after they’re due', short: n + ' timed after ' + (n === 1 ? 'it’s' : 'they’re') + ' due', step: 'todo' });
    return out;
  }
  function stat(big, label, small) {
    const s = el('div', 'stat');
    s.appendChild(el('b', '', big));
    s.appendChild(el('span', '', label));
    if (small) s.appendChild(el('small', '', small));
    return s;
  }
  /* What a week holds, counted the way the tray and the board count: a to do is one to do however many
     of its steps have a time, and a dinner is decided once you know how it's happening, leftovers and
     skipping included. */
  function weekCounts(ws) {
    const dates = M.range(ws, 7), days = dates.map(day);
    const t = M.totals(days);
    /* blocks of your own time: real blocks of the kind Yours, whatever they are, never open time */
    let own = 0, kim = [];
    days.forEach((d, i) => d.blocks.forEach((b) => {
      if (b.cat === 'yours' && !b.soft && !b.sleep && !b.free) own++;
      if (b.src && b.src.type === 'idea') kim.push(b.name + ' on ' + M.DAY_LONG[M.weekday(dates[i])]);
    }));
    const dinnerDays = dates.filter((d) => day(d).blocks.some((b) => b.dinner));
    const decided = dinnerDays.filter((d) => state.dinners[d] && (state.dinners[d].name || state.dinners[d].cook));
    const open = dinnerDays.filter((d) => !decided.includes(d) && d >= today);
    const mine = decided.filter((d) => state.dinners[d].cook === 'me').length;
    const pl = M.placements(state);
    let todos = 0;
    pl.forEach((list, id) => { if (list.some((p) => p.date >= ws && p.date <= dates[6])) todos++; });
    const due = M.dueSoon(state, today, M.diffDays(today, dates[6]), nowMin);
    const unplaced = due.filter((x) => x.status !== 'planned'), lateTimes = due.filter((x) => x.status === 'planned' && x.plan.after);
    return { yours: t.yours || 0, own, kim, dinners: dinnerDays.length, planned: decided.length, openNights: open, mine, todos, unplaced, lateTimes };
  }
  function resetBody(body) {
    const r = view.reset, st = stepsNow()[r.step], ws = r.week, rec = resetRec(ws);
    if (st.key === 'back') {
      const lw = M.addDays(ws, -7), lrec = state.weeks[lw] && state.weeks[lw].reset;
      const pl = M.placements(state);
      let done = 0;
      const open = [];
      state.tasks.forEach((t) => {
        const where = (pl.get(t.id) || []).filter((p) => p.date >= lw && p.date < ws);
        if (!where.length) return;
        if (t.done) done++; else open.push(t);
      });
      const c = weekCounts(lw);
      if (!lrec && !done && !open.length) body.appendChild(el('div', 'rack-note', 'Nothing to look back on yet. Next Sunday, this shows what got done and what’s still open.'));
      else {
        body.appendChild(stat(String(done), 'to dos done'));
        body.appendChild(stat(String(open.length), 'still open', open.length ? open.slice(0, 2).map((t) => t.name).join(', ') : ''));
        body.appendChild(stat(c.planned + ' of ' + c.dinners, 'dinners planned'));
        if (!kindYours()) body.appendChild(stat(String(c.own), c.own === 1 ? 'block of your own' : 'blocks of your own'));
        else if (c.yours > 0) body.appendChild(stat(M.hours(c.yours), 'to yourself last week', plural(c.own, 'block of your own', 'blocks of your own')));
        if (lrec && (lrec.keep || lrec.change)) body.appendChild(el('div', 'rack-note', 'Last week you wanted to keep: ' + (lrec.keep || '…') + '. And change: ' + (lrec.change || '…') + '.'));
      }
      const notes = el('div', 'notes');
      const mk = (label, key, ph) => {
        const l = el('label', '', label);
        const inp = el('input', 'input');
        inp.id = 'reset-' + key; l.htmlFor = inp.id;
        inp.setAttribute('aria-describedby', 'reset-notes-hint');
        inp.type = 'text'; inp.placeholder = ph; inp.value = rec[key] || ''; inp.maxLength = 120;
        inp.addEventListener('change', () => { rec[key] = inp.value.trim(); persist(); });
        notes.append(l, inp);
      };
      mk('Keep', 'keep', 'A walk before work');
      mk('Change', 'change', 'Plan dinners before 5 pm');
      const hint = el('span', 'sr-only', 'One thing from last week, in your own words. Next Sunday shows it back to you.');
      hint.id = 'reset-notes-hint';
      notes.appendChild(hint);
      body.appendChild(notes);
      return;
    }
    if (st.key === 'ahead') {
      const list = M.upcoming(state, ws, 35).filter((x) => x.kind !== 'due');
      const box = el('div', 'ahead');
      if (!list.length) box.appendChild(el('div', 'rack-note', 'A quiet five weeks.'));
      list.slice(0, 14).forEach((x) => {
        const row = el('div', 'ahead-row');
        row.appendChild(icon(x.icon || 'star', 10, x.kind === 'trip' ? '#9FB7E8' : x.kind === 'due' ? '#FF9E8C' : UI.gold));
        row.appendChild(el('span', 'when', x.kind === 'trip' ? M.spanText(x.start0, x.end) : x.kind === 'due' ? 'Due ' + M.dateText(x.due) : M.dateText(x.date, 'day')));
        row.appendChild(el('span', 'what', x.name + (x.kind === 'due' && x.after ? ' (has a time, after it’s due)' : x.kind === 'due' && x.status === 'planned' ? ' (has a time)' : '')));
        box.appendChild(row);
      });
      body.appendChild(box);
      const clash = M.clashesIn(state, ws, 35);
      if (clash.length) {
        const cb = el('div', 'ahead');
        clash.slice(0, 4).forEach((c) => { const row = el('div', 'ahead-row'); row.append(icon('overlap', 10, UI.gold), el('span', 'when', M.dateText(c.date, 'day')), el('span', 'what', c.a.name + ' and ' + c.b.name + ' overlap at ' + M.clock(c.start))); cb.appendChild(row); });
        if (clash.length > 4) cb.appendChild(button('See all ' + clash.length, 'small quiet', () => openSel({ type: 'clashes' })));
        body.appendChild(cb);
      }
      const pl = M.placements(state);
      const soon = M.dueSoon(state, today, 35, nowMin).slice(0, 10);
      if (soon.length) { const row = rackSection(body, 'Due soon'); soon.forEach((x) => row.appendChild(taskTile(x.task, pl, true))); }
      body.appendChild(addTile('Add a date', () => openSel({ type: 'newEvent', date: ws })));
      return;
    }
    if (st.key === 'shape') {
      const ch = el('div', 'choices');
      /* the kinds of week this board has, and the one this week is: picked by hand, or its turn when
         weeks alternate. The same list and the same answer as Settings and the day's panel. */
      const cur = M.shapeOf(state, ws), kinds = shapeChoices();
      const alt = state.rhythm.alternate, byTurn = alt && !(state.weeks[ws] && state.weeks[ws].shape);
      (kinds.length > 1 ? kinds : []).forEach((s) => {
        const b = el('button', 'choice', s.name);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(cur === s.id));
        b.addEventListener('click', () => { Snd.init(); commit(() => { state.weeks[ws] = state.weeks[ws] || {}; state.weeks[ws].shape = s.id; }); Snd.clack(1); });
        ch.appendChild(b);
      });
      body.appendChild(ch);
      if (byTurn && kinds.length > 1) body.appendChild(el('div', 'rack-note', 'Your weeks alternate, so this one is ' + (kinds.find((k) => k.id === cur) || kinds[0]).name + ' unless you pick another.'));
      const m = state.meetings;
      body.appendChild(stat(String(m.length), m.length === 1 ? 'weekly meeting' : 'weekly meetings', m.length ? m.slice(0, 2).map((x) => x.name).join(', ') : 'Type them in once and they show up every week'));
      body.appendChild(tile({ name: m.length ? 'Weekly meetings' : 'Add weekly meetings', meta: m.length ? 'Change or add' : 'Standups, critiques, one on ones', icon: 'people', cat: 'work', onClick: () => openSel({ type: 'meetings' }) }));
      const trip = M.range(ws, 7).map((d) => day(d).trip).find(Boolean);
      if (trip) body.appendChild(el('div', 'rack-note', trip.name + ' is this week. Those days are set for travel.'));
      return;
    }
    if (st.key === 'yours') {
      const c = weekCounts(ws);
      const sug = ownSpot(ws);
      if (!kindYours()) body.appendChild(stat(M.hours(c.yours), 'yours this week', plural(c.own, 'block of your own', 'blocks of your own') + ' so far'));
      else if (c.yours > 0) body.appendChild(stat(M.hours(c.yours), 'to yourself this week', 'so far, in ' + plural(c.own, 'block of your own', 'blocks of your own')));
      else body.appendChild(el('div', 'rack-note', sug ? 'Want some time to yourself this week? There’s room for this:' : 'Want some time to yourself this week? Drag one of your blocks onto a day.'));
      if (sug) {
        const p = sug.block;
        const b = tile({ name: p.name + ' ' + M.DAY_LONG[M.weekday(sug.date)] + ' at ' + M.clock(sug.start), meta: 'There’s room. Tap to add it.', icon: p.icon, cat: p.cat, cls: 'glow', onClick: () => {
          const r = commit(() => M.placeAdd(state, sug.date, { name: p.name, cat: p.cat, icon: p.icon, dur: p.dur, src: { type: 'block', id: p.id } }, sug.start));
          if (r && r.ok) { landed(sug.date, 'add:' + r.add.id, 0.75); toast(p.name + ' on ' + M.DAY_LONG[M.weekday(sug.date)] + ' at ' + M.clock(r.start), 'good', { label: 'Undo', fn: undo }); }
        } });
        body.appendChild(b);
      }
      body.appendChild(el('div', 'sep'));
      blocksBody(body, ['yours', 'work', 'open']);
      return;
    }
    if (st.key === 'todo') {
      const pl = M.placements(state);
      const soon = M.dueSoon(state, today, 21, nowMin);
      const late = soon.filter((x) => x.status === 'planned').length;
      body.appendChild(stat(String(soon.length - late), 'without a time yet', 'due in the next 3 weeks'));
      if (late) body.appendChild(stat(String(late), late === 1 ? 'has a time after it’s due' : 'have times after they’re due', 'Move it earlier, or change when it’s due'));
      /* room against what needs a time, as numbers, never as a verdict */
      const from = r.catchup ? today : ws, cap7 = M.capacity(state, from, M.diffDays(from, M.addDays(ws, 6)) + 1, today, nowMin);
      if (cap7.need) body.appendChild(stat(M.hours(cap7.room), 'open this week', M.hours(cap7.need) + ' of to dos still need a time' + (cap7.need > cap7.room ? '. More than there’s room for, so some can wait.' : '')));
      soon.forEach((x) => body.appendChild(taskTile(x.task, pl, true)));
      body.appendChild(addTile('New to do', () => openSel({ type: 'newTask', group: null })));
      return;
    }
    if (st.key === 'dinners') {
      /* a version can add to the dinner step (window.SR_dinnerExtras), like Repeat last week */
      if (window.SR_dinnerExtras) window.SR_dinnerExtras(body, M.range(ws, 7), ws);
      dinnersBody(body, M.range(ws, 7));
      return;
    }
    if (st.key === 'kim') {
      const c = weekCounts(ws);
      body.appendChild(stat(c.kim.length ? String(c.kim.length) : '0', c.kim.length === 1 ? 'thing with ' + (partner() || 'someone') : 'things with ' + (partner() || 'someone'), c.kim.join(', ') || 'Drop one on an evening'));
      D.IDEA_KINDS.forEach((k, i) => {
        const row = rackSection(body, k.name);
        state.ideas.filter((x) => x.kind === k.id).forEach((x) => row.appendChild(ideaTile(x)));
        if (i === D.IDEA_KINDS.length - 1) row.appendChild(addTile('New idea', () => openSel({ type: 'newIdea', kind: 'play' })));
      });
      return;
    }
    const c = weekCounts(ws);
    if (!kindYours() || c.yours > 0) body.appendChild(stat(M.hours(c.yours), yoursWord() + ' this week', plural(c.own, 'block of your own', 'blocks of your own')));
    if (useDinners()) body.appendChild(stat(c.planned + ' of ' + c.dinners, 'dinners decided', c.mine ? 'You cook ' + plural(c.mine, 'night', 'nights') : ''));
    body.appendChild(stat(String(c.todos), c.todos === 1 ? 'to do with a time' : 'to dos with a time'));
    if (useTogether()) body.appendChild(stat(String(c.kim.length), c.kim.length === 1 ? 'thing with ' + (partner() || 'someone') : 'things with ' + (partner() || 'someone'), c.kim.join(', ')));
    /* what's still open, each one a way back to it; finishing never waits on them */
    const steps = stepsNow(), stepOf = (key) => steps.findIndex((x) => x.key === key);
    const open = el('div', 'recap-open');
    stillOpen(c).forEach((o) => { if (stepOf(o.step) >= 0) open.appendChild(button(o.text, 'small', () => goStep(stepOf(o.step)))); });
    if (useTogether() && !c.kim.length && stepOf('kim') >= 0) open.appendChild(button('Nothing with ' + (partner() || 'someone') + ' yet', 'small', () => goStep(stepOf('kim'))));
    if (open.children.length) { const box = el('div', 'recap-box'); box.append(el('div', 'recap-h', 'Still open, if you want to'), open); body.appendChild(box); }
    if (useDinners()) body.appendChild(cta('Grocery list', grocerySub(M.range(ws, 7)), 'cart', () => openSel({ type: 'groceries' }), true));
    body.appendChild(button('Save the week as a picture', 'small', () => weekPicture(ws)));
  }
  /* The week as a picture to keep or send: seven rows of blocks in the desk's own colors, the
     names that fit, the hours that are yours, drawn flat at a phone's width. */
  async function weekPicture(ws) {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* fine */ }
    const dates = M.range(ws, 7), h = M.visibleHours(state), span = h.end - h.start;
    const W2 = 1080, pad = 56, rowH = 104, labelW = 96, top = 210, H2 = top + rowH * 7 + 150;
    const cv = document.createElement('canvas'); cv.width = W2; cv.height = H2;
    const g = cv.getContext('2d');
    g.fillStyle = '#25231F'; g.fillRect(0, 0, W2, H2);
    g.fillStyle = '#F2CF7A'; g.font = '800 28px "Atkinson Hyperlegible Next", sans-serif'; g.textBaseline = 'alphabetic';
    g.fillText('SUNDAY RESET', pad, 78);
    g.fillStyle = '#FFFFFF'; g.font = '800 54px Gabarito, sans-serif';
    g.fillText((who().name ? who().name + '’s week' : 'My week') + ', ' + M.spanText(dates[0], dates[6]), pad, 142, W2 - 2 * pad);
    const yours = M.totals(dates.map(day)).yours || 0;
    g.fillStyle = '#D8D1C4'; g.font = '700 28px "Atkinson Hyperlegible Next", sans-serif';
    if (!kindYours() || yours > 0) g.fillText(M.hours(yours) + (kindYours() ? ' of it to myself' : ' of it is mine'), pad, 186);
    const x0 = pad + labelW, wTrack = W2 - pad - x0;
    dates.forEach((d, i) => {
      const y = top + i * rowH;
      g.fillStyle = '#FFFFFF'; g.font = '800 30px Gabarito, sans-serif';
      g.fillText(M.DAY_SHORT[M.weekday(d)], pad, y + 52);
      g.fillStyle = '#3A362F'; g.fillRect(x0, y + 10, wTrack, rowH - 26);
      M.resolveWindow(state, d).blocks.forEach((b) => {
        const s0 = Math.max(h.start, b.start), e0 = Math.min(h.end, b.start + b.dur);
        if (e0 <= s0) return;
        const bx = x0 + ((s0 - h.start) / span) * wTrack, bw = Math.max(2, ((e0 - s0) / span) * wTrack - 3);
        const lk = W.look(b);
        g.fillStyle = b.free ? '#3A362F' : lk.base;
        g.fillRect(bx, y + 10, bw, rowH - 26);
        if (b.free) { g.strokeStyle = '#8C8272'; g.setLineDash([8, 6]); g.lineWidth = 2; g.strokeRect(bx + 2, y + 12, bw - 4, rowH - 30); g.setLineDash([]); }
        const name = b.label || b.name;
        g.font = '800 20px "Atkinson Hyperlegible Next", sans-serif';
        if (bw > 70 && !b.sleep) {
          g.fillStyle = b.free ? '#D8D1C4' : lk.ink;
          let t = name;
          while (t.length > 2 && g.measureText(t).width > bw - 16) t = t.slice(0, -2);
          if (t !== name) t = t.replace(/\s*\S?$/, '') + '…';
          g.fillText(t, bx + 8, y + 50);
        }
      });
    });
    const yk = top + rowH * 7 + 30;
    g.fillStyle = '#8C8272'; g.font = '700 22px "Atkinson Hyperlegible Next", sans-serif';
    [h.start, h.start + span / 2, h.end].forEach((m, k) => { const t = M.clock(Math.round(m / 60) * 60 % 1440); const tw = g.measureText(t).width; g.fillText(t, x0 + (k / 2) * wTrack - (k === 2 ? tw : k === 1 ? tw / 2 : 0), yk); });
    g.fillStyle = '#D8D1C4'; g.font = '700 22px "Atkinson Hyperlegible Next", sans-serif';
    g.fillText('Set on Sunday with Sunday Reset', pad, H2 - 40);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    if (!blob) { toast('Couldn’t draw the picture here', 'bad'); return; }
    const name = 'my-week-' + ws + '.png';
    /* a phone shares it straight to Photos or a message; anywhere else it downloads */
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'My week' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (window.claude) { toast('Pictures can’t be saved in this view', 'bad'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Saved the week as a picture', 'good');
  }
  /* One of your own blocks and a weekday with room for it: the one you placed most lately, or the
     first of your own in the rack, on the first day that has an open stretch long enough and none of
     it yet. Open time of your own first, then any gap after 9. */
  function ownSpot(ws) {
    const mine = library().filter((x) => x.cat === 'yours' && x.id !== 'opentime');
    const recent = recentBlocks();
    const pick = mine.slice().sort((a, b) => ((recent.indexOf(a.id) + 1) || 99) - ((recent.indexOf(b.id) + 1) || 99))[0];
    if (!pick) return null;
    const dur = M.gridDur(pick.dur);
    for (let i = 1; i < 6; i++) {
      const date = M.addDays(ws, i);
      if (date < today) continue;
      const d = day(date);
      if (d.trip || d.blocks.some((b) => b.src && b.src.type === 'block' && b.src.id === pick.id)) continue;
      const soft = d.blocks.find((b) => b.soft && !b.free && (b.cat === 'yours' || b.cat === 'open') && b.dur >= dur && (date > today || b.start > nowMin));
      if (soft) return { date, start: soft.start, block: pick };
      const gap = M.gaps(d).find((g) => g[1] - Math.max(g[0], 9 * 60) >= dur && (date > today || Math.max(g[0], 9 * 60) > nowMin));
      if (gap) return { date, start: Math.max(gap[0], 9 * 60), block: pick };
    }
    return null;
  }

  /* == dragging tiles out of the tray == */
  function dragSource(elm, spec, onClick) {
    elm.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      Snd.init();
      tdrag = { spec, el: elm, x: e.clientX, y: e.clientY, started: false, onClick, target: null };
      if (FEEL) { const r = elm.getBoundingClientRect(); tdrag.gx = e.clientX - r.left; tdrag.gy = e.clientY - r.top; }
      e.preventDefault();
    });
  }
  let tdrag = null;
  function specAdd(spec) {
    if (spec.kind === 'block') { const p = state.palette.find((x) => x.id === spec.id); return p && { name: p.name, cat: p.cat, icon: p.icon, dur: p.dur, src: { type: 'block', id: p.id } }; }
    if (spec.kind === 'task') { const t = taskById(spec.id); return t && { name: t.name, cat: t.cat || 'yours', icon: t.icon || 'check', dur: M.taskDur(t), src: { type: 'task', id: t.id } }; }
    if (spec.kind === 'step') { const t = taskById(spec.task), s = t && t.steps.find((x) => x.id === spec.id); return s && { name: s.name, cat: t.cat || 'yours', icon: t.icon || 'check', dur: s.dur || 15, src: { type: 'step', task: t.id, id: s.id } }; }
    if (spec.kind === 'idea') { const i = state.ideas.find((x) => x.id === spec.id); return i && { name: i.name, cat: 'us', icon: i.icon, dur: i.dur, src: { type: 'idea', id: i.id } }; }
    if (spec.kind === 'quick') return Object.assign({}, spec.add);
    return null;
  }
  const isFood = (spec) => spec.kind === 'recipe' || spec.kind === 'pantry' || spec.kind === 'dish';
  function placedText(date, start) { const at = M.dateTime(date, start); return M.dateText(at.date, 'day') + ' at ' + M.clock(at.start); }
  /* What a tray tile or bench piece looks like when it's picked up, including food. */
  function specLook(spec) {
    const a = specAdd(spec);
    if (a) return a;
    if (spec.kind === 'recipe') { const r = state.recipes.find((x) => x.id === spec.id); return r && { name: r.name, cat: 'meals', icon: 'pot', dur: 60 }; }
    if (spec.kind === 'pantry') { const p = state.pantry.find((x) => x.id === spec.id); return p && { name: p.name, cat: 'open', icon: (D.PANTRY_KINDS.find((k) => k.id === p.kind) || {}).icon || 'pot', dur: 45 }; }
    if (spec.kind === 'dish') { const h = D.DINNER_HOW.find((x) => x.id === spec.how) || D.DINNER_HOW[0]; return { name: h.name, cat: 'meals', icon: h.icon, dur: 60 }; }
    return null;
  }
  /* Which board is under the pointer: the week, the day board, or the mini week beside it. */
  function targetAt(x, y, lift) {
    if (W.layout !== 'week') return null;
    const loose = (p) => (p ? { kind: 'none', wx: p.wx, wy: p.wy, wz: p.wz } : null);
    if (view.zoom === 'day') {
      const d = W.dayAt(x, y, lift);
      if (d && d.lane != null) return { kind: 'day', date: view.focus, min: d.min, wx: d.wx, wy: d.wy, wz: d.wz };
      const m = W.boardAt(x, y, lift);
      if (m && m.row != null) return { kind: 'mini', date: weekOf()[m.row], row: m.row, min: m.min, wx: m.wx, wy: m.wy, wz: m.wz };
      return loose(d) || loose(m);
    }
    const m = W.boardAt(x, y, lift);
    if (m && m.row != null) return { kind: 'week', date: weekOf()[m.row], row: m.row, min: m.min, wx: m.wx, wy: m.wy, wz: m.wz };
    return loose(m);
  }
  /* Show where a block would land, and float the picked up block over that spot. */
  let aimKey = '', leaning = false;
  /* mid (feel): the minute the middle of the block is over, before it snaps, so the block can ride between
     your hand and its slot */
  function aim(t, start, dur, ok, tilt, mid) {
    const key = t.kind + t.date + ':' + start + ':' + dur;
    if (key !== aimKey) { if (aimKey) Snd.detent(ok); aimKey = key; }
    if (!leaning) { leaning = true; W.lean(t.kind === 'day' ? W.slotWorld('day', null, start + dur / 2) : W.slotWorld('week', t.row, start + dur / 2), 1); }
    /* where the block's middle is under the hand: the pointer, moved by where on the block you hold it */
    const hand = (where, row, p, dz) => {
      if (!FEEL || t.wx == null) return undefined;
      const hour = where === 'day' ? W.slotWorld('day', null, 420).x - W.slotWorld('day', null, 360).x : W.slotWorld('week', row, 360).x - W.slotWorld('week', row, 300).x;
      return { hand: { x: t.wx + (mid == null || t.min == null ? 0 : (mid - t.min) / 60 * hour), z: t.wz + dz }, surface: p.y };
    };
    if (t.kind === 'day') {
      W.showGhost(null); W.showDayGhost(start, dur, ok);
      const p = W.slotWorld('day', null, start + Math.min(dur, 60) / 2);
      W.dragTo(p.x, p.y + 1.2, p.z + 0.3, tilt, hand('day', null, p, 0.3));
    } else {
      W.showDayGhost(null); W.showGhost(t.row, start, dur, ok);
      const p = W.slotWorld('week', t.row, start + dur / 2);
      W.dragTo(p.x, p.y + (t.kind === 'mini' ? 0.7 : 1.1), p.z + 0.2, tilt, hand('week', t.row, p, 0.2));
    }
  }
  function unaim() { W.showGhost(null); W.showDayGhost(null); aimKey = ''; }
  function settle() { leaning = false; aimKey = ''; W.lean(null); }
  function moveTile(e) {
    const d = tdrag;
    if (!d.spec) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
      d.started = true;
      if (FEEL) W.press(null);
      Snd.pick();
      if (d.el) { const g = $('dragtile'); g.replaceChildren(d.el.cloneNode(true)); g.hidden = false; d.el.style.opacity = '0.35'; if (FEEL) carryStart(g, d); }
      if (d.obj3) d.obj3.visible = false;
      hideChip();
    }
    const ghost = $('dragtile');
    if (FEEL && d.el) carryMove(e.clientX - d.gx, e.clientY - d.gy);
    else { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
    d.target = null;
    document.querySelectorAll('.slot.over').forEach((x) => x.classList.remove('over'));
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const slot = under && under.closest && under.closest('.slot[data-dinner]');
    if (slot && isFood(d.spec) && !slot.classList.contains('away')) { slot.classList.add('over'); d.target = { type: 'dinner', date: slot.dataset.dinner }; offBoard(); return; }
    document.querySelectorAll('.daypill.over').forEach((x) => x.classList.remove('over'));
    const pill = under && under.closest && under.closest('.daypill');
    if (pill && !isFood(d.spec)) { pill.classList.add('over'); d.target = { type: 'day', date: pill.dataset.date }; offBoard(); showChipAt(e.clientX, e.clientY + 60, 'Drop on ' + M.dateText(pill.dataset.date, 'day'), 'It goes in the first open time'); return; }
    const onStage = under === stage || (under && under.parentElement === stage);
    if (!onStage) { offBoard(); return; }
    if (W.layout === 'week') {
      const t = targetAt(e.clientX, e.clientY);
      if (isFood(d.spec)) {
        const p = W.pick(e.clientX, e.clientY);
        if (p && p.kind === 'block' && p.block.dinner) { d.target = { type: 'dinner', date: p.date }; W.setHover(p.obj); showChipAt(e.clientX, e.clientY - 30, 'Dinner on ' + M.DAY_LONG[M.weekday(p.date)], 'Drop to set it'); }
        else if (t && t.date && t.kind !== 'none' && !day(t.date).blocks.some((b) => b.dinner)) {
          /* a day with no Dinner block gets one where the food lands */
          const add = { name: 'Dinner', cat: 'meals', icon: 'pot', dur: 45, dinner: true };
          const r = canPlaceWindow(t.date, add.dur, magnetWindow(t.date, t.min - add.dur / 2, add.dur));
          if (!d.obj || d.objBig !== (t.kind === 'day')) { if (d.obj) W.endDrag(); d.obj = W.startDrag(decorate(Object.assign({ key: 'drag', start: r.start }, add)), null, t.kind === 'day'); d.objBig = t.kind === 'day'; }
          W.setHover(null);
          aim(t, r.start, add.dur, r.ok, e.movementX || 0);
          d.target = { type: 'rail', date: t.date, start: r.start, ok: r.ok, reason: r.reason, blocker: r.blocker, add, food: d.spec };
          showChipAt(e.clientX, e.clientY - 30, 'Dinner, ' + specLook(d.spec).name, r.ok ? placedText(t.date, r.start) : blockedText(r));
          return;
        } else if (t && t.date && t.kind !== 'none') { d.target = { type: 'dinner', date: t.date }; W.setHover(null); showChipAt(e.clientX, e.clientY - 30, 'Dinner on ' + M.DAY_LONG[M.weekday(t.date)], 'Drop to set it'); }
        else { W.setHover(null); showChipAt(e.clientX, e.clientY - 30, specLook(d.spec).name, 'Drop it on a day'); }
        unaim(); floatFree(d, e, t);
        return;
      }
      const add = specAdd(d.spec);
      if (!add || !t || t.kind === 'none') { unaim(); floatFree(d, e, t); hideChip(); return; }
      const dur = M.gridDur(add.dur);
      const start = magnetWindow(t.date, t.min - dur / 2, dur);
      const r = canPlaceWindow(t.date, dur, start);
      if (!d.obj || d.objBig !== (t.kind === 'day')) { if (d.obj) W.endDrag(); d.obj = W.startDrag(decorate(Object.assign({ key: 'drag', start: r.start }, add, { dur })), null, t.kind === 'day', FEEL && d.obj3 ? { origin: d.obj3 } : undefined); d.objBig = t.kind === 'day'; }
      ghost.hidden = true;
      aim(t, r.start, dur, r.ok, e.movementX || 0, t.min);
      d.target = { type: 'rail', date: t.date, start: r.start, ok: r.ok, reason: r.reason, blocker: r.blocker, add: Object.assign({}, add, { dur }) };
      showChipAt(e.clientX, e.clientY - 30, add.name, r.ok ? placedText(t.date, r.start) + ' to ' + M.clock(r.start + dur) : blockedText(r));
    } else if (W.layout === 'month') {
      const p = W.pick(e.clientX, e.clientY);
      if (p && p.kind === 'card' && !isFood(d.spec)) {
        W.setHover(p.obj);
        d.target = { type: 'day', date: p.date };
        showChipAt(e.clientX, e.clientY - 40, 'Drop on ' + M.dateText(p.date, 'day'), 'It goes in the first open time');
      } else { W.setHover(null); hideChip(); }
      offBoard(true);
    } else offBoard();
  }
  /* == feel: a flat tile in hand ==
     The spot you grabbed stays under the pointer; the tile lifts as it comes up, and leans the way it's
     moving, swinging back level when you stop. */
  const carry = { g: null, x: 0, y: 0, px: 0, vx: 0, rot: { x: 0, v: 0 }, raf: 0, at: 0 };
  function carryStart(g, d) {
    g._homing = null;
    if (g.getAnimations) g.getAnimations().forEach((a) => a.cancel());
    carry.g = g; carry.at = performance.now(); carry.vx = 0; carry.rot = { x: 0, v: 0 };
    const r = d.el.getBoundingClientRect();
    if (d.gx == null) { d.gx = r.width / 2; d.gy = r.height / 2; }
    carry.x = carry.px = r.left; carry.y = r.top;
    Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', transformOrigin: d.gx + 'px ' + d.gy + 'px', rotate: '0deg', scale: '1', translate: '0px 0px', opacity: '' });
    if (feelMoves()) requestAnimationFrame(() => { if (carry.g === g) g.style.scale = '1.05'; });
    else g.style.scale = '1.04';
    cancelAnimationFrame(carry.raf);
    if (feelMoves()) carry.raf = requestAnimationFrame(carryStep);
  }
  function carryMove(x, y) { if (!carry.g) return; carry.x = x; carry.y = y; carry.g.style.left = x + 'px'; carry.g.style.top = y + 'px'; }
  function carryStep(now) {
    if (!carry.g) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - carry.at) / 1000)); carry.at = now;
    /* over the desk the block in 3D takes over; the tile waits, level, for the pointer to come back */
    if (carry.g.hidden) { carry.px = carry.x; carry.vx = 0; carry.rot.x = carry.rot.v = 0; carry.raf = requestAnimationFrame(carryStep); return; }
    const v = (carry.x - carry.px) / dt; carry.px = carry.x;
    const a = Math.max(-4000, Math.min(4000, (v - carry.vx) / dt)); carry.vx = v;
    /* a pendulum pushed by how fast the tile speeds up: it trails as you start and swings past as you stop */
    const n = Math.ceil(dt * 240), h = dt / n;
    for (let i = 0; i < n; i++) { carry.rot.v += (-140 * carry.rot.x - 13 * carry.rot.v + a * 0.0045) * h; carry.rot.x += carry.rot.v * h; }
    carry.g.style.rotate = Math.max(-9, Math.min(9, -3 + carry.rot.x)).toFixed(2) + 'deg';
    carry.raf = requestAnimationFrame(carryStep);
  }
  function carryHome(d, into) {
    const g = $('dragtile');
    cancelAnimationFrame(carry.raf); carry.g = null;
    const done = () => { if (g._homing !== token) return; g.hidden = true; g.style.translate = ''; g.style.opacity = ''; g.style.scale = ''; g.style.rotate = ''; if (d.el) d.el.style.opacity = ''; };
    const token = {}; g._homing = token;
    if (!feelMoves()) { done(); return; }
    const home = !into && d.el && d.el.isConnected ? d.el.getBoundingClientRect() : null;
    if (!home || !home.width) {
      g.animate([{ opacity: 1 }, { opacity: 0, scale: '0.85' }], { duration: 150, easing: IN_EASE, fill: 'forwards' }).onfinish = done;
      setTimeout(done, 400);
      return;
    }
    const dx = home.left - parseFloat(g.style.left), dy = home.top - parseFloat(g.style.top);
    g.animate([{ translate: '0px 0px', rotate: g.style.rotate, scale: g.style.scale }, { translate: dx + 'px ' + dy + 'px', rotate: '0deg', scale: '1' }], { duration: 240, easing: OUT_EASE, fill: 'forwards' }).onfinish = () => { done(); if (d.el && d.el.animate) d.el.animate([{ transform: 'translateY(-3px)' }, { transform: 'none' }], { duration: 160, easing: OUT_EASE }); };
    setTimeout(done, 520);
  }
  /* A piece picked up from the bench stays in hand, floating under the pointer, even between boards. */
  function floatFree(d, e, t) {
    if (d.el) { if (d.obj) { W.endDrag(); d.obj = null; } $('dragtile').hidden = false; return; }
    const a = specLook(d.spec) || { name: 'Piece', cat: 'open', icon: 'box', dur: 60 };
    if (!d.obj || d.objBig) { if (d.obj) W.endDrag(); d.obj = W.startDrag(decorate(Object.assign({ key: 'drag', start: 600 }, a, { dur: M.gridDur(a.dur) })), null, false, FEEL && d.obj3 ? { origin: d.obj3 } : undefined); d.objBig = false; }
    if (t) W.dragTo(t.wx, (t.wy || 0.3) + 1.4, t.wz, e.movementX || 0, FEEL ? { surface: t.wy || 0.3 } : undefined);
  }
  function offBoard(keepHover) {
    const d = tdrag;
    unaim();
    if (d && d.el) { if (d.obj) { W.endDrag(); d.obj = null; } $('dragtile').hidden = false; }
    if (!keepHover) { W.setHover(null); hideChip(); }
  }
  function blockedText(r) {
    if (r.reason === 'fixed' && r.blocker) return r.blocker.name + ' is locked there';
    if (r.reason === 'long') return 'That’s longer than the day';
    return 'No room there. Try an open spot.';
  }
  function dropTile() {
    const d = tdrag;
    tdrag = null;
    settle();
    /* feel: a tile still in hand off the desk flies back into its place in the tray, or drops into what it
       was let go on; the place it left stays dim until it's back */
    const inHand = FEEL && d.started && d.el && !$('dragtile').hidden;
    if (d.el && !inHand) d.el.style.opacity = '';
    const back = () => { if (d.obj3) d.obj3.visible = true; };
    if (inHand) carryHome(d, !!d.target);
    else { $('dragtile').hidden = true; cancelAnimationFrame(carry.raf); carry.g = null; }
    document.querySelectorAll('.slot.over, .daypill.over').forEach((x) => x.classList.remove('over'));
    W.setHover(null);
    hideChip();
    unaim();
    if (!d.started) { back(); if (d.onClick) { Snd.pick(); d.onClick(); } return; }
    const t = d.target;
    if (t && t.type === 'dinner') { if (FEEL) W.endDrag({ absorb: true }); else W.endDrag(); back(); setDinnerFrom(t.date, d.spec); return; }
    if (t && t.type === 'rail') {
      /* feel: a block that doesn't fit flies back to where it came from */
      if (!t.ok) { if (FEEL) W.endDrag({ home: true, then: back }); else { W.endDrag(); back(); } Snd.bad(); toast(blockedText(t), 'bad'); return; }
      const r = commit(() => M.placeAdd(state, t.date, t.add, t.start));
      if (r && r.ok) {
        W.adoptPosition(t.date, 'add:' + r.add.id);
        W.endDrag();
        landed(t.date, 'add:' + r.add.id, t.add.dur / 60);
        if (d.spec.kind === 'task' || d.spec.kind === 'step' || d.spec.kind === 'idea') toast(t.add.name + ', ' + placedText(r.date || t.date, r.start), 'good');
      } else W.endDrag();
      back();
      if (r && r.ok && t.food) setDinnerFrom(r.date || t.date, t.food);
      return;
    }
    if (t && t.type === 'day') {
      const add = specAdd(d.spec);
      const at = add && M.firstFit(state, t.date, M.gridDur(add.dur), Math.max(day(t.date).wake, 9 * 60));
      W.endDrag(); back();
      if (at == null) { Snd.bad(); toast('No open time that day', 'bad'); return; }
      const r = commit(() => M.placeAdd(state, t.date, add, at));
      if (r && r.ok) { Snd.clack(add.dur / 60); toast(add.name + ', ' + placedText(r.date || t.date, r.start), 'good'); }
      return;
    }
    if (FEEL) W.endDrag({ home: true, then: back }); else { W.endDrag(); back(); }
    Snd.slide();
  }
  const cooking = (c) => c === 'me' || c === 'kim' || c === 'home';
  /* Food landed on a dinner. Recipes and pantry things mean cooking; a dinner piece (Cook, Order in,
     Eat out, Leftovers) answers how it's happening. If nobody is cooking yet, the panel asks. */
  function setDinnerFrom(date, spec) {
    const cur = state.dinners[date] || { name: '', cook: '', items: [] };
    const homeCook = cooking(cur.cook) ? cur.cook : 'home';
    commit(() => {
      if (spec.kind === 'recipe') {
        const r = state.recipes.find((x) => x.id === spec.id);
        state.dinners[date] = { name: r.name, recipe: r.id, cook: homeCook, items: r.items.slice() };
      } else if (spec.kind === 'dish') {
        state.dinners[date] = spec.how === 'home' ? Object.assign({ name: '', items: [] }, cooking(cur.cook) ? cur : {}, { cook: homeCook })
          : { name: '', recipe: null, cook: spec.how, items: [] };
      } else {
        const base = cooking(cur.cook) ? cur : { name: '', items: [] };
        const items = (base.items || []).includes(spec.id) ? base.items.slice() : (base.items || []).concat(spec.id);
        const auto = !base.name || base.name === M.dinnerFromItems(state, base.items || []);
        state.dinners[date] = Object.assign({}, base, { cook: homeCook, items, name: auto ? M.dinnerFromItems(state, items) : base.name, recipe: null });
      }
    });
    Snd.clack(0.6);
    const dn = state.dinners[date];
    toast((dn.name || cookName(dn.cook)) + ' ' + whenWord(date, true), 'good');
    noteMove('dinner');
    if (dn.cook === 'home') openSel({ type: 'dinner', date });
  }

  /* == the board: dragging, stretching, and tapping blocks == */
  let bdrag = null;
  /* Fingers on the desk. Two of them pinch: the desk zooms around them and pans with them, the way a
     photo does, and whatever the first finger started (a tap, a swipe, a drag not yet moving) is
     dropped, so a pinch never changes the day. Until every finger lifts, nothing else happens. */
  const fingers = new Map();
  let pinch = null, pinchHold = false;
  const spread = () => { const [a, b] = Array.from(fingers.values()); return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 2 && !(bdrag && bdrag.started && bdrag.mode !== 'pan') && !tdrag) {
      bdrag = null; pinchHold = true; clearTimeout(tapWait);
      const sp = spread();
      pinch = { d0: Math.max(20, sp.d), z0: W.userZoom, x: sp.x, y: sp.y };
      if (FEEL) { W.press(null); W.direct(true); }
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      hideChip();
      return;
    }
    if (fingers.size > 2 || pinchHold) return;
    if (!ready || e.button !== 0) return;
    Snd.init();
    const hit = W.pick(e.clientX, e.clientY);
    if (hit && hit.kind === 'bench') {
      const pc = hit.piece;
      tdrag = { spec: pc.drag || null, el: null, obj3: hit.obj, x: e.clientX, y: e.clientY, started: false, target: null, onClick: () => { if (pc.open) openSel(pc.open); else if (pc.drag) openSel({ type: 'place', spec: pc.drag }); } };
      if (FEEL) W.press(hit.obj);
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      return;
    }
    bdrag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, hit, started: false, mode: !hit && W.userZoom > 1.01 ? 'pan' : 'click' };
    if (hit && hit.kind === 'block' && benchable()) {
      const b = hit.block;
      const full = sourceSpan(b, hit.date), atEnd = b.start + b.dur === full.start + full.dur;
      if (b.sleep === 'am' && hit.nearR && atEnd) bdrag.mode = 'wake';
      else if (b.sleep === 'pm' && hit.nearL && b.start === full.start) bdrag.mode = 'bed';
      else if (!b.sleep && !b.soft && !b.fixed && (b.add || b.tpl) && hit.nearR && atEnd) bdrag.mode = 'resize';
      else if (b.add) bdrag.mode = 'move';
      else if (b.tpl && !b.soft && !b.fixed && !b.sleep) bdrag.mode = 'slide';
      bdrag.grabMin = hit.min - full.start;
      bdrag.board = hit.board;
    }
    /* feel: what you press dips into the board before it moves */
    if (FEEL && hit && hit.kind === 'block' && hit.obj && hit.board !== 'mini') W.press(hit.obj);
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  });
  /* A drag answers every move at once. Looking around (the hover chip, the desk's small drift) is
     worked out once a frame from the last place the pointer was, not once per event. */
  let hoverEv = null, hoverQueued = false;
  function hoverSoon(e) {
    hoverEv = e;
    if (hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      const ev = hoverEv; hoverEv = null;
      if (!ev || tdrag || bdrag) return;
      const r = stage.getBoundingClientRect();
      /* the desk leans toward a mouse only: a finger lifts, and a lean toward where it was stays behind */
      if (r.width && ev.pointerType === 'mouse') W.parallax(((ev.clientX - r.left) / r.width - 0.5) * 2, ((ev.clientY - r.top) / r.height - 0.5) * 2);
      hover(ev);
    });
  }
  window.addEventListener('pointermove', (e) => {
    if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && fingers.size >= 2) {
      const sp = spread();
      W.zoomTo(pinch.z0 * sp.d / pinch.d0, sp.x, sp.y);
      W.panBy(sp.x - pinch.x, sp.y - pinch.y);
      pinch.x = sp.x; pinch.y = sp.y;
      renderViewCtl();
      return;
    }
    if (pinchHold) return;
    if (tdrag) { moveTile(e); return; }
    if (!bdrag) { hoverSoon(e); return; }
    const d = bdrag;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5 || d.mode === 'click') return;
      d.started = true;
      if (FEEL) W.press(null);
      if (d.mode === 'pan') { stage.className = 'grabbing'; hideChip(); if (FEEL) W.direct(true); }
      else {
        Snd.pick();
        hideChip();
        if (d.mode === 'move' || d.mode === 'slide') W.startDrag(decorate(d.hit.block, d.hit.date), d.hit.obj);
        stage.className = d.mode === 'move' || d.mode === 'slide' ? 'grabbing' : 'resize';
        /* lean in a little toward what's being moved, so the fine placing feels close */
        if (d.hit.obj) W.lean(d.hit.obj.getWorldPosition(new THREE.Vector3()), 1);
      }
    }
    if (d.mode === 'pan') { W.panBy(e.clientX - d.lx, e.clientY - d.ly); d.lx = e.clientX; d.ly = e.clientY; return; }
    boardDrag(e);
  });
  /* Safari's own pinch would zoom the whole page on the phone's desk; there the desk zooms instead */
  ['gesturestart', 'gesturechange'].forEach((t) => document.addEventListener(t, (e) => { if (document.body.classList.contains('phone-desk')) e.preventDefault(); }, { passive: false }));
  const liftFinger = (e) => {
    fingers.delete(e.pointerId);
    if (fingers.size < 2) pinch = null;
    if (pinchHold) { if (!fingers.size) pinchHold = false; return true; }
    return false;
  };
  /* On a phone's desk a tap waits a moment for a second one: two quick taps zoom in on that spot, or
     back out to the whole day. */
  let tapWait = 0, lastTap = null;
  window.addEventListener('pointerup', (e) => {
    if (liftFinger(e)) { if (FEEL && !fingers.size) W.direct(false); return; }
    if (FEEL) { W.press(null); W.direct(false); }
    if (tdrag) { dropTile(e); return; }
    if (!bdrag) return;
    const d = bdrag;
    bdrag = null;
    stage.className = '';
    W.lean(null);
    if (!d.started) {
      /* on a phone's one day desk, a sideways swipe goes to the day before or after (not while zoomed in) */
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (phoneDay() && d.mode === 'click' && W.userZoom <= 1.01 && Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) { shift(dx < 0 ? 1 : -1); return; }
      if (phoneDay() && e.pointerType === 'touch') {
        const now = Date.now(), x = e.clientX, y = e.clientY;
        if (lastTap && now - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 36) {
          clearTimeout(tapWait); lastTap = null;
          if (W.userZoom > 1.05) W.resetView(); else W.zoomTo(2.2, x, y);
          Snd.tick(true); renderViewCtl();
          return;
        }
        lastTap = { t: now, x, y };
        const hit = d.hit, ev = { clientX: x, clientY: y };
        clearTimeout(tapWait);
        tapWait = setTimeout(() => { lastTap = null; tapped(hit, ev); }, 260);
        return;
      }
      tapped(d.hit, e); return;
    }
    if (d.mode === 'pan') return;
    finishBoardDrag(d);
  });
  window.addEventListener('pointercancel', (e) => {
    if (liftFinger(e)) return;
    W.lean(null);
    if (FEEL) {
      /* feel: a touch the browser took back puts the block back where it was, and opens nothing */
      W.press(null); W.direct(false);
      if (tdrag) { const d = tdrag; if (d.obj) { W.endDrag({ home: true }); d.obj = null; d.obj3 = null; } d.started = false; d.onClick = null; dropTile(); }
      if (bdrag) { bdrag = null; render(); W.endDrag({ home: true }); }
      return;
    }
    if (tdrag) { tdrag.started = false; dropTile(); }
    if (bdrag) { bdrag = null; W.endDrag(); render(); }
  });

  function boardDrag(e) {
    const d = bdrag, b = d.hit.block;
    const full = sourceSpan(b, d.hit.date);
    const lifting = d.mode === 'move' || d.mode === 'slide';
    document.querySelectorAll('.daypill.over').forEach((x) => x.classList.remove('over'));
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const pill = d.mode === 'move' && under && under.closest && under.closest('.daypill');
    if (pill) {
      pill.classList.add('over');
      d.preview = { pill: pill.dataset.date }; d.ck = null;
      unaim();
      renderBoard();
      showChipAt(e.clientX, e.clientY + 60, 'Move to ' + M.dateText(pill.dataset.date, 'day'), 'Same time if it fits, or the first open time');
      return;
    }
    const t = targetAt(e.clientX, e.clientY, W.BOARD_Y + (lifting ? (d.board === 'day' ? W.H_HARD * W.DB_HMUL : W.H_HARD) : 0));
    if (!t) return;
    if (lifting) {
      const date = t.date;
      if (t.kind === 'none' || (d.mode === 'slide' && date !== d.hit.date)) {
        d.preview = null; d.ck = null;
        unaim();
        W.dragTo(t.wx, (t.wy || 0.3) + 1.2, t.wz, e.movementX);
        renderBoard();
        hideChip();
        return;
      }
      const start = M.snap(t.min - d.grabMin);
      const snapStart = magnetWindow(date, start, full.dur, sourceKey(b));
      const mid = t.min - d.grabMin + full.dur / 2;
      /* feel: the week is planned again only when the slot under you changes; in between, only the block
         in your hand moves (a full board used to stutter, planned again on every pointer move) */
      const ck = date + ':' + snapStart + ':' + start;
      if (FEEL && d.ck === ck && d.cAim) {
        aim(t, d.cAim.start, full.dur, d.cAim.ok, e.movementX, mid);
        showChipAt(e.clientX, e.clientY - 30, d.cAim.title, d.cAim.sub);
        return;
      }
      const tr = tryOn(() => (d.mode === 'move' ? M.moveAdd(state, b.add, date, snapStart) : M.moveTemplate(state, sourceDate(b, date), b.tpl, sourceMinute(b, date, snapStart))));
      const at = M.dateTime(tr.r.date || M.dateTime(date, snapStart).date, tr.r.start == null ? M.dateTime(date, snapStart).start : tr.r.start);
      const shownStart = M.windowTime(date, at.date, at.start), h = M.visibleHours(state);
      d.preview = tr.r.ok ? { date, start: shownStart } : null;
      const aimStart = tr.r.ok ? shownStart : M.clamp(start, h.start, h.end - full.dur);
      aim(t, aimStart, full.dur, tr.r.ok, e.movementX, mid);
      renderBoard(tr.r.ok ? daysWith(tr.dates, Array.from(new Set([date, d.hit.date]))) : null);
      const sub = tr.r.ok ? timeSpan(date, shownStart, shownStart + full.dur) : blockedText(tr.r);
      if (FEEL) { d.ck = ck; d.cAim = { start: aimStart, ok: tr.r.ok, title: b.label || b.name, sub }; }
      showChipAt(e.clientX, e.clientY - 30, b.label || b.name, sub);
      return;
    }
    if (t.kind === 'none' || t.date !== d.hit.date) return;
    const date = d.hit.date;
    if (d.mode === 'resize') {
      const want = M.snap(t.min - full.start);
      if (FEEL && d.ck === 'r' + want) { if (d.cAim) showChipAt(e.clientX, e.clientY - 30, d.cAim.title, d.cAim.sub); return; }
      if (FEEL) { d.ck = 'r' + want; d.cAim = null; }
      const tr = tryOn(() => M.resizeBlock(state, sourceDate(b, date), sourceKey(b), want));
      d.preview = tr.r.ok ? { dur: tr.r.dur } : null;
      if (tr.r.ok && d.lastV !== tr.r.dur) { if (d.lastV != null) Snd.detent(true); d.lastV = tr.r.dur; }
      renderBoard(tr.r.ok ? daysWith(tr.dates, [date]) : null);
      if (tr.r.ok) showChipAt(e.clientX, e.clientY - 30, (b.label || b.name) + ', ' + M.dur(tr.r.dur), timeSpan(date, full.start, full.start + tr.r.dur));
      if (FEEL && tr.r.ok) d.cAim = { title: (b.label || b.name) + ', ' + M.dur(tr.r.dur), sub: timeSpan(date, full.start, full.start + tr.r.dur) };
      return;
    }
    const v = M.snap(sourceMinute(b, date, t.min)), owner = sourceDate(b, date);
    const tr = tryOn(() => { if (d.mode === 'wake') M.setWake(state, owner, v); else M.setBed(state, owner, v); return { ok: true, v: state.dates[owner][d.mode === 'wake' ? 'wake' : 'bed'] }; });
    const pd = daysWith(tr.dates, [date]);
    d.preview = { v: tr.r.v };
    if (d.lastV !== d.preview.v) { if (d.lastV != null) Snd.detent(true); d.lastV = d.preview.v; }
    renderBoard(pd);
    showChipAt(e.clientX, e.clientY - 30, d.mode === 'wake' ? 'Up at ' + M.clock(d.preview.v) : 'Bed at ' + M.clock(d.preview.v), 'Only ' + M.DAY_LONG[M.weekday(date)] + '. Change the usual in the side panel.');
  }
  function finishBoardDrag(d) {
    const b = d.hit.block;
    settle();
    hideChip();
    unaim();
    document.querySelectorAll('.daypill.over').forEach((x) => x.classList.remove('over'));
    if (!d.preview) { if (FEEL) { render(); W.endDrag({ home: true }); } else { W.endDrag(); render(); } Snd.slide(); return; }
    if (d.preview.pill) {
      const to = d.preview.pill;
      W.endDrag();
      let r = commit(() => M.moveAdd(state, b.add, to, b.sourceStart == null ? b.start : b.sourceStart));
      if (!(r && r.ok)) { const at = M.firstFit(state, to, b.sourceDur || b.dur, Math.max(day(to).wake, 9 * 60)); if (at != null) r = commit(() => M.moveAdd(state, b.add, to, at)); }
      if (r && r.ok) { Snd.clack((b.sourceDur || b.dur) / 60); toast((b.label || b.name) + ' moved to ' + placedText(r.date || to, r.start), 'good'); selectBlock(null); }
      else { Snd.bad(); toast('No open time that day', 'bad'); render(); }
      return;
    }
    let r = null;
    if (d.mode === 'move') r = commit(() => M.moveAdd(state, b.add, d.preview.date, d.preview.start));
    else if (d.mode === 'slide') r = commit(() => M.moveTemplate(state, sourceDate(b, d.hit.date), b.tpl, sourceMinute(b, d.preview.date, d.preview.start)));
    else if (d.mode === 'resize') { r = commit(() => M.resizeBlock(state, sourceDate(b, d.hit.date), sourceKey(b), d.preview.dur)); if (r && r.ok) noteMove('stretch'); }
    else if (d.mode === 'wake') r = commit(() => { M.setWake(state, sourceDate(b, d.hit.date), d.preview.v); return { ok: true }; });
    else if (d.mode === 'bed') r = commit(() => { M.setBed(state, sourceDate(b, d.hit.date), d.preview.v); return { ok: true }; });
    if (d.mode === 'move' || d.mode === 'slide') {
      W.adoptPosition(d.preview.date, b.base);
      W.endDrag();
      if (r && r.ok) {
        landed(d.preview.date, b.base, b.dur / 60);
        if (d.preview.date !== d.hit.date) toast((b.label || b.name) + ' moved to ' + placedText(d.preview.date, d.preview.start), 'good');
        if (view.pick && view.pick.key === b.base) view.pick.date = d.preview.date;
      }
    } else if (r && r.ok) Snd.clack(0.8);
    renderTools();
  }
  function tapped(hit, e) {
    /* on a phone's day, what you tap is what the desk zooms in on, above the panel it opens */
    const near = () => { if (phoneDay() && W.focusOn) W.focusOn(e.clientX, e.clientY); };
    if (!hit) {
      if (view.pick) { selectBlock(null); return; }
      const t = targetAt(e.clientX, e.clientY);
      if (t && (t.kind === 'week' || t.kind === 'day')) { near(); Snd.pick(); openSel({ type: 'slot', date: t.date, start: M.snap(t.min) }); return; }
      if (view.sel) closeSel();
      return;
    }
    if (hit.kind === 'lamp') { toggleLamp(); return; }
    Snd.pick();
    if (hit.kind === 'notepad') { openDueSoon(); return; }
    if (hit.kind === 'clock') { if (window.SR_onClock) window.SR_onClock(); return; }
    if (hit.kind === 'block') {
      const date = sourceDate(hit.block, hit.date), key = sourceKey(hit.block);
      near();
      if (view.pick && view.pick.date === date && view.pick.key === key) openSel({ type: 'block', date, key });
      else selectBlock(date, key, { displayDate: hit.date, displayKey: hit.block.key });
      return;
    }
    if (hit.kind === 'miniRow') {
      const date = hit.date || weekOf()[hit.row];
      if (date === view.focus) setZoom('week');
      else { view.focus = date; selectBlock(null); Snd.zoom(false); render(); }
      return;
    }
    if (hit.kind === 'tab') { setZoom('day', weekOf()[hit.row]); return; }
    if (hit.kind === 'card') { setZoom('week', hit.date); return; }
    if (hit.kind === 'ycard') { setZoom('month', hit.month + '-01'); }
  }

  /* The next Saturday or Sunday with nothing on it yet (no dates, trips, or blocks placed) and at least
     four hours open or free, within six months. */
  function findFreeDay() {
    const ev = M.liveEvents(state);
    for (let k = 1; k <= 183; k++) {
      const d = M.addDays(today, k), wd = M.weekday(d);
      if (wd !== 0 && wd !== 6) continue;
      if (ev.some((e) => e.date === d || (e.end && e.date <= d && d <= e.end))) continue;
      if (((state.dates[d] || {}).adds || []).length) continue;
      const dd = day(d), open = (M.totals(dd).free || 0) + dd.blocks.filter((b) => b.free).reduce((a, b) => a + b.dur, 0);
      if (open >= 240) return { date: d, open };
    }
    return null;
  }
  function toggleLamp() {
    view.lamp = !view.lamp;
    W.setLamp(view.lamp);
    saveView();
    Snd.lamp(view.lamp);
    hideChip();
  }
  /* the notepad opens the to dos that are due soon, laid out on the bench where there's one */
  /* the notepad opens To do at Due soon, with those to dos and their steps laid out on the bench beside
     the day, in Today and in the Planner; tap it again to put them away */
  function openDueSoon() {
    if (view.reset) return;
    /* the phone has no tray or bench; its list has what's due, with a checkbox each */
    if (phoneDay()) {
      view.focus = today;
      closePhoneDesk();
      const card = document.querySelector('#todayview .td-todo');
      if (card) { card.scrollIntoView({ block: 'start', behavior: view.calm ? 'auto' : 'smooth' }); const box = card.querySelector('input, button'); if (box) box.focus({ preventScroll: true }); }
      return;
    }
    if (view.bench && view.bench.tab === 'todo' && view.bench.level === 'soon') { closeBench(); return; }
    if (!benchable()) setZoom('week');
    view.tab = 'todo';
    setTrayCollapsed(false);
    view.level = 'soon';
    view.bench = { tab: 'todo', level: 'soon' };
    Snd.zoom(false);
    render();
  }

  /* == the tools that float over a picked block == */
  function selectBlock(date, base, display) {
    view.pick = date ? Object.assign({ date, key: base }, display) : null;
    W.setSelected(view.pick && (view.pick.displayDate || date), view.pick && (view.pick.displayKey || base));
    renderTools();
  }
  function pickedBlock() {
    if (!view.pick) return null;
    const b = day(view.pick.date).blocks.find((x) => sourceKey(x) === view.pick.key && sourceDate(x, view.pick.date) === view.pick.date)
      || M.calendarRecords(state, view.pick.date).find((x) => sourceKey(x) === view.pick.key);
    if (!b) return null;
    const record = M.blockRecord(state, view.pick.date, sourceKey(b));
    return Object.assign({}, b, { key: sourceKey(b), base: sourceKey(b), start: record ? record.start : b.sourceStart == null ? b.start : b.sourceStart, dur: record ? record.dur : b.sourceDur == null ? b.dur : b.sourceDur });
  }
  function blockAction(b, date, what) {
    date = sourceDate(b, date);
    const tplEdit = (patch) => commit(() => { const rec = M.dateRec(state, date); rec.edits = rec.edits || {}; rec.edits[b.tpl] = Object.assign({}, rec.edits[b.tpl], patch); return { ok: true }; });
    let r = null;
    if (what === 'earlier' || what === 'later') {
      const dv = what === 'earlier' ? -15 : 15;
      if (b.sleep === 'am') r = commit(() => { M.setWake(state, date, b.start + b.dur + dv); return { ok: true }; });
      else if (b.sleep === 'pm') r = commit(() => { M.setBed(state, date, b.start + dv); return { ok: true }; });
      else if (b.add) r = commit(() => M.moveAdd(state, b.add, date, b.start + dv));
      else if (b.tpl && b.soft) r = tplEdit({ start: M.clamp(b.start + dv, M.RAIL0, M.RAIL1 - b.dur), dur: b.dur });
      else if (b.tpl) r = commit(() => M.moveTemplate(state, date, b.tpl, b.start + dv));
    } else if (what === 'shorter' || what === 'longer') {
      const dv = what === 'shorter' ? -15 : 15;
      if (b.dur + dv < 15) { Snd.bad(); toast('That’s as short as a block gets'); return; }
      if (b.tpl && b.soft) r = tplEdit({ start: b.start, dur: b.dur + dv });
      else { r = commit(() => M.resizeBlock(state, date, sourceKey(b), b.dur + dv)); if (r && r.ok) noteMove('stretch'); }
    } else if (what === 'unlock') { r = tplEdit({ fixed: false }); if (r) toast(b.name + ' is unlocked for ' + M.DAY_LONG[M.weekday(date)] + '. Drag it anywhere.', 'good'); }
    else if (what === 'lock') { r = tplEdit({ fixed: true }); if (r) toast(b.name + ' is locked for ' + M.DAY_LONG[M.weekday(date)]); }
    else if (what === 'kim') { r = tplEdit({ gone: true, by: partner() || 'someone' }); if (r) toast((partner() || 'Someone else') + ' has ' + b.name + ' on ' + M.DAY_LONG[M.weekday(date)] + '. That time is open.', 'good'); selectBlock(null); }
    else if (what === 'remove') {
      if (b.add) r = commit(() => { M.removeAdd(state, b.add); return { ok: true }; });
      else if (b.tpl) r = tplEdit({ gone: true });
      if (r) { toast((b.label || b.name) + ' is off ' + M.DAY_LONG[M.weekday(date)] + '. Undo brings it back.'); Snd.slide(); }
      selectBlock(null);
      return;
    } else if (what === 'done' || what === 'undone') {
      const src = b.src || {};
      const t = taskById(src.type === 'task' ? src.id : src.task);
      if (t) setDone(t, src.type === 'step' ? src.id : null, what === 'done');
      return;
    }
    if (r && r.ok !== false) landed(date, b.base, 0.6);
    else if (r === false || (r && r.ok === false)) { Snd.bad(); toast(blockedText(r || {}), 'bad'); }
    renderTools();
  }
  /* on the phone's day the tools sit along the bottom, and the board makes room above them */
  function renderTools() { drawTools(); if (phoneDay()) layoutInsets(); }
  function drawTools() {
    const box = $('btools');
    const b = pickedBlock();
    /* feel: they rise out of the block, and sink back into it */
    const away = () => { if (FEEL && !box.hidden) ghostOut(box, { opacity: 0, transform: 'translateY(' + (box.classList.contains('under') ? -6 : 6) + 'px) scale(0.96)' }, 120); box.hidden = true; box._key = null; };
    if (!b || !benchable()) { away(); if (view.pick && !b) { view.pick = null; W.setSelected(null); } return; }
    /* the side panel already shows this block; one set of controls at a time */
    if (view.sel) { away(); return; }
    const date = view.pick.date;
    /* a tool used from the keyboard keeps focus through the redraw, so the next key still lands */
    const hadIdx = box.contains(document.activeElement) ? [...box.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    box.replaceChildren();
    const head = el('div', 'tool-head');
    const c = cat(b.cat), sw = el('span', 'tool-sw');
    sw.style.background = c.base; sw.appendChild(icon(b.icon || 'star', 8, c.ink));
    const ht = el('div', 'tool-ht');
    ht.appendChild(el('b', '', b.label || b.name));
    ht.appendChild(el('span', '', M.dateText(date, 'day') + ' · ' + timeSpan(date, b.start, b.start + b.dur) + ' · ' + M.dur(b.dur) + (b.fixed && !b.sleep ? ' · Locked' : b.soft ? ' · Open time' : '')));
    const more = el('button', 'tool-more');
    more.type = 'button';
    more.append(icon('more', 7, UI.soft), document.createTextNode('More'));
    more.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    more.addEventListener('click', (ev) => { ev.stopPropagation(); Snd.init(); openSel({ type: 'block', date, key: b.key }); });
    head.append(sw, ht, more);
    box.appendChild(head);
    const row = el('div', 'tool-row');
    const add = (label, ic, what, cls) => {
      const x = el('button', 'tool' + (cls ? ' ' + cls : ''));
      x.type = 'button';
      x.appendChild(icon(ic, 9, '#FFFFFF'));
      x.appendChild(el('span', '', label));
      x.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      x.addEventListener('click', (ev) => { ev.stopPropagation(); Snd.init(); if (typeof what === 'function') what(); else blockAction(b, date, what); });
      row.appendChild(x);
    };
    const src = b.src || {};
    const task = src.type === 'task' || src.type === 'step' ? taskById(src.type === 'task' ? src.id : src.task) : null;
    if (task) add(b.done ? 'Not done' : 'Done', 'check', b.done ? 'undone' : 'done', b.done ? '' : 'go');
    if (b.dinner) add(b.planned ? 'Change' : 'Pick', 'pot', () => openSel({ type: 'dinner', date }), 'go');
    if (b.fixed && b.tpl && !b.sleep) {
      add('Unlock', 'unlock', 'unlock', 'go');
      if (b.daycare || b.cat === 'family') add((partner() || 'Someone else') + ' has it', 'heart', 'kim');
    } else if (!b.meeting && !b.event) {
      add('Earlier', 'earlier', 'earlier');
      add('Later', 'later', 'later');
      if (!b.sleep) { add('Shorter', 'shorter', 'shorter'); add('Longer', 'longer', 'longer'); }
      if (b.tpl && !b.soft && !b.sleep) add('Lock', 'lock', 'lock');
    }
    if (!b.sleep && !b.meeting && !b.event) add('Take off', 'x', 'remove');
    box.appendChild(row);
    const fresh = FEEL && (box.hidden || box._key !== date + '|' + b.key);
    box.hidden = false;
    box._key = date + '|' + b.key;
    if (hadIdx >= 0) { const bs = box.querySelectorAll('button'); (bs[Math.min(hadIdx, bs.length - 1)] || bs[0]).focus(); }
    placeTools();
    if (fresh) { box.style.transformOrigin = box.classList.contains('under') ? '50% 0' : '50% 100%'; arrive(box, { opacity: 0, transform: 'translateY(' + (box.classList.contains('under') ? -8 : 8) + 'px) scale(0.95)' }, 170); }
  }
  /* with the tools focused, arrows move the picked block, Shift and arrows stretch it, Delete takes it off */
  $('btools').addEventListener('keydown', (e) => {
    const b = pickedBlock();
    if (!b || !view.pick) return;
    const date = view.pick.date;
    const map = { ArrowLeft: e.shiftKey ? 'shorter' : 'earlier', ArrowRight: e.shiftKey ? 'longer' : 'later', Delete: 'remove', Backspace: 'remove' };
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); selectBlock(null); return; }
    const what = map[e.key];
    if (!what || b.meeting || b.event || (b.fixed && b.tpl)) return;
    e.preventDefault(); e.stopPropagation();
    blockAction(b, date, what);
    const nb = pickedBlock();
    say(nb ? (nb.label || nb.name) + ', ' + M.span(nb.start, nb.start + nb.dur) : '');
  });
  function placeTools() {
    const box = $('btools');
    if (box.hidden) return;
    if (phoneDay()) { box.classList.remove('under'); box.style.visibility = ''; box.style.left = ''; box.style.top = ''; return; }
    const a = W.selAnchor();
    if (!a || a.behind) { box.style.visibility = 'hidden'; return; }
    box.style.visibility = '';
    const w = box.offsetWidth, h = box.offsetHeight;
    /* above the block, unless that would cover the date or the kinds of day; then under it */
    const ceiling = headBottom() + 8;
    const under = a.y - h - 14 < ceiling && a.bottom != null;
    box.classList.toggle('under', under);
    box.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, a.x - w / 2)) + 'px';
    box.style.top = (under ? a.bottom + 14 : Math.max(ceiling, a.y - h - 14)) + 'px';
  }

  /* hover tips */
  let hoverKey = null, hoverTickAt = 0;
  function hover(e) {
    if (!ready) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!(under === stage || (under && under.parentElement === stage))) { if (hoverKey) { hoverKey = null; W.setHover(null); hideChip(); stage.className = ''; } return; }
    const hit = W.pick(e.clientX, e.clientY);
    if (!hit) { hoverKey = null; W.setHover(null); hideChip(); stage.className = ''; return; }
    const k = hit.kind + (hit.key || (hit.piece && hit.piece.key) || hit.date || hit.row || hit.month);
    if (k !== hoverKey) { hoverKey = k; const n = performance.now(); if (n - hoverTickAt > 140) { hoverTickAt = n; Snd.tick(false); } }
    if (hit.kind === 'block') {
      const b = hit.block;
      if (view.pick && view.pick.key === sourceKey(b) && view.pick.date === sourceDate(b, hit.date)) { W.setHover(null); hideChip(); stage.className = b.add || (b.tpl && !b.soft && !b.fixed) ? 'grab' : 'pointer'; return; }
      W.setHover(b.soft || b.sleep ? null : hit.obj);
      let tip;
      if (b.sleep === 'am') { tip = 'Drag the edge to change when you wake'; stage.className = hit.nearR ? 'resize' : 'pointer'; }
      else if (b.sleep === 'pm') { tip = 'Drag the edge to change bedtime'; stage.className = hit.nearL ? 'resize' : 'pointer'; }
      else if (b.fixed) { tip = 'Locked · tap to unlock'; stage.className = 'pointer'; }
      else if (b.soft) { tip = b.free ? 'Kept free' : 'Open time'; stage.className = 'pointer'; }
      else if (b.dinner) { tip = b.planned ? cookName(b.cook) || 'Who’s cooking?' : 'Tap to pick'; stage.className = hit.nearR ? 'resize' : 'grab'; }
      else { tip = hit.nearR ? 'Drag to stretch' : b.add ? 'Drag to move' : 'Drag to slide'; stage.className = hit.nearR ? 'resize' : 'grab'; }
      showChipAt(e.clientX, e.clientY, (b.label || b.name) + (b.done ? ', done' : ''), timeSpan(hit.date, b.start, b.start + b.dur) + ', ' + M.dur(b.dur) + ' · ' + tip);
    } else if (hit.kind === 'lamp') {
      W.setHover(null); stage.className = 'pointer';
      showChipAt(e.clientX, e.clientY, 'Desk lamp', view.lamp ? 'Tap to turn it off' : 'Tap to turn it on');
    } else if (hit.kind === 'clock') {
      if (window.SR_onClock) { W.setHover(null); stage.className = 'pointer'; showChipAt(e.clientX, e.clientY, 'Clock', 'Tap for a Pomodoro timer'); } else { hideChip(); stage.className = ''; }
    } else if (hit.kind === 'notepad') {
      W.setHover(null); stage.className = 'pointer';
      const d = dueList(), open = view.bench && view.bench.tab === 'todo' && view.bench.level === 'soon';
      showChipAt(e.clientX, e.clientY, 'Due soon', (d.list.length ? plural(d.list.length, 'thing', 'things') + ' ' + d.when + ' · ' : '') + (open ? 'Tap to put them away' : 'Tap to lay them out'));
    } else if (hit.kind === 'bench' && hit.piece.static) {
      W.setHover(null); hideChip(); stage.className = '';
    } else if (hit.kind === 'bench') {
      const pc = hit.piece;
      W.setHover(pc.drag || pc.open ? hit.obj : null);
      stage.className = pc.drag ? 'grab' : 'pointer';
      showChipAt(e.clientX, e.clientY, pc.label, (pc.sub ? pc.sub + ' · ' : '') + (pc.drag ? 'Drag onto a day, or tap' : 'Tap to open'));
    } else if (hit.kind === 'miniRow') {
      W.setHover(null);
      const date = hit.date || weekOf()[hit.row];
      stage.className = 'pointer';
      showChipAt(e.clientX, e.clientY, M.dateText(date, 'long'), date === view.focus ? 'Tap to see the whole week' : 'Tap to open this day');
    } else if (hit.kind === 'tab') {
      W.setHover(null);
      const date = weekOf()[hit.row], d = day(date);
      stage.className = 'pointer';
      const extra = [d.trip ? d.trip.name : '', ...d.markers.map((m) => m.name), d.due.length ? plural(d.due.length, 'thing', 'things') + ' due' : ''].filter(Boolean).join(' · ');
      showChipAt(e.clientX, e.clientY, M.dateText(date, 'long'), (extra ? extra + ' · ' : '') + 'Tap to pick up this day');
    } else if (hit.kind === 'card') {
      W.setHover(hit.obj);
      stage.className = 'pointer';
      const c = M.dayCard(state, hit.date, day(hit.date));
      let bits = c.flags.map((f) => f.name).concat(c.due.map((n) => 'Due: ' + n)).slice(0, 4);
      /* a version can name the day's blocks and its time to yourself in the hover (window.SR_starYours) */
      if (window.SR_starYours) {
        const dd = day(hit.date);
        bits = (c.yours >= 60 ? ['★ ' + M.hours(c.yours) + ' to yourself'] : []).concat(dd.blocks.filter((b) => !b.sleep && !b.soft && !b.free && b.dur >= 30).slice(0, 3).map((b) => b.name + ' ' + M.clock(b.start)), bits).slice(0, 5);
      }
      showChipAt(e.clientX, e.clientY, M.dateText(hit.date, 'long'), (bits.length ? bits.join(' · ') + ' · ' : '') + 'Tap to open the week');
    } else if (hit.kind === 'ycard') {
      W.setHover(hit.obj);
      stage.className = 'pointer';
      const p = M.parts(hit.month + '-01');
      showChipAt(e.clientX, e.clientY, M.MONTH_LONG[p.m - 1] + ' ' + p.y, 'Tap to open the month');
    }
  }
  function showChipAt(x, y, title, sub) {
    const c = $('chip');
    c.replaceChildren(document.createTextNode(title));
    if (sub) c.appendChild(el('small', '', sub));
    c.style.left = Math.max(120, Math.min(window.innerWidth - 120, x)) + 'px';
    c.style.top = Math.max(80, y) + 'px';
    if (FEEL && c.hidden) { c.hidden = false; if (feelMoves()) c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 110, easing: 'ease-out' }); return; }
    c.hidden = false;
  }
  function hideChip() { $('chip').hidden = true; }

  /* One zoom step per scroll gesture: a step fires once the scroll adds up, then waits for a pause. */
  let wheelAcc = 0, wheelLocked = false, wheelQuiet = 0;
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1;
    if (e.ctrlKey) { W.zoomTo(W.userZoom * Math.exp(-e.deltaY * unit * 0.012), e.clientX, e.clientY); renderViewCtl(); return; }
    if (W.userZoom > 1.01) { W.panBy(-e.deltaX * unit, -e.deltaY * unit); return; }
    clearTimeout(wheelQuiet);
    wheelQuiet = setTimeout(() => { wheelLocked = false; wheelAcc = 0; }, 220);
    if (wheelLocked) return;
    wheelAcc += e.deltaY * unit * (e.ctrlKey ? 3 : 1);
    if (Math.abs(wheelAcc) > 60) { wheelLocked = true; zoomStep(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; }
  }, { passive: false });

  /* == zooming the desk, and where Block library sits == */
  function boardCenter() {
    const r = stage.getBoundingClientRect(), side = $('side'), rack = $('rack').getBoundingClientRect();
    const right = side.hidden ? r.right : side.getBoundingClientRect().left;
    const top = Math.max($('hud').getBoundingClientRect().bottom, $('kinds').hidden ? 0 : $('kinds').getBoundingClientRect().bottom);
    return { x: (r.left + right) / 2, y: (top + rack.top) / 2 };
  }
  /* dir 1 in, -1 out, 0 fit */
  function deskZoom(dir) {
    Snd.init();
    if (!dir) W.resetView();
    else { const c = boardCenter(); W.zoomTo(W.userZoom * (dir > 0 ? 1.3 : 1 / 1.3), c.x, c.y); }
    Snd.tick(true);
    renderViewCtl();
  }
  function renderViewCtl() {
    const z = W.userZoom;
    zbtn.fit.disabled = z <= 1.01;
    zbtn.fit.textContent = Math.round(z * 100) + '%';
    zbtn.out.disabled = z <= 1.01;
    zbtn.in.disabled = z >= 2.55;
    /* the desk zoom shows once you've zoomed, as the way back; keys and pinch zoom any time */
    const was = viewctl.hidden;
    viewctl.hidden = !!view.reset || inToday() || view.list || noDesk;
    if (was !== viewctl.hidden) fitBar();
  }
  function placeViewCtl() { renderViewCtl(); }
  zbtn.out.appendChild(icon('zoomout', 10, '#FFFFFF'));
  zbtn.in.appendChild(icon('zoomin', 10, '#FFFFFF'));
  zbtn.out.addEventListener('click', () => deskZoom(-1));
  zbtn.in.addEventListener('click', () => deskZoom(1));
  zbtn.fit.addEventListener('click', () => deskZoom(0));


  /* == the side panel == */
  /* A fade at the bottom of the side panel when there's more below. */
  function sideFade() { const sd = $('side'); sd.classList.toggle('more', sd.scrollHeight - sd.scrollTop - sd.clientHeight > 6); }
  /* A new thing in the side panel opens at its top with focus on its title; the same thing redrawn
     after a change keeps its place and the field you were in. Closing it puts focus back where it was. */
  const selKey = (sel) => (sel ? JSON.stringify([sel.type, sel.id, sel.date, sel.key, sel.group, sel.kind, sel.spec && [sel.spec.kind, sel.spec.id, sel.spec.task]]) : '');
  let sideFrom = null, sideShown = '';
  function openSel(sel) {
    const fresh = selKey(sel) !== selKey(view.sel);
    if (fresh && $('side').hidden) sideFrom = document.activeElement;
    view.sel = sel; view.confirm = null; view.suggest = fresh ? null : view.suggest;
    if (view.pick && sel.type !== 'block' && sel.type !== 'dinner') { view.pick = null; W.setSelected(null); }
    renderSide(); layoutInsets(); renderTools();
  }
  function closeSel() {
    view.sel = null; renderSide(); layoutInsets(); renderTools();
    const back = sideFrom && document.contains(sideFrom) && sideFrom.offsetParent !== null ? sideFrom : null;
    sideFrom = null;
    if (back && back.focus && $('side').contains(document.activeElement) === false) back.focus({ preventScroll: true });
  }
  function renderSide() {
    const side = $('side'), inn = $('side-in');
    const sel = view.sel;
    placeNow = null;
    if (!tdrag && !bdrag) { W.showGhost(null); W.showDayGhost(null); }
    const sideMoves = FEEL && !document.body.classList.contains('c-detail'), wasHidden = side.hidden;
    if (!sel) { if (sideMoves) ghostOut(side, { opacity: 0, transform: 'translateX(10px)' }, 140); side.hidden = true; sideShown = ''; return; }
    const key = selKey(sel), same = key === sideShown;
    const keepScroll = same ? side.scrollTop : 0;
    let ok = true;
    keepFocus(inn, () => { inn.replaceChildren(); try { ok = buildSide(inn, sel) !== false; } catch (e) { console.error(e); logError('panel', e); ok = false; oops('That panel didn’t open. Nothing changed.'); } });
    if (!ok) { view.sel = null; side.hidden = true; sideShown = ''; return; }
    side.hidden = false;
    side.scrollTop = keepScroll;
    const h = inn.querySelector('.side-title, .bprev-name, h2');
    side.setAttribute('aria-label', h ? h.textContent : 'Details');
    if (!same) {
      sideShown = key;
      if (sideMoves) { if (wasHidden) arrive(side, { opacity: 0, transform: 'translateX(14px)' }, 220); else arrive(inn, { opacity: 0, transform: 'translateY(6px)' }, 170); }
      /* a new panel says what it is: its title takes focus, unless you're typing somewhere */
      const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !side.contains(a);
      if (h && !typing && !inn.querySelector('[data-autofocus]')) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
    sideFade();
  }
  function kicker(parent, text, ic, color) {
    const k = el('div', 'side-kicker');
    if (ic) k.appendChild(icon(ic, 9, color || UI.gold));
    k.appendChild(document.createTextNode(text));
    parent.appendChild(k);
  }
  /* A field's name is its label: a text box, a list, or a date gets a real label; a group of buttons
     (chips, a stepper) is a named group, and a stepper's buttons say which field they change. */
  let fieldId = 0;
  function field(parent, label, control) {
    const f = el('div', 'field');
    const id = 'f' + (++fieldId);
    const lbl = el(/^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName) ? 'label' : 'div', 'lbl', label);
    lbl.id = id + 'l';
    if (lbl.tagName === 'LABEL') { control.id = control.id || id; lbl.htmlFor = control.id; }
    else {
      control.setAttribute('role', control.getAttribute('role') || 'group');
      control.setAttribute('aria-labelledby', lbl.id);
      if (control.classList.contains('stepper') && control.name) control.name(label);
    }
    f.appendChild(lbl);
    f.appendChild(control);
    parent.appendChild(f);
    return f;
  }
  /* Panels rebuild after every change; this puts focus back on the same field afterwards. */
  let fieldSeq = 0, committing = null;
  function keepFocus(box, build) {
    const a = document.activeElement, key = a && box.contains(a) && a.dataset ? a.dataset.fk : null;
    const pos = key && typeof a.selectionStart === 'number' ? a.selectionStart : null;
    const end = pos != null && typeof a.selectionEnd === 'number' ? a.selectionEnd : pos;
    /* words typed but not yet saved (a new to do's name, a note) come through the redraw too */
    const drafts = {};
    box.querySelectorAll('input[data-fk], textarea[data-fk]').forEach((x) => { if (x.type !== 'checkbox' && x.dataset.v0 != null && x.value !== x.dataset.v0 && x.dataset.fk !== committing) drafts[x.dataset.fk] = x.value; });
    fieldSeq = 0;
    build();
    Object.keys(drafts).forEach((k) => { const x = box.querySelector('[data-fk="' + k + '"]'); if (x && x.value === x.dataset.v0) x.value = drafts[k]; });
    if (!key) return;
    const again = box.querySelector('[data-fk="' + key + '"]');
    if (again) { again.focus(); if (pos != null && again.setSelectionRange) try { again.setSelectionRange(pos, end, a.selectionDirection || 'none'); } catch (e) { /* fine */ } }
  }
  function textInput(value, onDone, ph, max) {
    const i = el('input', 'input');
    i.dataset.fk = 't' + (fieldSeq++);
    i.type = 'text'; i.value = value || ''; i.placeholder = ph || ''; i.maxLength = max || 60;
    i.dataset.v0 = i.value;
    /* a field's own save redraws from what was saved; only words nobody saved yet ride through as a draft */
    i.addEventListener('change', () => { committing = i.dataset.fk; try { onDone(i.value.trim()); } finally { committing = null; } });
    i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.blur(); e.stopPropagation(); });
    return i;
  }
  function dateInput(value, onDone) {
    const i = el('input', 'input');
    i.type = 'date'; i.value = value || '';
    i.addEventListener('change', () => { if (i.value) onDone(i.value); });
    i.addEventListener('keydown', (e) => e.stopPropagation());
    return i;
  }
  function stepBtn(mark, label, fn) {
    const b = button('', '', fn);
    b.setAttribute('aria-label', label);
    b.appendChild(icon(mark, 8, '#FFFFFF'));
    return b;
  }
  /* what you can type into a stepper: a time like 7:30 pm, 19:30, 7p, noon; or a length like 45m,
     1h 30, 1.5 h, 90 */
  function readClock(text) {
    const t = String(text || '').trim().toLowerCase().replace(/\./g, '');
    if (!t) return null;
    if (t === 'noon') return 720;
    if (t === 'midnight') return 1440;
    const m = t.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am?|pm?)?$/);
    if (!m) return null;
    let h = +m[1];
    const mn = m[2] ? +m[2] : 0;
    if (mn > 59 || h > 24) return null;
    if (m[3]) { h = h % 12; if (m[3][0] === 'p') h += 12; }
    return h * 60 + mn;
  }
  function readDur(text) {
    const t = String(text || '').trim().toLowerCase();
    if (!t) return null;
    let m = t.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?)\s*(?:(\d+)\s*(m|min|mins|minutes?)?)?$/);
    if (m) return Math.round(parseFloat(m[1]) * 60) + (m[3] ? +m[3] : 0);
    m = t.match(/^(\d+)\s*(m|min|mins|minutes?)?$/);
    if (m) return +m[1];
    m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return +m[1] * 60 + +m[2];
    return null;
  }
  /* The number in the middle of a stepper can be typed over: tap it, type, press Enter. */
  function typeable(out, fmt, get, set, step) {
    const isClock = isClockFmt(fmt);
    /* a spin button: a screen reader reads its name and its value (9:30 am, 45 min), the up and down
       arrows step it, and Enter opens it for typing */
    out.setAttribute('role', 'spinbutton');
    out.tabIndex = 0;
    out.title = isClock ? 'Type a time, like 7:30 pm' : 'Type a length, like 45m or 1h 30';
    out.setAttribute('aria-label', isClock ? 'Time' : 'Length');
    out.sync = () => { out.setAttribute('aria-valuenow', String(get())); out.setAttribute('aria-valuetext', fmt(get()) + '. Arrows change it, Enter types it.'); };
    out.sync();
    out.addEventListener('keydown', (e) => {
      if (out.querySelector('input')) return;
      const by = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!by) return;
      e.preventDefault(); e.stopPropagation();
      set(get() + by * (step || 15));
    });
    const start = () => {
      if (out.querySelector('input')) return;
      const inp = el('input', 'step-in');
      inp.type = 'text'; inp.value = fmt(get()); inp.setAttribute('aria-label', out.getAttribute('aria-label') || (isClock ? 'Time' : 'Length'));
      inp.dataset.autofocus = '1';
      /* Enter and Escape give focus back to the number, before the change, so a panel the change
         redraws finds it there; clicking or tabbing away leaves focus where the person put it */
      const done = (commitIt, byKey) => {
        if (!inp.isConnected) return;
        const v = commitIt ? (isClock ? readClock(inp.value) : readDur(inp.value)) : null;
        out.textContent = fmt(get());
        if (byKey) out.focus();
        if (commitIt && v == null && inp.value.trim()) toast(isClock ? 'That time didn’t read. Try 7:30 pm or 19:30.' : 'That length didn’t read. Try 45m or 1h 30.', 'bad');
        else if (v != null) set(isClock ? M.snap(v) : Math.max(5, v));
      };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); done(true, true); } else if (e.key === 'Escape') { e.preventDefault(); done(false, true); } });
      inp.addEventListener('blur', () => done(true, false));
      out.replaceChildren(inp);
      inp.focus(); inp.select();
    };
    out.addEventListener('click', start);
    out.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
  }
  /* a format marked clock (a bedtime that names the next day) steps and types as a time */
  const isClockFmt = (fmt) => fmt === M.clock || !!(fmt && fmt.clock);
  const stepWords = (fmt) => (isClockFmt(fmt) ? ['earlier', 'later'] : fmt === M.dur ? ['shorter', 'longer'] : ['less', 'more']);
  /* After a step, the new value is said out loud. The panel is often redrawn by the change, so the
     words go to the page's one live region, which outlives the redraw, and they say what the control
     holds once the change has settled (a time that was clamped reads as what it became). */
  let stepSaid = 0;
  function sayStep(name, fmt, read) {
    clearTimeout(stepSaid);
    stepSaid = setTimeout(() => { const v = read(); if (v != null) say(name() + ' ' + fmt(v)); }, 60);
  }
  function stepper(value, fmt, onStep, stepMin) {
    const s = el('div', 'stepper');
    const out = el('output', '', fmt(value));
    const [lo, hi] = stepWords(fmt);
    let label = isClockFmt(fmt) ? 'Time' : 'Length';
    /* the redraw makes a new stepper for the same field: find it by its name and read what it shows */
    const shown = () => { const live = Array.from(document.querySelectorAll('.stepper output[role="spinbutton"]')).find((o) => o.getAttribute('aria-label') === label); return live ? +live.getAttribute('aria-valuenow') : null; };
    const go = (v) => { onStep(v); sayStep(() => label, fmt, shown); };
    const minus = stepBtn('minus', cap(lo), () => go(value - (stepMin || 15))), plus = stepBtn('plus', cap(hi), () => go(value + (stepMin || 15)));
    s.append(minus, out, plus);
    typeable(out, fmt, () => value, go, stepMin);
    s.name = (l) => {
      label = l;
      minus.setAttribute('aria-label', l + ', ' + lo + '. Now ' + fmt(value)); plus.setAttribute('aria-label', l + ', ' + hi + '. Now ' + fmt(value)); out.setAttribute('aria-label', l);
      /* the panel is rebuilt by each step, so each part keeps a key and focus comes back to it */
      const k = 'sp-' + l.replace(/[^a-z0-9]+/gi, '-');
      minus.dataset.fk = k + '-lo'; out.dataset.fk = k; plus.dataset.fk = k + '-hi';
    };
    return s;
  }
  /* a stepper that keeps its own value, for panels that update in place instead of redrawing */
  function liveStepper(get, set, fmt, step) {
    const s = el('div', 'stepper');
    const out = el('output', '', fmt(get()));
    let label = isClockFmt(fmt) ? 'Time' : 'Length';
    const names = () => { minus.setAttribute('aria-label', label + ', ' + lo + '. Now ' + fmt(get())); plus.setAttribute('aria-label', label + ', ' + hi + '. Now ' + fmt(get())); };
    const show = () => { if (!out.querySelector('input')) out.textContent = fmt(get()); out.sync(); names(); };
    const put = (v) => { set(v); show(); sayStep(() => label, fmt, get); };
    const [lo, hi] = stepWords(fmt);
    const minus = stepBtn('minus', cap(lo), () => put(get() - (step || 15))), plus = stepBtn('plus', cap(hi), () => put(get() + (step || 15)));
    s.append(minus, out, plus);
    typeable(out, fmt, get, put, step);
    s.refresh = show;
    s.name = (l) => {
      label = l; out.setAttribute('aria-label', l); names();
      /* a live change can rebuild the panel too: keep focus on the same part of this field */
      const k = 'sp-' + l.replace(/[^a-z0-9]+/gi, '-');
      minus.dataset.fk = k + '-lo'; out.dataset.fk = k; plus.dataset.fk = k + '-hi';
    };
    return s;
  }
  /* key: a focus key per chip, so picking one with the keyboard and redrawing keeps focus on it */
  /* Block library in its groups, the same everywhere it's listed: the desk's own rows (Data.KIT_ROWS),
     then the ones someone made, then the rest (Open time); empty groups left out */
  function libGroups(shown) {
    const inRow = new Set(D.KIT_ROWS.flatMap((r) => r.ids));
    return D.KIT_ROWS.map((r) => ({ name: r.name, list: r.ids.map((id) => shown.find((b) => b.id === id)).filter(Boolean) }))
      .concat([{ name: 'Made by you', list: shown.filter((b) => !D.PALETTE_IDS.includes(b.id)) }, { name: 'Other', list: shown.filter((b) => D.PALETTE_IDS.includes(b.id) && !inRow.has(b.id)) }])
      .filter((g) => g.list.length);
  }
  function chips(items, current, onPick, key) {
    const c = el('div', 'chips');
    items.forEach((it) => {
      const b = el('button', 'chip-btn');
      b.type = 'button';
      if (key) b.dataset.fk = key + '-' + it.id;
      if (it.color) { const sw = el('span', 'sw'); sw.style.background = it.color; b.appendChild(sw); }
      if (it.icon) b.appendChild(icon(it.icon, 8, '#FFFFFF'));
      b.appendChild(document.createTextNode(it.name));
      if (!it.name && it.icon) { const word = MARK_WORDS[it.icon] || cap(it.icon); b.setAttribute('aria-label', word); b.title = word; }
      b.setAttribute('aria-pressed', String(Array.isArray(current) ? current.includes(it.id) : current === it.id));
      b.addEventListener('click', () => {
        Snd.init(); Snd.pick();
        if (!Array.isArray(current)) c.querySelectorAll('.chip-btn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        else b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        onPick(it.id);
      });
      c.appendChild(b);
    });
    return c;
  }
  /* The week's days as seven round buttons in one row, a letter each, named in full for a screen
     reader: half the height of seven word chips that wrap on a phone. */
  function dayChips(current, onPick) {
    const c = chips([1, 2, 3, 4, 5, 6, 0].map((x) => ({ id: x, name: M.DAY_SHORT[x].slice(0, 1) })), current, onPick);
    c.classList.add('days7');
    c.querySelectorAll('.chip-btn').forEach((b, i) => { const wd = [1, 2, 3, 4, 5, 6, 0][i]; b.setAttribute('aria-label', M.DAY_LONG[wd]); b.title = M.DAY_LONG[wd]; });
    return c;
  }
  /* what a mark is called when the mark is all a button shows */
  const MARK_WORDS = { handset: 'Phone', dumbbell: 'Weights', note: 'Music', cup: 'Cup', shoe: 'Shoe', brush: 'Brush', receipt: 'Receipt', people: 'People', church: 'Church', tree: 'Tree', cart: 'Cart' };
  const catChips = (cur, fn) => chips(D.CAT_ORDER.filter((c) => c !== 'sleep' && c !== 'away').map((c) => ({ id: c, name: cat(c).name, color: palette()[c].base })), cur, fn);
  function actions(parent, list) { const a = el('div', 'actions'); list.filter(Boolean).forEach((b) => a.appendChild(b)); parent.appendChild(a); return a; }
  /* A button that asks twice. It redraws wherever it lives, the side panel or Settings, and the
     second tap has to come within a few seconds. */
  function confirmButton(text, key, fn) {
    const armed = view.confirm === key;
    const b = button(armed ? 'Tap again to ' + text[0].toLowerCase() + text.slice(1) : text, 'small warn' + (armed ? ' armed' : ''), () => {
      if (armed) { view.confirm = null; fn(); return; }
      view.confirm = key;
      if (view.drawer) renderDrawer(); else renderSide();
      setTimeout(() => { if (view.confirm === key) { view.confirm = null; if (view.drawer) renderDrawer(); else renderSide(); } }, 5000);
    });
    b.dataset.fk = 'confirm-' + key;
    return b;
  }
  function title(parent, text) { parent.appendChild(el('h2', 'side-title', text)); }
  function divider(parent) { parent.appendChild(el('hr', 'rule')); }
  /* The block you tapped, drawn as it sits on the desk: its color, its mark, its name, and its time.
     b is a decorated block (label, daySub); pass { time } to override the time line. */
  function preview(parent, b, opt) {
    opt = opt || {};
    const c = cat(b.cat);
    const box = el('div', 'bprev' + (b.soft ? ' soft' : '') + (b.done ? ' done' : ''));
    box.style.setProperty('--bg', c.base); box.style.setProperty('--ink', c.ink);
    box.appendChild(icon(b.done ? 'check' : b.icon || 'star', 15, c.ink));
    const t = el('div', 'bprev-t');
    t.appendChild(el(opt.heading ? 'h2' : 'div', 'bprev-name', b.label || b.name || opt.placeholder || 'Your block'));
    const time = opt.time != null ? opt.time : b.dinner ? b.daySub : M.span(b.start, b.start + b.dur) + ' · ' + M.dur(b.dur);
    if (time || opt.time != null) t.appendChild(el('div', 'bprev-time', time));
    if (opt.hero) box.classList.add('hero');
    box.appendChild(t);
    if (b.fixed && !b.sleep) { const tag = el('span', 'bprev-tag'); tag.append(icon('lock', 7, c.ink), document.createTextNode('Locked')); box.appendChild(tag); }
    parent.appendChild(box);
    return box;
  }
  function line(parent, text) { if (text) parent.appendChild(el('p', 'side-line', text)); }

  function buildSide(p, sel) {
    if (sel.type === 'block') {
      const d = day(sel.date);
      const b = d.blocks.find((x) => sourceKey(x) === sel.key && sourceDate(x, sel.date) === sel.date) || d.blocks.find((x) => x.key === sel.key);
      if (!b) return false;
      if (b.dinner) return dinnerPanel(p, sel.date);
      if (b.add) return addPanel(p, sel.date, b);
      if (b.meeting) return meetingPanel(p, b.meeting);
      if (b.event) return eventPanel(p, b.event);
      if (b.sleep) return dayPanel(p, sel.date);
      if (d.trip && /^trip/.test(b.tpl || '')) return eventPanel(p, d.trip.id);
      return tplPanel(p, sel.date, b);
    }
    if (sel.type === 'task') return taskPanel(p, sel.id);
    if (sel.type === 'dinner') return dinnerPanel(p, sel.date);
    if (sel.type === 'slot') return slotPanel(p, sel.date, sel.start);
    if (sel.type === 'day') return dayPanel(p, sel.date);
    if (sel.type === 'meetings') return meetingsPanel(p);
    if (sel.type === 'meeting') return meetingPanel(p, sel.id);
    if (sel.type === 'event') return eventPanel(p, sel.id);
    if (sel.type === 'newEvent') return newEventPanel(p, sel);
    if (sel.type === 'groceries') return groceriesPanel(p);
    if (sel.type === 'newTask') return newTaskPanel(p, sel.group);
    if (sel.type === 'newGroup') return newGroupPanel(p);
    if (sel.type === 'newBlock') return newBlockPanel(p);
    if (sel.type === 'moves') return movesPanel(p);
    if (sel.type === 'newIdea') return newIdeaPanel(p, sel.kind);
    if (sel.type === 'place') return placePanel(p, sel);
    if (sel.type === 'help') return helpPanel(p);
    if (sel.type === 'savePreset') return savePresetPanel(p, sel.date);
    if (sel.type === 'clashes') return clashesPanel(p);
    if (sel.type === 'feedback') return feedbackPanel(p);
    return false;
  }
  /* Two real commitments at the same time. The board shows one plan; this keeps both in view, with
     a way to each day and to whichever one can give way. */
  function clashesPanel(p) {
    const list = M.clashesIn(state, today, 21);
    kicker(p, 'The next three weeks', 'overlap');
    title(p, list.length ? plural(list.length, 'overlap', 'overlaps') : 'Nothing overlaps');
    line(p, list.length ? 'Each pair asks for the same time. The board shows whichever came last on top; both are still real.' : 'No two set times, meetings, or locked routines ask for the same time in the next three weeks.');
    list.forEach((c) => {
      const box = el('div', 'dcard clash');
      box.appendChild(el('div', 'dcard-h', M.dateText(c.date, 'day') + ', ' + M.span(c.start, c.end)));
      const names = el('div', 'list');
      [c.a, c.b].forEach((x) => { const r = el('div', 'list-row'); const t = el('span', 'grow', x.name); t.appendChild(el('small', '', M.span(x.start, x.start + x.dur) + (x.cal ? ' · from a calendar' : x.key.startsWith('mt:') ? ' · weekly meeting' : x.key.startsWith('tpl:') ? ' · locked routine' : ' · set time'))); r.appendChild(t); names.appendChild(r); });
      box.appendChild(names);
      actions(box, [button('Open ' + M.DAY_LONG[M.weekday(c.date)], 'small', () => { closeSel(); setZoom('day', c.date); })]);
      p.appendChild(box);
    });
  }

  /* a routine from the usual week */
  function tplPanel(p, date, b) {
    const c = cat(b.cat), wd = M.weekday(date), dd = state.dates[date] || {};
    const edited = !!(dd.edits && dd.edits[b.tpl]);
    kicker(p, M.dateText(date, 'day') + ' · ' + c.name, b.icon);
    preview(p, b);
    line(p, b.free ? 'Kept free. It shows as an empty spot, and anything you add makes room.' : b.soft ? 'Open time. Blocks you drop here make room for themselves.' : b.fixed ? 'Locked. Other blocks never push it.' : 'Part of your usual ' + M.DAY_LONG[wd] + '.');
    const setTime = (start, len) => {
      const r = commit(() => {
        if (b.soft) { const rec = M.dateRec(state, date); rec.edits = rec.edits || {}; rec.edits[b.tpl] = Object.assign({}, rec.edits[b.tpl], { start: M.clamp(start, M.RAIL0, M.RAIL1 - len), dur: Math.max(15, len) }); return { ok: true }; }
        return M.moveTemplate(state, date, b.tpl, start, Math.max(15, len));
      });
      if (r && r.ok) Snd.clack(0.6); else { Snd.bad(); toast(blockedText(r || {}), 'bad'); }
    };
    const orig = templateBlock(date, b.tpl);
    const baseStart = orig ? (dd.edits && dd.edits[b.tpl] && dd.edits[b.tpl].start != null ? dd.edits[b.tpl].start : orig.start) : b.start;
    const baseDur = orig ? (dd.edits && dd.edits[b.tpl] && dd.edits[b.tpl].dur ? dd.edits[b.tpl].dur : orig.dur) : b.dur;
    const row = el('div', 'row2');
    field(row, 'Starts', stepper(baseStart, M.clock, (v) => setTime(v, baseDur)));
    field(row, 'Length', stepper(baseDur, M.dur, (v) => setTime(baseStart, v)));
    p.appendChild(row);
    if (!b.soft) {
      /* locking: this day only, or every week */
      const tpl = M.templateFor(state, date), tb = tpl.blocks.find((x) => x.id === b.tpl);
      const dayEdit = dd.edits && dd.edits[b.tpl] && dd.edits[b.tpl].fixed != null;
      const setDayLock = (on) => { commit(() => { const rec = M.dateRec(state, date); rec.edits = rec.edits || {}; rec.edits[b.tpl] = Object.assign({}, rec.edits[b.tpl], { fixed: on }); }); Snd.clack(0.5); };
      const setEveryLock = (on) => { commit(() => { if (tb) tb.fixed = on; if (dd.edits && dd.edits[b.tpl]) delete dd.edits[b.tpl].fixed; }); Snd.clack(0.5); toast(b.name + (on ? ' is locked every ' : ' is unlocked every ') + M.DAY_LONG[wd], 'good'); };
      const lockBox = el('div', 'actions');
      if (b.fixed) {
        lockBox.appendChild(button('Unlock this ' + M.DAY_LONG[wd], 'small primary', () => setDayLock(false)));
        if (tb && tb.fixed) lockBox.appendChild(button('Unlock every ' + M.DAY_LONG[wd], 'small', () => setEveryLock(false)));
        if (b.daycare || b.cat === 'family') lockBox.appendChild(button((partner() || 'Someone else') + ' has it this day', 'small', () => { commit(() => { const rec = M.dateRec(state, date); rec.edits = rec.edits || {}; rec.edits[b.tpl] = { gone: true, by: partner() || 'someone' }; }); closeSel(); toast((partner() || 'Someone else') + ' has ' + b.name + ' on ' + M.DAY_LONG[wd] + '. That time is open.', 'good'); }));
      } else {
        lockBox.appendChild(button(dayEdit ? 'Lock it again' : 'Lock this ' + M.DAY_LONG[wd], 'small', () => setDayLock(true)));
        if (tb && !tb.fixed) lockBox.appendChild(button('Lock every ' + M.DAY_LONG[wd], 'small', () => setEveryLock(true)));
      }
      field(p, b.fixed ? 'Locked' : 'Lock', lockBox);
    }
    field(p, 'Name on this day', textInput(b.name, (v) => { if (!v) return; commit(() => { const rec = M.dateRec(state, date); rec.edits = rec.edits || {}; rec.edits[b.tpl] = Object.assign({}, rec.edits[b.tpl], { name: v }); }); }));
    if (edited) actions(p, [
      button('Make this the usual for ' + M.DAY_LONG[wd] + 's', 'small primary', () => {
        commit(() => {
          const tpl = M.templateFor(state, date), e = state.dates[date].edits[b.tpl];
          const tb = tpl.blocks.find((x) => x.id === b.tpl);
          if (tb) Object.assign(tb, { start: e.start != null ? e.start : tb.start, dur: e.dur || tb.dur, name: e.name || tb.name });
          delete state.dates[date].edits[b.tpl];
        });
        toast('Now the usual for ' + M.DAY_LONG[wd] + 's', 'good');
      }),
      button('Put it back', 'small', () => { commit(() => { delete state.dates[date].edits[b.tpl]; }); })
    ]);
    divider(p);
    actions(p, [
      button('Take it off ' + M.DAY_LONG[wd], 'small quiet', () => { commit(() => { const rec = M.dateRec(state, date); rec.edits = rec.edits || {}; rec.edits[b.tpl] = { gone: true }; }); closeSel(); toast(b.name + ' is off ' + M.DAY_LONG[wd] + '. Undo brings it back.'); }),
      confirmButton('Remove from every ' + M.DAY_LONG[wd], 'rm-tpl-' + b.tpl, () => { commit(() => { const tpl = M.templateFor(state, date); tpl.blocks = tpl.blocks.filter((x) => x.id !== b.tpl); }); closeSel(); })
    ]);
  }
  function templateBlock(date, id) { const t = M.templateFor(state, date); return t.blocks.find((x) => x.id === id); }

  /* something you placed from the tray */
  function addPanel(p, date, b) {
    const src = b.src || {};
    const found = M.findAdd(state, b.add);
    if (!found) return false;
    const a = found.add;
    const c = cat(b.cat);
    const t = src.type === 'task' || src.type === 'step' ? taskById(src.type === 'task' ? src.id : src.task) : null;
    kicker(p, M.dateText(date, 'day') + ' · ' + (src.type === 'idea' ? usName() : t ? groupName(t.group) : c.name), b.icon);
    preview(p, Object.assign({}, b, { start: a.start, dur: a.dur }), { time: timeSpan(date, a.start, a.start + a.dur) + ' · ' + M.dur(a.dur) });
    if (t) line(p, (src.type === 'step' ? 'A step of ' + t.name + '.' : '') + (t.due ? ' Due ' + M.relText(t.due, today) + '.' : ''));
    if (t) {
      const doneNow = src.type === 'task' ? t.done : (t.steps.find((s) => s.id === src.id) || {}).done;
      const lab = el('label', 'list-row');
      const tk = el('input', 'tick'); tk.type = 'checkbox'; tk.checked = !!doneNow;
      tk.addEventListener('change', () => { Snd.init(); setDone(t, src.type === 'step' ? src.id : null, tk.checked); });
      lab.append(tk, el('span', 'grow', tk.checked ? 'Done' : 'Mark it done'));
      p.appendChild(lab);
    } else if (src.type !== 'idea') {
      field(p, 'Name', textInput(a.name, (v) => { if (v) commit(() => { a.name = v; }); }));
    }
    const setTime = (start, len) => {
      const r = commit(() => {
        if (len !== a.dur) return M.resizeBlock(state, date, 'add:' + a.id, len);
        return M.moveAdd(state, a.id, date, start);
      });
      if (r && r.ok) Snd.clack(0.6); else { Snd.bad(); toast(blockedText(r || {}), 'bad'); }
    };
    const row = el('div', 'row2');
    field(row, 'Starts', stepper(a.start, M.clock, (v) => setTime(v, a.dur)));
    field(row, 'Length', stepper(a.dur, M.dur, (v) => setTime(a.start, Math.max(15, v))));
    p.appendChild(row);
    field(p, 'Day', chips(M.weekDates(date).map((x) => ({ id: x, name: M.DAY_SHORT[M.weekday(x)] + ' ' + M.parts(x).d })), date, (to) => {
      if (to === date) return;
      let r = commit(() => M.moveAdd(state, a.id, to, a.start));
      if (!(r && r.ok)) { const at = M.firstFit(state, to, a.dur, Math.max(day(to).wake, 9 * 60)); if (at != null) r = commit(() => M.moveAdd(state, a.id, to, at)); }
      if (r && r.ok) { Snd.clack(a.dur / 60); toast((b.label || b.name) + ', ' + placedText(to, r.start), 'good'); openSel({ type: 'block', date: to, key: 'add:' + a.id }); }
      else { Snd.bad(); toast('No open time that day', 'bad'); renderSide(); }
    }));
    if (t) actions(p, [button('Open the to do', 'small', () => openSel({ type: 'task', id: t.id }))]);
    /* something an assistant put here says so, so it's never a mystery block */
    if (a.via === 'assistant') p.appendChild(el('p', 'field-hint', 'Your assistant put this here.'));
    divider(p);
    actions(p, [button('Take it off the day', 'small quiet', () => { commit(() => { M.removeAdd(state, a.id); }); Snd.slide(); closeSel(); toast((b.label || b.name) + ' is off ' + M.DAY_LONG[M.weekday(date)] + '. Undo brings it back.'); })]);
  }
  /* marks a to do or one of its steps done; returns the next one when it repeats. Changes state
     without a commit, so a caller can make it part of a bigger change */
  function markDone(t, stepId, done) {
    let next = null;
    if (stepId) {
      const st = t.steps.find((x) => x.id === stepId);
      st.done = done;
      if (done && t.steps.every((x) => x.done) && !t.done) next = M.completeTask(state, t.id, today);
      /* a step that isn't done after all means the to do isn't either */
      if (!done && t.done) M.reopenTask(state, t.id);
    } else if (done) { t.steps.forEach((st) => { st.done = true; }); next = M.completeTask(state, t.id, today); }
    else M.reopenTask(state, t.id);
    return next;
  }
  function setDone(t, stepId, done) {
    let next = null;
    commit(() => { next = markDone(t, stepId, done); });
    if (next) toast('Next ' + t.name + ': ' + M.dateText(next.due));
    if (done) {
      Snd.good(); toast(t.name + (stepId ? ': step done' : ' is done'), 'good');
      /* the board shows it too: its blocks this week press down once, wearing their check */
      const week = new Set(weekOf());
      Object.entries(state.dates).forEach(([date, rec]) => (rec.adds || []).forEach((a) => {
        const src = a.src || {}, mine = stepId ? src.type === 'step' && src.id === stepId : (src.type === 'task' && src.id === t.id) || (src.type === 'step' && src.task === t.id);
        if (!mine) return;
        const at = boardTime(date, a.start);
        if (week.has(at.date) || at.date === view.focus) W.squash(at.date, date + ':add:' + a.id);
      }));
    }
  }

  /* a to do and its steps */
  function taskPanel(p, id) {
    const t = taskById(id);
    if (!t) return false;
    const c = cat(t.cat);
    const pl = M.placements(state).get(t.id) || [];
    const plan = M.taskPlan(t, pl, today, nowMin), status = plan.status;
    kicker(p, groupName(t.group), t.icon || 'check');
    const name = textInput(t.name, (v) => { if (v) commit(() => { t.name = v; }); }, 'What needs doing?', 80);
    field(p, 'To do', name);
    const row = el('div', 'row2');
    field(row, 'Due', dateInput(t.due, (v) => commit(() => { t.due = v; })));
    field(row, 'Kind of time', (() => { const s = el('select', 'input'); D.CAT_ORDER.filter((k) => k !== 'sleep' && k !== 'away').forEach((k) => { const o = el('option', '', cat(k).name); o.value = k; if ((t.cat || 'yours') === k) o.selected = true; s.appendChild(o); }); s.addEventListener('change', () => commit(() => { t.cat = s.value; })); return s; })());
    p.appendChild(row);
    const ahead = pl.filter((x) => x.date > today || (x.date === today && x.add.start + x.add.dur > nowMin));
    const times = ahead.map((x) => M.dateText(x.date, 'day') + ' at ' + M.clock(x.add.start)).join(', ');
    line(p, status === 'done' ? (t.skipped ? 'Skipped this time.' : 'Done.')
      : status === 'planned' ? 'Has a time: ' + times + '.'
      : status === 'partial' ? plural(plan.timed, 'step has', 'steps have') + ' a time (' + times + '). ' + plural(plan.open - plan.timed, 'step still needs', 'steps still need') + ' one, ' + M.dur(plan.left) + ' in all.'
      : status === 'missed' ? 'Its time went by. Drag it to a new spot.' : 'No time yet. Drag the whole thing, or one step, onto the board.');
    if (plan.after) p.appendChild(el('p', 'side-line ask', 'That’s after it’s due (' + M.relText(t.due, today) + '). Move it earlier, or change when it’s due.'));
    const steps = el('div', 'steps');
    (t.steps || []).forEach((s) => {
      const r = el('div', 'step' + (s.done ? ' done' : ''));
      const tk = el('input', 'tick'); tk.type = 'checkbox'; tk.checked = !!s.done;
      tk.addEventListener('change', () => { Snd.init(); setDone(t, s.id, tk.checked); });
      const grip = el('div', 'grip');
      grip.style.setProperty('--bg', c.base);
      grip.appendChild(icon(t.icon || 'check', 9, c.ink));
      grip.title = 'Drag this step onto the board';
      grip.setAttribute('role', 'button'); grip.tabIndex = 0; grip.setAttribute('aria-label', 'Put ' + s.name + ' on the board');
      if (!s.done) { dragSource(grip, { kind: 'step', task: t.id, id: s.id }, () => openSel({ type: 'place', spec: { kind: 'step', task: t.id, id: s.id } })); grip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSel({ type: 'place', spec: { kind: 'step', task: t.id, id: s.id } }); } }); }
      const nm = el('input'); nm.type = 'text'; nm.value = s.name; nm.maxLength = 60;
      nm.setAttribute('aria-label', 'Step: ' + s.name);
      nm.dataset.fk = 'step-' + s.id; nm.dataset.v0 = nm.value;
      nm.addEventListener('change', () => { const v = nm.value.trim(); if (v) commit(() => { s.name = v; }); });
      nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') nm.blur(); e.stopPropagation(); });
      /* how long: shorter and longer, so one tap too many is one tap back */
      const LENS = [5, 10, 15, 20, 30, 45, 60, 90, 120], li = Math.max(0, LENS.indexOf(s.dur || 15));
      const len = el('span', 'step-len');
      const lenBtn = (ic, label, to) => { const b = stepBtn(ic, label + ', ' + s.name, () => commit(() => { s.dur = LENS[to]; })); b.className = 'mini-btn'; b.dataset.fk = 'len-' + ic + s.id; b.disabled = to < 0 || to >= LENS.length; return b; };
      len.append(lenBtn('minus', 'Shorter', li - 1), el('output', '', M.dur(s.dur || 15)), lenBtn('plus', 'Longer', li + 1));
      const placed = pl.find((x) => x.step === s.id);
      const del = stepBtn('x', 'Remove the step ' + s.name, () => { commit(() => {
        t.steps = t.steps.filter((x) => x.id !== s.id);
        Object.values(state.dates).forEach((dd) => { if (dd.adds) dd.adds = dd.adds.filter((a) => !(a.src && a.src.type === 'step' && a.src.id === s.id)); });
      }); toast(s.name + ' is off the list.', '', { label: 'Undo', fn: undo }); });
      del.className = 'mini-btn del';
      /* the name gets the whole row; when it's placed and how long it takes sit under it */
      const meta = el('div', 'step-meta');
      meta.appendChild(el('span', 'when' + (placed ? ' set' : ''), placed ? M.DAY_SHORT[M.weekday(placed.date)] + ' ' + M.clock(placed.add.start) : s.done ? 'Done' : 'No time yet'));
      meta.appendChild(len);
      r.append(tk, grip, nm, del, meta);
      steps.appendChild(r);
    });
    field(p, t.steps && t.steps.length ? 'Steps · drag one onto the board' : 'Steps', steps);
    const addStep = textInput('', (v) => { if (v) commit(() => { t.steps = t.steps || []; t.steps.push({ id: M.newId('s'), name: v, dur: 15, done: false }); }); }, 'Add a step and press Enter');
    p.appendChild(addStep);
    if (view.suggest && view.suggest.id === t.id) {
      const box = el('div', 'suggest');
      box.appendChild(el('div', 'lbl', 'Small steps to try'));
      view.suggest.steps.forEach((s, i) => {
        const r = el('div', 'list-row');
        r.append(el('span', 'grow', s.name), el('small', '', M.dur(s.dur)));
        r.appendChild(button('Add', 'small', () => { commit(() => { t.steps.push({ id: M.newId('s'), name: s.name, dur: s.dur, done: false }); }); view.suggest.steps.splice(i, 1); renderSide(); }));
        box.appendChild(r);
      });
      if (view.suggest.steps.length) box.appendChild(button('Add them all', 'small primary', () => { const list = view.suggest.steps; commit(() => { list.forEach((s) => t.steps.push({ id: M.newId('s'), name: s.name, dur: s.dur, done: false })); }); view.suggest = null; renderSide(); }));
      p.appendChild(box);
    }
    if (!t.steps || !t.steps.length) field(p, 'How long', stepper(t.dur || 30, M.dur, (v) => commit(() => { t.dur = Math.max(5, v); }), 15));
    field(p, 'Repeats', chips([{ id: null, name: 'No' }, { id: 'daily', name: 'Every day' }, { id: 'weekdays', name: 'Weekdays' }, { id: 'weekly', name: 'Every week' }, { id: 'biweekly', name: 'Every two weeks' }, { id: 'monthly', name: 'Every month' }, { id: 'yearly', name: 'Every year' }], t.repeat || null, (v) => commit(() => { t.repeat = v; })));
    field(p, 'Group', chips(state.groups.map((g) => ({ id: g.id, name: g.name, icon: g.icon })), t.group, (v) => commit(() => { t.group = v; })));
    actions(p, [
      t.done ? null : button('Put it on the board', 'small primary', () => openSel({ type: 'place', spec: { kind: 'task', id: t.id } })),
      t.done ? button('Not done yet', 'small', () => setDone(t, null, false)) : button('Done', 'small', () => setDone(t, null, true)),
      /* a repeating one that didn't happen this time: the next one still comes, nothing piles up */
      !t.done && t.repeat ? button('Skip this one', 'small', () => { let next = null; commit(() => { next = M.completeTask(state, t.id, today, true); }); Snd.slide(); toast(t.name + ' skipped.' + (next ? ' Next: ' + M.dateText(next.due) + '.' : ''), '', { label: 'Undo', fn: undo }); }) : null,
      !view.suggest || view.suggest.id !== t.id ? button('Break it down', 'small', () => { view.suggest = { id: t.id, steps: suggested(t.name).filter((s) => !(t.steps || []).some((x) => x.name.toLowerCase() === s.name.toLowerCase())) }; renderSide(); }) : null,
      confirmButton('Delete', 'del-task-' + t.id, () => { commit(() => { state.tasks = state.tasks.filter((x) => x.id !== t.id); Object.values(state.dates).forEach((dd) => { if (dd.adds) dd.adds = dd.adds.filter((a) => !(a.src && ((a.src.type === 'task' && a.src.id === t.id) || (a.src.type === 'step' && a.src.task === t.id)))); }); }); closeSel(); })
    ]);
    pl.filter((x) => x.date >= M.addDays(today, -7)).forEach((x) => {
      const r = el('div', 'list-row');
      r.append(el('span', 'grow', (x.step ? (t.steps.find((s) => s.id === x.step) || {}).name || 'Step' : 'The whole thing')), el('small', '', M.dateText(x.date, 'day') + ' at ' + M.clock(x.add.start)));
      r.appendChild(button('Show', 'small quiet', () => { view.focus = x.date; setZoom('week', x.date); openSel({ type: 'block', date: x.date, key: 'add:' + x.add.id }); }));
      p.appendChild(r);
    });
  }

  /* A recipe's web address: the link, and a name read from the last part of its path
     (/recipes/lemon-garlic-chicken/ is Lemon garlic chicken). Anything else isn't a link. */
  function recipeFromLink(text) {
    const v = (text || '').trim();
    if (!/^https?:\/\/\S+$/i.test(v)) return null;
    let u;
    try { u = new URL(v); } catch (e) { return null; }
    const part = u.pathname.split('/').filter(Boolean).map((x) => decodeURIComponent(x)).filter((x) => !/^(recipes?|r|p|\d+|index\.html?)$/i.test(x)).pop() || '';
    const words = part.replace(/\.[a-z]+$/i, '').replace(/[-_+]+/g, ' ').replace(/\b\d{3,}\b/g, '').replace(/\s+/g, ' ').trim();
    const name = words ? words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() : u.hostname.replace(/^www\./, '');
    return { name: name.slice(0, 60), link: u.href };
  }
  /* Dinner on one date. One question first (how is it happening?), then only what that answer needs. */
  function dinnerPanel(p, date) {
    const d = day(date), wd = M.DAY_LONG[M.weekday(date)], past = date < today;
    const dn = state.dinners[date] || { name: '', cook: '', items: [] };
    const blk = d.blocks.find((b) => b.dinner);
    kicker(p, 'Dinner · ' + M.dateText(date, 'day'), 'pot');
    if (blk) preview(p, decorateDay(blk, date));
    else { title(p, dn.name || 'Dinner'); line(p, 'No dinner at home that day.'); }
    const set = (patch) => { const r = commit(() => { state.dinners[date] = Object.assign({ name: '', cook: '', items: [] }, state.dinners[date], patch); }); if (patch.name || patch.cook) noteMove('dinner'); return r; };
    const how = cooking(dn.cook) ? 'home' : dn.cook || '';
    field(p, past ? 'How did dinner happen?' : 'How’s dinner happening?', chips(D.DINNER_HOW, how, (v) => {
      if (v === 'home') set({ cook: cooking(dn.cook) ? dn.cook : 'home' });
      else set({ cook: v, name: '', recipe: null, items: [] });
      Snd.clack(0.5);
    }));
    if (how === 'home') {
      const who = field(p, past ? 'Who cooked?' : 'Who’s cooking?', chips([{ id: 'me', name: 'You' }].concat(partner() ? [{ id: 'kim', name: partner() }] : []), dn.cook, (v) => set({ cook: v })));
      /* a dish is picked and nobody's cooking it yet: that's the one question left, so it says so */
      if (dn.cook === 'home' && dn.name && !past) who.classList.add('ask');
      /* a recipe's web address pasted here keeps the link and names the dinner from it */
      const what = textInput(dn.name, (v) => { const r = recipeFromLink(v); set(r ? { name: r.name, link: r.link, recipe: null } : { name: v, recipe: null, link: dn.link && v === dn.name ? dn.link : null }); }, 'Tacos, or paste a recipe link', 200);
      what.classList.add('big');
      field(p, 'What’s for dinner?', what);
      if (dn.link) {
        const a = el('a', 'link-out', 'Open the recipe');
        a.href = dn.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
        p.appendChild(a);
      }
      /* what you've cooked the last four weeks, newest first, one tap each */
      const recent = [];
      for (let k = 1; k <= 28 && recent.length < 4; k++) {
        const x = state.dinners[M.addDays(date, -k)];
        if (x && x.name && cooking(x.cook) && x.name !== dn.name && !recent.some((r) => r.name.toLowerCase() === x.name.toLowerCase())) recent.push(x);
      }
      if (recent.length) field(p, 'Recently', chips(recent.map((r, i) => ({ id: 'r' + i, name: r.name })), null, (id) => {
        const r = recent[+id.slice(1)], rec = r.recipe && state.recipes.find((x) => x.id === r.recipe);
        set({ name: r.name, recipe: rec ? rec.id : null, items: (rec ? rec.items : r.items || []).slice() });
      }));
      field(p, 'Your recipes', chips(state.recipes.map((r) => ({ id: r.id, name: r.name })), dn.recipe, (id) => { const r = state.recipes.find((x) => x.id === id); set({ name: r.name, recipe: r.id, items: r.items.slice(), link: r.link || null }); }));
      /* the pantry opens on request, or when this dinner is already built from it */
      const pantryOpen = view.got.pantry === date || ((dn.items || []).length && !dn.recipe);
      if (pantryOpen) {
        D.PANTRY_KINDS.forEach((k) => {
          field(p, k.name, chips(state.pantry.filter((x) => x.kind === k.id).map((x) => ({ id: x.id, name: x.name })), dn.items || [], (id) => {
            const items = (dn.items || []).includes(id) ? dn.items.filter((x) => x !== id) : (dn.items || []).concat(id);
            const auto = !dn.name || dn.name === M.dinnerFromItems(state, dn.items || []);
            set({ items, name: auto ? M.dinnerFromItems(state, items) : dn.name, recipe: null });
          }));
        });
        const addRow = el('div', 'row2');
        const kindSel = el('select', 'input');
        D.PANTRY_KINDS.forEach((k) => { const o = el('option', '', k.name.slice(0, -1)); o.value = k.id; kindSel.appendChild(o); });
        kindSel.addEventListener('keydown', (e) => e.stopPropagation());
        const newItem = textInput('', (v) => {
          if (!v) return;
          const id = M.newId('p');
          commit(() => {
            state.pantry.push({ id, name: v, kind: kindSel.value });
            const cur = state.dinners[date] || { name: '', cook: 'home', items: [] };
            const items = (cur.items || []).concat(id);
            const auto = !cur.name || cur.name === M.dinnerFromItems(state, cur.items || []);
            state.dinners[date] = Object.assign({ name: '', cook: 'home' }, cur, { items, name: auto ? M.dinnerFromItems(state, items) : cur.name, recipe: null });
          });
          toast(v + ' is in the pantry', 'good');
        }, 'Ground chicken, kale', 40);
        addRow.append(newItem, kindSel);
        field(p, 'Add to the pantry', addRow);
      } else p.appendChild(button('Build it from the pantry', 'small quiet lead', () => { view.got.pantry = date; renderSide(); }));
      const canSave = dn.name && ((dn.items || []).length || dn.link) && !state.recipes.some((r) => r.name.toLowerCase() === dn.name.toLowerCase());
      if (canSave) actions(p, [button('Save as a recipe', 'small', () => { commit(() => { const id = M.newId('r'); state.recipes.push(Object.assign({ id, name: dn.name, items: (dn.items || []).slice(), dur: 30 }, dn.link ? { link: dn.link } : {})); state.dinners[date].recipe = id; }); toast(dn.name + ' is in your recipes', 'good'); })]);
    } else if (how === 'order') {
      /* the places you ordered from these last eight weeks come first, then a couple of common ones */
      const places = [];
      for (let k = 1; k <= 56 && places.length < 4; k++) { const x = state.dinners[M.addDays(date, -k)]; if (x && x.cook === 'order' && x.name && !places.some((n) => n.toLowerCase() === x.name.toLowerCase())) places.push(x.name); }
      D.ORDER_FROM.forEach((x) => { if (places.length < 5 && !places.some((n) => n.toLowerCase() === x.toLowerCase())) places.push(x); });
      const other = dn.name && !places.includes(dn.name) ? dn.name : '';
      field(p, 'From where?', chips(places.map((x) => ({ id: x, name: x })), dn.name, (v) => set({ name: v })));
      field(p, 'Somewhere else', textInput(other, (v) => set({ name: v }), 'The noodle place', 40));
    } else if (how === 'out') {
      const where = textInput(dn.name, (v) => set({ name: v }), 'The place by the river', 50);
      where.classList.add('big');
      field(p, 'Where?', where);
    }
    if (dn.name || dn.cook) actions(p, [button('Clear ' + wd + '’s dinner', 'small quiet', () => { commit(() => { delete state.dinners[date]; }); })]);
    divider(p);
    const wkDates = M.weekDates(date);
    p.appendChild(cta('Grocery list for the week', grocerySub(wkDates), 'cart', () => openSel({ type: 'groceries' })));
    if ((how === 'home' || !how) && /^https?:\/\//i.test(who().cookbook || '')) {
      const link = el('a', 'link', named('Ideas from {partner}’s cookbook'));
      link.href = who().cookbook;
      link.target = '_blank'; link.rel = 'noopener';
      p.appendChild(link);
    }
  }

  /* tapping an empty spot on the board */
  function slotPanel(p, date, start) {
    const d = boardDay(date), h = M.visibleHours(state);
    const s = M.clamp(start, h.start, h.end - 15), at = M.dateTime(date, s);
    kicker(p, M.dateText(at.date, 'day'), 'plus');
    title(p, 'Add at ' + M.clock(at.start));
    line(p, 'Pick a block. It slides things over to make room.');
    const place = (add) => {
      const r = commit(() => M.placeAdd(state, date, add, s));
      if (r && r.ok) { Snd.clack(add.dur / 60); W.squash(date, 'add:' + r.add.id); closeSel(); } else { Snd.bad(); toast(blockedText(r || {}), 'bad'); }
    };
    /* the blocks in the groups they have on the desk, so twenty names scan as five short rows */
    const groups = el('div', 'lib-groups');
    libGroups(library()).forEach((g) => {
      groups.appendChild(el('div', 'lib-g', g.name));
      const row = chips(g.list.map((x) => ({ id: x.id, name: x.name, color: cat(x.cat).base })), null, (id) => { const x = state.palette.find((q) => q.id === id); place({ name: x.name, cat: x.cat, icon: x.icon, dur: x.dur, src: { type: 'block', id: x.id } }); });
      row.setAttribute('role', 'group'); row.setAttribute('aria-label', g.name);
      groups.appendChild(row);
    });
    field(p, 'Blocks', groups);
    const soon = M.dueSoon(state, today, 21, nowMin);
    if (soon.length) field(p, 'Due soon', chips(soon.map((x) => ({ id: x.task.id, name: x.task.name, color: cat(x.task.cat).base })), null, (id) => place(specAdd({ kind: 'task', id }))));
    const f = { name: '', dur: 30, cat: 'yours' };
    const nm = textInput('', (v) => { f.name = v; }, 'Something else');
    field(p, 'Or name it', nm);
    field(p, 'Length', liveStepper(() => f.dur, (v) => { f.dur = M.clamp(v, 15, h.end - s); }, M.dur));
    field(p, 'Kind of time', catChips(f.cat, (v) => { f.cat = v; }));
    /* a one off can become a block to drag again, in the same tap */
    p.appendChild(toggle('Keep it in Block library', !!view.got.slotKeep, (v) => { view.got.slotKeep = v; }));
    actions(p, [button('Add it', 'small primary', () => {
      const v = nm.value.trim();
      if (!v) { toast('Give it a name first'); nm.focus(); return; }
      if (view.got.slotKeep) {
        /* one change, so one Undo takes back both the block and its place on the day */
        const id = M.newId('b'), add = { name: v, cat: f.cat, icon: 'star', dur: f.dur, src: { type: 'block', id } };
        const r = commit(() => { state.palette.push({ id, name: v, cat: f.cat, dur: f.dur, icon: 'star' }); const pr = M.placeAdd(state, date, add, s); if (!pr || !pr.ok) state.palette.pop(); return pr; });
        if (r && r.ok) { Snd.clack(add.dur / 60); W.squash(date, 'add:' + r.add.id); closeSel(); toast(v + ' is in Block library too', 'good'); } else { Snd.bad(); toast(blockedText(r || {}), 'bad'); }
      } else place({ name: v, cat: f.cat, icon: 'star', dur: f.dur, src: { type: 'custom' } });
    })]);
  }

  /* one date: wake, bed, and the week's shape */
  function dayPanel(p, date) {
    const d = day(date), wd = M.weekday(date), tpl = M.templateFor(state, date);
    kicker(p, 'Your day', 'sun');
    title(p, M.dateText(date, 'long'));
    line(p, 'Up at ' + M.clock(d.wake) + ', bed at ' + M.clock(d.bed) + '. You can also drag the edges of Sleep on the board.');
    const row = el('div', 'row2');
    field(row, 'Up at', stepper(d.wake, M.clock, (v) => commit(() => { M.setWake(state, date, v); })));
    field(row, 'Bed at', stepper(d.bed, M.clock, (v) => commit(() => { M.setBed(state, date, v); })));
    p.appendChild(row);
    const dd = state.dates[date] || {};
    actions(p, [
      dd.wake != null || dd.bed != null ? button('Make these the usual for ' + M.DAY_LONG[wd] + 's', 'small primary', () => { commit(() => { if (dd.wake != null) tpl.wake = dd.wake; if (dd.bed != null) tpl.bed = dd.bed; delete dd.wake; delete dd.bed; }); toast('Now the usual for ' + M.DAY_LONG[wd] + 's', 'good'); }) : null,
      button('Add a date', 'small', () => openSel({ type: 'newEvent', date }))
    ]);
    /* a day that another kind of week changes offers the week's kind, read the way the board reads it */
    if (Object.values(state.rhythm.shapes || {}).some((sh) => sh.days && sh.days[wd])) {
      const ws = M.weekStart(date);
      field(p, 'This week', chips(shapeChoices(), M.shapeOf(state, date), (v) => commit(() => { state.weeks[ws] = state.weeks[ws] || {}; state.weeks[ws].shape = v; })));
    }
    d.markers.forEach((m) => { const r = el('div', 'list-row'); r.append(icon(m.icon || 'star', 9, UI.gold), el('span', 'grow', m.name)); r.appendChild(button('Edit', 'small quiet', () => openSel({ type: 'event', id: m.id }))); p.appendChild(r); });
  }

  /* weekly meetings */
  function meetingsPanel(p) {
    kicker(p, 'Work', 'people');
    title(p, 'Weekly meetings');
    line(p, 'Type each one in once. They show up inside Work every week, and skip trips and holidays.');
    state.meetings.forEach((m) => {
      const r = el('div', 'list-row');
      const t = el('div', 'grow');
      t.appendChild(document.createTextNode(m.name));
      t.appendChild(el('small', '', m.days.map((x) => M.DAY_SHORT[x]).join(', ') + ' · ' + M.span(m.start, m.start + m.dur)));
      r.appendChild(t);
      r.appendChild(button('Edit', 'small quiet', () => openSel({ type: 'meeting', id: m.id })));
      p.appendChild(r);
    });
    actions(p, [button('Add a meeting', 'small primary', () => { const id = M.newId('m'); commit(() => { state.meetings.push({ id, name: 'Standup', days: [1, 2, 3, 4, 5], start: 9 * 60 + 30, dur: 30 }); }); openSel({ type: 'meeting', id }); })]);
  }
  function meetingPanel(p, id) {
    const m = state.meetings.find((x) => x.id === id);
    if (!m) return false;
    kicker(p, 'Weekly meeting', 'people');
    title(p, m.name);
    field(p, 'Name', textInput(m.name, (v) => { if (v) commit(() => { m.name = v; }); }, 'Design critique'));
    field(p, 'Days', chips([1, 2, 3, 4, 5, 0, 6].map((x) => ({ id: x, name: M.DAY_SHORT[x] })), m.days, (v) => commit(() => { m.days = m.days.includes(v) ? m.days.filter((x) => x !== v) : m.days.concat(v).sort(); })));
    const row = el('div', 'row2');
    field(row, 'Starts', stepper(m.start, M.clock, (v) => commit(() => { m.start = M.clamp(v, M.RAIL0, M.RAIL1 - m.dur); })));
    field(row, 'Length', stepper(m.dur, M.dur, (v) => commit(() => { m.dur = Math.max(15, v); })));
    p.appendChild(row);
    actions(p, [button('All meetings', 'small', () => openSel({ type: 'meetings' })), confirmButton('Delete', 'del-m-' + m.id, () => { commit(() => { state.meetings = state.meetings.filter((x) => x.id !== m.id); }); openSel({ type: 'meetings' }); })]);
  }

  /* dates: birthdays, trips, and things at a set time */
  function eventPanel(p, id) {
    const e = state.events.find((x) => x.id === id);
    if (!e) return false;
    const set = (patch) => commit(() => { Object.assign(e, patch); });
    kicker(p, e.kind === 'trip' ? 'Trip' : e.kind === 'marker' ? 'A day to remember' : 'At a set time', e.icon || 'star');
    title(p, e.name);
    field(p, 'Name', textInput(e.name, (v) => { if (v) set({ name: v }); }));
    if (e.kind === 'trip') {
      const row = el('div', 'row2');
      field(row, 'Leave', dateInput(e.date, (v) => set({ date: v, end: e.end < v ? v : e.end })));
      field(row, 'Back', dateInput(e.end, (v) => set({ end: v < e.date ? e.date : v })));
      p.appendChild(row);
      const row2 = el('div', 'row2');
      field(row2, 'Out the door', stepper(e.leave || 450, M.clock, (v) => set({ leave: M.clamp(v, 300, 1200) })));
      field(row2, 'Flight home', stepper(e.back || 1020, M.clock, (v) => set({ back: M.clamp(v, 360, 1260) })));
      p.appendChild(row2);
      line(p, 'Trip days swap your routine for travel. Work and meetings step aside.');
    } else if (e.kind === 'marker') {
      field(p, 'Date', dateInput(e.date, (v) => set({ date: v })));
      field(p, 'Every year', chips([{ id: true, name: 'Yes' }, { id: false, name: 'No' }], !!e.yearly, (v) => set({ yearly: v })));
      field(p, 'Mark', chips(['cake', 'gift', 'tree', 'heart', 'star', 'church'].map((x) => ({ id: x, name: '', icon: x })), e.icon, (v) => set({ icon: v })));
    } else {
      field(p, 'Date', dateInput(e.date, (v) => set({ date: v })));
      const row = el('div', 'row2');
      field(row, 'Starts', stepper(e.start, M.clock, (v) => set({ start: M.clamp(v, 300, 1425) })));
      field(row, 'Length', stepper(e.dur, M.dur, (v) => set({ dur: Math.max(15, v) })));
      p.appendChild(row);
      field(p, 'Kind of time', catChips(e.cat || 'family', (v) => set({ cat: v })));
      field(p, 'Show on the month', chips([{ id: true, name: 'Yes' }, { id: false, name: 'No' }], !!e.big, (v) => set({ big: v })));
    }
    actions(p, [confirmButton('Delete', 'del-e-' + e.id, () => { commit(() => { state.events = state.events.filter((x) => x.id !== e.id); }); closeSel(); })]);
  }
  function newEventPanel(p, sel) {
    if (!view.got.ev || view.got.ev.from !== (sel.date || today)) view.got.ev = { from: sel.date || today, kind: 'marker', name: '', date: sel.date || today, end: sel.date || today, start: 18 * 60, dur: 60 };
    const f = view.got.ev;
    kicker(p, 'New date', 'calendar');
    title(p, 'Add a date');
    field(p, 'What kind', chips([{ id: 'marker', name: 'A day to remember' }, { id: 'trip', name: 'A trip' }, { id: 'timed', name: 'At a set time' }], f.kind, (v) => { f.kind = v; renderSide(); }));
    const nm = textInput(f.name, (v) => { f.name = v; }, f.kind === 'trip' ? 'Seattle' : f.kind === 'marker' ? 'Mom’s birthday' : 'Dentist');
    field(p, 'Name', nm);
    if (f.kind === 'trip') {
      const row = el('div', 'row2');
      field(row, 'Leave', dateInput(f.date, (v) => { f.date = v; if (f.end < v) f.end = v; renderSide(); }));
      field(row, 'Back', dateInput(f.end, (v) => { f.end = v; }));
      p.appendChild(row);
    } else field(p, 'Date', dateInput(f.date, (v) => { f.date = v; }));
    if (f.kind === 'timed') {
      const row = el('div', 'row2');
      field(row, 'Starts', stepper(f.start, M.clock, (v) => { f.start = M.clamp(v, 300, 1425); renderSide(); }));
      field(row, 'Length', stepper(f.dur, M.dur, (v) => { f.dur = Math.max(15, v); renderSide(); }));
      p.appendChild(row);
    }
    actions(p, [button('Add it', 'small primary', () => {
      const name = nm.value.trim();
      if (!name) { toast('Give it a name first'); nm.focus(); return; }
      const id = M.newId('e');
      const ev = f.kind === 'trip' ? { id, kind: 'trip', name, icon: 'plane', date: f.date, end: f.end < f.date ? f.date : f.end, leave: 450, back: 1020 }
        : f.kind === 'marker' ? { id, kind: 'marker', name, icon: /birthday/i.test(name) ? 'cake' : 'star', date: f.date, yearly: /birthday|anniversary/i.test(name) }
        : { id, kind: 'timed', name, icon: 'star', cat: 'family', date: f.date, start: f.start, dur: f.dur, big: true };
      commit(() => { state.events.push(ev); });
      view.got.ev = null;
      Snd.good();
      toast(name + ' is on ' + M.dateText(ev.date), 'good');
      openSel({ type: 'event', id });
    })]);
  }

  /* The week's grocery list. What's in the cart is saved on the board (state.shopping, by week), so it
     carries to the phone, to whoever else is shopping, and through a reload. The actions sit at the
     top, where a long list never hides them. */
  function groceriesPanel(p) {
    const dates = view.reset ? M.range(view.reset.week, 7) : weekOf();
    const ws = dates[0], prog = M.groceryProgress(state, dates), list = prog.list, n = prog.got;
    const got = (state.shopping && state.shopping[ws]) || {};
    kicker(p, 'Groceries · ' + M.spanText(dates[0], dates[6]), 'list');
    title(p, groceryWords(prog));
    line(p, list.length ? 'From the dinners you’re cooking this week. Checks save, so they’re on your phone too.' : 'Pick dinners you’re cooking and the list fills in here.');
    const setGot = (id, on) => commit(() => {
      state.shopping = state.shopping || {};
      const wk = Object.assign({}, state.shopping[ws]);
      if (on) wk[id] = 1; else delete wk[id];
      if (Object.keys(wk).length) state.shopping[ws] = wk; else delete state.shopping[ws];
    });
    if (list.length) {
      const text = list.filter((x) => !got[x.id]).map((x) => x.name).join('\n') || list.map((x) => x.name).join('\n');
      const plain = el('textarea', 'input');
      plain.readOnly = true; plain.value = text; plain.rows = Math.min(8, list.length); plain.hidden = true;
      plain.setAttribute('aria-label', 'Grocery list');
      const fallback = () => { plain.hidden = false; plain.focus(); plain.select(); toast('Select the list and copy it'); };
      /* a phone sends it to Notes, a message, or whoever's going to the store */
      const share = typeof navigator.share === 'function' ? button(n ? 'Send what’s left' : 'Send the list', 'small primary', async () => { try { await navigator.share({ title: 'Groceries', text }); } catch (e) { /* closed, or not allowed here */ } }) : null;
      actions(p, [share, button(n ? 'Copy what’s left' : 'Copy the list', share ? 'small' : 'small primary', () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Copied', 'good'), fallback);
          else fallback();
        } catch (e) { fallback(); }
      }), n ? button('Clear the checks', 'small quiet', () => commit(() => { delete state.shopping[ws]; })) : null]);
      p.appendChild(plain);
    }
    D.PANTRY_KINDS.forEach((k) => {
      const items = list.filter((x) => x.kind === k.id);
      if (!items.length) return;
      const box = el('div', 'list');
      items.forEach((x) => {
        const r = el('label', 'list-row' + (got[x.id] ? ' got' : ''));
        const tk = el('input', 'tick'); tk.type = 'checkbox'; tk.checked = !!got[x.id];
        tk.dataset.fk = 'g' + x.id;
        tk.addEventListener('change', () => { Snd.init(); Snd.pick(); setGot(x.id, tk.checked); });
        const t = el('span', 'grow', x.name);
        t.appendChild(el('small', '', x.days.map((d) => M.DAY_SHORT[M.weekday(d)]).join(', ')));
        r.append(tk, t);
        box.appendChild(r);
      });
      field(p, k.name, box);
    });
  }

  function newTaskPanel(p, group) {
    const f = { name: '', group: group && group !== 'soon' ? group : inboxId(), due: '' };
    kicker(p, 'New to do', 'plus');
    title(p, 'What needs doing?');
    const nm = textInput('', (v) => { f.name = v; }, 'Fill out Mom’s card', 80);
    field(p, 'To do', nm);
    field(p, 'Due', dateInput('', (v) => { f.due = v; }));
    field(p, 'Group', chips(state.groups.map((g) => ({ id: g.id, name: g.name, icon: g.icon })), f.group, (v) => { f.group = v; }));
    actions(p, [button('Add it', 'small primary', () => {
      const name = nm.value.trim();
      if (!name) { toast('Give it a name first'); nm.focus(); return; }
      const g = state.groups.find((x) => x.id === f.group);
      const id = M.newId('t');
      commit(() => { state.tasks.push({ id, name, group: f.group, icon: g ? g.icon : 'check', cat: 'yours', dur: null, due: f.due || null, repeat: null, done: false, steps: [] }); });
      Snd.good();
      noteMove('todo');
      view.suggest = { id, steps: suggested(name) };
      view.sel = { type: 'task', id };
      renderRack(); renderSide(); layoutInsets();
    })]);
    setTimeout(() => nm.focus(), 30);
  }
  function newGroupPanel(p) {
    kicker(p, 'New group', 'plus');
    title(p, 'A new group of to dos');
    let ic = 'star';
    const nm = textInput('', () => {}, 'Creative projects');
    field(p, 'Name', nm);
    field(p, 'Mark', chips(['star', 'brush', 'house', 'gift', 'heart', 'laptop', 'car', 'receipt', 'book', 'note'].map((x) => ({ id: x, name: '', icon: x })), ic, (v) => { ic = v; }));
    actions(p, [button('Add it', 'small primary', () => {
      const name = nm.value.trim();
      if (!name) { toast('Give it a name first'); nm.focus(); return; }
      const id = M.newId('g');
      commit(() => { state.groups.push({ id, name, icon: ic }); });
      view.tab = 'todo'; view.level = id;
      closeSel();
    })]);
    setTimeout(() => nm.focus(), 30);
  }
  function newBlockPanel(p) {
    kicker(p, 'New block', 'plus');
    const nm = blockForm(p, null, (f) => {
      commit(() => { state.palette.push({ id: M.newId('b'), name: f.name, cat: f.cat, dur: f.dur, icon: f.icon }); });
      if (view.zoom !== 'day') view.tab = 'blocks';
      closeSel();
      toast(f.name + ' is in Block library', 'good');
    });
    setTimeout(() => nm.focus(), 30);
  }
  /* The fields of a block in Block library, new or being changed: a preview of it as it'll look, its
     name, length, kind of time, and mark. Returns the name box. */
  const BLOCK_MARKS = ['star', 'dumbbell', 'runner', 'shoe', 'brush', 'book', 'note', 'laptop', 'house', 'heart', 'cart', 'handset', 'cup', 'pot', 'fork', 'moon', 'sun', 'people', 'car', 'tree', 'gamepad', 'film', 'phone', 'broom'];
  function blockForm(parent, b, onSave, onCancel) {
    const f = { name: b ? b.name : '', cat: b ? b.cat : 'yours', dur: b ? b.dur : 60, icon: b ? b.icon || 'star' : 'star' };
    const slot = el('div');
    parent.appendChild(slot);
    const draw = () => { slot.replaceChildren(); preview(slot, { label: f.name, cat: f.cat, icon: f.icon }, { time: M.dur(f.dur), placeholder: 'Your block' }); };
    draw();
    const nm = textInput(f.name, (v) => { f.name = v; draw(); }, 'Guitar practice', 24);
    nm.addEventListener('input', () => { f.name = nm.value.trim(); draw(); });
    field(parent, 'Name', nm);
    field(parent, 'Length', liveStepper(() => f.dur, (v) => { f.dur = M.clamp(v, 15, 360); draw(); }, M.dur));
    field(parent, 'Kind of time', catChips(f.cat, (v) => { f.cat = v; draw(); }));
    field(parent, 'Mark', chips(BLOCK_MARKS.map((x) => ({ id: x, name: '', icon: x })), f.icon, (v) => { f.icon = v; draw(); }));
    actions(parent, [onCancel ? button('Cancel', 'small quiet', onCancel) : null, button(b ? 'Save' : 'Add to Block library', 'small primary', () => {
      const name = nm.value.trim();
      if (!name) { toast('Give it a name first'); nm.focus(); return; }
      onSave(Object.assign(f, { name }));
    })]);
    return nm;
  }
  /* a block in Settings, Block library: its color and mark, name, length, and what can be done to it */
  function libRow(b, hidden) {
    const row = el('div', 'list-row lib-row');
    const lk = W.look(b), sw = el('span', 'lib-sw');
    sw.style.background = lk.base;
    sw.appendChild(icon(b.icon || 'star', 8, lk.ink));
    const t = el('span', 'grow', b.name);
    t.appendChild(el('small', '', M.dur(b.dur) + ', ' + cat(b.cat).name));
    row.append(sw, t);
    if (hidden) {
      const back = button('Show again', 'small', () => { commit(() => { delete state.palette.find((x) => x.id === b.id).hidden; }); say(b.name + ' is back in Block library'); renderDrawer(); });
      back.setAttribute('aria-label', 'Show ' + b.name + ' again'); back.dataset.fk = 'lib-back-' + b.id;
      row.appendChild(back);
      /* a block someone made can go for good; the ones that came with the app stay, hidden */
      if (!D.PALETTE_IDS.includes(b.id)) row.appendChild(confirmButton('Remove', 'lib-rm-' + b.id, () => { commit(() => { state.palette = state.palette.filter((x) => x.id !== b.id); }); say(b.name + ' is gone'); renderDrawer(); }));
    } else {
      const ed = button('Change', 'small', () => { view.got.libEdit = b.id; renderDrawer(); });
      ed.setAttribute('aria-label', 'Change ' + b.name); ed.dataset.fk = 'lib-ed-' + b.id;
      const hd = button('Hide', 'small quiet', () => { commit(() => { state.palette.find((x) => x.id === b.id).hidden = true; }); say(b.name + ' is hidden'); renderDrawer(); });
      hd.setAttribute('aria-label', 'Hide ' + b.name); hd.dataset.fk = 'lib-hd-' + b.id;
      row.append(ed, hd);
    }
    return row;
  }
  function newIdeaPanel(p, kind) {
    const f = { kind: kind || 'play', dur: 45 };
    kicker(p, usName(), 'heart');
    title(p, 'A new idea for the two of you');
    const nm = textInput('', () => {}, 'Plan a weekend away', 40);
    field(p, 'Idea', nm);
    field(p, 'Kind', chips(D.IDEA_KINDS.map((k) => ({ id: k.id, name: k.name, icon: k.icon })), f.kind, (v) => { f.kind = v; }));
    actions(p, [button('Add it', 'small primary', () => {
      const name = nm.value.trim();
      if (!name) { toast('Give it a name first'); nm.focus(); return; }
      const k = D.IDEA_KINDS.find((x) => x.id === f.kind);
      commit(() => { state.ideas.push({ id: M.newId('i'), name, kind: f.kind, dur: f.dur, icon: k ? k.icon : 'heart' }); });
      view.tab = 'kim'; view.level = f.kind;
      closeSel();
    })]);
    setTimeout(() => nm.focus(), 30);
  }

  /* Put a block somewhere without dragging. The block itself leads, drawn as it will sit on the desk.
     Under it: the week as seven cells, a strip of the picked day you can tap or drag along, and one
     button that says exactly what it will do. The board shows the landing spot the whole time. */
  let placeNow = null;
  function weekCells(dates, current, isOpen, onPick, why) {
    const box = el('div', 'weekpick');
    box.setAttribute('role', 'group');
    dates.forEach((x) => {
      const open = isOpen(x);
      const b = el('button', 'wkcell' + (x === today ? ' today' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'dw', M.DAY_SHORT[M.weekday(x)]));
      b.appendChild(el('span', 'dn', String(M.parts(x).d)));
      b.setAttribute('aria-pressed', String(x === current));
      b.setAttribute('aria-label', M.dateText(x, 'long') + (open ? '' : ', ' + why));
      if (!open) { b.disabled = true; b.title = why; }
      b.addEventListener('click', () => { Snd.init(); Snd.pick(); onPick(x); });
      box.appendChild(b);
    });
    return box;
  }
  function placePanel(p, sel) {
    const spec = sel.spec;
    const wk = weekOf();
    if (sel.date && sel.start != null && !sel.windowTime) {
      const at = boardTime(sel.date, sel.start);
      sel.date = at.date; sel.start = at.start; sel.startFor = at.date; sel.windowTime = true;
    }
    if (isFood(spec)) {
      const item = spec.kind === 'recipe' ? state.recipes.find((x) => x.id === spec.id) : state.pantry.find((x) => x.id === spec.id);
      if (!item) return false;
      kicker(p, 'Add to a dinner');
      preview(p, { label: item.name, cat: 'meals', icon: 'pot' }, { time: spec.kind === 'recipe' ? 'Recipe' : 'From the pantry', heading: true, hero: true });
      const has = (x) => day(x).blocks.some((b) => b.dinner);
      field(p, 'Which night?', weekCells(wk, null, has, (x) => { setDinnerFrom(x, spec); closeSel(); }, 'no dinner at home'));
      const planned = wk.filter((x) => has(x) && state.dinners[x] && (state.dinners[x].name || state.dinners[x].cook));
      if (planned.length) line(p, planned.map((x) => M.DAY_SHORT[M.weekday(x)] + ' has ' + (state.dinners[x].name || cookName(state.dinners[x].cook))).join('. ') + '.');
      return;
    }
    const base = specAdd(spec);
    if (!base) return false;
    const dueOf = spec.kind === 'task' ? taskById(spec.id) : spec.kind === 'step' ? taskById(spec.task) : null;
    if (sel.dur == null) sel.dur = M.gridDur(base.dur);
    const add = Object.assign({}, base, { dur: sel.dur });
    if (!sel.date || !wk.includes(sel.date)) {
      sel.date = view.zoom === 'day' && wk.includes(view.focus) ? view.focus : wk.includes(today) ? today : wk[0];
      /* never offer a time that's already gone: late in the day, the first day ahead with room leads */
      const fitsAhead = (x) => M.firstFit(state, x, M.gridDur(sel.dur), x === today ? Math.ceil((nowMin + 10) / 15) * 15 : Math.max(day(x).wake, 9 * 60)) != null;
      if (sel.date <= today && !fitsAhead(sel.date)) { const next = wk.find((x) => x > today && fitsAhead(x)); if (next) sel.date = next; }
    }
    const date = sel.date, d = boardDay(date), wd = M.DAY_LONG[M.weekday(date)], h = M.visibleHours(state), now = boardTime(today, nowMin);
    const soonest = date === now.date ? Math.ceil((now.start + 10) / 15) * 15 : 0;
    const after = Math.max(d.wake, soonest, spec.kind === 'idea' ? 20 * 60 + 30 : date === today ? 0 : 9 * 60);
    if (sel.start == null || sel.startFor !== date || sel.durFor !== sel.dur) {
      if (sel.start == null || sel.startFor !== date || !canPlaceWindow(date, sel.dur, sel.start).ok) {
        const f = M.firstFit(state, date, sel.dur, after);
        sel.start = f == null ? M.firstFit(state, date, sel.dur, date === today ? soonest : d.wake) : f;
      }
      sel.startFor = date; sel.durFor = sel.dur;
    }
    kicker(p, spec.kind === 'task' ? 'Add a to do' : spec.kind === 'step' ? 'Add a step' : spec.kind === 'idea' ? (partner() ? 'Add something for you and ' + partner() : 'Add something to do together') : 'Add a block');
    const hero = preview(p, { label: add.name, cat: add.cat, icon: add.icon }, { time: '', heading: true, hero: true });
    const heroTime = hero.querySelector('.bprev-time');
    const roomy = (x) => M.firstFit(state, x, sel.dur, x === today ? Math.max(day(x).wake, Math.ceil((nowMin + 10) / 15) * 15) : day(x).wake) != null;
    field(p, 'Day', weekCells(wk, date, roomy, (x) => { if (x === sel.date) return; sel.date = x; sel.start = null; renderSide(); }, 'no room for ' + M.dur(sel.dur)));

    /* the strip: the picked day from waking to bed, with the new block drawn in where it would go */
    const span0 = h.start, span1 = h.end, total = Math.max(60, span1 - span0);
    const strip = el('div', 'daystrip');
    const track = el('div', 'ds-track');
    track.tabIndex = 0;
    track.setAttribute('role', 'slider');
    track.setAttribute('aria-label', 'Start time on ' + wd);
    const ticks = el('div', 'ds-ticks');
    for (let h = Math.ceil(span0 / 60); h * 60 <= span1; h++) {
      if (h % 3) continue;
      const pct = ((h * 60 - span0) / total) * 100;
      const tickAt = M.dateTime(date, h * 60);
      const tk = el('span', '', M.clock(tickAt.start) + (h >= 24 ? ' +1 day' : ''));
      tk.style.left = pct + '%';
      if (pct < 7) tk.classList.add('first'); else if (pct > 93) tk.classList.add('last');
      ticks.appendChild(tk);
      const ln = el('i', 'ds-tick'); ln.style.left = pct + '%'; track.appendChild(ln);
    }
    const layer = el('div', 'ds-blocks');
    track.appendChild(layer);
    strip.append(track, ticks);
    field(p, 'When on ' + wd, strip);

    const row = el('div', 'row2');
    const startStep = liveStepper(() => sel.start == null ? span0 : sel.start, (v) => { const min = v < span0 && span1 > 1440 && v + 1440 < span1 ? v + 1440 : v; sel.start = M.clamp(min, span0, span1 - sel.dur); refresh(true); }, M.clock);
    field(row, 'Starts', startStep);
    field(row, 'Length', liveStepper(() => sel.dur, (v) => { sel.dur = M.clamp(v, 15, Math.min(480, total)); renderSide(); }, M.dur));
    p.appendChild(row);
    const effect = el('p', 'effect');
    effect.setAttribute('aria-live', 'polite');
    p.appendChild(effect);
    const go = button('', 'go wide', () => placeNow && placeNow());
    p.appendChild(go);

    let last = null;
    function refresh(tick) {
      const start = sel.start;
      if (start == null) {
        heroTime.textContent = wd + ' · ' + M.dur(sel.dur);
        layer.replaceChildren();
        d.blocks.filter((b) => !b.sleep).forEach((b) => layer.appendChild(stripBlock(b, false)));
        effect.textContent = 'No open time on ' + wd + ' for ' + M.dur(sel.dur) + '. Try a shorter length or another day.';
        effect.className = 'effect bad';
        go.textContent = 'No room on ' + wd; go.disabled = true; placeNow = null;
        W.showGhost(null); W.showDayGhost(null);
        return;
      }
      heroTime.textContent = (M.dateTime(date, start).date === date ? M.dateText(date, 'day') + ' · ' : '') + timeSpan(date, start, start + sel.dur) + ' · ' + M.dur(sel.dur);
      const tr = tryOn(() => M.placeAdd(state, date, add, start));
      const ok = !!tr.r.ok;
      layer.replaceChildren();
      if (ok) {
        const pd = daysWith(tr.dates, [date])[date], newKey = 'add:' + tr.r.add.id;
        pd.blocks.filter((b) => !b.sleep).forEach((b) => layer.appendChild(stripBlock(b, sourceKey(b) === newKey)));
        const before = new Map(d.blocks.map((b) => [b.base, b]));
        const moved = pd.blocks.filter((b) => !b.soft && !b.sleep && b.base !== newKey && before.has(b.base) && before.get(b.base).start !== b.start);
        const cut = d.blocks.filter((b) => b.soft && b.start < start + sel.dur && b.start + b.dur > start);
        effect.textContent = moved.length ? moved.slice(0, 2).map((b) => (b.label || b.name) + ' slides to ' + M.clock(b.start)).join('. ') + (moved.length > 2 ? '. ' + plural(moved.length - 2, 'more block slides', 'more blocks slide') + ' too' : '') + '.'
          : cut.length ? 'Takes this time from ' + (cut[0].label || cut[0].name) + '.' : 'Fits without moving anything.';
        if (dueOf && dueOf.due && M.dateTime(date, start + sel.dur).date > dueOf.due) effect.textContent += ' That’s after it’s due (' + M.relText(dueOf.due, today) + ').';
        effect.className = 'effect';
      } else {
        d.blocks.filter((b) => !b.sleep).forEach((b) => layer.appendChild(stripBlock(b, false)));
        layer.appendChild(stripBlock({ start, dur: sel.dur, cat: add.cat }, true, true));
        effect.textContent = blockedText(tr.r) + '.';
        effect.className = 'effect bad';
      }
      go.replaceChildren(document.createTextNode(ok ? 'Add on ' + placedText(date, start) : 'Pick another time'));
      go.disabled = !ok;
      placeNow = ok ? () => placeIt(hero, add, date, start) : null;
      track.setAttribute('aria-valuetext', M.clock(start));
      startStep.refresh();
      if (tick && last != null && last !== start) Snd.detent(ok);
      last = start;
      /* the board shows the landing spot too */
      if (W.layout === 'week') {
        if (view.zoom === 'day') { W.showGhost(null); W.showDayGhost(date === view.focus ? start : null, sel.dur, ok); }
        else { W.showDayGhost(null); const r = wk.indexOf(date); W.showGhost(r >= 0 ? r : null, start, sel.dur, ok); }
      }
    }
    function stripBlock(b, isNew, bad) {
      const c = cat(b.cat), x = el('i', 'ds-b' + (b.soft ? ' soft' : '') + (isNew ? ' new' : '') + (bad ? ' bad' : ''));
      const a = Math.max(span0, b.start), z = Math.min(span1, b.start + b.dur);
      x.style.left = ((a - span0) / total) * 100 + '%';
      x.style.width = Math.max(0.6, ((z - a) / total) * 100) + '%';
      x.style.setProperty('--bg', c.base);
      return x;
    }
    const atX = (clientX) => {
      const r = track.getBoundingClientRect();
      const min = span0 + ((clientX - r.left) / r.width) * total;
      return M.clamp(M.snap(min - sel.dur / 2), span0, span1 - sel.dur);
    };
    let dragging = false;
    track.addEventListener('pointerdown', (e) => { if (sel.start == null) return; dragging = true; try { track.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } Snd.init(); sel.start = atX(e.clientX); refresh(true); });
    track.addEventListener('pointermove', (e) => { if (!dragging) return; const v = atX(e.clientX); if (v !== sel.start) { sel.start = v; refresh(true); } });
    const stop = () => { dragging = false; };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
    track.addEventListener('keydown', (e) => {
      if (sel.start == null) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); sel.start = M.clamp(sel.start + (e.key === 'ArrowLeft' ? -15 : 15), span0, span1 - sel.dur); refresh(true); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (placeNow) placeNow(); }
    });
    refresh(false);
  }
  /* Place it, and send the block from the panel to its spot on the desk. */
  function placeIt(hero, add, date, start) {
    const r = commit(() => M.placeAdd(state, date, add, start));
    if (!(r && r.ok)) { Snd.bad(); toast(blockedText(r || {}), 'bad'); return; }
    const from = hero.getBoundingClientRect();
    const wk = weekOf(), row = wk.indexOf(date);
    const where = view.zoom === 'day' ? (date === view.focus ? 'day' : null) : view.zoom === 'week' && row >= 0 ? 'week' : null;
    const land = () => landed(date, 'add:' + r.add.id, add.dur / 60);
    toast(add.name + ', ' + placedText(r.date || M.dateTime(date, start).date, r.start), 'good');
    closeSel();
    if (!where || reducedMotion() || (FEEL && view.calm)) { land(); return; }
    const shownStart = M.windowTime(date, r.date || M.dateTime(date, start).date, r.start);
    /* feel: the block on the desk waits for the copy; the copy flies to a hand's height over its slot at the
       block's own size there, and hands over to the block as it drops in */
    if (FEEL) W.holdBack(date, 'add:' + r.add.id);
    const slot = W.slotWorld(where, row, shownStart + add.dur / 2);
    const to = W.toScreen(FEEL ? slot.clone().setY(slot.y + 0.9) : slot);
    let endScale = 0.3;
    if (FEEL) {
      const a = W.toScreen(W.slotWorld(where, row, shownStart)), b2 = W.toScreen(W.slotWorld(where, row, shownStart + Math.min(add.dur, where === 'day' ? 60 : add.dur)));
      endScale = Math.max(0.16, Math.min(1.1, Math.abs(b2.x - a.x) / Math.max(1, from.width)));
    }
    const fly = hero.cloneNode(true);
    fly.classList.add('flying');
    Object.assign(fly.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
    $('app').appendChild(fly);
    const dx = to.x - (from.left + from.width / 2), dy = to.y - (from.top + from.height / 2);
    const anim = FEEL ? fly.animate([
      { transform: 'translate(0, 0) rotate(-0.6deg) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px, ' + (dy * 0.5 - 48) + 'px) rotate(-3deg) scale(' + ((1 + endScale) / 2).toFixed(3) + ')', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(0deg) scale(' + endScale.toFixed(3) + ')', opacity: 1, offset: 0.9 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(0deg) scale(' + endScale.toFixed(3) + ')', opacity: 0 }
    ], { duration: 440, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' }) : fly.animate([
      { transform: 'translate(0, 0) rotate(-0.6deg) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.55 + 'px, ' + (dy * 0.55 - 40) + 'px) rotate(-4deg) scale(0.62)', opacity: 1, offset: 0.6 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(0deg) scale(0.3)', opacity: 0 }
    ], { duration: 480, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' });
    /* a hidden tab can pause the animation, so a timer makes sure the block always lands */
    let landed = false;
    const finish = () => { if (landed) return; landed = true; fly.remove(); land(); };
    anim.onfinish = finish;
    setTimeout(finish, 900);
  }
  const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  /* == feel: the pieces on top of the desk move too ==
     Arrivals ease out from where they come from; departures are a copy that fades while the real thing is
     already gone, so nothing ever waits on an animation. Calmer motion and the system's reduced motion
     keep everything still. */
  function arrive(node, from, ms) {
    if (!feelMoves() || !node || !node.animate) return;
    node.animate([from, { opacity: 1, transform: 'none' }], { duration: ms || 200, easing: OUT_EASE });
  }
  function ghostOut(node, to, ms) {
    if (!feelMoves() || !node || node.hidden || !node.isConnected) return;
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const c = node.cloneNode(true), cs = getComputedStyle(node);
    c.removeAttribute('id'); c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    c.setAttribute('aria-hidden', 'true'); c.inert = true;
    Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', right: 'auto', bottom: 'auto', margin: '0', pointerEvents: 'none', zIndex: cs.zIndex === 'auto' ? '60' : cs.zIndex, transformOrigin: cs.transformOrigin, visibility: 'visible' });
    $('app').appendChild(c);
    c.scrollTop = node.scrollTop;
    const a = c.animate([{ opacity: 1, transform: 'none' }, to], { duration: ms || 130, easing: IN_EASE, fill: 'forwards' });
    a.onfinish = () => c.remove();
    setTimeout(() => c.remove(), (ms || 130) + 250);
  }

  /* Save what's on a day as a kind of day to use again. A day that started from a blank slate
     saves as one, so a free day can be a kind of its own. */
  function savePresetPanel(p, date) {
    const dd = state.dates[date] || {}, wd = M.DAY_LONG[M.weekday(date)];
    const from = D.PRESETS.concat(state.presets || []).find((x) => x.id === dd.preset);
    const clear = !!(from && (from.empty || from.clear));
    const draft = M.presetFromDay(state, date, '', { clear });
    const can = draft.items.length > 0 || clear;
    kicker(p, 'Kind of day', 'star');
    title(p, 'Save this ' + wd);
    line(p, !can ? 'This is your usual ' + wd + '. Add a few blocks or pick another kind first, then save it.'
      : clear ? (draft.items.length ? 'Routines that aren’t locked come off, and these go on:' : 'Routines that aren’t locked come off. The day starts clear.')
      : 'These come along to any day you use it, at the same times when they fit.');
    const list = el('div', 'list');
    draft.items.forEach((it) => { const r = el('div', 'list-row'); r.append(icon(it.icon || 'star', 9, UI.gold), el('span', 'grow', it.name), el('small', '', M.clock(it.start))); list.appendChild(r); });
    if (draft.items.length) p.appendChild(list);
    if (!can) return;
    let ic = clear ? 'sun' : 'star';
    const nm = textInput('', () => {}, clear ? 'A free ' + wd : wd + ' on my own', 28);
    field(p, 'Name', nm);
    field(p, 'Mark', chips(['star', 'sun', 'moon', 'brush', 'dumbbell', 'heart', 'people', 'book', 'house', 'cup'].map((x) => ({ id: x, name: '', icon: x })), ic, (v) => { ic = v; }));
    actions(p, [button('Save this kind of day', 'small primary', () => {
      const name = nm.value.trim() || nm.placeholder;
      let id = null;
      commit(() => { const pr = M.presetFromDay(state, date, name, { clear }); pr.icon = ic; id = pr.id; state.presets = state.presets || []; state.presets.push(pr); M.dateRec(state, date).preset = pr.id; });
      view.got.freshKind = id;
      renderKinds();
      Snd.good(); toast(name + ' is saved. It’s with your kinds of day, at the top.', 'good');
      closeSel();
    })]);
    setTimeout(() => nm.focus(), 30);
  }
  /* How the board works, with the key to its colors. Opens by itself the first time. */
  function helpPanel(p) {
    kicker(p, 'How it works', 'calendar');
    title(p, 'Your week, in blocks');
    line(p, 'Each row is a day. A block is as long as it takes.');
    const kinds = el('div', 'list');
    [['Routines', 'Slide them; neighbors slide too.', 'family', false],
      ['Open time', 'Striped. Drop things in and they make room.', 'yours', true],
      ['Locked', 'A padlock. They never move.', 'family', false]
    ].forEach(([name, text, c, soft]) => {
      const r = el('div', 'list-row');
      const sw = el('span', 'kind-sw' + (soft ? ' soft' : ''));
      sw.style.setProperty('--bg', cat(c).base);
      if (name === 'Locked') sw.classList.add('pin');
      const t = el('div', 'grow', name);
      t.appendChild(el('small', '', text));
      r.append(sw, t);
      kinds.appendChild(r);
    });
    field(p, 'Three kinds of blocks', kinds);
    const legend = el('div', 'chips');
    D.CAT_ORDER.forEach((k) => { const c = el('span', 'chip-btn legend'); const sw = el('span', 'sw'); sw.style.background = palette()[k].base; c.append(sw, document.createTextNode(cat(k).name)); legend.appendChild(c); });
    field(p, 'Kinds of time', legend);
    /* a gesture and a few words each; the keys fold away */
    const how = el('div', 'list how-rows');
    [['check', 'Tap a block', 'Its tools. Tap again for everything.'], ['grip', 'Drag a block', 'It slides into place.'], ['longer', 'Drag its right edge', 'Longer or shorter.'], ['zoomin', 'Pinch', 'Closer, like a photo.'], ['later', 'Swipe a day on a phone', 'The next day or the one before.'], ['lamp', 'Tap the lamp or the notepad', 'Light, or what’s due.']].forEach(([ic, a, b]) => {
      const r = el('div', 'list-row how-row');
      r.append(icon(ic, 10, UI.gold), onbWords(a, b));
      how.appendChild(r);
    });
    field(p, 'Moving things', how);
    const keys = disclosure('Keys');
    keys.appendChild(el('p', '', 'T and P switch Today and the Planner. 1 to 4 go from a day to the year. Plus, minus, and 0 zoom the desk. Arrows move through time. ' + MODKEY + ' Z undoes, with Shift it redoes.'));
    p.appendChild(keys);
    actions(p, [button('Start Sunday Reset', 'small primary', () => { closeSel(); startReset(resetWeek()); }), button('Got it', 'small', closeSel)]);
  }

  /* == Settings ==
     What matters but isn't the week itself. Two panes: a short list of pages on the left, in five
     groups of four or fewer, and one page on the right. One scheme per level: the groups are who or
     what a setting belongs to (your week, what's on your board, this device, sharing, help) and a
     page is one kind of thing.
     Every page says whether its settings live on the board, where everyone you share with sees
     them, or on this device only. It opens from the app's name, on an overview of how things are
     set up, and then on the page you were last on. On a wide window the desk slides over and stays
     live beside it, so a theme, a layout, or the light changes in front of you. */
  let returnFocus = null;
  const SET_PAGES = [
    { id: 'overview', name: 'Overview', icon: 'tiles', group: '' },
    { id: 'you', name: 'You and home', icon: 'person', group: 'Your week', scope: 'board' },
    { id: 'days', name: 'Usual days', icon: 'sunrise', group: 'Your week', scope: 'board' },
    { id: 'reset', name: 'Sunday Reset', icon: 'sun', group: 'Your week', scope: 'board' },
    { id: 'library', name: 'Block library', icon: 'star', group: 'Your board', scope: 'board' },
    { id: 'calendars', name: 'Calendars', icon: 'calendar', group: 'Your board', scope: 'board' },
    { id: 'desk', name: 'The desk', icon: 'lamp', group: 'This device', scope: 'device' },
    { id: 'reading', name: 'Reading and sound', icon: 'textsize', group: 'This device', scope: 'device' },
    { id: 'bar', name: 'The tray bar', icon: 'tray', group: 'This device', scope: 'device' },
    { id: 'sync', name: 'Sync and devices', icon: 'cloud', group: 'Sharing and safekeeping', scope: 'sync', needs: 'server' },
    { id: 'remind', name: 'Reminders', icon: 'bell', group: 'Sharing and safekeeping', scope: 'device', needs: 'push' },
    { id: 'data', name: 'Your data', icon: 'box', group: 'Sharing and safekeeping', scope: 'data' },
    { id: 'help', name: 'Help', icon: 'help', group: 'Help' },
    { id: 'dev', name: 'Dev', icon: 'wrench', group: 'Help', scope: 'nothing', needs: 'dev' }
  ];
  /* what people type when they're looking for one setting: its name, the page it's on, and other
     words for it */
  const SET_INDEX = [
    ['Your name', 'you', ''], ['Partner', 'you', 'spouse husband wife'], ['Kids', 'you', 'children'], ['Dinners', 'you', 'meals groceries turn off'], ['Time together', 'you', 'date ideas turn off'],
    ['Up and bed times', 'days', 'wake sleep morning night usual'], ['Weeks start on', 'days', 'monday sunday first day calendar week'], ['Visible hours', 'days', 'overnight midnight early morning board start end range fit sleep'], ['Weeks that alternate', 'days', 'shift custody rota every other'], ['Weekly meetings', 'days', 'standup work'], ['Home time zone', 'days', 'travel'],
    ['Steps of the Sunday Reset', 'reset', 'look back ahead shorter'],
    ['Make a block', 'library', 'new custom own create add your blocks'], ['Change a block', 'library', 'edit rename color length mark'], ['Hide a block', 'library', 'remove delete'],
    ['Subscribe with a link', 'calendars', 'google outlook apple school ics'], ['Bring in a calendar file', 'calendars', 'import ics'],
    ['Theme', 'desk', 'wood colors look night pastel'], ['What sits around the board', 'desk', 'layout things plant mug books'], ['Lamp', 'desk', 'light switch'], ['Light follows the day', 'desk', 'night dark bright steady dim'], ['Block library in the Planner', 'desk', 'rack beside below'],
    ['Larger text', 'reading', 'font size zoom big'], ['24 hour clock', 'reading', 'time format military'], ['Show the week as a list', 'reading', 'screen reader keyboard accessibility'], ['Calmer motion', 'reading', 'animation reduce'], ['Lighter desk', 'reading', 'battery slow performance'], ['Sound', 'reading', 'mute volume quiet'],
    ['On the bar', 'bar', 'shortcuts tabs bottom bookmarks order arrange'], ['Add to the bar', 'bar', 'shortcut bookmark pin'],
    ['Turn on sync', 'sync', 'share phone household'], ['Link a phone or another device', 'sync', 'code qr'], ['Devices', 'sync', 'rename remove'], ['Leaving', 'sync', 'sign out delete household'],
    ['Remind me', 'remind', 'notifications push alerts'], ['Send a test reminder', 'remind', 'check'],
    ['Download a backup', 'data', 'export save file'], ['Load a backup', 'data', 'restore import'], ['Keeping it here', 'data', 'home screen dock safari persistent storage keep cleared'], ['Earlier versions on this device', 'data', 'history undo rescue yesterday'], ['Print this week', 'data', 'paper fridge'], ['Copy this week as text', 'data', 'words paste message notes plain'], ['Download this week for a calendar', 'data', 'ics export'], ['Start over', 'data', 'clear erase wipe'],
    ['How it works', 'help', 'guide tutorial'], ['Getting started', 'help', 'first moves checklist new list'], ['Take the tour', 'help', 'tutorial walkthrough tips'], ['Weeks', 'dev', 'dev scenarios made up boards heavy light full late early alternate preview test states'], ['Time on the board', 'dev', 'dev history six months year two years'], ['Edge cases', 'dev', 'dev empty long names overlaps overdue five kids big calendar'], ['The clock and the day', 'dev', 'dev time hold held day'], ['The first visit', 'dev', 'dev welcome setup onboarding steps'], ['This window', 'dev', 'dev phone view width'], ['Keys', 'help', 'keyboard shortcuts'], ['Something isn’t working', 'help', 'feedback bug report problem'], ['About', 'help', 'version']
  ];
  const setPages = () => SET_PAGES.filter((p) => (p.needs === 'server' ? !!Cloud.cfg : p.needs === 'push' ? !!(Cloud.cfg && Cloud.cfg.push) : p.needs === 'dev' ? devOn() : p.id === 'bar' ? !window.SR_noTrayBar : true));
  const wideSettings = () => window.innerWidth >= 1180 && window.innerHeight >= 560 && !view.phone;
  function openDrawer(page) {
    returnFocus = document.activeElement; closeSel(); closeQuick();
    view.drawer = true;
    if (page) { view.setPage = page; view.setOpen = true; }
    else if (!view.setPage) view.setPage = 'overview';
    view.setFind = '';
    $('drawer').hidden = false; $('scrim').hidden = false; document.body.classList.add('drawer-open');
    renderDrawer(); layoutInsets();
    Snd.pick();
    setTimeout(() => { const f = $('drawer').querySelector(view.setOpen ? '.set-h' : '.side-title'); if (f) f.focus(); }, 30);
  }
  function closeDrawer() {
    view.drawer = false; view.got.ics = null; view.got.restore = null; view.confirm = null; view.setOpen = false;
    $('drawer').hidden = true; document.body.classList.remove('drawer-open'); if ($('sheet').hidden) $('scrim').hidden = true;
    layoutInsets();
    const back = returnFocus && document.contains(returnFocus) ? returnFocus : $('hud-kicker');
    returnFocus = null;
    if (back && back.focus) back.focus();
  }
  function goPage(id, found) {
    view.setPage = id; view.setOpen = true; view.setFind = ''; view.confirm = null;
    if (found) view.got.found = found;
    renderDrawer();
    $('drawer-in').scrollTop = 0;
    const page = $('drawer').querySelector('.set-page');
    if (page) page.scrollTop = 0;
    const h = $('drawer').querySelector('.set-h');
    if (h && !found) h.focus({ preventScroll: true });
  }
  /* Tab stays inside an open dialog */
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const box = !$('sheet').hidden ? $('sheet') : view.drawer ? $('drawer') : null;
    if (!box) return;
    const list = [...box.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function dsec(parent, heading, lineText) {
    const sec = el('section', 'dsec');
    sec.appendChild(el('h4', 'dsec-h', heading));
    if (lineText) sec.appendChild(el('p', 'dsec-line', lineText));
    parent.appendChild(sec);
    return sec;
  }
  function toggle(label, on, fn, hint) {
    const b = el('button', 'switch');
    b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(!!on));
    const words = el('span', 'sw-label', label);
    if (hint) words.appendChild(el('small', '', hint));
    b.appendChild(words);
    b.appendChild(el('span', 'sw-track'));
    b.dataset.fk = 'sw-' + label;
    b.addEventListener('click', () => { Snd.init(); fn(!on); });
    return b;
  }
  function renderDrawer() {
    if (!view.drawer) return;
    /* a redraw after a change keeps your place on the page and in the list */
    const page = $('drawer').querySelector('.set-page'), at = page ? page.scrollTop : 0, top = $('drawer').scrollTop;
    keepFocus($('drawer-in'), buildDrawer);
    const again = $('drawer').querySelector('.set-page');
    /* Dev opens at its top when the board showing changed, where what acts on that board now is */
    const devNow = view.setPage === 'dev' ? (view.preview && view.preview.id) || '' : null;
    if (again) again.scrollTop = devNow != null && devNow !== devShown ? 0 : at;
    if (devNow != null) devShown = devNow;
    $('drawer').scrollTop = top;
    const want = view.got.found;
    if (want) { view.got.found = null; setTimeout(() => showFound(want), 40); }
  }
  /* the setting someone searched for: brought into view and ringed for a moment */
  function showFound(text) {
    const page = $('drawer').querySelector('.set-page');
    if (!page) return;
    const hit = [...page.querySelectorAll('.sw-label, .lbl, label, .dsec-h, .dcard-h, button')].find((x) => x.textContent.trim().toLowerCase().startsWith(text.toLowerCase()));
    if (!hit) return;
    const box = hit.closest('.switch, .field, .dcard, .dsec') || hit;
    box.scrollIntoView({ block: 'center', behavior: reducedMotion() || view.calm ? 'auto' : 'smooth' });
    box.classList.add('found');
    setTimeout(() => box.classList.remove('found'), 2200);
    const f = box.matches('button') ? box : box.querySelector('button, input, select');
    if (f) f.focus({ preventScroll: true });
  }
  /* the kinds of week a board has: the usual, and any others (a week the family's away, Week B) */
  function shapeChoices() {
    const sh = state.rhythm.shapes || {};
    const russell = !!sh.monday && !sh.monday.name;
    const out = [{ id: 'usual', name: russell ? named(D.SHAPES[0].name) : state.rhythm.usualName || 'Your usual week' }];
    Object.keys(sh).forEach((id) => out.push({ id, name: sh[id].name || named((D.SHAPES.find((x) => x.id === id) || { name: id }).name) }));
    return out;
  }
  const scopeLine = (p) => (p.scope === 'board' ? (Cloud.on ? 'On the board. Everyone in ' + (Cloud.me.name || 'your household') + ' sees these.' : 'On the board. They go with a backup, and to anyone you share the week with.')
    : p.scope === 'device' ? 'On this device only.'
    : p.scope === 'sync' ? (Cloud.on ? 'Your household, and the devices in it.' : 'Off. Your week is on this device only.')
    : p.scope === 'data' ? 'Where your week is kept, and how to get it back.'
    : p.scope === 'nothing' ? 'Nothing here is saved, on this device or on the board.' : '');
  function hoursCard(p) {
    const h = M.visibleHours(state), endName = (min) => min === 1440 ? 'midnight' : M.clock(min % 1440) + (min > 1440 ? ' next day' : '');
    const sec = dsec(p, 'Visible hours', M.clock(h.start) + ' to ' + endName(h.end) + '. ' + (h.end > 1440 ? 'The desk keeps each evening with the next morning.' : 'Extend the board through 5 am when a night runs late.'));
    const edit = button(view.got.hoursOpen ? 'Hide hour settings' : 'Change visible hours', 'small quiet', () => { view.got.hoursOpen = !view.got.hoursOpen; renderDrawer(); });
    edit.setAttribute('aria-expanded', String(!!view.got.hoursOpen));
    sec.appendChild(edit);
    if (!view.got.hoursOpen) return;
    const set = (patch) => { commit(() => { const next = Object.assign({}, M.visibleHours(state), patch); next.end = M.clamp(next.end, next.start + 60, Math.min(1740, next.start + 1440)); state.settings.hours = next; }); renderDrawer(); };
    const select = (value, values, name, fn) => {
      const s = el('select', 'input'); s.dataset.fk = 'hours-' + name;
      values.forEach((min) => { const o = el('option', '', name === 'end' ? endName(min) : M.clock(min)); o.value = String(min); o.selected = min === value; s.appendChild(o); });
      s.addEventListener('change', () => set(fn(Number(s.value)))); return s;
    };
    const row = el('div', 'row2');
    field(row, 'Show from', select(h.start, Array.from({ length: 13 }, (_, i) => i * 60), 'start', (start) => ({ start })));
    field(row, 'Through', select(h.end, Array.from({ length: 18 }, (_, i) => (i + 12) * 60).filter((end) => end > h.start && end <= h.start + 1440), 'end', (end) => ({ end })));
    sec.appendChild(row);
    sec.appendChild(el('p', 'field-hint', 'After midnight, labels name the next calendar date. This changes the view; saved times, reminders, and calendars keep their real dates. List shows every hour.'));
    /* fit to the usual days: from the hour before the earliest wake to the hour after the latest bedtime */
    const days = [state.rhythm.days].concat(Object.values(state.rhythm.shapes || {}).map((x) => x.days || {})).flatMap((set) => Object.values(set));
    const fit = OB && days.length ? OB.hoursFor({ wake: { wd: Math.min(...days.map((d) => d.wake)), we: Math.min(...days.map((d) => d.wake)) }, bed: { wd: Math.max(...days.map((d) => d.bed)), we: Math.max(...days.map((d) => d.bed)) } }) : null;
    const acts = [];
    if (fit && (fit.start !== h.start || fit.end !== h.end)) acts.push(button('Fit to my days, ' + M.clock(fit.start) + ' to ' + endName(fit.end), 'small', () => { commit(() => { state.settings.hours = fit; }); renderDrawer(); }));
    acts.push(button('Use 5 am to midnight', 'small quiet', () => { commit(() => { delete state.settings.hours; }); renderDrawer(); }));
    actions(sec, acts);
  }
  function buildDrawer() {
    const box = $('drawer-in'), pages = setPages();
    box.replaceChildren();
    if (!pages.some((p) => p.id === view.setPage)) view.setPage = 'overview';
    const cur = pages.find((p) => p.id === view.setPage);
    const wrap = el('div', 'setwrap' + (view.setOpen ? ' open' : ''));

    /* the list of pages, with a way to find one setting by name */
    const nav = el('nav', 'set-nav');
    nav.setAttribute('aria-label', 'Settings pages');
    const dh = el('h2', 'side-title', 'Settings');
    dh.tabIndex = -1;
    nav.appendChild(dh);
    const find = el('div', 'find set-find');
    const inp = el('input', 'input find-in');
    inp.type = 'search'; inp.placeholder = 'Find a setting'; inp.value = view.setFind || '';
    inp.setAttribute('aria-label', 'Find a setting by name');
    inp.dataset.fk = 'setfind'; inp.dataset.v0 = inp.value;
    find.append(icon('search', 8, UI.soft), inp);
    inp.addEventListener('input', (e) => { if (e.isComposing) return; view.setFind = inp.value; renderDrawer(); });
    inp.addEventListener('compositionend', () => { view.setFind = inp.value; renderDrawer(); });
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape' && view.setFind) { e.preventDefault(); view.setFind = ''; renderDrawer(); } else if (e.key === 'Escape') closeDrawer(); else if (e.key === 'ArrowDown') { const f = nav.querySelector('.set-link'); if (f) { e.preventDefault(); f.focus(); } } });
    nav.appendChild(find);
    const link = (p, sub, found) => {
      const b = el('button', 'set-link');
      b.type = 'button';
      if (!sub && p.id === cur.id) b.setAttribute('aria-current', 'page');
      b.appendChild(icon(p.icon, 9, !sub && p.id === cur.id ? UI.dark : UI.soft));
      const t = el('span', 'grow', found || p.name);
      if (sub) t.appendChild(el('small', '', p.name));
      b.appendChild(t);
      b.addEventListener('click', () => { Snd.init(); Snd.pick(); goPage(p.id, found); });
      return b;
    };
    const q = (view.setFind || '').trim().toLowerCase();
    if (q) {
      const hits = SET_INDEX.filter(([name, id, words]) => pages.some((p) => p.id === id) && (name + ' ' + words + ' ' + pages.find((p) => p.id === id).name).toLowerCase().includes(q)).slice(0, 9);
      const g = el('div', 'set-group');
      g.appendChild(el('h3', 'set-gh', hits.length ? plural(hits.length, 'setting', 'settings') : 'Nothing by that name'));
      hits.forEach(([name, id]) => g.appendChild(link(pages.find((p) => p.id === id), true, name)));
      if (!hits.length) g.appendChild(el('p', 'dsec-line', 'Try another word, or look through the pages.'));
      nav.appendChild(g);
      if (!hits.length) g.appendChild(button('Show all pages', 'small quiet', () => { view.setFind = ''; renderDrawer(); }));
    } else {
      [''].concat([...new Set(pages.map((p) => p.group).filter(Boolean))]).forEach((gn) => {
        const g = el('div', 'set-group');
        if (gn) g.appendChild(el('h3', 'set-gh', gn));
        pages.filter((p) => p.group === gn).forEach((p) => g.appendChild(link(p)));
        nav.appendChild(g);
      });
    }
    /* up and down move through the list, the way a list of pages should */
    nav.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const links = [...nav.querySelectorAll('.set-link')], i = links.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault(); e.stopPropagation();
      (links[i + (e.key === 'ArrowDown' ? 1 : -1)] || (e.key === 'ArrowUp' ? inp : links[i])).focus();
    });

    /* the page */
    const page = el('section', 'set-page');
    page.setAttribute('aria-labelledby', 'set-h');
    const back = button('All settings', 'small quiet set-back', () => { view.setOpen = false; renderDrawer(); const f = $('drawer').querySelector('.set-link[aria-current]'); if (f) f.focus(); });
    back.prepend(icon('left', 8, UI.soft));
    page.appendChild(back);
    const head = el('header', 'set-head');
    const h = el('h3', 'set-h', cur.name); h.id = 'set-h'; h.tabIndex = -1;
    head.appendChild(h);
    const sc = scopeLine(cur);
    if (sc) head.appendChild(el('p', 'set-scope' + (cur.scope === 'board' ? ' board' : ''), sc));
    page.appendChild(head);
    /* While a preview shows, pages that act on the real board (sync, backups, earlier versions,
       reminders) wait for Back to my board; the rest change the made up board and say so once. Dev
       says it itself. */
    if (view.preview && cur.id !== 'dev') {
      const away = ['sync', 'data', 'remind'].includes(cur.id);
      const note = el('div', 'dnote');
      note.appendChild(el('span', '', away ? 'This page works on your own board. You’re looking at ' + previewLabel() + '.' : 'You’re looking at ' + previewLabel() + '. Nothing here is saved.'));
      note.appendChild(button('Back to my board', 'small primary', endPreview));
      page.appendChild(note);
      if (away) { wrap.append(nav, page); box.appendChild(wrap); return; }
    }
    PAGE[cur.id](page);
    wrap.append(nav, page);
    box.appendChild(wrap);
  }
  /* a line in a list that goes somewhere: a mark, what it is, a line under it, and an arrow */
  function goRow(ic, name, sub, fn) {
    const r = el('button', 'list-row drow');
    r.type = 'button';
    if (ic) r.appendChild(icon(ic, 10, UI.gold));
    const t = el('span', 'grow', name);
    if (sub) t.appendChild(el('small', '', sub));
    const ch = el('span', 'chev'); ch.appendChild(icon('right', 7, UI.soft));
    r.append(t, ch);
    r.addEventListener('click', () => { Snd.init(); Snd.pick(); fn(); });
    return r;
  }
  const BACKUP_KEY = 'sundayreset.backup.at';
  const backupAt = () => { try { return +localStorage.getItem(BACKUP_KEY) || 0; } catch (e) { return 0; } };
  const PAGE = {
    /* how things are set up, and what's left to do about it: each line goes to its page */
    overview(p) {
      const who0 = who();
      if (who0.sample && !view.preview) {
        const note = el('div', 'dnote');
        note.appendChild(el('span', '', 'This is a sample week, so you can look around.'));
        note.appendChild(button('Set up mine', 'small primary', () => { closeDrawer(); openWelcome('setup'); }));
        p.appendChild(note);
      }
      saveWarning(p);
      const st = saveState(), rp = remindPrefs(), b = backupAt();
      /* how the week is kept safe; the list beside this has its own Your week, for how the week is set */
      const kept = dsec(p, 'Keeping your week');
      const l1 = el('div', 'list');
      l1.appendChild(goRow('box', st.long.replace(/\.$/, ''), Store.savedAt ? 'Last saved ' + agoText(Store.savedAt) : 'Nothing to save yet', () => goPage('data')));
      if (Cloud.cfg) l1.appendChild(Cloud.on ? goRow('cloud', 'Shared with ' + (Cloud.me.name || 'your household'), 'Every linked device sees and changes this week', () => goPage('sync')) : goRow('cloud', 'Not shared', 'Turn on sync to see the week on your phone', () => goPage('sync')));
      if (Cloud.cfg && Cloud.cfg.push) l1.appendChild(goRow('bell', rp.on ? 'Reminders arrive on this device' : 'No reminders on this device', !Cloud.on ? 'Reminders need sync' : rp.on ? 'Send a test to be sure' : 'For pick ups, meetings, and the dinner question', () => goPage(Cloud.on ? 'remind' : 'sync')));
      l1.appendChild(goRow('print', b ? 'Last backup ' + agoText(b) : 'No backup yet', b ? 'A file you keep, apart from this browser' : 'Download one, so clearing the browser can’t take your week', () => goPage('data', b ? null : 'Download a backup')));
      const kw = keepWords();
      if (kw && kw.risk) l1.appendChild(goRow(isIOS() ? 'phone' : 'laptop', kw.short, 'This browser can clear it after seven days without a visit', () => goPage('data', 'Keeping it here')));
      kept.appendChild(l1);
      /* the one thing that protects the week is one tap from here */
      if (!b) actions(kept, [button('Download a backup', 'small', downloadBackup)]);
      /* what was set up, at a glance, each line going to its page */
      const wk = dsec(p, 'Your week');
      const l0 = el('div', 'list'), pr = who(), rd = (state.rhythm && state.rhythm.days && state.rhythm.days[1]) || null;
      const people = [pr.name || 'You', pr.partner].concat(pr.kids || []).filter(Boolean);
      l0.appendChild(goRow('person', people.join(', '), 'You and home', () => goPage('you')));
      if (rd) l0.appendChild(goRow('sunrise', 'Up at ' + M.clock(rd.wake) + ', bed at ' + M.clock(rd.bed % 1440), 'Usual days, on a Monday', () => goPage('days')));
      const when = moves && !moves.dev && moves.resetAt ? M.DAY_LONG[moves.resetAt.day] + 's at ' + M.clock(moves.resetAt.min) + ', ' : '';
      l0.appendChild(goRow('sun', 'Sunday Reset', when + plural(stepsNow().length - (window.SR_recapApart ? 1 : 0), 'step', 'steps'), () => goPage('reset')));
      wk.appendChild(l0);
      const dev = dsec(p, 'This device');
      const l2 = el('div', 'list'), K = window.DeskThemes;
      if (K && !noDesk) l2.appendChild(goRow('lamp', K.THEMES[view.desk.theme].name + ' desk, ' + K.LAYOUTS[view.desk.layout].name.toLowerCase(), (view.steady ? 'Light held steady' : 'Light follows the day') + (view.lamp ? ', lamp on' : ', lamp off'), () => goPage('desk')));
      l2.appendChild(goRow('textsize', (view.bigText ? 'Larger text' : 'Standard text') + ', ' + (view.clock24 ? '24 hour clock' : '12 hour clock'), (view.list ? 'Week as a list' : 'Week on the desk') + (view.sound ? ', sound on' : ', sound off') + (view.calm ? ', calmer motion' : ''), () => goPage('reading')));
      if (!window.SR_noTrayBar) l2.appendChild(goRow('tray', 'The tray bar', barItems().map((x) => x.name).join(', '), () => goPage('bar')));
      dev.appendChild(l2);
    },
    /* you and the people at home, and what the board helps with */
    you(p) {
      const pr = who();
      const setP = (patch) => commit(() => { state.profile = Object.assign({}, who(), patch); });
      field(p, 'Your name', textInput(pr.name, (v) => setP({ name: v }), 'Your first name', 30));
      const row = el('div', 'row2');
      field(row, 'Partner', textInput(pr.partner, (v) => setP({ partner: v }), 'Optional', 30));
      field(row, 'Kids', textInput((pr.kids || []).join(', '), (v) => setP({ kids: nameList(v) }), 'Optional', 60));
      p.appendChild(row);
      p.appendChild(el('div', 'field-hint', 'Commas or “and” between kids’ names. Names on your routines stay as you wrote them; change one by tapping its block.'));
      /* each part can be left out, and its tab, question, and reset step go with it */
      const mods = modules();
      const setMod = (patch) => { commit(() => { state.settings = Object.assign({}, state.settings, { modules: Object.assign({}, modules(), patch) }); }); renderDrawer(); };
      const help = dsec(p, 'What Sunday Reset helps with', 'To dos and your own time are always here. Turn off a part and its tab, its question, and its reset step go with it.');
      const g = el('div', 'switches');
      g.appendChild(toggle('Dinners', mods.dinners !== false, (v) => setMod({ dinners: v }), 'What’s for dinner, who cooks, and the grocery list'));
      g.appendChild(toggle('Time together', mods.together !== false, (v) => setMod({ together: v }), partner() ? 'Ideas for evenings with ' + partner() : 'Ideas for evenings with someone'));
      help.appendChild(g);
    },
    /* where each weekday starts and ends, weeks that alternate, meetings, and the home time zone */
    days(p) {
      const days = dsec(p, 'Up and bed times', 'Each day’s usual start and end. Tap one to change it on the board.');
      const list = el('div', 'list daygrid');
      [1, 2, 3, 4, 5, 6, 0].forEach((wd) => {
        const tpl = state.rhythm.days[wd];
        list.appendChild(goRow(null, M.DAY_LONG[wd], 'Up ' + M.clock(tpl.wake) + ', bed ' + M.clock(tpl.bed), () => { const d = M.addDays(today, (wd - M.weekday(today) + 7) % 7); closeDrawer(); if (view.mode !== 'planner') setMode('planner'); view.focus = d; setZoom('day', d); openSel({ type: 'day', date: d }); }));
      });
      days.appendChild(list);
      /* which day a week starts on: everything kept by week moves with it, so nothing is lost */
      const wsec = dsec(p, 'Weeks start on', 'The week on the desk, the month rows, and the week a Sunday Reset plans.');
      wsec.appendChild(chips([{ id: 0, name: 'Sunday' }, { id: 1, name: 'Monday' }], state.settings.weekStart === 1 ? 1 : 0, (v) => {
        const was = state.settings.weekStart === 1 ? 1 : 0;
        if (v === was) return;
        commit(() => { M.shiftWeeks(state, was, v); state.settings = Object.assign({}, state.settings, { weekStart: v }); if (v === 1) state.settings.weekStart = 1; else delete state.settings.weekStart; M.setWeekStart(v); return { ok: true }; });
        renderDrawer();
      }, 'weekstart'));
      hoursCard(p);
      alternateCard(p);
      const meet = dsec(p, 'Weekly meetings', 'Type each one in once and it shows up inside Work every week.');
      meet.appendChild(button(state.meetings.length ? plural(state.meetings.length, 'meeting', 'meetings') + ', change them' : 'Add your weekly meetings', 'small', () => { closeDrawer(); openSel({ type: 'meetings' }); }));
      const tz = dsec(p, 'Home time zone', 'Times on the board are in ' + (tzName(state.settings.tz || deviceTz()) || 'this device’s') + ' time.');
      tzLine(tz);
    },
    /* the Sunday Reset's own steps: a shorter ritual is still a ritual */
    reset(p) {
      const rs = dsec(p, 'Steps of the Sunday Reset', 'Leave out the steps you don’t need. Dinners and time together follow what Sunday Reset helps with, on You and home.');
      const off = state.settings.resetOff || [], g = el('div', 'switches');
      D.STEPS.filter((st) => ['back', 'ahead', 'shape', 'yours', 'todo'].includes(st.key)).forEach((st) => {
        g.appendChild(toggle(stepTitle(st), !off.includes(st.key), (v) => { commit(() => { const o = (state.settings.resetOff || []).filter((k) => k !== st.key); if (!v) o.push(st.key); state.settings = Object.assign({}, state.settings, { resetOff: o }); }); renderDrawer(); }, stepLine(st)));
      });
      rs.appendChild(g);
      const n = stepsNow().length;
      p.appendChild(el('p', 'dsec-line', 'Your reset has ' + plural(n, 'step', 'steps') + ' now, the last one a look at the week you set.'));
      actions(p, [button('See how you and home are set', 'small quiet', () => goPage('you'))]);
    },
    /* calendars, kept as their own layer */
    calendars(p) {
      p.appendChild(el('p', 'dsec-line', Cloud.cfg ? 'Subscribe with a calendar’s link and it stays current, or bring in a file once. Each is its own layer of locked blocks you can hide or take off.' : 'Bring in a calendar file from Google, Outlook, Apple, a court, or a school. It stays its own layer of locked blocks, and you can hide it or take it off any time.'));
      const pend = view.got.ics;
      if (pend) {
        const card = el('div', 'dcard');
        const ds = pend.items.map((x) => x.date).sort();
        card.appendChild(el('div', 'dcard-h', 'Found ' + plural(pend.items.length, 'event', 'events') + (ds.length ? ', ' + M.dateText(ds[0]) + ' to ' + M.dateText(ds[ds.length - 1]) : '')));
        const nm = textInput(pend.name, (v) => { pend.name = v || pend.name; }, 'School calendar', 40);
        field(card, 'Name', nm);
        field(card, 'Kind of time', catChips(pend.cat, (v) => { pend.cat = v; }));
        actions(card, [
          pend.items.length ? button('Add to the board', 'small primary', () => { pend.name = nm.value.trim() || pend.name; importCalendar(pend); }) : null,
          button('Cancel', 'small quiet', () => { view.got.ics = null; renderDrawer(); })
        ]);
        p.appendChild(card);
      } else {
        if (Cloud.cfg) {
          const row = el('div', 'td-inline');
          const inp = textInput('', () => {}, 'Paste a calendar link', 500);
          inp.setAttribute('aria-label', 'A calendar link');
          row.append(inp, button(view.got.calBusy ? 'Checking…' : 'Subscribe', 'small primary', () => { const v = inp.value.trim(); if (v && !view.got.calBusy) subscribeCalendar(v); }));
          field(p, 'Subscribe with a link', row);
          if (view.got.calErr) p.appendChild(el('p', 'err', view.got.calErr + '.'));
        }
        actions(p, [button('Bring in a calendar file', 'small', () => { $('ics-file').value = ''; $('ics-file').click(); })]);
      }
      const cals = state.calendars || [];
      const on = dsec(p, 'On the board', cals.length ? null : 'No calendars yet. One you bring in shows here, with a way to hide it or take it off.');
      cals.forEach((c) => {
        const r = el('div', 'list-row');
        const sw = el('span', 'kind-sw'); sw.style.setProperty('--bg', cat(c.cat).base);
        const t = el('div', 'grow', c.name);
        t.appendChild(el('small', '', plural(state.events.filter((e) => e.cal === c.id).length, 'event', 'events') + (c.hidden ? ', hidden' : '') + (c.url ? (c.error ? '. ' + c.error + ', showing what we had from ' + (agoText(c.fetched) || 'before') : '. Updated ' + agoText(c.fetched)) : '')));
        r.append(sw, t);
        if (c.url && Cloud.cfg) r.appendChild(button('Refresh', 'small quiet', () => { const cal = state.calendars.find((x) => x.id === c.id); if (cal) cal.fetched = 0; refreshCalendars(true); }));
        r.appendChild(button(c.hidden ? 'Show' : 'Hide', 'small quiet', () => commit(() => { c.hidden = !c.hidden; })));
        r.appendChild(confirmButton('Remove', 'rm-cal-' + c.id, () => { commit(() => { state.events = state.events.filter((e) => e.cal !== c.id); state.calendars = state.calendars.filter((x) => x.id !== c.id); }); toast(c.name + ' is off the board.', '', { label: 'Undo', fn: undo }); }));
        on.appendChild(r);
      });
    },
    /* how the desk looks and how it's lit, on this device */
    desk(p) {
      const K = window.DeskThemes;
      if (!K || noDesk) { p.appendChild(el('p', 'dsec-line', 'The desk can’t draw on this device, so there’s nothing to choose here. The week is a list.')); return; }
      const grid = el('div', 'desk-themes');
      K.THEME_ORDER.forEach((id) => {
        const t = K.THEMES[id], b = el('button', 'desk-theme');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(view.desk.theme === id));
        b.title = t.note;
        b.append(themeCard(K.resolve(id)), el('span', 'desk-theme-name', t.name));
        b.addEventListener('click', () => { Snd.init(); if (view.desk.theme !== id) setDeskChoice({ theme: id }); });
        grid.appendChild(b);
      });
      field(p, 'Theme', grid);
      /* each layout is drawn: the mat, and a dot for each thing on its side */
      const lays = el('div', 'desk-themes lays');
      const R = K.resolve(view.desk.theme);
      K.LAYOUT_ORDER.forEach((id) => {
        const L = K.LAYOUTS[id], b = el('button', 'desk-theme');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(view.desk.layout === id));
        b.append(layoutCard(R, L), el('span', 'desk-theme-name', L.name));
        b.addEventListener('click', () => { Snd.init(); if (view.desk.layout !== id) setDeskChoice({ layout: id }); });
        lays.appendChild(b);
      });
      field(p, 'What sits around the board', lays);
      const nameOf = (id) => (K.LEGACY[id] ? K.LEGACY[id].name : window.PropKit && PropKit.index[id] ? PropKit.index[id].name : id.replace(/_/g, ' '));
      const L = K.LAYOUTS[view.desk.layout];
      const side = (ids) => ids.flat().map(nameOf).join(', ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
      p.appendChild(el('p', 'dsec-line', L && (L.L.length || L.R.length) ? 'On the left: ' + (side(L.L) || 'nothing') + '. On the right: ' + (side(L.R) || 'nothing') + '.' : 'Nothing around the board.'));
      /* the light: even on the work at every hour; these two change what's around it */
      const li = dsec(p, 'Light', 'The work is lit evenly at every hour. The desk around it is what changes.');
      const g = el('div', 'switches');
      g.appendChild(toggle('Light follows the day', !view.steady, (v) => { view.steady = !v; saveView(); applyPrefs(); renderDrawer(); }, 'Dimmer around the work after dark. Off keeps midday light.'));
      g.appendChild(toggle('Lamp', view.lamp, () => { toggleLamp(); renderDrawer(); }, 'Warms the evening light. Tapping the lamp does the same.'));
      li.appendChild(g);
      field(p, 'Block library in the Planner', chips([{ id: 'beside', name: 'Beside the day', icon: 'beside' }, { id: 'below', name: 'Below the day', icon: 'below' }], view.arrange, (v) => { if (v === view.arrange) return; view.arrange = v; saveView(); Snd.slide(); W.resetView(); render(); }));
    },
    /* how everything reads and sounds, on this device */
    reading(p) {
      const g = el('div', 'switches');
      g.appendChild(toggle('Larger text', view.bigText, (v) => { view.bigText = v; saveView(); applyPrefs(); render(); }, 'Every panel and the list, a size up'));
      g.appendChild(toggle('24 hour clock', view.clock24, (v) => { view.clock24 = v; saveView(); applyPrefs(); render(); }, view.clock24 ? '19:30' : '7:30 pm'));
      if (!noDesk) g.appendChild(toggle('Show the week as a list', view.list, (v) => { setList(v); renderDrawer(); }, 'Every block as a button, for a keyboard or a screen reader. L switches it.'));
      g.appendChild(toggle('Calmer motion', view.calm, (v) => { view.calm = v; saveView(); applyPrefs(); renderDrawer(); }, 'Blocks and boards move at once, with no rise or drift'));
      if (!noDesk) g.appendChild(toggle('Lighter desk', view.lowPower, (v) => { view.lowPower = v; saveView(); applyPrefs(); renderDrawer(); }, 'For an older computer or a longer battery'));
      g.appendChild(toggle('Sound', view.sound, (v) => { view.sound = v; saveView(); Snd.set(v); if (v) Snd.good(); renderDrawer(); }, 'Soft taps as blocks land'));
      p.appendChild(g);
      if (!noDesk) { const more = el('p', 'dsec-line', 'Light that changes with the clock, and the lamp, are on '); more.appendChild(button('The desk', 'link', () => goPage('desk', 'Light follows the day'))); more.appendChild(document.createTextNode('.')); p.appendChild(more); }
    },
    /* the tray bar: what's on it, and in what order */
    bar(p) { barPage(p); },
    dev(p) { devPage(p); },
    sync(p) { syncSection(p); },
    remind(p) { remindSection(p); },
    data(p) { dataSection(p); },
    /* Block library: make a block, change one, hide one you never use, bring one back */
    library(p) {
      p.appendChild(el('p', 'dsec-line', 'The blocks you drag from the tray onto a day. Make your own, change any of them, or hide the ones you never use. Blocks already on a day keep the name and length they had.'));
      /* one button that says it, not a heading that says it again above it */
      const mk = el('div', 'lib-make');
      p.appendChild(mk);
      if (view.got.libEdit === 'new') {
        const card = el('div', 'dcard');
        card.appendChild(el('div', 'dcard-h', 'A new block'));
        mk.appendChild(card);
        const nm = blockForm(card, null, (f) => { commit(() => { state.palette.push({ id: M.newId('b'), name: f.name, cat: f.cat, dur: f.dur, icon: f.icon }); }); view.got.libEdit = null; Snd.good(); toast(f.name + ' is in Block library', 'good'); renderDrawer(); }, () => { view.got.libEdit = null; renderDrawer(); });
        setTimeout(() => nm.focus(), 30);
      } else actions(mk, [button('Make a block', 'small primary', () => { view.got.libEdit = 'new'; renderDrawer(); })]);
      const shown = library(), hidden = state.palette.filter((x) => x.hidden);
      const sec = dsec(p, 'In the library', plural(shown.length, 'block', 'blocks') + ', in the tray and beside the day, in the same groups as on the desk.');
      /* finding one of 25 by its name; groups with nothing left fold away */
      const find = el('input', 'input lib-find');
      find.type = 'search'; find.placeholder = 'Find a block'; find.value = view.got.libFind || ''; find.dataset.fk = 'lib-find'; find.maxLength = 40;
      find.setAttribute('aria-label', 'Find a block');
      const none = el('p', 'dsec-line', 'No block has that in its name.');
      const filter = () => {
        const q = find.value.trim().toLowerCase();
        view.got.libFind = q;
        let all = 0;
        sec.querySelectorAll('h5.bar-kind').forEach((hd) => {
          const list = hd.nextElementSibling;
          let n = 0;
          list.querySelectorAll('[data-name]').forEach((r) => { const hit = !q || r.dataset.name.includes(q); r.hidden = !hit; if (hit) n++; });
          hd.hidden = list.hidden = !n; all += n;
        });
        none.hidden = all > 0;
      };
      find.addEventListener('input', filter);
      find.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape' && find.value) { e.preventDefault(); find.value = ''; filter(); } });
      if (shown.length > 8) sec.appendChild(find);
      /* the desk's own rows (Data.KIT_ROWS), then the ones someone made, then the rest (Open time) */
      libGroups(shown).forEach((g) => {
        sec.appendChild(el('h5', 'bar-kind', g.name));
        const list = el('div', 'list');
        g.list.forEach((b) => {
          if (view.got.libEdit !== b.id) { const r = libRow(b, false); r.dataset.name = b.name.toLowerCase(); list.appendChild(r); return; }
          const card = el('div', 'dcard');
          card.appendChild(el('div', 'dcard-h', 'Change ' + b.name));
          const nm = blockForm(card, b, (f) => { commit(() => { Object.assign(state.palette.find((q) => q.id === b.id), { name: f.name, cat: f.cat, dur: f.dur, icon: f.icon }); }); view.got.libEdit = null; Snd.good(); say(f.name + ' saved'); renderDrawer(); }, () => { view.got.libEdit = null; renderDrawer(); });
          list.appendChild(card);
          setTimeout(() => nm.focus(), 30);
        });
        sec.appendChild(list);
      });
      sec.appendChild(none);
      filter();
      if (hidden.length) {
        const hs = dsec(p, 'Hidden', 'Out of the tray and off the desk. A kind of day that uses one still places it.');
        const hl = el('div', 'list');
        hidden.forEach((b) => hl.appendChild(libRow(b, true)));
        hs.appendChild(hl);
      }
    },
    help(p) {
      actions(p, [button('How it works', 'small', () => { closeDrawer(); openSel({ type: 'help' }); }), button('Something isn’t working', 'small', () => { closeDrawer(); openSel({ type: 'feedback' }); })]);
      const start = dsec(p, 'Getting started', 'Six things to try on the desk, each ticked when you do it, and a four step tour of where things are.');
      actions(start, [OB ? button('Show the list', 'small', openMoves) : null, view.phone || noDesk ? null : button('Take the tour', 'small', () => { closeDrawer(); startTour(0); })]);
      const ks = dsec(p, 'Keys');
      const keys = el('div', 'keys');
      [['1 to 4', 'Day, week, month, year'], ['L', 'The week as a list'], ['Left, right', 'Earlier and later'], ['T, P', 'Today, the Planner'], ['N', 'Add in plain words'], ['Plus, minus, 0', 'Zoom the desk, fit it'], ['Arrows on a picked block', 'Earlier or later; with Shift, shorter or longer'], ['Enter', 'Add a block you’re placing'], ['Esc', 'Close, or step back'], [MODKEY + ' Z', 'Undo'], ['Shift ' + MODKEY + ' Z', 'Redo']].forEach(([k, v]) => { const r = el('div', 'key-row'); r.append(el('kbd', '', k), el('span', '', v)); keys.appendChild(r); });
      ks.appendChild(keys);
      const about = dsec(p, 'About', 'Sunday Reset. Set up the week ahead every Sunday, and see where your time goes, from one day to the whole year.');
      if (!view.preview) actions(about, [button('Try the setup as someone new', 'small quiet', () => { closeDrawer(); openWelcome('preview'); })]);
    }
  };
  /* a save that didn't happen leads whatever page mentions saving */
  function saveWarning(p) {
    if (Store.status !== 'error') return;
    const note = el('div', 'dnote warn');
    note.appendChild(el('span', '', 'This browser didn’t save your last change. ' + (Store.lastError && Store.lastError.what === 'full' ? 'Its storage is full.' : 'It may be blocking storage for this site.') + ' Download a backup so nothing is lost.'));
    note.appendChild(button('Download a backup', 'small primary', downloadBackup));
    p.appendChild(note);
  }
  const stepLine = (st) => ({ back: 'Last week: what to keep and what to change', ahead: 'The next five weeks, for anything that needs a block now', shape: 'Which kind of week this is, and your meetings', yours: 'Your own time goes on first', todo: 'Give the things due soon a time' })[st.key] || '';
  /* a layout, drawn: the theme's desk and mat, the board, and a dot for each thing on its side */
  function layoutCard(r, L) {
    const cv = document.createElement('canvas'), W0 = 176, H0 = 96;
    cv.width = W0; cv.height = H0;
    const g = cv.getContext('2d');
    r.wood.planks.tones.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * H0 / 4, W0, H0 / 4 + 1); });
    const box = (x, y, w, h, rad, c) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, rad); g.fill(); };
    box(44, 16, W0 - 88, H0 - 32, 9, r.mat.color);
    box(52, 24, W0 - 104, H0 - 48, 5, r.boards.board.base);
    const dots = (ids, x) => { const n = ids.flat().length, gap = Math.min(20, (H0 - 28) / Math.max(1, n)); ids.flat().forEach((id, i) => { g.fillStyle = 'rgba(36, 24, 12, 0.72)'; g.beginPath(); g.arc(x, H0 / 2 + (i - (n - 1) / 2) * gap, 6.5, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255, 244, 222, 0.85)'; g.beginPath(); g.arc(x, H0 / 2 + (i - (n - 1) / 2) * gap, 3.2, 0, Math.PI * 2); g.fill(); }); };
    dots(L.L || [], 24); dots(L.R || [], W0 - 24);
    return cv;
  }
  /* Weeks that alternate: every other week with the kids, a rotating shift. Week B starts as a copy of
     the usual week and changes on any Week B day, the same way the usual one does. */
  function alternateCard(sec) {
    const alt = state.rhythm.alternate, sh = alt && state.rhythm.shapes && state.rhythm.shapes[alt.shape];
    const card = el('div', 'dcard');
    if (!sh) {
      card.appendChild(el('div', 'dcard-h', 'Weeks that alternate'));
      card.appendChild(el('p', 'dsec-line', 'For every other week with the kids, or day shifts one week and nights the next. The other week starts as a copy of your usual week, and you change it on any of its days.'));
      actions(card, [button('My weeks alternate', 'small', () => {
        commit(() => {
          state.rhythm.shapes = state.rhythm.shapes || {};
          state.rhythm.shapes.alt = { name: 'Week B', days: JSON.parse(JSON.stringify(state.rhythm.days)) };
          state.rhythm.alternate = { shape: 'alt', from: M.weekStart(today) };
        });
        toast('Next week is Week B. Change its days on any Week B date.', 'good');
        renderDrawer();
      })]);
    } else {
      const thisB = M.shapeOf(state, today) === alt.shape;
      card.appendChild(el('div', 'dcard-h', 'Weeks alternate: this week is ' + (thisB ? sh.name : 'your usual week')));
      field(card, 'Name of the other week', textInput(sh.name, (v) => { if (v) commit(() => { sh.name = v; }); }, 'Week B', 30));
      actions(card, [
        button('Swap which week is which', 'small', () => { commit(() => { alt.from = M.addDays(M.weekStart(alt.from), 7); }); renderDrawer(); }),
        button('See ' + sh.name, 'small quiet', () => { const d = thisB ? today : M.addDays(today, 7); closeDrawer(); setZoom('week', d); }),
        confirmButton('Stop alternating', 'stop-alt', () => { commit(() => { delete state.rhythm.alternate; }); renderDrawer(); })
      ]);
    }
    sec.appendChild(card);
  }
  /* The home time zone. Times on the board are in it; a device somewhere else says so once. */
  const deviceTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } };
  const homeTz = () => (state && state.settings && state.settings.tz) || deviceTz() || 'UTC';
  /* does this place write the day before the month? Then 6/10 in plain words is the sixth of October */
  const QUICK_OPTS = { dayFirst: (() => { try { const parts = new Intl.DateTimeFormat().formatToParts(new Date(2020, 11, 31)).map((x) => x.type); return parts.indexOf('day') < parts.indexOf('month'); } catch (e) { return false; } })() };
  const tzName = (z) => (z || '').split('/').pop().replace(/_/g, ' ');
  function tzLine(sec) {
    const home = state.settings.tz, here = deviceTz();
    if (!home || !here || home === here) return;
    const card = el('div', 'dnote');
    card.appendChild(el('span', '', 'Times here are in ' + tzName(home) + ' time, your home time zone. This device is on ' + tzName(here) + ' time.'));
    card.appendChild(button('Make ' + tzName(here) + ' home', 'small', () => { commit(() => { state.settings = Object.assign({}, state.settings, { tz: here }); }); renderDrawer(); }));
    sec.appendChild(card);
  }
  /* Where the week lives and how to get it back: the save status, earlier versions on this device and
     in the household, backups, and taking the week to a calendar or to paper. */
  function readBackup(doc) {
    const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
    const own = (record, key) => Object.prototype.hasOwnProperty.call(record, key);
    const damaged = () => ({ error: 'That backup is damaged, so your board stays as it is' });
    const containers = ['settings', 'profile', 'weeks', 'dates', 'dinners', 'shopping'];
    if (!isRecord(doc) || !isRecord(doc.rhythm) || !isRecord(doc.rhythm.days)) return { error: 'That file isn’t a Sunday Reset backup' };
    /* Missing legacy fields can migrate; an explicitly broken container must not be repaired away. */
    if (containers.some((key) => own(doc, key) && !isRecord(doc[key]))) return damaged();
    let st = null;
    try { st = D.migrate(JSON.parse(JSON.stringify(doc))); } catch (e) { st = null; }
    if (!st || st.v !== D.VERSION) return { error: 'That backup is from a version this board can’t read' };
    /* Every restore path checks the same weeks before it can replace or rescue the current board. */
    try {
      const record = (value) => { if (!isRecord(value)) throw new Error('record'); };
      const array = (value) => { if (!Array.isArray(value)) throw new Error('array'); };
      const records = (value) => { array(value); value.forEach(record); };
      containers.forEach((key) => record(st[key]));
      ['events', 'tasks', 'palette', 'recipes', 'pantry', 'ideas', 'groups', 'meetings', 'presets', 'calendars'].forEach((key) => records(st[key]));
      ['modules', 'hours'].forEach((key) => { if (own(st.settings, key)) record(st.settings[key]); });
      if (own(st.profile, 'kids')) array(st.profile.kids);
      Object.values(st.weeks).forEach(record);
      Object.values(st.dinners).forEach((dinner) => { record(dinner); if (own(dinner, 'items')) array(dinner.items); });
      st.recipes.forEach((recipe) => array(recipe.items));
      st.tasks.forEach((task) => { if (own(task, 'steps')) records(task.steps); });
      st.meetings.forEach((meeting) => { if (own(meeting, 'days')) array(meeting.days); });
      record(st.rhythm.days);
      for (let wd = 0; wd < 7; wd++) record(st.rhythm.days[wd]);
      const shapes = own(st.rhythm, 'shapes') ? st.rhythm.shapes : {};
      record(shapes);
      Object.values(shapes).forEach((shape) => { record(shape); record(shape.days); });
      const clock = (value) => { if (!Number.isFinite(value)) throw new Error('clock'); };
      const span = (record, partial) => {
        if (!isRecord(record)) throw new Error('time');
        if (!partial || Object.prototype.hasOwnProperty.call(record, 'start')) clock(record.start);
        if (!partial || Object.prototype.hasOwnProperty.call(record, 'dur')) {
          clock(record.dur); if (record.dur <= 0) throw new Error('length');
        }
      };
      /* Check saved clocks everywhere, including dates beyond the preview. A broken clock can
         otherwise disappear from a resolved day without throwing. Extended clocks stay valid. */
      [st.rhythm.days].concat(Object.values(shapes).map((shape) => shape.days)).forEach((days) => {
        Object.values(days).forEach((day) => { record(day); clock(day.wake); clock(day.bed); records(day.blocks); day.blocks.forEach((block) => span(block)); });
      });
      Object.values(st.dates).forEach((day) => {
        record(day);
        if (day.wake != null) clock(day.wake);
        if (day.bed != null) clock(day.bed);
        if (own(day, 'adds')) { records(day.adds); day.adds.forEach((add) => span(add)); }
        if (own(day, 'edits')) { record(day.edits); Object.values(day.edits).forEach((edit) => span(edit, true)); }
      });
      st.events.filter((event) => event.kind === 'timed').forEach((event) => span(event));
      st.meetings.forEach((meeting) => span(meeting));
      for (let i = 0; i < 35; i++) M.resolveDay(st, M.addDays(today, i));
    } catch (e) { return damaged(); }
    return { doc: st };
  }
  function dataSection(box) {
    const where = Store.mode === 'db' ? 'Your board is saved with this artifact on claude.ai. Only people you share it with can open it.'
      : Cloud.on ? 'Your board saves on this device first, then to your household on the server, where every linked device reads it.'
      : 'Your board is saved in this browser on this device, and nowhere else. Clearing site data erases it, so keep a backup.';
    saveWarning(box);
    box.appendChild(el('p', 'dsec-line', where));
    const st = el('div', 'sync-status ' + saveState().cls);
    st.append(el('b', '', saveState().long), el('span', '', Store.savedAt ? 'Last saved ' + agoText(Store.savedAt) : ''));
    box.appendChild(st);
    const kw = keepWords();
    if (kw) {
      const ks = dsec(box, 'Keeping it here', kw.line);
      if (kw.ask) actions(ks, [button('Ask the browser to keep it', 'small', async () => {
        const k = await Store.keepBoard(true);
        toast(k.state === 'kept' ? 'This browser will keep your board' : 'The browser didn’t agree. A backup keeps your week safe.', k.state === 'kept' ? 'good' : '');
        renderDrawer();
      })]);
    }
    const data = dsec(box, 'Backups', backupAt() ? 'A file you keep, apart from this browser. The last one was ' + agoText(backupAt()) + '.' : 'A file you keep, apart from this browser. There isn’t one yet.');
    const rest = view.got.restore;
    if (rest) {
      const card = el('div', 'dcard');
      card.appendChild(el('div', 'dcard-h', 'Replace this board with ' + (rest.label || ('the backup' + (rest.doc.created ? ' from ' + M.dateText(rest.doc.created) : ''))) + '?'));
      card.appendChild(el('p', 'dsec-line', (Cloud.on ? 'This replaces the board for everyone in your household. ' : '') + 'What’s here now is kept under Earlier versions, and Undo brings it back.'));
      actions(card, [button('Replace my board', 'small primary', () => {
        const checked = readBackup(rest.doc);
        if (checked.error) { view.got.restore = null; toast(checked.error, 'bad'); renderDrawer(); return; }
        const snap = JSON.stringify(state);
        Store.rescue('Before ' + (rest.label ? 'going back to ' + rest.label[0].toLowerCase() + rest.label.slice(1) : 'loading a backup'), state);
        state = checked.doc; undoStack.push(snap); redoStack = []; view.got.restore = null; changed(); closeDrawer();
        toast('Loaded. Undo brings back the board you had.', 'good', { label: 'Undo', fn: undo });
      }), button('Cancel', 'small quiet', () => { view.got.restore = null; renderDrawer(); })]);
      box.insertBefore(card, data);
    }
    actions(data, [
      button('Download a backup', 'small', downloadBackup),
      button('Load a backup', 'small', () => { $('backup-file').value = ''; $('backup-file').click(); })
    ]);
    /* copies this device kept before something replaced the board, and one from each morning */
    const rs = Store.rescues();
    if (!rs.length) dsec(box, 'Earlier versions on this device', 'None yet. A copy is kept here each morning you change something, and before anything replaces the board.');
    if (rs.length) {
      const lst = el('div', 'list');
      rs.slice(0, 8).forEach((x) => {
        const r = el('div', 'list-row');
        const t = el('span', 'grow', x.label);
        t.appendChild(el('small', '', new Date(x.at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })));
        r.append(t, button('Look', 'small quiet', () => { const doc = Store.rescueDoc(x.i); if (!doc) return; const checked = readBackup(doc); if (checked.error) { toast(checked.error, 'bad'); return; } view.got.restore = { doc: checked.doc, label: x.label }; renderDrawer(); }));
        lst.appendChild(r);
      });
      dsec(box, 'Earlier versions on this device', 'Kept here before anything replaced the board, and once each morning. Look at one before going back to it.').appendChild(lst);
    }
    if (Cloud.on) {
      const hist = view.got.hist;
      const hs = dsec(box, 'Earlier saves in your household', 'The last twelve boards the server replaced, from any device.');
      if (!hist) actions(hs, [button('Show them', 'small', async () => { view.got.hist = { busy: true }; renderDrawer(); const r = await Cloud.history(); view.got.hist = r.error ? { error: r.error } : { list: r.list }; renderDrawer(); })]);
      else if (hist.busy) hs.appendChild(el('p', 'dsec-line', 'Checking the household’s saves…'));
      else if (hist.error) hs.appendChild(el('p', 'err', 'Couldn’t reach the household’s saves. Check the connection.'));
      else {
        const lst = el('div', 'list');
        if (!hist.list.length) lst.appendChild(el('div', 'list-row', 'No earlier saves yet.'));
        hist.list.forEach((x) => {
          const r = el('div', 'list-row');
          const t = el('span', 'grow', 'Saved by ' + x.by);
          t.appendChild(el('small', '', new Date(x.at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })));
          r.append(t, button('Look', 'small quiet', async () => { const one = await Cloud.history(x.version); if (one.error || !one.doc) { toast('Couldn’t get that save', 'bad'); return; } const checked = readBackup(one.doc); if (checked.error) { toast(checked.error, 'bad'); return; } view.got.restore = { doc: checked.doc, label: 'the save by ' + x.by }; renderDrawer(); }));
          lst.appendChild(r);
        });
        hs.appendChild(lst);
      }
    }
    actions(dsec(box, 'Take the week with you', 'On paper, as words you can paste anywhere, or as a file a calendar can open.'), [button('Print this week', 'small', () => { closeDrawer(); printWeek(); }), button('Copy this week as text', 'small', copyWeekText), button('Download this week for a calendar', 'small', exportWeek)]);
    if (Store.unreadable) {
      const card = el('div', 'dnote warn');
      card.appendChild(el('span', '', 'A saved board on this device couldn’t be read. It’s kept aside, untouched.'));
      actions(card, [button('Download it', 'small', () => saveFile('sunday-reset-unreadable-' + today + '.json', Store.unreadable)), confirmButton('Let it go', 'forget-raw', () => { Store.forgetUnreadable(); renderDrawer(); })]);
      box.appendChild(card);
    }
    /* starting over replaces the board, so it sits last, under a rule, on the page where backups are */
    if (!view.preview) {
      const over = dsec(box, 'Start over', 'Clears this board and opens the welcome. A copy is kept here under Earlier versions, and a backup file is safer still.');
      over.classList.add('danger');
      actions(over, [confirmButton('Start over', 'start-over', () => { const snap = JSON.stringify(state); Store.rescue('Before starting over', state); state = D.sampleState(today); undoStack = [snap]; redoStack = []; changed(); closeDrawer(); openWelcome('first'); })]);
    }
  }

  async function downloadBackup() {
    /* a backup is of the real week: a made up board never goes into a file or stamps the backup date */
    if (view.preview) { toast('A backup is of your own board. Go back to it first.', '', { label: 'Back to my board', fn: endPreview }); return; }
    await saveFile('sunday-reset-backup-' + today + '.json', JSON.stringify(state, null, 2), 'application/json', 'Backup');
    try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch (e) { /* fine */ }
    if (view.drawer) renderDrawer();
  }
  async function saveFile(name, text, type, what) {
    what = what || 'File';
    let dl = null;
    try { if (window.claude && typeof window.claude.use === 'function') dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    if (dl) {
      try { await dl.save({ filename: name, data: text }); toast(what + ' saved', 'good'); } catch (e) { if (!e || e.code !== 'declined') toast('Couldn’t save that here', 'bad'); }
      return;
    }
    if (window.claude) { toast('Downloads aren’t available in this view', 'bad'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast(what + ' downloaded', 'good');
  }
  /* The week as a calendar file: what's on each day, so it can go into a phone's calendar or to
     someone picking up. Times are the board's own, in its home time zone. */
  /* The week in plain words, a day at a time, the way you'd read it to someone: what, and when. Sleep
     and free time are left out; dinners say what they are. */
  function weekText(ws) {
    const out = ['Week of ' + M.spanText(ws, M.addDays(ws, 6))];
    M.range(ws, 7).forEach((d) => {
      out.push('', M.dateText(d, 'long'));
      const cal = M.calendarDay(state, d);
      (cal.markers || []).forEach((m) => out.push('  ' + m.name));
      const rows = cal.blocks.filter((b) => !b.sleep && !b.free && b.cat !== 'open');
      if (!rows.length) out.push('  Nothing planned');
      rows.forEach((b) => {
        const dn = b.dinner && state.dinners[d], name = b.label || b.name;
        const what = dn ? (dn.name && dn.name !== name ? dn.name : !dn.name && dn.cook ? cookName(dn.cook) : '') : '';
        out.push('  ' + M.span(b.start, b.start + b.dur) + '  ' + (b.dinner && name !== 'Dinner' ? 'Dinner: ' + name : name) + (what ? ': ' + what : '') + (b.fixed ? ' (locked)' : ''));
      });
    });
    return out.join('\n');
  }
  async function copyWeekText() {
    const text = weekText(weekOf()[0]);
    try { await navigator.clipboard.writeText(text); toast('Copied the week as text', 'good'); }
    catch (e) { saveFile('sunday-reset-week-' + weekOf()[0] + '.txt', text, 'text/plain', 'The week as text'); }
  }
  function exportWeek() { saveFile('sunday-reset-week-' + weekOf()[0] + '.ics', icsWeek(), 'text/calendar', 'Calendar file'); }
  function icsWeek() {
    const dates = weekOf(), tz = homeTz();
    const esc = (t) => String(t).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, ' ');
    /* each time is written as the instant it is (UTC), worked out from the board's home zone, so
       every calendar reads it the same way with no zone table in the file */
    const two = (n) => String(n).padStart(2, '0');
    const stamp = (date, min) => {
      const actual = M.dateTime(date, min), p = M.parts(actual.date);
      const d = M.zoneToUtc(tz, p.y, p.m, p.d, Math.floor(actual.start / 60), actual.start % 60) || new Date(Date.UTC(p.y, p.m - 1, p.d, Math.floor(actual.start / 60), actual.start % 60));
      return d.getUTCFullYear() + two(d.getUTCMonth() + 1) + two(d.getUTCDate()) + 'T' + two(d.getUTCHours()) + two(d.getUTCMinutes()) + '00Z';
    };
    /* a line longer than 75 bytes continues on the next, behind a space */
    const enc = new TextEncoder();
    const fold = (ln) => { let out = '', cur = '', n = 0; for (const ch of ln) { const b = enc.encode(ch).length; if (n + b > 74) { out += cur + '\r\n '; cur = ''; n = 1; } cur += ch; n += b; } return out + cur; };
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sunday Reset//Week//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Sunday Reset, week of ' + esc(M.dateText(dates[0]))];
    const seen = new Set();
    dates.forEach((d) => M.calendarDay(state, d).blocks.forEach((b) => {
      if (b.sleep || b.free) return;
      /* Calendar-day carries share one original export span. The display's hours never change
         which actual dates belong to this file, or clip an event's end at midnight. */
      const date = b.exportDate || b.sourceDate || d;
      const start = b.exportStart ?? b.sourceStart ?? b.start;
      const length = b.exportDur ?? b.sourceDur ?? b.dur;
      const key = b.exportKey || b.sourceKey || b.key;
      const actual = M.dateTime(date, start), identity = actual.date + '|' + key;
      if (actual.date < dates[0] || actual.date > dates[6] || seen.has(identity)) return;
      seen.add(identity);
      lines.push('BEGIN:VEVENT', 'UID:' + actual.date + '-' + key.replace(/[^A-Za-z0-9]/g, '') + '@sundayreset', 'DTSTAMP:' + now,
        'DTSTART:' + stamp(actual.date, actual.start), 'DTEND:' + stamp(actual.date, actual.start + length), 'SUMMARY:' + esc(b.label || b.name), 'END:VEVENT');
    }));
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  /* The week on paper: each day as a list of times and names, big enough to read on a fridge. */
  function printWeek() {
    const box = $('print');
    if (!box) return;
    box.replaceChildren();
    const dates = weekOf();
    box.appendChild(el('h1', '', 'Week of ' + M.dateText(dates[0], 'long')));
    dates.forEach((d) => {
      const sec = el('section', 'p-day');
      sec.appendChild(el('h2', '', M.dateText(d, 'long')));
      const dd = day(d), ol = el('ol');
      dd.markers.forEach((m) => ol.appendChild(el('li', 'p-mark', m.name)));
      dd.blocks.filter((b) => !b.sleep && !b.free).forEach((b) => {
        const li = el('li');
        li.append(el('span', 'p-t', M.span(b.start, b.start + b.dur)), el('span', '', (b.label || b.name) + (b.fixed ? ' (locked)' : '') + (b.dinner && b.planned ? ', ' + (dinnerSub(b, d) || '') : '')));
        ol.appendChild(li);
      });
      sec.appendChild(ol);
      box.appendChild(sec);
    });
    setTimeout(() => window.print(), 50);
  }

  function importCalendar(pend) {
    const id = M.newId('c');
    commit(() => {
      state.calendars = state.calendars || [];
      state.calendars.push(Object.assign({ id, name: pend.name, cat: pend.cat, added: today }, pend.url ? { url: pend.url, fetched: Date.now() } : {}));
      state.events = state.events.concat(calEvents(pend.items, id, pend.cat));
    });
    view.got.ics = null;
    Snd.good();
    toast(pend.name + ' is on the board, ' + plural(pend.items.length, 'event', 'events') + (pend.more ? '. The first ' + pend.items.length + ' came in; the rest are further out.' : ''), 'good');
    renderDrawer();
  }
  $('ics-file').addEventListener('change', () => {
    const f = $('ics-file').files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const r = M.parseIcs(String(rd.result), M.addDays(today, -30), M.addDays(today, 400), 800, { tz: homeTz() });
      if (!r.items.length) { toast('No events found in that file. It needs to be a calendar file ending in .ics.', 'bad'); return; }
      view.got.ics = { name: r.name || f.name.replace(/\.ics$/i, ''), cat: 'work', items: r.items, more: r.more };
      renderDrawer();
    };
    rd.readAsText(f);
  });
  $('backup-file').addEventListener('change', () => {
    const f = $('backup-file').files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      let st = null;
      try { st = JSON.parse(String(rd.result)); } catch (e) { st = null; }
      const checked = readBackup(st);
      if (checked.error) { toast(checked.error, 'bad'); return; }
      view.got.restore = { doc: checked.doc };
      /* a backup picked from the welcome: the welcome steps aside for Your data */
      if (view.got.setup) closeSheet();
      if (!view.drawer) openDrawer('data'); else goPage('data');
    };
    rd.readAsText(f);
  });

  /* == the welcome and the setup, for someone new ==
     The first visit. first: nothing is saved yet, so someone new sees the welcome, then the setup in four parts that
     src/onboard.js lays out (About you, Your week, Try it, Your plan). setup: straight to the
     questions. preview: Russell trying it; the result shows behind a banner and nothing is saved until
     he goes back to his board. The try steps work on a copy of the week the answers build, with the
     real model, and what's done in them goes onto the board at the end. docs/ONBOARDING.md says why. */
  const SETUP_KEY = 'sundayreset.setup';
  /* the setup's questions and plan math; without them (src/onboard.js didn't load) there's no setup
     and no Getting started list, and the rest of the app carries on */
  const OB = window.Onboard || null;
  const blankAnswers = () => ({ name: '', pains: [], home: 'solo', partner: '', kids: [], help: { dinners: true, together: true }, meals: { breakfast: true, lunch: true }, focus: [], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020, same: true, hours: {} }, cares: {}, noWork: false, placed: null, soon: null, dinner: null, todo: null, resetAt: { day: 0, min: 1140 } });
  /* at and answers: Dev opens the setup on any step, with a family filled in. back: where closing it
     without finishing goes (Dev goes back to Dev). */
  function openWelcome(mode, at, answers, back) {
    if (!OB) { toast('The setup didn’t load. Reload the page to try again.', 'bad'); return; }
    /* Set up my week, asked for again, opens where the last setup on this device was left */
    if (mode === 'setup' && !answers && !at) { const d = loadDraft(); if (d) { resumeFrom(d, 'setup'); return; } }
    view.got.setup = { mode, at: at || (mode === 'first' ? 'welcome' : 'name'), a: answers || blankAnswers(), fromWelcome: at === 'welcome', back: back || null };
    document.title = 'Sunday Reset';
    returnFocus = document.activeElement;
    $('scrim').hidden = false; $('sheet').hidden = false;
    renderSheet();
    /* a step opens on its title, so it's read first, the same as moving to one */
    /* the welcome opens on its headline too: a ring around the button before anyone has touched anything
       reads as a mistake, and a screen reader starts with what this is */
    setTimeout(() => { const f = $('sheet').querySelector('#sheet-h') || $('sheet').querySelector('[data-first], input, .go, button'); if (f) { if (f.id === 'sheet-h') f.tabIndex = -1; f.focus({ preventScroll: true }); } }, 40);
  }
  /* A setup that was halfway done when the page closed picks up where it was: the step, the answers,
     and a calendar file brought in (t is when it was saved; drafts before Oct 1 called it at). The
     build step comes back as the step before it. */
  /* closed: the person closed the setup themselves, so a reload leaves it closed until they open it */
  function saveDraft(closed) {
    const su = view.got.setup;
    if (!su || su.mode === 'preview' || su.at === 'welcome') return;
    const d = { id: su.at === 'build' ? 'reset' : su.at, a: su.a, ics: su.ics || null, t: Date.now(), closed: !!closed };
    try { localStorage.setItem(SETUP_KEY, JSON.stringify(d)); } catch (e) {
      /* a calendar too big for this browser's storage still comes in now; only a reload would lose it */
      try { d.ics = null; localStorage.setItem(SETUP_KEY, JSON.stringify(d)); } catch (err) { /* fine */ }
      if (su.ics && !su.icsWarned) { su.icsWarned = true; toast('That calendar is too big to keep if this page reloads. Finish the setup, or bring it in again after.', 'bad'); }
    }
  }
  function loadDraft() { try { const d = JSON.parse(localStorage.getItem(SETUP_KEY) || 'null'); const t = d && (d.t || d.at); return d && d.a && Date.now() - t < 14 * 86400000 ? d : null; } catch (e) { return null; } }
  function dropDraft() { try { localStorage.removeItem(SETUP_KEY); } catch (e) { /* fine */ } }
  /* drafts saved before the setup had four parts were numbered */
  const OLD_STEPS = { 1: 'home', 2: 'help', 3: 'days', 4: 'work', 5: 'kids', 6: 'reset' };
  function resumeSetup() {
    const d = loadDraft();
    if (!d || !OB) { openWelcome('first'); return; }
    resumeFrom(d, 'first');
  }
  /* a draft opened again: its step, its answers, and a calendar brought in. name: the name the opener
     already knows, for a draft that never got one and for Start over */
  function resumeFrom(d, mode, name) {
    const a = Object.assign(blankAnswers(), d.a);
    if (name && !String(a.name || '').trim()) a.name = name;
    view.got.setup = { mode, at: d.id || OLD_STEPS[d.step] || 'name', a, ics: d.ics || null, resumed: true, back: null, knownName: name || '' };
    document.title = 'Sunday Reset';
    /* from the welcome, focus goes back where it was before the welcome opened */
    if ($('sheet').hidden) returnFocus = document.activeElement;
    $('scrim').hidden = false; $('sheet').hidden = false;
    renderSheet();
    setTimeout(() => { const h = $('sheet').querySelector('#sheet-h'); if (h) h.focus({ preventScroll: true }); }, 40);
  }
  /* the answers as buildState takes them */
  function setupInput(a) {
    const partnered = a.home === 'partner' || a.home === 'family';
    const kids = a.home === 'family' ? a.kids : [];
    const working = !a.noWork && a.work.days.length;
    const cares = kids.map((k) => Object.assign({ days: working ? a.work.days.slice() : [1, 2, 3, 4, 5], drop: 510, pick: 1005, other: false }, a.cares[k], { kids: [k] }));
    return {
      name: a.name.trim(), partner: partnered ? a.partner.trim() : '', kids, wake: a.wake, bed: a.bed,
      work: working ? { days: a.work.days.slice(), start: a.work.start, end: a.work.end, hours: a.work.same ? {} : a.work.hours, fixed: workFixed(a) } : null,
      cares, help: { dinners: a.help.dinners, together: partnered && a.help.together },
      /* a draft from before meals were asked builds the way it did then */
      meals: a.meals ? { breakfast: !!a.meals.breakfast, lunch: !!a.meals.lunch } : undefined
    };
  }
  /* Whether work hours are set (a shift, an office, a class) or open time to plan. Until it's answered,
     weekend or afternoon hours read as a shift; nine to five reads as time to plan, the way Russell's is. */
  const workFixed = (a) => (a.work.fixed != null ? !!a.work.fixed : a.work.days.includes(0) || a.work.days.includes(6) || a.work.start >= 720);
  /* what the week will hold, read back from the week itself, so it never promises dinner at 6 when late work moves it */
  function setupSummary(a) {
    const st = D.buildState(setupInput(a), today);
    const days = st.rhythm.days, lines = [];
    const same = (f) => { const v = [1, 2, 3, 4, 5].map((wd) => f(days[wd])); return v.every((x) => x === v[0]) ? v[0] : null; };
    lines.push('Up at ' + M.clock(a.wake.wd) + ' on weekdays, ' + M.clock(a.wake.we) + ' on weekends');
    const inp = setupInput(a);
    if (!inp.work) lines.push('No set work hours');
    else {
      /* days with the same hours read together: Mon, Tue, Wed, Fri 9 am to 5 pm; Thu noon to 9:30 pm */
      const groups = new Map();
      a.work.days.slice().sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)).forEach((wd) => { const h = a.work.same ? a.work : Object.assign({ start: a.work.start, end: a.work.end }, a.work.hours[wd]); const k = M.span(h.start, h.end); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(M.DAY_SHORT[wd]); });
      lines.push('Work ' + Array.from(groups.entries()).map(([k, ds]) => ds.join(', ') + ' ' + k).join('; '));
    }
    inp.cares.forEach((c) => { if (!c.other && c.days.length) lines.push(c.kids[0] + ': drop off ' + M.clock(c.drop) + ', pick up ' + M.clock(c.pick) + ', ' + c.days.slice().sort().map((x) => M.DAY_SHORT[x]).join(', ') + ', locked'); });
    const dins = [0, 1, 2, 3, 4, 5, 6].map((wd) => (days[wd].blocks.find((b) => b.dinner) || {}).start).filter((x) => x != null);
    if (dins.length) {
      const count = {}; dins.forEach((x) => { count[x] = (count[x] || 0) + 1; });
      const usual = +Object.keys(count).sort((x, y) => count[y] - count[x])[0];
      const other = [0, 1, 2, 3, 4, 5, 6].filter((wd) => { const b = days[wd].blocks.find((x) => x.dinner); return b && b.start !== usual; });
      const none = [0, 1, 2, 3, 4, 5, 6].filter((wd) => !days[wd].blocks.some((x) => x.dinner));
      const notes = other.map((wd) => M.DAY_SHORT[wd] + ' at ' + M.clock(days[wd].blocks.find((x) => x.dinner).start)).concat(none.length ? ['no dinner block on ' + none.map((wd) => M.DAY_SHORT[wd]).join(', ') + ', where work runs late'] : []);
      lines.push('Dinner at ' + M.clock(usual) + (notes.length ? ' (' + notes.join('; ') + ')' : '') + ', then ' + (inp.partner ? 'an evening with ' + inp.partner : 'a free evening'));
    }
    const bed = same((d) => d.bed);
    lines.push('Bed at ' + M.clock(bed != null ? bed : a.bed.wd) + ' on weekdays');
    const ate = inp.meals ? ['breakfast', 'lunch'].filter((m) => inp.meals[m]) : [];
    if (ate.length) lines.push(cap(ate.join(' and ')) + ' get a time each day');
    lines.push('Sunday Reset helps with to-dos, your own time' + (inp.help.dinners ? ', dinners' : '') + (inp.help.together ? ', and time together' : ''));
    return lines;
  }
  function openLinkSheet(code) {
    history.replaceState(null, '', location.pathname + (view.phone ? '?today' : ''));
    if (!Cloud.cfg) return;
    if (Cloud.on) { toast('This device is already linked to ' + (Cloud.me.name || 'your household')); return; }
    returnFocus = document.activeElement;
    const box = $('sheet');
    $('scrim').hidden = false; box.hidden = false; box.replaceChildren(); box.className = 'panel sheet';
    box.appendChild(el('div', 'side-kicker', 'Sunday Reset'));
    const h = el('h2', 'sheet-h', 'Link this device?'); h.id = 'sheet-h';
    box.appendChild(h);
    box.appendChild(el('p', 'sheet-line', 'It will show your household’s week, and changes go both ways. What’s on this device now is replaced, and a copy of it stays here under Your data.'));
    const nm = textInput(deviceLabel(), () => {}, 'Kitchen tablet', 40);
    field(box, 'Call this device', nm);
    actions(box, [button('Not now', 'small quiet', () => { if (view.got.setup) renderSheet(); else closeSheet(); }), button('Link this device', 'go', () => linkWith({ code }, closeSheet, nm.value.trim()))]);
    setTimeout(() => { const f = box.querySelector('.go'); if (f) f.focus(); }, 40);
  }
  function closeSheet() {
    stopOnb();
    const su = view.got.setup, back = su && !su.finished ? su.back : null;
    view.got.setup = null; $('sheet').hidden = true; $('sheet').className = 'panel sheet'; if ($('drawer').hidden) $('scrim').hidden = true;
    if (ready) renderNow();
    const was = returnFocus && document.contains(returnFocus) ? returnFocus : null;
    returnFocus = null;
    if (back) { setTimeout(back, 0); return; }
    if (was && was.focus) was.focus();
  }

  /* What the first visit keeps while a step is open: timers for the hints and the build, and a drag in
     a try step, so a redraw never leaves one running. */
  let onbTimers = [], onbDrag = null;
  const onbLater = (fn, ms) => { const t = setTimeout(fn, ms); onbTimers.push(t); return t; };
  function stopOnb() { onbTimers.forEach(clearTimeout); onbTimers = []; if (onbDrag && onbDrag.float) onbDrag.float.remove(); onbDrag = null; }
  const onbCalm = () => reducedMotion() || !!view.calm;
  /* A fold out section with a drawn mark, not the browser's typed triangle (every arrow is drawn) */
  function disclosure(text) {
    const d = el('details', 'onb-how');
    const sum = el('summary');
    const mark = () => sum.replaceChildren(icon(d.open ? 'down' : 'right', 8, UI.soft), document.createTextNode(text));
    mark();
    d.addEventListener('toggle', mark);
    d.appendChild(sum);
    return d;
  }
  const onbWords = (name, line) => { const w = el('span', 'onb-words'); w.appendChild(el('b', '', name)); if (line) w.appendChild(el('small', '', line)); return w; };
  /* the week these answers build, made once per set of answers; a try step works on a copy of it */
  let onbMemo = { key: '', json: '' };
  function onbBase(a) {
    const inp = setupInput(a), key = JSON.stringify(inp) + JSON.stringify(OB.hoursFor(a)) + today;
    if (onbMemo.key !== key) { const st = D.buildState(inp, today); st.settings.hours = OB.hoursFor(a); onbMemo = { key, json: JSON.stringify(st) }; }
    return JSON.parse(onbMemo.json);
  }
  /* the base week with the block from Try it on it, the way the board will have it */
  function onbWeek(a, placed) {
    const st = onbBase(a), p = placed === undefined ? a.placed : placed;
    let add = null;
    if (p && p.add) { const r = M.placeAdd(st, p.date, Object.assign({}, p.add, { dur: p.dur || p.add.dur }), p.start); if (r && r.ok) add = r.add; }
    return { st, add };
  }
  /* A day drawn flat, as a lane of its blocks in the desk's own colors (World.look), from lo to hi.
     thin: a strip with no words. mine: the add the person placed, which always carries its name. */
  function onbLane(st, date, lo, hi, opts) {
    const o = opts || {}, span = hi - lo;
    const lane = el('div', 'onb-lane' + (o.thin ? ' thin' : ''));
    M.resolveWindow(st, date).blocks.forEach((b) => {
      if (b.start + b.dur <= lo || b.start >= hi) return;
      const s = Math.max(lo, b.start), e = Math.min(hi, b.start + b.dur), w = (e - s) / span;
      const x = el('div', 'onb-b' + (b.sleep ? ' sleep' : '') + (b.free ? ' free' : '') + (b.fixed && !b.sleep ? ' locked' : '') + (o.mine && b.add === o.mine ? ' mine' : ''));
      x.style.left = (100 * (s - lo)) / span + '%';
      x.style.width = 100 * w + '%';
      const lk = W.look(b);
      if (!b.free) { x.style.background = lk.base; x.style.color = lk.ink; }
      const mine = o.mine && b.add === o.mine;
      if (!o.thin && (w > 0.06 || mine)) {
        x.appendChild(el('b', mine && w <= 0.13 ? 'onb-tag' : '', b.label || b.name));
        if (w > 0.13) x.appendChild(el('small', '', M.span(b.start, b.start + b.dur)));
      }
      x.title = (b.label || b.name) + ', ' + M.span(b.start, b.start + b.dur);
      if (b.add) x.dataset.add = b.add;
      lane.appendChild(x);
    });
    return lane;
  }
  function onbTicks(lo, hi, every) {
    const r = el('div', 'onb-ticks');
    r.setAttribute('aria-hidden', 'true');
    /* ticks stay inside the lane, so the first and last hour never hang off its ends */
    for (let m = Math.ceil((lo + 30) / 60) * 60; m <= hi - 30; m += (every || 3) * 60) { const t = el('span', '', M.clock(m % 1440)); t.style.left = (100 * (m - lo)) / (hi - lo) + '%'; r.appendChild(t); }
    return r;
  }
  /* the week as seven thin lanes: the welcome's picture, and the week in the zoom out. key: the hours
     under it and what each color is, so a row reads as a day from morning to night */
  function onbWeekRows(st, from, key) {
    const box = el('div', 'onb-week'), h = M.visibleHours(st), seen = new Set();
    M.range(from, 7).forEach((d) => {
      const row = el('div', 'onb-row' + (d === today ? ' today' : ''));
      row.appendChild(el('span', 'onb-day', M.DAY_SHORT[M.weekday(d)]));
      row.appendChild(onbLane(st, d, h.start, h.end, { thin: true }));
      box.appendChild(row);
      if (key) M.resolveWindow(st, d).blocks.forEach((b) => { if (!b.free && b.cat !== 'open') seen.add(b.sleep ? 'sleep' : b.cat); });
    });
    if (key) {
      const tr = el('div', 'onb-row');
      tr.append(el('span'), onbTicks(h.start, h.end, 6));
      box.appendChild(tr);
      const k = el('div', 'onb-key');
      D.CAT_ORDER.filter((c) => seen.has(c)).forEach((c) => { const sw = el('i'); sw.style.background = W.look({ cat: c, sleep: c === 'sleep' }).base; const s = el('span'); s.append(sw, c === 'sleep' ? 'Sleep' : cat(c).name); k.appendChild(s); });
      box.appendChild(k);
    }
    return box;
  }
  /* A study as a card: what it found, what that means for the board, and who found it, linked. A
     compact one is the finding and the link, for a second study on the same step. */
  function onbStudy(s, means, compact) {
    if (compact) {
      const one = el('figure', 'onb-study compact');
      one.appendChild(el('p', 'onb-study-m', s.finding));
      /* a second study says what the board does about it too, so it isn't a bare citation */
      if (s.means) one.appendChild(el('p', 'onb-study-m onb-study-so', s.means));
      const link = el('a', '', s.who + ', ' + s.year);
      link.href = s.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const cap = el('figcaption', 'onb-study-c');
      cap.appendChild(link);
      one.appendChild(cap);
      return one;
    }
    const card = el('figure', 'onb-study');
    const k = el('div', 'onb-study-k');
    k.append(icon('book', 8, UI.gold), document.createTextNode('The research'));
    card.appendChild(k);
    card.appendChild(el('p', 'onb-study-f', s.finding));
    if (means !== false) card.appendChild(el('p', 'onb-study-m', means || s.means));
    const cite = el('figcaption', 'onb-study-c');
    const link = el('a', '', s.who + ', ' + s.where + ', ' + s.year);
    link.href = s.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    cite.appendChild(link);
    card.appendChild(cite);
    return card;
  }
  /* A study as a phone reads it: the number, one line, and the source, small and linked. */
  function onbFact(s, plain) {
    const card = el('figure', 'onb-fact' + (plain ? ' plain' : ''));
    if (!plain) { const k = el('div', 'onb-study-k'); k.append(icon('book', 8, UI.gold), document.createTextNode('The research')); card.appendChild(k); }
    card.appendChild(el('b', 'onb-fact-big', s.big || ''));
    card.appendChild(el('p', 'onb-fact-small', s.small || s.finding));
    const cite = el('figcaption', 'onb-study-c');
    const link = el('a', '', s.who + ', ' + s.year);
    link.href = s.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    cite.appendChild(link);
    card.appendChild(cite);
    return card;
  }
  const onbCook = (a, id) => ({ me: 'You cook', kim: (a.partner.trim() || 'Your partner') + ' cooks', home: 'Cooking at home', order: 'Ordering in', out: 'Eating out', leftovers: 'Leftovers', skip: 'Skipping it' }[id] || '');
  const onbWhenReset = (first, at) => {
    const n = M.diffDays(today, first);
    return (n === 0 ? 'today' : n === 1 ? 'tomorrow' : M.DAY_LONG[M.weekday(first)] + ', ' + M.dateText(first)) + ' at ' + M.clock(at.min);
  };
  /* Suggestions that fill a box: one look everywhere in the setup (outlined, the same height), never the
     look of an answer. items are words, or [value, words]. */
  function suggests(items, onPick, label) {
    const row = el('div', 'onb-suggests');
    row.setAttribute('role', 'group'); if (label) row.setAttribute('aria-label', label);
    items.forEach((it) => { const [v, t] = Array.isArray(it) ? it : [it, it]; row.appendChild(button(t, 'onb-suggest', () => { Snd.pick(); onPick(v); })); });
    return row;
  }
  /* a name typed all in lowercase (mike, jenny) gets its capitals; one typed with any capital (deShawn,
     McKenzie) is left the way it was written */
  const properName = (v) => (typeof v === 'string' && v && v === v.toLowerCase() && /[a-z]/.test(v) ? v.replace(/(^|[\s'-])([a-z])/g, (m, p, c) => p + c.toUpperCase()) : v);
  /* The people at home as name chips, each a small block in the board's colors (a partner in the color
     of time together, kids in Family's), with a person mark and an x to take them off. One box: type a
     name and press Enter or a comma; "Robin and Max" is two. one: a single chip (a partner); the box
     steps aside while it's there. Backspace in an empty box goes to the last chip's x, the arrows move
     between the x's and the box, and Delete or Backspace on an x takes that one off. Each change is
     said aloud, and focus lands where the next move is. */
  function peopleField(parent, o) {
    const id = 'pp-' + o.cat, lk = W.look({ cat: o.cat });
    const f = el('div', 'field onb-people-field');
    const lbl = el('label', 'lbl', o.label); lbl.htmlFor = id; lbl.id = id + '-l';
    const box = el('div', 'onb-people'), list = el('ul', 'onb-chips');
    list.setAttribute('aria-labelledby', lbl.id);
    const inp = el('input', 'onb-people-in');
    inp.type = 'text'; inp.id = id; inp.maxLength = 30; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.placeholder = o.ph; inp.dataset.fk = id; inp.setAttribute('enterkeyhint', 'done');
    let hint = null;
    if (o.hint) { hint = el('div', 'field-hint', o.hint); hint.id = id + '-h'; inp.setAttribute('aria-describedby', hint.id); }
    const xs = () => [...list.querySelectorAll('.onb-person-x')];
    /* the chips are drawn in place, never by a redraw of the step, so a tap on Next that commits a
       typed name still lands on Next */
    const paint = (focus, fresh) => {
      list.replaceChildren();
      o.get().forEach((n, k) => {
        const li = el('li', 'onb-person' + (fresh && fresh.includes(n) ? ' new' : ''));
        li.tabIndex = -1;
        li.style.background = lk.base; li.style.color = lk.ink;
        li.append(icon('person', 8, lk.ink), el('span', '', n));
        const x = button('', 'onb-person-x', () => {
          const v = o.get().filter((y) => y !== n);
          o.set(v); saveDraft(); Snd.slide(); say(n + ' is off the list.');
          paint(!o.one && v.length ? Math.min(k, v.length - 1) : 'box');
        });
        x.setAttribute('aria-label', 'Take ' + n + ' off'); x.title = 'Take ' + n + ' off';
        x.appendChild(icon('x', 6, lk.ink));
        x.addEventListener('keydown', (e) => {
          const all = xs(), j = all.indexOf(x);
          if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); e.stopPropagation(); x.click(); }
          else if (e.key === 'ArrowLeft' && j > 0) { e.preventDefault(); e.stopPropagation(); all[j - 1].focus(); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); (all[j + 1] || (inp.hidden ? x : inp)).focus(); }
        });
        li.appendChild(x);
        list.appendChild(li);
      });
      inp.hidden = !!(o.one && o.get().length);
      if (focus === 'box') (inp.hidden ? list.lastChild || inp : inp).focus();
      else if (focus === 'chip') { const last = list.lastChild; if (last) last.focus(); }
      else if (typeof focus === 'number' && xs()[focus]) xs()[focus].focus();
    };
    /* nameList splits on commas and "and"; a name already there isn't added twice */
    const add = (text, quiet) => {
      const got = nameList(text).map(properName), had = o.get();
      const fresh = got.filter((n) => !had.some((y) => y.toLowerCase() === n.toLowerCase()));
      inp.value = '';
      if (!got.length) return;
      if (!fresh.length) { say(got[0] + ' is already on the list.'); return; }
      const v = o.one ? fresh.slice(0, 1) : had.concat(fresh);
      o.set(v); saveDraft(); Snd.pick();
      say(o.one ? v[0] + ' is added.' : fresh.join(' and ') + (fresh.length > 1 ? ' are' : ' is') + ' added.');
      /* a partner's box steps aside, so focus goes on to the kids' box, or rests on the new chip */
      const next = o.one && o.next ? document.getElementById(o.next) : null;
      paint(quiet ? null : o.one ? (next ? null : 'chip') : 'box', fresh);
      if (!quiet && next) next.focus();
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return;
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (inp.value.trim()) add(inp.value); }
      else if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && !inp.value && xs().length) { e.preventDefault(); xs()[xs().length - 1].focus(); }
    });
    /* a pasted list, or a comma typed on a phone's keyboard (which can skip keydown) */
    inp.addEventListener('input', () => { if (/[,;]/.test(inp.value)) add(inp.value); });
    /* a name typed and left without Enter (a tap on Next, or the close mark) still counts */
    inp.addEventListener('change', () => { if (inp.value.trim()) add(inp.value, true); });
    box.addEventListener('click', (e) => { if (!inp.hidden && (e.target === box || e.target === list)) inp.focus(); });
    box.append(list, inp);
    paint();
    f.append(lbl, box);
    if (hint) f.appendChild(hint);
    parent.appendChild(f);
    return f;
  }
  function onbGo(id) {
    const su = view.got.setup;
    if (!su) return;
    const an = su.a;
    if (an) { an.name = properName(an.name); an.partner = properName(an.partner); an.kids = (an.kids || []).map(properName); }
    su.at = id; su.resumed = false;
    saveDraft();
    renderSheet();
    const box = $('sheet');
    box.scrollTop = 0;
    /* a new step opens on its title, so it's read first; a step that's a text box opens on the box */
    const f = box.querySelector('input[data-first]') || box.querySelector('#sheet-h') || box.querySelector('.go');
    if (f) f.focus({ preventScroll: true });
  }

  /* The first start from `from` on a day of the week these answers build that's awake, open, and clear
     of work (set or not), so an example never lands in the middle of a shift. */
  function onbOpen(a, date, dur, from) {
    const base = onbBase(a), d = M.resolveDay(base, date);
    const hard = M.calendarDay(base, date).blocks.filter((b) => (!b.soft || b.cat === 'work') && !b.sleep);
    for (let st = Math.max(d.wake, from); st + dur <= d.bed; st += 15) if (!hard.some((b) => b.start < st + dur && st < b.start + b.dur)) return st;
    return null;
  }
  /* a time the way someone would type it: 6pm, 10:30am */
  const typedTime = (m) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm'); };
  /* The examples on the to-do step, from the person's own week: the gym at an open evening hour
     tomorrow, a haircut on Saturday when Saturday has room. */
  function onbExamples(a) {
    const out = ['Call the dentist by Friday'];
    const tmrw = M.addDays(today, 1);
    /* an early evening hour, or else the first hour after getting ready, never a gym at 11 pm */
    let gym = onbOpen(a, tmrw, 60, 17 * 60);
    if (gym == null || gym > 20 * 60) gym = onbOpen(a, tmrw, 60, M.resolveDay(onbBase(a), tmrw).wake + 60);
    if (gym != null) out.push('Gym tomorrow ' + typedTime(gym));
    const sat = M.addDays(today, (6 - M.weekday(today) + 7) % 7 || 7);
    const cut = onbOpen(a, sat, 60, 10 * 60);
    if (cut != null) out.push('Haircut Saturday ' + typedTime(cut));
    return out;
  }
  /* What adding a timed thing in the setup would do, said before it's added: it fits, it takes time
     from work that's yours to plan, or work is set then and it waits in the to-dos. */
  function onbLands(a, p) {
    const st = onbWeek(a).st, date = M.dateTime(p.date, M.snap(p.start)).date;
    const r = M.placeAdd(st, date, { name: p.name, cat: p.cat || 'yours', icon: p.icon || 'star', dur: p.dur || 30, src: { type: 'custom' } }, M.snap(p.start));
    if (!r || !r.ok) return (r && r.blocker ? (r.blocker.label || r.blocker.name) + ' is locked then' : 'That time is taken') + ', so it waits in your to-dos for that day.';
    const work = M.calendarDay(onbWeek(a).st, date).blocks.find((b) => b.cat === 'work' && b.soft && b.start < r.start + (p.dur || 30) && r.start < b.start + b.dur);
    return work ? 'That’s during ' + (work.label || work.name) + ', ' + M.span(work.start, work.start + work.dur) + '. It takes the time from it.' : 'It goes on the board at that time.';
  }

  /* Look around first, and the welcome's way out by Escape or a click outside it */
  function lookAround() {
    const su = view.got.setup, preview = su && su.mode === 'preview';
    closeSheet();
    if (!preview) toast('This is a sample week for a made up family. Set up yours any time from Sunday Reset, top left.');
  }
  /* The welcome: what it is, in one look, and the way in. The picture explains (the week's blocks
     drop in like tiles, and one of your own lands in open time); the words are a few: a headline, one
     line, three tiles in the board's colors. One strong button where a thumb is, a plain Look around
     first under it, and the rest folded into Other ways in. It fits a phone with its browser bars
     showing, without scrolling. docs/MOBILE-PASS.md. */
  function onbWelcome(box) {
    box.classList.add('welcome');
    /* a preview from Dev draws the sample family too, never the week behind it (which may be real) */
    const preview = view.got.setup && view.got.setup.mode === 'preview';
    const head = el('div', 'onb-w-top');
    if (preview) head.appendChild(el('span', 'onb-from', 'A preview, nothing is saved'));
    else if (sharedBy) { const f = el('span', 'onb-from'); f.append(el('i', '', sharedBy.charAt(0).toUpperCase()), document.createTextNode('From ' + sharedBy)); head.appendChild(f); }
    else head.appendChild(el('span', 'onb-from plain', 'Sunday Reset'));
    box.appendChild(head);
    const hero = el('div', 'onb-hero');
    hero.setAttribute('aria-hidden', 'true');
    const st0 = preview ? D.sampleState(today) : state, ws = M.weekStart(today);
    hero.appendChild(onbWeekRows(st0, ws, false));
    /* one block of your own lands in Saturday's open stretch, after the week has dropped in */
    const sat = hero.querySelectorAll('.onb-row')[6];
    if (sat) {
      const lane = sat.querySelector('.onb-lane'), h = M.visibleHours(st0);
      const lk = W.look({ cat: 'yours' }), drop = el('div', 'onb-b onb-drop');
      drop.style.left = (100 * (10 * 60 - h.start)) / (h.end - h.start) + '%';
      drop.style.width = (100 * 120) / (h.end - h.start) + '%';
      drop.style.background = lk.base;
      if (lane) lane.appendChild(drop);
    }
    hero.appendChild(el('span', 'onb-sample', 'Sample week'));
    box.appendChild(hero);
    const words = el('div', 'onb-w-words');
    const h = el('h2', 'sheet-h', 'Your week, in blocks.'); h.id = 'sheet-h';
    words.append(h, el('p', 'sheet-line', 'Set it up on Sunday. Move anything as the week happens.'));
    const tiles = el('div', 'onb-tiles');
    [['work', 'calendar', 'The whole week'], ['yours', 'sun', 'Time for you'], ['meals', 'pot', 'Dinners, decided']].forEach(([c, ic, t]) => {
      const lk = W.look({ cat: c }), x = el('span', 'onb-tile');
      x.style.background = lk.base; x.style.color = lk.ink;
      x.append(icon(ic, 8, lk.ink), document.createTextNode(t));
      tiles.appendChild(x);
    });
    words.appendChild(tiles);
    box.appendChild(words);
    /* a setup closed halfway on this device picks up where it was, answers and all */
    const go = button('', 'go onb-start', () => { const d = !preview && loadDraft(); if (d) resumeFrom(d, 'first'); else onbGo('name'); });
    go.append(el('b', '', 'Set up my week'), el('small', '', 'About 5 minutes'));
    go.dataset.first = '1';
    const look = button('Look around first', 'small quiet onb-look', lookAround);
    const foot = el('div', 'onb-w-foot');
    foot.append(go, look);
    const keep = el('p', 'onb-keep');
    keep.append(icon('lock', 7, UI.soft), document.createTextNode(Cloud.cfg ? 'Stays on your devices. Nobody else sees it.' : 'Stays on this device. Nobody else sees it.'));
    foot.appendChild(keep);
    box.appendChild(foot);
    if (preview) return;
    /* the ways in almost nobody needs on day one, folded */
    const more = disclosure('Other ways in');
    more.classList.add('onb-more');
    const links = el('div', 'onb-links');
    if (Cloud.cfg) links.appendChild(button('A code from another device', 'link', () => { closeSheet(); view.got.enterCode = true; openDrawer('sync'); }));
    /* the welcome stays until a file is read, so cancelling the picker leaves it where it was */
    links.appendChild(button('A backup file', 'link', () => $('backup-file').click()));
    /* a screen reader, an older computer, or someone who'd rather read than look: the whole app works as a list */
    if (!noDesk && !view.list) links.appendChild(button('The week as a plain list', 'link', () => { setList(true); toast('The week is a list now. Settings, Reading and sound, brings the desk back.'); }));
    more.appendChild(links);
    foot.appendChild(more);
  }

  /* One step of the setup: the bar of its four parts, the part's name, the step, and Back and Next.
     Each step's drawing is in ONB below; a step can rename Next (c.label) or move on by itself.
     The card is one size on every step and every answer (docs/SETUP-CARD-V10.md): the bar, the title,
     and the close mark hold still at the top, Back and Next at the bottom, and only the middle scrolls.
     A redraw of the same step keeps its scroll and puts focus back on the control that had it (data-fk),
     so a tap on a tile never drops someone at the top of the page. */
  function renderSheet() {
    const su = view.got.setup, box = $('sheet');
    if (!su) return;
    if (!OB) { closeSheet(); return; }
    const same = box.dataset.step === su.at && box.classList.contains('onb');
    const was = document.activeElement, oldScroll = box.querySelector('.onb-scroll');
    const keep = { top: same && oldScroll ? oldScroll.scrollTop : 0, fk: su.focusKey || (same && was && box.contains(was) && was.dataset ? was.dataset.fk : null) };
    su.focusKey = null;
    stopOnb();
    box.replaceChildren();
    box.className = 'panel sheet onb';
    fieldSeq = 0;
    if (su.at === 'welcome') { box.dataset.step = 'welcome'; onbWelcome(box); return; }
    const a = su.a, steps = OB.stepsFor(a);
    su.at = OB.nearestStep(steps, su.at);
    box.dataset.step = su.at;
    const i = steps.findIndex((s) => s.id === su.at);
    const step = steps[i];
    box.classList.add('onb-card', 'onb-at-' + step.id);
    const head = el('div', 'onb-head');
    const top = el('div', 'onb-top');
    const prog = el('div', 'onb-prog');
    const bar = el('div', 'onb-bar');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Setup');
    bar.setAttribute('aria-valuemin', '1'); bar.setAttribute('aria-valuemax', String(steps.length)); bar.setAttribute('aria-valuenow', String(i + 1));
    bar.setAttribute('aria-valuetext', 'Step ' + (i + 1) + ' of ' + steps.length);
    /* one way of saying where you are: four named parts, each filling as you go. A part that's done is
       whole gold, the one you're in fills, the rest wait; the names sit under the lengths, so there's
       no second count to reconcile with the bar */
    const parts = OB.progress(steps, i);
    parts.forEach((c) => { const seg = el('span', c.on ? 'on' : c.fill >= 1 ? 'done' : ''); const f = el('i'); f.style.width = Math.round(c.fill * 100) + '%'; seg.appendChild(f); bar.appendChild(seg); });
    const names = el('div', 'onb-bar-names');
    names.setAttribute('aria-hidden', 'true');
    parts.forEach((c) => names.appendChild(el('span', c.on ? 'on' : c.fill >= 1 ? 'done' : '', c.name)));
    bar.setAttribute('aria-valuetext', parts.find((c) => c.on) ? parts.find((c) => c.on).name + ', step ' + (i + 1) + ' of ' + steps.length : 'Step ' + (i + 1) + ' of ' + steps.length);
    prog.append(bar, names);
    top.append(prog, onbCloseButton(su));
    head.appendChild(top);
    /* a setup picked up again says so once, with a way to begin it fresh; a preview says nothing is saved */
    if (su.resumed || su.mode === 'preview') {
      const note = el('div', 'sheet-step');
      note.appendChild(el('span', '', [su.resumed ? 'Where you left off' : '', su.mode === 'preview' ? 'A preview, nothing is saved' : ''].filter(Boolean).join('. ')));
      if (su.resumed && su.mode !== 'preview') note.appendChild(button('Start over', 'onb-link', () => { const nm = su.knownName || a.name; su.a = Object.assign(blankAnswers(), { name: nm }); su.ics = null; su.aheadPlayed = false; view.got.painOther = false; onbGo(nm ? 'home' : 'name'); say('The setup starts over. Your answers were cleared.'); }));
      head.appendChild(note);
    }
    const h = el('h2', 'sheet-h'); h.id = 'sheet-h'; h.tabIndex = -1;
    head.appendChild(h);
    const scroll = el('div', 'onb-scroll'), body = el('div', 'sheet-body');
    scroll.appendChild(body);
    box.append(head, scroll);
    let label = 'Next';
    const nextId = () => { const s2 = OB.stepsFor(a), j = s2.findIndex((s) => s.id === step.id); return j >= 0 && s2[j + 1] ? s2[j + 1].id : null; };
    const c = {
      su, a, box, h, body, step, go: null,
      label: (t) => { label = t; if (c.go) c.go.textContent = t; },
      next: () => { const n = nextId(); if (n) onbGo(n); else finishSetup(); }
    };
    ONB[step.id](c);
    const prev = i > 0 ? steps[i - 1].id : su.mode === 'first' || su.fromWelcome ? 'welcome' : null;
    /* the close mark is the way out on every step, so the first step has Next alone (a spacer keeps it right) */
    const back = prev ? button('Back', 'small quiet', () => onbGo(prev === 'build' ? 'reset' : prev)) : el('span');
    c.go = button(label, 'go', () => c.next());
    if (c.ready) c.ready();
    actions(box, [back, c.go]);
    /* a line under the head and over the buttons only when there's more to scroll to that way */
    const edges = () => { if (!scroll.isConnected) return; box.classList.toggle('edge-top', scroll.scrollTop > 2); box.classList.toggle('edge-end', scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - 2); };
    scroll.addEventListener('scroll', edges, { passive: true });
    if (window.ResizeObserver) { if (onbSize) onbSize.disconnect(); onbSize = new ResizeObserver(edges); onbSize.observe(body); onbSize.observe(scroll); }
    scroll.scrollTop = keep.top;
    requestAnimationFrame(edges);
    if (keep.fk) { const again = box.querySelector('[data-fk="' + keep.fk + '"]'); if (again) again.focus({ preventScroll: true }); }
  }
  let onbSize = null;
  /* The way out, on every step: the answers stay as a draft, so the setup opens again where it was */
  function onbCloseButton(su) {
    const words = su.mode === 'preview' ? 'Close the setup. Nothing is saved.' : 'Close setup. Your answers are kept.';
    const b = button('', 'onb-x', () => closeSetup());
    b.setAttribute('aria-label', words); b.title = words;
    b.appendChild(icon('x', 10, UI.soft));
    return b;
  }
  /* Close the setup from any step, by the close mark, Escape, or a click outside the card. Words typed
     and not yet committed are committed first (a blur fires their change), then the draft is kept and
     marked closed, so a reload doesn't open it again by itself; Set up my week opens it where it was. */
  function closeSetup() {
    const su = view.got.setup, box = $('sheet');
    if (!su || box.hidden) return;
    if (su.at === 'welcome') { lookAround(); return; }
    const f = document.activeElement;
    if (f && box.contains(f) && /^(INPUT|TEXTAREA)$/.test(f.tagName)) f.blur();
    if (!view.got.setup) return;
    /* names get their capitals here too, the same as on the way to the next step */
    const an = su.a;
    if (an) { an.name = properName(an.name); an.partner = properName(an.partner); an.kids = (an.kids || []).map(properName); }
    if (su.mode !== 'preview') saveDraft(true);
    closeSheet();
  }

  const ONB = {
    name(c) {
      const { a, h, body } = c;
      h.textContent = 'First, what should we call you?';
      const nm = textInput(a.name, (v) => { a.name = v; saveDraft(); }, 'Your first name', 30);
      nm.autocomplete = 'given-name'; nm.dataset.first = '1';
      nm.addEventListener('input', () => { a.name = nm.value.trim(); });
      /* Enter moves on; its keypress must not land on the next step's first choice */
      nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); a.name = nm.value.trim(); saveDraft(); setTimeout(c.next, 0); } });
      field(body, 'Your name', nm);
      body.appendChild(el('div', 'field-hint', 'It goes on your board, so the app can talk to you by name.'));
    },
    pains(c) {
      const { a, h, body } = c;
      h.textContent = a.name ? 'What gets in the way, ' + a.name + '?' : 'What gets in the way of your week?';
      body.appendChild(el('p', 'sheet-line', 'Pick any. The rest of the setup follows.'));
      const list = el('div', 'onb-picks onb-tiles2');
      list.setAttribute('role', 'group'); list.setAttribute('aria-labelledby', 'sheet-h');
      const sync = () => c.label('Next');
      OB.painsFor(a.home).forEach((p, k) => {
        const b = el('button', 'onb-pick');
        b.type = 'button'; b.setAttribute('role', 'checkbox');
        const on = () => a.pains.includes(p.id);
        b.setAttribute('aria-checked', String(on()));
        const tick = el('span', 'onb-tick');
        tick.appendChild(icon('check', 7, UI.dark));
        b.append(icon(p.icon, 11, UI.gold), onbWords(p.name, p.line), tick);
        b.addEventListener('click', () => {
          Snd.init(); Snd.pick();
          a.pains = on() ? a.pains.filter((x) => x !== p.id) : a.pains.concat(p.id);
          if (on() && p.help) a.help[p.help] = true;
          if (on() && p.focus && !(a.focus || []).includes(p.focus)) a.focus = (a.focus || []).concat(p.focus);
          b.setAttribute('aria-checked', String(on()));
          saveDraft(); sync();
        });
        if (!k) b.dataset.first = '1';
        list.appendChild(b);
      });
      /* the list can't know everything; their own words count too, behind one more tile */
      const oth = el('button', 'onb-pick onb-other');
      oth.type = 'button';
      oth.setAttribute('aria-expanded', String(!!(a.painOther || view.got.painOther)));
      oth.append(icon('plus', 11, UI.gold), onbWords('Something else', 'In your own words'));
      oth.addEventListener('click', () => { view.got.painOther = true; renderSheet(); setTimeout(() => { const i = $('sheet').querySelector('.onb-other-in input'); if (i) i.focus(); }, 30); });
      list.appendChild(oth);
      body.appendChild(list);
      if (a.painOther || view.got.painOther) {
        const other = textInput(a.painOther || '', (v) => { a.painOther = v; saveDraft(); sync(); }, 'In your words', 80);
        other.addEventListener('input', () => { a.painOther = other.value; sync(); });
        const f = field(body, 'Something else', other);
        if (f && f.classList) f.classList.add('onb-other-in');
      }
      sync();
    },
    /* What changes, from what they picked: their own words on cards that turn over, one after another,
       from a quiet Now side to a gold With Sunday Reset side, like blocks turning over on the desk.
       Then why it works: the strongest study picked, its number big, its finding, what the board does
       about it, and the source, linked; a second study waits folded. Calmer motion shows both sides at
       once, the way they read after the turn. */
    why(c) {
      const { a, h, body } = c;
      const r = OB.reflect(a.pains), calm = onbCalm();
      h.textContent = a.name ? 'Here’s what changes, ' + a.name + '.' : 'Here’s what changes.';
      const cards = el('ul', 'onb-flips' + (calm ? ' calm' : '') + (r.rows.length === 1 ? ' one' : ''));
      cards.setAttribute('aria-label', 'What you picked, and what changes');
      r.rows.forEach((x) => {
        const li = el('li', 'onb-flip');
        const inner = el('div', 'onb-flip-in');
        const now = el('div', 'onb-face onb-face-now');
        const nk = el('span', 'onb-face-k'); nk.append(icon(x.icon, 9, UI.soft), document.createTextNode('Now'));
        now.append(nk, el('b', '', x.name));
        const then = el('div', 'onb-face onb-face-then');
        const tk = el('span', 'onb-face-k'); tk.append(icon(x.icon, 9, UI.dark), document.createTextNode('With Sunday Reset'));
        then.append(tk, el('b', '', x.after), el('small', '', x.how || ''));
        inner.append(now, then);
        li.appendChild(inner);
        cards.appendChild(li);
      });
      body.appendChild(cards);
      /* why it works: the strongest study first; a second waits behind Another study */
      const s = r.cards[0];
      if (s) {
        const why = el('figure', 'onb-proof');
        const k = el('div', 'onb-proof-k'); k.append(icon('book', 9, UI.gold), document.createTextNode('Why it works'));
        const link = el('a', '', s.who + ', ' + s.year);
        link.href = s.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', s.who + ', ' + s.where + ', ' + s.year + '. Opens the study in a new tab.');
        const cite = el('figcaption', 'onb-proof-c'); cite.appendChild(link);
        why.append(k, el('b', 'onb-proof-big', s.big), el('p', 'onb-proof-f', s.small || s.finding), el('p', 'onb-proof-m', s.means), cite);
        body.appendChild(why);
        if (r.cards[1]) { const more = disclosure('Another study'); more.classList.add('onb-more2'); more.appendChild(onbFact(r.cards[1], true)); body.appendChild(more); }
      }
      if (calm) return;
      /* the turn: a beat to read their words, then each card turns over in turn, with a soft tick */
      const flips = [...cards.children];
      flips.forEach((li, k) => onbLater(() => { li.classList.add('over'); Snd.tick(false); }, 900 + k * 420));
      body.classList.add('onb-wait');
      onbLater(() => body.classList.remove('onb-wait'), 900 + flips.length * 420 + 120);
    },
    home(c) {
      const { a, h, body } = c;
      const redraw = () => { saveDraft(); renderSheet(); };
      h.textContent = 'Who’s at home?';
      body.appendChild(el('p', 'sheet-line', 'Drop offs, evenings, and who cooks follow from this.'));
      /* four even tiles, the same as every other choice in the setup, never four buttons of four widths */
      const HOMES = [{ id: 'solo', name: 'Only me', line: 'My own week', icon: 'person' }, { id: 'partner', name: 'Me and a partner', line: 'The two of us', icon: 'heart' }, { id: 'family', name: 'A family with kids', line: 'Drop offs and pick ups', icon: 'people' }, { id: 'shared', name: 'A shared home', line: 'Roommates or relatives', icon: 'house' }];
      const pick = el('div', 'onb-picks onb-tiles2 onb-homes');
      pick.setAttribute('role', 'radiogroup'); pick.setAttribute('aria-labelledby', 'sheet-h');
      HOMES.forEach((x) => {
        const b = el('button', 'onb-pick');
        b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(a.home === x.id));
        b.dataset.fk = 'home-' + x.id;
        if (a.home === x.id) b.dataset.first = '1';
        const tick = el('span', 'onb-tick'); tick.appendChild(icon('check', 7, UI.dark));
        b.append(icon(x.icon, 11, UI.gold), onbWords(x.name, x.line), tick);
        b.addEventListener('click', () => { Snd.init(); Snd.pick(); a.home = x.id; const fit = OB.painsFor(x.id).map((p) => p.id); a.pains = a.pains.filter((y) => fit.includes(y)); redraw(); });
        pick.appendChild(b);
      });
      body.appendChild(pick);
      /* the people, as name chips in the board's colors: a partner is one, kids are a row */
      if (a.home === 'partner' || a.home === 'family') {
        const ppl = el('div', 'onb-people-row');
        peopleField(ppl, { label: 'Partner', cat: 'us', ph: 'Their first name, optional', one: true, next: a.home === 'family' ? 'pp-family' : null, get: () => (a.partner.trim() ? [a.partner.trim()] : []), set: (v) => { a.partner = v[0] || ''; } });
        if (a.home === 'family') peopleField(ppl, { label: 'Kids', cat: 'family', ph: 'Add a kid', hint: 'Press Enter after each name. Each gets their own drop off and pick up times.', get: () => a.kids.slice(), set: (v) => { a.kids = v; } });
        body.appendChild(ppl);
      }
      if (a.home === 'shared') body.appendChild(el('div', 'field-hint', 'Your board is yours. Everyone shares it only if you turn on sync and link their device.'));
    },
    help(c) {
      const { a, h, body } = c;
      h.textContent = 'What should it help with?';
      body.appendChild(el('p', 'sheet-line', 'Pick what matters to you. Settings can change it later.'));
      const partnered = a.home === 'partner' || a.home === 'family';
      a.meals = a.meals || { breakfast: true, lunch: true };
      a.focus = a.focus || [];
      const said = (ids) => OB.PAINS.find((x) => a.pains.includes(x.id) && ids.includes(x.id));
      const mealsOn = () => a.help.dinners !== false || a.meals.breakfast || a.meals.lunch;
      /* every part is a tile, the same as the rest of the setup; a gold dot marks one you said was hard */
      const tiles = el('div', 'onb-picks onb-tiles2 onb-helps');
      tiles.setAttribute('role', 'group'); tiles.setAttribute('aria-labelledby', 'sheet-h');
      const tile = (mark, name, line, isOn, toggle, dot, into, key) => {
        const b = el('button', 'onb-pick');
        b.type = 'button'; b.setAttribute('role', 'checkbox'); b.setAttribute('aria-checked', String(isOn()));
        b.dataset.fk = 'help-' + key;
        const tick = el('span', 'onb-tick'); tick.appendChild(icon('check', 7, UI.dark));
        const w = onbWords(name, line);
        if (dot) { const d = el('span', 'onb-said-dot'); d.title = 'You picked “' + dot.name + '”'; w.firstChild.appendChild(d); }
        b.append(icon(mark, 11, UI.gold), w, tick);
        b.addEventListener('click', () => { Snd.init(); Snd.pick(); toggle(); saveDraft(); renderSheet(); });
        (into || tiles).appendChild(b);
        return b;
      };
      tile('fork', 'Meals', 'Breakfast, lunch, dinner, groceries', mealsOn, () => {
        const on = !mealsOn();
        a.help.dinners = on; a.meals = { breakfast: on, lunch: on };
      }, said(['dinner']), null, 'meals').dataset.first = '1';
      if (partnered) tile('heart', a.partner.trim() ? 'Time with ' + a.partner.trim() : 'Time together', 'An evening idea each week', () => a.help.together !== false, () => { a.help.together = a.help.together === false; }, said(['us']), null, 'together');
      OB.FOCUS.forEach((f) => tile(f.icon, f.name, f.line, () => a.focus.includes(f.id), () => { a.focus = a.focus.includes(f.id) ? a.focus.filter((x) => x !== f.id) : a.focus.concat(f.id); }, OB.PAINS.find((x) => a.pains.includes(x.id) && x.focus === f.id), null, f.id));
      body.appendChild(tiles);
      /* meals are more than dinner: which ones get a time on the board, and dinner's own help. Three
         small check tiles in one row, the same answer as every other choice here (white read as picked) */
      if (mealsOn()) {
        const MEALS = [{ id: 'breakfast', name: 'Breakfast', icon: 'cup' }, { id: 'lunch', name: 'Lunch', icon: 'bowl' }, { id: 'dinner', name: 'Dinner', icon: 'pot' }];
        const row = el('div', 'onb-picks onb-meals');
        MEALS.forEach((m) => tile(m.icon, m.name, '', () => (m.id === 'dinner' ? a.help.dinners !== false : !!a.meals[m.id]), () => {
          if (m.id === 'dinner') a.help.dinners = a.help.dinners === false;
          else a.meals[m.id] = !a.meals[m.id];
        }, null, row, 'meal-' + m.id));
        field(body, 'Which meals?', row);
        body.appendChild(el('div', 'field-hint', 'Breakfast and lunch get a time each day. Dinner also asks who’s cooking and makes the grocery list.'));
      }
      /* what every board has, said once and plainly */
      body.appendChild(el('p', 'onb-also', 'Every board also has to-dos, time of your own, and the Sunday Reset, about 20 minutes each week to plan it.'));
    },
    days(c) {
      const { a, h, body } = c;
      h.textContent = 'When do your days start and end?';
      const pic = el('div', 'onb-week onb-days');
      pic.setAttribute('aria-hidden', 'true');
      const hint = el('div', 'field-hint');
      /* up from 3 am, bed until 3 am the next day: the board widens its hours to fit (Onboard.hoursFor) */
      const hourName = (m) => (m === 1440 ? 'midnight' : M.clock(m % 1440) + (m > 1440 ? ' the next day' : ''));
      const draw = () => {
        pic.replaceChildren();
        const win = OB.hoursFor(a), span = win.end - win.start;
        [['Weekdays', a.wake.wd, a.bed.wd], ['Weekends', a.wake.we, a.bed.we]].forEach(([n, w, b]) => {
          const row = el('div', 'onb-row'), lane = el('div', 'onb-lane thin');
          const seg = (s0, e0, cls) => { const x = el('div', 'onb-b ' + cls); x.style.left = (100 * (s0 - win.start)) / span + '%'; x.style.width = (100 * (e0 - s0)) / span + '%'; return x; };
          if (w > win.start) lane.appendChild(seg(win.start, w, 'sleep'));
          const up = seg(w, Math.min(b, win.end), 'awake');
          up.appendChild(el('small', '', M.hours(b - w) + ' awake'));
          lane.appendChild(up);
          if (b < win.end) lane.appendChild(seg(b, win.end, 'sleep'));
          row.append(el('span', 'onb-day', n), lane);
          pic.appendChild(row);
        });
        const tr = el('div', 'onb-row');
        tr.append(el('span'), onbTicks(win.start, win.end, 3));
        pic.appendChild(tr);
        hint.textContent = 'Your board shows ' + M.clock(win.start) + ' to ' + hourName(win.end) + '.';
      };
      const set = (fn) => (v) => { fn(v); saveDraft(); draw(); };
      const bedName = (m) => M.clock(m % 1440) + (m > 1440 ? ', next day' : '');
      bedName.clock = true;
      /* a bedtime typed as 1 am means the night after */
      const late = (v) => M.clamp(v < 600 ? v + 1440 : v, 1140, 1620);
      const r1 = el('div', 'row2');
      /* half hours a tap, and any time typed: a 10 am start is a few taps, or one */
      field(r1, 'Weekdays, up at', liveStepper(() => a.wake.wd, set((v) => { a.wake.wd = M.clamp(v, 180, 720); }), M.clock, 30));
      field(r1, 'Bed at', liveStepper(() => a.bed.wd, set((v) => { a.bed.wd = late(v); }), bedName, 30));
      const r2 = el('div', 'row2');
      field(r2, 'Weekends, up at', liveStepper(() => a.wake.we, set((v) => { a.wake.we = M.clamp(v, 180, 720); }), M.clock, 30));
      field(r2, 'Bed at', liveStepper(() => a.bed.we, set((v) => { a.bed.we = late(v); }), bedName, 30));
      body.append(r1, r2, pic, hint);
      draw();
    },
    work(c) {
      const { a, h, body } = c;
      const redraw = () => { saveDraft(); renderSheet(); };
      h.textContent = 'When do you work?';
      const pic = el('div');
      const draw = () => { pic.replaceChildren(el('div', 'lbl', 'Your week so far'), onbWeekRows(onbBase(a), M.weekStart(today), !phoneWidth())); };
      const set = (fn) => (v) => { fn(v); saveDraft(); draw(); };
      /* the week the answers make sits on top, where a change shows without scrolling */
      body.appendChild(pic);
      const off = toggle('No set work hours', a.noWork, (v) => { a.noWork = v; redraw(); });
      body.appendChild(off);
      if (!a.noWork) {
        field(body, 'Days', dayChips(a.work.days, (v) => { a.work.days = a.work.days.includes(v) ? a.work.days.filter((x) => x !== v) : a.work.days.concat(v); redraw(); }));
        /* set hours lock, so nothing placed later lands in the middle of a shift */
        /* two answers, two equal halves */
        const two = chips([{ id: 'plan', name: 'Mine to plan' }, { id: 'set', name: 'Set, like a shift' }], workFixed(a) ? 'set' : 'plan', (v) => { a.work.fixed = v === 'set'; redraw(); });
        two.classList.add('onb-two');
        field(body, 'Your work hours are', two);
        body.appendChild(el('div', 'field-hint', workFixed(a) ? 'Locked. Nothing you add goes inside it.' : 'Focus blocks and to-dos can go inside it.'));
        body.appendChild(toggle('My hours change week to week', !!a.work.varies, (v) => { a.work.varies = v; redraw(); }));
        if (a.work.varies) body.appendChild(el('div', 'field-hint', 'Set your usual hours. Next, bring in your schedule.'));
        body.appendChild(toggle('The same hours every day', a.work.same, (v) => { a.work.same = v; redraw(); }));
        if (a.work.same) {
          const r = el('div', 'row2');
          field(r, 'Starts', liveStepper(() => a.work.start, set((v) => { a.work.start = M.clamp(v, 300, a.work.end - 60); }), M.clock, 30));
          field(r, 'Ends', liveStepper(() => a.work.end, set((v) => { a.work.end = M.clamp(v, a.work.start + 60, 1410); }), M.clock, 30));
          body.appendChild(r);
        } else {
          /* shifts: each day its own hours */
          [1, 2, 3, 4, 5, 6, 0].filter((wd) => a.work.days.includes(wd)).forEach((wd) => {
            const hrs = a.work.hours[wd] || (a.work.hours[wd] = { start: a.work.start, end: a.work.end });
            const r = el('div', 'row2');
            field(r, M.DAY_LONG[wd] + ', starts', liveStepper(() => hrs.start, set((v) => { hrs.start = M.clamp(v, 300, hrs.end - 60); }), M.clock, 30));
            const endStep = liveStepper(() => hrs.end, set((v) => { hrs.end = M.clamp(v, hrs.start + 60, 1410); }), M.clock, 30);
            field(r, 'Ends', endStep);
            endStep.name(M.DAY_LONG[wd] + ', ends');
            body.appendChild(r);
          });
          body.appendChild(el('div', 'field-hint', 'Weeks that alternate, like days one week and nights the next, can be set up after, in Settings under Usual days.'));
        }
      }
      draw();
    },
    kids(c) {
      const { a, h, body } = c;
      const redraw = () => { saveDraft(); renderSheet(); };
      h.textContent = 'Drop off and pick up';
      body.appendChild(el('p', 'sheet-line', 'They lock on the board, so nothing pushes them.'));
      const fresh = () => ({ days: !a.noWork && a.work.days.length ? a.work.days.slice() : [1, 2, 3, 4, 5], drop: 510, pick: 1005, other: false });
      a.kids.forEach((k, n) => {
        const cr = a.cares[k] || (a.cares[k] = fresh());
        const card = el('div', 'dcard');
        card.appendChild(el('div', 'dcard-h', k));
        /* kids on the same run take one tap, not every day and time set twice */
        const first = n > 0 ? a.cares[a.kids[0]] || (a.cares[a.kids[0]] = fresh()) : null;
        if (first) card.appendChild(button('Same as ' + a.kids[0], 'onb-suggest onb-same', () => { Object.assign(cr, { days: first.days.slice(), drop: first.drop, pick: first.pick, other: first.other }); Snd.pick(); redraw(); say(k + ' has the same days and times as ' + a.kids[0] + '.'); }));
        card.appendChild(toggle('Someone else handles it', cr.other, (v) => { cr.other = v; redraw(); }));
        if (!cr.other) {
          field(card, 'Days', dayChips(cr.days, (v) => { cr.days = cr.days.includes(v) ? cr.days.filter((x) => x !== v) : cr.days.concat(v); saveDraft(); }));
          const r = el('div', 'row2');
          field(r, 'Drop off at', liveStepper(() => cr.drop, (v) => { cr.drop = M.clamp(v, 300, 720); saveDraft(); }, M.clock));
          field(r, 'Pick up at', liveStepper(() => cr.pick, (v) => { cr.pick = M.clamp(v, 720, 1260); saveDraft(); }, M.clock));
          card.appendChild(r);
        }
        body.appendChild(card);
      });
    },
    calendar(c) {
      const { su, h, body } = c;
      const varies = !c.a.noWork && c.a.work.varies;
      h.textContent = varies ? 'Bring in your schedule?' : 'Bring in a calendar?';
      body.appendChild(el('p', 'sheet-line', varies ? 'A schedule file puts each shift where it is, locked.' : 'Shifts, school dates, appointments. You can hide it any time.'));
      const slot = el('div', 'onb-parts');
      body.appendChild(slot);
      const draw = () => {
        slot.replaceChildren();
        if (su.ics) {
          const card = el('div', 'onb-part');
          card.append(icon('calendar', 11, UI.gold), onbWords(su.ics.name, plural(su.ics.items.length, 'event', 'events') + ' will come in' + (su.ics.more ? ', the nearest ones' : '')));
          const rm = button('Take it out', 'small quiet', () => { su.ics = null; draw(); c.label('Next'); });
          rm.dataset.first = '1';
          card.appendChild(rm);
          slot.appendChild(card);
          /* the sample week's people are still on the board behind this, so these names come from the kinds themselves */
          field(slot, 'Kind of time', chips(['work', 'family', 'yours', 'home', 'meals'].map((k) => ({ id: k, name: D.CATS[k].name, color: palette()[k].base })), su.ics.cat, (v) => { su.ics.cat = v; }));
          return;
        }
        const pick = el('input');
        pick.type = 'file'; pick.accept = '.ics,text/calendar'; pick.hidden = true;
        pick.addEventListener('change', () => {
          const f = pick.files[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = () => {
            const r = M.parseIcs(String(rd.result), M.addDays(today, -30), M.addDays(today, 400), 800, { tz: homeTz() });
            if (!r.items.length) { Snd.bad(); toast('No events found in that file. It needs to be a calendar file ending in .ics.', 'bad'); return; }
            su.ics = { name: r.name || f.name.replace(/\.ics$/i, ''), cat: 'work', items: r.items, more: r.more };
            Snd.good(); draw(); c.label('Next');
          };
          rd.readAsText(f);
        });
        const card = el('div', 'onb-part');
        const b = button('Choose a file', 'small', () => pick.click());
        b.dataset.first = '1';
        card.append(icon('calendar', 11, UI.gold), onbWords('From a calendar file', 'A file ending in .ics, exported from Google, Apple, or Outlook.'), b, pick);
        slot.appendChild(card);
        const how = disclosure('How to get the file');
        [['Google Calendar', 'On a computer: Settings, Import and export, Export. Open the zip it downloads and pick the calendar you want.'], ['Apple Calendar', 'On a Mac: pick the calendar in the list, then File, Export, Export.'], ['Outlook', 'File, Save Calendar. On the web: Settings, Calendar, Shared calendars, Publish a calendar, then download the ICS link.']].forEach(([n, t]) => { const p = el('p'); p.append(el('b', '', n + '. '), document.createTextNode(t)); how.appendChild(p); });
        slot.appendChild(how);
        if (Cloud.cfg) slot.appendChild(el('div', 'field-hint', 'A calendar that stays current from a link can be added after, in Settings under Calendars.'));
      };
      draw();
      c.label('Next');
    },
    /* Try it: the person's own tomorrow, from their answers, with three blocks to drag onto it and
       then stretch, on a copy of the week through the real model. Placing pushes what would move on
       the board; a locked block refuses. Idle for a few seconds and it shows how, with a button that
       does it. */
    try(c) {
      const { a, h, body } = c;
      const date = M.addDays(today, 1);
      h.textContent = 'Put something on ' + M.DAY_LONG[M.weekday(date)];
      const line = el('p', 'sheet-line onb-say');
      line.setAttribute('aria-live', 'polite');
      const board = el('div', 'onb-board'), tray = el('div', 'onb-tray'), helpRow = el('div', 'onb-help');
      body.append(line, board, tray, helpRow);
      const base = onbBase(a), day0 = M.resolveDay(base, date), win = M.visibleHours(base);
      const lo = Math.max(win.start, Math.floor((day0.wake - 30) / 60) * 60), hi = Math.min(win.end, Math.ceil((day0.bed + 30) / 60) * 60);
      const pieces = ['workout', 'walk', 'reading'].map((id) => base.palette.find((p) => p.id === id)).filter(Boolean);
      /* a block placed on a setup started another day was for that day's tomorrow, not this one's */
      if (a.placed && a.placed.date !== date) { a.placed = null; saveDraft(); }
      let phase = !a.placed ? 'place' : a.placed.stretched ? 'done' : 'stretch';
      let lane = null, mineId = null, hintT = null;
      const toMin = (x) => { const r = lane.getBoundingClientRect(); return lo + ((x - r.left) / r.width) * (hi - lo); };
      const near = (x, y) => { const r = lane.getBoundingClientRect(); return x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 48 && y <= r.bottom + 48; };
      const words = {
        place: 'Drag a block into tomorrow, or tap one. It slides in where it fits; locked things' + (a.home === 'family' && a.kids.length ? ', like a pick up,' : setupInput(a).work && workFixed(a) ? ', like work,' : '') + ' never move.',
        stretch: 'Now drag its right edge to make it longer. Everything after it makes room.',
        done: 'That’s the whole idea: everything on your board moves like this. Next, see further ahead.'
      };
      const ghost = el('div', 'onb-ghost');
      const ghostAt = (start, dur, ok) => {
        if (start == null) { ghost.remove(); return; }
        ghost.className = 'onb-ghost' + (ok ? '' : ' no');
        ghost.style.left = (100 * (start - lo)) / (hi - lo) + '%';
        ghost.style.width = (100 * dur) / (hi - lo) + '%';
        if (ghost.parentNode !== lane) lane.appendChild(ghost);
      };
      const draw = () => {
        stopDemo();
        const w = onbWeek(a);
        mineId = w.add ? w.add.id : null;
        board.replaceChildren();
        lane = onbLane(w.st, date, lo, hi, { mine: mineId });
        board.append(el('div', 'onb-board-h', 'Tomorrow, ' + M.DAY_LONG[M.weekday(date)]), lane, onbTicks(lo, hi, 3));
        tray.replaceChildren();
        tray.hidden = phase !== 'place';
        if (phase === 'place') pieces.forEach((p, k) => tray.appendChild(pieceChip(p, k)));
        if (phase !== 'place' && mineId) {
          const mine = [...lane.querySelectorAll('[data-add="' + mineId + '"]')].pop();
          if (mine) {
            const grip = el('button', 'onb-grip' + (phase === 'stretch' ? ' pulse' : ''));
            grip.type = 'button';
            grip.setAttribute('aria-label', 'Length of ' + a.placed.add.name + '. Now ' + M.dur(a.placed.dur) + '. Arrow keys make it longer or shorter.');
            grip.addEventListener('pointerdown', (e) => stretchDrag(e, grip, mine));
            grip.addEventListener('keydown', (e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault(); e.stopPropagation();
              stopDemo();
              stretchTo(a.placed.dur + (e.key === 'ArrowRight' ? 15 : -15), true);
            });
            mine.appendChild(grip);
          }
        }
        line.textContent = words[phase];
        /* once something is placed it's kept, so the way on says Next, and it can be taken back */
        c.label('Next');
        hint();
      };
      const takeOff = () => { a.placed = null; phase = 'place'; saveDraft(); Snd.slide(); draw(); const f = tray.querySelector('.onb-piece'); if (f) f.focus({ preventScroll: true }); };
      /* a block pressed instead of dragged lands where an hour after it is open or soft, so the stretch
         that comes next has room and never starts against a locked drop off. Work hours count as taken:
         a workout cut into the work day teaches the wrong thing */
      const roomyStart = (dur) => {
        const hard = M.calendarDay(base, date).blocks.filter((b) => (!b.soft || b.cat === 'work') && !b.sleep);
        for (let s = Math.max(day0.wake, 420); s + dur + 60 <= day0.bed; s += 15) {
          if (hard.some((b) => b.start < s + dur + 60 && s < b.start + b.dur)) continue;
          const fit = M.canPlace(base, date, dur + 60, s);
          if (fit.ok && !(fit.pushes || []).length) return s;
        }
        return M.firstFit(base, date, dur, Math.max(day0.wake, 420));
      };
      /* a block from the tray: drag it onto the lane, or press it to put it in the first roomy spot */
      const pieceChip = (p, k) => {
        const chip = el('button', 'onb-piece');
        chip.type = 'button';
        const lk = W.look(p);
        chip.style.background = lk.base; chip.style.color = lk.ink;
        chip.append(icon(p.icon, 9, lk.ink), el('b', '', p.name), el('small', '', M.dur(p.dur)));
        chip.setAttribute('aria-label', p.name + ', ' + M.dur(p.dur) + '. Drag it onto tomorrow, or press to put it in the first open time.');
        if (!k) chip.dataset.first = '1';
        chip.addEventListener('pointerdown', (e) => pieceDrag(e, chip, p));
        chip.addEventListener('click', () => { if (chip.dataset.dragged) { delete chip.dataset.dragged; return; } const s = roomyStart(p.dur); if (s != null) drop(p, { start: s, ok: true, fit: M.canPlace(base, date, p.dur, s) }); });
        return chip;
      };
      const pieceDrag = (e, chip, p) => {
        if (e.button !== 0) return;
        stopDemo(); stopHint();
        const d = onbDrag = { float: null, spot: null, x: e.clientX, y: e.clientY, moved: false };
        try { chip.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        const move = (ev) => {
          if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 5) return;
          if (!d.moved) {
            d.moved = true; chip.dataset.dragged = '1'; Snd.pick();
            d.float = chip.cloneNode(true); d.float.className = 'onb-piece onb-float'; d.float.removeAttribute('data-first');
            document.body.appendChild(d.float);
            chip.classList.add('lifted');
          }
          d.float.style.transform = 'translate(' + (ev.clientX - 34) + 'px, ' + (ev.clientY - 22) + 'px)';
          if (near(ev.clientX, ev.clientY)) {
            const start = M.clamp(Math.round((toMin(ev.clientX) - p.dur / 2) / 15) * 15, lo, hi - p.dur);
            const fit = M.canPlace(base, date, p.dur, start);
            if (!d.spot || d.spot.start !== start) Snd.detent(fit.ok);
            d.spot = { start, ok: fit.ok, fit };
            ghostAt(start, p.dur, fit.ok);
          } else { d.spot = null; ghostAt(null); }
        };
        const up = () => {
          chip.removeEventListener('pointermove', move); chip.removeEventListener('pointerup', up); chip.removeEventListener('pointercancel', up);
          chip.classList.remove('lifted');
          if (d.float) d.float.remove();
          ghostAt(null);
          onbDrag = null;
          if (d.moved && d.spot) drop(p, d.spot);
          else if (d.moved) hint();
        };
        chip.addEventListener('pointermove', move); chip.addEventListener('pointerup', up); chip.addEventListener('pointercancel', up);
      };
      const drop = (p, spot) => {
        if (!spot.ok) {
          Snd.bad();
          const by = spot.fit && spot.fit.blocker;
          line.textContent = (by ? (by.label || by.name) + ' is locked there' : 'Something locked is there') + ', so nothing goes over it. Try open time.';
          hint();
          return;
        }
        const before = M.resolveWindow(onbWeek(a, null).st, date).blocks.filter((b) => !b.sleep && !b.soft);
        a.placed = { date, start: spot.start, dur: p.dur, add: { name: p.name, cat: p.cat, icon: p.icon, dur: p.dur, src: { type: 'block', id: p.id } } };
        const w = onbWeek(a);
        if (!w.add) { a.placed = null; Snd.bad(); return; }
        Snd.clack(p.dur / 60);
        const after = M.resolveWindow(w.st, date).blocks;
        const moved = before.filter((b) => { const x = after.find((y) => y.key === b.key); return x && x.start !== b.start; }).map((b) => (b.label || b.name) + ' moves to ' + M.clock(after.find((y) => y.key === b.key).start));
        phase = 'stretch';
        saveDraft();
        draw();
        line.textContent = p.name + ', ' + M.span(spot.start, spot.start + p.dur) + '. ' + (moved.length ? moved.join(', ') + ' to make room. ' : 'Nothing else moved. ') + words.stretch;
        const g = lane.querySelector('.onb-grip');
        if (g) g.focus({ preventScroll: true });
        /* the stretch is shown once too, after a beat to read where it landed */
        if (!shown.stretch) demoT = onbLater(playDemo, 1400);
      };
      /* the stretch: the longest it can be up to what was asked, the way the board decides it */
      /* w is the week with the block on it; a drag builds it once and asks it on every move */
      const fitDur = (want, w) => {
        if (!w.add) return a.placed.dur;
        const r = M.canResize(w.st, date, 'add:' + w.add.id, Math.max(15, want));
        return r && r.ok ? r.dur : a.placed.dur;
      };
      const stretchTo = (want, keep) => {
        const dur = fitDur(Math.round(want / 15) * 15, onbWeek(a));
        if (dur === a.placed.dur && !keep) return;
        if (dur !== a.placed.dur) Snd.stretch();
        a.placed.dur = dur; a.placed.stretched = true;
        phase = 'done';
        saveDraft();
        draw();
        line.textContent = a.placed.add.name + ' is ' + M.dur(dur) + ' now, ' + M.span(a.placed.start, a.placed.start + dur) + '. ' + words.done;
        if (keep) { const g = lane.querySelector('.onb-grip'); if (g) g.focus({ preventScroll: true }); }
        Snd.good();
      };
      const stretchDrag = (e, grip, mine) => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        stopDemo(); stopHint();
        const d = onbDrag = { float: null, dur: a.placed.dur, w: onbWeek(a) };
        try { grip.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        Snd.pick();
        const move = (ev) => {
          const want = Math.max(15, Math.round((toMin(ev.clientX) - a.placed.start) / 15) * 15);
          const dur = fitDur(want, d.w);
          if (dur !== d.dur) { Snd.detent(true); d.dur = dur; }
          mine.style.width = (100 * Math.min(dur, hi - a.placed.start)) / (hi - lo) + '%';
        };
        const up = () => {
          grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
          onbDrag = null;
          if (d.dur !== a.placed.dur) stretchTo(d.dur); else hint();
        };
        grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
      };
      /* The coach: when the step opens, the move is shown once (a pointer carries the first block from
         the tray to a roomy spot on tomorrow, then takes it back), and the same for the stretch once a
         block is placed. Then it's their turn, with Show me again. Anything they touch stops it, and
         calmer motion shows where it would land without the glide. After a few quiet seconds the idle
         hint still shows the spot and offers Do it for me. */
      let demo = null, demoT = null;
      const shown = { place: false, stretch: false };
      const say1 = (t) => el('span', 'onb-help-t', t);
      const again = () => button('Show me again', 'small quiet', () => playDemo());
      const doIt = () => (phase === 'place'
        ? button('Do it for me', 'small', () => { const p = pieces[0], s = roomyStart(p.dur); if (s != null) drop(p, { start: s, ok: true, fit: M.canPlace(base, date, p.dur, s) }); })
        : button('Do it for me', 'small', () => stretchTo(a.placed.dur + 30)));
      const off = () => button('Take it off', 'small quiet', takeOff);
      /* the row at rest: their turn, once they've been shown; Take it off once something is placed */
      function stopHint() {
        clearTimeout(hintT);
        const turn = phase !== 'done' && shown[phase];
        helpRow.replaceChildren(...[turn ? say1('Your turn.') : null, turn ? again() : null, phase !== 'place' ? off() : null].filter(Boolean));
      }
      /* after a few quiet seconds, show the spot again and offer to do it */
      function hint() {
        stopHint();
        if (phase === 'done' || demo) return;
        hintT = onbLater(() => {
          if (onbDrag || demo) return;
          if (phase === 'place') {
            const p = pieces[0], s = roomyStart(p.dur);
            if (s == null) return;
            if (!onbCalm()) { ghostAt(s, p.dur, true); ghost.classList.add('show'); onbLater(() => { if (!onbDrag && !demo) ghostAt(null); }, 2400); }
            helpRow.replaceChildren(say1('Like this: ' + p.name + ' at ' + M.clock(s) + '.'), again(), doIt());
          } else {
            helpRow.replaceChildren(say1('Drag the dotted edge to the right.'), again(), doIt(), off());
          }
        }, 6000);
      }
      function stopDemo() {
        clearTimeout(demoT); demoT = null;
        if (!demo) return;
        const d = demo;
        demo = null;
        d.timers.forEach(clearTimeout);
        d.nodes.forEach((n) => n.remove());
        if (d.chip) d.chip.classList.remove('lifted');
        if (d.grow) d.grow.getAnimations().forEach((x) => x.cancel());
        ghost.getAnimations().forEach((x) => x.cancel());
        ghost.classList.remove('demo', 'filled');
        ghost.style.removeProperty('--fill');
        ghostAt(null);
      }
      /* one showing of the move for this phase: place carries a block over, stretch pulls an edge */
      function playDemo() {
        stopDemo(); clearTimeout(hintT);
        if (phase === 'done' || onbDrag || !lane || !body.isConnected) return;
        const calm = onbCalm(), d = demo = { timers: [], nodes: [], chip: null };
        /* onbLater, so moving to another step clears a showing's last beats with everything else */
        const at = (ms, fn) => { d.timers.push(onbLater(() => { if (demo === d) fn(); }, ms)); };
        const B = body.getBoundingClientRect();
        const rel = (r) => ({ x: r.left - B.left + r.width / 2, y: r.top - B.top + r.height / 2, w: r.width, h: r.height });
        const move = (n, from, to, ms, ease, s0, s1, r0, r1) => n.animate([
          { transform: 'translate(' + from.x + 'px, ' + from.y + 'px) translate(-50%, -50%) scale(' + (s0 == null ? 1 : s0) + ') rotate(' + (r0 || 0) + 'deg)' },
          { transform: 'translate(' + to.x + 'px, ' + to.y + 'px) translate(-50%, -50%) scale(' + (s1 == null ? 1 : s1) + ') rotate(' + (r1 || 0) + 'deg)' }
        ], { duration: calm ? 0 : ms, easing: ease || 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
        const fade = (n, o0, o1, ms) => n.animate([{ opacity: o0 }, { opacity: o1 }], { duration: calm ? 0 : ms, fill: 'forwards', composite: 'replace' });
        const pt = el('div', 'onb-pointer'); pt.setAttribute('aria-hidden', 'true');
        const tip = el('i'); pt.appendChild(tip);
        const press = (down) => tip.animate([{ transform: 'scale(' + (down ? 1 : 0.78) + ')' }, { transform: 'scale(' + (down ? 0.78 : 1) + ')' }], { duration: calm ? 0 : 140, fill: 'forwards' });
        const words = phase === 'place' ? 'Watch: drag a block onto the day.' : 'Watch: drag the right edge to make it longer.';
        helpRow.replaceChildren(say1(words), ...(phase === 'stretch' ? [off()] : []));
        say(words);
        const end = (ms) => at(ms, () => {
          stopDemo();
          shown[phase] = true;
          hint();
          say('Your turn.');
        });
        if (phase === 'place') {
          const chip = tray.querySelector('.onb-piece'), p = pieces[0], s = p && roomyStart(p.dur);
          if (!chip || s == null) { demo = null; hint(); return; }
          const lk = W.look(p);
          ghostAt(s, p.dur, true);
          ghost.classList.add('demo');
          ghost.style.setProperty('--fill', lk.base);
          /* the spot shows as the block nears it, never before it sets off */
          if (!calm) ghost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 1220, fill: 'backwards' });
          const cr = rel(chip.getBoundingClientRect()), gr = rel(ghost.getBoundingClientRect());
          const fl = chip.cloneNode(true);
          fl.className = 'onb-piece onb-demo-piece'; fl.removeAttribute('data-first'); fl.setAttribute('aria-hidden', 'true'); fl.tabIndex = -1;
          fl.style.width = cr.w + 'px';
          body.append(fl, pt);
          d.nodes.push(fl, pt); d.chip = chip;
          const grab = { x: cr.x + cr.w * 0.18, y: cr.y + cr.h * 0.2 }, off2 = { x: grab.x - cr.x, y: grab.y - cr.y };
          const land = { x: gr.x, y: gr.y }, lift = { x: cr.x, y: cr.y - 6 };
          fl.style.opacity = '0';
          move(pt, { x: grab.x, y: grab.y + 14 }, grab, 180, 'ease-out'); fade(pt, 0, 1, 180);
          if (calm) {
            /* calmer motion: where it lands, at once, and the pointer resting there */
            move(pt, grab, { x: land.x + off2.x * 0.3, y: land.y + off2.y * 0.3 }, 0);
            ghost.classList.add('filled');
            end(1900);
            return;
          }
          at(340, () => { press(true); chip.classList.add('lifted'); fl.style.opacity = '1'; move(fl, cr, lift, 160, 'ease-out', 1, 1.06, 0, -3); });
          at(520, () => {
            move(fl, lift, land, 1100, null, 1.06, 1.02, -3, -1);
            move(pt, grab, { x: land.x + off2.x, y: land.y + off2.y }, 1100);
          });
          at(1640, () => {
            move(fl, land, land, 200, 'ease-in', 1.02, 0.5, -1, 0); fade(fl, 1, 0, 200);
            ghost.classList.add('filled'); press(false);
          });
          /* it goes back to the tray: this one was only a showing */
          at(2600, () => {
            ghost.classList.remove('filled');
            fade(fl, 0, 1, 160); move(fl, land, cr, 700, null, 0.6, 1, 0, 0);
            move(pt, { x: land.x + off2.x, y: land.y + off2.y }, grab, 700);
            ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
          });
          at(3320, () => { fade(fl, 1, 0, 140); fade(pt, 1, 0, 180); chip.classList.remove('lifted'); });
          end(3560);
        } else {
          /* the block itself grows under the pointer, the way it will under theirs, then goes back */
          const mine = mineId && [...lane.querySelectorAll('[data-add="' + mineId + '"]')].pop(), grip = mine && mine.querySelector('.onb-grip');
          const longer = fitDur(a.placed.dur + 60, onbWeek(a));
          if (!grip || longer <= a.placed.dur) { demo = null; hint(); return; }
          const L = lane.getBoundingClientRect(), perMin = L.width / (hi - lo);
          const gr = rel(grip.getBoundingClientRect()), dx = (longer - a.placed.dur) * perMin;
          const w0 = (100 * Math.min(a.placed.dur, hi - a.placed.start)) / (hi - lo), w1 = (100 * Math.min(longer, hi - a.placed.start)) / (hi - lo);
          body.appendChild(pt);
          d.nodes.push(pt);
          d.grow = mine;
          const grow = (from, to, ms) => mine.animate([{ width: from + '%' }, { width: to + '%' }], { duration: calm ? 0 : ms, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
          const g0 = { x: gr.x, y: gr.y + 6 }, g1 = { x: gr.x + dx, y: gr.y + 6 };
          move(pt, { x: g0.x, y: g0.y + 14 }, g0, 180, 'ease-out'); fade(pt, 0, 1, 180);
          if (calm) {
            /* calmer motion: the longer block at once, the pointer at its new edge */
            grow(w0, w1, 0);
            move(pt, g0, g1, 0);
            end(1900);
            return;
          }
          at(340, () => press(true));
          at(500, () => { move(pt, g0, g1, 1000); grow(w0, w1, 1000); });
          at(2300, () => { press(false); move(pt, g1, g0, 560); grow(w1, w0, 560); });
          at(2960, () => fade(pt, 1, 0, 180));
          end(3200);
        }
      }
      /* a touch anywhere on the step stops a showing; it never plays under someone's hand */
      body.addEventListener('pointerdown', () => { if (demo || demoT) { stopDemo(); stopHint(); } }, true);
      body.addEventListener('keydown', () => { if (demo || demoT) { stopDemo(); stopHint(); } }, true);
      draw();
      /* when the step opens, it's shown once */
      if (phase !== 'done') demoT = onbLater(playDemo, 700);
    },
    /* See further ahead: when it opens, the zoom plays once by itself (Day, Week, Month, Year), each
       with one line for what it's for, and an example trip about three months out marked where it
       lands, so the idea is seen before anything is asked. The example is only a picture: nothing goes
       on the board unless they keep it or type a name of their own (then it's a marker). Anything
       touched stops the showing, and Show me again plays it again. Calmer motion cuts from level to
       level with nothing moving. (Until Oct 13 it opened on the week and never moved by itself;
       Russell asked to be shown, docs/SETUP-CARD-V10.md.) */
    ahead(c) {
      const { su, a, h, body } = c;
      h.textContent = 'See further ahead';
      const EX = 'Beach trip';
      /* the example lands on a Saturday about three months out, the way a trip would */
      const exDate = (() => { const d = M.addMonths(today, 3); return M.addDays(d, (6 - M.weekday(d) + 7) % 7); })();
      const s = a.soon ? { name: a.soon.name, date: a.soon.date } : { name: '', date: exDate };
      const own = () => !!s.name.trim();
      /* what the zoom shows: theirs once there's a name, or the example */
      const marked = () => (s.date ? { name: own() ? s.name.trim() : EX, date: s.date, example: !own() } : null);
      const LV = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];
      const LINE = {
        day: () => 'Day: tomorrow, hour by hour.',
        week: () => 'Week: your seven days, side by side.',
        month: () => { const m = marked(); return 'Month: what’s coming up.' + (m ? ' ' + m.name + ' is on ' + M.dateText(m.date, 'day') + '.' : ''); },
        year: () => { const m = marked(); return 'Year: the months ahead' + (m ? ', and where ' + m.name + ' lands.' : '.'); }
      };
      const zrow = el('div', 'onb-zrow');
      const tabs = el('div', 'onb-zoom zoom panel');
      tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Zoom');
      const zline = el('p', 'onb-zline');
      const replay = button('Show me again', 'small quiet onb-replay', () => { Snd.init(); play(); });
      zrow.append(tabs, zline, replay);
      const stage = el('div', 'onb-stage');
      body.append(zrow, stage);
      const st = onbWeek(a).st, tomorrow = M.addDays(today, 1);
      let at = 'day', playing = [];
      LV.forEach(([z, t]) => { const b = el('button', '', t); b.type = 'button'; b.dataset.fk = 'zoom-' + z; b.addEventListener('click', () => { Snd.init(); stopPlay(); if (z !== at) Snd.zoom(LV.findIndex((x) => x[0] === z) > LV.findIndex((x) => x[0] === at)); show(z); }); b.dataset.z = z; tabs.appendChild(b); });
      /* a marker on the month and the year: solid once it's theirs, dashed while it's the example */
      const tag = (m) => { const t = el('em', '', m.name); t.prepend(icon(OB.markFor(m.name), 7, UI.dark)); if (m.example) t.title = m.name + ', an example'; return t; };
      const draw = (z) => {
        const box = el('div', 'onb-level ' + z);
        const m = marked();
        if (z === 'day') {
          const d0 = M.resolveDay(st, tomorrow), win = M.visibleHours(st), lo = Math.max(win.start, Math.floor((d0.wake - 30) / 60) * 60), hi = Math.min(win.end, Math.ceil((d0.bed + 30) / 60) * 60), w0 = onbWeek(a);
          box.append(el('div', 'onb-board-h', 'Tomorrow, ' + M.DAY_LONG[M.weekday(tomorrow)]), onbLane(st, tomorrow, lo, hi, { mine: w0.add ? w0.add.id : null }), onbTicks(lo, hi, 3));
        } else if (z === 'week') {
          box.append(el('div', 'onb-board-h', 'This week'), onbWeekRows(st, M.weekStart(today)));
        } else if (z === 'month') {
          const ref = m ? m.date : today, ms = M.monthStart(ref), first = M.weekStart(ms);
          box.appendChild(el('div', 'onb-board-h', M.MONTH_LONG[+ms.slice(5, 7) - 1] + ' ' + ms.slice(0, 4)));
          const grid = el('div', 'onb-month');
          M.range(first, 42).forEach((d, k) => {
            if (k >= 35 && d.slice(0, 7) !== ms.slice(0, 7)) return;
            const hit = m && d === m.date;
            const cell = el('div', 'onb-cell' + (d.slice(0, 7) !== ms.slice(0, 7) ? ' out' : '') + (d === today ? ' today' : '') + (hit ? ' mark' + (m.example ? ' example' : '') : ''));
            cell.appendChild(el('span', 'n', String(+d.slice(8))));
            cell.appendChild(onbLane(st, d, M.visibleHours(st).start, M.visibleHours(st).end, { thin: true }));
            if (hit) cell.appendChild(tag(m));
            grid.appendChild(cell);
          });
          box.appendChild(grid);
        } else {
          box.appendChild(el('div', 'onb-board-h', 'The next 12 months'));
          const grid = el('div', 'onb-year');
          for (let k = 0; k < 12; k++) {
            const ms = M.addMonths(M.monthStart(today), k), here = m && m.date.slice(0, 7) === ms.slice(0, 7);
            const card = el('div', 'onb-mcard' + (k === 0 ? ' now' : '') + (here ? ' mark' + (m.example ? ' example' : '') : ''));
            card.appendChild(el('b', '', M.MONTH_SHORT[+ms.slice(5, 7) - 1]));
            const dots = el('div', 'onb-dots');
            const n = new Date(Date.UTC(+ms.slice(0, 4), +ms.slice(5, 7), 0)).getUTCDate();
            for (let d = 0; d < M.weekday(ms); d++) dots.appendChild(el('i', 'x'));
            for (let d = 0; d < n; d++) { const dd = M.addDays(ms, d), wd = M.weekday(dd); const dot = el('i', a.work.days.includes(wd) && !a.noWork ? 'w' : ''); if (here && dd === m.date) dot.className = 'm'; dots.appendChild(dot); }
            card.appendChild(dots);
            if (here) card.appendChild(tag(m));
            grid.appendChild(card);
          }
          box.appendChild(grid);
        }
        return box;
      };
      /* reveal: a date picked scrolls where it landed into view (never while typing a name, which would
         scroll the box being typed in away). quiet: the line changes without being read out, so typing a
         name isn't read back a letter at a time */
      function show(z, reveal, quiet) {
        at = z;
        tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.z === z)));
        zline.textContent = LINE[z]();
        if (!quiet) say(zline.textContent);
        const next = draw(z);
        stage.replaceChildren(next);
        if (!onbCalm()) requestAnimationFrame(() => next.classList.add('in')); else next.classList.add('in');
        const mk = reveal && next.querySelector('em');
        if (mk) { mk.parentNode.classList.add('landed'); requestAnimationFrame(() => mk.parentNode.scrollIntoView({ block: 'nearest', behavior: onbCalm() ? 'auto' : 'smooth' })); }
      }
      /* it plays once by itself when the step first opens, and stops the moment anything is touched */
      function stopPlay() { playing.forEach(clearTimeout); playing = []; replay.hidden = false; }
      function play() {
        stopPlay();
        replay.hidden = true;
        show('day');
        [['week', 1900], ['month', 3800], ['year', 6000]].forEach(([z, ms]) => playing.push(onbLater(() => show(z), ms)));
        playing.push(onbLater(() => { playing = []; replay.hidden = false; }, 6100));
        su.aheadPlayed = true;
      }
      /* the box for their own: each with its suggestions right under it, so a tap is never a guess about which box it fills */
      const form = el('div', 'onb-soon');
      const nameCol = el('div'), whenCol = el('div');
      form.append(nameCol, whenCol);
      body.appendChild(form);
      const sayNow = el('p', 'onb-soon-say');
      body.appendChild(sayNow);
      const keep = () => {
        a.soon = own() && s.date ? { name: s.name.trim(), date: s.date } : null;
        saveDraft();
        sayNow.textContent = own() ? s.name.trim() + ' goes on your board as a marker, ' + M.dateText(s.date, 'day') + '.' : EX + ' is an example. Only what you keep or type goes on your board.';
        const k = nameCol.querySelector('.onb-suggest');
        if (k) k.textContent = own() ? EX : 'Keep ' + EX;
      };
      const nm = textInput(s.name, () => {}, 'Type its name', 40);
      nm.addEventListener('input', () => { stopPlay(); s.name = nm.value; keep(); show(at === 'day' || at === 'week' ? 'month' : at, false, true); });
      field(nameCol, 'Something coming up', nm);
      /* a date picked shows its month, then where the month sits in the year */
      const land = () => { stopPlay(); keep(); show('month', true, true); playing.push(onbLater(() => show('year', true, true), 1300)); say(sayNow.textContent); };
      const dt = dateInput(s.date, (v) => { s.date = v; land(); });
      dt.min = today;
      /* keep the example in one tap, or a name for someone who can't think of one */
      nameCol.appendChild(suggests([[EX, 'Keep ' + EX], ['A birthday', 'A birthday'], ['A deadline', 'A deadline']], (t) => { nm.value = s.name = t; land(); }, 'Ideas for something coming up'));
      field(whenCol, 'When', dt).classList.add('onb-when');
      whenCol.appendChild(suggests([[1, 'Next month'], [3, 'In 3 months'], [6, 'In 6 months']], (n) => { s.date = M.addMonths(today, n); dt.value = s.date; land(); }, 'Dates'));
      keep();
      /* the first time the step opens it plays; coming back to it opens where their thing is */
      if (!su.aheadPlayed) play();
      else show(own() ? 'month' : 'year');
      c.label('Next');
    },
    /* Dinner: tonight's (or tomorrow's, late in the evening), asked the way the board asks it: how it's
       happening first (Data.DINNER_HOW), then, when cooking, what and who. The grocery list fills from
       the recipe. */
    dinner(c) {
      const { a, h, body } = c;
      const late = nowMin >= 20 * 60, date = late ? M.addDays(today, 1) : today, word = late ? 'tomorrow' : 'tonight';
      h.textContent = 'How’s dinner happening ' + word + '?';
      body.appendChild(el('p', 'sheet-line', 'On Sundays you’ll decide the whole week. Try one night.'));
      const base = onbBase(a), partnered = (a.home === 'partner' || a.home === 'family') && a.partner.trim();
      const d = a.dinner && a.dinner.date === date ? Object.assign({}, a.dinner) : { date, name: '', recipe: null, cook: '', items: [] };
      const cooking = () => ['me', 'kim', 'home'].includes(d.cook);
      /* the way on is Next, the same word as every step; Skip is one of the answers, not the way past them */
      const keep = () => { a.dinner = d.name || d.cook ? Object.assign({}, d) : null; saveDraft(); c.label('Next'); };
      const how = el('div', 'onb-dishes how'), what = el('div'), res = el('div', 'onb-result');
      body.append(how, what, res);
      const tile = (x, on, fn) => {
        const b = el('button', 'onb-dish');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(on));
        b.append(icon(x.icon, 10, on ? UI.dark : UI.gold), el('b', '', x.name));
        b.addEventListener('click', () => { Snd.init(); Snd.pick(); fn(); keep(); draw(); });
        return b;
      };
      const draw = () => {
        how.replaceChildren();
        how.setAttribute('role', 'group'); how.setAttribute('aria-labelledby', 'sheet-h');
        D.DINNER_HOW.forEach((x) => how.appendChild(tile(x, x.id === 'home' ? cooking() : d.cook === x.id, () => {
          if (x.id === 'home') { if (!cooking()) d.cook = partnered ? 'home' : 'me'; }
          else { d.name = ''; d.recipe = null; d.items = []; d.cook = x.id; }
        })));
        what.replaceChildren();
        if (cooking()) {
          const dishes = el('div', 'onb-dishes');
          base.recipes.slice(0, 4).forEach((r) => dishes.appendChild(tile({ name: r.name, icon: 'pot' }, d.recipe === r.id, () => { d.name = r.name; d.recipe = r.id; d.items = (r.items || []).slice(); })));
          field(what, 'What are you making?', dishes);
          /* tonight's real dinner is often none of the four */
          field(what, 'Or something else', textInput(d.recipe ? '' : d.name, (v) => { d.name = v; d.recipe = null; d.items = []; keep(); draw(); }, 'Pasta, or what’s in the fridge', 40));
          if (partnered) field(what, 'Who’s cooking?', chips([{ id: 'me', name: 'Me' }, { id: 'kim', name: a.partner.trim() }], d.cook, (v) => { d.cook = v; keep(); draw(); }));
        }
        res.replaceChildren();
        if (!d.name && !d.cook) return;
        const lk = cat('meals');
        const blk = el('div', 'onb-chip');
        blk.style.background = lk.base; blk.style.color = lk.ink;
        blk.append(icon('pot', 10, lk.ink), onbWords(d.name || 'Dinner', onbCook(a, d.cook)));
        res.appendChild(blk);
        if (d.items.length) {
          const names = d.items.map((id) => (base.pantry.find((p) => p.id === id) || { name: id }).name);
          res.appendChild(el('p', 'onb-groc', 'On the grocery list: ' + names.join(', ') + '. Check them off in the store, on your phone.'));
        } else res.appendChild(el('p', 'onb-groc', !cooking() ? 'Nothing to buy. It’s on the board as ' + word + '’s dinner.' : d.name ? 'On the board as ' + word + '’s dinner. What it needs can go on the grocery list from Dinners.' : 'Pick what you’re making and the grocery list fills in.'));
      };
      draw();
      c.label('Next');
    },
    /* A to-do in plain words, read the way Add reads it. A day makes it due; a time puts it on the board. */
    todo(c) {
      const { a, h, body } = c;
      h.textContent = 'Anything you need to get done?';
      body.appendChild(el('p', 'sheet-line', 'Type it the way you’d say it.'));
      const inp = textInput(a.todo ? a.todo.text : '', () => {}, 'Renew the passport by Friday', 80);
      field(body, 'A to-do', inp);
      const out = el('div', 'onb-result');
      const read = () => {
        const text = inp.value.trim();
        out.replaceChildren();
        if (!text) { a.todo = null; saveDraft(); c.label('Next'); return; }
        const p = M.parseQuick(text, today, onbBase(a).palette, nowMin);
        if (!p || !p.name) { a.todo = null; c.label('Next'); return; }
        a.todo = Object.assign({ text }, p);
        saveDraft();
        const card = el('div', 'onb-part');
        if (p.kind === 'task') {
          card.append(icon('flag', 11, UI.gold), onbWords(p.name, p.due ? 'Due ' + M.relText(p.due, today) + (M.diffDays(today, p.due) < 7 && M.diffDays(today, p.due) > 1 ? ', ' + M.dateText(p.due) : '') : 'No due date yet'));
          out.append(card, el('p', 'onb-groc', 'It waits in your to-dos until you give it a time. Due soon and the notepad on the desk keep it in sight.'));
        } else {
          const lk = W.look(p);
          const blk = el('div', 'onb-chip');
          blk.style.background = lk.base; blk.style.color = lk.ink;
          blk.append(icon(p.icon || 'star', 10, lk.ink), onbWords(p.name, cap(M.relText(p.date, today)) + ' at ' + M.clock(p.start) + ', ' + M.dur(p.dur)));
          out.append(blk, el('p', 'onb-groc', onbLands(a, p)));
        }
        c.label('Next');
      };
      inp.addEventListener('input', read);
      body.appendChild(suggests(onbExamples(a), (v) => { inp.value = v; read(); }, 'Examples'));
      body.appendChild(out);
      read();
    },
    /* The Sunday Reset's time, picked now, because a decided when is more likely to happen. It can go
       in the person's own calendar as a weekly event. */
    reset(c) {
      const { a, h, body } = c;
      h.textContent = 'When’s your Sunday Reset?';
      body.appendChild(el('p', 'sheet-line', 'About 20 minutes, at a time that’s usually quiet.'));
      const list = el('div', 'onb-picks onb-times');
      list.setAttribute('role', 'radiogroup'); list.setAttribute('aria-labelledby', 'sheet-h');
      const first = el('p', 'onb-first');
      const other = el('div');
      /* until a time is picked, the offer is a quiet one, clear of work and sleep */
      if (!a.resetPicked) { a.resetAt = OB.quietReset(a); saveDraft(); }
      const isPreset = () => OB.RESET_TIMES.some((t) => t.day === a.resetAt.day && t.min === a.resetAt.min);
      let custom = !isPreset();
      const draw = () => {
        list.replaceChildren();
        OB.RESET_TIMES.concat([{ id: 'other', name: 'Another time', other: true }]).forEach((t, k) => {
          const b = el('button', 'onb-pick');
          b.type = 'button'; b.setAttribute('role', 'radio');
          const on = t.other ? custom : !custom && t.day === a.resetAt.day && t.min === a.resetAt.min;
          b.setAttribute('aria-checked', String(on));
          const tick = el('span', 'onb-tick');
          tick.appendChild(icon('check', 7, UI.dark));
          /* three times as tiles in a row (Morning, 9 am); another time is the fourth, under them */
          b.append(icon(t.other ? 'calendar' : t.min < 720 ? 'sunrise' : t.min < 1020 ? 'sun' : 'moon', 11, UI.gold), onbWords(t.other ? 'Another time' : t.name.replace(/^Sunday /, '').replace(/^./, (c) => c.toUpperCase()), t.other ? 'Any day and time' : M.clock(t.min)), tick);
          if (t.other) b.classList.add('onb-time-other');
          if (on || (!k && !custom && !isPreset())) b.dataset.first = '1';
          b.addEventListener('click', () => { Snd.init(); Snd.pick(); a.resetPicked = true; if (t.other) custom = true; else { custom = false; a.resetAt = { day: t.day, min: t.min }; } saveDraft(); draw(); });
          list.appendChild(b);
        });
        other.replaceChildren();
        if (custom) {
          field(other, 'Day', chips([6, 0, 1].map((x) => ({ id: x, name: M.DAY_LONG[x] })), a.resetAt.day, (v) => { a.resetPicked = true; a.resetAt = { day: v, min: a.resetAt.min }; saveDraft(); sayFirst(); }));
          field(other, 'Time', liveStepper(() => a.resetAt.min, (v) => { a.resetPicked = true; a.resetAt = { day: a.resetAt.day, min: M.clamp(v, 360, 1380) }; saveDraft(); sayFirst(); }, M.clock, 30));
        }
        sayFirst();
      };
      const sayFirst = () => { first.textContent = 'Your first one: ' + onbWhenReset(OB.nextReset(M, today, nowMin, a.resetAt), a.resetAt) + '.'; };
      body.append(list, other, first);
      draw();
      const cal = button('Add it to my calendar', 'go gold', () => { saveResetIcs(a.resetAt); a.resetIcs = true; saveDraft(); });
      cal.prepend(icon('calendar', 9, UI.gold));
      const calRow = actions(body, [cal]);
      calRow.classList.add('onb-cal');
      calRow.appendChild(el('span', 'field-hint', 'Your calendar reminds you every week.'));
    },
    /* Building: the week is built at once; the lines say what it holds, one at a time, from the answers. */
    build(c) {
      const { su, a, h, body } = c;
      h.textContent = 'Building your week';
      onbBuild(su);
      const lines = OB.buildLines(M, a, su.built, su.extras, su.ics);
      const ring = el('div', 'onb-ring');
      const num = el('b', '', '0%');
      ring.appendChild(num);
      const list = el('div', 'onb-lines');
      list.setAttribute('aria-live', 'polite');
      lines.forEach((l) => { const r = el('div', 'onb-line'); const t = el('span', 'onb-tick'); t.appendChild(icon('check', 7, UI.dark)); r.append(t, el('span', '', l)); list.appendChild(r); });
      body.append(ring, list);
      /* the lines tick at a reading pace; the plan waits for the person, never a timer (WCAG 2.2.1) */
      const per = onbCalm() ? 140 : 520;
      c.label('See my plan');
      lines.forEach((l, k) => onbLater(() => {
        list.children[k].classList.add('done');
        const pct = Math.round((100 * (k + 1)) / lines.length);
        num.textContent = pct + '%'; ring.style.setProperty('--p', String(pct));
        Snd.tick(false);
      }, 300 + k * per));
      onbLater(() => { if (!c.go) return; c.go.disabled = false; c.go.focus({ preventScroll: true }); say('Your week is built.'); }, 300 + lines.length * per + 200);
      c.ready = () => { c.go.disabled = true; };
    },
    /* The plan: the numbers the board leads with, what's on it already, what happens next, and what
       to lean on for what they said. */
    plan(c) {
      const { su, a, h, body } = c;
      if (!su.built) onbBuild(su);
      const s = OB.planStats(M, su.built, today);
      h.textContent = a.name ? 'Here’s your week, ' + a.name : 'Here’s your week';
      const stats = el('div', 'onb-stats');
      const stat = (n, l, sub) => { const x = el('div', 'onb-stat'); x.append(el('b', '', n), el('span', '', l)); if (sub) x.appendChild(el('small', '', sub)); stats.appendChild(x); };
      const partnered = (a.home === 'partner' || a.home === 'family') && a.partner.trim();
      /* three numbers in one row, a few words each */
      stats.classList.add('row3');
      stat(M.hours(s.yours), 'yours a week');
      stat(M.hours(s.open), 'open');
      if (a.help.dinners) stat(String(s.dinners), s.dinners === 1 ? 'dinner night' : 'dinner nights');
      else stat(String(s.evenings), partnered ? 'evenings together' : 'free evenings');
      body.appendChild(stats);
      if (su.extras.length) {
        const sec = el('div', 'onb-sec');
        sec.appendChild(el('div', 'lbl', 'Already on your board'));
        su.extras.forEach((x) => {
          const t = x.kind === 'block' ? x.name + ', ' + M.relText(x.date, today) + ' ' + M.span(x.start, x.start + x.dur)
            : x.kind === 'soon' ? x.name + ', ' + M.dateText(x.date)
            : x.kind === 'dinner' ? (x.name || 'Dinner') + ' ' + (x.date === today ? 'tonight' : 'tomorrow') + (x.cook ? ', ' + (x.cook === 'kim' ? onbCook(a, x.cook) : onbCook(a, x.cook).toLowerCase()) : '')
            : x.kind === 'todo' && x.taken != null ? x.name + ', in your to-dos for ' + M.relText(x.due, today) + ' (' + M.clock(x.taken) + ' was taken)'
            : x.kind === 'todo' ? x.name + (x.due ? ', due ' + M.relText(x.due, today) : ', in your to-dos')
            : x.name + ', ' + plural(x.count, 'event', 'events');
          const ic = { block: 'check', soon: OB.markFor(x.name), dinner: 'pot', todo: 'flag', calendar: 'calendar' }[x.kind];
          const r = el('div', 'onb-on');
          r.append(icon(ic, 9, UI.gold), el('span', '', t));
          sec.appendChild(r);
        });
        body.appendChild(sec);
      }
      const nx = OB.nextSteps(M, today, nowMin, a.resetAt, { dinners: a.help.dinners });
      const tl = el('div', 'onb-sec');
      tl.appendChild(el('div', 'lbl', 'What happens next'));
      const ol = el('ol', 'onb-time');
      /* two lines: each morning, and the first reset with its date */
      [{ when: 'Each morning', what: 'Today shows what you’re in and what’s next.' }, { when: nx.list[2].when, what: 'Your first Sunday Reset.' }].forEach((x) => { const li = el('li'); li.append(el('b', '', x.when), el('span', '', x.what)); ol.appendChild(li); });
      tl.appendChild(ol);
      /* something has to remind them on Sunday: their calendar, once the reset is in it */
      const nudge = el('div', 'onb-on onb-nudge');
      nudge.append(icon('calendar', 9, UI.gold), el('span', '', a.resetIcs ? 'Your calendar reminds you each week.' : 'Nothing reminds you yet.'));
      if (!a.resetIcs) nudge.appendChild(button('Add it to my calendar', 'small', () => { saveResetIcs(a.resetAt); a.resetIcs = true; saveDraft(); renderSheet(); }));
      tl.appendChild(nudge);
      body.appendChild(tl);
      if (a.pains.length || (a.painOther || '').trim()) {
        const ln = el('div', 'onb-sec');
        ln.appendChild(el('div', 'lbl', 'Lean on'));
        /* advice only points at what this board has */
        const ctx = { partnered: !!partnered, dinners: a.help.dinners !== false, together: !!partnered && a.help.together !== false };
        a.pains.map(OB.painById).filter(Boolean).forEach((p) => { const r = el('div', 'onb-on'); r.append(icon(p.icon, 9, UI.gold), onbWords(OB.leanFor(p, ctx), p.name)); ln.appendChild(r); });
        /* their own words get an answer too: the reset is where it gets looked at */
        if ((a.painOther || '').trim()) { const r = el('div', 'onb-on'); r.append(icon('note2', 9, UI.gold), onbWords(a.painOther.trim(), 'It’s in your to-dos as Look at. Bring it to your first Sunday Reset.')); ln.appendChild(r); }
        body.appendChild(ln);
      }
      const more = disclosure('Everything on it');
      setupSummary(a).forEach((x) => more.appendChild(el('p', '', x)));
      body.appendChild(more);
      c.label(su.mode === 'preview' ? 'Show me the preview' : 'Open my week');
      onbLater(() => { const g = $('sheet').querySelector('.go'); if (g && document.activeElement === document.body) g.focus({ preventScroll: true }); }, 60);
    }
  };
  /* the week the answers build, with what the try steps left on it and a calendar brought in */
  function onbBuild(su) {
    const a = Object.assign({}, su.a);
    if (a.placed && a.placed.date < today) a.placed = null;
    if (a.dinner && a.dinner.date < today) a.dinner = null;
    const built = D.buildState(setupInput(a), today);
    built.settings.hours = OB.hoursFor(a);
    const extras = OB.applyExtras(M, built, a);
    /* set up Monday to Thursday, the setup was this week's planning (Sunday's reset is still the next one) */
    const wd = M.weekday(today), ws = M.weekStart(today);
    if (wd >= 1 && wd <= 4) { built.weeks[ws] = Object.assign({}, built.weeks[ws]); built.weeks[ws].reset = Object.assign({ step: 0, done: false }, built.weeks[ws].reset, { setup: today }); }
    if (su.ics && su.ics.items.length) {
      const id = M.newId('c');
      built.calendars = built.calendars || [];
      built.calendars.push({ id, name: su.ics.name, cat: su.ics.cat, added: today });
      built.events = built.events.concat(calEvents(su.ics.items, id, su.ics.cat));
      extras.push({ kind: 'calendar', name: su.ics.name, count: su.ics.items.length });
    }
    su.built = built; su.extras = extras;
  }
  /* the Sunday Reset as a weekly event, in a file the person's calendar opens */
  function saveResetIcs(at) {
    const first = OB.nextReset(M, today, nowMin, at);
    /* the link opens the app, so it's left out where the page is framed (claude.ai) and its address isn't the app's */
    let framed = false;
    try { framed = window.top !== window; } catch (e) { framed = true; }
    const url = /^https?:$/.test(location.protocol) && !framed ? location.origin + location.pathname : '';
    const blob = new Blob([OB.resetIcs(M, first, at, url, Date.now(), M.newId('r'))], { type: 'text/calendar' });
    const link = el('a');
    link.href = URL.createObjectURL(blob); link.download = 'sunday-reset.ics';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    Snd.good();
    toast('Saved sunday-reset.ics. Open it to add the reset to your calendar, every ' + M.DAY_LONG[at.day] + ' at ' + M.clock(at.min) + '.', 'good');
  }
  function finishSetup() {
    const su = view.got.setup, a = su.a;
    if (!su.built) onbBuild(su);
    const built = su.built;
    built.settings = Object.assign({}, state.settings, built.settings, { modules: built.settings.modules });
    su.finished = true;
    if (su.mode !== 'preview') dropDraft();
    closeSheet();
    if (su.mode === 'preview' || view.preview) {
      showPreview(built, 'Someone new’s week, from the setup', 'setup');
      if (!view.phone) setZoom('week', today);
      Snd.good();
      return;
    }
    const snap = JSON.stringify(state);
    if (!who().sample) Store.rescue('Before setting up a new week', state);
    state = built; undoStack = [snap];
    changed();
    /* the new week shows whole, in the Planner, where it can be changed, with Getting started beside it */
    if (view.mode !== 'planner' && !view.phone) setMode('planner');
    if (!view.phone) setZoom('week', today);
    Snd.chime();
    toast('Your week is ready.', 'good');
    startMoves(a);
  }
  /* A board shown without saving it: someone new's setup, or a Dev scenario. Opening another while
     one shows keeps the real board aside, so Back to my board always comes back to it, and leaving
     lets go of a held clock or day and a Dev Getting started list. */
  function showPreview(st, label, id) {
    try {
      if (!view.preview) view.preview = { saved: state, undo: undoStack, redo: redoStack, from: { mode: view.mode, zoom: view.zoom, focus: view.focus, plannerAt: view.plannerAt } };
      view.preview.label = label; view.preview.id = id || null; view.preview.seen = null;
      state = st; undoStack = []; redoStack = [];
      settle();
      if (view.mode !== 'planner' && !view.phone) setMode('planner');
      renderPreviewBar(); render();
      if (view.phone) renderToday();
      return true;
    } catch (e) {
      /* a board that can't be shown says so and leaves you on your own, never a quiet nothing */
      logError('preview', e); endPreview(); oops(label + ' didn’t open. The console says why.');
      return false;
    }
  }
  function endPreview() {
    if (!view.preview) return;
    /* a setup tried as someone new goes with the made up board it was tried on */
    if (view.got.setup && view.got.setup.mode === 'preview' && !$('sheet').hidden) closeSheet();
    const from = view.preview.from;
    state = view.preview.saved; undoStack = view.preview.undo; redoStack = view.preview.redo || [];
    view.preview = null;
    heldMin = null; heldDay = null; devMovesOff();
    settle();
    clockTick();
    /* back where you were: Today or the Planner, on the zoom and the day you left */
    if (from && !view.phone) {
      if (from.mode !== view.mode) setMode(from.mode);
      if (view.mode === 'planner' && from.zoom) { view.zoom = from.zoom; view.focus = from.focus; }
      view.plannerAt = from.plannerAt || null;
      saveView();
    }
    render(); renderPreviewBar(); Snd.slide();
    if (view.phone) renderToday();
    if (view.drawer) renderDrawer();
    say('Back on your board.');
    if (!view.drawer && !view.phone) { const k = $('hud-kicker'); if (k && k.offsetParent) k.focus({ preventScroll: true }); }
  }
  /* What a tap left behind belongs to the board it was made on. Entering or leaving a preview clears it,
     so an Undo toast, a planned quick add, an armed kind of day, or time back after Done early never
     lands on the other board. */
  function settle() {
    cache.clear(); view.pick = null; view.sel = null; view.bench = null; view.reset = null; view.level = null;
    view.said = null; view.back = null; view.bandSaid = null; view.got.kindArm = null;
    $('toasts').replaceChildren();
    closeQuick(); endCoach();
    const add = document.querySelector('.td-add');
    if (add && add.value) add.dispatchEvent(new Event('input'));
  }
  const previewLabel = () => (view.preview ? view.preview.label || 'a preview' : '');
  /* what's held, said the same way in the bar and on Dev */
  function heldWords() {
    const t = heldMin != null, d = !!heldDay;
    if (!t && !d) return '';
    const dn = M.DAY_LONG[M.weekday(today)];
    return t && d ? 'Held at ' + M.clock(nowMin) + ' on ' + dn : t ? 'Held at ' + M.clock(nowMin) + ', today' : 'Held on ' + dn + ', with the clock running';
  }
  function renderPreviewBar() {
    const bar = $('preview-bar');
    bar.hidden = !view.preview;
    document.body.classList.toggle('previewing', !!view.preview);
    if (!view.preview) { bar.replaceChildren(); return; }
    /* only the words are the status; the buttons beside them aren't read out with every change */
    const words = el('span', 'pv-words', previewLabel() + '. Nothing here is saved.');
    words.setAttribute('role', 'status');
    const held = heldWords();
    if (held) words.appendChild(el('small', '', held + '.'));
    const acts = [];
    if (held) acts.push(button('Back to the real time and day', 'small quiet', () => devHold(null, null)));
    if (view.preview.id && devOn()) acts.push(button('Dev', 'small quiet', () => openDrawer('dev')));
    acts.push(button('Back to my board', 'small primary', endPreview));
    bar.replaceChildren(words, ...acts);
    if (ready) layoutInsets();
  }

  /* == Dev: scenarios for Russell ==
     A Settings page of made up boards to hop into and out of (src/scenarios.js, loaded when the page
     first opens), the first visit at any step, a fresh Getting started, the tour, the clock and the day
     held, and the phone view in a wide window. It shows on localhost, and on any device once the site
     was opened there with ?dev or ?dev=1 (sundayreset.dev on the device, or for the session where
     storage is off; ?dev=0 or its own button turns it off). Scenarios open as previews and the clock and
     day are only held on one, so nothing here ever reaches the real board. */
  let SC = window.Scenarios || null, scLoading = null;
  function loadScenarios() {
    if (SC) return Promise.resolve(SC);
    if (!scLoading) {
      scLoading = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'src/scenarios.js';
        s.onload = () => { SC = window.Scenarios || null; if (SC) res(SC); else rej(new Error('no Scenarios')); };
        s.onerror = () => rej(new Error('scenarios.js didn’t load'));
        document.head.appendChild(s);
      }).catch((e) => { scLoading = null; logError('scenarios', e); throw e; });
    }
    return scLoading;
  }
  const DEV_KEY = 'sundayreset.dev';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('dev')) {
      const v = q.get('dev');
      if (v === '0') { try { localStorage.removeItem(DEV_KEY); } catch (e) { /* fine */ } try { sessionStorage.removeItem(DEV_KEY); } catch (e) { /* fine */ } }
      else if (v === '' || v === '1') { try { localStorage.setItem(DEV_KEY, '1'); } catch (e) { try { sessionStorage.setItem(DEV_KEY, '1'); } catch (err) { /* fine */ } } }
      /* the address loses the word either way, so a bookmark or a shared link never carries it */
      q.delete('dev');
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    }
  } catch (e) { /* fine */ }
  const devOn = () => {
    if (window.claude) return false;
    if (isLocal) return true;
    try { if (localStorage.getItem(DEV_KEY) === '1') return true; } catch (e) { /* fine */ }
    try { return sessionStorage.getItem(DEV_KEY) === '1'; } catch (e) { return false; }
  };
  let devPhone = false, movesStash, devShown = null;
  /* built boards are kept for the day as text, so opening one again is quick and always a fresh copy */
  const scBuilt = new Map();
  function openScenario(id) {
    const sc = SC && SC.LIST.find((x) => x.id === id);
    if (!sc) return;
    const key = id + '|' + today, live = !!view.drawer && wideSettings() && !noDesk && !view.list;
    /* on a wide window Settings stays open and the board changes beside it */
    if (!live) closeDrawer();
    const go = () => {
      let json = scBuilt.get(key);
      if (!json) {
        try { json = JSON.stringify(SC.build(id, D, M, today, OB)); } catch (e) { logError('scenario', e); toast(sc.name + ' didn’t build. The console says why.', 'bad'); return; }
        scBuilt.set(key, json);
        if (scBuilt.size > 4) scBuilt.delete(scBuilt.keys().next().value);
      }
      devMovesOff();
      if (!showPreview(JSON.parse(json), sc.name + ', a made up board', id)) return;
      if (!view.phone) setZoom(sc.zoom || 'week', sc.back ? M.addDays(today, -sc.back) : today);
      Snd.slide();
      if (view.drawer) renderDrawer();
    };
    /* only a build that takes a while says so first, with a frame for the words to show */
    if (sc.heavy && !scBuilt.has(key)) { toast('Making ' + sc.name + '…'); setTimeout(go, 40); } else go();
  }
  /* a family filled in, so every step of the setup has something to show */
  const devAnswers = () => Object.assign(blankAnswers(), { name: 'Brian', pains: ['head', 'slip', 'dinner', 'us'], home: 'family', partner: 'Sam', kids: ['Robin'], cares: { Robin: { days: [1, 2, 3, 4, 5], drop: 510, pick: 1005, other: false } } });
  /* a fresh Getting started list on a preview, kept in memory only, so the real one stays as it was */
  function devMoves() {
    if (!view.preview || !OB) return;
    if (movesStash === undefined) movesStash = moves;
    moves = { started: today, kind: view.phone ? 'phone' : 'desk', pains: ['head', 'dinner'], help: { dinners: useDinners(), together: useTogether() }, resetAt: { day: 0, min: 1140 }, done: { build: true }, hidden: false, dev: true };
    if (view.phone) renderToday(); else { renderRack(); layoutInsets(); openSel({ type: 'moves' }); }
  }
  function devMovesOff() {
    if (movesStash === undefined) return;
    moves = movesStash; movesStash = undefined;
    if (ready) { renderRack(); layoutInsets(); }
  }
  /* Hold the clock or the day, on a preview only. A time is about Today, so holding one goes there. */
  function devHold(min, date) {
    if (!view.preview) return;
    if (min !== undefined) heldMin = min;
    if (date !== undefined) heldDay = date;
    cache.clear(); clockTick();
    if (min != null && !inToday() && !view.phone) setMode('today');
    render(); renderPreviewBar();
    if (view.phone) renderToday();
    if (view.drawer) renderDrawer();
    say(heldWords() || 'The real time and day.');
  }
  /* times worth seeing in Today, earliest first; the end of work is worked out from the board shown */
  const DEV_TIMES = [[120, '2 am, before the day starts'], [360, '6 am'], [480, '8 am, the morning question'], [750, '12:30 pm, midday'], [930, '3:30 pm, the dinner question'], [1290, '9:30 pm, looking at tomorrow']];
  function devTimes() {
    const list = DEV_TIMES.slice();
    /* the work day's last stretch, so a meeting that splits Work doesn't move the end of the day */
    const wk = view.preview ? day(today).blocks.filter((b) => b.cat === 'work' && !b.sleep && b.dur >= 30).sort((x, y) => (y.start + y.dur) - (x.start + x.dur))[0] : null;
    if (wk) list.push([wk.start + wk.dur - 5, M.clock(wk.start + wk.dur - 5) + ', the last five minutes of ' + blockName(wk)]);
    return list.sort((x, y) => x[0] - y[0]);
  }
  /* a row on Dev: what it is, its line, and one button; the open one says Showing, white, and can be made again */
  /* a focus key on a Dev control, so a redraw brings focus back to it */
  const devKey = (b, k) => { b.dataset.fk = k; return b; };
  function devRow(name, line, act) {
    const row = el('div', 'list-row dev-row');
    const t = el('span', 'grow', name), ln = el('small', '', line);
    ln.id = 'dev-l' + (fieldSeq++);
    t.appendChild(ln);
    row.appendChild(t);
    act.forEach((b) => { b.setAttribute('aria-describedby', ln.id); row.appendChild(b); });
    return row;
  }
  function devPage(p) {
    if (!SC) {
      p.appendChild(el('p', 'dsec-line', 'Loading the made up boards…'));
      loadScenarios().then(() => { if (view.drawer && view.setPage === 'dev') renderDrawer(); }, () => { if (view.drawer && view.setPage === 'dev') { p.replaceChildren(el('p', 'dsec-line', 'The made up boards didn’t load. Reload the page to try again.')); } });
      return;
    }
    const pv = view.preview;
    p.appendChild(el('p', 'dsec-line', 'Made up boards to hop into and out of. Each opens as a preview: nothing is saved, and Back to my board returns to your week.'));
    /* with one open, what acts on it comes first: which board, the clock and the day, a fresh list */
    if (pv) {
      const note = el('div', 'dnote');
      note.appendChild(el('span', '', 'Showing ' + previewLabel() + '.'));
      note.appendChild(devKey(button('Back to my board', 'small primary', endPreview), 'dev-back'));
      p.appendChild(note);
      const held = heldWords();
      const ck = dsec(p, 'The clock and the day', held ? held + '.' : 'The real time and day. Holding a time shows it in Today.');
      field(ck, 'Time of day', chips(devTimes().map(([m, t]) => ({ id: m, name: t })), heldMin, (m) => devHold(m), 'dev-time'));
      const real = M.todayIso(), w0 = M.weekStart(real);
      field(ck, 'Day', chips([[0, 'Sunday, reset day'], [1, 'Monday, set up this week'], [3, 'Wednesday, catch up'], [6, 'Saturday']].map(([n, t]) => ({ id: M.addDays(w0, n), name: t })), heldDay, (d) => devHold(undefined, d), 'dev-day'));
      if (held) actions(ck, [devKey(button('Back to the real time and day', 'small quiet', () => { devHold(null, null); setTimeout(() => { const f = $('drawer').querySelector('[data-fk="dev-time-' + DEV_TIMES[0][0] + '"]'); if (f) f.focus(); }, 0); }), 'dev-real')]);
      if (OB) {
        const gs = dsec(p, view.phone || noDesk ? 'Getting started' : 'Getting started and the tour', 'A fresh list on this board, ticked as you try things. Yours stays as it was.');
        actions(gs, [button('Start a fresh list', 'small', () => { closeDrawer(); devMoves(); }), view.phone || noDesk ? null : button('Take the tour', 'small', () => { closeDrawer(); startTour(0); })]);
      }
    }
    [...new Set(SC.LIST.map((x) => x.group))].forEach((g) => {
      const sec = dsec(p, g);
      const list = el('div', 'list');
      SC.LIST.filter((x) => x.group === g).forEach((sc) => {
        const open = pv && pv.id === sc.id;
        const acts = [];
        if (open) {
          const on = el('span', 'dev-on', 'Showing');
          on.setAttribute('aria-current', 'true');
          acts.push(on, devKey(button('Open again', 'small quiet', () => { scBuilt.delete(sc.id + '|' + today); openScenario(sc.id); }), 'dev-again-' + sc.id));
        } else acts.push(devKey(button('Open', 'small', () => openScenario(sc.id)), 'dev-' + sc.id));
        acts.forEach((b) => { if (b.tagName === 'BUTTON') b.setAttribute('aria-label', (open ? 'Open again: ' : 'Open ') + sc.name); });
        list.appendChild(devRow(sc.name, sc.line, acts));
      });
      sec.appendChild(list);
    });
    if (OB) {
      const fv = dsec(p, 'The first visit', 'The welcome and the setup, as a preview with the sample family behind it. Finishing shows the week it built.');
      const toDev = () => openDrawer('dev');
      actions(fv, [button('Open the welcome', 'small', () => { closeDrawer(); openWelcome('preview', 'welcome', null, toDev); }), button('Start the setup', 'small', () => { closeDrawer(); openWelcome('preview', null, null, toDev); })]);
      const steps = OB.stepsFor(devAnswers());
      OB.CHAPTERS.forEach((ch) => {
        p.appendChild(el('h5', 'bar-kind', ch.name));
        actions(p, steps.filter((s) => s.chapter === ch.id).map((s) => devKey(button(OB.STEP_NAMES[s.id] || s.id, 'small', () => { closeDrawer(); openWelcome('preview', s.id, devAnswers(), toDev); }), 'dev-step-' + s.id)));
      });
    }
    if (!pv && OB && !view.phone && !noDesk) {
      const tour = dsec(p, 'The tour', 'Four tips, on whatever board is showing. A fresh Getting started list needs a made up board open first.');
      actions(tour, [button('Take the tour', 'small', () => { closeDrawer(); startTour(0); })]);
    }
    if (!phoneWidth()) {
      const vw = dsec(p, 'This window', 'The phone’s Today in a 390 px column, on this window until it reloads.');
      vw.appendChild(toggle('Phone view, 390 px wide', devPhone, (v) => setDevPhone(v)));
    }
    if (!isLocal) {
      const off = dsec(p, 'Dev on this device', 'It came on when this device opened the site with ?dev at the end of the address. Turning it off hides this page here.');
      actions(off, [button('Turn off Dev here', 'small quiet', () => { try { localStorage.removeItem(DEV_KEY); } catch (e) { /* fine */ } try { sessionStorage.removeItem(DEV_KEY); } catch (e) { /* fine */ } endPreview(); setDevPhone(false); goPage('help'); })]);
    }
  }
  /* the phone's view in a wide window, framed as a phone; leaving it wakes the desk as it was */
  function setDevPhone(v) {
    const was = view.phone;
    devPhone = v;
    document.body.classList.toggle('dev-phone', v);
    setPhone(); render();
    if (view.phone) renderToday();
    if (was && !view.phone) W.wake();
    layoutInsets();
    if (view.drawer) renderDrawer();
  }
  /* == Getting started: a short list on the real desk, after the setup ==
     Six things to try (the code calls them moves), with the setup already ticked (a list that's
     started gets finished), kept on this device (sundayreset.moves), never in the board. Each ticks
     itself when it happens on the desk; Show me goes to where it's done and points at it. The list
     rides on the tray bar until it's done or put away; Help brings it back. Which list (the desk's or
     the phone's) is kept from when it started, so a window crossing phone width doesn't change it. */
  const MOVES_KEY = 'sundayreset.moves';
  let moves = null;
  try { moves = JSON.parse(localStorage.getItem(MOVES_KEY) || 'null'); } catch (e) { moves = null; }
  function saveMoves() { if (view.preview || (moves && moves.dev)) return; try { if (moves) localStorage.setItem(MOVES_KEY, JSON.stringify(moves)); else localStorage.removeItem(MOVES_KEY); } catch (e) { /* fine */ } }
  const movesList = () => (moves && OB ? OB.movesFor(moves.pains, moves.help, moves.kind ? moves.kind === 'phone' : !!view.phone) : []);
  const movesLeft = () => movesList().filter((id) => !moves.done[id]).length;
  const movesShown = () => !!moves && !!OB && !moves.hidden && (!view.preview || !!moves.dev) && movesLeft() > 0;
  function startMoves(a) {
    if (view.preview) return;
    moves = { started: today, kind: view.phone ? 'phone' : 'desk', pains: (a && a.pains) || [], focus: (a && a.focus) || [], help: (a && a.help) || { dinners: useDinners(), together: useTogether() }, resetAt: (a && a.resetAt) || { day: 0, min: 1140 }, done: { build: true }, hidden: false };
    saveMoves();
    if (view.phone) renderToday();
    /* the list slides in once the new week has landed, not on top of it */
    else { renderRack(); layoutInsets(); setTimeout(() => { if (!view.sel && !view.reset && !view.drawer) openSel({ type: 'moves' }); }, 1600); }
  }
  /* something on the list happened: tick it, say so, and put away a tip that pointed at it */
  function noteMove(id) {
    if (!moves || !OB || moves.done[id] || (view.preview && !moves.dev)) return;
    moves.done[id] = true;
    saveMoves();
    if (coachFor === id) endCoach();
    if (moves.hidden || !movesList().includes(id)) return;
    const left = movesLeft();
    /* the last one gets a small moment: a chime, and the desk lamp clicks on if it was off */
    if (!left) { Snd.chime(); if (!view.lamp && !view.phone) toggleLamp(); } else Snd.good();
    toast(left ? OB.MOVES[id].name + ': done. ' + plural(left, 'thing', 'things') + ' left in Getting started.' : 'That’s all of Getting started. You know your way around.', 'good', left ? { label: 'See the list', fn: () => openSel({ type: 'moves' }) } : null);
    /* once something's been tried the list folds away to its ring on the tray bar, so the board has the room */
    if (view.sel && view.sel.type === 'moves') { if (view.phone) renderSide(); else closeSel(); }
    if (view.phone) renderToday(); else { renderRack(); layoutInsets(); }
  }
  function movesButton() {
    const list = movesList(), done = list.length - movesLeft();
    const b = button('', 'small quiet moves-btn', () => { if (view.sel && view.sel.type === 'moves') closeSel(); else openSel({ type: 'moves' }); });
    const ring = el('span', 'moves-ring');
    ring.style.setProperty('--p', String(Math.round((100 * done) / list.length)));
    b.append(ring, el('span', 'lbl-t', 'Getting started'), el('span', 'moves-n', done + ' of ' + list.length));
    b.setAttribute('aria-label', 'Getting started, ' + done + ' of ' + list.length + ' done');
    b.setAttribute('aria-pressed', String(!!(view.sel && view.sel.type === 'moves')));
    return b;
  }
  function movesPanel(p) {
    if (!moves) startMovesQuiet();
    const list = movesList(), left = movesLeft();
    kicker(p, 'Getting started', 'check');
    title(p, left ? cap(plural(list.length, 'thing', 'things').replace(/^\d+/, (n) => COUNT_WORDS[+n] || n)) + ' to try' : 'You know your way around');
    line(p, (list.length - left) + ' of ' + list.length + ' done. Each one ticks itself when you do it' + (moves.kind === 'phone' ? '.' : ' on the desk.'));
    const ol = el('div', 'moves');
    list.forEach((id) => {
      const m = OB.MOVES[id], ok = !!moves.done[id];
      const row = el('div', 'move' + (ok ? ' done' : ''));
      const t = el('span', 'onb-tick');
      t.appendChild(icon('check', 7, UI.dark));
      const sub = id === 'reset' && !ok ? 'Yours is ' + onbWhenReset(OB.nextReset(M, today, nowMin, moves.resetAt), moves.resetAt) + '. ' + m.line : moveLine(id);
      row.append(t, onbWords(m.name, sub));
      if (!ok && id !== 'build' && !deskOnly(id)) row.appendChild(button('Show me', 'small', () => showMove(id)));
      ol.appendChild(row);
    });
    p.appendChild(ol);
    actions(p, [view.phone || noDesk ? null : button('Take the tour', 'small primary', () => { closeSel(); startTour(0); }), button('Put this away', 'small quiet', () => { moves.hidden = true; saveMoves(); closeSel(); if (view.phone) renderToday(); else { renderRack(); layoutInsets(); } toast('Getting started is in Help whenever you want it.'); })]);
  }
  /* a list for someone who never did the setup here (Russell, or a board from another device), from Help */
  function startMovesQuiet() {
    moves = { started: today, kind: view.phone ? 'phone' : 'desk', quiet: true, pains: [], help: { dinners: useDinners(), together: useTogether() }, resetAt: { day: 0, min: 1140 }, done: { build: true }, hidden: false };
    saveMoves();
  }
  function openMoves() {
    if (!OB) return;
    /* on a preview the list is a fresh one in memory, never the one kept on this device */
    if (view.preview && !(moves && moves.dev)) { if (view.drawer) closeDrawer(); devMoves(); return; }
    if (!moves) startMovesQuiet();
    moves.hidden = false; saveMoves();
    if (view.drawer) closeDrawer();
    if (view.phone) { renderToday(); const c = document.querySelector('.td-moves'); if (c) c.scrollIntoView({ block: 'center' }); return; }
    openSel({ type: 'moves' });
    renderRack(); layoutInsets();
  }
  /* A move's line where it's read: a list started on the desk and read on a phone says the desk
     moves happen on a computer, since the phone's desk has no Block library to drag from. */
  const deskOnly = (id) => !!view.phone && !!OB.MOVES[id].phone;
  const moveLine = (id) => (id === 'build' && moves.quiet ? OB.MOVES[id].quiet : deskOnly(id) ? OB.MOVES[id].phone : OB.MOVES[id].line);
  /* Show me: go where the move is done, and point at what to use */
  function showMove(id) {
    closeSel();
    const planner = () => { if (view.mode !== 'planner') setMode('planner'); };
    if (id === 'desk') { openPhoneDesk(); return; }
    if (id === 'todo') {
      if (view.phone) { const i = document.querySelector('input.td-add'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } return; }
      planner(); openQuick();
      setTimeout(() => coach('#quick', 'Type it the way you’d say it, like Call the dentist by Friday, then press Enter. A time puts it on the board.', { title: 'Add a to do', move: id }), 120);
      return;
    }
    if (id === 'dinner') { if (!view.phone) planner(); openSel({ type: 'dinner', date: nowMin >= 20 * 60 ? M.addDays(today, 1) : today }); return; }
    if (view.phone) { openPhoneDesk(); return; }
    planner();
    if (id === 'place') {
      setZoom('day', view.zoom === 'day' ? view.focus : today);
      setTimeout(() => coach(null, 'Block library sits beside the day. Drag any block onto the day: it slides in where it fits, and locked blocks never move.', { title: 'Put a block on a day', move: id }), 500);
    } else if (id === 'stretch') {
      setZoom('day', view.zoom === 'day' ? view.focus : today);
      setTimeout(() => coach(null, 'Point at a block you placed and drag its right edge. A routine like Work slides instead of stretching, and locked blocks stay put.', { title: 'Stretch a block', move: id }), 500);
    } else if (id === 'month') {
      coach('#zoom [data-zoom="month"]', 'Tap Month, or press 3. Year is 4, and 1 and 2 come back.', { title: 'See the month', move: id });
    } else if (id === 'reset') {
      if (trayCollapsed()) { setTrayCollapsed(false); renderRack(); layoutInsets(); }
      setTimeout(() => coach('[data-reset]', 'The Sunday Reset walks through the week ahead, one step at a time. You can try it now; Finish later keeps your place.', { title: 'Your Sunday Reset', move: id }), 120);
    }
  }

  /* == tips and the tour ==
     A tip points at one thing: a ring around it, the rest of the screen dimmed, and a card about it.
     The thing stays usable under the ring. Esc, the card's button, or doing the thing puts it away.
     The tour is four tips in a row, started by the person, never on its own. */
  let coachBox = null, coachFor = null, coachKey = null, coachTick = null;
  function endCoach() {
    if (!coachBox) return;
    coachBox.remove(); coachBox = null; coachFor = null;
    clearInterval(coachTick); coachTick = null;
    window.removeEventListener('keydown', coachKey, true);
    window.removeEventListener('resize', coachPlace);
  }
  let coachAt = null;
  function coachPlace() {
    if (!coachBox) return;
    const t = coachAt ? document.querySelector(coachAt) : null;
    const ring = coachBox.querySelector('.coach-ring'), card = coachBox.querySelector('.coach-card');
    const vw = window.innerWidth, vh = window.innerHeight, cw = Math.min(360, vw - 32);
    card.style.width = cw + 'px';
    if (!t || !t.getBoundingClientRect().width) {
      ring.hidden = true;
      coachBox.classList.add('loose');
      card.style.left = Math.round((vw - cw) / 2) + 'px';
      /* a tip about the board sits under the top row of panels, clear of them and of where the hand works */
      const top = ['hud', 'topright', 'band', 'phonebar'].map($).filter((x) => x && !x.hidden && x.offsetParent !== null).reduce((m, x) => Math.max(m, x.getBoundingClientRect().bottom), 0);
      card.style.bottom = 'auto';
      card.style.top = Math.round(Math.min(top + 12, vh * 0.4)) + 'px';
      return;
    }
    coachBox.classList.remove('loose');
    const r = t.getBoundingClientRect(), pad = 8;
    ring.hidden = false;
    Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    const ch = card.offsetHeight || 160;
    const below = r.bottom + pad + 14 + ch < vh - 12;
    card.style.bottom = 'auto';
    card.style.top = Math.round(below ? r.bottom + pad + 14 : Math.max(12, r.top - pad - 14 - ch)) + 'px';
    card.style.left = Math.round(M.clamp(r.left + r.width / 2 - cw / 2, 16, vw - cw - 16)) + 'px';
  }
  function coach(sel, text, opts) {
    endCoach();
    const o = opts || {};
    coachAt = sel; coachFor = o.move || null;
    const box = el('div', 'coach');
    const ring = el('div', 'coach-ring');
    const card = el('div', 'coach-card');
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', o.title || 'Tip');
    if (o.title) card.appendChild(el('b', 'coach-t', o.title));
    card.appendChild(el('p', '', text));
    const row = el('div', 'coach-row');
    if (o.count) row.appendChild(el('span', 'coach-n', o.count));
    if (o.next) row.appendChild(button('Stop the tour', 'small quiet', endCoach));
    if (o.back) row.appendChild(button('Back', 'small quiet', o.back));
    const ok = button(o.next ? o.nextLabel || 'Next' : 'Got it', 'small primary', () => { if (o.next) o.next(); else endCoach(); });
    row.appendChild(ok);
    card.appendChild(row);
    box.append(ring, card);
    document.body.appendChild(box);
    coachBox = box;
    coachKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); endCoach(); } };
    window.addEventListener('keydown', coachKey, true);
    window.addEventListener('resize', coachPlace);
    /* the tray opens, a panel slides, the bar redraws: the ring keeps up with what it points at */
    coachTick = setInterval(coachPlace, 250);
    coachPlace();
    requestAnimationFrame(coachPlace);
    ok.focus({ preventScroll: true });
    say((o.title ? o.title + '. ' : '') + text);
  }
  const TOUR = () => [
    { sel: '#modesw', title: 'Today and the Planner', text: 'Today is right now: the block you’re in and what’s next. The Planner is where you change things. T and P switch between them.' },
    { sel: '#zoom', title: 'Closer or further', text: 'Day, Week, Month, and Year show the same blocks from closer or further away. List shows them as plain buttons.' },
    { sel: '#rack-top', title: 'The tray', text: 'To dos, Block library' + (useDinners() ? ', dinners,' : '') + ' and the Sunday Reset. Drag from the tray onto a day. Settings, The tray bar, changes what’s on it.' },
    { sel: '#corner', title: 'Add anything', text: 'Type it the way you’d say it: Dentist Tuesday 3 pm, or Call mom by Friday. Undo is beside it.' }
  ];
  function startTour(k) {
    if (view.phone || noDesk) return;
    if (view.mode !== 'planner') setMode('planner');
    const steps = TOUR(), s = steps[k];
    if (!s) { endCoach(); return; }
    coach(s.sel, s.text, {
      title: s.title, count: (k + 1) + ' of ' + steps.length,
      back: k ? () => startTour(k - 1) : null,
      next: () => (k + 1 < steps.length ? startTour(k + 1) : (endCoach(), Snd.good())),
      nextLabel: k + 1 < steps.length ? 'Next' : 'Done'
    });
  }


  /* == now: the block you're in, worn down ==
     Time on the desk is length, so the timer is the block you're in drawn small: the red enamel pin
     where you are, the part behind you worn pale, the part ahead solid, and what's next peeking in. */
  let soonKey = '';
  const leftText = (m) => (m < 60 ? Math.max(1, Math.round(m)) + ' min' : M.dur(Math.round(m / 5) * 5));
  function nowNow() {
    const d = day(today), info = M.nowInfo(d, nowMin);
    if (info.kind === 'sleep' && info.until == null) info.tomorrow = day(M.addDays(today, 1)).wake;
    info.soon = info.kind === 'block' && info.left <= 5 && info.left > 0;
    return info;
  }
  function showCurrentBlock(b, kind) {
    const at = boardTime(today, nowMin);
    setZoom('day', at.date);
    if (!b || kind !== 'block') return;
    const shown = boardDay(at.date).blocks.find((x) => sourceKey(x) === sourceKey(b) && sourceDate(x, at.date) === sourceDate(b, today));
    selectBlock(sourceDate(b, today), sourceKey(b), { displayDate: at.date, displayKey: shown ? shown.key : b.key });
  }
  /* host gets the strip: big for the phone's Today, small for the date card */
  function nowStrip(host, info, big) {
    host.replaceChildren();
    const b = info.block, c = b ? cat(b.cat) : null;
    const label = info.kind === 'block' || info.kind === 'free' ? b.label || b.name : info.kind === 'open' ? 'Open time' : 'Sleep';
    const top = el('div', 'now-top');
    top.append(icon(b ? b.icon || 'star' : info.kind === 'open' ? 'blank' : 'bed', big ? 11 : 8, UI.ink), el('b', 'now-name', label));
    const when = info.kind === 'block' ? leftText(info.left) + ' left' : info.kind === 'sleep' ? 'Up at ' + M.clock(info.until != null ? info.until : info.tomorrow) + (info.until != null ? '' : ' tomorrow') : 'until ' + M.clock(info.end);
    top.appendChild(el('span', 'now-left' + (info.soon ? ' soon' : ''), when));
    /* the block itself, worn down to now, with the pin where you are and the next one peeking in */
    const row = el('div', 'now-row');
    const bar = el('button', 'now-bar ' + info.kind + (info.soon ? ' soon' : ''));
    bar.type = 'button';
    if (info.kind === 'block') bar.style.setProperty('--bg', c.base);
    /* asleep, the bar is the night, from bed to the morning, worn down to now */
    const night = info.kind === 'sleep' ? nightSpan(info) : null;
    const frac = night ? night.frac : Math.max(0, Math.min(1, (nowMin - info.start) / Math.max(1, info.end - info.start)));
    const worn = el('span', 'now-worn'); worn.style.width = (frac * 100).toFixed(1) + '%';
    bar.appendChild(worn);
    if (info.kind !== 'sleep' || night) { const pin = el('i', 'now-pin'); pin.style.left = (frac * 100).toFixed(1) + '%'; bar.appendChild(pin); }
    row.appendChild(bar);
    if (info.next && info.kind !== 'sleep') { const nx = el('span', 'now-next'); nx.style.setProperty('--bg', cat(info.next.cat).base); row.appendChild(nx); }
    /* the same line as the desk's band: what's next, or late in the evening, how tomorrow starts */
    const line = el('div', 'now-line', info.kind === 'sleep' ? sleepLine(info) : !info.next || nowMin >= 21 * 60 ? tomorrowLine() : 'then ' + (info.next.label || info.next.name) + ' at ' + M.clock(info.next.start));
    line.hidden = !line.textContent;
    bar.setAttribute('aria-label', label + ', ' + when + (line.textContent ? ', ' + line.textContent : ''));
    bar.addEventListener('click', () => { Snd.init(); Snd.pick(); if (view.phone) return; showCurrentBlock(b, info.kind); });
    host.append(top, row, line);
  }
  let rendering = false;
  function renderNow() {
    if (!ready) return;
    const info = nowNow();
    renderBand();
    const asked = renderMoment(), added = renderFab();
    if ((asked || added) && !rendering) layoutInsets();
    const key = info.soon ? today + '|' + info.block.base : '';
    if (key && key !== soonKey && document.visibilityState === 'visible') Snd.tick(true);
    soonKey = key;
    /* while the welcome or the setup is open, the tab never shows the sample family's timer */
    document.title = info.kind === 'block' && !view.got.setup ? (info.block.label || info.block.name) + ', ' + leftText(info.left) + ' left' : 'Sunday Reset';
    if (view.zoom === 'week' || view.zoom === 'day') { const at = boardTime(today, nowMin), tr = weekOf().indexOf(at.date); W.setNow(nowMin, tr >= 0 ? tr : null, info.soon, { weekMin: at.start, dayMin: view.focus === at.date ? at.start : null }); }
    if (view.phone) renderToday();
  }

  /* == quick add in plain words == */
  const quick = { p: null, plan: null };
  function openQuick(prefill) {
    if (view.drawer || !$('sheet').hidden) return;
    const box = $('quick');
    box.hidden = false;
    const inp = $('quick-in');
    inp.value = prefill || '';
    renderQuick();
    setTimeout(() => inp.focus(), 0);
    Snd.pick();
  }
  function closeQuick() { $('quick').hidden = true; quick.p = quick.plan = null; }
  /* What adding a parsed block would do: where it lands and what moves. */
  /* The closest start to the one asked for, a quarter hour at a time either way: first where it
     moves nothing (open time, or open blocks it can take from), then anywhere it fits. */
  function nearestStart(date, dur, want, quiet) {
    const d = day(date), lo = date === today ? Math.max(d.wake, Math.ceil(nowMin / 15) * 15) : d.wake;
    const hard = d.blocks.filter((b) => !b.soft && !b.sleep && !b.free);
    const clear = (st) => !hard.some((b) => b.start < st + dur && st < b.start + b.dur);
    for (const ok of quiet ? [clear] : [clear, (st) => M.canPlace(state, date, dur, st).ok]) {
      for (let k = 1; k <= 72; k++) {
        for (const st of [want + k * 15, want - k * 15]) {
          if (st < lo || st + dur > d.bed) continue;
          if (ok(st)) return st;
        }
      }
    }
    return null;
  }
  function quickPlan(p, asked) {
    const dur = M.gridDur(p.dur || 30);
    const add = { name: p.name || 'Something', cat: p.cat, icon: p.icon, dur, src: p.pal ? { type: 'block', id: p.pal } : { type: 'custom' } };
    const at = M.dateTime(p.date, M.snap(p.start)), date = at.date;
    let want = at.start;
    /* "Thursday evening" means the first open spot that evening, not pushing things at 7 */
    if (p.part && asked == null) {
      const d = day(date), r = { morning: [d.wake, 720], afternoon: [720, 1080], evening: [1080, d.bed] }[p.part];
      const f = M.firstFit(state, date, dur, date === today ? Math.max(r[0], Math.ceil(nowMin / 15) * 15) : r[0]);
      if (f != null && f + dur <= r[1]) want = f;
    }
    const tr = tryOn(() => M.placeAdd(state, date, add, want));
    if (!tr.r.ok) {
      const why = tr.r.reason === 'fixed' && tr.r.blocker ? tr.r.blocker.name + ' is locked at ' + M.clock(want) : 'There’s no room at ' + M.clock(want);
      const alt = asked == null ? nearestStart(date, dur, want) : null;
      const plan = alt != null ? quickPlan(Object.assign({}, p, { date, start: alt }), want) : null;
      if (plan && plan.ok) { plan.text = why + ', so it goes at ' + M.clock(plan.start) + ', the closest time that fits. ' + plan.text; return plan; }
      return { add, date, start: want, ok: false, text: why + ', and nothing else fits that day.' };
    }
    const dates = M.range(date, 2), scratch = Object.assign({}, state, { dates: tr.dates });
    const read = (board) => dates.flatMap((d) => M.calendarDay(board, d).blocks.map((b) => Object.assign({}, b, { previewStart: M.windowTime(date, d, b.start) })));
    const before = read(state), after = read(scratch);
    const identity = (b) => b.add ? 'add:' + b.add : b.sourceDate + '|' + (b.sourceKey || b.base);
    const location = (b) => M.windowTime(date, b.sourceDate, b.sourceStart);
    const moved = Array.from(new Map(after.filter((b) => !b.soft && !b.sleep && b.add !== tr.r.add.id && before.some((x) => identity(x) === identity(b) && location(x) !== location(b))).map((b) => [identity(b), b])).values());
    const cut = before.filter((b) => b.soft && b.previewStart < tr.r.start + dur && b.previewStart + b.dur > tr.r.start);
    const text = moved.length ? moved.slice(0, 2).map((b) => { const time = M.dateTime(b.sourceDate, b.sourceStart); return (b.label || b.name) + ' slides to ' + M.clock(time.start) + (time.date !== date ? ' on ' + M.dateText(time.date, 'day') : ''); }).join('. ') + '.' : cut.length ? 'Takes this time from ' + (cut[0].label || cut[0].name) + '.' : 'Fits without moving anything.';
    /* when the time you asked for moves something, the closest time that moves nothing is one tap away */
    const quiet = moved.length && asked == null ? nearestStart(date, dur, tr.r.start, true) : null;
    return { add, date: tr.r.date || date, start: tr.r.start, ok: true, text, quiet };
  }
  function renderQuick() {
    const out = $('quick-out');
    out.replaceChildren();
    const p = quick.p = M.parseQuick($('quick-in').value, today, state.palette, nowMin, QUICK_OPTS);
    quick.plan = null;
    if (!p || !p.name) { out.appendChild(el('p', 'quick-line', 'A name, a day, and a time. Without a time it becomes a to do. Paste a list and each line becomes one.')); return; }
    const row = el('div', 'quick-row');
    if (p.kind === 'block') {
      const plan = quick.plan = quickPlan(p);
      const wd = M.dateText(plan.date, 'day');
      preview(row, { label: p.name, cat: p.cat, icon: p.icon }, { time: wd + ' · ' + timeSpan(plan.date, plan.start, plan.start + plan.add.dur) + ' · ' + M.dur(plan.add.dur) });
      out.appendChild(row);
      out.appendChild(el('p', 'quick-line' + (plan.ok ? '' : ' bad'), plan.text));
      const acts = el('div', 'quick-acts');
      const go = button(plan.ok ? 'Add to ' + (plan.date === today ? 'today' : M.DAY_LONG[M.weekday(plan.date)]) + ' at ' + M.clock(plan.start) : 'Pick another time', 'go', () => quickCommit(false));
      go.disabled = !plan.ok;
      acts.appendChild(go);
      if (plan.quiet != null) acts.appendChild(button('At ' + M.clock(plan.quiet) + ', nothing moves', 'small', () => { quick.plan = quickPlan(Object.assign({}, p, { date: plan.date, start: plan.quiet }), plan.start); quickCommit(false); }));
      acts.appendChild(button('Adjust', 'small quiet', () => quickCommit(true)));
      out.appendChild(acts);
    } else {
      const t = el('div', 'quick-task');
      const g = state.groups.find((x) => x.id === inboxId());
      t.append(icon(p.icon === 'star' ? 'flag' : p.icon, 10, '#4B3A18'), el('b', '', p.name), el('span', '', 'A to do in ' + (g ? g.name : 'To do') + (p.due ? ', due ' + M.relText(p.due, today) : ', no date')));
      row.appendChild(t);
      out.appendChild(row);
      const acts = el('div', 'quick-acts');
      acts.append(button('Add to To do', 'go', () => quickCommit(false)));
      out.appendChild(acts);
    }
  }
  function quickCommit(adjust) {
    const p = quick.p;
    if (!p || !p.name) { if (view.phone) toast('A name, and a day or a time, like Gym tomorrow 6pm'); return; }
    if (p.kind === 'task') {
      const gid = inboxId(), g = state.groups.find((x) => x.id === gid);
      commit(() => { state.tasks.push({ id: M.newId('t'), name: p.name, group: gid, icon: p.icon === 'star' ? 'check' : p.icon, cat: p.cat, dur: p.dur || null, due: p.due || null, repeat: null, done: false, steps: [] }); });
      Snd.good();
      toast(p.name + ' is in ' + (g ? g.name : 'To do') + (p.due ? ', due ' + M.relText(p.due, today) : ''), 'good');
      closeQuick();
      noteMove('todo');
      return true;
    }
    const plan = quick.plan;
    if (adjust) {
      const at = boardTime(plan.date, plan.start);
      closeQuick();
      if (!weekOf().includes(at.date)) view.focus = at.date;
      render();
      openSel({ type: 'place', spec: { kind: 'quick', add: plan.add }, date: at.date, start: at.start, dur: plan.add.dur, startFor: at.date, durFor: plan.add.dur });
      return;
    }
    if (!plan.ok) { Snd.bad(); toast(plan.text, 'bad'); return false; }
    const r = commit(() => M.placeAdd(state, plan.date, plan.add, plan.start));
    if (r && r.ok) {
      Snd.clack(plan.add.dur / 60);
      const actual = M.dateTime(r.date || plan.date, r.start), display = boardTime(actual.date, actual.start);
      W.squash(display.date, actual.date + ':add:' + r.add.id);
      const n = M.diffDays(today, actual.date);
      toast(plan.add.name + ', ' + (n >= 0 && n < 7 ? M.relText(actual.date, today) : M.dateText(actual.date, 'day')) + ' at ' + M.clock(actual.start), 'good', { label: 'Undo', fn: undo });
      closeQuick();
      return true;
    }
    return false;
  }
  /* A list pasted from Notes or a message: each line a to do, in one change, so one Undo takes them all
     back. Bullets, numbers, and checkboxes at the start of a line are dropped; a day in a line makes it due. */
  function pastedList(e) {
    const t = (e.clipboardData && e.clipboardData.getData('text')) || '';
    const lines = t.split(/\r?\n/).map((x) => x.replace(/^\s*(?:[-*•‣◦]|\d+[.)]|\[[ xX]?\])\s*/, '').trim()).filter(Boolean);
    if (lines.length < 2) return false;
    e.preventDefault();
    const gid = inboxId(), g = state.groups.find((x) => x.id === gid), list = lines.slice(0, 60);
    commit(() => {
      list.forEach((line) => {
        const p = M.parseQuick(line, today, state.palette, nowMin, QUICK_OPTS) || {};
        state.tasks.push({ id: M.newId('t'), name: (p.name || line).slice(0, 120), group: gid, icon: !p.icon || p.icon === 'star' ? 'check' : p.icon, cat: p.cat || 'yours', dur: p.dur || null, due: (p.kind === 'task' ? p.due : p.date) || null, repeat: null, done: false, steps: [] });
      });
    });
    Snd.good();
    toast(plural(list.length, 'to do', 'to dos') + ' in ' + (g ? g.name : 'To do') + (lines.length > list.length ? ' (the first 60)' : '') + '.', 'good', { label: 'Undo', fn: undo });
    noteMove('todo');
    return true;
  }
  $('quick-in').addEventListener('paste', (e) => { if (pastedList(e)) closeQuick(); });
  $('quick-in').addEventListener('input', renderQuick);
  $('quick-in').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.altKey && quick.p && quick.p.kind === 'block') { e.preventDefault(); quickCommit(true); }
    else if (e.key === 'Enter') { e.preventDefault(); quickCommit(false); }
    else if (e.key === 'Escape') { e.preventDefault(); closeQuick(); }
  });
  document.addEventListener('pointerdown', (e) => { if (!$('quick').hidden && !$('quick').contains(e.target) && !(e.target.closest && e.target.closest('#add-btn, #fab-add'))) closeQuick(); }, true);

  /* == the desk: its theme and what sits around the board ==
     Chosen per device and kept with the view, never in the board, so a change here never touches
     a save. Themes and the original things are always here; the kit's other things load the first
     time a layout needs them: its index and free things, then each family's pack. */
  const LEGACY_IDS = ['plant', 'mug', 'notepad', 'pencil', 'lamp', 'books', 'clock'];
  const scripts = new Map();
  function loadScript(src) {
    if (!scripts.has(src)) scripts.set(src, new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { scripts.delete(src); rej(new Error(src)); }; document.head.appendChild(s); }));
    return scripts.get(src);
  }
  async function loadKit(ids) {
    if (!window.PropKit) await loadScript('src/kit/kit-data.js');
    const PK = window.PropKit;
    const packs = new Set((ids || []).map((id) => PK.index[id] && PK.index[id].pack).filter((pk) => pk && pk !== 'core' && PK.packs[pk]));
    await Promise.all([...packs].map((pk) => loadScript(PK.packs[pk].file)));
    Object.assign(window.PropData, PK.things);
  }
  const layoutIds = (id) => { const L = window.DeskThemes && DeskThemes.LAYOUTS[id]; return L ? ['L', 'R'].flatMap((sd) => (L[sd] || []).flat()) : []; };
  let deskTicket = 0;
  async function applyDesk() {
    if (!window.DeskThemes || !ready) return;
    const d = view.desk, ids = layoutIds(d.layout), t = ++deskTicket;
    if (ids.some((id) => !LEGACY_IDS.includes(id) && !(window.PropData && PropData[id]))) {
      try { await loadKit(ids); } catch (e) { toast('Some of this desk’s things aren’t in this copy of Sunday Reset.', 'bad'); }
      if (t !== deskTicket) return;
    }
    W.setDesk({ theme: d.theme, layout: d.layout });
    /* the page behind the desk matches it, so a resize never flashes Warm's tan at the edges */
    document.body.style.backgroundColor = d.theme === 'warm' ? '' : DeskThemes.resolve(d.theme).background;
    render();
  }
  function setDeskChoice(patch) {
    view.desk = Object.assign({}, view.desk, patch);
    saveView();
    Snd.slide();
    applyDesk();
    if (view.drawer) renderDrawer();
  }
  /* a theme's card: its desk, its mat, a board, and three blocks, drawn from its own settings */
  function themeCard(r) {
    const cv = document.createElement('canvas'), W = 176, H = 112;
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    r.wood.planks.tones.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * H / 4, W, H / 4 + 1); });
    const box = (x, y, w, h, rad, c) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, rad); g.fill(); };
    box(14, 14, W - 28, H - 28, 12, r.mat.color);
    box(26, 24, W - 52, H - 48, 7, r.boards.board.base);
    const pal = r.blocks || D.CATS;
    ['work', 'yours', 'meals'].forEach((k, i) => box(36 + i * 38, 40, 32, 22, 4, pal[k].base));
    return cv;
  }
  function deskSection(box) {
    const K = window.DeskThemes;
    if (!K) return;
    const sec = dsec(box, 'The desk', 'How the desk looks on this device. Your board and your week stay the same.');
    const grid = el('div', 'desk-themes');
    K.THEME_ORDER.forEach((id) => {
      const t = K.THEMES[id], b = el('button', 'desk-theme');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(view.desk.theme === id));
      b.title = t.note;
      const name = el('span', 'desk-theme-name', t.name);
      b.append(themeCard(K.resolve(id)), name);
      b.addEventListener('click', () => { Snd.init(); if (view.desk.theme !== id) setDeskChoice({ theme: id }); });
      grid.appendChild(b);
    });
    field(sec, 'Theme', grid);
    field(sec, 'What sits around it', chips(K.LAYOUT_ORDER.map((id) => ({ id, name: K.LAYOUTS[id].name })), view.desk.layout, (id) => { if (id !== view.desk.layout) setDeskChoice({ layout: id }); }));
    /* what the picked layout puts on each side, by name */
    const nameOf = (id) => (K.LEGACY[id] ? K.LEGACY[id].name : window.PropKit && PropKit.index[id] ? PropKit.index[id].name : id.replace(/_/g, ' '));
    const L = K.LAYOUTS[view.desk.layout];
    const side = (ids) => ids.flat().map(nameOf).join(', ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
    sec.appendChild(el('p', 'dsec-line', L && (L.L.length || L.R.length) ? 'On the left: ' + (side(L.L) || 'nothing') + '. On the right: ' + (side(L.R) || 'nothing') + '.' : 'Nothing around the board.'));
  }

  /* == Today and the Planner ==
     Today is right now: the block you're in, big, the day board alone on the mat, one question when
     it's time, the dock, and Add. The Planner is everything else: other days, the week, kinds of day,
     Block library, and the Sunday Reset. Weekdays open in Today and Sunday opens in the Planner; a switch
     is kept for the rest of the day, and the Planner keeps its own place. T and P switch. */
  const MODE_KEY = 'sundayreset.mode', SEEN_KEY = 'sundayreset.moments';
  const defaultMode = () => (M.weekday(today) === 0 ? 'planner' : 'today');
  function loadMode() {
    try {
      const m = JSON.parse(localStorage.getItem(MODE_KEY) || 'null');
      /* saves from before the rename said do and plan */
      const mode = m && m.date === today && { today: 'today', planner: 'planner', do: 'today', plan: 'planner' }[m.mode];
      if (mode) return mode;
    } catch (e) { /* fine */ }
    return defaultMode();
  }
  /* never during a preview: its mode and a held day are made up, and the real one comes back after */
  function saveMode() { if (view.preview) return; try { localStorage.setItem(MODE_KEY, JSON.stringify({ date: today, mode: view.mode })); } catch (e) { /* fine */ } }
  function applyModeClass() { document.body.classList.toggle('mode-today', inToday()); }
  /* Today is always today in the day view, with nothing picked and nothing laid out */
  function enterToday() {
    view.zoom = 'day'; view.focus = boardTime(today, nowMin).date; view.bench = null; view.level = null; view.dockOpen = false; view.sel = null;
    view.pick = null; W.setSelected(null); $('kinds').classList.remove('open');
  }
  function setMode(m) {
    if (m === view.mode || view.phone) return;
    if (m === 'today') {
      view.plannerAt = { zoom: view.zoom, focus: view.focus, date: today };
      if (view.reset) { view.reset = null; view.before = null; }
      view.mode = 'today';
      enterToday();
    } else {
      view.mode = 'planner';
      const at = view.plannerAt;
      if (at && at.date === today) { view.zoom = at.zoom; view.focus = at.focus; }
      view.bench = null; view.dockOpen = false;
    }
    saveMode();
    closeQuick();
    Snd.slide();
    render();
  }
  /* built once, so a key press on it keeps its focus; it moves between the band and the Planner's corner */
  let modeBtns = null;
  function renderModeSwitch() {
    const box = $('modesw'), home = inToday() ? $('band-tabs') : $('topright');
    const had = box.contains(document.activeElement);
    if (!modeBtns) {
      modeBtns = [['today', 'Today', 'T', 'Right now: what you’re in and what’s next'], ['planner', 'Planner', 'P', 'Every day, Block library, and the Sunday Reset']].map(([m, name, key, what]) => {
        const b = el('button', '', name);
        b.type = 'button';
        b.dataset.mode = m;
        b.appendChild(el('kbd', '', key));
        b.title = what + ' (' + key + ')';
        b.addEventListener('click', () => { Snd.init(); setMode(m); });
        box.appendChild(b);
        return b;
      });
    }
    if (box.parentElement !== home) { if (inToday()) home.appendChild(box); else home.insertBefore(box, home.firstChild); }
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(view.mode === b.dataset.mode)));
    if (had && !box.contains(document.activeElement)) modeBtns.find((b) => b.dataset.mode === view.mode).focus();
  }
  /* what was answered or put off today, per device */
  /* a preview keeps its own answers in memory, so a made up board never silences the real one's question
     or writes a made up date to this device */
  function seenToday() {
    if (view.preview) return view.preview.seen && view.preview.seen.date === today ? view.preview.seen : { date: today };
    try { const x = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null'); if (x && x.date === today) return x; } catch (e) { /* fine */ }
    return { date: today };
  }
  function markSeen(patch) {
    if (view.preview) { view.preview.seen = Object.assign(seenToday(), patch); return; }
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(Object.assign(seenToday(), patch))); } catch (e) { /* fine */ }
  }

  /* The band: the block you're in, big, worn down to now, and what's next. Its states: in a block,
     the last five minutes (gold), time back after Done early, open time, free time, the evening
     looking ahead to tomorrow, and asleep. It's rebuilt only when what it says changes; the clock
     ticking over updates the numbers in place, so focus and a hint being read stay put. */
  const blockName = (b) => b.label || b.name;
  function lockedFirst(date) { return day(date).blocks.find((b) => !b.sleep && b.fixed) || null; }
  function tomorrowLine() {
    const t = M.addDays(today, 1), lk = lockedFirst(t), first = day(t).blocks.find((b) => !b.sleep && !b.free);
    /* the time first: at night that's what matters. The first thing that can't move, even when
       something movable comes before it */
    if (lk) return 'Tomorrow at ' + M.clock(lk.start) + ': ' + blockName(lk);
    return first ? 'Tomorrow starts at ' + M.clock(first.start) + ' with ' + blockName(first) : '';
  }
  /* the night as a span: from tonight's bed (or last night's) to the morning, and how much is behind you */
  function nightSpan(info) {
    if (info.until != null) { const y = day(M.addDays(today, -1)), from = y.bed - 1440, to = info.until; return { from, to, frac: M.clamp((nowMin - from) / Math.max(1, to - from), 0, 1) }; }
    const from = day(today).bed, to = 1440 + (info.tomorrow != null ? info.tomorrow : day(M.addDays(today, 1)).wake);
    return { from, to, frac: M.clamp((nowMin - from) / Math.max(1, to - from), 0, 1) };
  }
  /* asleep: how long until the morning, then the first thing that can't move, if there is one */
  function sleepLine(info) {
    const n = nightSpan(info), left = Math.max(0, n.to - nowMin);
    const first = info.until != null ? lockedFirst(today) : lockedFirst(M.addDays(today, 1));
    return (left >= 60 ? M.hours(left) + ' of sleep left' : 'Almost morning') + (first ? '. ' + blockName(first) + ' at ' + M.clock(first.start) : '');
  }
  /* the evening's ways forward: tomorrow a tap away, and its dinner when it isn't decided */
  function eveningActs(info) {
    const late = info.kind === 'sleep' ? info.until == null : nowMin >= 20 * 60;
    if (!late) return [];
    const t = M.addDays(today, 1), din = useDinners() ? day(t).blocks.find((b) => b.dinner) : null;
    const out = [{ id: 'tomorrow', label: 'See tomorrow', icon: 'later' }];
    if (din && !din.planned) out.push({ id: 'dinner', label: 'Tomorrow’s dinner', icon: 'pot', date: t });
    return out;
  }
  /* the last block before bed ends for the night, not early */
  const lastOfDay = (b) => b.start + b.dur >= day(today).bed;
  function morningLine(date) {
    const first = day(date).blocks.find((b) => !b.sleep && !b.free), lk = lockedFirst(date);
    if (!first) return '';
    return 'First: ' + blockName(first) + ' at ' + M.clock(first.start) + (lk && lk.base !== first.base ? ', then ' + blockName(lk) + ' at ' + M.clock(lk.start) : '');
  }
  /* ideas for open time lead with something of yours, then moving, then people, then home */
  const IDEA_ROWS = ['Make', 'Move', 'People', 'Home and meals'].map((n) => D.KIT_ROWS.find((r) => r.name === n)).filter(Boolean);
  /* the same, with what the setup said to lean toward first */
  const ideaRows = () => { const lead = kitLead(); return IDEA_ROWS.slice().sort((x, y) => (lead.includes(x.name) ? lead.indexOf(x.name) : 99) - (lead.includes(y.name) ? lead.indexOf(y.name) : 99)); };
  /* something started in open time starts at the quarter hour you're in, so it's the block you're in */
  const openStart = (info) => M.clamp(Math.floor(nowMin / 15) * 15, info.start, info.end - 15);
  function bandBtn(label, ic, fn) {
    const x = el('button', 'band-btn');
    x.type = 'button';
    x.append(icon(ic, 8, UI.ink), el('span', '', label));
    x.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); fn(); });
    return x;
  }
  function moreHint(b, r) {
    if (!r.ok) {
      if (r.reason === 'fixed' && r.blocker) return blockName(r.blocker) + ' is locked at ' + M.clock(r.blocker.start) + ', so ' + blockName(b) + ' can’t run longer';
      return 'It’s too close to bedtime to run longer';
    }
    const pushed = (r.pushes || []).slice().sort((x, y) => x.start - y.start);
    const named = (base) => { const x = day(today).blocks.find((y) => y.base === base); return x ? blockName(x) : 'The next block'; };
    if (pushed.length) return named(pushed[0].base) + ' slides to ' + M.clock(pushed[0].start) + (pushed.length > 1 ? ', and ' + plural(pushed.length - 1, 'more after it', 'more after it') : '');
    if (r.took && r.took.length) return 'Takes 15 min from ' + blockName(r.took[0]);
    return 'Nothing else moves';
  }
  /* Done early: the block ends at the last quarter hour and, for a to do, it's done. Stop here: the
     block ends the same way, and the to do stays open with what's left of it. One change, one Undo. */
  function doneEarly(b, stop) {
    const src = b.src || {}, t = src.type === 'task' || src.type === 'step' ? taskById(src.type === 'task' ? src.id : src.task) : null;
    let next = null;
    const r = commit(() => {
      const x = M.endEarly(state, sourceDate(b, today), sourceKey(b), sourceMinute(b, today, nowMin));
      if (!x.ok) return x;
      view.back = { date: today, end: M.windowTime(today, sourceDate(b, today), x.end) };
      if (t && !b.done && !stop) next = markDone(t, src.type === 'step' ? src.id : null, true);
      return x;
    });
    if (!r || !r.ok) { Snd.bad(); return; }
    if (stop) Snd.slide(); else Snd.good();
    const said = blockName(b) + (stop ? ' stopped at ' : ' ended at ') + M.clock(r.end) + (t && !b.done ? (stop ? '. It’s still on your list.' : ', and it’s done.') : '.');
    bandSay(said);
    toast(said, '', { label: 'Undo', fn: () => { view.back = null; view.bandSaid = null; undo(); } });
    if (next) toast('Next ' + t.name + ': ' + M.dateText(next.due));
  }
  /* what a tap did stays in the band's line for a few seconds, instead of the next preview */
  function bandSay(text) {
    view.bandSaid = { text, until: Date.now() + 5000 };
    renderBand();
    setTimeout(() => { if (view.bandSaid && view.bandSaid.until <= Date.now() + 50) { view.bandSaid = null; renderBand(); } }, 5100);
  }
  function moreMinutes(b) {
    const was = moreHint(b, M.previewExtend(state, sourceDate(b, today), sourceKey(b), 15, sourceMinute(b, today, nowMin)));
    const r = commit(() => M.extendBlock(state, sourceDate(b, today), sourceKey(b), 15, sourceMinute(b, today, nowMin)));
    if (!r || !r.ok) { Snd.bad(); toast(moreHint(b, r || {}), 'bad'); return; }
    Snd.clack(0.4);
    W.squash(today, b.base);
    bandSay(blockName(b) + ' runs until ' + M.clock(r.end) + '. ' + (was === 'Nothing else moves' ? 'Nothing else moved.' : was.replace(' slides to ', ' moved to ') + '.'));
    toast(blockName(b) + ' runs until ' + M.clock(r.end), '', { label: 'Undo', fn: () => { view.bandSaid = null; undo(); } });
  }
  function fillWith(p, at) {
    const r = commit(() => M.placeAdd(state, today, { name: p.name, cat: p.cat, icon: p.icon, dur: p.dur, src: { type: 'block', id: p.id } }, at));
    if (!r || !r.ok) { Snd.bad(); toast(blockedText(r || {}), 'bad'); return; }
    view.back = null;
    Snd.clack(p.dur / 60);
    W.squash(today, 'add:' + r.add.id);
    toast(p.name + ' until ' + M.clock(r.start + p.dur), 'good', { label: 'Undo', fn: undo });
  }
  /* late in the day, a quiet word on the time that was yours: never a streak, never a score */
  const keptLine = () => { const y = M.totals([day(today)]).yours || 0; return nowMin >= 21 * 60 && y >= 30 ? 'You kept ' + M.hours(y) + ' yours today. ' : ''; };
  let bandSig = '';
  const bandRefs = {};
  function renderBand() {
    const band = $('band');
    band.hidden = !inToday();
    if (band.hidden) { bandSig = ''; return; }
    const tab = $('band-date');
    if (!tab.firstChild) tab.append(el('span', 'bd-day'), el('span', 'bd-clock'), icon('sliders', 7, UI.gold));
    tab.children[0].textContent = M.dateText(today, 'long');
    tab.children[1].textContent = M.clock(nowMin);
    const info = nowNow(), b = info.block, box = $('band-in');
    const back = !!(view.back && view.back.date === today && info.kind === 'open' && info.start === view.back.end);
    /* a locked block (a shift, a pick up) is when it is: no Done early or 15 more minutes on it */
    const own = info.kind === 'block' && (b.tpl || b.add) && !b.fixed;
    const early = own ? M.previewEndEarly(state, sourceDate(b, today), sourceKey(b), sourceMinute(b, today, nowMin)) : null;
    const more = own ? M.previewExtend(state, sourceDate(b, today), sourceKey(b), 15, sourceMinute(b, today, nowMin)) : null;
    const at = info.kind === 'open' ? openStart(info) : 0;
    const ideas = info.kind === 'open' && info.left >= 15 ? M.fillIdeas(library(), ideaRows(), info.end - at) : [];
    const lately = view.bandSaid && view.bandSaid.until > Date.now() ? view.bandSaid.text : '';
    const said = lately || info.kind === 'sleep' ? lately || sleepLine(info)
      : info.kind === 'open' ? (ideas.length ? (back ? 'Keep it open, or start something of yours:' : 'Fill it?') : info.next ? 'then ' + blockName(info.next) + ' at ' + M.clock(info.next.start) : '')
      : info.kind === 'free' ? 'Nothing planned, on purpose.'
      : !info.next || nowMin >= 21 * 60 ? keptLine() + tomorrowLine() : 'then ' + blockName(info.next) + ' at ' + M.clock(info.next.start);
    const name = info.kind === 'sleep' ? 'Sleep' : info.kind === 'open' ? (back ? 'You have ' + leftText(info.left) + ' back' : 'Open') : blockName(b);
    const leftTxt = info.kind === 'block' ? leftText(info.left) + ' left' : info.kind === 'sleep' || back ? '' : leftText(info.left);
    const night = info.kind === 'sleep' ? nightSpan(info) : null;
    const frac = night ? night.frac : Math.max(0, Math.min(1, (nowMin - info.start) / Math.max(1, info.end - info.start)));
    const barLabel = night ? 'The night, ' + M.hours(Math.max(0, night.to - nowMin)) + ' until morning' : (info.kind === 'block' ? blockName(b) + ', ' + leftText(info.left) + ' left' : 'Open until ' + M.clock(info.end)) + (info.next ? ', then ' + blockName(info.next) : '');
    const sig = JSON.stringify([info.kind, b && b.base, b && blockName(b), b && b.icon, back, info.start, info.end, info.soon, info.next && info.next.base, info.until, said, early && early.ok, more && more.ok, at, ideas.map((p) => p.id + p.dur), state.dinners[today] && 1, b && b.done, eveningActs(info).map((a) => a.id).join()]);
    if (sig === bandSig) {
      /* the minute changed and nothing else: update the numbers in place */
      bandRefs.name.textContent = name;
      if (bandRefs.left) bandRefs.left.textContent = leftTxt;
      if (bandRefs.worn) { bandRefs.worn.style.width = (frac * 100).toFixed(1) + '%'; bandRefs.pin.style.left = (frac * 100).toFixed(1) + '%'; bandRefs.bar.setAttribute('aria-label', barLabel); }
      return;
    }
    bandSig = sig;
    for (const k of Object.keys(bandRefs)) delete bandRefs[k];
    box.className = 'panel band-in ' + info.kind + (info.soon ? ' soon' : '') + (back ? ' back' : '');
    box.replaceChildren();
    /* what, and how long */
    const top = el('div', 'band-top');
    top.appendChild(icon(info.kind === 'sleep' ? 'bed' : info.kind === 'open' ? (back ? 'check' : 'blank') : b.icon || 'star', 12, UI.ink));
    bandRefs.name = el('h2', 'band-name', name);
    top.appendChild(bandRefs.name);
    const when = el('div', 'band-when');
    if (leftTxt) { bandRefs.left = el('b', 'band-left', leftTxt); when.appendChild(bandRefs.left); }
    if (info.kind === 'block') when.appendChild(el('span', 'band-at', 'ends ' + M.clock(info.end)));
    else if (info.kind === 'sleep') when.appendChild(el('span', 'band-at', 'up at ' + M.clock(info.until != null ? info.until : info.tomorrow)));
    else when.appendChild(el('span', 'band-at', 'until ' + (info.next ? blockName(info.next) + ' at ' : '') + M.clock(info.end)));
    top.appendChild(when);
    box.appendChild(top);
    /* the block itself, worn down to now, with the pin where you are and the next one peeking in */
    {
      const row = el('div', 'band-row');
      const bar = el('button', 'band-bar ' + info.kind + (info.soon ? ' soon' : ''));
      bar.type = 'button';
      /* a pale block wears darker, so the part behind you still reads */
      if (info.kind === 'block') { const lk = W.look(b); bar.style.setProperty('--bg', lk.base); if (lk.ink.toUpperCase() !== '#FFFFFF') bar.classList.add('light'); }
      const worn = el('span', 'band-worn'); worn.style.width = (frac * 100).toFixed(1) + '%';
      const pin = el('i', 'band-pin'); pin.style.left = (frac * 100).toFixed(1) + '%';
      bar.append(worn, pin);
      bar.setAttribute('aria-label', barLabel);
      bar.addEventListener('click', () => { Snd.init(); Snd.pick(); const i = nowNow(); showCurrentBlock(i.block, i.kind); });
      row.appendChild(bar);
      Object.assign(bandRefs, { bar, worn, pin });
      if (info.next && !night) { const nx = el('span', 'band-next'); nx.style.setProperty('--bg', W.look(info.next).base); row.appendChild(nx); }
      box.appendChild(row);
    }
    /* what's next, and what you can do about it */
    const foot = el('div', 'band-foot'), line = el('p', 'band-line', said), acts = el('div', 'band-acts');
    line.id = 'band-line';
    /* pointing at a button says what it will do, in the line under the bar, worked out right then */
    const hint = (x, text) => {
      /* right after a tap, the line keeps saying what happened until you point somewhere else */
      const on = () => { if (view.bandSaid && view.bandSaid.until > Date.now()) return; line.textContent = text(); line.classList.add('hint'); };
      const off = () => { line.textContent = said; line.classList.remove('hint'); };
      x.addEventListener('pointerenter', on); x.addEventListener('focus', on); x.addEventListener('pointerleave', off); x.addEventListener('blur', off);
      x.setAttribute('aria-describedby', 'band-line');
    };
    if (own) {
      const src = b.src || {}, isTodo = (src.type === 'task' || src.type === 'step') && !b.done;
      if (early.ok) {
        const x = bandBtn(isTodo ? 'Done' : lastOfDay(b) ? 'Done for the night' : 'Done early', 'check', () => doneEarly(b));
        hint(x, () => { const min = sourceMinute(b, today, nowMin), e = M.previewEndEarly(state, sourceDate(b, today), sourceKey(b), min); return e.ok ? 'Tap to end ' + blockName(b) + ' at ' + M.clock(e.end) + ', the last quarter hour' + (isTodo ? ', and mark it done' : '') + '. You get ' + leftText(e.back - (min - e.end)) + ' back.' : ''; });
        acts.appendChild(x);
        if (isTodo) {
          const y = bandBtn('Stop here', 'x', () => doneEarly(b, true));
          hint(y, () => 'Tap to stop at ' + M.clock(M.previewEndEarly(state, sourceDate(b, today), sourceKey(b), sourceMinute(b, today, nowMin)).end || nowMin) + '. ' + blockName(b) + ' stays on your list.');
          acts.appendChild(y);
        }
      }
      const x = bandBtn('15 more minutes', 'longer', () => moreMinutes(b));
      hint(x, () => { const h = moreHint(b, M.previewExtend(state, sourceDate(b, today), sourceKey(b), 15, sourceMinute(b, today, nowMin))); return M.previewExtend(state, sourceDate(b, today), sourceKey(b), 15, sourceMinute(b, today, nowMin)).ok ? 'Tap for 15 more: ' + h[0].toLowerCase() + h.slice(1) + '.' : h + '.'; });
      if (!more.ok) x.classList.add('off');
      acts.appendChild(x);
    }
    /* late in the evening, and asleep: tomorrow a tap away, and its dinner when it isn't decided */
    eveningActs(info).forEach((a) => {
      const x = bandBtn(a.label, a.icon, () => { Snd.pick(); if (a.id === 'tomorrow') { setMode('planner'); setZoom('day', M.addDays(today, 1)); } else openSel({ type: 'dinner', date: a.date }); });
      hint(x, () => a.id === 'tomorrow' ? 'Tap to open tomorrow in the Planner. ' + tomorrowLine() + '.' : 'Tap to decide tomorrow’s dinner tonight.');
      acts.appendChild(x);
    });
    ideas.forEach((p) => {
      const c = cat(p.cat), x = el('button', 'band-idea');
      x.type = 'button';
      x.style.setProperty('--bg', c.base); x.style.setProperty('--ink', c.ink);
      x.append(icon(p.icon || 'star', 8, c.ink), el('span', '', p.name));
      x.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); fillWith(p, openStart(nowNow())); });
      hint(x, () => p.name + ', ' + M.span(at, at + p.dur));
      acts.appendChild(x);
    });
    foot.append(line, acts);
    box.appendChild(foot);
  }

  /* The one question worth asking now, under the band: tonight's dinner from 3 pm, or on a morning,
     what kind of day it is. An answer gets a line back, then the strip folds. Like the band, it's
     rebuilt only when what it asks changes. */
  let lastMoment = null, momentSig = '';
  const dinnerSaid = (dn) => (dn.name ? dn.name + ' tonight.' + (dn.cook && dn.cook !== 'home' ? ' ' + cookName(dn.cook) + '.' : '') : cookName(dn.cook) + ' tonight.');
  function sayMoment(text, undoable) {
    view.said = { text, undoable, until: Date.now() + (undoable ? 6200 : 4200) };
    setTimeout(() => { if (view.said && view.said.until <= Date.now() + 50) { view.said = null; if (renderMoment()) layoutInsets(); } }, undoable ? 6300 : 4300);
  }
  /* every question can be put away: an x at the end of the strip, named for what it does */
  function dismiss(label, fn) {
    const x = el('button', 'moment-x');
    x.type = 'button';
    x.title = label;
    x.setAttribute('aria-label', label);
    x.appendChild(icon('x', 8, UI.soft));
    x.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); Snd.slide(); fn(); render(); });
    return x;
  }
  function renderMoment() {
    const box = $('moment'), was = box.hidden;
    const m = inToday() && !view.reset ? M.momentFor(state, today, nowMin, Object.assign(seenToday(), useDinners() ? {} : { dinnerNo: true }), day(today)) : null;
    if (lastMoment && lastMoment.kind === 'dinner' && !(m && m.kind === 'dinner')) { const dn = state.dinners[today]; if (dn && (dn.name || dn.cook)) sayMoment(dinnerSaid(dn)); }
    lastMoment = m;
    view.moment = m;
    const said = inToday() && view.said && view.said.until > Date.now() ? view.said : null;
    const din = m && m.kind === 'dinner' ? m.block : null;
    /* put off once, it can come back later, and it always says when */
    const later = din && !m.again ? (nowMin < 17 * 60 - 30 && din.start > 17 * 60 + 30 ? 'five' : nowMin + 60 < din.start ? 'hour' : null) : null;
    const sig = JSON.stringify([said && said.text, said && said.undoable, m && m.kind, din && din.start, later, today]);
    if (sig === momentSig) return was !== box.hidden;
    momentSig = sig;
    box.replaceChildren();
    box.className = 'panel moment' + (m ? ' ' + m.kind : '');
    const text = el('p', 'moment-text'), acts = el('div', 'moment-acts');
    if (said) {
      box.classList.add('said');
      text.textContent = said.text;
      box.append(icon('check', 9, '#8FD3B1'), text);
      if (said.undoable) { acts.appendChild(button('Undo', 'moment-later', () => { view.said = null; undo(); })); box.appendChild(acts); }
      box.hidden = false;
    } else if (!m) box.hidden = true;
    else if (din) {
      text.append(el('b', '', 'Dinner at ' + M.clock(din.start)), document.createTextNode(' isn’t decided yet.'));
      acts.appendChild(button('Pick dinner', 'moment-go', () => { Snd.pick(); openSel({ type: 'dinner', date: today }); }));
      if (later) acts.appendChild(button(later === 'five' ? 'Remind me at 5' : 'Remind me in an hour', 'moment-later', () => { markSeen({ dinnerAt: later === 'five' ? 17 * 60 : nowMin + 60 }); Snd.slide(); render(); }));
      acts.appendChild(dismiss('Don’t ask about dinner tonight', () => { markSeen({ dinnerNo: true }); sayMoment('No more dinner questions tonight.'); }));
      box.append(icon('pot', 9, UI.gold), text, acts);
      box.hidden = false;
    } else {
      const wdName = M.DAY_LONG[M.weekday(today)];
      text.appendChild(el('b', '', 'What kind of ' + wdName + '?'));
      /* Focus works inside Work: a day without work to plan offers Workout in its place */
      const plannable = day(today).blocks.some((b) => b.cat === 'work' && b.soft);
      ['usual', plannable ? 'focus' : 'workout', 'rest'].map((id) => D.PRESETS.find((p) => p.id === id)).filter(Boolean).forEach((p) => {
        const x = button('', 'moment-kind', () => {
          markSeen({ kind: true });
          if (p.usual) { sayMoment('Your usual ' + wdName + '.'); Snd.pick(); render(); return; }
          const r = commit(() => M.applyPreset(state, today, p, state.palette));
          if (!r) return;
          Snd.good();
          const missed = (p.items || []).length - (r.placed || 0);
          sayMoment('A ' + p.name.toLowerCase() + ' ' + wdName + '.' + (missed > 0 ? ' ' + plural(missed, 'block didn’t fit.', 'blocks didn’t fit.') : ''), true);
          render();
        });
        x.append(icon(p.icon || 'star', 8, UI.ink), el('span', '', p.name));
        x.title = p.line || p.name;
        acts.appendChild(x);
      });
      /* the rest of the kinds are in the Planner's date card; it opens the list there */
      acts.appendChild(button('More kinds', 'moment-kind', () => { markSeen({ kind: true }); setMode('planner'); $('kinds').classList.add('open'); }));
      acts.appendChild(dismiss('Don’t ask today', () => { markSeen({ kind: true }); }));
      box.append(icon('calendar', 9, UI.gold), text, acts);
      box.hidden = false;
    }
    return was !== box.hidden;
  }
  /* Add owns the bottom right corner in Today; on Sunday afternoon the Sunday Reset stacks above it */
  function renderFab() {
    const fab = $('fab'), was = fab.hidden;
    fab.hidden = !inToday() || !trayCollapsed();
    if (!fab.hidden) {
      const ws = resetWeek(), w = state.weeks[ws] && state.weeks[ws].reset;
      const show = M.weekday(today) === 0 && nowMin >= 12 * 60 && !(w && w.done);
      $('fab-reset').hidden = !show;
      if (show) $('fab-reset').replaceChildren(icon('calendar', 9, UI.gold), el('span', '', (w && w.step ? 'Continue' : 'Start') + ' Sunday Reset'));
    }
    return was !== fab.hidden;
  }
  /* the board points too: a gold tag under tonight's Dinner block while the band asks about it */
  let tagOn = false;
  function placeTag() {
    const tag = $('dinner-tag'), m = view.moment;
    const a = inToday() && m && m.kind === 'dinner' && !view.sel && !view.pick ? W.blockAnchor(today, m.block.base) : null;
    const show = !!(a && !a.behind && a.bottom != null);
    if (show !== tagOn) { tagOn = show; tag.hidden = !show; }
    if (show) tag.style.transform = 'translate(' + Math.round(a.x) + 'px, ' + Math.round(a.bottom + 8) + 'px) translateX(-50%)';
  }

  /* == sync, devices, and reminders == */
  const REMIND_KEY = 'sundayreset.remind';
  const remindPrefs = () => { try { return Object.assign({ on: false, locked: true, added: true, sunday: true, dinner: true, lead: 10 }, JSON.parse(localStorage.getItem(REMIND_KEY) || 'null') || {}); } catch (e) { return { on: false, locked: true, added: true, sunday: true, dinner: true, lead: 10 }; } };
  const saveRemind = (p) => { try { localStorage.setItem(REMIND_KEY, JSON.stringify(p)); } catch (e) { /* fine */ } };
  /* a phone that can install the app keeps the browser's offer here until the card asks */
  const INSTALL_KEY = 'sundayreset.install';
  const installHideUntil = () => { try { return +localStorage.getItem(INSTALL_KEY) || 0; } catch (e) { return 0; } };
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (view.phone && ready) renderToday(); });
  window.addEventListener('appinstalled', () => { installEvt = null; if (view.phone && ready) renderToday(); });
  const standalone = () => !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone);
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const isMacSafari = () => !isIOS() && /Macintosh/.test(navigator.userAgent) && /Version\/[\d.]+.*Safari\//.test(navigator.userAgent);
  /* Safari (and every browser on iPhone and iPad) can clear a site's storage after seven days without
     a visit, rescue copies too. On the Home Screen or in the Dock the app has storage of its own that
     stays, so that's where a board kept only here should live. A linked board is on the server too. */
  const keepAtRisk = () => Store.mode === 'local' && !view.preview && !Cloud.on && (isIOS() || isMacSafari()) && !standalone();
  const KEEP_KEY = 'sundayreset.keep';
  const keepSeen = () => { try { return JSON.parse(localStorage.getItem(KEEP_KEY) || 'null') || {}; } catch (e) { return {}; } };
  const markKeep = (o) => { try { localStorage.setItem(KEEP_KEY, JSON.stringify(Object.assign(keepSeen(), o))); } catch (e) { /* fine */ } };
  /* what keeps this board in this browser, in plain words, with the steps when it should move */
  function keepWords() {
    if (Store.mode !== 'local' || view.preview) return null;
    if (keepAtRisk()) {
      const ios = isIOS();
      return { risk: true, short: ios ? 'Keep it on your Home Screen' : 'Keep it in the Dock',
        line: (ios ? 'On iPhone and iPad, a browser' : 'Safari') + ' can clear a site’s storage after seven days without a visit, and the earlier versions kept here go with it. ' +
          (ios ? 'On the Home Screen' : 'In the Dock') + ', Sunday Reset has storage of its own that stays. To move this board there: download a backup, ' +
          (ios ? 'tap Share, then Add to Home Screen, open Sunday Reset from there' : 'choose File, then Add to Dock, open Sunday Reset from the Dock') + ', and load the backup in Settings, Your data.' };
    }
    if (Store.keep.state === 'kept') return { line: 'This browser has agreed to keep your board, even when it runs short of room. Clearing site data still erases it.' };
    if (Store.keep.state === 'not') return { ask: true, line: 'This browser may clear your board if it runs short of room. You can ask it to keep it.' };
    return null;
  }
  const householdName = () => { const p = who(); return p.name ? p.name + (p.partner ? ' and ' + p.partner : '') : 'Our household'; };
  const agoText = (t) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'a moment ago' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
  /* A board from another device (or merged with one) becomes this device's board. Edits made here
     since that board's starting point are laid over it, and sent on. */
  function takeRemote(doc, info, origin) {
    /* A drag can defer adoption. Keep the household/session that supplied this board: linking or
       unlinking while it waits must not place that household's data into the next one. */
    origin = origin || { session: Cloud.session, hid: Cloud.me && Cloud.me.hid, did: Cloud.me && Cloud.me.did };
    if (origin.session !== Cloud.session || origin.hid !== (Cloud.me && Cloud.me.hid) || origin.did !== (Cloud.me && Cloud.me.did)) return;
    if (!view.preview && (bdrag || tdrag)) { setTimeout(() => takeRemote(doc, info, origin), 900); return; }
    const real = realBoard(), incoming = D.migrate(JSON.parse(JSON.stringify(doc)));
    const localEdits = !!(info && info.from && !M.sameBoard(info.from, real));
    const next = localEdits ? M.mergeBoards(info.from, real, incoming).doc : incoming;
    if (M.sameBoard(next, real)) return;
    if (view.preview) { takeAside(next, info && info.by ? info.by : 'another device'); Store.adopt(next); if (localEdits) Cloud.changed(next); return; }
    /* Undo can't reach past someone else's change, so the board as it was is kept on this device */
    if (!view.got.remoteRescue || Date.now() - view.got.remoteRescue > 10 * 60000) { Store.rescue('Before an update from ' + (info && info.by ? info.by : 'another device'), state); view.got.remoteRescue = Date.now(); }
    state = next; undoStack = []; redoStack = []; cache.clear(); Store.adopt(state); render();
    if (localEdits) Cloud.changed(state);
    const by = info && info.by ? info.by : 'another device';
    toast(info && info.clashes && info.clashes.length ? 'Merged with changes from ' + by + '. Where you both changed the same thing, yours won.' : 'Updated from ' + by);
  }
  /* This person's own board: the one kept aside while a preview shows. Everything that
     goes to sync, a backup, or a rescue copy takes this, never a made up board. */
  const realBoard = () => (view.preview ? view.preview.saved : state);
  /* a board from elsewhere while a preview shows lands on the real board kept aside, never on the
     preview and never dropped, so going back shows it and the next edit builds on it */
  function takeAside(next, by) {
    const p = view.preview;
    if (!view.got.remoteRescue || Date.now() - view.got.remoteRescue > 10 * 60000) { Store.rescue('Before an update from ' + by, p.saved); view.got.remoteRescue = Date.now(); }
    p.saved = next; p.undo = []; p.redo = [];
    toast('Your board was updated from ' + by + '. You’ll see it when you go back to it.');
  }
  function adoptLinked(r) {
    const doc = D.migrate(JSON.parse(JSON.stringify(r.doc)));
    state = doc; undoStack = []; redoStack = []; cache.clear(); Store.adopt(state);
    view.got.link = null;
    render();
    Snd.chime();
    toast('Linked. This is ' + r.household.name + '’s week.' + (Store.rescues().length ? ' What was here is under Your data, Earlier versions.' : ''), 'good');
  }
  async function linkWith(what, done, name) {
    /* linking replaces this device's board, never a preview: a copy of the real one stays here first */
    endPreview();
    if (!who().sample) Store.rescue('Before linking this device', state);
    const r = await Cloud.link(what, name || deviceLabel());
    if (r.error) {
      toast(r.error === 'code-not-found' ? 'That code didn’t work. Codes last 10 minutes and work once; make a new one on the other device.' : r.error === 'key-not-found' ? 'That household key didn’t match.' : r.error === 'too-many-devices' ? 'That household has 12 devices, the most it can have. Remove one on another device first.' : r.error === 'slow-down' ? 'Too many tries. Wait a few minutes.' : 'Couldn’t link. Check the connection and try again.', 'bad');
      return false;
    }
    adoptLinked(r);
    if (done) done();
    return true;
  }
  async function startSync() {
    /* a household starts from the real board, never a made up one */
    endPreview();
    const r = await Cloud.start(JSON.parse(JSON.stringify(state)), householdName(), view.got.devName || deviceLabel());
    if (r.error) { toast('Couldn’t turn on sync. Check the connection and try again.', 'bad'); return; }
    view.got.newKey = r.key;
    Snd.good();
    toast('Sync is on', 'good');
    renderDrawer();
  }
  /* the QR for linking: dark ink on paper, drawn from the qrcode-generator library */
  let qrLoad = null;
  function loadQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (!qrLoad) qrLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'; s.integrity = 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k'; s.crossOrigin = 'anonymous'; s.onload = () => res(window.qrcode); s.onerror = rej; document.head.appendChild(s); });
    return qrLoad;
  }
  async function drawQr(canvas, text) {
    try {
      const qr = (await loadQr())(0, 'M'); qr.addData(text); qr.make();
      const n = qr.getModuleCount(), quiet = 3, px = Math.floor(canvas.width / (n + quiet * 2)), off = Math.floor((canvas.width - px * n) / 2);
      const g = canvas.getContext('2d');
      g.fillStyle = '#FBF3E3'; g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = '#2B1D0F';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(off + c * px, off + r * px, px, px);
    } catch (e) { canvas.replaceWith(el('p', 'dsec-line', 'The code works on its own: type it on the other device.')); }
  }
  /* whose device this is, said in a list and in "Updated from Kim's iPhone" */
  const deviceLabel = () => { const n = who().name; return n ? n + '’s ' + Cloud.deviceName : Cloud.deviceName; };
  function syncSection(box) {
    if (!Cloud.cfg) return;
    const partnerName = partner();
    const sec = box;
    if (!Cloud.on) {
      sec.appendChild(el('p', 'dsec-line', 'Sync keeps your week on your laptop and your phone' + (partnerName ? ', and shares it with ' + partnerName : '') + '. Everything still saves on this device first.'));
      if (view.got.syncWhy) {
        /* what sharing means, before anything is shared */
        const card = el('div', 'dcard');
        card.appendChild(el('div', 'dcard-h', 'Before you turn it on'));
        const ul = el('div', 'list');
        ['The whole board is shared: every day, to do, dinner, and calendar on it. There’s no private part yet, so share it with people you’d show your calendar to.',
          'Each device you link can see and change everything, and can remove other devices.',
          'You’ll get a household key. It links any device if you lose yours; keep it somewhere safe.',
          'You can remove a device, sign out, or delete the household from the server any time.'].forEach((x) => ul.appendChild(el('div', 'list-row', x)));
        card.appendChild(ul);
        const nm = textInput(view.got.devName || deviceLabel(), (v) => { view.got.devName = v; }, 'My laptop', 40);
        field(card, 'Call this device', nm);
        actions(card, [button('Turn on sync', 'small primary', () => { view.got.devName = nm.value.trim() || deviceLabel(); view.got.syncWhy = false; startSync(); }), button('Not now', 'small quiet', () => { view.got.syncWhy = false; renderDrawer(); })]);
        sec.appendChild(card);
      } else actions(sec, [button('Turn on sync', 'small primary', () => { view.got.syncWhy = true; renderDrawer(); }), button('I have a code', 'small', () => { view.got.enterCode = true; renderDrawer(); })]);
      if (view.got.enterCode) {
        const card = el('div', 'dcard');
        const inp = textInput('', () => {}, 'Code or household key', 40);
        field(card, 'From your other device', inp);
        const nm = textInput(deviceLabel(), () => {}, 'Kitchen tablet', 40);
        field(card, 'Call this device', nm);
        card.appendChild(el('p', 'dsec-line', 'This device will show your household’s week instead of what’s on it now. What’s here now is kept under Earlier versions.'));
        actions(card, [button('Link this device', 'small primary', () => { const v = inp.value.trim(); if (!v) return; const clean = v.replace(/\s+/g, ''); linkWith(/^SR/i.test(clean) && clean.length > 12 ? { key: clean } : { code: clean }, () => { view.got.enterCode = false; renderDrawer(); }, nm.value.trim()); }), button('Cancel', 'small quiet', () => { view.got.enterCode = false; renderDrawer(); })]);
        sec.appendChild(card);
      }
      return;
    }
    const st = el('div', 'sync-status ' + Cloud.status);
    st.append(el('b', '', Cloud.me.name || 'Your household'), el('span', '', Cloud.status === 'offline' || Cloud.status === 'refused' ? Cloud.note : Cloud.status === 'saving' ? (Cloud.note || 'Saving…') : 'Up to date' + (Cloud.sentAt ? ', last sent ' + agoText(Cloud.sentAt) : '')));
    sec.appendChild(st);
    if (view.got.newKey) {
      const card = el('div', 'dcard keycard');
      card.appendChild(el('div', 'dcard-h', 'Your household key'));
      const hk = el('code', 'hkey');
      hk.setAttribute('aria-label', view.got.newKey);
      view.got.newKey.split(/\s+/).forEach((g) => hk.appendChild(el('span', '', g)));
      card.appendChild(hk);
      card.appendChild(el('p', 'dsec-line', 'Save it somewhere safe, like a password manager. It links any device if you lose yours. It won’t be shown again.'));
      actions(card, [button('Copy it', 'small', () => { navigator.clipboard && navigator.clipboard.writeText(view.got.newKey.replace(/\s/g, '')).then(() => toast('Copied', 'good')); }), button('I saved it', 'small primary', () => { view.got.newKey = null; renderDrawer(); })]);
      sec.appendChild(card);
    }
    const link = view.got.linkCode;
    if (link && link.expires > Date.now()) {
      const card = el('div', 'dcard linkcard');
      const cv = document.createElement('canvas'); cv.width = cv.height = 360; cv.className = 'qr';
      const url = location.origin + '/?link=' + link.code;
      drawQr(cv, url);
      card.appendChild(cv);
      const code = el('div', 'link-code', link.code.replace(/(...)(...)/, '$1 $2'));
      card.appendChild(code);
      card.appendChild(el('p', 'dsec-line', 'Scan it with the phone’s camera, or open Sunday Reset on the phone and type the code. It works once, for 10 minutes. The phone will see and change everything on this board.'));
      actions(card, [button('Done', 'small quiet', () => { view.got.linkCode = null; renderDrawer(); })]);
      sec.appendChild(card);
    } else {
      actions(sec, [button('Link a phone or another device', 'small primary', async () => { const r = await Cloud.makeCode(); if (r.error) { toast('Couldn’t make a code. Check the connection.', 'bad'); return; } view.got.linkCode = r; renderDrawer(); })]);
    }
    const devs = view.got.devices, dv = dsec(sec, 'Devices', 'Each one sees and changes the whole board.');
    /* one request at a time, however often the page redraws */
    if (!devs) { if (!view.got.devBusy) { view.got.devBusy = true; Cloud.devices().then((d) => { view.got.devBusy = false; view.got.devices = d || { household: { devices: [] }, me: Cloud.me.did }; renderDrawer(); }); } dv.appendChild(el('p', 'dsec-line', 'Checking devices…')); }
    else {
      const list = el('div', 'list');
      devs.household.devices.forEach((d) => {
        const r = el('div', 'list-row');
        const t = el('div', 'grow');
        if (view.got.rename === d.id) {
          const inp = textInput(d.name, () => {}, 'Kitchen tablet', 40);
          inp.dataset.autofocus = '1';
          t.appendChild(inp);
          r.appendChild(t);
          r.appendChild(button('Save', 'small primary', async () => { const v = inp.value.trim(); if (!v) return; const res = await Cloud.renameDevice(d.id, v); if (res.error) { toast('Couldn’t rename it. Check the connection.', 'bad'); return; } view.got.rename = null; view.got.devices = null; renderDrawer(); }));
          setTimeout(() => inp.focus(), 20);
        } else {
          t.appendChild(document.createTextNode(d.name));
          t.appendChild(el('small', '', d.id === devs.me ? 'This device' : 'Seen ' + agoText(d.seen)));
          r.appendChild(t);
          r.appendChild(button('Rename', 'small quiet', () => { view.got.rename = d.id; renderDrawer(); }));
          if (d.id !== devs.me) r.appendChild(confirmButton('Remove', 'rm-dev-' + d.id, async () => {
            const ok = await Cloud.removeDevice(d.id);
            view.got.devices = null; renderDrawer();
            toast(ok ? d.name + ' is unlinked. It keeps its own copy of the board, and gets no more changes.' : 'Couldn’t remove ' + d.name + '. Check the connection and try again.', ok ? '' : 'bad');
          }));
        }
        list.appendChild(r);
      });
      dv.appendChild(list);
    }
    if (Cloud.cfg.push) actions(sec, [button(remindPrefs().on ? 'Reminders are on for this device' : 'Set up reminders on this device', 'small quiet', () => goPage('remind'))]);
    const out = dsec(sec, 'Leaving', 'Signing out keeps a copy of the board here unless you clear it. Deleting the household removes it from the server for every device.');
    out.classList.add('danger');
    actions(out, [
      confirmButton('Sign out, keep this copy', 'leave-sync', async () => { await Cloud.leave(); view.got.devices = null; renderDrawer(); toast('This device is on its own now. Your board stays here.'); }),
      confirmButton('Sign out and clear this device', 'leave-clear', async () => { await Cloud.leave(); Store.wipeDevice(); location.reload(); })
    ]);
    if (view.got.delHouse) {
      const nm = textInput('', () => {}, Cloud.me.name || 'Our household', 40);
      field(out, 'Type the household’s name to delete it: ' + (Cloud.me.name || ''), nm);
      actions(out, [button('Delete the household for good', 'small warn', async () => {
        const r = await Cloud.deleteHousehold(nm.value.trim());
        if (r.error) {
          const msg = r.error === 'confirm-with-the-name' ? 'The name didn’t match.'
            : r.error === 'household-busy' || r.error === 'household-write-unsettled' || r.error === 'household-write-lost' ? 'A save is still finishing. Try Delete again in a few minutes.'
                : r.error === 'deletion-incomplete' ? 'Deletion could not be confirmed. Try Delete again. If this device gets unlinked, contact ' + sendTo() + ' to check whether server data remains.'
                  : 'Couldn’t delete it. Check the connection.';
          toast(msg, 'bad'); return;
        }
        view.got.delHouse = false; view.got.devices = null; renderDrawer();
        toast('The household is deleted from the server. This device keeps its board.');
      }), button('Cancel', 'small quiet', () => { view.got.delHouse = false; renderDrawer(); })]);
    } else actions(out, [button('Delete the household from the server', 'small quiet', () => { view.got.delHouse = true; renderDrawer(); })]);
  }
  function remindSection(sec) {
    if (!Cloud.cfg || !Cloud.cfg.push) return;
    const rp = remindPrefs();
    const box = el('div', 'remind');
    if (!Cloud.on) {
      box.appendChild(el('p', 'dsec-line', 'Reminders come from the server, so they need sync. Turn sync on first; your week still saves on this device.'));
      actions(box, [button('Go to Sync and devices', 'small primary', () => goPage('sync'))]);
      sec.appendChild(box);
      return;
    }
    if (isIOS() && !standalone()) { box.appendChild(el('p', 'dsec-line', 'On iPhone, reminders need Sunday Reset on your Home Screen: tap Share, then Add to Home Screen, and open it from there.')); sec.appendChild(box); return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { box.appendChild(el('p', 'dsec-line', 'This browser can’t show reminders.')); sec.appendChild(box); return; }
    if (window.Notification && Notification.permission === 'denied') box.appendChild(el('p', 'err', 'Notifications are off for this site in the browser’s settings, so reminders can’t show here until they’re on.'));
    const set = async (patch) => {
      const next = Object.assign(remindPrefs(), patch);
      const r = await Cloud.remind(next.on, { locked: next.locked, added: next.added, sunday: next.sunday, dinner: next.dinner, lead: next.lead });
      if (r.error) { toast(r.error === 'denied' ? 'Notifications are off for this site. Turn them on in the browser’s settings.' : r.error === 'no-worker' || r.error === 'unsupported' ? 'Reminders can’t start in this browser here. Open Sunday Reset from its https address and try again.' : 'Couldn’t change reminders. Check the connection.', 'bad'); return; }
      saveRemind(next); renderDrawer(); if (view.phone) renderToday();
    };
    const g = el('div', 'switches');
    g.appendChild(toggle('Remind me', rp.on, (v) => set({ on: v }), 'On this device. Each device chooses for itself.'));
    box.appendChild(g);
    if (rp.on) {
      const what = dsec(box, 'What to remind me of');
      const g2 = el('div', 'switches');
      g2.appendChild(toggle('Locked things', rp.locked, (v) => set({ locked: v }), 'Pick ups, meetings, and set times'));
      g2.appendChild(toggle('Things I added', rp.added, (v) => set({ added: v }), 'Blocks and to dos you put on the day'));
      g2.appendChild(toggle('The Sunday Reset', rp.sunday, (v) => set({ sunday: v }), 'Sunday afternoon, if it isn’t done'));
      if (useDinners()) g2.appendChild(toggle('What’s for dinner', rp.dinner, (v) => set({ dinner: v }), 'At 3 pm, if tonight isn’t picked'));
      what.appendChild(g2);
      field(box, 'How early', chips([5, 10, 15].map((m) => ({ id: m, name: m + ' min' })), rp.lead, (v) => set({ lead: v })));
      /* the only honest check: a real reminder, sent to this device now */
      const res = view.got.testSent;
      actions(box, [button('Send a test reminder', 'small', testReminder)]);
      if (res) box.appendChild(el('p', res.ok ? 'dsec-line' : 'err', res.text));
    }
    sec.appendChild(box);
  }
  async function testReminder() {
    const r = await Cloud.testReminder();
    const why = { 'no-subscription': 'This device isn’t signed up. Turn Remind me off and on again.', 'subscription-gone': 'The browser dropped this device’s sign up. Turn Remind me off and on again.', 'send-failed': 'The server couldn’t reach this device.', 'push-not-set-up': 'This server can’t send reminders.', 'slow-down': 'Too many tests. Wait a few minutes.', offline: 'You’re offline.' };
    view.got.testSent = r.error ? { ok: false, text: (why[r.error] || 'It didn’t send.') } : { ok: true, text: 'Sent at ' + M.clock(new Date().getHours() * 60 + new Date().getMinutes()) + '. If nothing showed up in a minute, check that notifications are on for this browser.' };
    renderDrawer();
  }

  /* == calendars that stay current == */
  const calError = (e) => ({ 'bad-link': 'That doesn’t look like a calendar link', 'not-public': 'That link isn’t public', private: 'That link needs a sign in. Use the calendar’s public or secret address.', 'not-found': 'Nothing at that link', 'not-a-calendar': 'That link isn’t a calendar', 'too-big': 'That calendar is too big', timeout: 'That calendar took too long', 'slow-down': 'Too many tries. Wait a little.', offline: 'You’re offline' })[e] || 'Couldn’t reach it';
  /* Each event's id comes from what it is, so two devices refreshing the same calendar make the same
     ids and their boards merge cleanly instead of doubling up. */
  const hashText = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  function calEvents(items, calId, catId) {
    const seen = {};
    return items.map((it) => {
      const k = calId + '|' + it.date + '|' + (it.allDay ? 'day' : it.start + '|' + it.dur) + '|' + it.name;
      seen[k] = (seen[k] || 0) + 1;
      const id = 'e' + hashText(k) + (seen[k] > 1 ? 'n' + seen[k] : '');
      return it.allDay
        ? { id, kind: 'marker', name: it.name, icon: 'calendar', date: it.date, cal: calId }
        : { id, kind: 'timed', name: it.name, icon: 'calendar', cat: catId, date: it.date, start: it.start, dur: Math.max(15, it.dur), big: false, cal: calId };
    });
  }
  async function subscribeCalendar(url) {
    view.got.calBusy = true; renderDrawer();
    const r = await Cloud.calendar(url);
    view.got.calBusy = false;
    if (r.error) { view.got.calErr = calError(r.error); renderDrawer(); return; }
    const p = M.parseIcs(r.text, M.addDays(today, -30), M.addDays(today, 400), 800, { tz: homeTz() });
    view.got.calErr = null;
    view.got.ics = { name: p.name || 'Calendar', cat: 'work', items: p.items, more: p.more, url: r.url };
    renderDrawer();
  }
  /* Bring subscribed calendars up to date: when older than an hour, or when asked. Their events are
     replaced as a set, so moved ones move and cancelled ones go. */
  let calRefreshing = false;
  async function refreshCalendars(force) {
    if (calRefreshing || !Cloud.cfg || view.preview || readOnly) return;
    const due = (state.calendars || []).filter((c) => c.url && (force || !c.fetched || Date.now() - c.fetched > 3600000));
    if (!due.length) return;
    calRefreshing = true;
    for (const c of due) {
      const r = await Cloud.calendar(c.url);
      if (bdrag || tdrag) break;
      const cal = (state.calendars || []).find((x) => x.id === c.id);
      if (!cal) continue;
      if (r.error) { cal.error = calError(r.error); cal.tried = Date.now(); continue; }
      const p = M.parseIcs(r.text, M.addDays(today, -30), M.addDays(today, 400), 800, { tz: homeTz() });
      state.events = state.events.filter((e) => e.cal !== cal.id).concat(calEvents(p.items, cal.id, cal.cat));
      cal.fetched = Date.now(); cal.error = null;
    }
    calRefreshing = false;
    changed();
    if (view.drawer) renderDrawer();
  }

  /* == the phone: Today ==
     On a phone, or opened from the Home Screen, Sunday Reset opens to Today: the now strip, the day as
     a column of blocks, the dinner question from 3 pm, and a line to add things. The desk is a tap away. */
  const phoneWidth = () => Math.min(window.innerWidth, window.screen ? window.screen.width : window.innerWidth) <= 600;
  function setPhone() {
    /* a phone's day left on a window that grew is the desk again, as it was before */
    if (view.phoneFrom && !phoneDay()) { leavePhoneDay(); view.phoneDesk = false; }
    const want = (phoneWidth() || devPhone || new URLSearchParams(location.search).has('today')) && !view.phoneDesk;
    view.phone = want;
    document.body.classList.toggle('phone', want);
    document.body.classList.toggle('phone-desk', phoneDay());
    $('phonebar').hidden = !phoneDay();
    $('todayview').hidden = !want;
    $('todayview-btn').hidden = want || !view.phoneDesk || phoneDay();
  }
  /* On a phone the desk is one day: the board alone on the mat, as big as the screen allows, with no
     rack and no top bar, and a bar of its own for the list and the days either side. It opens on the
     day the list was showing. The list stays the phone's home; the week as rows is too small to read. */
  function phoneDay() { return !!view.phoneDesk && (phoneWidth() || devPhone) && !noDesk; }
  function openPhoneDesk() {
    view.phoneDesk = true;
    noteMove('desk');
    if (phoneDay()) {
      if (!view.phoneFrom) view.phoneFrom = { mode: view.mode, zoom: view.zoom, focus: view.focus };
      view.mode = 'planner'; view.zoom = 'day'; view.focus = M.addDays(today, view.todayOff || 0);
      view.bench = null; view.level = null; view.dockOpen = false; view.pick = null; W.setSelected(null);
    }
    closeSel(); setPhone(); render(); W.wake(); layoutInsets();
    if (phoneDay()) setTimeout(() => { const t = $('phonebar').querySelector('.pb-title'); if (t) t.focus({ preventScroll: true }); }, 0);
    if (phoneDay()) measureDesk();
  }
  /* The first time a phone opens the desk, a second and a half of frames says whether it keeps up. A
     phone well under 30 frames a second gets the lighter desk, once, and says how to change it back. */
  const LIGHT_KEY = 'sundayreset.lightcheck';
  function measureDesk() {
    try { if (localStorage.getItem(LIGHT_KEY) || view.lowPower) return; } catch (e) { return; }
    const times = [];
    let last = performance.now();
    const t0 = last;
    const step = (now) => {
      times.push(now - last); last = now;
      if (now - t0 < 1500) { W.touch && W.touch(); requestAnimationFrame(step); return; }
      try { localStorage.setItem(LIGHT_KEY, '1'); } catch (e) { /* fine */ }
      const sorted = times.slice(3).sort((a, b) => a - b), mid = sorted[Math.floor(sorted.length / 2)] || 0;
      if (mid > 40) { view.lowPower = true; saveView(); applyPrefs(); toast('This phone gets the lighter desk, so it stays smooth. Settings, Reading and sound, can change it.'); }
    };
    requestAnimationFrame(step);
  }
  function leavePhoneDay() {
    const was = view.phoneFrom;
    view.phoneFrom = null;
    if (!was) return;
    const off = M.diffDays(today, view.focus);
    if (off >= 0 && off <= 6) view.todayOff = off;
    view.mode = was.mode; view.zoom = was.zoom; view.focus = was.focus;
    if (inToday()) enterToday();
  }
  function closePhoneDesk() {
    Snd.init(); Snd.slide();
    view.phoneDesk = false; view.pick = null; W.setSelected(null); closeSel();
    leavePhoneDay();
    setPhone(); renderToday();
    const b = document.querySelector('.td-foot .small'); if (b) b.focus({ preventScroll: true });
  }
  let phoneBar = null;
  function renderPhoneBar() {
    const bar = $('phonebar'), on = phoneDay();
    bar.hidden = !on;
    if (phoneBar && phoneBar.add && !on) phoneBar.add.hidden = true;
    if (!on) return;
    if (!phoneBar) {
      const list = button('List', 'small quiet pb-list', closePhoneDesk);
      list.prepend(icon('left', 8, UI.soft));
      list.setAttribute('aria-label', 'Back to the list');
      const day = el('div', 'pb-day'), kicker = el('span', 'pb-kicker'), title = el('h1', 'pb-title');
      title.tabIndex = -1; title.setAttribute('aria-live', 'polite');
      day.append(kicker, title);
      const prev = el('button', 'nav'), next = el('button', 'nav');
      prev.type = next.type = 'button';
      prev.appendChild(icon('left', 9, UI.ink)); next.appendChild(icon('right', 9, UI.ink));
      prev.addEventListener('click', () => { Snd.init(); shift(-1); });
      next.addEventListener('click', () => { Snd.init(); shift(1); });
      /* the week a tap apart, under the date, in the board's own order */
      const week = el('div', 'pb-week');
      week.setAttribute('role', 'group'); week.setAttribute('aria-label', 'Days of this week');
      bar.append(list, day, prev, next, week);
      /* Add, the same plain words as everywhere, in the corner a thumb reaches */
      const add = el('button', 'pd-add');
      add.type = 'button'; add.id = 'pd-add'; add.setAttribute('aria-label', 'Add in plain words');
      add.appendChild(icon('plus', 11, '#FFFFFF'));
      add.addEventListener('click', () => { Snd.init(); if ($('quick').hidden) openQuick(); else closeQuick(); });
      document.body.appendChild(add);
      phoneBar = { kicker, title, prev, next, week, add };
    }
    const n = M.diffDays(today, view.focus);
    const info = n === 0 ? nowNow() : null;
    /* on today the bar says what you're in, so the desk tells the time at a glance */
    const nowWords = info && info.kind === 'block' && info.block ? ' · ' + blockName(info.block) + ', ' + leftText(info.left) + ' left' : '';
    phoneBar.kicker.textContent = (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n > 0 ? 'In ' + n + ' days' : -n + ' days ago') + nowWords;
    phoneBar.week.replaceChildren();
    M.weekDates(view.focus).forEach((d) => {
      const b = el('button', 'pb-d' + (d === view.focus ? ' on' : '') + (d === today ? ' today' : ''));
      b.type = 'button';
      b.append(el('span', '', M.DAY_SHORT[M.weekday(d)].slice(0, 1)), el('b', '', String(+d.slice(8))));
      b.setAttribute('aria-label', M.dateText(d, 'long') + (d === today ? ', today' : ''));
      b.setAttribute('aria-pressed', String(d === view.focus));
      b.addEventListener('click', () => { if (d === view.focus) return; Snd.init(); Snd.slide(); view.focus = d; render(); });
      phoneBar.week.appendChild(b);
    });
    phoneBar.add.hidden = !!view.pick || !$('side').hidden;
    phoneBar.title.textContent = M.dateText(view.focus, 'day');
    phoneBar.prev.setAttribute('aria-label', 'The day before, ' + M.dateText(M.addDays(view.focus, -1), 'long'));
    phoneBar.next.setAttribute('aria-label', 'The day after, ' + M.dateText(M.addDays(view.focus, 1), 'long'));
  }
  function renderToday() {
    const box = $('todayview');
    if (!view.phone || !ready) return;
    const off = view.todayOff || 0, date = M.addDays(today, off), d = day(date);
    /* the add line stays put while the rest redraws, so a minute ticking over never eats what you type */
    let main = box.querySelector('.td-main');
    if (!main) { main = el('div', 'td-main'); box.append(main, todayFoot()); }
    const keep = box.scrollTop;
    const keyControl = (control, key) => { control.dataset.fk = 'td-' + encodeURIComponent(key); return control; };
    /* clock refreshes replace these controls too; their identity keeps focus and unsaved words */
    keepFocus(main, () => {
    main.replaceChildren();
    const head = el('header', 'td-head');
    const top = el('div', 'td-top');
    /* the app's name is the door to Settings here too */
    const door = el('button', 'td-kicker');
    keyControl(door, 'settings');
    door.type = 'button'; door.title = 'Settings'; door.setAttribute('aria-label', 'Sunday Reset. Settings');
    door.append(icon('sliders', 7, UI.gold), document.createTextNode('Sunday Reset'));
    door.addEventListener('click', () => { Snd.init(); openDrawer(); });
    top.append(door, el('span', 'td-clock', M.clock(nowMin)));
    head.appendChild(top);
    head.appendChild(el('h1', 'td-title', M.dateText(date, 'long')));
    /* today, tomorrow, and the rest of the week a tap away, without the desk */
    const seg = el('div', 'td-days');
    seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Which day');
    for (let v = 0; v < 7; v++) {
      const d0 = M.addDays(today, v);
      const b = el('button', 'td-dayb');
      keyControl(b, 'day-' + d0);
      b.type = 'button';
      b.append(el('span', 'dw', v === 0 ? 'Today' : v === 1 ? 'Tmrw' : M.DAY_SHORT[M.weekday(d0)]), el('span', 'dn', String(M.parts(d0).d)));
      b.setAttribute('aria-pressed', String(off === v));
      b.setAttribute('aria-label', v === 0 ? 'Today' : v === 1 ? 'Tomorrow' : M.dateText(d0, 'long'));
      b.addEventListener('click', () => { view.todayOff = v; Snd.pick(); renderToday(); });
      seg.appendChild(b);
    }
    head.appendChild(seg);
    main.appendChild(head);
    if (off === 0) {
      const n = el('section', 'td-now now big'); nowStrip(n, nowNow(), true);
      /* the band's buttons, on the phone too */
      const info = nowNow(), b0 = info.block;
      const bar = n.querySelector('.now-bar');
      if (bar) keyControl(bar, 'now-' + info.kind + (b0 ? '-' + sourceDate(b0, today) + '-' + sourceKey(b0) : ''));
      if (info.kind === 'block' && (b0.tpl || b0.add) && !b0.fixed) {
        const acts = el('div', 'td-acts'), src = b0.src || {}, isTodo = (src.type === 'task' || src.type === 'step') && !b0.done;
        const key = 'now-' + sourceDate(b0, today) + '-' + sourceKey(b0);
        if (M.previewEndEarly(state, sourceDate(b0, today), sourceKey(b0), sourceMinute(b0, today, nowMin)).ok) {
          acts.appendChild(keyControl(button(isTodo ? 'Done' : lastOfDay(b0) ? 'Done for the night' : 'Done early', 'small', () => { doneEarly(b0); renderToday(); }), key + '-done'));
          if (isTodo) acts.appendChild(keyControl(button('Stop here', 'small quiet', () => { doneEarly(b0, true); renderToday(); }), key + '-stop'));
        }
        if (M.previewExtend(state, sourceDate(b0, today), sourceKey(b0), 15, sourceMinute(b0, today, nowMin)).ok) acts.appendChild(keyControl(button('15 more minutes', 'small quiet', () => { moreMinutes(b0); renderToday(); }), key + '-more'));
        if (acts.children.length) n.appendChild(acts);
      }
      const eve = eveningActs(info);
      if (eve.length) {
        let acts = n.querySelector('.td-acts');
        if (!acts) { acts = el('div', 'td-acts'); n.appendChild(acts); }
        eve.forEach((a) => acts.appendChild(keyControl(button(a.label, 'small', () => { Snd.init(); Snd.pick(); if (a.id === 'tomorrow') { view.todayOff = 1; renderToday(); } else openSel({ type: 'dinner', date: a.date }); }), 'eve-' + a.id)));
      }
      if (view.bandSaid && view.bandSaid.until > Date.now()) n.appendChild(el('p', 'td-said', view.bandSaid.text));
      main.appendChild(n);
    }
    /* the dinner question, from 3 pm, until it's answered */
    const din = d.blocks.find((b) => b.dinner), seen = seenToday();
    const asked = off > 0 ? true : !seen.dinnerNo && nowMin >= (seen.dinnerAt != null ? seen.dinnerAt : 15 * 60) && nowMin < (din ? din.start + din.dur : 0);
    if (useDinners() && din && !din.planned && asked && off <= 1) {
      const card = el('section', 'td-card dinner');
      card.appendChild(el('h2', '', off ? 'What’s for dinner tomorrow?' : 'What’s for dinner?'));
      card.appendChild(el('p', '', 'Dinner is at ' + M.clock(din.start) + '.'));
      const row = el('div', 'td-choices');
      D.DINNER_HOW.forEach((h) => { const b = el('button', 'td-choice'); keyControl(b, 'dinner-' + date + '-' + h.id); b.type = 'button'; b.append(icon(h.icon, 10, '#FFFFFF'), el('span', '', h.name)); b.addEventListener('click', () => { Snd.init(); commit(() => { state.dinners[date] = Object.assign({ name: '', items: [] }, state.dinners[date], { cook: h.id === 'home' ? 'home' : h.id }); }); noteMove('dinner'); Snd.clack(0.5); if (h.id === 'home') openSel({ type: 'dinner', date }); else toast(h.name + ' ' + whenWord(date, true), 'good', { label: 'Undo', fn: undo }); }); row.appendChild(b); });
      card.appendChild(row);
      /* the same ways out as on the desk: ask later, or not tonight */
      if (off === 0) {
        const later = el('div', 'td-acts');
        if (seen.dinnerAt == null && nowMin + 60 < din.start) later.appendChild(keyControl(button(nowMin < 17 * 60 - 30 && din.start > 17 * 60 + 30 ? 'Remind me at 5' : 'Remind me in an hour', 'small quiet', () => { markSeen({ dinnerAt: nowMin < 17 * 60 - 30 && din.start > 17 * 60 + 30 ? 17 * 60 : nowMin + 60 }); Snd.slide(); renderToday(); }), 'dinner-later-' + date));
        later.appendChild(keyControl(button('Not tonight', 'small quiet', () => { markSeen({ dinnerNo: true }); Snd.slide(); toast('No more dinner questions tonight.'); renderToday(); }), 'dinner-no-' + date));
        card.appendChild(later);
      }
      main.appendChild(card);
    }
    /* two real commitments at once, on this day */
    M.clashes(state, date).forEach((c) => {
      const card = el('section', 'td-card clash');
      card.appendChild(el('h2', '', c.a.name + ' and ' + c.b.name + ' overlap'));
      card.appendChild(el('p', '', M.span(c.a.start, c.a.start + c.a.dur) + ' and ' + M.span(c.b.start, c.b.start + c.b.dur) + '. The day below shows one of them; both are real.'));
      main.appendChild(card);
    });
    /* Getting started, after a setup on this phone, right under now, until it's done or put away */
    if (off === 0 && movesShown()) {
      const card = el('section', 'td-card td-moves');
      const list = movesList(), left = movesLeft();
      card.appendChild(el('h2', '', 'Getting started, ' + (list.length - left) + ' of ' + list.length));
      const ol = el('div', 'moves');
      /* folded to the next thing to try, so the day isn't pushed off the first screen; the whole list is a tap away */
      const next = list.find((id) => !moves.done[id] && id !== 'build' && !deskOnly(id)) || list.find((id) => !moves.done[id] && id !== 'build');
      const all = !!view.tdMovesAll || !next;
      list.filter((id) => all || id === next).forEach((id) => {
        const ok = !!moves.done[id], row = el('div', 'move' + (ok ? ' done' : ''));
        const t = el('span', 'onb-tick'); t.appendChild(icon('check', 7, UI.dark));
        row.append(t, onbWords(OB.MOVES[id].name, moveLine(id)));
        if (!ok && id !== 'build' && !deskOnly(id)) row.appendChild(keyControl(button('Show me', 'small', () => showMove(id)), 'move-' + id));
        ol.appendChild(row);
      });
      card.appendChild(ol);
      const foot = el('div', 'td-acts');
      if (next) foot.appendChild(keyControl(button(all ? 'Show only the next one' : 'See all ' + list.length, 'small quiet', () => { view.tdMovesAll = !all; renderToday(); }), 'moves-all'));
      foot.appendChild(keyControl(button('Put this away', 'small quiet', () => { moves.hidden = true; saveMoves(); renderToday(); }), 'moves-hide'));
      card.appendChild(foot);
      main.appendChild(card);
    }
    /* the day, as a column of blocks */
    const list = el('ol', 'td-day');
    const info = off === 0 ? nowNow() : null;
    const gaps = M.gaps(d);
    const rows = d.blocks.filter((b) => !b.sleep).map((b) => ({ b, start: b.start })).concat(gaps.filter((g) => g[1] - g[0] >= 30).map((g) => ({ gap: g, start: g[0] }))).sort((a, b) => a.start - b.start);
    /* what's already over folds into one line, so the list opens on what's left of the day */
    const over = (r) => off === 0 && (r.gap ? r.gap[1] : r.b.start + r.b.dur) <= nowMin;
    /* last night's late blocks that ran past midnight are over and belong to yesterday, not to today's Earlier */
    for (let k = rows.length - 1; k >= 0; k--) if (rows[k].b && over(rows[k]) && sourceDate(rows[k].b, date) < date) rows.splice(k, 1);
    const earlier = rows.filter(over), fold = earlier.length >= 2 && !view.tdEarlier;
    if (earlier.length >= 2) {
      const li = el('li', 'td-row td-fold'), names = earlier.filter((r) => r.b).map((r) => r.b.label || r.b.name);
      const btn = el('button', 'td-earlier', fold ? 'Earlier: ' + names.slice(0, 3).join(', ') + (names.length > 3 ? ', and ' + (names.length - 3) + ' more' : '') : 'Hide earlier');
      keyControl(btn, 'earlier-' + date);
      btn.type = 'button';
      btn.setAttribute('aria-expanded', String(!fold));
      btn.addEventListener('click', () => { view.tdEarlier = !view.tdEarlier; Snd.pick(); renderToday(); });
      li.appendChild(btn);
      list.appendChild(li);
    }
    rows.forEach((r) => {
      if (fold && over(r)) return;
      const li = el('li', 'td-row');
      li.appendChild(el('span', 'td-time', M.clock(r.start)));
      if (r.gap) { li.appendChild(el('span', 'td-open', M.hours(r.gap[1] - r.gap[0]) + ' open')); list.appendChild(li); return; }
      const b = r.b;
      const past = off === 0 && b.start + b.dur <= nowMin, cur = info && info.block && info.block.base === b.base && info.kind === 'block';
      const card = el('button', 'td-block' + (b.soft ? ' soft' : '') + (b.free ? ' free' : '') + (past ? ' past' : '') + (cur ? ' cur' : ''));
      keyControl(card, 'block-' + sourceDate(b, date) + '-' + sourceKey(b) + '-' + b.start);
      card.type = 'button';
      const lk = W.look(b), ink = b.free ? '#3F2A12' : lk.ink;
      card.style.setProperty('--bg', lk.base); card.style.setProperty('--ink', ink);
      if (cur) { card.style.setProperty('--worn', (M.clamp((nowMin - b.start) / Math.max(1, b.dur), 0, 1) * 100).toFixed(1) + '%'); if (ink.toUpperCase() !== '#FFFFFF') card.classList.add('light'); }
      card.append(icon(b.done ? 'check' : b.icon || 'star', 10, ink));
      const t = el('span', 'td-bt');
      t.append(el('b', '', b.label || b.name), el('small', '', M.span(b.start, b.start + b.dur) + (b.dinner ? ' · ' + (b.planned ? cookName(b.cook, date < today) || '' : dinnerSub(b, date)) : '')));
      card.appendChild(t);
      /* locked says so once: the mark, with its word for a screen reader */
      if (b.fixed) card.append(icon('lock', 7, ink), el('span', 'sr-only', 'Locked'));
      card.addEventListener('click', () => { Snd.init(); Snd.pick(); openSel(b.dinner ? { type: 'dinner', date: sourceDate(b, date) } : { type: 'block', date: sourceDate(b, date), key: sourceKey(b) }); });
      li.appendChild(card);
      list.appendChild(li);
    });
    /* the day ends with bed, and when tomorrow starts */
    if (d.bed < 1440 + 300) {
      const li = el('li', 'td-row td-bedrow');
      const up = day(M.addDays(date, 1)).wake;
      li.appendChild(el('span', 'td-time', M.clock(d.bed)));
      const bed = el('div', 'td-bed');
      bed.append(icon('bed', 9, '#3F2A12'), el('span', '', 'Bed'), el('small', '', 'up at ' + M.clock(up)));
      li.appendChild(bed);
      list.appendChild(li);
    }
    main.appendChild(list);
    /* what's due soon, with a checkbox each, and a way to give one a time */
    const soon = off === 0 ? M.dueSoon(state, today, 7, nowMin).slice(0, 6) : [];
    if (soon.length) {
      const card = el('section', 'td-card td-todo');
      card.appendChild(el('h2', '', 'Due this week'));
      soon.forEach((x) => {
        /* a long name gets the whole line, with its button under it, not five lines in a narrow column */
        const t = x.task, r = el('div', 'td-task' + (t.name.length > 28 ? ' long' : ''));
        const lab = el('label', 'td-tl');
        const tk = el('input', 'tick'); tk.type = 'checkbox';
        keyControl(tk, 'todo-done-' + t.id);
        tk.addEventListener('change', () => { Snd.init(); setDone(t, null, tk.checked); renderToday(); });
        const words = el('span', '', t.name);
        words.appendChild(el('small', '', 'Due ' + M.relText(t.due, today) + (x.status === 'partial' ? ' · ' + x.plan.timed + ' of ' + x.plan.open + ' steps have a time' : x.status === 'missed' ? ' · its time went by' : '') + (x.plan.after ? ' · ' + AFTER_DUE : '')));
        lab.append(tk, words);
        r.appendChild(lab);
        /* one that has its times, only late, opens as itself: there is a time to move, not one to give */
        r.appendChild(keyControl(x.status === 'planned' ? button('See its times', 'small quiet', () => openSel({ type: 'task', id: t.id })) : button('Give it a time', 'small quiet', () => openSel({ type: 'place', spec: { kind: 'task', id: t.id } })), 'todo-time-' + t.id));
        card.appendChild(r);
      });
      main.appendChild(card);
    }
    const shop = useDinners() && off === 0 ? M.groceryProgress(state, M.weekDates(today)) : null;
    if (shop && shop.total) {
      const card = el('section', 'td-card');
      card.appendChild(el('h2', '', 'Groceries'));
      card.appendChild(el('p', '', groceryWords(shop, ' this week')));
      card.appendChild(keyControl(button('Open the list', 'small primary', () => openSel({ type: 'groceries' })), 'groceries'));
      main.appendChild(card);
    }
    /* a board only in a browser that clears storage after a week away: how to keep it */
    if (off === 0 && keepAtRisk() && Store.savedAt && !(keepSeen().hideUntil > Date.now())) {
      const card = noteCard('house', 'Keep this week on your phone');
      card.appendChild(el('p', '', 'Safari clears sites you don’t visit for a week. Your Home Screen keeps it.'));
      /* three numbered steps, the backup button on the first */
      const steps = el('ol', 'td-steps');
      const s1 = el('li'); s1.append(el('span', '', 'Download a backup'), keyControl(button('Download', 'small primary', downloadBackup), 'keep-backup'));
      steps.append(s1, el('li', '', 'Share, then Add to Home Screen'), el('li', '', 'Open it there, and load the backup in Settings'));
      card.appendChild(steps);
      const acts = el('div', 'td-acts');
      acts.append(keyControl(button('Not this month', 'small quiet', () => { markKeep({ hideUntil: Date.now() + 30 * 864e5 }); Snd.slide(); renderToday(); }), 'keep-hide'));
      card.appendChild(acts);
      main.appendChild(card);
    }
    /* linking and reminders, when they'd help */
    if (Cloud.cfg && !Cloud.on) {
      const card = noteCard('phone', 'Link this phone');
      card.appendChild(el('p', '', 'On your laptop, open Settings, then Sync and devices, and choose Link a phone. Then type the code here.'));
      const row = el('div', 'td-inline');
      const inp = el('input', 'input'); inp.placeholder = 'Code'; inp.autocapitalize = 'characters'; inp.maxLength = 40;
      inp.setAttribute('aria-label', 'Link code'); keyControl(inp, 'link-code'); inp.dataset.v0 = inp.value;
      row.append(inp, keyControl(button('Link', 'small primary', () => { const v = inp.value.replace(/\s+/g, ''); if (v) linkWith(/^SR/i.test(v) && v.length > 12 ? { key: v } : { code: v }); }), 'link'));
      card.appendChild(row);
      main.appendChild(card);
    } else if (Cloud.on && Cloud.cfg.push && !remindPrefs().on) {
      const card = noteCard('bell', 'Get reminders');
      if (isIOS() && !standalone()) card.appendChild(el('p', '', 'First put Sunday Reset on your Home Screen: tap Share, then Add to Home Screen. Open it from there and turn reminders on.'));
      else {
        card.appendChild(el('p', '', 'Before pick ups and meetings, the dinner question at 3 pm, and your Sunday Reset.'));
        card.appendChild(keyControl(button('Turn on reminders', 'small primary', async () => { const rp = remindPrefs(); const r = await Cloud.remind(true, rp); if (r.error) toast(r.error === 'denied' ? 'Notifications are off for this site.' : 'Couldn’t turn on reminders.', 'bad'); else { saveRemind(Object.assign(rp, { on: true })); toast('Reminders are on', 'good'); renderToday(); } }), 'reminders'));
      }
      main.appendChild(card);
    }
    /* a phone that can install the app (Android's browsers say so) gets one card that says why */
    if (off === 0 && installEvt && !standalone() && Store.savedAt && !view.preview && !(installHideUntil() > Date.now())) {
      const card = noteCard('house', 'Put it on your Home Screen');
      card.appendChild(el('p', '', 'One tap to open, without the browser around it.'));
      const row = el('div', 'td-acts');
      row.append(keyControl(button('Add it', 'small primary', async () => { const e = installEvt; installEvt = null; try { await e.prompt(); } catch (err) { /* fine */ } renderToday(); }), 'install'), keyControl(button('Not now', 'small quiet', () => { try { localStorage.setItem(INSTALL_KEY, String(Date.now() + 30 * 86400000)); } catch (e) { /* fine */ } renderToday(); }), 'install-no'));
      card.appendChild(row);
      main.appendChild(card);
    }
    /* someone trying it from a shared link can tell the person who shared it, from the bottom of the day */
    if (off === 0 && sharedBy && !view.preview) {
      const row = el('div', 'td-tell');
      row.appendChild(keyControl(button('Tell ' + sharedBy + ' what you think', 'small quiet', () => openSel({ type: 'feedback' })), 'tell'));
      main.appendChild(row);
    }
    });
    box.scrollTop = keep;
  }

  /* A note from the app (keep your week, install, link, reminders) is paper, with its mark beside its
     title, so it never reads as part of your day. */
  function noteCard(mark, title) {
    const card = el('section', 'td-card td-note');
    const h = el('h2', '');
    const badge = el('span', 'td-note-mark'); badge.appendChild(icon(mark, 9, '#FFFFFF'));
    h.append(badge, el('span', '', title));
    card.appendChild(h);
    return card;
  }
  /* Add on the phone reads what you typed and shows where it lands first, like the desk does; the
     words stay until it's added. */
  function todayFoot() {
    const foot = el('footer', 'td-foot');
    const pv = el('div', 'td-preview');
    pv.hidden = true;
    pv.setAttribute('aria-live', 'polite');
    const add = el('input', 'input td-add'); add.placeholder = 'Add: Gym 6pm'; add.enterKeyHint = 'go'; add.setAttribute('aria-label', 'Add in plain words');
    add.addEventListener('paste', (e) => { if (pastedList(e)) { add.value = ''; renderToday(); } });
    try { add.value = sessionStorage.getItem('sundayreset.add') || ''; } catch (e) { /* fine */ }
    const show = () => {
      try { sessionStorage.setItem('sundayreset.add', add.value); } catch (e) { /* fine */ }
      pv.replaceChildren();
      const p = add.value.trim() ? M.parseQuick(add.value, today, state.palette, nowMin, QUICK_OPTS) : null;
      quick.p = p; quick.plan = p && p.kind === 'block' ? quickPlan(p) : null;
      if (!p || !p.name) { pv.hidden = true; return; }
      pv.hidden = false;
      const g = state.groups.find((x) => x.id === inboxId());
      const text = p.kind === 'task' ? 'A to do in ' + (g ? g.name : 'To do') + (p.due ? ', due ' + M.relText(p.due, today) : '')
        : M.dateText(quick.plan.date, 'day') + ' · ' + timeSpan(quick.plan.date, quick.plan.start, quick.plan.start + quick.plan.add.dur) + '. ' + quick.plan.text;
      pv.append(el('b', '', p.name), el('span', quick.plan && !quick.plan.ok ? 'bad' : '', text));
      const go = button(p.kind === 'task' ? 'Add to do' : quick.plan.ok ? 'Add it' : 'No room', 'small primary', () => {
        if (quickCommit(false)) { add.value = ''; try { sessionStorage.removeItem('sundayreset.add'); } catch (e) { /* fine */ } pv.hidden = true; renderToday(); }
      });
      go.disabled = p.kind === 'block' && !quick.plan.ok;
      const acts = el('div', 'td-acts');
      acts.appendChild(go);
      if (quick.plan && quick.plan.quiet != null) acts.appendChild(button('At ' + M.clock(quick.plan.quiet) + ', nothing moves', 'small quiet', () => { quick.plan = quickPlan(Object.assign({}, p, { date: quick.plan.date, start: quick.plan.quiet }), quick.plan.start); if (quickCommit(false)) { add.value = ''; pv.hidden = true; renderToday(); } }));
      pv.appendChild(acts);
    };
    add.addEventListener('input', show);
    add.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter' || !add.value.trim()) return;
      e.preventDefault(); Snd.init();
      /* the first Enter shows where it lands; the second adds it */
      if (pv.hidden) { show(); return; }
      if (quickCommit(false)) { add.value = ''; try { sessionStorage.removeItem('sundayreset.add'); } catch (err) { /* fine */ } pv.hidden = true; renderToday(); }
    });
    const desk = button(noDesk ? 'Open the week' : 'Open the desk', 'small quiet', openPhoneDesk);
    foot.append(pv, add, desk);
    if (add.value) setTimeout(show, 0);
    return foot;
  }

  /* The readability check, on the real thing. Reads the desk's own pixels in the day view: how evenly
     the board's wood is lit (brightest over dimmest along the three lanes), and for every block the
     contrast between its label and its face as drawn, beside what its two colors promise on paper.
     The promise is 4.5 to 1 on screen, at every hour; __reset.lightCheck(minute) says whether it's kept. */
  function lightCheck(min) {
    if (noDesk || !window.THREE || view.zoom !== 'day') return { error: 'Open the day view on the desk first' };
    /* the minute is held only while the pixels are read, then let go, so the board keeps the real time */
    const wasHeld = heldMin;
    if (min != null) { heldMin = Math.round(min); clockTick(); render(); }
    for (let i = 0; i < 200; i++) W.step(0.05);
    W.render();
    const T = window.THREE, cv = stage.querySelector('canvas'), gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const Wc = cv.width, Hc = cv.height, buf = new Uint8Array(Wc * Hc * 4);
    gl.readPixels(0, 0, Wc, Hc, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const rect = cv.getBoundingClientRect(), kx = Wc / rect.width, ky = Hc / rect.height;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lumPx = (x, y) => { const i = ((Hc - 1 - y) * Wc + x) * 4; return 0.2126 * lin(buf[i]) + 0.7152 * lin(buf[i + 1]) + 0.0722 * lin(buf[i + 2]); };
    const hexL = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
    const g = W.debug.dayb.group;
    const px = (x, z, y) => { const p = W.toScreen(new T.Vector3(x, y, z), g); return [Math.round((p.x - rect.left) * kx), Math.round((p.y - rect.top) * ky)]; };
    const q = (arr, f) => arr[Math.min(arr.length - 1, Math.floor(arr.length * f))];
    const wood = [];
    /* three bare strips of wood, one above each lane's ruler */
    [-3.74, -0.66, 2.39].forEach((z) => { for (let x = -8; x <= 8.6; x += 0.25) { const [a, b] = px(x, z, 0.31); if (a >= 0 && b >= 0 && a < Wc && b < Hc) wood.push(lumPx(a, b)); } });
    wood.sort((a, b) => a - b);
    const faces = [];
    W.debug.dayb.blocks.forEach((m) => {
      const u = m.userData;
      if (!m.visible || u.back || u.shrink != null || !u.orig || u.orig.free) return;
      const w = u.w, d = u.dU, c = u.target, h = (u.h || 0.3) + 0.306;
      const a = px(c.x - w / 2 + 0.12, c.z - d / 2 + 0.2, h), b = px(c.x + w / 2 - 0.12, c.z + d / 2 - 0.2, h), a2 = px(c.x - w / 2 + 0.12, c.z + d / 2 - 0.2, h), b2 = px(c.x + w / 2 - 0.12, c.z - d / 2 + 0.2, h);
      const x0 = Math.max(a[0], a2[0]) + 2, x1 = Math.min(b[0], b2[0]) - 2, y0 = a[1] + 2, y1 = b[1] - 2;
      if (x1 - x0 < 8 || y1 - y0 < 8) return;
      const vals = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < Wc && y < Hc) vals.push(lumPx(x, y));
      vals.sort((p, r) => p - r);
      const lk = W.look(u.orig), inkL = hexL(lk.ink), baseL = hexL(lk.base);
      const face = q(vals, 0.5), inkSeen = inkL > baseL ? q(vals, 0.995) : q(vals, 0.005);
      faces.push({ name: (u.orig.label || u.orig.name) + (u.first ? '' : ', continued'), onDesk: +((Math.max(face, inkSeen) + 0.05) / (Math.min(face, inkSeen) + 0.05)).toFixed(2), onPaper: +((Math.max(inkL, baseL) + 0.05) / (Math.min(inkL, baseL) + 0.05)).toFixed(2) });
    });
    faces.sort((a, b) => a.onDesk - b.onDesk);
    const minute = nowMin;
    if (min != null) { heldMin = wasHeld; clockTick(); render(); }
    return { minute, light: W.light, wood: wood.length ? { dimmest: +q(wood, 0.05).toFixed(3), brightest: +q(wood, 0.95).toFixed(3), ratio: +(q(wood, 0.95) / q(wood, 0.05)).toFixed(2) } : null, faces: faces.length, under: faces.filter((f) => f.onDesk < 4.5).length, worst: faces.slice(0, 4) };
  }

  /* == buttons and keys == */
  document.querySelectorAll('#zoom button[data-zoom]').forEach((b) => b.addEventListener('click', () => { Snd.init(); setZoom(b.dataset.zoom); }));
  /* these parts of the page are newer than some saved copies of it; a page without one still runs */
  const on = (id, ev, fn) => { const x = $(id); if (x) x.addEventListener(ev, fn); };
  on('listtoggle', 'click', () => { Snd.init(); Snd.pick(); setList(!view.list); });
  /* straight to any date, at the zoom you're in */
  if ($('hud-jump')) $('hud-jump').appendChild(icon('calendar', 8, UI.soft));
  on('hud-jump', 'click', () => { Snd.init(); const i = $('hud-date'); i.value = view.focus; try { if (i.showPicker) i.showPicker(); else { i.focus(); i.click(); } } catch (e) { i.focus(); } });
  on('hud-date', 'change', () => { const v = $('hud-date').value; if (!v) return; view.focus = v; selectBlock(null); Snd.slide(); render(); say(M.dateText(v, 'long')); });
  on('hud-date', 'keydown', (e) => e.stopPropagation());
  on('skip', 'click', (e) => { e.preventDefault(); if (view.phone) return; setList(true); });
  document.querySelectorAll('.save-state').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); openData(); }));
  /* every arrow and every x on the page is one of the hand drawn marks */
  $('prev').appendChild(icon('left', 9, UI.white)); $('next').appendChild(icon('right', 9, UI.white));
  $('side-x').appendChild(icon('x', 8, UI.white)); $('drawer-x').appendChild(icon('x', 8, UI.white));
  $('prev').addEventListener('click', () => { Snd.init(); shift(-1); });
  $('next').addEventListener('click', () => { Snd.init(); shift(1); });
  $('today').addEventListener('click', () => { Snd.init(); view.focus = today; Snd.slide(); render(); });
  $('undo').addEventListener('click', () => { Snd.init(); undo(); });
  if ($('freeday')) $('freeday').addEventListener('click', () => {
    Snd.init();
    const f = findFreeDay();
    if (!f) { toast('No weekend day with four open hours in the next six months.'); return; }
    setZoom('day', f.date);
    toast(M.DAY_LONG[M.weekday(f.date)] + ', ' + M.dateText(f.date) + ': ' + M.hours(f.open) + ' open, with nothing else on it yet.', 'good');
  });
  $('add-btn').prepend(icon('plus', 8, UI.ink));
  $('todayview-btn').prepend(icon('sun', 8, UI.ink));
  $('todayview-btn').addEventListener('click', () => { Snd.init(); Snd.slide(); view.phoneDesk = false; closeSel(); leavePhoneDay(); setPhone(); renderToday(); });
  $('add-btn').addEventListener('click', () => { Snd.init(); if ($('quick').hidden) openQuick(); else closeQuick(); });
  $('fab-add').prepend(icon('plus', 9, '#FFFFFF'));
  $('fab-add').addEventListener('click', () => { Snd.init(); if ($('quick').hidden) openQuick(); else closeQuick(); });
  $('fab-reset').addEventListener('click', () => { Snd.init(); startReset(resetWeek()); });
  $('dinner-tag').prepend(icon('pot', 7, '#3A2A08'));
  $('dinner-tag').addEventListener('click', () => { Snd.init(); Snd.pick(); openSel({ type: 'dinner', date: today }); });
  $('band-date').addEventListener('click', () => { Snd.init(); if (view.drawer) closeDrawer(); else openDrawer(); });
  $('undo').prepend(icon('undo', 8, UI.ink));
  if ($('tell')) { $('tell').prepend(icon('note2', 8, UI.ink)); $('tell').addEventListener('click', () => { Snd.init(); if (view.sel && view.sel.type === 'feedback') closeSel(); else openSel({ type: 'feedback' }); }); }
  if ($('redo')) { $('redo').prepend(icon('redo', 8, UI.ink)); $('redo').addEventListener('click', () => { Snd.init(); redo(); }); }
  /* a plain mouse wheel moves the tray sideways, except over a list of its own that scrolls down */
  $('rack-body').addEventListener('wheel', (e) => {
    const b = e.currentTarget;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || b.scrollWidth <= b.clientWidth + 1 || (e.target.closest && e.target.closest('.ahead'))) return;
    e.preventDefault();
    b.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 33 : 1);
  }, { passive: false });
  $('rack-body').addEventListener('scroll', rackEdges, { passive: true });
  $('side-x').addEventListener('click', () => { Snd.init(); closeSel(); });
  $('hud-kicker').addEventListener('click', () => { Snd.init(); if (view.drawer) closeDrawer(); else openDrawer(); });
  $('drawer-x').addEventListener('click', () => { Snd.init(); closeDrawer(); });
  /* a click outside the setup closes it with its answers kept, the same as its close mark */
  $('scrim').addEventListener('click', () => { if (!$('sheet').hidden) { if (view.got.setup && $('sheet').classList.contains('onb')) closeSetup(); } else closeDrawer(); });
  /* Escape closes the setup from anywhere inside it, a text box too (they keep Escape to themselves);
     a time being typed into a stepper takes the first Escape to put its number back */
  $('sheet').addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !view.got.setup || !$('sheet').classList.contains('onb')) return;
    if (e.target && e.target.classList && e.target.classList.contains('step-in')) return;
    e.preventDefault(); e.stopPropagation();
    closeSetup();
  }, true);
  $('side').addEventListener('scroll', sideFade);
  document.addEventListener('keydown', trapFocus, true);
  document.addEventListener('pointerdown', (e) => { const k = $('kinds'); if (k.classList.contains('open') && !k.contains(e.target)) k.classList.remove('open'); }, true);
  document.addEventListener('keydown', (e) => {
    if (!e.key) return;
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
    if ((e.metaKey || e.ctrlKey) && !typing && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); undo(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((!$('sheet').hidden || view.drawer) && e.key !== 'Escape') return;
    if (e.key === 'Enter' && view.sel && view.sel.type === 'place' && placeNow && !(e.target && e.target.closest && e.target.closest('button, a, [role="button"], [role="slider"], [role="spinbutton"]'))) { e.preventDefault(); placeNow(); return; }
    if ((e.key === 'n' || e.key === 'N') && !view.phone) { e.preventDefault(); Snd.init(); openQuick(); return; }
    if ((e.key === 't' || e.key === 'T') && !view.phone) { e.preventDefault(); Snd.init(); setMode('today'); return; }
    if ((e.key === 'p' || e.key === 'P') && !view.phone) { e.preventDefault(); Snd.init(); setMode('planner'); return; }
    if ((e.key === 'l' || e.key === 'L') && !view.phone && !noDesk) { e.preventDefault(); Snd.init(); if (inToday()) setMode('planner'); setList(!view.list); return; }
    /* the phone's desk is one day: no other zooms */
    if (phoneDay() && ((e.key >= '1' && e.key <= '4') || '=+-_0'.includes(e.key))) return;
    /* Today is today; other days and zooms are the Planner */
    if (inToday() && ((e.key >= '1' && e.key <= '4') || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) setMode('planner');
    if (e.key >= '1' && e.key <= '4') { Snd.init(); setZoom(ZOOMS[+e.key - 1]); }
    else if (e.key === '=' || e.key === '+') deskZoom(1);
    else if (e.key === '-' || e.key === '_') deskZoom(-1);
    else if (e.key === '0') deskZoom(0);
    else if (e.key === 'ArrowLeft') { Snd.init(); shift(-1); }
    else if (e.key === 'ArrowRight') { Snd.init(); shift(1); }
    else if (e.key === 'Escape' && $('kinds').classList.contains('open')) $('kinds').classList.remove('open');
    else if (e.key === 'Escape' && !$('quick').hidden) closeQuick();
    else if (e.key === 'Escape') { if (!$('sheet').hidden) { if (view.got.setup && $('sheet').classList.contains('onb')) closeSetup(); } else if (view.drawer) closeDrawer(); else if (view.pick) selectBlock(null); else if (view.sel) closeSel(); else if (view.bench) closeBench(); else if (view.level) { view.level = null; renderRack(); } else if (phoneDay()) closePhoneDesk(); else if (inToday()) { if (view.dockOpen) { view.dockOpen = false; render(); } } else zoomStep(1); }
  });

  /* == the frame loop and the real clock == */
  let last = 0, checkAt = 0, lazyTick = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (view.phone || noDesk || view.list) return;
    /* once a second: if the camera lost the board (a hidden stage, a resize mid flight), frame it again */
    if (now - checkAt > 1000) { checkAt = now; if (ready && !W.framed) { logError('reframe'); W.wake(); layoutInsets(); } }
    W.step(dt, now);
    /* at rest nothing is drawn: no frame, no shadow map. With only steam rising, a few frames a second. */
    if (W.idle && !(W.lazy && ++lazyTick % 4 === 0)) return;
    W.render();
    placeTools();
    placeTag();
  }
  /* __reset.at(minutes) holds the clock at a time of day, for trying the band's states; at(null) lets go.
     Dev holds the day too (heldDay), only on a preview, so the real board never gets a made up date. */
  let heldMin = null, heldDay = null, dinnerWasOver = null;
  function clockTick() {
    const d = new Date();
    nowMin = heldMin != null ? heldMin : d.getHours() * 60 + d.getMinutes();
    const t = heldDay || M.todayIso(d);
    W.setDaylight(nowMin);
    if (t !== today) {
      today = t;
      /* a new day opens in its own mode, unless you're in the middle of the reset or a panel */
      if (view.reset || view.sel) saveMode();
      else {
        const m = loadMode();
        if (m !== view.mode) view.mode = m;
        if (m === 'today') enterToday();
      }
      if (ready) render();
      return;
    }
    if (!ready) return;
    /* tonight's dinner stops asking the minute its time is over, on the board as well as in the header */
    const db = day(today).blocks.find((b) => b.dinner), over = !!db && dinnerOver(db, today);
    if (over !== dinnerWasOver) { const was = dinnerWasOver; dinnerWasOver = over; if (was != null) { render(); return; } }
    if (inToday() && !view.sel && !view.reset && view.focus !== boardTime(today, nowMin).date) {
      view.focus = boardTime(today, nowMin).date;
      render();
      return;
    }
    $('hud-clock').textContent = M.clock(nowMin);
    renderNow();
  }
  /* after a resize the panels reflow, so measure them again on the next frame too; an embedded page
     can change size without a window resize, so the stage is watched as well */
  /* after a resize the panels reflow: the phone view settles first, so the desk is measured the way
     it will show, and a desk that was hidden wakes framed with its boards already up */
  const refit = () => {
    if (!ready) { W.fit(); return; }
    const was = view.phone, wasDay = document.body.classList.contains('phone-desk');
    setPhone();
    if (was !== view.phone || wasDay !== phoneDay()) { render(); if (!view.phone) W.wake(); }
    W.fit(); layoutInsets(); requestAnimationFrame(() => layoutInsets());
  };
  window.addEventListener('resize', refit);
  if (window.ResizeObserver) new ResizeObserver(refit).observe(stage);

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const t = new Promise((r) => setTimeout(r, 2500));
    const faces = ['800 64px "Gabarito"', '900 64px "Gabarito"', '700 32px "Atkinson Hyperlegible Next"', '800 32px "Atkinson Hyperlegible Next"'];
    return Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), t]).catch(() => {});
  }
  async function boot() {
    loadView();
    if (glOk) {
      try { W.init(stage); } catch (e) { logError('desk', e); W = stubWorld(); noDesk = true; }
    }
    if (noDesk) { stage.hidden = true; view.list = true; }
    applyPrefs();
    clockTick();
    view.mode = loadMode();
    if (view.mode === 'today') { view.plannerAt = { zoom: view.zoom, focus: today, date: today }; enterToday(); }
    /* the clock ticks on the minute, not up to twenty seconds after it, and again when you come back */
    const onMinute = () => { clockTick(); setTimeout(onMinute, 60000 - (Date.now() % 60000) + 40); };
    setTimeout(onMinute, 60000 - (Date.now() % 60000) + 40);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { clockTick(); W.touch(); } });
    requestAnimationFrame(frame);
    /* The week is on this device, so it opens from here at once. The server gets a moment to answer,
       so a linked device knows before it draws; past that, sync wires itself up when the answer lands. */
    const probe = Cloud.probe();
    const [saved] = await Promise.all([Store.open(), fontsReady(), Promise.race([probe, new Promise((r) => setTimeout(r, 400))])]);
    const before = saved && saved.v;
    const orig = saved && saved.v !== D.VERSION ? JSON.parse(JSON.stringify(saved)) : null;
    const up = saved ? D.migrate(saved) : null;
    const unreadable = !!(up && up.v !== D.VERSION);
    const fresh = !up || unreadable;
    /* someone new looks around a sample week with nobody's real life in it */
    state = fresh ? D.sampleState(today) : up;
    if (unreadable) readOnly = true;
    if (!fresh && before !== up.v) { if (orig) Store.rescue('Before this version of Sunday Reset updated the board', orig); persist(); }
    /* the board's home time zone, set once; a device somewhere else says so */
    if (!fresh && !state.settings.tz && deviceTz()) { state.settings = Object.assign({}, state.settings, { tz: deviceTz() }); persist(); }
    Store.onError = (err) => {
      logError('save', err);
      renderSaveState();
      toast(err && err.what === 'full' ? 'This browser’s storage is full, so that change didn’t save here. Download a backup.' : 'That change didn’t save on this device. Download a backup so nothing is lost.', 'bad', { label: 'Your data', fn: openData });
    };
    Store.onStatus = () => renderSaveState();
    Store.onKeep = () => { if (view.drawer && ['overview', 'data'].includes(view.setPage)) renderDrawer(); };
    Store.onRemote = (st, info) => {
      if (view.preview) { takeAside(D.migrate(st), info && info.tab ? 'another tab' : 'another open copy'); return true; }
      if (bdrag || tdrag) return false;
      /* Undo can't reach past another tab's change, so the board as it was is kept on this device first */
      if (undoStack.length && (!view.got.remoteRescue || Date.now() - view.got.remoteRescue > 10 * 60000)) { Store.rescue('Before an update from another tab', state); view.got.remoteRescue = Date.now(); }
      state = D.migrate(st); undoStack = []; redoStack = []; cache.clear(); render();
      toast(info && info.tab ? (info.merged ? 'Merged with a change from another tab' : 'Updated from another tab') : 'Updated from another open copy');
      return true;
    };
    Store.subscribe();
    Store.listenTabs();
    Cloud.onRemote = takeRemote;
    Cloud.onStatus = () => { saveSig = ''; renderSaveState(); };
    Cloud.onRemoved = () => toast('This device was unlinked from your household. Your board stays here.');
    /* the server came back after an offline start: fetch what changed, and send what waited here */
    Cloud.onBack = () => { renderSaveState(); Cloud.pull(); if (Cloud.dirty) setTimeout(() => Cloud.changed(realBoard()), 1200); };
    probe.then(() => {
      if (Cloud.on) {
        Cloud.poll(); setTimeout(() => Cloud.pull(), 800);
        /* changes made here that hadn't reached the household when the page closed go now */
        if (Cloud.dirty && !fresh) setTimeout(() => Cloud.changed(realBoard()), 1600);
      }
      /* The offline copy belongs to this web app even when sync is unavailable. Artifact hosts
         and embedded copies do not own the surrounding site's service worker. */
      if (!window.claude && window.self === window.top && 'serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => {});
      if (Cloud.cfg) { setTimeout(() => refreshCalendars(false), 4000); setInterval(() => refreshCalendars(false), 30 * 60000); }
      /* anything drawn before the server answered learns about it now */
      saveSig = '';
      if (ready) { renderSaveState(); if (view.phone) renderToday(); if (view.got.setup && view.got.setup.at === 'welcome') renderSheet(); }
    });
    setPhone();
    /* sound and calmer motion are this device's own; the first time, they start from what the board said */
    if (view.sound == null) view.sound = state.settings.sound !== false;
    if (view.calm == null) view.calm = state.settings.motion === 'calm';
    W.setLamp(view.lamp);
    W.onWeekLand = landTick;
    /* feel: the desk says when a block touches down, comes home, or a day clicks into place */
    if (FEEL) W.onFeel = (kind, a) => { if (kind === 'land') { if (a != null) Snd.clack(a); } else if (kind === 'home' || kind === 'roll') Snd.tap(); else if (kind === 'tap') landTick(); };
    applyPrefs();
    ready = true;
    render();
    if (view.desk.theme !== 'warm' || view.desk.layout !== 'full') applyDesk();
    W.snapCamera();
    /* if the fonts were slow, redraw the printed faces once they land */
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => { W.refreshFaces(); render(); });
    $('loading').classList.add('gone');
    setTimeout(() => $('loading').remove(), 600);
    const tzHome = state.settings.tz, tzHere = deviceTz();
    if (unreadable) setTimeout(() => toast('This board was saved by a newer version. It’s open to look at, and nothing here will be saved.', 'bad'), 700);
    else if (Store.loadFailed) setTimeout(() => toast('Couldn’t load your saved week. Changes stay in this browser for now.', 'bad'), 700);
    else if (Store.unreadable && !saved) setTimeout(() => openRecovery(), 500);
    else if (new URLSearchParams(location.search).get('link')) probe.then(() => setTimeout(() => openLinkSheet(new URLSearchParams(location.search).get('link')), 300));
    else if (!saved && loadDraft() && !loadDraft().closed) setTimeout(() => resumeSetup(), 500);
    else if (!saved && !window.SR_MERGE) setTimeout(() => openWelcome('first'), 500);
    else if (fresh && !window.SR_QUIET) setTimeout(() => openSel({ type: 'help' }), 700);
    else if (tzHome && tzHere && tzHome !== tzHere && !sessionStorage.getItem('sundayreset.tzsaid')) { try { sessionStorage.setItem('sundayreset.tzsaid', '1'); } catch (e) { /* fine */ } setTimeout(() => toast('Times here are in ' + tzName(tzHome) + ' time. This device is on ' + tzName(tzHere) + ' time.', '', { label: 'Change', fn: () => openDrawer('days') }), 900); }
    else if (keepAtRisk() && !view.phone && Date.now() - backupAt() > 7 * 864e5 && !(Date.now() - (keepSeen().toldAt || 0) < 14 * 864e5)) { markKeep({ toldAt: Date.now() }); setTimeout(() => toast('This browser can clear your board after seven days without a visit.', '', { label: 'How to keep it', fn: () => openDrawer('data') }), 900); }
    else if (M.weekday(today) === 0 && !(state.weeks[resetWeek()] && state.weeks[resetWeek()].reset && state.weeks[resetWeek()].reset.done)) setTimeout(() => toast('It’s Sunday. Ready for your reset?'), 700);
  }
  /* A saved week this browser couldn't read. It's kept aside whole; nothing writes over it. */
  function openRecovery() {
    returnFocus = document.activeElement;
    const box = $('sheet');
    $('scrim').hidden = false; box.hidden = false; box.replaceChildren(); box.className = 'panel sheet';
    box.appendChild(el('div', 'side-kicker', 'Sunday Reset'));
    const h = el('h2', 'sheet-h', 'Your saved week couldn’t be read'); h.id = 'sheet-h';
    box.appendChild(h);
    box.appendChild(el('p', 'sheet-line', 'Something in this browser’s copy is damaged. It’s kept aside on this device, untouched, and nothing will write over it. Download it to keep it safe, load a backup, or start from a sample week.'));
    actions(box, [
      button('Download it', 'small', () => saveFile('sunday-reset-unreadable-' + today + '.json', Store.unreadable)),
      button('Load a backup', 'small', () => { closeSheet(); $('backup-file').value = ''; $('backup-file').click(); }),
      button('Look around a sample week', 'go', closeSheet)
    ]);
    box.appendChild(button('Tell us what happened', 'link', () => { closeSheet(); openSel({ type: 'feedback' }); }));
    setTimeout(() => { const f = box.querySelector('.go'); if (f) f.focus(); }, 40);
  }
  /* The week didn't open. Say so, leave what's saved alone, and give a way to keep it and to try again:
     never a loading screen that stays forever. */
  function bootFailed(e) {
    console.error(e);
    logError('opening', e);
    const ld = $('loading');
    if (ld) ld.remove();
    const box = $('sheet');
    $('scrim').hidden = false; box.hidden = false; box.replaceChildren(); box.className = 'panel sheet';
    box.appendChild(el('div', 'side-kicker', 'Sunday Reset'));
    const h = el('h2', 'sheet-h', 'Your week didn’t open'); h.id = 'sheet-h';
    box.appendChild(h);
    box.appendChild(el('p', 'sheet-line', 'The app hit an error before it could draw your week. What’s saved on this device hasn’t been touched. Keep a copy of it, then try again.'));
    let raw = null;
    try { raw = localStorage.getItem('sundayreset.v1'); } catch (err) { raw = null; }
    actions(box, [
      raw ? button('Download what’s saved here', 'small', () => saveFile('sunday-reset-saved-' + M.todayIso() + '.json', raw)) : null,
      button('Try again', 'go', () => location.reload())
    ]);
    box.appendChild(el('p', 'field-hint', 'What it said: ' + String((e && e.message) || e).slice(0, 160)));
    const f = box.querySelector('.go');
    if (f) f.focus();
  }
  /* what the merge's top bar and Focus room need from the board: read it, move between views, and
     change it through commit like everything else */
  window.SR = {
    get state() { return state; }, get view() { return view; }, get today() { return today; }, get nowMin() { return nowMin; },
    M, D, cat, icon, day, render, setMode, setZoom, startReset, resetWeek, resetDue, catchUpDue, openDrawer, openDueSoon, closeBench, nowNow, dueList, taskById, markDone, commit, toast, undo, blockName, inToday,
    trayCollapsed, setTrayCollapsed, layoutInsets, Snd, who, openPhoneDesk, closePhoneDesk, phoneDay, shift, openSel, openQuick, redo,
    barCatalog, useDinners, useTogether, withName, layOut, stepsNow, goStep, weekCounts, leaveReset, finishReset, firstReset,
    /* a version can open a Dev board by id and leave it again */
    devBoard(id) { return loadScenarios().then(() => openScenario(id)); }, endPreview,
    /* a version can run a setup of its own (the desk version answers it with blocks on a mat): the same
       answers, the same week built from them, the same preview of it, and the same way it lands */
    blankAnswers: () => blankAnswers(),
    setupWeek(a) { const st = onbBase(Object.assign(blankAnswers(), a)); return st; },
    setupWeekRows(st, from, key) { return onbWeekRows(st, from || M.weekStart(today), key); },
    setupSummary: (a) => setupSummary(Object.assign(blankAnswers(), a)),
    readIcs(text, fileName) { const r = M.parseIcs(String(text), M.addDays(today, -30), M.addDays(today, 400), 800, { tz: homeTz() }); return r.items.length ? { name: r.name || String(fileName || 'Calendar').replace(/\.ics$/i, ''), cat: 'work', items: r.items, more: r.more } : null; },
    applySetup(a, ics) {
      const su = { mode: view.preview ? 'preview' : 'setup', a: Object.assign(blankAnswers(), a), ics: ics || null };
      view.got.setup = su; onbBuild(su); finishSetup();
    },
    saveResetIcs: (at) => saveResetIcs(at),
    /* a version can start the setup for your own week, with the name it already knows */
    /* in a preview (Try the setup), a fresh setup that saves nothing, never this device's own draft */
    openSetup(name) { if (view.preview) { const a = blankAnswers(); if (name) a.name = name; openWelcome('preview', name ? 'home' : 'name', a); return; } const d = OB && loadDraft(); if (d) { resumeFrom(d, 'setup', name); return; } const a = blankAnswers(); if (name) a.name = name; openWelcome('setup', name ? 'home' : 'name', a); },
    /* (a setup closed halfway opens again where it was, with its answers; a name already given skips
       the name question, and Back still reaches it) */
    openTray(tab, level) { if (view.mode !== 'planner') setMode('planner'); view.bench = null; view.tab = tab; view.level = level || null; setTrayCollapsed(false); render(); },
    closeTray() { if (inToday()) { view.dockOpen = false; } else setTrayCollapsed(true); render(); },
    resetState() {
      if (catchUpDue()) return { label: 'Catch up this week', strong: true, run: () => startReset(M.weekStart(today), true) };
      const ws = resetWeek(), w = state.weeks[ws] && state.weeks[ws].reset;
      if (w && w.done) return { label: 'Sunday Reset', strong: false, done: true, run: () => startReset(ws) };
      const due = resetDue(), sunday = M.weekday(today) === 0;
      return { label: w && w.step ? 'Continue Sunday Reset' : due && !sunday ? 'Set up this week' : 'Sunday Reset', strong: !!due, run: () => startReset(ws) };
    }
  };
  boot().catch(bootFailed);

  const debugOk = isLocal || new URLSearchParams(location.search).has('debug');
  if (debugOk) window.__reset = {
    get state() { return state; }, get view() { return view; }, day, render, setZoom, setMode, startReset, goStep, openSel, undo, openDrawer, openWelcome, openDueSoon,
    place(date, add, start) { return commit(() => M.placeAdd(state, date, add, start)); },
    /* a held clock is for a preview only, so the real board never gets a made up time */
    at(min) { if (min != null && !view.preview) return 'Open a made up board first (Settings, Dev)'; heldMin = min == null ? null : Math.round(min); clockTick(); render(); return M.clock(nowMin); },
    /* change the board the way the app does, for trying states on a test copy; only on this computer */
    edit(fn) { if (!isLocal) return 'Only on this computer'; commit(() => fn(state)); return 'edited'; },
    wipe() { if (!isLocal) return 'Only on this computer'; try { localStorage.removeItem('sundayreset.v1'); } catch (e) { /* fine */ } state = D.sampleState(today); undoStack = []; changed(); return 'wiped'; },
    report, get store() { return Store; }, setList, icsWeek, redo, openDrawer, goPage, setBar, barItems, lightCheck,
    /* pick a theme and a layout the way Settings does, and wait until its things have loaded */
    async setDesk(theme, layout) { view.desk = { theme, layout }; saveView(); await applyDesk(); return W.props; }
  };
})();
