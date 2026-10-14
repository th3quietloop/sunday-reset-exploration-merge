# V11: what's on screen, by view and by size

Russell, Oct 14, three notes: why the setup's Next is so small on a phone; "do we need all that yellow copy" on the phone's desk; and, on a tablet, "if certain things are on the screen and we don't have access to them, like I can't access the block library, why do I have that on there?" The rule this pass follows: a screen shows what can be used where you are, at a size you can read and tap. Russell's test for anything in doubt: "if we removed it, would I even notice or care?"

Every view was walked at these sizes: phone (375 by 812, and Dev's 390 px phone column), portrait tablet (768 by 1024, 834 by 1194), landscape tablet (1024 by 768, 1180 by 820, 1366 by 1024), laptop (1280 by 800, 1440 by 900), and desktop (1920 by 1080), on the Sample family board held at 10:20 am.

Each item says what was there, what changed, and where. Built means it's in `v/corners11` now. Surface colors (backgrounds, glass, badges, the gold call to action) belong to the color pass in `polish.css`, so nothing here sets one; new pieces use the existing classes or white overlays.

## The bottom bar, on every view

Before: Add, To-dos with its count, Block library, and the Sunday Reset's chip, on every view, whether or not they did anything there.

1. **Block library shows only in Day and Week.** Built. It lays its pieces beside the day or the week; from Now, Month, Year, or the list it could only take you somewhere else. (`onScreen()` in variants/corners11/variant.js)
2. **To-dos shows in Now, Day, and Week.** Built. In Now, Due soon comes out beside today's board; in Day and Week its pieces come out on the bench. In Month, Year, and the list it would have jumped to the week. (`onScreen()`)
3. **Add shows everywhere the bar does.** Built. Plain words work from any view.
4. **The Sunday Reset in Now only when it's the moment for it.** Built. Now shows it on Sunday, Saturday evening, Monday and Tuesday's Set up this week, a reset under way, and a snoozed one. Plan the rest of the week, This week's plan, and Sunday Reset tomorrow stay in the Planner, where the planning is. (`drawChip()`)
5. **No bar with every kind of day laid out.** Built. The cards are the page; nothing in the bar works on them. (`onScreen()`)
6. **A bar with nothing in it isn't drawn**, and the board takes the room back. Built. (`onScreen()`, which asks the board to measure again)
7. The bar's mismatched colors (the grey count, the lighter pill under Plan the rest of the week). Not built here: Russell asked for one darker charcoal on every surface, and the color pass owns it.

## Now

8. **The band and the question covered the day board's header and morning ruler** at 1440, 1024, and 700 wide. Built. The board measured room for Add's round button, which V11 hides with CSS, and for the preview's bar, which V11 hides too, so it asked for more room than the window had and framed the whole screen instead. A control that isn't drawn takes no room now. Checked: at 1440 by 900 the board's header starts 78 px under the question; at 1024 by 768, 72 px. (`layoutInsets()` in board/src/app.js, behind `FEEL`)
9. **"then Work at 10:45 am" reads "Next: Work at 10:45 am"**, in the band and on the phone's now strip. Built. (`NEXT_WORD` in app.js)
10. **Now on a portrait tablet stacks the day in five hour lanes** (5 to 10, 10 to 3, 3 to 8, 8 to midnight), seen from a little higher, instead of a wide board with half the screen bare desk under it. Built. An hour is about 100 px wide at 768 by 1024 (it was 75) and the day fills the room. Landscape screens keep the wide board. (`renderBoard()` in app.js; `setDayShape(shape, laneMin)`, `tallLanes()`, `viewBox()` in board/src/scene.js)
11. The date in the band's top line on a tablet (Wednesday, October 14 · 10:20 am) and the date chip on a laptop. Kept: it's the only place Now names the day and the time.

## Day

12. **The date card is tighter.** Built. One padding all round (8), one gap between its rows (6), the grid button as tall as the dropdown (38), and day cells only as tall as their two lines (44, they were 50). The card is 148 tall; it was 152 with uneven padding. (variant.css, my section)
13. **Today's dot is gone.** Built. Today is its number in gold (8.2 to 1 on its cell), and in teal on the white of the day you're on (7.8 to 1). It costs no height. The place panel's week is the same component and marks today the same way. (variant.css)
14. **The date between the arrows is a 38 px target**, as tall as the arrows (it was 24). Built. (variant.css)
15. **The kind chips under the date no longer repeat the dropdown.** Built. The chip for the kind the day already is (Workout, beside "Workout Wednesday") leaves; the other stays. (`drawKindChips()`)
16. **A block's own mat opens only for blocks with more to show**: a dinner, or a workout with its routine. Built. A plain block opens its panel beside the board, where its times are said once (the mat was 820 px tall for 150 px of content, and its times disagreed with the panel's). (`checkDetail()`)
17. **The day board prints nothing smaller than it reads.** Built, on every size. The board knows how big it prints on the screen (from the camera, and the player's own zoom, in steps), and anything that would print under 12 px goes: a time under a block's name is left off, a name that can't print at 12 gives way to the block's mark, "1 h open" shows only where it reads, the header's facts grow to 12 (the first one steps out if they don't fit, instead of cutting one to "Left…"), and the now tag grows a little or steps out (the pin and its line still say now). The ruler's hours grow to 12 too, in a strip that takes the room between lanes. Zoom in and the times come back. (`printWatch()`, `faceTex()`, `freeTex()`, `dressBlock()`, `setDayGaps()`, `dayHeaderTexture()`, `laneRulerTexture()`, `setNow()` in scene.js; the size is measured in `solveCamera()`)
18. **A lane's name stands alone.** Built. "5 am to noon" under Morning printed at about 10 px, and the ruler beside it already says the hours. A lane past midnight still says Next day. (`laneLabelTexture()`)

## Day, with every kind laid out

19. **The desk things step away while the kinds are out** (the mug, the notepad, the pencil, the clock, the lamp). Built. (`stepFocus()` sets `World.setPropsAway`)
20. **No bottom bar there.** Built (item 5).
21. **The date card holds what that page needs**: the day (arrows and the seven days), Save this Wednesday as a kind, and Done. The dropdown and the kind chips name the same kinds as the cards, so they step aside while it's open. Built. (`spreadBar` in variant.js, CSS in my section)
22. **Save this Wednesday leaves the grid**; the grid is the kinds and nothing else. Built. (`kindSpec()` in app.js)
23. **The cards are laid out by the room they have**, in whichever number of columns makes each card the biggest, a short row counting against it: two rows of four at 1024 by 768, 1180 by 820, 1280 by 800, 1366 by 1024, 1440 by 900, and 1920 by 1080; two across at 768 by 1024 and 834 by 1194. Each card is as deep as the room's shape allows, so the board fills the screen. Built. (`kindsLayout()` in scene.js; the cards lay out again when the room changes, in `setInsets()`)
24. **Each card reads.** Built. A card is drawn at twice its size on the screen with its words in screen sizes: its name at 16 to 19, its line at 13, a block's name in its lanes at 12 or 13, nothing under 12. Its hours to yourself step down to the second line when the name needs the room ("Your usual" was cut to "Your u…" at 1024 wide). The lanes are named by their marks instead of words. Contrast on the card: name 11.3 to 1, line 6.0, hours 6.4, a warning 6.0, the Often tag 7.3. (`kindTexture()`)
25. **"Tap one to try it on" goes.** Built. The note under the pointer says what a tap does; on a touch screen, cards that look like choices are tapped.
26. The kinds laid out on a phone. Not built: the phone's desk has no date card or dropdown to open them from, and its one question already offers kinds. A phone sized window that isn't a phone (600 to 760 wide) lays them out two across.

## Week, Month, Year

27. **Month and Year's bar: Add and the Sunday Reset.** Built (items 1 and 2).
28. **Year says "to yourself, usually" once**, on the first month that carries it; the months after show their number alone (it was on 11 of 12 cards). Built. (`yearMonths()` in app.js, `monthTexture()` in scene.js)
29. The date chip in Month lists the month's events (Dentist, Jordan's birthday, Weekend at the lake), which are on the cards too. Kept: the cards cut long names ("Jordan's birth…"); the chip is where they read whole.

## The week as a list

30. **Its bar: Add and the Sunday Reset.** Built. Block library and To-dos lay pieces on the desk the list covers.
31. **"Only this day" reads "Show only this day".** Built. (app.js)

## The Sunday Reset, and its intro

32. **The panel's kicker doesn't count the steps twice.** Built. Where the named steps run across the top (760 px and wider), the kicker reads "Sunday Reset · Oct 11 to 17" instead of "Sunday Reset · 1 of 5 · Oct 11 to 17"; on a narrower screen, where that line is hidden, it keeps the count. (`resetTop()` in app.js, CSS in my section)
33. **The intro on a phone is a sheet from the bottom**: its main button across the foot, 52 tall, the other way out (Remind me, Not this week) under it, 52 tall; the steps sit above them. Built. (variant.css)
34. The intro's two minute counts (the total in the kicker, each step's own). Kept: one is the whole, the others are its parts.

## The setup

35. **On a phone, Next runs across the card's foot, 52 tall**, where a thumb is; Back, when there is one, is a smaller button beside it, the same height. Built. Measured: Next 339 by 52 on the first question, 257 by 52 beside Back. (variant.css)
36. **The line under the name ("It goes on your board, so the app can talk to you by name.") goes.** Built. (`ONB.name` in app.js)
37. **The empty middle of the name question.** Built as far as it goes: with the line gone and Next a full bar at the foot, the screen reads as a question at the top and its answer at the bottom, the usual shape of a phone's one question screen; with the keyboard up, the middle is the keyboard. Not built: moving the question to the middle, since the card holds its title still at the top on every step by design (docs/SETUP-CARD-V10.md).
38. **The first page's words**: "A few questions, one at a time. Stop any time; your answers wait." and, under Behind this, "A made up family's week. Yours replaces it when you finish." Built. On a phone the page is a sheet from the bottom with Start across its foot (item 33). (`openSetupIntro()`)

## Menus and sheets

39. **The account menu is 11 rows, not 16**, grouped one way (headings, no rules). Built. Reading and sound and Dev mode were pages of Settings already; Try the setup is a Dev tool and moved to Dev's page in Settings, under the first visit's scenarios. "This is a sample week. About 5 minutes to make it yours." goes (your chip says Sample week; the gold row says Set up my own week). "With Sam" reads "Time with Sam". (`openMenu()`, `window.SR_devExtras`; the hook in `devPage()` in app.js)
40. **Every primary button in an intro sheet on a phone is full width and 52 tall** (item 33). Built. This week's plan and the To-dos sheet belong to the To-dos pass.
41. **Quick add's line**: "A name, a day, a time. No time makes it a to-do." Built. (app.js)

## Toasts and the coach

42. **Toasts rise above the coach card while it sits low**; a toast hid behind the card. Built. Measured from where the card rests: 12 px between them. (`coachRoom()` in variant.js)

## The phone's Today list

43. **The Dev chip rides in the list's top line, beside the clock**, instead of over the times down the left. Its menu opens down from it, inside the screen. Built. (`devChipHome()`, `toggleDevMenu()`)
44. **Plan meals is a way to the meal board**: on today's dinner question, on the groceries card beside Open the list, and on a small Meals card when neither is there; 44 px tall. Built. (`renderToday()` in app.js asks for `window.SR_planMeals`, set in variant.js)
45. "Next: Work at 10:45 am" on the now strip (item 9). Built.
46. The SUNDAY RESET kicker at the top of the list. Kept: it's the list's door to Settings.

## The phone's desk

47. **No gold kicker.** Built. "TODAY · PULL THE NUMB…" said what the board says: today is the day in gold in the week, and what you're in is under the pin.
48. **The bar is the week, Apple Calendar's way.** Built. Row one: List, the month ("October", with its year away from this one), Today when you're away from today, and the week before and after (44 by 44). Row two: the seven days, 46 by 44, today's number in gold (teal on the white of the day you're on), no dot. A swipe across the days moves a week; a swipe on the board moves a day, as before. The day said in full stays in the heading for a screen reader. (`renderPhoneBar()` in app.js, CSS in my section)
49. **The tall board prints nothing under 12 px** (item 17): times on blocks, "1 h open", and the now tag step out; names under 12 become marks; the ruler's hours are 12.6 px. Zoom in, by a tap on a block or a pinch, and they come back. Built.
50. **Plan meals in any dinner's panel**, as a call to action under the grocery list. Built. The meal board opens over the phone's list, so from the desk it goes back to the list first, then opens. (`dinnerPanel()` in app.js, `window.SR_planMeals`)
51. **Dev's 390 px phone view takes the phone's tall board**, and Add sits in the phone's corner, not the window's. Built. (`renderBoard()`, variant.css)

## Settings

52. **Overview in a preview says nothing is saved once**, in its top note; Keeping your week (a backup of a made up board, its save line) steps aside. Built. (`PAGE.overview` in app.js)
53. **The desk**: "Put Block library away when idle / Away at the start of each visit, and after a minute unused." Built. (app.js)

## Focus rings

54. **One focus ring in the chrome: white**, as on the board's own panels (14.7 to 1 on the charcoal). The corners' gold ring read as a selection (gold is the call to action's color and today's). A white ring on the desk's light wood is 2.1 to 1, so there the ring is dark (7.9 to 1), and on a gold button it sits inside in the dark (9.8 to 1). Built for the corners, the sheets, the find boxes, the setup's pieces, the letters, and the menu. Not built: the meal board's cells (they keep their gold ring; the meal board is the main session's), which on wood would want the dark ring.

## For Russell to call

55. **Type**: V11's corners are set in Poppins; the board's panels in Atkinson Hyperlegible Next. Two sans faces on one screen.
56. **Primaries**: the main buttons come in gold (the corners, the sheets) and teal (the reset's Next, the board's panels). Pick one, or say which job each has.

## Not built, and why

57. The planner's Day view on a portrait tablet keeps the wide board. Making it tall means laying Block library's rack under a tall board, which the rack's layout (`kitSpec()`) doesn't do yet. Next.
58. The kinds of day laid out on a phone (item 26).
59. Moving the setup's name question to the middle of the card (item 37).
