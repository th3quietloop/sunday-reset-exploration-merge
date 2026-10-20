/* Focus, rebuilt as a session: pick what, then how long, with time in words. A quiet room over the
   board. Shared by every version of the merge; the chrome around it calls SRFocus.open(). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const FKEY = 'sundayreset.focus';
  let focusOpen = false;
  let focus = null; /* the session: what, how long, when it started, paused time */
  let pick = null; /* what's being chosen before a session starts */
  /* V11-2 (Russell's pick, Oct 20): a version with a side panel of its own draws Focus there (SRFocus.usePanel): the
     dark panel on the desk and the sheet on a phone. The session and its rules stay here; this room stays for the
     versions without one. { open, close, isOpen, draw, tick, changed } */
  let panel = null;

  try { focus = JSON.parse(localStorage.getItem(FKEY) || 'null'); } catch (e) { focus = null; }
  const saveFocus = () => { try { if (focus) localStorage.setItem(FKEY, JSON.stringify(focus)); else localStorage.removeItem(FKEY); } catch (e) { /* storage off */ } };

  /* == words for time == */
  const clockAt = (ms) => { const d = new Date(ms); return SR.M.clock(d.getHours() * 60 + d.getMinutes()); };
  const leftWords = (ms) => {
    const m = Math.ceil(ms / 60000);
    if (ms <= 0) return 'Time’s up';
    if (ms < 60000) return 'Less than a minute';
    if (m < 60) return m + ' min left';
    const hr = Math.floor(m / 60), mn = m % 60;
    return hr + ' h' + (mn ? ' ' + mn + ' min' : '') + ' left';
  };
  const lenWords = (min) => (min < 60 ? min + ' min' : Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : ''));
  const used = (f) => f.used + (f.runningSince ? Date.now() - f.runningSince : 0);
  const leftMs = (f) => f.total * 60000 - used(f);
  const endsAt = (f) => Date.now() + Math.max(0, leftMs(f));

  /* == Focus == */
  function openFocus() {
    if (panel) { panel.open(); changed(); return; }
    focusOpen = true;
    $('focusroom').hidden = false;
    document.body.classList.add('focus-open');
    if (!focus) pick = pick || { step: 'what' };
    drawFocus();
    changed();
    const f = $('focusroom').querySelector('h1, .fr-go, button');
    if (f) f.focus({ preventScroll: true });
  }
  function closeFocus() {
    if (panel) { if (panel.isOpen()) { panel.close(); changed(); } return; }
    if (!focusOpen) return;
    focusOpen = false;
    $('focusroom').hidden = true;
    document.body.classList.remove('focus-open');
    changed();
    document.title = 'Sunday Reset';
  }

  /* what can be focused on: the block you're in, then what's due, then the rest of the list */
  function options() {
    const info = SR.nowNow(), out = [];
    if (info.kind === 'block' && info.block && !info.block.sleep) {
      const b = info.block;
      out.push({ kind: 'block', key: b.base || b.key, name: SR.blockName(b), cat: b.cat, icon: b.icon || 'star', until: info.end, left: info.left, sub: 'Now, until ' + SR.M.clock(info.end) });
    }
    const seen = new Set();
    const due = SR.dueList().list.map((x) => x.task);
    const rest = SR.state.tasks.filter((t) => !t.done && !t.archived);
    for (const t of due.concat(rest)) {
      if (seen.has(t.id) || out.length > 5) continue;
      seen.add(t.id);
      out.push({ kind: 'task', id: t.id, name: t.name, cat: t.cat || 'yours', icon: t.icon || 'check', dur: SR.M.taskDur(t), sub: t.due ? 'Due ' + SR.M.relText(t.due, SR.today) : 'To do, ' + lenWords(SR.M.taskDur(t)) });
    }
    return out;
  }

  /* V11-2 (Russell's list, Oct 20): what a session has to stop before, after now today: a locked block, sleep, or a
     time with people (Family, You and Kim, Friends, a meeting). Its name, when it starts, and how far off it is */
  const PEOPLE = ['family', 'us', 'friends'];
  function wall(now, blocks) {
    const next = (blocks || []).filter((b) => b.start > now && (b.fixed || b.sleep || b.meeting || PEOPLE.includes(b.cat))).sort((a, b) => a.start - b.start)[0];
    if (!next) return null;
    return { name: next.sleep ? 'bed' : SR.blockName(next), at: next.start, min: next.start - now };
  }
  /* the lengths a session can take, each one ending before the wall, and the wall itself named last ("Until Pick up
     Robin at 4:45 pm"); four at most */
  function lengths(o, now, cur, w) {
    const room = w ? w.min : Infinity, out = [];
    const add = (min, label, sub) => { if (min >= 5 && min <= room && !out.some((x) => x.min === min)) out.push({ min, label, sub: sub || 'until ' + SR.M.clock((now + min) % 1440) }); };
    add(25, '25 min'); add(50, '50 min');
    if (o.kind === 'task' && o.dur && o.dur <= 120) add(o.dur, lenWords(o.dur), 'its length, until ' + SR.M.clock((now + o.dur) % 1440));
    const block = o.kind === 'block' ? o : o.inside || cur;
    /* (a block that ends where the wall begins ends because of it: the wall names that time, Until Pick up Robin) */
    if (block && block.until - now >= 10 && !(w && block.until >= w.at)) add(block.until - now, 'Until ' + block.name + ' ends', SR.M.clock(block.until) + ', ' + lenWords(block.until - now));
    const list = out.slice(0, w ? 3 : 4);
    if (w && w.min >= 5) list.push({ min: w.min, label: 'Until ' + w.name + ' at ' + SR.M.clock(w.at), sub: lenWords(w.min) + ' from now' });
    return list.filter((x, i) => !list.slice(i + 1).some((y) => y.min === x.min));
  }

  function brickFor(o, cls) {
    const c = SR.cat(o.cat);
    const b = h('span', 'fr-brick ' + (cls || ''));
    b.style.setProperty('--c', c.base); b.style.setProperty('--ink', c.ink);
    const sock = h('span', 'fr-sock'); sock.appendChild(SR.icon(o.icon || 'star', 10, c.ink));
    b.append(sock, h('span', 'fr-bname', o.name));
    return b;
  }

  function drawFocus() {
    if (panel) { panel.draw(); return; }
    const room = $('focusroom');
    room.replaceChildren();
    const x = h('button', 'fr-x'); x.type = 'button'; x.setAttribute('aria-label', 'Back to the board'); x.title = 'Back to the board (Esc)';
    x.appendChild(SR.icon('x', 9, '#1A1A1A'));
    x.addEventListener('click', () => closeFocus());
    const card = h('div', 'fr-card');
    room.append(x, card);
    if (focus && focus.done) return drawDone(card);
    if (focus) return drawSession(card);
    if (pick.step === 'part') return drawPart(card);
    if (pick.step === 'long') return drawLong(card);
    drawWhat(card);
  }

  function drawWhat(card) {
    card.append(h('span', 'fr-kick', 'Focus'), h('h1', 'fr-h', 'What are you focusing on?'));
    const list = h('div', 'fr-list');
    const opts = options();
    opts.forEach((o) => {
      const b = h('button', 'fr-opt'); b.type = 'button';
      b.append(brickFor(o), h('span', 'fr-sub', o.sub));
      b.addEventListener('click', () => {
        pick = { step: 'long', what: o };
        /* a long block asks what part of it first */
        if (o.kind === 'block' && o.left > 60 && opts.some((x) => x.kind === 'task')) pick.step = 'part';
        drawFocus();
      });
      list.appendChild(b);
    });
    card.appendChild(list);
    const own = h('form', 'fr-own');
    const inp = h('input', 'fr-in'); inp.placeholder = 'Or type what it is'; inp.setAttribute('aria-label', 'Something else to focus on');
    const go = h('button', 'fr-ghost', 'Next'); go.type = 'submit';
    own.append(inp, go);
    own.addEventListener('submit', (e) => { e.preventDefault(); const n = inp.value.trim(); if (!n) { inp.focus(); return; } pick = { step: 'long', what: { kind: 'own', name: n, cat: 'yours', icon: 'star' } }; drawFocus(); });
    card.appendChild(own);
  }

  function drawPart(card) {
    const o = pick.what;
    card.append(back(() => { pick = { step: 'what' }; drawFocus(); }), h('span', 'fr-kick', 'Focus'), h('h1', 'fr-h', 'What part of ' + o.name + '?'));
    card.appendChild(h('p', 'fr-line', o.name + ' runs until ' + SR.M.clock(o.until) + '. Pick one thing inside it, or keep it whole.'));
    const list = h('div', 'fr-list');
    options().filter((x) => x.kind === 'task').sort((x, y) => (y.cat === o.cat) - (x.cat === o.cat)).slice(0, 5).forEach((t) => {
      const b = h('button', 'fr-opt'); b.type = 'button';
      b.append(brickFor(t), h('span', 'fr-sub', t.sub));
      b.addEventListener('click', () => { pick = { step: 'long', what: Object.assign({}, t, { inside: o }) }; drawFocus(); });
      list.appendChild(b);
    });
    const whole = h('button', 'fr-opt'); whole.type = 'button';
    whole.append(brickFor(o), h('span', 'fr-sub', 'All of ' + o.name + ', until ' + SR.M.clock(o.until)));
    whole.addEventListener('click', () => { pick = { step: 'long', what: o }; drawFocus(); });
    list.appendChild(whole);
    card.appendChild(list);
  }

  function drawLong(card) {
    const o = pick.what;
    card.append(back(() => { pick = { step: 'what' }; drawFocus(); }), h('span', 'fr-kick', 'Focus'));
    card.appendChild(brickFor(o, 'fr-big'));
    card.appendChild(h('h1', 'fr-h fr-h2', 'For how long?'));
    const now = SR.nowMin, w = wall(now, (SR.day(SR.today) || {}).blocks);
    const lens = lengths(o, now, options().find((x) => x.kind === 'block'), w);
    /* (nothing fits before what's next: say so, plainly) */
    if (!lens.length && w) card.appendChild(h('p', 'fr-line', (w.name === 'bed' ? 'Bed' : w.name) + ' is at ' + SR.M.clock(w.at) + ', in ' + lenWords(Math.max(1, w.min)) + '. That’s too close to start one.'));
    const row = h('div', 'fr-lens');
    lens.forEach((l, i) => {
      const b = h('button', 'fr-len' + (i === 0 ? ' fr-first' : '')); b.type = 'button';
      b.append(h('b', '', l.label), h('span', '', l.sub));
      b.addEventListener('click', () => start(o, l.min));
      row.appendChild(b);
    });
    card.appendChild(row);
  }

  function back(fn) {
    const b = h('button', 'fr-back'); b.type = 'button';
    b.append(SR.icon('left', 8, '#1A1A1A'), h('span', '', 'Back'));
    b.addEventListener('click', fn);
    return b;
  }

  function start(o, min, isBreak) {
    focus = { name: o.name, cat: o.cat, icon: o.icon, kind: o.kind, task: o.kind === 'task' ? o.id : null, inside: o.inside ? o.inside.name : null, total: min, used: 0, runningSince: Date.now(), brk: !!isBreak, date: SR.today };
    pick = null;
    saveFocus();
    SR.Snd.clack && SR.Snd.clack(0.5);
    drawFocus(); changed();
  }

  let sessionEls = null;
  function drawSession(card) {
    const f = focus, c = SR.cat(f.cat);
    card.classList.add('fr-wide-card');
    card.appendChild(h('span', 'fr-kick', f.brk ? 'A break' : f.runningSince ? 'Focusing' : 'Paused'));
    const brick = h('div', 'fr-session');
    brick.style.setProperty('--c', c.base); brick.style.setProperty('--ink', c.ink);
    const worn = h('span', 'fr-worn');
    const sock = h('span', 'fr-sock fr-sock-big'); sock.appendChild(SR.icon(f.icon || 'star', 18, c.ink));
    const words = h('span', 'fr-words');
    const left = h('b', 'fr-left'), until = h('span', 'fr-until');
    words.append(h('span', 'fr-name', f.name), left, until);
    brick.append(worn, sock, words);
    card.appendChild(brick);
    if (f.inside) card.appendChild(h('p', 'fr-line', 'Part of ' + f.inside));
    const acts = h('div', 'fr-acts');
    const up = leftMs(f) <= 0;
    /* V11-2 (Russell's list, Oct 20): time running out never marks anything done; only Mark it done does, for a to-do,
       and it checks off its steps too. Done ends a session on a block or your own thing, which has nothing to mark */
    const isTask = !!f.task && !f.brk;
    if (up) {
      card.appendChild(h('p', 'fr-ask', f.brk ? 'Break’s over.' : isTask ? 'Time’s up. Is it done?' : 'Time’s up. Done, or a little more?'));
      if (f.brk) acts.append(btn('Back to it', 'fr-go', () => endBreak()), btn('10 more min', 'fr-ghost', () => more(10)));
      else if (isTask) acts.append(btn('Mark it done', 'fr-go', () => finish(true)), btn('10 more min', 'fr-ghost', () => more(10)), btn('Stop here', 'fr-ghost', () => finish(false)));
      else acts.append(btn('Done', 'fr-go', () => finish(false)), btn('10 more min', 'fr-ghost', () => more(10)));
    } else {
      acts.append(btn(f.runningSince ? 'Pause' : 'Resume', 'fr-ghost', toggle), btn('5 more min', 'fr-ghost', () => more(5)), btn(f.brk ? 'End the break' : isTask ? 'Mark it done' : 'Done', 'fr-go', () => (f.brk ? endBreak() : finish(isTask))));
    }
    card.appendChild(acts);
    /* (once the time is up its row has Stop here, so this goes) */
    const quit = h('button', 'fr-quiet', f.brk ? '' : 'Stop without finishing'); quit.type = 'button';
    if (!f.brk && !up) { quit.addEventListener('click', () => { focus = null; saveFocus(); pick = { step: 'what' }; drawFocus(); changed(); }); card.appendChild(quit); }
    sessionEls = { worn, left, until, up };
    tick();
  }
  const btn = (label, cls, fn) => { const b = h('button', cls, label); b.type = 'button'; b.addEventListener('click', () => { SR.Snd.init(); fn(); }); return b; };
  function toggle() {
    const f = focus;
    if (f.runningSince) { f.used = used(f); f.runningSince = null; } else f.runningSince = Date.now();
    saveFocus(); drawFocus();
  }
  function more(min) {
    const f = focus;
    if (leftMs(f) <= 0) { f.used = used(f); f.total = Math.ceil(f.used / 60000); if (!f.runningSince) f.runningSince = Date.now(); }
    f.total += min; f.chimed = false;
    saveFocus(); drawFocus();
  }
  function finish(mark) {
    const f = focus;
    f.used = used(f); f.runningSince = null; f.done = true; f.marked = false;
    const mins = Math.max(1, Math.round(f.used / 60000));
    /* (marked: the to-do and every step of it, in one change, with Undo) */
    if (mark && f.task) {
      const t = SR.taskById(f.task);
      if (t && !t.done) { SR.commit(() => { SR.markDone(t, null, true); }); f.marked = true; SR.toast(t.name + ' is done.', 'good', { label: 'Undo', fn: () => SR.undo() }); }
    }
    f.said = f.marked && mins < 2 ? f.name + ', done' : lenWords(mins) + ' on ' + f.name;
    if (SR.Snd.good) SR.Snd.good();
    saveFocus(); drawFocus(); changed();
  }
  function endBreak() { focus = null; saveFocus(); pick = { step: 'what' }; drawFocus(); changed(); }

  function drawDone(card) {
    const f = focus;
    card.append(h('span', 'fr-kick', 'Done'), h('h1', 'fr-h', f.said + '.'));
    if (f.marked) card.appendChild(h('p', 'fr-line', 'It’s checked off on the board.'));
    const next = options().find((o) => o.kind === 'task' && o.id !== f.task);
    const acts = h('div', 'fr-acts fr-col');
    acts.appendChild(btn('Take a 5 min break', 'fr-ghost fr-wide', () => start({ name: 'Break', cat: 'open', icon: 'cup' }, 5, true)));
    if (next) {
      const b = h('button', 'fr-ghost fr-wide fr-nextup'); b.type = 'button';
      b.append(h('span', '', 'Next: '), brickFor(next, 'fr-inline'));
      b.addEventListener('click', () => { focus = null; saveFocus(); pick = { step: 'long', what: next }; drawFocus(); });
      acts.appendChild(b);
    }
    acts.appendChild(btn('Back to the board', 'fr-go fr-wide', () => { focus = null; saveFocus(); pick = null; closeFocus(); }));
    card.appendChild(acts);
  }

  /* minutes, not seconds: the words change once a minute, the wear moves smoothly */
  function tick() {
    if (!focus || focus.done) return;
    const f = focus, ms = leftMs(f);
    if (ms <= 0 && !f.chimed) {
      f.chimed = true; f.used = f.total * 60000; f.runningSince = null; saveFocus();
      if (SR.Snd.good) SR.Snd.good();
      if (focusOpen || (panel && panel.isOpen())) drawFocus();
      changed();
      return;
    }
    /* (the panel puts the minutes left and the wear in place itself) */
    if (panel) { if (panel.isOpen()) panel.tick(); return; }
    if (sessionEls && focusOpen) {
      sessionEls.worn.style.width = Math.min(100, (used(f) / (f.total * 60000)) * 100).toFixed(2) + '%';
      const lw = leftWords(ms);
      if (sessionEls.left.textContent !== lw) sessionEls.left.textContent = lw;
      const uw = f.runningSince ? 'until ' + clockAt(endsAt(f)) : 'paused, ' + lenWords(Math.max(1, Math.ceil(ms / 60000))) + ' to go';
      if (sessionEls.until.textContent !== uw) sessionEls.until.textContent = uw;
      document.title = lw + ' · ' + f.name;
    }
  }
  setInterval(tick, 1000);

  const changed = () => { if (window.SRFocus.onChange) window.SRFocus.onChange(); if (panel && panel.changed) panel.changed(); };
  document.addEventListener('keydown', (e) => {
    if (focusOpen && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeFocus(); }
  }, true);
  /* (stopped without finishing, or after it's done: nothing is kept, and the next open starts at the pick) */
  function clear() { focus = null; pick = panel ? null : { step: 'what' }; saveFocus(); drawFocus(); changed(); }
  window.SRFocus = {
    open: openFocus, close: closeFocus, get isOpen() { return panel ? panel.isOpen() : focusOpen; }, get running() { return !!focus && !focus.done; }, onChange: null,
    /* V11-2: what a side panel draws Focus from (usePanel), and what its buttons do */
    usePanel(p) { panel = p || null; },
    get session() { return focus; },
    left() { if (!focus) return null; const ms = leftMs(focus); return { ms, used: used(focus), total: focus.total * 60000, up: ms <= 0, ends: endsAt(focus) }; },
    options, wall, lengths, lenWords, leftWords, clockAt,
    start: (o, min, isBreak) => start(o, min, isBreak), toggle: () => toggle(), more: (min) => more(min), finish: (mark) => finish(mark), endBreak: () => endBreak(), clear
  };
})();
