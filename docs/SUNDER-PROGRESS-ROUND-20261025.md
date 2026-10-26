# Sunder progress round — 25 October 2026

This is the build-124 historical record. The subsequent controlled roster/fairness round is documented in `docs/SUNDER-ROSTER-FAIRNESS-ROUND-20261026.md`, including Nerivane p2, the Sunwei Knight pilot and the separate 128-world diagnostic. Historical Nerivane p1 holds and earlier sample counts below remain unchanged.

## Scope

This round follows the owner’s authorization to advance the remaining Swordsmen, investigate fairness and AI weaknesses, prototype naval counterplay, and build a safer online foundation. It deliberately distinguishes beta visual availability, development experiments, disconnected server work, and held candidates. It is not full release readiness or aesthetic approval.

## Hosted backend

The owner published the existing build-123 checkpoint. A fresh hosted probe returned an HTTP 200 JSON response from the production API. This closes the publication step for the previously shipped member-only match-read guard; it does not prove two-device multiplayer correctness or activate the new private authority experiment.

## Ordinary Swordsmen: eight independent tribe identities

The existing Auren Swordsman is unchanged. Kharzul, Sunwei, Vessari, Nerivane, Dravok, Valkyra and Mycelon each receive a separately sourced ordinary land Swordsman candidate. No recolored Auren model is substituted. The original 46-entry initial roster, its development review mapping, its runtime derivative map, existing heroes and original provenance remain unchanged.

Six new candidates passed independent original-capture review for controlled beta use. Nerivane p1 remains **HOLD**: shader-ready ordinary production captures from normal and reverse camera angles confirm insufficient internal contrast. Its immutable model/audit record remains, but the runtime selector and exact-URL cache admission exclude it. Thus seven tribe Swordsmen are eligible including unchanged Auren; Nerivane stays procedural without a cross-tribe substitute. Beta candidacy is not final owner approval; small-scale role differentiation remains a shared polish concern.

`betaAdvancedTribeVisuals.ts` contains only exact audited managed-storage paths, hashes and measured counts. `betaAdvancedVisuals.ts` selects by the designed tribe definition, not the match seat. **New visuals remains explicitly opt-in and default off.** Guardians, heroes, raiders, costumes, boats and unmodeled roles remain excluded from this ordinary Swordsman selector. The neutral Guardian stays in its separate world-visual selector.

Every original GLB remains immutable externally. Runtime copies only downscale/reencode embedded textures to a maximum edge of 512px; independent audits compare non-texture bytes and relevant JSON structure, including geometry, UVs, nodes and material semantics. No geometry is regenerated or decimated after modeling.

| Candidate | Actual triangles | Actual vertices | Encoded runtime bytes | Conservative texture bytes, including mipmaps |
| --- | ---: | ---: | ---: | ---: |
| Kharzul | 5,015 | 7,330 | 770,868 | 4,194,306 |
| Sunwei | 4,954 | 3,760 | 564,096 | 4,194,306 |
| Vessari | 5,148 | 7,471 | 751,988 | 4,194,306 |
| Nerivane | 4,289 | 6,020 | 665,400 | 4,194,306 |
| Dravok | 4,966 | 6,786 | 751,264 | 4,194,306 |
| Valkyra | 4,907 | 6,844 | 779,900 | 4,194,306 |
| Mycelon | 5,253 | 7,388 | 663,492 | 4,194,306 |

The generation request retained a 5,000-triangle target. The three modest provider overshoots are recorded honestly under a separately reviewed, explicit 5,500-triangle acceptance ceiling, not misreported as meeting the request. Each new model has one primitive and one material. The ordinary renderer’s cache limits remain **64 MiB estimated/shared texture admission, 16 templates, two physical loaders, 15-second load deadline**, with procedural fallback; this is not a total-RAM claim. No catalog preloading is added.

Knights, Catapults and Colossi still need their own visual work. A Warrior carrying a sword does not count as Swordsman coverage. All new decisions remain `review-candidate`; only the owner approves aesthetics.

## Fairness: evidence before changing rules

The new `fairness-audit.mts` runner completed **512 bounded all-AI matches**, using 16 seeds, two map presets, four rosters and four cyclic nominal-seat rotations. These represent **32 independent seed/preset worlds**, not 512 independent maps. Legitimate initial saves and exact all-AI initial states are retained separately.

The sample’s nominal-seat win rates were 35.5%, 29.7%, 13.3% and 21.5%. Actual opening-order positions produced a different pattern: 20.3%, 21.3%, 28.5% and 29.9%. Initial resource/terrain and legal expansion access are recorded separately. This confirms that nominal placement and opening order must not be conflated. It is a triage signal for map placement/path access, not a sufficient basis to buff a tribe or alter staggered stars.

No map-balancing rule, stat, AI income or existing opening-star compensation is changed by this audit tooling. Next work should use a frozen, predeclared independent-map sample and isolate placement/path accessibility before selecting a fairness change.

## AI: held rather than claiming an improvement

Two isolated tactical candidates were evaluated. The narrower second candidate corrected a reproducible missed visible post-move kill and passed its focused legality/visibility test. Its frozen mixed-policy 160-match screen, however, returned only **81 candidate wins versus 79 baseline wins**, a negative mean score difference overall and an adverse Hard slice. Position/faction confounding was substantial.

The candidate therefore remains **HOLD**, and production `ai.ts` is byte-identical to build 123. A locally correct tactic is not proof of a stronger global opponent. Further AI work needs a better isolated policy comparison, not repeated tuning against the same completed matrix.

## Naval: development-only Wakecutter experiment

The new ruleset is considered only with a real development build, `devgame` and `naval-mvp=1`. Production query parameters do not activate it. It explores a small Navigation/friendly-port refit of an ordinary passenger into a water-combat Wakecutter while preserving health, veterancy and passenger identity. Water-only attacks, storm restrictions, scuttling on landing and undo/legacy transport compatibility are bounded by tests.

Preview saves are explicitly marked and cannot replace a healthy ordinary match through the normal load boundary. Existing vessel-less transport behavior remains the default. No boats, skins or ordinary production stats are silently upgraded. This is a counterplay prototype, not tester-facing naval release, final naval balance or parity with Polytopia’s fleet system.

## Online authority: disconnected internal foundation

The reviewed `server/onlineAuthority.ts` is a request-local, effects-disabled experiment. It validates proposed actions against its private checkpoint and returns opaque reference errors/projection data. Experimental deterministic generation is explicitly versioned; legacy defaults remain unchanged and an effectful ordinary store cannot opt into the experimental generation mode.

No router, authentication/transport handler, database schema, persisted match, matchmaking UI or live action protocol activates it. Ordinary member-only match reads remain as previously shipped. The public client-authored snapshot protocol is **not** described as cheat-resistant or server-authoritative.

Persistent canonical checkpoints, atomic sequence/action handling, full action parity, authenticated transport, fog-projection tests, compatibility/migration strategy and real two-device testing remain gates before any public online activation. Ranked matchmaking and turn clocks should follow those gates, not precede them.

## Validation and rollout

At the final source freeze, TypeScript passed and the full suite passed **535 tests in 71 files**, including the explicit Nerivane hold. The expanded repeated-regression runner passed 11 groups before that final hold addition, including fairness, development naval, private authority and advanced-role admission/eligibility. The final Vite/esbuild production bundle completed with a bounded Node heap. Protected AI and initial-model files remained baseline-equal.

All seven candidates passed real decoder, live rollback and measured 40-CSS-pixel engineering checks; those tests establish rendering, not small-scale aesthetic acceptance. Seven lawful recruitment/save production checks also passed before the explicit Nerivane release hold, including opt-in, reload and forced fallback. The representative native blocked-path check passed after correcting only external redirect telemetry. Original-capture review cleared six candidates for beta and held Nerivane.

Final full-production API and default/review-boundary controls passed. The hold-specific ordinary-production check made **zero held-Nerivane GLB requests**, retained a visible procedural actor, preserved save bytes and recorded no page errors. Both normal three-turn UI matches passed movement, city inspection and save/resume; beta harvesting also passed. The default seed had no eligible harvesting opportunity, so that coverage warning is retained. These are working-tree validations, not a claim that the raw runner's baseline SHA alone identifies the uncommitted source.

The development naval renderer tests passed; corrected full-production controls independently confirmed that preview-looking queries expose no Wakecutter and that a legacy vessel-less transport resumes with ordinary transport restrictions. The first external control attempt lacked menu scrolling and asserted stale transport wording; its failure remains preserved and is not relabeled as a pass. Final native copy parity checked **13 web files with zero mismatches**. No generated native package paths or binaries are committed.

GitHub-first publication follows these completed gates. Validated main changes may automatically upload a TestFlight build through the owner-enabled workflow; no duplicate manual upload or public App Store release is authorized. Apple processing and physical-iPhone frame time, total memory and visual approval remain distinct checks.

## External evidence

Round root: `/home/ubuntu/sunder-team/round-20261025/`. Audits, immutable masters, runtime binaries, screenshots, action/save ledgers, held AI sources and external browser scripts remain outside Git and `client/public`.

- `art/AUDITED-RUNTIME-REGISTRY.json` and per-tribe `AUDIT.json`: source hashes, exact geometry counts and texture derivative integrity.
- `reports/fairness/REPORT.md`: actual frozen fairness sample and its limitations.
- `reports/ai-r2/REPORT.md`: held mixed-policy evaluation and preserved raw action/initial-state evidence.
- `reports/online-r2/INDEPENDENT-REVIEW.md`: private-foundation acceptance with public activation still blocked.
- `integration/INDEPENDENT-SOURCE-REVIEW.md`: merged-source review and unchanged protected boundaries.
- `qa/`: disclosed renderer fixtures, lawful recruitment saves and original production captures.
