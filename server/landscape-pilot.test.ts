import { describe, expect, it } from "vitest";
import { ashMistPuffs, broadMountainSilhouette, coastBandLocalY, coastPilotEnabled, forestTreeCount, forestUnderbrushLimit, landscapeVariantEnabled, worldGroundFacets, worldRegionTone, worldSurfaceSpan, type LandscapeVariant } from "../client/src/game/render/landscapePilot";
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

  it("keeps original mountain geometry unflagged and varies only a deterministic subset in review", () => {
    for (let seed = 0; seed < 7; seed++) {
      expect(broadMountainSilhouette(seed, false)).toBe(false);
      expect(broadMountainSilhouette(seed, true)).toBe(seed % 3 !== 0);
    }
  });

  it("requires an exact world-v3 devgame flag and keeps previous pilots independent", () => {
    const world = "?devgame=6104,11,4,archipelago&landscape-pilot=world-v3";
    expect(landscapeVariantEnabled(world, true, "world-v3")).toBe(true);
    expect(coastPilotEnabled(world, true)).toBe(true);
    expect(landscapeVariantEnabled(world, true, "fog-v1")).toBe(true);
    expect(landscapeVariantEnabled(world, true, "vegetation-v1")).toBe(true);
    expect(landscapeVariantEnabled(world, true, "mountain-v1")).toBe(true);
    expect(landscapeVariantEnabled(world, false, "world-v3")).toBe(false);
    expect(landscapeVariantEnabled("?landscape-pilot=world-v3", true, "world-v3")).toBe(false);
    expect(landscapeVariantEnabled("?devgame=6104,11,4,archipelago", true, "world-v3")).toBe(false);
    expect(landscapeVariantEnabled("?devgame=6104,11,4,archipelago&landscape-pilot=review-v2", true, "world-v3")).toBe(false);
  });

  it("closes only the visible world-v3 cap, turf and water gaps at cell boundaries", () => {
    for (const original of [1.02 * 0.96, 1.02 * 0.962, 1.02 * 0.965]) {
      expect(worldSurfaceSpan(original, true, true)).toBe(1);
      expect(worldSurfaceSpan(original, false, true)).toBe(original);
      expect(worldSurfaceSpan(original, true, false)).toBe(original);
    }
  });

  it("seeds patches only on empty reviewed grass", () => {
    expect(worldGroundFacets(8, 7, false, true)).toEqual([]);
    expect(worldGroundFacets(8, 7, true, false)).toEqual([]);
    const patches = worldGroundFacets(8, 7, true, true);
    expect(patches).toEqual(worldGroundFacets(8, 7, true, true));
    expect(patches).toHaveLength(2);
    for (const [x, y] of patches) {
      expect(Math.abs(x)).toBeLessThan(0.35);
      expect(Math.abs(y)).toBeLessThan(0.35);
    }
  });

  it("replaces short-cycle mist repetition with bounded seed-stable irregular profiles", () => {
    const signatures = new Set<string>();
    const counts = new Set<number>();
    for (let x = 0; x < 11; x++) for (let y = 0; y < 11; y++) {
      const puffs = ashMistPuffs(x, y, 6104);
      expect(puffs).toEqual(ashMistPuffs(x, y, 6104));
      counts.add(puffs.length);
      signatures.add(JSON.stringify(puffs));
      expect(puffs.length).toBeGreaterThanOrEqual(2);
      expect(puffs.length).toBeLessThanOrEqual(4);
      for (const puff of puffs) {
        expect(Math.abs(puff.x)).toBeLessThan(0.111);
        expect(Math.abs(puff.z)).toBeLessThan(0.111);
        expect(puff.radius).toBeGreaterThanOrEqual(0.23);
        expect(puff.radius).toBeLessThan(0.45);
        expect(puff.stretchX).toBeGreaterThanOrEqual(0.84);
        expect(puff.stretchZ).toBeLessThan(1.14);
      }
    }
    expect(counts).toEqual(new Set([2, 3, 4]));
    expect(signatures.size).toBeGreaterThan(110);
    expect(ashMistPuffs(8, 7, 6104)).not.toEqual(ashMistPuffs(8, 7, 6105));
  });

  it("uses sparse broad banks only deep within fog while its visible frontier keeps cloud cover", () => {
    let emptyInteriors = 0;
    let occupiedInteriors = 0;
    for (let x = 1; x < 12; x++) for (let y = 1; y < 12; y++) {
      const interior = ashMistPuffs(x, y, 6104, true);
      expect(interior).toEqual(ashMistPuffs(x, y, 6104, true));
      expect(ashMistPuffs(x, y, 6104, false).length).toBeGreaterThanOrEqual(2);
      expect(interior.length).toBeLessThanOrEqual(2);
      if (!interior.length) emptyInteriors++;
      else {
        occupiedInteriors++;
        expect(interior[0].radius).toBeGreaterThanOrEqual(0.53);
        expect(interior[0].radius).toBeLessThan(0.73);
      }
    }
    expect(emptyInteriors).toBeGreaterThan(25);
    expect(occupiedInteriors).toBeGreaterThan(35);
  });

  it("uses broad subdued land value steps without changing water or fogged tiles", () => {
    const steps = new Set<number>();
    for (let x = 0; x < 11; x++) for (let y = 0; y < 11; y++) {
      const value = worldRegionTone(x, y, "grass", true, true);
      steps.add(value);
      expect(worldRegionTone(x, y, "grass", true, true)).toBe(value);
      expect(worldRegionTone(x, y, "forest", true, true)).toBe(value);
      expect(worldRegionTone(x, y, "water", true, true)).toBe(0);
      expect(worldRegionTone(x, y, "mountain", true, true)).toBe(0);
      expect(worldRegionTone(x, y, "grass", false, true)).toBe(0);
      expect(worldRegionTone(x, y, "grass", true, false)).toBe(0);
    }
    expect(steps).toEqual(new Set([-0.07, 0.055, 0]));
  });
});
