// Two fingers: one carries a tile from the reset's panel to Saturday; a second taps the board (lands and
// lifts) half way. Where does the tile go: where the first finger lets go, or where it was when the second
// lifted? And does the second finger's tap open something? node scripts/gate/probes/twofinger.mjs -sizes ipadP,phone
import { connect, newTab, sleep, pathPoints } from '../lib/cdp.mjs';
import { makeGate, SIZES, TOUCH_HOLD } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'twofinger');
const ses = await session(args);
const sizes = (args.sizes || 'ipadP').split(',');
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600 }, shots: join(dir, 'shots') });
for (const size of sizes) {
  await g.load(size);
  for (const mode of ['tap-open', 'tap-block', 'hold-block']) {
    await g.setupPath('reset-yours');
    await c.ev(`(async () => { document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()); return 1; })()`);
    const plan = JSON.parse(await c.ev(`(async()=>JSON.stringify(await __mx.paths['reset-yours'].plan(0, { second: ${JSON.stringify(mode === 'tap-open' ? 'open' : 'block')} })))()`));
    if (plan.skip || !plan.second) { console.log(size, mode, 'skip', plan.skip || 'no second'); continue; }
    const before = await c.ev(`JSON.stringify(__mx.snap())`);
    const t0 = await c.ev(`__mx.mark()`);
    const f1 = (x, y) => ({ x, y, id: 1 }), f2 = { x: plan.second[0], y: plan.second[1], id: 2 };
    await c.touch('touchStart', [f1(plan.from.x, plan.from.y)]);
    /* (a finger presses until the tile lifts, as a person does) */
    await sleep(TOUCH_HOLD);
    const pts = pathPoints([plan.from.x, plan.from.y], [plan.to.x, plan.to.y], 40);
    let mid = null;
    for (let k = 0; k < pts.length; k++) {
      const [x, y] = pts[k];
      if (k === 14) await c.touch('touchStart', [f1(x, y), f2]);
      else if (mode !== 'hold-block' && k === 20) { await c.touch('touchMove', [f1(x, y)]); mid = { k, x, y, chip: await c.ev(`__mx.chip()`), ghost: await c.ev(`JSON.stringify(__mx.ghost)`) }; }
      else await c.touch('touchMove', k >= 14 && (mode === 'hold-block' || k < 20) ? [f1(x, y), f2] : [f1(x, y)]);
      await sleep(16);
    }
    await sleep(150);
    const atEnd = { chip: await c.ev(`__mx.chip()`), ghost: await c.ev(`JSON.stringify(__mx.ghost)`), tile: await c.ev(`JSON.stringify(__mx.dragtile())`) };
    await c.touch('touchEnd', []);
    await sleep(1300);
    const after = await c.ev(`JSON.stringify(__mx.snap())`);
    const diff = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${after}))`));
    const since = JSON.parse(await c.ev(`JSON.stringify(__mx.since(${t0}))`));
    const state = JSON.parse(await c.ev(`JSON.stringify({ pick: SR.view.pick ? SR.view.pick.key : null, sel: SR.view.sel ? SR.view.sel.type : null, aside: document.body.classList.contains('c-sheet-aside'), side: !document.getElementById('side').hidden })`));
    await c.shot(`${join(dir, 'shots')}/${size}-twofinger-${mode}.png`);
    console.log(size, mode, JSON.stringify({ aimed: [plan.to.date, plan.to.min], second: plan.second, landed: diff.added.map((a) => a.name + ' ' + a.date + ' ' + a.start), atSecondLift: mid, atEnd, toasts: since.toasts.map((t) => t.text), state, log: since.log.map((l) => l.fn).filter((f) => !/Ghost|dragTo/.test(f)).join(' ') }));
    await c.ev(`(async () => { if (SR.view.sel) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 300)); } return 1; })()`);
    await c.ev(`(async () => await __mx.undoTo(${Object.keys(JSON.parse(before).adds).length}))()`);
  }
}
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
