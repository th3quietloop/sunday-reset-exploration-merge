import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/model.js';

const today = '2026-10-13';
const overlapsAny = (blocks) => {
  const s = [...blocks].sort((a, b) => a.start - b.start);
  for (let i = 1; i < s.length; i++) if (s[i].start < s[i - 1].start + s[i - 1].dur) return [s[i - 1], s[i]];
  return null;
};

test('sample builds and no day overlaps', () => {
  const st = M.sampleState(today);
  for (let i = -3; i < 30; i++) {
    const d = M.addDays(today, i);
    assert.equal(overlapsAny(M.dayOf(st, d).blocks), null, d);
  }
});

test('dropping into Work cuts a hole, moving it out heals it', () => {
  const st = M.sampleState(today);
  const d = M.addDays(today, 7);
  const id = M.addBlock(st, d, { name: 'Deep work', cat: 'work', icon: 'book', dur: 60 }, 9 * 60);
  assert.ok(id);
  const day = M.dayOf(st, d);
  assert.equal(day.blocks.filter((b) => b.name === 'Work').length, 3);
  assert.ok(M.moveBlock(st, d, id, M.addDays(d, 1), 18 * 60));
  assert.equal(M.dayOf(st, d).blocks.filter((b) => b.name === 'Work').length, 2);
  assert.equal(overlapsAny(M.dayOf(st, M.addDays(d, 1)).blocks), null);
});

test('locked blocks never move', () => {
  const st = M.sampleState(today);
  const d = M.addDays(today, 7);
  const lockedBefore = M.dayOf(st, d).blocks.filter((b) => b.fixed).map((b) => b.start + b.id);
  M.addBlock(st, d, { name: 'Long thing', cat: 'yours', icon: 'star', dur: 120 }, 8 * 60);
  const lockedAfter = M.dayOf(st, d).blocks.filter((b) => b.fixed).map((b) => b.start + b.id);
  assert.deepEqual(lockedAfter, lockedBefore);
  assert.equal(overlapsAny(M.dayOf(st, d).blocks), null);
});

test('600 random moves keep every day whole', () => {
  const st = M.sampleState(today);
  let seed = 3;
  const r = (n) => { seed = (seed * 16807) % 2147483647; return Math.floor((seed / 2147483647) * n); };
  for (let i = 0; i < 600; i++) {
    const d = M.addDays(today, r(7));
    const day = M.dayOf(st, d);
    const movable = day.blocks.filter((b) => !b.fixed);
    const op = r(4);
    if (op === 0 && movable.length) M.moveBlock(st, d, movable[r(movable.length)].id, M.addDays(today, r(7)), 360 + r(60) * 15);
    else if (op === 1) M.addBlock(st, d, { name: 'X', cat: 'yours', icon: 'star', dur: 15 * (1 + r(8)) }, 360 + r(60) * 15);
    else if (op === 2 && movable.length) M.resizeBlock(st, d, movable[r(movable.length)].id, 15 * (1 + r(12)));
    else M.applyKind(st, d, ['usual', 'focus', 'rest', 'people', 'easy', 'empty', 'creative', 'workout'][r(8)]);
    for (let k = 0; k < 7; k++) {
      const bl = M.dayOf(st, M.addDays(today, k)).blocks;
      assert.equal(overlapsAny(bl), null, `step ${i}`);
      assert.ok(bl.every((b) => b.start >= 0 && b.start + b.dur <= 1440 && b.dur >= 15), `bounds at ${i}`);
      assert.equal(new Set(bl.map((b) => b.id)).size, bl.length, `ids at ${i}`);
    }
  }
});

test('plan to dos finds times before they are due', () => {
  const st = M.sampleState(today);
  const placed = M.planTodos(st, today);
  assert.ok(placed.length >= 3);
  for (const p of placed) if (p.todo.due) assert.ok(p.date <= p.todo.due);
});

test('clock words', () => {
  assert.equal(M.clock(720), 'noon');
  assert.equal(M.clock(450), '7:30 am');
  assert.equal(M.clock(1080), '6 pm');
  assert.equal(M.span(90), '1 h 30 min');
});
