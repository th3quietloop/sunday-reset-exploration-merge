# Apple readiness (Oct 14, 2026)

For each Apple device: what Sunday Reset V11 does today as a web app, and what is ready and missing for an App Store app. The plan for building the apps is in [NATIVE-APPS-PLAN.md](NATIVE-APPS-PLAN.md), and the research behind it is in [native/](native/).

**How this was checked.** V11 after round two, with the made up sample family, in real Safari on this Mac's Xcode simulators: iPhone 17 Pro (iOS 26.5), iPad Pro 13 inch (iOS 26.5), and iPhone Duo folded (iOS 27.1). Shapes the simulators here can't make were checked in Chrome at the exact size and pixel density: the Duo open (it needs Xcode 27.1 to unfold), iPad sideways, and iPhone sideways. Screenshots are in [readiness/](readiness/).

**The Duo pass (Oct 14, later).** The fixes below for short screens, phones on their side, and the Duo open were built and checked in the Duo simulator's real Safari, folded upright (before) and stood on its edge (before and after), and in Chrome at 386 by 580, 584 by 362, 678 by 466, 844 by 390, 951 by 600, 857 by 565, and 669 by 880, all at 3x. Opening and closing was checked by resizing one page across the line and back, with nothing reloaded. What changed is under [The Duo pass](#the-duo-pass-oct-14).

**Words.** Ready: works as it should. Works, with gaps: usable, with the gaps listed. Not yet: doesn't exist.

## At a glance

| Device | The web app today | An App Store app |
|---|---|---|
| iPhone | Ready, upright and sideways (sideways checked in Chrome) | Not yet |
| iPhone Duo, folded | Ready, upright and stood on its edge (upright's after shot is Chrome's at Safari's size) | Not yet (needs Xcode 27.1) |
| iPhone Duo, open | Ready at its size in Chrome; not yet seen in Safari (needs Xcode 27.1) | Not yet (needs Xcode 27.1) |
| iPad | Ready, upright and sideways | Not yet |
| Mac | Ready in Chrome; Safari on the Mac not run in this pass | Not yet |
| Any browser | Ready | Not needed |

## What every App Store app needs

- [x] A privacy policy page: https://sunday-reset-site.vercel.app/privacy (a first version, to update before release)
- [x] A support page: https://sunday-reset-site.vercel.app/support, contact russell.white.ux@gmail.com
- [x] A marketing page: https://sunday-reset-site.vercel.app
- [ ] An Apple Developer Program membership ($99 a year), which also signs the app. Russell's to do.
- [ ] An app icon at 1024 by 1024. The largest today is 512 (`v/corners11/icons/icon-512.png`).
- [ ] The native shell: one SwiftUI project in `native/` that carries V11 inside it. Nothing exists yet.
- [ ] Everything bundled inside the app. Today Three.js comes from jsDelivr and the fonts from Google Fonts. Apple's rules forbid loading the live site, so these move into the app.
- [ ] Saving on the device through the shell (a third backend in `store.js`), so iOS never clears the board.
- [ ] Native features from the first version, which is what clears Apple's rule against "a repackaged website" (guideline 4.2): reminders as notifications, widgets, Siri and Shortcuts.
- [ ] A privacy manifest (`PrivacyInfo.xcprivacy`) and App Store privacy answers. Today's answer is "Data Not Collected".
- [ ] App Store screenshots at each required size: 6.9 inch iPhone, 13 inch iPad, and Mac.
- [ ] Xcode 27.1 on this Mac for anything Duo specific. It has 27.0.
- [ ] Apple Health, later, after the first release.

## iPhone

**The web app today: ready, upright and sideways.** The two items left open are Safari's storage rule and reminders, which need the server.

- [x] Opens in Safari on the phone's Today list: the block you're in, time left, and the rest of the day ([iphone-17-pro-safari.jpg](readiness/iphone-17-pro-safari.jpg)).
- [x] The setup's first sheet fits with Start in view.
- [x] Safe areas: the header clears the status bar, and the Add line sits above Safari's toolbar.
- [x] Add to Home Screen: the manifest opens it standalone with its icon, and after the first visit it opens with no connection (`sw.js`).
- [x] Open the desk shows the day on the tall board, with pinch and double tap (V8 onward).
- [x] **Sideways shows the phone's list** (Oct 14). A window under 500 tall and under 1000 wide, on a screen whose short side is a phone's, gets the phone's own views, as under 600 wide. On its side the list is two columns: the day and its seven days with the block you're in on the left, the day's blocks and cards beside them, so the day shows at once. A short laptop window, and the open Duo with its keyboard up, keep the desk. Before: the desk, with the Now band over most of the day board ([before](readiness/iphone-sideways-chrome-844x390-before.jpg)); after ([after](readiness/iphone-sideways-chrome-844x390-after.jpg)). Open the desk from there gives the phone's own day with its bar in one row. The native app can also stay upright on iPhone.
- [x] Turning the phone keeps what you were doing: the day, a picked block, an open panel, a running reset (see [the Duo pass](#the-duo-pass-oct-14)).
- [ ] Safari can clear the board after seven days without a visit, unless it's on the Home Screen. The app warns and says how to keep it.
- [ ] Reminders while the app is closed need the household server, which isn't on.

**For the App Store app:** notifications with Done and 15 more minutes on them, widgets (Now and Next, Today, Dinner tonight) on the Lock Screen and in StandBy, Siri and Shortcuts, haptics on drag steps (`navigator.vibrate` does nothing on iOS), and later a Live Activity for the block you're in.

## iPhone Duo, folded (outer screen, 466 by 678 points)

**The web app today: ready, upright and stood on its edge.**

- [x] Opens on the phone's Today list in real Safari ([iphone-duo-folded-safari.jpg](readiness/iphone-duo-folded-safari.jpg)).
- [x] The list reads well at this size; nothing runs off the side.
- [x] **Every sheet keeps its main buttons in view on Safari's short window** (Oct 14). Safari gives the page about 386 by 580, with its buttons and the clock in a column down the right edge. On a window under 640 tall a sheet keeps its buttons pinned at its foot while the words scroll above them, and is sized to the window it's in (it used 100vh, which on an iPhone is the height with Safari's bars away, so its top ran off the screen too): the setup's first page and the Sunday Reset's ([before, in Safari](readiness/duo-folded-setup-safari-before.jpg); [after, in Chrome at Safari's size](readiness/duo-folded-setup-chrome-386x580-after.jpg); the reset's page [before](readiness/duo-folded-reset-intro-chrome-386x580-before.jpg) and [after](readiness/duo-folded-reset-intro-chrome-386x580-after.jpg)). The setup's own steps, the Sunday Reset's sheet, the meal board (Done and its buttons stay in its head), and the place panel (Add stays at its foot) already kept theirs; the place panel's foot now also covers the day strip's handle, which rode over its words. The after in the simulator's Safari, upright, is waiting on the simulator being turned back upright (it was turned on its side during this pass).
- [x] **Stood on its edge (tent).** In Safari the page is about 584 by 362 (the buttons column on the right and the address bar under it), so it's the phone's list by its width. The sheets pin their buttons there too, side by side ([before](readiness/duo-tent-setup-safari-before.jpg), [after](readiness/duo-tent-setup-safari-after.jpg), [the reset's page](readiness/duo-tent-reset-intro-safari-after.jpg)), the Sunday Reset's sheet takes all but a strip of the week, and Open the desk gives the phone's own day with its bar in one row ([after](readiness/duo-tent-desk-safari-after.jpg)). From the Home Screen it's 678 by 466, which the sideways rule catches: it was the desk with Now's band over the board ([before](readiness/duo-tent-homescreen-chrome-678x466-before.jpg)); it's the list in two columns now ([after](readiness/duo-tent-homescreen-chrome-678x466-after.jpg)).

**For the App Store app:** the left and right safe areas differ (the status column is on the trailing edge), so the shell passes both to the page. A StandBy widget with a big Now card suits the tent position.

## iPhone Duo, open (inner screen, 951 by 669 points, sideways)

**The web app today: ready at its size in Chrome; not yet seen in real Safari.**

- [x] At 951 by 669 with 3x pixels, it shows the desk: the Now band over the day board, with the desk things around it ([iphone-duo-open-chrome-951x669.jpg](readiness/iphone-duo-open-chrome-951x669.jpg)).
- [x] **Now is a book on the open screen** (Oct 14). On a window 760 to 1139 wide, under 700 tall, and wider than tall (the Duo open in Safari, about 951 by 600), the band and its question are the left page and the day is the right page, its lanes stacked so it fills the page. The band's buttons and the question's answers stand left of the fold instead of across it, and the day is about twice the size it was ([before](readiness/duo-open-now-chrome-951x600-before.jpg), [after](readiness/duo-open-now-chrome-951x600-after.jpg)). A block's panel opens over the band's page, so the day it's about stays in view.
- [x] **The Planner keeps the fold clear** (Oct 14). The date card stands on the left under your name instead of over the middle, and a panel on the right starts under the zoom switch instead of under the date card: the place panel had 288 px for its days, its strip, and Add, and has 448 now ([before](readiness/duo-open-place-chrome-951x600-before.jpg), [after](readiness/duo-open-place-chrome-951x600-after.jpg)). The two intro pages put their buttons at either end of their foot, never in the middle. Settings, the reset's panel, and the meal board fit as they were. Upright (669 by 880) was already right: Now stacks the day ([after](readiness/duo-open-upright-chrome-669x880-after.jpg)).
- [ ] Still in the middle of the screen when open: toasts, the meal board's More below, the reset's step bar (right of the fold), and rows that run across a page (Settings, the meal board's days), which Apple allows for content that scrolls.
- [ ] Not seen in Safari: unfolding the simulator needs Xcode 27.1's Device Hub.
- [ ] Nothing knows where the fold is. Safari's fold features are off by default in iOS 27.1, so the shell measures the crease and passes it to the page (`--fold-x`, `--fold-w`), and the desk keeps things out of it.
- [x] **Opening and closing keeps what you were doing** (Oct 14), checked in Chrome by resizing one page from 386 by 580 to 951 by 600 and back, with nothing reloaded, and held by tests/duo.test.mjs. Closing: the list opens on the day the desk showed; a picked block opens the phone's own day with the block still picked and its tools along the bottom. Opening: the desk is as it was, unless you moved to another day on the phone, which it then shows (Now for today, the week when the desk was on that week, else that day). An open panel stays open, Settings stays on its page, the meal board moves over the phone's view and turns its days down when folded, and a running reset keeps its step, as a sheet when folded and a panel when open.
- [ ] Opening and closing on a real fold, or in Xcode 27.1: that Safari's window and screen sizes change as they do in Chrome. The phone's views follow the window's width and the screen's size, so if Safari kept the folded screen's size after opening, the open Duo would stay on the list.
- [ ] At 3x pixels the open screen is about 5.7 million pixels per frame of 3D desk. The desk only draws while something moves, but it may need a lower resolution there.

**For the App Store app:** the layouts in the plan. Open flat: the day on one half, the week or Block library on the other. Half open like a book: today on the left page, Due soon on the right. Half open like a laptop: the desk on top, the rack and buttons on the half lying flat.

## iPad

**The web app today: ready.**

- [x] Upright on the iPad Pro 13 inch in real Safari: the week on the desk, with the notepad, clock, and lamp around it ([ipad-pro-13-safari.jpg](readiness/ipad-pro-13-safari.jpg)).
- [x] Sideways at 1180 by 820 ([ipad-landscape-chrome-1180x820.jpg](readiness/ipad-landscape-chrome-1180x820.jpg)).
- [x] The Sunday Reset on an upright iPad uses the bottom sheet or a narrower panel, so the week stays at least about 480 wide (round two).
- [x] Safari's tab shows the block you're in ("Work, 1 h 50 min left").
- [x] A keyboard works: T and P, 1 to 4, the arrows, L for the list.
- [ ] Round three caps side panels on an upright iPad during the reset, so part of the week stays in view (in progress).

**For the App Store app:** more than one window (Today in one, the Planner in another), a menu bar with the shortcuts, and the on-screen keyboard's height passed to the page, because WebKit gets it wrong on its own.

## Mac

**The web app today: ready in Chrome.**

- [x] The desktop layout at 1440 by 900 and 1280 by 800, tested every round.
- [x] Trackpad: a plain two finger scroll no longer switches views, a pinch does, and a pinch back in returns (rounds two and three).
- [ ] Safari on the Mac wasn't run in this pass.
- [ ] Add to Dock (Safari, File, Add to Dock, macOS Sonoma or later) wasn't tried.

**For the App Store app:** a real Mac app from the same project, not the iPad app on a Mac: menus that own the shortcuts, Cmd comma for Settings, one window at first, a menu bar item with today's block, and desktop widgets from the same widget code.

## Fixes to make in V11 before the native work

1. [x] **iPhone sideways:** use the phone's list when the window is under about 500 tall, as it already does under 600 wide. Done Oct 14, in two columns.
2. [x] **Short screens:** keep a sheet's main buttons in view on windows under about 640 tall (the folded Duo, small phones). Done Oct 14.
3. [ ] **The fold:** check on a real fold, or Xcode 27.1, that opening and closing keeps the day and any open panel. Built and checked in Chrome on Oct 14 (the day, a picked block, an open panel, Settings, the meal board, a running reset); the real fold is still to see.

## The Duo pass (Oct 14)

What changed, where:
- **Which windows get the phone's views** (`phoneShort`, `phoneSize` in board/src/app.js, V11 only): as before, 600 wide or less; now also under 500 tall and under 1000 wide on a screen whose short side is under 500 (a phone held either way). The screen's size keeps a short laptop window and the open Duo with its keyboard up on the desk.
- **Crossing the line** (`crossPhone` and `deskAt`, called by the resize handler before `setPhone`): the day, a picked block, and an open panel come across, as described under the Duo open. A mat that's open moves with the window (`matCross` in variants/corners11/variant.js), so the meal board goes over the phone's view and turns.
- **The phone's own day on the desk:** under a Dev preview, the board started under the preview's bar, which V11 doesn't draw, so the board's header hid behind the phone's bar; it starts under the phone's bar now (`layoutInsets`). On its side the bar is one row.
- **Now as a book, and the fold** (`nowBook`, `topOver`, `layoutInsets`, `renderBoard` in app.js; variants/corners11/css/duo.css).
- **Sheets on short windows, safe edges, the phone's list in two columns, the reset's sheet height:** all in variants/corners11/css/duo.css. The list's add line now always sits over the list (the block you're in lifted its words through it).
- **Tests:** tests/duo.test.mjs, seven tests: which windows get the phone's views, and what crosses the line each way.

**What still needs the open Duo in Xcode 27.1 or a real device:**
- Safari's real window when open: whether its buttons stand in a column on the right (about 857 by 565, which works the same here) or a bar across (about 951 by 600), and whether it changes as you open and close.
- That `screen.width` and `screen.height` change when the Duo opens. If Safari kept the outer screen's 466, the open Duo would stay on the phone's list.
- Book (half open): the fold's place and width, the shell's `--fold-x` and `--fold-w`, and the hinge.
- Opening and closing with a finger on the screen: a drag in progress, a sheet with the keyboard up, and a toast with Undo.
- The desk's frame rate at 3x on the open screen.
- The upright folded after shots in the simulator's Safari (the simulator was turned on its side during this pass; the before shot is upright, the after shots are Chrome's at Safari's size).
