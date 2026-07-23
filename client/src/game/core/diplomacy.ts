// Sunder diplomacy — peace treaties & tribute demands with strength-based AI responses.
// Scope: human ↔ AI only; AI-AI pairs stay at war (bounded complexity).
// Relations are stored in GameState.peaceUntil: peaceUntil[a][b] = turn number until which
// the pair is at peace (exclusive). Symmetric — always write both directions.

import { GameState, UNIT_STATS } from "./types";

export const PEACE_TREATY_TURNS = 6;
export const TRIBUTE_AMOUNT = 5;

/** composite strength: army power + economy + territory */
export function strengthOf(s: GameState, tribe: number): number {
  let army = 0;
  for (const u of s.units) {
    if (u.tribe !== tribe) continue;
    const st = UNIT_STATS[u.type];
    army += (st.attack + st.defense) * (u.hp / u.maxHp) * (u.veteran ? 1.3 : 1);
  }
  const t = s.tribes[tribe];
  const cities = s.cities.filter((c) => c.tribe === tribe);
  const economy = t.stars * 0.35 + cities.reduce((a, c) => a + c.level, 0) * 2;
  return army + economy + cities.length * 3;
}

export function atPeace(s: GameState, a: number, b: number): boolean {
  if (a < 0 || b < 0 || a === b) return false;
  return (s.peaceUntil?.[a]?.[b] ?? 0) > s.turn;
}

export function peaceTurnsLeft(s: GameState, a: number, b: number): number {
  return Math.max(0, (s.peaceUntil?.[a]?.[b] ?? 0) - s.turn);
}

export function setPeace(s: GameState, a: number, b: number, untilTurn: number) {
  if (!s.peaceUntil) s.peaceUntil = {};
  if (!s.peaceUntil[a]) s.peaceUntil[a] = {};
  if (!s.peaceUntil[b]) s.peaceUntil[b] = {};
  s.peaceUntil[a][b] = untilTurn;
  s.peaceUntil[b][a] = untilTurn;
}

/** has this tribe already used its diplomatic action against `other` this turn? */
export function diploUsed(s: GameState, tribe: number, other: number): boolean {
  return (s.diploUsed ?? []).some((d) => d.turn === s.turn && d.from === tribe && d.to === other);
}

export function markDiploUsed(s: GameState, tribe: number, other: number) {
  if (!s.diploUsed) s.diploUsed = [];
  s.diploUsed = s.diploUsed.filter((d) => d.turn === s.turn); // prune old turns
  s.diploUsed.push({ turn: s.turn, from: tribe, to: other });
}

/** grudge: breaking a treaty early makes that rival refuse offers for the rest of the game */
export function hasGrudge(s: GameState, victim: number, offender: number): boolean {
  return (s.grudges ?? []).some((g) => g.holder === victim && g.against === offender);
}

export function addGrudge(s: GameState, victim: number, offender: number) {
  if (!s.grudges) s.grudges = [];
  if (!hasGrudge(s, victim, offender)) s.grudges.push({ holder: victim, against: offender });
}

/**
 * AI response to a HUMAN peace offer.
 * The AI accepts when it is not clearly dominant: fighting a peer costs more than truce.
 */
export function aiAcceptsPeace(s: GameState, ai: number, human: number): { accept: boolean; reason: string } {
  if (hasGrudge(s, ai, human)) return { accept: false, reason: "They have not forgotten your betrayal." };
  const ratio = strengthOf(s, ai) / Math.max(1, strengthOf(s, human));
  // dominant AI (>1.4x) refuses — it smells victory; otherwise accepts
  if (ratio > 1.4) return { accept: false, reason: "They sense weakness and refuse your terms." };
  return { accept: true, reason: ratio < 0.75 ? "They eagerly accept — your armies dwarf theirs." : "They accept the truce." };
}

/**
 * AI response to a HUMAN tribute demand.
 * Only a clearly weaker AI pays; a strong one refuses (and remembers the insult with a small grudge chance).
 */
export function aiPaysTribute(s: GameState, ai: number, human: number): { pay: boolean; amount: number; reason: string } {
  if (hasGrudge(s, ai, human)) return { pay: false, amount: 0, reason: "They have not forgotten your betrayal." };
  const ratio = strengthOf(s, ai) / Math.max(1, strengthOf(s, human));
  if (ratio < 0.6) {
    const amount = Math.min(TRIBUTE_AMOUNT, Math.max(0, s.tribes[ai].stars));
    if (amount === 0) return { pay: false, amount: 0, reason: "Their coffers are empty." };
    return { pay: true, amount, reason: "Cowed by your might, they pay." };
  }
  return { pay: false, amount: 0, reason: ratio > 1.2 ? "They laugh at your demand." : "They refuse to bend." };
}

/**
 * Should this AI proactively OFFER peace to a human this turn?
 * Fires when the AI is clearly losing the matchup and not already at peace.
 */
export function aiWantsPeaceWith(s: GameState, ai: number, human: number): boolean {
  if (atPeace(s, ai, human)) return false;
  if (hasGrudge(s, ai, human)) return false;
  if (diploUsed(s, ai, human)) return false;
  const ratio = strengthOf(s, ai) / Math.max(1, strengthOf(s, human));
  return ratio < 0.55; // clearly outmatched — sue for peace
}
