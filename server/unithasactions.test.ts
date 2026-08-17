// unitHasActions — the real "can this unit still do anything" test behind
// unitsWithMoves (end-turn nudge, Next-unit cycling) and the renderer's
// spent-dim. Regression target: a unit that MOVED and has no target in reach
// used to count as actionable.
import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import { unitHasActions } from "../client/src/game/core/rules";

function freshGame() {
  game.newGame({ seed: 777, size: 11, humanTribe: 0, difficulty: "normal", preset: "continents" });
}

function humanWarrior() {
  const s = game.state;
  return s.units.find((u) => u.tribe === s.humanTribe && u.type === "warrior")!;
}

describe("unitHasActions", () => {
  beforeEach(freshGame);

  it("a fresh unit has actions and is listed by unitsWithMoves", () => {
    const u = humanWarrior();
    expect(unitHasActions(game.state, u)).toBe(true);
    expect(game.unitsWithMoves()).toContain(u.id);
  });

  it("a unit that moved with nobody in reach is spent — the reported bug", () => {
    const u = humanWarrior();
    u.moved = true; u.attacked = false;
    // seed 777: no enemy is adjacent to a starting warrior — movement spent,
    // nothing in range
    expect(unitHasActions(game.state, u)).toBe(false);
    expect(game.unitsWithMoves()).not.toContain(u.id);
  });

  it("a moved dash unit with a target in range still has its attack", () => {
    const s = game.state;
    const u = humanWarrior();
    u.moved = true; u.attacked = false;
    // plant an enemy next door: warriors have dash, so move+attack survives
    const enemy = s.units.find((q) => q.tribe !== s.humanTribe && !q.guardian)!;
    enemy.x = u.x + 1 <= s.size - 1 ? u.x + 1 : u.x - 1;
    enemy.y = u.y;
    expect(unitHasActions(s, u)).toBe(true);
    expect(game.unitsWithMoves()).toContain(u.id);
  });

  it("a fully spent unit has no actions", () => {
    const u = humanWarrior();
    u.moved = true; u.attacked = true;
    expect(unitHasActions(game.state, u)).toBe(false);
  });

  it("a fresh unit standing on a capturable city has an action even boxed in", () => {
    const s = game.state;
    const u = humanWarrior();
    // a neutral village belongs to nobody: standing on one fresh = can capture
    const village = s.cities.find((c) => c.tribe === null)!;
    u.x = village.x; u.y = village.y; u.moved = false; u.attacked = false;
    expect(unitHasActions(s, u)).toBe(true);
    // once the move is spent, though, capture is no longer on the table —
    // captureCity consumes a fresh action. Clear every non-human unit in reach
    // first (a Great Ruin guardian beside the village would otherwise hand the
    // warrior a legitimate attack and make the assertion lie).
    for (const e of s.units) {
      if (e.tribe === s.humanTribe) continue;
      if (Math.max(Math.abs(e.x - u.x), Math.abs(e.y - u.y)) <= 1) { e.x = 0; e.y = 0; }
    }
    u.moved = true;
    expect(unitHasActions(s, u)).toBe(false);
  });
});
