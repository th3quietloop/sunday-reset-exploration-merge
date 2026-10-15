// The contrast gate: every screen of V11 measured as it's drawn, at the sizes people use, against WCAG 2.2
// AA: 4.5 to 1 for text, 3 to 1 for large text (24 px, or 18.66 px bold), and 3 to 1 for what has to be
// seen that isn't text (a field's edge, a check box, a control that is only a mark, a selected state, a
// focus ring). A word's color is measured with its alpha and every ancestor's opacity, over the real pixels
// behind it (lib/contrast-core.mjs), so glass, gradients, the desk, and fades count as the eye sees them.
// Russell's own rule is reported beside it: words that fade with alpha to look quieter. docs/CONTRAST.md.
//
//   npm run contrast        every screen at iPhone, Duo folded, Duo open, iPad, and Mac, one lane a size
//   node scripts/gate/contrast.mjs -sizes phone,mac -screens phone,settings [-out folder] [-shots] [-verbose]
//     [-build folder] (a V11 build already made) [-serve 4486 -cdp 9486] (the ports it starts on: Chrome on
//     9486 unless -cdp says, the page on a free port unless -serve says)
//     [-url http://localhost:4486/ -port 9486] (a build and a Chrome already running) [-one-lane]
// Groups for -screens: first look phone today planner panels goals breakdown meals more reset todos rituals
// settings toasts band bigtext. Sizes: phone duoFold duoOpen ipad mac. Exit code 1 when anything fails. The run's
// folder (printed at the end) has summary.md, results.json, and, with -shots, a picture of every screen
// that failed.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { connect, newTab, sleep } from './lib/cdp.mjs';
import { parseArgs, runDir, session } from './lib/session.mjs';
import { measure } from './lib/contrast-core.mjs';
import { walk, SIZES, GROUPS } from './lib/contrast-walk.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const sizes = String(args.sizes || Object.keys(SIZES).join(',')).split(',').filter((s) => SIZES[s]);
const groups = args.screens ? String(args.screens).split(',') : GROUPS;
const dir = runDir(args, 'contrast');
const say = (s) => process.stdout.write(s + '\n');
const t0 = Date.now();
if (args.shots) mkdirSync(join(dir, 'shots'), { recursive: true });

const ses = await session(Object.assign({ cdp: 9486, serve: 0 }, args), 'contrast');
say('V11 at ' + ses.url + (ses.root ? ' (' + ses.root + ')' : '') + (ses.chrome ? ', ' + ses.chrome : ''));
let states = [];
try {
  if (sizes.length > 1 && !args['one-lane']) states = await lanes();
  else states = await run(sizes);
} finally {
  await ses.stop();
}
report(states);

/* each size in a lane of its own (a process, a page, and a browser profile of its own), side by side */
async function lanes() {
  say('lanes: ' + sizes.join(', '));
  const jobs = sizes.map((size) => new Promise((ok) => {
    const out = join(dir, 'lane-' + size);
    const extra = ['-url', ses.url, '-port', String(ses.port), '-sizes', size, '-out', out, '-one-lane'].concat(args.screens ? ['-screens', String(args.screens)] : [], args.shots ? ['-shots'] : [], args.verbose ? ['-verbose'] : []);
    const p = spawn(process.execPath, [join(HERE, 'contrast.mjs')].concat(extra), { cwd: HERE });
    let log = '';
    p.stdout.on('data', (d) => { log += d; for (const line of String(d).split('\n')) if (/^   \S/.test(line)) say('[' + size + '] ' + line.trim()); });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', () => { writeFileSync(join(dir, 'lane-' + size + '.log'), log); const f = join(out, 'results.json'); ok(existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).states : [{ size, label: 'lane', error: log.split('\n').filter(Boolean).slice(-3).join(' / '), results: [] }]); });
  }));
  return (await Promise.all(jobs)).flat();
}

/* one lane: every screen at each of these sizes, in order */
async function run(list) {
  const states = [];
  let c = null;
  try {
    for (const size of list) {
      const S = SIZES[size];
      say('== ' + S.label);
      const t = {
        S, size,
        get c() { return c; },
        want: (g) => groups.includes(g),
        sleep,
        ev: (js) => c.ev(js),
        key: (k) => c.key(k, k, { Escape: 27, Enter: 13, Tab: 9 }[k] || 0),
        click: (re, scope = 'button, [role=button], a') => c.ev(`(() => { const re = ${re.toString()}; const b = [...document.querySelectorAll(${JSON.stringify(scope)})].find((e) => e.offsetParent !== null && !e.disabled && re.test((e.textContent || '').trim())); if (!b) return null; b.click(); return (b.textContent || '').trim().slice(0, 60); })()`),
        /* a page in a browser profile of its own (nothing saved), at this size, opened fresh (q: more of the
           address, like from=Russell for a shared link) */
        async fresh(q) {
          if (c) { try { await c.closePage(); } catch (e) { /* gone */ } c.close(); }
          c = await connect(ses.port, { target: await newTab(ses.port), timeout: 90000 });
          await c.viewport(S.w, S.h, S.mobile, S.dpr);
          if (S.ua) await c.send('Emulation.setUserAgentOverride', { userAgent: S.ua });
          await c.nav(ses.url + (ses.url.includes('?') ? '&' : '?') + 'debug' + (q ? '&' + q : ''), 3500);
        },
        async M(label, o = {}) {
          let m;
          try { m = await measure(c, o); } catch (e) { say('   ' + label + ': could not measure (' + String(e.message || e).slice(0, 160) + ')'); states.push({ size, label, error: String(e.message || e).slice(0, 300), results: [] }); return; }
          const fails = m.results.filter((r) => !r.pass);
          const alpha = m.results.filter((r) => r.alpha && r.pass && !r.disabled);
          states.push({ size, label, results: m.results });
          say('   ' + label + ': ' + m.results.length + ' checked, ' + (fails.length ? fails.length + ' FAIL' : 'all pass') + (alpha.length ? ' (' + alpha.length + ' faded with alpha)' : ''));
          if (args.verbose) for (const f of fails) say('      ' + f.kind + ' ' + f.ratio + ' of ' + f.need + ' | ' + f.text + ' | ' + (f.fg ? f.fg + ' seen ' + f.seen + ' on ' + f.bg : (f.how || '') + ' ' + (f.outside || f.bg || '')) + ' | ' + f.path);
          if (args.shots && fails.length) {
            /* the screen as it looks (the measure's own picture has its words hidden) */
            const pic = await c.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
            writeFileSync(join(dir, 'shots', (size + '-' + label).replace(/[^a-z0-9]+/gi, '-').slice(0, 90) + '.png'), Buffer.from(pic.data, 'base64'));
          }
        }
      };
      try { await walk(t); } catch (e) { say('   the walk stopped: ' + String(e && e.stack || e).slice(0, 400)); states.push({ size, label: 'walk', error: String(e && e.message || e), results: [] }); }
      if (c && c.errors.length) { const real = c.errors.filter((e) => !/api\/|favicon|Failed to load resource/.test(e.text + (e.url || ''))); if (real.length) say('   page errors: ' + real.slice(0, 3).map((e) => e.text.slice(0, 120)).join(' / ')); }
    }
  } finally {
    if (c) { try { await c.closePage(); } catch (e) { /* gone */ } c.close(); }
  }
  return states;
}

/* == the summary: by screen, then each failure once with every size it was seen at == */
function report(states) {
  const all = states.flatMap((s) => s.results.map((r) => Object.assign({ size: s.size, label: s.label }, r)));
  const fails = all.filter((r) => !r.pass);
  const errors = states.filter((s) => s.error);
  const faded = all.filter((r) => r.alpha && r.pass && !r.disabled && r.kind !== 'focus');
  const bare = all.filter((r) => r.bare);
  const key = (r) => r.kind + '|' + r.path + '|' + r.text;
  const byKey = new Map();
  for (const f of fails) { const k = key(f); const was = byKey.get(k); if (!was) byKey.set(k, Object.assign({}, f, { where: new Set([f.size + ': ' + f.label]) })); else { was.where.add(f.size + ': ' + f.label); if (f.ratio < was.ratio) Object.assign(was, f, { where: was.where }); } }
  const uniq = Array.from(byKey.values()).sort((a, b) => a.ratio / a.need - b.ratio / b.need);
  const used = sizes.filter((s) => states.some((x) => x.size === s));
  const md = ['# Contrast, ' + new Date().toISOString().slice(0, 16).replace('T', ' '), '',
    states.length + ' screens at ' + used.map((s) => SIZES[s].label).join(', ') + '. ' + all.length + ' things checked, ' + fails.length + ' failing (' + uniq.length + ' different), ' + faded.length + ' words faded with alpha that still pass' + (errors.length ? ', ' + errors.length + ' screens that could not be measured' : '') + '.', '',
    '| Screen | ' + used.map((s) => SIZES[s].label).join(' | ') + ' |', '|---|' + used.map(() => '---').join('|') + '|'];
  const labels = Array.from(new Set(states.map((s) => s.label)));
  for (const l of labels) md.push('| ' + l + ' | ' + used.map((s) => { const st = states.filter((x) => x.size === s && x.label === l); if (!st.length) return ''; if (st.some((x) => x.error)) return 'error'; const n = st.reduce((a, x) => a + x.results.filter((r) => !r.pass).length, 0); return n ? '**' + n + '**' : '0'; }).join(' | ') + ' |');
  if (uniq.length) {
    md.push('', '## Every failure, worst first', '');
    for (const f of uniq) md.push('- **' + f.ratio + '** of ' + f.need + ' (' + f.kind + (f.large ? ', large' : '') + (f.px ? ', ' + f.px + ' px ' : '') + (f.weight ? f.weight : '') + ') "' + f.text + '": ' + (f.fg ? f.fg + ' seen as ' + f.seen + ' on ' + f.bg : (f.how ? f.how + ' ' : '') + (f.color || f.edgeColor || '') + ' on ' + (f.outside || f.bg || '')) + '. `' + f.path + '`. ' + Array.from(f.where).slice(0, 4).join('; ') + (f.where.size > 4 ? '; and ' + (f.where.size - 4) + ' more' : ''));
  }
  if (errors.length) { md.push('', '## Screens that could not be measured', ''); errors.forEach((s) => md.push('- ' + s.size + ': ' + s.label + ': ' + s.error)); }
  if (faded.length) {
    const fk = new Map(); faded.forEach((r) => fk.set(r.path + '|' + r.text, r));
    md.push('', '## Words faded with alpha (they pass, but Russell’s rule is a real color)', '');
    Array.from(fk.values()).slice(0, 40).forEach((r) => md.push('- ' + r.ratio + ' "' + r.text + '": ' + r.fg + ' at opacity ' + r.op + '. `' + r.path + '`'));
  }
  if (bare.length) {
    const bk = new Map(); bare.forEach((r) => bk.set(r.path, r));
    md.push('', '## Fields with no edge by design (read as words; their focus ring is checked)', '');
    Array.from(bk.values()).forEach((r) => md.push('- "' + r.text + '". `' + r.path + '`'));
  }
  const text = md.join('\n');
  writeFileSync(join(dir, 'summary.md'), text);
  writeFileSync(join(dir, 'results.json'), JSON.stringify({ at: new Date().toISOString(), url: ses.url, sizes: used, groups, states }, null, 1));
  if (!args['one-lane']) say('\n' + text);
  const red = fails.length || errors.length;
  say('\n' + (red ? 'CONTRAST: RED, ' + uniq.length + ' different failures' + (errors.length ? ' and ' + errors.length + ' screens not measured' : '') : 'CONTRAST: GREEN') + ' in ' + Math.round((Date.now() - t0) / 1000) + ' s. Everything is in ' + dir);
  process.exit(red ? 1 : 0);
}
