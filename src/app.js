/* The app: one board, one view, one render. Every change goes through commit(). */
import * as M from './model.js';
import { kindOf, CATS } from './data.js';
import { flip, esc, mark } from './ui.js';
import { topbar, todayView, calendarView, todosView, focusView, shelf, focusUsed, clockOf } from './views.js';
import { sheet, reset, about } from './panels.js';
import { sound, tok, nope, chime } from './sound.js';
import { initDrag } from './drag.js';

const VIEW_KEY = 'sundayreset.merge.view';
const defaults = { tab: 'today', zoom: 'week', layout: 'columns', at: M.todayIso(), shelf: true, shelfTab: 'Move', sound: true, todoLen: 30, focus: null };

export const app = {
  st: null,
  v: { ...defaults },
  undo: [],
  redo: [],
  drafts: {},
  landed: null,
  dropIn: null,
  lifting: null
};

function loadView() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw && innerWidth < 600) app.v.shelf = false;
    const v = JSON.parse(raw || '{}');
    Object.assign(app.v, v, { at: M.todayIso(), sheet: null, reset: null, menu: false, about: false, kindMenu: null });
  } catch (e) { /* first visit */ }
  sound.on = app.v.sound;
}
function saveView() {
  const { tab, zoom, layout, shelf, shelfTab, sound: snd, todoLen, focus } = app.v;
  try { localStorage.setItem(VIEW_KEY, JSON.stringify({ tab, zoom, layout, shelf, shelfTab, sound: snd, todoLen, focus })); } catch (e) { /* storage off */ }
}

/* == changes == */
export function commit(fn, msg, o = {}) {
  const before = JSON.stringify(app.st);
  let r;
  try { r = fn(app.st); } catch (e) {
    console.error(e);
    app.st = JSON.parse(before);
    toast('That didn’t work. Nothing changed.');
    render();
    return false;
  }
  if (r === false || r === null) {
    app.st = JSON.parse(before);
    nope();
    toast(o.fail || 'No room there. Nothing moved.');
    render({ flip: true });
    return false;
  }
  app.undo.push(before);
  if (app.undo.length > 80) app.undo.shift();
  app.redo = [];
  M.save(app.st);
  if (o.landed) { app.landed = o.landed; tok(); }
  render({ flip: !o.dropIn });
  app.landed = null;
  if (o.dropIn) {
    document.querySelectorAll(`[data-lane="${o.dropIn}"] .brick, [data-bar="${o.dropIn}"] i`).forEach((el, i) => { el.style.setProperty('--i', i); el.classList.add('drop-in'); });
    tok();
  }
  if (msg) toast(msg, true);
  return r === undefined ? true : r;
}
export function undo() {
  if (!app.undo.length) return toast('Nothing to undo');
  app.redo.push(JSON.stringify(app.st));
  app.st = JSON.parse(app.undo.pop());
  M.save(app.st);
  render({ flip: true });
  toast('Undone', false, true);
}
export function redo() {
  if (!app.redo.length) return;
  app.undo.push(JSON.stringify(app.st));
  app.st = JSON.parse(app.redo.pop());
  M.save(app.st);
  render({ flip: true });
  toast('Redone');
}

/* == toast == */
let toastTimer = null;
export function toast(msg, withUndo, withRedo) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(msg)}</span>${withUndo ? '<button data-act="undo">Undo</button>' : ''}${withRedo && app.redo.length ? '<button data-act="redo">Redo</button>' : ''}`;
  el.classList.add('on');
  clearTimeout(toastTimer);
  const hold = () => el.matches(':hover') || el.contains(document.activeElement);
  const out = () => { if (hold()) { toastTimer = setTimeout(out, 1200); return; } el.classList.remove('on'); };
  toastTimer = setTimeout(out, withUndo ? 5200 : 2600);
}

/* == render == */
export function render(o = {}) {
  const root = document.getElementById('app');
  const draw = () => {
    const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk : null;
    const sel = fk && document.activeElement.selectionStart;
    const scrollers = [...document.querySelectorAll('[data-keep-scroll]')].map((el) => [el.dataset.keepScroll, el.scrollTop, el.scrollLeft]);
    const v = app.v;
    const main = v.tab === 'today' ? todayView() : v.tab === 'calendar' ? calendarView() : v.tab === 'todos' ? todosView() : focusView();
    const showShelf = v.tab === 'today' || (v.tab === 'calendar' && v.zoom !== 'year');
    root.className = `tab-${v.tab} ${showShelf ? (v.shelf ? 'with-shelf' : 'with-pill') : ''} ${v.sheet ? 'with-sheet' : ''}`;
    root.innerHTML = topbar() + main + (showShelf ? shelf() : '') + sheet();
    document.getElementById('overlay').innerHTML = reset() + about();
    document.title = `Sunday Reset · ${v.tab === 'calendar' ? 'Calendar' : v.tab === 'todos' ? 'To-dos' : v.tab === 'focus' ? 'Focus' : 'Today'}`;
    const kept = new Set();
    for (const [k, t, l] of scrollers) { const el = document.querySelector(`[data-keep-scroll="${k}"]`); if (el) { el.scrollTop = t; el.scrollLeft = l; kept.add(k); } }
    /* a week that scrolls sideways (a phone) opens on today */
    const wk = document.querySelector('.week[data-keep-scroll]');
    if (wk && !kept.has(wk.dataset.keepScroll) && wk.scrollWidth > wk.clientWidth) {
      const lane = wk.querySelector('.lane.is-today') || wk.querySelector('.row.is-today .lane');
      if (lane && !wk.classList.contains('rows')) wk.scrollLeft = Math.max(0, lane.offsetLeft - 70);
      if (wk.classList.contains('rows')) wk.scrollLeft = Math.max(0, ((M.nowMin() - M.RANGE[0]) / (M.RANGE[1] - M.RANGE[0])) * wk.scrollWidth - 160);
    }
    const rail = document.querySelector('.rail');
    if (rail && rail.scrollWidth > rail.clientWidth && !kept.has('rail')) { rail.scrollLeft = Math.max(0, ((M.nowMin() - M.RANGE[0]) / (M.RANGE[1] - M.RANGE[0])) * rail.scrollWidth - 120); }
    if (fk) {
      const el = document.querySelector(`[data-fk="${fk}"]`);
      if (el) { el.focus(); if (sel != null && el.setSelectionRange) try { el.setSelectionRange(sel, sel); } catch (e) { /* not a text box */ } }
    }
    saveView();
  };
  if (o.flip) flip(document.body, draw);
  else draw();
}

/* == where things are == */
export function blockAt(date, id) { return M.dayOf(app.st, date).blocks.find((b) => b.id === id); }
function go(tab) { app.v.tab = tab; app.v.sheet = null; app.v.kindMenu = null; app.v.menu = false; render(); window.scrollTo({ top: 0 }); }
function shiftAt(n) {
  const v = app.v;
  if (v.zoom === 'day') v.at = M.addDays(v.at, n);
  if (v.zoom === 'week') v.at = M.addDays(v.at, 7 * n);
  if (v.zoom === 'month') v.at = M.addMonths(v.at, n);
  if (v.zoom === 'year') v.at = M.addMonths(v.at, 12 * n);
  v.sheet = null;
  waveIn(n);
}
function waveIn(dir) {
  render();
  const main = document.querySelector('.cal-view');
  if (main) { main.classList.add(dir < 0 ? 'wave-back' : 'wave-fwd'); }
}

/* == actions == */
export const A = {
  tab: (t) => go(t),
  zoom: (z) => { app.v.zoom = z; app.v.sheet = null; app.v.kindMenu = null; waveIn(1); },
  layout: (l) => { app.v.layout = l; render({ flip: true }); },
  prev: () => shiftAt(-1),
  next: () => shiftAt(1),
  gotoday: () => { const back = app.v.at > M.todayIso(); app.v.at = M.todayIso(); waveIn(back ? -1 : 1); },
  day: (d) => { app.v.tab = 'calendar'; app.v.zoom = 'day'; app.v.at = d; app.v.sheet = null; app.v.kindMenu = null; waveIn(1); },
  month: (d) => { app.v.zoom = 'month'; app.v.at = d; waveIn(1); },
  menu: () => { app.v.menu = !app.v.menu; render(); },
  sound: () => { app.v.sound = sound.on = !app.v.sound; render(); if (sound.on) tok(); },
  about: () => { app.v.menu = false; app.v.about = true; render(); },
  closeabout: () => { app.v.about = false; render(); },
  startover: () => {
    app.v.menu = false;
    commit((st) => { Object.assign(st, M.sampleState()); for (const k of Object.keys(st)) if (!(k in M.sampleState())) delete st[k]; }, 'Back to the sample board');
  },
  shelf: () => { app.v.shelf = !app.v.shelf; render(); },
  shelftab: (g) => { app.v.shelfTab = g; render(); },
  kindmenu: (d) => { app.v.kindMenu = app.v.kindMenu === d ? null : d; render(); },
  kind: (arg) => {
    const [d, k] = arg.split('|');
    app.v.kindMenu = null;
    commit((st) => { M.applyKind(st, d, k); }, `${M.dayName(d)} is ${k === 'usual' ? 'your usual day' : kindOf(k).name.toLowerCase()}`, { dropIn: d });
  },
  open: (id, el) => { const date = el.dataset.date || el.closest('[data-date]')?.dataset.date; if (date) openSheet(date, id); },
  closesheet: () => { app.v.sheet = null; render(); },
  step: (dir) => {
    const s = app.v.sheet;
    const b = blockAt(s.date, s.id);
    if (!b) return;
    const patch = dir === 'earlier' ? { start: b.start - 15 } : dir === 'later' ? { start: b.start + 15 } : dir === 'shorter' ? { dur: Math.max(15, b.dur - 15) } : { dur: b.dur + 15 };
    commit((st) => M.editBlock(st, s.date, s.id, patch), null, { fail: 'No room for that.' });
  },
  cat: (c) => { const s = app.v.sheet; commit((st) => M.editBlock(st, s.date, s.id, { cat: c })); },
  icon: (m) => { const s = app.v.sheet; commit((st) => M.editBlock(st, s.date, s.id, { icon: m })); },
  lock: () => { const s = app.v.sheet; const b = blockAt(s.date, s.id); commit((st) => M.editBlock(st, s.date, s.id, { fixed: !b.fixed }), b.fixed ? `${b.name} can move now` : `${b.name} is locked`); },
  remove: () => {
    const s = app.v.sheet; const b = blockAt(s.date, s.id);
    app.v.sheet = null;
    commit((st) => M.removeBlock(st, s.date, s.id), `${b.name} is off ${M.dayName(s.date)}`);
  },
  undo: () => undo(),
  redo: () => redo(),
  todolen: (m) => { app.v.todoLen = Number(m); render(); },
  todone: (id) => { const td = app.st.todos.find((x) => x.id === id); commit((st) => { const t = st.todos.find((x) => x.id === id); t.done = !t.done; }, td.done ? `${td.name} is open again` : `${td.name}, done`); if (!td.done) chime(); },
  tododel: (id) => {
    const td = app.st.todos.find((x) => x.id === id);
    commit((st) => { const at = M.todoPlace(st, id); if (at) M.removeBlock(st, at.date, at.block.id); st.todos = st.todos.filter((x) => x.id !== id); }, `${td.name} is gone`);
  },
  todoplan: (id) => {
    let where = null;
    commit((st) => {
      const td = st.todos.find((x) => x.id === id);
      const t = M.todayIso();
      for (let d = M.addDays(t, 1), i = 0; i < 14; d = M.addDays(d, 1), i++) {
        const at = M.quickSpot(M.dayOf(st, d), td.dur);
        if (at !== null && M.placeTodo(st, td, d, at)) { where = d; return true; }
      }
      return false;
    }, null, { fail: 'No open spot in the next two weeks.' });
    if (where) { const td = app.st.todos.find((x) => x.id === id); const at = M.todoPlace(app.st, id); toast(`${td.name}: ${M.dayName(where)} at ${M.clock(at.block.start)}`, true); tok(); }
  },
  plantodos: () => {
    let n = 0;
    commit((st) => { n = M.planTodos(st, M.todayIso()).length; return n > 0; }, null, { fail: 'No open spots before they’re due.' });
    if (n) { toast(`${n} to-do${n > 1 ? 's have' : ' has'} a time`, true); chime(); }
  },
  reset: () => { app.v.reset = { step: 0 }; app.v.menu = false; app.v.sheet = null; render(); },
  closereset: () => { app.v.reset = null; render(); },
  rstep: (n) => { app.v.reset.step = Number(n); render(); document.querySelector('.modal-body')?.scrollTo(0, 0); },
  rfinish: () => {
    const ws = (M.dow(M.todayIso()) <= 2 ? M.weekStart(M.todayIso()) : M.addDays(M.weekStart(M.todayIso()), 7));
    app.v.reset = null;
    commit((st) => { st.resets[ws] = true; }, 'Your week is set');
    chime();
  },
  focusblock: (id, el) => {
    const date = el?.dataset.date || M.todayIso();
    const b = blockAt(date, id) || blockAt(M.todayIso(), id);
    if (!b) return;
    const now = M.nowMin();
    const total = date === M.todayIso() && b.start <= now && b.start + b.dur > now ? b.start + b.dur - now : b.dur;
    app.v.focus = { id: b.id, name: b.name, cat: b.cat, icon: b.icon, total, used: 0, startedAt: null };
    app.v.sheet = null;
    go('focus');
  },
  focustodo: (id) => {
    const td = app.st.todos.find((x) => x.id === id);
    app.v.focus = { todo: id, name: td.name, cat: td.cat, icon: td.icon || 'check', total: td.dur, used: 0, startedAt: null };
    go('focus');
  },
  focusgo: () => {
    const f = app.v.focus;
    if (f.startedAt) { f.used = focusUsed(f); f.startedAt = null; } else { f.startedAt = Date.now(); tok(); }
    render();
  },
  focusdone: () => {
    const f = app.v.focus;
    f.used = focusUsed(f); f.startedAt = null; f.done = true;
    if (f.todo) commit((st) => { const t = st.todos.find((x) => x.id === f.todo); if (t) t.done = true; }, `${f.name}, done`);
    else render();
    chime();
  },
  focusclear: () => { app.v.focus = null; render(); }
};

export function openSheet(date, id) {
  app.v.sheet = { date, id };
  app.v.kindMenu = null;
  render();
  document.querySelector('.sheet [data-fk="sheet-name"]')?.focus({ preventScroll: true });
}

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) {
    if (app.v.menu && !e.target.closest('.menu')) { app.v.menu = false; render(); }
    else if (app.v.kindMenu && !e.target.closest('.kmenu')) { app.v.kindMenu = null; render(); }
    return;
  }
  const act = el.dataset.act;
  if (A[act]) { e.preventDefault(); if (act !== 'menu' && act !== 'sound') app.v.menu = false; A[act](el.dataset.arg, el); }
}

function onKey(e) {
  if (e.target.matches('input, textarea, select')) {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  const k = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') {
    if (app.v.reset) return A.closereset();
    if (app.v.about) return A.closeabout();
    if (app.v.sheet) return A.closesheet();
    if (app.v.menu || app.v.kindMenu) { app.v.menu = false; app.v.kindMenu = null; return render(); }
  }
  if (app.v.reset || app.v.about) return;
  const blk = e.target.closest && e.target.closest('.brick[data-date]');
  if (blk && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return openSheet(blk.dataset.date, blk.dataset.id); }
  if (blk && blk.dataset.drag && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    e.preventDefault();
    const b = blockAt(blk.dataset.date, blk.dataset.id);
    const axisY = !!blk.closest('[data-axis="y"]');
    const along = axisY ? (k === 'arrowup' ? -15 : k === 'arrowdown' ? 15 : 0) : (k === 'arrowleft' ? -15 : k === 'arrowright' ? 15 : 0);
    const across = axisY ? (k === 'arrowleft' ? -1 : k === 'arrowright' ? 1 : 0) : (k === 'arrowup' ? -1 : k === 'arrowdown' ? 1 : 0);
    const to = M.addDays(blk.dataset.date, across);
    if (e.shiftKey && along) commit((st) => M.resizeBlock(st, blk.dataset.date, b.id, b.dur + along), null, { landed: b.id });
    else commit((st) => M.moveBlock(st, blk.dataset.date, b.id, to, b.start + along), null, { landed: b.id });
    document.querySelector(`.brick[data-id="${CSS.escape(b.id)}"]`)?.focus();
    return;
  }
  if (blk && (e.key === 'Delete' || e.key === 'Backspace') && blk.dataset.drag) { openSheet(blk.dataset.date, blk.dataset.id); return A.remove(); }
  const map = { t: () => go('today'), c: () => go('calendar'), d: () => { app.v.tab = 'calendar'; A.zoom('day'); }, w: () => { app.v.tab = 'calendar'; A.zoom('week'); }, m: () => { app.v.tab = 'calendar'; A.zoom('month'); }, y: () => { app.v.tab = 'calendar'; A.zoom('year'); }, b: () => A.shelf(), z: () => undo(), f: () => go('focus') };
  if (map[k]) { e.preventDefault(); return map[k](); }
  if (app.v.tab === 'calendar' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); shiftAt(e.key === 'ArrowLeft' ? -1 : 1); }
}

function onChange(e) {
  const el = e.target;
  if (el.dataset.edit === 'name' && app.v.sheet) {
    const s = app.v.sheet;
    const name = el.value.trim();
    if (name) commit((st) => M.editBlock(st, s.date, s.id, { name }));
  }
}
function onInput(e) {
  if (e.target.id === 'todo-in') app.drafts.todo = e.target.value;
}
function onSubmit(e) {
  const f = e.target.closest('[data-form="todo"]');
  if (!f) return;
  e.preventDefault();
  const name = (app.drafts.todo || '').trim();
  if (!name) return;
  app.drafts.todo = '';
  const palette = ['yours', 'home', 'family', 'work', 'coral', 'mint', 'sky'];
  commit((st) => { st.todos.unshift({ id: M.newId('td'), name, dur: app.v.todoLen || 30, cat: palette[st.todos.length % palette.length], icon: 'check' }); }, `${name} is waiting for a time`);
  document.getElementById('todo-in')?.focus();
}

/* Today and Focus count down without redrawing everything. */
function tick() {
  const f = app.v.focus;
  if (app.v.tab === 'focus' && f && f.startedAt) {
    const total = f.total * 60000, used = focusUsed(f);
    const t = document.querySelector('[data-live="timer"]'), w = document.querySelector('[data-live="wear"]');
    if (t) t.textContent = clockOf(Math.max(0, total - used));
    if (w) w.style.width = `${Math.min(100, (used / total) * 100)}%`;
    if (used >= total && !f.done) { A.focusdone(); }
  }
}
let lastMin = M.nowMin();
function minute() {
  const m = M.nowMin();
  if (m === lastMin) return;
  lastMin = m;
  const busy = document.body.classList.contains('dragging') || document.activeElement?.matches('input') || app.v.sheet || app.v.reset;
  if (!busy && (app.v.tab === 'today' || app.v.tab === 'calendar')) render();
}

export function boot() {
  app.st = M.load();
  loadView();
  if (app.v.tab === 'calendar' || app.v.tab === 'today' || app.v.tab === 'todos' || app.v.tab === 'focus') { /* keep */ } else app.v.tab = 'today';
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('submit', onSubmit);
  initDrag();
  render();
  setInterval(tick, 250);
  setInterval(minute, 5000);
  window.__merge = { app, M, render, commit };
}
