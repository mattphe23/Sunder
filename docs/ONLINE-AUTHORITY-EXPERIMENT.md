# Experimental online authority foundation (not public protocol v1)

**Status:** internal code/test seam only, added 2026-10-25. It has no tRPC route, no UI integration, no database schema change, and no call site in the existing `match` router. It therefore does not alter friend-duel invite (`?m=`), join, resume, status, snapshot submission, or abandon behavior.

This is deliberately **not a playable online mode** and must not be presented as authoritative multiplayer, fog-secure multiplayer, ranked play, or a replacement for the existing friend-duel flow. Existing asynchronous matches remain legacy, client-authoritative full-snapshot matches with the limitations documented in [`ONLINE-CHEAT-SURFACE.md`](./ONLINE-CHEAT-SURFACE.md).

## What is present

`server/onlineAuthority.ts` provides a request-local, effects-disabled experimental reducer seam.

- A fresh `GameStore({ effects: false })` is created per evaluation. It does not emit UI events, touch `localStorage`, queue AI `setTimeout` work, write profile/challenge/story/Hall data, or use the process-global `game` singleton.
- It accepts only a bounded (2 KiB) strict protocol-shaped intent: protocol `1`, `matchId`, `expectedRevision`, bounded ASCII `actionId`, and exactly one `move`, `attack`, or `endTurn` action. Unknown fields and client `state`, `winner`, and `resultText` fields are rejected.
- The evaluator derives the seat from a trusted match record and authenticated user ID. It rejects nonmembers, inactive records, stale revisions, wrong seats, non-two-human canonical state, terminal/nonplaying state, dead actor seats, and unresolved perk/city/diplomacy choices.
- Move and attack validate unit ownership, fresh action flags, board bounds, destination/target visibility, canonical path or attack range/occupancy/terrain rules, and canonical state changes. `endTurn` runs the canonical engine turn transition, income, deterministic world phase, victory logic, and start-of-turn fresh-action reset.
- Results are typed `accepted` receipts (with an engine version and private checkpoint hash) or typed rejections. The accepted result includes a `canonicalState` solely for future server persistence; it must never be returned to a player.
- A deterministic genesis helper uses an explicit server-selected seed, exactly two human tribes, and the pinned private `experimental-v1` generation version. It accepts setup only and has no random seed fallback or client initial snapshot input.
- Canonical checkpoint hashes use stable-key SHA-256 serialization. Tests replay a legal two-human move/end-turn action stream from the same genesis and compare every resulting checkpoint hash.
- Default/legacy map villages, ruins, camps, and hero perk offers retain their original comparator ordering byte-for-byte. Only a fresh, effects-disabled authority genesis explicitly selects `experimental-v1`, whose checkpoint state pins portable Fisher-Yates ordering for those same decisions. There is no singleton, environment, configuration, router, UI, or legacy-save switch.
- Missing, hidden, and wrong-owner unit references are normalized to the same `UNAVAILABLE_REFERENCE` response; hidden and out-of-bounds tile references are likewise opaque. Detailed legality errors occur only after a player-visible/owned reference has been established. The current three-action schema has no city reference; future city actions require equivalent opaque-reference tests before admission.

## Fog projection contract

`projectExperimentalPlayerView` is also internal-only; no endpoint serves it today. It returns a deliberately minimal future player DTO:

- Every board coordinate appears, but undiscovered tiles contain only `{ x, y, discovered: false }`.
- Discovered terrain is returned. Resources, ruins, and Great Ruins are returned only when the tile is currently visible.
- A city appears only when currently visible or owned by the requesting player.
- A unit appears only when owned by the requesting player or currently visible. Enemy moved/attacked flags are always false.
- Only the requester’s stars, techs, and pending-choice boolean are exposed.
- The DTO excludes other tribes’ stars, techs, pending choices, fog arrays, hidden resources/ruins, hidden units/HP, full canonical state, logs, replay, camps/storms not otherwise projected, and internal authority metadata.

This projection is a tested *data-shaping helper*, not evidence of fog security in production. The existing legacy endpoints still transmit full snapshots to members and are not changed by this foundation.

## Explicit limits that block activation

The three-action evaluator is not full action parity. It does **not** support or make authoritative capture, research, training, harvesting, buildings, roads, ports, walls, city rewards, hero perks, Quake, diplomacy, undo, or any other UI command. It rejects a pending choice rather than resolving it. It must remain nonpublic until every player-action path has an intent, validation, receipt, replay coverage, and fog-safe projection behavior.

The current database schema has no protocol/version, engine-version, revision, canonical checkpoint/hash, action log, receipt, or idempotency-key fields; `match_turns` also has no unique `(matchId, turnNumber)` constraint. The in-memory evaluator’s `expectedRevision` check is not a cross-request transaction. A future route must not call it until the migration in [`ONLINE-AUTHORITY-MIGRATION-PROPOSAL.md`](./ONLINE-AUTHORITY-MIGRATION-PROPOSAL.md) (or equivalent reviewed migration) exists and commit/read paths perform atomic compare-and-swap plus receipt replay.

There are no real join/submit/abandon race tests, transaction/CAS implementation, action idempotency store, transport byte limit, per-member/action rate limit, request authentication binding, or two-device resume/reconnect test. The 2 KiB in-memory intent-shape cap is not a route-level body limit or abuse control. A future activation must prove member-only projected reads and submit paths, persistence/replay across the pinned engine and generation versions, concurrent join/submit/abandon behavior, rate-limit behavior, and independent two-device resume before any public v1 claim.

No real database writes, database migrations, account operations, timers, forfeits, rankings, or automatic jobs were performed or added in this change.
