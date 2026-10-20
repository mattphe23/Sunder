import { describe, expect, it } from "vitest";
import { importedUnitPreviewEnabled, type ImportedUnitPreviewFlag } from "../client/src/game/render/importedPreviewGate";

const flags: ImportedUnitPreviewFlag[] = [
  "p2-warrior", "p2-archer", "p2-defender", "p2-rider",
  "p2-rider-v2", "p2-tidecaller", "p2-nereth", "p2-auren-warrior",
];

describe("legacy imported-unit studies stay development-review only", () => {
  it.each(flags)("requires development, devgame and exact opt-in for %s", (flag) => {
    const optedIn = `?devgame=6104,11,4,highlands&${flag}=1`;
    expect(importedUnitPreviewEnabled(optedIn, true, flag)).toBe(true);
    expect(importedUnitPreviewEnabled(optedIn, false, flag)).toBe(false);
    expect(importedUnitPreviewEnabled(`?${flag}=1`, true, flag)).toBe(false);
    expect(importedUnitPreviewEnabled("?devgame=6104,11,4,highlands", true, flag)).toBe(false);
    for (const value of ["", "0", "true", "2"]) {
      expect(importedUnitPreviewEnabled(`?devgame=6104,11,4,highlands&${flag}=${value}`, true, flag)).toBe(false);
    }
    expect(importedUnitPreviewEnabled("", true, flag)).toBe(false);
  });

  it("does not promote any imported visual when every legacy query is supplied in production", () => {
    const all = `?devgame=6104,11,4,highlands&${flags.map(flag => `${flag}=1`).join("&")}`;
    for (const flag of flags) expect(importedUnitPreviewEnabled(all, false, flag)).toBe(false);
  });
});
