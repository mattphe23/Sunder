import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import {
  buildRuinArchitecture,
  ruinArchitecturePlan,
  type RuinArchitectureContext,
} from "../client/src/game/render/ruinArchitecture";

function harness() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const parent = new TransformNode("ruin-test-root", scene);
  const materials = new Map<string, StandardMaterial>();
  let facetCalls = 0;
  const cached = (kind: "flat" | "lit", hex: string) => {
    const key = `${kind}:${hex}`;
    let material = materials.get(key);
    if (!material) {
      material = new StandardMaterial(key, scene);
      materials.set(key, material);
    }
    return material;
  };
  const context: RuinArchitectureContext = {
    scene,
    parent,
    worldX: 7.25,
    worldZ: -3.5,
    top: 0.11,
    tileX: 8,
    tileY: 3,
    mat: hex => cached("flat", hex),
    litMat: hex => cached("lit", hex),
    facet: mesh => {
      facetCalls++;
      mesh.removeVerticesData("normal");
    },
  };
  return {
    engine,
    scene,
    parent,
    context,
    materials,
    facetCalls: () => facetCalls,
    close() {
      scene.dispose();
      engine.dispose();
    },
  };
}

function planExtents(great: boolean) {
  const plan = ruinArchitecturePlan(great);
  return plan.pieces.map(piece => {
    const [x, , z] = piece.position;
    const [a, , c] = piece.dimensions;
    // The cylinder and relic diameters/radii are both conservatively bounded
    // by the first dimension; this plan check complements real mesh bounds.
    const radius =
      piece.shape === "box" ? 0 : piece.shape === "relic" ? a : a / 2;
    return {
      x: piece.shape === "box" ? Math.abs(x) + a / 2 : Math.abs(x) + radius,
      z: piece.shape === "box" ? Math.abs(z) + c / 2 : Math.abs(z) + radius,
    };
  });
}

describe("ruin architecture plan", () => {
  it("is deterministic and distinguishes the oathgate from the larger conduit by silhouette as well as budget", () => {
    const standard = ruinArchitecturePlan(false);
    const great = ruinArchitecturePlan(true);
    expect(standard).toEqual(ruinArchitecturePlan(false));
    expect(great).toEqual(ruinArchitecturePlan(true));
    expect(standard.great).toBe(false);
    expect(great.great).toBe(true);
    expect(standard.centralClearance).toBeGreaterThanOrEqual(0.2);
    expect(great.centralClearance).toBeGreaterThanOrEqual(0.2);
    expect(standard.pieces.some(piece => piece.name.includes("oathgate"))).toBe(
      true
    );
    expect(great.pieces.some(piece => piece.name.includes("conduit"))).toBe(
      true
    );
    expect(great.pieces.length).toBeGreaterThan(standard.pieces.length);
    expect(
      great.pieces.filter(piece => piece.name.includes("gold-inlay"))
    ).toHaveLength(3);
    expect(
      great.pieces
        .filter(piece => piece.hex === "#806238")
        .every(piece => piece.shape === "box")
    ).toBe(true);
  });
  it.each([false, true])(
    "keeps the %s monument crown behind the normal-camera garrison",
    great => {
      const crown = ruinArchitecturePlan(great).pieces.filter(
        piece =>
          piece.name.includes("crown") ||
          piece.name.includes("keystone") ||
          piece.name.includes("lintel")
      );
      expect(crown.length).toBeGreaterThan(0);
      expect(crown.every(piece => piece.position[2] >= 0.2)).toBe(true);
    }
  );

  it.each([false, true])(
    "keeps the pure %s plan within a tile and away from the central guardian region",
    great => {
      const plan = ruinArchitecturePlan(great);
      for (const extent of planExtents(great)) {
        expect(extent.x).toBeLessThanOrEqual(0.47);
        expect(extent.z).toBeLessThanOrEqual(0.47);
      }
      // Every permanent architectural piece is either behind the unit space or
      // genuinely peripheral; the open centre is not merely a declared value.
      for (const piece of plan.pieces) {
        const [x, , z] = piece.position;
        expect(
          Math.abs(x) < plan.centralClearance &&
            Math.abs(z) < plan.centralClearance
        ).toBe(false);
      }
    }
  );
});

describe("actual Babylon ruin architecture", () => {
  it.each([false, true])(
    "builds bounded, parented, pick-compatible %s ruin meshes using shared materials",
    great => {
      const h = harness();
      try {
        const pieces = buildRuinArchitecture(h.context, { great });
        const plan = ruinArchitecturePlan(great);
        expect(pieces).toHaveLength(plan.pieces.length);
        expect(h.facetCalls()).toBe(pieces.length);
        // The renderer owns the cache. Six material keys are currently enough;
        // the architecture contract permits at most eight families per ruin.
        expect(h.materials.size).toBeLessThanOrEqual(8);
        // Actual generated geometry, not merely the declarative piece count, is
        // kept small enough to remain ordinary per-tile decor on mobile.
        const triangleCount = pieces.reduce(
          (total, mesh) => total + mesh.getTotalIndices() / 3,
          0
        );
        expect(triangleCount).toBeLessThanOrEqual(great ? 220 : 200);

        for (const mesh of pieces) {
          expect(mesh.parent).toBe(h.parent);
          expect(mesh.metadata).toEqual({ tile: true, x: 8, y: 3 });
          expect(mesh.isPickable).toBe(true);
          expect(mesh.getVerticesData("normal")).toBeNull();
          mesh.computeWorldMatrix(true);
          const bounds = mesh.getBoundingInfo().boundingBox;
          expect(
            Math.abs(bounds.minimumWorld.x - h.context.worldX)
          ).toBeLessThanOrEqual(0.47 + 0.001);
          expect(
            Math.abs(bounds.maximumWorld.x - h.context.worldX)
          ).toBeLessThanOrEqual(0.47 + 0.001);
          expect(
            Math.abs(bounds.minimumWorld.z - h.context.worldZ)
          ).toBeLessThanOrEqual(0.47 + 0.001);
          expect(
            Math.abs(bounds.maximumWorld.z - h.context.worldZ)
          ).toBeLessThanOrEqual(0.47 + 0.001);
        }

        // No actual mesh intrudes into the ground-level +/-0.20 unit/guardian square.
        const intruding = pieces.filter(mesh => {
          const box = mesh.getBoundingInfo().boundingBox;
          return (
            box.minimumWorld.x < h.context.worldX + 0.2 &&
            box.maximumWorld.x > h.context.worldX - 0.2 &&
            box.minimumWorld.z < h.context.worldZ + 0.2 &&
            box.maximumWorld.z > h.context.worldZ - 0.2
          );
        });
        expect(intruding).toEqual([]);
      } finally {
        h.close();
      }
    }
  );

  it("reuses the caller-owned material cache and disposes with the renderer parent", () => {
    const h = harness();
    try {
      const first = buildRuinArchitecture(h.context, { great: true });
      const materialCount = h.materials.size;
      const second = buildRuinArchitecture(h.context, { great: true });
      expect(h.materials.size).toBe(materialCount);
      expect(h.scene.meshes).toHaveLength(first.length + second.length);
      h.parent.dispose(false, true);
      expect(h.scene.meshes).toHaveLength(0);
    } finally {
      h.close();
    }
  });
});
