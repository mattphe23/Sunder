import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCityArchitecture,
  cityArchitecturePlan,
  type CityArchitectureContext,
  type CityArchitectureOptions,
  type CityPlanPiece,
} from "../client/src/game/render/cityArchitecture";

const cleanup: Array<() => void> = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()?.();
});

const owned: CityArchitectureOptions = {
  level: 3,
  isCapital: false,
  neutral: false,
  walls: false,
  ownerColor: "#6f9dcc",
};

function extent(piece: CityPlanPiece): number {
  return Math.max(
    Math.abs(piece.x) + piece.width / 2,
    Math.abs(piece.z) + piece.depth / 2
  );
}

function hasFootprintInCourt(piece: CityPlanPiece, half: number): boolean {
  const xOverlap = Math.abs(piece.x) - piece.width / 2 < half;
  const zOverlap = Math.abs(piece.z) - piece.depth / 2 < half;
  return xOverlap && zOverlap;
}

function harness() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const parent = new TransformNode("city-test-parent", scene);
  const cache = new Map<string, StandardMaterial>();
  const material = (hex: string, lit: boolean) => {
    const key = `${lit ? "lit" : "mat"}:${hex.toLowerCase()}`;
    let value = cache.get(key);
    if (!value) {
      value = new StandardMaterial(`cached-${key}`, scene);
      const color = Color3.FromHexString(hex);
      value.diffuseColor = lit ? color : Color3.Black();
      value.emissiveColor = lit ? Color3.Black() : color;
      value.disableLighting = !lit;
      cache.set(key, value);
    }
    return value;
  };
  const context: CityArchitectureContext = {
    scene,
    parent,
    worldX: 8.25,
    worldZ: -4.5,
    top: 0.3,
    tileX: 12,
    tileY: 7,
    mat: hex => material(hex, false),
    litMat: hex => material(hex, true),
    facet: mesh => {
      mesh.isPickable = false;
      mesh.convertToFlatShadedMesh();
    },
  };
  cleanup.push(() => {
    scene.dispose();
    engine.dispose();
  });
  return { context, cache };
}

describe("cityArchitecturePlan", () => {
  it("is deterministic, bounded, and retains a genuinely empty central muster square", () => {
    const options = { ...owned, level: 999 };
    const first = cityArchitecturePlan(options);
    expect(first).toEqual(cityArchitecturePlan(options));
    expect(first.level).toBe(5);
    expect(first.pieces).toHaveLength(22);
    expect(first.pieces.length).toBeLessThanOrEqual(first.meshBudget);
    for (const spec of first.pieces) {
      expect(extent(spec)).toBeLessThanOrEqual(first.footprintLimit);
    }
    const structural = first.pieces.filter(
      part =>
        !part.role.startsWith("court-") &&
        part.role !== "open-muster-courtyard" &&
        part.role !== "settlement-foundation"
    );
    for (const part of structural) {
      expect(hasFootprintInCourt(part, first.courtyardHalfExtent)).toBe(false);
    }
    const ordinaryRoofs = first.pieces.filter(
      part => part.kind === "roof" && !part.role.startsWith("civic-beacon")
    );
    for (const roof of ordinaryRoofs) {
      expect(roof.y + roof.height / 2).toBeLessThanOrEqual(first.roofTopLimit);
    }
  });

  it("makes growth bounded and distinguishes village, city, capital beacon, and defensive walls", () => {
    const low = cityArchitecturePlan({ ...owned, level: -10 });
    const high = cityArchitecturePlan({ ...owned, level: 500 });
    const village = cityArchitecturePlan({
      ...owned,
      level: 5,
      neutral: true,
      walls: true,
      isCapital: true,
    });
    const capital = cityArchitecturePlan({
      ...owned,
      level: 3,
      isCapital: true,
    });
    const walled = cityArchitecturePlan({ ...owned, level: 3, walls: true });

    expect(low.level).toBe(1);
    expect(high.level).toBe(5);
    expect(high.pieces.length).toBeGreaterThan(low.pieces.length);
    expect(high.pieces.length).toBeLessThanOrEqual(high.meshBudget);
    expect(village.neutral).toBe(true);
    expect(village.walls).toBe(false);
    expect(village.isCapital).toBe(false);
    expect(
      village.pieces.some(piece => piece.role.startsWith("village-"))
    ).toBe(true);
    expect(village.pieces.some(piece => piece.role.startsWith("wall-"))).toBe(
      false
    );
    expect(
      capital.pieces.some(
        piece =>
          piece.role === "civic-beacon-light" && piece.x !== 0 && piece.z !== 0
      )
    ).toBe(true);
    expect(
      walled.pieces.filter(piece => piece.role.startsWith("wall-")).length
    ).toBe(13);
    expect(walled.pieces.length).toBeGreaterThan(
      cityArchitecturePlan({ ...owned, level: 3 }).pieces.length
    );
  });
  it("distinguishes a starting capital from an ordinary level-one town", () => {
    const town = cityArchitecturePlan({ ...owned, level: 1 });
    const capital = cityArchitecturePlan({
      ...owned,
      level: 1,
      isCapital: true,
    });
    expect(
      town.pieces.some(piece => piece.role.startsWith("civic-beacon"))
    ).toBe(false);
    expect(
      capital.pieces.some(piece => piece.role === "civic-beacon-light")
    ).toBe(true);
    expect(capital.pieces.length).toBeLessThanOrEqual(capital.meshBudget);
    for (const piece of capital.pieces.filter(piece =>
      piece.role.startsWith("civic-beacon")
    )) {
      expect(hasFootprintInCourt(piece, capital.courtyardHalfExtent)).toBe(
        false
      );
      expect(extent(piece)).toBeLessThanOrEqual(capital.footprintLimit);
    }
  });
});

describe("buildCityArchitecture", () => {
  it("builds parented tile meshes inside the plan bounds with renderer-cached materials", () => {
    const { context, cache } = harness();
    const options = { ...owned, level: 5, isCapital: true, walls: true };
    const plan = cityArchitecturePlan(options);
    const meshes = buildCityArchitecture(context, options);

    expect(meshes).toHaveLength(plan.pieces.length);
    expect(meshes.length).toBeLessThanOrEqual(plan.meshBudget);
    expect(cache.size).toBeLessThanOrEqual(7);
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      expect(mesh.parent).toBe(context.parent);
      expect(mesh.metadata).toEqual({
        tile: true,
        x: context.tileX,
        y: context.tileY,
      });
      expect(mesh.isPickable).toBe(false);
      expect(mesh.material).toBeInstanceOf(StandardMaterial);
      expect(
        Math.max(
          Math.abs(box.minimumWorld.x - context.worldX),
          Math.abs(box.maximumWorld.x - context.worldX)
        )
      ).toBeLessThanOrEqual(plan.footprintLimit + 0.001);
      expect(
        Math.max(
          Math.abs(box.minimumWorld.z - context.worldZ),
          Math.abs(box.maximumWorld.z - context.worldZ)
        )
      ).toBeLessThanOrEqual(plan.footprintLimit + 0.001);
    }
  });

  it("uses caller-owned shared materials and disposing one city's meshes leaves the cache and sibling city intact", () => {
    const { context, cache } = harness();
    const first = buildCityArchitecture(context, {
      ...owned,
      level: 3,
      walls: true,
    });
    const materials = new Set(first.map(mesh => mesh.material));
    const cacheBeforeSecond = cache.size;
    const secondParent = new TransformNode("second-city-parent", context.scene);
    const second = buildCityArchitecture(
      { ...context, parent: secondParent, worldX: -2, worldZ: 3 },
      { ...owned, level: 3, walls: true }
    );

    expect(cache.size).toBe(cacheBeforeSecond);
    expect(second.some(mesh => materials.has(mesh.material))).toBe(true);
    first.forEach(mesh => mesh.dispose());
    // The caller's cache owns materials. Mesh disposal must not evict or dispose
    // shared instances still used by the sibling settlement.
    for (const material of materials)
      expect(
        context.scene.materials.includes(material as StandardMaterial)
      ).toBe(true);
    expect(second.every(mesh => !mesh.isDisposed())).toBe(true);
    expect(second.every(mesh => mesh.parent === secondParent)).toBe(true);
  });
});
