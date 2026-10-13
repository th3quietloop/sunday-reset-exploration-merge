# Sunday Reset, exploration merge

## The vision

A clean room with colorful toys in it.

The desk version (303) has the idea people love: your week is made of blocks you can pick up, drop, stretch, and stack. The clean sans serif version (350) has the calm: white space, one strong button, a plain top bar. This exploration keeps the calm everywhere except in one place. The blocks are the only color on the screen, and they are the thing you play with.

## The goal

Open the app and see your time as blocks. Move them with your hands. Read the week, the month, and the year at a glance. Everything that isn't a block gets out of the way.

Done means:

1. The top bar from the clean version: Sunday Reset, then Today, Calendar, To-dos, Focus. Calendar replaces Week.
2. Calendar holds Day, Week, Month, and Year in one place, one switch.
3. Blocks are toy bricks: color, a hand drawn mark from the desk version, a lip of depth, a grip, a lift when you pick one up, a squash when it lands, a soft tap you can hear.
4. Drag a block to move it, drag its end to stretch it, drag from the Block box to add one. Things it lands on make room (they slide later), a soft block like Work opens a hole, and a locked block never moves.
5. Week has two ways to look at it: columns (time down) and rows (time across, like the desk).
6. Month shows each day as a little stack of its blocks. Year is a quilt: one small brick per day, colored by the kind of day it was.
7. A kind of day (Your usual, Focus, Creative, Workout, Rest, People, Take it easy) fills a day with blocks that drop in.
8. To-dos are blocks waiting for a time. Drag one into the week, or let Sunday Reset find a time.
9. Focus is one block, big, wearing down as the time goes.
10. The Sunday Reset button runs a short reset: pick a kind for each day, give to-dos a time, done.
11. Private repo on GitHub, a public link on Vercel.

## Menus that get to the point

The rule: chrome is black, white, and gray, and says one thing at a time. Color and play belong to the blocks.

1. Four words in the top bar: Today, Calendar, To-dos, Focus. Nothing else earns a tab.
2. Calendar replaces Week, and Day, Week, Month, Year live inside it as one segmented switch.
3. One black button per screen at most. Everything else is a quiet text button.
4. The Sunday Reset button is the only button in the top bar. It turns black on Sunday, Monday, and Tuesday until the reset is done, and stays outlined the rest of the week.
5. Settings, sound, sample data, and help live behind the avatar. One menu, short list.
6. The sample banner becomes one small chip beside the name: Sample.
7. Headlines are numbers, not sentences: 27 h open, not "You have 27 hours and 45 minutes open this week".
8. No paragraph explaining the rules under any headline. If a rule needs saying, it goes in a hover hint.
9. Date navigation is three controls: back, Today, forward. No date field.
10. Today only shows when you've left today. It's not there when it would do nothing.
11. The calendar toolbar is one row: where you are on the left, how you're looking on the right.
12. Week layout (Columns or Rows) is two small drawn icons, not a dropdown.
13. Keyboard first: T for Today, C for Calendar, D W M Y for the zoom, arrows to move, B for the Block box, Z to undo.
14. Tapping a block opens a sheet that starts with the block itself, big, then only what changes it: name, start, length, color, mark, locked. Remove sits last under a rule.
15. Steppers instead of time pickers: earlier, later, shorter, longer, in 15 minute steps.
16. Undo lives in the toast that says what happened ("Workout moved to Thu 7:00 am. Undo"), not in a toolbar.
17. The kind of day is a chip on the day's header. Tap it, pick a kind, watch the blocks drop in.
18. Kinds of day are named for what the day is (Focus, Rest, People), each with one short line.
19. The Block box is one shelf at the bottom, grouped by tabs (Move, Make, People, Home, Work, To-dos). It folds to a single pill.
20. Group tabs in the Block box are words, not icons, because the blocks already carry the icons.
21. Open time isn't a button, it's a dotted gap that says "2 h open" and turns into a plus when you point at it.
22. Empty states say what to do in five words or fewer: "Drop a block here".
23. To-dos are one input and a list. Length is three chips (15 min, 30 min, 1 h) under the input, not a form.
24. A to-do's status is where it is: on a day means planned, in the list means waiting. No status dropdown.
25. Focus has two buttons: Start (or Pause) and Done. Nothing else on the screen moves.
26. The reset is three steps with their names on the bar: Kinds, To-dos, Done. Next says where it goes ("Next: To-dos").
27. Copy uses one noun: block. Things in the box are blocks too, so nothing changes name on the way to the calendar.
28. Times read the way people say them: 7 am, 7:30 am, noon.
29. Locked blocks show a small lock and don't show a grip, so you know before you try.
30. The past is worn, not faded: past blocks take a lighter real color and keep readable ink.
31. The now line is the calendar's own red line with a pin, nothing louder.
32. Pointing at a button tells you what it will do in the hint line, never a modal.
33. On a phone the top bar keeps the four words and the reset becomes a small round button.
34. No icons from icon sets anywhere. Every mark is the hand drawn set from the desk version.
35. Settings are on the board or on this device, and each line says which.

## What was built (Oct 13)

Everything in the goal list above. From the menu list, in the app now: 1 to 20, 23 to 31, 33, and 34. The keys are T, C, F, D, W, M, Y, B, and Z.

Still ideas: 21 (an open gap turning into a plus you can tap), 22 (five word empty states everywhere), 32 (hints in a line under the controls instead of tooltips), and 35 (each setting saying whether it's on the board or this device).
