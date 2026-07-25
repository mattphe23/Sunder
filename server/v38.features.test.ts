// v38 feature tests — Roads & the Capital Trade Network, and the game-over
// score breakdown. Headless engine coverage, same fresh()/put() pattern as
// v36/v37 feature tests.
import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import {
  tileAt, canBuildRoad, roadCost, connectedCityIds, starIncome,
  reachableTiles, scoreBreakdown,
} from "../client/src/game/core/rules";
import { ROAD_COST, UNIT_STATS } from "../client/src/game/core/types";
import type { Unit, UnitType } from "../client/src/game/core/types";

function fresh() {
  game.newGame({ size: 11, seed: 42, difficulty: "normal", preset: "pangaea", humanTribe: 0 });
  game.state.showIntro = false;
}

function put(type: UnitType, tribe: number, x: number, y: number): Unit {
  const s = game.state;
  const st = UNIT_STATS[type];
  const u: Unit = {
    id: s.nextUnitId++, type, tribe, x, y,
    hp: st.hp, maxHp: st.hp, moved: false, attacked: false, kills: 0, boat: false,
  };
  s.units.push(u);
  return u;
}

function clearLand(x: number, y: number) {
  const s = game.state;
  const t = tileAt(s, x, y);
  t.terrain = "grass"; t.resource = null; t.cityId = null; t.building = null;
  t.ruin = false; t.greatRuin = false; t.road = false;
  const i = s.units.findIndex((u) => u.x === x && u.y === y);
  if (i >= 0) s.units.splice(i, 1);
}

/** grant the roads tech + stars to tribe 0 */
function armRoads(stars = 20) {
  const s = game.state;
  if (!s.tribes[0].techs.includes("riding")) s.tribes[0].techs.push("riding");
  if (!s.tribes[0].techs.includes("roads")) s.tribes[0].techs.push("roads");
  s.tribes[0].stars = stars;
}

describe("v38 roads — build rules", () => {
  beforeEach(() => fresh());

  it("requires the Roads tech, stars, and passable unpaved land", () => {
    const s = game.state;
    clearLand(5, 5);
    const t = tileAt(s, 5, 5);
    expect(canBuildRoad(s, 0, t)).toBe(false); // no tech yet
    armRoads();
    expect(canBuildRoad(s, 0, t)).toBe(true);
    s.tribes[0].stars = ROAD_COST - 1;
    expect(canBuildRoad(s, 0, t)).toBe(false); // can't afford
    s.tribes[0].stars = 20;
    t.road = true;
    expect(canBuildRoad(s, 0, t)).toBe(false); // already paved
  });

  it("rejects mountains, water, city tiles, and enemy territory", () => {
    const s = game.state;
    armRoads();
    clearLand(5, 5);
    const t = tileAt(s, 5, 5);
    t.terrain = "mountain";
    expect(canBuildRoad(s, 0, t)).toBe(false);
    t.terrain = "water";
    expect(canBuildRoad(s, 0, t)).toBe(false);
    t.terrain = "grass";
    t.cityId = 0;
    expect(canBuildRoad(s, 0, t)).toBe(false);
    t.cityId = null;
    const enemyCity = s.cities.find((c) => c.tribe !== 0);
    if (enemyCity) {
      t.ownerCityId = enemyCity.id;
      expect(canBuildRoad(s, 0, t)).toBe(false);
      t.ownerCityId = null;
    }
    expect(canBuildRoad(s, 0, t)).toBe(true);
  });

  it("buildRoad action pays stars and paves the tile", () => {
    const s = game.state;
    armRoads(10);
    clearLand(5, 5);
    game.buildRoad(5, 5);
    expect(tileAt(s, 5, 5).road).toBe(true);
    expect(s.tribes[0].stars).toBe(10 - roadCost(s, 0));
  });
});

describe("v38 capital trade network", () => {
  beforeEach(() => fresh());

  it("connects a city to the capital through a road chain and pays +1 star", () => {
    const s = game.state;
    armRoads();
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    // plant a second city 3 tiles toward the board center (guaranteed in-bounds)
    const dir = capital.x < s.size / 2 ? 1 : -1;
    const cx = capital.x + 3 * dir, cy = capital.y;
    for (let d = 1; d <= 3; d++) clearLand(capital.x + d * dir, cy);
    const city = {
      ...capital, id: s.cities.length, x: cx, y: cy, isCapital: false, level: 1,
      name: "Roadville", walls: false, rewards: [],
    };
    s.cities.push(city);
    tileAt(s, cx, cy).cityId = city.id;

    expect(connectedCityIds(s, 0).has(city.id)).toBe(false);
    const before = starIncome(s, 0);

    // pave the two tiles between them
    tileAt(s, capital.x + 1 * dir, cy).road = true;
    expect(connectedCityIds(s, 0).has(city.id)).toBe(false); // gap remains
    tileAt(s, capital.x + 2 * dir, cy).road = true;
    expect(connectedCityIds(s, 0).has(city.id)).toBe(true);
    expect(starIncome(s, 0)).toBe(before + 1);
  });

  it("does not pay the capital a trade bonus for itself", () => {
    const s = game.state;
    armRoads();
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const dir = capital.x < s.size / 2 ? 1 : -1;
    clearLand(capital.x + dir, capital.y);
    tileAt(s, capital.x + dir, capital.y).road = true;
    expect(connectedCityIds(s, 0).has(capital.id)).toBe(false);
  });

  it("chokes the trade bonus while the connected city is besieged", () => {
    const s = game.state;
    armRoads();
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const dir = capital.x < s.size / 2 ? 1 : -1;
    const cx = capital.x + 2 * dir, cy = capital.y;
    clearLand(capital.x + dir, cy);
    clearLand(cx, cy);
    const city = {
      ...capital, id: s.cities.length, x: cx, y: cy, isCapital: false, level: 1,
      name: "Siegetown", walls: false, rewards: [],
    };
    s.cities.push(city);
    tileAt(s, cx, cy).cityId = city.id;
    tileAt(s, capital.x + dir, cy).road = true;
    const linked = starIncome(s, 0);
    put("warrior", 1, cx, cy); // enemy stands on the city
    // besieged: loses base income AND the trade bonus (choked entirely)
    expect(starIncome(s, 0)).toBeLessThan(linked);
  });
});

describe("v38 road movement", () => {
  beforeEach(() => fresh());

  it("lets a land unit travel farther along a paved row", () => {
    const s = game.state;
    // isolate a flat strip and measure reach with and without roads
    for (let d = 0; d <= 4; d++) clearLand(2 + d, 2);
    const scout = put("rider", 0, 2, 2); // rider: 2 movement
    const plain = reachableTiles(s, scout).filter((t) => t.y === 2 && t.x > 2).length;
    for (let d = 1; d <= 4; d++) tileAt(s, 2 + d, 2).road = true;
    const paved = reachableTiles(s, scout).filter((t) => t.y === 2 && t.x > 2).length;
    expect(paved).toBeGreaterThan(plain);
  });
});

describe("v38 score breakdown", () => {
  beforeEach(() => fresh());

  it("component totals always equal the live score", () => {
    const s = game.state;
    for (const t of s.tribes) {
      game.updateScore(t.index);
      const bd = scoreBreakdown(s, t.index);
      expect(bd.total).toBe(t.score);
    }
  });

  it("reflects battles won and a fallen hero", () => {
    const s = game.state;
    if (!s.stats) s.stats = {};
    s.stats[0] = { ...(s.stats[0] ?? {}), battlesWon: 3 } as never;
    s.tribes[0].heroFell = true;
    game.updateScore(0);
    const bd = scoreBreakdown(s, 0);
    expect(bd.battles).toBe(24);
    expect(bd.heroFell).toBe(-40);
    expect(bd.total).toBe(s.tribes[0].score);
  });
});
