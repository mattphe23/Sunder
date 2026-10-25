import { beforeEach, describe, expect, it, vi } from "vitest";

const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import {
  WAKECUTTER_COST, attackableUnits, canUpgradeWakecutter, combatStats,
  isVisibleTo, isWakecutter, knockbackDestination, reachableTiles, starIncome,
} from "../client/src/game/core/rules";
import { navalMvpPreviewEnabled } from "../client/src/game/core/navalMvp";
import type { GameState, Terrain, Unit, UnitType } from "../client/src/game/core/types";

function unit(id: number, type: UnitType, tribe: number, x: number, y: number, extra: Partial<Unit> = {}): Unit {
  return {
    id, type, tribe, x, y, hp: 10, maxHp: 10,
    moved: false, attacked: false, kills: 0, boat: false, ...extra,
  };
}

function setup(): GameState {
  game.newGame({
    size: 7, humanTribe: 0, difficulty: "normal", seed: 20261025,
    preset: "continents", roster: [0, 1],
  });
  const state = game.state;
  state.previewRuleset = "naval-mvp";
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
  state.tribes[0].techs = ["sailing", "navigation"];
  state.tribes[0].stars = 10;
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

function positionList(tiles: { x: number; y: number }[]) {
  return tiles.map((tile) => `${tile.x},${tile.y}`);
}

function healthyFingerprint() {
  return {
    state: game.state,
    seed: game.state.seed,
    units: game.state.units.map((u) => ({ id: u.id, x: u.x, y: u.y, vessel: u.vessel })),
  };
}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];
  game.toMenu();
});

describe("Wakecutter development preview gate", () => {
  it("requires DEV, devgame, and the exact naval-mvp=1 value", () => {
    expect(navalMvpPreviewEnabled("?devgame=6104,11,0,archipelago&naval-mvp=1", true)).toBe(true);
    expect(navalMvpPreviewEnabled("?devgame=6104,11,0,archipelago&naval-mvp=1", false)).toBe(false);
    for (const search of ["", "?naval-mvp=1", "?devgame=1", "?devgame=1&naval-mvp=0", "?devgame=1&naval-mvp=true", "?devgame=1&naval-mvp=2"]) {
      expect(navalMvpPreviewEnabled(search, true)).toBe(false);
    }
  });

  it("leaves a vessel field inert without the persisted preview ruleset", () => {
    const state = setup();
    state.previewRuleset = undefined;
    const legacyTransport = unit(1, "warrior", 0, 2, 3, { boat: true, vessel: "wakecutter" });
    const enemyBoat = unit(2, "warrior", 1, 3, 3, { boat: true });
    state.units = [legacyTransport, enemyBoat];
    terrain(state, 2, 3, "water", 0);
    terrain(state, 3, 3, "water");

    expect(isWakecutter(state, legacyTransport)).toBe(false);
    expect(attackableUnits(state, legacyTransport)).toEqual([]);
    expect(combatStats(state, legacyTransport).attack).toBe(2);
  });
});

describe("Wakecutter port upgrade", () => {
  it("requires an embarked nonhero Warrior, friendly port, Navigation, and four stars", () => {
    const state = setup();
    const warrior = unit(10, "warrior", 0, 2, 3, { boat: true, hp: 7, maxHp: 15, kills: 2, veteran: true });
    state.units = [warrior];
    terrain(state, 2, 3, "water", 0);

    expect(canUpgradeWakecutter(state, warrior)).toBe(true);
    state.tribes[0].stars = WAKECUTTER_COST - 1;
    expect(canUpgradeWakecutter(state, warrior)).toBe(false);
    game.upgradeWakecutter(warrior.id);
    expect(warrior.vessel).toBeUndefined();

    state.tribes[0].stars = 10;
    state.tribes[0].techs = ["sailing"];
    expect(canUpgradeWakecutter(state, warrior)).toBe(false);
    state.tribes[0].techs.push("navigation");
    terrain(state, 2, 3, "water", 1);
    expect(canUpgradeWakecutter(state, warrior)).toBe(false);
    terrain(state, 2, 3, "water", 0);
    warrior.hero = true;
    expect(canUpgradeWakecutter(state, warrior)).toBe(false);
    warrior.hero = false;

    const beforeStars = state.tribes[0].stars;
    game.upgradeWakecutter(warrior.id);
    expect(state.tribes[0].stars).toBe(beforeStars - WAKECUTTER_COST);
    expect(warrior).toMatchObject({ boat: true, vessel: "wakecutter", hp: 7, maxHp: 15, kills: 2, veteran: true, moved: true, attacked: true });
  });

  it("does not permit upgrade from an ordinary production ruleset", () => {
    const state = setup();
    state.previewRuleset = undefined;
    const warrior = unit(11, "warrior", 0, 2, 3, { boat: true });
    state.units = [warrior];
    terrain(state, 2, 3, "water", 0);
    expect(canUpgradeWakecutter(state, warrior)).toBe(false);
    game.upgradeWakecutter(warrior.id);
    expect(warrior.vessel).toBeUndefined();
  });
});

describe("Wakecutter water-only combat", () => {
  it("attacks adjacent embarked water vessels with 2.5/1.5/range 1 and no dash", () => {
    const state = setup();
    const cutter = unit(20, "warrior", 0, 2, 3, { boat: true, vessel: "wakecutter", hp: 8, maxHp: 15, veteran: true });
    const transport = unit(21, "warrior", 1, 3, 3, { boat: true });
    const landUnit = unit(22, "warrior", 1, 2, 2);
    const swimmer = unit(23, "tidecaller", 1, 3, 2);
    state.units = [cutter, transport, landUnit, swimmer];
    terrain(state, 2, 3, "water", 0);
    terrain(state, 3, 3, "ocean");
    terrain(state, 2, 2, "grass");
    terrain(state, 3, 2, "water");

    expect(combatStats(state, cutter)).toMatchObject({ attack: 2.5, defense: 1.5, range: 1, dash: false });
    expect(attackableUnits(state, cutter).map((u) => u.id)).toEqual([transport.id]);
    cutter.moved = true;
    expect(attackableUnits(state, cutter)).toEqual([]);
  });

  it("keeps the existing transport as a nonattacking 30%-penalty vessel", () => {
    const state = setup();
    const transport = unit(24, "warrior", 0, 2, 3, { boat: true });
    const enemyBoat = unit(25, "warrior", 1, 3, 3, { boat: true });
    state.units = [transport, enemyBoat];
    terrain(state, 2, 3, "water", 0);
    terrain(state, 3, 3, "water");

    expect(attackableUnits(state, transport)).toEqual([]);
    expect(combatStats(state, transport).attack).toBe(2);
  });
});

describe("Wakecutter movement, fog, undo, and siege guards", () => {
  it("keeps ocean/navigation and storm restrictions, does not extend fog, and scuttles on legal landing", () => {
    const state = setup();
    const cutter = unit(30, "warrior", 0, 2, 3, { boat: true, vessel: "wakecutter", hp: 8, maxHp: 15, kills: 2, veteran: true });
    state.units = [cutter];
    terrain(state, 2, 3, "water", 0);
    terrain(state, 3, 3, "ocean");
    terrain(state, 4, 3, "grass");
    state.storms = [{ id: 1, x: 3, y: 3, radius: 0, expiresTurn: 9 }];

    expect(positionList(reachableTiles(state, cutter))).not.toContain("3,3");
    state.storms = [];
    expect(positionList(reachableTiles(state, cutter))).toContain("3,3");
    expect(isVisibleTo(state, 0, 5, 3)).toBe(false);

    game.moveUnit(cutter.id, 4, 3);
    expect(cutter).toMatchObject({ x: 4, y: 3, boat: false, moved: true, attacked: true, hp: 8, maxHp: 15, kills: 2, veteran: true });
    expect(cutter.vessel).toBeUndefined();
    expect(game.canUndo()).toBe(true);
    game.undoMove();
    expect(cutter).toMatchObject({ x: 2, y: 3, boat: true, vessel: "wakecutter", moved: false, attacked: false, hp: 8, maxHp: 15, kills: 2, veteran: true });
  });

  it("cannot capture or suppress income, including when an invalid in-memory Wakecutter is placed on a city", () => {
    const state = setup();
    const city = state.cities[0] = { id: 0, x: 3, y: 3, name: "Harbor", tribe: 1, level: 2, population: 0, isCapital: true, walls: false, rewards: [] };
    terrain(state, city.x, city.y, "water");
    state.tiles[city.y * state.size + city.x].cityId = city.id;
    const cutter = unit(31, "warrior", 0, city.x, city.y, { boat: true, vessel: "wakecutter" });
    state.units = [cutter];

    const income = starIncome(state, 1);
    expect(income).toBe(3);
    game.captureCity(cutter.id);
    expect(city.tribe).toBe(1);
  });

  it("keeps a knocked-back Wakecutter at sea without scuttling its vessel", () => {
    const state = setup();
    const colossus = unit(32, "colossus", 1, 1, 3);
    const cutter = unit(33, "warrior", 0, 2, 3, { boat: true, vessel: "wakecutter", hp: 50, maxHp: 50 });
    state.units = [colossus, cutter];
    terrain(state, 1, 3, "grass");
    terrain(state, 2, 3, "water", 0);
    terrain(state, 3, 3, "ocean");

    expect(knockbackDestination(state, colossus, cutter)).toEqual({ x: 3, y: 3 });
    game.attack(colossus.id, cutter.id);
    expect(cutter).toMatchObject({ x: 3, y: 3, boat: true, vessel: "wakecutter" });
  });
});

describe("Wakecutter persistence validation", () => {
  it("preserves an ordinary legacy transport with absent vessel on normal save resume", () => {
    game.newGame({ size: 7, humanTribe: 0, difficulty: "normal", seed: 5050, preset: "continents", roster: [0, 1] });
    const passenger = game.state.units.find((u) => u.tribe === 0 && u.type === "warrior")!;
    passenger.boat = true;
    delete passenger.vessel;
    game.emit({ type: "changed" });

    expect(game.continueGame()).toBe(true);
    const resumed = game.state.units.find((u) => u.id === passenger.id)!;
    expect(resumed).toMatchObject({ boat: true });
    expect(resumed.vessel).toBeUndefined();
  });

  it("fails closed on a valid preview snapshot when the exact development runtime gate is absent", () => {
    game.newGame({ size: 7, humanTribe: 0, difficulty: "normal", seed: 5151, preset: "continents", roster: [0, 1] });
    const healthy = healthyFingerprint();
    const snapshot = JSON.parse(game.serializeState());
    snapshot.previewRuleset = "naval-mvp";
    snapshot.units[0].boat = true;
    snapshot.units[0].vessel = "wakecutter";
    snapshot.tiles[snapshot.units[0].y * snapshot.size + snapshot.units[0].x].terrain = "water";

    expect(game.loadOnlineSnapshot(JSON.stringify(snapshot), 0)).toBe(false);
    expect(healthyFingerprint()).toEqual(healthy);
  });

  it.each([
    ["unknown vessel", (snapshot: any) => { snapshot.units[0].vessel = "frigate"; }],
    ["vessel on land", (snapshot: any) => { snapshot.previewRuleset = "naval-mvp"; snapshot.units[0].boat = true; snapshot.units[0].vessel = "wakecutter"; snapshot.tiles[snapshot.units[0].y * snapshot.size + snapshot.units[0].x].terrain = "grass"; }],
    ["vessel without boat", (snapshot: any) => { snapshot.previewRuleset = "naval-mvp"; snapshot.units[0].boat = false; snapshot.units[0].vessel = "wakecutter"; }],
    ["nonboolean boat", (snapshot: any) => { snapshot.units[0].boat = "yes"; }],
  ])("rejects %s without replacing a healthy match", (_label, mutate) => {
    game.newGame({ size: 7, humanTribe: 0, difficulty: "normal", seed: 6060, preset: "continents", roster: [0, 1] });
    const healthy = healthyFingerprint();
    const snapshot = JSON.parse(game.serializeState());
    mutate(snapshot);

    expect(game.loadOnlineSnapshot(JSON.stringify(snapshot), 0)).toBe(false);
    expect(healthyFingerprint()).toEqual(healthy);
  });
});
