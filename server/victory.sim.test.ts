// v20 headless simulation: the game engine (client/src/game/core) is framework-
// agnostic, so we can run full AI-vs-AI matches in Node and assert the new
// asymmetric victory paths + AI hero care behave without a browser.
import { describe, it, expect } from "vitest";
import {
  VICTORY_PATHS, victoryProgress, checkPathVictory, VICTORY_PATH_START_TURN,
  PLUNDER_TARGET, BLOODFORGE_TARGET, harvestTarget, tideTarget, STORMLEGEND_TARGET,
  UNBROKENWALL_TARGET, WALL_HOLD_CITIES,
} from "../client/src/game/core/victory";
import { TECHS, TRIBE_DEFS, GameState, emptyStats } from "../client/src/game/core/types";

/** minimal fabricated state — enough for victoryProgress/checkPathVictory */
function fakeState(overrides: Partial<GameState> = {}): GameState {
  const tribes = TRIBE_DEFS.slice(0, 4).map((d, i) => ({
    index: i, defIndex: i, name: d.name, color: d.color, colorName: d.colorName,
    passive: d.passive, passiveDesc: d.passiveDesc, isHuman: i === 0,
    stars: 5, techs: [d.startTech], alive: true, score: 0,
  }));
  return {
    phase: "playing", size: 11, seed: 42, preset: "continents", turn: 10, maxTurns: 30,
    difficulty: "normal", currentTribe: 0, tribes, tiles: [], cities: [], units: [],
    nextUnitId: 1, selectedUnitId: null, selectedCityId: null, winner: null, log: [],
    humanTribe: 0, aiThinking: false, recap: [], showRecap: false, scoreHistory: [],
    stats: tribes.map(() => emptyStats()),
    ...overrides,
  } as GameState;
}

describe("v20 asymmetric victory paths", () => {
  it("defines a path for all 8 factions plus the generic custom path", () => {
    expect(VICTORY_PATHS.length).toBe(9);
    const ids = new Set(VICTORY_PATHS.map((p) => p.id));
    expect(ids.size).toBe(9);
    for (const p of VICTORY_PATHS) {
      expect(p.name.length).toBeGreaterThan(2);
      expect(p.goal.length).toBeGreaterThan(5);
      expect(p.flavor.length).toBeGreaterThan(10);
    }
  });

  it("Auren Enlightenment completes when every tech is researched", () => {
    const s = fakeState();
    s.tribes[0].techs = TECHS.map((t) => t.id);
    const p = victoryProgress(s, 0)!;
    expect(p.def.id).toBe("enlightenment");
    expect(p.done).toBe(true);
    const hit = checkPathVictory(s);
    expect(hit?.tribe).toBe(0);
  });

  it("Kharzul Bloodforge tracks cities CAPTURED and completes at its target", () => {
    const s = fakeState();
    s.stats[1].citiesCaptured = BLOODFORGE_TARGET - 1;
    expect(victoryProgress(s, 1)!.done).toBe(false);
    s.stats[1].citiesCaptured = BLOODFORGE_TARGET;
    expect(victoryProgress(s, 1)!.done).toBe(true);
  });

  it("Bloodforge ignores battles that took no ground", () => {
    // The whole point of the change: the war tribe was farming fights instead
    // of taking cities, and winning fights was what its own path rewarded.
    const s = fakeState();
    s.stats[1].battlesWon = 999;
    s.stats[1].citiesCaptured = 0;
    const p = victoryProgress(s, 1)!;
    expect(p.def.id).toBe("bloodforge");
    expect(p.current).toBe(0);
    expect(p.done).toBe(false);
    expect(p.def.goal).toContain(String(p.target));
  });

  it("Sunwei Great Harvest sums owned city levels", () => {
    const s = fakeState();
    // The target is scaled to the board's resources and `current` is clamped to
    // it, so a resourceless board would floor the target at 8 and hide the sum
    // this test exists to check. 30 resource tiles is a typical 11x11.
    s.tiles = Array.from({ length: 121 }, (_, i) => ({
      x: i % 11, y: Math.floor(i / 11), terrain: "grass",
      resource: i < 30 ? "fruit" : null, explored: [true, true, true, true],
      cityId: null, ownerCityId: null,
    })) as never;
    s.cities = [
      { id: 0, x: 1, y: 1, name: "A", tribe: 2, level: 5, population: 0, isCapital: true },
      { id: 1, x: 3, y: 3, name: "B", tribe: 2, level: 7, population: 0, isCapital: false },
      { id: 2, x: 5, y: 5, name: "C", tribe: 0, level: 9, population: 0, isCapital: true },
    ];
    const p = victoryProgress(s, 2)!;
    expect(p.def.id).toBe("greatharvest");
    expect(p.current).toBe(12); // 5 + 7; the rival's level-9 city is excluded
    // The target is scaled to what the board can actually feed, not a flat
    // constant — fakeState() has no resource tiles, so it sits on the floor.
    expect(p.target).toBe(harvestTarget(s));

    s.cities[1].level = harvestTarget(s); // now comfortably over the line
    expect(victoryProgress(s, 2)!.done).toBe(true);
  });

  it("Vessari Plunder King reads cumulative loot, not the treasury", () => {
    const s = fakeState();
    s.tribes[3].stars = 999; // hoarding is no longer progress
    expect(victoryProgress(s, 3)!.current).toBe(0);
    expect(victoryProgress(s, 3)!.done).toBe(false);
    s.stats[3].starsPlundered = PLUNDER_TARGET;
    expect(victoryProgress(s, 3)!.done).toBe(true);
  });

  it("path victories are locked during the early-game grace window", () => {
    const s = fakeState({ turn: VICTORY_PATH_START_TURN - 1 });
    s.tribes[0].techs = TECHS.map((t) => t.id);
    expect(checkPathVictory(s)).toBeNull();
    s.turn = VICTORY_PATH_START_TURN;
    expect(checkPathVictory(s)?.tribe).toBe(0);
  });

  it("dead tribes and finished games never trigger a path win", () => {
    const s = fakeState();
    s.tribes[0].techs = TECHS.map((t) => t.id);
    s.tribes[0].alive = false;
    expect(checkPathVictory(s)).toBeNull();
    s.tribes[0].alive = true;
    s.phase = "gameover";
    expect(checkPathVictory(s)).toBeNull();
  });

  it("custom forge tribes (defIndex 8 = TRIBE_DEFS.length) fall back to the generic Ascendance path", () => {
    const s = fakeState();
    s.tribes[0].defIndex = 8;
    const target = victoryProgress(s, 0)!.target;
    expect(victoryProgress(s, 0)!.def.id).toBe("ascendance");
    s.tribes[0].score = target - 1;
    expect(victoryProgress(s, 0)!.done).toBe(false);
    s.tribes[0].score = target;
    expect(victoryProgress(s, 0)!.done).toBe(true);
  });

  it("Ascendance is a real goal, not a score every tribe passes anyway", () => {
    // It was 900, and that was a win button: a forged tribe cloned from Auren
    // won 85% of matches to Auren's 48% in the same seat, all of them through
    // Ascendance, while Auren's own average score was 1587. Any tribe sails
    // past 900, so the path fired the moment paths unlocked. This holds the
    // goal above the scores a normal match produces.
    const s = fakeState();
    s.tribes[0].defIndex = 8;
    expect(victoryProgress(s, 0)!.target).toBeGreaterThan(1200);
  });
});

describe("v47 Tide Mastery scales to the board's coast", () => {
  // A flat target of 4 made this an archipelago-only win condition: measured
  // over 40 matches per preset, Nerivane reached four ports in 53% of
  // archipelago games but 3-8% elsewhere, and on three of the four presets it
  // finished holding ZERO remaining legal port sites — highlands has four
  // shallow tiles on the whole board, shared by every tribe.
  const withShallow = (n: number) => {
    const s = fakeState();
    s.size = 11;
    s.tiles = Array.from({ length: 121 }, (_, i) => ({
      x: i % 11, y: Math.floor(i / 11),
      terrain: i < n ? "water" : "grass",
      resource: null, cityId: null, ownerCityId: null,
      explored: [true, true, true, true], port: null, ruin: false, greatRuin: false,
    })) as GameState["tiles"];
    return s;
  };

  it("asks for more ports on a wet board than a dry one", () => {
    expect(tideTarget(withShallow(19))).toBeGreaterThan(tideTarget(withShallow(4)));
  });

  it("never drops below 2 or climbs above 4", () => {
    for (const n of [0, 1, 4, 8, 12, 19, 60, 121]) {
      const t = tideTarget(withShallow(n));
      expect(t).toBeGreaterThanOrEqual(2);
      expect(t).toBeLessThanOrEqual(4);
    }
  });

  it("states the real number in the goal line, not a fixed one", () => {
    const s = withShallow(4); // a dry, highlands-like board
    s.tribes[0].defIndex = 4; // Nerivane
    const p = victoryProgress(s, 0)!;
    expect(p.def.id).toBe("tidemastery");
    expect(p.target).toBe(tideTarget(s));
    expect(p.def.goal).toContain(String(p.target));
  });
});

describe("Storm Legend is reachable", () => {
  // A unit becomes veteran at 3 kills, so the target is a multiple of that:
  // 4 veterans meant twelve kills across four units that all had to survive
  // together, and it fired once in 48 games. Valkyra was the weakest tribe in
  // the pool purely because its path never completed.
  it("asks for a number of veterans a tribe can actually hold at once", () => {
    const s = fakeState();
    s.tribes[0].defIndex = 6; // Valkyra
    const p = victoryProgress(s, 0)!;
    expect(p.def.id).toBe("stormlegend");
    expect(p.target).toBe(STORMLEGEND_TARGET);
    expect(p.target).toBeLessThanOrEqual(3);
    expect(p.def.goal).toContain(String(p.target));
  });
});

describe("Unbroken Wall is an endurance goal, not a city count", () => {
  // It used to ask for 3 WALLED cities while Dravok holds 2.36 on average, so
  // it completed in 13% of its games and no constant fixed it: 3 walls put
  // Dravok at 18%, 2 at 38%, and cheaper walls moved nothing. Counting rounds
  // instead tunes in single points and cannot outrun the tribe's city count.
  it("reads the wall streak, not the number of walls standing right now", () => {
    const s = fakeState();
    s.tribes[0].defIndex = 5; // Dravok
    s.tribes[0].wallStreak = 0;
    const p0 = victoryProgress(s, 0)!;
    expect(p0.def.id).toBe("unbrokenwall");
    expect(p0.target).toBe(UNBROKENWALL_TARGET);
    expect(p0.done).toBe(false);

    // a wall of cities standing this instant is not progress on its own
    s.cities.push(
      { id: 90, x: 1, y: 1, tribe: 0, name: "A", level: 1, pop: 0, isCapital: false, walls: true } as never,
      { id: 91, x: 2, y: 2, tribe: 0, name: "B", level: 1, pop: 0, isCapital: false, walls: true } as never,
    );
    expect(victoryProgress(s, 0)!.current).toBe(0);

    s.tribes[0].wallStreak = UNBROKENWALL_TARGET;
    expect(victoryProgress(s, 0)!.done).toBe(true);
  });

  it("states the real goal, including how many walls the streak needs", () => {
    const s = fakeState();
    s.tribes[0].defIndex = 5;
    const p = victoryProgress(s, 0)!;
    expect(p.def.goal).toContain(String(UNBROKENWALL_TARGET));
    expect(p.def.goal).toContain(String(WALL_HOLD_CITIES));
  });
});

describe("Great Harvest scales to what the board can grow", () => {
  // A flat 15 made Sunwei unreliable rather than weak: Great Harvest completed
  // in 20-37% of its games on one seed block and 7-13% on another, because an
  // 11x11 carries anywhere from 14 to 40 resource tiles and city levels come
  // from population, which comes from resources. Board AREA cannot see that —
  // two boards of the same size differ threefold in what they can feed.
  // fakeState() ships no tiles at all, so the board has to be built here or
  // every call just returns the clamp floor and the test proves nothing.
  const withResources = (n: number) => {
    const s = fakeState();
    s.tribes[0].defIndex = 2; // Sunwei
    s.tiles = Array.from({ length: 121 }, (_, i) => ({
      x: i % 11, y: Math.floor(i / 11), terrain: "grass",
      resource: i < n ? "fruit" : null, explored: [true, true, true, true],
      cityId: null, ownerCityId: null,
    })) as never;
    return s;
  };

  it("asks for less on a barren board than on a lush one", () => {
    const lean = harvestTarget(withResources(14));
    const lush = harvestTarget(withResources(40));
    expect(lush).toBeGreaterThan(lean);
  });

  it("stays inside its clamps so neither extreme is degenerate", () => {
    expect(harvestTarget(withResources(0))).toBeGreaterThanOrEqual(8);
    expect(harvestTarget(withResources(500))).toBeLessThanOrEqual(22);
  });

  it("quotes the number it is actually using in the goal text", () => {
    const s = withResources(30);
    const p = victoryProgress(s, 0)!;
    expect(p.def.id).toBe("greatharvest");
    expect(p.target).toBe(harvestTarget(s));
    expect(p.def.goal).toContain(String(p.target));
  });
});

describe("Great Harvest counts the board's endowment, not what is left of it", () => {
  // The first version of harvestTarget counted live resource tiles. Harvesting
  // sets tile.resource to null, so the goal lowered itself toward whoever was
  // chasing it — and Sunwei harvests most. Great Harvest completion jumped from
  // 27% to 60% and the divisor looked completely inert, because by match end
  // almost every resource is consumed and every divisor hit the clamp floor.
  // Tide Mastery is immune to this only because shallow water is not consumable.
  it("does not fall as resources are consumed", () => {
    const s = fakeState();
    s.resourceEndowment = 30;
    s.tiles = Array.from({ length: 121 }, (_, i) => ({
      x: i % 11, y: Math.floor(i / 11), terrain: "grass",
      resource: i < 30 ? "fruit" : null, explored: [true, true, true, true],
      cityId: null, ownerCityId: null,
    })) as never;
    const before = harvestTarget(s);

    // harvest the lot
    for (const t of s.tiles) (t as { resource: string | null }).resource = null;
    expect(harvestTarget(s)).toBe(before);
  });

  it("falls back to a live count for saves written before the endowment existed", () => {
    const s = fakeState();
    s.tiles = Array.from({ length: 121 }, (_, i) => ({
      x: i % 11, y: Math.floor(i / 11), terrain: "grass",
      resource: i < 30 ? "fruit" : null, explored: [true, true, true, true],
      cityId: null, ownerCityId: null,
    })) as never;
    delete (s as { resourceEndowment?: number }).resourceEndowment;
    expect(harvestTarget(s)).toBeGreaterThan(8);
  });
});
