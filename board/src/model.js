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
  const markersOn = (state, date) => liveEvents(state).filter((e) => e.kind === 'marker' && (e.yearly ? yearlyDay(e, date) : e.date === date));
  const tripOn = (state, date) => liveEvents(state).find((e) => e.kind === 'trip' && e.date <= date && date <= e.end) || null;
  const timedOn = (state, date) => liveEvents(state).filter((e) => e.kind === 'timed' && e.date === date);

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
      const b = Object.assign({}, b0, e || {});
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
    (dd.adds || []).slice().sort(byStart).forEach((a) => {
      const b = {
        key: 'add:' + a.id, base: 'add:' + a.id, add: a.id, src: a.src || null,
        name: addName(state, a, tasks), cat: a.cat || 'yours', icon: a.icon || 'star',
        start: a.start, dur: a.dur, done: addDone(state, a, tasks)
      };
      if (a.dinner) b.dinner = true;
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
  function calendarRecords(state, ownerDate) {
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
      if (e && e.gone) continue;
      const b = Object.assign({}, b0, e || {}, { key: 'tpl:' + b0.id, base: 'tpl:' + b0.id, tpl: b0.id });
      /* A changed wake or bed still trims its routines, as before. Placed things and calendar
         commitments retain their requested time even when it is outside those routines. */
      const movedOutside = e && e.start != null && (b.start < wake || b.start + b.dur > bed);
      const clipped = movedOutside ? [b] : clip([b], wake, bed);
      if (clipped.length) put(clipped[0], b.soft ? 1 : 2);
    }
    timedOn(state, ownerDate).forEach((e) => put({ key: 'ev:' + e.id, base: 'ev:' + e.id, event: e.id, cal: e.cal || null, name: e.name, cat: e.cat || 'family', icon: e.icon || 'star', start: e.start, dur: e.dur, fixed: true, big: !!e.big }, 3));
    if (!trip && !off) state.meetings.filter((m) => (m.days || []).includes(weekday(ownerDate))).forEach((m) => put({ key: 'mt:' + m.id, base: 'mt:' + m.id, meeting: m.id, name: m.name, cat: 'work', icon: 'people', start: m.start, dur: m.dur, fixed: true }, 4));
    (dd.adds || []).forEach((a) => put(Object.assign({ key: 'add:' + a.id, base: 'add:' + a.id, add: a.id, src: a.src || null, name: addName(state, a, tasks), cat: a.cat || 'yours', icon: a.icon || 'star', start: a.start, dur: a.dur, done: addDone(state, a, tasks) }, a.dinner ? { dinner: true } : {}), 5));
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

  function gaps(day) {
    const out = [];
    let c = day.wake;
    for (const b of day.blocks) {
      if (b.start > c) out.push([c, b.start]);
      c = Math.max(c, b.start + b.dur);
    }
    if (c < day.bed) out.push([c, day.bed]);
    return out.filter((g) => g[1] - g[0] >= MIN_LEN);
  }
  function totals(days) {
    const t = { free: 0 };
    for (const d of [].concat(days)) {
      for (const b of d.blocks) t[b.cat] = (t[b.cat] || 0) + b.dur;
      for (const g of gaps(d)) t.free += g[1] - g[0];
    }
    return t;
  }
  const awake = (t) => Object.keys(t).reduce((a, k) => a + (k === 'sleep' ? 0 : t[k]), 0);

  /* == placing == */
  /* Put a hard block of length dur at start, sliding movable neighbors out of the way.
     Fixed blocks are walls. Tries pushing right, left, and splitting, and keeps whatever moves least. */
  function pushInsert(movable, walls, n, lo, hi, rightOnly) {
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
      tries.push({ arr, moved: arr.reduce((a, t, i) => a + Math.abs(t.start - all[i].start), 0) });
    }
    if (!tries.length) return { ok: false, reason: 'full' };
    tries.sort((a, b) => a.moved - b.moved);
    const pushes = tries[0].arr.map((t, i) => ({ base: t.sourceKey || t.base, start: t.start, dur: t.dur, sourceDate: t.sourceDate, sourceStart: t.sourceStart, delta: t.start - all[i].start, fixed: t.fixed })).filter((p) => !p.fixed && p.delta).map(({ fixed, ...p }) => p);
    return { ok: true, pushes };
  }

  /* Can a block of `dur` minutes go at `start` on `date`? `key` is its own base key when moving it.
     Returns { ok, start, pushes } where pushes are neighbors that slide to make room. */
  function canPlace(state, date, dur, start, key, rightOnly) {
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
      else movable.push(b);
    }
    const r = pushInsert(movable, walls, { start: at.start, dur }, lo, hi, rightOnly);
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
  function placeAdd(state, date, add, start) {
    add = Object.assign({}, add, { dur: gridDur(add.dur) });
    const r = canPlace(state, date, add.dur, start, add.id ? 'add:' + add.id : null);
    if (!r.ok) return r;
    applyPushes(state, r.date, r.pushes);
    const dd = dateRec(state, r.date);
    dd.adds = dd.adds || [];
    const a = Object.assign({}, add, { id: add.id || newId('a'), start: r.start });
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
  function moveAdd(state, id, date, start) {
    const f = findAdd(state, id);
    if (!f) return { ok: false };
    const add = Object.assign({}, f.add);
    const before = clone(state.dates);
    removeAdd(state, id);
    const r = placeAdd(state, date, add, start);
    if (!r.ok) state.dates = before;
    return r;
  }
  /* Slide a template block (a routine) to a new start on its own date. */
  function moveTemplate(state, date, tplId, start, dur) {
    const key = 'tpl:' + tplId, b = blockRecord(state, date, key);
    if (!b) return { ok: false };
    const d = dur || b.dur;
    const r = canPlace(state, date, d, start, key);
    if (!r.ok) return r;
    applyPushes(state, r.date, r.pushes);
    const dd = dateRec(state, date);
    dd.edits = dd.edits || {};
    dd.edits[tplId] = Object.assign({}, dd.edits[tplId], { start: windowTime(date, r.date, r.start), dur: d });
    return r;
  }
  /* Change a block's length from its start, pushing later blocks. Shrinks the ask until it fits. */
  function canResize(state, date, key, newDur) {
    const b = blockRecord(state, date, key);
    if (!b) return { ok: false };
    newDur = Math.max(STEP, snap(newDur));
    for (let d = newDur; d >= STEP; d -= STEP) {
      const r = canPlace(state, date, d, b.start, key, true);
      if (r.ok) return Object.assign(r, { dur: d, recordStart: b.start });
      if (d <= b.dur) break;
    }
    return { ok: false };
  }
  function resizeBlock(state, date, key, newDur) {
    const r = canResize(state, date, key, newDur);
    if (!r.ok) return r;
    applyPushes(state, r.date, r.pushes);
    const dd = dateRec(state, date);
    if (key.startsWith('tpl:')) {
      dd.edits = dd.edits || {};
      const id = key.slice(4);
      dd.edits[id] = Object.assign({}, dd.edits[id], { start: r.recordStart, dur: r.dur });
    } else if (key.startsWith('add:')) {
      const a = (dd.adds || []).find((x) => x.id === key.slice(4));
      if (a) a.dur = r.dur;
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
    nt.steps = (t.steps || []).map((s) => Object.assign({}, s, { id: newId('s'), done: false }));
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
  function suggestSteps(name, Data) {
    const n = (name || '').toLowerCase();
    const hit = Data.BREAKDOWNS.find((b) => b.words.some((w) => n.includes(w)));
    return clone(hit ? hit.steps : Data.BREAKDOWN_ANY);
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
  function applyPreset(state, date, preset, palette) {
    const dd = dateRec(state, date);
    /* your usual puts the day back the way it goes most weeks; to dos and steps you gave a time stay */
    if (preset.usual) {
      const keep = (dd.adds || []).filter((a) => a.src && (a.src.type === 'task' || a.src.type === 'step'));
      delete dd.edits; delete dd.wake; delete dd.bed; delete dd.preset;
      if (keep.length) dd.adds = keep; else delete dd.adds;
      return { ok: true, placed: 0, kept: keep.length };
    }
    /* a rough day: what isn't locked comes off except meals, and to dos placed today go back to the
       list, still due, so nothing is lost and nothing is asked of today */
    if (preset.easy) {
      const day = resolveDay(state, date);
      dd.edits = dd.edits || {};
      for (const b of day.blocks) if (b.tpl && !b.fixed && !b.sleep && b.cat !== 'meals' && !b.dinner) dd.edits[b.tpl] = { gone: true };
      const before = (dd.adds || []).length;
      const back = (dd.adds || []).filter((a) => a.src && (a.src.type === 'task' || a.src.type === 'step')).length;
      dd.adds = (dd.adds || []).filter((a) => a.dinner || a.cat === 'meals');
      dd.preset = preset.id;
      return { ok: true, placed: 0, back, off: before - dd.adds.length };
    }
    if (!preset.additive) dd.adds = (dd.adds || []).filter((a) => !(a.src && a.src.type === 'preset'));
    /* a blank slate, or a saved kind of day that starts from one: routines that aren't locked come off */
    if (preset.empty || preset.clear) {
      const day = resolveDay(state, date);
      dd.edits = dd.edits || {};
      for (const b of day.blocks) if (b.tpl && !b.fixed && !b.sleep) dd.edits[b.tpl] = { gone: true };
      dd.adds = (dd.adds || []).filter((a) => a.src && (a.src.type === 'task' || a.src.type === 'step'));
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
    const items = (dd.adds || []).filter((a) => !(a.src && (a.src.type === 'task' || a.src.type === 'step'))).sort((a, b) => a.start - b.start)
      .map((a) => Object.assign({ name: a.name, cat: a.cat, icon: a.icon, dur: a.dur, start: a.start, when: a.start < 720 ? 'morning' : a.start < 1080 ? 'afternoon' : 'evening', p: a.src && (a.src.block || (a.src.type === 'block' ? a.src.id : null)) }, a.dinner ? { dinner: true } : {}));
    const names = items.map((x) => x.name).slice(0, 3).join(', ');
    const line = clear ? (items.length ? 'A clear day with ' + names : 'A clear day. Only locked blocks stay') : names || 'Nothing placed yet';
    return Object.assign({ id: newId('pr'), name, icon: 'star', line, items, mine: true }, clear ? { clear: true } : {});
  }

  /* == dinners == */
  function groceries(state, dates) {
    const byId = new Map(state.pantry.map((p) => [p.id, p]));
    const out = new Map();
    const NOT = ['out', 'order', 'skip', 'leftovers'];
    const add = (ids, d) => {
      for (const id of ids || []) {
        const p = byId.get(id);
        if (!p) continue;
        if (!out.has(id)) out.set(id, { id, name: p.name, kind: p.kind, days: [] });
        const x = out.get(id);
        if (!x.days.includes(d)) x.days.push(d);
      }
    };
    for (const d of dates) {
      const dn = state.dinners[d];
      if (dn && !NOT.includes(dn.cook)) add(dn.items, d);
      /* breakfast and lunch, where a version plans them on the board too (state.meals) */
      const ml = state.meals && state.meals[d];
      if (ml) for (const k of ['breakfast', 'lunch']) { const m = ml[k]; if (m && typeof m === 'object' && !NOT.includes(m.how)) add(m.items, d); }
    }
    const order = { protein: 0, veg: 1, base: 2, extra: 3 };
    return Array.from(out.values()).sort((a, b) => ((order[a.kind] ?? 3) - (order[b.kind] ?? 3)) || a.name.localeCompare(b.name));
  }
  /* How far the shopping is: the list as it stands, and how many of those are checked. A check for
     something that left the list (a dinner changed) is kept, in case it comes back, and never counted. */
  function groceryProgress(state, dates) {
    const list = groceries(state, dates);
    const got = (state.shopping && state.shopping[weekStart(dates[0])]) || {};
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
     every year asks again next year. */
  const READY = {
    gift: { name: 'A gift', short: 'Gift', todo: 'Gift for {x}', lead: 21, by: 3, icon: 'gift', cat: 'family', dur: 45 },
    gifts: { name: 'Gifts', short: 'Gifts', todo: 'Gifts for {x}', lead: 56, by: 10, icon: 'gift', cat: 'family', dur: 90 },
    plans: { name: 'Plans', short: 'Plans', todo: 'Plans for {x}', lead: 21, by: 7, icon: 'calendar', cat: 'family', dur: 30 },
    travel: { name: 'Booking travel', short: 'Booking', todo: 'Book travel for {x}', lead: 56, by: 28, icon: 'plane', cat: 'family', dur: 45 },
    pack: { name: 'Packing', short: 'Packing', todo: 'Pack for {x}', lead: 3, by: 1, icon: 'shirt', cat: 'home', dur: 45 },
    tickets: { name: 'Tickets', short: 'Tickets', todo: 'Tickets for {x}', lead: 28, by: 14, icon: 'film', cat: 'yours', dur: 15 },
    wear: { name: 'Something to wear', short: 'Something to wear', todo: 'Something to wear to {x}', lead: 21, by: 5, icon: 'shirt', cat: 'yours', dur: 60 },
    costume: { name: 'Costumes', short: 'Costumes', todo: 'Costumes for {x}', lead: 28, by: 5, icon: 'shirt', cat: 'family', dur: 60 }
  };
  /* what each kind of date can get ready for, in the order a panel offers them */
  const READY_FOR = { marker: ['gift', 'plans'], trip: ['travel', 'pack'], timed: [], occasion: ['gift', 'tickets', 'wear', 'travel'] };
  /* a line about getting ready shows a little before it starts: as long again as it takes, up to three
     weeks (packing from six days out, gifts for a holiday from eleven weeks out) */
  const headsUp = (r) => Math.min(21, r.lead);
  /* V11: the person whose board it is, said the way a date would name them (Alex's birthday) */
  const ownName = (state) => String((state && state.profile && state.profile.name) || '').trim().toLowerCase();
  function readySuggest(e, state) {
    const n = String(e.name || '').toLowerCase().replace(/’/g, '\'');
    if (e.kind === 'trip') return ['travel', 'pack'];
    /* nobody needs a reminder to buy their own birthday gift, by any name */
    const me = ownName(state);
    if (e.kind === 'marker') return /^(your|my) birthday/.test(n) || (me && n.startsWith(me + '\'s birthday')) ? [] : /birthday/.test(n) || e.icon === 'cake' ? ['gift'] : /anniversary/.test(n) ? ['plans'] : [];
    if (e.kind === 'timed' && e.occasion) return /wedding|shower|party|birthday|graduation|retire/.test(n) ? ['gift'] : /concert|show|game|match|play|theat|festival|tickets/.test(n) ? ['tickets'] : [];
    return [];
  }
  const readyList = (e, state) => (Array.isArray(e.ready) ? e.ready : readySuggest(e, state)).map((r) => (typeof r === 'string' ? { k: r } : r)).filter((r) => r && READY[r.k]);
  /* the keys an event gets ready for, the ones it keeps or the ones it would be offered */
  const readyKeys = (e, state) => readyList(e, state).map((r) => r.k);
  /* a holiday that begins at sundown is named for its beginning; what you get ready for is the holiday */
  const readyName = (e) => String(e.name || '').replace(/ begins$/, '');
  /* V11: a to-do already on the list for it counts: one that says what it is (a gift, packing) and
     names the date's person, place, or holiday, due between the day to start and the date. A holiday
     also takes one that says what it is and names no other date coming up (Family gifts before
     Christmas). Booking travel only asks until four weeks out; after that it's likely done. */
  const READY_WORDS = { gift: /\bgifts?\b|present/, gifts: /\bgifts?\b|present/, plans: /\bplan/, travel: /\bbook|flight|hotel|travel|train|ticket/, pack: /\bpack/, tickets: /ticket/, wear: /\bwear|outfit|dress|suit/, costume: /costume/ };
  const READY_LATE = { travel: false };
  const STOP = ['the', 'and', 'for', 'with', 'from', 'weekend', 'trip', 'visit', 'birthday', 'anniversary', 'begins', 'day', 'party', 'night'];
  const plainWords = (s) => String(s || '').toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.includes(w));
  function readyTask(state, e, r, on, start, others) {
    const words = READY_WORDS[r.k];
    if (!words) return null;
    const mine = plainWords(readyName(e));
    const hit = state.tasks.filter((t) => !t.archived && t.due && t.due >= addDays(start, -14) && t.due <= on && words.test(String(t.name || '').toLowerCase())).find((t) => {
      const tw = plainWords(t.name);
      if (mine.some((w) => tw.includes(w))) return true;
      return !!(e.holiday || e.readyFrom) && !others.some((w) => tw.includes(w));
    });
    return hit || null;
  }
  function readyFor(state, e, on, today, tasks, others) {
    if (on < today) return [];
    tasks = tasks || new Map(state.tasks.map((t) => [t.id, t]));
    return readyList(e, state).map((r) => {
      const R = READY[r.k], lead = r.lead != null ? r.lead : R.lead, by = r.by != null ? r.by : R.by;
      const key = r.k + '@' + on, got = e.prep && e.prep[key];
      const start = addDays(on, -lead), ideal = addDays(on, -by);
      const task = got && got !== 'skip' ? tasks.get(got) || null : !got ? readyTask(state, e, r, on, start, others || []) : null;
      /* a to-do made for it is due by the day it should be done; if that's gone by, before the date */
      const due = ideal >= today ? ideal : addDays(on, -1) >= today ? addDays(on, -1) : today;
      /* well past when it should be done (booking a trip that's days away), it's likely handled: gone */
      const late = READY_LATE[r.k] !== false;
      const when = task ? (task.done ? 'done' : 'added') : got === 'skip' ? 'skip' : today < start ? 'later' : today <= ideal ? 'now' : !late || diffDays(today, on) < Math.ceil(by / 2) ? 'past' : 'soon';
      return { k: r.k, key, name: R.name, short: R.short, todo: R.todo.replace('{x}', readyName(e)), icon: R.icon, cat: R.cat, dur: R.dur, lead, by, start, ideal, due, when, task, on };
    });
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
    const named = liveEvents(state).filter((e) => e.kind === 'marker' || e.kind === 'trip' || e.big || e.occasion).map((e) => ({ id: e.id, words: plainWords(readyName(e)) }));
    const othersOf = (e) => named.filter((x) => x.id !== e.id).reduce((a, x) => a.concat(x.words), []);
    const push = (e, on, extra) => {
      const all = readyFor(state, e, on, today, tasks, othersOf(e));
      const far = on > to, near = (r) => diffDays(today, r.start) <= headsUp(r);
      const ready = all.filter((r) => r.when !== 'skip' && r.when !== 'past' && (r.when !== 'later' || near(r)) && (!far || (r.when !== 'done' && (r.when !== 'added' || near(r)))));
      if (far && !ready.length && !(keeps.includes(e.id) && !out.some((x) => x.id === e.id))) return;
      out.push(Object.assign({ date: on, kind: e.kind, name: e.name, icon: e.icon || (e.kind === 'trip' ? 'plane' : 'star'), id: e.id, holiday: e.holiday || e.readyFrom || null, occasion: !!e.occasion, yearly: !!e.yearly, off: !!e.off, ready, far }, extra || {}));
    };
    for (const d of range(from, diffDays(from, farTo) + 1)) {
      for (const m of markersOn(state, d)) push(m, d);
      for (const e of timedOn(state, d)) if (e.big || e.occasion) push(e, d, { start: e.start, dur: e.dur });
    }
    for (const e of liveEvents(state)) if (e.kind === 'trip' && e.end >= from && e.date <= farTo) push(e, e.date, { end: e.end, shown: e.date < from ? from : e.date });
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
     of to dos due by then that don't have a time yet. Free time kept on purpose doesn't count as room. */
  function capacity(state, from, days, today, nowMin) {
    let room = 0;
    for (const d of range(from, days)) {
      if (d < today) continue;
      const day = calendarDay(state, d), cut = d === today && nowMin != null ? nowMin : -1;
      const add = (a, b) => { const s0 = Math.max(a, cut); if (b > s0) room += b - s0; };
      for (const g of gaps(day)) add(g[0], g[1]);
      for (const b of day.blocks) if (b.soft && !b.free && (b.cat === 'yours' || b.cat === 'open')) add(b.start, b.start + b.dur);
    }
    const to = addDays(from, days - 1);
    const pl = placements(state);
    let need = 0;
    for (const t of state.tasks) if (!t.done && !t.archived && t.due && t.due <= to) need += taskPlan(t, pl.get(t.id), today, nowMin).left;
    return { room, need };
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
  function previewEndEarly(state, date, key, min) {
    const rec = blockRecord(state, date, key);
    if (!rec) return { ok: false };
    const pieces = calendarLine(state, date).filter((b) => b.sourceDate === date && b.sourceKey === key);
    const cur = pieces.find((b) => b.start <= min && min < b.start + b.dur);
    if (cur && pieces.some((b) => b.start >= cur.start + cur.dur)) return { ok: false, reason: 'continues' };
    const end = Math.floor(min / STEP) * STEP;
    if (end - rec.start < STEP || end >= rec.start + rec.dur) return { ok: false, reason: 'short' };
    return { ok: true, end, back: rec.start + rec.dur - end, rec };
  }
  function endEarly(state, date, key, min) {
    const r = previewEndEarly(state, date, key, min);
    if (r.ok) setRecord(state, date, key, { start: r.rec.start, dur: r.end - r.rec.start });
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
    const r = pushInsert(others.filter((b) => !b.fixed && !b.soft), walls, { start: end, dur: mins }, lo, hi, true);
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
  function fillIdeas(palette, rows, len) {
    const byId = new Map(palette.map((p) => [p.id, p]));
    const out = [];
    for (const r of rows) {
      if (r.name === 'Work') continue;
      const p = r.ids.map((id) => byId.get(id)).find((x) => x && !x.free && (gridDur(x.dur) <= len || (len >= 30 && x.dur <= len * 2)));
      if (p) out.push(Object.assign({}, p, { dur: Math.min(gridDur(p.dur), Math.floor(len / STEP) * STEP) }));
      if (out.length === 3) break;
    }
    return out;
  }
  /* The one question worth asking at minute `min`, if any. Tonight's dinner from 3 pm (or an hour
     before) until it's over; on any morning but Sunday, what kind of day it is. seen holds what was
     answered or put off today: { dinnerAt, dinnerNo, kind }. Put off once, dinner asks again then,
     and the second time it offers Not tonight. */
  function momentFor(state, date, min, seen, resolved) {
    const s = seen || {};
    const d = resolved || resolveDay(state, date);
    const din = d.blocks.find((b) => b.dinner);
    if (din && !din.planned && !s.dinnerNo) {
      const from = s.dinnerAt != null ? s.dinnerAt : Math.min(15 * 60, din.start - 60);
      if (min >= from && min < din.start + din.dur) return { kind: 'dinner', block: din, again: s.dinnerAt != null };
    }
    const dd = state.dates[date] || {};
    if (weekday(date) !== 0 && !s.kind && !dd.preset && min >= d.wake && min < 11 * 60) return { kind: 'kind' };
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
    const out = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
    for (const k of keys) {
      const b = base[k], m = mine[k], t = theirs[k];
      if (MAP_KEYS.includes(k) && (m || t)) {
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
    return { doc: out, clashes };
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
  /* Read a line like "Gym Tue 6pm 45m" into a block, or a to do when there's no time.
     Returns { kind: 'block' | 'task', name, date, start, dur, cat, icon, pal, bits } or null when empty. */
  function parseQuick(text, today, palette, nowMin, opts) {
    /* opts.dayFirst: in this place 6/10 is the sixth of October */
    const dayFirst = !!(opts && opts.dayFirst);
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
    /* which day */
    take(/\stonight\s/i, () => { date = today; part = 'evening'; });
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
    return out;
  }

  const api = {
    parseIcs, liveEvents, zoneToUtc, inZone,
    RAIL0, RAIL1, STEP, MIN_LEN, snap, clamp, overlaps, clone, newId,
    DAY_SHORT, DAY_LONG, MONTH_LONG, MONTH_SHORT,
    iso, parts, addDays, addMonths, weekday, diffDays, weekStart, sundayOf, setWeekStart, weekStartDay, weekOrder, shiftWeeks, monthKey, monthStart, daysInMonth, todayIso, range, weekDates, monthGrid, dateTime, windowTime, visibleHours, windowPosition,
    dateText, spanText, relText, clock, setClock24, span, dur, hours,
    markersOn, tripOn, timedOn, shapeOf, templateFor, resolveDay, calendarRecords, calendarDay, resolveWindow, gaps, totals, awake,
    canPlace, magnet, firstFit, gridDur, placeAdd, findAdd, removeAdd, moveAdd, moveTemplate, canResize, resizeBlock, setWake, setBed, applyPushes, dateRec,
    placements, taskDur, taskPlan, taskStatus, dueSoon, REPEATS, nextDue, completeTask, reopenTask, suggestSteps, clashes, clashesIn, capacity,
    presetSlot, applyPreset, presetFromDay,
    groceries, groceryProgress, dinnerFromItems, upcoming, dayCard,
    nowInfo, blockRecord, previewEndEarly, endEarly, previewExtend, extendBlock, fillIdeas, momentFor, remindersFor, mergeBoards, parseQuick, sameBoard: same
  };
  /* V11: Look ahead, getting ready, and kept holidays */
  Object.assign(api, { READY, READY_FOR, readyKeys, readyFor, lookAhead, holidayEvents, holidayTwins, holidayReady });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Model = api;
})(typeof window !== 'undefined' ? window : globalThis);
