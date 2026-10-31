// V11 Halloween, the desk's motion (Stageshow D1 and D2, and Russell's calls on the audit): the day header's number
// rolls only when the words either side stay the same, lined up on its point; the swing's caps come down; no ring of
// dust; the week's outline jumps; counts roll and switches slide on the Halloween page only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const SCENE = readFileSync(new URL('../board/src/scene.js', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../board/src/app.js', import.meta.url), 'utf8');
const VARIANT = readFileSync(new URL('../variants/corners11/variant.js', import.meta.url), 'utf8');
function cut(src, from, to, name) {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  assert.ok(a >= 0, name + ': lost the marker ' + JSON.stringify(from.trim()));
  assert.ok(b > a, name + ': lost the end marker ' + JSON.stringify(to.trim()));
  return src.slice(a, b);
}
const ROLL = cut(SCENE, '  /* V11 Halloween (Stageshow, D1): when a block lands or is stretched', '  /* a fact\'s words with its number t seconds into its roll', 'board/src/scene.js');
const R = runInNewContext(ROLL + '\n({ rollPair, rollEase, rollAlign, rollLen, ROLL_S, ROLL_GAP, ROLL_BEAT });', { Math, Number, String });

test('the header rolls a number only when the words either side stay put', () => {
  assert.deepEqual({ ...R.rollPair('4.5 h to yourself', '6.5 h to yourself') }, { pre: '', post: ' h to yourself', from: '4.5', to: '6.5' });
  assert.equal(R.rollPair('1 h to yourself', '1 h to yourself'), null, 'the same words: nothing to roll');
  assert.equal(R.rollPair('1 to-do due', '2 to-dos due'), false, 'a word that changed too is drawn new, not rolled');
  assert.equal(R.rollPair('Dinner open', 'Dinner: Tacos'), false);
  assert.deepEqual({ ...R.rollPair('Overlap at 5:30 pm', 'Overlap at 6:30 pm') }, { pre: 'Overlap at ', post: ':30 pm', from: '5', to: '6' });
});

test('a roll lines its two numbers up on the point, and counts only the digits that change', () => {
  assert.deepEqual([...R.rollAlign({ from: '3', to: '3.5' })], ['3  ', '3.5'], '3 stays still, the half opens beside it');
  assert.deepEqual([...R.rollAlign({ from: '9.5', to: '10.5' })], [' 9.5', '10.5']);
  assert.equal(R.rollLen({ from: '4.5', to: '6.5' }), 1);
  assert.equal(R.rollLen({ from: '9.5', to: '10.5' }), 2);
  assert.equal(R.rollLen({ from: '3', to: '3.5' }), 2);
});

test('the roll\'s curve is the page\'s (0.45, 0, 0.1, 1): a slow start, most of the way by the middle, and it lands', () => {
  assert.equal(R.rollEase(0), 0);
  assert.equal(R.rollEase(1), 1);
  assert.ok(R.rollEase(0.1) < 0.1, 'a slow start');
  assert.ok(R.rollEase(0.5) > 0.6, 'most of the way by the middle');
  for (let k = 0.05; k < 1; k += 0.05) assert.ok(R.rollEase(k) >= R.rollEase(k - 0.05), 'it never goes back');
  assert.ok(R.ROLL_S === 0.3 && R.ROLL_BEAT === 0.25, '300 ms a digit, a beat of 250 ms after the landing');
});

test('Russell\'s calls on the audit are built on the Halloween page only', () => {
  assert.match(SCENE, /if \(HW\) Object\.assign\(HAND_TUNE, \{ capRoll: 8, capPitch: 5, capYaw: 4 \}\);/, 'the swing caps come down to 8, 5, 4');
  assert.match(SCENE, /capRoll: 14, capPitch: 9, capYaw: 7/, 'V11-2 keeps 14, 9, 7');
  assert.match(SCENE, /if \(FEEL\) \{ if \(!HW\) ringAt\(m\); flecks\(m\); \}/, 'no ring of dust on the Halloween page');
  assert.match(SCENE, /if \(!was \|\| reduced \|\| \(HW && g === drag\.ghost\)\)/, 'the week\'s outline jumps from slot to slot');
  assert.match(SCENE, /if \(HW\) stepHeadRoll\(dt\);/, 'the header roll steps with the desk, and sets moving while it runs');
  assert.match(cut(SCENE, '  function stepHeadRoll(dt) {', '\n  }\n', 'stepHeadRoll'), /moving = true;/);
  const tanh7 = APP.match(/HW \? -2 \+ 7 \* Math\.tanh/g) || [];
  assert.equal(tanh7.length, 2, 'the cards in hand in app.js cap at 7 degrees');
  assert.match(VARIANT, /HWM \? -2 \+ 7 \* Math\.tanh\(sw\.x \/ 7\)/, 'the meal board\'s card in hand caps at 7');
  assert.match(VARIANT, /if \(HWM\) return;\n        const n = due\.textContent/, 'the To-dos count no longer pops on the Halloween page');
});

test('a count that rolls and a switch that slides are still on Calmer motion and reduced motion', () => {
  const roll = cut(APP, '  function rollCount(node, to, opt) {', '  /* V11 Halloween (Stageshow, D2)', 'rollCount');
  assert.match(roll, /!HW \|\| onbCalm\(\)/, 'a still count with Calmer motion or reduced motion');
  const slide = cut(APP, '  function slidePill(seg) {', '  if (HW) Object.assign(window.SR', 'slidePill');
  assert.match(slide, /!still && !onbCalm\(\)/, 'a still fill with Calmer motion or reduced motion');
  assert.match(slide, /duration: SLIDE_MS, easing: SLIDE_EASE/);
  assert.match(APP, /const SLIDE_MS = 200, SLIDE_EASE = 'cubic-bezier\(0\.45, 0, 0\.1, 1\)';/);
});
