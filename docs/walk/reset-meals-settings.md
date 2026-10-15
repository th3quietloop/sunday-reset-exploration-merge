# The rituals and the room around them: a walk as the people who use them (V11, aca8a91, Oct 14)

Area: the Sunday Reset from its way in to Finish, Catch up this week, Finish later; Meals (the reset's Meals step, the meal board, a day's card and Cook extra, Plan a prep week, Suggest meals, the dinner panel, the grocery list); Settings (overview, every page that shows, Find a setting, Your data and Start over, Help, Dev).

How it was walked. The live build (aca8a91) on its own server (localhost:4494) and its own headless Chrome (9494), on a fresh origin. The setup was run as Russell (partner Kim, son Elijah; pains: dinner, time together, the week runs me; leans: Meals, Time with Kim, Something of yours; reset Sundays at 7 pm), then the page's clock was held at: Sunday Oct 18, 7 pm (the first reset); Sunday Oct 25, 7 pm on an iPhone (the second reset, with Look back); Wednesday Nov 4, 8 pm (the catch up); Thursday Nov 5, 3:30 pm (the dinner question); Sunday Nov 8, 7 pm (meals on both Duo sizes); Sunday Nov 15, 7 pm (Look back on the Mac). The sample family (Dev, a preview) was opened at Sunday 9 am on an iPad for the batch cook parent. Sizes: Mac 1440x900; iPad 1024x1366 (touch, 2x); Duo open 951x669 (touch, 3x); iPhone 390x844 (touch, 3x); Duo folded 386x580 (touch, 3x). One interruption: another walker's driver reached this Chrome at 22:56; the origin was cleared and everything from shot 14 on was taken on a clean board (shots 00 to 13 are the first pass through the setup, before that, at the Mac's size).

Personas. (1) Russell and Kim, Sunday 7 pm, the reset together, tired, wanting it done in 15 minutes. (2) Alex, the sample family's parent, who batch cooks on Sunday and wants the week's meals decided once.

Not listed again (already being fixed tonight): drag feel, the goals and to-dos list, and the polish list. Where a finding here touches one of those, it's in "Notes for fixes in flight" at the end.

Screenshots: /private/tmp/claude-501/v11-builds/walk-shots/reset-meals-settings/ (file names below are in that folder).

---

## 1. The way into the Sunday Reset: the chip, the intro, and the phone that has neither

**Screen.** The gold "Start Sunday Reset 17 min" chip at the bottom right of the Planner on Sunday, and the intro sheet it opens ("Plan your week.", Start the reset, Remind me at 8 pm, the steps with minutes). Reached on the real board at Sunday Oct 18, Oct 25, and Nov 15, 7 pm, and on the sample family at Sunday 9 am. Checked at 1440x900, 1024x1366, 390x844, 386x580. On the iPhone and the folded Duo there is no chip and no card on Sunday evening: the only "Sunday Reset" on screen is the gold kicker at the top of the list, and it opens Settings. Open the desk shows Sunday's day with no reset either. The intro was reached there only by calling it from code. Shots: 20-sunday-7pm-open-1440.png, 21-reset-intro-1440.png, 131-ipad-sample-sunday-9am-1024.png, 132-ipad-reset-intro-1024.png, 65-phone-sunday-open-390.png, 67-phone-sunday-bottom-390.png, 68-phone-kicker-opens-settings-390.png, 70-phone-desk-sunday-390.png, 171-phone-sunday-nov15-no-reset-390.png, 71-phone-reset-intro-390.png, 151-duo-folded-intro-386.png.

**What they're thinking.** (Russell, on the couch with his phone, Kim beside him)
- "It's 7 on Sunday and Kim's asking if we're doing it. I open the app on my phone. Evening with Kim, Getting started, a costume to-do. No reset."
- "There's a gold SUNDAY RESET at the top. I tap it and get Settings."
- "Open the desk: Sunday's blocks, still no reset. Fine, I'll go get the laptop."
- "On the laptop the gold button is plain as day and says 17 minutes. Remind me at 8? I'm about to close the lid. Will it?"

**Improvements.**
1. **Give the phone the same way in as the desk.** When the chip would show (Sunday, Saturday after 5 pm, Monday and Tuesday's "Set up this week", Wednesday on "Plan the rest of the week", a reset put away, a reminder set), put one card at the top of the phone's Today, under the day strip: the chip's words as its title ("Sunday Reset · Nov 15 to 21 · 17 min") and one gold button with the chip's label ("Start Sunday Reset", "Finish your reset", "Plan the rest of the week"). It opens the same intro sheet, which already fits 386x580 with its buttons pinned. Why: "It's Sunday at 7, and the phone can't start the one thing the app is named for." Feature, M. Files: board/src/app.js renderToday (a card from a variant hook, like SR_planMeals), variants/corners11/variant.js chipState and openIntro (expose as window.SR_resetCard), variants/corners11/css/duo.css. Upstream: the chip lives only in the desk's bottom bar, which steps aside on a phone, and the phone's list was built before the chip existed.
2. **Stop the gold kicker from being the Settings door.** "SUNDAY RESET" in gold with the sliders mark reads like the start button. Make the door the sliders mark with the word "Settings", quiet white at 14 px; gold stays for the one call to action, which the card in item 1 now holds. Why: "I tapped the gold Sunday Reset and got a list of settings." UI, S. Files: board/src/app.js renderToday (door), variants/corners11/css/duo.css.
3. **A reminder that rings with the tab closed.** "Remind me at 8 pm" sets a timer inside the page (its toast says "Keep this tab open"); Safari pauses a tab in the background on an iPhone, so it won't ring, and the toast has no Undo. Make the second button "Add to my calendar for 8 pm" (a one time event, the same .ics path as the setup's weekly one), keep the chip's "Sunday Reset at 8 pm" state, and toast "Added to your calendar for 8 pm." with Undo (Undo puts the chip back; the event stays in the calendar, so say "Delete it in Calendar if you change your mind" only if Undo is used). Why: "I tapped Remind me, closed the laptop, and nothing happened." Feature, S. Files: variants/corners11/variant.js openIntro (snooze), board/src/app.js saveResetIcs.
4. **One number for how long it takes.** The setup promises "about 20 minutes", the chip says 17 min for five steps, the intro "About 19 min" for six, and on the folded Duo the kicker wraps "MIN" onto a line of its own. Use the intro's sum everywhere (the setup can say "About 17 to 20 minutes" until it knows the steps), and shorten the kicker to "Nov 8 to 14 · 19 min". Copy, S. Files: variants/corners11/variant.js minutesOf and the intro kicker, board/src/onboard.js.

## 2. Look back

**Screen.** Step 1 from the second reset on: "Here's last week. Keep one thing, change one thing." A Last week card (meals planned, hours to yourself), One thing to keep, One thing to change. Reached on Sunday Oct 25 (iPhone), Nov 8 (both Duo sizes), Nov 15 (Mac). Checked at 390x844, 386x580, 951x669, 1440x900. Two problems in every size: the board beside it shows the week being planned (Nov 15 to 21), not last week; and the keep and change typed on Oct 25 never came back, because Nov 1 had no full reset and "Last time you said" only reads the week right before. Shots: 72-phone-reset-lookback-390.png, 73-phone-lookback-typed-390.png, 152-duo-folded-lookback-386.png, 156-duo-open-lookback-951.png, 172-mac-lookback-shows-next-week-1440.png.

**What they're thinking.** (Kim)
- "Here's last week, it says. The board next to it is next week, mostly empty. Which one am I looking at?"
- "Two weeks ago we wrote 'date night on Friday' and 'less takeout midweek'. I wanted to see if we did it. They're gone."
- "On the phone I see two big numbers and scroll to find the question."
- "12 meals planned last week. That's nice to hear."

**Improvements.**
1. **Show last week on the board during Look back.** goStep sets the board's week to the week being planned for every step. For Look back, show last week (the reset's week minus 7) with what got done, title "Last week · Nov 8 to 14", then slide to the new week on Next (the tile wave already runs forward). Why: "It says last week and shows next week." Bug, S. Files: board/src/app.js goStep and resetTop, board/src/data.js STEPS (a week offset on 'back').
2. **Bring back the last thing you said, from whenever you said it.** Read the newest keep and change from the last eight weeks, with its date: "On Oct 25 you said: Keep date night on Friday. Change less takeout midweek." Each with "Still true", which copies it to this week (toast with Undo). Why: "We skipped one Sunday and our notes vanished." Feature, S. Files: board/src/app.js lookBackBody (the lrec lookup).
3. **On a sheet, lead with the question.** On the phone and the folded Duo the two fields sit below the fold, under a week board too small to read. In Look back there's nothing to drag, so fold the board to a strip (or hide it) under 640 tall or in sheet mode, and put "One thing to keep" in view. Why: "I scrolled past two numbers to find the question." UI, M. Files: variants/corners11/variant.js drawSteps and sheetMode, variants/corners11/css/duo.css, variants/corners11/css/frame.css.

## 3. Look ahead

**Screen.** Step 1 on a first reset, step 2 after: the five weeks by week, Pick holidays (twenty tiles and a Done at the foot), Add a date (A day to remember with Get ready: A gift, Plans), each date's "Time to start" line with Add a to-do and Skip. Reached on Sunday Oct 18 and 25. Checked at 1440x900, 1024x1366, 390x844. Shots: 22-reset-1-lookahead-1440.png, 23-reset-1-holidays-1440.png, 25-reset-1-after-holidays-1440.png, 27-reset-1-costume-todo-1440.png, 28-reset-1-day-to-remember-1440.png, 30-reset-1-gift-on-1440.png, 31-reset-1-date-added-1440.png, 74-phone-lookahead-390.png, 133-ipad-reset-step1-1024.png.

**What they're thinking.** (Russell)
- "Halloween with 'Costumes: time to start'. That's the nudge I needed."
- "Twenty holidays, and I scroll to the bottom to find Done."
- "When I added Grandma Jo's birthday I tapped A gift. Then the list asked me again: Add a to-do. Didn't I say that?"
- "Three empty weeks each get their own heading."

**Improvements.**
1. **Say gift once.** When a date is added with Get ready picked and it's already inside its lead time (Grandma Jo on Nov 8, gift lead three weeks, today Oct 18), make the to-do then and there: "Gift for Grandma Jo, due Nov 5, is on your to-dos." with Undo, and the row reads "On your to-dos" as Halloween's does. A date further out keeps today's "shows up when it's time". Why: "I picked A gift. Don't ask me twice." Feature, S. Files: board/src/app.js newEventV11 and readyPicker, aheadBody.
2. **Let the holiday grid go when you're done with it.** Picks apply as you tap, so the Done at the foot of twenty tiles is only a way out. Pin Done to the top of the grid, or fold the grid to "Holidays you keep: Halloween, Thanksgiving, Christmas · Change" the moment you tap outside it. Why: "I picked three and had to scroll to get out." UI, S. Files: board/src/app.js aheadBody (holiday picker), variants/corners11/css/lookahead.css.
3. **Fold empty weeks.** "Nov 1 to 21 · No dates" as one line instead of three headings, so the dates that matter sit together and the step fits a sheet. Copy and UI, S. Files: board/src/app.js aheadBody.

## 4. Your time

**Screen.** Step "Your time": hours to yourself this week, a seven day strip, one suggestion ("Walk fits tomorrow · 5:15 to 5:45 pm · Nothing moves · Add"), then your blocks to drag or tap. Reached on Sunday Oct 18 and 25. Checked at 1440x900, 390x844. Shots: 32-reset-2-yourtime-1440.png, 33-reset-2-walk-added-1440.png, 34-reset-2-place-reading-1440.png, 35-reset-2-after-place-1440.png, 75-phone-yourtime-390.png, 76-phone-yourtime-added-390.png.

**What they're thinking.** (Russell)
- "Add, nothing moves. Best button in the reset. One tap and the walk's on Monday."
- "3.5 h to yourself, 0.5 h every day. That's Wind down before bed. That isn't my time."
- "After I add the walk, it offers the walk again for Tuesday. Could it put it on three days at once?"

**Improvements.**
1. **Don't count Wind down as time to yourself, or say that it does.** Every day's 0.5 h on the strip is the Wind down routine, so a week with no time of your own reads "3.5 h to yourself". Prefer leaving routine Wind down out of the count (a day with none says "none yet"); if it stays, name it: "3.5 h to yourself, Wind down each night". Why: "Wind down isn't me time; the number feels made up." Model or copy, S to M. Files: board/src/app.js yoursBody, board/src/model.js (the yours count, which the finish and the plan read too). Russell decides.
2. **Offer more days in one tap.** After Add, the card reads "Walk fits Tuesday, Thursday, and Saturday · Add all 3", one Undo for the set. Why: "I want a walk most days, not one at a time." Feature, S. Files: board/src/app.js ownSpot and yoursBody.
3. **On the phone, the blocks start under the fold.** Put them in one sideways row right under the suggestion card, so the step's two ways (the one tap suggestion and your own pick) share the first screen of the sheet. UI, S. Files: variants/corners11/css/yourtime.css, variants/corners11/css/duo.css.

## 5. To-dos (the reset's step)

**Screen.** "To-dos: Drag one onto a day, or tap it to see its steps." On Oct 18: "Nothing due this week", then "Due after Saturday: Costumes for Halloween · Give it a time · Spread it out". Spread it out opens the to-do's panel (a little each day, up to 30 min, done by Mon Oct 26, Spread 5 steps). On Oct 25 (phone): "1 to-do due this week needs a time". Checked at 1440x900, 390x844. Shots: 36-reset-3-todos-1440.png, 37-reset-3-spread-1440.png, 38-reset-3-spread-done-1440.png, 39-reset-3-after-spread-1440.png, 77-phone-todos-390.png, 96-wed-catchup-todos-1440.png.

**What they're thinking.** (Russell)
- "Spread it out did what I'd do by hand: a few minutes most mornings, done by Thursday. One tap."
- "Then the costume left the list and the step said Nothing due this week. Did it work? I had to read the board to be sure."
- "Wednesday the 4th, Halloween's over, and it still wants the costume scheduled."

**Improvements.**
1. **Keep what you just planned in view.** After Spread it out or Give it a time, the to-do stays in the step under "Has a time" with its first time: "Costumes for Halloween · Mon 8 am, 5 steps through Thu", as This week's plan already shows it. Why: "It vanished. Did it work?" UI, S. Files: board/src/app.js (the reset's to-do step body).
2. **A to-do whose date is over asks the right question first.** A to-do made from a Look ahead date (Halloween) that has passed offers "Halloween was Oct 31. Mark done or let it go", with Undo, ahead of Give it a time; the intro's count and the catch up don't lead with it ("1 to-do due before today needs a time"). Why: "Halloween's over. Stop asking me to schedule costumes." Feature, S to M. Files: board/src/app.js (to-do step, weekCounts, dueWords), board/src/model.js (a to-do's event). Note: borders the to-dos walk; it surfaces here in the reset's intro, its To-dos step, and the catch up.
3. **"Nothing due this week" over a list reads like nothing to do.** Say "Nothing due this week. One due Monday, if you want a head start:" above the list. Copy, S. Files: board/src/app.js dueWords.

## 6. Meals (the reset's step)

**Screen.** "Meals: Plan the week's meals. The grocery list fills in as you go." Open the meal board, This week's meals (a 21 cell grid in the panel), Same as last week, Plan a prep week, Groceries. In V11 this step is where the old Dinners tray lives: the tray's Meals tab can't be reached outside the reset, and the phone has a Meals card and a Groceries card instead. Reached on Oct 18, Oct 25, Nov 8; sample family Nov 8. Checked at 1440x900, 1024x1366, 951x669, 390x844, 386x580. Shots: 40-reset-4-meals-1440.png, 45-reset-4-meals-after-board-1440.png, 78-phone-meals-step-390.png, 79-phone-meals-same-as-last-390.png, 134-ipad-reset-meals-1024.png, 153-duo-folded-meals-step-386.png, 155-duo-open-meals-step-951.png, 97-wed-catchup-meals-1440.png.

**What they're thinking.** (Alex, the batch cook parent)
- "Twenty one empty plus signs. Where do I start?"
- "On the folded phone I get the title and Open the meal board. The grid is under the fold."
- "Same as last week: last week we ate out half the time. The week before was the good one." (Nov 8: last week had one meal planned, and Same as last week copies only that.)
- "A grid here and a bigger grid behind Open the meal board. Same week, twice."

**Improvements.**
1. **On a sheet, one way in.** On the phone and the folded Duo, drop the panel's 21 cell grid and say what's planned in words, with one button: "13 meals planned, 6 from leftovers · Fri and Sat dinners open · 14 things to get" and "Plan meals" (opens the board). Keep the grid on the desk, where it's a glance. Why: "Two grids for one week, and the small one is under the fold." Simplify, M. Files: variants/corners11/variant.js SR_mealStep, variants/corners11/css/meals.css, variants/corners11/css/duo.css.
2. **Same as a week you liked.** Offer the last four planned weeks by date and count ("Oct 25 to 31 · 13 meals"), one tap, one Undo, in place of a "Same as last week" that copies whatever last week was. Why: "Last week was a mess. Give me the week before." Feature, S to M. Files: variants/corners11/variant.js sameAsLast, SR_mealStep.
3. **A first reset leads with the two ways to fill a week.** With nothing planned, the step says "No meals yet. Plan a prep week to cook twice and eat leftovers, or pick night by night on the meal board." Copy, S. Files: variants/corners11/variant.js SR_mealStep.

## 7. The meal board (with Plan a prep week and Suggest meals)

**Screen.** "Plan the week's meals": Show (Breakfast, Lunch, Dinner), Suggest meals, Plan a prep week, Same as last week, the board, Batch cooks, Groceries, Find or add, Leave out, Yours, Not cooking, Ideas, More below. Opened from the Meals step, the menu (Meal board, Groceries), the dinner panel, and the phone's Meals and Groceries cards. Checked at 1440x900 (board and meals side by side), 1024x1366, 951x669, 390x844, 386x580. Shots: 41-reset-4-prep-week-1440.png, 42-reset-4-prep-used-1440.png, 63-groceries-from-menu-1440.png, 135-ipad-meal-board-1024.png, 136-ipad-prep-week-sunday-9am-1024.png, 166-suggest-meals-1440.png, 84-phone-meal-board-top-390.png, 85-phone-meal-board-days-390.png, 86-phone-add-prep-block-390.png, 154-duo-folded-meal-board-386.png, 167-duo-open-meal-board-951.png, 168-duo-open-meal-board-this-week-951.png, 98-wed-prep-week-1440.png.

What was seen. On the sample family at Sunday 9 am, Plan a prep week chose "Two batch cooks, Sunday and Thursday": Sheet pan chicken for 4 on Sunday, then Thursday's Sheet pan chicken for Friday and Saturday lunches (seven meals of one dish), and fresh nights of Tacos (already on Monday) and Salmon rice bowls; its Meal prep block was "Sunday noon to 1:30 pm" while the batch cook is Sunday dinner at 6. The grocery count stays at the old number while a plan is proposed. Suggest meals is a second generator (21 ideas, seven different lunches); while either proposal is up there are two golds (Done and Use this plan or Keep all 21). Each idea's x is 24 by 24. On the open Duo the board uses the phone's turned layout: days down, three days in view, cells about 360 px wide across the fold, the meals under it. On the folded Duo the first screen is the title, Show on two rows, and three buttons; the board starts at the fold. A past week opens folded shut as "Earlier this week: Sun to Sat".

**What they're thinking.** (Alex)
- "Plan a prep week is what I came for: two cooks, leftovers for lunches. Yes."
- "But that's sheet pan chicken seven times. And tacos twice."
- "Meal prep at noon, the batch cook at 6. When am I cooking?"
- "What will this add to the grocery list? I find out after I say yes."
- "Suggest meals or Plan a prep week: what's the difference?"

**Improvements.**
1. **One button, two ways.** Replace Suggest meals and Plan a prep week with "Fill the week", which asks once: "Cook most nights" or "Cook twice, eat leftovers" (white fill on the one picked), then shows the proposal. While a proposal is up, its "Use this plan" is the one gold thing and Done goes quiet. Why: "Two buttons that both fill my week, and I can't tell which is which." Simplify, M. Files: variants/corners11/variant.js openMealBoard (sugBtn, prepBtn, startSuggest, startPrep), variants/corners11/css/mealprep.css, variants/corners11/polish.css.
2. **A prep week someone would cook.** Two different batch dishes; fresh nights never repeat a dish already in the week; the Meal prep block is the batch cook (the batch dinner moves into it: "Cook Sheet pan chicken, 4 to 5:30 pm, for 4 meals"), or sits right before it; and the proposal line says what it adds: "Adds 9 things to get". Why: "Seven meals of the same chicken, and I don't know when I'm cooking." Model, M. Files: board/src/model.js prepPlan and applyPrepPlan, variants/corners11/variant.js prepLook and prepWords.
3. **The open Duo gets the book.** From 760 to 1139 wide and wider than tall, put the seven day board (days across, three rows) on the left page and the meals on the right page, as the Mac does at 1440, instead of the phone's turned board with three days in view. Why: "It's a big screen and I can see Sunday to Tuesday." UI, M. Files: variants/corners11/variant.js openMealBoard (the layout choice), variants/corners11/css/meals.css, variants/corners11/css/duo.css.
4. **Board first on a small screen.** On the folded Duo and phones, fold Show into one "Meals: 3" button with a menu (white fill on the ones showing) and put "Fill the week" and "Same as last week" on one row, so the first screen holds the week's first days. Why: "I opened the meal board and saw buttons." UI, S. Files: variants/corners11/css/duo.css, variants/corners11/css/meals.css.
5. **A past week opens with its meals.** "Oct 25 to 31 is over · Show its meals" (open by default), never "Earlier this week" for a week two weeks back. Looking back is how people reuse a week they liked. Copy and UI, S. Files: variants/corners11/variant.js openMealBoard (showPast and its fold line).
6. **Make the x on a suggested meal a 44 px target.** The mark can stay small; its button is 24 by 24 today. UI, S. Files: variants/corners11/css/mealprep.css.

## 8. A day's card on the meal board, and Cook extra

**Screen.** Tap a meal on the board: "Monday dinner" with its name, its parts with carts ("4 go on the grocery list. Tap one to leave it off."), How, Who's making it (You, Kim, Anyone), Cook extra for (Lunch: Wed), Also on, Take it off, Done. Checked at 1440x900, 390x844. Shots: 46-reset-4-tap-tacos-1440.png, 47-reset-4-tacos-kim-1440.png, 87-phone-day-card-salmon-390.png, 88-phone-cook-extra-wed-390.png.

**What they're thinking.** (Alex)
- "Cook extra for Wednesday lunch. One tap, and the board says For 2 meals and From Tue dinner. That's how I cook."
- "Only lunch, though. Sometimes I double it for Thursday's dinner."
- "On the laptop the card's Done is cut off at the bottom of the screen."
- "Anyone is already picked. Nobody's making it, then."

**Improvements.**
1. **Keep the card's foot on screen.** At 1440x900 the Monday dinner card ran from 328 to 923 px, so Take it off and Done were cut off below the window. Open the card above the cell when there's no room below, or cap its height with the middle scrolling and the foot pinned. Bug and UI, S. Files: variants/corners11/variant.js (the day card's placement), variants/corners11/css/meals.css.
2. **Cook extra for dinner too.** "Cook extra for · Lunch Wed · Dinner Thu", so a double batch can be a second dinner. Feature, S. Files: variants/corners11/variant.js (the day card), board/src/model.js syncLeftovers.
3. **Who's making it starts unanswered.** No cook is picked when a meal is cooking; "Anyone" stays a choice. Until one is picked the line asks "Who's making it?" in the card. Why: "Anyone means nobody's on it." UI and model, S. Russell decides (see 9.1).

## 9. The dinner panel

**Screen.** From Now at 3:30 pm ("Dinner at 6 pm isn't decided yet. Pick dinner · Remind me at 5"), and from a Dinner block's Change: the dinner mat (Thursday · 6 pm): the block on the left and "Open the meal board"; on the right How's dinner happening?, Who's cooking?, What's for dinner?, Recently, Your recipes, Build it from the pantry, Clear, and the grocery card. Checked at 1440x900. Shots: 140-thu-330-now-dinner-question-1440.png, 141-pick-dinner-panel-1440.png, 142-dinner-cook-1440.png, 143-dinner-picked-1440.png, 60-dinner-panel-1440.png, 61-dinner-change-1440.png, 62-dinner-change-bottom-1440.png.

What was seen. Tapping Cook set the cook to Anyone and said "Tonight: Cooking at home." and "Pick a dinner: done. 1 thing left in Getting started." before any dish was picked. After picking Chicken stir fry, the hero still read "Dinner, 6 pm to 6:45 pm". Recently and Your recipes list the same dishes, and Recently reflowed after the tap. The left half of the mat is empty below the block. "Grocery list for the week · Nothing to get yet" wears the gold outline beside the gold Done. The Getting started toast sat over the right column's dish chips.

**What they're thinking.** (Russell at 3:30, between meetings)
- "Pick dinner. Cook. It already says done? I haven't said what we're making."
- "I tapped Chicken stir fry and the big block still says Dinner."
- "Recently and Your recipes: the same list twice, and it jumped when I tapped."
- "Who's cooking says Anyone. Kim will assume I'm on it."

**Improvements.**
1. **A dinner is decided by what, not by Cook.** Tapping Cook opens What's for dinner? and Who's cooking? with neither filled, and the night stays open (the header's Dinner open, the 3 pm question) until a dish is picked or a way that isn't cooking (Order in, Eat out, Leftovers, Skip). Getting started ticks then. Why: "Cook isn't a dinner." Model and copy, M. Files: board/src/app.js dinnerPanel (what Cook sets), board/src/model.js (when a dinner counts as decided), board/src/app.js noteMove('dinner'). Upstream: the rule "decided when it has a name or a cook" predates V11's Anyone. Russell decides.
2. **One panel for a dinner, and retire the empty mat.** Open the meal board's day card for a dinner (name, parts with carts, how, who, cook extra) instead of this mat, so a dinner looks and works the same from the band, the board, and the meal board; if the mat stays, its hero updates with each change ("Chicken stir fry · Kim cooks · 6 to 6:45 pm") and the parts with carts fill the left half. Why: "Half the screen is empty, and the block doesn't say what I picked." Simplify, M. Files: variants/corners11/variant.js openDetail (the c-detail mat), board/src/app.js dinnerPanel.
3. **One list of dishes, and one gold.** "Your dinners, newest first": Recently's four, then the rest of Your recipes, no repeats, and nothing reflows after a tap. The grocery card goes quiet (no gold outline), "Nothing to get yet" in 13 px #AFAFAF. Why: "Same dishes twice, and they move when I tap." Simplify, S. Files: board/src/app.js dinnerPanel, variants/corners11/polish.css.

## 10. The grocery list

**Screen.** Groceries under the meal board (from the menu's Groceries, the dinner panel's grocery card, the phone's Groceries card): aisle groups (Proteins, Vegetables, Bases), each item with the meals it's for, checks, Share and Copy, then "Share what's left", "Copy what's left", "Clear the checks" once something's checked. Checked at 1440x900, 390x844. Shots: 44-reset-4-meal-board-groceries-1440.png, 63-groceries-from-menu-1440.png, 64-groceries-checked-1440.png, 82-phone-groceries-card-390.png, 83-phone-meal-board-from-groceries-390.png, 170-phone-groceries-store-390.png, 165-groceries-copy-share-1440.png.

What was seen. Copy and Share send the names only, one per line, no groups and no counts ("Black beans / Chicken / Ground beef ..."). Checked items stay where they are, struck through. On the phone the list sits under "Plan the week's meals" with the week arrows, and the Groceries card's button says "Open the meal board". There's nowhere to add milk.

**What they're thinking.** (Alex at the store, phone in one hand, the cart in the other)
- "Grouped by aisle. Good."
- "Chicken for how many meals? Burrito bowls for 3, stir fry, sheet pan: five. I did the math in the aisle."
- "I sent the list to Sam and got a bare column of words."
- "I need milk and diapers too. Where do they go?"
- "The title says Plan the week's meals. I'm shopping."

**Improvements.**
1. **Say how many meals each thing covers, and keep it when shared.** Under "Chicken", lead with the total: "5 meals: Burrito bowls Sun (3), stir fry Mon, sheet pan Sat". Share and Copy keep the aisle headings and the totals ("PROTEINS / Chicken, 5 meals / Ground beef, 2 meals"). Why: "How much chicken? I did the math in the aisle." Copy and feature, S. Files: variants/corners11/variant.js (the list and its share text, near copyText), board/src/model.js (grocery counts).
2. **A store view.** The phone's Groceries card opens a list titled "Groceries · Nov 8 to 14" (no board, no week arrows), its button reads "Open the list", and a checked item moves into a folded "In the cart (2)" at the foot with Undo, so what's left stays on top. Why: "I'm in the store. Show me what's left." UI, M. Files: variants/corners11/variant.js openMealBoard with shop (or a shop sheet of its own), board/src/app.js renderToday (the card's button), variants/corners11/css/meals.css.
3. **Room for things that aren't meals.** One "Add an item" line at the foot of the list (milk, paper towels), kept with the week's checks, with Undo. This is the open decision in CORNERS-V11 ("Extra groceries ... Build it?"); this walk says yes: a family's list is never only meals. Feature, M. Files: board/src/data.js (saved state), board/src/model.js groceryProgress, variants/corners11/variant.js.

## 11. People

**Screen.** Step "People": Already in your week (Evening with Kim, every day), group tabs (Partner, Kids, Family, Friends), Kim with an x, Add someone, ideas in Play, Talk, Make, Date; tapping an idea opens the place panel ("Takes 1 h 30 min from Evening with Kim"). Checked at 1440x900, 390x844. Shots: 48-reset-5-people-1440.png, 49-reset-5-remove-kim-1440.png, 50-reset-5-place-date-night-1440.png, 51-reset-5-date-night-added-1440.png, 89-phone-people-390.png.

**What they're thinking.** (Kim)
- "Evening with Kim, every day. So we're already fine? We're on our phones every evening."
- "There's an x next to my name. I tapped it and it said Remove. Remove me from what?"
- "Date night at home: tap it, pick Friday, add. That part's nice."
- "On the phone the ideas start at the bottom edge."

**Improvements.**
1. **No x on people inside the reset.** Removing a partner from the board belongs on You and home. In the step, the names choose whose ideas show and nothing else. Why: "An x next to my name, in the middle of planning our week." Remove, S. Files: board/src/app.js peopleBody, personX.
2. **A routine doesn't answer the question.** "Evening with Kim, every day" is a template block. Already in your week lists only what was placed for this week, and the line asks "What's one thing you'll do together this week? Drop it on an evening." Why: "It counts the evening we always have and says we're set." Copy and model, S. Files: board/src/app.js peopleWeek, peopleBody.
3. **On the phone, ideas before tabs.** Under the step's line, one sideways row of ideas for the partner first, then the tabs and the names. Why: "I scrolled past buttons to find something to do." UI, S. Files: board/src/app.js peopleBody, variants/corners11/css/people.css, variants/corners11/css/duo.css.

## 12. The recap and the finish

**Screen.** The last step ("Your week is set" or "Here's your week", "This reset: 4 blocks placed, 1 to-do given a time, and 12 meals planned."), its cards (Meals with a cook pill per night, Kept for you, To-dos, People, Coming up, Share this plan), Done, the week clicking into place, the toasts, and This week's plan. Checked at 1440x900, 390x844. Shots: 55-reset-recap-1440.png, 56-reset-done-moment-1440.png, 57-reset-done-after-1440.png, 58-the-plan-1440.png, 90-phone-recap-390.png, 91-phone-recap-bottom-390.png, 92-phone-after-done-390.png, 125-plan-oct25-1440.png.

What was seen. The Meals card shows "Anyone" on six nights and "K" in a circle for Kim; "Spaghetti and sa..." is cut by its pill. Done brings two toasts at once: "Your week is set. Your plan is saved. See the plan" and "Do your first Sunday Reset: done. 3 things left in Getting started. See the list".

**What they're thinking.** (Russell and Kim)
- "Your week is set. Nice."
- "Six dinners say Anyone. That's the one thing we sat down to decide."
- "K is Kim? The meal board says Kim."
- "Two toasts at the good moment, one of them about a checklist."
- "How does Kim get this on her phone? A picture?"

**Improvements.**
1. **Settle who cooks at the table.** In the recap's Meals card, a night with no cook shows no pill; if any are open, one line under the list says "4 nights have no cook yet", each night with You and Kim chips (a tap each, toast with Undo). Names everywhere, never an initial; the meal board already says "Kim". Why: "Anyone six times, and that's what we came to decide." UI and copy, M. Files: variants/corners11/variant.js SR_finishBody and openPlan (the meals card), board/src/app.js cookName.
2. **One toast at the finish.** The Getting started tick updates its list without a toast of its own when the reset is the move (or waits until the finish toast is gone). Why: "The nice moment got a second toast about a checklist." UI, S. Files: board/src/app.js finishReset, noteMove('reset').
3. **Send the plan as words, not only a picture.** "Share this plan" opens the share sheet with text first: the dinners and who cooks, the to-dos with times, the date night, "14 things to get"; the picture stays as the second choice. Why: "Kim wants the dinners on her phone, not a screenshot." Feature, S to M. Files: variants/corners11/variant.js SR_finishBody (share), board/src/app.js (Copy this week as text already writes the week). Real sharing between two phones is sync, which needs the server and Russell's OK.

## 13. Finish later, and picking back up

**Screen.** "Finish later" at the bottom left of every step, its toast ("Saved. Pick up where you left off." with Resume), the chip "Finish your reset 5 of 5", the same on the phone, and on a catch up. Checked at 1440x900, 390x844. Shots: 52-finish-later-1440.png, 53-after-reload-finish-later-1440.png, 54-resume-1440.png, 80-phone-after-finish-later-390.png, 81-phone-after-finish-later-later-390.png, 99-wed-catchup-finish-later-1440.png.

What was seen. On the desk the full reset keeps its place through a reload and resumes on People ("Picking up where you left off."). On the phone, once the toast leaves there is no way back (no chip, no card). A catch up shows "Finish your reset 2 of 2" until a reload; after it, the chip is "Plan the rest of the week 7 min" again and Start begins at step 1.

**What they're thinking.** (Russell)
- "Elijah woke up. Finish later. Saved, pick up where you left off. Good."
- "The button says Finish your reset 5 of 5. Five of five sounds done."
- "On the phone the Resume toast went away and took the way back with it."
- "Wednesday I stopped halfway through the rest of the week; after the page reloaded it started over."

**Improvements.**
1. **Name what's next, not a fraction.** "Finish your reset · People next" (a catch up: "Finish planning the week · Meals next"), the same words in its label for a screen reader. Why: "5 of 5 sounds like we finished." Copy, S. Files: variants/corners11/variant.js chipState (the progress line).
2. **A catch up keeps its place across a reload.** goStep saves the step only for full resets; save it for catch ups too (weeks[ws].reset.catchStep), and the chip and the intro pick up there. The toast says "Pick up where you left off"; make it true after a reload, which Safari on a phone does often. Bug, S. Files: board/src/app.js goStep and startReset, variants/corners11/variant.js chipState and openIntro.
3. **Remember what this reset did until the week starts.** The finish's "This reset: 4 blocks placed..." counts from a first look kept for 12 hours on the device; a reset begun Sunday night and finished Monday evening loses it. Keep it until the planned week's first day ends. Why: "We finished Monday and it said nothing about what we did Sunday." Bug, S. Files: board/src/app.js keptSnap and keepSnap. (On the phone, the way back is the card in 1.1.)

## 14. Catch up this week (Wednesday)

**Screen.** Wednesday Nov 4, 8 pm. Now has no reset (by design); the Planner's chip reads "Plan the rest of the week 7 min"; its intro "Plan the rest of the week. Wednesday to Saturday · About 7 min" (To-dos, Meals; Start, Not this week); the kicker "Catch up · Wednesday to Saturday"; the recap "Here's your week" with Wed to Sat dinners Open; the toast "Caught up. Your plan is saved." Checked at 1440x900. Shots: 93-wed-now-1440.png, 94-wed-planner-week-1440.png, 95-wed-catchup-intro-1440.png, 96-wed-catchup-todos-1440.png, 97-wed-catchup-meals-1440.png, 98-wed-prep-week-1440.png, 100-wed-catchup-recap-1440.png, 101-wed-catchup-done-1440.png.

**What they're thinking.** (Russell, Wednesday night)
- "Two steps, seven minutes. That's the size of a Wednesday."
- "It has three names: Plan the rest of the week, Catch up, Finish your reset."
- "It wants a time for Halloween costumes. Halloween was last week."
- "Wednesday's dinner is over. Why is tonight in the meals?"

**Improvements.**
1. **One name.** "Plan the rest of the week" on the chip, the intro, the kicker ("Rest of the week · Thu to Sat"), the parked chip ("Finish planning the week · Meals next"), and Help. Copy, S. Files: board/src/app.js resetTop (the 'Catch up' kicker) and window.SR.resetState, variants/corners11/variant.js chipState.
2. **Start at tomorrow once tonight's dinner is over.** At 8 pm on Wednesday the span is "Thursday to Saturday" and the Meals step leaves tonight out. Model and copy, S. Files: board/src/app.js resetTop (catchSpan), variants/corners11/variant.js SR_mealStep (dates by now). (The prep week part is a fix in flight; see the notes.)
3. **"Not this week" needs Undo.** Its toast says "Hidden until Sunday." with no way back; add Undo, which brings the chip back. Copy and UI, S. Files: variants/corners11/variant.js openIntro.

## 15. Settings: the overview and Find a setting

**Screen.** Settings from the name menu on the desk, or the gold kicker on the phone. Overview: Keeping your week (Saved in this browser on this device, No backup yet, on a phone Keep it on your Home Screen, and a Download a backup button), Your week (Russell, Kim, Elijah; Up at 6:30 am, bed at 10:30 pm, "Usual days, on a Monday"; Sunday Reset, Sundays at 7 pm, 6 steps), This device. Find a setting. Checked at 1440x900, 390x844, 386x580. Shots: 110-settings-overview-1440.png, 114-settings-find-remind-1440.png, 68-phone-kicker-opens-settings-390.png, 160-duo-folded-settings-list-386.png, 161-duo-folded-settings-overview-386.png.

What was seen. Find a setting answers "Nothing by that name" for remind, reminder, notification, sync, share, tray, bar, diet, vegetarian, Kim, "week start", and "reset time" (it matches the whole query as one run of letters, so "week start" misses "Weeks start on"); groceries finds only the Meals switch. Overview's "Sundays at 7 pm" opens a page with no time on it.

**What they're thinking.** (Kim, who wants to move the reset to Saturday night)
- "Overview says Sundays at 7 pm. I tap it: steps, no time."
- "I search remind. Nothing. Share. Nothing."
- "Three cards and a button telling me the week could vanish. Which do I tap?"

**Improvements.**
1. **Find what people type.** Match each word in any order ("week start" finds Weeks start on); add the words people use: remind, reminder, notification, alarm (the reset's day and time, 16.1); share, send, partner and the partner's name (Copy this week as text, the recap's share); diet, vegetarian, vegan, allergy, leave out ("Leave out foods, on the meal board", opening it at Leave out); groceries, shopping (the meal board's list). Copy and feature, S. Files: board/src/app.js SET_INDEX and the find matcher.
2. **One card for keeping the week.** "Your week lives in this browser only. Last saved 1 min ago." with Download a backup as its button and, on an iPhone or iPad, the Home Screen line inside it; drop the "No backup yet" row that goes to the same page. Simplify, S. Files: board/src/app.js (the overview page), variants/corners11/css/shell.css.
3. **Say it the way people say it.** "Usual days, on a Monday" becomes "Weekdays: up 6:30 am, bed 10:30 pm"; "Sunday Reset · Sundays at 7 pm, 6 steps" opens a page that can change both (16.1). Copy, S. Files: board/src/app.js (the overview page).

## 16. Settings: the Sunday Reset page, and the pages around it

**Screen.** Sunday Reset (switches for Look back, Look ahead, Your time, To-dos; "Goals joins while you have a goal with a date ahead."; "Your reset has 6 steps, then a look at the week you set."; See how you and home are set), You and home (Meals, People, Moving switches; More people), Usual days, Calendars (holidays), The desk, Reading and sound, Block library, Help (How it works, Something isn't working). The tray bar, Reminders, Sync, and Smart breakdowns don't show on the live V11 (V11 has no tray bar; the other three wait for the server), so a missing /api/smart leaves nothing dead here. Checked at 1440x900, 390x844. Shots: 113-settings-sunday-reset-1440.png, 69-phone-settings-reset-page-390.png, 111-settings-you-and-home-1440.png, 112-settings-usual-days-1440.png, 115-settings-calendars-1440.png, 116-settings-the-desk-1440.png, 117-settings-reading-sound-1440.png, 121-settings-block-library-1440.png, 120-settings-help-1440.png, 123-help-how-it-works-1440.png, 124-help-something-wrong-1440.png.

What was seen. The reset's day and time live only in the device's Getting started record (moves.resetAt): not on the board, not in a backup, not shared, not changeable after the setup, and the chip ignores it (it turns gold on Sunday whatever was picked). The page lists four steps and says six. How it works ends with "Start Sunday Reset" on any day.

**What they're thinking.** (Kim)
- "Where do I change when we do it? We want Saturday at 8 now."
- "It says six steps and lists four."
- "Meals and People are switches on another page."

**Improvements.**
1. **The reset's day and time, on this page and on the board.** "When: Sunday at 7 pm" (Saturday, Sunday, Monday as day chips; a time stepper by half hours), and "Add it to my calendar" (the setup's weekly .ics). Keep it in state.settings so it goes with a backup and a household; the chip, the intro's reminder, and Overview read it, and the chip turns gold on that day. Why: "We do it Saturday night now, and there's nowhere to say so." Feature, M. Files: board/src/app.js (the reset page, moves.resetAt), board/src/data.js migrate (an optional field with a default, as V11's others), variants/corners11/variant.js chipState (the day it turns gold), board/src/onboard.js (the setup writes it). Russell decides (saved state).
2. **Every step, in order, in one list.** Look back, Look ahead, Your time, To-dos, Goals (while a goal is set), Meals, Moving, People, each with its switch; Meals, Moving, and People here are the same switches as on You and home, and turning one off says what goes with it ("Meals is off for the whole board: its tab, its question, and its step"). Then "6 steps" matches the list. Simplify, S. Files: board/src/app.js (the reset page).
3. **How it works ends with the button that fits the day.** The chip's own label: "Start Sunday Reset" on Sunday, "Plan the rest of the week" on Wednesday, "This week's plan" once the week is set. Copy, S. Files: board/src/app.js (How it works), variants/corners11/variant.js (expose chipState).

## 17. Your data and Start over

**Screen.** Settings, Your data: where the week is kept, Keeping it here (Ask the browser to keep it), Backups (Download, Load), Earlier versions on this device (Look), Take the week with you (Print, Copy as text, Download for a calendar), and Start over last, under a rule ("Tap again to start over", which let go after five seconds). Checked at 1440x900. Shots: 118-settings-your-data-1440.png, 119-settings-start-over-armed-1440.png.

**What they're thinking.** (Russell)
- "Good: it says plainly the week lives only here."
- "Earlier versions: 'Start of Wed Nov 04 · Wed, Nov 4, 8:00 PM'. Start of what? The app says 8 pm everywhere else."
- "Start over asks twice and lets go. Good."
- "Kim wants this on her phone. Download, AirDrop, Load a backup on hers? Then we have two weeks that drift apart."

**Improvements.**
1. **Earlier versions in the app's own words.** "Before the catch up, Wednesday, Nov 4 at 8 pm", "This morning's copy, Sunday, Oct 25 at 7 pm": no leading zero, lowercase pm, no ":00", and what came after it. Copy, S. Files: board/src/store.js (rescue labels), board/src/app.js (the data page).
2. **"Send this week" first in Take the week with you.** The share sheet on a phone (the week as text), Copy on a computer; Print and the calendar file after it. Why: "The thing I want is to send it to Kim." Feature, S. Files: board/src/app.js (the data page).
3. **Say what two phones need, where Kim would look.** One line on Your data: "To keep one week on two phones, both need sync, which isn't on yet. For now, send the week as text, or the grocery list from the meal board." Copy, S. Files: board/src/app.js (the data page). Russell decides on sync.

## 18. Dev

**Screen.** Settings, Dev: made up boards (First visit, Weeks, People, Time on the board, Edge cases), The first visit, Try the setup, The tour, This window. Checked at 1440x900. Shot: 122-settings-dev-1440.png.

**What they're thinking.** (Russell, trying his own rituals)
- "Everything's here. To try a Sunday 7 pm reset I open Sample family, find the clock and the day, hold them, then start the reset."
- "There's no board for the meal side: a batch cook week with leftovers and a list half checked."
- "No board where a Sunday was skipped, to check that Look back's notes come back."

**Improvements.**
1. **Two ritual shortcuts at the top.** "Sunday 7 pm reset, sample family" and "Wednesday catch up, sample family": open the board, hold the day and time, open the intro. Feature, S. Files: board/src/app.js devPage and devHold, board/src/scenarios.js.
2. **A batch cook week.** Two batch cooks with leftovers on lunches, a Meal prep block, a grocery list with three things checked, and a vegetarian Leave out. Feature, S. Files: board/src/scenarios.js.
3. **Four resets with one Sunday skipped.** Keep and change notes on two weeks, one Sunday missed, so Look back's notes (2.2) and Same as a week you liked (6.2) can be seen. Feature, S. Files: board/src/scenarios.js.

---

## The five that matter most

1. **A way into the Sunday Reset on the phone and the folded Duo** (1.1, 1.2). On Sunday at 7 pm the phone has no way to start the reset, and the gold "SUNDAY RESET" at the top opens Settings. The same card is the phone's only way back after Finish later. The launch target is Safari on the Duo; today the ritual can't start there.
2. **Look back looks back** (2.1, 2.2). It shows the coming week while saying "Here's last week", and the keep and change notes vanish when a Sunday is skipped, which is when they matter most.
3. **The reset's day and time, on the board, with a reminder that rings** (16.1, 1.3). It can't be changed after the setup, it lives on one device, the chip ignores it, and "Remind me at 8 pm" needs the tab open.
4. **Who's cooking gets settled** (9.1, 12.1, 8.3). Cook counts as decided before there's a dish, Anyone is picked for you, and the recap says "Your week is set" over six "Anyone" pills and a "K".
5. **A prep week a batch cook would follow, behind one button** (7.1, 7.2, 10.1). One "Fill the week" with two ways; no dish twice; the prep block is the batch cook; the groceries it adds shown before Use this plan; a list that says how many meals each thing covers, and keeps it when shared.

## For Russell to decide

- Is a dinner decided by Cook alone, and is "Anyone" a cook? Today both count: the Getting started list ticks, the header turns green, and the recap says the week is set.
- Where the reset's day and time live. Moving them onto the board (state.settings) means they go with a backup and a household; V11 has added optional fields before without a version bump.
- Reminders without the server: a calendar event (weekly from the setup, one time from "Remind me"), or the in page nudge with words that say it needs the page open.
- Extra grocery items that aren't from a meal (already open in CORNERS-V11). This walk says build it.
- Whether Wind down counts as time to yourself (it changes the number on Your time, the finish, and the plan).
- Removing people from inside the reset's People step (proposed: You and home only).
- The phone's door to Settings: "Sunday Reset" in gold (the name) or "Settings" (the job).
- Two phones, one week: until sync is on, sharing is a picture or text. Worth saying so in the app (17.3)?

## Notes for fixes in flight

- **Plan a prep week offering tonight's dinner at 10 pm.** It happens at 7:04 pm too: on Sunday Nov 8, after the 6 pm dinner, Use this plan made tonight's dinner a batch cook "for 3 meals" and put the Meal prep block at 12:30 pm, hours earlier ("Prep week planned: 12 meals, and Meal prep on Sunday at 12:30 pm."). "Add a prep block" for that dinner answered "No quiet 90 minutes before Sheet pan chicken on Sunday. Make room that day, then add it." when the real reason is that it's over. Wednesday at 8 pm offered "One batch cook, Wednesday". If the fix keys on the dinner's time being over, and checks the block's start against now, it covers all four.
- **A toast covering the band's buttons on a sideways phone.** The same overlap happens on the dinner mat at 1440x900: the Getting started toast sat over the right column's dish chips (142-dinner-cook-1440.png).
- Toasts without Undo seen on this walk: "Reminder set for 8 pm. Keep this tab open." and "Hidden until Sunday." (1.3, 14.3).
