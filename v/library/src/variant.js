/* Library: a slim top bar for time (where you are, the zoom, Today, Add), and one handle at the
   bottom for things (Block library). The handle opens a sheet of cards over a blurred board, one card
   per stack: what's due, each list of to-dos, dinners, ideas, and every row of blocks. Pick a card and
   its pieces come out on the tray, ready to drag. */
(function () {
  'use strict';
  const { h } = Kit;
  Kit.start(() => {
    const app = document.getElementById('app');
    const bar = h('header', 'k l-bar'); bar.dataset.edge = 'top';
    const brand = h('div', 'l-brand'); const logo = h('span', 'l-logo'); logo.append(h('i'), h('i'), h('i'));
    brand.append(logo, h('span', '', 'Sunday Reset'));
    const date = Kit.dateControl('l-date');
    const kinds = h('div', 'k-kinds'); Kit.kindsHome = kinds;
    const left = h('div', 'l-left'); left.append(brand, date, kinds);
    const zoom = Kit.zoomSwitch('l-zoom', true);
    const right = h('div', 'l-right');
    const add = Kit.btn('k-pill l-add', 'Add', Kit.add, 'plus'); add.title = 'Add in plain words (N)';
    const me = h('button', 'l-me'); me.type = 'button'; me.title = 'Settings';
    me.addEventListener('click', () => { SR.Snd.init(); Kit.settings(); });
    right.append(Kit.hoursReadout('l-hours'), add, me);
    bar.append(left, zoom, right);

    const handle = h('div', 'k k-chip l-handle'); handle.dataset.edge = 'bottom';
    const lib = h('button', 'l-lib'); lib.type = 'button';
    const grip = h('span', 'l-grip');
    lib.append(grip, SR.icon('box', 9, '#F6EEE2'), h('span', '', 'Block library'), SR.icon('up', 7, '#D9CBB6'));
    lib.addEventListener('click', () => { SR.Snd.init(); openLibrary(); });
    const soon = Kit.btn('k-pill l-soon', 'Due soon', Kit.todos, 'flag');
    const soonN = h('span', 'k-count'); soon.appendChild(soonN);
    const focus = Kit.btn('k-pill', 'Focus', Kit.focus, 'star');
    handle.append(lib, h('span', 'l-sep'), soon, focus, Kit.resetButton('l-reset'));
    app.append(bar, handle);

    Kit.renders.push(() => {
      const n = Kit.dueCount(); soonN.textContent = n ? String(n) : '';
      const p = SR.who(); me.textContent = ((p && p.name) || 'Y').slice(0, 1).toUpperCase();
      date.hidden = SR.inToday();
    });

    /* the cards: one per stack of things you can put on a day */
    function cards() {
      const st = SR.state, M = SR.M, D = SR.D, out = [];
      const due = M.dueSoon(st, SR.today, 21, SR.nowMin);
      out.push({ kind: 'todos', name: 'Due soon', count: due.length, line: due.length ? due.length + ' in three weeks' : 'All clear', peek: due.slice(0, 2).map((x) => x.task.name).join(' · ') || 'Nothing due this week', icon: 'flag', color: '#B84A38', go: Kit.todos });
      for (const g of st.groups) {
        const list = st.tasks.filter((t) => t.group === g.id && !t.done && !t.archived);
        out.push({ kind: 'todos', name: g.name, count: list.length, line: list.length ? list.length + ' waiting' : 'Empty', peek: list.slice(0, 2).map((t) => t.name).join(' · ') || 'Nothing here yet', icon: g.icon || 'check', color: g.id === 'inbox' ? '#C98A1E' : '#1F6F87', go: () => Kit.tray('todo', g.id) });
      }
      if (SR.useDinners()) out.push({ kind: 'dinners', name: 'Dinners', count: null, line: 'This week and the pantry', peek: 'Drop a recipe on a night', icon: 'pot', color: '#3B7F45', go: () => Kit.tray('dinners') });
      if (SR.useTogether()) out.push({ kind: 'ideas', name: SR.withName(), count: null, line: 'Ideas for time together', peek: (D.IDEA_KINDS || []).map((k) => k.name).slice(0, 3).join(' · '), icon: 'heart', color: '#8A5AA6', go: () => Kit.tray('kim') });
      for (const row of D.KIT_ROWS) {
        const names = row.ids.map((id) => (st.palette.find((p) => p.id === id) || {}).name).filter(Boolean);
        const first = st.palette.find((p) => p.id === row.ids[0]);
        out.push({ kind: 'blocks', name: row.name, count: names.length, line: names.length + ' blocks', peek: names.slice(0, 3).join(' · '), icon: (first && first.icon) || 'box', color: (first && SR.cat(first.cat).base) || '#3D2E22', go: Kit.blocks });
      }
      return out;
    }
    function openLibrary() {
      let filter = 'all', q = '';
      Kit.sheet('Block library', (card) => {
        card.classList.add('l-sheet');
        const head = h('div', 'l-head');
        const words = h('div'); words.append(h('h2', '', 'Block library'), h('p', 'k-lede', 'Pick a stack. Its pieces come out on the tray, ready to drag onto a day.'));
        const tools = h('div', 'l-tools');
        const seg = h('div', 'k-seg l-filter');
        [['all', 'Everything'], ['todos', 'To-dos'], ['blocks', 'Blocks'], ['dinners', 'Meals and ideas']].forEach(([id, name]) => {
          const b = Kit.btn('', name, () => { filter = id; draw(); }); b.dataset.f = id; seg.appendChild(b);
        });
        const find = h('input', 'l-find'); find.placeholder = 'Find a to-do or a block'; find.setAttribute('aria-label', 'Find a to-do or a block');
        find.addEventListener('input', () => { q = find.value.trim().toLowerCase(); draw(); });
        tools.append(seg, find);
        head.append(words, tools);
        const grid = h('div', 'l-grid');
        card.append(head, grid);
        function draw() {
          seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === filter)));
          grid.replaceChildren();
          const list = cards().filter((c) => (filter === 'all' || c.kind === filter || (filter === 'dinners' && c.kind === 'ideas')) && (!q || (c.name + ' ' + c.peek).toLowerCase().includes(q)));
          const heads = { todos: 'To-dos', dinners: 'Meals and ideas', ideas: 'Meals and ideas', blocks: 'Blocks' };
          const nw = h('button', 'l-card l-new');
          nw.append(h('span', 'l-plus', '+'), h('b', '', 'New to-do'), h('span', 'l-line', 'Jot it down, place it later'));
          nw.addEventListener('click', () => { Kit.closeSheet(); Kit.add(); });
          let last = null, placed = !(filter === 'all' || filter === 'todos');
          list.forEach((c, i) => {
            const sect = heads[c.kind];
            if (sect !== last && last === 'To-dos' && !placed) { grid.appendChild(nw); placed = true; }
            if (filter === 'all' && sect !== last) grid.appendChild(h('h3', 'l-sect', sect));
            last = sect;
            const b = h('button', 'l-card'); b.style.setProperty('--i', i);
            const top = h('div', 'l-card-top');
            const m = h('span', 'l-mark'); m.style.setProperty('--c', c.color); m.appendChild(SR.icon(c.icon, 10, '#FFFFFF'));
            top.appendChild(m);
            if (c.count) top.appendChild(h('span', 'l-n', String(c.count)));
            b.append(top, h('b', '', c.name), h('span', 'l-line', c.line), h('span', 'l-peek', c.peek));
            b.addEventListener('click', () => { Kit.closeSheet(); c.go(); });
            grid.appendChild(b);
          });
          if (!placed) grid.appendChild(nw);
        }
        draw();
      }, 'l-wide');
    }
  });
})();
