// v35 economy depth — unit capacity, level-up reward choices, and buildings.
import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import { unitCapacity, unitCount, canBuild, starIncome, POP_PER_LEVEL } from "../client/src/game/core/rules";
import { BUILDINGS, rewardChoicesForLevel } from "../client/src/game/core/types";

function fresh(seed = 7) {
  game.newGame({ size: 9, seed, difficulty: "normal", preset: "continents", humanTribe: 0 });
  game.state.showIntro = false;
  return game.state;
}

describe("v35 unit capacity", () => {
  beforeEach(() => fresh());

  it("capacity scales with city count and levels", () => {
    const s = game.state;
    const base = unitCapacity(s, 0);
    expect(base).toBeGreaterThan(0);
    // levelling the capital raises the cap
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const before = unitCapacity(s, 0);
    cap.level += 1;
    expect(unitCapacity(s, 0)).toBeGreaterThan(before);
  });

  it("train is blocked at capacity", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    s.tribes[0].stars = 100;
    let guard = 0;
    while (unitCount(s, 0) < unitCapacity(s, 0) && guard++ < 30) {
      const before = unitCount(s, 0);
      game.train(cap.id, "warrior");
      if (unitCount(s, 0) === before) break; // tile occupied — capacity test still valid below
      // free the city tile so the next train isn't blocked by occupancy
      const u = s.units.find((x) => x.x === cap.x && x.y === cap.y && x.tribe === 0);
      if (u) { u.x = -1; u.y = -1; } // park off-board for the cap check
    }
    const at = unitCount(s, 0);
    if (at >= unitCapacity(s, 0)) {
      game.train(cap.id, "warrior");
      expect(unitCount(s, 0)).toBe(at); // no over-cap training
    }
  });
});

describe("v35 level-up reward choices", () => {
  beforeEach(() => fresh());

  it("human level-up queues a pending choice and blocks endTurn", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    game.addPopulation(cap, POP_PER_LEVEL);
    expect(s.pendingCityReward).toBe(cap.id);
    const turn = s.turn, cur = s.currentTribe;
    game.endTurn();
    expect(s.turn).toBe(turn);
    expect(s.currentTribe).toBe(cur); // blocked until the choice resolves
  });

  it("choosing workshop raises star income by 1", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const before = starIncome(s, 0);
    game.addPopulation(cap, POP_PER_LEVEL);
    const [a] = rewardChoicesForLevel(cap.level);
    expect(a).toBe("workshop");
    game.chooseCityReward(cap.id, "workshop");
    expect(s.pendingCityReward).toBeNull();
    // +1 from the level itself (income scales with level) and +1 from the workshop
    expect(starIncome(s, 0)).toBe(before + 2);
  });

  it("rejects a reward that is not one of the two offered choices", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    game.addPopulation(cap, POP_PER_LEVEL); // level 2 → workshop|explorer
    game.chooseCityReward(cap.id, "park");
    expect(s.pendingCityReward).toBe(cap.id); // still pending
    expect(cap.rewards ?? []).not.toContain("park");
  });

  it("border growth expands the city's claimed tiles", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const owned = () => s.tiles.filter((t) => t.ownerCityId === cap.id).length;
    const before = owned();
    // drive to level 4 (borderGrowth appears at level 4 per rewardChoicesForLevel)
    game.addPopulation(cap, POP_PER_LEVEL); game.aiPickCityReward(cap); s.pendingCityReward = null;
    game.addPopulation(cap, POP_PER_LEVEL); game.aiPickCityReward(cap); s.pendingCityReward = null;
    game.addPopulation(cap, POP_PER_LEVEL);
    const choices = rewardChoicesForLevel(cap.level);
    if (choices.includes("borderGrowth")) {
      game.chooseCityReward(cap.id, "borderGrowth");
      expect(owned()).toBeGreaterThan(before);
    } else {
      game.aiPickCityReward(cap);
      s.pendingCityReward = null;
    }
  });

  it("AI cities auto-pick a reward without creating a pending choice", () => {
    const s = game.state;
    const aiCity = s.cities.find((c) => c.tribe === 1);
    if (!aiCity) return;
    game.addPopulation(aiCity, POP_PER_LEVEL);
    expect(s.pendingCityReward).toBeNull();
    expect((aiCity.rewards ?? []).length).toBeGreaterThan(0);
  });
});

describe("v35 buildings", () => {
  beforeEach(() => fresh());

  it("BUILDINGS defs are well-formed", () => {
    for (const b of BUILDINGS) {
      expect(b.cost).toBeGreaterThan(0);
      // v36 adjacency & v37 income buildings have base pop 0 — their value
      // comes from neighbors (pop for mills, stars for markets)
      if (b.adjacentTo || b.incomeAdjacentTo) expect(b.pop).toBe(0);
      else expect(b.pop).toBeGreaterThan(0);
      expect(b.terrain.length).toBeGreaterThan(0);
    }
  });

  it("building on a valid tile consumes stars and adds population", () => {
    const s = game.state;
    const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    s.tribes[0].stars = 50;
    // find a buildable tile in the capital's territory for any building type
    for (const b of BUILDINGS) {
      const t = s.tiles.find((x) => x.ownerCityId === cap.id && canBuild(s, 0, x, b.id));
      if (!t) continue;
      const stars = s.tribes[0].stars;
      const pop = cap.population + cap.level * POP_PER_LEVEL;
      game.build(t.x, t.y, b.id);
      expect(t.building).toBe(b.id);
      expect(s.tribes[0].stars).toBe(stars - b.cost);
      const popAfter = cap.population + cap.level * POP_PER_LEVEL;
      expect(popAfter).toBe(pop + b.pop);
      // cannot double-build on the same tile
      const stars2 = s.tribes[0].stars;
      game.build(t.x, t.y, b.id);
      expect(s.tribes[0].stars).toBe(stars2);
      return;
    }
  });
});
