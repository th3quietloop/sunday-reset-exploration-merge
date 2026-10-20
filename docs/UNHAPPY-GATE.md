# The unhappy gate: break it on purpose

The Premium Principles page in Russell's deck says a product is judged by its worst moments, so failure gets the same care as success. The drag gate and the contrast gate hold the good path. This one breaks V11-2 on purpose, on a desk and on a phone, and judges what a person meets: the connection lost in the middle of something, a save the browser refuses, Claude failing every way it can, a board with nothing on it yet, and a saved board that can't be read.

`scripts/gate/unhappy.mjs`, with the page's eyes in `scripts/gate/lib/unhappy-probe.js`. Added Oct 20 for V11-2.

## Run it

```
npm run unhappy
node scripts/gate/unhappy.mjs [-sizes mac,phone] [-groups offline,save,broken,ai,empty] [-only id,id]
  [-no-contrast] [-survey] [-out folder] [-build folder] [-serve 4480 -cdp 9480]
```

It builds V11-2 into a folder of its own (as the drag gate does), serves it, and starts a headless Chrome. Every state gets a fresh browser profile, so nothing one state stubs, saves, or cuts reaches the next. The whole run is about 14 minutes for both sizes, most of it Claude's 15 second wait in the slow states. It needs one browser slot (`mkdir /private/tmp/claude-501/sr-browser.lock`, or `.lock2`, or `.lock3`).

The run's folder has `summary.md` (the table, then every failure with who answers for it), `results.json`, and a picture of every state in `shots/`. `-survey` prints what each state shows (its words and what can be pressed), which is how a new state's expectations get written. Exit code 1 when a state fails a check or couldn't be staged: a state that can't be reached isn't judged, so that's a failure of its own.

The sizes are the contrast gate's: Mac 1440 by 900, and iPhone 390 by 844 (Chrome at the phone's size, saying it's an iPhone).

## The four checks

1. **It says what happened, in words.** Words a person can see: on the surface the state opened (its `scope`: the side panel, Settings, a sheet, the meal board), or in a toast, which the probe records the moment it shows, so one that came and went still counts. Where the trouble lasts longer than a toast (a board that can't be read, an empty list, an error line in a panel), the words have to stay on the screen (`stays`). A place with nothing in it says so ("Nothing here yet.", a row that says "Nothing locked"), or says what the place is for in a sentence that isn't a button's label.
2. **It offers a way forward:** a next step, Try again, Undo, or a way back. A control on the surface whose name says it (each state names the words it looks for), or a button on a toast while the toast shows.
3. **It isn't a dead end.** Something on the screen can be pressed besides a close (Close, Done, Dismiss don't count), and nothing waits forever: a control that says it's busy (Asking Claude…, Checking…) and can't be pressed fails the state when its time is up.
4. **Nothing threw.** No exception and no console error from the moment the page opened. A request the state cut on purpose, or answered with an error, is let through (the browser's own "Failed to load resource" lines); what the page did about it is not.

Each state's contrast is measured too, with the contrast gate's engine (`lib/contrast-core.mjs`, one look, no scrolling, no focus rings). It's reported beside the four checks and doesn't fail this gate; `npm run contrast` is where contrast is held.

## The states

Shared infrastructure first, then the helpers' areas: Claude's errors are the phone helper's (reworked Oct 20, with Try again), and empty states are the moments helper's. Findings there are reported, not fixed here.

| Group | State | How it's staged | Who answers for it |
|---|---|---|---|
| offline | Break it down asks Claude | `/api/smart` ready, then the connection goes and a to-do is broken down | phone helper |
| offline | Refreshing a calendar | a board of its own with a subscribed calendar, a server there, then Refresh with no connection | Settings, Calendars |
| offline | Subscribing to a calendar by its link | Settings, Calendars, a link pasted, Subscribe with no connection | Settings, Calendars |
| offline | Linking this device with a code | Settings, Sync, I have a code, Link this device with no connection | shared |
| offline | Sending feedback | a server there, words typed, Send it with no connection | Help |
| offline | Opening the app again after one visit | one visit with the connection (the service worker installs and takes over), then none at all for the page and the worker, and the app opened again: its desk, every style sheet, and what the worker kept | shared |
| offline | No desk (`?nodesk`) | the week as a list, and the Sunday Reset's first step run on it | shared |
| offline | No desk: the 3D library never arrives | three.js cut on its way in: no World at all, and the reset run | shared |
| save | This browser's storage is full | a board of its own, then every write throws QuotaExceededError | shared |
| save | Your data, after a change didn't save | the same, then Your data opened | shared |
| save | This browser blocks storage | every write throws SecurityError | shared |
| save | The artifact's database refuses a write | a stand-in `window.claude` whose database refuses every write (`Store.onError`), desk only | shared |
| broken | A saved board this browser can't read | half a board in `sundayreset.v1` before the app's first line | shared |
| broken | A board saved by a newer version | a board saying version 99 | shared |
| ai | Break it down, and a new goal's parts | `/api/smart` as it answers (variants/corners11/api/smart.js): ready to a GET, then not ready (503), too many asks (429), an answer that never comes (the page gives up at 15 seconds), and an answer that isn't JSON | phone helper |
| empty | To-dos, Dinners, Goals, a countdown with no steps, Block library, Today, the next 7 days (phone), and every step of the Sunday Reset (Look ahead among them) | Dev's empty board | moments helper |

### How a state is staged

`S({ id, group, name, owner, sizes, scope, stays, said, way, wait, setup })` in `unhappy.mjs`. A setup opens its page with `t.page(o)`:

- `routes`: requests answered or cut before they leave the browser (`c.route(glob, fn)` in `lib/cdp.mjs`): `{ status, body, wait }` to answer, `'fail'` for a lost connection, `'hang'` never to answer. A route wins over the gate's local copy of three.js.
- `init`: scripts that run before the app's first line (a broken save, a stand-in database).
- `boot`: `sample` (Dev's sample week, the clock at 10 am), `real` (the welcome's Look at a sample week: a board of its own, saved), `empty` (Dev's empty board), or `none`.
- `mark: true`: the state begins as the page opens (what the boot meets); otherwise the setup calls `t.mark()` right before it breaks something.

Then `t.offline(true)` takes the page's connection away, and `t.workersOffline(true)` the service worker's (it's a target of its own); `t.edit(body)` changes the board the way the app does; `t.aiOn()` waits for smart breakdowns to say they're ready and turns them on for the board. A setup that can't stage its state returns `{ skip: why }`.

## What it found on Oct 20, and what was done

The first survey: 56 states, 14 not passing (some of them this gate's own expectations, calibrated against what the screens say). After the fixes below, and the moments helper's three (the last list here), the last run: **62 states, 62 pass**, and contrast was measured in every state with none below AA.

Fixed, in shared infrastructure:

1. **Linking a device with no connection said nothing.** `Cloud.link` let the lost connection out as a promise nobody caught: no toast, and "TypeError: Failed to fetch" in the console. `start`, `link`, `makeCode`, `devices`, and `remind` in `board/src/cloud.js` now answer `{ error: 'offline' }` (or nothing, for the device list), and the pages already had the words: "Couldn't link. Check the connection and try again." Turning reminders off still works with no connection: the device's subscription goes at once.
2. **The app opened offline after one visit came up without its desk.** The service worker kept a list from Round three, so live V11's worker kept 27 of the 48 files its page loads: none of V11's 25 area style sheets, and not three.js (the first visit asks for those before the worker is there to keep them). Opened offline, the desk couldn't draw, the list stood in, and V11's own code threw "World is not defined" on every redraw of the reset. Now `board/sw.js` keeps each file on its own (one that can't be fetched leaves the rest kept; `addAll` kept nothing when any one failed), `scripts/make-variants.mjs` adds the version's style sheets and the libraries its page loads from a CDN (shell v2, since the list grew), and app.js gives a version that speaks to World the same stand-in it uses itself when the desk can't draw. V11-2's worker keeps 61 files, and the offline open draws the desk at both sizes. `tests/sw-keeps-page.test.mjs` builds V11-2 and holds the worker's list to the page.
3. **A board saved by a newer version** opened the sample week (or the welcome, on a device the version hadn't met) under a toast that went in three seconds and said "It's open to look at": it wasn't theirs. Now it opens a sheet like the one for a board that can't be read: "Your week was saved by a newer version", that it's kept and nothing writes over it, and Reload (gold), Download it, and Look around a sample week (`openNewer` in app.js).
4. **The drag gate's own boot for a board of its own** looked for Look around first, which the welcome has called Look at a sample week since Oct 15 (`lib/paths.js`).

Reported, for the helpers whose areas they are:

- **Empty To-dos on the phone is a dead end** (moments helper). The phone's to-dos sheet on an empty board says "Nothing due in the next 7 days." and offers only Done: no Add a to-do.
- Softer, from the survey: the next 7 days on an empty board is seven rows of "Nothing locked", with no line about the week and nothing to add (moments helper); the meal board on an empty week says what to do ("Drag a meal onto a day, or tap a day and type it.") but its empty days are blank, and only a screen reader hears "nothing yet" (moments helper).

Done since, by the moments helper (Oct 20), all three:

- **The phone's due sheet** (`dueSoonPanel`) ends with Add a to-do (New to-do, in the Inbox), always; with nothing due it says so and offers the to-dos that have no day yet, each with Give it a day, the way the reset's To-dos step does ("Nothing due in the next 7 days. 2 things in your Inbox have no day yet.").
- **The next 7 days with nothing in them** (`next7Panel`) is one line, "Nothing planned yet.", one way forward (Set up my week on a board nobody has set up, Add something on anyone else's), and the seven days as buttons: a tap is the Add line on that day (`phoneAddOn`, "Thursday " typed for you). A week with anything in it keeps its rows.
- **The meal board's empty days** show a quiet + Add in dark ink on the wood (`.c-madd`, 5 to 1 or more), at every size.

Seen passing, as they should: offline Break it down ("You're offline, so these are the built-in steps. Ask Claude again when you're back." with Try again), the calendar refresh ("You're offline, showing what we had from before", and a toast with Try again), a full or blocked browser (a toast with Your data and Try again; Your data says "This browser didn't save your last change. Its storage is full." with Download a backup), the unreadable save (its recovery sheet), each of Claude's four failures on both screens that ask it, and the empty board's To-dos, Goals, countdown, Today, and every reset step.

## Limits

- Chrome only. WebKit (Playwright) can't route requests the way this does, and the phone is Chrome at the phone's size with an iPhone user agent, not Safari.
- The service worker's connection is cut through DevTools, one target at a time. A phone in airplane mode, after one visit with the connection, is the check that settles it, by hand.
- The AI stubs answer the way `variants/corners11/api/smart.js` did on Oct 20. A new error there needs a new state here.
- Sync isn't staged here: a conflict, or a household that refuses a board, needs the household server, and this gate's server answers only what a state stubs.
