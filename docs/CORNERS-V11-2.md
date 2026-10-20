# Corners V11-2 (Oct 20, 2026)

Live: https://sunday-reset-corners-v11-2.vercel.app (Vercel project `sunday-reset-corners-v11-2`, root `v/corners11-2`), live since Oct 20, 2026 from commit cb4572a (deployment `dpl_4SoPUqPkU8sNVyfwRK8ydSYcwFub`). Its own ANTHROPIC_API_KEY is set in that project; the server reads only the key from what was pasted. V11 stays at https://sunday-reset-corners-v11.vercel.app, frozen as it went live on Oct 15.

## Why it exists

The weekly limit stopped the V11 round on Oct 15. While it was stopped, other AIs made V12 and V13 (Codex, on branches `feat/v12-partner-upgrade` and `codex/v13-restore-desk`) and four "V13-ive" versions in their own repos. Russell called those V12, V13, and V14.

On Oct 20 Russell said V11 is the direction, and that the other versions misunderstood the product as a whole. He named the next round V11-2. We mined the other versions for ideas only, never their look or structure:
- the board stays big
- the desk stays the product
- nothing gets a new name

## How it's built

V11-2 grows from V11's source (`board/src`, `variants/corners11`). `node scripts/make-variants.mjs corners11-2` builds it into `v/corners11-2`, with body class `v-corners11 v-corners11-2 feel`, its own name, and its own link. `v/corners11` is frozen; the script refuses to rebuild it without `--thaw`.

## What shipped

**Big moments** (spec `docs/BIG-MOMENTS.md`, mock `docs/mocks/big-moments.html`, both approved by Russell). It answers his four scenarios: his brother's bar exam, reaching out to family before a trip, a friend's wedding, and packing the night before.
- **The engine** (Data.VERSION 9). Every step has a last good day, including steps after the date.
  - Getting ready covers going to things, hosting, travel, deadlines, and moves, shaped by who's at home.
  - Trips can have people to see.
  - Suggested texts come with three quick versions; the app never sends them.
  - Dates can be fuzzy ("sometime in spring").
  - Goals can have no date.
  - The bar exam has stages, practice exams, and lighter last days.
  - Place names are pulled from trip names.
- **The countdown:** the road from today to the date, drawn to scale. It opens from Look ahead, Goals, the board, the date card, and the phone.
  - Adding a trip asks "Anyone you want to see there?"
  - A date can be "Not sure yet".
  - Quick add understands "move in spring", "trip to Denver Dec 3 to 6", and "text Aunt Lisa about LA".
- **Steps are blocks** (Russell's Oct 15 notes on the to-do panel):
  - each step is a brick with a grip, and the circle means only Done
  - Next moves down the list as steps are done
  - a step not on the week is a dashed outline that says where a plan would place it
  - message steps have a suggested text, Edit (the bubble becomes the box), and Text
- **The list rides inside the block:** a packing list shows in Today's band and the phone's Now card.
- **Today asks once:**
  - the morning after: "2 things from yesterday didn't get a check", with Done, Move, or Let go
  - heads-ups: "Your aunt would love some notice. Text her this week?"

**From the V12 to V14 review:**
- **Your own time stays yours.** Planning uses open time, then asks once per action before it uses a Yours block, Breathing room, or a free evening. Time with people, locked blocks, meals, and sleep are never offered.
- **The clock** no longer freezes in Now.
- **A board-size check** in the drag gate. Nothing can make the board smaller than V11's (1231, 980, 911, 870, and 330 px).

**The phone:**
- Today is one dark head, the Now card, one question at a time, the next three blocks, and This week in one card. At most one gold.
- Settings is a grouped sheet with values on its rows. Smart breakdowns is one switch.

**The Planner walk:**
- no print under 12 px on the week
- Getting started folds to one card
- the notepad stays in Now
- kinds on the desk say what they add
- panel corners sit in one row, and the title row stays pinned while a panel scrolls

**One gold per screen:** the phone's ranking is shared with the desk's Today, and any panel with its own gold quiets the rest.

**Fixes:**
- **The NaN on boot:** a week board shown again before its first frame popped from an unset value, and today's blocks flying home got NaN. It was in V11 since Oct 13. It's fixed at the source, and the gate now checks a cold boot.
- **The first touch:** the first press after a load was slowed about 200 ms by starting the sound; it's now under 3 ms.
- **Contrast:** 344 failures went to 0 across 711 screens. The grocery list is dark.
- **Goals:** a new goal never starts "Behind"; its suggested time holds the whole plan when it can.
- **Small things:**
  - the stray dot on Dinner with dinners off
  - no groceries step on a board without meals
  - the text card's button says Save, so the phone shows one Done

## Checks at release

All of these ran on the release build (`v/corners11-2`, Oct 20, evening):

- `npm test`: 621 of 621.
- **Drag gate GREEN:** every drop on iPhone, Duo, iPad and Mac, with mouse and finger, in Chrome and WebKit. The board is the same size as V11's at all five sizes (+0.0%). First press and cold boot are clean.
- **Contrast gate GREEN:** 864 screens on iPhone, Duo folded, Duo open, iPad and Mac. 34,912 things checked, 0 failing.
- **Break-it gate GREEN:** all 62 states (`npm run unhappy`, docs/UNHAPPY-GATE.md). These cover offline, failed saves, broken boards, AI failures and an empty board.
- **Helpers' screenshots:** `docs/mocks/big-moments/built/`, `docs/mocks/setup-week/built/`, `docs/mocks/phone-redesign/built/`, `docs/walk/`, and `docs/readiness/`.

## Russell's decisions (Oct 20, all taken as my picks)

1. The packing list in Today shrinks the board while it shows. Pick: at most two rows, with Show all.
2. Gold "Start" in open time on the desk, as on the phone. Pick: match the phone.
3. Steps show where a plan would place them, not the mock's "by Sat". Pick: keep.
4. "Sent it?" after Text. Pick: keep.
5. A Summer desk layout. Pick: add it next round.
6. The Focus page ("One thing at a time"). Pick: bring it back next round as a panel over the desk.
7. "I" or "we" in texts. Pick: a "Who's going?" question on trips, next round.
8. Caregivers. Pick: a "Who's covering?" step next round.

## Added before release (Oct 20, evening)

Russell asked for these to go into V11-2 before the link.

**His eight decisions, with my picks:**
- The list in the band shows two rows, with Show all.
- Gold Start in open time on the desk.
- Keep the dashed proposed times and "Sent it?".
- A Summer layout.
- The Focus panel ("One thing at a time").
- "Who's going?" on trips, so texts can say "we".
- "Who's covering?" for routines a trip leaves behind.

**The shortlist from his tactic deck** (Figma wiUSGxuraMv1VknBF28wm7, with Grok's audit of live V11 on its V11 pages):
1. **Every dead end gets a next step:**
   - the reset's To-do step offers undated to-dos
   - overdue becomes "From last week", with "Give it a new day"
   - the reset gets a line with Continue on the phone's Today
2. **Quick add on a full day** says what's in the way and offers two real options. Meals never leave their window without asking.
3. **Honest words:**
   - the calendar file
   - AI errors give the real cause and time
   - errors stay until handled, with Try again
4. **The phone keeps Undo** for the last change until the next one.
5. **Sharing is private by default:** to-dos are only included when the person adds them. Copy leads with "Stays on this device."
6. **Setup redone as "Your week fills in":** a live week that grows with each answer, chips sized to their words, white still means selected, and no corner icons or radio circles.
7. **A third gate, "break it on purpose":** offline, failed saves, AI failures, empty boards, and a broken save (`npm run unhappy`).
8. **Look back shows counts, never streaks.** The first reset's recap has one honest insight.

## After release: the website's privacy policy

Sharing became private by default, so `354_SundayReset_Site/privacy/index.html` needs two sentences changed when V11-2 is live.

**Line 78, "Sharing."** Replace it with: "When you share your week as a picture or as text, or print it, it shows your blocks and plans: your routines, dinners, and events. Never your to-dos or their steps, unless you turn on Include to-dos on that device. It goes to whoever you pick, through your device's share sheet. Where there's no share sheet, the picture downloads and the text is copied for you to paste. A grocery list you share is the list."

**Line 79, "Backups and calendar files."** After its first sentence, add: "A calendar file has your blocks and plans, and your to-dos only if you've turned on Include to-dos."

## Next round

- Big dates and goals on the Month and Year cards.
- Ghost blocks previewing spreads, goal plans, and prep weeks on the board.
- A mock of to-dos beside the week (17.3).
- The decisions above.
- Russell's brother tries it.
