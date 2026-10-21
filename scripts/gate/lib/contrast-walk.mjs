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
export const GROUPS = ['first', 'look', 'phone', 'today', 'planner', 'panels', 'goals', 'breakdown', 'meals', 'more', 'reset', 'todos', 'rituals', 'big', 'quick', 'settings', 'toasts', 'band', 'next', 'focus', 'bigtext'];

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
        if (!seenTitles.has(ti)) {
          seenTitles.add(ti); await t.M('Setup: ' + ti);
          /* V11-2 (Oct 20, the setup made to read as Sunday Reset): the reset's calendar, said the way it happens: the file saved (downloads are
             refused here, so nothing reaches the computer's Downloads), then Done, it's in my calendar; and Another
             time, with its seven days and the time as a chip */
          if (/Sunday Reset\?$/.test(ti)) {
            try { await t.c.send('Page.setDownloadBehavior', { behavior: 'deny' }); } catch (e) { /* an older Chrome: it has no say */ }
            if (await t.click(/^Add it to my calendar$/, '#sheet button')) { await t.sleep(700); await t.M('Setup: ' + ti + ' (the file saved)'); }
            if (await t.click(/^Done, it’s in my calendar$/, '#sheet button')) { await t.sleep(700); await t.M('Setup: ' + ti + ' (in the calendar)'); }
            if (await t.click(/^Another time/, '#sheet button')) { await t.sleep(900); await t.M('Setup: ' + ti + ' (another time)'); }
          }
        }
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
    /* V11-2: Undo on the phone that stays: a change named in its toast, its Undo in the head card once the toast has
       gone, then Redo once it was undone (the phone desk's bar below shows the same, as marks) */
    const changed = await t.ev(`(() => { if (!window.__reset || !__reset.edit) return false; __reset.edit((st) => { st.settings = Object.assign({}, st.settings, { gateMark: (st.settings.gateMark || 0) + 1 }); }); SR.toast('Walk is on Thursday at 5:15 pm.', '', { label: 'Undo', fn: __reset.undo }); return true; })()`);
    if (changed === true) {
      await t.sleep(700);
      await t.ev(`(() => { document.querySelectorAll('#toasts .toast').forEach((e) => e.remove()); const v = document.getElementById('todayview'); if (v) v.scrollTop = 0; return 1; })()`);
      await t.sleep(300);
      await t.M('Phone: the last change’s Undo, in the head', { scroll: false });
      await t.ev(`(() => { const b = document.querySelector('[data-fk="td-head-undo"]'); if (b) b.click(); return !!b; })()`);
      await t.sleep(900);
      await t.ev(`(() => { document.querySelectorAll('#toasts .toast').forEach((e) => e.remove()); return 1; })()`);
      await t.M('Phone: Redo, once something was undone', { scroll: false });
    }
    /* (since Oct 15 the list's head opens the next seven days, and This week's to-dos open as a sheet of their own) */
    for (const [type, name] of [['next7', 'Phone: the next 7 days (sheet)'], ['dueSoon', 'Phone: due in the next 7 days (sheet)']]) {
      await t.ev(`(() => { try { SR.openSel({ type: ${J(type)} }); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(900);
      if (await shown('#side:not([hidden])')) await t.M(name);
      await t.ev(`(() => { const x = document.getElementById('side-x'); if (x && !document.getElementById('side').hidden) x.click(); return 1; })()`);
      await t.sleep(500);
    }
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
    if (one) {
      await t.ev(`SR.breakDown(${J(one.id)}), 1`); await t.sleep(1000); await t.M('Break it down');
      /* V11-2: Claude's ask didn't come, said as what happened, with Try again where it can help */
      if (await t.ev(`(() => { const d = window.__reset && __reset.view.suggest; if (!d) return false; d.ai = 'fail'; d.aiErr = { code: 'too_many', limit: 'minute', most: 10, at: Date.now() + 35000 }; __reset.render(); return true; })()`) === true) { await t.sleep(700); await t.M('Break it down: Claude’s ask didn’t come'); }
      await base('planner');
    }
    if (many) { await t.ev(`SR.spreadOut(${J(many.id)}), 1`); await t.sleep(1000); await t.M('Spread it out'); await base('planner'); }
  }

  /* == the meal board and the grocery list == */
  if (t.want('meals')) {
    await base(narrow ? null : 'planner');
    await t.ev(`window.SR_planMeals && SR_planMeals(), 1`); await t.sleep(1600);
    if (await shown('.c-mat')) await t.M('Meal board');
    await base(narrow ? null : 'planner');
    await t.ev(`window.SR_planMeals && SR_planMeals({ week: SR.M.weekStart(SR.today), shop: true }), 1`); await t.sleep(1600);
    if (await shown('.c-mat')) {
      await t.M('Grocery list');
      /* one thing got (its box checked, its name struck through) and one that isn't for a meal (with its x) */
      await t.ev(`(() => { const f = document.querySelector('.c-mat .c-shop-add .c-find'); if (f) { f.value = 'Milk'; f.dispatchEvent(new Event('input', { bubbles: true })); f.form.requestSubmit(); } return !!f; })()`);
      await t.sleep(700);
      await t.ev(`(() => { const x = [...document.querySelectorAll('.c-mat .c-shop-tick')].find((e) => !e.checked); if (x) x.click(); return !!x; })()`);
      await t.sleep(700);
      await t.ev(`(() => { document.querySelectorAll('.toast').forEach((e) => e.remove()); const p = document.querySelector('.c-mat .c-shop-paper'); if (p) p.scrollIntoView({ block: 'center' }); return 1; })()`);
      await t.sleep(600);
      await t.M('Grocery list: a thing got, and one not for a meal');
    }
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
        T('cx-ts-done', 'Mail the rent check', M.addDays(today, 1), [], { dur: 15, done: true }),
        /* V11-2: steps as bricks (a done one, Next on the week, one not on the week yet), and a message step */
        T('cx-ts-car', 'Renew the car registration', M.addDays(today, 4), [['Find the notice', 10, true], ['Pay online', 15], ['Put the sticker on', 5]], { icon: 'car' }),
        T('cx-ts-msg', 'Give Aunt Lisa a heads-up', M.addDays(today, 30), [], { dur: 5, icon: 'chat', cat: 'family', of: 'cx-ev-trip', msg: { to: 'Aunt Lisa' } }));
      s.tasks.find((x) => x.id === 'cx-ts-car').steps[0].doneOn = today;
      s.events = (s.events || []).filter((e) => e.id !== 'cx-ev-trip').concat({ id: 'cx-ev-trip', kind: 'trip', name: 'California', icon: 'plane', date: M.addDays(today, 58), end: M.addDays(today, 62), leave: 450, back: 1020 });
      { const d1 = M.addDays(today, 1), at = M.quietSlot(s, d1, 15, { when: 'any' }); if (at != null) M.placeAdd(s, d1, { name: 'Pay online', cat: 'home', icon: 'car', dur: 15, src: { type: 'step', task: 'cx-ts-car', id: 'cx-ts-car-s2' } }, at); }
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
    /* V11-2 (docs/BIG-MOMENTS.md, A): bricks done, Next, and not on the week; a message, its words edited, and asked
       whether it went (the walk never taps Text, which would leave for Messages) */
    if (await openTd('cx-ts-car')) await t.M('To-do: steps as bricks, done, Next, not on the week');
    if (await openTd('cx-ts-msg')) {
      await t.M('To-do: a message step');
      if (await t.click(/^Edit$/, '#side button')) { await t.sleep(900); await t.M('To-do: a message, its words edited'); }
      await t.ev(`(() => { SR.view.got.msgEdit = null; SR.view.got.texted = 'cx-ts-msg'; SR.render(); return 1; })()`);
      await t.sleep(700);
      await t.M('To-do: a message, sent?');
      await t.ev(`(() => { SR.view.got.texted = null; return 1; })()`);
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

  /* == V11-2, big moments (docs/BIG-MOMENTS.md, B): the countdown in each of its shapes (a trip with a heads-up next and
     its text being edited, the rest unfolded, a wedding out of town, a move sometime in spring and its pick, the bar
     exam with its stages, a goal with no date as weeks of dots), Goals with that goal in it, and the ways in: New date's
     Not sure yet and an event's kinds, the question a new trip asks, and quick add reading a trip and a heads-up. The
     dates and goals are made up here, through the real model, on this browser's own board (ids starting cx-) == */
  if (t.want('big')) {
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { try { __reset.edit((s) => {
      const M = SR.M, D = SR.D, T = SR.today, add = (n) => M.addDays(T, n);
      s.events = s.events.filter((e) => !/^cx-big-/.test(e.id));
      s.goals = (s.goals || []).filter((g) => !/^cx-big-/.test(g.id));
      const cal = { id: 'cx-big-cal', kind: 'trip', name: 'California', icon: 'plane', date: add(59), end: add(63), leave: 450, back: 1020 };
      cal.ready = M.readySuggest(cal, s); s.events.push(cal);
      M.addHeadsUp(s, cal, 'Aunt Lisa', 'LA');
      const rf = (e) => Object.fromEntries(M.readyFor(s, e, e.date, T).map((x) => [x.k + (x.who ? ':' + x.who : ''), x]));
      /* (travel, a place to stay, and the time off done, so the heads-up for Aunt Lisa is Next, with its text) */
      ['travel', 'stay', 'timeoff'].forEach((k) => { const r = rf(cal)[k]; if (r) { const td = M.prepTodo(s, cal, r, { group: 'inbox' }); td.done = true; } });
      const w = { id: 'cx-big-wed', kind: 'timed', occasion: true, away: true, name: 'Sam and Alex’s wedding', icon: 'people', cat: 'family', date: add(88), start: 960, dur: 300, big: true };
      w.ready = M.readySuggest(w, s); s.events.push(w);
      /* (a long weekend with the two of them going: who's covering Robin's drop-offs and pick-ups is next, with its text) */
      const cv = { id: 'cx-big-cov', kind: 'trip', name: 'Chicago', icon: 'plane', date: add(31), end: add(34), leave: 450, back: 1020, going: 'us' };
      cv.ready = M.readySuggest(cv, s); s.events.push(cv);
      ['travel', 'stay', 'timeoff'].forEach((k) => { const r = rf(cv)[k]; if (r) { const td = M.prepTodo(s, cv, r, { group: 'inbox' }); td.done = true; } });
      const mv = { id: 'cx-big-move', kind: 'marker', name: 'Moving day', icon: 'house', cat: 'home', date: null, window: M.windowFor('spring', T) };
      mv.ready = M.readySuggest(mv, s); s.events.push(mv);
      M.readyFor(s, mv, null, T).filter((r) => r.when === 'now' || r.when === 'soon').forEach((r) => M.prepTodo(s, mv, r, { group: 'inbox' }));
      const ex = M.goalForExam('Pass the bar exam', D);
      const bar = M.newGoal({ id: 'cx-big-bar', name: 'Pass the bar exam', kind: ex.kind, cat: ex.cat, icon: 'star', date: add(127), today: T, parts: ex.parts, mix: ex.mix, rhythm: { days: [0, 1, 2, 3, 4, 5, 6], wd: 120, we: 180, when: 'any', chunk: 60 } });
      s.goals.push(bar); M.planGoal(s, bar.id, T, SR.nowMin);
      const gs = M.newGoal({ id: 'cx-big-str', name: 'Get stronger', kind: 'skill', cat: 'yours', icon: 'star', today: add(-56), parts: [{ name: 'Strength', min: 0 }], rhythm: { n: 3, chunk: 45, when: 'any', days: [0, 1, 2, 3, 4, 5, 6], wd: 60, we: 60 } });
      s.goals.push(gs);
      const ws = M.weekStart(T);
      [3, 2, 3, 1, 3, 2, 3].forEach((n, i) => { const from = M.addDays(ws, -7 * (7 - i)); let k = 0; for (let dd = 1; dd < 7 && k < n; dd += 2) { const d = M.addDays(from, dd), at = M.quietSlot(s, d, 45, { when: 'any' }); if (at == null) continue; const r = M.placeAdd(s, d, { name: 'Strength', cat: 'yours', icon: 'dumbbell', dur: 45, src: { type: 'goal', id: gs.id, part: gs.parts[0].id } }, at); if (r && r.ok) { r.add.done = true; k++; } } });
      M.planGoal(s, gs.id, T, SR.nowMin);
    }); } catch (e) { return String(e); } return 1; })()`);
    await t.sleep(600);
    const cd = async (ref, name, then) => {
      await base(narrow ? null : 'planner');
      await t.ev(`(() => { try { SR.openCountdown(${J(ref)}); } catch (e) { return String(e); } return 1; })()`);
      await t.sleep(1100);
      if (!(await shown('#side:not([hidden]) .c-cd-head'))) return false;
      await t.M('Countdown: ' + name);
      if (then) await then();
      return true;
    };
    await cd({ event: 'cx-big-cal' }, 'a trip, the heads-up next', async () => {
      if (await t.click(/^\d+ more steps?$/, '#side .c-cd-fold') || await t.ev(`(() => { const f = document.querySelector('#side .c-cd-fold'); if (f) { f.click(); return 1; } return 0; })()`)) { await t.sleep(800); await t.M('Countdown: a trip, the rest unfolded'); }
      if (await t.click(/^Edit$/, '#side .c-msg button')) { await t.sleep(1000); await t.M('Countdown: editing the text'); }
      await t.ev(`(() => { SR.view.got.msgEdit = null; return 1; })()`);
    });
    await cd({ event: 'cx-big-wed' }, 'a wedding out of town', async () => {
      await t.ev(`(() => { const b = document.querySelector('#side .c-cd-add'); if (b) b.click(); return 1; })()`); await t.sleep(700);
      if (await shown('#side .c-cd-addin')) await t.M('Countdown: someone to see there');
    });
    await cd({ event: 'cx-big-move' }, 'a move sometime in spring', async () => {
      if (await t.click(/^Pick the date$/, '#side button')) { await t.sleep(900); await t.M('Countdown: picking the date'); }
    });
    await cd({ event: 'cx-big-cov' }, 'who’s covering, next');
    await cd({ goal: 'cx-big-bar' }, 'the bar exam');
    await cd({ goal: 'cx-big-str' }, 'a goal with no date');
    /* More, in the countdown's corner */
    if (await cd({ event: 'cx-big-cal' }, 'a trip, again')) {
      if (await t.ev(`(() => { const b = document.querySelector('#side .c-smore-btn'); if (!b) return false; b.click(); return true; })()`)) { await t.sleep(600); await t.M('Countdown: More'); }
    }
    await base(narrow ? null : 'planner');
    await t.ev(`SR.openGoals(), 1`); await t.sleep(1000);
    if (await shown('#side:not([hidden])')) await t.M('Goals: with a goal that has no date');
    /* New date: Not sure yet, an event's kinds, and the question a new trip asks once */
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { SR.view.got.ev = null; SR.openSel({ type: 'newEvent', date: SR.today, kind: 'marker' }); return 1; })()`); await t.sleep(900);
    await t.ev(`(() => { const i = [...document.querySelectorAll('#side input')].find((x) => x.type === 'text'); if (i) { i.value = 'Moving day'; i.dispatchEvent(new Event('input', { bubbles: true })); } return 1; })()`);
    if (await t.click(/^Not sure yet$/, '#side button')) {
      await t.sleep(800);
      await t.click(/^Spring$/, '#side button'); await t.sleep(800);
      await t.M('New date: Not sure yet');
    }
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { SR.view.got.ev = null; SR.openSel({ type: 'newEvent', date: SR.today, kind: 'occasion' }); return 1; })()`); await t.sleep(900);
    await t.ev(`(() => { const i = [...document.querySelectorAll('#side input')].find((x) => x.type === 'text'); if (i) { i.value = 'Jo’s wedding'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } return 1; })()`);
    await t.sleep(500);
    if (await t.click(/^Out of town$/, '#side button')) { await t.sleep(800); await t.M('New date: an event out of town'); }
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { const e = { id: 'cx-big-lis', kind: 'trip', name: 'Lisbon', icon: 'plane', date: SR.M.addDays(SR.today, 70), end: SR.M.addDays(SR.today, 75), leave: 450, back: 1020 }; __reset.edit((s) => { s.events = s.events.filter((x) => x.id !== e.id); e.ready = SR.M.readySuggest(e, s); s.events.push(e); }); SR.openSel({ type: 'people', id: e.id }); return 1; })()`);
    await t.sleep(1000);
    if (await shown('#side .c-cd-names')) {
      await t.ev(`(() => { const i = document.querySelector('#side .c-cd-names'); i.value = 'Inês, Marco'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
      await t.sleep(500);
      await t.M('New trip: who you’ll see there');
    }
    /* who's going: asked first when a trip is added, and again from a countdown's More */
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { SR.openSel({ type: 'going', id: 'cx-big-lis' }); return 1; })()`); await t.sleep(1000);
    if (await shown('#side .c-cd-gtile')) await t.M('New trip: who’s going');
    await base(narrow ? null : 'planner');
    await t.ev(`(() => { SR.openSel({ type: 'going', id: 'cx-big-cov', change: true }); return 1; })()`); await t.sleep(1000);
    if (await shown('#side .c-cd-gtile')) await t.M('Countdown: who’s going, from More');
    /* quick add reading a trip and a heads-up (the desk's Add) */
    if (desk) {
      for (const [words, name] of [['trip to Denver Dec 3 to 6', 'a trip'], ['text Aunt Lisa about LA', 'a heads-up'], ['move in spring', 'a move sometime in spring']]) {
        await base('planner');
        await t.ev(`SR.openQuick(), 1`); await t.sleep(600);
        await t.ev(`(() => { const i = document.getElementById('quick-in'); if (i) { i.value = ${J(words)}; i.dispatchEvent(new Event('input', { bubbles: true })); } return 1; })()`); await t.sleep(700);
        await t.M('Add (quick add): ' + name);
      }
    }
    await base(narrow ? null : 'planner');
  }

  /* == V11-2 (Grok's audit of V11): quick add on a full day, the desk's Add and the phone's Add line: the ask said back
     with what's in the way and its ways on (a Party tomorrow from 7:30 to 10:30 pm), a time that would move a meal out of
     its usual time asking first, and a week with no room at that time offering a to-do. Made up events, ids cx-quick-,
     taken off at the end == */
  if (t.want('quick')) {
    /* (mode: 'plain' is the sample week as it is, 'party' adds a party tomorrow evening, 'week' books every evening too) */
    const quickBoard = (mode) => t.ev(`(() => { try { __reset.edit((s) => {
      const M = SR.M, T = SR.today, add = (n) => M.addDays(T, n);
      s.events = s.events.filter((e) => !/^cx-quick-/.test(e.id));
      if (${J(mode !== 'plain')}) s.events.push({ id: 'cx-quick-party', kind: 'timed', name: 'Party', cat: 'family', icon: 'people', date: add(1), start: 1170, dur: 180 });
      if (${J(mode === 'week')}) for (let k = 0; k <= 8; k++) s.events.push({ id: 'cx-quick-eve' + k, kind: 'timed', name: k === 1 ? 'Conference' : 'Rehearsal', cat: 'work', icon: 'people', date: add(k), start: k === 1 ? 360 : 1140, dur: k === 1 ? 1020 : 240 });
    }); } catch (e) { return String(e); } return 1; })()`);
    const wd2 = await t.ev(`SR.M.DAY_LONG[SR.M.weekday(SR.M.addDays(SR.today, 2))]`);
    /* (an hour's call has all three ways on with the sample week: another day, shorter, and the closest time; a 3 h movie
       from 8 pm runs past bed, so it's offered shorter at 8 pm or whole from 7) */
    const asks = [['Call tomorrow 8pm 1h', 'a full evening, its ways on', 'party'], ['Movie tomorrow 8pm 3h', 'a movie that runs past bed', 'plain'], ['Movie ' + wd2 + ' 5:30pm 2h', 'a meal it would move', 'party'], ['Movie tomorrow 8pm 3h', 'a week with no room, a to-do', 'week']];
    for (const [words, name, mode] of asks) {
      await quickBoard(mode);
      await t.sleep(400);
      if (desk) {
        await base('planner');
        await t.ev(`SR.openQuick(), 1`); await t.sleep(600);
        await t.ev(`(() => { const i = document.getElementById('quick-in'); if (i) { i.value = ${J(words)}; i.dispatchEvent(new Event('input', { bubbles: true })); } return 1; })()`); await t.sleep(700);
        await t.M('Add (quick add): ' + name);
      } else {
        await base(null);
        await t.ev(`(() => { const i = document.querySelector('#todayview .td-add'); if (i) { i.value = ${J(words)}; i.dispatchEvent(new Event('input', { bubbles: true })); i.scrollIntoView({ block: 'end' }); } return 1; })()`); await t.sleep(700);
        if (await shown('#todayview .td-preview')) await t.M('Phone: Add, ' + name, { scroll: false });
        await t.ev(`(() => { const i = document.querySelector('#todayview .td-add'); if (i) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); } return 1; })()`);
      }
    }
    await t.ev(`(() => { try { __reset.edit((s) => { s.events = s.events.filter((e) => !/^cx-quick-/.test(e.id)); }); } catch (e) { return String(e); } return 1; })()`);
    await base(narrow ? null : 'planner');
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
    /* V11-2: an error that stays until it's put away: what happened, what to do, Try again, and its x */
    await t.ev(`(() => { SR.toast('Your last change didn’t save on this device. Try again, or download a backup.', 'error', { label: 'Try again', fn: () => {} }, { key: 'gate', also: { label: 'Your data', fn: () => {} } }); return 1; })()`);
    await t.sleep(900);
    await t.M('Toasts: an error that stays', { scroll: false });
    await t.ev(`(() => { document.querySelectorAll('#toasts .toast').forEach((e) => e.remove()); return 1; })()`);
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
    /* V11-2 (docs/BIG-MOMENTS.md, C): the block you're in carries its to-do's list, two things in */
    await t.ev(`(() => { try { __reset.edit((s) => {
      const M = SR.M, today = SR.today, inbox = (s.groups.find((g) => g.id === 'inbox') || s.groups[0]).id;
      s.tasks = s.tasks.filter((x) => x.id !== 'cx-bl-pack');
      s.tasks.push({ id: 'cx-bl-pack', name: 'Pack for the lake', group: inbox, icon: 'shirt', cat: 'home', due: today, dur: 45, repeat: null, done: false, steps: [],
        list: [{ id: 'cx-li1', name: 'Phone charger', done: true }, { id: 'cx-li2', name: 'ID and wallet', done: true }, { id: 'cx-li3', name: 'Meds', done: false }, { id: 'cx-li4', name: 'Clothes for 3 days', done: false }, { id: 'cx-li5', name: 'Toiletries', done: false }] });
      M.placeAdd(s, today, { name: 'Pack for the lake', cat: 'home', icon: 'shirt', dur: 45, src: { type: 'task', id: 'cx-bl-pack' } }, 1260);
    }); __reset.at(1275); if (SR.view.mode !== 'today') SR.setMode('today'); } catch (e) { return String(e); } return 1; })()`);
    await t.sleep(1300);
    await t.M((narrow ? 'Phone list: ' : 'Band: ') + 'a block with its list, two things in', { scroll: narrow });
    /* V11-2 (docs/BIG-MOMENTS.md, two new moments): a heads-up whose time has come (the caregiver's sister, at 2 pm),
       then the same once Text was tapped (Sent it? Done); and the morning after on the student's board, three
       things from yesterday with no check, the sheet that goes through them, and one answered there */
    await t.ev(`SR.devBoard('caregiver'), 1`); await t.sleep(2000);
    await t.ev(`(() => { __reset.at(840); if (SR.view.mode !== 'today') SR.setMode('today'); return 1; })()`);
    await t.sleep(1300);
    await t.M((narrow ? 'Phone list: ' : 'Band: ') + 'a heads-up to send', { scroll: narrow });
    await t.ev(`(() => { const m = SR.M.momentFor(SR.state, SR.today, SR.nowMin, { kind: true, dinnerNo: true, yesterday: true }, null, { headsup: true }); if (!m) return 0; SR.view.got.huTexted = m.key; SR.render(); return 1; })()`);
    await t.sleep(900);
    await t.M((narrow ? 'Phone list: ' : 'Band: ') + 'a heads-up, sent it?', { scroll: narrow });
    await t.ev(`SR.devBoard('student'), 1`); await t.sleep(2000);
    await t.ev(`(() => { try { __reset.edit((s) => {
      const M = SR.M, y = M.addDays(SR.today, -1), g = s.goals[0];
      const one = s.tasks.find((x) => !x.done && !(x.steps || []).length), many = s.tasks.find((x) => !x.done && (x.steps || []).length);
      M.placeAdd(s, y, { name: one.name, cat: one.cat, icon: one.icon, dur: 30, src: { type: 'task', id: one.id } }, 1020);
      M.placeAdd(s, y, { name: many.steps[0].name, cat: many.cat, icon: many.icon, dur: many.steps[0].dur, src: { type: 'step', task: many.id, id: many.steps[0].id } }, 1065);
      M.placeAdd(s, y, { name: g.parts[2].name, cat: g.cat, icon: g.icon, dur: 60, src: { type: 'goal', id: g.id, part: g.parts[2].id } }, 1140);
    }); __reset.at(480); if (SR.view.mode !== 'today') SR.setMode('today'); } catch (e) { return String(e); } return 1; })()`);
    await t.sleep(1300);
    await t.M((narrow ? 'Phone list: ' : 'Band: ') + 'things from yesterday with no check', { scroll: narrow });
    await t.ev(`(() => { SR.openSel({ type: 'yesterday' }); return 1; })()`);
    await t.sleep(900);
    if (await shown('#side:not([hidden]) .c-yd-list')) {
      await t.M('From yesterday: the sheet');
      await t.ev(`(() => { const b = document.querySelector('#side .c-yd-row:not(.said) .c-yd-b'); if (b) b.click(); return !!b; })()`);
      await t.sleep(900);
      await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.remove()), 1`);
      await t.M('From yesterday: one answered');
    }
    await t.ev(`(() => { const x = document.getElementById('side-x'); if (x && !document.getElementById('side').hidden) x.click(); return 1; })()`);
    await t.sleep(500);
    /* the preview bar and the Dev menu (on this computer) */
    if (desk) { await t.ev(`__reset.at(600), 1`); await t.sleep(600); await t.M('Dev: a made up board, its bar', { scroll: false }); }
    await t.ev(`(() => { try { __reset.at(null); } catch (e) {} try { SR.endPreview(); } catch (e) {} return 1; })()`);
    await t.sleep(1200);
  }

  /* == V11-2 (Oct 20): every dead end gets a next step, and progress as counts. The reset's To-dos step with nothing to
     place (the to-dos with no day yet, Give one a day, Skip for now); what was due before today, calmly (From last week,
     Was due Oct 15, Give it a new day) in To-dos (the due sheet on a phone), the reset's step, and the place panel; Look
     back's counts for this month and last; the first reset's recap line; and on a phone, the Sunday Reset's line on its
     day: quiet in a Free evening, gold in open time, Continue after a pause, and Set up this week on Monday == */
  if (t.want('next')) {
    await base(narrow ? null : 'planner');
    const toStep = async (key) => { await t.ev(`(() => { if (!SR.view.reset) SR.startReset(SR.resetWeek()); const i = SR.stepsNow().findIndex((s) => s.key === ${J(key)}); if (i >= 0) SR.goStep(i); return i; })()`); await t.sleep(1500); };
    const leave = async () => { await t.ev(`(() => { try { if (SR.view.reset) SR.leaveReset(); } catch (e) {} try { SR.view.sel = null; SR.render(); } catch (e) {} document.querySelectorAll('.toast').forEach((e) => e.remove()); return 1; })()`); await t.sleep(600); };
    /* nothing due this week, and three things in the Inbox with no day */
    await t.ev(`SR.devBoard('light'), 1`); await t.sleep(2000);
    await t.ev(`(() => { try { __reset.edit((s) => {
      const inbox = (s.groups.find((g) => g.id === 'inbox') || s.groups[0]).id;
      s.tasks = s.tasks.filter((x) => x.done || !x.due || x.due > SR.M.addDays(SR.today, 30));
      s.tasks.forEach((x) => { if (!x.done && x.due) x.due = null; });
      const T = (id, name, icon, cat, dur) => ({ id, name, group: inbox, icon, cat, dur, due: null, repeat: null, done: false, steps: [] });
      s.tasks.push(T('cx-nd-1', 'Fix the bike light', 'check', 'home', 30), T('cx-nd-2', 'Book a dentist visit', 'phone', 'yours', 15), T('cx-nd-3', 'Return the library books', 'book', 'home', 30));
    }); } catch (e) { return String(e); } return 1; })()`);
    await t.sleep(500);
    await toStep('todo');
    if (await shown('#rack .c-noday')) await t.M('Reset To-dos: nothing due, things with no day yet');
    await leave();
    /* thirty to-dos from earlier days */
    await t.ev(`SR.devBoard('overdue'), 1`); await t.sleep(2000);
    if (narrow) {
      await t.ev(`(() => { SR.openSel({ type: 'dueSoon' }); return 1; })()`); await t.sleep(1000);
      if (await shown('#side .c-ds-from')) await t.M('Due sheet: from earlier days');
      await leave();
    } else {
      await t.ev(`(() => { if (SR.view.mode !== 'planner') SR.setMode('planner'); Kit.v7.openTodos(); return 1; })()`); await t.sleep(1000);
      await t.ev(`(() => { const s = document.querySelector('.c-tdscroll'), f = document.querySelector('.c-tdsec.from'); if (s && f) s.scrollTop = f.offsetTop - 40; return !!f; })()`); await t.sleep(400);
      if (await shown('.c-tdsec.from')) await t.M('To-dos: From last week');
      await base('planner');
    }
    await toStep('todo');
    await t.ev(`(() => { const f = document.querySelector('#rack .c-tdfrom'); if (f) f.scrollIntoView({ block: 'start' }); return !!f; })()`); await t.sleep(400);
    if (await shown('#rack .c-tdfrom')) await t.M('Reset To-dos: From last week');
    await t.ev(`(() => { const b = document.querySelector('#rack [data-fk^="tdw-new-"]'); if (b) b.click(); return !!b; })()`); await t.sleep(1200);
    if (await shown('#side:not([hidden])')) await t.M('Give it a new day: the place panel');
    await leave();
    /* look back, with this month and last counted */
    await t.ev(`SR.devBoard('months3'), 1`); await t.sleep(2000);
    await toStep('back');
    await t.ev(`(() => { const f = document.querySelector('#rack .c-lb-month'); if (f) f.scrollIntoView({ block: 'center' }); return !!f; })()`); await t.sleep(400);
    if (await shown('#rack .c-lb-month')) await t.M('Look back: this month and last');
    await leave();
    /* the first reset's recap, after it gave four things a time */
    await t.ev(`SR.devBoard('light'), 1`); await t.sleep(2000);
    await t.ev(`(() => { try { __reset.edit((s) => { Object.keys(s.weeks || {}).forEach((w) => { if (s.weeks[w].reset) delete s.weeks[w].reset; }); const inbox = (s.groups.find((g) => g.id === 'inbox') || s.groups[0]).id; ['Clean the gutters', 'Fix the cabinet door', 'Swap the furnace filter', 'Send the invoice'].forEach((n, i) => s.tasks.push({ id: 'cx-fr-' + i, name: n, group: inbox, icon: 'check', cat: i === 3 ? 'work' : 'home', dur: 30, due: null, repeat: null, done: false, steps: [] })); }); } catch (e) { return String(e); } return 1; })()`);
    await t.ev(`(() => { SR.startReset(SR.resetWeek()); return 1; })()`); await t.sleep(1200);
    await t.ev(`(() => { const ws = SR.view.reset.week, M = SR.M; [0, 1, 2, 3].forEach((i) => { const id = 'cx-fr-' + i, t = SR.taskById(id), d = M.addDays(ws, 2 + i), at = M.quietSlot(SR.state, d, 30, { when: 'any' }); if (at != null) SR.commit(() => M.placeAdd(SR.state, d, { name: t.name, cat: t.cat, icon: 'check', dur: 30, src: { type: 'task', id } }, at)); }); SR.goStep(SR.stepsNow().length - 1); return 1; })()`);
    await t.sleep(1500);
    await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.remove()), 1`);
    await t.M('The first reset: its recap line');
    await leave();
    /* nothing on the board yet (Dev's empty board): the due sheet's Add a to-do, then with three things that have no day
       yet; the next 7 days as one line and its days; and the meal board's empty days, each with a quiet + Add */
    await t.ev(`SR.devBoard('empty'), 1`); await t.sleep(2000);
    if (narrow) {
      await t.ev(`(() => { SR.openSel({ type: 'dueSoon' }); return 1; })()`); await t.sleep(1000);
      if (await shown('#side .c-ds-add')) await t.M('Due sheet: nothing due, Add a to-do');
      await leave();
      await t.ev(`(() => { try { __reset.edit((s) => { const inbox = (s.groups.find((g) => g.id === 'inbox') || s.groups[0]).id; ['Fix the bike light', 'Book a dentist visit', 'Return the library books'].forEach((n, i) => s.tasks.push({ id: 'cx-nd-e' + i, name: n, group: inbox, icon: 'check', cat: 'home', dur: 30, due: null, repeat: null, done: false, steps: [] })); }); } catch (e) { return String(e); } SR.openSel({ type: 'dueSoon' }); return 1; })()`); await t.sleep(1000);
      if (await shown('#side .c-ds-add')) await t.M('Due sheet: things with no day yet');
      await leave();
      await t.ev(`(() => { SR.openSel({ type: 'next7' }); return 1; })()`); await t.sleep(1000);
      if (await shown('#side .c-n7-days')) await t.M('The next 7 days: nothing planned yet');
      await leave();
    }
    await t.ev(`(window.SR_planMeals ? SR_planMeals() : null), 1`); await t.sleep(1400);
    if (await shown('.c-mat .c-madd')) await t.M('Meal board: empty days, + Add');
    await base(narrow ? null : 'planner');
    /* on a phone, the reset's line on its day */
    if (narrow) {
      await t.ev(`SR.devBoard('light'), 1`); await t.sleep(2000);
      await t.ev(`(() => { const w0 = SR.M.weekStart(SR.today); __reset.onDay(SR.M.weekday(SR.today) === 0 ? SR.today : SR.M.addDays(w0, 7)); return 1; })()`); await t.sleep(600);
      for (const [min, name] of [[1145, 'Sunday 7:05 pm, a Free evening (quiet)'], [600, 'Sunday 10 am, open time (gold)']]) {
        await t.ev(`(() => { __reset.at(${min}); SR.render(); return 1; })()`); await t.sleep(1200);
        if (await shown('.c-resetline')) await t.M('Phone Today: the reset, ' + name);
      }
      await t.ev(`(() => { __reset.edit((s) => { const ws = SR.resetWeek(); s.weeks[ws] = s.weeks[ws] || {}; s.weeks[ws].reset = { step: 2, done: false }; }); SR.render(); return 1; })()`); await t.sleep(1000);
      if (await shown('.c-resetline')) await t.M('Phone Today: the reset, after a pause');
      await t.ev(`(() => { const w0 = SR.M.weekStart(SR.today); __reset.onDay(SR.M.addDays(w0, SR.M.weekday(SR.today) <= 1 ? 1 : 8)); __reset.edit((s) => { Object.keys(s.weeks).forEach((w) => { if (s.weeks[w].reset) s.weeks[w].reset = { step: 0, done: false }; }); }); __reset.at(1145); SR.render(); return 1; })()`); await t.sleep(1200);
      if (await shown('.c-resetline')) await t.M('Phone Today: Set up this week, Monday');
      await t.ev(`(() => { try { __reset.onDay(null); __reset.at(null); } catch (e) {} return 1; })()`);
    }
    await t.ev(`(() => { try { __reset.at(null); } catch (e) {} try { SR.endPreview(); } catch (e) {} return 1; })()`);
    await t.sleep(1200);
  }

  /* == V11-2: Focus, one thing at a time, in the side panel (the sheet on a phone): the pick, Find another to-do, how
     long, a session running, paused, its time up, and done; then the band's way back (or the Now card's) with the
     panel closed. Dev's sample week with the clock held at 10 am, in a block */
  if (t.want('focus')) {
    await base(null);
    await t.ev(`SR.devBoard('sample'), 1`); await t.sleep(2000);
    await t.ev(`(() => { try { localStorage.removeItem('sundayreset.focus'); } catch (e) {} if (window.SRFocus && SRFocus.session) SRFocus.clear(); __reset.at(600); if (SR.view.mode !== 'today') SR.setMode('today'); return 1; })()`);
    await t.sleep(1300);
    if (await t.ev(`!!(window.SR && SR.openFocus)`)) {
      await t.ev(`SR.openFocus(), 1`); await t.sleep(900);
      await t.M('Focus: pick one thing');
      await t.ev(`(() => { const b = document.querySelector('#side [data-fk="fc-find"]'); if (b) b.click(); return !!b; })()`); await t.sleep(700);
      await t.M('Focus: find another to-do');
      await t.ev(`(() => { const b = document.querySelector('#side .c-fc-chip, #side .c-fc-row, #side .c-fc-now'); if (b) b.click(); return !!b; })()`); await t.sleep(800);
      await t.M('Focus: how long');
      await t.ev(`(() => { const b = document.querySelector('#side [data-fk="fc-start"]'); if (b) b.click(); return !!b; })()`); await t.sleep(800);
      await t.ev(`(() => { const s = SRFocus.session; if (s && s.runningSince) { s.runningSince -= 10 * 60000; s.total = Math.max(s.total, 25); } return 1; })()`); await t.sleep(1400);
      await t.M('Focus: running');
      await t.ev(`(() => { const b = document.querySelector('#side [data-fk="fc-pause"]'); if (b) b.click(); return !!b; })()`); await t.sleep(800);
      await t.M('Focus: paused');
      await t.ev(`(() => { const b = document.querySelector('#side [data-fk="fc-pause"]'); if (b) b.click(); const s = SRFocus.session; if (s) s.runningSince = Date.now() - (s.total * 60000 - s.used) - 2000; return 1; })()`); await t.sleep(2200);
      await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.remove()), 1`);
      await t.M('Focus: time’s up');
      await t.ev(`(() => { const b = document.querySelector('#side [data-fk="fc-done"]'); if (b) b.click(); return !!b; })()`); await t.sleep(1000);
      await t.ev(`document.querySelectorAll('.toast').forEach((e) => e.remove()), 1`);
      await t.M('Focus: done');
      await t.ev(`(() => { SRFocus.clear(); SRFocus.start({ kind: 'own', name: 'Reading', cat: 'yours', icon: 'star' }, 25); const x = document.getElementById('side-x'); if (x && !document.getElementById('side').hidden) x.click(); return 1; })()`); await t.sleep(1300);
      await t.M((narrow ? 'Phone list: ' : 'Band: ') + 'back to Focus, the panel closed', { scroll: narrow });
    }
    await t.ev(`(() => { try { SRFocus.clear(); localStorage.removeItem('sundayreset.focus'); } catch (e) {} try { __reset.at(null); } catch (e) {} try { SR.endPreview(); } catch (e) {} return 1; })()`);
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
