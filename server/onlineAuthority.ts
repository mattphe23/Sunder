/**
 * Experimental, server-internal authority foundation.
 *
 * This file intentionally has no router export and no persistence dependency.
 * It is a request-local reducer seam for a future protocol-v1 implementation;
 * legacy `match.*` snapshot endpoints continue to be the only public flow.
 * Canonical GameState values returned by this module are server-only and MUST
 * NOT be sent to a player or accepted back from a player.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { GameStore } from "../client/src/game/core/state";
import { EXPERIMENTAL_GENERATION_VERSION, type MapPreset } from "../client/src/game/core/mapgen";
import { isVisibleTo, reachableTiles, attackableUnits } from "../client/src/game/core/rules";
import type { GameState, Unit } from "../client/src/game/core/types";

export const EXPERIMENTAL_AUTHORITY_PROTOCOL = 1 as const;
export const EXPERIMENTAL_ENGINE_VERSION = "sunder-rules-2026-10-25" as const;
/** Pinned private ordering contract for protocol-1 checkpoint generation. */
export const EXPERIMENTAL_AUTHORITY_GENERATION_VERSION = EXPERIMENTAL_GENERATION_VERSION;
export const MAX_EXPERIMENTAL_INTENT_BYTES = 2_048;

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move"),
    unitId: z.number().int().positive(),
    x: z.number().int(),
    y: z.number().int(),
  }).strict(),
  z.object({
    type: z.literal("attack"),
    attackerId: z.number().int().positive(),
    defenderId: z.number().int().positive(),
  }).strict(),
  z.object({ type: z.literal("endTurn") }).strict(),
]);

/** Strict, bounded command shape. It intentionally has no state/result/winner fields. */
export const experimentalIntentSchema = z.object({
  protocol: z.literal(EXPERIMENTAL_AUTHORITY_PROTOCOL),
  matchId: z.string().min(1).max(12),
  expectedRevision: z.number().int().min(0),
  actionId: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  action: actionSchema,
}).strict();

export type ExperimentalIntent = z.infer<typeof experimentalIntentSchema>;
export type ExperimentalAction = ExperimentalIntent["action"];

export type AuthorityRejectionCode =
  | "PAYLOAD_TOO_LARGE"
  | "MALFORMED_INTENT"
  | "MATCH_MISMATCH"
  | "STALE_REVISION"
  | "NOT_MEMBER"
  | "INACTIVE_MATCH"
  | "NOT_CURRENT_SEAT"
  | "INVALID_CANONICAL_STATE"
  | "PENDING_CHOICE"
  /** Missing, hidden, or wrong-owner untrusted action reference. */
  | "UNAVAILABLE_REFERENCE"
  | "UNIT_ALREADY_MOVED"
  | "UNIT_ALREADY_ATTACKED"
  | "ILLEGAL_PATH"
  | "ILLEGAL_TARGET"
  | "NO_STATE_CHANGE";

export interface AuthorityRejection {
  kind: "rejected";
  protocol: typeof EXPERIMENTAL_AUTHORITY_PROTOCOL;
  code: AuthorityRejectionCode;
  /** This is operational text, never a canonical-state disclosure. */
  message: string;
}

export interface AuthorityReceipt {
  kind: "accepted";
  protocol: typeof EXPERIMENTAL_AUTHORITY_PROTOCOL;
  actionId: string;
  actorTribe: number;
  revision: number;
  engineVersion: typeof EXPERIMENTAL_ENGINE_VERSION;
  generationVersion: typeof EXPERIMENTAL_AUTHORITY_GENERATION_VERSION;
  /** SHA-256 of the private canonical checkpoint after this action. */
  stateHash: string;
  action: ExperimentalAction;
}

export interface AuthorityAccepted {
  kind: "accepted";
  receipt: AuthorityReceipt;
  /** Server-only. Persist transactionally in a later protocol-v1 migration. */
  canonicalState: GameState;
}

export type AuthorityEvaluation = AuthorityAccepted | AuthorityRejection;

/** The future persistence adapter must derive both seats from trusted rows. */
export interface ExperimentalMatchRecord {
  id: string;
  revision: number;
  status: "open" | "active" | "finished" | "abandoned";
  hostUserId: number;
  guestUserId: number | null;
  hostTribe: number;
  guestTribe: number;
  /** Pinned on the private row before a future persistence adapter evaluates it. */
  generationVersion: typeof EXPERIMENTAL_AUTHORITY_GENERATION_VERSION;
  /** Private server checkpoint only; no client snapshot is accepted by this module. */
  canonicalState: GameState;
}

export interface EvaluateAuthorityInput {
  match: ExperimentalMatchRecord;
  /** Authenticated server identity, never a client-supplied seat. */
  actorUserId: number;
  /** Untrusted decoded request body, checked before use. */
  intent: unknown;
}

function rejected(code: AuthorityRejectionCode, message: string): AuthorityRejection {
  return { kind: "rejected", protocol: EXPERIMENTAL_AUTHORITY_PROTOCOL, code, message };
}

function byteSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function cloneCanonical(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** Stable JSON for checkpoint hashing; array order remains meaningful. */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

/** Hash a canonical checkpoint without relying on object insertion order. */
export function hashCanonicalState(state: GameState): string {
  return createHash("sha256").update(stableJson(state)).digest("hex");
}

function seatFor(match: ExperimentalMatchRecord, userId: number): number | null {
  if (match.hostUserId === userId) return match.hostTribe;
  if (match.guestUserId === userId) return match.guestTribe;
  return null;
}

function validTwoHumanState(state: GameState, match: ExperimentalMatchRecord): boolean {
  if (
    match.generationVersion !== EXPERIMENTAL_AUTHORITY_GENERATION_VERSION ||
    state.generationVersion !== EXPERIMENTAL_AUTHORITY_GENERATION_VERSION
  ) return false;
  if (state.tribes.length !== 2 || state.humanTribes?.length !== 2) return false;
  if (state.humanTribes[0] !== 0 || state.humanTribes[1] !== 1) return false;
  if (!state.tribes.every((tribe) => tribe.isHuman)) return false;
  if (match.hostTribe < 0 || match.hostTribe > 1 || match.guestTribe < 0 || match.guestTribe > 1) return false;
  if (match.hostTribe === match.guestTribe) return false;
  return state.tribes[match.hostTribe]?.isHuman === true && state.tribes[match.guestTribe]?.isHuman === true;
}

function pendingChoice(state: GameState): boolean {
  // This small action slice cannot resolve city rewards, perks, or diplomacy.
  return state.pendingPerk != null || state.pendingCityReward != null || state.incomingOffer != null;
}

/**
 * Do not distinguish a missing ID from a hidden or other-seat ID. An action
 * caller may only learn detailed rule failures after it names an owned unit.
 */
function ownedUnit(state: GameState, actorTribe: number, unitId: number): Unit | AuthorityRejection {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit || unit.tribe !== actorTribe) {
    return rejected("UNAVAILABLE_REFERENCE", "The referenced unit is unavailable to this seat");
  }
  return unit;
}

/** Same opaque response for a nonexistent or currently hidden target. */
function visibleUnit(state: GameState, actorTribe: number, unitId: number): Unit | AuthorityRejection {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit || !isVisibleTo(state, actorTribe, unit.x, unit.y)) {
    return rejected("UNAVAILABLE_REFERENCE", "The referenced unit is unavailable to this seat");
  }
  return unit;
}

function inBounds(state: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.size && y < state.size;
}

function clearAuthorityUiFields(state: GameState): void {
  // These fields are local presentation state, not authority protocol state.
  state.selectedUnitId = null;
  state.selectedCityId = null;
  state.handoff = null;
  state.showIntro = false;
  state.showRecap = false;
  state.recap = [];
  state.aiThinking = false;
}

/**
 * Apply exactly one strict protocol-v1-shaped action against server-owned
 * state. This is deliberately not routed or persisted: it cannot accidentally
 * make v0 snapshot matches authoritative before action parity and atomic
 * receipt storage exist.
 */
export function evaluateExperimentalAuthority(input: EvaluateAuthorityInput): AuthorityEvaluation {
  if (byteSize(input.intent) > MAX_EXPERIMENTAL_INTENT_BYTES) {
    return rejected("PAYLOAD_TOO_LARGE", `Intent exceeds ${MAX_EXPERIMENTAL_INTENT_BYTES} bytes`);
  }
  const parsed = experimentalIntentSchema.safeParse(input.intent);
  if (!parsed.success) return rejected("MALFORMED_INTENT", "Intent must match the strict experimental protocol shape");
  const intent = parsed.data;
  const action = intent.action;
  const { match } = input;

  if (intent.matchId !== match.id) return rejected("MATCH_MISMATCH", "Intent match id does not match the loaded record");
  if (intent.expectedRevision !== match.revision) return rejected("STALE_REVISION", "Intent revision is no longer current");
  const actorTribe = seatFor(match, input.actorUserId);
  if (actorTribe === null) return rejected("NOT_MEMBER", "Authenticated user is not a member of this match");
  if (match.status !== "active") return rejected("INACTIVE_MATCH", "Match is not active");
  if (!validTwoHumanState(match.canonicalState, match)) {
    return rejected("INVALID_CANONICAL_STATE", "Experimental authority requires exactly two trusted human seats");
  }

  const state = match.canonicalState;
  if (state.phase !== "playing" || !state.tribes[actorTribe]?.alive) {
    return rejected("INACTIVE_MATCH", "Canonical game is not playable for this seat");
  }
  if (state.currentTribe !== actorTribe) return rejected("NOT_CURRENT_SEAT", "It is not this seat's turn");
  if (pendingChoice(state)) return rejected("PENDING_CHOICE", "Resolve the pending canonical choice before taking another action");

  switch (action.type) {
    case "move": {
      const unit = ownedUnit(state, actorTribe, action.unitId);
      if ("kind" in unit) return unit;
      if (unit.moved) return rejected("UNIT_ALREADY_MOVED", "Unit has already moved this turn");
      // The first safe projection slice only accepts destinations currently
      // visible to the actor, so the command cannot probe unknown terrain or
      // hidden occupancy. Broader blind-move policy is intentionally deferred.
      if (!inBounds(state, action.x, action.y) || !isVisibleTo(state, actorTribe, action.x, action.y)) {
        return rejected("UNAVAILABLE_REFERENCE", "The referenced tile is unavailable to this seat");
      }
      if (!reachableTiles(state, unit).some((tile) => tile.x === action.x && tile.y === action.y)) {
        return rejected("ILLEGAL_PATH", "Move destination is not reachable by the canonical rules");
      }
      break;
    }
    case "attack": {
      const attacker = ownedUnit(state, actorTribe, action.attackerId);
      if ("kind" in attacker) return attacker;
      if (attacker.attacked) return rejected("UNIT_ALREADY_ATTACKED", "Unit has already attacked this turn");
      const defender = visibleUnit(state, actorTribe, action.defenderId);
      if ("kind" in defender) return defender;
      if (!attackableUnits(state, attacker, true).some((candidate) => candidate.id === defender.id)) {
        return rejected("ILLEGAL_TARGET", "Defender is not a legal canonical target");
      }
      break;
    }
    case "endTurn":
      break;
  }

  const store = new GameStore({ effects: false });
  store.loadRequestLocalState(cloneCanonical(state));
  clearAuthorityUiFields(store.state);
  const before = hashCanonicalState(store.state);
  switch (action.type) {
    case "move":
      store.moveUnit(action.unitId, action.x, action.y);
      break;
    case "attack":
      store.attack(action.attackerId, action.defenderId);
      break;
    case "endTurn":
      store.endTurn();
      break;
  }
  clearAuthorityUiFields(store.state);
  const stateHash = hashCanonicalState(store.state);
  if (stateHash === before) return rejected("NO_STATE_CHANGE", "Canonical rules did not apply the intent");

  return {
    kind: "accepted",
    receipt: {
      kind: "accepted",
      protocol: EXPERIMENTAL_AUTHORITY_PROTOCOL,
      actionId: intent.actionId,
      actorTribe,
      revision: match.revision + 1,
      engineVersion: EXPERIMENTAL_ENGINE_VERSION,
      generationVersion: EXPERIMENTAL_AUTHORITY_GENERATION_VERSION,
      stateHash,
      action: intent.action,
    },
    canonicalState: store.state,
  };
}

/**
 * Deterministic server-selected genesis helper for tests and a later v1
 * creation transaction. It accepts setup only; it never accepts a client
 * snapshot, result, winner, or an RNG fallback.
 */
export function createExperimentalGenesis(setup: {
  seed: number;
  size: number;
  preset: MapPreset;
  roster: [number, number];
}): GameState {
  const store = new GameStore({ effects: false });
  store.newGame({
    seed: setup.seed,
    size: setup.size,
    preset: setup.preset,
    generationVersion: EXPERIMENTAL_AUTHORITY_GENERATION_VERSION,
    roster: setup.roster,
    difficulty: "normal",
    humanTribe: 0,
    humanTribes: [0, 1],
  });
  clearAuthorityUiFields(store.state);
  return cloneCanonical(store.state);
}

/** A fog-safe DTO shape for the future member-only v1 endpoint, not a route. */
export interface ExperimentalPlayerView {
  protocol: typeof EXPERIMENTAL_AUTHORITY_PROTOCOL;
  experimental: true;
  matchId: string;
  revision: number;
  size: number;
  phase: GameState["phase"];
  turn: number;
  currentTribe: number;
  yourTribe: number;
  tiles: Array<{
    x: number;
    y: number;
    discovered: boolean;
    terrain?: string;
    resource?: string | null;
    ruin?: boolean;
    greatRuin?: boolean;
    city?: { name: string; tribe: number | null; level: number; walls: boolean };
  }>;
  units: Array<{ id: number; type: string; tribe: number; x: number; y: number; hp: number; maxHp: number; moved: boolean; attacked: boolean }>;
  you: { stars: number; techs: string[]; pendingChoice: boolean };
  outcome: { winner: number | null };
}

/**
 * Project only terrain the player has discovered and live tactical data they
 * currently own or see. It excludes enemy stars/techs, other fog arrays,
 * hidden resources/ruins/units, replay/logs, and canonical checkpoint data.
 */
export function projectExperimentalPlayerView(
  match: Pick<ExperimentalMatchRecord, "id" | "revision" | "canonicalState">,
  actorTribe: number,
): ExperimentalPlayerView {
  const state = match.canonicalState;
  const visible = (x: number, y: number) => isVisibleTo(state, actorTribe, x, y);
  const cityAt = (x: number, y: number) => state.cities.find((city) => city.x === x && city.y === y);
  return {
    protocol: EXPERIMENTAL_AUTHORITY_PROTOCOL,
    experimental: true,
    matchId: match.id,
    revision: match.revision,
    size: state.size,
    phase: state.phase,
    turn: state.turn,
    currentTribe: state.currentTribe,
    yourTribe: actorTribe,
    tiles: state.tiles.map((tile) => {
      const discovered = tile.explored[actorTribe] === true;
      if (!discovered) return { x: tile.x, y: tile.y, discovered: false };
      const liveVisible = visible(tile.x, tile.y);
      const city = cityAt(tile.x, tile.y);
      return {
        x: tile.x,
        y: tile.y,
        discovered: true,
        terrain: tile.terrain,
        ...(liveVisible ? { resource: tile.resource, ruin: tile.ruin, greatRuin: tile.greatRuin } : {}),
        ...(city && (liveVisible || city.tribe === actorTribe) ? {
          city: { name: city.name, tribe: city.tribe, level: city.level, walls: city.walls === true },
        } : {}),
      };
    }),
    units: state.units
      .filter((unit) => unit.tribe === actorTribe || visible(unit.x, unit.y))
      .map((unit) => ({
        id: unit.id,
        type: unit.type,
        tribe: unit.tribe,
        x: unit.x,
        y: unit.y,
        hp: unit.hp,
        maxHp: unit.maxHp,
        moved: unit.tribe === actorTribe ? unit.moved : false,
        attacked: unit.tribe === actorTribe ? unit.attacked : false,
      })),
    you: {
      stars: state.tribes[actorTribe]?.stars ?? 0,
      techs: [...(state.tribes[actorTribe]?.techs ?? [])],
      pendingChoice: pendingChoice(state),
    },
    outcome: { winner: state.winner },
  };
}
