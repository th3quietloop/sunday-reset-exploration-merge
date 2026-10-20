// V11-2 (Oct 20): the setup reads as Sunday Reset, not a template. One live week sits on top of
// every step and fills in as the setup asks: a part of the week comes in once its question has been asked, a block an
// answer adds wears a gold edge for 1.2 s and grows from its start (at once with calmer motion), and one that moved
// slides there. On the reset step the Sunday Reset is set into its day. Building brings each part in with its line.
// Times are chips with their values. The calendar is claimed only once they say it's in it. The app's parts are cut
// out of board/src/app.js by the comment that starts them and run on a small stand-in page (no browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app, M, D, plain } from './v11-rig.mjs';

await import('../board/src/onboard.js');
const OB = globalThis.Onboard;
const today = '2026-10-20'; // a Tuesday: the week is Sun Oct 18 to Sat Oct 24
const SUN = '2026-10-18', MON = '2026-10-19', WED = '2026-10-21';

const answers = (o) => Object.assign({ name: '', pains: [], home: 'solo', partner: '', kids: [], help: { dinners: true, together: true }, meals: { breakfast: true, lunch: true }, focus: [], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020, same: true, hours: {} }, cares: {}, noWork: false, placed: null, soon: null, dinner: null, todo: null, resetAt: { day: 0, min: 1140 } }, o);

/* a stand-in for the page's elements: enough of one for the week, a chip, and the calendar's row */
class El {
  constructor(tag, cls, text) {
    this.tagName = String(tag).toUpperCase(); this.children = []; this.style = {}; this.dataset = {}; this.attrs = {}; this.on = {}; this.anims = [];
    this._text = text == null ? '' : String(text); this.value = ''; this.selected = false;
    const set = new Set(String(cls || '').split(/\s+/).filter(Boolean));
    this.cls = set;
    this.classList = { add: (...c) => c.forEach((x) => set.add(x)), remove: (...c) => c.forEach((x) => set.delete(x)), contains: (c) => set.has(c), toggle: (c, v) => { if (v === undefined ? !set.has(c) : v) set.add(c); else set.delete(c); } };
  }
  get className() { return Array.from(this.cls).join(' '); }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  appendChild(c) { this.children.push(c); return c; }
  append(...cs) { cs.forEach((c) => this.children.push(typeof c === 'string' ? new El('#text', '', c) : c)); }
  prepend(c) { this.children.unshift(c); }
  replaceChildren(...cs) { this.children = []; this.append(...cs); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(k, fn) { (this.on[k] = this.on[k] || []).push(fn); }
  fire(k, e) { (this.on[k] || []).forEach((fn) => fn(Object.assign({ key: '', stopPropagation() {}, preventDefault() {} }, e))); }
  animate(frames, opts) { this.anims.push({ frames, opts }); return { cancel() {} }; }
  focus() {}
  all(pred, out = []) { this.children.forEach((c) => { if (pred(c)) out.push(c); c.all(pred, out); }); return out; }
}
const blocksOf = (box) => box.all((x) => x.cls.has('onb-live-b'));
const rowsOf = (box) => box.all((x) => x.cls.has('onb-live-row'));

/* the live week's part of app.js, with what it needs from the page stood in for */
function rig() {
  const script = `
    const FEEL = true, OB = __OB;
    let today = __today, nowMin = 600, calm = false;
    const view = { got: {} }, files = [], timers = [];
    const el = (t, c, x) => new __El(t, c, x);
    const icon = (n) => new __El('canvas', 'ic', '');
    const button = (text, cls, fn) => { const b = new __El('button', cls, text); b.click = () => fn({}); return b; };
    const W = { look: (b) => ({ base: b.sleep ? '#5B616C' : (D.CATS[b.cat] || D.CATS.yours).base }) };
    const UI = { white: '#FFFFFF' };
    const cat = (k) => D.CATS[k] || D.CATS.yours;
    const properName = (v) => v;
    const onbCalm = () => calm;
    const Snd = { init() {}, pick() {} };
    const saveDraft = () => {};
    const saveResetIcs = (at) => { files.push(Object.assign({}, at)); };
    const $ = () => ({ querySelector: () => null });
    const document = { createTextNode: (t) => new __El('#text', '', t) };
    const requestAnimationFrame = () => 0, cancelAnimationFrame = () => {};
    const setTimeout = (fn, ms) => { timers.push(ms); return timers.length; };
    const calEvents = (items, id, c) => items.map((x, i) => Object.assign({ id: id + i, cal: id, cat: c, kind: 'timed' }, x));
    const onbSteps = (a) => OB.stepsFor(a, { phone: false, asked: true });
    const workFixed = (a) => !!a.work.fixed;
    ${app('  function setupInput(a) {', '  /* Whether work hours are set')}
    const onbBase = (a) => { const st = D.buildState(setupInput(a), today); st.settings.hours = OB.hoursFor(a); return st; };
    ${app('  /* == V11-2: your week fills in (Oct 20, the setup made to read as Sunday Reset) ==', '  /* (the end of your week fills in) */')}
    ${app('  /* which blocks of the week a line of Building brings in', '  /* V11: the reason they came leads the plan')}
    ({ liveWeek, liveFrom, liveAsked, buildPart, onbTime, onbCalRow, livePreview, files, timers, setCalm(v) { calm = v; } });`;
  return runInNewContext(script, { M, D, __OB: OB, __today: today, __El: El, console });
}

test('the week on top starts empty and fills in as the setup asks: the evening and kids from home, meals, sleep, then work', () => {
  const r = rig();
  const a = answers({ name: 'Pat', home: 'family', partner: 'Sam', kids: ['Robin'] });
  const su = { a, at: 'name' };
  const week = r.liveWeek(su);
  assert.equal(rowsOf(week).length, 7, 'seven days, Sunday first');
  assert.equal(blocksOf(week).length, 0, 'the name step: a bare board');
  assert.equal(week.all((x) => x.cls.has('onb-live-tab'))[0].textContent, 'Pat’s week', 'the board carries their name');
  assert.equal(r.liveWeek({ a: answers(), at: 'name' }).all((x) => x.cls.has('onb-live-tab'))[0].textContent, 'Your week');
  const at = (step, seen) => { su.at = step; if (seen) su.seen = seen; return blocksOf(r.liveWeek(su)).map((x) => x.dataset.part); };
  const home = at('home');
  assert.ok(home.includes('evening') && home.includes('dropoff') && home.includes('pickup'), 'home brings the evening with Sam and Robin’s drop off and pick up: ' + home.join(','));
  assert.ok(!home.includes('work') && !home.includes('sleep-am') && !home.includes('dinner'), 'nothing that wasn’t asked yet');
  const help = at('help');
  assert.ok(['breakfast', 'lunch', 'dinner'].every((p) => help.includes(p)), 'what it helps with brings the meals');
  const days = at('days');
  assert.ok(days.includes('sleep-am') && days.includes('sleep-pm') && days.includes('morning'), 'the days bring sleep and the mornings');
  assert.ok(!days.includes('work'));
  assert.ok(at('work').includes('work'), 'work comes with its own question');
  /* going back keeps what was seen */
  const back = at('help', { work: true, days: true });
  assert.ok(back.includes('work') && back.includes('sleep-am'), 'going back to an earlier step keeps the week as it was');
  assert.equal(r.liveFrom({ sleep: 'am' }), 'days');
  assert.equal(r.liveFrom({ add: 'x', src: { type: 'block', id: 'workout' } }), 'try');
  assert.equal(r.liveFrom({ add: 'x', src: { type: 'custom' } }), 'todo');
  assert.equal(r.liveFrom({ event: 'e1' }), 'calendar');
  assert.equal(r.liveFrom({ add: 'r', src: { type: 'reset' } }), 'reset');
});

test('what an answer adds wears a gold edge and grows from its start; a moved block slides; calmer motion shows it at once', () => {
  const r = rig();
  const a = answers({ home: 'partner', partner: 'Sam' });
  const su = { a, at: 'home' };
  const first = blocksOf(r.liveWeek(su));
  assert.ok(first.length && first.every((x) => !x.cls.has('new') && !x.anims.length), 'the first drawing is the start: nothing is new yet');
  /* a family with a kid: Robin's drop off and pick up are new */
  a.home = 'family'; a.kids = ['Robin'];
  const second = blocksOf(r.liveWeek(su));
  const drops = second.filter((x) => x.dataset.part === 'dropoff');
  assert.equal(drops.length, 5, 'Monday to Friday');
  assert.ok(drops.every((x) => x.cls.has('new')), 'each wears the gold edge');
  assert.ok(drops.every((x) => x.anims.some((n) => /scaleX\(0\)/.test(n.frames[0].transform))), 'each grows from its start');
  assert.equal(drops[0].style.transform, undefined);
  assert.ok(second.filter((x) => x.dataset.part === 'evening').every((x) => !x.cls.has('new')), 'the evening was already there');
  assert.ok(r.timers.some((ms) => ms > 1100 && ms <= 1200), 'the edge goes after 1.2 s');
  /* drop off later: it slides there, no edge of its own */
  a.cares = { Robin: { days: [1, 2, 3, 4, 5], drop: 540, pick: 1005, other: false } };
  const third = blocksOf(r.liveWeek(su));
  const moved = third.filter((x) => x.dataset.part === 'dropoff');
  assert.ok(moved.every((x) => x.anims.some((n) => n.frames[0].left && n.frames[1].left && n.frames[0].left !== n.frames[1].left)), 'it slides from where it was');
  assert.ok(moved.every((x) => !x.anims.some((n) => n.frames[0].transform)), 'and doesn’t grow again');
  /* calmer motion: the new block shows at once, its edge still there */
  const c = rig();
  c.setCalm(true);
  const s2 = { a: answers({ home: 'partner', partner: 'Sam' }), at: 'home' };
  c.liveWeek(s2);
  s2.a.home = 'family'; s2.a.kids = ['Robin'];
  const calm = blocksOf(c.liveWeek(s2)).filter((x) => x.dataset.part === 'dropoff');
  assert.ok(calm.every((x) => x.cls.has('new') && !x.anims.length), 'no motion, the edge only');
});

test('the reset step sets the Sunday Reset into its day at its time, and moves it with a new time', () => {
  const r = rig();
  const a = answers({ resetAt: { day: 0, min: 1140 } });
  const su = { a, at: 'reset' };
  const week = r.liveWeek(su);
  const rows = rowsOf(week);
  const resetIn = (row) => row.all((x) => x.cls.has('onb-live-b') && x.dataset.name === 'Sunday Reset');
  assert.equal(resetIn(rows[0]).length, 1, 'on Sunday’s row');
  assert.equal(rows.slice(1).reduce((n, row) => n + resetIn(row).length, 0), 0, 'nowhere else');
  const h = OB.hoursFor(a);
  assert.equal(Math.round(parseFloat(resetIn(rows[0])[0].style.left) * 10) / 10, Math.round(((1140 - h.start) / (h.end - h.start)) * 1000) / 10, 'at 7 pm');
  /* another time: Monday at 9 am */
  a.resetAt = { day: 1, min: 540 };
  const moved = rowsOf(r.liveWeek(su));
  assert.equal(resetIn(moved[1]).length, 1, 'on Monday’s row now');
  assert.ok(resetIn(moved[1])[0].cls.has('new'), 'set in with its edge');
  /* only on its step: the week built doesn't keep it (it's the reset's time, not a block) */
  su.at = 'build';
  assert.equal(blocksOf(r.liveWeek(su, { state: OB && r.livePreview(Object.assign({}, su, { at: 'plan' })), all: true })).filter((x) => x.dataset.name === 'Sunday Reset').length, 0);
});

test('Building brings in each part of the week with the line that says it, and the last line brings the rest', () => {
  const r = rig();
  const x = (part, name) => ({ dataset: Object.assign({ part }, name ? { name } : {}) });
  assert.ok(r.buildPart('Mornings from 6:30 am on weekdays', x('sleep-am')));
  assert.ok(r.buildPart('Mornings from 6:30 am on weekdays', x('morning')));
  assert.ok(!r.buildPart('Mornings from 6:30 am on weekdays', x('sleep-pm')));
  assert.ok(r.buildPart('Work on Mon, Tue, Wed, Thu, Fri', x('work')));
  assert.ok(r.buildPart('Class on Mon, Wed', x('work')));
  assert.ok(r.buildPart('Breakfast and Lunch at a time each day', x('lunch')));
  assert.ok(r.buildPart('Locking drop off and pick up for Robin', x('pickup2')));
  assert.ok(r.buildPart('Dinner at 6 pm', x('dinner')));
  assert.ok(r.buildPart('Evenings with Sam', x('winddown')));
  assert.ok(r.buildPart('Keeping your evenings free', x('sleep-pm')));
  assert.ok(r.buildPart('Bringing in 12 events from Work shifts', x('event')));
  assert.ok(r.buildPart('Putting Workout on Wednesday at 6:45 pm', x('add', 'Workout')));
  assert.ok(!r.buildPart('Putting Workout on Wednesday at 6:45 pm', x('add', 'Walk')));
  assert.ok(!r.buildPart('Counting the hours that are yours', x('work')), 'the last line brings the rest by itself');
  /* every block of a whole week is brought in by one of its lines (or the last) */
  const a = answers({ name: 'Pat', home: 'family', partner: 'Sam', kids: ['Robin'], placed: { date: WED, start: 1125, dur: 60, add: { name: 'Workout', cat: 'yours', icon: 'dumbbell', dur: 60, src: { type: 'block', id: 'workout' } } } });
  const st = r.livePreview({ a, at: 'plan' });
  const lines = OB.buildLines(M, a, st, OB.applyExtras(M, JSON.parse(JSON.stringify(st)), {}).concat([{ kind: 'block', name: 'Workout', date: WED, start: 1125, dur: 60 }]), null);
  const week = r.liveWeek({ a, at: 'build' }, { state: st, all: true, big: true, hold: true });
  const held = blocksOf(week);
  assert.ok(held.length > 40 && held.every((b) => b.cls.has('hold')), 'Building starts with the week held back');
  const brought = held.filter((b) => lines.slice(0, -1).some((l) => r.buildPart(l, b)));
  assert.ok(brought.length / held.length > 0.8, 'most of the week comes in with its own line: ' + brought.length + ' of ' + held.length);
  assert.ok(brought.some((b) => b.dataset.name === 'Workout'), 'the block from Try it comes in with its line');
});

test('a time is a chip with its value that opens to change it, with its name for a screen reader', () => {
  const r = rig();
  let v = 540;
  const chip = r.onbTime('Starts', () => v, (x) => { v = x; }, { lo: 300, hi: 960, key: 'work-start' });
  assert.equal(chip.tagName, 'LABEL');
  assert.match(chip.textContent, /^Starts9 am/, 'Starts 9 am, with a mark that opens it');
  const sel = chip.all((x) => x.tagName === 'SELECT')[0];
  assert.equal(sel.getAttribute('aria-label'), 'Starts');
  assert.equal(sel.dataset.fk, 'tm-work-start', 'a redraw puts focus back on it');
  const opts = sel.children.filter((x) => x.tagName === 'OPTION');
  assert.equal(opts.length, (960 - 300) / 30 + 1, 'every half hour from 5 am to 4 pm');
  assert.equal(opts.find((o) => o.selected).value, '540');
  sel.value = '600'; sel.fire('change');
  assert.equal(v, 600);
  assert.match(chip.textContent, /^Starts10 am/);
  /* a time off the half hours, kept from before, is one of the choices too */
  v = 545;
  const odd = r.onbTime('Up at', () => v, () => {}, { lo: 300, hi: 720, name: 'Weekdays, up at' }).all((x) => x.tagName === 'SELECT')[0];
  assert.ok(odd.children.some((o) => o.value === '545' && o.selected));
  assert.equal(odd.getAttribute('aria-label'), 'Weekdays, up at');
});

test('the calendar is said the way it happens: a file to open with their day and time, and a reminder only once it’s in', () => {
  const r = rig();
  const a = answers({ resetAt: { day: 0, min: 1140 } });
  const row = r.onbCalRow(a);
  const btn = (re) => row.all((x) => x.tagName === 'BUTTON' && re.test(x.textContent))[0];
  assert.equal(row.textContent, 'Add it to my calendar');
  assert.doesNotMatch(row.textContent, /remind/, 'nothing is claimed before the file is even saved');
  btn(/^Add it to my calendar$/).click();
  assert.deepEqual(JSON.parse(JSON.stringify(r.files)), [{ day: 0, min: 1140 }], 'the file for Sundays at 7 pm');
  assert.match(row.textContent, /^Open sunday-reset\.ics to add Sundays at 7 pm to your calendar\./);
  assert.doesNotMatch(row.textContent, /reminds/, 'a downloaded file isn’t a reminder yet');
  btn(/^Done, it’s in my calendar$/).click();
  assert.equal(row.textContent, 'Your calendar reminds you each week.');
  /* a new time after that: the file says the old one, so it's asked for again */
  a.resetAt = { day: 1, min: 540 };
  const again = r.onbCalRow(a);
  assert.equal(again.textContent, 'Add it to my calendar');
  again.all((x) => x.tagName === 'BUTTON')[0].click();
  assert.match(again.textContent, /Open sunday-reset\.ics to add Mondays at 9 am to your calendar\./, 'the real day and time');
  /* the plan says nothing reminds them yet, before anything is saved */
  assert.equal(r.onbCalRow(answers(), { none: 'Nothing reminds you yet.' }).textContent, 'Nothing reminds you yet.Add it to my calendar');
});

test('the setup’s new words and notes keep the copy rules', () => {
  const src = app('  /* == V11-2: your week fills in (Oct 20, the setup made to read as Sunday Reset) ==', '  /* (the end of your week fills in) */');
  assert.doesNotMatch(src, /\u2014|\u2013|-{2}/, 'no long dashes or double hyphens');
  for (const s of src.match(/'[^'\n]*'/g) || []) assert.doesNotMatch(s, /\b(just|really|simply|actually|easily|please)\b/i, s);
  assert.match(src, /'Done, it’s in my calendar'/);
  assert.doesNotMatch(src.replace(/'Add it to my calendar'/g, ''), /\bto do\b/i, 'to-do, with its hyphen');
});

/* the desk's moment: on a window wide enough, the reset step stands beside the desk, which shows the week of the first
   reset with the Sunday Reset dropped into its day; nothing is saved, and leaving the step puts the board back as it was */
test('the reset step beside the desk: next week, the Sunday Reset dropped into its day, and the board back after', () => {
  const built = D.buildState({ name: 'Pat', partner: '', kids: [], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 }, cares: [], help: { dinners: true, together: true }, meals: { breakfast: true, lunch: true } }, today);
  const script = `
    const FEEL = true, noDesk = false, today = __today, nowMin = 600, OB = __OB;
    let state = { n: 'real', dates: {} }, undoStack = ['u0'], redoStack = [], ready = true;
    const view = { got: {}, mode: 'today', zoom: 'day', focus: today, phone: false, list: false, preview: null };
    const sheet = { hidden: false };
    const $ = (id) => (id === 'sheet' ? sheet : null);
    const document = { body: { classList: { add() {}, remove() {} } } };
    const cache = { clear() {} }, lands = [], window = { innerWidth: 1440, innerHeight: 900 };
    const render = () => {}, dissolve = () => {}, phoneDay = () => false, deskTag = () => {};
    const setMode = (m) => { view.mode = m; }, setZoom = (z, f) => { view.zoom = z; if (f) view.focus = f; };
    const W = { holdBack: (d, k) => lands.push(['hold', d, k]), land: (d, k) => lands.push(['land', d, k]) };
    const setTimeout = (fn) => { fn(); return 0; };
    const onbBuild = (su) => { su.built = JSON.parse(JSON.stringify(__built)); };
    ${app('  /* The Sunday Reset as a block on its day, about 20 minutes', '  /* The week the answers so far make, with what the tries put on it')}
    ${app('  /* == V11: the week behind the setup', '  /* the Sunday Reset\'s name on the desk')}
    ({ view, lands, get state() { return state; }, behindFor, inSetupBehind, onbDeskFits });`;
  const r = runInNewContext(script, { M, D, __OB: OB, __today: today, __built: built });
  const su = { a: { resetAt: { day: 0, min: 1140 } }, at: 'reset', desk: true };
  r.view.got.setup = su;
  assert.equal(r.onbDeskFits(), true, 'a 1440 by 900 window has room beside the card');
  r.behindFor(su);
  const first = '2026-10-25';
  assert.equal(r.view.focus, first, 'the desk turns to the week of the first reset');
  assert.equal(r.view.zoom, 'week');
  const add = ((r.state.dates[first] || {}).adds || []).find((x) => x.name === 'Sunday Reset');
  assert.ok(add, 'the Sunday Reset is on that Sunday');
  assert.equal(add.start, 1140, 'at 7 pm');
  assert.deepEqual(plain(r.lands.map((x) => x[0])), ['hold', 'land'], 'held back, then dropped into its day');
  assert.equal(r.lands[1][2], 'add:' + add.id);
  assert.equal(r.inSetupBehind(), true, 'nothing saves while the desk shows it');
  /* Back to an earlier step: the board as it was, on the week it was showing */
  su.at = 'todo'; su.desk = false;
  r.behindFor(su);
  assert.equal(r.state.n, 'real');
  assert.equal(r.view.focus, today);
  assert.equal(r.inSetupBehind(), false);
});
