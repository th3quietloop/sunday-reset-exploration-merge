/* Picking blocks up. A block lifts, the day makes room under it as it moves, and it lands with a tap.
   Blocks on the calendar move and stretch; pieces from the Block box and waiting to-dos land as new blocks. */
import * as M from './model.js';
import { libraryItem } from './data.js';
import { laneInner, flip } from './ui.js';
import { app, commit, openSheet, blockAt, render, toast, A } from './app.js';
import { tick, lift, nope } from './sound.js';

let d = null;
const LEN = M.RANGE[1] - M.RANGE[0];

function source(el) {
  const kind = el.dataset.drag;
  if (kind === 'block') {
    const b = blockAt(el.dataset.date, el.dataset.id);
    return b ? { kind, date: el.dataset.date, block: b, dur: b.dur } : null;
  }
  if (kind === 'lib') { const p = libraryItem(el.dataset.pid); return p ? { kind, item: p, dur: p.dur } : null; }
  if (kind === 'todo') { const t = app.st.todos.find((x) => x.id === el.dataset.pid); return t ? { kind, todo: t, dur: t.dur } : null; }
  return null;
}

function down(e) {
  if (e.button !== 0) return;
  const el = e.target.closest('[data-drag]');
  if (!el || e.target.closest('button:not([data-drag])')) return;
  const src = source(el);
  if (!src) return;
  d = { el, src, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false, touch: e.pointerType === 'touch', stretch: !!e.target.closest('[data-stretch]') && src.kind === 'block', newId: M.newId(src.kind === 'todo' ? 't' : 'b') };
  if (d.touch) d.timer = setTimeout(() => { if (d && !d.started) begin(); }, 220);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
}

function begin() {
  d.started = true;
  document.body.classList.add('dragging');
  lift();
  if (navigator.vibrate && d.touch) navigator.vibrate(8);
  const r = d.el.getBoundingClientRect();
  if (d.stretch) { d.lane = d.el.closest('[data-lane]'); document.body.classList.add('stretching'); return; }
  d.fx = Math.min(0.9, Math.max(0.1, (d.x0 - r.left) / r.width));
  d.fy = Math.min(0.9, Math.max(0.1, (d.y0 - r.top) / r.height));
  const inLaneY = !!d.el.closest('[data-axis="y"]');
  const along = d.src.kind === 'block' ? (inLaneY ? d.fy : d.fx) : 0.2;
  d.grabMin = Math.round((along * d.src.dur) / 15) * 15;
  const g = d.el.cloneNode(true);
  g.classList.remove('lifting', 'current', 'land', 'drop-in', 'landing');
  g.classList.add('ghost');
  g.removeAttribute('data-key');
  Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.appendChild(g);
  d.ghost = g;
  d.w = r.width; d.h = r.height;
  if (d.src.kind === 'block') { d.el.classList.add('lifting'); app.lifting = { date: d.src.date, id: d.src.block.id }; }
  scrollLoop();
}

function move(e) {
  if (!d) return;
  d.x = e.clientX; d.y = e.clientY;
  const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
  if (!d.started) {
    if (d.touch) { if (dist > 10) abort(); return; }
    if (dist > 4) begin(); else return;
  }
  e.preventDefault();
  if (d.stretch) return stretchTo(e.clientX, e.clientY);
  track();
}

function track() {
  const { x, y } = d;
  d.ghost.style.pointerEvents = 'none';
  const under = document.elementFromPoint(x, y);
  const lane = under && under.closest('[data-lane]');
  const cell = !lane && under && under.closest('[data-cell]');
  const trash = d.src.kind === 'block' && under && under.closest('[data-trash]');
  document.querySelectorAll('.cell-hot, .trash-hot').forEach((el) => el.classList.remove('cell-hot', 'trash-hot'));
  d.ghost.classList.toggle('over-trash', !!trash);
  if (lane) {
    const r = lane.getBoundingClientRect();
    const axis = lane.dataset.axis;
    const w = axis === 'y' ? r.width - 8 : (d.src.dur / LEN) * r.width;
    const h = axis === 'y' ? (d.src.dur / LEN) * r.height : r.height - 16;
    if (Math.abs(w - d.w) > 1 || Math.abs(h - d.h) > 1) { d.w = w; d.h = h; d.ghost.style.width = `${w}px`; d.ghost.style.height = `${h}px`; d.ghost.classList.add('shaped'); }
    const frac = axis === 'y' ? (y - r.top) / r.height : (x - r.left) / r.width;
    const start = M.snap(M.RANGE[0] + frac * LEN - d.grabMin);
    place(x, y, axis);
    const key = `${lane.dataset.lane}|${start}`;
    if (key !== d.key) { d.key = key; preview(lane.dataset.lane, start); tick(); }
    return;
  }
  place(x, y);
  if (d.key) { d.key = null; restore(); d.result = null; d.ghost.classList.remove('refused'); }
  if (cell) {
    cell.classList.add('cell-hot');
    d.result = { cell: cell.dataset.cell };
    const key = `cell|${cell.dataset.cell}`;
    if (key !== d.cellKey) { d.cellKey = key; tick(); }
  } else if (trash) {
    trash.classList.add('trash-hot');
    d.result = { trash: true };
  } else { d.result = null; d.cellKey = null; }
}

function place(x, y) {
  d.ghost.style.left = `${x - d.fx * d.w}px`;
  d.ghost.style.top = `${y - d.fy * d.h}px`;
}

/* What the board would look like if it landed here, without changing the board. */
function trial(date, start) {
  const st = structuredClone(app.st);
  let ok, id;
  if (d.src.kind === 'block') { id = d.src.block.id; ok = M.moveBlock(st, d.src.date, id, date, start); }
  else if (d.src.kind === 'lib') { id = d.newId; ok = !!M.addBlock(st, date, { ...d.src.item, id, src: 'lib' }, start); }
  else { const t = d.src.todo; const was = M.todoPlace(st, t.id); if (was) M.removeBlock(st, was.date, was.block.id); id = d.newId; ok = !!M.addBlock(st, date, { id, name: t.name, cat: t.cat, icon: t.icon || 'check', dur: t.dur, src: 'todo', todo: t.id }, start); }
  return { st, ok, id };
}

let shown = new Set();
function preview(date, start) {
  const { st, ok, id } = trial(date, start);
  d.ghost.classList.toggle('refused', !ok);
  if (!ok) { restore(); d.result = null; return; }
  d.result = { date, start, id };
  const touched = new Set([date]);
  if (d.src.kind === 'block') touched.add(d.src.date);
  for (const t of shown) if (!touched.has(t)) drawLane(t, app.st);
  for (const t of touched) drawLane(t, st, id);
  shown = touched;
}
function drawLane(date, st, landing) {
  document.querySelectorAll(`[data-lane="${date}"]`).forEach((lane) => {
    flip(lane, () => { lane.innerHTML = laneInner(date, M.dayOf(st, date), lane.dataset.axis, { landing, lifting: null }); });
  });
}
function restore() {
  for (const t of shown) drawLane(t, app.st);
  shown = new Set();
  if (d && d.src.kind === 'block') document.querySelector(`.brick[data-id="${CSS.escape(d.src.block.id)}"]`)?.classList.add('lifting');
}

function stretchTo(x, y) {
  const lane = d.lane;
  if (!lane) return;
  const r = lane.getBoundingClientRect();
  const axis = lane.dataset.axis;
  const frac = axis === 'y' ? (y - r.top) / r.height : (x - r.left) / r.width;
  const b = d.src.block;
  const endMin = M.snap(M.RANGE[0] + frac * LEN);
  const dur = Math.max(15, endMin - b.start);
  if (dur === d.dur) return;
  d.dur = dur;
  const st = structuredClone(app.st);
  const ok = M.resizeBlock(st, d.src.date, b.id, dur);
  if (!ok) { nope(); return; }
  tick();
  d.result = { dur };
  drawLane(d.src.date, st, b.id);
  shown = new Set([d.src.date]);
}

function up() {
  if (!d) return;
  const s = d;
  cleanupListeners();
  if (!s.started) {
    clearTimeout(s.timer);
    d = null;
    if (s.src.kind === 'block') openSheet(s.src.date, s.src.block.id);
    else tapAdd(s.src);
    return;
  }
  document.body.classList.remove('dragging', 'stretching');
  app.lifting = null;
  const res = s.result;
  d = null;
  shown = new Set();
  if (s.stretch) {
    if (res) commit((st) => M.resizeBlock(st, s.src.date, s.src.block.id, res.dur), `${s.src.block.name} is ${M.span(res.dur)}`, { landed: s.src.block.id });
    else render();
    return;
  }
  const g = s.ghost;
  if (!res) { flyBack(s); return; }
  g.remove();
  const name = s.src.block?.name || s.src.item?.name || s.src.todo?.name;
  if (res.trash) { commit((st) => M.removeBlock(st, s.src.date, s.src.block.id), `${name} is off ${M.dayName(s.src.date)}`); return; }
  if (res.cell) return dropOnDay(s, res.cell, null, name);
  dropOnDay(s, res.date, res.start, name);
}

function dropOnDay(s, date, start, name) {
  let landedAt = null;
  const ok = commit((st) => {
    let at = start;
    if (at === null) {
      const day = M.dayOf(st, date);
      at = M.quickSpot(day, s.src.dur);
      if (at === null) return false;
    }
    landedAt = at;
    if (s.src.kind === 'block') return M.moveBlock(st, s.src.date, s.src.block.id, date, at);
    if (s.src.kind === 'lib') return M.addBlock(st, date, { ...s.src.item, id: s.newId, src: 'lib' }, at);
    return M.placeTodo(st, s.src.todo, date, at);
  }, null, { landed: s.src.kind === 'block' ? s.src.block.id : s.newId, fail: start === null ? `No open spot on ${M.dayName(date)}` : 'No room there. Nothing moved.' });
  if (ok) {
    if (s.src.kind === 'todo') { const at = M.todoPlace(app.st, s.src.todo.id); if (at) squash(at.block.id); }
    toast(`${name}: ${M.dayName(date, true)} at ${M.clock(landedAt)}`, true);
  }
}
function squash(id) { document.querySelector(`.brick[data-id="${CSS.escape(id)}"]`)?.classList.add('land'); }

/* Tapping a piece puts it in the first open spot of the day you're looking at. */
function tapAdd(src) {
  if (src.kind === 'todo' && app.v.tab === 'todos') return A.todoplan(src.todo.id);
  const t = M.todayIso();
  const v = app.v;
  let date = t;
  if (v.tab === 'calendar') {
    if (v.zoom === 'day') date = v.at;
    else if (v.zoom === 'week') date = M.weekStart(v.at) === M.weekStart(t) ? t : M.weekStart(v.at);
    else date = v.at.slice(0, 7) === t.slice(0, 7) ? t : M.monthStart(v.at);
  }
  const day = M.dayOf(app.st, date);
  const from = date === t ? Math.max(day.wake, M.snap(M.nowMin() + 7)) : day.wake;
  const at = M.quickSpot(day, src.dur, [from, day.bed]);
  if (at === null) { nope(); toast(`No open spot on ${M.dayName(date)}. Drag it where you want it.`); return; }
  dropOnDay({ src, newId: M.newId() }, date, at, src.item?.name || src.todo?.name);
}

function flyBack(s) {
  const g = s.ghost;
  restore();
  const home = s.src.kind === 'block' ? document.querySelector(`.brick[data-id="${CSS.escape(s.src.block.id)}"]`) : s.el.isConnected ? s.el : null;
  if (home) {
    home.classList.remove('lifting');
    const r = home.getBoundingClientRect();
    g.classList.add('flying');
    Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    setTimeout(() => g.remove(), 220);
  } else g.remove();
}

function cancel() {
  if (!d) return;
  const s = d;
  cleanupListeners();
  clearTimeout(s.timer);
  d = null;
  document.body.classList.remove('dragging', 'stretching');
  app.lifting = null;
  if (s.ghost) flyBack(s);
  else render();
}
function abort() {
  clearTimeout(d.timer);
  cleanupListeners();
  d = null;
}
function cleanupListeners() {
  window.removeEventListener('pointermove', move);
  window.removeEventListener('pointerup', up);
  window.removeEventListener('pointercancel', cancel);
}

/* Near the top or bottom of the window, the page scrolls so a block can travel the whole day. */
function scrollLoop() {
  if (!d || !d.started) return;
  const edge = 90;
  let dy = 0;
  if (d.y < edge + 64) dy = -Math.ceil((edge + 64 - d.y) / 6);
  else if (d.y > innerHeight - edge - (app.v.shelf ? 150 : 0)) dy = Math.ceil((d.y - (innerHeight - edge - (app.v.shelf ? 150 : 0))) / 6);
  if (dy && !d.stretch) { window.scrollBy(0, dy); track(); }
  requestAnimationFrame(scrollLoop);
}

export function initDrag() {
  document.addEventListener('pointerdown', down);
  document.addEventListener('touchmove', (e) => { if (d && d.started) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && d && d.started) cancel(); });
  document.addEventListener('dragstart', (e) => { if (e.target.closest && e.target.closest('[data-drag]')) e.preventDefault(); });
}
