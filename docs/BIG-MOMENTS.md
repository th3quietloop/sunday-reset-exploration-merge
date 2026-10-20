# Big moments (V11-2)

Russell approved the mock on Oct 20, 2026: `docs/mocks/big-moments.html`. This is the spec every helper builds from. Read the mock first; it is the picture of everything below.

## Why

Russell's four scenarios, graded honestly against V11:

| Scenario | V11 | What was missing |
|---|---|---|
| His brother's bar exam, months away | 3/5 | You can't see the months: no stages, goals not on Month or Year, sessions only two weeks ahead |
| A trip, reaching out to family ahead | 2/5 | Nothing about people. Time blindness turned "I'll get to it" into a week's notice |
| A friend's wedding: suit, tickets | 2/5 | A wedding only suggested a gift; "something to wear" started 3 weeks out, too late for a suit |
| Packing the night before | 3/5 | The steps live on the to-do, not in the block you're in that night |

V11 has the brains (it knows lead times, breaks things down, bends when you miss), not the eyes. The goal is 4 or better on all four, and on the shapes his scenarios didn't cover: dates you host, deadlines, fuzzy dates, goals with no date, steps after the date, and other people in the house.

## The shape

A big thing is **something with a date, a window, or no date at all, with a few steps, each on its last good day.** Some steps happen after the date. Some steps are messages to people. Some blocks carry a list. **Only the next step is loud;** everything else folds.

It lives in what V11 already has: Look ahead (dates), Goals, To-dos, the board, and Today's one question. No new section, no new tab.

## Saved state (Data.VERSION 9)

Bump `Data.VERSION` to 9 with a migration step and tests. All new fields are optional; a v8 board reads the same.

**An event** (`state.events`, read through `liveEvents`):
- `window: { from, to }` with `date: null` is a **fuzzy date** ("sometime in spring"). It puts nothing on the board, is never a trip day, and shows in Look ahead under its window. Picking a date sets `date` (and `end` for a trip) and removes `window`.
- `host: true`: the person is hosting it.
- `away: true`: it's out of town (a wedding they travel to).
- `ready` entries may carry `who` (a person's name, for a heads-up). The prep key is then `k + ':' + who + '@' + date`.

**A to-do** (`state.tasks`):
- `msg: { to, text }`: a message step. `text` is the suggested text, saved only once the person edits it. **The app never sends anything.** It opens Messages with the text (`sms:&body=` on iPhone, `sms:?body=` elsewhere), or the share sheet, or copies it with a toast that says so.
- `list: [{ id, name, done }]`: things inside the block (a packing list). Steps have time; list items don't.
- `of: eventId`: the big thing it belongs to (the event's `prep` map already points the other way).

**A goal:** `date` is already optional in `Model.newGoal`. Make goals with no date first-class in the app (`liveGoal` in app.js requires a date today). Stages are computed, never saved. Practice exam sessions are adds with `practice: true`.

## Getting ready, extended (model.js `READY`, `READY_FOR`, `readySuggest`)

Keep every existing kind and its numbers. `lead` is the days before the date it starts asking; `by` is its **last good day**, in days before the date. A kind with `after: true` is due after the date (after the trip's `end`): it starts the day after, and `by` counts days after.

| Key | To-do | lead | by | Notes |
|---|---|---|---|---|
| headsup | Give {who} a heads-up | 42 | 28 | one per person; `msg`; why: "A month's notice" |
| rsvp | Reply to {x} | 42 | 28 | `msg` |
| stay | Book a place to stay for {x} | 56 | 28 | |
| outfit | Get the outfit for {x} | 56 | 21 | why: "Leaves time for tailoring and shipping" |
| timeoff | Ask for time off for {x} | 42 | 28 | only on a board with work |
| invites | Send the invites for {x} | 35 | 21 | host; `msg` |
| food | Plan the food for {x} | 14 | 5 | host |
| shop | Shop for {x} | 3 | 1 | host |
| tidy | Get the place ready for {x} | 2 | 1 | host |
| papers | Gather what {x} needs | 28 | 14 | deadline |
| finish | Finish {x} | 14 | 3 | deadline |
| notice | Give notice for {x} | 45 | 30 | move |
| movers | Book movers for {x} | 56 | 42 | move |
| address | Change your address for {x} | 14 | 7 | move |
| packup | Pack up for {x}, a little each day | 21 | 2 | move; spread |
| pickdate | Pick the date for {x} | | | fuzzy only: due before the window opens, early enough for the longest lead |
| unpack | Unpack after {x} | after | 1 | |
| groceries | Groceries after {x} | after | 1 | |
| thanks | Thank-you notes for {x} | after | 14 | host; `msg` |

What each date offers by default (the person deletes what doesn't apply; nobody has to think of it):
- **trip:** travel, stay, a heads-up per person, time off, pack, unpack, groceries.
- **going to a wedding:** rsvp, outfit, gift (lead 28, by 7), plus travel, stay and time off when `away`.
- **a party, birthday or graduation you go to:** gift, rsvp.
- **concerts and shows:** tickets (as now).
- **hosting:** invites, food, shop, tidy, thanks.
- **a deadline** (taxes, a renewal, an application, or anything marked as one): papers, finish.
- **a move** (dated or fuzzy): notice, movers, address, packup, unpack; pickdate while fuzzy.

The board's household shapes the list: no work, no time off; kids at home put each kid's bag in the packing list by name. A `why` is shown only where the kind has one. **Never invent a number:** no prices, no "fees go up by".

## The model's new API

Pure functions in `board/src/model.js`, tested in node.

**`Model.countdown(state, ref, today, nowMin)`**, where `ref` is `{ event: id }` or `{ goal: id }`. It returns everything the countdown draws:

```
{ shape: 'date' | 'window' | 'goal' | 'rhythm',
  title, icon, cat,
  date, end, window,                    // whichever apply
  words,                                // 'Dec 18 to 22 · in 8 weeks', 'Sometime in spring · Mar to May',
                                        // 'Feb 24 · in 18 weeks', '3 times a week · no end date'
  stand,                                // goals: 'On track' or V11's own short words, else null
  road: { from, to, now,                // the dates it spans, to scale; now is today
          spans: [{ from, to, name, cat }],     // the trip or the event itself
          window: { from, to } | null,
          stages: [{ from, to, name }],         // exam goals
          marks: [{ date, name }],              // practice exams, the exam day
          pins: [{ date, name, icon, cat, status, id }] },  // last good days
  next: item | null,                    // the one loud step
  rest: [item],                         // folded
  week: { planned, done, items } | null,        // goals with a date
  weeks: [{ from, done, of }] | null }          // rhythm goals: the last 8 weeks, this one last
```

An **item** is `{ id, name, icon, cat, date, start, dur, status, why, msg, task, placed }`:
- `date` is its last good day, and `start` is when it starts asking.
- `status` is one of done, next, later, after, or waiting (a fuzzy date's step before the date is picked).
- `msg` is `{ to, text }` or null.
- `task` is its to-do's id, or null.
- `placed` is `{ date, start }` when it's on the board.

**Exam stages:** for a goal of kind exam, Learn runs from the start to about half the time; Practice runs to about the last six weeks, with a practice exam every other Saturday, Practice and Review only; Review runs to 3 days out; then the taper that already exists. Scale the stages for short runways, and name them plainly.

**`Model.suggestText(kind, facts)`** gives a message's suggested text, made on the device:
- **headsup:** "Hey {who}! I'll be in {place} {dates} and would love to see you. Are you around?"
- **rsvp:** "Hi! I'd love to come to {name} on {date}. Count me in."
- **invites:** "Hey! I'm having {name} on {date}. Would love for you to come. Can you make it?"
- **thanks:** "Thank you so much for {name}. It meant a lot."

**Two new moments in `Model.momentFor`**, each asked once and put off with words:
- **headsup:** a message step whose start has come and isn't done: "Your aunt would love some notice about LA. Text her this week?" Lowest priority after dinner and the kind of day.
- **yesterday:** the morning after, placed to-dos, steps or goal sessions whose time passed with no check: "2 things from yesterday didn't get a check." It opens a small sheet where each one is Done, Move, or Let go. Let go sends a to-do back to the list and never marks it done. This replaces the separate "Something changed" idea.

## The surfaces

**A. Steps are blocks** (mock screen 1), on the desk's to-do panel and the phone's to-do sheet:
- **Each step is a brick:** the to-do's color, the dotted grip V11's bricks use, the name, and its time or its last good day. Drag it onto the board; that already works and must stay.
- **Not on the week yet:** a step that isn't on your week is an outline brick that says "Not on your week yet · by Sat".
- **The circle beside each brick means only Done.** A done step becomes a grey brick with a line through its name and "Done today", in a real color, never faded with alpha.
- **"Start here" becomes Next:** a green tag on the first step that's left, with a green ring. It moves as steps are done.
- **The footer:** "Drag a step onto a day, or" sits above the gold "Put the rest on my week", with the rule line under it.
- **Message steps** show the suggested text as a bubble, with "Text {name}" and Edit.
- **Editing a text** (mock screen 2b):
  - Edit turns the bubble itself into the text box, focused with the caret at the end, so the person sees exactly what goes out. The label above it reads "Your text".
  - Three quick versions sit under it as outlined pills, the way V11's suggestions do: Shorter, Warmer, and Ask about a day. Ask about a day uses the trip's open days. All three are made on the device by `Model.suggestText`.
  - "Back to the suggestion" shows only once the text differs from the suggestion.
  - The buttons are the gold "Text {name}", which sends what's in the box through Messages, and Done, which keeps the text on the to-do (`msg.text`) and goes back to the bubble.
  - While editing, the road folds away. On the phone, the buttons ride above the keyboard.
- **A spacing pass for the whole sheet:** one rhythm (4, 8, 12, 16, 24) and the title wrapping before the corner buttons.

**B. The countdown** (mock screens 2 to 5): one panel on the desk and one sheet on the phone, drawn from `Model.countdown`.
- **The road** is drawn to scale: a weeks track, today's red pin, the event as a span, a pin on each step's last good day (done, next with a green ring, later, after), stages and practice-exam marks for exams, a dashed window for a fuzzy date, and weeks as dots for a goal with no date.
- **Under it:** the Next item, loud, then "N more steps" folded.
- **Where it opens from:**
  - a date in Look ahead
  - a goal in Goals
  - a trip or event block on the board
  - the date card's markers
  - the phone's This week rows
- **Adding a trip asks once:** "Anyone you want to see there?" Split names with `nameList`, and include a "No one" tile. Each name becomes a heads-up.
- **Adding a date** can say "Not sure yet":
  - this month or next month
  - a season: Spring is Mar to May, Summer Jun to Aug, Fall Sep to Nov, Winter Dec to Feb
  - a few months
- **Quick add** understands "move in spring", "trip to Denver Dec 3 to 6", and "text Aunt Lisa about LA". The last one lands on the trip as a heads-up.

**C. The list rides inside the block** (mock screen 6): in Today's band and the phone's Now card, a block whose to-do has a `list` shows it to tick off. A tick is its own undo (tap again), and "Done packing" gets the usual Undo toast. A packing list starts from the trip: clothes for N days, toiletries, meds, chargers, ID and wallet, and each kid's bag by name.

**D. On the board** (a later helper): big dates and goals show on the Month and Year cards. Spreads, goal plans and prep weeks preview as ghost blocks on the board before you keep them.

## Rules for every helper

- **Copy:**
  - No em dashes, en dashes or double hyphens.
  - No just, really, simply, actually, easily or please.
  - Write "to-do" with a hyphen.
  - Buttons are verbs; names are plain and on the nose.
  - Never invent numbers.
- **Look:**
  - Type sizes 12, 13, 14, 16, 19, 22, 26 and 30 only.
  - 4.5 to 1 contrast everywhere; 44 px targets.
  - Gold only for the one call to action on a surface; white fill means selected.
  - Calmer motion finishes moves at once.
- **Behavior:**
  - Every change goes through `commit` and gets the Undo toast.
  - Your own time stays yours: nothing lands in own time without asking.
  - Suggestions here are deterministic, made on the device. The only AI stays the existing opt-in breakdowns, so the privacy policy doesn't change.
- **Build:**
  - V11-only behavior goes behind FEEL.
  - Source stays in `board/src` and `variants/corners11`. Build with `node scripts/make-variants.mjs corners11-2`; never rebuild `v/corners11`.
  - Take the browser lock (`mkdir /private/tmp/claude-501/sr-browser.lock`, `rmdir` after) for any browser run.
  - Re-read before every edit; other helpers share app.js.
  - Don't commit or push.

## Acceptance

- **Bar exam:** a dated exam goal shows its stages across the months, practice exams, this week's share, and the Next session. Its date shows on Month and Year. A missed session moves and says so.
- **Trip with people:** adding the trip asks who to see. Each heads-up lands a month before with a suggested text. Today asks once when it's time. The road shows everything, packing rides inside the block, and the after steps follow.
- **Wedding:** RSVP, the outfit (8 weeks out, done 3 weeks before, with its why), and the gift, plus travel, stay and time off when away, each on its last good day.
- **Packing the night before:** the block shows its list to tick.
- **Fuzzy date** and **no date** work as in the mock.
- **Checked on boards that aren't Russell's:**
  - someone alone
  - a shift worker
  - a parent of five
  - a student with an exam
  - a caregiver

  Add the student and caregiver Dev scenarios if they're missing.
- **Tests:** `npm test` passes, with new model tests (the 400-day and random-edit checks still pass). The drag gate is GREEN with BOARD SIZE OK, and the contrast gate is GREEN.
