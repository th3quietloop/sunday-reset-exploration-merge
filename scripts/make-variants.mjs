// Builds each minimal version from the board: v/<id> is board/ with the kit and that version's own
// chrome in place of round two's top bar. node scripts/make-variants.mjs
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ids = ['corners', 'rail', 'library', 'dock'];
const names = { corners: 'Corners', rail: 'Rail', library: 'Library', dock: 'Dock' };
for (const id of ids) {
  if (!existsSync(join(root, 'variants', id, 'variant.js'))) continue;
  const out = join(root, 'v', id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'board'), out, { recursive: true, filter: (p) => !/merge\.(js|css)$/.test(p) });
  for (const f of ['kit.js', 'kit.css']) cpSync(join(root, 'variants', 'kit', f), join(out, 'src', f));
  for (const f of ['variant.js', 'variant.css']) cpSync(join(root, 'variants', id, f), join(out, 'src', f));
  let html = readFileSync(join(out, 'index.html'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="src/merge.css">', '<link rel="stylesheet" href="src/kit.css">\n<link rel="stylesheet" href="src/variant.css">');
  html = html.replace('<script src="src/merge.js"></script>', '<script src="src/kit.js"></script>\n<script src="src/variant.js"></script>');
  html = html.replace('  <header class="topnav" id="topnav"></header>\n', '');
  html = html.replace('<title>Sunday Reset</title>', `<title>Sunday Reset · ${names[id]}</title>`);
  html = html.replace('<body>', `<body class="v-${id}">`);
  writeFileSync(join(out, 'index.html'), html);
  let sw = readFileSync(join(out, 'sw.js'), 'utf8');
  sw = sw.replace("'/src/merge.js',", "'/src/kit.js', '/src/variant.js',").replace("'/src/merge.css',", "'/src/kit.css', '/src/variant.css',").replace(/sundayreset-merge-shell-v\d+/g, `sundayreset-${id}-shell-v1`).replace("k.startsWith('sundayreset-merge-shell-')", `k.startsWith('sundayreset-${id}-shell-')`);
  writeFileSync(join(out, 'sw.js'), sw);
  console.log('v/' + id);
}
