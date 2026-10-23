import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

/**
 * The board renderer provides the material cache and lifecycle root. This
 * module deliberately owns only static, per-tile ruin geometry: no textures,
 * lights, particles, animation, or scene-level state are introduced here.
 */
export interface RuinArchitectureContext {
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

export type RuinShape = "box" | "cylinder" | "relic";

/** A deterministic local-space construction instruction, useful for budgets and tests. */
export interface RuinArchitecturePiece {
  name: string;
  shape: RuinShape;
  /** [x, y-above-tile-top, z] relative to the tile centre. */
  position: readonly [number, number, number];
  /** Box: [width, height, depth]. Cylinder: [bottom diameter, height, top diameter]. */
  dimensions: readonly [number, number, number];
  hex: string;
  lit?: boolean;
  /** Low-sided cylinders and relics preserve the deliberately faceted miniature language. */
  tessellation?: number;
  rotation?: readonly [number, number, number];
}

export interface RuinArchitecturePlan {
  great: boolean;
  /** Half-width of the deliberately vacant ground-space reserved for a unit/guardian. */
  centralClearance: number;
  pieces: readonly RuinArchitecturePiece[];
}

const WEATHERED_DARK = "#4f5959";
const WEATHERED_STONE = "#707a73";
const WEATHERED_LIGHT = "#949b88";
const OLD_GOLD = "#806238";
const AMBER_RELIC = "#b98538";

const box = (
  name: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  hex: string,
  rotation?: readonly [number, number, number],
  lit = true
): RuinArchitecturePiece => ({
  name,
  shape: "box",
  position: [x, y, z],
  dimensions: [width, height, depth],
  hex,
  lit,
  rotation,
});

const column = (
  name: string,
  x: number,
  y: number,
  z: number,
  bottomDiameter: number,
  height: number,
  topDiameter: number,
  hex: string,
  rotation?: readonly [number, number, number]
): RuinArchitecturePiece => ({
  name,
  shape: "cylinder",
  position: [x, y, z],
  dimensions: [bottomDiameter, height, topDiameter],
  hex,
  lit: true,
  tessellation: 5,
  rotation,
});

const relic = (
  name: string,
  x: number,
  y: number,
  z: number,
  radius: number,
  hex = AMBER_RELIC
): RuinArchitecturePiece => ({
  name,
  shape: "relic",
  position: [x, y, z],
  // Radius is repeated so this plan remains serializable and self-contained.
  dimensions: [radius, radius, radius],
  hex,
  lit: false,
  tessellation: 1,
});

/**
 * Standard ruin: a fractured oathgate, not a field of leftover columns. The
 * gate is deliberately pushed to the rear of the tile: the jagged lintel reads
 * as an arch while the empty foreground leaves the guardian/unit legible.
 */
const OATHGATE_PIECES: readonly RuinArchitecturePiece[] = [
  box("ruin-oathgate-sill", 0, 0.035, -0.355, 0.66, 0.07, 0.12, WEATHERED_DARK),
  box(
    "ruin-oathgate-left-foot",
    -0.315,
    0.09,
    -0.295,
    0.19,
    0.11,
    0.18,
    WEATHERED_STONE
  ),
  column(
    "ruin-oathgate-left-pilaster",
    -0.31,
    0.285,
    -0.3,
    0.16,
    0.38,
    0.115,
    WEATHERED_STONE,
    [0.02, 0.15, 0.055]
  ),
  box(
    "ruin-oathgate-left-crown",
    -0.195,
    0.526,
    -0.32,
    0.19,
    0.11,
    0.16,
    WEATHERED_LIGHT,
    [0.05, 0.1, -0.12]
  ),
  box(
    "ruin-oathgate-right-foot",
    0.305,
    0.075,
    -0.31,
    0.16,
    0.1,
    0.16,
    WEATHERED_DARK
  ),
  column(
    "ruin-oathgate-right-break",
    0.302,
    0.2,
    -0.305,
    0.15,
    0.29,
    0.11,
    WEATHERED_STONE,
    [-0.02, -0.17, -0.12]
  ),
  // A low, chipped cap carries the short break into the fallen right lintel.
  // Its overlap is intentional support; the unequal lintels retain the fracture.
  box(
    "ruin-oathgate-right-link-cap",
    0.275,
    0.384,
    -0.305,
    0.17,
    0.145,
    0.15,
    WEATHERED_LIGHT,
    [0.035, -0.14, -0.16]
  ),
  // Two unequal lintel blocks and an off-centre keystone make the dramatic break explicit.
  box(
    "ruin-oathgate-lintel-left",
    -0.135,
    0.535,
    -0.3,
    0.27,
    0.12,
    0.14,
    WEATHERED_LIGHT,
    [0.02, -0.04, -0.13]
  ),
  box(
    "ruin-oathgate-keystone",
    0.025,
    0.595,
    -0.3,
    0.12,
    0.13,
    0.15,
    WEATHERED_STONE,
    [0.02, 0.14, 0.3]
  ),
  box(
    "ruin-oathgate-lintel-right",
    0.18,
    0.48,
    -0.3,
    0.18,
    0.1,
    0.14,
    WEATHERED_DARK,
    [0.01, -0.12, 0.22]
  ),
  // One inset relic, set into the tall pier instead of becoming a second landmark.
  relic("ruin-oathgate-amber-relic", -0.305, 0.42, -0.205, 0.043),
  relic(
    "ruin-oathgate-rubble-left",
    -0.415,
    0.048,
    0.09,
    0.055,
    WEATHERED_DARK
  ),
  relic(
    "ruin-oathgate-rubble-right",
    0.405,
    0.042,
    0.055,
    0.047,
    WEATHERED_STONE
  ),
];

/**
 * Great ruin: a larger weathered conduit. Its fragmented channel rises behind
 * an open centre; narrow old-gold seams describe an ancient power path without
 * repeating the former pair of full-gold spikes.
 */
const CONDUIT_PIECES: readonly RuinArchitecturePiece[] = [
  box(
    "great-ruin-conduit-sill",
    0,
    0.04,
    -0.385,
    0.76,
    0.08,
    0.12,
    WEATHERED_DARK
  ),
  box(
    "great-ruin-left-foot",
    -0.355,
    0.1,
    -0.315,
    0.21,
    0.14,
    0.2,
    WEATHERED_STONE
  ),
  column(
    "great-ruin-left-conduit-pier",
    -0.34,
    0.36,
    -0.32,
    0.19,
    0.55,
    0.13,
    WEATHERED_STONE,
    [0.01, 0.17, 0.045]
  ),
  box(
    "great-ruin-left-shoulder",
    -0.185,
    0.707,
    -0.32,
    0.18,
    0.23,
    0.17,
    WEATHERED_LIGHT,
    [0.01, -0.08, -0.43]
  ),
  box(
    "great-ruin-right-foot",
    0.355,
    0.09,
    -0.32,
    0.2,
    0.12,
    0.18,
    WEATHERED_DARK
  ),
  column(
    "great-ruin-right-break",
    0.34,
    0.275,
    -0.32,
    0.18,
    0.4,
    0.125,
    WEATHERED_STONE,
    [-0.01, -0.2, -0.1]
  ),
  box(
    "great-ruin-right-shoulder",
    0.225,
    0.54,
    -0.32,
    0.16,
    0.19,
    0.16,
    WEATHERED_DARK,
    [0.02, 0.07, 0.48]
  ),
  box(
    "great-ruin-conduit-crown",
    -0.055,
    0.78,
    -0.32,
    0.34,
    0.15,
    0.18,
    WEATHERED_LIGHT,
    [0.03, -0.1, -0.1]
  ),
  box(
    "great-ruin-crown-fracture",
    0.18,
    0.72,
    -0.32,
    0.13,
    0.11,
    0.17,
    WEATHERED_STONE,
    [-0.02, 0.12, 0.29]
  ),
  // Three small inlays read as a circuit. None is a tall spike or a separate monument.
  box(
    "great-ruin-gold-inlay-left",
    -0.282,
    0.48,
    -0.218,
    0.037,
    0.19,
    0.022,
    OLD_GOLD,
    [0.01, 0.17, 0.06],
    false
  ),
  // Kept on the rear crown face so the inlay does not clip the unit square.
  box(
    "great-ruin-gold-inlay-crown",
    -0.055,
    0.79,
    -0.245,
    0.18,
    0.034,
    0.022,
    OLD_GOLD,
    [0.03, -0.1, -0.1],
    false
  ),
  box(
    "great-ruin-gold-inlay-break",
    0.202,
    0.64,
    -0.218,
    0.033,
    0.105,
    0.022,
    OLD_GOLD,
    [-0.02, 0.12, 0.29],
    false
  ),
  relic("great-ruin-amber-socket", -0.34, 0.44, -0.205, 0.052),
  relic(
    "great-ruin-weathered-rubble",
    0.415,
    0.045,
    0.095,
    0.053,
    WEATHERED_DARK
  ),
];

/** A pure plan makes the silhouette, clearance and mesh budget deterministic. */
export function ruinArchitecturePlan(great: boolean): RuinArchitecturePlan {
  return {
    great,
    centralClearance: 0.2,
    // The normal camera looks from negative Z. Rotate the authored monument
    // to positive Z so its tall lintel is behind, not in front of, the actor.
    pieces: (great ? CONDUIT_PIECES : OATHGATE_PIECES).map(piece => ({
      ...piece,
      position: [-piece.position[0], piece.position[1], -piece.position[2]],
      rotation: [
        piece.rotation?.[0] ?? 0,
        (piece.rotation?.[1] ?? 0) + Math.PI,
        piece.rotation?.[2] ?? 0,
      ],
    })),
  };
}

/**
 * Creates only static Babylon meshes. The caller's material functions own the
 * shared cache; parenting keeps standard renderer rebuild/disposal semantics.
 */
export function buildRuinArchitecture(
  context: RuinArchitectureContext,
  options: { great: boolean }
): Mesh[] {
  const plan = ruinArchitecturePlan(options.great);
  const metadata = { tile: true, x: context.tileX, y: context.tileY };

  return plan.pieces.map(piece => {
    const [x, y, z] = piece.position;
    let mesh: Mesh;
    if (piece.shape === "box") {
      const [width, height, depth] = piece.dimensions;
      mesh = MeshBuilder.CreateBox(
        piece.name,
        { width, height, depth },
        context.scene
      );
    } else if (piece.shape === "cylinder") {
      const [diameterBottom, height, diameterTop] = piece.dimensions;
      mesh = MeshBuilder.CreateCylinder(
        piece.name,
        {
          diameterTop,
          diameterBottom,
          height,
          tessellation: piece.tessellation ?? 5,
        },
        context.scene
      );
    } else {
      mesh = MeshBuilder.CreateIcoSphere(
        piece.name,
        { radius: piece.dimensions[0], subdivisions: piece.tessellation ?? 1 },
        context.scene
      );
    }

    mesh.position.set(context.worldX + x, context.top + y, context.worldZ + z);
    if (piece.rotation) mesh.rotation.set(...piece.rotation);
    mesh.material = (piece.lit ? context.litMat : context.mat)(piece.hex);
    mesh.metadata = metadata;
    mesh.parent = context.parent;
    context.facet(mesh);
    return mesh;
  });
}
