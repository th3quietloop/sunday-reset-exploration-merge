# Sunday Reset on iPhone, iPhone Duo, iPad, and Mac

This work starts after the current updates are finished and live.

## 1. The recommendation
Build one SwiftUI app in one Xcode project for iPhone, iPhone Duo, iPad, and Mac. It carries the V11 web app inside it and shows it in a WebKit web view. The desk and every layout stay the web app you already have. A thin native shell adds what a website can't do: saving on the device, notifications, widgets, menus, the Duo's fold, and later Apple Health.

What it isn't, and why:
- **Not Capacitor.** It handles only one window until version 9, which hurts the Duo most.
- **Not Electron.** It's Mac only, and the download is 85 MB or more.
- **Not a native rewrite.** That would throw away the desk.

## 2. How each device adapts
The web app already picks its layout by width. Apple now asks apps to do exactly that: go by window size, not by device type or orientation. So most of this comes free.

- **iPhone, and the Duo folded (466 x 678 pt).** Both are under 600, so both get the phone list you already have.
  - New: on the Duo, the status column and Dynamic Island sit on the side, so the left and right safe areas differ.
  - New: when the folded Duo is turned sideways and stood up, it shows a big Now card. A StandBy widget does this natively.
- **Duo open flat (951 x 669).** The Planner splits into two halves: the day board on one, the week or Block library on the other. That's your Beside arrangement, split at the fold.
  - New: the shell measures the fold and passes it to the page (`--fold-x`, `--fold-w`).
  - The desk adds the fold to `insets.blockers`, so nothing rests in the crease.
  - Open in portrait (669 x 951), it shows the week or month.
- **Duo half open, held like a book.** It works like a paper planner: today on the left page, Due soon or the week on the right. Drag a tile across the spine to place it.
- **Duo half open, standing like a laptop.** The desk sits on the top half. The rack, the band's buttons, and Add sit on the half lying flat. This is Apple's own advice for that position.
- **Duo rule.** Folding and unfolding resize the page and never reload it. The day, the picked block, and any open panel stay put, including when the width crosses 600.
- **iPad.**
  - Portrait, landscape, and Stage Manager windows use the tablet and desktop layouts you already have.
  - New: more than one window, for example Today in one and the Planner in another. The native store keeps them in step.
  - New: a menu bar with T, P, L, Add, Undo, Redo, and Start Sunday Reset.
  - New: the shell sends the on-screen keyboard's height to the page (`--kb-h`), because WebKit gets this wrong on its own.
- **Mac.** The desktop layout, as it is.
  - New: real menus that own the shortcuts, and Cmd comma opens Settings.
  - New: one window at first.
  - New: a menu bar item showing today's block.
  - New: desktop widgets built from the same widget code as the iPhone.

## 3. Project structure
- **Where it lives:** a `native/` folder in 353_SundayReset_ExplorationMerge.
- **What's in it:** one Xcode project with one app target for iPhone, iPad, and Mac, plus one widget extension. The Mac version is a real Mac app, not the iPad version running on the Mac.
- **Copying the web app in:** `scripts/make-native.mjs` copies `v/corners11` into `native/Web`. It also bundles Three.js and the two fonts, locks the page to its own files, and adds `src/native.js`.
- **The app's address:** the files are served at one fixed address, `sundayreset://desk/`. The app never loads the live site, which Apple's review rules forbid. That address never changes, because saved data belongs to it.
- **How the page and the shell talk:**
  - The page calls `window.webkit.messageHandlers.native.postMessage({op, args})` and gets an answer back.
  - The shell calls into the page with `callAsyncJavaScript`.
  - There are about ten calls in all, covering the board, reminders, haptics, sharing, widgets, Health, and opening links.
- **Saving:** `store.js` gets a third way to save, `native`. The board lives as JSON files on the device, and localStorage becomes a quick-start copy.
- **Minimum system:** iOS, iPadOS, and macOS 26.

## 4. First native features, in order
1. **Saving on the device, with rescue copies.**
   - For you: Safari can no longer clear the board after seven days, and the "Add to Home Screen" notes go away.
   - For App Review: the app works offline, which is the first thing a reviewer tries.
2. **Reminders as phone notifications.** Built from `Model.remindersFor`, with Done and 15 more minutes as buttons on the notification. No server needed.
3. **Widgets:** Now and Next, Today, and Dinner tonight. They work on the Lock Screen, in StandBy, and on the Mac desktop.
4. **Siri and Shortcuts:** Open Today, Open Planner, Start the Reset, What's next, and Add (using `Model.parseQuick`). These also show up in Spotlight and on the Action button.
5. **Haptics on drag steps, the share sheet, menus, and more than one window.**
6. **The Mac menu bar item.**
7. **A Live Activity for the block you're in.** On the iPhone it shows on the Lock Screen and in the Dynamic Island.

Items 1 to 4 are what pass Apple's review rule against "a repackaged website".

## 5. Apple Health
1. **Model first.** A new source, `src: 'health'`. A walk is noted beside your plan and never moves a planned block. This changes how the board is saved, so the save version goes up one, with a migration step and tests.
2. **Read workouts and daily steps, nothing else.** Apple never tells the app whether you said no, so the "no walks yet" wording has to read calmly either way.
3. **Updates in the background.** Steps arrive at most once an hour. This needs a real iPhone, because the simulator can't test it.
4. **Rules.** Say what's read in the App Store listing, never use it for ads, and keep health data out of iCloud.

## 6. What I can do on this Mac today, and what needs you
**I can do today**, with Xcode 27.0:
- The whole shell, the native saving, the reminders, the widgets, Siri and Shortcuts, and the menus.
- Running it in the iPhone and iPad simulators, and as a Mac app on this Mac.

**The Duo needs Xcode 27.1.** The Duo simulator is already installed, but it needs Xcode 27.1, whose testing panel can fold and unfold the simulated Duo. Built with 27.0, the app runs on the Duo at plain iPhone size.

**Needs you:**
- Installing Xcode 27.1.
- An Apple Developer Program membership ($99 a year), which is also what lets the app be signed.
- The app’s page in App Store Connect and its Health permission. The privacy policy page exists: https://sunday-reset-site.vercel.app/privacy (a working draft to update before release).
- A real iPhone, for Health and to check speed. A Duo too if you get one; it ships Oct 23.
- Your OK on sync: your existing household server or Apple's iCloud (CloudKit).

## 7. Risks and open questions
- **Nobody has shown how a web page behaves on the Duo's fold.** That includes which events fire, the safe areas, and how wide the fold is (one outside test measured 40 pt). Having the shell measure it natively is the safe way.
- **The Duo's open screen size on a real device isn't confirmed.** The 669 x 951 figure comes from the simulator.
- **The 3D desk on the open Duo draws about 5.7 million pixels per frame.** It may need a lower resolution there.
- **iOS can shut down the web view to save memory.** When it does, the app reloads from the saved board.
- **Inside the app, the desk may move at 60 frames a second at most.** That's fine for a desk that only draws when something moves.
- **App Review varies on apps built around a web view.** Having native features from day one is the defense.
- **Health and sync pull against each other.** The Mac can't read Health, and health data can't go in iCloud. You'll need to decide: do walks sync through the household server, or stay on the iPhone?
- **Every extra iPad or Mac window holds its own copy of the 3D desk in memory.**
- **Some Duo details come from outside testers, not Apple.** I couldn't run the simulators myself; this Mac's sandbox blocked them.

## Sources
- https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo
- https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo
- https://developer.apple.com/videos/play/tech-talks/111466
- https://developer.apple.com/forums/thread/847644
- https://developer.apple.com/videos/play/wwdc2026/278/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply
- https://developer.apple.com/documentation/webkit/wkurlschemehandler
- https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target
- https://developer.apple.com/documentation/swiftui/menubarextra
- https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:)
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://ionic.io/blog/?p=6904