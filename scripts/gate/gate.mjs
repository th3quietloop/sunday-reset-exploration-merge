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
//   todo-step-week todo-step-day move-week move-week-lib move-day stretch-week stretch-day today-bench today-move phone-move phone-stretch
//   setup-try setup-stretch desk-letters desk-home. Sizes: mac1 mac2 ipadL ipadP duoOpen duoFold duoSafari
//   phone phoneL (or -sizes all). -real uses this device's own saved board; -newtab runs in a page of its
//   own so several gates can run side by side; -clear-toasts starts each attempt with no toast.
// -browser webkit runs the same paths in Playwright's WebKit with a mouse (WebKit takes no fingers from
// Playwright, so touch is left out there and the summary says so).
import { connect, newTab, sleep } from './lib/cdp.mjs';
import { makeGate, SIZES } from './lib/core.mjs';
import { parseArgs, runDir, session } from './lib/session.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const N = +(args.n || 5);
const ALL_PATHS = 'reset-yours,reset-todo,reset-meals,reset-move,reset-people,lib-week,lib-day,stack-week,stack-day,todo-step-week,todo-step-day,move-week,move-day,stretch-week,stretch-day,today-bench,today-move,phone-move,phone-stretch,setup-try,setup-stretch,desk-letters,desk-home';
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
/* V11-2: the first press after the page loads is a person's first impression of the desk. The page may take at most
   FIRST_PRESS_MS over it, and with sound on the sound must be made before it: made inside the first press, it held
   the page about 200 ms in Chrome, and a phone's first lift caught for a third of a second. Judged once per load,
   on the first attempt, as its own row (first-press) */
const FIRST_PRESS_MS = 50;
function firstPress(size, input, style, r) {
  const p = r.press;
  if (!p) return;
  const why = [];
  if (p.on && (p.sound === 'none' || p.sound === 'soon')) why.push('the first press started the sound (it should be made before it)');
  if (p.ms > FIRST_PRESS_MS) why.push('the page took ' + p.ms + ' ms over the first press (at most ' + FIRST_PRESS_MS + ')');
  const key = `first-press | ${size} | ${input}`;
  summary[key] = { pass: why.length ? 0 : 1, n: 1, skip: 0, why: why.length ? ['#0: ' + why.join('; ')] : [], soft: [] };
  results.push({ size, input, path: 'first-press', i: 0, style, verdict: { pass: !why.length, why, soft: [] }, press: p });
  say(`   ${key}: ${why.length ? 'FAIL ' + why.join('; ') : 'pass'} (${p.ms} ms, the sound ${p.sound}${p.on ? '' : ', off'})`);
}
/* V11-2: a boot that put something back at rest failed nothing, since the gate counts a page's errors inside each
   drag. When the boot hid the week and showed it again before the first frame (a tab in the background does that,
   a busy machine, Dev holding another day), the week board's rise read a number no step had written yet, and the
   day's blocks flying home to it went with it. Each size's first load is its own row (boot): the watchdog put
   nothing back at rest and said nothing. In Chrome that load gets no frames until the boot is done, and it opens
   in Today the way a weekday does whatever the day (sundayreset.mode, which a preview reads and never writes), so
   the boot's switch to the Planner's week hides and shows it before a frame every run, not only when the timing
   happens to line up. (WebKit can't take a page script back once it's added, so there it's a plain boot.) */
const HOLD_FRAMES = `(() => {
  try { const d = new Date(), p = (n) => String(n).padStart(2, '0'); localStorage.setItem('sundayreset.mode', JSON.stringify({ date: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), mode: 'today' })); } catch (e) { /* fine */ }
  const raf = window.requestAnimationFrame.bind(window), caf = window.cancelAnimationFrame.bind(window), held = new Map();
  let on = false, n = 0;
  window.requestAnimationFrame = (cb) => { if (on) return raf(cb); const id = 1e9 + (++n); held.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { if (!held.delete(id)) caf(id); };
  window.__srFrames = () => { on = true; const q = [...held.values()]; held.clear(); q.forEach((cb) => raf(cb)); return q.length; };
})();`;
async function bootLoad(size) {
  const hold = webkit ? null : await c.send('Page.addScriptToEvaluateOnNewDocument', { source: HOLD_FRAMES });
  const e0 = c.errors.length;
  let where, held = null;
  try { where = await g.load(size); }
  finally {
    if (hold) {
      held = await c.ev('window.__srFrames ? window.__srFrames() : null').catch(() => null);
      await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: hold.identifier }).catch(() => {});
    }
  }
  await sleep(1500);
  const rep = JSON.parse(await c.ev('JSON.stringify(World.debug.repairs || { count: 0, list: [] })'));
  const said = c.errors.slice(e0).filter((e) => /not a number/.test(e.text || ''));
  const why = [];
  if (rep.count) why.push('the watchdog put ' + rep.count + ' back at rest: ' + [...new Set(rep.list.map((x) => x.what + (x.key ? ' ' + x.key : '')))].slice(0, 3).join(', '));
  else if (said.length) why.push('the console said: ' + said[0].text.slice(0, 160));
  const key = `boot | ${size}`;
  summary[key] = { pass: why.length ? 0 : 1, n: 1, skip: 0, why: why.length ? ['#0: ' + why.join('; ')] : [], soft: [] };
  /* (input load: the matrix prints it as a count of its own, and last-green.json holds it like any cell) */
  results.push({ size, input: 'load', path: 'boot', i: 0, verdict: { pass: !why.length, why, soft: [] }, cold: !!hold, held });
  return { where, line: `   ${key}: ${why.length ? 'FAIL ' + why.join('; ') : 'pass'} (${hold ? 'no frames until the boot was done, ' + held + ' held back' : 'a plain boot'})` };
}
try {
  for (const size of sizes) {
    const boot = await bootLoad(size);
    say(`== ${size} ${boot.where}`);
    say(boot.line);
    let fresh = true;
    for (const pathId of paths) {
      let setup = await g.setupPath(pathId);
      /* n/a means only that a path isn't on this size (the path says so: na). A setup that couldn't open its place
         (a button that moved, a panel that didn't come) is a path that broke: not run, which fails the gate */
      if (setup.skip && setup.na) { say(`   ${pathId} at ${size}: not here (${setup.skip})`); results.push({ size, path: pathId, skip: setup.skip, na: true }); summary[`${pathId} | ${size}`] = { na: setup.skip }; continue; }
      if (setup.skip) {
        for (const input of inputs) {
          if (input === 'touch' && !SIZES[size].mobile) continue;
          const key = `${pathId} | ${size} | ${input}`;
          summary[key] = { pass: 0, n: 0, skip: 1, why: [], soft: [] };
          say(`   ${key}: could not open (${setup.skip})`);
          results.push({ size, input, path: pathId, i: 0, style: styles[0], skip: 'could not open: ' + setup.skip });
        }
        save();
        continue;
      }
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
              if (r.error) { await g.load(size); fresh = true; await g.setupPath(pathId); }
              continue;
            }
            summary[key].n++;
            if (r.verdict.pass) summary[key].pass++; else summary[key].why.push('#' + i + ': ' + r.verdict.why.join('; '));
            if (r.verdict.soft.length) summary[key].soft.push('#' + i + ': ' + r.verdict.soft.join('; '));
            results.push(r);
            say(`   ${key} #${i}: ${r.verdict.pass ? 'pass' : 'FAIL ' + r.verdict.why.join('; ')}${r.verdict.soft.length ? ' (' + r.verdict.soft.join('; ') + ')' : ''}`);
            if (fresh) { fresh = false; firstPress(size, input, style, r); }
            /* a path whose place closed (a step that moved on, a panel that went) opens again */
            setup = await g.setupPath(pathId);
            if (setup.skip) { await g.load(size); fresh = true; await g.setupPath(pathId); }
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
