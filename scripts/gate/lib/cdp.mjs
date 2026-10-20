// A small DevTools client for the drag gate: one page, real mouse and finger input, console errors kept.
import { writeFileSync } from 'node:fs';
import { localThree } from './session.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* a page of its own in a browser context of its own (its own storage), for running lanes side by side */
export async function newTab(port) {
  const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  let id = 0; const waiting = new Map();
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && waiting.has(msg.id)) { const { ok, no } = waiting.get(msg.id); waiting.delete(msg.id); msg.error ? no(new Error(JSON.stringify(msg.error))) : ok(msg.result); } };
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; waiting.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })); });
  const { browserContextId } = await send('Target.createBrowserContext', { disposeOnDetach: false });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  ws.close();
  return targetId;
}

export async function connect(port, opts = {}) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  let page = opts.target ? list.find((t) => t.id === opts.target) : list.find((t) => t.type === 'page' && (!opts.match || t.url.includes(opts.match)));
  if (!page) page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  let id = 0;
  const waiting = new Map();
  const events = [];
  const errors = [];
  const listeners = new Set();
  const three = localThree();
  /* (the unhappy gate: requests whose address matches a route are answered here, to stage a server that's down,
     slow, or wrong. route(glob, fn): fn(request) gives { status, body, type, wait } to answer with, 'fail' to cut
     it like a lost connection, 'hang' never to answer, or null to let it go to the network) */
  const routes = [];
  const globRe = (g) => new RegExp('^' + g.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  const answer = (p) => {
    const r = routes.find((x) => x.re.test(p.request.url));
    let a = null;
    if (r) { try { a = r.fn(p.request); } catch (e) { a = null; } }
    if (a === 'hang') return;
    if (a === 'fail') { send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' }).catch(() => {}); return; }
    if (!a) { send('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}); return; }
    const body = a.body == null ? '' : typeof a.body === 'string' ? a.body : JSON.stringify(a.body);
    const go = () => send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: a.status || 200, responseHeaders: [{ name: 'Content-Type', value: a.type || 'application/json' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(body).toString('base64') }).catch(() => {});
    if (a.wait) setTimeout(go, a.wait); else go();
  };
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) {
      const { ok, no } = waiting.get(msg.id); waiting.delete(msg.id);
      msg.error ? no(new Error(JSON.stringify(msg.error))) : ok(msg.result);
      return;
    }
    if (!msg.method) return;
    /* three.js from node_modules instead of the CDN (the same bytes, so its integrity check passes) */
    if (msg.method === 'Fetch.requestPaused') {
      const p = msg.params;
      /* (a route answers first, so the unhappy gate can take three.js away) */
      if (three && /three@0\.160\.0\/build\/three\.min\.js/.test(p.request.url) && !routes.some((x) => x.re.test(p.request.url))) send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: three.toString('base64') }).catch(() => {});
      else answer(p);
      return;
    }
    events.push(msg);
    if (events.length > 400) events.splice(0, 200);
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push({ t: Date.now(), kind: 'exception', text: (d.exception && (d.exception.description || d.exception.value)) || d.text, url: d.url, line: d.lineNumber });
    } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'assert')) {
      errors.push({ t: Date.now(), kind: 'console.' + msg.params.type, text: msg.params.args.map((a) => a.value != null ? String(a.value) : a.description || '').join(' ').slice(0, 600) });
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push({ t: Date.now(), kind: 'log', text: (msg.params.entry.text || '').slice(0, 400), url: msg.params.entry.url });
    }
    listeners.forEach((f) => { try { f(msg); } catch (e) { /* fine */ } });
  };
  const send = (method, params = {}) => new Promise((ok, no) => {
    const i = ++id;
    waiting.set(i, { ok, no });
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (waiting.has(i)) { waiting.delete(i); no(new Error('timeout ' + method)); } }, opts.timeout || 60000);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  if (three) await send('Fetch.enable', { patterns: [{ urlPattern: '*three@0.160.0*' }] });

  const fetchFor = () => (three ? [{ urlPattern: '*three@0.160.0*' }] : []).concat(routes.map((x) => ({ urlPattern: x.glob })));
  const c = {
    send, events, errors, listeners, ws, browser: 'chrome',
    close() { try { ws.close(); } catch (e) { /* fine */ } },
    /* (the unhappy gate) answer or cut requests to addresses like glob (above), until unroute; offline(true) is the
       page with no connection at all (navigator.onLine false, every request failing), offline(false) brings it back */
    async route(glob, fn) { routes.push({ glob, re: globRe(glob), fn }); await send('Fetch.enable', { patterns: fetchFor() }); },
    async unroute() { routes.length = 0; if (three) await send('Fetch.enable', { patterns: fetchFor() }); else await send('Fetch.disable').catch(() => {}); },
    async offline(on) { await send('Network.emulateNetworkConditions', { offline: !!on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); },
    async ev(js) {
      const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true, userGesture: true });
      if (r.exceptionDetails) return { __error: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text };
      return r.result.value;
    },
    async viewport(w, h, mobile, dpr) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr || 1, mobile: !!mobile, screenWidth: w, screenHeight: h });
      await send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
      await send('Emulation.setEmitTouchEventsForMouse', { enabled: false });
    },
    async nav(url, settle = 1500) {
      const n0 = events.length;
      await send('Page.navigate', { url });
      for (let t = 0; t < 200; t++) { if (events.slice(n0).some((e) => e.method === 'Page.loadEventFired')) break; await sleep(100); }
      await sleep(settle);
    },
    async shot(path, clip) {
      const r = await send('Page.captureScreenshot', Object.assign({ format: 'png', captureBeyondViewport: false }, clip ? { clip: Object.assign({ scale: 1 }, clip) } : {}));
      writeFileSync(path, Buffer.from(r.data, 'base64'));
      return path;
    },
    /* mouse */
    async mouse(type, x, y, extra = {}) {
      await send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'mouse' }, extra));
    },
    async mouseDown(x, y) { await c.mouse('mouseMoved', x, y); await c.mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 }); },
    async mouseMove(x, y, down = true) { await c.mouse('mouseMoved', x, y, down ? { button: 'left', buttons: 1 } : {}); },
    async mouseUp(x, y) { await c.mouse('mouseReleased', x, y, { button: 'left', buttons: 0, clickCount: 1 }); },
    async click(x, y) { await c.mouse('mouseMoved', x, y); await sleep(40); await c.mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 }); await sleep(50); await c.mouse('mouseReleased', x, y, { button: 'left', buttons: 0, clickCount: 1 }); },
    /* fingers: points is [{x, y, id}] */
    async touch(type, points) { await send('Input.dispatchTouchEvent', { type, touchPoints: points || [] }); },
    async tap(x, y) { await c.touch('touchStart', [{ x, y, id: 1 }]); await sleep(50); await c.touch('touchEnd', []); },
    async key(key, code, vk, mods = 0) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code || key, windowsVirtualKeyCode: vk || 0, modifiers: mods });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code || key, windowsVirtualKeyCode: vk || 0, modifiers: mods });
    },
    async wheel(x, y, dy, dx = 0) { await c.mouse('mouseWheel', x, y, { deltaX: dx, deltaY: dy }); },
    async closePage() { try { await send('Page.close'); } catch (e) { /* fine */ } }
  };
  return c;
}

/* Points along a path from a to b: eased (a person speeds up and slows down), with an optional
   overshoot and wobble, so the pendulum and the slot changes see what a hand does. */
export function pathPoints(a, b, n, o = {}) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    let k = i / n;
    if (o.ease !== false) k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    let x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
    if (o.arc) { const s = Math.sin(Math.PI * i / n); y -= o.arc * s; }
    if (o.wobble) { x += Math.sin(i * 1.7) * o.wobble; y += Math.cos(i * 1.3) * o.wobble; }
    pts.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }
  return pts;
}
