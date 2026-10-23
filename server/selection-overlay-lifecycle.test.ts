import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { TECHS } from "../client/src/game/core/types";
import { BoardRenderer } from "../client/src/game/render/scene";
import { createVisualReviewState } from "../client/src/game/render/visualReviewFixture";

// A canvas contract stub for bookkeeping under NullEngine; not visual/GPU evidence.
class BookkeepingCanvas {
  constructor(
    public width: number,
    public height: number
  ) {}
  getContext() {
    return {
      clearRect() {},
      fillRect() {},
      arc() {},
      beginPath() {},
      closePath() {},
      fill() {},
      lineTo() {},
      moveTo() {},
      stroke() {},
      fillText() {},
      save() {},
      restore() {},
      measureText() {
        return { width: 100 };
      },
      fillStyle: "",
      strokeStyle: "",
      lineCap: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
    };
  }
}
afterEach(() => vi.unstubAllGlobals());

function harness(preferences: { newVisuals: boolean; landscape: boolean }) {
  vi.stubGlobal("OffscreenCanvas", BookkeepingCanvas);
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const renderer = Object.create(BoardRenderer.prototype) as BoardRenderer;
  Object.assign(renderer, {
    scene,
    root: new TransformNode("test-root", scene),
    highlightMeshes: [],
    highlightMaterials: new Set(),
    plannerLabelTextures: new Set(),
    sigilTextures: new Map(),
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

const modes = [
  { newVisuals: false, landscape: false },
  { newVisuals: true, landscape: false },
  { newVisuals: false, landscape: true },
  { newVisuals: true, landscape: true },
];

describe("actual Babylon selection/planner overlay ownership", () => {
  it.each(modes)(
    "plateaus after 100 selection rebuild/cleanup cycles: %o",
    mode => {
      const h = harness(mode);
      const state = createVisualReviewState(0);
      const sharedTexture = new DynamicTexture(
        "shared-test",
        8,
        h.scene,
        false
      );
      const sharedMaterial = new StandardMaterial("shared-test", h.scene);
      sharedMaterial.diffuseTexture = sharedTexture;
      try {
        state.selectedUnitId = state.units[0].id;
        h.renderer.showHighlights(state);
        const sigil = h.scene.meshes.find(mesh => mesh.name === "sigil")!;
        expect(sigil.material!.alpha).toBe(
          mode.newVisuals || mode.landscape ? 0.55 : 1
        );
        state.selectedUnitId = null;
        h.renderer.showHighlights(state);
        const textureBaseline = h.scene.textures.map(
          texture => texture.uniqueId
        );
        const materialBaseline = h.scene.materials.map(
          material => material.uniqueId
        );
        for (let cycle = 0; cycle < 100; cycle++) {
          state.selectedUnitId = state.units[0].id;
          h.renderer.showHighlights(state);
          state.selectedUnitId = null;
          h.renderer.showHighlights(state);
          expect(h.scene.meshes).toHaveLength(0);
          expect(h.scene.materials.map(material => material.uniqueId)).toEqual(
            materialBaseline
          );
          expect(h.scene.materials.includes(sharedMaterial)).toBe(true);
          expect(h.scene.textures.map(texture => texture.uniqueId)).toEqual(
            textureBaseline
          );
        }
        expect(sharedMaterial.diffuseTexture).toBe(sharedTexture);
      } finally {
        h.close();
      }
    }
  );

  it.each(modes)(
    "disposes planner-label textures after 100 open/close cycles: %o",
    mode => {
      const h = harness(mode);
      const state = createVisualReviewState(0, 6104, "continents");
      // Standalone engineering fixture explicitly exercises unlocked planner sites.
      // This is not an ordinary-production or legal progression claim.
      state.tribes[0].techs = TECHS.map(tech => tech.id);
      state.units = [];
      const sharedTexture = new DynamicTexture(
        "shared-test",
        8,
        h.scene,
        false
      );
      const sharedMaterial = new StandardMaterial("shared-test", h.scene);
      sharedMaterial.diffuseTexture = sharedTexture;
      try {
        state.plannerOpen = true;
        h.renderer.showHighlights(state);
        state.plannerOpen = false;
        h.renderer.showHighlights(state);
        const materialBaseline = h.scene.materials.map(
          material => material.uniqueId
        );
        const textureBaseline = h.scene.textures.map(
          texture => texture.uniqueId
        );
        for (let cycle = 0; cycle < 100; cycle++) {
          state.plannerOpen = true;
          h.renderer.showHighlights(state);
          expect(
            h.scene.textures.some(texture => texture.name === "plannerlbl")
          ).toBe(true);
          state.plannerOpen = false;
          h.renderer.showHighlights(state);
          expect(h.scene.meshes).toHaveLength(0);
          expect(h.scene.materials.map(material => material.uniqueId)).toEqual(
            materialBaseline
          );
          expect(h.scene.materials.includes(sharedMaterial)).toBe(true);
          expect(h.scene.textures.map(texture => texture.uniqueId)).toEqual(
            textureBaseline
          );
          expect(h.scene.textures.includes(sharedTexture)).toBe(true);
        }
      } finally {
        h.close();
      }
    }
  );
});
