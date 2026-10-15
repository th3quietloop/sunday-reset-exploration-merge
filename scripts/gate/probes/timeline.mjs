// Frame by frame around a drop: is the block always somewhere on screen (in hand, then falling, then in its
// slot), how long the fall and the squash take, and whether any frame has a number that isn't a number.
// node scripts/gate/probes/timeline.mjs -sizes mac1,phone -paths reset-yours,lib-week,move-week -n 3 [-calm]
import { connect, newTab, sleep } from '../lib/cdp.mjs';
import { makeGate, SIZES } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'timeline');
const ses = await session(args);
const sizes = (args.sizes || 'mac1').split(',');
const paths = (args.paths || 'reset-yours').split(',');
const N = +(args.n || 3);
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600, calm: !!args.calm }, shots: join(dir, 'shots') });
/* the recorder: every frame, the block in hand and every mesh of the added (or moved) block */
const REC = `(() => {
  if (window.__tl) return 'ok';
  const T = window.__tl = { on: false, frames: [], id: null, t0: 0 };
  const W = World;
  const fin = (m) => { m.updateMatrixWorld(true); return Array.from(m.matrixWorld.elements).every(Number.isFinite); };
  const shown = (m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  const scene = (m) => { let o = m; while (o.parent) o = o.parent; return o.type === 'Scene'; };
  const tick = () => {
    if (T.on) {
      const f = { t: Math.round(performance.now() - T.t0) };
      const h = __mx.dragMesh;
      if (h && scene(h)) { const v = new THREE.Vector3(); h.getWorldPosition(v); f.hand = { vis: shown(h), y: +v.y.toFixed(3), fin: fin(h), sy: +h.scale.y.toFixed(3) }; }
      const id = T.id || (() => { const a = Object.keys(__mx.adds()).filter((k) => !T.before.includes(k)); return a[0] || null; })();
      if (id) { T.id = id; f.slot = __mx.meshesFor(id).map((m) => ({ w: m.where, vis: m.shown && m.visible, y: m.y, sy: m.sy, fin: m.finite, held: m.held })); }
      const dt = document.getElementById('dragtile'); f.tile = !!dt && !dt.hidden;
      T.frames.push(f);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return 'ok';
})()`;
const out = [];
for (const size of sizes) {
  await g.load(size);
  await c.ev(REC);
  for (const p of paths) {
    const su = await g.setupPath(p);
    if (su.skip) { console.log(size, p, 'not here'); continue; }
    for (let i = 0; i < N; i++) {
      const input = SIZES[size].mobile ? 'touch' : 'mouse';
      const plan = JSON.parse(await c.ev(`(async()=>JSON.stringify(await __mx.paths[${JSON.stringify(p)}].plan(${i}, {})))()`));
      if (plan.skip) { console.log(size, p, i, 'skip', plan.skip); continue; }
      const nBefore = plan.own ? +(await c.ev(`Object.keys(__mx.adds()).length`)) - 1 : +(await c.ev(`Object.keys(__mx.adds()).length`));
      await c.ev(`(() => { __tl.before = Object.keys(__mx.adds()); __tl.id = ${plan.own ? JSON.stringify(plan.own.id) : 'null'}; __tl.frames = []; return 1; })()`);
      /* down and carry, then start recording a moment before letting go */
      const st = { steps: 24, gap: 16, hold: 120, settle: 120 };
      await g.drag(input, plan.from, plan.to, st, { beforeUp: () => c.ev(`(() => { __tl.t0 = performance.now(); __tl.on = true; return 1; })()`) });
      await sleep(1600);
      const fr = JSON.parse(await c.ev(`(() => { __tl.on = false; return JSON.stringify(__tl.frames); })()`));
      /* read it: frames with nothing showing, the first frame the slot block shows, the fall, any NaN */
      let gap = 0, worstGap = 0, run = 0, firstSlot = null, nan = 0, handGone = null, settled = null;
      fr.forEach((f) => {
        const handVis = f.hand && f.hand.vis && f.hand.fin;
        const slotVis = (f.slot || []).some((m) => m.vis && m.fin && m.sy > 0.05);
        if ((f.slot || []).some((m) => !m.fin) || (f.hand && !f.hand.fin)) nan++;
        if (slotVis && firstSlot == null) firstSlot = f.t;
        if (!handVis && handGone == null && f.t > 0) handGone = f.t;
        if (!handVis && !slotVis && !f.tile) { gap++; run++; worstGap = Math.max(worstGap, run); } else run = 0;
        const s = (f.slot || [])[0];
        if (s && settled == null && s.vis && Math.abs(s.y - 0.3) < 0.01 && Math.abs(s.sy - 1) < 0.01 && f.t > 50) settled = f.t;
      });
      const row = { size, path: p, i, frames: fr.length, gapFrames: gap, worstGap, firstSlotMs: firstSlot, handGoneMs: handGone, settledMs: settled, nanFrames: nan, ySlot: fr.slice(0, 30).map((f) => f.slot && f.slot[0] ? f.slot[0].y : null), sySlot: fr.slice(0, 30).map((f) => f.slot && f.slot[0] ? f.slot[0].sy : null) };
      out.push(row);
      console.log(JSON.stringify({ size, path: p, i, frames: row.frames, gapFrames: gap, worstGap, firstSlotMs: firstSlot, handGoneMs: handGone, settledMs: settled, nan }));
      await c.ev(`(async () => await __mx.undoTo(${nBefore}))()`);
      await g.setupPath(p);
    }
  }
}
writeFileSync(join(dir, 'timeline') + (args.calm ? '-calm' : '') + '.json', JSON.stringify(out, null, 1));
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
