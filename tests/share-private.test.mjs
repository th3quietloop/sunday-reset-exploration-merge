// V11-2 (Oct 20): sharing is private by default. A week that goes out as words, a picture, paper, or a calendar
// file shows its blocks (routines, dinners, events, what was placed), never a to-do or one of its steps unless
// Include to-dos is on for this device (view.shareTodos, kept in the view key, never on the board), and never
// anything marked private. The reset's finish sends its plan the same way, and Tell Russell's report never holds
// what's on the board. The words that say so lead with "Stays on this device." (docs/CONTRAST.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../board/src/model.js');
await import('../board/src/data.js');
await import('../board/src/diagnostics.js');
const M = globalThis.Model, D = globalThis.Data, Diagnostics = globalThis.Diagnostics;
const APP = readFileSync(new URL('../board/src/app.js', import.meta.url), 'utf8');
const VARIANT = readFileSync(new URL('../variants/corners11/variant.js', import.meta.url), 'utf8');

/* the app's own share code, cut out whole by its markers and run on a made up board */
const between = (a, b) => { const i = APP.indexOf(a), j = APP.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, 'lost the marker: ' + a); return APP.slice(i, j); };
const SRC = between('  /* == V11-2 (Oct 20): sharing is private by default ==', '  /* V11 (the rituals walk): a moment the way the app says it')
  + between('  function icsWeek() {', '  /* The week on paper');
function shareOf(state, view, ws) {
  const make = new Function('M', 'state', 'view', 'cookName', 'homeTz', 'weekOf', 'saveView', 'toggle', 'el',
    SRC + '\nreturn { SHARE_LINE, sharedBlock, sharedMarker, weekText, icsWeek, setShareTodos };');
  return make(M, state, view, (id) => (id === 'me' ? 'You cook' : 'Sam cooks'), () => 'America/Los_Angeles', () => M.range(ws, 7), () => {}, () => null, () => null);
}

/* the sample family's week, with a to-do on it, a step, an event and a marker, and one of each marked private */
const WS = '2026-10-18';
function board() {
  const s = D.sampleState(WS), at = (n) => M.addDays(WS, n);
  const add = (n, a) => { const d = at(n); s.dates[d] = s.dates[d] || {}; (s.dates[d].adds = s.dates[d].adds || []).push(a); };
  add(1, { id: 'cx-task', name: 'Book a cleaning for Robin', cat: 'family', icon: 'handset', start: 1140, dur: 15, src: { type: 'task', id: 'dentist-call' } });
  add(2, { id: 'cx-private', name: 'Job interview', cat: 'yours', icon: 'star', start: 960, dur: 60, src: { type: 'block', id: 'interview' }, private: true });
  s.events.push(
    { id: 'cx-ev', kind: 'timed', name: 'Parent night', cat: 'family', icon: 'star', date: at(4), start: 1110, dur: 45 },
    { id: 'cx-ev-private', kind: 'timed', name: 'Therapy', cat: 'yours', icon: 'star', date: at(3), start: 1020, dur: 45, private: true },
    { id: 'cx-mark', kind: 'marker', name: 'Grandma visits', icon: 'star', date: at(5) },
    { id: 'cx-mark-private', kind: 'marker', name: 'Our secret anniversary', icon: 'heart', date: at(6), private: true });
  return s;
}
const TODOS = ['Pull the numbers', 'Book a cleaning for Robin'];
const PRIVATE = ['Job interview', 'Therapy', 'Our secret anniversary'];
const SHOWN = ['Run', 'Date night at home', 'Tacos', 'Parent night', 'Grandma visits'];
/* every name the week's own days hold, so a name left out is left out by the filter, not by the board */
const onBoard = (s) => M.range(WS, 7).flatMap((d) => { const c = M.calendarDay(s, d); return c.blocks.map((b) => b.label || b.name).concat(c.markers.map((m) => m.name)); });

test('the made up week holds every to-do, private thing, and block the checks look for', () => {
  const s = board(), names = onBoard(s).join('|') + '|' + Object.values(s.dinners).map((x) => x.name).join('|');
  for (const n of TODOS.concat(PRIVATE, SHOWN)) assert.ok(names.includes(n), n + ' is on the board this week');
});

test('the week as words is private by default: blocks, dinners, events, and markers, no to-dos, nothing private', () => {
  const s = board(), view = { shareTodos: false }, x = shareOf(s, view, WS), text = x.weekText(WS);
  for (const n of SHOWN) assert.ok(text.includes(n), 'the words keep ' + n);
  for (const n of TODOS) assert.ok(!text.includes(n), 'the words leave out the to-do ' + n);
  for (const n of PRIVATE) assert.ok(!text.includes(n), 'the words leave out ' + n + ', marked private');
});

test('Include to-dos, on for this device, puts the to-dos and their steps back, and still nothing private', () => {
  const s = board(), view = { shareTodos: true }, x = shareOf(s, view, WS), text = x.weekText(WS);
  for (const n of TODOS) assert.ok(text.includes(n), 'with to-dos on, the words have ' + n);
  for (const n of PRIVATE) assert.ok(!text.includes(n), 'with to-dos on, ' + n + ' still stays out');
});

test('the calendar file is private by default the same way, and the switch changes it the same way', () => {
  const s = board(), view = { shareTodos: false }, x = shareOf(s, view, WS);
  const off = x.icsWeek(), summaries = (ics) => ics.split('\r\n').filter((l) => l.startsWith('SUMMARY:')).join('\n');
  for (const n of ['Run', 'Parent night']) assert.ok(summaries(off).includes(n), 'the file keeps ' + n);
  for (const n of TODOS.concat(PRIVATE)) assert.ok(!off.includes(n), 'the file leaves out ' + n);
  x.setShareTodos(true);
  const on = x.icsWeek();
  for (const n of TODOS) assert.ok(summaries(on).includes(n), 'with to-dos on, the file has ' + n);
  for (const n of PRIVATE) assert.ok(!on.includes(n), 'with to-dos on, the file still leaves out ' + n);
});

test('one filter for every share: the picture and paper read it too, and the switch is kept per device, never on the board', () => {
  /* the week as a picture and on paper take the same filter as the words and the file */
  const pic = APP.slice(APP.indexOf('async function weekPicture(ws)'), APP.indexOf('const yk = top + rowH * 7 + 30'));
  assert.match(pic, /\.blocks\.filter\(\(b\) => sharedBlock\(b, d\)\)/, 'the week as a picture draws only what may be shared');
  const paper = APP.slice(APP.indexOf('function printWeek()'), APP.indexOf('setTimeout(() => window.print(), 50)'));
  assert.match(paper, /markers\.filter\(sharedMarker\)/, 'paper leaves out a private marker');
  assert.match(paper, /sharedBlock\(b, d\)/, 'paper prints only what may be shared');
  /* the switch: off by default, saved and read with the view, and never a field of the board */
  assert.match(APP, /setPage: null, shareTodos: false \}/, 'Include to-dos starts off');
  assert.match(APP, /bar: view\.bar, shareTodos: view\.shareTodos \}/, 'it is saved in the view key');
  assert.match(APP, /'steady', 'shareTodos'\]\.forEach/, 'it is read back from the view key');
  assert.ok(!/state\.settings\.shareTodos|settings: \{[^}]*shareTodos/.test(APP), 'it never goes on the board');
  assert.ok(!JSON.stringify(D.sampleState(WS)).includes('shareTodos'), 'a board has no such field');
});

test('the reset finish sends its plan without the to-dos unless they are added, and says so', () => {
  assert.match(VARIANT, /const shareData = \(ws\) => \{ const f = finishData\(ws\); return SR\.shareTodos && SR\.shareTodos\(\) \? f : Object\.assign\(\{\}, f, \{ timed: \[\] \}\); \};/, 'the shared plan drops its to-dos by default');
  assert.match(VARIANT, /function planPicture\(ws\) \{\n\s+const f = shareData\(ws\)/, 'the picture of the plan is the shared one');
  assert.equal((VARIANT.match(/planText\(shareData\(ws\)/g) || []).length, 2, 'both ways the plan goes out as words use the shared plan');
  assert.ok(!/planText\(finishData\(ws\)/.test(VARIANT), 'no share reads the plan with its to-dos');
  assert.match(VARIANT, /'Include to-dos'/, 'the finish has the switch');
  assert.match(VARIANT, /SR\.shareLine/, 'and the line that says what goes out');
});

test('the words say what the code does, lead with Stays on this device, and name nobody', () => {
  const s = board(), x = shareOf(s, { shareTodos: false }, WS);
  assert.equal(x.SHARE_LINE, 'When you share your week, it shows your blocks and plans. Never your to-dos, unless you add them.');
  const scope = APP.slice(APP.indexOf('const scopeLine = (p) =>'), APP.indexOf("p.scope === 'nothing'"));
  assert.match(scope, /'calendars' \|\| p\.id === 'reset' \? 'Stays on this device\. ' \+ SHARE_LINE/, 'Calendars and the Sunday Reset say what sharing sends');
  assert.match(scope, /p\.scope === 'data' \? 'Stays on this device\./, 'Your data leads with it');
  assert.ok(!/anyone you share the week with/.test(APP), 'the old line, which said the settings go to anyone the week is shared with, is gone');
  assert.ok(!/Kim/.test(x.SHARE_LINE + scope), 'no name in the words');
  /* the share sheet in Settings: the switch and its line, before the ways the week goes out */
  const take = APP.slice(APP.indexOf("const take = dsec(box, 'Take the week with you'"), APP.indexOf("button('Send this week'"));
  assert.match(take, /shareChoice\(take/, 'Your data has the switch and the line');
});

test('Tell Russell: the report holds counts and kinds, never what is on the board', () => {
  const r = Diagnostics.report({ version: 7, where: 'phone today, week', board: { tasks: 7, dates: 4, events: 5, calendars: 0, rescues: 0 }, errors: [{ at: new Date().toISOString(), kind: 'save', code: 'Book a cleaning for Robin' }] });
  const out = JSON.stringify(r);
  for (const n of TODOS.concat(PRIVATE, SHOWN)) assert.ok(!out.includes(n), 'the report never holds ' + n);
});
