# Sunder HUD readability follow-up

## Scope

The first callback-driven playtest of build 120 identified one confirmed UI issue: an expanded Map covered the latest-event notification. It also raised suspected phone-scale unit/city separation and unlabeled utility-button discoverability concerns. This follow-up changes HUD presentation, not character art, model scale, gameplay balance or visual defaults.

## Changes

`GameHudRail` places the latest-event text and Minimap in one safe-area-aware layout. Phone layouts stack them in normal flow; wider screens reserve separate horizontal space. The complete event wraps without a truncation clamp, is announced as a polite status, and cannot be covered by the Map simply because each was independently positioned. The Minimap close button now has a 44 × 44px minimum touch target.

Phone utility buttons show short labels: **Research**, **Pacts**, **Planner**, **Undo** when available, and **Next** with its remaining-unit count. Their existing actions and desktop labels remain. Only the utility group scrolls when the viewport is tight; **End Turn** stays in a separate non-shrinking area. Explicit accessible names and the Planner pressed state improve assistive-technology identification.

A selected unit standing on a currently visible, human-owned city has a **City on this tile** action identifying the city and its level. It calls the existing city-selection operation. It is deliberately absent on neutral and hostile cities, whose existing management view is unavailable; the unit's Capture action remains primary there. Guardian naming is consistent in unit details and battle preview.

## Preserved boundaries

No core-state, save-format, movement, economy, combat, capture, unlock, model/provenance, terrain or native configuration changes are included. Beta characters and landscape remain independently opt-in and default off. This is not a claim that all silhouettes, missing-role art or city architecture are visually finalized.

The city-access control addresses identification and inspection, not physical overlap of model silhouettes. Character models were not automatically resized or retouched based on a suspected screenshot issue.

## Validation

Source checks cover full-event rendering, shared inset-aware flow, minimum-touch contracts, mobile labels, owned-city presentation without state mutation, and neutral/hostile Capture preservation. The HUD regressions are included in the existing repeated playtesting lane.

Completed engineering gates:

- TypeScript, the full 60-suite / 461-test regression pass, bounded-heap production build and whitespace checks passed.
- The full API-serving production target passed the existing API contract and unchanged default/review-boundary checks. Default visuals still request no candidate GLBs.
- Independent geometry/touch checks passed at 393×852 with zero and 59px top / 34px bottom insets, 320×568 with those portrait insets, 852×393 with 59px side insets, and desktop 1280×800. Map and natural-event boxes were disjoint; mobile targets and End Turn safe bounds passed. A no-event desktop alignment regression was found during screenshot review and corrected before publication.
- A separately disclosed 320px long-message DOM-text layout fixture wrapped onto five lines while remaining separate from the Map and leaving the match save byte-equivalent. This is layout coverage, not a naturally generated event or evidence of visual approval. The other phone/landscape captures use natural match events.
- Real UI checks reached the owned-city panel in default and beta modes; seed, turn, tribes, tiles, cities and units were unchanged by the shortcut. No browser page errors were recorded. Neutral/hostile-city Capture preservation is additionally unit-tested.
- The ordinary two-game UI lane completed legal movement, three turns and save/reload in both visual modes; its beta case verified harvesting. Its default seed lacked an eligible harvest target and remains coverage-limited, not an action failure.
- Native asset copy matched all 13 final web files byte-for-byte. No native scroll/inset configuration changed.

The source push uses the already owner-enabled automatic iOS/TestFlight workflow; upload success is tracked against that exact commit and does not establish Apple processing or device distribution. No public release or duplicate upload is performed.

Browser CSS-inset simulation cannot establish WKWebView behavior, physical touch feel, total iPhone RAM or sustained device performance. On very narrow screens, swipe the utility group to reach later actions; End Turn stays fixed. Expanded Map still intentionally covers some board area and can be closed. Enlarged OS text and physical-device use remain additional testing needs.
