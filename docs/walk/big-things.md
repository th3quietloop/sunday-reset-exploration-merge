# Big things: to-dos and goals, walked as the people who use them

V11 as it's live (commit aca8a91), served from /private/tmp/claude-501/v11-builds/walk-aca8a91 on port 4493 and driven in a headless Chrome at each device's size and pixel density (not in WebKit). It was late on Oct 14, so most shots read about 11 pm; mornings and steps in progress were held with `__reset.at` on made up boards.

Who walked it:
- **The law student** (Russell's older brother): ADHD, the bar exam on Feb 24. "Clean my room" feels huge. He wants the app to break things down and to keep him from falling behind.
- **The analyst**: CFA Level I in 10 weeks (Dec 23), a full-time job, studying evenings and weekends.

Boards: a fresh origin (127.0.0.1: the welcome, then Look around first, the sample family's week with Alex, Sam, and Robin), and on localhost the Dev boards Light week and 30 overdue to-dos. Goals were made through New goal (the bar exam, CFA Level I, and "Pass the MPRE", which the library doesn't know); one bar goal was started eight days back on the sample board so the morning check-in, finished sessions, and a week of history were real. Smart breakdowns: the static server answers 404 at /api/smart, so on this build the feature hides itself, as it will live until the key is added. To see its screens, a local stand-in answered the page's own requests with canned steps and parts; nothing went to Claude.

Sizes: iPhone 390 by 844 (touch, 3x), Duo folded 386 by 580, Duo open 951 by 669, iPad 1024 by 1366, Mac 1440 by 900. Screenshots are in /private/tmp/claude-501/v11-builds/walk-shots/big-things/; the numbers below are their file names.

Not listed again: everything on tonight's list (drag feel; the goals and to-dos items from appointments after a plan through the Moving goal stepper; the polish items). Where a finding sits next to one of those, it says so.

---

## First: the to-do sheet and the goal screens, for someone with ADHD

Russell, on his iPhone, looking at a to-do called "Study for exam": "this looks so clunky and it needs to deliver a better ux and a better organized ui, looks like an engineer made it, it is not adhd friendly at all."

I rebuilt that sheet on the iPhone (150 to 157): "Study for exam", due Friday, Break it down, Add 6 steps.

### What the sheet asks of him today
- **Three screens and 62 things to tap.** With six steps the sheet is 1,952 px of content in a 644 px window.
- **No first move.** Before the first step: the name box, the due date, a length stepper (or "6 steps · 1 h 55 min"), a "No time yet" row that looks like a button and isn't one, Give it a time and Mark done side by side at the same weight, then Spread it out: four day chips, a minus and plus for a day's most, four time-of-day chips, a Done by date, a month grid, a line in salmon, and two or three fix buttons.
- **Every step row is a form.** About 120 px tall, six things each: a checkbox, the to-do's blue book tile again, the name as an open text box, an x, "No time yet", and a minus, length, plus. Six rows print "No time yet" six times and the same book six times.
- **The gold moves.** It sits on Give it a time when the sheet opens, jumps to Add 6 steps at the foot of Break it down (below the fold on the phone, 670 px below it on the folded Duo, 138), then disappears when Spread it out can't place anything.
- **A dead end.** At 11:36 pm Wednesday, Spread it out said "This needs 5 more days than are left before Friday" and offered "Push the date to Nov 5" and "Take off Go over what you missed". No Spread button at all. The exam is Friday (154).
- **The wrong suggestion.** A to-do due in two days gets "This sounds like a goal with a date. Make it a goal." (150).
- **Steps that look like help and aren't.** "Review the first topics", "Review the rest": the template doesn't know what's on the exam.
- **It leaks.** The sheet's last 36 px fade to see-through (`.side.more`), so the list behind it prints through the steppers ("Laundry", "Give it a time", 125b, 63b). Its content is 288 px wide in a 374 px sheet, because the close button's column runs the full height.
- **The goal screens do the same at a larger size.** The goal panel opens on "Behind by 130.5 h" a minute after the plan starts (24), then 12 to 16 session rows, nine parts with checkboxes, five plan buttons, and eight colors. New goal is five pages and about 25 controls before anything is placed.

What he's thinking: "I opened it to study. It handed me a settings page. I don't know what to press first, so I close it."

### Seven rules a strong product designer would hold these screens to
1. **One next thing.** Each sheet opens on one sentence that says where things stand and one gold button that names the next move and its object ("Put them on my week", "Start", "Move it there"). Nothing else on the sheet is gold or as big.
2. **Decide, then ask.** The app proposes the steps, the days, and the times, and asks for one yes. The choices wait behind a quiet Change. Fewer decisions per screen beat more options.
3. **Time is a fact you can tap, not a control.** Lengths and due dates are words ("15 min", "Due Friday"). A tap opens the control for that one thing.
4. **Small enough to start, and a way to start.** The first step is 10 minutes or less, wears "Start here", and when its time comes it has a Start button. Starting is the hard part for him; that's where the gold belongs.
5. **A row is one line.** Name, time, check. Editing happens when you tap a row, one row at a time.
6. **Never a dead end.** When something can't fit, say what's in the way by name and offer a trade that keeps the date. Never offer to move an exam.
7. **No pile, no blame.** A miss moves forward with one line and Undo. "Behind" means time that went by and can't be made up; a plan that's too small is "short". No "40 days ago".

### The to-do sheet, rebuilt (phone first; the desk panel is the same, wider)
Top to bottom:
1. **Head.** The to-do's mark, small (24 px), beside its name (22, Gabarito; tap to rename). Under it one line in 14: "Due Friday · 6 steps, about 2 h". "Due Friday" opens the date picker; the length opens a small length sheet. No boxes, no stepper.
2. **The next-thing card**, always first: one sentence, one gold button, chosen by where the to-do stands.

   | Where it stands | The sentence | Gold | Quiet |
   |---|---|---|---|
   | No steps, 30 min or less | "About 30 min." | Give it a time | Break it down |
   | No steps, bigger, or a job the library knows | "About 2 h. Smaller steps make it easier to start." | Break it down | Give it one time |
   | Steps, none timed | "Thu 7:30 pm: 3 steps, 50 min. Fri 6:30 am: 3 steps, 1 h 5 min. Done before Friday." | Put them on my week | Change days |
   | Next step has a time, later | "Next: Gather your notes, Thu 7:30 pm, 5 min." | none | Show it |
   | A step's time is now | "Now: Gather your notes, 5 min." | Start | Mark it done |
   | A step's time went by | "Gather your notes didn't happen Thursday. Friday 6:30 am works, before it's due." | Move it there | Pick another time |
   | Nothing fits before it's due | "Thursday and Friday are full before Friday. In the way: Work, Evening with Sam." | Use 1 h of Thursday evening | See other ways |
   | Every step done | "All 6 steps done." | Mark it done | none |

   Every gold change ends in a toast with Undo, as today. Start runs a short timer on the step's own block and hands it to the band (decision 1 at the end).
3. **Steps**, as plain rows (next part), with Add a step as the last row.
4. **More**, folded to one row: Give it one time, Mark it done, Make it a goal (only when it's due three weeks or more out, or has no date and names an exam or a long project), Repeats, List, Kind of time, and Delete to-do last under a rule.

What leaves the sheet: the "No time yet" status row (the card says it), the Give it a time and Mark done pair, the open Spread form and its month grid, the goal box in the middle of the steps, and each row's tile, x, and stepper. The sheet's foot is opaque, and its content runs the sheet's full width.
Files: board/src/app.js (taskPanelFeel, spreadSection, spreadGrid, goalLine, bdSection), variants/corners11/css/breakdown.css and todos.css, board/src/style.css (`.side.more`), variants/corners11/css/touch.css. Size L.

### The step row, rebuilt
- **One line, 52 px tall**, full width: a round check on the left (44 px target), the name in 16 (two lines at most), and on the right in 13 its time when it has one ("Thu 7:30 pm") or its length when it doesn't ("15 min"). Nothing else.
- **Tap the name** and the row opens in place, one row at a time: the name to type over, length as four chips (5, 15, 30, 60 min; white is the picked one), Give it a time, and Remove step, quiet and last. Removing gives a toast with Undo.
- **The first open step** wears "Start here" in green over its name; when its time is now, a Start button takes the time's place.
- **Done steps** strike through in the faint color (a real color, never alpha) and stay where they are while the sheet is open.
- **Order:** long press and drag on a phone; on the desk the grip shows on hover. Dragging a row onto the board carries the to-do's mark, so the row doesn't need a tile of its own.
- Six steps take about 312 px instead of about 708: the card and every step fit on one iPhone screen.

### Break it down, rebuilt
- A page of its own inside the sheet: a back arrow, "Steps for Study for exam", the steps as the same plain rows with their lengths as words, and "About 2 h in all. The first one takes 5 min." under them.
- One gold button, pinned at the sheet's foot: Use these 6 steps. Above it, two quiet buttons: Make them smaller, Make them bigger. A step you renamed or added stays when the size changes.
- When the library doesn't know the job, no template: "No ready steps for this one. What's the first thing you'd do?" with the box focused, and Ask Claude for steps under it when Smart breakdowns is set up.
- Make it a goal moves to More.
Files: board/src/app.js (breakDown, bdDraft, bdSection), board/src/model.js (breakdown says when it fell back to the template), variants/corners11/css/breakdown.css. Size M.

### Spread it out, rebuilt
- Its answer leads, as days, not a month grid: "Thu Oct 15, 7:30 pm: Gather your notes, 5 min; List the topics, 10 min; Review the first topics, 30 min." One gold: Put them on my week. Change days opens today's form (which days, a day's most, time of day, done by).
- A to-do with no due date spreads from tomorrow over as many days as it takes and says where it ends ("Done by Wed Oct 21"). It never invents a date and then calls it short.
- When nothing fits: name what's in the way and offer trades that keep the date: an hour of a soft block such as Evening with Sam (with a yes), earlier in the day, fewer steps. Never Push the date for a to-do that names an exam, a test, or an interview, and never past the due day without saying so first.
Files: board/src/app.js (spreadSection, spreadChoices, spreadDefaults, doSpread), board/src/model.js (spreadPlan, quietWindows). Size M.

### The goal panel, rebuilt
- **Head:** the name, "Feb 24, in 19 weeks", one bar, "17.5 of 400 h".
- **The next-thing card:** "Next: Civil Procedure, tomorrow 7:45 am, 45 min" with Show it; when it's time, Start (gold); after a miss, "Tuesday's 45 min moved to Thursday and Friday." with Undo.
- **How it stands, one calm line**, short and behind kept apart: a plan that holds less than its parts need says "Your days hold about 270 of 400 h by Feb 24." and a quiet Make it fit opens the choices. "Behind" shows only when time went by and the days ahead can't take it.
- **This week** as the reset's 7-day strip (Sun 3 h to Sat 3 h, finished days checked, tap a day to see it on the board), not 12 to 16 rows.
- **Change the plan**, one folded row: rhythm, date, parts, name, pause, color, remove.
Files: board/src/app.js (goalPanel, goalBar, standWords, goalFixes), variants/corners11/css/goals.css. Size M.

### New goal, rebuilt
- **Three pages, not five.** (1) What and by when: the name with the exam suggestions, the date with its chips, and an exam's parts as one line ("9 parts, about 400 h. Change them later."). (2) Your time: weekday hours and weekend hours, starting at what the goal needs within reason (here 3 h weekdays, 5 h weekends), when in the day, and one live line: "Holds about 380 of 400 h by Feb 24." (3) Your plan: the first week strip and one gold Start the plan. Longest session and the parts list move to the goal panel.
- **When the first week is empty**, the gold button is the fix ("Use any time of day"), Start the plan turns quiet, and nothing calls an empty plan "planned".
Files: board/src/app.js (openGoalFlow, newGoalPanel and the flow's steps), variants/corners11/css/goals.css. Size M.

### Show only on tap
- A to-do's length and due date (words until tapped).
- Spread it out's form (which days, a day's most, time of day, done by).
- A step's name box, length, time, and Remove step.
- Make them smaller and Make them bigger (inside Break it down only).
- Make it a goal (in More, and only when it fits the to-do).
- Repeats, List, Kind of time, Delete to-do.
- A goal's choices when it's short (Make it fit), its parts, rhythm, longest session, color, pause, and Remove the goal.

---

## Screen by screen

### 1. To-dos: the button, the panel, and Find a to-do
**Screen**: the bar's To-dos lays Next 7 days out on the desk with a strip of lists; All to-dos opens the panel; its box is "Add or find a to-do". Checked at Mac 1440 by 900 and Duo open 951 by 669. Shots 02, 03, 04, 05, 86, 30b, 111, 112.

**What they're thinking**:
- (Law student) "I tapped To-dos to see my list. I got tabs and tiles on a second board. My list is behind All to-dos at the far end."
- "Book a cleaning for Robin is in Next 7 days and again in Inbox. Laundry is in Next 7 days and again in Home. It looks like twice as much."
- "I typed 'laundry' to find it and pressed Enter. Now I have two Laundry to-dos."
- "There's Add in the bar, New to-do in the strip, and Add in the panel. Which one?"

**Improvements**:
1. **Enter on a name that's already there opens it.** When the typed words match a to-do exactly, the line under the box says "Enter opens Laundry. Add makes a new one." and Enter opens its sheet. Why: "I wanted to find Laundry and made a copy." Copy and UI. S. variants/corners11/variant.js (todoAdder).
2. **Each to-do shows once in the panel.** The lists under Next 7 days leave out what's already above, with a quiet "and 2 in Next 7 days" line, so the panel's length is the real count. Why: "Seeing the same things twice makes the pile look twice as big." UI. M. variants/corners11/variant.js (openTodos sections).
3. **The To-dos button opens the panel**, with Next 7 days on top and Lay out where it is now. Drop New to-do from the strip; the panel's box adds. This is V11-TODOS decision 5; for him the list is the point, the tiles are a second step. Why: "I asked for my to-dos and got a board." UI. M. variants/corners11/variant.js (openTodos, the strip), board/src/app.js (the bar's To-dos).
4. **One line under the box at a time.** Typing a new name shows both "Enter adds 'Clean my room' to Inbox." and "Nothing called that. Enter adds it." (04), and "Its pieces are on the desk. Drag one onto a day." sits there whenever Next 7 days is laid out. Keep the first; drop the other two while typing. Copy. S. variants/corners11/variant.js.

### 2. The Inbox
**Screen**: the Inbox section of the To-dos panel, after adding from the panel, quick Add, a pasted list, and the phone. Mac. Shots 05, 87.

**What they're thinking**:
- (Law student) "Six things in Inbox. Three have no date. Nothing tells me what Inbox is for or what to do with them."
- "Clean my room says 'Thu, 7:30 am'. That's the first of seven steps; it looks like a 15 minute thing on Thursday."
- "The x on every row sits right beside the calendar. I'll hit it by mistake."

**Improvements**:
1. **Say what it's for, and offer a way through it.** Under the heading: "New to-dos land here." and a Sort them button that shows one to-do at a time with three answers: Give it a day, Put it in a list, Break it down. Each answer is a change with a toast and Undo. Why: "I don't know what to do with these." Feature. M. variants/corners11/variant.js (openTodos), board/src/app.js.
2. **A spread to-do says it's spread.** "7 steps, Thu to Wed" instead of the first step's "Thu, 7:30 am" (also on This week's plan, 55). Copy. S. variants/corners11/variant.js (todoRow meta), board/src/app.js (taskMeta).
3. **The row's x moves into the row's own sheet** (Delete to-do, under More); the row keeps the check and the calendar mark. Why: "Remove next to Give it a time is a trap for my thumb." UI. S. variants/corners11/variant.js (todoRow).

### 3. A pile of late to-dos (the 30 overdue board)
**Screen**: Dev, 30 overdue to-dos: the To-dos panel, the bench, and the phone's Next 7 days card. Mac and iPhone. Shots 130, 131, 132.

**What they're thinking**:
- (Law student, after a bad month) "Thirty rows of 'Was due Sep 4 · Time passed'. The heading says Next 7 days. These were due in September."
- "On my phone: 'Due Sep 4, 40 days ago'. I don't need the count. I close it."
- "I need to know which three still matter, not the whole pile at once."

**Improvements**:
1. **Late ones fold into one calm card.** To-dos more than a week past their day leave the list for one card at the top: "24 to-dos are past their day. Sort them, a few at a time." with Sort them. Each comes up alone with three answers: Do it this week (picks a quiet day), Keep it (a new due date), Let it go (put away; Find still finds it). One toast with Undo per answer. This is the "bend, don't break" promise from PRODUCT-STRATEGY.md for to-dos, which only has it for steps today. Feature. M. variants/corners11/variant.js, board/src/app.js, board/src/model.js (archive and due changes).
2. **Next 7 days means the next seven days.** Late ones sit in their own folded section, "Past their day", under it; the heading stops covering a September date. The count on the To-dos button can stay as it is (V11-TODOS's one window). Copy and UI. S. variants/corners11/variant.js, board/src/app.js (the phone card).
3. **No day counts, no "Time passed" in salmon on every row.** "Was due Sep 4" is enough; the color is the quiet one. Copy. S. board/src/app.js (the phone's td-task line), variants/corners11/variant.js (todoRow).

### 4. A to-do's sheet (phone) and panel (desk)
**Screen**: opened from the To-dos panel, the phone's toast, or This week's plan. iPhone, Duo folded, Mac. Shots 06, 11, 14, 28, 138, 150 to 157.

**What they're thinking**:
- (Law student) "Due date, a stepper, 'No time yet', two big buttons, a box saying it sounds like a goal, Break it down, then a form with nine choices and a calendar. Where do I start?"
- "I scroll three screens to see my own steps."
- "Every step has its own minus and plus. I don't care if it's 25 or 30 minutes."
- "Why is the list under the sheet showing through at the bottom?"

**Improvements** (the rebuild in the first section, ranked, plus what can ship before it):
1. **The next-thing card**, one sentence and one gold button by state (the table above). Remove the "No time yet" row and the equal pair of buttons. UI. L. board/src/app.js (taskPanelFeel).
2. **Plain step rows** (one line, tap to open). UI. M. board/src/app.js (taskPanelFeel steps), variants/corners11/css/breakdown.css.
3. **More, folded**, holding Give it one time, Make it a goal, Details, and Delete. UI. S. board/src/app.js.
4. **Fix the leak now.** The phone sheet's foot is opaque (no see-through fade over the page), and its content runs the full width; the close button sits in the head row only. UI. S. board/src/style.css (`.side.more`), variants/corners11/css/touch.css.
5. **One mark per words, wherever they're typed.** "Clean my room" typed in the To-dos panel got an inbox mark, typed in the phone's Add line a broom, and a pasted line gets a check, which reads as done on the board before anything is (120 shows a to-do with that mark mid step). Use the quick Add guess everywhere; fall back to a plain dot, never the check. UI. S. board/src/app.js (pastedList), variants/corners11/variant.js (todoAdder).

### 5. Break it down (Smaller steps, Bigger steps, adding your own)
**Screen**: a to-do's sheet, Break it down. Mac, iPhone, Duo folded. Shots 07, 08, 09, 09b, 10b, 85, 125, 151, 152, 138.

**What they're thinking**:
- (Law student) "Clean my room: pick up the floor, laundry, the bed, the desk, dust, vacuum. That's what I needed." (07)
- "I renamed one step and tapped Bigger steps to compare. My change was gone." (Own steps survive; edited names don't.)
- "'Outline Civ Pro' got 'Write down what done looks like, Do the first part, Finish it and put things away'. That's not a breakdown." (85)
- "Change the sheets went to the end, after Vacuum. I can't move it."

**Improvements**:
1. **Edits survive a size change.** A renamed step keeps its name, matched by position, when Smaller or Bigger redraws; added ones stay too. Why: "I fixed a step and it vanished." UI. S. board/src/app.js (bdDraft, bdSection).
2. **No template for a job the library doesn't know.** Say "No ready steps for this one. What's the first thing you'd do?" with the add box focused, and Ask Claude for steps under it when it's set up. Upstream: Model.breakdown returns a template as if it were a match; it should say it fell back. Copy and feature. S. board/src/model.js (breakdown), board/src/app.js (bdFor, bdSection).
3. **Use these steps stays in view.** Pin the gold button to the sheet's foot on the phone and the folded Duo (it was 670 px below the fold, 138). UI. S. variants/corners11/css/breakdown.css, duo.css.
4. **Lengths as words, a row opens to change one** (the step row rebuild). The minus and plus on every suggested step go. UI. M. board/src/app.js (bdSection).
5. **Reorder by drag** in the suggestion and in the list (long press on a phone). Why: "I'd change the sheets before I vacuum." UI. M. board/src/app.js.

### 6. Smarter steps from Claude, the consent sheet, and Settings, Smart breakdowns
**Screen**: Break it down, Smarter steps from Claude; New goal 3, Suggest parts with Claude; Settings, This device, Smart breakdowns. With the local stand-in. Mac and iPhone. Shots 93, 94, 95, 96, 133, 134, 135, 97.

**What they're thinking**:
- (Law student) "The sheet is clear: only this to-do's words go, and Anthropic reads them. OK. Turn on."
- "Claude's Civ Pro steps were what I'd do: jurisdiction and venue, pleadings, discovery. Then I tapped Smaller steps and they turned back into 'Write down what done looks like'. Where did Claude's go?"
- "'The step size'? What step size?"
- (Live, without the key) "There's no button at all. I'd never know it could do better than the template."

**Improvements**:
1. **Once Claude answered, Smaller and Bigger ask Claude for that size** (one tap; the person already said yes), instead of swapping back to the built-in template and dropping Claude's steps. Why: "Smaller steps threw away the good ones." Feature. S. board/src/app.js (bdSection's size switch), variants/corners11/variant.js (SR_ai.breakdown with size).
2. **"What's sent: The words of this to-do, and the step size."** becomes "The words of this to-do, and whether you asked for smaller or bigger steps." Copy. S. variants/corners11/variant.js (aiSheet).
3. **Name the button for what it does and put it where it's needed.** "Smarter steps from Claude" is a 36 px quiet button below the list; make it "Ask Claude for steps", 44 px, and when the library fell back to its template, lead with it (screen 5, item 2). UI. S. board/src/app.js.
4. **The goal parts version says what it wrote.** After "Claude suggested 5 parts. Change any of them." (135), the line under the title still read like a common estimate; keep Claude's note but mark it as Claude's ("Claude's estimate: about 400 h."), so a guess doesn't read as a fact. Copy. S. board/src/app.js (the parts step).

### 7. Spread it out
**Screen**: a to-do with steps and no times; the section opens in its sheet. Mac and iPhone. Shots 11, 12, 12b, 13, 14, 153, 154.

**What they're thinking**:
- (Law student) "After I added steps, a form opened: which days, how much, when, done by, a calendar of '15m' chips. For cleaning my room."
- "It picked 'Done by Tue' when I never gave a date, then said it needs one more day than is left before Tuesday."
- "For Study for exam due Friday it said push it to Nov 5. There's no button to place anything."
- "The chips say 15m. Which step? What time? I only found out after I pressed Spread."

**Improvements**:
1. **Lead with the answer.** Days with times and step names, one gold Put them on my week, and Change days for the form. Upstream: the section is a form doing a suggestion's job; the engine already makes the plan. UI. M. board/src/app.js (spreadSection, spreadGrid).
2. **No invented date.** With no due date, spread from tomorrow and say where it ends; never "This needs one more day than is left before Tuesday" for a day the person didn't pick. Copy and feature. S. board/src/app.js (spreadDefaults), board/src/model.js (spreadPlan).
3. **Never a dead end, never move an exam.** When nothing fits, name what's in the way ("In the way: Work, Evening with Sam") and offer a trade that keeps the date: an hour of a soft block with a yes, or earlier in the day. Leave Push the date out for exams, tests, and interviews. There's always one button that places something. Upstream: quiet time counts only Yours and Open soft blocks (model quietBlock). Feature. M. board/src/model.js (spreadPlan, quietWindows), board/src/app.js (spreadChoices).
4. **Fix buttons read as sentences.** "Take off Go over what you missed", "Take off Send it": "Leave out the last step (Go over what you missed)". Tonight's goal copy work covers the goal's buttons; this is the to-do's. Copy. S. board/src/app.js (spreadSection).

### 8. Find new times
**Screen**: "Send the quarterly report" (due tomorrow), its first step's 10 am time went by; Find new times is the gold button on its sheet. Mac. Shots 28, 84.

**What they're thinking**:
- (Analyst) "One step's time went by. I tapped Find new times. Now none of my three steps has a time."
- "The toast says it needs one more day than is left before tomorrow; the panel says three more days. Which is it?"
- "I'm worse off than before I tapped."

**Improvements**:
1. **Show the choices before moving anything.** When the missed step can't fit before the due day, Find new times opens the choices and leaves the board as it was until one is picked; today it takes the step off the board first. Upstream: reflowTask takes off what doesn't fit; use its preview. Feature. S. board/src/app.js (findNewTimes).
2. **One count, one sentence, the day's name.** The toast and the panel say the same number, and "before tomorrow" becomes "before Thursday". Copy. S. board/src/model.js (reflowTask message), board/src/app.js (reflowWords).
3. **Offer tonight.** The evening before the due day is a real choice when a soft block sits there ("Tonight at 8:30 pm, 45 min, from Evening with Sam. Use it?"), the same trade as Spread it out. Feature. M. board/src/model.js, board/src/app.js.

### 9. Didn't get to it (a step's panel) and the band during a step
**Screen**: a step block's panel after its time ("Pull the numbers", 10 am today); the band at 7:40 am inside a step and at 8:05 am after it (Light week board); the phone desk's tools on a session. Mac and iPhone. Shots 82, 83, 83b, 120, 121, 70.

**What they're thinking**:
- (Law student) "I didn't do it this morning. I tapped Didn't get to it and it moved to Saturday, after it's due Thursday. It told me after, not before." (83)
- "On my phone there's no hint at all; the 'where it goes' line is a hover."
- "In the band, while I'm doing a step, there's Didn't get to it and 15 more minutes. Where's Done?" (120)

**Improvements**:
1. **Say where it goes on the button, before the tap, on touch too.** "Move to Sat 12:45 pm" in place of a hover title. If that lands after the due day, the button reads "Pick a time before Thursday" and opens the place panel. (Tonight's fix covers a step being dropped; this is where it lands.) Copy and UI. S. board/src/app.js (didntGetTo preview, the block panel, the band).
2. **A step in progress gets Mark it done in the band**, which checks the step and keeps its time; it's missing until the step's time is over. Why: "I finished early; how do I say so?" UI. S. board/src/app.js (renderBand, the step state).
3. **The Starts and Length steppers overlap at 1440.** Starts' plus (1195 to 1235 px) sits over Length's minus (1224 to 1264 px) in the step panel and the session panel (83b, 27). Stack them, or narrow the steppers, when the side panel is under about 400 px wide (today `.side .row2:has(.stepper)` stacks only under a 420 px window). UI. S. board/src/style.css (row2).

### 10. Make it a goal
**Screen**: the line in a to-do's sheet, "This sounds like a goal with a date." with Make it a goal. Mac and iPhone. Shots 100, 150, 151.

**What they're thinking**:
- (Law student) "It says 'with a date', but this one has no date."
- "For Study for exam due Friday, a goal is the wrong tool. I have two days."
- "It sits between my steps and Break it down; I keep reading it."

**Improvements**:
1. **Show it only when it fits**: due three weeks or more out, or no date and the words name an exam or a long project. Upstream: Model.looksLikeGoal reads only the name; give it the due date. UI. S. board/src/model.js (looksLikeGoal), board/src/app.js (goalLine).
2. **New words**: "Weeks of work? A goal puts a little on each day until the date." with Make it a goal. Copy. S. board/src/app.js (goalLine).
3. **Move it into More**, so Break it down stays the first thing after the card. UI. S. board/src/app.js.

### 11. Pasting a list
**Screen**: a four line list pasted into quick Add (Mac), the phone's Add line, and the To-dos panel's box. Shots 29, 30, 30b, 122.

**What they're thinking**:
- (Law student) "I copied my study list from Notes. Quick Add made four to-dos: '4 to-dos in Inbox.' Which four? Where?"
- "On my phone it said the same, and I can't see any of them; the phone shows only what's due."
- "In the To-dos box, the place I'd paste a list, it turned into one to-do called '- Outline Civ Pro - Read Evidence hearsay - 50 MBE questions - Flashcards', due Friday."

**Improvements**:
1. **Paste works in every box that adds to-dos**: the To-dos panel's box, This week's plan's Add a to-do, and the reset's New to-do, the way quick Add and the phone's Add line do (pastedList). Feature. S. variants/corners11/variant.js (todoAdder), board/src/app.js (pastedList shared).
2. **Show what was made.** The toast names them ("Outline Civ Pro and 3 more are in Inbox", with Undo), and on the desk the To-dos panel opens at Inbox with them lit; on the phone they appear in the to-dos sheet from screen 25. Copy and UI. S. board/src/app.js (pastedList).
3. **Offer the next step for the batch**: under the new rows, Sort them (screen 2) to give each a day or a list in one pass. Feature. M. variants/corners11/variant.js.

### 12. Goals, the list
**Screen**: the corner menu (under the name), Goals. Mac and iPhone. Shots 16, 17, 62, 65.

**What they're thinking**:
- (Analyst) "Goals is the thing I came for, and it's in a menu under my name between People and Focus on one thing. On my phone it's in Settings."
- "The empty page is one line and a button. Fine, but I don't know what a plan will look like."
- "Each goal row says 'Behind by 113.5 h' in bold. Every time I open the list."

**Improvements**:
1. **A front door.** Once there's a goal, Goals sits on the bar beside To-dos on the desk (and it's in the tray bar catalog before that); on the phone the goal card moves up (screen 24). Why: "I shouldn't have to dig for the main thing." UI. M. variants/corners11/variant.js (the corner bar), board/src/app.js (barCatalog).
2. **Rows say the week and the next session, not the deficit**: "This week: 12.5 h, 6.5 h done. Next: tomorrow 7:45 am." Behind lives inside the goal. Copy. S. board/src/app.js (goalsPanel).
3. **The empty page shows what a plan looks like**: one example card ("Pass the bar exam by Feb 24: about 3 h a day, one subject at a time, a quiet week at the end"), clearly an example, above New goal. Copy and UI. S. board/src/app.js (goalsPanel), variants/corners11/css/goals.css.

### 13. New goal, 1 of 5: What's the goal?
**Screen**: Goals, New goal. Mac, iPhone, Duo folded. Shots 18, 18b, 66, 73, 98.

**What they're thinking**:
- (Law student) "Pass the bar exam is right there. Tap. '9 parts, about 400 h.' It knows."
- (Analyst) "CFA Level I is there too. Good."
- (MPRE) "I typed Pass the MPRE and got nothing back here; on page 3 the parts were 'Get started, Keep going, Finish'."

**Improvements**:
1. **Ask the date on this page** ("What's the goal, and by when?"): one page fewer, and the next question can use both. UI. M. board/src/app.js (the goal flow).
2. **Say it here when the library doesn't know the goal**: "No ready parts for this one. You'll set them in a moment." (with "or ask Claude" when it's set up), instead of a silent template on page 3. Copy. S. board/src/app.js (newGoalPanel).
3. **Offer the to-do that sounds like a goal first**: with "Study for the bar exam" in Inbox, it leads the suggestions. Feature. S. board/src/app.js.

### 14. New goal, 2 of 5: By when?
**Screen**: Mac, Duo folded. Shots 19, 19b, 74.

**What they're thinking**:
- (Analyst) "In 4 weeks, 3 months, 6 months. Mine is 10 weeks; I used the date box. 'Dec 23, in 10 weeks.' Good."
- "Start: today, unless I start later. I'll leave it; why is it a field?"
- "Typing a date with the keyboard put in year 0002 and said 'Pick a day after today'." (Typing 02242027 into the field in Chrome.)

**Improvements**:
1. **Fold Start behind "Start later"**, a quiet link that opens the field; almost everyone starts today. UI. S. board/src/app.js (the date step).
2. **Say what the date means right away**: under the date, "300 h by Dec 23 is about 30 h a week." so page 4 isn't a surprise. Copy. S. board/src/app.js.
3. **A typed year that can't be right says so**: "Year 0002? Try Feb 24, 2027." instead of "Pick a day after today." Copy. S. board/src/app.js (dateInput).

### 15. New goal, 3 of 5: What are the parts?
**Screen**: Mac, Duo folded. Shots 20, 75, 99, 135.

**What they're thinking**:
- (Law student) "Nine subjects at 35 h each and essay practice at 95. I can't judge these numbers. I'll trust them."
- "'Criminal Law and Pr': the names are cut off."
- (MPRE) "'Get started 3, Keep going 10, Finish 3'. Sixteen hours of nothing."

**Improvements**:
1. **Move parts after the plan.** Page 1 says "9 parts, about 400 h. Change them later."; the goal panel holds the list. Nine hour boxes is a decision asked too early. UI. M. board/src/app.js (the goal flow).
2. **If the page stays**: names wrap instead of cutting, the hour box narrows to its number, and each part's remove is a quiet x on the row (today it's a 44 px tile beside every row). UI. S. variants/corners11/css/goals.css.
3. **An unknown goal leads with the person's own first part** (an empty row, focused) and Ask Claude for parts when it's set up, not "Get started, Keep going, Finish". Copy and feature. S. board/src/app.js, board/src/data.js (GOAL_TEMPLATES other).

### 16. New goal, 4 of 5: How much time can you give it?
**Screen**: Mac, Duo folded. Shots 21, 21b, 76, 77.

**What they're thinking**:
- (Analyst) "It starts me at 1 h a day, and the line under says I need about 3 h 15 min a day. Why start me where it won't work?"
- "I work 9 to 5. Weekdays 1.5 h, weekends 4 h, evenings. Then Longest session. Six controls and some math."
- (Law student) "I can't tell if 'Evening' means after dinner or after 6."

**Improvements**:
1. **Start the steppers at what the goal needs, within reason**, and put the need on top: "Needs about 21 h a week. Start here, then turn it down if you must." Copy and UI. S. board/src/app.js (the rhythm step's defaults).
2. **One live line under the steppers**: "Holds about 270 of 400 h by Feb 24." (page 5's sentence, here, as they change it). Copy. S. board/src/app.js.
3. **Times of day say their hours** ("Evening, 6 pm on"), and Longest session moves to the goal panel's Change the plan. UI and copy. S. board/src/app.js.

### 17. New goal, 5 of 5: Your plan
**Screen**: Mac, Duo folded. Shots 22, 23, 78, 78c, 79.

**What they're thinking**:
- (Analyst) "My rhythm finds no open time in the evenings, 300 h short. Start the plan is gold anyway. I pressed it: 'CFA Level I is planned. Behind by 300 h.' Planned? Nothing's on my week."
- (Law student) "271 h short. Longer days: 3 h a day. Now 130.5 h short, and the next fix is 5 h a day. Five hours after classes is not a plan."
- "Why are my evenings empty? It doesn't say."

**Improvements**:
1. **An empty first week makes the fix the gold button** ("Use any time of day"), Start the plan turns quiet, and the toast never says "planned" for a plan with nothing placed ("CFA Level I is saved. Nothing fits yet."). Copy and UI. S. board/src/app.js (the plan step, the start toast).
2. **Name what's in the way**: "Your evenings hold Evening with Sam every day." with "Use 1 h 30 min of it on weekdays" as a choice with a yes. Upstream: goals count only Yours and Open soft blocks as room. Feature. M. board/src/model.js (quietWindows), board/src/app.js (goalFixes). (Tonight's "weak fixes" work may cover the rest of the fix list; this is the missing reason.)
3. **The first week says when, not only how much**: tap a day cell to see "Thu: 7:45 am and 5:15 pm, 1 h 30 min". UI. S. board/src/app.js.

### 18. The goal panel
**Screen**: after Start the plan, from Goals, Look ahead, or a session's Open the goal. Mac, iPhone, iPad. Shots 24, 25, 25b, 46, 63, 90, 91, 92, 113.

**What they're thinking**:
- (Law student) "I started a minute ago and it says Behind by 130.5 h in bold. I haven't missed anything."
- "Twelve rows of Civil Procedure, nine checkboxes, five buttons, eight colors. The thing I do next is small, under NEXT."
- (Analyst) "Place this week's share. I pressed it. The same toast again; nothing on my week." (90, 91)

**Improvements**:
1. **Short is not behind.** Until a session is missed, the panel says "Your days hold about 270 of 400 h by Feb 24." and Make it fit; "Behind" only for time that went by. Round big numbers to whole hours over 20 h ("about 114 h", not "113.5 h"). (Tonight's goal copy work covers "11 h, 45 min"; this is the word and the size.) Copy. S. board/src/app.js (standWords, goalHrs, the start toast), board/src/model.js (planGoal message).
2. **The next-thing card first, the week as a 7-day strip**, Parts and the plan's buttons folded under Change the plan (the rebuild above). UI. M. board/src/app.js (goalPanel), variants/corners11/css/goals.css.
3. **Place this week's share does something or isn't there.** With nothing to place it repeats the toast; there it becomes the fix ("Use any time of day"). UI. S. board/src/app.js (goalPanel).
4. **The phone sheet uses its width and doesn't leak** (288 of 374 px today; the page shows through its foot, 63b). UI. S. board/src/style.css, variants/corners11/css/touch.css.

### 19. A session's panel
**Screen**: tap a session on the board, More. Mac; the phone desk's tools. Shots 26, 27, 70, 126, 127.

**What they're thinking**:
- (Law student) "Civil Procedure, Saturday 9:45, part of the bar exam, 0 of 35 h. I can move it. Skip this one is last. Fine."
- "Monday's session, which I already said happened this morning, offers Done again."
- "'Moved by hand, a session stays where you put it.' I didn't move it."

**Improvements**:
1. **One record of whether it happened.** After the check-in's Yes, the panel says "Done. You said so Tuesday morning." with Not done, not a fresh Done. (A follow-on to tonight's unconfirmed sessions fix.) UI. S. board/src/app.js (sessionPanel).
2. **The hint shows after a move only**: "You moved it, so it stays here." Copy. S. board/src/app.js (sessionPanel).
3. **Start when it's time**, the same next-thing button as the to-do sheet, and the steppers' overlap fixed (screen 9). UI. S. board/src/app.js, board/src/style.css.

### 20. The morning check-in (the desk's question strip and the phone's card)
**Screen**: Now with a goal session yesterday; the sample board at 11:02 pm on the desk, the folded Duo's Today. Shots 43, 44, 45, 71, 72.

**What they're thinking**:
- (Law student) "At 11 pm it asks about yesterday. I studied today; ask me about today."
- "I said Some of it, 45 min. It said 'Behind by 128 h. Add a day, make days a little longer, or move the date.' I told the truth and got a lecture." (45)
- "In the morning it asks what kind of Wednesday instead; I only saw the goal question at night."

**Improvements**:
1. **The answer says where the time went**: "45 min counted. The other 45 min is on Thursday and Friday." (the engine already returns where it spread), never the behind total. Copy. S. board/src/app.js (answerAsk), board/src/model.js (answerCheckIn message).
2. **From 8 pm, ask about today** ("Did today's 1 h 30 min on the bar exam happen?"); the morning asks about yesterday only if it wasn't answered. Feature. S. board/src/model.js (goalCheckIn), board/src/app.js (goalAsk).
3. **In the morning the goal question goes first.** It's one tap and it changes the day's plan; the kind of day waits (today the goal question shows only 11 am to 3 pm and after dinner, behind the other two). UI. S. board/src/app.js (renderMoment).
4. **44 px answers on the desk strip.** Yes is 47 by 38, No 43 by 38, the x 38 by 38. UI. S. variants/corners11/polish.css.

### 21. Look ahead's goal card (the reset's first step)
**Screen**: Sunday Reset, Look ahead, Further out. Mac. Shot 52.

**What they're thinking**:
- (Analyst) "The exam is under Further out, 'Goal · in 4 months', with 'Behind by 113.5 h'. The goal panel says 'in 19 weeks'."
- "This step is about what's coming. What's coming for the exam next week?"
- "I scrolled past holidays to find it."

**Improvements**:
1. **Say next week's share**: "Next week: 14 h, about 2 h a day." in place of the behind line. Copy. S. board/src/app.js (goalAheadCard).
2. **One way to say how far**: the goal's own "in 19 weeks" everywhere (aheadAway says "in 4 months"). Copy. S. board/src/app.js.
3. **A goal leads Look ahead** while it's in play, above the weeks, since it's the biggest date coming. UI. S. board/src/app.js (the Look ahead step).

### 22. The reset's Goals step
**Screen**: Sunday Reset, step 4. Mac and iPhone. Shots 53, 136.

**What they're thinking**:
- (Law student) "Seven days with hours, 14 h next week, about 2 h a day. That's clear."
- "Then 'Behind by 113.5 h' and two fixes. It turns a plan into a warning."
- "I can't change a day from here. I can only read it."

**Improvements**:
1. **Tap a day cell to see its sessions on the week beside it**, and move them there. UI. M. board/src/app.js (goalsStepBody), variants/corners11/variant.js.
2. **The behind line and fixes fold under Make it fit**, so the step reads as next week's plan. Copy and UI. S. board/src/app.js.
3. **A goal with nothing placed leads with its fix as its first button** (the step's gold stays on Next). UI. S. board/src/app.js.

### 23. This week's plan (its Goals card and its to-dos)
**Screen**: the menu, This week's plan. Mac. Shots 55, 89.

**What they're thinking**:
- (Analyst) "CFA Level I: Nothing this week yet. That's the most important line on this page and it's the quietest."
- (Law student) "Clean my room shows under Has a time as 'Thu, 7:30 am'. It's seven steps over a week."
- "The Goals card is a list; I can't do anything about the goal from here."

**Improvements**:
1. **A goal with nothing this week says why and what to do**, in the gold text of an open question: "CFA Level I: nothing fits this week. Open it to choose." Copy. S. variants/corners11/variant.js (openPlan's goals card).
2. **A spread to-do says it's spread**: "7 steps, Thu to Wed" (screen 2, item 2). Copy. S. variants/corners11/variant.js.
3. **Each goal row names the next session**: "Next: tomorrow 7:45 am". Copy. S. variants/corners11/variant.js, board/src/app.js (goalWeek).

### 24. Goals on the phone: the Today card and Settings
**Screen**: the phone's Today and Settings, Your week, Goals. iPhone and Duo folded. Shots 60, 61, 62, 63, 64, 65.

**What they're thinking**:
- (Law student) "The Goals card is under Groceries, near the backup note. I scrolled past it."
- "Open Goals opens a list with one goal in it; I tap again to see it."
- "Today's study isn't on the card. That's what I want to see when I open my phone."

**Improvements**:
1. **With a session today, the card moves up under the day and names it**: "Today: Civil Procedure, 7:45 am and 5:15 pm, 1 h 30 min", with Start when it's time. Otherwise it stays near the end. UI. M. board/src/app.js (renderToday's goal card).
2. **With one goal, Open the goal opens it** (skip the list of one). UI. S. board/src/app.js.
3. **The sheet uses its width and doesn't leak** (screen 18, item 4). UI. S.

### 25. To-dos on the phone (the Next 7 days card and the Add line)
**Screen**: the phone's Today. iPhone and Duo folded. Shots 60, 67, 68, 122, 123, 124, 132.

**What they're thinking**:
- (Law student) "I tapped Laundry's name to open it, and it marked it done. It's a weekly one, so it jumped to next week."
- "From my phone I can't see Inbox, can't open a to-do, can't break one down unless I catch the toast."
- "I added 'Clean my room' here and it vanished; it has no date, so the card never shows it."
- "The add toast says Break it down, but there's no Undo."

**Improvements**:
1. **The name opens the to-do's sheet; only the round check marks it done.** Today the whole label belongs to the checkbox. Why: "I tapped the name and it was done." UI. S. board/src/app.js (renderToday, the td-task row).
2. **See all to-dos on the phone.** A row at the end of Next 7 days opens the To-dos panel as a sheet: Find, Inbox, the lists. Feature. M. board/src/app.js, variants/corners11/variant.js (openTodos as a sheet).
3. **The add toast keeps Undo; Break it down moves to the new row.** A new to-do with no date shows at the end of the card ("New: Clean my room, no day yet") with Break it down and Give it a time until it has a day. Copy and UI. S. board/src/app.js (quickCommit's toast, renderToday).

---

## The five that matter most
1. **The to-do sheet rebuilt around one next thing** (the next-thing card, one-line step rows, everything else on tap). It's what Russell saw, and it's the screen the law student opens most. L. board/src/app.js, variants/corners11/css/breakdown.css.
2. **To-dos on the phone that work**: the name opens the sheet, the check marks it done, and All to-dos is one tap away. The phone is his device, and today it can't open, sort, or break down a to-do. M. board/src/app.js, variants/corners11/variant.js.
3. **Spread it out leads with its answer and never dead ends**: days as a list with one Put them on my week, no invented dates, what's in the way named, and no offer to move an exam. M. board/src/app.js, board/src/model.js.
4. **Short is not behind**: the goal panel, toasts, and the check-in's answer say where the time went and how much the days hold; "Behind" only for time that went by; nothing called "planned" with nothing placed. Small to build, and it's the difference between a plan that bends and a plan that scolds. S. board/src/app.js, board/src/model.js.
5. **A calm way through a pile**: late to-dos fold into Sort them (Do it this week, Keep it, Let it go), Next 7 days means the next seven days, and no day counts. M. variants/corners11/variant.js, board/src/app.js.

## For Russell to decide
1. **Start.** Should a step's or a session's gold button be Start, running a short timer on the block that the band takes over? The Pomodoro timer is already in the menu. For ADHD, starting is the hardest move; I recommend yes.
2. **Soft time with a yes.** May Spread it out and goals offer to take time from a soft block that isn't Yours or Open (Evening with Sam, a free evening), each time with a yes and Undo? Today they never do, so a full evening reads as "no open time" with no reason given.
3. **New goal in three pages**, with the parts edited after the plan.
4. **Sort them for late to-dos**: fold them in after a week past their day, or only once there are more than five?
5. **A new to-do's mark**: guess from the words everywhere (quick Add's guess), with a plain dot when nothing fits, and the check kept for done.
6. **The To-dos button**: the panel (recommended for him) or the desk's tiles (V11-TODOS decision 5).
7. **Where a goal's standing shows**: only inside the goal (recommended), or also on the Goals list, Look ahead, and This week's plan.
