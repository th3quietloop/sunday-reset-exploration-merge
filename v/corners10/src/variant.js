/* Corners V10: V9 with the setup on the desk (docs/CORNERS-V10.md). The questions lined up on a board,
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
    /* this device's own things (meals, routines, the rack, reminders): a Dev board or any preview never writes them */
    const keep = (k, v) => { if (SR.view.preview) return; try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* storage off */ } };
    const stored = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; } };
    /* Calendar, the menu, and the keys move the zoom from code; the switch shows it at once */
    /* one spelling: the reset's step says To-dos, like the button that opens them */
    { const st = (SR.D.STEPS || []).find((x) => x.key === 'todo'); if (st) st.title = 'To-dos'; }
    const zoom0 = Kit.zoom; Kit.zoom = (z) => { zoom0(z); Kit.sync(); };

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
      /* the sample week is someone made up; your own week is one setup away */
      if (p && p.sample && SR.openSetup) {
        const own = Kit.btn('c-mi gold c-ownweek', 'Set up my own week', () => { closeMenu(); openDeskSetup(); }, 'calendar', ESP);
        own.setAttribute('role', 'menuitem'); menu.appendChild(own);
        menu.appendChild(h('p', 'c-mnote', 'This is a sample week. About 5 minutes to make it yours.'));
      }
      const item = (label, ic, fn, cls) => { const b = Kit.btn('c-mi ' + (cls || ''), label, () => { closeMenu(); fn(); }, ic, cls && cls.includes('gold') ? ESP : CREAM); b.setAttribute('role', 'menuitem'); return b; };
      menu.appendChild(item('Settings', 'sliders', () => Kit.settings(), 'first'));
      /* Now, the zoom, the list, To-dos, and Block library are already on the screen; the menu holds the rest */
      if (SR.useDinners() || SR.useTogether()) {
        menu.appendChild(h('div', 'c-mlabel', 'Plan'));
        if (SR.useDinners()) menu.append(item('Meal board', 'pot', () => openMealBoard()), item('Dinners and groceries', 'cart', () => layOut('dinners')));
        if (SR.useTogether()) menu.appendChild(item(SR.withName(), 'heart', () => layOut('kim')));
      }
      menu.appendChild(h('div', 'c-mlabel', 'On the desk'));
      menu.append(item('Focus on one thing', 'star', Kit.focus), item('Pomodoro timer', 'bell', openTimer));
      menu.appendChild(h('hr'));
      const snd = SR.view.sound !== false;
      menu.append(item('How it works', 'help', Kit.help), item('Reading and sound', snd ? 'sound' : 'mute', () => Kit.settings('reading')), item('Dev mode', 'sliders', () => Kit.settings('dev')));
      /* two ways to set up, side by side, for trying them: each runs as someone new, and nothing is saved */
      menu.appendChild(h('div', 'c-mlabel', 'Try the setup'));
      menu.append(item('On the desk, with blocks', 'box', () => trySetup('desk')), item('In a card', 'list', () => trySetup('card')));
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
      document.title = 'Sunday Reset · Corners V10';
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
      else if (pomo.dataset.was === '1') document.title = 'Sunday Reset · Corners V10';
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
        /* to-dos from before this week are their own fact, said calmly, not counted as due this week */
        const dueList = M.dueSoon(SR.state, SR.today, 7, SR.nowMin), carried = dueList.filter((x) => x.task.due && x.task.due < SR.today).length, thisWeek = dueList.length - carried;
        const loose = (counts.unplaced || []).length;
        if (thisWeek) bits.push(thisWeek + (thisWeek === 1 ? ' to-do due this week' : ' to-dos due this week') + (loose ? ', ' + Math.min(loose, thisWeek) + ' without a time' : ', all with a time'));
        if (carried) bits.push(carried + (carried === 1 ? ' to-do carried over from before' : ' to-dos carried over from before'));
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
          /* the time it was planned, only for a week whose reset this board finished */
          const rr = rec(ws), at = rr && (rr.done || rr.caught) ? planned[ws] : null;
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
          /* what's due this week and still has no time, with one way to it */
          const loose = (SR.weekCounts(ws).unplaced || []);
          if (loose.length && ws <= SR.today) {
            const more = Kit.btn('c-plink', loose.length + (loose.length === 1 ? ' more, due this week, needs a time' : ' more, due this week, need a time'), () => { Kit.closeSheet(); layOut('todo', 'soon'); });
            tbox.appendChild(more);
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
          const doneToday = planned[ws] && new Date(planned[ws]).toDateString() === new Date().toDateString();
          if (ws === M.weekStart(SR.today) && M.weekday(SR.today) !== 0 && !doneToday) row.appendChild(fix('Plan the rest of the week', 'To-dos and dinners, ' + minutesOf(runSteps(ws, true), true) + ' min', () => openIntro(ws, true)));
          ch.appendChild(row);
          card.appendChild(ch);
        };
        draw();
      }, 'c-plan');
    }

    /* for trying the states by hand: Kit.v3.openIntro(ws, catchup), Kit.v3.openPlan(ws), Kit.v3.chipState() */
    Kit.v7 = { openDeskSetup: (o) => openDeskSetup(o), coachTour: (a) => coachTour(a), trySetup: (k) => trySetup(k), startHello, showRack, scatter: (w) => scatter(w.split('')), openIntro, openPlan, chipState, runSteps, openMealBoard, openDetail, openTodos, closeMat };

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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mat && !document.getElementById('side').contains(document.activeElement)) { e.preventDefault(); e.stopImmediatePropagation(); closeMat(); } }, true);
    const matHead = (inner, kick, title, onDone, doneWord) => {
      const head = h('div', 'c-mat-head');
      const words = h('div'); words.append(h('div', 'c-kick', kick), h('h2', '', title));
      head.append(words, Kit.btn('c-go', doneWord || 'Done', onDone));
      inner.appendChild(head);
    };

    /* == V4: breakfast, lunch, and dinner. Dinner lives on the board; breakfast and lunch on this device == */
    const meals = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v7.meals') || '{}'); } catch (e) { return {}; } })();
    const saveMeals = () => keep('sundayreset.v7.meals', meals);
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
        inner.appendChild(h('p', 'c-mathow', 'Drag a meal onto a day, or tap a meal and then a day. Drag one off the board to clear it.'));
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
              keep('sundayreset.v7.mealRows', showRows);
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
              cell.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && held) { e.preventDefault(); cell.click(); } });
              const away = SR.day(d).trip;
              if (k === 'dinner' && (away || !hasDinnerBlock(d))) { cell.classList.add('off'); cell.textContent = away ? 'Away' : 'No dinner'; board.appendChild(cell); return; }
              /* a day that's over keeps what it had, quietly, and takes nothing new */
              if (d < SR.today) { cell.classList.add('past'); const nm0 = mealName(d, k); cell.textContent = nm0 || ''; board.appendChild(cell); return; }
              cell.dataset.zone = 'meal'; cell.dataset.date = d; cell.dataset.kind = k; cell.tabIndex = 0; cell.setAttribute('aria-label', MEAL_KINDS.find(([x]) => x === k)[1] + ', ' + M.DAY_LONG[M.weekday(d)]);
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
        let justSet = '', held = null;
        /* a tapped piece is held until a cell takes it; tapping it again lets go */
        const hold = (payload, el) => {
          board.querySelectorAll('.c-held').forEach((x) => x.classList.remove('c-held'));
          tray.querySelectorAll('.c-held').forEach((x) => x.classList.remove('c-held'));
          held = held && held.p === payload ? null : { p: payload };
          if (held) { el.classList.add('c-held'); snd('pick'); }
          board.classList.toggle('c-holding', !!held);
        };
        board.addEventListener('click', (e) => {
          const z = e.target.closest('[data-zone="meal"]');
          if (!held || !z || !accepts(z, held.p)) return;
          const p = held.p; held = null; board.classList.remove('c-holding');
          moveMeal(p, z.dataset.date, z.dataset.kind); snd('clack', 0.85);
        });
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
          const piece = (name, kind, payload, sub) => { const b = domBlock(name, sub, MEAL_COLOR[kind], '#FFFFFF', 'c-piece'); b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', name + '. Tap, then tap a day'); b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hold(payload, b); } }); draggable(b, payload, { accept: (z, p) => accepts(z, p), onDrop: (z, p) => moveMeal(p, z.dataset.date, z.dataset.kind), onTap: (p, el) => hold(p, el) }); return b; };
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
        if (!list.length) groove.appendChild(h('span', 'c-gempty', 'Drag exercises here in order, or tap one'));
        box.appendChild(groove);
        const lib = h('div', 'c-trow2');
        EXERCISES.forEach((x) => {
          const p = domBlock(x.name, exWords(x), '#9C7A45', '#FFFFFF', 'c-piece c-ex');
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
      dock = h('aside', 'k c-dock'); if (window.innerWidth >= 760) dock.dataset.edge = 'left'; dock.setAttribute('aria-label', 'To-dos');
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
    /* Your time offers your own blocks; work and meetings have their own time */
    function shapeYours(body) {
      const notMine = new Set((SR.state.palette || []).filter((b) => b.cat && b.cat !== 'yours').map((b) => b.name));
      body.querySelectorAll('.tile').forEach((t) => { const nm = t.querySelector('.nm'); if (nm && notMine.has(nm.textContent.trim())) t.hidden = true; });
    }
    /* the board says "to do"; the corners say "to-do". One spelling on every screen of this version */
    const WORDS = [[/\bNew to do\b/g, 'New to-do'], [/\bto dos\b/g, 'to-dos'], [/\bTo dos\b/g, 'To-dos'], [/\b(\d+|a|one|One) to do\b/g, '$1 to-do'], [/\bto do with a time\b/g, 'to-do with a time'], [/\bTo do\b(?= ·|$)/g, 'To-dos'],
      [/Here’s what you set up\.$/, 'Finish when it looks right. You can change anything after.']];
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
      if (b && b.tab === 'todo') { SR.view.bench = null; snd('slide'); SR.render(); return; }
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
      if (pv && pv.id === 'firstrun' && helloPreview !== pv) { helloPreview = pv; const k = trying || 'desk'; trying = null; if (k === 'card') SR.openSetup(); else openDeskSetup({ preview: true }); return; }
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
      let met10 = true; try { met10 = localStorage.getItem('sundayreset.v10.met') === '1'; } catch (e) { /* fine */ }
      if (!met10 && !su && !pv && !devStored() && SR.who() && SR.who().sample) { try { localStorage.setItem('sundayreset.v10.met', '1'); } catch (e) { /* fine */ } openDeskSetup(); }
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
    }
    function toggleDevMenu() {
      if (devMenu) { devMenu.remove(); devMenu = null; return; }
      const pv = SR.view.preview; if (!pv) return;
      devMenu = h('div', 'k c-menu c-devmenu'); devMenu.setAttribute('role', 'menu');
      devMenu.appendChild(h('div', 'c-devnote', (pv.label || 'A made up board') + '. Nothing here is saved, and it stays open until you go back.'));
      const it = (label, ic, fn) => { const b = Kit.btn('c-mi', label, () => { devMenu.remove(); devMenu = null; fn(); }, ic, CREAM); b.setAttribute('role', 'menuitem'); return b; };
      devMenu.append(it('Switch boards', 'sliders', () => Kit.settings('dev')), it('Back to my board', 'left', () => { try { localStorage.removeItem(DEV_BOARD); } catch (e) { /* fine */ } SR.endPreview(); }));
      app.appendChild(devMenu);
      const r = devChip.getBoundingClientRect(); devMenu.style.left = r.left + 'px'; devMenu.style.top = (r.bottom + 10) + 'px';
    }
    document.addEventListener('pointerdown', (e) => { if (devMenu && !devMenu.contains(e.target) && !devChip.contains(e.target)) { devMenu.remove(); devMenu = null; } }, true);

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
      const minus = Kit.btn('c-tstep', '−', () => bump(-1)), plus = Kit.btn('c-tstep', '+', () => bump(1));
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
    }
    function coachCard(kick, title, line, acts) {
      if (!coach) { coach = h('section', 'k c-coach'); coach.setAttribute('role', 'dialog'); coach.setAttribute('aria-live', 'polite'); app.appendChild(coach); }
      coach.replaceChildren(h('div', 'c-kick', kick), h('h3', '', title), h('p', '', line));
      const row = h('div', 'c-coach-acts');
      (acts || []).forEach((b) => row.appendChild(b));
      coach.appendChild(row);
    }
    function endCoach() { clearInterval(movesHold); if (coach) { coach.remove(); coach = null; } document.querySelectorAll('.c-coach-ring, .c-coach-ghost').forEach((x) => x.remove()); if (coachPoll) clearInterval(coachPoll); coachPoll = null; }
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
      coachCard('Your week is ready', a.name ? 'Here it is, ' + a.name + '.' : 'Here it is.', 'Built from your answers. Want a quick look at how to use it? Under a minute.', [Kit.btn('c-go', 'Show me', () => step1()), skip]);
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
      const n = Kit.dueCount(); due.textContent = n ? String(n) : '';
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
      requestAnimationFrame(() => { measure(); place(); });
    }
    /* Today's band and dock make room for the corners beside them */
    function measure() {
      const s = document.body.style;
      s.setProperty('--c-tl-w', me.offsetWidth + 'px');
      s.setProperty('--c-tr-w', tr.offsetWidth + 'px');
      s.setProperty('--c-bl-w', bl.offsetWidth + 'px');
      /* the band and the stack strip hang under the date chip; when it moves, the board measures its room again */
      const tcB = Math.round(tc.getBoundingClientRect().bottom) + 'px';
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
    kinds.appendChild(kindChips);
    Kit.renders.push(sync);
  });
})();
