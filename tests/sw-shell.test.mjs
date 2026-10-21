// V11-3 (code review 9, 19, 35 and design review 54): the build of V11-3 (scripts/make-variants.mjs, into a folder
// of its own). The worker's copy is named from a hash of what it keeps, so every build that changes a file keeps a
// new copy; an install that couldn't fetch every file never deletes the older whole copy; the page code goes out
// minified and still parses as the same classic scripts; and the page never asks for a sync server it doesn't have.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script, runInNewContext } from 'node:vm';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const build = (env = {}) => {
  const out = mkdtempSync(join(tmpdir(), 'sr-shell-'));
  execFileSync(process.execPath, [join(REPO, 'scripts', 'make-variants.mjs'), 'corners11-3'], { cwd: REPO, env: Object.assign({}, process.env, { MV_OUT: out }, env), stdio: 'pipe' });
  return { out, root: join(out, 'corners11-3') };
};
const shellOf = (sw) => (sw.match(/const SHELL = PREFIX \+ '([^']+)';/) || [])[1];

test('the copy is named from a hash of what it keeps, the same for the same build and new for a changed one', () => {
  const a = build(), b = build(), plain = build({ MV_MIN: '0' });
  try {
    const sa = readFileSync(join(a.root, 'sw.js'), 'utf8');
    assert.match(sa, /const PREFIX = 'sundayreset-corners11-3-shell-';/);
    assert.match(shellOf(sa) || '', /^[0-9a-f]{12}$/, 'a hash, never a name written by hand');
    assert.equal(shellOf(readFileSync(join(b.root, 'sw.js'), 'utf8')), shellOf(sa), 'the same files: the same copy');
    assert.notEqual(shellOf(readFileSync(join(plain.root, 'sw.js'), 'utf8')), shellOf(sa), 'different files: a new copy');
  } finally { for (const x of [a, b, plain]) rmSync(x.out, { recursive: true, force: true }); }
});

test('the page code goes out minified, and each script still parses as the same classic script', () => {
  const { out, root } = build();
  try {
    const src = readFileSync(join(REPO, 'board', 'src', 'app.js'), 'utf8');
    const built = readFileSync(join(root, 'src', 'app.js'), 'utf8');
    assert.ok(built.length < src.length * 0.7, 'app.js is minified: ' + built.length + ' of ' + src.length);
    for (const f of ['app.js', 'model.js', 'data.js', 'scene.js', 'variant.js', 'kit.js', 'icons.js', 'store.js', 'cloud.js']) new Script(readFileSync(join(root, 'src', f), 'utf8'), { filename: f });
    /* the model and the data load the same way they always did (window.Model, module.exports) */
    const ctx = { window: {}, console };
    ctx.module = { exports: {} };
    runInNewContext(readFileSync(join(root, 'src', 'data.js'), 'utf8'), ctx);
    assert.equal(typeof (ctx.window.Data || ctx.module.exports).defaultState, 'function', 'Data still loads');
    /* the server function is never minified, and neither is the worker */
    assert.equal(readFileSync(join(root, 'api', 'smart.js'), 'utf8'), readFileSync(join(REPO, 'variants', 'corners11', 'api', 'smart.js'), 'utf8'));
    assert.match(readFileSync(join(root, 'sw.js'), 'utf8'), /\n\/\* /);
    assert.ok(statSync(join(REPO, 'board', 'src', 'app.js')).size === Buffer.byteLength(src), 'the source is as written');
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('the page says it has no sync server, so it never asks for /api/config (a 404 on every load)', () => {
  const { out, root } = build();
  try {
    assert.match(readFileSync(join(root, 'index.html'), 'utf8'), /<meta name="sunday-reset-sync" content="off">/);
    const cloud = readFileSync(join(REPO, 'board', 'src', 'cloud.js'), 'utf8');
    let asked = 0;
    const ctx = {
      console, setTimeout, clearTimeout, JSON, Promise,
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      location: { protocol: 'https:' }, navigator: {},
      document: { querySelector: (q) => (/sunday-reset-sync/.test(q) ? {} : null), addEventListener: () => {} },
      fetch: async () => { asked++; return new Response('', { status: 404 }); }
    };
    ctx.window = ctx; ctx.self = ctx; ctx.top = ctx;
    runInNewContext(cloud, ctx);
    return ctx.Cloud.probe().then((cfg) => { assert.equal(cfg, null); assert.equal(asked, 0, 'nothing asked'); });
  } finally { rmSync(out, { recursive: true, force: true }); }
});

/* the worker, run with stand ins for its caches and the network */
function worker(sw, { fail = () => false, start = {} } = {}) {
  const stores = new Map(Object.entries(start).map(([k, v]) => [k, new Map(v.map((u) => [u, 'old ' + u]))]));
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    const key = (r) => (typeof r === 'string' ? r : r.url);
    return {
      add: async (r) => { if (fail(key(r))) throw new TypeError('failed'); m.set(key(r), 'new ' + key(r)); r.cache && (m.reloaded = (m.reloaded || 0) + 1); },
      put: async (r, v) => { m.set(key(r), v); },
      match: async (r) => m.get(key(r)) || undefined,
      keys: async () => [...m.keys()]
    };
  };
  const on = {};
  const ctx = {
    console, URL, Promise, Response: class { constructor(b) { this.body = b; } },
    Request: class { constructor(url, o) { this.url = url; this.cache = o && o.cache; } },
    caches: { open, keys: async () => [...stores.keys()], delete: async (k) => stores.delete(k), match: async () => undefined },
    self: { addEventListener: (t, fn) => { on[t] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} }, location: { origin: 'https://x' } }
  };
  runInNewContext(sw, ctx);
  const fire = async (t) => { let p; on[t]({ waitUntil: (x) => { p = x; } }); await p; };
  return { stores, fire };
}

test('an install that couldn’t fetch every file never deletes the older whole copy', async () => {
  const { out, root } = build();
  try {
    const sw = readFileSync(join(root, 'sw.js'), 'utf8'), shell = 'sundayreset-corners11-3-shell-' + shellOf(sw), older = 'sundayreset-corners11-3-shell-0123456789ab';
    /* the 3D library can't be fetched: the new copy isn't whole, so the older one stays */
    const w = worker(sw, { fail: (u) => /three/.test(u), start: { [older]: ['/', '/src/app.js', '/__shell-whole'] } });
    await w.fire('install');
    await w.fire('activate');
    assert.ok(w.stores.has(older), 'the older whole copy stays');
    assert.ok(!w.stores.get(shell).has('/__shell-whole'), 'the new copy doesn’t say it’s whole');
    assert.ok(w.stores.get(shell).has('/src/app.js'), 'what did arrive is kept');
    assert.ok(w.stores.get(shell).reloaded > 20, 'each file asked of the network itself');
    /* everything arrives: the new copy is whole, and only then does the older one go */
    const ok = worker(sw, { start: { [older]: ['/'], 'something-else': ['/x'] } });
    await ok.fire('install');
    await ok.fire('activate');
    assert.ok(!ok.stores.has(older), 'the older copy goes once the new one is whole');
    assert.ok(ok.stores.has('something-else'), 'a cache that isn’t this app’s is left alone');
    assert.ok(ok.stores.get(shell).has('/__shell-whole'));
  } finally { rmSync(out, { recursive: true, force: true }); }
});
