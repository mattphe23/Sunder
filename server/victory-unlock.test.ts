import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameStore } from "../client/src/game/core/state";
import { TECHS, TRIBE_DEFS, emptyStats, type GameState } from "../client/src/game/core/types";
import { checkPathVictory, victoryProgress, victoryPathStartTurn, VICTORY_PATH_START_TURN } from "../client/src/game/core/victory";

// Synthetic boundary fixtures only; the comparison audit runs real GameStore AI.
function completedState(turn = 11): GameState {
  const tribes = TRIBE_DEFS.slice(0, 4).map((d, index) => ({
    ...d, index, defIndex: index, isHuman: false, stars: 5,
    techs: index === 0 ? TECHS.map(t => t.id) : [d.startTech], alive: true, score: 0,
  }));
  return {
    phase: "playing", size: 11, seed: 42, preset: "continents", turn, maxTurns: 30,
    difficulty: "normal", currentTribe: 0, tribes, tiles: [], cities: [], units: [],
    nextUnitId: 1, selectedUnitId: null, selectedCityId: null, winner: null, log: [],
    humanTribe: -1, aiThinking: false, recap: [], showRecap: false, scoreHistory: [],
    stats: tribes.map(() => emptyStats()),
  } as GameState;
}

beforeEach(() => { vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", undefined); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("victory path unlock: displayed turn 12", () => {
  it("retains canonical imports at internal 11 / displayed 12", () => {
    expect(VICTORY_PATH_START_TURN).toBe(11);
    expect(VICTORY_PATH_START_TURN + 1).toBe(12);
    expect(victoryPathStartTurn()).toBe(11);
  });
  it.each([0, 4, 7, 8, 9, 10])("blocks completed paths at internal %i without hiding completion", turn => {
    const s = completedState(turn);
    expect(victoryProgress(s, 0)?.done).toBe(true);
    expect(checkPathVictory(s)).toBeNull();
  });
  it.each([11, 12, 29])("accepts a completed living path at internal %i", turn => {
    expect(checkPathVictory(completedState(turn))?.tribe).toBe(0);
  });
  it("still excludes dead tribes and finished matches", () => {
    const s = completedState();
    s.tribes[0].alive = false;
    expect(victoryProgress(s, 0)).toBeNull();
    expect(checkPathVictory(s)).toBeNull();
    s.tribes[0].alive = true;
    s.phase = "gameover";
    expect(checkPathVictory(s)).toBeNull();
  });
  it("reads the explicit Node audit override at call time, not import time", () => {
    vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", "8");
    expect(victoryPathStartTurn()).toBe(8);
    expect(checkPathVictory(completedState(7))).toBeNull();
    expect(checkPathVictory(completedState(8))?.tribe).toBe(0);
    vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", "11");
    expect(checkPathVictory(completedState(8))).toBeNull();
    expect(VICTORY_PATH_START_TURN).toBe(11);
  });
  it.each(["", " ", " 8", "8 ", "-1", "1.5", "NaN", "Infinity", "1e1", "201", "9007199254740992", "8junk"])("safely rejects malformed/out-of-bound override %j", raw => {
    vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", raw);
    expect(victoryPathStartTurn()).toBe(11);
    expect(checkPathVictory(completedState(10))).toBeNull();
  });
  it.each(["0", "8", "11", "200"])("accepts bounded explicit integer %j", raw => {
    vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", raw);
    expect(victoryPathStartTurn()).toBe(Number(raw));
  });
  it("ignores an env override in browser scope", () => {
    vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", "8");
    vi.stubGlobal("window", {});
    expect(victoryPathStartTurn()).toBe(11);
    expect(checkPathVictory(completedState(8))).toBeNull();
  });
  it("safely defaults when process is absent", () => {
    try {
      vi.stubGlobal("process", undefined);
      expect(victoryPathStartTurn()).toBe(11);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("does not change path targets or goal wording between audit arms", () => {
    const s = completedState();
    vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", "8");
    const before = s.tribes.map(t => victoryProgress(s, t.index));
    vi.stubEnv("SUNDER_VICTORY_PATH_START_TURN", "11");
    expect(s.tribes.map(t => victoryProgress(s, t.index))).toEqual(before);
  });
  it("real engine checks at round start before any first-seat action", () => {
    const store = new GameStore({ effects: false });
    store.newGame({ size: 11, seed: 42, difficulty: "normal", humanTribe: -1, roster: [0, 1, 2, 3] });
    store.state.tribes[0].techs = TECHS.map(t => t.id);
    store.state.turn = 10;
    store.beginTurn(0);
    expect(store.state.phase).toBe("playing");
    store.state.turn = 11;
    const stars = store.state.tribes[0].stars;
    store.beginTurn(0);
    expect(store.state.phase).toBe("gameover");
    expect(store.state.winPath?.pathId).toBe("enlightenment");
    expect(store.state.tribes[0].stars).toBe(stars);
  });
  it("does not block early conquest/elimination wins", () => {
    const store = new GameStore({ effects: false });
    store.newGame({ size: 11, seed: 42, difficulty: "normal", humanTribe: -1, roster: [0, 1, 2, 3] });
    store.state.turn = 4;
    store.state.tribes.forEach((t, i) => { t.alive = i === 0; });
    store.checkDominationWin();
    expect(store.state.phase).toBe("gameover");
    expect(store.state.winner).toBe(0);
    expect(store.state.winPath).toBeNull();
  });
});
