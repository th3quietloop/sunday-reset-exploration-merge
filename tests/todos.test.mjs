// V11: where a to-do stands (Model.taskPlan, one definition for every place that shows one), what's
// due soon, and what the reset counts for the week it plans (weekCounts in app.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appRig, M, D } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday
const ws = M.weekStart(today); // Sunday, Oct 11
const at = (date, start, dur, step) => ({ date, add: { start, dur }, step: step || null });
const todo = (steps, extra) => Object.assign({ id: 't1', name: 'Clear out the garage', due: '2026-10-17', done: false, steps: (steps || []).map(([id, dur, done]) => ({ id, name: id, dur, done: !!done })) }, extra || {});

test('a step checked off keeps its time from planning the steps still open', () => {
  // the first step was done yesterday at its time; the second has no time yet
  const t = todo([['sort', 60, true], ['drop', 30]]);
  const p = M.taskPlan(t, [at('2026-10-13', 600, 60, 'sort')], today, 600);
  assert.equal(p.status, 'open', 'not missed: the time that went by was the done step’s');
  assert.equal(p.left, 30, 'what still needs a time is the open step');
  // a done step timed later doesn't plan the open one either
  assert.equal(M.taskPlan(t, [at('2026-10-16', 600, 60, 'sort')], today, 600).status, 'open');
  // the open step with a time to come: planned
  assert.equal(M.taskPlan(t, [at('2026-10-13', 600, 60, 'sort'), at('2026-10-16', 600, 30, 'drop')], today, 600).status, 'planned');
});

test('with every step checked, their times still count as before', () => {
  const t = todo([['sort', 60, true], ['drop', 30, true]]);
  assert.equal(M.taskPlan(t, [at('2026-10-16', 600, 60, 'sort')], today, 600).status, 'planned');
});

test('planned, partial, and missed', () => {
  const t = todo([['sort', 60], ['drop', 30]]);
  const part = M.taskPlan(t, [at('2026-10-15', 600, 60, 'sort')], today, 600);
  assert.equal(part.status, 'partial');
  assert.deepEqual([part.open, part.timed, part.left], [2, 1, 30]);
  assert.equal(M.taskPlan(t, [at('2026-10-15', 600, 90)], today, 600).status, 'planned', 'a time for the whole thing plans every step');
  assert.equal(M.taskPlan(t, [at('2026-10-13', 600, 60, 'sort')], today, 600).status, 'missed', 'its only time went by');
  assert.equal(M.taskPlan(t, [], today, 600).status, 'open');
  assert.equal(M.taskPlan(Object.assign({}, t, { done: true }), [], today, 600).status, 'done');
});

test('a time earlier today counts as gone by once it has ended', () => {
  const t = todo([], { dur: 30 });
  const where = [at(today, 540, 30)];
  assert.equal(M.taskPlan(t, where, today, 9 * 60 + 10).status, 'planned', 'still going at 9:10');
  assert.equal(M.taskPlan(t, where, today, 10 * 60).status, 'missed', 'over at 10');
});

test('the deadline is its own fact: planned and still late', () => {
  const t = todo([], { dur: 30, due: '2026-10-15' });
  const late = M.taskPlan(t, [at('2026-10-16', 600, 30)], today, 600);
  assert.equal(late.status, 'planned');
  assert.equal(late.ends, '2026-10-16');
  assert.equal(late.after, true);
  assert.equal(M.taskPlan(t, [at('2026-10-15', 600, 30)], today, 600).after, false);
  // dueSoon keeps the late one and lets the one on time go
  const st = D.sampleState(today);
  st.tasks = [Object.assign({}, t, { id: 'late' }), Object.assign({}, t, { id: 'ontime' })];
  st.dates['2026-10-16'] = { adds: [{ id: 'a1', name: 'x', cat: 'yours', icon: 'star', start: 600, dur: 30, src: { type: 'task', id: 'late' } }] };
  st.dates['2026-10-15'] = { adds: [{ id: 'a2', name: 'x', cat: 'yours', icon: 'star', start: 600, dur: 30, src: { type: 'task', id: 'ontime' } }] };
  assert.deepEqual(M.dueSoon(st, today, 7, 600).map((x) => x.task.id), ['late']);
});

test('"this week" in the reset is the week it plans, Sunday to Saturday; the rolling list is the next 7 days', () => {
  const st = D.sampleState(today);
  st.tasks = [
    { id: 'sat', name: 'Due Saturday', due: '2026-10-17', done: false, dur: 30, steps: [] },
    { id: 'mon', name: 'Due next Monday', due: '2026-10-19', done: false, dur: 30, steps: [] },
    { id: 'gone', name: 'Was due Monday', due: '2026-10-12', done: false, dur: 30, steps: [] },
    { id: 'far', name: 'Due in a month', due: '2026-11-14', done: false, dur: 30, steps: [] }
  ];
  const r = appRig(st, today, 600);
  const thisWeek = r.weekCounts(ws).unplaced.map((x) => x.task.id);
  assert.deepEqual(thisWeek, ['gone', 'sat'], 'what is due by Saturday, and what is already late');
  const next7 = M.dueSoon(st, today, 7, 600).map((x) => x.task.id);
  assert.deepEqual(next7, ['gone', 'sat', 'mon'], 'Next 7 days reaches into next week');
  // planning next week counts next week's, and what's still due before it
  assert.deepEqual(r.weekCounts('2026-10-18').unplaced.map((x) => x.task.id), ['gone', 'sat', 'mon']);
});

test('the week counts a to-do once, however many of its steps are placed', () => {
  const st = D.sampleState(today);
  const step = (id, step, date, start) => ({ id, name: step, cat: 'home', icon: 'box', start, dur: 30, src: { type: 'step', task: 'garage', id: step } });
  st.dates['2026-10-15'] = { adds: [step('g1', 'garage-s1', '2026-10-15', 1140)] };
  st.dates['2026-10-16'] = { adds: [step('g2', 'garage-s2', '2026-10-16', 1140)] };
  const r = appRig(st, today, 600);
  const before = appRig(D.sampleState(today), today, 600).weekCounts(ws).todos;
  assert.equal(r.weekCounts(ws).todos, before + 1);
});

test('a to-do timed after it is due is counted as late, not as needing a time', () => {
  const st = D.sampleState(today);
  st.tasks = [{ id: 'x', name: 'Return the library books', due: '2026-10-15', done: false, dur: 30, steps: [] }];
  st.dates['2026-10-16'] = { adds: [{ id: 'a1', name: 'Return the library books', cat: 'home', icon: 'book', start: 600, dur: 30, src: { type: 'task', id: 'x' } }] };
  const c = appRig(st, today, 600).weekCounts(ws);
  assert.deepEqual(c.unplaced.map((x) => x.task.id), []);
  assert.deepEqual(c.lateTimes.map((x) => x.task.id), ['x']);
});

test('nights still open are from today on; leftovers and skipping are decided', () => {
  const st = D.sampleState(today);
  st.dinners['2026-10-16'] = { name: '', cook: 'skip', items: [] };
  const c = appRig(st, today, 600).weekCounts(ws);
  // Sunday has a Dinner block and nothing decided, but it's over; Saturday is still open
  assert.deepEqual(c.openNights, ['2026-10-17']);
  assert.equal(c.dinners, 7);
  assert.equal(c.planned, 5, 'Mon to Thu from the sample, and Friday skipped');
});
