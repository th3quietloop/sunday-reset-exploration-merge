// Tries to break the pick up and place loop: a toast mid drag, a drop under a toast, a drag right after a
// step opens, a flick, a swipe along a list of tiles, a slow drag, off screen and back, a locked block,
// time already gone, off the board, a second finger, a pinch, a scroll then a drag, Escape, a touch the
// browser takes back, a redraw mid drag, two drags in a row, a tap whose click lands on what it opened, a
// stretch aimed at an edge a finger can't see, Add from the place panel, and leaving a made up board.
//   node scripts/gate/break.mjs -sizes phone,ipadP,mac1 [-only toast,second] [-n 5] [-calm] [-big]
//   [-url http://localhost:4467/ -port 9467 -newtab] (otherwise it builds, serves, and starts Chrome itself)
import { connect, newTab, sleep } from './lib/cdp.mjs';
import { makeGate, SIZES, KNOWN } from './lib/core.mjs';
import { parseArgs, runDir, session } from './lib/session.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const N = +(args.n || 5);
const dir = typeof args.out === 'string' && /\.json$/.test(args.out) ? dirname(args.out) : runDir(args, 'break');
const OUT = typeof args.out === 'string' && /\.json$/.test(args.out) ? args.out : join(dir, 'break.json');
mkdirSync(dirname(OUT), { recursive: true });
const opts = { at: args.at === 'real' ? null : args.at != null ? +args.at : 600, calm: !!args.calm, big: !!args.big };
const J = (v) => JSON.stringify(v);
const ses = await session(args, 'break');
const c = await connect(ses.port, args.newtab || ses.own ? { target: await newTab(ses.port) } : {});
const g = makeGate({ c, url: ses.url, opts, shots: args.shots || join(dir, 'shots') });
const W = (size) => SIZES[size].w, H = (size) => SIZES[size].h;

/* a second finger: where the plan found a place for it, or the middle top of the screen */
const twoFinger = (size, p, extra) => Object.assign({ second: (p && p.second) || [Math.round(W(size) * 0.5), Math.round(H(size) * 0.3)], secondAt: 10 }, extra || {});
/* a swipe along the list the piece sits in: 160 px the way the list scrolls, quickly, with no press first */
const alongList = (p) => { const a = p.from.axis; p.to = a === 'x' ? { x: p.from.x - 160, y: p.from.y } : { x: p.from.x, y: Math.max(8, p.from.y - 160) }; p.to.slot = null; p.to.sel = null; p.to.climb = false; };
/* each scenario: the path it runs on, its input (touch only where it says), style, plan options, what it
   does to the drag (hooks, from the plan), and what should happen; custom ones run on their own */
const SCEN = {
  toast: { path: 'reset-yours', hooks: () => ({ at: { i: 1, fn: () => c.ev(`SR.toast('Something else happened', '')`) } }) },
  toastundo: { path: 'reset-todo', hooks: () => ({ at: { i: 8, fn: () => c.ev(`SR.toast('Walk is back where it was', 'good', { label: 'Undo', fn: () => {} })`) } }) },
  /* toasts with Undo sit over part of the week (drops made a moment ago); the next drop aims at a row they cover */
  undercover: { path: 'reset-yours', custom: (size, input, i) => underToast(size, input, i) },
  redraw: { path: 'reset-yours', hooks: () => ({ at: { i: 3, fn: () => c.ev(`SR.render()`) } }) },
  /* the step drawn again (its title takes focus) the moment the finger lands on a tile, before it moves */
  redraw0: { path: 'reset-yours', hooks: () => ({ afterDown: () => c.ev(`SR.goStep(SR.view.reset.step)`) }) },
  redraw0todo: { path: 'reset-todo', hooks: () => ({ afterDown: () => c.ev(`SR.render()`) }) },
  redrawbench: { path: 'lib-week', hooks: () => ({ at: { i: 12, fn: () => c.ev(`SR.render()`) } }) },
  minute: { path: 'lib-week', hooks: () => ({ at: { i: 10, fn: () => c.ev(`__reset.at(SR.nowMin + 1)`) } }) },
  freshstep: { path: 'reset-yours', planOpts: (i) => ({ reopen: [0, 60, 150, 300, 600][i % 5] }) },
  flick: { path: 'reset-yours', style: 'flick' },
  flickbench: { path: 'lib-week', style: 'flick' },
  flickmove: { path: 'move-week', style: 'flick' },
  /* a finger that swipes along a list of tiles scrolls the list: nothing lifts, nothing lands */
  swipetile: { path: 'reset-yours', touch: true, style: 'flick', expect: 'scroll', mutatePlan: () => alongList },
  swipemeal: { path: 'reset-meals', touch: true, style: 'flick', expect: 'scroll', mutatePlan: () => alongList },
  slow: { path: 'reset-todo', style: 'slow' },
  press: { path: 'reset-people', style: 'press' },
  pause: { path: 'move-week', style: 'pause' },
  /* a hand that aims once, before the desk leans in, and never looks again: it lands where the outline
     said, or nothing lands and a toast says why */
  blind: { path: 'lib-week', style: 'blind', expect: 'told' },
  offscreen: { path: 'reset-yours', hooks: (size) => ({ offscreen: [W(size) + 30, Math.round(H(size) * 0.4)] }) },
  /* let go while the pointer is past the window's edge: it was never over a slot when it let go */
  offscreenup: { path: 'reset-yours', expect: 'nothing', mutatePlan: (size) => (p) => { p.to = { x: W(size) + 40, y: Math.round(H(size) * 0.45) }; } },
  offscreenupbench: { path: 'lib-week', expect: 'nothing', mutatePlan: (size) => (p) => { p.to = { x: W(size) + 40, y: Math.round(H(size) * 0.45) }; } },
  locked: { path: 'reset-yours', planOpts: () => ({ target: 'locked' }), expect: 'refuse-or-beside' },
  lockedmove: { path: 'lib-week', planOpts: () => ({ target: 'locked' }), expect: 'refuse-or-beside' },
  past: { path: 'reset-yours', planOpts: () => ({ target: 'past' }), expect: 'past' },
  offboard: { path: 'reset-yours', planOpts: () => ({ target: 'off' }), expect: 'nothing' },
  offboardbench: { path: 'lib-week', planOpts: () => ({ target: 'off' }), expect: 'nothing' },
  putback: { path: 'reset-todo', planOpts: () => ({ target: 'panel' }), expect: 'nothing' },
  second: { path: 'reset-yours', touch: true, planOpts: () => ({ second: 'block' }), hooks: (size, p) => twoFinger(size, p) },
  secondopen: { path: 'reset-yours', touch: true, planOpts: () => ({ second: 'open' }), hooks: (size, p) => twoFinger(size, p) },
  secondbench: { path: 'lib-week', touch: true, planOpts: () => ({ second: 'block' }), hooks: (size, p) => twoFinger(size, p) },
  secondlift: { path: 'reset-yours', touch: true, planOpts: () => ({ second: 'block' }), hooks: (size, p) => twoFinger(size, p, { secondUpAt: 18 }) },
  pinch: { path: 'reset-yours', touch: true, planOpts: () => ({ second: 'open' }), hooks: (size, p) => twoFinger(size, p, { secondAt: 8, secondMove: [3, -2] }) },
  /* the meal board: a second finger rests on the page, moves a little, and lifts before the first */
  secondmeal: { path: 'reset-meals', touch: true, hooks: (size) => ({ second: [Math.round(W(size) * 0.85), Math.round(H(size) * 0.2)], secondAt: 6, secondMove: [1, 1], secondUpAt: 14 }) },
  secondsetup: { path: 'setup-try', touch: true, hooks: (size) => ({ second: [Math.round(W(size) * 0.85), Math.round(H(size) * 0.15)], secondAt: 6, secondMove: [1, 1], secondUpAt: 14 }) },
  /* a second finger lands on the board while a block on it is being moved (a thumb on an iPad) */
  pinchmove: { path: 'move-week', touch: true, hooks: (size) => ({ second: [Math.round(W(size) * 0.6), Math.round(H(size) * 0.25)], secondAt: 8, secondMove: [3, -2] }) },
  secondmove: { path: 'move-week', touch: true, planOpts: () => ({ second: 'open' }), hooks: (size, p) => twoFinger(size, p, { secondAt: 8, secondUpAt: 16 }) },
  cancel: { path: 'reset-yours', touch: true, hooks: () => ({ cancel: true }), expect: 'nothing' },
  cancelbench: { path: 'lib-week', touch: true, hooks: () => ({ cancel: true }), expect: 'nothing' },
  cancelmeal: { path: 'reset-meals', touch: true, hooks: () => ({ cancel: true }), expect: 'nothing', after: () => tapTitle() },
  cancelsetup: { path: 'setup-try', touch: true, hooks: () => ({ cancel: true }), expect: 'nothing-setup' },
  cancelmove: { path: 'move-week', touch: true, hooks: () => ({ cancel: true }), expect: 'nothing' },
  escape: { path: 'reset-yours', hooks: () => ({ beforeUp: () => c.key('Escape', 'Escape', 27) }), expect: 'nothing' },
  escapemove: { path: 'move-week', hooks: () => ({ beforeUp: () => c.key('Escape', 'Escape', 27) }), expect: 'nothing', zoomStays: true },
  escapemeal: { path: 'reset-meals', hooks: () => ({ beforeUp: () => c.key('Escape', 'Escape', 27) }), expect: 'nothing' },
  escapesetup: { path: 'setup-try', hooks: () => ({ beforeUp: () => c.key('Escape', 'Escape', 27) }), expect: 'nothing-setup' },
  scrollthen: { path: 'reset-people', touch: true, before: 'swipe' },
  /* a stretch aimed at an edge you can't see exactly: a press 6 px inside the end (and, with a finger,
     8 px past it), on the week, the day, and the phone's day */
  stretchin: { path: 'stretch-week', planOpts: () => ({ edge: -6 }) },
  stretchout: { path: 'stretch-week', touch: true, planOpts: () => ({ edge: 8 }) },
  stretchdayin: { path: 'stretch-day', planOpts: () => ({ edge: -6 }) },
  stretchdayout: { path: 'stretch-day', touch: true, planOpts: () => ({ edge: 8 }) },
  /* (on a phone's one day the edge is inside the block only: a sideways swipe on open board changes the day) */
  phonestretch: { path: 'phone-stretch', touch: true, planOpts: (i) => ({ edge: i % 2 ? -12 : -6 }) },
  /* a tap: the panel it opens is the tile's own, and the click that follows the touch lands on nothing in it */
  taptile: { path: 'reset-yours', touch: true, custom: (size, input, i) => tapTile(size, i) },
  /* a tap on open time opens its panel, and places nothing */
  tapslot: { path: 'move-week', touch: true, custom: (size, input, i) => tapSlot(size, i) },
  /* Add from the place panel: the copy flies from the card, at the card's size, to where the block lands */
  placeflight: { path: 'reset-yours', custom: (size, input, i) => placeFlight(size, input, i) },
  /* Block library puts itself away after a minute unused: a block on the week is being moved when it does
     (the page's clock is moved on a minute the moment the press lands; the tidy check runs every 5 s) */
  tidy: { path: 'move-week-lib', style: 'long', hooks: () => ({ afterDown: () => c.ev(`(() => { if (!window.__realNow) { window.__realNow = Date.now; } const r = window.__realNow; Date.now = () => r() + 65000; return 1; })()`) }), after: () => c.ev(`(() => { if (window.__realNow) Date.now = window.__realNow; return 1; })()`) },
  rapid: { path: 'reset-yours', rapid: true },
  rapidbench: { path: 'lib-week', rapid: true },
  /* back to the real board from a made up one, then the day, the week, and the month: nothing throws */
  leave: { path: 'reset-yours', custom: (size) => leavePreview(size) }
};

const results = [], summary = {};
const say = (s) => process.stdout.write(s + '\n');
const sizes = String(args.sizes || 'phone').split(',');
const only = args.only ? String(args.only).split(',') : Object.keys(SCEN);
const verdict = (why, soft) => ({ pass: !why.length, why, soft: soft || [] });
const pageErrors = (e0) => c.errors.slice(e0).filter((e) => !KNOWN(e));

/* a swipe up on the list's own background (a heading or a line of words, not a tile), then the finger lifts */
async function swipeList() {
  const p = JSON.parse(await c.ev(`JSON.stringify((() => { const b = document.getElementById('rack-body'); if (!b) return null; const br = b.getBoundingClientRect(); const h = Array.from(b.querySelectorAll('*')).find((e) => e.offsetParent && !e.closest('.tile, button') && e.children.length === 0 && (e.textContent || '').trim().length > 6 && e.getBoundingClientRect().top > br.top + 10 && e.getBoundingClientRect().bottom < br.bottom - 120); if (!h) return null; const r = h.getBoundingClientRect(); return { x: Math.round(r.left + 6), y: Math.round(r.top + r.height / 2) }; })())`));
  if (!p) return 'no place to swipe';
  await c.touch('touchStart', [{ x: p.x, y: p.y, id: 1 }]);
  for (let k = 1; k <= 8; k++) { await c.touch('touchMove', [{ x: p.x, y: p.y - k * 14, id: 1 }]); await sleep(12); }
  await c.touch('touchEnd', []);
  return 'swiped';
}
/* the next tap after a cancel, on the meal board's title: it does only its own thing */
async function tapTitle() {
  const t = JSON.parse(await c.ev(`JSON.stringify((() => { const e = document.querySelector('.c-mat h1, .c-mat h2, .c-mat-head'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + 20), y: Math.round(r.top + r.height / 2) }; })())`));
  if (!t) return;
  const before = await c.ev(`JSON.stringify(__mx.snap())`);
  if (SIZES[cur.size].mobile) await c.tap(t.x, t.y); else await c.click(t.x, t.y);
  await sleep(700);
  const after = await c.ev(`JSON.stringify(__mx.snap())`);
  const d = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${after}))`));
  if (d.meals.length || d.dinners.length || d.added.length) cur.afterTap = 'the next tap changed the board: ' + J({ meals: d.meals.map((m) => m.key), dinners: d.dinners.map((x) => x.date) });
}
const cur = { size: null, afterTap: null };

/* == custom tries == */
async function underToast(size, input, i) {
  const e0 = c.errors.length;
  await c.ev(`(async () => { document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()); return 1; })()`);
  /* the toasts three quick drops leave, each with its Undo, as they sit for six seconds after a drop */
  for (const w of ['Walk on Saturday at 1:30 pm', 'Run on Friday at 7 am', 'Reading on Thursday at 8 pm']) { await c.ev(`SR.toast(${J(w)}, 'good', { label: 'Undo', fn: () => {} })`); await sleep(120); }
  await sleep(400);
  const cover = JSON.parse(await c.ev(`JSON.stringify((() => {
    const out = [];
    const where = SR.view.zoom === 'day' ? 'day' : 'week';
    (where === 'day' ? [null] : [0, 1, 2, 3, 4, 5, 6]).forEach((row) => { for (let m = 360; m <= 1380; m += 30) { const p = __mx.slot(where, row, m); if (p.behind || p.x < 4 || p.y < 4 || p.x > innerWidth - 4 || p.y > innerHeight - 4) continue; const e = document.elementFromPoint(p.x, p.y); if (e && e.closest && e.closest('#toasts')) { const date = where === 'day' ? SR.view.focus : __mx.week()[row]; if (date <= SR.today) continue; const fit = SR.M.canPlace(SR.state, date, 60, m - 30); if (fit && fit.ok) out.push({ row, m, x: p.x, y: p.y, date }); } } });
    return out;
  })())`));
  if (!cover.length) return { skip: 'no open part of the board under a toast at this size' };
  const t = cover[i % cover.length];
  /* (blind: the hand ends where the toast was, never re-aimed out from under it; where it lands is judged
     against the outline, not the day aimed at, since the desk leans in under a carried block. The plan is
     asked for a tile only, and the covered spot is the target) */
  const r = await g.attempt(size, input, 'reset-yours', i, 'blind', {}, { planOpts: { target: 'panel' }, expect: 'land', mutatePlan: (pl) => { pl.to = { x: t.x, y: t.y, min: t.m, row: t.row }; }, tag: 'undercover' });
  if (r && r.verdict) r.verdict.why = r.verdict.why.concat(pageErrors(e0).length && !r.verdict.why.some((w) => /^errors/.test(w)) ? ['errors: ' + pageErrors(e0).map((e) => e.text.slice(0, 120)).join(' | ')] : []);
  if (r && r.verdict) r.verdict.pass = !r.verdict.why.length;
  return r;
}
async function tapTile(size, i) {
  const e0 = c.errors.length;
  await c.ev(`(async () => { if (SR.view.sel) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 300)); } return 1; })()`);
  const p = JSON.parse(await c.ev(`JSON.stringify(__mx.tilePlan(${i}))`));
  if (!p || p.skip) return { skip: (p && p.skip) || 'no tile' };
  await c.ev(`(() => { window.__clicks = []; if (!window.__clickRec) { window.__clickRec = true; document.addEventListener('click', (e) => { const t = e.target; window.__clicks.push({ in: !!(t.closest && t.closest('#side')), el: (t.tagName || '') + '.' + String(t.className || '').split(' ')[0], tile: !!(t.closest && t.closest('.tile')) }); }, true); } return 1; })()`);
  const before = await c.ev(`JSON.stringify(__mx.snap())`);
  await c.touch('touchStart', [{ x: p.from.x, y: p.from.y, id: 1 }]);
  await sleep(70);
  await c.touch('touchEnd', []);
  await sleep(900);
  /* a tap the page saw last longer than the press that lifts (a busy machine) was a press: not judged */
  const ptr = JSON.parse(await c.ev(`JSON.stringify(__mx.ptr || null)`));
  if (ptr && ptr.up && ptr.up - ptr.down > 250) { await c.ev(`(async () => { if (SR.view.sel) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 300)); } return 1; })()`); return { skip: 'the tap lasted ' + (ptr.up - ptr.down) + ' ms (a busy machine): not a tap' }; }
  const after = await c.ev(`JSON.stringify(__mx.snap())`);
  const d = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${after}))`));
  const st = JSON.parse(await c.ev(`JSON.stringify({ clicks: window.__clicks, sel: SR.view.sel ? { type: SR.view.sel.type, date: SR.view.sel.date || null } : null })`));
  const why = [];
  if (d.added.length) why.push('a tap placed ' + d.added.map((x) => x.name).join(', '));
  if (!st.sel || st.sel.type !== 'place') why.push('the tap opened ' + (st.sel ? 'the ' + st.sel.type + ' panel' : 'nothing') + ', not the place panel');
  const stray = st.clicks.filter((x) => x.in);
  if (stray.length) why.push('the tap\'s click landed in the panel it opened (' + stray.map((x) => x.el).join(', ') + ')');
  const errs = pageErrors(e0);
  if (errs.length) why.push('errors: ' + errs.map((e) => e.text.slice(0, 120)).join(' | '));
  await c.ev(`(async () => { if (SR.view.sel) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 300)); } return 1; })()`);
  return { size, input: 'touch', path: 'reset-yours', i, verdict: verdict(why), clicks: st.clicks, sel: st.sel };
}
async function tapSlot(size, i) {
  const e0 = c.errors.length;
  await c.ev(`(async () => { if (SR.view.sel || SR.view.pick) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 300)); } return 1; })()`);
  const spots = JSON.parse(await c.ev(`JSON.stringify(__mx.placeSpots(SR.view.zoom === 'day' ? 'day' : 'week', 60, {}).filter((s) => { const h = World.pick(s.x, s.y); return !h; }))`));
  if (!spots.length) return { skip: 'no bare open time on screen' };
  const s = spots[(i * 3) % spots.length];
  const before = await c.ev(`JSON.stringify(__mx.snap())`);
  await c.tap(s.x, s.y);
  await sleep(900);
  const after = await c.ev(`JSON.stringify(__mx.snap())`);
  const d = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${after}))`));
  const sel = JSON.parse(await c.ev(`JSON.stringify(SR.view.sel ? { type: SR.view.sel.type } : null)`));
  const why = [];
  if (d.added.length || d.moved.length) why.push('a tap on open time changed the board: ' + d.added.map((x) => x.name).concat(d.moved.map((x) => x.name + ' moved')).join(', '));
  if (!sel) why.push('the tap opened nothing');
  const errs = pageErrors(e0);
  if (errs.length) why.push('errors: ' + errs.map((e) => e.text.slice(0, 120)).join(' | '));
  if (d.added.length) { await c.ev(`__mx.quietUndo()`); await sleep(300); }
  await c.ev(`(async () => { if (SR.view.sel) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 300)); } return 1; })()`);
  return { size, input: 'touch', path: 'move-week', i, verdict: verdict(why), sel };
}
async function placeFlight(size, input, i) {
  const e0 = c.errors.length;
  /* the place panel for a block, on a day of this week with room, then its Add */
  const opened = JSON.parse(await c.ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    if (SR.view.sel) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(300); }
    const pal = SR.state.palette.filter((p) => !p.hidden && p.dur <= 90);
    const p = pal[${i} % pal.length];
    SR.openSel({ type: 'place', spec: { kind: 'block', id: p.id } });
    await wait(700);
    const add = Array.from(document.querySelectorAll('#side button.go.wide, #side button')).find((b) => b.offsetParent && /^Add/.test(b.textContent.trim()) && !b.disabled);
    const hero = document.querySelector('#side .bprev');
    return JSON.stringify({ name: p.name, add: add ? __mx.rect(add) : null, hero: hero ? __mx.rect(hero) : null });
  })()`));
  if (!opened.add) { await c.key('Escape', 'Escape', 27); return { skip: 'no Add button in the place panel' }; }
  /* the copy's first box, its last center, and, the frame after it's gone, where the block it hands over to
     is on screen (the block drops in from a hand's height over its slot at that moment) */
  await c.ev(`(() => {
    window.__fly = []; const had = Object.keys(__mx.adds());
    const blockNow = () => { const id = Object.keys(__mx.adds()).find((k) => !had.includes(k)); if (!id) return null; let at = null; [World.debug.week.blocks, World.debug.dayb.blocks].forEach((map) => map.forEach((m) => { const b = m.userData.orig || m.userData.block || {}; if (at || b.add !== id || !m.visible) return; const s = __mx.meshState(m); if (s && s.screen) at = { x: s.screen.x, y: s.screen.y }; })); return at; };
    const ob = new MutationObserver((ms) => ms.forEach((m) => {
      m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.classList.contains('flying')) { const r = n.getBoundingClientRect(); window.__fly.push({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), t: performance.now() }); const tick = () => { if (!n.isConnected) return; const q = n.getBoundingClientRect(); window.__fly.last = { x: Math.round(q.left + q.width / 2), y: Math.round(q.top + q.height / 2), t: performance.now() }; requestAnimationFrame(tick); }; requestAnimationFrame(tick); } });
      m.removedNodes.forEach((n) => { if (n.nodeType === 1 && n.classList.contains('flying')) requestAnimationFrame(() => { window.__fly.meet = blockNow(); }); });
    }));
    ob.observe(document.getElementById('app'), { childList: true }); window.__flyOb = ob; return 1;
  })()`);
  const before = await c.ev(`JSON.stringify(__mx.snap())`);
  if (input === 'touch') await c.tap(opened.add.cx, opened.add.cy); else await c.click(opened.add.cx, opened.add.cy);
  await sleep(1300);
  const after = await c.ev(`JSON.stringify(__mx.snap())`);
  const d = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${after}))`));
  const fly = JSON.parse(await c.ev(`(() => { if (window.__flyOb) window.__flyOb.disconnect(); return JSON.stringify({ starts: window.__fly, last: window.__fly.last || null, meet: window.__fly.meet || null }); })()`));
  const why = [];
  if (d.added.length !== 1) why.push('Add placed ' + d.added.length + ' blocks');
  const a = d.added[0];
  let landed = null;
  if (a) {
    await c.ev(`__mx.stepDesk(240, 0.05)`);
    const dr = JSON.parse(await c.ev(`JSON.stringify(__mx.drawn(${J(a.id)}))`));
    if (!dr.good) why.push('the block is not drawn after it settles');
    const bs = JSON.parse(await c.ev(`JSON.stringify(__mx.blockScreen(${J(a.id)}))`))[0];
    landed = bs ? bs.mid : null;
  }
  /* the copy (when the desk draws one): it starts where the card was, at the card's size, and ends where the
     block it hands over to is, the frame it hands over (the camera can still be settling after that, and
     the block with it) */
  const s0 = fly.starts && fly.starts[0];
  if (s0) {
    if (s0.w < 20 || (s0.x < 4 && s0.y < 4)) why.push('the copy started in the corner at ' + s0.w + ' px wide');
    if (!fly.meet) why.push('no block showed the frame the copy handed over');
    else if (fly.last && Math.hypot(fly.last.x - fly.meet.x, fly.last.y - fly.meet.y) > 60) why.push('the copy ended ' + Math.round(Math.hypot(fly.last.x - fly.meet.x, fly.last.y - fly.meet.y)) + ' px from the block it handed over to');
  }
  const ts = JSON.parse(await c.ev(`JSON.stringify(__mx.since(0).toasts.slice(-2).map((t) => t.text))`));
  if (a && !ts.some((t) => t.indexOf(a.name) >= 0)) why.push('no toast said where it went');
  const errs = pageErrors(e0);
  if (errs.length) why.push('errors: ' + errs.map((e) => e.text.slice(0, 120)).join(' | '));
  if (a) { await c.ev(`__mx.quietUndo()`); await sleep(300); }
  return { size, input, path: 'place-panel', i, verdict: verdict(why), fly, landed };
}
async function leavePreview(size) {
  const e0 = c.errors.length;
  await c.ev(`(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)); if (SR.view.reset) { SR.leaveReset(); await wait(300); } SR.endPreview(); await wait(800); for (const z of ['day', 'week', 'month', 'week']) { SR.setZoom(z); await wait(500); } return 1; })()`);
  const errs = pageErrors(e0);
  const why = errs.length ? ['leaving a made up board threw: ' + errs.map((e) => e.text.slice(0, 140)).join(' | ')] : [];
  /* back to the made up board for the next tries */
  await g.load(size);
  return { size, input: 'none', path: 'leave', i: 0, verdict: verdict(why) };
}

for (const size of sizes) {
  cur.size = size;
  say(`== ${size} ${await g.load(size)}`);
  for (const id of only) {
    const s = SCEN[id];
    if (!s) { say('no scenario ' + id); continue; }
    const touchy = SIZES[size].mobile;
    const input = s.touch ? (touchy ? 'touch' : null) : (args.input || (touchy ? 'touch' : 'mouse'));
    if (!input) { say(`   ${id}: needs a finger, not on ${size}`); continue; }
    const setup = await g.setupPath(s.path);
    if (setup.skip) { say(`   ${id}: ${s.path} not here (${setup.skip})`); summary[id + ' | ' + size] = { na: setup.skip }; continue; }
    const key = `${id} | ${size} | ${input}`;
    summary[key] = { pass: 0, n: 0, why: [], soft: [] };
    const reps = id === 'leave' ? 1 : N;
    for (let i = 0; i < reps; i++) {
      let r;
      cur.afterTap = null;
      try {
        if (s.custom) r = await s.custom(size, input, i);
        else {
          const extra = { planOpts: s.planOpts ? s.planOpts(i) : {}, tag: id, clearToasts: !/^toast|^rapid/.test(id) };
          if (s.expect === 'nothing' || s.expect === 'refuse-or-beside' || s.expect === 'past' || s.expect === 'scroll' || s.expect === 'told') extra.expect = s.expect;
          if (s.expect === 'nothing-setup') { extra.expect = 'post'; extra.mutatePlan = (p) => { p.post = "!document.querySelector('.onb-float') && !document.querySelector('.onb-grip')"; }; }
          if (s.mutatePlan) extra.mutatePlan = s.mutatePlan(size);
          if (s.before === 'swipe') extra.beforeDrag = async () => { extra.swiped = await swipeList(); };
          const zoom0 = s.zoomStays ? await c.ev(`SR.view.zoom`) : null;
          r = await g.attempt(size, input, s.path, i, s.style || 'normal', s.hooks ? (p) => s.hooks(size, p) : {}, extra);
          if (s.after) await s.after();
          if (r && extra.swiped) r.swiped = extra.swiped;
          if (r && r.verdict && cur.afterTap) { r.verdict.pass = false; r.verdict.why.push(cur.afterTap); }
          /* Escape put the carried thing down; it never zoomed the desk out as well */
          if (r && r.verdict && s.zoomStays) { const z1 = await c.ev(`SR.view.zoom`); if (z1 !== zoom0) { r.verdict.pass = false; r.verdict.why.push('Escape zoomed out to ' + z1 + ' as well'); await c.ev(`SR.setZoom(${J(zoom0)})`); await sleep(600); } }
          if (r && r.where) r.benchAfter = await c.ev(`World.benchOn`);
          if (s.rapid && r && !r.skip && !r.error) {
            /* the next drag at once, before the last one has landed */
            const r2 = await g.attempt(size, input, s.path, i + 1, 'normal', {}, { tag: id + '-2' });
            r.second = r2 && { verdict: r2.verdict, diff: r2.diff, skip: r2.skip };
            if (r2 && r2.verdict && !r2.verdict.pass) { r.verdict.pass = false; r.verdict.why.push('the drag right after: ' + r2.verdict.why.join('; ')); }
          }
        }
      } catch (e) { r = { error: String(e && e.stack || e).slice(0, 300) }; }
      if (!r) r = { skip: 'nothing to run' };
      if (r.skip || r.error) { say(`   ${key} #${i}: ${r.skip ? 'skip ' + r.skip : 'ERROR ' + r.error}`); results.push(Object.assign({ size, scenario: id, i }, r)); if (r.error) { await g.load(size); await g.setupPath(s.path); } continue; }
      summary[key].n++;
      if (r.verdict.pass) summary[key].pass++; else summary[key].why.push('#' + i + ': ' + r.verdict.why.join('; '));
      results.push(Object.assign({ scenario: id }, r));
      say(`   ${key} #${i}: ${r.verdict.pass ? 'pass' : 'FAIL ' + r.verdict.why.join('; ')}`);
      const again = await g.setupPath(s.path);
      if (again.skip) { await g.load(size); await g.setupPath(s.path); }
    }
    writeFileSync(OUT, J({ at: new Date().toISOString(), url: ses.url, opts, summary, results }, null, 1));
  }
}
writeFileSync(OUT, J({ at: new Date().toISOString(), url: ses.url, opts, summary, results }, null, 1));
try { await c.closePage(); } catch (e) { /* fine */ }
c.close();
await ses.stop();
say('\nSUMMARY');
let failed = 0;
for (const [k, v] of Object.entries(summary)) { if (v.na) { say(`${k}: not here (${v.na})`); continue; } if (v.pass < v.n) failed++; say(`${k}: ${v.pass} of ${v.n}` + (v.why.length ? '\n     ' + v.why.slice(0, 5).join('\n     ') : '')); }
say('results: ' + OUT);
process.exit(failed ? 1 : 0);
