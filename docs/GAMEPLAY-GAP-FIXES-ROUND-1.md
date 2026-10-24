# Gameplay gap fixes — round 1

24 October 2026. This is the first narrow implementation round following the Polytopia comparison, not completion of the feature roadmap or a claim that Sunder is better balanced than Polytopia.

## Implemented changes

### 1. Honest difficulty descriptions

The start menu no longer describes Impossible as having no resource bonuses or promises a specialised threat-map AI that is not currently active. Each tier describes the actual configured income adjustment and states that all difficulties currently use the same tactical AI. The description reads the same exported `AI_INCOME_BONUS` settings used by gameplay; with the current defaults, Impossible receives **+3 stars each turn**.

This is a transparency fix, not a stronger AI implementation. AI routing and income values are unchanged. The controls have selected-state semantics and the selected description is announced through an aria-live region.

### 2. Tidecaller shallow-water movement repair

The movement rules already allowed Tidecallers to swim shallow water without a port, but the accepted move then converted them to non-attacking transport boats. That contradicted their existing unit description and dash/water-strike abilities.

A legal move onto shallow `water` now keeps a Tidecaller in its normal form (`boat: false`), preserving its existing dash attack and **+30% water-origin attack modifier**. Ordinary port transport remains non-attacking. A non-boat Tidecaller still cannot enter `ocean`; this repair does not add ocean travel or a new naval roster.

Existing saves are not rewritten on load. A legacy Tidecaller already marked as a boat is corrected on its next legal shallow-water move; undo restores the pre-move boat state. Existing Navigation-gated ocean behavior for legacy embarked units is retained. Unit stats, costs, passives, AI code and save schema are unchanged.

### 3. A narrower online read boundary

An authenticated nonmember reading an open invitation receives only allowlisted invite metadata and `state: null`. The server does not retrieve a snapshot for that request. The response omits the map seed, player IDs, turn/result information, timestamps and hidden game state. Nonmembers cannot read active, finished or abandoned matches, or poll status in any state.

Members retain the existing full snapshot response. Invitation preview, post-join entry and member resume retain their existing flow, with minimal client guards preventing a metadata-only response from being treated as a playable match.

**This does not make online play server-authoritative or suitable for trustworthy ranked competition.** Members still receive raw snapshots. Client-submitted state/results and nontransactional join/turn sequencing retain their existing trust and race limitations.

### 4. Reproducible balance tooling

`balance-paired.mts` and `scripts/lib/balancePaired.ts` add a report-only audit. For each seed and map preset, four cyclic roster assignments put every tribe in its four-player family into each nominal seat. Actual opening-turn position is recorded separately. RNG, timer queue and in-memory storage instrumentation are scoped to the test process and restored on exit; this tooling is not imported into gameplay.

The repeated regression lane now includes difficulty disclosure, paired-audit helper, Tidecaller movement and online-read access tests.

## Before/after observations

The real GameStore and AI were observed in **160 baseline matches and the identical 160 configurations after the Tidecaller repair**. Both runs completed all matches with zero recorded invariant-failure rows. Six configurations changed winner.

The matrix contains ten seeds, continents and archipelago, two fixed four-tribe families, four seat rotations, normal difficulty, 11×11 boards and a 30-turn cap. Rotated observations from the same seed are correlated, and the families do not cover every cross-tribe matchup. These observations are not a global ranking or proof of human balance.

| Tribe | Appearances per run | Wins before | Wins after | Archipelago wins before/after |
|---|---:|---:|---:|---:|
| Auren | 80 | 17 | 17 | 8 / 8 |
| Kharzul | 80 | 19 | 19 | 11 / 11 |
| Sunwei | 80 | 18 | 18 | 7 / 7 |
| Vessari | 80 | 26 | 26 | 14 / 14 |
| Nerivane | 80 | 27 | 25 | 15 / 13 |
| Dravok | 80 | 15 | 17 | 9 / 10 |
| Valkyra | 80 | 23 | 22 | 10 / 10 |
| Mycelon | 80 | 15 | 16 | 6 / 7 |

The low nominal-seat result warrants a larger starting-layout audit: seat 2 won 14 baseline matches versus 53, 54 and 39 in the other seats; after the fix it won 20 versus 52, 51 and 37. Nominal map seat is not opening turn position. This is a signal to investigate map placement and seed sampling, not justification for an immediate faction buff or a conclusion that star compensation failed.

No faction balance values were tuned in this round.

## Engineering validation

- TypeScript no-emit check, focused regression suites and full production build passed.
- Final full regression suite: **67 files / 498 tests passed**, including the additional anonymous-status and abandoned-match assertions. The expanded repeated regression lane also passed.
- Seven Tidecaller movement regressions cover swimming, returning to land, dash attack/modifier, ordinary transports, ocean locks, legacy state and undo. Three targeted cases failed against an isolated copy of the old source, confirming a real regression rather than only a new expectation.
- Three-user mocked-DB router callers cover anonymous, host, guest and outsider access, metadata-only invitations, snapshot non-read, membership denial and unchanged member snapshots. Anonymous status and abandoned-match denial are covered explicitly.
- A separate production-client UI contract check passed for the limited invitation banner, guest acceptance/post-join entry and host resume. It used mocked tRPC identities/responses and a lawful unplayed GameStore snapshot, with no real account/DB mutations. It is not a two-device authenticated multiplayer E2E test.
- Final full-production API probe returned JSON, rather than a static preview fallback.
- Real production menu checks at 393px and 320px verified truthful descriptions, 44px targets, preserved saves and zero default GLB requests.
- Two ordinary UI-driven phone matches exercised movement, city inspection, three turns and save/reload, with default and opt-in visuals. Harvest was verified in the beta case; the default seed lacked an eligible visible resource, so default harvest coverage is limited rather than reported as a failure or fabricated success.
- A disclosed development fixture exercised the real `moveUnit` action and Babylon renderer: Tidecaller swimming remained attack-capable with the water modifier, and toggling beta characters off preserved state/save while restoring procedural rendering. Camera centering was corrected by recapturing the real scene; screenshot pixels were not edited.
- Unchanged default-production/review-route controls passed. No art assets, imported-model registry, renderer source, native safe-area settings or beta-default behavior changed.
- Capacitor web copy matched all **13 production web files** byte-for-byte in the local iOS bundle. This is not a signed-build or physical-device memory result.
- Independent source review found no blocker in this narrow scope. It does not approve wider multiplayer security, naval scope, AI strength, aesthetics or physical-device readiness.

Original captures, raw JSON/CSV observations, comparison scripts, source hashes and reports are external to Git under `/home/ubuntu/sunder-team/gameplay-gaps-20261024/`. No GLBs, screenshots or save fixtures are added to the repository.

## Deployment boundary

The usual delivery remains GitHub-first, then a reversible WebDev checkpoint. A validated main push can trigger the owner-enabled signed TestFlight workflow; do not start a duplicate upload.

**An iOS upload is not deployment of the hosted Express/tRPC server.** The online access guard must be published to the hosted backend through the WebDev publish flow before it can be considered live there. A local production test, GitHub commit or checkpoint alone does not prove that the hosted endpoint is running the new guard. Keep source, uploaded native build, hosted backend and Apple processing/distribution status distinct.

## Next implementation priorities

1. Broaden the layout/seat audit with independent seeds and roster combinations before tuning tribe balance. Pair it with human play and late-game decision/pacing evidence.
2. Define validated online player actions and private-state policy, then implement server-derived results and atomic join/turn conflict handling. Do this before ranked matchmaking or competitive claims.
3. Prototype a small, clearly differentiated naval combat layer separately, with explicit counters and save compatibility. The Tidecaller repair is not a substitute for naval combat.
4. Improve tactical AI through measured changes rather than reactivating the parked specialised brain or simply increasing income.
5. Continue newcomer tests of passive/counterplay explanations and busy-board actions. Existing battle modifiers already disclose the Tidecaller water bonus; clarity still needs player evidence.

Procedural characters and terrain remain the default. Imported review candidates and landscape improvements remain reversible opt-ins. No aesthetic approval, default visual replacement, public App Store release or full launch readiness is claimed.
