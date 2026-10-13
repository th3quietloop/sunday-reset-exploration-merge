# Sunday Reset, exploration merge (353)

Two rounds live side by side, so you can flip between them:

- **Round one** (the repo root, Vite): the flat clean calendar with toy blocks. https://sunday-reset-exploration-merge.vercel.app
- **Round two** (`board/`): the real Sunday Reset desk (303) under round one's top bar, with Focus rebuilt. See [docs/BOARD-MERGE.md](docs/BOARD-MERGE.md) for the list. Run it with `node scripts/serve-board.mjs` (port 4354).


A Frankenstein of the two Sunday Resets: the clean sans serif planner's calm (350) with the desk version's blocks (303). The chrome is black, white, and warm gray. The blocks are the only color on screen, and they're the part you play with.

Vision, goal, and the long list of ways to make the menus get to the point: [docs/VISION.md](docs/VISION.md).

## What's here

- **Top bar** from the clean version: Today, Calendar, To-dos, Focus. Calendar replaced Week. The Sunday Reset button is the only other button, black on Sunday to Tuesday until the week is set.
- **Calendar** holds Day, Week, Month, and Year behind one switch (keys D, W, M, Y).
  - **Week** has two layouts: Columns (time runs down) and Rows (time runs across, like the desk).
  - **Day** has the kinds of day beside it as cards. Pick one and the blocks drop in.
  - **Month** shows each day as a strip of its blocks, with the blocks you added as small bricks.
  - **Year** is a quilt: one little brick per day, colored by the kind of day it was.
- **Blocks** are toy bricks: a color, a hand drawn mark from 303's `icons.js`, a lip of depth, a grip on hover, a lift when picked up, a squash when they land, and a soft tap you can hear (Sound in the avatar menu).
  - Drag to move, within a day or across days. The day makes room as you move: blocks slide out of the way, Work opens a hole, locked blocks never move. Moving a block back out of Work heals the hole.
  - Drag the bottom (or right) edge to stretch.
  - Drag from the **Block box** (the shelf at the bottom, B to fold) to add one. Drop a block on the box to take it off the day.
  - Tap a block for its sheet: name, start and length steppers, color, mark, locked, remove.
  - Arrows move a focused block, Shift and arrows stretch it, Delete removes it, Z undoes.
- **Today** is the block you're in, big, worn down to now, then your day as one row you can rearrange, to-dos waiting for a time, and tomorrow at a glance.
- **To-dos** are bricks sized by how long they take. Drag one onto the next seven days, tap one to give it a time, or Find times for all. A to-do that lands after it's due says so.
- **Focus** is one block with a countdown that wears it down.
- **Sunday Reset**: Kinds (pick a kind for each day), To-dos (find times), Done (the week in numbers and bricks).

The board is a made up household (Alex, Sam, and Robin) and lives in this browser's storage. "Start over with the sample" is in the avatar menu.

## Run

```sh
npm install
npm run dev      # http://localhost:4353
npm test         # the block model: placing, pushing, holes, 600 random edits
npm run build
```

## Files

- `src/model.js` the board and the rules for where a block lands (`placeAt`, `cascade`, `heal`, `applyKind`, `planTodos`). No DOM.
- `src/data.js` kinds of time and their colors (303's palette), the Block box, kinds of day, the sample week.
- `src/ui.js` how a brick looks, lanes, and FLIP so pushed blocks slide.
- `src/drag.js` pick up, preview, land, stretch.
- `src/views.js` the screens. `src/panels.js` the block sheet, the reset, what this is.
- `src/marks.js` 303's hand drawn marks, unchanged except the export.
- `src/sound.js` taps.

## Round three: four minimal versions (Oct 13)

Each is the desk board with the desk's own chrome put away and espresso pieces in its place. Built by `node scripts/make-variants.mjs` from `board/` plus `variants/kit` and `variants/<id>`, into `v/<id>` (each its own Vercel project). See [docs/ROUND-THREE.md](docs/ROUND-THREE.md).

- **Corners** (`v/corners`): the board edge to edge, four small chips in the corners, one menu with every place.
- **Rail** (`v/rail`): Patreon's idea, a slim rail of places down the left.
- **Library** (`v/library`): time on top, things on the bottom; Block library is a sheet of stacked cards.
- **Dock** (`v/dock`): nothing on top but the board; one dock at the bottom.

## Corners V2 (Oct 13)

`v/corners2`, https://sunday-reset-corners-v2.vercel.app. Corners with Library's stacks, the 3D Block library beside the board, an account chip for Settings, hours top left and the date in the middle, and a Pomodoro on the desk clock. The list: [docs/CORNERS-V2.md](docs/CORNERS-V2.md). Build only it with `node scripts/make-variants.mjs corners2`; the round three builds stay frozen.
