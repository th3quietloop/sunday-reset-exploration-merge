// A block on the week is being moved; a second finger lands on the board. Afterwards: is the block still
// drawn, is a copy left floating, is the note stuck, and does the next drag still work?
// node scripts/gate/probes/pinchstuck.mjs -sizes ipadP,ipadL,phoneL [-second open|block|desk]
import { connect, newTab, sleep, pathPoints } from '../lib/cdp.mjs';
import { makeGate, SIZES } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'pinchstuck');
const ses = await session(args);
const sizes = (args.sizes || 'ipadP').split(',');
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600 }, shots: join(dir, 'shots') });
const STATE = `JSON.stringify((() => {
  const own = window.__own; const ms = own ? __mx.meshesFor(own) : [];
  const h = __mx.dragMesh; let hs = null; if (h) { let o = h; while (o.parent) o = o.parent; hs = { inScene: o.type === 'Scene', visible: h.visible }; }
  const ch = document.getElementById('chip');
  return { blockShown: ms.map((m) => m.shown), inHand: ms.map((m) => m.inHand), handMesh: hs, chip: ch && !ch.hidden && getComputedStyle(ch).display !== 'none' ? ch.textContent : null, sel: SR.view.sel ? SR.view.sel.type : null, pick: SR.view.pick ? SR.view.pick.key : null };
})())`;
for (const size of sizes) {
  await g.load(size);
  for (const where of (args.second || 'open,block,desk').split(',')) {
    await g.setupPath('move-week');
    const plan = JSON.parse(await c.ev(`(async()=>JSON.stringify(await __mx.paths['move-week'].plan(0, {})))()`));
    if (plan.skip) { console.log(size, where, 'skip', plan.skip); continue; }
    await c.ev(`window.__own = ${JSON.stringify(plan.own.id)}`);
    /* where the second finger lands */
    const second = JSON.parse(await c.ev(`JSON.stringify((() => {
      if (${JSON.stringify(where)} === 'desk') return { x: Math.round(innerWidth * 0.5), y: Math.round(innerHeight * 0.06) + 80 };
      const s = __mx.placeSpots('week', 30, {}).find((p) => Math.hypot(p.x - ${plan.to.x}, p.y - ${plan.to.y}) > 90 && Math.hypot(p.x - ${plan.from.x}, p.y - ${plan.from.y}) > 90);
      if (${JSON.stringify(where)} === 'open') return s ? { x: s.x, y: s.y } : null;
      let b = null; World.debug.week.blocks.forEach((m) => { if (b || !m.visible) return; const st = __mx.meshState(m); if (st.onScreen && Math.hypot(st.screen.x - ${plan.to.x}, st.screen.y - ${plan.to.y}) > 90 && Math.hypot(st.screen.x - ${plan.from.x}, st.screen.y - ${plan.from.y}) > 90 && World.pick(st.screen.x, st.screen.y)) b = { x: st.screen.x, y: st.screen.y }; });
      return b;
    })())`));
    if (!second) { console.log(size, where, 'no place for the second finger'); continue; }
    const f1 = (x, y) => ({ x, y, id: 1 }), f2 = { x: second.x, y: second.y, id: 2 };
    await c.touch('touchStart', [f1(plan.from.x, plan.from.y)]);
    await sleep(120);
    const pts = pathPoints([plan.from.x, plan.from.y], [plan.to.x, plan.to.y], 30);
    for (let k = 0; k < pts.length; k++) {
      const [x, y] = pts[k];
      if (k === 12) await c.touch('touchStart', [f1(x, y), f2]);
      else await c.touch('touchMove', k > 12 ? [f1(x, y), f2] : [f1(x, y)]);
      await sleep(16);
    }
    await sleep(200);
    const mid = JSON.parse(await c.ev(STATE));
    await c.touch('touchEnd', []);
    await sleep(1200);
    const after = JSON.parse(await c.ev(STATE));
    /* put away whatever opened, and let the desk settle */
    await c.key('Escape', 'Escape', 27); await sleep(500);
    await c.ev(`__mx.stepDesk(240, 0.05)`);
    const later = JSON.parse(await c.ev(STATE));
    await c.shot(`${join(dir, 'shots')}/${size}-pinchstuck-${where}.png`);
    /* the next drag: the same block, moved to the same target */
    const p2 = JSON.parse(await c.ev(`JSON.stringify((() => { const b = __mx.blockScreen(window.__own)[0]; if (!b) return null; return { x: Math.round(b.left.x + (b.right.x - b.left.x) * 0.35), y: b.y }; })())`));
    let next = null;
    if (p2) {
      const before = await c.ev(`JSON.stringify(__mx.snap())`);
      await c.touch('touchStart', [f1(p2.x, p2.y)]); await sleep(120);
      for (const [x, y] of pathPoints([p2.x, p2.y], [plan.to.x, plan.to.y], 24)) { await c.touch('touchMove', [f1(x, y)]); await sleep(16); }
      await sleep(150); await c.touch('touchEnd', []); await sleep(1200);
      const aft = await c.ev(`JSON.stringify(__mx.snap())`);
      next = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${aft}))`)).moved.map((m) => m.name + ' to ' + m.to.join(' '));
    }
    console.log(size, where, JSON.stringify({ second, mid, after, later, nextDrag: next }));
    await c.ev(`(async () => { for (let k = 0; k < 4; k++) { SR.undo(); await new Promise((r) => setTimeout(r, 200)); } return 1; })()`);
  }
}
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
