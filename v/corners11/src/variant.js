/* Corners V11: V10 with every motion reworked (docs/CORNERS-V11.md). Blocks dip when touched, lift with a
   shadow, sway as they're carried, fall the last bit and land with their clack at the touch; drops that
   don't fit fly home; the camera, the boards, the panels, and the toasts ease on springs. The desk's part is
   the board's own code behind the class `feel`; the pieces on top are below, under feel.
   Corners V10: V9 with the setup on the desk (docs/CORNERS-V10.md). The questions lined up on a board,
   answered by moving blocks, with the week drawing itself as you go; Build my week slides the camera onto
   it, and a coach shows each move before you try it. The letter rack lives in the setup now, not over the
   calendar, and the bag is a rendered one. The setup card is still there, polished, to compare.
   Corners V9: V8 after a page by page audit of Oct 13 (docs/CORNERS-V9.md). The letter rack centered and
   only where the top middle is free, the welcome with the rest of the desk stepped back, a shorter menu,
   minutes that add up, one spelling of to-do, Your time with only your own blocks, and a quieter meal board.
   Corners V8: V7 after an audit of Oct 13 (docs/CORNERS-V8.md). Now looks like every other page: the date
   in the middle, what you're in under it in the same chip, one bar along the bottom, and no second bar of
   stacks. The kind of day is back under the date. Previews never write to this device. Monday and Tuesday
   say Set up this week. Letters can be tapped onto the rack, meals tapped onto the board.
   From V7: V6 with a letter rack (a wooden rack up top, letter tiles on the desk, a bag beside it; the
   first visit spells your name on it, the same move as every block) and Dev mode always in Settings, with
   two weeks in, three months in, a busy person, a creative person, and Brand new.
   From V6, Claude's picks of Oct 13: the kind chips are only the two kinds you use most (none
   until you've used some), the stack strip ends in All to-dos (V4's panel, with Find), and the second mat
   wears the desk's own wood, groove, and leather.
   From V5, Gemini's audit of Oct 13: Now apart from Day, Week, Month, Year; To-dos as stacks
   on the desk, not a panel; one tap kinds of day; a gold star and edge for time to yourself on month and
   year cards, with the usual week marked as usual; week blocks too narrow for a name show their mark;
   the week to send at the end of the reset; panels of warm glass.
   From V4, Russell's notes of Oct 13: the meal board (breakfast, lunch, dinner, dragged by hand),
   a block's own mat (tap a block twice: it lifts, the camera slides over, Done brings it back), workout
   routines built from exercise blocks, To-dos in a panel beside the board, the reset dimming what a step
   isn't about, and the desk cleared while it runs.
   From V3: the Sunday Reset as a moment instead of a tab. One chip that changes through the
   week, an intro before it starts, the reset across the whole screen while it runs, This week's plan once
   it's done, and Repeat last week for dinners.
   From V2: you on the top left (the way to Settings, and whether it's saved), the date in the middle
   (with the kind of day and the seven days in the day view), the zoom on the right.
   The Pomodoro on the bottom left while it runs; Add, To-dos, Block library, and the Sunday Reset on the bottom right. Everything
   you can place comes out beside the board, in 3D. And the desk clock is a Pomodoro timer. */
(function () {
  'use strict';
  const { h } = Kit;
  const ESP = '#252928', CREAM = '#FFFFFF';
  window.SR_kindYours = true; /* time to yourself shows only as good news, and the reset invites more */
  window.SR_clockFirst = true;
  window.SR_starYours = true; /* a star and a gold edge where there's time to yourself */
  window.SR_iconOnly = true; /* a week block too narrow for its name shows its mark */
  window.SR_usualYears = true; /* a month nobody has planned says its hours are the usual week's */
  window.SR_resetSkip = ['shape']; /* six steps: the kind of week waits in Settings, not in every reset */
  window.SR_noTrayBar = true; /* no tray bar in the corners, so Settings doesn't offer one */
  window.SR_recapApart = true; /* 3 of 6, then Your week */ /* the clock is the Pomodoro, so it stays on the desk right after the notepad */
  Kit.ink = CREAM; Kit.onGold = ESP; /* charcoal chrome with white type, like the board's own HUD */
  Kit.start(() => {
    const app = document.getElementById('app');
    /* V11 feel: whether the pieces on top may move (Calmer motion and the system's reduced motion keep them still) */
    const feelOn = () => !SR.view.calm && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const FOUT = 'cubic-bezier(0.16, 1, 0.3, 1)', FIN = 'cubic-bezier(0.4, 0, 1, 1)';
    /* this device's own things (meals, routines, the rack, reminders): a Dev board or any preview never writes them */
    const keep = (k, v) => { if (SR.view.preview) return; try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* storage off */ } };
    const stored = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; } };
    /* Calendar, the menu, and the keys move the zoom from code; the switch shows it at once */
    /* one spelling: the reset's step says To-dos, like the button that opens them */
    { const st = (SR.D.STEPS || []).find((x) => x.key === 'todo'); if (st) st.title = 'To-dos'; }
    const zoom0 = Kit.zoom; Kit.zoom = (z) => { zoom0(z); Kit.sync(); };
    /* V11: every kind of day laid out on the desk in place of the day (docs/V11-ON-SCREEN.md) */
    const spreadOn = () => !!SR.view.kindSpread && !SR.inToday() && SR.view.zoom === 'day';

    /* == the corners == */
    /* top left: you, the way to Settings, with a small dot that says the board is saved */
    const tl = h('div', 'k c-tl'); tl.dataset.edge = 'top';
    const me = h('button', 'k-chip c-me'); me.type = 'button'; me.setAttribute('aria-haspopup', 'menu'); me.setAttribute('aria-expanded', 'false');
    const meCircle = h('span', 'c-me-dot'), meName = h('span', 'c-me-name');
    const saveDot = h('i', 'c-save');
    const av = h('span', 'c-me-av'); av.append(meCircle, saveDot);
    me.append(av, meName, SR.icon('down', 7, '#B8B0A3'));
    me.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); toggleMenu(); });
    tl.append(me);
    /* top middle: the date; in the day view the kind of day and the week's seven days sit under it, as on the board's own date card */
    const tc = h('div', 'k k-chip c-tc'); tc.dataset.edge = 'top';
    const kinds = h('div', 'c-kinds'); Kit.kindsHome = kinds;
    const days = h('div', 'c-days');
    const dateCtl = Kit.dateControl();
    /* the year that starts on a later month says so plainly: From January 2027, not January on */
    Kit.renders.push(() => {
      const t = dateCtl.querySelector('.k-title'), sub = dateCtl.querySelector('.k-sub');
      if (!t) return;
      const m = /^(\w+) on$/.exec(t.textContent);
      if (m) { const y = sub && /(\d{4})/.exec(sub.textContent); t.textContent = 'From ' + m[1] + (y ? ' ' + y[1] : ''); }
    });
    /* in Now the date chip says the time too, and the band sits under it */
    const nowClock = h('span', 'c-nowclock'); nowClock.hidden = true;
    const bandKick = h('div', 'c-bandkick');
    const whenBtn = dateCtl.querySelector('.k-when'); if (whenBtn) whenBtn.appendChild(nowClock);
    tc.append(dateCtl, kinds, days);
    /* the kind chips join the date card once they're built */
    const pills = document.getElementById('pills'), pillsFrom = pills && pills.parentElement, pillsNext = pills && pills.nextSibling;
    Kit.renders.push(() => {
      if (!pills) return;
      const want = !SR.inToday() && SR.view.zoom === 'day' ? days : pillsFrom;
      if (pills.parentElement !== want) { if (want === pillsFrom) pillsFrom.insertBefore(pills, pillsNext); else want.appendChild(pills); }
      tc.classList.toggle('c-dayview', want === days);
    });
    const tr = h('div', 'k k-chip c-tr'); tr.dataset.edge = 'top';
    /* Now is the live view; Day, Week, Month, and Year are the calendar. A line keeps them apart */
    tr.appendChild(Kit.zoomSwitch('c-nowsplit', true, { today: 'Now' }));
    const listBtn = Kit.btn('c-listbtn', 'List', () => Kit.list());
    listBtn.title = 'The week as a list (L)';
    tr.appendChild(listBtn);

    /* bottom left: the Pomodoro, only while it runs (time to yourself lives on the board and in the reset, never as a meter) */
    const bl = h('div', 'k k-chip c-bl'); bl.dataset.edge = 'bottom';
    const pomo = h('button', 'c-pomo'); pomo.type = 'button'; pomo.hidden = true;
    pomo.addEventListener('click', () => { SR.Snd.init(); openTimer(); });
    bl.append(pomo);
    /* bottom right: Add, To-dos, Block library, and the Sunday Reset last, where a call to action goes */
    const br = h('div', 'k k-chip c-br'); br.dataset.edge = 'bottom';
    const add = Kit.btn('k-pill', 'Add', Kit.add, 'plus'); add.title = 'Add in plain words (N)';
    const todos = Kit.btn('k-pill', 'To-dos', () => deskTodos(), 'flag');
    const due = h('span', 'k-count'); todos.appendChild(due);
    const lib = Kit.btn('k-pill', 'Block library', blockLibrary, 'box');
    br.append(add, todos, lib);
    /* the Sunday Reset chip joins them once it's built, below */
    app.append(tl, tc, tr, bl, br);

    /* == Block library: the rack beside the board, in 3D == */
    const libOpen = () => {
      const v = SR.view;
      if (SR.inToday()) return false;
      if (v.bench && v.bench.tab === 'blocks') return true;
      return v.zoom === 'day' && !v.bench && !window.SR_kitAway;
    };
    /* in the day view the rack stands beside the day until you put it away; this device remembers */
    try { window.SR_kitAway = localStorage.getItem('sundayreset.v7.kitAway') === '1'; } catch (e) { /* fine */ }
    const kitAway = (away) => { window.SR_kitAway = away; try { localStorage.setItem('sundayreset.v7.kitAway', away ? '1' : ''); } catch (e) { /* fine */ } };
    function toBoard() {
      SRFocus.close(); Kit.closeSheet(); closeMenu();
      if (SR.inToday()) SR.setMode('planner');
      if (SR.view.zoom === 'month' || SR.view.zoom === 'year') SR.setZoom('week');
    }
    function blockLibrary() {
      if (libOpen()) {
        if (SR.view.zoom === 'day' && !SR.view.bench) kitAway(true); else SR.view.bench = null;
        SR.Snd.slide && SR.Snd.slide();
        SR.render();
        return;
      }
      const fromNow = SR.inToday();
      toBoard();
      const v = SR.view;
      /* from Now, the library opens beside today, where you were looking */
      if (fromNow) { v.focus = SR.today; if (v.zoom !== 'day') SR.setZoom('day'); }
      if (v.zoom === 'day') { v.bench = null; kitAway(false); }
      else { v.tab = 'blocks'; v.level = null; v.bench = { tab: 'blocks', level: null }; }
      SR.Snd.zoom && SR.Snd.zoom(false);
      SR.render();
    }
    /* a stack of to-dos, dinners, or ideas comes out on the same bench */
    function layOut(tab, level) {
      /* Due soon comes out beside today's board in Now too; the other stacks need the Calendar's bench */
      if (SR.inToday() && tab === 'todo' && (level || 'soon') === 'soon') { SRFocus.close(); Kit.closeSheet(); closeMenu(); if (!(SR.view.bench && SR.view.bench.tab === 'todo')) SR.openDueSoon(); return; }
      toBoard();
      const v = SR.view;
      if (tab === 'todo' && level === 'soon') { if (!(v.bench && v.bench.tab === 'todo' && v.bench.level === 'soon')) SR.openDueSoon(); return; }
      v.tab = tab; v.level = level || null; v.bench = { tab, level: level || null };
      SR.Snd.zoom && SR.Snd.zoom(false);
      SR.render();
    }

    /* == To-dos: V11 moved the panel to "the To-dos panel: where the lists are kept", after This week's plan == */

    /* == saved: the board's own save words, read from its hidden date card == */
    const saveSrc = document.querySelector('#hud .save-state');
    function saved() {
      const cls = ['error', 'saving', 'offline', 'preview'].find((c) => saveSrc && saveSrc.classList.contains(c)) || 'saved';
      const long = (saveSrc && saveSrc.title ? saveSrc.title.replace(/\. Tap for Your data\.$/, '') : 'Saved on this device');
      return { cls, long };
    }
    function drawSave() {
      const st = saved();
      saveDot.className = 'c-save ' + st.cls;
      me.setAttribute('aria-label', meName.textContent + '. ' + st.long + '. Settings and everything else');
    }
    /* Settings and the list open without a redraw of the board; the rack steps aside for them all the same */
    ['drawer', 'agenda'].forEach((id) => { const x = document.getElementById(id); if (x) new MutationObserver(() => { requestAnimationFrame(() => Kit.sync()); setTimeout(() => Kit.sync(), 150); }).observe(x, { attributes: true, attributeFilter: ['hidden'] }); });
    if (saveSrc) new MutationObserver(drawSave).observe(saveSrc, { attributes: true, attributeFilter: ['class', 'title'] });

    /* == your account: the obvious way to Settings == */
    let menu = null;
    function toggleMenu() { if (menu) closeMenu(); else openMenu(); }
    function openMenu() {
      Kit.closeSheet();
      const p = SR.who();
      menu = h('div', 'k c-menu'); menu.setAttribute('role', 'menu');
      const head = h('div', 'c-menu-head');
      const dot = h('span', 'c-me-dot big', ((p && p.name) || 'Y').slice(0, 1).toUpperCase());
      const st = saved();
      const line = Kit.btn('c-saveline', st.long, () => { closeMenu(); Kit.settings('data'); });
      line.prepend(h('i', 'c-save ' + st.cls)); line.title = 'Your data: backups and where this board is kept';
      const who = h('div'); who.append(h('b', '', (p && p.name) || 'You'), line);
      head.append(dot, who);
      menu.appendChild(head);
      /* the sample week is someone made up; your own week is one setup away (the chip already says Sample week) */
      if (p && p.sample && SR.openSetup) {
        const own = Kit.btn('c-mi gold c-ownweek', 'Set up my own week', () => { closeMenu(); openSetupIntro(); }, 'calendar', ESP);
        own.setAttribute('role', 'menuitem'); menu.appendChild(own);
      }
      const item = (label, ic, fn, cls) => { const b = Kit.btn('c-mi ' + (cls || ''), label, () => { closeMenu(); fn(); }, ic, cls && cls.includes('gold') ? ESP : CREAM); b.setAttribute('role', 'menuitem'); return b; };
      /* V11: one way of grouping, headings, and only what isn't one tap away already. Reading and sound
         and Dev are pages of Settings, and trying the setup as someone new is a Dev tool, on Dev's page */
      menu.append(item('Settings', 'sliders', () => Kit.settings(), 'first'), item('How it works', 'help', Kit.help));
      /* Now, the zoom, the list, To-dos, and Block library are already on the screen; the menu holds the rest */
      /* V11: the week's plan is always here, set or not yet (it says which) */
      menu.appendChild(h('div', 'c-mlabel', 'Plan'));
      menu.appendChild(item(planTitle(planWeek()), 'calendar', () => openPlan(planWeek())));
      if (SR.useDinners()) menu.append(item('Meal board', 'pot', () => openMealBoard()), item('Dinners and groceries', 'cart', () => layOut('dinners')));
      if (SR.useTogether()) menu.appendChild(item(partnerName() ? 'Time with ' + partnerName() : SR.withName(), 'heart', () => layOut('kim')));
      menu.appendChild(h('div', 'c-mlabel', 'On the desk'));
      menu.append(item('Focus on one thing', 'star', Kit.focus), item('Pomodoro timer', 'bell', openTimer));
      app.appendChild(menu);
      me.setAttribute('aria-expanded', 'true');
      setTimeout(() => { const f = menu && menu.querySelector('.c-mi'); if (f) f.focus(); }, 20);
    }
    function closeMenu() {
      if (!menu) return;
      const m = menu;
      menu = null;
      me.setAttribute('aria-expanded', 'false');
      /* V11: it folds back toward its button instead of vanishing */
      if (!feelOn() || !m.animate) { m.remove(); return; }
      m.style.pointerEvents = 'none'; m.style.animation = 'none';
      m.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px) scale(0.97)' }], { duration: 130, easing: FIN, fill: 'forwards' }).onfinish = () => m.remove();
      setTimeout(() => m.remove(), 400);
    }
    document.addEventListener('pointerdown', (e) => { if (menu && !menu.contains(e.target) && !me.contains(e.target)) closeMenu(); }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu) { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(); me.focus(); } }, true);

    /* == the clock: a Pomodoro timer == */
    const PKEY = 'sundayreset.pomodoro';
    let pom = null;
    try { pom = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) { pom = null; }
    if (!pom) pom = { work: 25, rest: 5, phase: 'work', round: 1, left: 25 * 60000, endsAt: null };
    const savePom = () => { try { localStorage.setItem(PKEY, JSON.stringify(pom)); } catch (e) { /* storage off */ } };
    const leftMs = () => (pom.endsAt ? Math.max(0, pom.endsAt - Date.now()) : pom.left);
    const fmt = (ms) => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    const phaseLen = () => (pom.phase === 'work' ? pom.work : pom.phase === 'long' ? pom.rest * 3 : pom.rest) * 60000;
    let card = null, cardEls = null, zoomed = false;
    window.SR_onClock = () => openTimer();
    function openTimer() {
      closeMenu(); Kit.closeSheet();
      if (card) { closeTimer(); return; }
      const at = World.propScreen && World.propScreen('clock');
      if (at && !SR.view.calm) { World.zoomTo(1.7, at.x, at.y); zoomed = true; }
      card = h('section', 'k c-timer'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Pomodoro timer');
      const x = Kit.btn('k-x c-tx', '', closeTimer, 'x'); x.setAttribute('aria-label', 'Close the timer');
      const kick = h('span', 'c-tkick', 'Pomodoro');
      const time = h('b', 'c-ttime'), phase = h('span', 'c-tphase');
      const bar = h('div', 'c-tbar'), fill = h('i'); bar.appendChild(fill);
      const dots = h('div', 'c-tdots');
      const presets = h('div', 'k-seg c-tpre');
      [[25, 5], [50, 10]].forEach(([w, r]) => { const b = Kit.btn('', w + ' and ' + r, () => setLens(w, r)); b.dataset.w = w; b.dataset.r = r; presets.appendChild(b); });
      const own = h('div', 'c-town');
      const step = (label, key, d) => { const b = Kit.btn('c-tstep', '', () => setLens(Math.max(5, Math.min(90, pom.work + (key === 'work' ? d : 0))), Math.max(5, Math.min(30, pom.rest + (key === 'rest' ? d : 0))))); b.setAttribute('aria-label', (d > 0 ? 'Longer ' : 'Shorter ') + key); b.appendChild(SR.icon(label === '+' ? 'plus' : 'minus', 7, CREAM)); return b; };
      const wv = h('span', 'c-tv'), rv = h('span', 'c-tv');
      own.append(h('span', 'c-tlab', 'Focus'), step('−', 'work', -5), wv, step('+', 'work', 5), h('span', 'c-tlab', 'Break'), step('−', 'rest', -5), rv, step('+', 'rest', 5));
      const acts = h('div', 'c-tacts');
      const go = Kit.btn('c-tgo', '', toggle);
      acts.append(go, Kit.btn('c-tq', 'Skip', skip), Kit.btn('c-tq', 'Reset', resetPom));
      card.append(x, kick, time, phase, bar, dots, acts, presets, own);
      app.appendChild(card);
      cardEls = { time, phase, fill, dots, go, presets, wv, rv };
      place();
      draw();
      setTimeout(() => go.focus({ preventScroll: true }), 30);
    }
    function place() {
      if (!card) return;
      const at = World.propScreen && World.propScreen('clock');
      const w = card.offsetWidth || 320, hgt = card.offsetHeight || 380;
      let left = window.innerWidth - w - 24, top = 90;
      if (at) {
        left = at.x + 70; if (left + w > window.innerWidth - 16) left = at.x - w - 70;
        top = at.y - hgt / 2;
      }
      card.style.left = Math.round(Math.max(16, Math.min(window.innerWidth - w - 16, left))) + 'px';
      card.style.top = Math.round(Math.max(76, Math.min(window.innerHeight - hgt - 84, top))) + 'px';
    }
    function closeTimer() {
      if (!card) return;
      card.remove(); card = null; cardEls = null;
      if (zoomed) { World.resetView(); zoomed = false; }
      document.title = 'Sunday Reset · Corners V11';
    }
    function setLens(w, r) {
      const running = !!pom.endsAt;
      pom.work = w; pom.rest = r;
      if (!running) pom.left = phaseLen();
      savePom(); draw();
    }
    function toggle() {
      if (pom.endsAt) { pom.left = leftMs(); pom.endsAt = null; }
      else { pom.endsAt = Date.now() + pom.left; SR.Snd.clack && SR.Snd.clack(0.4); }
      savePom(); draw(); sync();
    }
    function next() {
      if (pom.phase === 'work') { pom.phase = pom.round >= 4 ? 'long' : 'rest'; }
      else { pom.round = pom.phase === 'long' ? 1 : pom.round + 1; pom.phase = 'work'; }
      pom.left = phaseLen();
    }
    function skip() { const run = !!pom.endsAt; next(); pom.endsAt = run ? Date.now() + pom.left : null; savePom(); draw(); sync(); }
    function resetPom() { pom.phase = 'work'; pom.round = 1; pom.endsAt = null; pom.left = pom.work * 60000; savePom(); draw(); sync(); }
    function draw() {
      if (!cardEls) return;
      const ms = leftMs(), total = phaseLen();
      cardEls.time.textContent = fmt(ms);
      cardEls.phase.textContent = pom.phase === 'work' ? 'Focus, round ' + pom.round + ' of 4' : pom.phase === 'long' ? 'A long break' : 'A short break';
      cardEls.fill.style.width = (100 * (1 - ms / total)).toFixed(2) + '%';
      card.classList.toggle('rest', pom.phase !== 'work');
      cardEls.dots.replaceChildren(...[1, 2, 3, 4].map((n) => h('i', n < pom.round || (n === pom.round && pom.phase !== 'work') ? 'did' : n === pom.round ? 'now' : '')));
      cardEls.go.replaceChildren(h('span', '', pom.endsAt ? 'Pause' : ms < total ? 'Resume' : 'Start'));
      cardEls.presets.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.w === pom.work && +b.dataset.r === pom.rest)));
      cardEls.wv.textContent = pom.work + ' min'; cardEls.rv.textContent = pom.rest + ' min';
    }
    function tick() {
      if (pom.endsAt && Date.now() >= pom.endsAt) {
        next(); pom.endsAt = Date.now() + pom.left; savePom();
        if (SR.Snd.good) SR.Snd.good();
        SR.toast && SR.toast(pom.phase === 'work' ? 'Break’s over. Round ' + pom.round + '.' : 'Nice. Take a break.', 'good');
      }
      draw();
      const running = !!pom.endsAt;
      if (running) { pomo.querySelector('.c-pt').textContent = fmt(leftMs()); if (!card) document.title = fmt(leftMs()) + ' · ' + (pom.phase === 'work' ? 'Focus' : 'Break'); }
      else if (pomo.dataset.was === '1') document.title = 'Sunday Reset · Corners V11';
      pomo.dataset.was = running ? '1' : '';
      if (pomo.hidden === running) sync();
    }
    pomo.append(h('i', 'c-pdot'), h('b', 'c-pt'), h('span', 'c-pl', 'Pomodoro'));
    setInterval(tick, 500);
    window.addEventListener('resize', () => requestAnimationFrame(() => { place(); sync(); }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && card) { e.preventDefault(); e.stopImmediatePropagation(); closeTimer(); } }, true);

    /* == the Sunday Reset, a moment and not a tab ==
       One chip at the end of the bottom bar that changes through the week: loud only on Sunday (and
       Saturday evening), a quiet way back to the plan once it's done, the short version midweek. No red,
       no counters, no overdue: skipping a Sunday is fine. */
    const M = SR.M;
    /* minutes per step, so the chip and the intro can say how long it takes, and mean it */
    const STEP_MIN = { back: 2, ahead: 3, shape: 2, yours: 3, todo: 4, dinners: 5, kim: 2, done: 1 };
    const CATCH_MIN = { todo: 4, dinners: 3, done: 1 };
    const partnerName = () => (SR.who() && SR.who().partner) || '';
    const stepName = (k) => ({ back: 'Look back', ahead: 'Look ahead', shape: 'Set the week', yours: 'Your time', todo: 'To-dos', dinners: 'Dinners', kim: partnerName() ? 'You and ' + partnerName() : 'Together', done: 'Your week' }[k] || k);
    /* what each step is for, in a few words, under its name in the intro */
    const stepLine = (k) => ({ back: 'What to keep, what to change', ahead: 'Dates coming up', shape: 'Which kind of week', yours: 'Blocks of your own', todo: 'Give them a time', dinners: 'Pick them, and who cooks', kim: 'One thing together', done: '' }[k] || '');
    const stepCat = (k) => ({ back: 'home', ahead: 'work', shape: 'work', yours: 'yours', todo: 'family', dinners: 'meals', kim: 'us', done: 'open' }[k] || 'yours');
    /* the steps a run would have, before it starts (the board decides the same way once it does) */
    function runSteps(ws, catchup) {
      if (catchup) return ['todo'].concat(SR.useDinners() ? ['dinners'] : [], ['done']);
      const off = (SR.state.settings && SR.state.settings.resetOff) || [];
      const fresh = SR.state.created && SR.state.created > M.addDays(ws, -7) && SR.firstReset(ws);
      return SR.D.STEPS.map((s) => s.key).filter((k) => {
        if (k === 'done') return true;
        if ((window.SR_resetSkip || []).includes(k) || off.includes(k)) return false;
        if (k === 'dinners' && !SR.useDinners()) return false;
        if (k === 'kim' && !SR.useTogether()) return false;
        if (k === 'back' && fresh) return false;
        return true;
      });
    }
    /* the time a run takes is the sum of the steps it lists, so the header and the list agree */
    const minutesOf = (keys, catchup) => keys.filter((k) => k !== 'done').reduce((a, k) => a + ((catchup ? CATCH_MIN : STEP_MIN)[k] || 2), 0);
    const rec = (ws) => SR.state.weeks[ws] && SR.state.weeks[ws].reset;
    const hiddenMid = () => { try { return localStorage.getItem('sundayreset.v7.hideMid'); } catch (e) { return null; } };
    const numWord = (n) => ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] || String(n);
    const planned = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.planned') || '{}'); } catch (e) { return {}; } })();
    const savePlanned = () => keep('sundayreset.v7.planned', planned);
    let snooze = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.snooze') || 'null'); } catch (e) { return null; } })();
    const saveSnooze = () => keep('sundayreset.v7.snooze', snooze);

    /* what the chip says right now */
    function chipState() {
      const t = SR.today, wd = M.weekday(t), now = SR.nowMin;
      const full = SR.resetWeek(), fr = rec(full);
      const fullSteps = runSteps(full, false), counted = fullSteps.length - 1;
      if (fr && fr.step > 0 && !fr.done) return { kind: 'progress', label: 'Finish your reset', meta: Math.min(fr.step + 1, counted) + ' of ' + counted, title: 'Picks up where you stopped', go: () => SR.startReset(full) };
      const sundayish = wd === 0 || (wd === 6 && now >= 17 * 60);
      if (sundayish) {
        if (fr && fr.done) return { kind: 'plan', label: wd === 0 ? 'This week’s plan' : 'Next week’s plan', title: 'Dinners, to-dos, and time for you', go: () => openPlan(full) };
        if (snooze && snooze.ws === full && snooze.at > Date.now()) return { kind: 'snoozed', label: 'Sunday Reset at ' + snooze.label, title: 'Reminds you once, if this tab is open', go: () => openIntro(full, false) };
        return { kind: 'sunday', label: 'Start Sunday Reset', meta: minutesOf(fullSteps) + ' min', title: 'Set up your week', go: () => openIntro(full, false) };
      }
      const cur = M.weekStart(t), cr = rec(cur);
      if (cr && (cr.done || cr.caught || cr.setup)) return { kind: 'plan', label: 'This week’s plan', title: 'Dinners, to-dos, and time for you', go: () => openPlan(cur) };
      if (wd === 6) return { kind: 'quiet', label: 'Sunday Reset', meta: 'tomorrow', title: 'Start early if you like', go: () => openIntro(full, false) };
      /* Monday and Tuesday: the whole reset still fits the week, so it says so, in gold */
      if (wd === 1 || wd === 2) return { kind: 'sunday', label: 'Set up this week', meta: minutesOf(runSteps(cur, false)) + ' min', title: 'The Sunday Reset, for the week you’re in', go: () => openIntro(cur, false) };
      const quick = runSteps(cur, true);
      if (hiddenMid() === cur) return { kind: 'none', label: '' };
      return { kind: 'midweek', label: 'Plan the rest of the week', meta: minutesOf(quick, true) + ' min', title: 'To-dos and dinners for the days left', go: () => openIntro(cur, true) };
    }
    const rchip = h('button', 'c-rchip'); rchip.type = 'button';
    rchip.addEventListener('click', () => { SR.Snd.init(); const s = chipState(); if (s.go) s.go(); });
    function drawChip() {
      const s = chipState();
      rchip.className = 'c-rchip ' + s.kind;
      /* V11: Now is the day as it happens; the reset shows there only when it's the moment for it (Sunday,
         Saturday evening, Monday or Tuesday's set up, one under way, one you snoozed). Planning the rest of
         the week, and the plan once it's set, are the Planner's */
      rchip.hidden = s.kind === 'none' || (SR.inToday() && !['sunday', 'progress', 'snoozed'].includes(s.kind));
      const kids = [];
      if (s.kind === 'snoozed') kids.push(h('i', 'c-rdot'));
      if (s.kind === 'sunday') kids.push(Kit.icon('calendar', 8, Kit.onGold));
      kids.push(h('b', '', s.label));
      if (s.meta) kids.push(h('span', 'c-rmeta', s.meta));
      rchip.replaceChildren(...kids);
      rchip.title = s.title || s.label;
      rchip.setAttribute('aria-label', s.label + (s.meta ? ', ' + s.meta : '') + '. ' + (s.title || ''));
    }
    /* a snoozed reset nudges once, at its time, while the page is open */
    setInterval(() => {
      if (!snooze || snooze.done || Date.now() < snooze.at || SR.view.reset) return;
      snooze.done = true; saveSnooze();
      if (SR.Snd.chime) SR.Snd.chime();
      const ws = snooze.ws;
      SR.toast('Time for your Sunday Reset. About ' + minutesOf(runSteps(ws, false)) + ' min.', 'good', { label: 'Start', fn: () => openIntro(ws, false) });
      drawChip();
    }, 20000);

    /* == the intro: the whole reset on one page before it starts == */
    function openIntro(ws, catchup) {
      closeMenu();
      const r = rec(ws);
      /* a reset already under way picks up where it stopped, no intro */
      if (!catchup && r && r.step > 0 && !r.done) { SR.startReset(ws); return; }
      const keys = runSteps(ws, catchup), steps = keys.filter((k) => k !== 'done');
      const mins = minutesOf(keys, catchup);
      const counts = SR.weekCounts(ws);
      Kit.sheet(catchup ? 'Plan the rest of the week' : 'Sunday Reset', (card) => {
        const wrap = h('div', 'c-intro-in');
        const left = h('div', 'c-intro-l');
        const kick = (catchup ? M.DAY_LONG[M.weekday(SR.today)] + ' to ' + M.DAY_LONG[M.weekday(M.addDays(ws, 6))] : 'Week of ' + M.dateText(ws, 'long').replace(/^\w+, /, '')) + ' · About ' + mins + ' min';
        left.append(h('div', 'c-kick', kick));
        left.appendChild(h('h2', 'c-intro-h', catchup ? 'Plan the rest of the week.' : 'Plan your week.'));
        if (!catchup) left.appendChild(h('p', 'c-intro-p', 'Stop after any step. You’ll pick up where you left off.'));
        /* what's waiting, as plain facts, never a verdict */
        const nights = (counts.openNights || []).length;
        const bits = [];
        /* V11: the to-dos the To-dos count counts, due this week, said the same way: how many need a time,
           how many have one after they're due, and (calmly) how many are from before this week */
        const dueList = dueWeek(), need = dueList.filter((x) => x.status !== 'planned').length, late = dueList.length - need, carried = dueList.filter((x) => x.task.due && x.task.due < SR.today).length;
        if (need) bits.push(need + (need === 1 ? ' to-do due this week needs a time' : ' to-dos due this week need a time'));
        if (late) bits.push(late + (late === 1 ? ' has a time after it’s due' : ' have times after they’re due'));
        if (carried) bits.push(carried === 1 ? 'One of them is from before this week' : numWord(carried) + ' of them are from before this week');
        if (nights && SR.useDinners()) bits.push(nights + (nights === 1 ? ' dinner not picked' : ' dinners not picked'));
        if (bits.length) { const note = h('div', 'c-intro-note'); note.appendChild(h('div', 'c-kick gold', 'This week')); bits.forEach((b) => note.appendChild(h('p', '', b))); left.appendChild(note); }
        const acts = h('div', 'c-intro-acts');
        const go = Kit.btn('c-go', catchup ? 'Start' : 'Start the reset', () => { Kit.closeSheet(); if (snooze && snooze.ws === ws) { snooze = null; saveSnooze(); } SR.startReset(ws, catchup); });
        acts.appendChild(go);
        if (!catchup) {
          const now = SR.nowMin, at = Math.ceil((now + 60) / 30) * 30;
          if (at <= 22 * 60) {
            const label = M.clock(at);
            acts.appendChild(Kit.btn('c-ghost', 'Remind me at ' + label, () => {
              const d = new Date(); d.setHours(Math.floor(at / 60), at % 60, 0, 0);
              snooze = { ws, at: d.getTime(), label }; saveSnooze();
              Kit.closeSheet(); drawChip();
              SR.toast('Reminder set for ' + label + '. Keep this tab open.', '');
            }));
          }
        } else acts.appendChild(Kit.btn('c-ghost', 'Not this week', () => {
          /* hides the short version until Sunday */
          keep('sundayreset.v7.hideMid', ws);
          Kit.closeSheet(); drawChip();
          SR.toast('Hidden until Sunday.', '');
        }));
        left.appendChild(acts);
        const right = h('div', 'c-intro-r');
        right.appendChild(h('div', 'c-kick', numWord(steps.length) + ' steps'));
        const list = h('ol', 'c-steplist');
        steps.forEach((k, i) => {
          const li = h('li');
          const c = SR.cat(stepCat(k));
          const num = h('span', 'c-snum', String(i + 1)); num.style.background = c.base; num.style.color = c.ink || '#FFFFFF';
          const words = h('span', 'c-sname'); words.append(h('b', '', stepName(k)), h('small', '', stepLine(k)));
          li.append(num, words, h('span', 'c-smin', ((catchup ? CATCH_MIN : STEP_MIN)[k] || 2) + ' min'));
          list.appendChild(li);
        });
        right.appendChild(list);
        wrap.append(left, right);
        card.appendChild(wrap);
      }, 'c-intro');
    }

    /* == while it runs: the reset takes the screen. Its steps on the left, the week on the right, a named line across the top == */
    const stepsBar = h('nav', 'k k-chip c-steps'); stepsBar.dataset.edge = 'top'; stepsBar.setAttribute('aria-label', 'Sunday Reset steps'); stepsBar.hidden = true;
    app.appendChild(stepsBar);
    function drawSteps() {
      const r = SR.view.reset;
      stepsBar.hidden = !r;
      if (r) { const at = r.week + ':' + r.step; if (drawSteps.at !== at) { drawSteps.at = at; const rb = document.getElementById('rack-body'); if (rb) rb.scrollTop = 0; } }
      const rack = document.getElementById('rack');
      /* the panel stands on the left while it runs; the board measures its room again as soon as it moves */
      const side = window.innerWidth < 760 ? 'bottom' : 'left';
      if (rack && (rack.dataset.edge || '') !== (r ? side : '')) {
        if (r) rack.dataset.edge = side; else delete rack.dataset.edge;
        requestAnimationFrame(() => requestAnimationFrame(() => SR.layoutInsets()));
        /* and once more after the panel and the board have settled */
        setTimeout(() => SR.layoutInsets(), 450); setTimeout(() => SR.layoutInsets(), 1100);
      }
      if (!r) return;
      const steps = SR.stepsNow(), seen = r.catchup ? r.step : ((rec(r.week) || {}).step || 0);
      const kids = [];
      steps.forEach((s, i) => {
        if (s.key === 'done') return;
        if (kids.length) kids.push(h('i', 'c-sline' + (i <= seen ? ' did' : '')));
        const b = h('button', 'c-sbtn' + (i === r.step ? ' on' : i < r.step || i <= seen ? ' did' : ''));
        b.type = 'button';
        const mark = h('span', 'c-sdot');
        if (i !== r.step && (i < r.step || i <= seen)) mark.appendChild(SR.icon('check', 7, '#252928')); else mark.textContent = String(i + 1);
        b.append(mark, h('span', '', stepName(s.key)));
        if (i === r.step) b.setAttribute('aria-current', 'step');
        b.addEventListener('click', () => { SR.Snd.init(); SR.goStep(i); });
        kids.push(b);
      });
      stepsBar.replaceChildren(...kids);
    }

    /* == Repeat last week, in the dinner step: most weeks are mostly the same dinners == */
    window.SR_dinnerExtras = (body, dates) => {
      const st = SR.state, decided = (x) => x && (x.name || x.cook);
      const fill = dates.filter((d) => d >= SR.today && SR.day(d).blocks.some((b) => b.dinner) && !decided(st.dinners[d]) && decided(st.dinners[M.addDays(d, -7)]));
      if (!fill.length) return;
      const b = h('button', 'cta c-repeat'); b.type = 'button';
      const words = h('span', 'grow'); words.append(h('b', '', 'Repeat last week'), h('small', '', 'Fills ' + fill.length + (fill.length === 1 ? ' open night' : ' open nights')));
      b.append(SR.icon('pot', 10, '#F2CF7A'), words);
      b.addEventListener('click', () => {
        SR.Snd.init();
        SR.commit(() => { fill.forEach((d) => { st.dinners[d] = JSON.parse(JSON.stringify(st.dinners[M.addDays(d, -7)])); }); });
        if (SR.Snd.clack) SR.Snd.clack(0.8);
        SR.toast('Added last week’s dinners to ' + fill.length + (fill.length === 1 ? ' night.' : ' nights.'), 'good', { label: 'Undo', fn: SR.undo });
        SR.render();
      });
      body.appendChild(b);
    };

    /* == This week's plan: what the chip opens once the week is set ==
       V11 (docs/V11-TODOS.md): its to-dos are a list you can act on (check, add, give a time, change, take
       off), Open the week is the one gold button, and it opens before the reset too (the menu, To-dos), where
       it says what's set so far and offers the reset itself. Something it opens comes back to it. */
    function openPlan(ws, focusId) {
      closeMenu(); closeDock();
      const dates = M.range(ws, 7), last = dates[6];
      const title = planTitle(ws);
      /* checked off here: kept in place, struck through, until the plan closes */
      const kept = new Map(), fresh = new Set();
      /* rows keep their places while the plan is open, so a to-do checked off doesn't jump to the end */
      let order = [];
      const steady = (ids) => { order = order.filter((id) => ids.includes(id)).concat(ids.filter((id) => !order.includes(id))); return order.slice(); };
      Kit.sheet(title, (card) => {
        const cur = SR.today >= ws && SR.today <= last, future = ws > SR.today;
        /* a to-do added here is due the week's last day, unless you say a day */
        const defDue = () => (last < SR.today ? SR.today : last);
        const adder = todoAdder({ placeholder: 'Add a to-do', label: 'Add a to-do for this week', due: defDue, idle: () => 'Due ' + dayWord(defDue()) + ' unless you say a day, like “Call the bank Friday”.', onAdd: (t) => { fresh.add(t.id); draw(); } });
        const draw = () => {
          const st = SR.state, me = (SR.who() && SR.who().name) || 'You';
          const y = card.scrollTop, typing = document.activeElement === adder.inp, caret = typing ? [adder.inp.selectionStart, adder.inp.selectionEnd] : null;
          [...card.children].forEach((c) => { if (!c.classList.contains('k-x')) c.remove(); });
          const set = weekSet(ws) || (!cur && !future);
          const head = h('div', 'c-plan-head');
          const words = h('div');
          /* the time it was planned, only for a week whose reset this board finished */
          const rr = rec(ws), at = rr && (rr.done || rr.caught) ? planned[ws] : null;
          let kick = M.spanText(ws, last);
          if (at) { const d = new Date(at); kick = 'Planned ' + M.dateText(M.iso(d.getFullYear(), d.getMonth() + 1, d.getDate()), 'long') + ' at ' + M.clock(d.getHours() * 60 + d.getMinutes()); }
          else if (!set) kick += ' · Not planned yet';
          words.append(h('div', 'c-kick', kick), h('h2', '', title), h('p', 'k-lede', set ? 'Tap anything to change it.' : 'What’s on it so far. Tap anything to change it.'));
          const acts = h('div', 'c-plan-acts');
          const openWeek = Kit.btn(set ? 'c-go' : 'c-ghost', 'Open the week', () => { Kit.closeSheet(); Kit.zoom('week'); SR.view.focus = ws; SR.render(); });
          if (set) acts.appendChild(openWeek);
          else { const r = resetFor(ws); acts.append(Kit.btn('c-go', r.label, () => { Kit.closeSheet(); r.go(); }), openWeek); }
          head.append(words, acts);
          card.appendChild(head);
          const grid = h('div', 'c-plan-grid');

          /* dinners, and who's cooking */
          if (SR.useDinners()) {
            const box = h('section', 'c-pcard'); box.appendChild(h('h3', '', 'Dinners'));
            const cookWord = (x) => {
              if (!x) return null;
              if (x.cook === 'me') return { t: me.slice(0, 1).toUpperCase(), cls: 'me', name: me };
              if (x.cook === 'kim') return { t: (partnerName() || 'P').slice(0, 1).toUpperCase(), cls: 'them', name: partnerName() };
              const w = { home: 'Home', order: 'Order in', out: 'Eat out', leftovers: 'Leftovers', skip: 'Skip' }[x.cook];
              return w ? { t: w, cls: 'word', name: w } : null;
            };
            dates.forEach((d) => {
              if (!SR.day(d).blocks.some((b) => b.dinner)) return;
              const x = st.dinners[d];
              let who = cookWord(x);
              /* a night decided only by how (leftovers, eating out) says the how as its name */
              const name = x && x.name ? x.name : who && who.cls === 'word' ? who.name : x && x.cook ? 'Dinner' : d < SR.today ? 'Not planned' : 'Not picked';
              if (x && !x.name && who && who.cls === 'word') who = null;
              const row = h('button', 'c-prow'); row.type = 'button';
              row.append(h('span', 'c-pday', M.DAY_SHORT[M.weekday(d)]), h('span', 'c-pname' + (x && (x.name || x.cook) ? '' : ' quiet'), name));
              if (who) { const tag = h('span', 'c-who ' + who.cls, who.t); tag.title = who.cls === 'word' ? who.name : who.name + ' cooks'; row.appendChild(tag); }
              row.title = 'Dinner on ' + M.DAY_LONG[M.weekday(d)];
              row.addEventListener('click', () => { Kit.closeSheet(); backToPlan(ws); if (SR.inToday()) SR.setMode('planner'); SR.openSel({ type: 'dinner', date: d }); });
              box.appendChild(row);
            });
            grid.appendChild(box);
          }

          /* to-dos: what's due this week and still needs a time (the To-dos count, the same to-dos), then
             what has a time this week; each row checks off, opens to change, takes a time, and comes off */
          const tbox = h('section', 'c-pcard c-ptodos');
          const pl = M.placements(st), inWeek = (p) => p.date >= ws && p.date <= last;
          const dueList = cur ? dueWeek() : future ? M.dueSoon(st, SR.today, M.diffDays(SR.today, last), SR.nowMin) : [];
          const needIds = dueList.filter((x) => x.status !== 'planned' || x.plan.after).map((x) => x.task.id);
          kept.forEach((sec, id) => { if (sec === 'needs' && !needIds.includes(id) && SR.taskById(id)) needIds.push(id); });
          const needs = steady(needIds).map((id) => SR.taskById(id)).filter(Boolean);
          const timed = [];
          pl.forEach((list, id) => {
            const t = SR.taskById(id);
            if (!t || needIds.includes(id) || (t.archived && !kept.has(id))) return;
            const p = list.filter(inWeek).sort((a, b) => (a.date === b.date ? a.add.start - b.add.start : a.date < b.date ? -1 : 1))[0];
            if (p) timed.push({ t, p });
          });
          timed.sort((a, b) => (a.p.date === b.p.date ? a.p.add.start - b.p.add.start : a.p.date < b.p.date ? -1 : 1));
          const all = needs.length + timed.length, doneN = needs.filter((t) => t.done).length + timed.filter((x) => x.t.done).length;
          const th = h('div', 'c-ptodos-head'); th.appendChild(h('h3', '', 'To-dos'));
          if (all) th.appendChild(h('span', 'c-pcount', doneN + ' of ' + all + ' done'));
          tbox.appendChild(th);
          const ctx = { from: 'plan', ws, keep: kept, fresh, where: pl, root: tbox };
          if (needs.length) {
            const g = h('div', 'c-tdgroup');
            g.appendChild(h('div', 'c-tdgh ask', 'Needs a time'));
            needs.forEach((t) => g.appendChild(todoRow(t, Object.assign({}, ctx, { section: 'needs' }))));
            tbox.appendChild(g);
          } else if (cur || future) tbox.appendChild(h('p', 'c-pgood', all ? 'Everything due this week has a time.' : 'Nothing due this week, and nothing with a time yet.'));
          if (timed.length) {
            const g = h('div', 'c-tdgroup');
            g.appendChild(h('div', 'c-tdgh', 'Has a time'));
            timed.forEach((x) => g.appendChild(todoRow(x.t, Object.assign({}, ctx, { section: 'has' }), x.p)));
            tbox.appendChild(g);
          }
          if (cur || future) tbox.appendChild(adder);
          grid.appendChild(tbox);

          /* kept for you: good news only */
          const col = h('div', 'c-pcol');
          const evenings = dates.filter((d) => SR.day(d).blocks.some((b) => b.free && b.start >= 16 * 60));
          const yours = (SR.weekCounts(ws).yours || 0);
          if (evenings.length || yours > 0) {
            const kept = h('section', 'c-pcard kept');
            kept.appendChild(h('div', 'c-kick', 'Kept for you'));
            if (evenings.length) {
              const first = Math.min(...evenings.map((d) => SR.day(d).blocks.filter((b) => b.free && b.start >= 16 * 60)[0].start));
              const names = evenings.map((d) => M.DAY_SHORT[M.weekday(d)]);
              const list = names.join(', ');
              kept.append(h('div', 'c-kbig', evenings.length + (evenings.length === 1 ? ' free evening' : ' free evenings')), h('p', '', list + ', from ' + M.clock(first) + '.'));
              if (yours > 0) kept.appendChild(h('p', '', 'Plus ' + M.hours(yours) + ' to yourself.'));
            } else kept.append(h('div', 'c-kbig', M.hours(yours)), h('p', '', 'to yourself this week'));
            col.appendChild(kept);
          }
          if (SR.useTogether()) {
            const c = SR.weekCounts(ws);
            if (c.kim.length) { const us = h('section', 'c-pcard'); us.append(h('div', 'c-kick', 'With ' + (partnerName() || 'someone')), h('p', 'c-pbody', c.kim.join(', ') + '.')); col.appendChild(us); }
          }
          grid.appendChild(col);
          card.appendChild(grid);

          /* something changed: one thing, not the whole reset again (only once there's a plan to change) */
          if (set && (cur || future)) {
            const ch = h('section', 'c-changed');
            ch.append(h('h3', '', 'Something changed?'), h('p', '', 'Change one thing. No need to redo the reset.'));
            const row = h('div', 'c-fixes');
            const fix = (name, line, fn) => { const b = Kit.btn('c-fix', '', () => { Kit.closeSheet(); fn(); }); b.replaceChildren(h('b', '', name), h('span', '', line)); return b; };
            if (SR.useDinners()) row.appendChild(fix('Move a dinner', 'Swap nights or change who cooks', () => layOut('dinners')));
            if (cur && dueWeek().length) row.appendChild(fix('Place what’s due', 'Drag this week’s to-dos onto days', () => layOut('todo', 'soon')));
            row.appendChild(fix('Lighter day', 'Pick an easier kind of day', () => {
              Kit.zoom('day'); SR.view.focus = SR.today >= ws && SR.today <= dates[6] ? SR.today : ws; SR.render();
              setTimeout(() => { const k = document.querySelector('#kinds button'); if (k) k.click(); }, 350);
            }));
            const doneToday = planned[ws] && new Date(planned[ws]).toDateString() === new Date().toDateString();
            if (ws === M.weekStart(SR.today) && M.weekday(SR.today) !== 0 && !doneToday) row.appendChild(fix('Plan the rest of the week', 'To-dos and dinners, ' + minutesOf(runSteps(ws, true), true) + ' min', () => openIntro(ws, true)));
            ch.appendChild(row);
            /* the whole reset again is there, quietly, for the week that went sideways */
            ch.appendChild(Kit.btn('c-predo', 'Or redo the whole reset', () => { Kit.closeSheet(); SR.startReset(ws); }));
            card.appendChild(ch);
          }
          card.scrollTop = y;
          if (typing) { adder.inp.focus({ preventScroll: true }); try { adder.inp.setSelectionRange(caret[0], caret[1]); } catch (e) { /* fine */ } }
        };
        planLive = { draw, card };
        draw();
        /* back from a panel it opened: the to-do it was about, in view and in focus */
        if (focusId) setTimeout(() => { const r = card.querySelector('.c-td[data-id="' + focusId + '"] .c-td-main'); if (r) { r.scrollIntoView({ block: 'nearest' }); r.focus({ preventScroll: true }); } }, 60);
      }, 'c-plan');
    }

    /* == V11: To-dos and the week's plan (docs/V11-TODOS.md) ==
       Russell, Oct 14: the plan "looks cool, but it doesn't seem very functional", and the To-dos panel's six
       cards "blend in". One window for what's due: this week, the count on the To-dos button, the same to-dos
       on the bench, in the panel, in the plan, and in the reset. One row for a to-do wherever it shows: it
       checks off, opens to be changed, takes a time, and comes off the list, each with Undo. The panel is where
       the lists are kept; the desk is where their pieces are picked up and dragged onto days. */
    const dueWeek = () => M.dueSoon(SR.state, SR.today, 7, SR.nowMin);
    const capN = (n) => (n > 99 ? '99+' : String(n));
    const inboxGroup = () => SR.state.groups.find((g) => g.id === 'inbox') || SR.state.groups.find((g) => /^inbox$/i.test(g.name)) || SR.state.groups[0] || null;
    const byDue = (a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0);
    /* a day the short way: today, tomorrow, Thursday, or Oct 24 */
    const dayWord = (d) => { const n = M.diffDays(SR.today, d); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 && n < 7 ? M.DAY_LONG[M.weekday(d)] : M.MONTH_SHORT[M.parts(d).m - 1] + ' ' + M.parts(d).d; };
    const planWeek = () => { const wd = M.weekday(SR.today); return wd === 0 || (wd === 6 && SR.nowMin >= 17 * 60) ? SR.resetWeek() : M.weekStart(SR.today); };
    const planTitle = (ws) => (ws === M.weekStart(SR.today) || ws > SR.today ? (ws > SR.today && M.weekday(SR.today) === 6 ? 'Next week’s plan' : 'This week’s plan') : 'That week’s plan');
    const weekSet = (ws) => { const r = rec(ws); return !!(r && (r.done || r.caught || r.setup)); };
    /* the reset that fits a week that isn't planned yet, said the way the chip says it */
    function resetFor(ws) {
      const r = rec(ws), wd = M.weekday(SR.today);
      if (r && r.step > 0 && !r.done) return { label: 'Finish your reset', go: () => SR.startReset(ws) };
      if (ws > SR.today || wd === 0) return { label: 'Start Sunday Reset', go: () => openIntro(ws, false) };
      if (wd === 1 || wd === 2) return { label: 'Set up this week', go: () => openIntro(ws, false) };
      return { label: 'Plan the rest of the week', go: () => openIntro(ws, true) };
    }
    /* each list wears a color of its own: the board's color for a kind of time when its name is one (Home,
       Work), otherwise the next one not taken, in the order of the lists, so it doesn't change as to-dos come
       and go. Inbox is gold, like time that's yours */
    const LIST_CATS = ['home', 'family', 'us', 'work', 'meals', 'away'];
    function listColors() {
      const out = new Map(), used = new Set(), inbox = inboxGroup();
      SR.state.groups.forEach((g) => {
        if (g === inbox) { out.set(g.id, 'yours'); return; }
        const k = LIST_CATS.find((c) => !used.has(c) && SR.cat(c) && SR.cat(c).name.toLowerCase() === String(g.name).toLowerCase());
        if (k) { out.set(g.id, k); used.add(k); }
      });
      let i = 0;
      SR.state.groups.forEach((g) => { if (out.has(g.id)) return; const k = LIST_CATS.find((c) => !used.has(c)) || LIST_CATS[i++ % LIST_CATS.length]; out.set(g.id, k); used.add(k); });
      return out;
    }
    /* when it's due, as the line under its name says it: gold for today, tomorrow, and anything late */
    function dueWords(t) {
      if (!t.due) return null;
      const n = M.diffDays(SR.today, t.due);
      if (n < 0) return { text: 'Was due ' + (n === -1 ? 'yesterday' : n > -7 ? M.DAY_LONG[M.weekday(t.due)] : M.MONTH_SHORT[M.parts(t.due).m - 1] + ' ' + M.parts(t.due).d), ask: true };
      return { text: 'Due ' + dayWord(t.due), ask: n <= 1 };
    }
    const whenText = (p) => M.DAY_SHORT[M.weekday(p.date)] + ', ' + M.clock(p.add.start);

    /* one to-do as a row: a check, its name and where it stands (tap to change it), a way to give it a time,
       and a way off the list. ctx: where (placements), keep and section (a to-do checked off here stays in
       place, struck through, until the panel closes), fresh (added a moment ago), from ('plan' or 'dock'), ws, root.
       at: its time this week, for the plan's Has a time */
    function todoRow(t, ctx, at) {
      const plan = M.taskPlan(t, ctx.where.get(t.id), SR.today, SR.nowMin);
      const row = h('div', 'c-td' + (t.done ? ' done' : '') + (ctx.fresh && ctx.fresh.has(t.id) ? ' fresh' : ''));
      row.dataset.id = t.id;
      if (ctx.fresh) ctx.fresh.delete(t.id);
      const ck = h('button', 'c-td-ck'); ck.type = 'button';
      ck.setAttribute('aria-pressed', String(!!t.done));
      ck.setAttribute('aria-label', 'Done: ' + t.name);
      ck.title = t.done ? 'Not done after all' : 'Done';
      const ring = h('i'); if (t.done) ring.appendChild(SR.icon('check', 7, '#17301F'));
      ck.appendChild(ring);
      ck.addEventListener('click', () => { SR.Snd.init(); doneTodo(t, ctx); });
      /* where it stands, in a line: the time it has, when it's due, what's left */
      const bits = [], dw = dueWords(t);
      if (t.done) bits.push({ text: t.skipped ? 'Skipped this time' : 'Done' });
      else if (plan.status === 'planned') {
        const p = at || plan.next;
        if (p) bits.push({ text: whenText(p) });
        if (plan.after) bits.push({ text: 'That’s after it’s due', ask: true });
        else if (dw) bits.push({ text: dw.text });
      } else {
        if (dw) bits.push(dw);
        if (plan.status === 'partial') bits.push({ text: plan.timed + ' of ' + plan.open + ' steps ' + (plan.timed === 1 ? 'has' : 'have') + ' a time' });
        else if (plan.status === 'missed') bits.push({ text: (at ? whenText(at) + ' went by' : 'Its time went by'), ask: true });
        else bits.push({ text: t.steps && t.steps.length ? t.steps.length + ' steps, no time yet' : 'No time yet' });
      }
      const main = h('button', 'c-td-main'); main.type = 'button';
      main.title = 'Change it: its name, the day it’s due, its steps';
      const line = h('span', 'c-td-line');
      bits.forEach((b, i) => { if (i) line.appendChild(document.createTextNode(' · ')); line.appendChild(h('span', b.ask ? 'ask' : '', b.text)); });
      main.append(h('b', 'c-td-name', t.name), line);
      main.addEventListener('click', () => { SR.Snd.init(); openTodo(t, ctx); });
      row.append(ck, main);
      /* a time: the place panel for the whole thing; with some steps timed, or a time after it's due, the
         to-do's own panel, where each step and each time is */
      if (!t.done && (plan.status !== 'planned' || plan.after)) {
        const tm = h('button', 'c-td-time'); tm.type = 'button';
        const what = plan.after ? 'Move it before it’s due' : plan.status === 'partial' ? 'Give the rest a time' : 'Give it a time';
        tm.setAttribute('aria-label', what + ': ' + t.name); tm.title = what;
        tm.appendChild(SR.icon('calendar', 8, '#F2CF7A'));
        tm.addEventListener('click', () => { SR.Snd.init(); if (plan.status === 'partial' || plan.after) openTodo(t, ctx); else giveTime(t, ctx); });
        row.appendChild(tm);
      }
      const x = h('button', 'c-td-x'); x.type = 'button';
      x.setAttribute('aria-label', 'Take ' + t.name + ' off the list'); x.title = 'Take it off the list';
      x.appendChild(SR.icon('x', 6, '#FFFFFF'));
      x.addEventListener('click', () => { SR.Snd.init(); removeTodo(t, ctx); });
      row.appendChild(x);
      return row;
    }
    /* what a row does, each with Undo; the panel and the plan redraw themselves when the board changes */
    function doneTodo(t0, ctx) {
      const t = SR.taskById(t0.id);
      if (!t) return;
      const was = !!t.done;
      if (ctx.keep) ctx.keep.set(t.id, ctx.section);
      let next = null;
      SR.commit(() => { next = SR.markDone(t, null, !was); });
      if (!was) { snd('clack', 0.6); SR.toast(t.name + ' is done.' + (next && next.due ? ' The next one is due ' + dayWord(next.due) + '.' : ''), 'good', { label: 'Undo', fn: SR.undo }); }
      else snd('detent');
      const b = ctx.root && ctx.root.querySelector('.c-td[data-id="' + t.id + '"] .c-td-ck');
      if (b) b.focus({ preventScroll: true });
    }
    function removeTodo(t0, ctx) {
      const t = SR.taskById(t0.id);
      if (!t) return;
      const id = t.id, name = t.name, had = (M.placements(SR.state).get(id) || []).length > 0;
      /* focus goes to the row after it, or the one before */
      const here = ctx.root && ctx.root.querySelector('.c-td[data-id="' + id + '"]');
      const near = here && (here.nextElementSibling || here.previousElementSibling);
      const nearId = near && near.dataset && near.dataset.id;
      if (ctx.keep) ctx.keep.delete(id);
      SR.commit(() => {
        const st = SR.state;
        st.tasks = st.tasks.filter((x) => x.id !== id);
        Object.values(st.dates).forEach((dd) => { if (dd.adds) dd.adds = dd.adds.filter((a) => !(a.src && ((a.src.type === 'task' && a.src.id === id) || (a.src.type === 'step' && a.src.task === id)))); });
      });
      snd('slide');
      SR.toast(name + ' is off your list' + (had ? ' and off the week' : '') + '.', '', { label: 'Undo', fn: SR.undo });
      const f = ctx.root && (nearId ? ctx.root.querySelector('.c-td[data-id="' + nearId + '"] .c-td-main') : ctx.root.querySelector('.c-td-main, .c-tdadd-in'));
      if (f) f.focus({ preventScroll: true });
    }
    /* the to-do's own panel (its name, the day it's due, its steps, its times) */
    function openTodo(t, ctx) {
      if (ctx.from === 'plan') { Kit.closeSheet(); backToPlan(ctx.ws, t.id); }
      if (SR.inToday()) SR.setMode('planner');
      SR.openSel({ type: 'task', id: t.id });
    }
    /* the place panel, on the week the to-do is for, with the board showing where it lands */
    function giveTime(t, ctx) {
      const ws = ctx.ws || M.weekStart(SR.today);
      if (ctx.from === 'plan') { Kit.closeSheet(); backToPlan(ws, t.id); }
      if (SR.inToday()) SR.setMode('planner');
      const v = SR.view;
      if (v.zoom !== 'week' && v.zoom !== 'day') SR.setZoom('week');
      if (!(v.focus >= ws && v.focus <= M.addDays(ws, 6))) { v.focus = SR.today >= ws && SR.today <= M.addDays(ws, 6) ? SR.today : ws; SR.render(); }
      SR.openSel({ type: 'place', spec: { kind: 'task', id: t.id } });
    }
    /* a panel opened from the plan brings the plan back when it closes, a beat later so a block placed from
       it is seen landing */
    let planBack = null, planLive = null;
    function backToPlan(ws, id) { planBack = { ws, id, at: Date.now(), opened: false }; }
    {
      const side = document.getElementById('side');
      if (side) new MutationObserver(() => {
        if (!planBack) return;
        if (!side.hidden) { planBack.opened = true; return; }
        if (!planBack.opened) return;
        const b = planBack; planBack = null;
        if (Date.now() - b.at > 10 * 60000) return;
        setTimeout(() => { if (Kit.openSheetEl || mat || SR.view.reset || dock || !side.hidden) return; openPlan(b.ws, b.id); }, 650);
      }).observe(side, { attributes: true, attributeFilter: ['hidden'] });
    }

    /* what's typed, read the way Add reads it: a day makes it due that day; a time hands it to Add, which
       shows where it lands before it's placed */
    function parseTodo(text, o) {
      const v = String(text || '').trim();
      if (!v) return null;
      const p = M.parseQuick(v, SR.today, SR.state.palette, SR.nowMin);
      if (p && p.kind === 'block') return { kind: 'quick', p };
      const g = (o && o.group && SR.state.groups.find((x) => x.id === o.group)) || inboxGroup();
      return { kind: 'task', name: (p && p.name) || v, due: (p && (p.due || p.date)) || (o && o.due ? o.due() : null), group: g, cat: p && p.pal ? p.cat : 'yours' };
    }
    function addTodo(text, o) {
      const p = parseTodo(text, o);
      if (!p) return null;
      if (p.kind === 'quick') { SR.openQuick(String(text).trim()); return 'quick'; }
      const t = { id: M.newId('t'), name: p.name.slice(0, 80), group: p.group ? p.group.id : null, icon: (p.group && p.group.icon) || 'check', cat: p.cat || 'yours', dur: null, due: p.due || null, repeat: null, done: false, steps: [] };
      SR.commit(() => { SR.state.tasks.push(t); });
      snd('good');
      SR.toast('Added to ' + (p.group ? p.group.name : 'your list') + (t.due ? ', due ' + dayWord(t.due) : '') + '.', 'good', { label: 'Undo', fn: SR.undo });
      return t;
    }
    /* a box to add a to-do: Enter or Add puts it on the list and keeps the box for the next one. o: placeholder,
       label, due (the day it's due unless one is typed), group, idle (the line under it while it's empty),
       find (told what's typed, for a panel that filters as you type), onAdd, inline (a list's own box: Esc
       with nothing typed closes it, onClose), strong (the gold outline) */
    function todoAdder(o) {
      const box = h('form', 'c-tdadder' + (o.strong ? ' strong' : '') + (o.inline ? ' inline' : '')); box.noValidate = true;
      const row = h('div', 'c-tdadd-row');
      const inp = h('input', 'c-find c-tdadd-in'); inp.type = 'text'; inp.maxLength = 80; inp.autocomplete = 'off';
      inp.placeholder = o.placeholder; inp.setAttribute('aria-label', o.label || o.placeholder);
      if (o.inline) inp.dataset.inline = '1';
      const go = h('button', 'c-tdadd-go'); go.type = 'submit';
      go.append(SR.icon('plus', 7, o.strong ? '#F2CF7A' : '#FFFFFF'), h('span', '', 'Add'));
      const hint = h('p', 'c-tdadd-hint'); hint.id = 'tdh-' + Math.random().toString(36).slice(2, 8);
      inp.setAttribute('aria-describedby', hint.id);
      const say = () => {
        const v = inp.value.trim(), p = v ? parseTodo(v, o) : null;
        hint.textContent = !p ? (o.idle ? o.idle() : '') : p.kind === 'quick' ? 'Enter opens Add, to give it that time.'
          : 'Enter adds “' + p.name + '” to ' + (p.group ? p.group.name : 'your list') + (p.due ? ', due ' + dayWord(p.due) : '') + '.';
        hint.hidden = !hint.textContent;
      };
      inp.addEventListener('input', () => { say(); if (o.find) o.find(inp.value); });
      inp.addEventListener('c-close', () => { if (o.onClose) o.onClose(); });
      box.addEventListener('submit', (e) => {
        e.preventDefault();
        SR.Snd.init();
        const v = inp.value.trim();
        if (!v) { inp.focus(); return; }
        const t = addTodo(v, o);
        if (!t) return;
        inp.value = ''; say();
        if (o.find) o.find('');
        if (t !== 'quick') { if (o.onAdd) o.onAdd(t); inp.focus({ preventScroll: true }); }
      });
      row.append(inp, go);
      box.append(row, hint);
      box.inp = inp;
      say();
      return box;
    }
    /* Esc in a box with words in it clears the words first; in a list's own empty box it closes the box */
    window.addEventListener('keydown', (e) => {
      const t = e.target;
      if (e.key !== 'Escape' || !t || !t.classList || !t.classList.contains('c-tdadd-in')) return;
      if (t.value) { e.preventDefault(); e.stopImmediatePropagation(); t.value = ''; t.dispatchEvent(new Event('input')); return; }
      if (t.dataset.inline) { e.preventDefault(); e.stopImmediatePropagation(); t.dispatchEvent(new CustomEvent('c-close')); }
    }, true);

    /* == the To-dos panel: where the lists are kept ==
       Due this week leads, in gold, with the same to-dos the To-dos button counts; then each list in its own
       color, its to-dos as rows that act in place; then what's done, folded. Lay out puts a list's pieces on
       the desk beside the week, to drag onto days, and the list says it's on the desk. The panel never draws
       pieces and the desk never draws check boxes. Dinners and ideas aren't to-dos: they're a tap away at the
       foot, not mixed in. */
    let dockLive = null;
    const tdFold = stored('sundayreset.v11.todoFold', {});
    const tdMore = new Set();
    function openTodos() {
      closeMenu();
      const kept = new Map(), fresh = new Set(), orders = new Map();
      let q = '', addIn = null, addFocus = false;
      openDock((card) => {
        card.classList.add('c-tdock');
        const head = h('div', 'c-tdhead');
        head.append(h('h2', '', 'To-dos'), Kit.btn('c-tdlink', planTitle(planWeek()), () => { closeDock(); openPlan(planWeek()); }, 'calendar'));
        const adder = todoAdder({ placeholder: 'Add or find a to-do', label: 'Add a to-do, or find one', strong: true, find: (v) => { q = v.trim().toLowerCase(); draw(); }, onAdd: (t) => { fresh.add(t.id); if (t.group) tdMore.add(t.group); draw(); } });
        const lede = h('p', 'c-tdlede');
        const scroll = h('div', 'c-scroll c-tdscroll');
        card.append(head, adder, lede, scroll);
        const more = scrollHint(scroll, card);
        /* rows keep their places while the panel is open: a to-do checked off stays put, struck through */
        const steady = (key, ids) => { const was = orders.get(key) || []; const now = was.filter((id) => ids.includes(id)).concat(ids.filter((id) => !was.includes(id))); orders.set(key, now); return now; };
        function section(o) {
          const box = h('section', 'c-tdsec' + (o.cls ? ' ' + o.cls : ''));
          const folded = !q && !!o.fold && (o.id in tdFold ? !!tdFold[o.id] : !!o.foldFirst);
          const top = h('div', 'c-tdsec-top');
          const lab = h(o.fold ? 'button' : 'div', 'c-tdsec-h');
          const c = SR.cat(o.cat) || { base: '#5B616C', ink: '#FFFFFF' };
          const mark = h('span', 'c-tdmark'); mark.style.background = c.base; mark.appendChild(SR.icon(o.icon, 7, c.ink || '#FFFFFF'));
          lab.append(mark, h('h3', '', o.name));
          if (o.n) lab.appendChild(h('span', 'c-tdn', capN(o.n)));
          if (o.fold) {
            lab.type = 'button';
            lab.setAttribute('aria-expanded', String(!folded));
            const chev = SR.icon('down', 6, '#FFFFFF'); chev.classList.add('c-tdchev'); lab.appendChild(chev);
            lab.addEventListener('click', () => { tdFold[o.id] = !folded; keep('sundayreset.v11.todoFold', tdFold); draw(); });
          }
          top.appendChild(lab);
          if (o.lay) {
            const on = o.out === o.id;
            const lay = Kit.btn('c-tdlay' + (on ? ' on' : ''), on ? 'On the desk' : 'Lay out', () => { if (on) { SR.view.bench = null; snd('slide'); SR.render(); } else layOut('todo', o.id); });
            lay.setAttribute('aria-pressed', String(on));
            lay.setAttribute('aria-label', on ? o.name + ' is on the desk. Put it away' : 'Lay ' + o.name + ' out on the desk, to drag onto days');
            lay.title = on ? 'Put its pieces away' : 'Put its pieces on the desk, to drag onto days';
            top.appendChild(lay);
          }
          if (o.put && !folded) top.appendChild(Kit.btn('c-tdlay', 'Put them away', () => { const ids = o.rows.map((t) => t.id); SR.commit(() => { ids.forEach((id) => { const t = SR.taskById(id); if (t) t.archived = true; }); }); snd('slide'); SR.toast(ids.length + (ids.length === 1 ? ' done to-do is put away.' : ' done to-dos are put away.') + ' Find still finds them.', '', { label: 'Undo', fn: SR.undo }); }));
          box.appendChild(top);
          if (folded) return box;
          const list = h('div', 'c-tdrows');
          const ctx = { from: 'dock', keep: kept, fresh, where: o.pl, section: o.id, root: scroll };
          /* a long list shows its first five; what's due this week always shows whole */
          const many = o.rows.length > 6 && !tdMore.has(o.id) && !q && o.id !== 'soon';
          (many ? o.rows.slice(0, 5) : o.rows).forEach((t) => list.appendChild(todoRow(t, ctx)));
          if (o.empty && !o.rows.length) list.appendChild(h('p', 'c-tdempty', o.empty));
          box.appendChild(list);
          if (many) box.appendChild(Kit.btn('c-tdmore', (o.rows.length - 5) + ' more', () => { tdMore.add(o.id); draw(); }));
          /* a list's own box, to add straight into it */
          if (o.add && !q) {
            if (addIn === o.id) {
              const a = todoAdder({ placeholder: 'Add to ' + o.name, group: o.id, inline: true, onAdd: (t) => { fresh.add(t.id); tdMore.add(o.id); draw(); }, onClose: () => { addIn = null; draw(); const b = scroll.querySelector('[data-addin="' + o.id + '"]'); if (b) b.focus(); } });
              box.appendChild(a);
              if (addFocus) { addFocus = false; setTimeout(() => a.inp.focus({ preventScroll: true }), 0); }
            } else {
              const b = Kit.btn('c-tdaddin', 'Add to ' + o.name, () => { addIn = o.id; addFocus = true; draw(); }, 'plus');
              b.dataset.addin = o.id;
              box.appendChild(b);
            }
          }
          return box;
        }
        const draw = () => {
          const st = SR.state, pl = M.placements(st), y = scroll.scrollTop;
          const out = SR.view.bench && SR.view.bench.tab === 'todo' ? SR.view.bench.level || 'soon' : null;
          lede.hidden = !out;
          lede.textContent = out ? 'Its pieces are on the desk. Drag one onto a day.' : '';
          const match = (t) => !q || t.name.toLowerCase().includes(q) || (t.steps || []).some((s) => s.name.toLowerCase().includes(q));
          const pick = (key, ids) => { kept.forEach((sec, id) => { if (sec === key && !ids.includes(id) && SR.taskById(id)) ids.push(id); }); return steady(key, ids).map((id) => SR.taskById(id)).filter((t) => t && match(t)); };
          const frag = document.createDocumentFragment();
          let shown = 0;
          /* due this week leads */
          const dw = dueWeek(), dueRows = pick('soon', dw.map((x) => x.task.id));
          shown += dueRows.length;
          if (!q || dueRows.length) {
            const later = st.tasks.filter((t) => !t.done && !t.archived && t.due && t.due > M.addDays(SR.today, 7)).sort(byDue)[0];
            frag.appendChild(section({ id: 'soon', name: 'Due this week', icon: 'flag', cat: 'yours', n: dw.length, rows: dueRows, cls: 'due', lay: true, out, pl, empty: 'Nothing due this week.' + (later ? ' Next: ' + later.name + ', ' + dayWord(later.due) + '.' : '') }));
          }
          /* each list, in its own color */
          const colors = listColors();
          st.groups.forEach((g) => {
            const open = st.tasks.filter((t) => t.group === g.id && !t.done && !t.archived).sort(byDue);
            const rows = pick(g.id, open.map((t) => t.id));
            shown += rows.length;
            if (q && !rows.length) return;
            frag.appendChild(section({ id: g.id, name: g.name, icon: g.icon || 'check', cat: colors.get(g.id), n: open.length, rows, fold: true, lay: true, out, pl, add: true, empty: 'Nothing here yet.' }));
          });
          /* what's done and not put away, folded */
          const done = st.tasks.filter((t) => t.done && !t.archived && !kept.has(t.id) && match(t));
          if (done.length) frag.appendChild(section({ id: 'done', name: 'Done', icon: 'check', cat: 'meals', n: done.length, rows: done, fold: true, foldFirst: true, pl, put: true }));
          if (q && !shown && !done.length) frag.appendChild(h('p', 'c-tdempty', 'Nothing called that. Enter adds it.'));
          const foot = h('div', 'c-tdfoot');
          foot.appendChild(Kit.btn('c-tdlink', 'New list', () => SR.openSel({ type: 'newGroup' }), 'plus'));
          if (SR.useDinners()) foot.appendChild(Kit.btn('c-tdlink', 'Dinners', () => layOut('dinners'), 'pot'));
          if (SR.useTogether()) foot.appendChild(Kit.btn('c-tdlink', partnerName() ? 'Ideas with ' + partnerName() : SR.withName(), () => layOut('kim'), 'heart'));
          frag.appendChild(foot);
          scroll.replaceChildren(frag);
          scroll.scrollTop = y;
          more();
        };
        dockLive = { draw, card };
        draw();
        if (window.matchMedia && matchMedia('(pointer: fine)').matches) setTimeout(() => adder.inp.focus({ preventScroll: true }), 60);
      });
    }

    /* the panel and the plan stay true to the board: a change from anywhere (Undo, a to-do's own panel, a
       piece dropped on the desk) redraws them */
    {
      let was = '';
      Kit.renders.push(() => {
        if (dockLive && !dockLive.card.isConnected) dockLive = null;
        if (planLive && !planLive.card.isConnected) planLive = null;
        if (!dockLive && !planLive) { was = ''; return; }
        const adds = [];
        M.placements(SR.state).forEach((l, id) => adds.push(id + ':' + l.map((p) => p.date + '@' + p.add.start + '+' + p.add.dur).join(',')));
        const sig = [JSON.stringify(SR.state.tasks), adds.join(';'), JSON.stringify(SR.state.groups), JSON.stringify(SR.view.bench), SR.today, Math.floor(SR.nowMin / 15), JSON.stringify(SR.state.dinners), JSON.stringify(SR.state.weeks)].join('|');
        if (sig === was) return;
        was = sig;
        if (dockLive) dockLive.draw();
        if (planLive) planLive.draw();
      });
    }

    /* == the first time the week is set (by a reset, a catch up, or the setup), a note over the chip says
       where the plan lives, once on this device. Not in a preview, and never over anything open == */
    {
      const SEEN = 'sundayreset.v11.planSeen';
      let seen = !!stored(SEEN, false), tip = null, wait = 0;
      const free = () => chipState().kind === 'plan' && !rchip.hidden && rchip.offsetParent !== null && !SR.view.reset && !SR.view.sel && !Kit.openSheetEl && !mat && !dock && !menu
        && !document.querySelector('.c-coach, .c-mat') && document.getElementById('sheet').hidden && !SR.view.preview;
      const hide = () => { clearTimeout(wait); wait = 0; if (tip) { tip.remove(); tip = null; } };
      const place = () => {
        if (!tip) return;
        const r = rchip.getBoundingClientRect();
        tip.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + 'px';
        tip.style.bottom = Math.round(window.innerHeight - r.top + 14) + 'px';
        tip.style.setProperty('--tip-x', Math.round(r.width / 2) + 'px');
      };
      const show = () => {
        if (seen || tip || !free()) return;
        seen = true; keep(SEEN, true);
        tip = h('div', 'k c-planhint'); tip.setAttribute('role', 'note');
        const acts = h('div', 'c-planhint-acts');
        acts.append(Kit.btn('c-go', 'See the plan', () => { const s = chipState(); hide(); if (s.go) s.go(); }), Kit.btn('c-planhint-x', 'Got it', hide));
        tip.append(h('b', '', 'Your plan for the week is here'), h('p', '', 'Dinners, to-dos, and time for you. Tap it any time this week.'), acts);
        app.appendChild(tip);
        place();
      };
      Kit.renders.push(() => {
        if (seen && !tip) return;
        if (tip) { if (!free()) hide(); else place(); return; }
        if (!free()) { clearTimeout(wait); wait = 0; return; }
        if (!wait) wait = setTimeout(() => { wait = 0; show(); }, 1400);
      });
      window.addEventListener('resize', () => requestAnimationFrame(place));
    }

    /* for trying the states by hand: Kit.v3.openIntro(ws, catchup), Kit.v3.openPlan(ws), Kit.v3.chipState() */
    Kit.v7 = { openDeskSetup: (o) => openDeskSetup(o), openSetupIntro: (o) => openSetupIntro(o), coachTour: (a) => coachTour(a), trySetup: (k) => trySetup(k), startHello, showRack, scatter: (w) => scatter(w.split('')), openIntro, openPlan, chipState, runSteps, openMealBoard, openDetail, openTodos, closeMat, openMenu: () => openMenu(), closeMenu: () => closeMenu() };
    /* V11: the phone's way to the meal board: Plan meals on the phone list's dinner question, its groceries,
       a small Meals card when neither is there, and any dinner's panel (app.js asks for window.SR_planMeals) */
    window.SR_planMeals = () => {
      /* the meal board opens over the phone's list; from the phone's desk it goes back to the list first */
      if (SR.phoneDay && SR.phoneDay()) { SR.closePhoneDesk(); setTimeout(() => Kit.v7.openMealBoard(), 80); return; }
      Kit.v7.openMealBoard();
    };

    /* the time a reset was finished, for the plan's kicker */
    let resetWas = null;
    function notePlanned() {
      const r = SR.view.reset;
      if (resetWas && !r) { const x = rec(resetWas); if (x && (x.done || x.caught) && !planned[resetWas]) { planned[resetWas] = Date.now(); savePlanned(); } }
      resetWas = r ? r.week : null;
    }

    /* == V11: a region that scrolls says so ==
       A soft fade at its foot and a "More below" button while there's more under the fold; the button scrolls
       most of a screen. It lives in `host`, outside the scroller, so the fade never dims it. Returns the
       check, for after the contents change. */
    function scrollHint(box, host) {
      const btn = Kit.btn('c-more', 'More below', () => box.scrollBy({ top: box.clientHeight * 0.7, behavior: feelOn() ? 'smooth' : 'auto' }), 'down');
      btn.tabIndex = -1; btn.setAttribute('aria-hidden', 'true');
      host.appendChild(btn);
      const check = () => {
        if (!box.isConnected) return;
        const more = box.scrollHeight - box.scrollTop - box.clientHeight > 12 && box.clientHeight > 0 && getComputedStyle(box).overflowY !== 'visible';
        box.classList.toggle('c-more-below', more);
        btn.classList.toggle('on', more);
        if (more) { const r = box.getBoundingClientRect(), hr = host.getBoundingClientRect(); btn.style.left = (r.left - hr.left + r.width / 2) + 'px'; btn.style.top = (r.bottom - hr.top - 52) + 'px'; }
      };
      box.addEventListener('scroll', check, { passive: true });
      if (window.ResizeObserver) new ResizeObserver(check).observe(box);
      requestAnimationFrame(check);
      return check;
    }

    /* == V4: dragging blocks by hand. Lift, follow the pointer, snap into a slot, land with a tap == */
    const snd = (k, a) => { try { if (SR.Snd[k]) SR.Snd[k](a); } catch (e) { /* fine */ } };
    /* V11: the click that follows a drag isn't a tap */
    let dragEndAt = 0;
    const recentDrag = () => performance.now() - dragEndAt < 350;
    function draggable(el, payload, cfg) {
      el.classList.add('c-drag');
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.c-nodrag')) return;
        SR.Snd.init();
        const r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
        /* V11: a place that can't take it (cfg.why says why) shows a no while you're over it, and says
           why when you let go there, instead of the piece flying home without a word */
        let ghost = null, over = null, moved = false, refused = null, alt = false;
        /* V11: the piece keeps the spot you grabbed under the pointer, lifts, and leans the way it moves,
           swinging back level when you stop (a pendulum pushed by how fast it speeds up) */
        const sw = { x: 0, v: 0, cx: r.left, px: r.left, vx: 0, at: 0, raf: 0 };
        /* V11: near the top or bottom of a region that scrolls, it scrolls for you, faster the closer you are */
        const auto = { sc: null, x: 0, y: 0, raf: 0 };
        const autoStep = () => {
          auto.raf = 0;
          if (!ghost || !auto.sc) return;
          const rr = auto.sc.getBoundingClientRect(), edge = 56;
          const dTop = auto.y - rr.top, dBot = rr.bottom - auto.y;
          const v = dTop < edge ? -(edge - Math.max(0, dTop)) * 0.35 : dBot < edge ? (edge - Math.max(0, dBot)) * 0.35 : 0;
          if (!v) return;
          const was = auto.sc.scrollTop;
          auto.sc.scrollTop += v;
          if (auto.sc.scrollTop !== was) { aimAt(auto.x, auto.y); auto.raf = requestAnimationFrame(autoStep); }
        };
        const swing = (now) => {
          if (!ghost) return;
          const dt = Math.min(0.05, Math.max(0.001, (now - sw.at) / 1000)); sw.at = now;
          const v = (sw.cx - sw.px) / dt; sw.px = sw.cx;
          const acc = Math.max(-4000, Math.min(4000, (v - sw.vx) / dt)); sw.vx = v;
          const n = Math.ceil(dt * 240), hh = dt / n;
          for (let i = 0; i < n; i++) { sw.v += (-140 * sw.x - 13 * sw.v + acc * 0.0045) * hh; sw.x += sw.v * hh; }
          ghost.style.rotate = Math.max(-9, Math.min(9, -2 + sw.x)).toFixed(2) + 'deg';
          sw.raf = requestAnimationFrame(swing);
        };
        const move = (ev) => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!moved && Math.hypot(dx, dy) < 6) return;
          if (!moved) {
            moved = true;
            ghost = el.cloneNode(true); ghost.classList.add('c-ghost-block'); ghost.classList.remove('c-drag');
            Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', transform: 'none', transformOrigin: (sx - r.left) + 'px ' + (sy - r.top) + 'px', translate: r.left + 'px ' + r.top + 'px', rotate: '-2deg', scale: '1' });
            document.body.appendChild(ghost);
            if (feelOn()) { requestAnimationFrame(() => { if (ghost) ghost.style.scale = '1.07'; }); sw.at = performance.now(); sw.raf = requestAnimationFrame(swing); }
            else ghost.style.scale = '1.07';
            el.classList.add('c-lifted'); snd('pick');
            if (cfg.onLift) cfg.onLift(payload);
          }
          /* V11: Option (Alt) held while dragging a meal copies it; the piece in hand shows a plus */
          if (!!ev.altKey !== alt) { alt = !!ev.altKey; ghost.classList.toggle('c-copy', alt && !!payload.from); if (cfg.onAlt) cfg.onAlt(alt); }
          sw.cx = r.left + dx;
          ghost.style.translate = (r.left + dx) + 'px ' + (r.top + dy) + 'px';
          aimAt(ev.clientX, ev.clientY);
          auto.x = ev.clientX; auto.y = ev.clientY;
          if (!auto.raf && auto.sc) auto.raf = requestAnimationFrame(autoStep);
        };
        function aimAt(x, y) {
          if (!ghost) return;
          ghost.style.visibility = 'hidden';
          const under = document.elementFromPoint(x, y);
          ghost.style.visibility = '';
          auto.sc = under && under.closest('.c-autoscroll') || el.closest('.c-autoscroll');
          let z = under && under.closest('[data-zone]'), no = null;
          if (z && cfg.accept && !cfg.accept(z, payload)) { no = cfg.why ? z : null; z = null; }
          if (no !== refused) { if (refused) refused.classList.remove('c-no'); refused = no; if (refused) refused.classList.add('c-no'); }
          if (z !== over) { if (over) over.classList.remove('c-over'); over = z; if (over) { over.classList.add('c-over'); snd('detent'); } }
        }
        const up = () => {
          window.removeEventListener('pointermove', move);
          cancelAnimationFrame(sw.raf); cancelAnimationFrame(auto.raf); auto.sc = null;
          if (!moved) { if (cfg.onTap) cfg.onTap(payload, el); return; }
          dragEndAt = performance.now();
          if (cfg.onEnd) cfg.onEnd(payload);
          const g = ghost; ghost = null;
          const still = !feelOn();
          const target = over, no = refused;
          if (no) { no.classList.remove('c-no'); refused = null; const say = cfg.why(no, payload); if (say) SR.toast(say, ''); }
          if (target) {
            el.classList.remove('c-lifted');
            target.classList.remove('c-over');
            const tr = target.getBoundingClientRect();
            g.style.transition = 'translate 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), scale 0.2s ' + FOUT + ', rotate 0.2s ' + FOUT;
            Object.assign(g.style, { translate: (tr.left + (tr.width - r.width) / 2) + 'px ' + (tr.top + (tr.height - r.height) / 2) + 'px', scale: '1', rotate: '0deg' });
            const copy = alt;
            setTimeout(() => { g.remove(); cfg.onDrop(target, payload, { copy }); snd('clack', 0.85); }, still ? 0 : 190);
          } else if (cfg.onOut && !no) {
            el.classList.remove('c-lifted');
            g.style.transition = 'opacity 0.18s, scale 0.18s';
            g.style.opacity = '0'; g.style.scale = '0.9';
            setTimeout(() => g.remove(), 190);
            cfg.onOut(payload); snd('slide');
          } else {
            /* dropped nowhere: it flies back to where it was, and the spot it left fills again as it lands */
            g.style.transition = still ? 'none' : 'translate 0.24s ' + FOUT + ', scale 0.24s ' + FOUT + ', rotate 0.24s ' + FOUT;
            Object.assign(g.style, { translate: r.left + 'px ' + r.top + 'px', scale: '1', rotate: '0deg' });
            setTimeout(() => { g.remove(); el.classList.remove('c-lifted'); snd('tap'); }, still ? 0 : 240);
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up, { once: true });
      });
    }
    /* a block drawn in the DOM, the same colors as the desk's */
    function domBlock(name, sub, color, ink, cls) {
      const b = h('div', 'c-dblock ' + (cls || ''));
      b.style.setProperty('--b', color); b.style.setProperty('--i', ink || '#FFFFFF');
      b.appendChild(h('b', '', name));
      if (sub) b.appendChild(h('small', '', sub));
      return b;
    }
    const catColor = (k) => { const c = SR.cat(k) || {}; return { base: c.base || '#5B4632', ink: c.ink || '#FFFFFF' }; };

    /* == V4: a second mat beside the desk. The camera slides over, a mat drops in, Done slides back == */
    let mat = null, matClose = null;
    /* V11: a mat can close what’s open inside it before Escape closes the mat, and tidy up when it goes */
    let matEsc = null, matGone = null;
    function openMat(cls, build, onClose, away) {
      closeMat(true);
      closeMenu(); Kit.closeSheet(); closeDock();
      document.body.classList.add('c-away');
      World.setPropsAway(true); World.setAway(away == null ? 1 : away);
      snd('slide');
      deskSurfaces();
      mat = h('section', 'k c-mat ' + (cls || '')); mat.setAttribute('role', 'dialog'); mat.setAttribute('aria-modal', 'false');
      const inner = h('div', 'c-mat-in');
      mat.appendChild(inner);
      /* V11: on a phone the desk is put away, so a mat opens over the phone's own view, the whole screen */
      const onPhone = !!(SR.view.phone && !SR.view.phoneDesk);
      mat.classList.toggle('c-onphone', onPhone);
      (onPhone ? document.body : app).appendChild(mat);
      build(inner);
      matClose = onClose || null;
      requestAnimationFrame(() => mat && mat.classList.add('in'));
      return inner;
    }
    /* the second mat wears the desk's own wood, groove, and leather, read from the 3D desk once */
    let surfaces = false;
    function deskSurfaces() {
      if (surfaces || !World.surface) return;
      const set = (name, k) => { const u = World.surface(k); if (u) document.body.style.setProperty(name, 'url(' + u + ')'); };
      set('--s-board', 'board'); set('--s-groove', 'groove'); set('--s-leather', 'leather'); set('--s-desk', 'desk');
      surfaces = true;
    }
    function closeMat(quiet) {
      if (!mat) return;
      const m = mat, done = matClose;
      mat = null; matClose = null;
      m.classList.remove('in'); m.classList.add('out');
      setTimeout(() => m.remove(), 260);
      document.body.classList.remove('c-away');
      World.setAway(0);
      World.setPropsAway(!!SR.view.reset);
      if (!quiet) snd('slide');
      if (done) done();
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mat && !document.getElementById('side').contains(document.activeElement)) { e.preventDefault(); e.stopImmediatePropagation(); if (matEsc && matEsc()) return; closeMat(); } }, true);
    const matHead = (inner, kick, title, onDone, doneWord) => {
      const head = h('div', 'c-mat-head');
      const words = h('div'); words.append(h('div', 'c-kick', kick), h('h2', '', title));
      head.append(words, Kit.btn('c-go', doneWord || 'Done', onDone));
      inner.appendChild(head);
    };

    /* == V4: breakfast, lunch, and dinner. V11: all three on the board, and any meal in any row ==
       A meal is what you eat, not when you eat it, so tacos can be breakfast. Dinner keeps the board's
       own record (state.dinners: a name, and who cooks or how it happens); breakfast and lunch sit beside
       it in state.meals, so they reach the phone, the grocery list, and Undo too. A meal can have parts
       ("sweet potatoes, eggs, toast"), and the parts you cook go on the grocery list. The meal book
       (state.mealbook) keeps the meals you added, the ones you hid, and what your home leaves out. */
    const MEAL_KINDS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']];
    const kindName = (k) => (MEAL_KINDS.find(([x]) => x === k) || [k, k])[1];
    const MEAL_COLOR = { breakfast: '#C98A1B', lunch: '#2E7D8C', dinner: '#3B7F45', easy: '#6E5A48' };
    /* white on amber is 2.9 to 1, so breakfast takes dark ink (5.6 to 1) */
    const MEAL_INK = { breakfast: '#2A1D10', lunch: '#FFFFFF', dinner: '#FFFFFF', easy: '#FFFFFF' };
    /* ways a meal happens without cooking; any row takes them */
    const NOT_COOKING = [['leftovers', 'Leftovers', 'bowl'], ['order', 'Order in', 'box'], ['out', 'Eat out', 'car'], ['skip', 'Skip', 'moon']];
    const notCooking = (how) => NOT_COOKING.some(([id]) => id === how);
    const howName = (how) => (NOT_COOKING.find(([id]) => id === how) || [])[1] || '';
    const cap = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    /* ideas to start from, for any diet: the meals each usually fits (b, l, d) and parts for the list */
    const IDEAS = [
      ['oatmeal', 'Oatmeal', 'b', 'Oats, Berries'], ['eggs-toast', 'Eggs and toast', 'b', 'Eggs, Bread'], ['yogurt', 'Yogurt and fruit', 'bl', 'Yogurt, Berries'],
      ['smoothie', 'Smoothie', 'b', 'Bananas, Berries, Spinach'], ['cereal', 'Cereal', 'b', 'Cereal, Milk'], ['pancakes', 'Pancakes', 'bd', 'Pancake mix, Eggs, Milk'],
      ['avocado-toast', 'Avocado toast', 'bl', 'Avocados, Bread'], ['burritos', 'Breakfast burritos', 'b', 'Eggs, Tortillas, Salsa'], ['overnight-oats', 'Overnight oats', 'b', 'Oats, Almond milk, Chia seeds'],
      ['bagels', 'Bagels', 'b', 'Bagels, Cream cheese'], ['tofu-scramble', 'Tofu scramble', 'b', 'Tofu, Spinach, Peppers'], ['pb-toast', 'Peanut butter toast', 'b', 'Bread, Peanut butter, Bananas'],
      ['sandwiches', 'Sandwiches', 'l', ''], ['salad', 'Salad', 'ld', 'Salad greens, Tomatoes'], ['soup', 'Soup', 'ld', ''], ['wraps', 'Wraps', 'l', 'Tortillas, Hummus'],
      ['packed', 'Packed lunch', 'l', ''], ['grain-bowls', 'Grain bowls', 'ld', 'Quinoa, Chickpeas, Cucumbers'], ['quesadillas', 'Quesadillas', 'ld', 'Tortillas, Cheese, Black beans'],
      ['pasta-salad', 'Pasta salad', 'l', 'Pasta, Tomatoes, Cucumbers'], ['pbj', 'PB and J', 'l', 'Bread, Peanut butter, Jam'], ['hummus-plate', 'Hummus plate', 'l', 'Hummus, Pita, Carrots'],
      ['veggie-stirfry', 'Veggie stir fry', 'd', 'Tofu, Broccoli, Peppers, Rice'], ['bean-tacos', 'Black bean tacos', 'dl', 'Black beans, Tortillas, Salsa'], ['lentil-soup', 'Lentil soup', 'dl', 'Lentils, Carrots, Onion'],
      ['chickpea-curry', 'Chickpea curry', 'd', 'Chickpeas, Coconut milk, Rice'], ['primavera', 'Pasta primavera', 'd', 'Pasta, Zucchini, Peppers'], ['pizza', 'Homemade pizza', 'd', 'Pizza dough, Cheese, Tomato sauce'],
      ['baked-salmon', 'Baked salmon', 'd', 'Salmon, Potatoes, Green beans'], ['burgers', 'Burgers', 'd', 'Ground beef, Buns'], ['roast-chicken', 'Roast chicken', 'd', 'Chicken, Potatoes, Carrots'],
      ['fried-rice', 'Fried rice', 'dl', 'Rice, Eggs, Peas'], ['mac-cheese', 'Mac and cheese', 'dl', 'Pasta, Cheese'], ['shrimp-tacos', 'Shrimp tacos', 'd', 'Shrimp, Tortillas, Cabbage'],
      ['pork-chops', 'Pork chops', 'd', 'Pork chops, Apples, Green beans'], ['beef-stew', 'Beef stew', 'd', 'Beef, Potatoes, Carrots']
    ].map(([id, name, t, parts]) => ({ id, name, t: { breakfast: +t.includes('b'), lunch: +t.includes('l'), dinner: +t.includes('d') }, parts: parts ? parts.split(', ') : [] }));
    /* what a home leaves out, read from a meal's name and parts. `not` is the exception
       (peanut butter isn't dairy, beef sausage isn't pork, eggplant isn't an egg) */
    const LEAVE = [
      { id: 'chicken', name: 'Chicken', re: /\bchicken|\bwings?\b|\bdrumsticks?\b/ },
      { id: 'turkey', name: 'Turkey', re: /\bturkey/ },
      { id: 'beef', name: 'Beef', re: /\bbeef|\bsteaks?\b|\bburgers?\b|\bbrisket|\bmeatballs?/ },
      { id: 'pork', name: 'Pork', re: /\bpork|\bbacon|\bhams?\b|\bprosciutto|\bpepperoni|\bchorizo|\bsalami|\bsausages?\b|\bcarnitas/, not: /\b(beef|chicken|turkey|veggie|vegan|plant|tofu) sausages?/g },
      { id: 'fish', name: 'Fish', re: /\bfish|\bsalmon|\btuna\b|\bcod\b|\btilapia|\btrout|\bhalibut|\bsardines?|\banchov|\bsushi|\blox\b/ },
      { id: 'shellfish', name: 'Shellfish', re: /\bshrimp|\bprawns?|\bcrabs?\b|\blobsters?|\bscallops?|\bclams?\b|\bmussels?|\boysters?/ },
      { id: 'eggs', name: 'Eggs', re: /\beggs?\b|\bomelets?|\bomelettes?|\bfrittatas?|\bquiche/, not: /\beggplants?/g },
      { id: 'dairy', name: 'Dairy', re: /\bmilk|\bcheese|\byogh?urt|\bbutter\b|\bcream\b|\bqueso|\bparmesan|\bmozzarella|\bcheddar|\bfeta\b|\bricotta|\bquesadillas?|\bpizza|\blasagna|\bmac\b/, not: /\b(peanut|almond|nut|cashew|seed|apple|sunflower) butter|\b(almond|oat|soy|coconut|rice|cashew) milk|\bvegan (cheese|cream)|\bdairy free/g },
      { id: 'gluten', name: 'Gluten', re: /\bbread|\btoast|\bpasta|\bspaghetti|\bnoodles?|\bwraps?\b|\btortillas?|\bsandwich|\bpancakes?|\bwaffles?|\bbagels?|\bpizza|\bcouscous|\bflour|\bbuns?\b|\bpitas?\b|\bcrackers?|\bcereal|\bburritos?|\bquesadillas?|\bmac\b|\blasagna|\bdough|\bpb and j/, not: /\bcorn tortillas?|\bgluten free|\brice noodles?/g },
      { id: 'nuts', name: 'Nuts', re: /\bnuts?\b|\bpeanuts?|\balmonds?|\bwalnuts?|\bcashews?|\bpecans?|\bpistachios?|\bhazelnuts?|\bpb\b/ }
    ];
    const MEAT = /\bmeat|\blamb\b|\bduck\b|\bvenison|\bjerky|\bhot dogs?|\bdeli\b|\bgyros?\b/;
    const DIET_IDS = ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish', 'eggs', 'dairy'];
    const DIETS = [
      { id: 'all', name: 'Everything', out: [] },
      { id: 'vegetarian', name: 'Vegetarian', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish'], meat: true },
      { id: 'vegan', name: 'Vegan', out: ['chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish', 'eggs', 'dairy'], meat: true, honey: true },
      { id: 'pescatarian', name: 'Pescatarian', out: ['chicken', 'turkey', 'beef', 'pork'], meat: true }
    ];
    const book = () => { const b = SR.state.mealbook || {}; return { own: b.own || [], hide: b.hide || [], diet: b.diet || 'all', out: b.out || [], words: b.words || [] }; };
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    /* what a meal runs into, or null: the first thing your home leaves out that it has */
    function leftOut(text) {
      const b = book();
      if (!b.out.length && !b.words.length && b.diet === 'all') return null;
      const s = ' ' + text.toLowerCase() + ' ';
      for (const id of b.out) {
        const L = LEAVE.find((x) => x.id === id);
        if (L && L.re.test(L.not ? s.replace(L.not, ' ') : s)) return L.name;
      }
      const dt = DIETS.find((x) => x.id === b.diet);
      if (dt && dt.meat && MEAT.test(s)) return dt.name;
      if (dt && dt.honey && /\bhoney/.test(s)) return dt.name;
      for (const w of b.words) { const stem = norm(w).replace(/(es|s)$/, ''); if (stem && new RegExp('\\b' + esc(stem)).test(s)) return w; }
      return null;
    }

    /* every meal change goes through the board's commit, so one Undo takes it back. The meal board
       redraws itself after its own changes, and after anyone else's (an Undo from the keyboard) */
    let mealBusy = false, mealLive = null, mealSigWas = '';
    const mealSig = () => JSON.stringify([SR.state.meals || null, SR.state.dinners || null, SR.state.mealbook || null, (SR.state.recipes || []).length, SR.today]);
    Kit.renders.push(() => { if (mealLive && !mealBusy && mealSig() !== mealSigWas) mealLive(); });
    /* breakfasts and lunches this device kept before V11 move onto the board with the first meal change */
    const OLD_MEALS = 'sundayreset.v7.meals';
    let oldMeals = null, oldMoved = false;
    try { const o = JSON.parse(localStorage.getItem(OLD_MEALS) || 'null'); if (o && Object.keys(o).length) oldMeals = o; } catch (e) { /* storage off */ }
    function moveOldMeals(st) {
      if (!oldMeals || SR.view.preview) return;
      st.meals = st.meals || {};
      Object.keys(oldMeals).forEach((d) => ['breakfast', 'lunch'].forEach((k) => {
        const n = oldMeals[d] && oldMeals[d][k];
        if (n && !(st.meals[d] && st.meals[d][k])) st.meals[d] = Object.assign({}, st.meals[d], { [k]: { name: n } });
      }));
      oldMoved = true;
    }
    function commitMeals(fn) {
      mealBusy = true;
      let r;
      try { r = SR.commit(() => { const st = SR.state; moveOldMeals(st); return fn(st); }); } finally { mealBusy = false; }
      if (oldMoved && r !== false) { oldMeals = null; try { localStorage.removeItem(OLD_MEALS); } catch (e) { /* fine */ } }
      oldMoved = false;
      if (mealLive) mealSigWas = mealSig();
      return r;
    }
    const editBook = (fn) => commitMeals((st) => { st.mealbook = Object.assign({ own: [], hide: [], diet: 'all', out: [], words: [] }, st.mealbook || {}); fn(st.mealbook); });

    const dinnerOf = (d) => SR.state.dinners[d];
    const hasDinnerBlock = (d) => SR.day(d).blocks.some((b) => b.dinner);
    /* one shape for every cell: { name, parts, items, how, cook, recipe } */
    function mealAt(d, k) {
      if (k === 'dinner') {
        const x = dinnerOf(d);
        if (!x || (!x.name && !x.cook)) return null;
        const how = notCooking(x.cook) ? x.cook : 'home';
        return { name: x.name || '', parts: x.parts || [], items: x.items || [], how, cook: how === 'home' ? x.cook || 'home' : '', recipe: x.recipe || null };
      }
      const m = (SR.state.meals && SR.state.meals[d] && SR.state.meals[d][k]) || (!SR.view.preview && oldMeals && oldMeals[d] && oldMeals[d][k]) || null;
      if (!m) return null;
      if (typeof m === 'string') return { name: m, parts: [], items: [], how: 'home', cook: '', recipe: null };
      return { name: m.name || '', parts: m.parts || [], items: m.items || [], how: m.how || 'home', cook: m.cook || '', recipe: m.recipe || null };
    }
    /* a dinner with a cook and no dish yet reads Dinner, as on the board */
    const mealLabel = (m) => (m ? m.name || howName(m.how) || 'Dinner' : '');
    /* writes one cell, inside a commit; null clears it */
    function putMeal(st, d, k, m) {
      const cooking = m && !notCooking(m.how);
      if (k === 'dinner') {
        if (!m) { delete st.dinners[d]; return; }
        const was = st.dinners[d] || {};
        const x = { name: m.name || '', cook: cooking ? m.cook || (!notCooking(was.cook) && was.cook) || 'home' : m.how, items: cooking ? (m.items || []).slice() : [] };
        if (cooking && m.recipe) x.recipe = m.recipe;
        if (m.parts && m.parts.length) x.parts = m.parts.slice();
        st.dinners[d] = x;
        return;
      }
      st.meals = st.meals || {};
      if (!m) { if (st.meals[d]) { const left = Object.assign({}, st.meals[d]); delete left[k]; if (Object.keys(left).length) st.meals[d] = left; else delete st.meals[d]; } return; }
      const x = { name: m.name || '' };
      if (!cooking) x.how = m.how;
      if (m.parts && m.parts.length) x.parts = m.parts.slice();
      if (cooking && m.items && m.items.length) x.items = m.items.slice();
      if (cooking && m.cook && m.cook !== 'home') x.cook = m.cook;
      if (cooking && m.recipe) x.recipe = m.recipe;
      st.meals[d] = Object.assign({}, st.meals[d], { [k]: x });
    }
    /* a night with no Dinner block gets one when a dinner lands there, the way the board does it */
    function canDinner(d) {
      if (hasDinnerBlock(d)) return true;
      const st = SR.state, dd = st.dates[d] || {}, tb = M.templateFor(st, d).blocks.find((b) => b.dinner);
      if (tb && dd.edits && dd.edits[tb.id] && dd.edits[tb.id].gone) return true;
      return (M.firstFit(st, d, 45, 18 * 60 + 30) ?? M.firstFit(st, d, 45, SR.day(d).wake)) != null;
    }
    function ensureDinner(st, d) {
      if (hasDinnerBlock(d)) return null;
      const dd = st.dates[d] || {}, tb = M.templateFor(st, d).blocks.find((b) => b.dinner);
      if (tb && dd.edits && dd.edits[tb.id] && dd.edits[tb.id].gone) { delete st.dates[d].edits[tb.id]; return tb.start != null ? tb.start : true; }
      const at = M.firstFit(st, d, 45, 18 * 60 + 30) ?? M.firstFit(st, d, 45, SR.day(d).wake);
      if (at == null) return null;
      const r = M.placeAdd(st, d, { name: 'Dinner', cat: 'meals', icon: 'pot', dur: 45, dinner: true }, at);
      return r && r.ok ? r.start != null ? r.start : at : null;
    }
    /* "sweet potatoes, scrambled eggs, toast, and beef sausage" is four parts; "mac and cheese" is one dish */
    const PAIRS = /^(mac(aroni)? and cheese|rice and beans|beans and rice|eggs and toast|peanut butter and (jelly|jam)|pb and j|fish and chips|chips and salsa|bread and butter|chicken and rice|chicken and waffles|biscuits and gravy|bangers and mash|spaghetti and meatballs|soup and salad|yogurt and fruit|surf and turf|franks and beans|pork and beans|peas and carrots|meat and potatoes|bagels? and lox|milk and cookies|cookies and milk|cheese and crackers|hummus and pita|shrimp and grits|steak and eggs|ham and cheese|ham and eggs|bacon and eggs|eggs and bacon|egg and cheese)\b/i;
    function partsOf(text) {
      const s = String(text || '').replace(/\s+/g, ' ').trim();
      if (!s) return [];
      const bits = s.split(/\s*(?:[,;\n]|\s\+\s)\s*/).map((x) => x.replace(/^(and|&)\s+/i, '').trim()).filter(Boolean);
      if (bits.length > 1) {
        const last = bits[bits.length - 1], m = /^(.*?)\s+(?:and|&)\s+(.+)$/i.exec(last);
        if (m && !PAIRS.test(last)) bits.splice(bits.length - 1, 1, m[1], m[2]);
      }
      return bits.length > 1 ? bits.map(cap) : [];
    }
    /* a part as it goes on a list: "scrambled eggs" is Eggs, toast is Bread */
    const COOKED = /\b(scrambled|fried|boiled|poached|baked|roasted|grilled|steamed|mashed|toasted|sliced|diced|chopped|sauteed|sautéed|homemade|fresh|hot|cold|warm|plain|some|a|an|the)\b/g;
    function groceryName(part) {
      /* what's left over from another meal isn't something to buy */
      if (/\bleftovers?\b/.test(norm(part))) return '';
      let s = norm(part).replace(/^(and|&)\s+/, '').replace(COOKED, ' ').replace(/\s+/g, ' ').trim();
      if (s === 'toast') s = 'bread';
      if (!s || /^(leftovers?|nothing|skip|takeout|take out)$/.test(s)) return '';
      return cap(s);
    }
    const singular = (s) => norm(s).replace(/oes$/, 'o').replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
    const kindOf = (name) => (/\b(chicken|beef|pork|turkey|sausages?|bacon|ham|fish|salmon|tuna|shrimp|eggs?|tofu|tempeh|beans|lentils|chickpeas|steak|meat|lamb)\b/i.test(name) ? 'protein'
      : /sweet potato/i.test(name) ? 'veg'
      : /\b(bread|rice|pasta|tortillas?|potato(es)?|quinoa|oats|cereal|noodles|bagels?|wraps?|pitas?|buns?|dough|couscous|flour|crackers)\b/i.test(name) ? 'base'
      : /\b(broccoli|peppers?|spinach|zucchini|greens|salad|onions?|carrots?|tomato(es)?|cucumbers?|cabbage|peas|avocados?|berries|bananas?|apples?|fruit|lettuce|kale|mushrooms?|corn|squash|celery|garlic|lemons?|limes?)\b/i.test(name) ? 'veg' : 'extra');
    const pantryFind = (name) => { const key = singular(name); const p = name && SR.state.pantry.find((x) => singular(x.name) === key); return p ? p.id : null; };
    /* the pantry ids for parts you cook, adding what the kitchen doesn't have yet (inside a commit) */
    function pantryIds(st, parts) {
      const ids = [];
      for (const part of parts || []) {
        const g = groceryName(part);
        if (!g) continue;
        const key = singular(g);
        let p = st.pantry.find((x) => singular(x.name) === key);
        if (!p) { p = { id: 'pm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: g, kind: kindOf(g) }; st.pantry.push(p); }
        if (!ids.includes(p.id)) ids.push(p.id);
      }
      return ids;
    }
    /* how often each meal was had, at which meal, and when last: the board learns what's breakfast at your house */
    function usage() {
      const st = SR.state, u = new Map();
      const note = (d, k, m) => {
        const key = norm(m.name);
        if (!key) return;
        const x = u.get(key) || { n: 0, t: { breakfast: 0, lunch: 0, dinner: 0 }, at: '', m: null };
        x.n++; x.t[k]++;
        if (d >= x.at) { x.at = d; x.m = m; }
        u.set(key, x);
      };
      Object.keys(st.dinners || {}).forEach((d) => { const m = mealAt(d, 'dinner'); if (m) note(d, 'dinner', m); });
      Object.keys(st.meals || {}).forEach((d) => ['breakfast', 'lunch'].forEach((k) => { const m = mealAt(d, k); if (m) note(d, k, m); }));
      return u;
    }
    /* everything the library offers, as yours (recipes, meals you added or had) and ideas */
    function library() {
      const st = SR.state, b = book(), u = usage(), seen = new Set(), yours = [], ideas = [];
      const take = (x, list) => {
        const key = norm(x.name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        const use = u.get(key);
        x.n = use ? use.n : 0; x.at = use ? use.at : '';
        x.t = Object.assign({ breakfast: 0, lunch: 0, dinner: 0 }, x.t0 || {});
        if (use) ['breakfast', 'lunch', 'dinner'].forEach((t) => { x.t[t] += use.t[t] * 2; });
        x.hidden = b.hide.includes(x.key);
        x.out = leftOut([x.name].concat(x.parts || [], x.itemNames || []).join(', '));
        list.push(x);
      };
      const pname = (id) => (st.pantry.find((p) => p.id === id) || {}).name;
      (st.recipes || []).forEach((r) => take({ key: 'r:' + r.id, kind: 'recipe', name: r.name, recipe: r.id, items: (r.items || []).slice(), itemNames: (r.items || []).map(pname).filter(Boolean), dur: r.dur, t0: { dinner: 1 } }, yours));
      b.own.forEach((o) => take({ key: 'o:' + o.id, kind: 'own', id: o.id, name: o.name, parts: o.parts || [] }, yours));
      u.forEach((x, key) => { if (!seen.has(key) && !IDEAS.some((i) => norm(i.name) === key)) take({ key: 'h:' + key, kind: 'had', name: x.m.name, parts: x.m.parts, items: x.m.items, itemNames: (x.m.items || []).map(pname).filter(Boolean), how: notCooking(x.m.how) ? x.m.how : null, cook: x.m.cook }, yours); });
      IDEAS.forEach((i) => take({ key: 'i:' + i.id, kind: 'idea', name: i.name, parts: i.parts, t0: i.t }, u.has(norm(i.name)) ? yours : ideas));
      return { yours, ideas };
    }
    /* most had first; for a meal of the day, the ones that fit it first, and the rest after */
    const sorted = (list, forT) => list.slice().sort((a, b) => {
      if (forT) { const fa = a.t[forT] > 0, fb = b.t[forT] > 0; if (fa !== fb) return fa ? -1 : 1; if (a.t[forT] !== b.t[forT]) return b.t[forT] - a.t[forT]; }
      if (a.n !== b.n) return b.n - a.n;
      return a.at === b.at ? 0 : a.at < b.at ? 1 : -1;
    });
    /* every word you type starts a word in the meal's name or parts */
    const matches = (x, q) => { const hay = norm([x.name].concat(x.parts || []).join(' ')); return norm(q).split(' ').every((w) => new RegExp('(^|[^a-z0-9])' + esc(w)).test(hay)); };
    /* a tile wears the color of the meal it's had at most (a new one is dinner green) */
    /* while the library sorts for a meal, the tiles that fit it wear that meal's color, like the row they'll land in */
    const tileColor = (x, forT) => { if (x.how) return 'easy'; const t = x.t || {}; if (forT && t[forT] > 0) return forT; const best = ['breakfast', 'lunch', 'dinner'].reduce((a, k) => ((t[k] || 0) > (t[a] || 0) ? k : a), 'breakfast'); return (t[best] || 0) > 0 ? best : 'dinner'; };
    const payloadOf = (x) => ({ key: x.key, name: x.name, parts: x.parts || [], items: x.kind === 'recipe' || x.kind === 'had' ? x.items || [] : null, recipe: x.recipe || null, how: x.how || null, cook: x.kind === 'had' ? x.cook : undefined });
    /* a library meal as it lands in a cell (inside a commit, so new parts join the pantry) */
    function mealFrom(st, p) {
      if (p.how) return { name: p.way ? '' : p.name, how: p.how };
      const items = p.items ? p.items.slice() : pantryIds(st, p.parts);
      return { name: p.name, parts: p.parts || [], items, how: 'home', recipe: p.recipe || null, cook: p.cook || undefined };
    }

    function openMealBoard(ws) {
      ws = ws || (SR.view.reset ? SR.view.reset.week : M.weekStart(SR.view.focus || SR.today));
      let dates = M.range(ws, 7);
      let showRows = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.mealRows') || 'null'); } catch (e) { return null; } })() || ['breakfast', 'lunch', 'dinner'];
      /* V11: ideas for the open meals (props), what you have at home to use up, and earlier days folded on a phone */
      let props = new Map(), have = new Set(), seed = 1, showPast = false, landSet = new Set(), shopWas = '';
      /* the library sorts for one meal of the day, finds by words, and can hide or leave things out */
      let forT = '', find = '', editing = false, leaving = false, showHidden = false, held = null, justSet = '', fresh = '', landKey = '', pop = null;
      const inner = openMat('c-meals', (inner) => {
        matHead(inner, '', 'Plan the week’s meals', () => closeMat());
        /* V11: the week moves, so a Saturday can plan the next one */
        const weekNav = h('div', 'c-weeknav'), weekWords = h('span', 'c-kick');
        const prevW = Kit.btn('c-weekbtn', '', () => moveWeek(-7), 'left'), nextW = Kit.btn('c-weekbtn', '', () => moveWeek(7), 'right');
        prevW.setAttribute('aria-label', 'Week before'); nextW.setAttribute('aria-label', 'Week after');
        weekNav.append(prevW, weekWords, nextW);
        const kick0 = inner.querySelector('.c-mat-head .c-kick');
        if (kick0) kick0.replaceWith(weekNav);
        /* on a narrow screen the dates alone, so the line never wraps beside Done */
        const weekLabel = () => { const n = Math.round(M.diffDays(M.weekStart(SR.today), ws) / 7); return (inner.clientWidth && inner.clientWidth < 520 ? '' : n === 0 ? 'This week · ' : n === 1 ? 'Next week · ' : n === -1 ? 'Last week · ' : '') + M.spanText(ws, M.addDays(ws, 6)); };
        const HOW = 'Drag a meal onto a day, or tap a day and type it.';
        const how = h('p', 'c-mathow', HOW);
        inner.appendChild(how);
        /* what changed, said for a screen reader */
        const live = h('p', 'c-live'); live.setAttribute('aria-live', 'polite'); inner.appendChild(live);
        const speak = (t) => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };
        const rows = h('div', 'c-mealtoggles'); rows.setAttribute('role', 'group'); rows.setAttribute('aria-label', 'Meals to plan');
        const board = h('div', 'c-woodboard c-mealgrid');
        /* V11: the board and the meals side by side on a computer; the meals scroll on their own under a
           search that stays put (stacked on a phone) */
        const body = h('div', 'c-meal-body'), main = h('div', 'c-meal-main'), side = h('div', 'c-meal-side'), sideScroll = h('div', 'c-meal-scroll c-autoscroll');
        const again = Kit.btn('c-ghost c-again', 'Same as last week', () => sameAsLast());
        const sugBtn = Kit.btn('c-ghost c-again c-sugbtn', 'Suggest meals', () => startSuggest(), 'star');
        const acts = h('div', 'c-meal-acts'); acts.append(sugBtn, again);
        const top = h('div', 'c-meal-top'); top.append(rows, acts);
        const sugBar = h('div', 'c-sugbar'); sugBar.hidden = true;
        /* under the board, the week's groceries in one line, and the way to the list */
        const shop = h('button', 'c-shopline'); shop.type = 'button';
        shop.addEventListener('click', () => { SR.Snd.init(); closeMat(); SR.openSel({ type: 'groceries' }); });
        main.append(top, sugBar, board, shop);
        /* the library: find or add, sort for a meal, what you leave out, then yours, not cooking, and ideas */
        const libHead = h('div', 'c-libhead');
        const findForm = h('form', 'c-libfind');
        const findIn = h('input', 'c-find'); findIn.type = 'search'; findIn.placeholder = 'Find or add a meal'; findIn.autocomplete = 'off'; findIn.enterKeyHint = 'done';
        findIn.setAttribute('aria-label', 'Find or add a meal');
        findForm.append(SR.icon('search', 8, '#C6BEB2'), findIn);
        const leaveBtn = Kit.btn('c-leavebtn', 'Leave out', () => { leaving = !leaving; drawSide(); if (leaving) requestAnimationFrame(() => { const f = leave.querySelector('button'); if (f) f.focus(); }); }, 'sliders');
        leaveBtn.setAttribute('aria-expanded', 'false');
        const searchRow = h('div', 'c-libsearch'); searchRow.append(findForm, leaveBtn);
        const forRow = h('div', 'k-seg c-for'); forRow.setAttribute('role', 'group'); forRow.setAttribute('aria-label', 'Show first the meals for');
        const leave = h('div', 'c-leave'); leave.hidden = true;
        libHead.append(searchRow, forRow, leave);
        const lib = h('div', 'c-tray c-lib');
        sideScroll.appendChild(lib);
        side.append(libHead, sideScroll);
        body.append(main, side);
        inner.appendChild(body);
        inner.classList.add('c-autoscroll');
        const sideHint = scrollHint(sideScroll, side), innerHint = scrollHint(inner, inner.parentElement || inner);
        const me0 = () => (SR.who() && SR.who().name) || 'You';
        const dayWords = (d, k) => M.DAY_LONG[M.weekday(d)] + ' ' + kindName(k).toLowerCase();

        function draw() {
          mealSigWas = mealSig();
          weekWords.textContent = weekLabel();
          drawRows(); drawSug(); drawBoard(); drawSide();
          shop.hidden = !SR.useDinners();
          if (!shop.hidden) {
            const gs = SR.grocerySub(dates), n = h('span', '', gs);
            shop.replaceChildren(SR.icon('cart', 9, CREAM), h('b', '', 'Grocery list'), n, SR.icon('right', 7, '#C6BEB2'));
            /* the count says it changed */
            if (shopWas && gs !== shopWas && feelOn()) n.animate([{ color: '#F2CF7A', transform: 'scale(1.1)' }, { color: '#F2CF7A', transform: 'scale(1)', offset: 0.4 }, { transform: 'none' }], { duration: 520, easing: FOUT });
            shopWas = gs;
          }
          if (pop) placePop();
          requestAnimationFrame(() => { sideHint(); innerHint(); });
        }
        mealLive = draw;
        function drawRows() {
          rows.replaceChildren(h('span', 'c-tlabel', 'Show'));
          MEAL_KINDS.forEach(([k, name]) => {
            const on = showRows.includes(k);
            /* a check says it's showing; one that isn't is an outline, not a second kind of white */
            const b = Kit.btn('c-pill c-check' + (on ? ' on' : ''), name, () => {
              showRows = on ? showRows.filter((x) => x !== k) : MEAL_KINDS.map(([x]) => x).filter((x) => x === k || showRows.includes(x));
              if (!showRows.length) showRows = [k];
              keep('sundayreset.v7.mealRows', showRows);
              closePop();
              if (props.size) props = suggestAll();
              draw();
            });
            b.setAttribute('aria-pressed', String(on));
            if (on) b.prepend(SR.icon('check', 7, '#252928'));
            rows.appendChild(b);
          });
        }
        const dayHead = (d) => { const c = h('div', 'c-mhead' + (d === SR.today ? ' today' : '')); c.append(h('b', '', M.DAY_SHORT[M.weekday(d)]), h('span', '', String(M.parts(d).d))); return c; };
        const rowLabel = (k) => {
          const label = h('div', 'c-mrow', kindName(k));
          /* drop a meal on the row's name and it goes on every day left in the week */
          label.dataset.zone = 'mealrow'; label.dataset.kind = k;
          label.title = 'Drop a meal here for every day left';
          label.appendChild(h('small', 'c-mrow-hint', 'Every day'));
          return label;
        };
        /* a narrow screen turns the board: the days go down the side and the meals across */
        const tallBoard = () => inner.clientWidth > 0 && inner.clientWidth < 900;
        function drawBoard() {
          board.replaceChildren();
          const tall = tallBoard();
          board.classList.toggle('c-tall', tall);
          board.style.setProperty('--rows', showRows.length);
          board.appendChild(h('span'));
          if (tall) {
            showRows.forEach((k) => board.appendChild(rowLabel(k)));
            /* on a phone the days already over fold into one line, so the week opens on what's left */
            const past = dates.filter((d) => d < SR.today);
            if (past.length) {
              const span = M.DAY_SHORT[M.weekday(past[0])] + (past.length > 1 ? ' to ' + M.DAY_SHORT[M.weekday(past[past.length - 1])] : '');
              const fold = h('button', 'c-pastfold'); fold.type = 'button'; fold.setAttribute('aria-expanded', String(showPast));
              fold.append(h('span', '', (showPast ? 'Hide ' : 'Earlier this week: ') + span), SR.icon(showPast ? 'up' : 'down', 7, '#4A3418'));
              fold.addEventListener('click', () => { showPast = !showPast; draw(); });
              board.appendChild(fold);
            }
            dates.filter((d) => showPast || d >= SR.today).forEach((d) => { board.appendChild(dayHead(d)); showRows.forEach((k) => board.appendChild(cellFor(d, k))); });
          } else {
            dates.forEach((d) => board.appendChild(dayHead(d)));
            showRows.forEach((k) => { board.appendChild(rowLabel(k)); dates.forEach((d) => board.appendChild(cellFor(d, k))); });
          }
          board.classList.toggle('c-holding', !!held);
          justSet = ''; landSet = new Set();
        }
        function cellFor(d, k) {
          const cell = h('div', 'c-mcell' + (d === SR.today ? ' today' : '') + (d < SR.today ? ' past' : ''));
          cell.dataset.zone = 'meal'; cell.dataset.date = d; cell.dataset.kind = k;
          /* a day you're away has no meals to plan here, and says so when something's dropped on it */
          if (SR.day(d).trip) { cell.classList.add('off'); cell.dataset.away = '1'; cell.append(h('span', 'c-moff', 'Away')); return cell; }
          cell.tabIndex = 0; cell.setAttribute('role', 'button');
          const m = mealAt(d, k);
          const pr = !m && props.get(d + '|' + k);
          if (pr) {
            /* an idea: dashed in the row's color until you keep it (a tap) or say no (its x) */
            cell.classList.add('c-hasprop');
            const t = h('div', 'c-prop'); t.style.setProperty('--b', MEAL_COLOR[k]); t.appendChild(h('b', '', pr.name)); t.title = pr.name;
            const no = h('button', 'c-propx'); no.type = 'button'; no.setAttribute('aria-label', 'Not ' + pr.name); no.title = 'Not this one';
            no.appendChild(SR.icon('x', 6, '#252928'));
            no.addEventListener('click', (e) => { e.stopPropagation(); props.delete(d + '|' + k); draw(); });
            cell.append(t, no);
            cell.setAttribute('aria-label', dayWords(d, k) + ': idea, ' + pr.name + '. Keep it');
            return cell;
          }
          if (!m) { cell.appendChild(SR.icon('plus', 9, '#5C4024')); cell.setAttribute('aria-label', dayWords(d, k) + ': nothing yet. Add a meal'); return cell; }
          const easy = notCooking(m.how);
          const blk = domBlock(mealLabel(m), easy && m.name ? howName(m.how) : '', MEAL_COLOR[easy ? 'easy' : k], MEAL_INK[easy ? 'easy' : k], 'c-in-cell' + (justSet === d + k || landSet.has(d + '|' + k) ? ' c-land' : ''));
          /* a long word (Sandwiches) steps down a size rather than being cut, and the whole name shows on hover */
          if (mealLabel(m).split(/\s+/).some((w) => w.length >= 10)) blk.classList.add('c-tight');
          blk.title = mealLabel(m);
          const who = easy ? '' : m.cook === 'me' ? me0() : m.cook === 'kim' ? partnerName() || 'Partner' : '';
          if (who) {
            const tag = h('span', 'c-cook c-nodrag', who);
            tag.title = who + ' is making it. Tap to change.'; tag.setAttribute('role', 'button'); tag.tabIndex = 0;
            tag.setAttribute('aria-label', who + ' is making it. Change who');
            tag.addEventListener('click', (e) => { e.stopPropagation(); cycleCook(d, k); });
            tag.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); cycleCook(d, k); } });
            blk.appendChild(tag);
          }
          /* hold Option (Alt) while dragging to copy it instead of moving it */
          draggable(blk, { name: mealLabel(m), from: { d, k } }, {
            accept: (z, p) => !refusal(z, p), why: refusal,
            onDrop: (z, p, o) => dropOn(z, p, o),
            onOut: (p) => clearMeal(p.from.d, p.from.k, true),
            onLift: () => { board.dataset.drag = 'swap'; }, onAlt: (alt) => { board.dataset.drag = alt ? 'copy' : 'swap'; }, onEnd: () => { delete board.dataset.drag; }
          });
          cell.appendChild(blk);
          cell.setAttribute('aria-label', dayWords(d, k) + ': ' + mealLabel(m) + '. Open to change');
          return cell;
        }
        /* a tapped meal is held until a day takes it; tapping it again lets go */
        const hold = (payload, el) => {
          side.querySelectorAll('.c-held').forEach((x) => x.classList.remove('c-held'));
          held = held && held.p.key === payload.key ? null : { p: payload };
          if (held && el) { el.classList.add('c-held'); snd('pick'); }
          board.classList.toggle('c-holding', !!held);
          how.textContent = held ? 'Tap a day for ' + (held.p.name || 'it') + ', or its row’s name for every day.' : HOW;
          how.classList.toggle('c-holdline', !!held);
        };
        const letGoHeld = () => { if (held) hold(held.p, null); };
        board.addEventListener('click', (e) => {
          if (e.target.closest('.c-cook') || recentDrag()) return;
          const z = e.target.closest('[data-zone="meal"], [data-zone="mealrow"]');
          if (!z) return;
          if (held) {
            const why = refusal(z, held.p);
            if (why) { SR.toast(why, ''); snd('tap'); return; }
            const p = held.p; letGoHeld();
            dropOn(z, p); snd('clack', 0.85);
            return;
          }
          if (z.dataset.zone !== 'meal' || z.dataset.away) return;
          if (props.has(z.dataset.date + '|' + z.dataset.kind)) { keepOne(z.dataset.date, z.dataset.kind); return; }
          openPop(z, z.dataset.date, z.dataset.kind);
        });
        board.addEventListener('keydown', (e) => {
          const z = e.target.closest('[data-zone="meal"]');
          if (!z || z !== e.target) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); z.click(); }
          else if ((e.key === 'Delete' || e.key === 'Backspace') && mealAt(z.dataset.date, z.dataset.kind)) { e.preventDefault(); clearMeal(z.dataset.date, z.dataset.kind, true); }
          else if (e.key.startsWith('Arrow')) {
            /* arrows walk the board: across the days and down the meals (turned on a phone) */
            const tall = board.classList.contains('c-tall');
            const across = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0, down = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
            const di = dates.indexOf(z.dataset.date) + (tall ? down : across), ki = showRows.indexOf(z.dataset.kind) + (tall ? across : down);
            const t = board.querySelector('[data-zone="meal"][data-date="' + dates[di] + '"][data-kind="' + showRows[ki] + '"]');
            if (t && t.tabIndex === 0) { e.preventDefault(); t.focus(); }
          }
        });
        /* nothing refuses a meal for being the wrong meal; only a day you're away says no, and why */
        const refusal = (z, p) => {
          if (z.dataset.away) return 'You’re away on ' + M.DAY_LONG[M.weekday(z.dataset.date)] + ', so it has no meals to plan.';
          if (z.dataset.zone === 'mealrow' && p.from) return 'Drop it on a day to move it.';
          return '';
        };
        const accept = (z, p) => !refusal(z, p);
        function dropOn(z, p, o) { if (z.dataset.zone === 'mealrow') fillRow(p, z.dataset.kind); else placeOn(p, z.dataset.date, z.dataset.kind, o && o.copy); }
        /* sets one cell; a night without a Dinner block gets one, and says where it went */
        function setCell(d, k, make) {
          if (k === 'dinner' && !canDinner(d)) { SR.toast('No open time for dinner on ' + M.DAY_LONG[M.weekday(d)] + '.', 'bad'); return false; }
          const add = k === 'dinner' && !hasDinnerBlock(d);
          let at = null;
          const r = commitMeals((st) => { if (add) at = ensureDinner(st, d); putMeal(st, d, k, make(st)); });
          if (r === false) return false;
          justSet = d + k; props.delete(d + '|' + k);
          const now = mealAt(d, k);
          if (now) speak(mealLabel(now) + ' on ' + dayWords(d, k));
          if (add && at != null) SR.toast('Dinner added to ' + M.DAY_LONG[M.weekday(d)] + (typeof at === 'number' ? ' at ' + M.clock(at) : ''), 'good', { label: 'Undo', fn: () => { SR.undo(); } });
          return true;
        }
        function placeOn(p, d, k, copy) {
          if (p.from) {
            if (p.from.d === d && p.from.k === k) return;
            const a = mealAt(p.from.d, p.from.k), b = mealAt(d, k);
            if (copy) { setCell(d, k, () => a); draw(); return; }
            if (k === 'dinner' && !canDinner(d)) { SR.toast('No open time for dinner on ' + M.DAY_LONG[M.weekday(d)] + '.', 'bad'); draw(); return; }
            if (p.from.k === 'dinner' && b && !canDinner(p.from.d)) { draw(); return; }
            commitMeals((st) => { if (k === 'dinner') ensureDinner(st, d); putMeal(st, d, k, a); putMeal(st, p.from.d, p.from.k, b); });
            justSet = d + k; props.delete(d + '|' + k);
            speak(mealLabel(a) + (b ? ' and ' + mealLabel(b) + ' swapped' : ' moved to ' + dayWords(d, k)));
          } else setCell(d, k, (st) => mealFrom(st, p));
          draw();
        }
        const leftDays = (k) => dates.filter((d) => d >= SR.today && !SR.day(d).trip && !mealAt(d, k) && (k !== 'dinner' || canDinner(d)));
        function fillRow(p, k) {
          if (p.from) return;
          const days = leftDays(k);
          if (!days.length) { SR.toast('Every day left this week already has ' + kindName(k).toLowerCase() + '.', ''); return; }
          commitMeals((st) => days.forEach((d) => { if (k === 'dinner') ensureDinner(st, d); putMeal(st, d, k, mealFrom(st, p)); }));
          days.forEach((d) => { props.delete(d + '|' + k); landSet.add(d + '|' + k); });
          draw();
          SR.toast((p.name || howName(p.how)) + ' on ' + days.length + (days.length === 1 ? ' day' : ' days'), 'good', { label: 'Undo', fn: () => { SR.undo(); } });
        }
        /* last week's meals, on the days of this one that are still open */
        function sameAsLast() {
          const todo = [];
          dates.forEach((d) => {
            if (d < SR.today || SR.day(d).trip) return;
            showRows.forEach((k) => { if (mealAt(d, k)) return; const was = mealAt(M.addDays(d, -7), k); if (was && (k !== 'dinner' || canDinner(d))) todo.push([d, k, was]); });
          });
          if (!todo.length) { SR.toast('Nothing from last week to bring over.', ''); return; }
          commitMeals((st) => todo.forEach(([d, k, m]) => { if (k === 'dinner') ensureDinner(st, d); putMeal(st, d, k, m); }));
          draw();
          SR.toast(todo.length + (todo.length === 1 ? ' meal' : ' meals') + ' from last week', 'good', { label: 'Undo', fn: () => { SR.undo(); } });
          snd('clack', 0.8);
        }
        function clearMeal(d, k, say) {
          const m = mealAt(d, k);
          if (!m) return;
          commitMeals((st) => putMeal(st, d, k, null));
          draw();
          speak(mealLabel(m) + ' is off ' + dayWords(d, k));
          if (say) SR.toast(mealLabel(m) + ' is off ' + M.DAY_LONG[M.weekday(d)], '', { label: 'Undo', fn: () => { SR.undo(); } });
        }
        function cycleCook(d, k) {
          const m = mealAt(d, k);
          if (!m || notCooking(m.how)) return;
          const order = ['me'].concat(partnerName() ? ['kim'] : [], ['home']);
          const next = order[(order.indexOf(m.cook || 'home') + 1) % order.length];
          commitMeals((st) => putMeal(st, d, k, Object.assign({}, m, { cook: next })));
          snd('detent'); draw();
        }

        /* == a day's meal, typed or changed in place ==
           Tap an empty day and type what it is; commas make parts, and the parts you cook go on the
           grocery list. Tap a meal that's there to rename it, say how it happens and who's making it,
           pick which parts to buy, or take it off. */
        function openPop(cell, d, k) {
          closePop();
          const m = mealAt(d, k);
          if (forT !== k) { forT = k; drawSide(); }
          const box = h('div', 'c-mpop' + (m ? ' edit' : ''));
          box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', dayWords(d, k));
          const head = h('div', 'c-mpop-head');
          head.appendChild(h('b', '', dayWords(d, k)));
          if (d === SR.today) head.appendChild(h('span', 'c-mpop-tag', 'Today'));
          const x = Kit.btn('c-mpop-x', '', () => closePop(true), 'x'); x.setAttribute('aria-label', 'Close');
          head.appendChild(x);
          const form = h('form', 'c-mpop-form');
          const inp = h('input', 'c-find c-mpop-in'); inp.value = m ? m.name : ''; inp.autocomplete = 'off'; inp.enterKeyHint = m ? 'done' : 'go';
          inp.placeholder = m ? (m.name ? 'Name it' : howName(m.how)) : 'What’s for ' + kindName(k).toLowerCase() + '?';
          inp.setAttribute('aria-label', 'Meal for ' + dayWords(d, k));
          form.appendChild(inp);
          const partsBox = h('div', 'c-mparts'), more = h('div', 'c-mpop-more'), foot = h('div', 'c-mpop-foot');
          box.append(head, form, partsBox, more, foot);
          /* the meal being made: what it's called, its parts, the ones left off the list, how, and who */
          const draft = { name: m ? m.name : '', parts: m ? m.parts.slice() : [], off: new Set(), how: m ? m.how : 'home', cook: m ? m.cook : '', recipe: m ? m.recipe : null, items: m ? m.items.slice() : [] };
          if (m && m.parts.length > 1) m.parts.forEach((pt) => { const id = pantryFind(groceryName(pt)); if (!id || !m.items.includes(id)) draft.off.add(pt); });
          const built = (st) => {
            const cooking = !notCooking(draft.how);
            const own = draft.parts.length > 1;
            const items = !cooking ? [] : !own && draft.recipe ? draft.items.slice() : own ? pantryIds(st, draft.parts.filter((pt) => !draft.off.has(pt))) : [];
            return { name: cap(draft.name), parts: own ? draft.parts : [], items, how: draft.how, cook: draft.cook || undefined, recipe: own ? null : draft.recipe };
          };
          const saveNow = () => { commitMeals((st) => putMeal(st, d, k, built(st))); justSet = ''; draw(); };
          function drawParts() {
            partsBox.replaceChildren();
            const chips = [];
            if (draft.parts.length > 1) {
              draft.parts.forEach((pt) => chips.push({ label: pt, can: !!groceryName(pt), on: !draft.off.has(pt), flip: () => { if (draft.off.has(pt)) draft.off.delete(pt); else draft.off.add(pt); } }));
            } else if (draft.recipe) {
              const r = (SR.state.recipes || []).find((y) => y.id === draft.recipe);
              (r ? r.items : []).forEach((id) => { const p = SR.state.pantry.find((y) => y.id === id); if (p) chips.push({ label: p.name, can: true, on: draft.items.includes(id), flip: () => { draft.items = draft.items.includes(id) ? draft.items.filter((y) => y !== id) : draft.items.concat(id); } }); });
            }
            partsBox.hidden = !chips.length || notCooking(draft.how);
            if (partsBox.hidden) return;
            const row = h('div', 'c-mparts-row');
            chips.forEach((c) => {
              const on = c.on && c.can;
              const b = h('button', 'c-mpart' + (on ? ' on' : '')); b.type = 'button';
              b.setAttribute('aria-pressed', String(on)); b.disabled = !c.can;
              b.title = on ? 'On the grocery list. Tap to leave it off' : 'Tap to put it on the grocery list';
              if (c.can) b.appendChild(SR.icon('cart', 7, on ? '#252928' : '#C6BEB2'));
              b.appendChild(h('span', '', c.label));
              b.addEventListener('click', () => { c.flip(); drawParts(); if (m) saveNow(); snd('detent'); });
              row.appendChild(b);
            });
            const n = chips.filter((c) => c.on && c.can).length;
            partsBox.append(row, h('small', 'c-mparts-say', n ? (n === 1 ? '1 goes' : n + ' go') + ' on the grocery list. Tap one to leave it off.' : 'Nothing goes on the grocery list.'));
            if (feelOn()) row.querySelectorAll('.c-mpart').forEach((b, i) => { if (i >= (drawParts.was || 0)) b.animate([{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], { duration: 140, easing: FOUT }); });
            drawParts.was = chips.length;
          }
          const pick = (label, cls, pressed, fn) => { const b = Kit.btn('c-opt' + (cls ? ' ' + cls : ''), label, fn); if (pressed != null) b.setAttribute('aria-pressed', String(pressed)); return b; };
          function drawMore() {
            more.replaceChildren(); foot.replaceChildren();
            if (m) {
              /* how it happens, then who's making it */
              const howRow = h('div', 'c-opts'); howRow.setAttribute('role', 'group'); howRow.setAttribute('aria-label', 'How it happens');
              [['home', 'Cook']].concat(NOT_COOKING).forEach(([id, n]) => howRow.appendChild(pick(n, '', draft.how === id, () => { draft.how = id; saveNow(); drawParts(); drawMore(); snd('detent'); })));
              more.append(h('div', 'c-kick', 'How'), howRow);
              if (!notCooking(draft.how)) {
                const whoRow = h('div', 'c-opts'); whoRow.setAttribute('role', 'group'); whoRow.setAttribute('aria-label', 'Who’s making it');
                [['me', me0()]].concat(partnerName() ? [['kim', partnerName()]] : [], [['home', 'Anyone']]).forEach(([id, n]) => whoRow.appendChild(pick(n, '', (draft.cook || 'home') === id, () => { draft.cook = id; saveNow(); drawMore(); snd('detent'); })));
                more.append(h('div', 'c-kick', 'Who’s making it'), whoRow);
              }
              /* the same meal on other days: tap a day to add it there, tap it again to take it off */
              const also = h('div', 'c-opts c-also'); also.setAttribute('role', 'group'); also.setAttribute('aria-label', 'Also on');
              const mine = norm(mealLabel(mealAt(d, k) || m));
              dates.forEach((dd) => {
                const there = mealAt(dd, k), same = !!there && norm(mealLabel(there)) === mine;
                const b = pick(M.DAY_SHORT[M.weekday(dd)].slice(0, 1), 'c-dayopt', same || dd === d, () => {
                  if (same) { commitMeals((st) => putMeal(st, dd, k, null)); draw(); speak(mealLabel(m) + ' is off ' + dayWords(dd, k)); }
                  else if (setCell(dd, k, (st) => built(st))) draw();
                  drawMore(); snd('detent');
                });
                b.setAttribute('aria-label', M.DAY_LONG[M.weekday(dd)] + (same || dd === d ? ', has it' : ''));
                b.title = M.DAY_LONG[M.weekday(dd)];
                if (dd === d || SR.day(dd).trip) b.disabled = true;
                also.appendChild(b);
              });
              more.append(h('div', 'c-kick', 'Also on'), also);
              const off = Kit.btn('c-mpop-off', 'Take it off', () => { closePop(); clearMeal(d, k, true); }, 'x');
              foot.append(off, Kit.btn('c-go', 'Done', () => closePop(true)));
              return;
            }
            /* empty: the meals that fit first, matching what's typed, then the ways that aren't cooking */
            const q = inp.value.trim();
            const L = library();
            let pool = sorted(L.yours.filter((y) => !y.hidden && !y.out), k).concat(sorted(L.ideas.filter((y) => !y.hidden && !y.out), k));
            if (q) pool = pool.filter((y) => matches(y, q)); else pool = pool.filter((y) => y.t[k] > 0);
            const top6 = pool.slice(0, 6);
            if (top6.length) {
              const row = h('div', 'c-opts');
              top6.forEach((y) => row.appendChild(pick(y.name, 'c-sugg', null, () => { closePop(); if (setCell(d, k, (st) => mealFrom(st, payloadOf(y)))) { draw(); snd('clack', 0.85); } })));
              more.append(h('div', 'c-kick', q ? 'Matches' : 'Pick one'), row);
            }
            const ways = h('div', 'c-opts');
            NOT_COOKING.forEach(([id, n, ic]) => { const b = pick(n, 'c-way', null, () => { const nm = inp.value.trim(); closePop(); if (setCell(d, k, () => ({ name: nm ? cap(nm) : '', how: id }))) { draw(); snd('clack', 0.8); } }); b.prepend(SR.icon(ic, 7, CREAM)); ways.appendChild(b); });
            more.append(h('div', 'c-kick', 'Not cooking'), ways);
            const go = Kit.btn('c-go', 'Add to ' + M.DAY_LONG[M.weekday(d)], () => form.requestSubmit());
            go.disabled = !q;
            foot.appendChild(go);
          }
          inp.addEventListener('input', () => {
            draft.name = inp.value;
            if (!m) { draft.parts = partsOf(inp.value); drawParts(); drawMore(); }
          });
          /* a meal that's there takes its new name on Enter or when you leave the field */
          const rename = () => {
            if (!m) return;
            const v = inp.value.trim();
            if (!v || v === (m.name || '')) return;
            draft.name = v; draft.parts = partsOf(v); draft.off = new Set();
            if (draft.recipe) { const r = (SR.state.recipes || []).find((y) => y.id === draft.recipe); if (!r || norm(r.name) !== norm(v)) { draft.recipe = null; draft.items = []; } }
            saveNow(); drawParts();
          };
          inp.addEventListener('blur', rename);
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = inp.value.trim();
            if (m) { rename(); closePop(true); return; }
            if (!q) { inp.focus(); return; }
            /* a meal the library knows by this name lands as it is; anything else lands as typed */
            const L = library(), hit = L.yours.concat(L.ideas).find((y) => norm(y.name) === norm(q));
            closePop();
            const ok = hit && draft.parts.length < 2 ? setCell(d, k, (st) => mealFrom(st, payloadOf(hit))) : setCell(d, k, (st) => { draft.name = q; return built(st); });
            if (ok) { draw(); snd('clack', 0.85); }
          });
          box.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(true); }
            /* focus stays in the card while it's open */
            if (e.key === 'Tab') {
              const f = [...box.querySelectorAll('button:not([disabled]), input')].filter((y) => y.offsetParent);
              if (!f.length) return;
              if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
              else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
            }
          });
          pop = { box, d, k, cell };
          (mat || inner).appendChild(box);
          cell.classList.add('c-popped');
          drawParts(); drawMore();
          placePop();
          requestAnimationFrame(() => { box.classList.add('in'); if (!m || window.innerWidth >= 600) inp.focus({ preventScroll: true }); });
          snd('pick');
        }
        /* beside the day on a computer (under it, or over it near the bottom); a sheet on a phone */
        function placePop() {
          if (!pop) return;
          const cell = board.querySelector('[data-zone="meal"][data-date="' + pop.d + '"][data-kind="' + pop.k + '"]') || pop.cell;
          pop.cell = cell; cell.classList.add('c-popped');
          const box = pop.box, host = (mat || inner).getBoundingClientRect(), r = cell.getBoundingClientRect();
          if (window.innerWidth < 600) { box.classList.add('c-sheet'); box.style.left = box.style.top = ''; return; }
          box.classList.remove('c-sheet');
          /* under the day, else over it, else beside it; never on top of the day it's about */
          const w = box.offsetWidth || 340, hh = box.offsetHeight || 300, pad = 12, vh = window.innerHeight;
          let left = r.left + r.width / 2 - w / 2, top;
          if (r.bottom + 8 + hh <= vh - pad) top = r.bottom + 8;
          else if (r.top - 8 - hh >= pad) top = r.top - 8 - hh;
          else {
            top = Math.max(pad, Math.min(r.top - 24, vh - hh - pad));
            left = r.right + 10 + w <= host.right - pad ? r.right + 10 : r.left - 10 - w;
          }
          left = Math.max(host.left + pad, Math.min(left, host.right - w - pad));
          box.style.left = (left - host.left) + 'px'; box.style.top = (top - host.top) + 'px';
        }
        function closePop(back) {
          if (!pop) return;
          const p = pop; pop = null;
          if (p.box.contains(document.activeElement) && document.activeElement.blur) document.activeElement.blur();
          p.box.classList.remove('in'); p.box.classList.add('out');
          setTimeout(() => p.box.remove(), feelOn() ? 160 : 0);
          board.querySelectorAll('.c-popped').forEach((y) => y.classList.remove('c-popped'));
          if (back) { const c = board.querySelector('[data-zone="meal"][data-date="' + p.d + '"][data-kind="' + p.k + '"]'); if (c) c.focus({ preventScroll: true }); }
        }
        /* a tap outside the card closes it; a tap on another day opens that one */
        const outside = (e) => { if (pop && !pop.box.contains(e.target) && !e.target.closest('[data-zone="meal"]')) closePop(); };
        document.addEventListener('pointerdown', outside, true);
        inner.addEventListener('scroll', () => { if (pop) placePop(); }, { passive: true });
        const onResize = () => { if (tallBoard() !== board.classList.contains('c-tall')) draw(); else if (pop) placePop(); };
        window.addEventListener('resize', onResize);
        /* the slash key goes to Find, as in most apps */
        const slash = (e) => { if (e.key === '/' && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); findIn.focus(); } };
        document.addEventListener('keydown', slash);
        function moveWeek(n) { ws = M.addDays(ws, n); dates = M.range(ws, 7); props = new Map(); showPast = false; closePop(); letGoHeld(); draw(); speak(weekLabel()); snd('slide'); }
        matEsc = () => {
          if (pop) { closePop(true); return true; }
          if (held) { letGoHeld(); return true; }
          if (find) { find = ''; findIn.value = ''; drawSide(); return true; }
          return false;
        };
        matGone = () => { mealLive = null; matEsc = null; document.removeEventListener('keydown', slash); document.removeEventListener('pointerdown', outside, true); window.removeEventListener('resize', onResize); if (pop) { pop.box.remove(); pop = null; } };

        /* == suggest: an idea for every open meal, kept one at a time or all at once ==
           Yours come first, nothing repeats two days running, the week leans on variety (breakfast may
           repeat more), and the things you say you have move the meals that use them up front. */
        const rand = (n) => { let t = (n += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        function usesHave(y) {
          if (!have.size) return 0;
          const hay = norm([y.name].concat(y.parts || [], y.itemNames || []).join(' '));
          let n = 0;
          have.forEach((x) => { if (new RegExp('\\b' + esc(x) + '(e?s)?\\b').test(hay)) n++; });
          return n;
        }
        function suggestAll() {
          const L = library(), pool = L.yours.concat(L.ideas).filter((y) => !y.hidden && !y.out && !y.how);
          const out = new Map(), used = new Map();
          const bump = (name) => used.set(norm(name), (used.get(norm(name)) || 0) + 1);
          dates.forEach((d) => showRows.forEach((k) => { const m = mealAt(d, k); if (m && m.name) bump(m.name); }));
          let r = seed * 9973;
          dates.forEach((d) => {
            if (d < SR.today || SR.day(d).trip) return;
            showRows.forEach((k) => {
              if (mealAt(d, k) || (k === 'dinner' && !canDinner(d))) return;
              const before = out.get(M.addDays(d, -1) + '|' + k) || mealAt(M.addDays(d, -1), k);
              const prev = before ? norm(before.name) : '';
              const fit = pool.filter((y) => y.t[k] > 0), list = fit.length ? fit : pool;
              let best = null, top = -1e9;
              list.forEach((y) => {
                const key = norm(y.name);
                const score = (y.n > 0 ? 2 + Math.min(3, y.n) * 0.5 : 0) + Math.min(2, usesHave(y)) * 2.5 - (used.get(key) || 0) * (k === 'breakfast' ? 2 : 6) - (key === prev ? 8 : 0) + rand(r++) * 2.5;
                if (score > top) { top = score; best = y; }
              });
              if (best) { out.set(d + '|' + k, payloadOf(best)); bump(best.name); }
            });
          });
          return out;
        }
        function startSuggest() {
          seed = (seed % 997) + 1;
          props = suggestAll();
          if (!props.size) { SR.toast('Every meal left this week is planned.', ''); return; }
          closePop(); letGoHeld(); draw(); snd('clack', 0.6);
          speak(props.size + (props.size === 1 ? ' idea' : ' ideas') + ' for the open meals');
        }
        function keepOne(d, k) {
          const p = props.get(d + '|' + k);
          if (!p) return;
          if (setCell(d, k, (st) => mealFrom(st, p))) { draw(); snd('clack', 0.85); }
        }
        function keepAll() {
          const list = [...props.entries()].filter(([key]) => { const [d, k] = key.split('|'); return !mealAt(d, k) && (k !== 'dinner' || canDinner(d)); });
          if (!list.length) return;
          commitMeals((st) => list.forEach(([key, p]) => { const [d, k] = key.split('|'); if (k === 'dinner') ensureDinner(st, d); putMeal(st, d, k, mealFrom(st, p)); }));
          props = new Map(); landSet = new Set(list.map(([key]) => key));
          draw(); snd('clack', 0.9);
          SR.toast(list.length + (list.length === 1 ? ' meal' : ' meals') + ' planned', 'good', { label: 'Undo', fn: () => { SR.undo(); } });
          speak(list.length + ' meals planned');
        }
        /* the ingredients that show up most in the meals you'd pick, for "We have" */
        function kitchenWords() {
          const L = library(), c = new Map();
          L.yours.concat(L.ideas).filter((y) => !y.hidden && !y.out).forEach((y) => (y.parts || []).concat(y.itemNames || []).forEach((pt) => {
            const g = groceryName(pt);
            if (!g) return;
            const key = singular(g);
            c.set(key, { name: g.replace(/^Ground /, ''), n: ((c.get(key) || {}).n || 0) + 1 });
          }));
          const top = [...c.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10);
          have.forEach((x) => { if (!top.some(([key]) => key === x)) top.push([x, { name: cap(x) }]); });
          return top.map(([key, v]) => [key, v.name]);
        }
        function drawSug() {
          sugBar.hidden = !props.size;
          sugBtn.hidden = !!props.size;
          if (!props.size) return;
          sugBar.replaceChildren();
          const line = h('div', 'c-sugline');
          line.append(h('p', '', (props.size === 1 ? 'An idea for 1 open meal.' : 'Ideas for ' + props.size + ' open meals.') + ' Tap one to keep it.'));
          const btns = h('div', 'c-sugbtns');
          btns.append(
            Kit.btn('c-opt', 'Clear', () => { props = new Map(); draw(); speak('Ideas cleared'); }),
            Kit.btn('c-opt', 'Shuffle', () => { seed++; props = suggestAll(); draw(); snd('detent'); speak('New ideas'); }, 'redo'),
            Kit.btn('c-go c-keepall', 'Keep all ' + props.size, () => keepAll()));
          line.appendChild(btns);
          /* what you have at home: the ideas, and the library, lean on it */
          const hv = h('div', 'c-have'); hv.setAttribute('role', 'group'); hv.setAttribute('aria-label', 'We have');
          hv.appendChild(h('span', 'c-kick', 'We have'));
          kitchenWords().forEach(([key, name]) => {
            const on = have.has(key);
            const b = Kit.btn('c-opt c-havechip', name, () => { if (on) have.delete(key); else have.add(key); seed++; props = suggestAll(); draw(); snd('detent'); });
            b.setAttribute('aria-pressed', String(on));
            hv.appendChild(b);
          });
          const f = h('form', 'c-haveform'), inp = h('input', 'c-find'); inp.placeholder = 'Something else'; inp.setAttribute('aria-label', 'Something else we have'); inp.autocomplete = 'off';
          f.appendChild(inp);
          f.addEventListener('submit', (e) => { e.preventDefault(); const w = singular(groceryName(inp.value) || inp.value); if (!w) return; have.add(w); seed++; props = suggestAll(); draw(); const again = sugBar.querySelector('.c-haveform input'); if (again) again.focus(); });
          hv.appendChild(f);
          sugBar.append(line, hv);
        }

        /* == the library == */
        function setFor(k) { if (forT === k) return; forT = k; drawSide(); snd('detent'); }
        function drawSide() { keepFocus(side, drawSide0); landKey = ''; }
        function drawSide0() {
          forRow.replaceChildren();
          [['', 'Any time']].concat(MEAL_KINDS).forEach(([k, n]) => { const b = Kit.btn('', n, () => setFor(k)); b.setAttribute('aria-pressed', String(forT === k)); forRow.appendChild(b); });
          const bk = book(), nOut = bk.out.length + bk.words.length;
          leaveBtn.classList.toggle('on', leaving || nOut > 0);
          leaveBtn.setAttribute('aria-expanded', String(leaving));
          const count = leaveBtn.querySelector('i') || leaveBtn.appendChild(h('i', 'k-count'));
          count.textContent = nOut ? String(nOut) : ''; count.hidden = !nOut;
          leave.hidden = !leaving;
          if (leaving) drawLeave();
          flip(lib, drawLib);
        }
        function drawLib() {
          lib.replaceChildren();
          const L = library(), all = L.yours.concat(L.ideas), q = find.trim();
          const vis = (y) => !y.hidden && !y.out && (!q || matches(y, q));
          let Y = sorted(L.yours.filter(vis), forT), I = sorted(L.ideas.filter(vis), forT);
          /* what you have at home leads, within each part of the list */
          if (have.size) { const byHave = (list) => list.map((y, i) => [y, i]).sort((a, b) => (usesHave(b[0]) - usesHave(a[0])) || a[1] - b[1]).map(([y]) => y); Y = byHave(Y); I = byHave(I); }
          /* the meal you added a moment ago leads, so you can see where it went */
          if (fresh) { const i = Y.findIndex((y) => y.key === fresh); if (i > 0) Y.unshift(Y.splice(i, 1)[0]); }
          if (q && !all.some((y) => norm(y.name) === norm(q))) lib.appendChild(addRow(q));
          let first = true;
          const section = (title, list, divide) => {
            const g = h('div', 'c-tgroup');
            const head = h('div', 'c-libsec'); head.appendChild(h('div', 'c-kick', title));
            if (first) { const e = Kit.btn('c-libedit', editing ? 'Done' : 'Edit', () => { editing = !editing; letGoHeld(); drawSide(); }); e.setAttribute('aria-pressed', String(editing)); head.appendChild(e); }
            g.appendChild(head);
            if (first && editing) g.appendChild(h('p', 'c-libsay', 'Tap a meal to hide it. Meals you added come off for good.'));
            first = false;
            let row = h('div', 'c-trow2'); g.appendChild(row);
            list.forEach((y, i) => {
              if (divide && i > 0 && !(y.t[divide] > 0) && list[i - 1].t[divide] > 0) { g.appendChild(h('div', 'c-libdiv', 'Other times')); row = h('div', 'c-trow2'); g.appendChild(row); }
              row.appendChild(piece(y));
            });
            lib.appendChild(g);
          };
          /* sorted for a meal of the day, what fits it leads (yours, then ideas), and the rest follows */
          const fits = (y) => y.t[forT] > 0;
          const A = forT ? Y.filter(fits).concat(I.filter(fits)) : Y, B = forT ? Y.filter((y) => !fits(y)).concat(I.filter((y) => !fits(y))) : I;
          if (A.length) section(forT ? kindName(forT) : 'Yours', A);
          const ways = NOT_COOKING.filter(([, n]) => !q || matches({ name: n }, q));
          if (ways.length && !editing) {
            const g = h('div', 'c-tgroup'); g.appendChild(h('div', 'c-kick', 'Not cooking'));
            const row = h('div', 'c-ways');
            ways.forEach(([id, n, ic]) => {
              const pay = { key: 'w:' + id, name: n, how: id, way: true };
              const b = h('div', 'c-way'); b.dataset.k = pay.key; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', n + '. Tap, then tap a day');
              b.append(SR.icon(ic, 8, CREAM), h('span', '', n));
              b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hold(pay, b); } });
              draggable(b, pay, { accept, why: refusal, onDrop: (z, p) => dropOn(z, p), onTap: (p, el) => hold(p, el) });
              if (held && held.p.key === pay.key) b.classList.add('c-held');
              row.appendChild(b);
            });
            g.appendChild(row); lib.appendChild(g);
          }
          if (B.length) section(forT ? 'Other meals' : 'Ideas', B);
          if (!Y.length && !I.length) lib.appendChild(h('p', 'c-libnone', q ? 'Nothing called “' + q + '” yet. Press Enter to add it.' : 'Everything here is hidden or left out. Type a meal above, or change what you leave out.'));
          /* what's hidden or left out is counted, never gone without a word */
          const nHidden = all.filter((y) => y.hidden).length, nOut = all.filter((y) => !y.hidden && y.out).length;
          if (nHidden || nOut) {
            const f = h('div', 'c-libfoot');
            if (nOut) f.appendChild(Kit.btn('c-linkbtn', nOut + ' left out', () => { leaving = true; drawSide(); sideScroll.scrollTop = 0; }));
            if (nHidden) f.appendChild(Kit.btn('c-linkbtn', showHidden ? 'Done with hidden' : nHidden + ' hidden', () => { showHidden = !showHidden; drawSide(); }));
            lib.appendChild(f);
            if (showHidden && nHidden) {
              const g = h('div', 'c-tgroup c-hiddenset'); g.appendChild(h('div', 'c-kick', 'Hidden. Tap one to bring it back'));
              const row = h('div', 'c-trow2');
              all.filter((y) => y.hidden).forEach((y) => {
                const b = domBlock(y.name, '', MEAL_COLOR[tileColor(y)], MEAL_INK[tileColor(y)], 'c-piece c-gone');
                b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Bring back ' + y.name);
                const back = () => { editBook((bk) => { bk.hide = bk.hide.filter((key) => key !== y.key); }); drawSide(); snd('clack', 0.6); };
                b.addEventListener('click', back);
                b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); back(); } });
                const wrap = h('div', 'c-pwrap'); wrap.dataset.k = 'hidden:' + y.key; wrap.appendChild(b); row.appendChild(wrap);
              });
              g.appendChild(row); lib.appendChild(g);
            }
          }
          requestAnimationFrame(() => sideHint());
        }
        function piece(y) {
          const wrap = h('div', 'c-pwrap' + (editing ? ' editing' : '')); wrap.dataset.k = y.key;
          const col = tileColor(y, forT);
          const b = domBlock(y.name, y.dur ? M.dur(y.dur) : y.how ? howName(y.how) : '', MEAL_COLOR[col], MEAL_INK[col], 'c-piece' + (y.key === landKey ? ' c-land' : ''));
          b.tabIndex = 0; b.setAttribute('role', 'button');
          b.setAttribute('aria-label', editing ? (y.kind === 'own' ? 'Remove ' : 'Hide ') + y.name : y.name + '. Tap, then tap a day');
          const pay = payloadOf(y);
          const whole = (y.parts && y.parts.length ? y.parts : y.itemNames || []).join(', ');
          if (whole) b.title = whole;
          if (have.size && usesHave(y)) b.appendChild(h('small', 'c-uses', 'Uses ' + usesHave(y) + ' you have'));
          b.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (editing) hideMeal(y); else hold(pay, b); }
            else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); hideMeal(y); }
          });
          draggable(b, pay, { accept, why: refusal, onDrop: (z, p) => dropOn(z, p), onTap: (p, el) => { if (editing) hideMeal(y); else hold(p, el); }, onLift: () => { board.dataset.drag = 'replace'; }, onEnd: () => { delete board.dataset.drag; } });
          if (held && held.p.key === y.key) b.classList.add('c-held');
          /* hide sits beside the tile, never inside it */
          const x0 = h('button', 'c-phide'); x0.type = 'button';
          x0.setAttribute('aria-label', (y.kind === 'own' ? 'Remove ' : 'Hide ') + y.name); x0.title = y.kind === 'own' ? 'Remove' : 'Hide';
          x0.appendChild(SR.icon('x', 6, '#252928'));
          x0.addEventListener('click', (e) => { e.stopPropagation(); hideMeal(y); });
          wrap.append(b, x0);
          return wrap;
        }
        function addRow(q) {
          const name = cap(q), parts = partsOf(q);
          const b = h('button', 'c-addrow'); b.type = 'button';
          b.append(SR.icon('plus', 8, CREAM), h('span', '', 'Add “' + name + '”'));
          if (parts.length) b.appendChild(h('small', '', parts.length + ' parts'));
          b.addEventListener('click', () => addOwn(q));
          return b;
        }
        /* a meal you add joins Yours, held, so the next tap on a day places it */
        function addOwn(text) {
          const name = cap(text);
          if (!name) return;
          const id = 'm' + Date.now().toString(36);
          editBook((bk) => { bk.own = [{ id, name, parts: partsOf(name) }].concat(bk.own); });
          fresh = landKey = 'o:' + id; find = ''; findIn.value = '';
          drawSide();
          const el = lib.querySelector('[data-k="o:' + id + '"] .c-piece');
          if (el) { held = null; hold({ key: 'o:' + id, name, parts: partsOf(name), items: null }, el); el.scrollIntoView({ block: 'nearest' }); }
          SR.toast('Added ' + name + ' to your meals', 'good', { label: 'Undo', fn: () => { SR.undo(); fresh = ''; letGoHeld(); } });
        }
        function hideMeal(y) {
          if (y.kind === 'own') editBook((bk) => { bk.own = bk.own.filter((o) => 'o:' + o.id !== y.key); });
          else editBook((bk) => { if (!bk.hide.includes(y.key)) bk.hide = bk.hide.concat(y.key); });
          if (held && held.p.key === y.key) letGoHeld();
          drawSide(); snd('slide');
          SR.toast((y.kind === 'own' ? 'Removed ' : 'Hid ') + y.name, '', { label: 'Undo', fn: () => { SR.undo(); } });
        }
        function drawLeave() {
          const bk = book();
          leave.replaceChildren();
          const dRow = h('div', 'c-opts'); dRow.setAttribute('role', 'group'); dRow.setAttribute('aria-label', 'We eat');
          DIETS.forEach((dt) => { const b = Kit.btn('c-opt', dt.name, () => setDiet(dt.id)); b.setAttribute('aria-pressed', String(bk.diet === dt.id)); dRow.appendChild(b); });
          const oRow = h('div', 'c-opts'); oRow.setAttribute('role', 'group'); oRow.setAttribute('aria-label', 'Leave out');
          LEAVE.forEach((L) => { const b = Kit.btn('c-opt', L.name, () => toggleOut(L.id)); b.setAttribute('aria-pressed', String(bk.out.includes(L.id))); oRow.appendChild(b); });
          bk.words.forEach((w) => { const b = Kit.btn('c-opt c-word', w, () => editBook((x) => { x.words = x.words.filter((y) => y !== w); }), 'x'); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', 'Stop leaving out ' + w); oRow.appendChild(b); });
          const f = h('form', 'c-leaveform'), inp = h('input', 'c-find'); inp.placeholder = 'Something else, like mushrooms'; inp.setAttribute('aria-label', 'Something else to leave out'); inp.autocomplete = 'off';
          f.appendChild(inp);
          f.addEventListener('submit', (e) => { e.preventDefault(); const w = norm(inp.value); if (!w) return; editBook((x) => { if (!x.words.includes(w)) x.words = x.words.concat(w); }); drawSide(); const again = leave.querySelector('input'); if (again) again.focus(); });
          leave.append(h('div', 'c-kick', 'We eat'), dRow, h('div', 'c-kick', 'Leave out'), oRow, f, h('p', 'c-libsay', 'This only hides meals here. Your days stay as they are.'));
        }
        /* a diet sets its own things to leave out and keeps the rest (gluten, nuts, your own words) */
        function setDiet(id) {
          const dt = DIETS.find((x) => x.id === id);
          editBook((bk) => { bk.diet = id; bk.out = bk.out.filter((o) => !DIET_IDS.includes(o)).concat(dt.out); });
          drawSide(); snd('detent');
        }
        function toggleOut(id) {
          editBook((bk) => {
            bk.out = bk.out.includes(id) ? bk.out.filter((o) => o !== id) : bk.out.concat(id);
            const mine = bk.out.filter((o) => DIET_IDS.includes(o)).sort().join();
            const fits = DIETS.find((dt) => dt.out.slice().sort().join() === mine);
            bk.diet = fits ? fits.id : 'all';
          });
          drawSide(); snd('detent');
        }
        findIn.addEventListener('input', () => { find = findIn.value; fresh = ''; drawSide(); });
        findForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const q = findIn.value.trim();
          if (!q) return;
          const L = library(), hit = L.yours.concat(L.ideas).find((y) => norm(y.name) === norm(q));
          if (!hit) { addOwn(q); return; }
          if (hit.hidden) editBook((bk) => { bk.hide = bk.hide.filter((key) => key !== hit.key); });
          find = ''; findIn.value = ''; fresh = landKey = hit.key;
          drawSide();
          const el = lib.querySelector('[data-k="' + hit.key + '"] .c-piece');
          if (el) { held = null; hold(payloadOf(hit), el); el.scrollIntoView({ block: 'nearest' }); }
        });
        draw();
      }, () => { if (matGone) matGone(); matGone = null; SR.render(); });
      return inner;
    }
    /* a redraw keeps focus on the same control, so a keyboard never gets thrown back to the page */
    function keepFocus(root, run) {
      const a = document.activeElement;
      const was = a && a !== root && root.contains(a) ? a.tagName + '|' + (a.getAttribute('aria-label') || a.textContent || '') : '';
      run();
      if (!was || root.contains(a)) return;
      const again = [...root.querySelectorAll(a.tagName)].find((x) => x.tagName + '|' + (x.getAttribute('aria-label') || x.textContent || '') === was);
      if (again) again.focus({ preventScroll: true });
    }
    /* tiles that move when the library sorts or filters glide to their new places (not with calmer motion) */
    function flip(box, run) {
      if (!feelOn() || !box.isConnected) { run(); return; }
      const before = new Map();
      box.querySelectorAll('[data-k]').forEach((el) => before.set(el.dataset.k, el.getBoundingClientRect()));
      run();
      box.querySelectorAll('[data-k]').forEach((el) => {
        const r0 = before.get(el.dataset.k), r1 = el.getBoundingClientRect();
        if (!r0) { if (before.size) el.animate([{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: FOUT }); return; }
        const dx = r0.left - r1.left, dy = r0.top - r1.top;
        if (Math.abs(dx) + Math.abs(dy) < 1 || Math.abs(dy) > 600) return;
        el.animate([{ transform: 'translate(' + dx + 'px, ' + dy + 'px)' }, { transform: 'none' }], { duration: 220, easing: FOUT });
      });
    }

    /* == V4: a block's own mat. Tap a block twice: it lifts, the camera slides over, and its details land on a mat == */
    const routines = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.routines') || '{}'); } catch (e) { return {}; } })();
    const saveRoutines = () => keep('sundayreset.v7.routines', routines);
    const EXERCISES = [
      { name: 'Treadmill', min: 20 }, { name: 'Bike', min: 15 }, { name: 'Rowing', min: 10 }, { name: 'Walk', min: 30 },
      { name: 'Squats', sets: 3, reps: 10 }, { name: 'Push-ups', sets: 3, reps: 12 }, { name: 'Lunges', sets: 3, reps: 10 }, { name: 'Deadlifts', sets: 3, reps: 8 },
      { name: 'Rows', sets: 3, reps: 10 }, { name: 'Bench press', sets: 3, reps: 8 }, { name: 'Plank', sets: 3, sec: 45 }, { name: 'Stretch', min: 10 }
    ];
    const isMove = (b) => b && (/workout|run|walk|stretch|gym|yoga|swim|bike|lift|train/i.test(b.name || '') || ['dumbbell', 'runner', 'shoe'].includes(b.icon));
    const exWords = (x) => (x.min ? x.min + ' min' : x.sec ? x.sets + ' × ' + x.sec + ' s' : x.sets + ' × ' + x.reps);
    const exMin = (x) => (x.min ? x.min : x.sec ? Math.ceil((x.sets * (x.sec + 45)) / 60) : Math.ceil((x.sets * (x.reps * 4 + 60)) / 60));
    let detail = null;
    function blockFor(sel) {
      const d = SR.day(sel.date);
      if (sel.type === 'dinner') return d.blocks.find((b) => b.dinner);
      return d.blocks.find((b) => b.key === sel.key || b.base === sel.key || ('add:' + b.add) === sel.key) || null;
    }
    function openDetail(sel) {
      const b = blockFor(sel);
      if (!b) return;
      const before = JSON.stringify(SR.state);
      const a = World.blockAnchor(sel.date, b.key) || World.blockAnchor(sel.date, sel.key);
      const look = (World.look ? World.look(b) : null) || catColor(b.cat);
      detail = { sel: Object.assign({}, sel), key: b.key, name: b.name, before };
      /* the block lifts off the board where it sits */
      const lift = domBlock(b.label || b.name, M.clock(b.start) + ' to ' + M.clock((b.start + b.dur) % 1440), look.base, look.ink, 'c-liftblock');
      if (a) { lift.style.left = a.x + 'px'; lift.style.top = (a.bottom || a.y) + 'px'; }
      else { lift.style.left = '50%'; lift.style.top = '60%'; }
      document.body.appendChild(lift);
      requestAnimationFrame(() => lift.classList.add('up'));
      snd('pick');
      setTimeout(() => {
        openMat('c-detail', (inner) => {
          matHead(inner, M.DAY_LONG[M.weekday(sel.date)] + ' · ' + M.clock(b.start), b.label || b.name, () => doneDetail());
          const left = h('div', 'c-dleft');
          const slot = h('div', 'c-dslot');
          left.appendChild(slot);
          inner.appendChild(left);
          /* the lifted block flies over and lands in its slot on the mat */
          requestAnimationFrame(() => {
            const r = slot.getBoundingClientRect();
            lift.classList.add('fly');
            lift.style.left = (r.left + r.width / 2) + 'px'; lift.style.top = (r.top + r.height / 2) + 'px';
            setTimeout(() => { lift.remove(); const big = domBlock(b.label || b.name, M.clock(b.start) + ' to ' + M.clock((b.start + b.dur) % 1440), look.base, look.ink, 'c-bigblock c-land'); slot.replaceChildren(big); snd('clack', 0.9); }, 560);
          });
          if (b.dinner) {
            const go = Kit.btn('cta c-mealcta', '', () => { closeMat(true); detail = null; SR.view.sel = null; SR.render(); openMealBoard(M.weekStart(sel.date)); });
            go.append(SR.icon('pot', 10, '#F2CF7A'), h('span', 'grow', 'Open the meal board'));
            left.appendChild(go);
          }
          if (isMove(b)) left.appendChild(routineBoard(b));
        }, () => { lift.remove(); });
      }, 160);
    }
    function routineBoard(b) {
      const key = b.name;
      const box = h('div', 'c-routine');
      function draw() {
        const list = routines[key] || [];
        box.replaceChildren();
        const total = list.reduce((a, x) => a + exMin(x), 0);
        const head = h('div', 'c-rhead'); head.append(h('div', 'c-kick', 'Your routine'), h('span', 'c-rtotal', list.length ? 'About ' + M.dur(total) + (total > b.dur + 5 ? ', longer than the block' : '') : ''));
        box.appendChild(head);
        const groove = h('div', 'c-woodboard c-groove'); groove.dataset.zone = 'routine'; groove.dataset.at = String(list.length);
        list.forEach((x, i) => {
          const blk = domBlock(x.name, exWords(x), '#7A5A2E', '#FFFFFF', 'c-ex');
          blk.dataset.zone = 'routine'; blk.dataset.at = String(i);
          const steps = h('div', 'c-exstep c-nodrag');
          const bump = (dir) => {
            const it = routines[key][i];
            if (it.min) it.min = Math.max(5, it.min + dir * 5); else if (it.sec) it.sets = Math.max(1, it.sets + dir); else it.reps = Math.max(1, it.reps + dir * (it.reps >= 10 ? 2 : 1));
            saveRoutines(); snd('detent'); draw();
          };
          const minus = Kit.btn('c-tstep', '', () => bump(-1), 'minus'), plus = Kit.btn('c-tstep', '', () => bump(1), 'plus');
          minus.setAttribute('aria-label', x.name + ', less'); plus.setAttribute('aria-label', x.name + ', more');
          steps.append(minus, plus);
          blk.appendChild(steps);
          draggable(blk, { from: i }, {
            onDrop: (z, p) => { const to = +z.dataset.at; const arr = routines[key]; const [it] = arr.splice(p.from, 1); arr.splice(Math.min(to, arr.length), 0, it); saveRoutines(); draw(); },
            onOut: (p) => { routines[key].splice(p.from, 1); saveRoutines(); draw(); }
          });
          groove.appendChild(blk);
        });
        if (!list.length) groove.appendChild(h('span', 'c-gempty', 'Drag exercises here in order, or tap one'));
        box.appendChild(groove);
        const lib = h('div', 'c-trow2');
        EXERCISES.forEach((x) => {
          const p = domBlock(x.name, exWords(x), '#86683A', '#FFFFFF', 'c-piece c-ex');
          const addEx = (at) => { routines[key] = routines[key] || []; routines[key].splice(Math.min(at, routines[key].length), 0, Object.assign({}, x)); saveRoutines(); draw(); };
          p.tabIndex = 0; p.setAttribute('role', 'button'); p.setAttribute('aria-label', 'Add ' + x.name + ', ' + exWords(x));
          p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addEx(Infinity); snd('clack', 0.7); } });
          draggable(p, x, { onDrop: (z) => addEx(+z.dataset.at), onTap: () => { addEx(Infinity); snd('clack', 0.7); } });
          lib.appendChild(p);
        });
        const libBox = h('div', 'c-tgroup'); libBox.append(h('div', 'c-kick', 'Exercises'), lib);
        box.appendChild(libBox);
      }
      draw();
      return box;
    }
    /* a block's panel opens without a redraw of the board, so watch the panel itself */
    function checkDetail() {
      const v = SR.view, sel = v.sel;
      /* V11: only a block with more to show takes a mat of its own (a dinner, a workout's routine); any other
         block opens its panel beside the board, where its times are said once */
      const more = (s) => s.type === 'dinner' || (() => { const b = blockFor(s); return !!b && (!!b.dinner || isMove(b)); })();
      if (sel && (sel.type === 'block' || sel.type === 'dinner') && !detail && !v.reset && !v.phone && !mat && more(sel)) openDetail(sel);
      else if (detail && !sel) doneDetail();
      document.body.classList.toggle('c-detail', !!detail);
    }
    new MutationObserver(() => requestAnimationFrame(checkDetail)).observe(document.getElementById('side'), { attributes: true, attributeFilter: ['hidden'], childList: true });
    function doneDetail() {
      if (!detail) { closeMat(); return; }
      const d = detail; detail = null;
      const changed = JSON.stringify(SR.state) !== d.before;
      SR.view.sel = null;
      closeMat();
      SR.render();
      setTimeout(() => { try { World.squash(d.sel.date, d.key); } catch (e) { /* fine */ } snd('clack', 0.7); }, 700);
      if (changed) SR.toast('Saved changes to ' + d.name + '.', 'good', { label: 'Undo', fn: SR.undo });
    }

    /* == V4: To-dos in a panel beside the board, not over it. Pick a stack: its pieces come out on the desk while the panel stays == */
    let dock = null;
    function closeDock() { if (!dock) return; dock.remove(); dock = null; document.body.classList.remove('c-docked'); drawStackBar(); requestAnimationFrame(() => SR.layoutInsets()); }
    function openDock(build) {
      closeDock(); Kit.closeSheet(); closeMenu();
      dock = h('aside', 'k c-dock'); if (window.innerWidth >= 760) dock.dataset.edge = 'left'; dock.setAttribute('aria-label', 'To-dos');
      const x = Kit.btn('k-x', '', closeDock, 'x'); x.setAttribute('aria-label', 'Close To-dos');
      dock.appendChild(x);
      build(dock);
      app.appendChild(dock);
      document.body.classList.add('c-docked');
      /* V11: the stack strip steps away at once; the panel names the lists now */
      drawStackBar();
      requestAnimationFrame(() => requestAnimationFrame(() => SR.layoutInsets()));
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dock && !Kit.openSheetEl && !mat && SR.view.sel == null) { closeDock(); } });

    /* == V4: the reset, step by step == */
    const focusFor = (k) => ({
      dinners: (b) => !!(b.dinner || b.cat === 'meals'),
      kim: (b) => b.cat === 'us',
      yours: (b) => b.cat === 'yours',
      todo: (b) => !!(b.src && (b.src.type === 'task' || b.src.type === 'step'))
    }[k] || null);
    let focusKey = '';
    function stepFocus() {
      const r = SR.view.reset;
      const k = r ? SR.stepsNow()[r.step].key : '';
      const want = r && !mat ? k : '';
      /* V11: with every kind of day laid out, the desk things step away too: the cards are the whole page */
      World.setPropsAway(!!r || !!mat || spreadOn());
      if (want === focusKey) return;
      focusKey = want;
      World.setFocus(focusFor(want));
      requestAnimationFrame(() => SR.render());
      setTimeout(() => SR.layoutInsets(), 500);
    }
    /* the panel can step aside so the whole week shows */
    let panelOff = false;
    const peek = Kit.btn('k k-chip c-peek', '', () => { panelOff = false; sync(); requestAnimationFrame(() => SR.layoutInsets()); });
    peek.hidden = true; app.appendChild(peek);
    function panelTools() {
      const rack = document.getElementById('rack');
      if (!rack || !SR.view.reset) { peek.hidden = true; document.body.classList.remove('c-panel-off'); return; }
      const st = SR.stepsNow()[SR.view.reset.step];
      document.body.classList.toggle('c-panel-off', panelOff);
      if (panelOff) delete rack.dataset.edge; else rack.dataset.edge = window.innerWidth < 760 ? 'bottom' : 'left';
      peek.hidden = !panelOff;
      peek.replaceChildren(SR.icon('right', 7, Kit.ink), h('b', '', stepName(st.key)), h('span', '', 'Show steps'));
      const top = rack.querySelector('.rack-top');
      if (top && !rack.querySelector('.c-hidepanel')) {
        const hb = Kit.btn('c-hidepanel', '', () => { panelOff = true; sync(); requestAnimationFrame(() => SR.layoutInsets()); }, 'left');
        hb.setAttribute('aria-label', 'Hide the steps'); hb.title = 'Hide the steps, see the whole week';
        rack.appendChild(hb);
      }
    }
    /* the To-dos step, laid out to read at a glance, with what's coming further out under it */
    const comingOpen = () => { try { return localStorage.getItem('sundayreset.v7.coming') !== '0'; } catch (e) { return true; } };
    function upcoming(from, days) {
      const out = [], seenTrip = new Set();
      M.range(from, days).forEach((d) => {
        const x = SR.day(d);
        (x.markers || []).forEach((m) => out.push({ d, name: m.name, icon: m.icon || 'star' }));
        const tr = x.trip, tid = tr && (tr.id || tr.name || tr);
        if (tr && !seenTrip.has(tid)) { seenTrip.add(tid); const nm = tr.name || String(tr); out.push({ d, name: tr.end && tr.end !== tr.date ? nm + ', to ' + M.DAY_SHORT[M.weekday(tr.end)] + ' ' + M.MONTH_SHORT[M.parts(tr.end).m - 1] + ' ' + M.parts(tr.end).d : nm, icon: tr.icon || 'plane' }); }
      });
      (SR.M.liveEvents ? SR.M.liveEvents(SR.state) : SR.state.events || []).forEach((e) => {
        if (e.kind === 'timed' && e.date >= from && e.date <= M.addDays(from, days - 1)) out.push({ d: e.date, name: e.name + ', ' + M.clock(e.start), icon: e.icon || 'star' });
      });
      return out.sort((a, b) => (a.d < b.d ? -1 : 1));
    }
    function shapeTodo(body) {
      if (body.querySelector('.c-sum')) return;
      body.querySelectorAll('.stat').forEach((s) => s.remove());
      /* V11: one window, the same as the To-dos count: due this week leads, and the rest of the next three
         weeks (the board lays them all out here, for planning ahead) wait under their own heading */
      const soon = M.dueSoon(SR.state, SR.today, 21, SR.nowMin), week = dueWeek();
      const need = week.filter((x) => x.status !== 'planned').length, later = soon.length - week.length;
      const r = SR.view.reset, from = r.catchup ? SR.today : r.week;
      const cap = M.capacity ? M.capacity(SR.state, from, M.diffDays(from, M.addDays(r.week, 6)) + 1, SR.today, SR.nowMin) : null;
      const sum = h('div', 'c-sum');
      const line = (big, words) => { const p = h('p'); p.append(h('b', '', big), document.createTextNode(' ' + words)); return p; };
      if (need) sum.appendChild(line(String(need), need === 1 ? 'to-do due this week needs a time' : 'to-dos due this week need a time'));
      else sum.appendChild(line('All', week.length ? 'to-dos due this week have a time' : 'clear: nothing due this week'));
      if (cap) sum.appendChild(line(M.hours(cap.room), 'open' + (cap.need ? '; they need about ' + M.hours(cap.need) : ' this week')));
      body.prepend(sum);
      /* the board lays the tiles out soonest due first, so this week's are the first ones */
      const all = [...body.querySelectorAll(':scope > .tile, :scope > .tile-wrap, :scope > [class*="add"]')];
      const adds = all.filter((t) => t.classList.contains('add')), tiles = all.filter((t) => !t.classList.contains('add'));
      const grid = h('div', 'c-tilegrid');
      tiles.slice(0, week.length).forEach((t) => grid.appendChild(t));
      sum.after(grid);
      if (later > 0 && tiles.length > week.length) {
        const grid2 = h('div', 'c-tilegrid');
        tiles.slice(week.length).forEach((t) => grid2.appendChild(t));
        adds.forEach((t) => grid2.appendChild(t));
        grid.after(h('div', 'c-sumlater', 'Later, in the next three weeks'), grid2);
      } else adds.forEach((t) => grid.appendChild(t));
      /* coming up: not urgent, just worth knowing */
      const list = upcoming(SR.today, 56);
      if (list.length) {
        const box = h('section', 'c-coming' + (comingOpen() ? ' open' : ''));
        const tog = Kit.btn('c-comhead', '', () => { const o = !box.classList.contains('open'); box.classList.toggle('open', o); try { localStorage.setItem('sundayreset.v7.coming', o ? '1' : '0'); } catch (e) { /* fine */ } });
        tog.append(h('b', '', 'Coming up'), h('span', '', list.length + (list.length === 1 ? ' thing' : ' things') + ' in the next 8 weeks'), SR.icon('down', 7, '#B8B0A3'));
        const ul = h('ul');
        list.slice(0, 10).forEach((x) => { const li = h('li'); li.append(SR.icon(x.icon, 8, '#B8B0A3'), h('span', 'c-cwhen', M.DAY_SHORT[M.weekday(x.d)] + ' ' + M.MONTH_SHORT[M.parts(x.d).m - 1] + ' ' + M.parts(x.d).d), h('span', '', x.name)); ul.appendChild(li); });
        box.append(tog, ul);
        body.appendChild(box);
      }
    }
    /* Your time offers your own blocks; work and meetings have their own time */
    function shapeYours(body) {
      const notMine = new Set((SR.state.palette || []).filter((b) => b.cat && b.cat !== 'yours').map((b) => b.name));
      body.querySelectorAll('.tile').forEach((t) => { const nm = t.querySelector('.nm'); if (nm && notMine.has(nm.textContent.trim())) t.hidden = true; });
    }
    /* the board says "to do"; the corners say "to-do". One spelling on every screen of this version */
    const WORDS = [[/\bNew to do\b/g, 'New to-do'], [/\bto dos\b/g, 'to-dos'], [/\bTo dos\b/g, 'To-dos'], [/\b(\d+|a|one|One) to do\b/g, '$1 to-do'], [/\bto do with a time\b/g, 'to-do with a time'], [/\bTo do\b(?= ·|$)/g, 'To-dos'],
      [/Here’s what you set up\.$/, 'Finish when it looks right. You can change anything later.'], [/\bevery to do\b/g, 'every to-do']];
    function tidyWords(root) {
      if (!root) return;
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        let t = n.nodeValue; const was = t;
        WORDS.forEach(([re, to]) => { t = t.replace(re, to); });
        if (t !== was) n.nodeValue = t;
      }
    }
    const toasts = document.getElementById('toasts');
    if (toasts) new MutationObserver(() => tidyWords(toasts)).observe(toasts, { childList: true, subtree: true, characterData: true });
    const sidePanel = document.getElementById('side');
    if (sidePanel) new MutationObserver(() => tidyWords(sidePanel)).observe(sidePanel, { childList: true, subtree: true });
    ['drawer', 'quick', 'kinds-row'].forEach((id) => { const x = document.getElementById(id); if (x) new MutationObserver(() => tidyWords(x)).observe(x, { childList: true, subtree: true }); });
    /* Look ahead is about dates. What's due waits for To-dos, said in one line instead of the same tiles twice */
    function shapeAhead(body) {
      if (body.querySelector('.c-aheadnote')) return;
      const sec = [...body.querySelectorAll('.rsec')].find((x) => /due soon/i.test(x.textContent.slice(0, 20)));
      if (!sec) return;
      const n = sec.querySelectorAll('.tile').length;
      const later = SR.stepsNow().some((s) => s.key === 'todo');
      const p = h('p', 'c-aheadnote');
      p.append(h('b', '', String(n)), document.createTextNode(' ' + (n === 1 ? 'to-do is' : 'to-dos are') + ' due in the next three weeks. ' + (later ? 'You’ll give them a time in To-dos.' : '')));
      sec.replaceWith(p);
    }
    /* the dinner step: breakfast, lunch, and dinner, and the meal board one tap away */
    let mealTab = 'dinner';
    function shapeMeals(body) {
      const had = body.querySelector('.c-mealtop');
      if (had && had.dataset.tab === mealTab) return;
      const r = SR.view.reset, dates = M.range(r.week, 7);
      const top = h('div', 'c-mealtop');
      const go = Kit.btn('cta c-mealcta', '', () => openMealBoard(r.week));
      go.append(SR.icon('pot', 10, '#F2CF7A'), h('span', 'grow', 'Open the meal board'), h('small', '', 'Drag meals onto the week'));
      const seg = h('div', 'k-seg c-mealseg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Meal');
      MEAL_KINDS.forEach(([k, name]) => { const b = Kit.btn('', name, () => { mealTab = k; SR.render(); }); b.setAttribute('aria-pressed', String(mealTab === k)); seg.appendChild(b); });
      top.dataset.tab = mealTab;
      top.append(go, seg);
      body.prepend(top);
      if (mealTab === 'dinner') return;
      [...body.children].forEach((c) => { if (c !== top) c.remove(); });
      const list = h('div', 'c-mlist');
      /* V11: breakfast and lunch live on the board now, typed the same way as on the meal board */
      const ideas = IDEAS.filter((i) => i.t[mealTab]);
      dates.forEach((d) => {
        const row = h('label', 'c-mline');
        const m = mealAt(d, mealTab);
        const inp = h('input', 'c-find'); inp.value = m ? mealLabel(m) : ''; inp.placeholder = ideas.length ? ideas[M.weekday(d) % ideas.length].name : '';
        inp.addEventListener('change', () => { const v = inp.value.trim(); commitMeals((st) => putMeal(st, d, mealTab, v ? { name: cap(v), parts: partsOf(v), how: 'home', items: pantryIds(st, partsOf(v)) } : null)); snd('detent'); });
        row.append(h('span', 'c-pday', M.DAY_SHORT[M.weekday(d)] + ' ' + M.parts(d).d), inp);
        list.appendChild(row);
      });
      body.appendChild(list);
    }
    /* Next with a to-do typed but not added: say so, never lose it quietly */
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.rack.resetting .rack-right button, .c-steps button');
      if (!b || !SR.view.sel || SR.view.sel.type !== 'newTask') return;
      const inp = document.querySelector('#side input[type="text"], #side input:not([type])');
      if (!inp || !inp.value.trim()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      snd('detent');
      SR.toast('“' + inp.value.trim() + '” isn’t added yet. Add it, or close it to move on.', '', { label: 'Discard it', fn: () => { SR.view.sel = null; SR.render(); } });
    }, true);

    /* == V5: To-dos as stacks on the desk. The pieces come out beside the board; a strip names the stacks == */
    const stackBar = h('nav', 'k k-chip c-stackbar'); stackBar.dataset.edge = 'top'; stackBar.setAttribute('aria-label', 'To-do stacks'); stackBar.hidden = true;
    app.appendChild(stackBar);
    function deskTodos() {
      const b = SR.view.bench;
      if (b && b.tab === 'todo') { SR.view.bench = null; snd('slide'); SR.render(); return; }
      layOut('todo', 'soon');
    }
    function drawStackBar() {
      const b = SR.view.bench, on = !!(b && b.tab === 'todo') && !SR.view.reset && !mat && !dock;
      stackBar.hidden = !on;
      if (!on) return;
      const level = b.level || 'soon';
      /* V11: the first stack is what the To-dos count counts, said the same way */
      const stacks = [['soon', 'Due this week', dueWeek().length]].concat((SR.state.groups || []).map((g) => [g.id, g.name, SR.state.tasks.filter((t) => !t.done && !t.archived && t.group === g.id).length]));
      const kids = stacks.map(([id, name, n]) => {
        const x = Kit.btn('c-stack' + (id === level ? ' on' : ''), name, () => { layOut('todo', id); });
        if (n) x.appendChild(h('span', 'c-sn', capN(n)));
        x.setAttribute('aria-pressed', String(id === level));
        return x;
      });
      kids.push(Kit.btn('c-stack c-stacknew', 'New to-do', () => Kit.add(), 'plus'));
      kids.push(Kit.btn('c-stack c-stackall', 'All to-dos', () => { openTodos(); drawStackBar(); }, 'list'));
      const close = Kit.btn('c-stack c-stackx', '', () => { SR.view.bench = null; snd('slide'); SR.render(); }, 'x'); close.setAttribute('aria-label', 'Put the to-dos away');
      kids.push(close);
      stackBar.replaceChildren(...kids);
    }

    /* == V5: kinds of day, one tap each, under the date in the day view == */
    /* only the two kinds used most in the last eight weeks; none until some have been used */
    function usedKinds() {
      const from = M.addDays(SR.today, -56), n = new Map();
      Object.keys(SR.state.dates).forEach((d) => { const id = SR.state.dates[d].preset; if (d >= from && id && id !== 'empty' && id !== 'usual') n.set(id, (n.get(id) || 0) + 1); });
      const all = (SR.D.PRESETS || []).concat(SR.state.presets || []);
      return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => all.find((p) => p.id === id)).filter(Boolean).slice(0, 2).map((p) => p.name);
    }
    const kindChips = h('div', 'c-kindchips');
    function applyKind(name) {
      const pick = document.querySelector('#kinds .kinds-pick');
      if (!pick) return;
      pick.click();
      setTimeout(() => {
        const btn = [...document.querySelectorAll('#kinds button.kind')].find((x) => x.textContent.trim().startsWith(name));
        if (btn) btn.click();
        else SR.toast(name + ' isn’t a kind for this day. Here are the ones that are.', '');
      }, 60);
    }
    function drawKindChips() {
      const pick = document.querySelector('#kinds .kinds-pick');
      const cur = pick ? pick.textContent.trim() : '';
      /* V11: the kind the day already is is named on the dropdown beside it, so its chip isn't said twice;
         with every kind laid out on the desk, the chips step aside too */
      const v = SR.view, names = usedKinds().filter((n) => !cur.startsWith(n + ' ')), on = !SR.inToday() && v.zoom === 'day' && !v.reset && !v.kindSpread && names.length > 0;
      kindChips.hidden = !on;
      if (!on) return;
      kindChips.replaceChildren(...names.map((n) => {
        const c = Kit.btn('c-kchip' + (cur.startsWith(n) ? ' on' : ''), n, () => applyKind(n));
        c.setAttribute('aria-pressed', String(cur.startsWith(n)));
        return c;
      }));
    }

    /* == V5: at the end of the reset, the week in words to send == */
    function weekWords(ws) {
      const dates = M.range(ws, 7), st = SR.state, me = (SR.who() && SR.who().name) || 'Me', pt = partnerName();
      const lines = [(pt ? 'Our week, ' : 'My week, ') + M.spanText(ws, M.addDays(ws, 6)) + ':'];
      const dn = dates.filter((d) => d >= SR.today && st.dinners[d] && (st.dinners[d].name || st.dinners[d].cook)).map((d) => {
        const x = st.dinners[d], who = x.cook === 'me' ? me : x.cook === 'kim' ? pt : '';
        const easy = { leftovers: 'leftovers', order: 'ordering in', out: 'eating out', skip: 'no dinner' }[x.cook];
        return M.DAY_LONG[M.weekday(d)] + ': ' + (x.name || easy || 'dinner') + (who ? ' (' + who + ' cooks)' : easy && x.name ? ' (' + easy + ')' : '');
      });
      if (dn.length) lines.push('Dinners. ' + dn.join('. ') + '.');
      const c = SR.weekCounts(ws);
      if (c.kim && c.kim.length) lines.push('Together: ' + c.kim.join(', ') + '.');
      const g = SR.M.groceryProgress ? SR.M.groceryProgress(st, dates) : null;
      if (g && g.left) lines.push(g.left + (g.left === 1 ? ' thing' : ' things') + ' on the grocery list.');
      return lines.join('\n');
    }
    function shareBox(body, ws) {
      if (body.querySelector('.c-share')) return;
      const pt = partnerName();
      const b = h('button', 'cta c-share'); b.type = 'button';
      const words = h('span', 'grow'); words.append(h('b', '', pt ? 'Send the week to ' + pt : 'Share the week'), h('small', '', 'Dinners, time together, and groceries, in a few lines'));
      b.append(SR.icon('heart', 10, '#F2CF7A'), words);
      b.addEventListener('click', async () => {
        const text = weekWords(ws);
        try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
        try { await navigator.clipboard.writeText(text); SR.toast('Copied. Paste it ' + (pt ? 'to ' + pt : 'anywhere') + '.', 'good'); }
        catch (e) { SR.toast('Couldn’t copy here. Try again from the plan.', ''); }
      });
      body.prepend(b);
    }

    /* == V7: the letter rack. A wooden rack up top, letter tiles on the desk, a bag beside it.
       Drag letters onto the rack to spell a word; it stays there. The first visit spells your name with it. == */
    const SLOTS = 9;
    const POINTS = {}; /* V10: letters carry no points; they're blocks, not game tiles */
    const BAG = 'AEIOUAEIORSTLNMDHCBGPYWK'; /* a plain mix of common letters for the extras */
    let rack = (() => { try { const r = JSON.parse(localStorage.getItem('sundayreset.v7.rack') || 'null'); return Array.isArray(r) && r.length === SLOTS ? r : Array(SLOTS).fill(null); } catch (e) { return Array(SLOTS).fill(null); } })();
    /* a preview never touches the real rack: it's kept aside and comes back with Back to my board */
    let realRack = null;
    const saveRack = () => { if (SR.view.preview) return; try { localStorage.setItem('sundayreset.v7.rack', JSON.stringify(rack)); } catch (e) { /* fine */ } };
    let rackShown = false; /* V10: the rack is part of the setup on the desk, never over the calendar */
    const rackWrap = h('div', 'k c-lrack'); rackWrap.dataset.edge = 'top'; rackWrap.hidden = true;
    const bagBtn = h('button', 'c-bag'); bagBtn.type = 'button'; bagBtn.setAttribute('aria-label', 'The bag of letters'); bagBtn.title = 'The bag of letters';
    bagBtn.append(h('span', 'c-bagtie'), h('span', 'c-bagword', 'Letters'));
    const bar = h('div', 'c-lbar');
    const slots = Array.from({ length: SLOTS }, (_, i) => { const s = h('div', 'c-lslot'); s.dataset.slot = String(i); bar.appendChild(s); return s; });
    const hideRack = Kit.btn('c-lx', '', () => { rackShown = false; try { localStorage.setItem('sundayreset.v7.rackShown', '0'); } catch (e) { /* fine */ } putBack(); drawRack(); requestAnimationFrame(() => SR.layoutInsets()); }, 'x');
    hideRack.setAttribute('aria-label', 'Put the rack away');
    rackWrap.append(bagBtn, bar, hideRack);
    const deskLayer = h('div', 'c-desktiles');
    app.append(rackWrap, deskLayer);
    let deskTiles = [];
    function tileEl(ch) {
      const t = h('div', 'c-ltile');
      t.dataset.ch = ch;
      t.append(h('b', '', ch), h('small', '', String(POINTS[ch] || 0)));
      t.setAttribute('aria-label', 'Letter ' + ch + '. Tap to put it on the rack');
      t.tabIndex = 0;
      t.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); t.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 })); window.dispatchEvent(new PointerEvent('pointerup', { clientX: 0, clientY: 0 })); });
      dragTile(t);
      return t;
    }
    const narrow = () => window.innerWidth < 760;
    function drawRack() {
      const phone = !!(SR.view.phone || SR.phoneDay());
      const v = SR.view, ag = document.getElementById('agenda');
      const busy = !!(v.reset || mat || detail || SR.inToday() || phone);
      /* the rack sits under the date, so it shows only while nothing else wants the top middle: not in the
         day (the date card holds the kind of day and the week there), not beside the to-do stacks, Settings, or the list */
      const crowded = v.zoom === 'day' || !stackBar.hidden || !!v.drawer || !!(ag && !ag.hidden) || !!dock || !!Kit.openSheetEl;
      /* the welcome plays anywhere, a phone included; the rack itself is a desk toy for wide screens */
      const on = !!hello || (rackShown && !busy && !crowded && !narrow());
      rackWrap.hidden = !on;
      if (on) deskSurfaces();
      deskLayer.hidden = !hello && busy;
      document.body.classList.toggle('c-hello-on', !!hello);
      helloDim.hidden = !hello;
      document.body.classList.toggle('c-narrow', narrow());
      slots.forEach((s, i) => {
        const want = rack[i];
        const have = s.firstChild && s.firstChild.dataset.ch;
        if (want !== (have || null)) { s.replaceChildren(); if (want) s.appendChild(tileEl(want)); }
        const st0 = nameStart();
        s.classList.toggle('want', !!(hello && hello.name && i >= st0 && i < st0 + hello.name.length));
      });
    }
    /* letters land on the desk around the rack, a little turned, never in a pile */
    function scatter(letters) {
      const r = rackWrap.getBoundingClientRect(), W = window.innerWidth;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const tile = parseFloat(getComputedStyle(document.body).getPropertyValue('--slot')) || 48;
      /* on a narrow screen the letters land between the rack and the card, across the whole width */
      const cardTop = !helloCard.hidden ? helloCard.getBoundingClientRect().top : window.innerHeight * 0.7;
      /* letters land in a tidy row under the rack, centered on the page, each a little turned, never in a pile */
      const gap = narrow() ? 8 : 14, step = tile + gap, per = Math.max(1, Math.floor((W - 32 + gap) / step));
      const rows = Math.ceil(letters.length / per);
      const top0 = narrow() ? Math.max(r.bottom + 24, (r.bottom + cardTop) / 2 - (rows * (tile + 14)) / 2) : r.bottom + 26;
      letters.forEach((ch, i) => {
        const t = tileEl(ch);
        const row = Math.floor(i / per), inRow = Math.min(per, letters.length - row * per), col = i - row * per;
        const x = W / 2 - (inRow * step - gap) / 2 + col * step + rnd(-3, 3);
        const y = top0 + row * (tile + 14) + rnd(-4, 4);
        putAt(t, x, y, rnd(-7, 7));
        deskLayer.appendChild(t);
        deskTiles.push(t);
        t.classList.add('c-drop');
        t.style.animationDelay = (i * 45) + 'ms';
      });
      snd('clack', 0.6);
    }
    /* a name sits in the middle of the rack, the way you'd set a word down */
    const nameStart = () => (hello && hello.name ? Math.floor((SLOTS - hello.name.length) / 2) : 0);
    /* the slot a tapped letter goes to: the next one the welcome still wants it for, or the first open one */
    function nextSlot(ch) {
      if (hello && hello.name) { const o = nameStart(); const i = hello.name.split('').findIndex((c, j) => c === ch && rack[o + j] !== c); if (i >= 0) return o + i; }
      const i = rack.findIndex((x) => !x); return i < 0 ? null : i;
    }
    function putAt(t, x, y, rot) { t.style.left = x + 'px'; t.style.top = y + 'px'; t.style.setProperty('--r', (rot || 0) + 'deg'); }
    function putBack() {
      deskTiles.forEach((t) => { t.classList.add('c-gone'); setTimeout(() => t.remove(), 220); });
      deskTiles = [];
    }
    function dragTile(t) {
      t.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault(); SR.Snd.init();
        const r = t.getBoundingClientRect();
        const ox = e.clientX - r.left, oy = e.clientY - r.top;
        const fromSlot = t.parentElement && t.parentElement.dataset.slot != null ? +t.parentElement.dataset.slot : null;
        if (fromSlot != null) { rack[fromSlot] = null; saveRack(); deskLayer.appendChild(t); deskTiles.push(t); }
        putAt(t, r.left, r.top, 0);
        t.classList.add('c-up'); snd('pick');
        let over = null, moved = false;
        const sx = e.clientX, sy = e.clientY;
        const move = (ev) => {
          if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
          moved = true;
          putAt(t, ev.clientX - ox, ev.clientY - oy, 0);
          t.style.visibility = 'hidden';
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          t.style.visibility = '';
          const s = under && under.closest('.c-lslot');
          if (s !== over) { if (over) over.classList.remove('c-over'); over = s; if (over) { over.classList.add('c-over'); snd('detent'); } }
        };
        const up = (ev) => {
          window.removeEventListener('pointermove', move);
          t.classList.remove('c-up');
          if (!moved && fromSlot == null) { const open = nextSlot(t.dataset.ch); if (open != null) over = slots[open]; }
          if (!moved && fromSlot != null) { putAt(t, r.left, r.top + 64, (Math.random() - 0.5) * 18); snd('detent'); return; }
          if (over) {
            over.classList.remove('c-over');
            const i = +over.dataset.slot;
            const was = rack[i];
            rack[i] = t.dataset.ch; saveRack();
            deskTiles = deskTiles.filter((x) => x !== t); t.remove();
            /* a letter already there goes back to the desk where this one came from */
            if (was) { const back = tileEl(was); putAt(back, r.left, r.top + 50, (Math.random() - 0.5) * 20); deskLayer.appendChild(back); deskTiles.push(back); }
            drawRack();
            const landed = slots[i].firstChild; if (landed) landed.classList.add('c-land');
            snd('clack', 0.85);
            if (hello) checkName();
          } else { putAt(t, ev.clientX - ox, ev.clientY - oy, (Math.random() - 0.5) * 18); snd('detent'); }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up, { once: true });
      });
    }
    /* the bag: spell a word, or deal seven, or put the letters back */
    let bagPop = null;
    bagBtn.addEventListener('click', (e) => {
      e.stopPropagation(); SR.Snd.init();
      if (bagPop) { bagPop.remove(); bagPop = null; return; }
      bagPop = h('div', 'k c-bagpop');
      const f = h('form', 'c-bagform');
      const inp = h('input', 'c-find'); inp.placeholder = 'Spell a word'; inp.maxLength = SLOTS; inp.setAttribute('aria-label', 'A word to spell');
      f.append(inp, Kit.btn('c-go', 'Deal', () => f.requestSubmit()));
      f.addEventListener('submit', (ev) => { ev.preventDefault(); const w = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, SLOTS); if (!w) return; bagPop.remove(); bagPop = null; scatter(shuffle(w.split('').concat(dealLetters(2)))); });
      bagPop.append(f,
        Kit.btn('c-mi', 'Seven letters from the bag', () => { bagPop.remove(); bagPop = null; scatter(dealLetters(7)); }),
        Kit.btn('c-mi', 'Put the desk letters back', () => { bagPop.remove(); bagPop = null; putBack(); }),
        Kit.btn('c-mi', 'Clear the rack', () => { bagPop.remove(); bagPop = null; rack = Array(SLOTS).fill(null); saveRack(); drawRack(); }));
      app.appendChild(bagPop);
      const r = bagBtn.getBoundingClientRect(); bagPop.style.left = r.left + 'px'; bagPop.style.top = (r.bottom + 10) + 'px';
      setTimeout(() => inp.focus(), 20);
    });
    document.addEventListener('pointerdown', (e) => { if (bagPop && !bagPop.contains(e.target) && !bagBtn.contains(e.target)) { bagPop.remove(); bagPop = null; } }, true);
    const dealLetters = (n) => Array.from({ length: n }, () => BAG[Math.floor(Math.random() * BAG.length)]);
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function showRack() { rackShown = true; try { localStorage.setItem('sundayreset.v7.rackShown', '1'); } catch (e) { /* fine */ } drawRack(); requestAnimationFrame(() => SR.layoutInsets()); }

    /* == V7: the first visit. Your name, typed, then dragged onto the rack: the same move as every block == */
    let hello = null;
    const helloCard = h('section', 'k c-hello'); helloCard.hidden = true; helloCard.setAttribute('aria-live', 'polite');
    /* behind the welcome, the desk and its corners step back */
    const helloDim = h('div', 'c-hellodim'); helloDim.hidden = true;
    app.append(helloDim, helloCard);
    function startHello(preview) {
      if (preview) {
        if (!realRack) realRack = rack.slice();
        /* Settings steps aside so the card shows */
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }
      hello = { name: '', preview: !!preview };
      rack = Array(SLOTS).fill(null); saveRack(); putBack();
      helloCard.hidden = false;
      helloCard.replaceChildren();
      const f = h('form', 'c-hform');
      const inp = h('input', 'c-find c-hname'); inp.placeholder = 'Your first name'; inp.maxLength = SLOTS; inp.autocomplete = 'given-name'; inp.setAttribute('aria-label', 'Your first name');
      f.append(inp, Kit.btn('c-go', 'Next', () => f.requestSubmit()));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = inp.value.trim(), w = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, SLOTS);
        if (!raw) { inp.focus(); return; }
        if (!w) { hello.raw = raw; endHello(false); SR.toast('Nice to meet you, ' + raw + '.', 'good'); return; }
        hello.name = w; hello.raw = raw.charAt(0).toUpperCase() + raw.slice(1);
        drawRack();
        requestAnimationFrame(() => { SR.layoutInsets(); scatter(shuffle(w.split('').concat(dealLetters(3)))); });
        helloCard.replaceChildren(h('div', 'c-kick', 'Welcome'), h('h2', '', 'Drag your name onto the rack.'), h('p', '', 'Drag a letter into a slot, or tap it. Blocks in Sunday Reset move the same way.'), Kit.btn('c-skip', 'Skip this', () => endHello(true)));
      });
      helloCard.append(h('div', 'c-kick', 'Welcome to Sunday Reset'), h('h2', '', 'What should we call you?'), f);
      drawRack();
      requestAnimationFrame(() => SR.layoutInsets());
      setTimeout(() => inp.focus(), 60);
    }
    function checkName() {
      if (!hello || !hello.name) return;
      const o = nameStart(), word = rack.slice(o, o + hello.name.length).join('');
      if (word !== hello.name) return;
      snd('chime');
      slots.slice(o, o + hello.name.length).forEach((s, i) => { const t = s.firstChild; if (t) { t.classList.remove('c-land'); t.style.animationDelay = (i * 70) + 'ms'; t.classList.add('c-hop'); } });
      const acts = h('div', 'c-hacts');
      acts.append(Kit.btn('c-go', 'Set up my week', () => { const nm = hello.raw; endHello(false); if (SR.openSetup && !SR.view.preview) SR.openSetup(nm); }), Kit.btn('c-ghost', 'Look around first', () => endHello(false)));
      helloCard.replaceChildren(h('div', 'c-kick', 'Nice to meet you, ' + hello.raw), h('h2', '', 'That’s how every block moves.'), h('p', '', 'Behind this is a sample week to practice on. Set up your own now, or later from your name, top left.'), acts);
    }
    function endHello(skipped) {
      const hh = hello; hello = null;
      helloCard.hidden = true;
      deskTiles.filter((t) => true).forEach((t) => { t.classList.add('c-gone'); setTimeout(() => t.remove(), 220); });
      deskTiles = [];
      try { localStorage.setItem('sundayreset.v7.met', '1'); } catch (e) { /* fine */ }
      if (!skipped && hh && hh.raw && !hh.preview) keep('sundayreset.v8.name', hh.raw);
      if (!skipped && hh && hh.raw) { SR.commit(() => { SR.state.profile = Object.assign({}, SR.state.profile, { name: hh.raw }); }); rackShown = true; try { localStorage.setItem('sundayreset.v7.rackShown', '1'); } catch (e) { /* fine */ } }
      if (skipped) { rack = Array(SLOTS).fill(null); saveRack(); }
      drawRack(); SR.render();
      requestAnimationFrame(() => SR.layoutInsets());
    }
    /* a first visit gets the name moment; Dev's Brand new scenario plays it again in a preview */
    let helloPreview = null, wasPreview = false, trying = null;
    /* Dev's way to try either setup as someone new: a Brand new board, then the setup asked for */
    function trySetup(kind) { trying = kind; helloPreview = null; if (SR.view.preview && SR.view.preview.id === 'firstrun') { maybeHello(); return; } SR.devBoard('firstrun'); }
    function maybeHello() {
      const pv = SR.view.preview;
      if (pv && pv.id === 'firstrun' && helloPreview !== pv) { helloPreview = pv; const k = trying || 'first'; trying = null; if (k === 'card') SR.openSetup(); else if (k === 'first') openSetupIntro({ preview: true }); else openDeskSetup({ preview: true }); return; }
      if (!pv && su && su.preview && !su.built) closeMat();
      if (!pv) { helloPreview = null; if (realRack) { rack = realRack; realRack = null; putBack(); drawRack(); } }
      if (wasPreview && !pv) {
        const reload = (obj, k) => { Object.keys(obj).forEach((x) => delete obj[x]); Object.assign(obj, stored(k, {})); };
        reload(meals, 'sundayreset.v7.meals'); reload(routines, 'sundayreset.v7.routines'); reload(planned, 'sundayreset.v7.planned');
        snooze = stored('sundayreset.v7.snooze', null);
      }
      wasPreview = !!pv;
      if (hello && hello.preview && !pv) { hello = null; helloCard.hidden = true; putBack(); }
      let met = true; try { met = localStorage.getItem('sundayreset.v7.met') === '1'; } catch (e) { /* fine */ }
      /* V11: a first visit opens the way the Sunday Reset does: one page that says what's ahead, then the
         setup a step at a time (Russell, Oct 14: the desk of questions and letters was too busy to start on) */
      let met11 = true; try { met11 = localStorage.getItem('sundayreset.v11.met') === '1'; } catch (e) { /* fine */ }
      if (!met11 && !su && !pv && !devStored() && SR.who() && SR.who().sample && !Kit.openSheetEl && document.getElementById('sheet').hidden) { try { localStorage.setItem('sundayreset.v11.met', '1'); } catch (e) { /* fine */ } openSetupIntro(); }
    }
    /* == V11: the setup's first page, in the reset's own shape ==
       What's ahead in four short parts, about how long, and one button. Start opens the setup itself, a
       question at a time, where the last one on this device was left. */
    const SETUP_PARTS = [
      { cat: 'yours', name: 'About you', line: 'Your name, who’s at home, and what gets in the way', min: 2 },
      { cat: 'work', name: 'Your week', line: 'When your days start and end, and when you work', min: 1 },
      { cat: 'us', name: 'Try it', line: 'Move a block, and look further ahead', min: 1 },
      { cat: 'meals', name: 'Your plan', line: 'When your Sunday Reset happens', min: 1 }
    ];
    function openSetupIntro(opts) {
      opts = opts || {};
      closeMenu();
      const sample = !!(SR.who() && SR.who().sample) || opts.preview;
      Kit.sheet('Set up your week', (card) => {
        const wrap = h('div', 'c-intro-in');
        const left = h('div', 'c-intro-l');
        left.append(h('div', 'c-kick', (opts.preview ? 'Tried as someone new · ' : '') + 'About 5 min'));
        left.appendChild(h('h2', 'c-intro-h', 'Set up your week.'));
        left.appendChild(h('p', 'c-intro-p', 'A few questions, one at a time. Stop any time; your answers wait.'));
        if (sample) {
          const note = h('div', 'c-intro-note');
          note.append(h('div', 'c-kick gold', 'Behind this'), h('p', '', 'A made up family’s week. Yours replaces it when you finish.'));
          left.appendChild(note);
        }
        const acts = h('div', 'c-intro-acts');
        acts.append(Kit.btn('c-go', 'Start', () => { Kit.closeSheet(); SR.openSetup(); }), Kit.btn('c-ghost', 'Look around first', () => Kit.closeSheet()));
        left.appendChild(acts);
        const right = h('div', 'c-intro-r');
        right.appendChild(h('div', 'c-kick', 'Four parts'));
        const list = h('ol', 'c-steplist');
        SETUP_PARTS.forEach((pt, i) => {
          const li = h('li');
          const c = SR.cat(pt.cat) || {};
          const num = h('span', 'c-snum', String(i + 1)); num.style.background = c.base; num.style.color = c.ink || '#FFFFFF';
          const words = h('span', 'c-sname'); words.append(h('b', '', pt.name), h('small', '', pt.line));
          li.append(num, words, h('span', 'c-smin', pt.min + ' min'));
          list.appendChild(li);
        });
        right.appendChild(list);
        wrap.append(left, right);
        card.appendChild(wrap);
      }, 'c-intro c-setintro');
    }

    /* == V7: Dev mode, always there on this link, for seeing the board as other people would ==
       A made up board stays open across reloads until you go back to yours (Brand new plays once). The big
       preview bar gives way to a small chip beside your name. */
    try { localStorage.setItem('sundayreset.dev', '1'); } catch (e) { /* fine */ }
    const DEV_BOARD = 'sundayreset.v7.devBoard';
    const devStored = () => { try { return localStorage.getItem(DEV_BOARD) || ''; } catch (e) { return ''; } };
    let devBooted = false, devWas = null;
    function devKeep() {
      const pv = SR.view.preview, id = pv && pv.id;
      if (!devBooted) {
        devBooted = true;
        const want = devStored();
        if (want && !pv && SR.devBoard) { SR.devBoard(want); return; }
      }
      /* only a Dev board can come back on a reload; a setup tried as someone new (its preview is 'setup') can't be rebuilt, so it isn't kept */
      if (id && id !== 'firstrun' && id !== 'setup') { try { localStorage.setItem(DEV_BOARD, id); } catch (e) { /* fine */ } }
      /* going back to your own board, from anywhere, ends it */
      if (devWas && !pv) { try { localStorage.removeItem(DEV_BOARD); } catch (e) { /* fine */ } }
      devWas = pv || null;
      drawDevChip();
    }
    const devChip = h('button', 'k-chip c-devchip'); devChip.type = 'button'; devChip.hidden = true;
    devChip.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); toggleDevMenu(); });
    tl.appendChild(devChip);
    let devMenu = null;
    function drawDevChip() {
      const pv = SR.view.preview;
      devChip.hidden = !pv;
      document.body.classList.toggle('c-dev-on', !!pv);
      if (!pv) { if (devMenu) { devMenu.remove(); devMenu = null; } return; }
      const name = (pv.label || '').replace(/, a made up board$/, '');
      devChip.replaceChildren(h('i', 'c-devdot'), h('b', '', 'Dev'), h('span', 'c-devname', name), SR.icon('down', 7, '#B8B0A3'));
      devChip.title = name + ' is a made up board. Nothing here is saved.';
      devChip.setAttribute('aria-label', 'Dev: ' + name + '. Switch boards, or back to my board');
      devChipHome();
    }
    /* V11: on the phone's list the Dev chip rides in the list's own top line, beside the clock, so it never
       sits on the day (it covered the times down the left) */
    const tview = document.getElementById('todayview');
    function devChipHome() {
      const top = SR.view.phone && !SR.phoneDay() && !devChip.hidden && tview ? tview.querySelector('.td-top') : null;
      if (top && devChip.parentElement !== top) top.insertBefore(devChip, top.lastChild);
      else if (!top && devChip.parentElement !== tl) tl.appendChild(devChip);
      devChip.classList.toggle('c-devchip-list', !!top);
    }
    if (tview) new MutationObserver(() => { if (!devChip.hidden) devChipHome(); }).observe(tview, { childList: true, subtree: true });
    function toggleDevMenu() {
      if (devMenu) { devMenu.remove(); devMenu = null; return; }
      const pv = SR.view.preview; if (!pv) return;
      devMenu = h('div', 'k c-menu c-devmenu'); devMenu.setAttribute('role', 'menu');
      devMenu.appendChild(h('div', 'c-devnote', (pv.label || 'A made up board') + '. Nothing here is saved, and it stays open until you go back.'));
      const it = (label, ic, fn) => { const b = Kit.btn('c-mi', label, () => { devMenu.remove(); devMenu = null; fn(); }, ic, CREAM); b.setAttribute('role', 'menuitem'); return b; };
      devMenu.append(it('Switch boards', 'sliders', () => Kit.settings('dev')), it('Back to my board', 'left', () => { try { localStorage.removeItem(DEV_BOARD); } catch (e) { /* fine */ } SR.endPreview(); }));
      app.appendChild(devMenu);
      const r = devChip.getBoundingClientRect(); devMenu.style.left = r.left + 'px'; devMenu.style.top = (r.bottom + 10) + 'px';
      /* V11: from the phone list's top line it opens down from the chip, inside the screen */
      if (devChip.classList.contains('c-devchip-list')) { devMenu.classList.add('c-devmenu-down'); devMenu.style.setProperty('--c-dm-top', Math.round(r.bottom + 8) + 'px'); devMenu.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - 298, r.right - 290))) + 'px'; }
    }
    document.addEventListener('pointerdown', (e) => { if (devMenu && !devMenu.contains(e.target) && !devChip.contains(e.target)) { devMenu.remove(); devMenu = null; } }, true);
    /* V11: trying the setup as someone new is a Dev tool, so it sits on Dev's page in Settings, not in the
       account menu everyone opens */
    window.SR_devExtras = (x) => {
      const sec = x.section('Try the setup', 'As someone new, with nothing saved: the first visit as it opens, or the setup on the desk, answered with blocks.');
      x.row(sec, [x.button('As a first visit sees it', () => trySetup('first')), x.button('On the desk, with blocks', () => trySetup('desk'))]);
    };

    /* == V10: the setup on the desk. The questions lined up on a board, answered with blocks ==
       A mat to the left of the calendar: the board holds one row per question, the pieces in your hand sit
       beside it, and the week those answers make draws itself under them as you go. Drag a piece into its
       row, or tap it. Build my week slides the camera right, onto the week it built. The answers are the
       card setup's own (SR.applySetup builds them the same way), so either way of setting up gives the
       same week. */
    const DESK = 'sundayreset.v10.desk';
    const OBX = window.Onboard;
    const SLATE = { base: '#4A4F57', ink: '#FFFFFF' }, GOLDEN = { base: '#EFB940', ink: '#3A2A0A' };
    const cc = (k) => { const c = SR.cat(k) || {}; return { base: c.base || '#5B4632', ink: c.ink || '#FFFFFF' }; };
    const partnered = (a) => a.home === 'partner' || a.home === 'family';
    let su = null;
    const ROWS = [
      { id: 'name', label: 'Your name', q: 'What should we call you?', line: 'Type it, then put your letters on the rack. Drag them, or tap them.' },
      { id: 'home', label: 'At home', q: 'Who’s at home?', line: 'Drag the one that fits into its row, or tap it.' },
      { id: 'people', label: 'Who', q: 'Who are they?', line: 'Tap a person, type their name, and press Enter. Names are optional.', when: (a) => partnered(a) },
      { id: 'pains', label: 'In the way', q: 'What gets in the way of your week?', line: 'Pick any that fit. Drag them in, or tap them.' },
      { id: 'help', label: 'Help with', q: 'What should it help with?', line: 'Some are in already, from what you said. Drag one out, or tap its x, to leave it off.' },
      { id: 'days', label: 'Your days', q: 'When do your days start and end?', line: 'Drag the inside edge of each sleep block, the way you stretch any block.' },
      { id: 'work', label: 'Work', q: 'When do you work?', line: 'Slide the work block, or drag its edges. Tap the days you work.' },
      { id: 'kids', label: 'Drop off', q: 'Drop off and pick up', line: 'Slide each one to its time. They lock on the board, so nothing pushes them.', when: (a) => a.home === 'family' && a.kids.length > 0 },
      { id: 'soon', label: 'Coming up', q: 'Anything coming up?', line: 'A trip, a birthday, a deadline. It goes on your year, so you see it coming.', optional: true },
      { id: 'calendar', label: 'Calendar', q: 'Bring in a calendar?', line: 'Shifts, school dates, appointments, from a file ending in .ics.', optional: true },
      { id: 'reset', label: 'Sunday Reset', q: 'When will you plan your week?', line: 'About 15 minutes, once a week, at a time that’s usually quiet.' }
    ];
    const rowsFor = (a) => ROWS.filter((r) => !r.when || r.when(a));
    const saveDesk = () => { if (!su || su.preview) return; keep(DESK, { a: su.a, at: su.at, far: su.far }); };

    /* a block in the hand or on the board: a mark, a name, and a line under it */
    function suBlock(name, sub, c, icon, cls) {
      const b = h('div', 'c-dblock c-su-b ' + (cls || ''));
      b.style.setProperty('--b', c.base); b.style.setProperty('--i', c.ink);
      const top = h('span', 'c-su-bt');
      if (icon) top.appendChild(SR.icon(icon, 9, c.ink));
      top.appendChild(h('b', '', name));
      b.appendChild(top);
      if (sub) b.appendChild(h('small', '', sub));
      return b;
    }
    /* a piece in the hand: drag it into the row, or tap it */
    function handPiece(name, sub, c, icon, payload, place) {
      const b = suBlock(name, sub, c, icon, 'c-su-piece');
      b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', name + (sub ? ', ' + sub : '') + '. Drag it into the row, or press to put it there');
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(payload); } });
      draggable(b, payload, { accept: (z) => z.dataset.zone === 'su-' + su.at, onDrop: (z, p) => place(p), onTap: (p) => place(p) });
      return b;
    }
    /* a block placed in a row: drag it out, or tap its x, to take it off */
    function placedBlock(name, sub, c, icon, off, cls) {
      const b = suBlock(name, sub, c, icon, 'c-su-placed ' + (cls || ''));
      if (off) {
        const x = Kit.btn('c-su-bx c-nodrag', '', (e) => { e.stopPropagation(); off(); }, 'x', c.ink);
        x.setAttribute('aria-label', 'Take ' + name + ' off');
        b.appendChild(x);
        draggable(b, { name }, { accept: () => false, onDrop: () => {}, onOut: () => off(), onTap: () => {} });
      }
      return b;
    }

    function openDeskSetup(opts) {
      opts = opts || {};
      const preview = !!(opts.preview || SR.view.preview);
      const draft = preview ? null : stored(DESK, null);
      const a = Object.assign(SR.blankAnswers(), draft && draft.a);
      if (opts.name && !a.name) a.name = opts.name;
      su = { a, at: (draft && draft.at) || 'name', far: (draft && draft.far) || 0, why: false, ics: null, preview, built: false, rack: Array(SLOTS).fill(null), tray: [], word: '', editing: null, timers: [] };
      if (a.name) spellIn(a.name, true);
      if (!rowsFor(a).some((r) => r.id === su.at)) su.at = 'name';
      document.body.classList.add('c-su-on');
      openMat('c-setup', (inner) => buildSetup(inner), () => {
        su.timers.forEach(clearTimeout);
        const done = su.built;
        su = null;
        document.body.classList.remove('c-su-on');
        if (!done) SR.toast('Your answers are kept. Set up my own week, under your name, picks up here.', '');
        SR.render();
      }, -1);
    }
    function buildSetup(inner) {
      inner.classList.add('c-su');
      const head = h('div', 'c-su-head');
      const words = h('div');
      const kick = h('div', 'c-kick', su.preview ? 'Set up your week · a preview, nothing is saved' : 'Set up your week');
      const count = h('h2', 'c-su-h');
      words.append(kick, count);
      const x = Kit.btn('c-su-x', 'Close', () => closeMat(), 'x', CREAM);
      x.title = 'Close the setup. Your answers are kept.';
      head.append(words, x);
      const main = h('div', 'c-su-main');
      const board = h('div', 'c-woodboard c-su-board');
      const side = h('div', 'c-su-side');
      main.append(board, side);
      inner.append(head, main);
      su.els = { count, board, side };
      drawSetup();
    }
    function drawSetup() {
      if (!su || !su.els) return;
      const rows = rowsFor(su.a), i = Math.max(0, rows.findIndex((r) => r.id === su.at));
      su.far = Math.max(su.far, i);
      su.els.count.textContent = 'Question ' + (i + 1) + ' of ' + rows.length;
      drawBoard(rows, i);
      drawSide(rows, i);
      saveDesk();
    }
    function drawBoard(rows, at) {
      const board = su.els.board, keepTop = board.scrollTop;
      board.replaceChildren();
      rows.forEach((r, i) => {
        const row = h('div', 'c-su-row ' + (i === at ? 'on' : i < at ? 'done' : i <= su.far ? 'seen' : 'later'));
        row.dataset.row = r.id;
        const lab = h('button', 'c-su-label'); lab.type = 'button';
        lab.append(h('span', 'c-su-n', String(i + 1)), h('b', '', r.label));
        lab.disabled = i > su.far;
        lab.title = i <= su.far ? 'Go to ' + r.label.toLowerCase() : 'Comes later';
        lab.addEventListener('click', () => { if (i <= su.far && i !== at) go(r.id); });
        const slot = h('div', 'c-groove c-su-slot');
        slot.dataset.zone = 'su-' + r.id;
        /* a row you haven't reached yet is an empty groove with its question in it: the questions lined up, nothing answered for you */
        if (i > su.far) slot.appendChild(h('span', 'c-su-hint', r.q));
        else { try { SLOT[r.id](slot, su.a, i === at); } catch (e) { console.error(e); } }
        row.append(lab, slot);
        board.appendChild(row);
      });
      board.scrollTop = keepTop;
      const on = board.querySelector('.c-su-row.on');
      if (on) requestAnimationFrame(() => on.scrollIntoView({ block: 'nearest', behavior: SR.view.calm ? 'auto' : 'smooth' }));
    }
    function drawSide(rows, at) {
      const side = su.els.side, r = rows[at];
      side.replaceChildren();
      const q = h('div', 'c-su-q');
      q.append(h('h3', '', su.why && r.id === 'pains' ? (su.a.name ? 'Here’s what changes, ' + su.a.name + '.' : 'Here’s what changes.') : r.q), h('p', '', su.why && r.id === 'pains' ? 'Your words, turned over. And why it works.' : r.line));
      const hand = h('div', 'c-su-hand');
      try { HAND[r.id](hand, su.a); } catch (e) { console.error(e); }
      const acts = h('div', 'c-su-acts');
      if (at > 0 || (r.id === 'pains' && su.why)) acts.appendChild(Kit.btn('c-su-back', 'Back', () => { if (r.id === 'pains' && su.why) { su.why = false; drawSetup(); } else go(rows[at - 1].id); }, 'left', CREAM));
      const last = at === rows.length - 1;
      const empty = r.optional && !filled(r.id);
      const next = Kit.btn('c-go c-su-next' + (last ? ' build' : ''), last ? 'Build my week' : empty ? 'Skip' : 'Next', () => nextRow(rows, at));
      next.disabled = !ready(r.id);
      acts.appendChild(next);
      const week = h('div', 'c-su-week');
      week.appendChild(h('div', 'c-kick', 'Your week so far'));
      try {
        const rows = SR.setupWeekRows(SR.setupWeek(su.a), null, true);
        const us = su.a.partner.trim() ? 'You and ' + su.a.partner.trim() : 'Time together';
        rows.querySelectorAll('.onb-key span').forEach((sp) => { const t = sp.lastChild; if (t && t.nodeType === 3 && /^You and /.test(t.nodeValue)) t.nodeValue = us; });
        week.appendChild(rows);
      } catch (e) { console.error(e); }
      side.append(q, hand, acts, week);
    }
    function go(id) { su.at = id; su.why = false; su.editing = null; snd('slide'); drawSetup(); }
    function nextRow(rows, at) {
      const r = rows[at];
      if (r.id === 'pains' && su.a.pains.length && !su.why) { su.why = true; su.whySeen = true; snd('chime'); drawSetup(); return; }
      if (r.id === 'name' && !su.a.name) return;
      if (at === rows.length - 1) { buildWeek(); return; }
      go(rows[at + 1].id);
    }
    const filled = (id) => {
      const a = su.a;
      if (id === 'soon') return !!(a.soon && a.soon.name);
      if (id === 'calendar') return !!su.ics;
      return true;
    };
    const ready = (id) => (id === 'name' ? !!su.a.name && (!su.word || spelled()) : true);
    function refresh() { drawSetup(); }

    /* == the rows: what each groove holds ==*/
    const SLOT = {
      name(slot, a, on) {
        slot.classList.add('c-su-rackslot');
        if (a.name && !su.word) { slot.appendChild(placedBlock(a.name, '', GOLDEN, 'person')); return; }
        const bar = h('div', 'c-su-rack');
        const o = nameStart();
        for (let i = 0; i < SLOTS; i++) {
          const s = h('div', 'c-lslot'); s.dataset.zone = 'su-slot'; s.dataset.i = String(i);
          if (su.word && i >= o && i < o + su.word.length) s.classList.add('want');
          if (su.rack[i]) s.appendChild(letterTile(su.rack[i], { slot: i }));
          bar.appendChild(s);
        }
        slot.appendChild(bar);
        if (spelled() && !on) slot.classList.add('spelled');
      },
      home(slot, a) {
        const x = HOMES.find((y) => y.id === a.home);
        if (x) slot.appendChild(placedBlock(x.name, x.line, cc(x.cat), x.icon));
      },
      people(slot, a) {
        if (a.home !== 'shared' && partnered(a)) {
          if (a.partner || su.editing === 'partner') slot.appendChild(personBlock('partner', a.partner, cc('us'), 'heart'));
        }
        if (a.home === 'family') a.kids.forEach((k, i) => slot.appendChild(personBlock(i, k, cc('family'), 'person')));
        if (su.editing === 'kid-new') slot.appendChild(personBlock('new', '', cc('family'), 'person'));
        if (!slot.children.length) slot.appendChild(h('span', 'c-su-hint', 'Tap Partner or Kid on the right'));
      },
      pains(slot, a) {
        const list = OBX.painsFor(a.home).filter((p) => a.pains.includes(p.id));
        const over = su.why || (su.whySeen && su.at !== 'pains');
        list.forEach((p, k) => {
          const b = placedBlock(over ? p.after : p.name, over ? p.before + ', before' : '', over ? GOLDEN : SLATE, p.icon, over ? null : () => { a.pains = a.pains.filter((x) => x !== p.id); refresh(); }, su.why ? 'c-flip' : '');
          if (su.why) b.style.animationDelay = (k * 160) + 'ms';
          slot.appendChild(b);
        });
        if (a.painOther && a.painOther.trim()) slot.appendChild(placedBlock(a.painOther.trim(), over ? 'In To-dos, for your first reset' : 'In your words', over ? GOLDEN : SLATE, 'note2', over ? null : () => { a.painOther = ''; refresh(); }, su.why ? 'c-flip' : ''));
        if (!slot.children.length) slot.appendChild(h('span', 'c-su-hint', 'None yet. Pick any that fit, or none'));
      },
      help(slot, a) {
        helpItems(a).filter((x) => x.on()).forEach((x) => slot.appendChild(placedBlock(x.name, '', x.c, x.icon, () => { x.set(false); refresh(); })));
        if (!slot.children.length) slot.appendChild(h('span', 'c-su-hint', 'Nothing yet. To-dos, your own time, and the reset are always there'));
      },
      days(slot, a, on) {
        slot.classList.add('c-su-lanes');
        [['Weekdays', 'wd'], ['Weekends', 'we']].forEach(([n, k]) => slot.appendChild(sleepLane(n, k, on)));
      },
      work(slot, a, on) {
        slot.classList.add('c-su-lanes');
        if (a.noWork) { slot.appendChild(placedBlock('No set work hours', '', cc('open'), 'laptop', () => { a.noWork = false; refresh(); })); return; }
        slot.appendChild(workLane(on));
        slot.appendChild(dayTiles(a.work.days, (wd) => { a.work.days = a.work.days.includes(wd) ? a.work.days.filter((x) => x !== wd) : a.work.days.concat(wd); refresh(); }, 'Work days'));
      },
      kids(slot, a, on) {
        slot.classList.add('c-su-lanes');
        a.kids.forEach((k) => slot.appendChild(kidLane(k, on)));
      },
      soon(slot, a) {
        if (!a.soon || !a.soon.name) { slot.appendChild(h('span', 'c-su-hint', 'Nothing, or drag one in')); return; }
        slot.appendChild(placedBlock(a.soon.name, M.dateText(a.soon.date, 'long'), cc('home'), OBX.markFor(a.soon.name), () => { a.soon = null; refresh(); }));
        const when = h('div', 'c-su-when');
        [[1, 'Next month'], [3, 'In 3 months'], [6, 'In 6 months']].forEach(([n, t]) => {
          const d = M.addMonths(SR.today, n), b = Kit.btn('c-su-chip' + (a.soon.date === d ? ' on' : ''), t, () => { a.soon.date = d; refresh(); });
          b.setAttribute('aria-pressed', String(a.soon.date === d)); when.appendChild(b);
        });
        const dt = h('input', 'c-su-date'); dt.type = 'date'; dt.value = a.soon.date; dt.min = SR.today; dt.setAttribute('aria-label', 'When');
        dt.addEventListener('change', () => { if (dt.value) { a.soon.date = dt.value; refresh(); } });
        when.appendChild(dt);
        slot.appendChild(when);
      },
      calendar(slot) {
        slot.classList.add('c-su-drop');
        if (su.ics) { slot.appendChild(placedBlock(su.ics.name, su.ics.items.length + (su.ics.items.length === 1 ? ' event comes in' : ' events come in'), cc(su.ics.cat), 'calendar', () => { su.ics = null; refresh(); })); return; }
        slot.appendChild(h('span', 'c-su-hint', 'Drop a calendar file here, or choose one on the right'));
        slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('c-over'); });
        slot.addEventListener('dragleave', () => slot.classList.remove('c-over'));
        slot.addEventListener('drop', (e) => { e.preventDefault(); slot.classList.remove('c-over'); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) readCalendar(f); });
      },
      reset(slot, a) {
        const t = OBX.RESET_TIMES.find((x) => x.day === a.resetAt.day && x.min === a.resetAt.min);
        slot.appendChild(placedBlock(t ? t.name : M.DAY_LONG[a.resetAt.day], M.clock(a.resetAt.min) + (a.resetPicked ? '' : ', a quiet time for you'), GOLDEN, 'calendar'));
      }
    };
    /* == the hand: the pieces for the row you're on ==*/
    const HOMES = [
      { id: 'solo', name: 'Only me', line: 'My own week', icon: 'person', cat: 'yours' },
      { id: 'partner', name: 'Me and a partner', line: 'The two of us', icon: 'heart', cat: 'us' },
      { id: 'family', name: 'A family with kids', line: 'Drop offs and pick ups', icon: 'people', cat: 'family' },
      { id: 'shared', name: 'A shared home', line: 'Roommates or relatives', icon: 'house', cat: 'home' }
    ];
    const HAND = {
      name(hand, a) {
        const bag = h('div', 'c-su-bag');
        const img = h('img'); img.alt = ''; img.src = su.tray.length || spelled() ? 'assets/bag-open.png' : 'assets/bag.png';
        img.addEventListener('error', () => { img.remove(); bag.classList.add('c-su-bagcss'); }, { once: true });
        bag.appendChild(img);
        if (!su.word && !(a.name && !su.word && su.dealt)) {
          const f = h('form', 'c-su-nameform');
          const inp = h('input', 'c-find'); inp.placeholder = 'Your first name'; inp.value = a.name || ''; inp.maxLength = 30; inp.autocomplete = 'given-name'; inp.setAttribute('aria-label', 'Your first name');
          f.append(inp, Kit.btn('c-go', 'Deal my letters', () => f.requestSubmit()));
          f.addEventListener('submit', (e) => { e.preventDefault(); const raw = inp.value.trim(); if (!raw) { inp.focus(); return; } spellIn(raw); refresh(); });
          hand.append(bag, f);
          setTimeout(() => { if (document.activeElement === document.body || !document.activeElement) inp.focus({ preventScroll: true }); }, 80);
          return;
        }
        const tray = h('div', 'c-su-tiles');
        su.tray.forEach((ch, i) => tray.appendChild(letterTile(ch, { tray: i })));
        if (!su.tray.length) tray.appendChild(h('span', 'c-su-hint', spelled() ? 'That’s your name on the rack.' : ''));
        const row = h('div', 'c-su-tray');
        row.append(bag, tray);
        hand.appendChild(row);
        const links = h('div', 'c-su-links');
        if (!spelled()) links.appendChild(Kit.btn('c-su-link', 'Spell it for me', () => spellAll()));
        links.appendChild(Kit.btn('c-su-link', 'Change my name', () => { su.word = ''; su.tray = []; su.rack = Array(SLOTS).fill(null); a.name = ''; refresh(); }));
        hand.appendChild(links);
        if (spelled()) hand.appendChild(h('p', 'c-su-note', 'Nice to meet you, ' + a.name + '. Every block on your board moves the way your letters did.'));
      },
      home(hand, a) {
        const g = h('div', 'c-su-pieces');
        HOMES.forEach((x) => { const b = handPiece(x.name, x.line, cc(x.cat), x.icon, x.id, (id) => { a.home = id; const fit = OBX.painsFor(id).map((p) => p.id); a.pains = a.pains.filter((y) => fit.includes(y)); snd('clack', 0.8); refresh(); }); if (a.home === x.id) b.classList.add('c-su-in'); g.appendChild(b); });
        hand.appendChild(g);
      },
      people(hand, a) {
        const g = h('div', 'c-su-pieces');
        if (partnered(a) && !a.partner && su.editing !== 'partner') g.appendChild(handPiece('Partner', 'Their first name', cc('us'), 'heart', 'partner', () => { su.editing = 'partner'; refresh(); }));
        if (a.home === 'family') g.appendChild(handPiece('A kid', 'One for each', cc('family'), 'person', 'kid', () => { su.editing = 'kid-new'; refresh(); }));
        hand.appendChild(g);
        hand.appendChild(h('p', 'c-su-note', a.home === 'family' ? 'Each kid gets their own drop off and pick up.' : 'Their name goes on your evenings together.'));
      },
      pains(hand, a) {
        if (su.why) { whyCards(hand, a); return; }
        const g = h('div', 'c-su-pieces two');
        OBX.painsFor(a.home).filter((p) => !a.pains.includes(p.id)).forEach((p) => g.appendChild(handPiece(p.name, p.line, SLATE, p.icon, p.id, (id) => {
          a.pains = a.pains.concat(id);
          const pp = OBX.painById(id);
          if (pp && pp.help) a.help[pp.help] = true;
          if (pp && pp.focus && !(a.focus || []).includes(pp.focus)) a.focus = (a.focus || []).concat(pp.focus);
          snd('clack', 0.7); refresh();
        })));
        if (!a.painOther) {
          const other = handPiece('Something else', 'In your own words', SLATE, 'plus', 'other', () => { su.editing = 'other'; refresh(); });
          g.appendChild(other);
        }
        hand.appendChild(g);
        if (su.editing === 'other') {
          const f = h('form', 'c-su-nameform');
          const inp = h('input', 'c-find'); inp.placeholder = 'In your words'; inp.maxLength = 80; inp.setAttribute('aria-label', 'Something else that gets in the way');
          f.append(inp, Kit.btn('c-go', 'Add', () => f.requestSubmit()));
          f.addEventListener('submit', (e) => { e.preventDefault(); a.painOther = inp.value.trim(); su.editing = null; refresh(); });
          hand.appendChild(f);
          setTimeout(() => inp.focus(), 40);
        }
      },
      help(hand, a) {
        const g = h('div', 'c-su-pieces two');
        helpItems(a).filter((x) => !x.on()).forEach((x) => g.appendChild(handPiece(x.name, x.line, x.c, x.icon, x.id, () => { x.set(true); snd('clack', 0.7); refresh(); })));
        if (!g.children.length) g.appendChild(h('span', 'c-su-hint', 'All of them are in.'));
        hand.appendChild(g);
        hand.appendChild(h('p', 'c-su-note', 'Every board also has to-dos, time of your own, and the Sunday Reset.'));
      },
      days(hand, a) {
        const t = h('div', 'c-su-steps');
        [['Weekdays', 'wd'], ['Weekends', 'we']].forEach(([n, k]) => {
          t.appendChild(h('b', 'c-su-steph', n));
          t.appendChild(stepper('Up at', () => a.wake[k], (v) => { a.wake[k] = M.clamp(v, 240, 720); }, 30));
          t.appendChild(stepper('Bed at', () => a.bed[k], (v) => { a.bed[k] = M.clamp(v, 1140, 1560); }, 30, (m) => M.clock(m % 1440) + (m >= 1440 ? ', next day' : '')));
        });
        hand.appendChild(t);
      },
      work(hand, a) {
        const g = h('div', 'c-su-pieces');
        if (a.noWork) g.appendChild(handPiece('Work', M.span(a.work.start, a.work.end), cc('work'), 'laptop', 'work', () => { a.noWork = false; refresh(); }));
        else {
          g.appendChild(handPiece('No set work hours', 'Drop it in instead', cc('open'), 'laptop', 'none', () => { a.noWork = true; refresh(); }));
          const two = h('div', 'c-su-two'); two.setAttribute('role', 'radiogroup'); two.setAttribute('aria-label', 'Your work hours are');
          const fixed = a.work.fixed != null ? !!a.work.fixed : a.work.days.includes(0) || a.work.days.includes(6) || a.work.start >= 720;
          [[false, 'Mine to plan', 'Focus blocks and to-dos can go inside it'], [true, 'Set, like a shift', 'Locked. Nothing goes inside it']].forEach(([v, n, l]) => {
            const b = Kit.btn('c-su-opt' + (fixed === v ? ' on' : ''), '', () => { a.work.fixed = v; refresh(); });
            b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(fixed === v));
            b.replaceChildren(h('b', '', n), h('small', '', l));
            two.appendChild(b);
          });
          hand.appendChild(g);
          hand.appendChild(h('div', 'c-su-label2', 'Your work hours are'));
          hand.appendChild(two);
          const t = h('div', 'c-su-steps');
          t.appendChild(stepper('Starts', () => a.work.start, (v) => { a.work.start = M.clamp(v, 300, a.work.end - 60); }, 30));
          t.appendChild(stepper('Ends', () => a.work.end, (v) => { a.work.end = M.clamp(v, a.work.start + 60, 1410); }, 30));
          hand.appendChild(t);
          return;
        }
        hand.appendChild(g);
      },
      kids(hand, a) {
        const t = h('div', 'c-su-steps');
        a.kids.forEach((k) => {
          const cr = care(k);
          t.appendChild(h('b', 'c-su-steph', k));
          const two = h('div', 'c-su-two'); two.setAttribute('role', 'radiogroup'); two.setAttribute('aria-label', 'Who does ' + k + '’s drop off and pick up');
          [[false, a.partner ? 'We do' : 'I do'], [true, 'Someone else does']].forEach(([v, n]) => { const b = Kit.btn('c-su-opt small' + (cr.other === v ? ' on' : ''), n, () => { cr.other = v; refresh(); }); b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(cr.other === v)); two.appendChild(b); });
          t.appendChild(two);
          if (!cr.other) {
            t.appendChild(stepper('Drop off', () => cr.drop, (v) => { cr.drop = M.clamp(v, 300, 720); }, 15));
            t.appendChild(stepper('Pick up', () => cr.pick, (v) => { cr.pick = M.clamp(v, 720, 1260); }, 15));
          }
        });
        hand.appendChild(t);
      },
      soon(hand, a) {
        const g = h('div', 'c-su-pieces');
        [['Beach trip', 'plane'], ['A birthday', 'cake'], ['A deadline', 'flag']].forEach(([n, ic]) => g.appendChild(handPiece(n, 'Pick a name for it after', cc('home'), ic, n, (name) => { a.soon = { name, date: (a.soon && a.soon.date) || M.addMonths(SR.today, 3) }; snd('clack', 0.8); refresh(); })));
        hand.appendChild(g);
        const f = h('form', 'c-su-nameform');
        const inp = h('input', 'c-find'); inp.placeholder = 'Or type your own'; inp.maxLength = 40; inp.value = a.soon && !['Beach trip', 'A birthday', 'A deadline'].includes(a.soon.name) ? a.soon.name : ''; inp.setAttribute('aria-label', 'Something coming up');
        f.append(inp, Kit.btn('c-go', 'Add', () => f.requestSubmit()));
        f.addEventListener('submit', (e) => { e.preventDefault(); const n = inp.value.trim(); if (!n) return; a.soon = { name: n, date: (a.soon && a.soon.date) || M.addMonths(SR.today, 3) }; refresh(); });
        hand.appendChild(f);
        if (a.soon && a.soon.name) hand.appendChild(h('p', 'c-su-note', 'Rename it any time: type over it above. On the board it shows on its day, in the month, and in the year.'));
      },
      calendar(hand) {
        const pick = h('input'); pick.type = 'file'; pick.accept = '.ics,text/calendar'; pick.hidden = true;
        pick.addEventListener('change', () => { const f = pick.files[0]; if (f) readCalendar(f); });
        hand.append(Kit.btn('c-go', su.ics ? 'Choose another file' : 'Choose a file', () => pick.click(), 'calendar', ESP), pick);
        if (su.ics) {
          const kinds = h('div', 'c-su-two');
          ['work', 'family', 'yours', 'home'].forEach((k) => { const b = Kit.btn('c-su-opt small' + (su.ics.cat === k ? ' on' : ''), SR.cat(k).name, () => { su.ics.cat = k; refresh(); }); b.setAttribute('aria-pressed', String(su.ics.cat === k)); kinds.appendChild(b); });
          hand.append(h('div', 'c-su-label2', 'These events are'), kinds);
        }
        const how = fold('How to get the file');
        [['Google Calendar', 'On a computer: Settings, Import and export, Export.'], ['Apple Calendar', 'On a Mac: pick the calendar, then File, Export, Export.'], ['Outlook', 'File, Save Calendar.']].forEach(([n, t]) => { const p = h('p'); p.append(h('b', '', n + '. '), document.createTextNode(t)); how.appendChild(p); });
        hand.appendChild(how);
      },
      reset(hand, a) {
        if (!a.resetPicked) a.resetAt = OBX.quietReset(a);
        const g = h('div', 'c-su-pieces');
        const quiet = OBX.quietReset(a);
        OBX.RESET_TIMES.forEach((t) => {
          const b = handPiece(t.name, M.clock(t.min) + (t.day === quiet.day && t.min === quiet.min ? ', quiet for you' : ''), GOLDEN, 'calendar', t, (x) => { a.resetAt = { day: x.day, min: x.min }; a.resetPicked = true; snd('clack', 0.8); refresh(); });
          if (t.day === a.resetAt.day && t.min === a.resetAt.min) b.classList.add('c-su-in');
          g.appendChild(b);
        });
        hand.appendChild(g);
        hand.appendChild(Kit.btn('c-su-link', 'Add it to my calendar, every week', () => { SR.saveResetIcs(a.resetAt); a.resetIcs = true; }));
      }
    };

    /* == the parts of rows ==*/
    function helpItems(a) {
      a.meals = a.meals || { breakfast: true, lunch: true };
      a.focus = a.focus || [];
      const meal = cc('meals');
      const out = [
        { id: 'breakfast', name: 'Breakfast', line: 'A time each day', icon: 'cup', c: meal, on: () => !!a.meals.breakfast, set: (v) => { a.meals.breakfast = v; } },
        { id: 'lunch', name: 'Lunch', line: 'A time each day', icon: 'bowl', c: meal, on: () => !!a.meals.lunch, set: (v) => { a.meals.lunch = v; } },
        { id: 'dinner', name: 'Dinner', line: 'Who cooks, and groceries', icon: 'pot', c: meal, on: () => a.help.dinners !== false, set: (v) => { a.help.dinners = v; } }
      ];
      if (partnered(a)) out.push({ id: 'together', name: a.partner.trim() ? 'Time with ' + a.partner.trim() : 'Time together', line: 'An evening idea each week', icon: 'heart', c: cc('us'), on: () => a.help.together !== false, set: (v) => { a.help.together = v; } });
      const fc = { move: 'yours', make: 'yours', people: 'family', home: 'home' };
      OBX.FOCUS.forEach((f) => out.push({ id: f.id, name: f.name, line: f.line, icon: f.icon, c: cc(fc[f.id] || 'yours'), on: () => a.focus.includes(f.id), set: (v) => { a.focus = v ? a.focus.concat(f.id) : a.focus.filter((x) => x !== f.id); } }));
      return out;
    }
    function personBlock(which, name, c, icon) {
      const a = su.a;
      const editing = (which === 'partner' && su.editing === 'partner') || which === 'new' || su.editing === 'kid-' + which;
      if (!editing) {
        const b = placedBlock(name, which === 'partner' ? 'Partner' : 'Kid', c, icon, () => {
          if (which === 'partner') a.partner = ''; else { delete a.cares[a.kids[which]]; a.kids.splice(which, 1); }
          refresh();
        });
        b.addEventListener('dblclick', () => { su.editing = which === 'partner' ? 'partner' : 'kid-' + which; refresh(); });
        return b;
      }
      const b = suBlock('', '', c, icon, 'c-su-placed c-su-edit');
      const inp = h('input', 'c-su-in'); inp.value = name || ''; inp.placeholder = which === 'partner' ? 'Partner’s name' : 'Kid’s name'; inp.maxLength = 24;
      inp.setAttribute('aria-label', which === 'partner' ? 'Your partner’s first name' : 'A kid’s first name');
      b.querySelector('b').replaceWith(inp);
      const commit = () => {
        if (!su || su.editing == null) return;
        const v = inp.value.trim().replace(/^\w/, (x) => x.toUpperCase());
        if (which === 'partner') a.partner = v;
        else if (which === 'new') { if (v && !a.kids.includes(v)) a.kids.push(v); }
        else { const old = a.kids[which]; if (!v) { a.kids.splice(which, 1); delete a.cares[old]; } else if (v !== old) { a.kids[which] = v; if (a.cares[old]) { a.cares[v] = a.cares[old]; delete a.cares[old]; } } }
        su.editing = null; snd('clack', 0.6); refresh();
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); su.editing = null; refresh(); } });
      inp.addEventListener('blur', () => setTimeout(commit, 0));
      setTimeout(() => inp.focus(), 30);
      return b;
    }
    /* the why, as the pains turn over: the strongest study as one big number, the next one folded */
    function whyCards(hand, a) {
      const r = OBX.reflect(a.pains);
      const c = r.cards[0];
      if (c) {
        const card = h('figure', 'c-su-study');
        card.append(h('div', 'c-kick', 'The research'), h('b', 'c-su-big', c.big), h('p', '', c.finding), h('p', 'c-su-means', c.means));
        const link = h('a', '', c.who + ', ' + c.year); link.href = c.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const cap = h('figcaption'); cap.appendChild(link); card.appendChild(cap);
        hand.appendChild(card);
      }
      if (r.cards[1]) {
        const more = fold('Another study: ' + r.cards[1].big);
        more.append(h('p', '', r.cards[1].finding));
        const l2 = h('a', '', r.cards[1].who + ', ' + r.cards[1].year); l2.href = r.cards[1].url; l2.target = '_blank'; l2.rel = 'noopener noreferrer';
        more.appendChild(l2);
        hand.appendChild(more);
      }
    }
    function fold(text, cls) {
      const d = h('details', 'c-su-how ' + (cls || ''));
      const sum = h('summary');
      const mark = () => sum.replaceChildren(SR.icon(d.open ? 'down' : 'right', 7, '#F5E8D6'), document.createTextNode(' ' + text));
      mark(); d.addEventListener('toggle', mark); d.appendChild(sum);
      return d;
    }
    function stepper(label, get, set, step, fmt) {
      const box = h('div', 'c-su-stepper');
      const v = h('span', 'c-su-sv'); v.textContent = (fmt || M.clock)(get());
      const bump = (d) => { set(get() + d * step); v.textContent = (fmt || M.clock)(get()); snd('detent'); clearTimeout(box._t); box._t = setTimeout(refresh, 260); };
      const minus = Kit.btn('c-tstep', '', () => bump(-1), 'minus'), plus = Kit.btn('c-tstep', '', () => bump(1), 'plus');
      minus.setAttribute('aria-label', label + ', earlier'); plus.setAttribute('aria-label', label + ', later');
      box.append(h('span', 'c-su-sl', label), minus, v, plus);
      return box;
    }
    function dayTiles(days, toggle, label) {
      const row = h('div', 'c-su-days'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
      [1, 2, 3, 4, 5, 6, 0].forEach((wd) => { const on = days.includes(wd); const b = Kit.btn('c-su-day' + (on ? ' on' : ''), M.DAY_SHORT[wd].slice(0, 2), () => { toggle(wd); snd('detent'); }); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', M.DAY_LONG[wd]); row.appendChild(b); });
      return row;
    }
    const care = (k) => su.a.cares[k] || (su.a.cares[k] = { days: !su.a.noWork && su.a.work.days.length ? su.a.work.days.slice() : [1, 2, 3, 4, 5], drop: 510, pick: 1005, other: false });

    /* == lanes: a day drawn on the wood, with blocks you drag and stretch, the same move as the board ==*/
    function laneBox(lo, hi, cls) {
      const lane = h('div', 'c-su-lane ' + (cls || ''));
      const ticks = h('div', 'c-su-ticks');
      for (let m = Math.ceil(lo / 180) * 180; m <= hi; m += 180) { const t = h('span', '', M.clock(m % 1440).replace(':00', '')); t.style.left = (100 * (m - lo)) / (hi - lo) + '%'; ticks.appendChild(t); }
      return { lane, ticks, pos: (m) => (100 * (m - lo)) / (hi - lo) + '%', toMin: (x) => { const r = lane.getBoundingClientRect(); return lo + ((x - r.left) / r.width) * (hi - lo); } };
    }
    /* a drag along a lane: f(minutes) sets the answer and returns false to refuse; the lane redraws at the end */
    function laneDrag(el, f, step) {
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        snd('pick'); el.classList.add('c-drag-on');
        let last = null;
        const move = (ev) => { const v = f(ev.clientX, step, false); if (v != null && v !== last) { last = v; snd('detent'); } };
        const up = (ev) => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.classList.remove('c-drag-on'); f(ev.clientX, step, true); snd('clack', 0.7); refresh(); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    }
    const snap = (m, step) => Math.round(m / step) * step;
    function sleepLane(name, k, on) {
      const a = su.a, lo = 240, hi = 1560, L = laneBox(lo, hi, 'days');
      const wake = a.wake[k], bed = a.bed[k];
      const left = h('div', 'c-su-lb sleep'); left.style.left = '0'; left.style.width = L.pos(wake);
      left.append(h('b', '', 'Sleep'));
      const awake = h('div', 'c-su-lb awake'); awake.style.left = L.pos(wake); awake.style.width = 'calc(' + L.pos(bed) + ' - ' + L.pos(wake) + ')';
      awake.append(h('b', '', 'Up ' + M.clock(wake) + ' · bed ' + M.clock(bed % 1440)), h('small', '', M.hours(bed - wake) + ' awake'));
      const right = h('div', 'c-su-lb sleep'); right.style.left = L.pos(bed); right.style.right = '0';
      right.append(h('b', '', 'Sleep'));
      L.lane.append(left, awake, right);
      if (on) {
        const g1 = h('i', 'c-su-edge'), g2 = h('i', 'c-su-edge');
        g1.setAttribute('aria-hidden', 'true'); g2.setAttribute('aria-hidden', 'true');
        left.appendChild(g1); right.appendChild(g2); g2.classList.add('lead');
        laneDrag(g1, (x, st) => { const v = M.clamp(snap(L.toMin(x), st), 240, Math.min(720, a.bed[k] - 240)); a.wake[k] = v; left.style.width = L.pos(v); awake.style.left = L.pos(v); awake.style.width = 'calc(' + L.pos(a.bed[k]) + ' - ' + L.pos(v) + ')'; awake.firstChild.textContent = 'Up ' + M.clock(v) + ' · bed ' + M.clock(a.bed[k] % 1440); return v; }, 30);
        laneDrag(g2, (x, st) => { const v = M.clamp(snap(L.toMin(x), st), Math.max(1140, a.wake[k] + 240), 1560); a.bed[k] = v; right.style.left = L.pos(v); awake.style.width = 'calc(' + L.pos(v) + ' - ' + L.pos(a.wake[k]) + ')'; awake.firstChild.textContent = 'Up ' + M.clock(a.wake[k]) + ' · bed ' + M.clock(v % 1440); return v; }, 30);
      }
      const box = h('div', 'c-su-laneline');
      box.append(h('span', 'c-su-ln', name), h('div', 'c-su-lanecol'));
      box.lastChild.append(L.lane, on ? L.ticks : h('span'));
      return box;
    }
    function workLane(on) {
      const a = su.a, lo = 300, hi = 1440, L = laneBox(lo, hi, 'work');
      const c = cc('work');
      const b = h('div', 'c-su-lb block'); b.style.background = c.base; b.style.color = c.ink;
      b.style.left = L.pos(a.work.start); b.style.width = 'calc(' + L.pos(a.work.end) + ' - ' + L.pos(a.work.start) + ')';
      const fixed = a.work.fixed != null ? !!a.work.fixed : a.work.days.includes(0) || a.work.days.includes(6) || a.work.start >= 720;
      const t = h('b'); t.append(SR.icon(fixed ? 'lock' : 'laptop', 8, c.ink), document.createTextNode(' Work ' + M.span(a.work.start, a.work.end)));
      b.appendChild(t);
      L.lane.appendChild(b);
      if (on) {
        const e1 = h('i', 'c-su-edge lead'), e2 = h('i', 'c-su-edge');
        b.append(e1, e2);
        const paint = () => { b.style.left = L.pos(a.work.start); b.style.width = 'calc(' + L.pos(a.work.end) + ' - ' + L.pos(a.work.start) + ')'; t.lastChild.textContent = ' Work ' + M.span(a.work.start, a.work.end); };
        laneDrag(e1, (x, st) => { a.work.start = M.clamp(snap(L.toMin(x), st), 300, a.work.end - 60); paint(); return a.work.start; }, 30);
        laneDrag(e2, (x, st) => { a.work.end = M.clamp(snap(L.toMin(x), st), a.work.start + 60, 1410); paint(); return a.work.end; }, 30);
        let grab = null;
        b.addEventListener('pointerdown', (e) => { if (e.target.classList.contains('c-su-edge')) return; grab = L.toMin(e.clientX) - a.work.start; });
        laneDrag(b, (x, st) => { if (grab == null) return null; const len = a.work.end - a.work.start; const s = M.clamp(snap(L.toMin(x) - grab, st), 300, 1410 - len); a.work.start = s; a.work.end = s + len; paint(); return s; }, 30);
      }
      const box = h('div', 'c-su-laneline');
      box.append(h('span', 'c-su-ln', 'Hours'), h('div', 'c-su-lanecol'));
      box.lastChild.append(L.lane, on ? L.ticks : h('span'));
      return box;
    }
    function kidLane(k, on) {
      const cr = care(k), lo = 360, hi = 1260, L = laneBox(lo, hi, 'kids');
      const c = cc('family');
      if (cr.other) L.lane.appendChild(Object.assign(h('div', 'c-su-lb note'), { textContent: 'Someone else handles ' + k }));
      else {
        [['drop', 'Drop off', 300, 720], ['pick', 'Pick up', 720, 1260]].forEach(([key, nm, mn, mx]) => {
          const b = h('div', 'c-su-lb block small'); b.style.background = c.base; b.style.color = c.ink;
          b.style.left = L.pos(cr[key]); b.style.width = 'calc(' + L.pos(cr[key] + 45) + ' - ' + L.pos(cr[key]) + ')';
          const t = h('b', '', nm + ' ' + M.clock(cr[key])); b.appendChild(t);
          L.lane.appendChild(b);
          if (on) laneDrag(b, (x, st) => { const v = M.clamp(snap(L.toMin(x) - 22, st), Math.max(mn, lo), Math.min(mx, hi - 45)); cr[key] = v; b.style.left = L.pos(v); t.textContent = nm + ' ' + M.clock(v); return v; }, 15);
        });
      }
      const box = h('div', 'c-su-laneline');
      box.append(h('span', 'c-su-ln', k), h('div', 'c-su-lanecol'));
      box.lastChild.append(L.lane);
      if (on && !cr.other) box.lastChild.appendChild(dayTiles(cr.days, (wd) => { cr.days = cr.days.includes(wd) ? cr.days.filter((x) => x !== wd) : cr.days.concat(wd); refresh(); }, k + '’s days'));
      return box;
    }

    /* == your name, in letters ==*/
    const LETTER_TINTS = ['yours', 'family', 'us', 'work', 'meals'].map((k) => cc(k));
    const plain = (raw) => raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, SLOTS);
    function nameStartFor(w) { return Math.floor((SLOTS - w.length) / 2); }
    function spellIn(raw, done) {
      const a = su.a, w = plain(raw);
      a.name = raw.trim().replace(/^\w/, (x) => x.toUpperCase());
      su.word = w; su.rack = Array(SLOTS).fill(null); su.tray = [];
      if (!w) return;
      if (done) { const o = nameStartFor(w); w.split('').forEach((ch, i) => { su.rack[o + i] = ch; }); return; }
      su.tray = shuffle(w.split('').concat(dealLetters(2)));
      su.dealt = true;
      snd('clack', 0.6);
    }
    function spelled() { if (!su || !su.word) return false; const o = nameStartFor(su.word); return su.rack.slice(o, o + su.word.length).join('') === su.word; }
    function spellAll() {
      const o = nameStartFor(su.word);
      su.rack = Array(SLOTS).fill(null); su.word.split('').forEach((ch, i) => { su.rack[o + i] = ch; });
      const extra = su.tray.slice(); su.word.split('').forEach((ch) => { const j = extra.indexOf(ch); if (j >= 0) extra.splice(j, 1); });
      su.tray = extra;
      snd('chime'); refresh();
    }
    function letterTile(ch, where) {
      /* a letter is one of the board's own blocks: its colors, its bevel, a capital in the board's type, no numbers */
      const t = h('div', 'c-ltile c-su-tile');
      t.dataset.ch = ch;
      const tint = LETTER_TINTS[(ch.charCodeAt(0) - 65) % LETTER_TINTS.length];
      t.style.setProperty('--b', tint.base); t.style.setProperty('--i', tint.ink);
      t.append(h('b', '', ch));
      t.style.setProperty('--r', ((ch.charCodeAt(0) * 37 + (where.tray || 0) * 11) % 14 - 7) + 'deg');
      t.tabIndex = 0; t.setAttribute('role', 'button');
      t.setAttribute('aria-label', 'Letter ' + ch + (where.slot != null ? ', on the rack. Press to take it off' : '. Press to put it on the rack'));
      const toRack = (i) => {
        if (where.tray != null) su.tray.splice(where.tray, 1); else su.rack[where.slot] = null;
        const was = su.rack[i]; su.rack[i] = ch;
        if (was) su.tray.push(was);
        snd('clack', 0.85);
        if (spelled()) { snd('chime'); }
        refresh();
      };
      const toTray = () => { if (where.slot == null) return; su.rack[where.slot] = null; su.tray.push(ch); snd('slide'); refresh(); };
      const nextOpen = () => {
        const o = nameStartFor(su.word);
        const i = su.word.split('').findIndex((c, j) => c === ch && su.rack[o + j] !== c);
        if (i >= 0) return o + i;
        const k = su.rack.findIndex((x) => !x); return k < 0 ? null : k;
      };
      t.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); if (where.slot != null) toTray(); else { const i = nextOpen(); if (i != null) toRack(i); } });
      draggable(t, { ch }, {
        accept: (z) => z.dataset.zone === 'su-slot',
        onDrop: (z) => toRack(+z.dataset.i),
        onOut: () => toTray(),
        onTap: () => { if (where.slot != null) toTray(); else { const i = nextOpen(); if (i != null) toRack(i); } }
      });
      return t;
    }
    function readCalendar(f) {
      const rd = new FileReader();
      rd.onload = () => {
        const r = SR.readIcs(rd.result, f.name);
        if (!r) { snd('bad'); SR.toast('No events in that file. It needs to be a calendar file ending in .ics.', 'bad'); return; }
        su.ics = r; snd('good'); refresh();
      };
      rd.readAsText(f);
    }

    /* == Build my week: the week built from the answers, the camera slides right onto it, then a coach ==*/
    function buildWeek() {
      const a = su.a, ics = su.ics, preview = su.preview;
      su.built = true;
      try { localStorage.setItem('sundayreset.v10.met', '1'); } catch (e) { /* fine */ }
      if (!preview) { try { localStorage.removeItem(DESK); } catch (e) { /* fine */ } }
      try { SR.applySetup(a, ics); } catch (e) { console.error(e); SR.toast('The week didn’t build. Your answers are kept; try again.', 'bad'); su.built = false; return; }
      snd('chime');
      setTimeout(() => { closeMat(); setTimeout(() => coachTour(a), 1100); }, 350);
    }

    /* == the coach: on the real board, it shows a move once, then it's your turn ==*/
    let coach = null;
    /* one coach at a time: the board's Getting started list waits until the tour is over */
    let movesHold = null;
    function holdMoves() {
      clearInterval(movesHold);
      let n = 0;
      movesHold = setInterval(() => { if (SR.view.sel && SR.view.sel.type === 'moves') { const x = document.getElementById('side-x'); if (x) x.click(); } if (++n > 12) clearInterval(movesHold); }, 250);
    }
    /* the card sits away from what it points at: up top when the spot is low on the screen */
    function placeCoach(y) {
      if (!coach) return;
      const high = y != null && y > window.innerHeight * 0.52;
      coach.classList.toggle('c-coach-top', high);
      coachRoom();
    }
    /* V11: the coach card and the toasts used one spot at the bottom, and a toast hid behind the card; while
       the card sits low, toasts rise above it */
    function coachRoom() {
      const low = !!coach && !coach.classList.contains('c-coach-top');
      document.body.classList.toggle('c-coach-low', low);
      /* measured from where it rests (its bottom and height), not mid entrance */
      if (low) document.body.style.setProperty('--c-coach-room', Math.round((parseFloat(getComputedStyle(coach).bottom) || 88) + coach.offsetHeight + 12) + 'px');
    }
    function coachCard(kick, title, line, acts) {
      if (!coach) { coach = h('section', 'k c-coach'); coach.setAttribute('role', 'dialog'); coach.setAttribute('aria-live', 'polite'); app.appendChild(coach); }
      coach.replaceChildren(h('div', 'c-kick', kick), h('h3', '', title), h('p', '', line));
      const row = h('div', 'c-coach-acts');
      (acts || []).forEach((b) => row.appendChild(b));
      coach.appendChild(row);
      coachRoom();
    }
    function endCoach() { clearInterval(movesHold); if (coach) { coach.remove(); coach = null; } coachRoom(); document.querySelectorAll('.c-coach-ring, .c-coach-ghost').forEach((x) => x.remove()); if (coachPoll) clearInterval(coachPoll); coachPoll = null; }
    let coachPoll = null;
    function ringAt(x0, y0, x1, y1) {
      document.querySelectorAll('.c-coach-ring').forEach((x) => x.remove());
      const r = h('div', 'c-coach-ring');
      r.style.left = Math.round(x0) + 'px'; r.style.top = Math.round(y0) + 'px'; r.style.width = Math.round(x1 - x0) + 'px'; r.style.height = Math.round(y1 - y0) + 'px';
      document.body.appendChild(r);
      return r;
    }
    /* a ring around a day's card in the month, or a month's card in the year, measured from the card itself */
    function screenBox(obj) {
      const T = window.THREE, cam = World.camera, cv = [...document.querySelectorAll('canvas')].find((c) => c.width > 600);
      if (!T || !cam || !cv) return null;
      const box = new T.Box3().setFromObject(obj), r = cv.getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      [box.min.x, box.max.x].forEach((x) => [box.min.y, box.max.y].forEach((y) => [box.min.z, box.max.z].forEach((z) => {
        const p = new T.Vector3(x, y, z).project(cam), sx = r.left + (p.x + 1) / 2 * r.width, sy = r.top + (1 - p.y) / 2 * r.height;
        x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
      })));
      return { x0, y0, x1, y1 };
    }
    function ringCard(level, key) {
      if (!coach) return;
      const dbg = World.debug;
      const card = level === 'month' ? dbg.month.cards.find((c) => c.userData.date === key) : dbg.year.cards.find((c) => c.userData.month === key);
      const b = card && screenBox(card);
      if (!b) return;
      ringAt(b.x0 - 5, b.y0 - 5, b.x1 + 5, b.y1 + 5);
      placeCoach((b.y0 + b.y1) / 2);
    }
    /* a roomy time on a day: open, nothing locked inside it, no one pushed */
    function roomy(date, dur) {
      const st = SR.state, d = SR.day(date);
      for (let s = Math.max(d.wake || 420, 17 * 60); s + dur <= (d.bed || 1320) - 30; s += 15) { const fit = M.canPlace(st, date, dur, s); if (fit && fit.ok && !(fit.pushes || []).length) return s; }
      for (let s = Math.max(d.wake || 420, 420); s + dur <= (d.bed || 1320); s += 15) { const fit = M.canPlace(st, date, dur, s); if (fit && fit.ok) return s; }
      return null;
    }
    function rowRect(ws, date) {
      const row = M.diffDays(ws, date), hrs = World.hours;
      const a = World.slotScreen('week', row, hrs.start), b = World.slotScreen('week', row, hrs.end);
      const up = World.slotScreen('week', Math.max(0, row - 1), hrs.start), dn = World.slotScreen('week', Math.min(6, row + 1), hrs.start);
      const half = Math.max(14, Math.abs((row === 0 ? dn.y - a.y : a.y - up.y)) / 2);
      return { x0: a.x - 8, x1: b.x + 8, y0: a.y - half + 2, y1: a.y + half - 2 };
    }
    function coachTour(a) {
      endCoach();
      if (SR.view.phone) return;
      if (SR.inToday()) SR.setMode('planner');
      if (SR.view.zoom !== 'week') SR.setZoom('week');
      const ws = M.weekStart(SR.today);
      const days = M.range(ws, 7).filter((d) => d > SR.today);
      const first = days[0] || SR.today, second = days[1] || first;
      const pal = SR.state.palette || [];
      const pick = (ids) => ids.map((id) => pal.find((p) => p.id === id && !p.hidden)).find(Boolean) || pal.find((p) => p.cat === 'yours' && !p.hidden);
      const demo = pick(['walk', 'workout', 'reading']), mine = pick(['reading', 'creative', 'walk']);
      const skip = Kit.btn('c-su-link', 'Skip the tour', () => endCoach());
      holdMoves();
      coachCard('Your week is ready', a.name ? 'Here it is, ' + a.name + '.' : 'Here it is.', 'Built from your answers. A one-minute look at how it works?', [Kit.btn('c-go', 'Show me', () => step1()), skip]);
      function step1() {
        if (!demo) { step3(); return; }
        if (!(SR.view.bench && SR.view.bench.tab === 'blocks')) blockLibrary();
        coachCard('1 of 3 · Watch', 'Blocks come from Block library.', 'Watch: ' + demo.name + ' goes onto ' + M.DAY_LONG[M.weekday(first)] + '. Nothing locked moves.', [skip]);
        setTimeout(() => {
          for (let i = 0; i < 40; i++) World.step(0.05);
          const from = World.pieceScreen(demo.name), start = roomy(first, demo.dur || 30);
          if (start == null) { step2(); return; }
          const to = World.slotScreen('week', M.diffDays(ws, first), start + (demo.dur || 30) / 2);
          placeCoach(to.y);
          const look = World.look(demo);
          const g = domBlock(demo.name, M.dur(demo.dur || 30), look.base, look.ink, 'c-coach-ghost');
          const x0 = from ? from.x : window.innerWidth - 220, y0 = from ? from.y : window.innerHeight / 2;
          g.style.left = x0 + 'px'; g.style.top = y0 + 'px';
          document.body.appendChild(g);
          snd('pick');
          requestAnimationFrame(() => requestAnimationFrame(() => { g.classList.add('go'); g.style.left = to.x + 'px'; g.style.top = to.y + 'px'; }));
          setTimeout(() => {
            g.remove();
            SR.commit(() => { M.placeAdd(SR.state, first, { name: demo.name, cat: demo.cat, icon: demo.icon, dur: demo.dur || 30, src: { type: 'block', id: demo.id } }, start); });
            SR.render(); snd('clack', 0.9);
            setTimeout(step2, 900);
          }, SR.view.calm ? 200 : 1300);
        }, 900);
      }
      function step2() {
        if (!mine) { step3(); return; }
        const before = ((SR.state.dates[second] || {}).adds || []).length;
        coachCard('2 of 3 · Your turn', 'Now you.', 'Drag ' + mine.name + ' from Block library onto ' + M.DAY_LONG[M.weekday(second)] + '. Anywhere it fits.', [Kit.btn('c-su-link', 'Do it for me', () => { const s = roomy(second, mine.dur || 30); if (s != null) { SR.commit(() => { M.placeAdd(SR.state, second, { name: mine.name, cat: mine.cat, icon: mine.icon, dur: mine.dur || 30, src: { type: 'block', id: mine.id } }, s); }); SR.render(); } }), skip]);
        const show = () => { const rr = rowRect(ws, second); ringAt(rr.x0, rr.y0, rr.x1, rr.y1); placeCoach((rr.y0 + rr.y1) / 2); };
        setTimeout(show, 300);
        if (coachPoll) clearInterval(coachPoll);
        coachPoll = setInterval(() => {
          const n = ((SR.state.dates[second] || {}).adds || []).length;
          if (n > before) { clearInterval(coachPoll); coachPoll = null; document.querySelectorAll('.c-coach-ring').forEach((x) => x.remove()); snd('good'); coachCard('2 of 3 · Your turn', 'That’s the move.', 'Everything on the board moves like that. Drag an edge to make a block longer, or tap it for more.', [Kit.btn('c-go', 'Next', () => step3()), skip]); }
          else show();
        }, 500);
      }
      function step3() {
        document.querySelectorAll('.c-coach-ring').forEach((x) => x.remove());
        if (SR.view.bench) { SR.view.bench = null; SR.render(); }
        const soon = a.soon && a.soon.name && a.soon.date ? a.soon : null;
        if (!soon) { finish(); return; }
        SR.view.focus = soon.date; Kit.zoom('month');
        coachCard('3 of 3 · Coming up', soon.name + ' is on your month.', 'Month and Year show what’s coming, so it never sneaks up. Tap a day to open it.', [Kit.btn('c-go', 'See the year', () => {
          Kit.zoom('year');
          coachCard('3 of 3 · Coming up', 'And on your year.', 'The year shows the months ahead, with ' + soon.name + ' on its month.', [Kit.btn('c-go', 'Back to my week', () => { SR.view.focus = SR.today; Kit.zoom('week'); finish(); })]);
          setTimeout(() => ringCard('year', soon.date.slice(0, 7)), 1300);
        }), skip]);
        setTimeout(() => ringCard('month', soon.date), 1300);
      }
      function finish() {
        document.querySelectorAll('.c-coach-ring').forEach((x) => x.remove());
        const t = OBX.RESET_TIMES.find((x) => x.day === a.resetAt.day && x.min === a.resetAt.min);
        placeCoach(null);
        coachCard('You’re set', 'That’s Sunday Reset.', 'Your first reset is ' + (t ? t.name.toLowerCase() : M.DAY_LONG[a.resetAt.day]) + ', ' + M.clock(a.resetAt.min) + '. The button at the bottom right starts it. A few more things to try are in Getting started.', [Kit.btn('c-go', 'Done', () => endCoach()), Kit.btn('c-su-link', 'Open Getting started', () => { endCoach(); SR.openSel({ type: 'moves' }); })]);
      }
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && coach && !mat) { endCoach(); } });

    /* == keeping the corners in step == */
    function sync() {
      const today = SR.inToday(), v = SR.view;
      tc.hidden = false;
      const running = !!pom.endsAt;
      pomo.hidden = !running;
      pomo.classList.toggle('rest', pom.phase !== 'work');
      bl.hidden = !running;
      /* V11: due this week, the one count every to-do place uses, and never wider than 99+ */
      const n = dueWeek().length; due.textContent = n ? capN(n) : '';
      todos.setAttribute('aria-label', 'To-dos' + (n ? ', ' + n + ' due this week' : ''));
      todos.title = n ? n + (n === 1 ? ' to-do' : ' to-dos') + ' due this week' : 'To-dos';
      lib.setAttribute('aria-pressed', String(libOpen()));
      todos.setAttribute('aria-pressed', String(!today && !!v.bench && v.bench.tab !== 'blocks'));
      const p = SR.who(), name = (p && p.name) || 'You';
      meCircle.textContent = name.slice(0, 1).toUpperCase(); meName.textContent = name.split(' ')[0];
      me.classList.toggle('c-sample', !!(p && p.sample));
      nowClock.hidden = !today; if (today) nowClock.textContent = M.clock(SR.nowMin);
      /* on a narrower window the date rides in the band's own top line, so Now keeps the room for the board */
      if (today) { const bd = document.getElementById('band'), bi = document.getElementById('band-in'); if (bd && bi && bandKick.parentElement !== bd) bd.insertBefore(bandKick, bi); bandKick.textContent = Kit.when().title + ' · ' + M.clock(SR.nowMin); }
      document.body.className = document.body.className.replace(/\bc-step-\w+/g, '').trim();
      if (v.reset) document.body.classList.add('c-step-' + SR.stepsNow()[v.reset.step].key);
      me.title = 'Settings and everything else';
      drawSave();
      document.body.classList.toggle('c-pomo-on', running);
      document.body.classList.toggle('c-resetting', !!v.reset);
      notePlanned(); drawChip(); drawSteps();
      if (v.reset && dock) closeDock();
      stepFocus(); panelTools();
      if (v.reset) {
        const body = document.getElementById('rack-body'), key = SR.stepsNow()[v.reset.step].key;
        if (key === 'todo') shapeTodo(body);
        if (key === 'dinners') shapeMeals(body);
        if (key === 'ahead') shapeAhead(body);
        if (key === 'yours') shapeYours(body);
        tidyWords(document.getElementById('rack'));
      }
      checkDetail();
      drawStackBar(); drawKindChips(); drawRack(); devKeep(); maybeHello();
      if (v.reset && SR.stepsNow()[v.reset.step].key === 'done') shareBox(document.getElementById('rack-body'), v.reset.week);
      const ag = document.getElementById('agenda');
      listBtn.setAttribute('aria-pressed', String(!!(ag && !ag.hidden)));
      onScreen();
      requestAnimationFrame(() => { measure(); place(); });
    }
    /* == V11: what's on screen, by view and by size (docs/V11-ON-SCREEN.md) ==
       The bottom bar holds what works where you are. Block library and To-dos lay their pieces out beside
       the day or the week, so they show there (To-dos in Now too, where Due soon comes out beside today);
       in Month, Year, and the list they could only take you somewhere else. Add works everywhere, and the
       reset follows its own rule (drawChip). With every kind of day laid out the bar steps aside, since
       the cards are the page, and a bar with nothing in it isn't drawn. */
    const spreadBar = h('div', 'c-spreadbar'); spreadBar.hidden = true;
    const spreadSave = Kit.btn('c-spreadsave', '', () => { const d = SR.view.focus, b = document.querySelector('.kinds-allbtn'); if (b) b.click(); SR.openSel({ type: 'savePreset', date: d }); }, 'plus');
    const spreadLong = h('span', 'c-spread-long'), spreadShort = h('span', 'c-spread-short', 'Save as a kind');
    spreadSave.append(spreadLong, spreadShort);
    const spreadDone = Kit.btn('c-spreaddone', 'Done', () => { const b = document.querySelector('.kinds-allbtn'); if (b) b.click(); });
    spreadDone.title = 'Put the kinds away (K)';
    spreadBar.append(spreadSave, spreadDone);
    let brWas = null;
    function onScreen() {
      const v = SR.view, now = SR.inToday(), ag = document.getElementById('agenda'), listOn = !!(ag && !ag.hidden);
      const spread = spreadOn(), board = !now && !listOn && (v.zoom === 'day' || v.zoom === 'week');
      lib.hidden = !board;
      todos.hidden = !(board || now);
      document.body.classList.toggle('c-spread', spread);
      spreadBar.hidden = !spread;
      if (spread) {
        const wd = M.DAY_LONG[M.weekday(v.focus)];
        spreadLong.textContent = 'Save this ' + wd + ' as a kind';
        spreadSave.setAttribute('aria-label', 'Save this ' + wd + ' as a kind of day of your own');
      }
      br.hidden = spread || ![add, todos, lib, rchip].some((x) => !x.hidden);
      if (brWas !== br.hidden) { brWas = br.hidden; requestAnimationFrame(() => SR.layoutInsets()); }
    }
    /* Today's band and dock make room for the corners beside them */
    function measure() {
      const s = document.body.style;
      s.setProperty('--c-tl-w', me.offsetWidth + 'px');
      s.setProperty('--c-tr-w', tr.offsetWidth + 'px');
      s.setProperty('--c-bl-w', bl.offsetWidth + 'px');
      /* the band and the stack strip hang under the date chip; when it moves, the board measures its room again */
      const tcB = Math.round(tc.getBoundingClientRect().bottom) + 'px';
      /* V11: what hangs under the date clears every top chip it runs under, by the same gap */
      { const r0 = tc.getBoundingClientRect(), bw = Math.min(760, window.innerWidth - 32), bl = (window.innerWidth - bw) / 2; let lo = r0.bottom; [me, tr].forEach((x) => { const r = x.getBoundingClientRect(); if (r.width && r.right > bl && r.left < bl + bw) lo = Math.max(lo, r.bottom); }); const v = Math.round(lo) + 'px'; if (s.getPropertyValue('--c-top-b') !== v) s.setProperty('--c-top-b', v); }
      if (s.getPropertyValue('--c-tc-b') !== tcB) { s.setProperty('--c-tc-b', tcB); requestAnimationFrame(() => { measure(); SR.layoutInsets(); }); return; }
      const band = document.getElementById('band');
      const bandB = Math.round(band && !band.hidden ? band.getBoundingClientRect().bottom : tc.getBoundingClientRect().bottom) + 'px';
      if (s.getPropertyValue('--c-band-b') !== bandB) { s.setProperty('--c-band-b', bandB); requestAnimationFrame(() => SR.layoutInsets()); }
      const rack = document.getElementById('rack');
      const rh = rack && SR.view.reset ? rack.offsetHeight + 'px' : '0px';
      if (s.getPropertyValue('--c-rack-h') !== rh) { s.setProperty('--c-rack-h', rh); SR.layoutInsets(); }
    }
    /* the reset's steps change height from step to step, and the corners ride on top of them */
    if (window.ResizeObserver && document.getElementById('rack')) new ResizeObserver(() => requestAnimationFrame(measure)).observe(document.getElementById('rack'));
    br.appendChild(rchip);
    kinds.append(kindChips, spreadBar);
    Kit.renders.push(sync);

    /* == V11: feel. The pieces on top move the way the blocks do (docs/CORNERS-V11.md) == */
    /* the zoom switch: its white slides to the one you picked */
    {
      const seg = tr.querySelector('.k-seg');
      if (seg) {
        seg.classList.add('c-slide');
        const pill = h('i', 'c-segpill'); pill.setAttribute('aria-hidden', 'true');
        seg.prepend(pill);
        let placed = false;
        const put = () => {
          const on = seg.querySelector('button[aria-pressed="true"]');
          if (!on || !seg.offsetWidth || !on.offsetWidth) { pill.style.opacity = '0'; placed = false; return; }
          const still = !placed || !feelOn();
          if (still) seg.classList.add('c-still');
          pill.style.opacity = '1';
          pill.style.width = on.offsetWidth + 'px';
          pill.style.transform = 'translateX(' + on.offsetLeft + 'px)';
          if (still) { void pill.offsetWidth; seg.classList.remove('c-still'); }
          placed = true;
        };
        Kit.renders.push(put);
        window.addEventListener('resize', () => { placed = false; requestAnimationFrame(put); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { placed = false; put(); });
      }
    }
    /* the date: the next day or week slides in from the right, an earlier one from the left; zooming out,
       the words arrive from a little bigger, zooming in from a little smaller, like the desk does */
    {
      const t = dateCtl.querySelector('.k-title'), sub = dateCtl.querySelector('.k-sub');
      const Z = ['today', 'day', 'week', 'month', 'year'];
      let last = null;
      Kit.renders.push(() => {
        if (!t) return;
        const now = { text: t.textContent + '|' + (sub ? sub.textContent : ''), focus: SR.view.focus, zoom: Kit.mode() };
        const was = last; last = now;
        if (!was || was.text === now.text || !feelOn() || !t.animate) return;
        const from = was.zoom !== now.zoom ? 'scale(' + (Z.indexOf(now.zoom) > Z.indexOf(was.zoom) ? 1.08 : 0.92) + ')'
          : now.focus !== was.focus ? 'translateX(' + (now.focus > was.focus ? 12 : -12) + 'px)' : null;
        if (!from) return;
        [t, sub].forEach((x) => { if (x && !x.hidden) x.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: 220, easing: FOUT }); });
      });
    }
    /* a count that changes pops once */
    {
      let lastN = due.textContent;
      Kit.renders.push(() => {
        const n = due.textContent, was = lastN;
        if (n === was) return;
        lastN = n;
        if (!n || !feelOn() || !due.animate) return;
        due.animate([{ transform: 'scale(' + (was ? 1.3 : 0.5) + ')' }, { transform: 'scale(1)' }], { duration: 260, easing: FOUT });
      });
    }
    /* == V11: Block library puts itself away ==
       Each visit starts with it away, and a minute without anyone using it puts it away again, so the
       calendar always has the most room (Russell, Oct 14). Pointing at it or picking a block from it
       counts as using it. Settings, The desk, can keep it out. */
    {
      const TIDY = 'sundayreset.kitTidy', IDLE = 60000;
      const tidyOn = () => { try { return localStorage.getItem(TIDY) !== '0'; } catch (e) { return true; } };
      let lastUse = Date.now(), wasOpen = false, told = false;
      try { told = localStorage.getItem('sundayreset.v11.tidyTold') === '1'; } catch (e) { /* fine */ }
      window.SR_kitTidy = { on: tidyOn, set: (v) => { try { localStorage.setItem(TIDY, v ? '1' : '0'); } catch (e) { /* fine */ } lastUse = Date.now(); } };
      /* a visit starts with it away (the day's rack and the week's bench both) */
      if (tidyOn()) { window.SR_kitAway = true; if (SR.view.bench && SR.view.bench.tab === 'blocks') SR.view.bench = null; }
      const stage = document.getElementById('stage');
      const used = () => { lastUse = Date.now(); };
      let lookAt = 0;
      stage.addEventListener('pointerdown', (e) => { const hit = World.pick(e.clientX, e.clientY); if (hit && hit.kind === 'bench') used(); }, true);
      stage.addEventListener('pointermove', (e) => { const n = Date.now(); if (n - lookAt < 400 || !libOpen()) return; lookAt = n; const hit = World.pick(e.clientX, e.clientY); if (hit && hit.kind === 'bench') used(); }, true);
      Kit.renders.push(() => { const open = libOpen(); if (open && !wasOpen) used(); wasOpen = open; });
      setInterval(() => {
        if (!tidyOn() || !libOpen() || SR.view.reset || SR.view.preview && SR.view.preview.id === 'firstrun') return;
        if (document.querySelector('.c-ghost-block') || document.body.classList.contains('c-away')) return;
        if (Date.now() - lastUse < IDLE) return;
        if (SR.view.zoom === 'day' && !SR.view.bench) kitAway(true); else if (SR.view.bench && SR.view.bench.tab === 'blocks') SR.view.bench = null; else return;
        if (SR.Snd.slide) SR.Snd.slide();
        SR.render();
        if (!told) { told = true; try { localStorage.setItem('sundayreset.v11.tidyTold', '1'); } catch (e) { /* fine */ } SR.toast('Block library put itself away, so the calendar has the room. It’s one tap away.', '', { label: 'Settings', fn: () => Kit.settings('desk') }); }
      }, 5000);
    }
    /* == V11: kinds of day, said once ==
       The first time a day is open, a note offers every kind of it side by side, so the kinds are found
       without anyone reading a manual (Russell, Oct 14: "remind users that it's there") */
    {
      let told = false; try { told = localStorage.getItem('sundayreset.v11.kindsTold') === '1'; } catch (e) { /* fine */ }
      let timer = 0;
      Kit.renders.push(() => {
        if (told || SR.view.zoom !== 'day' || SR.inToday() || SR.view.preview || SR.view.reset || SR.view.kindSpread || document.querySelector('.c-mat, .k-sheet') || !document.getElementById('sheet').hidden) { clearTimeout(timer); timer = 0; return; }
        if (timer) return;
        timer = setTimeout(() => {
          timer = 0;
          if (told || SR.view.zoom !== 'day' || SR.view.kindSpread) return;
          told = true; try { localStorage.setItem('sundayreset.v11.kindsTold', '1'); } catch (e) { /* fine */ }
          const wd = M.DAY_LONG[M.weekday(SR.view.focus)];
          SR.toast('See every kind of ' + wd + ' side by side.', '', { label: 'Show me', fn: () => { const b = document.querySelector('.kinds-allbtn'); if (b) b.click(); } });
        }, 2500);
      });
    }
    /* a sheet closes with a quick fade instead of vanishing: a copy fades while the real one is already gone */
    {
      const close0 = Kit.closeSheet;
      Kit.closeSheet = () => {
        const els = Kit.openSheetEl;
        if (els && feelOn()) els.forEach((x) => {
          if (!x.parentNode || !x.animate) return;
          const c = x.cloneNode(true);
          c.removeAttribute('id'); c.querySelectorAll('[id]').forEach((y) => y.removeAttribute('id'));
          c.setAttribute('aria-hidden', 'true'); c.inert = true;
          c.style.pointerEvents = 'none'; c.style.animation = 'none';
          x.parentNode.insertBefore(c, x.nextSibling);
          c.scrollTop = x.scrollTop;
          const sheet = c.classList.contains('k-sheet');
          c.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: sheet ? '0.98' : '1' }], { duration: sheet ? 140 : 170, easing: FIN, fill: 'forwards' }).onfinish = () => c.remove();
          setTimeout(() => c.remove(), 400);
        });
        close0();
      };
    }
  });
})();
