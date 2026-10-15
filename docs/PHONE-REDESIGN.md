# The phone, redesigned (Oct 15, 2026)

Russell, on his iPhone at 11:30 pm on Oct 14, after a to-do called "Study for exam": "this looks so clunky and it needs to deliver a better ux and a better organized ui, looks like an engineer made it, it is not adhd friendly at all."

This is the phone's design, phase one: the sheet every panel opens in, the to-do sheet in each state it can be in, goals, the Today list, toasts, and Settings. Nothing in the app was changed. The mock is `docs/mocks/phone-redesign.html` (one file; open it on the phone, every frame scrolls like the real thing, and the first frame is a click-through). Screenshots of every frame are in `docs/mocks/phone-redesign/390x844/` and `docs/mocks/phone-redesign/386x580/`.

**What it's built from.** Russell's six screenshots (his phone is 420 points wide; they're 1260 by 2736 at 3x, in Chrome); a walk of the live V11 (commit aca8a91) at 390 by 844 and 386 by 580, fresh (Look around first) and on Dev boards with the clock held; the three walks of Oct 14 (`scratchpad/walk/today-and-phone.md`, `big-things.md`, section 25 of `first-visit.md`); what goals-fix added tonight; `PRODUCT-STRATEGY.md`, `CORNERS-V11.md`, `APPLE-READINESS.md`, `SMART-BREAKDOWNS.md`, `V11-TODOS.md`; and the real tokens in `variants/corners11/polish.css`, `variants/corners11/variant.css`, `variants/kit/kit.css`, and `board/src/style.css`.

---

## 1. What he saw, and why it happens

| What he saw | Why (measured on the live build) |
|---|---|
| The "Study for exam" sheet asks a dozen things at once and has no first move | `taskPanelFeel` draws every control at the same weight: Add a due date, a 1 h stepper, a "No time yet" row that looks like a button and isn't one, Give it a time beside Mark done, Steps with Suggest steps, Break it down with Hide, a goal box, then Spread it out (4 day chips, a minus and plus for a day's most, 4 time chips, Done by, a month grid). 62 things to tap in 1,952 px of content inside a 644 px sheet. The gold moves three times as you go. |
| Every step repeats the same six things | A step row is about 120 px: a checkbox, the to-do's book tile again, the name as an open text box, an x, "No time yet", and a minus and plus. Six steps print six books, six "No time yet", twelve stepper buttons. |
| Steps that sound like help and aren't | The library's study template answers for any test ("Review the first topics", "Review the rest"), and `Model.breakdown` doesn't say it fell back. Claude is behind a quiet 36 px button under the list. |
| The see-through toast at the top | On a phone, a toast made while a sheet is open moves to the top of the screen (`variants/corners11/css/mealspeople.css` line 38). Toasts are the 92 percent glass, and their keyframes fade them to nothing over the last fifth of their life (`@keyframes toast`, `board/src/style.css`), so most of the time you see one, it's part clear. |
| The sheet ends in a fade, and an icon from the page shows through | The phone's sheet floats 8 px above the bottom (`body.phone .side`, style.css line 716) and its last 36 px are masked to transparent (`.side.more`, line 328). Under and through it: the Keep card's green house. Its content is 288 px wide inside a 374 px sheet, because the close button's column runs its full height. On the folded Duo the sheet shows Break it down, the goal box, and half a step, then fades; no button is in view. |
| Dark text on a dark card | polish.css gives every `.td-card` the dark surface with `!important`, and the note keeps its paper ink: 1.00 to 1 for its title, 1.56 to 1 for its words. |

Found on the way: the list's brown print (#34230F) falls to 4.42 to 1 at the foot of the tan, and the Earlier fold, a brown tint on tan, to 4.16 to 1. Both under 4.5.

## 2. The direction: one thing at a time, in the thumb's reach

Every screen answers two questions: where does this stand, and what's the one next move. A sheet is a quiet page (a title, one line of facts, a checklist) with one gold button pinned where the thumb rests. Everything else is one tap away, in place. Time is drawn as time: every piece has a length, every plan says when it's done, and a to-do shows the shape of its work.

**Anchors, and what each one lends.**
- **Things 3.** A to-do is its title, a quiet line of facts, and a checklist; everything else is one tap away. Lends the to-do sheet's anatomy, rows you tap to edit, and More.
- **Apple Reminders and iOS sheets.** A grabber, Done in the corner, grouped rows, sheets that size to what's in them, the main button at the thumb. Lends the sheet component and Settings.
- **Goblin Tools' Magic To-Do.** One tap breaks it down; one control says how fine. Lends Break it down and Step size.
- **Tiimo and Structured.** Calm, visual, time drawn as length, one thing at a time. Lends the time bar, the week strip, and the Now card.

**One word:** calm. **Surface:** the phone's web app (Safari, Chrome on iOS, the Home Screen app), then the native shell. **State on arrival:** someone carrying a big thing they've been putting off, phone in one hand, often in the middle of something else.

**The V11 look stays:** the near black glass, gold only for the one call to action, white fill for what's selected, Onest for words, Gabarito for names and titles, the eight type sizes, 44 px targets.

## 3. Principles, for someone with ADHD

1. **One next move, gold, at the thumb.** Never two golds on a screen. When there's nothing to do, there's no gold, and that is the answer.
2. **Decide, then ask once.** The app proposes the steps, the days, and the times; one yes places them. The choices wait behind a quiet Change. Defaults: up to 30 min a day (15 for housework), any time of day, done before it's due.
3. **Small enough to start.** The first step is 10 minutes or less and says "Start here". When its time comes, it has a Start button.
4. **Time you can see.** Every piece has a length; every plan says the day it's done; every next thing says how soon.
5. **A cap on every day, drawn.** Nothing puts more on a day than its cap, and the cap is a line you can see.
6. **Plans bend.** A miss moves ahead with one line and Undo. "Didn't get to it" is a normal button. Short isn't behind. Nothing is red; no streaks, no tallies.
7. **A row is one thing.** A check, a name, its time. Tapping a row opens it, one row at a time.
8. **Solid and still.** Nothing see-through, nothing over what you tapped, nothing jumps.
9. **A name and a time.** No sentence on a screen explains the app.

---

## 4. The system

### 4.1 Tokens

Every value is V11's own (top of `variants/corners11/polish.css` unless named). Three are new, marked **new**.

| Token | Value | Use |
|---|---|---|
| `--sf` | rgba(24, 25, 29, 0.92) | cards on the list, the glass |
| `--sf-solid` | #232325 | the Add bar, menus |
| **`--sf-sheet`** **new** | #1E1F23 | a sheet on a phone, opaque. It's what `--sf` already looks like over the dimmed list (#201F1F measured), so the look doesn't change; nothing shows through |
| **`--sf-toast`** **new** | #2C2D31 | a toast: one step lighter than the sheet, so it reads as floating over it |
| `--sf-raised` | rgba(255, 255, 255, 0.06) | rows, fields, tracks |
| `--sf-hover` | rgba(255, 255, 255, 0.10) | quiet buttons, a row's press |
| `--sf-press` | rgba(255, 255, 255, 0.14) | a quiet button's press |
| `--sf-edge` | rgba(255, 255, 255, 0.10) | hairlines |
| `--sf-ink` | #1C1C1E | words on white and on gold |
| `--tx`, `--tx-2`, `--tx-3`, `--tx-4` | #FFFFFF, #CDCDCD, #AFAFAF, #A2A2A6 | words: names, lines, quiet, placeholders |
| `--k-gold` (kit.css), `--gold-hi` | #F2CF7A, #F7DA93 | the one call to action, its press |
| `--cta-edge`, `--cta-fill` | rgba(242, 207, 122, 0.55), 0.08 | the open question's ring; the quieter call |
| `--good` (style.css) | #8FD3B1 | done, Start here |
| `--bad` (style.css) | #FF9E8C | Remove and Delete words only |
| **`--list-ink`** **new** | #24180A | print on the tan list (times, Bed). #34230F fell under 4.5 |
| list ground (style.css) | linear-gradient(180deg, #C99D66, #B98A54 70%, #B08250) | the phone list |
| `--r`, `--r-md`, `--r-sm` | 18, 12, 9 px | cards, rows and fields, chips |
| `.k-sheet` radius (variant.css) | 28 px | a sheet's top corners |
| `--s1` to `--s5` | 4, 8, 12, 16, 22 px | all spacing |
| `--f-out`, `--f-in` (variant.css) | cubic-bezier(0.16, 1, 0.3, 1), cubic-bezier(0.4, 0, 1, 1) | entrances, exits |
| Block colors (`Data.CATS`) | work #2D6EA6, family #B84A38, us #8A5AA6, yours #EFB940 (ink #4B3A18), meals #3B7F45, home #1F6F87, sleep #5B616C, friends #A8436F | blocks and a to-do's mark |

### 4.2 Type

Two faces, eight sizes, nothing else: Onest for every word you read or tap, Gabarito for names and titles.

| Role | Face, weight | Size / line | Color |
|---|---|---|---|
| A sheet's title (the to-do, the goal, a page) | Gabarito 800 | 22 / 1.2, -0.01em | `--tx` |
| Settings' first page title | Gabarito 800 | 26 / 1.15 | `--tx` |
| Card titles on Today, the Now card's name | Gabarito 800 | 19 / 1.2 (the Now card 22) | `--tx` |
| Step names, rows, buttons, inputs, toasts | Onest 500 (buttons 600) | 16 / 1.3 | `--tx` |
| A sheet's facts line, a footer's line, a card's line | Onest 500 | 14 / 1.4 | `--tx-2` |
| A row's meta (its time and length), chips, segmented | Onest 500 (chips 600) | 13 / 1.3 | `--tx-2` |
| Start here, day letters, section names in Settings | Onest 700 (section names 600) | 12 / 1.3 | `--good`, `--tx-3` |

Numbers are tabular wherever they line up (times, lengths, hours). No kicker over a title anywhere: "TO-DO · INBOX", "GOAL", "NEW GOAL · 4 OF 5", and "SUNDAY RESET" leave.

### 4.3 Space, corners, targets

- One gutter: 16 px (`--s4`) inside every sheet and card. Sections inside a sheet are 22 px apart (`--s5`); a title is 4 px under the header and its facts 6 px under it.
- Corners: sheets 28 (top only on a phone), cards 18, rows, fields, buttons and the toast 16 or 12, chips 9 or full pill.
- Every target is at least 44 by 44. Buttons in a footer are 52 tall. A row is at least 56 tall.

### 4.4 Contrast, measured

Every pair passes 4.5 to 1 for words and 3 to 1 for the parts of a control; computed against the real backgrounds with their alpha (the script is in the scratchpad, `contrast.mjs`).

| Pair | Ratio |
|---|---|
| White, `--tx-2`, `--tx-3`, `--tx-4` on the sheet (#1E1F23) | 16.5, 10.4, 7.5, 6.5 |
| The same on a raised row (#2C2C30) | 13.9, 8.8, 6.3, 5.5 |
| `--good` on the sheet; on a raised row | 9.5; 8.0 |
| Gold words on the sheet; ink on the gold button | 11.0; 11.3 |
| `--bad` (Remove, Delete) on the sheet | 8.3 |
| White, `--tx-2` on the toast (#2C2D31) | 13.8, 8.7 |
| Ink on white (selected) | 17.0 |
| The check's ring (white at 55 percent) against the sheet | 5.9 (a control part) |
| The grabber (white at 40 percent) against the sheet | 3.8 (a control part) |
| `--list-ink` (#24180A) on the tan, top to foot | 7.0, 5.6, 5.1 (was 6.1, 4.9, 4.4) |
| Block words on their blocks | work 5.4, family 5.2, us 5.1, yours 6.1, meals 4.9, home 5.7, sleep 5.6, friends 5.7 |
| The keep note on paper: title, words | 13.7, 8.8 (on the dark card today: 1.00, 1.56) |

### 4.5 Motion

Every move has a job: where it came from, what happened, or what changed. Nothing over a quarter second but the sheet's rise and the one authored moment (section 12). With Calmer motion or the system's reduced motion, each is a 160 ms fade and nothing travels.

| What | How |
|---|---|
| A sheet rises | 280 ms, `--f-out`, from the bottom edge; the scrim fades in at the same time |
| A sheet leaves | 200 ms, `--f-in`, down; a drag down past a quarter of its height or a flick also closes it |
| A page inside a sheet (Break it down, Change, a step) | slides in from the right 240 ms; the sheet's height follows in 200 ms |
| A press | sinks 1 px for 70 ms (V11's press) |
| A step checked | the ring fills `--good` in 160 ms, the name turns `--tx-3` and its line strikes through left to right in 200 ms, a soft tap |
| A row opens to edit | 200 ms height, the rows below slide; one open at a time |
| A toast | rises 16 px and fades in, 220 ms; leaves down 8 px, 160 ms; fully opaque in between |
| Rows that changed (new times, moved) | the time crossfades 160 ms; a moved row slides to its new place 240 ms |

---

## 5. Components

### 5.1 The sheet

Every panel on a phone opens in this one sheet: a to-do, a step, a goal, a session, dinner, Give it a time, Settings.

```
 ┌──────────────────────────────────────┐  ← 28 px top corners, attached to the bottom edge
 │                ━━━━                  │  grabber 36 × 5, white at 40%, 8 px from the top
 │ ‹ Study for exam            ( … ) Done│  header row 44 tall: Back (pages only) left; More, Done right
 │──────────────────────────────────────│  hairline only once the body has scrolled
 │ [■] Study for exam                    │  body: scrolls, 16 px gutter, no fade, full width
 │     Due Wed · 7 steps · 2 h           │
 │ ▬ ▬ ▬▬▬▬ ▬▬▬▬ ▬▬▬▬ ▬▬                 │
 │ ○ Gather the syllabus and your notes  │
 │   Start here · 5 min                  │
 │ ...                                   │
 │──────────────────────────────────────│  hairline when more is below
 │ 30 min a day, Thu to Tue. Change      │  footer, pinned: one line (two at most)
 │ ┌──────────────────────────────────┐ │
 │ │       Put them on my week        │ │  one gold, 52 tall; or a quiet one beside it
 │ └──────────────────────────────────┘ │
 │                                      │  16 px, or the safe area, whichever is more
 └──────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Container | `position: fixed; left: 0; right: 0; bottom: 0`. `--sf-sheet` (opaque), radius 28 28 0 0, a top hairline `inset 0 1px 0 var(--sf-edge)`, shadow `0 -12px 40px -12px rgba(0, 0, 0, 0.55)`. A flex column: header, body, footer. Never a mask, never a fade. |
| Height | Fits what's in it, up to `100dvh - 12px - env(safe-area-inset-top)`. `dvh`, not `vh`: on an iPhone `vh` is the height with the browser's bars away, so 82vh ran past the top. A short sheet (a step, a small to-do) sits low and the list stays in view above it. |
| Scrim | rgba(0, 0, 0, 0.32) over the list (V11's). A tap on it closes the sheet; words typed stay as drafts. |
| Grabber | 36 by 5, radius 3, white at 40 percent (3.8 to 1), centered 8 px from the top. The header row is its handle: drag down to close. |
| Header | 44 px row at 12 px from the top (56 in all). Right: More (a 44 px target, a 32 px circle in `--sf-hover`, the `more` mark 18) only when there is more, then **Done** (Onest 600 16, white, 44 tall). Left, on a page inside the sheet: ‹ and the page it came from (Onest 500 16, cut with an ellipsis at 60 percent). No title, no kicker, no x in a box. |
| Body | Scrolls on its own (`overscroll-behavior: contain`), padding 4 16 22, full width. A hairline fades in under the header once it has scrolled. |
| Footer | Pinned, `--sf-sheet`, padding 12 16 max(16 px, safe area). A line in 14 `--tx-2` (two lines at most; its key words white 600) with an optional inline **Change** (Onest 600 14, white, underlined 3 px below, a 44 px target). Then the buttons: one gold, full width; or a quiet one and the gold side by side (the quiet one first, never wider). A hairline above it only while the body has more below. |
| Toast | Sits 8 px above the footer, 12 px from each side (section 5.7). Never over the header, never over the footer's buttons. |
| Keyboard | When a field is focused, the footer rides on top of the keyboard (`visualViewport`), so the gold stays in reach. |
| Focus | Opens with focus on the title (screen readers hear the to-do's name first); Done closes and gives focus back to what opened it (V11's `sideFrom`). |
| On the open Duo and iPad | The same sheet becomes the right side panel: 420 wide, 12 px from the top, right, and bottom, radius 28 all round; header, body, and footer the same. On the open Duo it stays right of the fold. |

### 5.2 The next-move footer

The one gold button lives in the footer of every sheet, chosen by where the thing stands. Above it, one line says where it stands. When there's nothing to do now, the line says when the next thing is, and there's no button.

### 5.3 The step row

```
 ○  Gather the syllabus and your notes
    Start here · 5 min
 ─────────────────────────────────────  hairline, starting at the name
 ○  Study the hardest topic
    Fri 7:30 am · 30 min
```

| Part | Spec |
|---|---|
| Row | At least 56 tall; a 44 px column for the check, then the words. Hairlines between rows start at the words (inset 44). |
| Check | A 24 px circle, a 1.5 px ring of white at 55 percent, in a 44 px target. Done: filled `--good` with an ink check. |
| Name | Onest 500 16, white, two lines at most. |
| Meta | Onest 500 13, `--tx-2`: its length when it has no time ("5 min"); its day, time, and length when it has one ("Fri 7:30 am · 30 min"). A time that's only proposed (before Put them on my week) is underlined with a dashed line 3 px below, like the board's dashed landing outline. |
| Start here | The first open step's meta starts with "Start here ·" in `--good` 12/700. |
| Done | The name turns `--tx-3` and strikes through; the meta says "Done Thu". It stays where it was while the sheet is open. |
| Moved | For as long as the sheet is open, a moved step's meta says where it went: "Moved to Sat 9:15 am · 30 min". |
| Tap | Tapping the words opens the row in place (5.3.1). Long press lifts it to reorder. |

A draft row (in Break it down) has a 24 px raised circle with its number (12/700 `--tx-2`) where the check goes: they're not to-dos yet, and their order matters.

**5.3.1 The row, open.** One at a time, on a raised plate (`--sf-raised`, radius 16, padding 12): the name as a field (48 tall, Onest 500 16); length as five chips that fit one line at 386 wide (5 min, 15 min, 30 min, 45 min, 1 h; white is the picked one; a length that isn't one of them shows as a sixth chip, picked); then two buttons 44 tall: **Give it a time** (or **Move it** once it has one, or **Didn't get to it** once its time went by), quiet, and **Remove step** in `--bad` words, last.

**5.3.2 Numbers keep their units.** A number never wraps away from its unit or its "of": 400 h, 30 min, 7:30 am, 380 of 400 (a no-break space). The goal's line "about 380 of 400 / h" broke that way in the first mock.

### 5.4 The time bar

Under the to-do's facts: one bar the width of the sheet, 8 px tall, cut into the steps, each piece as long as its minutes (at least 12 px), 3 px apart, radius 4.

| Piece | Look |
|---|---|
| Still to do | white at 16 percent |
| The next one | the to-do's color, with a 1.5 px white ring at 50 percent |
| Done | the to-do's color, solid |
| Before it's broken down | one piece, the to-do's color at 35 percent, as long as its estimate |

It's the shape of the work at a glance: one small start, two big middles, a short end. It's where the signature moment happens (section 12).

### 5.5 The week strip and its cap

For Spread it out and goals: seven columns (the days ahead), each 40 wide, a 64 px well (`--sf-raised`, radius 8) with the day's pieces stacked from the bottom, the day's letter above (12/700 `--tx-3`) and its total under (12/600 `--tx-2`). The day's cap is a dashed line across the well at its height (white at 45 percent). Nothing crosses it; that's the promise, drawn. Today's column has a white ring; the due day a small flag.

### 5.6 Buttons, chips, the segmented control

| Kind | Spec | States |
|---|---|---|
| Gold (the one call) | 52 tall, radius 16, Onest 600 16, `--sf-ink` on `--k-gold` | press `--gold-hi` and 1 px down; focus a 2.5 px white ring 2 px out; can't be used yet: `--sf-raised` with `--tx-3` words (never faded gold); busy: the words stay, three dots pulse beside them |
| Quiet | 52 tall in a footer (44 elsewhere), radius 16, Onest 600 16, white on `--sf-hover` | press `--sf-press`; focus white ring; can't be used: no fill, `--tx-4` words |
| Text (Done, Back, Change, Not now) | Onest 600 16 (Change 14), white, a 44 px target | press `--sf-hover` behind it |
| Chip | 36 tall in a 44 target, radius full, Onest 600 13; `--sf-raised` and a hairline; picked: white with ink | |
| Segmented | 44 tall, radius 12, a `--sf-raised` track, segments Onest 600 14; the picked one white with ink, radius 9; the white slides (V11's zoom switch) | |

### 5.7 The toast

| | |
|---|---|
| Where | At the bottom: 8 px above a sheet's footer, or above the Add bar on the list. 12 px from each side. Never at the top, never over the buttons of the thing you tapped. |
| Look | `--sf-toast`, opaque, radius 16, a hairline, shadow `0 12px 32px -10px rgba(0, 0, 0, 0.6)`. At least 52 tall. |
| Words | Onest 500 16, white, left aligned, two lines at most: what happened and where. A 20 px `--good` check before them when something was done or placed. |
| Undo | Onest 600 16, white, on `--sf-hover`, radius 12, 44 tall, on the right. |
| Time | 4 s; 7 s with Undo; held while a finger is on it; a swipe down puts it away. |
| One at a time | A new one replaces the old in place (the words crossfade). Getting started's ticks show on its row, never as a second toast. |

### 5.8 The question card (Today)

A card on the list with the open question's ring (`inset 0 0 0 1.5px var(--cta-edge)`, V11's): the question in Onest 600 16 white, one line under it in 14 `--tx-2` only if it changes the answer, the answers as buttons (one tap each), and **Not now** as a white text button at the end. A question with one answer puts it beside the question (dinner's Decide, 104 wide at least) and its snooze and its no under it as text buttons, so the card is about 124 tall instead of 170. When this card holds the screen's one gold (the ranking in 8.1), its first answer is gold; otherwise all answers are quiet.

**On a short window** (under 640 tall: the folded Duo, a small phone): the head is 52 tall and the Now card and question card pad 12 by 14, so the next blocks start inside the first screen.

### 5.9 Grouped rows

For Settings and the This week card: rows 52 tall in one raised block (`--sf-raised` inside a sheet, the card itself on the list), hairlines inset 56. A row: a 30 px tile (radius 8, `--sf-hover`) with a white mark 16, the name (Onest 500 16), the value right (Onest 500 14 `--tx-2`), a chevron 14 `--tx-3`. A value that wants an answer has a 6 px gold dot before it.

---

## 6. The to-do sheet, state by state

The sample: "Study for exam", due Wednesday Oct 21, work's blue and the book mark. Claude's steps (Medium): Gather the syllabus and your notes (5 min, Start here), List every topic on the exam (10), Star the 3 topics you know least (5), Study the hardest topic (30), Study the other two starred topics (30), Do 15 practice questions (25), Redo the ones you missed (15). About 2 h in all; each step takes at least 15 min on the board, so 2 h 30 min there.

The head is the same in every state: the to-do's mark (28 px tile, radius 8), its name (Gabarito 22; tap to rename), and one line of facts in 14 `--tx-2`: "Due Wed · about 2 h" before it has steps, "Due Wed · 7 steps · 2 h" after, "Due Wed · done by Tue" once placed, "3 of 7 done · done by Tue" once started. The due day and the length are words you can tap (each opens its one control); with no due day the line starts "No due date". The list it's in shows only when it isn't Inbox. Then the time bar.

### A. New, no steps

**Before** (Russell's d813e522): the TO-DO · INBOX kicker and an x in a box; Add a due date; a 1 h stepper; "No time yet"; Give it a time beside Mark done; Steps; Break it down with Hide; "This sounds like a goal with a date." with Make it a goal.

**After.** The head, the time bar as one piece, and nothing else in the body. The sheet is short and sits low.
- Footer line: "About 2 h. Small steps are easier to start."
- Quiet: **Give it one time**. Gold: **Break it down**.
- A to-do of 30 min or less turns it around: line "About 15 min.", gold **Give it a time**, quiet **Break it down**.
- Make it a goal, Mark it done, Repeats, List, Kind of time, and Delete to-do are in More.

**Why.** "I opened it to study. It handed me a settings page. I don't know what to press first, so I close it."

### B. Break it down

A page inside the sheet: ‹ Study for exam. Its title is the to-do's name; under it, "7 steps · about 2 h · the first takes 5 min." Then **Step size**, a segmented control: Small, Medium, Big (one control for how fine, Goblin Tools' idea). Then the steps as draft rows, Add a step last, and the totals line from goals-fix: "About 2 h in all. Each step takes at least 15 min on the board, so 2 h 30 min there." Footer: one gold, **Use these 7 steps** (pinned, so it never sits 670 px below the fold again).

Where the steps come from:
- **Smart breakdowns on.** The built-in steps show at once, and a line above them says "Claude is writing steps for this one" with three quiet dots. When Claude answers, the rows change in place one after another (40 ms apart), and the line says "Steps from Claude" with a quiet **Use the built-in steps**. A size change after that asks Claude again for that size (the person already said yes), and a renamed or added step stays.
- **Claude didn't answer** (15 s, or an error): "Claude didn't answer. These are the built-in steps." with **Try again**.
- **The library doesn't know it, and Claude is off:** no template. "No ready steps for this one. What's the first thing you'd do?" with the Add a step field focused, and **Ask Claude for steps** under it when the site is set up for it (the first time, the consent sheet).
- **Off and set up:** the last row of the list is **Ask Claude for steps**, 44 tall.

**Why.** "'Review the rest' isn't a step." "Smaller steps threw away the good ones." "Change the sheets went to the end, after Vacuum. I can't move it." (long press reorders now.)

### C. Steps, no times yet: the plan, proposed

The rows already show where each step would go: "Thu 7:30 am · 5 min", the time underlined with a dashed line because it isn't placed yet. The answer leads; nothing to fill in.
- Footer line: "30 min a day, Thu to Tue. Done a day before it's due." with **Change**.
- Gold: **Put them on my week**.
- Toast, right after Use these 7 steps: "7 steps added." Undo.
- No due date: it spreads from tomorrow and says where it ends ("30 min a day from Thu. Done by Tue."), never an invented date.

**Why.** "After I added steps, a form opened: which days, how much, when, done by, a calendar of '15m' chips. For cleaning my room." "The chips say 15m. Which step? What time?"

### D. Change (Spread it out's choices)

A page: ‹ Study for exam, title "Spread it out". The week strip with its cap line on top, live. Then four groups, each one control:
- **Days:** Each day · Weekdays · Weekends · Pick days (Pick days opens seven round day buttons).
- **Most a day:** 15 min · 30 min · 45 min · 1 h.
- **Time of day:** Any · Morning · Afternoon · Evening.
- **Done by:** a row with the day ("Tue, Oct 20"), which opens the date picker.

The footer is the same as C's, its line updating as you pick: "45 min a day, Thu to Sun. Done 3 days before it's due." Gold: **Put them on my week**.

### E. Planned

Rows show their times solid: "Thu 7:30 am · 5 min". The time bar's first piece wears the ring.
- Toast: "On your week, Thu to Tue." Undo.
- Footer line, when nothing can happen now: "You're set. Next: tomorrow at 7:30 am." No button.
- When there's open time now that fits the next step: line "Next: Gather the syllabus, tomorrow 7:30 am.", gold **Start now · 5 min** (it moves the step to now and starts its timer; the toast says where it was).

### F. A step's time is now

Friday, 7:32 am. Footer line: "Now: Star the 3 topics you know least, 5 min." Quiet **Didn't get to it**, gold **Start**. Start runs the step's own timer on its block (the Now card shows it); the gold becomes **Done**. After the first ten minutes of a longer step the gold is Done from the start.

### G. Partly done

"3 of 7 done · done by Tue". Done rows stay where they are, struck through, "Done Thu"; three pieces of the bar are solid. The footer is F's or E's, whichever fits the moment.

### H. A step, open

Tap "Study the hardest topic": the row opens in place (5.3.1). Length chips with 30 min white; **Move it**; **Remove step** in `--bad` words. Removing gives "Study the hardest topic removed." Undo.

### I. Didn't get to it (a step's own sheet)

Tapping a step's block on the list opens this short sheet. Head: the step's name, the to-do's mark; facts: "Step 3 of 7 · Study for exam · Today, 7:30 am · 5 min". Rows: Open the to-do, Move it.
- Footer line, before the tap: "Didn't get to it moves it to Sat at 9:15 am." (After the due day: "Didn't get to it opens a time before Wed.")
- Two equal halves, both quiet: **Didn't get to it** and **Mark it done**. Neither is gold: either answer is fine. (Not "Done": the header's Done closes the sheet, and two Dones on one sheet would mean two things.)
- Toast after: "Moved to Sat at 9:15 am." Undo.

**Why.** "It moved to Saturday, after it's due Thursday. It told me after, not before." "On my phone there's no hint at all; the 'where it goes' line is a hover."

### J. Moved on its own

When a step's time goes by and the days ahead have room, it moves ahead on its own (the strategy's "bend, don't break"). The sheet opens with one calm line on a raised plate under the head: "Friday's step moved to Saturday, and the rest a day later. Still done by Wed." with **Undo**. The moved rows say "Moved to". The same line covers an appointment or a trip that pushed steps aside: "Dentist at 3 pm moved Study the hardest topic to Sat at 9:15 am."

### K. Find new times (after a few days away)

Sunday, 8 pm; three steps' times went by. Before moving anything, the sheet asks what happened. Top of the body: "3 steps went by. Check the ones you did." The three rows sit first, checks ready.
- Footer line: "The rest move ahead, up to 30 min a day."
- Gold: **Find new times**.

**Why.** "I tapped Find new times. Now none of my three steps has a time." (It showed nothing before moving, then took the step off.)

### L. It doesn't fit before it's due

If the rest can't fit by the due day under the cap, nothing moves until a choice is made. The sheet fits what's in it. Body: the question, in goals-fix's words: "5 steps of Study for exam don't fit by Wed." Under it, what's in the way: "Mon to Wed hold 1 h 30 min of the 2 h left. In the way: Work, Evening with Sam." Then the choices as rows (52 tall, radio, the first picked):
- **Do up to 45 min a day** ("Done Wed, the day it's due.")
- **Use 1 h of Evening with Sam on Mon** ("Mon 8:30 to 9:30 pm. Done Wed.")
- For anything that isn't an exam, a test, or an interview: **Push the date to Thu**. For one that is, never.
- **Take off Redo the ones you missed**, when that alone is enough.

Gold: **Use this**. The toast says where the steps went: "Study the hardest topic is Mon at 7:30 am. Study for exam takes up to 45 min a day now." Undo.

**Why.** "For Study for exam due Friday it said push it to Nov 5. There's no button to place anything." Never a dead end; never move an exam.

### M. More, and Make it a goal

More (the … beside Done) is a menu under it (260 wide, `--sf-toast`, radius 14, rows 44): **Make it a goal**, **Give it one time**, **Mark it done**, Repeats (Never), List (Inbox), Kind of time (Work), and under a rule, **Delete to-do** in `--bad` words.

Make it a goal shows in More only when it fits: due three weeks or more out, or no date and the words name an exam or a long project. Then (and only then) the body ends with one quiet line under the steps: "Weeks of work? A goal puts a little on each day until the date." with **Make it a goal**. It opens New goal's first page with the name and date filled in, the steps carried as parts.

### N. All done

"All 7 steps done." Gold: **Mark it done**. The bar is solid. Marking it done closes the sheet; the toast: "Study for exam is done." Undo.

### Size check

At 390 by 844 the sheet's body holds the head, the bar, and all seven steps, with the footer in view. At 386 by 580 the body holds the head, the bar, and four steps; the footer and its gold are always there.

---

## 7. Goals

### 7.1 New goal: three pages, not five

The header has **Cancel** on the left and three small marks in the middle for where you are (no "NEW GOAL · 1 OF 5"). Each page asks one question; the gold is **Next**, pinned. Before: five pages and about 25 controls before anything is placed; parts inputs cut their own names off ("Quantitative Metl").

1. **What's the goal?** The name field (Onest 500 16, 48 tall), suggestions as pills under it (Pass the bar exam, CFA Level I, Run a half marathon, Learn Spanish), then **By when?**: In a month · In 3 months · Pick a date. A name the library knows adds one line: "The bar exam: 9 parts, about 400 h. Change them later." (from Claude: "Claude's estimate: about 300 h.")
2. **How much time can you give it?** Days as seven round buttons (white is picked); On a weekday: 1 h · 2 h · 3 h · 4 h; On a weekend day: 2 h · 3 h · 4 h · 5 h; When: Any · Mornings · Afternoons · Evenings. The footer's line is live: "Holds about 380 of 400 h by Feb 24." When Next has to wait, the line says why, in goals-fix's words: "Pick at least one day to go on." and Next is the can't-be-used look.
3. **Your plan.** "Feb 24, in 19 weeks. 3 h on weekdays, 5 h on weekends." The first week as the week strip with its caps; "This week: 13.5 h, from tomorrow at 7:45 am."; and one row, "9 parts · about 400 h", which opens them. Gold: **Start the plan**. When the first week holds nothing, the gold is the fix ("Use any time of day") and Start the plan waits.

### 7.2 The goal's sheet

Before (shot 63): GOAL kicker, a 400 h bar, "Behind by 113.5 h" in bold a minute after starting, a NEXT card, two fix cards, then 12 to 16 session rows.

After:
- Head: the star tile in the goal's color, "Pass the bar exam", facts "Feb 24 · in 19 weeks · 17 of 400 h" (whole hours past 20).
- **This week**, the week strip: done sessions solid, to come outlined, the past ones not answered striped, with a gold dot by their hours. Tapping a day lists its sessions, and an unconfirmed one reads "Did it happen?" in place of its length (goals-fix's words). Under the strip: "This week: 5 of 13.5 h done." and, from goals-fix, "1 h 30 min not confirmed yet" in gold words with a quiet **Answer** (it opens the check-in in place).
- **How it stands**, one calm line on a raised plate. Short isn't behind: "Your days hold about 380 of 400 h by Feb 24." with **Make it fit**. "Behind" only for time that went by and can't fit in the days ahead.
- Two rows: Parts (9), Change the plan.
- Footer: "Next: Contracts, tomorrow at 7:45 am, 45 min." No gold; at the session's time, gold **Start**. When the plan is short and nothing is happening now, the gold is **Make it fit**.

### 7.3 A session's sheet

Short, like a step's. Head: "Civil Procedure", the goal's star; facts "Pass the bar exam · Today, 3:30 to 4:30 pm · 1 h". Rows: Move it, Open the goal. The footer follows the clock:
- Before it: "Starts in 20 min." No gold.
- In it: "40 min left." Gold **Done**; quiet **Stop here**.
- After it, not answered: "Did it happen?" with three equal buttons, **Yes**, **Some of it**, **No**. Some of it opens chips (15 min, 30 min, 45 min) in place. No: "1 h moved to Thu and Sat." Undo.
- Answered: "Done. You said so this morning." with a quiet **Not done** (one record of whether it happened).

### 7.4 The morning check-in

On Today, as the one question card (5.8). One unanswered day: "Did yesterday's 2 h on Pass the bar exam happen?" (goals-fix's words), answers **Yes**, **Some of it**, **No**, and **Not now**. Several days (goals-fix asks about each unanswered day of the past week): one card, "Did these happen?", a row per day ("Mon · 2 h", "Tue · 1 h 30 min") with a three-part control each (Yes · Some · No), and **Not now**. After the answers, one line in the card says where the time went, never a total behind: "45 min counted. The other 45 min is on Thu and Fri." Undo. Then the card folds.

**Why.** "I said Some of it, 45 min. It said 'Behind by 128 h. Add a day, make days a little longer, or move the date.' I told the truth and got a lecture."

---

## 8. Today on the phone

The job: a two second glance, often one handed, often in the middle of something. Today answers three things: what I'm in, what's next and how soon, and the one thing to do now. Everything else is one tap away.

Before: the gold SUNDAY RESET kicker that opens Settings, the seven-day strip, the now card, the Earlier fold (4.16 to 1), the whole day as blocks, Next 7 days with checkboxes whose names check the to-do off, Groceries, Goals, Getting started, and the keep note nobody can read. Jordan at 4:20 pm: 9 sections, 38 buttons (21 on the first screen), about 250 words, and his own day starts 1,023 px down.

After, top to bottom: the head, the Now card, one question (if any), the next three, This week, and the Add bar.

### 8.1 The gold, ranked

One gold button on the first screen, chosen by the first rule that applies (the Today walk's ranking):
1. **Start Sunday Reset**, when it's due and you're in open time.
2. **Start** your next thing, in open time: the next step of the most urgent to-do, or the next goal session pulled forward.
3. The question with the nearest deadline: dinner from 3 pm, a plan that doesn't fit, yesterday's session.
4. **Start** in a step's or session's first ten minutes; **Done** after that, and in your own block's last 15 minutes.

Otherwise none. Asleep, in a locked block, or in free time, no gold: that is the answer.

### 8.2 The head

One dark card, 64 tall: the date as a button ("Friday, Oct 16" in Gabarito 19, with a down mark), the clock (Onest 500 14 `--tx-2`), and Settings (the sliders mark in a 44 px target, with a gold dot while the board is at risk). The date opens **The next 7 days**: a sheet of seven rows, each the day ("Sat 17") and what it holds in one line ("Soccer at 10 · Dinner: tacos"), and tapping one shows that day. A sideways swipe on the list moves a day too.

Leaves: the gold SUNDAY RESET kicker (it opened Settings), the seven-day strip (in the sheet now).

### 8.3 The Now card

| The moment | Big line · right | Under it | Gold |
|---|---|---|---|
| In your own block | Work · 1 h 10 min left | Then Pick up Robin at 4:45, in 1 h 10 min. | none; quiet Done early, More |
| Its last 15 minutes | Work · 12 min left | Then Pick up Robin at 4:45. | Done; quiet 15 more min |
| A step or session, first 10 minutes | Study the hardest topic · 30 min | Then Work at 9, in 28 min. | Start |
| Started | Study the hardest topic · 24 min left | Then Work at 9. | Done |
| A locked block | Work, until 4:45 | Then Pick up Robin, in 1 h 10 min. | none |
| 15 minutes before a locked block that leaves home | Leave for Pick up Robin in 10 min | at 4:45 pm | none (the pin turns gold) |
| Open time, something of yours fits | Open time · 1 h 40 min (a dashed square for its mark, never a box to tick) | Until Dinner at 6. (the dashed bar) | Start: Outline torts essay, 30 min; quiet Something else |
| After Done early (the time is held open) | Open until 5:15 · 25 min back | Then Pick up Robin at 5:15. | Start: Pay the bills, 15 min |
| Free time | Free evening, until 11 | Nothing planned, on purpose. | none |
| Evening, the last 3 hours before bed | Evening with Sam · 1 h 30 min left | Tomorrow at 8:30: Drop off Robin. | none; quiet See tomorrow |
| Asleep | Sleep · 6 h 50 min left | Up at 6:30. Drop off Robin at 8:30. | none |

The card: `--sf` on the tan, radius 18, padding 16; the mark 22 and the name in Gabarito 22; time left Onest 600 16; V11's bar (22 tall, worn to now, the pin, the next block peeking in); the line in 14 `--tx-2`; quiet buttons 44 tall in a row, or the gold full width, 52. Start places the thing from now with Undo and turns the bar into its timer.

### 8.4 The one question

One question card (5.8) at a time, the nearest deadline first; the next takes its place when it's answered. When more are waiting, one quiet line under the card: "1 more question".
- **Dinner, from 3 pm:** "Dinner at 6 isn't decided." with **Decide** beside it (gold when it holds the gold), which opens the dinner sheet at "How's dinner happening?" (Cook opens at the dish). Under it, text buttons: **Ask at 5:15**, which steps around a locked block (its hint: "after Pick up Robin") and says Ask, not Remind, unless reminders are on; and **Not tonight**.
- **A plan that doesn't fit** (goals-fix's card): "Vacuum doesn't fit by Monday now." The answers stacked full width, 52 tall: **Do up to 30 min a day**, **Push the date to Tuesday**, **Take off Vacuum**; **Not now**. One tap does it, with its toast and Undo ("Vacuum is Sat at 10 am. Clean my room takes up to 30 min a day now.").
- **Yesterday's session:** 7.4.

### 8.5 The next three

The next three blocks after now, as V11's blocks on the tan (the day's colors, the bevel, a 58 px time column in `--list-ink`). Then two disclosure buttons side by side under the blocks, Onest 700 14 in `--list-ink`, 44 tall, each with a down mark: "Rest of today: 2 more" and "Earlier today: 7", each opening in place. No tinted fold (it failed at 4.16 to 1).

### 8.6 This week

One card, "This week" (Gabarito 19), grouped rows (5.9), only the ones that apply:
- **To-dos due** · 5, opening **Due this week** as a sheet: the name opens the to-do, only the round check marks it done, **Give it a time** is a real pill, up to five rows, then "3 from earlier weeks" which opens them (never "40 days ago").
- **Groceries** · 7 to get, opening the list with its checks.
- **Pass the bar exam** · 6 of 10 h (a gold dot and "2 h to confirm" while sessions wait for an answer), opening the goal. With a session today the row says it: "Today 5:15 pm · 45 min".
- **Getting started** · 3 of 5, until it's done or put away.

Leaves: the Next 7 days, Groceries, Goals, and Getting started cards, each with its own buttons.

### 8.7 The keep note

Only while the board is at risk (Safari or Chrome on iOS, not on the Home Screen, changes saved, no backup in 7 days), at most once a fortnight, at the end of the list; the rest of the time it lives in Settings, Your data, with the gold dot on the Settings mark. One note, not two (Keep this week and Put it on your Home Screen said the same thing). It's paper, as the app's notes are: #F6EEE0 with ink #2A2118 (13.7 to 1) and #4E3F2C (8.8 to 1).
- Title: "Keep your week on this phone"
- Line: "This browser can clear your week after 7 days away. On your Home Screen, it stays."
- Steps: 1 Download a backup (**Download**, ink on paper, 44 tall), 2 Tap Share, then Add to Home Screen, 3 Open it there and load the backup.
- **Not this month**.

"Safari" became "This browser": Russell uses Chrome, and every browser on an iPhone has the same rule.

### 8.8 Night

After the day's bed: the Now card is Sleep, the next three are tomorrow's first locked thing ("Tomorrow 8:30 am · Drop off Robin"), and This week folds to one row ("5 to-dos this week"). No questions, no gold.

### 8.9 The Add bar

Pinned at the foot: `--sf-solid`, a hairline on top, padding 10 12 plus the safe area. The field (48 tall, radius 14, `--sf-hover` with a 1.5 px white ring at 22 percent, the plus mark, the example "Add: Gym 6pm" in `--tx-4`), and **Open the desk** (Onest 600 16).

While typing, the preview sits on top of the bar (`--sf-toast`, radius 16): the words as read ("Study for exam"), what it will be ("A to-do, no day yet · about 2 h"), then quiet **Add and break it down** and gold **Add to-do**. With a time ("Gym 6pm"): "Today, 6 to 7 pm. Takes 1 h of open time." and gold **Add at 6 pm**. After adding, the toast: "Study for exam added." Undo. No Getting started toast.

### 8.10 Numbers to hold it to

First screen: one gold at most, a dozen things to tap at most (17 to 21 today), under 80 words (about 150 today), the next three always in view, nothing see-through. The whole list fits in about one screen before anything is opened.

---

## 9. Toasts

The rules are in 5.7. The words, as goals-fix and the app write them, kept short and specific:

| When | Toast |
|---|---|
| Steps added | 7 steps added. · Undo |
| Placed | On your week, Thu to Tue. · Undo |
| A step moved by hand | Moved to Sat at 9:15 am. · Undo |
| A choice taken on a plan that didn't fit | Vacuum is Sat at 10 am. Clean my room takes up to 30 min a day now. · Undo |
| An appointment pushed things aside | Dentist at 3 pm. Civil Procedure moved to Thu at 7:45 am. · Undo |
| A session said not to happen | 1 h moved to Thu and Sat. · Undo |
| A step checked | Step done. 4 left. · Undo |
| Undo itself | Study for exam is as it was. |
| Added from the phone | Study for exam added. · Undo |

Inside a sheet, a toast never repeats the name the sheet shows ("7 steps added.", not "Study for exam: 6 steps added."). On the list, it names the thing.

---

## 10. Settings on the phone

**The first page.** A tall sheet: "Settings" (Gabarito 26), Find a setting (44 tall, `--sf-raised`, radius 12, the search mark), then grouped rows (5.9) under section names in sentence case (12/600 `--tx-3`): Your week (You and home; Usual days; Sunday Reset, "Sun 6 pm"; Goals, "1"), Your board (Block library; Calendars), This device (The desk; Reading and sound; Smart breakdowns, "On"), Sharing and safekeeping (Your data, with the gold dot and "Back up" while the board is at risk), Help (Help; Dev on a local address). No Overview row with a white fill on a phone: the list is the overview, each row with its value.

**A page.** ‹ Settings on the left, Done on the right; the title (Gabarito 22); groups; who it's for ("This device only.") as the last group's foot.

**Smart breakdowns.** Before (Russell's 070af489): a title, "On this device only." with a grey square, a card with the switch and two lines, a paragraph, a link, and a screen of empty space.

After:
- Group: one row, **Ask Claude for steps**, with the switch (51 by 31; on is `--good`, the knob white). Under it: "When the built-in steps don't fit, Claude writes steps with a time on each. On this device only."
- Group, "What's sent": "Only the words of the to-do or goal you ask about." and "Nothing else on your board leaves this phone." Then a row, **Read the privacy policy**, with the arrow mark.
- Foot: "Anthropic processes them under its API terms."

The sheet fits what's on the page.

---

## 11. On the open Duo (951 by 669) and the iPad

- **The sheet** becomes the right side panel (5.1): 420 wide, radius 28 all round, 12 px from the edges, the footer pinned at its bottom. On the open Duo it stays right of the fold; when the shell passes `--fold-x`, the panel's left edge is at least 16 px past it.
- **The to-do sheet** is unchanged inside the panel. At 669 tall the body holds the head and all seven steps.
- **Break it down and Change** are pages in the panel, as on the phone.
- **Toasts** sit 8 px above the panel's footer, inside the panel's column, never across the fold. On the list or the desk: at the bottom, 560 wide at most, on the side away from the fold.
- **Goals:** New goal is a centered sheet 540 wide on the iPad (Apple's form sheet) and the right panel on the open Duo; the goal's sheet is the panel.
- **Today** on the open Duo is V11's book: the Now card, the one question, and the next three on the left page; the day on the right page. On an iPad it's the desk; the Now band is the desk's builder's.
- **Settings** keeps V11's two panes on a wide window (list and page side by side), with the same grouped rows; on the open Duo the list is the left page and the page the right.

---

## 12. The signature move: the block breaks

When you tap Break it down, the to-do's one long piece in the time bar cracks into its steps. The breaks open left to right, 40 ms apart; each piece dips 2 px and settles, the way V11's blocks land; the first piece takes the white ring; one soft knock of wood plays as the last break opens. 360 ms in all. Then the draft rows rise in under the bar, 30 ms apart.

From then on the bar is the to-do's shape: a piece fills solid as its step is checked (with the press), a piece that moves slides to its new place, and the last one filling is the moment the to-do is done.

Why this one: it's the app's promise in one motion. Big things become small blocks you can start. It's made of the board's own material (wood that presses and knocks), it happens at the moment a person most needs reassurance (looking at something big), and it teaches what Break it down does without a word. With Calmer motion or the system's reduced motion: the bar redraws in place with a 160 ms crossfade and no sound.

The other candidate, if Russell prefers it: **the plan bends.** When a step is missed, its row slides down to its new day and the done-by day under the title ticks over ("Still done by Wed"), with the same soft knock. It shows the strategy's "bend, don't break" as motion.

---

## 13. Copy, old and new

| Where | Before | After |
|---|---|---|
| Sheet header | TO-DO · INBOX, an x in a box | Done (and More) |
| New to-do | Add a due date · 1 h stepper · No time yet · Give it a time · Mark done | Due Wed · about 2 h. About 2 h. Small steps are easier to start. **Break it down** |
| Goal hint | This sounds like a goal with a date. Make it a goal | In More, and only when it fits: Weeks of work? A goal puts a little on each day until the date. |
| Break it down | Smaller steps · Bigger steps · Smarter steps from Claude · Add 6 steps | Step size: Small, Medium, Big · Claude is writing steps for this one · **Use these 7 steps** |
| Step rows | No time yet (on every row), a minus and plus | 5 min · Thu 7:30 am · 5 min · Start here · 5 min |
| Spread it out | Which days · Up to 30 min a day · When · Done by · a month grid · Spread 6 steps | 30 min a day, Thu to Tue. Done a day before it's due. Change · **Put them on my week** |
| After spreading | Every step has a time | You're set. Next: tomorrow at 7:30 am. |
| A step that passed | Time passed | Didn't get to it moves it to Sat at 9:15 am. |
| Doesn't fit | This needs 5 more days than are left before Friday. Push the date to Nov 5 | Mon to Wed hold 90 of the 2 h left. In the way: Work, Evening with Sam. **Use this** |
| Toast | Study for exam: 6 steps added. | 7 steps added. |
| Goal | Behind by 113.5 h. Add a day, make days a little longer, or move the date. | Your days hold about 380 of 400 h by Feb 24. Make it fit |
| Check-in answer | Behind by 114 h. Add a day... | 45 min counted. The other 45 min is on Thu and Fri. |
| Today's head | SUNDAY RESET (opens Settings) | Friday, Oct 16 (opens the next 7 days) · Settings |
| To-dos card | Next 7 days · Due Sep 4, 40 days ago · Time passed | To-dos due · 5 → 3 from earlier weeks |
| Groceries | 7 things to get this week · Open the meal board | Groceries · 7 to get |
| Keep note | Safari clears sites you don't visit for a week. Your Home Screen keeps it. | This browser can clear your week after 7 days away. On your Home Screen, it stays. |
| Smart breakdowns | Smart breakdowns · Claude suggests steps or parts when the built-in ones don't fit | Ask Claude for steps · When the built-in steps don't fit, Claude writes steps with a time on each. |

Checked against Russell's rules: no em or en dashes, no double hyphens; no just, simply, really, please, actually, easily; to-do with a hyphen; every button a verb (Done, Break it down, Use these 7 steps, Put them on my week, Start, Find new times, Use this, Make it fit, Decide, Download); nothing scolds.

---

## 14. What leaves, and where it went

| Left | Where it is now |
|---|---|
| The kicker over every title, the x in a box | Done in the corner; the title is the content |
| The due date button and the length stepper | Words in the facts line you can tap |
| "No time yet" (the row and on every step) | The footer says it once |
| Give it a time beside Mark done | The footer's gold, chosen by state; Mark it done in More |
| The goal box between the steps | More, and one quiet line when it fits |
| The tile, the x, and the stepper on every step | One tap opens the row: length chips, Move it, Remove step |
| Spread it out's open form and month grid | A sentence and Change; the choices on their own page with the week strip |
| Smaller steps and Bigger steps as two buttons | One Step size control |
| The see-through fade at the sheet's foot | An opaque footer, the sheet attached to the bottom |
| Toasts at the top, see-through | Toasts at the bottom, opaque, one at a time |
| The seven-day strip on Today | The next 7 days sheet behind the date, and the swipe |
| The Next 7 days, Groceries, Goals, and Getting started cards | Rows in This week, each opening its sheet |
| The second keep card | One paper note, only when it matters; Settings, Your data, the rest of the time |

---

## 15. What I'd build first

1. **The sheet, toasts, and the keep note (S, this week).** Russell's three visual hits in a day: the sheet attached to the bottom with `--sf-sheet`, `dvh`, the safe area, and no mask (`board/src/style.css` `.side.more` and `body.phone .side`; `variants/corners11/css/touch.css`, `duo.css`); the content at full width (the close button in the header row only); the pinned footer (`.side .go.wide` is already sticky; give every phone sheet a real footer); toasts at the bottom above the footer, opaque, without the fade in their keyframes, one at a time (`mealspeople.css` line 38, `@keyframes toast`); the keep note on paper (`polish.css`: `.td-card:not(.td-note)`); `--list-ink` for print on the tan.
2. **The to-do sheet (L).** The head and facts line, the next-move footer by state, one-line step rows that open in place, Break it down as a page with Step size and Claude while it waits, the proposed plan with Change, Didn't get to it saying where before the tap, Find new times asking first, and the choices that never dead end. `board/src/app.js` (`taskPanelFeel`, `bdSection`, `spreadSection`, `findNewTimes`, `shortChoose`), `variants/corners11/css/breakdown.css`, `todos.css`. Then the time bar and the block breaking.
3. **Today's one gold (M).** The ranking, the Now card's states, one question at a time, the next three, This week. `board/src/app.js` (`renderToday`, `nowStrip`, `todayFoot`, `shortAskCard`, `goalAskCard`), `board/src/model.js` (your next thing from `taskPlan`, `dueSoon`, and goal sessions).
4. **Goals (M).** Three pages, the goal's sheet with its strip and one calm line, the session sheet, the check-in that says where the time went. `board/src/app.js` (`openGoalFlow`, `goalPanel`, `sessionPanel`, `answerAsk`), `variants/corners11/css/goals.css`.
5. **Settings' grouped rows (S).** `board/src/app.js` (`SET_PAGES`, `PAGE`), `variants/corners11/polish.css`.

## 16. For Russell to decide

1. **The signature move:** the block breaks (recommended), or the plan bends.
2. **Start.** A step's or session's gold is Start, running a short timer on its own block that the Now card takes over (recommended; starting is the hardest move).
3. **Misses:** goal sessions move ahead on their own with a line and Undo (recommended); a to-do's steps ask first after a few days away ("Check the ones you did"), since a step can happen without a check.
4. **Today's cards into This week:** three rows that each open their sheet (recommended), or one row that opens the week's plan.
5. **The keep note:** paper (recommended; it's a note from the app, not part of the day), or the dark card with light words.
6. **Soft time with a yes:** may a plan that doesn't fit offer 30 min of a soft block such as Evening with Sam, each time with Undo? (recommended)
7. **The sheet's corner:** Done (recommended, iOS), or V11's x.

## 17. Self-check

Scored 1 to 5 against the anchors, after two review rounds on the mock's own screenshots at both sizes.

| | Score | Note |
|---|---|---|
| Job clarity | 5 | Every sheet: one line on where it stands, one gold, or none on purpose |
| Information architecture | 4 | One object per sheet; This week's three rows against one row for the week's plan is Russell's call (16.4) |
| Progressive disclosure | 5 | Level 0 is a title, a line, a list; every other control is one tap away, in place |
| Grid and rhythm | 4 | One 16 px gutter and V11's 4, 8, 12, 16, 22 scale; the 22 step is V11's, kept |
| Type | 5 | Two faces, the eight sizes, numbers kept with their units |
| Color | 4 | Gold is the one call per screen; gold words also mark an open question (V11's rule), never a second button |
| Contrast | 5 | Measured, every pair (4.4); two old failures on the tan fixed with `--list-ink` |
| Interaction states | 4 | Default, press, focus, can't be used, busy specified; error toasts follow 5.7 but aren't drawn |
| Motion | 4 | Each move has a job; one authored moment |
| Edge cases | 4 | No date, small to-dos, Claude off, Claude failing, unknown jobs, misses, can't fit, nights, short windows |
| Words | 5 | Checked line by line against Russell's rules |
| Signature | 4 | The block breaks; live in the click-through |
| Distance from generic | 4 | The board's own blocks, colors, and wood carry it; the grouped rows are familiar on purpose |

**The design detector** (`impeccable detect`) flags three things in the mock, each kept on purpose: the three waiting dots (they're tied to a live request to Claude, and stop when it answers); the warm shadows under blocks and the note (V11's own, with an offset, on the tan, not a glow); and stripes (V11's language for soft and open time, and here for a session nobody has answered for, so they carry meaning).

**How to use the mock.** Open `docs/mocks/phone-redesign.html` on the phone (it's one file, about 815 KB, fonts and pictures inside). The bar at the top switches between the iPhone frames, the folded Duo's, or both, and hides the before shots. Every frame scrolls. The first one is a click-through of the to-do sheet: Break it down, watch the bar break, change the step size, Use these steps, Change, Put them on my week, then check steps off; Undo works on every toast. `?size=386` opens it on the Duo's frames.
