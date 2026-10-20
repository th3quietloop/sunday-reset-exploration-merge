// The drag gate's engine: load a size, open a path, run one attempt with real input, and judge it.
// Used by gate.mjs (the matrix) and break.mjs (the tries to break it).
import { sleep, pathPoints } from './cdp.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SIZES = {
  mac1: { w: 1440, h: 900, mobile: false, dpr: 2, label: 'Mac 1440x900' },
  mac2: { w: 1280, h: 800, mobile: false, dpr: 2, label: 'Mac 1280x800' },
  ipadL: { w: 1180, h: 820, mobile: true, dpr: 2, label: 'iPad 1180x820' },
  ipadP: { w: 820, h: 1180, mobile: true, dpr: 2, label: 'iPad 820x1180' },
  duoOpen: { w: 951, h: 669, mobile: true, dpr: 3, label: 'Duo open 951x669' },
  duoFold: { w: 466, h: 678, mobile: true, dpr: 3, label: 'Duo folded 466x678' },
  duoSafari: { w: 386, h: 580, mobile: true, dpr: 3, label: 'Duo in Safari 386x580' },
  phone: { w: 390, h: 844, mobile: true, dpr: 3, label: 'iPhone 390x844' },
  phoneL: { w: 844, h: 390, mobile: true, dpr: 3, label: 'iPhone 844x390' }
};
export const STYLES = {
  normal: { steps: 30, gap: 16, hold: 120, settle: 120 },
  slow: { steps: 90, gap: 28, hold: 250, settle: 300, wobble: 1.5 },
  flick: { steps: 6, gap: 8, hold: 40, settle: 0, reaim: 60, swipe: true },
  pause: { steps: 30, gap: 16, hold: 120, settle: 650 },
  /* a finger held still a moment before it moves, the way a person feels for the tile */
  press: { steps: 30, gap: 16, hold: 450, settle: 120 },
  /* a hand that aims at where the slot was before the desk leaned in, and never looks again */
  blind: { steps: 30, gap: 16, hold: 120, settle: 120, blind: true },
  /* a long, careful carry (about seven seconds), for what happens on a timer while a block is in hand */
  long: { steps: 220, gap: 30, hold: 200, settle: 300, wobble: 1 }
};
/* V11 lifts a tile out of a list that scrolls after a short press (300 ms) under a finger, so a finger in
   the gate presses that long before it carries, the way a person does; a quicker finger (flick) is a
   swipe, which scrolls the list when it goes along it (the expectation says so, attempt below) */
export const TOUCH_HOLD = 420;
/* errors that aren't the app's: a server with no API (/api/config), a missing icon, a resource the page
   can do without */
export const KNOWN = (e) => /api\/config|favicon|Failed to load resource: net::ERR_|the server responded with a status of 404/.test((e.text || '') + ' ' + (e.url || ''));
const J = (v) => JSON.stringify(v);

export function makeGate({ c, url, opts = {}, shots }) {
  const PROBE = readFileSync(join(HERE, 'probe.js'), 'utf8');
  const PATHS = readFileSync(join(HERE, 'paths.js'), 'utf8');
  const SHOTS = shots || join(tmpdir(), 'sunday-reset-gate', 'shots');
  mkdirSync(SHOTS, { recursive: true });

  async function load(size, extra = {}) {
    const s = SIZES[size];
    await c.viewport(s.w, s.h, s.mobile, s.dpr);
    await c.nav(url + (url.includes('?') ? '&' : '?') + 'debug', 2600);
    await c.ev(PROBE); await c.ev(PATHS);
    return await c.ev(`(async()=>JSON.stringify(await __mx.boot(${J(Object.assign({}, opts, extra))})))()`);
  }
  async function inject() {
    const ok = await c.ev(`!!(window.__mx && __mx.paths)`);
    if (!ok) { await c.ev(PROBE); await c.ev(PATHS); }
  }
  async function setupPath(pathId) {
    await inject();
    let s = await c.ev(`(async()=>JSON.stringify(await __mx.paths[${J(pathId)}].setup(${J(opts)})))()`);
    try { s = JSON.parse(s); } catch (e) { s = { skip: 'setup threw: ' + String(s && s.__error || s).slice(0, 200) }; }
    return s;
  }

  /* one drag with real input: down, move most of the way, look again at where the target is now (the desk
     leans in under a carried block, so a person re-aims at what they see), finish, look once more before
     letting go, up. hooks: at { i, fn } runs at move i; beforeUp; cancel (the browser takes the touch back);
     second + secondOn (a second finger on the screen from move i on); offscreen (the path leaves the
     window and comes back) */
  async function drag(input, from, to, st, hooks = {}) {
    const mid = [];
    let fin = [to.x, to.y];
    const look = async (tag) => { const v = await c.ev(`JSON.stringify({ tag: ${J(tag)}, t: Math.round(performance.now()), chip: __mx.chip(), ghost: __mx.ghost, hand: __mx.handState(), tile: __mx.dragtile(), dom: __mx.ghostDom(), at: __mx.at(${fin[0]}, ${fin[1]}), finger: __mx.pointAt(${fin[0]}, ${fin[1]}) })`); try { mid.push(JSON.parse(v)); } catch (e) { mid.push({ tag, err: String(v).slice(0, 200) }); } };
    /* a second finger: lands at move secondAt, moves by secondMove each step (a pinch), lifts at secondUpAt */
    const f2 = hooks.second ? { x: hooks.second[0], y: hooks.second[1], on: false } : null;
    const touches = (x, y) => (f2 && f2.on ? [{ x, y, id: 1 }, { x: f2.x, y: f2.y, id: 2 }] : [{ x, y, id: 1 }]);
    const mv = input === 'mouse' ? (x, y) => c.mouseMove(x, y) : async (x, y) => {
      if (f2 && hooks.secondAt === kk && !f2.on) { f2.on = true; await c.touch('touchStart', touches(x, y)); }
      else if (f2 && f2.on && hooks.secondUpAt === kk) { f2.on = false; f2.up = true; }
      if (f2 && f2.on && hooks.secondMove) { f2.x += hooks.secondMove[0]; f2.y += hooks.secondMove[1]; }
      kk++;
      await c.touch('touchMove', touches(x, y));
    };
    let kk = 0;
    if (input === 'mouse') await c.mouseDown(from.x, from.y); else await c.touch('touchStart', [{ x: from.x, y: from.y, id: 1 }]);
    /* hooks.afterDown: something happens the moment the finger is down (a redraw of the panel under it) */
    if (hooks.afterDown) await hooks.afterDown();
    /* a finger presses until the tile lifts (TOUCH_HOLD), unless this is a swipe (st.swipe) */
    await sleep(input === 'touch' && !st.swipe ? Math.max(st.hold, TOUCH_HOLD) : st.hold);
    const n1 = Math.max(2, Math.round(st.steps * 0.75));
    const p1 = [from.x + (to.x - from.x) * 0.8, from.y + (to.y - from.y) * 0.8];
    let pts1 = pathPoints([from.x, from.y], p1, n1, { wobble: st.wobble || 0, arc: hooks.arc || 0 });
    if (hooks.offscreen) {
      /* out past the window's edge and back in on the way */
      const o = hooks.offscreen;
      pts1 = pts1.slice(0, Math.floor(n1 / 2)).concat(pathPoints(pts1[Math.floor(n1 / 2)], o, 6, { ease: false }), pathPoints(o, p1, Math.ceil(n1 / 2), {}));
    }
    let k = 0;
    const run = async (pts) => {
      for (const [x, y] of pts) {
        await mv(x, y);
        if (hooks.at && hooks.at.i === k) await hooks.at.fn({ x, y, input, k });
        k++;
        await sleep(st.gap);
        if (k === Math.floor(st.steps * 0.6)) await look('60%');
      }
    };
    await run(pts1);
    /* to.climb: up to the scroller's top edge, held there while the board scrolls by itself, until the day
       it's going to is in view below the title; then down onto it */
    if (to.climb) {
      await run(pathPoints(p1, [to.x, to.y], 6, {}));
      const t0 = Date.now();
      let seen = false;
      while (Date.now() - t0 < 5000) {
        seen = await c.ev(`(() => { const e = document.querySelector(${J(to.sel)}); if (!e) return false; const r = e.getBoundingClientRect(); const g = document.querySelector('.c-ghost-block'); if (g) g.style.visibility = 'hidden'; const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (g) g.style.visibility = ''; return !!at && (at === e || e.contains(at)) && r.top > 0 && r.bottom < innerHeight; })()`);
        if (seen) break;
        await sleep(100);
      }
      to.climbMs = Date.now() - t0; to.climbSeen = seen;
      /* down onto it, following it with the eyes: each step aims at where it is now (the board can still
         be gliding while the finger leaves the edge) */
      let cur = [to.x, to.y];
      for (let k = 0; k < 24; k++) {
        const np = JSON.parse(await c.ev(`JSON.stringify((r => ({ x: r.cx, y: r.cy }))(__mx.rect(document.querySelector(${J(to.sel)}))))`));
        const dx = np.x - cur[0], dy = np.y - cur[1];
        if (Math.hypot(dx, dy) < 3) break;
        const f = Math.hypot(dx, dy) > 60 ? 0.35 : 0.6;
        cur = [Math.round(cur[0] + dx * f), Math.round(cur[1] + dy * f)];
        await mv(cur[0], cur[1]);
        await sleep(st.gap);
      }
      to.x = cur[0]; to.y = cur[1]; fin = cur.slice();
      to.followed = true;
    }
    if (!st.blind && (to.slot || to.sel)) {
      await sleep(st.reaim == null ? 260 : st.reaim);
      const q = to.slot ? `JSON.stringify(__mx.slot(${J(to.slot[0])}, ${J(to.slot[1])}, ${to.slot[2]}))` : `JSON.stringify((r => ({ x: r.cx, y: r.cy }))(__mx.rect(document.querySelector(${J(to.sel)}))))`;
      try { const np = JSON.parse(await c.ev(q)); if (np && Number.isFinite(np.x)) fin = [np.x, np.y]; } catch (e) { /* keep the first aim */ }
      /* V11, lift and place: a finger carries the block above itself (the touch offset), so a person steering
         its outline onto the slot puts the finger that far below the slot. A stretch (keepY) follows the finger */
      if (input === 'touch' && to.slot && !to.keepY) { const off = +(await c.ev(`window.__mx && __mx.aimLift ? __mx.aimLift() : 0`)); if (off > 0 && Number.isFinite(off)) fin = [fin[0], fin[1] + off]; }
    }
    await run(pathPoints(to.climb ? [to.x, to.y] : p1, fin, Math.max(2, st.steps - n1), { wobble: (st.wobble || 0) / 2 }));
    /* V11, lift and place: the block comes up off the fingertip as it arrives over the desk (the touch offset
       comes in over 150 ms), so a person whose block went up a row steers it back down onto the slot: look at
       the outline again, and put the finger that far below the slot */
    if (input === 'touch' && to.slot && !to.keepY && !st.blind) {
      for (let k = 0; k < 3; k++) {
        await sleep(90);
        let want = null;
        try { const np = JSON.parse(await c.ev(`JSON.stringify(__mx.slot(${J(to.slot[0])}, ${J(to.slot[1])}, ${to.slot[2]}))`)); const off = +(await c.ev(`window.__mx && __mx.aimLift ? __mx.aimLift() : 0`)); if (np && Number.isFinite(np.x) && Number.isFinite(off)) want = [np.x, np.y + Math.max(0, off)]; } catch (e) { /* keep */ }
        if (!want || Math.hypot(want[0] - fin[0], want[1] - fin[1]) < 2) break;
        await run(pathPoints(fin, want, 4, {}));
        fin = want;
      }
    }
    await sleep(st.settle);
    await look('release');
    if (hooks.beforeUp) await hooks.beforeUp({ fin });
    if (input === 'mouse') await c.mouseUp(fin[0], fin[1]);
    else if (hooks.cancel) await c.touch('touchCancel', []);
    else await c.touch('touchEnd', []);
    return { mid, fin };
  }

  /* what an attempt should have done, and whether it did */
  function judge(plan, r) {
    const why = [], soft = [];
    const g = r.ghostAtRelease;
    const errs = r.errors.filter((e) => !KNOWN(e));
    if (errs.length) why.push('errors: ' + errs.map((e) => e.text.slice(0, 160)).join(' | '));
    const toastGood = r.toasts.some((t) => /good/.test(t.cls));
    const toastAny = r.toasts.length > 0;
    const exp = r.expectOverride || plan.expect;
    if (exp === 'land') {
      const a = r.diff.added;
      if (a.length !== 1) why.push('placed ' + a.length + ' blocks (want 1)');
      else {
        const x = a[0];
        if (g) {
          const date = g.where === 'week' ? r.week[g.row] : r.focus;
          if (x.date !== date || x.start !== g.start) why.push('landed ' + x.date + ' ' + x.start + ', outline said ' + date + ' ' + g.start);
        } else why.push('no landing outline before release');
        if (plan.to.date && x.date !== plan.to.date) why.push('aimed at ' + plan.to.date + ', landed on ' + x.date);
        if (!r.drawnReal || !r.drawnReal.good) why.push('not drawn 1.2 s after the drop: ' + J(r.drawnReal && r.drawnReal.bad || r.drawnReal));
        if (!r.drawnStep || !r.drawnStep.good) why.push('not drawn after settling: ' + J(r.drawnStep && r.drawnStep.bad || r.drawnStep));
        else if (!r.drawnStep.onScreen) why.push('drawn but off screen');
      }
      if (!toastGood) why.push('no good toast' + (toastAny ? ' (got: ' + r.toasts.map((t) => t.text).join(' / ') + ')' : ''));
    } else if (exp === 'move') {
      const m = r.diff.moved.find((x) => x.id === plan.own.id);
      if (!m) why.push('the block did not move' + (r.diff.added.length ? ' (a new one was added)' : ''));
      else {
        if (g) { const date = g.where === 'week' ? r.week[g.row] : r.focus; if (m.to[0] !== date || m.to[1] !== g.start) why.push('moved to ' + m.to[0] + ' ' + m.to[1] + ', outline said ' + date + ' ' + g.start); }
        if (plan.to.date && m.to[0] !== plan.to.date) why.push('aimed at ' + plan.to.date + ', went to ' + m.to[0]);
        if (m.to[2] !== m.from[2]) why.push('its length changed ' + m.from[2] + ' to ' + m.to[2] + ' (a move became a stretch)');
      }
      if (!r.drawnReal || !r.drawnReal.good) why.push('not drawn 1.2 s after the drop: ' + J(r.drawnReal && r.drawnReal.bad));
      if (!r.drawnStep || !r.drawnStep.good) why.push('not drawn after settling: ' + J(r.drawnStep && r.drawnStep.bad));
      if (!toastGood) why.push('no good toast');
    } else if (exp === 'stretch') {
      const m = r.diff.moved.find((x) => x.id === plan.own.id);
      if (!m) why.push('the block did not stretch' + (plan.from.hitKind !== 'block' ? ' (the press found ' + (plan.from.hitKind || 'nothing') + ')' : plan.from.nearR === false ? ' (the press was not on its stretch edge)' : ''));
      else if (!(m.to[2] > m.from[2])) why.push('length ' + m.from[2] + ' to ' + m.to[2]);
      else if (m.to[1] !== m.from[1] || m.to[0] !== m.from[0]) why.push('its start moved (' + m.from[1] + ' to ' + m.to[1] + ')');
      if (!r.drawnStep || !r.drawnStep.good) why.push('not drawn after settling');
      if (!toastGood) why.push('no good toast');
    } else if (exp === 'meal') {
      const hit = r.diff.meals.some((x) => JSON.stringify(x).includes(plan.to.date)) || r.diff.dinners.some((x) => x.date === plan.to.date);
      if (!hit) why.push('no meal set on ' + plan.to.date + ' ' + plan.to.kind + ' (meals ' + r.diff.meals.length + ', dinners ' + r.diff.dinners.length + ')');
      if (r.stuckGhost) why.push('a ghost piece was left on the page');
    } else if (exp === 'post') {
      if (r.post !== true) why.push('the drop did not take (' + plan.post.slice(0, 90) + ' = ' + J(r.post) + ')');
      if (r.stuckGhost) why.push('a ghost piece was left on the page');
    } else if (exp === 'nothing') {
      /* put back on purpose (Escape, a cancel, let go off the board): nothing changes, nothing is left over */
      if (r.diff.added.length || r.diff.moved.length || r.diff.meals.length || r.diff.dinners.length) why.push('it changed the board: ' + J({ added: r.diff.added.map((x) => x.name + ' ' + x.date + ' ' + x.start), moved: r.diff.moved.map((x) => x.name), meals: r.diff.meals.length, dinners: r.diff.dinners.length }));
      if (r.stuckGhost) why.push('a ghost piece was left on the page');
    } else if (exp === 'told') {
      /* a hand that never looks again (blind): the desk leans in under a carried block, so it can end off the
         rows or on time that's taken. Either it lands where the outline said, drawn, or nothing lands and a
         toast says why. Never silent, never somewhere the outline didn't say */
      const a = r.diff.added;
      if (a.length > 1) why.push('placed ' + a.length + ' blocks');
      else if (a.length === 1) {
        const x = a[0];
        if (!g) why.push('no landing outline before release');
        else { const date = g.where === 'week' ? r.week[g.row] : r.focus; if (x.date !== date || x.start !== g.start) why.push('landed ' + x.date + ' ' + x.start + ', outline said ' + date + ' ' + g.start); }
        if (!toastGood) why.push('no toast saying where it went');
        if (!r.drawnStep || !r.drawnStep.good) why.push('not drawn after settling');
      } else if (!toastAny) why.push('nothing landed and nothing said why');
    } else if (exp === 'scroll') {
      /* a quick swipe along a list that scrolls: the list scrolls under the finger, and nothing is lifted,
         placed, or opened */
      if (r.diff.added.length || r.diff.moved.length || r.diff.meals.length || r.diff.dinners.length) why.push('a swipe along the list changed the board: ' + J({ added: r.diff.added.map((x) => x.name + ' ' + x.date + ' ' + x.start), meals: r.diff.meals.length, dinners: r.diff.dinners.length }));
      if (r.lifted) why.push('the tile lifted instead of the list scrolling');
      if (r.opened) why.push('a swipe opened ' + r.opened);
      if (!r.scrolls.length) soft.push('the list did not scroll (it may have been at its end)');
    } else if (exp === 'refuse') {
      if (r.diff.added.length || r.diff.moved.length) why.push('it changed the board: ' + J(r.diff.added.map((x) => x.name + ' ' + x.date + ' ' + x.start)));
      if (!r.toasts.some((t) => !/good/.test(t.cls))) why.push('nothing said why' + (toastAny ? ' (got: ' + r.toasts.map((t) => t.text).join(' / ') + ')' : ''));
    } else if (exp === 'refuse-or-beside') {
      /* over a locked block: either it says no and why, or it goes where the outline showed (beside it) and says where */
      const a = r.diff.added;
      if (a.length > 1) why.push('placed ' + a.length + ' blocks');
      else if (a.length === 1) {
        const x = a[0];
        if (!g || !g.ok) why.push('it landed though the outline said no room');
        else { const date = g.where === 'week' ? r.week[g.row] : r.focus; if (x.date !== date || x.start !== g.start) why.push('landed ' + x.date + ' ' + x.start + ', outline said ' + date + ' ' + g.start); }
        if (!toastGood) why.push('no toast saying where it went');
        if (!r.drawnStep || !r.drawnStep.good) why.push('not drawn after settling');
      } else if (!r.toasts.some((t) => !/good/.test(t.cls))) why.push('nothing landed and nothing said why');
      if (r.tileStuck || r.stuckGhost) why.push('something stayed on screen');
    } else if (exp === 'past') {
      /* on time already over: it goes in as done and says so, or it says why not */
      const a = r.diff.added;
      if (a.length === 1) {
        if (!a[0].done) why.push('landed on time that is over, not marked done');
        if (!r.toasts.some((t) => /done|over/i.test(t.text))) why.push('the toast does not say it went in as done (' + r.toasts.map((t) => t.text).join(' / ') + ')');
        if (!r.drawnStep || !r.drawnStep.good) why.push('not drawn after settling');
      } else if (a.length > 1) why.push('placed ' + a.length + ' blocks');
      else if (!r.toasts.some((t) => !/good/.test(t.cls))) why.push('nothing landed and nothing said why');
    }
    if (r.handStuck) why.push('a block stayed in hand after letting go');
    if (r.tileStuck) why.push('the tile copy stayed on screen');
    if (r.stuckGhost && exp !== 'post' && exp !== 'meal' && exp !== 'nothing') why.push('a ghost piece was left on the page');
    /* soft notes, not failures: how far the outline was from the hand */
    if (r.aimDrift != null && Math.abs(r.aimDrift) >= 60) soft.push('the outline sat ' + Math.round(r.aimDrift) + ' min from the aim');
    return { pass: !why.length, why, soft };
  }

  async function attempt(size, input, pathId, i, style, hooks, extra = {}) {
    await inject();
    /* extra.clearToasts: start with no toast showing (the last attempt's Undo toast can sit over the board
       on a small screen; the tries about toasts keep them) */
    if (extra.clearToasts) await c.ev(`(async () => { document.querySelectorAll('#toasts .toast').forEach((t) => { if (t._leave) t._leave(true); else t.remove(); }); await new Promise((r) => setTimeout(r, 300)); return 1; })()`);
    const st = Object.assign({}, STYLES[style] || STYLES.normal, extra.st || {});
    /* (the path hears which input carries, so a stretch edge is measured the way that input finds it) */
    const plan = await c.ev(`(async()=>JSON.stringify(await __mx.paths[${J(pathId)}].plan(${i}, ${J(Object.assign({ input }, extra.planOpts || {}))})))()`);
    let p; try { p = JSON.parse(plan); } catch (e) { return { skip: 'plan failed: ' + String(plan && plan.__error || plan).slice(0, 200) }; }
    if (!p || p.skip) return { skip: (p && p.skip) || 'no plan' };
    if (extra.mutatePlan) extra.mutatePlan(p);
    /* a finger that swipes (no press first) along the list a tile sits in scrolls that list (V11): what
       should happen is a scroll, not a drop */
    if (input === 'touch' && st.swipe && p.from && p.from.axis && !extra.expect) {
      const dx = p.to.x - p.from.x, dy = p.to.y - p.from.y;
      const across = p.from.axis === 'x' ? -dy > Math.abs(dx) : p.from.axis === 'y' ? Math.abs(dx) > Math.abs(dy) : false;
      if (!across) extra = Object.assign({}, extra, { expect: 'scroll' });
    }
    /* (a swipe along a list that doesn't scroll at this size is no swipe along a list) */
    if (extra.expect === 'scroll' && !(p.from && p.from.axis)) return { skip: 'the list does not scroll at this size' };
    const selBefore = await c.ev(`JSON.stringify({ sel: SR.view.sel ? SR.view.sel.type : null, pick: SR.view.pick ? SR.view.pick.key : null })`);
    const nBefore = p.own ? +(await c.ev(`Object.keys(__mx.adds()).length`)) - 1 : +(await c.ev(`Object.keys(__mx.adds()).length`));
    const before = await c.ev(`JSON.stringify(__mx.snap())`);
    if (extra.beforeDrag) await extra.beforeDrag(p);
    const t0 = await c.ev(`__mx.mark()`);
    await c.ev(`(() => { __mx.presses = []; return 1; })()`);
    const e0 = c.errors.length;
    const dr = await drag(input, p.from, p.to, st, (typeof hooks === 'function' ? hooks(p) : hooks) || {});
    const mid = dr.mid;
    const fps = await c.ev(`JSON.stringify(__mx.fps(${t0}))`);
    await sleep(250);
    const quick = JSON.parse(await c.ev(`JSON.stringify({ hand: __mx.handState(), tile: __mx.dragtile(), dom: __mx.ghostDom(), stuckDom: !!document.querySelector('.c-ghost-block, .onb-float') })`));
    if (extra.afterUp) await extra.afterUp(p);
    await sleep(950);
    const post = p.post ? await c.ev(p.post) : null;
    const after = await c.ev(`JSON.stringify(__mx.snap())`);
    const diff = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${after}))`));
    const target = (diff.added[0] && (p.expect === 'land' || extra.expect)) ? diff.added[0].id : (p.own ? p.own.id : null);
    const drawnReal = target ? JSON.parse(await c.ev(`JSON.stringify(__mx.drawn(${J(target)}))`)) : null;
    if (extra.shotAfter) { try { await c.shot(extra.shotAfter); } catch (e) { /* fine */ } }
    await c.ev(`__mx.stepDesk(240, 0.05)`);
    const drawnStep = target ? JSON.parse(await c.ev(`JSON.stringify(__mx.drawn(${J(target)}))`)) : null;
    const since = JSON.parse(await c.ev(`JSON.stringify(__mx.since(${t0}))`));
    const ctx = JSON.parse(await c.ev(`JSON.stringify({ week: __mx.week(), focus: SR.view.focus, where: __mx.where(), hand: __mx.handState(), tile: __mx.dragtile(), stuck: !!document.querySelector('.c-ghost-block, .onb-float'), sel: SR.view.sel ? SR.view.sel.type : null, pick: SR.view.pick ? SR.view.pick.key : null })`));
    const sel0 = (() => { try { return JSON.parse(selBefore); } catch (e) { return {}; } })();
    const rel = mid.find((m) => m.tag === 'release') || {};
    /* the outline at the moment of letting go: the last one shown before the block went down (a flick's
       last moves are handled as the finger lifts, after the last look before it) */
    const fromLog = (() => {
      const L = since.log;
      /* (the last put down: a carry that left the board on the way also ended a drag there) */
      let end = -1;
      for (let k = L.length - 1; k >= 0; k--) if (L[k].fn === 'adoptPosition' || L[k].fn === 'endDrag') { end = k; if (L[k].fn === 'adoptPosition' || !L.slice(0, k).some((x) => x.fn === 'adoptPosition')) break; }
      if (end >= 0) { const a = L.slice(0, end + 1).map((x) => x.fn).lastIndexOf('adoptPosition'); if (a >= 0) end = a; }
      const upto = end < 0 ? L : L.slice(0, end);
      for (let k = upto.length - 1; k >= 0; k--) { const x = upto[k]; if ((x.fn === 'showGhost' || x.fn === 'showDayGhost') && x.a[0] !== 'off') return x.fn === 'showGhost' ? { t: x.t, where: 'week', row: x.a[0], start: x.a[1], dur: x.a[2], ok: x.a[3] } : { t: x.t, where: 'day', row: null, start: x.a[0], dur: x.a[1], ok: x.a[2] }; }
      return null;
    })();
    const gr = fromLog || (rel.ghost && rel.ghost.t > t0 ? rel.ghost : null);
    const aimDrift = gr && p.to.min != null && (p.expect === 'land' || p.expect === 'move') ? gr.start + gr.dur / 2 - (p.expect === 'move' ? p.to.min : p.to.min) : null;
    const r = {
      size, input, path: pathId, i, style, plan: p, mid, fin: dr.fin, quick, diff, drawnReal, drawnStep,
      ghostAtRelease: gr, aimDrift, fingerAtRelease: rel.finger || null, post, expectOverride: extra.expect || null, fps: (() => { try { return JSON.parse(fps); } catch (e) { return null; } })(),
      toasts: since.toasts, log: since.log.filter((x) => !((x.fn === 'showGhost' || x.fn === 'showDayGhost') && x.a[0] === 'off')).slice(-40),
      swaps: since.swaps, focus: since.focus, cancels: since.cancels, scrolls: since.scrolls,
      errors: c.errors.slice(e0).concat(since.errs.map((x) => ({ kind: 'page', text: x.text }))),
      week: ctx.week, focus: ctx.focus, where: ctx.where,
      handStuck: !!(ctx.hand && ctx.hand.inScene && ctx.hand.shown), tileStuck: !!ctx.tile, stuckGhost: ctx.stuck,
      /* for a swipe: did anything lift (a tile copy, a meal ghost, a block in hand), and did a panel open */
      lifted: mid.some((m) => m.tile || m.dom) || since.log.some((x) => x.fn === 'startDrag'),
      opened: (ctx.sel && ctx.sel !== sel0.sel ? 'the ' + ctx.sel + ' panel' : '') || (ctx.pick && ctx.pick !== sel0.pick ? 'a block\'s tools' : '')
    };
    r.verdict = judge(p, r);
    /* a swipe the page saw take longer than the app's press to lift (a busy machine slows the input it's
       sent) wasn't a swipe: it's not judged */
    r.ptr = await c.ev(`JSON.stringify(__mx.ptr || null)`).then((s) => { try { return JSON.parse(s); } catch (e) { return null; } });
    /* (the press that started this attempt: how long the page took over it, and the sound before it) */
    r.press = await c.ev(`JSON.stringify((__mx.presses || [])[0] || null)`).then((s) => { try { return JSON.parse(s); } catch (e) { return null; } });
    const took = r.ptr && r.ptr.down && r.ptr.move8 ? Math.max(r.ptr.move8 - r.ptr.down, r.ptr.move8T && r.ptr.downT ? r.ptr.move8T - r.ptr.downT : 0) : 0;
    const slow = (r.expectOverride || p.expect) === 'scroll' && took > 260 ? 'the swipe took ' + Math.round(took) + ' ms to move (a busy machine): not a swipe' : null;
    if ((!r.verdict.pass && !slow) || extra.shot) {
      const f = join(SHOTS, `${size}-${input}-${pathId}-${i}-${style}${extra.tag ? '-' + extra.tag : ''}.png`);
      try { await c.shot(f); r.shot = f; } catch (e) { /* fine */ }
    }
    /* back to the board as it was */
    if (diff.added.length || diff.moved.length || p.own) {
      const ok = await c.ev(`(async()=> await __mx.undoTo(${nBefore}))()`);
      if (!ok) r.cleanup = 'undo did not restore the board';
    } else if (diff.meals.length || diff.dinners.length) {
      await c.ev(`__mx.quietUndo()`); await sleep(300);
    }
    if (slow) return { skip: slow };
    return r;
  }
  return { load, inject, setupPath, drag, judge, attempt, SHOTS };
}
