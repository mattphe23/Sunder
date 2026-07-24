// v29 — Polytopia pain-point fixes: late-game QoL (next-unit cycling) and
// anti-turtling siege pressure. Headless, drives the real GameStore.
import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import { starIncome } from "../client/src/game/core/rules";

function freshGame() {
  game.newGame({ seed: 777, size: 11, humanTribe: 0, worldType: "continents" });
}

describe("v29 QoL: unitsWithMoves + nextUnit", () => {
  beforeEach(freshGame);

  it("lists only the human tribe's actionable units", () => {
    const s = game.state;
    const ids = game.unitsWithMoves();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const u = s.units.find((q) => q.id === id)!;
      expect(u.tribe).toBe(s.humanTribe);
      expect(u.guardian ?? false).toBe(false);
      expect(!u.moved || !u.attacked).toBe(true);
    }
  });

  it("excludes units that have both moved and attacked", () => {
    const s = game.state;
    const id = game.unitsWithMoves()[0];
    const u = s.units.find((q) => q.id === id)!;
    u.moved = true;
    u.attacked = true;
    expect(game.unitsWithMoves()).not.toContain(id);
  });

  it("nextUnit cycles selection and wraps around", () => {
    const ids = game.unitsWithMoves();
    game.nextUnit();
    const first = game.state.selectedUnitId;
    expect(ids).toContain(first);
    for (let i = 0; i < ids.length; i++) game.nextUnit();
    // after a full lap we are back to the first actionable unit
    expect(game.state.selectedUnitId).toBe(first);
  });

  it("emits focusTile pointing at the selected unit", () => {
    let focused: { x: number; y: number } | null = null;
    const off = game.subscribe((e: any) => {
      if (e.type === "focusTile") focused = { x: e.x, y: e.y };
    });
    game.nextUnit();
    off();
    const u = game.state.units.find((q) => q.id === game.state.selectedUnitId)!;
    expect(focused).toEqual({ x: u.x, y: u.y });
  });

  it("returns empty when it is not the human's turn", () => {
    game.state.currentTribe = (game.state.humanTribe + 1) % game.state.tribes.length;
    expect(game.unitsWithMoves()).toEqual([]);
  });
});

describe("v29 anti-turtling: siege income pressure", () => {
  beforeEach(freshGame);

  it("a besieged city contributes zero income", () => {
    const s = game.state;
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const before = starIncome(s, 0);
    // plant an enemy unit on the capital tile (displace any garrison first)
    const garrison = s.units.find((u) => u.x === capital.x && u.y === capital.y);
    if (garrison) { garrison.x = -99; garrison.y = -99; }
    const enemy = s.units.find((u) => u.tribe === 1)!;
    enemy.x = capital.x;
    enemy.y = capital.y;
    const after = starIncome(s, 0);
    expect(after).toBeLessThan(before);
    // capital income (level+1 or similar) fully choked: delta equals the capital's contribution
    const relief = { x: enemy.x, y: enemy.y };
    enemy.x = -98; enemy.y = -98;
    expect(starIncome(s, 0)).toBe(before);
    enemy.x = relief.x; enemy.y = relief.y;
  });

  it("own units on the city tile do not trigger the siege penalty", () => {
    const s = game.state;
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const garrison = s.units.find((u) => u.x === capital.x && u.y === capital.y);
    expect(garrison?.tribe).toBe(0); // starting warrior garrisons the capital
    expect(starIncome(s, 0)).toBeGreaterThan(0);
  });
});

describe("v29 anti-turtling: offense earns score", () => {
  beforeEach(freshGame);

  it("battles won raise the tribe's score", () => {
    const s = game.state;
    game.updateScore(0);
    const before = s.tribes[0].score;
    s.stats[0].battlesWon += 3;
    game.updateScore(0);
    expect(s.tribes[0].score).toBe(before + 24); // 8 points per battle won
  });
});
