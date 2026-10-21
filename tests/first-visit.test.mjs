// V11 (Oct 15), the first visit, as the walk found it (docs/walk/first-visit.md) and as it was built: the setup hears a
// big thing and offers it as a goal (Big things are hard to start, A goal with a date, Make it a goal at See further
// ahead, the to-do step, and on the plan), a calendar left for a computer when the setup runs on a phone, dinner asked
// only of someone who said it's a scramble, Getting started counting what the setup did, the plan's plain words, and
// their own week behind the card while it's built and planned, which may never leave saving stopped. The pure parts
// run on src/onboard.js; the app's parts are cut out of board/src/app.js and variants/corners11/variant.js whole and
// run on a stand-in world, as tests/phone-first.test.mjs does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, variant, M, D, plain } from './v11-rig.mjs';

await import('../board/src/onboard.js');
const OB = globalThis.Onboard;
const today = '2026-10-14'; // a Wednesday, the walk's

const answers = (o) => Object.assign({ name: 'Nate', pains: [], home: 'solo', partner: '', kids: [], help: { dinners: true, together: true }, meals: { breakfast: true, lunch: true }, focus: [], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020, same: true, hours: {} }, cares: {}, noWork: false, placed: null, soon: null, dinner: null, todo: null, resetAt: { day: 0, min: 1140 } }, o);

test('Big things are hard to start is a pain where the board has goals, with research the setup already cites', () => {
  assert.ok(!OB.painsFor('solo').some((p) => p.id === 'big'), 'a version without goals never offers it');
  const big = OB.painsFor('solo', { goals: true }).find((p) => p.id === 'big');
  assert.ok(big, 'offered where the board has goals');
  assert.equal(big.name, 'Big things are hard to start');
  assert.equal(big.help, 'goal', 'picking it says yes to A goal with a date');
  assert.ok(big.tries.includes('todo'), 'the to-do step comes, with Make it a goal and Break it down');
  // the study is one the setup already cites, checked against Crossref with the others
  assert.equal(big.research, 'gollwitzer');
  assert.match(OB.RESEARCH.gollwitzer.url, /^https:\/\/doi\.org\/10\.1016\/S0065-2601\(06\)38002-1$/);
  // the two linked rings read as wedding rings: My plans fall apart wears a block running past its lane
  assert.equal(OB.painById('crash').icon, 'overrun');
  // every pain's words follow the copy rules
  for (const p of OB.PAINS) for (const w of [p.name, p.line, p.after, p.how, p.lean]) assert.doesNotMatch(w, /\u2014|\u2013|-{2}|\b(just|simply|really|please|actually|easily)\b/i, w);
});

test('a phone\'s setup leaves the calendar for a computer, and dinner is tried only by someone who said it\'s a scramble', () => {
  const ids = (a, o) => OB.stepsFor(a, o).map((s) => s.id);
  const a = answers({ pains: ['head', 'big'] });
  assert.ok(ids(a).includes('calendar') && ids(a).includes('dinner'), 'without the V11 options, every step as before');
  const phone = ids(a, { phone: true, asked: true });
  assert.ok(!phone.includes('calendar'), 'no calendar file on a phone');
  assert.ok(!phone.includes('dinner'), 'dinner waits in Getting started');
  assert.ok(phone.includes('todo'), 'a big thing brings the to-do step');
  assert.ok(ids(answers({ pains: ['dinner'] }), { asked: true }).includes('dinner'));
  assert.ok(ids(answers({ pains: ['dinner'], help: { dinners: false } }), { asked: true }).includes('dinner') === false, 'meals off, no dinner step');
  // their own words alone get the research step's answer too
  assert.ok(ids(answers({ painOther: 'The bar exam in February' }), { asked: true }).includes('why'));
  assert.ok(!ids(answers({ painOther: 'The bar exam in February' })).includes('why'));
  // a draft resumed on a step these answers no longer have lands on the nearest one before it
  assert.equal(OB.nearestStep(OB.stepsFor(a, { phone: true, asked: true }), 'calendar'), 'work');
});

test('what a goal asks of a week: the bar exam on Feb 23 is about 21 hours a week from Oct 14', () => {
  const L = OB.goalLoad(M, D, 'Bar exam', '2027-02-23', today);
  assert.equal(L.exam, 'The bar exam');
  assert.equal(L.hours, 400);
  assert.equal(Math.round(L.perWeek), 21);
  assert.equal(Math.round(L.perDay * 10) / 10, 3);
  const race = OB.goalLoad(M, D, 'Run a half marathon', '2027-02-23', today);
  assert.equal(race.hours, null, 'no common estimate, so no hours are made up');
});

test('the big thing the setup heard: one, the dated one leading, the same exam said twice counted once', () => {
  const a = answers({ soon: { name: 'Bar exam', date: '2027-02-23' }, todo: { text: 'Study for the bar exam', name: 'Study for the bar exam', kind: 'task' } });
  assert.deepEqual(plain(OB.bigThing(M, D, a, today)), { made: false, name: 'Bar exam', date: '2027-02-23', from: 'ahead', todo: true });
  // their own words: the exam's name, with no date yet
  assert.deepEqual(plain(OB.bigThing(M, D, answers({ painOther: 'Starting big things. ADHD, and the bar exam in February.' }), today)), { made: false, name: 'The bar exam', date: null, from: 'other' });
  // made a goal on the to-do step, it borrows the date See further ahead heard
  const made = OB.bigThing(M, D, Object.assign({}, a, { goal: { name: 'Study for the bar exam', date: null, from: 'todo' } }), today);
  assert.equal(made.made, true);
  assert.equal(made.date, '2027-02-23');
  // an eye exam, a birthday: nothing big
  assert.equal(OB.bigThing(M, D, answers({ soon: { name: 'A birthday', date: '2027-02-23' }, todo: { text: 'Book the eye exam', name: 'Book the eye exam', kind: 'task' } }), today), null);
});

test('Getting started counts what the setup did, two at most, and offers what\'s next in their place', () => {
  const desk = OB.movesFor(['head', 'big'], { dinners: true }, false, { did: { place: true, stretch: true, todo: true }, goal: true, calendar: false });
  assert.deepEqual(desk, ['build', 'place', 'stretch', 'goal', 'dinner', 'reset']);
  const phone = OB.movesFor(['head', 'big'], { dinners: true }, true, { did: { todo: true }, goal: true, calendar: true });
  assert.deepEqual(phone, ['build', 'todo', 'goal', 'calendar', 'reset'], 'the calendar the phone\'s setup left out comes early');
  assert.equal(OB.movesFor([], { dinners: false }, false, { did: {} }).length, 6);
  assert.ok(!OB.movesFor([], { dinners: false }, false, { did: {} }).includes('dinner'));
  // a list from before keeps its shape
  assert.deepEqual(OB.movesFor(['head'], { dinners: true }, false), ['build', 'place', 'stretch', 'todo', 'dinner', 'reset']);
  assert.ok(OB.MOVES.goal && OB.MOVES.calendar.phone);
});

test('the build says what it does in plain verbs, and a student\'s week says Class', () => {
  const a = answers({ fills: 'school', goal: { name: 'Bar exam', date: '2027-02-23', from: 'ahead' } });
  const st = D.buildState({ name: 'Nate', wake: a.wake, bed: a.bed, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 }, kids: [], cares: [] }, today);
  const lines = OB.buildLines(M, a, st, [{ kind: 'soon', name: 'Bar exam', date: '2027-02-23' }, { kind: 'todo', name: 'Study', steps: 6 }], null);
  assert.ok(lines.includes('Putting Bar exam on Tuesday, Feb 23'), lines.join(' | '));
  assert.ok(!lines.some((l) => /^Marking/.test(l)), 'never Marking it, like grading');
  assert.ok(lines.includes('Class on Mon, Tue, Wed, Thu, Fri'));
  assert.ok(lines.includes('Adding Study to your to-dos, in 6 steps'));
  assert.ok(lines.includes('Setting up Bar exam as a goal'));
  assert.equal(OB.fillOf(answers({ noWork: true })).id, 'none');
  assert.deepEqual(OB.DAY_SHAPES.map((x) => x.id), ['early', 'usual', 'late']);
});

test('what the to-do step adds goes on the board: its steps, its joined date, more to-dos, and no Look at for a goal', () => {
  const st = D.buildState({ name: 'Nate', wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: null, kids: [], cares: [] }, today);
  const a = answers({
    todo: { text: 'Study for the bar exam', name: 'Study for the bar exam', kind: 'task', due: '2027-02-23', joined: true, steps: [{ name: 'Gather your notes', dur: 5 }, { name: 'List the topics', dur: 10 }] },
    more: [{ text: 'Call the dentist by Friday', name: 'Call the dentist', kind: 'task', due: '2026-10-16' }],
    painOther: 'ADHD, and the bar exam in February', goal: { name: 'The bar exam', date: null, from: 'other' }
  });
  const on = OB.applyExtras(M, st, a);
  const study = st.tasks.find((t) => t.name === 'Study for the bar exam');
  assert.equal(study.due, '2027-02-23');
  assert.deepEqual(study.steps.map((x) => [x.name, x.dur]), [['Gather your notes', 5], ['List the topics', 10]]);
  assert.ok(st.tasks.some((t) => t.name === 'Call the dentist'), 'one per line, each a to-do');
  assert.ok(!st.tasks.some((t) => /^Look at/.test(t.name)), 'their words became the goal, so they aren\'t a Look at too');
  const x = on.find((y) => y.kind === 'todo' && y.name === 'Study for the bar exam');
  assert.equal(x.id, study.id, 'the plan knows which task a goal made from it takes off the list');
  assert.equal(x.steps, 2);
  // without the goal, their words wait for the reset
  const st2 = D.buildState({ name: 'Nate', wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: null, kids: [], cares: [] }, today);
  OB.applyExtras(M, st2, answers({ painOther: 'Mornings are chaos' }));
  assert.ok(st2.tasks.some((t) => t.name === 'Look at: Mornings are chaos'));
});

/* == the app's own parts == */

/* setupInput, with a kid whose Wednesday ends early: each run of days with the same times is a run of its own */
test('a kid\'s early release Wednesday is a pick up of its own, and a student\'s week says Class', () => {
  const script = `
    const FEEL = true, OB = __OB;
    const workFixed = (a) => !!a.work.fixed;
    ${app('  function setupInput(a) {', '  /* Whether work hours are set')}
    ${app('  /* V11 (Oct 15, the first-visit walk): what fills the weekdays names its block', '  /* the base week with the block from Try it on it')}
    ({ setupInput, fillBlocks });`;
  const f = runInNewContext(script, { M, D, __OB: OB });
  const a = answers({ home: 'family', partner: 'Sam', kids: ['Robin'], cares: { Robin: { days: [1, 2, 3, 4, 5], drop: 510, pick: 1005, other: false, same: false, hours: { 3: { drop: 510, pick: 780 } } } } });
  const inp = f.setupInput(a);
  assert.deepEqual(plain(inp.cares).map((c) => [c.kids[0], c.days, c.drop, c.pick]), [['Robin', [1, 2, 4, 5], 510, 1005], ['Robin', [3], 510, 780]]);
  const st = D.buildState(inp, today);
  assert.ok(st.rhythm.days[3].blocks.some((b) => /Pick up Robin/.test(b.name) && b.start === 780), 'Wednesday picks up at 1 pm');
  assert.ok(st.rhythm.days[2].blocks.some((b) => /Pick up Robin/.test(b.name) && b.start === 1005));
  // the same times every day: one run, as before
  const one = f.setupInput(answers({ home: 'family', kids: ['Robin'], cares: { Robin: { days: [1, 2, 3, 4, 5], drop: 510, pick: 1005, other: false } } }));
  assert.equal(one.cares.length, 1);
  // school names the block
  const school = f.fillBlocks(D.buildState(f.setupInput(answers({ fills: 'school' })), today), answers({ fills: 'school' }));
  assert.ok(school.rhythm.days[1].blocks.some((b) => b.id === 'work' && b.name === 'Class' && b.icon === 'book'));
  const work = f.fillBlocks(D.buildState(f.setupInput(answers({})), today), answers({}));
  assert.ok(work.rhythm.days[1].blocks.some((b) => b.id === 'work' && b.name === 'Work'));
});

test('a goal\'s words: an exam\'s hours over the weeks to its date, anything else a little each day', () => {
  const script = `
    const today = __today, OB = __OB;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    ${app('  function goalWords(name, date) {', '  /* A study as a phone reads it')}
    ({ goalWords });`;
  const f = runInNewContext(script, { M, D, __today: today, __OB: OB });
  assert.equal(f.goalWords('Bar exam', '2027-02-23'), 'The bar exam is about 400 hours of study by a common estimate, about 21 hours a week until Feb 23.');
  assert.match(f.goalWords('Run a half marathon', '2027-02-23'), /^As a goal it gets a little time on your days until Feb 23/);
  assert.match(f.goalWords('Bar exam', '2026-10-17'), /^That’s in 3 days/);
});

/* == the week behind the setup: saving never stops quietly ==
   The setup's last two steps show the built week on the desk without saving it. Every way out lets it go first, and
   saving works again after each; a change that arrives with it left set and the setup gone lands on the real board. */
function behindRig(o) {
  o = o || {};
  const real = { profile: { name: 'Alex', sample: !o.realBoard }, settings: { tz: 'x' }, n: 'real', weeks: {}, dates: {} };
  const built = { profile: { name: 'Nate' }, settings: { modules: { dinners: true } }, n: 'built', weeks: {}, dates: {} };
  const ctx = { saved: [], rescued: [], landed: 0, previewed: null, threw: !!o.throwOnRender, M, D };
  const script = `
    const FEEL = true, noDesk = false, readOnly = false, today = '2026-10-14', RESET_DAYS = [0, 6, 1];
    let state = __real, undoStack = ['u0'], redoStack = [], ready = true, returnFocus = null, heldMin = null, heldDay = null, previewOpens = 0, moves = null, coachFor = null;
    const view = { got: {}, mode: 'today', zoom: 'day', focus: today, phone: false, list: false, preview: null };
    const sheet = { hidden: true, className: '' }, drawer = { hidden: true }, scrim = { hidden: true };
    const $ = (id) => (id === 'sheet' ? sheet : id === 'drawer' ? drawer : id === 'scrim' ? scrim : null);
    const document = { body: { classList: { add() {}, remove() {} } }, contains: () => false };
    const cache = { clear() {} };
    const Store = { save: (st) => __ctx.saved.push(st.n), rescue: (label, st) => __ctx.rescued.push(st.n) };
    const Snd = { good() {}, chime() {}, slide() {}, init() {} };
    const render = () => {}, renderToday = () => {}, renderDrawer = () => {}, renderPreviewBar = () => {}, settle = () => {}, clockTick = () => {}, saveView = () => {}, say = () => {}, staleActs = () => {};
    const renderNow = () => { if (__ctx.threw) throw new Error('drawing failed'); };
    const stopOnb = () => {}, dropDraft = () => {}, devMovesOff = () => {}, logError = () => {}, oops = () => {}, endCoach = () => {}, noteMove = () => {}, toast = () => {};
    const phoneDay = () => false, firstDeskOk = () => false, firstLookDesk = () => false, startMoves = () => {}, onbBuild = () => {};
    const setMode = (m) => { view.mode = m; }, setZoom = (z) => { view.zoom = z; };
    const boardTime = (date, start) => ({ date, start });
    const landing = () => { __ctx.landed++; };
    const setTimeout = () => 0;
    const closeSetup = () => { __ctx.closedSetup = (__ctx.closedSetup || 0) + 1; closeSheet(); }, closeDrawer = () => { __ctx.closedDrawer = (__ctx.closedDrawer || 0) + 1; };
    sheet.classList = { contains: (c) => c === 'onb' };
    ${app('  /* (V11: never the week a setup is showing behind its card', '  /* Something broke that the person didn\'t cause.')}
    ${app('  /* == V11: the week behind the setup', '  /* (the end of the week behind the setup) */')}
    ${app('  function closeSheet() {', '  /* What the first visit keeps while a step is open')}
    ${app('  function finishSetup() {', '  /* V11 (Oct 15, the first-visit walk): the first landing')}
    ${app('  function showPreview(st, label, id) {', '  /* What a tap left behind belongs to the board it was made on.')}
    ({
      get state() { return state; }, set state(v) { state = v; }, view, sheet,
      persist, changed, commit, showBehind, dropBehind, behindFor, closeSheet, finishSetup, showPreview, endPreview, scrimTap,
      /* the setup open on a step, with the week it built */
      open(at, mode) { view.got.setup = { at, mode: mode || 'first', a: { name: 'Nate', resetAt: { day: 0, min: 1140 } }, built: JSON.parse(JSON.stringify(__built)), extras: [] }; sheet.hidden = false; behindFor(view.got.setup); },
      edit() { return commit(() => { state.edits = (state.edits || 0) + 1; return { ok: true }; }); }
    });`;
  const r = runInNewContext(script, { __real: real, __built: built, __ctx: ctx, M, D });
  return Object.assign(r, { ctx });
}

test('while the setup shows their week behind its card, nothing saves; every way out lets it go, and saving works again', () => {
  // the plan step: the built week is on the desk, never saved
  const t = behindRig();
  t.open('plan');
  assert.equal(t.state.n, 'built');
  assert.ok(t.view.behind);
  t.persist();
  t.changed();
  assert.deepEqual(t.ctx.saved, [], 'the built week isn\'t saved while the setup shows it');

  // Open my week: the built week becomes the board, saved, with the board it covered kept as Undo
  t.finishSetup();
  assert.equal(t.view.behind, null);
  assert.equal(t.state.n, 'built');
  assert.deepEqual(t.ctx.saved, ['built']);
  assert.equal(t.ctx.landed, 1);
  t.edit();
  assert.deepEqual(t.ctx.saved, ['built', 'built'], 'and the next change saves');

  // the x, Esc, a tap outside (closeSetup closes the sheet): the board as it was, and it saves
  const x = behindRig();
  x.open('build');
  x.closeSheet();
  assert.equal(x.view.behind, null);
  assert.equal(x.state.n, 'real');
  x.edit();
  assert.deepEqual(x.ctx.saved, ['real']);

  // Back from the plan to an earlier step, or the setup's own Start over (both draw another step)
  const b = behindRig();
  b.open('plan');
  b.view.got.setup.at = 'name';
  b.behindFor(b.view.got.setup);
  assert.equal(b.view.behind, null);
  assert.equal(b.state.n, 'real');
  b.sheet.hidden = true; b.view.got.setup = null;
  b.edit();
  assert.deepEqual(b.ctx.saved, ['real']);

  // a preview or Dev opened from inside the setup keeps the real board aside, never the built week
  const p = behindRig();
  p.open('plan');
  p.showPreview({ n: 'scenario', profile: {}, settings: {}, weeks: {}, dates: {} }, 'A made up board', 'busy');
  assert.equal(p.view.behind, null);
  assert.equal(p.view.preview.saved.n, 'real');
  p.sheet.hidden = true; p.view.got.setup = null;
  p.endPreview();
  assert.equal(p.state.n, 'real');
  p.edit();
  assert.deepEqual(p.ctx.saved, ['real']);
});

test('K15: a tap on the desk behind Building or the plan never closes the setup; See my plan shows the new week', () => {
  // Kim had looked at the sample week earlier, so the board under the setup was the sample (Alex here). On Building the
  // desk is her new week under a clear scrim; a tap there that missed See my plan closed the setup and the sample came back
  for (const at of ['build', 'plan']) {
    const t = behindRig();
    t.open(at);
    assert.equal(t.state.n, 'built');
    t.scrimTap();
    assert.equal(t.ctx.closedSetup || 0, 0, at + ': the desk behind takes no taps');
    assert.ok(t.view.behind, at + ': the new week stays on the desk');
    assert.equal(t.state.n, 'built');
    assert.equal(t.sheet.hidden, false);
  }
  // the reset step beside the desk is the same
  const r = behindRig();
  r.open('build'); r.view.got.setup.at = 'reset'; r.view.got.setup.desk = true;
  r.scrimTap();
  assert.equal(r.ctx.closedSetup || 0, 0);
  // any other step: a tap outside the card closes it with the answers kept, as before
  const n = behindRig();
  n.open('name');
  n.scrimTap();
  assert.equal(n.ctx.closedSetup, 1);
  assert.equal(n.state.n, 'real');
  // no sheet open: the scrim belongs to Settings
  const d = behindRig();
  d.scrimTap();
  assert.equal(d.ctx.closedDrawer, 1);
});

test('something that throws mid-setup never leaves saving stopped', () => {
  // the sheet's close throws partway: the week behind it was let go first
  const t = behindRig({ throwOnRender: true });
  t.open('plan');
  assert.throws(() => t.closeSheet(), /drawing failed/);
  assert.equal(t.view.behind, null);
  assert.equal(t.state.n, 'real');
  t.ctx.threw = false;
  t.edit();
  assert.deepEqual(t.ctx.saved, ['real']);

  // the setup vanished without its close (a step threw, the sheet was taken over): a change lands on the real board
  const s = behindRig();
  s.open('plan');
  s.sheet.hidden = true; s.view.got.setup = null;
  s.edit();
  assert.equal(s.view.behind, null);
  assert.equal(s.state.n, 'real');
  assert.equal(s.state.edits, 1);
  assert.deepEqual(s.ctx.saved, ['real']);

  // a board replaced whole with it left set (a backup loaded, Start over): it's let go and the new board saves
  const w = behindRig();
  w.open('plan');
  w.sheet.hidden = true; w.view.got.setup = null;
  w.state = { n: 'backup', profile: {}, settings: {}, weeks: {}, dates: {} };
  w.changed();
  assert.equal(w.view.behind, null);
  assert.deepEqual(w.ctx.saved, ['backup']);

  // a setup tried as someone new on a real board: left set, the real board comes back whole before anything saves
  const r = behindRig({ realBoard: true });
  r.open('plan', 'preview');
  assert.equal(r.view.behind.preview, true);
  r.sheet.hidden = true; r.view.got.setup = null;
  r.changed();
  assert.equal(r.state.n, 'real');
  assert.deepEqual(r.ctx.saved, ['real'], 'never the made up week over someone\'s real one');
});

test('a setup tried as someone new finishes as a preview, with the board under it kept whole', () => {
  const t = behindRig({ realBoard: true });
  t.open('plan', 'preview');
  t.finishSetup();
  assert.equal(t.view.preview.saved.n, 'real', 'the real board is the one kept aside');
  assert.equal(t.view.behind, null);
  assert.deepEqual(t.ctx.saved, [], 'a preview saves nothing');
  assert.deepEqual(t.ctx.rescued, [], 'and takes no copy');
});

/* == variant.js: the bar's gold on the sample, and the plan's verb == */
test('on the sample the bar\'s one gold button is Set up my week; with a week set, Plan this week', () => {
  const calls = { setup: 0 };
  const mk = (who, rec) => {
    const SR = { today, nowMin: 870, who: () => who, view: { preview: null }, openSetup: () => { calls.setup++; }, parked: null, resetWeek: () => '2026-10-18' };
    const script = `
      const M = __M;
      const rec = (ws) => __rec[ws] || null;
      const runSteps = () => ['back', 'todo', 'done'], minutesOf = () => 7, planTitle = () => 'This week’s plan', openPlan = () => {}, openIntro = () => {};
      const snooze = null, hiddenMid = () => null, stepName = (k) => k, window = {};
      ${variant('    function chipState() {', '    const rchip = ')}
      ({ chipState });`;
    return runInNewContext(script, { SR, __M: M, __rec: rec || {} }).chipState();
  };
  const s = mk({ name: 'Alex', sample: true });
  assert.equal(s.kind, 'sunday', 'the gold kind');
  assert.equal(s.label, 'Set up my week');
  s.go();
  assert.equal(calls.setup, 1, 'it starts the setup, or picks one up');
  const own = mk({ name: 'Nate' }, { '2026-10-11': { setup: today } });
  assert.equal(own.kind, 'plan');
  assert.equal(own.label, 'Plan this week', 'a verb, so it isn\'t a second Your plan');
});

/* Getting started, started by the setup's Open my week (app.js startMoves), and kept on this device */
test('Getting started keeps the list the setup made, with what the setup did already ticked', () => {
  const store = new Map();
  const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
  const run = (phone) => {
    const script = `
      const FEEL = true, OB = __OB, today = __today, view = { phone: ${phone}, preview: null, sel: null };
      const phoneDay = () => false, firstDeskOk = () => false, setupOnPhone = () => ${phone}, useDinners = () => true, useTogether = () => false;
      const renderToday = () => {}, renderRack = () => {}, layoutInsets = () => {}, openSel = () => {}, setTimeout = () => 0;
      ${app("  const MOVES_KEY = 'sundayreset.moves';", '  /* something on the list happened')}
      ({ startMoves, movesList, movesLeft, get moves() { return moves; } });`;
    return runInNewContext(script, { M, D, __OB: OB, __today: today, localStorage: ls });
  };
  const a = answers({ pains: ['head', 'big'], placed: { date: '2026-10-15', start: 1125, dur: 60, stretched: true, add: { name: 'Study' } }, todo: { text: 'Study for the bar exam', name: 'Study for the bar exam', kind: 'task' }, soon: { name: 'Bar exam', date: '2027-02-23' } });
  const desk = run(false);
  desk.startMoves(a);
  assert.deepEqual(plain(desk.movesList()), ['build', 'place', 'stretch', 'goal', 'dinner', 'reset']);
  assert.deepEqual(plain(desk.moves.done), { build: true, place: true, stretch: true });
  assert.equal(desk.movesLeft(), 3);
  assert.equal(desk.moves.goal, 'Bar exam', 'the goal move says its name');
  // read back on this device later, the list is the one it was made with
  const again = run(false);
  assert.deepEqual(plain(again.movesList()), ['build', 'place', 'stretch', 'goal', 'dinner', 'reset']);
  // a phone's setup: five, the to-do ticked, the calendar it left out offered
  const ph = run(true);
  ph.startMoves(a);
  assert.deepEqual(plain(ph.movesList()), ['build', 'todo', 'goal', 'calendar', 'reset']);
});
