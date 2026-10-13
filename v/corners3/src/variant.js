/* Corners V3: V2, with the Sunday Reset as a moment instead of a tab. One chip that changes through the
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
    me.append(meCircle, saveDot, meName, SR.icon('down', 7, '#B8B0A3'));
    me.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); toggleMenu(); });
    tl.append(me);
    /* top middle: the date; in the day view the kind of day and the week's seven days sit under it, as on the board's own date card */
    const tc = h('div', 'k k-chip c-tc'); tc.dataset.edge = 'top';
    const kinds = h('div', 'c-kinds'); Kit.kindsHome = kinds;
    const days = h('div', 'c-days');
    tc.append(Kit.dateControl(), kinds, days);
    const pills = document.getElementById('pills'), pillsFrom = pills && pills.parentElement, pillsNext = pills && pills.nextSibling;
    Kit.renders.push(() => {
      if (!pills) return;
      const want = !SR.inToday() && SR.view.zoom === 'day' ? days : pillsFrom;
      if (pills.parentElement !== want) { if (want === pillsFrom) pillsFrom.insertBefore(pills, pillsNext); else want.appendChild(pills); }
      tc.classList.toggle('c-dayview', want === days);
    });
    const tr = h('div', 'k k-chip c-tr'); tr.dataset.edge = 'top';
    tr.appendChild(Kit.zoomSwitch());

    /* bottom left: the Pomodoro, only while it runs (time to yourself lives on the board and in the reset, never as a meter) */
    const bl = h('div', 'k k-chip c-bl'); bl.dataset.edge = 'bottom';
    const pomo = h('button', 'c-pomo'); pomo.type = 'button'; pomo.hidden = true;
    pomo.addEventListener('click', () => { SR.Snd.init(); openTimer(); });
    bl.append(pomo);
    /* bottom right: Add, To-dos, Block library, and the Sunday Reset last, where a call to action goes */
    const br = h('div', 'k k-chip c-br'); br.dataset.edge = 'bottom';
    const add = Kit.btn('k-pill', 'Add', Kit.add, 'plus'); add.title = 'Add in plain words (N)';
    const todos = Kit.btn('k-pill', 'To-dos', () => openTodos(), 'flag');
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
    try { window.SR_kitAway = localStorage.getItem('sundayreset.v3.kitAway') === '1'; } catch (e) { /* fine */ }
    const kitAway = (away) => { window.SR_kitAway = away; try { localStorage.setItem('sundayreset.v3.kitAway', away ? '1' : ''); } catch (e) { /* fine */ } };
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
      Kit.sheet('To-dos', (card) => {
        card.classList.add('c-sheet');
        const head = h('div', 'c-head');
        const words = h('div'); words.append(h('h2', '', 'To-dos'), h('p', 'k-lede', 'Pick a stack. Its pieces come out beside the board, ready to drag onto a day.'));
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
          b.addEventListener('click', () => { Kit.closeSheet(); c.go(); });
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
            nw.addEventListener('click', () => { Kit.closeSheet(); Kit.add(); });
            grid.appendChild(nw);
          }
          if (filter !== 'todos' && meals.length) {
            if (filter === 'all') grid.appendChild(h('h3', 'c-sect', 'Meals and ideas'));
            meals.forEach((c) => grid.appendChild(cardFor(c, i++)));
          }
          if (!grid.querySelector('.c-card:not(.c-new)') && q) grid.appendChild(h('p', 'c-none', 'Nothing called that. Try fewer letters.'));
        }
        draw();
      }, 'c-fixed');
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
      menu.append(item('Today', 'sun', () => Kit.zoom('today')), item('Calendar', 'calendar', () => Kit.zoom(SR.inToday() ? 'week' : SR.view.zoom)), item('To-dos', 'flag', openTodos), item('Block library', 'box', blockLibrary));
      if (SR.useDinners()) menu.appendChild(item('Dinners', 'pot', () => layOut('dinners')));
      if (SR.useTogether()) menu.appendChild(item(SR.withName(), 'heart', () => layOut('kim')));
      menu.append(item('Focus on one thing', 'star', Kit.focus), item('Pomodoro timer', 'bell', openTimer), item('The week as a list', 'list', Kit.list));
      menu.appendChild(h('hr'));
      const snd = SR.view.sound !== false;
      menu.append(item('How it works', 'help', Kit.help), item(snd ? 'Sound is on' : 'Sound is off', snd ? 'sound' : 'mute', () => Kit.settings('reading')));
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
      document.title = 'Sunday Reset · Corners V3';
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
      else if (pomo.dataset.was === '1') document.title = 'Sunday Reset · Corners V3';
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
    const hiddenMid = () => { try { return localStorage.getItem('sundayreset.v3.hideMid'); } catch (e) { return null; } };
    const numWord = (n) => ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][n] || String(n);
    const planned = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v3.planned') || '{}'); } catch (e) { return {}; } })();
    const savePlanned = () => { try { localStorage.setItem('sundayreset.v3.planned', JSON.stringify(planned)); } catch (e) { /* fine */ } };
    let snooze = (() => { try { return JSON.parse(localStorage.getItem('sundayreset.v3.snooze') || 'null'); } catch (e) { return null; } })();
    const saveSnooze = () => { try { localStorage.setItem('sundayreset.v3.snooze', JSON.stringify(snooze)); } catch (e) { /* fine */ } };

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
          try { localStorage.setItem('sundayreset.v3.hideMid', ws); } catch (e) { /* fine */ }
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
    Kit.v3 = { openIntro, openPlan, chipState, runSteps };

    /* the time a reset was finished, for the plan's kicker */
    let resetWas = null;
    function notePlanned() {
      const r = SR.view.reset;
      if (resetWas && !r) { const x = rec(resetWas); if (x && (x.done || x.caught) && !planned[resetWas]) { planned[resetWas] = Date.now(); savePlanned(); } }
      resetWas = r ? r.week : null;
    }

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
    Kit.renders.push(sync);
  });
})();
