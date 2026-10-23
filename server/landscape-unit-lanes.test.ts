import { describe, expect, it } from "vitest";
import { idx, type GameState, type Terrain, type Tile, type Unit } from "../client/src/game/core/types";
import {
  forestUnitLanePlacements,
  mountainUnitLaneTransform,
  unitLaneCellSignature,
  visibleUnitLaneCells,
} from "../client/src/game/render/landscapeUnitLanes";
import { forestTreeCount } from "../client/src/game/render/landscapePilot";

const SIZE = 8;

function tile(x: number, y: number, terrain: Terrain = "grass"): Tile {
  return {
    x, y, terrain, resource: null, cityId: null, ownerCityId: null,
    explored: [false, false], port: null, ruin: false, greatRuin: false,
  };
}

function unit(id: number, tribe: number, x: number, y: number, guardian = false): Unit {
  return {
    id, tribe, x, y, guardian, type: "warrior", hp: 10, maxHp: 10,
    moved: false, attacked: false, kills: 0, boat: false,
  };
}

/** This helper deliberately exercises only the GameState fields the pure API reads. */
function laneState(): GameState {
  return {
    size: SIZE,
    humanTribe: 0,
    tiles: Array.from({ length: SIZE * SIZE }, (_, cell) => tile(cell % SIZE, Math.floor(cell / SIZE))),
    units: [],
    cities: [],
  } as GameState;
}

function at(s: GameState, x: number, y: number): Tile {
  return s.tiles[idx(x, y, s.size)]!;
}

describe("landscape unit lanes", () => {
  it("is entirely opt-in and preserves every authored forest placement when unflagged", () => {
    const s = laneState();
    s.units = [unit(1, 0, 3, 3)];
    at(s, 3, 3).explored[0] = true;

    expect(visibleUnitLaneCells(s, false)).toEqual(new Set());
    expect(unitLaneCellSignature(s, idx(3, 3, SIZE), false)).toBe("");
    expect(forestUnitLanePlacements(3, 3, 4, true, false)).toEqual([
      { index: 0, x: -0.26, z: -0.24, scale: 1 },
      { index: 1, x: 0, z: 0, scale: 1 },
      { index: 2, x: 0.26, z: 0.24, scale: 1 },
      { index: 3, x: 0.08, z: -0.32, scale: 1 },
    ]);
    expect(forestUnitLanePlacements(3, 3, 4, false, true)).toEqual(
      forestUnitLanePlacements(3, 3, 4, false, false),
    );
    expect(mountainUnitLaneTransform(3, 3, true, false)).toEqual({ x: 0, z: 0, scale: 1 });
    expect(mountainUnitLaneTransform(3, 3, false, true)).toEqual({ x: 0, z: 0, scale: 1 });
  });

  it("matches syncUnits fog rules without leaking a hidden enemy, while keeping explored guardians and own units", () => {
    const s = laneState();
    // No city sight. The human unit is intentionally more than two cells from
    // the ordinary enemy, so that enemy is explored but not currently visible.
    s.units = [
      unit(1, 0, 0, 0),
      unit(2, 1, 5, 5),
      unit(3, -1, 6, 5, true),
      unit(4, 0, 2, 2),
      unit(5, 1, 4, 4),
    ];
    at(s, 5, 5).explored[0] = true;
    at(s, 6, 5).explored[0] = true;
    at(s, 2, 2).explored[0] = true;
    at(s, 4, 4).explored[0] = false;
    at(s, 2, 2).terrain = "forest";
    at(s, 6, 5).terrain = "mountain";

    const initially = visibleUnitLaneCells(s, true);
    expect(initially).toEqual(new Set([idx(2, 2, SIZE), idx(6, 5, SIZE)]));
    expect(initially.has(idx(5, 5, SIZE))).toBe(false);
    expect(initially.has(idx(4, 4, SIZE))).toBe(false);

    // Crossing into the exact two-cell sight boundary makes the enemy eligible.
    s.units[0]!.x = 3;
    s.units[0]!.y = 5;
    const visible = visibleUnitLaneCells(s, true);
    expect(visible.has(idx(5, 5, SIZE))).toBe(true);
    expect(unitLaneCellSignature(s, idx(5, 5, SIZE), true)).toBe("unit-lane");

    // A fresh signature consults live vision again. A formerly visible enemy
    // cannot leave a stale geometry lane after the human moves away.
    s.units[0]!.x = 0;
    s.units[0]!.y = 0;
    expect(unitLaneCellSignature(s, idx(5, 5, SIZE), true)).toBe("");
  });

  it("restores the authored forest after a visible unit leaves and never opens a hidden rival forest", () => {
    const s = laneState();
    const forestCell = idx(3, 3, SIZE);
    const hiddenForestCell = idx(6, 6, SIZE);
    at(s, 3, 3).terrain = "forest";
    at(s, 6, 6).terrain = "forest";
    at(s, 3, 3).explored[0] = true;
    at(s, 6, 6).explored[0] = true;
    s.units = [
      unit(1, 0, 3, 3),
      // Explored but outside live human sight: this rival must not make its
      // forest layout expose occupancy through a cleared centre lane.
      unit(2, 1, 6, 6),
    ];

    expect(visibleUnitLaneCells(s, true)).toEqual(new Set([forestCell]));
    expect(unitLaneCellSignature(s, forestCell, true)).toBe("unit-lane");
    const occupied = forestUnitLanePlacements(3, 3, 4, true, true);
    expect(occupied).toHaveLength(3);
    expect(occupied.at(-1)!.scale).toBeGreaterThan(1);
    expect(unitLaneCellSignature(s, hiddenForestCell, true)).toBe("");
    expect(forestUnitLanePlacements(6, 6, 4, false, true)).toEqual(
      forestUnitLanePlacements(6, 6, 4, false, false),
    );

    // The next state is a genuine leave, rather than a cached placement list:
    // a renderer must reconstruct the full authored grouping on this tile.
    s.units[0]!.x = 2;
    s.units[0]!.y = 3;
    expect(unitLaneCellSignature(s, forestCell, true)).toBe("");
    expect(forestUnitLanePlacements(3, 3, 4, false, true)).toEqual([
      { index: 0, x: -0.26, z: -0.24, scale: 1 },
      { index: 1, x: 0, z: 0, scale: 1 },
      { index: 2, x: 0.26, z: 0.24, scale: 1 },
      { index: 3, x: 0.08, z: -0.32, scale: 1 },
    ]);
  });

  it("restricts lane cells to land even for a drawable embarked unit", () => {
    const s = laneState();
    s.units = [unit(1, 0, 1, 1), unit(2, 0, 3, 3)];
    at(s, 1, 1).terrain = "water";
    at(s, 3, 3).terrain = "ocean";
    at(s, 1, 1).explored[0] = true;
    at(s, 3, 3).explored[0] = true;

    expect(visibleUnitLaneCells(s, true)).toEqual(new Set());
  });

  it("opens an occupied forest into small outer trees plus one taller edge tree", () => {
    const first = forestUnitLanePlacements(4, 6, 4, true, true);
    expect(first).toEqual(forestUnitLanePlacements(4, 6, 4, true, true));
    expect(first).toHaveLength(3);
    expect(first.map(tree => tree.index)).toEqual([0, 1, 2]);
    for (const tree of first.slice(0, -1)) {
      expect(Math.abs(tree.x)).toBeGreaterThanOrEqual(0.27);
      expect(Math.abs(tree.x)).toBeLessThanOrEqual(0.325);
      expect(Math.abs(tree.z)).toBeGreaterThanOrEqual(0.27);
      expect(Math.abs(tree.z)).toBeLessThanOrEqual(0.325);
      expect(tree.scale).toBeGreaterThanOrEqual(0.64);
      expect(tree.scale).toBeLessThanOrEqual(0.71);
    }
    const edge = first.at(-1)!;
    expect(Math.abs(edge.x)).toBeGreaterThanOrEqual(0.27);
    expect(Math.abs(edge.x)).toBeLessThanOrEqual(0.325);
    expect(Math.abs(edge.z)).toBeGreaterThanOrEqual(0.31);
    expect(Math.abs(edge.z)).toBeLessThanOrEqual(0.345);
    expect(edge.scale).toBeGreaterThanOrEqual(1.06);
    expect(edge.scale).toBeLessThanOrEqual(1.15);
  });

  it("keeps fuller authored forests unoccupied and restores them exactly after a visible occupant leaves", () => {
    for (const [kind, authoredCount] of [["conifer", 4], ["pine", 3], ["palm", 2], ["acacia", 2]] as const) {
      const full = forestUnitLanePlacements(7, 4, authoredCount, false, true);
      const cleared = forestUnitLanePlacements(7, 4, authoredCount, true, true);
      expect(full).toHaveLength(authoredCount);
      expect(full.every(tree => tree.scale === 1)).toBe(true);
      expect(cleared).toHaveLength(Math.min(3, authoredCount));
      expect(cleared.at(-1)!.scale).toBeGreaterThan(1);
      expect(forestUnitLanePlacements(7, 4, authoredCount, false, true)).toEqual(full);
      void kind; // documents each real tree-family budget in this pure transform test.
    }
  });

  it("keeps every city-adjacent family root within its forest tile while opening and restoring locally", () => {
    const kinds = ["conifer", "pine", "palm", "acacia"] as const;
    for (let x = 0; x < 11; x++) for (let y = 0; y < 11; y++) {
      for (const kind of kinds) {
        // This is the actual vegetation policy for a forest one cell from a
        // settlement. The transform helper deliberately receives no city data:
        // it must only alter the forest's own local tree roots.
        const authoredCount = forestTreeCount(kind, x, y, true, true);
        const full = forestUnitLanePlacements(x, y, authoredCount, false, true);
        const open = forestUnitLanePlacements(x, y, authoredCount, true, true);

        expect(full).toHaveLength(authoredCount);
        expect(open).toHaveLength(Math.min(3, authoredCount));
        expect(open.at(-1)!.scale).toBeGreaterThan(1);
        // The group roots stay inside the +/-0.5 local half-tile boundary;
        // city meshes and tile picking are neither translated nor rebuilt.
        for (const tree of open) {
          expect(Math.abs(tree.x)).toBeLessThanOrEqual(0.345);
          expect(Math.abs(tree.z)).toBeLessThanOrEqual(0.345);
        }
        expect(forestUnitLanePlacements(x, y, authoredCount, false, true)).toEqual(full);
      }
    }
  });

  it("makes an occupied mountain deterministic, modestly offset, and never taller than the lane cap", () => {
    const transform = mountainUnitLaneTransform(5, 2, true, true);
    expect(transform).toEqual(mountainUnitLaneTransform(5, 2, true, true));
    expect(Math.abs(transform.x)).toBeGreaterThanOrEqual(0.16);
    expect(Math.abs(transform.x)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(transform.z)).toBeGreaterThanOrEqual(0.16);
    expect(Math.abs(transform.z)).toBeLessThanOrEqual(0.2);
    expect(transform.scale).toBeGreaterThan(0);
    expect(transform.scale).toBeLessThanOrEqual(0.7);
  });
});
