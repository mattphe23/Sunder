import { canHarvest, reachableTiles } from "../../client/src/game/core/rules";
import type { GameState, Terrain } from "../../client/src/game/core/types";
import { ROTATIONS_PER_ROSTER, type RosterFamily } from "./balancePaired";

export const FAIRNESS_PRESETS = ["continents", "archipelago"] as const;
export const FAIRNESS_SEED_BASE = 8_194_401;
export const FAIRNESS_SEED_BLOCKS = 16;
export const FAIRNESS_TURN_CAP = 30;
export const FAIRNESS_EXPECTED_MATCHES =
  FAIRNESS_SEED_BLOCKS *
  FAIRNESS_PRESETS.length *
  ROTATIONS_PER_ROSTER *
  4;

const TERRAINS: readonly Terrain[] = [
  "ocean",
  "water",
  "grass",
  "forest",
  "mountain",
];

export interface TerrainCounts {
  ocean: number;
  water: number;
  grass: number;
  forest: number;
  mountain: number;
}

export interface ResourceCounts {
  fruit: number;
  animal: number;
  mineral: number;
}

export interface InitialPlacementMetrics {
  nominalSeat: number;
  openingTurnPosition: number | null;
  definitionIndex: number;
  tribeName: string;
  capital: { x: number; y: number };
  initialStars: number;
  initialTechs: string[];
  startingOwnedTerrain: TerrainCounts;
  capitalAdjacentTerrain: TerrainCounts;
  ownedResources: ResourceCounts;
  ownedResourceTotal: number;
  immediatelyHarvestableOwnedResources: number;
  legalReachableTiles: number;
  legalReachableNeutralExpansionTiles: number;
  legalReachableNeutralVillages: number;
  legalReachableTerrain: TerrainCounts;
  nearestNeutralCityManhattan: number | null;
  nearestOtherCityManhattan: number | null;
  nearestOpponentCapitalManhattan: number | null;
}

function emptyTerrainCounts(): TerrainCounts {
  return { ocean: 0, water: 0, grass: 0, forest: 0, mountain: 0 };
}

function emptyResourceCounts(): ResourceCounts {
  return { fruit: 0, animal: 0, mineral: 0 };
}

function manhattan(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function nearestDistance(
  from: { x: number; y: number },
  candidates: readonly { x: number; y: number }[]
): number | null {
  if (candidates.length === 0) return null;
  return Math.min(...candidates.map(candidate => manhattan(from, candidate)));
}

/**
 * Four mixed rosters. Each of the eight released definitions appears twice;
 * each appearance visits every nominal engine seat through cyclic rotations.
 *
 * This is deliberately not an all-matchup ranking: it samples mixed
 * four-tribe interactions while avoiding a roster that silently excludes a
 * designed tribe.
 */
export function mixedFourTribeFamilies(
  definitionCount: number
): RosterFamily[] {
  if (definitionCount !== 8) {
    throw new Error(
      `The frozen mixed fairness matrix requires exactly 8 tribe definitions; received ${definitionCount}.`
    );
  }
  return [
    { id: "mixed-01", originalRoster: [0, 1, 4, 5] },
    { id: "mixed-02", originalRoster: [2, 3, 6, 7] },
    { id: "mixed-03", originalRoster: [0, 2, 5, 7] },
    { id: "mixed-04", originalRoster: [1, 3, 4, 6] },
  ];
}

/**
 * Measure only a fresh, generated GameStore state. `reachableTiles` and
 * `canHarvest` are the shipped rule predicates: no synthetic pathing,
 * territory, visibility, or resource rules are introduced by the audit.
 */
export function measureInitialPlacements(
  state: GameState
): InitialPlacementMetrics[] {
  const openingOrder = state.turnOrder ?? state.tribes.map(tribe => tribe.index);

  return state.tribes.map(tribe => {
    const capital = state.cities.find(
      city => city.tribe === tribe.index && city.isCapital
    );
    if (!capital) {
      throw new Error(`Missing capital for nominal seat ${tribe.index}.`);
    }

    const startingOwnedTerrain = emptyTerrainCounts();
    const capitalAdjacentTerrain = emptyTerrainCounts();
    const ownedResources = emptyResourceCounts();
    let immediatelyHarvestableOwnedResources = 0;

    for (const tile of state.tiles) {
      if (tile.ownerCityId === capital.id) {
        startingOwnedTerrain[tile.terrain] += 1;
        if (tile.resource) {
          ownedResources[tile.resource] += 1;
          if (canHarvest(state, tribe.index, tile)) {
            immediatelyHarvestableOwnedResources += 1;
          }
        }
      }
      if (
        Math.max(Math.abs(tile.x - capital.x), Math.abs(tile.y - capital.y)) ===
        1
      ) {
        capitalAdjacentTerrain[tile.terrain] += 1;
      }
    }

    const reachable = new Set<number>();
    for (const unit of state.units) {
      if (unit.tribe !== tribe.index) continue;
      for (const tile of reachableTiles(state, unit)) {
        reachable.add(tile.y * state.size + tile.x);
      }
    }
    const legalReachableTerrain = emptyTerrainCounts();
    let legalReachableNeutralExpansionTiles = 0;
    let legalReachableNeutralVillages = 0;
    for (const tileIndex of reachable) {
      const tile = state.tiles[tileIndex];
      legalReachableTerrain[tile.terrain] += 1;
      if (tile.ownerCityId === null) {
        legalReachableNeutralExpansionTiles += 1;
        const city = tile.cityId === null ? null : state.cities[tile.cityId];
        if (city?.tribe === null) legalReachableNeutralVillages += 1;
      }
    }

    const otherCities = state.cities.filter(city => city.tribe !== tribe.index);
    const neutralCities = otherCities.filter(city => city.tribe === null);
    const opponentCapitals = otherCities.filter(
      city => city.tribe !== null && city.isCapital
    );
    const ownedResourceTotal = Object.values(ownedResources).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      nominalSeat: tribe.index,
      openingTurnPosition: openingOrder.indexOf(tribe.index),
      definitionIndex: tribe.defIndex,
      tribeName: tribe.name,
      capital: { x: capital.x, y: capital.y },
      initialStars: tribe.stars,
      initialTechs: [...tribe.techs],
      startingOwnedTerrain,
      capitalAdjacentTerrain,
      ownedResources,
      ownedResourceTotal,
      immediatelyHarvestableOwnedResources,
      legalReachableTiles: reachable.size,
      legalReachableNeutralExpansionTiles,
      legalReachableNeutralVillages,
      legalReachableTerrain,
      nearestNeutralCityManhattan: nearestDistance(capital, neutralCities),
      nearestOtherCityManhattan: nearestDistance(capital, otherCities),
      nearestOpponentCapitalManhattan: nearestDistance(
        capital,
        opponentCapitals
      ),
    };
  });
}
