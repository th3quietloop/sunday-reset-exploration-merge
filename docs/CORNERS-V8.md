# Corners V8

The audit of V7 on Oct 13, by product, UX, UI, edge cases, and blind spots, plus Russell's note on the Now page. Then what V8 changed. V7 stays live at its own link; V8 is `v/corners8`, https://sunday-reset-corners-v8.vercel.app.

## The audit of V7

### The Now page (Russell: "look at the bottom, that's so confusing")
- Two bars along the bottom: Today's dock on the left (To do, Dinners, With Sam) and the corner bar on the right (Add, To-dos, Block library, the reset).
- To-dos showed twice, spelled two ways ("To do" and "To-dos"), each with the same red 6.
- The date showed three times: the band's tab, the board's header plank, and the time on the pin.
- The band had a mode switch (the ⇆ beside the date) that did what Now in the zoom row already does.
- A "Saved here" tag sat beside the band, saying what the dot on your circle already says.
- The band was a different object from every other chip: a folder tab on top, the board's fonts instead of the corners', 12 px buttons.
- It sat squeezed between your name and the zoom row, while every other page puts the date in the middle.
- Opening Due soon from the notepad in Now dropped the flat tray in too, so the same to-dos were on the bench and in the tray.

### Product
- The sample week is a made-up family, and nothing on the screen said so. Typing your name in the welcome kept Sam and Robin.
- There was no way from the sample to your own week. The setup is in the board, but this version never offered it.
- On Monday and Tuesday the chip said "Plan the rest of the week", though the whole reset still fits then.
- Breakfasts, lunches, routines, the rack, and reminders live only on this device, so a backup and sync don't carry them. This hasn't changed, and the meal board says it.
- The Pomodoro and the "Remind me" for the reset only work while the tab is open. Both say so.

### UX
- In the day view there was no way to pick a kind of day until you'd used one. V5 hid the dropdown behind chips for your two most used kinds, and V6 showed those chips only once there was history, so a new board had neither.
- Look ahead showed the to-dos due soon as tiles, and then the To-dos step showed the same tiles again.
- The reset's step said "To do", and the button that opens them says "To-dos".
- Letters on the rack and meals on the meal board could only be dragged, with no tap and no keyboard.
- A name with an accent or a letter outside A to Z got "Type your name with letters A to Z". That's a scold, and it shuts people out.

### UI
- Between 760 and about 1100 px wide, the zoom row covered the date.
- The stack strip always sat 78 px from the top, so in the day view it covered the date card's seven days.
- The count on To-dos was red, an alarm color, for what is only a fact.
- To-do tiles in the reset ran their due line under the "1 of 3 timed" chip, and long names were cut off ("Walk Wednesday a…").
- The welcome's letters landed on the board's top rows.

### Edge cases
- A Dev board or any preview wrote breakfasts, lunches, routines, the plan's time, and a reset reminder to this device, so made-up meals showed up on your own board afterward.
- When Calendar, the menu, or a key changed the zoom from code, the zoom row kept showing the old view until the next redraw.
- The rule that keeps the flat tray away matched V7's class name, so a copy of V7 showed the tray again. V8 fixes it for itself.

### Blind spots
- Nothing in the corners worked without a pointer: letters, the meal board, and the exercise pieces.
- Motion didn't respect the system's reduced motion setting (letters dropping and hopping, mats sliding).
- A name that fills all nine slots was cut without saying so. It still is; the input stops at nine.

## What V8 does

### Now, like every other page
1. One bar along the bottom on every page. Today's dock is gone, and the tray only shows as the reset's steps.
2. The date chip sits in the middle, the same as on Day, Week, Month, and Year, with the time beside it. It has no arrows in Now, since they would leave Now.
3. What you're in sits right under the date, in the same chip, type, and button size as the rest of the corners.
4. The band's date tab, its ⇆ switch, and its "Saved here" tag are gone. The zoom row has Now, and the dot on your circle says saved.
5. Between 760 and 1140 px wide, the date moves into the band's top line, so Now doesn't spend a row on it.
6. To-dos in Now lays Due soon out beside today's board, without leaving Now, with the same stack strip as the Calendar. The strip sits under the band.
7. Block library from Now opens today in the day view, with the rack beside it.

### Fixes
8. The kind of day is back under the date in the day view ("Your usual Tuesday"). Your two most used kinds sit beside it as one tap chips.
9. Between 760 and 1140 px the date drops under the zoom row instead of running into it, and the board measures its room again when it moves.
10. The stack strip hangs under the date chip, or under the band in Now, wherever those end.
11. Calendar, the menu, and keys update the zoom row at once.
12. To-do and block tiles in the reset wrap their lines; names get three lines.
13. The flat tray rule matches V8's own class.

### Product
14. Monday and Tuesday: "Set up this week" in gold, the whole reset for the week you're in. Wednesday to Friday stays "Plan the rest of the week".
15. The sample says so: "Sample week" under the name on your circle.
16. The menu offers "Set up my own week" on the sample, with your name already filled in if you spelled it on the rack. It opens the board's own setup (`SR.openSetup`).
17. Look ahead names what's due in one line ("7 to-dos are due soon. You'll give them a time in To-dos.") instead of showing the tiles twice.
18. The step is "To-dos" everywhere.
19. The To-dos count is a quiet number, not red.

### Edge cases and reach
20. Previews never write to this device: meals, routines, the plan's time, reminders, the hidden midweek chip, and the meal rows. Back to my board reloads what this device had.
21. Tap a letter and it goes to the next slot your name needs, or the first open one. Enter or Space does the same.
22. Tap a meal piece and it's held (gold ring), then tap a night. Cells and pieces take the keyboard too.
23. Any name works: accents fold to their letter (José spells JOSE). A name with no A to Z letters skips the rack and says nice to meet you.
24. The welcome's letters land beside the rack, off the board.
25. With reduced motion on, the letters, mats, menus, and sheets stop animating.

## Not in V8
- Breakfasts, lunches, routines, and the rack still live on this device, not the board. Moving them into saved state needs a data version step in the board (`Data.migrate`).
- The puzzle edge for split blocks, and a true 3D second mat.
- Your time still offers work blocks (Deep work, Meeting) from Block library. Filtering it to your own kinds is a board change.
