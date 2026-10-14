# Corners V11: how it moves

Russell, Oct 14: "level up the interaction of the blocks and how they are placed, the subtle way they animate, and transition in, even the whole app... I want people to LOVE using this because of the smoothness and satisfaction." V10 stays live; V11 is `v/corners11`, https://sunday-reset-corners-v11.vercel.app.

V11 is V10 with every motion reworked, and everything Russell asked for while it was being built (below the motion list). The board's part is in its own code behind one switch (`feel`, a class on the page that only V11 carries), so V10 and older versions move as they always did. Everything in the list below is built.

## The idea: wood with weight

Every block behaves like a small piece of hardwood:
- it presses when you touch it;
- it lifts with a shadow under it;
- it swings a little as you carry it;
- it falls the last bit, and lands with a knock you hear at the instant it touches.

The camera, the boards, and the panels move on springs, so nothing starts or stops with a jolt.

**The one moment that's authored:** finishing the Sunday Reset. The week clicks into place. Each day's blocks press down and settle, first day to last, then the chime. It happens once a week.

## How it moves now, and what V11 does

### Picking a block up
1. **Touch.** Now: pressing a block does nothing until the pointer has moved 5 px. V11: the block dips into the board the moment you press it, so you know you have it before you move.
2. **Lift.** Now: a copy rises toward its slot at a fixed rate, with nothing to say how heavy it is. V11: it lifts on a spring. A soft shadow pools on the board under it, wider and fainter the higher it goes.
3. **Tilt.** Now: the tilt comes from how far the mouse moved since its last event. So a fast mouse that reports often barely tilts, a trackpad tilts a lot, and it only ever tips sideways. V11: the tilt comes from how the block itself speeds up and slows down, measured every frame, on both axes. It swings back as you start, past level as you stop, then settles, like a tile held by its top edge.
4. **Following you.** Now: the block chases the slot under it, so it lurches from slot to slot and slides out from under the pointer. V11: it rides between your pointer and the slot. The slot still pulls it, but it stays under your hand.
5. **Block library.** Now: picking a piece up makes it vanish, and a copy slides in from the middle front of the desk. V11: the piece lifts from where it sits.
6. **The tray.**
   - Now: a tile you drag out jumps so its middle is under the pointer, wherever you grabbed it. When it crosses onto the desk, it disappears and a block glides in from the middle front of the desk.
   - V11: the spot you grabbed stays under your pointer, and the tile lifts with a shadow. On the desk, the block appears right under your pointer.

### Carrying it
7. **The landing spot.** Now: the dashed outline pops in and jumps from slot to slot. V11: it fades in and glides to the next slot.
8. **Stutter on a busy board.** Now: every pointer move during a drag re-plans the whole week on a fresh copy of every saved date, even when the slot hasn't changed. That's where drags stutter on a full board. V11: the board re-plans only when the slot under you changes. In between, only the block in your hand moves.
9. **Blocks making room.**
   - Now: they slide on an ease that's at full speed the instant the slot changes, then crawls in.
   - V11: they move on springs. They start gently, keep their speed when you change your mind, and stop without a jolt.
10. **Leaning in.** Now: the camera's lean toward what you carry takes about a second to settle, so the board drifts under the pointer while you aim, and the slot changes on its own. V11: the lean settles in about a third of a second.
11. **Edges that should stay put.** Now: when a block's width changes during a drag (you stretch it, or open time is cut around it), the new width appears at once but its middle glides over. So the edge that should stay put jumps out and slides back. V11: that edge stays where it is, and only the edge that moves, moves.

### Setting it down
12. **The landing.**
    - Now: on release, the squash happens at once while the block is still a unit up in the air, and then it glides down. The clack plays at release, before it touches.
    - V11: it falls, speeding up, in about an eighth of a second, then squashes when it touches, and the clack plays at that moment.
13. **Sawdust.** Now: puffs fly in every direction from the front edge, up in the air. V11: a small puff skids out along the board from under both long edges, the moment it lands.
14. **The board takes the knock.** New: the blocks right beside it in the same row give a small knock, nearest first, so the row feels like one piece of wood.
15. **Momentum.** New: a block lands with the speed you carried it at: a small rock in the direction it was moving, then flat.
16. **No room, or off the board.** Now: the block vanishes from your hand and reappears in its old spot. V11: it flies home along a low arc, lands in its old place with a softer knock, and the note says why.
17. **A tray tile dropped nowhere.** Now: it vanishes. V11: it flies back into its place in the tray.
18. **Placing from the panel.** Now: the new block grows on the board while the copy is still flying to it, and squashes when the copy fades. V11: the block waits for the copy. The copy shrinks to the block's size on screen, and the block drops into its slot as the copy arrives.
19. **Pieces dealt onto Block library.** Now: they slide down out of the air, fastest at the start. V11: they drop like tiles out of a bag, one after another, and settle.

### Hover, pick, stretch, take off
20. **Hover.** Now: the lift is a fixed-rate glide and the drag dots pop on. V11: the lift springs, and the dots fade in.
21. **The picked block's glow.** Now: it appears at once. V11: it spreads out from under the block.
22. **Stretching.** Now: the block stays flat, and the edge jumps a step at a time while the middle drifts (see 11). V11: the edge ratchets 15 minutes at a time with a click, and the other edge doesn't move.
23. **Taking a block off.** Now: it squeezes into a thin sliver across its depth. V11: it sinks into the board.

### Moving through time
24. **The camera.** Now: it starts every move at full speed and takes a long time to finish. V11: it eases in and out on a spring and settles in about half a second.
25. **Pinch and pan.** Now: the desk trails behind your fingers. V11: it stays under your fingers while you touch it. A pan keeps going a little when you let go, then slows to a stop.
26. **Day, week, and month changes.** Now: tiles arrive in a wave and stop dead. V11: the same wave, and each tile settles as it lands.
27. **The boards sliding over** (the week to the right for the day, and Block library beside it). Now: the same full-speed-then-crawl glide. V11: springs.
28. **Opening a mat** (the meal board, a block's own mat, the setup). Now: it waits a quarter second, then the camera drifts over in about a second. V11: the camera glides over in about half a second, and the mat arrives as it settles.

### The pieces on top of the desk
29. **The zoom switch** (Now, Day, Week, Month, Year). Now: the white highlight jumps. V11: it slides to the one you picked.
30. **The date.** Now: the words swap. V11: they slide the way you went, the next week in from the right and the last one from the left, the same direction as the tiles on the desk.
31. **The side panel.**
    - Now: it appears and disappears at once.
    - V11: it slides in from the right with a fade, and leaves with a quicker fade. A new panel replacing an open one crossfades its contents.
32. **The tools over a picked block.** Now: they appear at once. V11: they rise out of the block.
33. **The menu and the sheets.** Now: they open with a motion but close by vanishing. V11: they close with a quick fade.
34. **Toasts.**
    - Now: point at a toast with Undo and leave, and it plays its entrance again and then vanishes mid-sentence. When a fourth toast arrives, the oldest vanishes and the rest jump.
    - V11: toasts rise in and fade down out. The stack slides, and a toast you pointed at leaves cleanly.
35. **Counts.** Now: when the To-dos number changes, nothing marks it. V11: it pops once.
36. **Pressing.** Now: many of the corner buttons don't sink when pressed, though every other button does. V11: every button sinks a pixel.
37. **Tray tiles.** Now: they lift on hover but don't press. V11: they press.
38. **The note that follows the pointer.** Now: it pops on. V11: it fades in the first time, then follows the pointer without lag.

### Sound, in time with what you see
39. The clack plays when the block touches, not when you let go. Picking up plays as it lifts. A block flying home lands with a softer tap. A block placed from the panel clacks as it lands. A dropped block is one clack, never a burst.

### The setup on the desk (V10's pieces)
40. The answers and letters you drag in the setup carry the same way:
    - the spot you grabbed stays under the pointer;
    - it lifts with a shadow and leans into the direction you move;
    - it flies home when you drop it nowhere;
    - it presses into its slot when it lands.

### The Sunday Reset
41. **The week clicks into place.** Now: the chime and the toast. V11: the week's blocks press down and settle, day by day, first to last, 45 ms apart, with one soft roll of wood, then the chime.

### Calm and reduced motion
42. Every new motion has a still version. With Calmer motion (Settings) or the system's reduced motion:
    - blocks are set down where they go;
    - nothing tilts, swings, ripples, or drifts;
    - the camera goes straight there.

    The sounds and the color changes stay.

## Timing

| What | How long |
|---|---|
| A press | 70 ms |
| A lift | a spring that settles in about 0.3 s |
| A fall | 90 to 150 ms, by height |
| The squash on landing | 160 ms |
| The knock beside it | 22 ms a block unit, nearest first |
| Flying home | 260 ms |
| The camera | a spring that settles in about 0.5 s |
| Panels and menus | 120 to 220 ms |

Nothing on the screen takes longer than a quarter second except the camera and the week clicking into place.

## Asked for while V11 was being built

### "There's flickering underneath it"
**The cause, found the second time (Oct 14).** The soft shadow under a carried block sat at exactly the height of the tops of the grooves (0.315), so whether it drew over a groove came down to rounding, and every small camera change flipped the whole patch on or off: up to about 31,000 pixels between frames. It lasted 3 to 4 seconds because that's how long the camera keeps settling after a lift (the lean and its springs). Measured frame by frame: 30 to 46 flips a second for the first 3 to 4 seconds, in the day and the week. The shadow now sits clearly above the grooves (`stepBlob`, scene.js), and the same runs measure zero flips. Calmer motion has no shadow, so it never flickered there. While at it: a block dropped on another day in the week view now falls and squashes there (it used to appear in its slot), landing outlines that have no slot are hidden instead of drawn every frame, and the outline's material is marked changed only when it changes.

The first fix, before that: when a block was lifted over the board, the board planned the week again on every move, and open time cut around the block got a new name each time (its start is in its name). So pieces of open time were thrown away and made again under the block, growing in or flying in from the side. And a block moved to another day had a second copy grow in under your hand.
- Pieces of a cut block now keep their blocks as the cut moves (the nearest one is reused), so they slide instead of popping.
- The copy of the block in your hand stays out of sight until you let go; the outline says where it lands.
- What does appear or go while you hold a block comes up out of the groove, or sinks, quickly.

### "The tiles, when I pick them up, they just disappear"
Picking a tile up from Block library, or dragging one out of the tray, threw an error before the block in your hand was made, so the tile vanished. It was in every version since V8 (fixed for V10 too). A piece in hand now gets its plain time, lifts from where it sat, and goes back there if it doesn't land.

### The inverse on pressed pills
A pressed corner pill (To-dos, Block library) is white and its mark was drawn in cream, so it vanished. Any mark on a pressed pill is dark now.

### Real icons: "this looks like a JPEG upscaled... use actual vectors"
The marks were drawn by hand into small canvases and stretched by the page to 18 to 30 px, so on a sharp screen they blurred. V11 draws every mark from vectors: **Phosphor Icons** (phosphoricons.com, MIT License, free to use in the product; the license is kept in `board/src/PHOSPHOR-LICENSE.txt`). Things use Phosphor's fill weight and controls (x, plus, arrows, checks) its bold weight, since the fill weight puts those inside a filled square. `scripts/build-icons.mjs` writes `board/src/icon-paths.js` (92 marks, one path each); the same mark names work everywhere, on the desk and in the corners, and each is drawn at four times its size so it's sharp on any screen. This replaces the rule that marks are drawn by hand, for V11, at Russell's ask. Other packs looked at: Lucide (on every AI app), Tabler, and Heroicons.

### "I don't like this" (the setup as a desk of questions and letters)
A first visit now opens the way "Plan the rest of the week" does: one page, **Set up your week.**, about 5 minutes, four short parts with their minutes (About you, Your week, Try it, Your plan), "Behind this: a made up family's week, to look around", and Start or Look around first. Start opens the setup a question at a time (the card, as polished for V10). "Set up my own week" in the menu opens the same page. The desk version stays in the menu under Try the setup, to compare.

### Block library puts itself away
Each visit starts with it away, and a minute without using it puts it away again, so the calendar has the most room. Pointing at it or picking from it counts as using it. The first time, a note says so with a way to Settings. Settings, The desk: "Put Block library away by itself" (on).

### The Now band
Your name, the date, and the zoom switch are one height now (the date was 7 px shorter in Now, with no arrows), and the band hangs the same 12 px under all three, so it no longer nearly touches the zoom switch.

### The phone's desk
On a phone's desk the corners drew on top of the phone's own bar and its round Add. They step aside there now.

### Leaning in further, without the queasiness
Picking up a block now leans the desk in about 17 percent (it was 10), on a spring that eases in and out over about half a second. The research behind how:
- Keep zoom changes modest, ease in and out, never overshoot. Scale changes past about 20 percent and fast zooms are common triggers for people with vestibular trouble.
- Keep the point you're working on still while the rest grows: optic flow (the world rushing past) is what makes people sick. The lean now zooms around the block you picked up, so it stays put under your hand (measured: within a pixel).
- A view that trails behind your hand is a trigger too, so the camera doesn't chase your pointer. Near the screen's edge the lean eases back instead, so a day at the far side of the week is always in reach.
- With reduced motion on, Apple swaps zooms and slides for a dissolve. V11 does the same with Calmer motion or the system setting: no lean at all, panels and toasts fade in place, and a change of view (Day, Week, Now) is a quick dissolve of the desk instead of a glide.

Checked on a phone's desk too: the same 17 percent, the block still under the finger.

Sources: [Accommodating vertigo and vestibular disorders (University of Michigan)](https://teamdynamix.umich.edu/TDClient/30/Portal/KB/Article/14019/Accommodating-Vertigo-and-Vestibular-Disorders), [WCAG animation from interactions](https://testparty.ai/blog/wcag-animation-interactions-guide), [Apple: reduce screen motion](https://support.apple.com/en-us/HT202655), [Apple: reduced motion criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria), [viewpoint snapping and cybersickness](https://www.csit.carleton.ca/~rteather/pdfs/GI_2018_viewpoint_snapping.pdf), [FOV change and motion discomfort](https://bugnet.io/blog/how-to-fix-ads-fov-change-causing-motion-discomfort-on-zoom).

## The meal board (Russell: "so cool... make sure the user knows they can scroll")

Built:
1. It takes the screen: the mat is as big as the window.
2. On a computer the board and the meals sit side by side. The meals scroll in their own column, so the board never scrolls out of reach. On a phone they stack.
3. **More below**: a column with more under the fold fades at its foot and shows a More below button that scrolls most of a screen. It goes when you reach the end.
4. A drag near the top or bottom of a column that scrolls scrolls it for you, faster the closer you are.
5. The board's cells grow with the room (up to a comfortable size).
6. Meal names in the column take two lines before they're cut.
7. **Every day at once**: drop a meal on a row's name (Breakfast, Lunch, Dinner) and it goes on every open day of that row. While a meal is in hand the row names say "Every day".
8. **Same as last week** brings last week's meals onto this week's open days.
9. Tap a meal and the line says what's next: "Tap a day for Oatmeal, or its row's name for every day."
10. Fills and last week come with Undo.
11. **Show**: a check on the rows that show and an outline on the ones that don't (V10's "is all white selected?" question, answered).
12. Today's column is marked down its length.
13. Who cooks is a name, not an initial, and a tap changes it.
14. One shorter line on how: "Drag a meal onto a day, or tap one, then a day. Drag it off to clear."

Built after (rounds two and three, below):
15. A grocery line under the board (how many things to buy, and the list).
16. Any two meals swap by dropping one on the other, across rows too.
17. Arrow keys from cell to cell.
18. Breakfasts and lunches are on the board now, beside dinners.

Next, not built:
19. More of this board pattern elsewhere, as Russell asked (see the list at the end of round three).

## Meals, round two (Russell: "what if I eat tacos for breakfast?")

What he said, and what changed:
1. **"Does it have to be so rigid with the categories?"** No. A meal is what you eat, not when: any meal goes in any row. Tacos dragged onto breakfast land as breakfast, in breakfast's color (the cell wears its row's color, the way a block wears its lane).
2. **"Maybe there's a filter, maybe there's a dropdown, maybe there's a sort."** A sort: "Any time, Breakfast, Lunch, Dinner" over the list. Picking one puts what fits that meal first (yours, then ideas) and everything else after under Other meals. Nothing is hidden by it, so tacos are always there. It switches by itself when you tap a day.
3. **"How would I enter something like that?"** Tap the day and type it: "sweet potatoes, scrambled eggs, toast, and beef sausage". Commas make parts, shown as chips while you type ("mac and cheese" stays one dish). Enter and it's on the day.
4. **"Does it need to be categorized?"** No. The board learns from where you put things: a meal you've had at breakfast sorts first for breakfast next time, and your most used meals lead.
5. **"If I can't drag it on there, there was no communication."** Nothing refuses a meal for being the wrong meal now. The only day that says no is one you're away; it shows a no while you're over it and says why when you let go. A night without a Dinner block takes the meal and adds the block, and says when.
6. **Groceries, "maybe I just type it out... what does it look like with a bunch of different chips?"** A typed meal's parts are chips with a cart on each. The ones you cook go on the grocery list, matched to what the kitchen already knows ("scrambled eggs" is Eggs, toast is Bread); tap a chip to leave it off. Recipes bring their ingredients as before. Breakfast and lunch count on the list too.
7. **"How do I edit out dinners I don't want to see?"** Hover any meal for an x (Hide), or Edit for touch; meals you added come off for good, the rest can be brought back. "Hidden" is counted at the foot of the list, never gone without a word.
8. **"Imagine you're a vegan... you don't want to see anything that has to do with chicken."** Leave out: Everything, Vegetarian, Vegan, or Pescatarian, then Chicken, Turkey, Beef, Pork, Fish, Shellfish, Eggs, Dairy, Gluten, Nuts, and any word of your own (mushrooms). It reads names and parts, with the exceptions a person would make (peanut butter isn't dairy, beef sausage isn't pork, eggplant isn't an egg). It only hides meals in the list; your days stay as they are. Vegetarian hides exactly the 14 meals with meat or fish in the sample.
9. **"Not only for me and my situation."** Thirty six ideas across diets, the household's own meals rising to the top as they're used, and the diet saved on the board for the whole home.
10. **"Why is dinner all the way at the top?"** The list leads with Find or add, then the meals that fit what you're filling. The old order (Dinners you make, Easy nights, Breakfast, Lunch, and Your own at the very bottom) is gone.
11. **The data** (`state.meals`, `state.mealbook`): breakfast and lunch live on the board beside dinner (so they sync, reach the phone, the grocery list, and Undo); a meal has a name, parts, the parts to buy, how it happens (Cook, Leftovers, Order in, Eat out, Skip) and who's making it. Breakfasts and lunches kept on a device before move onto the board with the first change.

Also built in this round:
- **Change a meal in place**: tap it to rename it, say how it happens and who's making it, pick the parts to buy, or take it off.
- **Find or add**: the search matches names and parts; Enter on something new adds it to your meals and holds it for the next day you tap.
- **Not cooking** (Leftovers, Order in, Eat out, Skip) fits any row.
- Escape closes the day's card before the board; focus comes back to the day.
- On a phone the board turns (days down, meals across), opens over the whole screen, and the day's card is a sheet at the bottom.

## Meals, round three (Russell: "auto suggest... asks the user what food items they have... keep elevating it")

1. **Suggest meals.** An idea for every open meal left this week, dashed in the row's color until you keep it. Tap one to keep it, its x to say no, Keep all for the rest (one Undo), Shuffle for others, Clear to drop them. Yours come first, nothing repeats two days running, a week leans on variety (breakfast may repeat more), and Away days and nights with no room are skipped.
2. **We have** (the simple version of "what food items they have at the house"): in the ideas bar, the ten things the meals you'd pick use most (Eggs, Rice, Chicken...) plus your own words. Pick what's in the kitchen and the ideas, and the list, move the meals that use them up front ("Uses 2 you have"). It's for this sitting only, so it never goes stale.
3. **Plan next week**: arrows beside "This week · Oct 11 to 17" move the board a week at a time.
4. **Also on**: a meal's card has the week's seven days; tap a day to put the same meal there, tap it again to take it off.
5. **Copy by dragging**: hold Option while dragging a meal and it copies instead of moving (a plus on the piece in hand, "Copy here" on the day).
6. **The drag says what will happen**: over a day with a meal it reads Swap (a meal from another day) or Replace (from the list).
7. **Arrow keys** walk the board across days and down meals (turned on a phone); Delete takes a meal off, with Undo; the slash key goes to Find.
8. **Earlier days fold on a phone**: "Earlier this week: Sun to Tue" opens them, so the week starts on what's left.
9. **Said out loud**: placing, moving, swapping, and clearing are announced for a screen reader.
10. **The grocery count says it changed**: it glows gold for a moment when a meal adds or takes away things to buy.
11. A meal's parts show on hover in the list; long one-word names step down a size instead of being cut.

Where else this view would work (Russell: "what are some other places we could use it?"):
- **Workouts**: days across, Morning and Evening down, moves from a library (Run, Lift, Stretch).
- **Chores**: days across, people down, chores from a list ("Kim: laundry Tuesday").
- **Kids' rides**: days across, drop off and pick up down, who's driving as the tiles.
- **Time together**: evenings of the week, with the date ideas as tiles.
- **To-dos**: the week's days as cells, Due soon as the library, dragged to the day you'll do it.
- **Kinds of day across a week**: Saturday Rest, Monday Focus, picked for the whole week at once.
- **Packing for a trip**: trip days across, outfits or meals down.

## Kinds of day (Russell: "turn it into a real experience... zoom out and see it as a board... duplicate the board and fill it out the other way")

Built:
1. **See them all on the desk.** The day sinks, and a board rises in its place with a card for every kind this day could be. Each card is the day as that kind would make it: morning, afternoon, and evening, block by block, worked out by the board's own rules.
2. Each card has the kind's name and mark, its line, its hours to yourself (★), and what it adds outlined in gold.
3. The kind you're on is outlined, like this month on the year.
4. Tap a card and the day becomes it: the cards sink and the day rises with its new blocks, with Undo.
5. A kind that would take off something you placed says what on its card first ("Takes off Walk and Reading. Tap again to use it.").
6. The last card saves this day as a kind of your own.
7. **Often on Wednesdays**: the kind you pick most on this weekday (twice or more in twelve weeks) is tagged.
8. **Four ways in**: a See all button beside the kind in the date card, the first row of the kind dropdown, the K key, and Now's morning question ("See every kind"). Esc, Done, or a tap on the day puts them away.
9. On the week, a day that isn't your usual says its kind on its tab (when nothing more pressing is there).
10. Hovering a card lifts it and says what a tap does.
11. With Calmer motion the board appears in place, with no rise.

Next, not built:
12. Hover a card to see it on the real board.
13. A kind for several days at once ("Saturday and Sunday: Rest").
14. A kind suggested by the day (a day full of meetings suggests Focus).
15. Change a kind from its card.

## Also in V11 (Oct 14)

### What's on screen, by view and by size (full list: docs/V11-ON-SCREEN.md)
- The bottom bar shows only what works where you are: Block library in Day and Week, To-dos in Now, Day and Week, the Sunday Reset in Now only when it's the moment, and no bar while the kinds of day are laid out.
- The kinds of day: desk things step away, Save this day leaves the grid for the date card, and the cards lay out as big as the room allows (two rows of four on a landscape tablet or wider, two across on a portrait tablet).
- Now on a portrait tablet stacks the day in taller lanes, so the board fills the room. The band no longer covers the board's header.
- Nothing on the day board prints under 12 px: a time that can't be read is left off, a name too small becomes the block's mark, and zooming in brings them back.
- The phone's desk bar: List, the month, Today when you're away from it, week arrows, then the seven days (swipe them for another week). No gold line repeating what the board says.
- The date card is tighter and today is its number in gold, with no dot.
- The setup on a phone: Next runs full width at the thumb, with Back beside it.
- Plan meals on the phone, on the dinner card and the groceries card.

### To-dos and This week's plan (full list: docs/V11-TODOS.md)
- The plan's to-dos are a working list: check off, add, take off, and give one a time, each with Undo.
- The To-dos panel leads with Due this week on gold, then each list in its own color, rows that work in place, and Lay out to put a list's pieces on the desk.
- On the bench the camera comes in close enough to read the pieces; picking one up eases back to the week and the bench side by side.
- "Due this week" means the same seven days everywhere (the pill, the strip, the panel, the plan, the reset).
- Two old bugs in the shared board code: every drop on the board ended a running Sunday Reset (two functions shared a name), and placing from the place panel threw an error.

### One black and grey surface (Russell: "look at the black and grey that is used for this app")
Every panel and chip is one near black surface with a little glass, from the ChatGPT iOS app's palette: the surface `rgba(24, 25, 29, 0.92)` with a 16 px blur, a white hairline at 0.1, rows a white step lighter, white text with #CDCDCD and #AFAFAF for quieter words (ChatGPT's #98989F reads 4.3 to 1 over the pale wood, so V11 uses #AFAFAF), and gold as the one call to action. The tokens are at the top of `variants/corners11/polish.css`.

### For Russell to decide
- One face for the chrome: Poppins in the corners and menus, Atkinson in Settings and the panels.
- "Due this week" as the next seven days rather than Sunday to Saturday.
- How close the bench camera comes (up to 1.7 times), and whether it goes back in after each drop.
- Whether "Plan meals" sits in the right places on the phone.

## Rounds one to three, and a hotfix (Oct 14, afternoon)

Russell's long list of notes (Look ahead, Your time, To-dos, meals, people, moving, the trackpad, the finish) was built in three rounds, each an area builder, an independent checker trying to break it, a fixer, and a completeness critic. Every run's report is in the session; what matters is below. 205 tests pass.

### The drop that vanished (live hotfix)
Russell showed V11 at an Apple Store and a block dragged from the reset's panel never appeared on the board. Round one had found why: a block set down before the desk drew it once never got starting values for its press, grip, and glow, so its height was NaN and it was never drawn, though it was saved and counted. The fix (two lines in scene.js, `feelBlock`) went live on its own as a hotfix (branch `v11-hotfix-drop`, commit 6683902) before the rest, and was checked on the live link with a mouse and with touch.

### What the rounds built
- Look ahead: dates you add (a day to remember, a trip, a set time), lead times for gifts and flights, holidays.
- Your time: the hours to yourself as a seven day strip, the drop that lands and shows, a toast with Undo on every drop that names what moved.
- To-dos: one window for what's due (the week being planned), Time passed on a to-do whose time went by, a panel with Details folded.
- Meals: any meal in any row, the grocery list on the board, Edit with Hide beside each tile, a success toast when you close, one way to name cooks.
- People: partners, kids, family, friends, and groups; time together counted from color, ideas, and names, never caregiving routines.
- Moving: an optional step, on when the setup leaned toward moving more or a goal is set.
- The frame: one step bar that folds when it doesn't fit, the reset as a bottom sheet on phones and upright tablets, panels and toasts that never cover each other, pinch to change the view (a plain scroll never does), a finish that says what this reset did, Finish later at the bottom left.

### For Russell to decide
- Every drop on the board gets a toast with Undo, in the Planner too, not only in the reset. Keep it everywhere?
- A to-do dropped on time that's already gone keeps its own status (Time passed) instead of counting as done.
- Blocks marked done still count toward time to yourself.
- The big hours number on Your time and To-dos stays gold, though gold is for the one call to action.
- Extra groceries that don't come from a meal (milk, paper towels) need a saved state change. Build it?
- Pantry left the reset; it stays on the meal board's bench. Rename it, or retire it?
- The shared picture of the week names to-dos and their times. Fine to share those?
- On an upright tablet, a panel opened from a step covers the right part of the week instead of shrinking the week beside it.
- Cooks: on the meal board and the dinner panel, "You" and "Sam"; in the picture someone else reads, first names.
- The Next 7 days bench prints piece names at about 8 to 9 px at 1440 by 900: a closer bench while carrying, taller pieces, or leave it.
- Caregiving routines (up with, bedtime, drop off, pick up) don't count as time together; plum and friends blocks and people ideas always do.
