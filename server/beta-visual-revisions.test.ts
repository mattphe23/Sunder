import { describe, expect, it } from "vitest";
import {
  betaVisualCandidate,
  BETA_MODEL_CACHE_LIMITS,
} from "../client/src/game/render/betaVisualCandidate";
import {
  AUREN_MAELIS_PILOT,
  AUREN_WARRIOR_PILOT,
} from "../client/src/game/render/importedModelRegistry";
import {
  BETA_VISUAL_MODELS,
  betaVisualModelFor,
} from "../client/src/game/render/betaVisualModels";
import {
  betaVisualRevisionFor,
  betaVisualTextureBytesForUrl,
  MAELIS_BETA_REVISION,
} from "../client/src/game/render/betaVisualRevisions";
import { BETA_MODEL_PUBLIC_ORIGIN } from "../client/src/game/render/betaModelUrl";

const hero = {
  type: "hero" as const,
  hero: true,
  boat: false,
  guardian: false,
};

describe("separately audited beta visual revision", () => {
  it("requires explicit beta opt-in and normal real-hero eligibility", () => {
    expect(betaVisualCandidate(0, hero, false)).toBeNull();
    expect(betaVisualCandidate(0, hero, true, true)).toBeNull();
    expect(betaVisualCandidate(0, { ...hero, boat: true }, true)).toBeNull();
    expect(
      betaVisualCandidate(0, { ...hero, guardian: true }, true)
    ).toBeNull();
    expect(betaVisualCandidate(0, { ...hero, hero: false }, true)).toBeNull();
    expect(betaVisualCandidate(0, hero, true)?.assetId).toBe(
      "job_m_b47c17d928167d232bf3"
    );
    expect(betaVisualCandidate(1, hero, true)?.assetId).not.toBe(
      MAELIS_BETA_REVISION.candidate.assetId
    );
  });

  it("preserves all 46 original mappings and leaves Auren warrior unchanged", () => {
    const original = JSON.stringify(AUREN_MAELIS_PILOT);
    const legacyDerivative = betaVisualModelFor(AUREN_MAELIS_PILOT.modelUrl);
    expect(Object.keys(BETA_VISUAL_MODELS)).toHaveLength(46);
    expect(legacyDerivative?.modelUrl).not.toBe(
      MAELIS_BETA_REVISION.candidate.modelUrl
    );
    expect(
      betaVisualCandidate(0, { ...hero, type: "warrior", hero: false }, true)
        ?.assetId
    ).toBe(AUREN_WARRIOR_PILOT.assetId);
    expect(betaVisualRevisionFor(AUREN_WARRIOR_PILOT)).toBeNull();
    expect(
      betaVisualRevisionFor({ ...AUREN_MAELIS_PILOT, assetId: "unknown" })
    ).toBeNull();
    expect(
      betaVisualRevisionFor({
        ...AUREN_MAELIS_PILOT,
        decision: "rejected-study",
      })
    ).toBeNull();
    expect(JSON.stringify(AUREN_MAELIS_PILOT)).toBe(original);
  });

  it("records new model provenance rather than attributing new geometry to the old asset", () => {
    const selected = betaVisualCandidate(0, hero, true)!;
    expect(selected.originalModelUrl).toBe(
      "/manus-storage/auren-maelis-shoulder-mantle-r2-p2_bc1b24cd.glb"
    );
    expect(selected.modelUrl).toBe(
      "/manus-storage/auren-maelis-shoulder-mantle-r2-p2-beta-512_fc894858.glb"
    );
    expect(selected.triangles).toBe(4013);
    expect(selected.runtimePrimitives).toBe(1);
    expect(selected.sourceBytes).toBe(686164);
    expect(selected.textureResolution).toBe(512);
    expect(selected.textureBytesEstimated).toBe(4194306);
    expect(selected.decision).toBe("review-candidate");
    for (const hash of [
      MAELIS_BETA_REVISION.sourceImageSha256,
      MAELIS_BETA_REVISION.originalModelSha256,
      MAELIS_BETA_REVISION.derivativeSha256,
    ])
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("admits exact derivative paths on web/native without changing cache ceilings", () => {
    const path = MAELIS_BETA_REVISION.candidate.modelUrl;
    expect(betaVisualTextureBytesForUrl(path)).toBe(4194306);
    expect(
      betaVisualTextureBytesForUrl(`${BETA_MODEL_PUBLIC_ORIGIN}${path}`)
    ).toBe(4194306);
    for (const model of Object.values(BETA_VISUAL_MODELS))
      expect(betaVisualTextureBytesForUrl(model.modelUrl)).toBe(
        model.textureBytesEstimated
      );
    expect(BETA_MODEL_CACHE_LIMITS).toEqual({
      maxTextureBytes: 64 * 1024 * 1024,
      maxModels: 16,
      loadTimeoutMs: 15000,
    });
  });

  it("rejects originals, arbitrary hosts, prefixes, queries, traversal and missing audit entries", () => {
    const path = MAELIS_BETA_REVISION.candidate.modelUrl;
    for (const url of [
      MAELIS_BETA_REVISION.originalModelUrl,
      AUREN_MAELIS_PILOT.modelUrl,
      `${path}?version=1`,
      `https://evil.invalid${path}`,
      `${BETA_MODEL_PUBLIC_ORIGIN}.evil.invalid${path}`,
      `prefix${path}`,
      "/manus-storage/../unknown.glb",
      "/manus-storage/unknown.glb",
    ]) {
      expect(() => betaVisualTextureBytesForUrl(url)).toThrow(
        "No audited beta texture estimate"
      );
    }
  });
});
