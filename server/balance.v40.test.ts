// v40 balance fixes — driven by the 160-game AI batch analysis (2026-07-25).
// Covers: staggered-start star compensation (slot spread 40%/12% finding),
// Tideborn coastal-city income (Nerivane 8% win-rate finding), and the
// lowered Plunder King treasury target (2 wins in 160 finding).
import { describe, it, expect } from "vitest";
import { game, STAGGER_COMP_TURNS } from "../client/src/game/core/state";
import { starIncome } from "../client/src/game/core/rules";
import { VICTORY_PATHS, victoryProgress } from "../client/src/game/core/victory";
import { TRIBE_DEFS, idx } from "../client/src/game/core/types";

describe("v40 staggered-start star compensation", () => {
  it("later slots start with +1 star per slot (before their first income)", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4040, roster: [1, 2, 3, 5] });
    const s = game.state;
    // tribe 0 already collected turn-1 income inside newGame's beginTurn(0);
    // slots 1..3 are untouched: base 5 (none of these defs are scholars) + slot.
    expect(s.tribes[1].stars).toBe(5 + 1);
    expect(s.tribes[2].stars).toBe(5 + 2);
    expect(s.tribes[3].stars).toBe(5 + 3);
  });

  it("stacks with the scholars bump when Auren sits in a later slot", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4041, roster: [1, 0, 2, 3] });
    const s = game.state;
    expect(TRIBE_DEFS[0].passive).toBe("scholars");
    expect(s.tribes[1].stars).toBe(7 + 1); // scholars base 7 + slot 1
  });

  it("pays later slots +slot stars at turn start during the opening window only", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4046, roster: [1, 2, 3, 5] });
    const s = game.state;
    // slot 3, turn 0: opening window active
    const before = s.tribes[3].stars;
    s.turn = 0;
    game.beginTurn(3);
    const income = starIncome(s, 3);
    // AI on normal difficulty also draws its +1 aiBonus alongside income
    expect(s.tribes[3].stars).toBe(before + income + 1 + 3); // income + aiBonus + slot comp
    // after the window closes: no compensation
    for (const u of s.units) if (u.tribe === 3) { u.moved = true; u.attacked = true; }
    const later = s.tribes[3].stars;
    s.turn = STAGGER_COMP_TURNS;
    game.beginTurn(3);
    expect(s.tribes[3].stars).toBe(later + starIncome(s, 3) + 1); // income + aiBonus, no comp
  });

  it("slot 0 never receives compensation", () => {
    game.newGame({ size: 9, humanTribe: 1, difficulty: "normal", seed: 4047, roster: [1, 2, 3, 5] });
    const s = game.state;
    // slot 0 (an AI on normal) collected base + income + aiBonus — no comp term
    expect(s.tribes[0].stars).toBe(5 + starIncome(s, 0) + 1);
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

describe("v40 Plunder King threshold", () => {
  it("target lowered to 35 stars", () => {
    expect(VICTORY_PATHS.find((p) => p.id === "plunderking")!.goal).toContain("35");
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4045, roster: [3, 1, 2, 5] });
    const s = game.state;
    const p = victoryProgress(s, 0)!;
    expect(p.def.id).toBe("plunderking");
    expect(p.target).toBe(35);
    s.tribes[0].stars = 35;
    expect(victoryProgress(s, 0)!.done).toBe(true);
  });
});
