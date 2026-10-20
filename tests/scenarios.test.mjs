/* Dev's made up boards (board/src/scenarios.js, Settings, Dev): every one builds twice on each of seven days, the same
   board both times whatever weekday it opens, with no NaN or undefined anywhere in it, at the current version, every add
   with a source, every to-do's id its own, and nobody real in it. The two added for big moments (V11-2,
   docs/BIG-MOMENTS.md, Acceptance) say what their lines say: a student with an exam (the bar exam about 18 weeks out,
   around a part time job, nobody else at home) and a caregiver (a parent's appointments, a trip to see family, and a
   deadline). */
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
await import('../board/src/onboard.js');
await import('../board/src/scenarios.js');
const M = globalThis.Model, D = globalThis.Data, O = globalThis.Onboard, S = globalThis.Scenarios;

/* a Sunday to a Saturday, so every weekday opens once */
const DAYS = M.range('2026-10-18', 7);
const build = (id, day) => S.build(id, D, M, day, O);

/* every value in a board, walked: JSON.stringify turns NaN into null and drops undefined, so a regex on it sees neither */
function badValues(x, path, out) {
  if (typeof x === 'number' && !Number.isFinite(x)) out.push(path + ' is ' + x);
  else if (x === undefined) out.push(path + ' is undefined');
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) badValues(v, path + '.' + k, out);
  return out;
}
/* what's on a board, without the ids the model makes up as it places things (a goal's plan, a kind of day) */
const what = (st) => JSON.stringify({
  profile: st.profile, rhythm: st.rhythm, settings: st.settings, palette: st.palette, meetings: st.meetings, dinners: st.dinners, weeks: st.weeks, groups: st.groups,
  presets: (st.presets || []).map((x) => Object.assign({}, x, { id: null })),
  adds: Object.entries(st.dates).map(([d, x]) => [d, (x.adds || []).map((a) => [a.name, a.start, a.dur, a.src && a.src.type])]),
  tasks: st.tasks.map((t) => [t.id, t.name, t.due, t.done, !!t.archived, (t.steps || []).map((s) => s.name)]),
  events: st.events.map((e) => [e.id, e.name, e.kind, e.date, e.end, e.start, e.ready]),
  goals: (st.goals || []).map((g) => [g.id, g.name, g.date, g.parts.map((p) => [p.id, p.name, p.min])])
});

test('every Dev scenario builds twice on each of seven days, the same board both times, sound all through', () => {
  assert.equal(new Set(S.LIST.map((x) => x.id)).size, S.LIST.length, 'every id is its own');
  for (const sc of S.LIST) assert.ok(sc.name && sc.line && sc.group, sc.id + ' says what it is');
  for (const day of DAYS) {
    for (const sc of S.LIST) {
      const a = build(sc.id, day), b = build(sc.id, day);
      assert.ok(a && a.rhythm, sc.id + ' on ' + day + ' builds');
      assert.equal(what(a), what(b), sc.id + ' on ' + day + ' builds the same twice');
      assert.deepEqual(badValues(a, sc.id, []), [], sc.id + ' on ' + day);
      assert.equal(a.v, D.VERSION, sc.id + ' is built at the current version');
      Object.entries(a.dates).forEach(([d, x]) => (x.adds || []).forEach((ad) => assert.ok(ad.src && ad.src.type, sc.id + ' ' + d + ' ' + ad.name + ' has a source')));
      const ids = a.tasks.map((t) => t.id);
      assert.equal(new Set(ids).size, ids.length, sc.id + ' on ' + day + ': to-do ids are their own');
      if (sc.id !== 'sample') assert.ok(!/Russell|Kim|Elijah/.test(what(a)), sc.id + ' has nobody real in it');
    }
  }
});

test('every scenario resolves the weeks around it, and reads back the way a backup does', () => {
  const day = '2026-10-20';
  for (const sc of S.LIST) {
    const st = build(sc.id, day);
    for (let n = -7; n < 14; n++) {
      const date = M.addDays(day, n), w = M.resolveWindow(st, date);
      w.blocks.forEach((b) => assert.ok(Number.isFinite(b.start) && b.dur > 0, sc.id + ' ' + date + ' ' + b.name));
      M.calendarDay(st, date); M.clashes(st, date);
    }
    M.dueSoon(st, day, 21, 600);
    assert.equal(D.migrate(JSON.parse(JSON.stringify(st))).v, D.VERSION, sc.id + ' reads back');
  }
});

test('the student with an exam: the bar exam about 18 weeks out, on track, around a part time job, nobody else at home', () => {
  for (const day of DAYS) {
    const st = build('student', day), g = st.goals[0], own = st.profile;
    assert.equal(st.goals.length, 1);
    assert.equal(g.kind, 'exam');
    assert.equal(M.diffDays(day, g.date), 126, 'about 18 weeks out');
    assert.ok(g.parts.length >= 7 && g.parts.some((p) => p.name === 'Contracts'), 'its subjects');
    assert.ok(M.goalSessions(st, g.id).some((x) => x.date >= day), 'sessions ahead on the board');
    const c = M.countdown(st, { goal: g.id }, day, 600);
    assert.equal(c.shape, 'goal');
    assert.equal(c.stand, 'On track', 'a plan that fits starts on track (' + day + ')');
    assert.ok(c.road.stages.length >= 3, 'its stages across the months');
    assert.deepEqual([own.partner, own.kids.length], ['', 0]);
    /* part time: work on three days, set like a shift */
    const work = Object.entries(st.rhythm.days).filter(([, d]) => d.blocks.some((b) => b.cat === 'work'));
    assert.equal(work.length, 3);
    assert.ok(work.every(([, d]) => d.blocks.find((b) => b.cat === 'work').fixed), 'the job is set, like a shift');
    assert.ok(st.tasks.every((t) => !t.due || t.due >= day), 'nothing overdue the day it opens');
  }
});

test('the caregiver: a parent’s appointments, a trip to see family with a heads-up, and a deadline', () => {
  for (const day of DAYS) {
    const st = build('caregiver', day);
    const appts = st.events.filter((e) => e.kind === 'timed' && /^Dad’s /.test(e.name));
    assert.ok(appts.length >= 3 && appts.some((e) => M.diffDays(day, e.date) < 7), 'his appointments, one this week');
    const trip = st.events.find((e) => e.kind === 'trip'), due = st.events.find((e) => e.deadline);
    assert.ok(trip && due, 'a trip and a deadline');
    assert.deepEqual(M.readyKeys(trip, st), ['travel', 'stay', 'timeoff', 'cover', 'pack', 'unpack', 'groceries', 'headsup'], 'the trip gets ready the way a new one does, with who’s covering his appointment and a heads-up');
    assert.match(M.coverOf(st, trip).what, /^Dad’s appointment( and groceries)?$/, 'his physical therapy falls while she’s away (and his groceries, when the trip has a Saturday)');
    assert.deepEqual(M.readyKeys(due, st), ['papers', 'finish']);
    assert.deepEqual([st.profile.partner, st.profile.kids.length], ['', 0]);
    assert.ok((st.profile.people || []).some((p) => p.group === 'family' && !p.home), 'her dad, who doesn’t live with her');
    /* the heads-up's time to ask has come, in the morning question's words */
    const m = M.momentFor(st, day, 600, { kind: true, dinnerNo: true }, null, { big: true });
    assert.equal(m && m.kind, 'headsup', day);
    assert.equal(m.words, 'Lena would love some notice about Denver. Text Lena this week?');
    assert.ok(st.tasks.every((t) => !t.due || t.due >= day), 'nothing overdue the day it opens');
  }
});
