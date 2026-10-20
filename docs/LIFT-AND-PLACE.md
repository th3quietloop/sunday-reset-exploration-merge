# Lift and place: the motion spec for Corners V11

Russell asked for the core of the app to feel amazing: "I want that to feel like you're lifting it up and it's almost exaggerated a little bit... imagine like you're pinching your finger and it's kind of dangling, and then you're placing it on the block in the calendar spot... make sure we make that all the way smooth."

This is the one spec for that moment: picking a block up (from a panel, the tray, the bench, or the board), carrying it, and setting it down on the calendar. It covers every beat, every path, every input, Calmer motion, sound, performance, the code that changes, and the tests that prove it. After the spec come three lists: the 3D work (blocks first, with Blender), the Socratic QA of the loop and the tiles, and the decisions Russell should make.

**Where it comes from.** Six investigations of V11 on Oct 14 (the code map, 1,189 measured drops, touch and iOS, a Socratic walk with 80 findings, a 3D and Blender audit, and research on Apple, games, springs, and pendulums), and three design passes that each built a working prototype in their own copy: a physics pass (truth), an Apple pass (familiarity), and a game feel pass (juice). Their prototypes and recordings are in `/private/tmp/claude-501-drag-scripts/` (`physics`, `apple-motion`, `gamefeel`). Section 1 says what each proposed and what was kept.

**What it fits.** A reliability builder is fixing, at the same time: a second finger, cancelled touches, toasts over the board, hold to lift in scrolling lists, ghost clicks, NaN guards, and the drag gate (now `scripts/gate/`). This spec builds on that work and doesn't repeat it. Where a fix is theirs, the QA list says so. Their touch rule is part of this spec: on touch, in a list that scrolls, a tile lifts after a short hold (about 300 ms, rising while held) or at once on a move across the list's scroll direction.

**Built Oct 15:** see section 14 for what was built, how it was proven, and what's left.

**Line numbers** are from `5b5f853` (the code map's reference). `board/src/app.js` is moving under the reliability builder's changes, so read function names first and line numbers second.

## The choreography in ten lines

1. **Press.** The block dips 0.04 units and its footprint squeezes 3 percent in 70 ms, so you know you have it. On touch, a 300 ms still hold lifts it, rising from 120 ms.
2. **Lift.** It rises 1.5 units (week) or 1.8 (day) on a spring with an 8 percent overshoot, grows to 1.12 (1.20 on touch), tips its face toward you, and its shadow spreads and softens. The pick sound plays as it leaves.
3. **Seam.** A panel card turns into the brick in 140 ms, both pinned at the spot you grabbed: the brick starts as wide as the card (up to 2.2 times its size) and shrinks into your hand while the card shrinks into it and fades. Its swing carries over.
4. **Carry.** The brick hangs straight above the spot your pointer marks, and on touch above your fingertip. It moves one to one, with no spring on its position.
5. **Dangle.** It swings from the pinch like a pendulum: 1.35 to 1.7 Hz by length, damping 0.36, about 6 degrees on a normal stop and 10 on a brisk one, never past 14. A long block held by one end droops at the far end.
6. **Aim and snap.** The dashed outline sits on top of whatever is under it and glides to each slot. One detent per settled slot. Over a slot that fits, the brick sinks a little and its shadow lines up. Over one that doesn't, it lifts away and the outline shows a no.
7. **Room.** Neighbors slide aside while you aim, for new blocks as well as moves. The camera leans in 12 percent around your hand only, so nothing slides under a still pointer.
8. **Fall.** Let go and it drops under desk-scale gravity (about 110 ms), leveling its swing and taking its true size while its shadow tightens to the footprint.
9. **Land.** At the frame it touches: the clack, a squash that peaks at 8 to 11 percent with the footprint bulging, a ring of dust, and a sideways knock in the neighbors, nearest first. Still by 450 ms. The toast comes 150 ms after contact; the camera eases back 250 ms after.
10. **No, cancel, undo.** A refused drop dips, bumps, shakes no, says why, and flies home on a curve. A cancel flies home and taps down. Undo plays the move backward. Calmer motion keeps the one to one carry, the sounds, and fades, and drops the rest.

## 1. Three passes, judged and merged

Each pass built its idea into a copy of V11 and filmed it. Where they disagreed, this is the verdict and why.

| Question | Physics pass | Apple pass | Game feel pass | Merged |
|:-|:-|:-|:-|:-|
| Where the brick is against the pointer | Hangs straight above the point under the pointer | Hangs above the point under the pointer | Its pinch is under the pointer; it lands on the board below it | **Above the point under the pointer.** Lifting must not change where it would land; with the pinch under the pointer, a lift moves the landing spot about 0.9 units toward you, off its row on the week. And a cursor that marks the landing spot is what every drag on a computer does. |
| Lift height | 1.35 week, 2.1 day | 1.45 week, 1.75 day | 1.5 week, 1.8 day | **1.5 week, 1.8 day, 0.8 mini week, 1.6 bare desk** |
| Size in hand | 1.06 mouse, 1.1 touch | 1.07, 1.1, plus a readable keycap (66 by 42 px minimum) | 1.15, 1.2 | **1.12 mouse and pen, 1.20 touch**, plus a smaller minimum (44 px long, 60 on touch) |
| Swing | Pace set by the block's length, 1.9 to 1.15 Hz, damping 0.33 | 1.5 Hz, damping 0.32 | 1.4 Hz, damping 0.32 | **Pace by length, 1.7 to 1.34 Hz, damping 0.36** (sims below: the second swing is 31 to 36 percent of the first, settled under a second) |
| Fall | Real gravity at desk scale (280 units/s²) | Fixed 0.1 to 0.16 s | Today's formula | **Real gravity**, clamped 90 to 160 ms. Principled, and the numbers match what works today. |
| Landing squash | Bulge 0.6 of the squash | Today's | A damped sine with one small rebound, bulge 0.45 | **Damped sine, bulge 0.5**: from above, only the footprint reads |
| Card to brick | Not built | The card shrinks into the brick's box and fades; the brick starts at the card's size | The card shrinks to 0.6 and fades; the brick starts as wide as the card, up to 2.2 | **Apple's morph with game feel's start size** |
| Camera lean | Not changed | Leans only after a 220 ms pause, around the pointer | Re-anchored every frame where the brick will land, held after touchdown | **Re-anchored every frame on the hand's ray, 12 percent, held until 250 ms after contact.** A pause-only lean pumps in and out; this one is simpler and nothing ever slides under a still hand. |
| A drop that can't land | Not built | Not built | Dips, bumps, shakes no, then home | **Kept, a little shorter** |
| Touch offset | Aim from a point 44 to 72 px above the finger | 32 px on the week | 56 px on a phone, 44 on a tablet | **22 px clear of the fingertip plus half the outline's depth, 36 to 64 px** |

What all three agreed on, and the research backs: no spring between your hand and the thing you hold (today it trails 60 to 90 px); weight shows in rotation, shadow, size, and sound; the pivot is the pinch, not the brick's base; contact is one moment for eyes and ears; wood, not rubber; and Calmer motion keeps the carry.

## 2. The model in one paragraph

Every frame, the app gives the desk an **aim point** on the screen: the pointer for a mouse, trackpad, or pen, and a point above the fingertip for touch. The desk finds the **floor point** where that screen point's ray meets the surface under it (the board's top, or the top of the moved block for a move, as `targetAt` does today). The landing slot is worked out from the floor point. The brick **hangs straight above the floor point**: its pinch is above its top face at the spot you grabbed along its length, and it swings from there. The outline sits in the snapped slot. The shadow lies on whatever is under the brick. Let go and it falls straight down into the slot. This is all worked out in `step()` after the camera moves, so the brick never lags the camera, and the lean zooms around the aim point's ray, so the floor point under a still hand never moves.

On screen that puts the brick above its outline by its height: about 41 px on a Mac's week (1440 by 900), 43 on the day, 34 on an iPad's week, 22 in the reset's smaller week, and 11 on the phone's desk, where the camera looks almost straight down. On touch the offset above the finger does the work the height can't.

## 3. The beats

Conventions. Springs are written (response in seconds, damping ratio) with mass 1: ω = 2π / response, stiffness ω², damping 2ζω. The code's `spring(x, v, to, w, dt)` is the damping 1 case with w = ω, and `sway(s, to, w, zeta, dt, push)` is the general one (scene.js:45 to 58). Heights are world units (one hour on the week is one unit). Times are the app's own step time.

### 3.1 Press (anticipation)

- **Board block, any input.** At pointerdown it dips 0.04 units (week) or 0.05 (day) and squeezes: height 0.94, footprint 0.97 in both directions, in on (0.07 s, 1.0), out on (0.12 s, 1.0). Today it dips 0.025 and squashes only in height, which moves 1 to 2 px from this camera. The footprint squeeze is what reads from above.
- **Touch picks forgive.** When the ray misses on touch, the nearest movable brick within 20 px on screen is the hit. A 15 minute brick is 6 to 12 px wide on the week.
- **Panel tile, any input.** The press look comes from a class set at pointerdown (`pressing`), not `:active`, so iOS shows it: down 1 px, scale 0.985, 60 ms. On touch in a list that scrolls, the reliability builder's hold takes over from here (it rises to 1.04 and up 2 px while held, then 1.06 when it lifts).
- **Sound:** none. **Calmer:** no dip or squeeze; the drag dots and the picked ring show at once.

### 3.2 Hold to lift (touch)

- **In a list that scrolls:** the reliability builder's rule (`LIFT_MS` 300, `LIFT_SLOP` 8 px, a move across the list's scroll lifts at once, `armCarry` plays the pick and an 8 ms buzz on Android). The carried card starts from the tile's held look (scale 1.06), so there's no jump.
- **On the board (new):** a block lifts after 8 px of travel, or after a 300 ms still hold within 8 px. From 120 ms the hold shows it's working: the brick rises 0.12 units and its footprint grows 3 percent by 300 ms, then the lift starts. Let go before 300 ms without moving and it's a tap, as today (the phone's desk still waits 260 ms for a double tap).
- **Calmer:** no rise while held; a picked ring fades in from 120 ms instead (opacity is not motion).

### 3.3 Lift

| | Value |
|:-|:-|
| When | Mouse and pen: after 4 px (today 5 or 6). Touch: as in 3.2. |
| Height above what it hangs over | Week 1.5, day 1.8, mini week 0.8, bare desk and bench 1.6 (today 1.1, 1.2, 0.7, 1.4) |
| Spring | (0.22 s, 0.62): stiffness 816, damping 35.4. About 8 percent overshoot, 90 percent of the way by about 140 ms, settled by about 300 ms. |
| Size in hand | 1.12 for mouse and pen, 1.20 for touch, on the same spring |
| Release of the press | The squeeze springs into a stretch: height 1.04 at 60 ms, back to 1.0 by 160 ms. Anticipation, then action. |
| Tilt | The face tips toward you: +0.08 rad (today −0.06, away from you) |
| The hang | The pinch sits above the top face: 0.55 units on the week and bench, 0.75 on the day (times the hand size) |
| Shadow | Starts at the footprint and grows and softens as it rises (3.5) |
| Sound | `Snd.pick` on the frame the lift starts, never at press. On touch in a list, `armCarry` already played it. |
| Calmer | Lifted at once: height set, size 1, level, shadow fades in over 100 ms, pick plays |

### 3.4 The seam: a panel card becomes the brick

Today a 147 by 83 px card becomes a 19 by 38 px brick in one frame (14 by 16 on a phone), and back again on a refusal. The fix is one object handed over in 140 ms.

1. **When:** the first frame the aim point lands on a target on the desk (a row, a lane, the mini week, or bare desk).
2. **Frame one:** the brick appears at the hand pose with a start size that makes its width on screen match the card's, clamped from 1 to 2.2 times its hand size. Its lift starts at 0 (sitting on the surface under the pointer) and springs up to its height. Its roll and roll speed are the card's swing angle and speed, so the swing carries across.
3. **The card,** over 140 ms: scales toward the brick's start width and center, and fades out with `cubic-bezier(0.4, 0, 1, 1)` (it stays visible early and goes late).
4. **The brick,** over the same time: its size springs from the start size to the hand size on (0.14 s, 1.0), with no overshoot, because a shrink that bounces looks rubbery.
5. **On touch:** the aim point rises from the finger to its touch offset (3.5) over 150 ms, ease out, so the brick hops up off the fingertip.
6. **Never a frame with neither, and both together for at most 160 ms.**
7. **Leaving the desk** (the aim point goes back over a panel, or there's no target): the reverse. The card grows back out of the brick's box (140 ms) while the brick sinks to 0.6 and is removed under it.
8. **Calmer:** a 100 ms crossfade in place; the brick at its hand pose and size from frame one.

This also fixes Calmer motion flying the brick in from the middle of the desk at 86 percent: the brick no longer starts at a desk position, and the `appear` 0.86 start goes away.

### 3.5 Carry

- **The aim point.** Mouse and pen: the pointer. Touch: the pointer raised by the **touch offset**, clamp(22 + half the outline's depth on screen, 36, 64) px: 46 px on a Mac's week, 42 on an iPad's week, 62 on its day, 36 in a small reset week, 52 on the phone's desk. So the outline's near edge clears the fingertip by about 22 px and the brick sits above that.
- **How the offset comes in.** From a panel: over 150 ms at the seam. For a block or bench piece under the finger: it grows with travel, smoothly from 0 to full over the first 48 px. So lifting a block without moving never re-aims it at the row above.
- **No spring on position.** Pointermove stores the latest event; `step()` works out the floor point and the hang after `stepCamera`, every frame. The hang point is within 1 px of where the aim point says, at any speed.
- **Mouse only, a small snap pull.** After 100 ms under 150 px/s over a slot that fits, the body (not the pinch) eases toward the snapped slot's center by up to half the gap, at most 6 px, on (0.12 s, 0.9). On touch there's no pull: snapping shows in the outline and happens on release.
- **Over a slot that fits** the brick sinks by 15 percent of its lift on (0.16 s, 0.8): it wants to land. **Over one that doesn't** it rises by 8 percent.
- **Readable in hand.** The carried length is at least 44 px on screen (60 on touch), and on touch the depth is at least 40 px (scaled up evenly, at most 2.2 times). A 15 minute block on the Mac's week is 12 px wide; in hand it's a 44 px tag. The outline below always shows the true length.
- **The face in hand.** Under 90 px long on screen it prints the keycap layout (mark over name, flat) at twice the resolution. Longer, it prints its name and the time it would land at, redrawn when the slot changes, at most every 100 ms. Calendar does the same.
- **One shadow.** The carried brick casts no shadow map shadow while carried. Its soft shadow is a rounded rectangle on the tallest top under its footprint (the board, open time, or a block), 0.004 above it. It is offset along the key light's direction on the ground by half the true offset (height divided by the tangent of the key's elevation), at most 0.6 units. Size (length + 0.3) by (depth + 0.3), times 1 + 0.3 per unit of height. Opacity 0.45 at the surface, down to 0.2 at full lift, and at most 0.35 where it lies over printed faces. Its edge softens with height.
- **The note (chip)** sits 8 px above the brick's box on screen (`handRect`), never on the brick, never under the finger, and above the card in hand (z order above `#dragtile`). Near the top edge it moves beside the brick. The phone's desk gets a compact one line chip instead of none.

### 3.6 Dangle

A damped pendulum per axis about the pinch, pushed by how the aim point speeds up and slows down, plus a small lean with speed so motion always shows:

θ″ = −ω² (θ − lean − droop) − 2ζω θ′ − ω² (a / g)

| | Value |
|:-|:-|
| Pace | f = 1.33 + 0.37 × e^(−(minutes − 15) / 60) Hz: 15 min 1.70, 30 min 1.62, 1 h 1.50, 2 h 1.39, 4 h 1.34. Touch is 0.93 times that (bigger on screen). A longer object swings slower; that's what reads as weight. |
| Damping ratio | 0.36 |
| Gravity (how far it leans) | g = 40,000 px/s²: 4,000 px/s² leans 5.7 degrees |
| Acceleration | From a critically damped follower of the aim point (ω 45), clamped at 30,000 px/s². The aim point itself stays raw. |
| Lean with speed | 0.002 degrees per px/s, trailing, at most 3 degrees |
| Axes | Roll from sideways acceleration on screen; pitch from up and down, at 0.7 strength |
| Droop | Held off center along a block longer than 1.5 times its depth, the far end hangs lower: 3 degrees times (2u − 1), where u is where you grabbed it (0 at its start, 1 at its end) |
| Yaw | Held off center and moved up or down, it turns like a ruler held by one end: target −(2u − 1) × 0.006 degrees per px/s of vertical speed, at most 7 degrees, on its own spring (2.0 Hz, damping 0.45). This turn is in the screen's plane, so it reads even on the phone's top down camera. |
| Caps | Soft (tanh): roll 14, pitch 9, yaw 7 degrees |
| Integration | `sway()` at 240 Hz substeps, as today |
| What it looks like | Simulated (gamefeel/sim/pend.mjs): a brisk stop from 1,500 px/s swings 10 degrees, then 36 percent back, settled in about 1 s. A normal stop from 900 px/s swings 6, settled in about 0.9 s. Slow aiming swings under 2. A flick reaches the 12 to 13 degree soft cap. |
| Visible sway | The body hangs 0.7 units (week) or 1.0 (day) below the pinch, so 10 degrees moves it about 6 px on a Mac's week and 8 px on the day, plus the turn and the light on its bevels |
| The card in hand (DOM) | The same law in the screen's plane about the grab point: 1.6 Hz, damping 0.36, same gravity, soft cap 12 degrees, resting tilt −2 degrees. In the existing integrator: `rot.v += (−101 (rot.x − lean) − 7.24 rot.v + 0.145 a) h`, in degrees. Today it swings 0.1 degree. |
| Calmer | None. The brick and the card hang level. |

### 3.7 Aim

- **The slot.** The start is the minute at the floor point, minus u times the block's true length, snapped to 15 minutes with **hysteresis**: it changes slot only once the raw start is 60 percent of a step past the boundary (70 on touch), or after 80 ms nearer the other slot. The row (or lane) is the one under the floor point; in the gap between rows, the nearest row within 0.25 units, otherwise none.
- **The day's window.** The start is held inside the visible hours. A block that would run past the end of the day is refused with "That runs past the end of the day" (unless the overnight lane shows it). Today, on the phone's desk, a drop past the last lane goes to tomorrow at midnight and leaves the board.
- **Lanes on the day board.** Because the brick hangs over the floor point, it never jumps between lanes at noon and 6 pm; only the outline does. The lean never takes its point from a slot.
- **Tiny weeks on a phone.** When a quarter hour is under 6 px on screen (the phone's reset week is 3.4 px), the aim snaps to 30 minutes and the chip says the time.
- **The outline** sits on top of whatever the slot overlaps (open time stands 0.13, or 0.2 on the day, and bricks 0.3 to 0.47) plus 0.01, drawn above the bricks, depth tested. It glides on (0.12 s, 0.9) (today about 0.19 s) and fades in over 90 ms the first time. **Fits:** a darker socket fill (rgba 40, 22, 6 at 0.22) and white dashes over a dark under-stroke, so it reads on light open time and dark blocks alike. **Doesn't fit:** red fill and a circle with a slash at its center (Apple's no). **Time that's over:** a check mark in the outline, so "goes in as done" is never a surprise. At night it dims with the light level.
- **Re-aim every frame the camera moves,** from the stored aim point, not only on pointermove. Today a still pointer's outline goes stale while the camera settles.
- **Calmer:** the outline jumps instead of gliding.

### 3.8 Snap and detent

- **Detent:** `Snd.detent(ok)` once per settled slot, at least 50 ms apart (today 28 ms, which purrs: 7 to 12 ticks in 150 to 230 ms when crossing rows). A sweep faster than a slot per 50 ms ticks once when it settles for 40 ms. A slot that doesn't fit ticks lower (0.62, as today). Android also buzzes 6 ms, as today.
- **Lock on:** after 100 ms over a slot that fits, the outline's fill brightens once (0.22, to 0.34, to 0.26 over 160 ms), and the shadow's offset shrinks to 30 percent and lines up with the outline along the row.
- **Calmer:** the brightening only.

### 3.9 Neighbors make room

- **Moves** already preview: the board plans again when the slot changes (the `ck` cache in `boardDrag`) and neighbors slide on springs.
- **New blocks (new):** `moveTile` does the same on a slot change: `tryOn(() => M.placeAdd(...))`, then `renderBoard(daysWith(...))`, cached by slot. Today the chip says "4 blocks move" while nothing moves, then 4 jump on release.
- **Springs:** (0.20 s, 0.9) for neighbors that slide (today a critically damped w 18, about 0.35 s). Cut soft blocks keep the edge that stays put, as today. Locked blocks never move.
- **Leaving the row or the desk** puts everything back on the same spring.
- **Calmer:** neighbors are set at once.

### 3.10 Release

- Over a slot that fits: the commit runs as today, and the brick in hand becomes the landing brick at its exact pose: position, rotation, size, and length. Today the fall starts 0.12 units above the carried height (about 3 px).
- The camera lean holds (3.19).

### 3.11 Fall

| | Value |
|:-|:-|
| Law | y = y0 − ½ g t², with g = 280 units/s² times the board's scale. At this desk's scale an hour is about 3.5 cm, so this is real gravity. |
| Duration | √(2 y0 / g), clamped 90 to 160 ms: 104 ms from 1.5 units, 113 from 1.8, 90 from the mini week |
| Sideways | From where it hung into the snapped slot, ease out (quadratic), over the same time |
| Swing | Back to level on the way down: rotation times (1 − k)² |
| Size and length | From the hand size and carried length to true, ease in and out, arriving exactly at contact |
| Shadow | Converges to the footprint: offset to 0, size to the footprint plus 0.15, opacity to 0.45, edge tight. At contact it hands over to the brick's real shadow and fades out in 60 ms. |
| Calmer | No fall. It is placed. |

### 3.12 Land: the frame it touches

| | Value |
|:-|:-|
| Squash | Height 1 − A e(t), footprint 1 + 0.5 A e(t), with e(t) = sin(35 t) e^(−t / 0.06) for 0 to 260 ms. It peaks at about 32 ms and rebounds once at about 120 ms. Peak squash 8 percent (30 min or less), 10 (1 h), 11 (2 h or more), so A is the peak divided by 0.53. Times clamp(impact speed / 30, 0.6, 1), where impact speed = g t. The rebound stays under 2.5 percent of the height. The footprint bulge (4 to 5.5 percent) is what reads from above. |
| Sound | `Snd.clack(size)` on the contact frame of the first brick on the board in view, within 16 ms. Exactly one. |
| Dust | A flat ring of light wood dust on the board under the brick: from 0.9 to 1.45 times (footprint + 0.5 units), opacity 0.42 × (1 − k)², 280 ms, drawn under the bricks, its turn seeded by the block's id. Flecks (4 flat chips, 0.06 units, 300 to 480 ms, pooled) only on the day board and the phone's desk for blocks of an hour or more. No round puffs. |
| Neighbors | Only on the board in view (today the hidden week copy in the day view takes the knock and plays the clack 120 to 133 ms early): a hop of 0.032 (week) or 0.05 (day) and a sideways nudge away from the landing of 0.045 (week) or 0.07 (day), both times nearness squared, 150 ms each, nearest first, delayed 12 ms plus 30 ms (week) or 14 ms (day) per unit of gap. The nudge is the part you can see from above. |
| Done color | A block landing on time that's over lands in full color, squashes, then eases to the done color over 250 ms (an ink dries beat). `pickInk` checks the final pair. |
| Calmer | No squash, dust, or knock. A 240 ms highlight fades in and out on the slot. The clack plays. |

### 3.13 Settle

- **Follow through:** if it came in moving (sideways speed over 0.72 units/s, today's test) or still swinging more than 2 degrees, it rocks: w 26, damping 0.3, at most 2.5 degrees. A careful drop doesn't rock; the squash's rebound is its settle.
- Everything is still by 450 ms after contact.
- **Calmer:** none.

### 3.14 Neighbors after the landing

The room was made while aiming (3.9), so nothing jumps on release. In the release frame no neighbor moves more than 0.05 units. The only neighbor motion after contact is the knock (3.12).

### 3.15 The toast

The toast with Undo appears 150 ms after contact, not at release, so it doesn't compete with the landing. While anything is in hand, toasts step back and let the pointer through (the reliability builder's `body.carrying`). One receipt at a time: a new one replaces the last drop's.

### 3.16 Cancel

Escape, a cancelled touch, a lost capture, the window losing focus, or letting go off every target. It never commits and never opens anything.

- **A block or a bench piece** flies home: duration clamp(0.20 + 0.00018 × distance in px, 0.22, 0.42) s, ease out cubic, on a curve in the board's plane (the control point 15 percent of the path's length to the side, toward you) plus an arc of min(0.6, 0.2 + 0.03 d) units. Today the arc is only vertical, which barely shows from above. It arrives level and at its true size, squashes 4 percent, and `Snd.tap` plays at contact.
- **A panel tile:** the brick folds back into the card (the seam in reverse, 140 ms) where you let go, then the card flies home (240 ms, `cubic-bezier(0.16, 1, 0.3, 1)`), its socket fills (3.20), and the tile gives its 3 px bounce. If its tile is gone, it evaporates: scale 1 to 1.15 and fade, 160 ms.
- **Sound:** `Snd.tap` at home contact; `Snd.slide` when a tile is let go over the desk off every row, with today's toast ("Drop Walk on a day's row to add it").
- **Interrupts:** a block flying home can't be picked until it lands (at most 420 ms). A block that is falling or squashing can be, from its pose.
- **Calmer:** home at once, with `Snd.tap`.

### 3.17 Refused

Let go over a slot that can't take it (locked, no room, time that's over and full, past the end of the day):

| Time | What happens |
|:-|:-|
| 0 to 90 ms | It dips toward the blocker, easing in, to 0.25 units above its top. It tries. |
| 90 ms | The bump: `Snd.bad`, the blocker's outline flashes red (0 to 0.9 to 0 over 220 ms), the blocker hops 0.02 units. It holds firm. |
| 90 to 270 ms | It recoils 0.2 units up on (0.18 s, 0.5). |
| 120 to 280 ms | It shakes no: a turn of ±3.5 degrees in the screen's plane, two half swings. |
| 240 ms | The toast says why and what to do (`blockedText(reason, true)`), for blocks on the board too. Today a board block that can't land goes home without a word. |
| 280 ms on | Home, as in 3.16. |

Before letting go, the reason is already in the chip, on touch and on the phone's desk too. **Calmer:** home at once, the red outline fades out over 220 ms, `Snd.bad`, the toast.

### 3.18 Undo and redo

- **Undo a move:** the block plays it backward. A copy lifts at the new spot to 0.6 units, flies the curved path to the old slot (0.30 s), falls, and lands with the full contact beat at 0.85 loudness. The brick at the old slot waits unseen until the copy arrives (`holdBack`, as the place panel does). Today it sinks at the new spot and pops at the old one.
- **Undo a new block:** it lifts 0.5 units and evaporates (0.85 size, fade, 180 ms) with `Snd.slide`. If its tile is on screen, the tile bounces.
- **Redo:** the forward landing: it drops in from 0.9 units and lands (`land()`).
- **Calmer:** at once, with the 240 ms highlight and the sound.

### 3.19 The camera through all of it

- **The lean** is a zoom of 12 percent (today 18), on (0.35 s, 1.0), **around the aim point's ray**, never a slot. Every frame, the lean's center becomes the point where the aim point's ray meets the camera's look plane, and the change is paid back with a pan (minus the move times (1 − 1/zoom)), so the view never jumps when the center moves. A zoom about a point on that ray keeps the whole ray on the same screen point, so the brick, its floor point, and its slot stay put under a still hand. Today the lean zooms around the first slot you crossed, so the minute under a still pointer drifts up to 2.4 hours and the row can change.
- **Starts** at the seam (a tile) or the lift (a block).
- **Holds** until 250 ms after contact, then eases out on (0.5 s, 1.0), and the pan payback eases to zero with it. Today it lets go on the release frame and the landing plays on a shrinking board.
- **Near the screen's edge** it eases back, as today (`edgeLean`), around the same ray.
- **None** on the phone's desk, none while the bench camera carries (as today), none in Calmer motion.
- Brick growth on screen, all told: 1.12 hand times 1.12 lean times about 1.04 from the height, about 1.3. The desk grows 1.12. Both are under the comfort lines V11 cites.

### 3.20 The tile left behind, and the card in hand

- **The source tile** becomes a socket: its content hides and its footprint shows as a slightly sunken, dashed outline in a real color. Today it fades to 35 percent, which fades its words with alpha and reads as disabled. When the card flies home, the socket fills.
- **The card in hand:** the spot you grabbed stays under the pointer, scale 1.06 on the lift spring, shadow `0 22px 30px -10px rgba(30, 15, 4, 0.55)`, the pendulum in 3.6.

## 4. The paths

### 4.1 A tile to the board (Block library, the reset's steps, To-dos, recipes and pantry, ideas, step grips)

Press (3.1), hold or move to lift (3.2), the card in hand (3.20), the seam (3.4), carry, aim, room, release, fall, land, toast. Food over a Dinner block or a day without one keeps today's targets; a dinner placed on a day with no Dinner block lands with the full beat. Tiles have no room preview today; 3.9 adds it.

### 4.2 A block moved on the board (week, day, the phone's desk, across days)

Press, lift out of its slot (the outline stays where it was, under the pointer, until you move), carry, room (as today), release, fall, land, toast with Undo. The aim plane is the top of the block at rest, as today, so pressing and lifting never re-aims. Across days by a day pill: the brick hangs over the pill, the pill takes the gold ring, and on release the brick flies to the day's slot and lands (4.5).

### 4.3 A bench or rack piece

The piece lifts from where it sits with its own shape (the keycap) and keeps it over the bench and bare desk. Over a row or lane it **changes shape once**, on one mesh, to the target board's brick: `World.reshape(w, d, h)` on (0.14 s, 1.0), with the face laid again at the end. Today it is ended and started twice (keycap, sliver, day brick) and zigzags. A refusal flies it home to its bench slot. `benchCarry(null)` runs on every way out, cancel included. A press that lands while the bench camera is still easing back after a drop takes the piece where it is drawn, and the bench camera holds still until that press ends (today 1 in 10 quick presses at 844 by 390 found nothing).

### 4.4 Stretch (and wake and bed edges)

- **Where it starts:** on a mouse, within the right edge's zone: at least 22 px on screen, but never more than a quarter of the face, and only on blocks of 30 minutes or more. On touch, only from a handle shown on the picked block: 44 px, half outside the edge. On a block under 44 px wide, stretch from that handle or with Longer and Shorter. Today the zone is 0.22 units (3 to 13 px), so a 30 minute week block stretches when grabbed in the middle, and on touch most stretches become moves.
- **Feel:** no lift. The moving edge ratchets 15 minutes at a time and overshoots each step by about 4 percent on (0.08 s, 0.7); the other edge doesn't move. `Snd.detent(true)` per step, 50 ms apart. The chip shows at once: "Workout, 1 h 45 min, until 3:45 pm". Neighbors preview as today. Against a locked block the edge stops, presses 2 px into it, springs back, and ticks low.
- **Release:** a settle squash of 0.03, `Snd.clack(0.8)` at that frame, the toast with Undo at +150 ms.
- **Calmer:** the edge steps without the overshoot.

### 4.5 A whole day: the date card, a day pill, a month card, a dinner slot

Today the brick vanishes, the card fades where you let go, and the block grows out of the board elsewhere with the clack before it shows. Instead: the brick flies from where you let go to the slot `dayFit` chose (re-projected every frame) on the curved home path (0.22 to 0.42 s), falls the last 0.9 units, and lands with the full beat. In the month view, where no slot is drawn, the card that took it presses (1.04 to 1, 200 ms) and the clack plays then. Food on a dinner slot is used up there: the brick sinks into the slot (0.2 s) and the slot glows once.

### 4.6 DOM only drags: the meal board, the setup's Try it, the desk setup

One DOM engine for all of them, the same as the card in hand (3.20): the grabbed spot under the pointer, the lift to 1.06 on (0.22 s, 0.62), the pendulum, the deeper shadow.

- **Meal board** (`draggable` in variant.js: meals, Not cooking, routines, exercises, the setup's pieces and letters). Today a drop glides to the zone's center in 0.2 s and the meal appears 190 ms later with the clack. Instead: the piece flies into the zone's box (FLIP, 160 ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`), level, its shadow tightening to `0 2px 4px -1px`; on arrival `onDrop` runs and `Snd.clack(0.85)` plays in the same frame, and the placed piece squashes (scale 1.02 by 0.96, back over 140 ms). Escape sends it home (today it lands). The cook tag starts a drag after 6 px of travel, and only a tap with no travel changes the cook (today 40 percent of a meal refuses a drag). The scroll edge is measured from below the sticky title, 80 px on touch, and the scroll stops the moment the finger leaves it. (As built: inside the edge it waits a quarter second, and it holds still while the finger rests on a place it can drop that's wholly in view, because on a short screen the first row under the title sits inside the edge. Onto the title or past the edge, it scrolls at once.)
- **Setup Try it** (`try(c)`, the first drag a new person makes). The float keeps the grabbed spot (today it sits at the pointer minus 34 and 22 px), shrinks toward the slot's size as it nears the lane (140 ms), falls and squashes into the slot, and the tray keeps its height so the page doesn't jump. Escape puts the piece back and keeps the setup open.
- **Desk setup lanes** (`laneDrag`). Steps are the same detents; release settles with a 0.03 squash and the clack.
- Cancels never commit (the reliability builder).
- **Calmer:** the piece is set in place with a 160 ms fade and the sound.

### 4.7 Tap paths

- **The place panel** (`placeIt`). Today the flying copy starts at the screen's top left corner with no size and lands 220 to 290 px from the block, and on the phone's list it flashes in the corner. Read the hero's box and clone it **before** the commit. When the desk isn't drawn (the phone's list, the week as a list, no desk, a stage with no size), skip the flight and land in place with the highlight. Otherwise fly with `requestAnimationFrame`, re-projecting the slot every frame (or hold the insets until it lands), and hand over at a hand's height above the slot through the seam: the copy shrinks into the brick, which falls and lands. 440 ms with a 48 px arc, as today.
- **The gold suggestion card's Add:** as today (a drop from 0.9 with the full beat).
- **Quick add:** the clack plays at contact through `land()`, not before the fall.
- **Keys** (arrows, Shift and arrows, Delete): the block springs to its new place and drops the last 0.3 units with a small squash; the clack plays at contact.

## 5. Inputs

| | Mouse and trackpad | Touch | Pen |
|:-|:-|:-|:-|
| Lift | 4 px | 8 px on the board, or a 300 ms still hold; lists per the reliability builder | 4 px; lists per the reliability builder |
| Aim point | The pointer | 36 to 64 px above the finger (3.5) | The pen tip |
| Size in hand | 1.12 | 1.20, at least 60 by 40 px | 1.12 |
| Swing pace | By length | 0.93 times | By length |
| Snap pull | Up to 6 px | None | Up to 6 px |
| Hysteresis | 60 percent | 70 percent | 60 percent |
| Pick | The mesh | The nearest brick within 20 px | The mesh |
| Stretch | Edge zone | Handle on the picked block | Edge zone |
| Hover | Lift, grips, chip | None | Lift and grips if the pen hovers |
| Chip | Above the brick | Above the brick, never under the finger | Above the brick |
| Haptics | None | Android: 8 ms at lift, 6 ms per detent. iPhone: none on the web (section 7). | None |

## 6. Calmer motion and reduced motion

Dragging itself is essential, so the block still follows the hand one to one. Everything else either finishes at once or becomes a fade (opacity and color are not motion).

| Beat | Stays | Goes |
|:-|:-|:-|
| Press | Grips and the picked ring, at once | Dip, squeeze |
| Hold (touch) | A ring that fades in | The rise while held |
| Lift | Lifted height (set at once), shadow (100 ms fade), pick sound | Spring, overshoot, size change, tilt |
| Seam | A 100 ms crossfade in place | The morph |
| Carry | One to one tracking, the outline, the chip, the touch offset (with a 100 ms fade in) | Snap pull, sinking over a slot |
| Dangle | | All of it |
| Aim and snap | The outline (it jumps), detent sound, the brightening, the no mark | Glide |
| Room | Neighbors move at once | Their springs |
| Camera | | The lean |
| Fall and land | Placed at once, the clack, a 240 ms highlight | Fall, squash, dust, knock, rock |
| Toast | At contact + 150 ms | |
| Cancel and refused | Home at once, the red fade, sounds, toast | Flights, dip, shake |
| Undo | At once, highlight, sound | The reverse flight |

Both Calmer motion (Settings) and the system setting, even changed mid drag, finish every motion at once.

## 7. Sound and haptics

| Moment | Sound | When |
|:-|:-|:-|
| Lift | `Snd.pick` | The frame the lift starts (on touch in a list, when the hold fires) |
| Slot change | `Snd.detent(ok)` | Once per settled slot, at least 50 ms apart; lower when it doesn't fit |
| Stretch step | `Snd.detent(true)` | Per 15 minutes, same spacing |
| Contact | `Snd.clack(size)` | The contact frame of the brick in view, within 16 ms. One per drop. |
| Home | `Snd.tap` | Home contact |
| Off the board, evaporate | `Snd.slide` | At release |
| Refused | `Snd.bad` | The bump, 90 ms after release |
| Undo | `Snd.clack` at 0.85 | The old slot's contact |

So the hundredth drop doesn't sound like the first ninety nine (sound.js): `clack` and `tap` get three variants (a shift of the second partial and of the noise band by up to 8 percent) that never repeat back to back, a pitch jitter of ±4 percent, and loudness by impact speed (0.7 to 1.0). `pick` gets ±4 percent pitch. Bigger blocks stay lower, as today.

Haptics on iPhone need the native shell (WebKit has no vibration, and the switch trick reportedly closed in iOS 26.5). The shell's map, for later: prepare at press, a light impact (0.6) at lift, selection per detent (touch only), a rigid impact (0.55 to 0.9 by size) at the contact frame, a soft impact (0.4) at home, a warning once on a refusal.

## 8. Performance rules

1. **The desk draws only while something moves.** Every new animation sets `moving = true` in `step()` while it runs and stops when settled: the hand's springs and swing, the seam, the outline's brightening, the shadow, the fall, the squash, the ring, the flecks, the knock, the rock, home flights, the refused beat, undo flights. Settled means positions within 0.0001 units, angles within 0.02 degrees, speeds within 0.001.
2. **Carrying while still costs nothing.** Today `drag.obj` keeps the desk drawing every frame while anything is in hand. Once the swing, lift, outline, and camera have settled, `step()` leaves `moving` false, and the next pointermove calls `touch()`.
3. **Pointermove stays cheap.** It stores the event and returns: at most 2 ms median, as today. The aim runs once a frame from the latest event (like `hoverSoon`): at most 1 ms when the slot is the same, at most 6 ms at the 95th percentile on the heavy board when it changes (canPlace, the room preview, `renderBoard` of the touched days only).
4. **No allocation per frame in the hand step.** Reuse vectors (today `stepBlob` and friends make new ones every frame). The ring and flecks come from small pools. The carried face is redrawn only when its slot changes, at most every 100 ms, from the face cache.
5. **No new geometry per frame.** Length tweens step through cached widths every 0.05 units until the stretchable brick master exists (3D list 15).
6. **Renders wait for the drop.** The room preview is the drag's own `renderBoard(preview)`. Every other render, `layoutInsets`, and the tidy timer wait while something is in hand (the reliability builder's carrying gate).
7. **Every number is finite.** Each new integrator writes through a finite check and heals to its target (the reliability builder's guards cover the old ones).
8. **Frame budget:** under 16.7 ms at the 95th percentile while carrying at 1440 by 900 on Russell's Mac; the desk is idle (`World.idle`) within 600 ms after a landing settles.

## 9. The code that changes

### board/src/scene.js

| Function | Change | Beats |
|:-|:-|:-|
| New **hand** module, beside `drag` (3880): `handStart`, `handAim`, `handStep`, `handRect`, `handReshape`, `handDrop`, `handNo`, `handHome` | The rig: a pinch group with the brick hanging below it; the lift and size springs; the pendulum, droop, and turn; the floor point from the aim point; the snap pull; the readable minimum; the seam's start size; the fall, its leveling and its true size; the refused beat; the home flight. `handStep` runs in `step()` **after** `stepCamera`. A `HAND_TUNE` object holds every number, for Dev sliders. | 3.3 to 3.13, 3.16, 3.17 |
| `startDrag` (3907) | The carried brick joins the rig. Trading sizes uses `handReshape` on the same mesh. The 200 ms `drag.last` window, the `appear` 0.86 start, and the desk center start go away. It casts no shadow map shadow while carried. | 3.4, 4.3 |
| `dragTo` (3950) | A thin wrapper over `handAim`; the 70 percent slot blend goes away | 3.5 |
| `step()` drag branch (3704 to 3727) | Replaced by the hand step; the sway about the brick's base goes away | 3.6 |
| `stepBlob` (3576) | One rounded shadow on the tallest top, offset half along the key, converging as it falls | 3.5, 3.11 |
| `showGhost` (3959), `showDayGhost` (1699), `ghostTexture` (3887), `ghostAim` and `stepGhost` (3610 to 3631) | On top of what's under it, drawn above bricks, socket fill, under-stroke, no mark, check mark, (0.12 s, 0.9), the brightening, dims at night | 3.7, 3.8 |
| `adoptPosition` (4063) | The exact pose, the gravity fall, the length and size tween, leveling | 3.10, 3.11 |
| `feelBlock` (3408) | The press dip and footprint squeeze; the damped sine squash with bulge; the sideways knock; the fall's rotation and size | 3.1, 3.12 |
| `touchDown` (3481), `dust` and `puffAt` (3507 to 3523) | The ring and pooled flecks; the done color beat | 3.12 |
| `land` (3527), `knockAround` (3491) | Only the board in view; the sound from the first visible contact | 3.12 |
| `endDrag` (3982), `stepHomes` (3598) | The curved home path, its timing, the 4 percent squash and the tap; evaporate | 3.16 |
| `lean` (3270), `feelCamera` (3288), `stepCamera` (3320) | The center on the aim point's ray, moved every frame with the pan payback; 12 percent; hold after contact; none on the phone's desk | 3.19 |
| `pick` (4192) | Touch picks within 20 px; the stretch zone in screen px | 3.1, 4.4 |
| `dressBlock` (498), `faceTex` (207) | The carried face: keycap layout at twice the resolution, the aimed time | 3.5 |
| `makeBlock` (461) | The picked glow stays on the board (3D list 11); motion fields all start here (reliability) | |
| New: `replayMove`, the ring decal, its pool | Undo's reverse flight; the dust ring | 3.12, 3.18 |
| Exports | `handAim`, `handRect`, `handDrop`, `handNo`, `handHome`, `handReshape`, `replayMove`, a `hand` debug getter | |

### board/src/app.js

| Function | Change | Beats |
|:-|:-|:-|
| `dragSource` (4021) | Where you grabbed, as fractions across and along the card; the `pressing` class (with the reliability builder's hold) | 3.1, 3.4 |
| `moveTile` (4105) | Lift at 4 px or the touch rules; the seam (out and back); the aim point and touch offset; the room preview for new blocks (cached by slot); the chip from `handRect`; the carried face's time | 3.2 to 3.9 |
| `aim` (4079) | No lean from a slot; the day brick's `slotWorld(start + min(dur, 60) / 2)` goes away; hysteresis; the 50 ms detent | 3.7, 3.8 |
| `settleDrag` (4103) | `W.lean(null, { after })` | 3.19 |
| `carryStart`, `carryStep` (4207 to 4233) | The pendulum's numbers; the card's swing handed to the brick; the socket on the source | 3.6, 3.20 |
| `carryHome` (4234), `floatFree` and `offBoard` (4251 to 4260) | The seam back; the bench piece keeps its shape over the bench | 3.4, 3.16, 4.3 |
| `dropTile` (4366) | `handDrop`; the refused beat; whole day drops fly and land; the toast at contact + 150 ms | 3.10 to 3.17, 4.5 |
| Stage `pointerdown` (4530) | The touch hold on board blocks and its cue; touch pick tolerance | 3.1, 3.2 |
| Window `pointermove` (4585) | Lift thresholds; store the event for the once a frame aim | 3.3, 8 |
| `boardDrag` (4674), `finishBoardDrag` (4746) | The hand aim; the day's window; refused beat and its toast; `handDrop` | 3.7, 3.17 |
| `placeIt` (7014) | The box and clone before the commit; no flight without a desk; re-projection; the seam at the end | 4.7 |
| `landed` (580), `blockAction` (4900), quick add (10440 to 10459) | Size and speed to the clack; clack at contact | 3.12, 4.7 |
| `undo` and `redo` (347, 359) | `W.replayMove` with what the Undo knows | 3.18 |
| Keydown (11911) | Escape cancels a board move too; other keys wait until the drop | 3.16 |
| `showChipAt` (5106), `edgeLean` (1615) | The chip above the brick, above `#dragtile`; the edge ease about the hand | 3.5, 3.19 |
| `W.onFeel` (12089) | Speed to the clack | 3.12 |

### The rest

| File | Change |
|:-|:-|
| `board/src/sound.js` | `detent` at least 50 ms apart; `clack(size, speed)` and `tap` with three variants, jitter, loudness by speed; `pick` jitter |
| `board/src/style.css` | `.dragtile` shadow and lift; the socket for the tile left behind (no alpha on words); `#chip` above `#dragtile` (z 61); `body.phone-desk #chip` compact instead of hidden; `.tile.pressing` |
| `variants/corners11/variant.js` | `draggable` (1345): the shared DOM engine, the flight into the zone with the clack at arrival, Escape home, the autoscroll edge; the cook tag (2251) |
| `variants/corners11/variant.css` | `.c-ghost-block` lift and shadow; the socket for `.c-lifted`; Calmer rules |
| `board/src/app.js` `try(c)` (9012 to 9155) | Try it on the shared DOM engine |
| `tests/` | A node test of the hand: the pendulum, the fall, the squash law, and finite output, cut from scene.js the way `tests/v11-rig.mjs` cuts app.js (three@0.160.0 is now a dev dependency) |

## 10. Acceptance tests

Two new scripts beside the gate, using its sizes, paths, and real input (`scripts/gate/lib/core.mjs`, `paths.js`, `cdp.mjs`):

- **`scripts/gate/probes/hand.js`** records every frame, in the app's own step time: the pointer and aim point, the floor point on screen, the pinch, the brick's box (`handRect`), roll, pitch, turn, height, size, the outline's center, opacity and state, the shadow's place and opacity, the card's box, opacity and turn, the chip's box, the camera's lean and zoom, every brick that is falling, squashing, knocking, or rocking, `World.idle`, and every `Snd` call (wrapped with a timestamp).
- **`scripts/gate/feel.mjs`** drives the paths and asserts the checks below. `node scripts/gate/feel.mjs -sizes mac1,ipadL,ipadP,phone -inputs mouse,touch -paths reset-yours,reset-todo,lib-week,lib-day,stack-week,move-week,move-day,phone-move,stretch-week,setup-try,reset-meals -n 3`, again with `-calm`, and with `-browser webkit` for the mouse.
- **`scripts/gate/film.mjs <size> <path>`** records a 60 fps screencast of one drag (press, lift, cross, carry, hard stop, hang, release, fall, land, settle) and writes a labeled contact sheet into the run's folder (`runDir` in `lib/session.mjs`: `-out`, or `sunday-reset-gate/` in the system's temporary folder). A person compares sheets before and after; headless timing is not device timing, so the numbers come from the probe, the pictures from the film.

The gate itself (`node scripts/gate/gate.mjs -sizes all -inputs mouse,touch -paths all -n 5`, and `npm run gate`) must stay green: every drop lands where the outline said, is drawn, is told, leaves nothing in hand.

| # | Check | Pass when |
|:-|:-|:-|
| A1 | The seam | The brick's first frame is within 6 px of the card's grab point and its width within 15 percent of the card's (or at the 2.2 cap). No frame with neither. Both together at most 160 ms. The swing angle changes less than 2 degrees across the seam. |
| A2 | One to one | At 1,000 px/s, the floor point on screen is within 1 px of the aim point every frame (mouse), and the pinch is within 1 px of straight above it. |
| A3 | A still hand | Held still for 1 s after a carry, the outline's slot doesn't change and its center moves at most 1 px, including while the lean comes in. |
| A4 | Lift | 90 percent of its height by 140 ms; overshoot 6 to 10 percent; size peaks at 1.12 to 1.14 (1.20 to 1.22 touch). Lifting a block without moving leaves the outline on its own slot. |
| A5 | Swing | After a hard stop from 1,500 px/s in 120 ms: first swing 8 to 12 degrees, the second 25 to 40 percent of it, under 0.5 degree by 1.2 s. At steady speed, at most 4 degrees. The card: 4 to 8 degrees at 4,000 px/s². |
| A6 | Lanes | Carried across noon and 6 pm on the day board, the brick never moves more than twice the pointer's move plus 4 px in a frame. |
| A7 | Room | Over a busy slot, a new block's neighbors move before release; in the release frame none moves more than 0.05 units. |
| A8 | Fall and contact | The fall lasts √(2h/g) within a frame. Exactly one clack, within 16 ms of the first squash frame of the brick in view. In the day view the visible neighbors knock. The fall starts at the carried pose (within 0.01 units). |
| A9 | Refused | Over a locked block: the dip and shake play, `Snd.bad` within 16 ms of the bump, a toast with the reason within 300 ms, home by 800 ms, nothing committed. Same for a block on the board. |
| A10 | Cancel | Escape during a tile carry and during a board move: home, nothing committed, no zoom change, the next pointerup does nothing. |
| A11 | Calmer | No frame with the brick off its hand point by more than 1 px, angles 0, size 1, the first frame at the pointer (never the desk's middle), placed at once with the highlight, no camera change. |
| A12 | Touch offset | On touch sizes the outline's near edge is at least 20 px above the touch point, and at least 70 percent of the brick is clear of a 58 by 96 px thumb drawn below the touch point. |
| A13 | Place panel | The copy's first frame within 4 px of the hero, its last within 8 px of the landing brick; no flight on the phone's list. |
| A14 | Whole day | The brick has frames between the release point and its slot, then a falling state, then a squash; the clack at contact. |
| A15 | Undo | After Undo of a move, the block has positions between the new and the old slot for at least 150 ms, then a squash at the old slot. |
| A16 | Day's end | On the phone's desk, a drop past the last lane is refused with a reason; nothing lands outside the visible hours unannounced. |
| A17 | Stretch | Pressing the middle of a 30 minute week block moves it. The stretch zone is at least 22 px (44 px handle on touch). One detent per 15 minutes. |
| A18 | Sound timing | Pick at the lift, never at press; detents at least 50 ms apart and at most one per settled slot; tap at home contact. |
| A19 | Performance | Pointermove median at most 2 ms, 95th percentile at most 6 ms with slot changes on the heavy board; frames under 16.7 ms at the 95th percentile while carrying at 1440 by 900; `World.idle` within 600 ms of a settled landing; no draws while holding still after everything settles. |
| A20 | Never vanish | The gate's timeline: no frame without the block, no NaN, with the new hand on every path. |

**On a real iPhone, iPad, and Mac (about 15 minutes):** the hold lifts and rises while held; a flick scrolls; the block hops above the finger and its outline is never under it; a brisk stop swings and settles in about a second; the clack lands with the squash, not before; a refusal shakes and says why; Calmer motion carries with no swing; the first drag after a fresh load has sound; a second finger changes nothing.

## 11. The 3D list (blocks first)

Each item: what, code or Blender, cost (S hours, M a day or two, L more), and its risk to Russell's rules: matte Lambert on anything printed, every print 4.5 to 1, no tone curve, no spot or point light on the work, the metered light from `board/src/kit/light.js` unchanged. Any change to a printed face or the brick's material reruns the contrast checks (`DeskLight.contrast`; 353 has no light test yet, and porting 303's `tests/light.test.mjs` is worth it).

### Build now: these serve the lift and place moment

| # | Item | How | Cost | Risk |
|:-|:-|:-|:-|:-|
| 1 | **A clean rounded outline for every brick.** Every brick length closes its rounded shape a hair off its start; three r160 keeps the zero length edge and the bevel tears a notch into the front wall. The brick in your hand shows it closest. | Code: build the rounded rectangle as explicit points, drop near duplicates (1e-6) and a closing point equal to the first (`rrShape`, `slab`). A node test for short edges. | S | None |
| 2 | **Rounded bevels that catch the light.** Flat normals band the rounded ends and step the bevel, worst on a brick that swings. | Code: creased normals (smooth under about 50 degrees), 4 bevel segments, corner radius at most 0.3 of the face and bevel at most 0.2 of the width, so short bricks stop reading as pills. | S | None: the top stays flat Lambert |
| 3 | **One object from pick up to landing.** | Code: `World.reshape` on one mesh instead of end and start; cached widths every 0.05 units during the tween | M | None |
| 4 | **The hang rig.** A pinch group above the brick, so it swings from where you hold it, and the face tipped toward you. | Code | S | A 5 degree tilt changes the face's light by about 2 percent; ink and face change together, so the ratio holds. Rerun the contrast check. |
| 5 | **One contact shadow that softens with height**, on whatever is under the brick, tightening at contact; no second shadow from the shadow map while carried. | Code now (canvas rounded rectangle); Blender later bakes a 9 slice soft shadow in two softness levels | S to M | It passes over printed faces for a moment: capped at 0.35 |
| 6 | **The outline as a socket you can always see**: on top of open time and pushed bricks, a dark fill, an under-stroke, the no mark, the check mark | Code | S | A graphic, not text (3 to 1); it dims with the light level at night |
| 7 | **Touchdown in the screen's plane**: the footprint bulge, the sideways knock, the shadow snapping tight | Code | S | None |
| 8 | **A face you can read in hand**: the keycap layout at twice the resolution, the aimed time, the readable minimum | Code | S | New layout: `pickInk` and the 4.5 check cover it |
| 9 | **A visible underside**, a step darker (0.82 of the side color) with a shallow 0.02 recess, seen as the brick swings and turns | Code: a second Lambert material group on the bottom cap; the Blender master later | S | None: nothing prints there |
| 10 | **A ring of dust at contact**, flat on the board under the brick | Code now (a canvas ring, as the game feel pass built); Blender later renders an 8 to 12 frame dust and ring flipbook (Eevee, transparent, 256 px) | S, then M | An unlit decal under bricks, never on print; dims with the light level |
| 11 | **The picked glow stays on the board** under a lifted brick (it rides up with the brick today) | Code: parent it to the board, or cancel the lift | S | None |
| 12 | **A line of light on the bevels**: a small lift in brightness in the bevel band only (normal height 0.3 to 0.9), never the top face | Code: `onBeforeCompile` on the Lambert body | S | It touches the brick material. It stays Lambert and view independent (matte), never on the top. Rerun the light checks. |
| 13 | **The groove sits level with the board** (its strip stands 0.015 above it today), so a brick seats into it | Code | S | None |
| 14 | **Flecks only where they read**: flat, pooled, day board and phone's desk; no round puffs (2 to 3 px today) | Code | S | None |

### Build next, or Russell chooses

| # | Item | How | Cost | Risk |
|:-|:-|:-|:-|:-|
| 15 | **A stretchable brick master** (end caps and a middle that stretches, a side attribute per vertex): smooth stretch and length tweens, and later one draw call per height (about 151 today) | Blender: `blender/build_bricks.py` beside `build_props.py`, writing positions, normals, and side | M to L | None to print; a new pipeline |
| 16 | The week's print floor at 12 px (a mark when the name can't print, the chip names it), and the same for rack keycaps (7 to 8 px today) | Code | S | Better for the rule |
| 17 | Print that stays sharp when zoomed or leaned: faces redrawn at the needed density per zoom step; MSDF text later | Code | M | None |
| 18 | Painted hardwood: a faint grain on walls and ends, from `block-finishes.js`, in Lambert | Code | S to M | Walls only; the top keeps its color |
| 19 | Worn edges: lighter paint where hands touch, baked from curvature into vertex color | Blender, needs 15 | M | Walls only |
| 20 | A contact line under bricks at rest (soft decals, or occlusion baked into the master's lower walls) | Code or Blender | S to M | Never on the top |
| 21 | A recessed label panel with a darker rim, so print reads stamped | Code or Blender | M | The panel's flat color must pass 4.5 on every palette |
| 22 | Grip dimples pressed into movable bricks, shown on hover and pick | Code (normal map) | M | Off the print area |
| 23 | Done blocks sink to about 60 percent height with an engraved check | Code | S to M | Changes how done reads |
| 24 | Dimmed blocks sit lower during a reset step, or read as plain wood blanks | Code | S | The quiet ink must keep 4.5 |
| 25 | Soft blocks as low inlays (cork or felt) instead of a hatch | Code | M | Print on texture: test it |
| 26 | A modeled padlock set flush in the back corner, and code made metal with the warm reflection map (it renders olive today) | Blender and code | S to M | None |
| 27 | The now pin as enamel, smooth, with no shadow from its head | Code | S | None |
| 28 | Real routed grooves with a lip, so a lifted brick leaves a socket | Code, profile from Blender | M to L | None |
| 29 | Props: real normals (smooth by angle) and baked occlusion | Blender | S to M for normals, M for occlusion | Props carry no print except the notepad |
| 30 | **The notepad page to Lambert** (it is shiny today and carries words) | Code | S | Fixes a rule break: do it regardless |
| 31 | The mat: the stitch as a texture band (1 px lines today); a rolled edge and leather grain | Code | S to M | Mat only |
| 32 | Board edges and month cards: creased normals, a darker end grain | Code | S | None |
| 33 | The shadow camera fitted to the framed view (34 texels a unit at every zoom today) | Code | S to M | None |
| 34 | Check for a light hairline at the base of bench pieces (normal bias) | Code | S | None |
| 35 | Instanced bodies per height after 15; face textures budgeted by pixels | Code | M | None |
| 36 | A 2 percent tone change per brick, seeded, walls only | Code | S | Walls only |
| 37 | A movable brick tips 1 to 2 degrees toward the pointer on hover | Code | S | None |
| 38 | A pressed lip under printed names (1 to 2 px at 0.3) | Code | S | Test every palette |
| 39 | The now line draped at the height of what it crosses; the now tag nudged off the next lane's hour | Code | S | None |
| 40 | Overlays that don't dim at night (the glow, the now line) | Code | S | None |
| 41 | A lab page that renders bricks and props under the metered light, and brick stills from `render_props.py` | Code and Blender | S to M | None |
| 42 | Month and year bricks as flat inlays; bench pieces from the same master; one wood swatch set for bricks, bench, rack, and board | Blender | M | None |
| 43 | Tapered clock hands; the dead bench rim code removed; the lamp's pool measured before anyone changes it | Blender and code | S | None |

## 12. The Socratic QA list

Each item is a question a person would ask, ranked by how much it breaks or cheapens the loop. Status: **Spec** (fixed by this spec), **Reliability** (fixed by the reliability builder), **Open** (still open). Sources: CM (code map), F (measured matrix), T (touch), S (Socratic walk), R (research), 3D (the 3D audit).

### Does it land, and does it look like it landed?

1. **Can a dropped block vanish again?** Not on main, but nothing guards the NaN class. **Reliability** (finite guards, a watchdog after commits, a scene test, the gate). CM-08, S01, R, 3D.
2. **Why does placing from the panel fly a collapsed copy from the top left corner?** The box is read after the commit replaced it; it lands 220 to 290 px off, and flashes in the corner on the phone's list. **Spec** 4.7. CM-01, S02.
3. **What happens when a second finger touches?** It ends, steers, or steals the carry, strands a block in the air, or taps something. **Reliability**. CM-02, F2, F3, T1.
4. **What does a cancelled touch do?** On the meal board, letters, Try it, and desk lanes it commits, and the next tap anywhere acts. **Reliability**. CM-03, CM-17, CM-27, F6, F8, T4, T6, T10.
5. **Why did my second drop fly home on a phone?** A toast with Undo over the week swallowed it, and the refusal toast stacked higher. **Reliability** (toasts step back while carrying), plus the toast timing in 3.15. F1, CM-24, S29.
6. **Why won't the list scroll under my thumb?** Every tile takes the touch. **Reliability**. CM-04, T2, S21, R.
7. **Why did tapping a tile pick Monday?** The tap's own click lands on the panel it opened. **Reliability**. T3.
8. **Is the thing I grabbed the thing I'm holding?** A 147 by 83 px card becomes a 19 by 38 px brick in one frame, and back. **Spec** 3.4. CM-05, S12, R, 3D.
9. **Why did the slot move under my still pointer?** The lean zooms around the first slot crossed: 34 to 85 px, up to 2.4 hours, a row; one first drop landed on a locked block. **Spec** 3.19. CM-06, S05, F12, T9.
10. **Is it in my hand or chasing me?** It trails 60 to 90 px, and leaves the hand by up to 210 px when the planned slot jumps. **Spec** 3.5. R.
11. **Why does the block lurch at noon and 6 pm?** Its target is the slot, and the slot wraps lanes. **Spec** 3.7. CM-07.
12. **Can I see what I'm carrying on touch?** The finger covers the brick and its outline; on the phone's desk a lift moves it 5 px. **Spec** 3.5. T8, F10, R, 3D, S07.
13. **On the phone's desk, where and when will it land?** The chip is hidden and the brick prints its old time. **Spec** 3.5, 3.7. F9, S07, S13, R.
14. **Why did Escape zoom out to Month and still move my block?** Escape only knew about tiles. **Spec** 3.16. CM-28, F5, S04.
15. **Where did my block go at midnight?** On the phone's desk a drop past the last lane goes to tomorrow and leaves the board. **Spec** 3.7. S03.
16. **Why did my move become a stretch, or my stretch a move?** Stretch zones are 3 to 13 px, and on a 30 minute week block the middle is the zone. **Spec** 4.4. F4, S06, CM-19.
17. **Why do the bricks have a notch?** A torn seam in every brick's rounded outline. **Spec**, 3D list 1. 3D.
18. **Does it dangle?** The card turns 0.1 degree; the brick turns 1.6 to 5.7 degrees about its base, so its top wobbles. **Spec** 3.6. S10, S11, R, 3D.
19. **Can I see the board on a landscape phone?** At 844 by 390 the date card and Today's panels cover 44 to 100 percent of the day. **Open**. F14.
20. **Is the reset's week usable on an iPad Pro held upright?** The panel squeezes it to 580 px; 15 minutes is about 6 px. **Open**. S08.

### Pinch, dangle, place

21. **Does a new block show the room it makes?** The chip says 4 blocks move; nothing moves until release. **Spec** 3.9. CM-10.
22. **When a block on the board can't land, does it say why?** It flies home without a word. **Spec** 3.17. CM-09.
23. **Does a refusal feel like no?** Only the chip says it; the red outline hides under the brick and under red to-dos. **Spec** 3.17, 3.7. S17, R.
24. **Does the sound land with the block?** In the day view the hidden week copy lands first: the clack is 120 to 133 ms early and the neighbors you see don't knock. **Spec** 3.12. S09, R.
25. **Why does the board shrink while my block lands?** The lean lets go on the release frame. **Spec** 3.19. S14, R.
26. **With Calmer motion on, why does the brick glide in from the middle of the desk?** The calm branch ignores where it should start, and it stays at 86 percent. **Spec** 3.4. CM-13.
27. **Why does a drop on a whole day jump?** The brick vanishes, the card fades where you let go, the block grows elsewhere, and the clack comes first. **Spec** 4.5. CM-15.
28. **Where's the outline?** Over open time and pushed bricks it is underneath them. **Spec** 3.7, 3D list 6. 3D.
29. **Where's the shadow?** Under open time and the brick itself; and there are two. **Spec** 3.5, 3D list 5. 3D, S, R.
30. **Who can see the squash?** Squash, knock, press, and hover move 1 to 2 px from this camera. **Spec** 3.1, 3.12, 3D list 7. 3D, S16.
31. **Do I know I have it before I move?** At week zoom the press looks the same as nothing, and a still finger lifts nothing. **Spec** 3.1, 3.2. S16, R.
32. **What time does the brick in my hand say?** Its old time, on every board. **Spec** 3.5. S13, F9.
33. **Can Undo take it back the way it came?** It sinks and pops. **Spec** 3.18. S15.
34. **Why does a bench piece change shape twice and zigzag?** It is ended and started twice. **Spec** 4.3. S22, 3D.
35. **What is the 15 minute pin in my hand?** At week zoom it is a few pixels with its name sideways at 5 px. **Spec** 3.5, 3D list 8. S23, 3D.
36. **Why did pressing T while holding a block change the view?** Keys still work mid drag. **Spec** 3.16. S18.
37. **Why did the board move while I aimed?** Renders, the clock tick, and Block library's tidy timer run mid drag. **Reliability** (the carrying gate). CM-12, F11.
38. **Can a redraw strand a touch drag on iOS?** Possibly: touches stay on a removed tile. **Reliability** (capture and orphan listeners). CM-11, T7.
39. **What if a drop throws?** The brick stays in hand and the model throws on non-finite starts. **Reliability** (`dropSafe`, finite checks). CM-18.
40. **Why is the camera stuck after a cancelled bench carry?** The cancel path skips `benchCarry(null)`. **Reliability** (cancel paths); 4.3 asks for it on every way out. CM-14.
41. **Why does a meal refuse to drag from its lower half?** The cook tag takes 40 percent of it. **Spec** 4.6. CM-16.
42. **Is the setup's Try it, the first drag a new person makes, the same feel?** No: an offset float, no landing, a page jump. **Spec** 4.6. CM-17, S25.
43. **Why does the meal board scroll when I'm not near the edge, and not when I am?** The edge zone is under the sticky title. **Spec** 4.6. F15.
44. **Can a finger hit a 15 minute brick?** It is 6 to 12 px. **Spec** 3.1. S20.
45. **Why does the far side of the board leave the screen while I carry?** An 18 percent lean around one side. **Spec** 3.19. S33.
46. **Why did my quick press after a bench drop miss?** The camera was still easing back. **Spec** (the hand works from where things are drawn; the bench holds still for a press while it eases). F16.
47. **Do quick adds clack before they land?** Yes. **Spec** 4.7. CM-22.
48. **Does a fast second drag start from the last drop?** Within 200 ms, yes. **Spec** 3.4 (one object; the time window goes). CM-23.
49. **Why does crossing rows purr?** 7 to 12 detents in 150 to 230 ms. **Spec** 3.8. R, S.
50. **Why does the fall start above the carried height?** A 0.12 unit jump at release. **Spec** 3.10. R.
51. **Does a careful drop settle?** No bounce or rock. **Spec** 3.12 (the squash's rebound), 3.13. S34.
52. **Does a block flying home land like one?** No wobble, a vertical arc you can't see from above. **Spec** 3.16. S, 3D.
53. **Why is the chip under the tile, or on the brick?** Its z order, and it sits 30 px above the pointer where the lifted brick is. **Spec** 3.5. S28, 3D.
54. **Is the tile I picked up broken?** It fades to 35 percent, words and all. **Spec** 3.20. S.
55. **Why does the glow float under a lifted brick?** It rides up with the brick. **Spec**, 3D list 11. 3D.
56. **Why does a done block change color the instant it touches?** It swaps at contact. **Spec** 3.12. 3D.
57. **On touch, how would I know a block drags or stretches?** Grips and chips are pointer only. **Spec** 3.1, 4.4. CM-30.
58. **Why does the meal ghost hide and show itself on every move?** A belt and brace around `elementFromPoint`. **Spec** 8 (remove it). T16.
59. **Over the bench in the day view, why does the chip say "Drop it on a day's row"?** The day has times, not rows. **Spec**: it says "Drop it on a time". S.
60. **Can I place precisely on a phone's week?** A quarter hour is 3.4 px. **Spec** 3.7 (30 minute steps under 6 px). T19.
61. **Is time that's over different from time ahead?** It looks the same; 16 of 74 sweep drops went in as done. **Open** (decision 9; the outline's check mark is in this spec). S19.

### Tiles and bricks

62. **Can I read the week?** Names print at about 5 to 6 px and sideways. **Open** (3D list 16). S27, 3D.
63. **Why do short bricks look like pills?** A fixed corner and bevel. **Spec**, 3D list 2. S31.
64. **Do the bricks look like wood or plastic?** Plastic: flat color, uniform bevel, no grain or contact. **Open** (3D list 18 to 22). S, 3D.
65. **Why is the lifted tile's meta cut short beside its badge?** **Open**. S.
66. **Why are all Your time tiles the same yellow and size?** Length is a word, not a size. **Open**. S.
67. **Does the Your time list say there's more below?** It clips under the footer with no fade. **Open**. S35.
68. **Reset tiles: type, color, contrast?** Good (16/800 white at 5.39 to 1, meta 5.39, badge 9.23). Keep them. S.
69. **Why do headings get a box like a text field?** Focus from code shows the ring. **Open**. S30.

### Everything else found on the way

70. **Leaving a made up board throws on every render.** **Open** (one line in the touch patch). T5.
71. **The reset sheet sits in the home indicator zone on a phone.** **Open**. T11.
72. **The desk setup's name rack overflows at 820 by 1180 and 844 by 390.** **Open**. F13.
73. **Food dropped on a day without a dinner makes two changes and its toast has no Undo.** **Open**. CM-21.
74. **No handling for a lost WebGL context.** **Open**. CM-25.
75. **Sound may stay locked on iPad for the first drags.** **Reliability** (unlocks on pointerup and click, in the touch patch); check on a device. CM-26, T12.
76. **A recipe deleted elsewhere can throw on every move.** **Reliability** (null checks, already in its diff). CM-29.
77. **On the phone's list a step's grip lifts with nowhere to drop.** **Open**. T14.
78. **Reordering by grip in Settings loses its capture after one move.** **Open** (not in V11's Settings). T15.
79. **Long press callout, tap flash, page pinch, pull to refresh.** **Reliability** for the callout and the flash; **Open** for overscroll and pinch on panels. T17.
80. **Views: bricks float over bare leather; week bricks and month cards cross in the air.** **Open**. S24.
81. **The meal mat shows both layers for a frame.** **Open**. S.
82. **The now pin's shadow floats; the now line floats over open time; the now tag covers a label.** **Open** (3D list 27 and 39). S, 3D.
83. **Try it's demo piece covers the hour labels and loses its mark.** **Open**. S.
84. **Haptics on iPhone.** **Open** (the native shell, section 7). T18, R.
85. **A Dev button that runs every drop on the device in hand.** **Open**. S.

## 13. Decisions for Russell

1. **Where the block rides against a mouse pointer.** Recommended: **above the pointer, with the pointer on its landing spot.** The other way (the pinch under the pointer, the spot below it) re-aims a block the moment you lift it, and a cursor that marks the spot is what every drag on a computer does.
2. **How exaggerated.** Recommended: **the middle set here** (lift 1.5 and 1.8, size 1.12 and 1.20, about 6 degrees on a normal stop and 10 on a brisk one, nothing past 14). Build the three presets (calmer, middle, bolder) as Dev sliders on `HAND_TUNE` and pick in one sitting on your Mac, iPad, and iPhone.
3. **The camera while carrying.** Recommended: **a 12 percent lean around your hand**, none on the phone. The alternatives are no lean at all, or a lean only after you pause.
4. **Short blocks in hand.** Recommended: **a readable minimum** (44 px, 60 on touch) that shrinks to its true length as it falls. The alternative is always true size, with the chip carrying the words.
5. **The brick in hand prints the time it would land at,** as Calendar does. Recommended: **yes.**
6. **On touch, the block and its outline ride above your fingertip** (36 to 64 px). It changes the feel: you steer from below. Recommended: **yes.**
7. **On touch, a still 300 ms hold lifts a block on the board.** Recommended: **yes**, so a finger that rests on a block can pick it up.
8. **The no.** A refused drop dips, bumps, and shakes before it goes home. Recommended: **yes**, at these sizes.
9. **Time that's over.** Keep "goes in as done," refuse it, or ask? Recommended: **keep it, and show the check in the outline before you let go.**
10. **Past the end of the day** on the phone's desk. Recommended: **refuse with a reason**, never tomorrow at midnight.
11. **A phone's tiny week.** Recommended: **30 minute steps when a quarter hour is under 6 px**, fine tune after with Earlier and Later.
12. **Escape and keys mid drag.** Recommended: **Escape always cancels; other keys wait** until the drop.
13. **One drag engine for every DOM surface** (meals, the setup, letters). Recommended: **yes.**
14. **The Blender brick master.** Recommended: **yes, after the build now list lands.** It makes stretch and length changes smooth and lets the desk draw bricks in far fewer calls.
15. **Haptics.** Recommended: **in the native shell only**, per section 7.

## 14. Built, Oct 15 (checked again on V11-2, Oct 20)

Built on the night of Oct 14 into V11, with every recommendation in section 13 taken. The hand is on wherever V11's feel is (`FEEL`): `hand.use` in `board/src/scene.js`, `HAND` in `board/src/app.js`. The other variants keep the old paths.

**Files.** `board/src/scene.js` (the hand, the fall, the landing, the brick's shape and material, the outline, the shadow, the lean, Undo's replay); the drag and carry code in `board/src/app.js` (the tile carry, the board carry, letting go, refusals, toasts, Undo, the place panel, the stretch handle, Try it's piece); `board/src/sound.js`; `draggable` in `variants/corners11/variant.js`; `variants/corners11/css/touch.css`; `tests/hand.test.mjs`; and the gate (`scripts/gate/lib/core.mjs`, `paths.js`, `probe.js`, `gate.mjs`, `release-gate.mjs`, and the new `last-green.json`; see docs/DRAG-GATE.md).

### By part

| Part | As built |
|:-|:-|
| 3.1 Press | The dip and footprint squeeze on a spring (`press`, `feelBlock`). Tiles take a `pressed` class at pointerdown, so iOS shows it. On touch, a miss within 20 px takes the nearest movable brick (`nearBrick`) for a hold or a move; a tap acts on what's under the finger, so open time beside a block still opens that time (`hit.near`, `bdrag.under`). |
| 3.2 Hold to lift | On the board too: a still 300 ms hold within 8 px lifts (`holdWait`, `liftBlock`), the brick rising from 120 ms. The card in hand starts from the held tile's 1.06. |
| 3.3 Lift | (0.22 s, 0.62) to 1.5 on the week and 1.8 on the day; 1.12 in hand with a mouse or pen, 1.20 on touch; the face tipped toward you; the pick on the lift frame (`handStart`). |
| 3.4 Seam | The card becomes the brick in 140 ms, both pinned at the spot you grabbed; the brick starts as wide as the card (up to 2.2 times) and its swing carries over. Back over a panel, the brick sinks to 0.6 as the card grows back out of it (`seamOut`, `seamIn`, `foldBack`). |
| 3.5 Carry | The aim point, the floor point, and the brick hanging straight above it (`handAim`, `handStep`). On touch it rides 36 to 64 px above the finger (`touchLift`), coming in over 150 ms at the seam, or over 48 px of travel for a board block. The readable minimum; the face printing the time it would land at; one soft shadow on the tallest top under it (`handShadow`); the chip above the brick, beside it near the top, compact on the phone's desk (`chipHand`). |
| 3.6 Dangle | The pendulum law with pace by length, droop, the ruler turn, and soft caps (`handStep`). The card in hand and the DOM pieces swing on the same law (`carryStep`, `draggable`). |
| 3.7 Aim | Hysteresis (60 percent with a mouse, 70 on touch, or 80 ms); 30 minute steps where a quarter hour is under 6 px; the day's end refused with "That runs past the end of the day"; no lurch at noon or 6 pm; re-aimed every frame the camera moves (`carryFrame`). The outline sits on top of what it overlaps (`ghostTop`): a dark socket with white dashes when it fits, red with Apple's no when it doesn't, a check mark on time that's over. |
| 3.8 Snap and detent | Detents at least 50 ms apart (`detentSoon`); the mouse's 6 px pull after 100 ms; the lock on brightening (`ghostLock`); the sink over a slot that fits, the rise over one that doesn't. |
| 3.9 Room | New blocks make room too, with a 60 ms rest before the board plans again, so a fast sweep doesn't shuffle it (`roomFor`, `moveTileHand`). |
| 3.10 to 3.14 | The fall from the carried pose under 280 units/s², 90 to 160 ms (`handFall`, `stepFalls`); the clack on the contact frame of the brick in view; the damped sine squash with the footprint bulge; the dust ring, and flecks on the day board and the phone's desk; the knock, nearest first; the rock only when it came in moving (`touchDown`, `squashFor`, `ringAt`, `flecks`, `knockAround`). |
| 3.12 Done color | **Not built.** A block landing on time that's over still turns the done color at contact, not 250 ms after. |
| 3.15 Toast | 150 ms after contact; a new receipt replaces the last drop's (`toastLater`, `toastFeel`). |
| 3.16 Cancel | Home on a curve with an arc, arriving level and at true size, with the tap. Escape cancels a move as well as a tile; every other key waits until the drop. |
| 3.17 Refused | It dips toward the block in the way (`blockerOf`), bumps with `Snd.bad` as the outline flashes and that block hops, recoils, shakes, and goes home at 280 ms (`handNo`); the toast says why at 240 ms, for board blocks too (`refuse`). |
| 3.18 Undo and redo | A moved block flies back and lands soft (`replayMove`); a new block lifts and fades (`evaporate`); a block put back drops in. The play is only a look: if it fails, Undo still undoes. (Found by the gate on Oct 15: the fading copy was made with three's `clone`, which threw on a block's own userData and lost the undo step. The copy is made by hand now, `shellOf`.) |
| 3.19 Camera | 12 percent around the aim point's ray, held until 250 ms after contact, then out on (0.5 s, 1.0); none on the phone's desk or in Calmer motion (`lean`, `leanStep`, `feelCamera`). |
| 3.20 Socket and card | The tile left behind keeps its footprint with its contents hidden, no alpha on words; the card in hand on the lift spring with the deeper shadow. |
| 4.1 to 4.3 | Every tile path on the hand: the tray, Block library, the reset's steps, To-dos, the rack, and bench pieces, which lift as themselves and change shape once over a board (`moveTileHand`, `dropTileHand`, `startDrag`). |
| 4.4 Stretch | On touch, only from a 44 px handle on the picked block (`#sgrip`, `placeGrip`); with a mouse the zone is 22 px, never more than a quarter of the block (`edgeU`). |
| 4.5 Whole day | A block let go on a day pill, a month card, or the date card flies to the slot the day chose and lands (`dayFlight`, `handFly`); where no slot is drawn, the card presses (`dayPress`). |
| 4.6 DOM drags | The meal board, the setup's Try it, and the desk setup on one law: the grabbed spot kept, 1.06, the swing. Drops fly into the zone's box in 160 ms and land with the clack and a squash. The scroll edge as in 4.6 above. |
| 4.7 Place panel | The copy flies from the hero, read before the commit; the desk holds its insets until it lands (at most 1.5 s), and the toast comes after (`placeIt`, `holdInsets`). |
| 5 Inputs | Mouse, pen, and touch by pointer type throughout. |
| 6 Calmer and reduced motion | The one to one carry stays; no swing, size 1, no lean, placed at once with the highlight. Motion that isn't the carry stays at or under 0.25 s. |
| 7 Sound | `clack(size, speed)` in three variants with jitter and loudness by speed; `tap` variants; `pick` jitter; detents 50 ms apart. Since Oct 20 the sound is made early and quietly, so the first press only resumes it, and with sound off there's no context at all (see Proof). |
| 8 Performance | The aim runs once a frame (`carryFrame`): pointermove only stores it, and pointerup flushes it. The desk still draws only while something moves. |
| 10 Tests | `tests/hand.test.mjs`: A2, A4, A5, A8, A11, the squash law, the no beat, and finite output, cut from scene.js the way the motion test cuts it. Measured there: the lift reaches 90 percent by 83 ms with a 7.1 percent overshoot and the size peaks at 1.129; a hard stop swings 9.1 degrees, the next swing is 34 percent of it, 0.27 degrees by 1.2 s, 0.12 at steady speed; the fall from 1.5 takes 104 ms; the squash peaks at 11.0 percent at 32 ms and rebounds 2.5. The probe, feel, and film scripts of section 10 were run from outside the repo, not added to `scripts/gate/`. |
| 13 Decisions | All fifteen as recommended. For decision 2, the three presets are in Settings, Help, Dev, Lift and place (Calmer, Middle, Bolder), kept on the device (`sundayreset.hand`). |

### The 3D list

Built in code: **1** (one clean rounded outline, `rrShape`), **2** (creased normals, 4 bevel segments, the corner at most 0.3 and the bevel at most 0.2 of the width), **4** (the hang rig), **5** (one contact shadow), **6** (the outline as a socket), **7** (touchdown in the screen's plane), **8** (a face you can read in hand), **9** (the underside a step darker, 0.82, in the brick's own shader, so a brick is still one draw: a material group of its own made every brick three draws, 364 on the week where 210 do), **10** (the dust ring as a decal), **11** (the picked glow stays on the board), **12** (the line of light on the bevels, `onBeforeCompile` on Lambert, never the top), **13** (the groove level with the board), and **14** (flecks only where they read). **3** is in part: a re pick and a bench piece stay one object, without the cached widths.

**Blender, written down and not faked:** the stretchable brick master (15) and the shallow recess in its underside (9); the 9 slice soft shadow in two softness levels (5); the dust ring and flecks as an 8 to 12 frame flipbook (10); worn edges (19); a padlock set flush (26); routed grooves with a lip (28); props with real normals and baked occlusion (29); one wood swatch set, and month and year inlays (42); tapered clock hands (43); brick stills for a lab page (41).

### Proof

**The gate, on V11-2** (Oct 20, `npm run gate` on a build of the `v11-2` branch, ports 4480 and 9480): **GREEN**.
- Chrome: 303 of 303 drops at Mac 1440x900, iPad 820x1180, Duo folded 466x678 and iPhone 390x844, mouse and touch, three of each, on every path that's on each size. With the sound fix, the 4 first presses pass too.
- WebKit: 57 of 57 at Mac size, and its first press.
- The board at rest is exactly as wide as V11's in all five places it's measured.
- The new to-do step paths, which belong to another builder, were left out of that run: at iPad size their panel covers the board. The tries to break it (`gate:full`'s, on the iPhone, the folded Duo, the iPad, and the Mac): **504 of 504**. At 07cfa4d, before this work: GREEN, the same 303 and 57.

On the way, the gate found five faults of this work's, all fixed:
- Undo of a placed block lost its step (3.18).
- On the folded Duo, the meal board scrolled under a finger resting on its first row (4.6).
- With a finger, a tap on open time beside a block opened the block (3.1).
- The underside group made every brick three draws.
- A piece in a sideways list inside a list that scrolls down could lift on a move that list owns. It now lifts only on the hold, and a quick move scrolls.

It also showed two paths had gone quiet under other changes the same night (`today-bench`, and `reset-meals` on a sheet). They run again, and two rules now keep that from recurring:
- n/a means only "not on this size".
- Every cell the last green run ran has to run again (docs/DRAG-GATE.md).

The new tries with a sideways list under the lift point fail on 07cfa4d (the flick lifts the piece, 0 of 2), so the gate catches the old way.

**Frame times on a phone.** Conditions:
- An iPhone 390x844 with a finger, carrying the reset's Your time onto the week.
- Headless Chrome at 4x CPU throttling on an M4 Pro, a fresh Chrome for each build.
- Oct 20, the load average 4 to 7 on 14 cores.
- The second and third carries of three.

| | 07cfa4d | V11-2 |
|:-|:-|:-|
| Frame interval, median and 95th percentile | 16.7 and 16.8 ms | 16.7 and 16.7 ms |
| Frames over 33 ms in a carry | 1 | 1 |
| The page's handling of a pointer move, median (95th percentile) | 3.6 to 4.3 ms (7.0 to 7.1) | 0 ms (0.3) |
| The desk's draw, median | 3.6 to 4.4 ms | 3.0 to 4.5 ms |
| Longest frame | 67 ms | 67 ms |

The one long frame left in a carry is letting go: the commit and the redraw run in pointerup, 57 to 65 ms of script at 4x, as before this work.

**The first press after a load** used to stop to start the sound: `new AudioContext()` inside the press held the page about 200 ms in Chrome, whether or not the CPU was throttled. On 07cfa4d that didn't show, because the gate's boot clicked the welcome's close mark first. Now (`board/src/sound.js`, `tests/sound.test.mjs`):
- The sound is made early and quietly (suspended): once sound is on, while the page is idle and the desk at rest. Steam counts as rest; after 2 s it's made anyway.
- A person's first touch or click only resumes it, inside that gesture. iPhone Safari starts it on a touch that ends, so the app asks again on pointerup and click.
- Turned on from a tap in Settings, it's made right then, so the chime plays.
- With sound off there's no context at all.

Measured on a fresh load (a fresh Chrome, the iPhone, a finger on Your time, nothing pressed before): the page's time over the first press went from 196 ms to 2.5 ms at 4x, and from 226 ms to 0.4 ms at 1x. The gate now judges every first press after a load as its own row (`first-press`): at most 50 ms in the page, with the sound made before it. On V11-2 as it was before this fix, it fails at 202 ms. The shadow in hand is made while the desk loads too, so the first lift doesn't pay for it.

**Clips** (CDP screencast and ffmpeg, in `docs/lift/`):
- `phone-touch.mp4`: the iPhone with a finger; the tile lifts, swings, and lands on today.
- `phone-touch-refused.mp4`: the same drop onto a locked block; it says no, says why, and goes home.
- `phone-touch-before.mp4`: the same drop at 07cfa4d.
- `ipad-pro-touch.mp4`: an iPad Pro 1024x1366 with a finger; a block on the week held, lifted, carried to Saturday, and landed.
- `mac-mouse.mp4`: a Mac 1440x900 with a mouse; Workout from Block library onto Saturday's day board.

### Left, or for Russell

- The done color beat (3.12).
- Letting go still runs the commit and the redraw inside pointerup, 57 to 65 ms at 4x on a phone, as before this work. That is the one long frame in a carry.
- Section 10's scripts in the repo, with A6, A7, A13, A14, and A16 asserted by a script. A9 (refused) and A15 (Undo) were checked frame by frame; the gate's tries cover A10 (Escape), A13 (Add from the place panel), and the tap beside a block.
- Section 10's fifteen minutes on a real iPhone, iPad, and Mac, including the change for a piece in a sideways list inside a list that scrolls down: the hold lifts it, and a quick move scrolls.
- The Socratic list's Open items stay open.

## Appendix: the numbers in one place (`HAND_TUNE`)

| Name | Value |
|:-|:-|
| Lift height | week 1.5, day 1.8, mini 0.8, desk and bench 1.6 |
| Lift spring | (0.22 s, 0.62) |
| Size in hand | mouse and pen 1.12, touch 1.20 |
| Tilt | +0.08 rad toward you |
| Hang below the pinch | week and bench 0.55, day 0.75 |
| Readable minimum | 44 px long (mouse, pen), 60 by 40 px (touch), start size cap 2.2 |
| Touch offset | clamp(22 + half the outline's depth, 36, 64) px; 150 ms at the seam, 48 px of travel for a board block |
| Seam | 140 ms; brick (0.14 s, 1.0) |
| Swing pace | 1.33 + 0.37 e^(−(minutes − 15) / 60) Hz, touch 0.93 times |
| Swing | damping 0.36, gravity 40,000 px/s², follower ω 45, clamp 30,000 px/s², speed lean 0.002 degrees per px/s to 3, pitch 0.7, droop 3 degrees, caps 14, 9, 7 degrees |
| Turn | 0.006 degrees per px/s, 2.0 Hz, damping 0.45 |
| Card | 1.06, tilt −2 degrees, 1.6 Hz, damping 0.36, cap 12 degrees |
| Aim | hysteresis 60 percent (touch 70), 80 ms; snap pull 6 px after 100 ms under 150 px/s; sink 15 percent, rise 8 percent |
| Outline | (0.12 s, 0.9), fade in 90 ms, brighten 0.22 to 0.34 to 0.26 over 160 ms |
| Detent | at least 50 ms apart; settled for 40 ms |
| Room | (0.20 s, 0.9) |
| Lean | 12 percent, (0.35 s, 1.0) in, hold until contact + 250 ms, (0.5 s, 1.0) out |
| Fall | g 280 units/s², 90 to 160 ms |
| Squash | peaks 8, 10, 11 percent; e(t) = sin(35 t) e^(−t / 0.06); bulge 0.5; 260 ms |
| Ring | 280 ms, 0.9 to 1.45 of the footprint + 0.5, opacity 0.42 |
| Knock | hop 0.032 week, 0.05 day; nudge 0.045 week, 0.07 day |
| Rock | w 26, damping 0.3, at most 2.5 degrees |
| Toast | contact + 150 ms |
| Home | clamp(0.20 + 0.00018 px, 0.22, 0.42) s, curve 15 percent to the side, squash 0.04 |
| Refused | dip to 0.25 above in 90 ms, recoil 0.2 on (0.18 s, 0.5), shake ±3.5 degrees over 160 ms, home at 280 ms |
| Undo | 0.30 s flight, from 0.6 units |
| Calmer | crossfade 100 ms, highlight 240 ms |

**Screen scale at the sizes tested** (one unit up on screen; the brick's height above its outline; the touch offset): Mac 1440 by 900 week 22.4 px, 41 px, 46 px; day 18.4, 43, 64. iPad 1180 by 820 week 18.4, 34, 42. iPad 820 by 1180 week 12.2, 22, 36. The reset's week on a Mac 13.1, 24. Phone's desk 4.6, 11, 52.

**Sources** for the numbers and the reasoning: the six reports in `/private/tmp/claude-501/drag-design/` (codemap, matrix, touch, socratic, threed, research), the three prototypes and their recordings in `/private/tmp/claude-501-drag-scripts/` (`physics/proto_patch.py`, `apple-motion` and its build's scene.js and app.js, `gamefeel` and its pendulum sim `sim/pend.mjs`), and the research's sources (Apple's Human Interface Guidelines on drag and drop, motion, and reduced motion; WWDC18 Designing Fluid Interfaces; WWDC23 Animate with springs; Mix and Jam's Balatro recreation; the Offset Cursor and Shift papers; ITU-R BT.1359 on sound and picture; WCAG 2.3.3).
