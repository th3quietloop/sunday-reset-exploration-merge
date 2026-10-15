// Where on the board can't a drop land because something else is on top (a panel, the band, a corner, a
// toast)? For each size and view, every half hour of every row: what's under that point.
// node scripts/gate/probes/deadzones.mjs -sizes all [-toast] [-toasts 3]
import { connect, newTab, sleep } from '../lib/cdp.mjs';
import { makeGate, SIZES } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'deadzones');
const ses = await session(args);
const sizes = (args.sizes === 'all' || !args.sizes ? Object.keys(SIZES).join(',') : args.sizes).split(',');
const views = (args.views || 'reset-yours,lib-week,lib-day,stack-week,today-bench,phone-move').split(',');
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600 }, shots: join(dir, 'shots') });
const out = [];
for (const size of sizes) {
  await g.load(size);
  for (const v of views) {
    const su = await g.setupPath(v);
    if (su.skip) { out.push({ size, view: v, na: su.skip }); continue; }
    await sleep(600);
    await c.ev(`__mx.still(2500)`);
    /* -toast: the toast a drop leaves (with its Undo), as it sits for six seconds after every drop */
    if (args.toast) { for (let k = 0; k < (+args.toasts || 1); k++) { await c.ev(`SR.toast(${JSON.stringify(['Walk on Saturday at 1:30 pm', 'Run on Friday at 7 am', 'Reading on Thursday at 8 pm'])}[${k % 3}], 'good', { label: 'Undo', fn: () => {} })`); await sleep(250); } await sleep(400); }
    const r = JSON.parse(await c.ev(`JSON.stringify((() => {
      const where = SR.view.zoom === 'day' ? 'day' : 'week';
      const rows = where === 'day' ? [null] : [0, 1, 2, 3, 4, 5, 6];
      const by = {}; let n = 0, blocked = 0, off = 0;
      const blockedCells = [];
      rows.forEach((row) => { for (let m = 360; m <= 1410; m += 30) {
        const p = __mx.slot(where, row, m);
        n++;
        if (p.behind || p.x < 0 || p.y < 0 || p.x >= innerWidth || p.y >= innerHeight) { off++; continue; }
        const e = document.elementFromPoint(p.x, p.y);
        if (!e || e.tagName === 'CANVAS' || e.id === 'stage') continue;
        const host = e.closest('#toasts, #rack, #side, .c-band, #band, .c-dock, .c-corner, .c-dc, #datecard, #phonebar, .c-steps, .c-stepbar, #topbar, .k-sheet, #sheet, header, nav, section, aside') || e;
        const name = (host.id ? '#' + host.id : '') + (typeof host.className === 'string' && host.className ? '.' + host.className.split(' ').slice(0, 2).join('.') : host.tagName);
        by[name] = (by[name] || 0) + 1; blocked++;
        if (blockedCells.length < 400) blockedCells.push([row, m, name]);
      } });
      /* rows, in hours, that are covered at least half */
      const rowsHit = {};
      blockedCells.forEach(([row, m, name]) => { const k = row == null ? 'day' : __mx.week()[row].slice(5); rowsHit[k] = rowsHit[k] || {}; rowsHit[k][name] = (rowsHit[k][name] || []).concat(m); });
      const sum = {};
      Object.keys(rowsHit).forEach((k) => { sum[k] = Object.keys(rowsHit[k]).map((nm) => { const ms = rowsHit[k][nm]; const lo = Math.min(...ms), hi = Math.max(...ms) + 30; return nm + ' ' + SR.M.clock(lo) + ' to ' + SR.M.clock(hi) + ' (' + ms.length + ')'; }); });
      return { where, n, off, blocked, pct: Math.round(100 * blocked / Math.max(1, n - off)), by, rows: sum };
    })())`));
    await c.shot(`${join(dir, 'shots')}/dz-${size}-${v}${args.toast ? '-toast' : ''}.png`);
    out.push(Object.assign({ size, view: v, toast: !!args.toast }, r));
    if (args.toast) { await c.ev(`document.querySelectorAll('#toasts .toast').forEach((t) => t.remove())`); }
    console.log(size, v, 'covered', r.pct + '%', JSON.stringify(r.by), JSON.stringify(r.rows).slice(0, 400));
  }
}
writeFileSync(join(dir, 'deadzones') + (args.toast ? '-toast' + (args.toasts || '') : '') + '.json', JSON.stringify(out, null, 1));
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
