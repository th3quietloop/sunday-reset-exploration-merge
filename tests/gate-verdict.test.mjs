// V11-3 (code review 8, 17): the gates' verdicts (scripts/gate/lib/verdict.mjs). The release gate says INVALID only
// for drops that missed under load; a break-it failure, a run where nothing ran, or a lost cell stays RED whatever
// the load. The unhappy gate fails a state for contrast below AA, or for contrast it couldn't measure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { verdictOf, stateFails, stateWhy } from '../scripts/gate/lib/verdict.mjs';

test('INVALID is only for drops that missed while the machine was over its load', () => {
  assert.equal(verdictOf({}), 'green');
  assert.equal(verdictOf({ peak: 99, max: 16 }), 'green', 'a green run under load stands');
  assert.equal(verdictOf({ drops: true, peak: 30, max: 16 }), 'invalid');
  assert.equal(verdictOf({ drops: true, peak: 10, max: 16 }), 'red', 'a quiet machine: the drops are real');
  assert.equal(verdictOf({ drops: true, other: true, peak: 30, max: 16 }), 'red', 'a break-it failure, nothing run, or a lost cell is never load');
  assert.equal(verdictOf({ other: true, peak: 30, max: 16 }), 'red');
  assert.equal(verdictOf({ drops: true, size: true, peak: 30, max: 16 }), 'red', 'a board too small is measured at rest');
});

test('the unhappy gate fails a state for contrast, and for contrast it couldn’t measure', () => {
  const pass = { pass: true, why: [] };
  assert.equal(stateFails(pass), false);
  assert.equal(stateFails(Object.assign({ contrast: [] }, pass)), false);
  assert.equal(stateFails(Object.assign({ contrast: [{ text: 'Hi', ratio: 3.1, need: 4.5 }] }, pass)), true);
  assert.equal(stateFails(Object.assign({ contrast: null, contrastError: 'the page went away' }, pass)), true, 'a measuring error is never a quiet pass');
  assert.equal(stateFails(Object.assign({ contrast: [{ text: 'Hi' }] }, pass), { softContrast: true }), false, '-contrast-soft only reports it');
  assert.equal(stateFails({ pass: false, why: ['x'] }), true);
  assert.equal(stateFails({ skip: 'no steps' }), true);
  assert.deepEqual(stateWhy(Object.assign({ contrast: [{}, {}], contrastError: 'gone' }, pass)), ['contrast below AA on 2 texts', 'contrast couldn’t be measured: gone']);
});
