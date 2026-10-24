# Sunder AI playtesting lanes

## Purpose and safety boundary

These three reusable runners shorten player feedback loops without replacing physical iPhone testers. They are bounded, report-only checks: they do not edit the game, change rules or balance, approve art, publish releases, create GitHub issues or trigger additional TestFlight uploads. Reproducible findings are reviewed before fixes are integrated.

The gameplay lane uses existing legal AI and game scheduling. The visual lane uses ordinary menu, canvas and HUD controls rather than hidden production GameStore hooks or injected matches. The regression lane repeats the confirmed-bug tests. A reviewer then inspects original captures for visual issues that numeric assertions cannot establish.

## Run the lanes against an exact source revision

Use an isolated worktree at the source SHA under test. Keep artifacts in an absolute directory outside Git. Record whether the worktree is dirty; a pre-commit result is not an exact published-revision result.

```bash
PLAYTEST_OUT=/absolute/external/gameplay \
PLAYTEST_MATCHES=16 PLAYTEST_TURNS=30 \
pnpm exec tsx scripts/playtest-gameplay.mts

PLAYTEST_OUT=/absolute/external/regression \
node scripts/playtest-regression.mjs
```

For visual checks, first build and start the **full API-serving** production runtime, not a static SPA preview. The caller owns its lifecycle:

```bash
NODE_OPTIONS='--max-old-space-size=2048' pnpm build
PORT=5154 NODE_ENV=production node dist/index.js
```

Then run the visual lane from another terminal:

```bash
PLAYTEST_BASE=http://127.0.0.1:5154 \
PLAYTEST_OUT=/absolute/external/visual \
node scripts/playtest-visual.mjs
```

Remote targets must use HTTPS. Local HTTP is limited to loopback. When needed, set `PLAYTEST_CHROMIUM_PATH` to the installed Chromium executable. CI can use Playwright's installed browser. Use sequential WebGL contexts to avoid turning software-renderer resource pressure into false game bugs.

## Reproducibility and reviewer responsibilities

Each lane writes JSON plus human-readable evidence. Reports record source identity, seeds, action sequences, checks, findings and limits. Original screenshots are never retouched. Preserve the legitimate initial save when available for replay. Do not include signed storage redirects, cookies, authorization headers or secrets.

A failure is not automatically a game defect. Review the action log, exact UI labels, source version, API topology, shader readiness and map-specific prerequisites. Record skipped coverage explicitly instead of making a test green by removing its purpose. Conversely, a supported procedural fallback is not a crash. Auren's ordinary land Swordsman has a separate opt-in pilot; other factions' Swordsmen, Knights, Catapults and Colossi remain known art-coverage gaps. The separate neutral Guardian does not complete those roles, and the Auren pilot must not be reused across tribes.

The scripts are not an LLM that understands every scene by itself. The successful-build Trigger instructs a reviewing agent to inspect the original captures and distinguish confirmed problems from suspected or known limitations. There is no unattended source-fixing loop.

## First-pass evidence and confirmed finding

The first gameplay invocation ran 16 actual seeded matches with the existing AI and a 30-turn cap. It detected a persistent illegal overlap in seed `6707986`: two live neutral camp-raider Warriors selected `(1,2)` from one stale world-intent snapshot. Independent replay confirmed the defect at turn 12, not a dead-unit, Guardian or renderer false alarm. A narrow application-time occupancy guard now leaves the second mover in place when the first has occupied the destination. No planner, spawn count, attack path, economy or balance values were changed. A new four-case actual-GameStore regression covers competing raiders, Guardian occupancy, legal movement and normal hostile combat. The original failed report and diagnostic trace are retained externally rather than relabeled as passing.

The visual lane has completed two real phone-sized UI matches: own-unit selection/movement, city inspection, three turns and save/reload. The beta case also verified a real fruit harvest through its displayed-cost control. The default seed had no visible owned tech-and-cost-eligible harvest candidate and correctly records that as a coverage warning; zero GLB requests were verified. The first visual attempt exposed a **harness** ambiguity between the primary Babylon canvas and the minimap canvas, not a game defect; it was fixed and the original failed report retained. Final source/fix replays are recorded before publication.

All 16 original gameplay seeds were replayed after the occupancy fix with zero invariant failures. The confirmed collision no longer occurs. The focused regression lane passed all eight groups, including the separate neutral Guardian and world-movement/Guardian-name groups. Complete source validation passed 453 tests; production was rebuilt and the copied iOS web bundle matched all 13 built files byte-for-byte. These remain engineering results, not visual finality or device performance approval.

## Automatic after-build launch: connected; callback repaired

A filtered Manus webhook Trigger has been created and is ready. It accepts only JSON POST callbacks naming `mattphe23/Sunder`, `main`, and `success`; the receiving agent independently verifies the GitHub run's repository, workflow, conclusion and exact SHA before testing, and rejects replayed runs. One pass is bounded to 16 simulated matches of at most 30 turns, two UI matches, focused regressions and a 45-minute total limit. Tests are report-only.

The owner authorized GitHub browser access on October 23. The repository secret and `.github/workflows/ai-playtest-callback.yml` were installed through that authenticated session; no Apple signing secrets were changed. A single manually sent, independently verified build-120 connection callback completed the bounded three-lane pass. That proved reception and testing, **not** the workflow's automatic delivery.

The natural build-121 callback failed before any HTTP request: `EVENT_FILE: ${{ github.event_path }}` produced an empty path. On October 24, the workflow-only repair `5e8f746` removed that mapping and reads the runner-provided `GITHUB_EVENT_PATH` directly, with a fail-closed message when absent. Five dependency-free Python regressions execute the exact workflow heredoc with synthetic events and mocked HTTP; they cover the payload, repository/branch/conclusion scopes, URL validation and missing event path. The ordinary Vitest suite invokes those tests so later validated app builds repeat them.

The repair itself does not start an iOS build or repeat an upload. Hosted delivery is checked on the next already-authorized natural successful `iOS` run, not by rerunning an old publishing workflow. Inspect the callback job and Trigger history once it completes; uncertain delivery is not retried blindly. A callback acknowledgment means accepted, not that gameplay checks finished. Confirm the report's run ID and source SHA before calling the after-build path operational. The callback address remains a repository secret, not source or public issue text.

Do not use an endlessly running sandbox agent or recurring agent-polling schedule as a substitute. A timed detector would require separate approval. The build callback is the selected event-driven route.

## Remaining limits

The first pass is a bounded sample, not complete coverage of every faction, role, network state or GPU. Babylon NullEngine tests do not prove pixels. Phone-sized browser checks do not prove WKWebView behavior, touch feel, thermal behavior, total native RAM or sustained frame rate. Real iPhone beta testing remains an explicit release gate.
