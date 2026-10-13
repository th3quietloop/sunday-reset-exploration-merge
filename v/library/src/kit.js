/* The kit every minimal version of the merge is built from. The desk keeps its board, blocks, panels,
   and rules; the kit hides the desk's own chrome (the date card, the hours card, the zoom tabs, the
   corner, the tray bar) and gives each version small pieces to put back in its own place: a date
   control, a zoom switch, an hours readout, a menu, and a frosted sheet. Anything marked data-edge
   keeps the board clear of it. */
(function () {
  'use strict';
  window.SR_MERGE = true; /* no welcome on a first visit: the sample board opens */
  window.SR_QUIET = true; /* and no How it works panel either */
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const K = window.Kit = { $, h, renders: [] };

  K.icon = (name, size, color) => SR.icon(name, size || 9, color || '#F6EEE2');
  K.btn = (cls, label, fn, ic, icColor) => {
    const b = h('button', cls); b.type = 'button';
    if (ic) b.appendChild(K.icon(ic, 8, icColor));
    if (label) b.appendChild(h('span', '', label));
    b.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); fn(e); });
    return b;
  };

  /* == what the hidden date card knows, read back == */
  K.when = () => ({ title: $('hud-title').textContent, sub: $('hud-sub').textContent, away: !$('today').hidden });
  K.hours = () => ({ num: $('yours-num').textContent, label: $('yours-label').textContent });
  K.mode = () => (SR.inToday() ? 'today' : SR.view.zoom);
  K.dueCount = () => SR.M.dueSoon(SR.state, SR.today, 7, SR.nowMin).length;

  /* == moving around == */
  K.prev = () => { if (SR.inToday()) SR.setMode('planner'); SR.shift(-1); };
  K.next = () => { if (SR.inToday()) SR.setMode('planner'); SR.shift(1); };
  K.backToday = () => $('today').click();
  K.zoom = (z) => {
    SRFocus.close();
    if (z === 'today') { SR.setMode('today'); return; }
    if (SR.inToday()) SR.setMode('planner');
    if (SR.view.zoom !== z) SR.setZoom(z); else SR.render();
  };
  K.todos = () => { SRFocus.close(); if (SR.inToday()) SR.setMode('planner'); const b = SR.view.bench; if (b && b.tab === 'todo' && b.level === 'soon') SR.closeBench(); else SR.openDueSoon(); };
  /* the tray opens at a section, and the same button puts it away */
  K.trayOpen = (tab) => !SR.inToday() && !SR.trayCollapsed() && SR.view.tab === tab;
  K.tray = (tab, level) => {
    SRFocus.close();
    if (K.trayOpen(tab) && !level) { SR.closeTray(); return; }
    SR.openTray(tab, level);
  };
  K.blocks = () => K.tray('blocks');
  K.dinners = () => K.tray('dinners');
  K.focus = () => SRFocus.open();
  K.reset = () => { SRFocus.close(); SR.resetState().run(); };
  K.settings = (page) => { SRFocus.close(); SR.openDrawer(page); };
  K.add = () => SR.openQuick();
  K.list = () => { if (SR.inToday()) SR.setMode('planner'); $('listtoggle').click(); };
  K.help = () => SR.openSel({ type: 'help' });

  /* == pieces == */
  /* the date: back, where you are, forward, and Back to today when you've left it */
  K.dateControl = (cls) => {
    const box = h('div', 'k-date ' + (cls || ''));
    const prev = K.btn('k-arrow', '', K.prev, 'left'); prev.setAttribute('aria-label', 'Earlier');
    const next = K.btn('k-arrow', '', K.next, 'right'); next.setAttribute('aria-label', 'Later');
    const words = h('button', 'k-when'); words.type = 'button';
    words.addEventListener('click', () => { if (K.when().away) K.backToday(); });
    const t = h('b', 'k-title'), s = h('span', 'k-sub');
    words.append(t, s);
    const back = K.btn('k-back', 'Today', K.backToday);
    box.append(prev, words, next, back);
    K.renders.push(() => {
      const w = K.when();
      t.textContent = w.title; s.textContent = w.sub;
      s.hidden = !w.sub || w.sub === w.title;
      back.hidden = !w.away;
      words.title = w.away ? 'Back to today' : '';
      box.classList.toggle('k-in-today', SR.inToday());
    });
    return box;
  };
  /* Today, Day, Week, Month, Year: one switch */
  K.zoomSwitch = (cls, withToday = true, words) => {
    const box = h('div', 'k-seg ' + (cls || '')); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Zoom');
    const items = (withToday ? [['today', 'Today']] : []).concat([['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']]);
    const btns = items.map(([z, name]) => { const b = K.btn('', (words && words[z]) || name, () => K.zoom(z)); b.dataset.z = z; box.appendChild(b); return b; });
    K.renders.push(() => { const m = K.mode(); btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.z === m))); });
    return box;
  };
  K.hoursReadout = (cls) => {
    const box = h('div', 'k-hours ' + (cls || ''));
    const n = h('b'), l = h('span');
    box.append(n, l);
    K.renders.push(() => { const x = K.hours(); n.textContent = x.num; l.textContent = x.label; });
    return box;
  };
  K.resetButton = (cls) => {
    const b = h('button', 'k-reset ' + (cls || '')); b.type = 'button';
    b.addEventListener('click', () => { SR.Snd.init(); K.reset(); });
    K.renders.push(() => {
      const r = SR.resetState();
      b.classList.toggle('due', !!r.strong);
      b.replaceChildren(K.icon('calendar', 8, r.strong ? '#2A1D10' : '#F6EEE2'), h('span', '', r.label));
      b.title = r.label;
    });
    return b;
  };
  /* the kind of day lives in the date card; in the day view it moves to wherever the version wants it */
  K.kindsHome = null;
  K.renders.push(() => {
    const kinds = $('kinds');
    if (!kinds || !K.kindsHome) return;
    const want = !SR.inToday() && SR.view.zoom === 'day' ? K.kindsHome : $('hud').querySelector('.hud-subrow');
    if (want && kinds.parentElement !== want) want.prepend(kinds);
  });

  /* == a frosted sheet over a blurred board == */
  K.sheet = (title, build, cls) => {
    K.closeSheet();
    const scrim = h('div', 'k-scrim'); scrim.addEventListener('click', K.closeSheet);
    const card = h('section', 'k-sheet ' + (cls || '')); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', title);
    const x = K.btn('k-x', '', K.closeSheet, 'x'); x.setAttribute('aria-label', 'Close');
    card.appendChild(x);
    build(card);
    document.getElementById('app').append(scrim, card);
    K.openSheetEl = [scrim, card];
    document.body.classList.add('k-sheet-open');
    setTimeout(() => { const f = card.querySelector('h2, button:not(.k-x)'); if (f) { if (f.tagName === 'H2') f.tabIndex = -1; f.focus({ preventScroll: true }); } }, 30);
  };
  K.closeSheet = () => {
    if (!K.openSheetEl) return;
    K.openSheetEl.forEach((x) => x.remove());
    K.openSheetEl = null;
    document.body.classList.remove('k-sheet-open');
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && K.openSheetEl) { e.preventDefault(); e.stopImmediatePropagation(); K.closeSheet(); } }, true);

  /* Everywhere you can go, in one place: the Patreon idea, that nothing is more than one tap away */
  K.places = () => {
    const due = K.dueCount();
    const out = [
      { id: 'today', name: 'Today', line: 'What you’re in, and what’s next', icon: 'sun', go: () => K.zoom('today') },
      { id: 'week', name: 'Calendar', line: 'Day, week, month, and year', icon: 'calendar', go: () => K.zoom(SR.view.zoom === 'year' ? 'year' : 'week') },
      { id: 'todos', name: 'To-dos', line: due ? due + ' due this week' : 'Nothing due this week', icon: 'flag', go: K.todos },
      { id: 'blocks', name: 'Block library', line: 'Drag one onto a day', icon: 'box', go: K.blocks },
      { id: 'focus', name: 'Focus', line: 'One thing at a time', icon: 'star', go: K.focus }
    ];
    if (SR.useDinners()) out.splice(4, 0, { id: 'dinners', name: 'Dinners', line: 'The week’s nights and groceries', icon: 'pot', go: K.dinners });
    if (SR.useTogether()) out.splice(5, 0, { id: 'kim', name: SR.withName(), line: 'Ideas for time together', icon: 'heart', go: () => K.tray('kim') });
    return out;
  };

  /* == keeping in step with the board == */
  let rackWas = null;
  function sync() {
    if (!window.SR || !SR.view) return;
    /* the tray bar shows only while it's open, during the reset, and as Today's dock */
    const hide = !SR.inToday() && SR.trayCollapsed() && !SR.view.reset && !SR.view.phone;
    document.body.classList.toggle('k-rack-hidden', hide);
    document.body.classList.toggle('k-today', SR.inToday());
    document.body.classList.toggle('k-day', !SR.inToday() && SR.view.zoom === 'day');
    K.renders.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    if (rackWas !== hide) { rackWas = hide; requestAnimationFrame(() => SR.layoutInsets()); }
  }
  K.sync = sync;
  window.SR_onRender = sync;

  K.start = (build) => {
    const go = () => {
      if (!window.SR || !SR.state || !$('hud-title') || !window.SRFocus) { setTimeout(go, 40); return; }
      /* a fresh visit starts with the tray away, so the board has the room */
      if (!sessionStorage.getItem('k-started')) { try { sessionStorage.setItem('k-started', '1'); } catch (e) { /* fine */ } if (!SR.inToday() && !SR.trayCollapsed()) SR.setTrayCollapsed(true); }
      build();
      SRFocus.onChange = sync;
      SR.render();
      sync();
      requestAnimationFrame(() => SR.layoutInsets());
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  };
  window.addEventListener('resize', () => requestAnimationFrame(() => window.SR && SR.layoutInsets && SR.layoutInsets()));
})();
