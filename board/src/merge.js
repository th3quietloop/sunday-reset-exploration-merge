/* The merge: round one's top bar over the desk, and Focus rebuilt as a session.
   Today is the desk's Today, Calendar is the Planner, To-dos is the Planner with what's due laid out,
   and Focus is a quiet room over the board. Everything that changes the board goes through SR.commit. */
(function () {
  'use strict';
  window.SR_MERGE = true;
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };

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
    reset.addEventListener('click', () => { SR.Snd.init(); SRFocus.close(); SR.resetState().run(); });
    const me = h('button', 'tn-me'); me.type = 'button'; me.id = 'tn-me'; me.title = 'Settings: you, the desk, and your data';
    me.addEventListener('click', () => { SR.Snd.init(); SRFocus.close(); SR.openDrawer(); });
    right.append(reset, me);
    nav.append(brand, tabs, right);
  }

  function active() {
    if (window.SRFocus && SRFocus.isOpen) return 'focus';
    const v = SR.view;
    if (v.phone) return SR.phoneDay() ? 'calendar' : 'today';
    if (SR.inToday()) return 'today';
    if (v.bench && v.bench.tab === 'todo') return 'todos';
    return 'calendar';
  }
  function go(id) {
    if (id === 'focus') { SRFocus.open(); return; }
    SRFocus.close();
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
    const sig = [a, r.label, r.strong, p.name, p.sample, SRFocus.running, SRFocus.isOpen].join('|');
    if (sig === navSig) return;
    navSig = sig;
    document.querySelectorAll('.tn-tab').forEach((b) => { const on = b.dataset.tab === a; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.querySelector('.tn-tab[data-tab="focus"]').classList.toggle('running', SRFocus.running);
    const rb = $('tn-reset');
    rb.className = 'tn-reset' + (r.strong ? ' strong' : '');
    rb.replaceChildren(SR.icon('calendar', 9, r.strong ? '#FFFFFF' : '#1A1A1A'), h('span', '', r.label));
    rb.title = r.label + (r.done ? '. This week’s is done; open it again any time.' : '');
    const name = (p && p.name) || 'You';
    $('tn-me').textContent = name.slice(0, 1).toUpperCase();
    $('tn-me').setAttribute('aria-label', 'Settings for ' + name);
    $('tn-sample').hidden = !(p && p.sample);
    document.body.classList.toggle('focus-open', SRFocus.isOpen);
  }
  window.SR_onRender = syncNav;

  /* == keys: C for the Calendar, F for Focus, Esc out of Focus == */
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (!window.SR || (SR.view && SR.view.phone)) return;
    const k = e.key.toLowerCase();
    if (k === 'c') { e.preventDefault(); e.stopImmediatePropagation(); SR.Snd.init(); go('calendar'); }
    else if (k === 'f') { e.preventDefault(); e.stopImmediatePropagation(); SR.Snd.init(); go('focus'); }
    else if (SRFocus.isOpen && (k === 't' || k === 'p')) { SRFocus.close(); }
  }, true);

  function boot() {
    if (!window.SR || !$('topnav')) { setTimeout(boot, 50); return; }
    buildNav();
    SRFocus.onChange = () => { navSig = ''; syncNav(); };
    navSig = '';
    syncNav();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
