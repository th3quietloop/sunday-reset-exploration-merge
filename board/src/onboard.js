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
     note on the part of the board it's about, which tries come up, and what the plan says to lean on.
     how: one plain line for the gold side of its card on the research step, what the board does about it. */
  const PAINS = [
    { id: 'head', name: 'Too much lives in my head', line: 'Dates, to-dos, who needs what', icon: 'note2', before: 'In your head', after: 'On the board', how: 'Due dates show on your week, where you can see them.', research: 'scullin', lean: 'To-dos and the Sunday Reset', tries: ['todo'] },
    { id: 'slip', name: 'Things slip through the cracks', line: 'A due date sneaks up on me', icon: 'flag', before: 'Remembered late', after: 'A day and a time', how: 'Each to-do gets a due date and a time to do it.', research: 'gollwitzer', lean: 'Due soon and the notepad', tries: ['todo'] },
    /* V11 (Oct 15, the first-visit walk): the pain a version with goals answers. goals: offered only where the board
       has goals (painsFor's opts.goals); help: picking it says yes to A goal with a date on the next question */
    { id: 'big', name: 'Big things are hard to start', line: 'An exam, a paper, a move', icon: 'mountain', before: 'Too big to start', after: 'A little each day', how: 'A goal with a date becomes a little time on the days before it.', research: 'gollwitzer', lean: 'Goals: a little time each day until the date', tries: ['todo'], help: 'goal', goals: true },
    { id: 'runs', name: 'The week runs me', line: 'It’s Thursday before I look up', icon: 'calendar', before: 'Thursday already?', after: 'Set on Sunday', how: 'About 20 minutes on Sunday lays out the week ahead.', research: 'masicampo', lean: 'The Sunday Reset', tries: [] },
    /* (a block running past the end of its lane: two linked rings read as wedding rings at tile size) */
    { id: 'crash', name: 'My plans fall apart', line: 'The day never fits what I planned', icon: 'overrun', before: 'More than fits', after: 'You see when a day is full', how: 'Time is length on the board, so a full day looks full.', research: 'buehler', lean: 'Kinds of day and moving blocks', tries: [] },
    { id: 'me', name: 'I never get time for myself', line: 'Everything else comes first', icon: 'sun', before: 'Squeezed out', after: 'Hours that are yours', how: 'Time for yourself goes on the board as a block, and it counts your hours.', research: 'sharif', lean: 'Block library and the hours that are yours', tries: [], focus: 'make' },
    { id: 'dinner', name: 'Dinner is a nightly scramble', line: 'What’s for dinner, at 5 pm', icon: 'pot', before: 'The 5 pm scramble', after: 'Decided on Sunday', how: 'Pick the week’s dinners once, and the grocery list fills in.', research: 'ducrot', lean: 'Dinners and the grocery list', tries: ['dinner'], help: 'dinners' },
    { id: 'us', name: 'Not enough time together', line: 'We’re two people passing', icon: 'heart', before: 'Whenever we can', after: 'An evening each week', how: 'An evening together stays on the board every week.', research: 'tonietto', lean: 'Time together', tries: [], help: 'together', partnered: true },
    { id: 'load', name: 'I carry the planning for everyone', line: 'Noticing, deciding, remembering', icon: 'people', before: 'Carried alone', after: 'Written down, ready to hand off', how: 'What you keep track of is written down, where others can see it.', research: 'daminger', lean: 'To-do groups and the Sunday Reset', tries: ['todo'], notAlone: true, focus: 'home' }
  ];
  const painById = (id) => PAINS.find((p) => p.id === id);
  /* the pains that fit who's at home: nobody living alone is asked about time together. opts.goals: the board
     has goals, so Big things are hard to start is one of them */
  const painsFor = (home, opts) => PAINS.filter((p) => !(p.partnered && home !== 'partner' && home !== 'family') && !(p.notAlone && (home || 'solo') === 'solo') && !(p.goals && !(opts && opts.goals)));

  /* The studies the app leans on, each said plainly and no bigger than it is, with what it means for
     the board. big leads: what the study found, in one plain sentence (never a number as a headline, Kim's
     test, Oct 20). small is who and when, the way a person says it: the year, how many people, and where,
     only as far as the paper says. finding is the same finding for a study shown on its own; means is what
     the board does about it. Every link is a DOI checked against Crossref on Oct 1, 2026; the people and
     places in small were checked against each paper's abstract on Oct 20, 2026. */
  const RESEARCH = {
    scullin: { big: 'Writing down what was next helped people fall asleep faster.', small: 'A 2018 sleep lab study of 57 young adults.', finding: 'People who wrote a to-do list before bed fell asleep about 10 minutes sooner than people who wrote about what they’d done.', means: 'The Sunday Reset puts the week on the board, so it isn’t waiting in your head.', who: 'Scullin and colleagues', where: 'Journal of Experimental Psychology: General', year: 2018, url: 'https://doi.org/10.1037/xge0000374' },
    masicampo: { big: 'Making a plan for an unfinished goal stopped it nagging at people.', small: 'A 2011 set of experiments with college students.', finding: 'Making a plan for an unfinished goal stopped it pulling at people’s attention, before they’d done any of it.', means: 'A week laid out on Sunday is a plan for everything in it.', who: 'Masicampo and Baumeister', where: 'Journal of Personality and Social Psychology', year: 2011, url: 'https://doi.org/10.1037/a0024192' },
    gollwitzer: { big: 'People who decided when and where they’d do something did it more often.', small: 'A 2006 review of 94 studies.', finding: 'People who decided when and where they would act on a goal reached it more often than people who only meant to.', means: 'Giving a to-do a day and a time is that decision.', who: 'Gollwitzer and Sheeran', where: 'Advances in Experimental Social Psychology', year: 2006, url: 'https://doi.org/10.1016/S0065-2601(06)38002-1' },
    buehler: { big: 'People finished a big project weeks later than they guessed, past even their worst case.', small: 'A 1994 study of 37 university students writing a thesis.', finding: 'Students guessed their thesis would take 34 days, and on average it took 56, longer than even their worst case guess.', means: 'On the board, time is length, so you see when a day is already full.', who: 'Buehler, Griffin, and Ross', where: 'Journal of Personality and Social Psychology', year: 1994, url: 'https://doi.org/10.1037/0022-3514.67.3.366' },
    sharif: { big: 'People with 2 to 5 hours a day to themselves felt best, and more than 5 didn’t help.', small: 'A 2021 study of about 35,000 Americans.', finding: 'People with less than about 2 hours a day to themselves felt worse, and past about 5 hours, more didn’t help.', means: 'The board counts the hours that are yours, so you can see when you’re short.', who: 'Sharif, Mogilner, and Hershfield', where: 'Journal of Personality and Social Psychology', year: 2021, url: 'https://doi.org/10.1037/pspp0000391' },
    ducrot: { big: 'People who planned their meals ate a more varied, healthier diet.', small: 'A 2017 study of about 40,000 adults in France.', finding: 'People who planned their meals were more likely to eat a varied, healthier diet.', means: 'Dinners get decided on Sunday, and the grocery list comes from what you picked.', who: 'Ducrot and colleagues', where: 'International Journal of Behavioral Nutrition and Physical Activity', year: 2017, url: 'https://doi.org/10.1186/s12966-017-0461-7' },
    tonietto: { big: 'Fun set for an exact time felt like work, and a rough plan kept it fun.', small: 'A 2016 set of 13 studies.', finding: 'Putting something fun at a set time made it feel more like work, and a rough plan, like after dinner, kept it fun.', means: 'Evenings sit on the board as open time, not appointments, so what fills them can wait.', who: 'Tonietto and Malkoc', where: 'Journal of Marketing Research', year: 2016, url: 'https://doi.org/10.1509/jmr.14.0591' },
    daminger: { big: 'Noticing, deciding, and keeping track at home is real work that mostly goes unseen.', small: 'A 2019 study of 35 couples, in long interviews.', finding: 'Noticing what’s needed, deciding, and keeping track at home is real work, mostly unseen, and a common source of friction.', means: 'On the board, that work is written down, where someone else can pick it up.', who: 'Daminger', where: 'American Sociological Review', year: 2019, url: 'https://doi.org/10.1177/0003122419859007' }
  };

  /* The parts of the board, as the help step shows them. Always on parts can't be left out; the
     others are the modules in settings.modules. */
  const PARTS = [
    { id: 'yours', name: 'Your own time', line: 'Workouts, creative time, rest. The board counts the hours that are yours.', icon: 'sun', always: true, pains: ['me'] },
    { id: 'todos', name: 'To-dos', line: 'Each one gets a due date, steps if it needs them, and a time on a day.', icon: 'flag', always: true, pains: ['head', 'slip', 'load'] },
    { id: 'dinners', name: 'Dinners', line: 'What’s for dinner each night, who cooks, and the grocery list.', icon: 'pot', module: 'dinners', pains: ['dinner'] },
    { id: 'together', name: 'Time together', line: 'An idea for an evening together, each week.', icon: 'heart', module: 'together', partner: true, pains: ['us'] },
    { id: 'reset', name: 'The Sunday Reset', line: 'A 20 minute walk through the week ahead, every Sunday.', icon: 'sliders', always: true, pains: ['runs', 'crash'] }
  ];

  /* What else the board can lean toward, beside meals and time together. Each picked one puts its row
     first in Block library and first among the band's ideas for open time (row is the KIT_ROWS name). */
  const FOCUS = [
    { id: 'move', name: 'Moving more', line: 'Workouts and walks', icon: 'runner', row: 'Move' },
    { id: 'make', name: 'Something of yours', line: 'Creative time, reading', icon: 'brush', row: 'Make' },
    { id: 'people', name: 'Friends and family', line: 'Calls, coffee, texts back', icon: 'chat', row: 'Keep in touch' },
    { id: 'home', name: 'Home', line: 'Laundry, cleaning, errands', icon: 'house', row: 'Home and meals' }
  ];

  /* The steps of the first visit for these answers, each with its chapter. Asking why only follows a
     pick; drop off and pick up only for a family with kids; a try only for a part the board helps with.
     Who's at home comes before what gets in the way, so the pains offered fit the home.
     opts (V11, Oct 15, the first-visit walk): phone, a calendar file can't come from a phone, so that step waits
     in Getting started for a computer; asked, dinner is tried here only by someone who said dinner is a
     scramble (everyone else finds Pick a dinner in Getting started), and their own words alone get the
     research step's answer too. */
  function stepsFor(a, opts) {
    const o = opts || {}, pains = a.pains || [];
    const out = [['name', 'you'], ['home', 'you'], ['pains', 'you']];
    if (pains.length || (o.asked && String(a.painOther || '').trim())) out.push(['why', 'you']);
    out.push(['help', 'you'], ['days', 'week'], ['work', 'week']);
    if (a.home === 'family' && (a.kids || []).length) out.push(['kids', 'week']);
    if (!o.phone) out.push(['calendar', 'week']);
    out.push(['try', 'try'], ['ahead', 'try']);
    if ((!a.help || a.help.dinners !== false) && (!o.asked || pains.includes('dinner'))) out.push(['dinner', 'try']);
    if (pains.some((p) => (painById(p) || {}).tries.includes('todo'))) out.push(['todo', 'try']);
    out.push(['reset', 'plan'], ['build', 'plan'], ['plan', 'plan']);
    return out.map(([id, chapter]) => ({ id, chapter }));
  }
  /* Every step in the order they can come. A draft saved on a step these answers no longer have (why,
     after the picks were cleared; kids, after the household changed) resumes on the nearest one before it. */
  const ORDER = ['name', 'home', 'pains', 'why', 'help', 'days', 'work', 'kids', 'calendar', 'try', 'ahead', 'dinner', 'todo', 'reset', 'build', 'plan'];
  /* each step's short name, for Dev's list of steps to open */
  const STEP_NAMES = { name: 'Name', pains: 'What gets in the way', why: 'What changes', home: 'Who’s at home', help: 'What it helps with', days: 'Days', work: 'Work', kids: 'Drop off and pick up', calendar: 'A calendar', try: 'Try it', ahead: 'See further ahead', dinner: 'Dinner', todo: 'A to-do', reset: 'The reset time', build: 'Building', plan: 'The plan' };
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

  /* The studies from strongest to weakest evidence: a review of 94 studies, then large samples, then
     single experiments, then interviews. The research step leads with the strongest one picked. */
  const STRENGTH = ['gollwitzer', 'ducrot', 'sharif', 'buehler', 'masicampo', 'scullin', 'tonietto', 'daminger'];
  /* The before and after rows for the first three picks, in the order they were picked (name is their
     own words, how is what the board does), and up to two research cards, the strongest first. */
  function reflect(pains) {
    const picked = (pains || []).map(painById).filter(Boolean);
    const rows = picked.slice(0, 3).map((p) => ({ id: p.id, name: p.name, before: p.before, after: p.after, how: p.how, icon: p.icon }));
    const seen = new Set();
    const cards = [];
    picked.forEach((p) => { if (!seen.has(p.research)) { seen.add(p.research); cards.push(Object.assign({ id: p.research, about: p.name }, RESEARCH[p.research])); } });
    cards.sort((x, y) => STRENGTH.indexOf(x.id) - STRENGTH.indexOf(y.id));
    return { rows, cards: cards.slice(0, 2) };
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
      'DESCRIPTION:' + icsText('Set up the week ahead: to-dos, dinners, and your own time.' + (url ? '\nOpen Sunday Reset: ' + url : '')),
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
    /* (V11: the to-do step can take several, one per line, for someone with too much in their head: a.more) */
    [a.todo].concat(a.more || []).forEach((t) => {
      if (!t || !t.name) return;
      if (t.kind === 'block' && t.date && t.start != null) {
        const r = M.placeAdd(st, t.date, { name: t.name, cat: t.cat || 'yours', icon: t.icon || 'star', dur: t.dur || 30, src: { type: 'custom' } }, t.start);
        if (r && r.ok) on.push({ kind: 'block', name: t.name, date: r.date || t.date, start: r.start, dur: t.dur || 30 });
        /* the time was taken (a locked block, or a full day): it's never lost, it waits in To do for that day */
        else on.push(todoOf(M, st, Object.assign({}, t, { due: t.date }), { taken: t.start }));
      } else on.push(todoOf(M, st, t));
    });
    /* what else gets in the way, in their words, waits in To do for the first reset (the plan says so, so it isn't listed
       twice); V11: unless it's the goal the setup is making, which the plan leads with instead */
    if (a.painOther && a.painOther.trim() && !(a.goal && a.goal.from === 'other')) todoOf(M, st, { name: 'Look at: ' + a.painOther.trim().slice(0, 70), icon: 'note2' });
    return on;
  }

  /* (V11: a to-do can come with its steps, from Break it down on the to-do step, and a due date joined to the date
     See further ahead heard; the extra says which task it became, so a goal made from it can take it off the list) */
  function todoOf(M, st, t, extra) {
    const group = (st.groups.find((g) => g.id === 'inbox') || st.groups[0] || {}).id || null;
    const id = M.newId('t');
    const steps = (t.steps || []).filter((s) => s && s.name).map((s, i) => ({ id: id + '-s' + (i + 1), name: s.name, dur: s.dur || 15, done: false }));
    st.tasks.push({ id, name: t.name, group, icon: t.icon && t.icon !== 'star' ? t.icon : 'check', cat: t.cat || 'yours', dur: t.dur || null, due: t.due || null, repeat: null, done: false, steps });
    return Object.assign({ kind: 'todo', id, name: t.name, due: t.due || null }, steps.length ? { steps: steps.length } : {}, extra || {});
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
      { when, what: 'Your first Sunday Reset: to-dos, ' + (opts && opts.dinners ? 'dinners, ' : '') + 'and the week ahead.' },
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
    /* (V11: what fills the weekdays says its own name: Class, or Work and class) */
    if (!a.noWork && a.work.days.length) out.push(fillName(a) + ' on ' + a.work.days.slice().sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)).map((d) => M.DAY_SHORT[d]).join(', '));
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
      /* (V11: a date goes on the board, said plainly: Putting Bar exam on Tuesday, Feb 23, never Marking it) */
      if (x.kind === 'soon') out.push('Putting ' + x.name + ' on ' + dayOf(x.date) + ', ' + M.dateText(x.date));
      else if (x.kind === 'block' && x.date) out.push('Putting ' + x.name + ' on ' + dayOf(x.date) + (x.start != null ? ' at ' + M.clock(x.start) : ''));
      else if (x.kind === 'dinner' && x.date) out.push(x.name ? x.name + ' for dinner on ' + dayOf(x.date) : 'Dinner on ' + dayOf(x.date) + ', decided');
      else if (x.kind === 'todo') out.push('Adding ' + x.name + ' to your to-dos' + (x.steps ? ', in ' + x.steps + ' steps' : ''));
    });
    /* the goal the setup heard: its plan is the first thing the week opens on */
    if (a.goal && a.goal.name) out.push('Setting up ' + a.goal.name + ' as a goal');
    out.push('Counting the hours that are yours');
    return out;
  }
  /* V11: what fills the weekdays (the work step's first answer): work, school, or both */
  const FILLS = [
    { id: 'work', name: 'Work', line: 'A job', icon: 'laptop', block: 'Work', blockIcon: 'laptop' },
    { id: 'school', name: 'School', line: 'Classes and studying', icon: 'book', block: 'Class', blockIcon: 'book' },
    { id: 'both', name: 'Both', line: 'Work and classes', icon: 'people', block: 'Work and class', blockIcon: 'laptop' },
    { id: 'none', name: 'Neither', line: 'No set hours', icon: 'sun' }
  ];
  const fillOf = (a) => FILLS.find((f) => f.id === (a.noWork ? 'none' : a.fills || 'work')) || FILLS[0];
  const fillName = (a) => fillOf(a).block || 'Work';

  /* V11: three ways a day can go, each setting weekdays and weekends at once; the steppers fine tune them */
  const DAY_SHAPES = [
    { id: 'early', name: 'Early', wake: 360, bed: 1320 },
    { id: 'usual', name: 'Usual', wake: 420, bed: 1380 },
    { id: 'late', name: 'Late', wake: 540, bed: 1500 }
  ];

  /* == V11: the big thing the setup heard (Oct 15, the first-visit walk) ==
     A goal is a date with hours before it. goalLoad is what one asks of a week: an exam's hours (a common estimate,
     from Data.EXAMS through Model.goalForExam) spread over the weeks until its date. */
  function goalLoad(M, D, name, date, today) {
    const ex = M.goalForExam(name, D);
    const days = date ? M.diffDays(today, date) : null;
    const weeks = days != null && days > 0 ? days / 7 : null;
    const hours = ex.hours || null;
    const perWeek = hours && weeks ? hours / Math.max(1, weeks) : null;
    return { exam: ex.exam || null, kind: ex.kind, match: ex.match, hours, days, weeks, perWeek, perDay: perWeek ? perWeek / 7 : null, parts: ex.parts.length };
  }
  /* Which one thing to lead with: the goal made in the setup, or else something said that looks like one (the date from
     See further ahead, the to-do, their own words for what gets in the way), the first with a date leading. Two that
     name the same exam are one thing: the to-do lends its id, the date its day. */
  function bigThing(M, D, a, today) {
    const same = (x, y) => { const gx = M.goalForExam(x, D), gy = M.goalForExam(y, D); return (gx.exam && gx.exam === gy.exam) || String(x).trim().toLowerCase() === String(y).trim().toLowerCase(); };
    const cands = [];
    if (a.soon && a.soon.name && a.soon.date && a.soon.date > today && M.looksLikeGoal(a.soon.name, D)) cands.push({ name: a.soon.name.trim(), date: a.soon.date, from: 'ahead' });
    const tt = a.todo && (a.todo.text || a.todo.name);
    if (tt && a.todo.name && M.looksLikeGoal(tt, D)) cands.push({ name: a.todo.name, date: a.todo.due && a.todo.due > today ? a.todo.due : null, from: 'todo' });
    const other = String(a.painOther || '').trim();
    if (other && M.looksLikeGoal(other, D)) { const ex = M.goalForExam(other, D); cands.push({ name: ex.exam || other.slice(0, 40), date: null, from: 'other' }); }
    if (a.goal && a.goal.name) {
      const g = Object.assign({ made: true }, a.goal);
      const lend = cands.find((c) => c.date && same(c.name, g.name));
      if (!g.date && lend) g.date = lend.date;
      const td = cands.find((c) => c.from === 'todo' && same(c.name, g.name));
      if (td) g.todo = true;
      return g;
    }
    if (!cands.length) return null;
    const lead = cands.find((c) => c.date) || cands[0];
    const out = Object.assign({ made: false }, lead);
    if (cands.some((c) => c.from === 'todo' && same(c.name, lead.name))) out.todo = true;
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
    todo: { name: 'Add a to-do', line: 'In plain words, like Call the dentist by Friday.' },
    desk: { name: 'Open the desk', line: 'One day, with blocks you can move.' },
    reset: { name: 'Do your first Sunday Reset', line: 'About 20 minutes, through the week ahead.' },
    /* V11: a goal heard in the setup and not made yet, and a calendar a phone's setup couldn't bring in */
    goal: { name: 'Make it a goal', line: 'A little time each day until its date, on your board.' },
    calendar: { name: 'Bring in a calendar', line: 'From Google, Apple, or Outlook, as a file ending in .ics.', phone: 'On a computer: Settings, Calendars. A file ending in .ics, from Google, Apple, or Outlook.' }
  };
  /* ctx (V11, Oct 15): did, what the setup's tries already did (place, stretch, todo, dinner), which count as done, two
     at most so the list still has things to try; goal, a big thing heard and not made a goal yet; calendar, the
     setup ran on a phone, which can't bring a calendar file in. The list is six on the desk and five on a phone,
     with what's still to try after what's done, and the reset last. */
  function movesFor(pains, help, phone, ctx) {
    const wantsTodo = (pains || []).some((p) => ['head', 'slip', 'load', 'big'].includes(p));
    const dinners = !help || help.dinners !== false;
    if (ctx) {
      const did = ctx.did || {}, size = phone ? 5 : 6;
      const done = (phone ? ['todo', 'dinner'] : ['place', 'stretch', 'todo', 'dinner']).filter((id) => did[id] && (id !== 'dinner' || dinners)).slice(0, 2);
      /* (a phone's first look is already the desk, so Open the desk is done before the list is read; the calendar
         the phone's setup left out comes early, so it isn't lost) */
      const open = (phone ? ['goal', 'calendar', 'todo', 'dinner'] : ['goal', 'place', 'stretch', 'todo', 'dinner', 'month', 'calendar']).filter((id) => {
        if (done.includes(id) || did[id]) return false;
        if (id === 'goal') return !!ctx.goal;
        if (id === 'dinner') return dinners;
        if (id === 'calendar') return !!ctx.calendar;
        if (id === 'todo') return phone || wantsTodo;
        return true;
      });
      /* (filler, when what's left is short: the month, or a to-do) */
      ['month', 'todo'].forEach((id) => { if (!phone && !open.includes(id) && !done.includes(id) && !did[id]) open.push(id); });
      return ['build'].concat(done, open.slice(0, size - 2 - done.length), ['reset']);
    }
    if (phone) return ['build', 'todo'].concat(dinners ? ['dinner'] : [], ['desk', 'reset']);
    const flex = [wantsTodo ? 'todo' : null, dinners ? 'dinner' : null, 'month', 'todo'].filter(Boolean).filter((x, i, l) => l.indexOf(x) === i).slice(0, 2);
    return ['build', 'place', 'stretch'].concat(flex, ['reset']);
  }

  const api = { CHAPTERS, PAINS, RESEARCH, PARTS, FOCUS, RESET_TIMES, MOVES, ORDER, STEP_NAMES, FILLS, DAY_SHAPES, painById, painsFor, quietReset, stepsFor, nearestStep, progress, reflect, markFor, nextReset, resetIcs, applyExtras, planStats, nextSteps, leanFor, hoursFor, buildLines, movesFor, goalLoad, bigThing, fillOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Onboard = api;
})(typeof window !== 'undefined' ? window : globalThis);
