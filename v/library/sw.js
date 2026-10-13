/* Sunday Reset's service worker. It shows reminders the server sends and opens Today when you tap
   one. It also keeps a copy of the app itself (its pages, code, fonts, and the 3D library), so the
   week opens with no connection. Online, it always asks the network first, so the app is the latest
   whenever it can be; the copy is only for when the network can't answer. The API is never kept.
   What every desk needs is kept at install; a kit layout's own things are kept the first time that
   layout is used, the same way. */
const SHELL = 'sundayreset-library-shell-v1';
const KEEP = /\.(?:js|css|html|webmanifest|png|webp|svg|woff2?)$|\/$/;
const OTHER = /^https:\/\/(?:cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/src/style.css', '/src/kit.css', '/src/variant.css', '/src/focus.js', '/src/kit.js', '/src/variant.js', '/src/app.js', '/src/model.js', '/src/data.js', '/src/scene.js', '/src/store.js', '/src/cloud.js', '/src/diagnostics.js', '/src/onboard.js', '/src/scenarios.js', '/src/icons.js', '/src/sound.js', '/src/props-data.js', '/src/kit/themes.js', '/src/kit/desk-paint.js', '/src/kit/light.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png']).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('sundayreset-library-shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
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
  }).catch(() => caches.match(key).then((hit) => hit || Response.error())));
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
