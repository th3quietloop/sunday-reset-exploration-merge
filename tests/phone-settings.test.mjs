/* V11: Settings on the phone (docs/PHONE-REDESIGN.md, 10). Under 760 wide the list is the overview, each row saying
   how it's set (setValue): the Sunday Reset's day and time, how many goals are in play, Smart breakdowns On or Off,
   and Your data's gold dot with Back up while this browser can clear the week. Cut out of app.js and run with
   stand-ins. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M } from './v11-rig.mjs';

function world(o = {}) {
  const script = `
    const FEEL = true;
    const view = { phone: !!__o.phone };
    const phoneDay = () => false, window = { innerWidth: __o.width || 390, SR_ai: { available: () => !!__o.ai } };
    const el = (tag, cls, text) => { const e = { tag, cls, text: text || '', kids: [], append(...xs) { xs.forEach((x) => e.kids.push(x)); }, appendChild(x) { e.kids.push(x); return x; } }; Object.defineProperty(e, 'textContent', { get: () => e.text + e.kids.map((k) => (typeof k === 'string' ? k : k.textContent || '')).join(''), set: (v) => { e.text = v; e.kids = []; } }); return e; };
    const resetAtNow = () => __o.reset || { day: 0, min: 19 * 60 };
    const Cloud = { on: !!__o.sync }, remindPrefs = () => ({ on: !!__o.remind });
    const state = { calendars: __o.calendars || [] };
    const shownGoals = () => __o.goals || [], liveGoal = (g) => !!g.live;
    const keepAtRisk = () => !!__o.risk, Store = { savedAt: __o.saved ? 1 : 0 };
    ${app('  /* Settings as a phone has it:', '  /* a line in a list that goes somewhere:')}
    ({ narrowSettings, setValue });`;
  return runInNewContext(script, { __o: o, M });
}
const said = (v) => (v ? v.textContent.replace(/ /g, ' ') : null);

test('on a phone each row says how it’s set, in a word or two, and only when there’s something to say', () => {
  const w = world({ phone: true, ai: true, goals: [{ live: true }, { live: false }] });
  assert.equal(w.narrowSettings(), true);
  assert.equal(said(w.setValue('reset')), 'Sun 7 pm');
  assert.equal(said(world({ reset: { day: 6, min: 9 * 60 } }).setValue('reset')), 'Sat 9 am');
  assert.equal(said(w.setValue('smart')), 'On');
  assert.equal(said(world().setValue('smart')), 'Off');
  assert.equal(said(w.setValue('goals')), '1', 'goals in play, not the ones whose date went by');
  assert.equal(world().setValue('goals'), null, 'no goals: nothing to say');
  assert.equal(world().setValue('calendars'), null);
  assert.equal(said(world({ calendars: [{}, {}] }).setValue('calendars')), '2');
  assert.equal(world().setValue('you'), null, 'a page with no one word to say says nothing');
});

test('Your data wears a gold dot and Back up only while this browser can clear the week', () => {
  const v = world({ risk: true, saved: true }).setValue('data');
  assert.equal(said(v), 'Back up');
  assert.equal(v.kids[0].cls, 'c-set-dot');
  assert.equal(world({ risk: true, saved: false }).setValue('data'), null, 'nothing saved yet: nothing to keep');
  assert.equal(world({ risk: false, saved: true }).setValue('data'), null);
});

test('the list and a page take turns under 760 wide; a wide window keeps its two panes', () => {
  assert.equal(world({ width: 700 }).narrowSettings(), true);
  assert.equal(world({ width: 1024 }).narrowSettings(), false);
});
