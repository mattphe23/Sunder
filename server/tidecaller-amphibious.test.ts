import { beforeEach, describe, expect, it, vi } from "vitest";

const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import { attackableUnits, combatModifiers, previewCombat, reachableTiles } from "../client/src/game/core/rules";
import type { GameState, Terrain, Unit, UnitType } from "../client/src/game/core/types";

function unit(id: number, type: UnitType, tribe: number, x: number, y: number, extra: Partial<Unit> = {}): Unit {
  return {
    id,
    type,
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

/** A deliberately constrained legal board: only tiles declared by a test are passable. */
function setup(): GameState {
  game.newGame({
    size: 7,
    humanTribe: 0,
    difficulty: "normal",
    seed: 4247,
    preset: "continents",
    roster: [4, 0], // tribe 0 is Nerivane
  });
  const state = game.state;
  state.currentTribe = 0;
  state.humanTribe = 0;
  state.humanTribes = [0];
  state.turnOrder = [0, 1];
  state.orderPos = 0;
  state.aiThinking = false;
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.storms = [];
  state.log = [];
  state.tribes[0].techs = [];
  for (const tile of state.tiles) {
    tile.terrain = "ocean";
    tile.resource = null;
    tile.cityId = null;
    tile.ownerCityId = null;
    tile.port = null;
    tile.ruin = false;
    tile.greatRuin = false;
    tile.road = false;
  }
  return state;
}

function terrain(state: GameState, x: number, y: number, kind: Terrain, port: number | null = null) {
  const tile = state.tiles[y * state.size + x];
  tile.terrain = kind;
  tile.port = port;
}

function positions(tiles: { x: number; y: number }[]) {
  return tiles.map((tile) => `${tile.x},${tile.y}`);
}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
});

describe("Tidecaller amphibious shallow-water movement", () => {
  it("uses its normal two-point movement through unported shallow water and remains unembarked", () => {
    const state = setup();
    const tidecaller = unit(101, "tidecaller", 0, 1, 3);
    state.units = [tidecaller];
    terrain(state, 1, 3, "grass");
    terrain(state, 2, 3, "water");
    terrain(state, 3, 3, "water");

    // No Sailing tech and no port are intentionally present on either water tile.
    expect(positions(reachableTiles(state, tidecaller))).toContain("3,3");

    game.moveUnit(tidecaller.id, 3, 3);

    expect(tidecaller).toMatchObject({ x: 3, y: 3, moved: true, boat: false, attacked: false });
    expect(state.log).not.toContain("Tidecaller embarked at the port.");
  });

  it("returns from shallow water to land in its normal non-boat state", () => {
    const state = setup();
    const tidecaller = unit(109, "tidecaller", 0, 1, 3);
    state.units = [tidecaller];
    terrain(state, 1, 3, "water");
    terrain(state, 2, 3, "grass");

    game.moveUnit(tidecaller.id, 2, 3);

    expect(tidecaller).toMatchObject({ x: 2, y: 3, moved: true, boat: false, attacked: false });
    expect(state.log).not.toContain("Tidecaller came ashore.");
  });

  it("can dash-attack after entering shallow water and receives the existing +30% water modifier", () => {
    const state = setup();
    const tidecaller = unit(102, "tidecaller", 0, 1, 3);
    const defender = unit(103, "warrior", 1, 3, 3);
    state.units = [tidecaller, defender];
    terrain(state, 1, 3, "grass");
    terrain(state, 2, 3, "water");
    terrain(state, 3, 3, "grass");

    game.moveUnit(tidecaller.id, 2, 3);

    expect(tidecaller).toMatchObject({ moved: true, boat: false, attacked: false });
    expect(attackableUnits(state, tidecaller).map((u) => u.id)).toContain(defender.id);
    const waterCombat = previewCombat(state, tidecaller, defender);
    const landCombat = previewCombat(state, { ...tidecaller, x: 1, y: 3 }, defender);
    expect(waterCombat.damageToDefender).toBeGreaterThan(landCombat.damageToDefender);
    expect(combatModifiers(state, tidecaller, defender)).toContainEqual({
      text: "Tidecaller +30% from water",
      side: "atk",
    });

    const defenderHp = defender.hp;
    game.attack(tidecaller.id, defender.id);

    expect(defender.hp).toBe(defenderHp - waterCombat.damageToDefender);
    expect(tidecaller).toMatchObject({ moved: true, attacked: true, boat: false });
  });

  it("keeps an ordinary unit embarked and unable to attack after a legal port transport move", () => {
    const state = setup();
    state.tribes[0].techs = ["sailing"];
    const transport = unit(104, "warrior", 0, 1, 3);
    const defender = unit(105, "warrior", 1, 3, 3);
    state.units = [transport, defender];
    terrain(state, 1, 3, "grass");
    terrain(state, 2, 3, "water", 0);
    terrain(state, 3, 3, "grass");

    game.moveUnit(transport.id, 2, 3);

    expect(transport).toMatchObject({ moved: true, boat: true, attacked: true });
    expect(attackableUnits(state, transport)).toEqual([]);
    const defenderHp = defender.hp;
    game.attack(transport.id, defender.id);
    expect(defender.hp).toBe(defenderHp);
  });

  it("does not grant a non-boat Tidecaller free ocean movement, even with Navigation and a port", () => {
    const state = setup();
    state.tribes[0].techs = ["sailing", "navigation"];
    const tidecaller = unit(106, "tidecaller", 0, 1, 3);
    state.units = [tidecaller];
    terrain(state, 1, 3, "water", 0);
    terrain(state, 2, 3, "ocean");

    expect(positions(reachableTiles(state, tidecaller))).not.toContain("2,3");
    game.moveUnit(tidecaller.id, 2, 3);
    expect(tidecaller).toMatchObject({ x: 1, y: 3, moved: false, boat: false, attacked: false });
  });

  it("leaves a legacy embarked Tidecaller untouched until a shallow-water move, then undo restores its original boat state", () => {
    const state = setup();
    const legacyTidecaller = unit(107, "tidecaller", 0, 1, 3, { boat: true });
    state.units = [legacyTidecaller];
    terrain(state, 1, 3, "water", 0);
    terrain(state, 2, 3, "water");

    // Loading the existing save representation is non-mutating.
    const saved = game.serializeState();
    expect(JSON.parse(saved).units).toContainEqual(expect.objectContaining({ id: legacyTidecaller.id, boat: true }));
    expect(game.loadOnlineSnapshot(saved, 0)).toBe(true);
    const loadedLegacyTidecaller = game.state.units.find((u) => u.id === legacyTidecaller.id)!;
    expect(loadedLegacyTidecaller.boat).toBe(true);

    game.moveUnit(loadedLegacyTidecaller.id, 2, 3);
    expect(loadedLegacyTidecaller).toMatchObject({ x: 2, y: 3, moved: true, boat: false, attacked: false });
    expect(game.canUndo()).toBe(true);

    game.undoMove();
    expect(loadedLegacyTidecaller).toMatchObject({ x: 1, y: 3, moved: false, boat: true, attacked: false });
  });

  it("retains Navigation ocean travel for an already embarked legacy Tidecaller", () => {
    const state = setup();
    state.tribes[0].techs = ["sailing", "navigation"];
    const legacyTidecaller = unit(108, "tidecaller", 0, 1, 3, { boat: true });
    state.units = [legacyTidecaller];
    terrain(state, 1, 3, "water", 0);
    terrain(state, 2, 3, "ocean");

    expect(positions(reachableTiles(state, legacyTidecaller))).toContain("2,3");
    game.moveUnit(legacyTidecaller.id, 2, 3);
    expect(legacyTidecaller).toMatchObject({ x: 2, y: 3, moved: true, boat: true, attacked: true });
  });
});
