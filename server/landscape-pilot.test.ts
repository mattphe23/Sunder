import { describe, expect, it } from "vitest";
import { coastBandLocalY, coastPilotEnabled, forestTreeCount, forestUnderbrushLimit, landscapeVariantEnabled, type LandscapeVariant } from "../client/src/game/render/landscapePilot";
describe("review-only coastal landscape pilot", () => {
  it("requires a development build, a devgame and an exact opt-in slug", () => {
    const optedIn = "?devgame=6104,11,4,archipelago&landscape-pilot=coast-v1";
    expect(coastPilotEnabled(optedIn, true)).toBe(true);
    expect(coastPilotEnabled(optedIn, false)).toBe(false);
    expect(coastPilotEnabled("?landscape-pilot=coast-v1", true)).toBe(false);
    expect(coastPilotEnabled("?devgame=6104,11,4,archipelago", true)).toBe(false);
    expect(coastPilotEnabled("?devgame=6104,11,4,archipelago&landscape-pilot=other", true)).toBe(false);
  });

  it.each([
    [0.3, 0.14], [0.3, 0.08], [0.34, 0.14], [0.34, 0.08],
  ])("anchors the shore and sand to the physical waterline for land=%s water=%s", (land, water) => {
    const landBodyCenter = land - 0.4 - (land + 0.34) / 2;
    const seaSurface = water - 0.4;
    const rimWorldY = landBodyCenter + coastBandLocalY(land, water, 0.34, 0.035);
    const sandWorldY = landBodyCenter + coastBandLocalY(land, water, 0.34, -0.063);
    expect(rimWorldY - seaSurface).toBeCloseTo(0.035);
    expect(sandWorldY - seaSurface).toBeCloseTo(-0.063);
    expect(rimWorldY).toBeLessThan(land - 0.4);
  });

  it("isolates fog, vegetation, mountain and coast, and gates the combined review", () => {
    const variants: LandscapeVariant[] = ["coast-v1", "fog-v1", "vegetation-v1", "mountain-v1"];
    for (const selected of variants) {
      const flagged = `?devgame=6104,11,4,highlands&landscape-pilot=${selected}`;
      for (const variant of variants) {
        expect(landscapeVariantEnabled(flagged, true, variant)).toBe(variant === selected);
        expect(landscapeVariantEnabled(flagged, false, variant)).toBe(false);
        expect(landscapeVariantEnabled(`?landscape-pilot=${selected}`, true, variant)).toBe(false);
        expect(landscapeVariantEnabled("?devgame=6104,11,4,highlands", true, variant)).toBe(false);
        expect(landscapeVariantEnabled("?devgame=6104,11,4,highlands&landscape-pilot=unknown", true, variant)).toBe(false);
        expect(landscapeVariantEnabled("?devgame=6104,11,4,highlands&landscape-pilot=review-v2", true, variant)).toBe(true);
      }
    }
  });

  it("limits foreground forest clutter near a settlement without changing unflagged forest budgets", () => {
    for (const kind of ["conifer", "pine", "palm", "acacia"] as const) {
      for (const [x, y] of [[8, 6], [7, 5], [10, 9]]) {
        const original = (kind === "palm" || kind === "acacia" ? 2 : 3) + ((x * 7 + y * 11) % 2);
        expect(forestTreeCount(kind, x, y, true, false)).toBe(original);
        expect(forestTreeCount(kind, x, y, false, false)).toBe(original);
        expect(forestTreeCount(kind, x, y, true, true)).toBe(2);
        expect(forestTreeCount(kind, x, y, false, true)).toBeLessThanOrEqual(3);
      }
    }
    expect(forestUnderbrushLimit(true, false)).toBe(7);
    expect(forestUnderbrushLimit(false, false)).toBe(7);
    expect(forestUnderbrushLimit(true, true)).toBe(3);
    expect(forestUnderbrushLimit(false, true)).toBe(11);
  });
});
