/* Sunday Reset's service worker. It shows reminders the server sends and opens Today when you tap
   one. It also keeps a copy of the app itself (its pages, code, fonts, and the 3D library), so the
   week opens with no connection. Online, it always asks the network first, so the app is the latest
   whenever it can be; the copy is only for when the network can't answer. The API is never kept.
   What every desk needs is kept at install; a kit layout's own things are kept the first time that
   layout is used, the same way. */
/* (V11-3: a build names the copy from a hash of what it keeps, scripts/make-variants.mjs, so a new build always
   keeps a new copy; the board's own page keeps v2) */
const PREFIX = 'sundayreset-corners11-2-shell-';
const SHELL = PREFIX + 'd49ea68d8e13';
/* the copy holds this once every file below was kept */
const WHOLE = '/__shell-whole';
const KEEP = /\.(?:js|css|html|webmanifest|png|webp|svg|woff2?)$|\/$/;
const OTHER = /^https:\/\/(?:cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
const files = ['/', '/src/style.css', '/src/kit.css', '/src/variant.css', '/src/polish.css', '/src/focus.js', '/src/kit.js', '/src/variant.js', '/src/app.js', '/src/model.js', '/src/data.js', '/src/scene.js', '/src/store.js', '/src/cloud.js', '/src/diagnostics.js', '/src/onboard.js', '/src/scenarios.js', '/src/icon-paths.js', '/src/icons.js', '/src/sound.js', '/src/props-data.js', '/src/kit/themes.js', '/src/kit/desk-paint.js', '/src/kit/light.js', '/src/css/00-base.css', '/src/css/ai.css', '/src/css/blocklist.css', '/src/css/breakdown.css', '/src/css/consistency.css', '/src/css/contrast.css', '/src/css/countdown.css', '/src/css/deadends.css', '/src/css/duo.css', '/src/css/errors.css', '/src/css/firstvisit.css', '/src/css/focus.css', '/src/css/frame.css', '/src/css/goals.css', '/src/css/goalsheet.css', '/src/css/kimflows.css', '/src/css/lookahead.css', '/src/css/mealprep.css', '/src/css/meals.css', '/src/css/mealspeople.css', '/src/css/moments.css', '/src/css/people.css', '/src/css/phoneset.css', '/src/css/phonetoday.css', '/src/css/planner.css', '/src/css/rituals.css', '/src/css/setupwords.css', '/src/css/sheet.css', '/src/css/shell.css', '/src/css/targets.css', '/src/css/tests.css', '/src/css/today.css', '/src/css/todos.css', '/src/css/todosheet.css', '/src/css/touch.css', '/src/css/yourtime.css', '/src/css/zz-screens.css', 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];
/* (V11-2, the unhappy gate: each file is kept on its own, so one that can't be fetched leaves the rest kept; addAll
   kept nothing when any one failed, and the first visit's own requests come before the worker is there to keep
   them, so an app opened offline after one visit came up without the desk)
   V11-3: each is asked of the network itself (cache: 'reload'), never the browser's own HTTP cache, which could hand
   back a copy older than this build. fill(true) asks only for what the copy doesn't have yet. The copy is whole once
   every file arrived, and only then does it say so. */
const fill = (onlyMissing) => caches.open(SHELL).then((c) => Promise.all(files.map((f) =>
  (onlyMissing ? c.match(f, { ignoreVary: true }) : Promise.resolve(null))
    .then((hit) => hit || c.add(new Request(f, { cache: 'reload' })))
    .then(() => true, () => false)))
  .then((got) => (got.every(Boolean) ? c.put(WHOLE, new Response('whole')).then(() => true) : false)));
const whole = () => caches.open(SHELL).then((c) => c.match(WHOLE)).then((hit) => !!hit, () => false);
self.addEventListener('install', (e) => {
  e.waitUntil(fill(false).catch(() => false).then(() => self.skipWaiting()));
});
/* an older copy goes only once this one is whole: an install that couldn't fetch every file tries the missing ones
   again here, and if some still don't come, the older whole copy stays for the offline open */
self.addEventListener('activate', (e) => e.waitUntil(whole()
  .then((ok) => ok || fill(true).catch(() => false))
  .then((ok) => (ok ? caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== SHELL).map((k) => caches.delete(k)))) : null))
  .then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === self.location.origin;
  if (mine && url.pathname.startsWith('/api/')) return;
  if (!(mine && KEEP.test(url.pathname)) && !OTHER.test(req.url)) return;
  /* the page itself is kept under one name, whatever came after the question mark, so the copy used
     offline is always the last one the network gave, never an older one kept under another address */
  const page = mine && (url.pathname === '/' || url.pathname === '/index.html');
  const key = page ? '/' : req;
  e.respondWith(fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(key, copy)).catch(() => {}); }
    return res;
  /* (a library from another site is kept by its address: the network's Vary on how it was compressed doesn't matter) */
  /* (this build's copy first; an older whole copy, kept while this one isn't, after it) */
  }).catch(() => caches.open(SHELL).then((c) => c.match(key, { ignoreVary: true })).then((hit) => hit || caches.match(key, { ignoreVary: true })).then((hit) => hit || Response.error())));
});
self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { title: 'Sunday Reset', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(p.title || 'Sunday Reset', {
    body: p.body || '', tag: p.tag || 'sunday-reset', renotify: false,
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: p.url || '/?today' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/?today';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => new URL(c.url).origin === self.location.origin);
    if (open) { open.navigate(url).catch(() => {}); return open.focus(); }
    return self.clients.openWindow(url);
  }));
});
