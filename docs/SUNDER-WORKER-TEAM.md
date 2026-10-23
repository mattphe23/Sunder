# Sunder coordinated worker team

## Operating model

This team consists of bounded workers launched inside the current Manus task, not saved Cue identities or always-on agents. The coordinator assigns work, collects evidence, resolves conflicts and owns the only integration/release path. There are no recurring schedules or detached agent polling loops.

Round 1 starts from authoritative GitHub commit `7b4edbaacf2ac296b63e04178ac44ec0505feb0b`, which produced the successful automatic TestFlight build 112. Each worker has an independent Git worktree and branch. Runtime assignment/job records and all visual evidence remain external under `/home/ubuntu/sunder-team/round-1/`.

## Roles and first assignments

| Role | First bounded assignment | Expected handoff |
| --- | --- | --- |
| QA & stability | Independently examine real game controls, save/resume, beta character/landscape toggles, fallback and mobile-layout edge cases on the build-112 source. Prioritize reproducible problems rather than repeating every passing audit. | Severity-ranked findings, reproducible steps, test evidence, limitations and focused regression tests where justified. No independent application fixes. |
| Character refinement | Diagnose why the current Auren commander is less legible than its warrior. Separate lighting/terrain occlusion from actual model silhouette/contrast. Produce a small review candidate addressing the confirmed issue without changing the warrior. | Unaltered authentic rendering comparisons, a precise model-revision brief if needed, and an isolated visual-only patch only when supported by the evidence. |
| Landscape readability | Improve unit clearance from forests/cities in the opt-in landscape. Preserve terrain identity, fog concealment, connected terrain and world-v3 seam/mist improvements. | A small optional-landscape-only patch, focused tests and genuine before/after rendering evidence. |
| Gameplay analyst — standby | No initial balance changes. Activate later for an explicitly assigned balance/pacing assessment with reproducible seed batches. | Measured proposals rather than automatic rule changes. |
| Coordinator / integrator | Prioritize, review, validate combinations, integrate exact scopes, push GitHub first and then checkpoint. | One clear source/build status and owner review requests for aesthetics. |

## Non-negotiable boundaries

Workers may edit only their assigned worktree and evidence directory. They must not modify the coordinator's checkout, another worker's files, shared original assets, repository history, signing credentials or project configuration. In round 1, QA alone performs browser operations; the character and environment workers perform source/model analysis and prepare candidates, then the coordinator validates their rendering sequentially. Later concurrent browser assignments require isolated sandboxes, never a shared stateful browser. Any private preview server must use its assigned port, be readiness-checked and be stopped after evidence collection.

Workers do not commit, merge, push, publish, trigger iOS uploads, perform Apple account actions, create further agents or start recurring automation. A handoff is a patch/report, not an independently released feature. The coordinator may continuously push fully validated changes under the owner's existing authorization; partial or unvalidated work is not pushed.

All character models remain review candidates. Only the owner approves aesthetics. Immutable source art, native masters, GLBs, derivative files and screenshots stay outside Git and `client/public`. Do not overwrite provenance or use original high-texture GLBs as a mobile fallback. No paid rigging, model generation, Scenario calls or other new paid-provider work is included in this initial launch.

New characters and landscape remain explicit, reversible, default-off beta settings. Procedural characters remain the default and failure fallback. No changes to rules, balance, saves, purchases, unlocks or fog knowledge are permitted in the visual workstreams. Preserve the strict development review gates independently of beta settings, the audited 512px runtime derivatives, canonical storage allow-list, cache budgets/concurrency/timeouts and safe disposal.

## Acceptance and integration

A useful finding includes expected versus actual behavior, reproduction steps, source commit, authentic evidence and its limitations. Do not confuse an injected CSS inset or simulated Capacitor bridge with physical iPhone testing. Screenshots are not retouched or used to imply runtime behavior that was not observed.

An integration candidate must have a narrow source/test/doc diff, no added binaries or secrets, passing focused checks and unchanged default behavior. The coordinator reviews overlapping renderer changes sequentially, then runs TypeScript, regression tests, production build, applicable real-browser controls and native bundle copy before a main-source push. GitHub `main` is authoritative: fetch first, fast-forward only, no force push; checkpoint only after the GitHub push and reconcile equal-tree checkpoint divergence locally.

A successful upload is not physical device acceptance or release readiness. The owner still checks build 112's actual iPhone status-bar clearance and later reviews visual candidates. App Store public release remains manual and outside this team's authorization.
