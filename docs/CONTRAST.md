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

It builds V11 from this repo into a folder of its own (`scripts/make-variants.mjs corners11`, the same build Vercel gets), serves it (on a free port unless `-serve` says), starts a headless Chrome of its own (on port 9486 unless `-cdp` says), walks every screen, and stops everything again. It ends with a table of every screen at every size, every failure once (worst first, with its colors, its size, where it is in the page, and every screen it was on), and **CONTRAST: GREEN** or **CONTRAST: RED** (exit code 1). The run's folder, printed at the end, has `summary.md`, `results.json` with every measure, and, with `-shots`, a picture of every screen that failed. A run takes about half an hour.

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
4. **Edges, marks, and rings.** A field's edge is its strongest edge (or its fill) against what's just outside it; a field drawn with no edge, fill, or ring at rest (a name you edit in place, an add row) is read as words and listed, and its focus ring is still checked. A check box is its drawn box against what's around it. A mark is its strongest pixels against the color around it. A selected state is its fill against what's around it, or what's inside it (a switch's knob) against its fill. A focus ring is read with focus forced on through DevTools, so no focus handler runs, with `:focus-within` forced on the four things around it, since a row can draw the ring for the field in it, and with real focus taken off it first, since a menu that puts focus on its first item would show that ring at rest and read as none; a ring of two colors is measured against its own halo.

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
| `settings` | Settings' overview and every page this board has |
| `toasts` | a toast with Undo, a good one, and one that went wrong; and a toast over an open panel (on a phone, over the sheet) |
| `band` | the band (the phone's list on a phone) at 10 am in a block, its last five minutes, open time, the morning question, the dinner question, free time, after 9 pm, and asleep, on Dev's sample week with the clock held; and a made up board's own bar |
| `bigtext` | Larger text on: the desk or the phone's list, a to-do, Settings |

The HUD has no night colors of its own. The night is the band's late states, measured over the desk as the light dims it.

`todos` and `rituals` change the browser's own board in place (made up to-dos with ids starting `cx-`, a festival that's over, last week's reset with its two notes, dinners with nobody cooking them), so they run after the groups that want the sample family as it comes.

### A new screen goes in the walk

A screen the walk never opens is a screen nobody measures: Look back with a week behind it was one, and it read 1.6 to 1 until the builder who owned it found it by hand. Anything new that shows (a page, a sheet, a state that only comes with some data: a week behind, a date that's over, a cart with things in it) gets a line in `scripts/gate/lib/contrast-walk.mjs`, in the group it belongs to: open it the way the app does (`SR.openSel`, `SR_planMeals`, a click on its button), make the data it needs with `__reset.edit` on the browser's own board when it needs some, and measure it with `t.M('Its name')`. Then `node scripts/gate/contrast.mjs -screens thatgroup -sizes phone,mac -verbose` says what it found, and the summary's table lists it by name, so a screen that didn't open is missing from it.

## Before and after

Before is the tree as it stood when the last runs were made, with this pass taken back out (polish.css as committed, and no css/contrast.css); after is the same tree with it. Both runs used the same checker. Each cell is the number of failing things on that group of screens at that size, before to after.

**Before: 445 screens, 17,859 things checked, 375 failing (81 different things). After: 445 screens, 17,855 checked, none failing. CONTRAST: GREEN.**

| Screens | iPhone | Duo folded | Duo open | iPad | Mac |
|---|---|---|---|---|---|
| The welcome and the setup | 13 to 0 | 10 to 0 | 12 to 0 | 14 to 0 | 13 to 0 |
| Look around first | 0 to 0 | 0 to 0 | 0 to 0 | 0 to 0 | 0 to 0 |
| The phone's Today list and its desk | 9 to 0 | 8 to 0 | | | |
| Today: the band, the menu, To-dos, Add | | | 3 to 0 | 3 to 0 | 3 to 0 |
| The Planner: Day, Week, Month, Year, the list, Block library | | | 0 to 0 | 0 to 0 | 0 to 0 |
| Panels and sheets | 10 to 0 | 10 to 0 | 13 to 0 | 16 to 0 | 15 to 0 |
| Goals, a goal, a session | 10 to 0 | 10 to 0 | 8 to 0 | 10 to 0 | 10 to 0 |
| Break it down, Spread it out | 3 to 0 | 3 to 0 | 3 to 0 | 3 to 0 | 3 to 0 |
| The meal board and the grocery list | 4 to 0 | 4 to 0 | 3 to 0 | 2 to 0 | 6 to 0 |
| This week's plan, People, Focus, the timer | | | 1 to 0 | 1 to 0 | 1 to 0 |
| The Sunday Reset, every step | 1 to 0 | 0 to 0 | 1 to 0 | 1 to 0 | 1 to 0 |
| Settings, every page | 10 to 0 | 10 to 0 | 9 to 0 | 9 to 0 | 12 to 0 |
| Toasts | 1 to 0 | 0 to 0 | 0 to 0 | 0 to 0 | 1 to 0 |
| The band at each time of day (the phone's list on a phone) | 34 to 0 | 28 to 0 | 1 to 0 | 0 to 0 | 0 to 0 |
| A made up board's bar | | | 0 to 0 | 0 to 0 | 0 to 0 |
| Larger text | 10 to 0 | 9 to 0 | 0 to 0 | 0 to 0 | 0 to 0 |

A blank cell is a group that size doesn't have: under 600 px the phone's list is Today, so the desk's Today and the Planner are walked on the three wider windows, and This week's plan, People, and Focus open from the desk's menu there. The phones' many band failures are the list's words on its desk (Earlier, Bed, up at, open time) and its Add line, counted again at every time of day.

## The worst, before

One line for each cause, worst first, with the bar it had to meet:

1. **1.0 of 4.5**: Keep this week on your phone, at the end of the phone's list: its title, its three steps, and Not this month, #2A2118 on the near black surface; its line, #4E3F2C, read 1.54. iPhone and Duo folded, Larger text too.
2. **1.39 of 3**: a day's meal field on the meal board (Meal for Thursday dinner), its edge on its own dark fill. Duo open, iPad, Mac.
3. **1.54 of 3**: the meal board's search, Find or add a meal, on the leather. Every size.
4. **1.84 to 2.02 of 3**: the edge of every other text field: the to-do adders (1.84), quick add (1.95), Find a block (1.96), the setup's fields (1.97), every side panel's and sheet's fields (1.99), the phone's Add line (2.01). Every size.
5. **1.99 to 2.57 of 3**: the meal board's days, focused: a white ring on the light wood. Every size.
6. **2.26 to 2.88 of 3**: the browser's own 1 px focus ring on a check box and on a summary that opens (Show me how, Other ways in, How to get the file, Another study, What the report holds, Keys). Every size.
7. **2.31 to 2.43 of 3**: a switch that's on, the board's teal on its row: Settings' You and home, Sunday Reset, The desk, Reading and sound, and Include the report. Every size.
8. **2.59 of 3**: Break it down's shorter and longer marks that can't be used, white at 30 percent. Every size.
9. **2.67 of 3**: a toast's Undo, focused: its ring fell outside the toast, onto the desk. Mac.
10. **2.83 of 3**: a block in the phone's list, focused: a white ring on the list's desk. iPhone.
11. **2.86 of 3**: the Dev chip, focused: a white ring out on the wood. Duo open.
12. **3.64 to 4.29 of 4.5**: the phone's list on its desk: Earlier (3.64), up at 6:30 am (3.66), Bed (4.23), 1 h open (4.29). iPhone and Duo folded, at every time of day.
13. **4.45 of 4.5**: the Late badge on a to-do, white on #C4553F. Every size.

## Every color that changed

The new tokens are in `variants/corners11/css/contrast.css` (it loads after polish.css), each with what it read before.

| What | Was | Now | The pair, before to after |
|---|---|---|---|
| The phone's notes: Keep this week, Put it on your Home Screen, Link this phone, Get reminders (polish.css) | the near black surface, rgba(24, 25, 29, 0.92), under the notes' dark ink | the board's paper, #F6EEE0, again: the surface rule skips `.td-note` | the title, the steps, and Not this month, #2A2118: 1.0 to 11.8 and more; the line, #4E3F2C: 1.5 to 8.8 |
| Words on the phone's desk: the list's times, open time, Bed, up at, Earlier (`--desk-ink`) | #34230F, #3F2A12, #4A3418 | #1E1408 | at the gradient's dark end: up at 3.66 to 5.68, Bed 4.23 to 5.66, open time 4.29 to 5.75, the times 4.65 to 5.59 |
| Earlier's plate on the phone's desk | rgba(63, 42, 18, 0.12), a darker wash | rgba(255, 248, 236, 0.2), a pale one | Earlier's words, 3.64 to 6.75 |
| A focus ring on the phone's desk and on wood (`--ring-dark`): the list's blocks and Earlier, the meal board's days | #FFFFFF (the meal board's own dark ring was overridden by a later white one) | #1E1408 | the meal board's days 2.0 to 7.0, the list's blocks 2.83 to 5.2, Earlier 4.84 to 5.82 |
| A field's edge (`--field-edge`): `.input`, `.quick-in`, `.c-find` | white at 14 to 16 percent | white at 42 percent | 1.84 to 2.02 rose to 4.1 to 4.6 |
| The meal board's fields on the leather: its search, and a day's meal field | white at 14 percent | white at 55 percent | the search 1.54 to 3.42, a day's meal field 1.39 to 5.42 |
| A placeholder (`--field-hint`) | `--faint` (#A2A2A6) | `--tx-3` (#AFAFAF) | in the token test's worst case, a field on a raised row over the palest board, 4.0 to 4.6; on the screens walked every placeholder read 5.1 or more either way |
| A switch, on (`--switch-on`) | `--teal-hi` #24706A | #349E92 | on its row as drawn, 2.31 to 4.15 (3.3 on a hovered row, in the token test); the white knob on it 3.25 |
| A switch, off (`--switch-off`) | white at 20 percent | white at 42 percent | on its row, 1.9 to 3.3 or more, in the token test (the walk measures a switch's state when it's on); the knob on it 3.45 |
| A check box or a summary that opens, focused | the browser's own 1 px ring (#005FCC) | the app's 3 px white ring | 2.26 to 2.88 rose to 13.5 or more |
| A toast's Undo, focused | a white ring 2 px outside the button, which fell outside the toast onto the desk | the ring inside the button (offset -3 px) | 2.67 to 9.23 |
| Your circle and the Dev chip, focused | a white ring out on the desk | the white ring on a near black halo (`--sf-ink`) | 2.86 to 15.6 |
| Today in the setup's picture of the week | the board's teal, #1D5B56 | #134440, the meal board's teal for today on wood | 4.51 on a Thursday's row, and 4.4 and 4.25 on Friday's and Saturday's, lower on the wood's gradient; now 6.27, and 5.9 at the wood's darker end |
| The Late badge on a to-do | #C4553F | #B84A38, the board's own block red | white on it, 4.45 to 5.15 |
| A step's shorter and longer marks that can't be used (Break it down) | white at 30 percent | white at half brightness, opaque | 2.59 to 3.42 |
| A close mark that stays put while what's under it scrolls: Settings' x, and a panel's x beside the week | white at 6 percent (`--panel-2`), so whatever scrolls under it shows through | the same raised look made solid (`--sf-raised` over `--sf-solid`) | Settings' x over the Warm theme's card on The desk, at Duo folded: 2.98 to 13.2 |
| The kinds of day's list, once it scrolls to fit the window (a layout guard, for planner.css) | each row squeezed shorter than its words | each row keeps its height, and the list scrolls | Your usual on its white plate at the open Duo: 1.09 (its top off the plate, on the dark list) to 9.37 |

Found on the way and fixed by the builder who owns them, tonight: the Next list under the band (`#band-ahead`, white words straight on the wood at 2.4 to 1 on every window; now hidden except on the open Duo's book page, css/today.css); the grocery list's add row on the paper (its edge at 1.6 to 1 and a white focus ring on the paper; now the paper's brown at 70 percent and the dark ring, css/rituals.css); and Look back's two fields (`#reset-keep`, `#reset-change`: their edge at 1.6 to 1; now `--field-edge`, css/rituals.css). The walk didn't reach Look back then: it shows only once there's a week behind the board, and every board the walk had was new. The `rituals` group now makes that week behind (and the other states the rituals walk added) on its own board, so it can't be missed again. The setup's picture of the week sat on the dark card with the wood's brown labels at 1.6 to 1 until css/firstvisit.css put it on its wood.

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

## What it doesn't see

- **The 3D desk's own printing** (blocks, rulers, headers, cards on the desk): `tests/kit.test.mjs` on paper and `tests/light.test.mjs` under the light hold it, unchanged. Words in the HTML over the desk are measured here, over the desk as it's rendered.
- **Hover**, and states that only last a moment (a drag in progress, a toast arriving). A toast that has settled is measured.
- **Marks drawn beside their own words** (a mark next to a label): only a control that is only a mark is held to 3 to 1.
- **Exactly where a `::before` prints its words**: their box is taken from the element, so they're measured against their own fill when they have one, and against the start of the element's box otherwise.
- **Screens that need real touches** the walk doesn't make (a block held over a day, the place panel mid drag). The drag gate (`npm run gate`) drives those.
