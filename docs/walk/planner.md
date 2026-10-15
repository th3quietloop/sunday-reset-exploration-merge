# Shaping the week in the Planner: a walk as the people who use it (V11, aca8a91, Oct 14)

**What I walked.** The live V11 build (aca8a91), served on its own port, in a headless Chrome. I checked Safari's sizes in Chrome at their exact sizes and pixel density: Mac 1440 by 900, iPad 1024 by 1366 (touch), Duo open 951 by 669 (touch), iPhone 390 by 844 (touch), and Duo folded 386 by 580 (touch).

**Who I walked as.**
- **Jordan**, a new person. Fresh origin. Jordan finished the setup at 11 pm on a Wednesday: a family with kids, "the week runs me", time for myself, dinner. Then Jordan opened the Planner.
- **Russell on Sunday afternoon with Kim.** I used the Sample family (Alex, Sam, Robin: drop offs, pick ups, work, dinners) with the clock held at Sunday 3:30 pm. I added Heavy week for overlaps. Russell's real board was never opened.

**Screenshots.** All are in `/private/tmp/claude-501/v11-builds/walk-shots/planner/`. Each screen below lists its file names.

**Left out.** Everything already being fixed tonight: the drag feel and toast stacking, the goals and to-dos list, and the polish list.

**One thing that runs under several screens.** The kit hides the board's own chrome (the date card, the corner, the tray) and puts back its own pieces. Three things lived only in that chrome and never came back:
- Undo and Redo (the corner);
- the desk zoom with Fit (the tray);
- Find a free day (the date card).

They are below as separate findings, but the cause is the same.

---

## 1. The first Planner view after the setup

**Screen.** The last setup step, Open my week, lands on the week with Getting started open. A note then rises over it: "Your plan for the week is here", with See the plan.
- Checked at 1440 by 900 and 1024 by 1366.
- Shots: 03-setup-plan.png, 04-new-planner-week-1440.png, 05-new-showme-block.png.

**What they're thinking (Jordan).**
- "Here's my week. I can't read one block on it."
- "A list on the right says six things to try, and now a gold box sits on top of it about a plan. Which do I do first?"
- "The gold box covers the bottom of the list."
- "I set up Thursday in the setup (a walk, tacos). I'd like to see Thursday."
- "I tapped Show me and got a third note, plus a toast about kinds of day."

**Improvements.**
1. **One teacher at a time.**
   - Hold "Your plan for the week is here" until Getting started is closed or done.
   - Never set a note over an open side panel.
   - Hold the "See every kind of Wednesday" toast while a coach card is up.
   - Why: "Three things are talking to me at once."
   - UI, S. Files: variants/corners11/variant.js (`notePlanned`, the plan note), board/src/app.js (`movesPanel`, `coach`).
2. **Fold Getting started to its next item on the desk, as the phone already does.**
   - Show one card: "Next: Put a block on a day", with Show me and See all 6.
   - The week gets the window back. Today the panel takes 380 px, and the week prints at about a third of its size.
   - Why: "The list took half my screen."
   - UI, M. Files: board/src/app.js (`movesPanel`, `layoutInsets`), variants/corners11/variant.css.
3. **Land on tomorrow's day with Block library out, not on the week.**
   - The tries from the setup sit there to be seen, and the first move on the list is right beside it.
   - Why: "Show me the day I set up."
   - UI, S. Files: variants/kit/kit.js (`K.start` forces the week on a first visit), board/src/app.js (`finishSetup`).

## 2. The date card: arrows, Today, and the seven days

**Screen.** The chip at the top middle in Day, Week, Month, and Year: Earlier, the date, Later, then Today when you're away. In Day view it also holds the kind of day and the seven day cells.
- Checked at all five sizes.
- Shots: 90-arrow-then-today.png, 121-week-arrow-shift.png, 31-day-props.png, 56-duo-open-day.png.

**What they're thinking (Russell).**
- "The lake trip is two weeks out. Next, next... and I'm back on this week?"
- "The arrow moved when Today appeared. My second tap hit Today."
- "On the iPad these are small to hit with Kim leaning in."
- "Tuesday has a clash somewhere. Nothing in the week's seven days tells me which day."

**Improvements.**
1. **Arrows that never move.**
   - Keep Earlier and Later at fixed places around a title of fixed width.
   - Put Today outside the pair (left of Earlier, or a small chip under the card) so it can't push them.
   - Measured on the week: Later sits at x 789 on this week. On next week it jumps to x 757, and Today now covers x 782 to 844, so a second tap in the same place goes back to today. The day view does the same (834 to 777).
   - Why: "I pressed next twice and it took me back."
   - UI, S. Files: variants/kit/kit.js (`K.dateControl`), variants/corners11/variant.css (`.k-date`).
2. **44 px targets on touch.**
   - On a coarse pointer, these are all still 38 px tall: the arrows, the date, the zoom switch (Now to List), and the bottom bar (Add, To-dos, Block library).
   - Raise them to 44 under `(pointer: coarse)`.
   - Why (Kim, on the iPad): "I keep tapping next to it."
   - UI, S. Files: variants/corners11/css/touch.css, variants/corners11/variant.css, polish.css.
3. **A mark under a day cell that needs a look.**
   - Use one gold dot under a day with an overlap or an undecided dinner, the color already used for an open question.
   - Stepping through the week, Russell sees where to stop.
   - Why: "Which day has the problem?"
   - UI, S. Files: board/src/app.js (`renderPills`), variants/corners11/variant.css.

## 3. Kind of day: the dropdown and saving a kind

**Screen.** Day view: "Your usual Thursday" with its list, a kind picked, Save this Thursday as a kind, and the saved kind on later days.
- Checked at 1440 by 900 and 951 by 669.
- Shots: 15-kind-dropdown.png, 16-kind-focus-applied.png, 19-save-kind.png, 20-save-kind-noname.png, 94-dropdown-with-own-kind.png, 95-jordan-saturday.png, 92-duo-open-kinds-menu.png.

**What they're thinking (Jordan, then Russell).**
- "Focus sounds right for Thursday. 'A focus Thursday.' What did it put where? There's no Undo."
- "Now I have two Walks."
- "Save this Thursday lists the second Walk and won't let me leave it out."
- "I didn't type a name, so it's 'Thursday on my own'. The menu says 'Thursday on my own Thursday', and on Saturday it offers me 'Thursday on my own'."
- (Russell, on the open Duo) "The bottom of the list is under the screen."

**Improvements.**
1. **Every kind's toast says what it did, with Undo.**
   - Example: "Focus Thursday: Deep work 9 to 11 am, Deep work 12:30 to 2 pm, Walk at 5 pm." with Undo.
   - Today only Your usual, Blank slate, and Take it easy carry Undo. Focus, Creative, Workout, Rest, Keep in touch, and saved kinds say one line with none.
   - Copy, S. Files: board/src/app.js (`applyRecipe`).
2. **The list fits the screen.**
   - On the open Duo (951 by 669) the list runs from y 176 to y 803, 134 px below the screen, and it can't scroll. Take it easy and Save this Monday as a kind can't be reached.
   - Cap the list at the room under the date card and let it scroll.
   - UI, S. Files: variants/corners11/css/duo.css or variant.css (`#kinds-row`).
3. **Saving a kind: name first, rows you can leave out, and a full-size button.**
   - Focus the name box with a suggestion built from the contents ("Workout and deep work").
   - Give each row a check, on by default.
   - Make Save this kind of day 44 px tall (it's 167 by 34).
   - Never save a blank name as "Thursday on my own".
   - Show a saved kind by its name alone, never name plus weekday.
   - Leave a weekday-named kind out of the chips on other weekdays.
   - Copy and UI, S. Files: board/src/app.js (`savePresetPanel`, `renderKinds`), variants/corners11/variant.js (`drawKindChips`, `usedKinds`).
4. **Remove the grid button beside the dropdown.**
   - It's a 38 px icon with no word; only its tooltip says "See every kind of Thursday".
   - The list's first row (See them all on the desk) and the K key already do the same.
   - UI, S, a removal. Files: board/src/app.js (`renderKinds`, `.kinds-allbtn`).

## 4. Every kind laid out on the desk

**Screen.** See them all on the desk (or K): a card for each kind, drawn as that day would be.
- Checked at 1440 by 900 on Jordan's Thursday and the sample's Saturday.
- Shots: 17-kinds-spread-1440.png, 18-kinds-usual-armed.png, 18b-kinds-usual-armed-card.png, 73-sat24-kinds.png.

**What they're thinking (Russell, picking Saturday with Kim).**
- "Every Saturday side by side. This is the best way to choose."
- "What are the yellow bars on Rest? The cards don't say. I want to know Rest means a nap at 1."
- "The lines are cut off: 'A slow walk, a nap, reading, and w...'."
- "I tapped Your usual and only then it said it would take off Workout and Walk."
- "Done is white, like it's selected."

**Improvements.**
1. **Each card names what it adds, in words.**
   - Under the kind's line, at 12 to 13 px: "Adds: Nap 1 pm, Reading 2:30 pm, Wind down 9:30 pm".
   - The line wraps to two lines instead of ending in an ellipsis. The bars stay as the picture.
   - Why: "I can't compare kinds by colored bars."
   - UI, M. Files: board/src/scene.js (`kindTexture`), board/src/app.js (the cards' specs).
2. **Say what a card takes off before the first tap.**
   - "Takes off Workout and Walk" is printed on the card from the start, and the second tap still confirms.
   - Today the warning appears only after a tap, so the first tap feels like a mistake.
   - UI, S. Files: board/src/app.js (`kindLoses` for every card when the cards open), board/src/scene.js (`kindTexture`).
3. **Done as a quiet button, not white.**
   - White fill means selected everywhere, and Done is an action.
   - Make it charcoal with white words like its neighbor, Save this Saturday as a kind.
   - UI, S. Files: variants/corners11/variant.css (`.c-spreaddone`).

## 5. Zoom: the switch, the desk zoom, Month, and Year

**Screen.** Now, Day, Week, Month, Year, and List at the top right; pinch or Control and scroll to zoom the desk; the month and year boards.
- Checked at 1440 by 900 and 1024 by 1366.
- Shots: 114-zoomed-in-week.png, 115-after-tap-week.png, 21-month-1440.png, 71-sample-month.png, 22-year-1440.png, 124-sample-year.png.

**What they're thinking.**
- (Russell, iPad) "I pinched in to read Tuesday. How do I get back? Tapping Week again does nothing."
- (Jordan) "Every day in the month says '5 h to yourself'. What's different about any of them?"
- (Russell) "I tapped the 24th in the month and got the week, not the 24th."
- (Russell) "The year lists the lake weekend on October, in type I can't read."

**Improvements.**
1. **A way back to fit, in the Planner too.**
   - When the desk is zoomed, show the Fit the week chip (today it shows only in the reset).
   - Make a tap on the zoom you're already on fit the desk.
   - The minus, 100%, and plus control lives in the tray, which V11 hides. Today the 0 key is the only way back on a Mac, and a pinch out on an iPad. Tested: zoomed to 2.6, tapped Week, still 2.6.
   - UI, S. Files: variants/corners11/css/frame.css (`.c-fitchip` rule), variants/kit/kit.js (`K.zoom`, the same zoom calls `SR.deskZoom(0)`).
2. **Month cells say what's different about each day.**
   - First the day's own blocks and events ("Swim lessons", "Dentist 3:30").
   - Then a dinner that's decided.
   - Hours to yourself only when they differ from that weekday's usual.
   - Upstream: the month was set to show one number, time to yourself (`SR_starYours`). For a new board that's thirty cells saying the same thing.
   - UI, M. Files: board/src/scene.js (`monthTexture`), board/src/app.js (`M.dayCard`, `SR_starYours`).
3. **Tap a day in the month to open that day.**
   - The hover says "Tap to open the week", but the person tapped one day.
   - The week tab on the week board already opens its day. Make Month match.
   - UI, S. Files: board/src/app.js (`tapped`, card case). Russell to decide.
4. **Year cards print their events at 12 px.**
   - Fewer lines and "and 2 more". Today "Oct 19, Dentist" prints at about 7 px at 1440 by 900.
   - UI, S. Files: board/src/scene.js (year cards in `monthTexture`).

## 6. The day board

**Screen.** Day view in the Planner: the header plank, three lanes, blocks, open time.
- Checked at 1440 by 900, 1024 by 1366, and 951 by 669, on Jordan's board, the sample, and Heavy week.
- Shots: 31-day-props.png, 86-sat17-day-alone.png, 111-heavy-tuesday.png, 118-sample-sat-day.png, 119-one-click-open.png, 11-block-picked.png, 59-ipad-day.png.

**What they're thinking.**
- (Russell) "Tuesday says 'Pick up Mila overlaps Socc...'. Overlaps what, and can I fix it from here?"
- (Russell) "Two red blocks with a car on them. Which is drop off and which is pick up?"
- (Jordan) "The open stretches look like bare wood. I didn't know I could tap them."
- (Jordan) "I picked Workout. Its tools and a hover note both showed, over the day's header."
- (Russell, iPad upright) "The day sits low with an empty desk above it."

**Improvements.**
1. **The overlap in the header opens a fix.**
   - Tap "Pick up Mila overlaps Soccer practice" to get a small panel with both blocks and the moves that fit, each with Undo: Sam has it, Move practice, Keep both.
   - When the header is tight, say the time ("Overlap at 5:30 pm") rather than cutting a name.
   - Why: "Tell me the clash and let me fix it where I see it."
   - Feature, M. Files: board/src/scene.js (`dayHeaderTexture`), board/src/app.js (`tapped` on the header, a new panel).
2. **Distinct marks when names step out.**
   - Under 12 px, Drop off and Pick up both become the same car.
   - Give each a mark of its own, or keep its first word ("Drop", "Pick") at 12 px.
   - UI, S. Files: board/src/data.js (block icons), board/src/icon-paths.js, board/src/scene.js (`faceTex`).
3. **Open time says it can be tapped.**
   - On hover, show a chip ("2.5 h open · Tap to add something") and the pointer cursor. Today there's no chip and the arrow cursor.
   - While Add at 1 pm is open, a dashed ghost sits at 1 pm on the board.
   - UI, S. Files: board/src/app.js (the hover handler, `slotPanel`), board/src/scene.js (ghost).
4. **A picked block shows its tools and no hover note.**
   - Both show today, and the note covers the header's facts.
   - UI, S. Files: board/src/app.js (the hover handler around the `pick` check).
5. **The tall day board on an upright iPad.**
   - The day fills about a third of the screen today.
   - This is V11-ON-SCREEN item 57, not built; it waits on Block library learning to sit under a tall board.
   - UI, L. Files: board/src/app.js (`renderBoard`, `kitSpec`), board/src/scene.js (`setDayShape`).

## 7. The week board

**Screen.** Week view: seven rows, day tabs, the hour ruler.
- Checked at 1440 by 900, 951 by 669, and 1024 by 1366, on the sample at Sunday 3:30 pm, next week, and Heavy week.
- Shots: 63-sample-week-sun.png, 64-sample-next-week.png, 64b-next-week-closeup.png, 93b-week-closeup-2x.png, 110-heavy-week.png, 113-datenight-moved.png, 66-sam-has-it.png, 57-duo-open-week.png, 80-ipad-week-sample.png.

**What they're thinking (Russell and Kim).**
- "This is the view we plan from, and most of it I can't read: Drop off, Pick up, even the hours along the top."
- "There are little squiggles between blocks. They turn out to be '1 h open'."
- "Heavy week has three overlaps, and the week shows none of them."
- "I gave Kim Tuesday's pickup and it disappeared. Now it looks like nobody's getting Robin."
- "Dragging date night from Friday to Saturday felt great, and the toast said so with Undo."

**Improvements.**
1. **The week prints nothing under 12 px, like the day board.**
   - Names that can't print at 12 become the block's mark, times step out, gap labels show only where they read, and the ruler's hours print at 12.
   - Measured at 1440 by 900: Drop off and Pick up about 5 px, block times about 8 px, "1 h open" about 5 px.
   - UI, M. Files: board/src/scene.js (`printWatch` for week bricks, `faceTex`, `setDayGaps`, the week ruler).
2. **A hand-off stays on the board.**
   - Sam has it writes `gone: true`, so the week shows a gap.
   - Leave a quiet dashed outline in its place, "Sam: Pick up Robin". Tapping it takes the pickup back. The toast carries Undo.
   - Why: "Kim and I both need to see who has it."
   - Upstream: the model treats "someone else has it" the same as "gone".
   - Feature, M. Files: board/src/model.js (`resolveDay` for edits with `by`), board/src/scene.js (`dressBlock`, drawn like `freeTex`), board/src/app.js (`blockAction` 'kim', `tplPanel`).
3. **Overlaps show on the week.**
   - Put a gold line on the day tab ("Overlap 5:30 pm") of each day with a clash. Tapping it opens that day with the overlap's panel.
   - Today they show only in the day's header and the list.
   - UI, S. Files: board/src/scene.js (tab texture), board/src/app.js.
4. **The day tab's hover says what a tap does.**
   - "Tap to open this day". Today it says "Tap to pick up this day", and a tap opens the day.
   - Copy, S. Files: board/src/app.js (hover, `hit.kind === 'tab'`).

## 8. Block library (the rack)

**Screen.** Block library beside the day (the default), below the day, and beside the week.
- Checked at 1440 by 900, 951 by 669, and 1024 by 1366.
- Shots: 05-new-showme-block.png, 07-new-day-library-1440.png, 07b-library-closeup.png, 08-library-hover.png, 46-block-made.png, 103-below-day-library.png, 123-library-idle-away.png, 68-week-library-1440.png, 58-duo-open-week-library.png.

**What they're thinking.**
- (Jordan) "The coach says Block library sits beside the day. It doesn't. Where is it?"
- (Jordan) "Found it. The names are tiny; I point at each one to read it."
- (Jordan) "Errand sits alone on a row under Home and meals, next to Keep in touch. Which group is it in?"
- (Jordan) "My Guitar practice went to 'Made by you', and Open time is under 'Your own'. Aren't those the same?"
- (Russell) "Kim and I talked it over for a minute and the library slid away."

**Improvements.**
1. **Show me opens the library before pointing at it.**
   - The coach "Block library sits beside the day" plays while the library is away; it starts every visit away.
   - Open it first (`kitAway(false)`) and ring it. Or ring the Block library button: "Tap Block library, then drag a block onto the day."
   - Copy and UI, S. Files: board/src/app.js (`showMove` 'place'), variants/corners11/variant.js (`kitAway`, `blockLibrary`).
2. **Names you can read without pointing.**
   - Beside the day at 1440 by 900 the pieces print their names at about 7 px. Below the day is the same.
   - Make the pieces bigger: four to a row, names at 12 to 13 px.
   - Lead with the groups the setup leaned toward and the person's own blocks, with the rest under More blocks.
   - Keep a group on one row (Errand).
   - UI, M to L. Files: board/src/app.js (`packKit`, `kitSpec`, `kitLead`), board/src/scene.js (`setBench`, `faceTex` for `piece`). Russell to decide.
3. **One group for your own.**
   - Today "Your own" holds Open time and Make a block, and "Made by you" holds what you made.
   - Make one group, Made by you: your blocks, then Open time, then Make a block last.
   - UI, S. Files: board/src/app.js (`packKit`).
4. **It stays out while you're on the day.**
   - Don't put it away after a minute idle.
   - Put it away when you leave the day, open something that needs the room, or close it.
   - Two people talking it over count as "using it".
   - Upstream: it goes away because the rack and the day fight for room. Bigger, fewer pieces (2) shrink that fight.
   - Behavior, S. Files: variants/corners11/variant.js (the idle timer). Russell to decide.
5. **On the open Duo, the rack sits under the week, not beside it.**
   - Beside the week it takes a third of the inner screen, and both print smaller than they read.
   - UI, S. Files: board/src/app.js (`kitSpec`, `arrange` by window shape).

## 9. The bottom bar, the To-dos stacks, and laying a stack out

**Screen.** Add, To-dos, Block library, and This week's plan at the bottom right. The stack strip (Next 7 days, Inbox, Home, Bills...). A stack laid out on the bench.
- Checked at 1440 by 900 and 951 by 669.
- Shots: 27-todos-new.png, 28-todos-home-empty.png, 28b-stackbar-nohover.png, 28c-stackbar-hover.png, 76-sample-todos-bench.png, 77-this-week-todos.png, 78-step-dropped.png, 78b-bench-after-drop.png, 58-duo-open-week-library.png.

**What they're thinking.**
- (Jordan) "I picked Home. When I point at it, the word disappears."
- (Jordan) "Home is empty, and it still laid out a big empty board: 'Nothing open here.'"
- (Russell) "Dragging Pay online onto Tuesday worked, and the bench closed the gap."
- (Russell, open Duo) "The bar is a plus, a flag, and a box. Which one is To-dos?"

**Improvements.**
1. **The picked pill keeps its white on hover.**
   - With Home picked (white fill, dark words), pointing at it swaps the fill for the dark hover and the dark words vanish.
   - Cause: polish.css's `.k .c-stack:hover` loads after `.k .c-stack.on` with the same weight.
   - UI, S. Files: variants/corners11/polish.css.
2. **An empty stack offers to add instead of laying out an empty bench.**
   - The strip says "Home has nothing open", with "Add a to-do to Home" beside it. No bench comes out.
   - UI and copy, S. Files: board/src/app.js (bench spec for an empty stack), variants/corners11/variant.js (`drawStackBar`).
3. **Words on the bar at the open Duo's width.**
   - At 951 wide the bar drops to marks only, beside the written "This week's plan".
   - Keep "Add", "To-dos", and "Block library" in words, and let This week's plan step into the menu at that width.
   - UI, S. Files: variants/corners11/css/duo.css, variants/corners11/variant.js (`onScreen`).
4. **This week's plan looks like the pills beside it, not an underlined web link.**
   - UI, S. Files: variants/corners11/polish.css (`.c-rchip.plan`).

## 10. Block tools and the block panel

**Screen.** Tap a block for its tools, then More for its panel. A locked block's panel. A workout's mat.
- Checked at 1440 by 900 and 390 by 844.
- Shots: 11-block-picked.png, 12-block-panel.png, 13-work-picked.png, 14-work-panel.png, 65-pickup-picked.png, 66-sam-has-it.png, 96-swim-panel.png, 122-locked-panel.png, 97-iphone-after-resize.png.

**What they're thinking.**
- (Russell) "Wednesday's drop off is locked, and Kim's doing it this week. The gold button says Unlock. What I want is Sam has it."
- (Russell) "Sam has it worked, but no Undo, and the block is gone."
- (Jordan) "I tapped More on Swim lessons and got a whole workout board with push-ups."
- (Jordan) "Work says '9 am to noon, 3 h' at the top and '8 h' in Length. Which is it?"
- (Jordan) "Swim lessons are every Saturday. Nothing here makes it every week."

**Improvements.**
1. **Lead a locked family block with the hand-off.**
   - "Sam has it this day" first and gold. Unlock this Wednesday and Unlock every Wednesday sit quieter below.
   - Say Locked once, with the tag. Today it says it three times: the tag, the line "Locked. Other blocks never push it.", and the field label.
   - Copy and UI, S. Files: board/src/app.js (`tplPanel`, the order in `drawTools`).
2. **Undo on every change from the tools.**
   - Sam has it, Lock, and Unlock each say a toast with no Undo.
   - Copy, S. Files: board/src/app.js (`blockAction`).
3. **The routine mat only for real workouts.**
   - Any name containing run, walk, swim, train, lift, bike, or gym opens the exercise mat.
   - Tested: Brunch with Sam, Errand run, Drive to the train, and Swim lessons all match.
   - Match whole words and the Move group's own blocks. Open the panel beside the board first, with Plan a routine to open the mat.
   - Upstream: the mat guesses from the name because a block carries no "move" fact.
   - UI, S. Files: variants/corners11/variant.js (`isMove`, `checkDetail`).
4. **Every Saturday from a placed block's panel.**
   - Add "Make it every Saturday", which adds it to the usual Saturday, with Undo.
   - Add Kind of time chips, so a family thing can turn red.
   - Today the panel has Name, Starts, Length, the week's seven days, and Take it off the day.
   - Feature, M. Files: board/src/app.js (`addPanel`), board/src/model.js (adding to a template).
5. **One length in a routine's panel.**
   - The preview shows the piece you tapped (9 am to noon, 3 h), while Length steps the whole block (8 h).
   - Preview the whole block ("Work, 9 am to 5 pm, 8 h, Lunch inside") so the numbers agree.
   - Copy and UI, S. Files: board/src/app.js (`tplPanel`).

## 11. The place panel

**Screen.** Opened by tapping a piece on the bench or the rack, or by Adjust in quick add.
- Checked at 1440 by 900 and 386 by 580.
- Shots: 25-place-panel.png, 70-place-panel-walk.png, 100-duo-folded-place.png.

**What they're thinking.**
- (Russell) "I tapped Walk on the bench and it starts me on Sunday at 9:15 am. I'm planning Saturday."
- (Russell) "'Add on Oct 18 at 9:15 am'. Is that Sunday?"
- (Russell, folded Duo) "The board shrank to a stamp. Day, the strip, and the steppers are behind the button; I scroll in a small window."

**Improvements.**
1. **Start on the day you're working on.**
   - From the week: the row you last touched, or the first day after today with room.
   - From the day view: that day.
   - Today a piece from the week's bench starts on the week's first day.
   - UI, S. Files: board/src/app.js (`placePanel` default date).
2. **Name the day the same way everywhere.**
   - "Add on Sunday, Oct 18 at 9:15 am".
   - Today the week's panel says "Oct 18" and this week's says "Saturday", and the drop toasts mix the two the same way.
   - Copy, S. Files: board/src/app.js (`placePanel`, `toWords`).
3. **On the folded Duo, the board takes the top half.**
   - Leave out the day strip there; the board shows where it lands, and the days and the steppers set it.
   - The button stays pinned.
   - UI, M. Files: variants/corners11/css/duo.css, board/src/app.js (`placePanel` for short windows).

## 12. Quick add

**Screen.** Add (N) in the Planner, and the round Add on the phone's desk.
- Checked at 1440 by 900, 390 by 844, and 386 by 580.
- Shots: 23-quick-add-empty.png, 24-quick-add-typed.png, 53-iphone-add-typed.png, 54-iphone-add-workout.png, 99-duo-folded-quickadd.png, 120-quick-every.png.

**What they're thinking.**
- (Russell) "'Swim lessons every Saturday 10am'. It made 'Swim lessons every', once."
- (Russell, phone) "'Workout Sat 9am' moves Breakfast. The second choice runs off the screen, and Adjust is gone."
- (Jordan) "'Guitar practice 8pm' used my own block, 1 h. Nice."
- (Russell) "'Dentist next Tuesday 3:30pm' landed right, and it told me it takes 30 minutes from Work."

**Improvements.**
1. **The buttons fit a phone.**
   - At 390 and 386 wide the three buttons sit in one row. "At 10:45 am, nothing moves" is cut, and Adjust is off the screen (x 450 to 518 in a 390 window).
   - Stack them: the gold one full width, the quiet one full width under it, then Adjust.
   - UI, S. Files: board/src/style.css (`.quick` actions), variants/corners11/css/duo.css or touch.css.
2. **Understand "every".**
   - "Swim lessons every Saturday 10am" offers two buttons: Add to every Saturday (the usual Saturday, with Undo) and Only this Saturday.
   - "every" never lands in the name.
   - Feature, M. Files: board/src/model.js (`parseQuick`), board/src/app.js (`renderQuick`).
3. **Pick the kind of time before adding.**
   - A new name lands as Yours (gold), but swim lessons for Robin are Family.
   - Show a row of kind of time chips under the preview, the first one chosen.
   - UI, S. Files: board/src/app.js (`renderQuick`, `quickPlan`).

## 13. Make a block

**Screen.** Block library, Make a block: the New block panel.
- Checked at 1440 by 900.
- Shots: 43-make-block.png, 44b-make-block-scrolled.png, 45-make-block-bottom.png, 46-block-made.png.

**What they're thinking (Jordan).**
- "I typed Guitar practice. Where's the button? I had to scroll the panel to find it."
- "It says it's in Block library. I wanted it on Thursday evening."
- "If I made it by mistake, there's no Undo."

**Improvements.**
1. **Pin Add to Block library at the panel's foot, as the place panel pins its Add.**
   - At 1440 by 900 it sits below the panel's fold (the panel scrolls 108 px).
   - UI, S. Files: board/src/app.js (`newBlockPanel`), variants/corners11/variant.css.
2. **After making it, offer to place it.**
   - The toast: "Guitar practice is in Block library.", with Put it on Thursday (the day in view) and Undo.
   - Feature, S. Files: board/src/app.js (`newBlockPanel`).
3. **Lengths as tiles.**
   - 15 min, 30 min, 1 h, 2 h as tiles, with the stepper beside for anything else.
   - Today the stepper starts at 1 h for everything.
   - UI, S. Files: board/src/app.js (`blockForm`).

## 14. Open time: Add at 1 pm

**Screen.** Tap an open stretch on the day board: "Add at 1 pm", a list of blocks in groups, Due soon, then Or name it.
- Checked at 1440 by 900 and 390 by 844.
- Shots: 88-slot-panel.png, 119-one-click-open.png, 98-iphone-slot-tap.png.

**What they're thinking.**
- (Jordan) "A long list of chips. I scroll to find Due soon and Or name it."
- (Russell, phone) "The first tap zoomed in. The second tap opened this."
- (Jordan) "It says 1 pm; nothing on the board marks 1 pm."

**Improvements.**
1. **Lead with what fits.**
   - The stretch's length ("2.5 h open"), the name box, then four to six blocks that fit (the setup's focus and recent picks), then Due soon.
   - Every block sits behind All blocks.
   - UI, M. Files: board/src/app.js (`slotPanel`).
2. **A ghost at 1 pm while the panel is open**, the length of the first suggestion (see 6.3).
   - UI, S. Files: board/src/scene.js, board/src/app.js.
3. **On the phone's desk, one tap on open time opens Add at that time and zooms with it.**
   - UI, S. Files: board/src/app.js (`tapped`, the phone's focus).

## 15. Undo and Redo

**Screen.** There is no screen for them. They exist only in toasts (6.3 s when they carry Undo) and as Command Z and Shift Command Z. The corner that held Undo and Redo is hidden (variants/kit/kit.css), and the bar and the menu don't have them.
- Checked at 1440 by 900 and 1024 by 1366.
- Shots: 26-after-add.png, 113-datenight-moved.png, 16-kind-focus-applied.png, 66-sam-has-it.png.

**What they're thinking (Russell and Kim, on the iPad).**
- "Kim said wait, put that back. The toast was gone and there's nothing to tap."
- "On the Mac I press Command Z. On the iPad there's no Undo anywhere."
- "Some changes never offered Undo at all."

**Improvements.**
1. **An Undo you can find after the toast.**
   - A quiet Undo pill in the bottom bar while there's something to undo, naming what it takes back ("Undo: Date night moved").
   - It turns into Redo after an Undo.
   - Upstream: the kit hid the board's corner and never put this back.
   - UI, M. Files: variants/corners11/variant.js (the bottom bar), variants/kit/kit.css (`#corner`), board/src/app.js (`undoWords`, `redoStack`). Russell to decide.
2. **Undo in every change's toast.**
   - The ones without today: kinds other than three (3.1), Sam has it, Lock, Unlock (10.2), a saved kind, and a new block (13.2).
   - Copy, S. Files: board/src/app.js.
3. **On touch, a toast with Undo waits longer** (10 s) and holds while a finger rests on it.
   - UI, S. Files: board/src/app.js (`toast`).

## 16. Find a free day

**Screen.** None in V11. Its button lives in the board's own date card, which the kit hides, so V11 can't reach it.

**What they're thinking (Russell).**
- "We want a free Saturday for the lake. The old desk had Find a free day. Where did it go?"
- "I don't want to read six months of cells to find one."

**Improvements.**
1. **Bring it back on the Month and Year date chip, under the month's name.**
   - It opens the day and says how open it is.
   - UI, S. Files: variants/kit/kit.js (`K.dateControl`), board/src/app.js (`findFreeDay`).
2. **Find a free evening too**, for time together: the first evening with three open hours and nothing locked, offered from the same chip.
   - Feature, M. Files: board/src/app.js (`findFreeDay`). Russell to decide.
3. **Say what it looked for, and offer the next one.**
   - "Saturday, Nov 7: 9 h open. Find the next one".
   - Copy, S. Files: board/src/app.js.

## 17. The week as a list

**Screen.** List (L): every day's blocks as rows, open stretches as "Add something", with Print this week and Copy as text at the top. In Day view it shows the one day.
- Checked at 1440 by 900.
- Shots: 30-list-1440.png, 75-sample-list.png, 116-list-then-day.png.

**What they're thinking (Kim, who likes lists).**
- "This is the week I can read: every block, every open hour."
- "Print and Copy come first. I came to read."
- "Each day starts with 'Up at 6:30 am'. Where's the kind of day, the dinner, the overlap?"
- "It covers the board, so Russell can't drag while I read."

**Improvements.**
1. **Day headings carry the day's facts**, the same ones as the board's header.
   - Example: "Saturday, October 24 · Your usual · 1 to-do due · Dinner open · 7.5 h open".
   - Copy and UI, S. Files: board/src/app.js (`renderAgenda`).
2. **Print this week and Copy as text move to the end of the list.**
   - UI, S. Files: board/src/app.js (`renderAgenda`).
3. **On a window 1180 wide or more, the list sits beside the board** (as Settings does) instead of over it.
   - UI, M. Files: board/src/app.js (`layoutInsets`), variants/corners11/variant.css. Russell to decide.

## 18. The desk things: the notepad, the lamp, the clock

**Screen.** The things around the mat, each tappable.
- Checked at 1440 by 900.
- Shots: 35-notepad-tap.png, 104-lamp-tapped.png, 33-clock-tap.png, 34-after-timer-close.png, 31-day-props.png.

**What they're thinking (Jordan).**
- "The notepad says nothing is due. I tapped it and got an empty board."
- "I tapped the lamp. Nothing happened, because it's midday."
- "The clock is a timer? The whole desk jumped and zoomed when it opened, and the clock's note stayed on top."

**Improvements.**
1. **The notepad with nothing due opens New to-do**, and its note says "Nothing due · Tap to add a to-do". No empty bench.
   - UI, S. Files: board/src/app.js (`openDueSoon`, the notepad's hover).
2. **The lamp says what it did.**
   - A toast: "Lamp off. It warms the desk after dark.", with Turn it on.
   - UI and copy, S. Files: board/src/app.js (`toggleLamp`).
3. **Opening the Pomodoro leaves the desk where it is**, and hides the clock's hover note.
   - Today the camera reframes and cuts the day off at the left.
   - UI, S. Files: variants/corners11/variant.js (`openTimer`, its edge), board/src/app.js (`layoutInsets`).

## 19. Settings, The desk: themes and layouts

**Screen.** Settings, The desk: eight theme cards, twelve layout cards, light, and Block library's place.
- Checked at 1440 by 900, where the desk shows live beside Settings, and at 1024 by 1366.
- Shots: 38-settings-desk.png, 39-theme-night.png, 40-layout-kitchen.png, 41-night-kitchen-day.png, 117-ipad-settings-desk.png.

**What they're thinking.**
- (Jordan) "The themes look like their names. The layouts all look the same: a mat and some dots."
- (Jordan) "The words under Kitchen table said what's on it only after I picked it."
- (Russell, iPad) "Settings covers the desk. I see half the board change."
- (Russell) "Autumn, Winter, Spring. No Summer?"

**Improvements.**
1. **Draw each layout card with its things**: small silhouettes of the plant, lamp, or cup, or their names under each card. Then they differ before you pick.
   - UI, M. Files: board/src/app.js (`layoutCard`), board/src/kit/themes.js.
2. **On tablets, keep the whole board in view while choosing.**
   - Under 1180 wide, The desk page opens as a bottom sheet (or a 420 px panel) and the board reframes above or beside it.
   - UI, M. Files: board/src/app.js (`layoutInsets`, the `drawer-live` branch), variants/corners11/variant.css.
3. **Summer, or no seasons.** Add a Summer layout, or name the seasonal ones so none seems missing.
   - Feature, S. Files: board/src/kit/themes.js (`LAYOUTS`, `LAYOUT_ORDER`). Russell to decide.

## 20. One day on the phone's desk (iPhone and the folded Duo)

**Screen.** Open the desk from the phone's list: the week bar, one tall day, the round Add, a picked block's tools along the bottom.
- Checked at 390 by 844 and 386 by 580.
- Shots: 51-iphone-desk.png, 55-duo-folded-desk.png, 82-iphone-sample-desk.png, 83-iphone-block-tapped.png, 97-iphone-after-resize.png, 98-iphone-slot-tap.png.

**What they're thinking (Russell on the couch, folded Duo).**
- "One day at a time with the week up top. Good for checking."
- "To add a walk I tap the empty afternoon and it zooms. I tap again and the add sheet comes up."
- "'★ 6 h · Open'. Open what?"
- "Swim lessons picked: two rows of tools take a third of the screen."

**Improvements.**
1. **The header's short words keep their noun**: "Dinner open", not "Open". The other facts keep a word too.
   - Copy, S. Files: board/src/scene.js (`dayHeaderTexture`, `bits[].short`).
2. **One tap on open time opens Add at that time** (the same as 14.3).
   - UI, S. Files: board/src/app.js (`tapped`).
3. **The tools fit one row.**
   - Earlier, Later, a length stepper ("−  45 min  +"), and More. Take off moves into the block's panel, as on the desk.
   - Today they wrap to two rows, and Take off sits alone on the second.
   - UI, S. Files: board/src/app.js (`drawTools` on the phone's day), variants/corners11/css/duo.css.

---

## The five that would matter most

1. **An Undo you can reach after the toast on every device, and Undo in every change's toast** (15.1, 15.2). Russell and Kim on an iPad have no way back once the toast leaves, and several changes never offered one. M.
2. **The week and Block library print at 12 px or more** (7.1, 8.2).
   - Today the views you plan from print names at 5 to 8 px at 1440 by 900.
   - The day board already has the rule; the week and the rack need it.
   - M to L.
3. **Date card arrows that stay put** (2.1). Today's Today button slides under the next tap and sends you back to this week while you page forward to plan. S.
4. **The Duo fits.**
   - Quick add's buttons stack on a phone (12.1): today Adjust is off the folded Duo's screen.
   - The kinds list scrolls on the open Duo (3.2).
   - Every control is 44 px on touch (2.2).
   - S.
5. **A hand-off stays visible.** Sam has it leads a locked family block's panel, leaves "Sam: Pick up Robin" on the board, and has Undo (10.1, 7.2, 10.2). It's the move Russell and Kim make every Sunday, and today it erases the evidence. M.

Next in line: Show me opens Block library before pointing at it (8.1), quick add understands "every" (12.2), the routine mat only for real workouts (10.3), Fit in the Planner (5.1), and Find a free day back on the month (16.1).

## For Russell to decide

- **Block library putting itself away.** V11 puts it away after a minute idle and at each visit. I'd keep it out while you're on the day (8.4).
- **An Undo pill in the bottom bar.** One more control there, instead of toasts and keys only (15.1).
- **Fewer, bigger pieces in Block library**, with More blocks for the rest, against every piece at once at a small size (8.2).
- **Tapping a day in Month opens that day, or its week** (5.3).
- **Sam has it as an outline on the board**, and whether Sam's own view shows it as Sam's (7.2).
- **Find a free day: back on Month and Year, and widened to a free evening** for time together (16.1, 16.2).
- **The first Planner view after the setup: tomorrow's day with Block library, or the week** (1.3).
- **A Summer layout, or no seasonal layouts** (19.3).
- **The list beside the board on a wide window** (17.3).
