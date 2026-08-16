// Premium content consistency + mechanics: the store catalog, skins registry,
// map packs, and premium tribe defs must stay in lock-step, and the two
// premium passives must actually work in the engine.
import { describe, it, expect } from "vitest";
import { PRODUCTS, ENT, ALL_ENTITLEMENT_KEYS, productBySku } from "../shared/products";
import { MAP_PACKS } from "../shared/mapPacks";
import { SKINS } from "../client/src/game/render/characters";
import { TRIBE_DEFS, PREMIUM_TRIBES } from "../client/src/game/core/types";
import { generateMap } from "../client/src/game/core/mapgen";
import { measureMap } from "./mapBuilder";

describe("premium content consistency", () => {
  it("every skin in the registry has a matching store product grant", () => {
    for (const skin of SKINS) {
      const product = PRODUCTS.find((p) => p.kind === "skin" && p.grants.includes(skin.key));
      expect(product, `no product grants ${skin.key}`).toBeTruthy();
      // the skin targets one of the 6 standard tribes
      expect(skin.tribe).toBeGreaterThanOrEqual(0);
      expect(skin.tribe).toBeLessThan(6);
    }
  });

  it("any gated tribe still maps to a store entitlement", () => {
    // Currently empty — see PREMIUM_TRIBES. The loop stays so that if a tribe
    // is ever gated again it has to be a real, purchasable one.
    for (const [idxStr, key] of Object.entries(PREMIUM_TRIBES)) {
      const idx = Number(idxStr);
      expect(TRIBE_DEFS[idx], `TRIBE_DEFS[${idx}] missing`).toBeTruthy();
      expect(ALL_ENTITLEMENT_KEYS).toContain(key);
      const product = PRODUCTS.find((p) => p.kind === "tribe" && p.grants.includes(key));
      expect(product, `no tribe product grants ${key}`).toBeTruthy();
      expect(product!.name).toBe(TRIBE_DEFS[idx].name);
    }
  });

  it("sells nothing that changes the arithmetic of a match", () => {
    // The rule the catalog now lives by: paying may change how the game LOOKS
    // or how much of it you can reach, never how a fight resolves. Valkyra
    // (halved enemy retaliation) and Mycelon (+2 HP resting) failed it and are
    // free. This is the guard that stops a future tribe SKU sneaking back in.
    expect(PRODUCTS.filter((p) => p.kind === "tribe")).toHaveLength(0);
    for (const p of PRODUCTS) {
      expect(["skin", "maps", "story", "bundle"]).toContain(p.kind);
    }
  });

  it("keeps retired entitlement keys valid so past purchases still resolve", () => {
    // The SKUs are gone; the keys must not be, or an existing grant becomes an
    // orphan the fulfilment path cannot match.
    expect(ALL_ENTITLEMENT_KEYS).toContain(ENT.TRIBE_VALKYRA);
    expect(ALL_ENTITLEMENT_KEYS).toContain(ENT.TRIBE_MYCELON);
  });

  it("map packs match store products and every curated map generates a valid board", () => {
    for (const pack of MAP_PACKS) {
      expect(ALL_ENTITLEMENT_KEYS).toContain(pack.key);
      const product = PRODUCTS.find((p) => p.kind === "maps" && p.grants.includes(pack.key));
      expect(product, `no maps product grants ${pack.key}`).toBeTruthy();
      for (const m of pack.maps) {
        const { tiles, cities } = generateMap(m.size, m.seed, 4, m.preset);
        expect(tiles.length).toBe(m.size * m.size);
        expect(cities.filter((c) => c.isCapital).length).toBe(4);
        // curated maps must clear the fairness floor used by the AI builder
        const metrics = measureMap(m.seed, m.preset, m.size);
        expect(metrics.capitalSpreadMin, `${m.name} capitals too close`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("ultimate bundle grants every entitlement", () => {
    const ultimate = productBySku("bundle_ultimate");
    expect(ultimate).toBeTruthy();
    for (const key of ALL_ENTITLEMENT_KEYS) expect(ultimate!.grants).toContain(key);
    expect(ultimate!.grants).toContain(ENT.STORY_CH1);
  });
});

describe("premium tribe passives", () => {
  it("stormborn: retaliation damage is halved vs an identical non-storm attacker", async () => {
    const { game } = await import("../client/src/game/core/state");
    const { previewCombat } = await import("../client/src/game/core/rules");
    // Valkyra (def 6) in slot 0 — same seed as the Dravok baseline below so the
    // board and starting units are identical apart from the passive.
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 777, preset: "pangaea", roster: [6, 1, 2, 3] });
    const s = game.state;
    const mine = s.units.find((u) => u.tribe === 0)!;
    const enemy = s.units.find((u) => u.tribe === 1)!;
    // synthesize a melee duel: park the enemy adjacent so retaliation applies
    enemy.x = mine.x + 1;
    enemy.y = mine.y;
    const pv = previewCombat(s, mine, enemy);

    // baseline: Auren (def 0, scholars — no combat passive) attacker, same seed
    game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 777, preset: "pangaea", roster: [0, 1, 2, 3] });
    const s2 = game.state;
    const mine2 = s2.units.find((u) => u.tribe === 0)!;
    const enemy2 = s2.units.find((u) => u.tribe === 1)!;
    enemy2.x = mine2.x + 1;
    enemy2.y = mine2.y;
    const pv2 = previewCombat(s2, mine2, enemy2);

    expect(pv2.damageToAttacker).toBeGreaterThan(0);
    expect(pv.damageToAttacker).toBe(Math.floor(pv2.damageToAttacker * 0.5));
  });

  it("sporebound: heals +2 more than a control tribe on the same board", async () => {
    const { game } = await import("../client/src/game/core/state");
    const healAfterRound = (roster: number[]): number => {
      game.newGame({ size: 9, humanTribe: 0, difficulty: "normal", seed: 4242, preset: "pangaea", roster });
      const s = game.state;
      const u = s.units.find((x) => x.tribe === 0)!;
      // park the wounded unit on its own capital tile (friendly territory)
      const cap = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
      u.x = cap.x;
      u.y = cap.y;
      u.hp = Math.max(1, u.maxHp - 6);
      const before = u.hp;
      for (let i = 0; i < s.tribes.length; i++) game.endTurn();
      const after = game.state.units.find((x) => x.id === u.id)?.hp ?? before;
      return after - before;
    };
    const spore = healAfterRound([7, 1, 2, 3]); // Mycelon
    const control = healAfterRound([0, 1, 2, 3]); // Auren
    expect(spore - control).toBe(2);
  });
});
