// How big are the things a finger has to hit? Per size: a week row's height, a 30 minute block's width,
// the stretch edge's width (the part of a block that stretches instead of moving), on the week and the day.
// node scripts/gate/probes/targets.mjs -sizes all
import { connect, newTab, sleep } from '../lib/cdp.mjs';
import { makeGate, SIZES } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'targets');
const ses = await session(args);
const sizes = (args.sizes === 'all' || !args.sizes ? Object.keys(SIZES).join(',') : args.sizes).split(',');
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600 }, shots: join(dir, 'shots') });
const out = [];
const MEASURE = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const where = SR.view.zoom === 'day' ? 'day' : 'week';
  const res = { where };
  /* a 60 and a 30 minute block of our own on a day with room */
  const date = where === 'day' ? SR.view.focus : SR.M.weekDates(SR.view.focus).find((d) => d >= SR.today && SR.M.gaps(SR.day(d)).some((g) => g[1] - g[0] >= 300)) || SR.M.addDays(SR.today, 3);
  const row = where === 'day' ? null : __mx.week().indexOf(date);
  const gap = SR.M.gaps(SR.day(date)).filter((g) => g[1] - g[0] >= 180 && g[0] >= 480)[0];
  /* no bare gap (a work day): inside Work, where nothing has to move */
  const soft = gap ? null : __mx.placeSpots(where, 150, {}).find((s) => s.date === date && (!World.laneOf || World.laneOf(s.start) === World.laneOf(s.start + 150)));
  if (!gap && !soft) return { where, none: 'no room' };
  const s1 = gap ? Math.ceil((gap[0] + 15) / 15) * 15 : soft.start;
  const a = __reset.place(date, { name: 'Workout', cat: 'yours', icon: 'dumbbell', dur: 60, src: { type: 'block', id: 'workout' } }, s1);
  const b = __reset.place(date, { name: 'Walk', cat: 'yours', icon: 'walk', dur: 30, src: { type: 'block', id: 'walk' } }, s1 + 90);
  SR.render(); await wait(500); __mx.stepDesk(120, 0.05); await __mx.still(2000);
  const zone = (id, start, dur) => {
    const L = __mx.slotUp(where, row, start + 0.5), R = __mx.slotUp(where, row, start + dur - 0.5);
    const y = Math.round((L.y + R.y) / 2);
    let stretch = 0, move = 0, none = 0, touchStretch = 0, touchMove = 0;
    for (let x = Math.floor(L.x) - 4; x <= Math.ceil(R.x) + 4; x++) {
      const h = World.pick(x, y);
      if (!h || h.kind !== 'block' || !h.block || h.block.add !== id) { none++; continue; }
      if (h.nearR) stretch++; else move++;
    }
    /* a finger: the edge the app looks for under a finger (inside the end, then right past it, off the
       phone's one day) */
    for (let x = Math.floor(L.x) - 4; x <= Math.ceil(R.x) + 30; x++) {
      let h = World.pick(x, y, { edgePx: 22 });
      if ((!h || h.kind !== 'block') && World.edgeAt && !SR.phoneDay()) h = World.edgeAt(x, y, 22);
      if (!h || h.kind !== 'block' || !h.block || h.block.add !== id) continue;
      if (h.nearR) touchStretch++; else touchMove++;
    }
    /* how tall the block is on screen, at its middle */
    const mid = Math.round((L.x + R.x) / 2);
    let top = y, bot = y;
    while (top > 0) { const h = World.pick(mid, top - 1); if (!h || !h.block || h.block.add !== id) break; top--; }
    while (bot < innerHeight) { const h = World.pick(mid, bot + 1); if (!h || !h.block || h.block.add !== id) break; bot++; }
    return { widthPx: Math.round(R.x - L.x), stretchPx: stretch, movePx: move, touchStretchPx: touchStretch, touchMovePx: touchMove, tallPx: bot - top + 1 };
  };
  res.b60 = zone(a.add.id, a.start, 60);
  res.b30 = zone(b.add.id, b.start, 30);
  /* a row's (or lane's) height: from one row's middle to the next */
  if (where === 'week') res.rowPx = Math.round(Math.abs(__mx.slot('week', 3, 720).y - __mx.slot('week', 4, 720).y));
  else { const l0 = __mx.slot('day', null, 420), l1 = __mx.slot('day', null, 780); res.lanePx = Math.round(Math.abs(l1.y - l0.y)); }
  res.hourPx = Math.round(Math.abs(__mx.slot(where, row, 600).x - __mx.slot(where, row, 540).x));
  SR.undo(); await wait(200); SR.undo(); await wait(300);
  return res;
})()`;
for (const size of sizes) {
  await g.load(size);
  for (const v of ['move-week', 'move-day', 'phone-move']) {
    const su = await g.setupPath(v);
    if (su.skip) continue;
    const r = JSON.parse(await c.ev(`(async () => JSON.stringify(await ${MEASURE}))()`));
    out.push(Object.assign({ size, view: v }, r));
    console.log(size, v, JSON.stringify(r));
  }
}
writeFileSync(join(dir, 'targets.json'), JSON.stringify(out, null, 1));
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
