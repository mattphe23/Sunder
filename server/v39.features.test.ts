// v39 feature tests — road raiding (enemy units sever trade routes), the
// trade-pulse route helper, and Hall of Conquest breakdown persistence.
// Headless engine coverage, same fresh()/put() pattern as v36-v38 tests.
import { describe, it, expect, vi, beforeEach } from "vitest";
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);
import { game, loadHall } from "../client/src/game/core/state";
import {
  tileAt, connectedCityIds, starIncome, raidedRoadTiles, severedCityIds,
  tradeRouteTiles, scoreBreakdown,
} from "../client/src/game/core/rules";
import { UNIT_STATS } from "../client/src/game/core/types";
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
/**
 * Build a straight paved chain from the capital to a fresh friendly city:
 * capital at (cx,cy), roads at cx-1..cx-2, city at cx-3 (west, safely in
 * bounds for the seed-42 pangaea capital). Returns { capital, city, roads }.
 */
function layTradeRoute() {
  const s = game.state;
  // trade income requires the Roads tech
  if (!s.tribes[0].techs.includes("roads")) s.tribes[0].techs.push("roads");
  const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
  const y = capital.y;
  const xs = [capital.x - 1, capital.x - 2];
  for (const x of xs) {
    clearLand(x, y);
    tileAt(s, x, y).road = true;
    tileAt(s, x, y).owner = 0;
  }
  const cityX = capital.x - 3;
  clearLand(cityX, y);
  const city = { ...capital, id: s.cities.length, x: cityX, y, isCapital: false, level: 1, pop: 0 };
  s.cities.push(city);
  const ct = tileAt(s, cityX, y);
  ct.cityId = city.id;
  ct.owner = 0;
  return { capital, city, roads: xs.map((x) => ({ x, y })) };
}

describe("v39 road raiding — severed trade routes", () => {
  beforeEach(() => fresh());
  it("an enemy unit on a road tile severs the connection", () => {
    const s = game.state;
    const { city, roads } = layTradeRoute();
    expect(connectedCityIds(s, 0).has(city.id)).toBe(true);
    const raider = put("warrior", 1, roads[0].x, roads[0].y);
    expect(connectedCityIds(s, 0).has(city.id)).toBe(false);
    // clearing the raider restores the route
    s.units.splice(s.units.indexOf(raider), 1);
    expect(connectedCityIds(s, 0).has(city.id)).toBe(true);
  });
  it("severing the route removes the +1★ trade income", () => {
    const s = game.state;
    const { city, roads } = layTradeRoute();
    const before = starIncome(s, 0);
    put("warrior", 1, roads[1].x, roads[1].y);
    const after = starIncome(s, 0);
    expect(before - after).toBe(1);
    expect(connectedCityIds(s, 0).has(city.id)).toBe(false);
  });
  it("friendly units on roads do NOT sever the route", () => {
    const s = game.state;
    const { city, roads } = layTradeRoute();
    put("warrior", 0, roads[0].x, roads[0].y);
    expect(connectedCityIds(s, 0).has(city.id)).toBe(true);
  });
  it("raidedRoadTiles lists hostile-occupied road tiles only", () => {
    const s = game.state;
    const { roads } = layTradeRoute();
    expect(raidedRoadTiles(s, 0)).toEqual([]);
    put("warrior", 0, roads[0].x, roads[0].y); // friendly — not a raid
    expect(raidedRoadTiles(s, 0)).toEqual([]);
    put("rider", 1, roads[1].x, roads[1].y); // hostile — raid
    const raided = raidedRoadTiles(s, 0);
    expect(raided).toHaveLength(1);
    expect(raided[0]).toEqual({ x: roads[1].x, y: roads[1].y });
  });
  it("severedCityIds flags cities cut off by raiders, not never-connected ones", () => {
    const s = game.state;
    const { city, roads } = layTradeRoute();
    expect(severedCityIds(s, 0).size).toBe(0); // healthy network — nothing severed
    put("warrior", 1, roads[0].x, roads[0].y);
    const severed = severedCityIds(s, 0);
    expect(severed.has(city.id)).toBe(true);
  });
});

describe("v39 trade pulse — route flow helper", () => {
  beforeEach(() => fresh());
  it("returns each connected road tile with flow toward the capital", () => {
    const s = game.state;
    const { capital, roads } = layTradeRoute();
    const flow = tradeRouteTiles(s, 0);
    // both paved tiles are on the route
    for (const r of roads) {
      const f = flow.find((t) => t.x === r.x && t.y === r.y);
      expect(f).toBeDefined();
      // flow points one step toward the capital (east: +1, 0)
      expect(f!.dx).toBe(1);
      expect(f!.dy).toBe(0);
      expect(f!.x + f!.dx).toBeLessThanOrEqual(capital.x);
    }
  });
  it("raided routes stop pulsing beyond the raider", () => {
    const s = game.state;
    const { roads } = layTradeRoute();
    // raider on the inner road tile (adjacent to capital) chokes the whole chain
    put("warrior", 1, roads[0].x, roads[0].y);
    const flow = tradeRouteTiles(s, 0);
    expect(flow.find((t) => t.x === roads[0].x && t.y === roads[0].y)).toBeUndefined();
    expect(flow.find((t) => t.x === roads[1].x && t.y === roads[1].y)).toBeUndefined();
  });
});

describe("v39 Hall of Conquest — breakdown persistence", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    fresh();
  });
  it("a solo victory stores the score breakdown with the hall entry", () => {
    const s = game.state;
    // hand tribe 0 the win: eliminate everyone else
    for (const t of s.tribes) if (t.index !== 0) t.alive = false;
    for (const c of s.cities) if (c.tribe !== null && c.tribe !== 0) c.tribe = 0;
    s.units = s.units.filter((u) => u.tribe === 0);
    // trigger the victory check directly — rivals hold no cities anymore
    game.checkElimination();
    expect(s.phase).toBe("gameover");
    expect(s.winner).toBe(0);
    const hall = loadHall();
    const entries = hall[s.difficulty] ?? [];
    expect(entries.length).toBeGreaterThan(0);
    const e = entries[0];
    expect(e.breakdown).toBeDefined();
    // the frozen breakdown matches a live recomputation and sums to the total
    const live = scoreBreakdown(s, 0);
    expect(e.breakdown!.total).toBe(live.total);
    const sum = e.breakdown!.cities + e.breakdown!.cityLevels + e.breakdown!.units
      + e.breakdown!.techs + e.breakdown!.battles + e.breakdown!.hero + e.breakdown!.heroFell;
    expect(e.breakdown!.total).toBe(sum);
    expect(e.score).toBe(e.breakdown!.total);
  });
  it("legacy entries without a breakdown still load", () => {
    const legacy = { normal: [{ difficulty: "normal", faction: "Auren", turns: 12, score: 900, mapSize: 11, date: "2026-01-01" }] };
    store["polyforge-hall"] = JSON.stringify(legacy);
    const hall = loadHall();
    expect(hall.normal![0].breakdown).toBeUndefined();
    expect(hall.normal![0].score).toBe(900);
  });
});
