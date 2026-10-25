# Proposal: persistence prerequisites for experimental protocol v1

**Status:** proposal only. No migration file, schema edit, database connection, or production write accompanies this document.

The current `matches` and `match_turns` tables are legacy snapshot-flow tables. They do not hold a protocol version, engine version, revision, private canonical checkpoint/hash, action receipt, or idempotency key. `match_turns` has no unique `(matchId, turnNumber)` constraint, and current `createMatch`, `join`, `submitTurn`, and `abandon` are independent reads/writes. The existing schema therefore cannot make the new request-local evaluator safe across concurrent requests.

Before any public v1 route is enabled, a reviewed migration should add a separate authoritative data model rather than reinterpret v0 snapshots. One compatible shape is:

| Object | Required fields / constraints | Purpose |
| --- | --- | --- |
| `matches` extension or `authoritative_matches` | `protocol` (default legacy `0`), `engineVersion`, pinned `generationVersion`, `revision`, `canonicalState`/checkpoint reference, `canonicalHash`, trusted server setup and fixed host/guest seats | Pins the rules, generation ordering, and server truth for v1 only. Legacy rows stay protocol 0. |
| `match_actions` | `matchId`, ordered `revision`, `actorUserId`, bounded `actionId`, intent JSON, receipt JSON, checkpoint hash, timestamps; unique `(matchId, revision)` and unique `(matchId, actorUserId, actionId)` | Append-only replay and retry idempotency. |
| foreign keys / indexes | `matchId` references match row; member user IDs reference user rows; indexed active/revision lookup | Prevents orphan action history and supports compare-and-swap. |

The v1 submit transaction must read/lock the v1 match row (or use a serializable transaction), verify membership, status, current seat, engine version, pinned generation version, and `revision = expectedRevision`, run the isolated evaluator on the private canonical state, and write all of the following atomically: new private checkpoint/hash, incremented revision, action row, receipt row, and next-seat/terminal metadata. If `UPDATE ... WHERE revision = expectedRevision` affects zero rows, the server must return a stale-view conflict and must not append an action. If the action id already exists for that match/user, it must return the persisted receipt instead of applying rules a second time.

Joining must atomically claim only a null guest seat using a predicate such as `WHERE status = 'open' AND guestUserId IS NULL`, so exactly one caller can join. Abandon/finish must share the same transaction/locking boundary as action submission, so neither can overwrite a committed action or receive an interleaved action after terminal state.

A future read endpoint must dispatch by stored `protocol`. Protocol 0 preserves exact legacy invite/resume/full-snapshot behavior. Protocol 1 returns member-only projected views and invite metadata only; neither flow should silently convert an existing snapshot row into canonical truth. The migration must be rolled out with v1 disabled by default until full intent action parity, projection auditing, idempotency, race tests, route body/rate limits, and two-device resume/reconnect verification are complete.
