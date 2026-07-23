// v20 headless engine simulation — drives the real GameStore through full
// AI-vs-AI matches in Node (no browser, no Babylon). Guards against runtime
// crashes in the turn loop, world phase, hero levelling, and the new
// asymmetric-victory checks.
//
// The store schedules AI turns via setTimeout; we neuter it and drive every
// tribe manually with runAiTurn so the loop is fully synchronous.
import { describe, it, expect, vi, beforeAll } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import { runAiTurn } from "../client/src/game/core/ai";

interface SimResult { turns: number; phase: string; winner: number | null; winPath: string | null; heroesSurvived: number }

function simulate(seed: number): SimResult {
  game.newGame({ size: 9, seed, difficulty: "normal", preset: "continents", humanTribe: seed % 4 });
  game.state.showIntro = false;
  let guard = 0;
  while (game.state.phase === "playing" && guard < 600) {
    guard++;
    const s = game.state;
    s.aiThinking = false;
    if (s.pendingPerk) {
      const hero = s.units.find((u) => u.id === s.pendingPerk);
      if (hero) {
        const choices = game.perkChoices(hero);
        if (choices.length > 0) game.choosePerk(choices[0]);
        else s.pendingPerk = null;
      } else s.pendingPerk = null;
    }
    if (s.tribes[s.currentTribe]?.alive) runAiTurn(game, s.currentTribe);
    if (game.state.phase !== "playing") break;
    game.endTurn();
  }
  return {
    turns: game.state.turn,
    phase: game.state.phase,
    winner: game.state.winner,
    winPath: game.state.winPath?.pathId ?? null,
    heroesSurvived: game.state.units.filter((u) => u.hero).length,
  };
}

describe("v20 headless AI-vs-AI simulation", () => {
  beforeAll(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it("plays a full match to completion without throwing (seed 7)", () => {
    const r = simulate(7);
    expect(r.phase).toBe("gameover");
    expect(r.winner).not.toBeNull();
    expect(r.turns).toBeGreaterThan(3);
  });

  it("plays matches on more seeds/factions without errors", () => {
    for (const seed of [12, 23, 31]) {
      const r = simulate(seed);
      expect(r.phase).toBe("gameover");
      expect(r.winner).not.toBeNull();
      // winPath is either null (score/domination end) or a known path id
      if (r.winPath) expect(r.winPath.length).toBeGreaterThan(3);
    }
  });

  it("AI hero care keeps at least some commanders alive to the end on average", () => {
    let survived = 0, total = 0;
    for (const seed of [7, 12, 23]) {
      const r = simulate(seed);
      survived += r.heroesSurvived;
      total += 4; // 4 tribes spawn 1 hero each
    }
    // sanity floor: hero care means not every commander suicides (≥25% survival)
    expect(survived / total).toBeGreaterThanOrEqual(0.25);
  });
});
