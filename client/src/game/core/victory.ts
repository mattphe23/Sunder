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

/**
 * Cumulative stars Vessari must loot from rivals to claim Plunder King.
 *
 * v42 set this to 6 as damage control: the Raider paid `min(2, victim.stars)`
 * and rivals are broke often enough that the perk delivered nothing or half in
 * over a third of its kills, so the target had to be tiny to fire at all.
 * v47 made the payout flat (see GameStore.plunder), which roughly doubled
 * Vessari's throughput, so the goal line moves back up.
 *
 * Swept over 6 / 8 / 10 / 12 across three independent seed blocks. 8 and 10 are
 * balanced within noise (spread 31.7 vs 28.0, overlapping ranges); 8 wins
 * because the path completes in 21% of Vessari's games against 12.7% at 10,
 * which puts Plunder King in the same band as Great Harvest and Unbroken Wall
 * instead of back near the floor it started at.
 */
export const PLUNDER_TARGET = knob("SUNDER_PLUNDER_TARGET", 8);
/** battles Kharzul must win for Bloodforge (was 18) */
export const BLOODFORGE_TARGET = knob("SUNDER_BLOODFORGE_TARGET", 22);
/** total city levels Sunwei must hold for Great Harvest (was 12) */
export const HARVEST_TARGET = knob("SUNDER_HARVEST_TARGET", 15);
/**
 * Score Ascendance demands — the generic path every forged tribe inherits.
 *
 * This was 900 and it was a win button. Measured over 60 games with a forged
 * tribe that is an exact clone of Auren (same passive, same start tech, same
 * signature unit), seat 0 won 85% of matches against Auren's own 48% in the
 * identical seat and seeds — and all 51 wins came through Ascendance. The
 * reason is in the scores: the clone averaged 921, but Auren averaged 1587.
 * Every tribe sails past 900 in the normal course of play, so a path that asks
 * for it fires the moment paths unlock. The Forge was not stronger because
 * cherry-picking beat the designed pairings; it was stronger because it had a
 * far easier win condition bolted to it.
 *
 * Swept over 900 / 1400 / 1600 / 1700 / 1800 / 2200 / 2600 against that same
 * clone-vs-Auren control, across two independent seed blocks, 120 games per
 * point at the finalists:
 *
 *   900 -> 85.0%   1400 -> 61.7%   1600 -> 47.5%   1700 -> 44.2%
 *   1800 -> 36.7%  2200 -> 28.3%   2600 -> 26.7%      (control 48.3%)
 *
 * 1600 puts a forged tribe within a point of a designed one in the same seat on
 * the same seeds, which is the whole requirement: the Forge should be a way to
 * play differently, not a way to play stronger.
 */
export const ASCENDANCE_TARGET = knob("SUNDER_ASCENDANCE_TARGET", 1600);
/**
 * Veteran units Valkyra must field AT ONCE for Storm Legend.
 *
 * A unit becomes veteran at 3 kills, so a target of 4 asks for twelve kills
 * spread across four units that all survive to hold the board together.
 * At 4 it fired ONCE in 48 appearances, which is why Valkyra was the weakest
 * tribe in the pool — it was effectively playing with no victory path at all.
 *
 * Swept over 4 / 3 / 2 across two independent seed blocks, 96 games each:
 *
 *          block A            block B          balance spread
 *   4      17%                23%              50 / 42
 *   3      27%                25%              42 / 42
 *   2      48%                52%              67 / 63
 *
 * 3 lands on the 25% baseline in both blocks and is the only value that does.
 * 2 turns Valkyra into the strongest tribe in the pool by a distance.
 */
export const STORMLEGEND_TARGET = knob("SUNDER_STORMLEGEND_TARGET", 3);
/**
 * Consecutive rounds Dravok must keep WALL_HOLD_CITIES walls standing.
 *
 * This used to count walled cities: hold 3 of them. It completed in 13% of
 * Dravok's games, the lowest of any path, and no constant could fix it — 3 put
 * Dravok at 18% and 2 at 38%, a twenty-point step with no integer between, and
 * cutting the wall cost from 3 stars to 2 to 1 moved nothing, because the AI
 * already builds walls 95% of the time when chasing this path.
 *
 * scripts/tribe-diag.mts showed why: Dravok holds 2.36 cities on average and
 * the goal asked for 3 WALLED ones. It was not expensive, it was asking for
 * more cities than the tribe ever has.
 *
 * Endurance is the axis that fits both the fantasy and the tuning problem —
 * "unbroken" is a thing walls do over time, and rounds tune in single points
 * where city counts tune in twenties. The streak resets the moment the wall
 * count drops, which is the whole idea.
 */
export const UNBROKENWALL_TARGET = knob("SUNDER_UNBROKENWALL_TARGET", 6);
/** walled cities that must stand together for the streak to run */
export const WALL_HOLD_CITIES = knob("SUNDER_WALL_HOLD_CITIES", 2);
/** shallow-water tiles per port Tide Mastery demands — see tideTarget() */
export const TIDE_DIVISOR = knob("SUNDER_TIDE_DIVISOR", 4);

/**
 * Ports Nerivane must hold for Tide Mastery, scaled to how much coast the board
 * actually has.
 *
 * A flat 4 made this an archipelago-only win condition. Measuring 40 matches per
 * preset: Nerivane reached four ports in 53% of archipelago games but 8% on
 * continents, 5% on highlands and 3% on pangaea — and on three of the four it
 * finished holding ZERO remaining legal port sites. It was not neglecting the
 * path; highlands has four shallow-water tiles on the entire board, shared by
 * every tribe, so four ports for one of them is not reachable at all.
 *
 * Counted from the board rather than stored, like every other path, so old
 * saves keep working. Clamped to 2..4 so the goal never becomes trivial on a
 * flooded map or a formality on a dry one.
 *
 * The divisor was swept over 4 / 5 / 7 / 9 across three seed blocks. 4 is both
 * the most consistent (win-rate spread 22.0 against 27.0 at 5) and the one that
 * lands Nerivane closest to the 25% baseline, at 23.3%, with the path firing in
 * 21% of its games — up from 11% when the target was a flat 4.
 */
export function tideTarget(s: GameState): number {
  const shallow = s.tiles.reduce((n, t) => n + (t.terrain === "water" ? 1 : 0), 0);
  return Math.max(2, Math.min(4, Math.ceil(shallow / TIDE_DIVISOR)));
}

/* --------------------------------------------------------------------------
 * Board scaling.
 *
 * Every target above except Tide Mastery was swept on an 11x11 board with four
 * tribes and is a flat constant. That makes a bigger map a SHORTER game rather
 * than a roomier one: scripts/density-audit.mts measured 16.9 average turns at
 * 15x15 against 23.3 at 11x11, because more land means more cities, more city
 * levels and more battles, so a fixed goal line arrives sooner.
 *
 * `boardScale` is the correction — the room this board gives each tribe,
 * relative to the 11x11 the constants were tuned on, raised to an exponent:
 *
 *   alpha 0    flat targets; exactly the pre-existing behaviour
 *   alpha 1    fully proportional to land per tribe
 *
 * The exponent is a knob rather than a guess because the right answer is not
 * obviously 1. City levels track land closely; battles do not, since a bigger
 * board also means longer marches between the tribes that would fight. Swept by
 * scripts/path-scale-sweep.mts.
 * ------------------------------------------------------------------------ */

/**
 * The board the flat constants were swept on: 11x11, four tribes.
 *
 * Scaling is measured from NOMINAL board area per tribe, not from the land
 * actually generated. Counting real land looks more precise and is worse: land
 * per tribe varies by preset and by seed, so an 11x11 would land on a
 * multiplier near 1.0 but never exactly, and the default size — the only one
 * whose balance is already validated — would drift for no benefit. Measured
 * that way, 11x11's balance spread moved 43.8 -> 50.0 at alpha 0.35 while
 * fixing a problem 11x11 does not have. Nominal area is exactly 1.0 at the
 * reference board by construction, so every existing sweep stays valid and
 * only the larger boards change.
 */
const REFERENCE_SIZE = 11;
const REFERENCE_TRIBES = 4;
/**
 * Swept over 0 / 0.35 / 0.5 / 0.7 / 1.0 at sizes 13 and 15, 48 games each,
 * across two independent seed blocks (96 games per point), with the AI's RNG
 * seeded so the runs are reproducible — see scripts/_rng.mts for why that
 * mattered. Full table in docs/BOARD-SCALING.md.
 *
 * The trade is monotone: more scaling lengthens big-board matches back toward
 * the 11x11 baseline, and costs turn-cap rate and balance spread. 0.35 is the
 * value that lands on the reference board's character rather than just its
 * match length — 22.6 turns against 23.6, a 10.9% cap rate against 12.5%, and
 * a 48.5 balance spread against 45.3. 0.5 gets match length marginally closer
 * and pays 14 points of spread for it; by 1.0 a third of matches time out.
 *
 * 0.35 is also the most stable across the two blocks: at size 13 it returned
 * an identical 43.8 spread in both, where 0.5 disagreed 62.5 vs 75.0.
 */
export const PATH_SCALE_ALPHA = 0.35;

/**
 * Read at call time rather than module load so a sweep can drive it per process
 * without import order mattering. `process` is absent in the browser, where this
 * always resolves to the default.
 */
function scaleAlpha(): number {
  const env = typeof process !== "undefined" ? process.env?.SUNDER_PATH_SCALE_ALPHA : undefined;
  return env === undefined ? PATH_SCALE_ALPHA : Number(env);
}

export function boardScale(s: GameState): number {
  const alpha = scaleAlpha();
  if (!alpha) return 1;
  const share = (s.size * s.size) / Math.max(1, s.tribes.length);
  const reference = (REFERENCE_SIZE * REFERENCE_SIZE) / REFERENCE_TRIBES;
  return Math.pow(share / reference, alpha);
}

/** a flat target rescaled to this board, never below `floor` */
function scaled(base: number, s: GameState, floor: number): number {
  return Math.max(floor, Math.round(base * boardScale(s)));
}

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
  // goal text is rewritten per board in victoryProgress — see tideTarget()
  { id: "tidemastery", name: "Tide Mastery", goal: "Hold the coast's ports", flavor: "Every current answers Nerivane — the tides themselves have chosen a master." },
  { id: "unbrokenwall", name: "Unbroken Wall", goal: "Hold walled cities, unbroken", flavor: "Dravok's ramparts blot out the horizon — the Unbroken Wall stands eternal." },
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
  let def = VICTORY_PATHS[pathIdx];
  let current = 0, target = 1;
  // Every board-scaled path rewrites its own goal line the way Tide Mastery
  // does. The static strings in VICTORY_PATHS are built from the unscaled
  // constants, so on any board but the 11x11 they were tuned on they would
  // show the player a number the engine is not using.
  switch (def.id) {
    case "enlightenment":
      current = t.techs.length; target = TECHS.length; break;
    case "bloodforge":
      current = s.stats[tribeIdx]?.battlesWon ?? 0; target = scaled(BLOODFORGE_TARGET, s, 8);
      def = { ...def, goal: `Win ${target} battles` }; break;
    case "greatharvest":
      current = s.cities.filter((c) => c.tribe === tribeIdx).reduce((a, c) => a + c.level, 0); target = scaled(HARVEST_TARGET, s, 6);
      def = { ...def, goal: `Reach ${target} total city levels` }; break;
    case "plunderking":
      current = s.stats[tribeIdx]?.starsPlundered ?? 0; target = scaled(PLUNDER_TARGET, s, 4);
      def = { ...def, goal: `Plunder ${target} stars from your rivals` }; break;
    case "tidemastery": {
      current = s.tiles.filter((tl) => tl.port === tribeIdx).length;
      target = tideTarget(s);
      // the only path whose goal depends on the map, so it states the real number
      def = { ...def, goal: `Hold ${target} ports on the open water` };
      break;
    }
    case "unbrokenwall":
      current = t.wallStreak ?? 0; target = UNBROKENWALL_TARGET;
      def = { ...def, goal: `Hold ${WALL_HOLD_CITIES} walled cities for ${target} rounds` }; break;
    case "stormlegend":
      current = s.units.filter((u) => u.tribe === tribeIdx && u.veteran).length; target = scaled(STORMLEGEND_TARGET, s, 2);
      def = { ...def, goal: `Field ${target} veteran units at once` }; break;
    case "overgrowth":
      current = s.cities.filter((c) => c.tribe === tribeIdx).length; target = scaled(5, s, 3);
      def = { ...def, goal: `Hold ${target} cities` }; break;
    case "ascendance":
      current = t.score; target = scaled(ASCENDANCE_TARGET, s, 400);
      def = { ...def, goal: `Reach ${target} score` }; break;
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
