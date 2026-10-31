/* Sunday Reset: how the desk is lit, as numbers.

   The desk is a thing to read, so its light is set with a meter, not by eye. Every hour of the day
   the light that falls on a face pointing up (a block's printed top, the board's wood) adds up to
   one known level, in one known color. With that level at 1 and no tone curve, a color prints on
   the screen as the color it was designed to be, and the contrast the palette was checked for on
   paper is the contrast on the desk. Mood comes from everything that is not the work: the desk
   around the mat dims after dark, the light warms, the lamp leaves a small pool beside itself.

   at(minute, theme light, options) gives the three lights that make up that level: the sky
   (a hemisphere), the key (the one that casts shadows), and the fill. The key never drops under
   about 52 degrees and always comes from behind the board, so a block's shadow is a short soft
   lip in front of it and never a stripe across the next block's name.

   No DOM and no Three.js: loads in node for the tests and in the browser as window.DeskLight. */
(function (root) {
  'use strict';
  const rgb = (h) => { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const linRgb = (h) => rgb(h).map(lin);
  const lumLin = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const lumOf = (h) => lumLin(linRgb(h));
  const mixHex = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const mulHex = (a, b) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v * y[i] / 255)); };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /* The light on the work. 1 by day: a color prints as designed. A little under after dark, as
     far as every label on every theme still clears 4.5 to 1 (tests/light.test.mjs holds that). */
  const DAY = 1, NIGHT = 0.95;
  /* How the level is shared out by day. The key is under half, so a shadow is never more than
     half as dark as the wood beside it. */
  const SHARE = { sky: 0.42, key: 0.46, fill: 0.12 };
  const FILL_POS = [8, 9, 16], KEY_AIM = [0, 0, -1];
  const MIN_ELEVATION = 52;

  /* [minute, sky, ground, key, where the key is, how much it is night] */
  const NIGHT_SKY = '#EEF0F5', NIGHT_GROUND = '#8C7A68', NIGHT_KEY = '#F1F3F8';
  const KEYS = [
    [0, NIGHT_SKY, NIGHT_GROUND, NIGHT_KEY, [-3, 20, -7], 1],
    [330, NIGHT_SKY, NIGHT_GROUND, NIGHT_KEY, [-3, 20, -7], 1],
    [420, '#FFF3E8', '#B08560', '#FFEEDF', [-12, 17, -5], 0.3],
    [540, '#FFF9F2', '#B4855A', '#FFF8F0', [-10, 20, -5], 0],
    [780, '#FFFDFA', '#B88A5E', '#FFFCF8', [-4, 22, -6], 0],
    [1020, '#FFF7EE', '#B2825A', '#FFF4E8', [7, 19, -6], 0],
    [1140, '#FFF0E2', '#A87650', '#FFE9D6', [11, 16, -5], 0.5],
    [1260, NIGHT_SKY, NIGHT_GROUND, NIGHT_KEY, [3, 20, -7], 1],
    [1440, NIGHT_SKY, NIGHT_GROUND, NIGHT_KEY, [-3, 20, -7], 1]
  ];
  const cosUp = (pos, aim) => { const d = [pos[0] - aim[0], pos[1] - aim[1], pos[2] - aim[2]]; return d[1] / Math.hypot(d[0], d[1], d[2]); };
  const elevation = (pos) => Math.asin(cosUp(pos, KEY_AIM)) * 180 / Math.PI;

  /* L is a theme's light (DeskThemes.LIGHTS): key, fill, sky, and ground tint the day's own colors,
     keyK, fillK, and skyK shift how the level is shared, lamp is the lamp's color, and dim is how
     dark the desk around the mat goes by day and after dark.
     o: { lamp: the lamp is switched on, hasLamp: something on the desk gives light, steady: hold
     the light at midday whatever the clock says } */
  function at(min, L, o) {
    L = L || {}; o = o || {};
    const m = o.steady ? 780 : Math.max(0, Math.min(1440, min == null ? 780 : min));
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1][0] <= m) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = clamp01((m - a[0]) / (b[0] - a[0])), e = f * f * (3 - 2 * f);
    const night = a[5] + (b[5] - a[5]) * e;
    const lit = o.lamp !== false && o.hasLamp !== false;
    /* after dark the lamp warms the light a little; never so much that a kind of time changes color */
    const warm = mixHex('#FFFFFF', L.lamp || '#FFC98A', 0.12);
    /* a theme tints the light at half strength: enough to feel, never enough to cost a label its contrast */
    const tint = (h) => mixHex('#FFFFFF', h || '#FFFFFF', 0.5);
    let sky = mulHex(mixHex(a[1], b[1], e), tint(L.sky));
    let key = mulHex(mixHex(a[3], b[3], e), tint(L.key));
    const ground = mulHex(mixHex(a[2], b[2], e), L.ground || '#FFFFFF');
    const fill = mulHex('#FFF6EA', tint(L.fill));
    if (lit) { sky = mixHex(sky, warm, 0.6 * night); key = mixHex(key, warm, 0.8 * night); }
    const pos = a[4].map((v, k) => v + (b[4][k] - v) * e);
    const level = DAY - (DAY - NIGHT) * night;
    /* softer shadows after dark: the key gives some of its share to the sky */
    const raw = { sky: SHARE.sky * (L.skyK || 1) + 0.1 * night, key: SHARE.key * (L.keyK || 1) * (1 - 0.25 * night), fill: SHARE.fill * (L.fillK || 1) };
    const sum = raw.sky + raw.key + raw.fill;
    const share = { sky: raw.sky / sum, key: raw.key / sum, fill: raw.fill / sum };
    /* a light's intensity for its share of the level on a face pointing up: a Lambert face under a
       light of intensity I at angle t returns albedo times I cos(t) over pi */
    const need = (part, color, cos) => level * part * Math.PI / (Math.max(0.05, lumOf(color)) * cos);
    const dims = L.dim || [1, 0.62];
    const dark = lit ? dims[1] : Math.min(dims[1] + (o.hasLamp === false ? 0.1 : -0.1), 0.9);
    return {
      minute: m, night, level, share,
      sky: { color: sky, intensity: need(share.sky, sky, 1) }, ground,
      key: { color: key, intensity: need(share.key, key, cosUp(pos, KEY_AIM)), pos, elevation: elevation(pos) },
      fill: { color: fill, intensity: need(share.fill, fill, cosUp(FILL_POS, [0, 0, 0])), pos: FILL_POS },
      /* the desk and the mat around the work, as a share of their own color */
      dim: dims[0] + (dark - dims[0]) * night,
      /* the lamp's own pool beside it: at most this share of the level where it reaches the board */
      accent: lit ? 0.05 + 0.05 * night : 0,
      lamp: L.lamp || '#FFC98A'
    };
  }

  /* What a flat face pointing up sends to the screen under s: each channel is the color times the
     light in that channel, and the screen clips at 1. Returns linear [r, g, b]. */
  function shown(colorHex, s, whole) {
    const parts = [[s.sky, 1], [s.key, cosUp(s.key.pos, KEY_AIM)], [s.fill, cosUp(FILL_POS, [0, 0, 0])]];
    const E = [0, 0, 0];
    parts.forEach(([l, cos]) => { const c = linRgb(l.color); for (let k = 0; k < 3; k++) E[k] += c[k] * l.intensity * cos / Math.PI; });
    return linRgb(colorHex).map((v, k) => (whole ? v * E[k] : Math.min(1, v * E[k])));
  }
  /* WCAG contrast between two colors as they are on the desk under s */
  function contrast(inkHex, faceHex, s) {
    const x = lumLin(shown(inkHex, s)), y = lumLin(shown(faceHex, s));
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  /* the level the meter reads on a face pointing up: 1 means a color prints as designed */
  function meter(s) { return lumLin(shown('#FFFFFF', s, true)); }

  /* A small light's pool on the work (the lamp's accent, a candle): the intensity that puts at most
     `share` of the level on the brightest of `points`. light: { pos, aim (a spot's direction, or
     null for a point light), angle, penumbra, decay }; points are [x, y, z] on the work. */
  function poolIntensity(light, points, share, level, cap) {
    let best = 0;
    const cone = light.aim ? Math.cos(light.angle) : 0, soft = light.aim ? Math.cos(light.angle * (1 - light.penumbra)) : 0;
    for (const p of points) {
      const d = [p[0] - light.pos[0], p[1] - light.pos[1], p[2] - light.pos[2]], len = Math.hypot(d[0], d[1], d[2]) || 1e-6;
      const cos = -d[1] / len;
      if (cos <= 0) continue;
      let spot = 1;
      if (light.aim) {
        const al = Math.hypot(light.aim[0], light.aim[1], light.aim[2]) || 1;
        const ac = (d[0] * light.aim[0] + d[1] * light.aim[1] + d[2] * light.aim[2]) / (len * al);
        const t = clamp01((ac - cone) / Math.max(1e-6, soft - cone));
        spot = t * t * (3 - 2 * t);
      }
      const e = spot * cos / Math.max(0.01, Math.pow(len, light.decay == null ? 2 : light.decay)) / Math.PI;
      if (e > best) best = e;
    }
    if (best <= 1e-6) return 0;
    return Math.min(cap == null ? 40 : cap, share * level / (best * Math.max(0.05, light.lum == null ? 1 : light.lum)));
  }

  const api = { DAY, NIGHT, SHARE, KEYS, MIN_ELEVATION, at, shown, contrast, meter, poolIntensity, lumOf, mixHex, elevation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DeskLight = api;
})(typeof window !== 'undefined' ? window : globalThis);
