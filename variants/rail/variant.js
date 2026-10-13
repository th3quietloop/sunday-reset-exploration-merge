/* Rail: the Patreon idea. A slim rail down the left holds every place, each one tap away, and the
   board takes all the rest of the screen. Over the board: where you are, and the zoom. */
(function () {
  'use strict';
  const { h } = Kit;
  Kit.start(() => {
    const app = document.getElementById('app');
    const rail = h('nav', 'k r-rail'); rail.dataset.edge = 'left'; rail.setAttribute('aria-label', 'Sunday Reset');
    const logo = h('div', 'r-logo'); logo.setAttribute('aria-hidden', 'true'); logo.append(h('i'), h('i'), h('i'));
    rail.appendChild(logo);
    const items = [
      ['today', 'Today', 'sun', () => Kit.zoom('today')],
      ['calendar', 'Calendar', 'calendar', () => Kit.zoom(SR.inToday() ? 'week' : SR.view.zoom)],
      ['todos', 'To-dos', 'flag', Kit.todos],
      ['blocks', 'Blocks', 'box', Kit.blocks],
      ['dinners', 'Dinners', 'pot', Kit.dinners],
      ['kim', 'Together', 'heart', () => Kit.tray('kim')],
      ['focus', 'Focus', 'star', Kit.focus]
    ];
    const btns = {};
    items.forEach(([id, name, ic, fn]) => {
      const b = h('button', 'r-item'); b.type = 'button'; b.title = name;
      const m = h('span', 'r-mark'); m.appendChild(SR.icon(ic, 9, '#F6EEE2'));
      b.append(m, h('span', 'r-name', name));
      if (id === 'todos') { const c = h('span', 'k-count r-badge'); b.appendChild(c); btns.count = c; }
      b.addEventListener('click', () => { SR.Snd.init(); fn(); });
      btns[id] = b; rail.appendChild(b);
    });
    rail.appendChild(h('div', 'r-grow'));
    const reset = h('button', 'r-item r-reset'); reset.type = 'button';
    const rm = h('span', 'r-mark'); reset.append(rm, h('span', 'r-name', 'Reset'));
    reset.addEventListener('click', () => { SR.Snd.init(); Kit.reset(); });
    const me = h('button', 'r-me'); me.type = 'button'; me.title = 'Settings';
    me.addEventListener('click', () => { SR.Snd.init(); Kit.settings(); });
    rail.append(reset, me);

    const tl = h('div', 'k k-chip r-tl'); tl.dataset.edge = 'top';
    tl.appendChild(Kit.dateControl());
    const kinds = h('div', 'k-kinds'); tl.appendChild(kinds); Kit.kindsHome = kinds;
    const tr = h('div', 'k k-chip r-tr'); tr.dataset.edge = 'top';
    tr.appendChild(Kit.zoomSwitch('', false));
    const add = Kit.btn('k-pill r-add', 'Add', Kit.add, 'plus'); add.title = 'Add in plain words (N)';
    tr.appendChild(add);
    app.append(rail, tl, tr);

    Kit.renders.push(() => {
      const v = SR.view, today = SR.inToday();
      let on = 'calendar';
      if (SRFocus.isOpen) on = 'focus';
      else if (today) on = 'today';
      else if (v.bench && v.bench.tab === 'todo') on = 'todos';
      else if (Kit.trayOpen('blocks') || (v.zoom === 'day' && !SR.trayCollapsed())) on = 'blocks';
      else if (Kit.trayOpen('dinners')) on = 'dinners';
      else if (Kit.trayOpen('kim')) on = 'kim';
      else if (Kit.trayOpen('todo')) on = 'todos';
      Object.keys(btns).forEach((k) => { if (btns[k].classList) btns[k].classList.toggle('on', k === on); });
      btns.dinners.hidden = !SR.useDinners();
      btns.kim.hidden = !SR.useTogether();
      btns.kim.querySelector('.r-name').textContent = 'Together';
      const n = Kit.dueCount(); btns.count.textContent = n ? String(n) : '';
      const r = SR.resetState();
      reset.classList.toggle('due', !!r.strong); reset.title = r.label;
      rm.replaceChildren(SR.icon('calendar', 9, r.strong ? '#2A1D10' : '#F6EEE2'));
      const p = SR.who(); me.textContent = ((p && p.name) || 'Y').slice(0, 1).toUpperCase();
      tl.hidden = today; tr.hidden = today;
    });
  });
})();
