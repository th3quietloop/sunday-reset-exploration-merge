// Turns gate result files into the matrix (path by size by input: passed of judged) and the list of
// failures. node scripts/gate/summarize.mjs lane-1.json lane-2.json [-md out.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ORDER = ['mac1', 'mac2', 'ipadL', 'ipadP', 'duoOpen', 'duoFold', 'duoSafari', 'phone', 'phoneL'];
const LABEL = { mac1: 'Mac 1440x900', mac2: 'Mac 1280x800', ipadL: 'iPad 1180x820', ipadP: 'iPad 820x1180', duoOpen: 'Duo open 951x669', duoFold: 'Duo folded 466x678', duoSafari: 'Duo Safari 386x580', phone: 'iPhone 390x844', phoneL: 'iPhone 844x390' };

export function summarize(files, o = {}) {
  const cell = {}, fails = [], na = {}, seen = new Set();
  for (const f of files) {
    let d;
    try { d = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { continue; }
    for (const r of d.results || []) {
      seen.add(r.size);
      const key = r.path + '|' + r.size;
      if (r.skip && !r.input) { na[key] = r.skip; continue; }
      const k = r.path + '|' + r.size + '|' + (r.input || '?');
      const c = cell[k] = cell[k] || { pass: 0, n: 0, skip: 0, skipWhy: new Set() };
      if (r.skip || r.error) { c.skip++; c.skipWhy.add(r.skip || 'error: ' + String(r.error).slice(0, 80)); continue; }
      c.n++;
      if (r.verdict && r.verdict.pass) c.pass++;
      else fails.push({ path: r.path, size: r.size, input: r.input, i: r.i, style: r.style, why: r.verdict ? r.verdict.why.join('; ') : '?', shot: r.shot });
    }
  }
  const sizes = (o.sizes || ORDER).filter((s) => seen.has(s));
  const paths = Array.from(new Set(Object.keys(cell).map((k) => k.split('|')[0]).concat(Object.keys(na).map((k) => k.split('|')[0]))));
  const lines = [];
  lines.push('| Path | ' + sizes.map((s) => LABEL[s] || s).join(' | ') + ' |');
  lines.push('|---|' + sizes.map(() => '---').join('|') + '|');
  for (const p of paths) {
    const row = [p];
    for (const s of sizes) {
      const bits = [];
      /* (a row judged once per load, like boot, has no mouse or finger: its count stands alone) */
      for (const inp of ['mouse', 'touch', 'load']) {
        const c = cell[p + '|' + s + '|' + inp];
        if (!c) continue;
        const tag = inp === 'load' ? '' : inp[0] + ' ';
        if (!c.n && c.skip) { bits.push(tag + 'not run !'); continue; }
        bits.push(tag + c.pass + '/' + c.n + (c.pass < c.n ? ' !' : ''));
      }
      if (!bits.length) bits.push(na[p + '|' + s] ? 'n/a' : '');
      row.push(bits.join(', '));
    }
    lines.push('| ' + row.join(' | ') + ' |');
  }
  let total = 0, passed = 0;
  Object.values(cell).forEach((c) => { total += c.n; passed += c.pass; });
  lines.push('', `Drops judged: ${total}, passed: ${passed}, failed: ${total - passed}. (m is a mouse, t a finger, n/a a path that isn't on that size.)`);
  const naWhy = {}, notRun = {};
  Object.entries(na).forEach(([k, v]) => { (naWhy[v] = naWhy[v] || []).push(k.replace('|', ' at ')); });
  /* a path that's on a size but couldn't run once is a path that broke quietly: it counts as a failure */
  Object.entries(cell).forEach(([k, c]) => { if (!c.n && c.skip) { const w = [...c.skipWhy].join(' / '); (notRun[w] = notRun[w] || []).push(k.split('|').slice(0, 2).join(' at ') + ' (' + k.split('|')[2] + ')'); } });
  if (Object.keys(naWhy).length) { lines.push('', 'Not on a size (n/a), and why:'); Object.entries(naWhy).forEach(([why, ks]) => lines.push('- ' + why + ': ' + ks.join(', '))); }
  if (Object.keys(notRun).length) { lines.push('', 'Not run once, which counts as a failure:'); Object.entries(notRun).forEach(([why, ks]) => lines.push('- ' + why + ': ' + ks.join(', '))); }
  if (fails.length) {
    lines.push('', 'Failures:');
    const byWhy = {};
    fails.forEach((f) => { const w = f.why.replace(/\d{4}-\d\d-\d\d \d+/g, 'D T').replace(/\d+/g, 'N'); (byWhy[w] = byWhy[w] || []).push(f); });
    Object.entries(byWhy).forEach(([w, fs]) => { lines.push(`- ${fs.length}x ${w}`); fs.slice(0, 6).forEach((f) => lines.push(`    ${f.path} | ${f.size} | ${f.input} #${f.i}: ${f.why.slice(0, 160)}${f.shot ? ' [' + f.shot + ']' : ''}`)); });
  }
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = process.argv.slice(2).filter((a) => !a.startsWith('-') && /\.json$/.test(a));
  const mi = process.argv.indexOf('-md') >= 0 ? process.argv.indexOf('-md') : process.argv.indexOf('--md');
  const md = summarize(files);
  console.log(md);
  if (mi >= 0 && process.argv[mi + 1]) writeFileSync(process.argv[mi + 1], md);
}
