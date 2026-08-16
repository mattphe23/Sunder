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
export interface Costume {
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

/** per-tribe emissive glow color (bloom accent material), TRIBE_DEFS order.
 *  Nerivane keeps the original tide-fin aqua; others get their lineup ember. */
export const TRIBE_GLOW = [
  "#bcd9ff", // Auren — ice blue
  "#ff7a50", // Kharzul — forge ember
  "#ffd98a", // Sunwei — harvest gold
  "#d9b8ff", // Vessari — violet
  "#9ffaef", // Nerivane — tide aqua
  "#f0d9a8", // Dravok — sandstone
  "#cfeaff", // Valkyra — storm ice
  "#d8ff9e", // Mycelon — spore green
] as const;
export function tribeGlow(defIndex: number): string {
  return TRIBE_GLOW[defIndex] ?? "#9ffaef";
}

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

/**
 * Costume for a forged tribe, set from React alongside setActiveSkins().
 *
 * A custom tribe's defIndex is TRIBE_DEFS.length, which falls off the end of
 * COSTUMES — so before this it landed on RAIDER_COSTUME and every forged tribe
 * rendered as a bare-headed bandit in grey, whatever the player had named and
 * coloured it. Headgear is the one costume feature readable at play distance,
 * so having none made the tribe a player built the least distinctive thing on
 * the board.
 */
let customCostume: Costume | null = null;
export function setCustomCostume(next: Costume | null) {
  customCostume = next;
}

/** the index a forged tribe occupies — TRIBE_DEFS.length, past every costume */
const FORGED_INDEX = COSTUMES.length;

function costumeFor(defIndex: number): Costume {
  if (defIndex === FORGED_INDEX && customCostume) return customCostume;
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

/* ---------- v42 locked-spec primitives (designer production standard) ----------
 * The board-model standard allows wedge, box, cone, prism, and low-sided
 * cylinder geometry only — no tori, capsules, or smooth spheres on v42 units.
 * These helpers are shared; the Nerivane set is the first tribe to adopt them.
 */

/** wedge — a box tapered to an edge along its top (triangular prism), the spec's core shape */
function wedge(spec: CharacterSpec, name: string, w: number, h: number, d: number, hex: string, parent: TransformNode, x = 0, y = 0, z = 0): Mesh {
  // 3-tessellation cylinder rotated so one flat face aims forward = clean prism
  const m = MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: w, height: h, tessellation: 3 }, spec.scene);
  m.position.set(x, y, z);
  m.scaling.z = d / w;
  m.material = spec.mat(hex);
  m.parent = parent;
  m.isPickable = false;
  return m;
}

/** faceted mask-head: low-poly angular head shared across all tribes per the locked spec.
 *  A 6-sided low cylinder slightly tapered = faceted "mask" with a flat face plane. */
function maskHead(spec: CharacterSpec, parent: TransformNode, headY: number, r = 0.095): Mesh {
  const head = cyl(spec, "head", r * 1.35, r * 1.75, r * 1.55, 6, SKIN, parent, 0, headY, 0);
  head.rotation.y = Math.PI / 6; // flat facet faces forward — reads as a mask
  // shallow brow wedge shades the face at board scale without texture work
  const brow = wedge(spec, "head", r * 1.4, r * 0.45, r * 1.1, SKIN_SHADE, parent, 0, headY + r * 0.6, r * 0.4);
  brow.rotation.x = Math.PI; // point down over the face
  return head;
}

/** raised-geometry tribe sigil (Nerivane droplet): bone wedge + tip, no textures */
function dropletSigil(spec: CharacterSpec, parent: TransformNode, y: number, z: number, s = 1, glowMat?: Material) {
  // teardrop = down-pointing wedge + small cap box; bone-on-teal for contrast
  const body = wedge(spec, "sigil", 0.075 * s, 0.09 * s, 0.03, BONE, parent, 0, y, z);
  body.rotation.x = Math.PI; // point down
  const cap = box(spec, "sigil", 0.05 * s, 0.035 * s, 0.028, BONE, parent, 0, y + 0.05 * s, z);
  if (glowMat) {
    body.material = glowMat;
    cap.material = glowMat;
  }
}

/* ---------- v43 Nerivane Warrior v2 (mockup pilot) ----------
 * First character rebuilt against the painted lineup mockup: faceted bone
 * mask under a dark cowl, swept glowing crystal crest, two-value armor with
 * a glowing chest sigil, full arms with bone hands gripping an oversized
 * spear. Same primitive vocabulary (wedge / box / low-tess cylinder), shared
 * cached materials + the one emissive accent material; ~28 meshes, well
 * inside the 900-tri foot-unit budget.
 */

// fractured-stone base grays (shared across all tribes per the lineup mockups)
// v46: the plinth was read and approved in the Model Lab, which shows the
// figure against a dark ground. On the board it sits on bright grass, where a
// mid-grey stone became a halo that detached every unit from the tile it was
// standing on — the opposite of what a base is for. Darkened until it reads as
// the figure's own shadow-side footing, which grounds it on light terrain and
// still steps cleanly against the darker biomes.
const STONE_TOP = "#4a4756";
const STONE_SIDE = "#332f3e";

/** fractured stone hex base with a tribe-glow fissure — replaces the flat
 *  color puck on v2 units. Ownership reads from the glowing crack + armor. */
function fracturedStoneBase(spec: CharacterSpec, parent: TransformNode, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const base = cyl(spec, "puck", 0.42, 0.47, 0.05, 6, STONE_TOP, parent, 0, 0.025, 0);
  base.rotation.y = Math.PI / 6;
  // darker underside step reads as stacked stone
  const under = cyl(spec, "puck", 0.47, 0.44, 0.022, 6, STONE_SIDE, parent, 0, 0.011, 0);
  under.rotation.y = Math.PI / 6;
  // zigzag fissure: three thin glowing strips inset into the top face
  // one connected zigzag crack from the front rim to the right rim; each strip
  // spans consecutive waypoints so the segments visibly join
  const pts: Array<[number, number]> = [
    [0.0, 0.2],
    [0.05, 0.11],
    [0.14, 0.08],
    [0.21, -0.02],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[i + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) + 0.025; // slight overlap at the joints
    const strip = box(spec, "puck", 0.03, 0.008, len, c.accent, parent, (x1 + x2) / 2, 0.052, (z1 + z2) / 2);
    strip.rotation.y = Math.atan2(dx, dz);
    if (glowMat) strip.material = glowMat;
  }
}

/** faceted bone mask tucked into a dark cowl — v3: smaller, diamond-like,
 *  with a visible dark neck stub so the mask never merges into the torso. */
function boneMaskHead(spec: CharacterSpec, parent: TransformNode, headY: number) {
  const cowlHex = darken(spec.color, 0.32);
  // dark neck stub under the cowl — reads as a shadow gap at the chin
  cyl(spec, "head", 0.07, 0.082, 0.05, 6, darken(spec.color, 0.24), parent, 0, headY - 0.085, -0.005);
  // dark cowl shell behind/around the mask — a clear border on every side
  const cowl = cyl(spec, "head", 0.115, 0.148, 0.112, 6, cowlHex, parent, 0, headY + 0.012, -0.03);
  cowl.rotation.y = Math.PI / 6;
  // bone mask: compact 5-sided plate, flat facet forward, recessed in the cowl
  const shell = cyl(spec, "head", 0.075, 0.1, 0.06, 5, BONE, parent, 0, headY - 0.008, 0.026);
  shell.rotation.y = Math.PI / 5;
  // diamond point up + chin point down complete the faceted-gem outline —
  // both stay below the cowl brow line so the dark border reads all around
  const peak = wedge(spec, "head", 0.07, 0.028, 0.055, BONE, parent, 0, headY + 0.036, 0.028);
  void peak;
  const chin = wedge(spec, "head", 0.072, 0.045, 0.058, BONE, parent, 0, headY - 0.056, 0.03);
  chin.rotation.x = Math.PI;
}

/** dorsal fin crest — v3: materially shorter than the v1 blade, swept hard
 *  backward, thick enough to survive 40px. Two shards total, nothing added.
 *  `tall` is the unique/hero privilege: larger shards + a third front shard
 *  (crest hierarchy rule — common units stay short). */
function crystalCrest(spec: CharacterSpec, parent: TransformNode, topY: number, glowMat?: Material, tall = false) {
  const c = costumeFor(spec.defIndex);
  const main = tall
    ? wedge(spec, "gear", 0.055, 0.27, 0.26, c.accent, parent, 0, topY + 0.06, -0.08)
    : wedge(spec, "gear", 0.05, 0.17, 0.22, c.accent, parent, 0, topY + 0.03, -0.085);
  main.rotation.x = tall ? -0.42 : -0.55;
  const back = tall
    ? wedge(spec, "gear", 0.04, 0.14, 0.13, c.accent, parent, 0, topY, -0.16)
    : wedge(spec, "gear", 0.035, 0.09, 0.1, c.accent, parent, 0, topY - 0.015, -0.16);
  back.rotation.x = tall ? -0.7 : -0.8;
  if (glowMat) {
    main.material = glowMat;
    back.material = glowMat;
  }
  if (tall) {
    const front = wedge(spec, "gear", 0.035, 0.11, 0.08, c.accent, parent, 0, topY + 0.025, -0.005);
    front.rotation.x = -0.15;
    if (glowMat) front.material = glowMat;
  }
}

/** Nerivane tribal mark — bold cresting-wave glyph in raised geometry.
 *  NOTE: temporary placeholder. All tribal emblems get a unified design pass
 *  once the six-unit visual system is complete; only this helper changes.
 *  Reusable across the Nerivane set: a broad rising swept fin plus a smaller
 *  returning-wave plane below it, thick flat prisms proud of the chest plate.
 *  Reads at 40px on value contrast alone (accent-on-dark), glow optional. */
function nerivaneWaveEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, s = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  // primary: one broad swept fin — a leaning wedge keeps a clean triangular
  // silhouette from the front at any angle. Sized to dominate the chest plate.
  const crest = wedge(spec, "sigil", 0.125 * s, 0.115 * s, 0.028, c.accent, parent, 0.006 * s, y + 0.02 * s, z);
  crest.rotation.z = -0.4;
  // one shorter returning wave below, counter-leaning — reads as backwash
  const under = wedge(spec, "sigil", 0.078 * s, 0.05 * s, 0.026, c.accent, parent, -0.014 * s, y - 0.042 * s, z - 0.002);
  under.rotation.z = 0.35;
  if (glowMat) {
    crest.material = glowMat;
    under.material = glowMat;
  }
}

// near-black weapon grip wood (mockup weapon shafts)
const GRIP = "#4d4741";

/* ---------- Nerivane v3 shared skeleton (locked with the Warrior) ----------
 * Base, legs/boots, torso, chest plate + emblem, pauldrons, head, crest.
 * Per-class builders add arms and equipment on top. Values are LOCKED — the
 * Warrior is the approved reference; do not retune here for other classes.
 */
function nerivaneBodyV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material, tallHeadgear = false): { headY: number; shoulderY: number; deep: string; deeper: string } {
  const deep = darken(spec.color, 0.45); // dark sea-armor plates
  const deeper = darken(spec.color, 0.32); // shadow step (fauld, trim)

  // fractured stone base with tribe-glow fissure (lineup mockup convention)
  fracturedStoneBase(spec, node, glowMat);

  // stocky legs + angled boots (toes forward, slightly turned out)
  for (const sx of [-0.07, 0.07]) {
    box(spec, "leg", 0.085, 0.13, 0.095, deep, node, sx, 0.115, 0);
    const boot = box(spec, "leg", 0.078, 0.045, 0.115, deeper, node, sx, 0.068, 0.018);
    boot.rotation.y = sx > 0 ? -0.12 : 0.12;
  }
  box(spec, "belt", 0.21, 0.06, 0.13, deeper, node, 0, 0.19, 0);

  // torso: narrowed waist under the same broad chest block; the chest gets a
  // slight forward lean so its front plane reads angled instead of flat
  box(spec, "torso", 0.165, 0.1, 0.115, deep, node, 0, 0.245, 0);
  const chestBlock = box(spec, "torso", 0.22, 0.14, 0.135, deep, node, 0, 0.355, 0);
  chestBlock.rotation.x = 0.09;
  const shoulderY = 0.425;

  // mid-teal chest plate (tilted with the chest) carrying the wave emblem
  const plate = box(spec, "torso", 0.14, 0.14, 0.028, spec.color, node, 0, 0.35, 0.072);
  plate.rotation.x = 0.14;
  v3Emblem(spec, node, 0.345, 0.098, 1, glowMat);

  // pauldrons: compact plates capping the shoulders
  for (const sx of [-0.135, 0.135]) {
    const pad = box(spec, "gear", 0.085, 0.042, 0.105, deeper, node, sx, shoulderY + 0.005, 0);
    pad.rotation.z = sx > 0 ? -0.3 : 0.3;
  }

  // head: faceted bone mask in a dark cowl + per-tribe headgear
  const headY = 0.485;
  boneMaskHead(spec, node, headY);
  v3Headgear(spec, node, headY, glowMat, tallHeadgear);

  return { headY, shoulderY, deep, deeper };
}

/** standard v3 arms: left arm hangs, right arm angles to grip at (gx,gy,gz) */
function nerivaneArmsV3(spec: CharacterSpec, node: TransformNode, deep: string, gx: number, gy: number, gz: number) {
  const armL = box(spec, "arm", 0.055, 0.16, 0.065, deep, node, -0.155, 0.32, 0.01);
  armL.rotation.z = 0.1;
  box(spec, "hand", 0.05, 0.05, 0.055, BONE, node, -0.148, 0.235, 0.015);
  const armR = box(spec, "arm", 0.055, 0.15, 0.065, deep, node, 0.165, gy + 0.07, gz - 0.015);
  armR.rotation.z = -0.24;
  box(spec, "hand", 0.052, 0.058, 0.058, BONE, node, gx, gy, gz);
}

/** Warrior v3 (locked): shared skeleton + wave-blade spear. */
function nerivaneWarriorV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const rig = nerivaneBodyV3(spec, node, glowMat);
  nerivaneArmsV3(spec, node, rig.deep, 0.205, 0.265, 0.04);

  // spear: slightly thicker shaft, wave-blade head — a broad leaning steel
  // blade with one swept rear barb, still an unmistakable vertical spear
  cyl(spec, "prop", 0.036, 0.036, 0.52, 5, GRIP, node, 0.205, 0.285, 0.04);
  const gem = box(spec, "prop", 0.042, 0.036, 0.042, "#9ffaef", node, 0.205, 0.562, 0.04);
  if (glowMat) gem.material = glowMat;
  const blade = wedge(spec, "prop", 0.082, 0.145, 0.048, STEEL, node, 0.209, 0.648, 0.04);
  blade.rotation.z = -0.17; // stronger lean = wave motion, not a symmetric pike
  const barb = wedge(spec, "prop", 0.05, 0.085, 0.042, STEEL_DARK, node, 0.164, 0.605, 0.04);
  barb.rotation.z = 1.05; //   rear barb curls harder off the blade, wave trough
  const collar = wedge(spec, "prop", 0.05, 0.055, 0.042, STEEL_DARK, node, 0.205, 0.592, 0.04);
  collar.rotation.x = Math.PI; // point down against the gem

  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/** Archer v3: shared skeleton + vertical recurve bow and swept back quiver. */
function nerivaneArcherV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const rig = nerivaneBodyV3(spec, node, glowMat);
  nerivaneArmsV3(spec, node, rig.deep, 0.2, 0.27, 0.04);

  // bow: vertical, ~0.7H span, built under a yawed pivot so the arc's sweep
  // plane faces the camera instead of hiding in depth
  const bowPivot = new TransformNode("prop", spec.scene);
  bowPivot.position.set(0.2, 0.3, 0.04);
  bowPivot.rotation.y = -0.85;
  bowPivot.parent = node;
  box(spec, "prop", 0.034, 0.1, 0.042, GRIP, bowPivot, 0, 0, 0);
  const upper = box(spec, "prop", 0.03, 0.18, 0.036, GRIP, bowPivot, 0, 0.1, 0.014);
  upper.rotation.x = -0.45; //  top limb sweeps toward the string side
  const lower = box(spec, "prop", 0.03, 0.18, 0.036, GRIP, bowPivot, 0, -0.1, 0.014);
  lower.rotation.x = 0.45; //   bottom limb mirrors it
  box(spec, "prop", 0.009, 0.37, 0.009, BONE, bowPivot, 0, 0, 0.055);
  // recurve tips: accent wedges continuing each limb's curve
  const tipT = wedge(spec, "prop", 0.028, 0.055, 0.026, spec.color, bowPivot, 0, 0.19, 0.048);
  tipT.rotation.x = -1.0;
  const tipB = wedge(spec, "prop", 0.028, 0.055, 0.026, spec.color, bowPivot, 0, -0.19, 0.048);
  tipB.rotation.x = Math.PI + 1.0;

  // swept quiver high on the back, tilted out past the pauldron so the
  // fletchings clear the head silhouette; fletchings parented to the quiver
  const quiver = box(spec, "prop", 0.065, 0.2, 0.06, rig.deeper, node, -0.085, 0.4, -0.1);
  quiver.rotation.x = 0.3;
  quiver.rotation.z = 0.38;
  const f1 = wedge(spec, "prop", 0.034, 0.055, 0.032, BONE, quiver, -0.014, 0.125, 0.008);
  void f1;
  const f2 = wedge(spec, "prop", 0.03, 0.05, 0.028, BONE, quiver, 0.016, 0.118, -0.01);
  void f2;
  const f3 = wedge(spec, "prop", 0.03, 0.052, 0.028, spec.color, quiver, 0.002, 0.132, 0.014);
  if (glowMat) f3.material = glowMat;

  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/** Defender v3: shared skeleton + broad heater shield (~half the projected
 *  body area) — steel rim, dark inner field, tribal wave mark. */
function nerivaneDefenderV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const rig = nerivaneBodyV3(spec, node, glowMat);
  // arms tuck behind the shield; hands brace its inner edge
  nerivaneArmsV3(spec, node, rig.deep, 0.14, 0.28, 0.1);

  // steel rim layer: plate + down-pointing apex give the heater outline.
  // Planted forward of the base fissure's front reach so the glowing crack
  // stays behind the shield instead of crossing its foot.
  box(spec, "prop", 0.32, 0.36, 0.03, STEEL, node, 0, 0.27, 0.2);
  const rimTip = wedge(spec, "prop", 0.32, 0.08, 0.03, STEEL, node, 0, 0.1, 0.2);
  rimTip.rotation.x = Math.PI;
  // dark inner field, inset from the rim
  box(spec, "prop", 0.26, 0.3, 0.028, rig.deeper, node, 0, 0.28, 0.215);
  const fieldTip = wedge(spec, "prop", 0.26, 0.07, 0.028, rig.deeper, node, 0, 0.12, 0.215);
  fieldTip.rotation.x = Math.PI;
  // tribal wave mark carried on the shield, scaled up for board reads
  v3Emblem(spec, node, 0.28, 0.235, 1.25, glowMat);

  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/** Rider v3: fractured base + abstract aquatic mount + compact seated rider.
 *  The mount is the class identity (low fish body, faceted nose, glowing
 *  dorsal fin, vertical tail crescent); the rider reuses the shared head,
 *  crest, and emblem helpers at reduced scale. */
function nerivaneRiderV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const deep = darken(spec.color, 0.45);
  const deeper = darken(spec.color, 0.32);
  const c = costumeFor(spec.defIndex);
  fracturedStoneBase(spec, node, glowMat);

  // whole mount + rider under a yawed root: the fish reads in near-profile
  // from the standard camera (a long box seen corner-on is just a slab)
  const unit = new TransformNode("mount", spec.scene);
  unit.rotation.y = 1.45;
  unit.parent = node;

  // ── mount: per-tribe beast in darker hide tones than the rider's armor so
  // the two bodies separate at a glance; recognizable without the rider ──
  const mDeep = darken(spec.color, 0.34); //  mount hide
  const mDark = darken(spec.color, 0.24); //  mount belly/fin shadow
  if (spec.defIndex === 1) {
    // Kharzul war-boar: mid body + raised rump, head lifted clear of the
    // shoulders with ears/snout/tusks, four legs planted OUTSIDE the body
    // silhouette so it reads as an animal, not a platform
    box(spec, "mount", 0.18, 0.12, 0.22, mDeep, unit, 0, 0.15, 0.02);
    box(spec, "mount", 0.16, 0.13, 0.12, mDeep, unit, 0, 0.155, -0.15); // rump
    box(spec, "mount", 0.13, 0.04, 0.2, mDark, unit, 0, 0.085, 0.02); // belly
    // head raised above the body line, distinct snout + ears
    box(spec, "mount", 0.14, 0.12, 0.09, mDeep, unit, 0, 0.17, 0.17);
    box(spec, "mount", 0.08, 0.06, 0.06, mDark, unit, 0, 0.145, 0.235);
    for (const sx of [-0.05, 0.05]) {
      const ear = wedge(spec, "mount", 0.032, 0.05, 0.026, mDark, unit, sx, 0.25, 0.15);
      ear.rotation.z = sx > 0 ? -0.25 : 0.25;
      const tusk = wedge(spec, "mount", 0.032, 0.085, 0.026, BONE, unit, sx, 0.155, 0.25);
      tusk.rotation.x = -0.4;
    }
    // bristle ridge from crown to rump
    for (const bz of [0.05, -0.03, -0.11]) {
      const bristle = wedge(spec, "mount", 0.04, 0.06, 0.05, mDark, unit, 0, 0.225, bz);
      bristle.rotation.x = -0.3;
    }
    // legs planted outside the body width, hooves on the stone
    for (const [lx, lz] of [[-0.1, 0.12], [0.1, 0.12], [-0.1, -0.16], [0.1, -0.16]] as const) {
      box(spec, "mount", 0.055, 0.1, 0.055, mDark, unit, lx, 0.095, lz);
    }
    const bTail = wedge(spec, "mount", 0.03, 0.05, 0.024, mDark, unit, 0, 0.19, -0.23);
    bTail.rotation.x = Math.PI - 0.4;
    box(spec, "mount", 0.2, 0.028, 0.085, spec.color, unit, 0, 0.218, 0.01);
    box(spec, "mount", 0.13, 0.035, 0.13, deeper, unit, 0, 0.233, 0.01);
  } else if (spec.defIndex !== 4) {
    // generic war-steed quadruped: body + rump, raised neck/head with ears
    // and muzzle, four planted legs, tail — tinted per tribe. Small per-tribe
    // accents keep the beasts from being clones.
    box(spec, "mount", 0.17, 0.12, 0.22, mDeep, unit, 0, 0.15, 0);
    box(spec, "mount", 0.15, 0.12, 0.1, mDeep, unit, 0, 0.15, -0.14); // rump
    box(spec, "mount", 0.12, 0.04, 0.18, mDark, unit, 0, 0.085, 0); //   belly
    const neck = box(spec, "mount", 0.09, 0.12, 0.075, mDeep, unit, 0, 0.2, 0.125);
    neck.rotation.x = 0.25;
    box(spec, "mount", 0.11, 0.09, 0.08, mDeep, unit, 0, 0.26, 0.17);
    box(spec, "mount", 0.06, 0.05, 0.06, mDark, unit, 0, 0.245, 0.225);
    for (const sx of [-0.04, 0.04]) {
      const ear = wedge(spec, "mount", 0.028, 0.045, 0.024, mDark, unit, sx, 0.32, 0.14);
      void ear;
    }
    for (const [lx, lz] of [[-0.09, 0.1], [0.09, 0.1], [-0.09, -0.14], [0.09, -0.14]] as const) {
      box(spec, "mount", 0.05, 0.1, 0.05, mDark, unit, lx, 0.095, lz);
    }
    const qTail = wedge(spec, "mount", 0.028, 0.06, 0.024, mDark, unit, 0, 0.17, -0.21);
    qTail.rotation.x = Math.PI - 0.5;
    // per-tribe accent: Sunwei ox horns, Dravok ram horns, Valkyra glow wings
    if (spec.defIndex === 2 || spec.defIndex === 5) {
      for (const sx of [-0.062, 0.062]) {
        const horn = wedge(spec, "mount", 0.026, 0.06, 0.022, BONE, unit, sx, 0.29, 0.19);
        horn.rotation.z = sx > 0 ? -0.8 : 0.8;
      }
    } else if (spec.defIndex === 6) {
      for (const sx of [-0.1, 0.1]) {
        const wingStub = wedge(spec, "mount", 0.03, 0.09, 0.05, c.accent, unit, sx, 0.22, 0.02);
        wingStub.rotation.z = sx > 0 ? -0.9 : 0.9;
        if (glowMat) wingStub.material = glowMat;
      }
    }
    box(spec, "mount", 0.2, 0.028, 0.085, spec.color, unit, 0, 0.218, -0.01);
    box(spec, "mount", 0.13, 0.035, 0.13, deeper, unit, 0, 0.233, -0.01);
  } else {
  box(spec, "mount", 0.17, 0.11, 0.3, mDeep, unit, 0, 0.12, -0.03);
  box(spec, "mount", 0.13, 0.04, 0.24, mDark, unit, 0, 0.065, -0.03); // belly
  // distinct head block + tapered snout off the front
  box(spec, "mount", 0.15, 0.09, 0.08, mDeep, unit, 0, 0.13, 0.16);
  const snout = wedge(spec, "mount", 0.11, 0.09, 0.08, mDeep, unit, 0, 0.115, 0.235);
  snout.rotation.x = Math.PI / 2; // taper forward
  // dorsal fin on the spine behind the saddle — glowing accent silhouette cue
  const dorsal = wedge(spec, "mount", 0.04, 0.15, 0.12, c.accent, unit, 0, 0.22, -0.14);
  dorsal.rotation.x = -0.45;
  if (glowMat) dorsal.material = glowMat;
  // stern taper narrows the body into the tail root
  const stern = wedge(spec, "mount", 0.12, 0.09, 0.09, mDeep, unit, 0, 0.11, -0.21);
  stern.rotation.x = -Math.PI / 2; // taper backward
  // vertical tail crescent: upper + lower wedge off the stern
  const tailUp = wedge(spec, "mount", 0.035, 0.13, 0.08, mDark, unit, 0, 0.2, -0.27);
  tailUp.rotation.x = -0.25;
  const tailDn = wedge(spec, "mount", 0.035, 0.09, 0.07, mDark, unit, 0, 0.1, -0.27);
  tailDn.rotation.x = Math.PI - 0.25;
  // two planted side fins — apex-down wedges reaching the stone like forelimbs
  for (const sx of [-0.095, 0.095]) {
    const fin = box(spec, "mount", 0.055, 0.11, 0.035, mDark, unit, sx * 1.15, 0.1, 0.14);
    fin.rotation.z = sx > 0 ? -0.45 : 0.45;
  }
  // saddle strap + pad in tribe mid-teal
  box(spec, "mount", 0.22, 0.028, 0.085, spec.color, unit, 0, 0.165, -0.02);
  box(spec, "mount", 0.13, 0.035, 0.13, deeper, unit, 0, 0.18, -0.02);
  }

  // land-tribe saddle pennant streaming aft — glowing accent, the mounted
  // unit's low horizontal 40px cue (concept adopted from the parallel v44
  // rollout; Nerivane's dorsal fin already serves this role)
  if (spec.defIndex !== 4) {
    const pole = cyl(spec, "mount", 0.015, 0.015, 0.17, 4, GRIP, unit, 0, 0.28, -0.17);
    void pole;
    const pennant = box(spec, "mount", 0.02, 0.09, 0.19, c.accent, unit, 0, 0.33, -0.27);
    pennant.rotation.x = 0.35;
    if (glowMat) pennant.material = glowMat;
  }

  // ── compact seated rider ──
  const rider = new TransformNode("rider", spec.scene);
  rider.position.set(0, spec.defIndex === 1 ? 0.253 : spec.defIndex === 4 ? 0.2 : 0.253, 0);
  rider.scaling.setAll(0.78);
  rider.parent = node;
  // straddling legs: thighs over the saddle, shins + boots down the flanks
  for (const sx of [-0.1, 0.1]) {
    const thigh = box(spec, "leg", 0.06, 0.055, 0.11, deep, rider, sx, 0.025, 0.02);
    thigh.rotation.z = sx > 0 ? -0.35 : 0.35;
    box(spec, "leg", 0.048, 0.1, 0.055, deep, rider, sx * 1.38, -0.035, 0.03);
    box(spec, "leg", 0.05, 0.035, 0.08, deeper, rider, sx * 1.42, -0.09, 0.045);
  }
  box(spec, "torso", 0.15, 0.08, 0.105, deep, rider, 0, 0.06, 0);
  const chest = box(spec, "torso", 0.2, 0.13, 0.125, deep, rider, 0, 0.16, 0);
  chest.rotation.x = 0.09;
  const plate = box(spec, "torso", 0.125, 0.12, 0.026, spec.color, rider, 0, 0.155, 0.066);
  plate.rotation.x = 0.14;
  v3Emblem(spec, rider, 0.15, 0.088, 0.85, glowMat);
  for (const sx of [-0.12, 0.12]) {
    const pad = box(spec, "gear", 0.078, 0.04, 0.095, deeper, rider, sx, 0.23, 0);
    pad.rotation.z = sx > 0 ? -0.3 : 0.3;
  }
  const armL = box(spec, "arm", 0.05, 0.13, 0.06, deep, rider, -0.14, 0.15, 0.01);
  armL.rotation.z = 0.12;
  box(spec, "hand", 0.046, 0.046, 0.05, BONE, rider, -0.132, 0.083, 0.015);
  const armR = box(spec, "arm", 0.05, 0.13, 0.06, deep, rider, 0.15, 0.16, 0.02);
  armR.rotation.z = -0.24;
  box(spec, "hand", 0.048, 0.052, 0.052, BONE, rider, 0.185, 0.09, 0.035);
  // shared head + crest
  boneMaskHead(spec, rider, 0.315);
  v3Headgear(spec, rider, 0.315, glowMat);
  // shortened wave-spear, vertical in the right hand
  cyl(spec, "prop", 0.034, 0.034, 0.42, 5, GRIP, rider, 0.185, 0.14, 0.035);
  const gem = box(spec, "prop", 0.04, 0.034, 0.04, "#9ffaef", rider, 0.185, 0.365, 0.035);
  if (glowMat) gem.material = glowMat;
  const blade = wedge(spec, "prop", 0.075, 0.13, 0.045, STEEL, rider, 0.188, 0.44, 0.035);
  blade.rotation.z = -0.17;
  const barb = wedge(spec, "prop", 0.045, 0.075, 0.04, STEEL_DARK, rider, 0.148, 0.4, 0.035);
  barb.rotation.z = 1.05;

  return { headY: 0.2 + 0.315 * 0.78, shoulderY: 0.2 + 0.23 * 0.78 };
}

/** Kharzul bone horns — upswept from the cowl sides. `tall` = longer sweep
 *  (unique/hero privilege, mirroring the Nerivane tall-crest rule). */
function boneHornsV3(spec: CharacterSpec, parent: TransformNode, headY: number, tall = false) {
  const len = tall ? 0.17 : 0.13;
  for (const sx of [-1, 1]) {
    const horn = cyl(spec, "gear", 0, tall ? 0.06 : 0.052, len, 4, BONE, parent, sx * 0.088, headY + 0.055, -0.01);
    horn.rotation.z = sx * -0.75;
    horn.rotation.x = -0.15;
    const tip = wedge(spec, "gear", 0.03, tall ? 0.07 : 0.05, 0.026, BONE, parent, sx * 0.15, headY + (tall ? 0.13 : 0.105), -0.02);
    tip.rotation.z = sx * -0.35;
  }
}

/** Kharzul tribal mark — angular forge-rune bolt in raised geometry.
 *  NOTE: temporary placeholder, same status as the Nerivane wave. */
function kharzulRuneEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, s = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const segs: Array<[number, number, number]> = [
    // [x, y, rotZ] — three strokes forming an angular bolt
    [0.014 * s, 0.034 * s, -0.5],
    [-0.014 * s, -0.008 * s, 0.45],
    [0.014 * s, -0.048 * s, -0.5],
  ];
  for (const [sx, sy, rz] of segs) {
    const stroke = box(spec, "sigil", 0.034 * s, 0.075 * s, 0.02, c.accent, parent, sx, y + sy, z);
    stroke.rotation.z = rz;
    if (glowMat) stroke.material = glowMat;
  }
}

/** Auren circlet: steel band + two up-curved silver arcs + glow gem */
function circletArcsV3(spec: CharacterSpec, parent: TransformNode, headY: number, glowMat?: Material, tall = false) {
  const band = cyl(spec, "gear", 0.14, 0.15, 0.032, 6, STEEL, parent, 0, headY + 0.055, -0.005);
  band.rotation.y = Math.PI / 6;
  for (const sx of [-1, 1]) {
    const arc = cyl(spec, "gear", 0, 0.03, tall ? 0.15 : 0.11, 4, STEEL, parent, sx * 0.078, headY + (tall ? 0.13 : 0.11), -0.01);
    arc.rotation.z = sx * -0.4;
  }
  const gem = box(spec, "gear", 0.03, 0.032, 0.024, costumeFor(spec.defIndex).accent, parent, 0, headY + 0.062, 0.062);
  if (glowMat) gem.material = glowMat;
}

/** Sunwei straw hat: wide 6-facet cone + bone knob; tall adds a gold band */
function strawHatV3(spec: CharacterSpec, parent: TransformNode, headY: number, tall = false) {
  const c = costumeFor(spec.defIndex);
  const brim = cyl(spec, "gear", 0.02, tall ? 0.3 : 0.26, 0.08, 6, c.accent, parent, 0, headY + 0.085, -0.005);
  brim.rotation.y = Math.PI / 6;
  box(spec, "gear", 0.035, 0.028, 0.035, BONE, parent, 0, headY + 0.135, -0.005);
  if (tall) {
    const bandCyl = cyl(spec, "gear", 0.155, 0.165, 0.02, 6, "#e7b552", parent, 0, headY + 0.075, -0.005);
    bandCyl.rotation.y = Math.PI / 6;
  }
}

/** Vessari riding hood: soft cone over the cowl with a drooping tip */
function riderHoodV3(spec: CharacterSpec, parent: TransformNode, headY: number, tall = false) {
  const hood = cyl(spec, "gear", 0.028, 0.16, 0.14, 6, darken(spec.color, 0.38), parent, 0, headY + 0.062, -0.012);
  hood.rotation.x = 0.1;
  hood.rotation.y = Math.PI / 6;
  const tip = wedge(spec, "gear", 0.045, tall ? 0.1 : 0.075, 0.04, darken(spec.color, 0.3), parent, 0.055, headY + 0.135, -0.035);
  tip.rotation.z = -1.25;
}

/** Dravok stone helm: faceted gray dome + brow band; tall adds a peak */
function stoneHelmV3(spec: CharacterSpec, parent: TransformNode, headY: number, tall = false) {
  const dome = cyl(spec, "gear", 0.09, 0.148, 0.07, 6, "#8f8fa3", parent, 0, headY + 0.062, -0.008);
  dome.rotation.y = Math.PI / 6;
  box(spec, "gear", 0.158, 0.028, 0.15, "#6f6f80", parent, 0, headY + 0.03, -0.008);
  if (tall) {
    wedge(spec, "gear", 0.06, 0.085, 0.05, "#8f8fa3", parent, 0, headY + 0.13, -0.01);
  }
}

/** Valkyra winged helm: steel dome + two swept glow wings */
function wingedHelmV3(spec: CharacterSpec, parent: TransformNode, headY: number, glowMat?: Material, tall = false) {
  const c = costumeFor(spec.defIndex);
  const dome = cyl(spec, "gear", 0.06, 0.14, 0.06, 6, STEEL, parent, 0, headY + 0.058, -0.005);
  dome.rotation.y = Math.PI / 6;
  for (const sx of [-1, 1]) {
    const wing = wedge(spec, "gear", 0.035, tall ? 0.16 : 0.12, 0.075, c.accent, parent, sx * 0.1, headY + 0.1, -0.015);
    wing.rotation.z = sx * -0.6;
    wing.rotation.x = -0.2;
    if (glowMat) wing.material = glowMat;
  }
}

/** Mycelon spore cap: wide faceted dome + pale gill underside */
function sporeCapV3(spec: CharacterSpec, parent: TransformNode, headY: number, tall = false) {
  const c = costumeFor(spec.defIndex);
  const cap = cyl(spec, "gear", 0.08, tall ? 0.23 : 0.19, tall ? 0.095 : 0.08, 6, c.accent, parent, 0, headY + 0.09, -0.005);
  cap.rotation.y = Math.PI / 6;
  const gills = cyl(spec, "gear", tall ? 0.22 : 0.185, tall ? 0.22 : 0.185, 0.014, 6, BONE, parent, 0, headY + 0.045, -0.005);
  gills.rotation.y = Math.PI / 6;
}

/** Auren tome: two angled covers meeting at a spine — an open book */
function aurenTomeEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, sc = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  for (const sx of [-1, 1]) {
    const cover = box(spec, "sigil", 0.052 * sc, 0.068 * sc, 0.02, c.accent, parent, sx * 0.026 * sc, y, z);
    cover.rotation.z = sx * -0.3;
    if (glowMat) cover.material = glowMat;
  }
  const spine = box(spec, "sigil", 0.016 * sc, 0.075 * sc, 0.022, c.accent, parent, 0, y - 0.006 * sc, z + 0.002);
  if (glowMat) spine.material = glowMat;
}

/** Sunwei gate: two pillars under a double lintel — a harvest shrine */
function sunweiGateEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, sc = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const parts: Array<[number, number, number, number]> = [
    [-0.032, -0.015, 0.022, 0.075], // [x, y, w, h] pillars
    [0.032, -0.015, 0.022, 0.075],
    [0, 0.032, 0.1, 0.02], //          lower lintel
    [0, 0.056, 0.115, 0.018], //       upper roof
  ];
  for (const [px, py, w, h] of parts) {
    const seg = box(spec, "sigil", w * sc, h * sc, 0.02, c.accent, parent, px * sc, y + py * sc, z);
    if (glowMat) seg.material = glowMat;
  }
}

/** Vessari chevrons: double right-pointing arrows — speed */
function vessariChevronEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, sc = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  for (const ox of [-0.022, 0.026]) {
    for (const sy of [-1, 1]) {
      const stroke = box(spec, "sigil", 0.022 * sc, 0.058 * sc, 0.02, c.accent, parent, ox * sc + sy * 0.0, y + sy * 0.02 * sc, z);
      stroke.rotation.z = sy * 0.7;
      if (glowMat) stroke.material = glowMat;
    }
  }
}

/** Dravok anvil: base, waist, and wide crown slab */
function dravokAnvilEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, sc = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const parts: Array<[number, number, number, number]> = [
    [0, -0.035, 0.075, 0.022],
    [0, -0.012, 0.042, 0.03],
    [0, 0.022, 0.1, 0.028],
  ];
  for (const [px, py, w, h] of parts) {
    const seg = box(spec, "sigil", w * sc, h * sc, 0.02, c.accent, parent, px, y + py * sc, z);
    if (glowMat) seg.material = glowMat;
  }
}

/** Valkyra bolt: two steep strokes — a strike of lightning */
function valkyraBoltEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, sc = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const s1 = box(spec, "sigil", 0.03 * sc, 0.085 * sc, 0.02, c.accent, parent, 0.016 * sc, y + 0.026 * sc, z);
  s1.rotation.z = -0.45;
  const s2 = box(spec, "sigil", 0.03 * sc, 0.08 * sc, 0.02, c.accent, parent, -0.016 * sc, y - 0.036 * sc, z);
  s2.rotation.z = -0.45;
  if (glowMat) {
    s1.material = glowMat;
    s2.material = glowMat;
  }
}

/** Mycelon mushroom: stem + faceted cap dome */
function mycelonCapEmblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, sc = 1, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const stem = box(spec, "sigil", 0.03 * sc, 0.048 * sc, 0.02, c.accent, parent, 0, y - 0.03 * sc, z);
  const cap = wedge(spec, "sigil", 0.095 * sc, 0.05 * sc, 0.02, c.accent, parent, 0, y + 0.015 * sc, z);
  if (glowMat) {
    stem.material = glowMat;
    cap.material = glowMat;
  }
}

/** per-tribe v3 headgear: Nerivane crystal crest (default), Kharzul horns */
function v3Headgear(spec: CharacterSpec, parent: TransformNode, headY: number, glowMat?: Material, tall = false) {
  switch (spec.defIndex) {
    case 0: circletArcsV3(spec, parent, headY, glowMat, tall); break;
    case 1: boneHornsV3(spec, parent, headY, tall); break;
    case 2: strawHatV3(spec, parent, headY, tall); break;
    case 3: riderHoodV3(spec, parent, headY, tall); break;
    case 5: stoneHelmV3(spec, parent, headY, tall); break;
    case 6: wingedHelmV3(spec, parent, headY, glowMat, tall); break;
    case 7: sporeCapV3(spec, parent, headY, tall); break;
    default: crystalCrest(spec, parent, headY + 0.075, glowMat, tall);
  }
}

/** per-tribe v3 emblem (all placeholders pending the unified emblem pass) */
function v3Emblem(spec: CharacterSpec, parent: TransformNode, y: number, z: number, sc = 1, glowMat?: Material) {
  switch (spec.defIndex) {
    case 0: aurenTomeEmblem(spec, parent, y, z, sc, glowMat); break;
    case 1: kharzulRuneEmblem(spec, parent, y, z, sc, glowMat); break;
    case 2: sunweiGateEmblem(spec, parent, y, z, sc, glowMat); break;
    case 3: vessariChevronEmblem(spec, parent, y, z, sc, glowMat); break;
    case 5: dravokAnvilEmblem(spec, parent, y, z, sc, glowMat); break;
    case 6: valkyraBoltEmblem(spec, parent, y, z, sc, glowMat); break;
    case 7: mycelonCapEmblem(spec, parent, y, z, sc, glowMat); break;
    default: nerivaneWaveEmblem(spec, parent, y, z, sc, glowMat);
  }
}

/** shared upper body for robed/caped classes: chest block, plate + emblem,
 *  pauldrons, head — same locked values as nerivaneBodyV3 from the waist up */
function nerivaneUpperV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material, tallCrest = false): { headY: number; shoulderY: number; deep: string; deeper: string } {
  const deep = darken(spec.color, 0.45);
  const deeper = darken(spec.color, 0.32);
  const chestBlock = box(spec, "torso", 0.22, 0.14, 0.135, deep, node, 0, 0.355, 0);
  chestBlock.rotation.x = 0.09;
  const shoulderY = 0.425;
  const plate = box(spec, "torso", 0.14, 0.14, 0.028, spec.color, node, 0, 0.35, 0.072);
  plate.rotation.x = 0.14;
  v3Emblem(spec, node, 0.345, 0.098, 1, glowMat);
  for (const sx of [-0.135, 0.135]) {
    const pad = box(spec, "gear", 0.085, 0.042, 0.105, deeper, node, sx, shoulderY + 0.005, 0);
    pad.rotation.z = sx > 0 ? -0.3 : 0.3;
  }
  const headY = 0.485;
  boneMaskHead(spec, node, headY);
  v3Headgear(spec, node, headY, glowMat, tallCrest);
  return { headY, shoulderY, deep, deeper };
}

/** Tidecaller v3: flared robe, tall three-shard crest, trident to ~1.3H. */
function nerivaneTidecallerV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const deep = darken(spec.color, 0.45);
  const deeper = darken(spec.color, 0.32);
  fracturedStoneBase(spec, node, glowMat);
  // flared robe: wide ground flare + tapered skirt instead of legs
  const flare = cyl(spec, "robe", 0.27, 0.33, 0.08, 6, deeper, node, 0, 0.09, 0);
  flare.rotation.y = Math.PI / 6;
  const skirt = cyl(spec, "robe", 0.14, 0.27, 0.27, 6, deep, node, 0, 0.245, 0);
  skirt.rotation.y = Math.PI / 6;
  const rig = nerivaneUpperV3(spec, node, glowMat, true);
  nerivaneArmsV3(spec, node, rig.deep, 0.205, 0.265, 0.04);
  // trident to ~1.3H: dark shaft, glow gem, crossbar, three prongs
  cyl(spec, "prop", 0.036, 0.036, 0.56, 5, GRIP, node, 0.205, 0.3, 0.04);
  const gem = box(spec, "prop", 0.042, 0.036, 0.042, "#9ffaef", node, 0.205, 0.598, 0.04);
  if (glowMat) gem.material = glowMat;
  box(spec, "prop", 0.125, 0.024, 0.036, STEEL_DARK, node, 0.205, 0.625, 0.04);
  const mid = wedge(spec, "prop", 0.045, 0.11, 0.04, STEEL, node, 0.205, 0.678, 0.04);
  if (glowMat) mid.material = glowMat;
  for (const sx of [-0.052, 0.052]) {
    wedge(spec, "prop", 0.036, 0.082, 0.034, STEEL, node, 0.205 + sx, 0.662, 0.04);
  }
  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/** Nereth (hero) v3: shared skeleton + cape, gold crown, tall crest, and the
 *  wave-spear carried as a banner standard with a tribe pennant. */
function nerivaneHeroV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const deep = darken(spec.color, 0.45);
  const deeper = darken(spec.color, 0.32);
  const GOLD = "#e7b552";
  fracturedStoneBase(spec, node, glowMat);
  // legs/boots + waist identical to the locked skeleton
  for (const sx of [-0.07, 0.07]) {
    box(spec, "leg", 0.085, 0.13, 0.095, deep, node, sx, 0.115, 0);
    const boot = box(spec, "leg", 0.078, 0.045, 0.115, deeper, node, sx, 0.068, 0.018);
    boot.rotation.y = sx > 0 ? -0.12 : 0.12;
  }
  box(spec, "belt", 0.21, 0.06, 0.13, deeper, node, 0, 0.19, 0);
  box(spec, "torso", 0.165, 0.1, 0.115, deep, node, 0, 0.245, 0);
  // cape: broader mantle rising to shoulder height — the hero's silhouette
  // reads wider and heavier than any common unit
  const cape = cyl(spec, "prop", 0.18, 0.4, 0.37, 6, deeper, node, 0, 0.275, -0.09);
  cape.scaling.z = 0.5;
  const rig = nerivaneUpperV3(spec, node, glowMat, true);
  // oversized hero pauldrons layered over the standard plates (~10% broader)
  for (const sx of [-0.158, 0.158]) {
    const heroPad = box(spec, "gear", 0.105, 0.05, 0.12, deeper, node, sx, rig.shoulderY + 0.018, 0);
    heroPad.rotation.z = sx > 0 ? -0.34 : 0.34;
  }
  nerivaneArmsV3(spec, node, rig.deep, 0.205, 0.265, 0.04);
  // gold crown seated on the cowl, three raised points (regal cue vs crest)
  const band = cyl(spec, "gear", 0.15, 0.16, 0.045, 6, GOLD, node, 0, rig.headY + 0.062, -0.005);
  band.rotation.y = Math.PI / 6;
  for (const [px, pz] of [[0, 0.062], [-0.062, -0.01], [0.062, -0.01]] as const) {
    wedge(spec, "gear", 0.042, 0.05, 0.035, GOLD, node, px, rig.headY + 0.1, pz);
  }
  // banner standard: the wave-spear with a hanging tribe pennant
  cyl(spec, "prop", 0.036, 0.036, 0.52, 5, GRIP, node, 0.205, 0.285, 0.04);
  const gem = box(spec, "prop", 0.042, 0.036, 0.042, "#9ffaef", node, 0.205, 0.562, 0.04);
  if (glowMat) gem.material = glowMat;
  const blade = wedge(spec, "prop", 0.105, 0.185, 0.055, STEEL, node, 0.211, 0.66, 0.04);
  blade.rotation.z = -0.17;
  const barb = wedge(spec, "prop", 0.065, 0.105, 0.048, STEEL_DARK, node, 0.157, 0.6, 0.04);
  barb.rotation.z = 1.05;
  box(spec, "flag", 0.13, 0.1, 0.018, spec.color, node, 0.275, 0.505, 0.04);
  const flagTip = wedge(spec, "flag", 0.06, 0.05, 0.018, spec.color, node, 0.305, 0.43, 0.04);
  flagTip.rotation.x = Math.PI; //  pennant tail point
  const trim = box(spec, "flag", 0.13, 0.018, 0.02, "#9ffaef", node, 0.275, 0.448, 0.04);
  if (glowMat) trim.material = glowMat;
  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/** Berserker v3 (Kharzul unique): shared skeleton with tall horns, both
 *  arms raised outward, twin axes with broad steel blades. */
function kharzulBerserkerV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const rig = nerivaneBodyV3(spec, node, glowMat, true);
  for (const sx of [-1, 1]) {
    const arm = box(spec, "arm", 0.055, 0.16, 0.06, rig.deep, node, sx * 0.17, 0.38, 0.02);
    arm.rotation.z = sx * 0.85;
    box(spec, "hand", 0.05, 0.052, 0.054, BONE, node, sx * 0.245, 0.44, 0.03);
    const handle = cyl(spec, "prop", 0.028, 0.028, 0.3, 5, GRIP, node, sx * 0.25, 0.52, 0.03);
    handle.rotation.z = sx * 0.18;
    const blade = wedge(spec, "prop", 0.075, 0.1, 0.04, STEEL, node, sx * 0.315, 0.635, 0.03);
    blade.rotation.z = sx * -(Math.PI / 2 - 0.25);
    box(spec, "prop", 0.045, 0.05, 0.038, STEEL_DARK, node, sx * 0.245, 0.645, 0.03);
  }
  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/** Arcanist v3 (Auren unique): robed mystic, tall circlet, raised orb. */
function aurenArcanistV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material, orbMat?: Material): { headY: number; shoulderY: number; orb: Mesh } {
  const deeper = darken(spec.color, 0.32);
  const deep = darken(spec.color, 0.45);
  fracturedStoneBase(spec, node, glowMat);
  const flare = cyl(spec, "robe", 0.27, 0.33, 0.08, 6, deeper, node, 0, 0.09, 0);
  flare.rotation.y = Math.PI / 6;
  const skirt = cyl(spec, "robe", 0.14, 0.27, 0.27, 6, deep, node, 0, 0.245, 0);
  skirt.rotation.y = Math.PI / 6;
  const rig = nerivaneUpperV3(spec, node, glowMat, true);
  // right arm hangs; left arm raised toward the floating focus orb
  const armR = box(spec, "arm", 0.055, 0.16, 0.065, rig.deep, node, 0.155, 0.32, 0.01);
  armR.rotation.z = -0.1;
  box(spec, "hand", 0.05, 0.05, 0.055, BONE, node, 0.148, 0.235, 0.015);
  const armL = box(spec, "arm", 0.055, 0.15, 0.06, rig.deep, node, -0.175, 0.38, 0.02);
  armL.rotation.z = -0.85;
  box(spec, "hand", 0.05, 0.052, 0.054, BONE, node, -0.245, 0.435, 0.03);
  const o = ball(spec, "orb", 0.052, "#9fe4ff", node, -0.26, 0.52, 0.03);
  if (orbMat) o.material = orbMat;
  return { headY: rig.headY, shoulderY: rig.shoulderY, orb: o };
}

/** Warden v3 (Sunwei unique): shared skeleton, tall hat, two-hand maul. */
function sunweiWardenV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const rig = nerivaneBodyV3(spec, node, glowMat, true);
  nerivaneArmsV3(spec, node, rig.deep, 0.205, 0.265, 0.04);
  // stone maul: thick haft, heavy head with steel caps
  cyl(spec, "prop", 0.04, 0.04, 0.5, 5, GRIP, node, 0.205, 0.27, 0.04);
  box(spec, "prop", 0.17, 0.1, 0.1, "#8f8fa3", node, 0.205, 0.565, 0.04);
  for (const sx of [-0.09, 0.09]) {
    box(spec, "prop", 0.022, 0.11, 0.105, STEEL_DARK, node, 0.205 + sx, 0.565, 0.04);
  }
  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/** Raider v3 (Vessari unique): war-steed + seated rider with raised sword
 *  and a saddle pennant — the plunderer reads faster and lighter. */
function vessariRaiderV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const deep = darken(spec.color, 0.45);
  const deeper = darken(spec.color, 0.32);
  const c = costumeFor(spec.defIndex);
  void c;
  fracturedStoneBase(spec, node, glowMat);
  const unit = new TransformNode("mount", spec.scene);
  unit.rotation.y = 1.45;
  unit.parent = node;
  const mDeep = darken(spec.color, 0.34);
  const mDark = darken(spec.color, 0.24);
  // lean wolf-steed: same quadruped frame, longer muzzle, tail raised
  box(spec, "mount", 0.16, 0.11, 0.22, mDeep, unit, 0, 0.15, 0);
  box(spec, "mount", 0.14, 0.11, 0.1, mDeep, unit, 0, 0.15, -0.14);
  box(spec, "mount", 0.11, 0.04, 0.18, mDark, unit, 0, 0.09, 0);
  const neck = box(spec, "mount", 0.085, 0.12, 0.07, mDeep, unit, 0, 0.2, 0.125);
  neck.rotation.x = 0.25;
  box(spec, "mount", 0.1, 0.085, 0.08, mDeep, unit, 0, 0.255, 0.17);
  box(spec, "mount", 0.055, 0.045, 0.08, mDark, unit, 0, 0.235, 0.235);
  for (const sx of [-0.038, 0.038]) {
    const ear = wedge(spec, "mount", 0.028, 0.05, 0.024, mDark, unit, sx, 0.315, 0.14);
    void ear;
  }
  for (const [lx, lz] of [[-0.085, 0.1], [0.085, 0.1], [-0.085, -0.14], [0.085, -0.14]] as const) {
    box(spec, "mount", 0.048, 0.1, 0.048, mDark, unit, lx, 0.095, lz);
  }
  const wTail = wedge(spec, "mount", 0.03, 0.08, 0.026, mDark, unit, 0, 0.21, -0.2);
  wTail.rotation.x = Math.PI - 0.9;
  box(spec, "mount", 0.19, 0.028, 0.085, spec.color, unit, 0, 0.212, -0.01);
  box(spec, "mount", 0.13, 0.035, 0.13, deeper, unit, 0, 0.227, -0.01);
  // seated rider (mirrors the rider build, sword in place of spear)
  const rider = new TransformNode("rider", spec.scene);
  rider.position.set(0, 0.247, 0);
  rider.scaling.setAll(0.78);
  rider.parent = node;
  for (const sx of [-0.1, 0.1]) {
    const thigh = box(spec, "leg", 0.06, 0.055, 0.11, deep, rider, sx, 0.025, 0.02);
    thigh.rotation.z = sx > 0 ? -0.35 : 0.35;
    box(spec, "leg", 0.048, 0.1, 0.055, deep, rider, sx * 1.38, -0.035, 0.03);
    box(spec, "leg", 0.05, 0.035, 0.08, deeper, rider, sx * 1.42, -0.09, 0.045);
  }
  box(spec, "torso", 0.15, 0.08, 0.105, deep, rider, 0, 0.06, 0);
  const chest = box(spec, "torso", 0.2, 0.13, 0.125, deep, rider, 0, 0.16, 0);
  chest.rotation.x = 0.09;
  const plate = box(spec, "torso", 0.125, 0.12, 0.026, spec.color, rider, 0, 0.155, 0.066);
  plate.rotation.x = 0.14;
  v3Emblem(spec, rider, 0.15, 0.088, 0.85, glowMat);
  for (const sx of [-0.12, 0.12]) {
    const pad = box(spec, "gear", 0.078, 0.04, 0.095, deeper, rider, sx, 0.23, 0);
    pad.rotation.z = sx > 0 ? -0.3 : 0.3;
  }
  const armL = box(spec, "arm", 0.05, 0.13, 0.06, deep, rider, -0.14, 0.15, 0.01);
  armL.rotation.z = 0.12;
  box(spec, "hand", 0.046, 0.046, 0.05, BONE, rider, -0.132, 0.083, 0.015);
  const armR = box(spec, "arm", 0.05, 0.13, 0.06, deep, rider, 0.155, 0.185, 0.02);
  armR.rotation.z = -0.7;
  box(spec, "hand", 0.048, 0.052, 0.052, BONE, rider, 0.215, 0.235, 0.03);
  boneMaskHead(spec, rider, 0.315);
  v3Headgear(spec, rider, 0.315, glowMat);
  // raised sword: angled blade + crossguard + pommel
  const bladeR = box(spec, "prop", 0.034, 0.27, 0.05, STEEL, rider, 0.26, 0.39, 0.03);
  bladeR.rotation.z = -0.35;
  box(spec, "prop", 0.09, 0.024, 0.055, STEEL_DARK, rider, 0.222, 0.28, 0.03);
  box(spec, "prop", 0.03, 0.045, 0.032, GRIP, rider, 0.212, 0.252, 0.03);
  // saddle pennant on the rear cantle
  const pole = cyl(spec, "prop", 0.014, 0.014, 0.22, 4, GRIP, rider, -0.09, 0.09, -0.09);
  void pole;
  box(spec, "flag", 0.07, 0.05, 0.012, spec.color, rider, -0.13, 0.185, -0.09);
  return { headY: 0.247 + 0.315 * 0.78, shoulderY: 0.247 + 0.23 * 0.78 };
}

/** Bulwark v3 (Dravok unique): shared skeleton + planted stone wall. */
function dravokBulwarkV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number } {
  const rig = nerivaneBodyV3(spec, node, glowMat, true);
  nerivaneArmsV3(spec, node, rig.deep, 0.14, 0.28, 0.1);
  // planted stone wall: broad slab, merlon caps, anvil mark carved proud
  box(spec, "prop", 0.4, 0.28, 0.055, "#8a8177", node, 0, 0.26, 0.2);
  for (const sx of [-0.14, 0.14]) {
    box(spec, "prop", 0.09, 0.07, 0.055, "#8a8177", node, sx, 0.43, 0.2);
  }
  box(spec, "prop", 0.4, 0.05, 0.06, "#6f6760", node, 0, 0.14, 0.2);
  v3Emblem(spec, node, 0.27, 0.235, 1.2, glowMat);
  return { headY: rig.headY, shoulderY: rig.shoulderY };
}

/* ---------- the shared rig ---------- */

interface RigOptions {
  /** torso height scale (bulky classes go wider/taller) */
  bulk?: number;
  /** skip legs (robed classes get a skirt instead) */
  robe?: boolean;
  /** override torso color (default tribe color) */
  torso?: string;
  /** v42 locked spec: faceted mask head instead of icosphere (Nerivane first) */
  mask?: boolean;
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
  if (opts.mask) maskHead(spec, parent, headY);
  else ball(spec, "head", 0.095, SKIN, parent, 0, headY, 0);
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

/* ---------- v42 Nerivane locked set (designer spec) ----------
 * Locked board-scale cues:
 *   Warrior    — vertical spear, short wedge-fin crest
 *   Archer     — bow spanning ~0.7H, visible swept quiver
 *   Defender   — shield ~half the projected body area
 *   Rider      — abstract aquatic mount: low body, dorsal fin, tail wedge
 *   Tidecaller — flared robe, tall crest, trident to ~1.3H
 *   Nereth     — 1.08H, thick crown, cape, banner-spear, aqua rim accent
 * Foot units stand ~0.58 local units tall (1.0H); all sizes derive from that.
 */
const H = 0.58; // 1.0H in local rig units (head top of a standard foot unit)

/** short crest: 2 large wedge planes (regular units) — spec forbids crystalline complexity */
function wedgeFinCrest(spec: CharacterSpec, parent: TransformNode, headY: number, tall = false, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const h1 = tall ? 0.2 : 0.11;
  const fin1 = wedge(spec, "gear", 0.04, h1, tall ? 0.16 : 0.11, c.accent, parent, 0, headY + 0.09 + h1 / 2 - 0.02, 0);
  fin1.rotation.x = -0.18; // swept back
  if (glowMat) fin1.material = glowMat;
  const h2 = h1 * 0.6;
  const fin2 = wedge(spec, "gear", 0.035, h2, (tall ? 0.16 : 0.11) * 0.7, darken(c.accent, 0.8), parent, 0, headY + 0.08 + h2 / 2 - 0.02, -0.055);
  fin2.rotation.x = -0.32;
  if (tall && glowMat) {
    // Tidecaller/Nereth only: third plane for the elaborate tall version
    const fin3 = wedge(spec, "gear", 0.03, h2 * 0.7, 0.09, c.accent, parent, 0, headY + 0.07, -0.1);
    fin3.rotation.x = -0.5;
    fin3.material = glowMat;
  }
}

/** v42 bow: prism arc from 3 angled box segments spanning ~0.7H + swept quiver */
function prismBow(spec: CharacterSpec, parent: TransformNode, shoulderY: number) {
  const span = 0.7 * H; // ≈0.41
  const segH = span / 2.6;
  const cx = 0.17;
  const cy = shoulderY - 0.02;
  const mid = box(spec, "prop", 0.024, segH, 0.03, WOOD_DARK, parent, cx, cy, 0);
  mid.rotation.x = 0; // vertical center segment
  for (const sy of [-1, 1]) {
    const limb = box(spec, "prop", 0.022, segH, 0.028, WOOD_DARK, parent, cx, cy + sy * segH * 0.82, sy * 0.035);
    limb.rotation.x = sy * 0.55; // angled limbs form the arc silhouette
  }
  // bowstring: thin box closing the arc (reads at 40px, cheap)
  box(spec, "prop", 0.008, span * 0.92, 0.008, BONE, parent, cx, cy, 0.052);
  // swept quiver on the back, clearly visible from side/rear angles
  const q = box(spec, "prop", 0.07, 0.2, 0.06, darken(spec.color, 0.65), parent, -0.06, shoulderY - 0.01, -0.13);
  q.rotation.x = 0.4;
  q.rotation.z = -0.15;
  // arrow fletching tips poking out
  const tips = wedge(spec, "prop", 0.06, 0.05, 0.05, BONE, parent, -0.085, shoulderY + 0.11, -0.175);
  tips.rotation.x = 0.4;
}

/** v42 trident extending to ~1.3H with wedge prongs */
function longTrident(spec: CharacterSpec, parent: TransformNode, glowMat?: Material) {
  const total = 1.3 * H; // ≈0.75
  const pole = cyl(spec, "prop", 0.024, 0.028, total, 5, BONE, parent, 0.16, total / 2 + 0.02, 0);
  void pole;
  const forkY = total - 0.06;
  // center prong
  const mid = wedge(spec, "prop", 0.035, 0.12, 0.03, STEEL, parent, 0.16, forkY + 0.08, 0);
  if (glowMat) mid.material = glowMat;
  // side prongs on a crossbar
  box(spec, "prop", 0.11, 0.022, 0.026, STEEL_DARK, parent, 0.16, forkY, 0);
  for (const sx of [-0.045, 0.045]) {
    const prong = wedge(spec, "prop", 0.03, 0.09, 0.026, STEEL, parent, 0.16 + sx, forkY + 0.06, 0);
    if (glowMat) prong.material = glowMat;
  }
}

/** v42 abstract aquatic mount: low wedge body + dorsal fin + tail wedge (no capsule, no legs) */
function aquaticMount(spec: CharacterSpec, parent: TransformNode, glowMat?: Material): number {
  const bodyHex = darken(spec.color, 0.75);
  const c = costumeFor(spec.defIndex);
  // low streamlined body: long box with chamfered nose wedge
  box(spec, "mount", 0.2, 0.13, 0.42, bodyHex, parent, 0, 0.13, 0);
  const nose = wedge(spec, "mount", 0.13, 0.16, 0.18, bodyHex, parent, 0, 0.13, 0.27);
  nose.rotation.x = Math.PI / 2; // point forward
  // dorsal fin — the silhouette cue, glowing accent
  const dorsal = wedge(spec, "mount", 0.035, 0.14, 0.14, c.accent, parent, 0, 0.26, -0.02);
  dorsal.rotation.x = -0.25;
  if (glowMat) dorsal.material = glowMat;
  // tail wedge, swept up
  const tail = wedge(spec, "mount", 0.1, 0.14, 0.03, darken(bodyHex, 0.8), parent, 0, 0.17, -0.27);
  tail.rotation.x = 0.9;
  // side fins — small, keep under the 40px detail floor but help 3/4 view
  for (const sx of [-0.12, 0.12]) {
    const finM = wedge(spec, "mount", 0.08, 0.1, 0.025, darken(bodyHex, 0.85), parent, sx, 0.1, 0.08);
    finM.rotation.z = sx > 0 ? -1.2 : 1.2;
  }
  return 0.2; // rider seat height offset (low body = lower seat than land mount)
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
  // v42 designer production standard: Nerivane is the first tribe rebuilt to the
  // locked board-model spec (faceted mask head, wedge crests, raised droplet
  // sigil, budgeted geometry). Other tribes keep the legacy rig until their pass.
  const NERI = spec.defIndex === 4;
  const V3 = spec.defIndex >= 0 && spec.defIndex <= 7; // all real tribes on the v3 skeleton (custom/raider camps keep legacy)

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
    // v3: Nerivane rider gets the full mount + seated-rider build
    if (V3 && t === "rider") return nerivaneRiderV3(spec, node, opts?.finMat);
    if (spec.defIndex === 3 && t === "raider") return vessariRaiderV3(spec, node, opts?.finMat);
    const seat = mount(spec, node);
    const riderRoot = new TransformNode("rider", spec.scene);
    riderRoot.position.y = seat;
    riderRoot.scaling.setAll(0.82);
    riderRoot.parent = node;
    const rig = buildRig(spec, riderRoot, { bulk: 0.9, mask: NERI });
    if (NERI) wedgeFinCrest(spec, riderRoot, rig.headY);
    else buildHeadgear(spec, riderRoot, rig.headY);
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
      if (NERI) dropletSigil(spec, riderRoot, rig.shoulderY - 0.08, 0.11, 0.85);
    }
    // scale-compensated: puck under the mount instead of rig's own
    return { headY: seat + rig.headY * 0.82, shoulderY: seat + rig.shoulderY * 0.82 };
  }

  // ----- humanoid classes on foot
  switch (t) {
    case "warrior": {
      // v3: Nerivane warrior locked to the approved mockup-driven build
      if (V3) return nerivaneWarriorV3(spec, node, opts?.finMat);
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      spear(spec, node, rig.shoulderY);
      return rig;
    }
    case "archer": {
      // v3: Nerivane archer on the shared locked skeleton
      if (V3) return nerivaneArcherV3(spec, node, opts?.finMat);
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      bow(spec, node, rig.shoulderY);
      return rig;
    }
    case "defender": {
      // v3: Nerivane defender on the shared locked skeleton
      if (V3) return nerivaneDefenderV3(spec, node, opts?.finMat);
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
      // v3: Auren arcanist on the shared system (robe, circlet, orb)
      if (spec.defIndex === 0) return aurenArcanistV3(spec, node, opts?.finMat, opts?.orbMat);
      // robed mystic; orb handled by caller (animated)
      const rig = buildRig(spec, node, { robe: true });
      buildHeadgear(spec, node, rig.headY);
      const o = orb(spec, node, rig.shoulderY, opts?.orbMat);
      return { ...rig, orb: o };
    }
    case "berserker": {
      // v3: Kharzul berserker on the shared skeleton (tall horns, twin axes)
      if (spec.defIndex === 1) return kharzulBerserkerV3(spec, node, opts?.finMat);
      const rig = buildRig(spec, node, { bulk: 1.25 });
      buildHeadgear(spec, node, rig.headY);
      axes(spec, node, rig.shoulderY);
      return rig;
    }
    case "warden": {
      // v3: Sunwei warden on the shared skeleton (tall hat, stone maul)
      if (spec.defIndex === 2) return sunweiWardenV3(spec, node, opts?.finMat);
      const rig = buildRig(spec, node, { bulk: 1.15, torso: STEEL_DARK });
      // stone peak cap instead of faction headgear — mountain sentinel identity
      cyl(spec, "gear", 0, 0.16, 0.12, 6, "#8f8fa3", node, 0, rig.headY + 0.08, 0);
      hammer(spec, node, rig.shoulderY);
      return rig;
    }
    case "tidecaller": {
      // v3: Nerivane tidecaller on the shared v3 system (robed lower body)
      if (NERI) return nerivaneTidecallerV3(spec, node, opts?.finMat);
      const rig = buildRig(spec, node, { robe: true, bulk: 1.05, mask: true });
      cyl(spec, "robe", 0.3, 0.42, 0.1, 8, darken(spec.color, 0.7), node, 0, 0.06, 0);
      wedgeFinCrest(spec, node, rig.headY, true, opts?.finMat);
      dropletSigil(spec, node, rig.shoulderY - 0.07, 0.13, 1.2);
      longTrident(spec, node, opts?.finMat);
      return rig;
    }
    case "bulwark": {
      // v3: Dravok bulwark on the shared skeleton (stone wall)
      if (spec.defIndex === 5) return dravokBulwarkV3(spec, node, opts?.finMat);
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
      // v3: Nereth on the shared v3 system (cape, crown, tall crest, banner)
      if (V3) return nerivaneHeroV3(spec, node, opts?.finMat);
      // regal: caped rig + banner spear; crown/pips handled by the renderer
      const rig = buildRig(spec, node, { bulk: 1.05, mask: NERI });
      // cape: flattened cone behind the torso
      const cape = cyl(spec, "prop", 0.1, 0.3, 0.3, 6, darken(spec.color, 0.7), node, 0, 0.26, -0.09);
      cape.scaling.z = 0.45;
      if (NERI) {
        // Nereth — locked cue: 1.08H max (hierarchy from crown/cape/banner, not height),
        // thick geometric crown, tall crest, raised sigil, restrained aqua accent
        wedgeFinCrest(spec, node, rig.headY, true, opts?.finMat);
        // thick crown: 6-sided band with three wedge points (raised geometry)
        cyl(spec, "gear", 0.17, 0.18, 0.05, 6, "#e7b552", node, 0, rig.headY + 0.075, 0);
        for (const a of [-0.6, 0, 0.6]) {
          wedge(spec, "gear", 0.05, 0.06, 0.03, "#e7b552", node, Math.sin(a) * 0.08, rig.headY + 0.125, Math.cos(a) * 0.08);
        }
        dropletSigil(spec, node, rig.shoulderY - 0.08, 0.12, 1.1);
        // clamp total height to 1.08H: crest+crown top out around 0.63 ≈ 1.08 * 0.58
        node.scaling.y = Math.min(1, (1.08 * H) / 0.66) * (node.scaling.y || 1);
      } else {
        buildHeadgear(spec, node, rig.headY);
      }
      // banner spear with tribe pennant
      cyl(spec, "prop", 0.03, 0.03, 0.6, 5, "#d9cfc0", node, 0.18, rig.shoulderY, 0);
      box(spec, "flag", 0.02, 0.12, 0.18, spec.color, node, 0.18, rig.shoulderY + 0.22, 0.1);
      return rig;
    }
    case "colossus": {
      // reward-only super unit: hulking stone giant, twice normal bulk
      const rig = buildRig(spec, node, { bulk: 1.6 });
      // massive shoulders + stone fists
      for (const sx of [-0.26, 0.26]) {
        ball(spec, "prop", 0.09, STEEL_DARK, node, sx, rig.shoulderY + 0.02, 0);
        ball(spec, "prop", 0.11, STEEL, node, sx * 1.25, rig.shoulderY - 0.22, 0.04);
      }
      // glowing rune chest plate in the tribe accent
      box(spec, "prop", 0.16, 0.16, 0.03, c.accent, node, 0, rig.shoulderY - 0.12, 0.18);
      // crown of jagged stone
      for (const [hx, hz] of [[-0.05, 0], [0.05, 0], [0, -0.05], [0, 0.05]] as const) {
        cyl(spec, "gear", 0, 0.04, 0.1, 4, STEEL_DARK, node, hx, rig.headY + 0.1, hz);
      }
      node.scaling.setAll(1.25);
      return rig;
    }
    default: {
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      return rig;
    }
  }
}
