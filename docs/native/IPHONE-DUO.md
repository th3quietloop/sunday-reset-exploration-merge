# iPhone Duo developer brief (as of Oct 14, 2026)

The iPhone Duo is Apple's first foldable iPhone. It opens like a book, and there is no single "pose" value to read: an app finds out what changed through size classes, reserved regions (the fold) and a hinge status with an angle. A WKWebView app gets no fold information unless the native shell passes it in, because Safari's fold APIs are switched off by default in iOS 27.1. This Mac can't build for the Duo yet: it has Xcode 27.0, and the Duo needs Xcode 27.1. I changed no repo files.

## 1. What it is
- **Shape:** one 7.6" inner display that folds, plus a 5.4" outer display. Each display has its own front camera. Touch ID is in the side button and there is no Face ID.
- **Timeline:** announced Sep 9, 2026. Pre-orders open Oct 16 and it ships Oct 23 on iOS 27.1, from $1,999.
- **Panels (Apple spec page):** inner is 1878x2670 px at 430 ppi; outer is 1398x2034 px at 460 ppi. Both run ProMotion up to 120 Hz and share one aspect ratio.
- **Hold positions:** the press release names three: closed, fully open, and propped on a surface. Apple's developer docs picture six: closed, tent, open wide, partially folded ("book"), open tall, and laptop.
- **iOS changes:** Split View lets two apps run side by side on iPhone for the first time. Opening the inner display lets an app have more than one window. StandBy works on either display.

**What I found on this Mac**
- `simctl` lists "iPhone Duo" (iPhone19,4). The 27.1 runtime is installed. Xcode is 27.0 (27A266a) with only the iOS 27.0 SDK.
- The capabilities plist shows:
  - Display 0, "LCD", the outer display: 1398x2034 px at 3x, which is 466x678 pt. Corner radii are 8 on the left and 59 on the right, so the spine is on the left.
  - Display 1, "LCD-1", the inner display: 2007x2853 px at 3x, which is 669x951 pt. All corners are 55. Its native rotation is 270, so open, it is natively landscape.
  - A "Resizable" scene display, for Device Hub's resize mode.
  - `touch-id` true, `pearl-id` false, `DeviceSupportsDynamicIsland` true, `minRuntimeVersion` 27.1.
  - Nothing in the plist mentions hinge or posture.
- The 27.1 runtime's repair strings for V68 (the Duo's product class) name an "Inner Display", an "Outer Display", inner and outer front cameras, and Battery 1 and 2. Its device graphics show a portrait book (closed) and a landscape slab (open). I decoded them into the scratchpad.
- The 27.1 runtime's WebKit contains `ViewportSegmentsAPIEnabled`, `DevicePostureAPIEnabled`, `env(viewport-segment-*)`, `horizontal-/vertical-viewport-segments` and `device-posture`. The 27.0 and 26.5 runtimes have none of them, so these web APIs are new in 27.1.
- The public SDK in Xcode 27.0 has no Duo APIs: no `ReservedRegion`, no `UIHingeInteraction`, no arrangement views. Only private `_UIArrangementView_v0` stubs exist.

## 2. Sizes in points

The 669x951 inner size comes from the simulator. Apple's 1878x2670 px panel suggests the system draws at 3x and scales down (about 2.81 native scale, like the old Plus phones). That is my inference and isn't confirmed on hardware. Third-party figures of 626x890 look like pixels divided by 3, which would be wrong.

| State | Display | Points | Size classes (w/h) | Bars and fold |
|---|---|---|---|---|
| Closed, portrait | outer | 466x678 | compact / regular | Status bar, Dynamic Island, toolbar and tab bar stack on the trailing edge (they stay on that side in right-to-left languages) |
| Closed, turned (tent) | outer | 678x466 | compact / compact | Bars on the side |
| Open, landscape (natural) | inner | 951x669 | regular / regular | Bars on the trailing edge; fold region inactive (about 40 pt at x 455 to 495 in one simulator probe) |
| Book (partly open, landscape) | inner | 951x669 | regular / regular | Fold region active, giving two panes of about 455 pt (the simulator's Book pose is 127°) |
| Open, portrait | inner | 669x951 | regular / regular | Normal horizontal bars |
| Laptop (partly open, portrait) | inner | 669x951 with a horizontal fold | regular / regular | Not measured; roughly half above and half below |
| Split View | inner | about 50/50 of 951 | not documented | Each app keeps its controls on its outer edge |

Apps built with an SDK older than 27.1 run in compatibility mode. Closed, they use only the space left of the status bar and camera (about 386 pt in a probe); open, they get about 871x669. The inner display ignores locked orientations.

## 3. What Apple's design guidance says
Sources: the HIG page "Designing for iPhone Duo", the doc "Preparing your app for iPhone Duo", and Tech Talks 111461, 111464 and 111466.
- **Plan for resizing.** Use size classes and scene or view bounds. Don't use idiom, orientation, fixed widths, `UIScreen.main` (to be deprecated) or `UIScreen.scale`.
- **Keep one app across displays.** Function and state stay the same; the inner display may add one more level, like Mail's list beside the message. Don't tie a feature to one pose, and avoid big layout jumps when the device folds.
- **Expect lopsided safe areas.** Bars on the side make the left and right insets differ, so handle each side separately.
- **Keep the fold clear.** System sheets, alerts and menus move off the crease by themselves. Custom views should keep interactive things out of it (scrolling content can cross it). Grids should use an even number of columns. Split views even out their columns when the device is partly folded.
- **Arrangement views** (`ArrangementView` in SwiftUI, `UIArrangementViewController` in UIKit) hold a primary and a secondary view:
  - Split style: side by side when wide, stacked when tall, steering around the fold.
  - Overlay style: the primary sits on top of the secondary, and when partly folded the primary moves to the trailing (or bottom) half.
- **Games and immersive views:** fill the screen and change the aspect ratio rather than letterboxing. Keep text and control sizes steady across sizes.
- **Opening and closing is a resize.** It is a size and trait change: the process stays alive and the scene is not torn down (Apple DTS forum summary). Content moves to whichever display faces the person.
- **Laptop pose:** media or content on the top half, controls on the stable bottom half (Tech Talk 111466).

## 4. Native APIs (all iOS 27.1 SDK)
- **Size and geometry:** `horizontalSizeClass` and `verticalSizeClass`; `windowScene(_:didUpdateEffectiveGeometry:)`; `view.bounds`; `traitCollection.displayScale`.
- **The fold and cameras:** `GeometryProxy.reservedRegions(kind:options:layoutDirectionBehavior:)` (SwiftUI) and `UIView.reservedRegions(kind:options:)` (UIKit), giving `ReservedRegion` values. Kind `.division` is the fold, `.occlusion` is a camera or status area. Each has `frame`, `margins` and `isActive`; the fold is active only when partly open. A third-party probe saw the list come back empty for the first few layout passes, so don't cache the first reading.
- **Hinge:** `.onHingeChange { old, new in }` gives `DeviceHinge` with an `angle` and a `status` of `.closed`, `.partiallyOpen` or `.fullyOpen`. UIKit's equivalent is `UIHingeInteraction`, whose `Update.hinge` is a `UIHinge?`. Apple says to use it for live effects, not layout, and the update rate is not guaranteed.
- **Bars:** `toolbarVerticalEdge` and `verticalBarEdge` say whether bars sit on the side. `toolbarVerticalBehavior(_:)` and `preferredVerticalBarBehavior` turn that off. `visibilityPriority` and `axisBehavior` control what overflows.
- **Windows:** extra windows only on the inner display, through `UIWindowSceneActivationAction`. Scene accessories and `CameraCaptureAccessory` show extra content on the outer display.
- **Tools:** Xcode 27.1 RC (requires macOS 26.6 or later) has Device Hub with Closed, Book, Open and Rotate controls. `simctl` has no pose command (third-party report).
- **Mac Catalyst caveat:** code that uses 27.1-only APIs fails to compile for Catalyst; wrap it in `#if !targetEnvironment(macCatalyst)`.

## 5. How a WKWebView app behaves
**Confirmed by Apple:**
- Fold changes are resizes and the process keeps running.
- Safari's user agent says iPhone, and there is no way to detect a Duo from the web. DTS says to use responsive design instead.
- Viewport Segments and Device Posture are "opt-in experimental features in iOS 27.1": Settings > Apps > Safari > Advanced > Feature Flags.
- WebKit hasn't stated a position on either standard (its issue #327 is still open).

**Expected, but not documented for the Duo:**
- The web view gets a bounds change, so `resize` and `visualViewport` resize events fire and media and container queries re-run, much like a rotation.
- `env(safe-area-inset-*)` only has values with `viewport-fit=cover`. Closed, the status column sits on the trailing side, so `safe-area-inset-right` (left-to-right) carries it. Open in landscape, the status column also stays on the side.
- A web view has no native bars. The page draws its own controls, so it should copy the trailing-edge column itself.

**Not reachable from the page:** where the fold is, and the hinge. Unless the flags are on (and an app probably can't turn them on for its own WKWebView, which I couldn't confirm), the shell must read `reservedRegions(.division)` and the hinge natively and pass them to the page, for example as `--fold-x`, `--fold-w` and `data-hinge`. Write the CSS with `@media (horizontal-viewport-segments: 2)` and `env(viewport-segment-*)` as well, so it lights up if WebKit later turns these on.

**WebGL cost:** at a device pixel ratio of 3, the inner display makes the canvas about 2853x2007 (5.7 MP). Consider capping the ratio on the inner display. What `devicePixelRatio` WebKit actually reports there (3 or about 2.81) isn't confirmed.

## 6. Layout ideas for Sunday Reset
1. **Closed (466x678; tent turns it to 678x466): Today.**
   - Show the band (the block you're in, time left, what's next) over the day's list, with the controls in a trailing column under the status area.
   - 466 is under the app's 600 px phone cutoff, so it gets the phone view. The outer display (about 1.45 tall-to-wide) is much squarer than a normal iPhone (2.17), so the four-lane tall day board may look squashed. The three-lane day board may fit better.
   - In tent, hands-free on a counter, show a big "now" card. A native StandBy widget is the system way to do this, since StandBy runs on either display.
2. **Open flat (951x669): the Planner as two halves.**
   - The 3D day board on the leading half; the week rows, bench or Block library on the trailing half. This is the existing beside arrangement, split evenly.
   - Hand the fold rectangle to the desk's existing `insets.blockers`, so no prop, tile or notepad rests in the crease.
   - Turned to portrait (669x951), it suits the week or month board with normal horizontal bars.
3. **Book (partly open): a paper planner.**
   - Left page: today's board. Right page: the notepad's Due soon list or the week. Dragging a tile across the spine places it.
   - The hinge angle could tilt the desk camera a little as a live effect, which is the kind of use Apple allows for hinge data.
4. **Laptop (partly open, portrait, hinge horizontal): look on top, hands below.**
   - Top half: the 3D desk and day board. Bottom half, lying on the table: the rack and Block library, the band's Done early and 15 more minutes, and Add. This matches Apple's own advice for this pose.

**Rule for all four:** opening or closing never reloads the page. Keep the same day, the picked block and any open panel. Today, crossing 600 px flips the desk to the phone list, so that switch must carry `view` state across.

## 7. What I could not confirm
- How a WKWebView behaves on a fold: which events fire, the `env()` values, and whether Safari's feature flags reach WKWebViews in other apps.
- The inner display's point size on real hardware (669x951 simulator vs 1878x2670 px spec).
- The fold's width (40 pt comes from one third-party simulator probe), sizes in laptop pose, and Split View widths and size classes.
- Safe-area numbers. A probe's 84 pt trailing inset when closed was measured with a native toolbar.
- The claim that the hinge angle is accurate to about 5°. It comes from a press report quoting Craig Federighi, not Apple's docs.
- I didn't boot or fold the Duo simulator: there is no 27.1 SDK here, so no Device Hub pose controls.
- WWDC 2026 has no Duo session, since the device was announced in September. The Duo material is in the September tech talks, plus WWDC26 "Modernize your UIKit app" on resizing.
- The Xcode 27.1 RC's date and build come from a third-party blog. Apple's notes confirm only that it is an RC.

## Local files
- `/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone Duo.simdevicetype/Contents/Resources/capabilities.plist`
- `/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone Duo.simdevicetype/Contents/Resources/profile.plist`
- `/Library/Developer/CoreSimulator/Volumes/iOS_24A94401/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS 27.1.simruntime/Contents/Resources/RuntimeRoot/System/Library/PrivateFrameworks/CoreRepairKit.framework/en_AU.lproj/Localizable-V68.strings`
- Decoded device graphics: `/private/tmp/claude-501/-Users-russell-Developer-303-86400/f35d3e2a-a054-4df6-a9b3-d5548f6a4088/scratchpad/duo/GraphicPhoneV68_Diffuse_s.png` and `/private/tmp/claude-501/-Users-russell-Developer-303-86400/f35d3e2a-a054-4df6-a9b3-d5548f6a4088/scratchpad/duo/GraphicPhoneV68Open_Diffuse_s.png`

## Sources
**Apple**
- [Apple Newsroom: Apple unveils iPhone Duo](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)
- [iPhone Duo specs](https://www.apple.com/iphone-duo/specs/)
- [HIG: Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)
- [Preparing your app for iPhone Duo](https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo)
- [UIHingeInteraction](https://developer.apple.com/documentation/uikit/uihingeinteraction)
- [DeviceHinge](https://developer.apple.com/documentation/swiftui/devicehinge)
- [DeviceHinge.Status](https://developer.apple.com/documentation/swiftui/devicehinge/status-swift.struct)
- [UIView.ReservedRegion](https://developer.apple.com/documentation/uikit/uiview/reservedregion)
- [Tech Talk 111461: Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461)
- [Tech Talk 111464: Leverage multiple displays and scenes](https://developer.apple.com/videos/play/tech-talks/111464)
- [Tech Talk 111466: adaptive layouts](https://developer.apple.com/videos/play/tech-talks/111466)
- [WWDC26 278: Modernize your UIKit app](https://developer.apple.com/videos/play/wwdc2026/278/)
- [Apple DTS forum summary of the iPhone Duo Group Lab](https://developer.apple.com/forums/thread/847644)
- [Xcode 27.1 RC release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27_1-release-notes)

**Others**
- [WebKit standards-positions #327 (Viewport Segments)](https://github.com/WebKit/standards-positions/issues/327)
- [Blake Crosley: Xcode 27.1 beta, your app in the iPhone Duo simulator (third party)](https://blakecrosley.com/blog/xcode-27-1-beta-iphone-duo-simulator)
- [iphoneduosupport.com: Websites on iPhone Duo (third party)](https://iphoneduosupport.com/blog/websites-on-iphone-duo/)
- [iphoneduosupport.com: Capacitor and web views (third party)](https://iphoneduosupport.com/blog/capacitor-web-iphone-duo/)
- [MacRumors: Apple Announces Foldable iPhone Duo](https://www.macrumors.com/2026/09/09/apple-announces-foldable-iphone-duo/)