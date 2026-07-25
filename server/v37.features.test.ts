// v37 feature tests — Colossus Quake (once-per-game AoE), Market income
// building, and the city-planner overlay's site projection. Headless engine
// coverage, same fresh()/put() pattern as v36.features.test.ts.

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
  tileAt, canBuild, marketStars, starIncome, plannerSites,
  canQuake, quakeVictims, quakeWallTargets, QUAKE_DAMAGE,
} from "../client/src/game/core/rules";
import { BUILDINGS, UNIT_STATS } from "../client/src/game/core/types";
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
  t.terrain = "grass"; t.resource = null; t.cityId = null; t.building = null; t.ruin = false; t.greatRuin = false;
  const i = s.units.findIndex((u) => u.x === x && u.y === y);
  if (i >= 0) s.units.splice(i, 1);
}

const marketDef = BUILDINGS.find((b) => b.id === "market")!;
const sawmillDef = BUILDINGS.find((b) => b.id === "sawmill")!;

describe("v37 colossus quake — rules", () => {
  beforeEach(() => fresh());

  it("is available only for an unspent colossus with adjacent enemies", () => {
    const s = game.state;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clearLand(5 + dx, 5 + dy);
    const col = put("colossus", 0, 5, 5);
    expect(canQuake(s, col)).toBe(false); // no adjacent enemies, nothing to hit
    put("warrior", 1, 6, 5);
    expect(canQuake(s, col)).toBe(true);
    col.quakeUsed = true;
    expect(canQuake(s, col)).toBe(false); // once per game
    col.quakeUsed = false;
    col.attacked = true;
    expect(canQuake(s, col)).toBe(false); // counts as the attack action
  });

  it("non-colossus units can never quake", () => {
    const s = game.state;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clearLand(5 + dx, 5 + dy);
    const war = put("warrior", 0, 5, 5);
    put("warrior", 1, 6, 5);
    expect(canQuake(s, war)).toBe(false);
  });

  it("hits every adjacent enemy but no allies or distant units", () => {
    const s = game.state;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clearLand(5 + dx, 5 + dy);
    clearLand(7, 5);
    const col = put("colossus", 0, 5, 5);
    const e1 = put("warrior", 1, 6, 5);
    const e2 = put("warrior", 1, 4, 4);
    const ally = put("warrior", 0, 5, 6);
    const far = put("warrior", 1, 7, 5);
    const victims = quakeVictims(s, col);
    const ids = victims.map((v) => v.id).sort();
    expect(ids).toEqual([e1.id, e2.id].sort());
    expect(ids).not.toContain(ally.id);
    expect(ids).not.toContain(far.id);
  });
});

describe("v37 colossus quake — action", () => {
  beforeEach(() => fresh());

  it("deals QUAKE_DAMAGE to adjacent enemies, kills the weak, shatters adjacent enemy walls, and is spent", () => {
    const s = game.state;
    const city = s.cities.find((c) => c.tribe === 1)!;
    city.walls = true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) clearLand(city.x + dx, city.y + dy);
    }
    const iD = s.units.findIndex((u) => u.x === city.x && u.y === city.y);
    if (iD >= 0) s.units.splice(iD, 1);
    const tough = put("defender", 1, city.x, city.y); // 15 hp, survives
    const weak = put("warrior", 1, city.x + 1, city.y - 1);
    weak.hp = 3; // dies to the quake
    const col = put("colossus", 0, city.x + 1, city.y);
    s.currentTribe = 0;

    const wallTargets = quakeWallTargets(s, col);
    expect(wallTargets.some((c) => c.id === city.id)).toBe(true);

    game.quake(col.id);

    expect(tough.hp).toBe(UNIT_STATS.defender.hp - QUAKE_DAMAGE);
    expect(s.units.find((u) => u.id === weak.id)).toBeUndefined();
    expect(city.walls).toBe(false);
    expect(col.quakeUsed).toBe(true);
    expect(col.attacked).toBe(true);
  });

  it("does nothing when already spent", () => {
    const s = game.state;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) clearLand(5 + dx, 5 + dy);
    const col = put("colossus", 0, 5, 5);
    col.quakeUsed = true;
    const e = put("warrior", 1, 6, 5);
    s.currentTribe = 0;
    game.quake(col.id);
    expect(e.hp).toBe(UNIT_STATS.warrior.hp);
  });
});

describe("v37 market — income building", () => {
  beforeEach(() => fresh());

  /** carve a 3x3 grass patch owned by the human capital around (cx,cy) */
  function ownedPatch(cx: number, cy: number) {
    const s = game.state;
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      clearLand(cx + dx, cy + dy);
      tileAt(s, cx + dx, cy + dy).ownerCityId = capital.id;
    }
    return capital;
  }

  it("earns +1 star income per adjacent sawmill/windmill, counted live", () => {
    const s = game.state;
    ownedPatch(5, 5);
    const base = starIncome(s, 0);
    tileAt(s, 5, 5).building = "market";
    expect(starIncome(s, 0)).toBe(base); // no partners yet
    tileAt(s, 4, 5).building = "sawmill";
    expect(starIncome(s, 0)).toBe(base + 1);
    tileAt(s, 6, 5).building = "windmill";
    expect(starIncome(s, 0)).toBe(base + 2); // grows as partners land later
    expect(marketStars(s, 5, 5, marketDef)).toBe(2);
  });

  it("plain buildings (farms/huts) do not feed the market", () => {
    const s = game.state;
    ownedPatch(5, 5);
    tileAt(s, 5, 5).building = "market";
    tileAt(s, 4, 5).building = "farm";
    tileAt(s, 6, 5).building = "hut";
    expect(marketStars(s, 5, 5, marketDef)).toBe(0);
  });

  it("is one per city and requires sailing", () => {
    const s = game.state;
    const capital = ownedPatch(5, 5);
    s.tribes[0].stars = 20;
    const t = tileAt(s, 5, 5);
    expect(canBuild(s, 0, t, marketDef)).toBe(false); // no sailing yet
    s.tribes[0].techs.push("sailing");
    expect(canBuild(s, 0, t, marketDef)).toBe(true);
    tileAt(s, 4, 4).building = "market"; // same city already has one
    tileAt(s, 4, 4).ownerCityId = capital.id;
    expect(canBuild(s, 0, t, marketDef)).toBe(false);
  });

  it("a besieged city's market income is choked", () => {
    const s = game.state;
    const capital = ownedPatch(5, 5);
    tileAt(s, 5, 5).building = "market";
    tileAt(s, 4, 5).building = "sawmill";
    const withMarket = starIncome(s, 0);
    // enemy stands on the city tile
    const iD = s.units.findIndex((u) => u.x === capital.x && u.y === capital.y);
    if (iD >= 0) s.units.splice(iD, 1);
    put("warrior", 1, capital.x, capital.y);
    const besieged = starIncome(s, 0);
    // the whole city (base + market) is choked, so the drop exceeds the market's 1★
    expect(besieged).toBeLessThan(withMarket - 1);
  });
});

describe("v37 city planner — site projection", () => {
  beforeEach(() => fresh());

  it("lists buildable sites with correct values and kinds, even with an empty treasury", () => {
    const s = game.state;
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      clearLand(5 + dx, 5 + dy);
      tileAt(s, 5 + dx, 5 + dy).ownerCityId = capital.id;
    }
    s.tribes[0].techs.push("forestry", "sailing", "organization");
    tileAt(s, 4, 5).building = "hut";
    tileAt(s, 6, 5).building = "sawmill";
    s.tribes[0].stars = 0; // planner ignores affordability — it teaches
    const sites = plannerSites(s, 0);
    const mid = sites.find((p) => p.x === 5 && p.y === 5);
    expect(mid).toBeDefined();
    // best value at (5,5): market next to the sawmill (+1★) beats sawmill (+1 pop)
    // only via the stars tie-break; both are value 1
    expect(mid!.value).toBeGreaterThanOrEqual(1);
    if (mid!.building.id === "market") expect(mid!.kind).toBe("stars");
    else expect(mid!.kind).toBe("pop");
  });

  it("returns nothing for tiles outside city borders", () => {
    const s = game.state;
    clearLand(1, 1);
    tileAt(s, 1, 1).ownerCityId = null;
    const sites = plannerSites(s, 0);
    expect(sites.some((p) => p.x === 1 && p.y === 1)).toBe(false);
  });
});
