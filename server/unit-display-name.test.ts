import { describe, expect, it } from "vitest";
import { UNIT_STATS, type UnitType } from "../client/src/game/core/types";
import { unitDisplayName } from "../client/src/game/ui/unitDisplayName";

describe("neutral Guardian display identity", () => {
  it("shows Guardian for the flagged neutral actor without mutating its Swordsman identity", () => {
    const unit = Object.freeze({ type: "swordsman" as const, guardian: true });
    const before = JSON.stringify(unit);
    const stats = JSON.stringify(UNIT_STATS.swordsman);
    expect(unitDisplayName(unit)).toBe("Guardian");
    expect(JSON.stringify(unit)).toBe(before);
    expect(JSON.stringify(UNIT_STATS.swordsman)).toBe(stats);
  });

  it("keeps every ordinary gameplay role name unchanged", () => {
    for (const type of Object.keys(UNIT_STATS) as UnitType[]) {
      expect(unitDisplayName({ type })).toBe(UNIT_STATS[type].name);
      expect(unitDisplayName({ type, guardian: false })).toBe(UNIT_STATS[type].name);
    }
    expect(unitDisplayName({ type: "swordsman" })).toBe("Swordsman");
  });
});
