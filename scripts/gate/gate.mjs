// The drag gate: every pick up and place path, at every size, with a mouse and a finger, n times each.
//   node scripts/gate/gate.mjs -sizes mac1,phone -inputs mouse,touch -paths reset-yours,lib-week -n 5
//   [-styles normal,slow,flick,pause,press,blind] [-at 600|real] [-calm] [-big] [-out dir] [-browser webkit]
//   [-url http://localhost:4467/ -port 9467] (a build and a Chrome already running; otherwise it builds V11,
//   serves it, and starts a headless Chrome of its own, and stops them at the end)
// Each attempt: open the path's place, pick a source and an open target, drag with real input events (a
// mouse or a finger, re-aiming once at where the target is after the desk leans in), then check: it landed
// where the slot outline said at release, the block is drawn (finite, shown, full height, on screen) 1.2 s
// after the drop and after the desk settles, the person was told (a toast), nothing stayed in hand, and
// nothing threw. Every attempt is undone, so the next starts from the same board. Exit code 1 if anything
// failed. A finger presses until the tile lifts (lib/core.mjs TOUCH_HOLD) before it carries.
// Paths: reset-yours reset-todo reset-meals reset-move reset-people lib-week lib-day stack-week stack-day
//   move-week move-week-lib move-day stretch-week stretch-day today-bench today-move phone-move phone-stretch
//   setup-try setup-stretch desk-letters desk-home. Sizes: mac1 mac2 ipadL ipadP duoOpen duoFold duoSafari
//   phone phoneL (or -sizes all). -real uses this device's own saved board; -newtab runs in a page of its
//   own so several gates can run side by side; -clear-toasts starts each attempt with no toast.
// -browser webkit runs the same paths in Playwright's WebKit with a mouse (WebKit takes no fingers from
// Playwright, so touch is left out there and the summary says so).
import { connect, newTab } from './lib/cdp.mjs';
import { makeGate, SIZES } from './lib/core.mjs';
import { parseArgs, runDir, session } from './lib/session.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const N = +(args.n || 5);
const ALL_PATHS = 'reset-yours,reset-todo,reset-meals,reset-move,reset-people,lib-week,lib-day,stack-week,stack-day,move-week,move-day,stretch-week,stretch-day,today-bench,today-move,phone-move,phone-stretch,setup-try,setup-stretch,desk-letters,desk-home';
const webkit = args.browser === 'webkit';
const sizes = (args.sizes === 'all' ? Object.keys(SIZES).join(',') : args.sizes || 'mac1').split(',');
let inputs = (args.inputs || 'mouse').split(',');
const paths = (args.paths === 'all' || !args.paths ? ALL_PATHS : args.paths).split(',');
const styles = (args.styles || 'normal').split(',');
/* -real: this device's own board (saved as it changes) instead of a made up board where nothing saves */
const opts = { at: args.at === 'real' ? null : args.at != null ? +args.at : 600, calm: !!args.calm, big: !!args.big, real: !!args.real };
const J = (v) => JSON.stringify(v);
const say = (s) => process.stdout.write(s + '\n');

const dir = typeof args.out === 'string' && /\.json$/.test(args.out) ? dirname(args.out) : runDir(args, 'gate' + (webkit ? '-webkit' : ''));
const OUT = typeof args.out === 'string' && /\.json$/.test(args.out) ? args.out : join(dir, 'gate' + (webkit ? '-webkit' : '') + '.json');
mkdirSync(dirname(OUT), { recursive: true });
const shots = args.shots || join(dir, 'shots');

let c, ses = null;
if (webkit) {
  if (inputs.includes('touch')) say('WebKit: touch drags are not run (Playwright sends WebKit no fingers); mouse only.');
  inputs = inputs.filter((x) => x !== 'touch');
  if (!inputs.length) inputs = ['mouse'];
  const { connectWebKit } = await import('./lib/webkit.mjs');
  ses = args.url ? { url: String(args.url), stop: async () => {} } : await session(Object.assign({}, args, { port: null, cdp: null, noChrome: true }), 'webkit');
  c = await connectWebKit({ size: SIZES[sizes[0]] });
  say('WebKit ' + c.version);
} else {
  ses = await session(args);
  c = await connect(ses.port, args.newtab || ses.own ? { target: await newTab(ses.port) } : {});
}
const URL0 = ses.url;
const g = makeGate({ c, url: URL0, opts, shots });
const results = [];
const summary = {};
const save = () => writeFileSync(OUT, J({ at: new Date().toISOString(), url: URL0, browser: webkit ? 'webkit' : 'chrome', opts, summary, results }, null, 1));
try {
  for (const size of sizes) {
    say(`== ${size} ${await g.load(size)}`);
    for (const pathId of paths) {
      let setup = await g.setupPath(pathId);
      if (setup.skip) { say(`   ${pathId} at ${size}: not here (${setup.skip})`); results.push({ size, path: pathId, skip: setup.skip }); summary[`${pathId} | ${size}`] = { na: setup.skip }; continue; }
      for (const input of inputs) {
        if (input === 'touch' && !SIZES[size].mobile) continue;
        for (const style of styles) {
          const key = `${pathId} | ${size} | ${input}` + (styles.length > 1 ? ' | ' + style : '');
          summary[key] = summary[key] || { pass: 0, n: 0, skip: 0, why: [], soft: [] };
          for (let i = 0; i < N; i++) {
            let r;
            try { r = await g.attempt(size, input, pathId, i, style, {}, { clearToasts: !!args['clear-toasts'] }); } catch (e) { r = { error: String(e && e.stack || e).slice(0, 400) }; }
            if (r.skip || r.error) {
              summary[key].skip++;
              say(`   ${key} #${i}: ${r.skip ? 'skip ' + r.skip : 'ERROR ' + r.error}`);
              results.push(Object.assign({ size, input, path: pathId, i, style }, r));
              if (r.error) { await g.load(size); await g.setupPath(pathId); }
              continue;
            }
            summary[key].n++;
            if (r.verdict.pass) summary[key].pass++; else summary[key].why.push('#' + i + ': ' + r.verdict.why.join('; '));
            if (r.verdict.soft.length) summary[key].soft.push('#' + i + ': ' + r.verdict.soft.join('; '));
            results.push(r);
            say(`   ${key} #${i}: ${r.verdict.pass ? 'pass' : 'FAIL ' + r.verdict.why.join('; ')}${r.verdict.soft.length ? ' (' + r.verdict.soft.join('; ') + ')' : ''}`);
            /* a path whose place closed (a step that moved on, a panel that went) opens again */
            setup = await g.setupPath(pathId);
            if (setup.skip) { await g.load(size); await g.setupPath(pathId); }
          }
          save();
        }
      }
    }
  }
} finally {
  save();
  try { await c.closePage(); } catch (e) { /* fine */ }
  c.close();
  if (ses) await ses.stop();
}
say('\nSUMMARY');
let failed = 0, judged = 0;
for (const [k, v] of Object.entries(summary)) {
  if (v.na) { say(`${k}: not on this size (${v.na})`); continue; }
  judged += v.n;
  if (v.pass < v.n) failed++;
  /* a path that's on this size but couldn't run once (no pieces, no target) is a path that broke quietly */
  if (!v.n && v.skip) { failed++; say(`${k}: not run once (every attempt was skipped), which counts as a failure`); }
  say(`${k}: ${v.pass} of ${v.n}` + (v.skip ? ` (${v.skip} skipped)` : '') + (v.why.length ? '\n     ' + v.why.slice(0, 5).join('\n     ') : ''));
}
if (!judged) { say('nothing was judged: every path was skipped'); failed++; }
say('results: ' + OUT);
process.exit(failed ? 1 : 0);
