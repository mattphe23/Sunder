import { beforeEach, describe, expect, it, vi } from "vitest";

const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { worldUnitIntents } from "../client/src/game/core/events";
import { game } from "../client/src/game/core/state";
import { GUARDIAN_TRIBE, type Unit } from "../client/src/game/core/types";

type WorldTurnStore = typeof game & { runWorldTurn(): void };

function unit(id: number, tribe: number, x: number, y: number, extra: Partial<Unit> = {}): Unit {
  return {
    id,
    type: "warrior",
    tribe,
    x,
    y,
    hp: 10,
    maxHp: 10,
    moved: false,
    attacked: false,
    kills: 0,
    boat: false,
    ...extra,
  };
}

function setupWorld(units: Unit[]) {
  game.newGame({
    size: 11,
    humanTribe: 0,
    difficulty: "normal",
    seed: 6707986,
    preset: "highlands",
    roster: [0, 1, 2, 3],
  });
  const state = game.state;
  state.turn = 12;
  state.units = units;
  state.nextUnitId = Math.max(...units.map((u) => u.id)) + 1;
  state.cities = [];
  state.camps = [
    { id: 1, x: 8, y: 8, strength: 1, nextActionTurn: 99 },
    { id: 2, x: 9, y: 9, strength: 1, nextActionTurn: 99 },
  ];
  state.storms = [];
  for (const tile of state.tiles) {
    tile.terrain = "grass";
    tile.resource = null;
    tile.cityId = null;
    tile.ownerCityId = null;
    tile.port = null;
    tile.ruin = false;
    tile.greatRuin = false;
  }
  return state;
}

function runWorldTurn() {
  (game as WorldTurnStore).runWorldTurn();
}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
});

describe("world hostile move occupancy", () => {
  it("allows the first live raider move and blocks the second stale intent for the same tile", () => {
    const firstRaider = unit(27, GUARDIAN_TRIBE, 1, 1, { raider: true });
    const secondRaider = unit(28, GUARDIAN_TRIBE, 2, 1, { raider: true });
    const target = unit(29, 0, 1, 3);
    const state = setupWorld([firstRaider, secondRaider, target]);

    const intents = worldUnitIntents(state);
    expect(intents.filter((intent) => intent.move?.x === 1 && intent.move?.y === 2)).toHaveLength(2);

    runWorldTurn();

    expect(firstRaider).toMatchObject({ id: 27, x: 1, y: 2, moved: false, attacked: false });
    expect(secondRaider).toMatchObject({ id: 28, x: 2, y: 1, moved: false, attacked: false });
    expect(state.units.filter((u) => u.x === 1 && u.y === 2)).toHaveLength(1);
    expect(new Set(state.units.map((u) => `${u.x},${u.y}`)).size).toBe(state.units.length);
  });

  it("also blocks a raider stale move when an awakened guardian took the destination first", () => {
    const guardian = unit(27, GUARDIAN_TRIBE, 1, 1, { guardian: true, awake: true });
    const raider = unit(28, GUARDIAN_TRIBE, 2, 1, { raider: true });
    const target = unit(29, 0, 1, 3);
    const state = setupWorld([guardian, raider, target]);

    expect(worldUnitIntents(state).filter((intent) => intent.move?.x === 1 && intent.move?.y === 2)).toHaveLength(2);

    runWorldTurn();

    expect(guardian).toMatchObject({ x: 1, y: 2 });
    expect(raider).toMatchObject({ x: 2, y: 1 });
    expect(state.units.filter((u) => u.x === 1 && u.y === 2)).toEqual([guardian]);
  });

  it("keeps a legal unoccupied hostile move unchanged", () => {
    const raider = unit(27, GUARDIAN_TRIBE, 1, 1, { raider: true });
    const target = unit(29, 0, 1, 3);
    const state = setupWorld([raider, target]);

    expect(worldUnitIntents(state)).toContainEqual(expect.objectContaining({ unit: raider, move: { x: 1, y: 2 } }));

    runWorldTurn();

    expect(raider).toMatchObject({ x: 1, y: 2, moved: false, attacked: false });
  });

  it("continues resolving a legal hostile attack against a standard unit", () => {
    const raider = unit(27, GUARDIAN_TRIBE, 1, 1, { raider: true });
    const target = unit(29, 0, 1, 2);
    const state = setupWorld([raider, target]);
    const targetHp = target.hp;

    expect(worldUnitIntents(state)).toContainEqual(expect.objectContaining({ unit: raider, targetUnitId: target.id }));

    runWorldTurn();

    expect(state.units.find((u) => u.id === raider.id)).toMatchObject({ x: 1, y: 1, moved: true, attacked: true });
    const resolvedTarget = state.units.find((u) => u.id === target.id);
    expect(resolvedTarget === undefined || resolvedTarget.hp < targetHp).toBe(true);
  });
});
