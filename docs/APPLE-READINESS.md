# Apple readiness (Oct 14, 2026)

For each Apple device: what Sunday Reset V11 does today as a web app, and what is ready and missing for an App Store app. The plan for building the apps is in [NATIVE-APPS-PLAN.md](NATIVE-APPS-PLAN.md), and the research behind it is in [native/](native/).

**How this was checked.** V11 after round two, with the made up sample family, in real Safari on this Mac's Xcode simulators: iPhone 17 Pro (iOS 26.5), iPad Pro 13 inch (iOS 26.5), and iPhone Duo folded (iOS 27.1). Shapes the simulators here can't make were checked in Chrome at the exact size and pixel density: the Duo open (it needs Xcode 27.1 to unfold), iPad sideways, and iPhone sideways. Screenshots are in [readiness/](readiness/).

**Words.** Ready: works as it should. Works, with gaps: usable, with the gaps listed. Not yet: doesn't exist.

## At a glance

| Device | The web app today | An App Store app |
|---|---|---|
| iPhone | Works, with gaps (sideways) | Not yet |
| iPhone Duo, folded | Works, with gaps (short window) | Not yet (needs Xcode 27.1) |
| iPhone Duo, open | Works at its size in Chrome; not yet seen in Safari | Not yet (needs Xcode 27.1) |
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

**The web app today: works, with gaps.**

- [x] Opens in Safari on the phone's Today list: the block you're in, time left, and the rest of the day ([iphone-17-pro-safari.jpg](readiness/iphone-17-pro-safari.jpg)).
- [x] The setup's first sheet fits with Start in view.
- [x] Safe areas: the header clears the status bar, and the Add line sits above Safari's toolbar.
- [x] Add to Home Screen: the manifest opens it standalone with its icon, and after the first visit it opens with no connection (`sw.js`).
- [x] Open the desk shows the day on the tall board, with pinch and double tap (V8 onward).
- [ ] **Sideways is broken.** At 844 by 390 the app shows the desk, and the Now band covers most of the day board ([iphone-landscape-chrome-844x390.jpg](readiness/iphone-landscape-chrome-844x390.jpg)). Fix: use the phone's list when the window is under about 500 tall, the way it already does under 600 wide. The native app can also stay upright on iPhone.
- [ ] Safari can clear the board after seven days without a visit, unless it's on the Home Screen. The app warns and says how to keep it.
- [ ] Reminders while the app is closed need the household server, which isn't on.

**For the App Store app:** notifications with Done and 15 more minutes on them, widgets (Now and Next, Today, Dinner tonight) on the Lock Screen and in StandBy, Siri and Shortcuts, haptics on drag steps (`navigator.vibrate` does nothing on iOS), and later a Live Activity for the block you're in.

## iPhone Duo, folded (outer screen, 466 by 678 points)

**The web app today: works, with gaps.**

- [x] Opens on the phone's Today list in real Safari ([iphone-duo-folded-safari.jpg](readiness/iphone-duo-folded-safari.jpg)).
- [x] The list reads well at this size; nothing runs off the side.
- [ ] **Safari gives the page a short window, about 386 by 580.** Its buttons and the clock sit in a column down the right edge. On the setup's first sheet, Start is below the bottom edge; the sheet scrolls, but the main button should stay in view ([iphone-duo-folded-setup-safari.jpg](readiness/iphone-duo-folded-setup-safari.jpg)). Fix: keep a sheet's buttons pinned in view on short screens.
- [ ] Turned on its side and stood up (Apple calls it tent), it's 678 by 466, which hits the same sideways problem as the iPhone.

**For the App Store app:** the left and right safe areas differ (the status column is on the trailing edge), so the shell passes both to the page. A StandBy widget with a big Now card suits the tent position.

## iPhone Duo, open (inner screen, 951 by 669 points, sideways)

**The web app today: works at its size in Chrome; not yet seen in real Safari.**

- [x] At 951 by 669 with 3x pixels, it shows the desk: the Now band over the day board, with the desk things around it ([iphone-duo-open-chrome-951x669.jpg](readiness/iphone-duo-open-chrome-951x669.jpg)).
- [ ] Not seen in Safari: unfolding the simulator needs Xcode 27.1's Device Hub.
- [ ] Nothing knows where the fold is. Safari's fold features are off by default in iOS 27.1, so the shell measures the crease and passes it to the page (`--fold-x`, `--fold-w`), and the desk keeps things out of it.
- [ ] Opening and closing crosses the 600 wide line, which swaps the phone list for the desk. It's a resize, not a reload, so the day, the picked block, and any open panel should carry across. Needs a check on a real fold.
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

1. **iPhone sideways:** use the phone's list when the window is under about 500 tall, as it already does under 600 wide.
2. **Short screens:** keep a sheet's main buttons in view on windows under about 640 tall (the folded Duo, small phones).
3. **The fold:** check on a real fold, or Xcode 27.1, that opening and closing keeps the day and any open panel.
