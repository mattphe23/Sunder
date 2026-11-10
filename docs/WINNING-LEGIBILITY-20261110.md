# Winning legibility — 10 November 2026

## Step 1 scope

The welcome card now names three victory routes: conquest by eliminating all rival tribes through city captures, the player's own faction path, and the highest score among surviving tribes at the match's actual turn limit. The path name and board-dependent goal come from `victoryProgress`, not an assumed tribe or static target. Tutorial instructions use Tap. The first-turn level-5 reward/Colossus card is removed; city rewards and Colossus recruitment/spawning are unchanged. Existing skip/completion keys and guided actions remain.

Faction opening advice no longer quotes the obsolete four-veteran Storm Legend target or an unscaled five-city Overgrowth goal. Both point to Paths for the live goal. End-turn tutorial copy states that order changes each round rather than promising all rivals act before the next human turn.

The mobile notification rail adds a 44px Paths control. Its scrollable dialog shows the player's actual goal and every other living tribe's current/target progress. Near-victory notice is a persistent, nonmodal status on settled human turns rather than a fleeting log message. Whole-number goals warn at `max(1, floor(2 * target / 3))`: short goals round down, so a two-port path warns at one port rather than first warning at completion. Displayed percentages remain the actual fraction. Ready-but-locked paths state their unlock turn.

Production capture review confirmed that the old independently fixed world-event stack could cover the new warning. World notices now mount once in the shared rail below path/log notices, using normal flow, a bounded 16dvh scroll region and 44px dismiss controls. Map follows the stack on phones and stays right-anchored on wide screens. Existing event filtering, queue drain, four-card limit and fade timer are unchanged; the full-screen fallen-commander card remains separate.

These are deliberately public strategic counters, consistent with exposing rival progress as requested. They do not reveal coordinates, particular hidden units or additional hidden army totals beyond the actual path counter. Other human competitors are labeled Player. Panel state is local and drops on handoff/new-viewer transitions; no new save fields, gameplay/log mutations, repeated sounds or toast acknowledgements are introduced.

## Turn numbering and unchanged targets

`GameState.turn` is zero-based. The previous internal threshold 8 appeared as HUD turn 9. The new canonical threshold is **internal 11 / displayed turn 12**, checked at the start of a round. Tutorial, own-path badge and rival path status use the same constant. This delays faction-path victory only; early conquest and the score cap still work normally. Path targets, tribe statistics, AI policy, map generation and recruitment/unlock costs are unchanged.

`SUNDER_VICTORY_PATH_START_TURN` is a validated Node-only audit override, ignored in browser/window scope. It is not a query parameter, tester setting or save field. Existing game saves use the new rule when resumed; already-completed results are not reopened. No save-schema migration is needed.

## Predeclared paired audit

The comparator executed actual GameStore all-AI games on two fresh seed blocks, 96 scenarios each, covering four map presets, three difficulties and the rotated eight-tribe roster on size 11 with the existing 30-round cap. Each exact seed/configuration ran under baseline internal 8 and candidate internal 11. **384 executions represent 192 paired scenarios**, not 384 independent worlds. AI randomness was seeded; raw per-game rows, first-near observations and source/protocol hashes are retained externally.

All predeclared gates passed: both arms completed 192/192 without invariant/failure rows; no candidate path victory occurred before internal 11; mean and median end rounds did not shorten; cap increase stayed within 10 percentage points; no tribe appearance win rate fell more than 10 percentage points; and path targets/other core stayed unchanged.

- Mean end round: 21.473958 baseline → 21.583333 candidate; median 22 → 22.
- Turn-cap games: 33 → 33. Path wins: 158 → 158. Elimination wins: 1 → 1.
- Path wins before internal 11: **9 → 0**. Nine paired scenarios ended later; 183 were unchanged; none ended sooner.
- Every paired winner and ending reason was unchanged. Each tribe had 96 appearances in each arm; wins were unchanged: Auren 23, Kharzul 28, Sunwei 24, Vessari 29, Nerivane 18, Dravok 27, Valkyra 26, Mycelon 17.

Global first-near telemetry found two or more round-index lead in 151/158 candidate path wins, one in seven and none missing. A stricter measure excludes the partial warning round: **seven candidate path wins still had zero completed full-round lead**. Progress can jump, and this all-AI telemetry is not proof that a human always gets one or two response turns. No human enjoyment or balance-cause conclusion is inferred.

Static campaign review found no mandatory path-only objective and no par below the new internal threshold. It is not a campaign playthrough. Size-11/30-round audit results do not certify every custom size, roster or turn limit.

## Validation and ordered follow-up

Focused tests cover the new canonical unlock boundary, invalid/ignored audit overrides, early conquest, tutorial copy for designed/custom tribes and actual goals, warning thresholds, dead rivals, public-counter/viewer rules and handoffs. One existing synthetic victory fixture is moved from hardcoded round 10 to the imported canonical unlock threshold so it continues testing an eligible victory. A minimal HUD-render fixture without a roster safely declines the new Paths control rather than crashing.

TypeScript, full tests, bounded production build, full API-serving mobile browser controls/captures, panel save-byte equivalence, native-copy parity and independent source review must pass before GitHub publication. Default-off imported visuals, bounded fallback, development-only naval and disconnected online authority remain unchanged. Hardware iPhone touch/RAM/thermal/resume results are not established by these software checks.

Next in the owner's fix order: physical phone full match; then a separately scoped starter mode; then exact external TestFlight group/invitation and public-community post review; then observe five consenting first sessions and record the quit turn. This change does not open a group, post publicly, collect tester telemetry or configure automation.

External evidence: `/home/ubuntu/sunder-team/winning-legibility-20261110/`. Large raw saves, audit results and unaltered screenshots stay outside Git and `client/public`.
