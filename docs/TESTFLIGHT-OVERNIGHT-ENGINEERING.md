# Sunder — overnight engineering handoff

20 October 2026. Baseline: `c88b2d131c5d234749e5f38cab4048a25a3aa67a`. The scope was safe engineering work and first-pass submission, tester-invitation and visual-promotion preparation while the owner was away. No Apple account change, tester invitation, public link, review submission, paid Scenario job or new signed upload was performed.

## The build distinction

**Apple build 1.0 (104) is unchanged.** GitHub run [39356509491](https://github.com/mattphe23/Sunder/actions/runs/39356509491) successfully archived, exported, validated and uploaded that approved baseline. An independent read-only inspection of its retained IPA confirmed the bundled Capacitor shell, privacy manifest and linked Filesystem/Share plugins. This proves packaging and upload, not successful Apple processing, installation, WKWebView launch or native sharing.

The fixes below are a **new source revision**, not a retroactive update to build 104. A separately approved future signed build/upload is needed to put them into TestFlight. Existing art review decisions, ordinary procedural visuals, landscape defaults, bundle ID and native iOS checkout suppression remain unchanged.

## Fixed regressions

### Old saves remain usable beyond a later turn

Older `polyforge-save-v1` snapshots can predate required `stats`, `scoreHistory`, roster `defIndex` or shuffled-turn metadata. The baseline accepted them and could then throw during a round hook. One shared conservative normalizer now handles local Continue and online-snapshot loading, rejects structurally malformed input before replacing healthy state, retains recorded metrics and backfills missing counters/turn metadata.

Missing history is not reconstructed. After a migrated game records a new round, JSON encodes its unrecorded sparse rounds as nulls; normalization restores those holes so subsequent resumes work and the existing score chart skips the unrecorded rounds rather than inventing old zero scores. The regression includes a second resume after the new round.

This is structural migration for known missing fields, not a comprehensive semantic validator or reconstruction of past play.

### Old AI timers cannot play a replacement match

AI scheduling now captures the exact state object, tribe and non-persisted epoch. Transitions through new game, Continue, online restore, menu, save-slot selection and next tribe invalidate earlier work. Before running, the callback also verifies the current phase, state identity, tribe, AI status and survival. Valid current AI turns retain the existing delay and advance normally; stale work cannot play a replacement human turn or write into another slot.

### Consumed world-event cards stay consumed

Draining the local world-event queue now saves the empty queue directly. It does not emit a changed event and recursively trigger the UI delivery effect. Resuming the save therefore does not redeliver those consumed cards. This preserves the existing consume-on-presentation semantics; it is not a new acknowledgement workflow.

### All imported-model studies stay out of production gameplay

The legacy Nerivane flags (`p2-warrior`, `p2-archer`, `p2-defender`, `p2-rider`, `p2-rider-v2`, `p2-tidecaller`, `p2-nereth`) previously checked only the query value. They now use the same development + `devgame` + exact opt-in boundary as the newer studies, with a typed pure helper. Auren's flag follows the same helper. Cross-tribe and landscape gates were already development-only and remain so.

Internal `/model-lab` and `/playtest-lab` routes are also development-only. They return the normal not-found page in the production bundle; the development routes remain available. No model was promoted, no candidate asset changed, and ordinary matches remain procedural.

## Validation performed

| Check | Result |
|---|---|
| TypeScript `pnpm check` | Passed |
| Complete `CI=true pnpm test` | **40 files, 336 tests passed** |
| New save/restore regression suite | 10 tests: legacy local/online migration, preserved metrics, malformed restore, stale-AI transitions, valid AI progression, event consumption and terminal-save removal |
| New imported-preview gate suite | 9 tests covering all eight flags and all-flags production exclusion |
| Production client/server build | Passed with `NODE_OPTIONS=--max-old-space-size=2048`; existing large-chunk advisory remains |
| Whitespace `git diff --check` | Passed |
| Production mobile bundle smoke | Both **390×844 Nerivane** and **375×667 Auren** passed |

The production smoke used real compiled `dist/public`, a temporary local static SPA server, Chromium touch emulation and a simulated Capacitor iOS bridge. External APIs, fonts, analytics and managed storage were deliberately unavailable. It did not use the WebDev backend or the development game-state API.

In each phone-sized case, the harness started from the real menu despite injected `devgame`, cross-tribe, landscape and **all legacy P2 query flags**. It exercised first-run tutorial dismissal, the Research panel, three turn advances and a reload/Continue path. Stored seed, turn, units and tribes matched after restoration. There was no horizontal menu/runtime overflow, no browser runtime error, no checkout request, **no GLB request and zero imported-preview nodes**. The Nerivane case specifically exercised a matching legacy tribe/unit path rather than relying only on an unrelated Auren scene. Production lab-route negative controls also passed.

These are browser and headless engine facts. There is **no physical-iPhone/WKWebView, simulator, frame-rate, late-game memory or native-share claim**.

## Reproducibility and external evidence

The reusable production smoke script is retained outside Git at:

`/home/ubuntu/sunder-art-pipeline/ios-smoke/overnight-2026-10-20/mobile-production-smoke.mjs`

Run it against a freshly built bundle served on `127.0.0.1:4173`, or supply `SMOKE_BASE`. `SMOKE_OUT` selects a new evidence directory. Its final result JSON and genuine screenshots are in the `after/` subdirectory of that external workspace; the earlier baseline evidence is preserved separately.

Read-only save and native-packaging audit reports, initial reproducers and full terminal validation logs are retained externally. No IPA, certificate, profile, private key, GLB, screenshot, or other media is part of this source change. The temporary static test server is stopped after validation; the managed development server is not altered.

## Still open before a wider release

1. **Physical install and interrupted play.** Check build 104's Apple processing/compliance state and install it internally. Verify cold airplane-mode launch, move/attack controls, backgrounding during AI and city/perk selection, force-close/Continue, safe areas, rotation and native share on an iPhone. Most completed actions already synchronously save, but a native lifecycle checkpoint hook was not added or validated.
2. **Native network and asset contract.** The IPA contains its local shell but not `/manus-storage/` art/audio/GLBs. Brand/procedural fallbacks worked with services blocked in browser tests; cold native artwork/music completeness and online/account features remain separate tests. Keep binaries out of `client/public` unless a deliberately designed native packaging mechanism is approved. Do not claim that the existing web storage proxy is an offline native asset cache.
3. **App-bound navigation.** `limitsNavigationsToAppBoundDomains` is enabled without a tracked domain declaration. This audit did not demonstrate a runtime failure. Do not add guessed domains or remove the setting without observing actual WKWebView startup, login and online navigation behavior.
4. **Commerce enforcement scope.** Native iOS purchase UI remains hidden, and the browser regression made zero checkout calls. The shared web checkout backend does not implement an independently verified native-channel rejection. A client-supplied platform header is not a trusted enforcement boundary; resolve the intended server/native contract before claiming one. No Stripe or product behavior was changed overnight.
5. **Disclosure and distribution.** Confirm the monitored feedback/support route, accepted public app name, real data practices, age-rating facts, export answers and exact recipients. Do not invite arbitrary friends as App Store Connect users or publish a public beta link by default.

The companion [submission, tester and visual first-pass plan](TESTFLIGHT-SUBMISSION-FIRST-PASS.md) contains current official Apple sources, draft beta copy and the proposed internal-first invitation sequence. It recommends a separately approved **landscape-first internal visual build**, followed by a limited character rollout with native asset/fallback/memory tests. It does not treat art-direction approval as production-runtime approval. Borvak's contrast polish remains deferred in [issue #1](https://github.com/mattphe23/Sunder/issues/1).

Older enrollment-era readiness notes contain historical advice and should not override current Apple documentation or accountable privacy/trader decisions. Organization membership and the bundle identifier are already established; no enrollment, agreement, tax or trader filing is performed by this handoff.
