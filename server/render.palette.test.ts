// Stage 1/2 QA evidence: the flat-shading contract lives in palette.ts and
// characters.ts (pure modules, safe to test headlessly — no Babylon engine).
import { describe, it, expect } from "vitest";
import { PALETTE, SIDE_DARKEN, darken } from "../client/src/game/render/palette";

describe("Stage 1 flat-shading palette contract", () => {
  it("defines hand-picked top+side swatches for every terrain", () => {
    for (const key of ["grass", "forest", "mountain", "water", "ocean"]) {
      const sw = PALETTE.terrain[key];
      expect(sw, `missing terrain swatch: ${key}`).toBeDefined();
      expect(sw.top).toMatch(/^#[0-9a-f]{6}$/i);
      expect(sw.side).toMatch(/^#[0-9a-f]{6}$/i);
      // side is strictly darker than top (flat-shading depth contract)
      const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
      expect(lum(sw.side)).toBeLessThan(lum(sw.top));
    }
  });

  it("darkens slab sides by a fixed ratio (color does the depth work)", () => {
    expect(SIDE_DARKEN).toBeGreaterThan(0.4);
    expect(SIDE_DARKEN).toBeLessThan(0.9);
    const side = darken("#80c040");
    // each channel scaled by SIDE_DARKEN
    expect(side.toLowerCase()).not.toBe("#80c040");
    const r = parseInt(side.slice(1, 3), 16);
    expect(r).toBe(Math.round(0x80 * SIDE_DARKEN));
  });

  it("darken() clamps and preserves hex format", () => {
    expect(darken("#ffffff", 0.5)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(darken("#000000", 0.5)).toBe("#000000");
  });
});
