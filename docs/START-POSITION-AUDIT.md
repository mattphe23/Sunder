# Start-position access audit tooling — frozen R2

## Completed status

R2 completed **512/512** all-AI games on **128 fresh independent seed/preset worlds**, with four cyclic roster-seat rotations per world. All clusters were fully verified; 128 nonempty unique terrain/full-layout fingerprints, zero cross-world duplicates and zero failed/incomplete rows were recorded. R1 remains separately frozen and unrun. The earlier 32-world audit is not pooled with R2.

The final machine disposition is **INCONCLUSIVE**, not a balance recommendation. The runner intentionally sets exit code 1 after writing complete artifacts for an inconclusive result. It is not an interrupted simulation. No gameplay, AI, rules, stars, map generation, online, naval, save-format or tribe-stat change is made by this CLI-only tooling.

## Exact external authority and source

The immutable external protocol is `/home/ubuntu/sunder-team/roster-fairness-20261025/fairness/START-POSITION-AUDIT-PROTOCOL-R2.json`, SHA-256 `67ca15163fb58eadbfa7ffc27ec4a50adcc47ce4b85adddb94795eec6fbfe17f`. Its human-readable companion is `fairness/PROTOCOL-R2.md`. The independent premeasurement review is `review/FAIRNESS-R2-REVIEW.md` and accepted strictly descriptive evidence gathering, not causal or rule-change claims.

The measured game baseline was `1db1a102cb361ec0bf0a8579833fdbc7e3eaf94b`. The retained outcome-relevant tooling hashes are:

- R2 runner: `24c239659b461bfc714738283f375c30dcebb12e62e889d007261cb287de23cb`.
- R2 library: `eaae285f27fb3cb0bfd40ae2a717a93ca6c9a2eac210427fffa9d3eded548ba2`.
- Reused R1 graph library: `540530a7cbfcfd322f5e5f6e1bdfdfb7027e75cae5654c655d076c419670f55d`.

The source manifest additionally records shipped AI/rules/state/types/mapgen, scoped RNG and paired-audit dependency, Node executable/version/platform/architecture and package/lockfile identity. This source commit preserves the reviewed tooling; it does not mean R2 observed a game build containing these later documentation/visual changes.

## Single-use gate: do not rerun this sample

`start-position-audit-r2.mts` requires the explicit post-review `START_POSITION_AUDIT_APPROVED=approved-by-parent` gate, exact frozen protocol digest, exact baseline HEAD, exact approved dirty-path allowlist, complete source hashes and the exact nonexisting external output directory before generating any observed evidence. Without approval it exits before constructing a frozen game. Existing output is refused. **The R2 output now exists: do not replay, append, selectively rerun, replace failed rows or change covariates.** Any new measurement requires another separately versioned protocol, output location and independent review.

Safe tooling checks are the focused `server/start-position-audit.test.ts` suite and TypeScript checking. Synthetic analysis tests and the excluded generated-state seed 7,300,001 are not R2 observations. Tests of schedule balance must not construct games from frozen R1/R2 seeds.

## Frozen design and measurements

The 128 worlds comprise 64 Continents and 64 Archipelago 13×13 legacy-default worlds. A predeclared SHA-256 counter selects globally unique seeds outside previous observed and R1 blocks without consulting any board, metric or outcome. Four mixed rosters are assigned evenly before game construction; each world has four cyclic roster-seat rotations. The scoped AI random stream is reset to the world seed before each match. Actual `turnOrder` is recorded separately from nominal capital/starting-star seat.

The graph uses shipped `reachableTiles` for first-turn endpoints and every directed full-turn edge, preserving initial terrain, technology, passive, unit type, blockers, ports and storms. Targets are neutral villages and legal unoccupied approach tiles adjacent to opponent capitals. Manhattan distance is only a geometric comparator; an unreachable legal distance remains null, never imputed. These frozen-initial-state single-unit graph diagnostics do not model later discovery, research, captures, cooperation, combat or future game state.

Every declared physical/map/access/chokepoint metric is materialized separately with finite/null denominators, per-world cluster means, raw-row pointers, target/inaccessible totals, standardized nominal-seat and opening-position predictions and pairwise contrasts. Failure stages use null unavailable fields before all-AI initialization rather than stale singleton state. User-loadable human-seat-zero initial saves are retained separately from non-user-loadable all-AI snapshots.

## Bootstrap, confounding and mandatory inconclusive result

Primary descriptive outcome/physical models include nominal seat, actual opening position, preset, roster family and tribe-definition indicators. Whole-world-cluster percentile bootstraps use 10,000 deterministic draws, seed 441010, shared per-cluster sufficient statistics and multiple right-hand-side solves. Singular point fits or any singular replicate null that analysis's CIs and retain exact invalid counts; no invalid replicate is silently discarded.

The frozen capability/affordability model also conditions on initial stars, initial technology signature, passive and harvest cost, without tribe-definition indicators. Shipped all-AI setup already initializes `5 + nominalSeat`, then immediately awards fixed capital/normal-AI income to the realized opener. Initial stars are deterministically encoded by seat/opener status; technology/passive and passive/harvest-cost covariates are also redundant. The full capability design is structurally singular. R2 retains it unchanged: **0/10,000** identified capability fits and null CIs mechanically require **INCONCLUSIVE**. Primary descriptive bootstraps were **10,000/10,000** identified. No observed association identifies the cause of fairness differences or authorizes a gameplay fix.

## Evidence and native-unit erratum

The completed external output is `/home/ubuntu/sunder-team/roster-fairness-20261025/fairness/observed-start-position-audit-r2/`: frozen matrix, append-only raw NDJSON, JSON/CSV records, legal initial saves, all-AI snapshots, source manifest and report. `review/FAIRNESS-FINDINGS.md` and its JSON companion independently verify coverage and synthesize results.

**Display-only erratum:** the frozen Markdown formatter applies percentage notation to resource/count/tile/hop contrasts. The machine JSON keeps correct native-unit estimates. The independent synthesis reports these metrics in resources, tiles or legal full-turn hops, and win contrasts in percentage points. Original artifacts are preserved; no data, calculation, bootstrap or disposition was changed. Do not interpret a −20.68% fruit display as a relative percentage effect: the underlying estimate is approximately −0.2068 fruit resources.

The CLI-only scripts are not scheduled automatically or imported by production routes. This round does not change the operational after-TestFlight trigger. A future causal investigation needs a separately preregistered blocked study independently varying seat labels, starting-star assignment and opening actor/income timing while holding worlds/placements fixed.
