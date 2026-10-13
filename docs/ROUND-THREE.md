# Round three: four ways to hold the board

Russell's notes (Oct 13): the cleanest screen so far is the board edge to edge with a few small things floating on it (his second reference image). He wants the board as big as it can be, the 3D blocks as the star, less at the top, a dark roast brown instead of plain white, a blur behind anything that pops up, and an information architecture where everything is easy to reach, like Patreon's. Four interpretations, each with its own link. Every earlier round stays live.

The map of what we have, and of these four, is in Figma: https://www.figma.com/design/HMfpYKdwdk7RteCofYphxd (page 00, the two Sunday Reset frames under the Patreon maps).

## Shared by all four (`variants/kit`)

- The desk board itself, unchanged: blocks, dragging, panels, the reset, Today's band.
- The desk's own chrome is put away: the date card, the hours card, the zoom tabs, the corner buttons, the Today and Planner switch, and the tray bar while the tray is closed.
- Espresso chrome (#241A13) with cream type and the gold call to action. The wood and the blocks are the brightest things on screen.
- Anything that opens over the board blurs it: the reset's sheets, Settings, Focus, and each version's own sheets. The block panel is frosted glass, so the board stays readable while you edit.
- The kind of day still lives with the date, in the day view.
- A first visit opens on the sample week, on the week view, with no welcome and no How it works panel.
- Focus is round two's session (time in words, never seconds).
- Things marked `data-edge` keep the board clear of them; a hidden tray takes no room (hooks in `board/src/app.js`, `chromeEdges` and `rackBox`).

## The four

1. **Corners**, https://sunday-reset-corners.vercel.app. The cleanest screen. Back, This week, forward on the top left; hours yours in the middle; Today, Day, Week, Month, Year on the right. Bottom left, one menu, Sunday Reset, opens "Where to?": every place as a card over a blurred board. Bottom right: Add and Block library.
2. **Rail**, https://sunday-reset-rail.vercel.app. Patreon's idea: every place in a slim rail on the left, one tap each, with a count on To-dos and Reset turning gold when it's due. The board takes everything to the right.
3. **Library**, https://sunday-reset-library.vercel.app. Time on top (a slim bar: where you are, the zoom, hours, Add), things on the bottom (one handle: Block library, Due soon, Focus, the reset). Block library is a big sheet of stacked cards from the real board, To-dos, Meals and ideas, and Blocks, with a filter and Find. A card puts its pieces on the tray, ready to drag.
4. **Dock**, https://sunday-reset-dock.vercel.app. The top belongs to the board. Everything you steer with is in one dock at the bottom: when, how far out, the stacks, Focus, Add, the reset, Settings. The most board of the four.

## Also live

- Round one, the flat calendar: https://sunday-reset-exploration-merge.vercel.app
- Round two, the board under the clean top bar: https://sunday-reset-board-merge.vercel.app

## Limits

- The versions are for a computer. On a phone each falls back to the desk's own phone views (the list for Today, one tall day for the Calendar).
- Each version's board keeps its own storage, so changes in one don't show in another.
