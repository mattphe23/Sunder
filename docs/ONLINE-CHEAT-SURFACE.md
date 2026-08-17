# Online duels: the cheat surface, honestly mapped

**Status:** analysis + recommendation. Written v56. The conclusion is not the
one the original framing ("strip enemy-vision fields in `match.get`") hoped
for — that fix is architecturally impossible without breaking the game, and
this document exists so nobody spends an afternoon discovering that the hard
way.

## The current trust model

Online duels are **client-authoritative with whole-state snapshots**:

- `match.create` stores a full serialized `GameState` (turn 0).
- Each client loads the FULL state, simulates its own turn locally with the
  real engine, and `submitTurn` stores the new full snapshot.
- The server validates sequencing only: `turnNumber = match.turnNumber + 1`,
  correct `currentUserId`, match active. It never inspects the game content.

The consequence: **every client's memory contains the complete truth of the
match** — all enemy unit positions and HP, all tribes' `explored` fog arrays,
camp strengths, incoming guardians, everything. The fog of war is a rendering
convention (`isVisibleTo` in the renderer), not an information boundary.
Anyone who opens devtools has a wallhack: `window.__polyforge.state`.

## Why "strip the secret fields" does not work

A fog-respecting snapshot (enemy units hidden, unexplored terrain blanked)
cannot be played from. The receiving client must simulate its own turn, and
legal moves depend on the hidden information:

- Movement legality: an unseen enemy unit occupies a tile the client believes
  is empty. Its locally-computed move is illegal and it cannot know.
- Combat previews, city capture, world events (raiders/guardians move and
  attack inside `beginTurn`), score computation — all read full state.

Strip the fields and the game desyncs on the first hidden contact. This is
not a "we haven't built the strip yet" gap; it is inherent to simulating
rules on the client. The only fixes are architectural.

## What the actual options are, in cost order

**1. Accept and label the trust model (do this now).**
Friend duels between people who would also share a couch. The feature already
is that: invite links, no matchmaking, no stakes. The requirement is only
honesty — don't let anything that looks like a competition ride on it.
Concrete: no ranked ladder, no duel Elo, no wager/stake language anywhere in
UI or store copy until option 2 or 3 lands. The daily/weekly leaderboard is
safe already (challenge runs are single-player against seeds).

**2. Server-side move receipts (medium project, weeks).**
Keep the client-authoritative sim, but require each `submitTurn` to include
the player's action list (moves/attacks/captures/builds, in order). The
server re-runs the actions against the previous snapshot using the shared
engine (it already imports `client/src/game/core` for tests and the playtest
lab) and rejects illegal transitions. This kills the *worst* cheats (moving
through fog-occupied tiles, impossible combat, fabricated income) but NOT
information cheats (reading enemy positions — the client still holds full
state). Best value-per-effort: stops fabrication, tolerates peeking.

**3. Server-authoritative turns (the real fix, big project).**
The server holds the match, clients send intents, the server resolves and
returns each player only their own view. The engine is already isomorphic
TypeScript — the work is the session/lock/step machinery around it, not the
rules. This is the only option that fixes fog. Build it when (and only when)
ranked play is on the roadmap; it is not a TestFlight blocker.

## Recommendation

Option 1 today, option 2 before any public ladder exists, option 3 when
ranked matters. The risk right now is reputational, not technical: someone
posts "Sunder multiplayer is client-side, lol" and the game's credibility
takes the hit for a feature that was always labeled friend-duels. The
leaderboard, campaigns, and challenges are all single-player and unaffected.
