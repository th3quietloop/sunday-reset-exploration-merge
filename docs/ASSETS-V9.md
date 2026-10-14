# Assets, Corners V9: every mark and every desk prop

Russell asked for a polish pass over every model and every icon, so each one is clear and understandable at the size it is used. This is the audit, what changed, and what was left.

Pictures are in `docs/assets-v9/`:

- `icons-before.png`, `icons-after.png`: all 91 marks at 14, 20, and 32 px, dark ink on cream and white on the Work blue, with a 72 px view on a 24 unit grid. The numbers in each card's corner are the center of the mark's ink box in grid units (12, 12 is centered).
- `icons-redrawn-before.png`, `icons-redrawn-after.png`: only the 35 marks that changed, side by side in the same order.
- `props-before.png`, `props-after.png`: all eight props, from the desk camera and from the side.
- `prop-plant-*.png`, `prop-lamp-*.png`, `prop-clock-*.png`, `prop-books-*.png`, `prop-mug-*.png`: the remodeled props, larger.

To render them again:

- Marks: `node scripts/serve-board.mjs 4371 .`, then open `http://localhost:4371/docs/assets-v9/sheet.html` (`?only=bed,cake` for a few, `?src=` for another copy of icons.js).
- Props: `/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/render_props.py -- board/src/props-data.js <outdir> <tag>`.
- Rebuild props: `/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/build_props.py` (it writes `board/src/props-data.js`; the script was copied from the 303 repo and now lives here).

## The audit: marks

Each mark was judged at 14 px (the HUD), 20 px, and 32 px (block faces), for whether it reads at once, means its name, matches its siblings' weight, and sits centered on the grid. The ink box of every mark was also measured.

A bug that touched many marks at once:

- Marks with a cut (`cut()`, destination-out: the seam in a box, the window in a house, the frosting line on a cake, the door of the church, the bars in a calendar) erased whatever was under them. On a fresh HUD canvas that's harmless, but on the desk they are drawn straight onto month cards, the day header plank, the bench title, and wood prints, so every cut went through the card and left a see-through hole.

Marks that read poorly or meant the wrong thing:

- shower: six tiny dots for water vanished below 20 px, and the mark sat 1.1 units left of center.
- cake: a narrow block with a hairline candle read as a stamp or a plunger; it sat 1.2 units high.
- box: two of its three faces were faded with alpha (0.78 and 0.55). On a block in white ink the top face failed contrast, and fading breaks the rule.
- overlap: a faded second bar and two dashed lines turned into a "#" at 14 px. Same alpha problem.
- broom: a flat parallelogram on a stick read as a shovel or a dustpan; off center both ways.
- bowl: a dome of food in a bowl read as a burger; 2.4 units low.
- lamp: four light rays at 1.8 wide turned to noise at 14 px; 1.4 units low.
- undo and redo: the arrowhead was a loose triangle beside the arc, not on it, and both sat 1.2 units low.
- shorter and longer: a rounded bar with a dash read as a key or a plug, not a length.
- tiles: a stray tick (the tile's point value) read as dirt at 14 px.
- dumbbell: the plates were short, so at 14 px it read as a double headed arrow.
- shoe: the sneaker was a low sliver, under 10 units tall on a 24 grid.
- cloud: three arcs that made a lumpy shape with a dent in its base, 0.6 right and 0.6 high.

Marks that were fine in shape but off center or thin beside their siblings:

- plane 1.2 units left and 1.3 low; carrot 1.1 right and 1.2 high; church 1.4 high, with a 1.5 wide cross that disappeared at 14 px; key 0.8 right; moon 0.7 left; heart 0.8 low; cart 0.9 left; note 0.8 high; tray 1 low; pin 0.8 low; sunrise 0.8 low with thinner rays than sun; calendar 0.7 high; unlock 0.9 high; gift 0.7 high; beside, sound, and mute 0.6 to 0.8 right; below 0.6 low.
- Thin strokes beside heavier siblings: cup's steam (1.8), gift's bow (1.9), church's cross (1.5), carrot's leaves (2), note's stems (2).
- pot's handles ran to the edge of the grid (0.1 to 23.9), so they touched the edge of a tile.

Marks that were already right and were left alone: bed, laptop, fork, book, people, sun, handset, envelope, gamepad, runner, wave, phone, wrench, basket, tooth, film, drop, star, bottle, car, receipt, tree, drumstick, chat, brush, house, check, plus, list, flag, lock, minus, up, down, x, earlier, later, more, zoomin, zoomout, fit, blank, inbox, search, print, textsize, leaf, left, right, sliders, grip, bell, help, person, note2.

## The audit: props

Each prop was rendered in Blender from the desk camera and from the side, and looked at on the desk in the app.

- plant: the blades were flat cards in two greens, so it read as paper or grass more than a snake plant, and the pot sat straight on the desk.
- lamp: the spring was one thin dark rod standing apart from the arms; at desk scale it read as a stray stick. The arms (0.075) were thin enough to break up in the distance.
- clock: its two feet (0.2) were hidden under the case, so from the desk camera it looked like it floated; the quarter ticks were barely heavier than the others.
- mug: the handle was a thin loop (0.14) that read as a wire.
- books: three plain slabs; fine as books but with no detail on the spine.
- notepad, pencil, pin: fine. The pencil is yellow and solid, not a pale thin cylinder. The pin is recolored red by the scene.

## What changed

Marks, in `board/src/icons.js` (the names and `draw(ctx, name, cx, cy, size, color)` are unchanged):

- `draw()` now paints each mark on its own small canvas, sized to the pixels it will cover (the target's own scale included, with two grid units of margin for round caps), and copies it into place. A cut only takes ink away from the mark now, never the card under it. The canvases are kept (up to 300) for the next time the same mark, size, and color are asked for. Without a `document` (node) it draws straight, as before.
- Redrawn: shower (three streams in place of dots), cake (a layer cake with a frosting line and one lit candle), box (one solid with cut seams, no alpha), overlap (the later block sits over the first with a gap cut around it, no alpha, no dashes), broom (a handle, a band, a fan of bristles), bowl (a deep bowl on its foot with steam), lamp (heavy base, an arm with an elbow, a shade and bulb, no rays), undo and redo (the head is part of the arrow), shorter and longer (a block with an arrow pushing in or pulling out), tiles (a bigger letter, no tick), dumbbell (taller plates), shoe (taller sneaker), cloud (three round puffs on a flat base).
- Recentered: plane, carrot, church, key, moon, heart, cart, note, tray, pin, sunrise, calendar, unlock, gift, beside, below, sound, mute, cup, cake, bowl, lamp, shorter.
- Weights matched: cup steam and handle, gift bow, church cross (now 2), carrot leaves, note stems, sunrise rays, sound waves, mute cross, pin needle, calendar rings, tray outline, cart wheels. Pot handles pulled in from the edge.
- After the pass every mark's ink box is within 0.6 units of the center of the grid (it was 25 marks outside that).

Props, in `blender/build_props.py`, rebuilt into `board/src/props-data.js`:

- plant: each blade is folded down its middle so it reads as a thick leaf, has the snake plant's yellow margins (the `leaf_edge` color that was defined and never used), and there are eleven blades in place of nine. The pot stands on a low clay saucer. Same pot rim, so the same footprint.
- lamp: the stray rod is now a coil spring that hugs the lower arm; arms are thicker (0.1); brass knobs on the elbow. The shade, the bulb, and every anchor (`bulb`, `aim`, `head`, `base`) are exactly where they were, so the light's pool is unchanged.
- clock: bun feet big enough to see (0.3), so it stands; quarter ticks wider. The `face`, `normal`, and `up` anchors are unchanged, so the hands land where they did.
- mug: a thicker, slightly higher handle.
- books: two raised bands across each spine.
- Every prop keeps its anchors exactly, and its overall size within 0.03 units (checked against the old file). Material colors are the same set as before, so each theme's recolor map still finds them. Triangles went from 12,618 to 15,994 in all; the file from 305 KB to 386 KB.

## How it was checked

- Seen: the full contact sheets before and after, and the 35 changed marks side by side, at 14, 20, and 32 px in both inks (headless Chrome at 2x). The measured centers are in each card.
- Seen: Blender renders of all eight props before and after.
- Seen in the app (the board, served by `scripts/serve-board.mjs`): block marks on the day board's faces and lane prints after the `draw()` change; on the desk in the Planner at a wide window, the plant with its margins and saucer, the mug, the books with spine bands, the clock with its feet and turning hands, and the lamp with its coil, the shade facing the board and its warm pool on the board. `World.props` listed all seven desk things as shown; the lamp's spot light was on (intensity 7.4); the clock had its two hands; the mug's three steam sprites were built. No errors from these files in the console.
- `node --check` on `board/src/icons.js` and `board/src/props-data.js`; `npm test` passes (6 tests).

Not checked by eye:

- Steam rising: it only shows from 5 to 11 am and the check was at 7:40 pm; the steam anchor and the mug's size are unchanged.
- Every theme's recolors of the new parts. The saucer uses `clay_dark` and the spring and knobs use the lamp's existing colors, so they recolor with the theme; the plant's yellow margins (`#C9C46A`) have no role in `LEGACY` in `board/src/kit/themes.js`, so they stay yellow in every theme.
- The phone's tall day and the month and year cards after the `draw()` change.

## What was left, and why

- Marks that were already clear were not touched (the list is above). Redrawing a mark people already know costs recognition for no gain.
- The pencil, notepad, and now pin were left; they read well and the notepad's page is drawn in three.js.
- The kit models in `board/src/kit/*.js` were not touched; they are optional layouts.
- In the wide Planner view the lamp's shade passes in front of the book stack on the right side. That's placement (the layout), not either model, and it was the same before.
- The console shows a 404 for `/api/config` and an unknown error fetching a script (most likely the service worker) on the static server. Neither comes from these files (icons.js and props-data.js load with 200), and they were not traced further.
