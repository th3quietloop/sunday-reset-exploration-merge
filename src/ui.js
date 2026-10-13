/* How a block looks. Bricks are the one colorful thing on the screen. */
import { Icons } from './marks.js';
import { CATS } from './data.js';
import { RANGE, clock, span, openGaps, nowMin, todayIso } from './model.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* == color == */
const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const lum = (hex) => { const c = hexRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const pickInk = (bg) => (contrast(bg, '#ffffff') >= 4.5 ? '#ffffff' : contrast(bg, '#231f1b') >= 4.5 ? '#231f1b' : '#000000');

export function look(b, worn) {
  const c = CATS[b.cat] || CATS.yours;
  if (!worn) return { base: c.base, ink: c.ink, lip: mix(c.base, '#000000', 0.24), hi: mix(c.base, '#ffffff', 0.22) };
  const base = mix(c.base, '#ffffff', 0.58);
  return { base, ink: pickInk(base), lip: mix(base, '#000000', 0.12), hi: mix(base, '#ffffff', 0.3) };
}
export const styleVars = (L) => `--c:${L.base};--ink:${L.ink};--lip:${L.lip};--hi:${L.hi}`;

/* == marks: the desk version's hand drawn set, drawn once per color and kept as images == */
const markCache = new Map();
export function markSrc(name, color = '#000') {
  const key = name + color;
  if (markCache.has(key)) return markCache.get(key);
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  Icons.draw(c.getContext('2d'), name, 32, 32, 56, color);
  const url = c.toDataURL();
  markCache.set(key, url);
  return url;
}
export const mark = (name, color, cls = 'mk', label = '') => `<img class="${cls}" src="${markSrc(name, color)}" alt="${esc(label)}" ${label ? '' : 'aria-hidden="true"'} draggable="false">`;

/* == a brick == */
export function brick(b, o = {}) {
  const worn = !!o.worn;
  const L = look(b, worn);
  const pos = o.pos || '';
  const cls = ['brick', b.fixed ? 'locked' : 'movable', b.soft ? 'soft' : '', worn ? 'worn' : '', o.cls || '', b.src === 'todo' ? 'todo' : ''].join(' ');
  const when = `${clock(b.start)}, ${span(b.dur)}`;
  const label = `${b.name}, ${clock(b.start)} to ${clock(b.start + b.dur)}${b.fixed ? ', locked' : ''}`;
  return `<div class="${cls}" data-key="${esc(b.id)}" data-id="${esc(b.id)}" data-date="${o.date || ''}" ${b.fixed ? '' : 'data-drag="block"'} tabindex="0" role="button" aria-label="${esc(label)}" style="${styleVars(L)};${pos};--i:${o.i || 0}">
    <span class="face">
      ${b.fixed ? '' : '<span class="grip" aria-hidden="true"></span>'}
      <span class="socket">${mark(b.icon || 'star', L.ink)}</span>
      <span class="words"><span class="nm">${esc(b.name)}</span><span class="tm">${when}</span></span>
      ${b.fixed ? `<span class="lock">${mark('lock', L.ink)}</span>` : ''}
      ${b.todo ? `<span class="lock">${mark('check', L.ink)}</span>` : ''}
    </span>
    ${b.fixed ? '' : '<span class="stretch" data-stretch aria-hidden="true"></span>'}
  </div>`;
}

/* A piece in the Block box or a to do waiting for a time. Same brick, not placed yet. */
export function piece(p, o = {}) {
  const L = look(p);
  const w = o.w || Math.round(112 + Math.min(p.dur, 180) * 0.7);
  return `<div class="brick piece movable ${o.cls || ''}" data-drag="${o.kind || 'lib'}" data-pid="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.name)}, ${span(p.dur)}. Drag onto a day" style="${styleVars(L)};width:${w}px;--i:${o.i || 0}">
    <span class="face"><span class="grip" aria-hidden="true"></span><span class="socket">${mark(p.icon || 'star', L.ink)}</span><span class="words"><span class="nm">${esc(p.name)}</span><span class="tm">${o.sub ? esc(o.sub) : span(p.dur)}</span></span></span>
  </div>`;
}

/* A small brick for lists (agenda, month highlights). */
export function chipBrick(b, o = {}) {
  const L = look(b, o.worn);
  return `<span class="mini ${o.cls || ''}" style="${styleVars(L)}">${mark(b.icon || 'star', L.ink)}<span>${esc(b.name)}</span></span>`;
}

/* == lanes == */
const LEN = RANGE[1] - RANGE[0];
export const geom = { origin: RANGE[0], len: LEN };
const pct = (m) => ((m - RANGE[0]) / LEN) * 100;

/* Everything inside one day's lane: sleep at the edges, open gaps, the blocks, and now. */
export function laneInner(date, day, axis, o = {}) {
  const today = todayIso();
  const now = nowMin();
  const past = (b) => date < today || (date === today && b.start + b.dur <= now);
  const place = (s, d) => {
    const a = Math.max(s, RANGE[0]), z = Math.min(s + d, RANGE[1]);
    if (z <= a) return null;
    return axis === 'y' ? `top:${pct(a)}%;height:${((z - a) / LEN) * 100}%` : `left:${pct(a)}%;width:${((z - a) / LEN) * 100}%`;
  };
  let html = '';
  if (day.wake > RANGE[0]) html += `<div class="sleep" style="${place(RANGE[0], day.wake - RANGE[0])}"><span>Sleep</span></div>`;
  if (day.bed < RANGE[1]) html += `<div class="sleep" style="${place(day.bed, RANGE[1] - day.bed)}"><span>Sleep</span></div>`;
  for (const g of openGaps(day)) {
    const p = place(g.start, g.dur);
    if (p) html += `<div class="open" data-open="${g.start}" data-dur="${g.dur}" style="${p}" title="Open, ${clock(g.start)} to ${clock(g.start + g.dur)}"><span>${g.dur >= 30 ? spanShort(g.dur) + ' open' : ''}</span></div>`;
  }
  let i = 0;
  for (const b of day.blocks) {
    const p = place(b.start, b.dur);
    if (!p) continue;
    let cls = '';
    if (o.landing === b.id) cls += ' landing';
    if (o.landed === b.id) cls += ' land';
    if (o.dropIn && o.dropIn.has(b.id)) cls += ' drop-in';
    if (o.lifting === b.id) cls += ' lifting';
    if (date === today && b.start <= now && b.start + b.dur > now) cls += ' current';
    html += brick(b, { date, pos: p, worn: past(b), cls, i: i++ });
  }
  if (date === today && now >= RANGE[0] && now <= RANGE[1]) html += `<div class="now-line" style="${axis === 'y' ? `top:${pct(now)}%` : `left:${pct(now)}%`}"><i></i></div>`;
  return html;
}
export const spanShort = (m) => (m % 60 === 0 ? `${m / 60} h` : m > 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m} min`);

export function hourMarks(axis) {
  let html = '';
  for (let hr = RANGE[0] / 60; hr <= RANGE[1] / 60; hr++) {
    const p = pct(hr * 60);
    const lab = hr === 12 ? 'noon' : `${hr % 12 || 12} ${hr < 12 ? 'am' : 'pm'}`;
    html += `<span class="hr" style="${axis === 'y' ? 'top' : 'left'}:${p}%">${hr === RANGE[1] / 60 && axis === 'x' ? '' : lab}</span>`;
  }
  return html;
}

/* FLIP: anything with a data-key that moved slides from where it was. */
export function flip(root, fn) {
  const before = new Map();
  root.querySelectorAll('[data-key]').forEach((el) => before.set(el.dataset.key, el.getBoundingClientRect()));
  fn();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-key]').forEach((el) => {
    const a = before.get(el.dataset.key);
    if (!a) return;
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1) return;
    if (Math.abs(dx) > 1600 || Math.abs(dy) > 1600) return;
    const sx = b.width ? a.width / b.width : 1, sy = b.height ? a.height / b.height : 1;
    el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' }, { transform: 'none', transformOrigin: 'top left' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}
