/* Dock: the top of the screen belongs to the board. Everything you steer with sits in one dock at the
   bottom, the way a computer's dock does: when, how far out, the stacks of things, and the reset. */
(function () {
  'use strict';
  const { h } = Kit;
  Kit.start(() => {
    const app = document.getElementById('app');
    const dock = h('nav', 'k k-chip d-dock'); dock.dataset.edge = 'bottom'; dock.setAttribute('aria-label', 'Sunday Reset');
    const date = Kit.dateControl('d-date');
    const zoom = Kit.zoomSwitch('d-zoom', true);
    const stack = h('div', 'd-stack');
    const items = [
      ['todos', 'To-dos', 'flag', Kit.todos],
      ['blocks', 'Blocks', 'box', Kit.blocks],
      ['dinners', 'Dinners', 'pot', Kit.dinners],
      ['focus', 'Focus', 'star', Kit.focus],
      ['add', 'Add', 'plus', Kit.add]
    ];
    const btns = {};
    items.forEach(([id, name, ic, fn]) => {
      const b = h('button', 'd-item'); b.type = 'button'; b.title = name;
      b.append(SR.icon(ic, 9, '#F6EEE2'), h('span', 'd-name', name));
      if (id === 'todos') { const c = h('span', 'k-count d-badge'); b.appendChild(c); btns.count = c; }
      b.addEventListener('click', () => { SR.Snd.init(); fn(); });
      btns[id] = b; stack.appendChild(b);
    });
    const me = h('button', 'd-me'); me.type = 'button'; me.title = 'Settings';
    me.addEventListener('click', () => { SR.Snd.init(); Kit.settings(); });
    const kinds = h('div', 'k-kinds'); Kit.kindsHome = kinds;
    dock.append(date, kinds, sep(), zoom, sep(), stack, sep(), Kit.resetButton('d-reset'), me);
    app.appendChild(dock);
    function sep() { return h('span', 'd-sep'); }

    Kit.renders.push(() => {
      const v = SR.view;
      btns.todos.classList.toggle('on', !SR.inToday() && !!v.bench && v.bench.tab === 'todo');
      btns.blocks.classList.toggle('on', Kit.trayOpen('blocks') || (!SR.inToday() && v.zoom === 'day' && !SR.trayCollapsed()));
      btns.dinners.classList.toggle('on', Kit.trayOpen('dinners'));
      btns.focus.classList.toggle('on', SRFocus.isOpen);
      btns.dinners.hidden = !SR.useDinners();
      const n = Kit.dueCount(); btns.count.textContent = n ? String(n) : '';
      const p = SR.who(); me.textContent = ((p && p.name) || 'Y').slice(0, 1).toUpperCase();
      date.hidden = SR.inToday();
    });
  });
})();
