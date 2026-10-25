import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TRIBE_SWORDSMAN_ADVANCED_BETA } from "../client/src/game/render/betaAdvancedTribeVisuals";
import {
  AUREN_SWORDSMAN_ADVANCED_BETA,
  betaAdvancedVisualCandidate,
  BETA_SWORDSMAN_VISUAL_HOLDS,
} from "../client/src/game/render/betaAdvancedVisuals";
import {
  betaVisualCandidate,
  BETA_MODEL_CACHE_LIMITS,
} from "../client/src/game/render/betaVisualCandidate";
import { betaVisualTextureBytesForUrl } from "../client/src/game/render/betaVisualRevisions";
import { BETA_MODEL_PUBLIC_ORIGIN } from "../client/src/game/render/betaModelUrl";
import { BETA_VISUAL_MODELS } from "../client/src/game/render/betaVisualModels";
import {
  VISUAL_REVIEW_ROSTER,
  visualRosterCandidate,
} from "../client/src/game/render/visualReview";

const unit = {
  type: "swordsman" as const,
  hero: false,
  guardian: false,
  raider: false,
  boat: false,
};
const tribes = [
  "kharzul",
  "sunwei",
  "vessari",
  "nerivane",
  "dravok",
  "valkyra",
  "mycelon",
];

describe("audited tribe-owned advanced Swordsmen", () => {
  it("adds exactly seven immutable independent records without altering the original roster", () => {
    expect(Object.keys(TRIBE_SWORDSMAN_ADVANCED_BETA)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
    expect(Object.isFrozen(TRIBE_SWORDSMAN_ADVANCED_BETA)).toBe(true);
    expect(VISUAL_REVIEW_ROSTER).toHaveLength(46);
    expect(Object.keys(BETA_VISUAL_MODELS)).toHaveLength(46);
    expect(betaAdvancedVisualCandidate(0, unit)).toBe(
      AUREN_SWORDSMAN_ADVANCED_BETA.candidate
    );
  });

  for (let index = 1; index <= 7; index += 1) {
    const tribe = tribes[index - 1];
    it(`${tribe}: selects its own audited ordinary land model only after affirmative opt-in`, () => {
      const candidate = TRIBE_SWORDSMAN_ADVANCED_BETA[index];
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(candidate.id).toBe(`${tribe}-swordsman-p1`);
      expect(candidate.modelUrl).toMatch(
        new RegExp(
          `^/manus-storage/${tribe}-swordsman-p1-beta-512_[a-z0-9]+\\.glb$`
        )
      );
      expect(candidate.originalModelUrl).toMatch(
        new RegExp(`^/manus-storage/${tribe}-swordsman-p1-p2_[a-z0-9]+\\.glb$`)
      );
      expect(candidate.decision).toBe("review-candidate");
      expect(candidate.sourceBytes).toBeLessThan(candidate.originalSourceBytes);
      expect(candidate.textureResolution).toBe(512);
      expect(candidate.textureBytesEstimated).toBe(4194306);
      expect(candidate.triangles).toBeLessThanOrEqual(5500);
      expect(candidate.vertices).toBeLessThanOrEqual(10000);
      expect(candidate.runtimePrimitives).toBe(1);
      expect(candidate.materials).toBe(1);
      expect(candidate.faceLimitRequested).toBe(5000);
      for (const hash of [
        candidate.sourceImageSha256,
        candidate.originalModelSha256,
        candidate.derivativeSha256,
      ])
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(candidate.geometryMaterialIntegrity).toBe(
        "independently-verified-unchanged"
      );
      expect(
        betaVisualCandidate(index, { ...unit, tribe: 0 }, false)
      ).toBeNull();
      expect(betaVisualCandidate(index, unit, true, true)).toBeNull();
      expect(betaVisualCandidate(index, { ...unit, tribe: 0 }, true)).toBe(
        BETA_SWORDSMAN_VISUAL_HOLDS[index] ? null : candidate
      );
      expect(visualRosterCandidate(index, unit, true)).toBeNull();
      for (let other = 0; other <= 7; other += 1) {
        if (other !== index)
          expect(betaAdvancedVisualCandidate(other, unit)?.modelUrl).not.toBe(
            candidate.modelUrl
          );
      }
      for (const excluded of [
        { ...unit, hero: true },
        { ...unit, guardian: true },
        { ...unit, raider: true },
        { ...unit, boat: true },
        { ...unit, type: "warrior" as const },
        { ...unit, type: "defender" as const },
        { ...unit, type: "knight" as const },
        { ...unit, type: "hero" as const },
      ])
        expect(betaAdvancedVisualCandidate(index, excluded)).toBeNull();
      for (const url of [
        candidate.modelUrl,
        `${BETA_MODEL_PUBLIC_ORIGIN}${candidate.modelUrl}`,
      ]) {
        if (BETA_SWORDSMAN_VISUAL_HOLDS[index]) {
          expect(() => betaVisualTextureBytesForUrl(url)).toThrow(
            "No audited beta texture estimate"
          );
        } else {
          expect(betaVisualTextureBytesForUrl(url)).toBe(
            candidate.textureBytesEstimated
          );
        }
      }
      for (const url of [
        candidate.originalModelUrl,
        `${candidate.modelUrl}?x=1`,
        `${candidate.modelUrl}#x`,
        `https://evil.invalid${candidate.modelUrl}`,
        `${BETA_MODEL_PUBLIC_ORIGIN}.evil.invalid${candidate.modelUrl}`,
        candidate.modelUrl.replace("/manus-storage/", "/manus-storage/../"),
      ])
        expect(() => betaVisualTextureBytesForUrl(url)).toThrow(
          "No audited beta texture estimate"
        );
    });
  }

  it("retains Nerivane provenance but refuses the held Swordsman and any cross-tribe substitute", () => {
    expect(Object.isFrozen(BETA_SWORDSMAN_VISUAL_HOLDS)).toBe(true);
    expect(Object.keys(BETA_SWORDSMAN_VISUAL_HOLDS)).toEqual(["4"]);
    expect(betaAdvancedVisualCandidate(4, unit)).toBeNull();
    expect(TRIBE_SWORDSMAN_ADVANCED_BETA[4].decision).toBe("review-candidate");
    expect(
      betaVisualCandidate(4, { ...unit, type: "warrior" }, true)
    ).not.toBeNull();
    expect(betaAdvancedVisualCandidate(0, unit)).toBe(
      AUREN_SWORDSMAN_ADVANCED_BETA.candidate
    );
  });

  it("rejects invalid designed identities and leaves memory/cache budgets unchanged", () => {
    for (const index of [-1, 8, 99, 1.5, Number.NaN])
      expect(betaAdvancedVisualCandidate(index, unit)).toBeNull();
    expect(BETA_MODEL_CACHE_LIMITS).toEqual({
      maxTextureBytes: 64 * 1024 * 1024,
      maxModels: 16,
      loadTimeoutMs: 15000,
    });
    const source = readFileSync(
      new URL(
        "../client/src/game/render/betaAdvancedTribeVisuals.ts",
        import.meta.url
      ),
      "utf8"
    );
    expect(source).not.toContain("/client/public/");
    expect(source).not.toMatch(/signed|X-Amz-|token=/i);
  });
});
