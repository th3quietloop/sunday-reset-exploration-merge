/* V11: the phone's sheet (docs/PHONE-REDESIGN.md, 5.1 and 5.2). Its header (Done in the corner on a phone, the
   panel's x on the desk), and its footer, the one next move at the thumb: app.js sheetChrome and sheetFoot, cut
   out and run against a small stand-in for the page. The toast's place over a sheet is in phone-first.test.mjs;
   the sheet's solid foot in frame.test.mjs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { app } from './v11-rig.mjs';

/* a page of elements: children, classes, attributes, data, text, and a query by class */
function page() {
  const all = {};
  const mk = (tag, cls, text) => {
    const e = {
      tagName: String(tag).toUpperCase(), children: [], parentNode: null, attrs: {}, dataset: {}, className: cls || '', textContent: text || '', disabled: false, on: {},
      get classList() { const names = () => e.className.split(/\s+/).filter(Boolean); return { contains: (c) => names().includes(c), add: (c) => { if (!names().includes(c)) e.className = (e.className + ' ' + c).trim(); }, remove: (c) => { e.className = names().filter((x) => x !== c).join(' '); } }; },
      get firstChild() { return e.children[0] || null; },
      appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = e; e.children.push(c); return c; },
      append(...cs) { cs.forEach((c) => (typeof c === 'string' ? e.children.push({ text: c, parentNode: e }) : e.appendChild(c))); },
      insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = e; const i = e.children.indexOf(ref); if (i < 0) e.children.push(c); else e.children.splice(i, 0, c); return c; },
      removeChild(c) { e.children = e.children.filter((x) => x !== c); c.parentNode = null; return c; },
      replaceChildren(...cs) { e.children.forEach((c) => { c.parentNode = null; }); e.children = []; cs.forEach((c) => e.appendChild(c)); },
      setAttribute(k, v) { e.attrs[k] = String(v); },
      getAttribute(k) { return e.attrs[k]; },
      addEventListener(type, fn) { e.on[type] = fn; },
      querySelector(sel) { const want = sel.replace(/^\./, ''); const walk = (n) => { for (const c of n.children || []) { if (c.classList && c.classList.contains(want)) return c; const f = walk(c); if (f) return f; } return null; }; return walk(e); }
    };
    return e;
  };
  const side = mk('aside', 'panel side'), x = mk('button', 'side-x'), inn = mk('div', 'side-in');
  side.append(x, inn);
  all.side = side; all['side-x'] = x; all['side-in'] = inn;
  return { mk, side, x, inn, $: (id) => all[id] };
}

/* the sheet's helpers, cut from app.js, in a world where the window is a phone or the desk */
function sheet(o) {
  const p = page();
  const script = `
    const FEEL = true;
    const view = __view;
    const phoneDay = () => !!__o.phoneDay;
    const $ = __p.$;
    const el = (tag, cls, text) => __p.mk(tag, cls, text);
    const button = (text, cls, fn) => { const b = __p.mk('button', cls == null || cls === '' ? 'small' : cls, text); b.addEventListener('click', fn); return b; };
    const icon = (name) => __p.mk('canvas', 'mark-' + name);
    const sheetDrag = () => {};
    ${app('  const phoneSheet = () =>', '  /* a drag down on the header pulls the sheet down with the finger')}
    ({ sheetChrome, sheetFoot, sheetBack, sheetHead, phoneSheet });`;
  const fns = runInNewContext(script, { __view: { phone: !!o.phone }, __o: o, __p: p });
  return Object.assign({ p }, fns);
}
const kids = (e) => e.children.filter((c) => c.tagName);
const words = (e) => (e.textContent || '') + e.children.map((c) => (c.tagName ? words(c) : c.text)).join('');

test('on a phone the sheet\'s corner is its x, named Close, in its header; on the desk the panel keeps its x where it was', () => {
  const s = sheet({ phone: true });
  s.sheetChrome();
  const head = s.p.side.querySelector('.c-shead');
  assert.ok(head, 'a header row joined the sheet');
  assert.equal(s.p.x.parentNode, head, 'the x stands in the header, beside More');
  assert.equal(s.p.x.getAttribute('aria-label'), 'Close', 'an x, never the word Done (V11-3, D18: Done belongs to the Done circles)');
  assert.ok(head.querySelector('.c-grab'), 'with a grabber');
  assert.equal(kids(s.p.side).indexOf(head) < kids(s.p.side).indexOf(s.p.inn), true, 'the header comes before the body');
  // the window grows past a phone (the Duo opens): the x goes back to its own place, first in the panel
  const d = sheet({ phone: false });
  d.sheetChrome();
  d.p.side.querySelector('.c-shead').appendChild(d.p.x);
  d.sheetChrome();
  d.sheetChrome();
  assert.equal(d.p.x.parentNode, d.p.side, 'on the desk the x is the panel\'s own, as before');
  assert.equal(d.p.side.firstChild, d.p.x, 'first in the panel, where the desk\'s rules for it look');
  assert.equal(d.p.x.getAttribute('aria-label'), 'Close');
});

test('the phone\'s own day is a phone too; Back and More start empty for each panel', () => {
  const s = sheet({ phoneDay: true });
  assert.equal(s.phoneSheet(), true);
  s.sheetChrome();
  s.sheetBack('Study for exam', () => {});
  const back = s.p.side.querySelector('.c-sback');
  assert.equal(kids(back).length, 1);
  assert.equal(kids(back)[0].getAttribute('aria-label'), 'Back to Study for exam', 'Back says where it goes');
  assert.equal(words(kids(back)[0]), 'Study for exam');
  s.sheetChrome();
  assert.equal(kids(back).length, 0, 'the next panel starts without the last one\'s Back');
});

test('a sheet\'s footer is one line and its next move: a quiet button, then the one gold button', () => {
  const s = sheet({ phone: true });
  const body = s.p.mk('div', 'side-in');
  let changed = 0, quiet = 0, gold = 0;
  const f = s.sheetFoot(body, { line: '30 min a day, Thu to Tue.', change: () => changed++, quiet: ['Give it one time', () => quiet++], gold: ['Put them on my week', () => gold++, 'td-put'] });
  assert.equal(f.className, 'c-sfoot');
  assert.equal(body.children[body.children.length - 1], f, 'last in the panel, where it pins');
  const [line, btns] = kids(f);
  assert.equal(line.className, 'c-sf-line');
  assert.equal(words(line), '30 min a day, Thu to Tue. Change', 'the line, then a quiet Change on it');
  kids(line)[0].on.click();
  assert.equal(changed, 1);
  const [q, g] = kids(btns);
  assert.deepEqual([words(q), q.className], ['Give it one time', 'small c-sf-q'], 'quiet first');
  assert.deepEqual([words(g), g.className, g.dataset.fk], ['Put them on my week', 'go c-sf-g', 'td-put'], 'then gold, with its own focus key');
  g.on.click(); q.on.click();
  assert.deepEqual([quiet, gold], [1, 1]);
});

test('a gold button that can\'t be used yet says why on the line above it; two equal answers are two quiet halves', () => {
  const s = sheet({ phone: true });
  const body = s.p.mk('div', 'side-in');
  const f = s.sheetFoot(body, { line: 'Pick at least one day to go on.', gold: ['Next', () => {}], off: true });
  const [line, btns] = kids(f);
  assert.ok(line.classList.contains('why'), 'the line says why, in words');
  assert.equal(kids(btns)[0].disabled, true);
  const t = s.sheetFoot(body, { line: 'Didn’t get to it moves it to Sat at 9:15 am.', two: [['Didn’t get to it', () => {}], ['Mark it done', () => {}]] });
  const halves = kids(kids(t)[1]);
  assert.deepEqual(halves.map((b) => b.className), ['small c-sf-q c-sf-half', 'small c-sf-q c-sf-half'], 'neither is gold: either answer is fine');
});

test('nothing to do now: the footer is only its line, and a footer with nothing in it isn\'t drawn', () => {
  const s = sheet({ phone: true });
  const body = s.p.mk('div', 'side-in');
  const f = s.sheetFoot(body, { line: 'You’re set. Next: tomorrow at 7:30 am.' });
  assert.equal(kids(f).length, 1, 'no button, and no gold: that is the answer');
  assert.equal(s.sheetFoot(body, {}), null);
  assert.equal(body.children.length, 1);
});
