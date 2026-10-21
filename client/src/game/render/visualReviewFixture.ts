import { generateMap, type MapPreset } from "../core/mapgen";
import { TRIBE_DEFS, UNIT_STATS, emptyStats, type GameState, type Tribe, type Unit, type UnitType } from "../core/types";
import { VISUAL_REVIEW_ROSTER } from "./visualReview";

/** Standalone visual fixture: no GameStore, localStorage, unlocks, rules changes, or save writes. */
export function createVisualReviewState(tribeIndex: number, seed = 6104, preset: MapPreset = "archipelago"): GameState {
  if (!Number.isInteger(tribeIndex) || tribeIndex < 0 || tribeIndex >= TRIBE_DEFS.length) throw new Error("Invalid visual tribe identity");
  const size = 11;
  const { tiles, cities, capitals } = generateMap(size, seed, 2, preset);
  const identities = [tribeIndex, tribeIndex === 1 ? 0 : 1];
  const tribes: Tribe[] = identities.map((defIndex, index) => {
    const def = TRIBE_DEFS[defIndex];
    return { ...def, index, defIndex, isHuman: index === 0, stars: 5, techs: [def.startTech], alive: true, score: 0 };
  });
  const capital = capitals[0];
  if (!capital) throw new Error("Review map lacks a capital");
  const distance = (t: { x: number; y: number }) => Math.abs(t.x - capital.x) + Math.abs(t.y - capital.y);
  const spots = tiles.filter(t => t.terrain !== "water" && t.terrain !== "ocean" && !t.greatRuin &&
    (t.cityId === null || (t.x === capital.x && t.y === capital.y)))
    .sort((a, b) => distance(a) - distance(b) || a.y - b.y || a.x - b.x);
  const roles: UnitType[] = VISUAL_REVIEW_ROSTER.filter(entry => entry.tribeIndex === tribeIndex).map(entry => entry.unitType);
  // Repeat the warrior on purpose: the same original GLB must load once and yield two independent units.
  const types: UnitType[] = ["warrior", ...roles.filter(type => type !== "warrior"), "warrior"];
  const units: Unit[] = types.map((type, i) => {
    const spot = spots[i];
    if (!spot) throw new Error("Insufficient review land");
    const stats = UNIT_STATS[type];
    return { id: i + 1, type, tribe: 0, x: spot.x, y: spot.y, hp: stats.hp, maxHp: stats.hp,
      moved: false, attacked: false, kills: 0, boat: false,
      ...(type === "hero" ? { hero: true, xp: 0, level: 1, perks: [] } : {}) };
  });
  for (const tile of tiles) {
    tile.explored[0] = units.some(unit => Math.max(Math.abs(tile.x - unit.x), Math.abs(tile.y - unit.y)) <= 2) ||
      Math.max(Math.abs(tile.x - capital.x), Math.abs(tile.y - capital.y)) <= 2;
  }
  return {
    phase: "playing", size, seed, preset, turn: 0, maxTurns: 30, difficulty: "normal", currentTribe: 0,
    tribes, tiles, cities, units, nextUnitId: units.length + 1, selectedUnitId: null, selectedCityId: null,
    winner: null, log: [], humanTribe: 0, humanTribes: [0], aiThinking: false, recap: [], showRecap: false,
    scoreHistory: [], stats: tribes.map(() => emptyStats()), pendingPerk: null, pendingCityReward: null,
    friendChallenge: null, showIntro: false, turnOrder: [0, 1], orderPos: 0,
  };
}
