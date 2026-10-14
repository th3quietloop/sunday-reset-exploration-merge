# Corners V10

Russell's notes of Oct 13 on V9's welcome and setup, and his challenge: "do an onboarding where you're just on the actual mat." V9 stays live; V10 is `v/corners10`, https://sunday-reset-corners-v10.vercel.app.

## His notes, and what V10 does about each

1. **"The bag looks so horrible... very vector based."** The bag is rendered in Blender now: a cloth pouch with a drawstring, closed while you type your name and open once your letters are out (`blender/build_bag.py`, `variants/corners10/assets/`).
   **"When I drag the pieces, it goes under."** Every piece in the setup, letters included, is dragged as a lifted copy above everything else on the screen, so nothing slides under the rack or a row.
   **"Closer to what I have, so I don't get sued by Scrabble... the numbers at the bottom."** The letters are the board's own blocks: the block colors, the bevel, a capital letter in the board's type, and no numbers. The rack is a groove cut into the wood, like a lane. The point values and the letter mix that came with V7 are gone from this version's code.
2. **The setup card: different sizes, no way out.** The card keeps one size on every step, with a close at the top right. A click outside it or Esc goes back to the calendar, and the answers wait there for next time. See docs/SETUP-CARD-V10.md.
3. **Names of the people at home felt low craft.** On the desk, tap Partner or A kid, type the name on the block itself, and press Enter. In the card, each name becomes a chip in the board's colors.
4. **Breakfast, lunch, and dinner: "is all white already selected?"** On the desk they're three meal blocks you put in the Help with row or leave out. In the card they're the same check tiles as every other choice.
5. **"Always on: your own time, to dos, the Sunday Reset" wasn't clear.** Both versions say it in one plain line: every board also has to-dos, time of your own, and the Sunday Reset.
6. **"You're not alone" should sell it.** On the desk, the things you said get in the way turn over, one by one, from slate to gold: "Too much lives in my head" becomes "On the board". The study that fits sits beside them as a printed note, its number big. The card got its own redesign (docs/SETUP-CARD-V10.md).
7. **"Teach me, coach."** After Build my week, a coach on the real board:
   - It moves a block from Block library onto a day while you watch.
   - It rings the day it's your turn to fill, and waits until you've dragged one there ("Do it for me" if you'd rather).
   - It takes you to the month and the year, ringing the trip you added. The card's Try it shows its move first too.
8. **"A space with all the questions lined up with blocks... moving blocks from the very start... the camera pans to the right, and it's our calendar."** That's the setup on the desk, below.
9. **"Have it on the wood, but also the version for us to test."** Both are there. A first visit opens the desk. Your menu has Try the setup, on the desk or in a card, each as someone new, with nothing saved.

And: **"I don't like having the name at the top... I want people to focus on the calendar."** The rack is part of the setup now and never floats over the calendar. The Letter rack item left the menu.

## The setup on the desk

A mat to the left of the calendar, in the desk's own leather and wood. The camera slides over to it on a first visit and back, to the right, onto the week the answers built.

- **The board** holds one row per question, numbered and printed on the wood. Every question is there from the start, in order. Rows you haven't reached are empty grooves with their question in them, rows you've done keep their answer, and you can tap a done row to change it.
- **Your hand**, on the right, holds the question you're on, its pieces, Back and Next, and **Your week so far**: the week those answers build, drawn the way the card draws it, changing as you go.
- **Every answer is a block.** Drag it into its row, or tap it (or press Enter). Drag a placed block out, or tap its x, to take it off.

The rows:
1. **Your name.** Type it, deal your letters out of the bag, and drag or tap them onto the rack. The name sits in the middle of the rack. "Spell it for me" does it for you. A name with no A to Z letters skips the letters.
2. **At home.** Only me, Me and a partner, A family with kids, A shared home.
3. **Who** (with a partner or kids). Partner and A kid; the name goes on the block.
4. **In the way.** The eight things from the card, plus your own words. Then they turn over, and the study shows.
5. **Help with.** Breakfast, Lunch, Dinner, time with your partner, and the four things to lean toward. What you said gets in the way is already in.
6. **Your days.** Weekdays and weekends as two lanes. Drag the inside edge of each sleep block, the same stretch as any block. Exact times are in the hand, with the keyboard.
7. **Work.** A work block to slide, with edges to stretch, and the days to tap. Mine to plan or Set, like a shift. No set work hours is a block too.
8. **Drop off** (with kids). Each kid's drop off and pick up as blocks on a lane, their days, and "We do" or "Someone else does".
9. **Coming up.** Beach trip, A birthday, A deadline, or your own words, then when.
10. **Calendar.** Drop a .ics file on the row, or choose one.
11. **Sunday Reset.** Morning, afternoon, or evening, with the quiet one suggested, and "Add it to my calendar".

Build my week builds the same week the card would, from the same answers (`SR.applySetup`). The coach comes after that.

## Board changes (all used by V10 only)
- `SR.blankAnswers`, `SR.setupWeek`, `SR.setupWeekRows`, `SR.setupSummary`, `SR.readIcs`, `SR.applySetup`, and `SR.saveResetIcs` let a version run its own setup with the card's answers and the card's build.
- `World.slotScreen` and `World.pieceScreen` say where a minute on the week, or a piece in Block library, is on screen, for the coach.

## Built alongside
- **The bag** (`blender/build_bag.py`, notes in docs/BAG-V10.md): a green felt drawstring pouch, shut while you type your name and open once your letters are out, with Sunday Reset blocks inside, no numbers anywhere. 512 px, transparent, lit like the desk.
- **The setup card** (docs/SETUP-CARD-V10.md, screenshots in `docs/setup-v10/`):
  - one size on every step, and a close mark, Escape, or a click outside keeps the answers as a draft;
  - name chips for the people at home, and meals as check tiles;
  - the "every board also has" line;
  - the research step that turns your answers over to what changes;
  - Try it shows each move first;
  - See further ahead plays the zoom once.

## Fixed on the way
- Picking a tile up from Block library, or dragging one out of the tray, threw an error before the block in your hand was made, so the tile vanished. This was in every version since V8. A piece in hand now gets its plain time, and lifts and follows as it should.
- Try the setup, In a card, opened this device's own setup draft when there was one, and could write to it. It now always starts fresh, as someone new, and saves nothing.
- Back to my board now closes a setup that was being tried.
- A pressed corner pill (To-dos, Block library) is white, and its mark was drawn in cream, so it vanished. The mark turns dark on a pressed pill.

## Not in V10
- The desk setup asks for one set of work hours. Different hours each day, and weeks that alternate, are set after, in Settings.
- The card's Try it steps for tonight's dinner and a first to-do aren't on the desk. Getting started, after the tour, has both.
- The coach's "your turn" waits for a block to land on the day. I couldn't drive a real drag on the 3D board from the automated browser (a hidden window pauses the board's frames), so that wait was checked with "Do it for me", which lands a block the same way. Worth one real drag by hand.
