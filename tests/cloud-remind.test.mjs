// V11-3 (code review 29): turning reminders on says what really happened. A server with no push key is not-set-up,
// never Offline (a missing key used to throw a TypeError, which read as Offline); only the requests themselves, to
// the push service and the household, can be offline. cloud.js runs with stand ins for the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const SRC = readFileSync(new URL('../board/src/cloud.js', import.meta.url), 'utf8');
const VAPID = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
function cloud({ vapid = VAPID, online = true, api, subscribe } = {}) {
  const store = new Map();
  const sub = { toJSON: () => ({ endpoint: 'https://push.example/1' }), unsubscribe: async () => true };
  const ctx = {
    console, setTimeout, clearTimeout, AbortController, atob, Intl, Uint8Array, JSON, Promise, Error, TypeError,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    navigator: { onLine: online, userAgent: 'test', serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: async () => (subscribe ? null : sub), subscribe: subscribe || (async () => sub) } }) } },
    Notification: { requestPermission: async () => 'granted' },
    PushManager: function () {},
    location: { protocol: 'https:' },
    fetch: async () => { throw new TypeError('fetch failed'); }
  };
  ctx.window = ctx;
  runInNewContext(SRC, ctx);
  const C = ctx.Cloud;
  C.me = { token: 't', hid: 'h', did: 'd' }; C.cfg = { push: true, vapid };
  if (api) C.api = api;
  return C;
}

test('no push key on the server is not-set-up, never offline', async () => {
  for (const vapid of [undefined, null, '', 42, 'short']) {
    let sent = 0;
    const C = cloud({ api: async () => { sent++; return { status: 200, json: {} }; } });
    C.cfg.vapid = vapid;
    const r = await C.remind(true, {});
    assert.equal(sent, 0, 'nothing is sent');
    assert.deepEqual({ ...r }, { error: 'not-set-up' }, String(vapid));
  }
});

test('the household not answering is offline; an answer is used as it came', async () => {
  assert.equal((await cloud({ api: async () => { throw new TypeError('fetch failed'); } }).remind(true, {})).error, 'offline');
  assert.equal((await cloud({ api: async () => ({ status: 200, json: {} }) }).remind(true, {})).on, true);
  assert.equal((await cloud({ api: async () => ({ status: 400, json: { error: 'bad-sub' } }) }).remind(true, {})).error, 'bad-sub');
});

test('a push service that refuses is failed when the device is online, offline when it isn’t', async () => {
  for (const [online, want] of [[true, 'failed'], [false, 'offline']]) {
    const C = cloud({ online, api: async () => assert.fail('nothing is sent'), subscribe: async () => { throw new Error('push service error'); } });
    assert.equal((await C.remind(true, {})).error, want, online ? 'online' : 'offline');
  }
});
