/* A small, shared allowlist for voluntary technical reports. Error messages, URLs, stacks,
   device names, tokens, and planner contents never belong in this report. A person's note is
   separate and contains the words they choose to send. */
(function (root) {
  'use strict';
  const oneOf = (values) => (v) => values.includes(v);
  const integer = (max) => (v) => Number.isInteger(v) && v >= 0 && v <= max;
  const bool = (v) => typeof v === 'boolean';
  const plain = (v) => !!v && !Array.isArray(v) && Object.prototype.toString.call(v) === '[object Object]' && [Object.prototype, null].includes(Object.getPrototypeOf(v));
  const iso = (v) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v));
  const zone = (v) => {
    if (typeof v !== 'string' || v.length > 64) return false;
    try { return !!new Intl.DateTimeFormat('en', { timeZone: v }).resolvedOptions().timeZone; } catch (e) { return false; }
  };
  const kinds = ['runtime', 'promise', 'change', 'panel', 'desk', 'reframe', 'save', 'opening'];
  const codes = ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'SecurityError', 'QuotaExceededError', 'full', 'blocked', 'db', 'other'];
  const context = (v) => typeof v === 'string' && /^(?:phone )?(?:planner|today), (?:day|week|month|year)(?:, list)?$/i.test(v);
  function object(schema) {
    return (v) => plain(v) && Object.keys(v).every((k) => Object.hasOwn(schema, k) && schema[k](v[k]));
  }
  const errorShape = object({ at: iso, kind: oneOf(kinds), code: oneOf(codes) });
  const schema = {
    when: iso, version: (v) => integer(9999)(v) && v > 0, where: context,
    /* zoom accepts reports from the previous local client without accepting arbitrary strings. */
    zoom: oneOf(['day', 'week', 'month', 'year']),
    screen: object({ width: integer(20000), height: integer(20000), scale: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0.1 && v <= 16 }),
    browser: object({ family: oneOf(['Chrome', 'Safari', 'Firefox', 'Edge', 'Other']), major: integer(9999) }),
    desk: object({ available: bool, framed: bool, lighter: bool }),
    saving: object({ mode: oneOf(['local', 'db']), status: oneOf(['saved', 'saving', 'error']), error: oneOf(['none', 'full', 'blocked', 'db', 'other']), unreadable: bool }),
    sync: object({ state: oneOf(['off', 'saved', 'saving', 'offline', 'refused', 'no-server']), pending: bool }),
    board: object({ tasks: integer(1000000), dates: integer(1000000), events: integer(1000000), calendars: integer(1000000), rescues: integer(1000000) }),
    timeZone: object({ device: zone, home: zone }),
    errors: (v) => Array.isArray(v) && v.length <= 8 && v.every((e) => errorShape(e) && Object.keys(e).length === 3)
  };
  const reportValid = object(schema);
  const pick = (v, values, fallback) => values.includes(v) ? v : fallback;
  function error(kind, err, at) {
    return { at: iso(at) ? at : new Date().toISOString(), kind: pick(kind, kinds, 'runtime'), code: pick(err && (err.name || err.what), codes, 'other') };
  }
  function browser(ua) {
    const m = String(ua || '').match(/(Edg|Firefox|Chrome|Version)\/(\d+)/);
    return { family: m ? ({ Edg: 'Edge', Firefox: 'Firefox', Chrome: 'Chrome', Version: 'Safari' })[m[1]] : 'Other', major: m ? Math.min(9999, Number(m[2])) : 0 };
  }
  function report(source) {
    const s = source || {}, count = (v) => Number.isInteger(v) ? Math.max(0, Math.min(1000000, v)) : 0;
    const errors = (s.errors || []).slice(-8).map((e) => error(e.kind, { name: e.code }, e.at));
    const out = {
      when: new Date().toISOString(), version: Number.isInteger(s.version) && s.version > 0 && s.version <= 9999 ? s.version : 1,
      where: context(s.where) ? s.where : 'planner, day',
      screen: { width: Math.min(20000, count(s.width)), height: Math.min(20000, count(s.height)), scale: typeof s.scale === 'number' && s.scale >= 0.1 && s.scale <= 16 ? s.scale : 1 },
      browser: browser(s.userAgent), desk: { available: !!s.available, framed: !!s.framed, lighter: !!s.lighter },
      saving: { mode: pick(s.saveMode, ['local', 'db'], 'local'), status: pick(s.saveStatus, ['saved', 'saving', 'error'], 'error'), error: pick(s.saveError, ['none', 'full', 'blocked', 'db'], s.saveError ? 'other' : 'none'), unreadable: !!s.unreadable },
      sync: { state: pick(s.syncState, ['off', 'saved', 'saving', 'offline', 'refused', 'no-server'], 'off'), pending: !!s.pending },
      board: {}, timeZone: { device: zone(s.deviceZone) ? s.deviceZone : 'UTC' }, errors
    };
    ['tasks', 'dates', 'events', 'calendars', 'rescues'].forEach((k) => { out.board[k] = count(s.board && s.board[k]); });
    if (zone(s.homeZone)) out.timeZone.home = s.homeZone;
    return out;
  }
  function feedback(body) {
    if (!plain(body) || Object.keys(body).some((k) => !['text', 'where', 'report'].includes(k))) return { error: 'bad-feedback' };
    if (typeof body.text !== 'string') return { error: 'bad-feedback' };
    if (!body.text.trim()) return { error: 'needs-words' };
    if (body.text.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.text)) return { error: 'bad-feedback' };
    if (body.where !== undefined && !context(body.where)) return { error: 'bad-feedback' };
    if (body.report !== undefined && body.report !== null && (!reportValid(body.report) || JSON.stringify(body.report).length > 8000)) return { error: 'bad-feedback' };
    return { value: { text: body.text.trim(), where: body.where || '', report: body.report == null ? null : JSON.parse(JSON.stringify(body.report)) } };
  }
  const api = { error, report, feedback, reportValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Diagnostics = api;
})(typeof window !== 'undefined' ? window : globalThis);
