/* The merge: round one's top bar over the desk, and Focus rebuilt as a session.
   Today is the desk's Today, Calendar is the Planner, To-dos is the Planner with what's due laid out,
   and Focus is a quiet room over the board. Everything that changes the board goes through SR.commit. */
(function () {
  'use strict';
  window.SR_MERGE = true;
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const FKEY = 'sundayreset.focus';
  let focusOpen = false;
  let focus = null; /* the session: what, how long, when it started, paused time */
  let pick = null; /* what's being chosen before a session starts */

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

  /* == the top bar == */
  function buildNav() {
    const nav = $('topnav');
    nav.innerHTML = '';
    const brand = h('div', 'tn-brand');
    const logo = h('span', 'tn-logo'); logo.setAttribute('aria-hidden', 'true'); logo.append(h('i'), h('i'), h('i'));
    brand.append(logo, h('span', 'tn-word', 'Sunday Reset'));
    const tag = h('span', 'tn-tag', 'Sample'); tag.id = 'tn-sample'; brand.appendChild(tag);
    const tabs = h('nav', 'tn-tabs'); tabs.setAttribute('aria-label', 'Views');
    [['today', 'Today', 'T', 'Right now: what you’re in and what’s next'], ['calendar', 'Calendar', 'C', 'Day, week, month, and year on the board'], ['todos', 'To-dos', '', 'What’s due, laid out beside the day'], ['focus', 'Focus', 'F', 'One thing at a time']].forEach(([id, name, key, what]) => {
      const b = h('button', 'tn-tab', name);
      b.type = 'button'; b.dataset.tab = id; b.title = what + (key ? ' (' + key + ')' : '');
      if (id === 'focus') b.appendChild(h('i', 'tn-dot'));
      b.addEventListener('click', () => { SR.Snd.init(); go(id); });
      tabs.appendChild(b);
    });
    const right = h('div', 'tn-right');
    const reset = h('button', 'tn-reset'); reset.type = 'button'; reset.id = 'tn-reset';
    reset.addEventListener('click', () => { SR.Snd.init(); closeFocus(); SR.resetState().run(); });
    const me = h('button', 'tn-me'); me.type = 'button'; me.id = 'tn-me'; me.title = 'Settings: you, the desk, and your data';
    me.addEventListener('click', () => { SR.Snd.init(); closeFocus(); SR.openDrawer(); });
    right.append(reset, me);
    nav.append(brand, tabs, right);
  }

  function active() {
    if (focusOpen) return 'focus';
    const v = SR.view;
    if (v.phone) return SR.phoneDay() ? 'calendar' : 'today';
    if (SR.inToday()) return 'today';
    if (v.bench && v.bench.tab === 'todo') return 'todos';
    return 'calendar';
  }
  function go(id) {
    if (id === 'focus') { openFocus(); return; }
    closeFocus();
    const v = SR.view;
    /* a phone has its own Today (the list) and one day of the desk for the Calendar */
    if (v.phone) {
      if (id === 'calendar') { if (!SR.phoneDay()) SR.openPhoneDesk(); return; }
      if (SR.phoneDay()) SR.closePhoneDesk();
      if (id === 'todos') SR.openDueSoon();
      SR.render();
      return;
    }
    if (id === 'today') { SR.setMode('today'); return; }
    if (v.mode !== 'planner') SR.setMode('planner');
    if (id === 'calendar') { if (v.bench && v.bench.tab === 'todo') SR.closeBench(); else SR.render(); return; }
    if (id === 'todos' && !(v.bench && v.bench.tab === 'todo' && v.bench.level === 'soon')) SR.openDueSoon();
  }

  let navSig = '';
  function syncNav() {
    if (!window.SR || !$('topnav').firstChild) return;
    const a = active(), r = SR.resetState(), p = SR.who();
    const sig = [a, r.label, r.strong, p.name, p.sample, !!focus, focusOpen].join('|');
    if (sig === navSig) return;
    navSig = sig;
    document.querySelectorAll('.tn-tab').forEach((b) => { const on = b.dataset.tab === a; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.querySelector('.tn-tab[data-tab="focus"]').classList.toggle('running', !!focus && !focus.done);
    const rb = $('tn-reset');
    rb.className = 'tn-reset' + (r.strong ? ' strong' : '');
    rb.replaceChildren(SR.icon('calendar', 9, r.strong ? '#FFFFFF' : '#1A1A1A'), h('span', '', r.label));
    rb.title = r.label + (r.done ? '. This week’s is done; open it again any time.' : '');
    const name = (p && p.name) || 'You';
    $('tn-me').textContent = name.slice(0, 1).toUpperCase();
    $('tn-me').setAttribute('aria-label', 'Settings for ' + name);
    $('tn-sample').hidden = !(p && p.sample);
    document.body.classList.toggle('focus-open', focusOpen);
  }
  window.SR_onRender = syncNav;

  /* == Focus == */
  function openFocus() {
    focusOpen = true;
    $('focusroom').hidden = false;
    if (!focus) pick = pick || { step: 'what' };
    drawFocus();
    navSig = ''; syncNav();
    const f = $('focusroom').querySelector('h1, .fr-go, button');
    if (f) f.focus({ preventScroll: true });
  }
  function closeFocus() {
    if (!focusOpen) return;
    focusOpen = false;
    $('focusroom').hidden = true;
    navSig = ''; syncNav();
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

  function brickFor(o, cls) {
    const c = SR.cat(o.cat);
    const b = h('span', 'fr-brick ' + (cls || ''));
    b.style.setProperty('--c', c.base); b.style.setProperty('--ink', c.ink);
    const sock = h('span', 'fr-sock'); sock.appendChild(SR.icon(o.icon || 'star', 10, c.ink));
    b.append(sock, h('span', 'fr-bname', o.name));
    return b;
  }

  function drawFocus() {
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
    const now = SR.nowMin;
    const lens = [];
    const add = (min, label, sub) => { if (min >= 5 && !lens.some((x) => x.min === min)) lens.push({ min, label, sub: sub || 'until ' + SR.M.clock((now + min) % 1440) }); };
    add(25, '25 min'); add(50, '50 min');
    if (o.kind === 'task' && o.dur && o.dur <= 120) add(o.dur, lenWords(o.dur), 'its length, until ' + SR.M.clock((now + o.dur) % 1440));
    const cur = options().find((x) => x.kind === 'block');
    const block = o.kind === 'block' ? o : o.inside || cur;
    if (block && block.until - now >= 10) add(block.until - now, 'Until ' + block.name + ' ends', SR.M.clock(block.until) + ', ' + lenWords(block.until - now));
    const row = h('div', 'fr-lens');
    lens.slice(0, 4).forEach((l, i) => {
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
    drawFocus(); navSig = ''; syncNav();
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
    if (up) {
      card.appendChild(h('p', 'fr-ask', f.brk ? 'Break’s over.' : 'Time’s up. Done, or a little more?'));
      acts.append(btn(f.brk ? 'Back to it' : 'Done', 'fr-go', () => (f.brk ? endBreak() : finish())), btn('10 more min', 'fr-ghost', () => more(10)));
    } else {
      acts.append(btn(f.runningSince ? 'Pause' : 'Resume', 'fr-ghost', toggle), btn('5 more min', 'fr-ghost', () => more(5)), btn(f.brk ? 'End the break' : 'Done', 'fr-go', () => (f.brk ? endBreak() : finish())));
    }
    card.appendChild(acts);
    const quit = h('button', 'fr-quiet', f.brk ? '' : 'Stop without finishing'); quit.type = 'button';
    if (!f.brk) { quit.addEventListener('click', () => { focus = null; saveFocus(); pick = { step: 'what' }; drawFocus(); navSig = ''; syncNav(); }); card.appendChild(quit); }
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
  function finish() {
    const f = focus;
    f.used = used(f); f.runningSince = null; f.done = true;
    const mins = Math.max(1, Math.round(f.used / 60000));
    f.said = mins < 2 ? f.name + ', done' : lenWords(mins) + ' on ' + f.name;
    if (f.task) {
      const t = SR.taskById(f.task);
      if (t && !t.done) { SR.commit(() => { SR.markDone(t, null, true); }); SR.toast(t.name + ', done', 'good', { label: 'Undo', fn: () => SR.undo() }); }
    }
    if (SR.Snd.good) SR.Snd.good();
    saveFocus(); drawFocus(); navSig = ''; syncNav();
  }
  function endBreak() { focus = null; saveFocus(); pick = { step: 'what' }; drawFocus(); navSig = ''; syncNav(); }

  function drawDone(card) {
    const f = focus;
    card.append(h('span', 'fr-kick', 'Done'), h('h1', 'fr-h', f.said + '.'));
    if (f.task) card.appendChild(h('p', 'fr-line', 'It’s checked off on the board.'));
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
      if (focusOpen) drawFocus();
      navSig = ''; syncNav();
      return;
    }
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

  /* == keys: C for the Calendar, F for Focus, Esc out of Focus == */
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (focusOpen && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeFocus(); return; }
    if (!window.SR || (SR.view && SR.view.phone)) return;
    const k = e.key.toLowerCase();
    if (k === 'c') { e.preventDefault(); e.stopImmediatePropagation(); SR.Snd.init(); go('calendar'); }
    else if (k === 'f') { e.preventDefault(); e.stopImmediatePropagation(); SR.Snd.init(); go('focus'); }
    else if (focusOpen && (k === 't' || k === 'p')) { closeFocus(); }
  }, true);

  function boot() {
    if (!window.SR || !$('topnav')) { setTimeout(boot, 50); return; }
    buildNav();
    navSig = '';
    syncNav();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
