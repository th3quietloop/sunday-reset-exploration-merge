// The meal board after a touch the system takes back mid drag: does the ghost stay, and does the next tap
// anywhere drop the meal? node scripts/gate/probes/mealcancel.mjs -sizes phone,ipadP
import { connect, newTab, sleep, pathPoints } from '../lib/cdp.mjs';
import { makeGate, TOUCH_HOLD } from '../lib/core.mjs';
import { parseArgs, runDir, session } from '../lib/session.mjs';
import { join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const dir = runDir(args, 'mealcancel');
const ses = await session(args);
const sizes = (args.sizes || 'phone').split(',');
const c = await connect(ses.port, { target: await newTab(ses.port) });
const g = makeGate({ c, url: ses.url, opts: { at: 600 }, shots: join(dir, 'shots') });
for (const size of sizes) {
  await g.load(size);
  await g.setupPath('reset-meals');
  const plan = JSON.parse(await c.ev(`(async()=>JSON.stringify(await __mx.paths['reset-meals'].plan(0, {})))()`));
  if (plan.skip) { console.log(size, 'skip', plan.skip); continue; }
  const before = await c.ev(`JSON.stringify(__mx.snap())`);
  await c.touch('touchStart', [{ x: plan.from.x, y: plan.from.y, id: 1 }]);
  /* (a finger presses until the meal lifts, as a person does) */
  await sleep(TOUCH_HOLD);
  let fin = [plan.to.x, plan.to.y];
  for (const [x, y] of pathPoints([plan.from.x, plan.from.y], fin, 24)) { await c.touch('touchMove', [{ x, y, id: 1 }]); await sleep(16); }
  await sleep(200);
  await c.touch('touchCancel', []);
  await sleep(800);
  const s1 = JSON.parse(await c.ev(`JSON.stringify({ ghosts: document.querySelectorAll('.c-ghost-block').length, lifted: document.querySelectorAll('.c-lifted').length, over: document.querySelectorAll('.c-over').length })`));
  const mid = await c.ev(`JSON.stringify(__mx.snap())`);
  const d1 = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${before}, ${mid}))`));
  /* the next tap, on the meal board's title (nowhere near a day) */
  const t = JSON.parse(await c.ev(`JSON.stringify((() => { const e = document.querySelector('.c-mat h1, .c-mat h2, .c-mat-head'); const r = e.getBoundingClientRect(); return { x: Math.round(r.left + 20), y: Math.round(r.top + r.height / 2) }; })())`));
  await c.tap(t.x, t.y);
  await sleep(900);
  const after = await c.ev(`JSON.stringify(__mx.snap())`);
  const d2 = JSON.parse(await c.ev(`JSON.stringify(__mx.diff(${mid}, ${after}))`));
  const s2 = JSON.parse(await c.ev(`JSON.stringify({ ghosts: document.querySelectorAll('.c-ghost-block').length, lifted: document.querySelectorAll('.c-lifted').length })`));
  const toasts = await c.ev(`JSON.stringify(Array.from(document.querySelectorAll('#toasts .toast')).map((t) => t.textContent))`);
  await c.shot(`${join(dir, 'shots')}/${size}-mealcancel-after-tap.png`);
  console.log(size, JSON.stringify({ aimed: [plan.to.date, plan.to.kind], afterCancel: { state: s1, changed: d1.meals.length + d1.dinners.length }, afterTapOnTitle: { changed: d2.meals.map((m) => m.key + ' ' + JSON.stringify(m.to).slice(0, 80)).concat(d2.dinners.map((x) => x.date + ' ' + (x.to && x.to.name))), state: s2 }, toasts }));
}
await c.closePage();
c.close();
await ses.stop();
console.log('results: ' + dir);
process.exit(0);
