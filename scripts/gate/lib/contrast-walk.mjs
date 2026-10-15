// The screens the contrast checker walks, at one size: the front door (its folds open, and from a shared link),
// every setup step (and a goal offered and made), Look around first, the phone's list to its end and every card,
// the desk in Today (a block's panel on the open Duo's book page) and the Planner at each zoom, the menu, To-dos,
// Add, Block library, the kinds of day, every panel and sheet (a to-do, a goal, a session, a dinner, a block),
// Break it down and Spread it out, the meal board and the grocery list, every Sunday Reset step, a to-do's sheet
// in each state it can be in, the rituals with a week behind them (Look back with notes, a to-do whose date is
// over, the finish asking who cooks, a dinner with nobody cooking, the store view with the cart open, a prep
// week, Same as an earlier week), every Settings page, toasts (over a sheet too), the band at each time of day
// (the clock held on a made up board), the night, and Larger text. Each state is measured by
// lib/contrast-core.mjs. Made up boards only: a fresh browser profile per size, the sample family (Look around
// first, then changed in place with made up to-dos, dates, and dinners), and Dev's sample week.
export const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
export const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
export const DUO = 'Mozilla/5.0 (Linux; Android 14; Surface Duo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36';
export const SIZES = {
  phone: { w: 390, h: 844, mobile: true, dpr: 3, label: 'iPhone 390x844', ua: IPHONE },
  duoFold: { w: 386, h: 580, mobile: true, dpr: 3, label: 'Duo folded 386x580', ua: IPHONE },
  duoOpen: { w: 951, h: 669, mobile: true, dpr: 3, label: 'Duo open 951x669', ua: DUO },
  ipad: { w: 1024, h: 1366, mobile: true, dpr: 2, label: 'iPad 1024x1366', ua: IPAD },
  mac: { w: 1440, h: 900, mobile: false, dpr: 2, label: 'Mac 1440x900', ua: null }
};
/* the groups of screens, in the order they're walked (-screens picks some) */
export const GROUPS = ['first', 'look', 'phone', 'today', 'planner', 'panels', 'goals', 'breakdown', 'meals', 'more', 'reset', 'todos', 'rituals', 'settings', 'toasts', 'band', 'bigtext'];

const J = (v) => JSON.stringify(v);

export async function walk(t) {
  const narrow = t.S.w < 600;
  const desk = !narrow;
  /* close whatever is open: the menu, a mat, the reset, Settings, a panel, a sheet */
  const base = async (mode) => {
    await t.ev(`(async () => {
      const w = (ms) => new Promise((r) => setTimeout(r, ms));
      try { if (window.Kit && Kit.v7 && Kit.v7.closeMenu) Kit.v7.closeMenu(); } catch (e) {}
      try { if (document.querySelector('.c-mat') && Kit.v7.closeMat) { Kit.v7.closeMat(true); await w(300); } } catch (e) {}
      try { if (SR.view.reset) { SR.leaveReset(); await w(300); } } catch (e) {}
      try { SR.closeDrawer(); } catch (e) {}
      for (let k = 0; k < 3; k++) {
        const x = [...document.querySelectorAll('.k-sheet button, .sheet button, .side button, .c-mpop button, .c-timer button, .c-dock button, .c-more button, .k-scrim + * button')].find((b) => b.offsetParent && /^(close|close setup)/i.test((b.getAttribute('aria-label') || '').trim()));
        if (!x) break;
        x.click(); await w(250);
      }
      try { if (SR.view.sel) { SR.view.sel = null; SR.render(); } } catch (e) {}
      document.querySelectorAll('.toast').forEach((e) => e.remove());
      return 1;
    })()`);
    if (mode) await t.ev(`(() => { if (SR.view.mode !== ${J(mode)}) SR.setMode(${J(mode)}); return 1; })()`);
    await t.sleep(500);
  };
  const shown = (sel) => t.ev(`!!([...document.querySelectorAll(${J(sel)})].find((e) => e.offsetParent || getComputedStyle(e).position === 'fixed'))`);
  /* the title of what's on top: the setup's sheet, V11's own sheets, a mat, a panel, Settings */
  const title = () => t.ev(`(() => { const sels = ['#sheet:not([hidden]) #sheet-h', '#sheet:not([hidden]) h2', '.k-sheet:not([hidden]) h1', '.k-sheet:not([hidden]) h2', '.c-mat h1', '.c-mat h2', '#side:not([hidden]) .side-title', '#side:not([hidden]) h2', '#drawer:not([hidden]) h2', 'h1', 'h2']; for (const q of sels) { const h = [...document.querySelectorAll(q)].find((e) => (e.offsetParent || getComputedStyle(e).position === 'fixed') && e.textContent.trim()); if (h) return h.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60); } return ''; })()`);

  /* == the first visit: the welcome, then the setup a page at a time == */
  if (t.want('first')) {
    /* the front door from a shared link says who shared it */
    await t.fresh('from=Russell');
    await t.M('First visit: from a shared link');
    await t.fresh();
    await t.M('First visit: the welcome');
    /* its folds open (Other ways in, and on iPhone and iPad Safari, how to add it to the Home Screen first) */
    if (await t.ev(`(() => { const d = [...document.querySelectorAll('#sheet details')].filter((x) => x.offsetParent && !x.open); d.forEach((x) => { x.open = true; }); return d.length; })()`)) {
      await t.sleep(700);
      await t.M('First visit: the welcome, its folds open');
      await t.ev(`(() => { document.querySelectorAll('#sheet details').forEach((x) => { x.open = false; }); window.scrollTo(0, 0); const s = document.querySelector('#sheet .onb-scroll, #sheet'); if (s) s.scrollTop = 0; return 1; })()`);
      await t.sleep(400);
    }
    /* (the welcome's main button: Start, or Set up my week on the first screen) */
    if (await t.click(/^(Start|Set up my week)/)) {
      await t.sleep(1200);
      const seenTitles = new Set();
      for (let i = 0; i < 26; i++) {
        const ti = (await title()) || 'step ' + i;
        if (!seenTitles.has(ti) && /further ahead/i.test(ti)) {
          /* the zoom there plays by itself; a tap stops it, so each level is measured standing still */
          seenTitles.add(ti);
          for (const lv of ['Day', 'Week', 'Month', 'Year']) {
            if (await t.click(new RegExp('^' + lv + '$'), '.onb-zoom button')) { await t.sleep(1400); await t.M('Setup: ' + ti + ' (' + lv + ')'); }
          }
          /* a date that's a goal is offered as one, right where it's typed; then made one */
          const typed = await t.ev(`(() => {
            const box = document.querySelector('#sheet:not([hidden])') || document;
            const nm = [...box.querySelectorAll('.onb-soon input')].find((e) => e.offsetParent && e.type !== 'date');
            if (!nm) return false;
            nm.value = 'Pass the bar exam'; nm.dispatchEvent(new Event('input', { bubbles: true }));
            const when = [...box.querySelectorAll('.onb-suggest, button')].find((b) => b.offsetParent && /^In 3 months$/.test(b.textContent.trim()));
            if (when) when.click();
            return !!when;
          })()`);
          if (typed) {
            await t.sleep(3200);
            if (await shown('.onb-goal-offer:not([hidden])')) {
              await t.M('Setup: ' + ti + ', a goal offered');
              if (await t.click(/^Make it a goal$/, '.onb-goal-offer button')) { await t.sleep(1200); await t.M('Setup: ' + ti + ', made a goal'); }
              await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.remove()), 1`);
            }
          }
        }
        if (!seenTitles.has(ti)) { seenTitles.add(ti); await t.M('Setup: ' + ti); }
        /* answer so every page shows: a name, a family with kids, two things in the way, meals */
        await t.ev(`(() => {
          const vis = (e) => e && e.offsetParent;
          const box = document.querySelector('.k-sheet:not([hidden]), .sheet:not([hidden])') || document;
          const inp = [...box.querySelectorAll('input[type=text], input:not([type])')].find((e) => vis(e) && !e.value);
          if (inp && /name/i.test((inp.getAttribute('aria-label') || '') + (inp.placeholder || '') + (inp.closest('label, .field') || {}).textContent)) { inp.value = 'Pat'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
          const pick = (re) => { const b = [...box.querySelectorAll('button')].find((e) => vis(e) && re.test(e.textContent.trim()) && e.getAttribute('aria-pressed') !== 'true'); if (b) b.click(); return !!b; };
          pick(/^A family with kids/);
          pick(/^Too much lives in my head/); pick(/^Dinner is a nightly scramble/);
          const kid = [...box.querySelectorAll('input')].find((e) => vis(e) && /kid|child|name/i.test((e.getAttribute('aria-label') || '') + (e.placeholder || '')) && !e.value);
          if (kid) { kid.value = 'Robin'; kid.dispatchEvent(new Event('input', { bubbles: true })); kid.dispatchEvent(new Event('change', { bubbles: true })); }
          return 1;
        })()`);
        await t.sleep(300);
        /* the plan's build narrates and waits for See my plan */
        for (let k = 0; k < 12 && await t.ev(`!![...document.querySelectorAll('button')].find((b) => b.offsetParent && /^See my plan$/.test(b.textContent.trim()) && b.disabled)`); k++) {
          if (k === 2) { const ti2 = (await title()) || 'build'; if (!seenTitles.has(ti2 + ' (building)')) { seenTitles.add(ti2 + ' (building)'); await t.M('Setup: ' + ti2 + ' (building)', { focus: false }); } }
          await t.sleep(700);
        }
        const r = await t.click(/^(Next|See my plan|Open my week)$/);
        if (!r) break;
        await t.sleep(1300);
        if (r === 'Open my week') { await t.sleep(1500); await t.M('After the setup: the board'); break; }
      }
    }
  }

  /* == Look around first: the made up family becomes this browser's board for the rest == */
  await t.fresh();
  if (await t.click(/^(Look around first|Look at a sample week)$/)) await t.sleep(2500);
  /* (a phone's first look is its desk, one day; List goes back to the phone's own Today) */
  const phoneDesk = await t.ev(`document.body.classList.contains('phone-desk')`);
  if (t.want('look')) await t.M(phoneDesk ? 'Look around first: the phone desk' : narrow ? 'Look around first: the phone list' : 'Look around first: the desk');
  if (phoneDesk) { await t.ev(`(() => { if (SR.closePhoneDesk) SR.closePhoneDesk(); return 1; })()`); await t.sleep(1200); }
  /* the first look's coach (A sample week, Got it) is put away, the way a person does, so the rest isn't dimmed */
  for (let k = 0; k < 3; k++) { if (!(await t.click(/^Got it$/))) break; await t.sleep(600); }
  /* a board saved here is what the phone's keep-this-week note asks about */
  await t.ev(`(() => { try { __reset.edit((s) => { s.settings.cxProbe = 1; }); } catch (e) {} return 1; })()`);
  await t.sleep(400);
  await t.ev(`SR.render(), 1`);
  await t.sleep(600);

  /* == the phone's own Today: the list to its end, every card, the phone's desk == */
  if (narrow && t.want('phone')) {
    await t.M('Phone list (to the end, with every card)');
    if (await t.click(/^Open the desk$/)) {
      await t.sleep(1800);
      await t.M('Phone desk: one day');
      await t.ev(`(() => { const b = SR.day(SR.today).blocks.find((x) => !x.sleep && x.dur >= 30); if (b) SR.selectBlock(SR.today, b.key); return 1; })()`);
      await t.sleep(900);
      await t.M('Phone desk: a picked block');
      await t.ev(`(() => { if (SR.closePhoneDesk) SR.closePhoneDesk(); return 1; })()`);
      await t.sleep(900);
    }
  }

  /* == the desk in Today: the band, the menu, To-dos, Add == */
  if (desk && t.want('today')) {
    await base('today');
    await t.M('Today: the desk and the band');
    /* a block's panel in Today: on the open Duo's book page it stands over the band's page, the day on its own */
    const rk = await t.ev(`(() => { const b = SR.day(SR.today).blocks.find((x) => !x.sleep && !x.fixed && !x.dinner && !x.meeting && !x.free && x.dur >= 30); return b ? b.key : ''; })()`);
    if (rk) {
      await t.ev(`(() => { try { SR.openSel({ type: 'block', date: SR.today, key: ${J(rk)} }); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(1000);
      if (await shown('.side:not([hidden]), .c-mat')) await t.M('Today: a block’s panel');
      await base('today');
    }
    await t.ev(`Kit.v7.openMenu(), 1`); await t.sleep(700);
    await t.M('Menu');
    await base('today');
    await t.ev(`Kit.v7.openTodos(), 1`); await t.sleep(900);
    await t.M('To-dos');
    await base('today');
    await t.ev(`SR.openQuick(), 1`); await t.sleep(700);
    await t.M('Add (quick add)');
    await t.ev(`(() => { const i = document.querySelector('.quick input, .quick textarea'); if (i) { i.value = 'Dentist Tuesday 3pm'; i.dispatchEvent(new Event('input', { bubbles: true })); } return 1; })()`); await t.sleep(600);
    await t.M('Add with words in it');
    await base('today');
  }

  /* == the Planner at each zoom, Block library, the kinds of day, the list == */
  if (desk && t.want('planner')) {
    await base('planner');
    for (const z of ['day', 'week', 'month', 'year']) {
      await t.ev(`SR.setZoom(${J(z)}), 1`); await t.sleep(1300);
      await t.M('Planner: ' + z);
      if (z === 'day') {
        if (await t.click(/^Block library$/)) { await t.sleep(1000); await t.M('Planner: Block library'); await t.click(/^Block library$/); await t.sleep(500); }
        const k = await t.ev(`(() => { const b = document.querySelector('#kinds button, .c-kinds button, .kinds button'); if (b && b.offsetParent) { b.click(); return true; } return false; })()`);
        if (k) { await t.sleep(700); await t.M('Planner: the kinds of day'); await t.key('Escape'); await t.sleep(400); }
      }
    }
    if (await t.click(/^List$/)) { await t.sleep(900); await t.M('Planner: the week as a list'); await t.click(/^List$/); await t.sleep(500); }
    await t.ev(`SR.setZoom('week'), 1`); await t.sleep(600);
    await base('planner');
  }

  /* == panels and sheets: a to-do, a dinner, a block, a day, help, and the rest == */
  if (t.want('panels')) {
    await base('planner');
    const today = await t.ev('SR.today');
    const blocks = JSON.parse(await t.ev(`JSON.stringify(SR.day(SR.today).blocks.map((b) => ({ key: b.key, tpl: b.tpl || '', fixed: !!b.fixed, add: !!b.add, meeting: !!b.meeting, dinner: !!b.dinner, sleep: !!b.sleep, free: !!b.free })))`));
    const pickB = (f) => blocks.find(f);
    const tasks = JSON.parse(await t.ev(`JSON.stringify((SR.state.tasks || []).filter((x) => !x.done).map((x) => ({ id: x.id, steps: (x.steps || []).length })))`));
    const withSteps = tasks.find((x) => x.steps > 0), noSteps = tasks.find((x) => !x.steps) || tasks[0];
    const sels = [
      ['A to-do (sheet)', withSteps && { type: 'task', id: withSteps.id }],
      ['A to-do with no steps', noSteps && { type: 'task', id: noSteps.id }],
      ['Give it a time (place panel)', noSteps && { type: 'place', spec: { kind: 'task', id: noSteps.id } }],
      ['Dinner (sheet)', { type: 'dinner', date: today }],
      ['A routine block (sheet)', pickB((b) => !b.fixed && !b.sleep && !b.dinner && !b.meeting && !b.add) && { type: 'block', date: today, key: pickB((b) => !b.fixed && !b.sleep && !b.dinner && !b.meeting && !b.add).key }],
      ['A locked block', pickB((b) => b.fixed && !b.sleep && !b.meeting) && { type: 'block', date: today, key: pickB((b) => b.fixed && !b.sleep && !b.meeting).key }],
      ['A weekly meeting', pickB((b) => b.meeting) && { type: 'block', date: today, key: pickB((b) => b.meeting).key }],
      ['The day', { type: 'day', date: today }],
      ['New to-do', { type: 'newTask' }],
      ['New block', { type: 'newBlock' }],
      ['Weekly meetings', { type: 'meetings' }],
      ['Overlaps', { type: 'clashes' }],
      ['How it works', { type: 'help' }],
      ['Getting started', { type: 'moves' }],
      ['Save this day as a kind', { type: 'savePreset', date: today }],
      ['Something isn’t working', { type: 'feedback' }]
    ];
    for (const [name, sel] of sels) {
      if (!sel) continue;
      await t.ev(`(() => { try { SR.openSel(${J(sel)}); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(900);
      if (await shown('.side:not([hidden]), .k-sheet:not([hidden]), .sheet:not([hidden]), .c-mat')) await t.M('Panel: ' + name);
      await base(narrow ? null : 'planner');
    }
    /* a block's own mat (V11's detail): a routine */
    const rb = pickB((b) => !b.fixed && !b.sleep && !b.dinner && !b.meeting && !b.add);
    if (rb && desk) {
      await t.ev(`(() => { try { Kit.v7.openDetail({ type: 'block', date: ${J(today)}, key: ${J(rb.key)} }); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(1400);
      if (await shown('.c-mat')) await t.M('A block’s own mat');
      await base('planner');
    }
  }

  /* == goals: Goals, New goal page by page, a goal, a session == */
  if (t.want('goals')) {
    await base('planner');
    await t.ev(`SR.openGoals(), 1`); await t.sleep(900);
    await t.M('Goals');
    await base('planner');
    await t.ev(`SR.openGoal({ name: 'Run a 5k' }), 1`); await t.sleep(900);
    const seenG = new Set();
    for (let i = 0; i < 9; i++) {
      const ti = await title();
      if (!seenG.has(ti)) { seenG.add(ti); await t.M('New goal: ' + ti); }
      await t.ev(`(() => { const d = [...document.querySelectorAll('.side input[type=date]')].find((e) => e.offsetParent && !e.value); if (d) { const x = new Date(Date.now() + 60 * 864e5); d.value = x.toISOString().slice(0, 10); d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true })); } return 1; })()`);
      await t.sleep(300);
      /* (Next, page by page, then the button that makes the goal: Start the plan since Oct 15, when New goal became
         three pages. Make it fit, the time page's one quiet way to add more, isn't a way on) */
      const r = await t.click(/^(Next|Start the plan|Make it$|Add it|Add the goal|Save the goal|Start it|Make the plan|Looks good)/, '.side button');
      if (!r) break;
      await t.sleep(1000);
      if (/^(Start the plan|Make it$|Add it|Add the goal|Save the goal|Start it)/.test(r)) break;
    }
    await t.M('Goal: after it’s made');
    const sess = await t.ev(`(() => { for (let k = 0; k < 14; k++) { const d = SR.M.addDays(SR.today, k); const b = SR.day(d).blocks.find((x) => SR.isSession && SR.isSession(x)); if (b) return JSON.stringify({ date: d, key: b.key }); } return ''; })()`);
    const gid = await t.ev(`((SR.state.goals || [])[0] || {}).id || ''`);
    await base('planner');
    if (gid) { await t.ev(`SR.openSel({ type: 'goal', id: ${J(gid)} }), 1`); await t.sleep(900); await t.M('A goal (sheet)'); await base('planner'); }
    if (sess) { const s = JSON.parse(sess); await t.ev(`SR.openSel({ type: 'block', date: ${J(s.date)}, key: ${J(s.key)} }), 1`); await t.sleep(900); await t.M('A goal’s session (sheet)'); await base('planner'); }
  }

  /* == Break it down and Spread it out == */
  if (t.want('breakdown')) {
    await base('planner');
    const ids = JSON.parse(await t.ev(`JSON.stringify((SR.state.tasks || []).filter((x) => !x.done).map((x) => ({ id: x.id, steps: (x.steps || []).length })))`));
    const one = ids.find((x) => !x.steps) || ids[0], many = ids.find((x) => x.steps > 1) || ids[0];
    if (one) { await t.ev(`SR.breakDown(${J(one.id)}), 1`); await t.sleep(1000); await t.M('Break it down'); await base('planner'); }
    if (many) { await t.ev(`SR.spreadOut(${J(many.id)}), 1`); await t.sleep(1000); await t.M('Spread it out'); await base('planner'); }
  }

  /* == the meal board and the grocery list == */
  if (t.want('meals')) {
    await base(narrow ? null : 'planner');
    await t.ev(`window.SR_planMeals && SR_planMeals(), 1`); await t.sleep(1600);
    if (await shown('.c-mat')) await t.M('Meal board');
    await base(narrow ? null : 'planner');
    await t.ev(`window.SR_planMeals && SR_planMeals({ week: SR.M.weekStart(SR.today), shop: true }), 1`); await t.sleep(1600);
    if (await shown('.c-mat')) await t.M('Grocery list');
    await base(narrow ? null : 'planner');
  }

  /* == the menu's other places: This week's plan, People, Focus on one thing, the Pomodoro timer == */
  if (desk && t.want('more')) {
    for (const item of ['This week’s plan', 'People', 'Focus on one thing', 'Pomodoro timer']) {
      await base('planner');
      await t.ev(`Kit.v7.openMenu(), 1`); await t.sleep(500);
      const re = new RegExp('^' + item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
      if (await t.click(re, '.c-menu button, .c-menu [role=menuitem]')) { await t.sleep(1500); await t.M(item); }
    }
    await base('planner');
  }

  /* == the Sunday Reset: its first page, then every step == */
  if (t.want('reset')) {
    await base('planner');
    await t.ev(`SR.startReset(SR.resetWeek()), 1`); await t.sleep(1400);
    await t.M('Sunday Reset: the start');
    const steps = JSON.parse(await t.ev(`JSON.stringify(SR.stepsNow().map((s) => s.id || s.key || String(s)))`) || '[]');
    for (let i = 0; i < steps.length; i++) {
      await t.ev(`(() => { if (!SR.view.reset) SR.startReset(SR.resetWeek()); SR.goStep(${i}); return 1; })()`);
      await t.sleep(1400);
      await t.M('Sunday Reset: ' + steps[i]);
    }
    await base('planner');
  }

  /* == a to-do's sheet in each state it can be in (on a phone the sheet, on a computer the panel beside the week):
     More, Delete asking again, Details, a step open, Change, steps that don't fit by the day, a step that went by,
     every step done, and done. The to-dos are made up here, on this browser's own board == */
  if (t.want('todos')) {
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { try { __reset.edit((s) => {
      const M = SR.M, today = SR.today, inbox = (s.groups.find((g) => g.id === 'inbox') || s.groups[0]).id;
      const S = (id, list) => list.map((x, i) => ({ id: id + '-s' + (i + 1), name: x[0], dur: x[1], done: !!x[2] }));
      const T = (id, name, due, steps, extra) => Object.assign({ id, name, group: inbox, icon: 'check', cat: 'home', due, dur: null, repeat: null, done: false, steps: S(id, steps) }, extra || {});
      const add = (d, a) => { s.dates[d] = s.dates[d] || {}; (s.dates[d].adds = s.dates[d].adds || []).push(a); };
      s.tasks = s.tasks.filter((x) => !/^cx-ts-/.test(x.id));
      s.tasks.push(
        T('cx-ts-fit', 'Plan the garden', M.addDays(today, 9), [['Measure the beds', 30], ['Pick the plants', 30]]),
        T('cx-ts-big', 'Write the grant proposal', M.addDays(today, 1), [['Outline it', 240], ['Write the draft', 480], ['Edit it', 240]], { cat: 'work', icon: 'laptop' }),
        T('cx-ts-went', 'Sort the photos', M.addDays(today, 6), [['Pick the best ones', 30], ['Print them', 20]]),
        T('cx-ts-all', 'Clean out the fridge', M.addDays(today, 2), [['Toss what’s old', 15, true], ['Wipe the shelves', 15, true]]),
        T('cx-ts-done', 'Mail the rent check', M.addDays(today, 1), [], { dur: 15, done: true }));
      add(M.addDays(today, -1), { id: 'cx-ts-went-a', name: 'Pick the best ones', cat: 'home', icon: 'check', start: 600, dur: 30, src: { type: 'step', task: 'cx-ts-went', id: 'cx-ts-went-s1' } });
    }); } catch (e) { return String(e); } return 1; })()`);
    await t.sleep(500);
    const openTd = async (id) => { await base(narrow ? null : 'planner'); await t.ev(`(() => { try { SR.openSel({ type: 'task', id: ${J(id)} }); } catch (e) { return String(e); } return 1; })()`); await t.sleep(1000); return shown('.side:not([hidden])'); };
    if (await openTd('cx-ts-fit')) {
      await t.M('To-do: steps with no time yet');
      if (await t.click(/^Change$/, '#side button')) { await t.sleep(1000); await t.M('To-do: Change'); }
    }
    if (await openTd('cx-ts-fit')) {
      await t.ev(`(() => { SR.view.got.tsOpen = { id: 'cx-ts-fit', step: 'cx-ts-fit-s1' }; SR.render(); return 1; })()`);
      await t.sleep(900);
      await t.M('To-do: a step open');
    }
    /* More, opened afresh (a menu left open, or a delete still asking, is let go first) */
    const openMore = () => t.ev(`(() => { SR.view.got.tsMenu = null; SR.view.confirm = null; SR.render(); const b = document.querySelector('#side .c-smore-btn'); if (!b) return false; if (b.getAttribute('aria-expanded') !== 'true') b.click(); return true; })()`);
    if (await openTd('cx-ts-fit') && await openMore()) {
      await t.sleep(700);
      await t.M('To-do: More');
      if (await t.click(/^Delete to-do$/, '#side .c-smenu button')) { await t.sleep(600); await t.M('To-do: Delete asks again'); }
    }
    if (await openTd('cx-ts-fit') && await openMore()) {
      await t.sleep(600);
      if (await t.click(/^Details/, '#side .c-smenu button')) { await t.sleep(1000); await t.M('To-do: Details'); }
    }
    await t.ev(`(() => { SR.view.got.tsMenu = null; SR.view.confirm = null; return 1; })()`);
    for (const [id, name] of [['cx-ts-big', 'steps that don’t fit by its day'], ['cx-ts-went', 'a step that went by'], ['cx-ts-all', 'every step done'], ['cx-ts-done', 'done']]) {
      if (await openTd(id)) await t.M('To-do: ' + name);
    }
    await base(narrow ? null : 'planner');
  }

  /* == the rituals with a week behind them (the reset's walk): Look back with what was said last time, a to-do whose
     date is over, the finish asking who cooks, a dinner with nobody cooking, and the meal board's store view with
     the cart open, a prep week, and Same as an earlier week. The week behind is made up here: the board is older,
     last week's reset was done with its two notes, two to-dos were on it, and two nights next week have a dish and
     nobody cooking it == */
  if (t.want('rituals')) {
    await base(narrow ? null : 'planner');
    const ws = await t.ev(`(() => { try { __reset.edit((s) => {
      const M = SR.M, today = SR.today, ws = SR.resetWeek(), lw = M.addDays(ws, -7), inbox = (s.groups.find((g) => g.id === 'inbox') || s.groups[0]).id;
      const add = (d, a) => { s.dates[d] = s.dates[d] || {}; (s.dates[d].adds = s.dates[d].adds || []).push(a); };
      const T = (id, name, due, extra) => Object.assign({ id, name, group: inbox, icon: 'check', cat: 'home', due, dur: 30, repeat: null, done: false, steps: [] }, extra || {});
      s.created = M.addDays(ws, -60);
      s.weeks[lw] = Object.assign({}, s.weeks[lw]);
      s.weeks[lw].reset = Object.assign({ step: 0 }, s.weeks[lw].reset, { done: true, keep: 'A walk before work', change: 'Plan meals before 5 pm', saidOn: lw });
      s.tasks = s.tasks.filter((x) => !/^cx-rt-/.test(x.id));
      s.tasks.push(T('cx-rt-done', 'Call the plumber', M.addDays(lw, 2), { done: true }), T('cx-rt-open', 'Return the library books', M.addDays(lw, 4)));
      add(M.addDays(lw, 2), { id: 'cx-rt-a1', name: 'Call the plumber', cat: 'home', icon: 'check', start: 600, dur: 30, src: { type: 'task', id: 'cx-rt-done' } });
      add(M.addDays(lw, 4), { id: 'cx-rt-a2', name: 'Return the library books', cat: 'home', icon: 'check', start: 1080, dur: 30, src: { type: 'task', id: 'cx-rt-open' } });
      [1, 2, 3].forEach((n, i) => { const d = M.addDays(lw, n); if (!s.dinners[d]) s.dinners[d] = { name: ['Tacos', 'Stir fry', 'Pasta'][i], cook: 'me', items: [] }; });
      /* a to-do made for a date that's gone by (costumes after the festival) */
      const on = M.addDays(today, -3);
      s.tasks.push(T('cx-rt-over', 'Costumes for the fall festival', M.addDays(on, -1), { dur: 60, cat: 'family' }));
      s.events = (s.events || []).filter((e) => e.id !== 'cx-rt-fest');
      s.events.push({ id: 'cx-rt-fest', kind: 'marker', name: 'Fall festival', icon: 'star', date: on, prep: { ['costume@' + on]: 'cx-rt-over' } });
      /* two nights in the week being planned with a dish and nobody cooking it, and one with its groceries */
      s.dinners[M.addDays(ws, 4)] = { name: 'Chili', cook: '', items: [] };
      s.dinners[M.addDays(ws, 5)] = { name: 'Pasta bake', cook: '', items: [] };
      s.dinners[M.addDays(ws, 6)] = { name: 'Tacos', recipe: 'tacos', cook: 'me', items: ['beef', 'tortillas', 'peppers', 'onion'] };
    }); } catch (e) { return 'error: ' + e; } return SR.resetWeek(); })()`);
    await t.sleep(600);
    const keys = JSON.parse(await t.ev(`(() => { SR.startReset(SR.resetWeek()); return JSON.stringify(SR.stepsNow().map((s) => s.key)); })()`) || '[]');
    await t.sleep(1200);
    for (const [key, name] of [['back', 'Look back, with what was said last time'], ['todo', 'To-dos, with one whose date is over'], ['done', 'the finish, asking who cooks']]) {
      const i = keys.indexOf(key);
      if (i < 0) continue;
      await t.ev(`(() => { if (!SR.view.reset) SR.startReset(SR.resetWeek()); SR.goStep(${i}); return 1; })()`);
      await t.sleep(1500);
      await t.M('Sunday Reset: ' + name);
    }
    await base(narrow ? null : 'planner');
    if (/^\d{4}-/.test(String(ws))) {
      await t.ev(`(() => { try { SR.openSel({ type: 'dinner', date: SR.M.addDays(${J(ws)}, 4) }); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(1000);
      if (await shown('.side:not([hidden]), .c-mat')) await t.M('Dinner: a dish with nobody cooking it');
      await base(narrow ? null : 'planner');
      await t.ev(`(() => { try { SR.openSel({ type: 'task', id: 'cx-rt-over' }); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(1000);
      if (await shown('.side:not([hidden])')) await t.M('To-do: its date is over');
      await base(narrow ? null : 'planner');
      /* the store view: two things in the cart, and the cart open */
      await t.ev(`window.SR_planMeals && SR_planMeals({ week: ${J(ws)}, store: true }), 1`); await t.sleep(1800);
      if (await shown('.c-mat')) {
        await t.ev(`(() => { const ticks = [...document.querySelectorAll('.c-mat .c-shop-tick')].filter((x) => !x.checked).slice(0, 2); ticks.forEach((x, i) => setTimeout(() => x.click(), i * 250)); return ticks.length; })()`);
        await t.sleep(900);
        await t.ev(`(() => { const f = document.querySelector('.c-mat .c-cartfold'); if (f && f.getAttribute('aria-expanded') !== 'true') f.click(); document.querySelectorAll('.toast').forEach((e) => e.remove()); return 1; })()`);
        await t.sleep(900);
        await t.M('Groceries: the store view, the cart open');
      }
      await base(narrow ? null : 'planner');
      await t.ev(`window.SR_planMeals && SR_planMeals({ week: ${J(ws)}, prep: true }), 1`); await t.sleep(1800);
      if (await shown('.c-mat')) { await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.remove()), 1`); await t.M('Meal board: a prep week'); }
      await base(narrow ? null : 'planner');
      await t.ev(`window.SR_planMeals && SR_planMeals({ week: ${J(ws)}, weeks: true }), 1`); await t.sleep(1800);
      if (await shown('.c-mat')) await t.M('Meal board: Same as an earlier week');
      await base(narrow ? null : 'planner');
    }
  }

  /* == Settings: the overview and every page (a page this board doesn't have is skipped) == */
  if (t.want('settings')) {
    await base(narrow ? null : 'planner');
    await t.ev(`SR.openDrawer('overview'), 1`); await t.sleep(1000);
    await t.M('Settings: Overview');
    const seenPages = new Set(['Overview']);
    for (const p of ['you', 'days', 'reset', 'library', 'calendars', 'desk', 'reading', 'smart', 'bar', 'sync', 'remind', 'data', 'help', 'dev']) {
      await t.ev(`(() => { if (document.getElementById('drawer').hidden) SR.openDrawer(${J(p)}); else if (window.__reset && __reset.goPage) __reset.goPage(${J(p)}); else SR.openDrawer(${J(p)}); return 1; })()`);
      await t.sleep(900);
      const h = await t.ev(`(() => { const e = [...document.querySelectorAll('#drawer .set-h')].find((x) => x.offsetParent); return e ? e.textContent.trim() : ''; })()`);
      if (!h || seenPages.has(h)) continue;
      seenPages.add(h);
      await t.M('Settings: ' + h);
    }
    await base(narrow ? null : 'planner');
  }

  /* == toasts: one with Undo, one good, one that went wrong == */
  if (t.want('toasts')) {
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { SR.toast('Laundry moved to Saturday', '', { label: 'Undo', fn: () => {} }); SR.toast('Your week is set', 'good'); SR.toast('Couldn’t save that change', 'bad'); return 1; })()`);
    await t.sleep(900);
    await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.dispatchEvent(new MouseEvent('mouseenter'))), 1`);
    await t.M('Toasts', { scroll: false });
    await base(narrow ? null : 'planner');
    /* a toast over an open panel (on a phone it stands over the sheet's foot) */
    const tid = await t.ev(`((SR.state.tasks || []).find((x) => !x.done && (x.steps || []).length) || {}).id || ''`);
    if (tid) {
      await t.ev(`(() => { try { SR.openSel({ type: 'task', id: ${J(tid)} }); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(1000);
      await t.ev(`(() => { SR.toast('Pull the numbers is open again.', '', { label: 'Undo', fn: () => {} }); return 1; })()`);
      await t.sleep(900);
      await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.dispatchEvent(new MouseEvent('mouseenter'))), 1`);
      await t.M('Toasts: over a panel', { scroll: false });
      await base(narrow ? null : 'planner');
    }
  }

  /* == the band at each time of day, on a made up board with the clock held, and the night look == */
  if (t.want('band')) {
    await base(null);
    await t.ev(`SR.devBoard('sample'), 1`); await t.sleep(2000);
    await t.ev(`(() => { if (SR.view.mode !== 'today') SR.setMode('today'); return 1; })()`); await t.sleep(600);
    const times = [[600, 'in a block, 10 am'], [1001, 'the last five minutes'], [470, 'open time, 7:50 am'], [480, 'the morning question, 8 am'], [930, 'the dinner question, 3:30 pm'], [1200, 'free time, 8 pm'], [1290, 'after 9 pm'], [1400, 'asleep, 11:20 pm']];
    for (const [min, name] of times) {
      await t.ev(`(() => { __reset.at(${min}); if (SR.view.mode !== 'today') SR.setMode('today'); return 1; })()`);
      await t.sleep(1300);
      await t.M((narrow ? 'Phone list at ' : 'Band: ') + name, { scroll: narrow });
    }
    /* the preview bar and the Dev menu (on this computer) */
    if (desk) { await t.ev(`__reset.at(600), 1`); await t.sleep(600); await t.M('Dev: a made up board, its bar', { scroll: false }); }
    await t.ev(`(() => { try { __reset.at(null); } catch (e) {} try { SR.endPreview(); } catch (e) {} return 1; })()`);
    await t.sleep(1200);
  }

  /* == Larger text == */
  if (t.want('bigtext')) {
    await base(narrow ? null : 'today');
    await t.ev(`(() => { SR.view.bigText = true; document.body.classList.add('big-text'); SR.render(); return 1; })()`);
    await t.sleep(900);
    await t.M(narrow ? 'Larger text: the phone list' : 'Larger text: the desk');
    const id = await t.ev(`((SR.state.tasks || []).find((x) => !x.done && (x.steps || []).length) || {}).id || ''`);
    if (id) { await t.ev(`SR.openSel({ type: 'task', id: ${J(id)} }), 1`); await t.sleep(900); await t.M('Larger text: a to-do'); await base(null); }
    await t.ev(`SR.openDrawer('reading'), 1`); await t.sleep(900); await t.M('Larger text: Settings'); await base(null);
    await t.ev(`(() => { SR.view.bigText = false; document.body.classList.remove('big-text'); SR.render(); return 1; })()`);
  }
}
