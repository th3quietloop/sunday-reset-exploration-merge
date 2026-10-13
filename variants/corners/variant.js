/* Corners: the board edge to edge, and four small things in the corners. Where you are and the way
   back and forward on the top left, the hours in the middle, the zoom on the right. A menu with every
   place you can go on the bottom left, Block library on the bottom right. Nothing else. */
(function () {
  'use strict';
  const { h } = Kit;
  Kit.start(() => {
    const app = document.getElementById('app');
    const tl = h('div', 'k k-chip c-tl'); tl.dataset.edge = 'top';
    tl.appendChild(Kit.dateControl());
    const kinds = h('div', 'k-kinds'); tl.appendChild(kinds); Kit.kindsHome = kinds;
    const tc = h('div', 'k k-chip c-tc'); tc.dataset.edge = 'top';
    tc.appendChild(Kit.hoursReadout());
    const tr = h('div', 'k k-chip c-tr'); tr.dataset.edge = 'top';
    tr.appendChild(Kit.zoomSwitch());

    const bl = h('div', 'k k-chip c-bl'); bl.dataset.edge = 'bottom';
    const menu = Kit.btn('k-pill', 'Sunday Reset', openMap, 'tray');
    const due = h('span', 'k-count'); menu.appendChild(due);
    bl.appendChild(menu);
    const br = h('div', 'k k-chip c-br'); br.dataset.edge = 'bottom';
    const add = Kit.btn('k-pill', 'Add', Kit.add, 'plus'); add.title = 'Add in plain words (N)';
    const blocks = Kit.btn('k-pill', 'Block library', Kit.blocks, 'box');
    br.append(add, blocks);
    app.append(tl, tc, tr, bl, br);

    Kit.renders.push(() => {
      const n = Kit.dueCount(); due.textContent = n ? String(n) : '';
      blocks.setAttribute('aria-pressed', String(Kit.trayOpen('blocks') || (!SR.inToday() && SR.view.zoom === 'day' && !SR.trayCollapsed())));
      const r = SR.resetState(); menu.classList.toggle('due', !!r.strong);
      tc.hidden = SR.inToday();
      tl.hidden = SR.inToday();
      br.hidden = SR.inToday();
    });

    /* the menu: every place, one tap away, over a blurred board */
    function openMap() {
      Kit.sheet('Sunday Reset', (card) => {
        card.append(h('h2', '', 'Where to?'), h('p', 'k-lede', 'Everything in Sunday Reset, one tap away.'));
        const grid = h('div', 'k-places');
        const r = SR.resetState();
        const reset = h('button', 'k-place' + (r.strong ? ' gold' : ''));
        reset.append(markOf('calendar', r.strong ? '#2A1D10' : '#F6EEE2', r.strong ? 'rgba(0,0,0,0.08)' : '#3D2E22'), h('b', '', r.label), h('span', '', r.done ? 'This week’s is done. Open it again any time.' : 'Kinds of day, to-dos, dinners, and a look at the week'));
        reset.addEventListener('click', () => { Kit.closeSheet(); Kit.reset(); });
        grid.appendChild(reset);
        const colors = { today: '#B07A2E', week: '#2D6EA6', todos: '#B84A38', blocks: '#3B7F45', dinners: '#3B7F45', kim: '#8A5AA6', focus: '#1F6F87' };
        Kit.places().forEach((p) => {
          const b = h('button', 'k-place');
          b.append(markOf(p.icon, '#FFFFFF', colors[p.id]), h('b', '', p.name), h('span', '', p.line));
          b.addEventListener('click', () => { Kit.closeSheet(); p.go(); });
          grid.appendChild(b);
        });
        card.appendChild(grid);
        const row = h('div', 'k-row');
        row.append(Kit.btn('k-pill', 'Week as a list', () => { Kit.closeSheet(); Kit.list(); }, 'list'), Kit.btn('k-pill', 'How it works', () => { Kit.closeSheet(); Kit.help(); }, 'help'), Kit.btn('k-pill', 'Settings', () => { Kit.closeSheet(); Kit.settings(); }, 'sliders'));
        card.appendChild(row);
      });
    }
    function markOf(icon, ink, bg) { const m = h('span', 'k-mark'); m.style.setProperty('--c', bg); m.appendChild(SR.icon(icon, 11, ink)); return m; }
  });
})();
