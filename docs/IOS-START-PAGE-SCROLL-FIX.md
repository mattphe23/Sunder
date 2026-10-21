# iOS start-page scrolling fix

## Report and cause

The owner reported that Sunder's start page could not be scrolled in TestFlight build 104. The native wrapper set `ios.scrollEnabled: false`. The installed Capacitor implementation maps this directly to `WKWebView.scrollView.isScrollEnabled`, disabling document scrolling for the entire app. The setup menu is roughly 1,700–1,950 CSS pixels tall in the tested phone layouts, so essential controls fall below the viewport.

Earlier browser tests used `scrollIntoViewIfNeeded` and automatic locator scrolling. These can reveal controls programmatically and do not test the native property, so they did not catch this packaging issue.

## Narrow correction

Enable `ios.scrollEnabled` in `capacitor.config.ts`. Keep the existing menu layout and all gameplay code unchanged. The menu grows to fit its content; the separate gameplay wrapper remains viewport-sized with `overflow-hidden`, and the canvas retains `touch-action: none` for Babylon drag and pinch. Capacitor independently sets native bounce to false, so disabling all page scrolling was unnecessary for rubber-band suppression.

The native README now documents this distinction. A two-test regression protects both the native setting and existing gameplay containment. No art decisions, visual promotion, monetization behavior, saves, identifiers or signing credentials changed.

## Verified results

- TypeScript check passed.
- Full suite: **369 tests passed in 44 files**.
- Production build passed with the existing nonblocking chunk-size advisory.
- `cap copy ios` succeeded; the generated, Git-ignored `ios/App/App/capacitor.config.json` contains `ios.scrollEnabled: true` and `com.islandroadco.sunder`.
- Genuine Chromium touch swipes at 390×844, 375×667 and 844×390 reached BEGIN CONQUEST and CONTINUE without programmatic or locator auto-scroll. Upward and downward swipes worked.
- Matches started and resumed. Canvas drag and two-finger pinch left document scrolling at zero and page scale at one.
- Zero browser page errors, candidate GLB requests or checkout requests in all three gesture cases.

External reproducible harness and evidence: `/home/ubuntu/sunder-art-pipeline/ios-smoke/start-scroll-fix/verify-scroll.mjs` and `gesture-results.json`, with screenshots beside them. None is committed as media.

## Remaining device and upload gate

Browser tests use a simulated iOS bridge, not an actual WKWebView. Re-test the rebuilt app on the affected physical iPhone: scroll to the bottom, start/continue, drag/pinch the board, scroll modal panels, edit the profile name with the keyboard and check notch/home-indicator clearance.

TestFlight build 104 cannot be altered by this source change. A separately authorized replacement signed build/upload is required. No signed workflow or Apple account action was initiated for this fix. Production remains procedural; the new roster and landscape are still development-only review features.
