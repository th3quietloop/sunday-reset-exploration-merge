/* Boards for seeing how Sunday Reset looks and feels in states a real week rarely shows all at once
   (Settings, Dev). Each is built fresh around today from Data.buildState, opens as a preview, and is
   never saved. Nobody's real week is in them. The same id builds the same board on the same day: the
   random parts come from a seed, not from Math.random. No DOM: node loads it through module.exports,
   the browser as window.Scenarios. */
(function (root) {
  'use strict';

  /* Names lead with the word that tells them apart. zoom and back: where a board opens (the Time on the
     board ones open on the year behind today, where their history is). heavy: a build long enough to
     say it's making the board first. */
  const LIST = [
    { id: 'firstrun', group: 'First visit', name: 'Brand new', line: 'Someone opening it for the first time: the welcome, then the setup or the sample week.' },
    { id: 'sample', group: 'Weeks', name: 'Sample family', line: 'What someone new sees behind the welcome.' },
    { id: 'batchcook', group: 'Weeks', name: 'Batch cook week', line: 'Two batch cooks with leftovers on lunches, a Meal prep block, three things in the cart, milk on the list, and vegetarian.' },
    { id: 'busy', group: 'People', name: 'Busy person', line: 'Long work days, an early workout, errands in every gap, and a pile of to dos.' },
    { id: 'creative', group: 'People', name: 'Creative person', line: 'Three short work days and the rest given to studio time, sketching, and reading.' },
    { id: 'student', group: 'People', name: 'Student with an exam', line: 'Noor takes the bar exam in about 18 weeks, around a part time job three days a week. On her own, no kids.' },
    { id: 'caregiver', group: 'People', name: 'Caregiver for a parent', line: 'Grace looks after her dad across town: his appointments, a trip to see her sister, and his insurance renewal coming due.' },
    { id: 'light', group: 'Weeks', name: 'Light week', line: 'One person, four short work days, and lots of open time.' },
    { id: 'heavy', group: 'Weeks', name: 'Heavy week', line: 'Long work days, three kids on two schedules, soccer twice a week, meetings, 18 to dos, and overlaps.' },
    { id: 'full', group: 'Weeks', name: 'Fully scheduled', line: 'Every open minute has a block, every dinner is decided, every to do has a time.', heavy: true },
    { id: 'late', group: 'Weeks', name: 'Late shifts', line: 'Work 3 to 11:30 pm, up at 10 am, bed at 2 am. The board runs from 9 am to 3 am.' },
    { id: 'early', group: 'Weeks', name: 'Early riser', line: 'Up at 4 am, work 5 am to 1:30 pm, bed at 8:30 pm. The board starts at 3 am.' },
    { id: 'alternate', group: 'Weeks', name: 'Weeks that alternate', line: 'Taylor has Jamie every other week.' },
    { id: 'skipped', group: 'Time on the board', name: 'Resets with a Sunday skipped', line: 'Four Sundays: three resets, keep and change notes on two of them, then a Sunday missed. Look back finds the notes; the meal board can bring a week back.' },
    { id: 'weeks2', group: 'Time on the board', name: 'Two weeks in', line: 'Two weeks behind today, the same way as six months: a first few resets and dinners.', back: 14 },
    { id: 'months3', group: 'Time on the board', name: 'Three months in', line: '13 weeks behind today, the same way. Opens on the year around them.', zoom: 'year', back: 91 },
    { id: 'months6', group: 'Time on the board', name: 'Six months in', line: '26 weeks behind today: resets, dinners, done to dos, two saved kinds of day, and two blocks of their own. Opens on the year around them.', zoom: 'year', back: 182, heavy: true },
    { id: 'year1', group: 'Time on the board', name: 'One year in', line: '52 weeks behind today, the same way. Opens on the last 12 months.', zoom: 'year', back: 365, heavy: true },
    { id: 'year2', group: 'Time on the board', name: 'Two years in', line: '104 weeks behind today, the same way. The heaviest board; opens on the last 12 months.', zoom: 'year', back: 365, heavy: true },
    { id: 'empty', group: 'Edge cases', name: 'Empty board', line: 'No name, no routines, no to dos, and dinners and time together off.' },
    { id: 'long', group: 'Edge cases', name: 'Long names', line: 'People, blocks, to dos, groups, events, and dinners with names that run long.' },
    { id: 'overlaps', group: 'Edge cases', name: 'Overlaps everywhere', line: 'Meetings, pick ups, and events asking for the same time all week.' },
    { id: 'overdue', group: 'Edge cases', name: '30 overdue to dos', line: 'All past due, some with steps whose time went by.' },
    { id: 'kids5', group: 'Edge cases', name: 'Five kids', line: 'Five kids on four schedules: three drop offs and three pick ups a day.' },
    { id: 'bare', group: 'Edge cases', name: 'Dinners and time together off', line: 'One person, no work hours, and the board helps with neither.' },
    { id: 'calendar', group: 'Edge cases', name: 'Big calendar', line: 'Hundreds of events from two calendars over the next three months.' }
  ];

  /* a small seeded random, so a scenario is the same every time it's opened on a day */
  function seeded(text) {
    let h = 2166136261;
    for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* O is Onboard, for the visible hours a week needs (one rule, the setup's own) */
  function build(id, D, M, today, O) {
    const rnd = seeded(id + today);
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    const ws = M.weekStart(today), at = (n) => M.addDays(ws, n);
    const answers = (o) => Object.assign({ name: 'Alex', partner: '', kids: [], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020, hours: {} }, cares: [], help: { dinners: true, together: true } }, o);
    const base = (o) => D.buildState(answers(o), today);
    const pal = (st, pid) => st.palette.find((p) => p.id === pid);
    let seq = 0;
    const uid = (p) => p + id + (++seq).toString(36);
    const task = (o) => {
      const tid = o.id || uid('t');
      const steps = (o.steps || []).map((s, i) => ({ id: tid + '-s' + (i + 1), name: s[0], dur: s[1], done: !!s[2] }));
      return Object.assign({ name: '', group: 'inbox', icon: 'check', cat: 'yours', due: null, dur: null, repeat: null, done: false }, o, { id: tid, steps });
    };
    const place = (st, date, pid, start, over) => {
      const p = pal(st, pid);
      if (!p) return null;
      const r = M.placeAdd(st, date, Object.assign({ name: p.name, cat: p.cat, icon: p.icon, dur: p.dur, src: { type: 'block', id: p.id } }, over || {}), start);
      return r && r.ok ? r : null;
    };
    const placeTask = (st, date, t, start) => M.placeAdd(st, date, { name: t.name, cat: t.cat, icon: t.icon, dur: t.dur || 30, src: { type: 'task', id: t.id } }, start);
    /* every open stretch of a day gets a block, until no stretch of 15 minutes is left */
    const fillDay = (st, date, ids) => {
      for (let k = 0; k < 40; k++) {
        const g = M.gaps(M.resolveWindow(st, date)).find((x) => x[1] - x[0] >= 15);
        if (!g) return;
        const p = pal(st, pick(ids)), room = g[1] - g[0];
        const len = Math.max(15, Math.min(p.dur, room) - (Math.min(p.dur, room) % 15));
        if (!place(st, date, p.id, g[0], { dur: len })) return;
      }
    };
    const dinner = (st, cooks) => {
      const r = rnd();
      if (r < 0.62) { const rc = pick(st.recipes); return { name: rc.name, recipe: rc.id, cook: pick(cooks), items: rc.items.slice() }; }
      if (r < 0.75) return { name: pick(['Thai place on Pacific', 'Pizza night', 'Sushi from Kaito']), recipe: null, cook: 'order', items: [] };
      if (r < 0.85) return { name: '', recipe: null, cook: 'leftovers', items: [] };
      if (r < 0.93) return { name: pick(['Burger spot', 'Grandma’s', 'Taco truck']), recipe: null, cook: 'out', items: [] };
      return { name: '', recipe: null, cook: 'skip', items: [] };
    };
    const dinners = (st, from, n, cooks, chance) => {
      for (let d = 0; d < n; d++) { const date = M.addDays(from, d); if (rnd() < chance) st.dinners[date] = dinner(st, cooks); }
    };
    /* the visible hours a week needs, by the setup's own rule (without Onboard the board keeps its usual hours) */
    const widen = (st, wake, bed) => { if (O) st.settings.hours = O.hoursFor({ wake: { wd: wake, we: wake }, bed: { wd: bed, we: bed } }); };
    const ME = ['me', 'kim'];

    if (id === 'sample') return D.sampleState(today);

    /* the rituals walk: a family that eats vegetarian and batch cooks: the week's prep plan put on (two batch cooks, the
       lunches they cover, fresh nights, and the Meal prep block), three things already in the cart, and milk */
    if (id === 'batchcook') {
      const st = D.sampleState(today);
      const has = (ids) => ids.filter((x) => st.pantry.some((y) => y.id === x));
      st.recipes = [
        { id: 'bean-chili', name: 'Bean chili', items: has(['beans', 'peppers', 'onion']), dur: 45 },
        { id: 'veg-curry', name: 'Sweet potato curry', items: has(['sweetpotato', 'spinach', 'onion', 'rice']), dur: 40 },
        { id: 'veg-stirfry', name: 'Veggie stir fry', items: has(['broccoli', 'peppers', 'rice']), dur: 25 },
        { id: 'pasta-bake', name: 'Pasta bake', items: has(['pasta', 'spinach', 'onion']), dur: 45 },
        { id: 'quinoa-bowls', name: 'Quinoa bowls', items: has(['quinoa', 'beans', 'peppers', 'spinach']), dur: 30 },
        { id: 'egg-tacos', name: 'Egg tacos', items: has(['eggs', 'tortillas', 'peppers']), dur: 20 }
      ];
      st.mealbook = { own: [], hide: [], diet: 'vegetarian', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'], words: [] };
      M.range(ws, 7).forEach((d) => { delete st.dinners[d]; if (st.meals) delete st.meals[d]; });
      const plan = M.prepPlan(st, ws, { today }, D);
      M.applyPrepPlan(st, plan, { block: true });
      /* (the Meal prep block takes a seeded id, so the same day builds the same board) */
      M.range(ws, 7).forEach((d) => ((st.dates[d] && st.dates[d].adds) || []).forEach((a) => { if (a.src && a.src.type === 'prep') a.id = uid('a'); }));
      const g = M.groceryProgress(st, M.range(ws, 7));
      st.shopping = Object.assign({}, st.shopping, { [ws]: g.list.slice(0, 3).reduce((o, x) => Object.assign(o, { [x.id]: 1 }), { extra: [{ id: 'gmilk', name: 'Milk' }] }) });
      return st;
    }

    /* the rituals walk: four Sundays, three resets and one skipped. The two before last say what to keep and what to
       change, so Look back's notes come from before the Sunday that was missed; the weeks hold meals to bring back */
    if (id === 'skipped') {
      const st = base({ name: 'Jordan', partner: 'Riley', kids: ['Avery'], cares: [{ kids: ['Avery'], days: [1, 2, 3, 4, 5], drop: 495, pick: 1005 }] });
      st.created = M.addDays(ws, -35);
      const four = M.addDays(ws, -28), three = M.addDays(ws, -21), two = M.addDays(ws, -14), last = M.addDays(ws, -7);
      st.weeks[four] = { reset: { step: D.STEPS.length - 1, done: true } };
      st.weeks[three] = { reset: { step: D.STEPS.length - 1, done: true, keep: 'Pizza Friday with Avery', change: 'Less screen time after dinner', saidOn: three } };
      st.weeks[two] = { reset: { step: D.STEPS.length - 1, done: true, keep: 'Date night on Friday', change: 'Less takeout midweek', saidOn: two } };
      const R = st.recipes;
      st.meals = st.meals || {};
      for (let d = 0; d < 7; d++) {
        st.dinners[M.addDays(three, d)] = { name: R[d % R.length].name, recipe: R[d % R.length].id, cook: d % 2 ? 'kim' : 'me', items: R[d % R.length].items.slice() };
        /* (a sandwich keeps no how at all, as a saved board would: never one that's undefined) */
        if (d > 0) st.meals[M.addDays(three, d)] = { lunch: d % 2 ? { name: 'Turkey sandwiches' } : { name: 'Leftovers', how: 'leftovers' } };
        if (d < 5) st.dinners[M.addDays(two, d)] = { name: R[(d + 3) % R.length].name, recipe: R[(d + 3) % R.length].id, cook: d % 2 ? 'me' : 'kim', items: R[(d + 3) % R.length].items.slice() };
      }
      st.dinners[M.addDays(last, 2)] = { name: 'Pizza place', recipe: null, cook: 'order', items: [] };
      return st;
    }
    /* brand new: the sample week with no name yet, for the first visit (the setup asks the name) */
    if (id === 'firstrun') { const st = D.sampleState(today); st.profile = Object.assign({}, st.profile, { name: '' }); return st; }

    if (id === 'busy') {
      const st = base({ name: 'Dana', wake: { wd: 330, we: 420 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 480, end: 1110, hours: {} } });
      widen(st, 330, 1350);
      st.tasks = ['Expense report', 'Book flights for the offsite', 'Dentist for the kids', 'Fix the gutter', 'Renew passport', 'Call the insurance', 'Plan the team dinner', 'Return the rug']
        .map((n, i) => task({ name: n, due: M.addDays(today, 1 + (i % 6)), dur: 30, icon: 'check' }));
      for (let d = 0; d < 7; d++) { if (d > 0 && d < 6) place(st, at(d), 'workout', 345); fillDay(st, at(d), ['groceries', 'cookahead', 'deep', 'walk']); }
      dinners(st, at(0), 7, ['me'], 0.5);
      return st;
    }

    if (id === 'creative') {
      const st = base({ name: 'Rio', work: { days: [1, 3, 5], start: 600, end: 900, hours: {} } });
      const studio = { id: uid('b'), name: 'Studio time', cat: 'yours', dur: 150, icon: 'brush' };
      const sketch = { id: uid('b'), name: 'Sketchbook', cat: 'yours', dur: 45, icon: 'note' };
      st.palette.push(studio, sketch);
      for (let d = 0; d < 7; d++) {
        place(st, at(d), sketch.id, 480);
        if (d === 0 || d === 2 || d === 4 || d === 6) place(st, at(d), studio.id, d % 2 ? 960 : 600);
        else place(st, at(d), 'reading', 1200);
        if (d === 6) place(st, at(d), 'creative', 840);
      }
      st.tasks = [task({ name: 'Frame the prints for the show', due: M.addDays(today, 9), icon: 'brush', steps: [['Pick the six', 30], ['Order frames', 15], ['Hang a test wall', 60]] }), task({ name: 'Send the grant application', due: M.addDays(today, 4), dur: 90 })];
      dinners(st, at(0), 7, ['me'], 0.6);
      return st;
    }

    if (id === 'light') {
      const st = base({ name: 'Sam', work: { days: [1, 2, 3, 4], start: 600, end: 960, hours: {} } });
      /* due dates count from today, so nothing in a light week is ever overdue whatever day it opens */
      st.tasks = [task({ name: 'Return library books', due: M.addDays(today, 5), icon: 'book' }), task({ name: 'Call the landlord', due: M.addDays(today, 3), icon: 'handset', dur: 15 })];
      place(st, at(2), 'walk', 450);
      place(st, at(6), 'walk', 540);
      dinners(st, at(0), 7, ['me'], 0.3);
      return st;
    }

    if (id === 'heavy' || id === 'overlaps') {
      const st = base({ name: 'Morgan', partner: 'Casey', kids: ['Robin', 'Kai', 'Mila'], wake: { wd: 360, we: 420 }, bed: { wd: 1350, we: 1410 }, work: { days: [1, 2, 3, 4, 5], start: 510, end: 1050, hours: {} },
        cares: [{ kids: ['Robin', 'Kai'], days: [1, 2, 3, 4, 5], drop: 465, pick: 930 }, { kids: ['Mila'], days: [1, 2, 3, 4, 5], drop: 480, pick: 1050 }] });
      st.groups.push({ id: 'work', name: 'Work', icon: 'laptop' }, { id: 'school', name: 'School', icon: 'book' });
      st.meetings = [
        { id: uid('m'), name: 'Standup', days: [1, 2, 3, 4, 5], start: 540, dur: 15 },
        { id: uid('m'), name: 'One on one', days: [2], start: 780, dur: 30 },
        { id: uid('m'), name: 'Planning', days: [4], start: 840, dur: 60 }
      ];
      const ev = (name, day, start, dur, cat, icon) => ({ id: uid('e'), kind: 'timed', name, cat: cat || 'family', icon: icon || 'star', date: at(day), start, dur, big: false });
      st.events = [
        ev('Soccer practice', 2, 1050, 60, 'family', 'runner'), ev('Soccer practice', 4, 1050, 60, 'family', 'runner'),
        ev('Dentist, Kai', 3, 915, 45, 'family', 'tooth'), ev('Parent teacher conference', 4, 960, 30, 'family', 'people'),
        ev('Dinner with the Parks', 5, 1140, 120, 'us', 'heart'),
        { id: uid('e'), kind: 'marker', name: 'Mila’s birthday', icon: 'cake', date: at(6), yearly: true },
        { id: uid('e'), kind: 'trip', name: 'Lake weekend', icon: 'plane', date: at(26), end: at(28), leave: 540, back: 1020 }
      ];
      if (id === 'overlaps') {
        /* every weekday something lands on a pick up or a meeting */
        [1, 2, 3, 4, 5].forEach((d) => st.events.push(ev('Client call', d, 915, 45, 'work', 'handset'), ev('Vendor review', d, 535, 30, 'work', 'laptop')));
        st.events.push(ev('Offsite', 3, 780, 240, 'work', 'people'), ev('School play', 4, 1020, 90, 'family', 'star'), ev('Recital', 4, 1035, 60, 'family', 'note'));
        st.meetings.push({ id: uid('m'), name: 'All hands', days: [1, 3, 5], start: 925, dur: 60 });
        return st;
      }
      const names = [
        ['Renew Kai’s passport', 'home', -3, [['Find the forms', 15], ['Photos at the pharmacy', 30], ['Mail it', 15]]],
        ['Pay the water bill', 'bills', -1, []], ['Sign the field trip form', 'school', 0, []], ['Order Mila’s birthday cake', 'people', 1, [['Pick a bakery', 15], ['Order it', 15]]],
        ['Quarterly report', 'work', 2, [['Pull the numbers', 60, true], ['Write it up', 90], ['Send it', 15]]], ['Book the car service', 'home', 2, []],
        ['RSVP to the Parks', 'people', 3, []], ['Schedule Robin’s checkup', 'family', 3, []], ['Replace the smoke alarm batteries', 'home', 4, []],
        ['Science fair poster', 'school', 4, [['Buy the board', 30], ['Print the photos', 20], ['Put it together', 60]]], ['Review the budget', 'bills', 5, []],
        ['Plan the lake weekend', 'people', 8, [['Book the cabin', 20], ['Pack list', 20]]], ['Clean out the garage', 'home', 9, []], ['Team offsite agenda', 'work', 9, []],
        ['Renew the car registration', 'home', 10, []], ['Donate the old clothes', 'home', 11, []], ['Thank you cards', 'people', 12, []], ['Tax documents', 'bills', 13, []]
      ];
      st.tasks = names.map(([name, group, due, steps]) => task({ name, group: group === 'family' ? 'people' : group, due: M.addDays(today, due), steps, dur: steps.length ? null : 30 }));
      place(st, at(1), 'workout', 1290); place(st, at(3), 'workout', 1290); place(st, at(6), 'groceries', 600); place(st, at(6), 'errand', 840); place(st, at(0), 'cookahead', 900);
      place(st, at(2), 'deep', 600, { dur: 120 }); place(st, at(4), 'deep', 600, { dur: 90 });
      const report = st.tasks.find((t) => t.name === 'Quarterly report');
      M.placeAdd(st, at(1), { name: 'Pull the numbers', cat: 'work', icon: 'laptop', dur: 60, src: { type: 'step', task: report.id, id: report.steps[0].id } }, 600);
      dinners(st, at(0), 3, ME, 1);
      st.dinners[at(4)] = { name: '', recipe: null, cook: 'leftovers', items: [] };
      st.dinners[at(5)] = { name: 'Pizza night', recipe: null, cook: 'order', items: [] };
      return st;
    }

    if (id === 'full') {
      const st = base({ name: 'Sam', partner: 'Jo', work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020, hours: {} } });
      /* each to do has a time on a day after today and on or before it's due, so all of them stay planned */
      st.tasks = [task({ name: 'Dentist appointment', due: M.addDays(today, 3), dur: 60, icon: 'tooth' }), task({ name: 'Fix the bike', due: M.addDays(today, 4), dur: 90, icon: 'wrench' }), task({ name: 'Call Grandma', due: M.addDays(today, 5), dur: 30, icon: 'handset', cat: 'family' })];
      st.tasks.forEach((t, k) => { for (let d = 1 + k; d <= 3 + k; d++) { const date = M.addDays(today, d), s = M.firstFit(st, date, t.dur, 420); if (s != null && placeTask(st, date, t, s).ok) break; } });
      const own = ['workout', 'reading', 'creative', 'walk', 'call-loved', 'clean', 'stretch', 'texts', 'project', 'laundry'];
      for (let d = 0; d < 14; d++) fillDay(st, at(d), own);
      for (let d = 14; d < 21; d++) fillDay(st, at(d), own);
      dinners(st, at(0), 21, ME, 1);
      return st;
    }

    if (id === 'late') {
      const st = base({ name: 'Riley', wake: { wd: 600, we: 600 }, bed: { wd: 1560, we: 1590 }, work: { days: [1, 2, 3, 4, 5], start: 900, end: 1410, hours: {}, fixed: true } });
      widen(st, 600, 1590);
      place(st, at(2), 'workout', 690); place(st, at(4), 'groceries', 720);
      st.tasks = [task({ name: 'Swap shifts with Dana', due: M.addDays(today, 3), icon: 'chat' })];
      return st;
    }

    if (id === 'early') {
      const st = base({ name: 'Pat', wake: { wd: 240, we: 360 }, bed: { wd: 1230, we: 1320 }, work: { days: [1, 2, 3, 4, 5], start: 300, end: 810, hours: {} } });
      widen(st, 240, 1320);
      place(st, at(1), 'nap', 900); place(st, at(3), 'walk', 870);
      return st;
    }

    if (id === 'alternate') {
      /* the usual week has no kid in it at all; Jamie comes with the other week */
      const st = base({ name: 'Taylor' });
      st.profile.kids = ['Jamie'];
      const week = D.buildState(answers({ name: 'Taylor', kids: ['Jamie'], cares: [{ kids: ['Jamie'], days: [1, 2, 3, 4, 5], drop: 480, pick: 990 }] }), today);
      st.rhythm.shapes = { kids: { name: 'Week with Jamie', days: week.rhythm.days } };
      st.rhythm.alternate = { shape: 'kids', from: ws };
      return st;
    }

    if (id === 'weeks2' || id === 'months3' || id === 'months6' || id === 'year1' || id === 'year2') {
      const weeks = id === 'weeks2' ? 2 : id === 'months3' ? 13 : id === 'months6' ? 26 : id === 'year1' ? 52 : 104;
      const st = base({ name: 'Jordan', partner: 'Riley', kids: ['Avery'], cares: [{ kids: ['Avery'], days: [1, 2, 3, 4, 5], drop: 495, pick: 1005 }] });
      st.groups.push({ id: 'work', name: 'Work', icon: 'laptop' }, { id: 'school', name: 'School', icon: 'book' });
      const guitar = { id: uid('b'), name: 'Guitar practice', cat: 'yours', dur: 45, icon: 'note' };
      const pottery = { id: uid('b'), name: 'Pottery class', cat: 'yours', dur: 120, icon: 'brush' };
      st.palette.push(guitar, pottery);
      st.recipes.push(
        { id: uid('r'), name: 'Lemon pasta', items: ['spaghetti', 'parmesan'].filter((x) => st.pantry.some((p) => p.id === x)), dur: 25 },
        { id: uid('r'), name: 'Turkey meatballs', items: ['turkey', 'spaghetti'].filter((x) => st.pantry.some((p) => p.id === x)), dur: 40 },
        { id: uid('r'), name: 'Chicken curry', items: ['chicken', 'rice'].filter((x) => st.pantry.some((p) => p.id === x)), dur: 45 }
      );
      const own = ['workout', 'walk', 'reading', 'creative', 'deep', 'groceries', 'cookahead', guitar.id, pottery.id];
      const done = ['Pay the water bill', 'Book a haircut', 'Return the package', 'Schedule the plumber', 'Order printer ink', 'Sign Avery up for swim', 'Car oil change', 'Renew the gym', 'Call the bank', 'Send the invoice', 'Back up the laptop', 'Buy a gift for Sam', 'Fix the gate', 'Pick up the dry cleaning'];
      const groups = ['inbox', 'home', 'bills', 'people', 'work', 'school'];
      for (let w = weeks; w >= 1; w--) {
        const wk = M.addDays(ws, -7 * w);
        /* a past reset is kept the way finishReset keeps one */
        if (rnd() < 0.86) st.weeks[wk] = { reset: { step: D.STEPS.length - 1, done: true } };
        for (let d = 0; d < 7; d++) {
          const date = M.addDays(wk, d);
          if (rnd() < 0.8) st.dinners[date] = dinner(st, ME);
          /* a block in an open stretch of the day; reading the day's gaps is quicker than asking firstFit, which matters over two years */
          if (rnd() < 0.6) { const g = M.gaps(M.resolveWindow(st, date)).filter((x) => x[1] - x[0] >= 45); if (g.length) place(st, date, pick(own), pick(g)[0]); }
        }
        for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) st.tasks.push(task({ name: pick(done), group: pick(groups), due: M.addDays(wk, Math.floor(rnd() * 7)), done: true, archived: w > 6 && rnd() < 0.75 }));
      }
      /* this week and ahead, and the things that repeat */
      st.tasks.push(
        task({ name: 'Laundry', group: 'home', due: at(6), repeat: 'weekly', steps: [['Wash', 15], ['Fold and put away', 30]], icon: 'shirt' }),
        task({ name: 'Pay the bills', group: 'bills', due: M.addDays(today, 6), repeat: 'monthly', icon: 'receipt' }),
        task({ name: 'Plan Avery’s party', group: 'people', due: M.addDays(today, 12), steps: [['Guest list', 20], ['Book the place', 30], ['Invites', 30]] }),
        task({ name: 'Annual review notes', group: 'work', due: M.addDays(today, 4), dur: 60 }),
        task({ name: 'School pictures form', group: 'school', due: M.addDays(today, 2), dur: 15 })
      );
      dinners(st, at(0), 5, ME, 0.8);
      place(st, at(2), guitar.id, 1170); place(st, at(6), pottery.id, 600);
      const kindDay = M.addDays(ws, -14);
      place(st, kindDay, 'workout', 420); place(st, kindDay, 'creative', 600, { dur: 120 }); place(st, kindDay, 'reading', 900);
      st.presets.push(M.presetFromDay(st, kindDay, 'Saturday at home'));
      st.presets.push(Object.assign(M.presetFromDay(st, kindDay, 'Clear for the kids'), { clear: true }));
      st.events.push(
        { id: uid('e'), kind: 'marker', name: 'Riley’s birthday', icon: 'cake', date: M.addDays(today, 40), yearly: true },
        { id: uid('e'), kind: 'marker', name: 'Avery’s birthday', icon: 'cake', date: M.addDays(today, -90), yearly: true },
        { id: uid('e'), kind: 'marker', name: 'Anniversary', icon: 'heart', date: M.addDays(today, 150), yearly: true },
        { id: uid('e'), kind: 'trip', name: 'Visit the coast', icon: 'plane', date: M.addDays(today, -60), end: M.addDays(today, -57), leave: 540, back: 1020 },
        { id: uid('e'), kind: 'trip', name: 'Spring break', icon: 'plane', date: M.addDays(today, 70), end: M.addDays(today, 74), leave: 480, back: 1080 }
      );
      return st;
    }

    if (id === 'empty') {
      const st = base({ name: '', work: null, help: { dinners: false, together: false } });
      Object.values(st.rhythm.days).forEach((d) => { d.blocks = []; });
      return st;
    }

    if (id === 'long') {
      const st = base({ name: 'Christopher Alexander', partner: 'Maximiliana Josephine', kids: ['Bartholomew Theodore'], cares: [{ kids: ['Bartholomew Theodore'], days: [1, 2, 3, 4, 5], drop: 495, pick: 1005 }] });
      st.groups.push({ id: 'longgroup', name: 'Home maintenance, repairs, and everything else around the house', icon: 'house' });
      st.palette.push({ id: uid('b'), name: 'Quarterly business review preparation with the regional team', cat: 'work', dur: 90, icon: 'laptop' });
      st.recipes.push({ id: uid('r'), name: 'Slow cooker chicken tortilla soup with roasted poblano peppers', items: [], dur: 30 });
      st.tasks = [
        task({ name: 'Call the insurance company about the windshield claim from the hailstorm in March', group: 'longgroup', due: at(3), steps: [['Find the claim number in the email from the adjuster', 15], ['Call and ask about the rental car reimbursement', 30]] }),
        task({ name: 'Research summer camps for Bartholomew that run past three in the afternoon', group: 'people', due: at(5), dur: 45 })
      ];
      st.events.push({ id: uid('e'), kind: 'marker', name: 'Grandma Eleanor’s ninetieth birthday celebration at the lake house', icon: 'cake', date: at(6) });
      place(st, at(2), st.palette[st.palette.length - 1].id, 600);
      st.dinners[at(1)] = { name: st.recipes[st.recipes.length - 1].name, recipe: st.recipes[st.recipes.length - 1].id, cook: 'kim', items: [] };
      return st;
    }

    if (id === 'overdue') {
      const st = base({ name: 'Drew' });
      /* thirty real chores, none twice, so the pile reads like a pile and not like a test */
      const chores = ['Return the library books', 'Renew the passport', 'Pay the water bill', 'Fix the bike tire', 'Order printer ink', 'Call the plumber about the sink', 'Cancel the old phone plan', 'Schedule a dentist cleaning',
        'Email the landlord about the lease', 'Pick up the dry cleaning', 'Book the car service', 'Send the thank you notes', 'Renew the car registration', 'Sign up for the flu shot', 'Return the shoes',
        'File the receipts', 'Replace the air filter', 'Call the bank about the card', 'Update the emergency contacts', 'Buy a birthday gift for Mom', 'Clean out the fridge', 'Back up the phone',
        'Donate the old coats', 'Fix the squeaky door', 'Pay the parking ticket', 'Order new contacts', 'Mail the rebate form', 'Book a haircut', 'Recycle the old batteries', 'Check the tire pressure'];
      for (let k = 0; k < 30; k++) {
        const due = M.addDays(today, -1 - Math.floor(rnd() * 40));
        const steps = rnd() < 0.3 ? [['Look it up', 15], ['Do it', 30]] : [];
        const t = task({ name: chores[k], group: pick(['inbox', 'home', 'bills', 'people']), due, steps, dur: steps.length ? null : 30 });
        st.tasks.push(t);
        /* a step given a time that went by without being done */
        if (steps.length) M.placeAdd(st, M.addDays(due, -1), { name: steps[0][0], cat: 'yours', icon: 'check', dur: 15, src: { type: 'step', task: t.id, id: t.steps[0].id } }, 1200);
      }
      return st;
    }

    if (id === 'kids5') {
      const kids = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli'];
      return base({ name: 'Sky', partner: 'Rowan', kids, wake: { wd: 360, we: 420 },
        cares: [{ kids: ['Ada'], days: [1, 2, 3, 4, 5], drop: 450, pick: 900 }, { kids: ['Ben', 'Cleo'], days: [1, 2, 3, 4, 5], drop: 480, pick: 930 }, { kids: ['Dev'], days: [1, 3, 5], drop: 525, pick: 960 }, { kids: ['Eli'], days: [2, 4], drop: 510, pick: 1005 }] });
    }

    if (id === 'bare') return base({ name: 'Quinn', work: null, help: { dinners: false, together: false } });

    /* V11-2 (big moments): a student with an exam. Noor takes the bar exam about 18 weeks from today, planned two
       weeks at a time around a part time job that's set, like a shift (Monday, Wednesday, and Thursday mornings); she
       lives on her own, with no kids. Ids are seeded, so the same day builds the same board */
    if (id === 'student') {
      const st = base({ name: 'Noor', wake: { wd: 420, we: 480 }, bed: { wd: 1380, we: 1410 }, work: { days: [1, 3, 4], start: 540, end: 780, hours: {}, fixed: true } });
      const ex = M.goalForExam('Pass the bar exam', D);
      const g = M.newGoal({ id: uid('g'), name: 'Pass the bar exam', kind: 'exam', date: M.addDays(today, 126), today, mix: ex.mix,
        parts: ex.parts.map((p) => Object.assign({ id: uid('gp') }, p)), rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 180, we: 300, when: 'any', chunk: 90 } });
      st.goals = [g];
      M.planGoal(st, g.id, today, 0, { horizon: 14 });
      st.tasks = [
        task({ name: 'Pay the bar exam fee', due: M.addDays(today, 9), dur: 15, icon: 'receipt', group: 'bills' }),
        task({ name: 'Character and fitness form', due: M.addDays(today, 20), icon: 'note', steps: [['Gather every address since college', 30], ['Fill in the form', 45], ['Send it', 15]] }),
        task({ name: 'Laundry', due: M.addDays(today, 4), dur: 45, icon: 'shirt', group: 'home' })
      ];
      dinners(st, at(0), 7, ['me'], 0.4);
      return st;
    }

    /* V11-2 (big moments): a caregiver. Grace looks after her dad, Walter, who lives on his own across town: she drives
       him to his appointments (one of them while she's away), a trip to see her sister Lena in Denver is five weeks
       off, and his insurance renewal is coming due (a deadline). She works 9 to 3 on weekdays and lives on her own */
    if (id === 'caregiver') {
      const st = base({ name: 'Grace', wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 900, hours: {} } });
      st.profile.people = [{ id: uid('p'), name: 'Walter', group: 'family', home: false }];
      const appt = (name, n, start, dur, icon) => ({ id: uid('e'), kind: 'timed', name, cat: 'family', icon, date: M.addDays(today, n), start, dur, big: false });
      st.events = [
        appt('Dad’s cardiology', 1, 930, 60, 'heart'), appt('Dad’s physical therapy', 3, 960, 45, 'runner'), appt('Dad’s physical therapy', 10, 960, 45, 'runner'), appt('Dad’s eye doctor', 15, 990, 60, 'calendar'), appt('Dad’s physical therapy', 37, 960, 45, 'runner'),
        { id: uid('e'), kind: 'trip', name: 'Denver', icon: 'plane', date: M.addDays(today, 36), end: M.addDays(today, 39), leave: 540, back: 1080 },
        { id: uid('e'), kind: 'marker', name: 'Dad’s insurance renewal', icon: 'note', date: M.addDays(today, 24), deadline: true }
      ];
      st.meetings = [{ id: uid('m'), name: 'Groceries for Dad', days: [6], start: 600, dur: 60 }];
      /* the trip gets ready the way a new one does (travel, a place to stay, time off, who's covering Dad's appointment
         that week, and his groceries when the trip has a Saturday, packing, and after it), with a heads-up for her
         sister, whose time to ask has come */
      const trip = st.events.find((e) => e.kind === 'trip');
      trip.ready = M.readySuggest(trip, st).concat([{ k: 'headsup', who: 'Lena' }]);
      st.tasks = [
        task({ name: 'Refill Dad’s prescriptions', due: M.addDays(today, 2), dur: 15, icon: 'handset', group: 'people' }),
        task({ name: 'Find someone to check on Dad while I’m away', due: M.addDays(today, 21), icon: 'people', group: 'people', steps: [['Ask the neighbors', 15], ['Call his church', 15], ['Write down his routine', 30]] }),
        task({ name: 'Pay Dad’s water bill', due: M.addDays(today, 6), dur: 15, icon: 'receipt', group: 'bills' })
      ];
      dinners(st, at(0), 7, ['me'], 0.5);
      return st;
    }

    if (id === 'calendar') {
      const st = base({ name: 'Avery', kids: ['Sol'], cares: [{ kids: ['Sol'], days: [1, 2, 3, 4, 5], drop: 480, pick: 990 }] });
      st.calendars = [{ id: 'cal-work', name: 'Work calendar', cat: 'work', added: today }, { id: 'cal-school', name: 'Westfield Elementary', cat: 'family', added: today }];
      const titles = ['Design review', 'Sync with Lee', 'Customer call', 'Interview', 'Roadmap', 'Lunch and learn', 'Budget check in', 'Hiring loop'];
      for (let d = -7; d < 90; d++) {
        const date = M.addDays(today, d), wd = M.weekday(date);
        if (wd > 0 && wd < 6) for (let k = 0, n = 3 + Math.floor(rnd() * 3); k < n; k++) st.events.push({ id: uid('e'), kind: 'timed', name: pick(titles), icon: 'calendar', cat: 'work', date, start: 540 + Math.floor(rnd() * 16) * 30, dur: pick([30, 30, 45, 60]), big: false, cal: 'cal-work' });
        if (wd === 3) st.events.push({ id: uid('e'), kind: 'timed', name: 'Early release', icon: 'calendar', cat: 'family', date, start: 780, dur: 30, big: false, cal: 'cal-school' });
        if (d % 17 === 0) st.events.push({ id: uid('e'), kind: 'marker', name: pick(['No school', 'Picture day', 'Field trip', 'Book fair']), icon: 'calendar', date, cal: 'cal-school' });
      }
      return st;
    }
    return null;
  }

  const api = { LIST, build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scenarios = api;
})(typeof window !== 'undefined' ? window : globalThis);
