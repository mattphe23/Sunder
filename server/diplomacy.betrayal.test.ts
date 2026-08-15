// v42 — the betrayal loop.
//
// Sunder shipped a complete grudge system (refused truces, refused tribute,
// gift-to-forgive) layered on a peace system that made betrayal impossible:
// `attackableUnits` hard-filtered treaty partners, so no treaty could ever be
// broken, `addGrudge` was never called from anywhere, and a 240-game batch
// measured exactly 0.00 grudges. These tests pin the loop shut.
import { describe, it, expect } from "vitest";
import { game } from "../client/src/game/core/state";
import { attackableUnits, wouldBreakTreaty } from "../client/src/game/core/rules";
import {
  setPeace, atPeace, hasGrudge, aiAcceptsPeace, aiPaysTribute, PEACE_TREATY_TURNS,
} from "../client/src/game/core/diplomacy";
import { Unit } from "../client/src/game/core/types";

/** put a unit of `tribe` at (x,y), displacing whatever stood there */
function place(tribe: number, x: number, y: number, id: number): Unit {
  const s = game.state;
  s.units = s.units.filter((u) => !(u.x === x && u.y === y));
  const u: Unit = {
    id, type: "warrior", tribe, x, y,
    hp: 10, maxHp: 10, moved: false, attacked: false, kills: 0, boat: false,
  };
  s.units.push(u);
  return u;
}

/** two adjacent warriors from tribes 0 and 1, with a treaty standing */
function standoff() {
  game.newGame({ size: 11, humanTribe: 0, difficulty: "normal", seed: 4242, roster: [0, 1, 2, 3] });
  const s = game.state;
  const a = place(0, 4, 4, 8001);
  const d = place(1, 5, 4, 8002);
  setPeace(s, 0, 1, s.turn + PEACE_TREATY_TURNS);
  return { s, a, d };
}

describe("v42 a peace treaty is a promise you can break", () => {
  it("hides treaty partners from normal targeting but exposes them on request", () => {
    const { s, a, d } = standoff();
    expect(atPeace(s, 0, 1)).toBe(true);
    expect(attackableUnits(s, a).some((e) => e.id === d.id)).toBe(false);
    expect(attackableUnits(s, a, true).some((e) => e.id === d.id)).toBe(true);
    expect(wouldBreakTreaty(s, a, d)).toBe(true);
  });

  it("flags the staged attack so the player is warned before committing", () => {
    const { a, d } = standoff();
    game.stageAttack(a.id, d.id);
    expect(game.pendingAttack?.breaksTreaty).toBe(true);
    game.cancelAttack();
  });

  it("does not flag an ordinary attack on a tribe you have no treaty with", () => {
    const { s, a } = standoff();
    const other = place(2, 4, 5, 8003);
    expect(wouldBreakTreaty(s, a, other)).toBe(false);
    game.stageAttack(a.id, other.id);
    expect(game.pendingAttack?.breaksTreaty).toBeFalsy();
    game.cancelAttack();
  });

  it("striking a treaty partner ends the peace and earns a permanent grudge", () => {
    const { s, a, d } = standoff();
    expect(hasGrudge(s, 1, 0)).toBe(false);
    game.attack(a.id, d.id);
    expect(atPeace(s, 0, 1)).toBe(false);
    expect(hasGrudge(s, 1, 0)).toBe(true); // the victim remembers the offender
    expect(hasGrudge(s, 0, 1)).toBe(false); // ...and only the victim
  });

  it("a grudge-holder refuses every future truce and tribute demand", () => {
    const { s, a, d } = standoff();
    // before the betrayal the AI is willing to talk
    s.tribes[1].stars = 0;
    s.tribes[0].stars = 0;
    expect(aiAcceptsPeace(s, 1, 0).accept).toBe(true);

    game.attack(a.id, d.id);

    expect(aiAcceptsPeace(s, 1, 0).accept).toBe(false);
    expect(aiAcceptsPeace(s, 1, 0).reason).toMatch(/betrayal/i);
    expect(aiPaysTribute(s, 1, 0).pay).toBe(false);
  });

  it("a gift of stars buys back the betrayed tribe's trust", () => {
    const { s, a, d } = standoff();
    game.attack(a.id, d.id);
    expect(hasGrudge(s, 1, 0)).toBe(true);

    s.tribes[0].stars = 20;
    s.currentTribe = s.humanTribe;
    expect(game.giftStars(1, 3)).toBe(true);
    expect(hasGrudge(s, 1, 0)).toBe(false);
  });

  it("records the broken treaty in the log", () => {
    const { s, a, d } = standoff();
    game.attack(a.id, d.id);
    expect(s.log.some((l) => /broke the treaty/i.test(l))).toBe(true);
  });

  it("surfaces an AI's betrayal in the rivals' recap", () => {
    // the recap is "what rivals did while you waited", so it deliberately
    // skips the human's own actions — the offender here must be an AI
    const { s, a, d } = standoff();
    game.attack(d.id, a.id); // tribe 1 (AI) betrays tribe 0 (human)
    expect(hasGrudge(s, 0, 1)).toBe(true);
    expect(s.recap.some((r) => r.kind === "treatyBroken")).toBe(true);
  });
});
