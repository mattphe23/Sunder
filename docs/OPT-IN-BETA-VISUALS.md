# Opt-in beta visuals

## Scope and status

This change makes the audited character roster available in ordinary gameplay through an explicit **New visuals (beta)** setting. Procedural characters remain the first-launch default and the fallback. Landscape improvements have a separate, default-off checkbox and remain a beta preview. Neither option changes balance, map generation, vision, saves, purchases, unlocks or available unit roles.

This is an engineering beta rollout, not aesthetic approval, a default-art replacement, or full release readiness. Existing original candidate decisions are preserved. Borvak's stronger small-size color contrast remains deferred in GitHub issue #1. Further landscape polish is separate from character availability.

## Tester controls

On the start menu, the visual settings panel is immediately above **Begin Conquest**. Enable **New visuals (beta)** to try the imported characters. **Landscape improvements (beta)** can be enabled independently. During a match, the paintbrush button beside sound opens the same settings. Turn either option off to return to the original appearance without restarting or changing the match.

The choices are local to this installation. They persist in `sunder-beta-visuals-v1`, with schema version 1, separately from game saves and entitlements. Missing, malformed or unsupported-version settings default off. If storage is restricted, changes work for the current session but need not persist.

Models load only when an eligible unit is actually drawable. A new installation with both options off requests zero candidate GLBs, including when legacy development preview query parameters are present. Custom/paid costumes, boats, camp raiders, unnamed hero slots and unmodeled roles stay procedural. Completed modeled roles are available only under their existing gameplay and unlock rules.

The 46-model count covers the designed initial faction roster (Warrior, Archer, Defender, Rider, available specialists and named heroes), **not every gameplay class**. All eight tribe identities now have beta-eligible ordinary land Swordsmen: unchanged Auren, six previously eligible tribe candidates, and separately audited **Nerivane p2** in `betaAdvancedRoleRevisions.ts`. **Nerivane p1 remains held**: its immutable original/audit record in `betaAdvancedTribeVisuals.ts` is preserved, and its exact URL remains excluded from selection and cache admission. Only the new p2 can be selected for designed identity 4. **Sunwei Knight p1**, designed identity 2, is the first beta Knight pilot; all other tribes' Knights remain procedural. These two additions passed independent source, production-runtime and original-capture review but remain engineering review candidates, not owner aesthetic approval or release readiness. Selection always requires explicit New visuals and the matching designed tribe identity/ordinary role, never the numeric match seat or a cross-tribe substitute. Catapults and Colossi remain procedural and need separate art work. A Warrior's sword does not count as Swordsman coverage. See `docs/AUREN-SWORDSMAN-BETA-PILOT.md` for unchanged Auren, `docs/SUNDER-PROGRESS-ROUND-20261025.md` for build-124 history, and `docs/SUNDER-ROSTER-FAIRNESS-ROUND-20261026.md` for this round's evidence and limitations.

A separately audited neutral Great Ruin Guardian candidate is selected outside the faction roster through `betaWorldVisuals.ts`, only for flagged neutral guardians with New visuals enabled. Its canonical Swordsman combat stats remain unchanged; the battle preview names the actor Guardian. The original development-review selector continues to exclude guardians and ordinary Swordsmen; its original 46 entries and provenance are unchanged.

## Original assets and deterministic runtime derivatives

The 46 original GLBs are retained unchanged outside Git and `client/public`. The beta uses separately uploaded runtime copies with embedded textures contain-resized to a maximum edge of 512px. The process preserves geometry, vertex/index data, UVs, meshes, nodes, materials, texture references, samplers, skins and animations. It does not generate, retouch or semantically alter character art.

`betaVisualModels.ts` maps exact original storage paths to exact audited derivative paths and hashes. `betaVisualCandidate.ts` selects eligible entries without modifying the original registry or its provenance/decisions. Missing derivative entries fail closed; an original 2048px GLB is never used as a beta substitute.

External evidence workspace:

- `/home/ubuntu/sunder-art-pipeline/beta-visuals/ledger/derivative-audit.json`
- `/home/ubuntu/sunder-art-pipeline/beta-visuals/ledger/beta-visual-model-manifest.json`
- `/home/ubuntu/sunder-art-pipeline/beta-visuals/validation/independent-integrity.json`
- `/home/ubuntu/sunder-art-pipeline/beta-visuals/models/`

The independent verification reads every original/derivative pair, verifies hashes and byte lengths, compares every JSON section other than texture-buffer layout/image records, compares all non-texture bufferView bytes, verifies unchanged image semantics and decodes every embedded image to confirm its dimensions. All 46 pairs passed. Binary files, original screenshots and reusable external harnesses remain outside the source repository.

## Texture budget: estimates are not native RAM measurements

All runtime copies have three 512×512 embedded textures. The recorded conservative RGBA8 estimate, including mipmaps, is **4,194,306 bytes per model**. Five roles are about **20 MiB**; six roles are about **24 MiB**. Original five/six-role sets were approximately **240/288 MiB without mipmaps**, or **320/384 MiB including mipmaps**. All 46 derivatives together would still be about **184 MiB**, so the client does not preload the catalog.

Total encoded GLB bytes fall from 148,016,860 original bytes to 32,185,716 derivative bytes. Encoded download size and decoded texture memory are different metrics.

The beta cache enforces:

- A **64 MiB** ceiling across shared decoded template textures and estimated queued/in-flight texture reservations.
- A **16-template** count ceiling and no more than **two physical loaders** at once.
- A **15-second** deadline once a physical load starts. Timeout rejects waiting callers and fail-closes that cache instead of opening replacement loaders while old decodes continue.
- Failure memoization, no automatic retry storm and no unsafe texture eviction while clones reference templates.
- Actual decoded texture-footprint checks, independent per-unit transforms/materials and shared template texture references.

Templates remain cached for the current scene until visual rollback or scene disposal. Admission can decline new roles in a multi-tribe match; those units retain procedural bodies. Conservative per-map rounding can temporarily admit only 15 queued models under the 64 MiB ceiling; actual smaller inclusive mip counts are reconciled after decode. This is intentional fallback, not missing unit logic.

The ceiling excludes geometry, material/effect overhead, terrain, framebuffers, decoder working memory, JavaScript and WKWebView/native allocations. It is not a claim that the application uses 64 MiB total RAM or meets a measured frame-rate target.

## Rendering and rollback safety

The renderer always builds the procedural actor first, replacing its body only after a successful model attachment. Hero progression pips/crowns and veteran cues remain; imported actors also have a renderer-owned true-owner marker. Model failures never leave a blank unit. Embark/disembark changes eligibility and disposes a stale land actor before a late load can attach to a boat.

Changing the character checkbox disposes unit roots and templates and rebuilds display geometry without calling a GameStore action, saving, changing turn/seed/units, or recreating the camera/WebGL engine. An in-flight disposed cache remains retired until its physical loaders settle; rapid off/on cannot open another cache and bypass concurrency/reservation accounting. Late containers are discarded.

Landscape opt-in uses the existing world-v3 visual helpers through a separate preference gate. The original development/query gates are unchanged. Unit lanes are based only on currently drawable occupants and cannot expose hidden opponents. Terrain movement, vision and map-state data are unchanged.

## Native asset route and platform boundary

Web builds retain `/manus-storage/<audited>.glb`. Capacitor builds resolve those canonical paths to the allow-listed public proxy `https://polyclone-n6b64njm.manus.space`. The bundle contains neither signed redirect URLs nor credentials. Arbitrary hosts, absolute model inputs, traversal and query injection are rejected.

A public proxy HEAD with `Origin: capacitor://localhost` returned HTTP 307 with wildcard CORS and GET allowance. Browser tests must additionally exercise actual proxy redirects and GLB decoding. This is not physical WKWebView verification.

Capacitor sync retains `com.islandroadco.sunder`, the bundled `capacitor` scheme, `scrollEnabled: true`, `contentInset: never` and app-bound-navigation limits. Generated web bundles and sandbox-specific Package.swift changes are not committed. The existing native web-checkout restriction remains intact.

## Validation and release gates

Source TypeScript, focused preferences/mapping/cache/native-route tests, the full regression suite, production build, production default negative controls, genuine production beta gameplay/role fixtures, rollback and fallback checks must pass before publication. Validation records and unaltered captures are kept in the external workspace. Engineering role fixtures are explicitly labeled and are not misrepresented as ordinary starter rosters.

A validated source push to GitHub `main` can trigger the owner-enabled automatic signed TestFlight upload. Do not manually duplicate that upload. GitHub remains authoritative; save a WebDev checkpoint only after the source push and reconcile equal trees without force-pushing. Apple processing and internal tester distribution remain separate from GitHub success; public App Store release remains manual.

Before expanding tester use, perform a physical iPhone pass on the resulting TestFlight build: start-page scrolling and touch targets; character and landscape toggles separately; enable/disable mid-match; loaded and offline fallbacks; select/move/attack/embark; veteran and hero cues; three-turn save/resume; background/foreground; a busy multi-tribe board; and memory/thermal/frame pacing. Owner visual judgment is still required, especially small-size role contrast, city/terrain occlusion and Borvak. Software WebGL and a simulated Capacitor bridge cannot close those hardware or aesthetic gates.

## Completed software validation — 2026-10-22 UTC

- `pnpm check`: passed.
- Final full `CI=true pnpm test`: **389 tests passed in 49 files**.
- Final production web build: passed; the existing large Babylon/vendor chunk advisory remains. This is not a frame-time measurement.
- `pnpm exec cap sync ios` and final `cap copy ios`: passed. Sandbox-specific generated Package.swift changes were removed from the commit scope.
- Independent integrity verification: **46/46** original/derivative pairs passed. All 46 uploaded managed-storage redirects were also followed to HTTP 200.
- Unchanged production negative controls: two simulated-native viewports, **390×844 and 375×667**, passed onboarding, menu scrolling/touch targets, three turns, save/resume, zero candidate GLB/checkout requests, ignored legacy review queries and unavailable internal labs.
- Production opt-in harness: **20 scenarios passed, zero failures**. Eight default-off tribe identities requested zero models. All **46** beta models decoded completely in eight disclosed 5/6-role rendering fixtures, with preserved hero/veteran cues and procedural boat controls. Live checkbox rollback left game/save bytes identical, removed imported roots and made zero subsequent model requests. A deliberately blocked model kept a nonblank procedural actor. The compact settings button remained a minimum 44px target. An opt-in native-simulated match with both options enabled advanced three turns and restored identical game/save bytes after reload.
- Actual cache-derived shared texture estimates were **25,165,800 bytes** for six-role fixtures and **20,971,500 bytes** for five-role fixtures, with zero failed models and zero queued/active loads after completion. These counters are not native process RAM.

Passing evidence is in `production-default-spa/mobile-production-results.json` and `production-opt-in-attempt2/beta-gameplay-results.json` under the external workspace. Earlier harness attempts are preserved: one used a static server without SPA fallback for lab-route assertions; another failed to dismiss normal faction onboarding. Neither was an application regression. The corrected production runs passed without changing game code to accommodate the harness.

Unaltered captures show that the imported characters are visible, but dark armor and trees/cities can still reduce readability. Fog/landscape are still stylistically unfinished. The isolated role captures are engineering fixtures, not starter rosters; the three-turn board is normal gameplay. The immediate after-reload capture occurred during the intentional boot splash and is not offered as a board preview. No owner aesthetic approval or physical iPhone performance result is claimed.
