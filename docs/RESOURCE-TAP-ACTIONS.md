# Resource-tap actions — 23 October 2026

## Player behavior

Tap a currently visible, unoccupied resource tile with no unit move selected to open **Resource actions**. Fruit offers **Harvest fruit**, animals offer **Hunt animals**, and minerals offer **Mine minerals**. The card shows the current star cost and owning city's +1 population benefit. The explicit action button spends stars; tapping or closing the card does not.

Unavailable actions stay visible but disabled and explain the relevant missing requirement: city ownership, Organization / Hunting / Mining, enough stars, or the player's active turn. Unexplored and out-of-current-vision resources do not reveal an inspector.

Existing unit movement, combat, own-unit selection and own-city selection retain their priority. A selected unit still moves when a reachable resource tile is tapped. If a unit is standing on a resource, its unit panel offers **Inspect resource on this tile** without changing the selection. Closing the card returns to the normal panel. Resources can still be collected from the owning city's existing harvest buttons.

## Implementation boundary

Resource position is React-local presentation state, not a new `GameState` field or save-format change. `resourceAction()` is a read-only availability helper. Explicit confirmation re-checks the current state immediately before calling the existing `GameStore.harvest()`. No costs, tech prerequisites, territory rules, population amounts, level-up reward flow, turn logic, balance, map generation, renderer geometry, model assets, beta defaults or cache limits are changed.

The resource callback passed to `GameCanvas` is the stable React state setter, so opening/closing the inspector does not recreate Babylon. Turn, phase, faction, seed and unit/city selection changes invalidate stale resource selection; removed/unseen resources close their panel. Existing UI modal layering is retained. Confirmation and close controls have at least 44px touch height; close is 44×44px.

## Completed validation

- TypeScript no-emit passed.
- Full Vitest: **56 files / 441 tests passed**, including **14 new focused tests** covering all three labels/technologies, ownership, shortage, Sunwei's existing one-star discount, visibility, turn/reward guards, read-only inspection, exact once-only collection and unchanged city-level reward behavior.
- Production build passed with a bounded JavaScript heap.
- Independent source safety review: ready, no concrete blocker found.
- Ordinary full-Express production gameplay through genuine canvas taps and public menu/UI controls passed with default procedural visuals and combined beta visuals. Tests inspect saved JSON as a read-only oracle and never inject fixtures or production state.
- Real gameplay exercised legal movement onto fruit without harvesting, unit-selection precedence, explicit inspect-under-unit, missing-tech disabled explanations, resource-tap/cancel without spending, confirm exactly once, existing city-panel harvest, and reload/resume with unchanged visual preferences.
- A native-bridge-simulated **430×932** phone case passed the same paths, including its generated missing-tech resource. In the measured phone case, tapping kept 9 stars, confirmation charged the existing 2-star cost (9→7), and owning-city population advanced exactly one. Default desktop measured 7→5; beta desktop 10→8. Zero page errors in the successful cases.
- iOS web copy passed: all **13** web-bundle files match the validated build byte-for-byte. No sandbox-specific native package changes are staged.

The successful real UI collection path was fruit. Animals and minerals have focused rule/action tests and share the same panel and confirmation path; the missing-tech browser cases exercise their disabled descriptions. This is not a claim of exhaustive real-match coverage for every faction and technology combination. Chromium/WebKit-bridge simulation does not measure physical WKWebView RAM, thermal performance or device FPS. Device confirmation remains the final tester check.

Earlier test attempts are retained externally: one cold-render startup timed out, one resource projection selected an occluding mountain rather than the desired tile, and randomly generated boards sometimes lacked the mix needed for the full suite. The harness was corrected to use actual pick-compatible tile meshes and conditional onboarding, allow cold startup, and report unavailable test preconditions rather than inject state. No product mechanics were changed to make the tests pass.

## Delivery

Changes are published GitHub-first as exact source/tests/docs, followed by a reversible WebDev snapshot. The owner-enabled automatic iOS workflow handles the new TestFlight upload; Apple processing and tester distribution are separate from GitHub upload success. No public App Store release or default visual promotion is part of this change.
