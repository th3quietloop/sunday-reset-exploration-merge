# Contrast: every screen, measured on screen

Russell, Oct 15, testing Corners V11 on his iPhone: "look at color contrast at the bottom of home, let's make sure accessibility is good with color contrast." At the end of the phone's Today list, the Keep this week on your phone card was dark brown words on the near black card: its title and its three steps at 1.0 to 1, its line at 1.6. Only the gold Download button showed.

The cause: V11's one surface for every panel and card (polish.css, Oct 14) gave every `.td-card` the near black glass with `!important`, the paper notes too (`.td-note`: Keep this week, Put it on your Home Screen, Link this phone, Get reminders). The board made those notes paper so they never read as part of your day, and their ink was chosen for the paper. The rule now reads `.td-card:not(.td-note)`, so a note is paper again. Measured after: its title and steps 13.7 to 1, its line 8.8, Not this month 11.8.

That card was found by eye. The rest of this page is how every other screen is found, by a checker, and kept that way.

## The bar

WCAG 2.2 AA, measured as the screen draws it:

- **Words**: 4.5 to 1, or 3 to 1 when they're large (24 px, or 18.66 px at weight 700 or more).
- **What has to be seen that isn't words**: 3 to 1 against what's next to it. A field's edge, a check box, a control that is only a mark (an x, an arrow, a plus), a selected state, and a focus ring.
- **Russell's own rule**, reported beside it: words never fade with alpha to look quieter. Something that steps back takes a real color that still passes. Words that can't be used yet (a disabled button) are held to the same bar.

## Run it

```
npm run contrast        every screen at iPhone 390x844, Duo folded 386x580, Duo open 951x669,
                        iPad 1024x1366, and Mac 1440x900, one lane a size, side by side.
```

It builds the version in the works from this repo into a folder of its own (`scripts/make-variants.mjs corners11-2` with `MV_OUT`, the same build Vercel gets: V11-2 since Oct 20, from the source V11 went live from; `-build` takes a build already made), serves it (on a free port unless `-serve` says), starts a headless Chrome of its own (on port 9486 unless `-cdp` says), walks every screen, and stops everything again. It ends with a table of every screen at every size, every failure once (worst first, with its colors, its size, where it is in the page, and every screen it was on), and **CONTRAST: GREEN** or **CONTRAST: RED** (exit code 1). The run's folder, printed at the end, has `summary.md`, `results.json` with every measure, and, with `-shots`, a picture of every screen that failed. A run takes about 10 minutes on a quiet machine, and half an hour on a busy one. Other helpers share the machine: take a slot of the browser lock first (`mkdir /private/tmp/claude-501/sr-browser.lock`, or `.lock2` when that one's taken; `rmdir` it when the run ends).

| Option | What it does |
|---|---|
| `-sizes phone,mac` | only these sizes (`phone duoFold duoOpen ipad mac`) |
| `-screens settings,reset` | only these groups (below) |
| `-shots` | a picture of every screen with a failure |
| `-verbose` | every failure as it's found |
| `-build folder` | a V11 build already made |
| `-serve 4486 -cdp 9486` | the ports it starts its server and its Chrome on |
| `-url http://localhost:4486/ -port 9486` | a build and a Chrome already running |
| `-one-lane` | the sizes one after another, in one process |
| `-out folder` | where the results go |

Without a browser, `tests/contrast.test.mjs` (part of `npm test`) holds the tokens: each is read out of the CSS in the order the page loads it, laid over what it sits on, and measured the same way, so a token can't drift under the bar between runs of the browser lane.

## How a screen is measured

`scripts/gate/lib/contrast-probe.js` runs in the page; `scripts/gate/lib/contrast-core.mjs` takes the pictures and judges them; `scripts/gate/lib/contrast-walk.mjs` is the screens; `scripts/gate/contrast.mjs` is the gate. `scripts/gate/lib/png.mjs` reads the screenshots.

1. **What has to be read or seen.** Every text node that shows (and a field's typed words and its placeholder, and words a `::before` or `::after` prints), every text field and check box, every control with no words (only a mark), every selected state (`aria-pressed`, `aria-selected`, `aria-checked`, `aria-current`), and one of each kind of focusable control. A word's color is its CSS color with its own alpha and every ancestor's opacity multiplied in, and its size is its computed size times every ancestor's zoom (Larger text zooms whole panels).
2. **What's behind it, from real pixels.** For one screenshot every word on the page goes transparent (a constructed style sheet, which the page's content security policy allows; nothing else changes), and what's behind each word is read from that picture. So the glass that blurs the desk, the phone's gradient, the 3D desk, the wood, the leather, the paper, and a card's shadow all count as drawn. The word's color is laid over each pixel behind it, and the ratio that counts is the 5th percentile over the word's box: its worst spot, less a stray pixel.
3. **Only what's on top, and only once it's settled.** A word under a sheet, a toast, or a scrim isn't read there; nor is one under the coach's spotlight dim (a second picture with the dim lifted says what's under it), or a card's face turned away. A list that scrolls is walked a little over half a screen at a time, and the band along an edge with more beyond it (its fade, a bar's shadow over it, a half shown row) is left for the step that brings it into the clear; something that stays put while the list scrolls under it (a sticky close mark, a header) is read at every step, over whatever is under it then. What's listed and the picture have to be the same moment: when anything measured moved, faded, or flipped in between, it waits and measures again.
4. **Edges, marks, and rings.** A field's edge is its strongest edge (or its fill) against what's just outside it; a field drawn with no edge, fill, or ring at rest (a name you edit in place, an add row) is read as words and listed, and its focus ring is still checked. A check box is its drawn box against what's around it (a box the page draws beside an unseen real one, like the grocery list's, counts as the check box). A mark is its strongest pixels against the color around it. A selected state is its fill against what's around it, or what's inside it (a switch's knob) against its fill. A focus ring is read with focus forced on through DevTools, so no focus handler runs, with `:focus-within` forced on the four things around it, since a row can draw the ring for the field in it, and with real focus taken off it first, since a menu that puts focus on its first item would show that ring at rest and read as none; a ring of two colors is measured against its own halo.

## The screens it walks

At each size, a browser profile of its own (nothing saved; made up boards only, never a real one):

| Group | What |
|---|---|
| `first` | the front door (from a shared link too, and with its folds open: Other ways in, and on iPhone and iPad Safari how to add it to the Home Screen first), every setup page with answers that bring out every page (a family with kids, two things in the way, meals), See further ahead at each zoom standing still, a date that's a goal offered as one and then made one, the build, the plan, and the board after it |
| `look` | Look at a sample week (the phone's desk on a phone), with its coach |
| `phone` | the phone's Today list to its end with every card (the iPhone and Duo folded profiles are Safari's, so Keep this week shows), the phone's desk, a picked block |
| `today` | the desk in Today with the band, a block's panel (on the open Duo it's the book's left page, the day on the right), the menu, To-dos, Add empty and with words in it |
| `planner` | Day, Block library, the kinds of day, Week, Month, Year, the week as a list |
| `panels` | a to-do (with steps and without), Give it a time, Dinner, a routine, a locked block, a weekly meeting, the day, New to-do, New block, Weekly meetings, Overlaps, How it works, Getting started, Save this day as a kind, Something isn't working, a block's own mat |
| `goals` | Goals, New goal page by page, the goal it makes, a goal's session |
| `breakdown` | Break it down, Spread it out |
| `meals` | the meal board, the grocery list |
| `more` | This week's plan, People, Focus on one thing, the Pomodoro timer |
| `reset` | the Sunday Reset's start and every step |
| `todos` | a to-do's sheet (the panel beside the week on a computer) in each state it can be in: steps with no time yet, Change, a step open, More, Delete asking again, Details, steps that don't fit by its day, a step that went by, every step done, and done |
| `rituals` | the rituals with a week behind them, made up on the board: Look back with what was said last time and what's still open, the reset's To-dos with one whose date is over, the finish asking who cooks, a dinner with a dish and nobody cooking it, that to-do's own sheet, the store view with things in the cart and the cart open, a prep week, and Same as an earlier week |
| `big` | V11-2's big moments (docs/BIG-MOMENTS.md, B), made up on the board through the real model: the countdown for a trip with a heads-up next (its rest unfolded, its text being edited, More), a wedding out of town (and Someone to see there), a long weekend with who's covering Robin's drop-offs and pick-ups next (and its text), a move sometime in spring (and its pick), the bar exam, and a goal with no date; Goals with that goal in it; New date's Not sure yet and an event out of town; the two questions a new trip asks (who's going, and who you'll see there), and who's going again from More; and quick add reading a trip, a heads-up, and a move |
| `settings` | Settings' overview and every page this board has |
| `toasts` | a toast with Undo, a good one, and one that went wrong; and a toast over an open panel (on a phone, over the sheet) |
| `band` | the band (the phone's list on a phone) at 10 am in a block, its last five minutes, open time, the morning question, the dinner question, free time, after 9 pm, and asleep, on Dev's sample week with the clock held; V11-2's two big questions: a heads-up to send and, once Text was tapped, Sent it? (the caregiver's board at 2 pm), and the morning after with three things from yesterday, the sheet that goes through them, and one answered there (the student's board at 8 am); and a made up board's own bar |
| `next` | V11-2's dead ends and counts (Oct 20): the reset's To-dos step with nothing due and three things in the Inbox with no day yet; thirty to-dos from earlier days in To-dos (the due sheet on a phone) and in the reset's step, From last week and From earlier, and Give it a new day's place panel; Look back's counts for this month and last (Dev's three months); the first reset's recap line; on Dev's empty board, the meal board's empty days with their quiet + Add, and on a phone the due sheet's Add a to-do (then with three things that have no day yet) and the next 7 days as one line with its days; and on a phone, the Sunday Reset's line on its day, quiet in a Free evening, gold in open time, after a pause, and Set up this week on Monday |
| `bigtext` | Larger text on: the desk or the phone's list, a to-do, Settings |

The HUD has no night colors of its own. The night is the band's late states, measured over the desk as the light dims it.

`todos`, `rituals`, and `big` change the browser's own board in place (made up to-dos with ids starting `cx-`, a festival that's over, last week's reset with its two notes, dinners with nobody cooking them), so they run after the groups that want the sample family as it comes.

### A new screen goes in the walk

A screen the walk never opens is a screen nobody measures: Look back with a week behind it was one, and it read 1.6 to 1 until the builder who owned it found it by hand. Anything new that shows (a page, a sheet, a state that only comes with some data: a week behind, a date that's over, a cart with things in it) gets a line in `scripts/gate/lib/contrast-walk.mjs`, in the group it belongs to: open it the way the app does (`SR.openSel`, `SR_planMeals`, a click on its button), make the data it needs with `__reset.edit` on the browser's own board when it needs some, and measure it with `t.M('Its name')`. Then `node scripts/gate/contrast.mjs -screens thatgroup -sizes phone,mac -verbose` says what it found, and the summary's table lists it by name, so a screen that didn't open is missing from it.

## Before and after

After is V11-2 as it stood on Oct 20 (`MV_OUT=... node scripts/make-variants.mjs corners11-2`, branch v11-2); before is that same build with this pass taken back out (polish.css as it was before it, and no css/contrast.css). Fixes other builders made on the way (below) are in both. Both runs used the same checker. Each cell is the number of failing things on that group of screens at that size, before to after.

**Before: 577 screens, 24,485 things checked, 344 failing (76 different things). After: 577 screens, 24,484 checked, 4 failing (1 thing at four sizes), and that one fails the same way before: it isn't this pass's (below).**

| Screens | iPhone | Duo folded | Duo open | iPad | Mac |
|---|---|---|---|---|---|
| The front door and the setup | 19 to 0 | 14 to 0 | 18 to 0 | 21 to 0 | 18 to 0 |
| Look around first | 0 to 0 | 0 to 0 | 0 to 0 | 0 to 0 | 0 to 0 |
| The phone's Today list, its sheets, and its desk | 1 to 0 | 2 to 0 | | | |
| Today: the band, a block's panel, the menu, To-dos, Add | | | 4 to 0 | 4 to 0 | 4 to 0 |
| The Planner: Day, Week, Month, Year, the list, Block library, the kinds of day | | | 0 to 0 | 0 to 0 | 0 to 0 |
| Panels and sheets | 11 to 0 | 11 to 0 | 15 to 0 | 17 to 0 | 16 to 0 |
| Goals, a goal, a session | 8 to 0 | 8 to 0 | 3 to 0 | 3 to 0 | 2 to 0 |
| Break it down, Spread it out | 0 to 0 | 0 to 0 | 0 to 0 | 0 to 0 | 0 to 0 |
| The meal board and the grocery list | 5 to 0 | 5 to 0 | 4 to 0 | 3 to 0 | 7 to 0 |
| This week's plan, People, Focus, the timer | | | 1 to 0 | 1 to 0 | 1 to 0 |
| The Sunday Reset, every step | 1 to 1 | 1 to 1 | 1 to 1 | 1 to 1 | 0 to 0 |
| A to-do's sheet, in each state | 1 to 0 | 1 to 0 | 1 to 0 | 1 to 0 | 1 to 0 |
| The rituals, with a week behind them | 5 to 0 | 4 to 0 | 6 to 0 | 6 to 0 | 7 to 0 |
| Settings, every page | 4 to 0 | 4 to 0 | 8 to 0 | 6 to 0 | 12 to 0 |
| Toasts | 1 to 0 | 1 to 0 | 0 to 0 | 0 to 0 | 1 to 0 |
| The band at each time of day (the phone's list on a phone) | 11 to 0 | 17 to 0 | 1 to 0 | 1 to 0 | 0 to 0 |
| A made up board's bar | | | 0 to 0 | 0 to 0 | 0 to 0 |
| Larger text | 7 to 0 | 7 to 0 | 0 to 0 | 0 to 0 | 0 to 0 |

A blank cell is a group that size doesn't have: under 600 px the phone's list is Today, so the desk's Today and the Planner are walked on the three wider windows, and This week's plan, People, and Focus open from the desk's menu there. The phones' band failures are the list's words on its desk (Bed, up at, open time, a time) and its Add line, counted again at every time of day.

**The one left, not this pass's:** in the reset's Goals step, a goal's week as seven cells (`.c-gl-strip`, css/goals.css): on a phone, a Duo, and an iPad held upright, "45 min" is wider than its cell, so on today's cell it runs out over the white ring that marks today (1 to 1 where it overlaps, and the "n" collides with the ring). It needs the cell's words to fit (a shorter "45m", a size step down there, or room to wrap), which is the goals builder's to choose.

On Oct 15 the same checker on V11 read 375 failing before and none after, over 445 screens; the walk has grown since (the rituals with a week behind them, a to-do's sheet in each state, the front door's folds and a shared link, a goal offered, a block's panel in Today, a toast over a panel, the grocery list with a thing got).

## The worst, before

One line for each cause, worst first, with the bar it had to meet (V11-2, before this pass):

1. **1.0 of 4.5**: Keep your week on this phone, on the phone's list: its title, its three steps, and Not this month, #2A2118 on the near black surface; its line, #4E3F2C, read 1.54. iPhone and Duo folded, Larger text too.
2. **1.39 of 3**: a day's meal field on the meal board (Meal for Tuesday dinner), its edge on its own dark fill. Duo open, iPad, Mac.
3. **1.54 of 3**: the meal board's search, Find or add a meal, on the leather. Every size.
4. **1.58 to 2.78 of 3**: a toast's Undo, focused: its ring fell outside the toast, onto the desk. Duo open, iPad, Mac.
5. **1.85 to 2.01 of 3**: the edge of every other text field: the to-do adders (1.85), quick add (1.93), the setup's fields (1.94 to 1.97), every panel's and sheet's fields (1.98 to 1.99), Settings' fields (1.98), the phone's Add line (2.01). Every size.
6. **1.99 to 2.6 of 3**: the meal board's days, and the meals on them, focused: a white ring on the light wood. Every size.
7. **2.19 to 2.74 of 3**: the browser's own 1 px focus ring on a check box and on a summary that opens (Save this day as a kind's check box, Keys, How to get the file, Show me how, What the report holds, Other ways in, Another study). Every size.
8. **2.22 to 2.25 of 3**: a switch that's on, the board's teal on its row: Include the report, and Settings' Sunday Reset, The desk, You and home, and Reading and sound. Duo open, iPad, Mac.
9. **2.86 to 2.93 of 3**: the Dev chip and your circle, focused: a white ring out on the wood. Duo open, iPad.
10. **3.77 to 4.4 of 4.5**: the phone's list on its desk: 0.5 h open (3.77), up at 6:30 am (3.8), a time (4.31), 1 h open (4.35), Bed (4.4). iPhone and Duo folded.
11. **4.45 of 4.5**: the Late badge on a to-do, white on #C4553F. Every size.

## Every color that changed

The new tokens are in `variants/corners11/css/contrast.css` (it loads after polish.css), each with what it read before. The pairs are V11-2's on Oct 20, before this pass to after, where its walk reaches the thing; the rest are V11's on Oct 15 (same source, same rule).

| What | Was | Now | The pair, before to after |
|---|---|---|---|
| The phone's notes: Keep your week on this phone, Put it on your Home Screen, Link this phone, Get reminders (polish.css) | the near black surface, rgba(24, 25, 29, 0.92), under the notes' dark ink | the board's paper, #F6EEE0, again: the surface rule skips `.td-note` | the title, the steps, and Not this month, #2A2118: 1.0 to 11.3 and more; the line, #4E3F2C: 1.5 to 8.8 |
| Words on the phone's desk: the list's times, open time, Bed, up at, Earlier (`--desk-ink`) | #34230F, #3F2A12, #4A3418 | #1E1408 | on the gradient's dark end: open time 3.77 to 5.05, up at 3.8 to 5.89, a time 4.31 to 5.18, Bed 4.4 to 5.89 |
| Earlier's plate on the phone's desk | rgba(63, 42, 18, 0.12), a darker wash | rgba(255, 248, 236, 0.2), a pale one | Earlier's words, 3.64 to 6.75 (V11) |
| A focus ring on the phone's desk and on wood (`--ring-dark`): the list's blocks and Earlier, the meal board's days and the meals on them | #FFFFFF (the meal board's own dark ring was overridden by a later white one) | #1E1408 | the meal board's days 1.99 to 6.88; the list's blocks 2.83 to 5.2 (V11; 3.21 to 5.22 on V11-2) |
| A field's edge (`--field-edge`): `.input`, `.quick-in`, `.c-find` | white at 14 to 16 percent | white at 42 percent | 1.85 to 2.01 rose to 4.1 or more |
| The meal board's fields on the leather: its search, and a day's meal field | white at 14 percent | white at 55 percent | the search 1.54 to 3.42, a day's meal field 1.39 to 5.42 |
| A placeholder (`--field-hint`) | `--faint` (#A2A2A6) | `--tx-3` (#AFAFAF) | in the token test's worst case, a field on a raised row over the palest board, 4.0 to 4.6; on the screens walked every placeholder read 4.9 or more either way |
| A switch, on (`--switch-on`) | `--teal-hi` #24706A | #349E92 | on its row as drawn, 2.22 to 3.98 (3.3 on a hovered row, in the token test); the white knob on it 3.25 |
| A switch, off (`--switch-off`) | white at 20 percent | white at 42 percent | on its row, 1.9 to 3.3 or more, in the token test (the walk measures a switch's state when it's on); the knob on it 3.45 |
| A check box or a summary that opens, focused | the browser's own 1 px ring (#005FCC) | the app's 3 px white ring | 2.19 to 2.74 rose to 13 or more |
| A toast's Undo, focused | a white ring 2 px outside the button, which fell outside the toast onto the desk | the ring inside the button (offset -3 px) | 1.58 to 8.95 |
| Your circle and the Dev chip, focused | a white ring out on the desk | the white ring on a near black halo (`--sf-ink`) | 2.86 to 15.6 |
| Today in the setup's picture of the week | the board's teal, #1D5B56 | #134440, the meal board's teal for today on wood | on a Tuesday's row 4.68 to 6.51; on V11's Thursday 4.51, and lower on the wood for a Friday and a Saturday, 4.4 and 4.25; at the wood's darker end now 5.9 |
| The Late badge on a to-do | #C4553F | #B84A38, the board's own block red | white on it, 4.45 to 5.15 |
| A step's shorter and longer marks that can't be used (Break it down) | white at 30 percent | white at half brightness, opaque | 2.59 to 3.42 (V11) |
| A close mark that stays put while what's under it scrolls: Settings' x, and a panel's x beside the week | white at 6 percent (`--panel-2`), so whatever scrolls under it shows through | the same raised look made solid (`--sf-raised` over `--sf-solid`) | Settings' x over the Warm theme's card on The desk, at Duo folded: 2.98 to 13.2 (V11). On V11-2 a panel's corner scrolls away with its title (css/planner.css), so it reads 5.4 or more either way; the plate stays solid for any corner that still floats |

Found on the way and fixed by the builder who owns them, tonight: the Next list under the band (`#band-ahead`, white words straight on the wood at 2.4 to 1 on every window; now hidden except on the open Duo's book page, css/today.css); the grocery list's add row on the paper (its edge at 1.6 to 1 and a white focus ring on the paper; then the paper's brown at 70 percent and the dark ring, css/rituals.css, and since Oct 20 on the list's dark, below); Look back's two fields (`#reset-keep`, `#reset-change`: their edge at 1.6 to 1; now `--field-edge`, css/rituals.css); and the kinds of day's list, which once it scrolled to fit the window squeezed each row shorter than its words, so on the open Duo Your usual spilled off its white plate onto the dark list (1.09 to 1; now each row keeps its height, css/planner.css). The walk didn't reach Look back then: it shows only once there's a week behind the board, and every board the walk had was new. The `rituals` group now makes that week behind (and the other states the rituals walk added) on its own board, so it can't be missed again. The setup's picture of the week sat on the dark card with the wood's brown labels at 1.6 to 1 until css/firstvisit.css put it on its wood.

## The grocery list, dark (Oct 20)

Russell, testing V11 on Oct 15: on the meal board the grocery list was a light paper panel while everything around it was dark. It's dark now, on the surface of the meal board's right column (`rgba(0, 0, 0, 0.12)` over the leather, its 18 px corners and its top highlight), in `variants/corners11/css/meals.css` (the list) and `css/rituals.css` (the add row, a thing's x, and In the cart). It's the same list wherever it shows: the meal board, the store view (the phone's Groceries card), and the meal board as the reset's Meals step opens it.

Asked for 4.5 to 1 or better on the dark for every word, the check boxes and their rings, the kinds, the lines saying what each thing is for, and the add row with its button. Measured on screen at every size (the `meals` and `rituals` groups, which now also check a thing off and add one that isn't for a meal), paper to dark:

| Part | On the paper | On the dark |
|---|---|---|
| Names | #2A2118, 14.2 | white, 10.7 |
| A name that's got, struck through | #76664F, 5.1 | #CDCDCD, 6.9 |
| What each thing is for (Sheet pan chicken, Thu) | #6B5B4A, 6.0 | #CDCDCD, 6.8 |
| The kinds (Proteins, Vegetables, Bases) | #7B5320, 6.2 | #CDCDCD, 6.7 |
| A check box | a #7B5320 ring on #FFFDF8 | a #CDCDCD ring, 7.0; once it's got, the board's mint (#8FD3B1) with a dark tick, 6.4 |
| Its focus ring, and every ring in the list | #C98A1B, and the dark ring | white, 11.1 |
| The add row's field | white, its edge the paper's brown at 70 percent, 3.2; its words #76664F, 5.6 | the meal board's search (near black), its edge #CDCDCD, 7.0; its words #AFAFAF, 7.8 |
| Its Add button | white on #4A3418, 11.7 | the meal board's quiet button, white, 9.1 |
| In the cart | #4A3418, 14.6 | white, 10.9 |
| A thing's x (not for a meal) | drawn in the paper's brown | white, 11.0 |

The quiet grey (#AFAFAF) isn't used on the list itself: on the leather's light spots it fell to 4.0. The list's check boxes are drawn by the page beside the real, unseen ones, and the checker now measures a drawn box like that as the check box, so they're held at every size from now on. Pictures, before and after, at 1440 by 900 and at phone size (the meal board, the store view with the cart open, and the list from the reset's Meals step) are in `docs/readiness/grocery-dark/`.

## What needs Russell's eye

Each of these changes how something looks, a little, for its contrast:

1. **Every text field has an edge you can see**: white at 42 percent (55 on the meal board's leather), where it was a faint 16. The fields read as fields now, but they're brighter outlines than V11 had.
2. **Switches**: on is a brighter teal (#349E92 for #24706A), and off is a grey track you can see, where it nearly vanished.
3. **The phone's notes are paper again**, cream with dark ink among the dark cards, the way the board drew them. If V11 wants them dark, their ink has to turn light with them; the board's own rule says a note never reads as part of your day.
4. **The phone's list**: its times, open time, Bed, and Earlier are near black brown (#1E1408), and Earlier sits on a pale plate instead of a darker one.
5. **Focus rings**: your circle and the Dev chip ring white on a near black halo; a toast's Undo rings inside the button; check boxes and a summary that opens ring white like everything else; on the phone's desk and the meal board's wood the ring is near black.
6. **A disabled step length mark is grey, not faded** (white at half brightness).
7. **Placeholders are a step lighter**, the quiet grey (#AFAFAF).
8. **Today in the setup's picture of the week** is the meal board's deeper teal (#134440).
9. **The close x on Settings and on a panel beside the week** has a solid plate. It looks as it did; what scrolls under it no longer shows through.
10. **The grocery list is dark**, as Russell asked (Oct 20): the meal board's right column's surface, white names, light grey lines and kinds, light grey check boxes that turn the board's mint with a dark tick once a thing is got, and the add row as the meal board's own search and quiet button. Pictures in `docs/readiness/grocery-dark/`.

## What it doesn't see

- **The 3D desk's own printing** (blocks, rulers, headers, cards on the desk): `tests/kit.test.mjs` on paper and `tests/light.test.mjs` under the light hold it, unchanged. Words in the HTML over the desk are measured here, over the desk as it's rendered.
- **Hover**, and states that only last a moment (a drag in progress, a toast arriving). A toast that has settled is measured.
- **Marks drawn beside their own words** (a mark next to a label): only a control that is only a mark is held to 3 to 1.
- **Exactly where a `::before` prints its words**: their box is taken from the element, so they're measured against their own fill when they have one, and against the start of the element's box otherwise.
- **Screens that need real touches** the walk doesn't make (a block held over a day, the place panel mid drag). The drag gate (`npm run gate`) drives those.
