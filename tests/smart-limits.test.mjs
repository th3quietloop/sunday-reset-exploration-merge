// V11-3 (code review 3, 11, 12, 13, 14): the smart breakdowns server (variants/corners11/api/smart.js) counts asks
// by the address the platform saw, never a shared bucket; holds every address together to a ceiling; keeps its
// memory to a size; reads no more of a body than it takes; counts from the page's own date; keeps 15 good steps;
// and uses a shared counter only when one is set up. A stand in answers for Claude, so nothing goes anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler, makeLimiter, clientIp, todayFor, cleanSteps, readCapped, sharedCounter } from '../variants/corners11/api/smart.js';

const HOST = 'sunday-reset-corners-v11-3.vercel.app';
const env = { ANTHROPIC_API_KEY: 'sk-test-not-a-real-key' };
const req = (headers = {}, body) => new Request('https://' + HOST + '/api/smart', {
  method: 'POST', headers: Object.assign({ host: HOST, origin: 'https://' + HOST, 'content-type': 'application/json' }, headers),
  body: body === undefined ? JSON.stringify({ kind: 'steps', name: 'Clean my room', size: 'medium' }) : body
});
function claude() {
  const calls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    return new Response(JSON.stringify({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: body.tool_choice.name,
      input: body.tool_choice.name === 'give_steps' ? { steps: [{ name: 'Start', minutes: 5 }] } : { parts: [{ name: 'Torts', hours: 2 }], note: 'A note.' } }] }), { status: 200 });
  };
  return { fetch, calls };
}

test('the address is the platform’s, and a client can’t choose it', () => {
  const h = (o) => new Request('https://x/', { headers: o });
  assert.equal(clientIp(h({ 'x-vercel-forwarded-for': '203.0.113.9', 'x-real-ip': '198.51.100.1', 'x-forwarded-for': '1.2.3.4' })), '203.0.113.9');
  assert.equal(clientIp(h({ 'x-real-ip': '198.51.100.1', 'x-forwarded-for': '1.2.3.4, 198.51.100.1' })), '198.51.100.1');
  /* only the last entry of x-forwarded-for, the one the nearest proxy added, and only with neither of the others */
  assert.equal(clientIp(h({ 'x-forwarded-for': '6.6.6.6, 192.0.2.44' })), '192.0.2.44');
  assert.equal(clientIp(h({ 'x-real-ip': 'not an address' })), null);
  assert.equal(clientIp(h({})), null, 'no address is null, never a shared name');
});

test('no address shares no bucket: it counts toward every address together only', async () => {
  const c = claude(), handle = makeHandler({ env, fetch: c.fetch, now: () => Date.UTC(2026, 9, 20, 15) });
  for (let i = 0; i < 25; i++) assert.equal((await handle(req())).status, 200, 'ask ' + (i + 1) + ' with no address');
});

test('every address together has a ceiling in each instance, a minute’s and a day’s', async () => {
  let clock = Date.UTC(2026, 9, 20, 15);
  const lim = makeLimiter({ now: () => clock, allPerMinute: 5, allPerDay: 8 });
  for (let i = 0; i < 5; i++) assert.ok(lim.take('192.0.2.' + i).ok);
  let r = lim.take('192.0.2.99');
  assert.equal(r.ok, false);
  assert.equal(r.limit, 'minute');
  clock += 61 * 1000;
  for (let i = 0; i < 3; i++) assert.ok(lim.take('198.51.100.' + i).ok);
  r = lim.take('198.51.100.50');
  assert.equal(r.limit, 'day');
  assert.equal(r.most, 8);
  assert.ok(!/\b(just|simply|really)\b/i.test(r.message) && !/[\u{2013}\u{2014}]|--/u.test(r.message));
  clock += 24 * 60 * 60 * 1000;
  assert.ok(lim.take('198.51.100.50').ok, 'the next day it answers again');
  /* the handler reads its ceiling from SMART_DAY_CAP */
  const handle = makeHandler({ env: Object.assign({ SMART_DAY_CAP: '2' }, env), fetch: claude().fetch, now: () => clock, shared: null });
  assert.equal((await handle(req({ 'x-real-ip': '203.0.113.1' }))).status, 200);
  assert.equal((await handle(req({ 'x-real-ip': '203.0.113.2' }))).status, 200);
  const full = await handle(req({ 'x-real-ip': '203.0.113.3' }));
  assert.equal(full.status, 429);
  const body = await full.json();
  assert.equal(body.scope, 'site', 'the page can say it’s the site that’s full, not this person');
  assert.equal(body.limit, 'day');
  /* one address over its own count says no scope */
  const own = makeHandler({ env, fetch: claude().fetch, now: () => clock, shared: null, limiter: makeLimiter({ now: () => clock, perDay: 1 }) });
  await own(req({ 'x-real-ip': '203.0.113.9' }));
  assert.equal((await (await own(req({ 'x-real-ip': '203.0.113.9' }))).json()).scope, undefined);
});

test('the memory keeps at most so many addresses, letting go of the one seen longest ago', () => {
  let clock = Date.UTC(2026, 9, 20, 15);
  const lim = makeLimiter({ now: () => clock, most: 50, perDay: 2, allPerMinute: 1e6, allPerDay: 1e6 });
  assert.ok(lim.take('10.0.0.1').ok);
  assert.ok(lim.take('10.0.0.1').ok);
  assert.equal(lim.take('10.0.0.1').limit, 'day', 'its day is used up');
  for (let i = 0; i < 49; i++) assert.ok(lim.take('10.1.0.' + i).ok);
  assert.ok(lim.size() <= 50);
  /* 10.0.0.1 was seen just now (its refused ask), so it's kept; the next new ones push out the oldest */
  for (let i = 0; i < 200; i++) lim.take('10.2.0.' + i);
  assert.ok(lim.size() <= 50, 'never past the most: ' + lim.size());
  /* a day's counts that ran out are let go */
  clock += 25 * 60 * 60 * 1000;
  lim.take('10.3.0.1');
  assert.ok(lim.size() <= 2, 'the old days went: ' + lim.size());
});

test('a body is read no further than 2 KB, even sent in chunks with no length', async () => {
  const big = new ReadableStream({ start(ctl) { for (let i = 0; i < 20; i++) ctl.enqueue(new TextEncoder().encode('x'.repeat(500))); ctl.close(); } });
  const r = new Request('https://x/', { method: 'POST', body: big, duplex: 'half' });
  assert.equal(await readCapped(r, 2048), null);
  assert.equal(await readCapped(new Request('https://x/', { method: 'POST', body: '{"a":1}' }), 2048), '{"a":1}');
  const handle = makeHandler({ env, fetch: claude().fetch });
  const chunked = new Request('https://' + HOST + '/api/smart', { method: 'POST', duplex: 'half', headers: { host: HOST, origin: 'https://' + HOST, 'content-type': 'application/json' },
    body: new ReadableStream({ start(ctl) { ctl.enqueue(new TextEncoder().encode('{"kind":"steps","name":"' + 'a'.repeat(5000) + '"}')); ctl.close(); } }) });
  assert.equal((await handle(chunked)).status, 413);
});

test('a goal counts from the page’s own date when it’s within a day of the server’s', async () => {
  const at = Date.UTC(2026, 9, 21, 2);
  assert.equal(todayFor('2026-10-20', at), '2026-10-20', 'evening in the Americas: the page is a day behind');
  assert.equal(todayFor('2026-10-21', at), '2026-10-21');
  assert.equal(todayFor('2026-10-22', at), '2026-10-22');
  assert.equal(todayFor('2026-10-25', at), '2026-10-21', 'too far off: the server’s');
  assert.equal(todayFor('2026-02-30', at), '2026-10-21', 'not a day');
  assert.equal(todayFor(undefined, at), '2026-10-21');
  const c = claude();
  await makeHandler({ env, fetch: c.fetch, now: () => at })(req({}, JSON.stringify({ kind: 'parts', name: 'Pass the bar exam', date: '2027-02-24', today: '2026-10-20' })));
  assert.match(c.calls[0].messages[0].content, /Today is 2026-10-20\./);
});

test('15 good steps whose first splits in two come back as 15, not a 502', () => {
  const list = [{ name: 'Start the big thing', minutes: 30 }].concat(Array.from({ length: 14 }, (_, i) => ({ name: 'Step ' + (i + 2), minutes: 5 })));
  const out = cleanSteps(list);
  assert.equal(out.length, 15);
  assert.equal(out[0].dur, 10);
  assert.equal(out[1].dur, 20);
  assert.equal(cleanSteps(Array.from({ length: 16 }, () => ({ name: 'A', minutes: 5 }))), null, 'more than 15 from Claude is still too many');
});

test('a shared counter is used only when one is set up, and its counts hold across instances', async () => {
  assert.equal(sharedCounter({}, async () => assert.fail('never asked')), null, 'none set up: nothing is asked');
  assert.equal(sharedCounter({ KV_REST_API_URL: 'http://plain.example', KV_REST_API_TOKEN: 't' }, async () => {}), null, 'never over plain http');
  const store = new Map(), seen = [];
  const redis = async (url, init) => {
    seen.push({ url, auth: init.headers.authorization });
    const out = JSON.parse(init.body).map(([cmd, k]) => (cmd === 'INCR' ? (store.set(k, (store.get(k) || 0) + 1), { result: store.get(k) }) : { result: 1 }));
    return new Response(JSON.stringify(out), { status: 200 });
  };
  const counterEnv = Object.assign({ KV_REST_API_URL: 'https://redis.example/', KV_REST_API_TOKEN: 'tok' }, env);
  const at = () => Date.UTC(2026, 9, 20, 15);
  /* two instances, each with its own memory, one counter between them */
  const one = makeHandler({ env: counterEnv, fetch: claude().fetch, now: at, shared: sharedCounter(counterEnv, redis, { perDay: 3 }) });
  const two = makeHandler({ env: counterEnv, fetch: claude().fetch, now: at, shared: sharedCounter(counterEnv, redis, { perDay: 3 }) });
  const ip = { 'x-real-ip': '203.0.113.5' };
  assert.equal((await one(req(ip))).status, 200);
  assert.equal((await two(req(ip))).status, 200);
  assert.equal((await one(req(ip))).status, 200);
  const r = await two(req(ip));
  assert.equal(r.status, 429, 'the fourth across both instances is over the day');
  assert.equal((await r.json()).limit, 'day');
  assert.equal(seen[0].url, 'https://redis.example/pipeline');
  assert.equal(seen[0].auth, 'Bearer tok');
  /* the counter can't be reached: the instance's own counts still hold, and the ask goes on */
  const down = makeHandler({ env: counterEnv, fetch: claude().fetch, now: at, shared: sharedCounter(counterEnv, async () => { throw new TypeError('fetch failed'); }) });
  assert.equal((await down(req({ 'x-real-ip': '203.0.113.6' }))).status, 200);
});
