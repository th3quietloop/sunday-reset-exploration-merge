# The first visit, walked as the people using it (Corners V11, aca8a91, Oct 14)

Walked on the build that's live (aca8a91), served on 4490, in a headless Chrome on 9490 set to each device's size, pixel density, touch, and Safari's user agent, and checked again in WebKit (Safari's engine) at the folded Duo's and an iPhone's size. Every first visit started from an empty origin (storage cleared through DevTools). The clock was moved to Wednesday 2:30 pm, Wednesday 9:30 pm, and Sunday 2:30 pm, and one run used the real clock (Wednesday, 10:54 pm). Screenshots are in `/private/tmp/claude-501/v11-builds/walk-shots/first-visit/`, named by file below.

Who walked it:
- **The Apple Store visitor.** Picked up the new iPhone Duo and opened the link a friend sent (`?from=Jess`) in Safari. Has about a minute. Folded first (386 by 580), maybe opened (951 by 600 in Safari, 951 by 669 without its bars).
- **The law student.** Russell's older brother, ADHD, the bar exam in February, wants help breaking big things down, and said the first impression matters. Sets it up on his iPhone at night (390 by 844) and later on his Mac (1440 by 900). I typed "Nate" as his name.

Sizes: Duo folded 386x580, iPhone 390x844, Duo open 951x669 and 951x600, iPad 1024x1366, Mac 1440x900.

Not listed again: everything on tonight's fix list (drag feel and touch stretch handles, the goals and to-dos items, the phone's first view after setup, the Smart breakdowns sheet, the /api/smart error, and the rest). Where a finding sits next to one of those, it says so.

## How the first visit runs in V11
- A first visit no longer sees the welcome picture. V11 opens one page, "Set up your week." (`openSetupIntro` in `variants/corners11/variant.js`), with Start and Look around first, over a blurred made up family's week.
- The older welcome (the week picture, "Your week, in blocks.", three tiles, From Jess, the lock line, Other ways in) still exists. Only Settings, Your data, Start over reaches it (`openWelcome('first')` from the Start over button in `board/src/app.js`). So there are two front doors, and the one people see first is the thinner one.
- Start opens the setup a question at a time. The iPhone walk was 15 screens after the first page: name, home, what gets in the way, what changes, what it helps with, days, work, calendar, try, see further ahead, dinner, to-do, reset time, building, the plan.
- Look around first leaves you on Alex, Sam, and Robin's week. The way back to your own: on a computer, the name chip's menu, Set up my own week. On a phone, the SUNDAY RESET kicker (which is Settings), then Overview, then Set up mine.
- WebKit showed the same first page and the same Look around first. The only failed loads were `/api/smart` and `/api/config` (404 locally, as expected).

## 1. The link, before it opens

**Screen**: the message bubble when Jess pastes the link into Messages. Can't be shot headless; read from the page's head (`board/index.html`, and `scripts/make-variants.mjs` line 48, which writes the title). Any size.

**What they're thinking** (Apple Store visitor):
- "Jess sent me something. The preview says Sunday Reset · Corners V11 and has no picture."
- "Corners V11? Is this a test build?"
- "I'll tap it because Jess sent it, not because the preview told me anything."

**Improvements**:
1. **Give the link a preview.** Add `og:title` "Sunday Reset", `og:description` (the same line as item 3), `og:image` (a 1200 by 630 picture of the desk with a week on it), and `twitter:card` summary_large_image. Why: "A picture of the desk would tell me what this is before I tap." UI. S. `board/index.html`, a new image beside `board/icons/`.
2. **Keep the version out of the title.** The page and every preview say "Sunday Reset · Corners V11". Title it "Sunday Reset"; the variant's name can live in a meta tag for Russell. Why: "Corners V11 sounds like a prototype." Copy. S. `scripts/make-variants.mjs`.
3. **One short description, spelled the app's way.** The meta description says "to dos" and runs two sentences; use the manifest's line for the description and the preview, "Your week as wooden blocks. Plan it on Sunday, live it on your phone." Why: "One line I can read in the bubble." Copy. S. `board/index.html`.

## 2. The first page, "Set up your week."

**Screen**: what a first visit opens half a second after load (fresh origin, also with `?from=Jess`). All five sizes, 951x600, and WebKit. Shots: `02-duo-folded-intro.png`, `14-duo-folded-intro-day.png`, `120-webkit-duo-folded-intro.png`, `03-iphone-intro.png`, `04-duo-open-intro.png`, `119-duo-open-669-intro-again.png`, `113-duo-open-600-intro.png`, `05-ipad-intro.png`, `01-mac-welcome.png`.

**What they're thinking**:
- Apple Store visitor: "About 5 min, Set up your week. I don't know what this is yet and it wants five minutes."
- "Behind this, a made up family's week. Behind what? On the phone this card is the whole screen."
- "Nothing says Jess sent it, or where what I type goes."
- Law student: "Four parts with minutes is good; I like knowing how long. Start what, though?"
- Law student, on his phone the next day: "I set this up on my Mac. Where do I bring it in here?"

**Improvements**:
1. **Lead with what it is, then the ask.** Put the week picture from the older welcome at the top (`onbWeekRows`, the one with a gold block dropping into Saturday), the headline "Your week, in blocks.", one line "Plan it on Sunday. Move anything as the week happens.", and "From Jess" with her initial when the link carried `?from` (the older welcome does this in `onbWelcome`, `board/src/app.js`; the V11 page never reads `sharedBy`). Fold the four-part list into one line under the button: "Four short parts: About you, Your week, Try it, Your plan." Why: "Show me the thing before you ask me for five minutes." UI and copy. M. `variants/corners11/variant.js` (`openSetupIntro`, `SETUP_PARTS`), `board/src/app.js` (`onbWeekRows`).
2. **Name the buttons for what they do.** "Start" becomes "Set up my week" with "About 5 minutes" under it; "Look around first" becomes "Look at a sample week". Why: "Start what? Look around at what?" Copy. S. `variants/corners11/variant.js`.
3. **Bring back Other ways in and the lock line.** Folded at the foot: "Load a backup" and "See the week as a list", over "Stays on this device. Nobody else sees it." Why (law student, second device): "I already have a week; I need a way in that isn't a new setup." UI. S. `variants/corners11/variant.js` (reuse the disclosure from `onbWelcome`).
4. **On iPhone and iPad Safari, ask for the Home Screen before the setup, not after.** One quiet line when the page isn't running from the Home Screen: "On iPhone, add Sunday Reset to your Home Screen first and set up there. Safari can clear a site after a week without a visit." with "Show me how". Today the week is built in Safari, and then a card asks you to download a backup, add the app, open it there, and load the backup (screen 25). Why (law student): "Don't let me build a week here that I'll have to move later." Feature. M. `variants/corners11/variant.js`, `board/src/app.js` (`keepAtRisk`, `keepWords`).
5. **Show there's more on the open Duo.** At 951 by 669 the card cuts off after Try it. It scrolls (754 of 609), but nothing shows that it does. Item 1 removes the list; if it stays, fade its foot the way the meal board's More below does. Why: "I thought there were three parts." UI. S. `variants/corners11/css/duo.css`.

## 3. Look around first: the sample week

**Screen**: Look around first on the first page. The folded Duo and iPhone get the phone's list; the open Duo, iPad, and Mac get the desk in the Planner's week. Shots: `15-duo-folded-lookaround-day.png`, `06-duo-folded-lookaround.png` (10:54 pm), `07-duo-folded-list-2.png` to `09-duo-folded-list-end.png`, `16b-duo-folded-desk-later.png` (Open the desk), `118-iphone-sunday-lookaround.png`, `101-duo-open-lookaround.png`, `102-ipad-lookaround.png`, `12-mac-lookaround.png`, `121-webkit-duo-folded-lookaround.png`.

**What they're thinking**:
- Apple Store visitor (folded): "Work, 2 h 15 min left. Next: Pick up Robin. Who is Robin? Is this someone's real calendar?"
- "Nothing here says it's an example. At night it's a grey Sleep bar and 7.5 h of sleep left."
- On the desk: "The desk is lovely. Then a box says See every kind of Wednesday side by side, which means nothing to me."
- On the iPad and the Mac: "The first thing it tells me is that this browser can clear my board. What board? I haven't made one."
- On the iPad: "The gold button says Plan the rest of the week. It opened a page that looks like the setup, about somebody's four to-dos."

**Improvements**:
1. **Say it's a sample, everywhere, with the way out one tap away.** A slim line at the top of the phone's list and on the phone desk's bar: "A sample week" with a "Set up my week" button. On the iPad and the open Duo the name chip shows only "A"; give it "Sample", as the Mac's chip says "Alex, Sample week". Why: "I didn't know whose week this was." UI. M. `board/src/app.js` (`renderToday`, `renderPhoneBar`), `variants/corners11/variant.js` (the `c-me c-sample` chip), its compact rule in `variants/corners11/css/frame.css` or `duo.css`.
2. **On the sample, the gold button is "Set up my week".** "Plan the rest of the week, 7 min" opens a page shaped like the setup's first page, about Alex's 4 to-dos and 2 meals (`104-ipad-sample-plan-rest.png`). Hide it, or make it quiet, while the board is the sample. Why: "I thought that was the setup." UI. S. `variants/corners11/variant.js` (the bar's reset button, `planTitle`, `openPlan`).
3. **No warning about losing a board that doesn't exist.** At boot, "This browser can clear your board after seven days without a visit." shows on Mac Safari, iPad, and the open Duo on a first visit, because `backupAt()` is zero; on the Mac it lands over the setup's first step too (`50-mac-setup-name.png`). Show it only once a board of their own is saved. Why: "Don't warn me about losing something I haven't made." UI. S. `board/src/app.js` (the boot chain's `keepAtRisk()` branch: add `saved && !who().sample`).
4. **Teach the one move first.** On the first Look around, one coach on a block: "Drag any block. Everything here moves like that. It's a sample, so try anything." in place of the kinds-of-day tip, which fires on the phone's desk and again on the first landing (screen 22). Why: "In a minute I want to feel it, not read about kinds of day." UI. M. `board/src/app.js` (`coach`), `variants/corners11/variant.js` (where the kinds tip fires).

## 4. Leaving the sample

**Screen**: the ways from the sample to your own setup. Mac and iPad: the name chip's menu, Set up my own week (gold), which reopens the first page. Phone: SUNDAY RESET, Settings, Overview, Set up mine. Shots: `103-ipad-name-menu.png`, `71-mac-name-menu.png` (an own board, for comparison), `10-duo-folded-kicker-tap.png`, `11-duo-folded-settings-overview.png`.

**What they're thinking**:
- Apple Store visitor, back that evening on the phone: "I want my own now. Where? No menu, no button, nothing that says set up."
- "SUNDAY RESET at the top is a button? It opened Settings."
- "Overview has Set up mine. Under it: No backup yet, Keep it on your Home Screen, for a week that isn't mine."
- Law student: "Set up my own week, Set up mine, Start, Set up my week. Four different things?"

**Improvements**:
1. **The phone gets the door the desk has.** "Set up my week" at the top of the list while the board is the sample (with screen 3, item 1), not three taps into Settings. Why: "I want my own week and I can't find the door." UI. S. `board/src/app.js` (`renderToday`).
2. **One name for one action.** "Set up my week" on the first page, in the menu (now "Set up my own week"), in Settings Overview (now "Set up mine"), and on the older welcome. Why: "Four names made me think they were four things." Copy. S. `variants/corners11/variant.js` line 200, `board/src/app.js` (the Overview's sample note).
3. **No safekeeping advice for a week that isn't theirs.** While it's the sample, Overview leaves out Keeping your week (No backup yet, Keep it on your Home Screen, Download a backup). Why: "That reads like a warning about a week that isn't mine." UI. S. `board/src/app.js` (the Overview page).

## 5. The older welcome (after Start over)

**Screen**: Settings, Your data, Start over, tap again. Opens the picture welcome, not V11's first page. Mac, folded Duo, iPhone. Shots: `76-mac-after-startover.png`, `77-mac-old-welcome-otherways.png`, `106-duo-folded-old-welcome.png`, `107-iphone-old-welcome.png`.

**What they're thinking** (law student, starting over):
- "The front door is different from the first time. This one tells me more about the app."
- "The big gold button's words are white on pale gold. I can barely read Set up my week."
- "Other ways in has two links I can hardly hit."

**Improvements**:
1. **Fix the button's ink.** "Set up my week" is white (255, 255, 255) and "About 5 minutes" pale teal (215, 238, 233) on gold (242, 207, 122): about 1.5 to 1. Use the gold button's dark ink (28, 28, 30) for both lines, the second at 13 px. Why: "I can't read the most important button." UI. S. `board/src/style.css` (the welcome's `.go` `b` and `small`), or `variants/corners11/polish.css` where V11 restyles gold buttons.
2. **One front door.** Start over opens the same first page a first visit gets; after screen 2's changes, the two pages are one. Why: "Two welcomes made me wonder if I'd broken something." UI. S. `board/src/app.js` (the Start over button on Your data), `variants/corners11/variant.js` (`openSetupIntro`).
3. **Real targets in Other ways in.** "A backup file" and "The week as a plain list" are 18 px tall lines of text; make each a 44 px row with a line under it ("Load a backup made on another device"). Why: "Those links are too small to hit." UI. S. `board/src/app.js` (`onbWelcome`), `board/src/style.css`.

## 6. Setup, About you: "First, what should we call you?"

**Screen**: Start. iPhone, folded Duo, Mac. Shots: `20-iphone-setup-name.png`, `80-duo-folded-name.png`, `50-mac-setup-name.png`.

**What they're thinking** (law student):
- "Easy. A name."
- "The card is huge and empty under one box. Is something missing?"
- On the Mac: "A toast about my browser clearing my board slid over the bottom of the card, right by Next."

**Improvements**:
1. **No toast during the setup.** The keep toast lands on the card beside Next on Mac Safari (screen 3, item 3 removes it). Why: "A warning slid over the button I was about to press." UI. S. `board/src/app.js` (boot).
2. **Use the empty card to make it theirs.** As they type, show the name as it'll sit on the board: the chip with their initial and "Nate's week", in the board's type, under the box. Why: "Seeing my name on it makes it mine." UI. S. `board/src/app.js` (`ONB.name`).
3. **Fewer words, bigger targets.** Drop the "Your name" label (the question is the label; keep it as `aria-label`). On a computer Next is 38 px tall and the close mark 40; make both 44. Why: "The label says what the question already said." UI. S. `board/src/app.js` (`ONB.name`), `board/src/style.css` (`.onb .go`, `.onb-x`).

## 7. Setup, About you: "Who's at home?"

**Screen**: iPhone (alone), folded Duo (a family with one kid), Mac. Shots: `21-iphone-setup-home.png`, `81b-duo-folded-home-family.png`, `81c-duo-folded-home-kid.png`, `51-mac-home.png`.

**What they're thinking**:
- Law student: "Only me is already picked. Fine."
- A parent on the folded Duo: "I tapped A family with kids and nothing seemed to happen. The kids box is below the fold."
- "Press Enter after each name. My keyboard says return."

**Improvements**:
1. **Bring new fields into view.** Picking "Me and a partner" or "A family with kids" scrolls Partner and Kids up under the tiles and focuses Partner. Why: "I didn't see the kids box appear." UI. S. `board/src/app.js` (`ONB.home`, after `renderSheet`).
2. **An Add button for each name on touch.** Keep Enter, add a visible "Add" beside the kids box, and set the keyboard's key with `enterkeyhint="next"`. Why: "My keyboard doesn't say Enter." UI. S. `board/src/app.js` (`peopleField`).
3. **44 px boxes.** The partner and kids boxes are 38 px tall on the folded Duo. Why: "My thumb keeps missing the box." UI. S. `board/src/style.css` (`.onb input`).

## 8. Setup, About you: "What gets in the way?"

**Screen**: iPhone (with Something else typed), Mac, folded Duo, open Duo. Shots: `22-iphone-setup-pains.png`, `23-iphone-setup-pains-picked.png`, `52-mac-pains.png`, `82-duo-folded-pains.png`, `115-duo-open-600-pains.png`.

**What they're thinking** (law student):
- "Too much lives in my head, things slip, plans fall apart: yes. The thing I came for isn't here: big things I can't start."
- "I typed it in Something else: Starting big things. ADHD, and the bar exam in February. The tile didn't even light up."
- "The box is one line; my sentence scrolled away while I typed."
- "Picked tiles get a gold ring and a check. Later, white means picked. Which is it?"

**Improvements**:
1. **Add the pain this version answers.** "Big things are hard to start", line "An exam, a paper, a move". It turns on Goals, puts Make it a goal and Break it down into the tries, and leans the plan toward Goals. For its research, reuse a study already checked (Gollwitzer and Sheeran, deciding when and where), or check a new DOI against Crossref first, as the others were. Why: "The thing I came for isn't on the list." Feature. M. `board/src/onboard.js` (`PAINS`, `reflect`, `movesFor`), `board/src/app.js` (`ONB.pains`).
2. **A Something else that listens.** A two-line box; its tile shows as picked once there are words; and the words are read for what the board knows (an exam through `Model.looksLikeGoal`), so later steps can answer them (screens 16, 18, 21). Why: "I wrote the most important thing and it went nowhere." Feature. M. `board/src/app.js` (`ONB.pains`), `board/src/model.js` (read only).
3. **One look for "picked" across the setup.** Tiles use a gold ring and a gold check; the day chips, the work halves, dinner's how, and the reset's days use white fill. The app's rule is white fill means selected and gold is the one call to action, so picked tiles go white with dark ink and a dark tick. Why: "Gold ring or white? I can't tell what's picked." UI. M. `board/src/style.css` (`.onb-pick[aria-checked="true"]`), `variants/corners11/polish.css`.
4. **A mark that says what it means.** "My plans fall apart" wears two linked rings, which read as wedding rings at tile size; use a block running past its lane. Why: "Is that wedding rings?" UI. S. `board/src/onboard.js` (`PAINS`), `board/src/icon-paths.js` (the Phosphor set).

## 9. Setup, About you: "Here's what changes" (the research)

**Screen**: after the pains. iPhone, Mac (mid turn and after), folded Duo. Shots: `24-iphone-setup-why.png`, `53-mac-why-turning.png`, `53b-mac-why.png`, `83-duo-folded-why.png`.

**What they're thinking** (law student):
- "The cards turned over and my own words disappeared. Now it's three gold cards that all say With Sunday Reset."
- "94 studies, nice. Nothing about what I typed in Something else."
- "This is screen five and I haven't seen my week yet."

**Improvements**:
1. **Keep their words on the turned card.** The small kicker says "You said: Things slip through the cracks" in place of "With Sunday Reset" on every card. Why: "I want what I said next to what changes." Copy. S. `board/src/app.js` (`ONB.why`).
2. **Less gold.** Turned cards in the quiet surface with a gold mark, so the screen's one gold thing is Next (today: three gold cards and a gold button). Why: "Everything is gold, so nothing stands out." UI. S. `board/src/style.css` (`.onb-face-then`).
3. **Answer Something else here.** One more card for their own words: what the board does about them when the words were recognized ("The bar exam: a goal with a date, spread over the weeks before it"), or "We'll come back to this on your plan" when they weren't. Why: "It skipped the thing I typed." Feature. M. `board/src/app.js` (`ONB.why`), `board/src/onboard.js` (`reflect`).

## 10. Setup, About you: "What should it help with?"

**Screen**: iPhone (alone), folded Duo (a family), Mac. Shots: `25-iphone-setup-help.png`, `25b-iphone-setup-help-end.png`, `84-duo-folded-help.png`, `54-mac-help.png`.

**What they're thinking**:
- Law student: "Meals, Moving more, Something of yours, Friends and family, Home. Nothing for studying or a goal."
- A parent: "Meals and Time together are already picked, and there's a gold dot by Meals. What's the dot?"
- "Every board also has to-dos and the Sunday Reset. Good to know."

**Improvements**:
1. **A tile for a big goal.** "A goal with a date", line "An exam, a race, a project". Picking it adds a step after Try it that sets the goal up through the existing goal flow (screen 16's offer). Why: "Nothing here is for studying." Feature. M. `board/src/onboard.js` (`FOCUS` or a new part in `PARTS`), `board/src/app.js` (`ONB.help`), goals in `board/src/model.js` (`newGoal`, `goalForExam`).
2. **Say what the gold dot means.** Its meaning lives in a title attribute, which a phone never shows. A 12 px line under the tile: "You said dinner is a scramble." Why: "What's the dot?" Copy. S. `board/src/app.js` (`ONB.help`, `onb-said-dot`).
3. **Picked because they said so.** Meals and Time together start picked for everyone; start them picked when a pain asked for them, and say "Pick any, or none." Why: "A picked answer reads as already decided for me." UI. S. `board/src/app.js` (`blankAnswers`, `ONB.help`). This changes the board's defaults, so it's also under Russell's decisions.

## 11. Setup, Your week: "When do your days start and end?"

**Screen**: iPhone, Mac, folded Duo. Shots: `26-iphone-setup-days.png`, `55-mac-days.png`, `85-duo-folded-days.png`.

**What they're thinking** (law student):
- "6:30 and 10:30. My days aren't that regular, but OK."
- "The picture is two bars with dark ends. It doesn't tell me anything."
- "Each tap is half an hour. Nine taps to get to 11 am."

**Improvements**:
1. **Show the number the picture is for.** Each bar holds "16 h awake", hidden on phones (`display: none`). Show it at 12 px. Why: "Tell me what the bars mean." UI. S. `board/src/style.css` (`.onb-b small` at narrow widths).
2. **Steppers that line up.** "10:30 pm" makes its stepper wider than "11 pm", so the columns don't line up, and on a 390 phone the + touches the card's edge. Give the value a set width with tabular figures, and stack Bed under Up below 400 px. Why: "The plus is jammed against the edge." UI. S. `board/src/style.css` (`.row2`, the stepper).
3. **Pick, then adjust.** Three tiles above the steppers, "Early: 6 am to 10 pm", "Usual: 7 am to 11 pm", "Late: 9 am to 1 am", each setting both rows, with the steppers left to fine tune. Why: "I'd rather pick than tap nine times." UI. S. `board/src/app.js` (`ONB.days`).

## 12. Setup, Your week: "When do you work?"

**Screen**: iPhone (and with No set work hours), Mac, folded Duo. Shots: `27-iphone-setup-work.png`, `27b-iphone-setup-work-end.png`, `28-iphone-setup-work-none.png`, `56-mac-work.png`, `86-duo-folded-work.png`.

**What they're thinking** (law student):
- "I'm a student. I have classes and I study all day. Is that work?"
- "No set work hours, Days, Mine to plan or Set like a shift, My hours change week to week, The same hours every day, Starts, Ends. That's a lot for one question."
- On the phone: "The colored bars at the top have no key."

**Improvements**:
1. **Ask what fills the day, not only work** (upstream: the setup assumes a job). "What fills your weekdays?" with tiles Work, School, Both, Neither. School makes a Class block (and a Study block when they picked the goal tile); Neither is today's No set work hours. Why: "I'm a student. Is that work?" Feature. M. `board/src/app.js` (`ONB.work`), `board/src/data.js` (`buildState` block names), `board/src/onboard.js` (`buildLines`).
2. **Fewer controls at once.** Days and hours first; "Mine to plan or Set, like a shift", "My hours change week to week", and per-day hours under one disclosure, "More about your hours". Why: "That's a lot for one question." UI. M. `board/src/app.js` (`ONB.work`).
3. **The key on phones too.** Yours, Work, Meals, Sleep in one row at 12 px; without it the bars are colors with no meaning (`onbWeekRows(..., !phoneWidth())` turns it off). Why: "What do the colors mean?" UI. S. `board/src/app.js`.

## 13. Setup, Your week: "Drop off and pick up"

**Screen**: folded Duo, a family with one kid. Shot: `87-duo-folded-kids.png`.

**What they're thinking** (a parent):
- "Days, drop off, pick up. Clear."
- "The two time boxes are jammed together; I nearly hit pick up's minus for drop off's plus."
- "Wednesdays are early release. Where does that go?"

**Improvements**:
1. **Stack the two times on narrow windows.** Under 420 px, drop off's + touches pick up's minus, and pick up's + runs to the card's edge. Put Pick up at under Drop off at. Why: "I nearly hit the wrong button." UI. S. `variants/corners11/css/duo.css` or `board/src/style.css` (`.dcard .row2`).
2. **Different on some days.** A link under the times that opens per-day pick up times (an early release Wednesday), the way work has per-day hours. Why: "Wednesdays are early release." Feature. M. `board/src/app.js` (`ONB.kids`), `board/src/data.js` (`buildState` cares).
3. **A plainer line.** "They lock on the board, so nothing pushes them." becomes "These stay put. Nothing you add moves them." Why: "Lock? Pushes? Say it plainly." Copy. S. `board/src/app.js` (`ONB.kids`).

## 14. Setup, Your week: "Bring in a calendar?"

**Screen**: iPhone, folded Duo, Mac. Shots: `29-iphone-setup-calendar.png`, `88-duo-folded-calendar.png`, `57-mac-calendar.png`.

**What they're thinking** (law student, on his iPhone):
- "A file ending in .ics. How to get the file: On a computer... On a Mac... I'm on my phone."
- "So Next means skip. OK."

**Improvements**:
1. **Leave it out on a phone.** A phone can't export a calendar file, and every instruction starts on a computer. On a phone, skip the step and put "Bring in a calendar" in Getting started for the computer, line "From Google, Apple, or Outlook, as a file ending in .ics." Why: "I'm on my phone; I can't do this here." UI. S. `board/src/onboard.js` (`stepsFor` with a phone flag, `MOVES`, `movesFor`).
2. **Say later is fine.** Under the card: "Later works too: Settings, Calendars." Next keeps its name. Why: "Is it OK to skip this?" Copy. S. `board/src/app.js` (`ONB.calendar`).
3. **Take a dropped file on a computer.** Drag an .ics from Finder onto the card. Why: "The file is right here in Finder." Feature. S. `board/src/app.js` (`ONB.calendar`, dragover and drop on the card).

## 15. Setup, Try it: "Put something on Thursday"

**Screen**: iPhone (the demo, a touch drag, placed, stretched), Mac (demo, mouse drag, placed), folded Duo (tapped). Shots: `30-iphone-setup-try.png`, `30b-iphone-setup-try-idle.png`, `31-iphone-try-dragging.png`, `32-iphone-try-placed.png`, `33-iphone-try-stretched.png`, `58-mac-try.png`, `60-mac-try-placed.png`, `89-duo-folded-try.png`, `90-duo-folded-try-tapped.png`.

**What they're thinking** (law student):
- "A finger is already dragging Workout while I'm reading what to do."
- "The day is a strip of colored slivers. What are the green ones?"
- "I nudged the edge and Workout became 2 h 30 min." (a 27 px drag added an hour and a half)
- "Workout, Walk, Reading. I'd have put Study there."
- On the Mac: "It says Nothing else moved, but my Work block got cut in two around it."

**Improvements**:
1. **Zoom the lane once a block lands.** A whole day fits in about 300 px on a phone, so an hour is about 19 px: names don't print, and a small stretch is an hour and a half. After the drop, show the six hours around the block, so names print and a stretch moves 15 minutes at a step you can see. (Tonight's drag fix covers lift and the handles; this is the lane's scale.) Why: "I can't see what I'm stretching." UI. M. `board/src/app.js` (`ONB.try`: `lo`, `hi`, `onbLane`).
2. **Pieces that fit what they said.** An exam or the goal tile gives "Study 1 h"; Moving more gives Workout and Walk; Something of yours gives Reading; anyone else keeps today's three. Why: "I'd have put Study there." UI. S. `board/src/app.js` (`ONB.try`, `pieces`).
3. **Let them read first.** The demo starts after 4 seconds without a touch, not on arrival ("Watch: drag a block onto the day." plays at once today). Why: "Something moving while I read splits my attention." UI. S. `board/src/app.js` (`ONB.try`, `playDemo`).
4. **Say what happened to soft time.** When a block lands inside Mine to plan work, the line says "Work makes room around it." instead of "Nothing else moved." Why: "It said nothing moved, but Work got cut." Copy. S. `board/src/app.js` (`ONB.try`, `drop`).

## 16. Setup, Try it: "See further ahead"

**Screen**: iPhone (the zoom, then Bar exam on Feb 23), Mac, folded Duo. Shots: `34-iphone-ahead.png`, `34b-iphone-ahead-later.png`, `35-iphone-ahead-barexam.png`, `35b-iphone-ahead-barexam-top.png`, `61b-mac-ahead-later.png`, `91-duo-folded-ahead.png`.

**What they're thinking** (law student):
- "It zooms from Day to Month to Year by itself. Pretty."
- "Something coming up: Bar exam, February 23. Bar exam goes on your board as a marker."
- "A marker? That's why I'm here. I want to know what to do each day until then."
- On the folded Duo: "I watched a calendar move and pressed Next. I never saw a box to type in." (it's below the fold)

**Improvements**:
1. **Offer the goal where the date is typed.** When `Model.looksLikeGoal(name)` is true, under the line: "The bar exam is about 400 hours of study, a common estimate. That's about 21 hours a week until Feb 23." with "Make it a goal" (the goal flow with the date and the exam's parts filled in from `goalForExam`; a toast with Undo when it's made) and "Mark the date only". Why: "This is the moment I'd decide the app is for me." Feature. M. `board/src/app.js` (`ONB.ahead`, `openGoalFlow`), `board/src/model.js` (`looksLikeGoal`, `goalForExam`), `board/src/data.js` (`EXAMS`, read only).
2. **The question first on short windows.** Under 640 tall, put "Something coming up" and its date above the picture, and the picture at half height. Why: "I never saw a box to type in." UI. S. `board/src/app.js` (`ONB.ahead`), `variants/corners11/css/duo.css`.
3. **Name the thing in the year.** The Feb card says "Bar exa"; let a marker's name take two lines in the card, or show its mark and "Feb 23". Why: "Bar exa?" UI. S. `board/src/app.js` (the year cards in `ONB.ahead`).

## 17. Setup, Try it: "How's dinner happening?"

**Screen**: iPhone (Cook, then Tacos), Mac, folded Duo. Shots: `36-iphone-dinner.png`, `37-iphone-dinner-cook.png`, `38-iphone-dinner-tacos.png`, `62-mac-dinner.png`, `92-duo-folded-dinner.png`.

**What they're thinking** (law student):
- "I never said dinner was a problem. Fine: Cook, Tacos."
- "The grocery line is nice: Ground beef, Tortillas, Peppers, Onion."
- "Cook turned white when I picked it; every tile before turned gold."

**Improvements**:
1. **Ask about dinner here only when they said it's hard.** Show this step when they picked "Dinner is a nightly scramble"; for everyone else, Pick a dinner waits in Getting started. One screen fewer for most people. Why: "I never said dinner was a problem." UI. S. `board/src/onboard.js` (`stepsFor`).
2. **One look for picked.** See screen 8, item 3. Why: "Gold before, white now." UI. M.
3. **Room above "Or something else".** It sits 8 px under the recipe tiles; give it the 16 px every other field gets. Why: "That label is crammed against the tiles." UI. S. `board/src/style.css`.

## 18. Setup, Try it: "Anything you need to get done?"

**Screen**: iPhone ("Study for the bar exam"), Mac ("Outline torts by Friday"). Shots: `39-iphone-todo.png`, `40-iphone-todo-bar.png`, `63-mac-todo.png`, `110-mac-todo-typed.png`.

**What they're thinking** (law student):
- "Study for the bar exam. No due date yet. It waits in your to-dos."
- "I told you the exam is Feb 23, two screens ago."
- "Too much lives in my head, and I get to add one thing?"
- "This one is huge. Where's break it down?"

**Improvements**:
1. **A big to-do offers its next move.** Under the preview, "Make it a goal" when `looksLikeGoal` is true and "Break it down" when the breakdown library knows it (`Model.breakdown`), each a quiet 44 px button that opens the real flow with a toast and Undo. Why: "This one is huge. Where's break it down?" Feature. M. `board/src/app.js` (`ONB.todo`), `board/src/model.js` (`breakdown`, `looksLikeGoal`, read only).
2. **Join it to the date they gave.** When the words match the thing from See further ahead ("bar exam"), offer "Due Feb 23?" with one tap. Why: "I told you the date two screens ago." Feature. S. `board/src/app.js` (`ONB.todo`).
3. **Empty your head.** For "Too much lives in my head", a box that takes one to-do per line and grows (the board already reads a pasted list). Why: "I have ten things in my head, not one." Feature. M. `board/src/app.js` (`ONB.todo`, `onbExamples`).
4. **Hide the examples once they type.** The three pills stay and push the preview down. Why: "The examples are in my way now." UI. S. `board/src/app.js` (`ONB.todo`, `suggests`).

## 19. Setup, Your plan: "When's your Sunday Reset?"

**Screen**: iPhone (and Another time), folded Duo, Mac. Shots: `41-iphone-reset.png`, `116-iphone-reset-another-time.png`, `93-duo-folded-reset.png`, `64-mac-reset.png`.

**What they're thinking** (law student):
- "Sunday evening, 7 pm. Your first one: Sunday, Oct 18. OK."
- "Add it to my calendar is gold too, and smaller than everything else."
- "Another time, any day and time. It offers Saturday, Sunday, and Monday."

**Improvements**:
1. **A quiet calendar button.** "Add it to my calendar" is a gold outlined button 36 px tall beside a gold Next and a gold line. Make it a quiet 44 px button; Next stays the one gold thing. Why: "Two gold buttons; which one is next?" UI. S. `board/src/app.js` (`ONB.reset`, `'go gold'`), `board/src/style.css`.
2. **Any day means any day.** "Another time: Any day and time" offers three days; offer the seven day chips (`dayChips`), or say "Saturday to Monday". Why: "It said any day, and gave me three." Copy or UI. S. `board/src/app.js` (`ONB.reset`).
3. **The date in white.** "Your first one: Sunday, Oct 18 at 7 pm." is gold text; make it white. Why: "Too many gold things on one screen." UI. S. `board/src/style.css` (`.onb-first`).

## 20. Setup, Your plan: "Building your week"

**Screen**: after the reset step. iPhone (33 percent, then 100), Mac, folded Duo. Shots: `42-iphone-build-1.png`, `42c-iphone-build-3.png`, `65-mac-build.png`, `94-duo-folded-build.png`.

**What they're thinking** (law student):
- "A ring fills while I wait. See my plan is grey until it's done: about six seconds."
- "The lines are my answers. Marking Bar exam? Like grading it?"
- "I still haven't seen my week. Behind this card it's blurred, and it's somebody else's."

**Improvements**:
1. **Build it on the desk.** Close the card and let their week land on the board day by day (the Sunday Reset's authored moment, the week clicking into place), with these lines as captions, then the plan. The desk is what makes this app different, and the setup never shows it. Remove the percent ring. Why: "I still haven't seen my week." UI. L (M if it reuses the reset's finish). `board/src/app.js` (`ONB.build`, `finishSetup`), `board/src/scene.js` (the finish's press and settle).
2. **If the screen stays, no forced wait.** See my plan works at once; the lines tick in about 1.5 seconds, not 6. Why: "Let me go on; I can read." UI. S. `board/src/app.js` (`ONB.build`).
3. **Plain verbs.** "Marking Bar exam" becomes "Putting Bar exam on Tuesday, Feb 23". Why: "Marking it? Like grading?" Copy. S. `board/src/onboard.js` (`buildLines`).

## 21. Setup, Your plan: "Here's your week" (the plan)

**Screen**: See my plan. iPhone, Mac, folded Duo. Shots: `43-iphone-plan.png`, `43d-iphone-plan-end.png`, `66-mac-plan.png`, `66b-mac-plan-end.png`, `95-duo-folded-plan.png`.

**What they're thinking** (law student):
- "37 h yours a week, 60.5 h open, 7 dinner nights. What's the difference between yours and open?"
- "Lean on: Kinds of day and moving blocks. I don't know what kinds of day are, and tapping it does nothing."
- "Starting big things, ADHD, the bar exam: It's in your to-dos as Look at. Bring it to your first Sunday Reset. That's four days away. I wanted help with it now."
- On the Mac: "Here's your week, and the week behind the card is still the made up family's."

**Improvements**:
1. **Lead with their reason.** When they named a big thing (a pain, Something else, See further ahead, or a to-do), the first card is it, with an action: "Bar exam, Tue Feb 23. About 21 hours a week from now." and "Make it a goal". It replaces "Bring it to your first Sunday Reset." Why: "I wanted help with it now, not on Sunday." Feature. M. `board/src/app.js` (`ONB.plan`), `board/src/onboard.js` (`leanFor`).
2. **One number people feel.** "37 h yours a week" beside "60.5 h open" read as the same kind of thing. Lead with "About 5 h a day that's yours", and say open as "60 h not planned yet", or leave it out. Why: "What's the difference between yours and open?" Copy. S. `board/src/app.js` (`ONB.plan`), `board/src/onboard.js` (`planStats`).
3. **Cards that look tappable do something.** Already on your board and Lean on are cards with no action. Each opens what it names after Open my week (Due soon, the notepad, Kinds of day), or they become plain lines without a card. Why: "I tapped it and nothing happened." UI. S to M. `board/src/app.js` (`ONB.plan`).
4. **Their week behind the card.** On a computer the board is swapped only at Open my week (`finishSetup`), so "Here's your week" sits over the sample's week. Show `su.built` behind the card (or build it there, screen 20). Why: "That's not my week behind the card." UI. M. `board/src/app.js` (`onbBuild`, `finishSetup`).

## 22. Open my week: the first landing

**Screen**: Open my week. iPhone at 9:34 pm and folded Duo at 2:31 pm (the phone's list; tonight's fix sends the first open to the desk), Mac (the week in the Planner). Shots: `44-iphone-after-open.png`, `96-duo-folded-opened.png`, `67-mac-opened.png`, `111-mac-opened-2.png`.

**What they're thinking** (law student):
- On the iPhone: "Your week is ready, and another box on top of it about every kind of Wednesday. Two messages, both over my list."
- On the Mac: "A list of six things on the right, a popover with a gold button about This week's plan over the bottom of that list, and a toast. Where do I look?"
- "This week's plan? I finished my plan a second ago."
- "Where's the bar exam? Nothing about it today."

**Improvements**:
1. **One thing on landing.** Hold every discovery tip (the kinds-of-day toast, the "Your plan for the week is here" popover) for the first session. The landing is the week, "Your week is ready, Nate.", and Getting started. Why: "Two messages at once; where do I look?" UI. S. `variants/corners11/variant.js` (the popover, the kinds tip), `board/src/app.js` (`finishSetup`'s toast).
2. **Two things called plan.** The setup's fourth part is "Your plan" and the bar's button is "This week's plan". Rename the setup's part "Ready", or the button "Plan this week". Why: "I finished my plan a second ago." Copy. S. `board/src/onboard.js` (`CHAPTERS`), `variants/corners11/variant.js` (`planTitle`). Russell's call.
3. **The big thing, once.** When they marked a goal-like date, the first landing's one line (in the kinds tip's place) is "Bar exam in 19 weeks." with "Make it a goal". Why: "Where's the bar exam?" Feature. S to M. `board/src/app.js` (`finishSetup`), `variants/corners11/variant.js`.

## 23. Getting started

**Screen**: the phone's card (Getting started, 1 of 5; See all 5), the desk's panel (Six things to try), and Show me. iPhone, folded Duo, Mac. Shots: `45-iphone-moves-all.png`, `96-duo-folded-opened.png`, `68-mac-moves-panel.png`, `68b-mac-moves-panel-end.png`, `69-mac-showme-place.png`, `70-mac-after-gotit.png`, `112-mac-showme-todo.png`.

**What they're thinking** (law student):
- On the iPhone: "Add a to-do, Pick a dinner. I did both two minutes ago."
- On the Mac: "Put a block on a day, Stretch a block. I did that in Try it."
- "Show me, Put a block on a day: Block library sits beside the day. It doesn't. There's no Block library on screen."
- "I tapped Got it and the whole list was gone. Where did it go?"

**Improvements**:
1. **Count what the setup did.** `startMoves` marks only build as done. Also mark place and stretch (`a.placed`, `a.placed.stretched`), dinner (`a.dinner`), and todo (`a.todo`), and offer the next useful ones in their place (See the month, Open the desk, Make it a goal). Why: "I did both two minutes ago." UI. S. `board/src/app.js` (`startMoves`), `board/src/onboard.js` (`movesFor`).
2. **Fix Show me for Put a block on a day.** V11 puts Block library away on every visit, so the tip's "Block library sits beside the day" is false. Open Block library first, ring a piece in it, then say "Drag one onto the day." Why: "It says Block library is beside the day. It isn't." UI. S. `board/src/app.js` (the move's coach), `variants/corners11/variant.js` (opening Block library).
3. **Keep the list one tap away while it's unfinished.** After Show me and Got it, it lives only in Settings, Help. Add "Open Getting started (2 of 6)" to the bottom bar while there's something left, as the tray bar had. Why: "Where did the list go?" UI. S to M. `variants/corners11/variant.js` (the bottom bar), `board/src/app.js` (`movesButton`).
4. **The close mark over the words.** When the panel scrolls, its x sits over "1 of 6 done. Each one ticks itself..."; give the head its own row. Why: "The x is on top of the words." UI. S. `variants/corners11/polish.css` or `board/src/style.css` (the side panel's head).

## 24. The tour

**Screen**: Take the tour (gold, at the foot of Getting started). Mac. Shots: `73-mac-tour-1.png`, `73b-mac-tour-2.png`, `73c-mac-tour-3.png`, `73d-mac-tour-4.png`.

**What they're thinking** (law student):
- "Today and the Planner, T and P switch between them. I don't see Today or the Planner; I see Now, Day, Week."
- "The tray: Settings, The tray bar, changes what's on it. There's no tray."
- "Every tip floats at the top and points at nothing."

**Improvements**:
1. **Point at V11's pieces.** Its four targets (`#modesw`, `#zoom`, `#rack-top`, `#corner`) are all hidden in V11 (0 by 0), so no ring ever shows. Use the zoom switch (Now to Year), the bottom bar's To-dos and Block library, Add, and the name chip. Why: "It points at nothing." UI. S. `board/src/app.js` (`TOUR`).
2. **Words for V11.** "Now is what you're in. Day to Year is the same week from closer or further." "To-dos and Block library: drag from them onto a day." "Add anything: type it the way you'd say it." "Your name: Settings, your plan, and meals." Why: "There's no tray." Copy. S. `board/src/app.js` (`TOUR`).
3. **End on a doing step.** The last tip asks them to drag a block, and the tour ends when they do. Or retire the tour and let Getting started's Show me carry it (Russell's call). Why: "Let me do it instead of reading four cards." UI. M. `board/src/app.js` (`startTour`).

## 25. The phone's Today after setup: the Home Screen cards

**Screen**: Open my week on the iPhone, scrolled to the end of the list. Shots: `46-iphone-keep-cards.png`, `46b-iphone-keep-cards-end.png`, `105-ipad-start-url-today.png` (the Home Screen's start address at iPad size).

**What they're thinking** (law student):
- "Two dark boxes with green house marks. I can read Download and Add it. Nothing else."
- "Something about Safari clearing, a backup, four steps. On day one?"
- On his iPad: "I added it to my Home Screen and it opened as a phone list on my iPad."

**Improvements**:
1. **Make them readable.** `variants/corners11/polish.css` line 67 gives every `.td-card` the near-black surface with `!important`, including the paper note cards, so their dark brown ink (42, 33, 24 on 24, 25, 29) is about 1.2 to 1: "Keep this week on your phone", its three steps, "Not this month", "Put it on your Home Screen", and "Not now" are all unreadable. Exclude `.td-note` (`.td-card:not(.td-note)`) so notes stay paper, as the phone's notes are meant to be. Why: "I can't read these." UI. S. `variants/corners11/polish.css`.
2. **One card, not two.** "Keep this week on your phone" and "Put it on your Home Screen" say the same thing back to back, each with a gold button. Keep one, with one gold button. Why: "The same thing twice." UI. S. `board/src/app.js` (`renderToday`, the keep and install cards).
3. **A start address that fits the window.** The Home Screen app opens on `/?today` (`board/manifest.webmanifest`, `start_url`), which forces the phone's list on an iPad and on the open Duo. Start at `/` and let the window decide. Why: "It opened as a phone list on my iPad." UI. S. `board/manifest.webmanifest`. Pairs with screen 2, item 4: asking before the setup means nobody has to move a week.

## The five changes that would matter most

1. **The bar exam gets a plan inside the setup.** The setup hears "Bar exam, Feb 23" and "Study for the bar exam", knows it (`looksLikeGoal`; `goalForExam` has 400 hours and its parts), and answers "a marker" and "Bring it to your first Sunday Reset". Offer Make it a goal at See further ahead, at the to-do step, and on the plan; add "Big things are hard to start" and "A goal with a date" to the questions. Screens 8, 10, 16, 18, 21. It's what the brother asked for, it's built, and the setup never points at it.
2. **A first page that says what this is.** The week picture, "Your week, in blocks.", From Jess, the lock line, Set up my week, Look at a sample week, and Other ways in, as one front door (the older welcome's button is unreadable, and only Start over reaches it). Screens 1, 2, 5.
3. **The sample says it's a sample, and the way out is one tap.** "A sample week" with Set up my week on the phone's list and on every chip; the gold button on the sample is Set up my week, not Plan the rest of the week; no data-loss toast before there's data. Screens 3, 4.
4. **Fix what's broken on the first landing.** The Home Screen cards are unreadable (one CSS rule), the tour points at V10's pieces in V10's words, Getting started asks for what the setup did, Show me promises a Block library that's put away, and two tips land on top of "Your week is ready." Screens 22 to 25, nearly all S.
5. **Show the payoff on the desk.** Build their week where they can see it (the reset's click into place) instead of a percent ring in front of a stranger's blurred week, and show the plan after. Screens 20, 21.

## For Russell to decide

- **Which front door.** V11's "Set up your week." page (the reset's shape) or the older picture welcome (it says what the app is, and has From, the lock line, and Other ways in). Suggested: one page with the older one's picture and words and V11's time and parts line.
- **How long the setup is.** The iPhone walk was 15 screens after the first page; for someone with ADHD that is the big task with no small first step. Options: fold the research into the plan, ask about dinner only when they said it's hard, skip the calendar on phones (three screens fewer together), or a short path (name, home, days, then the week) with the rest offered in Getting started.
- **Goals in the setup:** a pain tile, a help tile, the offer at See further ahead and the to-do step, or all three.
- **Home Screen before the setup** on iPhone and iPad Safari: it saves the four-step move later, at the cost of one more line on the first page.
- **"Your plan" and "This week's plan":** which keeps the name.
- **The tour:** rewrite it for V11, or retire it and let Getting started's Show me teach.
- **Defaults in What should it help with:** Meals and Time together start picked for everyone; keep them on (the board helps with dinners by default) or start them off unless a pain asked for them.
