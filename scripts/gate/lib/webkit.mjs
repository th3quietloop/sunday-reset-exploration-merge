// The WebKit lane: the same client as lib/cdp.mjs (ev, viewport, nav, shot, mouse, key, errors), driven
// through Playwright's WebKit, the engine Safari is built on. Playwright can move a mouse in WebKit but
// can't send it a finger, so touch drags throw here and the gate says they weren't run.
import { localThree } from './session.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connectWebKit(opts = {}) {
  let pw;
  try { pw = await import('playwright-core'); } catch (e) { throw new Error('playwright-core is not installed (npm install)'); }
  const browser = await pw.webkit.launch({ headless: true });
  const size = opts.size || { w: 1440, h: 900, dpr: 2 };
  const context = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: size.dpr || 1, hasTouch: false, isMobile: false });
  const page = await context.newPage();
  const errors = [];
  const three = localThree();
  if (three) await page.route(/three@0\.160\.0\/build\/three\.min\.js/, (route) => route.fulfill({ status: 200, body: three, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' } }));
  page.on('pageerror', (e) => errors.push({ t: Date.now(), kind: 'exception', text: String(e && (e.stack || e.message) || e).slice(0, 600) }));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'assert') errors.push({ t: Date.now(), kind: 'console.' + m.type(), text: m.text().slice(0, 600), url: (m.location() || {}).url }); });
  let down = false;
  const c = {
    errors, events: [], browser: 'webkit', page,
    async send() { return {}; },
    close() { browser.close().catch(() => {}); },
    async closePage() { await browser.close().catch(() => {}); },
    async ev(js) {
      try { return await page.evaluate(js); } catch (e) { return { __error: String(e && e.message || e).slice(0, 600) }; }
    },
    async viewport(w, h) { await page.setViewportSize({ width: w, height: h }); },
    async nav(url, settle = 1500) { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await sleep(settle); },
    async shot(path) { await page.screenshot({ path }); return path; },
    async mouse(type, x, y) {
      if (type === 'mouseMoved') await page.mouse.move(x, y);
      else if (type === 'mousePressed') { await page.mouse.move(x, y); await page.mouse.down(); down = true; }
      else if (type === 'mouseReleased') { await page.mouse.move(x, y); await page.mouse.up(); down = false; }
      else if (type === 'mouseWheel') await page.mouse.wheel(0, 0);
    },
    async mouseDown(x, y) { await page.mouse.move(x, y); await page.mouse.down(); down = true; },
    async mouseMove(x, y) { await page.mouse.move(x, y); },
    async mouseUp(x, y) { await page.mouse.move(x, y); if (down) await page.mouse.up(); down = false; },
    async click(x, y) { await page.mouse.click(x, y); },
    async touch() { throw new Error('touch drags cannot be driven in WebKit (Playwright sends WebKit no fingers)'); },
    async tap(x, y) { await page.mouse.click(x, y); },
    async key(key) { await page.keyboard.press(key); },
    async wheel(x, y, dy, dx = 0) { await page.mouse.move(x, y); await page.mouse.wheel(dx, dy); },
    version: browser.version()
  };
  return c;
}
