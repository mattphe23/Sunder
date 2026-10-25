import { describe, expect, it } from "vitest";
import { attackableUnits, isVisibleTo, reachableTiles } from "../client/src/game/core/rules";
import { GameStore, game } from "../client/src/game/core/state";
import type { GameState } from "../client/src/game/core/types";
import {
  EXPERIMENTAL_AUTHORITY_GENERATION_VERSION,
  EXPERIMENTAL_AUTHORITY_PROTOCOL,
  MAX_EXPERIMENTAL_INTENT_BYTES,
  createExperimentalGenesis,
  evaluateExperimentalAuthority,
  hashCanonicalState,
  projectExperimentalPlayerView,
  type ExperimentalMatchRecord,
} from "./onlineAuthority";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fixture(seed = 713): ExperimentalMatchRecord {
  return {
    id: "x-auth-1",
    revision: 0,
    status: "active",
    hostUserId: 101,
    guestUserId: 202,
    hostTribe: 0,
    guestTribe: 1,
    generationVersion: EXPERIMENTAL_AUTHORITY_GENERATION_VERSION,
    canonicalState: createExperimentalGenesis({
      seed,
      size: 9,
      preset: "continents",
      roster: [0, 1],
    }),
  };
}

function userForCurrentSeat(match: ExperimentalMatchRecord): number {
  return match.canonicalState.currentTribe === match.hostTribe ? match.hostUserId : match.guestUserId!;
}

function intentFor(match: ExperimentalMatchRecord, action: object, actionId = `a-${match.revision}`) {
  return {
    protocol: EXPERIMENTAL_AUTHORITY_PROTOCOL,
    matchId: match.id,
    expectedRevision: match.revision,
    actionId,
    action,
  };
}

function apply(match: ExperimentalMatchRecord, action: object, actorUserId = userForCurrentSeat(match)) {
  const result = evaluateExperimentalAuthority({ match, actorUserId, intent: intentFor(match, action) });
  expect(result.kind).toBe("accepted");
  if (result.kind !== "accepted") throw new Error(result.code);
  return {
    match: { ...match, revision: result.receipt.revision, canonicalState: result.canonicalState },
    receipt: result.receipt,
  };
}

function firstLegalMove(state: GameState, tribe: number) {
  const unit = state.units.find((candidate) => candidate.tribe === tribe && !candidate.moved);
  if (!unit) throw new Error("Expected a fresh unit");
  const destination = reachableTiles(state, unit)[0];
  if (!destination) throw new Error("Expected a legal starting move");
  return { type: "move" as const, unitId: unit.id, x: destination.x, y: destination.y };
}

function hiddenTileFor(state: GameState, tribe: number): { x: number; y: number } {
  const tile = state.tiles.find((candidate) => !isVisibleTo(state, tribe, candidate.x, candidate.y));
  if (!tile) throw new Error("Expected a tile hidden from the acting seat");
  return tile;
}

function makeVisibleSkirmish(match: ExperimentalMatchRecord): { attackerId: number; defenderId: number } {
  const state = match.canonicalState;
  const attacker = state.units.find((unit) => unit.tribe === state.currentTribe && !unit.guardian)!;
  const defender = state.units.find((unit) => unit.tribe !== state.currentTribe && unit.tribe >= 0 && !unit.guardian)!;
  // Put the two existing units on a legal adjacent clear-tile pair. This fixture
  // is server-owned canonical state; the incoming intent never edits positions.
  const pair = state.tiles.find((tile) => {
    if (tile.terrain !== "grass" || tile.cityId !== null) return false;
    const neighbor = state.tiles.find((other) =>
      other.terrain === "grass" && other.cityId === null &&
      Math.max(Math.abs(tile.x - other.x), Math.abs(tile.y - other.y)) === 1,
    );
    return neighbor !== undefined;
  })!;
  const other = state.tiles.find((tile) =>
    tile.terrain === "grass" && tile.cityId === null &&
    Math.max(Math.abs(pair.x - tile.x), Math.abs(pair.y - tile.y)) === 1,
  )!;
  const occupied = new Set([attacker.id, defender.id]);
  state.units = state.units.filter((unit) => occupied.has(unit.id) || (unit.x !== pair.x || unit.y !== pair.y) && (unit.x !== other.x || unit.y !== other.y));
  attacker.x = pair.x;
  attacker.y = pair.y;
  attacker.moved = false;
  attacker.attacked = false;
  defender.x = other.x;
  defender.y = other.y;
  defender.moved = false;
  defender.attacked = false;
  state.tiles[pair.y * state.size + pair.x].explored[state.currentTribe] = true;
  state.tiles[other.y * state.size + other.x].explored[state.currentTribe] = true;
  expect(attackableUnits(state, attacker, true).some((unit) => unit.id === defender.id)).toBe(true);
  return { attackerId: attacker.id, defenderId: defender.id };
}

describe("experimental online authority foundation", () => {
  it("pins portable ordering only on a private experimental genesis", () => {
    const match = fixture();
    expect(match.generationVersion).toBe(EXPERIMENTAL_AUTHORITY_GENERATION_VERSION);
    expect(match.canonicalState.generationVersion).toBe(EXPERIMENTAL_AUTHORITY_GENERATION_VERSION);
    expect(game.state.generationVersion).toBeUndefined();
  });

  it("keeps the effects-disabled legacy sequence byte-equivalent to the interactive legacy store", () => {
    const options = {
      seed: 44_221,
      size: 9,
      preset: "pangaea" as const,
      roster: [0, 1] as [number, number],
      difficulty: "normal" as const,
      humanTribe: 0,
      humanTribes: [0, 1],
    };
    const interactive = new GameStore();
    const isolated = new GameStore({ effects: false });
    interactive.newGame(options);
    isolated.newGame(options);
    expect(interactive.state.generationVersion).toBeUndefined();
    expect(isolated.state.generationVersion).toBeUndefined();
    expect(hashCanonicalState(isolated.state)).toBe(hashCanonicalState(interactive.state));

    const move = firstLegalMove(interactive.state, interactive.state.currentTribe);
    interactive.moveUnit(move.unitId, move.x, move.y);
    isolated.moveUnit(move.unitId, move.x, move.y);
    interactive.endTurn();
    isolated.endTurn();
    expect(hashCanonicalState(isolated.state)).toBe(hashCanonicalState(interactive.state));
  });

  it("evaluates legal move, attack, and end-turn request-locally without touching the shared game singleton", () => {
    const sharedBefore = hashCanonicalState(game.state);
    let match = fixture();

    const move = firstLegalMove(match.canonicalState, match.canonicalState.currentTribe);
    const moved = apply(match, move);
    expect(moved.receipt.revision).toBe(1);
    expect(moved.receipt.stateHash).toBe(hashCanonicalState(moved.match.canonicalState));
    match = moved.match;

    const skirmish = makeVisibleSkirmish(match);
    const attacked = apply(match, { type: "attack", ...skirmish });
    expect(attacked.receipt.action.type).toBe("attack");
    expect(attacked.match.canonicalState.units.find((unit) => unit.id === skirmish.attackerId)?.attacked).toBe(true);
    match = attacked.match;

    const ended = apply(match, { type: "endTurn" });
    expect(ended.receipt.action.type).toBe("endTurn");
    expect(ended.match.canonicalState.currentTribe).not.toBe(match.canonicalState.currentTribe);
    expect(hashCanonicalState(game.state)).toBe(sharedBefore);
  });

  it("returns typed rejections for membership, seat, flags, visible legality, and pending choices", () => {
    const match = fixture();
    const actor = userForCurrentSeat(match);
    const actorTribe = match.canonicalState.currentTribe;
    const mine = match.canonicalState.units.find((unit) => unit.tribe === actorTribe)!;
    const theirs = match.canonicalState.units.find((unit) => unit.tribe !== actorTribe && unit.tribe >= 0)!;

    const reject = (record: ExperimentalMatchRecord, userId: number, action: object, code: string) => {
      const result = evaluateExperimentalAuthority({ match: record, actorUserId: userId, intent: intentFor(record, action) });
      expect(result).toMatchObject({ kind: "rejected", code });
    };

    reject(match, 999, { type: "endTurn" }, "NOT_MEMBER");
    reject({ ...match, status: "open" }, actor, { type: "endTurn" }, "INACTIVE_MATCH");
    reject(match, actor === match.hostUserId ? match.guestUserId! : match.hostUserId, { type: "endTurn" }, "NOT_CURRENT_SEAT");
    reject(match, actor, { type: "move", unitId: theirs.id, x: theirs.x, y: theirs.y }, "UNAVAILABLE_REFERENCE");
    reject(match, actor, { type: "move", unitId: mine.id, x: -1, y: 0 }, "UNAVAILABLE_REFERENCE");

    const spent = clone(match);
    spent.canonicalState.units.find((unit) => unit.id === mine.id)!.moved = true;
    reject(spent, actor, { type: "move", unitId: mine.id, x: mine.x, y: mine.y }, "UNIT_ALREADY_MOVED");

    const attackSpent = clone(match);
    attackSpent.canonicalState.units.find((unit) => unit.id === mine.id)!.attacked = true;
    reject(attackSpent, actor, { type: "attack", attackerId: mine.id, defenderId: theirs.id }, "UNIT_ALREADY_ATTACKED");

    const blocked = clone(match);
    const blockedUnit = blocked.canonicalState.units.find((unit) => unit.id === mine.id)!;
    blocked.canonicalState.tiles[0].explored[actorTribe] = true;
    reject(blocked, actor, { type: "move", unitId: blockedUnit.id, x: 0, y: 0 }, "ILLEGAL_PATH");

    const choice = clone(match);
    choice.canonicalState.pendingPerk = mine.id;
    reject(choice, actor, { type: "endTurn" }, "PENDING_CHOICE");

    const stale = evaluateExperimentalAuthority({
      match,
      actorUserId: actor,
      intent: { ...intentFor(match, { type: "endTurn" }), expectedRevision: 4 },
    });
    expect(stale).toMatchObject({ kind: "rejected", code: "STALE_REVISION" });
  });

  it("normalizes hidden, missing, wrong-owner, and unavailable-tile references without an oracle", () => {
    const match = fixture();
    const actor = userForCurrentSeat(match);
    const actorTribe = match.canonicalState.currentTribe;
    const mine = match.canonicalState.units.find((unit) => unit.tribe === actorTribe)!;
    const theirs = match.canonicalState.units.find((unit) => unit.tribe !== actorTribe && unit.tribe >= 0)!;
    const hidden = clone(match);
    const hiddenCoordinate = hiddenTileFor(hidden.canonicalState, actorTribe);
    const hiddenTarget = hidden.canonicalState.units.find((unit) => unit.id === theirs.id)!;
    hiddenTarget.x = hiddenCoordinate.x;
    hiddenTarget.y = hiddenCoordinate.y;
    expect(isVisibleTo(hidden.canonicalState, actorTribe, hiddenTarget.x, hiddenTarget.y)).toBe(false);

    const evaluate = (record: ExperimentalMatchRecord, action: object) =>
      evaluateExperimentalAuthority({ match: record, actorUserId: actor, intent: intentFor(record, action, "oracle") });

    expect(evaluate(hidden, { type: "attack", attackerId: mine.id, defenderId: hiddenTarget.id }))
      .toEqual(evaluate(hidden, { type: "attack", attackerId: mine.id, defenderId: 999_999 }));
    expect(evaluate(match, { type: "move", unitId: theirs.id, x: theirs.x, y: theirs.y }))
      .toEqual(evaluate(match, { type: "move", unitId: 999_999, x: theirs.x, y: theirs.y }));

    // This three-action slice has no city reference. Its tile reference makes
    // hidden and out-of-bounds probes indistinguishable before path validation.
    const hiddenTile = hiddenTileFor(match.canonicalState, actorTribe);
    expect(evaluate(match, { type: "move", unitId: mine.id, x: hiddenTile.x, y: hiddenTile.y }))
      .toEqual(evaluate(match, { type: "move", unitId: mine.id, x: -1, y: -1 }));

    // City actions do not exist in this deliberately narrow schema. Both an
    // existing city id and a guessed id are rejected at shape validation, so
    // the action slice cannot expose city existence before city parity exists.
    const cityId = match.canonicalState.cities[0]!.id;
    expect(evaluate(match, { type: "move", unitId: mine.id, x: mine.x, y: mine.y, cityId }))
      .toEqual(evaluate(match, { type: "move", unitId: mine.id, x: mine.x, y: mine.y, cityId: 999_999 }));
  });

  it("does not mutate an input checkpoint or share state across same-revision evaluations", () => {
    const match = fixture(1_717);
    const before = hashCanonicalState(match.canonicalState);
    const action = firstLegalMove(match.canonicalState, match.canonicalState.currentTribe);
    const actor = userForCurrentSeat(match);
    const first = evaluateExperimentalAuthority({
      match,
      actorUserId: actor,
      intent: intentFor(match, action, "parallel-a"),
    });
    const second = evaluateExperimentalAuthority({
      match,
      actorUserId: actor,
      intent: intentFor(match, action, "parallel-b"),
    });
    expect(first.kind).toBe("accepted");
    expect(second.kind).toBe("accepted");
    if (first.kind !== "accepted" || second.kind !== "accepted") throw new Error("Expected isolated evaluations");
    expect(hashCanonicalState(match.canonicalState)).toBe(before);
    expect(first.canonicalState).not.toBe(match.canonicalState);
    expect(second.canonicalState).not.toBe(match.canonicalState);
    expect(hashCanonicalState(first.canonicalState)).toBe(hashCanonicalState(second.canonicalState));
  });

  it("rejects opaque snapshots, winner/result fields, unknown keys, malformed ids, and oversized request bodies", () => {
    const match = fixture();
    const actor = userForCurrentSeat(match);
    for (const intent of [
      { ...intentFor(match, { type: "endTurn" }), state: "{}" },
      { ...intentFor(match, { type: "endTurn" }), winner: "me", resultText: "forged" },
      { ...intentFor(match, { type: "endTurn" }), actionId: "has spaces" },
      { ...intentFor(match, { type: "fly", unitId: 1 }) },
    ]) {
      const result = evaluateExperimentalAuthority({ match, actorUserId: actor, intent });
      expect(result).toMatchObject({ kind: "rejected", code: "MALFORMED_INTENT" });
    }
    const oversized = evaluateExperimentalAuthority({
      match,
      actorUserId: actor,
      intent: { ...intentFor(match, { type: "endTurn" }), actionId: "x".repeat(MAX_EXPERIMENTAL_INTENT_BYTES) },
    });
    expect(oversized).toMatchObject({ kind: "rejected", code: "PAYLOAD_TOO_LARGE" });
  });

  it("replays a legal two-human action stream from deterministic genesis to identical checkpoint hashes", () => {
    const genesisA = fixture(991);
    let forward = clone(genesisA);
    const actions: Array<{ userId: number; action: object; actionId: string; expectedHash: string }> = [];

    for (let turn = 0; turn < 8; turn++) {
      const tribe = forward.canonicalState.currentTribe;
      const move = firstLegalMove(forward.canonicalState, tribe);
      const userId = userForCurrentSeat(forward);
      const moved = apply(forward, move, userId);
      actions.push({ userId, action: move, actionId: moved.receipt.actionId, expectedHash: moved.receipt.stateHash });
      forward = moved.match;

      const endingUser = userForCurrentSeat(forward);
      const ended = apply(forward, { type: "endTurn" }, endingUser);
      actions.push({ userId: endingUser, action: { type: "endTurn" }, actionId: ended.receipt.actionId, expectedHash: ended.receipt.stateHash });
      forward = ended.match;
    }

    let replay = fixture(991);
    for (const recorded of actions) {
      const result = evaluateExperimentalAuthority({
        match: replay,
        actorUserId: recorded.userId,
        intent: intentFor(replay, recorded.action, recorded.actionId),
      });
      expect(result.kind).toBe("accepted");
      if (result.kind !== "accepted") throw new Error(result.code);
      expect(result.receipt.generationVersion).toBe(EXPERIMENTAL_AUTHORITY_GENERATION_VERSION);
      expect(result.canonicalState.generationVersion).toBe(EXPERIMENTAL_AUTHORITY_GENERATION_VERSION);
      expect(result.receipt.stateHash).toBe(recorded.expectedHash);
      replay = { ...replay, revision: result.receipt.revision, canonicalState: result.canonicalState };
    }
    expect(hashCanonicalState(replay.canonicalState)).toBe(hashCanonicalState(forward.canonicalState));
  });

  it("projects no hidden terrain details, enemy economy, other fog arrays, or hidden units", () => {
    const match = fixture();
    const actor = match.canonicalState.currentTribe;
    const enemy = match.canonicalState.units.find((unit) => unit.tribe !== actor && unit.tribe >= 0)!;
    enemy.x = match.canonicalState.size - 1;
    enemy.y = match.canonicalState.size - 1;
    const hiddenTile = match.canonicalState.tiles[enemy.y * match.canonicalState.size + enemy.x];
    hiddenTile.explored[actor] = false;
    hiddenTile.resource = "mineral";
    hiddenTile.ruin = true;
    match.canonicalState.tribes[1 - actor].stars = 999;
    match.canonicalState.tribes[1 - actor].techs.push("navigation");

    const view = projectExperimentalPlayerView(match, actor);
    const projected = view.tiles.find((tile) => tile.x === enemy.x && tile.y === enemy.y)!;
    expect(projected).toEqual({ x: enemy.x, y: enemy.y, discovered: false });
    expect(view.units.some((unit) => unit.id === enemy.id)).toBe(false);
    expect(JSON.stringify(view)).not.toContain("999");
    expect(JSON.stringify(view)).not.toContain("navigation");
    expect(JSON.stringify(view)).not.toContain("explored");
    expect(JSON.stringify(view)).not.toContain("replay");
    expect(JSON.stringify(view)).not.toContain("log");
    expect(view.tiles.every((tile) => !tile.city || !("id" in tile.city))).toBe(true);
  });
});
