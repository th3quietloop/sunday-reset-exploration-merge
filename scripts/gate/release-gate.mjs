// The release gate for picking a block up and putting it down. It builds V11 into a folder of its own,
// serves it, starts a headless Chrome, and runs the matrix (lib/paths.js: every path, at each size, with a
// mouse and a finger) in lanes side by side, plus a WebKit lane (Playwright's WebKit, a mouse at Mac size;
// it takes no fingers). Then it prints the matrix and every failure, and says GREEN or RED.
//
//   npm run gate        every path at mac1, ipadP, duoFold and phone, mouse and touch, 3 times each, + WebKit
//   npm run gate:full   every size, 5 times each, + WebKit, + the tries to break it (break.mjs)
//
//   node scripts/gate/release-gate.mjs [-full] [-n 3] [-sizes mac1,phone] [-paths reset-yours,lib-week]
//     [-build folder] (a V11 build already made) [-serve 4467] [-cdp 9467] [-lanes 3] [-no-webkit]
//     [-no-break] [-out folder] [-verbose]
// Exit code 1 when anything failed. Results, the summary, and pictures of every failure are in the run's
// folder (printed at the end; the system's temporary folder unless -out says).
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

/* sizes into lanes of about the same work: a size with the desk and a finger has twice the paths */
const weight = (s) => (/^(ipadL|ipadP|duoOpen|phoneL)$/.test(s) ? 2 : 1);
const laneCount = Math.max(1, Math.min(+(args.lanes || 3), sizes.length));
const lanes = Array.from({ length: laneCount }, () => ({ sizes: [], w: 0 }));
sizes.slice().sort((a, b) => weight(b) - weight(a)).forEach((s) => { const l = lanes.reduce((a, b) => (b.w < a.w ? b : a)); l.sizes.push(s); l.w += weight(s); });

const ses = await session(args, 'gate');
say('V11 at ' + ses.url + (ses.root ? ' (' + ses.root + ')' : '') + (ses.chrome ? ', ' + ses.chrome : ''));
say('results: ' + dir);
const run = (script, extra, tag) => new Promise((ok) => {
  const p = spawn(process.execPath, [join(HERE, script), '-url', ses.url].concat(extra), { cwd: HERE });
  let out = '';
  p.stdout.on('data', (d) => { out += d; if (args.verbose) process.stdout.write('[' + tag + '] ' + d); });
  p.stderr.on('data', (d) => { out += d; if (args.verbose) process.stderr.write('[' + tag + '] ' + d); });
  p.on('close', (code) => { writeFileSync(join(dir, tag + '.log'), out); ok({ code, out, tag }); });
});
let res = [], br = [], wk = null;
try {
  /* (-no-matrix runs only the tries to break it, with -full) */
  const jobs = args['no-matrix'] ? [] : lanes.map((l, i) => run('gate.mjs', ['-newtab', '-port', String(ses.port), '-sizes', l.sizes.join(','), '-inputs', 'mouse,touch', '-paths', paths, '-n', n, '-out', join(dir, 'lane-' + (i + 1) + '.json'), '-shots', join(dir, 'shots')], 'lane-' + (i + 1)));
  if (jobs.length) say('matrix: ' + lanes.map((l) => l.sizes.join(',')).join(' | ') + ', ' + n + ' attempts per cell, mouse and touch');
  /* the WebKit lane: a mouse at Mac size (Playwright drives no fingers in WebKit) */
  if (!args['no-webkit']) jobs.push(run('gate.mjs', ['-browser', 'webkit', '-sizes', 'mac1', '-inputs', 'mouse', '-paths', paths, '-n', n, '-out', join(dir, 'webkit.json'), '-shots', join(dir, 'shots-webkit')], 'webkit'));
  const all = await Promise.all(jobs);
  res = all.filter((r) => r.tag !== 'webkit');
  wk = all.find((r) => r.tag === 'webkit') || null;
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
const text = md.join('\n');
writeFileSync(join(dir, 'summary.md'), text);
say(text);
const brFailed = br.some((b) => b.code !== 0);
const failed = res.some((r) => r.code !== 0) || (wk && wk.code !== 0) || brFailed || (!files.length && !args['no-matrix']);
say('\n' + (failed ? 'GATE: RED (see the failures above)' : 'GATE: GREEN') + ' in ' + Math.round((Date.now() - t0) / 60000) + ' min. Everything is in ' + dir);
process.exit(failed ? 1 : 0);
