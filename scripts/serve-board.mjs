// Serves board/ as a static site, the way Vercel does: node scripts/serve-board.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* the folder to serve: relative to the repo, or an absolute path (a private build) */
const root = resolve(join(fileURLToPath(new URL('.', import.meta.url)), '..'), process.argv[3] || 'board');
const port = Number(process.argv[2] || 4354);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch (e) { res.writeHead(404).end('Not found'); }
}).listen(port, () => console.log('board on http://localhost:' + port));
