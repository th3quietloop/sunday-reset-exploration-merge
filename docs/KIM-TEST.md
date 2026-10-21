# Kim tries V11-2 (Oct 20, 2026, evening)

Russell's wife, Kim, set up her own week on V11-2 on the Mac, in Chrome, and then Russell played with the desk. The whole session was recorded (29 minutes). Kim had never seen the app.

The transcript is in `docs/kim-test/transcript-part1.txt` (0 to 8 min) and `transcript-part2.txt` (8 min on). Whisper looped on a quiet stretch, so part 2 was transcribed again in short pieces. The frames are in `docs/kim-test/sheets/`, 8 frames a sheet, 15 seconds apart, so sheet `s_029` starts at 7:00. The two bugs have close-ups: `bug-see-my-plan.jpg` and `bug-week-drag.jpg`.

Her words are quoted where they say it best. Each note ends with what we'll change. Every note was built (the K numbers are used in the commits).

## About you

**K1. On "Here's what changes, Kim", the small line is what she reads, and the bold line hides it.** Each card puts "You said: Too much lives in my head" small, above a bold "On the board". She said: "this up here should be bigger than this, and this should be smaller... if this is on top, to me it stands out like a title." She read only the bold words, and then: "I would need to read this to see what this correlates to." **Change:** her own words become each card's title; what the board does about it is the line under it. No separate bold label.

**K2. The bold labels say nothing on their own.** "On the board", "Hours that are yours", "Decided on Sunday", "We'll come back to this". "Hours that are yours... doesn't make sense to me." "Maybe this doesn't need to be bolded either." **Change:** drop the labels. The line under her words says, in plain words, what she'll see: "Due dates show on your week, where you can see them." "Time for yourself goes on the board as a block, and it counts your hours."

**K3. "Why it works" is below the fold, and nothing says so.** "Oh, so you have to scroll down... I thought you had a clicker or something. It wasn't super clear." **Change:** the page fits without scrolling on a laptop, or shows that there's more. The research sits closed under one line, so the cards and Next are in view.

**K4. The research reads as gibberish.** The headline is a number ("40,554 adults"). "In a large sample of French adults... what if you're not French?" "This is from 2017... it's been almost 10 years." On the second study: "Under about two hours a day of your own, people felt worse. Past five, more didn't help." She read it four times: "I'm so confused... I don't understand. What does that mean?" Russell: "It reads like gibberish... it's too poetic." **Change:** each study leads with what it found, in one plain sentence ("People who had 2 to 5 hours a day to themselves felt best. Less than 2 felt rushed, and more than 5 didn't help."), then who and when, small: "A 2021 study of 35,000 Americans." No number as a headline.

**K5. What happens to "Something else" is vague.** She typed "No motivation to text my friends back", and the card said "We'll come back to this. It's on your plan, at the end of the setup." **Change:** say where it goes: "It's on your to-dos, so it has a place."

**K6. A picked tile doesn't look picked enough.** On Which meals: "It's already clicked, right?" "Oh, it's highlighted, okay." **Change:** a picked tile is filled white with a check mark, so it can't be missed.

## Your week

**K7. She loved the live week in the setup.** "Oh wow, I love that it walked out the screen up here." "Wow, that really shortened my bar." Keep it.

**K8. Drop off and pick up: who does it.** The step has one switch, "Someone else handles it", for each child. Kim: "If I do drop off and you do pick up..." "Even if someone else picks them up, you can still put a note." "Instead of a drop down you can do dots, like me and then husband, then you click on the dots on who's doing what." **Change:** each child's drop off and pick up get a who, as chips, per day: Me, Russell (the partner's name), Someone else. Me makes a locked block in her week. The partner makes the block with "Russell has it" (the handoff the block panel already has). Someone else keeps a quiet, short note on the board, so she still sees it happens.

**K9. Times differ from the default.** She changed pick up to 4:15 and drop off to 8:15. The long time list works; keep it.

## Try it

**K10. "Put something on Wednesday" reads like a rap song.** "Drag a block into tomorrow or tap one. It slides in where it fits; locked things like a pick up never move." "I don't understand that... I feel like I was singing a rap song." **Change:** "Drag Walk onto tomorrow, or tap it." On a second line, only once something's there: "Pick up has a lock, so it stays put."

**K11. The lock is a dot nobody sees.** "So that little dot right there is a lock. It's not super clear." **Change:** a locked block on the try board shows the lock mark big enough to read, and its tag says Locked.

**K12. The date on See further ahead.** She typed Russ' Birthday into the browser's plain mm/dd/yyyy box and spent about two minutes on it. **Change:** use the app's own day picker, with the quick chips. A birthday repeats every year.

**K13. Routines typed as to-dos.** "Feed Elijah", "Bath Elijah", "Elijah's bottle" became to-dos with "No due date yet". They happen every day. **Change:** each line gets an Every day chip, which makes it a daily to-do.

## Your plan

**K14. "When's your Sunday Reset?" assumes she has one.** "I don't even know if I have a Sunday reset." "What day do you plan your week? Probably a little better." "Maybe there's a better wording rather than just assuming you have a Sunday reset." **Change:** "When do you want to plan your week?", with one line saying it's about 20 minutes once a week, and Sunday as the suggestion rather than the given.

**K15. BUG: See my plan dropped her onto another board.** On Building your week she clicked See my plan. The setup closed, and the desk showed a different board, the sample week from an earlier visit (Up with Robin, Evening with Sam, Tacos), in the Day view. She clicked around, and Russell said "There's a bug. That's not supposed to happen." They went Back into the setup and through the build again, and only then did See my plan show her plan. See `bug-see-my-plan.jpg`. **Change:** find why and fix it. See my plan always shows her plan. The desk behind the build doesn't take clicks.

**K16. The plan page is a lot to read.** "Everything on it" is a long list. "The instructions are so detailed... very, very detailed." **Change:** the plan leads with her three numbers and what's already on the board. The full list stays folded.

## After the setup (Russell on the desk)

**K17. Work is locked, and she couldn't see how to change it.** "Oh, so work is completely blocked off. Now, can we change that?" "You should be able to drag it manually as well." In the block panel: "it's a little clunky right there." **Change:** grabbing a locked block says so on the spot ("Work is locked"), with Unlock this day as one tap. The panel puts Unlock first for a locked block. Work the person called Mine to plan isn't locked.

**K18. "Run runs until 8:30 am".** That's the Undo line after stretching Run in the week. **Change:** "Run now ends at 8:30 am."

**K19. BUG: the week drag lands somewhere other than its preview.** Wind down on Monday was dragged earlier. The tag while dragging said "7:15 to 7:45 pm". It landed at 9:15 pm, and the line said "Wind down moved to yesterday at 9:15 pm" (it was Tuesday). See `bug-week-drag.jpg`. **Change:** a drop lands where its preview said, or the preview says where it will go. A day on the board is named by its weekday, never "yesterday".

**K20. A picked block's bar stays open while another block is dragged.** Evening with Sam's bar (Earlier, Later, Shorter, Longer) stayed up, and the dragged Wind down's time tag sat on top of it. **Change:** starting a drag puts the picked block's bar away.

**K21. The "A sample week" tip covers the middle of the board.** It sits over Wednesday to Friday. **Change:** it sits clear of the board's rows, beside it or under it.

## The whole setup

**K22. It's long before you get to play.** "What stops people from starting it or trying it out is because the process is so long." "Someone who just is new and wants to play around real quick, without having to set out a whole new schedule first." "If they try it out, they're like, oh, I do want to get deeper into this." **Change:** the welcome offers a quick start: one screen (her name, who's at home, when the day starts and ends, work days and hours), then her board, with the rest of the setup offered later from Getting started. The full setup stays.

**K23. "Look at a sample week" is easy to miss.** Russell: "This is the first page. It's not super clear, but you can look at a sample week." **Change:** the welcome makes the sample a clear second choice.

**K24. Too much reading overall.** Every setup line becomes one short sentence, and the bold goes from anything that isn't a title.
