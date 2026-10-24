import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { UNIT_STATS } from "../client/src/game/core/types";
import {
  AUREN_SWORDSMAN_ADVANCED_BETA,
  betaAdvancedVisualCandidate,
} from "../client/src/game/render/betaAdvancedVisuals";
import {
  BETA_MODEL_CACHE_LIMITS,
  betaVisualCandidate,
} from "../client/src/game/render/betaVisualCandidate";
import { BoardModelCache } from "../client/src/game/render/importedModelCache";
import { BETA_MODEL_PUBLIC_ORIGIN } from "../client/src/game/render/betaModelUrl";
import { BETA_VISUAL_MODELS } from "../client/src/game/render/betaVisualModels";
import { betaVisualTextureBytesForUrl } from "../client/src/game/render/betaVisualRevisions";
import {
  VISUAL_REVIEW_ROSTER,
  visualRosterCandidate,
} from "../client/src/game/render/visualReview";

const swordsman = {
  type: "swordsman" as const,
  hero: false,
  boat: false,
  guardian: false,
  raider: false,
};

const warrior = { ...swordsman, type: "warrior" as const };
const maelis = { ...swordsman, type: "hero" as const, hero: true };

describe("Auren swordsman advanced visual", () => {
  it("remains off by default and excludes custom or skinned units", () => {
    expect(betaVisualCandidate(0, swordsman, false)).toBeNull();
    expect(betaVisualCandidate(0, swordsman, true, true)).toBeNull();
  });

  it("selects only the ordinary Auren swordsman by designed identity, never game seat", () => {
    const selected = betaVisualCandidate(0, { ...swordsman, tribe: 6 }, true);
    expect(selected).toBe(AUREN_SWORDSMAN_ADVANCED_BETA.candidate);
    expect(selected).toMatchObject({
      id: "auren-swordsman-p1",
      generationJobId: "job_m_66a1f6ee98cbcca58e0a",
      modelUrl: "/manus-storage/auren-swordsman-p1-beta-512_d9ac7986.glb",
      originalModelUrl: "/manus-storage/auren-swordsman-p1-p2_3daceace.glb",
      vertices: 6666,
      triangles: 4828,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 812316,
      originalSourceBytes: 3814544,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      decision: "review-candidate",
    });

    // A game slot which happens to be Auren cannot override the wrong designed tribe.
    expect(betaVisualCandidate(1, { ...swordsman, tribe: 0 }, true)).toBeNull();
    expect(betaAdvancedVisualCandidate(0, swordsman)).toBe(selected);
  });

  it("does not substitute the sword model for Warrior, Maelis, or Guardian paths", () => {
    const advancedUrl = AUREN_SWORDSMAN_ADVANCED_BETA.candidate.modelUrl;
    expect(betaVisualCandidate(0, warrior, true)?.modelUrl).not.toBe(
      advancedUrl
    );
    expect(betaVisualCandidate(0, maelis, true)?.modelUrl).not.toBe(
      advancedUrl
    );
    expect(
      betaVisualCandidate(0, { ...swordsman, guardian: true }, true)
    ).toBeNull();
  });

  it("excludes hero, boat, and raider flags even for an Auren swordsman", () => {
    for (const unit of [
      { ...swordsman, hero: true },
      { ...swordsman, boat: true },
      { ...swordsman, raider: true },
    ]) {
      expect(betaVisualCandidate(0, unit, true)).toBeNull();
    }
  });

  it("leaves the original 46-entry development roster and derivative manifest unchanged", () => {
    const originalRoster = JSON.stringify(VISUAL_REVIEW_ROSTER);
    expect(VISUAL_REVIEW_ROSTER).toHaveLength(46);
    expect(Object.keys(BETA_VISUAL_MODELS)).toHaveLength(46);
    expect(visualRosterCandidate(0, swordsman, true)).toBeNull();
    expect(betaVisualCandidate(0, swordsman, true)).toBe(
      AUREN_SWORDSMAN_ADVANCED_BETA.candidate
    );
    expect(JSON.stringify(VISUAL_REVIEW_ROSTER)).toBe(originalRoster);
  });

  it("admits only the exact audited derivative on web and native URL forms", () => {
    const candidate = AUREN_SWORDSMAN_ADVANCED_BETA.candidate;
    expect(betaVisualTextureBytesForUrl(candidate.modelUrl)).toBe(4194306);
    expect(
      betaVisualTextureBytesForUrl(
        `${BETA_MODEL_PUBLIC_ORIGIN}${candidate.modelUrl}`
      )
    ).toBe(4194306);

    for (const url of [
      candidate.originalModelUrl,
      `${candidate.modelUrl}?v=1`,
      `https://evil.invalid${candidate.modelUrl}`,
      `${BETA_MODEL_PUBLIC_ORIGIN}.evil.invalid${candidate.modelUrl}`,
      "/manus-storage/../auren-swordsman-p1-beta-512_d9ac7986.glb",
      `${BETA_MODEL_PUBLIC_ORIGIN}/manus-storage/../auren-swordsman-p1-beta-512_d9ac7986.glb`,
    ]) {
      expect(() => betaVisualTextureBytesForUrl(url)).toThrow(
        "No audited beta texture estimate"
      );
    }
  });

  it("does not change swordsman engine costs, rules, or beta cache limits", () => {
    expect(UNIT_STATS.swordsman).toEqual({
      name: "Swordsman",
      cost: 5,
      hp: 15,
      attack: 3,
      defense: 3,
      movement: 1,
      range: 1,
      dash: true,
      tech: "smithery",
    });
    expect(BETA_MODEL_CACHE_LIMITS).toEqual({
      maxTextureBytes: 64 * 1024 * 1024,
      maxModels: 16,
      loadTimeoutMs: 15000,
    });
  });

  it("retains the existing two-concurrent-loader ceiling", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    let started = 0;
    const cache = new BoardModelCache(scene, () => {
      started += 1;
      return new Promise(() => undefined);
    });
    const candidate = AUREN_SWORDSMAN_ADVANCED_BETA.candidate;
    const jobs = ["one", "two", "three"].map(suffix =>
      cache.instantiate(
        {
          ...candidate,
          modelUrl: `/manus-storage/advanced-loader-${suffix}.glb`,
        },
        new TransformNode(`advanced-loader-parent-${suffix}`, scene)
      )
    );

    await Promise.resolve();
    expect(started).toBe(2);
    expect(cache.stats.activeLoads).toBe(2);
    expect(cache.stats.queuedLoads).toBe(1);

    cache.dispose();
    await expect(Promise.all(jobs)).resolves.toEqual([null, null, null]);
    scene.dispose();
    engine.dispose();
  });
});
