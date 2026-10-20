// V11-2 (Russell's list, Oct 20): the clock's words keep up with the minute. V13's notes found the time in the chrome
// stuck at the moment the page opened: app.js clockTick redrew the band each minute but never told the chrome, whose
// date chip and band kicker only changed on a full render. Now clockTick calls window.SR_onMinute, and V11's chrome
// changes only those words there: no redraw, so a drag or an open panel is never touched. The parts are cut out of
// app.js and variant.js by the lines that start them and run in a small world.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { M, app, variant } from './v11-rig.mjs';

test('the date chip and the band\'s kicker take the new minute\'s words, and nothing else changes', () => {
  const nowClock = { hidden: false, textContent: '3:30 pm' }, bandKick = { isConnected: true, textContent: 'Sunday, October 18 · 3:30 pm' };
  const SR = { nowMin: 15 * 60 + 32, inToday: () => true };
  const script = `
    const nowClock = __a, bandKick = __b, M = __M;
    const Kit = { when: () => ({ title: 'Sunday, October 18' }) };
    ${variant('    window.SR_onMinute = () => {', '    tc.append(dateCtl, kinds, days);')}
    window.SR_onMinute;`;
  const window = {};
  const onMinute = runInNewContext(script, { __a: nowClock, __b: bandKick, __M: M, SR, window });
  onMinute();
  assert.equal(nowClock.textContent, '3:32 pm');
  assert.equal(bandKick.textContent, 'Sunday, October 18 · 3:32 pm');
  /* in the Planner the chip's clock is hidden and the band isn't on the page: their words are left alone */
  nowClock.hidden = true; bandKick.isConnected = false; SR.inToday = () => false; SR.nowMin += 1;
  onMinute();
  assert.equal(nowClock.textContent, '3:32 pm');
  assert.equal(bandKick.textContent, 'Sunday, October 18 · 3:32 pm');
});

test('the minute tick tells the chrome after the band, and still waits while a block is in hand', () => {
  const tick = app('  function clockTick() {', '  /* after a resize the panels reflow');
  const a = tick.indexOf('renderNow();'), b = tick.indexOf('window.SR_onMinute()');
  assert.ok(a > 0 && b > a, 'SR_onMinute comes after the band is drawn');
  assert.match(tick, /if \(FEEL && carryingNow\(\)\)/, 'a carry still holds the minute back');
  assert.doesNotMatch(tick.slice(a), /\brender\(\)/, 'no full redraw on the minute');
});
