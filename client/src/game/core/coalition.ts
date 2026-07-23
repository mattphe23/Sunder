// Sunder v21 — coalition coordination. When AIs pact against a runaway leader
// they should behave like a war council, not a mob:
//   • Target claims: each coalition member claims a distinct leader city per
//     turn so armies don't pile onto one target and trickle into the same wall.
//   • Staggered strikes: members earlier in turn order soften a city, later
//     members push the capture — claims persist within the world turn.
//   • Betrayal: when the common enemy is broken (no longer dominant), the
//     strongest coalition member turns on its weakest partner — pacts of
//     convenience end the moment convenience does.
import { GameState } from "./types";
import { strengthOf, atPeace } from "./diplomacy";

/** transient, per-world-turn target claims: tribe -> cityId */
const claims = new Map<number, { turn: number; cityId: number }>();

/** the coalition's common enemy, if a dominant leader exists */
export function commonEnemy(s: GameState): number | null {
  const alive = s.tribes.filter((t) => t.alive);
  if (alive.length < 3) return null;
  const sorted = [...alive].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  const rest = sorted.slice(1);
  const avgRest = rest.reduce((n, t) => n + strengthOf(s, t.index), 0) / rest.length;
  return strengthOf(s, leader.index) > avgRest * 1.5 ? leader.index : null;
}

/** true if this tribe is currently pacted with at least one other AI */
export function inCoalition(s: GameState, tribeIdx: number): boolean {
  return s.tribes.some((t) =>
    t.alive && !t.isHuman && t.index !== tribeIdx && atPeace(s, tribeIdx, t.index));
}

/**
 * Claim a leader city for this tribe this turn, avoiding cities already
 * claimed by pact partners. Returns the claimed city's coordinates, or null.
 */
export function claimCoalitionTarget(s: GameState, tribeIdx: number, enemy: number): { x: number; y: number; cityId: number } | null {
  // purge stale claims from earlier world turns
  const stale: number[] = [];
  claims.forEach((v, k) => { if (v.turn !== s.turn) stale.push(k); });
  stale.forEach((k) => claims.delete(k));
  const taken = new Set<number>();
  claims.forEach((v, k) => { if (k !== tribeIdx && v.turn === s.turn) taken.add(v.cityId); });

  const myUnits = s.units.filter((u) => u.tribe === tribeIdx);
  if (myUnits.length === 0) return null;
  const cx = myUnits.reduce((a, u) => a + u.x, 0) / myUnits.length;
  const cy = myUnits.reduce((a, u) => a + u.y, 0) / myUnits.length;

  const enemyCities = s.cities
    .filter((c) => c.tribe === enemy)
    .sort((a, b) => {
      // prefer unclaimed, then closest; capital is the final prize (soften others first)
      const ta = taken.has(a.id) ? 1000 : 0, tb = taken.has(b.id) ? 1000 : 0;
      const da = Math.max(Math.abs(a.x - cx), Math.abs(a.y - cy));
      const db = Math.max(Math.abs(b.x - cx), Math.abs(b.y - cy));
      return (ta + da + (a.isCapital ? 3 : 0)) - (tb + db + (b.isCapital ? 3 : 0));
    });
  if (enemyCities.length === 0) return null;
  const pick = enemyCities[0];
  claims.set(tribeIdx, { turn: s.turn, cityId: pick.id });
  return { x: pick.x, y: pick.y, cityId: pick.id };
}

/**
 * Betrayal check: with the common enemy broken, the strongest pact member
 * turns on the weakest. Ends the peace immediately and logs the treachery.
 * Returns the betrayed tribe index, or null.
 */
export function maybeBetray(s: GameState, tribeIdx: number): number | null {
  if (commonEnemy(s) !== null) return null; // the pact still has a purpose
  const partners = s.tribes.filter((t) =>
    t.alive && !t.isHuman && t.index !== tribeIdx && atPeace(s, tribeIdx, t.index));
  if (partners.length === 0) return null;
  const myStr = strengthOf(s, tribeIdx);
  const weakest = partners.sort((a, b) => strengthOf(s, a.index) - strengthOf(s, b.index))[0];
  // only betray from clear strength — honor is cheap, wars are not
  if (myStr < strengthOf(s, weakest.index) * 1.35) return null;
  // end the peace at once
  if (s.peaceUntil?.[tribeIdx]?.[weakest.index] !== undefined) {
    s.peaceUntil[tribeIdx][weakest.index] = s.turn;
    s.peaceUntil[weakest.index][tribeIdx] = s.turn;
  }
  s.log.unshift(`⚔ ${s.tribes[tribeIdx].name} betrayed ${weakest.name} — the pact is broken!`);
  return weakest.index;
}

/** test-only: reset transient claims between simulations */
export function _resetClaims() { claims.clear(); }
