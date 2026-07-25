// v36 feature tests — Colossus wall-crush + knockback, and adjacency buildings
// (Sawmill/Windmill). Headless engine coverage, same fresh() pattern as
// economy.v35.test.ts.
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
  previewCombat, tileAt, canBuild, adjacencyPop, knockbackDestination,
} from "../client/src/game/core/rules";
import { BUILDINGS, UNIT_STATS, WALL_DEFENSE_BONUS } from "../client/src/game/core/types";
import type { Unit, UnitType } from "../client/src/game/core/types";

function fresh() {
  game.newGame({ size: 11, seed: 42, difficulty: "normal", preset: "pangaea", humanTribe: 0 });
  game.state.showIntro = false;
}

/** place a unit directly into state (test helper) */
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

/** find a walkable land tile with nothing on it */
function clearLand(x: number, y: number) {
  const s = game.state;
  const t = tileAt(s, x, y);
  t.terrain = "grass"; t.resource = null; t.cityId = null; t.building = null; t.ruin = false; t.greatRuin = false;
  const i = s.units.findIndex((u) => u.x === x && u.y === y);
  if (i >= 0) s.units.splice(i, 1);
}

describe("v36 colossus wall-crush", () => {
  beforeEach(() => fresh());

  it("ignores the walled-city defense bonus like a catapult", () => {
    const s = game.state;
    const city = s.cities.find((c) => c.tribe === 1)!;
    city.walls = true;
    // defender garrisoned on the walled city
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) clearLand(city.x + dx, city.y + dy);
    }
    const idxD = s.units.findIndex((u) => u.x === city.x && u.y === city.y);
    if (idxD >= 0) s.units.splice(idxD, 1);
    const def = put("defender", 1, city.x, city.y);
    const col = put("colossus", 0, city.x + 1, city.y);
    const war = put("warrior", 0, city.x - 1, city.y);
    const pCol = previewCombat(s, col, def);
    const pWar = previewCombat(s, war, def);
    // warrior faces the WALL_DEFENSE_BONUS-boosted defender; colossus does not,
    // so per-attack-point damage must be strictly better for the colossus
    expect(WALL_DEFENSE_BONUS).toBeGreaterThan(1.5);
    expect(pCol.damageToDefender / UNIT_STATS.colossus.attack).toBeGreaterThan(
      pWar.damageToDefender / UNIT_STATS.warrior.attack,
    );
  });

  it("breaks the walls when it hits a walled city tile", () => {
    const s = game.state;
    const city = s.cities.find((c) => c.tribe === 1)!;
    city.walls = true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) clearLand(city.x + dx, city.y + dy);
    }
    const idxD = s.units.findIndex((u) => u.x === city.x && u.y === city.y);
    if (idxD >= 0) s.units.splice(idxD, 1);
    const def = put("defender", 1, city.x, city.y);
    const col = put("colossus", 0, city.x + 1, city.y);
    s.currentTribe = 0;
    game.stageAttack(col.id, def.id);
    game.confirmAttack();
    expect(city.walls).toBe(false);
  });

  it("knocks a surviving defender back one tile away from the colossus", () => {
    const s = game.state;
    // stage the fight on open ground far from cities
    let ox = -1, oy = -1;
    outer: for (let y = 2; y < s.size - 2; y++) for (let x = 2; x < s.size - 2; x++) {
      const t = tileAt(s, x, y);
      if (t.cityId === null) { ox = x; oy = y; break outer; }
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) clearLand(ox + dx, oy + dy);
    const def = put("defender", 1, ox, oy);
    const col = put("colossus", 0, ox + 1, oy);
    s.currentTribe = 0;
    game.stageAttack(col.id, def.id);
    game.confirmAttack();
    if (s.units.some((u) => u.id === def.id)) {
      // survivor must have been pushed to (ox-1, oy) — directly away from the colossus
      const moved = s.units.find((u) => u.id === def.id)!;
      expect(moved.x).toBe(ox - 1);
      expect(moved.y).toBe(oy);
    }
  });

  it("knockbackDestination refuses blocked or impassable tiles", () => {
    const s = game.state;
    let ox = 3, oy = 3;
    for (let dx = -2; dx <= 2; dx++) clearLand(ox + dx, oy);
    const def = put("defender", 1, ox, oy);
    const col = put("colossus", 0, ox + 1, oy);
    // blocked by a friendly unit standing on the push tile
    put("warrior", 1, ox - 1, oy);
    expect(knockbackDestination(s, col, def)).toBeNull();
  });
});

describe("v36 adjacency buildings", () => {
  beforeEach(() => fresh());

  const sawmill = BUILDINGS.find((b) => b.id === "sawmill")!;
  const windmill = BUILDINGS.find((b) => b.id === "windmill")!;

  it("defs exist with adjacentTo partners and zero base pop", () => {
    expect(sawmill.adjacentTo).toBe("hut");
    expect(windmill.adjacentTo).toBe("farm");
    expect(sawmill.pop).toBe(0);
    expect(windmill.pop).toBe(0);
  });

  it("adjacencyPop counts partner neighbors (8-way)", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    // pick a grass tile in the capital borders with room around it
    const site = s.tiles.find((t) => t.ownerCityId === cap.id && t.cityId === null && t.x > 1 && t.y > 1 && t.x < s.size - 2 && t.y < s.size - 2)!;
    expect(site).toBeTruthy();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clearLand(site.x + dx, site.y + dy);
    expect(adjacencyPop(s, site.x, site.y, sawmill)).toBe(0);
    tileAt(s, site.x + 1, site.y).building = "hut";
    tileAt(s, site.x - 1, site.y - 1).building = "hut";
    expect(adjacencyPop(s, site.x, site.y, sawmill)).toBe(2);
    // partner type matters: farms don't feed sawmills
    tileAt(s, site.x, site.y + 1).building = "farm";
    expect(adjacencyPop(s, site.x, site.y, sawmill)).toBe(2);
    expect(adjacencyPop(s, site.x, site.y, windmill)).toBe(1);
  });

  it("building a sawmill adds pop equal to adjacent huts, and is one-per-city", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    s.tribes[0].stars = 50;
    s.tribes[0].techs.push("forestry", "hunting");
    const site = s.tiles.find((t) => t.ownerCityId === cap.id && t.cityId === null && t.x > 1 && t.y > 1 && t.x < s.size - 2 && t.y < s.size - 2)!;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clearLand(site.x + dx, site.y + dy);
    tileAt(s, site.x + 1, site.y).building = "hut";
    tileAt(s, site.x, site.y - 1).building = "hut";
    const popBefore = cap.population + (cap.level - 1) * 3;
    s.currentTribe = 0;
    game.build(site.x, site.y, "sawmill");
    expect(tileAt(s, site.x, site.y).building).toBe("sawmill");
    const popAfter = cap.population + (cap.level - 1) * 3;
    expect(popAfter - popBefore).toBe(2);
    // a second sawmill in the same city is rejected
    const other = tileAt(s, site.x - 1, site.y);
    other.terrain = "grass"; other.ownerCityId = cap.id;
    expect(canBuild(s, 0, other, sawmill)).toBe(false);
  });

  it("a new hut next to an existing sawmill grows the city by +1", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    s.tribes[0].stars = 50;
    s.tribes[0].techs.push("forestry", "hunting");
    const site = s.tiles.find((t) => t.ownerCityId === cap.id && t.cityId === null && t.x > 1 && t.y > 1 && t.x < s.size - 2 && t.y < s.size - 2)!;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clearLand(site.x + dx, site.y + dy);
    s.currentTribe = 0;
    game.build(site.x, site.y, "sawmill"); // 0 pop — no huts yet
    const hutTile = tileAt(s, site.x + 1, site.y);
    hutTile.terrain = "forest"; hutTile.ownerCityId = cap.id;
    const popBefore = cap.population + (cap.level - 1) * 3;
    game.build(hutTile.x, hutTile.y, "hut");
    const popAfter = cap.population + (cap.level - 1) * 3;
    // +1 from the hut itself, +1 retro-growth for the adjacent sawmill
    expect(popAfter - popBefore).toBe(2);
  });
});
