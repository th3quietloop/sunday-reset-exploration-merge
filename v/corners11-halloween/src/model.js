/* Sunday Reset model: dates, what a day holds, placing blocks, totals, and what's coming.
   No DOM and no 3D. It loads in node for tests (module.exports) and in the browser as window.Model.

   A day runs on a rail from 5 am (300) to midnight (1440), in minutes. Its blocks never overlap.
   A day is built in layers, and each layer lies on top of the ones before it:
     soft template blocks (open time: Work, Creative projects, Evening with Kim)
     hard template blocks (routines: Up with Elijah, Walk, bath, feed, Dinner)
     timed events (Salty's at 6:30), then weekly meetings, then whatever you placed.
   Soft blocks make room: anything laid over them cuts a hole. A hard block that gets covered keeps
   its larger side. Sleep covers the rail before you wake and after you go to bed.
   resolveDay retains that legacy rail for kinds of day. calendarDay returns real calendar dates;
   resolveWindow projects those dates into the configured desk hours, including the next morning. */
(function (root) {
  'use strict';

  const RAIL0 = 300, RAIL1 = 1440, STEP = 15, MIN_LEN = 15;
  const snap = (m) => Math.round(m / STEP) * STEP;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlaps = (a, b) => a.start < b.start + b.dur && b.start < a.start + a.dur;
  const byStart = (a, b) => a.start - b.start || (a.fixed ? -1 : 0) - (b.fixed ? -1 : 0);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* == dates, as 'YYYY-MM-DD' strings == */
  const pad = (n) => String(n).padStart(2, '0');
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function iso(y, m, d) {
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }
  function parts(s) { const a = s.split('-'); return { y: +a[0], m: +a[1], d: +a[2] }; }
  const utc = (s) => { const p = parts(s); return Date.UTC(p.y, p.m - 1, p.d); };
  function addDays(s, n) { const t = new Date(utc(s) + n * 86400000); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  const weekday = (s) => new Date(utc(s)).getUTCDay();
  const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
  /* Weeks start on Sunday unless the board says Monday (settings.weekStart, set with setWeekStart).
     sundayOf is always the Sunday, for things counted from it: a calendar's BYDAY, "next Tuesday". */
  let WS = 0;
  const weekStart = (s) => addDays(s, -((weekday(s) - WS + 7) % 7));
  const sundayOf = (s) => addDays(s, -weekday(s));
  function setWeekStart(n) { WS = n === 1 ? 1 : 0; }
  const weekStartDay = () => WS;
  /* The days of a week in the board's order: [0..6] from Sunday, or [1..6, 0] from Monday. */
  const weekOrder = () => (WS === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]);
  /* Moving a board between Sunday and Monday weeks: everything kept by week (its reset, its kind of
     week, the grocery checks, and when alternating weeks began) moves to the new first day, a day
     later or a day earlier. The rest of the board is kept by date and doesn't move. */
  function shiftWeeks(state, from, to) {
    const by = (to === 1 ? 1 : 0) - (from === 1 ? 1 : 0);
    if (!by) return state;
    const move = (obj) => { const out = {}; Object.keys(obj || {}).forEach((k) => { out[/^\d{4}-\d\d-\d\d$/.test(k) ? addDays(k, by) : k] = obj[k]; }); return out; };
    state.weeks = move(state.weeks);
    if (state.shopping) state.shopping = move(state.shopping);
    if (state.rhythm && state.rhythm.alternate && state.rhythm.alternate.from) state.rhythm.alternate.from = addDays(state.rhythm.alternate.from, by);
    return state;
  }
  const monthKey = (s) => s.slice(0, 7);
  const monthStart = (s) => s.slice(0, 8) + '01';
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  function addMonths(s, n) {
    const p = parts(s);
    const t = new Date(Date.UTC(p.y, p.m - 1 + n, 1));
    const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1;
    return iso(y, m, Math.min(p.d, daysInMonth(y, m)));
  }
  function todayIso(now) { const d = now || new Date(); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  const range = (from, n) => Array.from({ length: n }, (_, i) => addDays(from, i));
  const weekDates = (s) => range(weekStart(s), 7);
  /* Saved times belong to their actual calendar date. A board may show the following morning,
     but that is a projection, never a reason to move a saved record to the previous date. */
  function dateTime(date, minute) {
    const m = Math.round(minute);
    return { date: addDays(date, Math.floor(m / 1440)), start: ((m % 1440) + 1440) % 1440 };
  }
  const windowTime = (date, actualDate, start) => diffDays(date, actualDate) * 1440 + start;
  function visibleHours(state) {
    const h = state && state.settings && state.settings.hours || {};
    const start = clamp(snap(Number.isFinite(h.start) ? h.start : RAIL0), 0, 1425);
    let end = Number.isFinite(h.end) ? snap(h.end) : RAIL1;
    if (end <= start) end += 1440;
    end = clamp(end, start + STEP, Math.min(1740, start + 1440));
    return { start, end };
  }
  function windowPosition(state, date, start) {
    const at = dateTime(date, start), h = visibleHours(state);
    const previous = h.end > 1440 && at.start < h.end - 1440;
    return { date: previous ? addDays(at.date, -1) : at.date, start: previous ? at.start + 1440 : at.start, actualDate: at.date, actualStart: at.start };
  }
  /* the Sunday to Saturday rows that cover a month */
  function monthGrid(s) {
    const first = monthStart(s), p = parts(first);
    const start = weekStart(first);
    const rows = Math.ceil((((weekday(first) - WS + 7) % 7) + daysInMonth(p.y, p.m)) / 7);
    return range(start, rows * 7);
  }

  function dateText(s, style) {
    const p = parts(s), wd = weekday(s);
    if (style === 'long') return DAY_LONG[wd] + ', ' + MONTH_LONG[p.m - 1] + ' ' + p.d;
    if (style === 'day') return DAY_SHORT[wd] + ' ' + MONTH_SHORT[p.m - 1] + ' ' + p.d;
    return MONTH_SHORT[p.m - 1] + ' ' + p.d;
  }
  function spanText(a, b) {
    const pa = parts(a), pb = parts(b);
    if (a === b) return dateText(a);
    if (pa.m === pb.m && pa.y === pb.y) return MONTH_SHORT[pa.m - 1] + ' ' + pa.d + ' to ' + pb.d;
    return dateText(a) + ' to ' + dateText(b);
  }
  function relText(date, today) {
    const n = diffDays(today, date);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    if (n > 1 && n < 7) return DAY_LONG[weekday(date)];
    if (n < 0) return dateText(date) + ', ' + (-n) + ' days ago';
    return dateText(date);
  }

  /* == times == */
  /* Times read the 12 hour way (7:30 pm) unless the board asks for a 24 hour clock (19:30). */
  let clock24 = false;
  function setClock24(on) { clock24 = !!on; }
  /* V11 (the Planner walk, 7.2): whether a hand-off (Sam has it) keeps an outline on the board; off unless the app
     asks, so every other version's board reads as it always did */
  let handoffs = false;
  function setHandoffs(on) { handoffs = !!on; }
  function clock(m) {
    m = Math.round(m);
    const x = ((m % 1440) + 1440) % 1440;
    if (clock24) return (m === 1440 ? '24' : pad(Math.floor(x / 60))) + ':' + pad(x % 60);
    if (x === 0) return 'midnight';
    const hr = Math.floor(x / 60), mn = x % 60;
    if (hr === 12 && mn === 0) return 'noon';
    return ((hr % 12) || 12) + (mn ? ':' + pad(mn) : '') + (hr < 12 ? ' am' : ' pm');
  }
  function span(a, b) {
    const x = clock(a), y = clock(b);
    if (clock24) return x + ' to ' + y;
    const ax = x.slice(-2), by = y.slice(-2);
    return (ax === by && /[ap]m/.test(ax) ? x.slice(0, -3) : x) + ' to ' + y;
  }
  function dur(m) {
    m = Math.max(0, Math.round(m));
    const hr = Math.floor(m / 60), mn = m % 60;
    if (hr && mn) return hr + ' h ' + mn + ' min';
    if (hr) return hr + ' h';
    return mn + ' min';
  }
  function hours(m) {
    const h = Math.round(m / 30) / 2;
    return (h % 1 ? h.toFixed(1) : String(h)) + ' h';
  }

  let seq = 0;
  /* the time, a counter, and four characters of real randomness where the machine has some, so two
     devices making a thing in the same instant don't make the same id */
  const rand4 = () => {
    const c = typeof globalThis !== 'undefined' && globalThis.crypto;
    if (c && c.getRandomValues) { const a = new Uint32Array(1); c.getRandomValues(a); return (a[0] % 1679616).toString(36).padStart(4, '0'); }
    return Math.floor(Math.random() * 1679616).toString(36).padStart(4, '0');
  };
  const newId = (p) => (p || 'x') + Date.now().toString(36) + (seq++).toString(36) + rand4();

  /* == events == */
  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  function yearlyDay(e, date) {
    const md = e.date.slice(5);
    if (md === '02-29' && !isLeap(+date.slice(0, 4))) return date.slice(5) === '02-28';
    return md === date.slice(5);
  }
  /* Events from an imported calendar that's hidden stay out of every day. */
  let liveMemo = { events: null, sig: '', out: null };
  function liveEvents(state) {
    const ids = (state.calendars || []).filter((c) => c.hidden).map((c) => c.id);
    if (!ids.length) return state.events;
    const sig = ids.join() + '|' + state.events.length;
    if (liveMemo.events !== state.events || liveMemo.sig !== sig) {
      const hidden = new Set(ids);
      liveMemo = { events: state.events, sig, out: state.events.filter((e) => !e.cal || !hidden.has(e.cal)) };
    }
    return liveMemo.out;
  }
  /* V11-2 (big moments): a fuzzy date (window: { from, to } and no date yet, sometime in spring) is still a live event,
     so Look ahead and the countdown see it, but it puts nothing on any day and is never a trip day */
  const markersOn = (state, date) => liveEvents(state).filter((e) => e.kind === 'marker' && !!e.date && (e.yearly ? yearlyDay(e, date) : e.date === date));
  const tripOn = (state, date) => liveEvents(state).find((e) => e.kind === 'trip' && !!e.date && !!e.end && e.date <= date && date <= e.end) || null;
  const timedOn = (state, date) => liveEvents(state).filter((e) => e.kind === 'timed' && !!e.date && e.date === date);

  /* == building a day == */
  /* Which kind of week a date is in: one picked for that week, or, when weeks alternate (every other
     week with the kids, a rotating shift), the other kind on every second week from where it started. */
  function shapeOf(state, date) {
    const ws = weekStart(date), w = state.weeks[ws];
    if (w && w.shape) return w.shape;
    const alt = state.rhythm && state.rhythm.alternate;
    if (alt && alt.shape && alt.from && state.rhythm.shapes && state.rhythm.shapes[alt.shape]) {
      const n = Math.round(diffDays(weekStart(alt.from), ws) / 7);
      if (((n % 2) + 2) % 2 === 1) return alt.shape;
    }
    return 'usual';
  }
  function templateFor(state, date) {
    const wd = weekday(date), shape = shapeOf(state, date);
    const sh = shape !== 'usual' && state.rhythm.shapes[shape];
    return (sh && sh.days && sh.days[wd]) || state.rhythm.days[wd];
  }

  function tripBlocks(trip, date, tpl, wake, bed) {
    const one = trip.date === trip.end;
    const leave = clamp(trip.leave || 450, wake, bed - 120);
    const back = clamp(trip.back || 1020, one ? leave + 105 : wake + 15, bed - 15);
    const T = (id, name, icon, start, end, flags) => Object.assign({ id, name, cat: 'away', icon, start, dur: Math.max(STEP, end - start) }, flags || {});
    if (date === trip.date) {
      const keep = tpl.blocks.filter((b) => b.start + b.dur <= leave && !b.daycare && b.cat !== 'work');
      const out = keep.concat([T('trip-go', 'To the airport', 'car', leave, leave + 90, { fixed: true })]);
      if (one) out.push(T('trip', trip.name, 'plane', leave + 90, back, { soft: true }), T('trip-home', 'Fly home', 'plane', back, Math.min(bed, back + 240), { fixed: true }));
      else out.push(T('trip', trip.name, 'plane', leave + 90, bed, { soft: true }));
      return out;
    }
    if (date === trip.end) return [T('trip', trip.name, 'plane', wake, back, { soft: true }), T('trip-home', 'Fly home', 'plane', back, Math.min(bed, back + 240), { fixed: true })];
    return [T('trip', trip.name, 'plane', wake, bed, { soft: true })];
  }

  function piece(b, start, d) { return Object.assign({}, b, { start, dur: d, key: b.base + '@' + start, cut: true }); }
  /* Lay `item` over `list`. Soft blocks and Sleep keep both sides of a hole; other hard blocks
     keep their larger side. Sleep fragments remain locked and keep their normal appearance. */
  function lay(list, item) {
    const out = [];
    const end = item.start + item.dur;
    for (const b of list) {
      if (!overlaps(b, item)) { out.push(b); continue; }
      const left = item.start - b.start, right = b.start + b.dur - end;
      if (b.soft || b.sleep) {
        const minLen = b.sleep ? 1 : MIN_LEN;
        if (left >= minLen) out.push(piece(b, b.start, left));
        if (right >= minLen) out.push(piece(b, end, right));
      } else if (left >= right && left >= MIN_LEN) out.push(Object.assign({}, b, { dur: left, cut: true }));
      else if (right >= MIN_LEN) out.push(Object.assign({}, b, { start: end, dur: right, cut: true }));
    }
    out.push(item);
    return out;
  }
  function clip(list, lo, hi, minLen) {
    const out = [];
    for (const b of list) {
      const s = Math.max(lo, b.start), e = Math.min(hi, b.start + b.dur);
      if (e - s < (minLen == null ? MIN_LEN : minLen)) continue;
      out.push(s === b.start && e === b.start + b.dur ? b : Object.assign({}, b, { start: s, dur: e - s, cut: true }));
    }
    return out;
  }

  function taskIndex(state) {
    const byId = new Map();
    state.tasks.forEach((t) => byId.set(t.id, t));
    return byId;
  }
  function addName(state, a, tasks) {
    const s = a.src || {};
    if (s.type === 'task') { const t = tasks.get(s.id); return t ? t.name : a.name; }
    if (s.type === 'step') {
      const t = tasks.get(s.task), st = t && t.steps.find((x) => x.id === s.id);
      return st ? st.name : a.name;
    }
    return a.name;
  }
  function addDone(state, a, tasks) {
    const s = a.src || {};
    if (s.type === 'task') { const t = tasks.get(s.id); return !!(t && t.done); }
    if (s.type === 'step') { const t = tasks.get(s.task), st = t && t.steps.find((x) => x.id === s.id); return !!(st && (st.done || t.done)); }
    return !!a.done;
  }

  /* Everything on one date, in order, covering the rail with no overlaps. */
  function resolveDay(state, date) {
    const wd = weekday(date);
    const tpl = templateFor(state, date);
    const dd = state.dates[date] || {};
    let wake = clamp(dd.wake != null ? dd.wake : tpl.wake, RAIL0, RAIL1 - 60);
    let bed = clamp(dd.bed != null ? dd.bed : tpl.bed, wake + 60, RAIL1);
    for (const e of timedOn(state, date)) {
      wake = Math.max(RAIL0, Math.min(wake, Math.floor(e.start / STEP) * STEP));
      bed = Math.min(RAIL1, Math.max(bed, Math.ceil((e.start + e.dur) / STEP) * STEP));
    }
    const trip = tripOn(state, date);
    const markers = markersOn(state, date);
    const off = markers.some((m) => m.off);
    const tasks = taskIndex(state);
    const edits = dd.edits || {};

    let base = trip ? tripBlocks(trip, date, tpl, wake, bed) : tpl.blocks;
    if (off && !trip) base = base.filter((b) => b.cat !== 'work' && !b.daycare);
    const tplBlocks = [];
    for (const b0 of base) {
      const e = edits[b0.id];
      if (e && e.gone) continue;
      /* (a routine someone else does every week isn't on this rail, unless this day it was taken back) */
      if (b0.by && !(e && e.mine)) continue;
      const b = Object.assign({}, b0, e || {});
      delete b.by; delete b.mine;
      b.key = b.base = 'tpl:' + b0.id;
      b.tpl = b0.id;
      tplBlocks.push(b);
    }
    let list = [];
    tplBlocks.filter((b) => b.soft).sort(byStart).forEach((b) => { list = lay(list, b); });
    tplBlocks.filter((b) => !b.soft).sort(byStart).forEach((b) => { list = lay(list, b); });
    timedOn(state, date).forEach((e) => {
      list = lay(list, { key: 'ev:' + e.id, base: 'ev:' + e.id, event: e.id, name: e.name, cat: e.cat || 'family', icon: e.icon || 'star', start: e.start, dur: e.dur, fixed: true, big: !!e.big });
    });
    if (!trip && !off) {
      state.meetings.filter((m) => (m.days || []).includes(wd)).sort(byStart).forEach((m) => {
        list = lay(list, { key: 'mt:' + m.id, base: 'mt:' + m.id, meeting: m.id, name: m.name, cat: 'work', icon: 'people', start: m.start, dur: m.dur, fixed: true });
      });
    }
    /* V11 goals: a skipped goal session stays in the adds as a record but takes no time on the day */
    (dd.adds || []).filter((a) => !a.skipped).sort(byStart).forEach((a) => {
      const b = {
        key: 'add:' + a.id, base: 'add:' + a.id, add: a.id, src: a.src || null,
        name: addName(state, a, tasks), cat: a.cat || 'yours', icon: a.icon || 'star',
        start: a.start, dur: a.dur, done: addDone(state, a, tasks)
      };
      if (a.dinner) b.dinner = true;
      if (a.meal) b.meal = true;
      if (a.mealAt != null) b.mealAt = a.mealAt;
      if (a.pinned) b.pinned = true;
      if (a.makes) b.makes = a.makes;
      list = lay(list, b);
    });
    list = clip(list, wake, bed);
    const dinner = state.dinners[date];
    list.forEach((b) => {
      if (b.dinner) {
        b.planned = !!(dinner && (dinner.name || dinner.cook));
        b.cook = dinner ? dinner.cook || '' : '';
        b.label = dinner && dinner.name ? dinner.name : 'Dinner';
      }
    });
    if (wake > RAIL0) list.push({ key: 'sleep:am', base: 'sleep:am', name: 'Sleep', cat: 'sleep', icon: 'bed', start: RAIL0, dur: wake - RAIL0, fixed: true, sleep: 'am' });
    if (bed < RAIL1) list.push({ key: 'sleep:pm', base: 'sleep:pm', name: 'Sleep', cat: 'sleep', icon: 'bed', start: bed, dur: RAIL1 - bed, fixed: true, sleep: 'pm' });
    list.sort(byStart);
    const due = state.tasks.filter((t) => !t.done && t.due === date);
    return { date, wd, wake, bed, blocks: list, markers, trip, off, due, shape: shapeOf(state, date) };
  }

  /* The complete schedule is independent of the hours the desk happens to show. Build neighboring
     actual dates on one continuous line, then clip only the returned view. Original identity is
     kept for edits; resolved spans are kept separately for calendar export after soft blocks split. */
  /* V11 goals: while a planner reads many days in a row without changing anything (withRecMemo), each
     date's records are worked out once */
  let recMemo = null;
  function withRecMemo(state, fn) {
    const was = recMemo;
    recMemo = { state, map: new Map() };
    try { return fn(); } finally { recMemo = was; }
  }
  /* a planner that changes a date while the memo is on forgets that date's records */
  function memoForget(state, date) { if (recMemo && recMemo.state === state) recMemo.map.delete(date); }
  function calendarRecords(state, ownerDate) {
    if (recMemo && recMemo.state === state) {
      let hit = recMemo.map.get(ownerDate);
      if (!hit) { hit = buildRecords(state, ownerDate); recMemo.map.set(ownerDate, hit); }
      return hit;
    }
    return buildRecords(state, ownerDate);
  }
  function buildRecords(state, ownerDate) {
    const tpl = templateFor(state, ownerDate), dd = state.dates[ownerDate] || {}, edits = dd.edits || {};
    const wake = clamp(dd.wake != null ? dd.wake : tpl.wake, 0, 1439);
    const bed = clamp(dd.bed != null ? dd.bed : tpl.bed, wake + 1, 1740);
    const trip = tripOn(state, ownerDate), off = markersOn(state, ownerDate).some((m) => m.off), tasks = taskIndex(state);
    const records = [];
    const put = (b, layer) => {
      const at = dateTime(ownerDate, b.start);
      records.push(Object.assign({}, b, { layer, sourceDate: ownerDate, sourceStart: b.start, sourceDur: b.dur, sourceKey: b.base || b.key, actualDate: at.date, actualStart: at.start }));
    };
    if (wake > 0) put({ key: 'sleep:am', base: 'sleep:am', name: 'Sleep', cat: 'sleep', icon: 'bed', start: 0, dur: wake, fixed: true, sleep: 'am' }, 0);
    if (bed < 1440) put({ key: 'sleep:pm', base: 'sleep:pm', name: 'Sleep', cat: 'sleep', icon: 'bed', start: bed, dur: 1440 - bed, fixed: true, sleep: 'pm' }, 0);
    let base = trip ? tripBlocks(trip, ownerDate, tpl, wake, bed) : tpl.blocks;
    if (off && !trip) base = base.filter((b) => b.cat !== 'work' && !b.daycare);
    for (const b0 of base) {
      const e = edits[b0.id];
      /* (Kim's test, K8: a routine someone else does every week carries by in the usual week; a day it's taken back
         says mine on that date's edit, and a one-day handoff over it says by again) */
      const weekly = !!b0.by && !(e && (e.mine || e.gone));
      const by = e && e.gone && e.by ? e.by : weekly ? b0.by : null;
      /* V11 (the Planner walk, 7.2): a routine someone else has this day (e.by: Sam has it) leaves an outline in
         its place, "Sam: Pick up Robin", printed on the wood like free time, so both of you see who has it. Its
         time is yours to use: soft, never locked, open time when it's counted (handoff) */
      if (by && handoffs && !b0.sleep) {
        const ho = Object.assign({}, b0, e && e.start != null ? { start: e.start } : {}, e && e.dur ? { dur: e.dur } : {}, { key: 'tpl:' + b0.id, base: 'tpl:' + b0.id, tpl: b0.id, handoff: String(by), name: b0.name, label: String(by) + ': ' + ((e && e.name) || b0.name), soft: true, free: true, fixed: false, cat: 'open' });
        delete ho.gone; delete ho.by; delete ho.daycare; delete ho.mine;
        const hc = clip([ho], wake, bed);
        /* (it lies under the day's own routines, a layer below soft ones, so Work keeps its usual end beside it; one
           that's someone else's every week lies over open work, so it stays in view where it happens) */
        if (hc.length) put(hc[0], b0.by ? 1.5 : 0.5);
        continue;
      }
      if ((e && e.gone) || weekly) continue;
      const b = Object.assign({}, b0, e || {}, { key: 'tpl:' + b0.id, base: 'tpl:' + b0.id, tpl: b0.id });
      delete b.by; delete b.mine;
      /* A changed wake or bed still trims its routines, as before. Placed things and calendar
         commitments retain their requested time even when it is outside those routines. */
      const movedOutside = e && e.start != null && (b.start < wake || b.start + b.dur > bed);
      const clipped = movedOutside ? [b] : clip([b], wake, bed);
      if (clipped.length) put(clipped[0], b.soft ? 1 : 2);
    }
    timedOn(state, ownerDate).forEach((e) => put({ key: 'ev:' + e.id, base: 'ev:' + e.id, event: e.id, cal: e.cal || null, name: e.name, cat: e.cat || 'family', icon: e.icon || 'star', start: e.start, dur: e.dur, fixed: true, big: !!e.big }, 3));
    if (!trip && !off) state.meetings.filter((m) => (m.days || []).includes(weekday(ownerDate))).forEach((m) => put({ key: 'mt:' + m.id, base: 'mt:' + m.id, meeting: m.id, name: m.name, cat: 'work', icon: 'people', start: m.start, dur: m.dur, fixed: true }, 4));
    (dd.adds || []).filter((a) => !a.skipped).forEach((a) => put(Object.assign({ key: 'add:' + a.id, base: 'add:' + a.id, add: a.id, src: a.src || null, name: addName(state, a, tasks), cat: a.cat || 'yours', icon: a.icon || 'star', start: a.start, dur: a.dur, done: addDone(state, a, tasks) }, a.dinner ? { dinner: true } : {}, a.meal ? { meal: true } : {}, a.mealAt != null ? { mealAt: a.mealAt } : {}, a.pinned ? { pinned: true } : {}, a.makes ? { makes: a.makes } : {}), 5));
    records.forEach((b) => {
      if (!b.dinner) return;
      const dinner = state.dinners[ownerDate];
      b.planned = !!(dinner && (dinner.name || dinner.cook));
      b.cook = dinner ? dinner.cook || '' : '';
      b.label = dinner && dinner.name ? dinner.name : 'Dinner';
    });
    return records;
  }
  function calendarLine(state, date) {
    const records = range(addDays(date, -7), 9).flatMap((d) => calendarRecords(state, d).map((b) => Object.assign({}, b, { start: windowTime(date, d, b.start) })));
    records.sort((a, b) => a.layer - b.layer || byStart(a, b));
    let list = [];
    records.forEach((b) => { list = lay(list, b); });
    return list.map((b) => {
      const at = dateTime(date, b.start);
      return Object.assign({}, b, { exportDate: at.date, exportStart: at.start, exportDur: b.dur, exportKey: b.sourceDate + ':' + b.sourceKey + '@' + windowTime(b.sourceDate, at.date, at.start) });
    });
  }
  function calendarDay(state, date) {
    const tpl = templateFor(state, date), dd = state.dates[date] || {};
    const blocks = clip(calendarLine(state, date), 0, 1440, 1).map((b) => Object.assign({}, b, { key: b.sourceDate + ':' + b.key, base: b.sourceDate + ':' + b.base })).sort(byStart);
    const awake = blocks.filter((b) => !b.sleep);
    return { date, wd: weekday(date), wake: awake.length ? Math.min(...awake.map((b) => b.start)) : clamp(dd.wake != null ? dd.wake : tpl.wake, 0, 1440), bed: awake.length ? Math.max(...awake.map((b) => b.start + b.dur)) : clamp(dd.bed != null ? dd.bed : tpl.bed, 0, 1440), blocks, markers: markersOn(state, date), trip: tripOn(state, date), off: markersOn(state, date).some((m) => m.off), due: state.tasks.filter((t) => !t.done && t.due === date), shape: shapeOf(state, date), calendar: true };
  }
  function resolveWindow(state, date, hours) {
    const h = hours || visibleHours(state), base = calendarDay(state, date);
    const blocks = clip(calendarLine(state, date), h.start, h.end, 1).map((b) => {
      const at = dateTime(date, b.start);
      return Object.assign({}, b, { key: b.sourceDate + ':' + b.key, base: b.sourceDate + ':' + b.base, actualDate: at.date, actualStart: at.start, nextDay: at.date > date });
    }).sort(byStart);
    return Object.assign({}, base, { wake: h.start, bed: h.end, blocks, hours: h, calendar: false });
  }
  /* V11 (the Today walk, Oct 15): a date's own day, from its own plan. wake is when the person gets up that
     morning and bed when they go to bed that night, in that date's minutes, so a bed after midnight is past
     1440 (Late shifts: wake 600, bed 1560). calendarDay reads the calendar line instead, which for a day whose
     evening runs past midnight starts with last night's tail (wake 0) and stops at midnight. The band's evening,
     the morning question, tonight's dinner, and the night read this one. */
  function ownDay(state, date) {
    const tpl = templateFor(state, date), dd = state.dates[date] || {};
    const wake = clamp(dd.wake != null ? dd.wake : tpl.wake, 0, 1439);
    return { date, wake, bed: clamp(dd.bed != null ? dd.bed : tpl.bed, wake + 1, 1740) };
  }
  /* Which day a minute of `date` belongs to, as the person lives it: before this morning's wake and before
     last night's bed, it's still yesterday's day. Gives ownDay's record with wake and bed in `date`'s minutes,
     and asleep when it falls between the two days. */
  function dayAt(state, date, min) {
    const y = ownDay(state, addDays(date, -1)), t = ownDay(state, date);
    if (min < t.wake && min < y.bed - 1440) return { date: y.date, wake: y.wake - 1440, bed: y.bed - 1440, asleep: false };
    return { date, wake: t.wake, bed: t.bed, asleep: min < t.wake || min >= t.bed };
  }
  /* a weekday unlike the usual one: Saturday (Sunday is the reset's), the day back from a trip or on one, a day
     marked off, or a day with no work on it when other weekdays have some */
  function dayDiffers(state, date) {
    const wd = weekday(date);
    if (wd === 0 || wd === 6) return true;
    if (tripOn(state, date) || tripOn(state, addDays(date, -1)) || markersOn(state, date).some((m) => m.off)) return true;
    const works = (d) => templateFor(state, d).blocks.some((b) => b.cat === 'work');
    if (works(date)) return false;
    const ws = sundayOf(date);
    return [1, 2, 3, 4, 5].some((k) => works(addDays(ws, k)));
  }
  /* a locked block that takes you out of the house: a drop off or a pick up, a trip, or a date on the board's own
     calendar (an imported calendar's events may be calls, so they don't count) */
  const leavesHome = (b) => !!b && !b.sleep && !b.handoff && !!(b.daycare || b.trip || b.icon === 'car' || b.icon === 'plane' || (b.event && !b.cal));

  /* (V11, the Planner walk: a hand-off's outline is time that's open for you, so it's counted as the gap it is) */
  function gaps(day) {
    const out = [];
    let c = day.wake;
    for (const b of day.blocks) {
      if (b.handoff) continue;
      if (b.start > c) out.push([c, b.start]);
      c = Math.max(c, b.start + b.dur);
    }
    if (c < day.bed) out.push([c, day.bed]);
    return out.filter((g) => g[1] - g[0] >= MIN_LEN);
  }
  function totals(days) {
    const t = { free: 0 };
    for (const d of [].concat(days)) {
      for (const b of d.blocks) if (!b.handoff) t[b.cat] = (t[b.cat] || 0) + b.dur;
      for (const g of gaps(d)) t.free += g[1] - g[0];
    }
    return t;
  }
  const awake = (t) => Object.keys(t).reduce((a, k) => a + (k === 'sleep' ? 0 : t[k]), 0);

  /* == placing == */
  /* V11-2: meals keep their time. A meal is a Dinner block, a template Breakfast, Lunch, or Dinner ("Lunch, pack them
     up" too), or a block marked meal: true (V11-3: Meals as a kind of time no longer is). Its window is its usual time,
     an hour either way: the template's start, or where a placed meal was put (mealAt, V11-3), else its own start. Making room never moves a meal further out than its window without a yes, the way a plan
     never takes own time without one: pushInsert keeps the least moving way that keeps every meal in its window, and
     when only a way that moves one out would do, it says so instead (reason 'meal', with meal: { name, key, fromDate,
     from, date, to }, and the pushes it would make) so the app can ask "This moves Dinner to 4:45 pm. Move it?". The
     yes is opts.meals on canPlace, placeAdd, moveAdd, moveTemplate, and resizeBlock, or withMeals(true, fn) around
     any change (15 more minutes too). A stretch that would push a meal out stops where its window does. */
  const MEAL_WINDOW = 60;
  /* (V11-3, C5: a meal is a Dinner block, a template Breakfast, Lunch, or Dinner, or a block that says it is one
     (meal: true); Meals as a kind of time isn't enough, so Meal prep and Groceries after move like anything else) */
  const mealBlock = (b) => !!b && !b.sleep && !b.soft && (!!b.dinner || !!b.meal || (!!b.tpl && /^(breakfast|lunch|dinner)\b/i.test(String(b.name || ''))));
  let mealsOk = false;
  function withMeals(on, fn) { const was = mealsOk; mealsOk = !!on; try { return fn(); } finally { mealsOk = was; } }
  /* a meal's window in `date`'s minutes: { lo, hi, at } around its usual start; null for anything that isn't a meal */
  function mealWindow(state, b, date) {
    if (!mealBlock(b)) return null;
    const src = b.sourceDate || date;
    let at = null;
    if (b.tpl) { const t = (templateFor(state, src).blocks || []).find((x) => x.id === b.tpl); if (t) at = windowTime(date, src, t.start); }
    /* (V11-3, C4: a placed meal centers on where it was put, kept on it as mealAt, so a push never moves its window) */
    if (at == null) at = b.add && b.mealAt != null ? windowTime(date, src, b.mealAt) : b.add && b.sourceStart != null ? windowTime(date, src, b.sourceStart) : b.start;
    return { lo: at - MEAL_WINDOW, hi: at + MEAL_WINDOW, at };
  }
  /* Put a hard block of length dur at start, sliding movable neighbors out of the way.
     Fixed blocks are walls. Tries pushing right, left, and splitting, and keeps whatever moves least.
     V11-2: a movable meal carries win ({ lo, hi, at }, mealWindow); meals: true is the person's yes */
  function pushInsert(movable, walls, n, lo, hi, rightOnly, meals) {
    const locked = (t) => t.fixed;
    const all = movable.concat(walls).slice().sort(byStart).map((t) => Object.assign({}, t));
    for (const w of walls) if (overlaps(w, n)) return { ok: false, reason: 'fixed', blocker: w };
    const center = n.start + n.dur / 2;
    const find = (fn) => { const k = all.findIndex(fn); return k < 0 ? all.length : k; };
    const splits = rightOnly
      ? [find((t) => t.start + t.dur > n.start)]
      : [find((t) => t.start + t.dur / 2 >= center), find((t) => t.start + t.dur > n.start), find((t) => t.start >= n.start + n.dur)];
    const tries = [];
    for (const k of Array.from(new Set(splits))) {
      const arr = all.map((t) => Object.assign({}, t));
      let ok = true, cur = n.start + n.dur;
      for (let i = k; i < arr.length && ok; i++) {
        const t = arr[i];
        if (t.start >= cur) break;
        if (locked(t)) { ok = false; break; }
        t.start = cur; cur = t.start + t.dur;
        if (cur > hi) ok = false;
      }
      cur = n.start;
      for (let i = k - 1; i >= 0 && ok; i--) {
        const t = arr[i];
        if (t.start + t.dur <= cur) break;
        if (locked(t)) { ok = false; break; }
        t.start = cur - t.dur; cur = t.start;
        if (cur < lo) ok = false;
      }
      if (!ok) continue;
      /* (a meal it moves further out than its window, if any: a way like that waits for a yes) */
      let out = null;
      arr.forEach((t, i) => {
        const w = t.win;
        if (out || !w || t.start === all[i].start) return;
        if ((t.start < w.lo || t.start > w.hi) && Math.abs(t.start - w.at) > Math.abs(all[i].start - w.at)) out = { t, from: all[i].start };
      });
      tries.push({ arr, out, moved: arr.reduce((a, t, i) => a + Math.abs(t.start - all[i].start), 0) });
    }
    if (!tries.length) return { ok: false, reason: 'full' };
    tries.sort((a, b) => a.moved - b.moved);
    const pushesOf = (tr) => tr.arr.map((t, i) => ({ base: t.sourceKey || t.base, start: t.start, dur: t.dur, sourceDate: t.sourceDate, sourceStart: t.sourceStart, delta: t.start - all[i].start, fixed: t.fixed })).filter((p) => !p.fixed && p.delta).map(({ fixed, ...p }) => p);
    const best = meals || mealsOk ? tries[0] : tries.find((x) => !x.out);
    if (!best) { const tr = tries[0], m = tr.out.t; return { ok: false, reason: 'meal', meal: { name: m.label || m.name, key: m.sourceKey || m.base, from: tr.out.from, to: m.start }, pushes: pushesOf(tr) }; }
    return { ok: true, pushes: pushesOf(best) };
  }

  /* Can a block of `dur` minutes go at `start` on `date`? `key` is its own base key when moving it.
     Returns { ok, start, pushes } where pushes are neighbors that slide to make room.
     V11-2: opts.meals: the person said yes to moving a meal out of its window (else reason 'meal', above) */
  function canPlace(state, date, dur, start, key, rightOnly, opts) {
    const windowStart = snap(start), at = dateTime(date, windowStart);
    if (!Number.isFinite(dur) || dur < STEP || dur > 1440) return { ok: false, reason: 'long', date: at.date, start: at.start };
    const day = resolveDay(state, at.date);
    const ordinary = at.start >= day.wake && at.start + dur <= day.bed;
    const lo = ordinary ? day.wake : 0, hi = ordinary ? day.bed : 2880;
    const own = (b) => b.sourceKey === key && b.sourceDate === date;
    const records = range(addDays(at.date, -7), 9).flatMap((d) => calendarRecords(state, d).map((b) => Object.assign({}, b, { start: windowTime(at.date, d, b.start) })));
    const walls = records.filter((b) => b.fixed && !b.sleep && !own(b) && b.start < hi && b.start + b.dur > lo);
    const seen = new Set(), movable = [];
    for (const piece of calendarLine(state, at.date)) {
      if (piece.fixed || piece.soft || piece.sleep || own(piece)) continue;
      const b = piece.add ? Object.assign({}, piece, { start: windowTime(at.date, piece.sourceDate, piece.sourceStart), dur: piece.sourceDur }) : piece;
      if (b.start >= hi || b.start + b.dur <= lo) continue;
      const identity = b.sourceDate + ':' + (b.add ? b.sourceKey : b.key);
      if (seen.has(identity)) continue;
      seen.add(identity);
      if (b.start + b.dur > hi) walls.push(Object.assign({}, b, { fixed: true }));
      else { const w = mealWindow(state, b, at.date); movable.push(w ? Object.assign({}, b, { win: w }) : b); }
    }
    const r = pushInsert(movable, walls, { start: at.start, dur }, lo, hi, rightOnly, !!(opts && opts.meals));
    /* (the meal it would move, said in its own date's minutes) */
    if (r.meal) { const f = dateTime(at.date, r.meal.from), t = dateTime(at.date, r.meal.to); Object.assign(r.meal, { fromDate: f.date, from: f.start, date: t.date, to: t.start }); }
    return Object.assign(r, { date: at.date, start: at.start, windowStart });
  }
  /* Pull a drop to a nearby edge so it doesn't leave a sliver of open time behind. */
  function magnet(state, date, start, dur, key) {
    const at = dateTime(date, start), day = calendarDay(state, at.date), origin = date;
    date = at.date;
    start = at.start;
    start = snap(start);
    const edges = [0, 1440];
    for (const b of day.blocks) if (!b.sleep && b.sourceKey !== key) edges.push(b.start, b.start + b.dur);
    let best = start, bestD = MIN_LEN + 1;
    for (const e of edges) {
      for (const s of [e, e - dur]) {
        const d = Math.abs(s - start);
        if (d > 0 && d <= MIN_LEN && d < bestD && s >= 0 && s + dur <= 1740) { best = s; bestD = d; }
      }
    }
    return windowTime(origin, date, best);
  }
  /* The earliest start on `date` where `dur` fits without moving anything hard. */
  function firstFit(state, date, dur, after) {
    const day = resolveDay(state, date);
    const hard = calendarDay(state, date).blocks.filter((b) => !b.soft && !b.sleep);
    const from = Math.max(day.wake, snap(after != null ? after : day.wake));
    for (let s = from; s + dur <= day.bed; s += STEP) {
      const n = { start: s, dur };
      if (hard.some((b) => overlaps(b, n))) continue;
      const fit = canPlace(state, date, dur, s);
      if (fit.ok && !(fit.pushes || []).length) return s;
    }
    for (let s = from; s + dur <= day.bed; s += STEP) if (canPlace(state, date, dur, s).ok) return s;
    return null;
  }

  function dateRec(state, date) {
    if (!state.dates[date]) state.dates[date] = {};
    return state.dates[date];
  }
  function applyPushes(state, date, pushes) {
    for (const p of pushes || []) {
      const owner = p.sourceDate || date, dd = dateRec(state, owner);
      const moved = p.sourceStart != null && Number.isFinite(p.delta) ? p.sourceStart + p.delta : windowTime(owner, date, p.start);
      if (p.base.startsWith('tpl:')) {
        dd.edits = dd.edits || {};
        const id = p.base.slice(4);
        dd.edits[id] = Object.assign({}, dd.edits[id], { start: moved, dur: p.dur });
      } else if (p.base.startsWith('add:')) {
        const a = (dd.adds || []).find((x) => x.id === p.base.slice(4));
        if (a) {
          const at = dateTime(owner, moved);
          a.start = at.start;
          if (at.date !== owner) { dd.adds = dd.adds.filter((x) => x !== a); const dest = dateRec(state, at.date); dest.adds = dest.adds || []; dest.adds.push(a); }
        }
      }
    }
  }
  /* Blocks on the board come in 15 minute steps, so a 5 minute step takes a 15 minute block. */
  const gridDur = (m) => Math.max(STEP, Math.ceil((m || STEP) / STEP) * STEP);
  /* Place a new block (from the tray) or move one already on the board. Mutates state. */
  function placeAdd(state, date, add, start, opts) {
    add = Object.assign({}, add, { dur: gridDur(add.dur) });
    const r = canPlace(state, date, add.dur, start, add.id ? 'add:' + add.id : null, false, opts);
    if (!r.ok) return r;
    applyPushes(state, r.date, r.pushes);
    const dd = dateRec(state, r.date);
    dd.adds = dd.adds || [];
    const a = Object.assign({}, add, { id: add.id || newId('a'), start: r.start });
    /* V11-3 (C4): a meal keeps where it was put, by hand (a move puts it here again), as the middle of its window */
    if (a.dinner || a.meal) a.mealAt = r.start; else delete a.mealAt;
    /* V11 goals: a step or a goal session someone puts on a day stays there when its plan is worked out
       again (the planners place theirs another way, unpinned) */
    if (pinnable(a) && add.pinned == null) a.pinned = true;
    dd.adds.push(a);
    return Object.assign(r, { add: a });
  }
  function findAdd(state, id) {
    for (const date of Object.keys(state.dates)) {
      const list = state.dates[date].adds || [];
      const a = list.find((x) => x.id === id);
      if (a) return { date, add: a };
    }
    return null;
  }
  function removeAdd(state, id) {
    const f = findAdd(state, id);
    if (!f) return null;
    const dd = state.dates[f.date];
    dd.adds = dd.adds.filter((x) => x.id !== id);
    return f;
  }
  /* V11 goals: a goal session or a to-do's step that someone places or moves by hand is pinned, so
     planning it again (planGoal, reflowTask) leaves it where they put it */
  const pinnable = (a) => !!(a && a.src && (a.src.type === 'goal' || a.src.type === 'step'));
  function moveAdd(state, id, date, start, opts) {
    const f = findAdd(state, id);
    if (!f) return { ok: false };
    const add = Object.assign({}, f.add);
    const before = clone(state.dates);
    removeAdd(state, id);
    const r = placeAdd(state, date, add, start, opts);
    if (!r.ok) state.dates = before;
    else if (pinnable(r.add)) r.add.pinned = true;
    return r;
  }
  /* Slide a template block (a routine) to a new start on its own date. */
  function moveTemplate(state, date, tplId, start, dur, opts) {
    const key = 'tpl:' + tplId, b = blockRecord(state, date, key);
    if (!b) return { ok: false };
    const d = dur || b.dur;
    const r = canPlace(state, date, d, start, key, false, opts);
    if (!r.ok) return r;
    applyPushes(state, r.date, r.pushes);
    const dd = dateRec(state, date);
    dd.edits = dd.edits || {};
    dd.edits[tplId] = Object.assign({}, dd.edits[tplId], { start: windowTime(date, r.date, r.start), dur: d });
    return r;
  }
  /* K17 (Kim, Oct 20): a routine that's flexible (soft, like Work that's yours to plan) moved or stretched on one day.
     It's the same per-day edit the block panel's Starts and Length make: a soft routine is the layer under everything
     else, so it pushes nothing, and what's set inside it (a locked pick up, a meeting, a block placed there) cuts it as
     always (free time too, from its panel). Anything that isn't soft is refused; start and dur are that date's minutes. */
  function slideSoft(state, date, tplId, start, dur) {
    const t = templateFor(state, date).blocks.find((x) => x.id === tplId);
    const b = t ? Object.assign({}, t, (((state.dates[date] || {}).edits) || {})[tplId]) : null;
    if (!b || !b.soft || b.fixed || b.gone || !Number.isFinite(start)) return { ok: false };
    const d = Math.max(MIN_LEN, snap(Number.isFinite(dur) ? dur : b.dur));
    const st = clamp(snap(start), RAIL0, RAIL1 - d);
    const dd = dateRec(state, date);
    dd.edits = dd.edits || {};
    dd.edits[tplId] = Object.assign({}, dd.edits[tplId], { start: st, dur: d });
    return { ok: true, date, start: st, dur: d, recordStart: st, pushes: [] };
  }
  /* Change a block's length from its start, pushing later blocks. Shrinks the ask until it fits. */
  function canResize(state, date, key, newDur, opts) {
    const b = blockRecord(state, date, key);
    if (!b) return { ok: false };
    newDur = Math.max(STEP, snap(newDur));
    for (let d = newDur; d >= STEP; d -= STEP) {
      const r = canPlace(state, date, d, b.start, key, true, opts);
      if (r.ok) return Object.assign(r, { dur: d, recordStart: b.start });
      if (d <= b.dur) break;
    }
    return { ok: false };
  }
  function resizeBlock(state, date, key, newDur, opts) {
    const r = canResize(state, date, key, newDur, opts);
    if (!r.ok) return r;
    applyPushes(state, r.date, r.pushes);
    const dd = dateRec(state, date);
    if (key.startsWith('tpl:')) {
      dd.edits = dd.edits || {};
      const id = key.slice(4);
      dd.edits[id] = Object.assign({}, dd.edits[id], { start: r.recordStart, dur: r.dur });
    } else if (key.startsWith('add:')) {
      const a = (dd.adds || []).find((x) => x.id === key.slice(4));
      if (a) { a.dur = r.dur; if (pinnable(a)) a.pinned = true; }
    }
    return r;
  }
  function setWake(state, date, wake) { dateRec(state, date).wake = clamp(snap(wake), RAIL0, 720); }
  function setBed(state, date, bed) { dateRec(state, date).bed = clamp(snap(bed), 1020, RAIL1); }

  /* == to do == */
  function placements(state) {
    const map = new Map();
    for (const date of Object.keys(state.dates)) {
      for (const a of state.dates[date].adds || []) {
        const s = a.src;
        if (!s || (s.type !== 'task' && s.type !== 'step')) continue;
        const id = s.type === 'task' ? s.id : s.task;
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ date, add: a, step: s.type === 'step' ? s.id : null });
      }
    }
    return map;
  }
  const taskDur = (t) => t.dur || (t.steps && t.steps.length ? t.steps.reduce((a, s) => a + (s.dur || 15), 0) : 30);
  /* Where a to do stands, one definition for the badge, the tray, the board, and the recap.
     done. open: no time anywhere. planned: every step still to do has a time that hasn't gone by
     (or the whole thing does). partial: some steps have a time and some don't. missed: its only times
     went by. With nowMin, a time earlier today that has ended counts as gone by.
     The deadline is its own fact, kept apart from the status: `ends` is the day the times it has would
     finish it (the whole thing's first time, or the last of its steps' first times), and `after` is
     true when that day comes after the day it's due. A to do can be planned and still late. */
  function taskPlan(t, where, today, nowMin) {
    const steps = t.steps || [];
    const open = steps.filter((s) => !s.done);
    /* V11: while steps are still open, a checked off step's time plans none of them, so it can't make the
       to-do missed (or partial). With every step checked, its times still count as before. */
    if (where && open.length && open.length < steps.length) where = where.filter((p) => !p.step || open.some((s) => s.id === p.step));
    const ahead = (where || []).filter((p) => windowTime(today, p.date, p.add.start) + p.add.dur > (nowMin == null ? 0 : nowMin));
    const whole = ahead.some((p) => !p.step);
    const timed = open.filter((s) => ahead.some((p) => p.step === s.id));
    const left = whole ? 0 : steps.length ? open.filter((s) => !timed.includes(s)).reduce((a, s) => a + (s.dur || 15), 0) : taskDur(t);
    let status;
    if (t.done) status = 'done';
    else if (!where || !where.length) status = 'open';
    else if (whole || (open.length && timed.length === open.length) || (!steps.length && ahead.length)) status = 'planned';
    else if (timed.length) status = 'partial';
    else if (ahead.length && !open.length) status = 'planned';
    else status = ahead.length ? 'partial' : 'missed';
    const first = (list) => list.reduce((a, p) => { const end = dateTime(p.date, p.add.start + p.add.dur - 1).date; return !a || end < a ? end : a; }, null);
    const ends = whole ? first(ahead.filter((p) => !p.step))
      : timed.length ? timed.map((s) => first(ahead.filter((p) => p.step === s.id))).reduce((a, d) => (d > a ? d : a), '')
      : first(ahead);
    const after = !t.done && !!t.due && !!ends && ends > t.due;
    return { status, ends: ends || null, after, steps: steps.length, open: open.length, timed: timed.length, left, next: ahead.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.add.start - b.add.start))[0] || null };
  }
  function taskStatus(t, where, today, nowMin) { return taskPlan(t, where, today, nowMin).status; }
  /* What's due by then and still needs attention: anything without all its times, and anything whose
     times come after the day it's due. */
  function dueSoon(state, today, days, nowMin) {
    const pl = placements(state);
    const limit = addDays(today, days == null ? 14 : days);
    return state.tasks
      .filter((t) => !t.done && !t.archived && t.due && t.due <= limit)
      .map((t) => { const p = taskPlan(t, pl.get(t.id), today, nowMin); return { task: t, status: p.status, plan: p }; })
      .filter((x) => x.status !== 'planned' || x.plan.after)
      .sort((a, b) => (a.task.due < b.task.due ? -1 : a.task.due > b.task.due ? 1 : 0));
  }
  /* The next date a repeating to do is due. weekdays skips Saturday and Sunday. */
  const REPEATS = ['daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'yearly'];
  function nextDue(due, repeat) {
    if (repeat === 'daily') return addDays(due, 1);
    if (repeat === 'weekdays') { let d = addDays(due, 1); while (weekday(d) === 0 || weekday(d) === 6) d = addDays(d, 1); return d; }
    if (repeat === 'weekly') return addDays(due, 7);
    if (repeat === 'biweekly') return addDays(due, 14);
    if (repeat === 'monthly') return addMonths(due, 1);
    if (repeat === 'yearly') return addMonths(due, 12);
    return null;
  }
  /* Mark a to do done. A repeating one makes its next copy. Given today, a copy that would already be
     late skips ahead to the first one on or after today, so a missed month doesn't pile up.
     skip: this one didn't happen and won't; the next copy still comes. Returns the new copy, if any. */
  function completeTask(state, id, today, skip) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t || t.done) return null;
    t.done = true;
    if (skip) t.skipped = true;
    if (!t.repeat || !t.due) return null;
    const nt = clone(t);
    nt.id = newId('t');
    nt.done = false;
    delete nt.skipped; delete nt.next;
    let due = nextDue(t.due, t.repeat);
    for (let k = 0; today && due && due < today && k < 1000; k++) due = nextDue(due, t.repeat);
    nt.due = due;
    /* (V11-2: a step's doneOn, the day it was checked, belongs to the copy that was done) */
    nt.steps = (t.steps || []).map((s) => { const c = Object.assign({}, s, { id: newId('s'), done: false }); delete c.doneOn; return c; });
    /* V11-2: the things inside the block (a packing list) come along, none of them ticked */
    if (Array.isArray(t.list)) nt.list = t.list.map((x) => Object.assign({}, x, { done: false }));
    /* V11 goals: the next copy spreads the same way, toward its own due date */
    if (nt.spread) { nt.spread = Object.assign({}, nt.spread); delete nt.spread.by; }
    state.tasks.push(nt);
    t.next = nt.id;
    return nt;
  }
  /* Undo a done mark. A repeat copy made by it goes away if nothing has happened to it yet. */
  function reopenTask(state, id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = false;
    delete t.skipped;
    if (t.next) {
      const nt = state.tasks.find((x) => x.id === t.next);
      const used = nt && (nt.done || (nt.steps || []).some((s) => s.done) || placements(state).has(nt.id));
      if (nt && !used) state.tasks = state.tasks.filter((x) => x.id !== nt.id);
      delete t.next;
    }
  }
  /* Steps a to-do might break into, at the medium size: [{ name, dur }] (V11 goals: breakdown, below) */
  function suggestSteps(name, Data) {
    return breakdown(name, { size: 'medium' }, Data).steps.map((s) => ({ name: s.name, dur: s.dur }));
  }

  /* == day recipes == */
  /* The earliest start in the part of the day an item prefers, using only open time and gaps. */
  function presetSlot(state, date, item) {
    const day = resolveDay(state, date);
    const parts = { morning: [day.wake, 720], afternoon: [720, 1080], evening: [1080, day.bed] };
    const order = [item.when || 'morning', 'afternoon', 'morning', 'evening'].filter((v, i, a) => a.indexOf(v) === i);
    const d = gridDur(item.dur);
    const usable = (b) => b.soft && (item.work ? b.cat === 'work' : b.cat === 'yours' || b.cat === 'open');
    for (const part of order) {
      const lo = Math.max(parts[part][0], day.wake), hi = Math.min(parts[part][1], day.bed);
      for (let s = Math.ceil(lo / STEP) * STEP; s + d <= hi; s += STEP) {
        const n = { start: s, dur: d };
        if (day.blocks.every((b) => !overlaps(b, n) || (!b.sleep && usable(b)))) return s;
      }
    }
    return null;
  }
  /* Try a day recipe on a date. The last recipe's blocks come off first, unless this one only adds.
     Returns how many of its blocks found room. */
  /* V11 goals: what a kind of day never takes off: to-dos and steps, goal sessions, Meal prep blocks,
     and a skipped session (a record that takes no time) */
  const KEEPS = ['task', 'step', 'goal', 'prep'];
  const keepsOnDay = (a) => !!a.skipped || !!(a.src && KEEPS.includes(a.src.type));
  /* opts (V11 goals): { today, nowMin }, so Take it easy leaves a goal's session that has already started */
  function applyPreset(state, date, preset, palette, opts) {
    const dd = dateRec(state, date);
    /* your usual puts the day back the way it goes most weeks; to dos and steps you gave a time stay,
       and so do goal sessions and Meal prep (kept counts the to-dos and steps, as before) */
    if (preset.usual) {
      const keep = (dd.adds || []).filter(keepsOnDay);
      delete dd.edits; delete dd.wake; delete dd.bed; delete dd.preset;
      if (keep.length) dd.adds = keep; else delete dd.adds;
      return { ok: true, placed: 0, kept: keep.filter((a) => a.src && (a.src.type === 'task' || a.src.type === 'step')).length };
    }
    /* a rough day: what isn't locked comes off except meals, and to dos placed today go back to the
       list, still due, so nothing is lost and nothing is asked of today. V11 goals: goal sessions come
       off too and go back to the plan (goals counts them); the planners leave an easy day alone. A
       session that has already started (opts.today and opts.nowMin) happened, so it stays */
    if (preset.easy) {
      const day = resolveDay(state, date), o = opts || {};
      const began = (a) => !!(o.today && a.src && a.src.type === 'goal' && (date < o.today || (date === o.today && a.start < (o.nowMin == null ? 0 : o.nowMin))));
      dd.edits = dd.edits || {};
      for (const b of day.blocks) if (b.tpl && !b.fixed && !b.sleep && b.cat !== 'meals' && !b.dinner) dd.edits[b.tpl] = { gone: true };
      const before = (dd.adds || []).length;
      const back = (dd.adds || []).filter((a) => a.src && (a.src.type === 'task' || a.src.type === 'step')).length;
      const goals = (dd.adds || []).filter((a) => !a.skipped && a.src && a.src.type === 'goal' && a.cat !== 'meals' && !began(a)).length;
      dd.adds = (dd.adds || []).filter((a) => a.dinner || a.cat === 'meals' || a.skipped || began(a));
      dd.preset = preset.id;
      return { ok: true, placed: 0, back, goals, off: before - dd.adds.length };
    }
    if (!preset.additive) dd.adds = (dd.adds || []).filter((a) => !(a.src && a.src.type === 'preset'));
    /* a blank slate, or a saved kind of day that starts from one: routines that aren't locked come off */
    if (preset.empty || preset.clear) {
      const day = resolveDay(state, date);
      dd.edits = dd.edits || {};
      for (const b of day.blocks) if (b.tpl && !b.fixed && !b.sleep) dd.edits[b.tpl] = { gone: true };
      dd.adds = (dd.adds || []).filter(keepsOnDay);
      if (preset.empty) { dd.preset = 'empty'; return { ok: true, placed: 0 }; }
    }
    let placed = 0;
    for (const it of preset.items || []) {
      const p = (palette || []).find((x) => x.id === it.p) || {};
      const item = { dur: it.dur || p.dur || 30, when: it.when, work: it.work };
      let s = null;
      if (it.start != null && canPlace(state, date, gridDur(item.dur), it.start).ok) s = it.start;
      if (s == null) s = presetSlot(state, date, item);
      if (s == null) continue;
      const r = placeAdd(state, date, Object.assign({ name: it.name || p.name || 'Block', cat: it.cat || p.cat || 'yours', icon: it.icon || p.icon || 'star', dur: item.dur, src: { type: 'preset', id: preset.id, block: it.p || null } }, it.dinner ? { dinner: true } : {}), s);
      if (r.ok) placed++;
    }
    if (!preset.additive) dd.preset = preset.id;
    return { ok: true, placed };
  }
  /* Turn what's placed on a date into a kind of day you can use again. opts.clear: the day started
     from a blank slate, so the kind clears routines too. */
  function presetFromDay(state, date, name, opts) {
    const clear = !!(opts && opts.clear);
    const dd = state.dates[date] || {};
    /* V11 goals: a goal session belongs to its goal, so a saved kind of day leaves it out */
    const items = (dd.adds || []).filter((a) => !a.skipped && !(a.src && (a.src.type === 'task' || a.src.type === 'step' || a.src.type === 'goal'))).sort((a, b) => a.start - b.start)
      .map((a) => Object.assign({ name: a.name, cat: a.cat, icon: a.icon, dur: a.dur, start: a.start, when: a.start < 720 ? 'morning' : a.start < 1080 ? 'afternoon' : 'evening', p: a.src && (a.src.block || (a.src.type === 'block' ? a.src.id : null)) }, a.dinner ? { dinner: true } : {}));
    const names = items.map((x) => x.name).slice(0, 3).join(', ');
    const line = clear ? (items.length ? 'A clear day with ' + names : 'A clear day. Only locked blocks stay') : names || 'Nothing placed yet';
    return Object.assign({ id: newId('pr'), name, icon: 'star', line, items, mine: true }, clear ? { clear: true } : {});
  }

  /* == dinners == */
  /* V11 goals: each line also says how many servings its meals make (serves, the meal and its linked
     leftovers, from servingsOf) and which meals those are (servings: [{ date, slot, serves }]). What
     counts as on the list, and so in the cart, is the same as before. */
  function groceries(state, dates) {
    const byId = new Map(state.pantry.map((p) => [p.id, p]));
    const out = new Map();
    const NOT = ['out', 'order', 'skip', 'leftovers'];
    const add = (ids, d, slot) => {
      for (const id of ids || []) {
        const p = byId.get(id);
        if (!p) continue;
        if (!out.has(id)) out.set(id, { id, name: p.name, kind: p.kind, days: [], serves: 0, servings: [] });
        const x = out.get(id);
        if (!x.days.includes(d)) x.days.push(d);
        if (!x.servings.some((s) => s.date === d && s.slot === slot)) { const n = servingsOf(state, d, slot); x.servings.push({ date: d, slot, serves: n }); x.serves += n; }
      }
    };
    for (const d of dates) {
      const dn = state.dinners[d];
      if (dn && !NOT.includes(dn.cook)) add(dn.items, d, 'dinner');
      /* breakfast and lunch, where a version plans them on the board too (state.meals) */
      const ml = state.meals && state.meals[d];
      if (ml) for (const k of ['breakfast', 'lunch']) { const m = ml[k]; if (m && typeof m === 'object' && !NOT.includes(m.how)) add(m.items, d, k); }
    }
    const order = { protein: 0, veg: 1, base: 2, extra: 3 };
    return Array.from(out.values()).sort((a, b) => ((order[a.kind] ?? 3) - (order[b.kind] ?? 3)) || a.name.localeCompare(b.name));
  }
  /* How far the shopping is: the list as it stands, and how many of those are checked. A check for
     something that left the list (a dinner changed) is kept, in case it comes back, and never counted. */
  function groceryProgress(state, dates) {
    const got = (state.shopping && state.shopping[weekStart(dates[0])]) || {};
    /* V11 (the rituals walk): things to get that aren't for a meal (milk, paper towels) are on the list too, kept
       with the week's checks (shopping[week].extra: [{ id, name }], an optional list older builds leave alone);
       each is checked off as 'x:' and its id */
    const extra = Array.isArray(got.extra) ? got.extra.filter((x) => x && x.id && x.name).map((x) => ({ id: 'x:' + x.id, name: x.name, kind: 'more', days: [], serves: 0, servings: [], extra: true })) : [];
    const list = groceries(state, dates).concat(extra);
    const n = list.filter((x) => got[x.id]).length;
    return { list, total: list.length, got: n, left: list.length - n };
  }
  function dinnerFromItems(state, items) {
    const rec = state.recipes.find((r) => r.items.length === items.length && r.items.every((i) => items.includes(i)));
    if (rec) return rec.name;
    const byId = new Map(state.pantry.map((p) => [p.id, p]));
    const names = items.map((i) => byId.get(i)).filter(Boolean).map((p, k) => (k ? p.name.toLowerCase() : p.name));
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  /* == looking ahead == */
  function upcoming(state, from, days) {
    const to = addDays(from, days - 1);
    const out = [];
    for (const d of range(from, days)) {
      for (const m of markersOn(state, d)) out.push({ date: d, kind: 'marker', name: m.name, icon: m.icon, id: m.id });
      for (const e of timedOn(state, d)) if (e.big) out.push({ date: d, kind: 'timed', name: e.name, icon: e.icon, id: e.id, start: e.start, big: true });
    }
    for (const e of liveEvents(state)) if (e.kind === 'trip' && e.end >= from && e.date <= to) out.push({ date: e.date < from ? from : e.date, kind: 'trip', name: e.name, icon: 'plane', id: e.id, end: e.end, start0: e.date });
    const pl = placements(state);
    for (const t of state.tasks) if (!t.done && t.due && t.due >= addDays(from, -30) && t.due <= to) { const p = taskPlan(t, pl.get(t.id), from); out.push({ date: t.due < from ? from : t.due, kind: 'due', name: t.name, icon: t.icon, id: t.id, due: t.due, status: p.status, after: p.after }); }
    const rank = { trip: 0, marker: 1, timed: 2, due: 3 };
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rank[a.kind] - rank[b.kind]));
  }

  /* == V11: getting ready ==
     Some dates need a head start: a gift before a birthday, gifts before a holiday that has them,
     booking before a trip. Each kind of getting ready says when to start (lead, days before the date)
     and when it should be done (by, days before). An event keeps its own list (ready: keys, or
     { k, lead, by }); one without a list gets what its kind and name suggest. What came of it is kept
     on the event, per date (prep: { 'gift@2026-10-21': a to-do's id, or 'skip' }), so a date that comes
     every year asks again next year.
     V11-2 (big moments, docs/BIG-MOMENTS.md): by is each one's last good day. More kinds: a heads-up for each
     person you'll see there (who: its entry names the person, and its prep key is k:who@date,
     'headsup:Aunt Lisa@2026-12-18'), hosting, a deadline, a move, and a fuzzy date's pick (fuzzy). Some come
     after the date (after: they start the day after its end, a trip's last day, and by counts days after it).
     msg: the step is a message the person sends; why: the line that says why it starts when it does, only where
     a kind has one. No line here ever names a price or a fee. */
  const READY = {
    gift: { name: 'A gift', short: 'Gift', todo: 'Gift for {x}', lead: 21, by: 3, icon: 'gift', cat: 'family', dur: 45 },
    gifts: { name: 'Gifts', short: 'Gifts', todo: 'Gifts for {x}', lead: 56, by: 10, icon: 'gift', cat: 'family', dur: 90 },
    plans: { name: 'Plans', short: 'Plans', todo: 'Plans for {x}', lead: 21, by: 7, icon: 'calendar', cat: 'family', dur: 30 },
    travel: { name: 'Booking travel', short: 'Booking', todo: 'Book travel for {x}', lead: 56, by: 28, icon: 'plane', cat: 'family', dur: 45 },
    pack: { name: 'Packing', short: 'Packing', todo: 'Pack for {x}', lead: 3, by: 1, icon: 'shirt', cat: 'home', dur: 45 },
    tickets: { name: 'Tickets', short: 'Tickets', todo: 'Tickets for {x}', lead: 28, by: 14, icon: 'film', cat: 'yours', dur: 15 },
    wear: { name: 'Something to wear', short: 'Something to wear', todo: 'Something to wear to {x}', lead: 21, by: 5, icon: 'shirt', cat: 'yours', dur: 60 },
    costume: { name: 'Costumes', short: 'Costumes', todo: 'Costumes for {x}', lead: 28, by: 5, icon: 'shirt', cat: 'family', dur: 60 },
    headsup: { name: 'A heads-up', short: 'Heads-up', todo: 'Give {who} a heads-up', lead: 42, by: 28, icon: 'chat', cat: 'family', dur: 5, msg: true, who: true, why: 'A month’s notice' },
    rsvp: { name: 'Your reply', short: 'Reply', todo: 'Reply to {x}', lead: 42, by: 28, icon: 'envelope', cat: 'family', dur: 5, msg: true },
    stay: { name: 'A place to stay', short: 'Stay', todo: 'Book a place to stay for {x}', lead: 56, by: 28, icon: 'bed', cat: 'family', dur: 30 },
    outfit: { name: 'The outfit', short: 'Outfit', todo: 'Get the outfit for {x}', lead: 56, by: 21, icon: 'shirt', cat: 'yours', dur: 60, why: 'Leaves time for tailoring and shipping' },
    timeoff: { name: 'Time off', short: 'Time off', todo: 'Ask for time off for {x}', lead: 42, by: 28, icon: 'laptop', cat: 'work', dur: 10, work: true },
    /* (V11-2: what a trip leaves behind that needs a person, {what} in plain words from those routines, coverOf) */
    cover: { name: 'Someone to cover', short: 'Who’s covering', todo: 'Line up who’s covering {what} while you’re away', lead: 28, by: 14, icon: 'people', cat: 'family', dur: 10, msg: true, cover: true, why: 'Someone needs time to say yes' },
    invites: { name: 'Invites', short: 'Invites', todo: 'Send the invites for {x}', lead: 35, by: 21, icon: 'envelope', cat: 'family', dur: 20, msg: true },
    food: { name: 'The food', short: 'Food', todo: 'Plan the food for {x}', lead: 14, by: 5, icon: 'pot', cat: 'meals', dur: 30 },
    shop: { name: 'Shopping', short: 'Shopping', todo: 'Shop for {x}', lead: 3, by: 1, icon: 'cart', cat: 'home', dur: 60 },
    tidy: { name: 'The place', short: 'The place', todo: 'Get the place ready for {x}', lead: 2, by: 1, icon: 'broom', cat: 'home', dur: 60 },
    papers: { name: 'What it needs', short: 'Papers', todo: 'Gather what {x} needs', lead: 28, by: 14, icon: 'note', cat: 'home', dur: 30 },
    finish: { name: 'Finishing', short: 'Finish', todo: 'Finish {x}', lead: 14, by: 3, icon: 'check', cat: 'home', dur: 60 },
    notice: { name: 'Notice', short: 'Notice', todo: 'Give notice for {x}', lead: 45, by: 30, icon: 'key', cat: 'home', dur: 15 },
    movers: { name: 'Movers', short: 'Movers', todo: 'Book movers for {x}', lead: 56, by: 42, icon: 'car', cat: 'home', dur: 30 },
    address: { name: 'Your address', short: 'Address', todo: 'Change your address for {x}', lead: 14, by: 7, icon: 'envelope', cat: 'home', dur: 20 },
    packup: { name: 'Packing up', short: 'Packing up', todo: 'Pack up for {x}, a little each day', lead: 21, by: 2, icon: 'box', cat: 'home', dur: 30, spread: true },
    pickdate: { name: 'The date', short: 'The date', todo: 'Pick the date for {x}', lead: 0, by: 0, icon: 'calendar', cat: 'yours', dur: 10, fuzzy: true },
    unpack: { name: 'Unpacking', short: 'Unpack', todo: 'Unpack after {x}', lead: 0, by: 1, icon: 'box', cat: 'home', dur: 45, after: true },
    groceries: { name: 'Groceries after', short: 'Groceries', todo: 'Groceries after {x}', lead: 0, by: 1, icon: 'cart', cat: 'meals', dur: 45, after: true, meals: true },
    thanks: { name: 'Thank-you notes', short: 'Thanks', todo: 'Thank-you notes for {x}', lead: 0, by: 14, icon: 'heart', cat: 'family', dur: 30, msg: true, after: true }
  };
  /* the kinds version 8 had: a to-do already on the list counts for them the way it always did */
  const READY8 = ['gift', 'gifts', 'plans', 'travel', 'pack', 'tickets', 'wear', 'costume'];
  /* what each kind of date can get ready for, in the order a panel offers them. V11-2: hosting, a deadline, and a
     move have lists of their own; a heads-up isn't in any, since it's one per person, added by name (addHeadsUp) */
  const READY_FOR = {
    marker: ['gift', 'plans'], trip: ['travel', 'stay', 'timeoff', 'pack', 'unpack', 'groceries'], timed: [],
    occasion: ['gift', 'rsvp', 'outfit', 'tickets', 'wear', 'travel', 'stay', 'timeoff'],
    host: ['invites', 'food', 'shop', 'tidy', 'thanks'], deadline: ['papers', 'finish'], move: ['notice', 'movers', 'address', 'packup', 'unpack']
  };
  /* a line about getting ready shows a little before it starts: as long again as it takes, up to three
     weeks (packing from six days out, gifts for a holiday from eleven weeks out) */
  const headsUp = (r) => Math.min(21, r.lead);
  /* V11: the person whose board it is, said the way a date would name them (Alex's birthday) */
  const ownName = (state) => String((state && state.profile && state.profile.name) || '').trim().toLowerCase();
  const lowName = (e) => String((e && e.name) || '').toLowerCase().replace(/’/g, '\'');
  /* V11-2: the household shapes the list. Time off only on a board with work in it (a routine at work in any kind of
     week, or a weekly meeting), and groceries after a trip only on a board that helps with meals (boardMeals: the
     dinners module isn't off, the way the app's useDinners reads it) */
  const boardMeals = (state) => !(state && state.settings && state.settings.modules && state.settings.modules.dinners === false);
  function boardWorks(state) {
    if (!state || !state.rhythm) return false;
    if ((state.meetings || []).length) return true;
    const sets = [state.rhythm.days || {}].concat(Object.values(state.rhythm.shapes || {}).map((sh) => (sh && sh.days) || {}));
    return sets.some((set) => Object.values(set).some((t) => !!t && (t.blocks || []).some((b) => b.cat === 'work')));
  }
  /* V11-2: a fuzzy date, sometime in spring: a window ({ from, to }) and no date yet */
  const isFuzzy = (e) => !!e && !e.date && !!e.window && !!e.window.from && !!e.window.to;
  const MOVE_WORDS = /\b(move|moving|movers|relocat\w*)\b/, DEADLINE_WORDS = /\b(deadline|tax|taxes|renew|renewal|application|applications|expires|expiry|registration)\b/;
  /* (by its name only on a day to remember, never a set time: a tax appointment isn't the deadline itself) */
  const byName = (e) => (e.kind || 'marker') === 'marker';
  const isMove = (e) => byName(e) && MOVE_WORDS.test(lowName(e));
  const isDeadline = (e) => !!e.deadline || (byName(e) && DEADLINE_WORDS.test(lowName(e)));
  /* what a date saved before version 9 gets ready for when it keeps no list of its own, as it always did */
  function readySuggest8(e, state) {
    const n = lowName(e);
    if (e.kind === 'trip') return ['travel', 'pack'];
    /* nobody needs a reminder to buy their own birthday gift, by any name */
    const me = ownName(state);
    if (e.kind === 'marker') return /^(your|my) birthday/.test(n) || (me && n.startsWith(me + '\'s birthday')) ? [] : /birthday/.test(n) || e.icon === 'cake' ? ['gift'] : /anniversary/.test(n) ? ['plans'] : [];
    if (e.kind === 'timed' && e.occasion) return /wedding|shower|party|birthday|graduation|retire/.test(n) ? ['gift'] : /concert|show|game|match|play|theat|festival|tickets/.test(n) ? ['tickets'] : [];
    return [];
  }
  /* V11-2: what a new date offers, so nobody has to think of it; the person takes off what doesn't apply. A trip:
     travel, a place to stay, time off, packing, and unpacking and groceries after (a heads-up for each person comes
     from the question that asks who). Hosting: invites, the food, shopping, the place, and thank-you notes after.
     Going to a wedding: the reply, the outfit, and the gift (four weeks out, done a week before); a party, a
     birthday, or a graduation: the gift and the reply; a show: tickets; out of town (away), travel, a place to stay,
     and time off too. A move: notice, movers, the address, packing up a little each day, and unpacking after. A
     deadline (taxes, a renewal, an application, or marked as one): what it needs, then finishing it. A fuzzy date
     picks its date first. No time off on a board without work. A trip or a date you travel to whose days leave
     something behind that needs a person (coverOf) lines up who's covering it, after time off. An entry is a key or
     { k, lead, by }. */
  function readySuggest(e, state) {
    const n = lowName(e), away = e.away ? ['travel', 'stay', 'timeoff'] : [];
    let out;
    if (e.kind === 'trip') out = ['travel', 'stay', 'timeoff', 'pack', 'unpack', 'groceries'];
    else if (e.host) out = ['invites', 'food', 'shop', 'tidy', 'thanks'];
    else if (e.kind === 'timed' && e.occasion) {
      out = (/wedding/.test(n) ? ['rsvp', 'outfit', { k: 'gift', lead: 28, by: 7 }]
        : /shower|party|birthday|graduation|retire/.test(n) ? ['gift', 'rsvp']
        : /concert|show|game|match|play|theat|festival|tickets/.test(n) ? ['tickets'] : []).concat(away);
    } else if (isMove(e)) out = ['notice', 'movers', 'address', 'packup', 'unpack'];
    else if (isDeadline(e)) out = ['papers', 'finish'];
    else out = readySuggest8(e, state).concat(away);
    /* who's covering, after time off, when the days away leave something behind that needs a person */
    if ((e.kind === 'trip' || e.away) && coverOf(state, e)) { const i = out.findIndex((r) => (typeof r === 'string' ? r : r.k) === 'timeoff'); out.splice(i >= 0 ? i + 1 : out.length, 0, 'cover'); }
    if (!boardWorks(state)) out = out.filter((r) => (typeof r === 'string' ? r : r.k) !== 'timeoff');
    if (!boardMeals(state)) out = out.filter((r) => !READY[typeof r === 'string' ? r : r.k].meals);
    return isFuzzy(e) ? ['pickdate'].concat(out) : out;
  }
  /* An event's own list, or with none kept, a suggestion. V11-2: a date being made (a draft, with no id yet) or one
     carrying a field only version 9 writes gets readySuggest's list; a date saved before keeps the list it always
     had, so Look ahead on an older board reads the same. A heads-up needs its person, once each; only a fuzzy date
     picks its date, and it does that first. */
  const V9_EVENT = ['window', 'host', 'away', 'deadline'];
  const freshEvent = (e) => !e.id || V9_EVENT.some((k) => e[k] != null && e[k] !== false);
  function readyList(e, state) {
    const fuzzy = isFuzzy(e), people = new Set();
    const raw = Array.isArray(e.ready) ? e.ready : freshEvent(e) ? readySuggest(e, state) : readySuggest8(e, state);
    const list = raw.map((r) => (typeof r === 'string' ? { k: r } : r)).filter((r) => {
      if (!r || !READY[r.k]) return false;
      if (r.k === 'pickdate') return fuzzy;
      if (!READY[r.k].who) return true;
      const who = String(r.who || '').trim().toLowerCase();
      if (!who || people.has(who)) return false;
      people.add(who);
      return true;
    });
    return fuzzy && !list.some((r) => r.k === 'pickdate') ? [{ k: 'pickdate' }].concat(list) : list;
  }
  /* the keys an event gets ready for, the ones it keeps or the ones it would be offered */
  const readyKeys = (e, state) => readyList(e, state).map((r) => r.k);
  /* V11-2: whether a kind belongs in a panel's choices for this board: time off only with work, groceries only where
     the board helps with meals, and never a heads-up (added by name), a fuzzy date's pick (it comes by itself), or who's
     covering (it comes when a trip leaves something behind, coverOf). READY_FOR[kind].filter((k) => readyFits(k, state)) */
  const readyFits = (k, state) => !!READY[k] && !READY[k].who && !READY[k].fuzzy && !READY[k].cover && (!READY[k].work || boardWorks(state)) && (!READY[k].meals || boardMeals(state));
  /* a holiday that begins at sundown is named for its beginning; what you get ready for is the holiday */
  const readyName = (e) => String(e.name || '').replace(/ begins$/, '');
  /* V11: a to-do already on the list for it counts: one that says what it is (a gift, packing) and
     names the date's person, place, or holiday, due between the day to start and the date. A holiday
     also takes one that says what it is and names no other date coming up (Family gifts before
     Christmas). Booking travel only asks until four weeks out; after that it's likely done. */
  const READY_WORDS = { gift: /\bgifts?\b|present/, gifts: /\bgifts?\b|present/, plans: /\bplan/, travel: /\bbook|flight|hotel|travel|train|ticket/, pack: /\bpack/, tickets: /ticket/, wear: /\bwear|outfit|dress|suit/, costume: /costume/,
    /* V11-2: the new kinds a person might have put on the list themselves (a heads-up, a pick, and what comes after
       count only when made for the date) */
    stay: /\b(hotel|airbnb|motel|lodging|place to stay)\b/, outfit: /\b(outfit|suit|dress|tux|tuxedo)\b/, rsvp: /\b(rsvp|reply)\b/, timeoff: /\b(time off|day off|days off|pto|vacation day)/,
    invites: /\binvit/, notice: /\bnotice\b/, movers: /\bmovers?\b/, address: /\baddress\b/ };
  /* (V11-2: a place to stay is booked like travel) */
  const READY_LATE = { travel: false, stay: false };
  const STOP = ['the', 'and', 'for', 'with', 'from', 'weekend', 'trip', 'visit', 'birthday', 'anniversary', 'begins', 'day', 'party', 'night'];
  const plainWords = (s) => String(s || '').toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.includes(w));
  function readyTask(state, e, r, on, start, others, cov) {
    /* (who's covering: a to-do that says so and names the trip or someone it's for, Find someone to check on Dad) */
    const words = r.k === 'cover' ? COVER_WORDS : READY_WORDS[r.k];
    if (!words) return null;
    const mine = plainWords(readyName(e)).concat(r.k === 'cover' && cov ? cov.people.map((n) => n.toLowerCase()) : []);
    /* (V11-2: a new kind never takes a to-do the date already keeps for another one) */
    const kept = READY8.includes(r.k) ? null : new Set(Object.values(e.prep || {}));
    const hit = state.tasks.filter((t) => !t.archived && t.due && t.due >= addDays(start, -14) && t.due <= on && words.test(String(t.name || '').toLowerCase()) && !(kept && kept.has(t.id))).find((t) => {
      const tw = plainWords(t.name);
      if (mine.some((w) => tw.includes(w))) return true;
      return !!(e.holiday || e.readyFrom) && !others.some((w) => tw.includes(w));
    });
    return hit || null;
  }
  /* a to-do's words: {x} the date's name, {who} the person, {what} what needs covering (coverOf) */
  const readyTodo = (R, e, r, cov) => R.todo.replace('{x}', readyName(e)).replace('{who}', String((r && r.who) || '').trim()).replace('{what}', cov ? cov.what : 'things at home');
  /* V11-2: each item also says who (a heads-up's person), why (or null), msg (it's a message to send), after (it
     comes after the date), place (where that person is, or null), and what (what a cover step covers, or null). A
     fuzzy date (on: null) counts from its window's first day: its pick is due early enough for the longest lead of
     what waits on it, and every other step waits (when: 'waiting'), with start and ideal counted from that first day. */
  /* (V11-3: only, a kind, works out that kind alone) */
  function readyFor(state, e, on, today, tasks, others, only) {
    const fuzzy = isFuzzy(e);
    if (!fuzzy && !on) return [];
    const list = readyList(e, state);
    const base = fuzzy ? e.window.from : on, end = fuzzy ? base : e.kind === 'trip' && e.end && e.end > on ? e.end : on;
    /* a date that has gone by gets ready for nothing (V11-2: but what comes after it, while it's due) */
    if (!fuzzy && on < today && !list.some((r) => READY[r.k].after)) return [];
    tasks = tasks || new Map(state.tasks.map((t) => [t.id, t]));
    const longest = list.reduce((m, r) => (READY[r.k].after || READY[r.k].fuzzy ? m : Math.max(m, r.lead != null ? r.lead : READY[r.k].lead)), 0);
    const pickBy = addDays(base, -(longest || 14));
    const out = [];
    for (const r of list) {
      if (only && r.k !== only) continue;
      const R = READY[r.k], after = !!R.after;
      if (!fuzzy && on < today && !after) continue;
      const lead = r.lead != null ? r.lead : R.lead, by = r.by != null ? r.by : R.by;
      const who = R.who ? String(r.who).trim() : null;
      const key = r.k + (who ? ':' + who : '') + '@' + base, got = e.prep && e.prep[key];
      const start = R.fuzzy ? (pickBy < today ? pickBy : today) : after ? addDays(end, 1) : addDays(base, -lead);
      const ideal = R.fuzzy ? pickBy : after ? addDays(end, by) : addDays(base, -by);
      /* (who's covering asks only while the days away leave something behind: the kids going too, or new days with
         nothing on them, and it waits unasked, unless its to-do is already made) */
      const cov = R.cover && !fuzzy ? coverOf(state, e) : null;
      const task = got && got !== 'skip' ? tasks.get(got) || null : !got && !fuzzy && !after ? readyTask(state, e, r, on, start, others || [], cov) : null;
      if (R.cover && !cov && !task) continue;
      /* a to-do made for it is due by the day it should be done; if that's gone by, before the date (after the date,
         or for a pick: today) */
      const due = after || fuzzy ? (ideal >= today ? ideal : today) : ideal >= today ? ideal : addDays(on, -1) >= today ? addDays(on, -1) : today;
      /* well past when it should be done (booking a trip that's days away), it's likely handled: gone */
      const late = READY_LATE[r.k] !== false;
      const when = task ? (task.done ? 'done' : 'added') : got === 'skip' ? 'skip'
        : fuzzy ? (R.fuzzy ? (today <= ideal ? 'now' : 'soon') : 'waiting')
        : today < start ? 'later' : today <= ideal ? 'now' : after || !late || diffDays(today, on) < Math.ceil(by / 2) ? 'past' : 'soon';
      out.push({ k: r.k, key, name: R.name, short: R.short, todo: readyTodo(R, e, r, cov), icon: R.icon, cat: R.cat, dur: R.dur, lead, by, start, ideal, due, when, task, on, who, why: R.why || null, msg: !!R.msg, after, place: (r.place && String(r.place).trim()) || null, what: cov ? cov.what : null });
    }
    return out;
  }
  /* The dates coming up, each with what to get ready and when. Everything in the days from `from`, and
     past them (up to farDays) only what needs a head start now or soon (headsUp): Christmas shows
     up when it's time to think about gifts, not in June. The dates you added in this reset (keep, an id
     or a list of them) show either way, each once, at its first date. A far date whose to-do is on the
     list stays, saying so, until it's done. */
  function lookAhead(state, from, days, today, farDays, keep) {
    const to = addDays(from, days - 1), farTo = addDays(from, Math.max(days, farDays || 182) - 1);
    const tasks = new Map(state.tasks.map((t) => [t.id, t]));
    const keeps = [].concat(keep || []);
    const out = [];
    /* the words that name each date, so a to-do for one isn't taken for another's */
    const named = liveEvents(state).filter((e) => e.kind === 'marker' || e.kind === 'trip' || e.big || e.occasion || e.host).map((e) => ({ id: e.id, words: plainWords(readyName(e)) }));
    const othersOf = (e) => named.filter((x) => x.id !== e.id).reduce((a, x) => a.concat(x.words), []);
    /* (V11-2) mode 'after': a date that went by, shown only while something after it is due; 'fuzzy': a date with no
       day yet, shown under its window. A step that waits on a fuzzy date's pick isn't listed until it has a day */
    const push = (e, on, extra, mode) => {
      const all = readyFor(state, e, on, today, tasks, othersOf(e));
      const at = mode === 'fuzzy' ? e.window.from : on;
      const far = at > to, near = (r) => diffDays(today, r.start) <= headsUp(r);
      const ready = all.filter((r) => r.when !== 'skip' && r.when !== 'past' && r.when !== 'waiting' && (r.when !== 'later' || near(r)) && (!far || (r.when !== 'done' && (r.when !== 'added' || near(r)))));
      if (mode === 'after' && !ready.some((r) => r.after && r.when !== 'done')) return;
      if (far && !ready.length && !(keeps.includes(e.id) && !out.some((x) => x.id === e.id))) return;
      out.push(Object.assign({ date: at, kind: e.kind, name: e.name, icon: e.icon || (e.kind === 'trip' ? 'plane' : 'star'), id: e.id, holiday: e.holiday || e.readyFrom || null, occasion: !!e.occasion, yearly: !!e.yearly, off: !!e.off, ready, far }, extra || {}));
    };
    for (const d of range(from, diffDays(from, farTo) + 1)) {
      for (const m of markersOn(state, d)) push(m, d);
      for (const e of timedOn(state, d)) if (e.big || e.occasion || e.host) push(e, d, { start: e.start, dur: e.dur });
    }
    for (const e of liveEvents(state)) if (e.kind === 'trip' && e.end >= from && e.date <= farTo) push(e, e.date, { end: e.end, shown: e.date < from ? from : e.date });
    /* V11-2: the two weeks before `from`, for what comes after a date (unpacking, thank-you notes); shown at `from` */
    for (const d of range(addDays(from, -15), 15)) {
      for (const m of markersOn(state, d)) push(m, d, { shown: from, over: true }, 'after');
      for (const e of timedOn(state, d)) if (e.big || e.occasion || e.host) push(e, d, { start: e.start, dur: e.dur, shown: from, over: true }, 'after');
    }
    for (const e of liveEvents(state)) if (e.kind === 'trip' && e.date && e.end && e.end < from && e.end >= addDays(from, -15)) push(e, e.date, { end: e.end, shown: from, over: true }, 'after');
    /* V11-2: a fuzzy date shows under its window (window, fuzzy), asking for its date */
    for (const e of liveEvents(state)) if (isFuzzy(e)) push(e, null, { window: { from: e.window.from, to: e.window.to }, fuzzy: true, shown: e.window.from < from ? from : e.window.from }, 'fuzzy');
    const rank = { trip: 0, marker: 1, timed: 2 };
    const at = (x) => x.shown || x.date;
    return out.sort((a, b) => (at(a) < at(b) ? -1 : at(a) > at(b) ? 1 : rank[a.kind] - rank[b.kind]));
  }
  /* The events a kept holiday puts on the board: one every year for a date the calendar fixes, and one
     for each listed date from a week ago on for the rest. A date that already has a day to remember by
     the same name (a Christmas you added yourself) keeps yours and gets no second one; holidayTwins
     finds those, so yours can take the holiday's getting ready. */
  const holNorm = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/\s*\(us\)$/, '').replace(/ begins$/, '').trim();
  function holidayDates(h, today) {
    if (!h.md) return (h.dates || []).filter((d) => d >= addDays(today, -7));
    const y = +today.slice(0, 4);
    return [y + '-' + h.md >= today ? y + '-' + h.md : (y + 1) + '-' + h.md];
  }
  /* V11: what a holiday gets ready for; with kids at home some get ready for something else (costumes at Halloween) */
  function holidayReady(state, h) {
    const kids = !!(state.profile && Array.isArray(state.profile.kids) && state.profile.kids.length);
    return ((kids && h.kids) || h.ready || []).map((r) => Object.assign({}, r));
  }
  function holidayTwins(state, h, today) {
    const names = [holNorm(h.name), holNorm(h.title)], out = [];
    for (const d of holidayDates(h, today)) for (const m of markersOn(state, d)) if (!m.holiday && names.includes(holNorm(m.name)) && !out.includes(m)) out.push(m);
    return out;
  }
  function holidayEvents(state, h, today) {
    const twins = holidayTwins(state, h, today);
    const dup = (date) => markersOn(state, date).some((m) => twins.includes(m));
    const base = () => ({ kind: 'marker', name: h.title || h.name, icon: h.icon || 'star', holiday: h.id, ready: holidayReady(state, h) });
    const out = holidayDates(h, today).filter((d) => !dup(d)).map((d) => Object.assign({ id: 'hol-' + h.id + (h.md ? '' : '-' + d.slice(0, 4)), date: d }, h.md ? { yearly: true } : {}, base()));
    /* V11: your own Christmas this year that doesn't repeat keeps this year; the holiday covers the next three */
    if (h.md && !out.length && twins.length && !twins.some((m) => m.yearly)) {
      const y = +holidayDates(h, today)[0].slice(0, 4);
      for (let k = 1; k <= 3; k++) out.push(Object.assign({ id: 'hol-' + h.id + '-' + (y + k), date: (y + k) + '-' + h.md }, base()));
    }
    return out;
  }

  /* A small summary of one date, for the month and year views. */
  function dayCard(state, date, day) {
    day = day || resolveDay(state, date);
    const t = totals(day);
    const flags = [];
    if (day.trip) flags.push({ kind: 'trip', name: day.trip.name, icon: 'plane' });
    for (const m of day.markers) flags.push({ kind: 'marker', name: m.name, icon: m.icon });
    for (const e of timedOn(state, date)) if (e.big) flags.push({ kind: 'timed', name: e.name + ', ' + clock(e.start), icon: e.icon });
    const pl = [];
    for (const b of day.blocks) if (b.add && b.src && (b.src.type === 'task' || b.src.type === 'step')) pl.push(b.name);
    return { date, day, yours: t.yours || 0, flags, due: day.due.map((x) => x.name), tasks: pl, dinner: state.dinners[date] ? state.dinners[date].name : '' };
  }

  /* == clashes and room == */
  /* Two real commitments at the same time: locked routines, set times, weekly meetings, and calendar
     events, as they were asked for, before the board fits them onto one rail. The board still shows
     one plan; this keeps both commitments in view. */
  function clashes(state, date) {
    const records = range(addDays(date, -7), 8).flatMap((owner) => calendarRecords(state, owner)
      .filter((b) => b.fixed && !b.sleep)
      .map((b) => ({ key: owner + ':' + b.sourceKey, name: b.name, start: windowTime(date, owner, b.sourceStart), dur: b.sourceDur, cal: b.cal || null })));
    const hard = clip(records, 0, 1440, 1);
    hard.sort(byStart);
    const out = [];
    for (let i = 0; i < hard.length; i++) for (let j = i + 1; j < hard.length; j++) {
      const a = hard[i], b = hard[j];
      if (b.start >= a.start + a.dur) break;
      if (overlaps(a, b)) out.push({ date, a, b, start: Math.max(a.start, b.start), end: Math.min(a.start + a.dur, b.start + b.dur) });
    }
    return out;
  }
  function clashesIn(state, from, days) {
    let out = [];
    for (const d of range(from, days)) out = out.concat(clashes(state, d));
    return out;
  }
  /* How much flexible time is left in some days (open time and gaps, from now on) against the minutes
     of to dos due by then that don't have a time yet. Free time kept on purpose doesn't count as room.
     V11 goals: goals is the time a goal's own sessions hold in those days, which a to-do can take (the
     goal plans it again), so a screen can say both: 5.5 h open, and 10 h a goal would give. */
  function capacity(state, from, days, today, nowMin) {
    let room = 0, goals = 0;
    for (const d of range(from, days)) {
      if (d < today) continue;
      const day = calendarDay(state, d), cut = d === today && nowMin != null ? nowMin : -1;
      const add = (a, b) => { const s0 = Math.max(a, cut); if (b > s0) room += b - s0; };
      for (const g of gaps(day)) add(g[0], g[1]);
      for (const b of day.blocks) if (b.soft && !b.free && (b.cat === 'yours' || b.cat === 'open')) add(b.start, b.start + b.dur);
      goals += yieldable(state, d, today, nowMin || 0).reduce((a, x) => a + x.dur, 0);
    }
    const to = addDays(from, days - 1);
    const pl = placements(state);
    let need = 0;
    for (const t of state.tasks) if (!t.done && !t.archived && t.due && t.due <= to) need += taskPlan(t, pl.get(t.id), today, nowMin).left;
    return { room, need, goals };
  }

  /* == reading a calendar file (.ics) ==
     Google, Outlook, Apple, a court or a school all export this format. Returns the calendar's name and
     every occurrence between from and to: { name, date, start, dur, allDay }. Repeats (daily, weekly with
     days, monthly, yearly) are spelled out; exceptions are skipped. Times in UTC become local times. */
  /* A wall clock time in a named zone, as an instant. Overflow reaches the next calendar date;
     repeated times use the earlier instant, and a skipped time moves forward by the clock change.
     Null when the zone's name means nothing to this machine. */
  function zoneToUtc(tz, y, mo, d, h, mi) {
    try {
      const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const n = dateTime(iso(y, mo, d), Number(h) * 60 + Number(mi)), p = parts(n.date);
      const wall = Date.UTC(p.y, p.m - 1, p.d, Math.floor(n.start / 60), n.start % 60);
      const seenAt = (t) => { const q = Object.fromEntries(f.formatToParts(new Date(t)).map((x) => [x.type, x.value])); return Date.UTC(+q.year, +q.month - 1, +q.day, +q.hour % 24, +q.minute); };
      const offsets = new Set([-36, 0, 36].map((hours) => { const t = wall + hours * 3600000; return seenAt(t) - t; }));
      const candidates = Array.from(offsets, (offset) => { const t = wall - offset; return { t, seen: seenAt(t) }; });
      const matching = candidates.filter((c) => c.seen === wall).sort((a, b) => a.t - b.t);
      if (matching.length) return new Date(matching[0].t);
      const later = candidates.filter((c) => c.seen > wall).sort((a, b) => a.seen - b.seen || a.t - b.t);
      return later.length ? new Date(later[0].t) : null;
    } catch (e) { return null; }
  }
  /* An instant as a date and a minute of the day in a named zone; in this machine's own zone when
     no zone is given or the name means nothing here. */
  function inZone(date, tz) {
    if (tz) {
      try {
        const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const q = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
        return { date: q.year + '-' + q.month + '-' + q.day, min: (+q.hour % 24) * 60 + +q.minute };
      } catch (e) { /* fall through to the machine's own zone */ }
    }
    return { date: todayIso(date), min: date.getHours() * 60 + date.getMinutes() };
  }
  /* opts: { tz }, the board's home time zone. Times in the file that name a zone, or are in UTC, are
     read as that instant and written down in the home zone, whatever zone the device reading the
     file happens to be in. */
  function parseIcs(text, from, to, cap, opts) {
    cap = cap || 800;
    const home = opts && opts.tz;
    const lines = String(text || '').replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const unesc = (v) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
    let calName = '', cur = null;
    const raw = [];
    for (const ln of lines) {
      if (ln === 'BEGIN:VEVENT') { cur = {}; continue; }
      if (ln === 'END:VEVENT') { if (cur) raw.push(cur); cur = null; continue; }
      const i = ln.indexOf(':');
      if (i < 0) continue;
      const parts = ln.slice(0, i).split(';'), key = parts[0].toUpperCase(), val = ln.slice(i + 1);
      if (!cur) { if (key === 'X-WR-CALNAME') calName = unesc(val); continue; }
      const tz = parts.slice(1).find((x) => /^TZID=/i.test(x));
      /* dates taken out of a repeating event: each is read like any other time in the file */
      if (key === 'EXDATE') { val.split(',').forEach((x) => (cur.ex = cur.ex || []).push({ val: x, params: parts.slice(1).map((y) => y.toUpperCase()), rawTz: tz ? tz.slice(5).replace(/^"|"$/g, '') : null })); continue; }
      cur[key] = { val, params: parts.slice(1).map((x) => x.toUpperCase()), rawTz: tz ? tz.slice(5).replace(/^"|"$/g, '') : null };
    }
    const stamp = (p) => {
      if (!p) return null;
      const v = p.val.trim(), m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
      if (!m) return null;
      if (!m[4] || p.params.includes('VALUE=DATE')) return { date: m[1] + '-' + m[2] + '-' + m[3], min: null };
      const tzp = p.params.find((x) => x.startsWith('TZID='));
      const d = m[7] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : tzp ? zoneToUtc(p.rawTz || tzp.slice(5), +m[1], +m[2], +m[3], +m[4], +m[5]) : null;
      if (d) return inZone(d, home);
      return { date: m[1] + '-' + m[2] + '-' + m[3], min: +m[4] * 60 + +m[5] };
    };
    const durOf = (v) => { const m = /P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(v || ''); return m ? ((+m[1] || 0) * 7 * 1440 + (+m[2] || 0) * 1440 + (+m[3] || 0) * 60 + (+m[4] || 0)) : 0; };
    const DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    const out = [];
    let more = false;
    /* a moved or cancelled occurrence replaces its date in the repeating event it belongs to */
    const moved = new Map();
    raw.forEach((ev) => { if (ev['RECURRENCE-ID'] && ev.UID) { const r = stamp(ev['RECURRENCE-ID']); if (r) { const k = ev.UID.val; if (!moved.has(k)) moved.set(k, new Set()); moved.get(k).add(r.date); } } });
    for (const ev of raw) {
      if (ev.STATUS && /CANCELLED/i.test(ev.STATUS.val)) continue;
      const st = stamp(ev.DTSTART);
      if (!st) continue;
      const name = ev.SUMMARY ? unesc(ev.SUMMARY.val) || 'Event' : 'Event';
      const allDay = st.min == null;
      let dur = 60;
      if (!allDay) {
        const en = stamp(ev.DTEND);
        if (en && en.min != null) dur = diffDays(st.date, en.date) * 1440 + en.min - st.min;
        else if (ev.DURATION) dur = durOf(ev.DURATION.val);
        dur = Math.max(15, Math.min(Number.isFinite(dur) ? dur : 60, 7 * 1440));
      }
      const ex = new Set((ev.ex || []).map((x) => { const r = stamp(x); return r ? r.date : ''; }));
      if (!ev['RECURRENCE-ID'] && ev.UID && moved.has(ev.UID.val)) moved.get(ev.UID.val).forEach((d) => ex.add(d));
      /* an all day event that runs several days marks each of them, up to two weeks */
      let span = 1;
      if (allDay && ev.DTEND) { const en = stamp(ev.DTEND); if (en) span = Math.max(1, Math.min(14, diffDays(st.date, en.date))); }
      const add = (date) => {
        for (let i = 0; i < span; i++) {
          const d = i ? addDays(date, i) : date;
          if (d < from || d > to || ex.has(date)) continue;
          if (out.length >= cap) { more = true; return; }
          out.push({ name, date: d, start: allDay ? null : st.min, dur: allDay ? null : dur, allDay });
        }
      };
      const rule = ev.RRULE ? Object.fromEntries(ev.RRULE.val.split(';').map((kv) => kv.split('=')).map(([k, v]) => [k.toUpperCase(), v])) : null;
      if (!rule) { add(st.date); continue; }
      const every = Math.max(1, +rule.INTERVAL || 1), count = rule.COUNT ? +rule.COUNT : Infinity;
      const until = rule.UNTIL ? rule.UNTIL.slice(0, 4) + '-' + rule.UNTIL.slice(4, 6) + '-' + rule.UNTIL.slice(6, 8) : '9999-12-31';
      let n = 0;
      const take = (date) => { if (date < st.date || date > until || n >= count) return false; n++; add(date); return true; };
      if (rule.FREQ === 'WEEKLY') {
        const by = (rule.BYDAY ? rule.BYDAY.split(',').map((x) => DAYS[x.slice(-2)]).filter((x) => x != null) : [weekday(st.date)]).sort();
        for (let w = sundayOf(st.date); w <= to && w <= until && n < count && out.length < cap; w = addDays(w, 7 * every)) by.forEach((d) => take(addDays(w, d)));
      } else if (rule.FREQ === 'DAILY') {
        for (let d = st.date; d <= to && d <= until && n < count && out.length < cap; d = addDays(d, every)) take(d);
      } else if (rule.FREQ === 'MONTHLY' || rule.FREQ === 'YEARLY') {
        const step = rule.FREQ === 'MONTHLY' ? every : every * 12;
        /* "the first Monday", "the last Friday", "the 15th and the 30th": which days of each month it
           falls on. With none of those said, it repeats on its own day number. */
        const ords = (rule.BYDAY || '').split(',').map((x) => /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x.trim().toUpperCase())).filter(Boolean).map((m) => ({ n: m[1] ? +m[1] : 0, wd: DAYS[m[2]] }));
        const mdays = (rule.BYMONTHDAY || '').split(',').map((x) => +x).filter((x) => x && Math.abs(x) <= 31);
        const p0 = parts(st.date);
        if (ords.length || mdays.length) {
          for (let k = 0; k < 600 && n < count && out.length < cap; k++) {
            const ms = addMonths(iso(p0.y, p0.m, 1), k * step);
            if (ms > to || ms > until) break;
            const pm = parts(ms), len = daysInMonth(pm.y, pm.m), days = new Set();
            mdays.forEach((x) => { const dd = x > 0 ? x : len + 1 + x; if (dd >= 1 && dd <= len) days.add(dd); });
            ords.forEach((o) => {
              const hits = [];
              for (let dd = 1; dd <= len; dd++) if (weekday(iso(pm.y, pm.m, dd)) === o.wd) hits.push(dd);
              if (!o.n) hits.forEach((dd) => days.add(dd));
              else { const dd = o.n > 0 ? hits[o.n - 1] : hits[hits.length + o.n]; if (dd) days.add(dd); }
            });
            Array.from(days).sort((a, b) => a - b).forEach((dd) => take(iso(pm.y, pm.m, dd)));
          }
        } else {
          for (let k = 0, d = st.date; d <= to && d <= until && n < count && k < 600 && out.length < cap; k++, d = addMonths(st.date, k * step)) take(d);
        }
      } else add(st.date);
    }
    out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start || 0) - (b.start || 0)));
    return { name: calName, items: out, more };
  }

  /* == where you are in the day == */
  /* What's happening at minute `min`: the block you're in, the open time you're in, or sleep,
     with when it ends and what comes next. Free time counts as open time. */
  function nowInfo(day, min) {
    const awake = day.blocks.filter((b) => !b.sleep);
    if (day.calendar) {
      const sleep = day.blocks.find((b) => b.sleep && b.start <= min && min < b.start + b.dur);
      if (sleep) { const next = awake.find((b) => b.start >= sleep.start + sleep.dur) || null; return { kind: 'sleep', until: next ? sleep.start + sleep.dur : null, next }; }
    }
    if (min < day.wake) return { kind: 'sleep', until: day.wake, next: awake[0] || null };
    if (min >= day.bed) return { kind: 'sleep', until: null, next: null };
    const cur = awake.find((b) => b.start <= min && min < b.start + b.dur);
    const nextAfter = (t) => awake.find((b) => b.start >= t && !b.free) || null;
    if (cur && !cur.free) {
      const end = cur.start + cur.dur;
      return { kind: 'block', block: cur, start: cur.start, end, left: end - min, next: nextAfter(end) };
    }
    const prev = awake.filter((b) => b.start + b.dur <= min && !b.free).pop();
    const start = prev ? prev.start + prev.dur : day.wake;
    const nx = nextAfter(min);
    const end = nx ? nx.start : day.bed;
    return { kind: cur ? 'free' : 'open', block: cur || null, start, end, left: end - min, next: nx };
  }
  /* The saved start and length of a routine or a placed block on one date (not its visible pieces). */
  function blockRecord(state, date, key) {
    const dd = state.dates[date] || {};
    if (key.startsWith('add:')) { const a = (dd.adds || []).find((x) => x.id === key.slice(4)); return a ? { start: a.start, dur: a.dur } : null; }
    if (!key.startsWith('tpl:')) return null;
    const id = key.slice(4), b = templateFor(state, date).blocks.find((x) => x.id === id);
    return b ? Object.assign({ start: b.start, dur: b.dur }, (dd.edits || {})[id]) : null;
  }
  function setRecord(state, date, key, patch) {
    const dd = dateRec(state, date);
    if (key.startsWith('add:')) { const a = (dd.adds || []).find((x) => x.id === key.slice(4)); if (a) Object.assign(a, patch); return; }
    dd.edits = dd.edits || {};
    const id = key.slice(4);
    dd.edits[id] = Object.assign({}, dd.edits[id], patch);
  }
  /* Done early: the block ends at the last quarter hour before `min`, and the rest is open time.
     Your own blocks and routines can end early; meetings and events keep their time. A block that
     something cut in two can't end early from its first stretch: that would take the later one too. */
  /* V11 (opts.now, the Today walk): Done from the first minute. The block ends now, rounded up to the next
     quarter hour and never back to before now (at 7:40 a run ends at 7:45), and it keeps at least a quarter
     hour; in its last five minutes, or when the next quarter hour is its end anyway, it keeps its end (keep:
     true) and nothing on the board changes. back is only the time it gives back. */
  function previewEndEarly(state, date, key, min, opts) {
    const rec = blockRecord(state, date, key);
    if (!rec) return { ok: false };
    const pieces = calendarLine(state, date).filter((b) => b.sourceDate === date && b.sourceKey === key);
    const cur = pieces.find((b) => b.start <= min && min < b.start + b.dur);
    if (cur && pieces.some((b) => b.start >= cur.start + cur.dur)) return { ok: false, reason: 'continues' };
    if (opts && opts.now) {
      const stop = rec.start + rec.dur;
      if (min < rec.start) return { ok: false, reason: 'ahead' };
      if (min >= stop) return { ok: false, reason: 'over' };
      const end = Math.max(rec.start + STEP, Math.ceil(min / STEP) * STEP);
      if (stop - min <= 5 || end >= stop) return { ok: true, keep: true, end: stop, back: 0, rec };
      return { ok: true, end, back: stop - end, rec };
    }
    const end = Math.floor(min / STEP) * STEP;
    if (end - rec.start < STEP || end >= rec.start + rec.dur) return { ok: false, reason: 'short' };
    return { ok: true, end, back: rec.start + rec.dur - end, rec };
  }
  function endEarly(state, date, key, min, opts) {
    const r = previewEndEarly(state, date, key, min, opts);
    if (r.ok && !r.keep) setRecord(state, date, key, { start: r.rec.start, dur: r.end - r.rec.start });
    return r;
  }
  /* A few more minutes of the block you're in: the stretch you're in (at minute `min`) runs `mins`
     longer and whatever comes next slides later. Locked things don't move, so if one is right after,
     it can't. */
  function previewExtend(state, date, key, mins, min) {
    const rec = blockRecord(state, date, key);
    const day = resolveDay(state, date);
    const line = calendarLine(state, date);
    const own = (b) => b.sourceDate === date && b.sourceKey === key;
    const pieces = line.filter(own);
    if (!rec || !pieces.length) return { ok: false };
    const cur = (min != null && pieces.find((b) => b.start <= min && min < b.start + b.dur)) || pieces[pieces.length - 1];
    const end = cur.start + cur.dur;
    const ordinary = rec.start >= day.wake && rec.start + rec.dur <= day.bed;
    const lo = ordinary ? day.wake : 0, hi = ordinary ? day.bed : 2880;
    if (end + mins > hi) return { ok: false, reason: 'late' };
    const others = line.filter((b) => !b.sleep && !own(b) && b.start >= lo && b.start + b.dur <= hi);
    const walls = range(addDays(date, -7), 9).flatMap((owner) => calendarRecords(state, owner).map((b) => Object.assign({}, b, { start: windowTime(date, owner, b.start) }))).filter((b) => b.fixed && !b.sleep && !own(b) && b.start < hi && b.start + b.dur > lo);
    const r = pushInsert(others.filter((b) => !b.fixed && !b.soft).map((b) => { const w = mealWindow(state, b, date); return w ? Object.assign({}, b, { win: w }) : b; }), walls, { start: end, dur: mins }, lo, hi, true);
    if (!r.ok) return r;
    /* open time right after gives up the minutes instead of sliding, so its end stays put */
    const took = [];
    for (const b of others.filter((x) => x.soft && x.tpl && x.start < end + mins && x.start + x.dur > end)) {
      const o = blockRecord(state, b.sourceDate, b.sourceKey);
      const begin = o && windowTime(date, b.sourceDate, o.start), stop = o && begin + o.dur;
      if (!o || begin >= end + mins || begin < end) continue;
      const start = windowTime(b.sourceDate, date, end + mins);
      took.push(Object.assign({}, b, { patch: stop - (end + mins) >= STEP ? { start, dur: stop - (end + mins) } : { gone: true } }));
    }
    return Object.assign(r, { end: end + mins, took, rec, dur: Math.max(rec.dur, end + mins - rec.start) });
  }
  function extendBlock(state, date, key, mins, min) {
    const r = previewExtend(state, date, key, mins, min);
    if (!r.ok) return r;
    applyPushes(state, date, r.pushes);
    r.took.forEach((b) => setRecord(state, b.sourceDate, b.sourceKey, b.patch));
    setRecord(state, date, key, { start: r.rec.start, dur: r.dur });
    return r;
  }
  /* Three of your own blocks for open time, one from each kind of thing (rows: Data.KIT_ROWS), that
     fit in `len` minutes or can be trimmed to it without losing the point. */
  /* V11: opts { max, skip } stops at max and leaves out the rows named in skip (a kind you finished within the
     hour: no Workout right after a run) */
  function fillIdeas(palette, rows, len, opts) {
    const byId = new Map(palette.map((p) => [p.id, p]));
    const out = [], max = (opts && opts.max) || 3, skip = (opts && opts.skip) || [];
    if (max < 1) return out;
    for (const r of rows) {
      if (r.name === 'Work' || skip.includes(r.name)) continue;
      const p = r.ids.map((id) => byId.get(id)).find((x) => x && !x.free && (gridDur(x.dur) <= len || (len >= 30 && x.dur <= len * 2)));
      if (p) out.push(Object.assign({}, p, { dur: Math.min(gridDur(p.dur), Math.floor(len / STEP) * STEP) }));
      if (out.length >= max) break;
    }
    return out;
  }
  /* V11 (the Today walk): your own next thing, for open time, before any idea from the library. The next step
     without a time of the most urgent to-do (late ones first, then by the day it's due), or the next session of a
     goal pulled forward from later today or a later day. A to-do due within two days comes before a goal's session,
     and a session before a to-do due later. Only what fits in `len` minutes; a session longer than that offers the
     part that fits. Returns null, or { kind: 'step' | 'task' | 'goal', name, dur, cat, icon, task, step, due, goal,
     part, from: { date, add, start } (the session it comes from) }. Nothing changes until startNext. */
  function nextUp(state, today, nowMin, len, opts) {
    const o = opts || {}, now = nowMin == null ? 0 : nowMin, room = floorGrid(len);
    if (room < STEP) return null;
    const pl = placements(state);
    let todo = null;
    for (const x of dueSoon(state, today, o.days || 14, now)) {
      const t = x.task, steps = t.steps || [];
      if (t.done || x.status === 'planned') continue;
      const ahead = (pl.get(t.id) || []).filter((p) => windowTime(today, p.date, p.add.start) + p.add.dur > now);
      if (ahead.some((p) => !p.step)) continue;
      if (steps.length) {
        const s = steps.find((st) => !st.done && !ahead.some((p) => p.step === st.id));
        const d = s ? gridDur(s.dur || 15) : 0;
        if (!s || d > room) continue;
        todo = { kind: 'step', name: s.name, dur: d, task: t.id, step: s.id, due: t.due, cat: t.cat || 'yours', icon: t.icon || 'check' };
      } else {
        const d = gridDur(taskDur(t));
        if (d > room) continue;
        todo = { kind: 'task', name: t.name, dur: d, task: t.id, step: null, due: t.due, cat: t.cat || 'yours', icon: t.icon || 'check' };
      }
      break;
    }
    if (todo && diffDays(today, todo.due) <= 2) return todo;
    let goal = null;
    for (const g of state.goals || []) {
      if (g.archived || g.paused) continue;
      const x = goalSessions(state, g.id).find((s) => !s.add.skipped && !s.add.done && !s.add.partial && s.date >= today && windowTime(today, s.date, s.add.start) >= now + STEP);
      if (!x) continue;
      const at = windowTime(today, x.date, x.add.start);
      if (goal && at >= goal.at) continue;
      const d = Math.min(x.add.dur, room);
      goal = { kind: 'goal', name: x.add.name, dur: d, goal: g.id, part: x.add.src.part || null, cat: x.add.cat || g.cat || 'yours', icon: x.add.icon || g.icon || 'star', from: { date: x.date, add: x.add.id, start: x.add.start }, at };
    }
    if (goal) { delete goal.at; return goal; }
    return todo;
  }
  /* Put nextUp's pick on `date` at `start`: a step or a whole to-do goes on as itself, and a goal's session
     moves there (pinned), or the part that fits does, leaving the rest where it was. placeAdd's result. */
  function startNext(state, date, pick, start) {
    if (!pick) return { ok: false };
    if (pick.kind === 'goal') {
      const f = pick.from && findAdd(state, pick.from.add);
      if (!f) return { ok: false, reason: 'gone' };
      if (pick.dur >= f.add.dur) return moveAdd(state, f.add.id, date, start);
      const before = clone(state.dates);
      const rest = f.add.dur - pick.dur;
      f.add.dur = rest;
      if (rest < STEP) removeAdd(state, f.add.id);
      const r = placeAdd(state, date, { name: f.add.name, cat: f.add.cat, icon: f.add.icon, dur: pick.dur, src: Object.assign({}, f.add.src) }, start);
      if (!r.ok) state.dates = before;
      return r;
    }
    const src = pick.kind === 'step' ? { type: 'step', task: pick.task, id: pick.step } : { type: 'task', id: pick.task };
    return placeAdd(state, date, { name: pick.name, cat: pick.cat, icon: pick.icon, dur: pick.dur, src }, start);
  }
  /* What open time offers: your own next thing first (nextUp), then up to `max` (2) blocks from the library
     (fillIdeas), never of a kind you finished within the hour. Nothing at all in the run-up to a locked block
     that leaves home (opts.leave minutes, 45): those minutes are shoes and a car seat. info is nowInfo's open
     time on `date` (start, end, next); opts: { palette, rows, max, leave, days }. Returns { first, ideas, quiet },
     quiet the block that leaves home soon. The band and the phone's Now card read the same. */
  function openIdeas(state, date, min, info, opts) {
    const o = opts || {}, at = clamp(floorGrid(min), info.start, Math.max(info.start, info.end - STEP)), len = info.end - at;
    const out = { first: null, ideas: [], quiet: null, at };
    if (len < STEP) return out;
    const ahead = calendarDay(state, date).blocks.find((b) => !b.sleep && b.fixed && b.start >= info.end && b.start < info.end + STEP);
    if (ahead && leavesHome(ahead) && ahead.start - min <= (o.leave == null ? 45 : o.leave)) { out.quiet = ahead; return out; }
    out.first = nextUp(state, date, min, len, o);
    /* a kind finished within the hour (a block that was ended early counts from its new end), or about to start
       within it: no Workout right after a run, or right before the workout on the board */
    const rows = o.rows || [], done = Math.max(min, info.start), recent = calendarDay(state, date).blocks.filter((b) => !b.sleep && !b.free && ((b.start + b.dur <= done && b.start + b.dur > min - 60) || (b.start >= info.end && b.start < min + 60)));
    const kindOf = (b) => {
      const id = b.src && b.src.type === 'block' ? b.src.id : b.tpl || null, name = String(b.label || b.name || '').toLowerCase();
      const r = rows.find((x) => x.ids.includes(id) || x.ids.some((pid) => { const p = (o.palette || []).find((q) => q.id === pid); return p && p.name.toLowerCase() === name; }));
      return r ? r.name : null;
    };
    const skip = recent.map(kindOf).filter(Boolean);
    out.ideas = fillIdeas(o.palette || [], rows, len, { max: o.max == null ? 2 : o.max, skip });
    return out;
  }
  /* The one question worth asking at minute `min`, if any. Tonight's dinner from 3 pm (or an hour
     before) until it's over; on any morning but Sunday, what kind of day it is. seen holds what was
     answered or put off today: { dinnerAt, dinnerNo, kind }. Put off once, dinner asks again then,
     and the second time it offers Not tonight. */
  /* V11 (the Today walk): time from the person's day, not the clock. Tonight's dinner is today's own (on a day
     whose evening runs past midnight, the calendar line starts with last night's dinner, which is never tonight's),
     asked until its whole time is over; the kind of day is asked from this morning's wake to four hours after it
     (ownDay), so never at 1 am on the way to bed. seen.quietWeekdays (three Your usual answers in a row, or Don't
     ask on weekdays) leaves weekdays alone, except one unlike the rest (dayDiffers). */
  /* V11-2 (big moments): two more, asked only when opts asks for them ({ big: true }, or { yesterday, headsup }), so
     a version that doesn't know them never sees one. The morning after, from wake until noon (or four hours after a
     late wake), the things from yesterday whose time went by with no check (yesterdayLoose): { kind: 'yesterday',
     items, count, words }, after dinner and before the kind of day; seen.yesterday puts it off. Last of all, while
     the person is up, a heads-up whose time to ask has come and isn't done (the one with the nearest last good day):
     { kind: 'headsup', key, event, task, who, place, date, start, words, text }, words the question ('Your aunt would
     love some notice about LA. Text her this week?') and text the suggested message. seen.headsup: true puts off
     every one today, or { [key]: true } (or a list of keys) one by one. */
  function momentFor(state, date, min, seen, resolved, opts) {
    const s = seen || {}, o = opts || {};
    const d = resolved || resolveDay(state, date);
    const din = d.blocks.find((b) => b.dinner && (b.sourceDate || date) === date);
    if (din && !din.planned && !s.dinnerNo) {
      const start = din.sourceStart != null ? din.sourceStart : din.start, end = start + (din.sourceDur != null ? din.sourceDur : din.dur);
      const from = s.dinnerAt != null ? s.dinnerAt : Math.min(15 * 60, start - 60);
      if (min >= from && min < end) return { kind: 'dinner', block: din, again: s.dinnerAt != null };
    }
    const dd = state.dates[date] || {}, own = ownDay(state, date);
    if ((o.big || o.yesterday) && !s.yesterday && min >= own.wake && min < Math.max(720, own.wake + 240)) {
      const items = yesterdayLoose(state, date, min);
      if (items.length) return { kind: 'yesterday', items, count: items.length, words: items.length + (items.length === 1 ? ' thing' : ' things') + ' from yesterday didn’t get a check.' };
    }
    if (weekday(date) !== 0 && !s.kind && !dd.preset && min >= own.wake && min < own.wake + 240 && !(s.quietWeekdays && !dayDiffers(state, date))) return { kind: 'kind' };
    if ((o.big || o.headsup) && s.headsup !== true && min >= own.wake && min < own.bed) {
      const h = headsUpDue(state, date, s.headsup);
      if (h) return Object.assign({ kind: 'headsup' }, h);
    }
    return null;
  }

  /* == reminders == */
  /* Which reminders a date holds. prefs: { locked, added, sunday, dinner, lead } (minutes early).
     Each has a key that stays the same while the thing it's about stays the same, so it's sent once. */
  function remindersFor(state, date, prefs) {
    const p = Object.assign({ locked: true, added: true, sunday: true, dinner: true, lead: 10 }, prefs || {});
    p.lead = Number.isFinite(Number(p.lead)) ? Number(p.lead) : 10;
    const records = calendarRecords(state, addDays(date, -1)).concat(calendarRecords(state, date));
    const out = [], occurrences = [], seen = new Set();
    for (const b of records) {
      if (b.sleep) continue;
      const sourceDate = b.sourceDate || date, sourceStart = b.sourceStart != null ? b.sourceStart : b.start;
      const sourceKey = b.sourceKey || b.base, start = dateTime(sourceDate, sourceStart);
      const occurrence = sourceDate + '|' + sourceKey;
      if (start.date !== date || seen.has(occurrence)) continue;
      seen.add(occurrence);
      occurrences.push({ b, sourceDate, sourceStart, sourceKey, start });
    }
    const add = (r, ownerDate, minute) => {
      const at = dateTime(ownerDate, minute);
      out.push(Object.assign(r, { reminderDate: at.date, at: at.start }));
    };
    for (const o of occurrences) {
      const b = o.b;
      if (b.soft || b.free || b.dinner) continue;
      const locked = !!(b.fixed || b.event || b.meeting);
      if ((locked && p.locked) || (b.add && !locked && p.added)) {
        add({ key: o.sourceDate + '|' + o.sourceKey + '|' + o.sourceStart, title: b.label || b.name, body: 'At ' + clock(o.start.start) + ', in ' + p.lead + ' minutes', kind: 'block', startDate: o.start.date, start: o.start.start, lead: p.lead }, o.sourceDate, o.sourceStart - p.lead);
      }
    }
    const din = occurrences.find((o) => o.b.dinner);
    if (p.dinner && din && !din.b.planned) add({ key: din.sourceDate + '|dinner', title: 'What’s for dinner tonight?', body: 'Dinner is at ' + clock(din.start.start) + '. Tap to pick how.', kind: 'dinner' }, date, Math.min(15 * 60, din.start.start - 60));
    if (p.sunday && weekday(date) === 0) {
      const w = state.weeks[date], done = !!(w && w.reset && w.reset.done);
      if (!done) {
        const rb = occurrences.find((o) => o.b.tpl === 'reset' || (o.b.icon === 'calendar' && /reset/i.test(o.b.name)));
        const r = { key: date + '|sunday', title: 'It’s Sunday', body: 'Your reset is ready when you are.', kind: 'sunday' };
        if (rb) Object.assign(r, { startDate: rb.start.date, start: rb.start.start, lead: p.lead });
        add(r, rb ? rb.sourceDate : date, rb ? rb.sourceStart - p.lead : 15 * 60);
      }
    }
    return out.sort((a, b) => a.reminderDate.localeCompare(b.reminderDate) || a.at - b.at);
  }

  /* == merging two people's edits == */
  /* Three way merge of a board: base is what both started from, mine is being saved, theirs was saved
     in between. Each date, each night's dinner, each week, and each item of each list (by id) is taken
     from whoever changed it; when both changed the same piece, mine (the newer save) wins and it's
     named in clashes. */
  const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach((k) => { if (v[k] !== undefined) o[k] = sortKeys(v[k]); }); return o; }
    return v;
  }
  const MAP_KEYS = ['dates', 'dinners', 'weeks', 'shopping'];
  /* V11: these merge field by field below the top, so two devices that each change a different one
     keep both: meals per date and meal, and the profile, settings, and meal book per field. Inside
     them a list of things with ids (profile.people, mealbook.own) merges by id, and a list of words
     (settings.holidays, mealbook.hide, profile.kids) as a set: each side's additions stay, and a
     removal on either side sticks. */
  /* V11: a number is how many levels merge by field; an object gives each field its own. Settings goes
     one level, and its switches (modules) one more, so Meals turned off on one device and People on the
     other both stay off; hours and the move goal still come whole from one side (tests/merge.test.mjs) */
  const DEEP_KEYS = { meals: 2, profile: 1, settings: { modules: 1 }, mealbook: 1 };
  function mergeBoards(base, mine, theirs) {
    base = base || {}; mine = mine || {}; theirs = theirs || {};
    const clashes = [];
    const pick = (b, m, t, name) => {
      if (same(m, b)) return t;
      if (same(t, b) || same(m, t)) return m;
      clashes.push(name);
      return m;
    };
    const ided = (m, t) => Array.isArray(m) && Array.isArray(t) && [...m, ...t].every((x) => x && typeof x === 'object' && x.id != null);
    const byId = (b, m, t, name) => {
      const bm = new Map((Array.isArray(b) ? b : []).map((x) => [x.id, x])), mm = new Map(m.map((x) => [x.id, x])), tm = new Map(t.map((x) => [x.id, x]));
      const order = m.map((x) => x.id).concat(t.map((x) => x.id).filter((id) => !mm.has(id)));
      const list = [];
      for (const id of order) {
        const v = pick(bm.get(id), mm.get(id), tm.get(id), name + ' ' + id);
        if (v !== undefined) list.push(v);
      }
      return list;
    };
    const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
    const words = (v) => Array.isArray(v) && v.every((x) => x == null || typeof x !== 'object');
    /* top (V11): an object both sides emptied between them stays at the top (settings is never dropped),
       and goes below it (a day whose meals were each cleared on one device) */
    const deep = (b, m, t, name, depth, top) => {
      /* only one side changed it (or both the same way): that side, whole */
      if (same(m, b)) return t;
      if (same(t, b) || same(m, t)) return m;
      const per = !!depth && typeof depth === 'object';
      if ((per || depth > 0) && [b, m, t].every((v) => v == null || isObj(v))) {
        const o = {}, sub = new Set([...Object.keys(b || {}), ...Object.keys(m || {}), ...Object.keys(t || {})]);
        for (const s of sub) { const v = deep((b || {})[s], (m || {})[s], (t || {})[s], name + ' ' + s, per ? depth[s] || 0 : depth - 1, false); if (v !== undefined) o[s] = v; }
        return Object.keys(o).length || (top && m != null && t != null) ? o : undefined;
      }
      if (ided(m, t)) return byId(b, m, t, name);
      if (words(m) && words(t)) {
        const was = Array.isArray(b) ? b : [], keep = m.filter((x) => t.includes(x) || !was.includes(x));
        return keep.concat(t.filter((x) => !keep.includes(x) && !m.includes(x) && !was.includes(x)));
      }
      return pick(b, m, t, name);
    };
    /* V11 goals: goals merge by id, and a goal both devices changed merges by field: its check in answers
       per date, its rhythm per field, and its parts by id, so one device's answer for Tuesday and the
       other's for Wednesday both stay. A goal one side removed and the other changed goes the way mine went. */
    const goalList = (b, m, t) => {
      const bm = new Map((Array.isArray(b) ? b : []).map((x) => [x.id, x])), ml = Array.isArray(m) ? m : [], tl = Array.isArray(t) ? t : [];
      const mm = new Map(ml.map((x) => [x.id, x])), tm = new Map(tl.map((x) => [x.id, x]));
      const order = ml.map((x) => x.id).concat(tl.map((x) => x.id).filter((id) => !mm.has(id)));
      const list = [];
      for (const id of order) {
        const bv = bm.get(id), mv = mm.get(id), tv = tm.get(id);
        const v = isObj(mv) && isObj(tv) ? deep(bv, mv, tv, 'goals ' + id, { answers: 1, rhythm: 1 }, false) : pick(bv, mv, tv, 'goals ' + id);
        if (v !== undefined) list.push(v);
      }
      return list;
    };
    /* V11-3 (C6): a to-do and a date both devices changed merge by field too, the way goals do. A to-do's steps and its
       list merge by id, each item by field (one device ticks a step, the other renames another, both stay), and its
       text to send (msg) per field. A date's getting-ready keys (prep) merge per key, so a to-do one device made for a
       step stays kept on the date and Look ahead never offers it again; its list (ready) merges by kind and person,
       and anything else per field. Mine wins a true clash. */
    const keyed = (b, m, t, name, keyOf, each) => {
      const bl = Array.isArray(b) ? b : [], ml = Array.isArray(m) ? m : [], tl = Array.isArray(t) ? t : [];
      const bm = new Map(bl.map((x) => [keyOf(x), x])), mm = new Map(ml.map((x) => [keyOf(x), x])), tm = new Map(tl.map((x) => [keyOf(x), x]));
      const order = ml.map(keyOf).concat(tl.map(keyOf).filter((k) => !mm.has(k))).filter((k, i, all) => all.indexOf(k) === i);
      const list = [];
      for (const k of order) {
        const bv = bm.get(k), mv = mm.get(k), tv = tm.get(k);
        const v = each && isObj(mv) && isObj(tv) ? each(bv, mv, tv, name + ' ' + k) : pick(bv, mv, tv, name + ' ' + k);
        if (v !== undefined) list.push(v);
      }
      return list;
    };
    const fieldwise = (b, m, t, name, spec) => {
      if (same(m, b)) return t;
      if (same(t, b) || same(m, t)) return m;
      const o = {}, sub = new Set([...Object.keys(b || {}), ...Object.keys(m || {}), ...Object.keys(t || {})]);
      for (const f of sub) {
        const bv = (b || {})[f], mv = (m || {})[f], tv = (t || {})[f], how = spec[f];
        const v = typeof how === 'function' ? (same(mv, bv) ? tv : same(tv, bv) || same(mv, tv) ? mv : how(bv, mv, tv, name + ' ' + f)) : deep(bv, mv, tv, name + ' ' + f, how || 0, false);
        if (v !== undefined) o[f] = v;
      }
      return o;
    };
    const byField = (b, m, t, name) => deep(b, m, t, name, 1, false);
    const idOf = (x) => (x && typeof x === 'object' && x.id != null ? 'id:' + x.id : 'v:' + JSON.stringify(sortKeys(x)));
    const readyOf = (r) => (typeof r === 'string' ? r : r && typeof r === 'object' ? String(r.k) + (r.who ? ':' + String(r.who).trim().toLowerCase() : '') : 'v:' + JSON.stringify(sortKeys(r)));
    const TASK_SPEC = { steps: (b, m, t, n) => (ided(m, t) ? keyed(b, m, t, n, idOf, byField) : pick(b, m, t, n)), list: (b, m, t, n) => (ided(m, t) ? keyed(b, m, t, n, idOf, byField) : pick(b, m, t, n)), msg: 1, spread: 1 };
    const EVENT_SPEC = { prep: 1, ready: (b, m, t, n) => (Array.isArray(m) && Array.isArray(t) ? keyed(b, m, t, n, readyOf, byField) : pick(b, m, t, n)) };
    const itemList = (b, m, t, name, spec) => keyed(b, m, t, name, idOf, (bv, mv, tv, n) => fieldwise(bv, mv, tv, n, spec));
    const out = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
    for (const k of keys) {
      const b = base[k], m = mine[k], t = theirs[k];
      if (k === 'goals' && (Array.isArray(m) || Array.isArray(t)) && [b, m, t].every((v) => v == null || Array.isArray(v))) {
        out[k] = goalList(b, m, t);
      } else if ((k === 'tasks' || k === 'events') && Array.isArray(m) && Array.isArray(t) && ided(m, t) && (b == null || Array.isArray(b))) {
        out[k] = itemList(b, m, t, k, k === 'tasks' ? TASK_SPEC : EVENT_SPEC);
      } else if (MAP_KEYS.includes(k) && (m || t)) {
        const o = {}, sub = new Set([...Object.keys(b || {}), ...Object.keys(m || {}), ...Object.keys(t || {})]);
        for (const s of sub) { const v = pick((b || {})[s], (m || {})[s], (t || {})[s], k + ' ' + s); if (v !== undefined) o[s] = v; }
        out[k] = o;
      } else if (DEEP_KEYS[k]) {
        const v = deep(b, m, t, k, DEEP_KEYS[k], true);
        if (v !== undefined) out[k] = v;
      } else if (ided(m, t)) {
        out[k] = byId(b, m, t, k);
      } else {
        const v = pick(b, m, t, k);
        if (v !== undefined) out[k] = v;
      }
    }
    /* V11: a diet and what it leaves out are one choice: when both devices picked a different diet, mine
       comes whole, never Everything with the other's list */
    if (clashes.includes('mealbook diet') && out.mealbook && mine.mealbook) out.mealbook = Object.assign({}, out.mealbook, { out: (mine.mealbook.out || []).slice() });
    twoPartners(base, mine, theirs, out, clashes);
    noTwins(base, mine, theirs, out);
    return { doc: out, clashes };
  }
  /* V11-3 (C6): what two devices each made for the same thing comes back once. A getting-ready step both made a to-do
     for keeps mine (prep), and theirs goes when nothing else holds it (no other date keeps it, it isn't done, and no
     day has it placed). A to-do whose steps both devices added by the same name keeps mine, the same way. */
  function noTwins(base, mine, theirs, out) {
    if (!Array.isArray(out.tasks)) return;
    const was = new Set((base.tasks || []).map((x) => x && x.id)), placed = new Set(), stepPlaced = new Set();
    Object.keys(out.dates || {}).forEach((d) => ((out.dates[d] || {}).adds || []).forEach((a) => { if (a && a.src && a.src.task) { placed.add(a.src.task); if (a.src.step) stepPlaced.add(a.src.task + '|' + a.src.step); } }));
    const kept = new Set();
    (out.events || []).forEach((e) => Object.keys((e && e.prep) || {}).forEach((k) => kept.add(e.prep[k])));
    const drop = new Set();
    const evOf = (list, id) => (list || []).find((x) => x && x.id === id);
    (out.events || []).forEach((e) => {
      const te = evOf(theirs.events, e.id), be = evOf(base.events, e.id);
      Object.keys((te && te.prep) || {}).forEach((k) => {
        const theirsId = te.prep[k], won = (e.prep || {})[k];
        if (!theirsId || theirsId === 'skip' || theirsId === won || !won || won === 'skip' || ((be && be.prep) || {})[k] === theirsId) return;
        const tt = out.tasks.find((x) => x.id === theirsId);
        if (tt && !was.has(theirsId) && !kept.has(theirsId) && !tt.done && !placed.has(theirsId) && out.tasks.some((x) => x.id === won)) drop.add(theirsId);
      });
    });
    if (drop.size) out.tasks = out.tasks.filter((x) => !drop.has(x.id));
    const mineTasks = new Map((mine.tasks || []).map((x) => [x && x.id, x])), baseTasks = new Map((base.tasks || []).map((x) => [x && x.id, x]));
    out.tasks = out.tasks.map((x) => {
      if (!x || !Array.isArray(x.steps) || !mineTasks.has(x.id)) return x;
      const bs = new Set((((baseTasks.get(x.id) || {}).steps) || []).map((s) => s && s.id)), ms = new Set(((mineTasks.get(x.id).steps) || []).map((s) => s && s.id));
      const mineNew = new Set(x.steps.filter((s) => s && ms.has(s.id) && !bs.has(s.id)).map((s) => String(s.name || '').trim().toLowerCase()));
      if (!mineNew.size) return x;
      const steps = x.steps.filter((s) => !(s && !ms.has(s.id) && !bs.has(s.id) && !s.done && mineNew.has(String(s.name || '').trim().toLowerCase()) && !stepPlaced.has(x.id + '|' + s.id)));
      return steps.length === x.steps.length ? x : Object.assign({}, x, { steps });
    });
  }
  /* V11: two devices that each added a first partner keep both. Mine stays the partner, and theirs joins
     profile.people as a partner too (an id made from the name, so any device merging the same two agrees),
     with the dinners and meals they were cooking on that device, where the first partner cooks as 'kim' */
  function twoPartners(base, mine, theirs, out, clashes) {
    const pb = base.profile || {}, pm = mine.profile || {}, pt = theirs.profile || {};
    if (pb.partner || !pm.partner || !pt.partner || pm.partner.toLowerCase() === pt.partner.toLowerCase() || !out.profile) return;
    const people = (out.profile.people || []).slice();
    let p = people.find((x) => x && x.group === 'partner' && x.name === pt.partner);
    if (!p) { p = { id: 'pt' + Array.from(pt.partner).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36), name: pt.partner, group: 'partner' }; people.push(p); }
    out.profile = Object.assign({}, out.profile, { partner: pm.partner, people });
    const at = clashes.indexOf('profile partner');
    if (at >= 0) clashes.splice(at, 1);
    const cook = 'p:' + p.id, theirsOnly = (b, m, t) => same(m, b) && !same(t, b);
    Object.keys(out.dinners || {}).forEach((d) => {
      const x = out.dinners[d], at3 = (s) => (s.dinners || {})[d];
      if (x && x.cook === 'kim' && theirsOnly(at3(base), at3(mine), at3(theirs))) out.dinners[d] = Object.assign({}, x, { cook });
    });
    Object.keys(out.meals || {}).forEach((d) => Object.keys(out.meals[d] || {}).forEach((k) => {
      const x = out.meals[d][k], at3 = (s) => ((s.meals || {})[d] || {})[k];
      if (x && x.cook === 'kim' && theirsOnly(at3(base), at3(mine), at3(theirs))) out.meals[d] = Object.assign({}, out.meals[d], { [k]: Object.assign({}, x, { cook }) });
    }));
  }

  /* == quick add in plain words == */
  const WD = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  const MON = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  /* words that mean one of your blocks, when its own name isn't typed */
  const QUICK_WORDS = { gym: 'workout', lift: 'workout', lifting: 'workout', train: 'workout', workout: 'workout', run: 'run', jog: 'run', walk: 'walk', read: 'reading', reading: 'reading', nap: 'nap', call: 'call', phone: 'call', meeting: 'meeting', standup: 'meeting', sync: 'meeting', groceries: 'groceries', grocery: 'groceries', shopping: 'groceries', laundry: 'laundry', clean: 'clean', cleaning: 'clean', errand: 'errand', errands: 'errand', coffee: 'coffee-friend', lunch: 'lunch', stretch: 'stretch', yoga: 'stretch', write: 'project', writing: 'project', draw: 'creative', paint: 'creative', create: 'creative', study: 'study', studying: 'study', homework: 'study', revise: 'study' };
  /* == V11-2: quick add's big things (docs/BIG-MOMENTS.md, B) ==
     With opts.big, three more things a line can be, read before anything else:
     - a move: "move in spring", "moving to Austin next month", "move Apr 10". A date of its own, named Moving day (or
       Moving to Austin), with a window and no date when it's only a season, a month, this month or next, or a few
       months away (a fuzzy date).
     - a trip: "trip to Denver Dec 3 to 6", "flying to Japan this summer". Named for the place; a season or a month
       makes it fuzzy, and with no days yet it has neither (the app asks for them).
     - a message: "text Aunt Lisa about LA", "give Grandma a heads-up about the lake". { kind: 'message', name, who,
       about }: the app finds the trip it's about (tripFor) and adds a heads-up there, or makes a to-do with msg when
       there's none.
     A date is { kind: 'date', name, event }, event { kind, name, icon, date, end (a trip's), window (a fuzzy one) },
     ready for the app's New date. Anything else is null, and the line reads as it always did. */
  const QB_MONTHS = 'jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december';
  const QB_DAYS = 'sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday';
  /* a name as a person means it: typed all in small letters, each word gets its capital (aunt lisa, new york) */
  const quickCaps = (v) => { const s = String(v || '').trim(); return s && s === s.toLowerCase() ? s.replace(/(^|[\s-])([a-zà-ÿ])/g, (x, a, b) => a + b.toUpperCase()) : s; };
  /* "sometime" as it's said: this month, next month, a few months, a season (this, next, or in the spring), or a month
     (March, next March). { from, to }, whole months, or null */
  function quickWindow(words, today) {
    const w = String(words || '').toLowerCase().replace(/[.!?,]+$/, '').replace(/^(?:sometime|some time)\s+/, '').trim();
    if (/^(?:this\s+month|later\s+this\s+month)$/.test(w)) return windowFor('this-month', today);
    /* V11-3 (C2): next week, the days of the week after this one (as the board starts its weeks), and the rest of this
       one */
    if (/^next\s+week$/.test(w)) { const a = addDays(weekStart(today), 7); return { from: a, to: addDays(a, 6) }; }
    if (/^(?:this|later\s+this)\s+week$/.test(w)) return { from: today, to: addDays(weekStart(today), 6) };
    if (/^next\s+month$/.test(w)) return windowFor('next-month', today);
    if (/^(?:in\s+)?(?:a\s+few|the\s+next\s+few|a\s+couple(?:\s+of)?)\s+months$/.test(w)) return windowFor('few-months', today);
    let m = w.match(/^(?:in\s+(?:the\s+)?|this\s+|next\s+)?(spring|summer|fall|autumn|winter)$/);
    if (m) {
      const k = m[1] === 'autumn' ? 'fall' : m[1];
      /* (this spring is the one under way, however little of it is left) */
      let win = windowFor(k, today, /^this\s/.test(w));
      /* next spring is the one after the spring under way */
      if (win && /^next\s/.test(w) && win.from <= today) win = windowFor(k, addDays(win.to, 1));
      return win;
    }
    m = w.match(new RegExp('^(?:in\\s+|this\\s+|(next)\\s+)?(' + QB_MONTHS + ')$'));
    if (m) {
      const p = parts(today), mo = MON[m[2]];
      let y = mo < p.m ? p.y + 1 : p.y;
      if (m[1] && mo <= p.m) y = p.y + 1;
      return { from: iso(y, mo, 1), to: iso(y, mo, daysInMonth(y, mo)) };
    }
    return null;
  }
  /* the days a trip is: Dec 3 to 6, Dec 3 to Dec 6, Dec 30 to Jan 2, 12/3 to 12/6 (with its hyphen too), Fri to Sun,
     this weekend, next weekend, or one day (Dec 3). { date, end } from today on, or null */
  function quickRange(words, today, dayFirst) {
    const w = String(words || '').toLowerCase().replace(/[.!?,]+$/, '').replace(/^(?:from|on)\s+/, '').replace(/(\d)(?:st|nd|rd|th)\b/g, '$1').trim();
    const y0 = +today.slice(0, 4);
    const at = (y, mo, dd) => (mo >= 1 && mo <= 12 && dd >= 1 && dd <= daysInMonth(y, mo) ? iso(y, mo, dd) : null);
    /* the first one from today on, and an end that comes after it (into the next year when it has to) */
    const first = (mo, dd) => { const a = at(y0, mo, dd); return a && a >= today ? a : at(y0 + 1, mo, dd); };
    const after = (from, mo, dd) => { const y = +from.slice(0, 4), a = at(y, mo, dd); return a && a >= from ? a : at(y + 1, mo, dd); };
    const TO = '\\s*(?:-|\\u2013|\\u2014|to|through|thru|until|till)\\s*';
    let m = w.match(new RegExp('^(' + QB_MONTHS + ')\\.?\\s+(\\d{1,2})(?:' + TO + '(?:(' + QB_MONTHS + ')\\.?\\s+)?(\\d{1,2}))?$'));
    if (m) {
      const mo = MON[m[1]], date = first(mo, +m[2]);
      if (!date) return null;
      if (!m[4]) return { date, end: date };
      const end = after(date, m[3] ? MON[m[3]] : mo, +m[4]);
      return end ? { date, end } : null;
    }
    m = w.match(new RegExp('^(\\d{1,2})/(\\d{1,2})(?:' + TO + '(?:(\\d{1,2})/)?(\\d{1,2}))?$'));
    if (m) {
      const a = +m[1], b = +m[2], mo = dayFirst ? b : a, dd = dayFirst ? a : b, date = first(mo, dd);
      if (!date) return null;
      if (!m[4]) return { date, end: date };
      const c = m[3] != null ? +m[3] : null, d = +m[4];
      const mo2 = c == null ? mo : dayFirst ? d : c, dd2 = c == null ? d : dayFirst ? c : d;
      const end = after(date, mo2, dd2);
      return end ? { date, end } : null;
    }
    m = w.match(new RegExp('^(?:this\\s+|next\\s+)?(' + QB_DAYS + ')(?:' + TO + '(' + QB_DAYS + '))?$'));
    if (m) {
      const a = WD[m[1]], date = addDays(today, (a - weekday(today) + 7) % 7 + (/^next\s/.test(w) ? 7 : 0));
      if (!m[2]) return { date, end: date };
      const b = WD[m[2]];
      return { date, end: addDays(date, (b - a + 7) % 7) };
    }
    /* V11-3 (C2): the words for a day that parseQuick knows: today, tonight, tomorrow */
    if (/^(?:today|tonight)$/.test(w)) return { date: today, end: today };
    if (/^(?:tomorrow|tmrw|tmw)$/.test(w)) { const d = addDays(today, 1); return { date: d, end: d }; }
    if (/^this\s+weekend$/.test(w)) { const sat = addDays(today, (6 - weekday(today) + 7) % 7), d0 = weekday(today) === 0 ? today : sat; return { date: d0, end: weekday(today) === 0 ? today : addDays(sat, 1) }; }
    /* (V11-3, C27: on a Sunday, this weekend is today, so next weekend is the coming Saturday, six days out) */
    if (/^next\s+weekend$/.test(w)) { const sat = addDays(sundayOf(today), weekday(today) === 0 ? 6 : 13); return { date: sat, end: addDays(sat, 1) }; }
    return null;
  }
  /* the words before a when and the when itself: the first place the rest reads as one ({ head, when, how }), or the
     whole of it with no when */
  function quickSplit(words, read) {
    const t = String(words || '').trim().split(/\s+/).filter(Boolean);
    for (let k = 1; k < t.length; k++) { const when = t.slice(k).join(' '), r = read(when); if (r) return { head: t.slice(0, k).join(' '), when: r }; }
    return { head: t.join(' '), when: null };
  }
  /* who a message is to, as a person means it: Aunt Lisa from aunt lisa, but the team, my sister, and our neighbors
     keep their small letters */
  const quickWho = (v) => { const w = String(v || '').trim(); return /^(?:the|my|our|a|an|his|her|their|your|everyone|everybody|all)\b/i.test(w) ? w : quickCaps(w); };
  /* "text Aunt Lisa about LA", "message the team about the deadline", "give Grandma a heads-up about the lake":
     { verb, who, about, name } (name in the person's words, the verb first), or null */
  function quickMsg(text) {
    const s = String(text || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
    let m = s.match(/^(text|message|msg)\s+(.+?)\s+about\s+(.+)$/i);
    if (m) { const who = quickWho(m[2]), about = m[3].trim(); return who && about ? { verb: m[1], who, about, name: capFirst(m[1]) + ' ' + who + ' about ' + about } : null; }
    m = s.match(/^(give|send)\s+(.+?)\s+(a\s+heads?[\s-]?up)\s+(about|for|on)\s+(.+)$/i);
    if (m) { const who = quickWho(m[2]), about = m[5].trim(); return who && about ? { verb: m[1], who, about, name: capFirst(m[1]) + ' ' + who + ' ' + m[3] + ' ' + m[4] + ' ' + about } : null; }
    return null;
  }
  function quickBig(text, today, opts) {
    const dayFirst = !!(opts && opts.dayFirst);
    const s = String(text || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
    if (!s) return null;
    /* V11-3 (C1): a message is one only when what it's about names a trip, or has no day or time in it ("text Mom
       about dinner tomorrow 6pm" is an ordinary line with a text to send: parseQuick attaches msg). The person's own
       verb stays (Message the team about the deadline), and a name with the or my before it keeps its small letters */
    const mm = quickMsg(s);
    if (mm) {
      const p0 = parseQuick(mm.about, today, [], null, { dayFirst });
      const timed = !!p0 && (!!p0.date || p0.start != null || !!p0.part);
      if (!timed || (opts && opts.state && tripFor(opts.state, mm.about, today))) return { kind: 'message', name: mm.name, who: mm.who, about: mm.about, date: null, due: null, start: null, dur: 5, cat: 'family', icon: 'chat', pal: null };
    }
    let m;
    /* a when: a fuzzy window, or days */
    const when = (w) => { const win = quickWindow(w, today); if (win) return { window: win }; const r = quickRange(w, today, dayFirst); return r ? { range: r } : null; };
    m = s.match(/^(?:(?:we(?:'|’)re|we\s+are|i(?:'|’)m|i\s+am)\s+)?(?:move|moving)\s+(.+)$/i);
    if (m) {
      const to = m[1].match(/^(?:to|into)\s+(.+)$/i);
      const sp = to ? quickSplit(to[1], when) : { head: '', when: when(m[1]) };
      if (sp.when && (!to || sp.head)) {
        const name = to ? 'Moving to ' + quickCaps(sp.head) : 'Moving day';
        const event = { kind: 'marker', name, icon: 'house', cat: 'home', date: sp.when.range ? sp.when.range.date : null };
        if (sp.when.window) event.window = sp.when.window;
        return { kind: 'date', name, event, date: event.date, due: null, start: null, dur: null, cat: 'home', icon: 'house', pal: null };
      }
    }
    m = s.match(/^(?:(?:a|an|our|my|the)\s+)?(?:road\s+)?trip\s+to\s+(.+)$/i) || s.match(/^(?:fly|flying|fly\s+out)\s+to\s+(.+)$/i);
    if (m) {
      const sp = quickSplit(m[1], when), name = quickCaps(sp.head);
      if (name) {
        const r = sp.when && sp.when.range;
        const event = { kind: 'trip', name, icon: 'plane', date: r ? r.date : null, end: r ? r.end : null, leave: 450, back: 1020 };
        if (sp.when && sp.when.window) event.window = sp.when.window;
        return { kind: 'date', name, event, date: event.date, due: null, start: null, dur: null, cat: 'away', icon: 'plane', pal: null };
      }
    }
    return null;
  }
  /* V11-2: the trip a message is about: one coming up (or a fuzzy one) whose name is the words, holds them, or is held
     by them (the California trip), or where a heads-up already names that place (LA, on the California trip). A trip,
     or a date you travel to (away). { event, place } (place: the words, when they aren't the trip's own name, so the
     text says where the person is), or null. Nearest first; an exact name before one that only holds the words. */
  function tripFor(state, about, today) {
    const norm = (v) => String(v || '').toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9à-ÿ\s]/g, ' ').split(/\s+/).filter((x) => x && !['the', 'a', 'an', 'my', 'our', 'trip', 'visit', 'to'].includes(x));
    const want = norm(about);
    if (!want.length) return null;
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const holds = (a, b) => b.length > 0 && b.every((x) => a.includes(x));
    /* the words as the trip's own name writes them (LA in Trip to LA), when it holds them as they are; else none */
    const asNamed = (name, words) => { const w = String(words).trim(), i = name.toLowerCase().indexOf(w.toLowerCase()); return w && i >= 0 ? name.slice(i, i + w.length) : null; };
    let best = null;
    for (const e of liveEvents(state)) {
      if (!(e.kind === 'trip' || e.away)) continue;
      /* (V11-3, C25: a fuzzy trip whose window is over is past asking too) */
      const on = isFuzzy(e) ? e.window.to : e.end || e.date;
      if (!on || on < today) continue;
      const name = readyName(e), nm = norm(name), own = placeOf(e), pl = own ? norm(own) : [];
      const places = (Array.isArray(e.ready) ? e.ready : []).filter((r) => r && r.k === 'headsup' && r.place).map((r) => String(r.place));
      const kept = places.find((p) => same(norm(p), want));
      const rank = same(nm, want) || (pl.length && same(pl, want)) ? 0 : kept ? 1 : holds(nm, want) ? 2 : holds(want, nm) ? 3 : -1;
      if (rank < 0) continue;
      /* where the person is: the trip's own name needs no place, and neither does the place in it (placeOf, which a
         heads-up's text uses anyway); a heads-up's place as it was kept; other words the name holds, as it writes them */
      const exact = name.trim().toLowerCase() === String(about).trim().toLowerCase();
      let place = rank === 1 ? kept : rank === 3 || exact ? null : asNamed(name, about);
      if (place && pl.length && same(norm(place), pl)) place = null;
      const at = isFuzzy(e) ? e.window.from : e.date;
      if (!best || rank < best.rank || (rank === best.rank && at < best.at)) best = { rank, at, e, place };
    }
    return best ? { event: best.e, place: best.place } : null;
  }
  /* Read a line like "Gym Tue 6pm 45m" into a block, or a to do when there's no time.
     Returns { kind: 'block' | 'task', name, date, start, dur, cat, icon, pal, bits } or null when empty.
     V11-2: with opts.big, a move, a trip, or a message first (quickBig): { kind: 'date' | 'message', ... } */
  function parseQuick(text, today, palette, nowMin, opts) {
    /* opts.dayFirst: in this place 6/10 is the sixth of October */
    const dayFirst = !!(opts && opts.dayFirst);
    if (opts && opts.big) { const big = quickBig(text, today, opts); if (big) return big; }
    let s = ' ' + String(text || '').replace(/\s+/g, ' ').trim() + ' ';
    if (!s.trim()) return null;
    const bits = {};
    let date = null, start = null, len = null, part = null;
    const take = (re, fn) => { const m = s.match(re); if (!m) return false; const r = fn(m); if (r === false) return false; s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length); return true; };
    /* how long */
    take(/\s(?:for\s+)?(an?|one)\s+hour\s+and\s+a\s+half\s/i, () => { len = 90; });
    take(/\s(?:for\s+)?half\s+an?\s+hour\s|\s(?:for\s+)?a\s+half\s+hour\s/i, () => { len = 30; });
    take(/\s(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins|minutes?))?\s/i, (m) => { len = Math.round(parseFloat(m[1]) * 60) + (m[2] ? +m[2] : 0); });
    if (len == null) take(/\s(?:for\s+)?(\d+)\s*(?:m|min|mins|minutes?)\s/i, (m) => { len = +m[1]; });
    if (len == null) take(/\s(?:for\s+)?an?\s+hour\s/i, () => { len = 60; });
    /* when */
    take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)\s/i, (m) => { let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; start = h * 60 + (m[2] ? +m[2] : 0); });
    if (start == null) take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\s/, (m) => { let h = +m[1]; if (h >= 1 && h <= 6) h += 12; start = h * 60 + +m[2]; });
    if (start == null) take(/\s(?:at\s+)?noon\s/i, () => { start = 720; });
    if (start == null) take(/\sat\s+(\d{1,2})\s/i, (m) => { let h = +m[1]; if (h > 23) return false; if (h >= 1 && h <= 6) h += 12; start = h * 60; });
    /* V11 (the Planner walk, 12.2): "every Saturday" (or "Saturdays") is a weekday it repeats on; "every" never stays
       in the name, and the next one is the day it shows on */
    let every = null;
    take(/\s(?:every\s+(sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)s?|(sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays))\.?\s/i, (m) => {
      const wd = WD[(m[1] || m[2].slice(0, -1)).toLowerCase()];
      every = wd;
      date = addDays(today, (wd - weekday(today) + 7) % 7 || (start != null && nowMin != null && start <= nowMin ? 7 : 0));
    });
    /* which day */
    if (!date) take(/\stonight\s/i, () => { date = today; part = 'evening'; });
    if (!date) take(/\s(?:today)\s/i, () => { date = today; });
    if (!date) take(/\s(?:tomorrow|tmrw|tmw)\s/i, () => { date = addDays(today, 1); });
    if (!date) take(/\s(?:on\s+)?(next\s+)?(sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\.?\s/i, (m) => {
      const wd = WD[m[2].toLowerCase()];
      date = m[1] ? addDays(sundayOf(today), 7 + wd) : addDays(today, (wd - weekday(today) + 7) % 7);
    });
    const fixYear = (mo, dd) => { const y = +today.slice(0, 4); let dt = y + '-' + pad(mo) + '-' + pad(dd); if (dt < today) dt = (y + 1) + '-' + pad(mo) + '-' + pad(dd); return dt; };
    if (!date) take(/\s(?:on\s+)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s/i, (m) => { const mo = MON[m[1].toLowerCase()], dd = +m[2]; if (dd < 1 || dd > daysInMonth(+today.slice(0, 4), mo)) return false; date = fixYear(mo, dd); });
    if (!date) take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})\s/, (m) => { const mo = dayFirst ? +m[2] : +m[1], dd = dayFirst ? +m[1] : +m[2]; if (mo < 1 || mo > 12 || dd < 1 || dd > daysInMonth(+today.slice(0, 4), mo)) return false; date = fixYear(mo, dd); });
    /* a part of the day stands in for a time */
    if (start == null) take(/\s(?:in\s+the\s+|this\s+)?(morning|afternoon|evening)\s/i, (m) => { part = m[1].toLowerCase(); });
    const loose = start == null && !!part;
    if (loose) start = part === 'morning' ? 9 * 60 : part === 'afternoon' ? 14 * 60 : 19 * 60;
    let name = s.replace(/\s(?:at|on|for|from|by|this)\s*$/i, ' ').replace(/^\s*(?:at|on|for)\s/i, ' ').replace(/\s+/g, ' ').trim();
    if (!name) name = '';
    const low = name.toLowerCase();
    const pals = palette || [];
    let pal = pals.find((x) => x.name.toLowerCase() === low) || null;
    if (!pal) { const w = low.split(' ').map((x) => x.replace(/[^a-z]/g, '')).find((x) => QUICK_WORDS[x]); if (w) pal = pals.find((x) => x.id === QUICK_WORDS[w]) || null; }
    if (!pal) pal = pals.find((x) => low && low.includes(x.name.toLowerCase())) || null;
    const dinner = /\bdinner\b/i.test(name);
    const kind = start != null ? 'block' : 'task';
    if (kind === 'block' && !date) date = start != null && nowMin != null && start <= nowMin ? addDays(today, 1) : today;
    name = name ? name[0].toUpperCase() + name.slice(1) : pal ? pal.name : '';
    const out = { kind, name, date, start, dur: len != null ? Math.max(5, len) : pal ? pal.dur : kind === 'block' ? (dinner ? 45 : 30) : null, cat: pal ? pal.cat : dinner ? 'meals' : 'yours', icon: pal ? pal.icon : dinner ? 'pot' : 'star', pal: pal ? pal.id : null, dinner };
    if (kind === 'task') out.due = date;
    if (loose) out.part = part;
    if (every != null) out.every = every;
    /* V11-3 (C1): a message with a day or a time in it keeps them, and carries who it's to (msg), with no suggestion */
    if (opts && opts.big) {
      const mm = quickMsg(text);
      if (mm) { out.msg = { to: mm.who }; if (!pal) { out.cat = 'family'; out.icon = 'chat'; } if (out.dur == null && kind === 'task') out.dur = 5; }
    }
    return out;
  }
  /* V11, the Planner walk (16): the next free day or free evening after a date, within six months (limit days). A free
     day is a Saturday or a Sunday with no dates, trips, or blocks placed on it and four hours or more open or kept free;
     a free evening is the time from 5 pm to bed with three hours or more open or kept free and nothing locked in it, on
     a day with no trip, for time together. Gives { date, open } (open: minutes) or null */
  function findFree(state, after, kind, limit) {
    const ev = liveEvents(state);
    for (let k = 1; k <= (limit || 183); k++) {
      const d = addDays(after, k), wd = weekday(d);
      if (tripOn(state, d)) continue;
      const day = calendarDay(state, d);
      /* (soft: an evening's flexible time counts as room too, an Evening with Sam or time of your own, never Work) */
      const freeIn = (lo, hi, soft) => {
        let n = 0;
        for (const g of gaps(day)) n += Math.max(0, Math.min(hi, g[1]) - Math.max(lo, g[0]));
        for (const b of day.blocks) if (b.free || (soft && b.soft && !b.sleep && b.cat !== 'work')) n += Math.max(0, Math.min(hi, b.start + b.dur) - Math.max(lo, b.start));
        return n;
      };
      if (kind === 'evening') {
        const lo = 17 * 60, hi = Math.min(1440, ownDay(state, d).bed);
        if (hi - lo < 180) continue;
        if (day.blocks.some((b) => b.fixed && !b.sleep && b.start < hi && b.start + b.dur > lo)) continue;
        const open = freeIn(lo, hi, true);
        if (open >= 180) return { date: d, open };
        continue;
      }
      if (wd !== 0 && wd !== 6) continue;
      if (ev.some((e) => e.date === d || (e.end && e.date <= d && d <= e.end))) continue;
      if (((state.dates[d] || {}).adds || []).some((a) => !a.skipped)) continue;
      const open = freeIn(0, 1440);
      if (open >= 240) return { date: d, open };
    }
    return null;
  }
  /* V11, the Planner walk (10.4, 12.2): a block made part of the usual week on its weekday ("every Saturday"). It joins
     that weekday's routine (the kind of week the date has) at its own start and length; a routine there that isn't
     open time and asks for the same time says no (blocker), so nothing usual is cut. Gives { ok, id, start, dur } */
  function addToUsual(state, date, b) {
    const tpl = templateFor(state, date);
    if (!tpl || !Array.isArray(tpl.blocks)) return { ok: false, reason: 'none' };
    const start = snap(b.start), dur = gridDur(b.dur || 30);
    const hit = tpl.blocks.find((x) => !x.soft && x.start < start + dur && start < x.start + x.dur);
    if (hit) return { ok: false, reason: 'usual', blocker: hit };
    const id = newId('tb');
    tpl.blocks.push({ id, name: b.name || 'Block', cat: b.cat || 'yours', icon: b.icon || 'star', start, dur });
    tpl.blocks.sort(byStart);
    return { ok: true, id, start, dur };
  }

  /* == V11 goals: big things, small blocks ==
     Breaking a big thing down, spreading its steps over the days before it's due, finding new times when
     a day is missed, goals with a date, and cook once, eat twice (docs/PRODUCT-STRATEGY.md). The full
     list of what's here, with arguments and an example of each, is the API block after this section.
     Every planner here uses quiet time only: open gaps, and soft time that's yours or open (free time
     last), on the 15 minute grid, and every placement is checked with canPlace to push nothing. Locked
     blocks never move, and neither does anything else. */
  const SLOTS = ['breakfast', 'lunch', 'dinner'];
  const NOT_COOKING = ['out', 'order', 'skip', 'leftovers'];
  /* the parts of a day, as presetSlot has them, in minutes of the day */
  const PART_SPAN = { morning: [0, 720], afternoon: [720, 1080], evening: [1080, 1440], any: [0, 1440] };
  const ceilGrid = (m) => Math.ceil(m / STEP) * STEP;
  const floorGrid = (m) => Math.floor(m / STEP) * STEP;
  const minDate = (a, b) => (a < b ? a : b);
  const maxDate = (a, b) => (a > b ? a : b);
  const lcFirst = (s) => (s && s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s);
  const capFirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  /* 'today', 'tomorrow', a weekday this week, or a date */
  function dayWord(date, today) {
    const n = diffDays(today, date);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n > 1 && n < 7) return DAY_LONG[weekday(date)];
    return dateText(date);
  }
  const onDay = (date, today) => { const w = dayWord(date, today); return w === 'today' || w === 'tomorrow' ? w : 'on ' + w; };
  const doneBy = (date, today) => (date === today ? 'today' : 'by ' + dayWord(date, today));
  /* 15 minutes, 1 h 15 min (spreading); 45 min, 2 h, 2.5 h (goals) */
  const minutesText = (m) => (m < 60 ? m + (m === 1 ? ' minute' : ' minutes') : dur(m));
  const hoursText = (m) => (m < 60 ? Math.round(m) + ' min' : hours(m));
  const joinWords = (list) => (list.length <= 1 ? list.join('') : list.length === 2 ? list[0] + ' and ' + list[1] : list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1]);
  const partOf = (start) => (start < 720 ? 'morning' : start < 1080 ? 'afternoon' : 'evening');

  /* == V11 goals: quiet time ==
     Russell's rule for V11-2: your own time stays yours. Quiet time, what a plan uses without asking, is the open
     time between blocks and time a handoff frees (it was someone else's job, so it's open now). Own time is a soft
     block the person kept for themselves: a Yours block (Creative time), free time (a Free evening), Breathing room,
     Open time. Nothing lands there on its own; a plan the person says yes to may use it (withOwn). Work, time with
     people, locked blocks, a meal, and sleep are never offered. */
  const quietBlock = (b) => !!b.soft && !b.sleep && !!b.handoff;
  const ownBlock = (b) => !!b.soft && !b.sleep && !b.fixed && !b.handoff && !b.dinner && (b.cat === 'yours' || b.cat === 'open' || !!b.free);
  /* own time a plan may use, after the open time, while the person's yes is being placed (spreadPlan, applySpread,
     moveStep, and reflowTask with opts.own); set only inside withOwn */
  let ownOk = false;
  function withOwn(on, fn) { const was = ownOk; ownOk = !!on; try { return fn(); } finally { ownOk = was; } }
  /* the own time a stretch of a date takes: { min, name } (name: the first own block it's in, Creative time) */
  function ownTimeOf(state, date, start, dur) {
    let min = 0, name = '';
    for (const b of calendarDay(state, date).blocks) {
      if (!ownBlock(b)) continue;
      const m = Math.max(0, Math.min(start + dur, b.start + b.dur) - Math.max(start, b.start));
      if (m > 0) { min += m; if (!name) name = b.label || b.name; }
    }
    return { min, name };
  }
  /* V11-3 (C7, C16): whether a placed add sits in own time: said yes to (own: true, its own flag, never pinned), or over a
     block of the person's own time, worked out with the add itself set aside (it cuts a hole in what it sits on) */
  function inOwnTime(state, date, add) {
    if (!add) return false;
    if (add.own) return true;
    const dd = state.dates[date];
    if (!dd || !Array.isArray(dd.adds)) return false;
    const sim = Object.assign({}, state, { dates: Object.assign({}, state.dates, { [date]: Object.assign({}, dd, { adds: dd.adds.filter((a) => a.id !== add.id) }) }) });
    return ownTimeOf(sim, date, add.start, add.dur).min > 0;
  }
  /* A date's blocks, the way calendarDay has them, for quiet time. When nothing from the days around it
     reaches into the date and nothing of its own runs past midnight, its own records laid alone are
     exactly those blocks, at a fraction of the work; otherwise calendarDay works them out. */
  function dayBlocks(state, date) {
    const own = calendarRecords(state, date);
    if (own.some((b) => b.start < 0 || b.start + b.dur > 1440)) return calendarDay(state, date).blocks;
    for (let k = -7; k <= 1; k++) {
      if (!k) continue;
      const owner = addDays(date, k);
      for (const b of calendarRecords(state, owner)) {
        const s = windowTime(date, owner, b.start);
        if (s < 1440 && s + b.dur > 0) return calendarDay(state, date).blocks;
      }
    }
    let list = [];
    own.slice().sort((a, b) => a.layer - b.layer || byStart(a, b)).forEach((b) => { list = lay(list, b); });
    return clip(list, 0, 1440, 1);
  }
  /* The quiet stretches of a date inside a part of the day, from `after` on, snapped to the grid:
     [{ start, end, free }] (free: inside time kept free on purpose). Trips have none. dayOf: the app's
     own cached calendarDay for the board as it is, when it has one (optional). */
  function quietWindows(state, date, when, after, dayOf) {
    if (tripOn(state, date)) return [];
    const span = PART_SPAN[when] || PART_SPAN.any;
    const lo = Math.max(span[0], after || 0), hi = span[1];
    if (hi - lo < STEP) return [];
    const given = typeof dayOf === 'function' ? dayOf(date) : null;
    const blocks = given && Array.isArray(given.blocks) ? given.blocks : dayBlocks(state, date);
    const pieces = [];
    let c = lo;
    for (const b of blocks.filter((x) => x.start < hi && x.start + x.dur > lo).sort(byStart)) {
      const s = Math.max(lo, b.start), e = Math.min(hi, b.start + b.dur);
      if (s > c) pieces.push({ start: c, end: s, free: false });
      /* (own time, when a yes allows it, is used after the open time, the way time kept free was) */
      const own = ownOk && ownBlock(b);
      if ((quietBlock(b) || own) && e > Math.max(s, c)) pieces.push({ start: Math.max(s, c), end: e, free: own });
      c = Math.max(c, e);
    }
    if (c < hi) pieces.push({ start: c, end: hi, free: false });
    const merged = [];
    for (const p of pieces) {
      const last = merged[merged.length - 1];
      if (last && last.end >= p.start && last.free === p.free) last.end = Math.max(last.end, p.end);
      else merged.push(Object.assign({}, p));
    }
    return merged.map((w) => ({ start: ceilGrid(w.start), end: floorGrid(w.end), free: w.free })).filter((w) => w.end - w.start >= STEP);
  }
  /* the parts of the day to try, in order: the one asked for, then the rest (strict: only that one) */
  const partsFor = (when, strict) => (!when || when === 'any' ? ['any'] : strict ? [when] : [when, 'afternoon', 'morning', 'evening'].filter((v, i, a) => a.indexOf(v) === i));
  /* the windows of a part, and the runs they make where open time meets free time */
  function quietRuns(state, date, part, after) {
    const ws = quietWindows(state, date, part, after), runs = [];
    for (const w of ws) {
      const last = runs[runs.length - 1];
      if (last && last.end >= w.start) last.end = w.end; else runs.push({ start: w.start, end: w.end });
    }
    return { ws, runs };
  }
  /* where to look, in order: the open windows first, then every run, free time and all */
  function windowsInOrder(state, date, part, after) {
    const q = quietRuns(state, date, part, after);
    return q.ws.filter((w) => !w.free).concat(q.runs);
  }
  /* The first start on `date` where `len` minutes fit in quiet time and nothing moves, or null.
     opts: { when: 'any' | 'morning' | 'afternoon' | 'evening', strict, after (minute) } */
  function quietSlot(state, date, len, opts) {
    const o = opts || {}, d15 = gridDur(len);
    for (const part of partsFor(o.when, o.strict)) {
      for (const w of windowsInOrder(state, date, part, o.after)) {
        for (let s = w.start; s + d15 <= w.end; s += STEP) {
          const r = canPlace(state, date, d15, s);
          if (r.ok && !(r.pushes || []).length && r.date === date) return s;
        }
      }
    }
    return null;
  }
  /* is [start, start + len) quiet on `date`, with nothing to move? */
  function quietAt(state, date, len, start, after) {
    const d15 = gridDur(len);
    if (start < (after || 0)) return false;
    if (!quietRuns(state, date, 'any', 0).runs.some((w) => w.start <= start && start + d15 <= w.end)) return false;
    const r = canPlace(state, date, d15, start);
    return r.ok && !(r.pushes || []).length && r.date === date;
  }
  /* put an add on a date at a start already found quiet (no pushes to apply) */
  function putAdd(state, date, add, start) {
    memoForget(state, date);
    const dd = dateRec(state, date);
    dd.adds = dd.adds || [];
    const a = Object.assign({}, add, { id: add.id || newId('a'), start, dur: gridDur(add.dur) });
    dd.adds.push(a);
    return a;
  }
  const easyDay = (state, date) => !!(state.dates[date] && state.dates[date].preset === 'easy');
  /* == V11 goals: to-dos come first ==
     A goal's hours and a to-do's daily cap are two budgets on one day. A to-do is due soon and takes a
     little; a goal spreads its time over the weeks before its date. So when a goal's sessions hold every
     quiet minute a step could use, the step takes the place of the plan's own sessions, and the goal
     plans that time again (and says so when that leaves it behind). Sessions someone placed by hand,
     ones under way, and a day the plan is holding are never taken. */
  function yieldable(state, date, today, now) {
    const dd = state.dates[date];
    if (!dd || date < today) return [];
    const adds = dd.adds || [];
    const list = adds.filter((a) => a.src && a.src.type === 'goal' && !a.pinned && !a.skipped && !a.done && !a.partial && windowTime(today, date, a.start) >= (now || 0));
    if (!list.length) return list;
    const held = new Set(adds.filter((a) => a.src && a.src.type === 'goal' && (a.skipped || a.partial)).map((a) => a.src.id));
    return list.filter((a) => !held.has(a.src.id));
  }
  /* the board with some of a date's adds set aside (keep says which stay), without copying the rest */
  const setAside = (state, date, keep) => {
    const dd = state.dates[date] || {};
    return Object.assign({}, state, { dates: Object.assign({}, state.dates, { [date]: Object.assign({}, dd, { adds: (dd.adds || []).filter(keep) }) }) });
  };
  /* Where a step of len minutes goes on a date: the first quiet start (quietSlot), or, when a goal's own
     sessions hold the quiet time, the first start that's quiet with them set aside, and the sessions it
     would take the place of (gives). { start, gives } or null. Changes nothing. */
  function stepSpot(state, date, len, o, today, now) {
    const at = quietSlot(state, date, len, o);
    if (at != null) return { start: at, gives: [] };
    const ys = yieldable(state, date, today, now);
    if (!ys.length) return null;
    const ids = new Set(ys.map((a) => a.id));
    const s = quietSlot(setAside(state, date, (a) => !ids.has(a.id)), date, len, o);
    if (s == null) return null;
    const d15 = gridDur(len);
    return { start: s, gives: ys.filter((a) => a.start < s + d15 && s < a.start + a.dur) };
  }
  /* The goals that gave time to a to-do's steps plan again (planGoal), far enough ahead to reach the last
     day a step went to: [{ id, name, min (what they gave), shortMin, message }] */
  function replanGave(state, gave, today, nowMin, lastDay) {
    return Object.keys(gave || {}).map((id) => {
      const g = goalOf(state, id);
      if (!g) return null;
      const from = g.start && g.start > today ? g.start : today;
      const H = Math.max(diffDays(today, from) + 14, lastDay ? diffDays(today, lastDay) + 1 : 0);
      const r = planGoal(state, id, today, nowMin, { horizon: H });
      return { id, name: g.name, min: gave[id], shortMin: r.shortMin, message: r.message };
    }).filter(Boolean);
  }
  /* what giving that time did to each goal, in a line: 'Pass the bar exam’s 15 min there goes to the days
     ahead.', or, when it leaves the goal short, 'Pass the bar exam is behind by 1 h now.' */
  function gaveWords(goals) {
    return (goals || []).map((x) => (x.shortMin >= STEP ? x.name + ' is behind by ' + hoursText(x.shortMin) + ' now.' : x.name + '’s ' + hoursText(x.min) + ' there goes to the days ahead.')).join(' ');
  }

  /* == V11 goals: breaking it down ==
     The library (Data.BREAKDOWNS) first, then rules that read the verb and the thing in the name, then
     Data.BREAKDOWN_ANY. The rules know clean, write, email, text, study, read, fix, plan, buy, call,
     organize, learn, practice, pack, cook, and prep; a room, the whole house, or a count (3 chapters,
     5 thank you notes) shapes the steps. */
  const FN_WORDS = new Set(['the', 'a', 'an', 'my', 'our', 'your', 'his', 'her', 'their', 'to', 'for', 'of', 'up', 'out', 'on', 'in', 'with', 'and', 'at', 'by', 'from', 'off', 'down', 'into', 'about']);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* lowercase words with single spaces and a space at each end; kid's room is kid room */
  const bdNorm = (s) => ' ' + String(s || '').toLowerCase().replace(/[’‘`]/g, '\'').replace(/'s\b/g, '').replace(/s'(?=\s|$)/g, 's').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  /* a word and its usual endings: clean, cleans, cleaned, cleaning; tidy, tidies; shop, shopping */
  function wordRx(w) {
    if (FN_WORDS.has(w) || /\d/.test(w)) return reEsc(w);
    if (/[^aeiou]y$/.test(w)) return reEsc(w.slice(0, -1)) + '(?:y|ies|ied|ying)';
    if (/e$/.test(w)) return reEsc(w.slice(0, -1)) + '(?:e|es|ed|ing|er|ers)';
    if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w)) return reEsc(w) + '(?:s|es|ed|ing|ers?|' + w.slice(-1) + '(?:ed|ing|ers?))?';
    return reEsc(w) + '(?:s|es|ed|ing|ers?)?';
  }
  const rxCache = new Map();
  function phraseIn(n, phrase) {
    const p = phrase.replace(/^~/, '');
    let r = rxCache.get(p);
    if (!r) { r = new RegExp(' ' + bdNorm(p).trim().split(' ').filter(Boolean).map(wordRx).join(' ') + ' '); rxCache.set(p, r); }
    return r.test(n);
  }
  /* the verbs the rules read, by any of their usual endings */
  const VERB_OF = {
    clean: 'clean', tidy: 'clean', scrub: 'clean', wipe: 'clean', straighten: 'clean',
    write: 'write', draft: 'write', email: 'email', text: 'text',
    study: 'study', review: 'study', revise: 'study', cram: 'study', memorize: 'study',
    read: 'read', reread: 'read', fix: 'fix', repair: 'fix', patch: 'fix', mend: 'fix',
    plan: 'plan', schedule: 'plan', book: 'plan', arrange: 'plan', research: 'plan', figure: 'plan',
    buy: 'buy', purchase: 'buy', order: 'buy', shop: 'buy', call: 'call', phone: 'call', ring: 'call',
    organize: 'organize', organise: 'organize', sort: 'organize', declutter: 'organize', rearrange: 'organize',
    learn: 'learn', practice: 'practice', practise: 'practice', rehearse: 'practice',
    pack: 'pack', cook: 'cook', bake: 'cook', prep: 'prep', prepare: 'prep'
  };
  const FILLER = new Set(['to', 'go', 'need', 'needs', 'have', 'has', 'got', 'must', 'should', 'finally', 'start', 'finish', 'try', 'i', 'we', 'let', 'lets', 'please', 'quick', 'quickly']);
  const FOOD = /^(dinner|lunch|breakfast|brunch|soup|chili|stew|pasta|pizza|tacos|salad|curry|meal|meals|food|dessert|pie|bread|cookies|cake|muffins|eggs)$/;
  function verbOf(tok) {
    const t = tok.toLowerCase().replace(/[^a-z]/g, '');
    const tries = [t, t.replace(/s$/, ''), t.replace(/es$/, ''), t.replace(/ing$/, ''), t.replace(/ing$/, 'e'), t.replace(/(.)\1ing$/, '$1'), t.replace(/ed$/, ''), t.replace(/ed$/, 'e'), t.replace(/(.)\1ed$/, '$1'), t.replace(/ies$/, 'y'), t.replace(/ied$/, 'y'), t.replace(/ying$/, 'y')];
    for (const x of tries) if (x && VERB_OF[x]) return VERB_OF[x];
    return null;
  }
  /* the verb in the first words of a name, and what comes after it, as typed: { verb, x, at } or null */
  function readVerb(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < Math.min(words.length, 4); i++) {
      const low = words[i].toLowerCase().replace(/[^a-z]/g, '');
      if (FILLER.has(low)) continue;
      let verb = verbOf(words[i]);
      if (!verb && /^mak(e|es|ing)$/.test(low) && words[i + 1] && FOOD.test(words[i + 1].toLowerCase().replace(/[^a-z]/g, ''))) verb = 'cook';
      if (!verb) return null;
      let rest = words.slice(i + 1);
      while (rest.length && /^(up|out|through|over|for|about|down|off)$/i.test(rest[0])) rest = rest.slice(1);
      let x = rest.join(' ').replace(/[.,;:!?]+$/, '').trim() || null;
      /* getting ready for a test is studying */
      if (verb === 'prep' && x && /\b(test|exam|quiz|midterm|final)/i.test(x)) verb = 'study';
      /* text Sam back is a text to Sam */
      if (x && (verb === 'text' || verb === 'email' || verb === 'call')) x = x.replace(/\s+(back|again|later|today|tomorrow)$/i, '').trim() || null;
      return { verb, x, at: i };
    }
    return null;
  }
  const NUMS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
  /* "3 chapters", "five thank you notes": { n, noun } for 2 or more */
  function countIn(x) {
    const m = /^(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)$/i.exec(x || '');
    if (!m) return null;
    const n = /^\d+$/.test(m[1]) ? +m[1] : NUMS[m[1].toLowerCase()];
    return n >= 2 && n <= 500 ? { n, noun: m[2].toLowerCase() } : null;
  }
  const HOME_X = /^(?:the |my |our )?(?:whole |entire )?(?:house|home|apartment|flat|place|condo)$/i;
  const bs = (name, len, sub) => (sub ? { name, dur: len, sub: sub.map(([n, d, w]) => (w ? { name: n, dur: d, whole: true } : { name: n, dur: d })) } : { name, dur: len });
  const bw = (name, len) => ({ name, dur: len, whole: true });
  /* a count in chunks that fit: the first 2, 2 more, the last one */
  function countSteps(q, per, verbWord, head, tail) {
    const k = Math.max(1, Math.floor(30 / per)), chunks = Math.ceil(q.n / k), out = head.slice();
    for (let i = 0; i < chunks; i++) {
      const size = Math.min(k, q.n - i * k);
      const what = i === 0 ? (size === 1 ? 'the first one' : 'the first ' + size) : i === chunks - 1 ? (size === 1 ? 'the last one' : 'the last ' + size) : size === 1 ? 'the next one' : size + ' more';
      out.push(bs(verbWord + ' ' + what, size * per));
    }
    return out.concat(tail);
  }
  const ROOMS = ['kitchen', 'bathroom', 'living room', 'bedrooms'];
  const roomSteps = (verbWord, per, head, tail) => head.concat(ROOMS.map((r) => bs(verbWord + ' the ' + r, per)), tail);
  function ruleSteps(verb, x, q) {
    const home = !!x && HOME_X.test(x);
    switch (verb) {
      case 'clean':
        if (home) return roomSteps('Clean', 25, [bs('Do a quick lap with a trash bag', 10)], [bs('Take out the trash', 5)]);
        if (q && /^rooms?\b/.test(q.noun) && q.n <= 12) return [bs('Pick the room to start with', 5)].concat(ORD.slice(0, q.n).map((o) => bs('Clean the ' + o + ' room', 20)));
        return x ? [bs('Gather what you need to clean ' + x, 5), bs('Clear it off and pick up', 10), bs('Wipe or scrub it down', 20), bs('Sweep or vacuum', 10), bs('Put things back', 10)]
          : [bs('Pick up the clutter', 10), bs('Wipe the counters', 15), bs('Vacuum or sweep', 20), bs('Take out the trash', 5)];
      case 'write':
        if (q) return countSteps(q, 10, 'Write', [bs('Get the list, the paper, and a pen', 5)], [bs('Send them or mail them', 10)]);
        return [bs(x ? 'Jot down what ' + x + ' needs to say' : 'Jot down the main points', 10), bs('Write a rough draft', 30, [['Write the first half', 15], ['Write the second half', 15]]), bs('Read it over and fix what’s off', 15), bs('Send it or turn it in', 5)];
      case 'email':
        if (q) return countSteps(q, 10, 'Answer', [bs('Make a list of who needs an answer', 5)], [bs('Archive what’s done', 5)]);
        return [bs('Jot down what to say', 5), bs('Write the email' + (x ? ' to ' + x : ''), 15), bs('Read it over and send it', 5)];
      case 'text':
        return [bs('Write the text' + (x ? ' to ' + x : ''), 5), bs('Send it', 5)];
      case 'study':
        if (q && /^chapters?\b/.test(q.noun) && q.n <= 12) return [bs('Gather your notes and set a timer', 5)].concat(Array.from({ length: q.n }, (_, i) => bs('Study chapter ' + (i + 1), 30, [['Read chapter ' + (i + 1), 15], ['Note the key points', 15]])), [bs('Do practice questions', 20)]);
        return [bs(x ? 'Gather your notes for ' + x : 'Gather your notes and set a timer', 5), bs('Review the material', 30, [['Review the first half', 15], ['Review the second half', 15]]), bs('Do practice questions', 25, [['Do a few practice questions', 15], ['Do a few more', 10]]), bs('Go over what you missed', 15)];
      case 'read': {
        if (q && /^pages?\b/.test(q.noun)) {
          const out = [bs('Find your place and get comfortable', 5)], per = 12;
          for (let p = 1; p <= q.n && out.length < 40; p += per) { const to = Math.min(q.n, p + per - 1); out.push(bs('Read pages ' + p + ' to ' + to, Math.max(5, Math.round((to - p + 1) * 2 / 5) * 5))); }
          return out.concat([bs('Jot down what stuck', 5)]);
        }
        if (q && /^chapters?\b/.test(q.noun)) {
          const out = [bs('Find your place and get comfortable', 5)], k = q.n > 12 ? Math.ceil(q.n / 12) : 1;
          for (let c = 1; c <= q.n; c += k) { const to = Math.min(q.n, c + k - 1); out.push(c === to ? bs('Read chapter ' + c, 30) : bs('Read chapters ' + c + ' to ' + to, 30 * (to - c + 1))); }
          return out.concat([bs('Jot down what stuck', 5)]);
        }
        return [bs('Find your place and get comfortable', 5), bs('Read for 25 minutes', 25), bs('Read for 25 more minutes', 25), bs('Jot down what stuck', 5)];
      }
      case 'fix':
        return [bs('Look at what’s wrong' + (x ? ' with ' + x : ''), 10), bs('Look up how to fix it', 15), bs('Get the parts or tools', 30, [['List the parts and tools', 10], ['Get them', 20, true]]), bs('Fix it', 30, [['Start the fix', 15], ['Finish the fix', 15]]), bs('Test that it works', 5)];
      case 'plan':
        return [bs('Write down what you want' + (x ? ' from ' + x : ''), 10), bs('Look at options', 20), bs('Pick one', 10), bs('Book it or set it up', 15), bs('Tell whoever needs to know', 5)];
      case 'buy':
        return [bs('Decide what you need', 10), bs('Compare a few options', 15), bs('Order it or buy it', 15), bs('Put it away or set it up', 10)];
      case 'call':
        if (q) return countSteps(q, 10, 'Call', [bs('List who to call and their numbers', 5)], [bs('Write down what each one said', 5)]);
        return [bs('Find the number and what to say', 5), bw('Call' + (x ? ' ' + x : ''), 20), bs('Write down what you agreed', 5)];
      case 'organize':
        if (home) return roomSteps('Organize', 45, [bs('Pick the room that bugs you most', 5)], [bw('Drop off the give away pile', 20)]);
        return [bs('Pick one small corner' + (x ? ' of ' + x : '') + ' to start', 5), bs('Take everything out', 15), bs('Sort into keep, give away, and trash', 20), bs('Put back what you keep', 15), bw('Drop off the give away pile', 20)];
      case 'learn':
        return [bs('Find one good place to learn ' + (x || 'it') + ' from', 10), bs('Learn the basics', 30, [['Do the first lesson', 15], ['Try the first exercise', 15]]), bs('Practice what you learned', 20), bs('Try it on something real', 20)];
      case 'practice':
        return [bs('Set up and warm up', 5), bs('Practice the hard part', 20), bs('Practice the whole thing', 20), bs('Note what to work on next', 5)];
      case 'pack':
        return [bs('Make a list', 10), bs('Gather everything in one place', 15), bs('Pack it', 20), bs('Check the list', 5)];
      case 'cook':
        return [bs('Check you have what you need', 5), bs('Prep the ingredients', 15), bw('Cook' + (x ? ' ' + x : ''), 30), bs('Clean up', 15)];
      case 'prep':
        return [bs('Pick what to make', 10), bs('Shop for it', 45, [['Write the list', 10], ['Shop', 35, true]]), bs('Cook the batch', 60, [['Start the rice or grains', 10], ['Cook the protein', 30, true], ['Chop the vegetables', 20]]), bs('Portion it into containers', 15), bs('Clean up', 15)];
    }
    return null;
  }
  /* The best library entry for a name: the longest phrase that matches. A weak word (~) counts only
     with no verb, or with the entry's own verb. */
  function libraryMatch(n, verb, Data) {
    let best = null;
    (Data.BREAKDOWNS || []).forEach((e, i) => {
      let score = 0;
      for (const w of e.words) {
        if (!phraseIn(n, w)) continue;
        const weak = w[0] === '~';
        if (weak && verb && e.verb !== verb) continue;
        score = Math.max(score, (weak ? 0 : 1000) + w.length);
      }
      if (score && (!best || score > best.score)) best = { e, score, i };
    });
    return best ? best.e : null;
  }
  /* sizes: small expands sub steps and cuts anything over 20 minutes; big merges into four at most */
  function cutStep(s) {
    if (s.whole || s.dur <= 20) return [{ name: s.name, dur: s.dur, whole: s.whole }];
    const n = Math.ceil(s.dur / 20), base = Math.floor(s.dur / n / 5) * 5;
    let extra = s.dur - base * n;
    return Array.from({ length: n }, (_, i) => {
      const d = base + (extra > 0 ? 5 : 0);
      extra -= extra > 0 ? 5 : 0;
      return { name: s.name + (n === 2 ? (i ? ', second half' : ', first half') : ', part ' + (i + 1) + ' of ' + n), dur: d };
    });
  }
  function mergeName(list) {
    const names = list.map((s, i) => (i ? lcFirst(s.name) : s.name));
    if (names.length <= 3) return joinWords(names);
    return names[0] + ', ' + names[1] + ', and ' + (names.length - 2) + ' more';
  }
  function sizeSteps(steps, size) {
    if (size === 'small') {
      const out = [];
      for (const s of steps) for (const x of (s.sub && s.sub.length ? s.sub : [s])) out.push(...cutStep(x));
      return out;
    }
    const flat = steps.map((s) => ({ name: s.name, dur: s.dur, whole: s.whole }));
    if (size !== 'big' || flat.length <= 4) return flat;
    /* the starter stays on its own; the rest go into three runs of about the same length */
    const head = flat[0], rest = flat.slice(1), total = rest.reduce((a, s) => a + s.dur, 0), G = 3, groups = [];
    let i = 0, cum = 0;
    for (let g = 1; g <= G; g++) {
      if (g === G) { groups.push(rest.slice(i)); break; }
      const target = total * g / G, start = i;
      cum += rest[i].dur; i++;
      while (i < rest.length - (G - g) && Math.abs(cum + rest[i].dur - target) <= Math.abs(cum - target)) { cum += rest[i].dur; i++; }
      groups.push(rest.slice(start, i));
    }
    return [head].concat(groups.filter((x) => x.length).map((x) => ({ name: mergeName(x), dur: x.reduce((a, s) => a + s.dur, 0) })));
  }
  /* the first step is 10 minutes or less: a longer one splits off its first 10 minutes */
  function starterFirst(steps) {
    const f = steps[0];
    if (!f || f.dur <= 10) return steps;
    if (f.whole) return [{ name: 'Get what you need for it', dur: 5 }].concat(steps);
    return [{ name: f.name + ', first 10 minutes', dur: 10 }, { name: f.name + ', the rest', dur: f.dur - 10 }].concat(steps.slice(1));
  }
  /* The job a name asks for comes from its first words, before what it's about: a gift for a birthday
     party is buying a gift, not throwing the party; booking travel for a birthday is booking travel;
     plans for a birthday are plans; going to a party is an RSVP and a gift; making an appointment isn't
     going to it; buying a card starts with the card. Each gives a library entry's id (or null to read on).
     The name is bdNorm's: lowercase words with a space at each end. */
  const OCCASION = / (party|parties|shower|reunion|housewarming|cookout|bbq|barbecue|graduation|celebration|get together) /;
  const JOBS = [
    [/^ (?:get |buy |pick |find |order |choose |pick out )?(?:a |an |the |some )?(?:gifts?|presents?) /, (n) => (/ (wedding|shower|registry) /.test(n) ? 'registry-gift' : /^ (?:\w+ )?(?:gifts|presents) /.test(n) || / (christmas|holidays?|hanukkah|everyone|family) /.test(n) ? 'holiday-gifts' : 'gift')],
    [/^ (?:get|buy|pick|pick up|pick out|find|choose) (?:a |an |the |some )?(?:[a-z]+ )?(?:[a-z]+ )?cards? /, (n) => (/ (christmas|holiday) cards? /.test(n) ? 'holiday-cards' : 'card-buy')],
    [/^ (?:book|buy|get|find) (?:the |our |my |a )?(?:flights?|plane tickets) /, () => 'flights'],
    [/^ (?:book|plan|arrange|sort out|figure out|find) (?:the |our |my )?(?:travel|trains?|train tickets) /, () => 'book-travel'],
    [/^ travel (?:for|to) /, () => 'book-travel'],
    [/^ plans? for /, (n) => (/ anniversary /.test(n) ? 'anniversary' : 'celebrate')],
    [/^ (?:go|going|head|get) to |^ attend /, (n) => (/ wedding /.test(n) ? 'wedding-guest' : OCCASION.test(n) ? 'party-guest' : null)],
    [/^ rsvp /, () => 'rsvp'],
    [/^ (?:something|what|clothes|an outfit|outfit|outfits) (?:to wear |for )/, () => 'outfit'],
    [/^ tickets? (?:for|to) |^ (?:buy|get|book|order) (?:the |some |our )?tickets? /, () => 'tickets'],
    [/^ (?:make|book|schedule|set up|reschedule) (?:a |an |the |my |his |her |their |our )?(?:[a-z]+ )?(?:[a-z]+ )?(?:appointment|appt|checkup|check up|physical) /, () => 'book-appt']
  ];
  function jobEntry(n, Data) {
    for (const [rx, fn] of JOBS) {
      if (!rx.test(n)) continue;
      const id = fn(n);
      const e = id && (Data.BREAKDOWNS || []).find((x) => x.id === id);
      if (e) return e;
    }
    return null;
  }
  function breakdown(name, opts, Data) {
    const o = opts || {}, D = Data || {};
    const n = bdNorm(name), v = readVerb(name);
    const entry = jobEntry(n, D) || libraryMatch(n, v && v.verb, D);
    let steps = null, source = 'rules', match = null;
    if (entry) { steps = entry.steps; source = 'library'; match = entry.id; }
    if (!steps && v) { steps = ruleSteps(v.verb, v.x, countIn(v.x)); match = v.verb + (v.x ? ' ' + v.x : ''); }
    if (!steps) steps = D.BREAKDOWN_ANY || [{ name: 'Write down what done looks like', dur: 5 }, { name: 'Do the first part', dur: 25 }, { name: 'Finish it and put things away', dur: 20 }];
    /* a step about a partner or a kid only where there is one (kids or partner false, or 0, or '') */
    const noKid = o.kids === false || o.kids === 0, noPartner = o.partner === false || o.partner === '';
    const keep = (s) => !(noKid && /\{kid\}/.test(s.name)) && !(noPartner && /\{partner\}/.test(s.name));
    steps = clone(steps).filter(keep).map((s) => (s.sub ? Object.assign(s, { sub: s.sub.filter(keep) }) : s));
    const out = starterFirst(sizeSteps(steps, o.size || 'medium')).map((s) => ({ name: s.name, dur: s.dur }));
    return { steps: out, total: out.reduce((a, s) => a + s.dur, 0), source, match };
  }
  /* an exam from Data.EXAMS: the longest phrase, or a short name in capitals (SAT, ACT) */
  function examMatch(name, Data) {
    const n = bdNorm(name), raw = String(name || '');
    let best = null;
    for (const e of (Data && Data.EXAMS) || []) {
      let score = 0;
      for (const w of e.words) if (phraseIn(n, w)) score = Math.max(score, w.length);
      for (const c of e.caps || []) if (new RegExp('(^|[^A-Za-z])' + c + '([^A-Za-z]|$)').test(raw)) score = Math.max(score, c.length);
      if (score && (!best || score > best.score)) best = { e, score };
    }
    return best ? best.e : null;
  }
  /* the errands around an exam are to-dos, not the goal: paying its fee, registering for it, booking its
     date, grading one */
  const NOT_GOAL_HEAD = /^ (?:pay|register|reregister|sign up|signup|sign|book|schedule|reschedule|grade|print|bring|buy|order|send|mail|email|call|cancel|renew|pick up|drop off|apply|submit|upload|file|fill out|request|check|confirm|find|proctor|mark|return|ship|update|print out|get the results|look up) /;
  /* exams, certifications, races, theses, launches: something with a date that takes weeks */
  function looksLikeGoal(name, Data) {
    const n = bdNorm(name);
    if (!n.trim()) return false;
    if (NOT_GOAL_HEAD.test(n)) return false;
    if (examMatch(name, Data)) return true;
    const first = n.trim().split(' ')[0];
    if (!((Data && Data.GOAL_WORDS) || []).some((w) => phraseIn(n, w) && !(w === 'test' && first === 'test'))) return false;
    return !((Data && Data.GOAL_NOT) || []).some((w) => phraseIn(n, w));
  }
  /* parts for a goal: an exam's subjects, or a start for a project, a skill, a race, or an event */
  function goalForExam(name, Data) {
    const typed = String(name || '').trim(), e = examMatch(name, Data);
    const mins = (list) => list.map(([nm, h]) => ({ name: nm, min: Math.round(h * 60) }));
    /* (mix: an exam's parts take turns; so do a race's, its template says) */
    if (e) return { name: typed, exam: e.name, kind: 'exam', cat: 'work', parts: mins(e.parts), hours: e.hours, note: e.hours ? 'About ' + e.hours + ' hours is a common estimate.' : '', source: 'exam', match: e.id, mix: true };
    const n = bdNorm(name), list = (Data && Data.GOAL_TEMPLATES) || [];
    let best = null;
    for (const t of list) {
      let score = 0;
      for (const w of t.words) if (phraseIn(n, w)) score = Math.max(score, w.length);
      if (score && (!best || score > best.score)) best = { t, score };
    }
    const t = best ? best.t : list.find((x) => x.id === 'other') || { id: 'other', kind: 'other', parts: [] };
    return { name: typed, exam: null, kind: t.kind, cat: 'yours', parts: mins(t.parts), hours: null, note: '', source: 'template', match: t.id, mix: !!t.mix };
  }

  /* == V11 goals: spreading it out ==
     A to-do's steps go over the days before it's due, a little each day, under a cap. Housework spreads
     15 minutes a day by default and everything else 30. */
  const HOUSEWORK = /\b(clean|cleans|cleaning|tidy|tidying|vacuum|vacuuming|dust|dusting|mop|mopping|sweep|scrub|wipe|laundry|dishes|declutter|decluttering|chores|housework|kitchen|bathrooms?|bedroom|my room|closet|garage|fridge|fold|ironing|sheets|windows|trash|yard|rake|mow|weeds?|gutters)\b/i;
  const spreadCap = (name) => (HOUSEWORK.test(String(name || '')) ? 15 : 30);
  const dayRule = (days) => (Array.isArray(days) ? (wd) => days.includes(wd) : days === 'weekdays' ? (wd) => wd >= 1 && wd <= 5 : days === 'weekends' ? (wd) => wd === 0 || wd === 6 : () => true);
  function spreadOpts(t, opts, today) {
    const o = Object.assign({}, t.spread || {}, opts || {});
    const from = o.from && o.from > today ? o.from : today;
    return { days: o.days || 'daily', cap: Math.max(STEP, Number(o.cap) || spreadCap(t.name)), when: PART_SPAN[o.when] ? o.when : 'any', from, by: o.by || t.due || addDays(from, 6) };
  }
  /* how many days of `cap` minutes some steps need, in order, a long one on a day of its own */
  function daysFor(lens, cap) {
    let n = 0, cur = Infinity;
    for (const d of lens) {
      if (cur + d <= cap) cur += d;
      else { n++; cur = d > cap ? Infinity : d; }
    }
    return n;
  }
  function shortText(n, by, today) {
    if (by < today) return 'Its due date has gone by. Pick a day to be done by.';
    const more = n === 1 ? 'one more day' : n + ' more days';
    if (by === today) return 'This needs ' + more + ' after today.';
    return 'This needs ' + more + (n === 1 ? ' than is' : ' than are') + ' left before ' + dayWord(by, today) + '.';
  }
  function spreadPlan(state, taskId, opts, today, nowMin) {
    /* (a plan the person said yes to may use own time: worked out with it allowed) */
    if (opts && opts.own && !ownOk) return withOwn(true, () => spreadPlan(state, taskId, opts, today, nowMin));
    const t = state.tasks.find((x) => x.id === taskId);
    const o = t ? spreadOpts(t, opts, today) : null;
    const res = { ok: false, days: [], unplaced: [], need: 0, room: 0, by: o ? o.by : null, message: '', opts: o, today, nowMin: nowMin == null ? null : nowMin };
    if (!t) return Object.assign(res, { message: 'That to-do is gone.' });
    if (!(t.steps || []).length) return Object.assign(res, { message: 'Break it into steps first, then spread them out.' });
    const open = t.steps.filter((s) => !s.done);
    if (t.done || !open.length) return Object.assign(res, { ok: true, message: 'Every step is done.' });
    const now = nowMin == null ? 0 : nowMin;
    const pl = placements(state).get(t.id) || [];
    const ahead = (p) => windowTime(today, p.date, p.add.start) + p.add.dur > now;
    /* steps with a time still ahead stay where they are; the rest need one */
    const todo = open.filter((s) => !pl.some((p) => p.step === s.id && ahead(p)));
    if (!todo.length) return Object.assign(res, { ok: true, message: 'Every step already has a time.' });
    const moving = new Set(todo.map((s) => s.id));
    const used0 = {}, replaces = {};
    const sim0 = clone(state);
    pl.forEach((p) => {
      if (p.step && moving.has(p.step)) { (replaces[p.step] = replaces[p.step] || []).push(p.add.id); removeAdd(sim0, p.add.id); return; }
      used0[p.date] = (used0[p.date] || 0) + p.add.dur;
    });
    const allowed = dayRule(o.days), days = [];
    for (let d = o.from; d <= o.by && days.length < 366; d = addDays(d, 1)) if (allowed(weekday(d)) && !tripOn(state, d) && !easyDay(state, d)) days.push(d);
    const startOf = (d) => (d === today ? ceilGrid(now) : 0);
    res.need = todo.reduce((a, s) => a + gridDur(s.dur), 0);
    res.room = withRecMemo(state, () => days.reduce((a, d) => a + Math.max(0, Math.min(o.cap - (used0[d] || 0), quietMinutes(state, d, 'any', startOf(d)))), 0));
    /* Each step in order, aimed at its share of the days (targets: step i of n on day i * days / n, so
       four steps over thirteen days land about every third day, and six over six land one a day), on the
       first day from there with room under the cap, then the days before it. A day's quiet time comes
       first; when a goal's own sessions hold all of it, the step takes their place (to-dos come first:
       the goal plans that time again). Without targets, the first day with room (packed from the start),
       which the plan falls back on when aiming leaves a step without a day. */
    /* a step keeps its place in the order behind the steps the plan already put ahead of it (Dust on Monday
       means Vacuum comes Monday or after, the way finding new times keeps them); one placed by hand doesn't
       hold the others to it */
    const ids = t.steps.map((x) => x.id), set = pl.filter((p) => p.step && !moving.has(p.step) && ahead(p) && !p.add.pinned);
    const floorOf = todo.map((x) => {
      const i = ids.indexOf(x.id);
      let d = null;
      set.forEach((p) => { if (ids.indexOf(p.step) < i && (!d || p.date > d)) d = p.date; });
      if (!d) return 0;
      const k = days.findIndex((x2) => x2 >= d);
      return k < 0 ? days.length : k;
    });
    const place = (targets) => {
      const sim = clone(sim0), used = Object.assign({}, used0), items = [], unplaced = [];
      let di = 0, lastEnd = null;
      todo.forEach((s, i) => {
        const lo = Math.max(di, floorOf[i]), len = gridDur(s.dur), t0 = targets ? Math.max(lo, targets[i]) : lo;
        const order = [];
        for (let k = t0; k < days.length; k++) order.push(k);
        for (let k = lo; k < t0; k++) order.push(k);
        let put = null;
        for (const k of order) {
          const d = days[k], u = used[d] || 0;
          if (!(u + len <= o.cap || (u === 0 && len > o.cap))) continue;
          const spot = stepSpot(sim, d, len, { when: o.when, after: Math.max(startOf(d), k === di && lastEnd != null ? lastEnd : 0) }, today, now);
          if (!spot) continue;
          spot.gives.forEach((a) => removeAdd(sim, a.id));
          putAdd(sim, d, { name: s.name, cat: t.cat, icon: t.icon, dur: len, src: { type: 'step', task: t.id, id: s.id } }, spot.start);
          used[d] = u + len;
          put = { date: d, step: s.id, name: s.name, start: spot.start, dur: len, part: partOf(spot.start), replaces: replaces[s.id] || [], takes: spot.gives.map((a) => ({ add: a.id, goal: a.src.id, min: a.dur })) };
          di = k; lastEnd = spot.start + len;
          break;
        }
        if (put) items.push(put); else unplaced.push(s.id);
      });
      return { items, unplaced };
    };
    let got = place(todo.map((s, i) => Math.floor((i * days.length) / todo.length)));
    if (got.unplaced.length) { const packed = place(null); if (packed.unplaced.length < got.unplaced.length) got = packed; }
    const items = got.items;
    res.unplaced = got.unplaced;
    items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start)).forEach((it) => {
      let day = res.days[res.days.length - 1];
      if (!day || day.date !== it.date) { day = { date: it.date, items: [] }; res.days.push(day); }
      day.items.push({ step: it.step, name: it.name, start: it.start, dur: it.dur, part: it.part, replaces: it.replaces, takes: it.takes });
    });
    /* the goals whose sessions a step would take the place of, and how much: [{ goal, name, min }] */
    const gave = {};
    items.forEach((it) => it.takes.forEach((x) => { gave[x.goal] = (gave[x.goal] || 0) + x.min; }));
    res.gave = Object.keys(gave).map((id) => ({ goal: id, name: (goalOf(state, id) || {}).name || '', min: gave[id] }));
    res.ok = !res.unplaced.length;
    /* the own time it takes, by day, for the question that asks first: { min, days: [{ date, min, part, name }] } */
    if (opts && opts.own) {
      const by = {};
      items.forEach((it) => { const x = ownTimeOf(state, it.date, it.start, it.dur); if (!x.min) return; const d = by[it.date] || (by[it.date] = { date: it.date, min: 0, part: partOf(it.start), name: x.name }); d.min += x.min; });
      const list = Object.keys(by).sort().map((k) => by[k]);
      res.own = { min: list.reduce((a, x) => a + x.min, 0), days: list };
      res.opts.own = true;
    }
    const total = items.reduce((a, x) => a + x.dur, 0), last = res.days.length ? res.days[res.days.length - 1].date : null;
    if (res.ok) {
      const steps = items.length === 1 ? 'One step' : items.length + ' steps';
      res.message = res.days.length === 1 ? steps + ' ' + onDay(last, today) + ', ' + minutesText(total) + '.'
        : steps + ' over ' + res.days.length + ' days, about ' + minutesText(Math.max(5, Math.round(total / res.days.length / 5) * 5)) + ' a day, done ' + doneBy(last, today) + '.';
      /* a goal's time it takes, said once: the goal plans that time again */
      if (res.gave.length) res.message += ' ' + gaveText(res.gave);
    } else {
      const lens = res.unplaced.map((id) => gridDur((t.steps.find((s) => s.id === id) || {}).dur));
      res.message = shortText(Math.max(1, daysFor(lens, o.cap)), o.by, today);
    }
    return res;
  }
  /* 'It takes 30 min of Pass the bar exam’s time, which goes to the days ahead.' */
  function gaveText(list) {
    const names = list.map((x) => x.name || 'a goal'), min = list.reduce((a, x) => a + x.min, 0);
    return 'It takes ' + hoursText(min) + ' of ' + joinWords(names.map((n) => n + '’s')) + ' time, which goes to the days ahead.';
  }
  /* Place a plan from spreadPlan (re-checking each time: a spot taken since goes to the next quiet one
     that day) and keep how it was spread on the to-do (task.spread). A goal's session the plan said a
     step takes the place of comes off, and its goal plans again. Returns how many steps were placed;
     out (optional) gets goals: [{ id, name, min, shortMin, message }] for the goals that gave time. */
  function applySpread(state, taskId, plan, opts, out) {
    /* (placed the way it was worked out: with own time when the person said yes to it) */
    if (((opts && opts.own) || (plan && plan.opts && plan.opts.own)) && !ownOk) return withOwn(true, () => applySpread(state, taskId, plan, opts, out));
    const t = state.tasks.find((x) => x.id === taskId);
    if (!t || !plan) return 0;
    const today = plan.today || todayIso(), now = plan.nowMin == null ? 0 : plan.nowMin;
    const o = Object.assign({}, plan.opts || spreadOpts(t, opts, today), opts || {});
    const pl = placements(state).get(t.id) || [];
    const ahead = (id) => pl.some((p) => p.step === id && windowTime(today, p.date, p.add.start) + p.add.dur > now);
    const gave = {};
    const take = (date, list) => list.forEach((a) => {
      const f = findAdd(state, a.add || a.id);
      if (!f || f.date !== date || !yieldable(state, date, today, now).includes(f.add)) return;
      removeAdd(state, f.add.id);
      memoForget(state, date);
      gave[f.add.src.id] = (gave[f.add.src.id] || 0) + f.add.dur;
    });
    let n = 0, lastDay = null;
    for (const day of plan.days || []) {
      let after = day.date === today ? ceilGrid(now) : 0;
      for (const it of day.items || []) {
        const s = (t.steps || []).find((x) => x.id === it.step);
        if (!s || s.done || ahead(s.id)) continue;
        (it.replaces || []).forEach((id) => removeAdd(state, id));
        const add = { name: s.name, cat: t.cat, icon: t.icon, dur: gridDur(it.dur || s.dur), src: { type: 'step', task: t.id, id: s.id } };
        take(day.date, it.takes || []);
        let at = it.start >= after && quietAt(state, day.date, add.dur, it.start, after) ? it.start : null;
        if (at == null) { const spot = stepSpot(state, day.date, add.dur, { when: o.when, after }, today, now); if (spot) { take(day.date, spot.gives); at = spot.start; } }
        if (at == null) continue;
        putAdd(state, day.date, add, at);
        after = at + add.dur;
        lastDay = day.date;
        n++;
      }
    }
    t.spread = { days: o.days || 'daily', cap: o.cap || spreadCap(t.name), when: o.when || 'any' };
    if (o.by && o.by !== t.due) t.spread.by = o.by;
    const goals = replanGave(state, gave, today, plan.nowMin == null ? null : plan.nowMin, lastDay);
    if (out) out.goals = goals;
    return n;
  }

  /* == V11 goals: finding new times == */
  /* Open steps whose every time has gone by: [{ task, step, name, date, start, dur, add }] */
  function missedSteps(state, today, nowMin) {
    const pl = placements(state), now = nowMin == null ? 0 : nowMin, out = [];
    for (const t of state.tasks) {
      if (t.done || t.archived) continue;
      const where = pl.get(t.id) || [];
      for (const s of t.steps || []) {
        if (s.done) continue;
        const mine = where.filter((p) => p.step === s.id);
        if (!mine.length || mine.some((p) => windowTime(today, p.date, p.add.start) + p.add.dur > now)) continue;
        const last = mine.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.add.start - a.add.start))[0];
        out.push({ task: t.id, step: s.id, name: s.name, date: last.date, start: last.add.start, dur: last.add.dur, add: last.add.id });
      }
    }
    return out;
  }
  /* A to-do's missed steps move forward, the way it was spread (task.spread, or the default): a missed
     step takes the next day's room and later steps slide a day when their day would go over its cap.
     Steps that can't fit by the date come off the board and are named in unplaced, so no day goes over.
     A step you pinned stays put. Calling it again moves nothing: nothing is missed any more.
     opts.preview: work it out without changing the board. */
  function reflowTask(state, taskId, today, nowMin, opts) {
    if (opts && opts.own && !ownOk) return withOwn(true, () => reflowTask(state, taskId, today, nowMin, opts));
    const st = opts && opts.preview ? clone(state) : state;
    const res = { moved: [], unplaced: [], message: '' };
    const t = st.tasks.find((x) => x.id === taskId);
    if (!t || t.done) return res;
    const now = nowMin == null ? 0 : nowMin;
    const pl = placements(st).get(t.id) || [];
    const isAhead = (p) => windowTime(today, p.date, p.add.start) + p.add.dur > now;
    const byTime = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.add.start - b.add.start);
    const info = (t.steps || []).filter((s) => !s.done).map((s) => {
      const mine = pl.filter((p) => p.step === s.id), ahead = mine.filter(isAhead).sort(byTime)[0] || null;
      return { s, mine, ahead, missed: mine.length && !ahead ? mine.slice().sort(byTime).pop() : null };
    });
    if (!info.some((x) => x.missed)) return res;
    const sp = spreadOpts(t, null, today);
    const lastAhead = pl.filter(isAhead).map((p) => p.date).sort().pop() || null;
    let by = (t.spread && t.spread.by) || t.due || maxDate(lastAhead || today, addDays(today, 6));
    const late = by < today;
    if (late) by = addDays(today, 13);
    /* the steps that can move: the missed ones and the ones ahead that weren't pinned, in order */
    const seq = info.filter((x) => x.missed || (x.ahead && !x.ahead.add.pinned && !inOwnTime(st, x.ahead.date, x.ahead.add)));
    /* a missed step leaves all its times; a step ahead leaves the time it has, and may get it back */
    const leaving = new Set();
    seq.forEach((x) => { if (x.missed) x.mine.forEach((p) => leaving.add(p.add.id)); else leaving.add(x.ahead.add.id); });
    const used = {};
    pl.forEach((p) => { if (!leaving.has(p.add.id)) used[p.date] = (used[p.date] || 0) + p.add.dur; });
    leaving.forEach((id) => removeAdd(st, id));
    const allowed = dayRule(sp.days);
    const okDay = (d) => allowed(weekday(d)) && !tripOn(st, d) && !easyDay(st, d);
    const fits = (d, len) => { const u = used[d] || 0; return u + len <= sp.cap || (u === 0 && len > sp.cap); };
    const gave = {};
    let pointer = today, lastDay = null, lastEnd = 0;
    for (const x of seq) {
      const len = gridDur(x.s.dur), base = x.ahead ? x.ahead.add : x.missed.add;
      const after = (d) => Math.max(d === today ? ceilGrid(now) : 0, d === lastDay ? lastEnd : 0);
      /* a step ahead keeps its time when its day still has room under the cap */
      if (x.ahead && fits(x.ahead.date, len) && quietAt(st, x.ahead.date, len, base.start, after(x.ahead.date))) {
        putAdd(st, x.ahead.date, base, base.start);
        used[x.ahead.date] = (used[x.ahead.date] || 0) + len;
        pointer = maxDate(pointer, x.ahead.date); lastDay = x.ahead.date; lastEnd = base.start + len;
        continue;
      }
      let d = x.ahead ? maxDate(pointer, x.ahead.date) : maxDate(pointer, maxDate(today, addDays(x.missed.date, 1)));
      let at = null;
      for (; d <= by; d = addDays(d, 1)) {
        if (!okDay(d) || !fits(d, len)) continue;
        /* quiet time first; a goal's own sessions make room when they hold all of it (to-dos come first) */
        const spot = stepSpot(st, d, len, { when: sp.when, after: after(d) }, today, now);
        if (!spot) continue;
        spot.gives.forEach((a) => { removeAdd(st, a.id); memoForget(st, d); gave[a.src.id] = (gave[a.src.id] || 0) + a.dur; });
        at = spot.start;
        break;
      }
      if (at == null) { res.unplaced.push(x.s.id); continue; }
      const copy = Object.assign({}, base);
      delete copy.pinned;
    delete copy.own;
      delete copy.own;
      const a = putAdd(st, d, copy, at);
      used[d] = (used[d] || 0) + len;
      pointer = d; lastDay = d; lastEnd = at + len;
      res.moved.push({ step: x.s.id, name: x.s.name, from: x.ahead ? x.ahead.date : x.missed.date, to: d, start: at, add: a.id, missed: !!x.missed });
    }
    const missedMoves = res.moved.filter((m) => m.missed);
    let line = '';
    if (missedMoves.length === 1) line = missedMoves[0].name + ' moved to ' + dayWord(missedMoves[0].to, today) + '.';
    else if (missedMoves.length > 1) {
      const to = Array.from(new Set(missedMoves.map((m) => m.to)));
      line = to.length === 1 ? joinWords(missedMoves.map((m, i) => (i ? lcFirst(m.name) : m.name))) + ' moved to ' + dayWord(to[0], today) + '.'
        : missedMoves.length + ' steps moved to ' + (to.length <= 3 ? joinWords(to.sort().map((d) => dayWord(d, today))) : 'the days ahead') + '.';
    }
    if (res.unplaced.length) {
      /* never a step off the board without its name: 'Vacuum doesn’t fit by Saturday now.' (the app offers
         the choices: a little more a day, a later day, or that step off) */
      const names = res.unplaced.map((id) => (t.steps.find((s) => s.id === id) || {}).name).filter(Boolean);
      res.short = names;
      const who = names.length <= 2 ? joinWords(names.map((n, i) => (i ? lcFirst(n) : n))) : names.length + ' steps';
      line += (line ? ' ' : '') + who + (names.length === 1 ? ' doesn’t fit ' : ' don’t fit ') + (late ? 'in the next two weeks' : by === today ? 'in what’s left of today' : 'by ' + dayWord(by, today)) + ' now.';
    } else if (line) {
      const lastNow = (placements(st).get(t.id) || []).filter(isAhead).map((p) => p.date).sort().pop() || today;
      line += late ? ' Done ' + doneBy(lastNow, today) + '.' : ' Still done ' + doneBy(by, today) + '.';
    }
    /* the goals whose sessions made room plan again, and say what that did */
    res.goals = replanGave(st, gave, today, nowMin == null ? null : nowMin, lastDay);
    if (res.goals.length && line) line += ' ' + gaveWords(res.goals);
    res.message = line;
    return res;
  }

  /* == V11 goals: goals ==
     A goal has a date, parts with minutes, and a rhythm: which days, how long on a weekday and on a
     weekend day (wd, we: the most a day takes), when in the day, and the longest session (chunk). Its
     sessions are adds (src { type: 'goal', id, part }); one the person dragged is pinned and stays,
     and one that didn't happen is skipped: it stays as a record and takes no time on the board. A
     session counts as done once someone says it happened (done: the morning question's Yes, Done, or
     Done early; partial: some of it); one whose time went by with no word is unconfirmed. An exam's or a
     race's parts take turns (mix): a subject a session, every part a little each week, practice with the
     rest, and the last three days before the date at half the day's time. */
  const GOAL_KINDS = ['exam', 'project', 'skill', 'event', 'other'];
  const GOAL_ICON = { exam: 'book', project: 'note', skill: 'star', event: 'calendar', other: 'flag' };
  /* the most a part can take: a thousand hours */
  const PART_MAX = 60000;
  function newGoal(fields) {
    const f = fields || {};
    const kind = GOAL_KINDS.includes(f.kind) ? f.kind : 'other';
    const list = Array.isArray(f.parts) && f.parts.length ? f.parts : [{ name: '', min: f.min || 0 }];
    const r = Object.assign({ days: [0, 1, 2, 3, 4, 5, 6], wd: 60, we: 60, when: 'any', chunk: 60 }, f.rhythm || {});
    const g = {
      id: f.id || newId('g'), name: String(f.name || '').trim(), kind, date: f.date || null, start: f.start || f.today || todayIso(),
      parts: list.map((p) => ({ id: p.id || newId('gp'), name: String(p.name || '').trim(), min: Math.min(PART_MAX, Math.max(0, Math.round(Number(p.min) || 0))), done: !!p.done })),
      rhythm: { days: (Array.isArray(r.days) ? r.days : [0, 1, 2, 3, 4, 5, 6]).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6), wd: Math.max(0, Number(r.wd) || 0), we: Math.max(0, Number(r.we) || 0), when: PART_SPAN[r.when] ? r.when : 'any', chunk: Math.max(STEP, Number(r.chunk) || 60) },
      cat: f.cat || (kind === 'exam' ? 'work' : 'yours'), icon: f.icon || GOAL_ICON[kind], paused: !!f.paused, archived: !!f.archived, answers: Object.assign({}, f.answers)
    };
    /* (kept only when it's said: a goal without it mixes when it's an exam) */
    if (f.mix != null) g.mix = !!f.mix;
    /* V11-2: a goal with no date runs on how many times a week (rhythm.n, 1 to 7), kept only when it's said */
    const n = Math.round(Number(r.n));
    if (n >= 1) g.rhythm.n = Math.min(7, n);
    return g;
  }
  /* an exam's parts, or a race's, take turns; a project's or a skill's go in order */
  const mixes = (g) => (g && g.mix != null ? !!g.mix : !!g && g.kind === 'exam');
  /* the last days before the date are lighter, at half the day's time (exams and races) */
  const TAPER = 3;
  const tapers = (g, date) => mixes(g) && !!g.date && date < g.date && diffDays(date, g.date) <= TAPER;
  const goalOf = (state, goal) => (goal && typeof goal === 'object' ? goal : (state.goals || []).find((g) => g.id === goal) || null);
  /* V11-2: a goal's first week, the seven days from its start (or before it starts): nothing says Behind then, since
     the plan has only begun (goalProgress gives it as firstWeek) */
  /* (V11-3, C28: a goal saved with no start counts from its first session; with none, its first week is over) */
  const goalFirstWeek = (g, today, state) => {
    const from = g.start || (state ? (goalSessions(state, g.id)[0] || {}).date : null);
    return !!from && diffDays(from, today) < 7;
  };
  /* every session of a goal, in time order: [{ date, add }] */
  function goalSessions(state, goalId) {
    const out = [];
    for (const date of Object.keys(state.dates)) for (const a of state.dates[date].adds || []) if (a.src && a.src.type === 'goal' && a.src.id === goalId) out.push({ date, add: a });
    return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.add.start - y.add.start));
  }
  /* the most a day takes for a goal: its rhythm's time for that kind of day, halved in the last days */
  const goalCap = (g, date) => {
    const wd = weekday(date), r = g.rhythm || {}, base = (r.days || []).includes(wd) ? ((wd === 0 || wd === 6 ? r.we : r.wd) || 0) : 0;
    return base > 0 && tapers(g, date) ? Math.max(STEP, floorGrid(base / 2)) : base;
  };
  /* the days a goal can use, from today (or the day it starts, if that's later) to the day before its date */
  function goalDays(state, g, today) {
    const out = [];
    if (!g.date) return out;
    for (let d = maxDate(today, g.start || today); d < g.date && out.length < 1100; d = addDays(d, 1)) if (goalCap(g, d) > 0 && !tripOn(state, d) && !easyDay(state, d)) out.push(d);
    return out;
  }
  /* someone said it happened: Done (or the morning question's Yes, or Some of it) */
  const confirmed = (g, x) => !!(x.add.done || x.add.partial || (g.answers && (g.answers[x.date] === 'yes' || g.answers[x.date] === 'some')));
  /* what a goal's sessions add up to, by part and by day: done (ended and confirmed), unconfirmed (ended
     with no word yet; the plan counts it as having happened, and nothing says it's done), and ahead */
  function goalTally(state, g, today, nowMin) {
    const now = nowMin == null ? 0 : nowMin, sessions = goalSessions(state, g.id);
    const ended = (x) => windowTime(today, x.date, x.add.start) + x.add.dur <= now;
    const t = { sessions, doneBy: {}, unconfBy: {}, aheadBy: {}, spent: {}, own: {}, ended, confirmed: (x) => confirmed(g, x) };
    for (const x of sessions) {
      const k = x.add.src.part || '';
      if (x.add.skipped || ended(x)) t.spent[x.date] = (t.spent[x.date] || 0) + x.add.dur;
      if (x.add.skipped) continue;
      if (ended(x)) { if (confirmed(g, x)) t.doneBy[k] = (t.doneBy[k] || 0) + x.add.dur; else t.unconfBy[k] = (t.unconfBy[k] || 0) + x.add.dur; }
      else { t.aheadBy[k] = (t.aheadBy[k] || 0) + x.add.dur; t.own[x.date] = (t.own[x.date] || 0) + x.add.dur; }
    }
    return t;
  }
  const quietMinutes = (state, date, when, after, dayOf) => quietWindows(state, date, when, after, dayOf).reduce((a, w) => a + w.end - w.start, 0);
  /* Days from today on where one of the goal's sessions was skipped or kept short: the person said how
     that day went, so the planner leaves it as it is. Nothing new goes on it, nothing on it comes off,
     and its time spreads forward from the next day. */
  const heldDays = (sessions, today) => new Set(sessions.filter((x) => x.date >= today && (x.add.skipped || x.add.partial)).map((x) => x.date));
  /* opts.day: the app's cached calendarDay for the board as it is now, so a what-if (another day, longer
     days, a later date) costs little; without it each day is worked out here */
  function goalProgress(state, goal, today, nowMin, opts) {
    const g = goalOf(state, goal);
    if (!g) return null;
    return withRecMemo(state, () => progressOf(state, g, today, nowMin, opts && opts.day));
  }
  function progressOf(state, g, today, nowMin, dayOf) {
    const now = nowMin == null ? 0 : nowMin, tl = goalTally(state, g, today, nowMin);
    /* done is only what someone said happened; time that went by with no word is unconfirmed, and what's
       left to plan counts it as having happened (the morning question asks, and No gives it back) */
    const parts = (g.parts || []).map((p) => {
      const did = tl.doneBy[p.id] || 0, unc = tl.unconfBy[p.id] || 0, doneMin = p.done ? p.min : Math.min(p.min, did);
      return { id: p.id, name: p.name, min: p.min, done: !!p.done, doneMin, unconfirmedMin: p.done ? 0 : Math.min(p.min - doneMin, unc), leftMin: p.done ? 0 : Math.max(0, p.min - did - unc) };
    });
    const totalMin = parts.reduce((a, p) => a + p.min, 0), doneMin = parts.reduce((a, p) => a + p.doneMin, 0), unconfirmedMin = parts.reduce((a, p) => a + p.unconfirmedMin, 0);
    const leftMin = parts.reduce((a, p) => a + p.leftMin, 0);
    const days = goalDays(state, g, today), held = heldDays(tl.sessions, today);
    let capacityMin = 0;
    for (const d of days) {
      const room = Math.max(0, goalCap(g, d) - (tl.spent[d] || 0));
      /* a day left as it is holds only what's still on it */
      capacityMin += held.has(d) ? Math.min(room, tl.own[d] || 0) : Math.min(room, floorGrid(quietMinutes(state, d, (g.rhythm || {}).when, d === today ? ceilGrid(now) : 0, dayOf) + (tl.own[d] || 0)));
    }
    const ws = weekStart(today), we = addDays(ws, 6), week = { plannedMin: 0, doneMin: 0, unconfirmedMin: 0 };
    let next = null;
    for (const x of tl.sessions) {
      if (x.add.skipped) continue;
      if (x.date >= ws && x.date <= we) { week.plannedMin += x.add.dur; if (tl.ended(x)) { if (tl.confirmed(x)) week.doneMin += x.add.dur; else week.unconfirmedMin += x.add.dur; } }
      if (!next && !tl.ended(x)) next = { date: x.date, start: x.add.start, dur: x.add.dur, name: x.add.name, part: x.add.src.part || null, add: x.add.id };
    }
    /* V11-2: a goal with no date has no total and is never behind: a quiet week is a quiet week. done is every
       minute someone said happened; perWeek is this week's sessions against how many times a week it runs:
       { n, done (sessions someone said happened), planned (sessions on the week, skipped ones left out) } */
    if (!g.date) {
      const wk = tl.sessions.filter((x) => !x.add.skipped && x.date >= ws && x.date <= we), sum = (o) => Object.values(o).reduce((a, m) => a + m, 0);
      return {
        totalMin: 0, doneMin: sum(tl.doneBy), unconfirmedMin: sum(tl.unconfBy), leftMin: 0, daysLeft: null, capacityMin: 0, behindMin: 0, onTrack: true,
        week, nextSession: next, partsLeft: 0, perDay: 0,
        parts: (g.parts || []).map((p) => ({ id: p.id, name: p.name, min: p.min, done: !!p.done, doneMin: tl.doneBy[p.id] || 0, unconfirmedMin: tl.unconfBy[p.id] || 0, leftMin: 0 })),
        perWeek: { n: weekTimes(g), done: wk.filter((x) => tl.confirmed(x)).length, planned: wk.length }, firstWeek: goalFirstWeek(g, today, state)
      };
    }
    const behindMin = Math.max(0, leftMin - capacityMin);
    return {
      totalMin, doneMin, unconfirmedMin, leftMin, daysLeft: g.date ? Math.max(0, diffDays(today, g.date)) : null, capacityMin, behindMin, onTrack: behindMin === 0,
      week, nextSession: next, partsLeft: parts.filter((p) => !p.done && p.leftMin > 0).length, parts,
      perDay: days.length ? Math.round(leftMin / days.length) : 0, firstWeek: goalFirstWeek(g, today, state)
    };
  }
  /* Spread `total` minutes over days in proportion to each day's weight (its cap), never over a day's
     room: the share rises evenly until it meets each day's room. Returns { alloc, short }. */
  function evenShares(total, list) {
    const alloc = list.map(() => 0);
    const room = list.reduce((a, d) => a + d.c, 0);
    if (room <= total) return { alloc: list.map((d) => d.c), short: total - room };
    const act = list.map((d, i) => ({ i, w: d.w, c: d.c })).filter((d) => d.w > 0 && d.c > 0).sort((a, b) => a.c / a.w - b.c / b.w);
    let rest = total, wsum = act.reduce((a, d) => a + d.w, 0);
    for (let k = 0; k < act.length; k++) {
      const lam = rest / wsum, d = act[k];
      if (d.c <= lam * d.w) { alloc[d.i] = d.c; rest -= d.c; wsum -= d.w; continue; }
      for (let j = k; j < act.length; j++) alloc[act[j].i] = lam * act[j].w;
      break;
    }
    return { alloc, short: 0 };
  }
  /* Plan a goal's next days (opts.horizon, 14 by default): its sessions there that haven't started come
     off, unless pinned or skipped, and what's left goes back on, spread evenly over every day it can use
     until its date, in proportion to each day's cap, within the quiet time of the part of the day it
     likes, in sessions no longer than its chunk. Parts go in order, or for an exam or a race (mixes)
     take turns: each session goes to the part furthest behind its share, never the same part twice
     running when another has time left. Nothing goes on a trip day, an easy day, or the goal's own date.
     Returns { placed, removed, shortMin, message }. */
  /* opts: { horizon: 14, day } (day as goalProgress has it, used only past the horizon, which planning
     doesn't change). V11-2: own (true, or the last date it may) lets the plan use the person's own time after the open
     time, once they said yes: a session that takes some is marked own (V11-3: never pinned), so planning again keeps it, and the result gives
     own: { min, days: [{ date, min, part, name }] }, the way spreadPlan does */
  function planGoal(state, goalId, today, nowMin, opts) {
    return withRecMemo(state, () => planGoalNow(state, goalId, today, nowMin, opts || {}));
  }
  function planGoalNow(state, goalId, today, nowMin, opts) {
    const g = goalOf(state, goalId);
    const res = { placed: 0, removed: 0, shortMin: 0, message: '' };
    if (!g) return Object.assign(res, { message: 'That goal is gone.' });
    const now = nowMin == null ? 0 : nowMin, H = Math.max(1, opts.horizon || 14);
    const last = g.date ? addDays(g.date, -1) : addDays(today, H - 1), hEnd = minDate(addDays(today, H - 1), last);
    const sessions0 = goalSessions(state, g.id), held = heldDays(sessions0, today);
    for (const x of sessions0) {
      if (x.add.pinned || x.add.skipped || held.has(x.date) || x.date < today || x.date > hEnd || windowTime(today, x.date, x.add.start) < now) continue;
      /* V11-3 (C7, C16): a session in the person's own time stays where it is while the goal runs: one their yes put there
         (own), and one a plan placed there before own time was kept for them, which planning again couldn't put back */
      if (!g.archived && !g.paused && (!g.date || x.date < g.date) && inOwnTime(state, x.date, x.add)) continue;
      removeAdd(state, x.add.id);
      memoForget(state, x.date);
      res.removed++;
    }
    if (g.archived) return res;
    if (g.paused) return Object.assign(res, { message: 'Paused. Nothing new goes on the board.' });
    /* V11-2: a goal with no date plans by the week (planWeekly) */
    if (!g.date) return planWeekly(state, g, today, nowMin, H, held, res);
    if (g.date <= today) return Object.assign(res, { message: g.date === today ? 'Today’s the day.' : 'Its date has gone by.' });
    const tl = goalTally(state, g, today, nowMin);
    /* each part's minutes still to place: what's done, unconfirmed, or already ahead counts as had */
    const queue = (g.parts || []).map((p) => {
      const had = (tl.doneBy[p.id] || 0) + (tl.unconfBy[p.id] || 0) + (tl.aheadBy[p.id] || 0);
      return { p, had, left: p.done ? 0 : Math.max(0, p.min - had) };
    }).filter((x) => x.left > 0);
    const mix = mixes(g);
    let prev = null;
    /* the part the next session is for: the first with time left, or, taking turns, the one furthest behind
       its share (the least of it had so far), not the part right before it when another has time left */
    const nextPart = () => {
      const open = queue.filter((x) => x.left >= 1);
      if (!open.length) return null;
      if (!mix) return open[0];
      const pool = open.length > 1 && prev ? open.filter((x) => x !== prev) : open;
      return pool.reduce((best, x) => (x.had / x.p.min < best.had / best.p.min - 1e-9 ? x : best));
    };
    const toPlace = queue.reduce((a, x) => a + x.left, 0);
    if (!toPlace) return Object.assign(res, { message: (g.parts || []).every((p) => p.done) ? 'Every part is done.' : weekLine(state, g, today, nowMin) || 'Everything left already has a time.' });
    const when = (g.rhythm || {}).when, chunk = Math.max(STEP, floorGrid((g.rhythm || {}).chunk || 60));
    /* V11-2: own time where the person said yes (opts.own), after the open time; what each session takes of it */
    const ownOn = (d) => !!opts.own && (opts.own === true || d <= opts.own);
    const q = (d, fn) => (opts.own ? withOwn(ownOn(d), fn) : fn());
    const ownBy = {};
    const tookOwn = (d, s, len) => {
      if (!ownOn(d)) return false;
      const x = ownTimeOf(state, d, s, len);
      if (!x.min) return false;
      const e = ownBy[d] || (ownBy[d] = { date: d, min: 0, part: partOf(s), name: x.name });
      e.min += x.min;
      return true;
    };
    const days = goalDays(state, g, today).map((d) => {
      const room = held.has(d) ? 0 : Math.max(0, goalCap(g, d) - (tl.spent[d] || 0) - (tl.own[d] || 0));
      return { d, w: goalCap(g, d), c: room ? floorGrid(Math.min(room, q(d, () => quietMinutes(state, d, when, d === today ? ceilGrid(now) : 0, d > hEnd ? opts.day : null)))) : 0 };
    });
    const share = evenShares(toPlace, days);
    res.shortMin = Math.round(share.short);
    /* V11-2: an exam's practice Saturdays (examStages), and the part a practice exam counts toward: one whose name
       says practice, a mock, a performance test, or essays, with the most left, else the next part as usual */
    const practiceOn = new Set(examStages(state, g).practice);
    const practicePart = () => queue.filter((x) => x.left >= 1 && /practice|mock|performance test|essay/i.test(x.p.name || '')).sort((a, b) => b.left - a.left)[0] || nextPart();
    /* each day's share on the grid, carrying what rounding leaves to the next day */
    let acc = 0, given = 0;
    for (let i = 0; i < days.length; i++) {
      acc += share.alloc[i];
      const give = Math.max(0, Math.min(days[i].c, Math.round(acc / STEP) * STEP - given));
      given += give;
      if (days[i].d > hEnd || !give) continue;
      /* sessions in the day's quiet windows, earliest first, free time last */
      let left = give;
      const d = days[i].d;
      /* V11-2: on a practice Saturday the day's first session is a practice exam, in one sitting of up to four hours
         (an hour at least), in the first quiet window that holds the day's share, else the longest; practice: true */
      const hasPractice = ((state.dates[d] && state.dates[d].adds) || []).some((a) => a.practice && !a.skipped && a.src && a.src.type === 'goal' && a.src.id === g.id);
      if (practiceOn.has(d) && !hasPractice) {
        const pp = practicePart(), wins = q(d, () => windowsInOrder(state, d, when || 'any', d === today ? ceilGrid(now) : 0));
        const want = pp ? floorGrid(Math.min(left, PRACTICE_MAX, ceilGrid(pp.left))) : 0;
        const fit = want >= 60 ? wins.find((w) => w.end - w.start >= want) || wins.slice().sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] : null;
        for (let s = fit ? fit.start : 0; fit && s + 60 <= fit.end; s += STEP) {
          const len = floorGrid(Math.min(want, fit.end - s));
          if (len < 60) break;
          const r = canPlace(state, d, len, s);
          if (!r.ok || (r.pushes || []).length) continue;
          const mineOwn = tookOwn(d, s, len);
          putAdd(state, d, Object.assign({ name: 'Practice exam', cat: g.cat || 'yours', icon: g.icon || GOAL_ICON[g.kind] || 'flag', dur: len, src: { type: 'goal', id: g.id, part: pp.p.id }, practice: true }, mineOwn ? { own: true } : {}), s);
          res.placed++;
          pp.left -= len; pp.had += len; left -= len;
          prev = pp;
          break;
        }
      }
      for (const w of q(d, () => windowsInOrder(state, d, when || 'any', d === today ? ceilGrid(now) : 0))) {
        let s = w.start, cur = nextPart();
        while (left >= STEP && w.end - s >= STEP && cur) {
          const len = floorGrid(Math.min(left, chunk, w.end - s, ceilGrid(cur.left)));
          if (len < STEP) break;
          const r = canPlace(state, d, len, s);
          if (!r.ok || (r.pushes || []).length) { s += STEP; continue; }
          const mineOwn = tookOwn(d, s, len);
          putAdd(state, d, Object.assign({ name: cur.p.name || g.name, cat: g.cat || 'yours', icon: g.icon || GOAL_ICON[g.kind] || 'flag', dur: len, src: { type: 'goal', id: g.id, part: cur.p.id } }, mineOwn ? { own: true } : {}), s);
          res.placed++;
          cur.left -= len; cur.had += len; left -= len; s += len;
          prev = cur;
          cur = nextPart();
        }
        if (left < STEP || !nextPart()) break;
      }
      /* room that turned out to be in pieces too small goes on the shortfall */
      if (left >= STEP && nextPart()) res.shortMin += left;
    }
    if (opts.own) { const list = Object.keys(ownBy).sort().map((k) => ownBy[k]); res.own = { min: list.reduce((a, x) => a + x.min, 0), days: list }; }
    res.message = res.shortMin >= STEP ? behindText(g, res.shortMin)
      : weekLine(state, g, today, nowMin) || (g.start && g.start > today ? 'It starts ' + dayWord(g.start, today) + '.' : '');
    return res;
  }
  /* 'Behind by 4 h. Add a day, make days a little longer, or move the date.': the fixes that apply (a
     rhythm on every day already has no day to add) */
  function behindText(g, minutes) {
    const r = (g && g.rhythm) || {}, used = (r.days || []).filter((d) => ((d === 0 || d === 6) ? r.we : r.wd) > 0).length;
    const fixes = (used < 7 ? ['add a day'] : []).concat(['make days a little longer', 'move the date']);
    const said = fixes.length === 2 ? fixes[0] + ' or ' + fixes[1] : fixes.slice(0, -1).join(', ') + ', or ' + fixes[fixes.length - 1];
    return 'Behind by ' + hoursText(minutes) + '. ' + capFirst(said) + '.';
  }
  /* '10 h this week, about 2 h a day.': the next seven days from today */
  function weekLine(state, g, today, nowMin) {
    const now = nowMin == null ? 0 : nowMin, end = addDays(today, 6), byDay = {};
    for (const x of goalSessions(state, g.id)) {
      if (x.add.skipped || x.date < today || x.date > end || windowTime(today, x.date, x.add.start) + x.add.dur <= now) continue;
      byDay[x.date] = (byDay[x.date] || 0) + x.add.dur;
    }
    const n = Object.keys(byDay).length, total = Object.values(byDay).reduce((a, m) => a + m, 0);
    if (!n) return '';
    return hoursText(total) + ' this week, about ' + hoursText(total / n) + ' a day.';
  }
  /* a session that didn't happen: skipped, or shortened to what was done (partial). Returns the minutes
     freed. Either way its day is left as it is from then on (heldDays). */
  function markSkip(a, how, minutes) {
    if (how === 'some' && minutes > 0) {
      const did = Math.max(STEP, Math.round(minutes / STEP) * STEP);
      if (did >= a.dur) return 0;
      const back = a.dur - did;
      a.dur = did;
      a.partial = true;
      return back;
    }
    a.skipped = true;
    return a.dur;
  }
  const aheadByDay = (state, gid, today, nowMin) => {
    const now = nowMin == null ? 0 : nowMin, out = {};
    for (const x of goalSessions(state, gid)) if (!x.add.skipped && windowTime(today, x.date, x.add.start) + x.add.dur > now) out[x.date] = (out[x.date] || 0) + x.add.dur;
    return out;
  };
  /* Skip a session (how 'all'), or keep what was done of it (how 'some', minutes done), then plan the
     goal again so the time spreads forward. Returns planGoal's result with { ok, skipped, back, spread }:
     back is the minutes that went back into the plan, spread the days that gained time. */
  function skipGoalSession(state, date, addId, today, nowMin, how, minutes) {
    const dd = state.dates[date], a = dd && (dd.adds || []).find((x) => x.id === addId);
    if (!a || !a.src || a.src.type !== 'goal') return { ok: false, placed: 0, removed: 0, shortMin: 0, message: '' };
    const g = goalOf(state, a.src.id), before = aheadByDay(state, a.src.id, today, nowMin);
    /* skipping one already skipped frees nothing new */
    const back = a.skipped ? 0 : markSkip(a, how, minutes);
    const r = planGoal(state, a.src.id, today, nowMin);
    const after = aheadByDay(state, a.src.id, today, nowMin);
    const spread = Object.keys(after).filter((d) => after[d] > (before[d] || 0)).sort().map((d) => ({ date: d, min: after[d] - (before[d] || 0) }));
    if (back && r.shortMin < STEP && g && g.date && g.date > today) r.message = capFirst(hoursText(back)) + ' spread over the days before ' + dateText(g.date) + '.';
    return Object.assign(r, { ok: true, skipped: addId, how: how === 'some' ? 'some' : 'all', back, spread });
  }
  /* a session still waiting for a word: not skipped, not marked done, not kept short */
  const unanswered = (x) => !x.add.skipped && !x.add.done && !x.add.partial;
  /* The days of the last week with sessions nobody has said anything about, newest first, one entry a goal
     a day, for the morning question: yesterday, then the days before it that were never asked (a week
     without opening the app). A session marked done is already answered, and a day away (a trip) isn't
     asked about. [{ goal, name, date, min, sessions }] */
  function goalCheckIn(state, today) {
    const from = addDays(today, -7), out = [];
    for (const g of state.goals || []) {
      if (g.archived || g.paused) continue;
      const by = new Map();
      for (const x of goalSessions(state, g.id)) {
        if (x.date >= today || x.date < from || !unanswered(x) || (g.answers && g.answers[x.date]) || tripOn(state, x.date)) continue;
        if (!by.has(x.date)) by.set(x.date, []);
        by.get(x.date).push(x);
      }
      for (const [date, list] of by) out.push({ goal: g.id, name: g.name, date, min: list.reduce((a, x) => a + x.add.dur, 0), sessions: list.map((x) => ({ add: x.add.id, name: x.add.name, start: x.add.start, dur: x.add.dur, part: x.add.src.part || null })) });
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }
  /* Keep the answer for a day: yes, some, or no, about the sessions still waiting for a word (one already
     marked done stays done). Yes marks them done. Some keeps what was done (opts.minutes, half by
     default) and marks it done; no skips them. Then the goal plans again from opts.today (the day after)
     at opts.nowMin, so what didn't happen spreads forward. */
  function answerCheckIn(state, goalId, date, answer, opts) {
    const g = goalOf(state, goalId), o = opts || {};
    if (!g || !['yes', 'some', 'no'].includes(answer)) return { ok: false, placed: 0, removed: 0, shortMin: 0, message: '' };
    g.answers = Object.assign({}, g.answers, { [date]: answer });
    const list = goalSessions(state, g.id).filter((x) => x.date === date && unanswered(x));
    if (answer === 'yes') { list.forEach((x) => { x.add.done = true; }); return { ok: true, answer, placed: 0, removed: 0, shortMin: 0, back: 0, message: '' }; }
    const total = list.reduce((a, x) => a + x.add.dur, 0);
    let did = answer === 'no' ? 0 : o.minutes != null ? Math.max(0, Number(o.minutes) || 0) : Math.max(STEP, floorGrid(total / 2));
    let back = 0;
    for (const x of list) {
      if (did >= x.add.dur) { did -= x.add.dur; x.add.done = true; continue; }
      if (did > 0) { back += markSkip(x.add, 'some', did); x.add.done = true; } else back += markSkip(x.add, 'all');
      did = 0;
    }
    const today = o.today || addDays(date, 1);
    const r = planGoal(state, g.id, today, o.nowMin == null ? null : o.nowMin);
    if (back && r.shortMin < STEP && g.date && g.date > today) r.message = capFirst(hoursText(back)) + ' spread over the days before ' + dateText(g.date) + '.';
    return Object.assign(r, { ok: true, answer, back });
  }
  /* Done early on a goal's session: it ends at the last quarter hour (endEarly), the part that happened
     counts as done, and the rest of its time goes to the days ahead, never back onto today: the day is
     left as it is from then on, as for a session kept short (heldDays). date and key are the session's own
     (its owner date, 'add:' and its id) and min the minute it is there. Returns endEarly's result with
     { plan (planGoal's result), message }: '30 min goes to the days ahead.' opts as endEarly's: with { now },
     Done in a session's last five minutes keeps its end and marks it done whole. */
  function endSessionEarly(state, date, key, min, today, nowMin, opts) {
    const r = endEarly(state, date, key, min, opts);
    if (!r.ok) return r;
    const f = findAdd(state, String(key).replace(/^add:/, ''));
    if (!f || !f.add.src || f.add.src.type !== 'goal') return r;
    f.add.done = true;
    if (r.keep) return Object.assign(r, { message: '' });
    f.add.partial = true;
    memoForget(state, f.date);
    const g = goalOf(state, f.add.src.id);
    if (!g) return r;
    const plan = planGoal(state, g.id, today, nowMin);
    const message = r.back >= STEP && g.date && g.date > today ? capFirst(hoursText(r.back)) + ' goes to the days ahead.' : '';
    return Object.assign(r, { plan, message });
  }

  /* == V11 goals: giving way ==
     A goal's session or a to-do's step sits in quiet time, and a commitment always wins. When something
     added later asks for its time (a dentist at that hour, a weekly meeting, a routine moved, an earlier
     bed) or a trip covers its day, it comes off that spot: a step goes to the next quiet time under its
     to-do's cap, by its day, and a session's time goes back to its goal, which plans it again in the quiet
     time that's left. One the plan placed has to be in quiet time; one someone placed by hand stays where
     they put it unless a commitment now covers it. What has started stays. */
  const plannerAdd = (a) => !!(a && !a.skipped && a.src && (a.src.type === 'goal' || a.src.type === 'step'));
  /* The sessions and steps from now on that are no longer where they can be: [{ date, add, for }] (for:
     the name of what asks for the time). One the plans placed (a session, or a step of a to-do that was
     spread) has to be in quiet time, so a trip day moves it too; one placed by hand, or by an older board,
     moves only for something hard on that time, never for sleep. */
  function outOfPlace(state, today, now, n) {
    const out = [], spread = new Set(state.tasks.filter((t) => t.spread).map((t) => t.id));
    for (let i = 0; i < n; i++) {
      const d = addDays(today, i), dd = state.dates[d];
      if (!dd || !(dd.adds || []).some(plannerAdd)) continue;
      const mine = dd.adds.filter((a) => plannerAdd(a) && windowTime(today, d, a.start) >= now);
      if (!mine.length) continue;
      const ids = new Set(dd.adds.filter(plannerAdd).map((a) => a.id));
      const sim = setAside(state, d, (a) => !ids.has(a.id));
      const runs = quietRuns(sim, d, 'any', 0).runs, trip = tripOn(state, d);
      /* what asks for the time: anything hard on the day that isn't one of these (a set time, a meeting, a
         locked or hard routine, a block someone placed) */
      const hard = range(addDays(d, -1), 2).flatMap((owner) => calendarRecords(sim, owner).map((b) => Object.assign({}, b, { start: windowTime(d, owner, b.start) }))).filter((b) => !b.soft && !b.sleep);
      for (const a of mine) {
        const span = { start: a.start, dur: a.dur }, hit = hard.find((b) => overlaps(b, span));
        const planned = !a.pinned && (a.src.type === 'goal' || spread.has(a.src.task));
        if (hit) out.push({ date: d, add: a, for: hit.name || '', trip: !!trip });
        else if (planned && !runs.some((w) => w.start <= a.start && a.start + a.dur <= w.end)) out.push({ date: d, add: a, for: trip ? trip.name : '', trip: !!trip });
      }
    }
    return out;
  }
  /* Give way, from today for opts.days (28 by default). Returns { moved: [{ kind: 'step', name, task, from,
     to, start }], off: [{ kind: 'step', name, task, from }], goals: [{ id, name, date, min, left, moved,
     shortMin, message }], message }, with the toast's words: 'Civil Procedure moved to 6:30 pm.' Changes
     nothing when everything is where it can be. */
  function giveWay(state, today, nowMin, opts) {
    const o = opts || {}, now = nowMin == null ? 0 : nowMin;
    const res = { moved: [], off: [], goals: [], message: '' };
    const out = withRecMemo(state, () => outOfPlace(state, today, now, Math.max(1, o.days || 28)));
    if (!out.length) return res;
    const sessionKey = (s) => s.date + '|' + s.add.start + '|' + s.add.dur + '|' + s.add.src.part;
    const before = {}, gave = {}, lastOf = {}, wasBehind = {};
    const note = (gid, x) => {
      if (!before[gid]) {
        before[gid] = goalSessions(state, gid).filter((s) => !s.add.skipped).map(sessionKey);
        const p = goalOf(state, gid) ? goalProgress(state, gid, today, nowMin) : null;
        wasBehind[gid] = p ? p.behindMin : 0;
      }
      (gave[gid] = gave[gid] || []).push(x);
      lastOf[gid] = maxDate(lastOf[gid] || today, x.date);
    };
    out.forEach((x) => { if (x.add.src.type === 'goal') note(x.add.src.id, { date: x.date, start: x.add.start, dur: x.add.dur, part: x.add.src.part, name: x.add.name, for: x.for, trip: !!x.trip }); });
    out.forEach((x) => { removeAdd(state, x.add.id); memoForget(state, x.date); });
    /* steps: the next quiet time under the to-do's cap, from where it was, by its day */
    const pl = placements(state);
    out.filter((x) => x.add.src.type === 'step').forEach((x) => {
      const t = state.tasks.find((y) => y.id === x.add.src.task);
      const s = t && (t.steps || []).find((y) => y.id === x.add.src.id);
      if (!t || t.done || !s || s.done) return;
      const sp = t.spread ? spreadOpts(t, null, today) : null, cap = sp ? sp.cap : Infinity, allowed = sp ? dayRule(sp.days) : () => true;
      let by = (t.spread && t.spread.by) || t.due || addDays(today, 20);
      if (by < today) by = addDays(today, 13);
      const len = gridDur(x.add.dur);
      const usedOn = (d) => (pl.get(t.id) || []).filter((p) => p.date === d && p.add.id !== x.add.id && findAdd(state, p.add.id)).reduce((a, p) => a + p.add.dur, 0);
      let spot = null, d = maxDate(today, x.date);
      while (d <= by) {
        const u = usedOn(d);
        if (allowed(weekday(d)) && !tripOn(state, d) && !easyDay(state, d) && (u + len <= cap || (!u && len > cap))) spot = stepSpot(state, d, len, { when: (sp && sp.when) || 'any', after: d === today ? ceilGrid(now) : 0 }, today, now);
        if (spot) break;
        d = addDays(d, 1);
      }
      if (!spot) { res.off.push({ kind: 'step', name: s.name, task: t.id, from: x.date }); return; }
      spot.gives.forEach((a) => { note(a.src.id, { date: d, start: a.start, dur: a.dur, part: a.src.part, name: a.name, took: true }); removeAdd(state, a.id); memoForget(state, d); });
      const copy = Object.assign({}, x.add);
      delete copy.pinned;
    delete copy.own;
      delete copy.own;
      putAdd(state, d, copy, spot.start);
      res.moved.push({ kind: 'step', name: s.name, task: t.id, from: x.date, to: d, start: spot.start });
    });
    /* sessions: their goal plans again, far enough to reach the last day one left */
    Object.keys(gave).forEach((gid) => {
      const g = goalOf(state, gid);
      if (!g) return;
      const from = g.start && g.start > today ? g.start : today;
      const r = planGoal(state, gid, today, nowMin, { horizon: Math.max(diffDays(today, from) + 14, diffDays(today, lastOf[gid]) + 1) });
      /* where its time went: the sessions that weren't there before */
      const was = before[gid].slice(), moved = [];
      goalSessions(state, gid).filter((s) => !s.add.skipped).forEach((s) => { const k = was.indexOf(sessionKey(s)); if (k >= 0) was.splice(k, 1); else moved.push({ date: s.date, start: s.add.start, dur: s.add.dur, part: s.add.src.part }); });
      const left = gave[gid].filter((x) => !x.took), took = gave[gid].filter((x) => x.took);
      res.goals.push({ id: gid, name: g.name, date: g.date, min: left.reduce((a, x) => a + x.dur, 0), took: took.reduce((a, x) => a + x.dur, 0), left, moved, shortMin: r.shortMin, wasBehind: wasBehind[gid] || 0, message: r.message });
    });
    res.message = giveWords(res, today);
    return res;
  }
  /* Didn't get to it, for a step of a to-do that wasn't spread: its block goes to the next quiet time
     from opts.from (the day after it, by default; today at the earliest, after now) for three weeks,
     taking the place of a goal's own sessions when they hold all of it (to-dos come first). The app moved
     it, so it isn't pinned. Returns { ok, date, start, goals, message } (goals as applySpread's out has
     them, message what giving that time did to them); opts.preview works it out and changes nothing. */
  function moveStep(state, addId, today, nowMin, opts) {
    if (opts && opts.own && !ownOk) return withOwn(true, () => moveStep(state, addId, today, nowMin, opts));
    const o = opts || {}, st = o.preview ? clone(state) : state, now = nowMin == null ? 0 : nowMin;
    const f = findAdd(st, addId);
    if (!f || !f.add.src || f.add.src.type !== 'step') return { ok: false };
    const sim = setAside(st, f.date, (a) => a.id !== addId);
    let d = maxDate(today, o.from || addDays(f.date, 1)), at = null;
    for (let i = 0; i < (o.days || 21); i++, d = addDays(d, 1)) {
      at = stepSpot(sim, d, f.add.dur, { when: 'any', after: d === today ? ceilGrid(now) : 0 }, today, now);
      if (at) break;
    }
    if (!at) return { ok: false };
    const gave = {};
    removeAdd(st, addId);
    memoForget(st, f.date);
    at.gives.forEach((a) => { removeAdd(st, a.id); memoForget(st, d); gave[a.src.id] = (gave[a.src.id] || 0) + a.dur; });
    const copy = Object.assign({}, f.add);
    delete copy.pinned;
    delete copy.own;
    putAdd(st, d, copy, at.start);
    const goals = replanGave(st, gave, today, nowMin == null ? null : nowMin, d);
    return { ok: true, date: d, start: at.start, goals, message: gaveWords(goals) };
  }
  /* the toast's words for giving way: where a session went when one moved ('Torts moved to 5:15 pm.'), or
     that its time goes to the days ahead; how much of a goal's time moved when several did ('off the trip
     days' for a trip); that the goal is behind now, when it is after giving way (the time that moved
     didn't all find room); and each step by name */
  function giveWords(res, today) {
    const lines = [], when = (date, from, start) => (date === from ? '' : dayWord(date, today) + ' at ') + clock(start);
    res.goals.forEach((g) => {
      const worse = g.shortMin >= STEP, behind = g.name + ' is behind by ' + hoursText(g.shortMin) + ' now.';
      if (g.left.length === 1) {
        const x = g.left[0], same = (s) => s.part === x.part;
        const to = g.moved.find((s) => same(s) && s.date === x.date) || g.moved.find((s) => same(s) && s.dur === x.dur) || null;
        if (to && to.dur >= x.dur) lines.push(x.name + ' moved to ' + when(to.date, x.date, to.start) + '.');
        else if (to) lines.push(x.name + ' moved to ' + when(to.date, x.date, to.start) + ', for ' + hoursText(to.dur) + '.' + (worse ? '' : ' The rest goes to the days ahead.'));
        else if (!worse) lines.push(x.name + '’s ' + hoursText(x.dur) + ' goes to the days ' + (g.date ? 'before ' + dateText(g.date) : 'ahead') + '.');
        else lines.push(x.name + ' is off that time.');
      } else if (g.left.length > 1) lines.push(g.name + ': ' + hoursText(g.min) + ' moved ' + (g.left.every((x) => x.trip) ? 'off the trip days' : 'to other times') + '.');
      if (worse) lines.push(behind);
    });
    res.moved.forEach((m) => lines.push(m.name + ' moved to ' + when(m.to, m.from, m.start) + '.'));
    if (res.off.length) lines.push(joinWords(res.off.map((x, i) => (i ? lcFirst(x.name) : x.name))) + (res.off.length === 1 ? ' has' : ' have') + ' no time now. Open ' + (res.off.length === 1 ? 'its to-do' : 'their to-dos') + ' to give ' + (res.off.length === 1 ? 'it' : 'them') + ' one.');
    if (lines.length <= 3) return lines.join(' ');
    const n = res.goals.reduce((a, g) => a + g.left.length, 0), m = res.moved.length + res.off.length;
    return (n ? n + (n === 1 ? ' session' : ' sessions') : '') + (n && m ? ' and ' : '') + (m ? m + (m === 1 ? ' step' : ' steps') : '') + ' moved out of the way.';
  }

  /* == V11 goals: cook once, eat twice ==
     Leftovers know the meal they come from: from: { date, slot } on the dinner (state.dinners) or the
     breakfast or lunch (state.meals) that eats them. */
  function mealRec(state, date, slot) {
    if (slot === 'dinner') return (state.dinners && state.dinners[date]) || null;
    const m = state.meals && state.meals[date] && state.meals[date][slot];
    return m == null ? null : typeof m === 'string' ? { name: m } : m;
  }
  /* how a meal happens: home (cooking), or out, order, skip, leftovers */
  const mealHow = (rec, slot) => (!rec ? '' : NOT_COOKING.includes(slot === 'dinner' ? rec.cook : rec.how) ? (slot === 'dinner' ? rec.cook : rec.how) : 'home');
  const mealSet = (rec, slot) => !!rec && (slot !== 'dinner' || !!(rec.name || rec.cook));
  const isCooking = (rec, slot) => mealSet(rec, slot) && mealHow(rec, slot) === 'home';
  const laterSlot = (a, b) => b.date > a.date || (b.date === a.date && SLOTS.indexOf(b.slot) > SLOTS.indexOf(a.slot));
  /* the meals that are leftovers of one meal, within two weeks of it: [{ date, slot }] */
  function leftoversOf(state, date, slot) {
    const out = [];
    for (const d of range(date, 15)) for (const k of SLOTS) {
      const r = mealRec(state, d, k);
      if (r && r.from && r.from.date === date && r.from.slot === slot) out.push({ date: d, slot: k });
    }
    return out;
  }
  /* a meal and the leftovers it makes, as servings */
  function servingsOf(state, date, slot) {
    const r = mealRec(state, date, slot);
    return (mealSet(r, slot) ? 1 : 0) + leftoversOf(state, date, slot).filter((x) => mealHow(mealRec(state, x.date, x.slot), x.slot) === 'leftovers').length;
  }
  function writeMeal(state, date, slot, rec) {
    if (slot === 'dinner') { state.dinners[date] = rec; return; }
    state.meals = state.meals || {};
    const day = state.meals[date] && typeof state.meals[date] === 'object' ? state.meals[date] : {};
    state.meals[date] = Object.assign({}, day, { [slot]: rec });
  }
  const leftoverName = (src) => (src && src.name ? 'Leftovers: ' + src.name : 'Leftovers');
  const leftoverRec = (slot, name, link) => (slot === 'dinner' ? { name, cook: 'leftovers', items: [], from: Object.assign({}, link) } : { name, how: 'leftovers', from: Object.assign({}, link) });
  /* Cook extra: each later meal in `to` becomes leftovers of the meal at `from`. Only a meal being
     cooked makes leftovers. A dinner that's leftovers needs a Dinner block to show on the board;
     this writes the meal, not the block. Returns { ok, linked, name, to }. */
  function cookExtra(state, from, to) {
    const src = from && mealRec(state, from.date, from.slot);
    if (!from || !SLOTS.includes(from.slot) || !isCooking(src, from.slot)) return { ok: false, linked: 0, name: '', to: [] };
    const name = leftoverName(src), link = { date: from.date, slot: from.slot }, done = [];
    for (const x of [].concat(to || [])) {
      if (!x || !SLOTS.includes(x.slot) || !laterSlot(link, x)) continue;
      writeMeal(state, x.date, x.slot, leftoverRec(x.slot, name, link));
      done.push({ date: x.date, slot: x.slot });
    }
    return { ok: done.length > 0, linked: done.length, name, to: done };
  }
  /* After any meal changes: leftovers follow their meal's name, and when that meal is gone or isn't
     cooked any more they stay leftovers with no name of their own and no link. Call it inside the same
     change. Returns how many meals it changed. */
  function syncLeftovers(state) {
    let n = 0;
    const fix = (d, k) => {
      const r = mealRec(state, d, k);
      if (!r || typeof r !== 'object' || !r.from) return;
      const src = mealRec(state, r.from.date, r.from.slot), auto = /^Leftovers(?::|$)/.test(r.name || '');
      if (mealHow(r, k) === 'leftovers' && isCooking(src, r.from.slot) && laterSlot(r.from, { date: d, slot: k })) {
        const want = leftoverName(src);
        if (auto && r.name !== want) { r.name = want; n++; }
        return;
      }
      delete r.from;
      if (auto) r.name = '';
      n++;
    };
    Object.keys(state.dinners || {}).forEach((d) => fix(d, 'dinner'));
    Object.keys(state.meals || {}).forEach((d) => ['breakfast', 'lunch'].forEach((k) => fix(d, k)));
    return n;
  }
  const DIET_OUT = { vegetarian: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'], vegan: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish', 'eggs', 'dairy'], pescatarian: ['chicken', 'turkey', 'beef', 'pork'] };
  /* A prep week to look at, not applied: two batch cooks (Sunday and Wednesday dinners, or Monday and
     Thursday on a Monday week; opts.days to choose), each covering the next two or three lunches as
     leftovers (dinners when there aren't lunches), and fresh nights for the other dinners. The home's
     own meals come first (recent dinners, recipes, the meal book), then Data.BATCH, without what the
     home leaves out. Only empty meals are suggested, and none on a trip day or before opts.today.
     Returns { week, batches, fresh, list, block, message }: list is everything to apply, in order
     ({ date, slot, kind: 'batch' | 'leftovers' | 'fresh', name, meal }, meal as the board keeps it),
     block a Meal prep block for the first batch day's afternoon, when there's quiet time for it. */
  function prepPlan(state, weekStart, opts, Data) {
    const o = opts || {}, B = (Data && Data.BATCH) || { words: [], meals: [] };
    const today = o.today || weekStart, dates = range(weekStart, 7);
    const batchWds = Array.isArray(o.days) && o.days.length ? o.days : weekday(weekStart) === 1 ? [1, 4] : [0, 3];
    /* (V11: tonight's dinner once its time is over isn't offered: opts.nowMin against the Dinner block's end, or
       8 pm on a day with none. At 10 pm a prep week starts tomorrow) */
    const over = o.nowMin != null && (() => { const db = calendarDay(state, today).blocks.find((x) => x.dinner); return o.nowMin >= (db ? db.start + db.dur : 20 * 60); })();
    const usable = (d) => d >= today && !tripOn(state, d) && !(over && d === today);
    const taken = new Set();
    const free = (d, k) => usable(d) && !mealSet(mealRec(state, d, k), k) && !taken.has(d + '|' + k);
    const n = (s) => bdNorm(s);
    const any = (name, list) => (list || []).some((w) => phraseIn(n(name), w));
    const batchy = (name) => !!name && any(name, B.words) && !any(name, B.not);
    const score = (name) => (any(name, B.strong) ? 2 : 1);
    const book = state.mealbook || {}, out = new Set([].concat(book.out || [], DIET_OUT[book.diet] || []));
    /* the home's own meals, most like a batch cook first, then the ones made most lately */
    const had = new Map();
    for (const d of range(addDays(weekStart, -28), 28)) {
      const r = state.dinners[d];
      if (!isCooking(r, 'dinner') || !r.name) continue;
      const key = r.name.toLowerCase().trim(), x = had.get(key) || { name: r.name, items: (r.items || []).slice(), recipe: r.recipe || null, n: 0, at: '' };
      x.n++; if (d >= x.at) x.at = d;
      had.set(key, x);
    }
    const own = [];
    had.forEach((x) => own.push({ name: x.name, items: x.items, recipe: x.recipe, source: 'yours', rank: 0, n: x.n, at: x.at }));
    (state.recipes || []).forEach((r) => own.push({ name: r.name, items: (r.items || []).slice(), recipe: r.id, source: 'yours', rank: 1, n: 0, at: '' }));
    (book.own || []).forEach((r) => own.push({ name: r.name, items: [], recipe: null, source: 'yours', rank: 2, n: 0, at: '' }));
    const uniq = (list, seen) => list.filter((x) => { const k = x.name.toLowerCase().trim(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
    const batchSeen = new Set();
    const ownBatch = uniq(own.filter((x) => batchy(x.name)).sort((a, b) => score(b.name) - score(a.name) || a.rank - b.rank || b.n - a.n || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)), batchSeen);
    const listBatch = uniq((B.meals || []).filter((m) => !(m.has || []).some((h) => out.has(h))).map((m) => ({ name: m.name, items: (m.items || []).slice(), recipe: m.recipe && (state.recipes || []).some((r) => r.id === m.recipe) ? m.recipe : null, source: 'list' })), batchSeen);
    const picks = ownBatch.concat(listBatch), used = new Set();
    /* V11 (the rituals walk): a dish already in the week is never offered again, as a batch or a fresh night, and the
       two batch cooks are two different dishes (Sheet pan chicken seven times was nobody's week) */
    const inWeek = new Set();
    dates.forEach((d) => SLOTS.forEach((k) => { const r = mealRec(state, d, k); const nm = r && mealSet(r, k) && String(r.name || '').replace(/^Leftovers(?::\s*|$)/, '').toLowerCase().trim(); if (nm) inWeek.add(nm); }));
    const nextPick = () => { const p = picks.find((x) => !used.has(x.name.toLowerCase()) && !inWeek.has(x.name.toLowerCase().trim())); if (p) used.add(p.name.toLowerCase()); return p || null; };
    const batches = [];
    for (const wd of batchWds) {
      const d0 = dates.find((x) => weekday(x) === wd);
      if (!d0) continue;
      let got = null;
      for (const d of [d0, addDays(d0, 1)]) {
        if (!dates.includes(d) || !usable(d) || taken.has(d + '|dinner')) continue;
        const r = mealRec(state, d, 'dinner');
        /* (a dish already batch cooked this week isn't a second batch cook) */
        if (isCooking(r, 'dinner') && r.name && batchy(r.name) && used.has(r.name.toLowerCase())) continue;
        if (isCooking(r, 'dinner') && r.name && batchy(r.name)) { got = { date: d, meal: { name: r.name, items: (r.items || []).slice(), recipe: r.recipe || null, source: 'yours' }, keep: true }; used.add(r.name.toLowerCase()); break; }
        if (free(d, 'dinner')) { const p = nextPick(); if (p) got = { date: d, meal: p, keep: false }; break; }
      }
      if (!got) continue;
      taken.add(got.date + '|dinner');
      batches.push({ date: got.date, slot: 'dinner', name: got.meal.name, items: got.meal.items || [], recipe: got.meal.recipe || null, source: got.meal.source, keep: got.keep, makes: [] });
    }
    batches.sort((a, b) => (a.date < b.date ? -1 : 1));
    const weekEnd = addDays(weekStart, 7);
    batches.forEach((b, i) => {
      const until = i + 1 < batches.length ? batches[i + 1].date : weekEnd, span = range(addDays(b.date, 1), Math.max(0, diffDays(b.date, until) - 1)).filter((d) => dates.includes(d));
      const cover = o.cover || (span.length >= 3 ? 3 : 2);
      const slots = span.map((d) => ({ date: d, slot: 'lunch' })).concat(span.map((d) => ({ date: d, slot: 'dinner' })));
      for (const x of slots) {
        if (b.makes.length >= cover) break;
        if (!free(x.date, x.slot)) continue;
        taken.add(x.date + '|' + x.slot);
        b.makes.push(x);
      }
    });
    /* fresh nights: the home's other meals, recent ones first, then its recipes */
    const freshPicks = uniq(own.filter((x) => !used.has(x.name.toLowerCase()) && !inWeek.has(x.name.toLowerCase().trim())).sort((a, b) => a.rank - b.rank || b.n - a.n || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)), new Set());
    const fresh = [];
    for (const d of dates) {
      if (!free(d, 'dinner')) continue;
      const p = freshPicks.shift();
      if (!p) break;
      taken.add(d + '|dinner');
      fresh.push({ date: d, slot: 'dinner', name: p.name, items: (p.items || []).slice(), recipe: p.recipe || null });
    }
    /* (V11, the rituals walk: nobody is picked to cook for you; who cooks is asked, and Anyone is an answer) */
    const cook = o.cook || '', list = [];
    const dish = (m) => Object.assign({ name: m.name, cook, items: (m.items || []).slice() }, m.recipe ? { recipe: m.recipe } : {});
    batches.forEach((b) => {
      if (!b.keep) list.push({ date: b.date, slot: 'dinner', kind: 'batch', name: b.name, meal: dish(b) });
      b.makes.forEach((x) => { const nm = leftoverName(b); list.push({ date: x.date, slot: x.slot, kind: 'leftovers', name: nm, meal: leftoverRec(x.slot, nm, { date: b.date, slot: 'dinner' }) }); });
    });
    fresh.forEach((f) => list.push({ date: f.date, slot: 'dinner', kind: 'fresh', name: f.name, meal: dish(f) }));
    let block = null;
    if (batches.length) {
      /* V11 (the rituals walk): the Meal prep block is the batch cook: the quiet 90 minutes that end closest to the
         Dinner block (right before it when it can be), never before now. Else the afternoon, then any time */
      const b0 = batches[0], after = b0.date === today && o.nowMin != null ? o.nowMin : 0;
      const bdb = calendarDay(state, b0.date).blocks.find((x) => x.dinner), by = bdb ? bdb.start : 18 * 60;
      let near = null;
      for (let s = Math.floor((by - 90) / STEP) * STEP; s >= Math.max(after, 6 * 60) && near == null; s -= STEP) if (quietAt(state, b0.date, 90, s, after)) near = s;
      const at = near ?? quietSlot(state, b0.date, 90, { when: 'afternoon', strict: true, after }) ?? quietSlot(state, b0.date, 90, { when: 'any', after });
      const makes = [{ date: b0.date, slot: 'dinner', name: b0.name }].concat(b0.makes.map((x) => ({ date: x.date, slot: x.slot, name: leftoverName(b0) })));
      if (at != null) block = { date: b0.date, start: at, dur: 90, add: { name: 'Meal prep', cat: 'meals', icon: 'pot', dur: 90, src: { type: 'prep', week: weekStart }, makes } };
    }
    const covers = batches.reduce((a, b) => a + b.makes.length, 0);
    let message = '';
    if (batches.length) {
      const named = joinWords(batches.map((b) => DAY_LONG[weekday(b.date)]));
      message = (batches.length === 2 ? 'Two batch cooks, ' : 'One batch cook, ') + named + ', cover ' + covers + (covers === 1 ? ' more meal' : ' more meals') + (fresh.length ? ', with ' + fresh.length + (fresh.length === 1 ? ' fresh night.' : ' fresh nights.') : '.');
    } else message = fresh.length ? fresh.length + (fresh.length === 1 ? ' fresh night.' : ' fresh nights.') : 'Every dinner this week already has a plan.';
    return { week: weekStart, batches, fresh, list, block, message };
  }
  /* Write a prep week from prepPlan: each meal that's still empty, then the leftovers' links follow
     their meals (syncLeftovers). opts.block: put the Meal prep block on too, where nothing moves.
     Returns { meals, block } (block: the add, or null). */
  function applyPrepPlan(state, plan, opts) {
    let meals = 0, block = null;
    for (const x of (plan && plan.list) || []) {
      if (!SLOTS.includes(x.slot) || mealSet(mealRec(state, x.date, x.slot), x.slot)) continue;
      writeMeal(state, x.date, x.slot, clone(x.meal));
      meals++;
    }
    syncLeftovers(state);
    if (opts && opts.block && plan && plan.block) {
      const b = plan.block;
      const at = quietAt(state, b.date, b.dur, b.start, 0) ? b.start : quietSlot(state, b.date, b.dur, { when: 'afternoon' });
      if (at != null) block = putAdd(state, b.date, clone(b.add), at);
    }
    return { meals, block };
  }

  /* == V11-2: big moments ==
     A big thing is something with a date, a window, or no date at all, with a few steps, each on its last good day
     (docs/BIG-MOMENTS.md). Some steps come after the date, some are messages to people, and some blocks carry a
     list. Only the next step is loud. Here: a goal with no date planned by the week (planWeekly), an exam's stages
     (examStages), fuzzy dates (windowFor, windowWords, pickDate), a heads-up for each person (addHeadsUp), the to-do
     a step becomes (prepTodo, packList), suggested texts (suggestText, msgFor), what the two new questions ask about
     (yesterdayLoose, headsUpDue), and the countdown that draws all of it (countdown). The API block below has the
     contract. Everything is worked out on the device; nothing here sends anything. */
  /* the longest practice exam the plan puts down in one sitting */
  const PRACTICE_MAX = 240;
  const eventOf = (state, id) => (state.events || []).find((e) => e.id === id) || null;

  /* how many times a week a goal with no date runs: rhythm.n, or one on each of its days that has time */
  const weekTimes = (g) => {
    const r = (g && g.rhythm) || {}, n = Math.round(Number(r.n));
    return n >= 1 ? Math.min(7, n) : (r.days || []).filter((d) => ((d === 0 || d === 6) ? r.we : r.wd) > 0).length;
  };
  /* a session of a goal with no date on `date`: its chunk, never more than the day's time; 0 on a day it doesn't use */
  const weekLen = (g, date) => {
    const r = g.rhythm || {}, wd = weekday(date), cap = (r.days || []).includes(wd) ? ((wd === 0 || wd === 6 ? r.we : r.wd) || 0) : 0;
    return cap > 0 ? floorGrid(Math.min(Math.max(STEP, r.chunk || 60), cap)) : 0;
  };
  /* Plan a goal with no date by the week, from today (or its start) through the horizon. Each week gets its sessions
     (weekTimes), one a day at most, each weekLen long, aimed at days spread over the week, in the quiet time of the
     part of the day it likes; never on a trip day, an easy day, or a day left as it is (held). What the week already
     has counts (pinned, done, or already started; a skipped one doesn't, so its slot can come back). Parts take turns.
     It's never behind: a week that can't hold them all says so plainly. Fills planGoal's res. */
  function planWeekly(state, g, today, nowMin, H, held, res) {
    const now = nowMin == null ? 0 : nowMin, n = weekTimes(g), when = (g.rhythm || {}).when || 'any';
    const first = g.start && g.start > today ? g.start : today, hEnd = addDays(today, H - 1);
    if (!n) return Object.assign(res, { message: 'Pick the days it runs on.' });
    const open = (g.parts || []).filter((p) => !p.done), parts = open.length ? open : (g.parts || []).slice(0, 1);
    let turn = goalSessions(state, g.id).filter((x) => !x.add.skipped).length;
    for (let ws = weekStart(first); ws <= hEnd; ws = addDays(ws, 7)) {
      const we = addDays(ws, 6);
      const on = goalSessions(state, g.id).filter((x) => !x.add.skipped && x.date >= ws && x.date <= we);
      const need = n - on.length;
      if (need <= 0) continue;
      const taken = new Set(on.map((x) => x.date));
      /* the week's days with room for a session (the whole week, so a week the horizon cuts spreads the same way) */
      const cand = range(ws, 7).filter((d) => d >= first && weekLen(g, d) >= STEP && !taken.has(d) && !held.has(d) && !tripOn(state, d) && !easyDay(state, d))
        .map((d) => ({ d, len: weekLen(g, d), at: quietSlot(state, d, weekLen(g, d), { when, strict: true, after: d === today ? ceilGrid(now) : 0 }) }))
        .filter((x) => x.at != null);
      for (let k = 0; k < need && cand.length; k++) {
        /* the k-th of `need` sessions aims at its share of the week (three in five days: the first, third, and fifth);
           one aimed past the horizon waits for a later plan */
        const t = Math.min(cand.length - 1, Math.max(0, Math.round((k + 0.5) * cand.length / need - 0.5)));
        if (cand[t].d > hEnd) continue;
        for (const x of cand.slice(t).concat(cand.slice(0, t).reverse())) {
          if (taken.has(x.d) || x.d > hEnd) continue;
          const p = parts.length ? parts[turn % parts.length] : null;
          putAdd(state, x.d, { name: (p && p.name) || g.name, cat: g.cat || 'yours', icon: g.icon || GOAL_ICON[g.kind] || 'flag', dur: x.len, src: { type: 'goal', id: g.id, part: p ? p.id : null } }, x.at);
          taken.add(x.d); turn++; res.placed++;
          break;
        }
      }
    }
    /* the words: this week's days, or how many of them fit */
    const ws0 = weekStart(today), we0 = addDays(ws0, 6);
    const mine = goalSessions(state, g.id).filter((x) => !x.add.skipped && x.date >= ws0 && x.date <= we0);
    const days = Array.from(new Set(mine.map((x) => x.date))).sort().map((d) => DAY_LONG[weekday(d)]);
    res.message = first > we0 ? 'It starts ' + dayWord(first, today) + '.'
      : !mine.length ? 'Nothing fits this week.'
      : (mine.length >= n ? 'This week: ' : mine.length + ' of ' + n + ' fit this week: ') + joinWords(days) + '.';
    return res;
  }

  /* An exam's stages, from its start and its date, worked out and never saved: Learn from the start to about half the
     time; Practice to about the last six weeks (a third of a shorter run); Review to three days out; then the lighter
     last days the plan already has (the taper, Lighter days). On a run of eight weeks or more the stages turn at the
     start of a week. A run under two weeks is Review and the last days. A practice exam every other Saturday through
     Practice and Review, on a Saturday the goal uses and not on a trip. Gives { stages: [{ from, to, name }], practice:
     [dates] }; nothing for a goal that isn't an exam or has no date. */
  function examStages(state, goal) {
    const g = goalOf(state, goal), none = { stages: [], practice: [] };
    if (!g || g.kind !== 'exam' || !g.date || !g.start || g.start >= g.date) return none;
    const start = g.start, R = diffDays(start, g.date), eve = addDays(g.date, -1);
    const light = addDays(g.date, -TAPER), body = addDays(g.date, -TAPER - 1), stages = [];
    const put = (from, to, name) => { if (from <= to) stages.push({ from, to, name }); };
    if (R <= TAPER) { put(start, eve, 'Lighter days'); return { stages, practice: [] }; }
    if (R < 14) { put(start, body, 'Review'); put(maxDate(start, light), eve, 'Lighter days'); return { stages, practice: [] }; }
    const snap = R >= 56 ? (d) => { const w = weekStart(d), nx = addDays(w, 7); return diffDays(w, d) <= diffDays(d, nx) ? w : nx; } : (d) => d;
    const practiceFrom = snap(addDays(start, Math.round(R / 2)));
    const reviewFrom = maxDate(practiceFrom, snap(addDays(g.date, -Math.min(42, Math.round(R / 3)))));
    put(start, addDays(practiceFrom, -1), 'Learn');
    put(practiceFrom, minDate(addDays(reviewFrom, -1), body), 'Practice');
    put(reviewFrom, body, 'Review');
    put(light, eve, 'Lighter days');
    const practice = [], p0 = stages.find((s) => s.name === 'Practice' || s.name === 'Review');
    if (p0) for (let sat = addDays(p0.from, (6 - weekday(p0.from) + 7) % 7); sat <= body; sat = addDays(sat, 14)) if (goalCap(g, sat) > 0 && !(state && tripOn(state, sat))) practice.push(sat);
    return { stages, practice };
  }

  /* == V11-2: fuzzy dates ==
     "Not sure yet", in the words a person picks: 'this-month', 'next-month', a season ('spring' is March to May,
     'summer' June to August, 'fall' September to November, 'winter' December to February; the next one to come, or
     the one under way), or 'few-months' (the next three, from next month). Gives { from, to }, whole months, or null. */
  const SEASONS = { spring: [3, 5], summer: [6, 8], fall: [9, 11], winter: [12, 2] };
  /* (V11-3, C26: a season with three weeks or less left of it means the next one, unless current says this one) */
  function windowFor(choice, today, current) {
    const p = parts(today), lastOf = (s) => { const q = parts(s); return iso(q.y, q.m, daysInMonth(q.y, q.m)); };
    const m0 = iso(p.y, p.m, 1);
    if (choice === 'this-month') return { from: m0, to: lastOf(m0) };
    if (choice === 'next-month') { const a = addMonths(m0, 1); return { from: a, to: lastOf(a) }; }
    if (choice === 'few-months') { const a = addMonths(m0, 1); return { from: a, to: lastOf(addMonths(a, 2)) }; }
    const s = SEASONS[choice];
    if (!s) return null;
    for (const y of [p.y - 1, p.y, p.y + 1]) {
      const from = iso(y, s[0], 1), to = lastOf(iso(s[1] < s[0] ? y + 1 : y, s[1], 1));
      if (to >= today && (current || from > today || diffDays(today, to) >= 21)) return { from, to };
    }
    return null;
  }
  /* a window as it's said inside a sentence, and the months it spans: { lead: 'sometime in spring', span: 'Mar to May' } */
  function windowParts(win, today) {
    const a = parts(win.from), b = parts(win.to), t = parts(today || win.from);
    const whole = a.d === 1 && b.d === daysInMonth(b.y, b.m);
    /* the year, when it isn't this one's or the next twelve months' */
    const yr = diffDays(today || win.from, win.from) > 300 ? ' ' + a.y : '';
    const span = MONTH_SHORT[a.m - 1] + ' to ' + MONTH_SHORT[b.m - 1];
    if (whole) {
      for (const k of Object.keys(SEASONS)) {
        const s = SEASONS[k];
        if (a.m === s[0] && b.m === s[1] && b.y === (s[1] < s[0] ? a.y + 1 : a.y)) return { lead: 'sometime in ' + k + yr, span };
      }
      if (a.y === b.y && a.m === b.m) {
        const k = (a.y - t.y) * 12 + a.m - t.m;
        return { lead: k === 0 ? 'sometime this month' : k === 1 ? 'sometime next month' : 'sometime in ' + MONTH_LONG[a.m - 1] + yr, span: '' };
      }
      return { lead: 'sometime between ' + MONTH_SHORT[a.m - 1] + ' and ' + MONTH_SHORT[b.m - 1] + yr, span: '' };
    }
    return { lead: 'sometime between ' + dateText(win.from) + ' and ' + dateText(win.to), span: '' };
  }
  /* 'Sometime in spring · Mar to May', 'Sometime next month', 'Sometime between Nov and Jan' */
  function windowWords(win, today) {
    if (!win || !win.from || !win.to) return '';
    const w = windowParts(win, today);
    return capFirst(w.lead) + (w.span ? ' · ' + w.span : '');
  }
  /* the date an event is on next, from today: its date, or a yearly one's next day on or after today; null for a
     fuzzy date */
  function nextOn(e, today) {
    if (!e || !e.date) return null;
    if (!e.yearly || e.date >= today) return e.date;
    const md = e.date.slice(5), y = +today.slice(0, 4);
    for (const yy of [y, y + 1]) { const d = md === '02-29' && !isLeap(yy) ? yy + '-02-28' : yy + '-' + md; if (d >= today) return d; }
    return e.date;
  }
  /* how far a date is: 'today', 'tomorrow', 'in 5 days', 'in 8 weeks', 'in 4 months', 'now' (inside a trip), '3 days ago' */
  function awayWords(date, today, end) {
    if (end && date < today && today <= end) return 'now';
    const n = diffDays(today, date);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    if (n < 0) return -n < 14 ? -n + ' days ago' : -n < 182 ? Math.round(-n / 7) + ' weeks ago' : Math.round(-n / 30.44) + ' months ago';
    if (n < 14) return 'in ' + n + ' days';
    if (n < 182) return 'in ' + Math.round(n / 7) + ' weeks';
    if (n < 730) return 'in ' + Math.round(n / 30.44) + ' months';
    return 'in ' + Math.round(n / 365.25) + ' years';
  }
  /* Give a fuzzy date its day: date (and a trip's end; the date again when there's none), and the window goes, so it's
     an ordinary date from then on. What was kept for its steps while they waited moves to the new date, and the
     to-do to pick it, if there was one, is done. Returns the event, or null. */
  function pickDate(state, id, date, end, today) {
    const e = eventOf(state, id);
    if (!e || !/^\d{4}-\d\d-\d\d$/.test(String(date || ''))) return null;
    const was = isFuzzy(e) ? e.window.from : null;
    /* what it gets ready for is written down first: without its window, a saved date with no list of its own would
       read the way version 8 did */
    e.ready = readyList(e, state).filter((r) => r.k !== 'pickdate').map((r) => Object.assign({}, r));
    e.date = date;
    /* (V11-3, C24: an end that isn't a date is the date again) */
    if (e.kind === 'trip') e.end = /^\d{4}-\d\d-\d\d$/.test(String(end || '')) && end >= date ? end : date;
    delete e.window;
    /* (with its days known, a trip that leaves something behind lines up who's covering it) */
    if ((e.kind === 'trip' || e.away) && !e.ready.some((r) => r.k === 'cover') && coverOf(state, e)) e.ready.push({ k: 'cover' });
    if (was && e.prep) {
      const prep = {};
      Object.keys(e.prep).forEach((k) => {
        const at = k.lastIndexOf('@'), v = e.prep[k];
        if (k.startsWith('pickdate')) { const t = (state.tasks || []).find((x) => x.id === v); if (t && !t.done) completeTask(state, t.id, today || date); prep[k] = v; return; }
        prep[at >= 0 && k.slice(at + 1) === was ? k.slice(0, at + 1) + date : k] = v;
      });
      e.prep = prep;
    }
    return e;
  }

  /* == V11-2: people, messages, and lists ==
     A heads-up for one person you'll see there: a trip asks "Anyone you want to see there?", and each name becomes
     one. The event keeps its list from then on: what it gets ready for, written down, and this. place: where that
     person is, when it isn't the date's own name (optional). Returns the entry ({ k: 'headsup', who, place? }), the one
     already there for the same person (any capitals), or null with no name. */
  function addHeadsUp(state, id, who, place) {
    const e = id && typeof id === 'object' ? id : eventOf(state, id), name = String(who || '').trim();
    if (!e || !name) return null;
    const had = (Array.isArray(e.ready) ? e.ready : []).find((r) => !!r && r.k === 'headsup' && String(r.who || '').trim().toLowerCase() === name.toLowerCase());
    if (had) return had;
    const entry = Object.assign({ k: 'headsup', who: name }, place && String(place).trim() ? { place: String(place).trim() } : {});
    if (Array.isArray(e.ready)) e.ready.push(entry);
    else e.ready = (freshEvent(e) ? readySuggest(e, state) : readySuggest8(e, state)).map((r) => (typeof r === 'string' ? { k: r } : Object.assign({}, r))).concat([entry]);
    return entry;
  }

  /* == V11-2: who's going, and who's covering ==
     Who's going (an event's going: 'me', 'us', 'family', or a list of names; optional, version 9, no migration): when
     more than the person is going, every suggested text for it says we (We'll be in LA, Count us in), and with the
     whole family going, the kids' drop-offs and pick-ups go with them. A trip or a date you travel to asks once, on a
     board with someone else in it, and its countdown's More changes it (setGoing).
     Who's covering (READY.cover, coverOf): what the days away leave behind that needs a person. The kids' drop-offs
     and pick-ups (the locked family routines) while the kids stay home, and a kid's appointment then too; care for
     someone who doesn't live with you, an appointment, groceries, meds, or a visit to look after them that names them
     (Dad’s cardiology, Groceries for Dad, Check on Walter); and a pet's walks and meals. A trip's first day counts from
     when you leave and its last until you're back; a date you travel to, its whole day. With nothing like that on
     those days (someone with no one to look after, a weekend away from weekday routines), nothing to cover. */
  const goingNames = (g) => (Array.isArray(g) ? g.map((n) => String(n || '').trim()).filter(Boolean) : []);
  function goingMore(state, e) {
    const g = e && e.going;
    if (g === 'us' || g === 'family') return true;
    const me = ownName(state);
    return goingNames(g).some((n) => n.toLowerCase() !== me);
  }
  /* the kids who live at home, by name */
  function homeKids(state) {
    const pr = (state && state.profile) || {};
    return (pr.kids || []).concat((pr.people || []).filter((x) => x && x.group === 'kids' && x.home).map((x) => x.name)).map((k) => String(k || '').trim()).filter((k, i, all) => k && all.indexOf(k) === i);
  }
  /* (the kids are going too: the whole family, or each of them by name) */
  function kidsGoing(state, e) {
    const g = e && e.going, kids = homeKids(state);
    if (g === 'family') return true;
    const names = goingNames(g).map((n) => n.toLowerCase());
    return !!kids.length && kids.every((k) => names.includes(k.toLowerCase()));
  }
  const CARE_KIN = ['mom', 'mum', 'mother', 'dad', 'father', 'grandma', 'granny', 'nana', 'grandmother', 'grandpa', 'granddad', 'grandfather', 'papa'];
  const CARE_APPT = /\b(doctor|doctors|dr|dentist|dental|orthodontist|pediatrician|appointment|appointments|appt|therapy|therapist|cardiology|cardiologist|checkup|check-up|clinic|hospital|surgery|infusion|dialysis|chemo|labs?|bloodwork|blood work|scan|mri|x-ray|optometrist|physio|eye doctor)\b/;
  const CARE_MEDS = /\b(meds|medicine|medication|medications|prescriptions?|pharmacy)\b/;
  const CARE_FOOD = /\bgrocer(y|ies)\b/;
  const CARE_VERB = /\b(check on|checking on|check in on|drive|driving|take|taking|help|helping|care|caring|sit with|stay with|meals? for)\b/;
  const CARE_PET = /\b(dog|dogs|puppy|cat|cats|kitten|pet|pets)\b/;
  const COVER_WORDS = /\b(cover|covering|check on|checking on|look after|looking after|sitter|babysit\w*|someone to|line up who)\b/;
  /* 'A', 'A and B', 'A, B, and C'; two parts where the first already says and get a comma between them */
  const andWords = (list) => (list.length <= 1 ? list[0] || '' : list.length === 2 ? list[0] + (/ and /.test(list[0]) ? ', and ' : ' and ') + list[1] : list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1]);
  /* What a trip (or a date you travel to) leaves behind that needs a person: { what, parts, people, days } or null.
     what: the words, Robin’s drop-offs and pick-ups, the kids’ drop-offs, Dad’s appointments and groceries, the
     dog’s walks; parts: each one's words; people: who or what they're for (Robin, kids, Dad, dog), for a to-do that's
     already on the list; days: how many days it's away */
  function coverOf(state, e) {
    if (!state || !e || !(e.kind === 'trip' || e.away) || isFuzzy(e) || !/^\d{4}-\d\d-\d\d$/.test(String(e.date || ''))) return null;
    const pr = state.profile || {}, trip = e.kind === 'trip';
    const kids = kidsGoing(state, e) ? [] : homeKids(state), lowKids = kids.map((k) => k.toLowerCase());
    const along = goingNames(e.going).map((n) => n.toLowerCase());
    /* the people someone looks after: a parent or grandparent by what the family calls them, and anyone on the board
       who doesn't live there (never a partner); never one who's going along */
    const theirs = (pr.people || []).filter((x) => x && x.name && !x.home && !['kids', 'partner', 'dating'].includes(x.group)).map((x) => String(x.name).trim().toLowerCase());
    const cared = CARE_KIN.concat(theirs).filter((p, i, all) => p && all.indexOf(p) === i && !along.includes(p));
    const last = trip && e.end && e.end > e.date ? e.end : e.date;
    const leave = trip ? (e.leave != null ? e.leave : 450) : 0, back = trip ? (e.back != null ? e.back : 1020) : 1440;
    let drops = 0, picks = 0;
    const kidsSeen = new Set(), care = new Map(), pet = { animal: null, walks: 0, meals: 0, other: 0 };
    /* who an item looks after: someone it names (Dad’s, for Dad, check on Dad), as the item spells them, when it's
       care (an appointment, groceries, meds, or a visit to look after them); or a kid, at an appointment */
    /* (V11-3, C10: each person's patterns are made once a call, never once an item) */
    const caredRe = cared.map((p) => ({ p, own: new RegExp('\\b' + reEsc(p) + '\'s\\b'), aim: new RegExp('\\b(?:for|on|with|drive|driving|take|taking|help|helping)\\s+' + reEsc(p) + '\\b'), word: new RegExp('\\b' + reEsc(p) + '\\b', 'i') }));
    const kidsRe = kids.map((k) => ({ k, re: new RegExp('\\b' + reEsc(k.toLowerCase()) + '\\b') }));
    const careFor = (low, raw) => {
      if (!(CARE_APPT.test(low) || CARE_FOOD.test(low) || CARE_MEDS.test(low) || CARE_VERB.test(low))) return null;
      for (const c of caredRe) {
        if (c.own.test(low) || c.aim.test(low)) { const m = raw.match(c.word); return capFirst(m ? m[0] : c.p); }
      }
      if (CARE_APPT.test(low)) for (const x of kidsRe) if (x.re.test(low)) return x.k;
      return null;
    };
    const look = (name, daycare) => {
      const raw = String(name || '').replace(/’/g, '\''), low = raw.toLowerCase();
      if (daycare) {
        if (!kids.length) return;
        const m = low.match(/^(?:drop off|drop-off|pick up|pick-up)\s+(.+)$/);
        const named = m ? m[1].split(/\s*(?:,|\band\b)\s*/).map((x) => x.trim()).filter(Boolean) : [];
        const who = named.map((n) => kids[lowKids.indexOf(n)]).filter(Boolean);
        (who.length ? who : kids).forEach((k) => kidsSeen.add(k));
        if (/\bdrop/.test(low)) drops++; else picks++;
        return;
      }
      const p = careFor(low, raw);
      if (p) {
        const c = care.get(p) || { appts: 0, food: 0, meds: 0, other: 0 };
        if (CARE_APPT.test(low)) c.appts++; else if (CARE_FOOD.test(low)) c.food++; else if (CARE_MEDS.test(low)) c.meds++; else c.other++;
        care.set(p, c);
        return;
      }
      const a = low.match(CARE_PET);
      if (a) {
        const animal = /dog|puppy/.test(a[1]) ? 'dog' : /cat|kitten/.test(a[1]) ? 'cat' : 'pets';
        pet.animal = pet.animal && pet.animal !== animal ? 'pets' : animal;
        if (/\bwalk/.test(low)) pet.walks++; else if (/\b(feed|food|meal|breakfast|dinner)/.test(low)) pet.meals++; else pet.other++;
      }
    };
    for (const d of range(e.date, Math.min(diffDays(e.date, last) + 1, 62))) {
      const from = d === e.date ? leave : 0, to = d === last ? back : 1440;
      const inside = (start, dur) => start != null && start < to && start + (dur || 0) > from;
      const tpl = templateFor(state, d);
      for (const b of (tpl && tpl.blocks) || []) if (!b.sleep && inside(b.start, b.dur)) look(b.name, !!b.daycare || /^(dropoff|pickup)\d*$/.test(String(b.id || '')));
      for (const x of timedOn(state, d)) if (x.id !== e.id && inside(x.start, x.dur)) look(x.name, false);
      for (const m of state.meetings || []) if ((m.days || []).includes(weekday(d)) && inside(m.start, m.dur)) look(m.name, false);
    }
    const parts = [], people = [];
    if (kidsSeen.size && (drops || picks)) {
      const ks = kids.filter((k) => kidsSeen.has(k));
      const whose = ks.length === 1 ? ks[0] + '’s' : ks.length === 2 ? ks[0] + ' and ' + ks[1] + '’s' : 'the kids’';
      parts.push(whose + ' ' + [drops ? (drops === 1 ? 'drop-off' : 'drop-offs') : '', picks ? (picks === 1 ? 'pick-up' : 'pick-ups') : ''].filter(Boolean).join(' and '));
      people.push(...(ks.length > 2 ? ['kids'] : ks));
    }
    care.forEach((c, p) => {
      parts.push(p + '’s ' + andWords([c.appts ? (c.appts === 1 ? 'appointment' : 'appointments') : '', c.food ? 'groceries' : '', c.meds ? 'meds' : '', c.other ? 'care' : ''].filter(Boolean)));
      people.push(p);
    });
    if (pet.animal) {
      parts.push((pet.animal === 'pets' ? 'the pets’ ' : 'the ' + pet.animal + '’s ') + andWords([pet.walks ? 'walks' : '', pet.meals ? 'meals' : '', pet.other ? 'care' : ''].filter(Boolean)));
      people.push(pet.animal);
    }
    return parts.length ? { what: andWords(parts), parts, people, days: diffDays(e.date, last) + 1 } : null;
  }
  /* Who's going, set or changed ('me', 'us', 'family', a list of names, or null to take it off), with what it means for
     covering, in the same change: a date whose days away now leave something behind gets ready for who's covering it
     (cover joins its list), and one that no longer does takes off its cover to-do if nobody has touched it yet (not
     done, on no day, its text never edited). Gives { going, cover, removed } (removed: that to-do's id) or null. */
  function setGoing(state, id, going) {
    const e = id && typeof id === 'object' ? id : eventOf(state, id);
    if (!e) return null;
    const names = goingNames(going), g = going === 'me' || going === 'us' || going === 'family' ? going : names.length ? names : null;
    if (g) e.going = g; else delete e.going;
    const cov = coverOf(state, e), keyOf = (r) => (typeof r === 'string' ? r : r && r.k);
    let removed = null;
    if (cov && !readyList(e, state).some((r) => r.k === 'cover')) {
      const list = Array.isArray(e.ready) ? e.ready : (freshEvent(e) ? readySuggest(e, state) : readySuggest8(e, state)).map((r) => (typeof r === 'string' ? r : Object.assign({}, r)));
      if (!list.some((r) => keyOf(r) === 'cover')) list.push('cover');
      e.ready = list;
    } else if (!cov) {
      const key = Object.keys(e.prep || {}).find((k) => k.split('@')[0] === 'cover');
      const t = key ? (state.tasks || []).find((x) => x.id === e.prep[key]) : null;
      /* (V11-3, C33: a step or a list item already checked is touched too) */
      const ticked = !!t && ((t.steps || []).some((x) => x && x.done) || (Array.isArray(t.list) && t.list.some((x) => x && x.done)));
      if (t && !t.done && !ticked && !(t.msg && typeof t.msg.text === 'string' && t.msg.text.trim()) && !(placements(state).get(t.id) || []).length) {
        state.tasks.splice(state.tasks.indexOf(t), 1);
        const prep = Object.assign({}, e.prep);
        delete prep[key];
        e.prep = prep;
        removed = t.id;
      }
    }
    return { going: e.going || null, cover: !!cov, removed };
  }
  /* A trip's packing list, the things inside its Pack block: clothes for each day of the trip, toiletries, meds,
     chargers, ID and wallet, and each kid at home's bag by name. [{ id, name, done }] with new ids. */
  function packList(state, e) {
    const days = e && e.kind === 'trip' && e.date && e.end ? diffDays(e.date, e.end) + 1 : 0;
    const kids = homeKids(state);
    const names = [days ? 'Clothes for ' + days + (days === 1 ? ' day' : ' days') : 'Clothes', 'Toiletries', 'Meds', 'Chargers', 'ID and wallet'].concat(kids.map((k) => k + '’s bag'));
    return names.filter((x, i, all) => all.indexOf(x) === i).map((name) => ({ id: newId('li'), name, done: false }));
  }
  /* The to-do a getting-ready step becomes, put on the list and kept on the event (prep), in one change: { id, name,
     icon, cat, dur, due, repeat: null, done: false, steps: [], of }, with msg ({ to }) for a message, a trip's
     packing list for Pack, and spread (daily, 30 minutes, from when it starts) for packing up a little each day.
     extra (group, steps, dur) is laid over it. r is an item from readyFor or lookAhead. Returns the to-do, or null. */
  function prepTodo(state, id, r, extra) {
    const e = id && typeof id === 'object' ? id : eventOf(state, id);
    if (!e || !r || !READY[r.k]) return null;
    const t = { id: newId('t'), name: r.todo, icon: r.icon, cat: r.cat, dur: r.dur, due: r.due, repeat: null, done: false, steps: [], of: e.id };
    if (READY[r.k].msg) t.msg = { to: r.who || '' };
    if (r.k === 'pack' && e.kind === 'trip') t.list = packList(state, e);
    if (READY[r.k].spread) t.spread = { days: 'daily', cap: 30, when: 'any', from: r.start };
    Object.assign(t, extra || {});
    state.tasks.push(t);
    e.prep = Object.assign({}, e.prep, { [r.key]: t.id });
    return t;
  }
  /* The days of a trip with the most open time on the board (time the trip's own block keeps open, free time, and
     the gaps around them), up to n (2), in date order; a day with none isn't one. For "Ask about a day". */
  function tripOpenDays(state, e, n) {
    if (!e || e.kind !== 'trip' || !e.date || !e.end) return [];
    const scored = range(e.date, diffDays(e.date, e.end) + 1).map((d) => {
      const day = calendarDay(state, d);
      let open = 0;
      for (const b of day.blocks) if (!b.sleep && (b.tpl === 'trip' || (b.soft && b.free))) open += b.dur;
      for (const g of gaps(day)) open += g[1] - g[0];
      return { d, open };
    }).filter((x) => x.open > 0);
    return scored.sort((a, b) => b.open - a.open || (a.d < b.d ? -1 : 1)).slice(0, n || 2).map((x) => x.d).sort();
  }

  /* == V11-2: suggested texts ==
     Made on the device; the app never sends anything, the person does, from Messages. kind: 'headsup', 'rsvp',
     'invites', 'thanks', or 'cover'. facts: { who, place, dates (words: 'Dec 18 to 22', 'on Dec 18'), name, date
     (words, or 'YYYY-MM-DD'), days ('YYYY-MM-DD's, for 'day'), we (more than the person is going: We'll be in LA, Count
     us in), what and span (who's covering: Robin's pick-ups, and how many days away) }; from and to can stand in for
     dates. style: none for the suggestion, 'shorter', 'warmer', or 'day' (a heads-up only: names two of the trip's
     days with the most open time; with none it's the suggestion). */
  const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  /* 'the 19th or 20th', 'Dec 31 or Jan 1', 'the 19th' */
  function dayChoices(days) {
    const ds = (days || []).filter((d) => /^\d{4}-\d\d-\d\d$/.test(String(d))).slice(0, 2);
    if (!ds.length) return '';
    const p = ds.map(parts);
    if (ds.length === 1) return 'the ' + ordinal(p[0].d);
    return p[0].m === p[1].m && p[0].y === p[1].y ? 'the ' + ordinal(p[0].d) + ' or ' + ordinal(p[1].d) : dateText(ds[0]) + ' or ' + dateText(ds[1]);
  }
  /* a date's name inside a sentence: a leading The, A, An, My, or Our in small letters (come to the block party),
     everything else as it was typed */
  const inSentence = (s) => String(s || '').trim().replace(/^(The|A|An|My|Our)\b/, (w) => w.toLowerCase());
  function suggestText(kind, facts, style) {
    const f = facts || {}, who = String(f.who || '').trim(), hey = who ? 'Hey ' + who + '!' : 'Hey!', hi = who ? 'Hi ' + who + '!' : 'Hi!';
    const dates = f.dates ? String(f.dates).trim() : f.from ? (f.to && f.to !== f.from ? spanText(f.from, f.to) : 'on ' + dateText(f.from)) : '';
    const where = (String(f.place || '').trim() || 'town') + (dates ? ' ' + dates : '');
    const name = inSentence(f.name) || 'it', d = String(f.date || '').trim(), on = d ? ' on ' + (/^\d{4}-\d\d-\d\d$/.test(d) ? dateText(d) : d) : '';
    /* (more than the person going: we, us) */
    const we = !!f.we, Ill = we ? 'We\'ll' : 'I\'ll', Im = we ? 'We\'re' : 'I\'m', Id = we ? 'We\'d' : 'I\'d', me = we ? 'us' : 'me', im = we ? 'we\'re' : 'I\'m';
    if (kind === 'headsup') {
      if (style === 'shorter') return hey + ' In ' + where + '. Free to meet up?';
      if (style === 'warmer') return hi + ' ' + Im + ' coming to ' + where + ' and it would mean a lot to see you. Any day work for you?';
      const pick = style === 'day' ? dayChoices(f.days) : '';
      if (pick) return hey + ' ' + Ill + ' be in ' + where + '. Could we get together on ' + pick + '?';
      return hey + ' ' + Ill + ' be in ' + where + ' and would love to see you. Are you around?';
    }
    if (kind === 'rsvp') {
      if (style === 'shorter') return 'Hi! Count ' + me + ' in for ' + name + on + '.';
      if (style === 'warmer') return 'Hi! Thank you for thinking of ' + me + '. ' + Id + ' love to come to ' + name + on + '. Count ' + me + ' in.';
      return 'Hi! ' + Id + ' love to come to ' + name + on + '. Count ' + me + ' in.';
    }
    if (kind === 'invites') {
      if (style === 'shorter') return 'Hey! ' + Im + ' having ' + name + on + '. Can you make it?';
      if (style === 'warmer') return 'Hey! ' + Im + ' having ' + name + on + ', and it wouldn\'t be the same without you. Can you make it?';
      return 'Hey! ' + Im + ' having ' + name + on + '. Would love for you to come. Can you make it?';
    }
    if (kind === 'thanks') {
      if (style === 'shorter') return 'Thank you for ' + name + '!';
      if (style === 'warmer') return 'Thank you so much for ' + name + '. It meant a lot, and ' + im + ' so glad you were there.';
      return 'Thank you so much for ' + name + '. It meant a lot.';
    }
    /* who's covering: what needs a person while you're away (f.what), for the days away (f.span: one, a week or less,
       or more) */
    if (kind === 'cover') {
      const what = String(f.what || '').trim().replace(/’/g, '\'') || 'things at home', span = Number(f.span) || 0;
      const when = span === 1 ? 'that day' : span && span <= 7 ? 'that week' : 'while ' + im + ' away', gone = dates ? ' ' + dates : '';
      if (style === 'shorter') return hey + ' Away' + gone + '. Could you cover ' + what + '?';
      if (style === 'warmer') return hi + ' ' + Ill + ' be away' + gone + ', and it would mean a lot if you could cover ' + what + ' ' + when + '. Would that work?';
      return hey + ' ' + Ill + ' be away' + gone + '. Could you cover ' + what + ' ' + when + '?';
    }
    return '';
  }
  /* The place in a date's name, for words that name it ("I'll be in Denver"). A name that's a place stays as it is
     (Denver, California, LA). Otherwise the place after to, in, or at ("Visit to Denver", "Trip to Chicago", "Weekend
     in Napa", "Drive to Portland in June": Portland), or before a word for a trip ("Denver trip", "Napa weekend"). A
     name with no place in it gives '': a person ("Visit Mom", "Thanksgiving at Mom’s"), or only words about the trip
     ("Family weekend", "Weekend at the lake", "Ski trip", "October trip"). Typed all in small letters, it gets its
     capitals. e: an event, or a name. */
  const TRIP_WORDS = new Set(['trip', 'trips', 'visit', 'visiting', 'weekend', 'week', 'vacation', 'vacay', 'getaway', 'holiday', 'holidays', 'journey', 'drive', 'flight', 'cruise', 'tour', 'retreat', 'reunion', 'staycation', 'break', 'honeymoon', 'babymoon']);
  const NOT_PLACE = new Set(['the', 'a', 'an', 'our', 'my', 'his', 'her', 'their', 'family', 'families', 'girls', 'guys', 'boys', 'kids', 'friends', 'friend', 'couples', 'solo', 'date', 'work', 'business', 'team', 'company', 'ski', 'skiing', 'beach', 'lake', 'mountain', 'mountains', 'cabin', 'cottage', 'camp', 'camping', 'road', 'fishing', 'golf', 'hiking', 'home', 'house', 'birthday', 'anniversary', 'christmas', 'thanksgiving', 'easter', 'spring', 'summer', 'fall', 'autumn', 'winter', 'long', 'quick', 'day', 'days', 'annual', 'big', 'little', 'first', 'last', 'next', 'this', 'that', 'away', 'out', 'of', 'and',
    'new', 'old', 'place', 'apartment', 'condo', 'flat', 'town', 'city', 'there', 'somewhere',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].concat(Array.from(TRIP_WORDS)));
  /* people, said the way a family says them, and the verbs that start "to see Grandma": never a place */
  const PERSON_WORDS = new Set(['mom', 'mum', 'mother', 'dad', 'father', 'parents', 'folks', 'grandma', 'granny', 'nana', 'grandmother', 'grandpa', 'granddad', 'grandfather', 'grandparents', 'papa', 'aunt', 'auntie', 'uncle', 'cousin', 'cousins', 'sister', 'brother', 'sis', 'bro', 'family', 'in-laws', 'see', 'visit', 'meet', 'help', 'pick', 'bring', 'take']);
  function placeOf(e) {
    const words = (x) => x.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z0-9-]+/).filter(Boolean);
    const isPlace = (x) => { const w = words(x); return !!w.length && !PERSON_WORDS.has(w[0]) && w.some((t) => !NOT_PLACE.has(t)); };
    const tidy = (x) => {
      const t = x.replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '').trim();
      if (n !== n.toLowerCase()) return t;
      return t.split(' ').map((w, i) => ((i === 0 ? /^(the|a)$/ : /^(of|the|and|de|la|on)$/).test(w) ? w : capFirst(w))).join(' ');
    };
    /* what it's for or who with isn't the place: "Denver for Thanksgiving", "Napa with Sam" */
    const n = String((e && typeof e === 'object' ? readyName(e) : e) || '').replace(/[.!?]+$/, '').trim().replace(/\s+(?:for|with|over)\s+.*$/i, '').trim();
    if (!n) return '';
    const bits = n.split(/\s+(to|in|at)\s+/i);
    if (bits.length > 1) {
      for (let i = bits.length - 1; i >= 2; i -= 2) if (isPlace(bits[i])) return tidy(bits[i]);
      return '';
    }
    const w = n.split(/\s+/), last = w[w.length - 1].toLowerCase();
    if (w.length > 1 && TRIP_WORDS.has(last)) { const x = w.slice(0, -1).join(' '); return isPlace(x) ? tidy(x) : ''; }
    if (words(n).some((t) => TRIP_WORDS.has(t))) return '';
    return isPlace(n) ? tidy(n) : '';
  }
  /* the facts a message for one of a date's steps needs, from the board: who, where, and when in words, and (with
     days) a trip's open days, which only Ask about a day uses. on: the date it's for (null for a fuzzy one); r: its
     ready entry or item, for a heads-up's place */
  function msgFacts(state, e, kind, who, on, r, today, days) {
    const f = { who: who || '' };
    if (!e) return f;
    const nm = readyName(e), day = on || e.date;
    /* (V11-2: who's going says I or we) */
    if (goingMore(state, e)) f.we = true;
    if (kind === 'headsup' || kind === 'cover') {
      if (kind === 'headsup') f.place = (r && r.place) || placeOf(e);
      f.dates = isFuzzy(e) ? windowParts(e.window, today || e.window.from).lead
        : e.kind === 'trip' && e.date && e.end && e.end !== e.date ? spanText(e.date, e.end) : day ? 'on ' + dateText(day) : '';
      if (kind === 'headsup' && days) f.days = tripOpenDays(state, e, 2);
      if (kind === 'cover') { const cov = coverOf(state, e); f.what = cov ? cov.what : ''; f.span = cov ? cov.days : e.kind === 'trip' && e.date && e.end ? diffDays(e.date, e.end) + 1 : 1; }
    } else {
      /* thank-you notes for a date you hosted thank people for coming to it */
      f.name = kind === 'thanks' && e.host ? 'coming to ' + inSentence(nm) : nm;
      if (day) f.date = dateText(day);
    }
    return f;
  }
  /* which message a to-do with no getting-ready key is, from its words */
  /* (V11-3, C1: a to-do with a text and no date it belongs to is a plain one, with no suggestion; a heads-up's words
     need the trip) */
  const msgKindOf = (t, e) => (/^reply to\b/i.test(t.name || '') ? 'rsvp' : /^send the invites\b/i.test(t.name || '') ? 'invites' : /^thank-you notes\b/i.test(t.name || '') ? 'thanks' : /^line up who/i.test(t.name || '') ? 'cover' : e ? 'headsup' : 'plain');
  /* Everything a message step shows, worked out from the board: { kind, to, text, suggested, versions }. kind is
     headsup, rsvp, invites, thanks, or cover; to the name; text the person's own words when they saved some (msg.text),
     else the suggestion; suggested always the plain suggestion; versions [{ id: 'shorter' | 'warmer' | 'day', name:
     'Shorter' | 'Warmer' | 'Ask about a day', text }], the ones that apply (Ask about a day only for a heads-up whose
     trip has open days). The date it belongs to comes from of, or from the date that keeps it (prep). null for a
     to-do that isn't a message. */
  function msgFor(state, taskId, today) {
    const t = (state.tasks || []).find((x) => x.id === taskId);
    if (!t) return null;
    const keeps = (x) => !!x.prep && Object.keys(x.prep).some((k) => x.prep[k] === t.id);
    const e = (t.of && eventOf(state, t.of)) || (state.events || []).find(keeps) || null;
    const key = e && e.prep ? Object.keys(e.prep).find((k) => e.prep[k] === t.id) || null : null;
    const k0 = key ? key.split(/[:@]/)[0] : null, keyed = !!(k0 && READY[k0] && READY[k0].msg);
    if (!t.msg && !keyed) return null;
    const kind = keyed ? k0 : msgKindOf(t, e);
    if (kind === 'plain') { const own0 = t.msg && typeof t.msg.text === 'string' && t.msg.text.trim() ? t.msg.text : ''; return { kind, to: String((t.msg && t.msg.to) || '').trim(), text: own0, suggested: '', versions: [] }; }
    const at = key ? key.lastIndexOf('@') : -1, colon = key ? key.indexOf(':') : -1;
    const who = String((t.msg && t.msg.to) || (colon >= 0 && colon < at ? key.slice(colon + 1, at) : '')).trim();
    const on = at >= 0 && /^\d{4}-\d\d-\d\d$/.test(key.slice(at + 1)) && !(e && isFuzzy(e)) ? key.slice(at + 1) : e ? nextOn(e, today || todayIso()) : null;
    const entry = e ? readyList(e, state).find((r) => r.k === kind && (!READY[kind].who || String(r.who || '').trim().toLowerCase() === who.toLowerCase())) || null : null;
    const facts = msgFacts(state, e, kind, who, on, entry, today, true);
    const suggested = suggestText(kind, facts);
    const versions = [{ id: 'shorter', name: 'Shorter', text: suggestText(kind, facts, 'shorter') }, { id: 'warmer', name: 'Warmer', text: suggestText(kind, facts, 'warmer') }];
    if (kind === 'headsup' && (facts.days || []).length) versions.push({ id: 'day', name: 'Ask about a day', text: suggestText(kind, facts, 'day') });
    const own = t.msg && typeof t.msg.text === 'string' && t.msg.text.trim() ? t.msg.text : '';
    return { kind, to: who, text: own || suggested, suggested, versions };
  }

  /* == V11-2: the two new questions ==
     The heads-up to ask about today, if any: one whose time to ask has come (its start) and isn't done or put off,
     the nearest last good day first. skip: { [key]: true } or a list of keys put off. For momentFor. */
  const KIN = { aunt: 'her', auntie: 'her', uncle: 'him', mom: 'her', mum: 'her', mother: 'her', dad: 'him', father: 'him', grandma: 'her', granny: 'her', nana: 'her', grandmother: 'her', grandpa: 'him', granddad: 'him', grandfather: 'him', papa: 'him', sister: 'her', brother: 'him' };
  /* 'Your aunt would love some notice about LA. Text her this week?', 'Sam would love some notice about LA. Text Sam this week?' */
  function noticeWords(who, place) {
    const w = String(who || '').trim(), first = w.split(/\s+/)[0].toLowerCase(), kin = KIN[first], about = place ? ' about ' + place : '';
    return kin ? 'Your ' + first + ' would love some notice' + about + '. Text ' + kin + ' this week?' : (w || 'Someone') + ' would love some notice' + about + '. Text ' + (w || 'them') + ' this week?';
  }
  function headsUpDue(state, today, skip) {
    if (skip === true) return null;
    const off = Array.isArray(skip) ? new Set(skip) : new Set(Object.keys(skip || {}).filter((k) => skip[k]));
    const tasks = new Map(state.tasks.map((t) => [t.id, t]));
    let best = null;
    /* (V11-3, C10: a heads-up is added by name, so only a date whose own list names someone can ask one; the rest,
       imported calendar events and all, are never read, and only its heads-ups are worked out) */
    for (const e of liveEvents(state)) {
      if (!Array.isArray(e.ready) || !e.ready.some((x) => x && x.k === 'headsup')) continue;
      const on = nextOn(e, today);
      if (!on) continue;
      for (const r of readyFor(state, e, on, today, tasks, null, 'headsup')) {
        if (r.k !== 'headsup' || off.has(r.key) || r.start > today || !['now', 'soon', 'added'].includes(r.when) || (r.task && r.task.done)) continue;
        if (!best || r.ideal < best.r.ideal) best = { e, r };
      }
    }
    if (!best) return null;
    const { e, r } = best, place = r.place || placeOf(e) || null, t = r.task;
    return { key: r.key, event: e.id, task: t ? t.id : null, who: r.who, place, date: r.ideal, start: r.start, words: noticeWords(r.who, place),
      text: (t && t.msg && typeof t.msg.text === 'string' && t.msg.text.trim()) || suggestText('headsup', msgFacts(state, e, 'headsup', r.who, r.on, r, today)) };
  }
  /* What from yesterday went by with no check: placed to-dos and steps not done (and with no time still ahead), and
     goal sessions nobody said anything about, in time order. [{ kind: 'task' | 'step' | 'goal', add, date, start,
     dur, name, task, step, goal, cat, icon }]. The sheet that asks offers Done, Move, or Let go; Let go takes the add
     off and leaves the to-do on the list, never done. */
  function yesterdayLoose(state, today, nowMin) {
    const y = addDays(today, -1), now = nowMin == null ? 0 : nowMin, out = [];
    const dd = state.dates[y];
    if (!dd || !(dd.adds || []).length) return out;
    const tasks = taskIndex(state), pl = placements(state);
    const ahead = (id, step) => (pl.get(id) || []).some((p) => (step == null || p.step === step) && windowTime(today, p.date, p.add.start) + p.add.dur > now);
    for (const a of (dd.adds || []).slice().sort((p, q) => p.start - q.start)) {
      const s = a.src;
      if (a.skipped || !s || windowTime(today, y, a.start) + a.dur > now) continue;
      const base = { add: a.id, date: y, start: a.start, dur: a.dur, cat: a.cat || 'yours', icon: a.icon || 'star', task: null, step: null, goal: null };
      if (s.type === 'task') {
        const t = tasks.get(s.id);
        if (!t || t.done || t.archived || ahead(t.id, null)) continue;
        out.push(Object.assign(base, { kind: 'task', name: t.name, task: t.id }));
      } else if (s.type === 'step') {
        const t = tasks.get(s.task), st = t && (t.steps || []).find((x) => x.id === s.id);
        if (!t || !st || st.done || t.done || t.archived || ahead(t.id, st.id)) continue;
        out.push(Object.assign(base, { kind: 'step', name: st.name, task: t.id, step: st.id }));
      } else if (s.type === 'goal') {
        const g = goalOf(state, s.id);
        if (!g || g.archived || g.paused || a.done || a.partial || (g.answers && g.answers[y]) || tripOn(state, y)) continue;
        out.push(Object.assign(base, { kind: 'goal', name: a.name, goal: g.id }));
      }
    }
    return out;
  }

  /* == V11-2: quick add on a full day ==
     When the time asked for has no room that day, quick add says the ask back with what's in the way, and offers real
     ways on (Grok's audit of V11): the same time on the nearest day where it fits and nothing moves, and the longest
     it can be at or near that time that day. roomFor gives all three: { way, day, shorter } (way from inTheWay, day
     { date, start } or null, shorter { start, dur } or null). When day and shorter are both null, nothing this week
     has room at that time. Never anything that's already over. */
  /* what a stretch of a day runs into: the hard blocks there (soft ones make room), and bed or wake when it runs past
     them: { blocks: [{ name, start, end, fixed, meal }], bed (minute) or null, wake (minute) or null } */
  function inTheWay(state, date, start, dur) {
    const end = start + dur, own = ownDay(state, date);
    /* (V11-3, D8: every block it reaches into, time with people and soft routines too (soft: true), so Evening with Sam
       is named; never open time or time kept free, which make room) */
    const blocks = calendarDay(state, date).blocks.filter((b) => !b.sleep && !b.free && b.cat !== 'open' && b.start < end && start < b.start + b.dur).sort(byStart)
      .map((b) => Object.assign({ name: b.label || b.name, start: b.start, end: b.start + b.dur, fixed: !!b.fixed, meal: mealBlock(b) }, b.soft ? { soft: true } : {}));
    return { blocks, bed: end > own.bed ? own.bed : null, wake: start < own.wake ? own.wake : null };
  }
  /* where a stretch fits on a date and nothing moves, from the person's wake to bed, from now on today: a quick check
     against the day's hard blocks and what a suggestion keeps clear of (keep, from keptBy), then canPlace to be sure */
  function openOn(state, date, today, nowMin, keep) {
    const own = ownDay(state, date), walls = calendarDay(state, date).blocks.filter((b) => !b.sleep && ((!b.soft && !b.free) || (!!keep && keep(b))));
    const lo = Math.max(own.wake, date === today ? ceilGrid(nowMin || 0) : 0), hi = Math.min(own.bed, 1440);
    return (s, len) => {
      if (date < today || s < lo || s + len > hi || walls.some((b) => b.start < s + len && s < b.start + b.dur)) return false;
      const r = canPlace(state, date, len, s);
      return r.ok && !(r.pushes || []).length && r.date === date;
    };
  }
  /* What a suggestion keeps clear of (V11-2). At the hour the person asked for, any soft block makes room, as an
     explicit placement always could (Evening with Sam, a free evening, Yours, soft Work): the ask, the shorter way at
     that hour, and the same hour on another day. Walls there are hard and locked blocks, events and meetings, sleep from
     bed on, and meals (they keep their window or ask). A time the board picks on its own (the closest time, a nudge more
     than an hour off, a shorter way at another hour) keeps out of work hours unless the thing is work (workThing: its
     kind of time is Work, or it's a to-do in a work group), the person's own time (ownBlock), and time with people
     (peopleBlock), each unless the ask itself reaches into that kind of time: a call asked for at 2 pm in Work can go
     later in Work. keptBy(state, date, start, minutes, thing) gives the test for a block of any day: true when a
     suggestion keeps clear of it */
  const workBlock = (b) => !!b && !!b.soft && !b.sleep && !b.fixed && b.cat === 'work';
  const peopleBlock = (b) => !!b && !!b.soft && !b.sleep && !b.fixed && !b.free && (b.cat === 'us' || b.cat === 'family' || b.cat === 'friends');
  const workGroup = (g) => !!g && (g.cat === 'work' || /\bwork\b/i.test(String(g.name || '')));
  function workThing(state, x) {
    if (!x) return false;
    if (x.cat === 'work') return true;
    /* (a to-do itself, or a block placed from a to-do or one of its steps) */
    const src = x.src || {}, tid = src.type === 'step' ? src.task : src.type === 'task' ? src.id : null;
    const t = x.group != null ? x : tid != null ? (state.tasks || []).find((y) => y.id === tid) : null;
    return !!t && (t.cat === 'work' || workGroup((state.groups || []).find((g) => g.id === t.group)));
  }
  function keptBy(state, date, start, dur, thing) {
    /* (what the ask reaches into, as the day was asked for: a free evening a party covers is still the free evening) */
    const there = calendarRecords(state, date).concat(calendarDay(state, date).blocks).filter((b) => b.start < start + dur && start < b.start + b.dur);
    const work = workThing(state, thing) || there.some(workBlock), own = there.some(ownBlock), people = there.some(peopleBlock);
    return (b) => (!work && workBlock(b)) || (!own && ownBlock(b)) || (!people && peopleBlock(b));
  }
  function roomFor(state, date, start, dur, today, nowMin, thing) {
    const len = gridDur(dur), way = inTheWay(state, date, start, len), keep = keptBy(state, date, start, len, thing);
    /* the same hour on the nearest day where nothing moves, a day either way at a time, up to six days, from today on:
       the person picked that hour, so any soft block there makes room */
    let day = null;
    for (let k = 1; k <= 6 && !day; k++) for (const d of [addDays(date, k), addDays(date, -k)]) if (!day && d >= today && openOn(state, d, today, nowMin)(start, len)) day = { date: d, start };
    /* the longest it can be that day, shorter than asked and half the ask at least, on the grid (a 3 h movie can be
       1 h 30 min, never 45 min): at the hour asked first, where any soft block makes room, then as close as two hours
       either way, keeping clear of what keep says; none when nothing that long fits */
    let shorter = null;
    const there = openOn(state, date, today, nowMin), near = openOn(state, date, today, nowMin, keep), least = Math.max(STEP, ceilGrid(len / 2));
    for (let l = len - STEP; l >= least && !shorter; l -= STEP) if (there(start, l)) shorter = { start, dur: l };
    for (let l = len - STEP; l >= least && !shorter; l -= STEP) {
      for (let k = 1; k <= 8 && !shorter; k++) for (const s of [start + k * STEP, start - k * STEP]) if (!shorter && near(s, l)) shorter = { start: s, dur: l };
    }
    return { way, day, shorter };
  }

  /* == V11-2: the countdown ==
     Everything the countdown panel and sheet draw, for a date (ref { event: id }) or a goal (ref { goal: id }), as of
     today and nowMin. The API block below has the shape. */
  function countdown(state, ref, today, nowMin) {
    const r = ref || {};
    if (r.event != null) { const e = eventOf(state, r.event); return e ? eventCountdown(state, e, today, nowMin) : null; }
    if (r.goal != null) { const g = goalOf(state, r.goal); return g ? goalCountdown(state, g, today, nowMin) : null; }
    return null;
  }
  function eventCountdown(state, e, today, nowMin) {
    const fuzzy = isFuzzy(e), trip = e.kind === 'trip', on = fuzzy ? null : nextOn(e, today);
    const end = trip && e.end ? e.end : null, now = nowMin == null ? 0 : nowMin;
    const tasks = new Map(state.tasks.map((t) => [t.id, t])), pl = placements(state);
    /* every step but one put off, or one well past asking that never became a to-do (it's likely handled) */
    const list = readyFor(state, e, on, today, tasks).filter((x) => x.when !== 'skip' && !(x.when === 'past' && !x.task));
    /* (D20: on the same last good day, a message comes first: five minutes to send, and the person on the other end
       needs the notice more than the booking does) */
    list.sort((a, b) => (a.ideal < b.ideal ? -1 : a.ideal > b.ideal ? 1 : !!b.msg - !!a.msg || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0)));
    const placedOf = (t) => {
      if (!t) return null;
      const where = (pl.get(t.id) || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.add.start - b.add.start));
      const p = where.find((x) => windowTime(today, x.date, x.add.start) + x.add.dur > now) || where[where.length - 1];
      return p ? { date: p.date, start: p.add.start } : null;
    };
    let gotNext = false;
    const items = list.map((x) => {
      const t = x.task, done = !!(t && t.done);
      let status = done ? 'done' : x.when === 'waiting' ? 'waiting' : null;
      if (!status) { status = gotNext ? (x.after ? 'after' : 'later') : 'next'; gotNext = true; }
      const msg = x.msg ? { to: (t && t.msg && t.msg.to) || x.who || '', text: (t && t.msg && typeof t.msg.text === 'string' && t.msg.text.trim()) || suggestText(x.k, msgFacts(state, e, x.k, x.who, x.on, x, today)) } : null;
      return { id: x.key, name: t ? t.name : x.todo, icon: x.icon, cat: x.cat, date: x.ideal, start: x.start, dur: t ? taskDur(t) : x.dur, status, why: x.why, msg, task: t ? t.id : null, placed: placedOf(t) };
    });
    const next = items.find((it) => it.status === 'next') || null;
    const icon = e.icon || (trip ? 'plane' : 'star'), cat = e.cat || (trip ? 'away' : 'family');
    const win = fuzzy ? { from: e.window.from, to: e.window.to } : null;
    const spans = on ? [{ from: on, to: end && end > on ? end : on, name: e.name, cat }] : [];
    const pins = items.filter((it) => it.status !== 'waiting').map((it) => ({ date: it.date, name: it.name, icon: it.icon, cat: it.cat, status: it.status, id: it.id }));
    const dates = [today].concat(pins.map((p) => p.date), spans.reduce((a, s) => a.concat([s.from, s.to]), []), win ? [win.from, win.to] : []).sort();
    const words = fuzzy ? windowWords(e.window, today) : on ? (end && end > on ? spanText(on, end) : dateText(on)) + ' · ' + awayWords(on, today, end) : '';
    return {
      shape: fuzzy ? 'window' : 'date', title: e.name, icon, cat, date: on, end: trip ? end : null, window: win, words, stand: null,
      road: { from: dates[0], to: dates[dates.length - 1], now: today, spans, window: win, stages: [], marks: [], pins },
      next, rest: items.filter((it) => it !== next), week: null, weeks: null
    };
  }
  function goalCountdown(state, g, today, nowMin) {
    const now = nowMin == null ? 0 : nowMin, rhythm = !g.date, p = goalProgress(state, g, today, nowMin);
    const ws = weekStart(today), we = addDays(ws, 6), icon = g.icon || GOAL_ICON[g.kind] || 'flag', cat = g.cat || 'yours';
    const list = goalSessions(state, g.id).filter((x) => !x.add.skipped);
    const ended = (x) => windowTime(today, x.date, x.add.start) + x.add.dur <= now;
    const item = (x, status) => ({ id: x.add.id, name: x.add.name, icon: x.add.icon || icon, cat: x.add.cat || cat, date: x.date, start: x.date, dur: x.add.dur, status, why: null, msg: null, task: null, placed: { date: x.date, start: x.add.start } });
    const nx = list.find((x) => !ended(x) && !x.add.done) || null;
    const next = nx ? item(nx, 'next') : null;
    const inWeek = list.filter((x) => x.date >= ws && x.date <= we);
    const rest = inWeek.filter((x) => x !== nx && !ended(x) && !x.add.done).map((x) => item(x, 'later'));
    let words, stand, road, week = null, weeks = null;
    if (rhythm) {
      const n = weekTimes(g), part = (g.parts || []).find((q) => !q.done) || (g.parts || [])[0] || null, len = Math.max(STEP, floorGrid((g.rhythm || {}).chunk || 60));
      /* the week's slots nothing is on yet: Not on your week yet */
      for (let k = inWeek.length; k < n; k++) rest.push({ id: g.id + ':' + ws + ':' + k, name: (part && part.name) || g.name, icon, cat, date: we, start: ws < today ? today : ws, dur: len, status: 'later', why: null, msg: null, task: null, placed: null });
      words = (n === 7 ? 'Every day' : n + (n === 1 ? ' time' : ' times') + ' a week') + ' · no end date';
      stand = g.paused ? 'Paused' : null;
      /* (D4: from the week it began, never before: a goal made today shows this week alone, not seven empty weeks
         that read as missed. Up to the last eight) */
      const began = weekStart(g.start && g.start < today ? g.start : today), back = Math.max(0, Math.min(7, Math.round(diffDays(began, ws) / 7)));
      weeks = [];
      for (let k = back; k >= 0; k--) { const from = addDays(ws, -7 * k), to = addDays(from, 6); weeks.push({ from, done: list.filter((x) => x.date >= from && x.date <= to && confirmed(g, x)).length, of: n }); }
      road = { from: addDays(ws, -7 * back), to: we, now: today, spans: [], window: null, stages: [], marks: [], pins: [] };
    } else {
      const st = examStages(state, g);
      words = dateText(g.date) + ' · ' + awayWords(g.date, today);
      /* (its first week never says Behind: what its days hold, calmly; whole hours past 20 h. V11-3: hours that came
         from the library, hoursGuess, are never said against: a guess can't be behind) */
      const holds = p.totalMin - p.behindMin, about = holds >= 1200 ? Math.round(holds / 60) * 60 : holds;
      stand = g.paused ? 'Paused' : g.date < today ? 'Its date has gone by' : g.date === today ? 'Today’s the day' : p.behindMin < STEP || g.hoursGuess ? 'On track' : p.firstWeek ? 'Days hold about ' + hoursText(about) : 'Behind by ' + hoursText(p.behindMin);
      const marks = st.practice.map((d) => ({ date: d, name: 'Practice exam' })).concat([{ date: g.date, name: g.kind === 'exam' ? 'Exam day' : g.name }]);
      road = { from: g.start && g.start < today ? g.start : today, to: g.date > today ? g.date : today, now: today, spans: [], window: null, stages: st.stages, marks, pins: [] };
      /* this week's share: what's planned and what someone said happened, and the sessions done or still ahead */
      week = { planned: p.week.plannedMin, done: p.week.doneMin, items: inWeek.filter((x) => confirmed(g, x) || !ended(x)).map((x) => item(x, x === nx ? 'next' : confirmed(g, x) ? 'done' : 'later')) };
    }
    return { shape: rhythm ? 'rhythm' : 'goal', title: g.name, icon, cat, date: g.date || null, end: null, window: null, words, stand, road, next, rest, week, weeks };
  }

  /* == V11 goals: the API ==
     The contract for the screens that use it. Dates are 'YYYY-MM-DD', times are minutes after midnight,
     today is the board's today, and nowMin is the minute it is now (null: the start of the day). A
     function that changes the board changes `state` in place, so call it inside the app's commit and one
     Undo takes it back. Words a person reads come back in `message`, ready to show.

     Breaking it down
       breakdown(name, opts, Data) gives { steps: [{ name, dur }], total, source: 'library' | 'rules', match }
         opts: { size: 'small' | 'medium' | 'big', kids, partner }. Small uses each step's finer version or
         cuts anything over 20 minutes in two or more; big keeps the first step and merges the rest into
         three; the first step is always 10 minutes or less. kids or partner false (or 0, or '') leaves out
         the steps that name {kid} or {partner}; named() in the app fills in the rest. match is the library
         entry's id, the verb and thing the rules read, or null for the fallback. The job a name's first words
         ask for comes before what it's about (JOBS): 'Gift for Jill's birthday party' is a gift, 'Go to a
         birthday party' an RSVP and a gift, 'Make a doctor appointment' booking it, not going.
         breakdown('Clean my room', {}, Data): 6 steps, 70 minutes, Pick up the floor 10, Put away laundry 15...
       suggestSteps(name, Data) gives the medium steps, [{ name, dur }], the shape it always had.
       looksLikeGoal(name, Data): 'Pass the bar exam' true, 'Eye exam' false, 'Pay the CFA exam fee' false.
       goalForExam(name, Data) gives { name, exam, kind, cat, parts: [{ name, min }], hours, note, source: 'exam' | 'template', match, mix }
         goalForExam('CFA Level I', Data): ten parts, hours 300, note 'About 300 hours is a common estimate.' Levels II and
         III have their own. mix: the parts take turns (exams, races); pass it on to newGoal.

     Quiet time, the only time any planner here uses
       quietWindows(state, date, when, after, day) gives [{ start, end, free }]; when: 'any' | 'morning' | 'afternoon' | 'evening';
         day (optional): the app's cached calendarDay(state, date) for the board as it is now.
       quietSlot(state, date, minutes, { when, strict, after }) gives the first start where it fits and nothing moves, or null.
       Quiet time is open time and time a handoff frees; own time (Yours blocks, free time, Breathing room, Open time:
       ownBlock) is used only when the person says yes: spreadPlan, applySpread, moveStep, and reflowTask with
       { own: true }, after the open time. spreadPlan then gives own: { min, days: [{ date, min, part, name }] }.
       ownTimeOf(state, date, start, minutes) gives { min, name }: the own time a stretch would take.
       stepSpot(state, date, minutes, { when, after }, today, nowMin) gives { start, gives } or null: quietSlot, or, when a
         goal's own sessions hold the quiet time, where a to-do's step goes in their place (gives: the sessions it takes).
         To-dos come first; the goal plans that time again.

     Spreading a to-do's steps
       spreadCap(name) gives 15 for housework and 30 for the rest.
       spreadPlan(state, taskId, opts, today, nowMin) gives { ok, days: [{ date, items: [{ step, name, start, dur, part, replaces, takes }] }],
         unplaced: [stepId], need, room, by, gave: [{ goal, name, min }], message, opts, today, nowMin } and changes nothing.
         Steps are aimed at their share of the days (four over two weeks land about every third day), keep their
         order behind the steps the plan put ahead of them, and take a goal's own time when that's all there is.
         opts: { days: 'daily' | 'weekdays' | 'weekends' | [weekday numbers], cap, when, from, by }; each falls back to
         task.spread, then to the default (cap by spreadCap, when 'any', from today, by the due date or six days on).
         Clean my room due Saturday, from Monday: '6 steps over 6 days, about 15 minutes a day, done by Saturday.'
         Short of days: 'This needs 2 more days than are left before Saturday.'
       applySpread(state, taskId, plan, opts, out) places the plan, re-checking each spot, and gives how many steps it placed.
         It keeps task.spread = { days, cap, when } (and by, when that isn't the due date). A step's missed times
         (an item's replaces) come off as it moves. out (optional) gets goals: the goals that gave time, planned again.

     Finding new times
       missedSteps(state, today, nowMin) gives [{ task, step, name, date, start, dur, add }].
       reflowTask(state, taskId, today, nowMin, { preview }) gives { moved: [{ step, name, from, to, start, add, missed }], unplaced, short, goals, message }:
         'Put away laundry moved to tomorrow. Still done by Saturday.' A step that can't fit by the date comes off the
         board, stays on the to-do, and is named (short), so no day goes over its cap: '... Vacuum doesn’t fit by
         Saturday now.' (the app asks what to do). Pinned steps stay. Calling it again moves nothing. preview: true
         works it out on a copy.
       moveStep(state, addId, today, nowMin, { from, preview }) gives { ok, date, start, goals, message }: a step of a to-do
         that wasn't spread, to the next quiet time from the day after it, a goal making room when it has to.

     Goals
       newGoal(fields) gives { id, name, kind, date, start, parts: [{ id, name, min, done }], rhythm: { days, wd, we, when, chunk },
         cat, icon, paused, archived, answers, mix? } with ids and defaults (a part 1,000 h at most); push it onto state.goals.
       goalSessions(state, goalId) gives [{ date, add }] in time order.
       goalProgress(state, goalOrId, today, nowMin, { day }) gives { totalMin, doneMin, unconfirmedMin, leftMin, daysLeft, capacityMin, behindMin, onTrack,
         week: { plannedMin, doneMin, unconfirmedMin }, nextSession, partsLeft, parts: [{ id, name, min, done, doneMin, unconfirmedMin, leftMin }], perDay }.
         done is only what someone said happened (Done, Yes, Some of it); time that went by with no word is
         unconfirmed, and left to plan counts it as having happened.
         Pass a goal object with a different rhythm or date for a what-if. day (optional) is the app's cached
         calendarDay for the board as it is now: about 1 ms a call with it, about 15 ms without, for a goal
         four months away.
       planGoal(state, goalId, today, nowMin, { horizon: 14, day }) gives { placed, removed, shortMin, message }
         (day is used only past the horizon, which planning doesn't change; it helps when the cache is warm):
         '14.5 h this week, about 2 h a day.' or 'Behind by 137 h. Add a day, make days a little longer, or move the date.'
         (behindText(goal, minutes): no Add a day when every day is in the rhythm). An exam's or a race's parts take
         turns, and its last three days take half the day's time.
       skipGoalSession(state, date, addId, today, nowMin, 'all' | 'some', minutesDone) gives planGoal's result with { ok, skipped, how,
         back, spread }: '1 h spread over the days before Feb 24.'
       goalCheckIn(state, today) gives the last week's days nobody answered for, newest first, one entry a goal a day:
         [{ goal, name, date, min, sessions }]. A session marked done isn't asked about, nor a day away on a trip.
       answerCheckIn(state, goalId, date, 'yes' | 'some' | 'no', { today, nowMin, minutes }) gives planGoal's result with { ok, answer, back }.
         It answers for the sessions still waiting for a word: yes marks them done, some keeps what was done as done.
       endSessionEarly(state, date, key, minute, today, nowMin): Done early on a session. endEarly's result with { plan, message };
         what happened is done, and the rest goes to the days ahead, never back onto today: '30 min goes to the days ahead.'
       giveWay(state, today, nowMin, { days }) gives { moved, off, goals, message }: sessions and spread steps a commitment now
         covers (a date added, a meeting, a trip) make way, steps under their cap and sessions planned again:
         'Torts moved to 5:15 pm.' Call it in the same commit as the change. applyPreset(..., { today, nowMin }) keeps
         a session that already started on Take it easy. capacity() also gives goals: the time to-dos could take.
       A session is an add: { name, cat, icon, dur, start, src: { type: 'goal', id, part }, pinned, skipped, partial }.
       placeAdd, moveAdd, and resizeBlock pin a session or a step. A skipped session stays in the adds and takes
       no time on the board. A day where a session was skipped or kept short (partial) is left as it is from
       then on: nothing new goes on it, what's on it stays, and its time spreads forward from the next day.

     Cook once, eat twice (slot: 'breakfast' | 'lunch' | 'dinner')
       cookExtra(state, { date, slot }, [{ date, slot }]) gives { ok, linked, name, to }. From Sunday's dinner to Monday's
         lunch, Monday's lunch becomes { name: 'Leftovers: Chicken and rice', how: 'leftovers', from: { date, slot } }.
       servingsOf(state, date, slot): the meal and its leftovers, 3 for a dinner with two leftover lunches.
       leftoversOf(state, date, slot) gives [{ date, slot }].
       syncLeftovers(state) gives how many meals it changed; call it after any meal change, in the same commit.
       groceries() lines also carry serves and servings: [{ date, slot, serves }].
       prepPlan(state, weekStart, { today, nowMin, days, cover, cook }, Data) gives { week, batches, fresh, list, block, message },
         not applied: 'Two batch cooks, Sunday and Wednesday, cover 5 more meals, with 5 fresh nights.'
       applyPrepPlan(state, plan, { block }) gives { meals, block }. A Meal prep block is an add with
         src { type: 'prep', week } and makes: [{ date, slot, name }].

     Big moments (V11-2, docs/BIG-MOMENTS.md; tests/big-moments-model.test.mjs)
       Saved, version 9, every field optional: an event's window { from, to } with date null (a fuzzy date), host, away,
         and deadline; a ready entry's who and place; a to-do's msg { to, text } (text only once the person edits it),
         list [{ id, name, done }], and of (the event's id); a step's doneOn; a goal's rhythm.n (times a week, for a goal
         with no date); practice: true on a practice exam session.
       READY has the new kinds: headsup, rsvp, stay, outfit, timeoff, invites, food, shop, tidy, papers, finish, notice,
         movers, address, packup, pickdate, unpack, groceries, thanks; each { name, short, todo, lead, by, icon, cat, dur },
         with msg, who, why, after, fuzzy, spread, or work where they apply. READY_FOR adds host, deadline, and move.
       readySuggest(e, state) gives a new date's defaults (keys, or { k, lead, by }: a wedding's gift starts four weeks
         out); keep it as the event's ready when the date is made. readyList(e, state) gives the entries an event gets
         ready for: its own, or a suggestion (a saved event without a list keeps version 8's). readyFits(k, state): a
         kind for a panel's choices (time off only with work, groceries only with meals; never headsup or pickdate).
         boardWorks(state), boardMeals(state).
       readyFor(state, e, on, today) items also carry who, why, msg, after, and place, and when can be 'waiting' (a fuzzy
         date's step before its date is picked; on is null there). A heads-up's prep key is 'headsup:' + who + '@' + date.
       lookAhead: a fuzzy date has fuzzy: true and window, at its window's first day (shown); a date that went by shows
         at `from` (over: true) while something after it is due.
       addHeadsUp(state, eventId, who, place) gives the entry. prepTodo(state, eventId, item, extra) puts the to-do on the
         list and in prep and gives it. packList(state, trip) gives [{ id, name, done }]. tripOpenDays(state, trip, n).
       windowFor('this-month' | 'next-month' | 'spring' | 'summer' | 'fall' | 'winter' | 'few-months', today) gives
         { from, to }; windowWords(window, today): 'Sometime in spring · Mar to May'; isFuzzy(e); pickDate(state, id,
         date, end, today) makes it an ordinary date; awayWords(date, today, end): 'in 8 weeks'.
       examStages(state, goal) gives { stages: [{ from, to, name: 'Learn' | 'Practice' | 'Review' | 'Lighter days' }],
         practice: [Saturdays] }; planGoal puts a practice exam (practice: true, one sitting of up to 4 h) on each one in
         its horizon. A goal with no date plans by the week (rhythm.n times, rhythm.chunk long); goalProgress gives it
         perWeek: { n, done, planned } and behindMin 0.
       suggestText(kind, facts, style) gives a message's text; msgFor(state, taskId, today) gives { kind, to, text,
         suggested, versions }. placeOf(event or name) gives the place in a date's name ('Visit to Denver': Denver), or ''
         when it names none ('Visit Mom'); a heads-up then says in town, and its question names no place. yesterdayLoose(state, today, nowMin) gives [{ kind, add, date, start, dur, name, task,
         step, goal, cat, icon }]. headsUpDue(state, today, skip) gives the heads-up to ask about, or null.
       momentFor(state, date, min, seen, day, { big: true }) can also give { kind: 'yesterday', items, count, words } and
         { kind: 'headsup', key, event, task, who, place, date, start, words, text }.
       countdown(state, { event: id } | { goal: id }, today, nowMin) gives { shape, title, icon, cat, date, end, window,
         words, stand, road: { from, to, now, spans, window, stages, marks, pins }, next, rest, week, weeks }; an item is
         { id, name, icon, cat, date, start, dur, status, why, msg, task, placed }.
       parseQuick(text, today, palette, nowMin, { big: true }) also reads a move ("move in spring"), a trip ("trip to
         Denver Dec 3 to 6"), and a message ("text Aunt Lisa about LA"): { kind: 'date', name, event } and { kind:
         'message', name, who, about }. tripFor(state, about, today) gives { event, place } or null.
       Who's going and who's covering (tests/going-cover.test.mjs): an event's going is 'me', 'us', 'family', or a list
         of names (optional, version 9, no migration). goingMore(state, e): more than the person is going, so every
         suggested text for it says we (msgFacts gives we). setGoing(state, eventId, going) sets it in one change with
         who's covering and gives { going, cover, removed }. READY.cover ({ cover: true, msg: true }, lead 28, by 14):
         'Line up who’s covering {what} while you’re away'; readySuggest offers it for a trip or a date you travel to
         whose days leave something behind that needs a person, pickDate when a fuzzy one gets its days, and readyFor
         asks it only while that holds (items carry what). coverOf(state, e) gives { what, parts, people, days } or null:
         the kids' drop-offs and pick-ups while they stay home, care for someone by name, a pet's walks and meals.

     Meals keep their time (tests/meal-window.test.mjs): mealBlock(b) is a Dinner block, anything that's Meals, or a
       template Breakfast, Lunch, or Dinner; mealWindow(state, b, date) gives { lo, hi, at }, its usual start an hour
       either way. canPlace, placeAdd, moveAdd, moveTemplate, resizeBlock, and previewExtend never move a meal further
       out than its window without a yes: canPlace picks a way that keeps it in (pushInsert), else gives { ok: false,
       reason: 'meal', meal: { name, key, fromDate, from, date, to }, pushes } for the question "This moves Dinner to
       4:45 pm. Move it?"; a stretch stops short. The yes is opts.meals (the last argument of each), or withMeals(true,
       fn) around any change.
     Quick add on a full day (tests/quick-add-full.test.mjs): roomFor(state, date, start, minutes, today, nowMin, thing)
       gives { way, day, shorter }: inTheWay's { blocks: [{ name, start, end, fixed, meal, soft }], bed, wake }, the same hour on
       the nearest day where nothing moves ({ date, start } or null), and the longest it can be that day, half the ask at
       least on the grid, at the hour asked first ({ start, dur } or null). thing is what's being added (an add, or a
       to-do). At the hour asked (the ask, the shorter way there, the same hour on another day) any soft block makes
       room. keptBy(state, date, start, minutes, thing) gives (block) => true for what a time the board picks on its own
       keeps clear of: soft Work unless the thing is work (workThing(state, thing): Work, or a to-do in a work group), the
       person's own time (ownBlock), and time with people, each unless the ask itself reaches into it. roomFor's shorter
       way at another hour and the app's closest time more than an hour off (nearestStart) use it. */

  const api = {
    parseIcs, liveEvents, zoneToUtc, inZone,
    RAIL0, RAIL1, STEP, MIN_LEN, snap, clamp, overlaps, clone, newId,
    DAY_SHORT, DAY_LONG, MONTH_LONG, MONTH_SHORT,
    iso, parts, addDays, addMonths, weekday, diffDays, weekStart, sundayOf, setWeekStart, weekStartDay, weekOrder, shiftWeeks, monthKey, monthStart, daysInMonth, todayIso, range, weekDates, monthGrid, dateTime, windowTime, visibleHours, windowPosition,
    dateText, spanText, relText, clock, setClock24, span, dur, hours,
    markersOn, tripOn, timedOn, shapeOf, templateFor, resolveDay, calendarRecords, calendarDay, resolveWindow, gaps, totals, awake,
    canPlace, magnet, firstFit, gridDur, placeAdd, findAdd, removeAdd, moveAdd, moveTemplate, slideSoft, canResize, resizeBlock, setWake, setBed, applyPushes, dateRec,
    withMeals, mealBlock, mealWindow, pushInsert,
    placements, taskDur, taskPlan, taskStatus, dueSoon, REPEATS, nextDue, completeTask, reopenTask, suggestSteps, clashes, clashesIn, capacity,
    presetSlot, applyPreset, presetFromDay,
    groceries, groceryProgress, dinnerFromItems, upcoming, dayCard,
    nowInfo, blockRecord, previewEndEarly, endEarly, previewExtend, extendBlock, fillIdeas, momentFor, remindersFor, mergeBoards, parseQuick, sameBoard: same
  };
  /* V11: Look ahead, getting ready, and kept holidays */
  Object.assign(api, { READY, READY_FOR, readyKeys, readyFor, lookAhead, holidayEvents, holidayTwins, holidayReady });
  /* V11 goals: breaking it down, spreading it out, finding new times, goals, and cook once, eat twice */
  Object.assign(api, {
    breakdown, looksLikeGoal, goalForExam,
    quietWindows, quietSlot, spreadCap, spreadPlan, applySpread, missedSteps, reflowTask, moveStep, stepSpot, ownBlock, ownTimeOf,
    newGoal, goalSessions, goalProgress, planGoal, skipGoalSession, goalCheckIn, answerCheckIn, endSessionEarly, behindText, giveWay,
    cookExtra, servingsOf, leftoversOf, syncLeftovers, prepPlan, applyPrepPlan
  });
  /* V11, the Today walk (Oct 15): the person's own day (ownDay, dayAt), a weekday unlike the rest (dayDiffers),
     a locked block that leaves home (leavesHome), and what open time offers (nextUp, startNext, openIdeas) */
  Object.assign(api, { ownDay, dayAt, dayDiffers, leavesHome, nextUp, startNext, openIdeas });
  /* V11, the Planner walk (Oct 15): a hand-off's outline on the board (setHandoffs), and a block made part of the usual
     week on its weekday (addToUsual) */
  Object.assign(api, { setHandoffs, addToUsual, findFree });
  /* V11-2, big moments (Oct 20): getting ready for more kinds of dates, fuzzy dates, heads-ups and message steps,
     lists inside a block, exam stages, goals with no date, the two new questions, and the countdown */
  Object.assign(api, {
    readySuggest, readyList, readyFits, boardWorks, boardMeals, isFuzzy, windowFor, windowWords, awayWords, pickDate,
    addHeadsUp, prepTodo, packList, tripOpenDays, examStages, suggestText, msgFor, headsUpDue, yesterdayLoose, countdown, placeOf,
    inTheWay, roomFor, keptBy, workThing
  });
  /* V11-2, quick add's big things: parseQuick(..., { big: true }) reads a move, a trip, and a message; tripFor finds
     the trip a message is about */
  Object.assign(api, { tripFor });
  /* V11-2, who's going (we in its texts) and who's covering what a trip leaves behind */
  Object.assign(api, { goingMore, setGoing, coverOf, homeKids });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Model = api;
})(typeof window !== 'undefined' ? window : globalThis);
