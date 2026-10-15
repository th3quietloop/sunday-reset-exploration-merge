# Right now: Today on the desk and the phone (V11 walk, Oct 14)

Walked on exactly what's live (commit aca8a91, /private/tmp/claude-501/v11-builds/walk-aca8a91), served on 4491, in headless Chrome on 9491, plus one pass in WebKit (Safari's engine), which drew the phone list the same as Chrome. Nothing in the repo was changed.

**Who, when, where**
- **Russell**, Tuesday Oct 13 at 7:40 am, getting Robin to daycare, phone in one hand. Walked on the sample family (Alex, Sam, Robin) as a new person who tapped Look around first, with the page's clock moved to each moment (time keeps running).
- **His older brother**, between classes (ADHD, bar exam in February). Walked as **Jordan**, a made-up board built through the app's own setup: lives alone, classes Monday to Thursday 9 to 3 (locked), up at 7, bed at 11:30, and a goal, Pass the bar exam, Feb 23, 2027, 2 h a weekday.
- Dev boards with `__reset.at`: Late shifts (Riley), Heavy week, Empty board, Long names, 30 overdue to-dos.
- Sizes: Mac 1440x900, iPad 1024x1366, iPhone 390x844, Duo folded 386x580, Duo tent 584x362 (Safari) and 678x466 (Home Screen), Duo open 951x669, iPhone on its side 844x390.
- Screenshots are in /private/tmp/claude-501/v11-builds/walk-shots/today-and-phone/ (file names under each section). Another walker's steps reached this browser between 22:56 and 22:58, so the two shots taken then (06, 07) were retaken.
- Nothing on tonight's fix list is repeated here.


## Start here: the phone's Today list, rebuilt for one thing at a time

Russell tried it on his iPhone: clunky, like an engineer made it, not ADHD friendly. He's right, and polish won't fix it. The list is a feed of everything the app knows, in the order the code builds it, and it never answers the one question a person opens it with: **what do I do now?**

### What Russell hit, and why
1. **"Keep this week on your phone" is unreadable.** V11's polish paints every phone card the dark surface (`.td-card`, variants/corners11/polish.css near line 67) while the note keeps its paper ink (#2A2118 and #4E3F2C, board/src/style.css), about 1.1 to 1. Only the gold Download shows. It's the only warning before Safari clears a board. Shots 33-iphone-next7-after-tap-name.png, 54-jordan-mon-1530-phone-end.png.
2. **A see-through toast sat at the top over the cards.** On the phone, a toast made while a sheet is open moves to the top of the screen (measured 12 px from the top, over the date and the first card), and toasts are the 92 percent glass with a blur, more see-through while they fade in and out. Shot 98-iphone-toast-with-sheet.png; on the folded Duo, 93-duo-folded-dinner-sheet.png.
3. **Sheets end above a fade that shows a stray icon from behind.** The phone's sheet stops short of the bottom edge and its foot fades out, so the list behind shows through: under "Clear Friday's dinner" sits the heart from Evening with Sam (shot 98), and on the folded Duo, Getting started's "Show me" (shot 93).

**Fix all three this week (S):** notes take light ink, or leave the dark surface; on the phone, toasts are solid, one at a time, always above the bottom bar (inside the sheet's foot while a sheet is open); sheets reach the bottom edge with a solid foot and the safe area under it, no fade. *Files:* variants/corners11/polish.css, variants/corners11/css/duo.css, board/src/style.css.

### Why it reads as engineered (counted on an iPhone, 390x844)
- **No next action.** At 4:20 pm Jordan's now card says "Open time, until 6 pm. Next: Dinner at 6 pm." with no button. The strongest things on his screen are eight dinner buttons (shot 96-jordan-phone-thu-1620-first-screen.png).
- **Everything at once, at one weight.** Jordan at 4:20 pm: 9 sections, 7 cards, 38 buttons (21 on the first screen), about 250 words, 2.6 screens tall, and his own day starts at 1023 px, below the first screen. Russell at 3:35 pm Friday: 47 buttons, 20 on the first screen. Every section is the same dark slab with the same corner and shadow, so nothing says "this one".
- **Questions stack.** Dinner (8 buttons), the bar check-in (4), and Getting started (3) sit between the person and their day.
- **The whole day, every time.** At 7:40 the list is 13 full-width blocks of the same size until bed.
- **Words that explain the system:** "The day below shows one of them; both are real.", "Dinner is at 6 pm." under "What's for dinner?", "Civil Procedure, for Pass the bar exam.", "Due Sep 3, 40 days ago".
- **Five kinds of button:** tiles, pills, bare grey words that are buttons ("Give it a time", "15 more minutes", "Remind me at 5", "Not tonight"), checkboxes whose whole label checks the to-do off, and gold, sometimes in the wrong place: tapping the shift you're in opens a planning sheet whose one gold button is "Unlock this Thursday" (94-late-phone-1620-bed-midnight.png).
- **Layers you can see through:** toasts, and the feet of sheets.

### What a strong product designer would do: one screen, one answer
**The job.** A two-second glance, often one-handed, often mid-task. Today answers three things: what I'm in, what's next and how soon, and the one thing to do now. Everything else is one tap away, in one place.

**Principles**
1. **One gold button: the next action.** Never two. When there's nothing to do (asleep, in a locked shift), there's no gold, and that is the answer. The ranking for the gold, first that applies wins:
   1. Start Sunday Reset, when it's due and you're in open time.
   2. Start your next thing, in open time (the next step of the most urgent to-do, or the next goal session pulled forward).
   3. Answer the question with the nearest deadline (dinner from 3 pm).
   4. On a to-do or a goal session: Start a 25 min focus in its first 10 minutes, Done after that. In your own block: Done, in its last 15 minutes.
2. **Time you can see.** Every "next" says how far away it is ("in 50 min"). Fifteen minutes before a locked block that leaves home, the card becomes "Leave for Drop off Robin in 10 min".
3. **The next three, not the whole day.** Earlier and the rest of today are one row each, opened on tap.
4. **One question at a time,** the one with a deadline first; the next takes the slot when it's answered, unseen until then.
5. **The week in one place.** To-dos, groceries, meals, goals, Getting started, and the app's own notes live behind one line, "This week", which opens the week's plan (it already holds meals, to-dos, and time for you).
6. **Solid and still.** Nothing see-through, toasts at the bottom, nothing jumps.
7. **A name and a time.** No sentence on this screen explains the app.

**The screen, top to bottom**

Jordan, Thursday 4:20 pm, open until dinner, an essay due today:
```
Thursday, Oct 15 · 4:20 pm                         Settings

NOW
Open until Dinner at 6                           1 h 40 min
(dashed bar, worn to now)
[ Start: Outline torts essay, 30 min ]              (gold)
Something else

Dinner at 6 isn't decided.                           Decide

NEXT
6 pm      Dinner
6:45 pm   Free evening
Rest of today: 1 more

This week: 1 to-do, bar exam 6 of 10 h                 Open

Add: Gym 6pm                                           Desk
```

Russell, Friday 3:35 pm, at work, dinner open:
```
Friday, Oct 16 · 3:35 pm                           Settings

NOW
Work                                        1 h 10 min left
(the bar, worn to now)
Then Pick up Robin at 4:45, in 1 h 10 min
Done early                                             More

Dinner at 6 isn't decided.               [ Decide ]  (gold)

NEXT
4:45 pm   Pick up Robin                              locked
6 pm      Dinner
6:45 pm   Evening with Sam
Rest of today: 2 more

This week: 5 to-dos, 7 groceries                       Open

Add: Gym 6pm                                           Desk
```

**What the Now card says, and its one button**

Each line: the moment, what the card says (big, then under it), and its gold button.
- **In your own block:** "Run, 20 min left" / "Then Drop off Robin at 8:30, in 50 min". Gold: none until its last 15 minutes, then Done.
- **A to-do or goal session, its first 10 minutes:** "Outline torts essay, 30 min" / "Then Dinner at 6". Gold: Start a 25 min focus.
- **A to-do or goal session, after that:** "Outline torts essay, 14 min left" / "Then Dinner at 6". Gold: Done.
- **In a locked block:** "Work, until 4:45" / "Then Pick up Robin, in 1 h 10 min". Gold: none.
- **15 minutes before a locked block that leaves home:** "Leave for Drop off Robin in 10 min" / "at 8:30". Gold: none.
- **Open time, something of yours fits:** "Open until Dinner at 6, 1 h 40 min". Gold: Start: Outline torts essay, 30 min.
- **Free time:** "Free evening, until 11" / "Nothing planned, on purpose." Gold: none.
- **Evening, the last 3 hours before bed:** "Evening with Sam, 1 h 30 min left" / "Tomorrow at 8:30: Drop off Robin". Gold: none (See tomorrow, quiet).
- **Asleep:** "Sleep, 7 h left" / "Up at 6:30. Drop off Robin at 8:30". Gold: none.
- **Sunday, reset due, in open time:** "Open until Dinner at 6". Gold: Start Sunday Reset, 19 min.

**Shown only on tap**
- The rest of today, and Earlier: one quiet row each.
- The seven days: tap the date for the week (seven rows, one line each), or swipe the list sideways.
- A block's other buttons (15 more minutes, Stop here, Didn't get to it, Focus): under More, except the one the moment needs (in the last five minutes, 15 more minutes shows on its own).
- Every question after the first.
- Dinner's five ways and the dishes: in the sheet behind Decide.
- To-dos, groceries, meals, goals, Getting started: the week's plan, behind "This week".
- Overlaps: a small "2 at 5:30" mark on the row; both blocks open from it.
- Keep your week: in Settings, Your data, with a dot on the Settings mark while the board is at risk; its sheet once a fortnight, never a card in the list.

**What leaves the list:** the gold SUNDAY RESET kicker (it opens Settings), the seven-day strip, the Getting started card, the Next 7 days, Groceries, Meals, and Goals cards, both notes, "Open the meal board" on the dinner card, and every explaining sentence.

**Numbers to hold it to.** First screen: one gold button, at most a dozen tappable things (17 to 21 today), under 80 words (about 150 today), the next three blocks always in view, nothing translucent. The whole list fits in about one screen before anything is opened.

**For ADHD in particular**
- **Starting:** Start places the thing from now (Undo in the toast) and turns the Now card's bar into its timer; Done becomes the gold button.
- **Time blindness:** a countdown on every next; "Leave in" takes over 15 minutes before a locked block that leaves home.
- **Overwhelm:** never a pile. Late to-dos are one line inside the week ("3 from earlier weeks"), never "40 days ago".
- **Decision fatigue:** the app picks the next thing from the plan the reset made; "Something else" offers the next, then "Keep it open". No count of skips.
- **Night:** after bedtime the list is the sleep card and tomorrow's first locked thing.
- **Done, quietly:** the block presses down with its sound and a toast "Done. Undo". No streaks, no tallies.

**Build order**
1. **This week (S):** Russell's three hits, above.
2. **Next (M):** the Now card's one gold button with the ranking, countdowns, Start and Something else; one question at a time; the This week line opening the week's plan, and the cards it replaces leave. *Files:* board/src/app.js (renderToday, nowStrip, todayFoot), board/src/model.js (picking your next thing from taskPlan, dueSoon, and goal sessions), variants/corners11/variant.js (openPlan from the phone), variants/corners11/polish.css, variants/corners11/css/duo.css.
3. **Then (S to M):** the next three with the reveal rows; the top line with the week behind the date and the sideways swipe; Settings with its dot.

Screens 8 to 18 below have the same findings one by one, for anyone fixing the list as it stands.


## The desk

### 1. Now: the band while you're in a block
**Screen**: Now (the first open on a weekday, or the Now tab). In a block, the last five minutes, Done early, and time back. Checked at Mac 1440x900, iPad 1024x1366, Duo open 951x669. Shots: 09-mac-tue-0740-open.png, 10-mac-tue-0756-last5.png, 12-mac-0756-hover-doneearly.png, 13-mac-0747-after-doneearly.png, 14-mac-0747-timeback.png, 20-mac-tue-1235-midday.png, 22-ipad-portrait-tue-0740.png, 86-jordan-mac-todo-1631.png.

**What they're thinking**
- Russell, 7:40: "Run, 20 min left. I got back ten minutes ago. Where's Done? The only button is 15 more minutes."
- Russell: "Next: Drop off Robin at 8:30 is the line I came for, and it's the smallest words in the band."
- Russell, 7:56, pointing at Done early: "End Run at 7:45, the last quarter hour? I ran until 7:56."
- Russell, after Done early: "You have 43 min back? Half an hour of that was open already."
- Jordan, 4:16, a minute into his essay: "If this takes ten minutes, there's no Done until 4:30."

**Improvements**
1. **Done from the first minute, ending now.** Show Done early (Done on a to-do) for the whole block, not only after its first 15 minutes. A tap ends the block at the next quarter hour from now (7:40 ends at 7:45), never at one behind now; in the last five minutes the button is Done and the block keeps its end. Toast: "Run ended at 7:45. Undo." *Why:* "I'm done now, not at 7:30, and I'm not waiting 15 minutes to say so." *Kind:* feature. *Size:* M. *Files:* board/src/model.js (previewEndEarly, endEarly), board/src/app.js (renderBand, doneEarly, the phone's now actions in renderToday).
2. **The locked thing ahead leads, with a countdown.** When the next block is locked (a drop off, a pick up, a meeting), the line under the bar reads "Drop off Robin in 50 min, at 8:30". In its last 15 minutes it moves up beside the block's name, in the gold the last five minutes already use: "Leave for Drop off Robin in 10 min". *Why:* "At 7:40 the run doesn't matter. Leaving on time does." *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (renderBand's `said` and `leftTxt`; nowStrip for the phone).
3. **"Back" counts only the time gained.** After Done early: "Run ended at 7:45. 15 min back, open until Drop off Robin at 8:30." in place of "You have 43 min back". *Why:* "Don't tell me I gained time I already had." *Kind:* copy. *Size:* S. *Files:* board/src/app.js (renderBand, the `back` name).
4. **Leave off what can't happen.** At 8:30 pm "15 more minutes" sits greyed out beside the buttons that work. Leave it off, as the phone already does, and put the reason in Done's hover line. *Why:* "A grey button is one more thing to read at night." *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderBand, the `more.ok` branch).
5. **A to-do wears its own mark.** A running to-do shows a check beside its name, so it reads as done already. Use the to-do's own mark, or the flag. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderBand icon, tdMark).

### 2. Now: open time and free time
**Screen**: Now when nothing is planned for this stretch. Checked at Mac 1440x900. Shots: 11-mac-tue-0805-open.png, 14-mac-0747-timeback.png, 63-jordan-mac-tue-1930-free.png, 64-jordan-mac-tue-1615-open.png, 70-late-mac-1400.png, 77-empty-mac-1000.png.

**What they're thinking**
- Russell, 8:05: "Fill it? Workout, Creative time, Call a loved one, 25 minutes before Robin and I are in the car."
- Russell, right after Done early on his run: "Workout? I ran."
- Jordan, 4:15 with 1 h 45 open: "Bar exam in 19 weeks, a torts essay due Thursday, and it suggests Creative time."
- Jordan: "Open, with an empty box beside it. Is that something I'm meant to tick?"
- Jordan, 7:30 pm in his free evening: "Nothing planned, on purpose. Good. So why is it still asking whether yesterday's study happened?"

**Improvements**
1. **Lead with your own next thing.** In open time of 15 minutes or more, the first chip is the next small piece you already own that fits: the next step without a time of the most urgent to-do ("Outline torts essay, 30 min, due Thursday"), or the next goal session pulled forward ("Contracts, 45 min, from Wednesday"). A tap starts it at the current quarter hour, toast with Undo. The library ideas follow it, two at most. *Why (Jordan):* "Tell me the one thing to do with this hour." *Kind:* feature. *Size:* M. *Files:* board/src/model.js (fillIdeas, or a sibling that reads taskPlan, dueSoon, and goal sessions), board/src/app.js (renderBand ideas, renderToday's now card).
2. **Ideas that fit the moment.** Leave out an idea of the kind you finished within the hour (no Workout after Run). Before a locked block that leaves home, offer no ideas, only the countdown from screen 1 ("Drop off Robin at 8:30. 25 min."). *Why (Russell):* "Those 25 minutes are shoes and a car seat." *Kind:* feature. *Size:* S. *Files:* board/src/model.js (fillIdeas), board/src/app.js (renderBand).
3. **Open's mark stops looking like a checkbox.** The empty square beside "Open" (on the desk and the phone) reads as a box to tick. Use the dashed outline the board draws for open time, or no mark. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderBand `icon('blank')`, nowStrip).
4. **Free time keeps questions away.** While you're in free time, the one question stays folded unless it's dinner within the hour; the goal check-in waits for the next morning. *Why (Jordan):* "Nothing planned, on purpose, then a question about studying." *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderMoment).

### 3. Now: the evening and asleep
**Screen**: Now after 8 pm, and asleep. Checked at Mac 1440x900 and iPhone 390x844. Shots: 03-mac-now-1051pm-newperson.png, 17-mac-thu-2030-evening.png, 18-mac-thu-2115-evening-crop.png, 19-mac-thu-2220-lastblock-crop.png, 68-late-mac-2100.png, 69-late-mac-0100.png, 94-late-phone-1620-bed-midnight.png.

**What they're thinking**
- Russell, 8:30 pm with Sam: "Done early, a grey 15 more minutes, See tomorrow, Tomorrow's dinner. Four buttons on the couch."
- Russell, 9:15 pm: "You kept 0.5 h yours today. Fine, but '30 min for yourself' is how I'd say it."
- Riley (late shifts), 9 pm, mid-shift until 11:30: "You kept 4 h yours today. Tomorrow at 3 pm: Work? My dinner after work is still open and it's offering tomorrow's."
- Riley, 1 am, winding down: "What kind of Tuesday? I'm going to bed."
- Riley on the phone: "My day ends 'Bed, midnight, up at midnight'. I get up at 10."

**Improvements**
1. **Evening and morning come from the person's day, not the clock.** Start the evening buttons and the "You kept" line in the last three hours before the day's bed, not at 8 pm and 9 pm; for Riley that's after work. Ask the kind of day from wake to four hours after wake, not from midnight to 11 am. Read wake and tonight's dinner from today's own plan. Root cause, found on the Late shifts board: for a day whose hours cross midnight, `day(today)` starts with last night's dinner tail (start 0, 15 min) and reports wake as 0, so `momentFor` checks that dinner (over at 12:15 am) and never asks about tonight's 11:30 pm one, on the desk or the phone; it asks the kind of day from midnight; and the phone's last row reads "Bed, up at midnight". *Why (Riley):* "My night starts at 11:30." *Kind:* feature and model fix. *Size:* M. *Files:* board/src/model.js (momentFor: the dinner that starts today, the day's own wake), board/src/app.js (eveningActs, keptLine, tomorrowLine, renderBand, renderToday's bed row).
2. **Two buttons at night, at most.** After the evening starts, the band offers Done for the night on the last block and See tomorrow; Tomorrow's dinner joins only when tonight's is decided and tomorrow's is open. Done early on time together leaves the evening. *Why (Russell):* "At night I want one glance, not a menu." *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderBand, eveningActs).
3. **The quiet word in minutes.** "You kept 30 min for yourself today." Minutes under an hour, and "for yourself" in place of "yours". *Kind:* copy. *Size:* S. *Files:* board/src/app.js (keptLine).

### 4. The one question on the desk
**Screen**: the strip under the band: the kind of day (weekday mornings), dinner (from 3 pm), the goal check-in (the morning after a session). Checked at Mac 1440x900, iPad 1024x1366, Duo open 951x669. Shots: 09-mac-tue-0740-open.png, 15-mac-fri-1535-dinnerq.png, 15b-mac-fri-1535-dinnerq-crop.png, 16-mac-fri-1535-pickdinner.png, 59-jordan-mac-tue-0810-checkin.png, 60-jordan-mac-tue-0810-goal-checkin.png, 61-jordan-mac-checkin-some.png, 22-ipad-portrait-tue-0740.png.

**What they're thinking**
- Russell: "What kind of Tuesday? Your usual. It was your usual yesterday and it'll be tomorrow."
- Russell, 3:35 pm Friday: "Remind me at 5. At 5 I'm in the car at Robin's pick up. And will it remind me if the tab's closed?"
- Russell: "Pick dinner opens a whole new screen to ask Cook or Order in. My phone asks that in one tap."
- Jordan, 8:10: "The bar question only showed up after I closed the kind-of-day one. Two questions before breakfast is over."

**Improvements**
1. **Answer dinner in the strip.** Replace "Pick dinner" with the five answers as chips in the strip (Cook, Order in, Eat out, Leftovers, Skip), the way the phone's card works. Cook still opens the dinner panel for the dish; the others answer in place: "Order in tonight. Undo." Removes a full-screen mat for a one-tap answer. *Why (Russell):* "Don't take me somewhere to answer one question." *Kind:* UI. *Size:* S to M. *Files:* board/src/app.js (renderMoment, the dinner branch; reuse the setter from renderToday's dinner card).
2. **Snoozes step around locked blocks, and say what they do.** If 5 pm lands inside a locked block, offer the first quarter hour after it: "Ask again at 5:15, after Pick up Robin". Say "Ask again" unless reminders are on: without the household server nothing pings, it only asks again in the app. *Why (Russell):* "Don't promise to remind me when I'm driving, or when the tab's closed." *Kind:* copy and feature. *Size:* S. *Files:* board/src/app.js (renderMoment `later`, renderToday's dinner card).
3. **Ask the kind of day less.** After three weekdays in a row answered Your usual (or put away with the x), stop asking on weekdays; ask on days that differ (a weekend, a day without work, the day after a trip). The x keeps "Don't ask today" and gains "Don't ask on weekdays". *Why (Russell):* "It's the same answer every day." *Kind:* feature. *Size:* S to M. *Files:* board/src/app.js (renderMoment, markSeen and the per-device moments key), board/src/model.js (momentFor).
4. **The goal check-in goes first, and earlier.** When a goal session ended yesterday, its check-in comes before the kind of day (it changes the plan; the kind of day rarely does). Better, ask at the session's end, in the band's ended state that steps already use ("Civil Procedure ended. Did it happen? Yes, Some of it, No"), and keep the morning question as the fallback. *Why (Jordan):* "Ask me when I stand up from the desk, not the next morning when I've forgotten." *Kind:* feature. *Size:* M. *Files:* board/src/app.js (renderMoment order, renderBand `ended`, goalAsk).

### 5. Now's corner: Add, To-dos, and the gold reset button
**Screen**: the bottom right corner in Now. Checked at Mac 1440x900, iPad 1024x1366, Duo open 951x669. Shots: 09-mac-tue-0740-open.png, 20-mac-tue-1235-midday.png, 21-mac-tue-1235-todos-open.png, 65-jordan-mac-add-open.png, 66-jordan-mac-add-typed.png.

**What they're thinking**
- Russell, 7:40: "Set up this week, 17 min, in gold, while I'm putting on Robin's shoes."
- Jordan: "To-dos laid every step out on a bench: twelve tiles in tiny type. I wanted the list."
- Jordan: "I typed Outline torts essay 45m. It went on my list with no date. I meant: now."

**Improvements**
1. **Gold only when there's room for it.** In Now on Monday and Tuesday, "Set up this week" is gold only when the open time you're in is at least its minutes, or after 7 pm; otherwise it's a quiet pill. Sunday stays as it is. *Why (Russell):* "Ask me for 17 minutes when I have 17 minutes." *Kind:* UI. *Size:* S. *Files:* variants/corners11/variant.js (chipState, the `rchip` rule in Now).
2. **Add can start it now.** When Add reads a name with a length and no day or time, and you're in open time, a second button sits beside Add to-do: "Start now, until 5 pm". It places the block from the current quarter hour; toast with Undo. *Why (Jordan):* "Most of what I type mid-day is something I'm about to do." *Kind:* feature. *Size:* S. *Files:* board/src/app.js (quickCommit and the desk's quick panel; todayFoot on the phone).
3. **To-dos from Now opens the list.** From Now, To-dos opens the To-dos panel at Due this week (rows you can check and time in place) instead of laying every piece on the bench, whose names print around 8 px at 1440x900; Lay out stays one tap away inside it. *Why (Jordan):* "Twelve tiny tiles is the opposite of one thing." *Kind:* UI. *Size:* S. *Files:* variants/corners11/variant.js (the To-dos pill in Now), board/src/app.js (openDueSoon).

### 6. The notepad, and Focus and the Pomodoro timer
**Screen**: the notepad on the desk in Now (tap it for Due soon); the menu under your name, On the desk: Focus on one thing, Pomodoro timer. Checked at Mac 1440x900 and Duo open 951x669. Shots: 03-mac-now-1051pm-newperson.png, 55-jordan-mac-mon-1530-now.png, 56-jordan-mac-menu.png, 57-jordan-mac-focus-room.png, 58-jordan-mac-pomodoro.png, 68-late-mac-2100.png, 78-late-mac-notepad-hover.png, 79-late-mac-notepad-tapped.png, 87-duo-open-jordan-1631.png.

**What they're thinking**
- Jordan: "Focus on one thing is exactly what I need. I tapped it and nothing happened."
- Jordan: "The Pomodoro wants four rounds of 25. My Civil Procedure block ends in an hour."
- Russell: "The notepad was on the desk last night. This morning it's gone."
- Jordan: "Nothing due in 3 weeks? My torts essay is due Thursday."

**Improvements**
1. **Focus from the band; drop the broken room from the menu.** "Focus on one thing" opens a room that has no styles in V11 (they live in board/src/merge.css, which scripts/make-variants.mjs swaps for V11's own CSS), so it sits under the 3D desk, unseen, and takes the keys. Remove it from the menu, and give the band (and the phone's now card) a Focus button on any block that isn't locked: it opens the Pomodoro sized to the block ("Civil Procedure until 4:30: two rounds of 25 and a 5 minute break") with the block's name on it. *Why (Jordan):* "From what I'm in to a timer, one tap." *Kind:* feature and bug. *Size:* M. *Files:* variants/corners11/variant.js (the menu, openTimer with a length and a name), board/src/app.js (renderBand, renderToday), board/src/focus.js.
2. **The notepad's hover note leaves with it.** After a tap lays out Due soon, the notepad steps off the desk but its note ("Next 7 days, 1 to-do, Tap to lay them out") stays floating where it was. Hide a hover note when its thing steps out. *Kind:* UI. *Size:* S. *Files:* board/src/app.js and board/src/scene.js (the pointer chip, stepProps).
3. **The notepad counts planned to-dos too.** With the essay due Thursday and already given a time, the page says "Nothing due in 3 weeks". Print it with its time ("Outline torts essay, Tue 4:15"), or say "Nothing left to plan". *Kind:* copy. *Size:* S. *Files:* board/src/app.js (notepadSpec, dueList).
4. **Keep the notepad in Now, or stop relying on it.** At 1440x900 it steps out at 7:40 am, 12:35 pm, 8:30 pm and 10:20 pm on the sample (the band and the question push the board down) while the plant and the mug stay. In Now, rank it ahead of the decorative things, or let To-dos in the corner carry the job and treat the notepad as a bonus. *Kind:* UI. *Size:* S. *Files:* board/src/scene.js (decideProps keep order).
5. **The timer doesn't push the day off the screen.** Opening the Pomodoro leans the camera to the clock and cuts the left side of the board (Sleep, Dinner). Lean less, or not at all, while a block is running. *Kind:* UI. *Size:* S. *Files:* variants/corners11/variant.js (openTimer zoomTo).

### 7. Between Now and the Planner
**Screen**: the tabs Now, Day, Week, Month, Year, List. Checked at Mac 1440x900. Shots: 09-mac-tue-0740-open.png, 67-jordan-mac-day-from-now.png.

**What they're thinking**
- Russell: "Now and Day show me the same day. What's the difference?"
- Jordan: "I pressed Day to check one thing and a note popped up about This week's plan, with a gold button."

**Improvements**
1. **Tabs say what they're for.** Titles on hover and long press: Now, "What you're in and what's next"; Day, "Change any day". The old Today and Planner buttons had these titles; the V11 tabs lost them. *Kind:* copy. *Size:* S. *Files:* variants/corners11/variant.js (the zoom tabs).
2. **Day on today keeps the moment.** In Day on today, the date card's line under the date says what you're in ("Work, 4 h 10 min left"), so leaving Now never hides the clock that matters. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderHud).
3. **Tips wait for a quiet moment.** "Your plan for the week is here" appeared the moment Day opened; show a tip only after the view has been still for a few seconds, never on the first switch from Now. *Kind:* UI. *Size:* S. *Files:* variants/corners11/variant.js (the plan tip).


## The phone, screen by screen (as it stands)

### 8. The phone list: its head and the week a tap apart
**Screen**: #todayview, the phone's home: SUNDAY RESET and the clock, the date, seven day buttons. Checked at iPhone 390x844, Duo folded 386x580, and in WebKit. Shots: 05-iphone-tue-0740-newperson-list.png, 23-iphone-tue-1235-list.png, 25-iphone-tue-1235-tomorrow.png, 47-duo-folded-0740-list.png, 82-webkit-iphone-0740-list.png.

**What they're thinking**
- Russell, one hand: "The days are at the top and my thumb's at the bottom. I want to flick to tomorrow."
- Russell: "SUNDAY RESET, in gold, at the top. Is that how I start it?" (It opens Settings.)
- Russell: "On tomorrow it says Wednesday, October 14. Say Tomorrow."

**Improvements**
1. **Swipe the list to change the day.** A sideways swipe on the list moves to the next or previous of the seven days; the buttons follow. The phone's desk bar already swipes its week this way; the list ignores swipes today. *Why (Russell):* "One thumb, no reaching." *Kind:* feature. *Size:* S. *Files:* board/src/app.js (renderToday, the same thresholds as renderPhoneBar).
2. **A Settings door that says Settings.** Replace the gold "SUNDAY RESET" kicker (it opens Settings) with a 44 px sliders button named Settings beside the clock, and let the date be the first line. It stops the reset's own name from opening Settings and gives back about 40 px on the folded Duo. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday `door`), variants/corners11/css/duo.css.
3. **Away from today, the title says how far.** "Tomorrow, Wednesday, October 14", "In 3 days, Friday". The desk's date card does this already. *Kind:* copy. *Size:* S. *Files:* board/src/app.js (renderToday title).
4. **Today's word fits its button.** "Today" runs edge to edge in its 44 px button. Widen the first button or set the word at 12 px. *Kind:* UI. *Size:* S. *Files:* variants/corners11/polish.css (.td-dayb).

### 9. The phone's now card
**Screen**: the dark card under the head on today. Checked at iPhone 390x844 and Duo folded 386x580. Shots: 05-iphone-tue-0740-newperson-list.png, 08-iphone-0740-nowcard-crop.png, 23-iphone-tue-1235-list.png, 53-jordan-mon-1530-phone.png, 73-heavy-phone-0740.png, 76-empty-phone-1000.png, 85-jordan-phone-todo-now.png, 96-jordan-phone-thu-1620-first-screen.png.

**What they're thinking**
- Russell, 7:40: "15 more minutes is the only button, floating under a gap, and it looks like plain text."
- Russell on the Heavy board, 7:40: "Open time until 7:45, big. Drop off Robin, Kai and Mila in five minutes, small."
- Jordan, 4:15, open until 6: "Open time. And? The desk gave me ideas. The phone gives me nothing."
- Jordan in a session: "Civil Procedure, 1 h left. Next: Civil Procedure at 4:30. So, more of the same?"
- On the Empty board: "Twelve open hours and nothing to start."

**Improvements**
1. **One next thing in open time.** The chip from screen 2: "Start: Outline torts essay, 30 min." One tap, toast with Undo. With nothing of yours waiting, one library idea. Today the phone shows no ideas at all in open time. *Why (Jordan):* "Hand me the next thing." *Kind:* feature. *Size:* M. *Files:* board/src/app.js (renderToday's now section, nowStrip).
2. **The locked block ahead takes the title.** Within 15 minutes of a locked block, the card reads "Drop off Robin, Kai and Mila in 5 min" with "7:45 am" on the right; what you're in moves to the line under. *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (nowStrip, renderToday).
3. **Tighter card, real buttons.** Put the buttons on the line under Next, right-aligned (removes the 40 px gap), and give 15 more minutes and Didn't get to it the small button's pill so they read as buttons. *Kind:* UI. *Size:* S. *Files:* variants/corners11/polish.css and css/duo.css (.td-now .td-acts).
4. **Same subject, one stretch.** When the next block is the same goal part straight after (3:30 to 4:30 and 4:30 to 5), say "Civil Procedure until 5, with a break at 4:30" and point Next at the first different thing. *Kind:* copy. *Size:* S. *Files:* board/src/app.js (nowStrip, renderBand: skip `info.next` with the same name and source).
5. **Done from the first minute, and Focus, here too** (screens 1 and 6). The phone has no menu, so the card is the only way to a timer. *Kind:* feature. *Size:* M (with screens 1 and 6).

### 10. The phone's question cards: dinner, the goal check-in, Getting started, overlaps
**Screen**: the cards between the now card and the day. Checked at iPhone 390x844 and Duo folded 386x580. Shots: 44-iphone-fri-1535-dinner.png, 53-jordan-mon-1530-phone.png, 62-jordan-phone-tue-0810-checkin.png, 73-heavy-phone-0740.png, 92-duo-folded-sun-1600-list.png, 96-jordan-phone-thu-1620-first-screen.png.

**What they're thinking**
- Jordan, 4:20: "Under my one open hour: dinner with eight buttons, did yesterday happen with four, Getting started with three. I haven't seen my day yet."
- Russell: "Remind me at 5, again in the middle of pick up."
- Russell on the Heavy board: "'The day below shows one of them; both are real.' Fine. So who's picking up Mila?"

**Improvements**
1. **One question at a time here too.** Show the question with the nearest deadline (dinner from 3 pm, otherwise the goal check-in); the next takes its place when it's answered. Getting started leaves the list (the week's plan or Help). *Why (Jordan):* "Three cards of questions is how I end up closing the app." *Kind:* UI. *Size:* M. *Files:* board/src/app.js (renderToday order, goalAskCard).
2. **The dinner card is one question with one way out.** Keep the five tiles; use the snooze rule from screen 4 ("Ask again at 5:15, after Pick up Robin"); move "Open the meal board" off this card. *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (renderToday dinner card).
3. **The overlap card says what to do.** "Pick up Mila and Soccer practice, both at 5:30." with two buttons, "Open Pick up Mila" and "Open Soccer practice", in place of "The day below shows one of them; both are real." *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (renderToday clash card).

### 11. The phone's day list and the Earlier fold
**Screen**: the day as a column of blocks, with what's over folded into "Earlier". Checked at iPhone 390x844. Shots: 23-iphone-tue-1235-list.png, 24-iphone-tue-1235-earlier-open.png, 45-iphone-thu-2030-evening.png, 46-iphone-thu-2330-asleep.png, 76-empty-phone-1000.png.

**What they're thinking**
- Russell: "Earlier: Up with Robin, Run, Drop off Robin, and 2 more. Good, it opens where I am."
- On the Empty board at 10 am: "16 h open, starting 6:30 am. It's 10."
- Russell, opening Earlier: "The 9 to 9:30 Work has the red now line on it, like it's happening."
- Russell at 11:30 pm in bed: "Six to-dos and one 'Time passed' under my sleep card. Not now."

**Improvements**
1. **Open time counts from now.** Today's open row that began before now reads from now: "12.5 h open, until 10:30 pm", with "Now" in its time column. *Kind:* copy. *Size:* S. *Files:* board/src/app.js (renderToday gaps: clip the start to nowMin).
2. **Only the piece you're in is current.** A block cut in two (Work 9 to 9:30, then 9:45 to 4:45) marks only the piece you're in; the earlier piece draws as past instead of carrying a now line at its right edge. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday `cur`: start <= now < end).
3. **After bed, the list goes quiet.** From the day's bed to wake: the sleep card, tomorrow's first locked thing, and one line, "6 to-dos this week", that opens them. No "Time passed" at 11:30 pm. *Why (Jordan):* "At night a list is a reason not to sleep." *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday).

### 12. The phone's Next 7 days card (to-dos due)
**Screen**: the to-do card after the day. Checked at iPhone 390x844. Shots: 07-iphone-tue-0740-list-scroll2.png, 32-iphone-next7-card.png, 33-iphone-next7-after-tap-name.png, 72-overdue-phone-1030-todos.png.

**What they're thinking**
- Russell: "I tapped Book a cleaning for Robin to look at it. It checked it off and it vanished."
- On the 30 overdue board: "Six rows, each 30-something days ago, oldest first. That's a wall."
- "Are there more? It doesn't say." (There are 24 more.)
- "Give it a time is grey words. Is that a button?"

**Improvements**
1. **The name opens, the box checks.** Today the whole name is the checkbox's label, so a tap on the words marks it done. Make only the box (with a 44 px hit area) mark done, and the name open the to-do. A checked row stays in place, struck through with "Done", for four seconds before it folds; the toast with Undo stays. *Why (Russell):* "I was looking, not finishing." *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday td-task: the label becomes a button), variants/corners11/polish.css.
2. **Say how many, lead with what's next.** Up to five rows ordered from today forward, then one line for the rest: "24 more from earlier weeks", which opens To-dos. Drop "40 days ago"; "From Sep 3" is enough. Title the card "To-dos" when it holds late ones; "Next 7 days" only when every row is in them. *Why (Jordan):* "Show me one I can do, not a pile I didn't." *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (renderToday `soon`, the `.slice(0, 6)`), board/src/model.js (dueSoon order).
3. **Give it a time looks like a button.** The small button's pill instead of bare grey words. *Kind:* UI. *Size:* S. *Files:* variants/corners11/polish.css.

### 13. The phone's Groceries card
**Screen**: "Groceries, 7 things to get this week" with Open the meal board. Checked at iPhone 390x844. Shots: 07-iphone-tue-0740-list-scroll2.png, 35-iphone-groceries-mealboard.png.

**What they're thinking**
- Russell in the store: "I want the list. 'Open the meal board' sounds like planning."
- Russell on Tuesday: "Ground beef, onion, peppers, tortillas, for Monday's tacos. Monday's over."

**Improvements**
1. **Name the button for what it opens, and show a few.** "See the list" (it does land on the list, scrolled to it), and the card names the first three: "Chicken, broccoli, sweet potato, and 4 more". *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (renderToday groceries card).
2. **After the week starts, count what's ahead.** "4 things for the rest of the week"; the past days' things fold on the list under "Earlier this week" (kept, in case they weren't bought). *Kind:* feature, meals area. *Size:* S to M. *Files:* board/src/model.js (groceryProgress over dates from today), variants/corners11/variant.js (the meal board's list).
3. **Check things off on the card.** Up to five rows with checks right on the card (the same checks as the list), so an aisle needs no second screen. *Kind:* feature. *Size:* M. *Files:* board/src/app.js (renderToday), board/src/model.js (shopping).

### 14. The phone's Add line
**Screen**: "Add: Gym 6pm" at the foot, with its preview. Checked at iPhone 390x844. Shots: 26-iphone-add-dentist-preview.png, 27-iphone-add-dentist-added.png, 28-iphone-add-todo-preview.png, 29-iphone-add-todo-preview-clear.png, 30-iphone-add-cleanroom-toast.png.

**What they're thinking**
- Russell: "Call the dentist 2pm: Tue Oct 13, 2 to 2:30, takes 30 min from Work. Clear."
- Russell, typing the next one: "The toast from the first is sitting on the Add to-do button."
- Jordan: "Clean my room by Saturday. The toast says Break it down. Where's Undo?"
- Jordan, after one add: "Two toasts: my to-do, and 'Add a to-do: done. 3 things left in Getting started.'"

**Improvements**
1. **Toasts never cover the preview.** While the Add line has focus or its preview shows, toasts sit above the preview, or wait. Today the last toast covers "A to-do in Inbox, due Friday" and its Add to-do button until it fades. *Kind:* bug. *Size:* S. *Files:* variants/corners11/css (the phone's #toasts offset), board/src/app.js (layoutInsets).
2. **Undo on every add, one toast per add.** When the library knows the task, the toast offers Break it down in place of Undo, so that add has no Undo. Put Undo back in the toast and put "Add and break it down" in the preview as a second button. Show the Getting started tick on its card, not as a second toast. *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (quickCommit, noteMove).
3. **Plain words in the preview.** "Today, 2 to 2:30 pm" in place of "Tue Oct 13"; "A to-do, due Friday" in place of "A to-do in Inbox, due Friday" (name a group only when it isn't the Inbox). *Kind:* copy. *Size:* S. *Files:* board/src/app.js (todayFoot).
4. **Start now** (screen 5) here too. *Kind:* feature. *Size:* S.

### 15. The phone's notes at the end: Keep this week on your phone, Put it on your Home Screen
**Screen**: the note cards at the end of the list, after the first change is saved. Checked at iPhone 390x844. Shots: 33-iphone-next7-after-tap-name.png, 54-jordan-mon-1530-phone-end.png.

**What they're thinking**
- Russell: "There's a card at the bottom with a Download button and words I can't read."

**Improvements**
1. **Fix the notes' ink** (one of Russell's three hits, above): leave `.td-note` out of the dark surface rule, or give it the light inks (#FFFFFF, #CDCDCD). *Kind:* bug. *Size:* S. *Files:* variants/corners11/polish.css (the `.td-card` surface rule near line 67), board/src/style.css (.td-note).
2. **One note, not two.** "Keep this week on your phone" and "Put it on your Home Screen" say the same thing; keep the first, with Add to Home Screen as its step. (In iPhone Safari the second never shows; elsewhere both stack.) *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday).
3. **Out of the list.** Move the note into Settings, Your data, with a dot on the Settings mark while the board is at risk, and its sheet once a fortnight when there's no recent backup. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday, keepSeen).

### 16. Sunday on the phone
**Screen**: the list, Settings, and the phone's desk on a Sunday afternoon. Checked at iPhone 390x844 and Duo folded 386x580. Shots: 88-jordan-phone-sun-1600.png, 89-phone-settings-sunday.png, 90-phone-desk-sunday.png, 91-phone-settings-resetpage.png, 92-duo-folded-sun-1600-list.png, 95-phone-gettingstarted-reset-showme.png.

**What they're thinking**
- Russell, Sunday 4 pm, phone: "'It's Sunday. Ready for your reset?' Yes. How?"
- Russell: "SUNDAY RESET at the top opens Settings. Settings' Sunday Reset page picks steps, but has no Start."
- Jordan: "Getting started says Do your first Sunday Reset, Show me. It opened the desk and showed me nothing."

**Improvements**
1. **A reset card on the phone.** From Saturday 5 pm through Sunday (and Monday and Tuesday while the week isn't set up), the Now card's gold button in open time is "Start Sunday Reset, 19 min" (or a card of its own right under Now): "Finish your reset, 3 of 6" when one was put away. It reads the same chipState the desk corner uses; that chip exists on the phone today but sits in a corner the phone hides, and Getting started's "Show me" opens the phone's desk, where the button is hidden too, so it lands on nothing. The reset already runs on a phone once started. *Why (Russell):* "Sunday is the point of the app, and my phone is where I am on Sunday." *Kind:* feature. *Size:* S to M. *Files:* board/src/app.js (renderToday, showMove), variants/corners11/variant.js (chipState, exposed to the list).
2. **The Sunday toast gets its button.** "It's Sunday. Ready for your reset?" is made with no action; give it Start, or leave it out where the card shows. On the folded Duo it also covers the dinner card's second row. *Kind:* copy. *Size:* S. *Files:* board/src/app.js (the boot toast near the end of boot).
3. **The Settings door doesn't wear the reset's name** (screen 8, improvement 2). *Size:* S.

### 17. Open the desk on a phone
**Screen**: the phone's one day: the tall board, its bar (List, the month, the week), pinch, double tap, swipes, a picked block's tools. Checked at iPhone 390x844. Shots: 37-iphone-open-desk.png, 38-iphone-desk-tap-phoneblock.png, 41-iphone-desk-pinch-board.png, 42-iphone-desk-doubletap-fit.png, 43-iphone-desk-week-swipe.png, 90-phone-desk-sunday.png.

**What they're thinking**
- Russell: "A car, a phone, a pot, a bed. I have to tap them to know what they are."
- Russell: "Where's now? The list told me what I'm in; here there's only the pin."
- Russell: "Pinch zoomed it nicely and the names came back. Double tap fit it again. Swiping the week works."
- Russell: "'Open' beside the pot on next Tuesday. Open what?"

**Improvements**
1. **Open on now.** On today, open zoomed to the lane you're in and the next (names and times readable), with double tap to fit the day. Fitting all five lanes turns every 30 minute block into a mark. *Kind:* UI. *Size:* S to M. *Files:* board/src/scene.js (setPhoneDay, focusOn), board/src/app.js (openPhoneDesk).
2. **A now line in the bar.** On today, one line under the month: "Work, 1 h 25 left. Next: Call the dentist 2 pm". The bar had a kicker for this before V11 took it out. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderPhoneBar, the FEEL branch).
3. **Use the bare wood.** About 80 px of empty desk sits between the bar and the board; start the board under the bar, or make it taller. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (layoutInsets for the phone's day), board/src/scene.js.
4. **"Dinner open" in the header, not "Open".** The short word reads like a shop sign. *Kind:* copy. *Size:* S. *Files:* board/src/scene.js (dayHeaderTexture `bits[].short`).
5. **A pinch that lands on a sheet** (a picked block's panel) zooms the whole app, blurry, until you pinch back; the board and the bar already stop the page's own pinch. Decide whether sheets should too (see the end). *Size:* S. *Files:* variants/corners11/css/touch.css.

### 18. Sheets on the phone
**Screen**: a block's panel, Give it a time, the dinner panel, a to-do's panel, as bottom sheets. Checked at iPhone 390x844 and Duo folded 386x580. Shots: 31-iphone-breakdown-sheet.png, 34-iphone-giveittime.png, 36-iphone-tap-current-block.png, 84-jordan-phone-giveittime-1615.png, 93-duo-folded-dinner-sheet.png, 94-late-phone-1620-bed-midnight.png, 98-iphone-toast-with-sheet.png.

**What they're thinking**
- Russell: "The bottom of the sheet fades into the list. There's a heart from Evening with Sam under Clear Friday's dinner."
- Riley, glancing at the shift in progress: "I tapped Work to see it, and the gold button says Unlock this Thursday."
- Russell: "The Work sheet says 30 min at the top and 8 h under Length."
- Jordan, 4:15: "Give it a time picked 4:30. I'm free now."

**Improvements**
1. **Sheets reach the edge, solid** (one of Russell's three hits, above): the sheet runs to the bottom of the screen with a solid foot and the safe area under it, and its content uses the sheet's full width (today it keeps the desk panel's width, leaving an empty strip on the right). *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css and polish.css (#side on the phone).
2. **Tapping the block you're in opens what you'd do now.** On today, the sheet for the block you're in leads with Done, 15 more minutes, and Focus; the planning parts (Starts, Length, Unlock, Name on this day, Take it off) fold under "Change this block". No gold on Unlock: on a locked block, the panel has no gold at all. *Why (Riley):* "I wanted to see my shift, not unlock it." *Kind:* UI. *Size:* S to M. *Files:* board/src/app.js (the block panel).
3. **Now first.** On today, when the current quarter hour is open, Give it a time starts there ("Add now, 4:15 to 4:45") and offers the next free slot as the second choice; past days in its row are disabled. *Why (Jordan):* "If I'm opening this at 4:15 with nothing on, I mean now." *Kind:* UI. *Size:* S. *Files:* board/src/app.js (placePanel defaults).
4. **One length.** On a block cut in two, the hero and Length disagree (30 min above, 8 h below). Show the whole block in the hero ("Work, 9 am to 5 pm, 8 h") or let Length edit the piece shown. *Kind:* copy and UI. *Size:* S. *Files:* board/src/app.js (the block panel's preview and Length).
5. **Cook opens at the dish.** Tapping Cook on the dinner card opens the sheet asking "How's dinner happening?" again with Cook picked; open it at "What's for dinner?" with the recipes in view. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (openSel dinner).


## The Duo and the other phone shapes

### 19. Duo folded (386x580)
**Screen**: the list on the outer screen. Shots: 47-duo-folded-0740-list.png, 48-duo-folded-0740-list-scroll.png, 92-duo-folded-sun-1600-list.png, 93-duo-folded-dinner-sheet.png.

**What they're thinking**
- Russell, one hand: "The head and the now card fill about 60 percent of the screen. I see two blocks of my day."
- Russell, scrolling: "Now the now card's gone."
- Russell: "A toast landed on the date at the top, and another on the dinner card."

**Improvements**
1. **A slim now line pins to the top** once the now card scrolls away: "Run, 20 min left. Drop off Robin 8:30." *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday), variants/corners11/css/duo.css (sticky).
2. **A compact head under 600 tall.** Date, clock, and Settings on one line, the seven days behind the date (screen 8). *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css.
3. **Toasts in one place,** solid, above the Add bar, never over a card's buttons, and inside a sheet's foot while a sheet is open (Russell's hit, above). *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css (#toasts).

### 20. Duo stood as a tent (584x362 in Safari, 678x466 from the Home Screen)
**Screen**: the list on the outer screen, stood on its edge. Shots: 49-duo-tent-safari-584x362.png, 50-duo-tent-home-678x466.png.

**What they're thinking**
- Russell, on the counter: "In Safari it shows the head and half the now card. Its buttons are under the Add bar."
- "From the Home Screen it's two columns. That's the one."

**Improvements**
1. **Two columns from 560 wide when under 400 tall,** like 678x466: now on the left, the day on the right. *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css.
2. **The now card first in a tent.** Fold the head to one line and let the now card take the left column, the time left at 30 px, readable from across a counter. *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css.
3. **A round Add in the tent,** like the phone's desk, so the Add bar stops covering the now card. *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css.

### 21. An iPhone on its side (844x390)
**Screen**: the list in two columns. Shot: 51-iphone-sideways-844x390.png.

**What they're thinking**
- Russell, phone in the car mount before leaving: "Two columns is right. The now card's buttons are half under the Add bar, and the day starts with Up with Robin, which is over."

**Improvements**
1. **The Add bar spans the right column only,** so the now card ends above it. *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css.
2. **The day column opens at the block you're in,** not at the first block of the day (the Earlier fold needs two past blocks before it folds). *Kind:* UI. *Size:* S. *Files:* board/src/app.js (renderToday: scroll `.cur` into view in two columns).
3. **Head on one line on its side** (date, clock, Settings), days behind the date. *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css.

### 22. Duo open as a book (951x669)
**Screen**: Now with the band and question on the left page and the day stacked on the right. Shots: 52-duo-open-951x669-now.png, 87-duo-open-jordan-1631.png.

**What they're thinking**
- Russell, open: "The left page has the band and the question, then empty space. The right page's day is a stroller, a car, a heart."
- "The corner is a plus and a flag with no words."

**Improvements**
1. **The left page says what's next.** Under the question, the next three blocks with names and times ("8:30 Drop off Robin, 9:00 Work, 9:30 Standup"), since the right page draws most of them as marks. *Kind:* UI. *Size:* S to M. *Files:* board/src/app.js (renderBand in the book layout), variants/corners11/css/duo.css.
2. **Words in the corner at this width.** "Add" and "To-dos" fit; icon-only buttons hide what they do. *Kind:* UI. *Size:* S. *Files:* variants/corners11/css/duo.css (.c-br).
3. **The Pick dinner tag clears the labels.** It sits over the night lane's label; place it beside the Dinner block when below would cover print. *Kind:* UI. *Size:* S. *Files:* board/src/app.js (placeTag).


## The five changes that would matter most

1. **Rebuild the phone's Today around one gold next action** (the section at the top): what you're in, what's next and how soon, one button, one question at a time, the next three blocks, and the week behind one line. In open time the button is your own next thing, "Start: Outline torts essay, 30 min"; today the phone offers nothing there, and the desk offers Workout and Creative time to someone with a bar exam and an essay due.
2. **Russell's three hits, this week:** the unreadable "Keep this week on your phone" note (dark ink on the dark surface, about 1.1 to 1, the only warning before Safari clears a board), toasts that jump to the top and show the page through them, and sheets whose fading foot shows the list behind.
3. **A door to the Sunday Reset on the phone.** On Sunday the phone says "It's Sunday. Ready for your reset?" with no button; the gold SUNDAY RESET at the top opens Settings; Getting started's Show me opens a desk with the button hidden. Start belongs in the Now card on Sunday afternoon.
4. **Done when you're done, and only when you mean it.** Done from the first minute of a block, ending now rounded up, never back to before now; on the phone a to-do's name opens it instead of checking it off.
5. **Time from the person's day, not the clock.** Evening, morning, and dinner from wake, bed, and today's own dinner: on Late shifts the band wraps up mid-shift at 9 pm, never asks about the 11:30 pm dinner, asks the kind of day at 1 am, and the phone ends the day "Bed, up at midnight" (root cause in `momentFor` reading last night's carry-in). With it, snoozes that step around locked blocks ("Ask again at 5:15, after Pick up Robin").

Next after these: Focus from the band (and the broken "Focus on one thing" out of the menu).

## For Russell to decide

- **How far to take the phone's Today.** The rebuild at the top removes the seven-day strip, the to-do, groceries, meals, goals, and Getting started cards from the list and puts them behind "This week". Recommended: yes, all of it; the list keeps Now, one question, the next three, and that one line.
- **The ranking for the one gold button** (Sunday Reset, your next thing, the question with a deadline, Done). Recommended as written.
- **The kind-of-day question on the phone.** The phone never asks it; the desk asks every weekday morning. Recommended: leave it off the phone, and have the desk stop asking on weekdays after three Your usual answers.
- **Focus on one thing.** Port its styles into V11, or remove it and put Focus (the Pomodoro, sized to the block) on the band and the phone's Now card. Recommended: remove, and add Focus.
- **"Open" for an undecided dinner.** On the phone, "Dinner, 6 to 6:45 pm, Open" sits two rows from "1 h open", and the phone's desk header says only "Open". Keep the word with "Dinner" in front of it, or go back to "not picked".
- **The phone after bedtime.** Fold everything but the sleep card and tomorrow's first locked thing (recommended), or keep the whole list.
- **Groceries once the week has started.** Count only what's still ahead, and fold the past days' things (this crosses into the meals walk).
- **Gold "Set up this week" in Now on Monday and Tuesday mornings.** Only when there's open time for it (recommended), or always, as now.
- **A pinch on a sheet.** Let it zoom the page (people who need zoom keep it), or stop it as the board and bar do (Larger text then covers reading).
- **"Didn't get to it" at a session's start.** Offer it from minute one (as now, no guilt), or lead with Start a 25 min focus and show it after ten minutes or at the end.
