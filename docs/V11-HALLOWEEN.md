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
