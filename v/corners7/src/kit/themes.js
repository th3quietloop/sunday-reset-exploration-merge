/* Sunday Reset desk kit: colorways, desk woods, mats, inks, lights, themes, and layouts.
   Plain data plus a few pure helpers, with no DOM and no Three.js, so it loads in node for the tests
   (module.exports) and in the browser as window.DeskThemes. The geometry lives in src/kit/kit-data.js
   (window.PropKit) and src/props-data.js (window.PropData); the canvas painters for the woods and
   mats live in src/kit/desk-paint.js. See docs/DESK-KIT.md for the contract. */
(function (root) {
  'use strict';

  /* == material roles ==
     Every baked material names its role, so a colorway is a palette of roles. A group's color is
     shade(palette[role], s): s below zero leans toward near black, above zero toward warm white.
     Roles a palette leaves out keep the thing's own baked color. */
  const ROLES = {
    body: 'The main painted, glazed, or dyed surface: a mug, a pot, a lamp shade, a clock case',
    accent: 'The second color: a band, a rim, a base, a lid',
    trim: 'A third color, when a thing has one: the third book, a ribbon',
    metal: 'Brass, steel, and iron fittings. A colorway changes their color, never their shine',
    glass: 'Clear parts, drawn a little see through',
    leaf: 'Leaves and stems',
    bloom: 'Flowers, fruit, and berries',
    soil: 'Soil, sand, and pebbles',
    drink: 'What is in a cup',
    wood: 'Bare or painted wood',
    glow: 'Parts that give light: bulbs and flames. They glow',
    paper: 'Pages, dials, labels, and the inside of a shade',
    ink: 'Print, ticks, lead, and hands'
  };
  const DARK = '#141210', LIGHT = '#FFF8E6';

  /* == color math, the same as scene.js == */
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(c) { return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function mix(a, b, t) { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); }
  function shade(hex, s) { return !s ? hex.toUpperCase() : mix(hex, s < 0 ? DARK : LIGHT, Math.min(1, Math.abs(s))); }
  function relLum(h) { const [r, g, b] = hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function contrast(a, b) { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /* paint a translucent color over a base: rgb [r, g, b] at alpha a, n times */
  function over(base, rgb, a, n) { let c = base; for (let i = 0; i < (n || 1); i++) c = mix(c, rgbToHex(rgb), a); return c; }
  function pickInk(bg, base) {
    const tries = ['#FFFFFF', mix(base, DARK, 0.55), mix(base, DARK, 0.72), '#1E1A14'];
    for (const t of tries) if (contrast(bg, t) >= 4.6) return t;
    return tries.reduce((a, t) => (contrast(bg, t) > contrast(bg, a) ? t : a), tries[0]);
  }

  /* == colorways ==
     A colorway is a palette of roles, tuned per finish: the same name (blush, forest) means the
     right thing on glazed ceramic, painted enamel, paper, cloth, glass, and wood. Every thing has
     a finish and its own look ('own', which is its baked colors); the rest are these. */
  const FINISHES = {
    ceramic: {
      name: 'Glazed',
      ways: {
        cream: { name: 'Cream', body: '#EFE6D4', accent: '#CDBB98' },
        white: { name: 'White', body: '#F4F2EC', accent: '#CFCBC2' },
        oat: { name: 'Oat', body: '#E1D3BA', accent: '#B49A76' },
        blush: { name: 'Blush', body: '#F0CFC8', accent: '#D6958B' },
        butter: { name: 'Butter', body: '#F4E2A4', accent: '#D7B25B' },
        mint: { name: 'Mint', body: '#CFE7D8', accent: '#82B79A' },
        sky: { name: 'Sky', body: '#D0E1EF', accent: '#88AACC' },
        lilac: { name: 'Lilac', body: '#DED1EB', accent: '#A68EC6' },
        sage: { name: 'Sage', body: '#B3C6AB', accent: '#6F8F74' },
        green: { name: 'Green', body: '#4E8A62', accent: '#E6EDDF' },
        forest: { name: 'Forest', body: '#2F5A44', accent: '#22463A' },
        terracotta: { name: 'Terracotta', body: '#B8603C', accent: '#9C4E30' },
        cobalt: { name: 'Cobalt', body: '#2E5C9A', accent: '#EDE6D8' },
        red: { name: 'Red', body: '#B5432F', accent: '#EDE6D8' },
        charcoal: { name: 'Charcoal', body: '#3A3B3E', accent: '#8C7A5B' },
        black: { name: 'Black', body: '#25262A', accent: '#B8995C' }
      }
    },
    enamel: {
      name: 'Painted',
      ways: {
        cream: { name: 'Cream', body: '#ECE2CE', accent: '#CDBFA4', metal: '#B8995C' },
        white: { name: 'White', body: '#F1EFEA', accent: '#D8D5CE', metal: '#A7ACB2' },
        blush: { name: 'Blush', body: '#ECB8AF', accent: '#D48F85', metal: '#D2B07A' },
        butter: { name: 'Butter', body: '#F0D27A', accent: '#CFAE4C', metal: '#BFA36A' },
        mint: { name: 'Mint', body: '#A9D6C0', accent: '#7AB399', metal: '#C8B07A' },
        sky: { name: 'Sky', body: '#A8C7E5', accent: '#7C9FC4', metal: '#BFC5CC' },
        lilac: { name: 'Lilac', body: '#C8B5DF', accent: '#9E86BE', metal: '#D0B888' },
        sage: { name: 'Sage', body: '#8FAF93', accent: '#6A8C70', metal: '#C49A45' },
        green: { name: 'Green', body: '#1F5A50', accent: '#2B2E33', metal: '#C49A45' },
        forest: { name: 'Forest', body: '#1F4A38', accent: '#163428', metal: '#C49A45' },
        slate: { name: 'Slate', body: '#2F3A48', accent: '#262B33', metal: '#C49A45' },
        cobalt: { name: 'Cobalt', body: '#2B5797', accent: '#1F3F70', metal: '#C0C5CB' },
        red: { name: 'Red', body: '#B5432F', accent: '#2B2E33', metal: '#C49A45' },
        terracotta: { name: 'Terracotta', body: '#B8603C', accent: '#8C4A2E', metal: '#C49A45' },
        charcoal: { name: 'Charcoal', body: '#37383C', accent: '#27282B', metal: '#8E9399' },
        black: { name: 'Black', body: '#26272A', accent: '#1C1D20', metal: '#C9A04E' }
      }
    },
    paper: {
      name: 'Paper',
      ways: {
        kraft: { name: 'Kraft', body: '#B38A58', paper: '#F8F3E8', metal: '#3A3D42' },
        cream: { name: 'Cream', body: '#E4D6BB', paper: '#FBF7EE', metal: '#B8995C' },
        white: { name: 'White', body: '#E9E5DC', paper: '#FBF9F4', metal: '#9EA3A8' },
        oat: { name: 'Oat', body: '#D8C8AA', paper: '#FAF6EC', metal: '#3A3D42' },
        blush: { name: 'Blush', body: '#E6B3AA', paper: '#FBF3EF', metal: '#C9A87A' },
        butter: { name: 'Butter', body: '#EFD27E', paper: '#FFFBEA', metal: '#9EA3A8' },
        mint: { name: 'Mint', body: '#A1CFB7', paper: '#F5FAF6', metal: '#9EA3A8' },
        sky: { name: 'Sky', body: '#9FC0E0', paper: '#F6F9FC', metal: '#9EA3A8' },
        lilac: { name: 'Lilac', body: '#C5B2DF', paper: '#FAF7FC', metal: '#9EA3A8' },
        sage: { name: 'Sage', body: '#93AF95', paper: '#F7F8F1', metal: '#3A3D42' },
        forest: { name: 'Forest', body: '#2F5A44', paper: '#F5F1E6', metal: '#C49A45' },
        red: { name: 'Red', body: '#A8402E', paper: '#F7F0E4', metal: '#3A3D42' },
        cobalt: { name: 'Cobalt', body: '#2E5C9A', paper: '#F7F4EC', metal: '#9EA3A8' },
        black: { name: 'Black', body: '#2C2B2A', paper: '#EFE8DA', metal: '#8E9399' }
      }
    },
    cloth: {
      name: 'Cloth',
      ways: {
        cloth: { name: 'Blue, red, gold', body: '#2F5E7A', accent: '#8E3B32', trim: '#C9A24B', paper: '#EFE5CF' },
        pastel: { name: 'Pastel', body: '#9DBEDF', accent: '#EAB6AD', trim: '#EFD27E', paper: '#F7F1E4' },
        greens: { name: 'Greens', body: '#2F5A44', accent: '#7E9C7F', trim: '#B9CBB1', paper: '#F1ECDD' },
        light: { name: 'Stone', body: '#D8D1C2', accent: '#EEE9DF', trim: '#B5AB97', paper: '#F8F4EA' },
        night: { name: 'Navy and oxblood', body: '#26344A', accent: '#5A2A2A', trim: '#3A3B3E', paper: '#D6CCB8' },
        leather: { name: 'Leather', body: '#6B3F2A', accent: '#2F3A48', trim: '#8C6A3B', paper: '#EDE2CA' },
        bold: { name: 'Primary', body: '#2E5C9A', accent: '#D9A21E', trim: '#B5432F', paper: '#F6F1E6' }
      }
    },
    notes: {
      name: 'Notes',
      ways: {
        butter: { name: 'Yellow', body: '#F4D35E', accent: '#F0C94A', trim: '#EBC03A' },
        blush: { name: 'Pink', body: '#F4B5B0', accent: '#EFA39D', trim: '#E9928C' },
        mint: { name: 'Mint', body: '#B5E0C4', accent: '#9DD4B1', trim: '#86C79E' },
        sky: { name: 'Blue', body: '#AFD0EE', accent: '#98C1E8', trim: '#82B2E0' },
        mixed: { name: 'Mixed', body: '#F4D35E', accent: '#F4B5B0', trim: '#AFD0EE' },
        white: { name: 'White', body: '#F7F4EC', accent: '#EDE8DC', trim: '#E2DCCD' },
        forest: { name: 'Greens', body: '#B5E0C4', accent: '#8FBF9A', trim: '#6FA37E' }
      }
    },
    glass: {
      name: 'Glass',
      ways: {
        white: { name: 'Clear', glass: '#DCEBEF' },
        butter: { name: 'Amber', glass: '#E6B96E' },
        mint: { name: 'Green', glass: '#A7D3B4' },
        forest: { name: 'Bottle green', glass: '#4F8A63' },
        sky: { name: 'Blue', glass: '#A6C6E4' },
        blush: { name: 'Pink', glass: '#EDC3C6' },
        lilac: { name: 'Lilac', glass: '#C9B8E6' },
        charcoal: { name: 'Smoke', glass: '#7E838A' }
      }
    },
    wood: {
      name: 'Wood',
      ways: {
        natural: { name: 'Natural', wood: '#C99A5E' },
        maple: { name: 'Maple', wood: '#E3C69A' },
        walnut: { name: 'Walnut', wood: '#6E4A30' },
        ebony: { name: 'Ebonized', wood: '#2E2824' },
        white: { name: 'Whitewashed', wood: '#E6DED0' },
        blush: { name: 'Painted blush', wood: '#EBC2BA' },
        mint: { name: 'Painted mint', wood: '#BFE0CE' },
        sky: { name: 'Painted sky', wood: '#BCD3EA' },
        butter: { name: 'Painted butter', wood: '#F1DC9A' },
        sage: { name: 'Painted sage', wood: '#9DB39A' },
        forest: { name: 'Painted forest', wood: '#2F5A44' }
      }
    }
  };
  function colorway(finish, name) { const f = FINISHES[finish]; return (f && f.ways[name]) || null; }

  /* == the eight props already in src/props-data.js ==
     Their groups are keyed by baked color, so these maps give each color its role (and a shade
     against the role, so a colorway keeps two tones two tones). */
  const LEGACY = {
    mug: { name: 'Mug on a saucer', family: 'drinks', finish: 'ceramic', own: 'Cream and sage', tag: 'free', face: 'any', rot: 0.5, foot: 1.95, scale: 1.05,
      roles: { '#ECE4D6': ['body', 0], '#6F8F82': ['accent', 0], '#3E2616': ['drink', 0] }, anchors: { steam: [0, 1.87, 0] } },
    plant: { name: 'Snake plant', family: 'plants', finish: 'ceramic', own: 'Terracotta', tag: 'free', face: 'any', rot: 0.4, foot: 1.3, scale: 0.95,
      roles: { '#B8603C': ['body', 0], '#9C4E30': ['accent', 0], '#3F2B1C': ['soil', 0], '#3E7A47': ['leaf', 0], '#5C9A53': ['leaf', 0.16] } },
    lamp: { name: 'Architect lamp', family: 'light', finish: 'enamel', own: 'Green enamel', tag: 'free', face: 'board', rot: -0.22, foot: 1.55, light: 'spot',
      roles: { '#2B2E33': ['accent', 0], '#C49A45': ['metal', 0], '#1F5A50': ['body', 0], '#F6E7C6': ['paper', 0], '#FFE8B8': ['glow', 0] } },
    clock: { name: 'Round desk clock', family: 'time', finish: 'enamel', own: 'Slate', tag: 'free', face: 'viewer', rot: -0.42,
      roles: { '#2F3A48': ['body', 0], '#C49A45': ['metal', 0], '#F3E9D6': ['paper', 0], '#2A2622': ['ink', 0] } },
    notepad: { name: 'Spiral notepad', family: 'paper', finish: 'paper', own: 'Kraft', tag: 'free', face: 'viewer', rot: 0.14,
      roles: { '#B38A58': ['body', 0], '#F8F3E8': ['paper', 0], '#3A3D42': ['metal', 0] } },
    pencil: { name: 'Pencil', family: 'paper', finish: 'enamel', own: 'Yellow', tag: 'free', face: 'any', rot: -1.32,
      roles: { '#E6B22E': ['body', 0], '#C49A45': ['metal', 0], '#E48A8A': ['accent', 0], '#E2C08E': ['wood', 0], '#2E2E30': ['ink', 0] } },
    books: { name: 'Stack of books', family: 'paper', finish: 'cloth', own: 'Blue, red, gold', tag: 'free', face: 'any', rot: -0.28,
      roles: { '#2F5E7A': ['body', 0], '#8E3B32': ['accent', 0], '#C9A24B': ['trim', 0], '#EFE5CF': ['paper', 0] } }
  };

  /* == desk woods ==
     Settings for the painters in desk-paint.js, which draw what plankTex, woodTex, and grooveTex
     in scene.js draw today (Warm reproduces them exactly). planks: the desk. board: the same wood
     as a board top (the week, the day, and the bench), with the groove the lanes are cut into.
     Grain colors are [r, g, b]; alphas are [min, max]. rough is the finish (lower has more sheen).
     A board names the ink set it wears (INKS below); the tests hold it to 4.5 to 1. */
  const WOODS = {
    warm: {
      name: 'Warm plank',
      planks: { tones: ['#C3955F', '#BD8E57', '#C79B66', '#B98A54'], count: 4, tile: 28, seed: 1234, lines: 34, dark: [110, 64, 24], darkA: [0.04, 0.1], light: [255, 236, 200], lightA: [0.05, 0.1], lightShare: 0.2, amp: [2, 9], width: [1, 4], seam: [0.5, 0.18], joint: 0.45, rough: 0.92 },
      board: { ink: 'dark', base: '#D8AD72', bench: '#D2A468', seed: 690, lines: 120, dark: [120, 72, 28], darkA: [0.035, 0.095], light: [255, 236, 200], lightA: [0.05, 0.1], lightShare: 0.2, amp: [4, 18], width: [1, 4.5], rough: 0.84, groove: ['#9E7442', '#BF925A', '#C99D62', '#CFA56B', '#E2BE88'] }
    },
    oak: {
      name: 'Oak',
      planks: { tones: ['#C9A673', '#C29E6A', '#CEAD7C', '#BD9964'], count: 5, tile: 28, seed: 77, lines: 44, dark: [92, 66, 34], darkA: [0.05, 0.12], light: [255, 244, 214], lightA: [0.05, 0.1], lightShare: 0.18, amp: [1, 5], width: [1, 3], seam: [0.42, 0.16], joint: 0.4, rough: 0.88 },
      board: { ink: 'dark', base: '#DCBE8C', bench: '#D6B683', seed: 312, lines: 140, dark: [96, 70, 36], darkA: [0.035, 0.09], light: [255, 244, 214], lightA: [0.05, 0.09], lightShare: 0.18, amp: [2, 10], width: [1, 3.5], rough: 0.84, groove: ['#9C804E', '#C2A26E', '#CAAB78', '#D2B482', '#E4CC9E'] }
    },
    maple: {
      name: 'Maple',
      planks: { tones: ['#E3CBA0', '#DEC598', '#E7D1A9', '#DAC092'], count: 8, tile: 28, seed: 505, lines: 18, dark: [150, 108, 58], darkA: [0.03, 0.07], light: [255, 250, 232], lightA: [0.06, 0.12], lightShare: 0.3, amp: [1, 4], width: [1, 3], seam: [0.3, 0.2], joint: 0.3, rough: 0.8 },
      board: { ink: 'dark', base: '#EAD4AC', bench: '#E4CDA2', seed: 818, lines: 90, dark: [150, 108, 58], darkA: [0.03, 0.07], light: [255, 250, 232], lightA: [0.06, 0.1], lightShare: 0.3, amp: [2, 8], width: [1, 3], rough: 0.8, groove: ['#B09468', '#D2B98E', '#D9C298', '#DFC9A1', '#EEDCBA'] }
    },
    walnut: {
      name: 'Walnut',
      planks: { tones: ['#6B4A33', '#62432D', '#72503A', '#5C3F2A'], count: 4, tile: 28, seed: 911, lines: 40, dark: [34, 18, 8], darkA: [0.08, 0.18], light: [214, 170, 128], lightA: [0.04, 0.09], lightShare: 0.25, amp: [2, 10], width: [1, 4], seam: [0.55, 0.1], joint: 0.5, rough: 0.72 },
      board: { ink: 'light', base: '#664630', bench: '#5F412C', seed: 433, lines: 120, dark: [30, 16, 6], darkA: [0.06, 0.14], light: [214, 170, 128], lightA: [0.02, 0.045], lightShare: 0.2, amp: [3, 16], width: [1, 4], rough: 0.74, groove: ['#3E2B1D', '#553B28', '#5B402C', '#604430', '#7A5A40'] }
    },
    ebony: {
      name: 'Ebonized black',
      planks: { tones: ['#2B2724', '#27231F', '#2F2A26', '#24201D'], count: 4, tile: 28, seed: 2024, lines: 30, dark: [0, 0, 0], darkA: [0.08, 0.16], light: [150, 128, 108], lightA: [0.03, 0.07], lightShare: 0.45, amp: [2, 8], width: [1, 3.5], seam: [0.6, 0.06], joint: 0.55, rough: 0.66 },
      board: { ink: 'light', base: '#3A332D', bench: '#352E29', seed: 55, lines: 100, dark: [0, 0, 0], darkA: [0.06, 0.12], light: [150, 128, 108], lightA: [0.02, 0.05], lightShare: 0.4, amp: [3, 14], width: [1, 4], rough: 0.68, groove: ['#221D1A', '#2F2924', '#332C27', '#37302A', '#4A4038'] }
    },
    white: {
      name: 'Whitewashed',
      planks: { tones: ['#E6DFD2', '#E0D8CA', '#EAE4D8', '#DCD4C5'], count: 5, tile: 28, seed: 606, lines: 38, dark: [128, 108, 84], darkA: [0.05, 0.12], light: [255, 255, 255], lightA: [0.08, 0.16], lightShare: 0.3, amp: [1, 6], width: [1, 3.5], seam: [0.34, 0.3], joint: 0.3, rough: 0.9 },
      board: { ink: 'dark', base: '#EEE8DC', bench: '#E8E1D3', seed: 707, lines: 110, dark: [128, 108, 84], darkA: [0.04, 0.09], light: [255, 255, 255], lightA: [0.06, 0.12], lightShare: 0.3, amp: [2, 10], width: [1, 3.5], rough: 0.9, groove: ['#B5AC9C', '#D3CBBC', '#DAD3C5', '#E0D9CC', '#F2EDE4'] }
    },
    pastel: {
      name: 'Painted pastel',
      planks: { tones: ['#9BCBE3', '#96C5DE', '#A7D3E8', '#92C1DB'], count: 5, tile: 28, seed: 4040, lines: 10, dark: [70, 96, 112], darkA: [0.02, 0.05], light: [255, 255, 255], lightA: [0.06, 0.12], lightShare: 0.4, amp: [1, 4], width: [1, 3], seam: [0.38, 0.35], joint: 0.3, rough: 0.74 },
      board: { ink: 'cool', base: '#D3E1E8', bench: '#CEDDE5', seed: 4141, lines: 40, dark: [70, 96, 112], darkA: [0.02, 0.05], light: [255, 255, 255], lightA: [0.06, 0.1], lightShare: 0.4, amp: [2, 8], width: [1, 3], rough: 0.74, groove: ['#9FB3BE', '#BFD0D9', '#C7D7DF', '#CDDCE4', '#E2ECF1'] }
    },
    green: {
      name: 'Painted green',
      planks: { tones: ['#739A7A', '#6E9575', '#789F7F', '#6A9171'], count: 5, tile: 28, seed: 3131, lines: 12, dark: [34, 58, 38], darkA: [0.03, 0.06], light: [240, 255, 236], lightA: [0.05, 0.1], lightShare: 0.4, amp: [1, 4], width: [1, 3], seam: [0.42, 0.22], joint: 0.35, rough: 0.74 },
      board: { ink: 'green', base: '#9DB59A', bench: '#98B095', seed: 3232, lines: 40, dark: [34, 58, 38], darkA: [0.03, 0.06], light: [240, 255, 236], lightA: [0.05, 0.1], lightShare: 0.4, amp: [2, 8], width: [1, 3], rough: 0.74, groove: ['#6E866B', '#8BA388', '#92AA8F', '#98B095', '#B2C7AF'] }
    }
  };

  /* == desk mats ==
     tile: world units per texture repeat. edge: a stitched line inset from the edge, or none.
     A theme may give a mat its own color; the pattern keeps its character in any color. */
  const MATS = {
    leather: { name: 'Leather', color: '#5A3E2B', pattern: 'speckle', size: 512, tile: 6, seed: 42, dots: 2600, light: [255, 230, 200, 0.035], dark: [20, 8, 0, 0.05], dot: [1, 3.5], edge: { kind: 'stitch', color: '#A98460', inset: 0.42, dash: [0.22, 0.16], opacity: 0.8 }, radius: 1.1, rough: 0.78 },
    felt: { name: 'Felt', color: '#4C5563', pattern: 'fibers', size: 512, tile: 4, seed: 7, fibers: 9000, light: [255, 255, 255, 0.05], dark: [0, 0, 0, 0.07], fiber: [2, 7], edge: { kind: 'none' }, radius: 1.1, rough: 1 },
    cork: { name: 'Cork', color: '#C39A6B', pattern: 'granules', size: 512, tile: 4, seed: 19, grains: 5200, tones: ['#B1865A', '#D1AA7C', '#A57A4E', '#DCB98E', '#BC9163'], grain: [1.5, 4.5], edge: { kind: 'none' }, radius: 0.9, rough: 0.96 },
    linen: { name: 'Linen', color: '#C9B89A', pattern: 'weave', size: 512, tile: 3, seed: 23, light: [255, 252, 240, 0.12], dark: [90, 70, 40, 0.1], slubs: 180, edge: { kind: 'stitch', color: '#8C7654', inset: 0.34, dash: [0.14, 0.1], opacity: 0.9 }, radius: 0.8, rough: 0.97 },
    cutting: { name: 'Cutting mat', color: '#2F6B5A', pattern: 'grid', size: 512, tile: 5, minor: [236, 246, 238, 0.28], major: [236, 246, 238, 0.55], diagonal: [236, 246, 238, 0.16], edge: { kind: 'none' }, radius: 0.45, rough: 0.62 }
  };

  /* Colors a mat can take, beside each mat's own. Plain names, for a menu. */
  const MAT_COLORS = [
    { name: 'Brown', color: '#5A3E2B' }, { name: 'Black', color: '#2C2421' }, { name: 'Charcoal', color: '#2A2B2F' },
    { name: 'Slate', color: '#4C5563' }, { name: 'Forest', color: '#2E5A45' }, { name: 'Oxblood', color: '#6E2E2A' },
    { name: 'Blush', color: '#E6B9B1' }, { name: 'Powder blue', color: '#B9CFE0' }, { name: 'Flax', color: '#C9B89A' }
  ];

  /* == inks for what's printed on the board wood ==
     name: lane and group names. mark: the hand drawn marks beside them. note: the line under a name.
     ruler: the lane rulers. hours: the week's hour labels. open: "4 h open" in the groove.
     free: free time printed in the groove. Checked against the board's wood and grain in the tests. */
  const INKS = {
    dark: { name: '#2B1D0F', mark: '#3F2A14', note: '#45311C', ruler: '#35220E', hours: '#4A3016', open: '#3F2A12', free: '#3F2A12' },
    cool: { name: '#1B2A33', mark: '#243A46', note: '#2C4250', ruler: '#20323C', hours: '#2C4250', open: '#243A46', free: '#243A46' },
    green: { name: '#15261A', mark: '#1C3222', note: '#1F3826', ruler: '#1A2E1F', hours: '#213A28', open: '#1E3524', free: '#1C3222' },
    light: { name: '#FBF3E4', mark: '#F4E8D2', note: '#F0E2C8', ruler: '#F6EBD7', hours: '#F2E4CC', open: '#EEDFC4', free: '#F4E8D2' }
  };

  /* == block palettes ==
     Optional; a theme without one keeps Data.CATS. Every category keeps its own hue, so a block
     still says what kind of time it is at week zoom. ink is the label color on the hard block;
     soft, done, and unplanned dinner blocks get theirs from pickInk, like today. */
  const BLOCKS = {
    pastel: {
      sleep: { base: '#AEB3BD', ink: '#1E2229' },
      family: { base: '#F0A393', ink: '#3E1A12' },
      us: { base: '#C9AEE0', ink: '#2E1A40' },
      work: { base: '#9ABFE8', ink: '#14304F' },
      yours: { base: '#F5D784', ink: '#4B3A18' },
      meals: { base: '#A8D8AA', ink: '#173A1D' },
      home: { base: '#86CBC2', ink: '#0F3833' },
      away: { base: '#AAACEA', ink: '#1D1F52' },
      open: { base: '#F4EBDD', ink: '#5A4430' }
    }
  };

  /* == lights ==
     In the app the light is metered (src/kit/light.js): the three lights always add up to one level
     on the work, so a theme can't make a label unreadable. What a theme sets is the tint of the key,
     fill, sky, and ground (at half strength; white leaves them alone), how the level is shared out
     (keyK, fillK, skyK: more key is deeper shadow), the lamp's color, and dim: how dark the desk
     around the mat is by day and after dark, as a share of its own color (1 and 0.62 when not said).
     lampDay, lampNight, room, roomNight, exposure, and alone are read only by the kit's preview
     (lab/kit.js), which still lights things the old way. */
  const LIGHTS = {
    warm: { key: '#FFFFFF', keyK: 1, fill: '#FFFFFF', fillK: 1, sky: '#FFFFFF', ground: '#FFFFFF', skyK: 1, lamp: '#FFC98A', lampDay: 18, lampNight: 72, room: '#FFB467', roomNight: 51, exposure: 1.02, alone: 1 },
    pastel: { key: '#FFFFFF', keyK: 0.85, fill: '#E6F0FF', fillK: 1.25, sky: '#FFFFFF', ground: '#F3E8DF', skyK: 1.0, lamp: '#FFD8B0', lampDay: 14, lampNight: 60, room: '#FFC7A0', roomNight: 44, exposure: 1.03, alone: 1 },
    night: { key: '#CAD8EF', keyK: 0.72, fill: '#CDDDF5', fillK: 1.65, sky: '#CAD3E6', ground: '#A79886', skyK: 1.1, lamp: '#FFD09A', lampDay: 48, lampNight: 66, room: '#FFC18E', roomNight: 28, exposure: 1.08, alone: 1.15, dim: [0.84, 0.5] },
    green: { key: '#FFF9EA', keyK: 1, fill: '#EDFBEF', fillK: 1.12, sky: '#FBFFF4', ground: '#DDEAD6', skyK: 1.05, lamp: '#FFE0AA', lampDay: 18, lampNight: 70, room: '#FFC98C', roomNight: 46, exposure: 1.0, alone: 1 },
    light: { key: '#FFFFFF', keyK: 1.02, fill: '#F2F6FF', fillK: 1.35, sky: '#FFFFFF', ground: '#EEEAE4', skyK: 1.22, lamp: '#FFE2C0', lampDay: 12, lampNight: 64, room: '#FFD2A8', roomNight: 44, exposure: 1.0, alone: 1 },
    walnut: { key: '#FFF1DE', keyK: 0.9, fill: '#FFE6CC', fillK: 0.9, sky: '#FFF0DC', ground: '#C49A70', skyK: 0.9, lamp: '#FFBF80', lampDay: 26, lampNight: 76, room: '#FFA860', roomNight: 50, exposure: 1.04, alone: 1.2 },
    cork: { key: '#FFFBF2', keyK: 1, fill: '#FFF3E4', fillK: 1.05, sky: '#FFFFFF', ground: '#E8D6BC', skyK: 1.05, lamp: '#FFD2A0', lampDay: 16, lampNight: 70, room: '#FFBC80', roomNight: 48, exposure: 1.02, alone: 1 },
    cutting: { key: '#FFFFFF', keyK: 1.02, fill: '#F4F8FF', fillK: 1.25, sky: '#FFFFFF', ground: '#E6E8E4', skyK: 1.15, lamp: '#FFE6CC', lampDay: 12, lampNight: 64, room: '#FFD6B0', roomNight: 44, exposure: 1.0, alone: 1 }
  };

  /* == themes ==
     wood: the desk. boards: the wood the boards are made of. mat: which mat, in which color.
     ways: colorways the things take in turn along each side, so neighbors differ. byFinish: the
     colorway for a finish none of those names suit. things: a colorway for one thing by id.
     A thing whose finish has none of these keeps its own look. */
  const THEMES = {
    warm: { name: 'Warm', note: 'Today\'s desk: warm planks, a leather mat, and each thing in its own colors.', wood: 'warm', boards: 'warm', mat: { id: 'leather' }, ways: [], byFinish: {}, things: {}, light: 'warm', ink: 'dark', blocks: null, tag: 'free' },
    pastel: { name: 'Pastel', note: 'Painted blue planks, a blush felt mat, maple boards, and soft colors.', wood: 'pastel', boards: 'maple', mat: { id: 'felt', color: '#E6B9B1' }, ways: ['blush', 'mint', 'butter', 'sky', 'lilac'], byFinish: { cloth: 'pastel', wood: 'maple', notes: 'mixed' }, things: { lamp: 'butter' }, light: 'pastel', ink: 'cool', blocks: 'pastel', tag: 'free' },
    night: { name: 'Night', note: 'Black planks and walnut boards in a dark room. The lamp does the work.', wood: 'ebony', boards: 'walnut', mat: { id: 'felt', color: '#2A2B2F' }, ways: ['slate', 'cream', 'forest'], byFinish: { cloth: 'night', paper: 'black', glass: 'butter', wood: 'walnut', notes: 'butter' }, things: { lamp: 'black', notepad: 'black', pencil: 'black' }, light: 'night', ink: 'light', blocks: null, tag: 'free' },
    green: { name: 'Green', note: 'Painted green planks, a forest felt mat, oak boards, and greens.', wood: 'green', boards: 'oak', mat: { id: 'felt', color: '#2E5A45' }, ways: ['forest', 'sage', 'mint', 'green'], byFinish: { cloth: 'greens', wood: 'sage', notes: 'forest', paper: 'sage' }, things: { lamp: 'green' }, light: 'green', ink: 'green', blocks: null, tag: 'free' },
    light: { name: 'Light', note: 'Whitewashed planks, a flax linen mat, maple boards, and oat, white, and sage.', wood: 'white', boards: 'maple', mat: { id: 'linen' }, ways: ['oat', 'sage', 'white'], byFinish: { cloth: 'light', wood: 'maple', notes: 'white', glass: 'white' }, things: {}, light: 'light', ink: 'dark', blocks: null, tag: 'free' },
    walnut: { name: 'Walnut', note: 'Walnut planks, black leather, warm boards, black and brass.', wood: 'walnut', boards: 'warm', mat: { id: 'leather', color: '#2C2421' }, ways: ['black', 'cream', 'forest', 'terracotta'], byFinish: { cloth: 'leather', paper: 'black', wood: 'walnut', notes: 'butter', glass: 'butter' }, things: {}, light: 'walnut', ink: 'dark', blocks: null, tag: 'extra' },
    cork: { name: 'Cork', note: 'Oak planks, a cork mat, maple boards, and clay colors.', wood: 'oak', boards: 'maple', mat: { id: 'cork' }, ways: ['terracotta', 'cream', 'sage', 'sky'], byFinish: { cloth: 'cloth', paper: 'kraft', wood: 'natural', notes: 'butter' }, things: {}, light: 'cork', ink: 'dark', blocks: null, tag: 'extra' },
    cutting: { name: 'Cutting mat', note: 'Whitewashed planks, a green cutting mat with a grid, and primary colors.', wood: 'white', boards: 'maple', mat: { id: 'cutting' }, ways: ['red', 'cobalt', 'butter', 'white'], byFinish: { cloth: 'bold', wood: 'natural', notes: 'mixed' }, things: {}, light: 'cutting', ink: 'dark', blocks: null, tag: 'extra' }
  };
  const THEME_ORDER = ['warm', 'pastel', 'night', 'green', 'light', 'walnut', 'cork', 'cutting'];

  /* == layouts ==
     Which things sit on each side of the mat, from the back of the desk to the front. A list inside
     a list shares a row, nearest the mat first. The app's rules still win: every thing sits outside
     the mat, and one that wouldn't be whole on screen is left out. */
  const LAYOUTS = {
    full: { name: 'Full desk', L: ['plant', 'mug', ['pencil', 'notepad']], R: ['books', 'lamp', 'clock'] },
    tidy: { name: 'Tidy', L: ['plant', 'mug'], R: ['lamp'] },
    bare: { name: 'Bare', L: [], R: [] },
    plants: { name: 'Plants', L: ['monstera', 'succulents', 'herbs'], R: ['pothos', 'lamp', 'cactus'] },
    coffee: { name: 'Coffee and paper', L: ['mug', ['pens', 'notes'], 'clip_dish'], R: ['books', 'lamp', 'flip_clock'] },
    reading: { name: 'Reading', L: ['fern', 'teacup', 'open_book'], R: ['globe_lamp', 'books', 'hourglass'] },
    evening: { name: 'Evening', L: ['candle', 'teapot', 'tumbler'], R: ['mushroom_lamp', 'headphones', 'alarm_clock'] },
    kitchen: { name: 'Kitchen table', L: ['herbs', 'fruit', 'cookbook'], R: ['tulips', 'lamp', 'espresso'] },
    home: { name: 'From home', L: ['picture', 'toy_car', 'water'], R: ['lamp', 'globe', 'clock'] },
    autumn: { name: 'Autumn', L: ['pumpkin', 'mug', 'candle'], R: ['books', 'lamp', 'string_lights'] },
    winter: { name: 'Winter', L: ['tree', 'teacup', 'notepad'], R: ['lamp', 'alarm_clock', 'string_lights'] },
    spring: { name: 'Spring', L: ['spring_flowers', 'water', 'notes'], R: ['tulips', 'lamp', 'clock'] }
  };
  const LAYOUT_ORDER = ['full', 'tidy', 'bare', 'plants', 'coffee', 'reading', 'evening', 'kitchen', 'home', 'autumn', 'winter', 'spring'];

  /* == helpers == */
  /* One catalog of every thing: the eight in props-data.js and everything in the kit. */
  function catalog(propData, propKit) {
    const out = {};
    Object.keys(LEGACY).forEach((id) => {
      const d = propData && propData[id], m = LEGACY[id];
      if (!d) return;
      const groups = d.groups.map((g) => { const r = m.roles[g.c] || ['body', 0]; return Object.assign({}, g, { n: r[0], s: r[1] }); });
      out[id] = Object.assign({ id, legacy: true }, m, { data: Object.assign({}, d, { groups, anchors: Object.assign({}, d.anchors, m.anchors || {}) }) });
    });
    const things = (propKit && propKit.things) || {};
    Object.keys(things).forEach((id) => { out[id] = Object.assign({ id, legacy: false }, things[id].meta, { data: things[id] }); });
    return out;
  }
  /* The colorway a theme gives a thing: its own pick, then the theme's turn order (starting at
     the thing's place along its side), then the finish's fallback, then the thing's own look. */
  function wayFor(theme, thing, index) {
    const t = typeof theme === 'string' ? THEMES[theme] : theme;
    if (!t || !thing) return 'own';
    const f = FINISHES[thing.finish];
    const has = (n) => n === 'own' || !!(f && f.ways[n]);
    if (t.things && t.things[thing.id] && has(t.things[thing.id])) return t.things[thing.id];
    const ways = t.ways || [];
    for (let k = 0; k < ways.length; k++) { const n = ways[(k + (index || 0)) % ways.length]; if (has(n)) return n; }
    if (t.byFinish && t.byFinish[thing.finish] && has(t.byFinish[thing.finish])) return t.byFinish[thing.finish];
    return 'own';
  }
  /* The recolor map for bakedProp: baked color to new color, for a thing in a colorway. */
  function recolor(thing, way) {
    if (!thing || !way || way === 'own') return null;
    const pal = colorway(thing.finish, way);
    if (!pal) return null;
    const out = {};
    for (const g of thing.data.groups) if (g.n && pal[g.n]) out[g.c] = shade(pal[g.n], g.s || 0);
    return out;
  }
  /* A thing's footprint on the desk, as a box around its origin: its body, not its leaves. */
  const isRound = (thing) => !!(thing && thing.foot && !(thing.data && thing.data.anchors && thing.data.anchors.foot0));
  function footOf(thing) {
    const a = thing.data && thing.data.anchors;
    if (a && a.foot0 && a.foot1) return { x0: a.foot0[0], x1: a.foot1[0], z0: a.foot0[2], z1: a.foot1[2] };
    if (thing.foot) return { x0: -thing.foot, x1: thing.foot, z0: -thing.foot, z1: thing.foot };
    return null;
  }
  const LEGACY_FOOT = {
    clock: { x0: -1.65, x1: 1.65, z0: -0.8, z1: 0.8 }, notepad: { x0: -1.85, x1: 1.85, z0: -2.4, z1: 2.4 },
    pencil: { x0: -3.34, x1: 3.34, z0: -0.2, z1: 0.2 }, books: { x0: -2.4, x1: 2.4, z0: -1.7, z1: 1.7 }
  };
  function rotBox(b, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) {
      /* three.js turns about y: x' = x cos + z sin, z' = -x sin + z cos */
      const X = x * c + z * s, Z = -x * s + z * c;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); z0 = Math.min(z0, Z); z1 = Math.max(z1, Z);
    }
    return { x0, x1, z0, z1 };
  }
  /* How a thing turns on a side. Things built facing the board (-x) face it from either side;
     things built facing you (+z) turn a little toward the board; the rest mirror their turn. */
  function turnFor(thing, side) {
    const r = thing.rot || 0;
    if (thing.face === 'board') return side === 'R' ? r : Math.PI - r;
    return side === 'R' ? r : -r;
  }
  /* Lay a layout out beside the mat. Returns, for each side, the things with positions in their
     side's holder: x grows away from the mat (negative on the left), with 0 on the line the
     nearest body should sit on, and z runs from the back of the desk to the front. The app's
     placeProps then slides each holder to a hand's width from the mat, as it does today.
     band: the depth the things may use; things past it are left out, last first. */
  function arrange(layout, cat, opts) {
    opts = opts || {};
    const band = opts.band || [-8.8, 8.6], gapMin = opts.gap || 0.7, stagger = opts.stagger || [0, 0.55, 0.2, 0.7];
    const L = typeof layout === 'string' ? LAYOUTS[layout] : layout;
    const out = { L: [], R: [], left: [] };
    ['L', 'R'].forEach((side) => {
      const dir = side === 'R' ? 1 : -1;
      const rows = [];
      (L[side] || []).forEach((entry) => {
        const ids = (Array.isArray(entry) ? entry : [entry]).filter((id) => cat[id]);
        if (!ids.length) return;
        const items = ids.map((id) => {
          const t = cat[id], rot = turnFor(t, side);
          const f = footOf(t) || LEGACY_FOOT[id] || { x0: -1, x1: 1, z0: -1, z1: 1 };
          /* a round body (a saucer, a pot, a lamp's base) takes the same room however it's turned */
          return { id, rot, box: isRound(t) ? f : rotBox(f, rot) };
        });
        rows.push({ items, d: Math.max(...items.map((it) => it.box.z1 - it.box.z0)) });
      });
      /* whole or gone: drop the last rows until the rest fit the band */
      const room = band[1] - band[0];
      while (rows.length && rows.reduce((a, r) => a + r.d, 0) + gapMin * (rows.length - 1) > room) out.left.push(...rows.pop().items.map((it) => it.id));
      const total = rows.reduce((a, r) => a + r.d, 0);
      /* maxGap keeps a side's things in a cluster instead of spread down the whole desk */
      const gap = rows.length > 1 ? Math.min(opts.maxGap || 2.4, Math.max(gapMin, (room - total) / (rows.length + 1))) : 0;
      let z = (band[0] + band[1]) / 2 - (total + gap * (rows.length - 1)) / 2;
      rows.forEach((row, ri) => {
        let near = stagger[ri % stagger.length];
        row.items.forEach((it) => {
          const w = it.box.x1 - it.box.x0, cz = z + row.d / 2 - (it.box.z0 + it.box.z1) / 2;
          /* the box's near edge sits at `near` out from the line */
          const cx = dir > 0 ? near - it.box.x0 : -near - it.box.x1;
          out[side].push({ id: it.id, x: +cx.toFixed(3), z: +cz.toFixed(3), rot: +it.rot.toFixed(3), foot: { x0: cx + it.box.x0, x1: cx + it.box.x1, z0: cz + it.box.z0, z1: cz + it.box.z1 } });
          near += w + 0.35;
        });
        z += row.d + gap;
      });
    });
    return out;
  }

  /* == the contrast check ==
     Text printed on a board is checked against the board's wood at its darkest and lightest grain
     (two streaks crossing at their strongest), and text in a lane against the groove's middle.
     Block labels are checked on each category's hard, soft, done, and unplanned dinner faces. */
  const GROOVE_AT = [0, 0.1, 0.5, 0.92, 1];
  function grooveAt(stops, t) {
    let i = 0;
    while (i < GROOVE_AT.length - 2 && GROOVE_AT[i + 1] <= t) i++;
    return mix(stops[i], stops[i + 1], (t - GROOVE_AT[i]) / (GROOVE_AT[i + 1] - GROOVE_AT[i]));
  }
  function boardExtremes(boardWood) {
    const b = boardWood;
    return {
      base: b.base,
      darkest: over(b.base, b.dark, b.darkA[1], 2),
      lightest: over(b.base, b.light, b.lightA[1], 2),
      /* the groove's gradient runs across the lane (stops at 0, 0.1, 0.5, 0.92, 1); print sits in its middle */
      groove: [0.3, 0.5, 0.7].map((t) => grooveAt(b.groove, t))
    };
  }
  const INK_NAMES = { name: 'Lane names', mark: 'Marks beside lane names', note: 'The line under a lane name', ruler: 'The ruler', hours: 'The week\'s hours', open: 'Open time in a lane', free: 'Free time in a lane' };
  const CAT_NAMES = { sleep: 'Sleep', family: 'Family', us: 'Together', work: 'Work', yours: 'Yours', meals: 'Meals', home: 'Home', away: 'Away', open: 'Breathing room' };
  const FACE_NAMES = { hard: '', soft: ', soft', done: ', done', dinner: ', dinner not planned' };
  function checkTheme(id, cats) {
    const t = THEMES[id], rows = [];
    const wood = WOODS[t.boards].board, ink = typeof t.ink === 'string' ? INKS[t.ink] : t.ink, ex = boardExtremes(wood);
    const onWood = [ex.base, ex.darkest, ex.lightest];
    ['name', 'mark', 'note', 'ruler', 'hours'].forEach((k) => {
      const worst = Math.min(...onWood.map((bg) => contrast(ink[k], bg)));
      rows.push({ what: 'ink.' + k + ' on the board', label: INK_NAMES[k], ink: ink[k], on: onWood, ratio: +worst.toFixed(2), pass: worst >= 4.5 });
    });
    ['open', 'free'].forEach((k) => {
      const worst = Math.min(...ex.groove.map((bg) => contrast(ink[k], bg)));
      rows.push({ what: 'ink.' + k + ' in a lane', label: INK_NAMES[k], ink: ink[k], on: ex.groove, ratio: +worst.toFixed(2), pass: worst >= 4.5 });
    });
    const pal = t.blocks ? BLOCKS[t.blocks] : cats;
    if (pal) Object.keys(pal).forEach((k) => {
      const c = pal[k];
      /* only meals blocks are ever an unplanned dinner */
      const faces = [['hard', c.base, c.ink], ['soft', mix(c.base, k === 'work' ? '#EAF2FA' : '#FFFAF2', k === 'work' ? 0.42 : 0.5)], ['done', mix(c.base, '#E8E2D6', 0.55)]];
      if (k === 'meals') faces.push(['dinner', mix(c.base, '#F3E7D2', 0.3)]);
      faces.forEach(([face, bg, fixed]) => {
        let inkC = fixed || pickInk(bg, c.base);
        if (contrast(bg, inkC) < 4.5) inkC = pickInk(bg, c.base);
        const r = contrast(bg, inkC);
        rows.push({ what: 'block ' + k + ' ' + face, label: (CAT_NAMES[k] || k) + ' blocks' + FACE_NAMES[face], ink: inkC, bg, ratio: +r.toFixed(2), pass: r >= 4.5 });
      });
    });
    return rows;
  }
  /* The ink for a board wood: its own if that passes everywhere on it, or else the set that
     reads best among those that do. */
  function inkWorst(boardId, k) {
    const ex = boardExtremes(WOODS[boardId].board), I = INKS[k];
    return Math.min(...['name', 'mark', 'note', 'ruler', 'hours'].map((r) => Math.min(...[ex.base, ex.darkest, ex.lightest].map((bg) => contrast(I[r], bg)))),
      ...['open', 'free'].map((r) => Math.min(...ex.groove.map((bg) => contrast(I[r], bg)))));
  }
  function inkFor(boardId) {
    const own = WOODS[boardId].board.ink;
    if (own && inkWorst(boardId, own) >= 4.5) return own;
    const ex = boardExtremes(WOODS[boardId].board);
    let best = null;
    Object.keys(INKS).forEach((k) => {
      const I = INKS[k];
      const worst = Math.min(...['name', 'mark', 'note', 'ruler', 'hours'].map((r) => Math.min(...[ex.base, ex.darkest, ex.lightest].map((bg) => contrast(I[r], bg)))),
        ...['open', 'free'].map((r) => Math.min(...ex.groove.map((bg) => contrast(I[r], bg)))));
      if (worst >= 4.5 && (!best || worst > best.worst)) best = { id: k, worst };
    });
    return best ? best.id : 'dark';
  }
  /* Everything a theme sets, resolved to plain values, for the app to apply in one place. */
  function resolve(id) {
    const t = THEMES[id] || THEMES.warm;
    const mat = Object.assign({}, MATS[t.mat.id], t.mat.color ? { color: t.mat.color } : {});
    return { id, name: t.name, wood: WOODS[t.wood], boards: WOODS[t.boards], mat, light: LIGHTS[t.light], ink: typeof t.ink === 'string' ? INKS[t.ink] : t.ink, blocks: t.blocks ? BLOCKS[t.blocks] : null, background: WOODS[t.wood].planks.tones[0] };
  }

  const api = { ROLES, FINISHES, LEGACY, WOODS, MATS, MAT_COLORS, INKS, BLOCKS, LIGHTS, THEMES, THEME_ORDER, LAYOUTS, LAYOUT_ORDER, hexToRgb, rgbToHex, mix, shade, contrast, pickInk, colorway, catalog, wayFor, recolor, footOf, rotBox, turnFor, arrange, boardExtremes, checkTheme, inkFor, resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DeskThemes = api;
})(typeof window !== 'undefined' ? window : globalThis);
