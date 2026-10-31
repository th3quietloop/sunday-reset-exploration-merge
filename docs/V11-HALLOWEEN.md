# Corners V11 Halloween (Oct 31, 2026)

V11-2 with the Stageshow audit built in. Stageshow is Benji Taylor's agent skill for faux product UI (https://benji.org/stageshow, source `benjitaylor/skills`, folder `stageshow`). The audit is https://claude.ai/artifact/DgLBGJnimxaPeSup3yvNFa: 20 findings across the welcome (W1 to W4), the setup (T1 to T4), the coach (C1 to C3), the desk's motion (D1, D2, and four decisions), and the marketing site (S1 to S5).

## How it's built

`node scripts/make-variants.mjs corners11-halloween` builds `v/corners11-halloween` from the same source as V11-2 (`board/src`, `variants/corners11`). The page carries the class `v-corners11-halloween`; everything this round changes waits behind `HW` (app.js, scene.js) or CSS scoped to `.v-corners11-halloween`, in `variants/corners11/css/hw-*.css`. V11-2 builds as it did.

## What changed

### The welcome (W1 to W4)
- **W1, framing.** The week is a product shot: a stage of desk planks holds the board, inset at its top and start, running off its far edge so only the evening is cut. On a wide window the stage fills the picture's column, flush with the card's start and foot. On a phone it runs edge to edge and grows with the screen, so the empty band above Set up my week is gone.
- **W2, hierarchy.** Saturday is the tall row with words: its blocks' names (two lines where a brick is narrow, the way the desk wraps) and its open hours ("8.5 h open"). The other six days are quiet bars. A name that wouldn't fit whole comes off, and nothing with words is sliced by the stage's edge. The block that lands is lifted the way the desk lifts a brick, never ringed.
- **W3, motion.** The app's own gesture, played once after the card has been still for 0.7 s: a Bike ride is carried in from past the stage's edge on a shallow arc, held by its far end so its name stays readable; a dashed slot opens in Saturday's open time as it nears and never moves; it sets down flat with no bounce and crossfades into the board's brick at the same place and size; "8.5 h open" rolls to "6.5 h open" (only the changed digit moves); then "+2 h to yourself" arrives from just above and stays. The landed frame is the poster: calmer motion, reduced motion, and a screenshot show it.
- **W4** was already built in V11-2 (the three facts are a flat legend).
- **Checked with Stageshow's own scripts** (`scripts/film.mjs --gate` and `layout.mjs`, at 1440 and 390, on `?stage&nodesk` so sampling is steady): rehearsal passed, no jumps, handoffs, hard edges, or cuts. One line remains and is a false positive: it reads the roll inside "6.5 h open" as a box touching its own parent. `?stage` gives the picture the class the scripts look for.

### The setup (T1 to T4)
- **T1.** On a card under 560 px wide, Try it draws tomorrow as up to four stacked lanes of whole hours, all at one scale, each with its own ticks, sized to the step's room; names print (two lines, then the block's mark). Drag, tap, stretch, the showing, the drop spot, and the hint work across lanes. Desktop keeps its one strip.
- **T2.** Each gap of 45 minutes or more prints "N h open" from the model's own day; when a block lands or stretches only the digits that change roll.
- **T3.** The showing already played in V11-2. It now ends on a visible cause: the pointer presses an Undo chip ("Shown, then put back.") before the block goes back, and it carries the block its line names (Walk).
- **T4.** See further ahead fills its card on a phone (no band under the picture); its Day view is the same tall day with open hours.
- Drag gate: setup-try and setup-stretch pass at mac1 (mouse) and phone (mouse and touch).

### The coach (C1 to C3)
- **C2.** Show me for Put a block on a day and Stretch a block plays the move on the real desk through the desk's own drag (its own pointer id, so a real mouse is ignored), says where it went, then presses Undo; the board, Undo and Redo, and Getting started end as they were. A click, a key, Stop, or Escape stops it. One tap moves keep the ring.
- **C3.** Getting started: what's done folds into one line, the next move leads with the panel's one gold Show me, the rest are quiet rows.
- **C1** was already fixed in V11-2; nothing covers the phone desk.

### The desk's motion (D1, D2, and Russell's calls)
- **D1.** The To-dos badge and the stack strip's counts roll (changed digits only, last first, no pop). The day header plank rolls a changed number 250 ms after the block's landing contact.
- **D2.** The white fill slides between tabs (200 ms) in the zoom switch, the setup's Day/Week/Month/Year, the Pomodoro presets, and the meal board's row; changed mid move, it turns from where it is.
- **Swing** soft caps 14, 9, 7 degrees to 8, 5, 4 (the card in hand 12 to 7). **Landing** keeps the squash, the knock, and the small wood chips, with no ring of dust. **The week's landing outline** jumps slot to slot (the day keeps its glide).
- Drag gate: lib-week, move-week, stretch-week, lib-day, move-day (mac1 mouse, ipadL touch) and phone-move (mouse and touch), all passing.

### The marketing site (S1 to S5)
On branch `v11-halloween` of `sunday-reset-site` (a preview; `main`, the live site, is untouched): a faux hero drawn in HTML with real words only on Saturday and the phone over the mat's margin, a Bike ride carried in with a cause, one animated bento tile (a lane making room around a locked pickup), Dinner as one close-up control, the reset stage following its seven steps, and every section visible at rest. Stageshow's layout check finds nothing at 1440 or 390. Its app links point here.

## Checks
- `npm test`: 698 of 698.
- Stageshow's `film.mjs --gate` on the welcome at 1440 and 390: rehearsal passed. `layout.mjs` on the welcome and the site: nothing found.
- V11-2 builds as before: everything is behind `HW` or `.v-corners11-halloween`.
- Not checked: Safari and a real iPhone. Smart breakdowns need this project's own ANTHROPIC_API_KEY in Vercel; it isn't set, so they stay off here.
