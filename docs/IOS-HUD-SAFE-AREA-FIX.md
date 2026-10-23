# iPhone HUD safe-area fix

The physical iPhone screenshot from build 111 shows the tribe/stars/turn and visual/sound controls underneath system status icons and the Dynamic Island. The HUD already requested safe-area padding, but those rules were inside Tailwind's `components` cascade layer. Ordinary `p-3` utilities in the higher-priority `utilities` layer overrode their padding. Ordering the class names differently cannot fix this.

The `.safe-*` guard rules now live outside cascade layers so their longhand inset padding wins over ordinary layout utilities. They use actual `env(safe-area-inset-*, 0px)` values, with the existing 12px padding floor for devices without an inset. No phone model or notch height is hard-coded. The linked minimap offset uses the same top padding plus 44px controls and an 8px gap; its right edge also clears a landscape inset. Bottom controls benefit from the corrected padding precedence too.

The fix does not change models, beta preferences, map/gameplay state, saves, native signing or entitlements. `viewport-fit=cover`, Capacitor `contentInset: never` and the working `scrollEnabled: true` setting are preserved; native insetting must not be added on top of CSS insetting.

Five source regression tests in `server/ios-safe-area.test.ts` guard unlayered precedence, all inset directions, linked minimap offsets and unchanged native scrolling. External browser checks substitute literal device insets into served CSS while preserving its actual cascade and exercise real menu/gameplay controls. Zero-inset browser tests alone cannot catch this defect, which is why earlier mobile viewport checks missed it.

Independent evidence and unaltered captures live outside Git in `/home/ubuntu/sunder-art-pipeline/ios-hud-safe-area/`. A physical iPhone check on the resulting TestFlight build is still required to confirm actual WKWebView inset reporting, status-bar clearance, landscape rotation and home-indicator clearance. The commander readability/art pass remains separate and is not silently included in this UI fix.

## Completed software validation — 2026-10-23 UTC

TypeScript, all **394 tests in 50 files**, the production web build, Capacitor web copy and `git diff --check` passed. A real-browser cascade comparison using identical simulated insets showed old-build padding incorrectly staying at **12px top/12px bottom**, while the fixed build used **62px top/34px bottom**.

The independent production harness passed all five requested cases: 440×956 with 62px/34px top/bottom; 390×844 with 59px/34px; 375×667 with 20px/0px; desktop with zero insets; and 956×440 landscape with 62px side insets and a 21px bottom inset. It also checked portrait-to-landscape save/resume, byte-identical saves, menu scrolling, minimum 44px interactive HUD controls, minimap separation and zero default-off model requests/page errors. For the 440px case, the top buttons begin at y=62 and Map begins at y=114.

Passing evidence is `/home/ubuntu/sunder-art-pipeline/ios-hud-safe-area/attempt-2026-10-23T00-21-41-759Z-395977/ios-hud-safe-area-results.json`. The original failed harness attempt is preserved; its read-only Capacitor stub conflicted with the real bootstrap. Correcting that test stub required no application-source change. The provided-inset tests establish CSS layout behavior, not actual WKWebView inset reporting or physical device confirmation.
