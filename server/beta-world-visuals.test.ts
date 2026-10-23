import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { GUARDIAN_TRIBE, type Unit } from "../client/src/game/core/types";
import { DEFAULT_BETA_VISUALS } from "../client/src/game/render/betaVisualPreferences";
import { betaVisualTextureBytesForUrl } from "../client/src/game/render/betaVisualRevisions";
import {
  betaGuardianCandidate,
  NEUTRAL_OATH_GUARDIAN_BETA,
} from "../client/src/game/render/betaWorldVisuals";
import { BoardRenderer } from "../client/src/game/render/scene";

function guardian(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 701,
    type: "swordsman",
    tribe: GUARDIAN_TRIBE,
    x: 3,
    y: 4,
    hp: 15,
    maxHp: 15,
    moved: true,
    attacked: true,
    kills: 0,
    boat: false,
    guardian: true,
    ...overrides,
  };
}

function guardianRenderer(preferences = DEFAULT_BETA_VISUALS) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const renderer = Object.create(BoardRenderer.prototype) as BoardRenderer;
  Object.assign(renderer, {
    scene,
    root: new TransformNode("guardian-test-root", scene),
    mats: new Map<string, StandardMaterial>(),
    betaVisualPreferences: preferences,
  });
  return {
    scene,
    renderer,
    close() {
      scene.dispose();
      engine.dispose();
    },
  };
}

describe("neutral Great Ruin guardian beta world visual", () => {
  it("selects only the real neutral guardian behind explicit New visuals", () => {
    const selected = betaGuardianCandidate(guardian(), true);
    expect(selected).toBe(NEUTRAL_OATH_GUARDIAN_BETA.candidate);
    expect(selected).toMatchObject({
      id: "neutral-oathguardian-v1",
      generationJobId: "job_m_5b962ab1fa3cab8d7397",
      modelUrl:
        "/manus-storage/neutral-oathguardian-v1-beta-512_68426439.glb",
      originalModelUrl: "/manus-storage/neutral-oathguardian-v1-p2_6ac754ce.glb",
      vertices: 3677,
      triangles: 4806,
      runtimePrimitives: 1,
      sourceBytes: 648572,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      decision: "review-candidate",
    });

    for (const unit of [
      guardian({ guardian: false }),
      guardian({ tribe: 0 }),
      guardian({ type: "warrior" }),
      guardian({ boat: true }),
      guardian({ hero: true }),
      guardian({ raider: true }),
    ]) {
      expect(betaGuardianCandidate(unit, true)).toBeNull();
    }
    expect(betaGuardianCandidate(guardian(), false)).toBeNull();
  });

  it("admits only the exact audited runtime derivative texture estimate", () => {
    const candidate = NEUTRAL_OATH_GUARDIAN_BETA.candidate;
    expect(betaVisualTextureBytesForUrl(candidate.modelUrl)).toBe(4194306);
    for (const url of [
      candidate.originalModelUrl,
      `${candidate.modelUrl}?v=1`,
      `https://evil.invalid${candidate.modelUrl}`,
      "/manus-storage/neutral-oathguardian-v1-beta-512.glb",
    ]) {
      expect(() => betaVisualTextureBytesForUrl(url)).toThrow(
        "No audited beta texture estimate",
      );
    }
  });

  it("keeps the exact procedural guardian body and amber eye by default", () => {
    const h = guardianRenderer();
    try {
      const node = (h.renderer as any).buildUnitMesh({} as never, guardian()) as TransformNode;
      const children = node.getChildMeshes();
      const eye = children.find(mesh => mesh.name === "h");

      expect(node.metadata).toEqual({ awake: false });
      expect(children.map(mesh => mesh.name)).toEqual(["b", "h", "p", "p"]);
      expect(eye?.position.y).toBeCloseTo(0.34);
      expect(eye?.scaling.y).toBeCloseTo(1);
      expect(eye?.metadata).toBeNull();
      expect((eye?.material as StandardMaterial).name).toBe("guardian-eye");
      expect(node.metadata?.visualImportState).toBeUndefined();
    } finally {
      h.close();
    }
  });

  it("rebuilds the procedural fallback with the existing red awake eye", () => {
    const h = guardianRenderer();
    try {
      const node = (h.renderer as any).buildUnitMesh(
        {} as never,
        guardian({ awake: true }),
      ) as TransformNode;
      const eye = node.getChildMeshes().find(mesh => mesh.name === "h");

      expect(node.metadata).toEqual({ awake: true });
      expect(eye?.position.y).toBeCloseTo(0.34);
      expect(eye?.scaling.y).toBeCloseTo(1);
      expect(eye?.metadata).toBeNull();
      expect((eye?.material as StandardMaterial).name).toBe("guardian-eye-awake");
      expect((eye?.material as StandardMaterial).emissiveColor.toHexString()).toBe(
        "#FF5D4D",
      );
    } finally {
      h.close();
    }
  });
});
