import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

/**
 * The renderer owns the material cache and the tile batching/fog lifecycle.
 * This module deliberately owns only the short-lived meshes it returns.
 */
export interface CityArchitectureContext {
  scene: Scene;
  parent: TransformNode;
  worldX: number;
  worldZ: number;
  top: number;
  tileX: number;
  tileY: number;
  mat(hex: string): StandardMaterial;
  litMat(hex: string): StandardMaterial;
  facet(mesh: Mesh): void;
}

export interface CityArchitectureOptions {
  level: number;
  isCapital: boolean;
  neutral: boolean;
  walls: boolean;
  ownerColor: string;
}

type CityPartKind = "box" | "roof" | "tower" | "beacon";
export type CityMaterialFamily =
  "foundation" | "courtyard" | "stone" | "slate" | "bronze" | "accent" | "wall";

export interface CityPlanPiece {
  /** Semantic role makes the plan suitable for bounded-layout tests and review fixtures. */
  role: string;
  kind: CityPartKind;
  material: CityMaterialFamily;
  x: number;
  z: number;
  /** Box dimensions, or cylinder diameters for tower / roof / beacon pieces. */
  width: number;
  depth: number;
  height: number;
  /** Centre height above the tile top. */
  y: number;
  tessellation?: number;
  rotation?: number;
}

export interface CityArchitecturePlan {
  /** Normalized to a deliberate five visual growth rungs, never an unbounded city. */
  level: number;
  neutral: boolean;
  isCapital: boolean;
  walls: boolean;
  /** Structural clearance, not a promise of camera-visible unit readability. */
  courtyardHalfExtent: number;
  /** Maximum local lateral coordinate including each planned piece's footprint. */
  footprintLimit: number;
  /** A hard mesh budget keeps a dense city from becoming a per-tile draw-call problem. */
  meshBudget: number;
  /** Raised architectural roofs stay low; a capital's tiny peripheral beacon is the exception. */
  roofTopLimit: number;
  pieces: readonly CityPlanPiece[];
}

const FOUNDATION = "#9f8970";
const COURTYARD = "#766653";
const WARM_STONE = "#b69b7c";
const SLATE = "#303944";
const BRONZE = "#85684b";
const WALL_STONE = "#766d65";
const NEUTRAL_THATCH = "#70543b";

const FOUNDATION_Y = 0.025;
const BUILDING_BASE = 0.058;
const COURTYARD_HALF = 0.21;
const FOOTPRINT_LIMIT = 0.47;
const MESH_BUDGET = 46;

function boundedLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(5, Math.floor(level)));
}

function piece(
  role: string,
  kind: CityPartKind,
  material: CityMaterialFamily,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  y: number,
  extras: Pick<CityPlanPiece, "tessellation" | "rotation"> = {}
): CityPlanPiece {
  return { role, kind, material, x, z, width, depth, height, y, ...extras };
}

function house(
  role: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  bodyHeight: number,
  roofHeight: number,
  roofMaterial: CityMaterialFamily = "slate"
): CityPlanPiece[] {
  const roofY = BUILDING_BASE + bodyHeight + roofHeight / 2;
  return [
    piece(
      `${role}-masonry`,
      "box",
      "stone",
      x,
      z,
      width,
      depth,
      bodyHeight,
      BUILDING_BASE + bodyHeight / 2
    ),
    // A compact square hip roof. Its diameter is driven by the narrow facade,
    // rather than turning a shallow lodge into a circular disc that reaches
    // across the court or outside its tile after the 45-degree rotation.
    piece(
      `${role}-roof`,
      "roof",
      roofMaterial,
      x,
      z,
      Math.min(width, depth) * 1.05,
      Math.min(width, depth) * 1.05,
      roofHeight,
      roofY,
      { tessellation: 4, rotation: Math.PI / 4 }
    ),
  ];
}

function villagePieces(): CityPlanPiece[] {
  // A neutral village is intentionally a smaller, unclaimed three-roof hamlet.
  return [
    ...house("village-front", 0, -0.325, 0.21, 0.14, 0.105, 0.07, "bronze"),
    ...house("village-left", -0.33, 0.13, 0.135, 0.15, 0.125, 0.075, "bronze"),
    ...house("village-right", 0.33, 0.16, 0.135, 0.15, 0.13, 0.075, "bronze"),
  ];
}

function ownedPieces(level: number, isCapital: boolean): CityPlanPiece[] {
  // The first four masses form a genuine open muster court. Each later rung adds
  // one peripheral wing rather than making the same centre tower taller.
  const pieces = [
    ...house("gate-lodge", 0, -0.33, 0.26, 0.125, 0.11, 0.07),
    ...house("west-workshop", -0.345, -0.035, 0.145, 0.16, 0.15, 0.08),
    ...house("east-workshop", 0.345, 0.075, 0.145, 0.16, 0.155, 0.08),
    ...house("rear-hall", 0, 0.33, 0.29, 0.13, 0.19, 0.09),
  ];
  if (level >= 2 || isCapital) {
    if (isCapital) {
      // Civic beacon is on the outer corner, never above the garrison court.
      pieces.push(
        piece(
          "beacon-plinth",
          "box",
          "bronze",
          -0.335,
          0.295,
          0.145,
          0.145,
          0.055,
          0.085
        ),
        piece(
          "civic-beacon",
          "tower",
          "stone",
          -0.335,
          0.295,
          0.105,
          0.105,
          0.205,
          0.215,
          { tessellation: 6, rotation: Math.PI / 6 }
        ),
        piece(
          "civic-beacon-roof",
          "roof",
          "slate",
          -0.335,
          0.295,
          0.14,
          0.14,
          0.075,
          0.355,
          { tessellation: 6, rotation: Math.PI / 6 }
        ),
        piece(
          "civic-beacon-light",
          "beacon",
          "accent",
          -0.335,
          0.295,
          0.045,
          0.045,
          0.045,
          0.415,
          { tessellation: 4, rotation: Math.PI / 4 }
        )
      );
    } else {
      pieces.push(
        ...house("northwest-wing", -0.325, 0.3, 0.13, 0.14, 0.18, 0.085)
      );
    }
  }
  if (level >= 3)
    pieces.push(
      ...house("northeast-wing", 0.325, 0.3, 0.13, 0.14, 0.18, 0.085)
    );
  if (level >= 4)
    pieces.push(
      ...house("southwest-wing", -0.34, -0.275, 0.13, 0.13, 0.115, 0.07)
    );
  if (level >= 5)
    pieces.push(
      ...house("southeast-wing", 0.34, -0.255, 0.13, 0.13, 0.12, 0.07)
    );
  return pieces;
}

function wallPieces(): CityPlanPiece[] {
  const pieces: CityPlanPiece[] = [
    // Front is deliberately split into gate shoulders: this is a defensive
    // wall silhouette, not the old uninterrupted low perimeter frame.
    piece("wall-back", "box", "wall", 0, 0.415, 0.71, 0.055, 0.125, 0.125),
    piece("wall-west", "box", "wall", -0.415, 0.045, 0.055, 0.68, 0.125, 0.125),
    piece("wall-east", "box", "wall", 0.415, 0.045, 0.055, 0.68, 0.125, 0.125),
    piece(
      "wall-gate-west",
      "box",
      "wall",
      -0.265,
      -0.415,
      0.27,
      0.055,
      0.125,
      0.125
    ),
    piece(
      "wall-gate-east",
      "box",
      "wall",
      0.265,
      -0.415,
      0.27,
      0.055,
      0.125,
      0.125
    ),
  ];
  for (const [name, x, z] of [
    ["wall-tower-nw", -0.4, 0.4],
    ["wall-tower-ne", 0.4, 0.4],
    ["wall-tower-sw", -0.4, -0.4],
    ["wall-tower-se", 0.4, -0.4],
  ] as const) {
    pieces.push(
      piece(name, "tower", "wall", x, z, 0.105, 0.105, 0.205, 0.15, {
        tessellation: 6,
        rotation: Math.PI / 6,
      }),
      piece(`${name}-cap`, "box", "bronze", x, z, 0.125, 0.125, 0.045, 0.275)
    );
  }
  return pieces;
}

/**
 * A pure city layout with no Babylon or material-cache side effects. It is used
 * by tests and is intentionally stable for a fixed option tuple.
 */
export function cityArchitecturePlan(
  options: CityArchitectureOptions
): CityArchitecturePlan {
  const level = options.neutral ? 1 : boundedLevel(options.level);
  const courtTrim: CityMaterialFamily = options.neutral ? "bronze" : "accent";
  const pieces: CityPlanPiece[] = [
    piece(
      "settlement-foundation",
      "box",
      "foundation",
      0,
      0,
      0.88,
      0.88,
      0.05,
      FOUNDATION_Y
    ),
    // This is an inset paving surface; no building plan may occupy the square
    // above it. It gives the garrison a readable muster ground rather than a
    // centrepiece tower, but camera/runtime visibility remains QA's concern.
    piece(
      "open-muster-courtyard",
      "box",
      "courtyard",
      0,
      0,
      0.405,
      0.405,
      0.012,
      0.056
    ),
    // Four low rims define the court without putting a central obstruction in it.
    piece(
      "court-rim-north",
      "box",
      courtTrim,
      0,
      0.225,
      0.46,
      0.025,
      0.026,
      0.071
    ),
    piece(
      "court-rim-south",
      "box",
      courtTrim,
      0,
      -0.225,
      0.46,
      0.025,
      0.026,
      0.071
    ),
    piece(
      "court-rim-west",
      "box",
      courtTrim,
      -0.225,
      0,
      0.025,
      0.46,
      0.026,
      0.071
    ),
    piece(
      "court-rim-east",
      "box",
      courtTrim,
      0.225,
      0,
      0.025,
      0.46,
      0.026,
      0.071
    ),
  ];
  pieces.push(
    ...(options.neutral
      ? villagePieces()
      : ownedPieces(level, options.isCapital))
  );
  if (options.walls && !options.neutral) pieces.push(...wallPieces());
  return {
    level,
    neutral: options.neutral,
    isCapital: options.isCapital && !options.neutral,
    walls: options.walls && !options.neutral,
    courtyardHalfExtent: COURTYARD_HALF,
    footprintLimit: FOOTPRINT_LIMIT,
    meshBudget: MESH_BUDGET,
    roofTopLimit: 0.35,
    pieces,
  };
}

function materialFor(
  context: CityArchitectureContext,
  family: CityMaterialFamily,
  options: CityArchitectureOptions
): StandardMaterial {
  switch (family) {
    case "foundation":
      return context.mat(FOUNDATION);
    case "courtyard":
      return context.mat(COURTYARD);
    case "stone":
      return context.litMat(WARM_STONE);
    case "slate":
      return context.litMat(SLATE);
    case "bronze":
      return context.litMat(BRONZE);
    case "wall":
      return context.litMat(WALL_STONE);
    case "accent":
      return context.litMat(
        options.neutral ? NEUTRAL_THATCH : options.ownerColor
      );
  }
}

/** Build a compact, faceted settlement using only renderer-owned cached materials. */
export function buildCityArchitecture(
  context: CityArchitectureContext,
  options: CityArchitectureOptions
): Mesh[] {
  const plan = cityArchitecturePlan(options);
  const metadata = { tile: true, x: context.tileX, y: context.tileY };
  const meshes: Mesh[] = [];
  for (const spec of plan.pieces) {
    const mesh =
      spec.kind === "box"
        ? MeshBuilder.CreateBox(
            `city-${spec.role}`,
            { width: spec.width, depth: spec.depth, height: spec.height },
            context.scene
          )
        : MeshBuilder.CreateCylinder(
            `city-${spec.role}`,
            {
              diameterTop: spec.kind === "roof" ? 0 : spec.width,
              diameterBottom: spec.width,
              height: spec.height,
              tessellation: spec.tessellation ?? 6,
            },
            context.scene
          );
    mesh.position = new Vector3(
      context.worldX + spec.x,
      context.top + spec.y,
      context.worldZ + spec.z
    );
    if (spec.rotation !== undefined) mesh.rotation.y = spec.rotation;
    mesh.material = materialFor(context, spec.material, options);
    mesh.metadata = metadata;
    mesh.parent = context.parent;
    context.facet(mesh);
    meshes.push(mesh);
  }
  return meshes;
}
