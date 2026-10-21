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
    /* V11: the steps' names (Look ahead, Your time, To-dos, Meals, Moving, People, Your week) are the board's own now (data.js STEPS) */
    /* (V11, the Planner walk, 5.1: a tap on the zoom you're already on fits the desk again, the way back after a pinch) */
    const zoom0 = Kit.zoom; Kit.zoom = (z) => { if (z !== 'today' && !SR.inToday() && SR.view.zoom === z && window.World && World.userZoom > 1.01 && SR.deskZoom) { SR.deskZoom(0); Kit.sync(); return; } zoom0(z); Kit.sync(); };
    /* V11: every kind of day laid out on the desk in place of the day (docs/V11-ON-SCREEN.md) */
    const spreadOn = () => !!SR.view.kindSpread && !SR.inToday() && SR.view.zoom === 'day';

    /* == the corners == */
    /* top left: you, the way to Settings, with a small dot that says the board is saved */
    const tl = h('div', 'k c-tl'); tl.dataset.edge = 'top';
    const me = h('button', 'k-chip c-me'); me.type = 'button'; me.setAttribute('aria-haspopup', 'menu'); me.setAttribute('aria-expanded', 'false');
    const meCircle = h('span', 'c-me-dot'), meName = h('span', 'c-me-name');
    /* (V11, Oct 15: Sample, beside the first letter, where the name is hidden on a narrower window) */
    const meTag = h('span', 'c-me-tag', 'Sample'); meTag.hidden = true;
    const saveDot = h('i', 'c-save');
    const av = h('span', 'c-me-av'); av.append(meCircle, saveDot);
    me.append(av, meName, meTag, SR.icon('down', 7, '#B8B0A3'));
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
    /* V11-2 (Russell's list, Oct 20): on the minute (app.js clockTick) the time in the date chip and over the band
       says the new minute, words only: no redraw, so a drag or a panel is never touched */
    window.SR_onMinute = () => {
      const t = M.clock(SR.nowMin);
      if (!nowClock.hidden && nowClock.textContent !== t) nowClock.textContent = t;
      if (bandKick.isConnected && SR.inToday()) { const k = Kit.when().title + ' · ' + t; if (bandKick.textContent !== k) bandKick.textContent = k; }
    };
    tc.append(dateCtl, kinds, days);
    /* V11, the Planner walk (2.1): the arrows never move while you page. Today stands outside the pair, in a chip of its
       own to the left of the card (under it on a narrow window), where a second tap on Later can't land on it; and the
       words between the arrows keep one width for each zoom, the longest that zoom can say in the font they print in,
       so Later stays where it was from this week to next */
    {
      const backBtn = dateCtl.querySelector('.k-back');
      const todayChip = h('div', 'k-chip c-todaychip');
      if (backBtn) { backBtn.title = 'Back to today'; todayChip.appendChild(backBtn); tc.appendChild(todayChip); }
      const meter = document.createElement('canvas').getContext('2d');
      const widest = (font, list) => { meter.font = font; return list.reduce((a, s) => Math.max(a, meter.measureText(s).width), 0); };
      const sayable = (z) => {
        const T = SR.today, t = [], s = [];
        if (z === 'day') { for (let k = -70; k <= 400; k++) t.push(SR.M.dateText(SR.M.addDays(T, k), 'long')); s.push('Yesterday', 'Tomorrow', 'In 30 days', '30 days ago'); }
        else if (z === 'week') { t.push('This week', 'Next week', 'Last week'); for (let k = -60; k <= 120; k++) { const ws = SR.M.weekStart(SR.M.addDays(T, 7 * k)); t.push('Week of ' + SR.M.dateText(ws)); s.push(SR.M.spanText(ws, SR.M.addDays(ws, 6))); } }
        else if (z === 'month') { t.push('The next five weeks'); for (let k = -12; k < 24; k++) { const p = SR.M.parts(SR.M.addMonths(SR.M.monthStart(T), k)); t.push(SR.M.MONTH_LONG[p.m - 1] + ' ' + p.y); } }
        else { t.push('The next 12 months'); for (let k = -12; k < 24; k++) { const ms = SR.M.addMonths(SR.M.monthStart(T), k), p = SR.M.parts(ms), q = SR.M.parts(SR.M.addMonths(ms, 11)); t.push('From ' + SR.M.MONTH_LONG[p.m - 1] + ' ' + p.y); s.push(SR.M.MONTH_SHORT[p.m - 1] + ' ' + p.y + ' to ' + SR.M.MONTH_SHORT[q.m - 1] + ' ' + q.y); } }
        return { t, s };
      };
      const fixed = {}, ZOOMS_K = ['day', 'week', 'month', 'year'];
      Kit.renders.push(() => {
        todayChip.hidden = !backBtn || backBtn.hidden || SR.inToday();
        if (!whenBtn) return;
        const z = SR.view.zoom, t = whenBtn.querySelector('.k-title'), sb = whenBtn.querySelector('.k-sub');
        if (SR.inToday() || !t || !ZOOMS_K.includes(z)) { whenBtn.style.width = ''; tc.classList.remove('c-fixedwhen'); return; }
        const ft = getComputedStyle(t).font, fs = sb ? getComputedStyle(sb).font : ft, key = z + '|' + ft + '|' + fs + '|' + SR.today;
        if (!fixed[key]) { const say = sayable(z); fixed[key] = Math.ceil(Math.max(widest(ft, say.t), widest(fs, say.s))) + 22; }
        const room = window.innerWidth < 760 ? Math.max(120, window.innerWidth - 230) : 9999;
        const w = Math.min(fixed[key], room) + 'px';
        if (whenBtn.style.width !== w) whenBtn.style.width = w;
        tc.classList.add('c-fixedwhen');
        if (!todayChip.hidden) requestAnimationFrame(() => { const r = tc.getBoundingClientRect(); todayChip.classList.toggle('c-right', r.left < (todayChip.offsetWidth || 80) + 20); });
      });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { Object.keys(fixed).forEach((k) => delete fixed[k]); Kit.sync(); });
    }
    /* V11, the Planner walk (16.1, 16.2): Find a free day and Find a free evening, under the month's name in Month and
       Year, where planning months ahead happens (the board's own button lived in a date card V11 doesn't show) */
    {
      const freeRow = h('div', 'c-freerow');
      const fd = Kit.btn('c-free', 'Find a free day', () => SR.findFree('day'), 'calendar');
      const fe = Kit.btn('c-free', 'Find a free evening', () => SR.findFree('evening'), 'moon');
      fd.title = 'The next Saturday or Sunday with four open hours and nothing on it yet';
      fe.title = 'The next evening with three open hours and nothing locked, for time together';
      freeRow.append(fd, fe);
      tc.insertBefore(freeRow, kinds);
      Kit.renders.push(() => { const z = SR.view.zoom; freeRow.hidden = SR.inToday() || !!SR.view.reset || !!SR.view.phone || !SR.findFree || !(z === 'month' || z === 'year'); tc.classList.toggle('c-freeview', !freeRow.hidden); });
    }
    /* V11, the Planner walk (3.2): the kinds of day's list fits the window it opens in. On the open Duo (951 by 669) it ran
       134 px under the screen and couldn't scroll, so Take it easy and Save this day were out of reach; it's as tall
       as the room under the date card, and scrolls past that */
    {
      const kindsEl = document.getElementById('kinds'), kindsRow = document.getElementById('kinds-row');
      const fit = () => {
        if (!kindsEl || !kindsRow || !kindsEl.classList.contains('open')) return;
        const top = kindsEl.getBoundingClientRect().bottom + 8;
        kindsRow.style.maxHeight = Math.max(160, Math.floor(window.innerHeight - top - 16)) + 'px';
      };
      if (kindsEl) new MutationObserver(fit).observe(kindsEl, { attributes: true, attributeFilter: ['class'] });
      window.addEventListener('resize', fit);
    }
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
    /* V11 (the Today walk): the tabs say what they're for, on hover and on a long press (a toast, since a finger has
       no hover), the way the Today and Planner buttons did. A long press doesn't also switch */
    {
      const TAB_WHAT = { today: ['Now', 'What you’re in and what’s next', 'T'], day: ['Day', 'Change any day', '1'], week: ['Week', 'The seven days side by side', '2'], month: ['Month', 'A month of days', '3'], year: ['Year', 'The months ahead', '4'] };
      tr.querySelectorAll('.k-seg button[data-z]').forEach((b) => {
        const w = TAB_WHAT[b.dataset.z];
        if (!w) return;
        b.title = w[0] + ': ' + w[1] + ' (' + w[2] + ')';
        let timer = 0, long = false;
        b.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; long = false; clearTimeout(timer); timer = setTimeout(() => { long = true; SR.toast(w[0] + ': ' + w[1] + '.'); }, 550); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.addEventListener(t, () => clearTimeout(timer)));
        b.addEventListener('click', (e) => { if (long) { long = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
        b.addEventListener('contextmenu', (e) => { if (long) e.preventDefault(); });
      });
    }
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
    /* (each with a class of its own, so the tour and Show me can point at it: Oct 15, the first-visit walk) */
    const add = Kit.btn('k-pill c-add', 'Add', Kit.add, 'plus'); add.title = 'Add in plain words (N)';
    const todos = Kit.btn('k-pill c-todos', 'To-dos', () => deskTodos(), 'flag');
    const due = h('span', 'k-count'); todos.appendChild(due);
    const lib = Kit.btn('k-pill c-lib', 'Block library', blockLibrary, 'box');
    /* V11 (Oct 15, the first-visit walk): Getting started stays one tap away while there's something left on it, its
       ring and count here, the way the tray bar had it */
    const gs = h('button', 'k-pill c-gsbtn'); gs.type = 'button'; gs.hidden = true;
    const gsRing = h('span', 'c-gsring'), gsN = h('span', 'c-gsn');
    gs.append(gsRing, h('span', 'c-gsname', 'Getting started'), gsN);
    gs.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); if (SR.openMoves) SR.openMoves(); });
    /* V11 (the Planner walk, 1.2): after the setup the list is folded to its next thing, in a card over this bar, with
       Show me and See all, so the new week keeps the window (the list took 380 px of it); its x folds it into the
       button above, and the button opens it again */
    const gsf = h('section', 'k k-chip c-gsfold'); gsf.dataset.edge = 'bottom'; gsf.hidden = true;
    gsf.setAttribute('aria-label', 'Getting started');
    const gsfRing = h('span', 'c-gsring'), gsfN = h('span', 'c-gsfn'), gsfNext = h('p', 'c-gsfnext');
    const gsfX = Kit.btn('c-gsfx', '', () => { if (SR.foldMoves) SR.foldMoves(true); }, 'x');
    gsfX.setAttribute('aria-label', 'Fold Getting started into its button');
    const gsfShow = Kit.btn('k-pill c-gsfgo', 'Show me', () => { const mi = SR.movesInfo; if (mi && mi.next && SR.showMove) SR.showMove(mi.next.id); });
    const gsfAll = Kit.btn('k-pill c-gsfgo', 'See all', () => SR.openSel({ type: 'moves' }));
    const gsfHead = h('div', 'c-gsfhead'), gsfActs = h('div', 'c-gsfacts');
    gsfHead.append(gsfRing, h('span', 'c-gsfname', 'Getting started'), gsfN, gsfX);
    gsfActs.append(gsfShow, gsfAll);
    gsf.append(gsfHead, gsfNext, gsfActs);
    /* the card, with its next thing, in the Planner while no panel, tip, tour, setup, or reset is up; the button on the
       bar stands in for it while it shows. A side panel opening or closing redraws it too, since that isn't a render */
    function drawGsf() {
      const v = SR.view, mi = SR.movesInfo || { shown: false }, sheet = document.getElementById('sheet');
      const busy = SR.inToday() || !!v.sel || !!v.reset || !!v.drawer || !!v.phone || !!document.querySelector('.coach, .c-coach, .c-mat') || !!(sheet && !sheet.hidden) || document.body.classList.contains('c-hello-on');
      const on = !!mi.shown && !mi.folded && !!mi.next && !busy;
      if (on) {
        gsfN.textContent = mi.done + ' of ' + mi.total;
        gsfRing.style.setProperty('--p', String(Math.round((100 * mi.done) / Math.max(1, mi.total))));
        gsfNext.textContent = 'Next: ' + mi.next.name;
        gsfShow.hidden = !mi.next.show;
        gsfAll.lastChild.textContent = 'See all ' + mi.total;
        gsfAll.setAttribute('aria-label', 'See all ' + mi.total + ' things in Getting started, ' + mi.done + ' done');
      }
      gs.hidden = on || !mi.shown || !!v.phone || !!v.reset;
      if (gsf.hidden === on) { gsf.hidden = !on; requestAnimationFrame(() => SR.layoutInsets()); }
      /* (V11-3, design review 40: on the phone's own day the round Add stands bottom right where the bar would, so the
         card stands above it, never over it) */
      const pa = document.getElementById('pd-add'), paH = pa && !pa.hidden && document.body.classList.contains('phone-desk') ? pa.offsetHeight : 0;
      if (on) gsf.style.bottom = Math.round(16 + (br.hidden || !br.offsetHeight ? 0 : br.offsetHeight + 8) + (paH ? paH + 8 : 0)) + 'px';
    }
    { const sd = document.getElementById('side'); if (sd && window.MutationObserver) new MutationObserver(() => drawGsf()).observe(sd, { attributes: true, attributeFilter: ['hidden'] }); }
    /* V11 (the Planner walk, 15.1): Undo you can reach after its toast is gone, on every device: here while there's
       something to undo, naming what it takes back, and Redo beside it once something was undone. They lead the bar,
       which is anchored at the right, so the buttons after them never move when they come and go */
    const undoP = Kit.btn('k-pill c-undo', 'Undo', () => { if (SR.undoLast) SR.undoLast(); }, 'undo');
    const undoWhat = h('span', 'c-undo-what'); undoP.appendChild(undoWhat);
    const redoP = Kit.btn('k-pill c-redo', 'Redo', () => { if (SR.redoLast) SR.redoLast(); }, 'redo');
    undoP.hidden = true; redoP.hidden = true;
    const MODK = /Mac|iPhone|iPad/.test((navigator.platform || '') + ' ' + (navigator.userAgent || '')) ? 'Cmd' : 'Ctrl';
    function drawUndo() {
      const u = SR.undoInfo ? SR.undoInfo() : { undo: false, redo: false };
      const said = (x) => String(x || '').replace(/[.!?…]+$/, '');
      const uw = said(u.undoSaid), rw = said(u.redoSaid);
      /* (V11-3, one Undo a screen: while a toast offers Undo, this one steps aside, and comes back as the toast goes) */
      undoP.hidden = !u.undo || !!(SR.toastUndoUp && SR.toastUndoUp()); redoP.hidden = !u.redo;
      undoWhat.textContent = uw; undoWhat.hidden = !uw;
      undoP.setAttribute('aria-label', uw ? 'Undo: ' + uw : 'Undo the last change');
      undoP.title = (uw ? 'Undo: ' + uw : 'Undo the last change') + ' (' + MODK + ' Z)';
      redoP.setAttribute('aria-label', rw ? 'Redo: ' + rw : 'Redo');
      redoP.title = (rw ? 'Redo: ' + rw : 'Redo') + ' (' + MODK + ' Shift Z)';
    }
    window.SR_undoChanged = () => { drawUndo(); onScreen(); };
    br.append(undoP, redoP, add, todos, lib, gs);
    /* the Sunday Reset chip joins them once it's built, below */
    app.append(tl, tc, tr, bl, br, gsf);

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
    /* V11 (Oct 15, the first-visit walk): Getting started's Show me opens Block library before it points at a block in it */
    window.SR_openLibrary = () => { if (!libOpen()) blockLibrary(); };
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
      me.setAttribute('aria-label', meName.textContent + (SR.who() && SR.who().sample ? ', a sample week' : '') + '. ' + st.long + '. Settings and everything else');
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
        /* (V11, Oct 15: one name for one action, Set up my week everywhere; it starts the setup, or picks one up) */
        /* (V11-3, the design review: a quiet item here, since the bar's door already wears the gold, one a screen) */
        const own = Kit.btn('c-mi c-ownweek', 'Set up my week', () => { closeMenu(); SR.openSetup(); }, 'calendar', CREAM);
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
      /* V11: the groceries live on the meal board now, so both lead there (the list opens in view) */
      if (SR.useDinners()) menu.append(item('Meal board', 'pot', () => openMealBoard()), item('Groceries', 'cart', () => openMealBoard(null, { shop: true })));
      /* V11: time with whoever is in your week, not one partner */
      if (SR.useTogether()) menu.appendChild(item('People', 'heart', () => layOut('kim')));
      /* V11: Moving has a home outside the reset: its goal, this week's moves, and moves to drag */
      if (SR.useMove && SR.useMove()) menu.appendChild(item('Moving', 'runner', () => { if (SR.inToday()) SR.setMode('planner'); SR.openSel({ type: 'moving' }); }));
      /* V11 goals: big things with a date, a little each day: each goal, and New goal */
      if (SR.openGoals) menu.appendChild(item('Goals', 'star', () => SR.openGoals()));
      menu.appendChild(h('div', 'c-mlabel', 'On the desk'));
      /* V11 (the Today walk): Focus on one thing opened a room with no styles here, under the desk, that took the keys;
         Focus lives on the band now (the Pomodoro sized to the block you're in), and the plain timer stays here */
      menu.append(item('Pomodoro timer', 'bell', () => openTimer()));
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
    /* V11 (the Today walk): Focus from the band. A Pomodoro sized to the block you're in, with its name on it: rounds
       of 25 with 5 minute breaks that end by the block's end (four at most), or one round of what's left when that's
       under an hour. focusPlan(minutes left) says it in words: "two rounds of 25 and a 5 minute break" */
    const NUMW = ['', 'one', 'two', 'three', 'four'];
    function focusPlan(left) {
      const n = Math.min(4, Math.floor((left + 5) / 30));
      if (n <= 1) { const work = Math.max(5, Math.min(50, Math.floor(left / 5) * 5)); return { work, rest: 5, rounds: 1, words: 'one round of ' + work }; }
      return { work: 25, rest: 5, rounds: n, words: NUMW[n] + ' rounds of 25 and ' + (n === 2 ? 'a 5 minute break' : NUMW[n - 1] + ' 5 minute breaks') };
    }
    window.SR_focusPlan = focusPlan;
    /* o: { name, until (the minute it ends), left (minutes) }: starts at once, so it's one tap from the block to a timer */
    window.SR_focusBlock = (o) => {
      if (!o) return;
      const p = focusPlan(o.left);
      const same = pom.label === o.name && pom.until === o.until && pom.endsAt;
      if (!same) {
        pom = { work: p.work, rest: p.rest, phase: 'work', round: 1, rounds: p.rounds, label: o.name, until: o.until, words: p.words, left: p.work * 60000, endsAt: Date.now() + p.work * 60000 };
        savePom();
        SR.Snd.clack && SR.Snd.clack(0.4);
      }
      if (card) closeTimer();
      openTimer({ block: true });
      sync();
    };
    /* the last round of a sized Pomodoro ends it: no long break, and it doesn't start again */
    function finishSized() {
      const name = pom.label;
      pom = { work: 25, rest: 5, phase: 'work', round: 1, left: 25 * 60000, endsAt: null };
      savePom();
      if (SR.Snd.good) SR.Snd.good();
      SR.toast && SR.toast('That was the last round' + (name ? ' for ' + name : '') + '.', 'good');
    }
    function openTimer(o) {
      closeMenu(); Kit.closeSheet();
      if (card) { closeTimer(); return; }
      const at = World.propScreen && World.propScreen('clock');
      /* V11: the camera leans less toward the clock, and not at all for a block you're in or in Now, so the day
         stays on the screen. (V11, the Planner walk, 18.3: and not at all anywhere: the lean cut the day off at the
         left, and the timer stands beside the clock without it) */
      card = h('section', 'k c-timer'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', pom.label ? 'Pomodoro for ' + pom.label : 'Pomodoro timer');
      const x = Kit.btn('k-x c-tx', '', closeTimer, 'x'); x.setAttribute('aria-label', 'Close the timer');
      const kick = h('span', 'c-tkick', pom.label || 'Pomodoro');
      const plan = h('span', 'c-tplan'); plan.hidden = !pom.label;
      if (pom.label) plan.textContent = 'Until ' + SR.M.clock(pom.until) + ': ' + (pom.words || '');
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
      /* a Pomodoro sized to a block keeps its own lengths: the presets and steppers are for the plain one */
      if (pom.label) { presets.hidden = true; own.hidden = true; }
      card.append(x, kick, plan, time, phase, bar, dots, acts, presets, own);
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
      /* V11: in Now it starts under the band and its question, never over them */
      let floor = 76;
      if (SR.inToday()) ['band', 'moment'].forEach((id) => { const e = document.getElementById(id); if (e && !e.hidden && e.offsetParent !== null) { const r = e.getBoundingClientRect(); if (r.right > left && r.left < left + w) floor = Math.max(floor, r.bottom + 12); } });
      card.style.left = Math.round(Math.max(16, Math.min(window.innerWidth - w - 16, left))) + 'px';
      card.style.top = Math.round(Math.max(floor, Math.min(window.innerHeight - hgt - 84, top))) + 'px';
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
    /* (a sized one ends after its last round instead of taking a long break) */
    const lastRound = () => !!pom.rounds && pom.phase === 'work' && pom.round >= pom.rounds;
    function skip() { const run = !!pom.endsAt; if (lastRound()) { finishSized(); draw(); sync(); return; } next(); pom.endsAt = run ? Date.now() + pom.left : null; savePom(); draw(); sync(); }
    function resetPom() { if (pom.label) { pom = { work: 25, rest: 5, phase: 'work', round: 1, left: 25 * 60000, endsAt: null }; if (card) { closeTimer(); openTimer(); } } pom.phase = 'work'; pom.round = 1; pom.endsAt = null; pom.left = pom.work * 60000; savePom(); draw(); sync(); }
    function draw() {
      if (!cardEls) return;
      const ms = leftMs(), total = phaseLen(), n = pom.rounds || 4;
      cardEls.time.textContent = fmt(ms);
      cardEls.phase.textContent = pom.phase === 'work' ? 'Focus, round ' + pom.round + ' of ' + n : pom.phase === 'long' ? 'A long break' : 'A short break';
      cardEls.fill.style.width = (100 * (1 - ms / total)).toFixed(2) + '%';
      card.classList.toggle('rest', pom.phase !== 'work');
      cardEls.dots.replaceChildren(...Array.from({ length: n }, (v, i) => i + 1).map((k) => h('i', k < pom.round || (k === pom.round && pom.phase !== 'work') ? 'did' : k === pom.round ? 'now' : '')));
      cardEls.go.replaceChildren(h('span', '', pom.endsAt ? 'Pause' : ms < total ? 'Resume' : 'Start'));
      cardEls.presets.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.w === pom.work && +b.dataset.r === pom.rest)));
      cardEls.wv.textContent = pom.work + ' min'; cardEls.rv.textContent = pom.rest + ' min';
    }
    function tick() {
      if (pom.endsAt && Date.now() >= pom.endsAt) {
        if (lastRound()) finishSized();
        else {
          next(); pom.endsAt = Date.now() + pom.left; savePom();
          if (SR.Snd.good) SR.Snd.good();
          SR.toast && SR.toast(pom.phase === 'work' ? 'Break’s over. Round ' + pom.round + '.' : 'Nice. Take a break.', 'good');
        }
      }
      draw();
      const running = !!pom.endsAt;
      const pl = pomo.querySelector('.c-pl'); if (pl && pl.textContent !== (pom.label || 'Pomodoro')) pl.textContent = pom.label || 'Pomodoro';
      if (running) { pomo.querySelector('.c-pt').textContent = fmt(leftMs()); if (!card) document.title = fmt(leftMs()) + ' · ' + (pom.phase === 'work' ? pom.label || 'Focus' : 'Break'); }
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
    const STEP_MIN = { back: 2, ahead: 3, shape: 2, yours: 3, todo: 4, goals: 2, dinners: 5, move: 2, kim: 2, done: 1 };
    const CATCH_MIN = { todo: 4, dinners: 3, done: 1 };
    const partnerName = () => (SR.who() && SR.who().partner) || '';
    /* V11: who's cooking, by name: your own name for 'me', then the first partner ('kim') or anyone else who
       lives with you ('p:' ids, SR.cookWho); '' when it's Anyone or not cooking */
    /* V11: every place says a cook the way the dinner panel's chips do: You, then each name, and two people
       with one name say which (Sam, Sam (family)). The second argument is kept for old callers */
    const cookNamed = (id) => {
      if (!id || id === 'home') return '';
      const c = cookList(id).find((x) => x.id === id);
      return c ? c.name : SR.cookWho ? SR.cookWho(id) : id === 'kim' ? partnerName() : '';
    };
    /* V11: the short form for a small tag: the first name, unless another cook shares it */
    const cookShort = (id) => {
      const full = cookNamed(id), first = full.split(/\s+/)[0] || full;
      if (first === full) return full;
      return cookList(id).some((x) => x.id !== id && (x.name.split(/\s+/)[0] || x.name) === first) ? full : first;
    };
    /* V11: everyone who can cook, as { id, name }, keeping the one cooking now even if they moved out */
    const cookList = (keep) => (SR.cookChoices ? SR.cookChoices(keep) : [{ id: 'me', name: 'You' }].concat(partnerName() ? [{ id: 'kim', name: partnerName() }] : []));
    /* V11: one way to say who's cooking a dinner, for This week's plan, the finish, the picture, and the
       shared text. t is the tag: an initial, with more letters where two cooks share one (Alex and Ana are
       Al and An), the whole first name where one begins another (Dan and Daniel), You for you when the
       profile has no name or another cook has yours, or a word for how it's happening (Anyone, Order in). name is what this screen says (You
       cook, Ana cooks, Anyone cooks), say is the name for someone else reading the picture (Alex, Ana,
       Anyone), and plain names a night with no dish yet (Cooking). quiet: you're the only one who can cook,
       so the tag says nothing new (the meal board and the dinner panel leave it out then too). */
    function cookTag(x) {
      if (!x || !x.cook) return null;
      const list = cookList(x.cook), solo = list.length < 2;
      if (x.cook === 'home') return { t: 'Anyone', cls: 'word', name: 'Anyone cooks', say: 'Anyone', plain: 'Cooking', quiet: solo };
      const how = { order: 'Order in', out: 'Eat out', leftovers: 'Leftovers', skip: 'Skip' }[x.cook];
      if (how) return { t: how, cls: 'word', name: how, say: how, plain: how, quiet: false };
      const own = (SR.who() && SR.who().name) || '';
      const first = (s) => String(s || '').trim().split(/\s+/)[0] || '', lc = (s) => s.toLowerCase();
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      /* V11: each cook by the first name their tag starts from: yours for you (You when the profile has no
         name), then the names the dinner panel uses */
      const named = list.map((c) => ({ id: c.id, c, n: c.id === 'me' ? first(own) || 'You' : first(c.name) }));
      const cook = named.find((c) => c.id === x.cook);
      const full = x.cook === 'me' ? own : cookNamed(x.cook);
      if (!cook || (!full && x.cook !== 'me')) return null;
      const others = named.filter((c) => c.id !== x.cook && c.n);
      /* V11: two cooks with one first name (you and a family Alex, Sam and Sam (family)) */
      const twin = others.some((o) => lc(o.n) === lc(cook.n));
      const grp = (c) => (c.id === 'kim' || c.c.group === 'partner' ? 'partner' : 'family');
      let t = '';
      if (x.cook === 'me' && (!own || twin)) t = 'You';
      else if (twin) t = cook.c.name;
      else {
        /* the fewest letters (up to three) no other cook's first name begins with the same way: Al and An */
        for (let k = 1; k <= 3 && !t; k++) { const p = cook.n.slice(0, k); if (!others.some((o) => lc(o.n.slice(0, k)) === lc(p))) t = cap(lc(p)); }
        /* one name begins another (Dan and Daniel, Chris and Christine): the whole first name tells them apart */
        if (!t) t = cap(cook.n);
      }
      if (x.cook === 'me') return { t, cls: 'me', name: 'You cook', say: first(own) || 'Me', full: own, plain: 'Cooking', quiet: solo };
      /* for someone reading the picture: the first name, and which one when it's also yours */
      let say = cookShort(x.cook) || full;
      if (!/\(/.test(say) && own && lc(first(own)) === lc(first(say))) say = first(say) + ' (' + grp(cook) + ')';
      return { t, cls: 'them', name: full + ' cooks', say, full, plain: 'Cooking', quiet: solo };
    }
    /* V11: one name per step everywhere it shows: the steps across the top, the intro, Next, and the panel */
    const stepName = (k) => ({ back: 'Look back', ahead: 'Look ahead', shape: 'Set the week', yours: 'Your time', todo: 'To-dos', goals: 'Goals', dinners: 'Meals', move: 'Moving', kim: 'People', done: 'Your week' }[k] || k);
    /* what each step is for, in a few words, under its name in the intro */
    const stepLine = (k) => ({ back: 'What to keep, what to change', ahead: 'Dates coming up', shape: 'Which kind of week', yours: 'Blocks of your own', todo: 'Give them a time', goals: 'This week’s share of each goal', dinners: 'Plan the week’s meals', move: 'Workouts, runs, and walks', kim: 'Time with the people in your week', done: '' }[k] || '');
    const stepCat = (k) => ({ back: 'home', ahead: 'work', shape: 'work', yours: 'yours', todo: 'family', goals: 'away', dinners: 'meals', move: 'yours', kim: 'us', done: 'open' }[k] || 'yours');
    /* the steps a run would have, before it starts (the board decides the same way once it does) */
    function runSteps(ws, catchup) {
      /* V11: the board's own list, the one the run and Settings use (SR.stepsFor) */
      if (SR.stepsFor) return SR.stepsFor(ws, !!catchup).map((s) => s.key);
      if (catchup) return ['todo'].concat(SR.useDinners() ? ['dinners'] : [], ['done']);
      const off = (SR.state.settings && SR.state.settings.resetOff) || [];
      const fresh = SR.state.created && SR.state.created > M.addDays(ws, -7) && SR.firstReset(ws);
      return SR.D.STEPS.map((s) => s.key).filter((k) => {
        if (k === 'done') return true;
        if ((window.SR_resetSkip || []).includes(k) || off.includes(k)) return false;
        if (k === 'dinners' && !SR.useDinners()) return false;
        if (k === 'kim' && !SR.useTogether()) return false;
        if (k === 'move' && !(SR.useMove && SR.useMove())) return false;
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
      /* V11 (Oct 15, the first-visit walk): on the sample week the one gold thing is Set up my week; planning a made up
         family's week isn't anyone's next step */
      const who0 = SR.who();
      if (who0 && who0.sample && !SR.view.preview && SR.openSetup) return { kind: 'sunday', label: 'Set up my week', meta: 'About 5 min', title: 'Your own week, in place of this sample', go: () => SR.openSetup() };
      const full = SR.resetWeek(), fr = rec(full);
      const fullSteps = runSteps(full, false), counted = fullSteps.length - 1;
      /* V11: a reset put away with Finish later this visit comes back first, on the step it was on (a catch up
         too); then one for next week, then one for the week you're in, put away midweek (after a reload too) */
      const cw = M.weekStart(t), cwr = cw !== full ? rec(cw) : null, pk = SR.parked;
      /* (a week whose reset was done and opened again counts too: parked lasts only until it's resumed or done) */
      /* V11 (the rituals walk): it names the step it picks up on, never a fraction ("5 of 5" read as finished), and a
         catch up is Finish planning the week, the same name as its intro */
      const nextWords = (ws, catchup, i) => { const keys = runSteps(ws, catchup); return stepName(keys[Math.max(0, Math.min(i, keys.length - 1))]) + ' next'; };
      const parkedState = (ws, catchup, i, go) => ({ kind: 'progress', label: catchup ? 'Finish planning the week' : 'Finish your reset', meta: nextWords(ws, catchup, i), title: 'Picks up where you stopped', go });
      if (pk && (pk.ws === full || pk.ws === cw)) return parkedState(pk.ws, pk.catchup, pk.step, () => SR.startReset(pk.ws, pk.catchup));
      if (fr && fr.step > 0 && !fr.done) return parkedState(full, false, Math.min(fr.step, counted), () => SR.startReset(full));
      if (cwr && cwr.step > 0 && !cwr.done && !cwr.caught) return parkedState(cw, false, cwr.step, () => SR.startReset(cw));
      /* V11 (the rituals walk): the reset's own day turns it gold (Settings, Sunday Reset; on the board), with the
         evening before it, and Sunday always */
      const R = SR.resetAt ? SR.resetAt() : { day: 0, min: 19 * 60 }, eve = (R.day + 6) % 7;
      const sundayish = wd === 0 || wd === R.day || (wd === eve && now >= 17 * 60);
      if (sundayish) {
        if (fr && fr.done) return { kind: 'plan', label: planTitle(full), title: 'Meals, to-dos, and time for you', go: () => openPlan(full) };
        if (snooze && snooze.ws === full && snooze.at > Date.now()) return { kind: 'snoozed', label: 'Sunday Reset at ' + snooze.label, title: snooze.cal ? 'In your calendar, if you added it. This page nudges you too while it’s open' : 'Nudges you once, while this page is open', go: () => openIntro(full, false) };
        return { kind: 'sunday', label: 'Start Sunday Reset', meta: minutesOf(fullSteps) + ' min', title: 'Set up your week', go: () => openIntro(full, false) };
      }
      const cur = M.weekStart(t), cr = rec(cur);
      /* (Russell's call, Oct 15: the setup's last part is Your plan, so the week's button is a verb, Plan this week) */
      if (cr && (cr.done || cr.caught || cr.setup)) return { kind: 'plan', label: 'Plan this week', title: 'Meals, to-dos, and time for you', go: () => openPlan(cur) };
      if (wd === 6) return { kind: 'quiet', label: 'Sunday Reset', meta: R.day === 1 ? 'Monday' : 'tomorrow', title: 'Start early if you like', go: () => openIntro(full, false) };
      /* Monday and Tuesday: the whole reset still fits the week, so it says so, in gold */
      if (wd === 1 || wd === 2) return { kind: 'sunday', setup: minutesOf(runSteps(cur, false)), label: 'Set up this week', meta: minutesOf(runSteps(cur, false)) + ' min', title: 'The Sunday Reset, for the week you’re in', go: () => openIntro(cur, false) };
      const quick = runSteps(cur, true);
      /* V11 (the rituals walk): a catch up put away keeps its place across a reload (catchStep on the board) */
      if (cr && !cr.caught && cr.catchStep > 0) return parkedState(cur, true, cr.catchStep, () => SR.startReset(cur, true));
      if (hiddenMid() === cur) return { kind: 'none', label: '' };
      return { kind: 'midweek', label: 'Plan the rest of the week', meta: minutesOf(quick, true) + ' min', title: 'To-dos and meals for the days left', go: () => openIntro(cur, true) };
    }
    /* V11 (the rituals walk): the chip's own words and way in, for How it works */
    window.SR_resetChip = () => { const s = chipState(); return s.kind === 'none' ? null : { label: s.label, go: s.go }; };
    /* (V11-2: how long a run takes, the chip's and the intro's minutes, for the phone's reset line) */
    window.SR_resetMinutes = (ws, catchup) => minutesOf(runSteps(ws, !!catchup), !!catchup);
    /* (and the intro itself, for Dev's ritual shortcuts) */
    window.SR_openIntro = (ws, catchup) => openIntro(ws, catchup);
    const rchip = h('button', 'c-rchip'); rchip.type = 'button';
    rchip.addEventListener('click', () => { SR.Snd.init(); const s = chipState(); if (s.go) s.go(); });
    function drawChip() {
      const s = chipState();
      /* V11 (the Today walk): in Now, Monday and Tuesday's Set up this week is gold only when the open time you're in
         holds its minutes, or after 7 pm when you're neither asleep nor in a locked block (a late shift); otherwise
         it's a quiet pill. Sunday stays as it is */
      /* V11-2 (one gold a screen, Russell's rule): in Now it's the phone's ranking too (SR.nowGold): the reset is gold only
         in open time, and inside a block the block's own move is the gold and the chip goes quiet, in the same place.
         The sample week's door, Set up my week, stays its one gold */
      /* (and while a side panel shows a gold move of its own, in Now or the Planner, the chip goes quiet until it closes) */
      const who1 = SR.who(), door = !!(who1 && who1.sample && !SR.view.preview);
      const g = typeof SR.nowGold === 'function' ? SR.nowGold() : undefined;
      const roomy = g === 'panel' ? false : SR.inToday() && !door && g !== undefined ? g === 'now-reset' : !s.setup || !SR.inToday() || (() => { const i = SR.nowNow(); return ((i.kind === 'open' || i.kind === 'free') && i.left >= s.setup) || (SR.nowMin >= 19 * 60 && i.kind !== 'sleep' && !(i.kind === 'block' && i.block && i.block.fixed)); })();
      const look = s.kind === 'sunday' && !roomy ? 'quiet' : s.kind;
      rchip.className = 'c-rchip ' + look;
      /* V11: Now is the day as it happens; the reset shows there only when it's the moment for it (Sunday,
         Saturday evening, Monday or Tuesday's set up, one under way, one you snoozed). Planning the rest of
         the week, and the plan once it's set, are the Planner's */
      rchip.hidden = s.kind === 'none' || (SR.inToday() && !['sunday', 'progress', 'snoozed'].includes(s.kind));
      const kids = [];
      if (s.kind === 'snoozed') kids.push(h('i', 'c-rdot'));
      if (look === 'sunday') kids.push(Kit.icon('calendar', 8, Kit.onGold));
      kids.push(h('b', '', s.label));
      if (s.meta) kids.push(h('span', 'c-rmeta', s.meta));
      rchip.replaceChildren(...kids);
      rchip.title = s.title || s.label;
      rchip.setAttribute('aria-label', s.label + (s.meta ? ', ' + s.meta : '') + '. ' + (s.title || ''));
    }
    /* V11-2: a side panel opening or closing redraws it too (app.js sideGoldWatch) */
    window.SR_goldChanged = () => { if (!SR.view.reset) drawChip(); };
    /* V11: in Now the chip's gold follows the open time you're in, which moves with the clock, not only with a redraw */
    setInterval(() => { if (SR.inToday() && !SR.view.reset) drawChip(); }, 30000);
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
      /* V11: so does a catch up put away with Finish later, on the step it was on (after a reload too: catchStep) */
      const pk = SR.parked;
      if (catchup && ((pk && pk.catchup && pk.ws === ws) || (r && !r.caught && r.catchStep > 0))) { SR.startReset(ws, true); return; }
      const keys = runSteps(ws, catchup), steps = keys.filter((k) => k !== 'done');
      const mins = minutesOf(keys, catchup);
      const counts = SR.weekCounts(ws);
      Kit.sheet(catchup ? 'Plan the rest of the week' : 'Sunday Reset', (card) => {
        const wrap = h('div', 'c-intro-in');
        const left = h('div', 'c-intro-l');
        /* V11 (the rituals walk): one number for how long it takes, the steps' own sum, and a kicker short enough to
           stay on one line on a folded phone: "Nov 8 to 14 · 19 min". A catch up starts tomorrow once tonight's
           dinner is over (SR.restFrom) */
        const from = catchup && SR.restFrom ? SR.restFrom() : SR.today;
        const kick = (catchup ? M.DAY_SHORT[M.weekday(from)] + (from < M.addDays(ws, 6) ? ' to ' + M.DAY_SHORT[M.weekday(M.addDays(ws, 6))] : '') : M.spanText(ws, M.addDays(ws, 6))) + ' · ' + mins + ' min';
        left.append(h('div', 'c-kick', kick));
        left.appendChild(h('h2', 'c-intro-h', catchup ? 'Plan the rest of the week.' : 'Plan your week.'));
        if (!catchup) left.appendChild(h('p', 'c-intro-p', 'Stop after any step. You’ll pick up where you left off.'));
        /* what's waiting, as plain facts, never a verdict */
        const nights = (counts.openNights || []).length;
        const bits = [];
        /* V11: the to-dos the To-dos count counts, due this week, said the same way: how many need a time,
           how many have one after they're due, and (calmly) how many are from before this week */
        /* (the same count as the To-dos step and the finish: due by the week's last day, SR.weekCounts) */
        /* V11: said by SR.dueWords, the one phrase the To-dos step, the plan, and the finish use too; one
           from before is "due before today", which is true midweek as well as on Sunday */
        const dueList = counts.unplaced.concat(counts.lateTimes), dw = SR.dueWords(counts, ws), carried = dueList.filter((x) => x.task.due && x.task.due < SR.today).length;
        if (dw.need) bits.push(dw.need);
        if (dw.late) bits.push(dw.late);
        /* (when every one was due before today, the line before already says so) */
        if (carried && !(dw.n && dw.before === dw.n)) bits.push(carried === 1 ? (dueList.length === 1 ? 'It was due before today' : 'One of them was due before today') : numWord(carried) + ' of them were due before today');
        /* V11: the week's meals as the meal board counts them, breakfast and lunch too, said only once some are
           planned ("2 meals planned"): no zero count, and no total that assumes how many meals a day you eat */
        /* (in figures, as the to-do line is: "2 meals planned") */
        if (SR.useDinners()) { const mc = mealCount(M.range(ws, 7), mealRows()); if (mc.n) bits.push(mc.n + (mc.n === 1 ? ' meal' : ' meals') + ' planned' + (mc.span ? ', ' + mc.span : '')); }
        if (bits.length) { const note = h('div', 'c-intro-note'); note.appendChild(h('div', 'c-kick', dw.week.charAt(0).toUpperCase() + dw.week.slice(1))); bits.forEach((b) => note.appendChild(h('p', '', b + '.'))); left.appendChild(note); }
        const acts = h('div', 'c-intro-acts');
        const go = Kit.btn('c-go', catchup ? 'Start' : 'Start the reset', () => { Kit.closeSheet(); if (snooze && snooze.ws === ws) { snooze = null; saveSnooze(); } SR.startReset(ws, catchup); });
        acts.appendChild(go);
        if (!catchup) {
          /* V11 (the rituals walk): a reminder that rings with the tab closed: a calendar event for later today (the
             reset's own time when that's still ahead, else an hour from now), which the page nudges at too while it's
             open. Safari pauses a tab in the background, so a timer in the page alone wasn't a promise it could keep */
          const now = SR.nowMin, R = SR.resetAt ? SR.resetAt() : null;
          const own = R && R.set && M.weekday(SR.today) === R.day && R.min >= now + 30 ? R.min : null;
          const at = own != null ? own : Math.ceil((now + 60) / 30) * 30;
          if (at <= 22 * 60) {
            const label = M.clock(at);
            acts.appendChild(Kit.btn('c-ghost', 'Add to my calendar for ' + label, () => {
              const was = snooze;
              const d = new Date(); d.setHours(Math.floor(at / 60), at % 60, 0, 0);
              snooze = { ws, at: d.getTime(), label, cal: true }; saveSnooze();
              if (SR.saveResetIcs) SR.saveResetIcs({ day: M.weekday(SR.today), min: at }, SR.today);
              Kit.closeSheet(); drawChip();
              SR.toast('Saved a calendar event for ' + label + '. Open it to add it to your calendar.', 'good', { label: 'Undo', fn: () => { snooze = was || null; saveSnooze(); drawChip(); SR.toast('The reset isn’t set for ' + label + ' here now. If you added the event, delete it in Calendar.', ''); } });
            }));
          }
        } else acts.appendChild(Kit.btn('c-ghost', 'Not this week', () => {
          /* hides the short version until Sunday. V11 (the rituals walk): with Undo, which brings the chip back */
          const was = hiddenMid();
          keep('sundayreset.v7.hideMid', ws);
          Kit.closeSheet(); drawChip();
          SR.toast('Hidden until Sunday.', '', { label: 'Undo', fn: () => { keep('sundayreset.v7.hideMid', was || ''); drawChip(); SR.toast('Plan the rest of the week is back.', 'good'); } });
        }));
        left.appendChild(acts);
        const right = h('div', 'c-intro-r');
        right.appendChild(h('div', 'c-kick', numWord(steps.length) + ' steps'));
        const list = h('ol', 'c-steplist');
        steps.forEach((k, i) => {
          const li = h('li');
          const c = SR.cat(stepCat(k));
          const num = h('span', 'c-snum', String(i + 1)); num.style.background = c.base; num.style.color = c.ink || '#FFFFFF';
          /* V11: a catch up plans meals for the days that are left, as its Meals step says */
          const words = h('span', 'c-sname'); words.append(h('b', '', stepName(k)), h('small', '', catchup && k === 'dinners' ? 'Plan meals for the days left' : stepLine(k)));
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
    /* V11 (the rituals walk): Look back shows last week on the board (app.js goStep), and a tag over the board
       says which week it is; the panel says it for a screen reader */
    const weekTag = h('div', 'k k-chip c-weektag'); weekTag.setAttribute('aria-hidden', 'true'); weekTag.hidden = true;
    app.appendChild(weekTag);
    function drawSteps() {
      const r = SR.view.reset;
      stepsBar.hidden = !r;
      const lookBack = !!r && (SR.stepsNow()[r.step] || {}).key === 'back';
      weekTag.hidden = !lookBack;
      if (lookBack) { const lw = M.addDays(r.week, -7), t = 'Last week · ' + M.spanText(lw, M.addDays(lw, 6)); if (weekTag.textContent !== t) weekTag.textContent = t; }
      if (r) { const at = r.week + ':' + r.step; if (drawSteps.at !== at) { drawSteps.at = at; const rb = document.getElementById('rack-body'); if (rb) rb.scrollTop = 0; } }
      const rack = document.getElementById('rack');
      /* the panel stands on the left while it runs; the board measures its room again as soon as it moves.
         V11: on a phone (under 760 wide) and a window under 980 wide that stands upright (a tablet) it's a sheet
         along the bottom, so the week keeps the whole width (sheetMode, frame.css, body.c-rsheet); from 760 to
         1079 wide otherwise it's a narrower panel (frame.css) */
      document.body.classList.toggle('c-rsheet', sheetMode());
      const side = sheetMode() ? 'bottom' : 'left';
      if (rack && !(r && document.body.classList.contains('c-panel-off')) && (rack.dataset.edge || '') !== (r ? side : '')) {
        if (r) rack.dataset.edge = side; else delete rack.dataset.edge;
        requestAnimationFrame(() => requestAnimationFrame(() => SR.layoutInsets()));
        /* and once more after the panel and the board have settled */
        setTimeout(() => SR.layoutInsets(), 450); setTimeout(() => SR.layoutInsets(), 1100);
      }
      if (!r) { forgetMarks(); return; }
      const steps = SR.stepsNow();
      /* V11: a check only for a step that's done (left with Next); a step you've opened but not finished wears
         a ring; one not reached yet, or jumped past, is its number. The marks last the run (marksFor), so
         Finish later, Resume, or a reload never turn a step you only opened into a check */
      if (!r.passed) { const m = marksFor(r, steps); r.passed = m.passed; r.visited = m.visited; r.lastAt = r.step; }
      if (r.step === r.lastAt + 1 && steps[r.lastAt]) r.passed.add(steps[r.lastAt].key);
      r.lastAt = r.step;
      r.visited.add(steps[r.step].key);
      keepMarks(r);
      const kids = [];
      const stateOf = (s, i) => (i === r.step ? 'on' : r.passed.has(s.key) ? 'did' : r.visited.has(s.key) ? 'seen' : '');
      steps.forEach((s, i) => {
        if (s.key === 'done') return;
        const st = stateOf(s, i);
        if (kids.length) kids.push(h('i', 'c-sline' + (i > 0 && stateOf(steps[i - 1], i - 1) === 'did' ? ' did' : '')));
        const b = h('button', 'c-sbtn' + (st ? ' ' + st : ''));
        b.type = 'button';
        const mark = h('span', 'c-sdot');
        if (st === 'did') mark.appendChild(SR.icon('check', 7, '#252928')); else mark.textContent = String(i + 1);
        b.append(mark, h('span', 'c-sname', stepName(s.key)));
        b.setAttribute('aria-label', 'Step ' + (i + 1) + ', ' + stepName(s.key) + (st === 'did' ? ', done' : st === 'seen' ? ', opened' : ''));
        if (i === r.step) b.setAttribute('aria-current', 'step');
        b.addEventListener('click', () => { SR.Snd.init(); SR.goStep(i); });
        kids.push(b);
      });
      /* V11: the finish is the bar's quiet last stop, Your week, so the whole way is in view */
      const fin = steps.findIndex((s) => s.key === 'done');
      if (fin >= 0) {
        const on = r.step === fin;
        kids.push(h('i', 'c-sline end'));
        const b = h('button', 'c-sbtn c-sfin' + (on ? ' on' : ''));
        b.type = 'button';
        const mark = h('span', 'c-sdot');
        if (on) mark.appendChild(SR.icon('check', 7, '#252928'));
        b.append(mark, h('span', 'c-sname', stepName('done')));
        b.setAttribute('aria-label', 'The finish, ' + stepName('done'));
        if (on) b.setAttribute('aria-current', 'step');
        b.addEventListener('click', () => { SR.Snd.init(); SR.goStep(fin); });
        kids.push(b);
      }
      stepsBar.replaceChildren(...kids);
      fitSteps(); requestAnimationFrame(fitSteps);
    }
    /* V11: the names fold to the step you're on whenever the whole bar doesn't fit its room (seven stops on a
       board with Look back, the finish's wider panel, a tablet), measured rather than guessed from the width */
    function fitSteps() {
      if (stepsBar.hidden) return;
      stepsBar.classList.remove('fold');
      if (stepsBar.scrollWidth > stepsBar.clientWidth + 1) stepsBar.classList.add('fold');
    }
    window.addEventListener('resize', () => requestAnimationFrame(fitSteps));
    /* V11: the step bar's marks for a run, by week (and catch up): kept for this visit, and on this device outside
       a preview, until the reset is done. With nothing kept, the steps behind where it picks up count as done */
    const MARKS = 'sundayreset.v11.resetMarks', marksMem = {};
    let marksRun = null;
    /* V11: in a preview the key names the board and which time it was opened (app.js showPreview), so a Dev
       scenario never wears the marks of another, or of the last time it was open; the old ones are let go */
    const markKey = (r) => {
      const pv = SR.view.preview, p = pv ? 'p:' + (pv.id || '') + ':' + (pv.open || 0) + ':' : '';
      if (pv) Object.keys(marksMem).forEach((k) => { if (k.slice(0, 2) === 'p:' && k.slice(0, p.length) !== p) delete marksMem[k]; });
      return p + r.week + (r.catchup ? ':c' : '');
    };
    function marksFor(r, steps) {
      const k = markKey(r), wr = rec(r.week), finished = !!(wr && (r.catchup ? wr.caught : wr.done));
      const m = marksMem[k] || (!SR.view.preview && !finished ? stored(MARKS, {})[k] : null);
      if (m) return { passed: new Set(m.passed || []), visited: new Set(m.visited || []) };
      return { passed: new Set(steps.slice(0, r.step).map((s) => s.key)), visited: new Set() };
    }
    function keepMarks(r) {
      const k = markKey(r), m = { passed: [...r.passed], visited: [...r.visited] };
      marksRun = { k, week: r.week, catchup: r.catchup };
      if (JSON.stringify(marksMem[k]) === JSON.stringify(m)) return;
      marksMem[k] = m;
      keep(MARKS, { [k]: m });
    }
    /* a run that ended with Done forgets its marks, so opening the week again starts fresh; one put away with
       Finish later (SR.parked) keeps them, even for a week that was done before */
    function forgetMarks() {
      const f = marksRun; if (!f) return;
      marksRun = null;
      const wr = rec(f.week), pk = SR.parked;
      if (pk && pk.ws === f.week && !!pk.catchup === !!f.catchup) return;
      if (!(wr && (f.catchup ? wr.caught : wr.done))) return;
      delete marksMem[f.k];
      if (stored(MARKS, {})[f.k]) keep(MARKS, {});
    }
    /* V11: the reset's panel is a sheet along the bottom on a phone, and on a window under 980 wide that stands
       taller than it's wide (a tablet held upright), where a panel on the left left the week about 320 wide
       (drawSteps, panelTools; frame.css uses the same sizes) */
    function sheetMode() { const w = window.innerWidth; return w < 760 || (w < 980 && window.innerHeight >= w); }
    /* app.js layoutInsets asks the same question, so a sheet put away with Hide the steps still counts */
    window.SR_sheetMode = sheetMode;

    /* V11: Repeat last week left the Meals step for its quiet Same as last week (window.SR_mealStep), which
       brings over breakfast and lunch too */

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
        const adder = todoAdder({ placeholder: 'Add a to-do', label: 'Add a to-do for ' + SR.weekWords(ws), due: defDue, idle: () => 'Due ' + dayWord(defDue()) + ' unless you say a day, like “Call the bank Friday”.', onAdd: (t) => { fresh.add(t.id); draw(); } });
        const draw = () => {
          const st = SR.state;
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
            /* V11: Meals, since the meal board plans breakfast and lunch too: each night here, the rest in a line */
            const box = h('section', 'c-pcard'); box.appendChild(h('h3', '', 'Meals'));
            /* V11: who cooks, said the way the finish, the picture, and the shared text say it (cookTag) */
            dates.forEach((d) => {
              if (!SR.day(d).blocks.some((b) => b.dinner)) return;
              const x = st.dinners[d];
              let who = cookTag(x);
              /* a night decided only by how (leftovers, eating out) says the how as its name */
              /* V11: a night still to decide is Open, the word the finish and the picture use */
              const name = x && x.name ? x.name : who && who.cls === 'word' ? who.plain : x && x.cook ? 'Dinner' : d < SR.today ? 'Not planned' : 'Open';
              if ((x && !x.name && who && who.cls === 'word') || (who && who.quiet)) who = null;
              const row = h('button', 'c-prow'); row.type = 'button';
              row.append(h('span', 'c-pday', M.DAY_SHORT[M.weekday(d)]), h('span', 'c-pname' + (x && (x.name || x.cook) ? '' : ' quiet'), name));
              if (who) { const tag = h('span', 'c-who ' + who.cls, who.t); tag.title = who.name; row.appendChild(tag); }
              row.title = 'Dinner on ' + M.DAY_LONG[M.weekday(d)];
              /* (a screen reader hears who, not an initial) */
              row.setAttribute('aria-label', 'Dinner on ' + M.DAY_LONG[M.weekday(d)] + ': ' + name + (who ? ', ' + who.name : ''));
              row.addEventListener('click', () => { Kit.closeSheet(); backToPlan(ws); if (SR.inToday()) SR.setMode('planner'); SR.openSel({ type: 'dinner', date: d }); });
              box.appendChild(row);
            });
            /* V11: breakfasts and lunches planned on the meal board, said in one line under the nights */
            /* (a meal skipped isn't one planned, as the meal board counts) */
            const more = [['breakfast', 'breakfast', 'breakfasts'], ['lunch', 'lunch', 'lunches']].map(([k, one, many]) => { const n = dates.filter((d) => { const m = mealAt(d, k); return m && m.how !== 'skip'; }).length; return n ? n + ' ' + (n === 1 ? one : many) : ''; }).filter(Boolean);
            if (more.length) box.appendChild(h('p', 'c-pmore', 'Also ' + more.join(' and ') + '.'));
            /* V11: the whole week's meals, and the groceries, are on the meal board */
            /* V11: Done on the meal board brings this plan back */
            box.appendChild(Kit.btn('c-pmeals', 'Open the meal board', () => { Kit.closeSheet(); openMealBoard(ws, { back: () => openPlan(ws) }); }, 'pot'));
            grid.appendChild(box);
          }

          /* to-dos: what's due this week and still needs a time (the To-dos count, the same to-dos), then
             what has a time this week; each row checks off, opens to change, takes a time, and comes off */
          const tbox = h('section', 'c-pcard c-ptodos');
          const pl = M.placements(st), inWeek = (p) => p.date >= ws && p.date <= last;
          /* V11: the week this plan is for, Sunday to Saturday, the same window as the reset (SR.weekCounts),
             never the rolling seven days of To-dos' Next 7 days */
          const dueList = cur || future ? M.dueSoon(st, SR.today, M.diffDays(SR.today, last), SR.nowMin) : [];
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
          } else if (cur || future) { const dw = SR.dueWords(SR.weekCounts(ws), ws); tbox.appendChild(h('p', 'c-pgood', all ? dw.all + '.' : dw.none + ', and nothing with a time yet.')); }
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
          /* V11: less the moves the Moving card lists (yoursWeek), as the finish counts it */
          const yours = yoursWeek(ws);
          if (evenings.length || yours > 0) {
            const kept = h('section', 'c-pcard kept');
            kept.appendChild(h('div', 'c-kick', 'Kept for you'));
            if (evenings.length) {
              const first = Math.min(...evenings.map((d) => SR.day(d).blocks.filter((b) => b.free && b.start >= 16 * 60)[0].start));
              const names = evenings.map((d) => M.DAY_SHORT[M.weekday(d)]);
              const list = names.join(', ');
              kept.append(h('div', 'c-kbig', evenings.length + (evenings.length === 1 ? ' free evening' : ' free evenings')), h('p', '', list + ', from ' + M.clock(first) + '.'));
              if (yours > 0) kept.appendChild(h('p', '', 'Plus ' + M.hours(yours) + ' to yourself.'));
            } else kept.append(h('div', 'c-kbig', M.hours(yours)), h('p', '', 'to yourself ' + SR.weekWords(ws)));
            col.appendChild(kept);
          }
          if (SR.useTogether()) {
            const c = SR.weekCounts(ws);
            /* V11: time with people, as what it is and when, never a count of things with one partner */
            const rows = SR.peopleWeek ? SR.peopleWeek(ws) : [];
            if (rows.length) { const us = h('section', 'c-pcard'); us.append(h('div', 'c-kick', 'People'), h('p', 'c-pbody', rows.slice(0, 4).map((r) => r.name + ', ' + r.when.replace(/^Every/, 'every')).join('. ') + '.')); col.appendChild(us); }
            else if (c.kim.length) { const us = h('section', 'c-pcard'); us.append(h('div', 'c-kick', 'People'), h('p', 'c-pbody', c.kim.join(', ') + '.')); col.appendChild(us); }
          }
          /* V11: Moving, when it's on: the week's workouts, runs, and walks, and the goal they count toward */
          if (SR.useMove && SR.useMove()) {
            const mv = SR.weekMoves(ws), g = SR.state.settings.move || {};
            /* V11: with a goal it shows even before the first move, and it opens Moving (its goal and moves to drag) */
            if (mv.length || g.n) {
              const box = h('section', 'c-pcard'); box.appendChild(h('div', 'c-kick', 'Moving'));
              if (mv.length) box.appendChild(h('p', 'c-pbody', mv.slice(0, 5).map((x) => x.name + ', ' + M.DAY_SHORT[M.weekday(x.date)]).join('. ') + '.'));
              /* V11: how it stands, said as the Moving step says it (SR.moveWords: "2 of 3 times this week.") */
              if (g.n && SR.moveWords && mv.length) box.appendChild(h('p', 'c-pbody', SR.moveWords(ws).text));
              else if (g.n) box.appendChild(h('p', 'c-pbody', 'Nothing on the week yet.'));
              box.appendChild(Kit.btn('c-pmeals', 'Open Moving', () => { Kit.closeSheet(); backToPlan(ws); if (SR.inToday()) SR.setMode('planner'); SR.openSel({ type: 'moving', date: ws }); }, 'runner'));
              col.appendChild(box);
            }
          }
          /* V11 goals: each goal's week, its hours and its days; a row opens the goal, and the plan comes back after */
          const gw = SR.goalWeek ? SR.goalWeek(ws) : [];
          if (gw.length) {
            const box = h('section', 'c-pcard c-pgoals'); box.appendChild(h('div', 'c-kick', 'Goals'));
            gw.forEach((x) => {
              const row = h('button', 'c-pgoal'); row.type = 'button';
              const words = x.min ? x.line + ' · ' + runWords(x.days, dates, 'Every day') : x.line;
              row.append(h('b', '', x.name), h('span', '', words));
              row.setAttribute('aria-label', x.name + ': ' + words + '. Opens the goal');
              row.addEventListener('click', () => { Kit.closeSheet(); backToPlan(ws); if (SR.inToday()) SR.setMode('planner'); if (SR.openCountdown) SR.openCountdown({ goal: x.id }); else SR.openSel({ type: 'goal', id: x.id }); });
              box.appendChild(row);
            });
            col.appendChild(box);
          }
          grid.appendChild(col);
          card.appendChild(grid);

          /* something changed: one thing, not the whole reset again (only once there's a plan to change) */
          if (set && (cur || future)) {
            const ch = h('section', 'c-changed');
            ch.append(h('h3', '', 'Something changed?'), h('p', '', 'Change one thing. No need to redo the reset.'));
            const row = h('div', 'c-fixes');
            const fix = (name, line, fn) => { const b = Kit.btn('c-fix', '', () => { Kit.closeSheet(); fn(); }); b.replaceChildren(h('b', '', name), h('span', '', line)); return b; };
            if (SR.useDinners()) row.appendChild(fix('Change a meal', 'Swap days or change who cooks, on the meal board', () => openMealBoard(ws)));
            /* V11: it lays out To-dos' Next 7 days, so it says that window */
            if (cur && dueWeek().length) row.appendChild(fix('Place what’s due', 'Drag what’s due in the next 7 days onto the week', () => layOut('todo', 'soon')));
            row.appendChild(fix('Lighter day', 'Pick an easier kind of day', () => {
              Kit.zoom('day'); SR.view.focus = SR.today >= ws && SR.today <= dates[6] ? SR.today : ws; SR.render();
              setTimeout(() => { const k = document.querySelector('#kinds button'); if (k) k.click(); }, 350);
            }));
            const doneToday = planned[ws] && new Date(planned[ws]).toDateString() === new Date().toDateString();
            if (ws === M.weekStart(SR.today) && M.weekday(SR.today) !== 0 && !doneToday) row.appendChild(fix('Plan the rest of the week', 'To-dos and meals, ' + minutesOf(runSteps(ws, true), true) + ' min', () => openIntro(ws, true)));
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
    /* (today and the six days after it: dueSoon counts days after today) */
    const dueWeek = () => M.dueSoon(SR.state, SR.today, 6, SR.nowMin);
    const capN = (n) => (n > 99 ? '99+' : String(n));
    const inboxGroup = () => SR.state.groups.find((g) => g.id === 'inbox') || SR.state.groups.find((g) => /^inbox$/i.test(g.name)) || SR.state.groups[0] || null;
    const byDue = (a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0);
    /* a day the short way: today, tomorrow, Thursday, or Oct 24 */
    const dayWord = (d) => { const n = M.diffDays(SR.today, d); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 && n < 7 ? M.DAY_LONG[M.weekday(d)] : M.MONTH_SHORT[M.parts(d).m - 1] + ' ' + M.parts(d).d; };
    const planWeek = () => { const wd = M.weekday(SR.today); return wd === 0 || (wd === 6 && SR.nowMin >= 17 * 60) ? SR.resetWeek() : M.weekStart(SR.today); };
    /* V11: a week named by the reset's one rule (SR.weekWords): This week's plan, Next week's plan, That week's
       plan, Plan for the week of Oct 25 */
    const weekTitle = (ws, noun) => { const w = SR.weekWords(ws); return /^the week of/.test(w) ? noun.charAt(0).toUpperCase() + noun.slice(1) + ' for ' + w : w.charAt(0).toUpperCase() + w.slice(1) + '’s ' + noun; };
    const planTitle = (ws) => weekTitle(ws, 'plan');
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
      /* V11-2 (a day that went by, said calmly): when it was due, in plain ink, the board's words (SR.wasDue); it waits in
         its own group (From last week), and its button gives it a new day */
      if (n < 0) return { text: SR.wasDue ? SR.wasDue(t.due) : 'Was due ' + (n === -1 ? 'yesterday' : n > -7 ? M.DAY_LONG[M.weekday(t.due)] : M.MONTH_SHORT[M.parts(t.due).m - 1] + ' ' + M.parts(t.due).d), ask: !SR.wasDue };
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
      /* V11-2 (a day that went by, said calmly): one from an earlier day says when it was due, and when its time was,
         plainly, and its button gives it a new day; it's never "after it's due" or "time passed" */
      const past = !!(SR.pastDue && SR.pastDue(t)), after = plan.after && !past, newDay = past && !t.repeat;
      const bits = [], dw = dueWords(t);
      if (t.done) bits.push({ text: t.skipped ? 'Skipped this time' : 'Done' });
      else if (plan.status === 'planned') {
        const p = at || plan.next;
        if (p) bits.push({ text: whenText(p) });
        if (after) bits.push({ text: 'That’s after it’s due', ask: true });
        else if (dw) bits.push({ text: dw.text });
      } else {
        if (dw) bits.push(dw);
        if (plan.status === 'partial') bits.push({ text: plan.timed + ' of ' + plan.open + ' steps ' + (plan.timed === 1 ? 'has' : 'have') + ' a time' });
        else if (plan.status === 'missed') { const was = at ? 'Was set for ' + whenText(at) : SR.wasSet ? SR.wasSet(t, ctx.where.get(t.id)) : ''; if (was) bits.push({ text: was }); }
        else bits.push({ text: 'No time yet' });
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
      if (!t.done && (plan.status !== 'planned' || after)) {
        const tm = h('button', 'c-td-time'); tm.type = 'button';
        const what = newDay ? 'Give it a new day' : after ? 'Move it before it’s due' : plan.status === 'partial' ? 'Give the rest a time' : 'Give it a time';
        tm.setAttribute('aria-label', what + ': ' + t.name); tm.title = what;
        /* V11: a quiet raised button in white; gold is the surface's one call to action */
        tm.appendChild(SR.icon('calendar', 8, '#FFFFFF'));
        /* (a new day: the place panel, whose day becomes its own; one with steps left opens to its steps) */
        tm.addEventListener('click', () => { SR.Snd.init(); if (newDay ? (t.steps || []).some((s) => !s.done) : plan.status === 'partial' || after) openTodo(t, ctx); else giveTime(t, ctx); });
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
      /* V11: the toast names the to-do, so its Undo can too */
      SR.toast(t.name + ' is in ' + (p.group ? p.group.name : 'your list') + (t.due ? ', due ' + dayWord(t.due) : '') + '.', 'good', SR.undoAct ? SR.undoAct(t.name + ' is off your list.') : { label: 'Undo', fn: SR.undo });
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
       Next 7 days leads, on a raised card, with the same to-dos the To-dos button counts; then each list in its own
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
        /* (V11-3, the design review: with a strip of its own under the list, so More below never sits on a row) */
        const more = scrollHint(scroll, card, true);
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
          /* a long list shows its first five; what's due in the next 7 days always shows whole */
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
          /* the next 7 days lead (V11: a rolling window, named for what it is, so it never reads as the week
             the reset plans) */
          /* V11-2 (a day that went by, said calmly): what was due before today waits in its own group after it, named for
             when it's from (From last week), each row saying when it was due, with Give it a new day */
          const isPast = (x) => !!(SR.pastDue && SR.pastDue(x.task));
          const dwAll = dueWeek(), dw = dwAll.filter((x) => !isPast(x)), back = dwAll.filter(isPast);
          const dueRows = pick('soon', dw.map((x) => x.task.id));
          shown += dueRows.length;
          if (!q || dueRows.length) {
            const later = st.tasks.filter((t) => !t.done && !t.archived && t.due && t.due > M.addDays(SR.today, 7)).sort(byDue)[0];
            frag.appendChild(section({ id: 'soon', name: 'Next 7 days', icon: 'flag', cat: 'yours', n: dw.length, rows: dueRows, cls: 'due', lay: true, out, pl, empty: 'Nothing due in the next 7 days.' + (later ? ' Next: ' + later.name + ', ' + dayWord(later.due) + '.' : '') }));
          }
          if (back.length && SR.fromGroups) SR.fromGroups(back, (x) => x.task.due).forEach((g) => {
            const rows = pick(g.id, g.rows.map((x) => x.task.id));
            shown += rows.length;
            if (q && !rows.length) return;
            frag.appendChild(section({ id: g.id, name: g.name, icon: 'later', cat: 'open', n: g.rows.length, rows, cls: 'from', pl }));
          });
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
          /* V11: the week's meals are on the meal board, breakfast and lunch too */
          if (SR.useDinners()) foot.appendChild(Kit.btn('c-tdlink', 'Meals', () => { closeDock(); openMealBoard(); }, 'pot'));
          if (SR.useTogether()) foot.appendChild(Kit.btn('c-tdlink', 'People', () => layOut('kim'), 'heart'));
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
      /* (V11, the Planner walk, 1.1: one teacher at a time. Not while Getting started is still on the bar, unfinished, nor
         under the board's own coach, Show me's ring and its card) */
      const free = () => chipState().kind === 'plan' && !rchip.hidden && rchip.offsetParent !== null && !SR.view.reset && !SR.view.sel && !Kit.openSheetEl && !mat && !dock && !menu
        && !document.querySelector('.c-coach, .c-mat, .coach') && document.getElementById('sheet').hidden && !SR.view.preview && !SR.view.quietTips && !(SR.movesInfo && SR.movesInfo.shown);
      const hide = () => { clearTimeout(wait); wait = 0; if (tip) { tip.remove(); tip = null; } };
      const place = () => {
        if (!tip) return;
        const r = rchip.getBoundingClientRect();
        tip.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + 'px';
        tip.style.bottom = Math.round(window.innerHeight - r.top + 14) + 'px';
        tip.style.setProperty('--tip-x', Math.round(r.width / 2) + 'px');
      };
      /* V11 (the Today walk): a tip waits for a quiet moment: the view the same for four seconds, and never on the
         first switch from Now (Day pressed to check one thing) */
      let viewWas = '', stillSince = Date.now(), wasNow = SR.inToday(), fromNow = 0, visit = 0;
      const watch = () => {
        const v = [SR.inToday(), SR.view.zoom, SR.view.focus, !!SR.view.sel, !!SR.view.bench].join('|');
        if (v !== viewWas) { viewWas = v; stillSince = Date.now(); }
        const now = SR.inToday();
        if (wasNow && !now) visit = ++fromNow;
        else if (!wasNow && now) visit = 0;
        wasNow = now;
      };
      const quiet = () => Date.now() - stillSince >= 4000 && visit !== 1;
      const show = () => {
        if (seen || tip || !free()) return;
        if (!quiet()) { if (visit !== 1 && !wait) wait = setTimeout(() => { wait = 0; show(); }, Math.max(400, 4000 - (Date.now() - stillSince))); return; }
        seen = true; keep(SEEN, true);
        tip = h('div', 'k c-planhint'); tip.setAttribute('role', 'note');
        const acts = h('div', 'c-planhint-acts');
        acts.append(Kit.btn('c-go', 'See the plan', () => { const s = chipState(); hide(); if (s.go) s.go(); }), Kit.btn('c-planhint-x', 'Got it', hide));
        tip.append(h('b', '', 'Your plan for the week is here'), h('p', '', 'Meals, to-dos, and time for you. Tap it any time this week.'), acts);
        app.appendChild(tip);
        place();
      };
      Kit.renders.push(() => {
        watch();
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
    /* V11: o.week, o.cell ([date, meal]) and o.shop open the board on that week, that day's card, or its groceries */
    window.SR_planMeals = (o) => {
      o = o || {};
      /* the meal board opens over the phone's list; from the phone's desk it goes back to the list first */
      if (SR.phoneDay && SR.phoneDay()) { SR.closePhoneDesk({ keep: true }); setTimeout(() => Kit.v7.openMealBoard(o.week, o), 80); return; }
      Kit.v7.openMealBoard(o.week, o);
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
    /* V11: with room (the meal board's columns), a region that scrolls keeps a strip under it for the
       button (.c-more-room, 44 px: the button and 8 px), so the button never sits on a row. The strip stays
       while the region scrolls at all, so reaching the end never makes the rows jump */
    function scrollHint(box, host, room) {
      const btn = Kit.btn('c-more', 'More below', () => box.scrollBy({ top: box.clientHeight * 0.7, behavior: feelOn() ? 'smooth' : 'auto' }), 'down');
      btn.tabIndex = -1; btn.setAttribute('aria-hidden', 'true');
      host.appendChild(btn);
      let roomAt = 0;
      const check = () => {
        if (!box.isConnected) return;
        const scrolls = box.clientHeight > 0 && getComputedStyle(box).overflowY !== 'visible';
        /* (the strip changes the region's size, so it changes on the next frame, never inside the resize
           observer's own call, which the browser reports as a loop) */
        if (room) {
          const has = box.classList.contains('c-more-room'), want = scrolls && box.scrollHeight - box.clientHeight > (has ? 4 : 12);
          if (want !== has && !roomAt) roomAt = requestAnimationFrame(() => { roomAt = 0; box.classList.toggle('c-more-room', want); check(); });
        }
        const more = box.scrollHeight - box.scrollTop - box.clientHeight > 12 && scrolls;
        box.classList.toggle('c-more-below', more);
        btn.classList.toggle('on', more);
        /* (measured in the host's own pixels: while the meal board scales in, screen pixels are 4 percent short) */
        /* (in the strip once it's there, until then over the foot. Held from the host's bottom edge, which
           moves with the region's, so a window resized before the next check never leaves the button
           hanging past the host, where it would make the page around it scroll) */
        if (more) {
          const r = box.getBoundingClientRect(), hr = host.getBoundingClientRect(), k = host.offsetWidth ? hr.width / host.offsetWidth || 1 : 1;
          btn.style.left = ((r.left - hr.left + r.width / 2) / k) + 'px';
          btn.style.top = 'auto'; btn.style.bottom = ((hr.bottom - r.bottom) / k + (room && box.classList.contains('c-more-room') ? -40 : 16)) + 'px';
        }
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
    /* V11, touch: one pointer carries at a time; in a list that scrolls a finger presses to lift (or moves
       across the list), as the board's tiles do (app.js dragSource); a touch the browser takes back, or
       Escape, flies the piece home and places or clears nothing, and no later tap finishes it.
       carried: { id, cancel } of the piece in hand */
    let carried = null;
    /* (V11, lift and place: the ways the lists around a piece scroll, 'xy' when a sideways row sits in a list that
       scrolls down, as the meal board's Fill the week row once did: every move then scrolls one of them, so only
       the hold lifts, and the browser never takes a finger that moved across the near list but along the far one) */
    const axisOf = (el) => { let x = false, y = false; for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) y = true; if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) x = true; } return x && y ? 'xy' : x ? 'x' : y ? 'y' : null; };
    const stillPage = (on) => { if (SR.carryHold) SR.carryHold(on); };
    const inHand = (on) => { if (SR.carrying) SR.carrying(on); };
    function draggable(el, payload, cfg) {
      el.classList.add('c-drag');
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !e.isPrimary || e.target.closest('.c-nodrag')) return;
        /* (a first finger means nothing else is down: a piece still marked as carried lost its end) */
        if (carried) carried.cancel();
        SR.Snd.init();
        const r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, pid = e.pointerId;
        const touch = e.pointerType === 'touch', axis = touch && getComputedStyle(el).touchAction !== 'none' ? axisOf(el) : null;
        let armed = !axis, wait = 0, picked = false;
        const t0 = e.timeStamp;
        carried = { id: pid, cancel: () => up({ type: 'pointercancel', pointerId: pid }) };
        const arm = () => { if (armed) return; armed = true; picked = true; el.classList.remove('c-pressing'); el.classList.add('c-lifting'); stillPage(true); snd('pick'); if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { /* fine */ } } };
        if (axis) { wait = setTimeout(arm, 300); el.classList.add('c-pressing'); } else if (e.pointerType !== 'mouse') stillPage(true);
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
          /* (V11, lift and place: the top edge is measured from below a sticky title, and a finger gets 80 px; it
             scrolls at once over the title or past the edge, and after a quarter second's rest inside the edge, so
             a drop on a row near the edge doesn't scroll away under it; faster the deeper in, never a jump) */
          const rr = auto.sc.getBoundingClientRect(), edge = touch ? 80 : 56;
          const head = auto.sc.querySelector('.c-mat-head'), top = head ? Math.max(rr.top, head.getBoundingClientRect().bottom) : rr.top;
          const dTop = auto.y - top, dBot = rr.bottom - auto.y;
          const k = dTop < edge ? (edge - Math.max(0, dTop)) / edge : dBot < edge ? (edge - Math.max(0, dBot)) / edge : 0;
          if (!k) { auto.since = 0; return; }
          const now = performance.now(), outside = dTop < 0 || dBot < 0;
          /* (resting on a place it can go, wholly in view, is aiming at it, so the list holds still: on a short screen
             the first row under the title sits inside the edge. Pushing on, onto the title or past the edge, scrolls) */
          const aimed = over || refused;
          if (!outside && aimed) { const zr = aimed.getBoundingClientRect(); if (zr.top >= top - 1 && zr.bottom <= rr.bottom + 1) { auto.since = 0; return; } }
          if (!auto.since) auto.since = now;
          if (!outside && now - auto.since < 250) { auto.raf = requestAnimationFrame(autoStep); return; }
          const v = (dTop < edge ? -1 : 1) * Math.max(1, 22 * k * k);
          const was = auto.sc.scrollTop;
          auto.sc.scrollTop += v;
          if (auto.sc.scrollTop !== was) { aimAt(auto.x, auto.y); auto.raf = requestAnimationFrame(autoStep); }
        };
        const swing = (now) => {
          if (!ghost) return;
          const dt = Math.min(0.05, Math.max(0.001, (now - sw.at) / 1000)); sw.at = now;
          const v = (sw.cx - sw.px) / dt; sw.px = sw.cx;
          /* V11, lift and place: the board's own law for a card in hand (docs/LIFT-AND-PLACE.md 3.6): 1.6 Hz,
             damping 0.36, desk gravity, a small trailing lean with speed, resting at -2 degrees, soft cap 12 */
          const fv = sw.vx; sw.vx = fv + (v - fv) * (1 - Math.exp(-dt * 45));
          const acc = Math.max(-30000, Math.min(30000, (sw.vx - fv) / dt)), lean = Math.max(-3, Math.min(3, 0.002 * sw.vx));
          const n = Math.ceil(dt * 240), hh = dt / n;
          for (let i = 0; i < n; i++) { sw.v += (-101 * (sw.x - lean) - 7.24 * sw.v + 0.145 * acc) * hh; sw.x += sw.v * hh; }
          if (!Number.isFinite(sw.x) || !Number.isFinite(sw.v)) { sw.x = 0; sw.v = 0; }
          ghost.style.rotate = (-2 + 12 * Math.tanh(sw.x / 12)).toFixed(2) + 'deg';
          sw.raf = requestAnimationFrame(swing);
        };
        const move = (ev) => {
          if (ev.pointerId !== pid) return;
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          /* (held long enough by the events' own clock, whatever order a busy page runs the timer and the move in) */
          if (!moved && !armed && ev.timeStamp - t0 >= 300) arm();
          if (!moved && !armed) {
            if (Math.hypot(dx, dy) < 8) return;
            const across = axis === 'x' ? -dy > Math.abs(dx) : axis === 'y' ? Math.abs(dx) > Math.abs(dy) : false;
            /* along the list: a scroll, so the press lets go */
            if (!across) { stop(); return; }
            arm();
          }
          if (!moved && Math.hypot(dx, dy) < 6) return;
          if (!moved) {
            moved = true;
            el.classList.remove('c-pressing', 'c-lifting');
            /* (the carry is the page's from here, wherever the piece it came from goes) */
            try { document.body.setPointerCapture(pid); } catch (err) { /* fine */ }
            /* (V11, lift and place: and it keeps it: if anything takes the pointer before the finger lets go, the
               page takes it back, so no list under the finger can keep it) */
            document.body.addEventListener('lostpointercapture', keepCap);
            inHand(true);
            ghost = el.cloneNode(true); ghost.classList.add('c-ghost-block'); ghost.classList.remove('c-drag');
            Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', transform: 'none', transformOrigin: (sx - r.left) + 'px ' + (sy - r.top) + 'px', translate: r.left + 'px ' + r.top + 'px', rotate: '-2deg', scale: '1' });
            document.body.appendChild(ghost);
            if (feelOn()) { requestAnimationFrame(() => { if (ghost) ghost.style.scale = '1.06'; }); sw.at = performance.now(); sw.raf = requestAnimationFrame(swing); }
            else ghost.style.scale = '1';
            el.classList.add('c-lifted'); if (!picked) snd('pick');
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
        function keepCap(ev) {
          if (ev.pointerId !== pid) return;
          if (!ghost || !carried || carried.id !== pid) { document.body.removeEventListener('lostpointercapture', keepCap); return; }
          try { document.body.setPointerCapture(pid); } catch (err) { /* the pointer is gone: its pointercancel ends the carry */ }
        }
        const stop = () => {
          clearTimeout(wait); el.classList.remove('c-pressing', 'c-lifting');
          document.body.removeEventListener('lostpointercapture', keepCap);
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('keydown', esc, true);
          if (carried && carried.id === pid) carried = null;
          stillPage(false);
        };
        /* Escape while carrying puts the piece back, and letting go after places nothing */
        const esc = (ev) => { if (ev.key !== 'Escape' || !moved) return; ev.preventDefault(); ev.stopPropagation(); up({ type: 'pointercancel', pointerId: pid }); };
        const up = (ev) => {
          if (ev.pointerId !== pid) return;
          /* taken back by the browser (a system gesture, a call) or by Escape: it flies home, nothing is placed */
          const cancelled = ev.type === 'pointercancel';
          stop();
          inHand(false);
          cancelAnimationFrame(sw.raf); cancelAnimationFrame(auto.raf); auto.sc = null;
          if (!moved) { if (!cancelled && !(armed && axis) && cfg.onTap) cfg.onTap(payload, el); return; }
          dragEndAt = performance.now();
          if (cfg.onEnd) cfg.onEnd(payload);
          const g = ghost; ghost = null;
          const still = !feelOn();
          if (cancelled) { if (over) over.classList.remove('c-over'); if (refused) refused.classList.remove('c-no'); over = null; refused = null; }
          const target = over, no = refused;
          if (no) { no.classList.remove('c-no'); refused = null; const say = cfg.why(no, payload); if (say) SR.toast(say, ''); }
          if (target) {
            el.classList.remove('c-lifted');
            target.classList.remove('c-over');
            const tr = target.getBoundingClientRect();
            const copy = alt;
            /* V11, lift and place: it flies into the zone's box (160 ms), level, its shadow tightening, and the
               moment it arrives the zone takes it with the clack, and what it placed there squashes once. With
               calmer motion it's set in place with a short fade and the sound */
            const sel = '[data-zone]' + Object.keys(target.dataset).map((k) => '[data-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + '="' + (window.CSS && CSS.escape ? CSS.escape(target.dataset[k]) : target.dataset[k]) + '"]').join('');
            const arrive = () => {
              g.remove(); cfg.onDrop(target, payload, { copy }); snd('clack', 0.85);
              if (still) return;
              let z = null; try { z = document.querySelector(sel); } catch (err) { /* fine */ }
              z = z || (target.isConnected ? target : null);
              const piece = z && (z.querySelector('.c-dblock, .c-su-placed, .c-su-tile, .c-piece') || z.firstElementChild);
              if (piece && piece.animate) piece.animate([{ transform: 'scale(1.02, 0.96)' }, { transform: 'none' }], { duration: 140, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
            };
            if (still) { g.style.transition = 'opacity 0.16s ease-out'; g.style.opacity = '0'; arrive(); return; }
            const gr = g.getBoundingClientRect(), ox = sx - r.left, oy = sy - r.top;
            const s1 = Math.max(0.5, Math.min(1.2, Math.min(tr.width / Math.max(1, r.width), tr.height / Math.max(1, r.height))));
            const tx = tr.left + tr.width / 2 - ox - s1 * (r.width / 2 - ox), ty = tr.top + tr.height / 2 - oy - s1 * (r.height / 2 - oy);
            g.style.transition = 'translate 0.16s cubic-bezier(0.2, 0.8, 0.2, 1), scale 0.16s cubic-bezier(0.2, 0.8, 0.2, 1), rotate 0.16s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.16s ease-out';
            Object.assign(g.style, { translate: tx + 'px ' + ty + 'px', scale: String(s1), rotate: '0deg', boxShadow: '0 2px 4px -1px rgba(30, 15, 4, 0.5)' });
            if (gr.width) setTimeout(arrive, 160); else arrive();
          } else if (cfg.onOut && !no && !cancelled) {
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
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        window.addEventListener('keydown', esc, true);
      });
      /* (a touch keeps going to the piece it started on even if a redraw takes it off the page) */
      if (SR.holdStill) el.addEventListener('touchmove', SR.holdStill, { passive: false });
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
      toastsUp(onPhone);
      build(inner);
      matClose = onClose || null;
      requestAnimationFrame(() => mat && mat.classList.add('in'));
      return inner;
    }
    /* V11: toasts come up over a mat while it's open and until it has gone (they sat under it, so what the
       meal board did, and its Meals saved, were never seen). On a phone the mat covers the whole app, so the
       toasts step out beside it, and go home once it's gone */
    let toastHome = null;
    function toastsUp(onPhone) {
      document.body.classList.add('c-toasts-up');
      const t = document.getElementById('toasts');
      if (!onPhone || !t || toastHome) return;
      toastHome = { parent: t.parentElement, next: t.nextSibling };
      document.body.appendChild(t);
    }
    function toastsBack() {
      if (mat) return;
      document.body.classList.remove('c-toasts-up');
      const t = document.getElementById('toasts');
      if (!t || !toastHome) return;
      toastHome.parent.insertBefore(t, toastHome.next && toastHome.next.parentElement === toastHome.parent ? toastHome.next : null);
      toastHome = null;
    }
    /* V11: a mat that's open while the window crosses a phone's size (an iPhone Duo opening or closing, a phone
       turning) goes with it, the way openMat would have put it: over the phone's own view, the whole screen, or
       back on the desk. What had focus in it keeps it (docs/APPLE-READINESS.md) */
    function matCross() {
      if (!mat) return;
      const onPhone = !!(SR.view.phone && !SR.view.phoneDesk);
      if (onPhone === mat.classList.contains('c-onphone')) return;
      const had = mat.contains(document.activeElement) ? document.activeElement : null;
      mat.classList.toggle('c-onphone', onPhone);
      (onPhone ? document.body : app).appendChild(mat);
      if (onPhone) toastsUp(true);
      else if (toastHome) {
        const t = document.getElementById('toasts');
        toastHome.parent.insertBefore(t, toastHome.next && toastHome.next.parentElement === toastHome.parent ? toastHome.next : null);
        toastHome = null;
      }
      if (had && had.isConnected) had.focus({ preventScroll: true });
    }
    /* (at once, after the board's own resize has said which side it's on, so a mat that redraws for its new
       width, like the meal board turning on a phone, measures itself where it now stands) */
    window.addEventListener('resize', matCross);
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
      setTimeout(() => { m.remove(); toastsBack(); }, 260);
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
    /* V11: a word like vegan or gluten free names its own part of a meal, up to a comma or the next "and"
       or "with": vegan cheese pizza is no dairy, and vegan pancakes, scrambled eggs still has eggs. A meat
       named for what it's made of instead (a veggie burger, black bean burgers, cauliflower steaks, veggie
       hot dogs) is none of the meats (tests/meals-diet.test.mjs) */
    const QUAL = (w) => '\\b(?:' + w + ')\\b(?:(?! and | with |&|\\+)[^,;])*';
    const NOT_MEAT = '\\b(?:veggie|vegan|vegetarian|plant[ -]?based|meatless|impossible|beyond|tofu|tempeh|seitan|soy|jackfruit) (?:(?!and |with |or )[a-z]+ )?(?:burgers?|meatballs?|steaks?|sausages?|hot ?dogs?|nuggets?|bacon|chicken|crumbles|chorizo|pepperoni|patt(?:y|ies)|meat|jerky|wings?|tenders|ham|shrimp|tuna|fish)\\b'
      + '|\\b(?:(?:black )?beans?|lentils?|mushrooms?|portobellos?|cauliflower|chickpeas?|quinoa|falafel|eggplants?|veggie) (?:burgers?|meatballs?|steaks?|patt(?:y|ies))\\b';
    const notRx = (...more) => new RegExp([NOT_MEAT].concat(more).join('|'), 'g');
    const LEAVE = [
      { id: 'chicken', name: 'Chicken', re: /\bchicken|\bwings?\b|\bdrumsticks?\b/, not: notRx() },
      { id: 'turkey', name: 'Turkey', re: /\bturkey/, not: notRx() },
      { id: 'beef', name: 'Beef', re: /\bbeef|\bsteaks?\b|\b(?:ham|cheese)?burgers?\b|\bbrisket|\bmeatballs?/, not: notRx('\\bbeefsteak tomato(?:es)?', '\\b(?:turkey|chicken|salmon|tuna|fish|lamb|bison|pork|ham|swordfish|venison) (?:burgers?|meatballs?|steaks?)\\b') },
      { id: 'pork', name: 'Pork', re: /\bpork|\bbacon|\bhams?\b|\bprosciutto|\bpepperoni|\bchorizo|\bsalami|\bsausages?\b|\bcarnitas/, not: notRx('\\b(?:beef|chicken|turkey) (?:sausages?|bacon|hot ?dogs?|pepperoni|hams?|chorizo|salami)\\b') },
      { id: 'fish', name: 'Fish', re: /\bfish|\bsalmon|\btuna\b|\bcod\b|\btilapia|\btrout|\bhalibut|\bsardines?|\banchov|\bsushi|\blox\b/, not: notRx() },
      { id: 'shellfish', name: 'Shellfish', re: /\bshrimp|\bprawns?|\bcrabs?\b|\blobsters?|\bscallops?|\bclams?\b|\bmussels?|\boysters?/, not: notRx() },
      { id: 'eggs', name: 'Eggs', re: /\beggs?\b|\bomelets?|\bomelettes?|\bfrittatas?|\bquiche/, not: new RegExp('\\beggplants?|' + QUAL('vegan|egg[ -]?free|plant[ -]?based'), 'g') },
      { id: 'dairy', name: 'Dairy', re: /\bmilk|\bcheese|\byogh?urt|\bbutter\b|\bcream\b|\bqueso|\bparmesan|\bmozzarella|\bcheddar|\bfeta\b|\bricotta|\bquesadillas?|\bpizza|\blasagna|\bmac\b|\bbuttermilk|\bpaneer|\bghee\b|\balfredo|\bkefir|\bcustard|\bmascarpone|\bhalloumi|\bburrata|\bbrie\b|\bgouda|\bgelato|\bwhey\b/, not: new RegExp('\\b(?:peanut|almond|nut|cashew|seed|apple|sunflower|pumpkin|cocoa) butter|\\b(?:almond|oat|soy|coconut|rice|cashew|hemp) milk|\\bcoconut (?:cream|yogh?urt)|' + QUAL('vegan|dairy[ -]?free|non[ -]?dairy|plant[ -]?based') + '(?: and cheese\\b)?', 'g') },
      { id: 'gluten', name: 'Gluten', re: /\bbread|\btoast|\bpasta|\bspaghetti|\bnoodles?|\bwraps?\b|\btortillas?|\bsandwich|\bpancakes?|\bwaffles?|\bbagels?|\bpizza|\bcouscous|\bflour|\bbuns?\b|\bpitas?\b|\bcrackers?|\bcereal|\bburritos?|\bquesadillas?|\bmac\b|\blasagna|\bdough|\bpb and j/, not: new RegExp('\\bcorn tortillas?|\\brice noodles?|' + QUAL('gluten[ -]?free'), 'g') },
      { id: 'nuts', name: 'Nuts', re: /\bnuts?\b|\bpeanuts?|\balmonds?|\bwalnuts?|\bcashews?|\bpecans?|\bpistachios?|\bhazelnuts?|\bpb\b/, not: new RegExp(QUAL('nut[ -]?free'), 'g') }
    ];
    /* V11: meat by any other name; "meatless" isn't, and neither is a veggie hot dog (MEAT_NOT) */
    const MEAT = /\bmeat(?:s|y|balls?|loaf)?\b|\blamb\b|\bduck\b|\bvenison|\bjerky|\bhot ?dogs?|\bdeli\b|\bgyros?\b|\bbison\b|\bveal\b/;
    const MEAT_NOT = notRx();
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
      if (dt && dt.meat && MEAT.test(s.replace(MEAT_NOT, ' '))) return dt.name;
      /* honey, never honeydew or honeycrisp */
      if (dt && dt.honey && /\bhoney\b/.test(s)) return dt.name;
      for (const w of b.words) { const stem = norm(w).replace(/(es|s)$/, ''); if (stem && new RegExp('\\b' + esc(stem)).test(s)) return w; }
      return null;
    }

    /* every meal change goes through the board's commit, so one Undo takes it back. The meal board
       redraws itself after its own changes, and after anyone else's (an Undo from the keyboard) */
    let mealBusy = false, mealLive = null, mealSigWas = '';
    /* V11: the grocery checks too, since the list lives on the board */
    /* V11 goals: and the Meal prep blocks, which the board lists under its batch cooks */
    const prepSig = () => { const out = [], ds = SR.state.dates || {}; Object.keys(ds).forEach((d) => ((ds[d] && ds[d].adds) || []).forEach((a) => { if (a.src && a.src.type === 'prep') out.push(d, a.id, a.start, a.dur, !!a.skipped); })); return out; };
    const mealSig = () => JSON.stringify([SR.state.meals || null, SR.state.dinners || null, SR.state.mealbook || null, (SR.state.recipes || []).length, SR.state.shopping || null, SR.today, prepSig()]);
    Kit.renders.push(() => { if (mealLive && !mealBusy && mealSig() !== mealSigWas) mealLive(); });
    /* breakfasts and lunches this device kept before V11 move onto the board with the first meal change.
       V11: the move is the board catching up, not part of that change, so its Undo never takes them back.
       The device keeps its copy (V7 to V10 read only that) and a note of what moved, so only what an older
       build adds or changes later moves again: into an empty meal, or one V11 hasn't changed since */
    const OLD_MEALS = 'sundayreset.v7.meals', OLD_MOVED = 'sundayreset.v7.meals.moved';
    let oldMeals = null, oldWas = {};
    const cellName = (c) => (typeof c === 'string' ? c : (c && c.name) || '');
    /* the older build's meal for a cell, when it's new since the last move and the board's is empty or as moved */
    function oldMeal(st, d, k) {
      if (!oldMeals || SR.view.preview) return '';
      const n = oldMeals[d] && oldMeals[d][k], was = oldWas[d] && oldWas[d][k];
      if (!n || typeof n !== 'string' || n === was) return '';
      const own = cellName(st.meals && st.meals[d] && st.meals[d][k]);
      return !own || own === was ? n : '';
    }
    /* V11: the reset's first look counts these as planned already (app.js resetSnap) */
    window.SR_oldMeal = (d, k) => oldMeal(SR.state, d, k);
    try {
      const o = JSON.parse(localStorage.getItem(OLD_MEALS) || 'null');
      oldWas = JSON.parse(localStorage.getItem(OLD_MOVED) || 'null') || {};
      if (o && typeof o === 'object' && Object.keys(o).some((d) => o[d] && ['breakfast', 'lunch'].some((k) => o[d][k] && o[d][k] !== (oldWas[d] && oldWas[d][k])))) oldMeals = o;
    } catch (e) { /* storage off */ }
    function moveOldMeals(st) {
      if (!oldMeals || SR.view.preview) return;
      let moved = 0;
      /* (a meal an older build changed is a new meal, so it comes in whole, as that build named it) */
      Object.keys(oldMeals).forEach((d) => ['breakfast', 'lunch'].forEach((k) => {
        const n = oldMeal(st, d, k);
        if (n) { st.meals = st.meals || {}; st.meals[d] = Object.assign({}, st.meals[d], { [k]: { name: n } }); moved++; }
      }));
      /* V11 goals: leftovers of a meal that came in renamed take its name, and ones whose meal it replaced let go */
      if (moved) M.syncLeftovers(st);
    }
    function commitMeals(fn) {
      const moving = !!oldMeals && !SR.view.preview;
      mealBusy = true;
      let r;
      /* before commit takes its snapshot, so Undo keeps them. V11 goals: every meal change ends with
         Model.syncLeftovers in the same change, so leftovers follow their meal's name, and let go of a meal
         that's gone or isn't cooked any more, under one Undo */
      try { if (moving) moveOldMeals(SR.state); r = SR.commit(() => { const x = fn(SR.state); M.syncLeftovers(SR.state); return x; }); } finally { mealBusy = false; }
      /* commit saves the board only when the change goes through; until then they move again next time */
      if (moving && r !== false && !(r && r.ok === false)) {
        oldWas = JSON.parse(JSON.stringify(oldMeals)); oldMeals = null;
        try { localStorage.setItem(OLD_MOVED, JSON.stringify(oldWas)); } catch (e) { /* fine */ }
      }
      if (mealLive) mealSigWas = mealSig();
      return r;
    }
    const editBook = (fn) => commitMeals((st) => { st.mealbook = Object.assign({ own: [], hide: [], diet: 'all', out: [], words: [] }, st.mealbook || {}); fn(st.mealbook); });

    const dinnerOf = (d) => SR.state.dinners[d];
    const hasDinnerBlock = (d) => SR.day(d).blocks.some((b) => b.dinner);
    /* one shape for every cell: { name, parts, items, how, cook, recipe }, and from ({ date, slot }) on
       leftovers that know the meal they come from (V11 goals: a move, a swap, or a new cook keeps it) */
    const fromOf = (r) => (r && r.from && r.from.date && r.from.slot ? { from: { date: r.from.date, slot: r.from.slot } } : {});
    function mealAt(d, k) {
      if (k === 'dinner') {
        const x = dinnerOf(d);
        if (!x || (!x.name && !x.cook)) return null;
        const how = notCooking(x.cook) ? x.cook : 'home';
        /* V11 (the rituals walk): a dinner with nobody cooking it yet keeps no cook (Anyone is an answer, never a default) */
        return Object.assign({ name: x.name || '', parts: x.parts || [], items: x.items || [], how, cook: how === 'home' ? x.cook || '' : '', recipe: x.recipe || null }, fromOf(x));
      }
      /* V11: a meal an older build kept on this device shows as it will be once it moves (moveOldMeals) */
      const old = oldMeals && oldMeal(SR.state, d, k);
      const m = old || (SR.state.meals && SR.state.meals[d] && SR.state.meals[d][k]) || null;
      if (!m) return null;
      if (typeof m === 'string') return { name: m, parts: [], items: [], how: 'home', cook: '', recipe: null };
      return Object.assign({ name: m.name || '', parts: m.parts || [], items: m.items || [], how: m.how || 'home', cook: m.cook || '', recipe: m.recipe || null }, fromOf(m));
    }
    /* a dinner with a cook and no dish yet reads Dinner, as on the board */
    const mealLabel = (m) => (m ? m.name || howName(m.how) || 'Dinner' : '');
    /* writes one cell, inside a commit; null clears it. V11 goals: leftovers keep the meal they come from
       (commitMeals ends with Model.syncLeftovers, which lets go of one that no longer comes first or cooks) */
    function putMeal(st, d, k, m) {
      const cooking = m && !notCooking(m.how);
      const link = m && m.how === 'leftovers' ? fromOf(m) : {};
      if (k === 'dinner') {
        if (!m) { delete st.dinners[d]; return; }
        const was = st.dinners[d] || {};
        /* (V11, the rituals walk: a new dinner's cook stays unpicked until someone picks one, never Anyone by default) */
        const x = { name: m.name || '', cook: cooking ? m.cook || (!notCooking(was.cook) && was.cook) || '' : m.how, items: cooking ? (m.items || []).slice() : [] };
        if (cooking && m.recipe) x.recipe = m.recipe;
        if (m.parts && m.parts.length) x.parts = m.parts.slice();
        st.dinners[d] = Object.assign(x, link);
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
      st.meals[d] = Object.assign({}, st.meals[d], { [k]: Object.assign(x, link) });
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
      /* V11: each part splits on its own "and" (sausage and eggs, toast is three), unless it's a dish named with one */
      if (bits.length > 1) {
        for (let i = bits.length - 1; i >= 0; i--) {
          const m = /^(.*?)\s+(?:and|&)\s+(.+)$/i.exec(bits[i]);
          if (m && !PAIRS.test(bits[i].replace(/\s*&\s*/g, ' and '))) bits.splice(i, 1, m[1], m[2]);
        }
      }
      return bits.length > 1 ? bits.map(cap) : [];
    }
    /* a part as it goes on a list: "scrambled eggs" is Eggs, toast is Bread */
    const COOKED = /\b(scrambled|fried|boiled|poached|baked|roasted|grilled|steamed|mashed|toasted|sliced|diced|chopped|sauteed|sautéed|homemade|fresh|hot|cold|warm|plain|some|a|an|the)\b/g;
    /* V11: a count or a measure isn't part of what you buy: 2 eggs, a cup of berries, half an avocado.
       A number before a word that isn't a plural stays (7 layer dip) */
    const QTY = /^(?:(?:\d+(?:[.\/]\d+)?|an?|one|two|three|four|five|six|a few|a couple(?: of)?|half(?: an?)?)\s+(?:cups?|tbsps?|tsps?|tablespoons?|teaspoons?|slices?|pieces?|cans?|lbs?|pounds?|oz|ounces?|grams?|handfuls?|scoops?|bowls?|glass(?:es)?|cloves?|servings?)\s+(?:of\s+)?|(?:1|one|an?|half(?: an?)?)\s+(?=\S)|(?:\d+|two|three|four|five|six|a few|a couple(?: of)?)\s+(?=\S+s\b))/;
    function groceryName(part) {
      /* what's left over from another meal isn't something to buy */
      if (/\bleftovers?\b/.test(norm(part))) return '';
      let s = norm(part).replace(/^(and|&)\s+/, '').replace(QTY, '').replace(COOKED, ' ').replace(/\s+/g, ' ').trim();
      if (s === 'toast') s = 'bread';
      /* V11: nor is water from the tap */
      if (!s || /^(leftovers?|nothing|skip|takeout|take out|water|tap water|ice water|ice)$/.test(s)) return '';
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
        /* V11 goals: leftovers named for the meal they come from ("Leftovers: Chili") are that meal again, not one of their own */
        if (!key || (m.how === 'leftovers' && /^leftovers(?::|$)/.test(key))) return;
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
    /* V11: which meals the board shows (the meal board's Show toggles, kept on this device) */
    const MEAL_ROWS = 'sundayreset.v7.mealRows';
    /* (V11-3, design review 28: until this device picks its rows, the board shows Dinner, and Breakfast or Lunch only where
       the board has them: a meal of that kind on a day, or its block in the usual days, from the setup's Which meals.
       Fourteen empty Add cells read as homework) */
    const mealsUsed = () => {
      const st = SR.state, used = new Set(['dinner']);
      Object.values(st.meals || {}).forEach((x) => { if (x && typeof x === 'object') ['breakfast', 'lunch'].forEach((k) => { if (x[k]) used.add(k); }); });
      const rh = st.rhythm || {}, days = [].concat(Object.values(rh.days || {}), ...Object.values(rh.shapes || {}).map((x) => Object.values((x && x.days) || {})));
      const tpl = [].concat(...days.map((x) => (x && Array.isArray(x.blocks) ? x.blocks : [])));
      tpl.forEach((b) => { const w = ((b && (b.id || '')) + ' ' + (b && (b.name || ''))).toLowerCase(); ['breakfast', 'lunch'].forEach((k) => { if (w.includes(k)) used.add(k); }); });
      return MEAL_KINDS.map(([k]) => k).filter((k) => used.has(k));
    };
    const mealRows = () => { try { const r = JSON.parse(localStorage.getItem(MEAL_ROWS) || 'null'); if (Array.isArray(r) && r.length) return MEAL_KINDS.map(([k]) => k).filter((k) => r.includes(k)); } catch (e) { /* storage off */ } try { return mealsUsed(); } catch (e) { return ['breakfast', 'lunch', 'dinner']; } };
    const mealDayWords = (d, k) => M.DAY_LONG[M.weekday(d)] + ' ' + kindName(k).toLowerCase();
    /* V11: last week's meals for the open days of this one, in the rows shown */
    /* (V11, the rituals walk: back, in days, reaches any earlier week: 7 is last week, 14 the week before) */
    function lastWeekMeals(dates, rows, back) {
      const todo = [], b = back || 7;
      dates.forEach((d) => {
        if (d < SR.today || SR.day(d).trip) return;
        rows.forEach((k) => { if (mealAt(d, k)) return; const was = mealAt(M.addDays(d, -b), k); if (was && (k !== 'dinner' || canDinner(d))) todo.push([d, k, was]); });
      });
      return todo;
    }
    function bringLastWeek(dates, rows, back) {
      const b = back || 7, todo = lastWeekMeals(dates, rows, b), from = M.addDays(dates[0], -b);
      const which = b === 7 ? 'last week' : 'the week of ' + M.dateText(from);
      if (!todo.length) { SR.toast('Nothing from ' + which + ' to bring over.', ''); return 0; }
      /* V11 goals: last week's leftovers come from this week's same meal, a week on (the same Sunday dinner) */
      const weekOn = (m) => (m.from ? Object.assign({}, m, { from: { date: M.addDays(m.from.date, b), slot: m.from.slot } }) : m);
      commitMeals((st) => todo.forEach(([d, k, m]) => { if (k === 'dinner') ensureDinner(st, d); putMeal(st, d, k, weekOn(m)); }));
      mealToast(todo.length + (todo.length === 1 ? ' meal' : ' meals') + ' from ' + which, true);
      snd('clack', 0.8);
      return todo.length;
    }
    /* V11 (the rituals walk): the weeks you planned before, newest first, up to four from the eight before this
       one, each with how many meals it had and how many it would bring to this week's open days:
       [{ ws, back, n, brings }] ("Oct 25 to 31 · 13 meals") */
    function earlierWeeks(dates, rows) {
      const out = [];
      for (let k = 1; k <= 8 && out.length < 4; k++) {
        const back = 7 * k, w = M.addDays(dates[0], -back), n = mealCount(M.range(w, 7), rows, true).n;
        if (!n) continue;
        const brings = lastWeekMeals(dates, rows, back).length;
        if (brings) out.push({ ws: w, back, n, brings });
      }
      return out;
    }
    /* V11: how many of a week's meals are planned, counting the rows shown and not the days away. Midweek it
       counts from today on, since nobody plans a meal that's over (a week already over counts whole); `span`
       names the days counted when that isn't the whole week ("Wed to Sat") */
    /* (all: count every day given, as the meal board's corner does for the days its grid shows) */
    function mealCount(dates, rows, all) {
      let n = 0, of = 0;
      const left = dates.filter((d) => d >= SR.today), counted = all || !left.length ? dates : left;
      /* V11: a meal skipped is decided, but it isn't a meal planned, so it isn't counted as one */
      counted.forEach((d) => { if (SR.day(d).trip) return; rows.forEach((k) => { of++; const m = mealAt(d, k); if (m && m.how !== 'skip') n++; }); });
      const span = counted.length < dates.length ? M.DAY_SHORT[M.weekday(counted[0])] + (counted.length > 1 ? ' to ' + M.DAY_SHORT[M.weekday(counted[counted.length - 1])] : '') : '';
      return { n, of, span };
    }
    /* V11: every meal on the board, as a fingerprint, so closing the meal board can say what changed */
    function mealSnap() {
      const out = new Map(), st = SR.state;
      const dates = new Set(Object.keys(st.dinners || {}).concat(Object.keys(st.meals || {})));
      dates.forEach((d) => MEAL_KINDS.forEach(([k]) => { const m = mealAt(d, k); if (m) out.set(d + '|' + k, [mealLabel(m), m.how, m.cook, (m.items || []).join()].join('|')); }));
      return out;
    }
    /* == V11 goals: cook once, eat twice, on the meal board ==
       A meal cooked to last covers later meals as leftovers (Model.cookExtra). Each leftover knows the meal it
       comes from (from: { date, slot }), the grocery list buys for every meal a dish feeds (the servings on
       Model.groceries' lines), and a week's batch cooks can each take a Meal prep block before them. Every
       change goes through commitMeals, which ends with Model.syncLeftovers. Here: reading the board and
       saying it, with no DOM (tests/ui-meals.test.mjs cuts this part out and runs it) */
    const MEAL_ORDER = ['breakfast', 'lunch', 'dinner'];
    const cellKey = (d, k) => d + '|' + k;
    const byCell = (a, b) => (a.date === b.date ? MEAL_ORDER.indexOf(a.slot) - MEAL_ORDER.indexOf(b.slot) : a.date < b.date ? -1 : 1);
    /* does meal a come before meal b ({ date, slot } each) */
    const comesFirst = (a, b) => byCell(a, b) < 0;
    const count = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    /* "Monday lunch", or "Mon lunch" short */
    const slotWords = (d, k, short) => (short ? M.DAY_SHORT : M.DAY_LONG)[M.weekday(d)] + ' ' + kindName(k).toLowerCase();
    const andWords = (xs) => (xs.length <= 1 ? xs.join('') : xs.length === 2 ? xs[0] + ' and ' + xs[1] : xs.slice(0, -1).join(', ') + ', and ' + xs[xs.length - 1]);
    /* meals said together, by the meal they share: "Monday and Tuesday lunch", "Monday lunch and dinner",
       "Monday and Tuesday lunch, and Wednesday dinner" (short: Mon, Tue) */
    function mealsWords(cells, short) {
      const list = cells.slice().sort(byCell);
      if (!list.length) return '';
      const day = (d) => (short ? M.DAY_SHORT : M.DAY_LONG)[M.weekday(d)], slot = (k) => kindName(k).toLowerCase();
      const days = [...new Set(list.map((x) => x.date))], slots = MEAL_ORDER.filter((k) => list.some((x) => x.slot === k));
      if (slots.length === 1) return andWords(days.map(day)) + ' ' + slot(slots[0]);
      if (days.length === 1) return day(days[0]) + ' ' + andWords(slots.map(slot));
      const groups = slots.map((k) => andWords(list.filter((x) => x.slot === k).map((x) => day(x.date))) + ' ' + slot(k));
      return groups.length === 2 ? groups.join(groups.some((g) => / and /.test(g)) ? ', and ' : ' and ') : andWords(groups);
    }
    /* the meal a leftover comes from, while that meal is cooked and comes first: { date, slot, meal }, or null
       (m: the leftover, when it's already read) */
    function sourceOf(d, k, m) {
      if (m === undefined) m = mealAt(d, k);
      if (!m || m.how !== 'leftovers' || !m.from) return null;
      const f = m.from, s = mealAt(f.date, f.slot);
      if (!s || notCooking(s.how) || !comesFirst({ date: f.date, slot: f.slot }, { date: d, slot: k })) return null;
      return { date: f.date, slot: f.slot, meal: s };
    }
    /* a leftover said as the dish: a name of its own, or the meal it comes from ("Leftovers: Chili" is Chili) */
    const AUTO_LEFT = /^Leftovers(?::\s*|$)/;
    function dishOf(d, k, m) {
      if (m === undefined) m = mealAt(d, k);
      if (!m) return '';
      if (m.how !== 'leftovers') return mealLabel(m);
      const own = (m.name || '').replace(AUTO_LEFT, '').trim(), src = sourceOf(d, k, m);
      return own || (src && mealLabel(src.meal)) || 'Leftovers';
    }
    /* the line under a leftover: "From Sun dinner" (long: "From Sunday dinner"), or '' */
    const fromWords = (d, k, m, long) => { const s = sourceOf(d, k, m); return s ? 'From ' + slotWords(s.date, s.slot, !long) : ''; };
    /* a cooked meal's leftovers that are still its leftovers: [{ date, slot }] */
    const leftoversNow = (d, k) => M.leftoversOf(SR.state, d, k).filter((x) => !!sourceOf(x.date, x.slot));
    /* "Enough Chicken and rice for Monday and Tuesday lunch too." (said this way round so a dish with a plural
       name, Tacos, never trips a verb) */
    const coverWords = (name, cells) => 'Enough ' + name + ' for ' + mealsWords(cells) + ' too';
    /* the later meals a cooked one can cover, as a small grid: four days (the four after a dinner; from the same
       day for a breakfast or a lunch), a row for each meal the board shows (breakfasts for a breakfast, lunches
       and dinners for the rest). A cell is open, one it covers (on), or leftovers from no meal yet; one that has
       another meal, is over, comes first, or is a day away is null. A row with nothing in it is left out.
       { days: [date], rows: [{ slot, cells: [{ date, slot, on } or null] }] } */
    function extraGrid(d, k, rows) {
      const m = mealAt(d, k), first = k === 'dinner' ? 1 : 0, days = [0, 1, 2, 3].map((i) => M.addDays(d, first + i));
      const kinds = (k === 'breakfast' ? ['breakfast'] : ['lunch', 'dinner']).filter((x) => rows.includes(x));
      if (!m || notCooking(m.how) || !kinds.length) return { days, rows: [] };
      const on = new Set(leftoversNow(d, k).map((x) => cellKey(x.date, x.slot)));
      const cell = (day, s) => {
        if (day < SR.today || SR.day(day).trip || !comesFirst({ date: d, slot: k }, { date: day, slot: s })) return null;
        const x = mealAt(day, s), has = on.has(cellKey(day, s));
        if (!has && x && !(x.how === 'leftovers' && !sourceOf(day, s, x))) return null;
        if (!has && !x && s === 'dinner' && !canDinner(day)) return null;
        return { date: day, slot: s, on: has };
      };
      /* (V11, the rituals walk: the dinner row stays while another row shows, its cells saying why they're taken, so a
         double batch is seen to be a second dinner too: "Cook extra for · Lunch Wed · Dinner Thu") */
      const all = kinds.map((s) => ({ slot: s, cells: days.map((day) => cell(day, s)) })), any = all.some((r) => r.cells.some(Boolean));
      return { days, rows: all.filter((r) => r.cells.some(Boolean) || (any && r.slot === 'dinner')) };
    }
    /* V11: why the grid can't offer a meal (a null cell, for the meal at d, k), said in its cell and in full: the meal
       that's there by its name, a day that's over, a trip day, the meal itself, or a night with no room for dinner.
       { word, words }. It was a blank dotted box (Oct 14, the polish pass) */
    function noCover(d, k, day, s) {
      const full = slotWords(day, s);
      if (day < SR.today) return { word: 'Over', words: full + ' is over' };
      if (SR.day(day).trip) return { word: 'Away', words: 'Away on ' + M.DAY_LONG[M.weekday(day)] };
      if (!comesFirst({ date: d, slot: k }, { date: day, slot: s })) return { word: 'This one', words: full + ' is this meal' };
      const x = mealAt(day, s);
      if (x) { const dish = x.how === 'leftovers' ? 'Leftovers' : mealLabel(x); return { word: dish, words: full + ': ' + dish }; }
      return { word: 'No room', words: 'No room for dinner on ' + M.DAY_LONG[M.weekday(day)] };
    }
    /* the cooked meals a leftover can come from: up to four days before it, newest first, breakfasts for a
       breakfast and lunches and dinners for the rest, at most 6. [{ date, slot, meal }] */
    function sourceCells(d, k) {
      const kinds = k === 'breakfast' ? ['breakfast'] : ['dinner', 'lunch'], out = [];
      for (let i = 0; i <= 4 && out.length < 6; i++) {
        const day = M.addDays(d, -i);
        kinds.forEach((s) => {
          if (out.length >= 6 || !comesFirst({ date: day, slot: s }, { date: d, slot: k })) return;
          const m = mealAt(day, s);
          if (m && !notCooking(m.how) && (m.name || '').trim()) out.push({ date: day, slot: s, meal: m });
        });
      }
      return out;
    }
    /* every leftover that knows its meal, as cell to meal, so a change can say which ones it let go of */
    function linkedNow() {
      const st = SR.state, out = new Map();
      const add = (d, k, r) => { if (r && typeof r === 'object' && r.from && (k === 'dinner' ? r.cook : r.how) === 'leftovers') out.set(cellKey(d, k), cellKey(r.from.date, r.from.slot)); };
      Object.keys(st.dinners || {}).forEach((d) => add(d, 'dinner', st.dinners[d]));
      Object.keys(st.meals || {}).forEach((d) => ['breakfast', 'lunch'].forEach((k) => add(d, k, st.meals[d] && st.meals[d][k])));
      return out;
    }
    /* the leftovers a change let go of (their meal went, moved after them, or isn't cooked now), still leftovers:
       [{ date, slot }] */
    function letGoSince(was) {
      const now = linkedNow(), out = [];
      was.forEach((src, key) => {
        if (now.has(key)) return;
        const [date, slot] = key.split('|'), m = mealAt(date, slot);
        if (m && m.how === 'leftovers') out.push({ date, slot });
      });
      return out.sort(byCell);
    }
    /* "Monday and Tuesday lunch stay as leftovers." or '' */
    const stayWords = (cells) => (cells.length ? mealsWords(cells) + (cells.length === 1 ? ' stays' : ' stay') + ' as leftovers.' : '');
    /* leftovers follow their meal when it moves (moves: [[{ d, k }, { d, k }]], from and to); syncLeftovers, in the
       same change, then lets go of the ones that would now come before it */
    function followMoves(st, moves) {
      const to = new Map(moves.map(([a, b]) => [cellKey(a.d, a.k), b]));
      const fix = (r) => { if (!r || typeof r !== 'object' || !r.from) return; const t = to.get(cellKey(r.from.date, r.from.slot)); if (t) r.from = { date: t.d, slot: t.k }; };
      Object.keys(st.dinners || {}).forEach((d) => fix(st.dinners[d]));
      Object.keys(st.meals || {}).forEach((d) => ['breakfast', 'lunch'].forEach((k) => fix(st.meals[d] && st.meals[d][k])));
    }
    /* the week's batch cooks: meals being cooked, from today on, that cover later meals.
       [{ date, slot, name, serves, left: [{ date, slot }] }] */
    function batchCooks(dates) {
      const out = [];
      dates.forEach((d) => {
        if (d < SR.today) return;
        MEAL_ORDER.forEach((k) => {
          const m = mealAt(d, k);
          if (!m || notCooking(m.how)) return;
          const left = leftoversNow(d, k);
          if (left.length) out.push({ date: d, slot: k, name: mealLabel(m), serves: left.length + 1, left });
        });
      });
      return out;
    }
    /* the Meal prep block on for a batch cook (its makes name the meal), on its day or up to three days before
       (it can be moved): { date, add }, or null */
    function prepOf(b) {
      for (const d of [0, 1, 2, 3].map((i) => M.addDays(b.date, -i))) {
        const a = ((SR.state.dates[d] || {}).adds || []).find((x) => !x.skipped && x.src && x.src.type === 'prep' && (x.makes || []).some((y) => y.date === b.date && y.slot === b.slot));
        if (a) return { date: d, add: a };
      }
      return null;
    }
    const PREP_MIN = 90;
    /* where a Meal prep block goes for a batch cook, in quiet time where nothing moves: the afternoon (else the
       morning) of a dinner's day, ending by the Dinner block; the morning of a lunch's day; the evening before a
       breakfast. Never earlier than now. { date, start }, or null */
    function prepSpot(b) {
      const din = b.slot === 'dinner' ? SR.day(b.date).blocks.find((x) => x.dinner) : null, by = din ? din.start : 18 * 60;
      const tries = b.slot === 'breakfast' ? [[M.addDays(b.date, -1), 'evening', 24 * 60]] : b.slot === 'lunch' ? [[b.date, 'morning', 12 * 60]] : [[b.date, 'afternoon', by], [b.date, 'morning', by]];
      for (const [d, when, end] of tries) {
        if (d < SR.today) continue;
        const at = M.quietSlot(SR.state, d, PREP_MIN, { when, strict: true, after: d === SR.today ? SR.nowMin || 0 : 0 });
        if (at != null && at + PREP_MIN <= end) return { date: d, start: at };
      }
      return null;
    }
    /* a batch cook's Meal prep block as the board keeps it: makes is the meal and the leftovers it covers */
    const prepAdd = (b) => ({ name: 'Meal prep', cat: 'meals', icon: 'pot', dur: PREP_MIN, src: { type: 'prep', week: M.weekStart(b.date) }, makes: [{ date: b.date, slot: b.slot, name: b.name }].concat(b.left.map((x) => ({ date: x.date, slot: x.slot, name: mealLabel(mealAt(x.date, x.slot)) }))) });
    /* a prep week to look at on the board (Model.prepPlan), less what the board can't take now: a dinner on a
       night with no room for one takes the leftovers it would make with it, and the Meal prep block when it's
       that batch's. { plan, cells: Map(cell, item), out: [cell], noRoom: [date], block } */
    function prepLook(ws) {
      /* (with the minute, so tonight's dinner is never offered once its time is over) */
      const plan = M.prepPlan(SR.state, ws, { today: SR.today, nowMin: SR.nowMin }, SR.D);
      const out = new Set(), cells = new Map(), noRoom = [];
      plan.list.forEach((x) => { if (x.slot === 'dinner' && !canDinner(x.date)) { out.add(cellKey(x.date, x.slot)); noRoom.push(x.date); } });
      plan.list.forEach((x) => { const f = x.kind === 'leftovers' && x.meal.from; if (f && out.has(cellKey(f.date, f.slot))) out.add(cellKey(x.date, x.slot)); });
      plan.list.forEach((x) => { const key = cellKey(x.date, x.slot); if (!out.has(key) && !mealAt(x.date, x.slot)) cells.set(key, x); });
      const m0 = plan.block && (plan.block.add.makes || [])[0];
      return { plan, cells, out: [...out].sort(), noRoom: noRoom.sort(), block: plan.block && m0 && !out.has(cellKey(m0.date, m0.slot)) ? plan.block : null };
    }
    /* what a prep week does, in one line: the plan's own words, or a count when the board can't take all of it */
    function prepWords(look) {
      /* (one batch cook covers; Model.prepPlan's own words say cover for one too) */
      if (!look.out.length) return look.plan.message.replace(/^(One batch cook, [^,]+), cover /, '$1, covers ');
      const items = [...look.cells.values()], n = (kind) => items.filter((x) => x.kind === kind).length;
      const bits = [n('batch') && count(n('batch'), 'batch cook', 'batch cooks'), n('leftovers') && count(n('leftovers'), 'meal of leftovers', 'meals of leftovers'), n('fresh') && count(n('fresh'), 'fresh night', 'fresh nights')].filter(Boolean);
      const days = look.noRoom.map((d) => M.DAY_LONG[M.weekday(d)]);
      return (bits.length ? cap(andWords(bits)) + '. ' : '') + andWords(days) + (days.length === 1 ? ' has' : ' have') + ' no time for dinner, so ' + (days.length === 1 ? 'it’s' : 'they’re') + ' left out.';
    }
    /* the board's own dinner changes (app.js: food dropped on a Dinner block, the dinner panel, a dinner idea)
       say the leftovers they let go of the same way: the links before, then the words after */
    window.SR_leftLinks = () => linkedNow();
    window.SR_leftStay = (was) => stayWords(letGoSince(was));
    /* a dinner's panel says where leftovers come from, or what a dinner cooked to last covers */
    window.SR_leftLine = (d, k) => {
      const m = mealAt(d, k);
      if (!m) return '';
      const src = sourceOf(d, k, m);
      if (src) return 'Leftovers from ' + slotWords(src.date, src.slot) + ': ' + mealLabel(src.meal) + '.';
      if (notCooking(m.how)) return '';
      const left = leftoversNow(d, k);
      return left.length ? 'Enough for ' + count(left.length + 1, 'meal', 'meals') + ', with ' + mealsWords(left) + '.' : '';
    };
    /* a Meal prep block's panel (app.js addPanel asks): what it cooks, as the meals stand now, each a tap from
       its card on the meal board */
    window.SR_prepPanel = (p, a) => {
      const makes = (a.makes || []).filter((x) => x && x.date && x.slot);
      if (!makes.length) return;
      const b0 = makes[0], src = mealAt(b0.date, b0.slot), cooked = !!src && !notCooking(src.how);
      const left = cooked ? leftoversNow(b0.date, b0.slot) : [];
      p.appendChild(h('p', 'side-line', cooked ? 'Cooks ' + mealLabel(src) + ' for ' + count(left.length + 1, 'meal', 'meals') + '.' : 'The meal it was for has changed. The meals stay as they are.'));
      const rows = cooked ? [{ date: b0.date, slot: b0.slot }].concat(left) : makes;
      const f = h('div', 'field'), lbl = h('div', 'lbl', 'Makes'), list = h('div', 'list c-prep-makes');
      lbl.id = 'c-prep-makes-' + a.id; list.setAttribute('role', 'group'); list.setAttribute('aria-labelledby', lbl.id);
      rows.forEach((x) => {
        const m = mealAt(x.date, x.slot), first = x.date === b0.date && x.slot === b0.slot;
        const r = h('button', 'list-row c-prep-make'); r.type = 'button';
        const t = h('span', 'grow', slotWords(x.date, x.slot));
        t.appendChild(h('small', '', !m ? 'Nothing planned now' : m.how === 'leftovers' ? 'Leftovers' : mealLabel(m)));
        r.append(SR.icon(first ? 'pot' : 'bowl', 9, CREAM), t, SR.icon('right', 7, '#AFAFAF'));
        r.setAttribute('aria-label', slotWords(x.date, x.slot) + ', ' + (!m ? 'nothing planned now' : m.how === 'leftovers' ? 'leftovers' : mealLabel(m)) + '. Open it on the meal board');
        r.addEventListener('click', () => { SR.Snd.init(); SR.view.sel = null; SR.render(); openMealBoard(M.weekStart(x.date), { cell: [x.date, x.slot] }); });
        list.appendChild(r);
      });
      f.append(lbl, list);
      p.appendChild(f);
    };
    /* V11: one meal toast at a time. A new one takes the last one's place, so planning a week isn't a pile of them */
    let mealToastEl = null;
    /* V11: a meal toast's Undo takes back its own change and nothing else. It keeps the board as that change
       left it; once anything else changes the board (a grocery check, the day's card, an Undo from the keys),
       the toast goes, so its Undo can never reach a different change */
    const boardKey = () => JSON.stringify(SR.state);
    /* V11 (consistency): its Undo is the app's (SR.undoAct), so it says what it took back the way every Undo
       does ("Tuesday dinner is as it was.", or what: a line of its own) and a late tap gets the app's
       one sentence; the button comes off the toast once something newer changes */
    function mealToast(text, undo, then, what) {
      retireMealToast();
      const after = undo ? boardKey() : '';
      /* (and Redo says the toast's own words again) */
      const act = undo && SR.undoAct ? SR.undoAct(what || SR.undoWords(text), /[.!?…]$/.test(text) ? text : text + '.') : null;
      SR.toast(text, 'good', act ? { label: 'Undo', live: () => act.live() && boardKey() === after, fn: () => { const was = act.live(); act.fn(); if (was && then) then(); } }
        : undo ? { label: 'Undo', fn: () => {
          if (boardKey() !== after) { SR.toast('Something changed since, so there’s nothing here to take back.', ''); return; }
          SR.undo(); if (then) then();
        } } : null);
      const box = document.getElementById('toasts');
      mealToastEl = box ? box.lastElementChild : null;
      if (mealToastEl) mealToastEl._after = after;
    }
    function retireMealToast() {
      const t = mealToastEl; mealToastEl = null;
      if (!t || !t.isConnected || t._gone) return;
      t._gone = true; t.style.pointerEvents = 'none';
      if (!feelOn()) { t.remove(); return; }
      const a = t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = () => t.remove();
    }
    Kit.renders.push(() => { if (mealToastEl && mealToastEl._after && boardKey() !== mealToastEl._after) retireMealToast(); });
    /* V11: the week's grocery list, with the meals and days each thing is for */
    function shopList(dates) {
      const prog = M.groceryProgress(SR.state, dates);
      const got = (SR.state.shopping && SR.state.shopping[M.weekStart(dates[0])]) || {};
      const list = prog.list.map((x) => {
        /* V11: each meal with its own days, so the line says which day goes with which meal. V11 goals: and how
           many meals it feeds (serves: the meal and its leftovers, from the line's servings), so a dish cooked to
           last is bought for all of them: "Chicken and rice, Sun, for 3 meals" */
        const meals = [], uses = [];
        x.days.forEach((d) => MEAL_KINDS.forEach(([k]) => {
          const m = mealAt(d, k);
          if (!m || notCooking(m.how) || !(m.items || []).includes(x.id)) return;
          const nm = mealLabel(m), day = M.DAY_SHORT[M.weekday(d)];
          let u = uses.find((y) => y.meal === nm);
          if (!u) { u = { meal: nm, days: [], n: 0, serves: 0 }; uses.push(u); meals.push(nm); }
          if (!u.days.includes(day)) u.days.push(day);
          const sv = (x.servings || []).find((s) => s.date === d && s.slot === k);
          u.n++; u.serves += sv ? sv.serves : 1;
        }));
        return Object.assign({}, x, { meals, uses, got: !!got[x.id] });
      });
      return { prog, list };
    }
    function setGot(dates, id, on) {
      const ws = M.weekStart(dates[0]);
      return commitMeals((st) => {
        st.shopping = st.shopping || {};
        const wk = Object.assign({}, st.shopping[ws]);
        if (on) wk[id] = 1; else delete wk[id];
        if (Object.keys(wk).length) st.shopping[ws] = wk; else delete st.shopping[ws];
      });
    }
    /* copies with the clipboard, or the older way when the clipboard isn't allowed here */
    async function copyText(text) {
      try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* try the older way */ }
      try {
        const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
      } catch (e) { return false; }
    }

    /* opts.cell: [date, meal] opens that day's card; opts.shop: opens at the grocery list */
    function openMealBoard(ws, opts) {
      opts = opts || {};
      /* V11: opened from a dinner's own mat (its panel's grocery line), the board takes that mat's place, so
         the mat's closing never closes the board */
      if (detail) { detail = null; document.body.classList.remove('c-detail'); }
      ws = ws || (SR.view.reset ? SR.view.reset.week : M.weekStart(SR.view.focus || SR.today));
      let dates = M.range(ws, 7);
      let showRows = mealRows();
      /* V11: what the board held when it opened, so closing it can say what was saved: the meals, the
         grocery checks, and the meal list (hidden, added, left out) */
      const before = mealSnap();
      const shopBefore = JSON.parse(JSON.stringify(SR.state.shopping || {})), bookBefore = JSON.stringify(SR.state.mealbook || null);
      /* V11: focus goes back to what opened the board when it closes (or the same control drawn again) */
      const opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      const openerKey = opener ? [opener.tagName, opener.className, opener.getAttribute('aria-label') || opener.textContent].join('|') : '';
      /* V11: the grocery list under the board: open on a computer, folded on a phone, as this device left it */
      const SHOP_KEY = 'sundayreset.v11.mealShop';
      let shopOpen = opts.shop ? true : (() => { try { const v = localStorage.getItem(SHOP_KEY); return v == null ? null : v === '1'; } catch (e) { return null; } })();
      /* V11: ideas for the open meals (props), what you have at home to use up, and earlier days folded on a phone */
      /* (V11, the rituals walk: a week that's over opens with its meals showing; looking back is how a week you liked gets used again) */
      let props = new Map(), have = new Set(), seed = 1, showPast = !!(opts.cell && opts.cell[0] < SR.today && opts.cell[0] >= ws) || M.addDays(ws, 6) < SR.today, landSet = new Set(), shopWas = '';
      /* V11 goals: a prep week being looked at (prepLook: the plan, the cells it fills, what's left out, its
         Meal prep block), and withBlock: whether Use this plan puts that block on too */
      let prepView = null;
      /* the library sorts for one meal of the day, finds by words, and can hide or leave things out */
      let forT = '', find = '', editing = false, leaving = false, showHidden = false, held = null, justSet = '', fresh = '', landKey = '', pop = null;
      /* V11 (the rituals walk): the store view (opts.store, the phone's Groceries card): the list alone, what's left on
         top and what's in the cart folded at the foot, with the meal board a tap away */
      let store = !!opts.store, cartOpen = false;
      const inner = openMat('c-meals' + (store ? ' c-store' : ''), (inner) => {
        matHead(inner, '', store ? 'Groceries' : 'Plan the week’s meals', () => closeMat());
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
        /* V11 (the rituals walk): the store view says what it is, and the meals are a tap away */
        const storeBar = h('div', 'c-storebar');
        const toBoard = Kit.btn('c-again c-tomeals', 'See the meals', () => { store = false; if (mat) mat.classList.remove('c-store'); const t = inner.querySelector('.c-mat-head h2'); if (t) t.textContent = 'Plan the week’s meals'; storeBar.hidden = true; draw(); snd('slide'); }, 'pot');
        storeBar.append(h('p', 'c-mathow', 'What’s left stays on top. Checked things go in the cart below.'), toBoard);
        storeBar.hidden = !store;
        inner.appendChild(storeBar);
        /* what changed, said for a screen reader */
        const live = h('p', 'c-live'); live.setAttribute('aria-live', 'polite'); inner.appendChild(live);
        const speak = (t) => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };
        const rows = h('div', 'c-mealtoggles'); rows.setAttribute('role', 'group'); rows.setAttribute('aria-label', 'Meals to plan');
        const board = h('div', 'c-woodboard c-mealgrid');
        /* V11: the board and the meals side by side on a computer; the meals scroll on their own under a
           search that stays put (stacked on a phone) */
        const body = h('div', 'c-meal-body'), main = h('div', 'c-meal-main'), side = h('div', 'c-meal-side'), sideScroll = h('div', 'c-meal-scroll c-autoscroll');
        /* V11 (the rituals walk): one way to fill the week, asked once (cook most nights, or cook twice and eat
           leftovers), and the weeks you planned before, by date and count, in place of whatever last week was */
        let fillMode = opts.fill ? 'choose' : opts.weeks ? 'weeks' : null;
        const again = Kit.btn('c-ghost c-again c-earlierbtn', 'Same as an earlier week', () => { fillMode = fillMode === 'weeks' ? null : 'weeks'; props = new Map(); prepView = null; closePop(); draw(); fillFocus(); }, 'redo');
        const fillBtn = Kit.btn('c-ghost c-again c-sugbtn c-fillbtn', 'Fill the week', () => { fillMode = fillMode === 'choose' ? null : 'choose'; props = new Map(); prepView = null; closePop(); draw(); fillFocus(); }, 'star');
        again.setAttribute('aria-expanded', 'false'); fillBtn.setAttribute('aria-expanded', 'false');
        const sugBtn = fillBtn, prepBtn = fillBtn;
        const acts = h('div', 'c-meal-acts'); acts.append(fillBtn, again);
        const top = h('div', 'c-meal-top'); top.append(rows, acts);
        const sugBar = h('div', 'c-sugbar'); sugBar.hidden = true;
        /* V11 goals: under the board, the week's batch cooks, each with its Meal prep block or a way to add one */
        const prepBox = h('section', 'c-prep'); prepBox.setAttribute('aria-label', 'Batch cooks'); prepBox.hidden = true;
        /* V11: under the board, the week's groceries themselves, checked off here (Russell, Oct 14: "I wanted
           to see those on this actual board"). On a phone they wait after the meals, and a line under the
           board goes to them */
        const shop = h('section', 'c-shop'); shop.setAttribute('aria-label', 'Groceries');
        const shopJump = h('button', 'c-shopjump'); shopJump.type = 'button';
        shopJump.addEventListener('click', () => { shopOpen = true; drawShop(); toShop(); snd('detent'); });
        main.append(top, sugBar, board, prepBox, shopJump, shop);
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
        /* (each keeps a strip of its own for the button, so it never covers a meal, a chip, or the groceries) */
        const sideHint = scrollHint(sideScroll, side, true), innerHint = scrollHint(inner, inner.parentElement || inner, true);
        /* V11: on a computer the board's column scrolls too (the groceries are under it), and says so */
        const mainHint = scrollHint(main, body, true);
        const dayWords = (d, k) => M.DAY_LONG[M.weekday(d)] + ' ' + kindName(k).toLowerCase();

        function draw() {
          mealSigWas = mealSig();
          if (mat) mat.classList.toggle('c-book', bookView());
          /* V11: a redraw never moves what you're looking at (the grocery list under the board stays put) */
          const y = [main.scrollTop, inner.scrollTop, sideScroll.scrollTop];
          toastSpot();
          weekWords.textContent = weekLabel();
          /* V11: Same as last week shows only when last week has something to bring. V11 (the rituals walk): any of
             the four weeks planned before, so it's Same as an earlier week */
          again.hidden = !earlierWeeks(dates, showRows).length;
          if (again.hidden && fillMode === 'weeks') fillMode = null;
          /* V11 goals: a prep week being looked at is worked out again from the board as it is now, so a meal
             planned meanwhile is never planned over; when nothing's left for it, it says so and goes */
          if (prepView) {
            const look = prepLook(ws);
            if (look.cells.size) prepView = Object.assign(look, { withBlock: prepView.withBlock });
            else { prepView = null; SR.toast(look.plan.message, ''); }
          }
          drawRows(); drawSug(); drawBoard(); drawPrep(); drawSide(); drawShop();
          [main, inner, sideScroll].forEach((el, i) => { if (el.scrollTop !== y[i]) el.scrollTop = y[i]; });
          if (pop) placePop();
          requestAnimationFrame(() => { sideHint(); innerHint(); mainHint(); });
        }

        /* == V11: the grocery list, on the board ==
           The week's list as the groceries panel has it (proteins, vegetables, bases, other), on a sheet of
           paper under the board. Each thing says which meals it's for; a check saves to the board, so it's on
           the phone too. Copy and Share send what's left. It changes as the meals do. */
        function drawShop() { keepFocus(shop, drawShop0); }
        function drawShop0() {
          const on = SR.useDinners();
          shop.hidden = !on; shopJump.hidden = true;
          if (!on) return;
          /* on a phone the list waits after the meals; on a computer it sits under the board. V11: "after" is
             whenever the board and the meals stack (the same width the stylesheet stacks them at), so the
             meals you drag from always sit right under the board. V11 (the rituals walk): in the store view the list
             is all there is */
          const tall = stacked() && !store;
          if (tall && shop.parentElement !== body) body.appendChild(shop);
          else if (!tall && shop.parentElement !== main) main.appendChild(shop);
          const { prog, list } = shopList(dates);
          const gs = SR.grocerySub(dates), open = store || shopOpen !== false;
          shopJump.hidden = !tall;
          if (tall) shopJump.replaceChildren(SR.icon('cart', 9, CREAM), h('b', '', 'Groceries'), h('span', '', gs), SR.icon('down', 7, '#C6BEB2'));
          const head = h('div', 'c-shop-head');
          const tog = h('button', 'c-shop-tog'); tog.type = 'button'; tog.setAttribute('aria-expanded', String(open));
          const n = h('span', 'c-shop-n', gs);
          tog.append(SR.icon('cart', 9, CREAM), h('b', '', 'Groceries'), n, SR.icon(open ? 'up' : 'down', 7, '#C6BEB2'));
          tog.setAttribute('aria-label', 'Groceries, ' + gs + (open ? '. Fold the list' : '. Show the list'));
          tog.addEventListener('click', () => { if (store) return; shopOpen = !open; keep(SHOP_KEY, shopOpen ? '1' : '0'); drawShop(); snd('detent'); });
          if (store) tog.disabled = true;
          /* the count says it changed */
          if (shopWas && gs !== shopWas && feelOn()) n.animate([{ color: '#F2CF7A', transform: 'scale(1.08)' }, { color: '#F2CF7A', transform: 'none', offset: 0.5 }, { transform: 'none' }], { duration: 240, easing: FOUT });
          shopWas = gs;
          head.appendChild(tog);
          /* V11 (the rituals walk): what a line is for, with how many meals it covers first ("5 meals: Burrito bowls
             Sun (3), Chicken stir fry Mon"), and the same in what's sent, under the aisle it's in */
          const days = (ds) => (ds.length > 1 ? ds.slice(0, -1).join(', ') + ' and ' + ds[ds.length - 1] : ds[0]);
          const mealsOf = (x) => x.uses.reduce((a, u) => a + (u.serves || u.n || 1), 0);
          const whyOf = (x) => {
            if (x.extra) return 'Not for a meal';
            if (!x.uses.length) return days(x.days.map((d) => M.DAY_SHORT[M.weekday(d)]));
            const total = mealsOf(x), each = x.uses.map((u) => u.meal + ' ' + u.days.join(' and ') + (u.serves > 1 ? ' (' + u.serves + ')' : ''));
            return total > 1 ? total + ' meals: ' + each.join(', ') : x.uses[0].meal + ', ' + days(x.uses[0].days);
          };
          const KINDS = SR.D.PANTRY_KINDS.concat([{ id: '', name: 'Other' }, { id: 'more', name: 'Not for a meal' }]);
          const inKind = (kd) => (x) => (kd.id === 'more' ? !!x.extra : !x.extra && (kd.id ? x.kind === kd.id : !SR.D.PANTRY_KINDS.some((y) => y.id === x.kind)));
          const left = list.filter((x) => !x.got), sendList = left.length ? left : list;
          const text = ['Groceries · ' + M.spanText(dates[0], dates[6])].concat(KINDS.flatMap((kd) => { const xs = sendList.filter(inKind(kd)); return xs.length ? ['', kd.name.toUpperCase()].concat(xs.map((x) => { const t = mealsOf(x); return x.name + (t > 1 ? ', ' + t + ' meals' : ''); })) : []; })).join('\n');
          if (list.length && open) {
            const acts = h('div', 'c-shop-acts');
            const word = left.length && prog.got ? ' what’s left' : '';
            if (typeof navigator.share === 'function') {
              const sh = Kit.btn('c-again c-shop-act', 'Share' + word, async () => { try { await navigator.share({ title: 'Groceries', text }); } catch (e) { /* closed, or not allowed here */ } });
              acts.appendChild(sh);
            }
            const cp = Kit.btn('c-again c-shop-act', 'Copy' + word, async () => {
              const n2 = left.length || list.length;
              /* V11: with everything in the cart, what's copied is the whole list, and the toast says so */
              if (await copyText(text)) SR.toast(left.length ? 'Copied ' + n2 + (n2 === 1 ? ' thing' : ' things') + ' to get' : 'Copied the whole list, ' + n2 + (n2 === 1 ? ' thing' : ' things'), 'good');
              else {
                /* the browser said no: the list as plain text, picked out, to copy by hand */
                const plain = h('textarea', 'c-find c-shop-plain'); plain.readOnly = true; plain.value = text; plain.rows = Math.min(8, n2);
                plain.setAttribute('aria-label', 'Grocery list');
                shop.querySelectorAll('.c-shop-plain').forEach((x) => x.remove());
                head.after(plain); plain.focus(); plain.select();
                SR.toast('Select the list and copy it', '');
              }
            });
            acts.appendChild(cp);
            if (prog.got) acts.appendChild(Kit.btn('c-again c-shop-act', 'Clear the checks', () => {
              /* (the things that aren't for a meal stay on the list) */
              commitMeals((st) => { const w = M.weekStart(dates[0]), ex = st.shopping[w] && st.shopping[w].extra; delete st.shopping[w]; if (Array.isArray(ex) && ex.length) st.shopping[w] = { extra: ex }; });
              drawShop(); mealToast('Checks cleared', true);
              /* the button leaves with the checks, so focus goes to the list's own heading */
              const t = shop.querySelector('.c-shop-tog'); if (t) t.focus({ preventScroll: true });
            }));
            head.appendChild(acts);
          }
          const kids = [head];
          if (open) {
            const paper = h('div', 'c-shop-paper');
            const rowOf = (x) => {
              const row = h('label', 'c-shop-row' + (x.got ? ' got' : ''));
              const tk = h('input', 'c-shop-tick'); tk.type = 'checkbox'; tk.checked = x.got;
              tk.setAttribute('aria-label', x.name);
              tk.dataset.sk = x.id;
              tk.addEventListener('change', () => {
                SR.Snd.init(); snd(tk.checked ? 'pick' : 'detent'); setGot(dates, x.id, tk.checked); drawShop();
                /* every check says so, with Undo (in the store view a checked thing moves to In the cart) */
                mealToast(tk.checked ? x.name + (store ? ' is in the cart' : ' is checked off') : x.name + ' is back on the list', true, () => drawShop());
                const again = shop.querySelector('[data-sk="' + CSS.escape(x.id) + '"]'); if (again) again.focus({ preventScroll: true });
              });
              const words = h('span', 'c-shop-words');
              words.appendChild(h('span', 'c-shop-name', x.name));
              const why = whyOf(x);
              words.appendChild(h('small', '', why));
              row.title = x.name + ': ' + why;
              const box = h('span', 'c-shop-box'); box.appendChild(SR.icon('check', 7, '#FFFFFF'));
              row.append(tk, box, words);
              if (x.extra) {
                const off = h('button', 'c-shop-off'); off.type = 'button'; off.setAttribute('aria-label', 'Take ' + x.name + ' off the list'); off.title = 'Take it off the list';
                off.appendChild(SR.icon('x', 6, '#4A3418'));
                off.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); takeExtra(x); });
                row.appendChild(off);
              }
              return row;
            };
            if (!list.length) {
              const cooking = dates.some((d) => MEAL_KINDS.some(([k]) => { const m = mealAt(d, k); return m && !notCooking(m.how); }));
              paper.appendChild(h('p', 'c-shop-none', cooking ? 'Nothing to get yet. A meal typed with its parts (chicken, rice, peppers) puts them here.' : 'Plan a meal you’re cooking and what it needs lands here.'));
            } else {
              const cols = h('div', 'c-shop-cols');
              /* (in the store view what's in the cart folds away at the foot, so what's left stays on top) */
              const shown = store ? left : list;
              KINDS.forEach((kd) => {
                const items = shown.filter(inKind(kd));
                if (!items.length) return;
                const g = h('div', 'c-shop-group');
                g.appendChild(h('h4', '', kd.name));
                items.forEach((x) => g.appendChild(rowOf(x)));
                cols.appendChild(g);
              });
              if (store && !left.length) cols.appendChild(h('p', 'c-shop-none', 'Everything on the list is in the cart.'));
              paper.appendChild(cols);
              if (store && prog.got) {
                const inCart = list.filter((x) => x.got);
                const fold = h('button', 'c-cartfold'); fold.type = 'button'; fold.setAttribute('aria-expanded', String(cartOpen));
                fold.append(h('span', '', 'In the cart (' + inCart.length + ')'), SR.icon(cartOpen ? 'up' : 'down', 7, '#4A3418'));
                fold.addEventListener('click', () => { cartOpen = !cartOpen; drawShop(); const f = shop.querySelector('.c-cartfold'); if (f) f.focus({ preventScroll: true }); });
                paper.appendChild(fold);
                if (cartOpen) { const g = h('div', 'c-shop-group c-incart'); inCart.forEach((x) => g.appendChild(rowOf(x))); paper.appendChild(g); }
              }
            }
            /* V11 (the rituals walk): room for what isn't a meal: milk, paper towels. Kept with the week's checks */
            const add = h('form', 'c-shop-add');
            const ai = h('input', 'c-find'); ai.placeholder = 'Add something else, like milk'; ai.autocomplete = 'off'; ai.enterKeyHint = 'done'; ai.maxLength = 60;
            ai.setAttribute('aria-label', 'Add something to get that isn’t for a meal'); ai.dataset.sk = 'add';
            const ab = Kit.btn('c-again c-shop-act', 'Add', () => add.requestSubmit(), 'plus');
            add.append(ai, ab);
            add.addEventListener('submit', (e) => { e.preventDefault(); addExtra(ai.value); });
            paper.appendChild(add);
            kids.push(paper);
          }
          shop.replaceChildren(...kids);
        }
        /* V11 (the rituals walk): a thing to get that isn't for a meal, on the week's list, with Undo; and off again */
        function addExtra(text) {
          const name = cap(String(text || '').replace(/\s+/g, ' ').trim()).slice(0, 60);
          if (!name) return;
          const w = M.weekStart(dates[0]), was = ((SR.state.shopping || {})[w] || {}).extra || [];
          if (was.some((x) => norm(x.name) === norm(name))) { SR.toast(name + ' is on the list already.', ''); return; }
          const id = 'g' + Date.now().toString(36);
          commitMeals((st) => { st.shopping = st.shopping || {}; const wk = Object.assign({}, st.shopping[w]); wk.extra = (Array.isArray(wk.extra) ? wk.extra : []).concat({ id, name }); st.shopping[w] = wk; });
          shopOpen = true; drawShop(); snd('pick');
          mealToast(name + ' is on the list', true, () => drawShop());
          const again = shop.querySelector('[data-sk="add"]'); if (again) again.focus({ preventScroll: true });
        }
        function takeExtra(x) {
          const w = M.weekStart(dates[0]), id = x.id.replace(/^x:/, '');
          commitMeals((st) => { const wk = Object.assign({}, st.shopping[w]); wk.extra = (wk.extra || []).filter((y) => y.id !== id); delete wk[x.id]; if (!wk.extra.length) delete wk.extra; if (Object.keys(wk).length) st.shopping[w] = wk; else delete st.shopping[w]; });
          drawShop(); snd('detent');
          mealToast(x.name + ' is off the list', true, () => drawShop());
          const again = shop.querySelector('[data-sk="add"]'); if (again) again.focus({ preventScroll: true });
        }
        /* scrolls the grocery list into view, in whichever part of the mat scrolls here */
        function toShop() {
          requestAnimationFrame(() => {
            const sc = main.scrollHeight > main.clientHeight + 4 && getComputedStyle(main).overflowY !== 'visible' ? main : inner;
            const y = shop.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
            sc.scrollBy({ top: y, behavior: feelOn() ? 'smooth' : 'auto' });
          });
        }
        mealLive = draw;
        /* V11 (the rituals walk): on a small screen Show folds into one button, "Meals: 3", whose menu has the three
           (white on the ones showing), so the board's first days are on the first screen */
        let showMenu = false;
        function drawRows() {
          rows.replaceChildren(h('span', 'c-tlabel', 'Show'));
          const small = window.innerWidth < 600;
          rows.classList.toggle('c-showfold', small);
          rows.classList.toggle('open', small && showMenu);
          if (small) {
            const mb = Kit.btn('c-again c-showbtn', 'Meals: ' + showRows.length, () => { showMenu = !showMenu; drawRows(); const f = showMenu ? rows.querySelector('.c-pill') : rows.querySelector('.c-showbtn'); if (f) f.focus({ preventScroll: true }); }, showMenu ? 'up' : 'down');
            mb.setAttribute('aria-expanded', String(showMenu));
            mb.setAttribute('aria-label', 'Meals showing: ' + showRows.map((k) => kindName(k)).join(', ') + '. Change which');
            rows.appendChild(mb);
            if (!showMenu) return;
          }
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
        /* V11 (the rituals walk): an open book (the Duo opened, 760 to 1139 wide and wider than tall) keeps the week's
           seven days across on the left page and the meals on the right, as a computer does, in place of the phone's
           turned board with three days in view (rituals.css, .c-book) */
        const bookView = () => window.innerWidth >= 760 && window.innerWidth < 1140 && window.innerWidth > window.innerHeight;
        const tallBoard = () => !bookView() && inner.clientWidth > 0 && inner.clientWidth < 900;
        /* V11: the board and the meals stack below this width (variant.css stacks .c-meal-body there too) */
        const stacked = () => !bookView() && window.matchMedia('(max-width: 1099px)').matches;
        /* V11: where the meal board's toasts show. At the bottom they sat on the grocery list's Share and Copy,
           and on a phone on the day's own card; at the top they sit over the board's title. On a phone with no
           card open they stay at the bottom, so Done is never covered */
        const toastSpot = () => document.body.classList.toggle('c-toasts-top', !!mat && mat.classList.contains('c-meals') && (window.innerWidth >= 600 || !!pop));
        function drawBoard() {
          /* V11: measured before the board empties, and built off the page, so an empty board never lays out
             (that clamped the column's scroll to the top on every change) */
          const tall = tallBoard();
          const live = board;
          const board0 = document.createDocumentFragment();
          live.classList.toggle('c-tall', tall);
          live.style.setProperty('--rows', showRows.length);
          /* V11: the board's corner keeps count of the meals on the days the grid shows (on a phone the days
             still to come, unless the earlier ones are open), with no total: how many meals a day is yours to say.
             With none yet it stays empty; the board's line already says how to start */
          const shownDays = tall ? dates.filter((d) => showPast || d >= SR.today) : dates;
          const cnt = mealCount(shownDays, showRows, true), corner = h('div', 'c-mcorner');
          const cSpan = shownDays.length && shownDays.length < dates.length ? M.DAY_SHORT[M.weekday(shownDays[0])] + (shownDays.length > 1 ? ' to ' + M.DAY_SHORT[M.weekday(shownDays[shownDays.length - 1])] : '') : '';
          if (cnt.n) {
            corner.append(h('b', '', cnt.n + (cnt.n === 1 ? ' meal' : ' meals')), h('span', '', 'planned'));
            corner.setAttribute('aria-label', cnt.n + (cnt.n === 1 ? ' meal' : ' meals') + ' planned' + (cSpan ? ', ' + cSpan : ''));
            if (cSpan) corner.title = 'Counting ' + cSpan;
          } else corner.setAttribute('aria-hidden', 'true');
          board0.appendChild(corner);
          if (tall) {
            showRows.forEach((k) => board0.appendChild(rowLabel(k)));
            /* on a phone the days already over fold into one line, so the week opens on what's left */
            const past = dates.filter((d) => d < SR.today);
            if (past.length) {
              const span = M.DAY_SHORT[M.weekday(past[0])] + (past.length > 1 ? ' to ' + M.DAY_SHORT[M.weekday(past[past.length - 1])] : '');
              const fold = h('button', 'c-pastfold'); fold.type = 'button'; fold.setAttribute('aria-expanded', String(showPast));
              /* V11 (the rituals walk): a week that's over says so by its dates, never "Earlier this week" */
              const over = past.length === dates.length;
              fold.append(h('span', '', over ? M.spanText(dates[0], dates[6]) + ' is over · ' + (showPast ? 'Hide its meals' : 'Show its meals') : (showPast ? 'Hide ' : 'Earlier this week: ') + span), SR.icon(showPast ? 'up' : 'down', 7, '#4A3418'));
              fold.addEventListener('click', () => { showPast = !showPast; draw(); const f = board.querySelector('.c-pastfold'); if (f) f.focus({ preventScroll: true }); });
              board0.appendChild(fold);
            }
            dates.filter((d) => showPast || d >= SR.today).forEach((d) => { board0.appendChild(dayHead(d)); showRows.forEach((k) => board0.appendChild(cellFor(d, k))); });
          } else {
            dates.forEach((d) => board0.appendChild(dayHead(d)));
            showRows.forEach((k) => { board0.appendChild(rowLabel(k)); dates.forEach((d) => board0.appendChild(cellFor(d, k))); });
          }
          live.replaceChildren(board0);
          board.classList.toggle('c-holding', !!held);
          justSet = ''; landSet = new Set();
          requestAnimationFrame(fitNames);
        }
        /* V11: a name whose longest word is wider than its block steps down to 12 px, the smallest size on the
           scale, so a narrow window never breaks Leftovers as Leftover and s. Measured, not guessed from length */
        const fitCtx = document.createElement('canvas').getContext('2d');
        function fitNames() {
          board.querySelectorAll('.c-mcell .c-dblock > b').forEach((b) => {
            b.classList.remove('c-fit12');
            const w = b.clientWidth;
            if (!w) return;
            const s = getComputedStyle(b);
            fitCtx.font = s.fontWeight + ' ' + s.fontSize + ' ' + s.fontFamily;
            if (Math.max(...b.textContent.split(/\s+/).map((x) => fitCtx.measureText(x).width)) > w + 0.5) b.classList.add('c-fit12');
          });
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
          /* V11 goals: a prep week being looked at shows its meals in the open days, dashed, until Use this plan.
             They're a preview, not buttons; a meal dropped on one takes its place */
          const pp = !m && prepView && prepView.cells.get(cellKey(d, k));
          if (pp) {
            cell.classList.add('c-hasprop', 'c-inplan');
            cell.removeAttribute('role'); cell.tabIndex = -1;
            const left = pp.kind === 'leftovers', f = left ? pp.meal.from : null;
            const nm = left ? pp.name.replace(AUTO_LEFT, '').trim() || 'Leftovers' : pp.name;
            const feeds = pp.kind === 'batch' ? 1 + [...prepView.cells.values()].filter((x) => x.kind === 'leftovers' && x.meal.from && x.meal.from.date === d && x.meal.from.slot === k).length : 0;
            const line = f ? 'From ' + slotWords(f.date, f.slot, true) : feeds > 1 ? 'For ' + feeds + ' meals' : '';
            const t = h('div', 'c-prop c-prepprop' + (left ? ' left' : '')); t.style.setProperty('--b', MEAL_COLOR[left ? 'easy' : k]);
            t.append(h('span', 'sr-only', 'In the prep plan: '), h('b', '', nm));
            if (line) t.appendChild(h('small', '', line));
            t.title = (left ? 'Leftovers: ' + nm : nm) + (line ? ', ' + line.toLowerCase() : '') + '. Part of the prep plan';
            cell.appendChild(t);
            return cell;
          }
          /* V11-2 (every dead end gets a next step): an empty day says what it's for, in words anyone sees, not only a
             screen reader: a quiet + Add (deadends.css holds it at 4.5 to 1 on the wood) */
          /* (V11-3, design review 28: a day that's over says Not planned, as the dinners strip does, never + Add) */
          if (!m && d < SR.today) { cell.classList.add('c-mpast'); cell.appendChild(h('span', 'c-madd c-mnone', 'Not planned')); cell.setAttribute('aria-label', dayWords(d, k) + ': not planned. Add what you had'); return cell; }
          if (!m) { const add = h('span', 'c-madd'); add.append(SR.icon('plus', 7, '#2E1E0C'), h('span', '', 'Add')); cell.appendChild(add); cell.setAttribute('aria-label', dayWords(d, k) + ': nothing yet. Add a meal'); return cell; }
          const easy = notCooking(m.how);
          /* V11 goals: leftovers read as the dish they are, with the meal they come from under it ("From Sun
             dinner"); a meal cooked to last says how many meals it feeds ("For 3 meals") */
          const src = m.how === 'leftovers' ? sourceOf(d, k, m) : null, serves = easy ? 0 : leftoversNow(d, k).length + 1;
          const label = src ? dishOf(d, k, m) : mealLabel(m);
          const sub = src ? 'From ' + slotWords(src.date, src.slot, true) : easy && m.name ? howName(m.how) : serves > 1 ? 'For ' + serves + ' meals' : '';
          const blk = domBlock(label, sub, MEAL_COLOR[easy ? 'easy' : k], MEAL_INK[easy ? 'easy' : k], 'c-in-cell' + (justSet === d + k || landSet.has(d + '|' + k) ? ' c-land' : '') + (src ? ' c-leftover' : serves > 1 ? ' c-batch' : ''));
          /* a long word (Sandwiches) steps down a size rather than being cut, and the whole name shows on hover */
          if (label.split(/\s+/).some((w) => w.length >= 10)) blk.classList.add('c-tight');
          blk.title = src ? 'Leftovers: ' + label + ', from ' + slotWords(src.date, src.slot) : mealLabel(m) + (serves > 1 ? ', for ' + serves + ' meals' : '');
          /* V11: the tag names whoever is cooking: you, a partner, or family who live with you. With one
             person who can cook it says nothing new, so it stays away (as on the plan and in the dinner panel) */
          const who = easy || !m.cook || m.cook === 'home' || cookList(m.cook).length < 2 ? '' : cookNamed(m.cook) || (m.cook === 'kim' ? 'Partner' : '');
          if (who) {
            /* V11: the name sits in its own span, so the tag's 44 px touch area can reach past its edge. The tag
               shows the first name (the whole name when two cooks share it) and cuts it short if it must */
            const tag = h('span', 'c-cook c-nodrag'); tag.appendChild(h('span', 'c-cook-name', cookShort(m.cook) || who));
            tag.title = (who === 'You' ? 'You’re' : who + ' is') + ' making it. Tap to change.'; tag.setAttribute('role', 'button'); tag.tabIndex = 0;
            tag.setAttribute('aria-label', (who === 'You' ? 'You’re' : who + ' is') + ' making it. Change who');
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
          cell.setAttribute('aria-label', dayWords(d, k) + ': ' + (src ? 'leftovers of ' + label + ' from ' + slotWords(src.date, src.slot) : mealLabel(m) + (serves > 1 ? ', for ' + serves + ' meals' : '')) + '. Open to change');
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
          /* V11 goals: a meal in the prep week being looked at is kept with the rest of it */
          if (prepView && prepView.cells.has(cellKey(z.dataset.date, z.dataset.kind))) { SR.toast('Part of the prep week. Use this plan keeps all of it.', ''); snd('tap'); return; }
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
          if (k === 'dinner' && !canDinner(d)) { SR.toast('No open time for dinner on ' + M.DAY_LONG[M.weekday(d)] + '. Make room on that day, or plan it for another night.', 'bad'); return false; }
          const add = k === 'dinner' && !hasDinnerBlock(d);
          let at = null;
          const links = linkedNow();
          const r = commitMeals((st) => { if (add) at = ensureDinner(st, d); putMeal(st, d, k, make(st)); });
          if (r === false) return false;
          justSet = d + k; props.delete(d + '|' + k);
          const now = mealAt(d, k);
          /* V11: every meal that lands says so, with Undo (the toast is read out too). V11 goals: a meal that
             replaced one with leftovers, and isn't cooked, says the leftovers stay */
          const stay = stayWords(letGoSince(links));
          if (now) mealToast(mealLabel(now) + ' for ' + dayWords(d, k) + (add && at != null ? ', with a Dinner block' + (typeof at === 'number' ? ' at ' + M.clock(at) : '') : '') + (stay ? '. ' + stay : ''), true);
          return true;
        }
        function placeOn(p, d, k, copy) {
          if (p.from) {
            if (p.from.d === d && p.from.k === k) return;
            const a = mealAt(p.from.d, p.from.k), b = mealAt(d, k);
            if (copy) { setCell(d, k, () => a); draw(); return; }
            if (k === 'dinner' && !canDinner(d)) { SR.toast('No open time for dinner on ' + M.DAY_LONG[M.weekday(d)] + '. Make room on that day, or plan it for another night.', 'bad'); draw(); return; }
            /* V11: a swap that can't go back says why, never a quiet nothing */
            if (p.from.k === 'dinner' && b && !canDinner(p.from.d)) { SR.toast('No open time for dinner on ' + M.DAY_LONG[M.weekday(p.from.d)] + ', so ' + mealLabel(b) + ' can’t swap there. Drop it on an open night instead.', 'bad'); draw(); return; }
            /* V11 goals: leftovers go with the meal they come from; any that would now come before it stay
               leftovers, from no meal, and the toast says which */
            const links = linkedNow();
            commitMeals((st) => { if (k === 'dinner') ensureDinner(st, d); putMeal(st, d, k, a); putMeal(st, p.from.d, p.from.k, b); followMoves(st, [[p.from, { d, k }]].concat(b ? [[{ d, k }, p.from]] : [])); });
            justSet = d + k; props.delete(d + '|' + k);
            const stay = stayWords(letGoSince(links));
            mealToast((b ? 'Swapped ' + mealLabel(a) + ' and ' + mealLabel(b) : mealLabel(a) + ' moved to ' + dayWords(d, k)) + (stay ? '. ' + stay : ''), true);
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
          mealToast((p.name || howName(p.how)) + ' for ' + kindName(k).toLowerCase() + ' on ' + days.length + (days.length === 1 ? ' day' : ' days'), true);
        }
        /* last week's meals, on the days of this one that are still open */
        function sameAsLast(back) {
          const todo = lastWeekMeals(dates, showRows, back);
          if (bringLastWeek(dates, showRows, back)) { fillMode = null; todo.forEach(([d, k]) => landSet.add(d + '|' + k)); draw(); fillFocus(); }
        }
        function clearMeal(d, k, say) {
          const m = mealAt(d, k);
          if (!m) return;
          const links = linkedNow();
          commitMeals((st) => putMeal(st, d, k, null));
          draw();
          /* V11 goals: a meal with leftovers says they stay, from no meal now: "Monday lunch stays as leftovers." */
          const stay = stayWords(letGoSince(links));
          /* V11: "Took Burrito bowls off Saturday", so a plural name never trips the verb */
          if (say || stay) mealToast('Took ' + mealLabel(m) + ' off ' + M.DAY_LONG[M.weekday(d)] + (stay ? '. ' + stay : ''), true);
          else speak('Took ' + mealLabel(m) + ' off ' + dayWords(d, k));
        }
        function cycleCook(d, k) {
          const m = mealAt(d, k);
          if (!m || notCooking(m.how)) return;
          /* V11: around everyone who can cook (you, each partner, family who live with you), then Anyone;
             with one cook there's no one to hand it to */
          if (cookList(m.cook).length < 2) return;
          const order = cookList(m.cook).map((c) => c.id).concat('home');
          const next = order[(order.indexOf(m.cook || 'home') + 1) % order.length];
          commitMeals((st) => putMeal(st, d, k, Object.assign({}, m, { cook: next })));
          snd('detent'); draw();
          /* V11: who's making it and on which day, said, with Undo: "Ana is making Turkey chili Friday" */
          const nm = next === 'home' ? '' : cookNamed(next), on = k === 'dinner' ? ' ' + M.DAY_LONG[M.weekday(d)] : ' for ' + mealDayWords(d, k);
          mealToast(next === 'me' ? 'You’re making ' + mealLabel(m) + on : nm ? nm + ' is making ' + mealLabel(m) + on : 'Anyone can make ' + mealLabel(m) + on, true);
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
          /* (V11 goals: and leftovers, the meal they come from) */
          const draft = { name: m ? m.name : '', parts: m ? m.parts.slice() : [], off: new Set(), how: m ? m.how : 'home', cook: m ? m.cook : '', recipe: m ? m.recipe : null, items: m ? m.items.slice() : [], from: m && m.from ? m.from : null };
          if (m && m.parts.length > 1) m.parts.forEach((pt) => { const id = pantryFind(groceryName(pt)); if (!id || !m.items.includes(id)) draft.off.add(pt); });
          const built = (st) => {
            const cooking = !notCooking(draft.how);
            const own = draft.parts.length > 1;
            const items = !cooking ? [] : !own && draft.recipe ? draft.items.slice() : own ? pantryIds(st, draft.parts.filter((pt) => !draft.off.has(pt))) : [];
            return Object.assign({ name: cap(draft.name), parts: own ? draft.parts : [], items, how: draft.how, cook: draft.cook || undefined, recipe: own ? null : draft.recipe }, draft.how === 'leftovers' && draft.from ? { from: draft.from } : {});
          };
          /* V11: a change in the card saves as it's made, and the card says so. V11 goals: a meal that stops
             being cooked says its leftovers stay, from no meal now, with Undo */
          const savedMark = h('span', 'c-mpop-saved'); savedMark.setAttribute('role', 'status'); savedMark.hidden = true;
          const saveNow = () => {
            const links = linkedNow();
            commitMeals((st) => putMeal(st, d, k, built(st))); justSet = ''; draw();
            savedMark.replaceChildren(SR.icon('check', 7, '#8FD3B1'), h('span', '', 'Saved'));
            savedMark.hidden = false;
            if (feelOn()) savedMark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: FOUT });
            const stay = stayWords(letGoSince(links));
            if (stay) mealToast(stay, true, null, dayWords(d, k) + ' is as it was.');
          };
          /* V11 goals: cook extra. A tap on a later meal covers it with this one's leftovers (Model.cookExtra; a
             night without a Dinner block gets one); a tap on one it covers opens that meal again */
          const toggleExtra = (c) => {
            const src = mealAt(d, k);
            if (!src || notCooking(src.how)) return;
            const cw = slotWords(c.date, c.slot);
            if (c.on) {
              commitMeals((st) => putMeal(st, c.date, c.slot, null));
              draw(); drawMore(); snd('detent');
              mealToast(cw + ' is open again', true, null, cw + ' is as it was.');
              return;
            }
            if (c.slot === 'dinner' && !canDinner(c.date)) { SR.toast('No open time for dinner on ' + M.DAY_LONG[M.weekday(c.date)] + '. Make room on that day, or pick another meal.', 'bad'); return; }
            const add = c.slot === 'dinner' && !hasDinnerBlock(c.date);
            let at = null;
            const r = commitMeals((st) => { if (add) at = ensureDinner(st, c.date); const x = M.cookExtra(st, { date: d, slot: k }, [{ date: c.date, slot: c.slot }]); return x.ok ? x : false; });
            if (!r || r.ok === false) { SR.toast('That didn’t take, and nothing changed.', 'bad'); return; }
            landSet.add(cellKey(c.date, c.slot));
            draw(); drawMore(); snd('clack', 0.7);
            mealToast(coverWords(mealLabel(src), leftoversNow(d, k)) + (add && at != null ? ', with a Dinner block' + (typeof at === 'number' ? ' at ' + M.clock(at) : '') : ''), true, null, cw + ' is as it was.');
          };
          /* V11 goals: leftovers from no meal yet: a tap on a meal cooked in the days before makes them its leftovers */
          const linkFrom = (c) => {
            const r = commitMeals((st) => { const x = M.cookExtra(st, { date: c.date, slot: c.slot }, [{ date: d, slot: k }]); return x.ok ? x : false; });
            if (!r || r.ok === false) { SR.toast('That didn’t take, and nothing changed.', 'bad'); return; }
            snd('clack', 0.7);
            closePop(); landSet.add(cellKey(d, k)); draw();
            const again = board.querySelector('[data-zone="meal"][data-date="' + d + '"][data-kind="' + k + '"]');
            if (again) openPop(again, d, k);
            mealToast(coverWords(mealLabel(c.meal), leftoversNow(c.date, c.slot)), true, null, dayWords(d, k) + ' is as it was.');
          };
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
              /* (V11 goals: leftovers that become something else keep the dish's name, not "Leftovers: Chili") */
              const unLeft = (id) => { if (draft.how !== 'leftovers' || id === 'leftovers') return; const rest = (draft.name || '').replace(AUTO_LEFT, '').trim(); if (rest && rest !== draft.name) { draft.name = rest; inp.value = rest; } };
              [['home', 'Cook']].concat(NOT_COOKING).forEach(([id, n]) => howRow.appendChild(pick(n, '', draft.how === id, () => { if (draft.how === id) return; unLeft(id); draft.how = id; saveNow(); drawParts(); drawMore(); snd('detent'); })));
              more.append(h('div', 'c-kick', 'How'), howRow);
              /* V11: with nobody else at home there's no one to ask about, so the question stays away */
              const cooks = cookList(draft.cook);
              if (!notCooking(draft.how) && cooks.length > 1) {
                const whoRow = h('div', 'c-opts'); whoRow.setAttribute('role', 'group'); whoRow.setAttribute('aria-label', 'Who’s making it');
                /* V11: everyone at home who can cook, by name (You, as the dinner panel says it), then Anyone */
                /* V11 (the rituals walk): nobody is picked until someone is, and until then the line asks */
                /* (a breakfast or a lunch keeps Anyone as no cook, as it always has, so only a dinner asks) */
                const askWho = k === 'dinner' && !draft.cook;
                cooks.map((c) => [c.id, c.name]).concat([['home', 'Anyone']]).forEach(([id, n]) => whoRow.appendChild(pick(n, '', k === 'dinner' ? draft.cook === id : (draft.cook || 'home') === id, () => { draft.cook = id; saveNow(); drawMore(); snd('detent'); })));
                const whoKick = h('div', 'c-kick' + (askWho ? ' c-ask' : ''), 'Who’s making it?');
                if (askWho) whoKick.appendChild(h('span', 'c-notyet', 'Not picked yet'));
                more.append(whoKick, whoRow);
              }
              /* V11 goals: a meal being cooked can cover later meals: each one a toggle (open ones, and the ones it
                 covers, up to four days on), then how many meals it makes. Leftovers say the meal they come from,
                 a tap away, or offer the meals cooked in the days before */
              const now = mealAt(d, k);
              if (now && !notCooking(now.how)) {
                const g = extraGrid(d, k, showRows);
                if (g.rows.length) {
                  /* a row for each meal, a column for each day: white fill on the ones it covers, as Also on */
                  const xg = h('div', 'c-xgrid'); xg.setAttribute('role', 'group'); xg.setAttribute('aria-label', 'Cook extra for');
                  g.rows.forEach((r) => {
                    xg.appendChild(h('span', 'c-xrow', kindName(r.slot)));
                    r.cells.forEach((c, i) => {
                      /* (a meal it can't cover says its day and why: the meal there, Over, Away, This one, or No room) */
                      if (!c) {
                        const day = g.days[i], why = noCover(d, k, day, r.slot), no = h('span', 'c-xnone'), seen = h('span', 'c-xnone-in');
                        no.title = why.words; seen.setAttribute('aria-hidden', 'true');
                        seen.append(h('b', '', M.DAY_SHORT[M.weekday(day)]), h('small', '', why.word));
                        no.append(seen, h('span', 'sr-only', why.words));
                        xg.appendChild(no); return;
                      }
                      const b = pick(M.DAY_SHORT[M.weekday(c.date)], 'c-xopt', c.on, () => keepFocus(box, () => toggleExtra(c)));
                      b.setAttribute('aria-label', slotWords(c.date, c.slot));
                      b.title = c.on ? 'Leftovers on ' + slotWords(c.date, c.slot) + '. Tap to open it again' : 'Cook enough for ' + slotWords(c.date, c.slot) + ' too';
                      xg.appendChild(b);
                    });
                  });
                  const n = leftoversNow(d, k).length + 1;
                  more.append(h('div', 'c-kick', 'Cook extra for'), xg);
                  if (n > 1) more.appendChild(h('small', 'c-mparts-say c-xsay', 'Enough for ' + n + ' meals.'));
                }
              } else if (now && now.how === 'leftovers') {
                const src = sourceOf(d, k, now);
                if (src) {
                  const row = h('div', 'c-xfrom');
                  row.appendChild(h('span', 'c-xfrom-words', 'From ' + slotWords(src.date, src.slot) + ': ' + mealLabel(src.meal)));
                  const go = pick('Open ' + slotWords(src.date, src.slot, true), 'c-xgo', null, () => { closePop(); openCell(src.date, src.slot); });
                  go.setAttribute('aria-label', 'Open ' + slotWords(src.date, src.slot));
                  row.appendChild(go);
                  more.append(h('div', 'c-kick', 'Leftovers'), row);
                } else {
                  const cands = sourceCells(d, k);
                  if (cands.length) {
                    const fr = h('div', 'c-opts c-xtra'); fr.setAttribute('role', 'group'); fr.setAttribute('aria-label', 'Leftovers of');
                    cands.forEach((c) => {
                      const b = pick(mealLabel(c.meal) + ', ' + M.DAY_SHORT[M.weekday(c.date)], 'c-xopt', false, () => linkFrom(c));
                      b.setAttribute('aria-label', mealLabel(c.meal) + ', ' + slotWords(c.date, c.slot));
                      fr.appendChild(b);
                    });
                    more.append(h('div', 'c-kick', 'Leftovers of'), fr);
                  }
                }
              }
              /* the same meal on other days: tap a day to add it there, tap it again to take it off */
              const also = h('div', 'c-opts c-also'); also.setAttribute('role', 'group'); also.setAttribute('aria-label', 'Also on');
              const mine = norm(mealLabel(mealAt(d, k) || m));
              dates.forEach((dd) => {
                const there = mealAt(dd, k), same = !!there && norm(mealLabel(there)) === mine;
                const b = pick(M.DAY_SHORT[M.weekday(dd)].slice(0, 1), 'c-dayopt', same || dd === d, () => {
                  if (same) { const links = linkedNow(); commitMeals((st) => putMeal(st, dd, k, null)); draw(); const stay = stayWords(letGoSince(links)); mealToast('Took ' + mealLabel(m) + ' off ' + dayWords(dd, k) + (stay ? '. ' + stay : ''), true); }
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
              foot.append(off, savedMark, Kit.btn('c-go', 'Done', () => closePop(true)));
              /* V11: the card grows when a row comes in (Cook adds Who's making it), so it finds its place
                 again and never covers the day it's about */
              if (pop && pop.box === box) placePop();
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
              top6.forEach((y) => row.appendChild(pick(y.name, 'c-sugg', null, () => { closePop(); if (setCell(d, k, (st) => mealFrom(st, payloadOf(y)))) { draw(); snd('clack', 0.85); askCook(d, k); } })));
              more.append(h('div', 'c-kick', q ? 'Matches' : 'Pick one'), row);
            }
            const ways = h('div', 'c-opts');
            NOT_COOKING.forEach(([id, n, ic]) => { const b = pick(n, 'c-way', null, () => { const nm = inp.value.trim(); closePop(); if (setCell(d, k, () => ({ name: nm ? cap(nm) : '', how: id }))) { draw(); snd('clack', 0.8); } }); b.prepend(SR.icon(ic, 7, CREAM)); ways.appendChild(b); });
            more.append(h('div', 'c-kick', 'Not cooking'), ways);
            const go = Kit.btn('c-go', 'Add to ' + M.DAY_LONG[M.weekday(d)], () => form.requestSubmit());
            go.disabled = !q;
            foot.appendChild(go);
            if (pop && pop.box === box) placePop();
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
            if (ok) { draw(); snd('clack', 0.85); askCook(d, k); }
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
          placePop(); toastSpot();
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
        /* V11 (the rituals walk): a dinner that lands with nobody cooking it, where there's someone to ask, opens its
           card again on Who's making it?, so the question is asked while the dish is in mind */
        function askCook(d, k) {
          if (k !== 'dinner' || cookList('').length < 2) return;
          const m = mealAt(d, k);
          if (m && !notCooking(m.how) && !m.cook) setTimeout(() => { if (!pop && mat) openCell(d, k); }, 60);
        }
        function closePop(back) {
          if (!pop) return;
          const p = pop; pop = null;
          toastSpot();
          if (p.box.contains(document.activeElement) && document.activeElement.blur) document.activeElement.blur();
          p.box.classList.remove('in'); p.box.classList.add('out');
          setTimeout(() => p.box.remove(), feelOn() ? 160 : 0);
          board.querySelectorAll('.c-popped').forEach((y) => y.classList.remove('c-popped'));
          if (back) { const c = board.querySelector('[data-zone="meal"][data-date="' + p.d + '"][data-kind="' + p.k + '"]'); if (c) c.focus({ preventScroll: true }); }
        }
        /* V11 goals: one meal's card, from another's (leftovers open the meal they come from). The board moves to
           that meal's week, shows its row, and opens the days already over when it's one of them */
        function openCell(cd, ck) {
          let moved = false;
          if (cd < dates[0] || cd > dates[6]) { ws = M.weekStart(cd); dates = M.range(ws, 7); props = new Map(); prepView = null; showPast = false; moved = true; }
          if (!showRows.includes(ck)) { showRows = MEAL_KINDS.map(([x]) => x).filter((x) => x === ck || showRows.includes(x)); moved = true; }
          if (cd < SR.today && !showPast) { showPast = true; moved = true; }
          if (moved) { draw(); speak(weekLabel()); }
          const c = board.querySelector('[data-zone="meal"][data-date="' + cd + '"][data-kind="' + ck + '"]');
          if (!c || c.dataset.away) return;
          c.scrollIntoView({ block: 'nearest' });
          openPop(c, cd, ck);
        }
        /* a tap outside the card closes it; a tap on another day opens that one */
        const outside = (e) => { if (pop && !pop.box.contains(e.target) && !e.target.closest('[data-zone="meal"]')) closePop(); };
        document.addEventListener('pointerdown', outside, true);
        /* V11: where the head stays in view (the board and the meals stacked), it casts a shadow once there's
           something under it */
        const headEl = inner.querySelector('.c-mat-head');
        inner.addEventListener('scroll', () => { if (pop) placePop(); if (headEl) headEl.classList.toggle('c-scrolled', inner.scrollTop > 4); }, { passive: true });
        const onResize = () => {
          toastSpot();
          /* the More below hints check again once the new size has laid out (one could stay on, stale) */
          requestAnimationFrame(() => requestAnimationFrame(() => { sideHint(); innerHint(); mainHint(); fitNames(); }));
          if (tallBoard() !== board.classList.contains('c-tall') || (SR.useDinners() && stacked() !== (shop.parentElement === body)) || (mat && bookView() !== mat.classList.contains('c-book')) || (window.innerWidth < 600) !== rows.classList.contains('c-showfold')) draw();
          else if (pop) placePop();
        };
        window.addEventListener('resize', onResize);
        /* the slash key goes to Find, as in most apps */
        const slash = (e) => { if (e.key === '/' && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); findIn.focus(); } };
        document.addEventListener('keydown', slash);
        function moveWeek(n) { ws = M.addDays(ws, n); dates = M.range(ws, 7); props = new Map(); prepView = null; fillMode = null; showPast = dates[6] < SR.today; closePop(); letGoHeld(); draw(); speak(weekLabel()); snd('slide'); }
        matEsc = () => {
          if (pop) { closePop(true); return true; }
          if (held) { letGoHeld(); return true; }
          if (find) { find = ''; findIn.value = ''; drawSide(); return true; }
          /* V11: Escape while editing the list ends editing, and Escape in Leave out folds it, before it ever
             closes the board */
          if (editing) { endEditing(); return true; }
          if (leaving) { leaving = false; drawSide(); leaveBtn.focus({ preventScroll: true }); return true; }
          return false;
        };
        matGone = () => { mealLive = null; matEsc = null; document.body.classList.remove('c-toasts-top'); document.removeEventListener('keydown', slash); document.removeEventListener('pointerdown', outside, true); window.removeEventListener('resize', onResize); if (pop) { pop.box.remove(); pop = null; } };

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
          /* (the rituals walk: a meal of today whose time is over isn't offered: breakfast after 11, lunch after 3, and
             dinner once its block is over, or 8 pm on a day with none, as a prep week leaves tonight out) */
          const goneToday = (d, k) => {
            if (d !== SR.today) return false;
            if (k !== 'dinner') return SR.nowMin >= (k === 'breakfast' ? 11 : 15) * 60;
            const db = SR.day(d).blocks.find((b) => b.dinner);
            return SR.nowMin >= (db ? db.start + db.dur : 20 * 60);
          };
          dates.forEach((d) => {
            if (d < SR.today || SR.day(d).trip) return;
            showRows.forEach((k) => {
              if (mealAt(d, k) || goneToday(d, k) || (k === 'dinner' && !canDinner(d))) return;
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
          prepView = null;
          closePop(); letGoHeld(); draw(); snd('clack', 0.6);
          speak(props.size + (props.size === 1 ? ' idea' : ' ideas') + ' for the open meals');
        }
        /* V11 goals: Plan a prep week. Two batch cooks, the leftovers they cover, and fresh nights, from your own
           meals first (Model.prepPlan), shown dashed on the board with the plan's own words over it. Nothing
           changes until Use this plan, which puts it all on with one Undo */
        function startPrep() {
          const look = prepLook(ws);
          if (!look.cells.size) { SR.toast(look.plan.message, ''); snd('tap'); return; }
          /* the meals it fills show, even in a row that was hidden */
          const need = MEAL_KINDS.map(([x]) => x).filter((x) => showRows.includes(x) || [...look.cells.values()].some((i) => i.slot === x));
          if (need.length !== showRows.length) { showRows = need; keep(MEAL_ROWS, showRows); }
          props = new Map(); prepView = Object.assign(look, { withBlock: !!look.block });
          closePop(); letGoHeld(); draw(); snd('clack', 0.6);
          speak(prepWords(prepView));
        }
        function usePrepPlan() {
          const pv = prepView;
          if (!pv) return;
          const list = [...pv.cells.values()], block = pv.withBlock ? pv.block : null;
          let out = null;
          const r = commitMeals((st) => {
            /* a night without a Dinner block gets one, the way a dinner dropped there does */
            list.forEach((x) => { if (x.slot === 'dinner') ensureDinner(st, x.date); });
            out = M.applyPrepPlan(st, Object.assign({}, pv.plan, { list, block }), { block: !!block });
            return out.meals || out.block ? { ok: true } : false;
          });
          prepView = null; fillMode = null;
          if (!r || r.ok === false || !out) { draw(); prepFocus(); SR.toast('Nothing changed. Those meals have plans now.', ''); return; }
          landSet = new Set(list.map((x) => cellKey(x.date, x.slot)));
          draw(); prepFocus(); snd('clack', 0.9);
          const n = out.meals, b = out.block, bd = block ? M.DAY_LONG[M.weekday(block.date)] : '';
          mealToast('Prep week planned: ' + count(n, 'meal', 'meals') + (b ? ', and Meal prep on ' + bd + ' at ' + M.clock(b.start) : ''), true, null, (n === 1 ? 'That meal is' : 'Those meals are') + ' off the week' + (b ? ', and so is Meal prep.' : '.'));
          if (block && !b) SR.toast('Meal prep didn’t fit on ' + bd + ' any more. Add it from Batch cooks, under the board.', '');
        }
        /* the bar went with the prep week, so focus goes to what's there now: Plan a prep week, or the board's title */
        function prepFocus() {
          const t = !prepBtn.hidden ? prepBtn : inner.querySelector('.c-mat-head h2'), a = document.activeElement;
          if (t && (!a || a === document.body || !a.isConnected || sugBar.contains(a))) t.focus({ preventScroll: true });
        }
        /* the bar over the board while a prep week shows: what it does, its Meal prep block (on unless you say),
           Clear, and Use this plan */
        function drawPrepBar() {
          const pv = prepView;
          const line = h('div', 'c-sugline');
          const words = h('div', 'c-prepwords');
          words.append(h('div', 'c-kick', 'Prep week'), h('p', '', prepWords(pv)));
          /* V11 (the rituals walk): and what it adds to the grocery list, before it's used */
          const adds = addsWords((st) => M.applyPrepPlan(st, Object.assign({}, pv.plan, { list: [...pv.cells.values()] }), { block: false }));
          if (adds) words.appendChild(h('p', 'c-prepadds', adds));
          /* (the block's toggle sits with the words, so it comes before Use this plan on a phone too) */
          if (pv.block) {
            const b = pv.block;
            /* V11 (the rituals walk): the Meal prep block is the batch cook, and says so when it ends as dinner starts */
            const din = SR.day(b.date).blocks.find((x) => x.dinner), right = din && b.start + b.dur === din.start;
            const t = Kit.btn('c-opt c-preptog', 'Meal prep block, ' + M.DAY_LONG[M.weekday(b.date)] + ' ' + M.span(b.start, b.start + b.dur) + (right ? ', right before dinner' : ''), () => { pv.withBlock = !pv.withBlock; keepFocus(sugBar, drawSug); snd('detent'); });
            t.setAttribute('aria-pressed', String(!!pv.withBlock));
            if (pv.withBlock) t.prepend(SR.icon('check', 7, '#252928'));
            const row = h('div', 'c-have'); row.appendChild(t);
            words.appendChild(row);
          }
          const btns = h('div', 'c-sugbtns');
          btns.append(
            Kit.btn('c-opt', 'Clear', () => { prepView = null; fillMode = null; draw(); prepFocus(); speak('Prep week cleared'); }),
            Kit.btn('c-go c-keepall', 'Use this plan', () => usePrepPlan()));
          line.append(words, btns);
          sugBar.appendChild(line);
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
          props = new Map(); fillMode = null; landSet = new Set(list.map(([key]) => key));
          draw(); snd('clack', 0.9);
          mealToast(list.length + (list.length === 1 ? ' meal' : ' meals') + ' planned', true);
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
        /* V11 (the rituals walk): what a proposal would add to the grocery list, worked out on a copy of the board:
           "Adds 9 things to get", so it's known before Use this plan */
        function addsWords(put) {
          try {
            const st = JSON.parse(JSON.stringify(SR.state)), was = M.groceryProgress(st, dates).total;
            put(st); M.syncLeftovers(st);
            const n = M.groceryProgress(st, dates).total - was;
            return n > 0 ? 'Adds ' + n + (n === 1 ? ' thing' : ' things') + ' to get.' : 'Nothing new to get.';
          } catch (e) { return ''; }
        }
        /* the two ways to fill the week, white on the one showing, above a proposal so the other is a tap away */
        function waysRow() {
          const row = h('div', 'c-fillways'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Fill the week');
          const way = (id, name, line, ic, go) => {
            const on = id === 'suggest' ? props.size > 0 : !!prepView;
            const b = h('button', 'c-fillway' + (on ? ' on' : '')); b.type = 'button'; b.dataset.way = id;
            b.setAttribute('aria-pressed', String(on));
            const w = h('span', 'c-fillway-w'); w.append(h('b', '', name), h('small', '', line));
            b.append(SR.icon(ic, 9, on ? '#252928' : CREAM), w);
            b.addEventListener('click', () => { SR.Snd.init(); if (!on) go(); });
            return b;
          };
          row.appendChild(way('suggest', 'Cook most nights', 'An idea for every open meal', 'pot', () => startSuggest()));
          if (SR.useDinners()) row.appendChild(way('prep', 'Cook twice, eat leftovers', 'Two batch cooks and fresh nights', 'bowl', () => startPrep()));
          return row;
        }
        /* the weeks you planned before, a tap each, one Undo */
        function drawWeeks() {
          const list = earlierWeeks(dates, showRows), box = h('div', 'c-weekpick');
          box.appendChild(h('div', 'c-kick', 'Same as an earlier week'));
          const rowsEl = h('div', 'c-weekpick-rows'); rowsEl.setAttribute('role', 'group'); rowsEl.setAttribute('aria-label', 'Weeks you planned');
          list.forEach((x) => {
            const b = h('button', 'c-weekpick-row'); b.type = 'button';
            b.append(h('b', '', M.spanText(x.ws, M.addDays(x.ws, 6))), h('span', '', count(x.n, 'meal', 'meals') + ' · brings ' + x.brings));
            b.setAttribute('aria-label', M.spanText(x.ws, M.addDays(x.ws, 6)) + ', ' + count(x.n, 'meal', 'meals') + '. Brings ' + x.brings + ' to the open days of this week');
            b.addEventListener('click', () => { SR.Snd.init(); sameAsLast(x.back); });
            rowsEl.appendChild(b);
          });
          const close = Kit.btn('c-opt', 'Not now', () => { fillMode = null; draw(); fillFocus(); });
          box.append(rowsEl, close);
          sugBar.appendChild(box);
        }
        /* after the bar changes, focus goes to what's there now: the first way, the first week, or Fill the week */
        function fillFocus() {
          const a = document.activeElement;
          if (a && a !== document.body && a.isConnected && !sugBar.contains(a) && a !== fillBtn && a !== again && a !== inner.querySelector('.c-mat-head h2')) return;
          const t = sugBar.querySelector('.c-fillway, .c-weekpick-row') || (!fillBtn.hidden ? fillBtn : inner.querySelector('.c-mat-head h2'));
          if (t) t.focus({ preventScroll: true });
        }
        function drawSug() {
          /* (V11 goals: or the prep week being looked at. V11, the rituals walk: or the way to fill it being asked,
             or the weeks you planned before) */
          const proposing = !!props.size || !!prepView, on = proposing || !!fillMode;
          sugBar.hidden = !on;
          /* (a week that's over has nothing left to fill) */
          fillBtn.hidden = proposing || dates[dates.length - 1] < SR.today;
          fillBtn.setAttribute('aria-expanded', String(fillMode === 'choose'));
          again.setAttribute('aria-expanded', String(fillMode === 'weeks'));
          fillBtn.classList.toggle('on', fillMode === 'choose');
          again.classList.toggle('on', fillMode === 'weeks');
          /* while a proposal is up, its Use this plan is the one gold thing: Done steps back (rituals.css) */
          if (mat) mat.classList.toggle('c-proposing', proposing);
          /* (V11-3, design review 27: while nights from today on have no dinner, Fill the week is the one gold thing and
             Done steps back, as it does for a proposal; with the week's dinners all decided, Done is gold again) */
          if (mat) mat.classList.toggle('c-fillgold', !on && !fillBtn.hidden && dates.some((d) => d >= SR.today && !mealAt(d, 'dinner')));
          sugBar.classList.toggle('c-prepbar', !!prepView);
          if (!on) return;
          sugBar.replaceChildren();
          if (fillMode === 'weeks' && !proposing) { drawWeeks(); return; }
          sugBar.appendChild(waysRow());
          if (!proposing) {
            const say = h('div', 'c-sugline');
            say.append(h('p', '', 'Fill the open meals one of two ways. Nothing changes until you keep it.'), Kit.btn('c-opt', 'Not now', () => { fillMode = null; draw(); fillFocus(); }));
            sugBar.appendChild(say);
            return;
          }
          if (prepView) { drawPrepBar(); return; }
          const line = h('div', 'c-sugline');
          const sayIt = h('div', 'c-prepwords');
          sayIt.append(h('p', '', (props.size === 1 ? 'An idea for 1 open meal.' : 'Ideas for ' + props.size + ' open meals.') + ' Tap one to keep it.'));
          const adds = addsWords((st) => props.forEach((p, key) => { const [d, k] = key.split('|'); putMeal(st, d, k, mealFrom(st, p)); }));
          if (adds) sayIt.appendChild(h('p', 'c-prepadds', adds));
          line.appendChild(sayIt);
          const btns = h('div', 'c-sugbtns');
          btns.append(
            Kit.btn('c-opt', 'Clear', () => { props = new Map(); fillMode = null; draw(); fillFocus(); speak('Ideas cleared'); }),
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

        /* == V11 goals: batch cooks, under the board ==
           Each meal this week that's cooked to cover later meals, with how many meals it makes, and its Meal prep
           block: Add a prep block puts one before it in quiet time, where nothing moves (prepSpot), and Take it
           off takes off the block alone. Its block on the desk lists what it makes (app.js addPanel) */
        function drawPrep() { keepFocus(prepBox, drawPrep0); }
        function drawPrep0() {
          const list = prepView ? [] : batchCooks(dates);
          prepBox.hidden = !list.length;
          if (!list.length) { prepBox.replaceChildren(); return; }
          const kids = [h('div', 'c-kick', list.length === 1 ? 'Batch cook' : 'Batch cooks')];
          list.forEach((b) => {
            const row = h('div', 'c-prep-row'); row.dataset.k = cellKey(b.date, b.slot);
            const words = h('div', 'c-prep-words');
            words.append(h('b', '', b.name), h('span', '', slotWords(b.date, b.slot) + ', for ' + b.serves + ' meals'));
            row.append(SR.icon('pot', 9, CREAM), words);
            const on = prepOf(b), day = (d) => M.DAY_LONG[M.weekday(d)];
            if (on) {
              const at = h('span', 'c-prep-on');
              at.append(SR.icon('check', 7, '#8FD3B1'), h('span', '', 'Meal prep, ' + (on.date === b.date ? '' : day(on.date) + ' ') + M.span(on.add.start, on.add.start + on.add.dur)));
              const off = Kit.btn('c-mpop-off c-prep-off', 'Take it off', () => takePrepOff(b, on), 'x');
              off.setAttribute('aria-label', 'Take Meal prep off ' + day(on.date));
              row.append(at, off);
            } else {
              const add = Kit.btn('c-again c-prep-add', 'Add a prep block', () => addPrep(b), 'plus');
              add.setAttribute('aria-label', 'Add a prep block before ' + b.name + ', ' + slotWords(b.date, b.slot));
              row.appendChild(add);
            }
            kids.push(row);
          });
          prepBox.replaceChildren(...kids);
        }
        function addPrep(b) {
          const spot = prepSpot(b);
          if (!spot) { SR.toast('No quiet 90 minutes before ' + b.name + ' on ' + M.DAY_LONG[M.weekday(b.date)] + '. Make room that day, then add it.', 'bad'); snd('tap'); return; }
          let put = null;
          const r = commitMeals((st) => { put = M.applyPrepPlan(st, { list: [], block: { date: spot.date, start: spot.start, dur: PREP_MIN, add: prepAdd(b) } }, { block: true }).block; return put ? { ok: true } : false; });
          if (!r || r.ok === false || !put) { SR.toast('That didn’t take, and nothing changed.', 'bad'); return; }
          draw(); snd('clack', 0.8);
          const dd = M.DAY_LONG[M.weekday(spot.date)];
          mealToast('Meal prep on ' + dd + ', ' + M.span(put.start, put.start + put.dur), true, null, 'Meal prep is off ' + dd + '.');
          const t = prepBox.querySelector('[data-k="' + cellKey(b.date, b.slot) + '"] .c-prep-off'); if (t && (!document.activeElement || document.activeElement === document.body)) t.focus({ preventScroll: true });
        }
        function takePrepOff(b, on) {
          const dd = M.DAY_LONG[M.weekday(on.date)];
          const r = commitMeals((st) => (M.removeAdd(st, on.add.id) ? { ok: true } : false));
          if (!r || r.ok === false) return;
          draw(); snd('slide');
          mealToast('Meal prep is off ' + dd + '. Its meals stay', true, null, 'Meal prep is back on ' + dd + '.');
          /* (focus stays on the row: its Add a prep block took Take it off's place) */
          const t = prepBox.querySelector('[data-k="' + cellKey(b.date, b.slot) + '"] .c-prep-add'); if (t && (!document.activeElement || document.activeElement === document.body)) t.focus({ preventScroll: true });
        }

        /* == the library == */
        function setFor(k) { if (forT === k) return; forT = k; drawSide(); snd('detent'); }
        /* V11: editing the list is a state you can see (the library wears a ring and says Editing), and the
           Edit button keeps focus as its words change */
        function setEditing(on) {
          editing = on; letGoHeld(); drawSide(); snd('detent');
          side.classList.toggle('c-lib-editing', editing);
          speak(editing ? 'Editing your meals. Hide the ones you don’t make.' : 'Done editing');
          const e = lib.querySelector('.c-libedit'); if (e) e.focus({ preventScroll: true });
        }
        const endEditing = () => setEditing(false);
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
          lib.classList.toggle('c-editing', editing);
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
            if (first) { const e = Kit.btn('c-libedit', editing ? 'Done editing' : 'Edit', () => setEditing(!editing)); e.setAttribute('aria-pressed', String(editing)); head.appendChild(e); }
            g.appendChild(head);
            if (first && editing) g.appendChild(h('p', 'c-libsay', 'Hide the meals you don’t make. Ones you added come off for good.'));
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
                const back = () => { editBook((bk) => { bk.hide = bk.hide.filter((key) => key !== y.key); }); drawSide(); snd('clack', 0.6); mealToast('Brought back ' + y.name, true); };
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
          const pay = payloadOf(y);
          const whole = (y.parts && y.parts.length ? y.parts : y.itemNames || []).join(', ');
          if (whole) b.title = whole;
          if (have.size && usesHave(y)) b.appendChild(h('small', 'c-uses', 'Uses ' + usesHave(y) + ' you have'));
          /* V11: while editing, a tile holds still (no grip, no lift, no drag) and its one action is the button
             beside it, big enough to find and never on the grip (Russell, Oct 14: "the X is a little hard to
             find... colliding with where the X is") */
          if (editing) {
            b.classList.add('c-nodrag');
            const x0 = h('button', 'c-phide'); x0.type = 'button';
            const word = y.kind === 'own' ? 'Remove' : 'Hide';
            x0.setAttribute('aria-label', word + ' ' + y.name); x0.title = word + ' ' + y.name;
            x0.append(SR.icon('x', 7, '#FFFFFF'), h('span', '', word));
            x0.addEventListener('click', (e) => { e.stopPropagation(); hideMeal(y); });
            /* a tap or a drag on the tile itself says how to plan with it again, never a quiet nothing */
            let said = 0;
            const why = () => { if (Date.now() - said < 2500) return; said = Date.now(); SR.toast('You’re editing the list. Tap Done editing, then drag ' + y.name + ' onto a day.', ''); snd('tap'); };
            b.addEventListener('click', why);
            b.addEventListener('pointerdown', (e) => { const x1 = e.clientX, y1 = e.clientY, pid = e.pointerId; const mv = (ev) => { if (ev.pointerId !== pid) return; if (Math.abs(ev.clientX - x1) + Math.abs(ev.clientY - y1) > 12) { off(); why(); } }; const off = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', off); window.removeEventListener('pointercancel', off); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', off); window.addEventListener('pointercancel', off); });
            wrap.append(b, x0);
            return wrap;
          }
          b.tabIndex = 0; b.setAttribute('role', 'button');
          b.setAttribute('aria-label', y.name + '. Tap, then tap a day. Delete hides it');
          b.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hold(pay, b); }
            else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); hideMeal(y); }
          });
          draggable(b, pay, { accept, why: refusal, onDrop: (z, p) => dropOn(z, p), onTap: (p, el) => hold(p, el), onLift: () => { board.dataset.drag = 'replace'; }, onEnd: () => { delete board.dataset.drag; } });
          if (held && held.p.key === y.key) b.classList.add('c-held');
          wrap.appendChild(b);
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
          mealToast('Added ' + name + ' to your meals', true, () => { fresh = ''; letGoHeld(); });
        }
        function hideMeal(y) {
          if (y.kind === 'own') editBook((bk) => { bk.own = bk.own.filter((o) => 'o:' + o.id !== y.key); });
          else editBook((bk) => { if (!bk.hide.includes(y.key)) bk.hide = bk.hide.concat(y.key); });
          if (held && held.p.key === y.key) letGoHeld();
          /* a keyboard stays in the list: focus moves to the next meal's button (V11: or the next meal, when
             Delete hid one outside editing) */
          const at = [...lib.querySelectorAll('.c-phide')].indexOf(document.activeElement);
          const atPiece = [...lib.querySelectorAll('.c-piece[role="button"]')].indexOf(document.activeElement);
          drawSide(); snd('slide');
          if (at >= 0) { const xs = lib.querySelectorAll('.c-phide'), t = xs[Math.min(at, xs.length - 1)]; if (t) t.focus({ preventScroll: true }); }
          else if (atPiece >= 0) { const xs = lib.querySelectorAll('.c-piece[role="button"]'), t = xs[Math.min(atPiece, xs.length - 1)]; if (t) t.focus({ preventScroll: true }); }
          mealToast((y.kind === 'own' ? 'Removed ' : 'Hid ') + y.name, true);
        }
        function drawLeave() {
          const bk = book();
          leave.replaceChildren();
          const dRow = h('div', 'c-opts'); dRow.setAttribute('role', 'group'); dRow.setAttribute('aria-label', 'We eat');
          DIETS.forEach((dt) => { const b = Kit.btn('c-opt', dt.name, () => setDiet(dt.id)); b.setAttribute('aria-pressed', String(bk.diet === dt.id)); dRow.appendChild(b); });
          const oRow = h('div', 'c-opts'); oRow.setAttribute('role', 'group'); oRow.setAttribute('aria-label', 'Leave out');
          LEAVE.forEach((L) => { const b = Kit.btn('c-opt', L.name, () => toggleOut(L.id)); b.setAttribute('aria-pressed', String(bk.out.includes(L.id))); oRow.appendChild(b); });
          bk.words.forEach((w) => { const b = Kit.btn('c-opt c-word', w, () => { const was = outCount(); editBook((x) => { x.words = x.words.filter((y) => y !== w); }); drawSide(); leaveSay('No longer leaving out ' + w + '.', was); }, 'x'); b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', 'Stop leaving out ' + w); oRow.appendChild(b); });
          const f = h('form', 'c-leaveform'), inp = h('input', 'c-find'); inp.placeholder = 'Something else, like mushrooms'; inp.setAttribute('aria-label', 'Something else to leave out'); inp.autocomplete = 'off';
          f.appendChild(inp);
          f.addEventListener('submit', (e) => { e.preventDefault(); const w = norm(inp.value); if (!w) return; const was = outCount(); editBook((x) => { if (!x.words.includes(w)) x.words = x.words.concat(w); }); drawSide(); leaveSay('Leaving out ' + w + '.', was); const again = leave.querySelector('input'); if (again) again.focus(); });
          leave.append(h('div', 'c-kick', 'We eat'), dRow, h('div', 'c-kick', 'Leave out'), oRow, f, h('p', 'c-libsay', 'This only hides meals here. Your days stay as they are.'));
        }
        /* V11: what leaving something out did, said: how many meals it hid here, or brought back */
        const outCount = () => { const L = library(); return L.yours.concat(L.ideas).filter((y) => !y.hidden && y.out).length; };
        const leaveSay = (words, was) => {
          const n = Math.abs(outCount() - was), more = outCount() > was;
          mealToast(words + (n ? ' ' + n + (n === 1 ? ' meal' : ' meals') + (more ? ' hidden here.' : ' show again.') : ''), true);
        };
        /* a diet sets its own things to leave out and keeps the rest (gluten, nuts, your own words) */
        function setDiet(id) {
          const dt = DIETS.find((x) => x.id === id), was = outCount();
          editBook((bk) => { bk.diet = id; bk.out = bk.out.filter((o) => !DIET_IDS.includes(o)).concat(dt.out); });
          drawSide(); snd('detent');
          leaveSay(id === 'all' ? 'We eat everything.' : 'We eat ' + dt.name.toLowerCase() + '.', was);
        }
        function toggleOut(id) {
          const was = outCount(), L = LEAVE.find((x) => x.id === id), on = !book().out.includes(id);
          editBook((bk) => {
            bk.out = bk.out.includes(id) ? bk.out.filter((o) => o !== id) : bk.out.concat(id);
            const mine = bk.out.filter((o) => DIET_IDS.includes(o)).sort().join();
            const fits = DIETS.find((dt) => dt.out.slice().sort().join() === mine);
            bk.diet = fits ? fits.id : 'all';
          });
          drawSide(); snd('detent');
          leaveSay((on ? 'Leaving out ' : 'No longer leaving out ') + L.name.toLowerCase() + '.', was);
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
        /* V11: opened from a meal somewhere else (the reset's week, say), that day's card opens; opened for
           the groceries, the list comes into view */
        if (opts.cell) {
          const [cd, ck] = opts.cell;
          if (!showRows.includes(ck)) { showRows = MEAL_KINDS.map(([x]) => x).filter((x) => x === ck || showRows.includes(x)); draw(); }
          setTimeout(() => { const c = board.querySelector('[data-zone="meal"][data-date="' + cd + '"][data-kind="' + ck + '"]'); if (c && !c.dataset.away && mat) { c.scrollIntoView({ block: 'nearest' }); openPop(c, cd, ck); } }, feelOn() ? 420 : 60);
        /* (the store view is the list alone: it opens at its top, where nothing slides under the title) */
        } else if (opts.shop) setTimeout(() => { if (!store) toShop(); const t = shop.querySelector('.c-shop-tog'); if (t) t.focus({ preventScroll: true }); }, feelOn() ? 420 : 60);
        /* V11 goals: opened to plan a prep week (the reset's Meals step), the plan shows at once, and focus goes
           to Use this plan */
        else if (opts.prep) { startPrep(); setTimeout(() => { const g = sugBar.querySelector('.c-keepall'); if (g && mat) g.focus({ preventScroll: true }); }, feelOn() ? 420 : 60); }
        /* V11 (the rituals walk): opened to fill the week (the reset's Meals step), the two ways are asked at once; from
           Settings' Find a setting, Leave out opens */
        else if (opts.fill || opts.weeks) setTimeout(() => { if (mat) fillFocus(); }, feelOn() ? 420 : 60);
        else if (opts.leave) { leaving = true; drawSide(); setTimeout(() => { const f = leave.querySelector('button'); if (f && mat) f.focus({ preventScroll: true }); }, feelOn() ? 420 : 60); }
        /* V11: focus moves into the board when it opens (to its title; a day's card or the list take it
           when the board opens on them) */
        const title = inner.querySelector('.c-mat-head h2');
        if (title) { title.tabIndex = -1; if (!opts.cell && !opts.shop && !(opts.prep && prepView)) setTimeout(() => { if (mat && !mat.contains(document.activeElement)) title.focus({ preventScroll: true }); }, 60); }
        closeWords = () => {
          const now = mealSnap();
          let add = 0, change = 0, off = 0;
          now.forEach((v, key) => { if (!before.has(key)) add++; else if (before.get(key) !== v) change++; });
          before.forEach((v, key) => { if (!now.has(key)) off++; });
          /* V11: the grocery checks and the meal list are saved too, and say so when they're all that changed */
          const shopNow = SR.state.shopping || {};
          let got = 0, ungot = 0;
          new Set(Object.keys(shopBefore).concat(Object.keys(shopNow))).forEach((w) => {
            const a = shopBefore[w] || {}, b = shopNow[w] || {};
            Object.keys(b).forEach((id) => { if (id !== 'extra' && !a[id]) got++; });
            Object.keys(a).forEach((id) => { if (id !== 'extra' && !b[id]) ungot++; });
          });
          const bookNow = JSON.stringify(SR.state.mealbook || null), listChanged = bookNow !== bookBefore;
          const out = [];
          const checks = [got ? got + ' checked off' : '', ungot ? ungot + ' unchecked' : ''].filter(Boolean).join(', ');
          if (add || change || off) {
            const bits = [];
            if (add) bits.push(add + ' added');
            if (change) bits.push(change + ' changed');
            if (off) bits.push(off + ' taken off');
            out.push('Meals saved: ' + bits.join(', ') + '.');
            if (checks) out.push(cap(checks) + ' on the list.');
          } else if (checks) out.push('Groceries saved: ' + checks + '.');
          else if (listChanged) out.push('Your meal list is saved.');
          if (!out.length) return '';
          const g = M.groceryProgress(SR.state, dates);
          if (SR.useDinners() && g.total && (add || change || off || checks)) out.push(cap(SR.grocerySub(dates)) + '.');
          return out.join(' ');
        };
      }, () => {
        /* V11: closing after changes says they're saved, and what changed (Russell, Oct 14: "I need to know
           that it's a success, that it's saved"). The last meal toast stays, with its Undo */
        const words = closeWords ? closeWords() : '';
        closeWords = null;
        if (matGone) matGone(); matGone = null; SR.render();
        if (words) { SR.toast(words, 'good'); snd('clack', 0.7); }
        /* V11: focus goes back to what opened the board, or the same control drawn again (the reset's step
           draws its card anew), and a board opened from the week's plan brings the plan back */
        setTimeout(() => {
          if (mat) return;
          const fk = opener && opener.dataset && opener.dataset.mfk;
          /* (V11 goals: a control that left the step with what it did, Plan a prep week, gives focus to the step's meal board card) */
          const again = opener && opener.isConnected ? opener : fk ? document.querySelector('[data-mfk="' + fk + '"]') || document.querySelector('[data-mfk="ms-go"]') : openerKey ? [...document.querySelectorAll(opener.tagName)].find((x) => [x.tagName, x.className, x.getAttribute('aria-label') || x.textContent].join('|') === openerKey) : null;
          if (opts.back) { opts.back(); return; }
          if (again && again.offsetParent !== null) again.focus({ preventScroll: true });
        }, feelOn() ? 300 : 40);
      });
      return inner;
    }
    let closeWords = null;
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
    /* (V11 goals: a goal's session named like a move, Long runs, is the goal's, so it opens its own panel, not a routine) */
    /* V11 (the Planner walk, 10.3): what counts as a workout, for Plan a routine: a block from Block library's Move group
       (Workout, Run, Walk, Stretch), or a name that says so in whole words (a workout, the gym, yoga, a run on its own);
       never one that only contains a word like it (Brunch with Sam, Errand run, Drive to the train, Swim lessons) */
    const MOVE_KIT = ['workout', 'run', 'walk', 'stretch'];
    const MOVE_ALONE = /^(?:(?:a|an|my|morning|evening|afternoon|lunch|long|easy|short|quick|slow|hill|trail|tempo)\s+)?(?:run|jog|walk|swim|bike|bike ride|ride|stretch|lift|row|hike)s?$/i;
    const MOVE_WORDS = /\b(?:workouts?|gym|yoga|pilates|lifting|weights|strength training|cardio|crossfit|spin class|treadmill)\b/i;
    const isMove = (b) => {
      if (!b || b.dinner || (b.src && (b.src.type === 'goal' || b.src.type === 'idea'))) return false;
      const s = b.src || {}, kid = s.block || (s.type === 'block' ? s.id : null);
      if (kid && MOVE_KIT.includes(kid)) return true;
      const n = String(b.label || b.name || '').trim();
      return MOVE_WORDS.test(n) || MOVE_ALONE.test(n) || b.icon === 'dumbbell' || b.icon === 'runner';
    };
    window.SR_isMove = isMove;
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
      detail = { sel: Object.assign({}, sel), key: b.key, name: b.name, before, dinner: !!b.dinner || sel.type === 'dinner' };
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
            /* V11: the board opens on this night's dinner. It's a raised button, not gold: Done is this mat's
               one gold call. A dinner opened from the week's plan brings the plan back after the board */
            const go = Kit.btn('c-mealgo', '', () => {
              const pb = planBack; planBack = null;
              closeMat(true); detail = null; SR.view.sel = null; SR.render();
              openMealBoard(M.weekStart(sel.date), { cell: [sel.date, 'dinner'], back: pb && Date.now() - pb.at < 10 * 60000 ? () => openPlan(pb.ws, pb.id) : null });
            });
            go.append(SR.icon('pot', 10, '#FFFFFF'), h('span', 'grow', 'Open the meal board'), SR.icon('right', 7, '#AFAFAF'));
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
      /* (V11, the Planner walk, 10.3: a workout's panel opens beside the board like any block's; Plan a routine in it
         opens the mat, planRoutine below) */
      const more = (s) => s.type === 'dinner' || (() => { const b = blockFor(s); return !!b && !!b.dinner; })();
      if (sel && (sel.type === 'block' || sel.type === 'dinner') && !detail && !v.reset && !v.phone && !mat && more(sel)) {
        /* V11 (the rituals walk): a dinner opens the meal board's own card for it (its name, its parts with carts, how,
           who, cook extra), so a dinner looks and works the same from the band, the board, and the meal board; the
           mat beside an empty half is gone. A dinner opened from the week's plan brings the plan back after */
        const b0 = blockFor(sel);
        if (sel.type === 'dinner' || (b0 && b0.dinner)) {
          const pb = planBack; planBack = null;
          SR.view.sel = null; SR.render();
          openMealBoard(M.weekStart(sel.date), { cell: [sel.date, 'dinner'], back: pb && Date.now() - pb.at < 10 * 60000 ? () => openPlan(pb.ws, pb.id) : null });
          return;
        }
        openDetail(sel);
      }
      else if (detail && !sel) doneDetail();
      document.body.classList.toggle('c-detail', !!detail);
    }
    new MutationObserver(() => requestAnimationFrame(checkDetail)).observe(document.getElementById('side'), { attributes: true, attributeFilter: ['hidden'], childList: true });
    /* V11 (the Planner walk, 10.3): a workout's panel offers Plan a routine, which opens its mat; the board's own panel is
       built without it, so it joins the panel each time the panel is drawn, before the rule over Take it off */
    function planRoutine() {
      const v = SR.view, sel = v.sel, inn = document.getElementById('side-in');
      if (!inn || !sel || sel.type !== 'block' || detail || v.reset || v.phone || mat || inn.querySelector('.c-planroutine')) return;
      const b = blockFor(sel);
      if (!b || !isMove(b)) return;
      const has = (routines[b.name] || []).length;
      const go = Kit.btn('small c-planroutine', has ? 'Your routine' : 'Plan a routine', () => openDetail(Object.assign({}, sel)), 'dumbbell');
      go.title = has ? 'The exercises in your ' + b.name + ', in order' : 'Line up the exercises for your ' + b.name;
      const row = h('div', 'actions c-planrow'); row.appendChild(go);
      const rule = inn.querySelector('hr.rule');
      inn.insertBefore(row, rule || null);
    }
    { const inn0 = document.getElementById('side-in'); if (inn0) new MutationObserver(() => planRoutine()).observe(inn0, { childList: true }); }
    function doneDetail() {
      if (!detail) { closeMat(); return; }
      const d = detail; detail = null;
      const changed = JSON.stringify(SR.state) !== d.before;
      SR.view.sel = null;
      closeMat();
      SR.render();
      setTimeout(() => { try { World.squash(d.sel.date, d.key); } catch (e) { /* fine */ } snd('clack', 0.7); }, 700);
      /* V11: the dinner panel says each change as it happens, with its own Undo, so closing it says nothing more */
      if (changed && !d.dinner) SR.toast('Saved changes to ' + d.name + '.', 'good', { label: 'Undo', fn: SR.undo });
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
      /* V11: People lights up time with anyone; Moving lights up the workouts, runs, and walks */
      kim: (b) => (SR.withPeople ? SR.withPeople(b) : b.cat === 'us'),
      move: (b) => !!(SR.isMoving && SR.isMoving(b)),
      /* V11 goals: Goals lights up each goal's sessions */
      goals: (b) => !!(b.src && b.src.type === 'goal'),
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
    /* the panels that fold the steps while they're open: a tap's place panel, and a to-do's own panel */
    function foldFor(sel) { return !!sel && (sel.type === 'place' || sel.type === 'task'); }
    function panelTools() {
      const rack = document.getElementById('rack');
      if (!rack || !SR.view.reset) { peek.hidden = true; document.body.classList.remove('c-panel-off', 'c-panel-fold'); panelTools.fold = false; return; }
      const st = SR.stepsNow()[SR.view.reset.step];
      /* V11: while a tap's place panel (or a to-do's panel) is open beside the week, the steps fold to their
         bar at the top, so the week keeps its width between the edge and the panel; closing it brings them back */
      const sel = SR.view.sel, fold = !sheetMode() && foldFor(sel);
      const off = panelOff || fold;
      document.body.classList.toggle('c-panel-off', off);
      document.body.classList.toggle('c-panel-fold', fold && !panelOff);
      if (off) delete rack.dataset.edge; else rack.dataset.edge = sheetMode() ? 'bottom' : 'left';
      if (fold !== panelTools.fold) { panelTools.fold = fold; requestAnimationFrame(() => SR.layoutInsets()); setTimeout(() => SR.layoutInsets(), 300); }
      peek.hidden = !panelOff || fold;
      peek.replaceChildren(SR.icon('right', 7, Kit.ink), h('b', '', stepName(st.key)), h('span', '', 'Show steps'));
      const top = rack.querySelector('.rack-top');
      if (top && !rack.querySelector('.c-hidepanel')) {
        const hb = Kit.btn('c-hidepanel', '', () => { panelOff = true; sync(); requestAnimationFrame(() => SR.layoutInsets()); }, 'left');
        hb.setAttribute('aria-label', 'Hide the steps'); hb.title = 'Hide the steps, see the whole week';
        rack.appendChild(hb);
      }
    }
    /* the To-dos step, laid out to read at a glance, with one line to what's coming (Look ahead's) under it */
    function shapeTodo(body) {
      const r = SR.view.reset;
      /* V11: the step's own line, said once and plainly (the board's reads "Give the things due soon a time") */
      const ln = document.querySelector('#rack .reset-line');
      if (ln) {
        const pre = /^Picking up where you left off\./.test(ln.textContent) ? 'Picking up where you left off. ' : '';
        const want = pre + (r.catchup ? 'What’s left this week. Drag one onto a day, or let it wait.' : 'Drag one onto a day, or tap it to see its steps.');
        if (ln.textContent !== want) ln.textContent = want;
      }
      if (body.querySelector('.c-sum')) return;
      body.querySelectorAll('.stat').forEach((s) => s.remove());
      /* V11: one window, the week this reset plans. What's due by its last day leads, the rest of the next
         three weeks waits under its own heading, and the count and the hours read the same window. */
      /* the window ends on the week's last day. "This week" means that week everywhere in the reset (the
         rolling list in To-dos is Next 7 days, so the two never collide). Open time counts from now when the
         week hasn't started, so what's due before it has room too. */
      const end = M.addDays(r.week, 6), from = SR.today < r.week ? SR.today : r.week;
      const thisWeek = r.catchup || SR.weekWords(r.week) === 'this week';
      const endWords = M.MONTH_SHORT[M.parts(end).m - 1] + ' ' + M.parts(end).d;
      const soon = M.dueSoon(SR.state, SR.today, 21, SR.nowMin);
      /* V11 (the rituals walk): a to-do made for a date that's over asks done or let go (its tile), never for a time,
         so it isn't counted as work to place */
      const gone = new Set(soon.filter((x) => SR.dateGone && SR.dateGone(x.task)).map((x) => x.task.id));
      const inWeek = soon.filter((x) => x.task.due <= end), toPlace = inWeek.filter((x) => x.status !== 'planned' && !gone.has(x.task.id));
      const later = soon.length - inWeek.length;
      /* everything due in the window, timed or not, so a week whose to-dos all have times says so */
      const dueAll = SR.state.tasks.filter((t) => !t.done && !t.archived && t.due && t.due <= end && !gone.has(t.id)).length;
      const need = toPlace.reduce((a, x) => a + (x.plan.left || 0), 0);
      const cap = M.capacity ? M.capacity(SR.state, from, M.diffDays(from, end) + 1, SR.today, SR.nowMin) : null, room = cap ? cap.room : 0;
      const fmt = (m) => (m < 60 ? M.dur(m) : M.hours(m));
      /* the board lays the tiles out soonest due first, the same order as soon, so tile i is soon[i] */
      const all = [...body.querySelectorAll(':scope > .tile, :scope > .tile-wrap, :scope > [class*="add"]')];
      const adds = all.filter((t) => t.classList.contains('add')), tiles = all.filter((t) => !t.classList.contains('add'));
      const colorOf = (x) => { const t = tiles[soon.indexOf(x)]; return (t && t.style.getPropertyValue('--bg')) || 'rgba(255, 255, 255, 0.6)'; };
      /* the summary: how many to place, then whether the open time covers them, in words and as a bar made
         of the to-dos' own colors against the week's open time */
      const sum = h('div', 'c-sum c-tdsum');
      const head = h('p', 'c-tdsum-h');
      /* V11: counted over the week being planned (SR.weekCounts) and said by SR.dueWords, the words the
         intro, Look ahead, the plan, and the finish use: "4 to-dos due this week need a time" */
      const dw = SR.dueWords(SR.weekCounts(r.week), r.week);
      if (dw.n) head.append(h('b', '', String(dw.n)), document.createTextNode(dw.need.replace(/^\d+/, '')));
      else {
        const ok = h('span', 'c-tdsum-ok'); ok.appendChild(SR.icon('check', 7, '#17301F'));
        /* V11 (the rituals walk): nothing due over a list of what's due later reads as nothing to do, so it says what
           the list is: "Nothing due this week. One due Monday, if you want a head start:" */
        const first = !dueAll && later > 0 ? soon[inWeek.length] : null, fd = first && first.task.due;
        const when = fd ? (M.diffDays(SR.today, fd) < 7 ? M.DAY_LONG[M.weekday(fd)] : M.dateText(fd)) : '';
        /* (when tiles of this week come first, a to-do for a date that's over, the line says where the head start is
           instead of pointing at them) */
        const lead = dw.none + '. ' + numWord(later) + ' due ' + (later === 1 ? when : 'from ' + when);
        const under = 'Due after ' + (thisWeek ? M.DAY_LONG[M.weekday(end)] : endWords);
        /* V11-2 (every dead end gets a next step): with nothing to place, the to-dos that have no day yet are the step's
           next thing, said in the same line ("Nothing due this week. 3 things in your Inbox have no day yet.") */
        const nd = !first ? body.querySelector(':scope > .c-noday') : null, ndw = nd ? '. ' + nd.dataset.words + '.' : '';
        if (nd) nd.classList.add('said');
        head.append(ok, document.createTextNode(dueAll ? dw.all + ndw : first ? (inWeek.length ? lead + (later === 1 ? ' waits' : ' wait') + ' under ' + under + ', if you want a head start.' : lead + ', if you want a head start:') : dw.none + ndw));
      }
      sum.appendChild(head);
      if (toPlace.length && need) {
        /* V11 goals: a goal's own sessions hold time a to-do can take (Model.capacity's goals; to-dos come first
           and the goal plans around them), so the line counts it apart, and says so when it's needed */
        const held = (cap && cap.goals) || 0;
        const say = need <= room ? 'About ' + fmt(need) + ' of work and ' + fmt(room) + ' open. Room for all of it.'
          : need <= room + held ? 'About ' + fmt(need) + ' of work, ' + (room > 0 ? fmt(room) + ' open, and ' : 'and ') + fmt(held) + ' your goals hold. To-dos come first; the goals plan around them.'
          : room + held > 0 ? 'About ' + fmt(need) + ' of work and ' + fmt(room + held) + ' open, counting your goals’ time. Some can wait.'
          : 'About ' + fmt(need) + ' of work and no open time left. Some can wait.';
        const bar = h('div', 'c-tdbar' + (need > room ? ' over' : ''));
        bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', say);
        toPlace.forEach((x) => { const seg = h('i'); seg.style.flexGrow = String(x.plan.left || 0); seg.style.background = colorOf(x); bar.appendChild(seg); });
        if (room > need) { const open = h('span', 'c-tdbar-open'); open.style.flexGrow = String(room - need); bar.appendChild(open); }
        else if (room > 0) { const mk = h('span', 'c-tdbar-room'); mk.style.left = (room / need * 100) + '%'; bar.appendChild(mk); }
        const words = h('p', 'c-tdsum-say', say); words.setAttribute('aria-hidden', 'true');
        sum.append(bar, words);
      }
      if (dw.late) sum.appendChild(h('p', 'c-tdsum-say after', dw.late + '.'));
      if (gone.size) sum.appendChild(h('p', 'c-tdsum-say after', (gone.size === 1 ? '1 to-do is' : gone.size + ' to-dos are') + ' for a date that’s over: done, or let it go.'));
      body.prepend(sum);
      /* the week's tiles, then New to-do with them (a to-do added here is most likely for this week), then
         what's due later under its own heading */
      /* V11-2 (a day that went by, said calmly): what was due before today waits in its own group under the week's,
         named for when it's from (From last week), each with Give it a new day (todoStepTile) */
      const pastOf = (x) => !!(SR.pastDue && SR.pastDue(x.task)) && !gone.has(x.task.id);
      const grid = h('div', 'c-tilegrid');
      inWeek.forEach((x, i) => { if (!pastOf(x) && tiles[i]) grid.appendChild(tiles[i]); });
      adds.forEach((t) => { if (!t.querySelector('canvas')) t.prepend(SR.icon('plus', 8, '#CDCDCD')); grid.appendChild(t); });
      if (grid.children.length) sum.after(grid);
      let last = grid.children.length ? grid : sum;
      const back = inWeek.filter(pastOf);
      if (back.length && SR.fromGroups) SR.fromGroups(back, (x) => x.task.due).forEach((g) => {
        const gh = h('div', 'c-sumlater c-tdfrom', g.name), gg = h('div', 'c-tilegrid');
        g.rows.forEach((x) => { const t = tiles[soon.indexOf(x)]; if (t) gg.appendChild(t); });
        last.after(gh, gg); last = gg;
      });
      if (later > 0 && tiles.length > inWeek.length) {
        const grid2 = h('div', 'c-tilegrid');
        tiles.slice(inWeek.length).forEach((t) => grid2.appendChild(t));
        const lh = h('div', 'c-sumlater', 'Due after ' + (thisWeek ? M.DAY_LONG[M.weekday(end)] : endWords));
        last.after(lh, grid2); last = grid2;
      }
      /* V11-2: the to-dos with no day yet come right under the line that names them, or last when the line points
         at what's due later */
      const noDay = body.querySelector(':scope > .c-noday');
      if (noDay) { if (noDay.classList.contains('said')) sum.after(noDay); else last.after(noDay); }
      /* V11 (the rituals walk): what this reset gave a time (Spread it out, Give it a time) stays in view under Has a
         time, with its first time and how far it runs, so it never vanishes: the to-dos the finish counts as
         given a time (placed in the week since the reset began, its first look) */
      const was = new Set((r.snap && r.snap.todos) || []), given = [];
      M.placements(SR.state).forEach((list, id) => {
        if (was.has(id)) return;
        const inWk = list.filter((x) => x.date >= r.week && x.date <= end).sort((a, b) => (a.date === b.date ? a.add.start - b.add.start : a.date < b.date ? -1 : 1));
        const t = SR.taskById(id);
        if (!inWk.length || !t || t.done || t.archived) return;
        given.push({ t, first: inWk[0], last: inWk[inWk.length - 1], n: inWk.length });
      });
      if (given.length) {
        const box = h('section', 'c-tdhas');
        box.appendChild(h('h3', 'c-tdhas-h', 'Has a time'));
        given.sort((a, b) => (a.first.date === b.first.date ? a.first.add.start - b.first.add.start : a.first.date < b.first.date ? -1 : 1)).forEach((g) => {
          const dd = (d) => M.DAY_SHORT[M.weekday(d)];
          const line = dd(g.first.date) + ' ' + M.clock(g.first.add.start) + (g.n > 1 ? ', ' + g.n + ' steps through ' + dd(g.last.date) : '');
          const row = h('button', 'c-tdhas-row'); row.type = 'button';
          const w = h('span', 'c-tdhas-w'); w.append(h('b', '', g.t.name), h('small', '', line));
          row.append(SR.icon('check', 7, '#8FD3B1'), w, SR.icon('right', 7, '#AFAFAF'));
          row.setAttribute('aria-label', g.t.name + ', ' + line + '. Open the to-do');
          row.addEventListener('click', () => { SR.Snd.init(); SR.openSel({ type: 'task', id: g.t.id }); });
          box.appendChild(row);
        });
        body.appendChild(box);
      }
      /* V11: what's coming is Look ahead's, over Look ahead's five weeks: one line back to that step, the
         same count it shows, never a second list with its own horizon. A run without Look ahead (a catch up)
         leaves it out. */
      const aheadAt = SR.stepsNow().findIndex((s) => s.key === 'ahead');
      if (aheadAt >= 0 && M.lookAhead) {
        const af = r.week > SR.today ? r.week : SR.today, al = M.addDays(r.week, 34);
        const dates = M.lookAhead(SR.state, af, Math.max(1, M.diffDays(af, al) + 1), SR.today, 400, []).filter((x) => !x.far).length;
        if (dates) {
          const go = h('button', 'c-tdahead'); go.type = 'button'; go.dataset.mfk = 'td-ahead';
          const words = (dates === 1 ? '1 date' : dates + ' dates') + ' in the next 5 weeks';
          go.append(SR.icon('calendar', 9, '#FFFFFF'), h('b', '', 'Coming up'), h('span', 'grow', words), SR.icon('right', 7, '#AFAFAF'));
          go.setAttribute('aria-label', 'Coming up: ' + words + '. Go to Look ahead');
          go.title = 'See them in Look ahead';
          go.addEventListener('click', () => { SR.Snd.init(); SR.goStep(aheadAt); });
          body.appendChild(go);
        }
      }
    }
    /* Your time offers your own blocks; work and meetings have their own time */
    function shapeYours(body) {
      /* V11: the step builds only your own blocks now (yoursBody in app.js), so there's nothing to hide */
      if (body.querySelector('.yt-sum')) return;
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
      /* V11: and in what a screen reader reads off a control: its name, its title, the hint in a box */
      root.querySelectorAll('[aria-label], [title], [placeholder]').forEach((x) => ['aria-label', 'title', 'placeholder'].forEach((a) => {
        const v = x.getAttribute(a);
        if (!v || !/\b[Tt]o dos?\b/.test(v)) return;
        let t = v;
        WORDS.forEach(([re, to]) => { t = t.replace(re, to); });
        if (t !== v) x.setAttribute(a, t);
      }));
    }
    const toasts = document.getElementById('toasts');
    if (toasts) new MutationObserver(() => tidyWords(toasts)).observe(toasts, { childList: true, subtree: true, characterData: true });
    const sidePanel = document.getElementById('side');
    if (sidePanel) new MutationObserver(() => tidyWords(sidePanel)).observe(sidePanel, { childList: true, subtree: true });
    /* V11: a panel opened or closed without a full redraw (a tap's place panel) folds the reset's steps or
       brings them back (panelTools) */
    if (sidePanel) new MutationObserver(() => {
      const v = SR.view;
      if (!(v && v.reset && (!sheetMode() && foldFor(v.sel)) !== !!panelTools.fold)) return;
      const was = panelTools.fold;
      panelTools();
      /* the panel gave focus back to the tile it came from while the steps were still folded out of sight,
         so it landed nowhere; now they're back, the tile takes it */
      /* (redrawn after a placement: the tile of the same name in its place) */
      const nmOf = (x) => { const n = x && x.querySelector && x.querySelector('.nm'); return n ? n.textContent.trim() : ''; };
      const tilesNow = [...document.querySelectorAll('#rack .tile')];
      const same = rackFocus && !rackFocus.isConnected && nmOf(rackFocus) ? tilesNow.find((x) => nmOf(x) === nmOf(rackFocus)) : null;
      /* V11: a to-do given a time leaves the list, so its tile is gone: the tile now in its place takes focus,
         or the step's first control when none is left, never the page */
      const near = !same && rackFocus && !rackFocus.isConnected ? tilesNow[Math.min(Math.max(0, rackIdx), tilesNow.length - 1)] || document.querySelector('#rack .rack-body button:not([disabled]), #rack .rack-top button:not([disabled])') : null;
      const back = rackFocus && rackFocus.isConnected ? rackFocus : same || near || null;
      const a = document.activeElement;
      if (was && !panelTools.fold && back && (!a || a === document.body || sidePanel.contains(a))) back.focus({ preventScroll: true });
    }).observe(sidePanel, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
    /* the last thing focused in the reset's panel, for the way back from a place panel */
    let rackFocus = null, rackIdx = 0;
    document.addEventListener('focusin', (e) => {
      const r = document.getElementById('rack');
      if (!r || !r.contains(e.target)) return;
      rackFocus = e.target;
      /* (and where its tile stood, for when the tile leaves) */
      const t = e.target.closest && e.target.closest('.tile');
      if (t) rackIdx = [...r.querySelectorAll('.tile')].indexOf(t);
    });
    ['drawer', 'quick', 'kinds-row'].forEach((id) => { const x = document.getElementById(id); if (x) new MutationObserver(() => tidyWords(x)).observe(x, { childList: true, subtree: true }); });
    /* V11: Look ahead lays itself out (aheadBody in app.js): the weeks, what to get ready, holidays, adding
       a date, and one line about what's due. Pointing at a date rings its day on the month beside it. */
    function shapeAhead(body) {
      const wrap = body.querySelector('.c-ah');
      if (!wrap || wrap.dataset.shaped) return;
      wrap.dataset.shaped = '1';
      const ring = (card) => {
        document.querySelectorAll('.c-ah-ring').forEach((x) => x.remove());
        if (!card || !card.dataset.date || SR.view.zoom !== 'month' || !World.debug) return;
        const m = World.debug.month, tile = m && m.cards && m.cards.find((c) => c.userData.date === card.dataset.date);
        const b = tile && screenBox(tile);
        if (!b || b.x1 < 0 || b.x0 > window.innerWidth) return;
        const r = h('div', 'c-ah-ring' + (SR.view.calm ? ' still' : ''));
        Object.assign(r.style, { left: (b.x0 - 4) + 'px', top: (b.y0 - 4) + 'px', width: (b.x1 - b.x0 + 8) + 'px', height: (b.y1 - b.y0 + 8) + 'px' });
        document.body.appendChild(r);
      };
      wrap.addEventListener('pointerover', (e) => { const c = e.target.closest('.c-ah-card'); if (c !== wrap._over) { wrap._over = c; ring(c); } });
      wrap.addEventListener('pointerleave', () => { wrap._over = null; ring(null); });
      wrap.addEventListener('focusin', (e) => ring(e.target.closest('.c-ah-card')));
      wrap.addEventListener('focusout', () => ring(null));
    }
    /* the ring never outlives Look ahead */
    Kit.renders.push(() => { if (!document.querySelector('.c-ah')) document.querySelectorAll('.c-ah-ring').forEach((x) => x.remove()); });
    /* == V11: the reset's Meals step: the week's meals at a glance, the meal board one tap away ==
       The step is the week as the meal board has it, small: days down, the meals you plan across, each one
       a tap from its own card on the board. The groceries are one line that opens the board at its list.
       Pantry and the meal tabs left the step: the meal board does both (recipes are in its library, and a
       meal typed with its parts puts them on the list). app.js asks for this (window.SR_mealStep), so any
       redraw of the step builds it again; before, a trip into a pantry stack and Back lost the card. */
    function shapeMeals() { /* V11: the step builds itself now (window.SR_mealStep) */ }
    let msPast = false;
    window.SR_mealStep = (body, dates, ws) => {
      /* V11 (the rituals walk): a catch up once tonight's dinner is over plans from tomorrow (SR.restFrom), so tonight
         is with the days already over */
      const r0 = SR.view.reset, from = r0 && r0.catchup && SR.restFrom ? SR.restFrom() : SR.today;
      const rows = mealRows(), cnt = mealCount(from > SR.today ? dates.filter((d) => d >= from) : dates, rows);
      /* V11 goals: leftovers are meals planned (the engine's count, and mealCount's), and the line says how many
         of them there are, over the same days */
      const soon = dates.filter((d) => d >= from), lo = (soon.length ? soon : dates).filter((d) => !SR.day(d).trip).reduce((a, d) => a + rows.filter((k) => { const m = mealAt(d, k); return m && m.how === 'leftovers'; }).length, 0);
      /* the nights still open, by name: "Fri and Sat dinners open" */
      const openN = rows.includes('dinner') ? soon.filter((d) => !SR.day(d).trip && SR.day(d).blocks.some((b) => b.dinner) && !mealAt(d, 'dinner')) : [];
      const openWords = openN.length ? (openN.length > 3 ? openN.length + ' dinners' : andWords(openN.map((d) => M.DAY_SHORT[M.weekday(d)])) + (openN.length === 1 ? ' dinner' : ' dinners')) + ' open' : '';
      const planned = cnt.n ? cnt.n + (cnt.n === 1 ? ' meal' : ' meals') + ' planned' + (cnt.span ? ', ' + cnt.span : '') + (lo ? ', ' + lo + ' from leftovers' : '') : '';
      /* V11: a big raised card, not gold: Next is the step's one gold call. Midweek the count is from today on */
      const go = h('button', 'c-mealgo c-ms-go'); go.type = 'button'; go.dataset.mfk = 'ms-go';
      const words = h('span', 'grow');
      /* V11 (the rituals walk): on a sheet (a phone, a folded phone) there's one way in, and the week is said in words
         in place of a grid too small to use: the meals planned, the nights open, and the groceries */
      const sheet = sheetMode();
      /* (with nothing planned, the line under the card says so, so the card doesn't say it too) */
      if (sheet) words.append(h('b', '', 'Plan meals'), h('small', '', [planned || (openWords ? '' : 'No meals yet'), openWords, SR.useDinners() ? SR.grocerySub(dates) : ''].filter(Boolean).join(' · ')));
      /* V11: how many are planned, never out of a total that guesses how many meals a day you eat */
      else words.append(h('b', '', 'Open the meal board'), h('small', '', planned || 'Drag meals onto the week'));
      go.append(SR.icon('pot', 10, '#FFFFFF'), words, SR.icon('right', 7, '#AFAFAF'));
      go.addEventListener('click', () => { SR.Snd.init(); openMealBoard(ws); });
      body.appendChild(go);
      /* V11 (the rituals walk): a week with nothing planned leads with the two ways to fill it */
      if (!cnt.n) body.appendChild(h('p', 'c-ms-none', 'No meals yet. Fill the week in one go, or pick night by night on the meal board.'));
      if (sheet) return;
      /* the week, small: tap a meal (or an open one) to open it on the board */
      const sec = h('section', 'c-ms');
      const head = h('div', 'c-ms-head');
      head.appendChild(h('h3', 'rsec-h', weekTitle(ws, 'meals')));
      /* V11 (the rituals walk): one way to fill the week (cook most nights, or cook twice and eat leftovers), and the
         weeks you planned before, each a tap from the meal board, where it shows before anything changes */
      const msActs = h('div', 'c-ms-acts');
      if (openN.length || soon.some((d) => rows.some((k) => k !== 'dinner' && !mealAt(d, k)))) { const fb = Kit.btn('c-again c-ms-again c-ms-fill', 'Fill the week', () => { SR.Snd.init(); openMealBoard(ws, { fill: true }); }, 'star'); fb.dataset.mfk = 'ms-fill'; msActs.appendChild(fb); }
      if (earlierWeeks(dates, rows).length) { const eb = Kit.btn('c-again c-ms-again', 'Same as an earlier week', () => { SR.Snd.init(); openMealBoard(ws, { weeks: true }); }, 'redo'); eb.dataset.mfk = 'ms-weeks'; msActs.appendChild(eb); }
      if (msActs.children.length) head.appendChild(msActs);
      const grid = h('div', 'c-ms-grid'); grid.style.setProperty('--rows', rows.length);
      grid.appendChild(h('span'));
      rows.forEach((k) => grid.appendChild(h('span', 'c-ms-k', kindName(k))));
      const meName = SR.who() && SR.who().name;
      /* the days already over fold into one line, so the step opens on what's left (as the board does on a phone) */
      const past = dates.filter((d) => d < from);
      if (past.length) {
        const fold = h('button', 'c-ms-fold'); fold.type = 'button'; fold.setAttribute('aria-expanded', String(msPast)); fold.dataset.mfk = 'ms-fold';
        const span = M.DAY_SHORT[M.weekday(past[0])] + (past.length > 1 ? ' to ' + M.DAY_SHORT[M.weekday(past[past.length - 1])] : '');
        fold.append(h('span', '', (msPast ? 'Hide ' : 'Earlier this week: ') + span), SR.icon(msPast ? 'up' : 'down', 7, '#AFAFAF'));
        fold.addEventListener('click', () => { msPast = !msPast; SR.render(); const f = document.querySelector('[data-mfk="ms-fold"]'); if (f) f.focus({ preventScroll: true }); });
        grid.appendChild(fold);
      }
      dates.filter((d) => msPast || d >= from).forEach((d) => {
        const day = h('span', 'c-ms-day' + (d === SR.today ? ' today' : '') + (d < from ? ' past' : ''));
        day.append(h('b', '', M.DAY_SHORT[M.weekday(d)]), h('span', '', String(M.parts(d).d)));
        grid.appendChild(day);
        if (SR.day(d).trip) { const a = h('span', 'c-ms-away', 'Away'); a.style.gridColumn = 'span ' + rows.length; grid.appendChild(a); return; }
        rows.forEach((k) => {
          const m = mealAt(d, k), easy = m && notCooking(m.how);
          const b = h('button', 'c-ms-cell' + (m ? ' on' : '') + (d < from ? ' past' : '')); b.type = 'button'; b.dataset.mfk = 'ms-' + d + '-' + k;
          /* V11 goals: leftovers say the dish they are, and Leftovers under it, at any size */
          const left = m && m.how === 'leftovers', nm = m ? (left ? dishOf(d, k, m) : mealLabel(m)) : '';
          if (m) {
            b.style.setProperty('--b', MEAL_COLOR[easy ? 'easy' : k]); b.style.setProperty('--i', MEAL_INK[easy ? 'easy' : k]);
            b.appendChild(h('b', '', nm));
            /* V11: with one person who can cook, no line says who */
            const who = easy || !m.cook || m.cook === 'home' || cookList(m.cook).length < 2 ? '' : cookNamed(m.cook, meName || 'You');
            if (left && nm !== 'Leftovers') b.appendChild(h('small', '', 'Leftovers'));
            else if (who && rows.length < 3) b.appendChild(h('small', '', who === 'You' ? 'You cook' : who + ' cooks'));
          } else if (d >= from) b.appendChild(SR.icon('plus', 7, '#AFAFAF'));
          b.setAttribute('aria-label', mealDayWords(d, k) + ': ' + (m ? (left && nm !== 'Leftovers' ? 'leftovers of ' + nm : mealLabel(m)) : 'nothing yet') + '. Open on the meal board');
          b.title = m ? (left && nm !== 'Leftovers' ? 'Leftovers: ' + nm : mealLabel(m)) : 'Add ' + mealDayWords(d, k);
          b.addEventListener('click', () => { SR.Snd.init(); openMealBoard(ws, { cell: [d, k] }); });
          grid.appendChild(b);
        });
      });
      sec.append(head, grid);
      body.appendChild(sec);
      /* the groceries, on the board: one line, never a second place to keep them */
      const shop = h('button', 'c-ms-shop'); shop.type = 'button'; shop.dataset.mfk = 'ms-shop';
      shop.append(SR.icon('cart', 9, '#FFFFFF'), h('b', '', 'Groceries'), h('span', 'grow', SR.grocerySub(dates)), SR.icon('right', 7, '#AFAFAF'));
      shop.setAttribute('aria-label', 'Groceries, ' + SR.grocerySub(dates) + '. Open them on the meal board');
      shop.addEventListener('click', () => { SR.Snd.init(); openMealBoard(ws, { shop: true }); });
      body.appendChild(shop);
    };
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
      /* V11 (the Today walk): from Now, To-dos opens the list at the next 7 days, rows you can check and give a time in
         place; Lay out is one tap away inside it. Twelve small tiles on the bench were the opposite of one thing */
      if (SR.inToday()) { if (dock && dock.classList.contains('c-tdock')) { closeDock(); return; } openTodos(); return; }
      layOut('todo', 'soon');
    }
    function drawStackBar() {
      const b = SR.view.bench, on = !!(b && b.tab === 'todo') && !SR.view.reset && !mat && !dock;
      stackBar.hidden = !on;
      if (!on) return;
      const level = b.level || 'soon';
      /* V11: the first stack is what the To-dos count counts, said the same way */
      const stacks = [['soon', 'Next 7 days', dueWeek().length]].concat((SR.state.groups || []).map((g) => [g.id, g.name, SR.state.tasks.filter((t) => !t.done && !t.archived && t.group === g.id).length]));
      const kids = stacks.map(([id, name, n]) => {
        const x = Kit.btn('c-stack' + (id === level ? ' on' : ''), name, () => { layOut('todo', id); });
        if (n) x.appendChild(h('span', 'c-sn', capN(n)));
        x.setAttribute('aria-pressed', String(id === level));
        return x;
      });
      /* V11 (the Planner walk, 9.2): a stack with nothing open says so here, and offers to add one to it, instead of
         laying out an empty bench */
      const picked = stacks.find((x) => x[0] === level), g0 = level !== 'soon' && (SR.state.groups || []).find((g) => g.id === level);
      if (picked && !picked[2]) {
        const say = h('span', 'c-stacksay', g0 ? g0.name + ' has nothing open' : 'Nothing due in the next 3 weeks');
        say.setAttribute('role', 'status');
        kids.push(say);
      }
      if (picked && !picked[2] && g0) kids.push(Kit.btn('c-stack c-stacknew', 'Add a to-do to ' + g0.name, () => SR.openSel({ type: 'newTask', group: g0.id }), 'plus'));
      else kids.push(Kit.btn('c-stack c-stacknew', 'New to-do', () => Kit.add(), 'plus'));
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
      /* (V11, the Planner walk, 3.3: a kind named for a weekday, "Thursday on my own", isn't offered on a Saturday) */
      const wd = M.DAY_LONG[M.weekday(SR.view.focus)], other = (p) => { const m = /\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i.exec(p.name || ''); return !!m && m[1].toLowerCase() !== wd.toLowerCase(); };
      return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => all.find((p) => p.id === id)).filter((p) => p && !other(p)).slice(0, 2).map((p) => p.name);
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
      const v = SR.view, names = usedKinds().filter((n) => cur !== n && !cur.startsWith(n + ' ')), on = !SR.inToday() && v.zoom === 'day' && !v.reset && !v.kindSpread && names.length > 0;
      kindChips.hidden = !on;
      if (!on) return;
      kindChips.replaceChildren(...names.map((n) => {
        const c = Kit.btn('c-kchip' + (cur.startsWith(n) ? ' on' : ''), n, () => applyKind(n));
        c.setAttribute('aria-pressed', String(cur.startsWith(n)));
        return c;
      }));
    }

    /* == V11 shell: the finish (Russell, Oct 14: "When we click See your week, I do like this ... I want this
       to be designed way better ... there are a lot of buttons"). The reset's last step is the week's plan at
       a glance, laid out like This week's plan: time kept for you, dinners, to-dos, people, and what's coming.
       A row opens what it's about. Done is the one strong button; Share makes a picture of this same plan
       (not the week's colored bars) and hands it to the share sheet, for anyone. == */
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    /* V11: time to yourself, less the workouts, runs, and walks that Moving lists on its own card, so a move
       is never counted twice (the Your time step leaves them out the same way). The plan and the finish both
       use it */
    function yoursWeek(ws) {
      const all = SR.weekCounts(ws).yours || 0;
      const mv = SR.useMove && SR.useMove() && SR.weekMoves ? SR.weekMoves(ws).filter((x) => x.cat === 'yours') : [];
      return Math.max(0, all - mv.reduce((a, x) => a + x.dur, 0));
    }
    /* the week's plan in one object, so the panel and the picture say the same thing */
    function finishData(ws) {
      const st = SR.state, dates = M.range(ws, 7), last = dates[6];
      const me = (SR.who() && SR.who().name) || '', pt = partnerName();
      const c = SR.weekCounts(ws), noCook = c.noCook || [];
      const freeAt = (d) => SR.day(d).blocks.filter((b) => b.free && b.start >= 16 * 60);
      const evenings = dates.filter((d) => freeAt(d).length);
      const evFrom = evenings.length ? Math.min(...evenings.map((d) => freeAt(d)[0].start)) : 0;
      /* V11: who cooks is said one way, the plan's (cookTag): Al and An where two names share a letter,
         Anyone for anyone at home, and no tag when you're the only one who cooks */
      /* V11: the week's breakfasts and lunches planned on the meal board, counted beside the dinners */
      const other = { breakfast: 0, lunch: 0 };
      if (SR.useDinners()) dates.forEach((d) => ['breakfast', 'lunch'].forEach((k) => { const m = mealAt(d, k); if (m && m.how !== 'skip') other[k]++; }));
      /* (V11, the rituals walk: tonight's dinner whose time is over, with nothing on it, is gone, as an earlier night is) */
      const gone = (d) => d < SR.today || (d === SR.today && SR.day(d).blocks.some((b) => b.dinner && b.start + b.dur <= SR.nowMin));
      const dinners = !SR.useDinners() ? null : dates.filter((d) => SR.day(d).blocks.some((b) => b.dinner)).map((d) => {
        const x = st.dinners[d], set = !!(x && (x.name || x.cook));
        let who = cookTag(x);
        /* V11: a night still to decide is Open, as in the plan and the picture */
        const name = x && x.name ? x.name : who && who.cls === 'word' ? who.plain : set ? 'Dinner' : gone(d) ? 'Not planned' : 'Open';
        if ((x && !x.name && who && who.cls === 'word') || (who && who.quiet)) who = null;
        /* V11 (the rituals walk): a dish with nobody cooking it yet has no pill, and the finish asks who (ask) */
        return { d, day: M.DAY_SHORT[M.weekday(d)], name, who, state: set ? 'set' : gone(d) ? 'past' : 'open', ask: noCook.includes(d) };
      }).filter((x) => x.state !== 'past'); /* a night already gone with nothing on it isn't part of the plan */
      /* V11: with a time means what Model.taskPlan says it means: planned (every step still to do has a time
         that hasn't gone by) or done, and not after its due day. What's due and still needs a time, and what's
         timed after it's due, are counted on their own (the same to-dos the To-dos step and the plan count),
         so no to-do shows twice and none is called planned when its time went by. */
      const pl = M.placements(st), timed = [];
      const asked = new Set(c.unplaced.concat(c.lateTimes).map((x) => x.task.id));
      pl.forEach((list, id) => {
        const t = SR.taskById(id);
        if (!t || t.archived || asked.has(id)) return;
        const inWeek = list.filter((x) => x.date >= ws && x.date <= last).sort((a, b) => (a.date === b.date ? a.add.start - b.add.start : a.date < b.date ? -1 : 1));
        if (!inWeek.length) return;
        const plan = M.taskPlan(t, list, SR.today, SR.nowMin);
        if ((plan.status !== 'planned' && plan.status !== 'done') || plan.after) return;
        const p = plan.next && plan.next.date >= ws && plan.next.date <= last ? plan.next : inWeek[0];
        timed.push({ id, name: t.name, done: plan.status === 'done', d: p.date, when: M.DAY_SHORT[M.weekday(p.date)] + ' ' + M.clock(p.add.start), sort: p.date + String(p.add.start).padStart(5, '0') });
      });
      timed.sort((a, b) => (a.sort < b.sort ? -1 : 1));
      /* V11: time with people is everything already with someone this week (an evening together, a regular
         block, an idea placed), the same rows the People step and the plan show */
      const together = !SR.useTogether() ? [] : SR.peopleWeek ? SR.peopleWeek(ws).map((r) => ({ name: r.name, when: r.when })) : [];
      /* V11: Moving, when it's on: each kind of move once, with its days */
      const moves = [];
      if (SR.useMove && SR.useMove() && SR.weekMoves) {
        const by = new Map();
        SR.weekMoves(ws).forEach((x) => { const i = dates.indexOf(x.date), r = by.get(x.name) || { name: x.name, days: [] }; if (i >= 0 && !r.days.includes(i)) r.days.push(i); by.set(x.name, r); });
        by.forEach((r) => moves.push({ name: r.name, when: runWords(r.days.sort((a, b) => a - b), dates, 'Every day') }));
      }
      const coming = M.upcoming(st, M.addDays(ws, 7), 28).filter((x) => x.kind !== 'due').slice(0, 4)
        .map((x) => ({ when: x.kind === 'trip' ? M.spanText(x.start0, x.end) : M.dateText(x.date, 'day'), name: x.name }));
      const g = SR.useDinners() && M.groceryProgress ? M.groceryProgress(st, dates) : null;
      /* time to yourself beyond the free evenings, so the free evenings aren't counted twice */
      const freeMin = dates.reduce((a, d) => a + SR.day(d).blocks.filter((b) => b.free && b.cat === 'yours').reduce((s, b) => s + b.dur, 0), 0);
      const open = M.totals(dates.map((d) => SR.day(d))).free || 0;
      const yours = yoursWeek(ws);
      /* V11 goals: each goal with sessions this week, its hours and its days */
      const goals = (SR.goalWeek ? SR.goalWeek(ws) : []).filter((x) => x.min).map((x) => ({ id: x.id, name: x.name, when: x.line + ' · ' + runWords(x.days, dates, 'Every day') }));
      return { ws, last, me, pt, yours, more: Math.max(0, yours - freeMin), evenings: evenings.map((d) => dates.indexOf(d)), dates, evFrom, dinners, other: otherMeals(other, !!(dinners && dinners.length)), timed, need: c.unplaced.length, late: c.lateTimes.length, together, moves, goals, coming, openMin: open, grocery: g && g.total ? SR.grocerySub(dates) : '', open: !!(c.unplaced.length || c.lateTimes.length || (SR.useDinners() && c.openNights.length)) };
    }
    /* V11: the breakfasts and lunches in words, after the dinners ("And 3 breakfasts and 2 lunches.") or on
       their own ("3 breakfasts and 2 lunches planned."); '' when there are none */
    function otherMeals(o, after) {
      const bits = [];
      if (o.breakfast) bits.push(plural(o.breakfast, 'breakfast', 'breakfasts'));
      if (o.lunch) bits.push(plural(o.lunch, 'lunch', 'lunches'));
      if (!bits.length) return '';
      return after ? 'And ' + bits.join(' and ') + '.' : bits.join(' and ') + ' planned.';
    }
    /* days of the week said the short way: Every evening, Mon to Fri, or Mon, Wed */
    function runWords(idx, dates, every) {
      if (idx.length === 7) return every;
      const nm = (i) => M.DAY_SHORT[M.weekday(dates[i])], out = [];
      let k = 0;
      while (k < idx.length) {
        let e = k;
        while (e + 1 < idx.length && idx[e + 1] === idx[e] + 1) e++;
        if (e - k >= 2) out.push(nm(idx[k]) + ' to ' + nm(idx[e])); else for (let j = k; j <= e; j++) out.push(nm(idx[j]));
        k = e + 1;
      }
      return out.join(', ');
    }
    /* what the green card says: free evenings and time to yourself, good news only */
    const keptWords = (f) => (f.evenings.length
      ? { big: plural(f.evenings.length, 'free evening', 'free evenings'), lines: [runWords(f.evenings, f.dates, 'Every evening') + ', from ' + M.clock(f.evFrom) + '.'].concat(f.more >= 30 ? ['And ' + M.hours(f.more) + ' more to yourself.'] : []) }
      : f.yours > 0 ? { big: M.hours(f.yours), lines: ['to yourself ' + SR.weekWords(f.ws)] } : null);
    /* nothing planned yet and nothing due: the finish says what's open instead of showing empty cards */
    const finEmpty = (f) => !(f.dinners && f.dinners.length) && !f.other && !keptWords(f) && !f.timed.length && !f.need && !f.late && !f.together.length && !f.moves.length && !(f.goals || []).length && !f.coming.length;
    const stepAt = (key) => SR.stepsNow().findIndex((s) => s.key === key);
    let finishWas = '';
    /* V11: the finish takes two columns only where its panel is 600 wide (shell.css, the same width) */
    const FIN_WIDE = '(min-width: 1400px)';
    const finTwo = () => !SR.view.phone && window.matchMedia(FIN_WIDE).matches;
    try { window.matchMedia(FIN_WIDE).addEventListener('change', () => { const r = SR.view.reset; if (r && SR.stepsNow()[r.step].key === 'done') SR.render(); }); } catch (e) { /* an older browser keeps one column until the next redraw */ }
    window.SR_finishBody = (body, ws) => {
      const f = finishData(ws);
      /* two columns, and the wider panel (shell.css, body.c-finwide), only when there are cards enough to fill them */
      const cardsN = ((f.dinners && f.dinners.length) || f.other ? 1 : 0) + (keptWords(f) ? 1 : 0) + 1 + (f.together.length ? 1 : 0) + (f.moves.length ? 1 : 0) + ((f.goals || []).length ? 1 : 0) + (f.coming.length ? 1 : 0);
      const twoCol = finTwo() && !finEmpty(f) && cardsN >= 3;
      document.body.classList.toggle('c-finwide', twoCol);
      const wrap = h('div', 'c-fin' + (twoCol ? ' two' : ''));
      const cols = [h('div', 'c-fin-col'), h('div', 'c-fin-col')], tall = [0, 0], one = [];
      /* two columns: each card goes in the shorter one, so the reading order follows each column down.
         One column: the cards go in their own order, good news first, the same for the eye and the keyboard. */
      const put = (card, px, order) => { if (!twoCol) { one.push([order, card]); return; } const i = tall[0] <= tall[1] ? 0 : 1; cols[i].appendChild(card); tall[i] += px + 12; };
      /* a name with its time under it */
      const two = (a, b) => { const s = h('span', 'c-fin-two'); s.append(h('span', 'c-fin-name', a), h('small', 'c-fin-sub', b)); return s; };
      const card = (cls, title, aside) => {
        const s = h('section', 'c-fin-card' + (cls ? ' ' + cls : ''));
        const hd = h('div', 'c-fin-h'); hd.appendChild(h('h3', '', title));
        if (aside) hd.appendChild(h('span', 'c-fin-aside', aside));
        s.appendChild(hd);
        return s;
      };
      const row = (cls, kids, fn, label) => {
        const r = h(fn ? 'button' : 'div', 'c-fin-row' + (cls ? ' ' + cls : ''));
        if (fn) { r.type = 'button'; r.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); fn(); }); if (label) r.setAttribute('aria-label', label); }
        r.append(...kids);
        return r;
      };
      /* dinners first, the spine of the week; then what's kept for you, the to-dos, people, and what's coming */
      /* V11: Meals: each night's dinner, then the breakfasts and lunches in one line that opens the meal board */
      const nights = f.dinners || [];
      if (nights.length || f.other) {
        const dc = card('', 'Meals');
        nights.forEach((x) => {
          const kids = [h('span', 'c-fin-day', x.day), h('span', 'c-fin-name ' + x.state, x.name)];
          /* V11 (the rituals walk): who cooks by name, never an initial (You, Kim, Anyone), as the meal board says it */
          if (x.who) { const tag = h('span', 'c-who ' + x.who.cls, x.who.cls === 'me' ? 'You' : x.who.cls === 'them' ? x.who.say : x.who.t); tag.title = x.who.name; kids.push(tag); }
          dc.appendChild(row('', kids, () => SR.openSel({ type: 'dinner', date: x.d }), 'Dinner on ' + M.DAY_LONG[M.weekday(x.d)] + ': ' + x.name + (x.who ? ', ' + x.who.name : '')));
        });
        /* V11 (the rituals walk): who cooks is settled at the table: the nights with a dish and nobody cooking it, each
           with a tap for each cook, and Undo on each */
        const ask = nights.filter((x) => x.ask);
        if (ask.length) {
          const box = h('div', 'c-fin-cook');
          box.appendChild(h('p', 'c-fin-cookh', ask.length + (ask.length === 1 ? ' night has' : ' nights have') + ' no cook yet'));
          ask.forEach((x) => {
            const r = h('div', 'c-fin-cookrow'), cs = h('div', 'c-fin-cooks');
            cs.setAttribute('role', 'group'); cs.setAttribute('aria-label', 'Who cooks ' + x.name + ' on ' + M.DAY_LONG[M.weekday(x.d)]);
            r.append(h('span', 'c-fin-day', x.day), h('span', 'c-fin-name', x.name));
            cookList('').forEach((ck) => {
              const b = Kit.btn('c-opt c-fin-cookbtn', ck.id === 'me' ? 'You' : cookShort(ck.id) || ck.name, () => {
                commitMeals((st) => { st.dinners[x.d] = Object.assign({}, st.dinners[x.d], { cook: ck.id }); });
                snd('detent');
                mealToast((ck.id === 'me' ? 'You’re cooking ' : ck.name + ' is cooking ') + x.name + ' ' + M.DAY_LONG[M.weekday(x.d)], true, null, M.DAY_LONG[M.weekday(x.d)] + '’s dinner is as it was.');
                SR.render();
              });
              b.setAttribute('aria-label', (ck.id === 'me' ? 'You cook ' : ck.name + ' cooks ') + x.name + ' on ' + M.DAY_LONG[M.weekday(x.d)]);
              cs.appendChild(b);
            });
            r.appendChild(cs);
            box.appendChild(r);
          });
          dc.appendChild(box);
        }
        if (f.other) dc.appendChild(row('c-fin-more', [SR.icon('pot', 8, '#CDCDCD'), h('span', 'c-fin-name', f.other)], () => openMealBoard(ws), f.other + ' Opens the meal board'));
        /* (the rituals walk: the list lives on the meal board, with its checks and the things that aren't for a meal) */
        if (f.grocery) dc.appendChild(row('c-fin-more', [SR.icon('cart', 8, '#CDCDCD'), h('span', 'c-fin-name', 'Grocery list'), h('span', 'c-fin-when', f.grocery)], () => openMealBoard(ws, { shop: true })));
        put(dc, 48 + (nights.length + (f.other ? 1 : 0) + (f.grocery ? 1 : 0)) * 44 + (ask.length ? 36 + ask.length * 56 : 0), 2);
      }
      const kept = keptWords(f);
      if (kept) {
        const k = h('section', 'c-fin-card kept');
        k.append(h('div', 'c-kick', 'Kept for you'), h('div', 'c-fin-big', kept.big));
        kept.lines.forEach((l) => k.appendChild(h('p', '', l)));
        put(k, 76 + kept.lines.length * 22, 1);
      }
      const empty = finEmpty(f);
      /* an empty week: what's open, as a plain fact, in place of cards with nothing in them */
      if (empty) {
        const k = h('section', 'c-fin-card kept');
        k.append(h('div', 'c-kick', SR.weekWords(f.ws).replace(/^./, (x) => x.toUpperCase())), h('div', 'c-fin-big', M.hours(f.openMin) + ' open'), h('p', '', 'Nothing due. Add a block to any day when you’re ready.'));
        put(k, 120, 1);
      } else {
        const tc = card('', 'To-dos', f.timed.length ? plural(f.timed.length, 'with a time', 'with a time') : '');
        const shown = f.timed.slice(0, 4);
        shown.forEach((x) => tc.appendChild(row(x.done ? 'done' : '', [h('i', 'c-fin-ring' + (x.done ? ' on' : '')), two(x.name, x.when)], () => SR.openSel({ type: 'task', id: x.id }), x.name + ', ' + x.when + (x.done ? ', done' : ''))));
        if (f.timed.length > shown.length) tc.appendChild(h('p', 'c-fin-note', 'And ' + (f.timed.length - shown.length) + ' more with a time.'));
        const to = stepAt('todo');
        /* V11: what still needs a time, in the words the step, the intro, and the plan use (SR.dueWords) */
        const dw = SR.dueWords(SR.weekCounts(ws), ws);
        if (f.need) tc.appendChild(row('c-fin-ask', [h('span', 'c-fin-name', dw.need)], to >= 0 ? () => SR.goStep(to) : null, dw.need + '. Go to the To-dos step'));
        if (f.late) tc.appendChild(row('c-fin-ask', [h('span', 'c-fin-name', dw.late)], to >= 0 ? () => SR.goStep(to) : null, dw.late + '. Go to the To-dos step'));
        if (!f.timed.length && !f.need && !f.late) tc.appendChild(h('p', 'c-fin-note', dw.none + '.'));
        put(tc, 48 + shown.length * 54 + ((f.need ? 1 : 0) + (f.late ? 1 : 0)) * 44 + (f.timed.length > shown.length ? 28 : 0), 3);
      }
      /* V11: People, Moving, and Coming up open the step they came from, when this reset has it */
      const listCard = (title, items, key, order, twoLine, note) => {
        const s = stepAt(key), lc = card('c-fin-list', title);
        items.forEach((x) => lc.appendChild(row('', twoLine ? [two(x.name, x.when)] : [h('span', 'c-fin-name', x.name), h('span', 'c-fin-when', x.when)], s >= 0 ? () => SR.goStep(s) : null, x.name + ', ' + x.when + (s >= 0 ? '. Go to the ' + stepName(key) + ' step' : ''))));
        /* V11: a line under the rows, said as the step says it (Moving's "2 of 3 times this week.") */
        if (note) lc.appendChild(h('p', 'c-fin-note', note));
        put(lc, 48 + items.length * (twoLine ? 48 : 44) + (note ? 28 : 0), order);
      };
      if (f.together.length) listCard('People', f.together.slice(0, 5), 'kim', 4, false);
      if (f.moves.length) listCard('Moving', f.moves.slice(0, 4), 'move', 5, false, SR.moveWords && ((SR.state.settings || {}).move || {}).n ? SR.moveWords(ws).text : '');
      /* V11 goals: each goal's week, after the to-dos; a row goes back to the Goals step */
      if ((f.goals || []).length) listCard('Goals', f.goals.slice(0, 4), 'goals', 3.5, true);
      if (f.coming.length) listCard('Coming up', f.coming, 'ahead', 6, true);
      if (twoCol) cols.forEach((c) => { if (c.children.length) wrap.appendChild(c); });
      else one.sort((a, b) => a[0] - b[0]).forEach(([, c]) => wrap.appendChild(c));
      body.appendChild(wrap);
      /* the quiet way to send it: a picture of this plan, with a look at it first, after every card (an empty
         week has nothing to send) */
      if (!empty) {
        /* V11 (the rituals walk): the plan goes out as words first (the dinners and who cooks, the to-dos with times,
           time with people, the groceries), which any phone can read; the picture is the second way */
        const share = h('button', 'c-fin-share'); share.type = 'button';
        const thumb = h('span', 'c-fin-thumb'), words = h('span', 'c-fin-sharew');
        /* V11-2 (Oct 20): private by default, so what it sends is said as it is: the to-dos only when they're added */
        const todosOut = !!(SR.shareTodos && SR.shareTodos());
        words.append(h('b', '', 'Send this plan'), h('small', '', 'As words, for anyone: the dinners and who cooks, ' + (todosOut ? 'the to-dos, ' : '') + 'the groceries'));
        share.append(thumb, words, SR.icon('share', 9, '#FFFFFF'));
        share.addEventListener('click', (e) => { e.stopPropagation(); SR.Snd.init(); sendPlanText(ws); });
        body.appendChild(share);
        const pic = Kit.btn('c-again c-fin-pic', 'Share a picture of it', () => { SR.Snd.init(); sharePlan(ws); }, 'share');
        body.appendChild(pic);
        /* the share sheet's switch (the app's own, kept per device) and its line */
        const sw = h('button', 'switch c-fin-sharesw'); sw.type = 'button';
        sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(todosOut)); sw.dataset.fk = 'fin-sharetodos';
        sw.append(h('span', 'sw-label', 'Include to-dos'), h('span', 'sw-track'));
        sw.addEventListener('click', () => {
          SR.Snd.init(); SR.setShareTodos(!todosOut); SR.render();
          requestAnimationFrame(() => { const x = document.querySelector('[data-fk="fin-sharetodos"]'); if (x) x.focus({ preventScroll: true }); });
        });
        body.append(sw, h('p', 'c-fin-shareline', SR.shareLine));
        planPicture(ws).then((p) => { if (p && thumb.isConnected) thumb.style.backgroundImage = 'url(' + p.url + ')'; }).catch(() => { /* the button still works; it draws again on tap */ });
      }
      /* the panel grows on a wide window for the two columns; the board makes room once it has */
      const at = ws + ':' + (SR.view.reset && SR.view.reset.step);
      if (finishWas !== at) {
        finishWas = at; setTimeout(() => SR.layoutInsets(), 280);
        /* the check lands once, as the finish opens (still with Calmer motion) */
        const seal = document.querySelector('#rack .reset-seal');
        if (seal && feelOn()) seal.animate([{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: FOUT });
      }
    };
    window.SR_openPlan = (ws) => openPlan(ws);

    /* the picture: the same plan, drawn as cards at a phone's width, 1080 across */
    let picMemo = { sig: '', p: null };
    const PIC = { W: 1080, pad: 64, gap: 24, bg: '#18191D', card: '#25262A', rule: 'rgba(255, 255, 255, 0.09)', tx: '#FFFFFF', tx2: '#CDCDCD', tx3: '#AFAFAF', gold: '#F2CF7A', ink: '#1C1C1E', kept: '#25352F', keptKick: '#A9DCC2', keptTx: '#DCEFE5', them: '#C9A6D4', word: '#3A3B3F' };
    const nameFont = (w, s) => w + ' ' + s + 'px Gabarito, Onest, system-ui, sans-serif';
    const wordFont = (w, s) => w + ' ' + s + 'px Onest, system-ui, sans-serif';
    /* V11-2 (Oct 20): what goes out is private by default: the plan less its to-dos, unless Include to-dos is on for
       this device (the panel on screen still shows them; they're yours) */
    const shareData = (ws) => { const f = finishData(ws); return SR.shareTodos && SR.shareTodos() ? f : Object.assign({}, f, { timed: [] }); };
    function planPicture(ws) {
      const f = shareData(ws), who = SR.who() || {};
      const sig = JSON.stringify([f, who.name || '']);
      if (picMemo.sig === sig && picMemo.p) return Promise.resolve(picMemo.p);
      /* one drawing at a time per plan: a redraw while it's drawing waits for the same picture */
      if (picMemo.sig === sig && picMemo.wait) return picMemo.wait;
      const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load(nameFont(800, 80)), document.fonts.load(nameFont(700, 34)), document.fonts.load(wordFont(500, 28)), document.fonts.load(wordFont(600, 24))]).catch(() => null) : Promise.resolve();
      const wait = fonts.then(() => new Promise((ok) => {
        const cv = drawPlan(f, who.name || '');
        cv.toBlob((blob) => {
          const p = blob ? { blob, url: URL.createObjectURL(blob), name: 'week-' + ws + '.png' } : null;
          if (picMemo.sig === sig) { if (picMemo.old) URL.revokeObjectURL(picMemo.old.url); picMemo = { sig, p }; }
          ok(p);
        }, 'image/png');
      }));
      picMemo = { sig, p: null, wait, old: picMemo.p || picMemo.old || null };
      return wait;
    }
    function drawPlan(f, name) {
      const { W, pad, gap } = PIC, colW = (W - pad * 2 - gap) / 2, inner = 36;
      const fit = (g, t, max) => { if (g.measureText(t).width <= max) return t; let s = t; while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1); return s.trimEnd() + '…'; };
      const box = (g, x, y, w, hh, r, fill) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fillStyle = fill; g.fill(); };
      const ROW = 64, HEAD = 92;
      /* V11: words wrap onto a second line before anything is cut; big type steps down until it fits */
      const mg = document.createElement('canvas').getContext('2d');
      const wrapText = (g, t, max) => { const out = []; let line = ''; String(t).split(' ').forEach((wd) => { const next = line ? line + ' ' + wd : wd; if (!line || g.measureText(next).width <= max) line = next; else { out.push(line); line = wd; } }); if (line) out.push(line); return out.map((l) => fit(g, l, max)); };
      const sized = (g, t, font, big, small, max) => { let s = big; g.font = font(s); while (s > small && g.measureText(t).width > max) { s -= 2; g.font = font(s); } return s; };
      /* each card says how tall it is at a width, and draws itself there */
      const cards = [];
      const kept = keptWords(f);
      /* who cooks goes by name (Alex, Sam), so whoever gets the picture can read it */
      const first = (s, or) => String(s || or).split(' ')[0];
      /* V11: Meals, like the panel: each night's dinner, then the breakfasts and lunches in one line */
      if ((f.dinners && f.dinners.length) || f.other) {
        /* each night: its pill first, then the name in what's left, on up to two lines */
        const nights = (f.dinners || []).map((d) => {
          let pill = null;
          /* V11: the name cookTag gives for someone else reading it (Alex, Ana, Anyone), never an initial */
          if (d.who) { mg.font = wordFont(700, 22); const t = d.who.say; pill = { t, w: Math.min(mg.measureText(t).width + 28, 180) }; }
          mg.font = wordFont(500, 28);
          /* a night not decided yet is open, said quietly: the picture is the plan, not a list of what's left */
          const name = d.state === 'set' ? d.name : 'Open', full = colW - inner * 2 - 76 - 8, room = full - (pill ? pill.w + 14 : 0);
          const two = (l, r) => (l.length > 2 ? [l[0], fit(mg, l.slice(1).join(' '), r)] : l);
          const beside = wrapText(mg, name, room);
          /* a name too long to share two lines with who's cooking takes the width, and the pill goes under it */
          if (pill && beside.length > 2) return { d, pill, under: true, lines: two(wrapText(mg, name, full), full) };
          return { d, pill, lines: two(beside, room) };
        });
        const rowH = (n) => ROW + (n.lines.length - 1) * 34 + (n.under ? 48 : 0);
        mg.font = wordFont(500, 26);
        const otherLines = f.other ? wrapText(mg, f.other, colW - inner * 2) : [];
        const otherH = otherLines.length ? 22 + otherLines.length * 36 : 0;
        cards.push({ h: HEAD + nights.reduce((a, n) => a + rowH(n), 0) + otherH + 16, draw: (g, x, y, w, hh) => {
          box(g, x, y, w, hh, 28, PIC.card);
          g.font = nameFont(700, 34); g.fillStyle = PIC.tx; g.fillText('Meals', x + inner, y + 58);
          let ry = y + HEAD;
          nights.forEach((n, i) => {
            const d = n.d;
            if (i) { g.fillStyle = PIC.rule; g.fillRect(x + inner, ry, w - inner * 2, 2); }
            g.font = wordFont(600, 24); g.fillStyle = PIC.tx3; g.fillText(d.day, x + inner, ry + 42);
            if (n.pill) {
              const tw = n.pill.w, px = n.under ? x + inner + 76 : x + w - inner - tw, py = n.under ? ry + 12 + n.lines.length * 34 + 10 : ry + 12;
              g.font = wordFont(700, 22);
              /* V11: gold is for a call to act, so your own pill is a neutral ring, as on the finish */
              box(g, px, py, tw, 40, 20, d.who.cls === 'them' ? PIC.them : d.who.cls === 'me' ? PIC.card : PIC.word);
              if (d.who.cls === 'me') { g.strokeStyle = 'rgba(255, 255, 255, 0.4)'; g.lineWidth = 3; g.stroke(); }
              g.fillStyle = d.who.cls === 'them' ? PIC.ink : PIC.tx; g.fillText(fit(g, n.pill.t, tw - 28), px + 14, py + 28);
            }
            g.font = wordFont(500, 28); g.fillStyle = d.state === 'set' ? PIC.tx : PIC.tx3;
            n.lines.forEach((l, k) => g.fillText(l, x + inner + 76, ry + 43 + k * 34));
            ry += rowH(n);
          });
          if (otherLines.length) {
            if (nights.length) { g.fillStyle = PIC.rule; g.fillRect(x + inner, ry, w - inner * 2, 2); }
            g.font = wordFont(500, 26); g.fillStyle = PIC.tx2;
            otherLines.forEach((l, k) => g.fillText(l, x + inner, ry + 46 + k * 36));
          }
        } });
      }
      if (kept) {
        mg.font = wordFont(400, 26);
        const lines = kept.lines.flatMap((l) => wrapText(mg, l, colW - inner * 2));
        cards.push({ key: 'kept', h: 72 + 92 + lines.length * 38 + 30, draw: (g, x, y, w, hh) => {
          box(g, x, y, w, hh, 28, PIC.kept);
          g.font = wordFont(600, 22); g.fillStyle = PIC.keptKick; if ('letterSpacing' in g) g.letterSpacing = '3px'; g.fillText('KEPT FOR YOU', x + inner, y + 56); if ('letterSpacing' in g) g.letterSpacing = '0px';
          sized(g, kept.big, (s) => nameFont(800, s), kept.big.length > 8 ? 64 : 84, 44, w - inner * 2); g.fillStyle = PIC.tx; g.fillText(fit(g, kept.big, w - inner * 2), x + inner, y + 148);
          g.font = wordFont(400, 26); g.fillStyle = PIC.keptTx; lines.forEach((l, i) => g.fillText(l, x + inner, y + 196 + i * 38));
        } });
      }
      /* a list card: a name and a day on one line, or (two) a name with when under it */
      /* (foot: a line under the rows, as the finish's card has: Moving's "2 of 3 times this week.") */
      const list = (key, title, items, two, foot) => { const rh = two ? 90 : 52; cards.push({ key, h: HEAD + items.length * rh + 22 + (foot ? 50 : 0), draw: (g, x, y, w, hh) => {
        box(g, x, y, w, hh, 28, PIC.card);
        g.font = nameFont(700, 34); g.fillStyle = PIC.tx; g.fillText(title, x + inner, y + 58);
        items.forEach((it, i) => {
          const ry = y + HEAD + i * rh + 34;
          if (two) {
            g.font = wordFont(500, 27); g.fillStyle = PIC.tx; g.fillText(fit(g, it.a, w - inner * 2), x + inner, ry);
            g.font = wordFont(500, 23); g.fillStyle = PIC.tx3; g.fillText(fit(g, it.b, w - inner * 2), x + inner, ry + 36);
          } else {
            g.font = wordFont(600, 24); const bw = g.measureText(it.b).width; g.fillStyle = PIC.tx2; g.fillText(it.b, x + w - inner - bw, ry);
            g.font = wordFont(500, 27); g.fillStyle = PIC.tx; g.fillText(fit(g, it.a, w - inner * 2 - bw - 20), x + inner, ry);
          }
        });
        if (foot) { g.font = wordFont(500, 24); g.fillStyle = PIC.tx2; g.fillText(fit(g, foot, w - inner * 2), x + inner, y + HEAD + items.length * rh + 38); }
      } }); };
      /* to-dos with a time: each name whole on its line, when under it. V11: only what has a time; what still
         needs one is for the panel, where it can be answered, not for a picture someone else sees */
      const more = f.timed.length - Math.min(5, f.timed.length), TR = 88;
      mg.font = wordFont(500, 27);
      const todoRows = f.timed.slice(0, 5).map((t) => { const l = wrapText(mg, t.name, colW - inner * 2 - 42); return { t, lines: l.length > 2 ? [l[0], fit(mg, l.slice(1).join(' '), colW - inner * 2 - 42)] : l }; });
      const todoH = (r) => TR + (r.lines.length - 1) * 34;
      if (f.timed.length) cards.push({ key: 'todo', h: HEAD + todoRows.reduce((a, r) => a + todoH(r), 0) + (more ? 52 : 0) + 18, draw: (g, x, y, w, hh) => {
        box(g, x, y, w, hh, 28, PIC.card);
        g.font = nameFont(700, 34); g.fillStyle = PIC.tx; g.fillText('To-dos', x + inner, y + 58);
        if (f.timed.length) { g.font = wordFont(500, 23); const t = plural(f.timed.length, 'with a time', 'with a time'), tw = g.measureText(t).width; g.fillStyle = PIC.tx3; g.fillText(t, x + w - inner - tw, y + 56); }
        let ry = y + HEAD;
        todoRows.forEach((r, i) => {
          const t = r.t;
          if (i) { g.fillStyle = PIC.rule; g.fillRect(x + inner, ry, w - inner * 2, 2); }
          g.beginPath(); g.arc(x + inner + 13, ry + 34, 12, 0, Math.PI * 2);
          /* V11: done is the green of a check, as on the finish; gold is for a call to act */
          if (t.done) { g.fillStyle = '#8FD3B1'; g.fill(); } else { g.strokeStyle = PIC.tx3; g.lineWidth = 3; g.stroke(); }
          g.font = wordFont(500, 27); g.fillStyle = PIC.tx; r.lines.forEach((l, k) => g.fillText(l, x + inner + 42, ry + 44 + k * 34));
          g.font = wordFont(500, 23); g.fillStyle = PIC.tx3; g.fillText(t.when, x + inner + 42, ry + 76 + (r.lines.length - 1) * 34);
          ry += todoH(r);
        });
        if (more) { g.font = wordFont(500, 23); g.fillStyle = PIC.tx3; g.fillText(fit(g, 'And ' + more + ' more with a time.', w - inner * 2), x + inner, ry + 34); }
      } });
      if (f.together.length) list('people', 'People', f.together.slice(0, 5).map((x) => ({ a: x.name, b: x.when })), true);
      if (f.moves.length) list('move', 'Moving', f.moves.slice(0, 4).map((x) => ({ a: x.name, b: x.when })), true, SR.moveWords && ((SR.state.settings || {}).move || {}).n ? SR.moveWords(f.ws).text : '');
      if (f.coming.length) list('coming', 'Coming up', f.coming.map((x) => ({ a: x.name, b: x.when })), true);
      /* the columns, filled shorter first */
      const colY = [0, 0], placed = [];
      cards.forEach((c) => { const i = colY[0] <= colY[1] ? 0 : 1; placed.push({ c, i, y: colY[i] }); colY[i] += c.h + gap; });
      const top = 300, colH = Math.max(0, Math.max(colY[0], colY[1]) - gap);
      const H = Math.round(top + colH + 132);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d'); g.textBaseline = 'alphabetic';
      g.fillStyle = PIC.bg; g.fillRect(0, 0, W, H);
      /* the head: whose week, when, and a gold check for a week that's planned */
      g.font = wordFont(600, 24); g.fillStyle = PIC.gold; if ('letterSpacing' in g) g.letterSpacing = '4px'; g.fillText('SUNDAY RESET', pad, pad + 40); if ('letterSpacing' in g) g.letterSpacing = '0px';
      /* V11: the title steps down to fit; a long name goes by its first word before anything is cut */
      const tMax = W - pad * 2 - 130;
      let title = name ? name + '’s week' : 'My week';
      sized(g, title, (s) => nameFont(800, s), 80, 56, tMax);
      if (name && g.measureText(title).width > tMax) { title = first(name, '') + '’s week'; sized(g, title, (s) => nameFont(800, s), 80, 56, tMax); }
      g.fillStyle = PIC.tx; g.fillText(fit(g, title, tMax), pad, pad + 134);
      g.font = wordFont(500, 32); g.fillStyle = PIC.tx2; g.fillText(M.spanText(f.ws, f.last), pad, pad + 186);
      g.beginPath(); g.arc(W - pad - 46, pad + 96, 46, 0, Math.PI * 2); g.fillStyle = PIC.gold; g.fill();
      g.strokeStyle = PIC.ink; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(W - pad - 66, pad + 98); g.lineTo(W - pad - 52, pad + 112); g.lineTo(W - pad - 25, pad + 80); g.stroke();
      placed.forEach(({ c, i, y }) => c.draw(g, pad + i * (colW + gap), top + y, colW, c.h));
      g.font = wordFont(500, 22); g.fillStyle = PIC.tx3; g.fillText('Planned with Sunday Reset', pad, H - 56);
      return cv;
    }
    /* V11: the same plan in words, the way the picture says it: whose week, then a line for each card */
    function planText(f, name) {
      const out = [(name ? name + '’s week' : 'My week') + ', ' + M.spanText(f.ws, f.last)];
      const kept = keptWords(f);
      /* (mid sentence, "every evening" takes a small letter, as People's "every day" does) */
      if (kept) out.push('Kept for you: ' + kept.big + (f.evenings.length ? ', ' + kept.lines[0].replace(/\.$/, '').replace(/^Every\b/, 'every') : ' to yourself') + '.');
      const nights = (f.dinners || []).filter((x) => x.state === 'set');
      /* V11: each night says who or how as its pill in the picture does (Alex cooks, anyone cooks, order in;
         I cook when the profile has no name), after a comma, so nights part with semicolons like To-dos */
      const how = (w) => (!w ? '' : ', ' + (w.cls === 'word' ? (w.t === 'Anyone' ? 'anyone cooks' : w.t.toLowerCase()) : w.cls === 'me' && !w.full ? 'I cook' : w.say + ' cooks'));
      if (nights.length || f.other) out.push('Meals: ' + nights.map((x) => x.day + ' ' + x.name + how(x.who)).join('; ') + (nights.length && f.other ? '. ' : '') + f.other.replace(/\.$/, '') + '.');
      if (f.timed.length) out.push('To-dos: ' + f.timed.slice(0, 5).map((t) => t.name + ', ' + t.when).join('; ') + (f.timed.length > 5 ? '; and ' + (f.timed.length - 5) + ' more' : '') + '.');
      const when = (s) => String(s).replace(/^Every\b/, 'every');
      if (f.together.length) out.push('People: ' + f.together.slice(0, 5).map((x) => x.name + ', ' + when(x.when)).join('; ') + '.');
      if (f.moves.length) out.push('Moving: ' + f.moves.slice(0, 4).map((x) => x.name + ', ' + when(x.when)).join('; ') + '.');
      if (f.coming.length) out.push('Coming up: ' + f.coming.map((x) => x.name + ', ' + x.when).join('; ') + '.');
      /* V11 (the rituals walk): and the groceries, as a count, so whoever shops knows there's a list */
      if (f.grocery) out.push('Groceries: ' + f.grocery + '.');
      out.push('Planned with Sunday Reset');
      return out.join('\n');
    }
    /* V11 (the rituals walk): the plan as words: the share sheet where there is one, else a copy to paste in a message.
       It always says what happened */
    async function sendPlanText(ws) {
      const text = planText(shareData(ws), (SR.who() || {}).name || '');
      if (typeof navigator.share === 'function') {
        try { await navigator.share({ title: 'Our week', text }); SR.toast('Sent your plan.', 'good'); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      if (await copyText(text)) SR.toast('Copied your plan as words. Paste it in a message.', 'good');
      else SR.toast('Couldn’t copy here. Share a picture of it instead.', 'bad');
    }
    /* Share: the share sheet where there is one (a phone, Safari, Chrome on a Mac); a download anywhere else.
       It always says what happened. */
    function sharePlan(ws) {
      const go = (p) => {
        if (!p) { SR.toast('Couldn’t draw the picture here. Try again in a moment.', 'bad'); return; }
        let file = null;
        try { file = new File([p.blob], p.name, { type: 'image/png' }); } catch (e) { file = null; }
        if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
          /* V11: the plan as words too, in the same share, for an app that takes text and not pictures */
          const text = planText(shareData(ws), (SR.who() || {}).name || '');
          const data = navigator.canShare({ files: [file], text }) ? { files: [file], title: 'My week', text } : { files: [file], title: 'My week' };
          navigator.share(data).then(() => SR.toast('Shared your plan.', 'good')).catch((e) => { if (!e || e.name !== 'AbortError') save(p); });
          return;
        }
        save(p);
      };
      const save = (p) => {
        if (window.claude) { SR.toast('Pictures can’t be saved in this view. Open Sunday Reset in a browser to share it.', 'bad'); return; }
        const a = document.createElement('a'); a.href = p.url; a.download = p.name;
        document.body.appendChild(a); a.click(); a.remove();
        SR.toast('Saved a picture of your plan.', 'good');
      };
      /* a picture already drawn goes out at once, while the tap still counts as a tap */
      const f = finishData(ws), sig = JSON.stringify([f, (SR.who() || {}).name || '']);
      if (picMemo.sig === sig && picMemo.p) { go(picMemo.p); return; }
      planPicture(ws).then(go).catch(() => go(null));
    }

    /* == V11 shell: a scroll that changes the view says how to get back ==
       Russell scrolled on the trackpad and the week became the month, then the day, with nothing saying how
       to get back. During the reset a scroll never changes the view (app.js). Anywhere else, the first
       scroll that does leaves a small Back to the week under the view switch, named for where you were. */
    const backPill = Kit.btn('k k-chip c-backpill', '', () => goBackLevel(), 'left', CREAM);
    const backWords = h('span', ''); backPill.appendChild(backWords); backPill.hidden = true;
    app.appendChild(backPill);
    let backFrom = null, backTimer = 0;
    const viewName = (z) => ({ day: 'the day', week: 'the week', month: 'the month', year: 'the year' }[z] || 'the week');
    const atFrom = () => !!backFrom && (backFrom.today ? SR.inToday() : !SR.inToday() && SR.view.zoom === backFrom.zoom);
    function hideBack() { clearTimeout(backTimer); backFrom = null; backPill.hidden = true; }
    function goBackLevel() {
      const f = backFrom; hideBack();
      if (!f) return;
      if (f.today) { Kit.zoom('today'); return; }
      SR.view.focus = f.focus; Kit.zoom(f.zoom);
    }
    function placeBack() {
      if (backPill.hidden) return;
      const r = tr.getBoundingClientRect();
      /* V11: a side panel or Settings open on the right keeps its header and its close: the way back steps
         left of it, over the desk */
      let right = r.right;
      ['side', 'drawer'].forEach((id) => { const p = document.getElementById(id); if (p && !p.hidden && p.offsetParent !== null) { const pr = p.getBoundingClientRect(); if (pr.width && pr.left > 0 && pr.top < r.bottom + 60) right = Math.min(right, pr.left - 12); } });
      backPill.style.top = Math.round(r.bottom + 8) + 'px';
      backPill.style.right = Math.round(window.innerWidth - right) + 'px';
      /* with no desk left beside a panel, it waits until the panel closes */
      backPill.style.visibility = right < 240 ? 'hidden' : '';
    }
    window.SR_levelGesture = (from) => {
      if (!backFrom) backFrom = from;
      if (atFrom() || SR.view.reset) { hideBack(); return; }
      backWords.textContent = 'Back to ' + (backFrom.today ? 'Now' : viewName(backFrom.zoom));
      backPill.setAttribute('aria-label', backWords.textContent);
      const was = backPill.hidden;
      backPill.hidden = false; placeBack();
      if (was && feelOn()) backPill.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: FOUT });
      clearTimeout(backTimer); backTimer = setTimeout(hideBack, 9000);
    };
    Kit.renders.push(() => { if (backFrom && (atFrom() || SR.view.reset || SR.view.phone)) hideBack(); else placeBack(); });
    /* V11: in the reset a pinch (or +) can look closer; once it has, this chip brings the whole week or month
       back (shell.css shows it while body.c-deskzoomed, which renderViewCtl sets) */
    const fitWords = h('span', '');
    const fitChip = Kit.btn('k k-chip c-fitchip', '', () => { SR.Snd.init(); SR.deskZoom(0); }, 'zoomout', CREAM);
    fitChip.appendChild(fitWords);
    app.appendChild(fitChip);
    Kit.renders.push(() => { const w = 'Fit the ' + (SR.view.zoom === 'month' ? 'month' : SR.view.zoom === 'day' ? 'day' : 'week'); if (fitWords.textContent !== w) { fitWords.textContent = w; fitChip.setAttribute('aria-label', w + ' to the screen'); } placeFit(); });
    /* V11: a panel open on the right keeps its close button: the chip steps left of it, over the desk, and
       waits while there's no desk left beside the panel and the reset's own panel */
    function placeFit() {
      fitChip.style.right = ''; fitChip.style.visibility = '';
      if (getComputedStyle(fitChip).display === 'none') return;
      const c = fitChip.getBoundingClientRect(), p = document.getElementById('side');
      if (!p || p.hidden || p.offsetParent === null) return;
      const pr = p.getBoundingClientRect();
      if (!pr.width || pr.left <= 0 || pr.top > c.bottom + 8 || pr.bottom < c.top - 8 || pr.left > c.right + 8) return;
      const right = pr.left - 12, rk = document.getElementById('rack'), rr = rk && rk.offsetParent !== null && !document.body.classList.contains('c-panel-off') && rk.dataset.edge === 'left' ? rk.getBoundingClientRect().right : 0;
      fitChip.style.right = Math.round(window.innerWidth - right) + 'px';
      if (right - c.width < rr + 12) fitChip.style.visibility = 'hidden';
    }
    {
      let fitSoon = 0;
      const refit = () => { placeFit(); clearTimeout(fitSoon); fitSoon = setTimeout(placeFit, 300); };
      ['side'].forEach((id) => { const p = document.getElementById(id); if (p) new MutationObserver(refit).observe(p, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] }); });
      new MutationObserver(refit).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      window.addEventListener('resize', () => requestAnimationFrame(placeFit));
    }
    /* a panel opening or closing on the right moves it, once now and once the panel has slid in */
    {
      let placeSoon = 0;
      const moved = () => { if (backPill.hidden) return; placeBack(); clearTimeout(placeSoon); placeSoon = setTimeout(placeBack, 300); };
      ['side', 'drawer'].forEach((id) => { const p = document.getElementById(id); if (p) new MutationObserver(moved).observe(p, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] }); });
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
      /* (a key press is a tap from the first pointer, with its id, as dragTile checks) */
      t.addEventListener('keydown', (e) => { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); const p = { isPrimary: true, pointerId: 1, pointerType: 'mouse' }; t.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ button: 0, clientX: 0, clientY: 0 }, p))); window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ clientX: 0, clientY: 0 }, p))); });
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
        if (e.button !== 0 || !e.isPrimary) return;
        if (carried) carried.cancel();
        e.preventDefault(); SR.Snd.init();
        /* (V11: the letter in hand is this pointer's; another finger moves or drops nothing) */
        const pid = e.pointerId; carried = { id: pid, cancel: () => up({ type: 'pointercancel', pointerId: pid }) };
        const r = t.getBoundingClientRect();
        const ox = e.clientX - r.left, oy = e.clientY - r.top;
        const fromSlot = t.parentElement && t.parentElement.dataset.slot != null ? +t.parentElement.dataset.slot : null;
        if (fromSlot != null) { rack[fromSlot] = null; saveRack(); deskLayer.appendChild(t); deskTiles.push(t); }
        putAt(t, r.left, r.top, 0);
        t.classList.add('c-up'); snd('pick');
        let over = null, moved = false;
        const sx = e.clientX, sy = e.clientY;
        const move = (ev) => {
          if (ev.pointerId !== pid) return;
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
          if (ev.pointerId !== pid) return;
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          if (carried && carried.id === pid) carried = null;
          t.classList.remove('c-up');
          /* V11: taken back by the browser: the letter stays where it is, and lands nowhere */
          if (ev.type === 'pointercancel') { if (over) over.classList.remove('c-over'); over = null; return; }
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
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
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
      if (pv && pv.id === 'firstrun' && helloPreview !== pv) { helloPreview = pv; const k = trying || 'first'; trying = null; if (k === 'card') SR.openSetup(); else if (k === 'first') openSetupIntro({ preview: true, first: true }); else openDeskSetup({ preview: true }); return; }
      if (!pv && su && su.preview && !su.built) closeMat();
      if (!pv) { helloPreview = null; if (realRack) { rack = realRack; realRack = null; putBack(); drawRack(); } }
      /* (V11: said first, so a reload that fails can't fail again on every redraw) */
      const leaving = wasPreview && !pv;
      wasPreview = !!pv;
      if (leaving) {
        const reload = (obj, k) => { Object.keys(obj).forEach((x) => delete obj[x]); Object.assign(obj, stored(k, {})); };
        /* (V11: meals live on the board and come back with it; reloading their old name threw on every redraw
           after leaving a made up board, and the bottom bar stopped changing) */
        reload(routines, 'sundayreset.v7.routines'); reload(planned, 'sundayreset.v7.planned');
        snooze = stored('sundayreset.v7.snooze', null);
      }
      if (hello && hello.preview && !pv) { hello = null; helloCard.hidden = true; putBack(); }
      let met = true; try { met = localStorage.getItem('sundayreset.v7.met') === '1'; } catch (e) { /* fine */ }
      /* V11: a first visit opens the way the Sunday Reset does: one page that says what's ahead, then the
         setup a step at a time (Russell, Oct 14: the desk of questions and letters was too busy to start on) */
      let met11 = true; try { met11 = localStorage.getItem('sundayreset.v11.met') === '1'; } catch (e) { /* fine */ }
      if (!met11 && !su && !pv && !devStored() && SR.who() && SR.who().sample && !Kit.openSheetEl && document.getElementById('sheet').hidden) { try { localStorage.setItem('sundayreset.v11.met', '1'); } catch (e) { /* fine */ } openSetupIntro({ first: true }); }
    }
    /* == V11: the front door (Oct 15, the first-visit walk) ==
       One page for a first visit and for Start over: the board's own welcome (app.js onbWelcome), with the week as a
       picture, Your week, in blocks., who shared it, Set up my week with its four parts in one line under it, Look at
       a sample week, the lock line, and Other ways in. (Until Oct 15 V11 opened a page of its own here, in the reset's
       shape; the walk found two front doors, and the one seen first said less.) Looking at the sample, or closing the
       page, makes a phone's first look the desk (app.js lookAround and firstLookDesk). opts.preview: Dev's way to try
       it as someone new, nothing saved. */
    function openSetupIntro(opts) {
      opts = opts || {};
      closeMenu();
      if (SR.openWelcome) SR.openWelcome({ preview: !!opts.preview });
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
        if (!done) SR.toast('Your answers are kept. Set up my week, under your name, picks up here.', '');
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
      /* V11: People is for anyone, partner or not */
      out.push({ id: 'together', name: 'People', line: 'Ideas for time with your people', icon: 'heart', c: cc('us'), on: () => a.help.together !== false, set: (v) => { a.help.together = v; } });
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
        /* V11: the answers as they were, for a touch the browser takes back: that puts them back, never at
           where the cancel happened to be (it jumped work to 5 am) */
        const before = su && su.a ? JSON.stringify(su.a) : null;
        const move = (ev) => { const v = f(ev.clientX, step, false); if (v != null && v !== last) { last = v; snd('detent'); } };
        const up = (ev) => {
          el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.classList.remove('c-drag-on');
          if (ev.type !== 'pointercancel') { f(ev.clientX, step, true); snd('clack', 0.7); }
          else if (before && su && su.a) { const was = JSON.parse(before); Object.keys(su.a).forEach((x) => { if (!(x in was)) delete su.a[x]; }); Object.assign(su.a, was); }
          refresh();
        };
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
    /* (the Planner walk, 1.2: Getting started's card comes back once the tour is over) */
    function endCoach() { clearInterval(movesHold); if (coach) { coach.remove(); coach = null; } coachRoom(); document.querySelectorAll('.c-coach-ring, .c-coach-ghost').forEach((x) => x.remove()); if (coachPoll) clearInterval(coachPoll); coachPoll = null; if (window.SR_onRender) window.SR_onRender(); }
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
        coachCard('You’re set', 'That’s Sunday Reset.', 'Your first reset is ' + (t ? t.name.toLowerCase() : M.DAY_LONG[a.resetAt.day]) + ', ' + M.clock(a.resetAt.min) + '. The button at the bottom right starts it. A few more things to try are in Getting started.', [Kit.btn('c-go', 'Done', () => endCoach()), Kit.btn('c-su-link', 'Open Getting started', () => { endCoach(); if (SR.openMoves) SR.openMoves(); else SR.openSel({ type: 'moves' }); })]);
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
      /* V11: what's due in the next 7 days, the count its list in To-dos, the strip, and the desk use, and
         never wider than 99+ */
      const dl = dueWeek(), n = dl.length; due.textContent = n ? capN(n) : '';
      /* V11: what was due before today is said as that, not as due in the next 7 days */
      const was = dl.filter((x) => x.task.due < SR.today).length, ahead = n - was;
      const dueSaid = [ahead ? ahead + ' due in the next 7 days' : '', was ? was + ' due before today' : ''].filter(Boolean).join(', ');
      todos.setAttribute('aria-label', 'To-dos' + (n ? ', ' + dueSaid : ''));
      todos.title = n ? (n === 1 ? '1 to-do: ' : n + ' to-dos: ') + dueSaid : 'To-dos';
      lib.setAttribute('aria-pressed', String(libOpen()));
      todos.setAttribute('aria-pressed', String((!today && !!v.bench && v.bench.tab !== 'blocks') || (today && !!dock && dock.classList.contains('c-tdock'))));
      const p = SR.who(), name = (p && p.name) || 'You';
      meCircle.textContent = name.slice(0, 1).toUpperCase(); meName.textContent = name.split(' ')[0];
      me.classList.toggle('c-sample', !!(p && p.sample));
      /* (V11, Oct 15: the sample says so where the name is hidden too, on the iPad and the open Duo) */
      meTag.hidden = !(p && p.sample);
      /* V11: Getting started, one tap away while it's unfinished (not on the phone, whose list carries its card) */
      { const mi = SR.movesInfo || { shown: false }; gs.hidden = !mi.shown || !!v.phone || !!v.reset; if (!gs.hidden) { gsN.textContent = mi.done + ' of ' + mi.total; gsRing.style.setProperty('--p', String(Math.round((100 * mi.done) / Math.max(1, mi.total)))); gs.setAttribute('aria-label', 'Getting started, ' + mi.done + ' of ' + mi.total + ' done'); gs.setAttribute('aria-pressed', String(!!(v.sel && v.sel.type === 'moves'))); } }
      /* (the Planner walk, 1.2: Getting started's card, drawGsf) */
      drawGsf();
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
      drawStackBar(); drawKindChips(); drawRack(); devKeep(); maybeHello(); drawUndo();
      const ag = document.getElementById('agenda');
      listBtn.setAttribute('aria-pressed', String(!!(ag && !ag.hidden)));
      onScreen();
      requestAnimationFrame(() => { measure(); place(); });
    }
    /* == V11: what's on screen, by view and by size (docs/V11-ON-SCREEN.md) ==
       The bottom bar holds what works where you are. Block library and To-dos lay their pieces out beside
       the day or the week, so they show there (To-dos in Now too, where Due soon comes out beside today);
       in Month and Year they take you to the week and lay them out there (V11-3), and in the list they'd only take you
       somewhere else. Add works everywhere, and the
       reset follows its own rule (drawChip). With every kind of day laid out the bar steps aside, since
       the cards are the page, and a bar with nothing in it isn't drawn. */
    const spreadBar = h('div', 'c-spreadbar'); spreadBar.hidden = true;
    const spreadSave = Kit.btn('c-spreadsave', '', () => { const d = SR.view.focus; if (SR.closeKinds) SR.closeKinds(); SR.openSel({ type: 'savePreset', date: d }); }, 'plus');
    const spreadLong = h('span', 'c-spread-long'), spreadShort = h('span', 'c-spread-short', 'Save as a kind');
    spreadSave.append(spreadLong, spreadShort);
    const spreadDone = Kit.btn('c-spreaddone', 'Done', () => { if (SR.closeKinds) SR.closeKinds(); });
    spreadDone.title = 'Put the kinds away (K)';
    spreadBar.append(spreadSave, spreadDone);
    let brWas = null;
    function onScreen() {
      const v = SR.view, now = SR.inToday(), ag = document.getElementById('agenda'), listOn = !!(ag && !ag.hidden);
      const spread = spreadOn(), board = !now && !listOn && (v.zoom === 'day' || v.zoom === 'week');
      /* (V11-3, design review 55: Month and Year keep To-dos and Block library too, so the bar doesn't change under
         you as you zoom out; either one takes you to the week and lays its pieces out there, toBoard) */
      const zoomedOut = !now && !listOn && (v.zoom === 'month' || v.zoom === 'year');
      lib.hidden = !(board || zoomedOut);
      todos.hidden = !(board || now || zoomedOut);
      document.body.classList.toggle('c-spread', spread);
      spreadBar.hidden = !spread;
      if (spread) {
        const wd = M.DAY_LONG[M.weekday(v.focus)];
        spreadLong.textContent = 'Save this ' + wd + ' as a kind';
        spreadSave.setAttribute('aria-label', 'Save this ' + wd + ' as a kind of day of your own');
      }
      br.hidden = spread || ![undoP, redoP, add, todos, lib, rchip, gs].some((x) => !x.hidden);
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
       Each visit starts with it away, so the calendar opens with the most room (Russell, Oct 14). Once it's out on
       the day it stays out until you close it or leave the day (the Planner walk, 8.4, Oct 15: it used to put itself
       away after a minute unused, and Russell and Kim talking a day over lost it mid sentence). Settings, The desk,
       can start every visit with it out. */
    {
      const TIDY = 'sundayreset.kitTidy';
      const tidyOn = () => { try { return localStorage.getItem(TIDY) !== '0'; } catch (e) { return true; } };
      window.SR_kitTidy = { on: tidyOn, set: (v) => { try { localStorage.setItem(TIDY, v ? '1' : '0'); } catch (e) { /* fine */ } } };
      /* a visit starts with it away (the day's rack and the week's bench both) */
      if (tidyOn()) { window.SR_kitAway = true; if (SR.view.bench && SR.view.bench.tab === 'blocks') SR.view.bench = null; }
    }
    /* == V11: kinds of day, said once ==
       The first time a day is open, a note offers every kind of it side by side, so the kinds are found
       without anyone reading a manual (Russell, Oct 14: "remind users that it's there") */
    {
      let told = false; try { told = localStorage.getItem('sundayreset.v11.kindsTold') === '1'; } catch (e) { /* fine */ }
      let timer = 0;
      Kit.renders.push(() => {
        /* (V11: not on the phone's list or its own day, which have no kinds to show) */
        /* (V11, Oct 15, the first-visit walk: not on the sample, whose first look teaches dragging, and not on the visit a
           setup lands on, whose one message is the week; view.quietTips) */
        /* (V11, the Planner walk, 1.1: not while a coach card is up, or a panel is open, so only one thing talks at once) */
        if (told || SR.view.zoom !== 'day' || SR.inToday() || SR.view.phone || SR.view.preview || SR.view.reset || SR.view.kindSpread || SR.view.quietTips || SR.view.sel || (SR.who() && SR.who().sample) || (SR.phoneDay && SR.phoneDay()) || document.querySelector('.c-mat, .k-sheet, .coach, .c-coach') || !document.getElementById('sheet').hidden) { clearTimeout(timer); timer = 0; return; }
        if (timer) return;
        timer = setTimeout(() => {
          timer = 0;
          if (told || SR.view.zoom !== 'day' || SR.view.kindSpread || SR.view.phone || SR.view.sel || (SR.phoneDay && SR.phoneDay()) || document.querySelector('.coach, .c-coach')) return;
          told = true; try { localStorage.setItem('sundayreset.v11.kindsTold', '1'); } catch (e) { /* fine */ }
          const wd = M.DAY_LONG[M.weekday(SR.view.focus)];
          SR.toast('See every kind of ' + wd + ' side by side.', '', { label: 'Show me', fn: () => { if (SR.openKinds) SR.openKinds(); } });
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

  /* == V11: smart breakdowns ==
     docs/SMART-BREAKDOWNS.md. Claude suggests a to-do's steps with a time on each, or a goal's parts, for
     a name the board's own library doesn't know (Model.breakdown and Model.goalForExam always come first).
     Private by default: nothing is sent until the person turns it on on this device, after a sheet that
     says what's sent; then an ask sends only the words of that one to-do or goal (and the step size, or
     the goal's date) to /api/smart, which asks Claude Haiku. It never stands in the way of the built-in
     steps: an ask settles within 15 seconds, and anything that went wrong or came back odd settles as null.
       SR_ai.ready()       the server is set up (asked once a page load; false until it answers)
       SR_ai.available()   ready, and turned on on this device
       SR_ai.enable(fn, { kind })  on already: fn() now. Otherwise the sheet (kind 'parts' words it for a
                           goal); Turn on keeps the choice on this device (localStorage sundayreset.ai, never
                           the board; a made up board keeps it in memory only) and calls fn. Gives a Promise
                           of whether it's on. { sheet: false } is for Settings, whose page says the same
                           things beside the switch.
       SR_ai.disable()     off on this device
       SR_ai.breakdown(name, { size })  a Promise of { steps: [{ name, dur }], total, source: 'claude' } or null
       SR_ai.goalParts(name, { date })  a Promise of { parts: [{ name, min }], note, total, source: 'claude' } or null
       SR_ai.lastError(ask) what that ask (the Promise breakdown or goalParts gave) ran into, { code, message }, or
                           null; with no ask, what the last ask to settle ran into (the codes, and the limit, most,
                           and at of too_many, are at aiAsk). V11-3: each ask keeps its own, so two out at once
                           never say each other's cause
     The same ask (name, and size or date) is answered once a page load; { fresh: true } asks again. A window
     event, sr-ai, says when the server answered ready or the switch changed. Characters past ASCII in the
     patterns here are \u{...} escapes, so no dash sits in this file. */
  {
    const AI_KEY = 'sundayreset.ai', AI_URL = '/api/smart', AI_WAIT = 15000;
    const AI_POLICY = 'https://sunday-reset-site.vercel.app/privacy';
    /* smart: the checks. Nothing from the server is used until it passes them. Steps: 1 to 15, each 5 to
       240 minutes on the 5 minute grid, names cut at a word to 60 characters with no dash for a pause and
       none of the filler words left in, and a first step of 10 minutes or less (a longer one splits off its
       first 10, as Model.breakdown does). Parts: 1 to 15, each 15 minutes to 500 hours on the same grid. */
    const aiCtrl = /[\u{0}-\u{1F}\u{7F}-\u{9F}\u{2028}\u{2029}\u{202A}-\u{202E}\u{2066}-\u{2069}]/u;
    const aiCut = (text, max) => {
      let t = String(text || '');
      if (t.length <= max) return t;
      const head = t.slice(0, max + 1), sp = head.lastIndexOf(' ');
      t = sp >= Math.floor(max / 2) ? head.slice(0, sp) : t.slice(0, max);
      for (;;) {
        const next = t.replace(/[\s,;:.\u{2019}'-]+$/u, '').replace(/\s+(?:and|or|but|the|a|an|to|of|for|with|in|on|at|by|from|into|your|my|their|its)$/i, '');
        if (next === t) return t;
        t = next;
      }
    };
    const aiWords = (text, max, sentence) => {
      let t = String(text == null ? '' : text).replace(new RegExp(aiCtrl.source, 'gu'), ' ')
        .replace(/(\d)\s*[\u{2012}-\u{2015}]\s*(\d)/gu, '$1 to $2')
        .replace(/\s*(?:[\u{2012}-\u{2015}]|-{2,})\s*|\s+-\s+/gu, ', ')
        .replace(/\b(?:just|simply|really|please|actually)\b/gi, ' ')
        .replace(/(\w)'(\w)/g, '$1\u{2019}$2')
        .replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/([,;:])(?:\s*[,;:])+/g, '$1')
        /* (a pause and a stop side by side keep the stop, so a dash and a filler word never leave ",.") */
        .replace(/[,;:]+(?=[.!?])/g, '').replace(/([.!?])[,;:]+/g, '$1')
        .trim().replace(/^[\s,;:.!?]+/, '').replace(/[\s,;:]+$/, '');
      if (!sentence) t = t.replace(/[.!]+$/, '');
      t = aiCut(t, sentence ? max - 1 : max);
      if (!t) return '';
      t = t.charAt(0).toUpperCase() + t.slice(1);
      return sentence && !/[.!?]$/.test(t) ? t + '.' : t;
    };
    const aiGrid = (n, lo, hi) => Number.isInteger(n) && n % 5 === 0 && n >= lo && n <= hi;
    function aiSteps(list) {
      if (!Array.isArray(list) || !list.length || list.length > 15) return null;
      const out = [];
      for (const s of list) {
        if (!s || typeof s !== 'object' || typeof s.name !== 'string' || !aiGrid(s.dur, 5, 240)) return null;
        const name = aiWords(s.name, 60);
        if (name) out.push({ name, dur: s.dur });
      }
      if (!out.length) return null;
      const f = out[0];
      if (f.dur > 10) out.splice(0, 1, { name: aiCut(f.name, 42) + ', first 10 minutes', dur: 10 }, { name: aiCut(f.name, 50) + ', the rest', dur: f.dur - 10 });
      /* (V11-3: 15 good steps whose first splits in two are still 15, as the server keeps them) */
      return out.slice(0, 15);
    }
    function aiParts(data) {
      if (!data || typeof data !== 'object' || !Array.isArray(data.parts) || !data.parts.length || data.parts.length > 15) return null;
      const parts = [];
      for (const p of data.parts) {
        if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !aiGrid(p.min, 15, 30000)) return null;
        const name = aiWords(p.name, 60);
        if (name) parts.push({ name, min: p.min });
      }
      if (!parts.length) return null;
      return { parts, note: typeof data.note === 'string' ? aiWords(data.note, 160, true) : '', total: parts.reduce((a, p) => a + p.min, 0), source: 'claude' };
    }
    /* smart: asking */
    let aiReady = null, aiErr = null, aiMem = null;
    const aiErrOf = new WeakMap();
    /* an ask that settles at once, with what it ran into */
    const aiNo = (err) => { aiErr = err; const p = Promise.resolve(null); aiErrOf.set(p, err); return p; };
    const aiAsked = new Map();
    const aiEmit = () => { try { window.dispatchEvent(new CustomEvent('sr-ai')); } catch (e) { /* fine */ } };
    const aiBoard = () => (window.SR && SR.view && SR.view.preview ? SR.view.preview.id || 'preview' : null);
    /* the switch is this device's own; a made up board (a preview) holds it in memory, and lets go of it after */
    const aiOn = () => {
      if (aiMem && aiMem.board === aiBoard()) return aiMem.on;
      aiMem = null;
      try { const v = JSON.parse(localStorage.getItem(AI_KEY) || 'null'); return !!(v && v.on === true); } catch (e) { return false; }
    };
    const aiSet = (on) => {
      aiAsked.clear();
      if (aiBoard()) { aiMem = { on, board: aiBoard() }; return; }
      try { localStorage.setItem(AI_KEY, JSON.stringify({ on, at: Date.now() })); aiMem = null; } catch (e) { aiMem = { on, board: null }; }
    };
    /* is the server set up? Asked once a page load; when it says yes, the screens that offer it draw again */
    const aiCheck = () => {
      if (aiReady !== null) return;
      aiReady = 'asking';
      const ac = typeof AbortController === 'function' ? new AbortController() : null;
      const t = setTimeout(() => { if (ac) ac.abort(); }, AI_WAIT);
      Promise.resolve().then(() => fetch(AI_URL, { cache: 'no-store', credentials: 'same-origin', signal: ac ? ac.signal : undefined }))
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !!(d && d.ready === true), () => false)
        .then((yes) => {
          clearTimeout(t);
          aiReady = yes;
          if (!yes) return;
          aiEmit();
          try { if (window.SR && SR.state && document.getElementById('hud-title') && !document.querySelector('.c-ghost-block')) SR.render(); } catch (e) { /* the next draw shows it */ }
        });
    };
    const ready = () => { if (aiReady === null) aiCheck(); return aiReady === true; };
    const available = () => ready() && aiOn();
    /* smart: the sheet that asks first, once a device: what it does, exactly what's sent, that nothing else
       leaves, who processes it, the policy, and Turn on or Not now. Closing it any other way is Not now, and
       focus goes back where it was. */
    function aiSheet(kind, then) {
      const goal = kind === 'parts', back = document.activeElement;
      let settled = false, card = null;
      const settle = (yes) => { if (settled) return; settled = true; then(yes); };
      /* words where "to-do" never breaks at its hyphen on a narrow screen */
      const said = (tag, cls, text) => { const x = h(tag, cls); text.split(/(to-dos?)/).forEach((part, i) => { if (part) x.append(h('span', i % 2 ? 'c-ai-nb' : '', part)); }); return x; };
      Kit.sheet('Smart breakdowns', (c) => {
        card = c;
        c.append(h('div', 'c-kick', 'Smart breakdowns'), h('h2', '', goal ? 'Let Claude suggest the parts?' : 'Let Claude suggest the steps?'));
        c.appendChild(said('p', 'c-ai-lede', goal ? 'When the board doesn’t know a goal, Claude can suggest its parts and about how many hours each takes.' : 'When the board’s own steps don’t fit a to-do, Claude can suggest steps with a time on each.'));
        const facts = h('ul', 'c-ai-facts');
        [['What’s sent', goal ? 'The words of this goal, its date, and today’s date.' : 'The words of this to-do, and the step size.'],
          ['What stays here', 'Everything else on your board. Your other to-dos, your days, and the names on it never leave this device.'],
          ['Who reads it', 'Anthropic, the company that makes Claude, processes it under its API terms. Sunday Reset doesn’t keep it.']]
          .forEach(([k, v]) => { const li = h('li'); li.append(h('b', '', k), said('span', '', v)); facts.appendChild(li); });
        c.appendChild(facts);
        const link = h('a', 'link-out c-ai-link', 'Read the privacy policy');
        link.href = AI_POLICY; link.target = '_blank'; link.rel = 'noopener noreferrer';
        c.appendChild(link);
        const acts = h('div', 'c-ai-acts');
        acts.append(Kit.btn('c-go', 'Turn on', () => { aiSet(true); Kit.closeSheet(); settle(true); }), Kit.btn('c-ghost', 'Not now', () => { Kit.closeSheet(); settle(false); }));
        c.appendChild(acts);
        c.appendChild(h('p', 'c-ai-small', 'Turn it off any time in Settings, Smart breakdowns.'));
        /* Tab stays inside while it's open */
        c.addEventListener('keydown', (e) => {
          if (e.key !== 'Tab') return;
          const list = [...c.querySelectorAll('button, a[href]')].filter((x) => !x.disabled && x.offsetParent !== null);
          if (!list.length) return;
          const first = list[0], last = list[list.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
      }, 'c-ai');
      /* however it closes (Turn on, Not now, the x, Esc, a tap outside), it answers once, and focus goes back */
      const box = document.getElementById('app');
      if (!card || !box || typeof MutationObserver !== 'function') return;
      const mo = new MutationObserver(() => {
        if (card.isConnected) return;
        mo.disconnect();
        settle(false);
        const now = document.activeElement;
        if ((!now || now === document.body) && back && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
      });
      mo.observe(box, { childList: true });
    }
    function enable(fn, opts) {
      const o = opts || {};
      const go = () => { if (typeof fn !== 'function') return; try { fn(); } catch (e) { console.error(e); } };
      if (!ready()) return Promise.resolve(false);
      if (aiOn()) { go(); return Promise.resolve(true); }
      if (o.sheet === false) { aiSet(true); aiEmit(); go(); return Promise.resolve(true); }
      return new Promise((done) => aiSheet(o.kind, (yes) => { if (yes) { aiEmit(); go(); } done(yes); }));
    }
    function disable() { aiSet(false); aiEmit(); }
    /* one ask: only this one name (and its size or date) goes, and it settles within 15 seconds. V11-2 (honest
       errors): what it ran into is kept as what happened, so the page can say the real cause (lastError):
       offline (no connection: said at once, with nothing sent), timeout (no answer in 15 seconds, here or at the
       server), too_many (limit 'minute' or 'day', most, the number allowed, and at, when the next ask can go),
       not_ready, odd (an answer that didn't fit the board), unreachable (the server didn't answer at all),
       bad_request, off, or upstream (Claude answered with an error) */
    const aiOffline = () => typeof navigator !== 'undefined' && !!navigator && navigator.onLine === false;
    /* today on this device, YYYY-MM-DD, in its own time zone (the board's today when there is one) */
    const aiToday = () => {
      try { if (window.SR && typeof SR.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(SR.today)) return SR.today; } catch (e) { /* the clock below */ }
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    function aiAsk(body, check, fresh) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!available()) return aiNo({ code: ready() ? 'off' : 'not_ready', message: '' });
      if (!name || name.length > 140 || aiCtrl.test(name)) return aiNo({ code: 'bad_request', message: '' });
      if (aiOffline()) return aiNo({ code: 'offline', message: 'You\u2019re offline.' });
      const send = JSON.stringify(Object.assign({}, body, { name }));
      if (!fresh && aiAsked.has(send)) return aiAsked.get(send);
      /* (V11-3: a goal sends the page's own date too, so its note counts days from where the person is; the server
         uses it only when it's within a day of its own. It isn't part of what makes two asks the same) */
      const sent = body.kind === 'parts' ? JSON.stringify(Object.assign({}, body, { name, today: aiToday() })) : send;
      let p = null;
      p = new Promise((done) => {
        let over = false;
        const ac = typeof AbortController === 'function' ? new AbortController() : null;
        const finish = (v, err) => {
          if (over) return;
          over = true; clearTimeout(t); aiErr = err || null;
          if (p) aiErrOf.set(p, aiErr);
          if (ac) ac.abort();
          if (!v) aiAsked.delete(send);
          /* switched off while it was out: what came back isn't used */
          done(v && aiOn() ? v : null);
        };
        const t = setTimeout(() => finish(null, { code: 'timeout', message: 'Claude didn\u2019t answer in time.' }), AI_WAIT);
        Promise.resolve().then(() => fetch(AI_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: sent, cache: 'no-store', credentials: 'same-origin', signal: ac ? ac.signal : undefined }))
          .then((r) => r.json().then((d) => ({ r, d }), () => ({ r, d: null })))
          .then(({ r, d }) => {
            if (r.ok) { const v = check(d); finish(v, v ? null : { code: 'odd', message: 'Claude\u2019s answer didn\u2019t fit the board.' }); return; }
            let code = d && typeof d.error === 'string' ? d.error : 'upstream';
            /* (the server's own 15 seconds ran out: the same as no answer here) */
            if (r.status === 504) code = 'timeout';
            if (code === 'not_ready') { aiReady = false; aiEmit(); }
            const err = { code, message: d && typeof d.message === 'string' ? d.message.slice(0, 200) : '' };
            if (code === 'too_many') {
              const wait = Number(d && d.retry) || Number(r.headers && r.headers.get ? r.headers.get('retry-after') : 0) || 60;
              const retry = Math.max(1, Math.min(86400, Math.ceil(wait)));
              err.limit = d && (d.limit === 'day' || d.limit === 'minute') ? d.limit : retry > 120 ? 'day' : 'minute';
              err.most = Number(d && d.most) || (err.limit === 'day' ? 100 : 10);
              /* (V11-3: every address together is full, not this person's own count) */
              if (d && d.scope === 'site') err.scope = 'site';
              err.at = Date.now() + retry * 1000;
            }
            finish(null, err);
          })
          /* (nothing answered: offline if the device says so, otherwise the server couldn't be reached) */
          .catch(() => finish(null, aiOffline() ? { code: 'offline', message: 'You\u2019re offline.' } : { code: 'unreachable', message: 'Couldn\u2019t reach Claude.' }));
      });
      aiAsked.set(send, p);
      return p;
    }
    function breakdown(name, opts) {
      const o = opts || {}, size = ['small', 'medium', 'big'].includes(o.size) ? o.size : 'medium';
      return aiAsk({ kind: 'steps', name, size }, (d) => {
        const steps = d && aiSteps(d.steps);
        return steps ? { steps, total: steps.reduce((a, s) => a + s.dur, 0), source: 'claude' } : null;
      }, o.fresh);
    }
    function goalParts(name, opts) {
      const o = opts || {}, date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
      return aiAsk(date ? { kind: 'parts', name, date } : { kind: 'parts', name }, (d) => aiParts(d), o.fresh);
    }
    window.SR_ai = { ready, available, enable, disable, breakdown, goalParts, lastError: (ask) => (ask && typeof ask.then === 'function' ? aiErrOf.get(ask) || null : aiErr) };
    aiCheck();
  }
})();
