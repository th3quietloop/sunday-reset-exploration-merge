// The board's size at rest: how wide the board is drawn on screen, in CSS pixels, in Week, Day and Now at
// 1440x900, in Week at 1024x768, and on the phone's desk at 375x812. A board that gets smaller is a board that's
// harder to read and to aim at, so this fails when any of them drops more than 2 percent below V11 as it went live
// (Oct 15), kept in board-size.json beside this script.
//   node scripts/gate/boardsize.mjs                       builds V11-2, measures, and compares with board-size.json
//   node scripts/gate/boardsize.mjs -build v/corners11 -save   measures V11 as it went live and keeps it as the baseline
//   [-url http://localhost:4467/ -port 9467 -newtab] (a build and a Chrome already running) [-out file.json]
// Exit code 1 when a board is smaller than it may be. The made up family's week, the clock held at 10 am.
import { connect, newTab, sleep } from './lib/cdp.mjs';
import { makeGate, SIZES } from './lib/core.mjs';
import { parseArgs, session } from './lib/session.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, 'board-size.json');
const TOLERANCE = 0.02;
const args = parseArgs(process.argv.slice(2));
const say = (s) => process.stdout.write(s + '\n');

/* the two sizes the drag gate doesn't have: a small window, and an iPhone 11 Pro */
SIZES.small = SIZES.small || { w: 1024, h: 768, mobile: false, dpr: 2, label: 'Window 1024x768' };
SIZES.phoneX = SIZES.phoneX || { w: 375, h: 812, mobile: true, dpr: 3, label: 'iPhone 375x812' };

/* what's measured: the board's own wooden slab (the week's, or the day's), its corners drawn on screen */
const CASES = [
  { id: 'week@1440x900', size: 'mac1', board: 'week', go: `SR.setMode('planner'); SR.setZoom('week');` },
  { id: 'day@1440x900', size: 'mac1', board: 'day', go: `SR.setMode('planner'); SR.setZoom('day');` },
  { id: 'now@1440x900', size: 'mac1', board: 'day', go: `SR.setMode('today');` },
  { id: 'week@1024x768', size: 'small', board: 'week', go: `SR.setMode('planner'); SR.setZoom('week');` },
  { id: 'phonedesk@375x812', size: 'phoneX', board: 'day', go: `if (SR.openPhoneDesk && !SR.view.phoneDesk) SR.openPhoneDesk();` }
];
const MEASURE = (board) => `JSON.stringify((() => {
  const D = World.debug, base = ${board === 'week' ? 'D.week.base' : 'D.dayb.base'};
  if (!base || !base.geometry || !base.visible) return { skip: 'no ${board} board on the desk' };
  base.updateWorldMatrix(true, false);
  if (!base.geometry.boundingBox) base.geometry.computeBoundingBox();
  const b = base.geometry.boundingBox, r = document.querySelector('#stage canvas').getBoundingClientRect();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
    const v = base.localToWorld(new THREE.Vector3(x, y, z)).project(World.camera);
    const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  return { w: Math.round(x1 - x0), h: Math.round(y1 - y0), left: Math.round(x0), right: Math.round(x1), mode: SR.view.mode, zoom: SR.view.zoom, phoneDesk: !!SR.view.phoneDesk, body: document.body.className };
})())`;

const ses = await session(args, 'boardsize');
const c = await connect(ses.port, args.newtab || ses.own ? { target: await newTab(ses.port) } : {});
const g = makeGate({ c, url: ses.url, opts: { at: 600 } });
/* at rest: the camera hasn't moved for half a second (the mug's steam can keep the desk drawing) */
const rest = async (ms = 9000) => { const t0 = Date.now(); let last = null, same = 0; while (Date.now() - t0 < ms) { const s = +(await c.ev(`World.camSum`)); if (last != null && Math.abs(s - last) < 1e-3) { if (++same >= 4) return true; } else same = 0; last = s; await sleep(150); } return false; };
const out = { at: new Date().toISOString(), url: ses.url, root: ses.root || null, sizes: {} };
let failed = 0, loaded = null;
try {
  for (const k of CASES) {
    if (loaded !== k.size) { await g.load(k.size); loaded = k.size; }
    await c.ev(`(async () => { ${k.go} await new Promise((r) => setTimeout(r, 1200)); return 1; })()`);
    const settled = await rest();
    const m = JSON.parse(await c.ev(MEASURE(k.board)));
    out.sizes[k.id] = Object.assign({ settled }, m);
    say(`${k.id}: ${m.skip ? 'not measured (' + m.skip + ')' : m.w + ' px wide' + (settled ? '' : ' (the desk never came to rest)')}`);
  }
} finally {
  try { await c.closePage(); } catch (e) { /* fine */ }
  c.close();
  await ses.stop();
}
if (args.out && typeof args.out === 'string') { mkdirSync(dirname(args.out), { recursive: true }); writeFileSync(args.out, JSON.stringify(out, null, 1)); }
if (args.save) {
  const keep = { about: 'How wide the board is drawn at rest, in CSS pixels, in V11 as it went live (Oct 15, v/corners11). boardsize.mjs fails any later build whose board is more than ' + Math.round(TOLERANCE * 100) + ' percent narrower. Measured by boardsize.mjs -build v/corners11 -save.', measured: out.at, tolerance: TOLERANCE, sizes: Object.fromEntries(Object.entries(out.sizes).map(([k, v]) => [k, v.w])) };
  writeFileSync(BASE, JSON.stringify(keep, null, 1) + '\n');
  say('kept as the baseline: ' + BASE);
  process.exit(Object.values(out.sizes).some((v) => !v.w) ? 1 : 0);
}
let base = null;
try { base = JSON.parse(readFileSync(BASE, 'utf8')); } catch (e) { say('no baseline at ' + BASE + ' (measure V11 with -build v/corners11 -save)'); process.exit(1); }
say('\nSUMMARY');
for (const [id, want] of Object.entries(base.sizes)) {
  const got = out.sizes[id];
  const floor = Math.floor(want * (1 - (base.tolerance || TOLERANCE)));
  if (!got || !got.w) { failed++; say(`${id}: not measured (${(got && got.skip) || 'no case'}), which counts as a failure`); continue; }
  const d = ((got.w - want) / want) * 100;
  const ok = got.w >= floor;
  if (!ok) failed++;
  say(`${id}: ${got.w} px, V11 ${want} px (${d >= 0 ? '+' : ''}${d.toFixed(1)} percent)${ok ? '' : ': smaller than V11 by more than ' + Math.round((base.tolerance || TOLERANCE) * 100) + ' percent'}`);
}
say(failed ? 'BOARD SIZE: FAIL' : 'BOARD SIZE: OK');
process.exit(failed ? 1 : 0);
