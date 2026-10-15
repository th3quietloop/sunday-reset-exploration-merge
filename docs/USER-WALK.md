# The screen walk (Oct 14 to 15, 2026)

Russell asked: "What are three things we can do to improve each screen before we continue? Imagine that you are the user who is using this experience. What are they thinking? Put yourself in their shoes and make a list of all the changes that we can make to improve this, and then let's implement all."

Five walkers went through every screen of V11 as it was live (commit aca8a91), each as real people, at five sizes: iPhone 390x844, the iPhone Duo folded (386x580 in Safari) and open (951x669), iPad 1024x1366, and Mac 1440x900. For every screen they wrote what the person is thinking, in the first person, and three or more improvements ranked by how much they'd help, each with its size and the files it touches. The full walks are in [docs/walk](walk/): 110 screens and about 430 improvements.

| Walk | Who | Screens | File |
|---|---|---|---|
| The first visit | someone in the Apple Store with the iPhone Duo and a link from a friend; Russell's brother (ADHD, the bar exam in February) | 25 | [first-visit.md](walk/first-visit.md) |
| Right now: Today and the phone | Russell at 7:40 am on a Tuesday, one hand on the phone; his brother between classes | 22 | [today-and-phone.md](walk/today-and-phone.md) |
| Shaping the week: the Planner | Russell and Kim on Sunday afternoon; a new person's first Planner | 20 | [planner.md](walk/planner.md) |
| Big things: to-dos and goals | his brother; an analyst with the CFA exam in 10 weeks and a full-time job | 25 | [big-things.md](walk/big-things.md) |
| The rituals: the Sunday Reset, meals, Settings | Russell and Kim at 7 pm on Sunday, tired; a parent who batch cooks | 18 | [reset-meals-settings.md](walk/reset-meals-settings.md) |

Russell tested the phone the same night and wrote: "this looks so clunky and it needs to deliver a better ux and a better organized ui, looks like an engineer made it, it is not adhd friendly at all." Two of the walks open with a section answering that directly: the to-do sheet and goal screens (big-things.md) and the phone's Today list (today-and-phone.md).

## What every walk found

1. **No single next action.** Screens show what the app knows, in the order the code builds it, at one weight. The to-do sheet is three phone screens and 62 things to tap before the first step; the phone's Today list has 38 buttons and no button for "what do I do now".
2. **Everything at once.** Choices are laid out before they're needed (Spread it out's whole form, a goal's five plan buttons, four kinds of button on one card). For someone with ADHD this is the wall they close the app on.
3. **The phone can't do the main jobs.** On a phone you can't start the Sunday Reset (the gold "SUNDAY RESET" opens Settings), a to-do's name checks it off instead of opening it, and Undo lives only in toasts.
4. **Big things aren't connected.** The setup hears "bar exam, Feb 23" and makes a date marker; the goal flow that would plan it is never offered there. Spread it out dead ends and offers to move an exam.
5. **Small print and failing contrast.** The cards at the bottom of the phone's Today are dark ink on a dark card (about 1.2 to 1); the week and Block library print names at 5 to 8 px on a Mac; toasts and sheet feet are see-through.
6. **The clock, not the person's day.** Evening starts at 8 pm and the morning question at midnight, so a late shift gets wrapped up mid-shift and asked about its day at 1 am.

## The changes that matter most, by walk

**First visit**
1. The bar exam gets a plan inside the setup: Make it a goal at See further ahead, at the to-do step, and on the plan, with "Big things are hard to start" and "A goal with a date" as answers.
2. One front door that says what this is (the week picture, "Your week, in blocks.", who shared it, the lock line), with readable buttons.
3. The sample says it's a sample, and Set up my week is one tap away on every device; no warning about losing a board before there is one.
4. The first landing: one message, Getting started counts what the setup did, the tour points at V11's own controls.
5. Their week builds on the desk, where they can see it.

**Right now: Today and the phone**
1. The phone's Today rebuilt around one gold next action: what you're in, what's next and how soon, one question at a time, the next three blocks, and the week behind one line.
2. The unreadable notes, see-through toasts, and fading sheet feet, fixed.
3. A door to the Sunday Reset on the phone.
4. Done from the first minute of a block; a to-do's name opens it.
5. Evening, morning, and dinner from the person's own day (a model fix for days that cross midnight).

**Shaping the week: the Planner**
1. Undo you can reach after the toast, and Undo in every change's toast.
2. The week and Block library print at 12 px or more.
3. Date card arrows that stay put.
4. The Duo fits: quick add's buttons, the kinds list, 44 px targets on touch.
5. A hand-off ("Sam has it") stays visible on the board.

**Big things: to-dos and goals**
1. The to-do sheet rebuilt around one next thing: a card with one sentence and one gold button, steps as one-line rows, everything else on tap.
2. To-dos on the phone that work: the name opens, the check marks done.
3. Spread it out leads with its answer and never dead ends.
4. Short is not behind: a goal says how much the days hold; "Behind" only for time that went by.
5. A calm way through a pile of late to-dos.

**The rituals: reset, meals, Settings**
1. A way into the Sunday Reset on the phone and the folded Duo.
2. Look back looks back.
3. The reset's day and time on the board, with a reminder that rings.
4. Who's cooking gets settled before the week counts as set.
5. A prep week a batch cook would follow, behind one button.

## Decisions for Russell

The walks' recommendations are taken as the defaults while building; any of these can be reversed.

- **The phone's first view:** remember list or desk per device, and land on the desk the first time (built as a proposal).
- **How far to take the phone's Today:** rebuild it around one next action and put to-dos, groceries, meals, goals, and Getting started behind "This week" (recommended: all of it).
- **Start:** a step's or a session's gold button starts a short timer on its block (recommended: yes).
- **Soft time with a yes:** Spread it out and goals may offer an hour of a soft block like Evening with Sam, each time with a yes and Undo.
- **New goal in three pages,** with parts edited after the plan.
- **The front door:** one page that combines the picture welcome's words with V11's time and parts line (recommended).
- **The setup's length:** ask about dinner only when it's a pain, skip the calendar step on phones.
- **Goals in the setup:** offer them at See further ahead, the to-do step, and the plan.
- **"Your plan" and "This week's plan":** one of them gets a new name.
- **An Undo button in the bottom bar.**
- **Block library putting itself away** after a minute idle (recommended: stay out while on the day).
- **Is a dinner decided by Cook alone, and is "Anyone" a cook?**
- **Where the reset's day and time live** (on the board, so they travel with a backup and a household).
- **Reminders without the server:** a calendar event, or an in-page nudge that says it needs the page open.

Each walk ends with its own full list of decisions.
