/* V11-2, from Russell's tactic deck and the audit of live V11: errors say their real cause and stay until they're
   handled, and the phone keeps the last change's Undo. (1) Smart breakdowns says what happened when Claude's
   steps or a goal's parts didn't come (app.js aiTrouble, aiAgainAt); the client keeps the cause (variant.js aiAsk,
   tests/ai-smart.test.mjs). (2) An error toast stays until its x puts it away or the trouble clears (toastFeel's
   kind 'error', errorDone), while every other toast fades. (3) The phone's head card keeps the last change's Undo,
   with Redo once something was undone (phoneUndo). Cut out of app.js and run in small worlds of their own. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { app, M, plain } from './v11-rig.mjs';

/* == 1. the real cause == */
/* the clock held at 4:15 pm and 20 seconds; Date.now() is a fixed moment, so a limit's time can be worked out */
const NOW = 1_000_000;
class Clock { getSeconds() { return 20; } static now() { return NOW; } }
function words() {
  const script = `
    const nowMin = 975;
    ${app('  /* what Break it down says when Claude', '  /* Smarter steps from Claude')}
    ({ aiTrouble, aiAgainAt, bdAiFail });`;
  return runInNewContext(script, { M, Date: Clock });
}
const nb = (s) => String(s).replace(/ /g, ' ');

test('each cause is said as it is, with Try again only where trying again can help', () => {
  const w = words();
  const say = (e, what = 'steps', shown = true) => { const r = plain(w.aiTrouble(e, what, shown)); r.line = nb(r.line); return r; };
  assert.deepEqual(say({ code: 'offline' }), { line: 'You’re offline, so these are the built-in steps. Ask Claude again when you’re back.', again: true });
  assert.deepEqual(say({ code: 'too_many', limit: 'minute', most: 10, at: NOW + 35000 }), { line: 'That’s 10 asks this minute. Try again at 4:16 pm.', again: true });
  assert.deepEqual(say({ code: 'too_many', limit: 'day', most: 100, at: NOW + 3600000 }), { line: 'That’s 100 asks today. Try again tomorrow.', again: false });
  assert.deepEqual(say({ code: 'not_ready' }), { line: 'Smart breakdowns aren’t set up here. These are the built-in steps.', again: false });
  assert.deepEqual(say({ code: 'timeout' }), { line: 'Claude didn’t answer in time.', again: true });
  assert.deepEqual(say({ code: 'odd' }), { line: 'Claude’s answer didn’t fit the board. These are the built-in steps.', again: true });
  assert.deepEqual(say({ code: 'unreachable' }), { line: 'Couldn’t reach Claude. These are the built-in steps.', again: true });
  assert.deepEqual(say({ code: 'upstream' }), { line: 'Claude couldn’t answer this time. These are the built-in steps.', again: true });
  assert.deepEqual(say({ code: 'bad_request' }), { line: 'Claude couldn’t read that name. These are the built-in steps.', again: false });
});

test('a goal’s parts say these parts stay; with nothing built in on the screen, no line claims there is', () => {
  const w = words();
  assert.equal(nb(w.aiTrouble({ code: 'offline' }, 'parts', true).line), 'You’re offline, so these parts stay. Ask Claude again when you’re back.');
  assert.equal(nb(w.aiTrouble({ code: 'not_ready' }, 'parts', true).line), 'Smart breakdowns aren’t set up here. These parts stay.');
  assert.equal(nb(w.aiTrouble({ code: 'offline' }, 'steps', false).line), 'You’re offline. Ask Claude again when you’re back.');
  assert.equal(nb(w.aiTrouble({ code: 'not_ready' }, 'steps', false).line), 'Smart breakdowns aren’t set up here.');
  /* Break it down's own line, read from its draft */
  assert.equal(nb(w.bdAiFail({ aiErr: { code: 'timeout' }, rows: [{}] })), 'Claude didn’t answer in time.');
});

test('the minute’s limit names the clock time it lets go, rounded up to the minute; once that’s gone by, now', () => {
  const w = words();
  assert.equal(nb(w.aiAgainAt(NOW + 35000)), '4:16 pm', '4:15:20 and 35 seconds is 4:15:55, so 4:16');
  assert.equal(nb(w.aiAgainAt(NOW + 50000)), '4:17 pm', '4:16:10 waits for 4:17');
  assert.equal(w.aiAgainAt(NOW - 1000), null);
  assert.equal(nb(w.aiTrouble({ code: 'too_many', limit: 'minute', most: 10, at: NOW - 1000 }, 'steps', true).line), 'That’s 10 asks this minute. Try again now.');
});

test('no wording that isn’t the real cause is left anywhere: no “a lot of asks”', () => {
  for (const f of ['../board/src/app.js', '../variants/corners11/variant.js', '../variants/corners11/api/smart.js']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/a lot of asks/i.test(src), f);
  }
});

/* == 2. errors that stay == */
/* a small DOM: elements with children, attributes, a click, and animations that end when their timers run */
function dom() {
  const node = (tag, cls, text) => {
    const n = {
      tag, className: cls || '', text: text || '', kids: [], attrs: {}, style: {}, parent: null, on: {},
      get children() { return n.kids; }, get childNodes() { return n.kids; }, get firstChild() { return n.kids[0]; },
      get isConnected() { return !!n.parent; },
      get textContent() { return n.text + n.kids.map((k) => k.textContent).join(''); },
      appendChild(k) { if (k.parent) k.remove(); k.parent = n; n.kids.push(k); return k; },
      append(...ks) { ks.forEach((k) => n.appendChild(typeof k === 'string' ? node('#text', '', k) : k)); },
      remove() { if (!n.parent) return; const p = n.parent; p.kids.splice(p.kids.indexOf(n), 1); n.parent = null; },
      setAttribute(k, v) { n.attrs[k] = String(v); }, getAttribute(k) { return n.attrs[k]; },
      addEventListener(k, fn) { n.on[k] = fn; },
      getBoundingClientRect: () => ({ top: 0 }), animate: () => ({ onfinish: null }),
      querySelector(c) { const f = (x) => (x.className.split(' ').includes(c.slice(1)) ? x : x.kids.map(f).find(Boolean)); return f(n) || null; },
      click() { if (n.fn) n.fn(); }
    };
    return n;
  };
  const timers = [];
  return {
    node, timers,
    box: node('div', 'toasts'),
    setTimeout: (fn, ms) => { timers.push({ fn, ms, live: true }); return timers.length; },
    clearTimeout: (i) => { if (timers[i - 1]) timers[i - 1].live = false; },
    /* every timer set so far, and the ones they set, as if the time went by */
    pass() { for (let k = 0; k < 6; k++) timers.slice().forEach((t) => { if (t.live) { t.live = false; t.fn(); } }); }
  };
}
function toasts(o = {}) {
  const d = dom(), calls = [];
  const script = `
    const FEEL = true;
    const view = { phone: !!__o.phone };
    const $ = (id) => (id === 'toasts' ? __d.box : null);
    const feelMoves = () => false, phoneDay = () => false, phoneToasts = () => {};
    const el = (tag, cls, text) => __d.node(tag, cls, text);
    const button = (text, cls, fn) => { const b = __d.node('button', cls, text); b.fn = fn; return b; };
    const icon = (name) => __d.node('canvas', 'mark-' + name);
    const Snd = { pick() {} }, lastPtr = 'touch', IN_EASE = '', OUT_EASE = '';
    const window = { matchMedia: () => ({ matches: true }) };
    const undo = () => __calls.push('undo'), undoAct = (w, t) => ({ label: 'Undo', fn: undo }), undoWords = (t) => t, noteSaid = () => {};
    const setTimeout = __d.setTimeout, clearTimeout = __d.clearTimeout;
    ${app('  /* o (V11, lift and place): receipt, a drop saying', '  function toast(text, kind, act, o) {')}
    ({ toastFeel, errorDone });`;
  return Object.assign(runInNewContext(script, { __o: o, __d: d, __calls: calls }), { d, calls, shown: () => d.box.kids.filter((x) => !x._gone) });
}
const said = (t) => (t.querySelector('.toast-words') || t).textContent;

test('an error stays until its x puts it away; every other toast still fades', () => {
  const w = toasts();
  let tried = 0;
  w.toastFeel('Walk added', 'good');
  w.toastFeel('Your last change didn’t save on this device. Try again, or download a backup.', 'error', { label: 'Try again', fn: () => { tried++; } }, { key: 'save', also: { label: 'Your data', fn: () => {} } });
  assert.equal(w.shown().length, 2);
  w.d.pass();
  assert.deepEqual(w.shown().map(said), ['Your last change didn’t save on this device. Try again, or download a backup.'], 'the success faded; the error stayed');
  const e = w.shown()[0];
  assert.equal(e.attrs.role, 'alert', 'said at once');
  assert.ok(e.className.split(' ').includes('error'));
  const acts = e.querySelector('.toast-acts');
  assert.deepEqual(acts.kids.map((b) => b.text), ['Your data', 'Try again']);
  const x = e.querySelector('.toast-x');
  assert.equal(x.attrs['aria-label'], 'Dismiss');
  acts.kids[1].click();
  assert.equal(tried, 1, 'Try again does it again');
  w.d.pass();
  assert.equal(w.shown().length, 0, 'and the error goes with it, to come back if it fails again');
  w.toastFeel('That backup is damaged, so your board stays as it is.', 'error', null, { key: 'import' });
  w.shown()[0].querySelector('.toast-x').click();
  w.d.pass();
  assert.equal(w.shown().length, 0, 'the x puts it away');
});

test('an error leaves when its trouble clears, a newer one with the same key takes its place, and on a phone a new toast never pushes it off', () => {
  const w = toasts({ phone: true });
  w.toastFeel('Soccer schedule didn’t refresh. That link isn’t public.', 'error', { label: 'Try again', fn: () => {} }, { key: 'cal-1' });
  w.toastFeel('Walk added', 'good');
  w.d.pass();
  assert.deepEqual(w.shown().map(said), ['Soccer schedule didn’t refresh. That link isn’t public.'], 'one toast at a time on a phone, but never at an error’s cost');
  w.toastFeel('Soccer schedule didn’t refresh. You’re offline.', 'error', { label: 'Try again', fn: () => {} }, { key: 'cal-1' });
  w.d.pass();
  assert.deepEqual(w.shown().map(said), ['Soccer schedule didn’t refresh. You’re offline.'], 'the same trouble, said once, as it is now');
  w.errorDone('cal-2');
  assert.equal(w.shown().length, 1, 'another key leaves it be');
  w.errorDone('cal-1');
  w.d.pass();
  assert.equal(w.shown().length, 0, 'the calendar came back, so the error goes by itself');
});

test('with more than three toasts, the oldest that isn’t an error goes first', () => {
  const w = toasts();
  w.toastFeel('Your last change didn’t save on this device.', 'error', null, { key: 'save' });
  ['One', 'Two', 'Three'].forEach((t) => w.toastFeel(t + ' added', '', { label: 'Undo', fn: () => {}, live: () => true }));
  const left = w.shown().map(said);
  assert.ok(left.includes('Your last change didn’t save on this device.'), 'the error stays');
  assert.ok(!left.includes('One added.'), 'the oldest plain toast went');
});

/* == 3. the phone's Undo that stays == */
function head(info) {
  const calls = [];
  const script = `
    const FEEL = true;
    const undoInfo = () => __info, undoLast = () => __calls.push('undo'), redoLast = () => __calls.push('redo');
    const Snd = { init() {} }, UI = { soft: '#E4DFD6' };
    const node = (tag, cls, text) => { const n = { tag, cls: cls || '', text: text || '', kids: [], attrs: {}, append(...k) { k.forEach((x) => n.kids.push(x)); }, appendChild(k) { n.kids.push(k); return k; }, setAttribute(k, v) { n.attrs[k] = v; }, dataset: {} }; return n; };
    const el = node, icon = (name) => node('canvas', 'mark-' + name);
    const button = (text, cls, fn) => { const b = node('button', cls, text); b.click = fn; return b; };
    ${app('  /* V11-2: Undo on the phone that stays. A toast', '  /* The gold, ranked (docs/PHONE-REDESIGN.md, 8.1)')}
    ({ phoneUndo });`;
  const w = runInNewContext(script, { __info: info, __calls: calls });
  const keyed = [];
  const row = w.phoneUndo((b, k) => { b.dataset.fk = 'td-' + k; keyed.push(k); return b; }, 'head');
  return { row, calls, keyed };
}
const text = (n) => (n ? n.text + n.kids.map(text).join('') : '');

test('the head card keeps the last change’s Undo, naming what it takes back, and Redo once something was undone', () => {
  assert.equal(head({ undo: false, redo: false, undoSaid: '', redoSaid: '' }).row, null, 'nothing to take back: nothing shows');
  const a = head({ undo: true, redo: false, undoSaid: 'Walk is on Thursday at 5:15 pm.', redoSaid: '' });
  assert.equal(a.row.kids.length, 1);
  assert.equal(text(a.row.kids[0]), 'UndoWalk is on Thursday at 5:15 pm');
  assert.equal(a.row.kids[0].attrs['aria-label'], 'Undo: Walk is on Thursday at 5:15 pm');
  a.row.kids[0].click();
  assert.deepEqual(plain(a.calls), ['undo'], 'the same undo as the desk’s bar and the keys');
  assert.deepEqual(plain(a.keyed), ['head-undo'], 'focus comes back to it after a redraw');
  const b = head({ undo: true, redo: true, undoSaid: '', redoSaid: 'Walk is on Thursday at 5:15 pm.' });
  assert.deepEqual(plain(b.row.kids.map((k) => k.attrs['aria-label'])), ['Undo the last change', 'Redo: Walk is on Thursday at 5:15 pm']);
  b.row.kids[1].click();
  assert.deepEqual(plain(b.calls), ['redo']);
  const c = head({ undo: false, redo: true, undoSaid: '', redoSaid: '' });
  assert.deepEqual(plain(c.row.kids.map((k) => k.attrs['aria-label'])), ['Redo'], 'everything undone: Redo alone');
});
