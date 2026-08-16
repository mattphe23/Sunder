// v20 headless simulation: the game engine (client/src/game/core) is framework-
// agnostic, so we can run full AI-vs-AI matches in Node and assert the new
// asymmetric victory paths + AI hero care behave without a browser.
import { describe, it, expect } from "vitest";
import {
  VICTORY_PATHS, victoryProgress, checkPathVictory, VICTORY_PATH_START_TURN,
  PLUNDER_TARGET, BLOODFORGE_TARGET, HARVEST_TARGET, tideTarget,
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

  it("Kharzul Bloodforge tracks battlesWon and completes at its target", () => {
    const s = fakeState();
    s.stats[1].battlesWon = BLOODFORGE_TARGET - 1;
    expect(victoryProgress(s, 1)!.done).toBe(false);
    s.stats[1].battlesWon = BLOODFORGE_TARGET;
    expect(victoryProgress(s, 1)!.done).toBe(true);
  });

  it("Sunwei Great Harvest sums owned city levels", () => {
    const s = fakeState();
    s.cities = [
      { id: 0, x: 1, y: 1, name: "A", tribe: 2, level: 5, population: 0, isCapital: true },
      { id: 1, x: 3, y: 3, name: "B", tribe: 2, level: 7, population: 0, isCapital: false },
      { id: 2, x: 5, y: 5, name: "C", tribe: 0, level: 9, population: 0, isCapital: true },
    ];
    const p = victoryProgress(s, 2)!;
    expect(p.def.id).toBe("greatharvest");
    expect(p.current).toBe(12); // 5 + 7; the rival's level-9 city is excluded
    expect(p.target).toBe(HARVEST_TARGET);

    s.cities[1].level = HARVEST_TARGET; // now comfortably over the line
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
