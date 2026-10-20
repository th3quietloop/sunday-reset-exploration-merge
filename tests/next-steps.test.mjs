/* V11-2 (Oct 20, approved by Russell): every dead end gets a next step, and progress as counts, never streaks.
   A to-do whose day went by is said calmly (Was due Oct 15, in a group named for when it's from, From last week) and
   given a new day (the day it lands on becomes its own, in the same change, so one Undo takes both back). The reset's
   To-dos step with nothing to place offers the to-dos with no day yet. The phone's Today has the Sunday Reset on its
   day (Sunday Reset · About 17 min, Start; after a pause, 2 of 5 done, Continue; Set up this week on Monday and
   Tuesday), gold only when the phone's ranking gives the reset the gold. Look back counts this month and last from the
   board, and the first reset's recap says one specific thing it did. Cut out of app.js and run with the real Model and
   Data on made up boards. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { M, D, app, plain } from './v11-rig.mjs';

const PARTS = [
  app('  const groupName = (id) =>'),
  app('  const plural = (n, one, many) =>'),
  app('  const inboxId = () =>'),
  app('  const joinNames = (list) =>'),
  app('  /* == the Sunday Reset == */', '  function resetButton() {'),
  app('  function resetSnap(ws) {', '  /* V11: the first look is kept on this device'),
  app('  /* V11-2 (progress as counts, never streaks): the first reset\'s recap', '  /* V11: a phone that stepped aside for the reset'),
  app('  const afterDue = (src, date, start, dur) => {', '  /* V11: what a placement takes from a soft block'),
  app('  /* a day said the way a person says it: today, tomorrow, Thursday', '  /* V11: a box saved as focus leaves it saves once focus has landed'),
  app('  /* == V11-2: a day that went by, said calmly', '  /* V11: a to-do\'s sheet (docs/PHONE-REDESIGN.md, section 6)'),
  app('  /* V11-2 (progress as counts, never streaks): a month on the board', '  /* V11 (the rituals walk): the newest keep and change said'),
  app('  /* V11-2: a board nobody has set up yet', '  /* V11-2 (every dead end gets a next step): the Sunday Reset on the phone'),
  app('  /* V11-2 (every dead end gets a next step): the Sunday Reset on the phone', '  /* V11-2: the phone\'s Undo that stays, drawn again once'),
  app('  function next7Panel(p) {', '  /* Due in the next 7 days (8.6)'),
  app('  /* Due in the next 7 days (8.6)', '  /* the notes at the end of the day')
];

/* o: { steps (how many steps a run has, the finish included), mins (the variant's minutes), parked, dinners (off) } */
function rig(board, today, nowMin, o = {}) {
  const script = `
    const FEEL = true;
    let state = __board, today = __today, nowMin = __now, moves = null, parked = __o.parked || null;
    const view = { got: {}, reset: null, preview: null };
    const window = { SR_resetMinutes: __o.mins == null ? undefined : () => __o.mins, SR: { openSetup: () => opened.push({ setup: true }) } };
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    const who = () => state.profile || {};
    const partner = () => (state.profile && state.profile.partner) || '';
    const useDinners = () => !__o.dinners;
    const cat = (k) => D.CATS[k] || { name: k };
    const day = (d) => M.calendarDay(state, d);
    const dinnerOver = () => false;
    const stepsFor = () => Array.from({ length: __o.steps || 6 }, (_, i) => ({ key: 's' + i }));
    const Snd = { init() {}, pick() {}, slide() {} };
    const opened = [], started = [], undoStack = [];
    const openSel = (s) => opened.push(s), goStep = (i) => opened.push({ step: i }), startReset = (ws, c) => started.push([ws, !!c]);
    const el = (tag, cls, text) => { const e = { tag, cls: cls || '', text: text || '', kids: [], attrs: {}, dataset: {}, append(...xs) { xs.forEach((x) => e.kids.push(x)); }, appendChild(x) { e.kids.push(x); return x; }, setAttribute(k, v) { e.attrs[k] = v; } }; return e; };
    const button = (text, cls, fn) => { const b = el('button', cls, text); b.click = fn; return b; };
    const icon = () => el('canvas');
    const taskTile = (t) => el('div', 'tile', t.name);
    /* (what the due sheet and the next 7 days lean on: the sheet's title, the list's day, and no Add line here) */
    const glTitle = (p, text) => { const h = el('h2', 'title', text); p.appendChild(h); return h; };
    const keepUnit = (x) => String(x), NEXT7 = 6;
    const setDone = () => {}, renderSide = () => {}, renderToday = () => {}, closeSel = () => opened.push({ close: true });
    const $ = () => null, document = { querySelector: () => null }, openQuick = (w) => opened.push({ quick: w });
    const sourceDate = (b, date) => b.sourceDate || date, blockName = (b) => b.label || b.name, cookName = (c) => c || '', UI = { soft: '#AFAFAF' };
    /* the app's commit, in its order: the change, then a to-do from an earlier day takes the day it was given */
    function commit(fn) {
      const snap = JSON.stringify(state);
      const r = fn();
      if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; }
      newDayOf(r);
      undoStack.push(snap);
      return r;
    }
    function undo() { const s = undoStack.pop(); if (s) state = JSON.parse(s); }
    ${PARTS.join('\n')}
    ({
      get state() { return state; }, view, opened, started,
      commit, undo, wasDue, fromWhen, fromGroups, wasSet, afterDue, noDayTodos, noDayWords, giveNewDay,
      monthCounts, monthWords, firstDid, resetSnap, resetLineState, resetLine, dueSoonPanel, next7Panel, el
    });`;
  return runInNewContext(script, { __board: board, __today: today, __now: nowMin, __o: o, M, D });
}
const words = (n) => (n == null ? '' : typeof n === 'string' ? n : (n.text || '') + (n.kids || []).map(words).join(''));
const board = (today) => { const s = D.sampleState(today); s.profile = Object.assign({}, s.profile, { sample: false, demo: false }); s.tasks = []; return s; };
const todo = (id, extra) => Object.assign({ id, name: id, group: 'inbox', icon: 'check', cat: 'home', dur: 30, due: null, repeat: null, done: false, steps: [] }, extra || {});
const WED = '2026-10-21', SUN = '2026-10-18';

test('a day that went by is said plainly, and grouped by when it is from', () => {
  const r = rig(board(WED), WED, 600);
  assert.equal(r.wasDue('2026-10-20'), 'Was due yesterday');
  assert.equal(r.wasDue('2026-10-19'), 'Was due Monday', 'this week by its name');
  assert.equal(r.wasDue('2026-10-15'), 'Was due Oct 15', 'before this week by its date');
  assert.equal(r.fromWhen('2026-10-19').name, 'From earlier this week');
  assert.equal(r.fromWhen('2026-10-17').name, 'From last week');
  assert.equal(r.fromWhen('2026-10-11').name, 'From last week');
  assert.equal(r.fromWhen('2026-10-10').name, 'From earlier');
  const g = plain(r.fromGroups(['2026-10-02', '2026-10-15', '2026-10-19', '2026-10-16'], (d) => d));
  assert.deepEqual(g.map((x) => [x.name, x.rows]), [['From earlier this week', ['2026-10-19']], ['From last week', ['2026-10-15', '2026-10-16']], ['From earlier', ['2026-10-02']]]);
  /* weeks that start on Monday: Sunday the 18th was last week */
  M.setWeekStart(1);
  try { assert.equal(rig(board(WED), WED, 600).fromWhen('2026-10-18').name, 'From last week'); } finally { M.setWeekStart(0); }
  /* none of it scolds */
  ['2026-10-20', '2026-10-19', '2026-10-15', '2026-09-01'].forEach((d) => assert.doesNotMatch(r.wasDue(d) + ' ' + r.fromWhen(d).name, /late|overdue|ago|passed|missed/i));
});

test('a time that went by says when it was, plainly', () => {
  const st = board(WED);
  st.tasks = [todo('call', { due: '2026-10-23' })];
  st.dates['2026-10-20'] = { adds: [{ id: 'a1', name: 'call', cat: 'home', icon: 'check', start: 540, dur: 30, src: { type: 'task', id: 'call' } }] };
  const r = rig(st, WED, 600);
  assert.equal(r.wasSet(r.state.tasks[0]).replace(/ /g, ' '), 'Was set for yesterday 9 am');
});

test('Give it a new day: the day it lands on is its own, in the same change, and one Undo takes both back', () => {
  const st = board(WED);
  st.tasks = [todo('plumber', { name: 'Call the plumber', due: '2026-10-15' })];
  const r = rig(st, WED, 600);
  const add = { name: 'Call the plumber', cat: 'home', icon: 'check', dur: 30, src: { type: 'task', id: 'plumber' } };
  const res = r.commit(() => M.placeAdd(r.state, '2026-10-22', add, 600));
  assert.ok(res && res.ok);
  assert.equal(r.state.tasks[0].due, '2026-10-22', 'Thursday is its day now');
  assert.equal(r.afterDue(add.src, '2026-10-22', 600, 30), 'That’s its new day', 'the toast right after says so');
  assert.equal(r.afterDue(add.src, '2026-10-22', 600, 30), 'That’s its new day', 'a panel drawn again in between doesn’t take the words');
  assert.equal(r.afterDue(add.src, '2026-10-23', 600, 30), 'That’s after it’s due (tomorrow)', 'another day is weighed against its new day');
  assert.equal(M.taskPlan(r.state.tasks[0], M.placements(r.state).get('plumber'), WED, 600).after, false, 'never after it’s due');
  r.commit(() => ({ ok: true }));
  assert.equal(r.afterDue(add.src, '2026-10-22', 600, 30), '', 'the next change ends it');
  r.undo(); r.undo();
  assert.equal(r.state.tasks[0].due, '2026-10-15');
  assert.equal(M.placements(r.state).get('plumber'), undefined);
  /* Give it a new day opens the place panel for one with no steps left, and its sheet for one with steps */
  r.giveNewDay(r.state.tasks[0]);
  assert.deepEqual(plain(r.opened.pop()), { type: 'place', spec: { kind: 'task', id: 'plumber' } });
  r.state.tasks.push(todo('garage', { due: '2026-10-14', steps: [{ id: 'g1', name: 'Sort', dur: 30, done: false }] }));
  r.giveNewDay('garage');
  assert.deepEqual(plain(r.opened.pop()), { type: 'task', id: 'garage' });
});

test('what keeps its day: a repeat, a step, a time that is over, and one due ahead', () => {
  const st = board(WED);
  st.tasks = [
    todo('water', { due: '2026-10-14', repeat: 'weekly' }),
    todo('essay', { due: '2026-10-16', steps: [{ id: 'e1', name: 'Draft', dur: 30, done: false }, { id: 'e2', name: 'Edit', dur: 30, done: false }] }),
    todo('past', { due: '2026-10-16' }),
    todo('ahead', { due: '2026-10-23' })
  ];
  const r = rig(st, WED, 600);
  const put = (id, date, src) => r.commit(() => M.placeAdd(r.state, date, { name: id, cat: 'home', icon: 'check', dur: 30, src: src || { type: 'task', id } }, 600));
  put('water', '2026-10-22');
  assert.equal(r.state.tasks[0].due, '2026-10-14', 'a repeat keeps its rhythm');
  put('essay', '2026-10-22', { type: 'step', task: 'essay', id: 'e1' });
  assert.equal(r.state.tasks[1].due, '2026-10-16', 'a step gives the to-do no new day');
  assert.equal(r.afterDue({ type: 'step', task: 'essay', id: 'e1' }, '2026-10-22', 600, 30), '', 'and says nothing about it');
  put('past', '2026-10-20');
  assert.equal(r.state.tasks[2].due, '2026-10-16', 'a time that’s over is no new day');
  put('ahead', '2026-10-24');
  assert.equal(r.state.tasks[3].due, '2026-10-23', 'one due ahead keeps its day');
  assert.equal(r.afterDue({ type: 'task', id: 'ahead' }, '2026-10-24', 600, 30), 'That’s after it’s due (Friday)', 'and is still after it');
});

test('the to-dos with no day yet, said by where they wait', () => {
  const st = board(WED);
  st.tasks = [
    todo('a', { group: 'home' }),
    todo('b'),
    todo('c', { done: true }),
    todo('d', { archived: true }),
    todo('e', { due: '2026-10-24' }),
    todo('f')
  ];
  st.dates['2026-10-22'] = { adds: [{ id: 'f1', name: 'f', cat: 'home', icon: 'check', start: 600, dur: 30, src: { type: 'task', id: 'f' } }] };
  const r = rig(st, WED, 600);
  const list = r.noDayTodos();
  assert.deepEqual(plain(list.map((t) => t.id)), ['b', 'a'], 'the Inbox first; not done, put away, dated, or placed ahead');
  assert.equal(r.noDayWords(list), '2 to-dos have no day yet');
  assert.equal(r.noDayWords(list.filter((t) => t.id === 'b')), '1 thing in your Inbox has no day yet');
  r.state.tasks.push(todo('g'), todo('h'));
  assert.equal(r.noDayWords(r.noDayTodos().filter((t) => t.group === 'inbox')), '3 things in your Inbox have no day yet');
});

test('this month and last, as counts from the board: never a chain', () => {
  const st = board(WED);
  st.weeks = {
    '2026-09-27': { reset: { done: true } },
    '2026-10-04': { reset: { done: true } },
    '2026-10-11': { reset: { caught: true } },
    '2026-10-18': { reset: { step: 2, done: false } }
  };
  st.dates = {
    '2026-09-30': { adds: [{ id: 's1', name: 'x', start: 600, dur: 30, src: { type: 'task', id: 'x' } }] },
    '2026-10-05': { adds: [
      { id: 'o1', name: 'x', start: 600, dur: 30, src: { type: 'task', id: 'x' } },
      { id: 'o2', name: 'x', start: 700, dur: 30, src: { type: 'step', task: 'y', id: 'y1' } },
      { id: 'o3', name: 'x', start: 800, dur: 30, src: { type: 'goal', id: 'g' } },
      { id: 'o4', name: 'x', start: 900, dur: 30, src: { type: 'block', id: 'walk' } },
      { id: 'o5', name: 'x', start: 1000, dur: 30, src: { type: 'task', id: 'z' }, skipped: true }
    ] },
    '2026-10-30': { adds: [{ id: 'o6', name: 'x', start: 600, dur: 30, src: { type: 'task', id: 'q' } }] }
  };
  st.dinners = { '2026-10-05': { name: 'Tacos', items: [] }, '2026-10-06': { name: '', cook: 'me', items: [] }, '2026-10-07': { name: '', cook: '', items: [] }, '2026-09-29': { name: 'Soup', items: [] } };
  const r = rig(st, WED, 600);
  assert.deepEqual(plain(r.monthCounts('2026-10')), { resets: 2, timed: 3, dinners: 2 });
  assert.equal(r.monthWords(r.monthCounts('2026-10')), '2 resets, 3 things given a time, 2 dinners decided');
  assert.equal(r.monthWords(r.monthCounts('2026-09')), '1 reset, 1 thing given a time, 1 dinner decided');
  assert.equal(r.monthWords({ resets: 0, timed: 4, dinners: 0 }), '4 things given a time', 'what’s none is left out');
  assert.equal(r.monthWords({ resets: 0, timed: 0, dinners: 0 }), '');
  assert.equal(rig(st, WED, 600, { dinners: 'off' }).monthCounts('2026-10').dinners, 0, 'no dinners when the board doesn’t help with them');
  assert.doesNotMatch(r.monthWords(r.monthCounts('2026-10')), /in a row|streak|chain|best|record/i);
});

test('the first reset’s recap says one specific, honest thing from the kinds of time it gave', () => {
  const st = board(SUN);
  st.tasks = ['a', 'b', 'c', 'd'].map((id) => todo(id, { cat: id === 'd' ? 'work' : 'home' }));
  const r = rig(st, SUN, 600);
  const begin = () => { r.view.reset = { week: SUN, snap: r.resetSnap(SUN) }; };
  const put = (id, date, start) => r.commit(() => M.placeAdd(r.state, date, { name: id, cat: 'home', icon: 'check', dur: 30, src: { type: 'task', id } }, start));
  begin();
  assert.equal(r.firstDid(), '', 'nothing given a time, nothing said');
  put('a', '2026-10-19', 600);
  assert.equal(r.firstDid(), 'You gave 1 thing a time. It was for the house.');
  put('b', '2026-10-20', 600);
  assert.equal(r.firstDid(), 'You gave 2 things a time. All of them were for the house.');
  put('c', '2026-10-21', 600); put('d', '2026-10-22', 600);
  assert.equal(r.firstDid(), 'You gave 4 things a time. Most were for the house.');
  /* a block placed counts by its own kind of time; with no kind most, it names them */
  r.commit(() => M.placeAdd(r.state, '2026-10-23', { name: 'Run', cat: 'yours', icon: 'run', dur: 30, src: { type: 'block', id: 'run' } }, 420));
  r.commit(() => M.placeAdd(r.state, '2026-10-24', { name: 'Desk', cat: 'work', icon: 'star', dur: 30, src: { type: 'block', id: 'desk' } }, 600));
  assert.equal(r.firstDid(), 'You gave 6 things a time. They were for the house, work, and you.');
  assert.doesNotMatch(r.firstDid(), /only|just|should|great|good job|well done/i);
});

test('the reset on the phone’s Today, on its day: Start, Continue, Set up this week, and quiet unless it holds the gold', () => {
  /* Sunday at 7:05 pm, nothing started: Sunday Reset · About 17 min, with Start */
  const st = board(SUN);
  const r = rig(st, SUN, 1145, { mins: 17 });
  const s = plain(r.resetLineState());
  assert.equal(s.name, 'Sunday Reset');
  assert.equal(s.at, 0);
  const quiet = { now: [] };
  const line = r.resetLine((x) => x, quiet);
  assert.equal(words(line.kids[0]), 'Sunday Reset · About 17 min');
  assert.equal(line.kids[1].text, 'Start');
  assert.match(line.kids[1].cls, /quiet/, 'in a Free evening it’s quiet');
  line.kids[1].click();
  assert.deepEqual(plain(r.started), [[SUN, false]]);
  /* in open time the ranking gives the reset the gold: the line wears it, and the Now card doesn't say it again */
  const gold = { now: [['Start Sunday Reset', () => {}, 'now-reset', true], ['Start: Walk, 30 min', () => {}, 'now-next', false]] };
  const g = r.resetLine((x) => x, gold);
  assert.match(g.kids[1].cls, /\bgo\b/);
  assert.deepEqual(gold.now.map((x) => x[2]), ['now-next']);
  /* after a pause: 2 of 5 done, with Continue */
  r.state.weeks[SUN] = { reset: { step: 2, done: false } };
  const p = r.resetLine((x) => x, { now: [] });
  assert.equal(words(p.kids[0]), 'Sunday Reset · 2 of 5 done');
  assert.equal(p.kids[1].text, 'Continue');
  /* done: no line */
  r.state.weeks[SUN] = { reset: { done: true } };
  assert.equal(r.resetLineState(), null);
});

test('Monday and Tuesday say Set up this week while it’s due; a sample week and a quiet Wednesday have no line', () => {
  const mon = rig(board('2026-10-19'), '2026-10-19', 600, { mins: 17 });
  assert.equal(plain(mon.resetLineState()).name, 'Set up this week');
  assert.equal(words(mon.resetLine((x) => x, { now: [] }).kids[0]), 'Set up this week · About 17 min');
  const tue = board('2026-10-20');
  tue.weeks[SUN] = { reset: { setup: true } };
  assert.equal(rig(tue, '2026-10-20', 600).resetLineState(), null, 'a week set up from the setup is planned');
  const sample = board(SUN);
  sample.profile.sample = true;
  assert.equal(rig(sample, SUN, 600).resetLineState(), null, 'the sample has its own door');
  assert.equal(rig(board(WED), WED, 600).resetLineState(), null);
  /* a reset day of Saturday: Saturday is its day, for the week from tomorrow */
  const sat = board('2026-10-24');
  sat.settings = Object.assign({}, sat.settings, { resetAt: { day: 6, min: 600 } });
  const s = plain(rig(sat, '2026-10-24', 600).resetLineState());
  assert.equal(s.name, 'Sunday Reset');
  assert.equal(s.ws, '2026-10-25');
  /* a catch up put away part way picks up again: Plan the rest of the week, Continue */
  const wed = board(WED);
  wed.weeks[SUN] = { reset: { catchStep: 1 } };
  const c = rig(wed, WED, 600, { steps: 3 });
  assert.equal(plain(c.resetLineState()).name, 'Plan the rest of the week');
  assert.equal(words(c.resetLine((x) => x, { now: [] }).kids[0]), 'Plan the rest of the week · 1 of 2 done');
});

await import('../board/src/onboard.js');
await import('../board/src/scenarios.js');
const SC = globalThis.Scenarios, OB = globalThis.Onboard;
/* every button in a drawn tree, depth first */
const buttons = (n, out = []) => { if (n && n.tag === 'button') out.push(n); (n && n.kids || []).forEach((k) => { if (k && typeof k === 'object') buttons(k, out); }); return out; };

test('the due sheet with nothing due offers Add a to-do, and the to-dos with no day yet', () => {
  const st = SC.build('empty', D, M, WED, OB);
  const r = rig(st, WED, 600);
  let p = r.el('div');
  r.dueSoonPanel(p);
  assert.match(words(p), /Nothing due in the next 7 days\./);
  const add = buttons(p).find((b) => /c-ds-add/.test(b.cls));
  assert.ok(add, 'Add a to-do is there');
  assert.equal(words(add).trim(), 'Add a to-do');
  add.click();
  assert.deepEqual(plain(r.opened.pop()), { type: 'newTask', group: 'inbox' });
  /* with to-dos that have no day yet, it offers them, each with Give it a day */
  r.state.tasks.push(todo('a', { name: 'Fix the bike light' }), todo('b', { name: 'Book a dentist visit', dur: 15 }));
  p = r.el('div');
  r.dueSoonPanel(p);
  assert.match(words(p), /Nothing due in the next 7 days\. 2 things in your Inbox have no day yet\./);
  const give = buttons(p).filter((b) => b.text === 'Give it a day');
  assert.equal(give.length, 2);
  give[1].click();
  assert.deepEqual(plain(r.opened.pop()), { type: 'place', spec: { kind: 'task', id: 'b' } });
  assert.ok(buttons(p).some((b) => /c-ds-add/.test(b.cls)), 'and Add a to-do still');
});

test('the next 7 days with nothing in them: one line, one way forward, and each day a tap away', () => {
  const st = SC.build('empty', D, M, WED, OB);
  const r = rig(st, WED, 600);
  let p = r.el('div');
  r.next7Panel(p);
  assert.match(words(p), /Nothing planned yet\./);
  assert.doesNotMatch(words(p), /Nothing locked/, 'not seven bare rows');
  const go = buttons(p).find((b) => /c-n7-go/.test(b.cls));
  assert.equal(words(go).trim(), 'Set up my week', 'a board nobody has set up starts with the setup');
  go.click();
  assert.deepEqual(plain(r.opened.pop()), { setup: true });
  const days = buttons(p).filter((b) => /c-n7-day/.test(b.cls));
  assert.equal(days.length, 7);
  assert.equal(days[2].attrs['aria-label'], 'Add to Friday, October 23');
  assert.equal(days[0].attrs['aria-label'], 'Add to today, Wednesday, October 21');
  days[2].click();
  assert.deepEqual(plain(r.opened.pop()), { quick: 'Friday ' }, 'a tap is Add on that day');
  /* someone's own board with nothing planned: Add something */
  r.state.profile.name = 'Alex';
  p = r.el('div');
  r.next7Panel(p);
  const add = buttons(p).find((b) => /c-n7-go/.test(b.cls));
  assert.equal(words(add).trim(), 'Add something');
  add.click();
  assert.deepEqual(plain(r.opened.pop()), { quick: '' });
  /* a week with things in it keeps its rows */
  const busy = rig(board(WED), WED, 600);
  p = busy.el('div');
  busy.next7Panel(p);
  assert.doesNotMatch(words(p), /Nothing planned yet/);
  assert.equal(buttons(p).filter((b) => /c-ph-dayrow/.test(b.cls)).length, 7);
});

test('a board nobody has set up has no reset line, so Set up my week is the only setup on the screen', () => {
  const st = SC.build('empty', D, M, '2026-10-19', OB);
  const r = rig(st, '2026-10-19', 600, { mins: 10 });
  assert.equal(r.resetLineState(), null, 'Monday on an empty board: no Set up this week');
  const gold = { now: [['Set up this week', () => {}, 'now-reset', true]] };
  assert.equal(r.resetLine((x) => x, gold), null);
  /* once the board has a name and a week, the line comes back */
  const set = rig(board('2026-10-19'), '2026-10-19', 600, { mins: 10 });
  assert.equal(plain(set.resetLineState()).name, 'Set up this week');
});
