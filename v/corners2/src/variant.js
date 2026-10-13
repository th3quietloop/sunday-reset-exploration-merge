/* Corners V2: hours on the top left, the date in the middle, the zoom and your account on the right.
   Sunday Reset alone on the bottom left; Add, To-dos, and Block library on the bottom right. Everything
   you can place comes out beside the board, in 3D. And the desk clock is a Pomodoro timer. */
(function () {
  'use strict';
  const { h } = Kit;
  const ESP = '#241A13', CREAM = '#F6EEE2';
  Kit.start(() => {
    const app = document.getElementById('app');

    /* == the corners == */
    const tl = h('div', 'k k-chip c-tl'); tl.dataset.edge = 'top';
    const hours = Kit.hoursReadout('c-hours');
    const pomo = h('button', 'c-pomo'); pomo.type = 'button'; pomo.hidden = true;
    pomo.addEventListener('click', () => { SR.Snd.init(); openTimer(); });
    const kinds = h('div', 'k-kinds'); Kit.kindsHome = kinds;
    tl.append(hours, pomo, kinds);
    const tc = h('div', 'k k-chip c-tc'); tc.dataset.edge = 'top';
    tc.appendChild(Kit.dateControl());
    const tr = h('div', 'k c-tr'); tr.dataset.edge = 'top';
    const zoom = h('div', 'k-chip c-zoomchip'); zoom.appendChild(Kit.zoomSwitch());
    const me = h('button', 'k-chip c-me'); me.type = 'button'; me.setAttribute('aria-haspopup', 'menu'); me.setAttribute('aria-expanded', 'false');
    const meCircle = h('span', 'c-me-dot'), meName = h('span', 'c-me-name');
    me.append(meCircle, meName, SR.icon('down', 7, '#D9CBB6'));
    me.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); toggleMenu(); });
    tr.append(zoom, me);

    const bl = h('div', 'k k-chip c-bl'); bl.dataset.edge = 'bottom';
    bl.appendChild(Kit.resetButton('c-reset'));
    const br = h('div', 'k k-chip c-br'); br.dataset.edge = 'bottom';
    const add = Kit.btn('k-pill', 'Add', Kit.add, 'plus'); add.title = 'Add in plain words (N)';
    const todos = Kit.btn('k-pill', 'To-dos', () => openTodos(), 'flag');
    const due = h('span', 'k-count'); todos.appendChild(due);
    const lib = Kit.btn('k-pill', 'Block library', blockLibrary, 'box');
    br.append(add, todos, lib);
    app.append(tl, tc, tr, bl, br);

    /* == Block library: the rack beside the board, in 3D == */
    const libOpen = () => {
      const v = SR.view;
      if (SR.inToday()) return false;
      if (v.bench && v.bench.tab === 'blocks') return true;
      return v.zoom === 'day' && !v.bench && !SR.trayCollapsed();
    };
    function toBoard() {
      SRFocus.close(); Kit.closeSheet(); closeMenu();
      if (SR.inToday()) SR.setMode('planner');
      if (SR.view.zoom === 'month' || SR.view.zoom === 'year') SR.setZoom('week');
    }
    function blockLibrary() {
      if (libOpen()) {
        if (SR.view.zoom === 'day' && !SR.view.bench) SR.setTrayCollapsed(true); else SR.view.bench = null;
        SR.Snd.slide && SR.Snd.slide();
        SR.render();
        return;
      }
      toBoard();
      const v = SR.view;
      if (v.zoom === 'day') { v.bench = null; SR.setTrayCollapsed(false); }
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

    /* == your account: the obvious way to Settings == */
    let menu = null;
    function toggleMenu() { if (menu) closeMenu(); else openMenu(); }
    function openMenu() {
      Kit.closeSheet();
      const p = SR.who();
      menu = h('div', 'k c-menu'); menu.setAttribute('role', 'menu');
      const head = h('div', 'c-menu-head');
      const dot = h('span', 'c-me-dot big', ((p && p.name) || 'Y').slice(0, 1).toUpperCase());
      const who = h('div'); who.append(h('b', '', (p && p.name) || 'You'), h('span', '', p && p.sample ? 'Sample board, on this device' : 'On this device'));
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
      document.title = 'Sunday Reset · Corners V2';
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
      else if (pomo.dataset.was === '1') document.title = 'Sunday Reset · Corners V2';
      pomo.dataset.was = running ? '1' : '';
      if (pomo.hidden === running) sync();
    }
    pomo.append(h('i', 'c-pdot'), h('b', 'c-pt'), h('span', 'c-pl', 'Pomodoro'));
    setInterval(tick, 500);
    window.addEventListener('resize', () => requestAnimationFrame(place));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && card) { e.preventDefault(); e.stopImmediatePropagation(); closeTimer(); } }, true);

    /* == keeping the corners in step == */
    function sync() {
      const today = SR.inToday(), v = SR.view;
      tc.hidden = today;
      const running = !!pom.endsAt;
      pomo.hidden = !running; hours.hidden = running;
      pomo.classList.toggle('rest', pom.phase !== 'work');
      tl.hidden = today && !running;
      const n = Kit.dueCount(); due.textContent = n ? String(n) : '';
      lib.setAttribute('aria-pressed', String(libOpen()));
      todos.setAttribute('aria-pressed', String(!today && !!v.bench && v.bench.tab !== 'blocks'));
      const p = SR.who(), name = (p && p.name) || 'You';
      meCircle.textContent = name.slice(0, 1).toUpperCase(); meName.textContent = name.split(' ')[0];
      me.title = 'Settings and everything else';
      requestAnimationFrame(place);
    }
    Kit.renders.push(sync);
  });
})();
