// V11 (Oct 14), the iPhone Duo and phones on their side (docs/APPLE-READINESS.md): which windows get the
// phone's own views (phoneWidth, phoneShort, phoneSize), and what comes across when a window crosses that
// line, opening or closing the Duo (crossPhone, deskAt): the day, a picked block, an open panel, and a running
// reset. The functions are cut out of board/src/app.js whole and run on a stand-in window and view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M } from './v11-rig.mjs';

const today = '2026-10-14'; // a Wednesday

/* the size rules, on a window of w by h on a screen of sw by sh (an iPhone's screen says its upright size) */
function sizes(w, h, sw, sh, o) {
  const script = `
    const FEEL = ${!(o && o.old)};
    const deskAlways = ${!!(o && o.desk)};
    ${app('  const phoneWidth = () =>', '  function setPhone() {')}
    ({ phoneWidth, phoneShort, phoneSize });`;
  return runInNewContext(script, { window: { innerWidth: w, innerHeight: h, screen: { width: sw, height: sh } } });
}

test('the phone\'s views: upright phones, a phone on its side, the Duo folded and stood on its edge', () => {
  // the Duo folded, in Safari (its buttons and the clock in a column on the right): the width already says phone
  assert.equal(sizes(386, 580, 466, 678).phoneSize(), true);
  // the Duo stood on its edge (tent): about 584 by 362 in Safari, 678 by 466 from the Home Screen
  assert.equal(sizes(584, 362, 466, 678).phoneSize(), true);
  assert.equal(sizes(678, 466, 678, 466).phoneShort(), true, 'the Home Screen app in tent');
  // an iPhone on its side, whichever way its screen reports
  assert.equal(sizes(844, 390, 844, 390).phoneShort(), true);
  assert.equal(sizes(844, 340, 390, 844).phoneSize(), true);
  assert.equal(sizes(956, 400, 440, 956).phoneShort(), true, 'the largest iPhone on its side');
});

test('the desk: the Duo open either way up, a short laptop window, and the open Duo with its keyboard up', () => {
  assert.equal(sizes(951, 600, 669, 951).phoneSize(), false, 'open, in Safari');
  assert.equal(sizes(857, 565, 669, 951).phoneSize(), false, 'open, with Safari\'s buttons down the side');
  assert.equal(sizes(669, 880, 669, 951).phoneSize(), false, 'open, upright');
  assert.equal(sizes(1280, 460, 1440, 900).phoneSize(), false, 'a laptop window made short keeps the desk');
  assert.equal(sizes(951, 320, 669, 951).phoneSize(), false, 'a keyboard on the open Duo never swaps the desk out');
  assert.equal(sizes(1024, 440, 390, 844).phoneShort(), false, '1000 wide and up is never a phone on its side');
  // ?desk keeps the desk at any size, and a version without V11's feel keeps the old rule
  assert.equal(sizes(844, 390, 844, 390, { desk: true }).phoneSize(), false);
  assert.equal(sizes(844, 390, 844, 390, { old: true }).phoneSize(), false);
});

/* crossing the line: a stand-in for the app around crossPhone */
function crossing(view, o) {
  const cls = new Set(o && o.phoneDesk ? ['phone-desk'] : []);
  const g = { small: false };
  const script = `
    const FEEL = true, deskAlways = false, noDesk = false, devPhone = false;
    const view = __view, today = __today, nowMin = 620;
    const document = { body: { classList: { contains: (c) => __cls.has(c) } } };
    const inToday = () => view.mode === 'today';
    const boardTime = (date) => ({ date, start: nowMin });
    const phoneSize = () => __g.small;
    ${app('  /* V11: opening or closing an iPhone Duo', '  function openPhoneDesk() {')}
    ({ crossPhone, deskAt });`;
  const fns = runInNewContext(script, { M, __view: view, __today: today, __cls: cls, __g: g });
  return {
    view, cls,
    fold() { g.small = true; fns.crossPhone(); if (view.phoneDesk) cls.add('phone-desk'); else view.phone = true; },
    open() { g.small = false; fns.crossPhone(); view.phone = false; cls.delete('phone-desk'); }
  };
}
const desk = (o) => Object.assign({ mode: 'planner', zoom: 'week', focus: today, phone: false, phoneDesk: false, pick: null, sel: null, reset: null, todayOff: 0 }, o);

test('folding: the list opens on the day the desk showed; unfolding with nothing changed, the desk is as it was', () => {
  const c = crossing(desk({ zoom: 'day', focus: '2026-10-16' }));
  c.fold();
  assert.equal(c.view.todayOff, 2, 'Friday, two days on');
  c.open();
  assert.deepEqual([c.view.mode, c.view.zoom, c.view.focus], ['planner', 'day', '2026-10-16']);
  // from the week, the list opens on today, and the week comes back
  const w = crossing(desk({ zoom: 'week', focus: '2026-10-17' }));
  w.fold();
  assert.equal(w.view.todayOff, 0);
  w.open();
  assert.deepEqual([w.view.mode, w.view.zoom, w.view.focus], ['planner', 'week', '2026-10-17']);
});

test('a day picked on the phone is the day the desk opens on: Now for today, the week it is in, or the day', () => {
  const c = crossing(desk({ mode: 'today', zoom: 'day' }));
  c.fold();
  c.view.todayOff = 3; // Saturday, tapped on the list
  c.open();
  assert.deepEqual([c.view.mode, c.view.zoom, c.view.focus], ['planner', 'day', '2026-10-17']);
  c.fold();
  assert.equal(c.view.todayOff, 3, 'and folding again opens the list on Saturday');
  c.view.todayOff = 0; // back to today on the list
  c.open();
  assert.deepEqual([c.view.mode, c.view.zoom, c.view.focus], ['today', 'day', today], 'today is Now');
  // the desk was on this week: a day of it keeps the week, on that day
  const w = crossing(desk({ zoom: 'week', focus: today }));
  w.fold();
  w.view.todayOff = 2;
  w.open();
  assert.deepEqual([w.view.zoom, w.view.focus], ['week', '2026-10-16']);
});

test('a picked block opens the phone\'s own day with it still picked, and comes back to the desk as it was', () => {
  const pick = { date: '2026-10-15', key: 'tpl:evening', displayDate: '2026-10-15', displayKey: '2026-10-15:tpl:evening' };
  const c = crossing(desk({ zoom: 'week', focus: '2026-10-16', pick }));
  c.fold();
  assert.equal(c.view.phoneDesk, true);
  assert.deepEqual([c.view.mode, c.view.zoom, c.view.focus], ['planner', 'day', '2026-10-15']);
  assert.equal(c.view.pick, pick, 'still picked');
  c.open();
  assert.equal(c.view.phoneDesk, false);
  assert.equal(c.view.phoneFrom, null);
  assert.deepEqual([c.view.zoom, c.view.focus], ['week', '2026-10-16'], 'the week, as it was');
  assert.equal(c.view.pick, pick);
});

test('an open panel stays open both ways, and Now never puts it down', () => {
  const sel = { type: 'block', date: today, key: 'tpl:evening' };
  const c = crossing(desk({ mode: 'today', zoom: 'day', sel }));
  c.fold();
  assert.equal(c.view.sel, sel);
  c.open();
  assert.equal(c.view.sel, sel);
  assert.equal(c.view.mode, 'today');
});

test('a running reset keeps its step and the desk at any size: crossing changes nothing', () => {
  const reset = { week: '2026-10-11', step: 2, catchup: true };
  const c = crossing(desk({ reset }));
  c.fold();
  assert.equal(c.view.reset, reset);
  assert.equal(c.view.reset.step, 2);
  assert.equal(c.view.phoneWas, undefined, 'nothing about the list was set up');
  c.open();
  assert.deepEqual([c.view.mode, c.view.zoom, c.view.focus], ['planner', 'week', today]);
});
