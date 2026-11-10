import { describe, expect, it } from "vitest";
import { emptyStats, TECHS, TRIBE_DEFS, type GameState } from "../client/src/game/core/types";
import { VICTORY_PATH_START_TURN, victoryProgress, type VictoryProgress } from "../client/src/game/core/victory";
import {
  canShowVictoryPaths,
  presentVictoryProgress,
  victoryPathPresentation,
  victoryWarningThreshold,
} from "../client/src/game/ui/victoryPathPresentation";

function state(roster = [0, 1, 2, 3], overrides: Partial<GameState> = {}): GameState {
  const tribes = roster.map((defIndex, index) => {
    const def = TRIBE_DEFS[defIndex] ?? TRIBE_DEFS[0];
    return {
      ...def, index, defIndex, name: defIndex >= TRIBE_DEFS.length ? `Forged ${index}` : def.name,
      isHuman: index === 0, stars: 5, techs: [def.startTech], alive: true, score: 0,
    };
  });
  return {
    phase: "playing", size: 11, seed: 42, preset: "continents",
    turn: VICTORY_PATH_START_TURN, maxTurns: 30, difficulty: "normal", currentTribe: 0,
    tribes, tiles: [], cities: [], units: [], nextUnitId: 1,
    selectedUnitId: null, selectedCityId: null, winner: null, log: [], humanTribe: 0,
    aiThinking: false, recap: [], showRecap: false, scoreHistory: [],
    stats: tribes.map(() => emptyStats()), ...overrides,
  };
}

function progress(current: number, target: number, done = current >= target): VictoryProgress {
  return { def: { id: "test", name: "Test path", goal: `Reach ${target}`, flavor: "Test" }, current, target, done };
}

function tiles(s: GameState, shallow: number) {
  s.tiles = Array.from({ length: s.size * s.size }, (_, i) => ({
    x: i % s.size, y: Math.floor(i / s.size), terrain: i < shallow ? "water" : "grass",
    resource: null, cityId: null, ownerCityId: null, explored: s.tribes.map(() => false),
    port: null, ruin: false, greatRuin: false,
  }));
}

describe("safe victory-path presentation", () => {
  it.each([[2, 1], [3, 2], [4, 2], [6, 4], [9, 6], [1600, 1066]])(
    "rounds the warning down for integer target %i to %i",
    (target, threshold) => {
      expect(victoryWarningThreshold(target)).toBe(threshold);
      expect(presentVictoryProgress(progress(threshold - 1, target), 0).near).toBe(false);
      expect(presentVictoryProgress(progress(threshold, target), 0).near).toBe(true);
      expect(presentVictoryProgress(progress(threshold, target), 0).ready).toBe(false);
    },
  );

  it("warns a two-port path at one port with actual 50% display, before completion", () => {
    const p = presentVictoryProgress(progress(1, 2), VICTORY_PATH_START_TURN);
    expect(p).toMatchObject({ near: true, ready: false, ratio: 0.5, percent: 50 });
  });

  it("has a warning strictly before every multi-step integer goal", () => {
    for (let target = 2; target <= 2000; target++) {
      const threshold = victoryWarningThreshold(target)!;
      expect(threshold).toBeGreaterThanOrEqual(1);
      expect(threshold).toBeLessThanOrEqual(target - 1);
    }
  });

  it("cannot promise a prior warning for a one-step path", () => {
    expect(victoryWarningThreshold(1)).toBe(1);
    expect(presentVictoryProgress(progress(0, 1), 0).near).toBe(false);
    expect(presentVictoryProgress(progress(1, 1), 0)).toMatchObject({ near: true, ready: true });
  });

  it("uses the exact two-thirds boundary for non-integer goals", () => {
    const target = 7.5;
    expect(victoryWarningThreshold(target)).toBe(5);
    expect(presentVictoryProgress(progress(4.999, target), 0).near).toBe(false);
    expect(presentVictoryProgress(progress(5, target), 0).near).toBe(true);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])("rejects invalid target %s without false alerts", target => {
    const p = presentVictoryProgress(progress(100, target, true), 0);
    expect(victoryWarningThreshold(target)).toBeNull();
    expect(p).toMatchObject({ valid: false, near: false, ready: false, ratio: 0, current: 0, target: 0 });
    expect(p.status).toBe("Progress unavailable");
  });

  it.each([NaN, Infinity, -Infinity])("rejects nonfinite current %s even if canonical done is true", current => {
    expect(presentVictoryProgress(progress(current, 6, true), 0)).toMatchObject({ valid: false, near: false, ready: false, ratio: 0 });
  });

  it("clamps negative and excess progress and never trusts an inconsistent done flag", () => {
    expect(presentVictoryProgress(progress(-4, 6, true), 0)).toMatchObject({ current: 0, ratio: 0, near: false, ready: false });
    expect(presentVictoryProgress(progress(999, 6, false), 0)).toMatchObject({ current: 6, ratio: 1, percent: 100, near: true, ready: true });
    expect(presentVictoryProgress(progress(99.999, 100), 0).percent).toBe(99);
  });

  it("reports ready-but-locked, countdown and unlock turn from the core constant", () => {
    const p = presentVictoryProgress(progress(6, 6), VICTORY_PATH_START_TURN - 2);
    expect(p).toMatchObject({ ready: true, near: true, locked: true, roundsUntilUnlock: 2, unlockTurn: VICTORY_PATH_START_TURN + 1 });
    expect(p.status).toContain("Ready, but locked");
    expect(p.status).toContain(`Turn ${VICTORY_PATH_START_TURN + 1}`);
    expect(p.status).toContain("2 rounds until unlock");
    const last = presentVictoryProgress(progress(6, 6), VICTORY_PATH_START_TURN - 1);
    expect(last.status).toContain("1 round until unlock");
    const unlocked = presentVictoryProgress(progress(6, 6), VICTORY_PATH_START_TURN);
    expect(unlocked).toMatchObject({ locked: false, roundsUntilUnlock: 0 });
    expect(unlocked.status).toBe("Ready · checked at start of round");
  });
});

describe("all living rival paths and viewer boundaries", () => {
  it("presents every living rival rather than assuming four tribes", () => {
    const s = state([0, 1, 2, 3, 4, 5, 6, 7, 8, 35]);
    const result = victoryPathPresentation(s);
    expect(result.own?.tribeIndex).toBe(0);
    expect(result.rivals.map(p => p.tribeIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.rivals.slice(-2).map(p => p.pathId)).toEqual(["ascendance", "ascendance"]);
    for (const p of [result.own!, ...result.rivals]) {
      const canonical = victoryProgress(s, p.tribeIndex)!;
      expect(p.goal).toBe(canonical.def.goal);
      expect(p.current).toBe(canonical.current);
      expect(p.target).toBe(canonical.target);
    }
  });

  it("excludes dead tribes even with complete counters, and excludes the viewing owner", () => {
    const s = state();
    s.stats[1].citiesCaptured = 100;
    s.tribes[1].alive = false;
    s.tribes[0].techs = TECHS.map(t => t.id);
    const p = victoryPathPresentation(s);
    expect(p.rivals.map(r => r.tribeIndex)).toEqual([2, 3]);
    expect(p.nearRivals).toEqual([]);
    expect(p.alertText).toBeNull();
    expect(p.own?.ready).toBe(true);
  });

  it("includes other hotseat humans as competitive players and derives the new viewer afresh", () => {
    const s = state([0, 1, 4], { humanTribes: [0, 1] });
    s.tribes[1].isHuman = true;
    s.stats[1].citiesCaptured = victoryProgress(s, 1)!.target;
    const first = victoryPathPresentation(s);
    expect(first.rivals.find(p => p.tribeIndex === 1)).toMatchObject({ isHuman: true, near: true });
    expect(first.alertText).toContain(s.tribes[1].name);
    s.humanTribe = 1;
    s.currentTribe = 1;
    const second = victoryPathPresentation(s);
    expect(second.own?.tribeIndex).toBe(1);
    expect(second.rivals.map(p => p.tribeIndex)).toEqual([0, 2]);
    expect(second.alertText).toBeNull();
  });

  it("shows all near rivals in the panel and an aggregate persistent alert independent of logs", () => {
    const s = state([0, 1, 3, 4, 5]);
    for (const i of [1, 2]) {
      const target = victoryProgress(s, i)!.target;
      if (i === 1) s.stats[i].citiesCaptured = victoryWarningThreshold(target)!;
      else s.stats[i].starsPlundered = victoryWarningThreshold(target)!;
    }
    const snapshot = JSON.stringify(s);
    const first = victoryPathPresentation(s);
    expect(first.nearRivals.map(p => p.tribeIndex)).toEqual([1, 2]);
    expect(first.alertText).toBe("2 rivals close to victory");
    expect(JSON.stringify(s)).toBe(snapshot);
    s.log.unshift("An unrelated routine event");
    expect(victoryPathPresentation(s).alertText).toBe(first.alertText);
    s.stats[1].citiesCaptured = 0;
    s.stats[2].starsPlundered = 0;
    expect(victoryPathPresentation(s).alertText).toBeNull();
  });

  it("keeps warning even while a ready rival is locked", () => {
    const s = state([0, 1], { turn: VICTORY_PATH_START_TURN - 1 });
    s.stats[1].citiesCaptured = victoryProgress(s, 1)!.target;
    const p = victoryPathPresentation(s);
    expect(p.nearRivals[0]).toMatchObject({ ready: true, locked: true });
    expect(p.alertText).toBe(`${s.tribes[1].name} close to Bloodforge`);
  });

  it.each([
    { handoff: 0 }, { handoff: 1 }, { aiThinking: true }, { currentTribe: 1 },
    { phase: "menu" as const }, { phase: "gameover" as const },
  ])("suppresses alerts outside the settled human view: %j", overrides => {
    const s = state([0, 1], overrides);
    s.stats[1].citiesCaptured = victoryProgress(s, 1)!.target;
    expect(victoryPathPresentation(s).alertText).toBeNull();
    if (s.handoff != null || s.phase !== "playing") expect(canShowVictoryPaths(s)).toBe(false);
  });

  it("shows updated warning after the rival AI turn without cached alerts", () => {
    const s = state([0, 1], { aiThinking: true, currentTribe: 1 });
    s.stats[1].citiesCaptured = victoryWarningThreshold(victoryProgress(s, 1)!.target)!;
    expect(victoryPathPresentation(s).alertText).toBeNull();
    s.aiThinking = false;
    s.currentTribe = s.humanTribe;
    expect(victoryPathPresentation(s).alertText).toContain("close to Bloodforge");
  });

  it("hides paths from a missing/non-human viewer and handles no living rivals", () => {
    const s = state([0]);
    expect(victoryPathPresentation(s).rivals).toEqual([]);
    expect(victoryPathPresentation(s).alertText).toBeNull();
    s.humanTribe = 99;
    expect(canShowVictoryPaths(s)).toBe(false);
    s.humanTribe = 0;
    s.tribes[0].isHuman = false;
    expect(canShowVictoryPaths(s)).toBe(false);
  });

  it("safely declines minimal HUD render states without a roster", () => {
    const minimal = { phase: "playing", log: ["A game event"] } as GameState;
    expect(canShowVictoryPaths(minimal)).toBe(false);
  });

  it("uses actual adaptive Tide and Harvest goals, not static path-definition strings", () => {
    const s = state([0, 4, 2]);
    tiles(s, 4);
    s.resourceEndowment = 30;
    s.tiles[0].port = 1;
    const dry = victoryPathPresentation(s);
    expect(dry.rivals[0]).toMatchObject({ target: 2, current: 1, percent: 50, near: true, ready: false });
    expect(dry.rivals[0].goal).toContain("2 ports");
    expect(dry.rivals[1].goal).toContain(String(dry.rivals[1].target));
    tiles(s, 19);
    s.resourceEndowment = 45;
    const wet = victoryPathPresentation(s);
    expect(wet.rivals[0].target).toBeGreaterThan(dry.rivals[0].target);
    expect(wet.rivals[0].goal).toContain(`${wet.rivals[0].target} ports`);
    expect(wet.rivals[1].target).toBeGreaterThan(dry.rivals[1].target);
    expect(wet.rivals[1].goal).toBe(victoryProgress(s, 2)!.def.goal);
  });

  it("uses canonical board-scaled custom goals and not the legacy 900 score text", () => {
    const s = state([0, 99], { size: 15 });
    const p = victoryPathPresentation(s).rivals[0];
    expect(p.pathName).toBe("Ascendance");
    expect(p.target).toBe(victoryProgress(s, 1)!.target);
    expect(p.goal).toBe(`Reach ${p.target} score`);
    expect(p.target).toBeGreaterThan(900);
  });

  it("publishes only path counters, without hidden coordinates, unit identities or army totals", () => {
    const s = state([0, 6]);
    s.units = [{ id: 77, tribe: 1, x: 7, y: 8, veteran: true }] as GameState["units"];
    const p = victoryPathPresentation(s).rivals[0];
    expect(p.current).toBe(1); // Storm Legend's actual public path counter.
    expect(p).not.toHaveProperty("units");
    expect(p).not.toHaveProperty("unitCount");
    expect(p).not.toHaveProperty("x");
    expect(p).not.toHaveProperty("y");
    expect(p).not.toHaveProperty("tiles");
    expect(p).not.toHaveProperty("cities");
    expect(p).not.toHaveProperty("stats");
  });
});
