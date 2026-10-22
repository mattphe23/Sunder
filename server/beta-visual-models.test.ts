import { describe, expect, it } from "vitest";
import {
  BETA_VISUAL_MODELS,
  BETA_VISUAL_MODEL_PROVENANCE,
  betaVisualModelFor,
} from "../client/src/game/render/betaVisualModels";
import { VISUAL_REVIEW_ROSTER } from "../client/src/game/render/visualReview";

const HEX_256 = /^[a-f0-9]{64}$/;
const MANAGED_GLB = /^\/manus-storage\/.+\.glb$/;

describe("New visuals beta derivative manifest", () => {
  it("is an exact, duplicate-free mapping for all 46 visual-review originals", () => {
    const originals = VISUAL_REVIEW_ROSTER.map(
      ({ candidate }) => candidate.modelUrl
    ).sort();
    const derivativeOriginals = Object.keys(BETA_VISUAL_MODELS).sort();

    expect(VISUAL_REVIEW_ROSTER).toHaveLength(46);
    expect(new Set(originals).size).toBe(46);
    expect(derivativeOriginals).toEqual(originals);
  });

  it("preserves recorded source provenance and has a safe nullable lookup", () => {
    expect(BETA_VISUAL_MODEL_PROVENANCE.originals).toBe("unchanged");
    expect(BETA_VISUAL_MODEL_PROVENANCE.derivative).toBe(
      "embedded-textures-contain-resized-to-512px"
    );

    for (const { candidate } of VISUAL_REVIEW_ROSTER) {
      const derivative = betaVisualModelFor(candidate.modelUrl);
      expect(derivative, candidate.modelUrl).not.toBeNull();
      expect(derivative?.sourceBytes).toBe(derivative?.derivativeBytes);
      expect(derivative?.originalSourceBytes).toBe(candidate.sourceBytes);
      expect(derivative?.sourceBytes).toBeLessThan(
        derivative?.originalSourceBytes ?? Number.POSITIVE_INFINITY
      );
      expect(derivative?.originalSha256).toMatch(HEX_256);
      expect(derivative?.sha256).toMatch(HEX_256);
      expect(derivative?.sha256).not.toBe(derivative?.originalSha256);
      expect(derivative?.modelUrl).toMatch(MANAGED_GLB);
      expect(derivative?.modelUrl).not.toBe(candidate.modelUrl);
    }

    expect(
      betaVisualModelFor("/manus-storage/not-a-reviewed-model.glb")
    ).toBeNull();
  });

  it("holds every uploaded beta texture to the 512px runtime budget", () => {
    for (const [originalUrl, derivative] of Object.entries(
      BETA_VISUAL_MODELS
    )) {
      expect(originalUrl).toMatch(MANAGED_GLB);
      expect(derivative.textureResolution, originalUrl).toBeGreaterThan(0);
      expect(derivative.textureResolution, originalUrl).toBeLessThanOrEqual(
        512
      );
      // 4 RGBA bytes/pixel and the full 4/3 mipmap chain estimate are recorded.
      expect(derivative.textureBytesEstimated, originalUrl).toBeGreaterThan(0);
    }
  });
});
