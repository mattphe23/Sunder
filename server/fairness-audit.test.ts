import { describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size;
  },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import { TRIBE_DEFS } from "../client/src/game/core/types";
import {
  FAIRNESS_EXPECTED_MATCHES,
  FAIRNESS_PRESETS,
  FAIRNESS_SEED_BASE,
  FAIRNESS_SEED_BLOCKS,
  measureInitialPlacements,
  mixedFourTribeFamilies,
} from "../scripts/lib/fairnessAudit";
import {
  buildPairedScenarioMatrix,
  ROTATIONS_PER_ROSTER,
} from "../scripts/lib/balancePaired";

describe("nominal-seat fairness audit matrix", () => {
  it("freezes a 512-match mixed-roster matrix while covering every designed tribe twice", () => {
    const families = mixedFourTribeFamilies(TRIBE_DEFS.length);
    const matrix = buildPairedScenarioMatrix({
      seedBase: FAIRNESS_SEED_BASE,
      blocks: FAIRNESS_SEED_BLOCKS,
      presets: FAIRNESS_PRESETS,
      rosterFamilies: families,
    });

    expect(matrix).toHaveLength(FAIRNESS_EXPECTED_MATCHES);
    expect(FAIRNESS_EXPECTED_MATCHES).toBe(512);
    expect(new Set(matrix.map(scenario => scenario.id)).size).toBe(512);
    expect(matrix.map(scenario => scenario.worldSeed)).toContain(FAIRNESS_SEED_BASE);
    expect(matrix.map(scenario => scenario.worldSeed)).toContain(
      FAIRNESS_SEED_BASE + FAIRNESS_SEED_BLOCKS - 1
    );
    expect(
      families.flatMap(family => family.originalRoster).sort((a, b) => a - b)
    ).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);

    for (const family of families) {
      const rotations = matrix.filter(
        scenario =>
          scenario.seedBlock === 0 &&
          scenario.preset === FAIRNESS_PRESETS[0] &&
          scenario.rosterId === family.id
      );
      expect(rotations).toHaveLength(ROTATIONS_PER_ROSTER);
      for (const definitionIndex of family.originalRoster) {
        expect(
          rotations
            .map(scenario => scenario.rosterRemappedIndices.indexOf(definitionIndex))
            .sort((a, b) => a - b)
        ).toEqual([0, 1, 2, 3]);
      }
    }
  });

  it("rejects a changed tribe count instead of silently auditing a different roster universe", () => {
    expect(() => mixedFourTribeFamilies(7)).toThrow(/exactly 8/i);
    expect(() => mixedFourTribeFamilies(9)).toThrow(/exactly 8/i);
  });
});

describe("nominal-seat fairness audit initial observations", () => {
  it("measures shipped GameStore map state and keeps nominal seat separate from opening position", () => {
    storage.clear();
    game.newGame({
      size: 11,
      humanTribe: 0,
      difficulty: "normal",
      seed: FAIRNESS_SEED_BASE,
      preset: "continents",
      roster: [0, 1, 4, 5],
    });
    const before = JSON.stringify(game.state);
    const placements = measureInitialPlacements(game.state);

    expect(JSON.stringify(game.state)).toBe(before);
    expect(placements).toHaveLength(4);
    expect(placements.map(placement => placement.nominalSeat)).toEqual([0, 1, 2, 3]);
    expect(
      placements.map(placement => placement.openingTurnPosition).sort((a, b) => a! - b!)
    ).toEqual([0, 1, 2, 3]);
    expect(placements.map(placement => placement.definitionIndex)).toEqual([0, 1, 4, 5]);
    // newGame begins the shuffled first turn before returning. The first actor
    // therefore has its legitimate turn-start income in the observed state;
    // later nominal seats retain their staggered initial-star values.
    expect(placements.map(placement => placement.initialStars)).toEqual([5, 6, 7, 11]);

    for (const placement of placements) {
      expect(placement.capital.x).toBeGreaterThanOrEqual(0);
      expect(placement.capital.y).toBeGreaterThanOrEqual(0);
      expect(placement.nearestOtherCityManhattan).not.toBeNull();
      expect(placement.nearestOpponentCapitalManhattan).not.toBeNull();
      expect(placement.legalReachableTiles).toBeGreaterThan(0);
      expect(placement.ownedResourceTotal).toBe(
        placement.ownedResources.fruit +
          placement.ownedResources.animal +
          placement.ownedResources.mineral
      );
      expect(placement.immediatelyHarvestableOwnedResources).toBeLessThanOrEqual(
        placement.ownedResourceTotal
      );
      expect(
        Object.values(placement.startingOwnedTerrain).reduce(
          (sum, count) => sum + count,
          0
        )
      ).toBeGreaterThan(0);
    }
  });
});
