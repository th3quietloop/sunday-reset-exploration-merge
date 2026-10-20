// The unhappy gate, "break it on purpose": V11-2 judged by its worst moments. A product is judged by them (the
// Premium Principles page of Russell's deck), so failure gets the care success does. It walks the app on a desk
// and a phone through what goes wrong: the connection lost in the middle of something, a save the browser
// refuses, Claude failing every way it can, a board with nothing on it yet, and a saved board that can't be read.
// Every state is judged on four things (docs/UNHAPPY-GATE.md):
//   1. it says what happened, in words a person can see: on the screen it opened, or, where the trouble is over
//      when the toast goes, in a toast;
//   2. it offers a way forward: a next step, Try again, Undo, or a way back;
//   3. it isn't a dead end: something on the screen can be done, and nothing waits forever;
//   4. nothing threw: no exception and no console error from the app (a request the state cut on purpose is let
//      through; what the page did about it is not).
// Each state's contrast is measured too (lib/contrast-core.mjs, one look, no scrolling), and every state leaves a
// picture. Made up boards only, and a fresh browser profile for every state.
//
//   npm run unhappy
//   node scripts/gate/unhappy.mjs [-sizes mac,phone] [-groups offline,save,broken,ai,empty] [-only id,id]
//     [-no-contrast] [-survey] [-out folder] [-build folder] [-serve 4480 -cdp 9480]
// -survey prints what each state shows (its words and what can be pressed), to write a new state's expectations.
// Exit code 1 when a state fails a check or couldn't be staged.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, newTab, sleep } from './lib/cdp.mjs';
import { parseArgs, runDir, session } from './lib/session.mjs';
import { KNOWN } from './lib/core.mjs';
import { measure } from './lib/contrast-core.mjs';
import { SIZES as CX } from './lib/contrast-walk.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROBE = readFileSync(join(HERE, 'lib', 'probe.js'), 'utf8');
const PATHS = readFileSync(join(HERE, 'lib', 'paths.js'), 'utf8');
const UH = readFileSync(join(HERE, 'lib', 'unhappy-probe.js'), 'utf8');
const args = parseArgs(process.argv.slice(2));
const J = (v) => JSON.stringify(v);
const say = (s) => process.stdout.write(s + '\n');
const t0 = Date.now();
/* a desk and a phone, as the contrast gate has them (the phone says it's an iPhone) */
const SIZES = { mac: CX.mac, phone: CX.phone };
const sizes = String(args.sizes || 'mac,phone').split(',').filter((s) => SIZES[s]);
const groups = args.groups ? String(args.groups).split(',') : null;
const only = args.only ? String(args.only).split(',') : null;
const dir = runDir(args, 'unhappy');
mkdirSync(join(dir, 'shots'), { recursive: true });

/* == what the server says when it's there, and when it isn't == */
const CFG = { body: { ok: true } };
const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-WR-CALNAME:School\r\nBEGIN:VEVENT\r\nUID:uh-1\r\nDTSTART:20261110T090000\r\nDTEND:20261110T100000\r\nSUMMARY:Field trip\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
/* /api/smart as it answers (variants/corners11/api/smart.js): ready to a GET, and each way an ask fails */
const SMART = {
  not_ready: { status: 503, body: { error: 'not_ready', message: 'Smart breakdowns aren’t set up on this site yet.' } },
  too_many: { status: 429, body: { error: 'too_many', message: 'That’s 10 asks this minute. Try again in a minute.', limit: 'minute', most: 10, retry: 42 } },
  slow: 'hang',
  bad_json: { status: 200, body: '{"steps": [ {"name": "Gather the', type: 'application/json' },
  offline: 'fail'
};
const smartRoute = (kind) => ['*/api/smart*', (req) => (req.method === 'GET' ? { body: { ready: true } } : SMART[kind])];

/* == the states ==
   Each: id, group, name, who answers for it (owner), the sizes it's on, setup(t) (opens its page, marks the moment
   it begins with t.mark(), then breaks it), wait (how long it gets to answer), scope (the surface it opens: its
   words and controls are what's judged), said (the words that say what happened; 'empty' for a place with
   nothing in it: a line that says so, or a sentence about the place), stays (the trouble outlasts a toast, so the
   words must be on the screen), way (a control that goes forward). A setup that can't stage its state returns
   { skip }, which fails the gate: a state that can't be reached isn't judged. */
const PHONE_HELPER = 'phone helper (AI errors, error toasts with Try again, phone Undo)';
const MOMENTS_HELPER = 'moments helper (empty and overdue states)';
const SHARED = 'shared infrastructure (fixed by this gate’s author)';
const STATES = [];
const S = (o) => STATES.push(Object.assign({ sizes: ['mac', 'phone'], wait: 1600, stays: true }, o));
const MORNING = 'Look at a sample week';

/* == the connection lost in the middle of something == */
S({ id: 'offline-breakdown', group: 'offline', name: 'Offline: Break it down asks Claude', owner: PHONE_HELPER, scope: '#side',
  said: /offline|connection|didn.t answer|built-in steps/i, way: /try again|use these|small|medium|big|add a step|back/i,
  async setup(t) {
    await t.page({ routes: [smartRoute('offline')] });
    if (!(await t.aiOn())) return { skip: 'smart breakdowns never said they were ready' };
    const id = await t.todoWithoutSteps();
    if (!id) return { skip: 'no to-do without steps on the sample' };
    await t.offline(true);
    await t.mark();
    await t.ev(`SR.breakDown(${J(id)}), 1`);
  } });
S({ id: 'offline-calendar-refresh', group: 'offline', name: 'Offline: refreshing a calendar', owner: 'Settings, Calendars (app.js)', scope: '#drawer',
  said: /offline|connection|couldn.t|can.t reach|showing what we had/i, way: /refresh|try again/i,
  async setup(t) {
    let off = false;
    await t.page({ boot: 'real', routes: [['*/api/config*', () => CFG], ['*/api/ics*', () => (off ? 'fail' : { body: { text: ICS, url: 'https://calendar.example.test/school.ics' } })]] });
    await t.edit(`s.calendars = (s.calendars || []).concat({ id: 'uh-cal', name: 'School calendar', cat: 'work', url: 'https://calendar.example.test/school.ics', fetched: Date.now() })`);
    await t.ev(`SR.openDrawer('calendars'), 1`); await t.sleep(900);
    off = true; await t.offline(true);
    await t.mark();
    if (!(await t.click(/^Refresh$/))) return { skip: 'no Refresh for the calendar (the page needs a server)' };
  } });
S({ id: 'offline-calendar-link', group: 'offline', name: 'Offline: subscribing to a calendar by its link', owner: 'Settings, Calendars (app.js)', scope: '#drawer',
  said: /offline|connection|couldn.t|can.t reach/i, way: /subscribe|try again|bring in a calendar file/i,
  async setup(t) {
    await t.page({ boot: 'real', routes: [['*/api/config*', () => CFG], ['*/api/ics*', () => 'fail']] });
    await t.ev(`SR.openDrawer('calendars'), 1`); await t.sleep(900);
    await t.offline(true);
    await t.mark();
    if (!(await t.type('input[aria-label="A calendar link"]', 'https://calendar.example.test/school.ics'))) return { skip: 'no box for a calendar link (the page needs a server)' };
    if (!(await t.click(/^Subscribe$/))) return { skip: 'no Subscribe' };
  } });
S({ id: 'offline-link-device', group: 'offline', name: 'Offline: linking this device with a code', owner: SHARED, scope: '#drawer', stays: false,
  said: /couldn.t link|connection|offline/i, way: /link this device|try again/i,
  async setup(t) {
    await t.page({ boot: 'real', routes: [['*/api/config*', () => CFG], ['*/api/link*', () => 'fail']] });
    await t.ev(`SR.openDrawer('sync'), 1`); await t.sleep(900);
    if (!(await t.click(/^I have a code$/))) return { skip: 'no I have a code (the page needs a server)' };
    await t.sleep(500);
    await t.type('input[placeholder="Code or household key"]', 'K7Q2MX');
    await t.offline(true);
    await t.mark();
    if (!(await t.click(/^Link this device$/))) return { skip: 'no Link this device' };
  } });
S({ id: 'offline-feedback', group: 'offline', name: 'Offline: sending feedback', owner: 'Help, feedback (app.js)', scope: '#side', stays: false,
  said: /couldn.t send|copied|copy it|offline|connection/i, way: /send it|copy|try again/i,
  async setup(t) {
    await t.page({ routes: [['*/api/config*', () => CFG], ['*/api/feedback*', () => 'fail']] });
    await t.ev(`SR.openSel({ type: 'feedback' }), 1`); await t.sleep(900);
    if (!(await t.type('textarea[data-fk="fb"]', 'The week view went blank after I added a dinner.'))) return { skip: 'no box for the words' };
    await t.offline(true);
    await t.mark();
    if (!(await t.click(/^(Send it|Send it as a message|Copy it)$/))) return { skip: 'no Send it' };
  } });
S({ id: 'offline-open', group: 'offline', name: 'Offline: opening the app again after one visit (the service worker)', owner: SHARED, wait: 4000,
  /* the week opens as it was, desk and all; a desk that can't draw says so, and the list stands in */
  said: (look) => !look.drawn ? 'the page couldn’t be read' : look.drawn.drawn ? null : 'it opened without ' + look.drawn.why,
  way: /./,
  async setup(t) {
    /* one visit with the connection, the way a person's first is, then none at all, and the app opened again */
    await t.page({ boot: 'real' });
    const sw = await t.ev(`(async () => { if (!navigator.serviceWorker) return 'none'; const r = await Promise.race([navigator.serviceWorker.ready.then(() => 'ready'), new Promise((ok) => setTimeout(() => ok('slow'), 8000))]); for (let k = 0; k < 40 && !navigator.serviceWorker.controller; k++) await new Promise((ok) => setTimeout(ok, 100)); return r + (navigator.serviceWorker.controller ? ', in charge' : ', not in charge'); })()`);
    t.note('service worker after the first visit: ' + sw);
    await t.sleep(2500);
    /* (each style sheet's rules with the connection, to hold the offline open to: a placeholder sheet has none) */
    t.rulesOnline = await t.ev(`JSON.stringify(Object.fromEntries([...document.querySelectorAll('link[rel=stylesheet]')].map((l) => { let n = -1; try { n = l.sheet ? l.sheet.cssRules.length : -1; } catch (e) { n = -1; } return [l.getAttribute('href'), n]; })))`);
    await t.offline(true);
    await t.workersOffline(true);
    await t.mark();
    await t.c.nav(t.url + '?debug', 3500);
    await t.ev(UH);
    /* (proof the worker has no connection either: an address it never kept, asked through it, fails) */
    t.note('a fresh address through the worker: ' + (await t.ev(`fetch('/src/app.js?uh=' + Date.now(), { cache: 'no-store' }).then((r) => 'answered ' + r.status, () => 'failed, so the worker is offline too')`)));
  } });

/* the desk that can't draw (no WebGL, or three.js not there): the week is a list, and the page says why */
S({ id: 'nodesk', group: 'offline', name: 'No desk: a device that can’t draw it (the list stands in)', owner: SHARED, sizes: ['mac'], wait: 2500,
  said: /can.t draw|desk|as a list/i, way: /./,
  async setup(t) {
    await t.page({ q: 'nodesk' });
    await t.mark();
    /* (the Sunday Reset's steps speak to the desk: they threw on every redraw without one) */
    await t.ev(`(() => { if (SR.view.mode !== 'planner') SR.setMode('planner'); SR.startReset(SR.resetWeek()); return 1; })()`);
    await t.sleep(1200);
    await t.ev(`(() => { SR.goStep(0); return 1; })()`);
  } });

/* the 3D library that never arrives (a network that blocks its CDN, or an app opened offline before it was kept):
   no World at all, and the version's own code speaks to World (it threw on every redraw of the reset) */
S({ id: 'nodesk-library', group: 'offline', name: 'No desk: the 3D library never arrives', owner: SHARED, sizes: ['mac'], wait: 2500,
  said: /can.t draw|as a list/i, way: /./,
  async setup(t) {
    await t.page({ routes: [['*three@0.160.0*', () => 'fail']] });
    if (await t.ev(`!!window.THREE`)) return { skip: 'three.js loaded anyway' };
    await t.mark();
    await t.ev(`(() => { if (SR.view.mode !== 'planner') SR.setMode('planner'); SR.startReset(SR.resetWeek()); return 1; })()`);
    await t.sleep(1200);
    await t.ev(`(() => { SR.goStep(0); return 1; })()`);
  } });

/* == a save the browser refuses (the toast says it; Your data and the board's chip keep saying it) == */
const refuse = (name, msg) => `(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('sundayreset.')) throw new DOMException(${J(msg)}, ${J(name)}); return set.call(this, k, v); }; return 1; })()`;
S({ id: 'save-full', group: 'save', name: 'Save: this browser’s storage is full', owner: SHARED, stays: false,
  said: /storage is full|didn.t save|not saved/i, way: /your data|download|back ?up|try again/i,
  async setup(t) {
    await t.page({ boot: 'real' });
    await t.ev(refuse('QuotaExceededError', 'The quota has been exceeded.'));
    await t.mark();
    await t.edit(`s.settings.uhProbe = Date.now()`);
  } });
S({ id: 'save-full-data', group: 'save', name: 'Save: Your data, after a change didn’t save', owner: SHARED, scope: '#drawer',
  said: /didn.t save|not saved|full|couldn.t save/i, way: /download|back ?up/i,
  async setup(t) {
    await t.page({ boot: 'real' });
    await t.ev(refuse('QuotaExceededError', 'The quota has been exceeded.'));
    await t.edit(`s.settings.uhProbe = Date.now()`);
    await t.sleep(1600);
    await t.mark();
    await t.ev(`SR.openDrawer('data'), 1`);
  } });
S({ id: 'save-blocked', group: 'save', name: 'Save: this browser blocks storage', owner: SHARED, stays: false,
  said: /didn.t save|not saved|blocked/i, way: /your data|download|back ?up|try again/i,
  async setup(t) {
    await t.page({ boot: 'real' });
    await t.ev(refuse('SecurityError', 'The operation is insecure.'));
    await t.mark();
    await t.edit(`s.settings.uhProbe = Date.now()`);
  } });
/* inside claude.ai the board lives in the artifact's database; one that refuses a write calls Store.onError */
const FAKE_DB = `(() => { const no = async () => { throw new Error('The database refused the write.'); };
  const doc = () => ({ get: async () => ({ exists: false, data: () => null }), set: no, onSnapshot: () => () => {} });
  window.claude = { use: async (k) => k === 'db' ? { doc, collection: () => ({ get: async () => ({ docs: [] }), onSnapshot: () => () => {} }) } : null }; })();`;
S({ id: 'save-refused-db', group: 'save', name: 'Save: the artifact’s database refuses a write (Store.onError)', owner: SHARED, sizes: ['mac'], stays: false,
  said: /didn.t save|not saved|couldn.t save/i, way: /your data|download|back ?up|try again/i,
  async setup(t) {
    await t.page({ boot: 'real', init: [FAKE_DB] });
    const mode = await t.ev(`(window.Store && Store.mode) || ''`);
    if (mode !== 'db') return { skip: 'the board didn’t open in the database (' + mode + ')' };
    await t.mark();
    await t.edit(`s.settings.uhProbe = Date.now()`);
  } });

/* == a saved board that can't be read (each begins as the page opens: it's what the boot meets) == */
const once = (body) => `try { if (!sessionStorage.getItem('uh-once')) { sessionStorage.setItem('uh-once', '1'); ${body} } } catch (e) {}`;
S({ id: 'broken-save', group: 'broken', name: 'Broken: a saved board this browser can’t read', owner: SHARED, wait: 2500, scope: '#sheet',
  said: /couldn.t be read|damaged|can.t read/i, way: /download it|load a backup|look around|sample/i,
  async setup(t) { await t.page({ boot: 'none', mark: true, init: [once(`localStorage.setItem('sundayreset.v1', '{"v":7,"tasks":[{"id":"t1","name":"Call the');`)] }); } });
S({ id: 'broken-newer', group: 'broken', name: 'Broken: a board saved by a newer version', owner: SHARED, wait: 2500, scope: '#sheet',
  said: /newer version/i, way: /reload|update|download it/i,
  async setup(t) { await t.page({ boot: 'none', mark: true, init: [once(`localStorage.setItem('sundayreset.v1', JSON.stringify({ v: 99, tasks: [], dates: {}, dinners: {} }));`)] }); } });

/* == Claude failing every way it can (the phone helper is reworking these: reported here, not fixed) == */
const AI_KINDS = [['not_ready', /aren.t set up|isn.t set up|not set up|built-in steps/i], ['too_many', /asks this minute|try again in a minute|lot of asks|too many/i], ['slow', /longer than|in time|didn.t answer/i], ['bad_json', /didn.t fit|couldn.t read|didn.t answer/i]];
for (const [kind, said] of AI_KINDS) {
  S({ id: 'ai-breakdown-' + kind.replace('_', '-'), group: 'ai', name: 'Claude: Break it down, ' + kind.replace('_', ' '), owner: PHONE_HELPER, scope: '#side', wait: kind === 'slow' ? 17500 : 2500,
    said, way: /try again|use these|small|medium|big|add a step|back/i,
    async setup(t) {
      await t.page({ routes: [smartRoute(kind)] });
      if (!(await t.aiOn())) return { skip: 'smart breakdowns never said they were ready' };
      const id = await t.todoWithoutSteps();
      if (!id) return { skip: 'no to-do without steps on the sample' };
      await t.mark();
      await t.ev(`SR.breakDown(${J(id)}), 1`);
    } });
  S({ id: 'ai-goal-' + kind.replace('_', '-'), group: 'ai', name: 'Claude: a new goal’s parts, ' + kind.replace('_', ' '), owner: PHONE_HELPER, scope: '#side', wait: kind === 'slow' ? 17500 : 2500,
    said: kind === 'not_ready' ? /aren.t set up|isn.t set up|not set up|these parts stay|these stay/i : said, way: /try again|add a part|suggest parts|next|back|your plan/i,
    async setup(t) {
      await t.page({ routes: [smartRoute(kind)] });
      if (!(await t.aiOn())) return { skip: 'smart breakdowns never said they were ready' };
      await t.ev(`SR.openGoal({ name: 'Learn the cello' }), 1`); await t.sleep(900);
      await t.ev(`SR.openSel({ type: 'newGoal', kind: 'parts' }), 1`); await t.sleep(900);
      if (!(await t.has(/^Suggest parts with Claude$/))) return { skip: 'New goal’s parts never offered Suggest parts with Claude' };
      await t.mark();
      await t.click(/^Suggest parts with Claude$/);
    } });
}

/* == a board with nothing on it yet: Dev's empty board (the moments helper is doing these: reported, not fixed) == */
const EMPTY_WAY = /add|new|make|plan|start|turn on|pick|choose|bring|set up|write|type|get ready|fill|see your week|finish|^done$/i;
const E = (o) => S(Object.assign({ group: 'empty', owner: MOMENTS_HELPER, said: 'empty', way: EMPTY_WAY }, o));
E({ id: 'empty-todos', name: 'Empty: To-dos', scope: '.c-tdock, #side',
  async setup(t) { await t.page({ boot: 'empty' }); await t.mark(); await t.ev(t.size === 'phone' ? `SR.openSel({ type: 'dueSoon' }), 1` : `Kit.v7.openTodos(), 1`); } });
E({ id: 'empty-dinners', name: 'Empty: Dinners (the meal board)', scope: '.c-mat',
  async setup(t) { await t.page({ boot: 'empty' }); await t.mark(); await t.ev(`(window.SR_planMeals ? SR_planMeals() : null), 1`); } });
E({ id: 'empty-goals', name: 'Empty: Goals', scope: '#side',
  async setup(t) { await t.page({ boot: 'empty' }); await t.mark(); await t.ev(`SR.openGoals(), 1`); } });
E({ id: 'empty-countdown', name: 'Empty: a countdown with no steps', scope: '#side',
  async setup(t) {
    await t.page({ boot: 'empty' });
    await t.ev(`SR.commit(() => { SR.state.events.push({ id: 'uh-ev', kind: 'marker', name: 'Open house', icon: 'star', cat: 'home', date: SR.M.addDays(SR.today, 40), ready: [] }); }), 1`);
    await t.mark();
    await t.ev(`SR.openCountdown({ event: 'uh-ev' }), 1`);
  } });
E({ id: 'empty-library', name: 'Empty: Block library', scope: '#drawer',
  async setup(t) { await t.page({ boot: 'empty' }); await t.mark(); await t.ev(`SR.openDrawer('library'), 1`); } });
/* (Today with nothing on it is open time: the band says how long, and its ways forward are ideas to start and the
   day's question, what kind of day) */
E({ id: 'empty-today', name: 'Empty: Today', scope: '#band, #moment, #todayview', said: /\bopen\b|free|nothing|no plans/i,
  way: new RegExp(EMPTY_WAY.source + '|creative time|workout|walk|focus on|your usual|rest|what kind|every kind', 'i'),
  async setup(t) { await t.page({ boot: 'empty' }); await t.mark(); await t.ev(`(() => { if (SR.view.mode !== 'today') SR.setMode('today'); return 1; })()`); } });
E({ id: 'empty-next7', name: 'Empty: the next 7 days', sizes: ['phone'], scope: '#side', way: new RegExp(EMPTY_WAY.source + '|^(today|tomorrow|sun|mon|tue|wed|thu|fri|sat)', 'i'),
  async setup(t) { await t.page({ boot: 'empty' }); await t.mark(); await t.ev(`SR.openSel({ type: 'next7' }), 1`); } });
/* the Sunday Reset on the empty board, a state for each of its steps (Look ahead among them) */
E({ id: 'empty-reset', name: 'Empty: the Sunday Reset', scope: '#rack.resetting, nav.c-steps', each: 'reset',
  async setup(t) { await t.page({ boot: 'empty' }); } });

/* == running it == */
const ses = await session(Object.assign({ cdp: 9488, serve: 0 }, args), 'unhappy');
say('V11-2 at ' + ses.url + (ses.root ? ' (' + ses.root + ')' : '') + (ses.chrome ? ', ' + ses.chrome : ''));
const results = [];
try {
  /* (shared infrastructure first, the helpers' areas last: AI errors, then empty states) */
  const order = ['offline', 'save', 'broken', 'ai', 'empty'];
  const list = STATES.slice().sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  for (const size of sizes) {
    say('== ' + SIZES[size].label);
    for (const st of list) {
      if (!st.sizes.includes(size) || (groups && !groups.includes(st.group)) || (only && !only.some((x) => st.id.startsWith(x)))) continue;
      if (st.each === 'reset') { await resetSteps(st, size); continue; }
      await one(st, size);
    }
  }
} finally {
  await ses.stop();
}
report();

/* a state at a size: its page, its setup, a wait, then the look, the picture, the judging, the contrast */
async function one(st, size, extra = {}) {
  const t = helper(size);
  const r = { id: st.id + (extra.suffix || ''), group: st.group, name: st.name + (extra.name || ''), owner: st.owner, size };
  try {
    const s = extra.setup ? await extra.setup(t) : await st.setup(t);
    if (s && s.skip) { r.skip = s.skip; say('   ' + r.id + ': could not stage it (' + s.skip + ')'); results.push(r); await t.close(); return; }
    await sleep(st.wait);
    const look = await t.ev('__uh.look(' + J(st.scope || null) + ')');
    if (!look || look.__error) throw new Error('the page could not be read: ' + (look && look.__error));
    if (st.id === 'offline-open') { look.drawn = await drawn(t); r.drawn = look.drawn; t.note('kept by the worker: ' + (await kept(t))); }
    r.shot = join(dir, 'shots', (size + '-' + r.id).replace(/[^a-z0-9]+/gi, '-') + '.png');
    try { await t.c.shot(r.shot); } catch (e) { r.shot = null; }
    Object.assign(r, judge(st, look, t));
    r.notes = t.notes;
    if (!args['no-contrast']) {
      try { const m = await measure(t.c, { focus: false, scroll: false, settle: 1200 }); r.contrast = m.results.filter((x) => !x.pass).map((x) => ({ text: x.text, ratio: x.ratio, need: x.need, kind: x.kind })); } catch (e) { r.contrast = null; r.contrastError = String(e.message || e).slice(0, 160); }
    }
    say('   ' + r.id + ': ' + (r.pass ? 'pass' : 'FAIL ' + r.why.join('; ')) + (r.contrast && r.contrast.length ? ' (contrast: ' + r.contrast.length + ' below)' : ''));
    if (args.survey) say('      words: ' + look.words.join(' | ').slice(0, 600) + '\n      toasts: ' + J(look.toasts.map((x) => x.text + (x.buttons.length ? ' [' + x.buttons.join(', ') + ']' : ''))) + '\n      can: ' + look.controls.map((x) => x.name).filter(Boolean).slice(0, 24).join(' | ') + (look.busy.length ? '\n      busy: ' + look.busy.join(', ') : '') + '\n      layer: ' + look.layer.join(', ') + (t.notes.length ? '\n      notes: ' + t.notes.join(' / ') : '') + (r.drawn ? '\n      drawn: ' + J(r.drawn) : ''));
  } catch (e) {
    r.error = String(e && e.message || e).slice(0, 300);
    say('   ' + r.id + ': ERROR ' + r.error);
  }
  results.push(r);
  await t.close();
}
/* the reset on the empty board: one state for each step it runs */
async function resetSteps(st, size) {
  const t = helper(size);
  await t.page({ boot: 'empty' });
  const steps = JSON.parse((await t.ev(`JSON.stringify((SR.stepsNow ? SR.stepsNow() : []).map((s) => s.id || s.key || String(s)))`)) || '[]');
  await t.close();
  if (!steps.length) { results.push({ id: st.id, group: st.group, name: st.name, owner: st.owner, size, skip: 'the reset had no steps' }); say('   ' + st.id + ': could not stage it (no steps)'); return; }
  for (let i = 0; i < steps.length; i++) {
    await one(st, size, { suffix: '-' + steps[i], name: ', ' + steps[i], setup: async (u) => {
      await u.page({ boot: 'empty' });
      await u.ev(`(() => { if (SR.view.mode !== 'planner') SR.setMode('planner'); SR.startReset(SR.resetWeek()); return 1; })()`);
      await u.sleep(1200);
      await u.mark();
      await u.ev(`(() => { if (!SR.view.reset) SR.startReset(SR.resetWeek()); SR.goStep(${i}); return 1; })()`);
    } });
  }
}

/* what the service worker kept: its copies of the page, the code, the style sheets, and the 3D library */
async function kept(t) {
  return t.ev(`(async () => { if (!window.caches) return 'no caches'; const names = await caches.keys(); const out = []; for (const n of names) { const c = await caches.open(n); const ks = (await c.keys()).map((r) => r.url); out.push(n + ': ' + ks.length + ' (' + ks.filter((u) => /\\/src\\/css\\//.test(u)).length + ' area style sheets, three.js ' + (ks.some((u) => /three/.test(u)) ? 'kept' : 'not kept') + ')'); } return out.join('; ') || 'nothing'; })()`);
}
/* did the page draw after opening with no connection: its styles, the desk (or a list that says why it's there) */
async function drawn(t) {
  return t.ev(`(() => {
    const links = [...document.querySelectorAll('link[rel=stylesheet]')].filter((l) => !/fonts\\.googleapis/.test(l.href));
    /* (a sheet that didn't arrive can still be there, with no rules in it, where it had them with the connection) */
    const online = ${t.rulesOnline || '{}'};
    const missing = links.filter((l) => { try { return !l.sheet || (!l.sheet.cssRules.length && online[l.getAttribute('href')] > 0); } catch (e) { return false; } }).map((l) => l.getAttribute('href'));
    const desk = !!window.THREE, list = document.body.classList.contains('no-desk');
    const app = !!window.SR && !!SR.state;
    const why = [];
    if (!app) why.push('the app (it never started)');
    if (missing.length) why.push(missing.length + ' of ' + links.length + ' style sheets (' + missing.slice(0, 4).join(', ') + (missing.length > 4 ? ', …' : '') + ')');
    if (!desk) why.push('its desk (three.js didn’t load' + (list ? ', and the list stands in' : '') + ')');
    return { app, desk, list, missing, sheets: links.length, why: why.join(', '), drawn: app && !missing.length && desk };
  })()`);
}

/* the four checks */
function judge(st, look, t) {
  const words = look.words.join(' | '), prose = look.prose || [], toastWords = look.toasts.map((x) => x.text).join(' | ');
  const text = words + ' | ' + toastWords;
  const can = look.controls.map((x) => x.name).filter(Boolean).concat(st.stays ? [] : look.toasts.flatMap((x) => x.buttons));
  const why = [];
  /* (the screen the state opens has to be there to be judged) */
  if (!look.scoped) why.push('what it opens never showed (' + st.scope + ')');
  /* 1. it says what happened */
  if (typeof st.said === 'function') { const bad = st.said(look); if (bad) why.push(bad); }
  else if (st.said === 'empty') {
    /* a place with nothing in it says so (a row that says Nothing locked counts), or says what the place is for in a
       sentence that isn't a button's label */
    if (!look.words.some((l) => /\b(no|nothing|none|empty|yet|clear|free)\b/i.test(l)) && !prose.some((l) => l.length >= 30 && / /.test(l))) why.push('it doesn’t say what’s here (nothing but titles and buttons: ' + look.words.slice(0, 6).join(' / ') + ')');
  } else if (!st.said.test(st.stays ? words : text)) why.push('it doesn’t say what happened' + (st.stays ? ' on the screen' : '') + ' (looked for ' + st.said + ')');
  /* 2. a way forward */
  if (!can.some((n) => st.way.test(n))) why.push('no way forward (looked for ' + st.way + ' among ' + (can.slice(0, 8).join(', ') || 'nothing') + ')');
  /* 3. not a dead end: something to do, and nothing waiting forever */
  const doing = look.controls.filter((x) => x.name && !/^(close|close (this|the) .+|close settings|x|×|dismiss|done)$/i.test(x.name));
  if (!doing.length && !look.toasts.some((x) => x.buttons.length)) why.push('a dead end: nothing on the screen to press but a close');
  if (look.busy.length) why.push('still waiting: ' + look.busy.join(', '));
  /* 4. nothing threw (a request the state cut on purpose, or answered with an error, is let through) */
  const errs = t.errors().filter((e) => !KNOWN(e) && !(e.kind === 'log' && /Failed to load resource|net::ERR_/.test(e.text)));
  if (errs.length) why.push('errors: ' + errs.slice(0, 3).map((e) => (e.phase === 'opening' ? '(while opening) ' : '') + e.text.split('\n')[0].slice(0, 140)).join(' | '));
  return { pass: !why.length, why, said: text.slice(0, 1200), can: can.slice(0, 40), busy: look.busy, layer: look.layer, heard: look.heard, toasts: look.toasts };
}

/* what a state's setup works with: a page in a browser profile of its own, at this size */
function helper(size) {
  const Sz = SIZES[size];
  let c = null, markAt = 0;
  const t = {
    size, url: ses.url, notes: [],
    get c() { return c; },
    sleep,
    note: (s) => t.notes.push(s),
    ev: (js) => c.ev(js),
    /* open the app fresh: routes answer or cut requests from the first one; init scripts run before the page; boot:
       sample (Dev's sample week, the clock at 10 am), real (the welcome's Look at a sample week: a board of its own,
       saved), empty (Dev's empty board), or none (as it opens); mark: the state begins as the page opens */
    async page(o = {}) {
      if (c) { try { await c.closePage(); } catch (e) { /* gone */ } c.close(); }
      c = await connect(ses.port, { target: await newTab(ses.port), timeout: 90000 });
      await c.viewport(Sz.w, Sz.h, Sz.mobile, Sz.dpr);
      if (Sz.ua) await c.send('Emulation.setUserAgentOverride', { userAgent: Sz.ua });
      for (const [glob, fn] of o.routes || []) await c.route(glob, fn);
      for (const src of o.init || []) await c.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
      /* (the probe watches from before the app's first line, so what a boot says is seen) */
      await c.send('Page.addScriptToEvaluateOnNewDocument', { source: UH });
      if (o.mark) markAt = Date.now();
      await c.nav(ses.url + '?debug' + (o.q ? '&' + o.q : ''), 3200);
      await c.ev(UH); await c.ev(PROBE); await c.ev(PATHS);
      const boot = o.boot || 'sample';
      if (boot === 'none') return;
      /* (a board of its own is the welcome's Look at a sample week, as a person reaches it; it was Look around first
         until Oct 15, which the drag gate's boot still looks for) */
      if (boot === 'real') {
        for (let k = 0; k < 20 && !(await t.has(new RegExp('^(' + MORNING + '|Look around first)$'))); k++) await sleep(200);
        if (!(await t.click(new RegExp('^(' + MORNING + '|Look around first)$')))) throw new Error('the welcome had no ' + MORNING);
        await sleep(1800);
        if (!(await c.ev(`!!(SR.state && !SR.view.preview && Store.savedAt)`))) { await t.edit(`s.settings.uhProbe = 1`); await sleep(1200); }
      } else {
        await c.ev(`(async () => JSON.stringify(await __mx.boot({ at: 600 })))()`);
        if (boot === 'empty') { await c.ev(`(async () => { await SR.devBoard('empty'); return 1; })()`); await sleep(1400); }
        else await sleep(600);
      }
      /* a first look's coach is put away the way a person does (it can come a moment after the board) */
      for (let k = 0, quiet = 0; k < 16 && quiet < 4; k++) { if (await t.click(/^Got it$/)) quiet = 0; else quiet++; await sleep(300); }
    },
    async mark() { markAt = Date.now(); await c.ev('__uh.mark()'); },
    /* a change on the board, the way the app makes one (on this test copy) */
    edit: (body) => c.ev(`(() => { __reset.edit((s) => { ${body}; }); return 1; })()`),
    click: (re, scope = 'button, [role=button], a') => c.ev(`(() => { const re = ${re.toString()}; const b = [...document.querySelectorAll(${J(scope)})].find((e) => e.offsetParent !== null && !e.disabled && re.test((e.getAttribute('aria-label') || e.textContent || '').trim())); if (!b) return null; b.click(); return (b.textContent || '').trim().slice(0, 60); })()`),
    has: (re) => c.ev(`(() => { const re = ${re.toString()}; return !![...document.querySelectorAll('button, [role=button], a')].find((e) => e.offsetParent !== null && re.test((e.textContent || '').trim())); })()`),
    type: (sel, text) => c.ev(`(() => { const i = [...document.querySelectorAll(${J(sel)})].find((e) => e.offsetParent !== null); if (!i) return false; i.focus(); i.value = ${J(text)}; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`),
    todoWithoutSteps: () => c.ev(`(() => { const x = SR.state.tasks.find((t) => !t.done && !(t.steps || []).length); return x ? x.id : ''; })()`),
    offline: (on) => c.offline(on),
    /* the service worker's own requests go without a connection too (it's a target of its own) */
    async workersOffline(on) {
      const list = await (await fetch('http://127.0.0.1:' + ses.port + '/json')).json();
      for (const w of list.filter((x) => x.type === 'service_worker')) {
        try {
          const ws = new WebSocket(w.webSocketDebuggerUrl);
          await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; setTimeout(no, 3000); });
          let i = 0;
          const send = (method, params) => new Promise((ok) => { const id = ++i; ws.addEventListener('message', function f(m) { const d = JSON.parse(m.data); if (d.id === id) { ws.removeEventListener('message', f); ok(d); } }); ws.send(J({ id, method, params })); setTimeout(ok, 3000); });
          await send('Network.enable', {});
          await send('Network.emulateNetworkConditions', { offline: !!on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
          t._workers = (t._workers || []).concat(ws);
        } catch (e) { t.note('could not reach a service worker: ' + String(e && e.message || e)); }
      }
    },
    /* smart breakdowns ready (the server said so) and on for this board */
    async aiOn() {
      for (let k = 0; k < 20; k++) { if (await c.ev(`!!(window.SR_ai && SR_ai.ready())`)) break; await sleep(250); }
      if (!(await c.ev(`!!(window.SR_ai && SR_ai.ready())`))) return false;
      await c.ev(`(async () => { await SR_ai.enable(() => {}, { sheet: false }); return 1; })()`);
      return c.ev(`!!SR_ai.available()`);
    },
    errors: () => (c ? c.errors.map((e) => Object.assign({ phase: e.t < markAt ? 'opening' : 'state' }, e)) : []),
    async close() {
      (t._workers || []).forEach((ws) => { try { ws.close(); } catch (e) { /* gone */ } });
      if (c) { try { await c.closePage(); } catch (e) { /* gone */ } c.close(); c = null; }
    }
  };
  return t;
}

/* == the summary: every state, then what failed, with who answers for it == */
function report() {
  const ran = results.filter((r) => !r.skip && !r.error);
  const failed = results.filter((r) => r.skip || r.error || !r.pass);
  const md = ['# The unhappy gate, ' + new Date().toISOString().slice(0, 16).replace('T', ' '), '',
    results.length + ' states at ' + sizes.map((s) => SIZES[s].label).join(' and ') + ': ' + ran.filter((r) => r.pass).length + ' pass, ' + ran.filter((r) => !r.pass).length + ' fail, ' + results.filter((r) => r.skip || r.error).length + ' couldn’t be staged.', '',
    '| State | ' + sizes.map((s) => SIZES[s].label).join(' | ') + ' | Who answers for it |', '|---|' + sizes.map(() => '---').join('|') + '|---|'];
  const ids = Array.from(new Set(results.map((r) => r.id)));
  for (const id of ids) {
    const rs = results.filter((r) => r.id === id);
    md.push('| ' + rs[0].name + ' | ' + sizes.map((s) => { const r = rs.find((x) => x.size === s); if (!r) return ''; if (r.skip) return 'not staged'; if (r.error) return 'error'; return (r.pass ? 'pass' : '**fail**') + (r.contrast && r.contrast.length ? ', contrast ' + r.contrast.length : ''); }).join(' | ') + ' | ' + rs[0].owner + ' |');
  }
  if (failed.length) {
    md.push('', '## What failed', '');
    for (const r of failed) md.push('- **' + r.name + '** at ' + SIZES[r.size].label + ' (' + r.owner + '): ' + (r.skip ? 'couldn’t be staged: ' + r.skip : r.error ? 'error: ' + r.error : r.why.join('; ')) + (r.shot ? '. Picture: `' + r.shot + '`' : '') + (r.said ? '\n  - It said: “' + r.said.replace(/\s+\|\s+/g, ' / ').slice(0, 300) + '”' : ''));
  }
  const cx = ran.filter((r) => r.contrast && r.contrast.length);
  if (cx.length) {
    md.push('', '## Contrast below WCAG AA in these states (reported beside the four checks)', '');
    for (const r of cx) md.push('- ' + r.name + ' at ' + SIZES[r.size].label + ': ' + r.contrast.slice(0, 4).map((x) => '“' + String(x.text).slice(0, 40) + '” ' + x.ratio + ' of ' + x.need).join('; ') + (r.contrast.length > 4 ? '; and ' + (r.contrast.length - 4) + ' more' : ''));
  }
  const text = md.join('\n');
  writeFileSync(join(dir, 'summary.md'), text);
  writeFileSync(join(dir, 'results.json'), J({ at: new Date().toISOString(), url: ses.url, sizes, results }));
  say('\n' + text);
  const red = failed.length > 0;
  say('\n' + (red ? 'UNHAPPY: RED, ' + failed.length + ' of ' + results.length + ' states' : 'UNHAPPY: GREEN, all ' + results.length + ' states') + ' in ' + Math.round((Date.now() - t0) / 1000) + ' s. Everything is in ' + dir);
  process.exit(red ? 1 : 0);
}
