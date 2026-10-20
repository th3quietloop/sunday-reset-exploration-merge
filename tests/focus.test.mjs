// V11-2 (Russell's list, Oct 20): Focus, pick what, then how long (board/src/focus.js). The lengths it offers end
// before the next locked block, sleep, or a time with people, and the last one names it ("Until Pick up Robin at
// 4:45 pm"). Time running out never marks anything done; only Mark it done does, and that checks off the to-do's
// steps too. The parts are cut out of focus.js by the lines that start them and run in a small world: the real
// Model and Data, the sample family's board, and an SR that keeps notes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { M, D, plain } from './v11-rig.mjs';

const SRC = readFileSync(new URL('../board/src/focus.js', import.meta.url), 'utf8');
const cut = (from, to) => {
  const a = SRC.indexOf(from);
  assert.ok(a >= 0, 'focus.js: lost the marker ' + JSON.stringify(from.trim()));
  const b = SRC.indexOf(to, a + from.length);
  assert.ok(b > a, 'focus.js: lost the end marker ' + JSON.stringify(to.trim()));
  return SRC.slice(a, b);
};
const SUN = '2026-10-18', WED = '2026-10-21';

function world(extra) {
  const notes = { commits: 0, toasts: [] };
  const script = `
    const lenWords = (min) => (min < 60 ? min + ' min' : Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : ''));
    ${cut("  /* V11-2 (Russell's list, Oct 20): what a session has to stop before", '  function brickFor(o, cls) {')}
    ({ wall, lengths });`;
  const SR = Object.assign({ M, blockName: (b) => b.label || b.name }, extra || {});
  return { notes, f: runInNewContext(script, { SR }) };
}

test('Focus offers only lengths that end before the next locked block, and names it last', () => {
  const st = D.sampleState(SUN), blocks = M.calendarDay(st, WED).blocks;
  const { f } = world();
  /* Wednesday at 3 pm: Pick up Robin, locked, at 4:45 */
  const w = f.wall(900, blocks);
  assert.equal(w.name, 'Pick up Robin');
  assert.equal(w.at, 1005);
  const lens = plain(f.lengths({ kind: 'task', name: 'Send the quarterly report', dur: 130 }, 900, null, w));
  assert.deepEqual(lens.map((l) => l.min), [25, 50, 105]);
  assert.equal(lens[2].label, 'Until Pick up Robin at 4:45 pm');
  assert.equal(lens[2].sub, '1 h 45 min from now');
  assert.ok(lens.every((l) => l.min <= w.min), 'nothing runs into it');
  /* 4:30 pm: only the quarter hour before it */
  const close = plain(f.lengths({ kind: 'own', name: 'Read' }, 990, null, f.wall(990, blocks)));
  assert.deepEqual(close.map((l) => [l.min, l.label]), [[15, 'Until Pick up Robin at 4:45 pm']]);
  /* a block that ends before it keeps its own way to end, Until Work ends */
  const work = { kind: 'block', name: 'Work', until: 960 };
  assert.ok(f.lengths(work, 900, null, w).some((l) => l.label === 'Until Work ends' && l.min === 60));
  /* Work cut short by the pick up ends because of it: the pick up names the time, once */
  const cut = plain(f.lengths({ kind: 'task', name: 'Send the quarterly report', dur: 130 }, 900, { kind: 'block', name: 'Work', until: 1005 }, w));
  assert.deepEqual(cut.map((l) => l.label), ['25 min', '50 min', 'Until Pick up Robin at 4:45 pm']);
});

test('a time with people and bed stop it too; with nothing ahead every length is offered', () => {
  const { f } = world();
  const blocks = [{ name: 'Walk', cat: 'yours', start: 1100, dur: 30 }, { name: 'Evening with Sam', cat: 'us', start: 1125, dur: 180 }, { name: 'Sleep', cat: 'sleep', sleep: 'pm', start: 1380, dur: 60 }];
  assert.equal(f.wall(1080, blocks).name, 'Evening with Sam', 'a soft block of yours doesn\'t stop it; time with Sam does');
  assert.equal(f.wall(1320, blocks).name, 'bed');
  assert.equal(plain(f.lengths({ kind: 'own', name: 'Write' }, 1320, null, f.wall(1320, blocks))).pop().label, 'Until bed at 11 pm');
  assert.equal(f.wall(1385, blocks), null);
  assert.deepEqual(plain(f.lengths({ kind: 'own', name: 'Write' }, 600, null, null)).map((l) => l.min), [25, 50]);
});

test('time running out never marks a to-do done; Mark it done does, steps and all, with Undo', () => {
  const st = D.sampleState(SUN);
  const t = st.tasks.find((x) => !x.done && x.steps && x.steps.length >= 2);
  assert.ok(t, 'a to-do with steps on the sample');
  const notes = { toasts: [] };
  const script = `
    let focus = __focus;
    const lenWords = (min) => (min < 60 ? min + ' min' : Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : ''));
    const used = (f) => f.used + (f.runningSince ? Date.now() - f.runningSince : 0);
    const saveFocus = () => {}, drawFocus = () => {}, changed = () => {};
    ${cut('  function finish(mark) {', '  function endBreak() {')}
    ({ finish, get focus() { return focus; } });`;
  const markDone = (task, stepId, done) => { task.steps.forEach((s) => { s.done = true; }); task.done = done; };
  const SR = { taskById: (id) => st.tasks.find((x) => x.id === id), commit: (fn) => fn(), markDone, toast: (text, kind, act) => notes.toasts.push({ text, act: act && act.label }), undo: () => {}, Snd: {} };
  const session = () => ({ name: t.name, task: t.id, total: 25, used: 25 * 60000, runningSince: null, chimed: true });
  /* the session ends at its time and is stopped there: nothing on the list changes */
  const a = runInNewContext(script, { __focus: session(), SR, Date });
  a.finish(false);
  assert.equal(t.done, false);
  assert.ok(t.steps.every((s) => !s.done), 'no step checked off');
  assert.equal(a.focus.marked, false);
  assert.equal(a.focus.said, '25 min on ' + t.name);
  assert.equal(notes.toasts.length, 0);
  /* Mark it done: the to-do and its steps, one change, a toast with Undo */
  const b = runInNewContext(script, { __focus: session(), SR, Date });
  b.finish(true);
  assert.equal(t.done, true);
  assert.ok(t.steps.every((s) => s.done), 'every step checked off');
  assert.equal(b.focus.marked, true);
  assert.deepEqual(notes.toasts, [{ text: t.name + ' is done.', act: 'Undo' }]);
});

test('the session\'s buttons: a to-do\'s gold one is Mark it done; time\'s up asks, and Stop here marks nothing', () => {
  const part = cut('  function drawSession(card) {', '  const btn = (label, cls, fn) =>');
  assert.match(part, /btn\('Mark it done', 'fr-go', \(\) => finish\(true\)\)/);
  assert.match(part, /btn\('Stop here', 'fr-ghost', \(\) => finish\(false\)\)/);
  assert.match(part, /'Time’s up\. Is it done\?'/);
  /* a block or your own thing has nothing to mark: Done ends it */
  assert.match(part, /btn\('Done', 'fr-go', \(\) => finish\(false\)\)/);
  assert.match(part, /if \(!f\.brk && !up\)/, 'once the time is up, Stop here stands in for Stop without finishing');
  /* the clock running out only stops the session (tick) */
  const tick = cut('  function tick() {', '  setInterval(tick, 1000);');
  assert.doesNotMatch(tick, /finish\(|markDone/);
  for (const w of [SRC]) assert.doesNotMatch(w, /—|–/, 'no dashes');
});

/* == V11-2 (Russell's pick, Oct 20): the Focus page comes back as a panel over the desk == */
/* focus.js whole, in a small world: a page with no room drawn, storage, a clock that doesn't run on its own, and the
   app's side panel standing in as notes */
function focusWorld() {
  const notes = [], store = {};
  const ctx = {
    window: {}, document: { getElementById: () => null, addEventListener: () => {}, title: '' },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    setInterval: () => 0, Date
  };
  ctx.SR = { M, Snd: { init() {}, clack() {}, good() {} }, nowNow: () => ({ kind: 'open' }), dueList: () => ({ list: [] }), state: { tasks: [] }, today: SUN, nowMin: 900, blockName: (b) => b.name };
  ctx.window.SR = ctx.SR;
  runInNewContext(SRC + '\n;window.SRFocus', ctx);
  const F = ctx.window.SRFocus;
  let open = false;
  F.usePanel({ open: () => { open = true; notes.push('open'); }, close: () => { open = false; notes.push('close'); }, isOpen: () => open, draw: () => notes.push('draw'), tick: () => notes.push('tick'), changed: () => notes.push('changed') });
  return { F, notes, store };
}
test('with a side panel, Focus opens there, not in a room of its own, and the session stays in focus.js', () => {
  const { F, notes, store } = focusWorld();
  F.open();
  assert.deepEqual(notes, ['open', 'changed'], 'the panel opens; the room is never touched (no element to find)');
  assert.equal(F.isOpen, true);
  F.start({ kind: 'own', name: 'Reading', cat: 'yours', icon: 'star' }, 25);
  assert.ok(notes.includes('draw'), 'starting draws the panel again');
  assert.equal(F.session.name, 'Reading');
  assert.equal(F.session.total, 25);
  assert.ok(store['sundayreset.focus'], 'kept on this device, as before');
  assert.equal(F.running, true);
  const L = F.left();
  assert.ok(L.ms > 24 * 60000 && !L.up);
  /* paused, it keeps what's left */
  F.toggle();
  assert.equal(F.session.runningSince, null);
  F.clear();
  assert.equal(F.session, null, 'stopped without finishing: nothing kept');
  assert.equal(store['sundayreset.focus'], undefined);
  F.close();
  assert.equal(notes[notes.length - 2], 'close');
  assert.equal(F.isOpen, false);
});
test('the panel\'s Focus: one thing at a time, how long with Start the one gold, the bar in a pale frame', () => {
  const app = readFileSync(new URL('../board/src/app.js', import.meta.url), 'utf8');
  const a = app.indexOf('  /* == V11-2: Focus, one thing at a time'), part = app.slice(a, app.indexOf('  /* == V11-2: the countdown', a));
  assert.ok(a > 0, 'app.js: lost the Focus section');
  assert.match(part, /title\(p, 'One thing at a time\.'\)/);
  assert.match(part, /'The block you’re in'/);
  assert.match(part, /due\.length < 3/, 'up to three to-dos due soon');
  assert.match(part, /'Find another to-do'/);
  assert.match(part, /'Or name an activity'/);
  assert.match(part, /'It won’t add a to-do or change your week\.'/);
  assert.match(part, /gold: \['Start', /, 'Start is the one gold of how long');
  assert.match(part, /'c-fc-bar'/);
  assert.match(part, /'Time’s up\. Is it done\?'/);
  assert.match(part, /\? 'Pause' : 'Resume'/);
  /* the same panel on a phone: it's #side, the sheet there */
  assert.match(app, /if \(FEEL && sel\.type === 'focus'\) return focusPanel\(p\);/);
  const css = readFileSync(new URL('../variants/corners11/css/focus.css', import.meta.url), 'utf8');
  assert.match(css, /\.c-fc-bar \{[^}]*background: #F2EEE6;/, 'a pale frame');
  assert.match(css, /\.c-fc-seg::after \{[^}]*transform: scaleX\(var\(--f, 0\)\);/, 'each segment wears its color as the time goes');
  assert.doesNotMatch(css.match(/\.c-fc-seg::after \{[^}]*\}/)[0], /transition/, 'the wear has no transition, so calmer motion has nothing to finish');
  assert.match(css, /body\.calm \.c-fc-pick > \.c-fc-brick, body\.calm \.c-fc-len \{ transition: none; \}/);
  assert.match(css, /\.c-fc-len\[aria-checked="true"\] \{ background: #FFFFFF;/, 'white fill means picked');
  assert.match(css, /\.c-fc-pick:focus-visible \{ outline: 2\.5px solid #FFFFFF; outline-offset: 2px; \}/, 'a pick shows its focus on itself');
  for (const w of [part, css]) assert.doesNotMatch(w, /—|–/, 'no dashes');
});
test('Focus on one thing is quiet on the band and the Now card, never beside the gold Start, and the steps keep the gold', () => {
  const app = readFileSync(new URL('../board/src/app.js', import.meta.url), 'utf8');
  const band = app.match(/    const fcBand = [^\n]*\n/);
  assert.ok(band, 'app.js: lost fcBand');
  assert.match(band[0], /info\.kind !== 'sleep' && !eve && !leave && !\(focusOk && \(isTodo \|\| session\) && nowMin - b\.start < 10\)/);
  /* (one Focus at a time: where it shows, the quiet Pomodoro steps aside) */
  assert.match(app, /if \(!fresh && focusOk && !fcBand\) pushAct\(focusBtn\(\)\);/);
  assert.match(app, /const x = bandBtn\(focusWord\(\), 'star', \(\) => \{ Snd\.pick\(\); window\.SRFocus\.open\(\); \}\);/, 'a band button is quiet');
  assert.match(app, /const fc = FEEL && window\.SRFocus && info\.kind !== 'sleep' && !evening\(\) && !gold\.now\.some\(\(x\) => x\[2\] === 'now-start'\)/);
  /* the gold ranking is the steps' own: Focus never touches goldNow or phoneGold */
  const goldNow = app.slice(app.indexOf('  function goldNow(info) {'), app.indexOf('  function panelGold() {'));
  const phoneGold = app.slice(app.indexOf('  function phoneGold(info, qs) {'), app.indexOf('  function phoneNow(key, info, gold) {'));
  for (const g of [goldNow, phoneGold]) assert.doesNotMatch(g, /SRFocus|focusWord|fcBand/);
  /* the words that bring you back to a session */
  const fw = app.slice(app.indexOf('  function focusWord() {'), app.indexOf('  function openFocusPanel() {'));
  const word = (session, left) => runInNewContext(fw + '; focusWord()', { window: { SRFocus: { session, left: () => left } } });
  assert.equal(word(null), 'Focus on one thing');
  assert.equal(word({ runningSince: 1 }, { up: false }), 'Back to Focus');
  assert.equal(word({ runningSince: null }, { up: false }), 'Focus, paused');
  assert.equal(word({ runningSince: null }, { up: true }), 'Focus, time’s up');
  assert.equal(word({ done: true }, { up: true }), 'Focus on one thing');
});
