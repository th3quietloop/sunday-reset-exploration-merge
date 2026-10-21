// What the drag gate drives: the version in the works (V11-2) built into a folder of its own, served on a port, and a headless Chrome
// with remote debugging. A script given -url and -port uses what's already running; otherwise it starts
// its own and stops it at the end. Nothing here touches the repo's own folders.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* -name value and -flag (one hyphen or two), the way every gate script reads its options */
export function parseArgs(argv) {
  return Object.fromEntries(argv.reduce((acc, a, i, all) => {
    if (/^-{1,2}[a-z]/.test(a)) acc.push([a.replace(/^-{1,2}/, ''), all[i + 1] != null && !/^-{1,2}[a-z]/.test(all[i + 1]) ? all[i + 1] : true]);
    return acc;
  }, []));
}

/* where a run keeps its results and pictures: -out, or a fresh folder in the system's temporary folder */
export function runDir(args, name) {
  const dir = args.out && typeof args.out === 'string' && !/\.json$/.test(args.out) ? resolve(args.out) : join(tmpdir(), 'sunday-reset-gate', name + '-' + new Date().toISOString().replace(/[:.]/g, '-'));
  mkdirSync(dir, { recursive: true });
  return dir;
}

/* the version in the works built from this repo into dir (the same build Vercel gets), and the folder its page is
   in: V11-2 since Oct 20 (V11 itself is frozen as it went live, in v/corners11) */
export const BUILD_ID = 'corners11-2';
export function build(dir, id = BUILD_ID) {
  mkdirSync(dir, { recursive: true });
  execFileSync(process.execPath, [join(REPO, 'scripts', 'make-variants.mjs'), id], { cwd: REPO, env: Object.assign({}, process.env, { MV_OUT: dir }), stdio: 'pipe' });
  const root = join(dir, id);
  if (!existsSync(join(root, 'index.html'))) throw new Error('the build made no page in ' + root);
  return root;
}

/* a static server for a built folder, the way scripts/serve-board.mjs serves one (nothing cached) */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
export function serve(root, port) {
  return new Promise((ok, no) => {
    const server = createServer(async (req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(root, p));
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
      } catch (e) { res.writeHead(404).end('Not found'); }
    });
    server.on('error', no);
    server.listen(port, '127.0.0.1', () => ok({ url: 'http://localhost:' + server.address().port + '/', port: server.address().port, close: () => new Promise((r) => server.close(() => r())) }));
  });
}

/* a Chrome to drive: CHROME_PATH, then the one in Applications, then Playwright's own Chromium */
export async function chromePath() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(mac)) return mac;
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (existsSync(p)) return p;
  try { const { chromium } = await import('playwright-core'); const p = chromium.executablePath(); if (p && existsSync(p)) return p; } catch (e) { /* not installed */ }
  throw new Error('no Chrome found: set CHROME_PATH to a Chrome or Chromium');
}

/* a headless Chrome with remote debugging on port, a profile of its own, and no timers held back in pages
   that aren't in front (the lanes run side by side) */
export async function chrome(port, opts = {}) {
  /* (a port something already answers on would hand the gate someone else's browser) */
  try { await fetch('http://127.0.0.1:' + port + '/json/version', { signal: AbortSignal.timeout(800) }); throw new Error('port ' + port + ' is in use: pass -cdp with a free port'); } catch (e) { if (/in use/.test(e.message)) throw e; }
  const exe = await chromePath();
  const profile = mkdtempSync(join(tmpdir(), 'sunday-reset-gate-chrome-'));
  const flags = ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=1440,900', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--mute-audio', 'about:blank'];
  const proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', opts.log ? 'pipe' : 'ignore'] });
  let gone = false;
  proc.on('exit', () => { gone = true; });
  for (let k = 0; k < 100; k++) {
    if (gone) throw new Error('Chrome stopped as it started (' + exe + ')');
    try { const v = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json(); if (v.webSocketDebuggerUrl) return { port, exe, version: v.Browser, close: async () => { try { proc.kill('SIGTERM'); } catch (e) { /* gone */ } await sleep(300); try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* fine */ } } }; } catch (e) { /* not yet */ }
    await sleep(150);
  }
  try { proc.kill('SIGKILL'); } catch (e) { /* gone */ }
  throw new Error('Chrome never answered on port ' + port);
}

/* everything a gate script needs: -url and -port to use what's running, or a build, a server, and a
   Chrome of its own (-serve and -cdp pick their ports; -build uses a folder that's already built) */
export async function session(args, name = 'gate') {
  if (args.url && args.port && args.port !== true) return { url: String(args.url), port: +args.port, stop: async () => {}, own: false };
  const parts = [];
  const stop = async () => { for (const p of parts.reverse()) { try { await p(); } catch (e) { /* fine */ } } };
  try {
    let root = args.build && args.build !== true ? resolve(String(args.build)) : null;
    /* (a folder a build was made into: the version's own folder inside it, V11-2 first) */
    if (root) for (const id of [BUILD_ID, 'corners11']) if (existsSync(join(root, id, 'index.html'))) { root = join(root, id); break; }
    if (!root) {
      const dir = mkdtempSync(join(tmpdir(), 'sunday-reset-gate-build-'));
      parts.push(async () => rmSync(dir, { recursive: true, force: true }));
      root = build(dir);
    }
    const srv = args.url ? { url: String(args.url) } : await serve(root, +(args.serve || 0));
    if (srv.close) parts.push(srv.close);
    /* (the WebKit lane brings its own browser) */
    if (args.noChrome) return { url: srv.url, port: null, stop, own: true, root };
    const cdp = +(args.cdp || args.port || 9467);
    const ch = await chrome(cdp);
    parts.push(ch.close);
    return { url: srv.url, port: cdp, stop, own: true, root, chrome: ch.version };
  } catch (e) { await stop(); throw e; }
}

/* three.js, from this repo's own node_modules when it's there, for pages that ask the CDN for it (the
   gate runs the same with no network for it, and never waits on a slow CDN) */
export function localThree() {
  const p = join(REPO, 'node_modules', 'three', 'build', 'three.min.js');
  try { return existsSync(p) ? readFileSync(p) : null; } catch (e) { return null; }
}
