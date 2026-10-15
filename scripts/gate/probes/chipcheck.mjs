// While a block is carried, is the note that says where it lands (the chip) on screen, and what does the
// block in hand print? node scripts/gate/probes/chipcheck.mjs -sizes phone,duoSafari,ipadP -path phone-move
import { connect, newTab, sleep, pathPoints } from '../lib/cdp.mjs';
import { makeGate, SIZES } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'chipcheck');
const ses = await session(args);
const sizes = (args.sizes || 'phone').split(',');
const p = args.path || 'phone-move';
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600 }, shots: join(dir, 'shots') });
for (const size of sizes) {
  await g.load(size);
  const su = await g.setupPath(p);
  if (su.skip) { console.log(size, p, 'not here'); continue; }
  const plan = JSON.parse(await c.ev(`(async()=>JSON.stringify(await __mx.paths[${JSON.stringify(p)}].plan(0, {})))()`));
  if (plan.skip) { console.log(size, 'skip', plan.skip); continue; }
  const touch = SIZES[size].mobile;
  if (touch) await c.touch('touchStart', [{ x: plan.from.x, y: plan.from.y, id: 1 }]); else await c.mouseDown(plan.from.x, plan.from.y);
  await sleep(120);
  for (const [x, y] of pathPoints([plan.from.x, plan.from.y], [plan.to.x, plan.to.y], 24)) { if (touch) await c.touch('touchMove', [{ x, y, id: 1 }]); else await c.mouseMove(x, y); await sleep(16); }
  await sleep(300);
  const info = await c.ev(`JSON.stringify((() => {
    const ch = document.getElementById('chip'); const cs = ch && getComputedStyle(ch); const r = ch && ch.getBoundingClientRect();
    const at = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    const h = __mx.handState();
    return { chip: ch && { hidden: ch.hidden, display: cs.display, vis: cs.visibility, op: cs.opacity, z: cs.zIndex, rect: r && [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], text: ch.textContent, onTop: !!at && (at === ch || ch.contains(at)), topEl: at && (at.id || String(at.className).slice(0, 30)) }, hand: h && { screen: h.screen }, finger: [${plan.to.x}, ${plan.to.y}], label: __mx.dragMesh && __mx.dragMesh.userData && __mx.dragMesh.userData.block && (__mx.dragMesh.userData.block.daySub || __mx.dragMesh.userData.block.sub || '') };
  })())`);
  console.log(size, info);
  await c.shot(`${join(dir, 'shots')}/${size}-${p}-chipcheck.png`);
  if (touch) await c.touch('touchEnd', []); else await c.mouseUp(plan.to.x, plan.to.y);
  await sleep(800);
  await c.ev(`(async () => { SR.undo(); await new Promise((r) => setTimeout(r, 300)); SR.undo(); return 1; })()`);
}
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
