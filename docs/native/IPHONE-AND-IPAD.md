**Sunday Reset on iPhone and iPad: research brief (Oct 14, 2026)**

## Recommendation

Build one **SwiftUI app** for iPhone and iPad (later the Mac from the same project). It hosts the existing V11 web app, **bundled inside the app**, in a WKWebView. The files are served through a custom URL scheme handler. A small typed JS bridge talks to native code that owns saving, notifications, widgets, App Intents, haptics, sharing, and later HealthKit.

Don't use Capacitor, don't ship it as a PWA only, and don't rewrite it natively. Why:

- **Capacitor's main payoff is ready-made plugins.** This app needs about ten bridge calls. The features that matter most (widgets, App Intents, Live Activities, HealthKit background delivery, multiple iPad windows, the Duo) are hand-written Swift either way.
- **Capacitor is a step behind on windows.** It still assumes a single window. Version 8.5 (July 31, 2026) only adds the UIScene migration that Xcode 27 builds require. Capacitor 9 is forecast for the end of November 2026, and Ionic only promises "groundwork" for multi-instance and windowed apps, with window management maybe after 9.0.
- **A SwiftUI app avoids that whole problem.** Its lifecycle is scene-based by default, so it meets the iOS 27 SDK scene requirement for free and gets multiple windows, Stage Manager, and Duo resizing from the system.

**Deployment target: iOS and iPadOS 26.** Since April 28, 2026, App Store uploads must be built with Xcode 26 or later. The SwiftUI `WebView`/`WebPage` APIs need 26. The Duo ships on 27.1.

**WKWebView or the new SwiftUI WebView?** Use WKWebView wrapped for SwiftUI. It gives direct control of its scroll view (insets, bounce, zoom), a callback when the web process is killed, and `isInspectable` for debugging. SwiftUI `WebPage` (iOS 26) is a viable alternative: its configuration has `userContentController`, `urlSchemeHandlers` and `websiteDataStore`, plus `callJavaScript` and a `webContentProcessTerminated` error. Both use the same configuration objects, so swapping later is cheap.

## Options compared

| Option | Verdict |
|---|---|
| **SwiftUI shell + WKWebView + bundled files** | **Recommended.** Native multiple windows and resizing, full native extensions, no third-party runtime. Cost: you write and maintain a small bridge. |
| Capacitor 8.5 (9 coming) | Workable. Good plugins (haptics, local notifications, share, keyboard). HealthKit plugins exist: Capawesome Health (paid, Capacitor 8+) and @perfood/capacitor-healthkit (free). But it assumes one window until 9+, Xcode 27 builds need `npx cap migrate`, widgets and intents are still native targets, and CocoaPods trunk goes read-only on Dec 2, 2026 (so use SPM). |
| PWA on the Home Screen | Keep as the free web and Android path. iOS 26 opens Home Screen sites as web apps by default. But there are no widgets, HealthKit, App Intents or Live Activities, it isn't in the App Store, and storage outside the Home Screen can be evicted. |
| Tauri 2 mobile | It's WKWebView underneath anyway, with iOS plugins in Swift plus a Rust toolchain. I couldn't confirm its App Store status in 2026. No benefit here. |
| React Native WebView | Adds the React Native runtime around a WKWebView. Only worth it if screens get rewritten in React Native. No. |
| Full native rewrite (SceneKit/RealityKit) | Throws away scene.js and the desk. Out of scope. |

## App Review guideline 4.2 (minimum functionality)

The guidelines were last updated June 8, 2026. What 4.2 and 4.2.2 say:
- 4.2: the app must "elevate it beyond a repackaged website" and be useful and "app-like".
- 4.2.2: apps shouldn't be primarily "web clippings".

Guideline 2.5.2 forbids downloading code that changes features. So bundle the web app and ship updates through the App Store or TestFlight. **Never load the live Vercel site in the app.**

Secondary sources disagree on how often thin wrappers get rejected. They agree that reviewers test airplane mode and look for web-isms. To clear 4.2:
- **Works fully offline.** Everything is bundled.
- **Native features from the first version:** widgets, local notifications with actions, App Intents (Siri, Spotlight, Shortcuts), haptics, the share sheet, iPad keyboard commands and menu bar, and multiple windows.
- **No web-isms in the app:** strip the "Add to Home Screen", "this browser", and install prompts in native mode, and hide Dev in release builds.
- **If HealthKit is added,** say so in the App Store description and integrate with the Health app (guideline 2.5.1).

## Storage

**What the platform does:**
- WKWebView's default data store persists to disk.
- WebKit's storage policy gives non-browser apps up to 15% of disk per origin and 20% overall.
- Storage is "best-effort": it can be evicted under storage pressure or by Intelligent Tracking Prevention.
- The 7-day cap on script-written storage is documented only for Safari and Home Screen web apps. Apple doesn't say whether it applies to an app's own web view, and a third-party report says a web view keeps its own counter that resets at each launch.

**Design:**
- **Native saving is the source of truth.** `store.js` already saves to two backends: the artifact `db` docs (`app/core`, `months/YYYY-MM`) and localStorage. Add a third, `native`, with the same document API over the bridge. Swift writes each doc as JSON in Application Support with atomic writes, and keeps the rescue copies there. localStorage becomes a fast-boot cache only.
- **Pick one scheme and host forever** (for example `sundayreset://desk/`). Stored data belongs to the origin, so changing it orphans saved data. Avoid `file://`.
- **Sync options:**
  - Keep the household server: cross-platform, and it already exists. `cloud.js` needs an absolute API base URL, since relative `/api` fetches would hit the scheme handler.
  - Or use CloudKit private database records per doc. `NSUbiquitousKeyValueStore` is capped at 1 MB in total and 1024 keys, so it only suits per-device preferences.
- **Health data stays out of iCloud.** Guideline 5.1.3(ii) says apps "may not store personal health information in iCloud". Keep Health-derived entries local and re-read them on each device.
- **Moving an existing board in:** the app can't reach the website's localStorage. Use the existing backup file import or a household link code.

## WebGL and Three.js in WKWebView

- **Speed:** WKWebView runs the same WebKit and JavaScriptCore as Safari, out of process, so expect Safari-like performance on the same device.
  - requestAnimationFrame was reported capped at 60 Hz in WKWebView on ProMotion screens (Jan 2025, FB16411517). I couldn't confirm whether that is still true on iOS 27. The desk draws only while something moves, so 60 is fine.
  - A WebKit bug reports `powerPreference: 'high-performance'` running slower on some iPhones. Test the default setting.
- **Context loss:** iOS can kill the web content or GPU process under memory pressure, and `webglcontextlost` may not fire. A September 2026 write-up of a Three.js game shipped through Capacitor (and approved) handled it this way:
  - Poll `isContextLost()` and cap how many recoveries run.
  - Natively, reload on `webViewWebContentProcessDidTerminate` (or `NavigationError.webContentProcessTerminated`). The board is safe in the native store.
  - Also check the context when the scene becomes active, since loss after backgrounding was reported on iOS 17.
- **iPad multiple windows:** each window is its own web view and process, so each pays the desk's GPU memory. The existing `lowPower` and idle drawing help.
- **Debugging:** set `isInspectable` in debug builds.

## Safe areas and the keyboard

- **Safe areas:** `index.html` already has `viewport-fit=cover`, and the CSS uses `env(safe-area-inset-*)` 18 times. Run the web view edge to edge (`.ignoresSafeArea()`, `contentInsetAdjustmentBehavior = .never`) so those values are real.
- **Turn off the web view's own gestures:** scroll, bounce, magnification, back and forward swipes, and link previews. The app's panels scroll themselves and it handles its own pinch.
- **The keyboard is the weak spot.** WebKit has open bugs with `viewport-fit=cover` plus the keyboard, `interactive-widget` is ignored in standalone mode, and `dvh` doesn't exclude the keyboard.
  - Fix it natively: watch the keyboard frame and push its height to CSS (for example `--kb-h`), then lift `.td-foot`, the add line and the sheets with `max(env(safe-area-inset-bottom), var(--kb-h))`.
- **Duo:** its Dynamic Island is vertical on the side of the screen (per Apple's newsroom). The V11 CSS mostly handles top and bottom insets, so check left and right insets.

## Offline

- **Bundle the built V11 output** and serve it through the scheme handler. No service worker is needed. The `app.js` registration is already guarded by `isSecureContext` and will skip, but custom-scheme pages being non-secure is unverified on 27.
- **Vendor what now comes from outside:**
  - `three.min.js` (r160) and the Atkinson Hyperlegible Next and Gabarito font files (both open licences).
  - Change the CSP from jsdelivr and gstatic to `'self'` (and add the household API host to `connect-src` if sync stays).
- **Route these through native:** calendar (ICS) fetches via URLSession (no CORS), backup download and upload via the share sheet and file importer, print via a print formatter, and outside links (DOI links, docs) opening in Safari.

## The message bridge, both ways

- **JS to native:** `window.webkit.messageHandlers.native.postMessage({op, args})` returns a Promise when the handler adopts `WKScriptMessageHandlerWithReply`.
  - The handler replies with a JSON-compatible value or rejects with an error string.
  - Register it with `addScriptMessageHandler(_:contentWorld: .page, name: "native")`.
- **Native to JS:** `callAsyncJavaScript(_:arguments:in:contentWorld:)` (WKWebView) or `WebPage.callJavaScript(_:arguments:)`. Pass arguments as a dictionary; never build JS strings by hand.
- **Startup flag:** inject `window.__native = {platform, version, features}` with a WKUserScript at document start, so `app.js` can switch modes before boot.

```swift
final class Bridge: NSObject, WKScriptMessageHandlerWithReply {
  func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage,
                             replyHandler: @escaping (Any?, String?) -> Void) {
    guard let b = m.body as? [String: Any], let op = b["op"] as? String else { return replyHandler(nil, "bad message") }
    Task { @MainActor in
      do { replyHandler(try await route(op, b["args"] as? [String: Any] ?? [:]), nil) }
      catch { replyHandler(nil, error.localizedDescription) }
    }
  }
}
// native -> JS: try await webView.callAsyncJavaScript("window.Native._emit(name, detail)",
//   arguments: ["name": "health", "detail": payload], contentWorld: .page)
```

**Operations:**
- `board.get` / `put` / `list` and `rescue`
- `notify.schedule` / `cancel`
- `haptic`
- `share`
- `widget.snapshot`
- `health.authorize` / `read`
- `open`

**Events (native to JS):**
- `scene` (active or background)
- `board.changed` (from another window or iCloud)
- `health`
- `intent` (open Today, add, start the Reset)
- `notificationAction`
- `keyboard`

## HealthKit through the bridge

- **Native side:**
  - Read workouts and step counts. For daily steps use statistics collection queries; for workouts use anchored queries, which catch new and deleted ones since the last check.
  - For background updates, use `HKObserverQuery` plus `enableBackgroundDelivery`. This needs the `com.apple.developer.healthkit.background-delivery` entitlement.
  - On iOS, step updates come at most hourly. Set up the observers at launch and always call their completion handler: after three misses HealthKit stops delivering.
  - Background delivery can't be tested in the Simulator.
- **To the web app:** send normalized items like `{id, kind:'walk', start, end, minutes, steps}`. The model places them as their own source (`src:'health'`), noted apart from planned blocks.
- **Saved-state rule:** `src` is part of saved state, so adding a source means a version bump and a migration step under the repo rules.
- **Permissions:** HealthKit never reports whether read access was granted, so "no walks" has to read calmly.
- **iPad and Mac:** iPad has HealthKit from iPadOS 17 (guard `isHealthDataAvailable()`; early false results were reported). The Mac has no HealthKit, so it just shows what the iPhone placed.
- **Rules (5.1.3):** disclose exactly which data is read, no advertising use, and no personal health information in iCloud.

## iPad specifics

- **Multiple windows and Stage Manager:**
  - `WindowGroup` gives multiple windows, and each window gets its own web view.
  - Native saving owns the board and sends `board.changed` to every window, which feeds the web app's existing merge path (`Model.mergeBoards`, the one already used for another tab).
  - I couldn't confirm whether the browser's storage event fires across two web views, so don't rely on it.
  - Natural pair: Today in one window, Planner in the other.
- **Resizing:** layout should key on width, not device type or orientation. In WWDC26 session 278, Apple says "Stop checking the user interface idiom" and that orientation "is no longer useful for layout decisions". iPhone apps can now be resized (iPhone Mirroring), and Xcode 27 adds a resize mode to Device Hub and Previews.
- **Menu bar and shortcuts:** iPadOS 26 brought the menu bar. Add SwiftUI `.commands` that call JS: Today (T), Planner (P), List (L), Add, Undo and Redo, Start Sunday Reset. Test for double handling against the web keydown handlers. Undo and Redo staying disabled in the iPadOS 26 menu bar was reported.

## iPhone Duo

Apple's newsroom specs:
- A 5.4" outer and a 7.6" inner display with the same aspect ratio, so content scales between them.
- Content reflows when folded.
- Split View (two apps side by side) and two windows of the same app.
- A vertical Dynamic Island on the side.
- StandBy on either display.
- Device Hub support for the Duo "in the future".

Against the local simulator profile:
- The outer display (466 pt wide) gets V11's phone list, since it's under 600.
- The inner display (669 pt) gets the larger layout.
- A Split View half gets the phone list.

A SwiftUI shell gets this resizing for free; Capacitor's single-window limit hurts most here. Apple named no fold-state API. Strings like "foldState" reported in the iOS 27 beta are unconfirmed.

## What carries over from the web app

**Carries over:**
- Width breakpoints (phone list, phone desk with the tall board, tablet, desktop). Settings beside the desk at 1180 px or wider works on a 13" iPad in landscape.
- Safe-area CSS.
- Pointer type checks (an iPad trackpad reports `mouse`, so parallax works).
- Reduced motion.
- The app's own pinch and double tap.
- The idle drawing loop.

**Needs a native-mode switch:**
- `keepAtRisk()` and the "Add to Home Screen" copy for reminders: turn these off.
- `navigator.vibrate`: doesn't exist on iOS; send haptics over the bridge.
- Web push reminders: replace with local notifications scheduled from `Model.remindersFor`. iOS keeps at most 64 pending per app, so reschedule on each save and when the app comes forward.
- CDN scripts and fonts, and the CSP: vendor and update.
- Relative `/api` URLs: give Cloud an absolute base.
- `?dev`, `?from`, `?today` URL parameters: there's no address bar, so move them to settings or deep links.
- Blob downloads and print: send through the bridge.
- `navigator.share`: has worked in WKWebView since iOS 14 but had bugs. Prefer the native share sheet.

## Project structure

New folder `native/` in `353_SundayReset_ExplorationMerge` (a proposal; nothing changed):

```
native/SundayReset.xcodeproj    one multiplatform SwiftUI target (iPhone, iPad; Mac later)
native/App/      SundayResetApp.swift (WindowGroup, .commands), DeskView.swift (WKWebView wrapper),
                 SchemeHandler.swift (serves Web/ at sundayreset://desk/), Bridge.swift (route ops/emit events)
native/Services/ BoardStore.swift (JSON docs, atomic writes, rescue copies, App Group snapshot),
                 Notifier.swift, Health.swift, Haptics.swift, Share.swift, KeyboardInsets.swift
native/Intents/  App Intents: OpenToday, OpenPlanner, StartReset, WhatsNext, AddThing (Model.parseQuick)
native/Widgets/  WidgetKit extension: Now and Next, Today list, Dinner tonight; Live Activity (later)
native/Shared/   TodaySnapshot (Codable, App Group) shared by the app, widgets and intents
native/Web/      generated: V11 build output plus vendored three.min.js and fonts, CSP set to 'self'
scripts/make-native.mjs  builds native/Web from v/corners11, vendors assets, injects src/native.js shim
```

Also needed: a `PrivacyInfo.xcprivacy` privacy manifest, `NSHealthShareUsageDescription`, and App Group and HealthKit entitlements.

## Native features to add first, in order

1. **Native saving and rescue copies**, which removes the eviction worry and the Home Screen nag.
2. **Local notification reminders** with actions (Done, 15 more minutes).
3. **Widgets:** Now and Next (block, time left, next), Today, and Dinner, with interactive buttons through App Intents. They work on the Lock Screen and in StandBy.
4. **App Intents** for Siri, Spotlight, Shortcuts, the Action button and Control Center. One secondary source (Bitrise) says SiriKit was deprecated at WWDC26; App Intents is the path either way.
5. **Haptics** on drag steps (`Snd.detent`), the share sheet, iPad menu commands, and multiple windows.
6. **HealthKit:** walks and workouts noted on their own.
7. **Live Activity** for the current block, with the Dynamic Island.

## What I couldn't confirm

- Whether the 7-day storage cap ever applies to an app's own web view.
- Whether custom-scheme pages count as secure contexts on iOS 27.
- Whether requestAnimationFrame is still capped at 60 Hz in a web view on iOS 27.
- Whether storage events fire between two web views.
- Any Duo or fold API.
- Any WWDC26 session about WKWebView. I found none; Safari 27 is mostly about quality.
- Whether Capacitor 8.5 is validated on final Xcode 27. Capacitor 9's date is a forecast.
- When the iOS 27 SDK becomes mandatory for App Store uploads. No date has been announced; Apple's engineer gave "no guarantees".
- Reviewer behaviour on 4.2 for wrapped apps: secondary sources disagree.

## Sources

- App Review Guidelines (4.2, 2.5.1, 2.5.2, 2.5.6, 5.1.3, 2.4.1): https://developer.apple.com/app-store/review/guidelines/
- Upcoming SDK requirements: https://developer.apple.com/news/upcoming-requirements/
- UIScene requirement, Apple engineer: https://developer.apple.com/forums/thread/832787
- WWDC26 "Modernize your UIKit app" (278): https://nonstrict.eu/wwdcindex/wwdc2026/278/
- WWDC26 "What's new in WebKit for Safari 27" (204): https://developer.apple.com/videos/play/wwdc2026/204/
- WWDC26 App Intents (345): https://developer.apple.com/videos/play/wwdc2026/345/
- WidgetKit and App Intents interactivity: https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities
- iPhone Duo newsroom: https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/
- WebKit for SwiftUI: https://developer.apple.com/documentation/webkit/webview-swift.struct and https://developer.apple.com/documentation/webkit/webpage and https://developer.apple.com/documentation/webkit/webpage/configuration and https://developer.apple.com/documentation/webkit/webpage/navigationerror and https://wwdcnotes.com/documentation/wwdc25-231-meet-webkit-for-swiftui/
- WKScriptMessageHandlerWithReply: https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply
- WKURLSchemeHandler: https://developer.apple.com/documentation/webkit/wkurlschemehandler
- isInspectable: https://webkit.org/blog/13936
- WebKit storage policy: https://webkit.org/blog/14403/updates-to-storage-policy/
- 7-day cap (Safari and Home Screen apps): https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- WKWebView storage report, WebKit bug 211775: https://bugs.webkit.org/show_bug.cgi?id=211775
- Ionic on the 7-day cap: https://ionic.io/blog/is-apple-trying-to-kill-pwas
- Home Screen opens as web app in iOS 26: https://webkit.org/?p=16993
- Capacitor 8.5: https://ionic.io/blog/capacitor-8-5-released
- Road to Capacitor 9: https://ionic.io/blog/?p=6904
- Capacitor iOS requirements: https://capacitorjs.com/docs/ios and https://capacitorjs.com/docs/ios/spm
- Capawesome Health plugin: https://capawesome.io/docs/sdks/capacitor/health/
- Perfood HealthKit plugin: https://cdn.jsdelivr.net/npm/@perfood/capacitor-healthkit@1.3.2/README.md
- Tauri iOS plugins: https://v2.tauri.app/de/blog/tauri-2-0-0-alpha-4/
- HealthKit background delivery: https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:)
- HealthKit on iPad: https://developer.apple.com/forums/thread/732944
- NSUbiquitousKeyValueStore limits: https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore
- 64 pending notifications: https://developer.apple.com/forums/thread/811171
- WKWebView 60 Hz report: https://developer.apple.com/forums/thread/773222
- WebGL on Metal regression: https://bugs.webkit.org/show_bug.cgi?id=255987
- high-performance slower: https://bugs.webkit.org/show_bug.cgi?id=276959
- Three.js game shipped via Capacitor (Sep 2026): https://raxxo.shop/blogs/lab/shipping-a-three-js-game-to-the-ios-app-store
- Context loss after backgrounding: https://discourse.threejs.org/t/context-lost-when-backgrounding-safari-on-ios-17-developer-beta-8/55772
- Blank web views after process death: https://embrace.io/blog/bug-of-the-month-blank-webviews/
- Keyboard and viewport-fit bugs: https://trac.webkit.org/r233905 and https://bugs.webkit.org/show_bug.cgi?id=192564
- interactive-widget: https://htmhell.dev/adventcalendar/2024/4/
- Standalone keyboard bug: https://dev.to/cederhook/fixing-the-ios-standalone-pwa-keyboard-bug-that-shrinks-your-viewport-for-good-63d
- Web Share in WKWebView: https://bugs.webkit.org/show_bug.cgi?id=198606
- iPadOS 26 menu bar: https://developer.apple.com/videos/play/wwdc2025/243/ and https://developer.apple.com/forums/thread/795696
- Secondary 4.2 guides: https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper and https://vp0.com/blogs/fix-app-store-rejection-4-2-minimum-functionality
- SiriKit deprecation (secondary): https://bitrise.io/blog/post/wwdc26-under-the-radar

Repo files I read, nothing changed:
- /Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/index.html
- /Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/src/app.js
- /Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/src/store.js
- /Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/src/cloud.js
- /Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/src/sound.js
- /Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/src/style.css
- /Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/src/variant.css