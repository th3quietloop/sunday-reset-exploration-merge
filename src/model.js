/* The board: dates, days of blocks, and what happens when a block lands somewhere.
   No DOM in here, so the tests can run it in node. */
import { templateWeek, sampleOnce, sampleTodos, sampleMarkers, TRIPS, KINDS, WINDOWS, libraryItem, h } from './data.js';

export const STEP = 15;
export const RANGE = [h(6), h(23)];
export const DAY_MIN = 0;
export const DAY_MAX = 24 * 60;

/* == dates == */
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const dow = (s) => parse(s).getDay();
export const weekStart = (s) => addDays(s, -dow(s));
export const monthStart = (s) => s.slice(0, 8) + '01';
export const addMonths = (s, n) => { const d = parse(monthStart(s)); d.setMonth(d.getMonth() + n); return iso(d); };
export const todayIso = () => iso(new Date());
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayName = (s, short) => { const n = DAY_NAMES[dow(s)]; return short ? n.slice(0, 3) : n; };
export const monthName = (s, short) => { const n = MONTHS[parse(s).getMonth()]; return short ? n.slice(0, 3) : n; };
export const dayNum = (s) => parse(s).getDate();

/* == words for time == */
export function clock(min) {
  min = ((min % 1440) + 1440) % 1440;
  if (min === 720) return 'noon';
  if (min === 0) return 'midnight';
  const hr = Math.floor(min / 60), mn = min % 60;
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${h12}${mn ? ':' + pad(mn) : ''} ${hr < 12 ? 'am' : 'pm'}`;
}
export function clockShort(min) {
  const hr = Math.floor(min / 60) % 24, mn = min % 60;
  if (hr === 12 && !mn) return 'noon';
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${h12}${mn ? ':' + pad(mn) : ''}`;
}
export function span(min) {
  const hr = Math.floor(min / 60), mn = min % 60;
  if (!hr) return `${mn} min`;
  if (!mn) return `${hr} h`;
  return `${hr} h ${mn} min`;
}
export const hours = (min) => {
  const v = Math.round((min / 60) * 2) / 2;
  return `${v % 1 ? v.toFixed(1) : v} h`;
};

/* == the board == */
let uid = 0;
export const newId = (p = 'b') => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

export function sampleState(today = todayIso()) {
  const st = {
    v: 1,
    name: 'Alex',
    sample: true,
    template: templateWeek(),
    days: {},
    history: {},
    markers: sampleMarkers(today.slice(0, 4)),
    trips: TRIPS(today.slice(0, 4)),
    todos: sampleTodos(today, addDays),
    resets: {},
    made: today
  };
  for (const { date, block } of sampleOnce(today, addDays)) {
    const day = ensureDay(st, date);
    const placed = placeAt(day.blocks, { ...block, id: `${date}-${block.id}`, src: 'lib' }, block.start, day);
    if (placed) day.blocks = placed;
  }
  applyKind(st, addDays(today, 2), 'focus');
  applyKind(st, addDays(today, 5), 'people');
  /* a year of kinds behind today, so the year view has a past to look at */
  const y0 = `${today.slice(0, 4)}-01-01`;
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let d = y0; d < today; d = addDays(d, 1)) {
    const wd = dow(d), r = rand();
    let k;
    if (wd === 0 || wd === 6) k = r < 0.3 ? 'rest' : r < 0.6 ? 'people' : r < 0.78 ? 'workout' : r < 0.9 ? 'creative' : 'usual';
    else k = r < 0.58 ? 'usual' : r < 0.78 ? 'focus' : r < 0.88 ? 'creative' : r < 0.95 ? 'workout' : 'easy';
    st.history[d] = k;
  }
  return st;
}

export function tripOn(st, date) {
  return (st.trips || []).find((t) => date >= t.from && date <= t.to) || null;
}

/* What a day is made of. A day nobody has touched comes from the usual week; its blocks get
   the same ids it will keep once it's edited, so a move animates from where it was. */
export function dayOf(st, date) {
  if (st.days[date]) return st.days[date];
  const t = st.template[dow(date)];
  return {
    wake: t.wake, bed: t.bed, kind: null,
    blocks: t.blocks.map((b) => ({ ...b, id: `${date}-${b.id}`, src: 'tpl' }))
  };
}
export function ensureDay(st, date) {
  if (!st.days[date]) st.days[date] = JSON.parse(JSON.stringify(dayOf(st, date)));
  return st.days[date];
}
export function kindFor(st, date) {
  if (tripOn(st, date)) return 'away';
  const d = st.days[date];
  if (d && d.kind) return d.kind;
  return st.history[date] || null;
}

const overlaps = (a, s, e) => a.start < e && a.start + a.dur > s;
const end = (b) => b.start + b.dur;
export const snap = (m) => Math.round(m / STEP) * STEP;

/* Slide a stretch [s, s + dur) off any locked block, to whichever side is closer. */
function avoidFixed(s, dur, fixed) {
  for (let i = 0; i < 6; i++) {
    const hit = fixed.find((f) => overlaps(f, s, s + dur));
    if (!hit) return s;
    const before = hit.start - dur, after = end(hit);
    s = Math.abs(before - s) <= Math.abs(after - s) ? before : after;
  }
  return null;
}

/* Put `nb` at `start`. Locked blocks are walls. Other blocks make room on whichever side they
   were on. Soft blocks (Work, an evening) open a hole instead of moving. Returns the new list,
   or null when there's no room. */
export function placeAt(blocks, nb, start, day = { wake: DAY_MIN, bed: DAY_MAX }) {
  const others = blocks.filter((b) => b.id !== nb.id).map((b) => ({ ...b }));
  const fixed = others.filter((b) => b.fixed);
  let s = snap(Math.max(DAY_MIN, Math.min(DAY_MAX - nb.dur, start)));
  s = avoidFixed(s, nb.dur, fixed);
  if (s === null || s < DAY_MIN || s + nb.dur > DAY_MAX) return null;
  const placed = { ...nb, start: s };
  const hard = others.filter((b) => !b.fixed && !b.soft);
  const floor = Math.min(day.wake ?? DAY_MIN, ...hard.map((b) => b.start), s);
  const occupied = cascade(fixed, placed, hard, floor, true) || cascade(fixed, placed, hard, floor, false);
  if (!occupied) return null;
  const soft = [];
  for (const sb of others.filter((b) => b.soft && !b.fixed)) {
    let pieces = [{ ...sb }];
    for (const o of occupied) {
      const next = [];
      for (const p of pieces) {
        if (!overlaps(p, o.start, end(o))) { next.push(p); continue; }
        if (o.start - p.start >= STEP) next.push({ ...p, dur: o.start - p.start });
        if (end(p) - end(o) >= STEP) next.push({ ...p, id: next.some((x) => x.id === p.id) ? `${p.id}~${end(o)}` : p.id, start: end(o), dur: end(p) - end(o) });
      }
      pieces = next;
    }
    soft.push(...pieces);
  }
  return dedupe([...occupied, ...soft]).sort((a, b) => a.start - b.start);
}

function dedupe(list) {
  const seen = new Set();
  return list.map((b) => {
    let id = b.id;
    while (seen.has(id)) id = `${id}~`;
    seen.add(id);
    return id === b.id ? b : { ...b, id };
  });
}

/* Blocks that were mostly before the new one slide earlier (never before the day starts),
   the rest slide later. When the morning has no room, everything slides later instead. */
function cascade(fixed, placed, hard, floor, split) {
  const occupied = [...fixed, placed];
  const moved = hard.map((b) => ({ ...b }));
  const mid = placed.start + placed.dur / 2;
  const after = moved.filter((b) => !split || b.start + b.dur / 2 >= mid).sort((a, b) => a.start - b.start);
  const before = split ? moved.filter((b) => b.start + b.dur / 2 < mid).sort((a, b) => b.start - a.start) : [];
  for (const b of before) {
    let st = b.start;
    for (let i = 0; i < 40; i++) {
      const hit = occupied.find((o) => overlaps(o, st, st + b.dur));
      if (!hit) break;
      st = hit.start - b.dur;
    }
    if (st < floor) return null;
    b.start = st;
    occupied.push(b);
  }
  for (const b of after) {
    let st = b.start;
    for (let i = 0; i < 40; i++) {
      const hit = occupied.find((o) => overlaps(o, st, st + b.dur));
      if (!hit) break;
      st = end(hit);
    }
    if (st + b.dur > DAY_MAX) return null;
    b.start = st;
    occupied.push(b);
  }
  return occupied;
}

/* Pieces of one soft block that nothing sits between grow back together. */
export function heal(blocks) {
  const list = [...blocks].sort((a, b) => a.start - b.start);
  const out = [];
  for (const b of list) {
    const prev = out[out.length - 1];
    if (prev && prev.soft && b.soft && root(prev.id) === root(b.id) && !prev.fixed) {
      prev.dur = end(b) - prev.start;
      continue;
    }
    out.push({ ...b });
  }
  return out;
}
const root = (id) => id.split('~')[0];

export function openGaps(day, from = day.wake, to = day.bed) {
  const gaps = [];
  let cursor = from;
  for (const b of [...day.blocks].sort((a, b) => a.start - b.start)) {
    if (end(b) <= from || b.start >= to) continue;
    if (b.start > cursor) gaps.push({ start: cursor, dur: b.start - cursor });
    cursor = Math.max(cursor, end(b));
  }
  if (to > cursor) gaps.push({ start: cursor, dur: to - cursor });
  return gaps.filter((g) => g.dur >= STEP);
}
export const openMinutes = (day, from) => openGaps(day, Math.max(day.wake, from ?? day.wake)).reduce((a, g) => a + g.dur, 0);

/* The first place a block of `dur` fits in a window: open time first, then inside soft time. */
export function quickSpot(day, dur, win = [day.wake, day.bed], preferSoft = false) {
  const gaps = openGaps(day, win[0], win[1]).filter((g) => g.dur >= dur);
  const softs = day.blocks.filter((b) => b.soft && !b.fixed && b.dur >= dur && b.start >= win[0] - 60 && b.start < win[1]);
  if (preferSoft && softs.length) return softs[0].start;
  if (gaps.length) return gaps[0].start;
  if (softs.length) return softs[0].start;
  return null;
}

/* == changes == */
export function moveBlock(st, fromDate, id, toDate, start) {
  const src = ensureDay(st, fromDate);
  const b = src.blocks.find((x) => x.id === id);
  if (!b || b.fixed) return false;
  const rest = heal(src.blocks.filter((x) => x.id !== id));
  const dst = fromDate === toDate ? { ...src, blocks: rest } : ensureDay(st, toDate);
  const next = placeAt(dst.blocks, b, start, dst);
  if (!next) return false;
  if (fromDate === toDate) src.blocks = next;
  else { src.blocks = rest; dst.blocks = next; }
  return true;
}
export function addBlock(st, date, block, start) {
  const day = ensureDay(st, date);
  const at = start ?? quickSpot(day, block.dur, undefined, false);
  if (at === null || at === undefined) return null;
  const nb = { ...block, id: block.id || newId(), start: at };
  const next = placeAt(day.blocks, nb, at, day);
  if (!next) return null;
  day.blocks = next;
  return nb.id;
}
export function resizeBlock(st, date, id, dur) {
  const day = ensureDay(st, date);
  const b = day.blocks.find((x) => x.id === id);
  if (!b) return false;
  const next = placeAt(day.blocks, { ...b, dur: Math.max(STEP, dur) }, b.start, day);
  if (!next) return false;
  day.blocks = next;
  return true;
}
export function removeBlock(st, date, id) {
  const day = ensureDay(st, date);
  day.blocks = heal(day.blocks.filter((x) => x.id !== id));
}
export function editBlock(st, date, id, patch) {
  const day = ensureDay(st, date);
  const b = day.blocks.find((x) => x.id === id);
  if (!b) return false;
  if ('start' in patch || 'dur' in patch) {
    const nb = { ...b, ...patch };
    const next = placeAt(day.blocks, nb, nb.start, day);
    if (!next) return false;
    day.blocks = next;
  } else Object.assign(b, patch);
  return true;
}

/* A kind of day starts from the usual day, then places its blocks in their part of the day. */
export function applyKind(st, date, kindId) {
  const kind = KINDS.find((k) => k.id === kindId);
  if (!kind) return [];
  const t = st.template[dow(date)];
  const keep = (st.days[date]?.blocks || []).filter((b) => b.src === 'todo' || (b.src === 'lib' && !b.kind));
  const day = { wake: t.wake, bed: t.bed, kind: kindId === 'usual' ? null : kindId, blocks: t.blocks.map((b) => ({ ...b, id: `${date}-${b.id}`, src: 'tpl' })) };
  if (kind.easy) day.blocks = day.blocks.filter((b) => b.fixed || b.cat === 'meals');
  if (kind.empty) day.blocks = day.blocks.filter((b) => b.fixed);
  for (const b of keep) { const n = placeAt(day.blocks, b, b.start, day); if (n) day.blocks = n; }
  const added = [];
  for (const [pid, dur, when, inWork] of kind.items || []) {
    const p = libraryItem(pid);
    const win = WINDOWS[when];
    const at = quickSpot(day, dur, win, inWork);
    if (at === null) continue;
    const nb = { ...p, id: newId('k'), dur, start: at, src: 'lib', kind: kindId };
    const n = placeAt(day.blocks, nb, at, day);
    if (n) { day.blocks = n; added.push(nb.id); }
  }
  st.days[date] = day;
  return added;
}

/* == to dos == */
export function todoPlace(st, id) {
  for (const [date, day] of Object.entries(st.days)) {
    const b = day.blocks.find((x) => x.todo === id);
    if (b) return { date, block: b };
  }
  return null;
}
export function placeTodo(st, todo, date, start) {
  const blk = { id: newId('t'), name: todo.name, cat: todo.cat, icon: todo.icon || 'check', dur: todo.dur, src: 'todo', todo: todo.id };
  const was = todoPlace(st, todo.id);
  if (was) removeBlock(st, was.date, was.block.id);
  return addBlock(st, date, blk, start);
}

/* Find each waiting to do a time before it's due, in open time, from tomorrow on. */
export function planTodos(st, today) {
  const placed = [];
  const waiting = st.todos.filter((x) => !x.done && !todoPlace(st, x.id)).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
  for (const t of waiting) {
    const last = t.due && t.due > today ? t.due : addDays(today, 6);
    let best = null;
    for (let d = addDays(today, 1); d <= last; d = addDays(d, 1)) {
      const gaps = openGaps(dayOf(st, d)).filter((g) => g.dur >= t.dur);
      for (const g of gaps) if (!best || g.dur > best.dur) best = { date: d, start: g.start, dur: g.dur };
    }
    if (!best) {
      for (let d = addDays(today, 1); d <= last && !best; d = addDays(d, 1)) {
        const at = quickSpot(dayOf(st, d), t.dur);
        if (at !== null) best = { date: d, start: at };
      }
    }
    if (!best) continue;
    const id = placeTodo(st, t, best.date, best.start);
    if (id) placed.push({ todo: t, date: best.date, id });
  }
  return placed;
}

/* == saving == */
const KEY = 'sundayreset.merge.v1';
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const st = JSON.parse(raw);
      if (st && st.v === 1) return st;
    }
  } catch (e) { /* storage off or unreadable: start from the sample */ }
  return sampleState();
}
export function save(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; }
}
export function wipe() {
  try { localStorage.removeItem(KEY); } catch (e) { /* nothing to remove */ }
}
