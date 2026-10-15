// V11 goals, the second pass (Oct 14 night): what the feature check found, each held here by the engine.
// A commitment always wins over a goal's session or a spread step (Model.giveWay), Done early holds its day
// (Model.endSessionEarly), to-dos come before a goal's own sessions in quiet time (Model.stepSpot, spreadPlan,
// reflowTask, moveStep), only confirmed time counts as done, the morning question skips what's done and asks
// about the days nobody answered, Take it easy keeps what already happened, and the breakdown library reads
// the job a name asks for. The cases are the brother's from docs/PRODUCT-STRATEGY.md, on made up boards.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const TODAY = '2026-10-14'; // a Wednesday
const EXAM = '2027-02-24';
const names = (r) => r.steps.map((s) => s.name);
/* the sample family with the bar exam planned from today: two hours on weekdays, three on weekends */
function family(rhythm) {
  const st = D.sampleState(TODAY);
  const ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, date: EXAM, today: TODAY, parts: ex.parts, mix: ex.mix, rhythm: rhythm || { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'any', chunk: 60 } });
  st.goals.push(g);
  M.planGoal(st, g.id, TODAY, 600);
  return { st, g };
}
/* someone on their own who works 9 to 5, with lots of quiet time */
const sam = () => D.buildState({ name: 'Sam', kids: [], wake: { wd: 360, we: 420 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 } }, TODAY);
const sessionsOn = (st, g, d) => M.goalSessions(st, g.id).filter((x) => x.date === d && !x.add.skipped);
const shown = (st, d) => M.calendarDay(st, d).blocks;
const whole = (st, d) => {
  const bl = shown(st, d).slice().sort((a, b) => a.start - b.start);
  for (let i = 1; i < bl.length; i++) assert.ok(bl[i].start >= bl[i - 1].start + bl[i - 1].dur, d + ': ' + bl[i - 1].key + ' and ' + bl[i].key + ' overlap');
};
/* a session or a step under a commitment: the board would hide the commitment */
const under = (st, d) => {
  const hard = M.calendarRecords(st, d).filter((b) => (b.event || b.meeting) && !b.sleep);
  return M.calendarRecords(st, d).filter((b) => b.add && b.src && (b.src.type === 'goal' || b.src.type === 'step')).filter((a) => hard.some((h) => M.overlaps(h, a)));
};

test('a dentist added at a session’s time shows on the board, and the session makes way', () => {
  const { st, g } = family();
  const MON = '2026-10-26';
  const s = sessionsOn(st, g, MON).find((x) => x.add.start === 450);
  assert.ok(s, 'a session at 7:30 on Monday the 26th');
  st.events.push({ id: 'dentist', kind: 'timed', name: 'Dentist', icon: 'star', cat: 'family', date: MON, start: 450, dur: 60, big: true });
  assert.equal(under(st, MON).length, 1, 'before giving way the session covers the dentist');
  const r = M.giveWay(st, TODAY, 600);
  assert.equal(under(st, MON).length, 0);
  assert.ok(shown(st, MON).some((b) => b.name === 'Dentist' && b.start === 450 && b.dur === 60), 'the dentist shows, whole');
  assert.ok(!M.findAdd(st, s.add.id), 'the session left that time');
  assert.equal(r.goals.length, 1);
  assert.ok(r.message.startsWith(s.add.name + ' '), 'the toast names the session: ' + r.message);
  assert.match(r.message, /moved to|makes room/);
  assert.doesNotMatch(r.message, /[—–]|--|\b(just|simply|really|please|actually|easily)\b/);
  whole(st, MON);
  for (const d of M.range(TODAY, 21)) assert.equal(under(st, d).length, 0, d);
  // calling it again moves nothing
  const again = M.giveWay(st, TODAY, 600);
  assert.deepEqual([again.moved, again.off, again.goals, again.message], [[], [], [], '']);
});

test('a session someone placed by hand gives way to a commitment too, and one in open time stays', () => {
  const st = sam(), ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ name: 'Pass the bar exam', kind: 'exam', date: EXAM, today: TODAY, parts: ex.parts, mix: true, rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 60, we: 60, when: 'any', chunk: 60 } });
  st.goals.push(g);
  M.planGoal(st, g.id, TODAY, 600);
  const THU = '2026-10-15', s = sessionsOn(st, g, THU)[0];
  assert.ok(M.moveAdd(st, s.add.id, THU, 19 * 60).ok);
  assert.equal(M.findAdd(st, s.add.id).add.pinned, true);
  assert.deepEqual(M.giveWay(st, TODAY, 600).goals, [], 'nothing asks for its time');
  st.meetings.push({ id: 'club', name: 'Book club', days: [4], start: 19 * 60, dur: 60 });
  const r = M.giveWay(st, TODAY, 600);
  assert.equal(r.goals.length, 1);
  assert.ok(!M.findAdd(st, s.add.id), 'the pinned session made way for the meeting');
  assert.ok(sessionsOn(st, g, THU).reduce((a, x) => a + x.add.dur, 0) <= 60, 'Thursday stays under its hour');
  whole(st, THU);
});

test('a trip added after planning: no session or spread step stays on its days', () => {
  const st = sam(), ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ name: 'Pass the bar exam', kind: 'exam', date: EXAM, today: TODAY, parts: ex.parts, mix: true, rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'any', chunk: 60 } });
  st.goals.push(g);
  M.planGoal(st, g.id, TODAY, 600);
  st.tasks.push({ id: 'room', name: 'Clean my room', group: 'home', icon: 'broom', cat: 'home', due: '2026-10-24', dur: null, done: false, repeat: null, steps: M.breakdown('Clean my room', {}, D).steps.map((x, i) => ({ id: 'r' + i, name: x.name, dur: x.dur, done: false })) });
  M.applySpread(st, 'room', M.spreadPlan(st, 'room', {}, TODAY, 600));
  const trip = ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'];
  assert.ok(trip.some((d) => sessionsOn(st, g, d).length), 'sessions were planned on those days');
  st.events.push({ id: 'la', kind: 'trip', name: 'LA', icon: 'plane', date: '2026-10-22', end: '2026-10-26', leave: 450, back: 1020 });
  const r = M.giveWay(st, TODAY, 600);
  for (const d of trip) {
    assert.equal(sessionsOn(st, g, d).length, 0, d + ': no sessions on a trip day');
    assert.equal(((st.dates[d] && st.dates[d].adds) || []).filter((a) => a.src && a.src.type === 'step').length, 0, d + ': no spread steps either');
  }
  assert.ok(r.goals[0].left.length > 1);
  assert.match(r.message, /^Pass the bar exam: \d+(\.5)? h moved off the trip days\./);
  // the steps that were on the trip found times before it, by the day they're due
  const pl = M.placements(st).get('room') || [];
  assert.ok(pl.every((p) => p.date < '2026-10-22' || p.date > '2026-10-26'));
  // and the morning after a trip day isn't a question about it
  assert.ok(!M.goalCheckIn(st, '2026-10-27').some((x) => trip.includes(x.date)));
});

test('Done early on a session: what happened counts, and the rest goes to later days, never back onto today', () => {
  const st = sam(), ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ name: 'Pass the bar exam', kind: 'exam', date: EXAM, today: TODAY, parts: ex.parts, mix: true, rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 120, when: 'any', chunk: 60 } });
  st.goals.push(g);
  M.planGoal(st, g.id, TODAY, 600);
  const s = sessionsOn(st, g, TODAY).find((x) => x.add.dur === 60);
  const before = sessionsOn(st, g, TODAY).length;
  const r = M.endSessionEarly(st, TODAY, 'add:' + s.add.id, s.add.start + 30, TODAY, s.add.start + 30);
  assert.equal(r.ok, true);
  assert.equal(r.back, 30);
  const a = M.findAdd(st, s.add.id).add;
  assert.equal(a.dur, 30, 'it ends at the last quarter hour');
  assert.equal(a.done, true, 'what happened counts as done');
  assert.equal(sessionsOn(st, g, TODAY).length, before, 'nothing new on today: the freed half hour stays open');
  assert.ok(!sessionsOn(st, g, TODAY).some((x) => x.add.start === s.add.start + 30));
  assert.equal(r.message, '30 min goes to the days ahead.');
  assert.equal(M.goalProgress(st, g, TODAY, s.add.start + 30).doneMin, 30);
  // planned again later today, the day stays as it is
  M.planGoal(st, g.id, TODAY, s.add.start + 45);
  assert.ok(!sessionsOn(st, g, TODAY).some((x) => x.add.start === s.add.start + 30));
});

test('only time someone confirmed counts as done; the rest is unconfirmed until the morning question', () => {
  const { st, g } = family();
  const later = '2026-10-19';
  const p = M.goalProgress(st, g, later, 420);
  assert.equal(p.doneMin, 0, 'five days went by and nobody said anything');
  const went = M.goalSessions(st, g.id).filter((x) => x.date < later).reduce((a, x) => a + x.add.dur, 0);
  assert.ok(went > 0);
  assert.equal(p.unconfirmedMin, went);
  assert.equal(p.leftMin, p.totalMin - went, 'the plan counts it as having happened, so nothing is planned twice');
  // the morning question asks about every day of the last week nobody answered, newest first
  const ask = M.goalCheckIn(st, later);
  assert.deepEqual(ask.map((x) => x.date), ['2026-10-18', '2026-10-17', '2026-10-16', '2026-10-15', '2026-10-14'].filter((d) => sessionsOn(st, g, d).length));
  // a session marked Done isn't asked about, and No leaves it done
  const sun = sessionsOn(st, g, '2026-10-18');
  sun[0].add.done = true;
  const ask2 = M.goalCheckIn(st, later).find((x) => x.date === '2026-10-18');
  assert.equal(ask2.min, sun.slice(1).reduce((a, x) => a + x.add.dur, 0), 'only what’s still waiting for a word');
  const no = M.answerCheckIn(st, g.id, '2026-10-18', 'no', { today: later, nowMin: 420 });
  assert.equal(no.ok, true);
  assert.equal(M.findAdd(st, sun[0].add.id).add.skipped, undefined, 'No never skips a session marked done');
  assert.equal(M.findAdd(st, sun[0].add.id).add.done, true);
  assert.ok(sun.slice(1).every((x) => M.findAdd(st, x.add.id).add.skipped));
  assert.equal(M.goalProgress(st, g, later, 420).doneMin, sun[0].add.dur);
  // some of it: the minutes that happened are done and confirmed
  const sat = sessionsOn(st, g, '2026-10-17'), satMin = sat.reduce((a, x) => a + x.add.dur, 0);
  M.answerCheckIn(st, g.id, '2026-10-17', 'some', { today: later, nowMin: 420, minutes: 60 });
  assert.equal(M.goalProgress(st, g, later, 420).doneMin, sun[0].add.dur + 60);
  assert.ok(satMin > 60);
});

test('Take it easy in the afternoon keeps the morning’s session: it already happened', () => {
  const st = sam(), ex = M.goalForExam('Pass the bar exam', D);
  const g = M.newGoal({ name: 'Pass the bar exam', kind: 'exam', date: EXAM, today: TODAY, parts: ex.parts, mix: true, rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 120, when: 'any', chunk: 60 } });
  st.goals.push(g);
  M.planGoal(st, g.id, TODAY, 8 * 60);
  const all = sessionsOn(st, g, TODAY), morning = all.filter((x) => x.add.start < 15 * 60), rest = all.filter((x) => x.add.start >= 15 * 60);
  assert.ok(morning.length && rest.length, 'one this morning, one this evening');
  morning.forEach((x) => { x.add.done = true; });
  const done = M.goalProgress(st, g, TODAY, 15 * 60).doneMin;
  assert.ok(done > 0);
  const r = M.applyPreset(st, TODAY, D.PRESETS.find((p) => p.id === 'easy'), st.palette, { today: TODAY, nowMin: 15 * 60 });
  assert.equal(r.goals, rest.length, 'only the ones still to come go back to the plan');
  assert.deepEqual(sessionsOn(st, g, TODAY).map((x) => x.add.id), morning.map((x) => x.add.id));
  assert.equal(M.goalProgress(st, g, TODAY, 15 * 60).doneMin, done, 'the done time stays done');
});

test('to-dos come first: when a goal holds every quiet minute, a missed step takes the next day, and the goal says so', () => {
  const { st, g } = family({ days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'any', chunk: 60 });
  const FRI = '2026-10-16';
  assert.deepEqual(M.quietWindows(st, FRI, 'any', 0), [], 'the goal fills Friday’s quiet time');
  st.tasks.push({ id: 'room', name: 'Clean my room', group: 'home', icon: 'broom', cat: 'home', due: '2026-10-20', dur: null, done: false, repeat: null, steps: M.breakdown('Clean my room', {}, D).steps.map((x, i) => ({ id: 'r' + i, name: x.name, dur: x.dur, done: false })) });
  const plan = M.spreadPlan(st, 'room', {}, TODAY, 600);
  assert.equal(plan.ok, true, 'the steps fit, in the goal’s time: ' + plan.message);
  assert.ok(plan.gave.length === 1 && plan.gave[0].name === 'Pass the bar exam' && plan.gave[0].min > 0);
  assert.match(plan.message, / It takes \d+ min of Pass the bar exam’s time, which goes to the days ahead\.$|It takes \d+(\.5)? h of Pass the bar exam’s time, which goes to the days ahead\.$/);
  const out = {};
  assert.equal(M.applySpread(st, 'room', plan, {}, out), 6);
  assert.equal(out.goals.length, 1);
  for (const d of M.range(TODAY, 7)) {
    whole(st, d);
    const steps = ((st.dates[d] && st.dates[d].adds) || []).filter((a) => a.src && a.src.task === 'room');
    for (const a of steps) assert.ok(!sessionsOn(st, g, d).some((x) => M.overlaps(x.add, a)), d + ': nothing on top of a step');
  }
  // the steps before Friday happened; Friday's didn't: it goes to Saturday, not weeks later
  const fri = (st.dates[FRI].adds || []).find((a) => a.src && a.src.task === 'room');
  st.tasks.find((t) => t.id === 'room').steps.forEach((x) => { if (x.id < fri.src.id) x.done = true; });
  const r = M.reflowTask(st, 'room', '2026-10-17', 420);
  const moved = r.moved.find((m) => m.step === fri.src.id);
  assert.ok(moved && moved.to === '2026-10-17', JSON.stringify(r.moved));
  assert.match(r.message, /moved to today/);
  assert.ok(Array.isArray(r.goals));
  for (const d of M.range('2026-10-17', 4)) whole(st, d);
});

test('Didn’t get to it on a step of a to-do that wasn’t spread: the next quiet time, the goal making room if it has to', () => {
  const { st, g } = family();
  st.tasks.push({ id: 'card', name: 'Buy a birthday card', group: 'home', icon: 'gift', cat: 'family', due: '2026-10-30', dur: null, done: false, repeat: null, steps: [{ id: 'c1', name: 'Pick out a card', dur: 10, done: false }] });
  const THU = '2026-10-15';
  M.placeAdd(st, THU, { name: 'Pick out a card', cat: 'family', icon: 'gift', dur: 15, src: { type: 'step', task: 'card', id: 'c1' } }, 12 * 60);
  const a = M.placements(st).get('card')[0].add;
  const pv = M.moveStep(st, a.id, THU, 12 * 60 + 5, { preview: true });
  assert.equal(pv.ok, true);
  assert.equal(M.findAdd(st, a.id).date, THU, 'a preview changes nothing');
  const r = M.moveStep(st, a.id, THU, 12 * 60 + 5);
  assert.equal(r.ok, true);
  assert.equal(r.date, '2026-10-16', 'the next day');
  assert.equal(M.findAdd(st, a.id).add.pinned, undefined, 'the app moved it');
  whole(st, r.date);
  assert.ok(r.goals.length === 1 && /Pass the bar exam/.test(r.message), r.message);
});

test('a step that stops fitting is named, and asking again agrees: it waits behind the steps the plan put ahead of it', () => {
  // the brother's room, Wednesday to Monday at 15 minutes a day; Wednesday's step doesn't happen
  const st = D.sampleState(TODAY);
  st.tasks.push({ id: 'room', name: 'Clean my room', group: 'home', icon: 'broom', cat: 'home', due: '2026-10-19', dur: null, done: false, repeat: null, steps: M.breakdown('Clean my room', {}, D).steps.map((x, i) => ({ id: 'r' + i, name: x.name, dur: x.dur, done: false })) });
  const plan = M.spreadPlan(st, 'room', {}, TODAY, 420);
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.days.map((d) => d.date), M.range(TODAY, 6), 'a step a day, Wednesday to Monday');
  M.applySpread(st, 'room', plan);
  // (Didn't get to it counts the block as over: its end, 7:45)
  const r = M.reflowTask(st, 'room', TODAY, 465);
  assert.deepEqual(r.short, ['Vacuum']);
  assert.equal(r.message, 'Pick up the floor moved to tomorrow. Vacuum doesn’t fit by Monday now.');
  // spreading what's left says the same, though Wednesday evening is open: Vacuum comes after Dust, on Monday
  const again = M.spreadPlan(st, 'room', {}, TODAY, 465);
  assert.equal(again.ok, false);
  assert.deepEqual(again.unplaced, r.unplaced);
  // and a little more each day fits it there, after Dust
  const more = M.spreadPlan(st, 'room', { cap: 30 }, TODAY, 465);
  assert.equal(more.ok, true);
  assert.deepEqual(more.days.map((d) => d.date), ['2026-10-19']);
  // a step placed by hand doesn't hold the rest behind it
  const hand = D.sampleState(TODAY);
  hand.tasks.push(JSON.parse(JSON.stringify(st.tasks.find((t) => t.id === 'room'))));
  hand.tasks[hand.tasks.length - 1].spread = null;
  const pinned = M.placeAdd(hand, '2026-10-17', { name: 'Make the bed', cat: 'home', icon: 'broom', dur: 15, src: { type: 'step', task: 'room', id: 'r2' } }, 600).add;
  assert.equal(pinned.pinned, true);
  const p2 = M.spreadPlan(hand, 'room', {}, TODAY, 420);
  assert.ok(p2.days.some((d) => d.date < '2026-10-17' && d.items.some((x) => x.step === 'r3')), 'Clear the desk can come before the bed someone placed');
});

test('the library reads the job a name asks for before what it’s about', () => {
  const m = (n) => M.breakdown(n, {}, D).match;
  assert.equal(m('Gift for Jill’s birthday party'), 'gift', 'a gift for a party is buying a gift');
  assert.equal(m('Go to a birthday party'), 'party-guest', 'going to a party is an RSVP and a gift');
  assert.equal(m('Go to Jill’s birthday party'), 'party-guest');
  assert.equal(m('Plans for Jill’s birthday'), 'celebrate');
  assert.equal(m('Book travel for Jill’s birthday'), 'book-travel');
  assert.equal(m('Gift for Sam and Lee’s wedding'), 'registry-gift');
  assert.equal(m('Something to wear to Sam and Lee’s wedding'), 'outfit');
  assert.equal(m('Book travel for Sam and Lee’s wedding'), 'book-travel');
  // a wedding's getting ready to-dos don't repeat each other
  const lists = ['Gift for Sam and Lee’s wedding', 'Something to wear to Sam and Lee’s wedding', 'Book travel for Sam and Lee’s wedding'].map((n) => names(M.breakdown(n, {}, D)));
  for (let i = 0; i < lists.length; i++) for (let j = i + 1; j < lists.length; j++) assert.deepEqual(lists[i].filter((x) => lists[j].includes(x) && !/^Book it$/.test(x)), [], 'no step twice');
  const appt = names(M.breakdown('Make a doctor appointment', {}, D));
  assert.ok(!appt.some((x) => /^Go to/.test(x)), 'making an appointment isn’t going to it');
  assert.ok(appt.some((x) => /book a time/i.test(x)));
  const card = names(M.breakdown('Buy a birthday card', {}, D));
  assert.ok(card.some((x) => /^Buy it$|buy/i.test(x)), 'buying a card has a step for buying it');
  assert.ok(!names(M.breakdown('Jill’s birthday', {}, D)).some((x) => x === 'Call on the day'), 'no step claims a day it may not land on');
  assert.deepEqual(names(M.breakdown('Text Sam back', {}, D)), ['Write the text to Sam', 'Send it']);
  assert.ok(!names(M.breakdown('Book travel for Visit to Denver', {}, D)).some((x) => /from travel/.test(x)));
  assert.equal(m('Christmas gift for Kim'), 'gift');
  assert.equal(m('Book a cleaning for Robin'), 'dentist');
});

test('CFA Level II and III have their own parts and names; the errands around an exam are to-dos', () => {
  const two = M.goalForExam('CFA Level II', D), three = M.goalForExam('CFA Level III', D), one = M.goalForExam('CFA Level I', D);
  assert.equal(two.exam, 'CFA Level II');
  assert.equal(three.exam, 'CFA Level III');
  assert.equal(one.exam, 'CFA Level I');
  assert.notDeepEqual(two.parts.map((p) => p.name), one.parts.map((p) => p.name));
  assert.ok(three.parts.some((p) => /Asset Allocation/.test(p.name)));
  assert.equal(M.goalForExam('CFA L2', D).exam, 'CFA Level II');
  assert.equal(two.mix, true, 'an exam’s parts take turns');
  assert.equal(M.goalForExam('Run a half marathon', D).mix, true, 'so do a race’s');
  assert.equal(M.goalForExam('Finish my thesis', D).mix, false, 'a thesis goes in order');
  for (const n of ['Pay the CFA exam fee', 'Register for the bar exam', 'Grade the exams', 'Sign up for the 10k', 'Book the GRE'])
    assert.equal(M.looksLikeGoal(n, D), false, n);
  for (const n of ['Pass the bar exam', 'Study for the CFA', 'CFA Level II', 'Get certified'])
    assert.equal(M.looksLikeGoal(n, D), true, n);
});

test('a part can’t take more than a thousand hours', () => {
  const g = M.newGoal({ name: 'X', parts: [{ name: 'Huge', min: 99999 * 60 }] });
  assert.equal(g.parts[0].min, 60000);
});

test('the time a goal holds that a to-do could take is counted beside the open time', () => {
  const { st } = family();
  const c = M.capacity(st, TODAY, 7, TODAY, 600);
  assert.ok(c.goals > 0, 'the goal holds quiet time this week');
  assert.ok(Number.isFinite(c.room) && Number.isFinite(c.need));
});
