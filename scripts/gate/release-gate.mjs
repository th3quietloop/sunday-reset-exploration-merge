// The release gate for picking a block up and putting it down. It builds the version in the works (V11-2) into a
// folder of its own, serves it, starts a headless Chrome, and runs the matrix (lib/paths.js: every path, at each
// size, with a mouse and a finger) in lanes side by side, plus a WebKit lane (Playwright's WebKit, a mouse at Mac
// size; it takes no fingers), and the board's size at rest against V11's (boardsize.mjs). Then it prints the matrix
// and every failure, and says GREEN or RED, or INVALID when it failed while the machine was too busy to judge.
//
//   npm run gate        every path at mac1, ipadP, duoFold and phone, mouse and touch, 3 times each, + WebKit
//   npm run gate:full   every size, 5 times each, + WebKit, + the tries to break it (break.mjs)
//
//   node scripts/gate/release-gate.mjs [-full] [-n 3] [-sizes mac1,phone] [-paths reset-yours,lib-week]
//     [-build folder] (a build already made) [-serve 4467] [-cdp 9467] [-lanes 3] [-no-webkit]
//     [-no-break] [-no-size] [-out folder] [-verbose] [-baseline file] [-no-baseline]
// Exit code 1 when anything failed, 2 when it failed while the load average was over twice the cores (INVALID: run
// it again on a quieter machine). Results, the summary, and pictures of every failure are in the run's folder
// (printed at the end; the system's temporary folder unless -out says).
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, runDir, session } from './lib/session.mjs';
import { summarize } from './summarize.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const full = !!args.full;
const n = String(args.n || (full ? 5 : 3));
const SIZES_GATE = 'mac1,ipadP,duoFold,phone', SIZES_ALL = 'mac1,mac2,ipadL,ipadP,duoOpen,duoFold,duoSafari,phone,phoneL';
const sizes = String(args.sizes || (full ? SIZES_ALL : SIZES_GATE)).split(',');
const paths = String(args.paths || 'all');
const dir = runDir(args, full ? 'gate-full' : 'gate');
const say = (s) => process.stdout.write(s + '\n');
const t0 = Date.now();
/* how busy the machine is (the 1 minute load average), every 10 s through the run: drops judged on a machine
   with the load over twice its cores say more about the machine than the app (Oct 15: at 57 on 14 cores, 96 of
   234 drops failed and none of it was the app) */
const CORES = cpus().length, LOAD_MAX = 2 * CORES, loads = [];
const sampleLoad = () => loads.push(+loadavg()[0].toFixed(2));
sampleLoad();
const loadTimer = setInterval(sampleLoad, 10000);

/* sizes into lanes of about the same work: a size with the desk and a finger has twice the paths */
const weight = (s) => (/^(ipadL|ipadP|duoOpen|phoneL)$/.test(s) ? 2 : 1);
const laneCount = Math.max(1, Math.min(+(args.lanes || 3), sizes.length));
const lanes = Array.from({ length: laneCount }, () => ({ sizes: [], w: 0 }));
sizes.slice().sort((a, b) => weight(b) - weight(a)).forEach((s) => { const l = lanes.reduce((a, b) => (b.w < a.w ? b : a)); l.sizes.push(s); l.w += weight(s); });

const ses = await session(args, 'gate');
say((ses.root ? basename(ses.root) : 'the build') + ' at ' + ses.url + (ses.root ? ' (' + ses.root + ')' : '') + (ses.chrome ? ', ' + ses.chrome : ''));
say('load average ' + loads[0] + ' on ' + CORES + ' cores' + (loads[0] > LOAD_MAX ? ': over ' + LOAD_MAX + ', so a failure here will say INVALID, not RED' : ''));
say('results: ' + dir);
const run = (script, extra, tag) => new Promise((ok) => {
  const p = spawn(process.execPath, [join(HERE, script), '-url', ses.url].concat(extra), { cwd: HERE });
  let out = '';
  p.stdout.on('data', (d) => { out += d; if (args.verbose) process.stdout.write('[' + tag + '] ' + d); });
  p.stderr.on('data', (d) => { out += d; if (args.verbose) process.stderr.write('[' + tag + '] ' + d); });
  p.on('close', (code) => { writeFileSync(join(dir, tag + '.log'), out); ok({ code, out, tag }); });
});
let res = [], br = [], wk = null, bs = null;
try {
  /* (-no-matrix runs only the tries to break it, with -full) */
  const jobs = args['no-matrix'] ? [] : lanes.map((l, i) => run('gate.mjs', ['-newtab', '-port', String(ses.port), '-sizes', l.sizes.join(','), '-inputs', 'mouse,touch', '-paths', paths, '-n', n, '-out', join(dir, 'lane-' + (i + 1) + '.json'), '-shots', join(dir, 'shots')], 'lane-' + (i + 1)));
  if (jobs.length) say('matrix: ' + lanes.map((l) => l.sizes.join(',')).join(' | ') + ', ' + n + ' attempts per cell, mouse and touch');
  /* the WebKit lane: a mouse at Mac size (Playwright drives no fingers in WebKit) */
  if (!args['no-webkit']) jobs.push(run('gate.mjs', ['-browser', 'webkit', '-sizes', 'mac1', '-inputs', 'mouse', '-paths', paths, '-n', n, '-out', join(dir, 'webkit.json'), '-shots', join(dir, 'shots-webkit')], 'webkit'));
  const all = await Promise.all(jobs);
  res = all.filter((r) => r.tag !== 'webkit');
  wk = all.find((r) => r.tag === 'webkit') || null;
  /* the board's size at rest, against V11's (board-size.json): Week, Day and Now at 1440x900, Week at 1024x768,
     the phone's desk at 375x812 */
  if (!args['no-matrix'] && !args['no-size']) bs = await run('boardsize.mjs', ['-newtab', '-port', String(ses.port), '-out', join(dir, 'board-size.json')], 'board-size');
  if (full && !args['no-break']) {
    say('tries to break it');
    const bn = String(args['break-n'] || 3);
    br = await Promise.all([
      run('break.mjs', ['-newtab', '-port', String(ses.port), '-sizes', 'phone,duoFold', '-n', bn, '-out', join(dir, 'break-touch.json'), '-shots', join(dir, 'shots-break')], 'break-touch'),
      run('break.mjs', ['-newtab', '-port', String(ses.port), '-sizes', 'ipadP', '-n', bn, '-out', join(dir, 'break-ipad.json'), '-shots', join(dir, 'shots-break')], 'break-ipad'),
      run('break.mjs', ['-newtab', '-port', String(ses.port), '-sizes', 'mac1', '-n', bn, '-out', join(dir, 'break-mac.json'), '-shots', join(dir, 'shots-break')], 'break-mac')
    ]);
  }
} finally {
  await ses.stop();
}
const files = lanes.map((l, i) => join(dir, 'lane-' + (i + 1) + '.json')).filter(existsSync);
const md = ['# Drag gate, ' + new Date().toISOString().slice(0, 16).replace('T', ' ')];
if (files.length) md.push('', '## Chrome (mouse and touch)', '', summarize(files));
if (wk) {
  md.push('', '## WebKit (mouse at 1440x900; touch drags are not run in WebKit, Playwright sends it no fingers)', '');
  md.push(existsSync(join(dir, 'webkit.json')) ? summarize([join(dir, 'webkit.json')], { sizes: ['mac1'] }) : 'The WebKit lane did not run: ' + (wk.out.split('\n').filter(Boolean).slice(-3).join(' / ') || 'no output'));
}
for (const b of br) {
  const s = b.out.split('\nSUMMARY\n')[1] || b.out.slice(-2000);
  md.push('', '## Tries to break it: ' + b.tag, '', '```', s.trim(), '```');
}
if (bs) {
  const s = bs.out.split('\nSUMMARY\n')[1] || bs.out.slice(-2000);
  md.push('', '## The board at rest, against V11 (more than 2 percent smaller fails)', '', '```', s.trim(), '```');
}
/* == the last green run ==
   A cell (a path at a size with an input) that ran in the last green run and doesn't run now fails the gate,
   whatever this run calls it: a path that comes back n/a hides itself instead of being tested. The cells a green
   run ran are kept in last-green.json beside this script (-baseline file to use another, -no-baseline to skip);
   a green run adds to them, and a cell leaves only when someone takes it out of that file by hand. */
const BASE = typeof args.baseline === 'string' ? args.baseline : join(HERE, 'last-green.json');
const ranIn = (fs) => {
  const out = new Set(), why = {};
  for (const f of fs) {
    let d; try { d = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { continue; }
    for (const r of d.results || []) {
      if (r.input && r.verdict) out.add(r.path + '|' + r.size + '|' + r.input);
      else if (r.skip) why[r.path + '|' + r.size + (r.input ? '|' + r.input : '')] = r.skip;
    }
  }
  return { out, why };
};
const wkFile = join(dir, 'webkit.json');
const now = { chrome: ranIn(files), webkit: ranIn(wk && existsSync(wkFile) ? [wkFile] : []) };
const pathIn = (p) => paths === 'all' || paths.split(',').includes(p);
/* (WebKit runs at Mac size only) */
const inScope = { chrome: (s, p) => files.length > 0 && sizes.includes(s) && pathIn(p), webkit: (s, p) => !!wk && s === 'mac1' && pathIn(p) };
let base = null;
if (!args['no-baseline']) { try { base = JSON.parse(readFileSync(BASE, 'utf8')); } catch (e) { base = null; } }
const lost = [];
if (base) {
  for (const lane of ['chrome', 'webkit']) {
    for (const cell of base[lane] || []) {
      const [p, s, i] = cell.split('|');
      if (!inScope[lane](s, p) || now[lane].out.has(cell)) continue;
      lost.push((lane === 'webkit' ? 'WebKit, ' : '') + p + ' at ' + s + ' (' + i + '): ' + (now[lane].why[p + '|' + s + '|' + i] || now[lane].why[p + '|' + s] || 'not in this run'));
    }
  }
  if (lost.length) md.push('', '## Ran in the last green run, not now (each counts as a failure)', '', ...lost.map((x) => '- ' + x));
}
clearInterval(loadTimer);
sampleLoad();
const peak = Math.max(...loads), mean = loads.reduce((a, b) => a + b, 0) / loads.length;
md.push('', 'Load average (1 minute) through the run: ' + Math.min(...loads) + ' to ' + peak + ', ' + mean.toFixed(1) + ' on average, on ' + CORES + ' cores' + (peak > LOAD_MAX ? '. Over ' + LOAD_MAX + ' (twice the cores): a drop that failed here would say INVALID, not RED; a green run stands.' : '.'));
const text = md.join('\n');
writeFileSync(join(dir, 'summary.md'), text);
say(text);
const brFailed = br.some((b) => b.code !== 0);
const dropsFailed = res.some((r) => r.code !== 0) || (wk && wk.code !== 0) || brFailed || (!files.length && !args['no-matrix']) || lost.length > 0;
const sizeFailed = !!(bs && bs.code !== 0);
const failed = dropsFailed || sizeFailed;
/* drops that failed while the machine was over twice its cores make the run INVALID, not RED: run it again on a
   quieter machine. (A green run under that load stands: everything landed anyway. A board that's too small is
   measured at rest, so it's RED whatever the load) */
const invalid = dropsFailed && !sizeFailed && peak > LOAD_MAX;
/* a green run keeps what it ran, for the next run to hold to */
if (!failed && !args['no-baseline']) {
  const next = { about: 'The cells (path|size|input) the last green drag gate ran. A cell here that does not run fails the gate. Written by release-gate.mjs after a green run; take a cell out by hand only when its path is meant to leave that size.', chrome: [], webkit: [] };
  for (const lane of ['chrome', 'webkit']) next[lane] = Array.from(new Set(((base && base[lane]) || []).concat([...now[lane].out]))).sort();
  try { writeFileSync(BASE, JSON.stringify(next, null, 1) + '\n'); } catch (e) { say('could not keep the last green run in ' + BASE + ': ' + e.message); }
}
say('\n' + (invalid ? 'GATE: INVALID (it failed while the load average reached ' + peak + ' on ' + CORES + ' cores; run it again when the machine is quieter)' : failed ? 'GATE: RED (see the failures above)' : 'GATE: GREEN') + ' in ' + Math.round((Date.now() - t0) / 60000) + ' min. Everything is in ' + dir);
process.exit(invalid ? 2 : failed ? 1 : 0);
