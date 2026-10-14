// Builds each minimal version from the board: v/<id> is board/ with the kit and that version's own
// chrome in place of round two's top bar. node scripts/make-variants.mjs
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ids = ['corners', 'rail', 'library', 'dock', 'corners2', 'corners3', 'corners4', 'corners5', 'corners6', 'corners7', 'corners8', 'corners9', 'corners10', 'corners11'];
const names = { corners: 'Corners', rail: 'Rail', library: 'Library', dock: 'Dock', corners2: 'Corners V2', corners3: 'Corners V3', corners4: 'Corners V4', corners5: 'Corners V5', corners6: 'Corners V6', corners7: 'Corners V7', corners8: 'Corners V8', corners9: 'Corners V9', corners10: 'Corners V10', corners11: 'Corners V11' };
const only = process.argv.slice(2);
const FEEL = new Set(['corners11']);
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  if (!existsSync(join(root, 'variants', id, 'variant.js'))) continue;
  const out = join(root, 'v', id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'board'), out, { recursive: true, filter: (p) => !/merge\.(js|css)$/.test(p) });
  for (const f of ['kit.js', 'kit.css']) cpSync(join(root, 'variants', 'kit', f), join(out, 'src', f));
  for (const f of ['variant.js', 'variant.css']) cpSync(join(root, 'variants', id, f), join(out, 'src', f));
  /* a version's own pictures (a rendered bag, say) go next to its page */
  if (existsSync(join(root, 'variants', id, 'assets'))) cpSync(join(root, 'variants', id, 'assets'), join(out, 'assets'), { recursive: true });
  let html = readFileSync(join(out, 'index.html'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="src/merge.css">', '<link rel="stylesheet" href="src/kit.css">\n<link rel="stylesheet" href="src/variant.css">');
  html = html.replace('<script src="src/merge.js"></script>', '<script src="src/kit.js"></script>\n<script src="src/variant.js"></script>');
  html = html.replace('  <header class="topnav" id="topnav"></header>\n', '');
  html = html.replace('<title>Sunday Reset</title>', `<title>Sunday Reset · ${names[id]}</title>`);
  /* a version that moves on springs says so on its page (feel, in the board's own code) */
  html = html.replace('<body>', `<body class="v-${id}${FEEL.has(id) ? ' feel' : ''}">`);
  writeFileSync(join(out, 'index.html'), html);
  let sw = readFileSync(join(out, 'sw.js'), 'utf8');
  sw = sw.replace("'/src/merge.js',", "'/src/kit.js', '/src/variant.js',").replace("'/src/merge.css',", "'/src/kit.css', '/src/variant.css',").replace(/sundayreset-merge-shell-v\d+/g, `sundayreset-${id}-shell-v1`).replace("k.startsWith('sundayreset-merge-shell-')", `k.startsWith('sundayreset-${id}-shell-')`);
  writeFileSync(join(out, 'sw.js'), sw);
  console.log('v/' + id);
}
