/* Sunday Reset's first visit: what someone new is asked, what each answer changes later, the research
   behind what the app does, and the plan read back from the week that was built. Every question here
   changes a later screen; a question that changes nothing doesn't belong. No DOM or Three.js: it loads
   in node through module.exports and in the browser as window.Onboard. docs/ONBOARDING.md says why. */
(function (root) {
  'use strict';

  /* The four parts of the first visit, shown as the progress bar's four lengths. */
  const CHAPTERS = [
    { id: 'you', name: 'About you' },
    { id: 'week', name: 'Your week' },
    { id: 'try', name: 'Try it' },
    { id: 'plan', name: 'Your plan' }
  ];

  /* What gets in the way of a week. Each one picks the research shown, the before and after line, a
     note on the part of the board it's about, which tries come up, and what the plan says to lean on. */
  const PAINS = [
    { id: 'head', name: 'Too much lives in my head', line: 'Dates, to dos, who needs what', icon: 'note2', before: 'In your head', after: 'On the board', research: 'scullin', lean: 'To do and the Sunday Reset', tries: ['todo'] },
    { id: 'slip', name: 'Things slip through the cracks', line: 'A due date sneaks up on me', icon: 'flag', before: 'Remembered late', after: 'A day and a time', research: 'gollwitzer', lean: 'Due soon and the notepad', tries: ['todo'] },
    { id: 'runs', name: 'The week runs me', line: 'It’s Thursday before I look up', icon: 'calendar', before: 'Thursday already?', after: 'Set on Sunday', research: 'masicampo', lean: 'The Sunday Reset', tries: [] },
    { id: 'crash', name: 'My plans fall apart', line: 'The day never fits what I planned', icon: 'overlap', before: 'More than fits', after: 'You see when a day is full', research: 'buehler', lean: 'Kinds of day and moving blocks', tries: [] },
    { id: 'me', name: 'I never get time for myself', line: 'Everything else comes first', icon: 'sun', before: 'Squeezed out', after: 'Hours that are yours', research: 'sharif', lean: 'Block library and the hours that are yours', tries: [], focus: 'make' },
    { id: 'dinner', name: 'Dinner is a nightly scramble', line: 'What’s for dinner, at 5 pm', icon: 'pot', before: 'The 5 pm scramble', after: 'Decided on Sunday', research: 'ducrot', lean: 'Dinners and the grocery list', tries: ['dinner'], help: 'dinners' },
    { id: 'us', name: 'Not enough time together', line: 'We’re two people passing', icon: 'heart', before: 'Whenever we can', after: 'An evening each week', research: 'tonietto', lean: 'Time together', tries: [], help: 'together', partnered: true },
    { id: 'load', name: 'I carry the planning for everyone', line: 'Noticing, deciding, remembering', icon: 'people', before: 'Carried alone', after: 'Written down, ready to hand off', research: 'daminger', lean: 'To do groups and the Sunday Reset', tries: ['todo'], notAlone: true, focus: 'home' }
  ];
  const painById = (id) => PAINS.find((p) => p.id === id);
  /* the pains that fit who's at home: nobody living alone is asked about time together */
  const painsFor = (home) => PAINS.filter((p) => !(p.partnered && home !== 'partner' && home !== 'family') && !(p.notAlone && (home || 'solo') === 'solo'));

  /* The studies the app leans on, each said plainly and no bigger than it is, with what it means for
     the board. big and small are the card on a phone: the number first, then one line. Every link is a DOI checked against Crossref on Oct 1, 2026. */
  const RESEARCH = {
    scullin: { big: '10 min sooner', small: 'People who wrote down what was next fell asleep in about 15 minutes, not 25.', finding: 'People who spent five minutes writing down what they had to do next fell asleep faster than people who wrote about what they’d already done: about 15 minutes instead of 25.', means: 'The Sunday Reset puts the week on the board, so it isn’t waiting in your head.', who: 'Scullin and colleagues', where: 'Journal of Experimental Psychology: General', year: 2018, url: 'https://doi.org/10.1037/xge0000374' },
    masicampo: { big: 'A plan quiets it', small: 'Making a plan for an unfinished goal stopped it pulling at people’s attention.', finding: 'Unfinished goals kept pulling at people’s attention. Making a specific plan for them, before doing any of them, stopped the pull.', means: 'A week laid out on Sunday is a plan for everything in it.', who: 'Masicampo and Baumeister', where: 'Journal of Personality and Social Psychology', year: 2011, url: 'https://doi.org/10.1037/a0024192' },
    gollwitzer: { big: '94 studies', small: 'Deciding when and where you’ll do something makes it more likely to happen.', finding: 'Across 94 studies, people who decided when and where they would act on a goal reached it more often than people who only meant to.', means: 'Giving a to do a day and a time is that decision.', who: 'Gollwitzer and Sheeran', where: 'Advances in Experimental Social Psychology', year: 2006, url: 'https://doi.org/10.1016/S0065-2601(06)38002-1' },
    buehler: { big: '56 days, not 34', small: 'Students guessed their thesis would take 34 days. It took 56, longer than their worst guess.', finding: 'Students guessed their thesis would take 34 days. On average it took 56, longer than even their worst case guess.', means: 'On the board time is length, so you see when a day is already full.', who: 'Buehler, Griffin, and Ross', where: 'Journal of Personality and Social Psychology', year: 1994, url: 'https://doi.org/10.1037/0022-3514.67.3.366' },
    sharif: { big: '2 to 5 hours', small: 'Under about two hours a day of your own, people felt worse. Past five, more didn’t help.', finding: 'People with less than about two hours a day to spend as they liked reported lower well-being. Past about five hours, more didn’t help.', means: 'The board counts the hours that are yours, so you can see when you’re short.', who: 'Sharif, Mogilner, and Hershfield', where: 'Journal of Personality and Social Psychology', year: 2021, url: 'https://doi.org/10.1037/pspp0000391' },
    ducrot: { big: '40,554 adults', small: 'People who planned their meals ate a more varied, better diet.', finding: 'In a study of 40,554 adults, people who planned their meals were more likely to eat a varied, higher quality diet.', means: 'Dinners get decided on Sunday, and the grocery list comes from what you picked.', who: 'Ducrot and colleagues', where: 'International Journal of Behavioral Nutrition and Physical Activity', year: 2017, url: 'https://doi.org/10.1186/s12966-017-0461-7' },
    tonietto: { big: 'Roughly, not exactly', small: 'Fun at a set time felt like work. A rough plan, like after dinner, kept it fun.', finding: 'Putting something fun at a set time made it feel more like work. A rough plan, like after dinner, kept it fun.', means: 'That’s why evenings sit on the board as open time, not appointments: the room is kept, and what fills it can wait.', who: 'Tonietto and Malkoc', where: 'Journal of Marketing Research', year: 2016, url: 'https://doi.org/10.1509/jmr.14.0591' },
    daminger: { big: 'Unseen work', small: 'Noticing, deciding, and keeping track is real work, and a common source of friction.', finding: 'Running a home means noticing what’s needed, weighing options, deciding, and keeping track. That work is real, mostly unseen, and a common source of friction between partners.', means: 'On the board, that work is written down where you can see it, and ready to hand to someone else.', who: 'Daminger', where: 'American Sociological Review', year: 2019, url: 'https://doi.org/10.1177/0003122419859007' }
  };

  /* The parts of the board, as the help step shows them. Always on parts can't be left out; the
     others are the modules in settings.modules. */
  const PARTS = [
    { id: 'yours', name: 'Your own time', line: 'Workouts, creative time, rest. The board counts the hours that are yours.', icon: 'sun', always: true, pains: ['me'] },
    { id: 'todos', name: 'To dos', line: 'Each one gets a due date, steps if it needs them, and a time on a day.', icon: 'flag', always: true, pains: ['head', 'slip', 'load'] },
    { id: 'dinners', name: 'Dinners', line: 'What’s for dinner each night, who cooks, and the grocery list.', icon: 'pot', module: 'dinners', pains: ['dinner'] },
    { id: 'together', name: 'Time together', line: 'An idea for an evening together, each week.', icon: 'heart', module: 'together', partner: true, pains: ['us'] },
    { id: 'reset', name: 'The Sunday Reset', line: 'A 20 minute walk through the week ahead, every Sunday.', icon: 'sliders', always: true, pains: ['runs', 'crash'] }
  ];

  /* What else the board can lean toward, beside meals and time together. Each picked one puts its row
     first in Block library and first among the band's ideas for open time (row is the KIT_ROWS name). */
  const FOCUS = [
    { id: 'move', name: 'Moving more', line: 'Workouts and walks', icon: 'runner', row: 'Move' },
    { id: 'make', name: 'Something of yours', line: 'Creative time, reading', icon: 'brush', row: 'Make' },
    { id: 'people', name: 'Friends and family', line: 'Calls, coffee, texts back', icon: 'chat', row: 'People' },
    { id: 'home', name: 'Home', line: 'Laundry, cleaning, errands', icon: 'house', row: 'Home and meals' }
  ];

  /* The steps of the first visit for these answers, each with its chapter. Asking why only follows a
     pick; drop off and pick up only for a family with kids; a try only for a part the board helps with.
     Who's at home comes before what gets in the way, so the pains offered fit the home. */
  function stepsFor(a) {
    const pains = a.pains || [];
    const out = [['name', 'you'], ['home', 'you'], ['pains', 'you']];
    if (pains.length) out.push(['why', 'you']);
    out.push(['help', 'you'], ['days', 'week'], ['work', 'week']);
    if (a.home === 'family' && (a.kids || []).length) out.push(['kids', 'week']);
    out.push(['calendar', 'week'], ['try', 'try'], ['ahead', 'try']);
    if (!a.help || a.help.dinners !== false) out.push(['dinner', 'try']);
    if (pains.some((p) => (painById(p) || {}).tries.includes('todo'))) out.push(['todo', 'try']);
    out.push(['reset', 'plan'], ['build', 'plan'], ['plan', 'plan']);
    return out.map(([id, chapter]) => ({ id, chapter }));
  }
  /* Every step in the order they can come. A draft saved on a step these answers no longer have (why,
     after the picks were cleared; kids, after the household changed) resumes on the nearest one before it. */
  const ORDER = ['name', 'home', 'pains', 'why', 'help', 'days', 'work', 'kids', 'calendar', 'try', 'ahead', 'dinner', 'todo', 'reset', 'build', 'plan'];
  /* each step's short name, for Dev's list of steps to open */
  const STEP_NAMES = { name: 'Name', pains: 'What gets in the way', why: 'The research', home: 'Who’s at home', help: 'What it helps with', days: 'Days', work: 'Work', kids: 'Drop off and pick up', calendar: 'A calendar', try: 'Try it', ahead: 'See further ahead', dinner: 'Dinner', todo: 'A to do', reset: 'The reset time', build: 'Building', plan: 'The plan' };
  function nearestStep(steps, id) {
    if (steps.some((s) => s.id === id)) return id;
    const k = ORDER.indexOf(id);
    if (k < 0) return steps[0].id;
    const before = steps.filter((s) => ORDER.indexOf(s.id) <= k);
    return (before.length ? before[before.length - 1] : steps[0]).id;
  }
  /* how far along the bar is: each chapter fills by the steps done inside it, and all of it on the last */
  function progress(steps, at) {
    const last = at >= steps.length - 1;
    return CHAPTERS.map((c) => {
      const mine = steps.map((s, i) => ({ s, i })).filter((x) => x.s.chapter === c.id);
      if (!mine.length) return { id: c.id, name: c.name, fill: 1 };
      const done = last ? mine.length : mine.filter((x) => x.i < at).length + (mine.some((x) => x.i === at) ? 0.5 : 0);
      return { id: c.id, name: c.name, fill: Math.min(1, done / mine.length), on: mine.some((x) => x.i === at) };
    });
  }

  /* The before and after rows and the research cards for the picks, in the order they were picked. */
  function reflect(pains) {
    const picked = (pains || []).map(painById).filter(Boolean);
    const rows = picked.slice(0, 3).map((p) => ({ id: p.id, before: p.before, after: p.after, icon: p.icon }));
    const seen = new Set();
    const cards = [];
    picked.forEach((p) => { if (!seen.has(p.research) && cards.length < 2) { seen.add(p.research); cards.push(Object.assign({ id: p.research, about: p.name }, RESEARCH[p.research])); } });
    return { rows, cards };
  }

  /* A thing coming up gets a mark that fits what it is. */
  function markFor(name) {
    const n = String(name || '').toLowerCase();
    if (/\b(trip|vacation|holiday|flight|travel|beach|lake|camping|cruise|getaway)\b/.test(n)) return 'plane';
    if (/\b(birthday|bday|party)\b/.test(n)) return 'cake';
    if (/\b(wedding|anniversary|date night)\b/.test(n)) return 'heart';
    if (/\b(move|moving|move in|move out)\b/.test(n)) return 'box';
    if (/\b(exam|deadline|launch|due|interview|finals)\b/.test(n)) return 'flag';
    if (/\b(race|marathon|half marathon|5k|10k|tournament)\b/.test(n)) return 'runner';
    return 'star';
  }

  /* The weekday and time of the Sunday Reset, and the first one from now. */
  const DAY_CODE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const RESET_TIMES = [
    { id: 'morning', name: 'Sunday morning', day: 0, min: 540 },
    { id: 'afternoon', name: 'Sunday afternoon', day: 0, min: 900 },
    { id: 'evening', name: 'Sunday evening', day: 0, min: 1140 }
  ];
  /* The reset's first offer: the first of evening, afternoon, or morning on Sunday that's awake and
     clear of work, so someone who works Sundays isn't offered the middle of a shift. A Sunday with no
     quiet 20 minutes offers an hour after waking. */
  function quietReset(a) {
    const wake = a.wake.we, bed = a.bed.we;
    const work = !a.noWork && a.work && a.work.days.includes(0) ? Object.assign({ start: a.work.start, end: a.work.end }, !a.work.same && a.work.hours ? a.work.hours[0] : null) : null;
    const clear = (min) => min >= wake && min + 20 <= bed && !(work && min < work.end && work.start < min + 20);
    const pick = ['evening', 'afternoon', 'morning'].map((id) => RESET_TIMES.find((t) => t.id === id)).find((t) => clear(t.min));
    if (pick) return { day: pick.day, min: pick.min };
    const after = work && clear(work.end + 30) ? work.end + 30 : Math.min(1380, wake + 60);
    return { day: 0, min: Math.round(after / 30) * 30 };
  }
  function nextReset(M, today, nowMin, at) {
    const wd = M.weekday(today);
    let n = (at.day - wd + 7) % 7;
    if (n === 0 && nowMin >= at.min) n = 7;
    return M.addDays(today, n);
  }

  /* A calendar file with the Sunday Reset every week at its time, in the calendar's own time zone,
     with a reminder ten minutes before. url opens the app from the event. */
  const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function resetIcs(M, first, at, url, stamp, uid) {
    const pad = (n) => String(n).padStart(2, '0');
    const local = first.replace(/-/g, '') + 'T' + pad(Math.floor(at.min / 60)) + pad(at.min % 60) + '00';
    const d = new Date(stamp);
    const utc = d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sunday Reset//Sunday Reset//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + uid + '@sundayreset', 'DTSTAMP:' + utc, 'DTSTART:' + local, 'DURATION:PT20M',
      'RRULE:FREQ=WEEKLY;BYDAY=' + DAY_CODE[at.day], 'SUMMARY:Sunday Reset',
      'DESCRIPTION:' + icsText('Set up the week ahead: to dos, dinners, and your own time.' + (url ? '\nOpen Sunday Reset: ' + url : '')),
      url ? 'URL:' + url : null,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT10M', 'DESCRIPTION:Sunday Reset in 10 minutes', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].filter(Boolean);
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  /* RFC 5545 3.1: a line is at most 75 bytes; the rest carries on in lines that start with a space */
  function fold(line) {
    const bytes = (ch) => { const c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; };
    const out = [];
    let cur = '', size = 0;
    for (const ch of line) {
      const b = bytes(ch);
      if (size + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; size = 0; }
      cur += ch; size += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }

  /* What the try steps left, laid onto the week that was built: the block placed and stretched, the
     thing coming up, tonight's dinner, and the to do. Each one is what the person did, so the plan can
     say it's already on the board. */
  function applyExtras(M, st, a) {
    const on = [];
    if (a.placed && a.placed.add) {
      const r = M.placeAdd(st, a.placed.date, Object.assign({}, a.placed.add, { dur: a.placed.dur || a.placed.add.dur }), a.placed.start);
      if (r && r.ok) on.push({ kind: 'block', name: a.placed.add.name, date: r.date || a.placed.date, start: r.start, dur: a.placed.dur || a.placed.add.dur });
    }
    if (a.soon && a.soon.name && a.soon.date) {
      st.events.push({ id: M.newId('e'), kind: 'marker', name: a.soon.name, icon: markFor(a.soon.name), date: a.soon.date });
      on.push({ kind: 'soon', name: a.soon.name, date: a.soon.date });
    }
    if (a.dinner && a.dinner.date && (a.dinner.name || a.dinner.cook)) {
      st.dinners[a.dinner.date] = { name: a.dinner.name || '', recipe: a.dinner.recipe || null, cook: a.dinner.cook || '', items: (a.dinner.items || []).slice() };
      on.push({ kind: 'dinner', name: a.dinner.name || '', cook: a.dinner.cook || '', date: a.dinner.date });
    }
    if (a.todo && a.todo.name) {
      const t = a.todo;
      if (t.kind === 'block' && t.date && t.start != null) {
        const r = M.placeAdd(st, t.date, { name: t.name, cat: t.cat || 'yours', icon: t.icon || 'star', dur: t.dur || 30, src: { type: 'custom' } }, t.start);
        if (r && r.ok) on.push({ kind: 'block', name: t.name, date: r.date || t.date, start: r.start, dur: t.dur || 30 });
        /* the time was taken (a locked block, or a full day): it's never lost, it waits in To do for that day */
        else on.push(todoOf(M, st, Object.assign({}, t, { due: t.date }), { taken: t.start }));
      } else on.push(todoOf(M, st, t));
    }
    /* what else gets in the way, in their words, waits in To do for the first reset (the plan says so, so it isn't listed twice) */
    if (a.painOther && a.painOther.trim()) todoOf(M, st, { name: 'Look at: ' + a.painOther.trim().slice(0, 70), icon: 'note2' });
    return on;
  }

  function todoOf(M, st, t, extra) {
    const group = (st.groups.find((g) => g.id === 'inbox') || st.groups[0] || {}).id || null;
    st.tasks.push({ id: M.newId('t'), name: t.name, group, icon: t.icon && t.icon !== 'star' ? t.icon : 'check', cat: t.cat || 'yours', dur: t.dur || null, due: t.due || null, repeat: null, done: false, steps: [] });
    return Object.assign({ kind: 'todo', name: t.name, due: t.due || null }, extra || {});
  }

  /* The numbers the plan leads with, read from a usual week of the board that was built, the same way
     the desk counts them: hours that are yours, open hours, and nights with a dinner block. */
  function planStats(M, st, today) {
    const ws = M.weekStart(today);
    const days = M.range(ws, 7).map((d) => M.resolveWindow(st, d));
    const t = M.totals(days);
    const awake = M.awake(t);
    let locked = 0, dinners = 0, evenings = 0;
    days.forEach((d) => {
      if (d.blocks.some((b) => b.dinner)) dinners++;
      if (d.blocks.some((b) => b.tpl === 'evening' || b.free)) evenings++;
      d.blocks.forEach((b) => { if (b.fixed && !b.sleep) locked++; });
    });
    /* dinners already decided in the days ahead (the one tried in the setup), so a count of nights is never read as nights planned */
    const decided = M.range(today, 7).filter((d) => { const x = (st.dinners || {})[d]; return x && (x.name || x.cook); }).length;
    return { yours: t.yours || 0, open: t.free || 0, awake, share: awake ? Math.round((100 * (t.yours || 0)) / awake) : 0, dinners, decided, locked, evenings };
  }

  /* What happens after the board opens, in order, with real days and times. */
  function nextSteps(M, today, nowMin, at, opts) {
    const first = nextReset(M, today, nowMin, at);
    const n = M.diffDays(today, first);
    const when = n === 0 ? 'Today at ' + M.clock(at.min) : n === 1 ? 'Tomorrow at ' + M.clock(at.min) : M.DAY_LONG[M.weekday(first)] + ', ' + M.dateText(first) + ' at ' + M.clock(at.min);
    const out = [
      { when: 'Now', what: 'Your week opens on the board. Move anything, and it saves on this device.' },
      { when: 'Each morning', what: 'Today opens on what you’re in and what’s next' + (opts && opts.dinners ? ', and asks about dinner from 3 pm.' : '.') },
      { when, what: 'Your first Sunday Reset: to dos, ' + (opts && opts.dinners ? 'dinners, ' : '') + 'and the week ahead.' },
      { when: 'Every ' + M.DAY_LONG[at.day] + ' after', what: 'The same short walk through the week, and the week is set.' }
    ];
    return { first, list: out };
  }

  /* What to lean on for a pain, given what the board has: no advice points at a part that's off, or at
     time together for someone who lives alone. */
  function leanFor(p, ctx) {
    if (p.id === 'us' && !ctx.partnered) return 'Block library: Coffee with a friend and Call a loved one';
    if (p.id === 'us' && !ctx.together) return 'Time together, which Settings, You and home, turns on';
    if (p.id === 'dinner' && !ctx.dinners) return 'Dinners, which Settings, You and home, turns on';
    return p.lean;
  }
  /* The hours the board shows, from the answers: from the hour before the earliest wake (5 am for
     anyone up by 6:30, later for someone who sleeps in, so a morning isn't hours of sleep) to midnight,
     or past it for a late bedtime, through 5 am at most and 24 hours in all. */
  function hoursFor(a) {
    const wake = Math.min(a.wake.wd, a.wake.we), bed = Math.max(a.bed.wd, a.bed.we);
    const start = Math.max(0, Math.min(300, Math.floor((wake - 30) / 60) * 60), Math.min(720, Math.floor((wake - 60) / 60) * 60));
    const end = Math.min(1740, start + 1440, Math.max(1440, Math.ceil((bed + 30) / 60) * 60));
    return { start, end };
  }

  /* The lines the build step shows while it builds, each one from the answers, in the order a day goes. */
  function buildLines(M, a, st, extras, ics) {
    const out = ['Mornings from ' + M.clock(a.wake.wd) + ' on weekdays'];
    if (!a.noWork && a.work.days.length) out.push('Work on ' + a.work.days.slice().sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)).map((d) => M.DAY_SHORT[d]).join(', '));
    const ate = a.meals ? ['Breakfast', 'Lunch'].filter((m) => a.meals[m.toLowerCase()]) : [];
    if (ate.length) out.push(ate.join(' and ') + ' at a time each day');
    const kids = a.home === 'family' ? (a.kids || []) : [];
    if (kids.length) out.push('Locking drop off and pick up for ' + (kids.length === 1 ? kids[0] : kids.slice(0, -1).join(', ') + ' and ' + kids[kids.length - 1]));
    const din = Object.values(st.rhythm.days).map((d) => (d.blocks.find((b) => b.dinner) || {}).start).filter((x) => x != null);
    if (a.help.dinners && din.length) {
      const count = {};
      din.forEach((x) => { count[x] = (count[x] || 0) + 1; });
      out.push('Dinner at ' + M.clock(+Object.keys(count).sort((x, y) => count[y] - count[x])[0]));
    }
    out.push(a.partner && (a.home === 'partner' || a.home === 'family') ? 'Evenings with ' + a.partner.trim() : 'Keeping your evenings free');
    if (ics && ics.items && ics.items.length) out.push('Bringing in ' + ics.items.length + ' events from ' + ics.name);
    /* what the tries did goes on the board too, so the build says so in their own words */
    const dayOf = (d) => M.DAY_LONG[M.weekday(d)];
    (extras || []).forEach((x) => {
      if (x.kind === 'soon') out.push('Marking ' + x.name);
      else if (x.kind === 'block' && x.date) out.push('Putting ' + x.name + ' on ' + dayOf(x.date) + (x.start != null ? ' at ' + M.clock(x.start) : ''));
      else if (x.kind === 'dinner' && x.date) out.push(x.name ? x.name + ' for dinner on ' + dayOf(x.date) : 'Dinner on ' + dayOf(x.date) + ', decided');
      else if (x.kind === 'todo') out.push('Adding ' + x.name + ' to To do');
    });
    out.push('Counting the hours that are yours');
    return out;
  }

  /* After the board opens: a short list of first moves on the real desk, with the first already done
     (people finish a list they've already started). The ones offered follow what they said. */
  const MOVES = {
    build: { name: 'Set up your week', line: 'Done. That was the longest part.', quiet: 'Your week is on the board.' },
    place: { name: 'Put a block on a day', line: 'Drag one from Block library onto a day.', phone: 'On a computer, drag one from Block library onto a day.' },
    stretch: { name: 'Stretch a block', line: 'Drag the right edge of a block you placed.', phone: 'On a computer, drag the right edge of a block you placed.' },
    month: { name: 'See the month', line: 'The same blocks, from further away.' },
    dinner: { name: 'Pick a dinner', line: 'Tap a Dinner block and say how it’s happening.' },
    todo: { name: 'Add a to do', line: 'In plain words, like Call the dentist by Friday.' },
    desk: { name: 'Open the desk', line: 'One day, with blocks you can move.' },
    reset: { name: 'Do your first Sunday Reset', line: 'About 20 minutes, through the week ahead.' }
  };
  function movesFor(pains, help, phone) {
    const wantsTodo = (pains || []).some((p) => ['head', 'slip', 'load'].includes(p));
    const dinners = !help || help.dinners !== false;
    if (phone) return ['build', 'todo'].concat(dinners ? ['dinner'] : [], ['desk', 'reset']);
    const flex = [wantsTodo ? 'todo' : null, dinners ? 'dinner' : null, 'month', 'todo'].filter(Boolean).filter((x, i, l) => l.indexOf(x) === i).slice(0, 2);
    return ['build', 'place', 'stretch'].concat(flex, ['reset']);
  }

  const api = { CHAPTERS, PAINS, RESEARCH, PARTS, FOCUS, RESET_TIMES, MOVES, ORDER, STEP_NAMES, painById, painsFor, quietReset, stepsFor, nearestStep, progress, reflect, markFor, nextReset, resetIcs, applyExtras, planStats, nextSteps, leanFor, hoursFor, buildLines, movesFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Onboard = api;
})(typeof window !== 'undefined' ? window : globalThis);
