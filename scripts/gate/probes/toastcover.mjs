// After a drop, where does its toast sit, and does it cover the board? Then a second drag aimed at a part
// of the board the toast covers: does it land? node scripts/gate/probes/toastcover.mjs -sizes phone,ipadP,mac1 [-path reset-yours]
import { connect, newTab, sleep } from '../lib/cdp.mjs';
import { makeGate, SIZES } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'toastcover');
const ses = await session(args);
const sizes = (args.sizes || 'phone').split(',');
const pathId = args.path || 'reset-yours';
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600 }, shots: join(dir, 'shots') });
const out = [];
for (const size of sizes) {
  await g.load(size);
  const su = await g.setupPath(pathId);
  if (su.skip) { console.log(size, 'not here', su.skip); continue; }
  const input = SIZES[size].mobile ? 'touch' : 'mouse';
  /* the first drop, for real */
  const r1 = await g.attempt(size, input, pathId, 0, 'normal', {}, { keep: true });
  /* its toast (the attempt undid it; drop one again and leave it this time) */
  const plan = JSON.parse(await c.ev(`(async()=>JSON.stringify(await __mx.paths[${JSON.stringify(pathId)}].plan(1, {})))()`));
  await g.drag(input, plan.from, plan.to, { steps: 24, gap: 16, hold: 120, settle: 120 });
  await sleep(500);
  const cover = JSON.parse(await c.ev(`JSON.stringify((() => {
    const toasts = Array.from(document.querySelectorAll('#toasts .toast')).filter((t) => !t._gone).map((t) => { const r = t.getBoundingClientRect(); return { text: t.textContent.slice(0, 60), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), pe: getComputedStyle(t).pointerEvents }; });
    const where = SR.view.zoom === 'day' ? 'day' : 'week';
    const cells = [], covered = [];
    const rows = where === 'day' ? [null] : [0, 1, 2, 3, 4, 5, 6];
    rows.forEach((row) => { for (let m = 360; m <= 1380; m += 30) { const p = __mx.slot(where, row, m); if (p.behind || p.x < 0 || p.y < 0 || p.x > innerWidth || p.y > innerHeight) continue; const e = document.elementFromPoint(p.x, p.y); const cell = { row, m, x: p.x, y: p.y, top: e ? (e.id || String(e.className).split(' ')[0] || e.tagName) : null }; cells.push(cell); if (e && e.closest && e.closest('#toasts')) covered.push(cell); } });
    return { toasts, cells: cells.length, covered: covered.length, coveredRows: Array.from(new Set(covered.map((x) => x.row))), sample: covered.slice(0, 3), week: __mx.week() };
  })())`));
  await c.shot(`${join(dir, 'shots')}/${size}-cover.png`);
  /* a second drag, at once, aimed at a covered part of the board when there is one */
  let r2 = null;
  if (cover.covered) {
    const t = cover.sample[0];
    const tile = JSON.parse(await c.ev(`JSON.stringify((() => { const p = __mx.benchPieces ? __mx.benchPieces().filter((x) => x.drag && x.drag.kind) : []; if (p.length) return { cx: p[2 % p.length].x, cy: p[2 % p.length].y }; return __mx.tile("#rack-body .tile", 2); })())`));
    const before = await c.ev(`JSON.stringify(__mx.snap())`);
    const t0 = await c.ev(`__mx.mark()`);
    const d = await g.drag(input, { x: tile.cx, y: tile.cy }, { x: t.x, y: t.y }, { steps: 24, gap: 16, hold: 120, settle: 120, blind: true });
    await sleep(1200);
    const after = await c.ev(`JSON.stringify(__mx.snap())`);
    const diff = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${after}))`));
    const since = JSON.parse(await c.ev(`JSON.stringify(__mx.since(${t0}))`));
    r2 = { aimed: t, landed: diff.added.map((x) => x.name + ' ' + x.date + ' ' + x.start), toasts: since.toasts.map((x) => x.text), releaseOver: (d.mid.find((m) => m.tag === 'release') || {}).at, chipAtRelease: (d.mid.find((m) => m.tag === 'release') || {}).chip };
    await c.shot(`${join(dir, 'shots')}/${size}-second.png`);
  }
  const row = { size, first: r1 && r1.verdict, cover, second: r2 };
  out.push(row);
  console.log(JSON.stringify({ size, toasts: cover.toasts.map((t) => [t.text.slice(0, 30), t.x, t.y, t.w, t.h, t.pe]), boardCells: cover.cells, coveredCells: cover.covered, coveredRows: cover.coveredRows, second: r2 }));
}
writeFileSync(join(dir, 'toastcover-') + pathId + '.json', JSON.stringify(out, null, 1));
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
