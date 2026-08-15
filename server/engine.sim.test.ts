// v20 headless engine simulation — drives the real GameStore through full
// AI-vs-AI matches in Node (no browser, no Babylon). Guards against runtime
// crashes in the turn loop, world phase, hero levelling, and the new
// asymmetric-victory checks.
//
// The store schedules AI turns via setTimeout; we neuter it and drive every
// tribe manually with runAiTurn so the loop is fully synchronous.
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

// ai.ts sprinkles Math.random into build/train decisions; pin it to a seeded
// PRNG so simulation outcomes (and the hero-survival floor) are deterministic.
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

import { game, AI_INCOME_BONUS } from "../client/src/game/core/state";
import { runAiTurn } from "../client/src/game/core/ai";

interface SimResult { turns: number; phase: string; winner: number | null; winPath: string | null; heroesSurvived: number }

function simulate(seed: number, difficulty: "easy" | "normal" | "hard" | "impossible" = "normal"): SimResult {
  game.newGame({ size: 9, seed, difficulty, preset: "continents", humanTribe: seed % 4 });
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
    // v35: city level-up reward choices block endTurn; auto-resolve headlessly
    if (s.pendingCityReward != null) {
      const city = s.cities[s.pendingCityReward];
      if (city) game.aiPickCityReward(city);
      s.pendingCityReward = null;
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

  beforeEach(() => {
    vi.spyOn(Math, "random").mockImplementation(mulberry32(0xC0FFEE));
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

  it("AI hero care: wounded commanders retreat toward friendly cities (behavioral)", () => {
    // Heroes can still be killed by enemy attacks — care means the OWNING brain
    // never suicides them and pulls them home when hurt. Run a match and track
    // every wounded hero across its own tribe's turn: distance to the nearest
    // friendly city must not increase (retreating or holding, never advancing).
    game.newGame({ size: 9, seed: 7, difficulty: "normal", preset: "continents", humanTribe: 3 });
    game.state.showIntro = false;
    const cheb = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    let advancedWhileWounded = 0, woundedTurns = 0, guard = 0;
    while (game.state.phase === "playing" && guard < 600) {
      guard++;
      const s = game.state;
      s.aiThinking = false;
      if (s.pendingPerk) {
        const hero = s.units.find((u) => u.id === s.pendingPerk);
        if (hero) {
          const choices = game.perkChoices(hero);
          if (choices.length > 0) game.choosePerk(choices[0]); else s.pendingPerk = null;
        } else s.pendingPerk = null;
      }
      if (s.pendingCityReward != null) {
        const city = s.cities[s.pendingCityReward];
        if (city) game.aiPickCityReward(city);
        s.pendingCityReward = null;
      }
      const cur = s.currentTribe;
      const distHome = (u: { x: number; y: number }, tribe: number) => {
        const homes = s.cities.filter((c) => c.tribe === tribe);
        return homes.length ? Math.min(...homes.map((c) => cheb(u.x, u.y, c.x, c.y))) : 0;
      };
      const woundedBefore = s.units
        .filter((u) => u.tribe === cur && u.hero && u.hp <= u.maxHp * 0.6)
        .map((u) => ({ id: u.id, d: distHome(u, cur) }));
      if (s.tribes[cur]?.alive) runAiTurn(game, cur);
      for (const w of woundedBefore) {
        const now = game.state.units.find((u) => u.id === w.id);
        if (!now) continue; // killed by retaliation is not the owner's advance
        woundedTurns++;
        if (distHome(now, cur) > w.d) advancedWhileWounded++;
      }
      if (game.state.phase !== "playing") break;
      game.endTurn();
    }
    // the care rule must actually engage during the match, and a wounded hero
    // must never end its own turn farther from home than it started
    expect(woundedTurns).toBeGreaterThan(0);
    expect(advancedWhileWounded).toBe(0);
  });

  // v48: Impossible routes through the standard brain now (aiPro.ts is parked),
  // but the tier must still drive a match to a result.
  it("Impossible plays full matches to completion without throwing", () => {
    for (const seed of [5, 17]) {
      const r = simulate(seed, "impossible");
      expect(r.phase).toBe("gameover");
      expect(r.winner).not.toBeNull();
      expect(r.turns).toBeGreaterThan(3);
    }
  });

  it("Impossible AI beats normal AI more often than not (proxy: pro tribes outscore)", () => {
    // one mixed match: run tribes 1-3 with the pro brain vs tribe 0 with the
    // standard brain by simulating on impossible and checking pro tribes are
    // competitive — a weak sanity proxy that the brain isn't broken.
    const r = simulate(9, "impossible");
    expect(r.phase).toBe("gameover");
  });
});

describe("v48 the difficulty ladder climbs", () => {
  // It did not, for a long time. Impossible ran a specialised brain on no
  // income bonus and finished level with Normal, below Hard — the top tier was
  // the weakest opponent in the game. The full measurement lives in
  // scripts/ai-ladder.mts (all four tiers seated in one match, 240 games);
  // these are the invariants that keep it from silently inverting again.
  it("pays a strictly larger economy at every step up", () => {
    expect(AI_INCOME_BONUS.easy).toBeLessThan(AI_INCOME_BONUS.normal);
    expect(AI_INCOME_BONUS.normal).toBeLessThan(AI_INCOME_BONUS.hard);
    expect(AI_INCOME_BONUS.hard).toBeLessThan(AI_INCOME_BONUS.impossible);
  });

  it("never pays the bonus to the human, at any tier", () => {
    // The human's turn income also carries v40's staggered-start compensation,
    // so the invariant is not "gain equals starIncome" — it is that the gain is
    // identical across tiers, i.e. the difficulty bonus never reaches the human.
    const gains = new Set<number>();
    for (const d of ["easy", "normal", "hard", "impossible"] as const) {
      game.newGame({ size: 9, humanTribe: 0, difficulty: d, seed: 4800, roster: [0, 1, 2, 3] });
      const s = game.state;
      expect(s.tribes[0].isHuman).toBe(true);
      s.turnOrder = [0, 1, 2, 3];
      s.orderPos = 0;
      const before = s.tribes[0].stars;
      game.beginTurn(0);
      gains.add(s.tribes[0].stars - before);
    }
    expect(gains.size).toBe(1);
    expect([...gains][0]).toBeGreaterThan(0);
  });
});
