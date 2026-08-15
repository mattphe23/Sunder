// Sunder v20 — asymmetric victory paths. Each faction has a signature win
// condition alongside domination and end-of-match score. Progress is derived
// from existing state (cities/techs/stats), so paths need no new persistence
// and stay backward-compatible with old saves.
import { GameState, TECHS, idx } from "./types";

export interface VictoryPathDef {
  id: string;
  name: string;
  /** short goal line for HUD/tooltips ("Research all 14 technologies") */
  goal: string;
  /** flavor line shown on the game-over screen when this path fires */
  flavor: string;
}

/* --------------------------------------------------------------------------
 * Path targets, all set by sweeping scripts/gameplay-audit.mts (120 AI-vs-AI
 * games per value) and scoring each config by its spread around the 25%
 * per-appearance win-rate baseline. The env overrides exist for those sweeps
 * and are read defensively — this module is bundled for the browser, where
 * `process` does not exist.
 * ------------------------------------------------------------------------ */
const knob = (name: string, fallback: number) =>
  Number((typeof process !== "undefined" ? process.env?.[name] : undefined) ?? fallback);

/** cumulative stars Vessari must loot from rivals to claim Plunder King.
 *  Raiders take 2★ per kill and Vessari plunders ~6★ per game, so this is
 *  about five successful raids. Swept over 8 / 10 / 12 / 14 / 18 / 24 / 30. */
export const PLUNDER_TARGET = knob("SUNDER_PLUNDER_TARGET", 10);
/** battles Kharzul must win for Bloodforge (was 18) */
export const BLOODFORGE_TARGET = knob("SUNDER_BLOODFORGE_TARGET", 22);
/** total city levels Sunwei must hold for Great Harvest (was 12) */
export const HARVEST_TARGET = knob("SUNDER_HARVEST_TARGET", 15);

/** path per TRIBE_DEFS index; the final entry (custom forge tribes) is the generic path */
export const VICTORY_PATHS: VictoryPathDef[] = [
  { id: "enlightenment", name: "Enlightenment", goal: `Research all ${TECHS.length} technologies`, flavor: "The Auren archives are complete — knowledge itself has conquered the Shatterlands." },
  { id: "bloodforge", name: "Bloodforge", goal: `Win ${BLOODFORGE_TARGET} battles`, flavor: "Kharzul's forges run red — no army dares stand against the Bloodforge." },
  { id: "greatharvest", name: "Great Harvest", goal: `Reach ${HARVEST_TARGET} total city levels`, flavor: "Sunwei's terraces feed a golden empire — the Great Harvest is gathered." },
  // v40: 45 → 35 stars banked. v42: measure LOOT TAKEN, not stars held.
  // Lowering the treasury target twice never worked — it still fired in 1% of
  // Vessari's games — because banking stars is anti-tempo by construction: the
  // path asked Vessari to stop playing in order to win. Counting cumulative
  // plunder instead rewards the thing that actually makes Vessari Vessari,
  // which is putting Raiders on top of other people's units.
  { id: "plunderking", name: "Plunder King", goal: `Plunder ${PLUNDER_TARGET} stars from your rivals`, flavor: "Vessari's saddlebags overflow — the Shatterlands' wealth rides with the Plunder King." },
  { id: "tidemastery", name: "Tide Mastery", goal: "Hold 4 ports on the open water", flavor: "Every current answers Nerivane — the tides themselves have chosen a master." },
  { id: "unbrokenwall", name: "Unbroken Wall", goal: "Hold 3 walled cities", flavor: "Dravok's ramparts blot out the horizon — the Unbroken Wall stands eternal." },
  { id: "stormlegend", name: "Storm Legend", goal: "Field 4 veteran units at once", flavor: "Valkyra's thunder never fades — an army of storm-tempered legends darkens the sky." },
  { id: "overgrowth", name: "Overgrowth", goal: "Hold 5 cities", flavor: "Mycelon's spores drift on every wind — the Shatterlands bloom beneath one endless canopy." },
  { id: "ascendance", name: "Ascendance", goal: "Reach 900 score", flavor: "A tribe forged from nothing now defines the age — the Shatterlands kneel to its ascendance." },
];

export interface VictoryProgress {
  def: VictoryPathDef;
  current: number;
  target: number;
  done: boolean;
}

/** progress toward a tribe's faction path (defIndex ≥ VICTORY_PATHS.length-1 ⇒ generic) */
export function victoryProgress(s: GameState, tribeIdx: number): VictoryProgress | null {
  const t = s.tribes[tribeIdx];
  if (!t || !t.alive) return null;
  const pathIdx = Math.min(t.defIndex, VICTORY_PATHS.length - 1);
  const def = VICTORY_PATHS[pathIdx];
  let current = 0, target = 1;
  switch (def.id) {
    case "enlightenment":
      current = t.techs.length; target = TECHS.length; break;
    case "bloodforge":
      current = s.stats[tribeIdx]?.battlesWon ?? 0; target = BLOODFORGE_TARGET; break;
    case "greatharvest":
      current = s.cities.filter((c) => c.tribe === tribeIdx).reduce((a, c) => a + c.level, 0); target = HARVEST_TARGET; break;
    case "plunderking":
      current = s.stats[tribeIdx]?.starsPlundered ?? 0; target = PLUNDER_TARGET; break;
    case "tidemastery":
      current = s.tiles.filter((tl) => tl.port === tribeIdx).length; target = 4; break;
    case "unbrokenwall":
      current = s.cities.filter((c) => c.tribe === tribeIdx && c.walls).length; target = 3; break;
    case "stormlegend":
      current = s.units.filter((u) => u.tribe === tribeIdx && u.veteran).length; target = 4; break;
    case "overgrowth":
      current = s.cities.filter((c) => c.tribe === tribeIdx).length; target = 5; break;
    case "ascendance":
      current = t.score; target = 900; break;
  }
  return { def, current: Math.min(current, target), target, done: current >= target };
}

/**
 * Check all living tribes for a completed faction path. Paths only unlock after
 * an early-game grace window so a lucky start can't end the match on turn 4.
 */
export const VICTORY_PATH_START_TURN = 8;

export function checkPathVictory(s: GameState): { tribe: number; progress: VictoryProgress } | null {
  if (s.phase !== "playing") return null;
  if (s.turn < VICTORY_PATH_START_TURN) return null;
  for (const t of s.tribes) {
    if (!t.alive) continue;
    const p = victoryProgress(s, t.index);
    if (p?.done) return { tribe: t.index, progress: p };
  }
  return null;
}

// keep the unused import warning away in isolated builds
void idx;
