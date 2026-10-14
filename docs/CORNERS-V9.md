# Corners V9

Russell, Oct 13: be thorough and Socratic; go through every edge case and every page with a scrutinizing eye; make sure everything is centered; give it a UI pass; check every line of copy. Then implement all of it. V8 stays live; V9 is `v/corners9`, https://sunday-reset-corners-v9.vercel.app. The asset pass (every icon and desk model) is in docs/ASSETS-V9.md.

## The questions, page by page

### The welcome
- **Is the rack centered?** Not quite. The rack and its bag were centered as a group, so the bar holding the letters sat 22 px right of the middle.
- **Is your name centered on the rack?** No. A four-letter name filled slots 1 to 4 of 9 and left five empty slots on the right.
- **Where do the letters land?** Out at the corners of the screen: one by the account chip, one on the board's top row. On a phone they went to the top and left the middle bare.
- **What else is asking for attention while you spell your name?** Everything else: the account chip says "Alex, Sample week" while the card asks your name, plus the zoom row, the bottom bar, and a gold "Set up this week".
- **Is "Open my week" true?** No. What opens is a made-up family's week.
- **Does the welcome lead anywhere?** No. Spelling your name ended on the sample, with no way from there to your own week.
- **Did the last card add anything?** It repeated the card before it ("Blocks move the same way").

### Week, Day, Month, Year, List
- **Day:** the letter rack covered the date card: the kind of day and the seven days.
- **To-dos:** opening the stacks put the stack strip and the rack in the same spot.
- **Settings and the list:** the rack showed through both.
- **Year:** "~15.5 h, usually, to yourself" read badly. The tilde is jargon, and the phrase was backwards.
- **List:** an open gap said "0.5 h open". People say 30 minutes.
- **In-between widths:** from 760 to 1140 px the rack was as big as on a laptop and pushed the board down.

### The account menu
- **Does it fit?** No. At 900 px tall it ran off the screen: 17 items.
- **Do its items do anything new?** Five didn't. Today, Calendar, To-dos, Block library, and The week as a list are each one tap away on the screen already.
- **Do its words match the screen?** No. It said "Today" where the zoom row says "Now".
- **"Sound is on" opened a settings page.** A label that reads like a switch shouldn't navigate.
- **The meal board:** it couldn't be reached from anywhere but the dinner step and a dinner's own mat.

### Settings
- **"The tray bar":** it offered a page and a row for a tray bar this version doesn't have.
- **"Sunday Reset, 7 steps":** the reset you run shows 5 or 6 numbered steps. The count included the recap.

### The Sunday Reset
- **Did the minutes add up?** No. The intro said "About 20 min", and its steps listed 3 + 3 + 4 + 5 + 2 = 17.
- **"6 to-dos due":** due when? The same screens said 6 (this week), 7 (in three weeks), and 4 (this week, no time yet), with no window named.
- **"2 nights without dinner":** this sounds like nobody eats. What it means is that dinner isn't picked yet.
- **"Dinners: And who cooks":** a fragment.
- **Look ahead and To-dos:** "Coming up" printed a trip as "[object Object]".
- **Your time** offered Deep work, Meeting, and Study. Those aren't time to yourself.
- **Spelling:** the board says "to do" and "to dos"; the corners say "to-do". Both showed up, in the steps, the recap, and the toasts.
- **The dinner step:** its heading said "Dinners that week", though it was this week.
- **The recap:** its title ("Here's your week") and its line ("Here's what you set up.") said the same thing.

### This week's plan
- **"Order", "Out":** the tags were half words.
- **The to-dos card:** it showed one to-do with a time and said nothing about the four due this week without one.
- **Redundant offer:** "Plan the rest of the week" was offered minutes after finishing the whole reset.
- **Alignment:** the title and its two buttons didn't line up.

### The meal board
- **What do you do here?** Nothing said, unless you'd found the drag.
- **Days that are over:** you could still drop breakfast on last Sunday.

### A block's own mat
- **The block, three times:** the mat's title, the big block on the mat, and the panel's own preview all showed it.
- **Two ways to close:** Done and the panel's ×.
- **The routine said the same thing twice:** "Drag exercises in" and "Drop exercises here, in order".
- **Exercises:** they could only be dragged.

## What V9 does

### The welcome
1. The rack's bar sits in the middle of the page, with the bag and the close button on either side.
2. Your name sits in the middle of the rack: four letters fill slots 3 to 6, not 1 to 4.
3. Letters land in a tidy, centered row under the rack, each a little turned. On a phone they land halfway between the rack and the card.
4. While you spell, the rest of the desk steps back: a dim over the board and corners, so the card, the rack, and the letters are what's there.
5. The last card: "That's how every block moves. Behind this is a sample week to practice on. Set up your own now, or later from your name, top left." It has two buttons: Set up my week, and Look around first.
6. Set up my week opens the setup with your name filled in, on the step after the name (`SR.openSetup`).

### The rack everywhere else
7. It hangs under the date chip, wherever that ends.
8. It shows only in Week, Month, and Year while nothing else wants the top middle. It steps aside for the Day view, the to-do strip, Settings, the list, To-dos, the reset, the mats, and any sheet.
9. Between 760 and 1140 px it's a size smaller.

### Pages
10. Year cards: "★ 15.5 h", then "to yourself, usually".
11. The list: "30 min open" instead of "0.5 h open".

### The account menu
12. It holds only what isn't on the screen. Plan: Meal board, Dinners and groceries, With Sam. On the desk: Focus on one thing, Pomodoro timer, the letter rack (with "Put the letter rack away" when it's out). Then How it works, Reading and sound, and Dev mode. It went from 17 items to 9, and fits the window.

### Settings
13. No tray bar page or row (`SR_noTrayBar`).
14. The Sunday Reset counts its steps without the recap ("6 steps").

### The Sunday Reset
15. The minutes add up: the header is the sum of the steps it lists ("About 17 min").
16. The intro names its windows: "6 to-dos due this week, 4 without a time", "2 dinners not picked".
17. Step lines: Look ahead "Dates coming up"; Dinners "Pick them, and who cooks".
18. Look ahead: "7 to-dos are due in the next three weeks. You'll give them a time in To-dos."
19. Coming up shows a trip once, by name, with its dates ("Weekend at the lake, to Sun Nov 1").
20. Your time shows only your own blocks.
21. One spelling, "to-do" and "to-dos", in the reset panel, the block panel, and every toast.
22. The dinner step's heading says "This week's dinners" (or "Next week's").
23. The recap's line: "Finish when it looks right. You can change anything after."

### This week's plan
24. Tags: "Order in", "Eat out".
25. The to-dos card ends with "4 more, due this week, need a time", which opens Due soon.
26. "Plan the rest of the week" doesn't show on the day the reset was finished.
27. The title and its buttons line up.

### The meal board
28. One line under the title: "Drag a meal onto a day, or tap a meal and then a day. Drag one off the board to clear it."
29. Days that are over are quiet, keep what they had, and take nothing new.
30. It's in the menu when dinners are on.

### A block's own mat
31. The panel beside it drops its own preview and ×. The mat shows the block, and Done closes it.
32. The routine has one hint: "Drag exercises here in order, or tap one". Tapping an exercise, or pressing Enter, adds it at the end.

### Edge cases found on the Dev boards
33. A board with 30 overdue to-dos said "30 to-dos due this week". Now it says "30 to-dos carried over from before", kept apart from what's due this week.
34. A Dev board's plan said "Planned Tuesday at 7:37 pm", borrowing the time from your own board. Now the planned time shows only for a week whose reset that board finished.
35. Boards with no partner, no dinners, or neither (Bare, Empty): the menu drops the Plan heading, the intro shows only the steps that apply, and its minutes add up. Checked; nothing threw.

## Not in V9
- Breakfasts, lunches, routines, and the rack still live on this device only.
- The welcome's leftover letters (the three extra ones) go back when you finish. There's no "put the extras back" step.
- At 1000 px the Now card still meets the very top of the board's header plank.
