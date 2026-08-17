// Floating gain numbers — the `gain` event and what it is allowed to say.
//
// Combat has floated damage numbers since early on; the other half of the
// ledger was invisible. Stars looted, stars found in a ruin, HP mended at turn
// start — all of it happened silently, or at best as a line in a log the player
// is not looking at while the board is moving. The `gain` event is what carries
// those to the renderer, and it has three properties worth pinning:
//
//   it is human-only     an AI's loot is fog-of-war information, and a
//                        screenful of numbers per AI turn is not feedback
//   it is the REAL delta a heal that offers +2 to a unit one HP down is a +1
//   it is per tile       two Arcanists on one target used to queue two heals,
//                        which would now be two identical labels superimposed
//
// The star payouts also route through one helper now, which is what fixes the
// four ruin branches that granted stars without recording them under "Stars
// earned" on the stats screen.
import { describe, it, expect, beforeEach } from "vitest";
import { game, GameEvent } from "../client/src/game/core/state";
import { TRIBE_DEFS } from "../client/src/game/core/types";

type Gain = Extract<GameEvent, { type: "gain" }>;

function freshGame() {
  game.newGame({
    size: 11, humanTribe: 0, difficulty: "normal", seed: 9182,
    preset: "continents", roster: [0, 1, 2, 3],
  });
}

/** run `fn`, returning every gain event it emitted */
function gains(fn: () => void): Gain[] {
  const seen: Gain[] = [];
  const off = game.subscribe((e) => {
    if (e.type === "gain") seen.push(e);
  });
  try { fn(); } finally { off(); }
  return seen;
}

describe("gain floaters", () => {
  beforeEach(freshGame);

  it("reports the HP a unit actually recovered, not what the healer offered", () => {
    const s = game.state;
    const mine = s.units.filter((u) => u.tribe === 0);
    const healer = mine[0];
    healer.type = "arcanist";
    // adjacent, and one single point below full: the Arcanist offers 2
    const patient = mine.find((u) => u.id !== healer.id) ?? s.units.find((u) => u.tribe === 0 && u.id !== healer.id)!;
    patient.x = healer.x + 1;
    patient.y = healer.y;
    patient.hp = patient.maxHp - 1;

    const heals = gains(() => game.beginTurn(0)).filter((g) => g.kind === "heal");
    expect(heals).toHaveLength(1);
    expect(heals[0].amount).toBe(1);
    expect(patient.hp).toBe(patient.maxHp);
    expect({ x: heals[0].x, y: heals[0].y }).toEqual({ x: patient.x, y: patient.y });
  });

  it("sums two healers on one tile into a single label", () => {
    const s = game.state;
    const mine = s.units.filter((u) => u.tribe === 0);
    // a patient deep enough below full that both heals land in full
    const patient = mine[0];
    patient.hp = 1;
    patient.maxHp = 20;
    for (const [i, dx] of [-1, 1].entries()) {
      const a = { ...patient, id: 900 + i, type: "arcanist" as const, x: patient.x + dx, y: patient.y, hp: 10, maxHp: 10 };
      s.units.push(a);
    }
    const heals = gains(() => game.beginTurn(0)).filter((g) => g.kind === "heal");
    // one tile, one number — 2 + 2, not two floaters reading "+2"
    const onPatient = heals.filter((h) => h.x === patient.x && h.y === patient.y);
    expect(onPatient).toHaveLength(1);
    expect(onPatient[0].amount).toBe(4);
  });

  it("floats plundered stars over the raider, not the corpse", () => {
    const s = game.state;
    const raider = s.units.find((u) => u.tribe === 0)!;
    raider.type = "raider";
    raider.moved = false;
    raider.attacked = false;
    const victim = s.units.find((u) => u.tribe === 1)!;
    victim.x = raider.x + 1;
    victim.y = raider.y;
    victim.hp = 1;
    s.tribes[1].stars = 50;
    s.currentTribe = 0;

    const stars = gains(() => game.attack(raider.id, victim.id)).filter((g) => g.kind === "stars");
    expect(s.units.find((u) => u.id === victim.id)).toBeUndefined(); // the kill landed
    expect(stars).toHaveLength(1);
    expect(stars[0].amount).toBeGreaterThan(0);
    // the defender's tile already carries a damage number; two labels on one
    // tile read as one smear
    expect({ x: stars[0].x, y: stars[0].y }).toEqual({ x: raider.x, y: raider.y });
  });

  it("says nothing when the tribe doing the gaining is not the player", () => {
    const s = game.state;
    const raider = s.units.find((u) => u.tribe === 1)!;
    raider.type = "raider";
    raider.moved = false;
    raider.attacked = false;
    const victim = s.units.find((u) => u.tribe === 2)!;
    victim.x = raider.x + 1;
    victim.y = raider.y;
    victim.hp = 1;
    s.tribes[2].stars = 50;
    s.currentTribe = 1;

    const before = s.tribes[1].stars;
    const seen = gains(() => game.attack(raider.id, victim.id));
    expect(s.tribes[1].stars).toBeGreaterThan(before); // the loot was still paid
    expect(seen).toHaveLength(0); //  ...it just did not announce itself
  });

  it("records every star payout under Stars earned, including the ruin fallbacks", () => {
    // Four branches used to add stars without the bumpStat: the ones that pay
    // out when there is no tech left to learn or nowhere to place the free
    // unit. Driving a ruin directly is seed-dependent, so this asserts the
    // invariant the shared helper gives us — the treasury and the stat move
    // together, whichever branch fires.
    const s = game.state;
    const scout = s.units.find((u) => u.tribe === 0)!;
    const treasuryBefore = s.tribes[0].stars;
    const statBefore = s.stats![0].starsEarned;
    // The ruin roll is seeded from the tile, so standing still re-rolls the
    // same branch forever. Walk the whole board to be sure every branch fires.
    for (let y = 0; y < s.size; y++) {
      for (let x = 0; x < s.size; x++) {
        scout.x = x;
        scout.y = y;
        const t = s.tiles[y * s.size + x];
        t.ruin = true;
        t.greatRuin = false;
        (game as unknown as { exploreRuin(u: typeof scout): void }).exploreRuin(scout);
      }
    }
    const treasury = s.tribes[0].stars - treasuryBefore;
    const stat = s.stats![0].starsEarned - statBefore;
    expect(treasury).toBeGreaterThan(0);
    expect(stat).toBe(treasury);
  });

  it("only fires for kinds the renderer knows how to label", () => {
    // The canvas indexes a literal map by e.kind; a kind added here without a
    // label there floats `undefined` over the board.
    const s = game.state;
    const hero = s.units.find((u) => u.tribe === 0)!;
    hero.hero = true;
    const seen = gains(() => {
      game.beginTurn(0);
      (game as unknown as { grantXp(u: typeof hero, n: number): void }).grantXp(hero, 5);
    });
    for (const g of seen) expect(["xp", "stars", "heal"]).toContain(g.kind);
    expect(seen.some((g) => g.kind === "xp")).toBe(true);
  });

  it("does not float a number for a heal that healed nobody", () => {
    const s = game.state;
    const mine = s.units.filter((u) => u.tribe === 0);
    mine[0].type = "arcanist";
    for (const u of mine) u.hp = u.maxHp; // everyone at full
    const heals = gains(() => game.beginTurn(0)).filter((g) => g.kind === "heal");
    expect(heals).toHaveLength(0);
  });
});

describe("the roster this suite assumes", () => {
  it("still has at least four tribes to draw a victim from", () => {
    expect(TRIBE_DEFS.length).toBeGreaterThanOrEqual(4);
  });
});
