/* V11-2, Today's two new questions (docs/BIG-MOMENTS.md, the model's new API: two new moments). The morning after,
   the things from yesterday that didn't get a check, each Done, Move, or Let go in a sheet; and a heads-up whose time to
   ask has come, with Text {who}, Later this week, and Don't ask about {who}. The answers are cut out of app.js (the two
   big questions) and run with the real Model on made up boards, with stand-ins for what draws: commit keeps an Undo,
   toast keeps its words, and nothing is ever sent (msgSend and msgText only note what they were handed). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { M, D, app, plain } from './v11-rig.mjs';

await import('../board/src/onboard.js');
await import('../board/src/scenarios.js');
const S = globalThis.Scenarios, O = globalThis.Onboard;

/* the board's own words for days and times, and the rest of what the answers lean on */
const PARTS = [
  app('  const plural = (n, one, many) =>'),
  app('  const goalById = (id) =>'),
  app('  /* a number and its unit stay together on one line: 3 h 15 min */', '  /* what the date asks of every day it has'),
  app('  /* a date said the way a person would', '  /* V11: anyone grown up at home can cook'),
  app('  /* V11: "on Saturday", "yesterday", "today"', '  /* V11: what taking it back says'),
  app('  /* a day said the way a person says it: today, tomorrow, Thursday', '  /* V11: a box saved as focus leaves it saves once focus has landed'),
  app('  /* a day said short, the way the rows say it', '  /* where each step stands:'),
  app('  /* marks a to do or one of its steps done', '  function setDone'),
  app('  function goalAsk() {', '  function answerAsk(x, how, minutes) {'),
  app('  function goalAsks() {', '  /* A day answered stays in its row as what it did'),
  app('  /* == V11-2: the two big questions', '  function renderMoment() {'),
  app('  /* the questions waiting, the nearest deadline first', '  /* one question at a time (5.8)')
];

/* o: { preview (a made up board's view.preview), store (this device's storage), short, goals (stand-ins for the
   phone's other questions) } */
function rig(board, today, nowMin, o = {}) {
  const script = `
    const FEEL = true, store = __o.store || {};
    let state = __board, today = __today, nowMin = __now;
    const view = { got: {}, preview: __o.preview || null, sel: null, reset: null };
    const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    let seen = { date: today };
    function seenToday() { return seen.date === today ? Object.assign({}, seen) : { date: today }; }
    function markSeen(p) { seen = Object.assign(seenToday(), p); }
    const day = (d) => M.calendarDay(state, d);
    const taskById = (id) => state.tasks.find((t) => t.id === id);
    const who = () => state.profile;
    const useDinners = () => true;
    const toasts = [], sent = [], said = [], undoStack = [];
    function toast(text) { toasts.push(text); }
    function undoAct(what) { return { label: 'Undo', what }; }
    const Snd = { init() {}, pick() {}, slide() {}, good() {}, bad() {}, clack() {} };
    let lastMoment = null;
    function render() {} function renderSide() {} function renderToday() {} function landAdds() {}
    function sayMoment(text) { said.push(text); }
    function commit(fn) {
      const snap = JSON.stringify(state);
      let r;
      try { r = fn(); } catch (e) { state = JSON.parse(snap); throw e; }
      if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; }
      undoStack.push(snap);
      return r;
    }
    function undo() { const s = undoStack.pop(); if (s) state = JSON.parse(s); }
    const inboxId = () => 'inbox';
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const goalHrs = (m) => M.dur(m);
    /* the message step's own (app.js): what a message says, and handing its words over, here only noted */
    function msgOf(t) { const m = M.msgFor(state, t.id, today); return m ? { to: m.to, text: m.text, suggested: m.suggested, versions: m.versions, own: false } : null; }
    function msgSend(text, to) { sent.push({ via: 'msgSend', text, to }); return 'copy'; }
    function msgText(t) { const m = msgOf(t); sent.push({ via: 'msgText', text: m.text, to: m.to }); view.got.texted = t.id; }
    /* the answers' own toasts and Undo, as setDone, sessionDone, Find new times, and a session skipped make them */
    function setDone(t, stepId, done) { commit(() => { markDone(t, stepId, done); }); toast((stepId ? t.steps.find((s) => s.id === stepId).name : t.name) + ' is done.'); }
    function sessionDone(addId, done) { commit(() => { const x = M.findAdd(state, addId); x.add.done = !!done; const g = goalById(x.add.src.id); const all = M.goalSessions(state, g.id).filter((s) => s.date === x.date && !s.add.skipped); if (done && all.every((s) => s.add.done)) g.answers = Object.assign({}, g.answers, { [x.date]: 'yes' }); return { ok: true }; }); toast('Session done.'); }
    function findNewTimes(t) { let res = null; commit(() => { res = M.reflowTask(state, t.id, today, nowMin); return res.moved.length || res.unplaced.length ? { ok: true } : false; }); toast(res.message); }
    const ownDinner = () => null, shortAsk = () => !!__o.short, CI_KEEP = 90000;
    /* (a row's parts as plain objects: what it is, its classes, and what's in it) */
    const el = (tag, cls, text) => { const n = { tag, className: cls || '', text: text || '', kids: [], attrs: {}, dataset: {}, style: { setProperty() {} } }; n.append = (...k) => { n.kids.push(...k); }; n.appendChild = (k) => { n.kids.push(k); return k; }; n.setAttribute = (k, v) => { n.attrs[k] = v; }; return n; };
    const button = (text, cls, fn) => Object.assign(el('button', cls, text), { fn });
    const icon = (name) => ({ tag: 'icon', name });
    const cat = () => ({ base: '#2D6EA6', ink: '#FFFFFF' });
    ${PARTS.join('\n')}
    if (__o.goals) goalAsks = () => [1];
    ({
      get state() { return state; }, set today(v) { today = v; }, set nowMin(v) { nowMin = v; }, view, store, toasts, sent, said, undo, markSeen, seenToday,
      huHolds, huSkip, huLater, bigMoment, ydHeld, huSent, huSend, huDone, huPutOff, huNever, yLoose, yNow, yAnswer, yDone, yMove, yLetGo, yRow, goalAsk, phoneQuestions,
      said2: () => view.got.ySaid || {}
    });`;
  return runInNewContext(script, { M, D, __board: board, __today: today, __now: nowMin, __o: o, console });
}

/* a trip to California in December with a heads-up for Aunt Lisa (in LA) and one for Marco; its time to ask comes
   on Nov 6, six weeks before */
function california() {
  const st = D.sampleState('2026-10-20');
  st.events.push({ id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-18', end: '2026-12-22', leave: 540, back: 1080, ready: ['travel', { k: 'headsup', who: 'Aunt Lisa', place: 'LA' }, { k: 'headsup', who: 'Marco' }] });
  return st;
}
/* the morning after: a to-do placed whole (Call the bank), a step of one (Find the notice), and a goal's session
   (Strength), none with a check, from Tuesday; today is Wednesday */
const WED = '2026-10-21', TUE = '2026-10-20';
function yesterday() {
  const st = D.sampleState(TUE);
  /* (someone's own week, not the sample a first look opens) */
  delete st.profile.demo;
  st.tasks.push({ id: 'call', name: 'Call the bank', group: 'inbox', icon: 'handset', cat: 'home', due: '2026-10-23', dur: 15, done: false, repeat: null, steps: [] });
  M.placeAdd(st, TUE, { name: 'Call the bank', cat: 'home', icon: 'handset', dur: 15, src: { type: 'task', id: 'call' } }, 12 * 60);
  const reg = st.tasks.find((t) => t.id === 'registration');
  M.placeAdd(st, TUE, { name: reg.steps[0].name, cat: 'home', icon: 'car', dur: 15, src: { type: 'step', task: 'registration', id: reg.steps[0].id } }, 12 * 60 + 30);
  const g = M.newGoal({ id: 'gs', name: 'Get stronger', kind: 'skill', today: '2026-10-13', parts: [{ id: 'gp1', name: 'Strength', min: 0 }], rhythm: { n: 3, chunk: 45, when: 'evening' } });
  st.goals.push(g);
  M.placeAdd(st, TUE, { name: 'Strength', cat: 'yours', icon: 'dumbbell', dur: 45, src: { type: 'goal', id: g.id, part: 'gp1' } }, 18 * 60 + 30);
  return st;
}
const byKind = (r, kind) => r.yLoose().find((x) => x.kind === kind);

test('a heads-up asks once its time has come, and Text hands the words over without sending anything', () => {
  const r = rig(california(), '2026-11-05', 14 * 60);
  assert.equal(r.bigMoment('headsup'), null, 'not before six weeks out');
  r.today = '2026-11-06';
  const m = r.bigMoment('headsup');
  assert.deepEqual([m.kind, m.who, m.words], ['headsup', 'Aunt Lisa', 'Your aunt would love some notice about LA. Text her this week?']);
  assert.equal(r.huSent(m), false);
  /* no to-do yet: the suggestion goes to Messages through msgSend, and then it asks whether it went */
  r.huSend(m);
  assert.deepEqual(plain(r.sent), [{ via: 'msgSend', text: 'Hey Aunt Lisa! I\'ll be in LA Dec 18 to 22 and would love to see you. Are you around?', to: 'Aunt Lisa' }]);
  assert.equal(r.huSent(m), true);
  assert.equal(r.state.tasks.filter((t) => /heads-up/.test(t.name)).length, 0, 'texting changes nothing on the board');
});

test('Mark it done makes the heads-up’s to-do and checks it off in one change; the next person asks after', () => {
  const r = rig(california(), '2026-11-06', 14 * 60);
  const m = r.bigMoment('headsup');
  r.huSend(m);
  r.huDone(m);
  const t = r.state.tasks.find((x) => x.name === 'Give Aunt Lisa a heads-up');
  assert.ok(t && t.done, 'made and done');
  assert.equal(t.of, 'cal');
  assert.deepEqual(plain(t.msg), { to: 'Aunt Lisa' }, 'the suggestion itself is never saved');
  assert.equal(r.state.events.find((e) => e.id === 'cal').prep['headsup:Aunt Lisa@2026-12-18'], t.id);
  assert.deepEqual(plain(r.said), ['The heads-up to Aunt Lisa is done.']);
  assert.equal(r.huSent(m), false, 'it no longer asks whether it went');
  const next = r.bigMoment('headsup');
  assert.equal(next.who, 'Marco');
  const c = M.countdown(r.state, { event: 'cal' }, '2026-11-06', 840);
  assert.equal(c.rest.concat(c.next ? [c.next] : []).find((x) => x.id === 'headsup:Aunt Lisa@2026-12-18').status, 'done', 'the countdown shows it done');
  /* one Undo takes back both: the to-do and its check */
  r.undo();
  assert.equal(r.state.tasks.filter((x) => /heads-up/.test(x.name)).length, 0);
  assert.equal(r.bigMoment('headsup').who, 'Aunt Lisa');
});

test('a heads-up that’s a to-do already sends the words kept on it, through the message step’s own msgText', () => {
  const st = california();
  const e = st.events.find((x) => x.id === 'cal'), item = M.readyFor(st, e, e.date, '2026-11-06').find((x) => x.key === 'headsup:Marco@2026-12-18');
  const t = M.prepTodo(st, 'cal', item, { group: 'inbox' });
  t.msg.text = 'Marco! LA in December. Dinner?';
  const r = rig(st, '2026-11-06', 14 * 60);
  /* Aunt Lisa's last good day comes first; put her off and Marco asks */
  r.huPutOff(r.bigMoment('headsup'));
  const m = r.bigMoment('headsup');
  assert.deepEqual([m.who, m.task], ['Marco', t.id]);
  r.huSend(m);
  assert.deepEqual(plain(r.sent), [{ via: 'msgText', text: 'Marco! LA in December. Dinner?', to: 'Marco' }]);
  assert.equal(r.view.got.texted, t.id);
  assert.equal(r.huSent(m), true);
  r.huDone(m);
  assert.equal(r.state.tasks.find((x) => x.id === t.id).done, true, 'its own to-do is checked off, no new one');
  assert.equal(r.state.tasks.filter((x) => /heads-up/.test(x.name)).length, 1);
});

test('Later this week asks again three days on and says which day; Don’t ask about stops it; a made up board keeps its own', () => {
  /* Tuesday Nov 3: three days on is Friday, in this week */
  const r = rig(california(), '2026-11-03', 14 * 60);
  assert.equal(r.bigMoment('headsup'), null, 'Nov 3 is before its time');
  r.today = '2026-11-10';
  assert.deepEqual(plain(r.huLater()), { date: '2026-11-13', label: 'Later this week', day: 'Friday' });
  const m = r.bigMoment('headsup');
  assert.equal(r.huPutOff(m), 'It’ll ask again Friday.');
  assert.equal(r.bigMoment('headsup').who, 'Marco', 'the next one asks meanwhile');
  r.huNever(r.bigMoment('headsup'));
  for (const d of ['2026-11-10', '2026-11-11', '2026-11-12']) { r.today = d; assert.equal(r.bigMoment('headsup'), null, d); }
  r.today = '2026-11-13';
  assert.equal(r.bigMoment('headsup').who, 'Aunt Lisa', 'Friday, it asks again');
  r.today = '2026-11-20';
  assert.equal(r.bigMoment('headsup').who, 'Aunt Lisa', 'and Marco never again');
  assert.deepEqual(plain(JSON.parse(r.store['sundayreset.headsups'])), { 'headsup:Aunt Lisa@2026-12-18': '2026-11-13', 'headsup:Marco@2026-12-18': 'no' });
  /* Friday: three days on is Monday, in the next week */
  r.today = '2026-11-06';
  assert.deepEqual(plain(r.huLater()), { date: '2026-11-09', label: 'Early next week', day: 'Monday' });
  /* a made up board's holds stay in its own memory, never on this device */
  const store = {}, p = rig(california(), '2026-11-06', 14 * 60, { preview: { id: 'x' }, store });
  p.huNever(p.bigMoment('headsup'));
  assert.equal(p.bigMoment('headsup').who, 'Marco');
  assert.deepEqual(plain(store), {});
  assert.deepEqual(Object.keys(p.view.preview.headsups), ['headsup:Aunt Lisa@2026-12-18']);
});

test('yesterday: Done, Move, and Let go, each one change with its toast, each row then saying what happened', () => {
  const r = rig(yesterday(), WED, 7 * 60);
  const m = r.bigMoment('yesterday');
  assert.deepEqual([m.kind, m.count, m.words], ['yesterday', 3, '3 things from yesterday didn’t get a check.']);
  /* Done on the to-do placed whole: it's done */
  r.yAnswer(byKind(r, 'task'), r.yDone);
  assert.equal(r.state.tasks.find((t) => t.id === 'call').done, true);
  /* Let go on the step: off the board, the to-do still open */
  const step = byKind(r, 'step');
  r.yAnswer(step, r.yLetGo);
  assert.equal(M.findAdd(r.state, step.add), null);
  assert.equal(r.state.tasks.find((t) => t.id === 'registration').done, false, 'letting go never marks it done');
  assert.equal(r.state.tasks.find((t) => t.id === 'registration').steps[0].done, false);
  /* Move on the goal's session: the next quiet time in its own part of the day, kept where it went */
  const s = byKind(r, 'goal');
  r.yAnswer(s, r.yMove);
  const f = M.findAdd(r.state, s.add);
  assert.ok(f.date >= WED && f.add.start >= 17 * 60, 'an evening session goes to an evening: ' + f.date + ' ' + f.add.start);
  assert.equal(f.add.pinned, true);
  assert.deepEqual(r.yLoose(), [], 'all three answered');
  assert.equal(r.bigMoment('yesterday'), null, 'so the question folds');
  /* each row says what happened, in its words */
  const said = plain(r.said2());
  assert.deepEqual(Object.values(said).map((x) => [x.x.name, x.how, x.words.replace(/\u00a0/g, ' ')]), [
    ['Call the bank', 'done', 'Done today'], ['Find the notice', 'go', 'No time now'], ['Strength', 'move', 'Moved to ' + (f.date === WED ? 'today' : 'tomorrow') + ' ' + M.clock(f.add.start)]
  ]);
  assert.equal(r.toasts.length, 3, 'one toast each');
  assert.match(r.toasts[1], /^Find the notice has no time now\. It’s still on your list\.$/);
  /* Undo brings the last one back to the list */
  r.undo();
  assert.deepEqual(r.yLoose().map((x) => x.name), ['Strength']);
});

test('yesterday: a goal’s session Done is that session only, Let go is the day’s No; a to-do placed whole moves to the next quiet time', () => {
  const r = rig(yesterday(), WED, 7 * 60);
  const g = () => r.state.goals.find((x) => x.id === 'gs');
  r.yAnswer(byKind(r, 'goal'), r.yDone);
  assert.equal(g().answers[TUE], 'yes', 'its only session that day: the check-in is Yes');
  r.undo();
  r.yAnswer(byKind(r, 'goal'), r.yLetGo);
  assert.equal(g().answers[TUE], 'no');
  assert.equal(r.toasts[r.toasts.length - 1].startsWith('Let go of Strength.'), true);
  assert.equal(r.yNow(Object.values(r.said2())[0].x).words, 'Let go');
  const call = byKind(r, 'task');
  r.yAnswer(call, r.yMove);
  const f = M.findAdd(r.state, call.add);
  assert.ok(f.date >= WED, 'moved ahead');
  assert.equal(r.state.tasks.find((t) => t.id === 'call').done, false);
  assert.match(r.toasts[r.toasts.length - 1], /^Call the bank moved to (today|tomorrow) at /);
  /* Move on a step goes with its to-do's Find new times */
  const st = byKind(r, 'step');
  r.yAnswer(st, r.yMove);
  assert.ok(M.findAdd(r.state, st.add).date >= WED);
});

test('a goal’s session moves the goal’s own way: whole to a day of its with room, else its time spreads ahead', () => {
  /* Get stronger has room this evening: the session goes there whole, in its own part of the day */
  const r = rig(yesterday(), WED, 7 * 60);
  const s = byKind(r, 'goal');
  r.yAnswer(s, r.yMove);
  const f = M.findAdd(r.state, s.add);
  assert.deepEqual([f.date, f.add.start >= 17 * 60, f.add.skipped || false], [WED, true, false]);
  /* the student's plan fills every day it has for two weeks: a session from yesterday is skipped and its time spreads
     over the days ahead, never stacked onto a full day */
  const st = S.build('student', D, M, TUE, O), g = st.goals[0];
  const n = rig(st, WED, 7 * 60);
  const y = n.yLoose().filter((x) => x.kind === 'goal');
  assert.equal(y.length, 2, 'Tuesday’s two sessions');
  n.yAnswer(y[0], n.yMove);
  const moved = M.findAdd(n.state, y[0].add);
  assert.equal(moved.date, TUE);
  assert.equal(moved.add.skipped, true, 'skipped, its time spread ahead');
  assert.equal(n.said2()[y[0].add].words, 'Its time went to the days ahead', 'its row says what its Move did');
  assert.match(n.toasts[n.toasts.length - 1], new RegExp('^' + y[0].name + ': [0-9.]+ h spread over the days before '), 'and the toast says where');
  assert.ok(M.goalSessions(n.state, g.id).filter((x) => x.date >= WED && !x.add.skipped).every((x) => {
    const r0 = g.rhythm, wd = M.weekday(x.date), cap = wd === 0 || wd === 6 ? r0.we : r0.wd;
    return M.goalSessions(n.state, g.id).filter((z) => z.date === x.date && !z.add.skipped).reduce((a, z) => a + z.add.dur, 0) <= cap;
  }), 'no day over its time');
  assert.deepEqual(n.yLoose().filter((x) => x.kind === 'goal').map((x) => x.add), [y[1].add], 'the other one still waits for a word');
});

test('each row says where its thing stands, and never wears a class a button already has (V11’s gold .go)', () => {
  const r = rig(yesterday(), WED, 7 * 60);
  const x = byKind(r, 'task');
  const row = r.yRow(x, null);
  assert.deepEqual(plain(row.kids[1].kids.map((b) => [b.className, b.attrs['aria-label']])), [['c-yd-b', 'Done: Call the bank'], ['c-yd-b', 'Move: Call the bank'], ['c-yd-b', 'Let go: Call the bank']]);
  assert.match(row.kids[0].className, /\bwent\b/, 'not answered yet: an outline, its time went by');
  for (const [how, look] of [['done', 'done'], ['move', 'set'], ['go', 'loose']]) {
    const said = r.yRow(x, { how, words: 'x' });
    assert.ok(!said.className.split(/\s+/).some((c) => ['go', 'done', 'move'].includes(c)), said.className);
    assert.match(said.kids[0].className, new RegExp('\\b' + look + '\\b'));
    assert.equal(said.kids.length, 1, 'an answered one has no buttons left');
  }
});

test('yesterday asks from wake to noon, never on the sample week a first look opens, and once put off, not again today', () => {
  const r = rig(yesterday(), WED, 5 * 60);
  assert.equal(r.bigMoment('yesterday'), null, 'before wake');
  r.nowMin = 7 * 60;
  assert.equal(r.bigMoment('yesterday').count, 3);
  r.nowMin = 12 * 60 + 30;
  assert.equal(r.bigMoment('yesterday'), null, 'after noon');
  r.nowMin = 7 * 60;
  r.markSeen({ yesterday: true });
  assert.equal(r.bigMoment('yesterday'), null, 'put off today');
  /* the next morning asks about its own yesterday: the sample week's Wednesday step */
  r.today = '2026-10-22';
  assert.deepEqual(plain(r.bigMoment('yesterday').items.map((x) => x.name)), ['Pull the numbers']);
  /* a late shift's morning is its own: Riley is up at 10 am, so yesterday asks from 10 until 2 pm */
  const late = S.build('late', D, M, TUE, O);
  late.tasks.push({ id: 'lx', name: 'Swap the car insurance', group: 'inbox', icon: 'car', cat: 'home', due: '2026-10-24', dur: 30, done: false, repeat: null, steps: [] });
  assert.ok(M.placeAdd(late, TUE, { name: 'Swap the car insurance', cat: 'home', icon: 'car', dur: 30, src: { type: 'task', id: 'lx' } }, 12 * 60).ok);
  const lr = rig(late, WED, 9 * 60 + 30);
  assert.equal(lr.bigMoment('yesterday'), null, 'asleep at 9:30 am');
  lr.nowMin = 10 * 60 + 30;
  assert.equal(lr.bigMoment('yesterday').count, 1);
  lr.nowMin = 13 * 60 + 59;
  assert.equal(lr.bigMoment('yesterday').count, 1);
  lr.nowMin = 14 * 60;
  assert.equal(lr.bigMoment('yesterday'), null, 'four hours after a late wake');
  /* the sample a first look opens: nobody lived its yesterday; a made up board in Dev still asks */
  const demo = yesterday();
  demo.profile.demo = true;
  assert.equal(rig(demo, WED, 7 * 60).bigMoment('yesterday'), null);
  assert.equal(rig(demo, WED, 7 * 60, { preview: { id: 'sample' } }).bigMoment('yesterday').count, 3);
});

test('the goals’ check-in leaves yesterday to the morning’s look back while it asks, or once it was put off', () => {
  const r = rig(yesterday(), WED, 7 * 60);
  assert.equal(r.ydHeld(), TUE);
  assert.equal(r.goalAsk(), null, 'yesterday’s session is asked in the look back, not twice');
  r.markSeen({ yesterday: true });
  assert.equal(r.goalAsk(), null, 'put off, not asked another way');
  const late = rig(yesterday(), WED, 13 * 60);
  assert.equal(late.ydHeld(), null);
  assert.equal(late.goalAsk().ask.date, TUE, 'after noon the check-in asks as it always did');
});

test('the phone’s questions: dinner first, then yesterday, a plan that doesn’t fit, the goals, and a heads-up last', () => {
  const st = yesterday();
  st.events.push({ id: 'cal', kind: 'trip', name: 'California', icon: 'plane', date: '2026-12-01', end: '2026-12-04', leave: 540, back: 1080, ready: [{ k: 'headsup', who: 'Aunt Lisa', place: 'LA' }] });
  const r = rig(st, WED, 7 * 60, { short: true, goals: true });
  assert.deepEqual(plain(r.phoneQuestions(0, WED).map((x) => x.kind)), ['yesterday', 'short', 'goal', 'headsup']);
  assert.deepEqual(plain(r.phoneQuestions(1, M.addDays(WED, 1)).map((x) => x.kind)), [], 'tomorrow asks only about its dinner');
});
