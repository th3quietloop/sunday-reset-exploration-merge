**Recommendation:** build one multiplatform SwiftUI Xcode project with iPhone, iPad and Mac as destinations. Use the native macOS destination, not Catalyst. Every platform hosts the same V11 web bundle in WebKit's SwiftUI `WebView`/`WebPage`, which needs iOS, iPadOS and macOS 26 or later. Put small native layers around it: Mac menus and keyboard shortcuts, a menu bar extra for today's block, one widget extension shared by iPhone and Mac, local notifications, Handoff, and a native copy of the board that widgets and the menu bar can read. Ship through the Mac App Store as a universal purchase with the iPhone and iPad app, using the same bundle ID, and let family and friends test through TestFlight. A notarized direct download is optional on top of that. Do not use Electron or Tauri.

## The five paths

| Path | Mac feel | Shares with iPhone, Duo, iPad | Size | Verdict |
|---|---|---|---|---|
| Designed for iPad | The iPad app in a window, Apple silicon only. iPhone apps run at a fixed size; iPad apps resize only if they support multitasking. There is no Mac-only code, so no menu bar extra and no Mac Settings window | 100%, it is the same binary | Same as iOS | Free stopgap only. The App Store lists it on Macs automatically unless you opt out; a later macOS version replaces it and moves existing users over |
| Mac Catalyst | Can feel close to native with the "Optimize for Mac" option. `WebView`/`WebPage` work on Catalyst 26, but `MenuBarExtra` (macOS 13+) and the `Settings` scene (macOS 11+) are macOS-only APIs, and Catalyst gets no AppKit | High | Small | Built for large UIKit codebases. Its other advantage, Intel Macs, no longer matters: macOS 27 runs only on Apple silicon, and a native macOS build can be universal anyway |
| **Native SwiftUI macOS destination in a multiplatform target (recommended)** | Real menus and commands, `Settings`, `MenuBarExtra`, the Mac toolbar, windows and full screen | One target with per-platform settings and `#if os(macOS)`. The widget extension is shared | Swift shell plus the web bundle | **Recommended.** The Swift shell is thin, so it costs about the same as Catalyst and gets every Mac API |
| Tauri 2 | Uses the system WKWebView on Mac, so the same engine and the same 60 fps limit. Has iOS support and a Mac App Store guide | Rust plus JS, but widgets, Live Activities, Handoff and the Duo APIs still need Swift | Installers under 10 MB | Adds a third language and gains nothing on an Apple-only plan. One forum report describes WebGL jitter inside Tauri on an M2 Pro |
| Electron | Bundles Chromium. The Mac App Store build drops `autoUpdater` and `crashReporter`. No iPhone or iPad at all | None, so it would be a second shell | 85 to 250+ MB installers, 150 to 300 MB in memory at idle | Only worth it if Windows or Linux ever matter |

## What feels native on the Mac, in the recommended path

- **Menus and keyboard shortcuts.** Use `.commands` with `CommandMenu` and `CommandGroup` plus keyboard shortcuts. The same commands show in the iPad menu bar. Move T, P, L, 1 to 4, Undo and Redo into menu items that call into the page with `callJavaScript`, so the menu owns them; a key a menu claims never reaches the web view. Point Cmd-comma at the web Settings with `CommandGroup(replacing: .appSettings)`. On iPad and Mac, WWDC26 SwiftUI now shows few menu icons by default; `.labelStyle(.titleAndIcon)` keeps one.
- **Windows and tabs.** Start with one main `Window`. Every extra window is another WebGL desk and another copy of the board in memory. Add a `WindowGroup` later, once the native store can broadcast changes to every window. This replaces the web app's cross-tab `listenTabs`.
- **Toolbar.** The SwiftUI `.toolbar` becomes the Mac toolbar. WWDC26 added `visibilityPriority`, `ToolbarOverflowMenu` and `toolbarMinimizeBehavior`. Whether the Today/Planner switch and Add move into it is a design call for Russell.
- **Menu bar extra for today's block.** A `MenuBarExtra` with `.menuBarExtraStyle(.window)`, drawn in SwiftUI from a small "today snapshot" JSON. The web app writes the snapshot on every save, into the App Group. The fallback is running the DOM-free `src/model.js` in JavaScriptCore. Separately, macOS Tahoe already shows iPhone Live Activities in the Mac menu bar, so an iPhone Live Activity for the current block reaches the Mac even before there is a Mac app.
- **Desktop widgets.** One WidgetKit extension builds for both iOS and macOS. iPhone widgets also appear on the Mac desktop through Continuity (iOS 17+, same Apple Account), even when the app isn't installed on the Mac.
- **Notifications.** Schedule local notifications with `UNUserNotificationCenter` from `Model.remindersFor` output passed over the bridge. This needs no push server and works offline. The web app's own web push depends on its service worker (`sw.js`); I did not confirm whether that can work inside a WKWebView.
- **Handoff.** An `NSUserActivity` carrying date, zoom and mode, set over the bridge. It works between apps signed by the same team. `webpageURL` can hand off to the live site on a device without the app.
- **iCloud sync.** Use CloudKit's private database; Developer ID apps can use it too. `NSUbiquitousKeyValueStore` is too small for the board (1 MB total, 1,024 keys) but fits per-device view preferences. The board's existing `app/core` and `months/YYYY-MM` split maps onto CloudKit records, and `Model.mergeBoards` handles conflicts. The other option is the existing household server (`src/cloud.js`). **Sync and cloud need Russell's OK.**

## Size and performance

- The V11 web folder is 4.2 MB (`src` is 3.6 MB, `src/kit` 1.3 MB). Three.js and the fonts would be added once bundled. My estimate for the SwiftUI app is roughly 10 to 15 MB; I did not build it.
- WKWebView runs the same OS WebKit as Safari. WebGPU shipped in Safari 26 on every platform, and Safari 27 fixes WebGL context state after a context loss.
- Bug reports say WKWebView caps `requestAnimationFrame` at 60 fps, even on 120 Hz screens (WebKit bug 294338). That suits this desk: it only draws while something moves, and its easing stays at or under a quarter second.

## Distribution

- **Mac App Store.**
  - Requirements: sandboxed, App Review, updates only through the store.
  - Gains: universal purchase with iPhone and iPad, TestFlight on the Mac, and iCloud key-value storage, which requires App Store distribution.
  - Guideline 4.2 rejects "a repackaged website". The widgets, menu bar extra, notifications and offline use are what clear it.
  - Guideline 2.5.2 forbids downloading code that changes the app, so bundle Three.js and the fonts.
- **Developer ID download.** Notarization with the Hardened Runtime, `notarytool` and a stapled ticket. No review, and CloudKit is allowed with a Developer ID profile. No universal purchase, no In-App Purchase, and you handle your own updates.

## How much one project shares across iPhone, iPhone Duo, iPad and Mac

- **Web layer:** 100%. V11 already adapts by width. The Duo's closed screen (466 pt wide) gets the phone list view; its open screen (669 pt) gets the desk.
- **Swift shell:** I estimate 80 to 90% shared: the web host, scheme handler, bridge, store, notifications, Handoff, CloudKit, widgets and App Intents. Per-platform pieces:
  - **Mac:** `Settings`, `MenuBarExtra`, window sizing.
  - **iPad:** the menu bar commands, shared with the Mac.
  - **iPhone:** a Live Activity.
  - **Duo:** iOS 27.1 SDK APIs. `ReservedRegion` gives the fold and camera rectangles, which get passed into the page so the desk avoids the fold. `ArrangementView` is available if the shell ever splits natively.
- Apple's DTS says an app built with Xcode 26 or older runs on Duo in a compatibility mode at iPhone size and aspect ratio. Building with the 27.1 SDK is what unlocks the full inner screen.

## What V11 needs before living in a shell (read only, nothing changed)

- `/Users/russell/Developer/353_SundayReset_ExplorationMerge/v/corners11/index.html` loads Three.js from `cdn.jsdelivr.net` and fonts from Google Fonts, and its content security policy only allows `'self'` plus those hosts.
  - Bundle Three.js and the fonts.
  - Serve the files through `WebPage.Configuration.urlSchemeHandlers`.
  - Add the custom scheme to the content security policy.
- `src/store.js`: add a native adapter next to the `db` and localStorage paths, so the board lives in an App Group file. Status, rescue copies and widgets all keep working, and nothing depends on WKWebView localStorage. Turn off the `keepAtRisk()` messaging inside the app.
- `sw.js`: skip registering it in the shell. The assets ship in the app, and on iOS a WKWebView only gets service workers with App-Bound Domains, capped at 10 domains.

## What I could not confirm

- Any WWDC26 statement on where Mac Catalyst is headed.
- Whether WKWebView localStorage is subject to the 7-day storage clearing.
- Whether service workers in a Mac WKWebView need App-Bound Domains.
- Whether web push works inside a WKWebView.
- Whether Electron gets 120 Hz or better WebGL.
- Whether a `WindowGroup` gets native Mac window tabs automatically.
- Whether iPad apps running on a Mac show their widgets there.
- Whether WKWebView exposes the Duo fold as a CSS `env()` value.
- Tauri 2's current version and its tray API.
- The size and percentage figures above are my estimates, not measurements.

## Sources

- https://developer.apple.com/documentation/webkit/webview-swift.struct
- https://developer.apple.com/documentation/webkit/webpage
- https://developer.apple.com/documentation/webkit/webpage/configuration
- https://developer.apple.com/documentation/swiftui/menubarextra
- https://developer.apple.com/documentation/swiftui/settings
- https://developer.apple.com/documentation/apple-silicon/running-your-ios-apps-in-macos
- https://developer.apple.com/documentation/uikit/choosing-a-user-interface-idiom-for-your-mac-app
- https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon
- https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target
- https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore
- https://developer.apple.com/support/developer-id
- https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- https://developer.apple.com/app-store/review/guidelines/
- https://help.apple.com/xcode/mac/current/en.lproj/deve7aa31da5.html (universal purchase)
- https://developer.apple.com/library/ios/documentation/UserExperience/Conceptual/Handoff/HandoffFundamentals/HandoffFundamentals.html
- https://developer.apple.com/videos/play/wwdc2026/269/ (What's new in SwiftUI)
- https://developer.apple.com/tutorials/data/design/human-interface-guidelines/designing-for-iphone-duo.md
- https://developer.apple.com/forums/thread/847887 (unadopted apps on Duo)
- https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/
- https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
- https://bugs.webkit.org/show_bug.cgi?id=294338
- https://developer.apple.com/forums/thread/773222
- https://developer.apple.com/forums/thread/781744 (service workers and WKAppBoundDomains)
- https://support.apple.com/en-us/108996 (iPhone widgets on Mac)
- https://www.apple.com/sg/os/pdf/All_New_Features_macOS_Tahoe_Sept_2025.pdf (Live Activities in the Mac menu bar)
- https://9to5mac.com/2026/09/14/macos-27-golden-gate-now-available-here-is-everything-new/
- https://v2.tauri.app/distribute/app-store/
- https://v2.tauri.app/blog/tauri-20/
- https://forum.babylonjs.com/t/performance-between-safari-and-wkwebview-tauri/60811
- https://electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide
- https://www.pkgpulse.com/guides/electron-vs-tauri-2026
- https://tech-insider.org/tauri-vs-electron-2026/