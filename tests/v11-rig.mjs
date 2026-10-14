/* V11: a rig for the app's own rules. app.js and variant.js are one big closure each, so a test cuts
   the functions it needs out of them by the comment or line that starts them, and runs them in a
   small world of its own: the real Model and Data, a board, a clock, and commit and toast that only
   keep notes. When a cut can't find its marker, the test says which one, so a reworded comment is
   easy to find. Nothing here touches the DOM. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

await import('../board/src/model.js');
await import('../board/src/data.js');
export const M = globalThis.Model, D = globalThis.Data;

/* what a rig hands back was made in its own world, so compare it as plain data */
export const plain = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const APP = read('../board/src/app.js'), VARIANT = read('../variants/corners11/variant.js');

/* from the first line that starts with `from` up to (not including) the line that starts with `to`;
   with no `to`, the one line */
function cutter(src, file) {
  return (from, to) => {
    const a = src.indexOf(from);
    assert.ok(a >= 0, file + ': lost the marker ' + JSON.stringify(from.trim()));
    if (to == null) return src.slice(a, src.indexOf('\n', a) + 1);
    const b = src.indexOf(to, a + from.length);
    assert.ok(b > a, file + ': lost the end marker ' + JSON.stringify(to.trim()) + ' after ' + JSON.stringify(from.trim()));
    return src.slice(a, b);
  };
}
/* exported for a test that needs a rig of its own */
export const app = cutter(APP, 'board/src/app.js'), variant = cutter(VARIANT, 'variants/corners11/variant.js');

/* the app's rules for a board, today, and a time of day (minutes) */
export function appRig(board, today, nowMin, extra) {
  const parts = [
    app('  const cap = (s) =>', '  /* V11: the part of the board for time with people is People'),
    app('  const plural = (n, one, many) =>'),
    app('  const modules = () =>', '  /* a date said the way a person would'),
    app('  /* V11: anyone grown up at home can cook', '  /* a dinner whose time is over isn\'t a question'),
    app('  const cooking = (c) =>'),
    app('  const properName = (v) =>'),
    app('  const groceryWords = (g, tail) =>', '  function stackTile(o)'),
    app('  /* What a week holds, counted the way the tray and the board count', '  /* == V11: People =='),
    app('  /* == V11: People ==', '  /* after a redraw, focus goes back to the same control'),
    app('  /* using People turns it on for good', '  /* a way off for someone:'),
    app('  /* the toast after adding someone, in plain words', '  function peopleBody('),
    app('  /* the first partner and every kid go in the profile', '  /* Settings, You and home:'),
    app('  const MOVE_IDS = ', '  const goalUnit = '),
    app('  /* V11: a time that\'s already over.', '  /* V11: "on Saturday", "yesterday", "today"'),
    app('  /* V11: a block of yours dropped on a day as a whole', '  /* what letting go on a whole day will do'),
    app('  function specAdd(spec) {', '  /* V11: an idea that is a dinner')
  ];
  const script = `
    const FEEL = true;
    let state = __board, today = __today, nowMin = __now, moves = __moves;
    const view = { got: {} }, undoStack = [], toasts = [];
    /* the app keeps a cache of resolved days; here each one is worked out fresh */
    const day = (d) => M.calendarDay(state, d);
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    function toast(text, kind, act) { toasts.push({ text, kind: kind || '', act: act || null }); }
    function undoAct(what) { return { label: 'Undo', what }; }
    /* the app's commit: a change that throws or says no leaves the board as it was */
    function commit(fn) {
      const snap = JSON.stringify(state);
      let r;
      try { r = fn(); } catch (e) { state = JSON.parse(snap); throw e; }
      if (r === false || (r && r.ok === false)) { state = JSON.parse(snap); return r || false; }
      undoStack.push(snap);
      return r;
    }
    function undo() { const s = undoStack.pop(); if (s) state = JSON.parse(s); }
    ${parts.join('\n')}
    ({
      get state() { return state; }, set state(v) { state = v; },
      get today() { return today; }, get nowMin() { return nowMin; }, set nowMin(v) { nowMin = v; },
      toasts, undo, day, who, partner, useDinners, useTogether, taskById, grocerySub, cookChoices, cookWho, cookName,
      weekCounts, stillOpen: typeof stillOpen === 'function' ? stillOpen : null,
      withPeople, peopleWeek, dinnerWith, groupNames, peopleGroups, removePerson, addPerson, friendsColor,
      movesLike, movingBlock, isMoving, weekMoves, useMove,
      overBy, startedBy, keepPast, dayFit, specAdd
    });`;
  return runInNewContext(script, Object.assign({ M, D, __board: board, __today: today, __now: nowMin == null ? 600 : nowMin, __moves: (extra && extra.moves) || null, console }, extra && extra.globals));
}

/* the meal board's rules (variant.js), on the same board: SR is what the version sees of the app */
export function mealRig(SR) {
  const parts = [
    variant('    const MEAL_KINDS = [', '    /* every meal change goes through the board\'s commit'),
    variant('    const dinnerOf = (d) =>', '    /* a night with no Dinner block gets one'),
    variant('    /* "sweet potatoes, scrambled eggs, toast, and beef sausage"', '    /* how often each meal was had'),
    variant('    /* V11: how many of a week\'s meals are planned', '    /* V11: every meal on the board, as a fingerprint')
  ];
  const script = `
    let oldMeals = null;
    ${parts.join('\n')}
    ({ MEAL_KINDS, mealAt, putMeal, leftOut, partsOf, groceryName, pantryIds, mealCount, notCooking });`;
  return runInNewContext(script, { M, SR, console });
}

/* the finish's plan of the week (variant.js finishData), on the same board */
export function finishRig(SR) {
  const parts = [
    'let oldMeals = null;',
    variant('    const MEAL_KINDS = [', '    /* every meal change goes through the board\'s commit'),
    variant('    const dinnerOf = (d) =>', '    /* a night with no Dinner block gets one'),
    variant('    const partnerName = () =>'),
    /* who cooks, said one way (cookTag) for the plan, the finish, the picture, and the shared text */
    variant('    const cookNamed = (id) => {', '    /* V11: one name per step everywhere it shows'),
    variant('    const plural = (n, one, many) =>', '    /* what the green card says')
  ];
  return runInNewContext(parts.join('\n') + '\n({ finishData, runWords, cookTag });', { M, SR, console });
}

/* what the version sees of the app (window.SR), built from an app rig */
export function srOf(rig) {
  return {
    get state() { return rig.state; }, get today() { return rig.today; }, get nowMin() { return rig.nowMin; },
    view: { preview: true }, M, D,
    day: rig.day, who: rig.who, weekCounts: rig.weekCounts, useDinners: rig.useDinners, useTogether: rig.useTogether,
    peopleWeek: rig.peopleWeek, withPeople: rig.withPeople, useMove: rig.useMove, weekMoves: rig.weekMoves,
    taskById: rig.taskById, grocerySub: rig.grocerySub, cookChoices: rig.cookChoices, cookWho: rig.cookWho, commit: (fn) => fn()
  };
}
