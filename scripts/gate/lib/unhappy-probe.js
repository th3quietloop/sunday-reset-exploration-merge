/* The unhappy gate's eyes in the page (scripts/gate/unhappy.mjs, docs/UNHAPPY-GATE.md): what the screen says and what
   can be done on it right now, and every toast that came and went since a state began. Injected once a page load;
   __uh.mark() starts a state's window, __uh.look() reads it. Nothing here changes the page. */
(() => {
  if (window.__uh) return;
  const uh = window.__uh = { toasts: [], heard: [], since: Date.now() };
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const nameOf = (e) => clean(e.getAttribute('aria-label') || e.textContent || e.value || e.title || e.getAttribute('placeholder') || '');
  /* drawn, on screen, and not hidden by anything holding it */
  const shown = (e) => {
    if (!e || !e.isConnected) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return false;
    for (let x = e; x && x !== document.documentElement; x = x.parentElement) {
      if (x.hidden) return false;
      const s = getComputedStyle(x);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    }
    return true;
  };
  const CONTROLS = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=menuitem], [role=tab], [role=checkbox], [role=switch]';
  /* what a person can reach: a sheet, a mat, or Settings over everything takes the screen; otherwise the whole page */
  const LAYERS = '.k-sheet, #sheet, #drawer, .c-mat';
  uh.layer = () => {
    const top = [...document.querySelectorAll(LAYERS)].filter(shown);
    return top.length ? top : [document.body];
  };
  const layerName = (e) => e === document.body ? 'page' : e.id ? '#' + e.id : '.' + String(e.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
  /* the words a person can see in the layer, a line each; prose leaves out what a button says (its label isn't the
     screen saying what happened) */
  const words = (root, prose) => {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = clean(n.nodeValue);
      if (!t) continue;
      const p = n.parentElement;
      if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(p.tagName)) continue;
      if (p.closest('[aria-hidden="true"]') && !p.closest('.toast')) continue;
      if (!shown(p)) continue;
      if (prose && p.closest(CONTROLS)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const r = rg.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      out.push(t);
    }
    return out;
  };
  /* a control a person can use: drawn, not disabled, and nothing over its middle */
  const usable = (e) => {
    if (!shown(e) || e.disabled || e.getAttribute('aria-disabled') === 'true') return false;
    const r = e.getBoundingClientRect();
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === e || e.contains(hit) || hit.contains(e) || !!hit.closest('label') && hit.closest('label').contains(e));
  };
  const controls = (root) => [...root.querySelectorAll(CONTROLS)].filter(usable).map((e) => ({ name: nameOf(e).slice(0, 90), tag: e.tagName.toLowerCase() }));
  /* waiting that never ends: a control that says it's busy (Asking Claude…, Checking…) and can't be pressed */
  const busy = (root) => [...root.querySelectorAll(CONTROLS + ', [aria-busy="true"]')].filter((e) => shown(e) && (e.getAttribute('aria-busy') === 'true' || ((e.disabled || e.getAttribute('aria-disabled') === 'true') && /…$|\.\.\.$|^(Asking|Checking|Saving|Sending|Loading|Linking)\b/i.test(nameOf(e))))).map((e) => nameOf(e).slice(0, 60));
  /* every toast, with its buttons, the moment it shows (a toast can come and go between two looks) */
  const toastName = (t) => clean([...t.childNodes].filter((x) => x.nodeType === 3 || (x.nodeType === 1 && !x.matches('button'))).map((x) => x.textContent).join(' '));
  const seenToast = new WeakSet();
  const lookToasts = () => document.querySelectorAll('.toast').forEach((t) => {
    if (seenToast.has(t)) return;
    seenToast.add(t);
    uh.toasts.push({ at: Date.now(), text: toastName(t), buttons: [...t.querySelectorAll('button')].map(nameOf), kind: String(t.className || '') });
  });
  /* what the page's live region said (a screen reader hears it; it doesn't count as seen words) */
  const live = () => document.querySelectorAll('[aria-live]').forEach((r) => { const t = clean(r.textContent); if (t && uh.heard[uh.heard.length - 1] !== t) uh.heard.push(t); });
  /* (injected before the page has its first element, so it watches the document itself) */
  try { new MutationObserver(() => { lookToasts(); live(); }).observe(document, { childList: true, subtree: true, characterData: true }); } catch (e) { /* looks still read the page */ }
  lookToasts();
  /* a state's window starts now: toasts already showing belong to what came before it */
  uh.mark = () => { lookToasts(); uh.since = Date.now(); uh.toasts = []; uh.heard = []; return uh.since; };
  /* scope: the selectors of the surface a state opened (a panel, Settings, a sheet); its words and controls are what
     the state is judged on, so a bar elsewhere on the page can't answer for it. When none of them shows, the page's
     top layer is read and scoped is false. */
  uh.look = (scope) => {
    lookToasts(); live();
    const inScope = scope ? [...document.querySelectorAll(scope)].filter(shown).filter((e, i, all) => !all.some((o) => o !== e && o.contains(e))) : [];
    const layer = inScope.length ? inScope : uh.layer();
    const said = [], prose = [], can = [], wait = [];
    layer.forEach((e) => { said.push(...words(e)); prose.push(...words(e, true)); can.push(...controls(e)); wait.push(...busy(e)); });
    /* toasts float over everything, so their words and buttons count whatever the layer */
    const toasts = uh.toasts.filter((t) => t.at >= uh.since);
    return { layer: layer.map(layerName), scoped: !scope || inScope.length > 0, words: said, prose, controls: can, busy: wait, toasts, heard: uh.heard.slice(-6), phone: document.body.classList.contains('phone'), w: innerWidth, h: innerHeight };
  };
})();
