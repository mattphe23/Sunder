// Fatalities — the rare, earned kill that gets a cinematic.
//
// The routine death already has its answer: `shatterUnit()` bursts a unit into
// its component meshes in well under a second and never interrupts anything.
// That stays exactly as it is. It is the whole combat experience and it should
// be, because the tenth kill of a match must never cost the player time.
//
// A fatality is the opposite bet. It stops the game, pushes the camera in, and
// spends three seconds on one death. That is only worth doing if it happens
// rarely enough that the player has not seen it recently — scarcity is the
// feature, not a limitation of it. Everything in this file exists to keep it
// rare, and the rules are here rather than inline at the three call sites so
// that "how often does this actually fire" is one readable thing.
//
// The three triggers, and why each earns it:
//
//   commander  a hero is permanently dead — no respawn, the tribe carries
//              `heroFell` for the rest of the match. It is the single most
//              consequential unit loss in the game.
//   capital    a capital falls, which eliminates a tribe outright.
//   final      the blow that ends the match. This one is never budget-limited:
//              nothing follows it, so it cannot outstay its welcome.
import type { GameState } from "./types";

export type FatalityKind = "commander" | "capital" | "final";

export interface FatalitySpec {
  kind: FatalityKind;
  /** tile the camera pushes in on */
  x: number;
  y: number;
  /** unit whose mesh gets the exaggerated shatter; absent for a capital fall */
  unitId?: number;
  victimTribe: number;
  killerTribe: number;
  victimName: string;
  killerName: string;
  /** true when the player is the one being finished — changes the copy */
  againstHuman: boolean;
}

/**
 * Budget per match for the two mid-game triggers.
 *
 * Two, not one: a match where you take a rival capital AND kill their commander
 * has earned both, and they are far enough apart in a normal game that they do
 * not read as a habit. `final` is deliberately outside this budget.
 */
export const FATALITY_BUDGET = 2;

/** Fatalities are cinematic, so a headless or spectated board must never wait on one. */
function humanIsInvolved(s: GameState, victimTribe: number, killerTribe: number): boolean {
  return s.humanTribe >= 0 && (victimTribe === s.humanTribe || killerTribe === s.humanTribe);
}

/**
 * Should this moment get the cinematic?
 *
 * Deliberately conservative — every rule here is a reason to NOT play one:
 *
 *  - AI-vs-AI drama is recapped in text, never staged. Spectating a board would
 *    otherwise stop dead for three seconds on someone else's kill.
 *  - Challenge runs (the closest thing Sunder has to ranked) never play them.
 *    A daily is scored on turns and score, and a player replaying it for a
 *    better time should not pay three seconds for the same kill twice.
 *  - Never two in one turn. A single big assault can drop a commander and take
 *    a capital in the same breath, and back-to-back cinematics turn a high
 *    point into an interruption.
 *  - Never past the budget, except the match-ending blow.
 */
export function fatalityAllowed(s: GameState, kind: FatalityKind, victimTribe: number, killerTribe: number): boolean {
  if (!humanIsInvolved(s, victimTribe, killerTribe)) return false;
  if (s.challenge) return false;
  // Checked here rather than in the renderer so a player who turned them off
  // does not silently burn the match's budget on cinematics nobody sees.
  if (!fatalitiesEnabled()) return false;
  if (kind === "final") return true;
  if (s.fatalityTurn === s.turn) return false;
  return (s.fatalitiesPlayed ?? 0) < FATALITY_BUDGET;
}

/** Record that one played, so the budget and the once-per-turn rule mean something. */
export function markFatality(s: GameState, kind: FatalityKind): void {
  if (kind === "final") return; // outside the budget by design
  s.fatalitiesPlayed = (s.fatalitiesPlayed ?? 0) + 1;
  s.fatalityTurn = s.turn;
}

/* ---------- player preference ---------- */

const PREF_KEY = "polyforge-fatalities";

/**
 * On by default — the feature is the reason someone tells a friend about the
 * game, so it has to be seen without being found in a menu first. Off is one
 * tap away and sticks.
 *
 * `prefers-reduced-motion` overrides the stored preference. A hard camera
 * push-in with a shatter is exactly the kind of motion that setting exists to
 * suppress, and honouring it is not optional just because the animation is the
 * point.
 */
export function fatalitiesEnabled(): boolean {
  try {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return localStorage.getItem(PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setFatalitiesEnabled(on: boolean): void {
  try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch { /* private mode */ }
}
