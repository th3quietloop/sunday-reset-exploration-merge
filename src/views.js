/* The screens. Chrome is black, white, and gray; the blocks carry the color. */
import * as M from './model.js';
import { KINDS, kindOf, LIBRARY, CATS } from './data.js';
import { esc, mark, brick, piece, chipBrick, laneInner, hourMarks, look, styleVars, spanShort } from './ui.js';
import { app } from './app.js';

const today = () => M.todayIso();
const weekDays = (at) => { const ws = M.weekStart(at); return Array.from({ length: 7 }, (_, i) => M.addDays(ws, i)); };
const openFor = (date) => {
  const day = M.dayOf(app.st, date);
  if (date < today()) return 0;
  return M.openMinutes(day, date === today() ? M.nowMin() : undefined);
};
const laneOpts = (date) => ({ landed: app.landed, dropIn: app.dropIn, lifting: app.lifting && app.lifting.date === date ? app.lifting.id : null });

/* == the top bar == */
export function topbar() {
  const v = app.v;
  const tabs = [['today', 'Today'], ['calendar', 'Calendar'], ['todos', 'To-dos'], ['focus', 'Focus']];
  const ws = resetWeek();
  const strong = M.dow(today()) <= 2 && !app.st.resets[ws];
  return `<header class="top">
    <div class="brand"><span class="logo" aria-hidden="true"><i></i><i></i><i></i></span><span class="wordmark">Sunday Reset</span>${app.st.sample ? '<span class="tag">Sample</span>' : ''}</div>
    <nav class="tabs" aria-label="Views">${tabs.map(([id, name]) => `<button class="tab ${v.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}" ${v.tab === id ? 'aria-current="page"' : ''}>${name}</button>`).join('')}</nav>
    <div class="right">
      <button class="resetbtn ${strong ? 'strong' : ''}" data-act="reset" title="Plan the week: kinds of day, then to-dos">${mark('calendar', strong ? '#fff' : '#1a1a1a', 'mk')}<span>Sunday Reset</span></button>
      <button class="avatar" data-act="menu" aria-haspopup="menu" aria-expanded="${!!v.menu}" title="Settings">${esc((app.st.name || 'A')[0])}</button>
      ${v.menu ? menu() : ''}
    </div>
  </header>`;
}
export function resetWeek() {
  const t = today();
  return M.dow(t) <= 2 ? M.weekStart(t) : M.addDays(M.weekStart(t), 7);
}
function menu() {
  return `<div class="menu" role="menu">
    <div class="menu-head"><span class="avatar big">${esc((app.st.name || 'A')[0])}</span><div><b>${esc(app.st.name)}</b><span>${app.st.sample ? 'Sample board, on this device' : 'On this device'}</span></div></div>
    <button role="menuitemcheckbox" aria-checked="${app.v.sound}" data-act="sound">${mark(app.v.sound ? 'sound' : 'mute', '#1a1a1a')}Sound<span class="state">${app.v.sound ? 'On' : 'Off'}</span></button>
    <button role="menuitem" data-act="about">${mark('help', '#1a1a1a')}What this is</button>
    <hr>
    <button role="menuitem" data-act="startover">${mark('undo', '#1a1a1a')}Start over with the sample</button>
  </div>`;
}

/* == Today == */
export function todayView() {
  const t = today(), now = M.nowMin();
  const day = M.dayOf(app.st, t);
  const cur = day.blocks.find((b) => b.start <= now && b.start + b.dur > now);
  const next = day.blocks.filter((b) => b.start > now).sort((a, b) => a.start - b.start)[0];
  let hero;
  if (cur) {
    const L = look(cur);
    const worn = ((now - cur.start) / cur.dur) * 100;
    const left = cur.start + cur.dur - now;
    hero = `<div class="hero brick big ${cur.fixed ? 'locked' : ''}" style="${styleVars(L)}" data-act="open" data-arg="${cur.id}" data-date="${t}">
      <span class="wear" style="width:${worn.toFixed(1)}%"></span>
      <span class="socket">${mark(cur.icon, L.ink)}</span>
      <span class="hero-words"><span class="eyebrow">Now</span><span class="hero-nm">${esc(cur.name)}</span><span class="hero-tm"><b data-live="left">${M.span(left)}</b> left, until ${M.clock(cur.start + cur.dur)}</span></span>
      <span class="hero-acts"><button class="glass" data-act="focusblock" data-arg="${cur.id}">Focus on this</button></span>
    </div>`;
  } else if (now < day.wake || now >= day.bed) {
    hero = `<div class="hero calm"><span class="eyebrow">${now < day.wake ? 'Early' : 'Tonight'}</span><span class="hero-nm">${now < day.wake ? `The day starts at ${M.clock(day.wake)}` : 'The day is done'}</span><span class="hero-tm">Tomorrow is ${esc(kindOf(M.kindFor(app.st, M.addDays(t, 1)) || 'usual').name.toLowerCase())}. <button class="link" data-act="day" data-arg="${M.addDays(t, 1)}">See tomorrow</button></span></div>`;
  } else {
    const gapEnd = next ? next.start : day.bed;
    const ideas = LIBRARY.flatMap((g) => g.items).filter((p) => p.dur <= gapEnd - now).slice(0, 12);
    const pick = [ideas[2], ideas[5], ideas[7]].filter(Boolean);
    hero = `<div class="hero open-hero"><span class="hero-words"><span class="eyebrow">Now</span><span class="hero-nm">Open until ${M.clock(gapEnd)}</span><span class="hero-tm">${M.span(gapEnd - now)} that's yours. Start one:</span></span>
      <span class="hero-ideas">${pick.map((p, i) => piece(p, { cls: 'idea', i })).join('')}</span></div>`;
  }
  const waiting = app.st.todos.filter((x) => !x.done && !M.todoPlace(app.st, x.id)).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
  const tmr = M.addDays(t, 1);
  const tk = kindOf(M.kindFor(app.st, tmr) || 'usual');
  return `<main id="main" class="view today-view">
    <div class="kicker">${M.dayName(t).toUpperCase()}, ${M.monthName(t).toUpperCase()} ${M.dayNum(t)}</div>
    ${hero}
    ${next ? `<div class="next"><span class="lbl">Next</span>${chipBrick(next)}<span class="at">${M.clock(next.start)}</span></div>` : ''}
    <section class="rail-wrap">
      <div class="rail-head"><h2>Your day</h2><span class="sub">${spanShort(openFor(t))} open</span>${kindChip(t)}</div>
      <div class="rail" data-keep-scroll="rail">
        <div class="ruler">${hourMarks('x')}</div>
        <div class="lane" data-lane="${t}" data-axis="x">${laneInner(t, day, 'x', laneOpts(t))}</div>
      </div>
    </section>
    <section class="below">
      <div class="card">
        <div class="card-head"><h3>Waiting for a time</h3><button class="link" data-act="tab" data-arg="todos">All to-dos</button></div>
        <div class="pieces">${waiting.length ? waiting.slice(0, 5).map((td, i) => piece({ ...td, icon: td.icon || 'check' }, { kind: 'todo', i, sub: td.due ? `Due ${dueWords(td.due)}` : M.span(td.dur) })).join('') : '<p class="empty">Nothing waiting.</p>'}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Tomorrow</h3><button class="link" data-act="day" data-arg="${tmr}">Open</button></div>
        <div class="tmr"><span class="kdot" style="--k:${tk.color}"></span><b>${esc(tk.name)}</b><span class="sub">${spanShort(openFor(tmr))} open</span></div>
        ${dayBar(tmr, true)}
      </div>
    </section>
  </main>`;
}

export const dueWords = (d) => {
  const n = M.daysBetween(today(), d);
  if (n < 0) return 'before today';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 7) return M.dayName(d, true);
  return `${M.monthName(d, true)} ${M.dayNum(d)}`;
};

function kindChip(date, menuOpen) {
  const k = kindOf(M.kindFor(app.st, date) || 'usual');
  const open = app.v.kindMenu === date;
  return `<span class="kwrap"><button class="kind-chip" data-act="kindmenu" data-arg="${date}" aria-haspopup="menu" aria-expanded="${open}"><span class="kdot" style="--k:${k.color}"></span>${esc(k.name)}${mark('down', '#6b6560', 'mk tiny')}</button>${open ? kindMenu(date) : ''}</span>`;
}
function kindMenu(date) {
  const cur = M.kindFor(app.st, date) || 'usual';
  return `<div class="kmenu" role="menu">${KINDS.map((k) => `<button role="menuitemradio" aria-checked="${k.id === cur}" data-act="kind" data-arg="${date}|${k.id}"><span class="kbrick" style="--k:${k.color}">${mark(k.icon, k.ink)}</span><span><b>${esc(k.name)}</b><span>${esc(k.line)}</span></span></button>`).join('')}</div>`;
}

export function dayBar(date, big) {
  const day = M.dayOf(app.st, date);
  const len = M.RANGE[1] - M.RANGE[0];
  const segs = day.blocks.filter((b) => b.start + b.dur > M.RANGE[0] && b.start < M.RANGE[1]).map((b) => {
    const a = Math.max(b.start, M.RANGE[0]), z = Math.min(b.start + b.dur, M.RANGE[1]);
    const L = look(b, date < today());
    return `<i style="left:${((a - M.RANGE[0]) / len) * 100}%;width:${((z - a) / len) * 100}%;--c:${L.base};--lip:${L.lip}" title="${esc(b.name)}"></i>`;
  }).join('');
  return `<div class="daybar ${big ? 'big' : ''}" data-bar="${date}">${segs}</div>`;
}

/* == Calendar == */
export function calendarView() {
  const v = app.v, at = v.at;
  let title = '', sub = '';
  if (v.zoom === 'day') { title = `${M.dayName(at)}, ${M.monthName(at)} ${M.dayNum(at)}`; sub = `${spanShort(openFor(at))} open`; }
  if (v.zoom === 'week') {
    const ds = weekDays(at), a = ds[0], z = ds[6];
    title = M.monthName(a) === M.monthName(z) ? `${M.monthName(a)} ${M.dayNum(a)} to ${M.dayNum(z)}` : `${M.monthName(a, true)} ${M.dayNum(a)} to ${M.monthName(z, true)} ${M.dayNum(z)}`;
    sub = `${spanShort(ds.reduce((s, d) => s + openFor(d), 0))} open`;
  }
  if (v.zoom === 'month') title = `${M.monthName(at)} ${at.slice(0, 4)}`;
  if (v.zoom === 'year') title = at.slice(0, 4);
  const showToday = !inPeriod(today());
  const zooms = [['day', 'Day', 'D'], ['week', 'Week', 'W'], ['month', 'Month', 'M'], ['year', 'Year', 'Y']];
  const body = v.zoom === 'day' ? dayView() : v.zoom === 'week' ? (v.layout === 'rows' ? weekRows() : weekCols()) : v.zoom === 'month' ? monthView() : yearView();
  return `<main id="main" class="view cal-view zoom-${v.zoom}">
    <div class="calbar">
      <div class="where"><h1>${esc(title)}</h1>${sub ? `<span class="sub">${sub}</span>` : ''}</div>
      <div class="navs">
        <button class="sq" data-act="prev" aria-label="Back one ${v.zoom}">${mark('left', '#1a1a1a')}</button>
        ${showToday ? '<button class="txt" data-act="gotoday">Today</button>' : ''}
        <button class="sq" data-act="next" aria-label="Forward one ${v.zoom}">${mark('right', '#1a1a1a')}</button>
      </div>
      <div class="grow"></div>
      ${v.zoom === 'week' ? `<div class="seg icons" role="group" aria-label="Week layout">
        <button class="${v.layout !== 'rows' ? 'on' : ''}" data-act="layout" data-arg="columns" title="Columns: time runs down" aria-pressed="${v.layout !== 'rows'}"><span class="ico cols"><i></i><i></i><i></i></span></button>
        <button class="${v.layout === 'rows' ? 'on' : ''}" data-act="layout" data-arg="rows" title="Rows: time runs across" aria-pressed="${v.layout === 'rows'}"><span class="ico rows"><i></i><i></i><i></i></span></button>
      </div>` : ''}
      <div class="seg" role="group" aria-label="Zoom">${zooms.map(([id, name, key]) => `<button class="${v.zoom === id ? 'on' : ''}" data-act="zoom" data-arg="${id}" aria-pressed="${v.zoom === id}" title="${name} (${key})">${name}</button>`).join('')}</div>
    </div>
    ${body}
  </main>`;
}
function inPeriod(d) {
  const v = app.v;
  if (v.zoom === 'day') return v.at === d;
  if (v.zoom === 'week') return M.weekStart(v.at) === M.weekStart(d);
  if (v.zoom === 'month') return v.at.slice(0, 7) === d.slice(0, 7);
  return v.at.slice(0, 4) === d.slice(0, 4);
}

function dayHead(d, cls = '') {
  const t = today();
  return `<div class="dh ${d === t ? 'is-today' : ''} ${d < t ? 'is-past' : ''} ${cls}">
    <button class="dh-date" data-act="day" data-arg="${d}" title="Open ${M.dayName(d)}"><span class="dn">${M.dayName(d, true)}</span><span class="dd">${M.dayNum(d)}</span></button>
    <div class="dh-meta">${kindChip(d)}<span class="oh">${d < t ? 'Done' : spanShort(openFor(d)) + ' open'}</span></div>
  </div>`;
}

function weekCols() {
  const ds = weekDays(app.v.at);
  return `<div class="week cols" data-keep-scroll="week-${ds[0]}">
    <div class="wk-head"><div class="gutter"></div>${ds.map((d) => dayHead(d)).join('')}</div>
    <div class="wk-body">
      <div class="gutter hours">${hourMarks('y')}</div>
      ${ds.map((d) => `<div class="lane ${d === today() ? 'is-today' : ''}" data-lane="${d}" data-axis="y">${laneInner(d, M.dayOf(app.st, d), 'y', laneOpts(d))}</div>`).join('')}
    </div>
  </div>`;
}

function weekRows() {
  const ds = weekDays(app.v.at);
  return `<div class="week rows" data-keep-scroll="week-${ds[0]}">
    <div class="ruler-row"><div></div><div class="ruler">${hourMarks('x')}</div></div>
    ${ds.map((d) => `<div class="row ${d === today() ? 'is-today' : ''}">${dayHead(d, 'side')}<div class="lane" data-lane="${d}" data-axis="x">${laneInner(d, M.dayOf(app.st, d), 'x', laneOpts(d))}</div></div>`).join('')}
  </div>`;
}

function dayView() {
  const d = app.v.at;
  const cur = M.kindFor(app.st, d) || 'usual';
  return `<div class="dayview">
    <div class="day-col">
      <div class="day-body"><div class="gutter hours">${hourMarks('y')}</div><div class="lane wide ${d === today() ? 'is-today' : ''}" data-lane="${d}" data-axis="y">${laneInner(d, M.dayOf(app.st, d), 'y', laneOpts(d))}</div></div>
    </div>
    <aside class="kinds-side">
      <h2>Kind of day</h2>
      <div class="kcards">${KINDS.map((k, i) => `<button class="kcard ${k.id === cur ? 'on' : ''}" data-act="kind" data-arg="${d}|${k.id}" aria-pressed="${k.id === cur}" style="--i:${i}"><span class="kbrick" style="--k:${k.color}">${mark(k.icon, k.ink)}</span><span><b>${esc(k.name)}</b><span>${esc(k.line)}</span></span></button>`).join('')}</div>
    </aside>
  </div>`;
}

function monthView() {
  const first = M.monthStart(app.v.at);
  const start = M.weekStart(first);
  const t = today();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = M.addDays(start, i);
    if (i === 35 && d.slice(0, 7) !== first.slice(0, 7)) break;
    const out = d.slice(0, 7) !== first.slice(0, 7);
    const k = M.kindFor(app.st, d);
    const kd = k ? kindOf(k) : null;
    const day = M.dayOf(app.st, d);
    const hl = day.blocks.filter((b) => b.src === 'lib' || b.src === 'todo' || (b.fixed && b.src !== 'tpl')).slice(0, 3);
    const marks = app.st.markers.filter((m) => m.date === d);
    const trip = M.tripOn(app.st, d);
    cells.push(`<div class="mcell ${out ? 'out' : ''} ${d === t ? 'is-today' : ''} ${d < t ? 'is-past' : ''}" data-cell="${d}" data-act="day" data-arg="${d}" role="button" tabindex="0" aria-label="${M.dayName(d)}, ${M.monthName(d)} ${M.dayNum(d)}${kd ? ', ' + kd.name : ''}" style="--i:${i}">
      <div class="mtop"><span class="mnum">${M.dayNum(d)}</span>${kd && k !== 'usual' ? `<span class="mkind" style="--k:${kd.color}">${esc(kd.name)}</span>` : ''}</div>
      ${dayBar(d)}
      <div class="mhl">${trip ? `<span class="mline">${mark('plane', '#2A4B90')}${esc(trip.name)}</span>` : ''}${marks.map((m) => `<span class="mline">${mark(m.icon, '#8a5a1a')}${esc(m.name)}</span>`).join('')}${hl.map((b) => chipBrick(b, { worn: d < t })).join('')}</div>
    </div>`);
  }
  return `<div class="month">
    <div class="mdays">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((n) => `<span>${n}</span>`).join('')}</div>
    <div class="mgrid">${cells.join('')}</div>
  </div>`;
}

function yearView() {
  const y = app.v.at.slice(0, 4), t = today();
  const counts = {};
  let html = '';
  for (let m = 0; m < 12; m++) {
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lead = M.dow(first);
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="yd gap"></span>';
    for (let d = first, i = 0; d.slice(0, 7) === first.slice(0, 7); d = M.addDays(d, 1), i++) {
      const k = M.kindFor(app.st, d);
      const marker = app.st.markers.find((x) => x.date === d);
      if (k) counts[k] = (counts[k] || 0) + 1;
      const kd = k ? kindOf(k) : null;
      const word = `${M.dayName(d, true)}, ${M.monthName(d, true)} ${M.dayNum(d)}${kd ? ': ' + kd.name : ''}${marker ? ', ' + marker.name : ''}`;
      cells += `<button class="yd ${kd ? 'k' : 'blank'} ${d === t ? 'is-today' : ''} ${d < t ? 'is-past' : ''} ${marker ? 'has-mark' : ''}" style="${kd ? `--k:${kd.color};` : ''}--i:${m * 31 + i}" data-act="day" data-arg="${d}" title="${esc(word)}" aria-label="${esc(word)}"></button>`;
    }
    html += `<div class="ym"><button class="ym-name" data-act="month" data-arg="${first}">${M.monthName(first)}</button><div class="ydays">${cells}</div></div>`;
  }
  const legend = [...KINDS.filter((k) => k.id !== 'empty'), kindOf('away')].map((k) => `<span class="lg"><i style="--k:${k.color}"></i>${esc(k.name)}<b>${counts[k.id] || 0}</b></span>`).join('');
  return `<div class="year"><div class="legend">${legend}</div><div class="ygrid">${html}</div></div>`;
}

/* == To-dos == */
export function todosView() {
  const st = app.st;
  const waiting = st.todos.filter((x) => !x.done);
  const done = st.todos.filter((x) => x.done);
  const unplaced = waiting.filter((x) => !M.todoPlace(st, x.id));
  const len = app.v.todoLen || 30;
  const row = (td) => {
    const at = M.todoPlace(st, td.id);
    return `<li class="trow ${td.done ? 'done' : ''}" data-key="todo-${td.id}">
      <button class="check ${td.done ? 'on' : ''}" data-act="todone" data-arg="${td.id}" aria-pressed="${!!td.done}" aria-label="${td.done ? 'Mark not done' : 'Mark done'}: ${esc(td.name)}">${td.done ? mark('check', '#fff') : ''}</button>
      <span class="ttrack">${td.done ? `<span class="mini" style="${styleVars(look(td, true))}">${mark(td.icon || 'check', look(td, true).ink)}<span>${esc(td.name)}</span></span>` : piece({ ...td, icon: td.icon || 'check' }, { kind: 'todo', cls: 'tpiece', w: Math.round(150 + Math.min(td.dur, 120) * 0.9) })}</span>
      <span class="tdue">${td.due ? `Due ${dueWords(td.due)}` : ''}</span>
      ${td.done ? '<span></span>' : at ? `<button class="tplace ${td.due && at.date > td.due ? 'late' : ''}" data-act="day" data-arg="${at.date}" title="${td.due && at.date > td.due ? 'This lands after it’s due' : 'Open that day'}">${mark('calendar', '#1a1a1a', 'mk tiny')}${M.dayName(at.date, true)} ${M.clock(at.block.start)}${td.due && at.date > td.due ? ', after due' : ''}</button>` : `<button class="txt" data-act="todoplan" data-arg="${td.id}">Give it a time</button>`}
      <button class="sq ghost" data-act="tododel" data-arg="${td.id}" aria-label="Remove ${esc(td.name)}">${mark('x', '#6b6560')}</button>
    </li>`;
  };
  const t = today();
  const week = Array.from({ length: 7 }, (_, i) => M.addDays(t, i + 1));
  return `<main id="main" class="view todos-view">
    <div class="todo-main">
      <div class="pagehead"><div><h1>To-dos</h1><span class="sub">${unplaced.length} waiting for a time · ${waiting.length - unplaced.length} on the calendar</span></div>
        ${unplaced.length ? '<button class="primary" data-act="plantodos">Find times for all</button>' : ''}</div>
      <form class="addtodo" data-form="todo">
        <input id="todo-in" data-fk="todo-in" autocomplete="off" placeholder="Add a to-do" aria-label="New to-do" value="${esc(app.drafts.todo || '')}">
        <div class="lens" role="group" aria-label="Length">${[15, 30, 60, 120].map((m) => `<button type="button" class="${len === m ? 'on' : ''}" data-act="todolen" data-arg="${m}" aria-pressed="${len === m}">${M.span(m)}</button>`).join('')}</div>
        <button class="secondary" type="submit">Add</button>
      </form>
      <ul class="tlist">${waiting.map(row).join('') || '<li class="empty">Nothing waiting. Add one above.</li>'}</ul>
      ${done.length ? `<details class="donelist"><summary>Done (${done.length})</summary><ul class="tlist">${done.map(row).join('')}</ul></details>` : ''}
    </div>
    <aside class="todo-week">
      <h2>The next seven days</h2>
      <p class="sub">Drop a to-do on a day. It lands in the first open spot.</p>
      ${week.map((d, i) => `<div class="wcell" data-cell="${d}" data-act="day" data-arg="${d}" role="button" tabindex="0" style="--i:${i}">
        <div class="wtop"><b>${M.dayName(d, true)} ${M.dayNum(d)}</b><span class="sub">${spanShort(openFor(d))} open</span></div>
        ${dayBar(d, true)}
      </div>`).join('')}
    </aside>
  </main>`;
}

/* == Focus == */
export function focusView() {
  const f = app.v.focus;
  const t = today(), now = M.nowMin();
  const day = M.dayOf(app.st, t);
  const later = day.blocks.filter((b) => b.start + b.dur > now && !b.fixed && (!f || f.id !== b.id)).slice(0, 6);
  const waiting = app.st.todos.filter((x) => !x.done && (!f || f.todo !== x.id)).slice(0, 6);
  const pickers = `<div class="fpick">
    <h3>${f ? 'Something else' : 'Pick one thing'}</h3>
    <div class="fopts">${later.map((b) => `<button class="fopt" data-act="focusblock" data-arg="${b.id}">${chipBrick(b)}<span class="sub">${M.clock(b.start)}</span></button>`).join('')}
    ${waiting.map((td) => `<button class="fopt" data-act="focustodo" data-arg="${td.id}">${chipBrick({ ...td, icon: td.icon || 'check' })}<span class="sub">To-do, ${M.span(td.dur)}</span></button>`).join('')}</div>
  </div>`;
  if (!f) return `<main id="main" class="view focus-view"><div class="fempty"><h1>One thing at a time</h1><p class="sub">Pick a block or a to-do and it gets the whole screen.</p></div>${pickers}</main>`;
  const L = look(f);
  const total = f.total * 60000;
  const used = focusUsed(f);
  const left = Math.max(0, total - used);
  return `<main id="main" class="view focus-view">
    <div class="fstage">
      <div class="fbrick brick big ${f.done ? 'finished' : ''}" style="${styleVars(L)}">
        <span class="wear" data-live="wear" style="width:${Math.min(100, (used / total) * 100).toFixed(2)}%"></span>
        <span class="socket">${mark(f.icon || 'star', L.ink)}</span>
        <span class="fwords"><span class="eyebrow">${f.done ? 'Done' : f.startedAt ? 'Focusing' : 'Ready'}</span><span class="fnm">${esc(f.name)}</span></span>
        <span class="ftime" data-live="timer">${clockOf(left)}</span>
      </div>
      <div class="facts">
        ${f.done ? '<button class="primary" data-act="focusclear">Pick the next thing</button>' : `<button class="primary" data-act="focusgo">${f.startedAt ? 'Pause' : used ? 'Resume' : 'Start'}</button><button class="secondary" data-act="focusdone">Done</button>`}
      </div>
    </div>
    ${pickers}
  </main>`;
}
export const focusUsed = (f) => (f.used || 0) + (f.startedAt ? Date.now() - f.startedAt : 0);
export const clockOf = (ms) => { const s = Math.ceil(ms / 1000); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };

/* == the Block box == */
export function shelf() {
  const v = app.v;
  if (!v.shelf) return `<button class="shelf-pill" data-act="shelf" aria-expanded="false" title="Block box (B)"><span class="pill-bricks"><i style="--c:${CATS.yours.base}"></i><i style="--c:${CATS.work.base}"></i><i style="--c:${CATS.family.base}"></i></span>Block box</button>`;
  const groups = [...LIBRARY.map((g) => g.group), 'To-dos'];
  const tab = groups.includes(v.shelfTab) ? v.shelfTab : groups[0];
  let pieces;
  if (tab === 'To-dos') {
    const waiting = app.st.todos.filter((x) => !x.done && !M.todoPlace(app.st, x.id));
    pieces = waiting.length ? waiting.map((td, i) => piece({ ...td, icon: td.icon || 'check' }, { kind: 'todo', i, sub: td.due ? `Due ${dueWords(td.due)}` : M.span(td.dur) })).join('') : '<p class="empty">Every to-do has a time.</p>';
  } else pieces = LIBRARY.find((g) => g.group === tab).items.map((p, i) => piece(p, { i })).join('');
  return `<section class="shelf" data-trash aria-label="Block box">
    <div class="shelf-top">
      <div class="shelf-tabs" role="tablist">${groups.map((g) => `<button role="tab" aria-selected="${g === tab}" class="${g === tab ? 'on' : ''}" data-act="shelftab" data-arg="${g}">${g}</button>`).join('')}</div>
      <span class="shelf-hint">Drag one onto a day</span>
      <button class="sq ghost" data-act="shelf" aria-label="Fold the Block box" title="Fold (B)">${mark('down', '#6b6560')}</button>
    </div>
    <div class="shelf-pieces">${pieces}</div>
    <div class="trash-say">${mark('x', '#fff')}Drop here to take it off the day</div>
  </section>`;
}
