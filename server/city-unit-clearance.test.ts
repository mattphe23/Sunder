import { describe, expect, it } from "vitest";
import {
  idx,
  type GameState,
  type Terrain,
  type Tile,
  type Unit,
} from "../client/src/game/core/types";
import {
  AUREN_SWORDSMAN_CITY_CLEARANCE_ASSET_ID,
  AUREN_SWORDSMAN_CITY_CLEARANCE_MODEL_URL,
  CITY_OCCUPANCY_CLEARANCE_CAPSULE_RADIUS,
  cityOccupiedStructureTransform,
  isPotentialAurenSwordsmanCityClearanceUnit,
  isReadyAurenSwordsmanCityClearanceUnit,
  potentialAurenSwordsmanCityClearanceCells,
} from "../client/src/game/render/cityUnitClearance";

const SIZE = 7;

function tile(x: number, y: number, terrain: Terrain = "grass"): Tile {
  return {
    x,
    y,
    terrain,
    resource: null,
    cityId: null,
    ownerCityId: null,
    explored: [false, false],
    port: null,
    ruin: false,
    greatRuin: false,
  };
}

function swordsman(id = 9, tribe = 0, x = 3, y = 3): Unit {
  return {
    id,
    type: "swordsman",
    tribe,
    x,
    y,
    hp: 15,
    maxHp: 15,
    moved: false,
    attacked: false,
    kills: 0,
    boat: false,
  };
}

/** The helper deliberately reads only this small renderer-facing state surface. */
function state(): GameState {
  const s = {
    size: SIZE,
    humanTribe: 0,
    tiles: Array.from({ length: SIZE * SIZE }, (_, cell) =>
      tile(cell % SIZE, Math.floor(cell / SIZE))
    ),
    units: [swordsman()],
    cities: [
      {
        id: 0,
        x: 3,
        y: 3,
        name: "Auren Hold",
        tribe: 0,
        level: 1,
        population: 0,
        isCapital: true,
      },
    ],
    tribes: [
      { index: 0, defIndex: 0, color: "#6688aa" },
      { index: 1, defIndex: 1, color: "#aa8866" },
    ],
  } as GameState;
  const city = s.tiles[idx(3, 3, SIZE)]!;
  city.cityId = 0;
  city.explored[0] = true;
  return s;
}

const exactReady = {
  visualBeta: true,
  visualImportState: "ready",
  visualAssetId: AUREN_SWORDSMAN_CITY_CLEARANCE_ASSET_ID,
  visualModelUrl: AUREN_SWORDSMAN_CITY_CLEARANCE_MODEL_URL,
} as const;

describe("city unit clearance", () => {
  it("is default-off and never creates a city surface until New visuals is explicitly enabled", () => {
    const s = state();
    const unit = s.units[0]!;

    expect(isPotentialAurenSwordsmanCityClearanceUnit(s, unit, false)).toBe(
      false
    );
    expect(
      isReadyAurenSwordsmanCityClearanceUnit(s, unit, exactReady, false)
    ).toBe(false);
    expect(potentialAurenSwordsmanCityClearanceCells(s, false)).toEqual(
      new Set()
    );
  });

  it("requires the exact ready Auren ordinary-land Swordsman candidate, not merely a beta visual", () => {
    const s = state();
    const unit = s.units[0]!;

    expect(isPotentialAurenSwordsmanCityClearanceUnit(s, unit, true)).toBe(
      true
    );
    expect(
      isReadyAurenSwordsmanCityClearanceUnit(s, unit, exactReady, true)
    ).toBe(true);
    for (const metadata of [
      { ...exactReady, visualBeta: false },
      { ...exactReady, visualImportState: "loading" },
      { ...exactReady, visualImportState: "deferred" },
      { ...exactReady, visualImportState: "failed" },
      { ...exactReady, visualAssetId: "other-asset" },
      { ...exactReady, visualModelUrl: "/manus-storage/other.glb" },
      undefined,
    ]) {
      expect(
        isReadyAurenSwordsmanCityClearanceUnit(s, unit, metadata, true)
      ).toBe(false);
    }
  });

  it("excludes all nonordinary, boat, guardian, raider, skin, forged, and other-identity paths", () => {
    const s = state();
    const unit = s.units[0]!;
    const exclusions: Unit[] = [
      { ...unit, type: "knight" },
      { ...unit, type: "warrior" },
      { ...unit, type: "hero", hero: true },
      { ...unit, boat: true },
      { ...unit, guardian: true },
      { ...unit, raider: true },
    ];
    for (const excluded of exclusions)
      expect(
        isPotentialAurenSwordsmanCityClearanceUnit(s, excluded, true)
      ).toBe(false);

    expect(
      isPotentialAurenSwordsmanCityClearanceUnit(s, unit, true, true)
    ).toBe(false);
    s.tribes[0]!.customHeadgear = "crown";
    expect(isPotentialAurenSwordsmanCityClearanceUnit(s, unit, true)).toBe(
      false
    );
    delete s.tribes[0]!.customHeadgear;
    s.tribes[0]!.defIndex = 1;
    expect(isPotentialAurenSwordsmanCityClearanceUnit(s, unit, true)).toBe(
      false
    );
  });

  it("is city-only, land-only, in-bounds, and nonmutating", () => {
    const s = state();
    const before = structuredClone(s);
    const unit = s.units[0]!;

    s.tiles[idx(unit.x, unit.y, SIZE)]!.cityId = null;
    expect(isPotentialAurenSwordsmanCityClearanceUnit(s, unit, true)).toBe(
      false
    );
    s.tiles[idx(unit.x, unit.y, SIZE)]!.cityId = 0;
    s.tiles[idx(unit.x, unit.y, SIZE)]!.terrain = "water";
    expect(isPotentialAurenSwordsmanCityClearanceUnit(s, unit, true)).toBe(
      false
    );
    s.tiles[idx(unit.x, unit.y, SIZE)]!.terrain = "grass";
    expect(
      isPotentialAurenSwordsmanCityClearanceUnit(s, { ...unit, x: -1 }, true)
    ).toBe(false);
    expect(
      isPotentialAurenSwordsmanCityClearanceUnit(s, { ...unit, y: SIZE }, true)
    ).toBe(false);

    // Reset to the original legal city input and assert repeated pure calls
    // neither mutate game state nor candidate/save byte identity.
    s.tiles[idx(unit.x, unit.y, SIZE)]!.cityId = 0;
    expect(potentialAurenSwordsmanCityClearanceCells(s, true)).toEqual(
      new Set([idx(unit.x, unit.y, SIZE)])
    );
    expect(s).toEqual(before);
  });

  it("uses the exact drawable-unit fog predicate and cannot clear an explored hidden enemy city", () => {
    const s = state();
    const enemy = swordsman(11, 1, 6, 6);
    s.units = [swordsman(1, 0, 0, 0), enemy];
    s.tribes[1]!.defIndex = 0; // Auren identity in an enemy game seat is still not drawable while hidden.
    s.cities.push({
      id: 1,
      x: 6,
      y: 6,
      name: "Far City",
      tribe: 1,
      level: 2,
      population: 0,
      isCapital: false,
    });
    const enemyTile = s.tiles[idx(6, 6, SIZE)]!;
    enemyTile.cityId = 1;
    enemyTile.explored[0] = true;

    expect(potentialAurenSwordsmanCityClearanceCells(s, true)).toEqual(
      new Set()
    );
    s.units[0]!.x = 4;
    s.units[0]!.y = 6;
    expect(potentialAurenSwordsmanCityClearanceCells(s, true)).toEqual(
      new Set([idx(6, 6, SIZE)])
    );
  });

  it("compacts only structure display transforms with a bounded actor capsule and restores every baseline exactly", () => {
    const baseline = {
      x: 0,
      y: 0.56,
      z: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    };
    const input = {
      baseline,
      cityX: 0,
      cityTop: 0.3,
      cityZ: 0,
      tileX: 3,
      tileY: 3,
      footprintRadius: 0.15,
      preservePlatform: false,
      active: true,
    } as const;
    const compact = cityOccupiedStructureTransform(input);
    const restored = cityOccupiedStructureTransform({
      ...input,
      active: false,
    });
    const platform = cityOccupiedStructureTransform({
      ...input,
      preservePlatform: true,
    });

    expect(compact).not.toEqual(baseline);
    expect(Math.hypot(compact.x, compact.z)).toBeGreaterThanOrEqual(
      CITY_OCCUPANCY_CLEARANCE_CAPSULE_RADIUS
    );
    expect(Math.hypot(compact.x, compact.z)).toBeLessThanOrEqual(0.445);
    expect(compact.scaleX).toBeGreaterThan(0);
    expect(compact.scaleX).toBeLessThan(1);
    expect(compact.scaleY).toBeGreaterThan(0);
    expect(compact.scaleY).toBeLessThan(1);
    expect(restored).toEqual(baseline);
    expect(platform).toEqual(baseline);
    expect(baseline).toEqual({
      x: 0,
      y: 0.56,
      z: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    });
  });
});
