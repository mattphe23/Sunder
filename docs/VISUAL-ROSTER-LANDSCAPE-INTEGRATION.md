# Sunder — combined roster and landscape integration

This is an engineering integration of existing audited art, not an aesthetic approval or a replacement of the current TestFlight visuals. No new Scenario generation, purchase, source-image edit, GLB rewrite, or art-status change was made.

**Historical boundary:** the validation and release statements below describe the development review completed on 2026-10-21. The subsequently authorized [opt-in beta rollout](OPT-IN-BETA-VISUALS.md) uses separately audited 512px runtime derivatives, finite cache safeguards and reversible display settings. It does not relax the development review gates or make imported visuals the default. Physical iPhone performance and owner visual judgment remain open gates.

## What is now connected

The development-only `/visual-review` board brings the tribe rosters and the corrected `world-v3` landscape into the same real Babylon scene. It is a deterministic, isolated fixture built with Sunder's map generator and canonical unit statistics. It does not use `GameStore`, write a save, unlock content, or change combat, movement, terrain or economy rules.

Choose any of the eight designed tribes, switch between original and imported units, switch between original terrain and `world-v3`, orbit the camera, and select a role to preview a legal movement hop. The imported mode requires development plus `devgame` and the exact `visual-review=roster-v1` query. The separate `landscape-pilot=world-v3` gate remains in place. The page is excluded from the production router.

A development example is:

```text
/visual-review?devgame=&tribe=4&preset=archipelago&visual-review=roster-v1&landscape-pilot=world-v3
```

`tribe` is the designed identity: Auren 0, Kharzul 1, Sunwei 2, Vessari 3, Nerivane 4, Dravok 5, Valkyra 6, Mycelon 7. It is not a mutable player turn slot. The fixture deliberately puts the reviewed tribe into player slot zero to exercise this distinction.

## Retained original model coverage

| Tribe | Ordinary roles | Tribe specialist | Named hero | Distinct original GLBs |
|---|---|---|---|---:|
| Auren | Warrior, Archer, Defender, Rider | Arcanist | Maelis | 6 |
| Kharzul | Warrior, Archer, Defender, Rider | Berserker | Drukhar | 6 |
| Sunwei | Warrior, Archer, Defender, Rider | Warden | Wu Jian | 6 |
| Vessari | Warrior, Archer, Defender, Rider | Raider | Szara | 6 |
| Nerivane | Warrior, Archer, Defender, Rider | Tidecaller | Nereth | 6 |
| Dravok | Warrior, Archer, Defender, Rider | Bulwark | Borvak | 6 |
| Valkyra | Warrior, Archer, Defender, Rider | No separately modeled specialist | Skadi | 5 |
| Mycelon | Warrior, Archer, Defender, Rider | No separately modeled specialist | Morel | 5 |

The integration catalog references 46 already-audited original GLBs. The Nerivane rider uses the existing aquatic v2 candidate. The existing provenance, storage paths, pilot budget checks and decision values remain authoritative and unchanged. Rejected studies are excluded. Custom tribes, embarked/boat actors, guardians and unmodeled roles retain their procedural rendering.

## Shared-model runtime

Previously, individual pilot branches were designed for one candidate at a time. The new scene-owned `BoardModelCache` fetches each managed GLB URL once, shares its pending promise, and limits distinct loads/decodes to two concurrent operations. Source containers remain off-scene.

Every actor gets independent mesh transforms and material objects, while geometry and decoded texture references remain shared. Moving or disposing one warrior cannot move or break its peer. The fixture includes two warriors specifically to check that behavior. Target-height normalization matches the former single-candidate path. Hero progression and veteran cues remain under the stable unit parent.

A failed URL is remembered for the life of the scene. Its procedural actor remains visible rather than becoming blank, and repeat actors do not create a retry storm. Scene/parent disposal cancels late attachment and releases cached templates and clones.

## Landscape clearance, not a redesign

The combined review preserves the existing corrected world-v3 visible-surface spans, shoreline shelf, tonal regions and sparse seed-stable ash mist. It adds a narrow occupied-unit readability treatment:

- A drawable occupied forest keeps two smaller biome-native trees at opposite outer corners rather than trees through the actor's centre.
- A drawable occupied mountain retains its authored assembly but is lowered and nudged, with a deterministic 0.63–0.70 scale.
- Static geometry fingerprints include current drawable occupancy only in roster review, so movement updates the lane.
- Own explored actors, discovered guardians and currently visible explored enemies follow the renderer's existing visibility rules. Hidden ordinary enemies cannot clear vegetation or leave a stale mountain lane. Water actors do not create land lanes.
- Ordinary/unflagged geometry and unit selection remain on their previous paths.

## Scope and remaining visual decisions

These are genuine live-board comparisons, not concept-sheet composites or a production-art claim. Original GLB colour/contrast limitations are intentionally preserved. In particular, Borvak's starker-colour feedback remains deferred, and some dark armours still merge at small scale. Large cities and neighboring props can still obscure actors at particular viewing angles. The mountain/forest lane is a limited first integration step, not a claim that all possible camera occlusion has been solved.

Per-asset mobile-budget approval is not the same as scene-level memory approval. Sharing avoids duplicate resources for repeated actors, but loading several distinct textured roles can still be expensive. A native WKWebView memory/frame-time test, an explicit decoded-texture budget and possibly source-preserving lower-resolution runtime derivatives are required before default promotion. Browser software-WebGL captures do not establish iPhone frame rate or thermal performance.

## Release boundary

No App Store Connect metadata, tester invitation, beta review, signing secret or signed-upload workflow was changed. Already uploaded build 104 is unchanged. This work does not replace its procedural visuals, bypass Apple's invitation issue, or authorize a new TestFlight upload. Production remains procedural until a separate approved promotion and native validation pass.

## Reproducible evidence

The external workspace is `/home/ubuntu/sunder-art-pipeline/visual-integration/`. It contains the real-board capture harness, matched screenshots, request/scene metrics and production negative-control harness. All GLBs and review media remain outside Git and outside `client/public`; only source, tests and this document belong to the commit.

The desktop fixture uses seed 6104 on archipelago or highlands with a fixed camera. Each tribe has one actor per covered role and a second warrior: seven actors for a six-model tribe, six actors for a five-model tribe. Controls compare this exact state, rather than substituting an illustration or silently changing the game seed.

## Completed validation — 2026-10-21 UTC

- `pnpm check`: passed.
- Focused roster/cache/terrain-lane/registry suite: 82 tests passed in four files.
- Complete `CI=true pnpm test`: **367 tests passed in 43 files**.
- `NODE_OPTIONS='--max-old-space-size=2048' pnpm build`: passed. The existing large Babylon/vendor chunk advisory remains nonblocking; this is not a native runtime-performance result.
- `git diff --check`: passed.
- All eight imported desktop rosters loaded completely: seven actor instances from six original URL requests for the first six tribes, six actor instances from five original URL requests for Valkyra/Mycelon. Each repeated warrior shared its original URL request.
- All eight 430×932 phone-view rosters loaded completely, with zero page errors, zero document horizontal overflow, unchanged save sentinel and one opaque slab for every unexplored tile.
- The Nerivane preview hop moved the selected warrior independently of the second warrior, without a model refetch.
- A blocked warrior model retained both procedural warriors; the remaining models still loaded and no browser runtime error occurred.
- Eight ordinary development games, one per designed identity, made zero GLB requests and created zero imported-preview nodes.
- Matched procedural fixture controls made zero model requests on desktop and phone.
- The actual production bundle passed two offline 390×844 and 375×667 phone scenarios using a simulated Capacitor iOS bridge. Each completed onboarding, advanced three turns, restored identical seed/turn/unit/tribe state after reload, made zero imported-GLB/checkout requests, ignored review queries and returned the not-found UI for `/visual-review`, `/model-lab` and `/playtest-lab`.

### Texture-footprint finding: a real promotion blocker

The measured material-referenced texture footprint is **302,252,032 bytes (approximately 288 MiB)** for each six-model tribe and **251,920,384 bytes (approximately 240 MiB)** for each five-model tribe. These are `width × height × 4` base-level RGBA estimates over unique decoded texture objects reachable through the scene/materials. They are not measured process RAM or driver allocation, and exclude additional mip levels, buffers and native runtime overhead. They include the scene's small auxiliary texture.

An initial capture-only metric incorrectly counted only `scene.textures`, yielding zero because the cached asset templates intentionally live off-scene. The corrected harness also follows active material texture references; the values above supersede that first metric. A small downloaded GLB is not evidence of a small decoded runtime footprint.

The repeated warrior does share decoded resources correctly, but six *different* textured roles still have a substantial footprint. The next engineering gate is a bounded texture-resolution/format and multi-tribe-scene budget, with immutable originals retained, separately audited runtime derivatives if authorized, and real iPhone/WKWebView measurements before a visual TestFlight rollout. It is not safe to claim that these original full-roster textures are mobile-ready merely because the software-WebGL browser renders them.

## Delivery and publication

The source change is limited to the development route, renderer wiring, four new renderer/fixture modules, the review page, three test files and this note. GitHub `main` is authoritative; source publication precedes the managed WebDev checkpoint, and equal-tree local checkpoint divergence is preserved then reconciled without a remote rewrite. No media, binaries, local signing files or secret values are included.
