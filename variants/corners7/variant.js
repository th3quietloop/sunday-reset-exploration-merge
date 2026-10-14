/* Corners V7: V6 with a letter rack (a wooden rack up top, letter tiles on the desk, a bag beside it; the
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
  window.SR_recapApart = true; /* 3 of 6, then Your week */ /* the clock is the Pomodoro, so it stays on the desk right after the notepad */
  Kit.ink = CREAM; Kit.onGold = ESP; /* charcoal chrome with white type, like the board's own HUD */
  Kit.start(() => {
    const app = document.getElementById('app');

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
    tc.append(Kit.dateControl(), kinds, days);
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
      toBoard();
      const v = SR.view;
      if (v.zoom === 'day') { v.bench = null; kitAway(false); }
      else { v.tab = 'blocks'; v.level = null; v.bench = { tab: 'blocks', level: null }; }
      SR.Snd.zoom && SR.Snd.zoom(false);
      SR.render();
    }
    /* a stack of to-dos, dinners, or ideas comes out on the same bench */
    function layOut(tab, level) {
      toBoard();
      const v = SR.view;
      if (tab === 'todo' && level === 'soon') { if (!(v.bench && v.bench.tab === 'todo' && v.bench.level === 'soon')) SR.openDueSoon(); return; }
      v.tab = tab; v.level = level || null; v.bench = { tab, level: level || null };
      SR.Snd.zoom && SR.Snd.zoom(false);
      SR.render();
    }

    /* == To-dos: stacked cards in a sheet that holds still == */
    function stacks() {
      const st = SR.state, M = SR.M, D = SR.D, out = [];
      const dueList = M.dueSoon(st, SR.today, 21, SR.nowMin);
      out.push({ kind: 'todos', name: 'Due soon', count: dueList.length, line: dueList.length ? dueList.length + ' in three weeks' : 'All clear', peek: dueList.slice(0, 2).map((x) => x.task.name).join(' · ') || 'Nothing due this week', icon: 'flag', color: '#B84A38', go: () => layOut('todo', 'soon') });
      for (const g of st.groups) {
        const list = st.tasks.filter((t) => t.group === g.id && !t.done && !t.archived);
        out.push({ kind: 'todos', name: g.name, count: list.length, line: list.length ? list.length + ' waiting' : 'Empty', peek: list.slice(0, 2).map((t) => t.name).join(' · ') || 'Nothing here yet', icon: g.icon || 'check', color: g.id === 'inbox' ? '#C98A1E' : '#1F6F87', go: () => layOut('todo', g.id) });
      }
      if (SR.useDinners()) out.push({ kind: 'meals', name: 'Dinners', count: null, line: 'This week and the pantry', peek: 'Drop a recipe on a night', icon: 'pot', color: '#3B7F45', go: () => layOut('dinners') });
      if (SR.useTogether()) out.push({ kind: 'meals', name: SR.withName(), count: null, line: 'Ideas for time together', peek: (D.IDEA_KINDS || []).map((k) => k.name).slice(0, 3).join(' · '), icon: 'heart', color: '#8A5AA6', go: () => layOut('kim') });
      return out;
    }
    function openTodos() {
      closeMenu();
      let filter = 'all', q = '';
      openDock((card) => {
        const head = h('div', 'c-head');
        const words = h('div'); words.append(h('h2', '', 'To-dos'), h('p', 'k-lede', 'Pick a stack. Its pieces come out on the desk, ready to drag onto a day.'));
        const tools = h('div', 'c-tools');
        const seg = h('div', 'k-seg c-filter');
        [['all', 'Everything'], ['todos', 'Lists'], ['meals', 'Meals and ideas']].forEach(([id, name]) => {
          const b = Kit.btn('', name, () => { filter = id; draw(); }); b.dataset.f = id; seg.appendChild(b);
        });
        const find = h('input', 'c-find'); find.placeholder = 'Find a to-do'; find.setAttribute('aria-label', 'Find a to-do');
        find.addEventListener('input', () => { q = find.value.trim().toLowerCase(); draw(); });
        tools.append(seg, find);
        head.append(words, tools);
        const scroll = h('div', 'c-scroll');
        const grid = h('div', 'c-grid');
        scroll.appendChild(grid);
        card.append(head, scroll);
        function cardFor(c, i) {
          const b = h('button', 'c-card'); b.style.setProperty('--i', i);
          const top = h('div', 'c-card-top');
          const m = h('span', 'c-mark'); m.style.setProperty('--c', c.color); m.appendChild(SR.icon(c.icon, 10, '#FFFFFF'));
          top.appendChild(m);
          if (c.count) top.appendChild(h('span', 'c-n', String(c.count)));
          b.append(top, h('b', '', c.name), h('span', 'c-line', c.line), h('span', 'c-peek', c.peek));
          b.addEventListener('click', () => { c.go(); grid.querySelectorAll('.c-card').forEach((x) => x.classList.remove('on')); b.classList.add('on'); });
          return b;
        }
        function draw() {
          seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === filter)));
          grid.replaceChildren();
          const all = stacks().filter((c) => !q || (c.name + ' ' + c.peek).toLowerCase().includes(q) || (c.kind === 'todos' && SR.state.tasks.some((t) => !t.done && t.name.toLowerCase().includes(q) && (c.name === 'Due soon' || SR.state.groups.find((g) => g.name === c.name && g.id === t.group)))));
          const lists = all.filter((c) => c.kind === 'todos'), meals = all.filter((c) => c.kind === 'meals');
          let i = 0;
          if (filter !== 'meals') {
            if (filter === 'all') grid.appendChild(h('h3', 'c-sect', 'Lists'));
            lists.forEach((c) => grid.appendChild(cardFor(c, i++)));
            const nw = h('button', 'c-card c-new');
            nw.append(h('span', 'c-plus', '+'), h('b', '', 'New to-do'), h('span', 'c-line', 'Jot it down, place it later'));
            nw.addEventListener('click', () => { Kit.add(); });
            grid.appendChild(nw);
          }
          if (filter !== 'todos' && meals.length) {
            if (filter === 'all') grid.appendChild(h('h3', 'c-sect', 'Meals and ideas'));
            meals.forEach((c) => grid.appendChild(cardFor(c, i++)));
          }
          if (!grid.querySelector('.c-card:not(.c-new)') && q) grid.appendChild(h('p', 'c-none', 'Nothing called that. Try fewer letters.'));
        }
        draw();
      });
    }

    /* == saved: the board's own save words, read from its hidden date card == */
    const saveSrc = document.querySelector('#hud .save-state');
    function saved() {
      const cls = ['error', 'saving', 'offline', 'preview'].find((c) => saveSrc && saveSrc.classList.contains(c)) || 'saved';
      const long = saveSrc && saveSrc.title ? saveSrc.title.replace(/\. Tap for Your data\.$/, '') : 'Saved in this browser on this device';
      return { cls, long };
    }
    function drawSave() {
      const st = saved();
      saveDot.className = 'c-save ' + st.cls;
      me.setAttribute('aria-label', meName.textContent + '. ' + st.long + '. Settings and everything else');
    }
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
      const item = (label, ic, fn, cls) => { const b = Kit.btn('c-mi ' + (cls || ''), label, () => { closeMenu(); fn(); }, ic, cls && cls.includes('gold') ? ESP : CREAM); b.setAttribute('role', 'menuitem'); return b; };
      menu.appendChild(item('Settings', 'sliders', () => Kit.settings(), 'first'));
      menu.appendChild(h('div', 'c-mlabel', 'Go to'));
      menu.append(item('Today', 'sun', () => Kit.zoom('today')), item('Calendar', 'calendar', () => Kit.zoom(SR.inToday() ? 'week' : SR.view.zoom)), item('To-dos', 'flag', deskTodos), item('Block library', 'box', blockLibrary));
      if (SR.useDinners()) menu.appendChild(item('Dinners', 'pot', () => layOut('dinners')));
      if (SR.useTogether()) menu.appendChild(item(SR.withName(), 'heart', () => layOut('kim')));
      menu.append(item('Focus on one thing', 'star', Kit.focus), item('Pomodoro timer', 'bell', openTimer), item('The week as a list', 'list', Kit.list), item('Letter rack', 'box', showRack));
      menu.appendChild(h('hr'));
      const snd = SR.view.sound !== false;
      menu.append(item('Dev mode', 'sliders', () => Kit.settings('dev')), item('How it works', 'help', Kit.help), item(snd ? 'Sound is on' : 'Sound is off', snd ? 'sound' : 'mute', () => Kit.settings('reading')));
      app.appendChild(menu);
      me.setAttribute('aria-expanded', 'true');
      setTimeout(() => { const f = menu && menu.querySelector('.c-mi'); if (f) f.focus(); }, 20);
    }
    function closeMenu() {
      if (!menu) return;
      menu.remove(); menu = null;
      me.setAttribute('aria-expanded', 'false');
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
      const step = (label, key, d) => { const b = Kit.btn('c-tstep', label, () => setLens(Math.max(5, Math.min(90, pom.work + (key === 'work' ? d : 0))), Math.max(5, Math.min(30, pom.rest + (key === 'rest' ? d : 0))))); b.setAttribute('aria-label', (d > 0 ? 'Longer ' : 'Shorter ') + key); return b; };
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
      document.title = 'Sunday Reset · Corners V7';
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
      else if (pomo.dataset.was === '1') document.title = 'Sunday Reset · Corners V7';
      pomo.dataset.was = running ? '1' : '';
      if (pomo.hidden === running) sync();
    }
    pomo.append(h('i', 'c-pdot'), h('b', 'c-pt'), h('span', 'c-pl', 'Pomodoro'));
    setInterval(tick, 500);
    window.addEventListener('resize', () => requestAnimationFrame(place));
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
    const stepLine = (k) => ({ back: 'What to keep, what to change', ahead: 'Anything coming up', shape: 'Which kind of week', yours: 'Blocks of your own', todo: 'Give them a time', dinners: 'And who cooks', kim: 'One thing together', done: '' }[k] || '');
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
    const minutesOf = (keys, catchup) => {
      const n = keys.reduce((a, k) => a + ((catchup ? CATCH_MIN : STEP_MIN)[k] || 2), 0);
      return catchup ? n : Math.max(10, Math.round(n / 5) * 5);
    };
    const rec = (ws) => SR.state.weeks[ws] && SR.state.weeks[ws].reset;
    const hiddenMid = () => { try { return localStorage.getItem('sundayreset.v7.hideMid'); } catch (e) { return null; } };
    const numWord = (n) => ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] || String(n);
    const planned = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.planned') || '{}'); } catch (e) { return {}; } })();
    const savePlanned = () => { try { localStorage.setItem('sundayreset.v7.planned', JSON.stringify(planned)); } catch (e) { /* fine */ } };
    let snooze = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.snooze') || 'null'); } catch (e) { return null; } })();
    const saveSnooze = () => { try { localStorage.setItem('sundayreset.v7.snooze', JSON.stringify(snooze)); } catch (e) { /* fine */ } };

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
      const quick = runSteps(cur, true);
      if (hiddenMid() === cur) return { kind: 'none', label: '' };
      return { kind: 'midweek', label: 'Plan the rest of the week', meta: minutesOf(quick, true) + ' min', title: 'To-dos and dinners for the days left', go: () => openIntro(cur, true) };
    }
    const rchip = h('button', 'c-rchip'); rchip.type = 'button';
    rchip.addEventListener('click', () => { SR.Snd.init(); const s = chipState(); if (s.go) s.go(); });
    function drawChip() {
      const s = chipState();
      rchip.className = 'c-rchip ' + s.kind;
      rchip.hidden = s.kind === 'none';
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
        left.appendChild(h('h2', 'c-intro-h', catchup ? 'Plan the rest of the week.' : 'Set up your week.'));
        left.appendChild(h('p', 'c-intro-p', catchup ? 'Nothing else on your week changes.' : 'Stop after any step. You’ll pick up where you left off.'));
        /* what's waiting, as plain facts, never a verdict */
        const due = Kit.dueCount(), nights = (counts.openNights || []).length;
        const bits = [];
        if (due) bits.push(due + (due === 1 ? ' to-do due' : ' to-dos due'));
        if (nights && SR.useDinners()) bits.push(nights + (nights === 1 ? ' night without dinner' : ' nights without dinner'));
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
          try { localStorage.setItem('sundayreset.v7.hideMid', ws); } catch (e) { /* fine */ }
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
      const rack = document.getElementById('rack');
      /* the panel stands on the left while it runs; the board measures its room again as soon as it moves */
      if (rack && (rack.dataset.edge || '') !== (r ? 'left' : '')) {
        if (r) rack.dataset.edge = 'left'; else delete rack.dataset.edge;
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

    /* == This week's plan: what the chip opens once the week is set == */
    function openPlan(ws) {
      closeMenu();
      const dates = M.range(ws, 7), st = SR.state, me = (SR.who() && SR.who().name) || 'You';
      const title = ws === M.weekStart(SR.today) || ws > SR.today ? (ws > SR.today && M.weekday(SR.today) === 6 ? 'Next week’s plan' : 'This week’s plan') : 'That week’s plan';
      Kit.sheet(title, (card) => {
        const draw = () => {
          [...card.children].forEach((c) => { if (!c.classList.contains('k-x')) c.remove(); });
          const head = h('div', 'c-plan-head');
          const words = h('div');
          const at = planned[ws];
          let kick = M.spanText(ws, M.addDays(ws, 6));
          if (at) { const d = new Date(at); kick = 'Planned ' + M.dateText(M.iso(d.getFullYear(), d.getMonth() + 1, d.getDate()), 'long') + ' at ' + M.clock(d.getHours() * 60 + d.getMinutes()); }
          words.append(h('div', 'c-kick', kick), h('h2', '', title), h('p', 'k-lede', 'Tap anything to change it.'));
          const acts = h('div', 'c-plan-acts');
          acts.append(Kit.btn('c-ghost', 'Open the week', () => { Kit.closeSheet(); Kit.zoom('week'); SR.view.focus = ws; SR.render(); }),
            Kit.btn('c-go', 'Redo the reset', () => { Kit.closeSheet(); SR.startReset(ws); }));
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
              const w = { home: 'Home', order: 'Order', out: 'Out', leftovers: 'Leftovers', skip: 'Skip' }[x.cook];
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
              row.addEventListener('click', () => { Kit.closeSheet(); if (SR.inToday()) SR.setMode('planner'); SR.openSel({ type: 'dinner', date: d }); });
              box.appendChild(row);
            });
            grid.appendChild(box);
          }

          /* to-dos with a time this week */
          const tbox = h('section', 'c-pcard'); tbox.appendChild(h('h3', '', 'To-dos'));
          const pl = M.placements(st), items = [];
          pl.forEach((list, id) => {
            const t = SR.taskById(id); if (!t) return;
            const p = list.filter((x) => x.date >= ws && x.date <= dates[6]).sort((a, b) => (a.date + a.add.start < b.date + b.add.start ? -1 : 1))[0];
            if (p) items.push({ t, date: p.date, start: p.add.start });
          });
          items.sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));
          if (!items.length) tbox.appendChild(h('p', 'c-pnone', 'Nothing with a time this week.'));
          items.forEach((it) => {
            const row = h('div', 'c-trow' + (it.t.done ? ' done' : ''));
            const box2 = h('button', 'c-check' + (it.t.done ? ' on' : '')); box2.type = 'button';
            box2.setAttribute('aria-label', (it.t.done ? 'Mark not done: ' : 'Mark done: ') + it.t.name);
            if (it.t.done) box2.appendChild(SR.icon('check', 7, '#FFFFFF'));
            box2.addEventListener('click', () => { SR.Snd.init(); SR.commit(() => SR.markDone(it.t, null, !it.t.done)); if (SR.Snd.clack) SR.Snd.clack(0.7); draw(); });
            row.append(box2, h('span', 'c-tname', it.t.name), h('span', 'c-twhen', it.t.done ? 'Done' : M.DAY_SHORT[M.weekday(it.date)] + ', ' + M.clock(it.start)));
            tbox.appendChild(row);
          });
          if (items.length > 1) {
            const left = items.filter((x) => !x.t.done && (x.date > SR.today || (x.date === SR.today && x.start >= SR.nowMin)));
            const done = items.filter((x) => x.t.done).length;
            tbox.appendChild(h('p', 'c-pfoot', done + ' of ' + items.length + ' done.' + (left[0] ? ' Next: ' + left[0].t.name + ', ' + M.DAY_LONG[M.weekday(left[0].date)] + '.' : '')));
          }
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

          /* something changed: one thing, not the whole reset again */
          const ch = h('section', 'c-changed');
          ch.append(h('h3', '', 'Something changed?'), h('p', '', 'Change one thing. No need to redo the reset.'));
          const row = h('div', 'c-fixes');
          const fix = (name, line, fn) => { const b = Kit.btn('c-fix', '', () => { Kit.closeSheet(); fn(); }); b.replaceChildren(h('b', '', name), h('span', '', line)); return b; };
          if (SR.useDinners()) row.appendChild(fix('Move a dinner', 'Swap nights or change who cooks', () => layOut('dinners')));
          row.appendChild(fix('Add a to-do', 'Give it a time this week', () => { if (SR.inToday()) SR.setMode('planner'); SR.openSel({ type: 'newTask', group: null }); }));
          row.appendChild(fix('Lighter day', 'Pick an easier kind of day', () => {
            Kit.zoom('day'); SR.view.focus = SR.today >= ws && SR.today <= dates[6] ? SR.today : ws; SR.render();
            setTimeout(() => { const k = document.querySelector('#kinds button'); if (k) k.click(); }, 350);
          }));
          if (ws === M.weekStart(SR.today) && M.weekday(SR.today) !== 0) row.appendChild(fix('Plan the rest of the week', 'To-dos and dinners, ' + minutesOf(runSteps(ws, true), true) + ' min', () => openIntro(ws, true)));
          ch.appendChild(row);
          card.appendChild(ch);
        };
        draw();
      }, 'c-plan');
    }

    /* for trying the states by hand: Kit.v3.openIntro(ws, catchup), Kit.v3.openPlan(ws), Kit.v3.chipState() */
    Kit.v7 = { startHello, showRack, scatter: (w) => scatter(w.split('')), openIntro, openPlan, chipState, runSteps, openMealBoard, openDetail, openTodos, closeMat };

    /* the time a reset was finished, for the plan's kicker */
    let resetWas = null;
    function notePlanned() {
      const r = SR.view.reset;
      if (resetWas && !r) { const x = rec(resetWas); if (x && (x.done || x.caught) && !planned[resetWas]) { planned[resetWas] = Date.now(); savePlanned(); } }
      resetWas = r ? r.week : null;
    }

    /* == V4: dragging blocks by hand. Lift, follow the pointer, snap into a slot, land with a tap == */
    const snd = (k, a) => { try { if (SR.Snd[k]) SR.Snd[k](a); } catch (e) { /* fine */ } };
    function draggable(el, payload, cfg) {
      el.classList.add('c-drag');
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('.c-nodrag')) return;
        SR.Snd.init();
        const r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
        let ghost = null, over = null, moved = false;
        const move = (ev) => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!moved && Math.hypot(dx, dy) < 6) return;
          if (!moved) {
            moved = true;
            ghost = el.cloneNode(true); ghost.classList.add('c-ghost-block'); ghost.classList.remove('c-drag');
            ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
            document.body.appendChild(ghost);
            el.classList.add('c-lifted'); snd('pick');
          }
          ghost.style.transform = 'translate(' + (r.left + dx) + 'px,' + (r.top + dy) + 'px) rotate(-2deg) scale(1.07)';
          ghost.style.visibility = 'hidden';
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          ghost.style.visibility = '';
          let z = under && under.closest('[data-zone]');
          if (z && cfg.accept && !cfg.accept(z, payload)) z = null;
          if (z !== over) { if (over) over.classList.remove('c-over'); over = z; if (over) { over.classList.add('c-over'); snd('detent'); } }
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          if (!moved) { if (cfg.onTap) cfg.onTap(payload, el); return; }
          el.classList.remove('c-lifted');
          const target = over;
          if (target) {
            target.classList.remove('c-over');
            const tr = target.getBoundingClientRect();
            ghost.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
            ghost.style.transform = 'translate(' + (tr.left + (tr.width - r.width) / 2) + 'px,' + (tr.top + (tr.height - r.height) / 2) + 'px) scale(1)';
            setTimeout(() => { ghost.remove(); cfg.onDrop(target, payload); snd('clack', 0.85); }, 190);
          } else {
            ghost.style.transition = 'opacity 0.18s, transform 0.18s';
            ghost.style.opacity = '0';
            setTimeout(() => ghost.remove(), 190);
            if (cfg.onOut) { cfg.onOut(payload); snd('slide'); }
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
    function openMat(cls, build, onClose) {
      closeMat(true);
      closeMenu(); Kit.closeSheet(); closeDock();
      document.body.classList.add('c-away');
      World.setPropsAway(true); World.setAway(1);
      snd('slide');
      deskSurfaces();
      mat = h('section', 'k c-mat ' + (cls || '')); mat.setAttribute('role', 'dialog'); mat.setAttribute('aria-modal', 'false');
      const inner = h('div', 'c-mat-in');
      mat.appendChild(inner);
      build(inner);
      app.appendChild(mat);
      matClose = onClose || null;
      requestAnimationFrame(() => mat && mat.classList.add('in'));
      return inner;
    }
    /* the second mat wears the desk's own wood, groove, and leather, read from the 3D desk once */
    let surfaces = false;
    function deskSurfaces() {
      if (surfaces || !World.surface) return;
      const set = (name, k) => { const u = World.surface(k); if (u) document.body.style.setProperty(name, 'url(' + u + ')'); };
      set('--s-board', 'board'); set('--s-groove', 'groove'); set('--s-leather', 'leather');
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mat && !document.getElementById('side').contains(document.activeElement)) { e.preventDefault(); e.stopImmediatePropagation(); closeMat(); } }, true);
    const matHead = (inner, kick, title, onDone, doneWord) => {
      const head = h('div', 'c-mat-head');
      const words = h('div'); words.append(h('div', 'c-kick', kick), h('h2', '', title));
      head.append(words, Kit.btn('c-go', doneWord || 'Done', onDone));
      inner.appendChild(head);
    };

    /* == V4: breakfast, lunch, and dinner. Dinner lives on the board; breakfast and lunch on this device == */
    const meals = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.meals') || '{}'); } catch (e) { return {}; } })();
    const saveMeals = () => { try { localStorage.setItem('sundayreset.v7.meals', JSON.stringify(meals)); } catch (e) { /* fine */ } };
    const MEAL_KINDS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']];
    const QUICK = {
      breakfast: ['Oatmeal', 'Eggs and toast', 'Yogurt and fruit', 'Smoothie', 'Cereal', 'Pancakes'],
      lunch: ['Sandwiches', 'Salad', 'Leftovers', 'Soup', 'Wraps', 'Packed lunch'],
      easy: [['leftovers', 'Leftovers'], ['order', 'Order in'], ['out', 'Eat out'], ['skip', 'Skip']]
    };
    const MEAL_COLOR = { breakfast: '#C98A1B', lunch: '#2E7D8C', dinner: '#3B7F45', easy: '#6E5A48' };
    const dinnerOf = (d) => SR.state.dinners[d];
    const hasDinnerBlock = (d) => SR.day(d).blocks.some((b) => b.dinner);
    const mealName = (d, k) => {
      if (k !== 'dinner') return (meals[d] || {})[k] || '';
      const x = dinnerOf(d);
      if (!x) return '';
      if (x.name) return x.name;
      const e = QUICK.easy.find(([id]) => id === x.cook);
      return e ? e[1] : '';
    };
    function setMeal(d, k, item) {
      if (k !== 'dinner') {
        meals[d] = meals[d] || {};
        if (item) meals[d][k] = item.name; else delete meals[d][k];
        saveMeals();
        return;
      }
      SR.commit(() => {
        const st = SR.state;
        if (!item) { delete st.dinners[d]; return; }
        const was = st.dinners[d] || {};
        if (item.easy) st.dinners[d] = { name: '', cook: item.easy, items: [] };
        else st.dinners[d] = { name: item.name, recipe: item.recipe || undefined, cook: was.cook && !['leftovers', 'order', 'out', 'skip'].includes(was.cook) ? was.cook : 'me', items: item.items || [] };
        if (!st.dinners[d].recipe) delete st.dinners[d].recipe;
      });
    }

    function openMealBoard(ws) {
      ws = ws || (SR.view.reset ? SR.view.reset.week : M.weekStart(SR.view.focus || SR.today));
      const dates = M.range(ws, 7);
      let showRows = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.mealRows') || 'null'); } catch (e) { return null; } })() || ['breakfast', 'lunch', 'dinner'];
      const inner = openMat('c-meals', (inner) => {
        matHead(inner, 'Meals · ' + M.spanText(ws, M.addDays(ws, 6)), 'Plan the week’s meals', () => closeMat());
        const rows = h('div', 'c-mealtoggles'); rows.setAttribute('role', 'group'); rows.setAttribute('aria-label', 'Meals to plan');
        const board = h('div', 'c-woodboard c-mealgrid');
        const tray = h('div', 'c-tray');
        inner.append(rows, board, tray);
        function draw() {
          rows.replaceChildren(h('span', 'c-tlabel', 'Show'));
          MEAL_KINDS.forEach(([k, name]) => {
            const on = showRows.includes(k);
            const b = Kit.btn('c-pill' + (on ? ' on' : ''), name, () => {
              showRows = on ? showRows.filter((x) => x !== k) : MEAL_KINDS.map(([x]) => x).filter((x) => x === k || showRows.includes(x));
              if (!showRows.length) showRows = ['dinner'];
              try { localStorage.setItem('sundayreset.v7.mealRows', JSON.stringify(showRows)); } catch (e) { /* fine */ }
              draw();
            });
            b.setAttribute('aria-pressed', String(on));
            rows.appendChild(b);
          });
          board.replaceChildren();
          board.style.setProperty('--rows', showRows.length);
          board.appendChild(h('span'));
          dates.forEach((d) => { const c = h('div', 'c-mhead' + (d === SR.today ? ' today' : '')); c.append(h('b', '', M.DAY_SHORT[M.weekday(d)]), h('span', '', String(M.parts(d).d))); board.appendChild(c); });
          showRows.forEach((k) => {
            board.appendChild(h('div', 'c-mrow', MEAL_KINDS.find(([x]) => x === k)[1]));
            dates.forEach((d) => {
              const cell = h('div', 'c-mcell');
              const away = SR.day(d).trip;
              if (k === 'dinner' && (away || !hasDinnerBlock(d))) { cell.classList.add('off'); cell.textContent = away ? 'Away' : 'No dinner'; board.appendChild(cell); return; }
              cell.dataset.zone = 'meal'; cell.dataset.date = d; cell.dataset.kind = k;
              const name = mealName(d, k);
              if (name) {
                const x = k === 'dinner' ? dinnerOf(d) : null;
                const easy = x && !x.name && QUICK.easy.some(([id]) => id === x.cook);
                const who = x && !easy ? (x.cook === 'me' ? me0() : x.cook === 'kim' ? (partnerName() || 'P').slice(0, 1) : '') : '';
                const blk = domBlock(name, '', MEAL_COLOR[easy ? 'easy' : k], '#FFFFFF', 'c-in-cell' + (justSet === d + k ? ' c-land' : ''));
                if (who) { const tag = h('span', 'c-cook c-nodrag', who); tag.title = 'Who cooks · tap to change'; blk.appendChild(tag); tag.addEventListener('click', (e) => { e.stopPropagation(); cycleCook(d); }); }
                draggable(blk, { name, from: { d, k }, easy: easy ? x.cook : null, recipe: x && x.recipe, items: x && x.items }, {
                  accept: (z, p) => accepts(z, p),
                  onDrop: (z, p) => { moveMeal(p, z.dataset.date, z.dataset.kind); },
                  onOut: (p) => { setMeal(p.from.d, p.from.k, null); draw(); },
                  onTap: () => { if (k === 'dinner') cycleCook(d); }
                });
                cell.appendChild(blk);
              } else cell.appendChild(h('span', 'c-mplus', '+'));
              board.appendChild(cell);
            });
          });
          justSet = '';
          drawTray();
        }
        const me0 = () => ((SR.who() && SR.who().name) || 'Y').slice(0, 1).toUpperCase();
        let justSet = '';
        function cycleCook(d) {
          const x = dinnerOf(d); if (!x || !x.name) return;
          const order = ['me'].concat(partnerName() ? ['kim'] : [], ['home']);
          const next = order[(order.indexOf(x.cook) + 1) % order.length];
          SR.commit(() => { SR.state.dinners[d].cook = next; });
          snd('detent'); draw();
        }
        const accepts = (z, p) => {
          if (p.easy && z.dataset.kind !== 'dinner') return false;
          if (p.only && p.only !== z.dataset.kind) return false;
          return true;
        };
        function moveMeal(p, d, k) {
          if (p.from) {
            if (p.from.d === d && p.from.k === k) return;
            if (p.from.k === 'dinner' && k === 'dinner') {
              SR.commit(() => { const st = SR.state, a = st.dinners[p.from.d], b = st.dinners[d]; st.dinners[d] = a; if (b) st.dinners[p.from.d] = b; else delete st.dinners[p.from.d]; });
            } else { setMeal(d, k, p.easy ? { easy: p.easy } : { name: p.name, recipe: p.recipe, items: p.items }); setMeal(p.from.d, p.from.k, null); }
          } else setMeal(d, k, p.easy ? { easy: p.easy } : { name: p.name, recipe: p.recipe, items: p.items });
          justSet = d + k; draw();
        }
        function drawTray() {
          tray.replaceChildren();
          const group = (title, items) => {
            if (!items.length) return;
            const g = h('div', 'c-tgroup'); g.appendChild(h('div', 'c-kick', title));
            const row = h('div', 'c-trow2'); items.forEach((x) => row.appendChild(x)); g.appendChild(row); tray.appendChild(g);
          };
          const piece = (name, kind, payload, sub) => { const b = domBlock(name, sub, MEAL_COLOR[kind], '#FFFFFF', 'c-piece'); draggable(b, payload, { accept: (z, p) => accepts(z, p), onDrop: (z, p) => moveMeal(p, z.dataset.date, z.dataset.kind) }); return b; };
          if (showRows.includes('dinner')) {
            const seen = new Set(); const recent = [];
            Object.keys(SR.state.dinners).sort().reverse().forEach((d) => { const x = SR.state.dinners[d]; if (x && x.name && !seen.has(x.name) && d < ws) { seen.add(x.name); recent.push(x); } });
            group('Dinners you make', (SR.state.recipes || []).map((r) => piece(r.name, 'dinner', { name: r.name, recipe: r.id, items: r.items, only: 'dinner' }, r.dur ? M.dur(r.dur) : '')));
            group('Recently', recent.slice(0, 6).filter((x) => !(SR.state.recipes || []).some((r) => r.name === x.name)).map((x) => piece(x.name, 'dinner', { name: x.name, items: x.items || [], only: 'dinner' })));
            group('Easy nights', QUICK.easy.map(([id, n]) => piece(n, 'easy', { name: n, easy: id })));
          }
          if (showRows.includes('breakfast')) group('Breakfast', QUICK.breakfast.map((n) => piece(n, 'breakfast', { name: n, only: 'breakfast' })));
          if (showRows.includes('lunch')) group('Lunch', QUICK.lunch.map((n) => piece(n, 'lunch', { name: n })));
          /* your own words become a block you can drag */
          const own = h('div', 'c-tgroup');
          own.appendChild(h('div', 'c-kick', 'Your own'));
          const f = h('form', 'c-ownform');
          const inp = h('input', 'c-find'); inp.placeholder = 'Type a meal, press Enter'; inp.setAttribute('aria-label', 'A meal of your own');
          const ownRow = h('div', 'c-trow2');
          f.appendChild(inp);
          f.addEventListener('submit', (e) => { e.preventDefault(); const n = inp.value.trim(); if (!n) return; ownRow.prepend(piece(n, 'dinner', { name: n })); inp.value = ''; snd('clack', 0.6); });
          own.append(f, ownRow);
          tray.appendChild(own);
        }
        draw();
      }, () => { SR.render(); });
      return inner;
    }

    /* == V4: a block's own mat. Tap a block twice: it lifts, the camera slides over, and its details land on a mat == */
    const routines = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.routines') || '{}'); } catch (e) { return {}; } })();
    const saveRoutines = () => { try { localStorage.setItem('sundayreset.v7.routines', JSON.stringify(routines)); } catch (e) { /* fine */ } };
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
        const head = h('div', 'c-rhead'); head.append(h('div', 'c-kick', 'Your routine'), h('span', 'c-rtotal', list.length ? 'About ' + M.dur(total) + (total > b.dur + 5 ? ', longer than the block' : '') : 'Drag exercises in'));
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
          const minus = Kit.btn('c-tstep', '−', () => bump(-1)), plus = Kit.btn('c-tstep', '+', () => bump(1));
          minus.setAttribute('aria-label', x.name + ', less'); plus.setAttribute('aria-label', x.name + ', more');
          steps.append(minus, plus);
          blk.appendChild(steps);
          draggable(blk, { from: i }, {
            onDrop: (z, p) => { const to = +z.dataset.at; const arr = routines[key]; const [it] = arr.splice(p.from, 1); arr.splice(Math.min(to, arr.length), 0, it); saveRoutines(); draw(); },
            onOut: (p) => { routines[key].splice(p.from, 1); saveRoutines(); draw(); }
          });
          groove.appendChild(blk);
        });
        if (!list.length) groove.appendChild(h('span', 'c-gempty', 'Drop exercises here, in order'));
        box.appendChild(groove);
        const lib = h('div', 'c-trow2');
        EXERCISES.forEach((x) => {
          const p = domBlock(x.name, exWords(x), '#9C7A45', '#FFFFFF', 'c-piece c-ex');
          draggable(p, x, { onDrop: (z) => { routines[key] = routines[key] || []; routines[key].splice(Math.min(+z.dataset.at, routines[key].length), 0, Object.assign({}, x)); saveRoutines(); draw(); } });
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
      if (sel && (sel.type === 'block' || sel.type === 'dinner') && !detail && !v.reset && !v.phone && !mat) openDetail(sel);
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
      dock = h('aside', 'k c-dock'); dock.dataset.edge = 'left'; dock.setAttribute('aria-label', 'To-dos');
      const x = Kit.btn('k-x', '', closeDock, 'x'); x.setAttribute('aria-label', 'Close To-dos');
      dock.appendChild(x);
      build(dock);
      app.appendChild(dock);
      document.body.classList.add('c-docked');
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
      World.setPropsAway(!!r || !!mat);
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
      if (panelOff) delete rack.dataset.edge; else rack.dataset.edge = 'left';
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
        if (x.trip && !seenTrip.has(x.trip)) { seenTrip.add(x.trip); out.push({ d, name: x.trip, icon: 'plane' }); }
      });
      (SR.M.liveEvents ? SR.M.liveEvents(SR.state) : SR.state.events || []).forEach((e) => {
        if (e.kind === 'timed' && e.date >= from && e.date <= M.addDays(from, days - 1)) out.push({ d: e.date, name: e.name + ', ' + M.clock(e.start), icon: e.icon || 'star' });
      });
      return out.sort((a, b) => (a.d < b.d ? -1 : 1));
    }
    function shapeTodo(body) {
      if (body.querySelector('.c-sum')) return;
      body.querySelectorAll('.stat').forEach((s) => s.remove());
      const soon = M.dueSoon(SR.state, SR.today, 21, SR.nowMin);
      const need = soon.filter((x) => x.status !== 'planned').length;
      const r = SR.view.reset, from = r.catchup ? SR.today : r.week;
      const cap = M.capacity ? M.capacity(SR.state, from, M.diffDays(from, M.addDays(r.week, 6)) + 1, SR.today, SR.nowMin) : null;
      const sum = h('div', 'c-sum');
      const line = (big, words) => { const p = h('p'); p.append(h('b', '', big), document.createTextNode(' ' + words)); return p; };
      if (need) sum.appendChild(line(String(need), need === 1 ? 'to-do due soon has no time yet' : 'to-dos due soon have no time yet'));
      else sum.appendChild(line('All', 'to-dos due soon have a time'));
      if (cap) sum.appendChild(line(M.hours(cap.room), 'open this week' + (cap.need ? ', and they need about ' + M.hours(cap.need) : '')));
      body.prepend(sum);
      const grid = h('div', 'c-tilegrid');
      [...body.querySelectorAll(':scope > .tile, :scope > .tile-wrap, :scope > [class*="add"]')].forEach((t) => grid.appendChild(t));
      sum.after(grid);
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
      dates.forEach((d) => {
        const row = h('label', 'c-mline');
        const inp = h('input', 'c-find'); inp.value = mealName(d, mealTab); inp.placeholder = QUICK[mealTab][M.weekday(d) % QUICK[mealTab].length];
        inp.addEventListener('change', () => { setMeal(d, mealTab, inp.value.trim() ? { name: inp.value.trim() } : null); snd('detent'); });
        row.append(h('span', 'c-pday', M.DAY_SHORT[M.weekday(d)] + ' ' + M.parts(d).d), inp);
        list.appendChild(row);
      });
      body.appendChild(list);
      body.appendChild(h('p', 'c-pnone', mealTab === 'lunch' ? 'Lunches stay on this device.' : 'Breakfasts stay on this device.'));
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
      if (b && b.tab === 'todo' && !SR.inToday()) { SR.view.bench = null; snd('slide'); SR.render(); return; }
      layOut('todo', 'soon');
    }
    function drawStackBar() {
      const b = SR.view.bench, on = !!(b && b.tab === 'todo') && !SR.view.reset && !mat && !dock;
      stackBar.hidden = !on;
      if (!on) return;
      const level = b.level || 'soon';
      const stacks = [['soon', 'Due soon', Kit.dueCount()]].concat((SR.state.groups || []).map((g) => [g.id, g.name, SR.state.tasks.filter((t) => !t.done && !t.archived && t.group === g.id).length]));
      const kids = stacks.map(([id, name, n]) => {
        const x = Kit.btn('c-stack' + (id === level ? ' on' : ''), name, () => { layOut('todo', id); });
        if (n) x.appendChild(h('span', 'c-sn', String(n)));
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
      const v = SR.view, names = usedKinds(), on = !SR.inToday() && v.zoom === 'day' && !v.reset && names.length > 0;
      kindChips.hidden = !on;
      if (!on) return;
      const pick = document.querySelector('#kinds .kinds-pick');
      const cur = pick ? pick.textContent.trim() : '';
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
    const POINTS = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
    const BAG = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ';
    let rack = (() => { try { const r = JSON.parse(localStorage.getItem('sundayreset.v7.rack') || 'null'); return Array.isArray(r) && r.length === SLOTS ? r : Array(SLOTS).fill(null); } catch (e) { return Array(SLOTS).fill(null); } })();
    /* a preview never touches the real rack: it's kept aside and comes back with Back to my board */
    let realRack = null;
    const saveRack = () => { if (SR.view.preview) return; try { localStorage.setItem('sundayreset.v7.rack', JSON.stringify(rack)); } catch (e) { /* fine */ } };
    let rackShown = (() => { try { return localStorage.getItem('sundayreset.v7.rackShown') === '1'; } catch (e) { return false; } })();
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
      t.setAttribute('aria-label', 'Letter ' + ch);
      dragTile(t);
      return t;
    }
    function drawRack() {
      const busy = !!(SR.view.reset || mat || detail || SR.inToday() || SR.view.phone);
      const on = (rackShown || hello) && !busy;
      rackWrap.hidden = !on;
      if (on) deskSurfaces();
      deskLayer.hidden = busy;
      slots.forEach((s, i) => {
        const want = rack[i];
        const have = s.firstChild && s.firstChild.dataset.ch;
        if (want !== (have || null)) { s.replaceChildren(); if (want) s.appendChild(tileEl(want)); }
        s.classList.toggle('want', !!(hello && hello.name && i < hello.name.length));
      });
    }
    /* letters land on the desk around the rack, a little turned, never in a pile */
    function scatter(letters) {
      const r = rackWrap.getBoundingClientRect(), W = window.innerWidth;
      const rnd = (a, b) => a + Math.random() * (b - a);
      letters.forEach((ch, i) => {
        const t = tileEl(ch);
        const left = i % 2 === 0;
        const x = left ? rnd(Math.max(40, r.left - 360), r.left - 70) : rnd(r.right + 30, Math.min(W - 80, r.right + 320));
        const y = rnd(r.bottom - 40, r.bottom + 140);
        putAt(t, x, y, rnd(-14, 14));
        deskLayer.appendChild(t);
        deskTiles.push(t);
        t.classList.add('c-drop');
        t.style.animationDelay = (i * 45) + 'ms';
      });
      snd('clack', 0.6);
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
        let over = null;
        const move = (ev) => {
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
    app.appendChild(helloCard);
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
        const raw = inp.value.trim(), w = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, SLOTS);
        if (!w) { inp.focus(); SR.toast('Type your name with letters A to Z.', ''); return; }
        hello.name = w; hello.raw = raw.charAt(0).toUpperCase() + raw.slice(1);
        drawRack();
        requestAnimationFrame(() => { SR.layoutInsets(); scatter(shuffle(w.split('').concat(dealLetters(3)))); });
        helloCard.replaceChildren(h('div', 'c-kick', 'Welcome'), h('h2', '', 'Drag your name onto the rack.'), h('p', '', 'Pick a letter up and drop it in a slot. Every block in Sunday Reset moves this way.'), Kit.btn('c-skip', 'Skip this', () => endHello(true)));
      });
      helloCard.append(h('div', 'c-kick', 'Welcome to Sunday Reset'), h('h2', '', 'What should we call you?'), f);
      drawRack();
      requestAnimationFrame(() => SR.layoutInsets());
      setTimeout(() => inp.focus(), 60);
    }
    function checkName() {
      if (!hello || !hello.name) return;
      const word = rack.slice(0, hello.name.length).join('');
      if (word !== hello.name) return;
      snd('chime');
      slots.slice(0, hello.name.length).forEach((s, i) => { const t = s.firstChild; if (t) { t.classList.remove('c-land'); t.style.animationDelay = (i * 70) + 'ms'; t.classList.add('c-hop'); } });
      helloCard.replaceChildren(h('div', 'c-kick', 'Nice to meet you, ' + hello.raw), h('h2', '', 'That’s the whole move.'), h('p', '', 'Blocks move the same way: pick one up, drop it on a day.'), Kit.btn('c-go', 'Open my week', () => endHello(false)));
    }
    function endHello(skipped) {
      const hh = hello; hello = null;
      helloCard.hidden = true;
      deskTiles.filter((t) => true).forEach((t) => { t.classList.add('c-gone'); setTimeout(() => t.remove(), 220); });
      deskTiles = [];
      try { localStorage.setItem('sundayreset.v7.met', '1'); } catch (e) { /* fine */ }
      if (!skipped && hh && hh.raw) { SR.commit(() => { SR.state.profile = Object.assign({}, SR.state.profile, { name: hh.raw }); }); rackShown = true; try { localStorage.setItem('sundayreset.v7.rackShown', '1'); } catch (e) { /* fine */ } }
      if (skipped) { rack = Array(SLOTS).fill(null); saveRack(); }
      drawRack(); SR.render();
      requestAnimationFrame(() => SR.layoutInsets());
    }
    /* a first visit gets the name moment; Dev's Brand new scenario plays it again in a preview */
    let helloPreview = null;
    function maybeHello() {
      const pv = SR.view.preview;
      if (pv && pv.id === 'firstrun' && helloPreview !== pv) { helloPreview = pv; startHello(true); return; }
      if (!pv) { helloPreview = null; if (realRack) { rack = realRack; realRack = null; putBack(); drawRack(); } }
      if (hello && hello.preview && !pv) { hello = null; helloCard.hidden = true; putBack(); }
      let met = true; try { met = localStorage.getItem('sundayreset.v7.met') === '1'; } catch (e) { /* fine */ }
      if (!met && !hello && !pv && !SR.view.phone) startHello(false);
    }

    /* == V7: Dev mode, always there on this link, for seeing the board as other people would == */
    try { localStorage.setItem('sundayreset.dev', '1'); } catch (e) { /* fine */ }

    /* == keeping the corners in step == */
    function sync() {
      const today = SR.inToday(), v = SR.view;
      tc.hidden = today;
      const running = !!pom.endsAt;
      pomo.hidden = !running;
      pomo.classList.toggle('rest', pom.phase !== 'work');
      bl.hidden = !running;
      const n = Kit.dueCount(); due.textContent = n ? String(n) : '';
      lib.setAttribute('aria-pressed', String(libOpen()));
      todos.setAttribute('aria-pressed', String(!today && !!v.bench && v.bench.tab !== 'blocks'));
      const p = SR.who(), name = (p && p.name) || 'You';
      meCircle.textContent = name.slice(0, 1).toUpperCase(); meName.textContent = name.split(' ')[0];
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
      }
      checkDetail();
      drawStackBar(); drawKindChips(); drawRack(); maybeHello();
      if (v.reset && SR.stepsNow()[v.reset.step].key === 'done') shareBox(document.getElementById('rack-body'), v.reset.week);
      const ag = document.getElementById('agenda');
      listBtn.setAttribute('aria-pressed', String(!!(ag && !ag.hidden)));
      requestAnimationFrame(() => { measure(); place(); });
    }
    /* Today's band and dock make room for the corners beside them */
    function measure() {
      const s = document.body.style;
      s.setProperty('--c-tl-w', me.offsetWidth + 'px');
      s.setProperty('--c-tr-w', tr.offsetWidth + 'px');
      s.setProperty('--c-bl-w', bl.offsetWidth + 'px');
      const rack = document.getElementById('rack');
      const rh = rack && SR.view.reset ? rack.offsetHeight + 'px' : '0px';
      if (s.getPropertyValue('--c-rack-h') !== rh) { s.setProperty('--c-rack-h', rh); SR.layoutInsets(); }
    }
    /* the reset's steps change height from step to step, and the corners ride on top of them */
    if (window.ResizeObserver && document.getElementById('rack')) new ResizeObserver(() => requestAnimationFrame(measure)).observe(document.getElementById('rack'));
    br.appendChild(rchip);
    tc.insertBefore(kindChips, days);
    Kit.renders.push(sync);
  });
})();
