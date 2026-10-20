import { beforeEach, describe, expect, it, vi } from "vitest";
import { game } from "../client/src/game/core/state";

const storage: Record<string, string> = {};
const SAVE_KEY = "polyforge-save-v1";
const AI_OPENING_SEED = 1;
const HUMAN_OPENING_SEED = 4;

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
});

const opts = (seed: number, humanTribes?: number[]) => ({
  size: 11,
  seed,
  difficulty: "normal" as const,
  preset: "continents" as const,
  humanTribe: 0,
  humanTribes,
  roster: [0, 1, 2, 3],
});

function snapshotForRestore() {
  game.newGame(opts(20261020, [0, 1, 2, 3]));
  Object.assign(game.state, {
    turn: 8,
    currentTribe: 3,
    humanTribe: 0,
    turnOrder: [0, 1, 2, 3],
    orderPos: 3,
  });
  return JSON.parse(JSON.stringify(game.state)) as Record<string, unknown>;
}

function legacySnapshot() {
  const snapshot = snapshotForRestore();
  delete snapshot.scoreHistory;
  delete snapshot.stats;
  delete snapshot.turnOrder;
  delete snapshot.orderPos;
  for (const tribe of snapshot.tribes as Array<Record<string, unknown>>) delete tribe.defIndex;
  return snapshot;
}

function fingerprint() {
  const s = game.state;
  return {
    phase: s.phase,
    seed: s.seed,
    turn: s.turn,
    currentTribe: s.currentTribe,
    stars: s.tribes.map((tribe) => tribe.stars),
    techs: s.tribes.map((tribe) => [...tribe.techs]),
    units: s.units.map((unit) => ({ id: unit.id, tribe: unit.tribe, x: unit.x, y: unit.y })),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  for (const key of Object.keys(storage)) delete storage[key];
  game.toMenu();
  game.setActiveSlot(1);
});

describe("save and resume reliability", () => {
  it("normalizes an old local snapshot and completes a full round", () => {
    storage[SAVE_KEY] = JSON.stringify(legacySnapshot());

    expect(game.continueGame()).toBe(true);
    expect(game.state.stats).toHaveLength(4);
    expect(game.state.stats.every((stats) => stats.battlesWon === 0 && stats.citiesCaptured === 0)).toBe(true);
    expect(game.state.scoreHistory).toEqual([]);
    expect(game.state.turnOrder).toEqual([0, 1, 2, 3]);
    expect(game.state.orderPos).toBe(3);
    expect(game.state.tribes.map((tribe) => tribe.defIndex)).toEqual([0, 1, 2, 3]);

    expect(() => {
      for (let i = 0; i < 4; i++) game.endTurn();
    }).not.toThrow();
    expect(game.state.scoreHistory[9]).toHaveLength(4);
    const recordedScores = [...game.state.scoreHistory[9]];
    expect(game.continueGame()).toBe(true);
    expect(game.state.scoreHistory[9]).toEqual(recordedScores);
    expect(game.state.scoreHistory[0]).toBeUndefined();
  });

  it("normalizes old online snapshots without replacing recorded metrics", () => {
    const snapshot = legacySnapshot();
    snapshot.stats = [
      { battlesWon: 7, starsEarned: 19 },
      { citiesCaptured: 3 },
    ];

    expect(game.loadOnlineSnapshot(JSON.stringify(snapshot), 1)).toBe(true);
    expect(game.state.humanTribe).toBe(1);
    expect(game.state.stats[0]).toMatchObject({ battlesWon: 7, starsEarned: 19, citiesCaptured: 0 });
    expect(game.state.stats[1]).toMatchObject({ citiesCaptured: 3, battlesWon: 0 });
    expect(game.state.stats[2].starsEarned).toBe(0);
    expect(game.state.tribes.map((tribe) => tribe.defIndex)).toEqual([0, 1, 2, 3]);

    expect(() => {
      for (let i = 0; i < 4; i++) game.endTurn();
    }).not.toThrow();
    expect(game.state.scoreHistory[9]).toHaveLength(4);
  });

  it("rejects malformed local and online snapshots without replacing a healthy match", () => {
    game.newGame(opts(HUMAN_OPENING_SEED));
    const healthy = game.state;
    const before = fingerprint();
    storage[SAVE_KEY] = JSON.stringify({ phase: "playing", size: 11, tiles: [] });

    expect(game.continueGame()).toBe(false);
    expect(game.state).toBe(healthy);
    expect(fingerprint()).toEqual(before);
    expect(game.loadOnlineSnapshot("{not json", 0)).toBe(false);
    expect(game.state).toBe(healthy);
  });

  it("does not let a new-game AI callback mutate a replacement human opening", () => {
    game.newGame(opts(AI_OPENING_SEED));
    expect(game.state.currentTribe).not.toBe(0);
    game.newGame(opts(HUMAN_OPENING_SEED));
    expect(game.state.currentTribe).toBe(0);
    const before = fingerprint();

    vi.advanceTimersByTime(150);

    expect(fingerprint()).toEqual(before);
  });

  it("does not let a continued AI callback mutate the menu", () => {
    game.newGame(opts(AI_OPENING_SEED));
    const saved = JSON.stringify(game.state);
    game.toMenu();
    storage[SAVE_KEY] = saved;
    expect(game.continueGame()).toBe(true);
    expect(game.state.currentTribe).not.toBe(0);
    game.toMenu();

    vi.advanceTimersByTime(150);

    expect(game.state.phase).toBe("menu");
    expect(game.state.tribes).toEqual([]);
  });

  it("does not let an old callback mutate a restored human game", () => {
    game.newGame(opts(AI_OPENING_SEED));
    const restored = snapshotForRestore();
    restored.currentTribe = 0;
    restored.humanTribe = 0;
    restored.turnOrder = [0, 1, 2, 3];
    restored.orderPos = 0;
    storage[SAVE_KEY] = JSON.stringify(restored);
    expect(game.continueGame()).toBe(true);
    const before = fingerprint();

    vi.advanceTimersByTime(150);

    expect(fingerprint()).toEqual(before);
  });

  it("does not let a next-turn callback cross save slots", () => {
    game.newGame(opts(HUMAN_OPENING_SEED));
    expect(game.state.currentTribe).toBe(0);
    game.endTurn();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    const slotOneBefore = storage[SAVE_KEY];
    const replacement = snapshotForRestore();
    storage[SAVE_KEY] = slotOneBefore;
    replacement.currentTribe = 0;
    replacement.humanTribe = 0;
    replacement.turnOrder = [0, 1, 2, 3];
    replacement.orderPos = 0;
    storage[`${SAVE_KEY}:slot2`] = JSON.stringify(replacement);
    game.setActiveSlot(2);
    expect(game.continueGame()).toBe(true);
    const before = fingerprint();

    vi.advanceTimersByTime(150);

    expect(fingerprint()).toEqual(before);
    expect(storage[SAVE_KEY]).toBe(slotOneBefore);
  });

  it("still runs a valid delayed AI callback for the current game", () => {
    game.newGame(opts(AI_OPENING_SEED));
    const current = game.state.currentTribe;
    expect(current).not.toBe(0);

    vi.advanceTimersByTime(150);

    expect(game.state.phase).toBe("playing");
    expect(game.state.currentTribe).not.toBe(current);
  });

  it("persists a drained local world-event queue without emitting a delivery loop", () => {
    game.newGame(opts(HUMAN_OPENING_SEED));
    game.state.worldEvents = [{ kind: "campSpawned", text: "Camp forms", turn: 0, x: 1, y: 1 }];
    game.emit({ type: "changed" });

    expect(game.drainWorldEvents()).toHaveLength(1);
    expect(JSON.parse(storage[SAVE_KEY]).worldEvents).toEqual([]);
    expect(game.continueGame()).toBe(true);
    expect(game.drainWorldEvents()).toEqual([]);
  });

  it("continues removing a local save after game over", () => {
    game.newGame(opts(HUMAN_OPENING_SEED));
    expect(storage[SAVE_KEY]).toBeTruthy();

    game.state.phase = "gameover";
    game.emit({ type: "changed" });

    expect(storage[SAVE_KEY]).toBeUndefined();
  });
});
