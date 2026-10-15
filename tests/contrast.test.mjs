// V11's contrast, held without a browser. The words and edges V11 is drawn with are tokens (the gold in
// variants/kit/kit.css, the surface system at the top of variants/corners11/polish.css, the words on the
// phone's desk and the edges of fields, switches, and focus rings in variants/corners11/css/contrast.css,
// and the paper notes in board/src/style.css). Each is read out of the CSS, laid over what it sits on, and
// measured the way WCAG 2.2 does: 4.5 to 1 for words, 3 to 1 for an edge or a ring. The browser lane (npm run
// contrast, scripts/gate/contrast.mjs) measures every screen as it's drawn; this keeps a token from drifting
// under the bar between runs of it. docs/CONTRAST.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
/* the files V11's page loads, in its order: the board's own sheet, the kit, V11's, its finishing pass, then
   this lane's (variants/corners11/css/contrast.css loads after polish.css) */
const BOARD = read('board/src/style.css');
const KIT = read('variants/kit/kit.css');
const VARIANT = read('variants/corners11/variant.css');
const POLISH = read('variants/corners11/polish.css');
const OWN = read('variants/corners11/css/contrast.css');

/* every custom property set in a :root block, the last one winning, across the files in load order */
function tokensOf(...texts) {
  const out = {};
  for (const t of texts) for (const m of t.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/:root\s*\{([^}]*)\}/g)) for (const d of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}
const T = tokensOf(BOARD, KIT, VARIANT, POLISH, OWN);
/* a token's value with var() references followed */
const tok = (name, depth = 0) => {
  const v = T[name];
  assert.ok(v, 'no token --' + name);
  const m = /^var\(--([\w-]+)(?:,[^)]*)?\)$/.exec(v);
  return m && depth < 8 ? tok(m[1], depth + 1) : v;
};

/* colors: #hex or rgb()/rgba(), to [r, g, b, a] */
function color(s) {
  s = String(s).trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) { let h = m[1]; if (h.length <= 4) h = h.split('').map((x) => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; }
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
  throw new Error('not a color here: ' + s);
}
const over = (fg, bg) => { const f = color(fg), b = Array.isArray(bg) ? bg : color(bg); return [0, 1, 2].map((i) => b[i] + f[3] * (f[i] - b[i])).concat(1); };
const stack = (...layers) => layers.slice(1).reduce((bg, l) => over(l, bg), color(layers[0]));
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (fg, bg) => { const b = Array.isArray(bg) ? bg : color(bg); const f = over(fg, b); const x = lum(f), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const at = (n, need, what) => assert.ok(n >= need, what + ': ' + n.toFixed(2) + ' to 1, under ' + need);

/* what V11's surface is laid on: the palest board (the worst case for light words on the glass) */
const PALEST = 'rgb(240, 215, 170)';
const surface = () => stack(PALEST, tok('sf'));
const raised = () => over(tok('sf-raised'), surface());
const hover = () => over(tok('sf-hover'), surface());

test('words on the surface: white, the two greys, and the quiet grey pass on it, raised, and hovered', () => {
  for (const w of ['tx', 'tx-2', 'tx-3']) for (const [name, bg] of [['the surface', surface()], ['a raised row', raised()], ['a hovered row', hover()]]) at(ratio(tok(w), bg), 4.5, '--' + w + ' on ' + name);
  at(ratio(tok('tx-4'), surface()), 4.5, '--tx-4 on the surface');
  at(ratio(tok('tx-4'), raised()), 4.5, '--tx-4 on a raised row');
  /* the solid surface (the phone's bars, the hover note, the kinds of day) */
  for (const w of ['tx-2', 'tx-3', 'tx-4']) at(ratio(tok(w), tok('sf-solid')), 4.5, '--' + w + ' on --sf-solid');
});

test('a placeholder reads in a field, even a field on a raised row', () => {
  const field = over('rgba(255, 255, 255, 0.06)', raised());
  at(ratio(tok('field-hint'), field), 4.5, '--field-hint in a field on a raised row');
  at(ratio(tok('field-hint'), over('rgba(255, 255, 255, 0.06)', surface())), 4.5, '--field-hint in a field on the surface');
});

test('the one call to action: near black on gold and on its hover, and gold words on the surface and its soft fill', () => {
  at(ratio(tok('sf-ink'), tok('k-gold')), 4.5, '--sf-ink on --k-gold');
  at(ratio(tok('sf-ink'), tok('gold-hi')), 4.5, '--sf-ink on --gold-hi');
  at(ratio(tok('sf-ink'), '#FFFFFF'), 4.5, '--sf-ink on white (selected)');
  at(ratio(tok('k-gold'), surface()), 4.5, 'gold words on the surface');
  at(ratio(tok('k-gold'), over(tok('cta-fill'), surface())), 4.5, 'gold words on --cta-fill');
  at(ratio(tok('k-gold'), over(tok('cta-hover'), surface())), 4.5, 'gold words on --cta-hover');
});

test('a field has an edge you can see: 3 to 1 on the surface, a raised row, and the solid bars', () => {
  for (const [name, bg] of [['the surface', surface()], ['a raised row', raised()], ['--sf-solid', color(tok('sf-solid'))]]) at(ratio(tok('field-edge'), bg), 3, '--field-edge on ' + name);
  /* and the rule that draws it reads the token */
  assert.match(OWN, /\.input\b[^{]*\{[^}]*border-color:\s*var\(--field-edge\)/, 'css/contrast.css gives .input the --field-edge border');
});

test('a switch shows on and off: its track 3 to 1 on its row, and the white knob 3 to 1 on the track', () => {
  for (const [name, bg] of [['a switch’s row', raised()], ['a hovered row', hover()]]) {
    at(ratio(tok('switch-on'), bg), 3, '--switch-on on ' + name);
    at(ratio(tok('switch-off'), bg), 3, '--switch-off on ' + name);
  }
  at(ratio('#FFFFFF', color(tok('switch-on'))), 3, 'the knob on --switch-on');
  at(ratio('#FFFFFF', over(tok('switch-off'), raised())), 3, 'the knob on --switch-off');
  assert.match(OWN, /\.switch\[aria-checked="true"\] \.sw-track\s*\{[^}]*var\(--switch-on\)/, 'an on switch’s track reads --switch-on');
});

test('focus rings: white on the surface, and the dark ring on the phone’s desk and the wood', () => {
  at(ratio('#FFFFFF', surface()), 3, 'a white ring on the surface');
  at(ratio('#FFFFFF', raised()), 3, 'a white ring on a raised row');
  for (const bg of ['#C99D66', '#B08250', '#E2C08E']) at(ratio(tok('ring-dark'), bg), 3, '--ring-dark on ' + bg);
});

test('words on the phone’s desk (the list’s times, open time, Bed, Earlier) pass all the way down its gradient', () => {
  /* the gradient (#C99D66 to #B08250), the darkest end under the bottom bar’s shadow, and Earlier’s chip on it */
  const darkest = color('#B08250');
  const shadowed = over('rgba(0, 0, 0, 0.08)', darkest);
  const chip = over('rgba(63, 42, 18, 0.12)', darkest);
  for (const [name, bg] of [['the top of the gradient', color('#C99D66')], ['its darkest end', darkest], ['under the bottom bar’s shadow', shadowed], ['Earlier’s chip', chip]]) at(ratio(tok('desk-ink'), bg), 4.5, '--desk-ink on ' + name);
});

test('a note from the app is paper with its own dark ink (it was dark on dark, about 1.2 to 1)', () => {
  const paper = /\.td-card\.td-note\s*\{[^}]*background:\s*(#[0-9A-Fa-f]{6})/.exec(BOARD)[1];
  const ink = /\.td-note h2\s*\{[^}]*color:\s*(#[0-9A-Fa-f]{6})/.exec(BOARD)[1];
  const line = /\.td-note p\s*\{[^}]*color:\s*(#[0-9A-Fa-f]{6})/.exec(BOARD)[1];
  at(ratio(ink, paper), 4.5, 'a note’s title on its paper');
  at(ratio(line, paper), 4.5, 'a note’s line on its paper');
  at(ratio(ink, over('rgba(42, 33, 24, 0.14)', paper)), 4.5, 'a note’s quiet button, hovered');
  /* V11's one surface for every card leaves the notes out, so the paper and its ink stay together */
  assert.match(POLISH, /\.td-card:not\(\.td-note\)[^{]*\{[^}]*background:\s*var\(--sf\)/, 'the surface rule leaves .td-note alone');
  assert.doesNotMatch(POLISH.replace(/\/\*[\s\S]*?\*\//g, ''), /\.td-card\s*[,{]/, 'no rule darkens every .td-card');
});
