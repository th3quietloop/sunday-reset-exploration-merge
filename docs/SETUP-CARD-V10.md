# The setup card, V10 (Oct 13)

Russell's eight notes on the setup card, each with what changed and how it was checked. The setup lives in `board/src/app.js` (the frame is `renderSheet`, the steps are `ONB`), its words and studies in `board/src/onboard.js`, and its look in the last block of `board/src/style.css` ("the setup card, Oct 13").

To try it: `node scripts/serve-board.mjs 4371 board`, open http://localhost:4371/, and run `SR.openSetup('Russell')` in the console (or Settings, Help, Try the setup as someone new).

Screenshots are in `docs/setup-v10/`: `before-` and `after-` for every step at 1440, 1000, and phone width, plus the moments that move. The before shots were taken on Oct 13 and the after shots on Oct 14, so Try it says Wednesday in one and Thursday in the other.

## 1. One size

**What changed.** The card is one size on every step and every answer: `min(860px, 100% - 48px)` wide and `min(720px, 100% - 64px)` tall, and a phone gets the whole screen. The progress bar, its part names, the title, and the close mark sit in a head that never moves; Back and Next sit in a foot that never moves; only the middle scrolls, and only when it has to. A thin line shows under the head or over the buttons only while there's more to scroll that way. The old wide and narrow cards (`ONB_WIDE`) are gone.

A tap on a tile used to redraw the step and drop focus and scroll back at the top. A redraw of the same step now keeps its scroll and puts focus back on the tile that was pressed.

One type scale on every step: 26 for the title, 16 for the line under it and for every answer, 14 for labels, hints, and the lines under answers, and 13 only for the bar's part names and the words printed on the drawings of the board. Field labels were 13 and hints were 12; both are 14 now. On a phone, every tile's name is 14 and its line 13, on every step.

Short answers keep a short line inside the wider card: the name box is 440 wide at most, and the rows of two steppers (wake and bed, work hours, drop off and pick up) 560.

**Checked.** Every step at 1440 by 900 measures 860 by 720, at 1000 by 760 it's 860 by 696, and on a 390 phone 390 by 844. A walk from the first step to the plan with Next at all three sizes kept one size the whole way and threw nothing. A scan of every step's text found no size outside the scale and nothing under 13. Steps that still scroll inside the card: Work (256 px more at 1440), Drop off and pick up with two kids (169), and the plan (67).

## 2. A way out

**What changed.** Every step has a close mark at the top right, drawn with `icon('x')`, named "Close setup. Your answers are kept." (in a preview, "Close the setup. Nothing is saved."). Escape closes it from anywhere in the card, a text box too, and so does a click on the blurred board around it. Words typed and not yet committed are committed first, names get their capitals, and the answers stay as a draft.

`SR.openSetup(name)` now opens a draft where it was left, with its answers. So do Set up my week in Settings and on the welcome. A setup opened again says "Where you left off" with a Start over link beside it, which clears the answers and keeps the name.

A draft closed by hand is marked closed, so a reload doesn't open it again by itself; asking for the setup does.

The first step had a Cancel button that threw the draft away. The close mark is the way out now, so the first step has Next alone.

**Checked.** Escape from inside the name box closed the card and kept the half typed name; opening it again landed on the same step with "Where you left off". A click outside closed it and kept the draft. Start over cleared everything but the name. In a preview, closing saved nothing. On the welcome, Escape works like Look around first.

## 3. Names of the people at home

**What changed.** The Partner and Kids text boxes are now name chips, each a small block in the board's colors with a person mark and an x: the partner in the color of time together (plum) and kids in Family's red, from `W.look({ cat })`. One box each. Type a name and press Enter or a comma; "robin and max" becomes Robin and Max. The partner is one chip and its box steps aside while it's there. Kids are a row of chips with "Add a kid" as the box's placeholder, and a hint under it: "Press Enter after each name. Each gets their own drop off and pick up times."

For the keyboard: Backspace or the left arrow in an empty box goes to the last chip's x, the arrows move between the x's and the box, and Backspace or Delete on an x takes that one off. Each x is named for its person ("Take Robin off"), each list is named by its label, and every change is said aloud ("Robin and Max are added.", "Max is off the list."). A name typed and left without Enter still counts when Next is pressed, and that press still lands on Next. The same name isn't added twice.

**Checked.** Typing, Enter, commas, "and", Backspace to the x, Backspace to remove, focus after each, and the draft after each, in the in-app browser.

## 4. Which meals

**What changed.** Breakfast, Lunch, and Dinner are the same check tiles as every other choice in the setup, with the gold ring and check when on, small and in one row: a cup for breakfast, a bowl for lunch, a pot for dinner. The Meals tile above them now has a fork and knife, so two pots don't sit on one screen. The hint lost its last sentence ("Skip any you don't plan").

**Checked.** Each tile toggles its meal and keeps focus; the row is a group named "Which meals?". On a phone the three stay in one row with the mark over the name.

## 5. What every board has

**What changed.** "Always on" and its three chips became one line: "Every board also has to-dos, time of your own, and the Sunday Reset, about 20 minutes each week to plan it." (It says 20 minutes because the reset step says About 20 minutes.)

To-do and to-dos have a hyphen everywhere in the setup's words: the to-do step, the plan, the build lines, the summary, a thing that waits for a time ("It waits in your to-dos"), the reset's calendar event, the pains, and Getting started's "Add a to-do".

## 6. The research step

**What changed.** It leads with what changes for them. The title is "Here's what changes, Brian." Their own words, up to three of the things they picked, sit on cards with a quiet Now side. After a beat to read them, each card turns over in turn, a quarter second each, like a block turning over, to a gold With Sunday Reset side: what changes, in a few words, and one plain line of how ("Pick the week's dinners once, and the grocery list fills in."). Then Why it works: the strongest study of the ones picked, its number big, its finding, what the board does about it, and its source, linked. A second study waits folded under Another study.

The how lines are new (`how` on each pain in `onboard.js`). Studies are now ordered by strength of evidence (`STRENGTH`): the review of 94 studies first, then the large samples, then single experiments, then interviews. Calmer motion shows both sides of each card at once, Now above the gold side, the way they read after the turn.

**Checked.** The turn at 1440, 1000, and phone; calmer motion; the reading order for a screen reader (Now, their words, With Sunday Reset, what changes); contrast on the gold side (dark ink at 9.6 to 1 or better).

## 7. Try it: watch, then your turn

**What changed.** When the step opens, the move is shown once. A pointer, a white fingertip dot, presses the first block in the tray, carries it to a roomy spot on tomorrow (the spot `roomyStart` picks, the same one Do it for me uses), the spot fills in the block's color, and then it carries the block back to the tray. The line under the board says "Watch: drag a block onto the day.", then "Your turn." with Show me again. Once a block is placed, the stretch is shown the same way: the pointer takes the block's right edge and the block itself grows by an hour (or as much as fits), then goes back. Anything they touch stops a showing at once, and the idle hint after six quiet seconds is still there, with Do it for me and Show me again. Calmer motion shows where it would land, with the pointer resting there, and no glide.

**Checked.** The showing frame by frame at 1440 and on a phone; a real drag in the middle of a showing stopped it and placed the block, and the stretch showing followed; nothing from a showing is left behind when the step changes.

## 8. See further ahead

**What changed.** When the step first opens, the zoom plays once by itself, Day, Week, Month, Year, with one line for what each is for: "Day: tomorrow, hour by hour." "Week: your seven days, side by side." "Month: what's coming up. Beach trip is on Sat Jan 16." "Year: the months ahead, and where Beach trip lands." An example, Beach trip on the Saturday about three months out, is marked on the month and the year with a dashed outline. Touching anything stops the play, and Show me again plays it again. The stage holds the tallest level, so nothing under it moves while the levels change. Calmer motion cuts from level to level with nothing moving.

**What I chose.** The example is only a picture. Nothing goes on the board unless they type a name of their own or tap Keep Beach trip (then the marker turns solid gold and the line says "Beach trip goes on your board as a marker, Sat Jan 16."). With the box empty the line says "Beach trip is an example. Only what you keep or type goes on your board.", and Next adds nothing. The date box starts on the example's date, so a name typed without a date lands there.

This turns around a call from Oct 9 (the step opened on the week and never moved by itself). Russell asked to be shown, so it plays once and stops the moment it's touched.

**Checked.** Keeping the example, typing a name, and clearing the box, with what was saved after each; the play at 1440, 1000, and phone; calmer motion.

## Not done, or not sure

- The work step's two answers, Mine to plan and Set, like a shift, are still the white pill pair, the same look the meals note was about. Not changed, since the note was about meals; worth the same treatment if Russell agrees.
- The research step ticks softly as each card turns. Easy to take out if it's one sound too many.
- On a phone, See further ahead scrolls to reach the boxes under the year (198 px). On a computer it fits at 1440 by 900 and scrolls 24 px at 1000 by 760.
- The versions under `v/` are built from `board/` by `scripts/make-variants.mjs`; they show none of this until they're rebuilt.
- Console: the only messages are from loading the page on the plain static server, not from the setup: `/api/config` answers 404 (it has no API), and the in-app browser can't fetch the service worker.
- While testing, a scripted click pressed Add it to my calendar on the reset step a few times in the in-app browser. No file reached Downloads.
- Dead code left alone: `onbStudy` in app.js was already unused before this pass. The rules for the old before and after table and the Always on row were removed.

## Screenshots (docs/setup-v10)

- `before-{1440,1000,phone}-{step}.webp`: every step before, at each size.
- `after-{1440,1000,phone}-{step}.webp`: every step after, settled.
- `after-1440-why-now.webp`: the cards before they turn; `after-1440-why-calm.webp`: calmer motion.
- `after-1440-try-demo.webp`: the block on its way; `after-1440-try-stretch-demo.webp` and `after-1440-try-stretch.webp`: the stretch shown, then their turn; `after-1440-try-calm.webp`: calmer motion.
- `after-1440-ahead-day.webp`, `-week.webp`, `-month.webp`: the zoom playing; `after-1440-ahead.webp` ends on the year; `after-1440-ahead-kept.webp`: the example kept.
- `after-1440-closed.webp` and `after-1440-resumed.webp`: closed with Escape, then opened again where it was.
