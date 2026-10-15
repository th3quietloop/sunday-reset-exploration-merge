// V11 smart breakdowns (docs/SMART-BREAKDOWNS.md): the server function (variants/corners11/api/smart.js)
// with a stand in for the Messages API, so nothing goes to the network and no real key is used; and the
// page's client (window.SR_ai in variant.js), cut out by its markers and run with stand ins for the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import smart, { makeHandler, makeLimiter, cleanName, cleanSteps, cleanParts } from '../variants/corners11/api/smart.js';
import { variant, plain } from './v11-rig.mjs';

const HOST = 'sunday-reset-corners-v11.vercel.app';
const KEY = 'sk-test-not-a-real-key';
const env = { ANTHROPIC_API_KEY: KEY };
const EM = String.fromCharCode(0x2014), EN = String.fromCharCode(0x2013);
const post = (body, headers = {}) => new Request('https://' + HOST + '/api/smart', {
  method: 'POST',
  headers: Object.assign({ host: HOST, origin: 'https://' + HOST, 'content-type': 'application/json', 'x-real-ip': '203.0.113.7' }, headers),
  body: typeof body === 'string' ? body : JSON.stringify(body)
});
const get = () => new Request('https://' + HOST + '/api/smart', { headers: { host: HOST } });
const steps = (name, size) => ({ kind: 'steps', name, size: size || 'medium' });

/* the Messages API, standing in: it answers with a call of the tool it was told to use, and keeps every request */
function claude(input, extra) {
  const calls = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, init, body });
    const msg = Object.assign({ id: 'msg_test', type: 'message', role: 'assistant', model: body.model, stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'toolu_test', name: body.tool_choice.name, input }], usage: { input_tokens: 700, output_tokens: 250 } }, extra || {});
    return new Response(JSON.stringify(msg), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, calls };
}
const fine = () => claude({ steps: [{ name: 'Clear the floor', minutes: 10 }, { name: 'Sort what you find', minutes: 20 }] });

test('GET says ready only when there is a key, and nothing is kept', async () => {
  let r = await makeHandler({ env })(get());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ready: true });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  // (Oct 14) a site without the key answers the readiness check plainly, 200 and not ready: the page asks on every
  // load, and a 503 there was a red line in the browser's console each time. Errors are for the asks (POST)
  r = await makeHandler({ env: {} })(get());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ready: false });
  assert.equal(r.headers.get('cache-control'), 'no-store');
  r = await makeHandler({ env: {} })(new Request('https://' + HOST + '/api/smart', { method: 'HEAD', headers: { host: HOST } }));
  assert.equal(r.status, 200);
  // Vercel calls the default export's fetch
  assert.equal(typeof smart.fetch, 'function');
  r = await smart.fetch(get());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ready: !!process.env.ANTHROPIC_API_KEY });
});

test('a POST with no key is not_ready, and nothing goes to Claude', async () => {
  const c = fine();
  const r = await makeHandler({ env: {}, fetch: c.fetch })(post(steps('Clean my room')));
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, 'not_ready');
  assert.equal(c.calls.length, 0);
});

test('what is asked is checked first: a bad ask is bad_request and never reaches Claude', async () => {
  const c = fine(), handle = makeHandler({ env, fetch: c.fetch });
  const bad = [
    {}, [], 'null', { kind: 'steps' }, { kind: 'nope', name: 'Clean my room' }, { kind: 'steps', name: 42 }, { kind: 'steps', name: '    ' },
    { kind: 'steps', name: 'x'.repeat(141) }, { kind: 'steps', name: 'Clean' + String.fromCharCode(7) + 'room' }, { kind: 'steps', name: 'Clean\nmy room' },
    { kind: 'steps', name: 'Clean' + String.fromCharCode(0x2028) + 'room' }, { kind: 'steps', name: 'Clean my room', size: 'huge' },
    { kind: 'parts', name: 'Pass the bar exam', date: '2027-02-30' }, { kind: 'parts', name: 'Pass the bar exam', date: 20270224 }, { kind: 'parts', name: 'Pass the bar exam', date: 'next spring' }
  ];
  for (const b of bad) {
    const r = await handle(post(typeof b === 'string' ? b : JSON.stringify(b)));
    assert.equal(r.status, 400, JSON.stringify(b));
    const out = await r.json();
    assert.equal(out.error, 'bad_request');
    assert.ok(out.message, 'says what was wrong');
  }
  let r = await handle(post('{not json'));
  assert.equal(r.status, 400);
  r = await handle(post(steps('Clean my room'), { 'content-type': 'text/plain' }));
  assert.equal(r.status, 415);
  r = await handle(post(steps('Clean my room'), { 'content-length': '5000' }));
  assert.equal(r.status, 413);
  r = await handle(post(JSON.stringify(Object.assign(steps('Clean my room'), { pad: 'x'.repeat(3000) }))));
  assert.equal(r.status, 413);
  r = await handle(new Request('https://' + HOST + '/api/smart', { method: 'PUT', headers: { host: HOST, origin: 'https://' + HOST }, body: '{}' }));
  assert.equal(r.status, 405);
  assert.equal(c.calls.length, 0, 'nothing went to Claude');
  // the edges that pass: 140 characters, a name with spaces around it, no size (medium), a goal with no date
  for (const b of [steps('x'.repeat(140)), { kind: 'steps', name: '  Clean my room  ' }, { kind: 'parts', name: 'Run a marathon' }, { kind: 'parts', name: 'Pass the bar exam', date: '2027-02-24' }]) {
    const res = await makeHandler({ env, fetch: claude({ steps: [{ name: 'Start', minutes: 5 }], parts: [{ name: 'Torts', hours: 30 }], note: '' }).fetch })(post(b));
    assert.equal(res.status, 200, JSON.stringify(b).slice(0, 80));
  }
});

test('only the site itself may ask (and a page on this computer, while developing)', async () => {
  const cases = [
    [{ origin: undefined }, 403],
    [{ origin: 'null' }, 403],
    [{ origin: 'https://evil.example' }, 403],
    [{ origin: 'https://' + HOST + '.evil.example' }, 403],
    [{ origin: 'http://localhost:4464' }, 403],
    [{ origin: 'https://' + HOST }, 200],
    [{ origin: 'http://localhost:4464', host: 'localhost:4464' }, 200],
    [{ origin: 'http://localhost:4464', host: 'localhost:4465' }, 200],
    [{ origin: 'http://127.0.0.1:4464', host: '127.0.0.1:4465' }, 200],
    [{ origin: 'https://evil.example', host: 'localhost:4465' }, 403]
  ];
  for (const [h, status] of cases) {
    const headers = Object.assign({}, h);
    if (h.origin === undefined) delete headers.origin;
    const req = post(steps('Clean my room'), headers);
    if (h.origin === undefined) req.headers.delete('origin');
    const r = await makeHandler({ env, fetch: fine().fetch })(req);
    assert.equal(r.status, status, JSON.stringify(h));
    if (status === 403) assert.equal((await r.json()).error, 'bad_request');
  }
});

test('about 10 a minute and 100 a day from one address, and it says so plainly', async () => {
  let clock = Date.UTC(2026, 9, 14, 15);
  const now = () => clock, handle = makeHandler({ env, fetch: fine().fetch, now });
  const ask = (ip) => handle(post(steps('Clean my room'), { 'x-real-ip': ip || '198.51.100.4' }));
  for (let i = 0; i < 10; i++) assert.equal((await ask()).status, 200, 'ask ' + (i + 1));
  let r = await ask();
  assert.equal(r.status, 429);
  const over = await r.json();
  assert.equal(over.error, 'too_many');
  assert.match(over.message, /10 in a minute/);
  assert.ok(Number(r.headers.get('retry-after')) > 0 && Number(r.headers.get('retry-after')) <= 60);
  assert.equal((await ask('198.51.100.99')).status, 200, 'another address has its own count');
  clock += 61 * 1000;
  assert.equal((await ask()).status, 200, 'a minute on, it answers again');
  // 89 more in the day, ten a minute
  for (let i = 0; i < 89; i++) { if (i % 9 === 0) clock += 61 * 1000; assert.equal((await ask()).status, 200, 'day ask ' + (i + 12)); }
  clock += 61 * 1000;
  r = await ask();
  assert.equal(r.status, 429);
  assert.match((await r.json()).message, /100 today/);
  clock += 24 * 60 * 60 * 1000;
  assert.equal((await ask()).status, 200, 'the next day it answers again');
  // a bad ask doesn't use one up
  const lim = makeLimiter({ now });
  const h2 = makeHandler({ env, fetch: fine().fetch, now, limiter: lim });
  for (let i = 0; i < 20; i++) await h2(post({ kind: 'steps', name: '' }, { 'x-real-ip': '192.0.2.1' }));
  assert.equal((await h2(post(steps('Clean my room'), { 'x-real-ip': '192.0.2.1' }))).status, 200);
});

test('the request to Claude: Haiku, a forced tool, about 800 tokens, and only the words asked about', async () => {
  const c = fine();
  const r = await makeHandler({ env, fetch: c.fetch })(post(Object.assign(steps('Clean the garage', 'small'), { board: { secret: 'the whole week' }, notes: 'private notes' })));
  assert.equal(r.status, 200);
  assert.equal(c.calls.length, 1);
  const { url, init, body } = c.calls[0];
  assert.equal(url, 'https://api.anthropic.com/v1/messages');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['x-api-key'], KEY);
  assert.equal(init.headers['anthropic-version'], '2023-06-01');
  assert.equal(init.headers['content-type'], 'application/json');
  assert.ok(init.signal, 'it can be stopped');
  assert.equal(body.model, 'claude-haiku-5-5');
  assert.equal(body.max_tokens, 800);
  assert.deepEqual(Object.keys(body).sort(), ['max_tokens', 'messages', 'model', 'system', 'tool_choice', 'tools']);
  assert.equal(body.tools.length, 1);
  const tool = body.tools[0];
  assert.equal(tool.name, 'give_steps');
  assert.equal(tool.strict, true);
  assert.equal(tool.input_schema.type, 'object');
  assert.deepEqual(tool.input_schema.required, ['steps']);
  assert.deepEqual(tool.input_schema.properties.steps.items.required, ['name', 'minutes']);
  assert.equal(tool.input_schema.properties.steps.items.properties.minutes.type, 'integer');
  assert.deepEqual(body.tool_choice, { type: 'tool', name: 'give_steps', disable_parallel_tool_use: true });
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0].role, 'user');
  assert.match(body.messages[0].content, /"Clean the garage"/);
  assert.match(body.messages[0].content, /none longer than 20 minutes/, 'small asks for small steps');
  assert.match(body.system, /first step takes 10 minutes or less/);
  assert.match(body.system, /5 minute grid/);
  assert.match(body.system, /ADHD/);
  const all = JSON.stringify(body);
  assert.ok(!all.includes('the whole week') && !all.includes('private notes'), 'nothing else from the ask goes on');
  assert.ok(!/[\u{2013}\u{2014}]/u.test(all), 'no dashes in what Claude reads');
  // a goal: its tool, its date, and today
  const g = claude({ parts: [{ name: 'Torts', hours: 35 }], note: 'About 400 hours is a common estimate.' });
  const now = () => Date.UTC(2026, 9, 14, 12);
  await makeHandler({ env, fetch: g.fetch, now })(post({ kind: 'parts', name: 'Pass the bar exam', date: '2027-02-24' }));
  const gb = g.calls[0].body;
  assert.equal(gb.tools[0].name, 'give_parts');
  assert.deepEqual(gb.tool_choice, { type: 'tool', name: 'give_parts', disable_parallel_tool_use: true });
  assert.deepEqual(gb.tools[0].input_schema.required, ['parts', 'note']);
  assert.match(gb.messages[0].content, /2027-02-24/);
  assert.match(gb.messages[0].content, /Today is 2026-10-14/);
  assert.match(gb.messages[0].content, /"Pass the bar exam"/);
});

test('a good answer comes back fitted to the board', async () => {
  const c = claude({ steps: [
    { name: 'Pick up everything on the floor', minutes: 25 },
    { name: 'Just put the laundry away.', minutes: 17 },
    { name: 'Vacuum ' + EM + ' under the bed too', minutes: 400 },
    { name: 'Do 10' + EN + '15 minutes of dusting', minutes: 15 },
    { name: 'Really', minutes: 5 }
  ] });
  const r = await makeHandler({ env, fetch: c.fetch })(post(steps('Clean my room')));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { steps: [
    { name: 'Pick up everything on the floor, first 10 minutes', dur: 10 },
    { name: 'Pick up everything on the floor, the rest', dur: 15 },
    { name: 'Put the laundry away', dur: 15 },
    { name: 'Vacuum, under the bed too', dur: 240 },
    { name: 'Do 10 to 15 minutes of dusting', dur: 15 }
  ] });
  const g = claude({ parts: [{ name: 'Torts', hours: 35 }, { name: 'Essay practice', hours: 12.5 }, { name: 'Register', hours: 0.1 }], note: 'About 400 hours is a common estimate' });
  const rg = await makeHandler({ env, fetch: g.fetch })(post({ kind: 'parts', name: 'Pass the bar exam', date: '2027-02-24' }));
  assert.equal(rg.status, 200);
  assert.deepEqual(await rg.json(), { parts: [{ name: 'Torts', min: 2100 }, { name: 'Essay practice', min: 750 }, { name: 'Register', min: 15 }], note: 'About 400 hours is a common estimate.' });
});

test('an answer that is wrong or missing is upstream, so the page keeps its own steps', async () => {
  const cases = [
    claude({ steps: [{ name: 'Start', minutes: 5 }] }, { stop_reason: 'refusal', content: [] }),
    claude({ steps: [{ name: 'Start', minutes: 5 }] }, { stop_reason: 'max_tokens' }),
    claude({ steps: [{ name: 'Start', minutes: 5 }] }, { content: [{ type: 'text', text: 'Here are your steps' }] }),
    claude({ steps: [{ name: 'Start', minutes: 5 }] }, { content: [{ type: 'tool_use', id: 't', name: 'something_else', input: { steps: [] } }] }),
    claude({ steps: [] }),
    claude({ steps: 'Clean it' }),
    claude({ steps: [{ name: '', minutes: 5 }, { name: 'Actually', minutes: 10 }] }),
    claude({ steps: Array.from({ length: 16 }, (_, i) => ({ name: 'Step ' + (i + 1), minutes: 5 })) }),
    claude({ steps: [{ name: 'Start', minutes: 'soon' }] })
  ];
  for (const c of cases) {
    const r = await makeHandler({ env, fetch: c.fetch })(post(steps('Clean my room')));
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error, 'upstream');
  }
  const errs = [
    async () => new Response('{"type":"error","error":{"type":"overloaded_error"}}', { status: 529 }),
    async () => new Response('{"type":"error","error":{"type":"authentication_error"}}', { status: 401 }),
    async () => new Response('not json', { status: 200 }),
    async () => { throw new TypeError('fetch failed'); }
  ];
  for (const fetch of errs) {
    const r = await makeHandler({ env, fetch })(post(steps('Clean my room')));
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error, 'upstream');
  }
  const p = claude({ parts: [], note: '' });
  const rp = await makeHandler({ env, fetch: p.fetch })(post({ kind: 'parts', name: 'Pass the bar exam' }));
  assert.equal(rp.status, 502);
});

test('a slow answer gives up and says so, and the wait is 15 seconds', async () => {
  const hang = (url, init) => new Promise((ok, no) => init.signal.addEventListener('abort', () => no(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const t0 = Date.now();
  const r = await makeHandler({ env, fetch: hang, waitMs: 30 })(post(steps('Clean my room')));
  assert.equal(r.status, 504);
  const out = await r.json();
  assert.equal(out.error, 'upstream');
  assert.match(out.message, /15 seconds/);
  assert.ok(Date.now() - t0 < 2000);
  // the real wait, read from the timer the handler sets
  const real = globalThis.setTimeout, waits = [];
  globalThis.setTimeout = (fn, ms, ...a) => { waits.push(ms); return real(fn, 0, ...a); };
  try { await makeHandler({ env, fetch: hang })(post(steps('Clean my room'))); } finally { globalThis.setTimeout = real; }
  assert.ok(waits.includes(15000), 'gives up after 15 seconds');
});

test('the words asked about and the key never reach a log', async () => {
  const said = [], keep = {};
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { keep[k] = console[k]; console[k] = (...a) => said.push(a.map(String).join(' ')); }
  try {
    const name = 'Plan the surprise party for Jamie';
    const hang = (url, init) => new Promise((ok, no) => init.signal.addEventListener('abort', () => no(new Error('aborted'))));
    await makeHandler({ env, fetch: fine().fetch })(post(steps(name)));
    await makeHandler({ env, fetch: claude({ steps: [] }).fetch })(post(steps(name)));
    await makeHandler({ env, fetch: async () => new Response('{}', { status: 500 }) })(post(steps(name)));
    await makeHandler({ env, fetch: hang, waitMs: 20 })(post(steps(name)));
    await makeHandler({ env, fetch: fine().fetch })(post(steps(name), { origin: 'https://evil.example' }));
    await makeHandler({ env, fetch: fine().fetch })(post({ kind: 'parts', name, date: 'soon' }));
  } finally { for (const k of Object.keys(keep)) console[k] = keep[k]; }
  const all = said.join('\n');
  assert.ok(said.length > 0, 'failures are noted');
  assert.ok(!/surprise|Jamie/i.test(all), 'never the words');
  assert.ok(!all.includes(KEY), 'never the key');
});

test('the server cleans words the way the board writes them', () => {
  assert.equal(cleanName('just  sort the mail.'), 'Sort the mail');
  assert.equal(cleanName('Pay bills ' + EM + ' online'), 'Pay bills, online');
  assert.equal(cleanName('Fold -- then stack'), 'Fold, then stack');
  assert.equal(cleanName('Read 3' + EN + '4 pages'), 'Read 3 to 4 pages');
  assert.equal(cleanName('Clean the kid\'s room'), 'Clean the kid' + String.fromCharCode(0x2019) + 's room');
  assert.equal(cleanName('a'.repeat(80)).length, 60);
  const long = cleanName('Pick everything up off the floor and put it where it goes in the closet and the drawers');
  assert.ok(long.length <= 60 && !/\s(and|the|in)$/.test(long), long);
  assert.equal(cleanName('About 300 hours is common', 160, true), 'About 300 hours is common.');
  assert.equal(cleanName('', 160, true), '');
  // (Oct 14) a dash and then a filler word left ",." behind: the stop stays, the pause goes
  assert.equal(cleanName('Book it ' + EM + ' really.'), 'Book it');
  assert.equal(cleanName('About 300 hours ' + EM + ' really.', 160, true), 'About 300 hours.');
  assert.equal(cleanName('Plan it ' + EM + ' just. Then go', 160, true), 'Plan it. Then go.');
  assert.equal(cleanName('Done. -- next step'), 'Done. next step');
  for (const t of ['Wash up ' + EM + ' just!', 'Rest -- simply.', 'Sort it, ' + EN + ' actually?']) assert.ok(!/[,;:][.!?]|[.!?][,;:]/.test(cleanName(t, 160, true)), t);
  assert.equal(cleanSteps([{ name: 'Wash the car', minutes: 60 }]).length, 2, 'a long first step splits');
  assert.equal(cleanSteps([{ name: 'Wash the car', minutes: 60 }])[0].dur, 10);
  assert.equal(cleanSteps('nope'), null);
  assert.equal(cleanParts({ parts: [{ name: 'Torts', hours: -1 }] }), null);
});

/* == the page's client == */
const CHECKS = variant('    /* smart: the checks.', '    /* smart: asking */');
const checks = () => runInNewContext(CHECKS + '\n;({ aiSteps, aiParts, aiWords })', {});

test('the page uses nothing from the server until it passes the checks', () => {
  const { aiSteps, aiParts, aiWords } = checks();
  const ok = [{ name: 'Clear the floor', dur: 10 }, { name: 'Sort what you find', dur: 20 }];
  assert.deepEqual(plain(aiSteps(ok)), ok);
  // the first step splits off its first 10 minutes, as Model.breakdown does
  assert.deepEqual(plain(aiSteps([{ name: 'Clear the floor', dur: 25 }, { name: 'Sort', dur: 15 }])), [
    { name: 'Clear the floor, first 10 minutes', dur: 10 }, { name: 'Clear the floor, the rest', dur: 15 }, { name: 'Sort', dur: 15 }]);
  // words: no dash for a pause, none of the filler words, at most 60 characters, cut at a word
  const w = plain(aiSteps([{ name: 'Just wipe ' + EM + ' really well.', dur: 10 }, { name: 'Put away the ' + 'very '.repeat(14) + 'last thing', dur: 5 }]));
  assert.equal(w[0].name, 'Wipe, well');
  assert.ok(w[1].name.length <= 60, w[1].name);
  assert.ok(!/[\u{2013}\u{2014}]|--/u.test(JSON.stringify(w)));
  // a step that's off the grid, too long, or the wrong shape: none of it is used
  for (const bad of [[{ name: 'A', dur: 7 }], [{ name: 'A', dur: 245 }], [{ name: 'A', dur: 0 }], [{ name: 'A', dur: '15' }], [{ name: 'A', dur: 12.5 }], [{ name: 5, dur: 5 }], [null],
    Array.from({ length: 16 }, () => ({ name: 'A', dur: 5 })), [], 'steps', null, undefined, [{ name: '', dur: 5 }]]) {
    assert.equal(aiSteps(bad), null, JSON.stringify(bad));
  }
  // fifteen with a long first step would be sixteen: not used
  assert.equal(aiSteps([{ name: 'A', dur: 30 }].concat(Array.from({ length: 14 }, () => ({ name: 'B', dur: 5 })))), null);
  // a goal's parts
  const parts = plain(aiParts({ parts: [{ name: 'Torts', min: 2100 }, { name: 'Essays', min: 750 }], note: 'About 400 hours ' + EM + ' a common estimate' }));
  assert.deepEqual(parts, { parts: [{ name: 'Torts', min: 2100 }, { name: 'Essays', min: 750 }], note: 'About 400 hours, a common estimate.', total: 2850, source: 'claude' });
  assert.equal(plain(aiParts({ parts: [{ name: 'Torts', min: 60 }] })).note, '');
  for (const bad of [{ parts: [{ name: 'Torts', min: 10 }] }, { parts: [{ name: 'Torts', min: 30005 }] }, { parts: [{ name: 'Torts', min: 61 }] }, { parts: [] }, { parts: 'x' }, null]) {
    assert.equal(aiParts(bad), null, JSON.stringify(bad));
  }
  assert.equal(aiWords('simply   rest.', 60), 'Rest');
  // (Oct 14) the page's own cleaner keeps the stop too, so a dash and a filler word never leave ",."
  assert.equal(aiWords('Book it ' + EM + ' really.', 60), 'Book it');
  assert.equal(aiWords('About 300 hours ' + EM + ' really.', 160, true), 'About 300 hours.');
  assert.equal(aiWords('Plan it ' + EM + ' just. Then go', 160, true), 'Plan it. Then go.');
  assert.equal(plain(aiParts({ parts: [{ name: 'Torts', min: 60 }], note: 'About 60 hours ' + EM + ' actually.' })).note, 'About 60 hours.');
});

/* the whole client, with a page made of stand ins: storage, fetch, the kit's sheet, and timers */
const CLIENT = variant('  /* == V11: smart breakdowns ==', '})();');
function page(opts = {}) {
  const store = new Map(opts.stored ? [['sundayreset.ai', opts.stored]] : []);
  const calls = [], sheets = [], buttons = [], events = [];
  const node = (tag, cls, text) => {
    const x = { tag, cls, text: text == null ? '' : String(text), kids: [], attrs: {} };
    x.append = (...k) => { x.kids.push(...k); };
    x.appendChild = (k) => { x.kids.push(k); return k; };
    x.addEventListener = () => {};
    return x;
  };
  const words = (x) => (x && typeof x === 'object' ? [x.text || x.label || ''].concat((x.kids || []).map(words)).join('') : '');
  const ctx = {
    console,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } },
    fetch: async (url, init = {}) => {
      calls.push({ url, init });
      /* a site with no key says not ready with a 200 (Oct 14); a server from before that said it with a 503 */
      if (!init.method || init.method === 'GET') return opts.ready === false ? new Response('{"ready":false}', { status: 200 }) : opts.ready === 'old' ? new Response('{"ready":false}', { status: 503 }) : new Response('{"ready":true}', { status: 200 });
      return opts.answer ? opts.answer(JSON.parse(init.body), init) : new Response('{}', { status: 500 });
    },
    setTimeout: opts.setTimeout || setTimeout, clearTimeout, AbortController, Response,
    CustomEvent: class { constructor(type) { this.type = type; } },
    dispatchEvent: (e) => { events.push(e.type); },
    document: { activeElement: null, body: {}, querySelector: () => null, getElementById: () => null },
    h: node,
    Kit: {
      sheet: (title, build, cls) => { const card = node('section', 'k-sheet ' + cls); build(card); sheets.push({ title, cls, card, text: words(card) }); },
      closeSheet: () => {},
      btn: (cls, label, fn) => { const b = { cls, label, fn }; buttons.push(b); return b; }
    },
    SR: opts.SR || undefined
  };
  ctx.window = ctx;
  runInNewContext(CLIENT, ctx);
  return { ai: ctx.SR_ai, calls, store, sheets, buttons, events, ctx, posts: () => calls.filter((c) => c.init.method === 'POST') };
}
/* a few turns of the event loop, for the stand in fetch and its body to settle */
const tick = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };
const answer = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

test('the client asks the server once a page load, and offers nothing until it answers ready', async () => {
  const p = page();
  assert.equal(p.ai.ready(), false, 'not until it answers');
  await tick(); await tick();
  assert.equal(p.ai.ready(), true);
  assert.equal(p.calls.filter((c) => !c.init.method).length, 1, 'asked once');
  assert.equal(p.calls[0].url, '/api/smart');
  assert.ok(p.events.includes('sr-ai'), 'the screens hear that it is ready');
  p.ai.ready(); p.ai.ready();
  assert.equal(p.calls.length, 1, 'and only once');
  assert.equal(p.ai.available(), false, 'ready, but off on this device');
  const q = page({ ready: false });
  await tick(); await tick();
  assert.equal(q.ai.ready(), false);
  assert.equal(await q.ai.enable(() => assert.fail('never runs')), false, 'nothing to turn on');
  assert.ok(!q.events.includes('sr-ai'), 'nothing to tell the screens');
  // a server from before Oct 14 said not ready with a 503: still not ready, and still nothing offered
  const o = page({ ready: 'old' });
  await tick(); await tick();
  assert.equal(o.ai.ready(), false);
  assert.equal(await o.ai.enable(() => assert.fail('never runs')), false);
});

test('nothing is sent until it is turned on here, and then only the words of one to-do', async () => {
  let sent = null;
  const p = page({ answer: (b) => { sent = b; return answer({ steps: [{ name: 'Clear the floor', dur: 10 }, { name: 'Sort what you find', dur: 20 }] }); } });
  await tick(); await tick();
  assert.equal(await p.ai.breakdown('Clean the garage'), null, 'off: nothing asked');
  assert.equal(p.posts().length, 0);
  let ran = 0;
  assert.equal(await p.ai.enable(() => { ran++; }, { sheet: false }), true);
  assert.equal(ran, 1);
  assert.equal(JSON.parse(p.store.get('sundayreset.ai')).on, true, 'kept on this device');
  assert.equal(p.ai.available(), true);
  const r = plain(await p.ai.breakdown('  Clean the garage ', { size: 'small' }));
  assert.deepEqual(r, { steps: [{ name: 'Clear the floor', dur: 10 }, { name: 'Sort what you find', dur: 20 }], total: 30, source: 'claude' });
  assert.deepEqual(sent, { kind: 'steps', name: 'Clean the garage', size: 'small' }, 'the words, the size, and nothing else');
  const post0 = p.posts()[0];
  assert.equal(post0.url, '/api/smart');
  assert.equal(post0.init.headers['content-type'], 'application/json');
  // the same ask is answered once a page load; fresh asks again
  await p.ai.breakdown('Clean the garage', { size: 'small' });
  assert.equal(p.posts().length, 1);
  await p.ai.breakdown('Clean the garage', { size: 'small', fresh: true });
  assert.equal(p.posts().length, 2);
  // off again: nothing goes
  p.ai.disable();
  assert.equal(JSON.parse(p.store.get('sundayreset.ai')).on, false);
  assert.equal(await p.ai.breakdown('Clean the attic'), null);
  assert.equal(p.posts().length, 2);
  // a name the server would refuse never leaves
  await p.ai.enable(null, { sheet: false });
  assert.equal(await p.ai.breakdown('x'.repeat(141)), null);
  assert.equal(await p.ai.breakdown('Clean' + String.fromCharCode(10) + 'up'), null);
  assert.equal(p.posts().length, 2);
});

test('a goal sends its words and its date, and its parts come back checked', async () => {
  let sent = null;
  const p = page({ stored: '{"on":true}', answer: (b) => { sent = b; return answer({ parts: [{ name: 'Torts', min: 2100 }, { name: 'Essay practice', min: 750 }], note: 'About 400 hours is a common estimate.' }); } });
  await tick(); await tick();
  const r = plain(await p.ai.goalParts('Pass the bar exam', { date: '2027-02-24' }));
  assert.deepEqual(sent, { kind: 'parts', name: 'Pass the bar exam', date: '2027-02-24' });
  assert.deepEqual(r, { parts: [{ name: 'Torts', min: 2100 }, { name: 'Essay practice', min: 750 }], note: 'About 400 hours is a common estimate.', total: 2850, source: 'claude' });
  await p.ai.goalParts('Run a marathon', { date: 'in the spring' });
  assert.deepEqual(sent, { kind: 'parts', name: 'Run a marathon' }, 'a date that isn’t a day stays home');
});

test('anything that goes wrong settles as null, says why, and never waits past 15 seconds', async () => {
  const replies = [
    () => answer({ steps: [{ name: 'Wipe', dur: 7 }] }),
    () => new Response(JSON.stringify({ error: 'too_many', message: 'That’s 10 in a minute, the most for now. Try again in a minute.' }), { status: 429 }),
    () => new Response('<html>', { status: 502 }),
    () => { throw new TypeError('offline'); }
  ];
  let i = 0;
  const p = page({ stored: '{"on":true}', answer: () => replies[i]() });
  await tick(); await tick();
  assert.equal(await p.ai.breakdown('Clean the garage'), null);
  assert.equal(p.ai.lastError().code, 'upstream');
  i = 1;
  assert.equal(await p.ai.breakdown('Clean the garage'), null);
  assert.deepEqual(plain(p.ai.lastError()), { code: 'too_many', message: 'That’s 10 in a minute, the most for now. Try again in a minute.' });
  i = 2;
  assert.equal(await p.ai.breakdown('Clean the garage'), null);
  i = 3;
  assert.equal(await p.ai.breakdown('Clean the garage'), null);
  assert.equal(p.ai.lastError().code, 'upstream');
  // the server lost its key: it stops being offered
  const q = page({ stored: '{"on":true}', answer: () => new Response('{"error":"not_ready","message":"Not set up"}', { status: 503 }) });
  await tick(); await tick();
  assert.equal(await q.ai.breakdown('Clean the garage'), null);
  assert.equal(q.ai.ready(), false);
  // no answer at all: it lets go when the 15 seconds are up (the timer is run at once here)
  const waits = [];
  const slow = page({ stored: '{"on":true}', answer: (b, init) => new Promise((ok, no) => init.signal.addEventListener('abort', () => no(new Error('aborted')))),
    setTimeout: (fn, ms) => { waits.push(ms); return setTimeout(fn, ms === 15000 ? 5 : ms); } });
  await tick(); await tick();
  assert.equal(await slow.ai.breakdown('Clean the garage'), null);
  assert.ok(waits.includes(15000));
  assert.match(slow.ai.lastError().message, /15 seconds/);
  // a success clears what went wrong before
  const ok = page({ stored: '{"on":true}', answer: () => answer({ steps: [{ name: 'Start', dur: 5 }] }) });
  await tick(); await tick();
  assert.ok(await ok.ai.breakdown('Clean the garage'));
  assert.equal(ok.ai.lastError(), null);
});

test('the sheet asks first: what it does, exactly what is sent, who reads it, the policy, Turn on and Not now', async () => {
  const p = page({ answer: () => answer({ steps: [{ name: 'Start', dur: 5 }] }) });
  await tick(); await tick();
  let ran = 0;
  const first = p.ai.enable(() => { ran++; });
  assert.equal(p.sheets.length, 1);
  const s = p.sheets[0];
  assert.equal(s.cls, 'c-ai');
  assert.match(s.text, /The words of this to-do, and the step size/);
  assert.match(s.text, /never leave this device/);
  assert.match(s.text, /Anthropic, the company that makes Claude, processes it under its API terms/);
  assert.match(s.text, /Read the privacy policy/);
  const link = JSON.stringify(s.card);
  assert.match(link, /c-ai-link/);
  assert.ok(!/\b(just|simply|really|please|actually)\b/i.test(s.text), 'no filler words');
  assert.ok(!/[\u{2013}\u{2014}]|--/u.test(s.text), 'no dashes');
  // Not now: nothing changes
  p.buttons.find((b) => b.label === 'Not now').fn();
  assert.equal(await first, false);
  assert.equal(ran, 0);
  assert.equal(p.store.has('sundayreset.ai'), false);
  // Turn on: kept, then the ask runs
  const second = p.ai.enable(() => { ran++; });
  p.buttons.filter((b) => b.label === 'Turn on').at(-1).fn();
  assert.equal(await second, true);
  assert.equal(ran, 1);
  assert.equal(JSON.parse(p.store.get('sundayreset.ai')).on, true);
  // once a device: the next time, no sheet
  await p.ai.enable(() => { ran++; });
  assert.equal(p.sheets.length, 2);
  assert.equal(ran, 2);
  // a goal's sheet says what a goal sends
  const g = page();
  await tick(); await tick();
  g.ai.enable(() => {}, { kind: 'parts' });
  assert.match(g.sheets[0].text, /The words of this goal, and its date/);
});

test('on a made up board the switch is held in memory, never written to this device', async () => {
  const SR = { view: { preview: { id: 'busy' } } };
  const p = page({ SR, answer: () => answer({ steps: [{ name: 'Start', dur: 5 }] }) });
  await tick(); await tick();
  await p.ai.enable(null, { sheet: false });
  assert.equal(p.ai.available(), true);
  assert.equal(p.store.has('sundayreset.ai'), false, 'nothing written');
  SR.view.preview = null;
  assert.equal(p.ai.available(), false, 'back on the real board, it is off as before');
});
