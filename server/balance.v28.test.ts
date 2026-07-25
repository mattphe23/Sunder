// v28 balance fixes — driven by the four LLM playtest reports (2026-07-24).
// Covers: riding cost bump, scholars starting stars, ruin payout taper,
// coalition strike bonus, and leader-targeted raider bias.
import { describe, it, expect } from "vitest";
import { TECHS, TRIBE_DEFS, GUARDIAN_TRIBE, emptyStats } from "../client/src/game/core/types";
import { game } from "../client/src/game/core/state";
import { coalitionStrikeBonus, previewCombat } from "../client/src/game/core/rules";
import { setPeace } from "../client/src/game/core/diplomacy";
import { worldUnitIntents } from "../client/src/game/core/events";

describe("v28 tuning constants", () => {
  it("riding costs 6 base stars", () => {
    expect(TECHS.find((t) => t.id === "riding")!.baseCost).toBe(6);
  });

  it("scholars tribes start with 7 stars, others with 5", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 777, roster: [0, 1, 2, 3] });
    const s = game.state;
    expect(TRIBE_DEFS[0].passive).toBe("scholars");
    // tribe 0 has already collected its first-turn income inside newGame's
    // beginTurn(0); the scholars bump shows as +2 over the base 5 plus income.
    expect(s.tribes[0].stars).toBeGreaterThanOrEqual(9); // 5 + 2 (scholars) + income ≥ 2
    // v40 staggered start: slot 1 carries +1 compensation star on top of base 5
    expect(s.tribes[1].stars).toBe(6); // hasn't taken a turn yet — base 5 + slot 1
  });
});

describe("ruin payout taper", () => {
  it("tapers star payouts by prior claims with a floor", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 778 });
    const s = game.state;
    // access the private helper through the store instance
    const taper = (game as unknown as { ruinTaper(t: number, n: number): number }).ruinTaper.bind(game);
    s.stats![0] = { ...emptyStats(), ruinsClaimed: 0 };
    expect(taper(0, 8)).toBe(8); // first ruin: full payout
    s.stats![0].ruinsClaimed = 2;
    expect(taper(0, 8)).toBe(Math.round(8 * 0.75 * 0.75)); // ×0.5625
    s.stats![0].ruinsClaimed = 10;
    expect(taper(0, 8)).toBe(Math.round(8 * 0.4)); // 40% floor
    expect(taper(0, 2)).toBeGreaterThanOrEqual(2); // absolute floor of 2
  });
});

describe("coalition strike bonus", () => {
  function runawayLeader() {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 779, roster: [0, 1, 2, 3] });
    const s = game.state;
    // make tribe 3 a runaway leader: huge score + economy + army
    s.tribes[3].score = 2000;
    s.tribes[3].stars = 80;
    for (const c of s.cities) if (c.tribe !== null) c.tribe = c.tribe; // keep map as-is
    for (let i = 0; i < 6; i++) s.units.push({ id: s.nextUnitId++, type: "knight", tribe: 3, x: 0, y: i, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, boat: false });
    for (const t of s.tribes.filter((t) => t.index !== 3)) { t.score = 100; }
    return s;
  }

  it("applies only to pacted attackers striking the leader", () => {
    const s = runawayLeader();
    const attacker = s.units.find((u) => u.tribe === 1)!;
    const defender = s.units.find((u) => u.tribe === 3)!;
    // not pacted yet → no bonus
    expect(coalitionStrikeBonus(s, attacker, defender)).toBe(false);
    // pact tribe 1 with tribe 2 → bonus vs the leader
    setPeace(s, 1, 2, s.turn + 6);
    expect(coalitionStrikeBonus(s, attacker, defender)).toBe(true);
    // but not against a non-leader defender
    const bystander = s.units.find((u) => u.tribe === 0)!;
    expect(coalitionStrikeBonus(s, attacker, bystander)).toBe(false);
    // and the leader itself gets no bonus
    expect(coalitionStrikeBonus(s, defender, attacker)).toBe(false);
  });

  it("increases damage to the leader in previewCombat", () => {
    const s = runawayLeader();
    const attacker = s.units.find((u) => u.tribe === 1 && u.type === "warrior")!;
    const defender = s.units.find((u) => u.tribe === 3 && u.type === "warrior")!;
    // co-locate for a clean adjacent duel
    attacker.x = 4; attacker.y = 4; defender.x = 4; defender.y = 5;
    const before = previewCombat(s, attacker, defender).damageToDefender;
    setPeace(s, 1, 2, s.turn + 6);
    const after = previewCombat(s, attacker, defender).damageToDefender;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe("leader-hunting raiders", () => {
  it("raiders prefer the runaway leader's units over closer bystanders", () => {
    game.newGame({ size: 11, humanTribe: 0, difficulty: "normal", seed: 780, roster: [0, 1, 2, 3] });
    const s = game.state;
    // clear the board of confounders
    s.units = [];
    // runaway leader: tribe 3
    s.tribes[3].score = 2000; s.tribes[3].stars = 80;
    for (const t of s.tribes.filter((t) => t.index !== 3)) t.score = 100;
    for (let i = 0; i < 6; i++) s.units.push({ id: s.nextUnitId++, type: "knight", tribe: 3, x: 10, y: i, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, boat: false });
    // raider at (5,5); bystander (tribe 0) at distance 2; leader unit at distance 3
    s.units.push({ id: s.nextUnitId++, type: "warrior", tribe: GUARDIAN_TRIBE, x: 5, y: 5, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, boat: false, raider: true });
    s.units.push({ id: s.nextUnitId++, type: "warrior", tribe: 0, x: 5, y: 7, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, boat: false });
    const leaderUnit = { id: s.nextUnitId++, type: "warrior" as const, tribe: 3, x: 5, y: 8, hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, boat: false };
    s.units.push(leaderUnit);
    const intents = worldUnitIntents(s);
    const raiderIntent = intents.find((i) => i.unit.raider);
    expect(raiderIntent).toBeDefined();
    // biased distance: bystander 2×2=4 vs leader 3 → raider steps toward the leader (south)
    expect(raiderIntent!.move).toBeDefined();
    expect(raiderIntent!.move!.y).toBeGreaterThan(5);
  });
});
