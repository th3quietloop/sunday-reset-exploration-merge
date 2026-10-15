/* V11: a to-do's sheet (docs/PHONE-REDESIGN.md, section 6). One next move at its foot, chosen by where the to-do
   stands (app.js tsNext): a line and at most one gold button, or no gold when there's nothing to do now. The plan
   said in one sentence (tsSpreadWords), what keeps its day (tsFixedDay), when Make it a goal is offered (tsGoalFits),
   and the step sheet's Didn't get to it line (didntLine). Cut out of app.js and run with the real Model and Data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D, plain } from './v11-rig.mjs';

const TODAY = '2026-10-15'; // a Thursday
/* the sheet's rules in a world of their own: today at 4:15 pm unless asked, buttons that only say what they'd do */
function sheet(o = {}) {
  const calls = [];
  const script = `
    const FEEL = true;
    const today = __o.today || '${TODAY}', nowMin = __o.nowMin == null ? 975 : __o.nowMin;
    const view = { phone: true, got: {} };
    const window = { SR_focusBlock: __o.noFocus ? undefined : (x) => __calls.push(['focus', x.name, x.left]), SR: __o.goals ? { openGoal: () => {} } : {} };
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const el = (tag, cls, text) => { const e = { tag, text: text || '', kids: [], append(...xs) { xs.forEach((x) => e.kids.push(x)); }, appendChild(x) { e.kids.push(x); return x; } }; return e; };
    const say = () => {}, toast = (t) => __calls.push(['toast', t]), undoSay = () => null;
    const setDone = (t, s, d) => __calls.push(['done', s, d]), breakDown = () => __calls.push(['breakDown']), openSel = (s) => __calls.push(['open', s.type]);
    const doSpread = () => __calls.push(['spread']), didntGetTo = () => __calls.push(['didnt']), tsGo = (t, p) => __calls.push(['page', p]);
    const setZoom = () => {}, closeSel = () => __calls.push(['close']), tsFindNew = () => __calls.push(['reflow']);
    ${app('  /* a day said the way a person says it: today, tomorrow, Thursday', '  /* V11: a box saved as focus leaves it saves once focus has landed')}
    ${app('  /* a day said short, the way the rows say it', '  /* where each step stands:')}
    ${app('  /* a plan said in one line:', '  /* what\'s in the way of a plan that doesn\'t fit')}
    ${app('  /* an exam, a test, or an interview keeps its day', '  /* What the sheet\'s foot says and offers')}
    ${app('  /* What the sheet\'s foot says and offers', '  /* Find new times from the sheet:')}
    ${app('  /* Make it a goal: only when it fits', '  /* More, in the sheet\'s header')}
    ${app('  /* the step sheet\'s line, from Didn\'t get to it\'s own hint', '  /* V11 (the to-do\'s sheet, docs/PHONE-REDESIGN.md, 6 I): a step\'s own sheet')}
    ({ tsNext, tsSpreadWords, tsFixedDay, tsGoalFits, didntLine });`;
  return Object.assign(runInNewContext(script, { __o: o, __calls: calls, M, D }), { calls });
}
/* where a to-do stands, the way tsCtx reads it, said by hand */
const ctx = (o = {}) => Object.assign({ steps: [], pl: [], plan: { after: false }, next: {}, was: {}, now: null, whole: [], missed: [], toSpread: [], f: null, sp: null, prop: {} }, o);
const task = (o = {}) => Object.assign({ id: 'tx', name: 'Study for exam', due: '2026-10-21', dur: 120, cat: 'work', steps: [], done: false }, o);
const steps = (n, done = 0) => Array.from({ length: n }, (_, i) => ({ id: 's' + i, name: 'Step ' + (i + 1), dur: 15, done: i < done }));
const at = (date, start, step, dur = 15) => ({ date, step, add: { id: 'a' + step, start, dur, src: { type: 'step', task: 'tx', id: step } } });
const words = (n) => (n == null ? '' : typeof n === 'string' ? n : (n.text || '') + (n.kids || []).map(words).join(''));
/* (a time keeps its am or pm with a no-break space, so it never wraps apart; read here as a space) */
const sp = (x) => (typeof x === 'string' ? x.replace(/\u00a0/g, ' ') : x);
const said = (foot) => sp(foot.line != null && foot.line !== '' ? foot.line : words(foot.words));

test('a to-do with no steps: a big one leads with Break it down, a small one with Give it a time', () => {
  const s = sheet();
  const big = s.tsNext(task(), ctx()).foot;
  assert.equal(big.line, 'About 2 h. Small steps are easier to start.');
  assert.deepEqual([big.quiet[0], big.gold[0]], ['Give it one time', 'Break it down'], 'one gold: the next move');
  const small = s.tsNext(task({ name: 'Call the dentist', dur: 15 }), ctx()).foot;
  assert.equal(small.line, 'About 15 min.');
  assert.deepEqual([small.quiet[0], small.gold[0]], ['Break it down', 'Give it a time']);
  const set = s.tsNext(task(), ctx({ whole: [{ date: '2026-10-16', add: { id: 'w', start: 1170, dur: 120 } }] })).foot;
  assert.equal(sp(set.line), 'Set for Tomorrow 7:30 pm.');
  assert.equal(set.gold, undefined, 'it has a time: nothing to do now, so no gold');
});

test('steps without a time: the plan, proposed, with Change and one gold Put them on my week', () => {
  const s = sheet();
  const st = steps(3);
  const sp = { ok: true, days: [{ date: '2026-10-15', items: [{ step: 's0', start: 1035, dur: 15 }] }, { date: '2026-10-17', items: [{ step: 's1', start: 570, dur: 15 }, { step: 's2', start: 585, dur: 15 }] }] };
  const n = s.tsNext(task({ steps: st }), ctx({ steps: st, toSpread: st, sp, f: { cap: 30, when: 'any' } }));
  assert.equal(n.foot.line, 'Up to 30 min a day, Thu to Sat. Done 4 days before it’s due.');
  assert.equal(typeof n.foot.change, 'function', 'the choices are a tap away, on the line');
  assert.equal(n.foot.gold[0], 'Put them on my week');
  n.foot.gold[1]();
  assert.deepEqual(plain(s.calls.pop()), ['spread']);
  const no = s.tsNext(task({ steps: st }), ctx({ steps: st, toSpread: st, sp: { ok: false, days: [], unplaced: ['s2'] }, f: { cap: 30 } }));
  assert.equal(no.ask, true, 'it doesn’t fit: the sheet asks, with goals-fix’s choices, before anything moves');
});

test('a step under way: Start in its first ten minutes (a timer sized to it), then Mark it done; Didn’t get to it is a normal button', () => {
  const st = steps(3);
  const now = at(TODAY, 960, 's0'), c = ctx({ steps: st, next: { s0: now }, now });
  const s = sheet({ nowMin: 965 });
  const f = s.tsNext(task({ steps: st }), c).foot;
  assert.equal(said(f), 'Now: Step 1, 15 min.');
  assert.deepEqual([f.quiet[0], f.gold[0]], ['Didn’t get to it', 'Start']);
  f.gold[1]();
  assert.deepEqual(plain(s.calls.slice(-2)), [['focus', 'Step 1', 10], ['close']], 'Start hands the step to the timer, and on a phone the sheet steps aside for it');
  const later = sheet({ nowMin: 972 }).tsNext(task({ steps: st }), c).foot;
  assert.equal(said(later), 'Now: Step 1, 3 min left.');
  assert.equal(later.gold[0], 'Mark it done', 'ten minutes in, the gold is Done');
  const noTimer = sheet({ nowMin: 962, noFocus: true }).tsNext(task({ steps: st }), c).foot;
  assert.equal(noTimer.gold[0], 'Mark it done', 'no timer on this board: Done, never a button that does nothing');
});

test('a step’s time went by: check the ones that happened, and the rest move ahead (one gold)', () => {
  const st = steps(4);
  const s = sheet();
  const one = s.tsNext(task({ steps: st, spread: { cap: 30 } }), ctx({ steps: st, missed: [{ step: 's1' }] }));
  assert.equal(one.plate, 'Step 2 went by. Check it if you did it.');
  assert.deepEqual(one.first, ['s1'], 'the step that went by comes first');
  assert.equal(one.foot.line, 'The rest move ahead, up to 30 min a day.');
  assert.equal(one.foot.gold[0], 'Find new times');
  const two = s.tsNext(task({ steps: st }), ctx({ steps: st, missed: [{ step: 's1' }, { step: 's2' }] }));
  assert.equal(two.plate, '2 steps went by. Check the ones you did.');
  assert.equal(two.foot.line, 'The rest move to the next quiet times.', 'a to-do that wasn’t spread goes to the next quiet times');
});

test('every step has a time ahead: the line says when, and there’s no gold; done says so quietly', () => {
  const st = steps(3);
  const s = sheet();
  const set = s.tsNext(task({ steps: st }), ctx({ steps: st, next: { s0: at('2026-10-16', 450, 's0'), s1: at('2026-10-17', 570, 's1'), s2: at('2026-10-18', 555, 's2') } })).foot;
  assert.equal(said(set), 'You’re set. Next: tomorrow at 7:30 am.');
  assert.equal(set.gold, undefined);
  const all = s.tsNext(task({ steps: steps(3, 3) }), ctx({ steps: steps(3, 3) })).foot;
  assert.deepEqual([all.line, all.gold[0]], ['All 3 steps done.', 'Mark it done']);
  const done = s.tsNext(task({ done: true }), ctx()).foot;
  assert.deepEqual([done.line, done.quiet[0], done.gold], ['Done.', 'Mark not done', undefined]);
});

test('a plan said in one sentence, with how far ahead of its day it’s done', () => {
  const s = sheet();
  const plan = (dates) => ({ days: dates.map((d) => ({ date: d, items: [{ dur: 15 }] })) });
  assert.equal(s.tsSpreadWords(task(), plan(['2026-10-15', '2026-10-20']), { cap: 30, when: 'any' }), 'Up to 30 min a day, Thu to Tue. Done a day before it’s due.');
  assert.equal(s.tsSpreadWords(task(), plan(['2026-10-16', '2026-10-21']), { cap: 15, when: 'evening' }), 'Up to 15 min a day in the evenings, Fri to Wed. Done the day it’s due.');
  assert.equal(s.tsSpreadWords(task({ due: null }), plan(['2026-10-16', '2026-10-17']), { cap: 30, when: 'any' }), 'Up to 30 min a day, Fri to Sat. Done by Sat.', 'no due date: where it ends, never a date it made up');
});

test('an exam, a test, or an interview keeps its day; Make it a goal only for weeks of work', () => {
  const s = sheet({ goals: true });
  ['Study for exam', 'Prep for the bar exam', 'Practice tests', 'Job interview Tuesday', 'MCAT review'].forEach((n) => assert.equal(s.tsFixedDay({ name: n }), true, n));
  ['Clean the garage', 'Sat errands', 'Clean the bar cart', 'Act on the letter'].forEach((n) => assert.equal(s.tsFixedDay({ name: n }), false, n));
  assert.equal(s.tsGoalFits(task({ name: 'Pass the bar exam', due: null })), true, 'no day yet, and the name is an exam');
  assert.equal(s.tsGoalFits(task({ name: 'Pass the bar exam', due: '2026-10-17' })), false, 'two days out: a goal is the wrong tool');
  assert.equal(s.tsGoalFits(task({ name: 'Pass the bar exam', due: '2026-11-20' })), true, 'weeks out');
  assert.equal(sheet().tsGoalFits(task({ name: 'Pass the bar exam', due: null })), false, 'a board without Goals never offers it');
});

test('the step sheet says where Didn’t get to it takes a step, before the tap', () => {
  const s = sheet();
  assert.equal(s.didntLine('Tap to move it to Sat at 9:15 am. Still done by Wednesday.'), 'Didn’t get to it moves it to Sat at 9:15 am. Still done by Wednesday.');
  assert.equal(s.didntLine('Tap and it waits for a time you pick. It doesn’t fit by Friday now.'), 'Didn’t get to it waits for a time you pick. It doesn’t fit by Friday now.');
  assert.equal(s.didntLine(''), '');
});
