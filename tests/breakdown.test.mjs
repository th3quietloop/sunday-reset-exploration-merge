// V11 goals: breaking a to-do into small steps (Model.breakdown and the library behind it, Data.BREAKDOWNS),
// and telling a goal from a to-do (Model.looksLikeGoal, Model.goalForExam). docs/PRODUCT-STRATEGY.md:
// every breakdown's first step is 10 minutes or less, and every step has a time.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../board/src/model.js');
await import('../board/src/data.js');
const M = globalThis.Model;
const D = globalThis.Data;

const BANNED = /[–—]|--|\b(just|simply|really|actually|please)\b/i;
const names = (r) => r.steps.map((s) => s.name);
const sum = (list) => list.reduce((a, s) => a + s.dur, 0);
const SAMPLES = ['Clean my room', 'Clean the kitchen', 'Scrub the bathroom', 'Organize the kitchen', 'Kitchen', 'Clean the shed', 'Clean the house',
  'Clear out the garage', 'Book a cleaning for Robin', 'Birthday card for Grandma', 'Something new', 'Read 3 chapters', 'Read 100 pages',
  'Write 5 thank you notes', 'Call 4 people', 'Email the landlord', 'Pack for Virginia', 'Pack the car', 'Study for the bio test', 'Pass the bar exam',
  'Fix the leaky faucet', 'Learn Spanish', 'Make dinner', 'Meal prep for the week', 'Buy toilet paper', 'Renew the car registration', 'Moving',
  'Send the quarterly report', 'Christmas gift for Kim', 'Family gifts', 'Organize the house', 'Clean 3 rooms', 'Do taxes', 'Halloween costumes', 'x', ''];

test('the library is big, and every entry keeps its rules', () => {
  assert.ok(D.BREAKDOWNS.length >= 80, D.BREAKDOWNS.length + ' entries');
  const ids = new Set();
  for (const e of D.BREAKDOWNS) {
    assert.ok(!ids.has(e.id), 'one id each: ' + e.id);
    ids.add(e.id);
    assert.ok(e.words.length, e.id + ' has words');
    for (const w of e.words) assert.match(w, /^~?[a-z0-9 ]+$/, e.id + ': words are lowercase, no apostrophes: ' + w);
    assert.ok(e.steps[0].dur <= 10, e.id + ' starts with 10 minutes or less');
    for (const s of e.steps) {
      assert.ok(s.dur > 0 && s.dur % 5 === 0, e.id + ': ' + s.name + ' is in fives');
      assert.match(s.name, /^[A-Z{]/, e.id + ': sentence case: ' + s.name);
      assert.doesNotMatch(s.name, BANNED, e.id + ': plain words: ' + s.name);
      if (s.sub) {
        assert.equal(sum(s.sub), s.dur, e.id + ': ' + s.name + ' adds up');
        for (const x of s.sub) { assert.ok(x.dur > 0 && x.dur % 5 === 0); assert.doesNotMatch(x.name, BANNED); assert.match(x.name, /^[A-Z{]/); }
      }
    }
  }
  const areas = new Set(D.BREAKDOWNS.map((e) => e.area));
  for (const a of ['home', 'errand', 'money', 'school', 'work', 'travel', 'event', 'health', 'meals', 'car', 'yard', 'digital']) assert.ok(areas.has(a), 'covers ' + a);
  for (const id of ['kitchen', 'bathroom', 'bedroom', 'laundry', 'dishes', 'declutter', 'deep-clean', 'bills', 'taxes', 'budget', 'insurance', 'returns', 'homework', 'report',
    'presentation', 'email', 'job-application', 'pack', 'baby-trip', 'kids-trip', 'birthday', 'party', 'holiday-dinner', 'wedding-guest', 'move', 'doctor', 'routine', 'meal-prep',
    'car-service', 'mow', 'photos', 'gift']) assert.ok(ids.has(id), 'has ' + id);
});

test('the most specific entry wins: clean the kitchen beats clean', () => {
  const room = M.breakdown('Clean my room', {}, D);
  assert.equal(room.source, 'library');
  assert.equal(room.match, 'bedroom');
  assert.deepEqual(room.steps, [{ name: 'Pick up the floor', dur: 10 }, { name: 'Put away laundry', dur: 15 }, { name: 'Make the bed', dur: 5 }, { name: 'Clear the desk', dur: 15 }, { name: 'Dust', dur: 10 }, { name: 'Vacuum', dur: 15 }]);
  assert.equal(room.total, 70, 'about 70 minutes in all, as the strategy says');
  assert.equal(M.breakdown('Clean the kitchen', {}, D).match, 'kitchen');
  assert.equal(M.breakdown('Clear out the garage', {}, D).match, 'garage');
  assert.equal(M.breakdown('Book a cleaning for Robin', {}, D).match, 'dentist', 'a cleaning at the dentist is not housework');
  assert.equal(M.breakdown('Birthday card for Grandma', {}, D).match, 'card');
  assert.equal(M.breakdown('Christmas gift for Kim', {}, D).match, 'gift');
  assert.equal(M.breakdown('Family gifts', {}, D).match, 'holiday-gifts');
  assert.equal(M.breakdown('Pack for Virginia', {}, D).match, 'pack');
  assert.equal(M.breakdown('Clean up the kitchen after the party', {}, D).match, 'kitchen');
});

test('a bare noun counts only when the verb fits it', () => {
  assert.equal(M.breakdown('Kitchen', {}, D).match, 'kitchen', 'no verb: the noun says it');
  assert.equal(M.breakdown('Scrub the bathroom', {}, D).match, 'bathroom', 'scrubbing is cleaning');
  const org = M.breakdown('Organize the kitchen', {}, D);
  assert.equal(org.source, 'rules', 'organizing a kitchen is not cleaning it');
  assert.ok(names(org).some((n) => /corner of the kitchen/.test(n)));
  assert.equal(M.breakdown('Pack the car', {}, D).source, 'rules', 'packing the car is not packing for a trip');
});

test('sizes: small is finer, big has four steps at most, and the minutes stay the same', () => {
  const med = M.breakdown('Clean the house', { size: 'medium' }, D);
  const small = M.breakdown('Clean the house', { size: 'small' }, D);
  const big = M.breakdown('Clean the house', { size: 'big' }, D);
  assert.ok(small.steps.length > med.steps.length);
  assert.ok(names(small).includes('Dishes') && names(small).includes('Mop'), 'sub steps stand in for their step');
  assert.ok(small.steps.every((s) => s.dur <= 20), 'nothing over 20 minutes');
  assert.ok(big.steps.length <= 4 && big.steps.length < med.steps.length);
  assert.equal(big.steps[0].name, med.steps[0].name, 'the starter stays on its own');
  assert.ok(names(big).some((n) => / and /.test(n)), 'steps merge by name');
  assert.equal(small.total, med.total);
  assert.equal(big.total, med.total);
  // clean my room gets finer too
  const room = M.breakdown('Clean my room', { size: 'small' }, D);
  assert.ok(room.steps.length > 6 && room.steps.every((s) => s.dur <= 10));
  // a step over 20 minutes with no finer version is cut in two
  const read = M.breakdown('Read the new book', { size: 'small' }, D);
  assert.ok(names(read).includes('Read for 25 minutes, first half') && names(read).includes('Read for 25 minutes, second half'));
  assert.ok(read.steps.every((s) => s.dur <= 20));
  // a step that can't be cut stays whole (an appointment)
  assert.ok(M.breakdown('Dentist', { size: 'small' }, D).steps.some((s) => s.name === 'Go to the appointment' && s.dur === 60));
  // a short list stays as it is when big
  assert.equal(M.breakdown('Birthday card for Grandma', { size: 'big' }, D).steps.length, 3);
});

test('the first step is always 10 minutes or less', () => {
  for (const n of SAMPLES) for (const size of ['small', 'medium', 'big']) {
    const r = M.breakdown(n, { size }, D);
    assert.ok(r.steps.length >= 1, n);
    assert.ok(r.steps[0].dur <= 10, n + ' (' + size + ') starts small: ' + JSON.stringify(r.steps[0]));
    assert.ok(r.steps.every((s) => s.dur > 0 && s.dur % 5 === 0), n + ' in fives');
    assert.equal(r.total, sum(r.steps));
    for (const s of r.steps) { assert.doesNotMatch(s.name, BANNED, s.name); assert.deepEqual(Object.keys(s).sort(), ['dur', 'name']); }
  }
  // a library whose first step is long gets a 10 minute start split off; a first step that can't be cut gets one before it
  const own = { BREAKDOWNS: [{ id: 'x', area: 'home', words: ['repaint'], steps: [{ name: 'Sand the walls', dur: 40 }, { name: 'Paint', dur: 60 }] }, { id: 'y', area: 'home', words: ['drive'], steps: [{ name: 'Drive there', dur: 30, whole: true }] }], BREAKDOWN_ANY: D.BREAKDOWN_ANY };
  assert.deepEqual(M.breakdown('Repaint', {}, own).steps.slice(0, 2), [{ name: 'Sand the walls, first 10 minutes', dur: 10 }, { name: 'Sand the walls, the rest', dur: 30 }]);
  assert.deepEqual(M.breakdown('Drive', {}, own).steps, [{ name: 'Get what you need for it', dur: 5 }, { name: 'Drive there', dur: 30 }]);
});

test('rules: the verb, the thing, a room, the whole house, and a count', () => {
  const shed = M.breakdown('Clean the shed', {}, D);
  assert.equal(shed.source, 'rules');
  assert.equal(shed.match, 'clean the shed');
  assert.ok(names(shed).some((n) => n.includes('the shed')), 'the thing is in the steps');
  assert.deepEqual(names(M.breakdown('Email the landlord', {}, D)), ['Jot down what to say', 'Write the email to the landlord', 'Read it over and send it']);
  assert.deepEqual(names(M.breakdown('Read 3 chapters', {}, D)).slice(1, 4), ['Read chapter 1', 'Read chapter 2', 'Read chapter 3']);
  const pages = M.breakdown('Read 100 pages', {}, D);
  assert.ok(names(pages).includes('Read pages 1 to 12') && names(pages).includes('Read pages 97 to 100'));
  assert.deepEqual(names(M.breakdown('Call 4 people', {}, D)), ['List who to call and their numbers', 'Call the first 3', 'Call the last one', 'Write down what each one said']);
  assert.deepEqual(names(M.breakdown('Clean 3 rooms', {}, D)).slice(1), ['Clean the first room', 'Clean the second room', 'Clean the third room']);
  const house = names(M.breakdown('Organize the house', {}, D));
  for (const r of ['Organize the kitchen', 'Organize the bathroom', 'Organize the living room', 'Organize the bedrooms']) assert.ok(house.includes(r), 'the house means several rooms: ' + r);
  assert.ok(names(M.breakdown('Tidy the apartment', {}, D)).length >= 3);
  assert.ok(names(M.breakdown('Make dinner', {}, D)).includes('Cook dinner'));
  assert.equal(M.breakdown('Learn Spanish', {}, D).steps[0].name, 'Find one good place to learn Spanish from');
  assert.equal(M.breakdown('Finally fixing the bike', {}, D).match, 'fix the bike', 'words before the verb and its endings are read');
  assert.equal(M.breakdown('Prep for the chem test', {}, D).source, 'library', 'getting ready for a test is studying');
  for (const [n, v] of [['Write the toast', 'write'], ['Study chapter 5', 'study'], ['Fix the gate', 'fix'], ['Plan the reunion', 'plan'], ['Buy a new couch', 'buy'], ['Call the insurance company', 'call'],
    ['Learn to swim', 'learn'], ['Practice piano', 'practice'], ['Cook chili', 'cook'], ['Prep lunches and snacks', 'prep']]) {
    const r = M.breakdown(n, {}, D);
    assert.ok(r.source === 'library' || r.match.startsWith(v), n + ' reads as ' + v + ': ' + r.match);
  }
  const any = M.breakdown('Something new', {}, D);
  assert.equal(any.source, 'rules');
  assert.equal(any.match, null);
  assert.deepEqual(any.steps, D.BREAKDOWN_ANY.map((s) => ({ name: s.name, dur: s.dur })), 'nothing fits: the fallback');
});

test('steps for a partner or a kid leave when there is nobody for them', () => {
  const alone = M.breakdown('Pack for the trip', { kids: 0 }, D), kids = M.breakdown('Pack for the trip', { kids: 1 }, D);
  assert.ok(!names(alone).some((n) => n.includes('{kid}')));
  assert.ok(names(kids).some((n) => n.includes('{kid}')), 'the app names them');
  assert.ok(kids.total > alone.total);
  assert.ok(!names(M.breakdown('Christmas decorations', { partner: false }, D)).some((n) => n.includes('{partner}')));
  assert.ok(names(M.breakdown('Christmas decorations', {}, D)).some((n) => n.includes('{partner}')), 'without a word about people, nothing is left out');
});

test('suggestSteps still gives the medium steps, name and length only', () => {
  assert.deepEqual(M.suggestSteps('Clean my room', D), M.breakdown('Clean my room', { size: 'medium' }, D).steps);
  for (const n of SAMPLES) for (const s of M.suggestSteps(n, D)) assert.deepEqual(Object.keys(s).sort(), ['dur', 'name']);
});

test('what looks like a goal: exams, certifications, races, theses, launches', () => {
  for (const n of ['Pass the bar exam', 'CFA Level I', 'Study for the SAT', 'Take the ACT in June', 'Series 7', 'SIE exam', 'Run a marathon', 'Finish my thesis',
    'Launch the website', 'Driving test', 'Get my PMP certification', 'LSAT in December', 'Citizenship interview', 'Learn Spanish', 'Bio final exam'])
    assert.equal(M.looksLikeGoal(n, D), true, n);
  for (const n of ['Eye exam', 'Blood test', 'Test the smoke alarm', 'Clean the bar cart', 'sat with mom', 'act on the feedback', 'Buy milk', 'Dental exam for Robin', 'Emissions test', '', 'Test drive the new car'])
    assert.equal(M.looksLikeGoal(n, D), false, n);
});

test('goalForExam: an exam’s parts with a common estimate, and a start for anything else', () => {
  const bar = M.goalForExam('Pass the bar exam', D);
  assert.equal(bar.kind, 'exam');
  assert.equal(bar.cat, 'work');
  assert.equal(bar.match, 'bar');
  assert.equal(bar.name, 'Pass the bar exam', 'the goal keeps its own words');
  assert.deepEqual(bar.parts.map((p) => p.name), ['Civil Procedure', 'Constitutional Law', 'Contracts', 'Criminal Law and Procedure', 'Evidence', 'Real Property', 'Torts', 'Essay practice', 'Performance tests']);
  assert.equal(bar.hours, 400);
  assert.match(bar.note, /a common estimate/);
  assert.equal(sum(bar.parts.map((p) => ({ dur: p.min }))), 400 * 60);
  const cfa = M.goalForExam('CFA Level I in August', D);
  assert.equal(cfa.parts.length, 10, 'CFA Level I: its ten topics');
  assert.ok(cfa.parts.some((p) => p.name === 'Ethical and Professional Standards'));
  for (const [n, id] of [['SIE', 'sie'], ['Series 7 exam', 'series7'], ['CPA exam', 'cpa'], ['GRE', 'gre'], ['GMAT', 'gmat'], ['LSAT', 'lsat'], ['MCAT', 'mcat'], ['Study for the SAT', 'sat'], ['ACT', 'act'], ['PMP', 'pmp'], ['Driving test', 'driving'], ['Citizenship test', 'citizenship']])
    assert.equal(M.goalForExam(n, D).match, id, n);
  assert.equal(M.goalForExam('CPA exam', D).parts.length, 4, 'the CPA sections');
  for (const e of D.EXAMS) {
    if (e.hours != null) assert.equal(e.parts.reduce((a, p) => a + p[1], 0), e.hours, e.id + ' parts add up to its hours');
    for (const [nm] of e.parts) assert.doesNotMatch(nm, BANNED);
  }
  const drive = M.goalForExam('Driving test', D);
  assert.equal(drive.hours, null);
  assert.equal(drive.note, '', 'no estimate where there isn’t a common one');
  assert.equal(M.goalForExam('Finish my thesis', D).kind, 'project');
  assert.equal(M.goalForExam('Run a half marathon', D).match, 'race');
  assert.equal(M.goalForExam('Learn guitar', D).kind, 'skill');
  assert.equal(M.goalForExam('Launch the shop', D).match, 'launch');
  const other = M.goalForExam('Something big', D);
  assert.equal(other.kind, 'other');
  assert.ok(other.parts.length >= 3 && other.parts.every((p) => p.min > 0));
  const proj = M.goalForExam('Kitchen renovation project', D);
  assert.deepEqual(proj.parts.map((p) => p.name), ['Plan it', 'Draft it', 'Review it', 'Finish it'], 'a project: plan, draft, review, finish');
});
