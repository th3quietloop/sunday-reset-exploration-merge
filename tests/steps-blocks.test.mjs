/* V11-2: steps are blocks, and the list rides inside the block (docs/BIG-MOMENTS.md, A and C). A to-do's steps are
   bricks: where each stands (app.js tsWhere: done, set, went by, or not on the week yet, with its last good day), the
   brick and its Done circle (tsStep), Next on the first step left (tsSteps), the day a step was checked (markDone,
   doneOn), the foot's "Drag a step onto a day, or" over the gold with the rule under it (sheetFoot). A message step's
   words (msgOf, msgKeep) come from the model. A block whose to-do has a list shows it to tick (listTodo, blockList,
   listDone): a tick is its own undo and never a toast. Cut out of app.js and run with the real Model and Data. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D, plain } from './v11-rig.mjs';

const TODAY = '2026-10-15'; // a Thursday

/* a page of stand-in elements: classes, attributes, data, style, children, and the listeners each one has */
function mk(tag, cls, text) {
  const e = {
    tagName: String(tag).toUpperCase(), className: cls || '', textContent: text == null ? '' : String(text), children: [], attrs: {}, dataset: {}, on: {}, props: {}, disabled: false, hidden: false, value: '',
    style: { setProperty(k, v) { e.props[k] = v; }, getPropertyValue(k) { return e.props[k] || ''; } },
    get classList() { const names = () => e.className.split(/\s+/).filter(Boolean); return { contains: (c) => names().includes(c), add: (c) => { if (!names().includes(c)) e.className = (e.className + ' ' + c).trim(); }, remove: (c) => { e.className = names().filter((x) => x !== c).join(' '); } }; },
    append(...cs) { cs.forEach((c) => e.children.push(typeof c === 'string' ? { text: c } : c)); },
    appendChild(c) { e.children.push(c); return c; },
    setAttribute(k, v) { e.attrs[k] = String(v); },
    getAttribute(k) { return e.attrs[k]; },
    addEventListener(type, fn) { e.on[type] = fn; },
    querySelector() { return null; },
    focus() {}
  };
  return e;
}
const words = (e) => (e.text != null ? e.text : (e.textContent || '') + (e.children || []).map(words).join(''));
const find = (e, cls) => { if (e.classList && e.classList.contains(cls)) return e; for (const c of e.children || []) { const f = c.children ? find(c, cls) : null; if (f) return f; } return null; };
const findAll = (e, cls, out = []) => { if (e.classList && e.classList.contains(cls)) out.push(e); (e.children || []).forEach((c) => { if (c.children) findAll(c, cls, out); }); return out; };

/* the to-do sheet's step rules in a world of their own: a board, today at 4:15 pm, and calls kept as notes */
function stepsRig(o = {}) {
  const calls = [];
  const board = o.board || { tasks: [], dates: {}, events: [] };
  const script = `
    const FEEL = true;
    let state = __board;
    const today = '${TODAY}', nowMin = __o.nowMin == null ? 975 : __o.nowMin;
    const view = { phone: !!__o.phone, got: __o.got || {} }, noDesk = false;
    const phoneDay = () => !!__o.phoneDay;
    const el = __mk, icon = (name, size, color) => { const c = __mk('canvas', 'mark'); c.dataset.icon = name; c.dataset.color = color || ''; return c; };
    const button = (text, cls, fn) => { const b = __mk('button', cls || 'small', text); b.addEventListener('click', fn); return b; };
    const UI = { soft: '#CDCDCD' }, Snd = { init() {}, pick() {}, good() {} };
    const cat = (k) => (D.CATS[k] || D.CATS.yours);
    const keepUnit = (x) => String(x).replace(/(\d) (h|min)\b/g, '$1\u00a0$2');
    const say = (x) => __calls.push(['say', x]), toast = (x, kind, act) => __calls.push(['toast', x, act ? act.label : null]), undo = () => __calls.push(['undo']), undoSay = () => ({ label: 'Undo' });
    const dragSource = (elm, spec) => { elm.dataset.drags = spec.kind + ':' + spec.id; __calls.push(['drag', spec.id]); };
    const setDone = (t, id, d) => __calls.push(['setDone', id, d]);
    const renderSide = () => __calls.push(['render']), renderBand = () => __calls.push(['band']), requestAnimationFrame = () => {}, $ = () => ({ querySelector: () => null });
    const taskById = (id) => state.tasks.find((t) => t.id === id) || null;
    function commit(fn) { const snap = JSON.stringify(state); const r = fn(); __calls.push(['commit']); __undo.push(snap); return r; }
    ${app('  /* marks a to do or one of its steps done', '  function setDone')}
    ${app('  /* a day said the way a person says it: today, tomorrow, Thursday', '  /* V11: a box saved as focus leaves it saves once focus has landed')}
    ${app('  /* a day said short, the way the rows say it', '  /* where each step stands:')}
    ${app('  /* V11-2: a brick drags wherever a board is drawn beside it', '  /* the steps as bricks,')}
    ${app('  /* == V11-2: a message step', '  /* a plan said in one line')}
    ${app('  /* == V11-2: the list rides inside the block', '  /* the band is drawn again only when')}
    ({ get state() { return state; }, set state(v) { state = v; }, view, markDone, tsWhere, tsStep, dragsHere, msgOf, msgKeep, listTodo, listDone, listSig, blockList });`;
  const undoStack = [];
  const r = runInNewContext(script, { __board: board, __o: o, __calls: calls, __mk: mk, __undo: undoStack, M: o.M || M, D, console });
  return Object.assign(r, { calls, undoStack });
}
/* where a to-do stands, the way tsCtx reads it, said by hand */
const ctx = (o = {}) => Object.assign({ steps: [], pl: [], plan: { after: false }, next: {}, was: {}, now: null, whole: [], missed: [], toSpread: [], f: null, sp: null, prop: {} }, o);
const at = (date, start, step, dur = 15) => ({ date, step, add: { id: 'a' + step, start, dur, src: { type: 'step', task: 'tx', id: step } } });
const task = (o = {}) => Object.assign({ id: 'tx', name: 'Renew the car registration', due: '2026-10-17', cat: 'home', icon: 'car', steps: [], done: false }, o);
/* (a time keeps its am or pm with a no-break space, so it never wraps apart; read here as a space) */
const sp = (x) => String(x).replace(/ /g, ' ');

test('a step says where it stands: done today, its time on the week, moved, went by, or not on your week yet by its day', () => {
  const r = stepsRig();
  const w = (s, c, t) => { const x = r.tsWhere(t || task(), s, ctx(c)); return [x.kind, sp(x.words)]; };
  assert.deepEqual(w({ id: 's1', name: 'Find the notice', dur: 10, done: true, doneOn: TODAY }, {}), ['done', 'Done today · 10 min']);
  assert.deepEqual(w({ id: 's1', name: 'Find the notice', dur: 10, done: true, doneOn: '2026-10-14' }, {}), ['done', 'Done yesterday · 10 min']);
  assert.deepEqual(w({ id: 's1', name: 'Find the notice', dur: 10, done: true }, { was: { s1: at('2026-10-13', 600, 's1') } }), ['done', 'Done Tue · 10 min'], 'checked before V11-2 kept no day: the day of its time');
  assert.deepEqual(w({ id: 's1', name: 'Find the notice', dur: 10, done: true }, {}), ['done', 'Done · 10 min'], 'no day known: never a made up one');
  assert.deepEqual(w({ id: 's2', name: 'Pay online', dur: 15 }, { next: { s2: at('2026-10-16', 450, 's2') } }), ['set', 'Tomorrow 7:30 am · 15 min']);
  assert.deepEqual(w({ id: 's2', name: 'Pay online', dur: 15 }, { next: { s2: at('2026-10-16', 450, 's2') } }, task()), ['set', 'Tomorrow 7:30 am · 15 min']);
  const moved = stepsRig({ got: { tsMoved: { id: 'tx', steps: { s2: true } } } });
  assert.equal(sp(moved.tsWhere(task(), { id: 's2', name: 'Pay online', dur: 15 }, ctx({ next: { s2: at('2026-10-16', 450, 's2') } })).words), 'Moved to tomorrow 7:30 am · 15 min');
  assert.deepEqual(w({ id: 's3', name: 'Print it', dur: 30 }, { was: { s3: at('2026-10-13', 600, 's3', 30) } }), ['went', 'Tue 10 am went by · 30 min']);
  assert.deepEqual(w({ id: 's3', name: 'Put the sticker on', dur: 5 }, {}), ['loose', 'Not on your week yet · by Sat · 5 min'], 'its last good day is the day it’s due');
  assert.deepEqual(w({ id: 's3', name: 'Put the sticker on', dur: 5 }, {}, task({ due: '2026-10-16' })), ['loose', 'Not on your week yet · by tomorrow · 5 min']);
  assert.deepEqual(w({ id: 's3', name: 'Put the sticker on', dur: 5 }, {}, task({ due: '2026-10-14' })), ['loose', 'Not on your week yet · was due yesterday · 5 min']);
  assert.deepEqual(w({ id: 's3', name: 'Put the sticker on' }, {}, task({ due: null })), ['loose', 'Not on your week yet · 15 min']);
  assert.deepEqual(w({ id: 's3', name: 'Put the sticker on', dur: 5 }, { whole: [{ date: '2026-10-16', add: { id: 'w', start: 1170, dur: 60 } }] }), ['set', 'Tomorrow 7:30 pm · 5 min'], 'the whole to-do has a time: its steps go with it');
  assert.equal(sp(r.tsWhere(task(), { id: 's3', name: 'Put the sticker on', dur: 5 }, ctx()).said), 'Not on your week yet, by Sat, 5 min', 'a screen reader hears commas, not dots');
  /* a plan the gold would place (or the own-time one it asks about): where it would land, said as only proposed */
  const pr = r.tsWhere(task(), { id: 's3', name: 'Put the sticker on', dur: 5 }, ctx({ prop: { s3: { date: TODAY, start: 1035 } } }));
  assert.deepEqual([pr.kind, sp(pr.words), sp(pr.bits[pr.prop])], ['loose', 'Not on your week yet · Today 5:15 pm · 5 min', 'Today 5:15 pm']);
  assert.equal(sp(pr.said), 'Not on your week yet, it would go today 5:15 pm, 5 min');
});

test('a step is a brick in its to-do’s color that drags onto the board; done, it’s grey and opens with a tap; the circle only means Done', () => {
  const r = stepsRig();
  const t = task({ steps: [{ id: 's1', name: 'Find the notice', dur: 10, done: true, doneOn: TODAY }, { id: 's2', name: 'Pay online', dur: 15 }, { id: 's3', name: 'Put the sticker on', dur: 5 }] });
  const c = ctx({ steps: t.steps, next: { s2: at('2026-10-16', 450, 's2') } });
  const done = r.tsStep(t, t.steps[0], c, false), next = r.tsStep(t, t.steps[1], c, true), loose = r.tsStep(t, t.steps[2], c, false);
  const brick = (li) => find(li, 'c-ts-brick'), check = (li) => find(li, 'c-ts-check');
  assert.equal(brick(done).className, 'c-ts-brick done');
  assert.equal(brick(next).className, 'c-ts-brick set');
  assert.equal(brick(loose).className, 'c-ts-brick loose', 'not on the week: an outline brick');
  assert.equal(brick(next).props['--c'], D.CATS.home.base, 'the to-do’s own color');
  assert.ok(find(brick(next), 'c-ts-grip'), 'the dotted grip the desk’s bricks have');
  assert.deepEqual(plain(r.calls.filter((x) => x[0] === 'drag').map((x) => x[1])), ['s2', 's3'], 'every step left drags; a done one doesn’t');
  assert.ok(next.classList.contains('next') && words(find(brick(next), 'c-ts-next')) === 'Next', 'Next is a tag on the brick, and the step wears the ring');
  assert.equal(find(brick(loose), 'c-ts-next'), null);
  assert.equal(sp(words(find(brick(done), 'c-ts-sm'))), 'Done today · 10 min');
  assert.equal(sp(words(find(brick(loose), 'c-ts-sm'))), 'Not on your week yet · by Sat · 5 min');
  const prop = r.tsStep(t, t.steps[2], ctx({ steps: t.steps, prop: { s3: { date: '2026-10-16', start: 570 } } }), false);
  assert.equal(sp(words(find(brick(prop), 'c-ts-sm'))), 'Not on your week yet · Tomorrow 9:30 am · 5 min');
  assert.equal(sp(words(find(brick(prop), 'c-ts-prop'))), 'Tomorrow 9:30 am', 'the proposed time wears the dashed landing outline');
  assert.deepEqual([check(done).attrs.role, check(done).attrs['aria-checked'], check(loose).attrs['aria-checked']], ['checkbox', 'true', 'false']);
  assert.equal(check(next).attrs['aria-label'], 'Done: Pay online', 'the circle says one thing: Done');
  check(loose).on.click();
  assert.deepEqual(plain(r.calls.filter((x) => x[0] === 'setDone')), [['setDone', 's3', true]]);
  check(done).on.click();
  assert.deepEqual(plain(r.calls.filter((x) => x[0] === 'setDone').pop()), ['setDone', 's1', false], 'a tap on a done one opens it again');
  assert.ok(r.calls.some((x) => x[0] === 'toast' && /open again/.test(x[1]) && x[2] === 'Undo'), 'and says so, with Undo');
  /* a yellow block keeps its dark ink: the brick says light */
  const y = r.tsStep(task({ cat: 'yours', steps: [{ id: 'y1', name: 'Sketch', dur: 30 }] }), { id: 'y1', name: 'Sketch', dur: 30 }, ctx(), false);
  assert.ok(brick(y).classList.contains('light'));
  assert.equal(brick(y).props['--ink'], D.CATS.yours.ink);
});

test('Next sits on the first step left, in the order shown, and moves down as steps are done', () => {
  /* tsSteps on its own, with a stand-in for each brick that says whether it's Next */
  const script = `
    const el = __mk, icon = () => __mk('canvas'), UI = { soft: '#fff' };
    const tsStep = (t, s, c, isNext) => { const li = __mk('li', 'c-ts-step'); li.dataset.id = s.id; li.dataset.next = String(!!isNext); return li; };
    const taskById = () => null, commit = () => {}, say = () => {}, leaveSave = () => {};
    let committing = null;
    ${app('  /* the steps as bricks,', '  /* == V11-2: a message step')}
    ({ tsSteps });`;
  const { tsSteps } = runInNewContext(script, { __mk: mk, M });
  const nextOf = (t, order) => { const p = mk('div'); tsSteps(p, t, ctx({ steps: t.steps }), order || t.steps); return p.children[0].children.filter((x) => x.dataset.next === 'true').map((x) => x.dataset.id); };
  const st = (done) => [0, 1, 2].map((i) => ({ id: 's' + i, name: 'Step ' + i, dur: 15, done: i < done }));
  assert.deepEqual(nextOf(task({ steps: st(0) })), ['s0']);
  assert.deepEqual(nextOf(task({ steps: st(1) })), ['s1'], 'one done: Next moves to the second');
  assert.deepEqual(nextOf(task({ steps: st(2) })), ['s2']);
  assert.deepEqual(nextOf(task({ steps: st(3) })), [], 'all done: no Next');
  const s = st(0);
  assert.deepEqual(nextOf(task({ steps: s }), [s[1], s[0], s[2]]), ['s1'], 'a step that went by comes first, and it’s the one to answer');
  assert.deepEqual(nextOf(task({ steps: s, done: true })), [], 'a done to-do has no Next');
});

test('a checked step keeps the day it was checked, and forgets it when it’s opened again', () => {
  const t = task({ steps: [{ id: 's1', name: 'Find the notice', dur: 10 }, { id: 's2', name: 'Pay online', dur: 15, done: true, doneOn: '2026-10-12' }, { id: 's3', name: 'Put the sticker on', dur: 5 }] });
  const r = stepsRig({ board: { tasks: [t], dates: {}, events: [] } });
  const live = () => r.state.tasks.find((x) => x.id === 'tx');
  r.markDone(live(), 's1', true);
  assert.equal(live().steps[0].doneOn, TODAY);
  r.markDone(live(), 's1', false);
  assert.equal('doneOn' in live().steps[0], false);
  r.markDone(live(), null, true);
  assert.deepEqual(live().steps.map((s) => s.doneOn), [TODAY, '2026-10-12', TODAY], 'the whole to-do done: the steps left are done today, one done earlier keeps its day');
});

test('the foot says how to drag, over the gold, with the plan’s rule under it', () => {
  const script = `
    const el = __mk, icon = (n) => { const c = __mk('canvas', 'mark'); c.dataset.icon = n; return c; }, UI = { soft: '#CDCDCD' };
    const button = (text, cls, fn) => { const b = __mk('button', cls || 'small', text); b.addEventListener('click', fn); return b; };
    ${app('  /* A panel\'s next move, at its foot:', '  /* a drag down on the header pulls the sheet down')}
    ({ sheetFoot });`;
  const { sheetFoot } = runInNewContext(script, { __mk: mk });
  const p = mk('div');
  const f = sheetFoot(p, { hint: 'Drag a step onto a day, or', line: 'Up to 30 min a day, Thu to Sat.', change: () => {}, gold: ['Put the rest on my week', () => {}, 'td-put'], under: true });
  assert.equal(f.className, 'c-sfoot c-sf-under');
  assert.deepEqual(f.children.map((x) => x.className), ['c-sf-hint', 'c-sf-btns', 'c-sf-line'], 'the hint, the gold, then the rule');
  assert.equal(words(f.children[0]), 'Drag a step onto a day, or');
  assert.equal(f.children[0].children[0].dataset.icon, 'grip', 'with the grip’s own mark');
  assert.equal(words(f.children[2]), 'Up to 30 min a day, Thu to Sat. Change');
  const q = sheetFoot(mk('div'), { line: 'Done.', quiet: ['Mark not done', () => {}] });
  assert.deepEqual(q.children.map((x) => x.className), ['c-sf-line', 'c-sf-btns'], 'every other foot: its line, then its buttons');
});

test('a plan on one day says it the way a sentence does: 15 min today, 30 min on Sat', () => {
  const script = `
    const today = '${TODAY}';
    ${app('  /* a day said the way a person says it: today, tomorrow, Thursday', '  /* V11: a box saved as focus leaves it saves once focus has landed')}
    ${app('  /* a day said short, the way the rows say it', '  /* where each step stands:')}
    ${app('  /* a plan said in one line:', '  /* V11-2 (your own time stays yours)')}
    ({ tsSpreadWords });`;
  const { tsSpreadWords } = runInNewContext(script, { M });
  const one = (date, mins) => ({ days: [{ date, items: [{ dur: mins }] }] });
  assert.equal(tsSpreadWords(task({ due: '2026-10-17' }), one(TODAY, 15), { cap: 30, when: 'any' }), '15 min today. Done 2 days before it’s due.');
  assert.equal(tsSpreadWords(task({ due: '2026-10-17' }), one('2026-10-16', 30), { cap: 30, when: 'any' }), '30 min tomorrow. Done a day before it’s due.');
  assert.equal(tsSpreadWords(task({ due: '2026-10-17' }), one('2026-10-17', 30), { cap: 30, when: 'any' }), '30 min on Sat. Done the day it’s due.');
});

/* a board with a trip and the heads-up made for it, the way the model makes one */
function tripBoard() {
  const st = D.sampleState(TODAY);
  st.events = (st.events || []).concat({ id: 'ca', kind: 'trip', name: 'California', date: '2026-12-18', end: '2026-12-22', icon: 'plane', leave: 450, back: 1020, place: 'LA' });
  st.tasks.push({ id: 'lisa', name: 'Give Aunt Lisa a heads-up', icon: 'chat', cat: 'family', dur: 5, due: '2026-11-20', repeat: null, done: false, steps: [], of: 'ca', msg: { to: 'Aunt Lisa' } });
  return st;
}

test('a message step’s words come from the model: the suggestion, the person’s own once kept, and the quick versions', () => {
  /* (V11-3, code review 34: the export is held to be there; a skip would pass quietly if it were renamed) */
  assert.equal(typeof M.msgFor, 'function', 'Model.msgFor is gone');
  const r = stepsRig({ board: tripBoard() });
  const t = () => r.state.tasks.find((x) => x.id === 'lisa');
  const m = r.msgOf(t());
  assert.equal(m.to, 'Aunt Lisa');
  assert.equal(m.text, m.suggested, 'nothing kept yet: the suggestion');
  assert.match(m.text, /^Hey Aunt Lisa! /);
  assert.equal(m.own, false);
  assert.deepEqual(m.versions.map((v) => v.id).slice(0, 2), ['shorter', 'warmer']);
  assert.ok(m.versions.every((v) => v.text && v.text !== m.suggested), 'each quick version is its own words');
  /* Done keeps the words; the suggestion itself is never saved, and an empty box goes back to it */
  assert.equal(r.msgKeep(t(), m.suggested), false, 'the suggestion as it is: nothing to keep');
  assert.equal(r.msgKeep(t(), 'Hey Aunt Lisa! In LA in December. Lunch?'), true);
  assert.equal(t().msg.text, 'Hey Aunt Lisa! In LA in December. Lunch?');
  assert.equal(r.msgOf(t()).text, 'Hey Aunt Lisa! In LA in December. Lunch?');
  assert.equal(r.msgOf(t()).own, true);
  assert.ok(r.calls.some((x) => x[0] === 'toast' && x[1] === 'Your text is saved.' && x[2] === 'Undo'), 'kept with a toast and Undo');
  assert.equal(r.msgKeep(t(), '   '), true);
  assert.equal('text' in t().msg, false, 'an empty box goes back to the suggestion');
  assert.equal(r.msgOf(r.state.tasks.find((x) => x.id === 'tx') || { id: 'none' }), null);
});

test('before the model has suggestions, a message shows the words kept on it and no quick versions', () => {
  const bare = Object.assign({}, M);
  delete bare.msgFor;
  const st = tripBoard();
  st.tasks.find((x) => x.id === 'lisa').msg.text = 'Hey! In LA soon.';
  const r = stepsRig({ board: st, M: bare });
  const m = r.msgOf(r.state.tasks.find((x) => x.id === 'lisa'));
  assert.deepEqual(plain(m), { to: 'Aunt Lisa', text: 'Hey! In LA soon.', suggested: '', versions: [], own: true });
});

test('a block whose to-do has a list carries it: a tick is its own undo, never a toast, and Add a thing adds one', () => {
  const t = { id: 'pack', name: 'Pack for California', cat: 'home', icon: 'shirt', dur: 45, due: TODAY, steps: [], done: false, list: [{ id: 'l1', name: 'Phone charger', done: true }, { id: 'l2', name: 'Meds', done: false }] };
  const r = stepsRig({ board: { tasks: [t, { id: 'plain', name: 'Call the dentist', steps: [], done: false }], dates: {}, events: [] } });
  const live = () => r.state.tasks.find((x) => x.id === 'pack');
  assert.equal(r.listTodo({ src: { type: 'task', id: 'pack' } }).id, 'pack');
  assert.equal(r.listTodo({ src: { type: 'step', task: 'pack', id: 's1' } }).id, 'pack', 'a step’s block carries its to-do’s list');
  assert.equal(r.listTodo({ src: { type: 'task', id: 'plain' } }), null, 'no list, nothing to carry');
  assert.equal(r.listTodo({ src: { type: 'block', id: 'workout' } }), null);
  const box = r.blockList(live(), 'band');
  const rows = findAll(box, 'c-tick-i');
  assert.deepEqual(rows.map((b) => [words(b), b.attrs.role, b.attrs['aria-checked'], b.classList.contains('got')]), [['Phone charger', 'checkbox', 'true', true], ['Meds', 'checkbox', 'false', false]]);
  rows[1].on.click({ stopPropagation() {} });
  assert.equal(live().list[1].done, true, 'ticked, through commit');
  rows[1].on.click({ stopPropagation() {} });
  assert.equal(live().list[1].done, false, 'a tap again takes it back');
  assert.equal(r.calls.filter((x) => x[0] === 'commit').length, 2);
  assert.equal(r.calls.filter((x) => x[0] === 'toast').length, 0, 'no toast for a tick');
  const inp = find(box, 'c-tick-in');
  assert.equal(inp.placeholder, 'Add a thing');
  inp.value = 'Sunscreen';
  inp.on.keydown({ key: 'Enter', preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(plain(live().list.slice(-1)).map((x) => [x.name, x.done, /^li/.test(x.id)]), [['Sunscreen', false, true]]);
  assert.notEqual(r.listSig(live()), r.listSig(Object.assign({}, live(), { list: live().list.map((x) => Object.assign({}, x, { done: true })) })), 'a tick draws the band again');
  /* its Done says what's done */
  assert.equal(r.listDone(live()), 'Done packing');
  assert.equal(r.listDone({ name: 'Clean the kitchen' }), 'Done cleaning');
  assert.equal(r.listDone({ name: 'Shop for the party' }), 'Done shopping');
  assert.equal(r.listDone({ name: 'Workout' }), 'Done');
  /* a done to-do's list stays with it, out of the block */
  live().done = true;
  assert.equal(r.listTodo({ src: { type: 'task', id: 'pack' } }), null);
});

test('on the desk the band is two rows of a list at most: Show all 12 in the last place opens the rest, Show fewer folds it', () => {
  const list = (n) => Array.from({ length: n }, (_, i) => ({ id: 'l' + i, name: 'Thing ' + (i + 1), done: i < 2 }));
  const t = { id: 'pack', name: 'Pack for the lake', cat: 'home', steps: [], done: false, list: list(12) };
  const r = stepsRig({ board: { tasks: [t], dates: {}, events: [] } });
  const live = () => r.state.tasks.find((x) => x.id === 'pack');
  /* (a band three columns wide, as at 1440 by 900: two rows are six places, the last one Show all) */
  const band = r.blockList(live(), 'band');
  const rows = (box) => box.children[0].children.length;
  assert.equal(findAll(band, 'c-tick-i').length, 5);
  assert.equal(rows(band), 6, 'two rows of three, and no more');
  const tg = find(band, 'c-tick-all');
  assert.deepEqual([words(tg), tg.attrs['aria-expanded']], ['Show all 12', 'false']);
  assert.equal(find(band, 'c-tick-in'), null, 'Add a thing waits behind Show all');
  tg.on.click({ stopPropagation() {} });
  assert.equal(r.view.got.bandAll, 'pack');
  const open = r.blockList(live(), 'band');
  assert.equal(findAll(open, 'c-tick-i').length, 12, 'all of it, in place');
  assert.ok(find(open, 'c-tick-in'), 'with Add a thing');
  assert.deepEqual([words(find(open, 'c-tick-all')), find(open, 'c-tick-all').attrs['aria-expanded']], ['Show fewer', 'true']);
  find(open, 'c-tick-all').on.click({ stopPropagation() {} });
  assert.equal(r.view.got.bandAll, null);
  /* six don't fit beside Add a thing: Show all 6; five do, with no fold */
  const six = r.blockList(Object.assign({}, live(), { list: list(6) }), 'band');
  assert.deepEqual([findAll(six, 'c-tick-i').length, words(find(six, 'c-tick-all'))], [5, 'Show all 6']);
  const five = r.blockList(Object.assign({}, live(), { list: list(5) }), 'band');
  assert.deepEqual([findAll(five, 'c-tick-i').length, find(five, 'c-tick-all'), !!find(five, 'c-tick-in')], [5, null, true]);
  /* the phone's card and the to-do's sheet keep the whole list in one column */
  const ph = r.blockList(live(), 'ph');
  assert.deepEqual([findAll(ph, 'c-tick-i').length, find(ph, 'c-tick-all')], [12, null]);
});

test('only where a board is drawn does a brick drag, and say so', () => {
  assert.equal(stepsRig().dragsHere(), true, 'the desk');
  assert.equal(stepsRig({ phone: true }).dragsHere(), false, 'the phone’s list');
  assert.equal(stepsRig({ phone: true, phoneDay: true }).dragsHere(), true, 'the phone’s own day');
});
