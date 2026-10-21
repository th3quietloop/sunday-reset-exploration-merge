// Kim's test (Oct 20, docs/KIM-TEST.md): the setup's flows. K8 who does each drop off and pick up (Me locks it, the
// partner's is marked theirs every week, someone else's is a quiet note), saved as version 10; K12 a birthday that
// comes back every year and the app's own day picker on See further ahead; K13 Every day on a to-do; K22 the quick
// start and Finish setting up; K23 the sample week as a clear second choice on the welcome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { app, M, D, plain } from './v11-rig.mjs';

await import('../board/src/onboard.js');
const OB = globalThis.Onboard;
const APP = readFileSync(new URL('../board/src/app.js', import.meta.url), 'utf8');
const today = '2026-10-20'; // a Tuesday
const MON = '2026-10-19', WED = '2026-10-21', THU = '2026-10-22';
const copy = (v) => JSON.parse(JSON.stringify(v));
const answers = (o) => Object.assign({ name: 'Kim', pains: [], home: 'family', partner: 'Russell', kids: ['Elijah'], help: { dinners: true, together: true }, meals: { breakfast: true, lunch: true }, focus: [], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020, same: true, hours: {} }, cares: {}, noWork: false, placed: null, soon: null, dinner: null, todo: null, resetAt: { day: 0, min: 1140 } }, o);

/* setupInput as the app has it */
function input() {
  const script = `
    const FEEL = true, OB = __OB;
    const workFixed = (a) => !!a.work.fixed;
    ${app('  function setupInput(a) {', '  /* Whether work hours are set')}
    ({ setupInput });`;
  return runInNewContext(script, { M, D, __OB: OB }).setupInput;
}
const day = (st, d) => M.calendarDay(st, d).blocks.filter((b) => !b.sleep);
const named = (st, d, re) => day(st, d).find((b) => re.test(b.label || b.name));

test('K8: who does each drop off and pick up reads from the answers, older ones included', () => {
  assert.equal(OB.careWho({ dropBy: 'partner', pickBy: 'me' }, 1, 'drop'), 'partner');
  assert.equal(OB.careWho({ dropBy: 'partner', pickBy: 'me' }, 1, 'pick'), 'me');
  // saved before the who was asked: other: true was someone else for both, nothing was the person's own
  assert.equal(OB.careWho({ other: true }, 1, 'drop'), 'other');
  assert.equal(OB.careWho({ other: true }, 1, 'pick'), 'other');
  assert.equal(OB.careWho({ other: false }, 1, 'pick'), 'me');
  assert.equal(OB.careWho(undefined, 1, 'pick'), 'me');
  // a day with times and who of its own, only while the days differ
  const cr = { days: [1, 3], dropBy: 'me', pickBy: 'me', same: false, hours: { 3: { drop: 510, pick: 975, pickBy: 'partner' } } };
  assert.equal(OB.careWho(cr, 3, 'pick'), 'partner');
  assert.equal(OB.careWho(cr, 1, 'pick'), 'me');
  assert.equal(OB.careWho(Object.assign({}, cr, { same: true }), 3, 'pick'), 'me');
  assert.deepEqual(OB.careWhos(cr).sort(), ['me', 'partner']);
});

test('K8: the setup\'s answers become runs of days with the same times and the same who', () => {
  const setupInput = input();
  const a = answers({ cares: { Elijah: { days: [1, 2, 3, 4, 5], drop: 495, pick: 975, dropBy: 'me', pickBy: 'me', same: false, hours: { 3: { drop: 495, pick: 975, pickBy: 'partner' }, 5: { drop: 495, pick: 975, dropBy: 'other' } } } } });
  const runs = plain(setupInput(a).cares).map((c) => [c.days, c.dropBy, c.pickBy]);
  assert.deepEqual(runs, [[[1, 2, 4], 'me', 'me'], [[3], 'me', 'partner'], [[5], 'other', 'me']]);
  // an older answer: someone else handles it
  const old = plain(setupInput(answers({ cares: { Elijah: { days: [1, 2], drop: 495, pick: 975, other: true } } })).cares);
  assert.deepEqual(old.map((c) => [c.dropBy, c.pickBy]), [['other', 'other']]);
});

test('K8: Me locks it, the partner\'s shows as theirs every week, someone else\'s is a quiet note', () => {
  M.setHandoffs(true);
  const st = D.buildState({ name: 'Kim', partner: 'Russell', kids: ['Elijah'], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 },
    cares: [{ kids: ['Elijah'], days: [1, 2, 4], drop: 495, pick: 975, dropBy: 'me', pickBy: 'me' }, { kids: ['Elijah'], days: [3], drop: 495, pick: 975, dropBy: 'me', pickBy: 'partner' }, { kids: ['Elijah'], days: [5], drop: 495, pick: 975, dropBy: 'other', pickBy: 'me' }] }, today);
  const mon = named(st, MON, /Pick up Elijah/);
  assert.ok(mon.fixed && !mon.handoff, 'Monday: hers, locked');
  const wed = named(st, WED, /Pick up Elijah/);
  assert.equal(wed.handoff, 'Russell');
  assert.equal(wed.label, 'Russell: Pick up Elijah');
  assert.ok(!wed.fixed && wed.soft, 'never locked: the time is open');
  assert.equal(wed.start, 975, 'still where it happens, over open work');
  const fri = named(st, '2026-10-23', /Drop off Elijah/);
  assert.equal(fri.label, 'Someone else: Drop off Elijah');
  assert.ok(!fri.fixed);
  assert.ok(named(st, WED, /^Drop off Elijah$/).fixed, 'Wednesday\'s drop off is still hers');
  // taken back for one day (the block panel's Take it back writes mine), it's hers and locked that day only
  st.dates[WED] = { edits: { 'pickup-partner': { mine: true } } };
  const back = named(st, WED, /Pick up Elijah/);
  assert.ok(back.fixed && !back.handoff && back.name === 'Pick up Elijah');
  assert.equal(named(st, '2026-10-28', /Pick up Elijah/).handoff, 'Russell', 'the next Wednesday is Russell\'s again');
  // handed to Russell again that day, over the mine: his
  st.dates[WED].edits['pickup-partner'] = { mine: true, gone: true, by: 'Russell' };
  assert.equal(named(st, WED, /Pick up Elijah/).handoff, 'Russell');
  // the legacy rail leaves someone else's out
  assert.ok(!M.resolveDay(st, '2026-10-28').blocks.some((b) => /Pick up/.test(b.name)));
  // and a board with no handoffs shown (another version) leaves it out rather than locking it
  M.setHandoffs(false);
  assert.ok(!day(st, '2026-10-28').some((b) => /Pick up/.test(b.name)));
  M.setHandoffs(true);
});

test('K8: a partner\'s with no partner named is the person\'s own; an older other: true still puts nothing on', () => {
  const base = { name: 'Kim', partner: '', kids: ['Elijah'], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: null };
  const mine = D.buildState(Object.assign({}, base, { cares: [{ kids: ['Elijah'], days: [1], drop: 495, pick: 975, dropBy: 'partner', pickBy: 'partner' }] }), today);
  assert.ok(mine.rhythm.days[1].blocks.filter((b) => /Elijah/.test(b.name) && /Drop|Pick/.test(b.name)).every((b) => b.fixed && !b.by));
  const old = D.buildState(Object.assign({}, base, { cares: [{ kids: ['Elijah'], days: [1], drop: 495, pick: 975, other: true }] }), today);
  assert.ok(!old.rhythm.days[1].blocks.some((b) => /Drop off|Pick up/.test(b.name)));
});

test('K8: version 10; a version 9 board comes forward with only its number changed, and one with who round trips', () => {
  assert.equal(D.VERSION, 10);
  const v9 = D.sampleState(today);
  v9.v = 9;
  const before = copy(v9), st = D.migrate(copy(v9));
  assert.equal(st.v, 10);
  assert.deepEqual(Object.assign(copy(st), { v: 9 }), before);
  for (const d of M.range('2026-10-18', 21)) assert.deepEqual(copy(M.calendarDay(st, d)), copy(M.calendarDay(before, d)), d);
  const withWho = D.buildState({ name: 'Kim', partner: 'Russell', kids: ['Elijah'], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: null, cares: [{ kids: ['Elijah'], days: [3], drop: 495, pick: 975, dropBy: 'other', pickBy: 'partner' }] }, today);
  withWho.dates[WED] = { edits: { 'pickup-partner': { mine: true } } };
  const saved = JSON.stringify(withWho);
  assert.equal(JSON.stringify(D.migrate(JSON.parse(saved))), saved, 'exactly as saved');
  // a board from a newer version is left as it is
  const newer = Object.assign(copy(withWho), { v: 11 });
  assert.equal(D.migrate(newer).v, 11);
});

test('K8: Building says what\'s locked and what\'s noted, and the plan\'s summary says who', () => {
  const a = answers({ cares: { Elijah: { days: [1, 2, 3, 4, 5], drop: 495, pick: 975, dropBy: 'me', pickBy: 'partner' } } });
  const st = D.buildState(input()(a), today);
  const lines = OB.buildLines(M, a, st, [], null);
  assert.ok(lines.includes('Locking drop off and pick up for Elijah'));
  assert.ok(lines.includes('Noting who has drop off and pick up for Elijah'));
  const none = OB.buildLines(M, answers({ cares: { Elijah: { days: [1], drop: 495, pick: 975, other: true } } }), st, [], null);
  assert.ok(!none.some((l) => /^Locking/.test(l)) && none.includes('Noting who has drop off and pick up for Elijah'));
  for (const l of lines) assert.doesNotMatch(l, /—|–|-{2}|\b(just|simply|really)\b/i);
});

test('K8: the step asks who with chips, never the Someone else handles it switch', () => {
  const kids = APP.slice(APP.indexOf('  function onbKids(c, redraw) {'), APP.indexOf('  /* == Kim\'s test, K22: the quick start'));
  assert.ok(kids.length > 100);
  assert.doesNotMatch(kids, /Someone else handles it/);
  assert.match(kids, /\{ id: 'me', name: 'Me' \}/);
  assert.match(kids, /'Someone else'/);
  assert.match(kids, /Different on some days/);
  assert.match(APP, /if \(FEEL\) \{ onbKids\(c, redraw\); return; \}/);
});

test('K12: a birthday comes back every year; anything else is one date', () => {
  const st = D.buildState(input()(answers({})), today);
  const on = OB.applyExtras(M, st, answers({ soon: { name: 'Russ’ Birthday', date: '2027-03-04' } }));
  const ev = st.events.find((e) => e.name === 'Russ’ Birthday');
  assert.equal(ev.yearly, true);
  assert.equal(on[0].yearly, true);
  assert.ok(M.calendarDay(st, '2028-03-04').markers.some((m) => m.name === 'Russ’ Birthday'), 'next year too');
  const st2 = D.buildState(input()(answers({})), today);
  OB.applyExtras(M, st2, answers({ soon: { name: 'Beach trip', date: '2027-03-04' } }));
  assert.ok(!st2.events.find((e) => e.name === 'Beach trip').yearly);
  assert.ok(OB.buildLines(M, answers({}), st, on, null).some((l) => /Birthday on .*, every year$/.test(l)));
});

test('K12: See further ahead picks its date with the app\'s own day picker and its quick dates', () => {
  const ahead = APP.slice(APP.indexOf('    ahead(c) {'), APP.indexOf('    dinner(c) {'));
  assert.match(ahead, /dayPicker\(s\.date, today, /);
  assert.match(ahead, /const dt = FEEL \? dpHold : dateInput/);
  assert.match(ahead, /'Next month'\], \[3, 'In 3 months'\], \[6, 'In 6 months'\]/);
  const dp = APP.slice(APP.indexOf('  function dayPicker(value, min, onPick, fk, o) {'), APP.indexOf('  function dateInput(value, onDone) {'));
  assert.doesNotMatch(dp, /renderSide\(\);/, 'the month changes through o.redraw where it lives outside the side panel');
});

test('K13: Every day makes a daily to-do, due from the day the week was built', () => {
  const st = D.buildState(input()(answers({})), today);
  const on = OB.applyExtras(M, st, answers({ todo: { kind: 'task', name: 'Feed Elijah', text: 'Feed Elijah', daily: true }, more: [{ kind: 'task', name: 'Call the dentist', text: 'Call the dentist' }] }));
  const feed = st.tasks.find((t) => t.name === 'Feed Elijah'), call = st.tasks.find((t) => t.name === 'Call the dentist');
  assert.equal(feed.repeat, 'daily');
  assert.equal(feed.due, today);
  assert.ok(M.REPEATS.includes(feed.repeat));
  assert.equal(call.repeat, null);
  assert.equal(call.due, null);
  assert.equal(on.find((x) => x.name === 'Feed Elijah').daily, true);
  assert.ok(OB.buildLines(M, answers({}), st, on, null).includes('Adding Feed Elijah to your to-dos, every day'));
  // done today, it comes back tomorrow
  M.completeTask(st, feed.id, today);
  assert.ok(st.tasks.some((t) => t.name === 'Feed Elijah' && !t.done && t.due === '2026-10-21' && t.repeat === 'daily'));
  const todo = APP.slice(APP.indexOf('  function onbTodo(c) {'), APP.indexOf('  function onbBuilding(c) {'));
  assert.match(todo, /button\('Every day', 'chip-btn onb-daily'/);
});

test('K22: the quick start\'s Getting started leads with Finish setting up, and its answers wait for it', () => {
  const list = OB.movesFor([], { dinners: true }, false, { did: {}, quick: true });
  assert.deepEqual(list.slice(0, 2), ['build', 'finish']);
  assert.equal(list[list.length - 1], 'reset');
  assert.equal(list.length, 6);
  assert.equal(OB.movesFor([], { dinners: true }, true, { did: {}, quick: true }).length, 5);
  assert.ok(!OB.movesFor([], { dinners: true }, false, { did: {} }).includes('finish'), 'a full setup has nothing to finish');
  assert.match(OB.MOVES.finish.name, /^Finish setting up$/);
  assert.match(OB.MOVES.finish.line, /About 4 minutes/);
  assert.equal(OB.STEP_NAMES.quick, 'Quick start');
  // the quick start keeps the rest as a closed draft from what gets in the way, and the full setup keeps what was done
  const done = APP.slice(APP.indexOf('  function onbQuickDone(su) {'), APP.indexOf('  /* The full setup finished after a quick start'));
  assert.match(done, /id: 'pains'/);
  assert.match(done, /quickDone: true/);
  assert.match(done, /closed: true/);
  assert.match(APP, /if \(FEEL && a\.quickDone && !\(real\.profile && real\.profile\.sample\)\) keepPlayed\(real, built\);/);
  assert.match(APP, /if \(id === 'finish'\) \{ const d = loadDraft\(\); if \(d && d\.a && d\.a\.quickDone\) resumeFrom\(d, 'setup'\)/);
});

test('K22: the quick start asks name, home, the day, and work on one screen, and its week is the full setup\'s week', () => {
  const q = APP.slice(APP.indexOf('  function onbQuick(c) {'), APP.indexOf('  /* the board from the quick start'));
  for (const f of ['Your name', 'Who’s at home', 'Your day', 'Your weekdays', 'Days']) assert.ok(q.includes("'" + f + "'"), f);
  assert.match(q, /'Open my week'/);
  assert.doesNotMatch(q, /—|–|-{2}|\b(just|simply|really)\b/i);
  // what they did on the quick board stays when the full setup builds the week again
  const script = `${app('  function keepPlayed(real, built) {', '  /* V11 (Oct 15, the first-visit walk): two things heard')} keepPlayed;`;
  const keepPlayed = runInNewContext(script, {});
  const real = D.buildState(input()(answers({})), today), built = D.buildState(input()(answers({})), today);
  M.placeAdd(real, THU, { name: 'Walk', cat: 'yours', icon: 'shoe', dur: 30, src: { type: 'custom' } }, 1200);
  real.tasks.push({ id: 't1', name: 'Call the dentist', group: 'inbox', steps: [], done: false, repeat: null, due: null });
  real.dinners[THU] = { name: 'Tacos', cook: 'me', items: [] };
  M.placeAdd(built, WED, { name: 'Workout', cat: 'yours', icon: 'dumbbell', dur: 60, src: { type: 'block' } }, 1140);
  const out = keepPlayed(real, built);
  assert.ok(out.dates[THU].adds.some((x) => x.name === 'Walk'));
  assert.ok(out.dates[WED].adds.some((x) => x.name === 'Workout'));
  assert.ok(out.tasks.some((t) => t.id === 't1'));
  assert.equal(out.dinners[THU].name, 'Tacos');
});

test('K22, K23: the welcome keeps one gold button and offers Quick start and the sample week beside each other', () => {
  const w = APP.slice(APP.indexOf('  function onbWelcome(box) {'), APP.indexOf('  /* One step of the setup: the bar of its four parts'));
  assert.equal((w.match(/'go[ '"]/g) || []).length, 1, 'one gold: Set up my week');
  assert.match(w, /button\('', 'onb-alt onb-quickgo', onbQuickStart\)/);
  assert.match(w, /el\('b', '', 'Look at a sample week'\)/);
  assert.match(w, /el\('b', '', 'Quick start'\)/);
  const css = readFileSync(new URL('../variants/corners11/css/kimflows.css', import.meta.url), 'utf8');
  assert.match(css, /\.onb-alts \{ display: grid; grid-template-columns: repeat\(2/);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /gold|#F2CF7A|--cta/i, 'nothing on these is gold');
  // HUD type only on the token sizes
  for (const m of css.matchAll(/(\d+)px(?:\/[\d.]+)? var\(--font\)/g)) assert.ok([12, 13, 14, 16, 19, 22, 26, 30].includes(+m[1]), m[0]);
});

test('K22 follow-up: on a phone Getting started opens as its panel, from This week\'s row or Settings, Help, day or night', () => {
  const open = APP.slice(APP.indexOf('  function openMoves() {'), APP.indexOf('  /* A move\'s line where it\'s read'));
  // V11's phone Today has no card of its own (phoneToday returns before the older .td-moves card), so the panel opens
  assert.match(open, /if \(view\.phone && FEEL\) \{ renderToday\(\); openSel\(\{ type: 'moves' \}\); return; \}/);
  assert.ok(open.indexOf('view.phone && FEEL') < open.indexOf(".td-moves"), 'before the older card\'s way');
  // the row is in This week by day; after bed the card folds to its first row, by design
  assert.match(APP, /rows\.push\(\{ ic: 'check', name: 'Getting started', val: .*fn: \(\) => openMoves\(\)/);
  assert.match(APP, /\(night \? rows\.slice\(0, 1\) : rows\)/);
});
