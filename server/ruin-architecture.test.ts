import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
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

type Triangle = readonly [Vector3, Vector3, Vector3];

function worldTriangles(mesh: Mesh): Triangle[] {
  mesh.computeWorldMatrix(true);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) throw new Error(`Missing positions for ${mesh.name}`);
  const indices = mesh.getIndices();
  if (!indices) throw new Error(`Missing indices for ${mesh.name}`);
  const world = mesh.getWorldMatrix();
  const vertices: Vector3[] = [];
  for (let index = 0; index < positions.length; index += 3) {
    vertices.push(
      Vector3.TransformCoordinates(
        new Vector3(positions[index], positions[index + 1], positions[index + 2]),
        world
      )
    );
  }
  const triangles: Triangle[] = [];
  for (let index = 0; index < indices.length; index += 3) {
    triangles.push([
      vertices[indices[index]]!,
      vertices[indices[index + 1]]!,
      vertices[indices[index + 2]]!,
    ]);
  }
  return triangles;
}

/**
 * Closest point on a triangle, from Real-Time Collision Detection. Testing
 * faces rather than AABBs or vertices is necessary for tilted stone blocks:
 * their bounds may overlap and their vertices may be near without either face
 * actually bearing on the other.
 */
function pointTriangleDistance(
  point: Vector3,
  a: Vector3,
  b: Vector3,
  c: Vector3
): number {
  const ab = b.subtract(a);
  const ac = c.subtract(a);
  const ap = point.subtract(a);
  const dotAbAp = Vector3.Dot(ab, ap);
  const dotAcAp = Vector3.Dot(ac, ap);
  if (dotAbAp <= 0 && dotAcAp <= 0) return ap.length();

  const bp = point.subtract(b);
  const dotAbBp = Vector3.Dot(ab, bp);
  const dotAcBp = Vector3.Dot(ac, bp);
  if (dotAbBp >= 0 && dotAcBp <= dotAbBp) return bp.length();

  const edgeAbRegion = dotAbAp * dotAcBp - dotAbBp * dotAcAp;
  if (edgeAbRegion <= 0 && dotAbAp >= 0 && dotAbBp <= 0) {
    return point
      .subtract(a.add(ab.scale(dotAbAp / (dotAbAp - dotAbBp))))
      .length();
  }

  const cp = point.subtract(c);
  const dotAbCp = Vector3.Dot(ab, cp);
  const dotAcCp = Vector3.Dot(ac, cp);
  if (dotAcCp >= 0 && dotAbCp <= dotAcCp) return cp.length();

  const edgeAcRegion = dotAbCp * dotAcAp - dotAbAp * dotAcCp;
  if (edgeAcRegion <= 0 && dotAcAp >= 0 && dotAcCp <= 0) {
    return point
      .subtract(a.add(ac.scale(dotAcAp / (dotAcAp - dotAcCp))))
      .length();
  }

  const edgeBcRegion = dotAbBp * dotAcCp - dotAbCp * dotAcBp;
  if (edgeBcRegion <= 0 && dotAcBp - dotAbBp >= 0 && dotAbCp - dotAcCp >= 0) {
    const bc = c.subtract(b);
    const ratio =
      (dotAcBp - dotAbBp) /
      (dotAcBp - dotAbBp + dotAbCp - dotAcCp);
    return point.subtract(b.add(bc.scale(ratio))).length();
  }

  const denominator = 1 / (edgeAbRegion + edgeAcRegion + edgeBcRegion);
  return point
    .subtract(
      a
        .add(ab.scale(edgeAcRegion * denominator))
        .add(ac.scale(edgeBcRegion * denominator))
    )
    .length();
}

function segmentSegmentDistance(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3
): number {
  const ab = b.subtract(a);
  const cd = d.subtract(c);
  const ac = a.subtract(c);
  const abLengthSquared = Vector3.Dot(ab, ab);
  const abCdDot = Vector3.Dot(ab, cd);
  const cdLengthSquared = Vector3.Dot(cd, cd);
  const abAcDot = Vector3.Dot(ab, ac);
  const cdAcDot = Vector3.Dot(cd, ac);
  const denominator =
    abLengthSquared * cdLengthSquared - abCdDot * abCdDot;
  const epsilon = 1e-12;
  let firstNumerator: number;
  let firstDenominator = denominator;
  let secondNumerator: number;
  let secondDenominator = denominator;

  if (denominator < epsilon) {
    firstNumerator = 0;
    firstDenominator = 1;
    secondNumerator = cdAcDot;
    secondDenominator = cdLengthSquared;
  } else {
    firstNumerator = abCdDot * cdAcDot - cdLengthSquared * abAcDot;
    secondNumerator = abLengthSquared * cdAcDot - abCdDot * abAcDot;
    if (firstNumerator < 0) {
      firstNumerator = 0;
      secondNumerator = cdAcDot;
      secondDenominator = cdLengthSquared;
    } else if (firstNumerator > firstDenominator) {
      firstNumerator = firstDenominator;
      secondNumerator = cdAcDot + abCdDot;
      secondDenominator = cdLengthSquared;
    }
  }

  if (secondNumerator < 0) {
    secondNumerator = 0;
    if (-abAcDot < 0) {
      firstNumerator = 0;
    } else if (-abAcDot > abLengthSquared) {
      firstNumerator = firstDenominator;
    } else {
      firstNumerator = -abAcDot;
      firstDenominator = abLengthSquared;
    }
  } else if (secondNumerator > secondDenominator) {
    secondNumerator = secondDenominator;
    if (-abAcDot + abCdDot < 0) {
      firstNumerator = 0;
    } else if (-abAcDot + abCdDot > abLengthSquared) {
      firstNumerator = firstDenominator;
    } else {
      firstNumerator = -abAcDot + abCdDot;
      firstDenominator = abLengthSquared;
    }
  }

  const firstRatio =
    Math.abs(firstNumerator) < epsilon
      ? 0
      : firstNumerator / firstDenominator;
  const secondRatio =
    Math.abs(secondNumerator) < epsilon
      ? 0
      : secondNumerator / secondDenominator;
  return a
    .add(ab.scale(firstRatio))
    .subtract(c.add(cd.scale(secondRatio)))
    .length();
}

function triangleDistance(first: Triangle, second: Triangle): number {
  let distance = Math.min(
    ...first.map(point => pointTriangleDistance(point, ...second)),
    ...second.map(point => pointTriangleDistance(point, ...first))
  );
  const edges = (triangle: Triangle) =>
    [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]],
    ] as const;
  for (const [firstStart, firstEnd] of edges(first)) {
    for (const [secondStart, secondEnd] of edges(second)) {
      distance = Math.min(
        distance,
        segmentSegmentDistance(firstStart, firstEnd, secondStart, secondEnd)
      );
    }
  }
  return distance;
}

function closestStructuralSurfaceDistance(first: Mesh, second: Mesh): number {
  let distance = Number.POSITIVE_INFINITY;
  for (const firstTriangle of worldTriangles(first)) {
    for (const secondTriangle of worldTriangles(second)) {
      distance = Math.min(distance, triangleDistance(firstTriangle, secondTriangle));
    }
  }
  return distance;
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
    expect(standard.pieces).toHaveLength(13);
    expect(great.pieces).toHaveLength(14);
    expect(
      standard.pieces.find(
        piece => piece.name === "ruin-oathgate-right-link-cap"
      )
    ).toMatchObject({
      shape: "box",
      dimensions: [0.17, 0.145, 0.15],
      hex: "#949b88",
    });
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
        expect(triangleCount).toBe(great ? 200 : 196);
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

  it.each([
    {
      great: false,
      // Only load-bearing stone belongs here: rubble and relics do not get to
      // make a monument look supported. The cap is a load-bearing repair between
      // the short right break and the fallen right lintel; unequal lintels and
      // their off-centre keystone remain the intentional oathgate fracture.
      links: [
        ["ruin-oathgate-left-foot", "ruin-oathgate-left-pilaster"],
        ["ruin-oathgate-left-pilaster", "ruin-oathgate-left-crown"],
        ["ruin-oathgate-left-crown", "ruin-oathgate-lintel-left"],
        ["ruin-oathgate-lintel-left", "ruin-oathgate-keystone"],
        ["ruin-oathgate-right-break", "ruin-oathgate-right-link-cap"],
        ["ruin-oathgate-right-link-cap", "ruin-oathgate-lintel-right"],
      ],
    },
    {
      great: true,
      // The conduit remains broken, but each retained shoulder/crown fragment
      // must visibly bear on its intended pier chain, including the retained
      // right break-to-shoulder contact.
      links: [
        ["great-ruin-left-foot", "great-ruin-left-conduit-pier"],
        ["great-ruin-left-conduit-pier", "great-ruin-left-shoulder"],
        ["great-ruin-left-shoulder", "great-ruin-conduit-crown"],
        ["great-ruin-conduit-crown", "great-ruin-crown-fracture"],
        ["great-ruin-right-shoulder", "great-ruin-right-break"],
        ["great-ruin-right-break", "great-ruin-right-foot"],
      ],
    },
  ])(
    "keeps every %s structural support link physically connected after the authored flip",
    ({ great, links }) => {
      const h = harness();
      try {
        const meshesByName = new Map(
          buildRuinArchitecture(h.context, { great }).map(mesh => [
            mesh.name,
            mesh,
          ])
        );
        for (const [lowerName, upperName] of links) {
          const lower = meshesByName.get(lowerName);
          const upper = meshesByName.get(upperName);
          expect(lower, `${lowerName} exists`).toBeDefined();
          expect(upper, `${upperName} exists`).toBeDefined();
          expect(
            closestStructuralSurfaceDistance(lower!, upper!),
            `${lowerName} bears on ${upperName}`
          ).toBeLessThanOrEqual(0.005);
        }
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
