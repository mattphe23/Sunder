// Tribe Forge — the forged tribe must be a real tribe, not a fallback.
//
// A custom tribe's defIndex is TRIBE_DEFS.length, which falls off the end of
// every per-tribe table in the renderer. Before the costume work it landed on
// RAIDER_COSTUME — grey accent, `headgear: "none"` — so the tribe a player named
// and coloured rendered as a bare-headed bandit. Headgear is the one costume
// feature readable at play distance, which is why every designed tribe has its
// own, and it is what these tests protect.
import { describe, it, expect } from "vitest";
import { game } from "../client/src/game/core/state";
import { CUSTOM_DEF_INDEX, DEFAULT_FORGE_HEADGEAR, FORGE_HEADGEAR, CustomTribeConfig } from "../client/src/game/core/customTribe";
import { victoryProgress } from "../client/src/game/core/victory";

const base: CustomTribeConfig = {
  name: "Hornhold",
  color: "#f43f5e",
  passive: "forgeborn",
  uniqueUnit: "berserker",
  startTech: "hunting",
  headgear: "horns",
};

function start(config: CustomTribeConfig) {
  game.newGame({
    size: 11, humanTribe: 0, difficulty: "normal", seed: 4242,
    preset: "continents", roster: [0, 1, 2, 3], custom: { slot: 0, config },
  });
  return game.state;
}

describe("Tribe Forge", () => {
  it("carries the chosen headgear on the tribe, not in a render-module global", () => {
    // On the tribe so it survives a save/load, and so hot-seat with two forged
    // tribes cannot have them share one costume.
    const s = start(base);
    expect(s.tribes[0].defIndex).toBe(CUSTOM_DEF_INDEX);
    expect(s.tribes[0].customHeadgear).toBe("horns");
    expect(s.tribes[0].customUnique).toBe("berserker");
  });

  it("gives configs saved before headgear existed a real default, not 'none'", () => {
    const { headgear: _omitted, ...legacy } = base;
    const s = start(legacy as CustomTribeConfig);
    expect(s.tribes[0].customHeadgear).toBe(DEFAULT_FORGE_HEADGEAR);
    // the whole point: a forged tribe is never bare-headed
    expect(s.tribes[0].customHeadgear).not.toBe("none");
    expect(s.tribes[0].customHeadgear).toBeTruthy();
  });

  it("offers only headgear the renderer can actually draw", () => {
    // The picker and the renderer's switch have to agree; an option the switch
    // does not handle falls through and draws nothing, which is the bug this
    // whole change exists to fix.
    const drawable = ["circlet", "horns", "straw", "hood", "crest", "helm", "wings", "cap"];
    for (const h of FORGE_HEADGEAR) expect(drawable).toContain(h.id);
    expect(FORGE_HEADGEAR.length).toBeGreaterThanOrEqual(4);
    expect(FORGE_HEADGEAR.map((h) => h.id)).toContain(DEFAULT_FORGE_HEADGEAR);
  });

  it("only the standard tribes carry customHeadgear — the rest stay undefined", () => {
    const s = start(base);
    for (let i = 1; i < s.tribes.length; i++) expect(s.tribes[i].customHeadgear).toBeUndefined();
  });

  it("runs the generic Ascendance path at the swept target, not the old 900", () => {
    const s = start(base);
    const p = victoryProgress(s, 0)!;
    expect(p.def.id).toBe("ascendance");
    // 900 was a score every tribe passes in normal play, which made the Forge
    // win 85% of matches against a 48% control.
    expect(p.target).toBeGreaterThan(1200);
    expect(p.def.goal).toContain(String(p.target));
  });
});
