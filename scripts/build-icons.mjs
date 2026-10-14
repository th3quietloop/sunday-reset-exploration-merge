// Writes board/src/icon-paths.js: each of the board's marks as a Phosphor Icons vector path
// (MIT License, phosphoricons.com), so a version that loads it draws every mark sharp at any size.
// Things use the fill weight; controls (x, plus, arrows, checks) the bold weight, since Phosphor's fill
// weight puts those inside a filled square. node scripts/build-icons.mjs
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const assets = join(root, 'node_modules', '@phosphor-icons', 'core', 'assets');

/* the board's mark name: [Phosphor name, weight] */
const MAP = {
  bed: ['bed', 'fill'], dumbbell: ['barbell', 'fill'], shower: ['shower', 'fill'], laptop: ['laptop', 'fill'], fork: ['fork-knife', 'fill'],
  book: ['book-open', 'fill'], people: ['users-three', 'fill'], shoe: ['sneaker', 'fill'], sun: ['sun', 'fill'], sunrise: ['sun-horizon', 'fill'],
  moon: ['moon', 'fill'], cup: ['coffee', 'fill'], pot: ['cooking-pot', 'fill'], cart: ['shopping-cart', 'fill'], shirt: ['t-shirt', 'fill'],
  handset: ['phone', 'fill'], envelope: ['envelope-simple', 'fill'], gamepad: ['game-controller', 'fill'], note: ['note-pencil', 'fill'],
  runner: ['person-simple-run', 'fill'], wave: ['waves', 'bold'], phone: ['device-mobile', 'fill'], cake: ['cake', 'fill'], gift: ['gift', 'fill'],
  wrench: ['wrench', 'fill'], basket: ['basket', 'fill'], tooth: ['tooth', 'fill'], film: ['film-strip', 'fill'], box: ['package', 'fill'],
  key: ['key', 'fill'], drop: ['drop', 'fill'], star: ['star', 'fill'], bottle: ['baby-carriage', 'fill'], church: ['church', 'fill'],
  heart: ['heart', 'fill'], plane: ['airplane', 'fill'], car: ['car', 'fill'], receipt: ['receipt', 'fill'], broom: ['broom', 'fill'],
  tree: ['tree', 'fill'], carrot: ['carrot', 'fill'], drumstick: ['hamburger', 'fill'], bowl: ['bowl-food', 'fill'], tiles: ['squares-four', 'fill'],
  chat: ['chat-circle', 'fill'], brush: ['paint-brush', 'fill'], calendar: ['calendar-blank', 'fill'], house: ['house', 'fill'],
  check: ['check', 'bold'], plus: ['plus', 'bold'], list: ['list-bullets', 'bold'], flag: ['flag', 'fill'], lock: ['lock', 'fill'],
  unlock: ['lock-open', 'fill'], minus: ['minus', 'bold'], up: ['caret-up', 'bold'], down: ['caret-down', 'bold'], x: ['x', 'bold'],
  earlier: ['arrow-left', 'bold'], later: ['arrow-right', 'bold'], more: ['dots-three', 'bold'], shorter: ['arrows-in-line-horizontal', 'bold'],
  longer: ['arrows-out-line-horizontal', 'bold'], zoomin: ['magnifying-glass-plus', 'bold'], zoomout: ['magnifying-glass-minus', 'bold'],
  fit: ['frame-corners', 'bold'], below: ['rows', 'fill'], beside: ['columns', 'fill'], blank: ['square', 'bold'], sound: ['speaker-high', 'fill'],
  mute: ['speaker-slash', 'fill'], undo: ['arrow-counter-clockwise', 'bold'], inbox: ['tray', 'fill'], search: ['magnifying-glass', 'bold'],
  overlap: ['intersect', 'bold'], cloud: ['cloud', 'fill'], print: ['printer', 'fill'], textsize: ['text-aa', 'bold'], leaf: ['leaf', 'fill'],
  left: ['caret-left', 'bold'], right: ['caret-right', 'bold'], sliders: ['sliders-horizontal', 'bold'], grip: ['dots-six-vertical', 'bold'],
  redo: ['arrow-clockwise', 'bold'], lamp: ['lamp', 'fill'], tray: ['tray', 'fill'], bell: ['bell', 'fill'], help: ['question', 'fill'],
  person: ['user', 'fill'], pin: ['push-pin', 'fill'], note2: ['chat-centered-text', 'fill'], fn: ['function', 'bold']
};

const out = {};
for (const [name, [file, weight]] of Object.entries(MAP)) {
  const svg = readFileSync(join(assets, weight, `${file}-${weight}.svg`), 'utf8');
  const ds = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!ds.length) throw new Error('no path in ' + file);
  out[name] = ds.join(' ');
}
const body = `/* Sunday Reset's marks, as vectors: Phosphor Icons (phosphoricons.com), MIT License, Copyright (c) 2023
   Phosphor Icons; the license is in src/PHOSPHOR-LICENSE.txt. Each is one SVG path on a 256 unit grid: the
   fill weight for things, the bold weight for controls. Written by scripts/build-icons.mjs; don't edit. */
(function (root) {
  'use strict';
  root.IconPaths = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n    "').replace(/^\{/, '{\n    ').replace(/\}$/, '\n  }')};
})(typeof window !== 'undefined' ? window : globalThis);
`;
writeFileSync(join(root, 'board', 'src', 'icon-paths.js'), body);
copyFileSync(join(root, 'node_modules', '@phosphor-icons', 'core', 'LICENSE'), join(root, 'board', 'src', 'PHOSPHOR-LICENSE.txt'));
console.log('board/src/icon-paths.js:', Object.keys(out).length, 'marks');
