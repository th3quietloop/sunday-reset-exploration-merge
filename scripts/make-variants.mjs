// Builds each minimal version from the board: v/<id> is board/ with the kit and that version's own
// chrome in place of round two's top bar. node scripts/make-variants.mjs
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ids = ['corners', 'rail', 'library', 'dock', 'corners2', 'corners3', 'corners4', 'corners5', 'corners6', 'corners7', 'corners8', 'corners9', 'corners10', 'corners11', 'corners11-2', 'corners11-3'];
const names = { corners: 'Corners', rail: 'Rail', library: 'Library', dock: 'Dock', corners2: 'Corners V2', corners3: 'Corners V3', corners4: 'Corners V4', corners5: 'Corners V5', corners6: 'Corners V6', corners7: 'Corners V7', corners8: 'Corners V8', corners9: 'Corners V9', corners10: 'Corners V10', corners11: 'Corners V11', 'corners11-2': 'Corners V11-2', 'corners11-3': 'Corners V11-3' };
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const thaw = process.argv.includes('--thaw');
/* a later round of a version is built from that version's source under its own name and link: V11-2 grows in
   variants/corners11, and v/corners11 stays as V11 went live (Oct 15), built again only with --thaw */
const ALIAS = { 'corners11-2': 'corners11', 'corners11-3': 'corners11' };
const FROZEN = new Set(['corners11', 'corners11-2']);
const LINKS = { corners11: 'https://sunday-reset-corners-v11.vercel.app', 'corners11-2': 'https://sunday-reset-corners-v11-2.vercel.app', 'corners11-3': 'https://sunday-reset-corners-v11-3.vercel.app' };
const FEEL = new Set(['corners11', 'corners11-2', 'corners11-3']);
/* versions whose page code goes out minified (V11-3, code review 35: app.js alone was 1.59 MB to parse on a phone).
   Only the built copy is minified; the source and every test that reads it stay as written. MV_MIN=0 builds it
   plain, to read a stack trace */
const MIN = new Set(['corners11-3']);
const minify = MIN.size && process.env.MV_MIN !== '0' ? (() => { try { return createRequire(import.meta.url)('esbuild'); } catch (e) { console.log('esbuild is not installed: the page code goes out as written'); return null; } })() : null;
const jsUnder = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? jsUnder(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name)] : [])) : []);
/* versions that draw their marks from Phosphor's vectors (board/src/icon-paths.js) */
const VEC = new Set(['corners11', 'corners11-2', 'corners11-3']);
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const src = ALIAS[id] || id;
  if (!existsSync(join(root, 'variants', src, 'variant.js'))) continue;
  if (FROZEN.has(id) && !process.env.MV_OUT && !thaw) { console.log('v/' + id + ' is frozen (it is live as built); build ' + Object.keys(ALIAS).filter((k) => ALIAS[k] === id).join(', ') + ' instead, or pass --thaw'); continue; }
  /* MV_OUT=/some/folder builds there instead of v/, so several people can build and test at once */
  const out = process.env.MV_OUT ? join(process.env.MV_OUT, id) : join(root, 'v', id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'board'), out, { recursive: true, filter: (p) => !/merge\.(js|css)$/.test(p) });
  for (const f of ['kit.js', 'kit.css']) cpSync(join(root, 'variants', 'kit', f), join(out, 'src', f));
  for (const f of ['variant.js', 'variant.css']) cpSync(join(root, 'variants', src, f), join(out, 'src', f));
  /* a version's finishing pass on spacing and alignment, kept in its own file, loads last */
  const polish = existsSync(join(root, 'variants', src, 'polish.css'));
  if (polish) cpSync(join(root, 'variants', src, 'polish.css'), join(out, 'src', 'polish.css'));
  /* a version's stylesheets kept per area (css/*.css) load after polish.css, in name order */
  const areaCss = existsSync(join(root, 'variants', src, 'css')) ? readdirSync(join(root, 'variants', src, 'css')).filter((f) => f.endsWith('.css')).sort() : [];
  if (areaCss.length) cpSync(join(root, 'variants', src, 'css'), join(out, 'src', 'css'), { recursive: true });
  /* a version's own tools (the type tester) go in lab/, beside its page, so they can open it in a frame */
  if (existsSync(join(root, 'variants', src, 'lab'))) cpSync(join(root, 'variants', src, 'lab'), join(out, 'lab'), { recursive: true });
  /* a version's own pictures (a rendered bag, say) go next to its page */
  if (existsSync(join(root, 'variants', src, 'assets'))) cpSync(join(root, 'variants', src, 'assets'), join(out, 'assets'), { recursive: true });
  /* a version's own server functions (V11's smart breakdowns) go in api/, where Vercel serves each as /api/<name> */
  if (existsSync(join(root, 'variants', src, 'api'))) {
    cpSync(join(root, 'variants', src, 'api'), join(out, 'api'), { recursive: true });
    /* Vercel picks a function's module format from the package.json at the top of the deployed folder: without
       one it compiles api/*.js to CommonJS, which Node then refuses beside a package.json that says module */
    writeFileSync(join(out, 'package.json'), '{\n  "type": "module"\n}\n');
  }
  let html = readFileSync(join(out, 'index.html'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="src/merge.css">', '<link rel="stylesheet" href="src/kit.css">\n<link rel="stylesheet" href="src/variant.css">' + (polish ? '\n<link rel="stylesheet" href="src/polish.css">' : '') + areaCss.map((f) => '\n<link rel="stylesheet" href="src/css/' + f + '">').join(''));
  html = html.replace('<script src="src/merge.js"></script>', '<script src="src/kit.js"></script>\n<script src="src/variant.js"></script>');
  /* V11 sets its words in Onest (Russell's pick from the type tester) */
  if (src === 'corners11') html = html.replace('&family=Poppins:wght@400;500;600;700', '&family=Poppins:wght@400;500;600;700&family=Onest:wght@400..800');
  if (VEC.has(id)) html = html.replace('<script src="src/icons.js"></script>', '<script src="src/icon-paths.js"></script>\n<script src="src/icons.js"></script>');
  html = html.replace('  <header class="topnav" id="topnav"></header>\n', '');
  /* V11 (Oct 15, the first-visit walk): the page and its link preview say Sunday Reset, never a build's name (Corners
     V11 read as a prototype in a friend's message); the version's name stays in a meta tag. A link pasted into Messages
     shows the desk with a week on it (assets/og.png, rendered from the app) and the manifest's one line. */
  if (src === 'corners11') {
    const og = LINKS[id] + '/assets/og.png', line = 'Your week as wooden blocks. Plan it on Sunday, live it on your phone.';
    /* (V11-3, design review 54: these sites have no sync server, so the page says so and never asks for /api/config,
       which answered 404 on every load; the board's own page, served with its server, still asks) */
    html = html.replace('<title>Sunday Reset</title>', ['<title>Sunday Reset</title>', `<meta name="sunday-reset-version" content="${names[id]}">`, '<meta name="sunday-reset-sync" content="off">',
      '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Sunday Reset">', '<meta property="og:title" content="Sunday Reset">', `<meta property="og:description" content="${line}">`,
      `<meta property="og:image" content="${og}">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', '<meta property="og:image:alt" content="A wooden desk with a week of colored blocks on it, Sunday to Saturday">',
      `<meta property="og:url" content="${LINKS[id]}/">`, '<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:title" content="Sunday Reset">', `<meta name="twitter:description" content="${line}">`, `<meta name="twitter:image" content="${og}">`].join('\n'));
  } else html = html.replace('<title>Sunday Reset</title>', `<title>Sunday Reset · ${names[id]}</title>`);
  /* a version that moves on springs says so on its page (feel, in the board's own code) */
  html = html.replace('<body>', `<body class="v-${src}${src !== id ? ' v-' + id : ''}${FEEL.has(id) ? ' feel' : ''}">`);
  writeFileSync(join(out, 'index.html'), html);
  /* the page's code, minified where the version says so: each script on its own, as a classic script, so its top
     level names (what one script shares with the next) stay as they are and only what's inside is shortened */
  if (MIN.has(id) && minify) {
    let before = 0, after = 0;
    for (const f of jsUnder(join(out, 'src'))) {
      const code = readFileSync(f, 'utf8');
      try {
        const r = minify.transformSync(code, { minify: true, loader: 'js', legalComments: 'inline', sourcefile: relative(out, f) });
        writeFileSync(f, r.code); before += code.length; after += r.code.length;
      } catch (e) { throw new Error('could not minify ' + relative(out, f) + ': ' + e.message); }
    }
    console.log('  page code ' + Math.round(before / 1024) + ' KB, minified ' + Math.round(after / 1024) + ' KB');
  }
  let sw = readFileSync(join(out, 'sw.js'), 'utf8');
  const swFrom = sw;
  sw = sw.replace("'/src/merge.js',", "'/src/kit.js', '/src/variant.js',").replace("'/src/merge.css',", "'/src/kit.css', '/src/variant.css'," + (polish ? " '/src/polish.css'," : '')).replace("'/src/icons.js',", VEC.has(id) ? "'/src/icon-paths.js', '/src/icons.js'," : "'/src/icons.js',").replace("const PREFIX = 'sundayreset-merge-shell-';", `const PREFIX = 'sundayreset-${id}-shell-';`);
  /* V11-2 (the unhappy gate): the worker keeps what the page loads, all of it, so a phone that opened the app once opens it
     again with no connection and gets its desk: the version's own style sheets, and the 3D library from its CDN (kept
     by the worker at install; the page's first visit asks for it before the worker is there). */
  const libs = Array.from(html.matchAll(/<script src="(https:\/\/cdn\.jsdelivr\.net\/[^"]+)"/g)).map((m) => m[1]);
  sw = sw.replace("'/manifest.webmanifest',", areaCss.map((f) => "'/src/css/" + f + "', ").join('') + libs.map((u) => "'" + u + "', ").join('') + "'/manifest.webmanifest',");
  /* V11-3 (code review 9): the copy's name comes from a hash of the files it keeps, their names and what's in them,
     so every build that changes any of them keeps a new copy (the worker lets go of the older one only once the new
     one is whole). A name written by hand (shell-v2) never changed for a build, so a bump in sw.js did nothing. */
  const list = sw.match(/const files = \[([^\]]*)\]/);
  if (!list || sw === swFrom || !sw.includes(`const PREFIX = 'sundayreset-${id}-shell-';`) || !sw.includes("const SHELL = PREFIX + 'v2';")) throw new Error(id + ': sw.js no longer has the lines this build fills in (const files, PREFIX, SHELL)');
  const hash = createHash('sha256').update(sw);
  for (const f of list[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean)) {
    hash.update(f + '\n');
    if (f.startsWith('/')) { const file = join(out, f === '/' ? 'index.html' : f.slice(1)); if (existsSync(file)) hash.update(readFileSync(file)); }
  }
  sw = sw.replace("const SHELL = PREFIX + 'v2';", "const SHELL = PREFIX + '" + hash.digest('hex').slice(0, 12) + "';");
  writeFileSync(join(out, 'sw.js'), sw);
  console.log('v/' + id);
}
