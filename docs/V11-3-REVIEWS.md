# The two reviews of V11-2 (Oct 20, 2026)

Russell asked for a grumpy code reviewer and a grumpy designer, then for every finding to be built as V11-3. Code findings are C1 to C35, design findings D1 to D56.

## Code review

I found 35 problems: 🔴 1, 🟡 9, 🟢 25. Nothing was edited. I ran six of the new test files (big moments model, meal window, own time, going and covering, quick add's big things, smart breakdowns) into $TMPDIR, and all 73 tests passed. I confirmed the quick-add findings (1 and 2) with a scratch script against the real model.

### 🔴 Critical
1. **Quick add treats any "text/message X about Y" as a message and drops the rest** (model.js 1984–1992, app.js 18310–18315). I checked these:
   - "Text mom about dinner tomorrow 6pm" becomes a to-do with no due date and no time.
   - "Message the team about the deadline Friday" becomes "Text The Team about…", so the verb changes and "the team" gets capitals.
   - With no trip to attach to, `msgKindOf` falls back to `headsup` (4192), so the suggested text reads "I'll be in town and would love to see you".
   - Fix: only take the message path when `tripFor` finds a trip or nothing in `about` looks like a date or time. Otherwise parse the line normally and attach `msg`. Keep the person's verb, and make the fallback a plain kind with no suggestion.

### 🟡 Medium
2. **Trip and move quick add can't read "tomorrow", "today" or "next week"** (`quickRange`, 1940). "trip to the store tomorrow" became a trip named "The Store Tomorrow" with no date. Fix: read the same relative words `parseQuick` already knows.
3. **smart.js cost control is weak** (255–287).
   - The Origin check only stops browsers; curl can send any Origin.
   - The limit is counted in memory per warm instance, so concurrent or new instances each start from zero.
   - Fix: a shared counter (KV or Upstash), a global daily cap, or a signed per-device token.
4. **A placed meal's window drifts** (`mealWindow`, 505–513). For an add, the window centers on its current start (`sourceStart` is the record's start), so each push can move it another hour. Fix: store the meal's first start on the add and center on that.
5. **`mealBlock` counts anything with `cat: 'meals'` as a meal** (~499). That includes Meal prep and READY's `food` and `groceries` steps, so "Plan the food" or "Groceries after" blocks refuse pushes or ask "This moves…". Fix: only `dinner` adds and template meals, or an explicit `meal: true`.
6. **Sync drops one device's change to the same to-do or date** (`mergeBoards`, 1797–1857). Tasks and events merge as whole objects by id. V11-2 writes many fields inside one object (event `prep`, `ready`, `going`; a task's `list` ticks, `msg.text`, a step's `doneOn`), so two devices editing the same object lose one side. A lost `prep` key also orphans the to-do, and Look ahead offers the step again, which makes a duplicate. Fix: merge events by field (`prep` per key, `ready` and `list` by id), the way goals are merged.
7. **The new `quietBlock` rule changes plans on existing boards with no notice** (2200). The next `planGoal` or reflow removes unpinned sessions sitting in Creative time or Free evening and can't put them back, so V11 goals suddenly come up short or Behind. Fix: a one-time note, or pin the sessions already in own time.
8. **The release gate's INVALID result can hide real failures** (release-gate.mjs 142–148). Under high load it also excuses lost baseline cells, `!files.length` (nothing ran) and break-it failures, none of which are load noise, and exits 2. Fix: INVALID only for drop failures; everything else stays RED.
9. **The service worker cache name is frozen in make-variants.mjs** (line 70 forces `-shell-v2`), so bumping `SHELL` in sw.js does nothing for variants. Install also continues with missing files and calls `skipWaiting`, and activate then deletes the older complete cache (sw.js 15–17). Fix: name the cache from a hash of the file list, and delete old caches only when the core files were all added.
10. **The heads-up question gets expensive** (`headsUpDue`, 4229). It runs `readyFor` on every live event, including imported calendar events, on every `momentFor` call. `readySuggest` and `readyFor` call `coverOf`, which scans up to 62 days and builds new RegExps for each block and each person cared for (3936+). Fix: remember the result per board version and day, keep only trips, away dates and fuzzy dates, and compile the patterns once.

### 🟢 Low
11. smart.js 264: with no `x-real-ip` header, the rate limit trusts the first `x-forwarded-for` entry, which a client can fake. Every request with no address shares the `'unknown'` bucket.
12. smart.js 283: once past 10k addresses, each request walks the whole map, and entries younger than a day are never removed.
13. smart.js 332: "today" is the server's UTC date, so a goal's parts note can be a day off in the evening in the Americas. Send the page's date and check it.
14. smart.js 87–106: when `firstSmall` splits the first step, 15 steps become 16 and `cleanSteps` returns null, so a good answer comes back as 502. Cap at 15 after the split.
15. app.js 645–656 and 371: `noteMeal` runs in every `tryOn`, including drag previews and probes. `mealYes` replays a captured function inside `commit`. A function that closed over objects from before `commit` restored the board would change copies nobody sees, and the toast would still say it's done. It also skips the landing and `noteMove`.
16. model.js 3187 and 3202: sessions placed in own time get `pinned`. That mixes "placed by hand" with "said yes to own time", so they survive replans, date moves and pauses. Use a separate flag.
17. unhappy.mjs 315–318 and 477: contrast is measured but never fails the gate, and a measuring error quietly becomes null.
18. unhappy.mjs 355: a cross-origin sheet whose rules can't be read counts as loaded.
19. sw.js 15: install's `c.add(f)` goes through the HTTP cache and can keep a stale copy. Use `new Request(f, { cache: 'reload' })`.
20. app.js 18859–18864: `sideGoldWatch` watches every child change under `#side`. Every panel redraw, the Focus panel's per-second text and variant `tidyWords` edits each trigger `renderBand` and `drawChip`. Watch `hidden` only, and call it from `renderSide`.
21. app.js 6046: the More menu's outside-click listener is removed only on an outside click. Closing it with its button or an item leaves listeners piling up.
22. app.js 6004–6045: `role="menu"` has no arrow, Home or End keys, contains plain `<hr>` elements, and the button has no `aria-haspopup`. Use a disclosure list instead, or build the full menu keyboard behavior.
23. app.js 19304 and model.js 1188: heads-up holds and prep keys end with `@date`, and a fuzzy date uses its window start there. `pickDate` changes the key, so "Don't ask about Lisa" is forgotten. Move the holds over when the date is picked.
24. model.js 3853+: `pickDate` checks `date` but not `end`; any string passes `end >= date`.
25. model.js 2031+: `tripFor` keeps fuzzy trips whose window is already over, so a message can attach to last spring's trip.
26. model.js `windowFor`: plain "spring" in late May gives March to May, which ends within days. Prefer the next one when little of this one is left.
27. model.js 1981: on a Sunday, "next weekend" means 13 days out.
28. model.js 2984: in `goalFirstWeek`, `!g.start` means a goal with no start never says Behind.
29. cloud.js push setup catch (~298): any TypeError reads as Offline, including a missing `cfg.vapid`.
30. variant.js ~6922: `aiErr` is one shared value, so two asks in flight overwrite each other's error message.
31. app.js 6378–6390: `addPrep` works out steps under FEEL and throws them away, the same work `prepMake` does. model.js 4040–4046: `packList` repeats `homeKids`.
32. app.js 12979: the 'Add a to do' title (no hyphen) is still reachable under FEEL.
33. model.js 4014–4037: `setGoing` deletes an untouched cover to-do even when some of its steps are already checked.
34. tests/steps-blocks.test.mjs 202: `skip: typeof M.msgFor !== 'function'` would pass quietly if the export were renamed. Assert that it's there instead.
35. Size: app.js is 1.59 MB and 21.9k lines unminified, variant.js 518 KB, model.js 331 KB. That's a heavy parse on phones; the first-touch fix only measured sound. Minify, or load the big-moments code when it's first needed.

Things I checked that hold up: the tests that cut functions out by comment do fail loudly when a marker goes missing (v11-rig.mjs `cutter`). There are no duplicate top-level function names in app.js or variant.js. model.js has no DOM access. No em dashes, en dashes or filler words show up in the new copy.

## Design review

I found 56 problems: **🔴 7 Critical, 🟡 35 Medium, 🟢 14 Low**. I saw every one live on V11-2 with the headless browser. Source refs are in `v/corners11-2/src` in the 353 repo, and I edited nothing in any repo.

The biggest pattern: the Undo toast keeps covering the main controls in the phone's sheets, and opening a step changes the board. Several big-moments screens also differ from the approved mock.

## 🔴 Critical
1. **Undo toast covers the main action in phone sheets.** Where: phone, every sheet. It hides Text Aunt Lisa and Edit for 7+ seconds, the "No one" tile on "Anyone you want to see there?", and "8 more steps" on the countdown. Fix: sheets push the toast above their footer, or show the confirmation inline in the sheet.
2. **Tapping a step only to look at it creates a to-do.** Where: countdown step tap (`cdMakeNow`, app.js:5796). A tap on "Give Aunt Lisa a heads-up" commits a change and shows "…is on your to-dos". Fix: open the step read-only, and make the to-do only when the person acts.
3. **One goal, two different panels.** Right after Start the plan you get the old V11 goal panel: no road, no stages, a gold "Make it fit". Opening the same goal from Goals gives the countdown. Fix: always open the countdown.
4. **A goal with no date shows weeks from before it existed.** It shows seven weeks of empty circles (Aug 30 to Oct 11) on a goal made today, which reads as missed weeks, like a streak. Fix: start the dots at the creation week.
5. **A new bar exam goal starts behind, on an invented number.** It says "Your days hold about 372 of 400 h" and its gold button is "Make it fit" (app.js:4699, 4792). That breaks both "a new goal never starts Behind" and "never invent a number". Fix: no hour total unless the person gives one; the first gold should be Start.
6. **Duo folded (386x580), phone desk: no block has a name.** Sleep, Work and everything else are icons only, so the board can't be read. Fix: wrap or abbreviate labels at this size.
7. **Gold everywhere during quick add.** Desk Today shows five golds at once: "5 min left", the gold pin, the gold Movie preview, "Make it 2 h tonight", and Set up my week. The phone shows three. Fix: one gold per surface; the band's time and pin go white or red.

## 🟡 Medium
8. **Quick add hides what's in the way.** "Movie tonight 8pm 3h" mentions only bed at 10:30. "Make it 2 h" still overlaps Evening with Sam (6:45 to 10), which is never named, though the spec asks for what's in the way.
9. **Desk quick add panel covers the board.** It hides the right third of the board, including the evening where the movie would land.
10. **Morning question missing on the phone.** At 8:10 the desk asks "What kind of Wednesday?"; phone Today never asks.
11. **Gold Start in open time is inconsistent.** The phone's empty board offers "Start: Creative time"; the sample week in 20 min of open time offers no Start on phone or desk. Decision #2 isn't visible.
12. **Desk band grew a row.** "Focus on one thing" sits alone on its own row, so the band is taller than V11's and pushes the question strip and board down.
13. **Band line wraps badly.** "Next: Evening with Sam in 5 min, at 6:45 pm" wraps with a lone "pm".
14. **Type sizes off the scale.** `.band-left` is 20px (variant.css:158), the avatar letter and clock are 15px, and `k-title` is 17px.
15. **Targets under 44px.** Desk zoom tabs, Add, To-dos and band buttons are 38. Category chips are 35, grocery checkboxes 24, You/Sam pills 22, the phone band's progress bar 22 tall, Settings close 32.
16. **The circle means two things.** In the to-do sheet, plan-option radio circles sit next to the Done circles.
17. **Vague verb in the to-do footer.** It says "Use this" (app.js:11173), not the mock's "Drag a step onto a day, or" plus "Put the rest on my week".
18. **Sheets close with the word "Done".** That clashes with the Done circles and the band's Done. The mock uses an x.
19. **No grip on step bricks on the phone.** Nothing says they can be dragged; the mock shows the grip.
20. **Countdown pins pile up.** Pins stack under badges "5" and "2", with five steps all on Nov 5. The heads-ups are hidden in "8 more steps", while the mock leads with the message step.
21. **"8 more steps", opened, looks unfinished.** It gets a white outline and its text touches the border.
22. **Stray "why" line.** "A month's notice." floats below the dashed brick instead of inside it.
23. **Shorter wipes typed text.** My typed " Lunch?" was lost, with no undo.
24. **Undo shown twice.** On the phone, an Undo line in the header plus the bottom toast. On the desk, the toast plus Undo in the tray bar.
25. **Header Undo line hides the key fact.** It cuts off "Denver starts Thu Dec 3. Book travel f…" and pushes the header down.
26. **Storage-full error mislabels its fix.** It says "Download a backup", but the button says "Your data", and the banner covers the header.
27. **The meal board replaces the desk.** The board disappears, and the gold goes to "Done" instead of "Fill the week".
28. **Meal board rows are cluttered.** Past nights show "+ Add" instead of "Not planned". Breakfast and Lunch add 14 empty Add cells.
29. **"More below" pills cover content**, for example the Skip chip.
30. **Lamp's dark spot lands on board print.** On Warm and Summer, its round dark patch sits over "Dinner: Leftov…" in the header: a contrast break.
31. **Lamp cut off at 1440 wide** (8:10 am desk), which breaks "props whole or gone".
32. **Summer layout says "Small monstera" but none shows.** Its card also sits alone on a row.
33. **Opening Goals from Today shrinks the board.** It jumps to the week view, and while the panel is open the week blocks lose their names.
34. **Mixed hour formats in goal plan cells.** "1.75 h" next to "45 min", "Thu 0 h", and text touching the cell edges (app.js:3794).
35. **A brand-new goal says "Parts: 1 part · all done".**
36. **Exam road details are off.** Practice-exam diamonds run into Review. The last segment pokes past the end of the track. Legend colors are all the same blue.
37. **The bar exam date isn't on the Year view's April card**, though the acceptance list asks for it.
38. **iPad 1024x1366: the board is too small.** It's about 60% wide with half the screen empty desk. An "8.5 h open, Tap to add something" tip shows unprompted.
39. **Duo folded, phone Today header wastes space.** The settings icon sits alone on a second row.
40. **The phone lands on the desk, not Today.** Both the sample week and finished setup open the phone's desk view. The coach card covers the middle lanes, and the + button overlaps the Getting started card.
41. **Two setup screens need work.** "Building your week" is one line ("Dinner at 6 pm") over half a blank screen. On Try it, the Workout, Walk and Reading tiles are gold next to the gold Next.
42. **Welcome tiles look like buttons but do nothing.** A gold "Time for you" tile sits next to the gold call to action, and on the desk the tiles wrap two and one.

## 🟢 Low
43. **Grammar:** "1 of 3 steps have a time" should be "has" (app.js:21134).
44. **Awkward copy:** "The texts for Denver will say I or we to match." (app.js:6295).
45. **One action, three names:** "Mark it done", "Done" and "Done early".
46. **Truncation hides the key fact:** "Thai place o…" in the phone header; "Birthday gift for Jordan · …" drops "by Sunday".
47. **Settings differ between desk and phone.** Uppercase vs sentence-case group headers. The desk has Overview with the sample banner; the phone doesn't. Goals appears in phone Settings only.
48. **Stale copy in Dev:** "Brand new" still mentions the "letter rack".
49. **Phone empty scenario:** the bar says only "DEV", not the board's name, and half the screen is blank with no first step.
50. **Different profile names for one sample:** "Sample" on iPad, "Alex" on the desk.
51. **Desk menu repeats the gold.** "Set up my week" is gold in the menu and the bar; the Settings row looks selected.
52. **Countdown's gold "Give it a time" doesn't say which step.**
53. **New goal uses an unstyled native mm/dd/yyyy date field.**
54. **A 404 error appears on every load.**
55. **The tray bar drops To-dos and Block library in Month and Year.**
56. **"Earlier today" is a tan pill,** unlike the dark cards around it.

## Best screenshots
All in `$TMPDIR/rv`, which is `/tmp/claude-501/rv/`:
- `p-hu-1.png`, `p-trip-3.png`, `grid-cd.png` (toast covering actions)
- `grid-hu.png` (Edit, Shorter, Sent it?)
- `p-cd-more.png`, `z-grip.png` (countdown, missing grip)
- `grid-todo.png` (radios vs Done circles, "Use this")
- `d-goal-step2.png` vs `d-goal-open.png` (two goal panels), `z-road.png`
- `grid-ng.png` (no-date goal, history dots, "all done")
- `desk-qa-0.png`, `phone-qa-0.png` (quick add, golds)
- `desk-t-0810.png` vs `phone-t-0810.png`, `cmp-now.png` (V11 vs V11-2)
- `d-meals.png`, `d-groc.png`, `d-set-summer.png`, `z-lamp.png`, `d-focus.png`, `d-year.png`
- `grid-duo.png` (Duo and iPad), `p-err-0.png`, `phone-empty-0.png`
- `grid-setup-0.png`, `grid-setup-6.png`, `phone-setup-done.png`
- `p-welcome.png`, `v2-desk-welcome.png`
- `mock-0.png` to `mock-2.png` (the approved mock, for comparison)
