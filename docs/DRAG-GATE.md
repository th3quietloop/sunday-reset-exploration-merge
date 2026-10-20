# The drag gate

Picking a block up and putting it on the calendar is the app. At the Apple Store a dropped block never appeared, and nothing said so. The drag gate is how that can't ship again: it drives every way a block gets picked up and put down, at the sizes people use, with a mouse and a finger, and checks every drop. **It must say GREEN before any deploy of V11.**

## Run it

```
npm run gate        every path at Mac 1440x900, iPad 820x1180, Duo folded 466x678 and iPhone 390x844,
                    mouse and touch, 3 times each, plus the WebKit lane. About 15 minutes.
npm run gate:full   every size, 5 times each, plus the WebKit lane and the tries to break it. About an hour.
```

Each run builds the version in the works from this repo into a temporary folder (V11-2 since Oct 20: the same build Vercel gets, `scripts/make-variants.mjs corners11-2`; V11 itself stays frozen in `v/corners11` as it went live), serves it, starts a headless Chrome of its own, runs, and stops everything again. It ends with the matrix, every failure, and **GATE: GREEN** or **GATE: RED** (exit code 1). Everything it saw is in the run's folder, printed at the end: `summary.md`, a JSON file per lane with every attempt, and a picture of every failure.

**The board's size.** The gate also measures how wide the board is drawn at rest, in Week, Day and Now at 1440 by 900, in Week at 1024 by 768, and on the phone's desk at 375 by 812 (`boardsize.mjs`), and fails when any is more than 2 percent narrower than V11 as it went live. V11's own widths are kept in `scripts/gate/board-size.json`, measured with `node scripts/gate/boardsize.mjs -build v/corners11 -save`.

**A busy machine.** The gate notes the load average through the run. A run whose drops fail while the load was over twice the computer's cores says **GATE: INVALID** (exit code 2), not RED: at a load of 57 on 14 cores (Oct 15), 96 of 234 drops failed and none of it was the app. Run it again when the machine is quieter. A green run under that load stands, and a board that's too small is RED whatever the load (it's measured at rest). At most two heavy browser runs at a time on this computer: take a slot first, `mkdir /private/tmp/claude-501/sr-browser.lock` or, if that one is there, `mkdir /private/tmp/claude-501/sr-browser.lock2` (wait 30 seconds and try again while both are there), and `rmdir` the one you took when the run ends, even if it fails.

It needs Google Chrome (or `CHROME_PATH` pointing at a Chrome or Chromium) and `npm install` (it brings `playwright-core` and `three`). The WebKit lane needs Playwright's WebKit; if it isn't on this computer, `npx playwright-core install webkit` gets it. three.js is served to the page from `node_modules` (the same bytes the page asks the CDN for), so the gate never waits on a slow CDN.

Options, for `node scripts/gate/release-gate.mjs`:

| Option | What it does |
|---|---|
| `-full` | every size, 5 times each, and the tries to break it |
| `-n 3` | attempts per path, size, and input |
| `-sizes mac1,phone` | only these sizes |
| `-paths reset-yours,lib-week` | only these paths |
| `-build folder` | use a build that's already made (`v/corners11` is V11 as it went live) |
| `-serve 4467 -cdp 9467` | the ports for the page and for Chrome |
| `-no-webkit`, `-no-break`, `-no-matrix`, `-no-size` | leave a part out |
| `-out folder` | where the results go |
| `-baseline file`, `-no-baseline` | hold to another list of the last green run's cells, or to none |

One part on its own: `node scripts/gate/gate.mjs -sizes ipadP -inputs touch -paths move-week -n 5`, `node scripts/gate/break.mjs -sizes phone -only second,cancel`, or `node scripts/gate/gate.mjs -browser webkit -paths reset-yours`.

## What every drop is checked for

1. **It landed where the outline said** when the finger or the mouse let go: the same day and the same minute. A block that was moved moved there, and kept its length.
2. **It's drawn**, 1.2 seconds after the drop and again after the desk settles: every number in its place, size, and turn is a number, it and everything holding it are shown, it's full height, it isn't held back, and it's on screen.
3. **It said so**: a toast says where it went. A drop that can't land says why.
4. **Nothing is left in hand**: no block floating over the desk, no copy of a tile, no meal ghost.
5. **Nothing threw**: no exception and no console error (a server with no API, which the live site doesn't have, is the one thing let through). Two guards in the app write to the console when they step in: the desk's watchdog, when a block has a number that isn't one and is put back at rest (`scene.js` `watchBlocks`), and the landing watch, when a block set down isn't drawn 1.7 seconds later and is drawn again (`app.js` `watchLanding`). People never see either, and the gate fails on both, so the cause gets fixed.
6. **The first press after a load is quick** (its own row, `first-press`, once per load): the page takes at most 50 ms over it, and with sound on the sound was made before it. Made inside the first press, it held the page about 200 ms in Chrome.
7. **The boot put nothing back at rest** (its own row, `boot`, each size's first load): the watchdog repaired nothing and the console said nothing about a number that isn't one. Item 5 counts errors inside each drag, so a boot that went wrong failed nothing; that let one through from Oct 13 to Oct 20 (below). In Chrome that load gets no frames until the boot is done, and it opens in Today the way a weekday does whatever the day, so the boot's switch to the Planner's week hides and shows the week before a frame every run. WebKit can't take a page script back once it's added, so there it's a plain boot.

**The boot that broke today's blocks (Oct 20).** The week board starts shown, and a pop reads `popK` for where to start when the pop before it is still waiting. No step had written it yet, so a boot that hid the week and showed it again before the first frame started the week's rise from a number that isn't one. The day's blocks flying home to the week aimed at it, and the watchdog put them back at rest ("a block (2026-10-20|2026-10-20:sleep:am|0) had a number that is not a number"). A tab in the background does that, as do a busy machine and Dev holding another day in Today. It had been there since Round two (1ce31e1, Oct 13), live V11 too: 5 of 5 first boots with frames held back repaired 13 blocks at Mac size. Fixed where it starts: a pop starts where the board is (`popItems`: where the last step left it, or where the waiting pop starts), and the watchdog now looks at the boards too (`watchBoards`: a board mid pop with such a number finishes where it was going and says "a board (week)"). `tests/pop-finite.test.mjs` holds it: the week and the day turned around before a step and in flight, 600 runs of hides, shows, and steps, and the board net.

Every attempt is undone, so the next starts from the same board: the made up family's week (Dev, sample), nothing saved, the clock held at 10 am. A path that's on a size but can't run once there (no pieces to pick up, no place to put one) counts as a failure too: that's a path that broke quietly.

**n/a means only "not on this size".** A path says so itself (`na: true` in `lib/paths.js`: the bench on a phone, the phone's desk on a computer). A path that couldn't open its place (a button that moved, a panel that didn't come) shows as **not run**, which fails the gate, with the reason. And every cell (a path at a size with an input) that ran in the last green run has to run again: `scripts/gate/last-green.json` lists them, `release-gate.mjs` fails any that didn't run, whatever this run called it, and a green run adds the cells it ran. A cell leaves that list only by hand, when its path is meant to leave that size. (It was started on Oct 15 from the last green run before that day's changes, 07cfa4d: 101 cells in Chrome and 19 in WebKit.)

## The paths

| Path | What's carried, from where, to where |
|---|---|
| `reset-yours`, `reset-todo`, `reset-move`, `reset-people` | a tile in a Sunday Reset step, onto the week |
| `reset-meals` | a meal on the meal board, onto a day (on a short screen the board scrolls while it's held at the top) |
| `lib-week`, `lib-day` | a Block library piece off the bench, onto the week or a day |
| `stack-week`, `stack-day` | a to-do off the bench, onto the week or a day |
| `todo-step-week`, `todo-step-day` | a step, a brick in its to-do's panel (V11-2), onto the week or a day |
| `move-week`, `move-day` | a block already on the board, to another day or time |
| `stretch-week`, `stretch-day` | a block's end, to make it longer |
| `today-bench`, `today-move` | the same in Today |
| `phone-move`, `phone-stretch` | the phone's one day |
| `setup-try`, `setup-stretch` | the setup's Try it step |
| `desk-letters`, `desk-home` | the setup on the desk |

Sizes: `mac1` 1440x900, `mac2` 1280x800, `ipadL` 1180x820, `ipadP` 820x1180, `duoOpen` 951x669, `duoFold` 466x678, `duoSafari` 386x580, `phone` 390x844, `phoneL` 844x390. A path that isn't on a size (the bench on a phone) shows as n/a, with the reason.

**How a hand moves.** Each drag presses, moves most of the way, waits, looks again at where the target is now (the desk leans in under a carried block, and a person re-aims at what they see), finishes, and lets go. A finger carrying a block on the desk steers it from below: the block and its outline ride above the fingertip (docs/LIFT-AND-PLACE.md 3.5), so the finger goes that far below the slot, and looks once more as the block comes up off it. A finger stretches a block from the handle on the picked block, so it taps the block first. A finger presses for 420 ms first: a tile in a list that scrolls lifts after 300 ms under a finger (or at once when it first moves across the list), so a list of tiles still scrolls under a thumb. Touch is Chrome's touch emulation with real input events (`Input.dispatchTouchEvent`), one finger or two.

## The tries to break it (`break.mjs`, in `gate:full`)

Each runs a path and does something to the drag: a toast arriving mid drag; toasts with Undo covering part of the week (the drop must go through them: this is the Apple Store kind of failure, a drop swallowed by a toast); the panel redrawn under the finger; the minute ticking over; a step opened a moment before the press; a flick; a swipe along a list of tiles (it must scroll, and lift nothing); slow, paused, press and hold, and blind hands; out past the window's edge and back, or let go there; a locked block; time that's over; off the board; put back on the panel; a second finger resting, tapping, lifting, or pinching while one carries a tile, a meal, a setup piece, or a block being moved; a touch the browser takes back (a call, Control Center) on a tile, a bench piece, a meal, a setup piece, and a move; Escape on a tile, a move (it must not zoom the desk out), a meal, and a setup piece; a scroll then a drag; a stretch pressed 6 px inside the end or, with a finger, 8 px past it; a tap on a tile (its own panel opens, and the tap's click lands on nothing in it); a tap on open time (a panel opens, nothing is placed), right beside a block too (the finger's forgiveness takes the block only for a hold or a move); a sideways list under the lift point inside a list that scrolls down, held, jiggled, and carried (it lands, the sideways list never moves, and the browser never takes the finger), and flicked (the list scrolls and nothing lifts); Add from the place panel (the copy flies from the card, not the screen's corner, and meets the block); Block library putting itself away mid drag; two drags back to back; and leaving a made up board (nothing throws).

## The WebKit lane

Safari, on a Mac and on every iPhone and iPad, is WebKit. The gate runs every path in Playwright's WebKit with a mouse at 1440x900. **Touch drags can't be driven in WebKit this way** (Playwright sends WebKit no fingers), so the gate says so in its output and doesn't count them. What only a real iPhone or iPad can show (a touch that keeps going to a tile redrawn under it, the browser taking a touch back, sound starting on the first touch, the floating tab bar) is the checklist below.

## Checks on a real iPhone and iPad

About ten minutes, in Safari and then from the Home Screen.

1. Sunday Reset, Your time, on an iPhone: a flick that starts on a tile scrolls the list. A press of about a third of a second lifts the tile, and it rises as you hold. Carried up, it lands on the week. A tap opens the place panel on the tile's own suggested day.
2. iPad, sideways: a drag out of the panel toward the week lifts at once. Rest a thumb on the board while carrying: the carry goes on, and lifting the thumb opens nothing.
3. iPhone, mid carry: pull down Control Center. The piece goes home, and the next tap does only its own thing.
4. Drop a block, then at once drop another where its toast with Undo sits over the week: it lands.
5. Meal board on an iPhone: a flick scrolls; press, then drag a meal onto a day.
6. Hold a tile still for a second without moving: no callout, no text selection, no magnifier. Letting go puts it back.
7. A fresh tab whose first action is a drag: you hear the pick and the clack.
8. Stretch a block with a finger, on the week and on the day: tap it, then drag the round handle at its end. It stretches (it no longer turns into a move), one tick per 15 minutes.
9. Add a block from the place panel: the card flies from the panel to where the block lands.
10. The reset's sheet on an iPhone from the Home Screen: Next and Finish later sit above the home indicator.
11. Settings, Dev, open a made up board, then Back to my board, then Day, Week, Month: the bottom bar changes each time.
12. The reset on an iPhone: tap Next, and within a second press and drag a tile of the new step onto the week. It lifts and lands; the list doesn't scroll away and the step's title doesn't take focus mid press. (Once in four tries in October this went wrong on a phone, and no browser here could make it happen again.)
13. With the iPhone or iPad plugged into a Mac (Safari, Develop menu): press a tile and hold it, run `SR.render()` in the console, then carry it to the week. It still lands: a tile drawn again under a finger keeps its carry.

## Measuring (`scripts/gate/probes`)

`targets.mjs` (row heights, block widths, and stretch edges in pixels), `deadzones.mjs` (how much of the board the chrome or toasts cover), `toastcover.mjs` (a second drop under the first one's toast), `timeline.mjs` (every frame around a drop: is the block always drawn, any NaN), `twofinger.mjs` and `pinchstuck.mjs` (a second finger), `mealcancel.mjs`, and `chipcheck.mjs` (the note that says where a carried block lands). Each builds and serves V11 and starts Chrome the same way, or takes `-url` and `-port`.

## When it says RED

Open `summary.md` in the run's folder. Failures are grouped by what went wrong, each with its path, size, input, attempt, and a picture. A failure in a path you didn't touch is still a failure: the loop is one loop. Fix it, run the gate again, and deploy only on GREEN.
