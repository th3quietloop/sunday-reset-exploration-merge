// The app opens with no connection after one visit (docs/UNHAPPY-GATE.md, the offline open): the service worker keeps
// every file the page loads when it installs, since the first visit's own requests come before the worker is there to
// keep them. Until Oct 20 it kept a list from Round three: V11's 33 style sheets and the 3D library weren't on it, so
// an app opened offline came up without the desk. This builds V11-2 (scripts/make-variants.mjs, into a folder of its
// own) and holds the worker's list to the page: every local style sheet and script, and the libraries from a CDN.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));

test('the service worker keeps every file V11-2’s page loads, one at a time', () => {
  const out = mkdtempSync(join(tmpdir(), 'sr-sw-'));
  try {
    execFileSync(process.execPath, [join(REPO, 'scripts', 'make-variants.mjs'), 'corners11-2'], { cwd: REPO, env: Object.assign({}, process.env, { MV_OUT: out }), stdio: 'pipe' });
    const root = join(out, 'corners11-2');
    const html = readFileSync(join(root, 'index.html'), 'utf8'), sw = readFileSync(join(root, 'sw.js'), 'utf8');
    const m = sw.match(/const files = \[([^\]]*)\]/);
    assert.ok(m, 'sw.js: the install list (const files = [...]) is gone');
    const kept = new Set(m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean));
    const wants = [...html.matchAll(/<(?:link rel="stylesheet" href|script src)="([^"]+)"/g)].map((x) => x[1])
      .filter((u) => !/fonts\.googleapis/.test(u))
      .map((u) => (/^https?:/.test(u) ? u : '/' + u.replace(/^\.?\//, '')));
    assert.ok(wants.length > 40, 'the page loads its files (' + wants.length + ')');
    const missing = wants.filter((u) => !kept.has(u));
    assert.deepEqual(missing, [], 'files the page loads that the worker doesn’t keep at install');
    /* and every local one it keeps is there to keep */
    const gone = [...kept].filter((u) => u.startsWith('/') && !existsSync(join(root, u === '/' ? 'index.html' : u)));
    assert.deepEqual(gone, [], 'files on the list that the build doesn’t have');
    /* each is kept on its own, so one that can't be fetched leaves the rest */
    assert.match(sw, /files\.map\(\(f\) => c\.add\(f\)\.catch\(/);
    assert.doesNotMatch(sw, /c\.addAll\(/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
