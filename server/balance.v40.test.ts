// v40 balance fixes — driven by the 160-game AI batch analysis (2026-07-25).
// Covers: staggered-start star compensation (slot spread 40%/12% finding),
// Tideborn coastal-city income (Nerivane 8% win-rate finding), and the
// lowered Plunder King treasury target (2 wins in 160 finding).
import { describe, it, expect } from "vitest";
import { game, STAGGER_COMP_TURNS } from "../client/src/game/core/state";
import { starIncome, techCost } from "../client/src/game/core/rules";
import { VICTORY_PATHS, victoryProgress, PLUNDER_TARGET } from "../client/src/game/core/victory";
import { TRIBE_DEFS, TECHS, idx } from "../client/src/game/core/types";

describe("v40 staggered-start star compensation", () => {
  it("later slots start with +1 star per slot (before their first income)", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4040, roster: [1, 2, 3, 5] });
    const s = game.state;
    // v41: the round's first actor (turnOrder[0]) already collected income in
    // newGame; every other tribe is untouched: base 5 + one-time slot comp.
    const first = s.turnOrder![0];
    for (let i = 0; i < 4; i++) {
      if (i === first) continue;
      expect(s.tribes[i].stars).toBe(5 + i);
    }
  });

  it("v41: scholars bump reverted — Auren in a later slot gets only the slot comp", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4041, roster: [1, 0, 2, 3] });
    const s = game.state;
    expect(TRIBE_DEFS[0].passive).toBe("scholars");
    if (s.turnOrder![0] !== 1) {
      expect(s.tribes[1].stars).toBe(5 + 1); // base 5 + slot 1, no scholars stars
    }
  });

  it("pays later slots +slot stars at turn start during the opening window only", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4046, roster: [1, 2, 3, 5] });
    const s = game.state;
    // v41: compensation keys to acting POSITION in the shuffled order. Force a
    // known order so the test is deterministic.
    s.turnOrder = [0, 1, 2, 3];
    s.orderPos = 3;
    const before = s.tribes[3].stars;
    s.turn = 0;
    game.beginTurn(3);
    const income = starIncome(s, 3);
    // AI on normal difficulty also draws its +1 aiBonus alongside income;
    // acting position 3 → +3 comp during the opening window.
    expect(s.tribes[3].stars).toBe(before + income + 1 + 3);
    // after the window closes: no compensation
    for (const u of s.units) if (u.tribe === 3) { u.moved = true; u.attacked = true; }
    const later = s.tribes[3].stars;
    s.turn = STAGGER_COMP_TURNS;
    s.turnOrder = [0, 1, 2, 3];
    s.orderPos = 3;
    game.beginTurn(3);
    expect(s.tribes[3].stars).toBe(later + starIncome(s, 3) + 1); // income + aiBonus, no comp
  });

  it("the round's first actor never receives compensation", () => {
    game.newGame({ size: 9, humanTribe: 1, difficulty: "normal", seed: 4047, roster: [1, 2, 3, 5] });
    const s = game.state;
    // v41: the first actor in the shuffled order collected base + slot comp +
    // income (+1 aiBonus if AI) — but NO per-turn stagger comp term.
    const first = s.turnOrder![0];
    const bonus = s.tribes[first].isHuman ? 0 : 1;
    expect(s.tribes[first].stars).toBe(5 + first + starIncome(s, first) + bonus);
  });

  it("v41: turn order reshuffles per round, deterministically by seed", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4048, roster: [1, 2, 3, 5] });
    const s = game.state;
    expect([...s.turnOrder!].sort()).toEqual([0, 1, 2, 3]);
    const round0 = [...s.turnOrder!];
    // drive to the next round
    let guard = 0;
    const startTurn = s.turn;
    while (s.turn === startTurn && guard++ < 10) game.endTurn();
    expect([...s.turnOrder!].sort()).toEqual([0, 1, 2, 3]);
    // same seed reproduces the same opening order
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4048, roster: [1, 2, 3, 5] });
    expect(game.state.turnOrder).toEqual(round0);
  });
});

describe("v40 Tideborn coastal-city income", () => {
  it("a tideborn city adjacent to shallow water earns +1 star vs the same city without the passive", () => {
    // Nerivane (def 4) in slot 0 so we can rewrite its surroundings directly
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4042, roster: [4, 1, 2, 3] });
    const s = game.state;
    expect(s.tribes[0].passive).toBe("tideborn");
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    // force a known coastline state: first make every neighbor land...
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = capital.x + dx, ny = capital.y + dy;
        if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) continue;
        s.tiles[idx(nx, ny, s.size)].terrain = "grass";
      }
    }
    const landlocked = starIncome(s, 0);
    // ...then open one shallow-water tile beside the capital
    const wx = capital.x + 1, wy = capital.y;
    s.tiles[idx(wx, wy, s.size)].terrain = "water";
    expect(starIncome(s, 0)).toBe(landlocked + 1);
  });

  it("does not pay non-tideborn tribes for coastal cities", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4043, roster: [1, 4, 2, 3] });
    const s = game.state;
    expect(s.tribes[0].passive).not.toBe("tideborn");
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    const before = starIncome(s, 0);
    s.tiles[idx(Math.min(capital.x + 1, s.size - 1), capital.y, s.size)].terrain = "water";
    expect(starIncome(s, 0)).toBe(before); // coastline changes nothing for Kharzul
  });

  it("a besieged coastal tideborn city is choked like the rest of its economy", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4044, roster: [4, 1, 2, 3] });
    const s = game.state;
    const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
    s.tiles[idx(Math.max(capital.x - 1, 0), capital.y, s.size)].terrain = "water";
    const open = starIncome(s, 0);
    // drop an enemy warrior on the city tile — displace anything standing there
    s.units = s.units.filter((u) => !(u.x === capital.x && u.y === capital.y));
    s.units.push({
      id: 9999, type: "warrior", tribe: 1, x: capital.x, y: capital.y,
      hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, boat: false,
    });
    const sieged = starIncome(s, 0);
    expect(sieged).toBeLessThan(open); // both base income AND the coastal star are choked
  });
});

describe("v42 Plunder King measures loot taken, not stars held", () => {
  // v40 lowered the treasury target 45 → 35 and the path still fired in 1% of
  // Vessari's games: banking stars is anti-tempo, so the goal asked Vessari to
  // stop playing in order to win. It now counts cumulative plunder.
  it("tracks starsPlundered against PLUNDER_TARGET, and ignores the treasury", () => {
    expect(VICTORY_PATHS.find((p) => p.id === "plunderking")!.goal).toContain(String(PLUNDER_TARGET));
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4045, roster: [3, 1, 2, 5] });
    const s = game.state;
    const p = victoryProgress(s, 0)!;
    expect(p.def.id).toBe("plunderking");
    expect(p.target).toBe(PLUNDER_TARGET);

    // a fat treasury is no longer progress
    s.tribes[0].stars = 999;
    expect(victoryProgress(s, 0)!.current).toBe(0);
    expect(victoryProgress(s, 0)!.done).toBe(false);

    // looting is
    s.stats[0].starsPlundered = PLUNDER_TARGET;
    expect(victoryProgress(s, 0)!.done).toBe(true);
  });
});

describe("v42 tech escalation keeps the tree from being exhausted", () => {
  // A 240-game batch had every tribe finishing on 13.0/15 techs regardless of
  // faction, which turned Auren's "research everything" path into a free clock
  // (67% win rate) and converged every faction on the same late-game army.
  it("charges more for each tech already banked", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4210, roster: [1, 2, 3, 5] });
    const s = game.state;
    const tech = TECHS.find((t) => !s.tribes[0].techs.includes(t.id) && !t.requires)!;
    const bare = techCost(s, 0, tech.id);
    s.tribes[0].techs = [...s.tribes[0].techs, ...TECHS.filter((t) => t.id !== tech.id).slice(0, 8).map((t) => t.id)];
    expect(techCost(s, 0, tech.id)).toBeGreaterThan(bare);
  });
});

describe("v41.1 scholars tech discount", () => {
  it("is 10% (was 20%) — Enlightenment landed on turn ~17 vs 22+ for other paths", () => {
    // Auren (def 0, scholars) in slot 0; Kharzul in slot 1 as the control
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4111, roster: [0, 1, 2, 3] });
    const s = game.state;
    expect(s.tribes[0].passive).toBe("scholars");
    expect(s.tribes[1].passive).not.toBe("scholars");
    for (const tech of TECHS) {
      const full = techCost(s, 1, tech.id);
      const discounted = techCost(s, 0, tech.id);
      // Both tribes hold exactly 1 city and the same number of techs at game
      // start, so the empire-size and escalation terms are identical; only the
      // passive differs. Compared with a ±1 tolerance because both costs are
      // rounded independently and v42's fractional escalation term means
      // round(full) * 0.9 is no longer the same as round(full * 0.9).
      expect(Math.abs(discounted - full * 0.9)).toBeLessThanOrEqual(1);
      expect(discounted).toBeLessThanOrEqual(full);
    }
  });
});
