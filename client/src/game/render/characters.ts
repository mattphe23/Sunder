// Stage 2 — procedural character units.
// One shared little-person rig built from primitives, dressed per class and
// per faction. Everything targets the unlit flat-shaded look from Stage 1:
// materials come from the renderer's mat() cache (emissive-only).
//
// Rig anatomy (local units, y-up, unit stands on y=0):
//   base puck (tribe color)      y 0.00..0.05
//   legs (two stubs)             y 0.05..0.14
//   torso (tapered cylinder)     y 0.14..0.40
//   head (sphere, skin tone)     y ~0.48
//   headgear (per faction/class) above head
//   props (weapons/shields) attached at hip/hand height
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import type { UnitType } from "../core/types";
import { darken } from "./palette";

/** material supplier — the renderer passes its unlit mat() cache through */
export type MatFn = (hex: string) => Material;

export interface CharacterSpec {
  scene: Scene;
  mat: MatFn;
  /** flat tribe color (or raider iron) */
  color: string;
  /** TRIBE_DEFS index for costume flavor; -1 for tribeless raiders */
  defIndex: number;
  type: UnitType;
}

// shared neutral tones
const SKIN = "#f2dfc4";
const SKIN_SHADE = "#e3c9a4";
const WOOD = "#8a6642";
const WOOD_DARK = "#6e4f31";
const STEEL = "#cfd2de";
const STEEL_DARK = "#9a9db1";
const BONE = "#e8e2d2";

// per-faction costume flavor: accent color + headgear style.
// defIndex matches TRIBE_DEFS order: Auren, Kharzul, Sunwei, Vessari, Nerivane, Dravok.
interface Costume {
  accent: string;
  headgear: "circlet" | "horns" | "straw" | "hood" | "crest" | "helm" | "wings" | "cap" | "none";
}
const COSTUMES: Costume[] = [
  { accent: "#9fc4ff", headgear: "circlet" }, // Auren — scholars, silver-blue circlet
  { accent: "#ffb3a0", headgear: "horns" },   // Kharzul — forgeborn, horned helm
  { accent: "#ffe08a", headgear: "straw" },   // Sunwei — harvesters, wide straw hat
  { accent: "#d4b3ff", headgear: "hood" },    // Vessari — outriders, riding hood
  { accent: "#a0f0e4", headgear: "crest" },   // Nerivane — tideborn, fin crest
  { accent: "#e0c9a8", headgear: "helm" },    // Dravok — stonebound, stone helm
  { accent: "#bae6fd", headgear: "wings" },   // Valkyra — stormborn, winged helm (premium)
  { accent: "#d9f99d", headgear: "cap" },     // Mycelon — sporebound, mushroom cap (premium)
];
const RAIDER_COSTUME: Costume = { accent: "#8d7a84", headgear: "none" };

/* ---------- tribe skins (store unlocks) ----------
 * A skin restyles a standard tribe's costume: new accent + optional unit color
 * override. Selection lives in localStorage and is applied via setActiveSkins()
 * from the React layer (entitlement-checked there). The rig itself is unchanged.
 */
export interface SkinDef {
  key: string;          // entitlement key, e.g. "skin.auren.gilded"
  name: string;
  tribe: number;        // TRIBE_DEFS index it applies to
  accent: string;       // costume accent replacement
  unitColor?: string;   // optional replacement for the tribe unit color
}
export const SKINS: SkinDef[] = [
  { key: "skin.auren.gilded", name: "Gilded Auren", tribe: 0, accent: "#ffd76e", unitColor: "#c9a227" },
  { key: "skin.kharzul.obsidian", name: "Obsidian Kharzul", tribe: 1, accent: "#ff8c5a", unitColor: "#3b3542" },
  { key: "skin.sunwei.jade", name: "Jade Sunwei", tribe: 2, accent: "#fdf6d8", unitColor: "#2e9e6b" },
  { key: "skin.vessari.midnight", name: "Midnight Vessari", tribe: 3, accent: "#b39ddb", unitColor: "#4c3a8a" },
  { key: "skin.nerivane.abyssal", name: "Abyssal Nerivane", tribe: 4, accent: "#7dd3fc", unitColor: "#155e75" },
  { key: "skin.dravok.molten", name: "Molten Dravok", tribe: 5, accent: "#fca55a", unitColor: "#7c3a2d" },
];

/** active skin per TRIBE_DEFS index (skin key or undefined) — set from React */
let activeSkins: Record<number, string | undefined> = {};
export function setActiveSkins(next: Record<number, string | undefined>) {
  activeSkins = { ...next };
}
export function skinFor(defIndex: number): SkinDef | undefined {
  const key = activeSkins[defIndex];
  return key ? SKINS.find((s) => s.key === key && s.tribe === defIndex) : undefined;
}

function costumeFor(defIndex: number): Costume {
  const base = defIndex >= 0 && defIndex < COSTUMES.length ? COSTUMES[defIndex] : RAIDER_COSTUME;
  const skin = skinFor(defIndex);
  return skin ? { ...base, accent: skin.accent } : base;
}

/* ---------- primitive helpers (all meshes non-pickable, parented) ---------- */

function box(spec: CharacterSpec, name: string, w: number, h: number, d: number, hex: string, parent: TransformNode, x = 0, y = 0, z = 0): Mesh {
  const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, spec.scene);
  m.position.set(x, y, z);
  m.material = spec.mat(hex);
  m.parent = parent;
  m.isPickable = false;
  return m;
}

function cyl(spec: CharacterSpec, name: string, dTop: number, dBottom: number, h: number, tess: number, hex: string, parent: TransformNode, x = 0, y = 0, z = 0): Mesh {
  const m = MeshBuilder.CreateCylinder(name, { diameterTop: dTop, diameterBottom: dBottom, height: h, tessellation: tess }, spec.scene);
  m.position.set(x, y, z);
  m.material = spec.mat(hex);
  m.parent = parent;
  m.isPickable = false;
  return m;
}

function ball(spec: CharacterSpec, name: string, r: number, hex: string, parent: TransformNode, x = 0, y = 0, z = 0): Mesh {
  const m = MeshBuilder.CreateIcoSphere(name, { radius: r, subdivisions: 1 }, spec.scene);
  m.position.set(x, y, z);
  m.material = spec.mat(hex);
  m.parent = parent;
  m.isPickable = false;
  return m;
}

/* ---------- the shared rig ---------- */

interface RigOptions {
  /** torso height scale (bulky classes go wider/taller) */
  bulk?: number;
  /** skip legs (robed classes get a skirt instead) */
  robe?: boolean;
  /** override torso color (default tribe color) */
  torso?: string;
}

/** builds base puck + legs/robe + torso + head; returns the node and key heights */
function buildRig(spec: CharacterSpec, parent: TransformNode, opts: RigOptions = {}) {
  const bulk = opts.bulk ?? 1;
  const torsoHex = opts.torso ?? spec.color;

  // tribe-colored base puck — ownership reads at a glance, like a board-game piece
  const puck = cyl(spec, "puck", 0.4, 0.44, 0.05, 12, spec.color, parent, 0, 0.025, 0);
  puck.material = spec.mat(darken(spec.color, 0.8));

  if (opts.robe) {
    // robed: skirt cone instead of legs
    cyl(spec, "robe", 0.16 * bulk, 0.3 * bulk, 0.26, 8, darken(torsoHex, 0.78), parent, 0, 0.18, 0);
  } else {
    for (const sx of [-0.06, 0.06]) {
      box(spec, "leg", 0.07, 0.1, 0.08, darken(torsoHex, 0.6), parent, sx * bulk, 0.1, 0);
    }
  }
  // torso — slightly tapered so the silhouette reads "person" not "crate"
  const torsoH = 0.24 * bulk;
  cyl(spec, "torso", 0.19 * bulk, 0.24 * bulk, torsoH, 8, torsoHex, parent, 0, 0.15 + torsoH / 2, 0);
  const shoulderY = 0.15 + torsoH;
  // head
  const headY = shoulderY + 0.09;
  ball(spec, "head", 0.095, SKIN, parent, 0, headY, 0);
  return { shoulderY, headY };
}

/** per-faction headgear above the head */
function buildHeadgear(spec: CharacterSpec, parent: TransformNode, headY: number) {
  const c = costumeFor(spec.defIndex);
  switch (c.headgear) {
    case "circlet":
      cyl(spec, "gear", 0.16, 0.16, 0.025, 10, c.accent, parent, 0, headY + 0.07, 0);
      break;
    case "horns":
      for (const sx of [-0.085, 0.085]) {
        const horn = cyl(spec, "gear", 0, 0.05, 0.12, 4, BONE, parent, sx, headY + 0.08, 0);
        horn.rotation.z = sx > 0 ? -0.5 : 0.5;
      }
      break;
    case "straw":
      cyl(spec, "gear", 0.05, 0.3, 0.06, 10, c.accent, parent, 0, headY + 0.08, 0);
      break;
    case "hood": {
      const hood = cyl(spec, "gear", 0.02, 0.17, 0.14, 6, darken(spec.color, 0.72), parent, 0, headY + 0.06, 0);
      hood.rotation.x = 0.12;
      break;
    }
    case "crest": {
      const fin = cyl(spec, "gear", 0, 0.12, 0.14, 3, c.accent, parent, 0, headY + 0.1, 0.01);
      fin.rotation.x = -0.3;
      break;
    }
    case "helm":
      ball(spec, "gear", 0.105, STEEL_DARK, parent, 0, headY + 0.025, 0).scaling.y = 0.7;
      break;
    case "wings": {
      // Valkyra winged helm: steel dome + two swept accent wings
      ball(spec, "gear", 0.1, STEEL, parent, 0, headY + 0.03, 0).scaling.y = 0.65;
      for (const sx of [-0.1, 0.1]) {
        const wing = cyl(spec, "gear", 0, 0.07, 0.16, 3, c.accent, parent, sx, headY + 0.1, -0.01);
        wing.rotation.z = sx > 0 ? -0.85 : 0.85;
        wing.rotation.x = -0.15;
      }
      break;
    }
    case "cap": {
      // Mycelon mushroom cap: wide dome with pale underside
      const dome = ball(spec, "gear", 0.15, c.accent, parent, 0, headY + 0.075, 0);
      dome.scaling.y = 0.55;
      cyl(spec, "gear", 0.2, 0.2, 0.02, 10, BONE, parent, 0, headY + 0.045, 0);
      break;
    }
    case "none":
      break;
  }
}

/* ---------- class props ---------- */

function spear(spec: CharacterSpec, parent: TransformNode, shoulderY: number) {
  const pole = cyl(spec, "prop", 0.025, 0.025, 0.52, 5, WOOD, parent, 0.15, shoulderY - 0.04, 0);
  pole.rotation.z = -0.08;
  cyl(spec, "prop", 0, 0.05, 0.1, 4, STEEL, parent, 0.17, shoulderY + 0.26, 0);
}

function bow(spec: CharacterSpec, parent: TransformNode, shoulderY: number) {
  const arc = MeshBuilder.CreateTorus("prop", { diameter: 0.3, thickness: 0.022, tessellation: 12 }, spec.scene);
  arc.position.set(0.16, shoulderY - 0.02, 0);
  arc.rotation.y = Math.PI / 2;
  arc.scaling.x = 0.55; // flatten torus into a bow arc
  arc.material = spec.mat(WOOD_DARK);
  arc.parent = parent;
  arc.isPickable = false;
  // quiver on the back
  const q = cyl(spec, "prop", 0.06, 0.06, 0.18, 6, WOOD, parent, -0.05, shoulderY - 0.02, -0.13);
  q.rotation.x = 0.25;
}

function shield(spec: CharacterSpec, parent: TransformNode, shoulderY: number, big = false) {
  const c = costumeFor(spec.defIndex);
  const w = big ? 0.3 : 0.22;
  const h = big ? 0.32 : 0.24;
  box(spec, "prop", w, h, 0.035, STEEL_DARK, parent, big ? 0 : -0.16, shoulderY - 0.1, big ? 0.16 : 0.05);
  box(spec, "prop", w * 0.5, h * 0.5, 0.045, c.accent, parent, big ? 0 : -0.16, shoulderY - 0.1, big ? 0.165 : 0.055);
}

function sword(spec: CharacterSpec, parent: TransformNode, shoulderY: number) {
  const blade = box(spec, "prop", 0.035, 0.3, 0.06, STEEL, parent, 0.16, shoulderY + 0.08, 0);
  blade.rotation.z = -0.15;
  box(spec, "prop", 0.1, 0.03, 0.07, WOOD_DARK, parent, 0.155, shoulderY - 0.06, 0);
}

function axes(spec: CharacterSpec, parent: TransformNode, shoulderY: number) {
  for (const sx of [-0.17, 0.17]) {
    const handle = cyl(spec, "prop", 0.025, 0.025, 0.26, 5, WOOD_DARK, parent, sx, shoulderY, 0);
    handle.rotation.z = sx > 0 ? -0.35 : 0.35;
    const blade = cyl(spec, "prop", 0, 0.11, 0.09, 4, STEEL, parent, sx * 1.35, shoulderY + 0.12, 0);
    blade.rotation.z = sx > 0 ? -0.35 : 0.35;
  }
}

function orb(spec: CharacterSpec, parent: TransformNode, shoulderY: number, matOverride?: Material) {
  const o = ball(spec, "orb", 0.06, "#9fe4ff", parent, 0.16, shoulderY + 0.14, 0);
  if (matOverride) o.material = matOverride;
  return o;
}

function trident(spec: CharacterSpec, parent: TransformNode, shoulderY: number) {
  cyl(spec, "prop", 0.025, 0.025, 0.5, 5, BONE, parent, 0.15, shoulderY, 0);
  for (const sx of [-0.035, 0, 0.035]) {
    cyl(spec, "prop", 0, 0.025, 0.09, 4, STEEL, parent, 0.15 + sx, shoulderY + 0.28, 0);
  }
}

function hammer(spec: CharacterSpec, parent: TransformNode, shoulderY: number) {
  const handle = cyl(spec, "prop", 0.03, 0.03, 0.3, 5, WOOD, parent, 0.17, shoulderY, 0);
  handle.rotation.z = -0.2;
  box(spec, "prop", 0.14, 0.09, 0.09, STEEL_DARK, parent, 0.2, shoulderY + 0.16, 0);
}

function mount(spec: CharacterSpec, parent: TransformNode): number {
  // stylized mount: capsule body + head + four leg stubs; rider sits higher
  const bodyHex = darken(spec.color, 0.75);
  const body = MeshBuilder.CreateCapsule("mount", { radius: 0.11, height: 0.42, orientation: Vector3.Forward() }, spec.scene);
  body.position.set(0, 0.16, 0);
  body.material = spec.mat(bodyHex);
  body.parent = parent;
  body.isPickable = false;
  ball(spec, "mount", 0.075, bodyHex, parent, 0, 0.26, 0.2);
  for (const [lx, lz] of [[-0.07, 0.12], [0.07, 0.12], [-0.07, -0.12], [0.07, -0.12]]) {
    box(spec, "mount", 0.05, 0.12, 0.05, darken(bodyHex, 0.7), parent, lx, 0.06, lz);
  }
  return 0.24; // rider seat height offset
}

/* ---------- public entry: build a full character ---------- */

/**
 * Builds the character meshes for a unit into `node`.
 * Returns extra info the renderer needs (e.g. the arcanist orb mesh for its
 * bob animation, hero shoulder height for crown placement).
 */
export function buildCharacter(spec: CharacterSpec, node: TransformNode, opts?: { orbMat?: Material; finMat?: Material }): { headY: number; shoulderY: number; orb?: Mesh } {
  const t = spec.type;
  const c = costumeFor(spec.defIndex);

  // ----- non-humanoid: catapult keeps its siege-engine build (tribe-colored frame)
  if (t === "catapult") {
    const frame = box(spec, "b", 0.4, 0.12, 0.3, spec.color, node, 0, 0.1, 0);
    frame.isPickable = false;
    const arm = box(spec, "prop", 0.06, 0.06, 0.42, WOOD, node, 0, 0.28, -0.05);
    arm.rotation.x = -Math.PI / 5;
    ball(spec, "prop", 0.08, STEEL_DARK, node, 0, 0.42, -0.22);
    for (const sx of [-0.17, 0.17]) {
      const wheel = cyl(spec, "prop", 0.14, 0.14, 0.05, 8, WOOD_DARK, node, sx, 0.07, 0.08);
      wheel.rotation.z = Math.PI / 2;
    }
    // small tribe-colored base puck so ownership still reads
    cyl(spec, "puck", 0.4, 0.44, 0.05, 12, darken(spec.color, 0.8), node, 0, 0.025, 0);
    return { headY: 0.3, shoulderY: 0.2 };
  }

  // ----- mounted classes: rider/knight/raider sit on a mount
  if (t === "rider" || t === "knight" || t === "raider") {
    const seat = mount(spec, node);
    const riderRoot = new TransformNode("rider", spec.scene);
    riderRoot.position.y = seat;
    riderRoot.scaling.setAll(0.82);
    riderRoot.parent = node;
    const rig = buildRig(spec, riderRoot, { bulk: 0.9 });
    buildHeadgear(spec, riderRoot, rig.headY);
    if (t === "knight") {
      spear(spec, riderRoot, rig.shoulderY);
      shield(spec, riderRoot, rig.shoulderY);
    } else if (t === "raider") {
      sword(spec, riderRoot, rig.shoulderY);
      // saddle pennant — Vessari flair
      const flag = box(spec, "prop", 0.02, 0.08, 0.12, c.accent, node, 0, seat + 0.4, -0.18);
      flag.rotation.x = 0.1;
    } else {
      spear(spec, riderRoot, rig.shoulderY);
    }
    // scale-compensated: puck under the mount instead of rig's own
    return { headY: seat + rig.headY * 0.82, shoulderY: seat + rig.shoulderY * 0.82 };
  }

  // ----- humanoid classes on foot
  switch (t) {
    case "warrior": {
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      spear(spec, node, rig.shoulderY);
      return rig;
    }
    case "archer": {
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      bow(spec, node, rig.shoulderY);
      return rig;
    }
    case "defender": {
      const rig = buildRig(spec, node, { bulk: 1.1 });
      buildHeadgear(spec, node, rig.headY);
      shield(spec, node, rig.shoulderY, true);
      return rig;
    }
    case "swordsman": {
      const rig = buildRig(spec, node, { bulk: 1.05 });
      buildHeadgear(spec, node, rig.headY);
      sword(spec, node, rig.shoulderY);
      shield(spec, node, rig.shoulderY);
      return rig;
    }
    case "arcanist": {
      // robed mystic; orb handled by caller (animated)
      const rig = buildRig(spec, node, { robe: true });
      buildHeadgear(spec, node, rig.headY);
      const o = orb(spec, node, rig.shoulderY, opts?.orbMat);
      return { ...rig, orb: o };
    }
    case "berserker": {
      const rig = buildRig(spec, node, { bulk: 1.25 });
      buildHeadgear(spec, node, rig.headY);
      axes(spec, node, rig.shoulderY);
      return rig;
    }
    case "warden": {
      const rig = buildRig(spec, node, { bulk: 1.15, torso: STEEL_DARK });
      // stone peak cap instead of faction headgear — mountain sentinel identity
      cyl(spec, "gear", 0, 0.16, 0.12, 6, "#8f8fa3", node, 0, rig.headY + 0.08, 0);
      hammer(spec, node, rig.shoulderY);
      return rig;
    }
    case "tidecaller": {
      const rig = buildRig(spec, node, { robe: true });
      // glowing fin crest (material supplied by renderer for bloom)
      const fin = cyl(spec, "fin", 0, 0.14, 0.16, 3, c.accent, node, 0, rig.headY + 0.1, 0.01);
      fin.rotation.x = -0.3;
      if (opts?.finMat) fin.material = opts.finMat;
      trident(spec, node, rig.shoulderY);
      return rig;
    }
    case "bulwark": {
      const rig = buildRig(spec, node, { bulk: 1.2, torso: darken(spec.color, 0.85) });
      buildHeadgear(spec, node, rig.headY);
      // broad stone slab shield held forward
      box(spec, "prop", 0.42, 0.34, 0.06, "#8a8177", node, 0, rig.shoulderY - 0.08, 0.18);
      for (const sx of [-0.17, 0.17]) {
        box(spec, "prop", 0.08, 0.09, 0.06, "#8a8177", node, sx, rig.shoulderY + 0.14, 0.18);
      }
      return rig;
    }
    case "hero": {
      // regal: caped rig + banner spear; crown/pips handled by the renderer
      const rig = buildRig(spec, node, { bulk: 1.05 });
      // cape: flattened cone behind the torso
      const cape = cyl(spec, "prop", 0.1, 0.3, 0.3, 6, darken(spec.color, 0.7), node, 0, 0.26, -0.09);
      cape.scaling.z = 0.45;
      buildHeadgear(spec, node, rig.headY);
      // banner spear with tribe pennant
      cyl(spec, "prop", 0.03, 0.03, 0.6, 5, "#d9cfc0", node, 0.18, rig.shoulderY, 0);
      box(spec, "flag", 0.02, 0.12, 0.18, spec.color, node, 0.18, rig.shoulderY + 0.22, 0.1);
      return rig;
    }
    default: {
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      return rig;
    }
  }
}
