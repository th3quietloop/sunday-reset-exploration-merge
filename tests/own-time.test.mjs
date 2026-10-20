// V11-2, Russell's rule: your own time stays yours. Quiet time, what a plan uses without asking, is open time and
// time a handoff frees (it was someone else's job, so it's open now). Own time is a soft block the person kept for
// themselves: a Yours block (Creative time), free time (a Free evening), Breathing room, Open time. Nothing lands
// there on its own (Spread it out, Find new times, Didn't get to it, a goal's sessions, a prep plan); a plan the
// person says yes to may use it, after the open time, and says how much it takes. Time with people, Work, locked
// blocks, meals, and sleep are never offered. On made up boards: Sam on their own, and the sample family.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const MON = '2026-10-12';
/* someone on their own who works 9 to 5: Free evenings, and a Creative time block before work on Wednesdays */
function sam() {
  const st = D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, MON);
  return st;
}
const steps = (n, dur) => Array.from({ length: n }, (_, i) => ({ id: 's' + i, name: 'Step ' + (i + 1), dur, done: false }));
const todo = (st, o) => { const t = Object.assign({ id: 'tx', name: 'Write the letters', group: 'inbox', icon: 'note', cat: 'home', due: '2026-10-16', dur: null, repeat: null, done: false, steps: steps(4, 30) }, o || {}); st.tasks.push(t); return t; };
const inOwn = (st, date, start, dur) => M.ownTimeOf(st, date, start, dur).min > 0;
const blocksOn = (st, d) => M.calendarDay(st, d).blocks.filter((b) => !b.sleep);

test('quiet time is open time; own time is a Yours block, free time, Breathing room, or Open time; people, Work, locked blocks, meals, and sleep never are', () => {
  const st = sam();
  const tue = '2026-10-13';
  const bl = blocksOn(st, tue);
  const free = bl.find((b) => b.free), work = bl.find((b) => b.cat === 'work');
  assert.ok(free && M.ownBlock(free), 'a Free evening is the person’s own');
  assert.ok(work && !M.ownBlock(work), 'Work is never offered');
  const ws = M.quietWindows(st, tue, 'any', 0);
  assert.ok(ws.every((w) => !inOwn(st, tue, w.start, w.end - w.start)), 'no quiet window reaches into own time');
  assert.ok(!ws.some((w) => w.start >= free.start), 'the evening is not quiet time without a yes');
  /* the sample family: an evening with someone is never own time, even with a yes */
  const fam = D.sampleState(MON), eve = blocksOn(fam, MON).find((b) => /^Evening with/.test(b.name));
  assert.ok(eve && !M.ownBlock(eve), 'time with people is never offered');
  for (const b of blocksOn(fam, MON)) if (b.fixed || b.dinner || b.cat === 'us' || b.cat === 'family') assert.ok(!M.ownBlock(b), b.name);
});

test('a spread never lands in own time on its own; with a yes it does, after the open time, and says how much', () => {
  const st = sam(), t = todo(st, { steps: steps(4, 30) });
  const plan = M.spreadPlan(st, t.id, { when: 'evening' }, MON, 7 * 60);
  plan.days.forEach((d) => d.items.forEach((x) => assert.ok(!inOwn(st, d.date, x.start, x.dur), d.date + ' ' + M.clock(x.start) + ' is open time')));
  assert.equal(plan.own, undefined, 'no yes, nothing said about own time');
  const yes = M.spreadPlan(st, t.id, { when: 'evening', own: true }, MON, 7 * 60);
  assert.ok(yes.ok);
  assert.ok(yes.own.min > 0 && yes.own.days.length > 0);
  assert.ok(yes.own.days.every((x) => x.name === 'Free evening' && x.part === 'evening'));
  assert.equal(yes.own.min, yes.own.days.reduce((a, x) => a + x.min, 0));
  /* placed the way it was worked out, and the yes is for that plan only */
  const n = M.applySpread(st, t.id, yes, {});
  assert.equal(n, 4);
  const mine = Object.keys(st.dates).flatMap((d) => (st.dates[d].adds || []).filter((a) => a.src && a.src.task === t.id).map((a) => ({ d, a })));
  assert.ok(mine.some((x) => inOwn(sam(), x.d, x.a.start, x.a.dur)), 'some of it in the Free evening, as asked');
  const after = M.spreadPlan(st, todo(st, { id: 'ty', name: 'Sort the photos' }).id, { when: 'evening' }, MON, 7 * 60);
  after.days.forEach((d) => d.items.forEach((x) => assert.ok(!inOwn(st, d.date, x.start, x.dur), 'the next plan asks again')));
});

test('open time comes first even with a yes: own time takes only what the open time can’t', () => {
  const st = sam(), t = todo(st, { steps: steps(2, 15) });
  const yes = M.spreadPlan(st, t.id, { own: true }, MON, 7 * 60);
  assert.ok(yes.ok);
  assert.equal(yes.own.min, 0, 'it fits in open time, so it takes none of the person’s own');
});

test('a goal’s sessions never land in own time', () => {
  const st = sam();
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, date: '2027-02-23', today: MON, parts: ex.parts, rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 180, we: 240, when: 'any', chunk: 60 } });
  st.goals.push(g);
  M.planGoal(st, g.id, MON, 7 * 60, { horizon: 14 });
  const list = M.goalSessions(st, g.id);
  assert.ok(list.length > 0);
  list.forEach((x) => assert.ok(!inOwn(sam(), x.date, x.add.start, x.add.dur), x.date + ' ' + M.clock(x.add.start)));
});

test('Didn’t get to it moves a step to open time; with a yes it may take own time sooner', () => {
  const st = sam(), t = todo(st, { steps: steps(1, 30), due: '2026-10-20' });
  const placed = M.placeAdd(st, MON, { name: 'Step 1', cat: 'home', icon: 'note', dur: 30, src: { type: 'step', task: t.id, id: 's0' } }, 7 * 60);
  assert.ok(placed.ok);
  const no = M.moveStep(st, placed.add.id, MON, 8 * 60, { preview: true });
  assert.ok(no.ok && !inOwn(st, no.date, no.start, 30), 'the next open time');
  const yes = M.moveStep(st, placed.add.id, MON, 8 * 60, { preview: true, own: true });
  assert.ok(yes.ok);
  assert.ok(yes.date < no.date || (yes.date === no.date && yes.start <= no.start), 'own time can only make it sooner');
});

test('time a handoff frees is open: it’s used without asking', () => {
  const st = D.sampleState(MON);
  /* someone else has the pick up this Monday (V11 shows who: Kim: Pick up Robin): its time is open now */
  const pick = M.templateFor(st, MON).blocks.find((b) => /^Pick up/.test(b.name));
  assert.ok(pick, 'the sample family has a pick up');
  const rec = M.dateRec(st, MON);
  rec.edits = Object.assign({}, rec.edits, { [pick.id]: { gone: true, by: 'Kim' } });
  M.setHandoffs(true);
  try {
    const freed = blocksOn(st, MON).find((b) => b.handoff);
    assert.ok(freed, 'the pick up is Kim’s this day');
    assert.ok(!M.ownBlock(freed), 'a handoff is not own time');
    const ws = M.quietWindows(st, MON, 'any', 0);
    assert.ok(ws.some((w) => w.start <= freed.start && w.end >= freed.start + freed.dur), 'its time is quiet time');
  } finally { M.setHandoffs(false); }
});

/* the app's question for one piece (app.js ownStepAsk, ownAskWords), cut out and run on Sam's board */
import { app, plain } from './v11-rig.mjs';
function askWorld(st, today, nowMin) {
  const calls = [];
  const script = `
    let state = __st;
    const today = '${today}', nowMin = ${nowMin};
    const view = { got: {} };
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    const Snd = { pick() {} }, openSel = (s) => __calls.push(['open', s.key]);
    const keepUnit = (s) => String(s).replace(/(\\d) (h|min)\\b/g, '$1\\u00a0$2');
    ${app('  /* V11-2 (your own time stays yours): Didn\'t get to it moves a step to open time.', '  /* marks a to do or one of its steps done;')}
    ({ ownStepAsk, ownAskWords, view });`;
  return Object.assign(runInNewContext(script, { M, __st: st, __calls: calls }), { calls });
}
import { runInNewContext } from 'node:vm';

test('Didn’t get to it asks once when only own time keeps it on an earlier day: Tomorrow has no open time. Use 30 min of your Free evening?', () => {
  const st = sam(), TUE = '2026-10-13';
  const t = todo(st, { steps: steps(1, 30), due: '2026-10-20' });
  const placed = M.placeAdd(st, MON, { name: 'Step 1', cat: 'home', icon: 'note', dur: 30, src: { type: 'step', task: t.id, id: 's0' } }, 7 * 60);
  /* Tuesday's open time is taken (7 to 9 am, 5 to 6 pm); its Free evening is the only time left that day */
  M.placeAdd(st, TUE, { name: 'Dentist', cat: 'home', icon: 'tooth', dur: 120, src: { type: 'block', id: 'x1' } }, 7 * 60);
  M.placeAdd(st, TUE, { name: 'Call Mom', cat: 'family', icon: 'phone', dur: 60, src: { type: 'block', id: 'x2' } }, 17 * 60);
  const w = askWorld(st, MON, 8 * 60);
  const b = { add: placed.add.id, src: placed.add.src };
  assert.equal(w.ownStepAsk(b), true, 'it asks');
  const ask = plain(w.view.got.ownAsk);
  assert.equal(ask.date, TUE);
  assert.equal(ask.open, true, 'another day has open time, so the other answer is Find another day');
  assert.equal(w.ownAskWords(ask).replace(/ /g, ' '), 'Tomorrow has no open time. Use 30 min of your Free evening?', 'Tuesday is tomorrow, said as tomorrow');
  assert.deepEqual(plain(w.calls), [['open', 'add:' + placed.add.id]], 'in the step’s own sheet, before anything moves');
  /* with Tuesday's open time free again, open time does it and nothing is asked */
  const easy = sam(), t2 = todo(easy, { steps: steps(1, 30), due: '2026-10-20' });
  const p2 = M.placeAdd(easy, MON, { name: 'Step 1', cat: 'home', icon: 'note', dur: 30, src: { type: 'step', task: t2.id, id: 's0' } }, 7 * 60);
  assert.equal(askWorld(easy, MON, 8 * 60).ownStepAsk({ add: p2.add.id, src: p2.add.src }), false);
});
