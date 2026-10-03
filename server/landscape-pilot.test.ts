import { describe, expect, it } from "vitest";
import { coastBandLocalY, coastPilotEnabled } from "../client/src/game/render/landscapePilot";

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
});
