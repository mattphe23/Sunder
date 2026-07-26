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
const STONE_TOP = "#8f8c96";
const STONE_SIDE = "#6b6873";

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
 *  backward, thick enough to survive 40px. Two shards total, nothing added. */
function crystalCrest(spec: CharacterSpec, parent: TransformNode, topY: number, glowMat?: Material) {
  const c = costumeFor(spec.defIndex);
  const main = wedge(spec, "gear", 0.05, 0.17, 0.22, c.accent, parent, 0, topY + 0.03, -0.085);
  main.rotation.x = -0.55;
  const back = wedge(spec, "gear", 0.035, 0.09, 0.1, c.accent, parent, 0, topY - 0.015, -0.16);
  back.rotation.x = -0.8;
  if (glowMat) {
    main.material = glowMat;
    back.material = glowMat;
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
function nerivaneBodyV3(spec: CharacterSpec, node: TransformNode, glowMat?: Material): { headY: number; shoulderY: number; deep: string; deeper: string } {
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
  nerivaneWaveEmblem(spec, node, 0.345, 0.098, 1, glowMat);

  // pauldrons: compact plates capping the shoulders
  for (const sx of [-0.135, 0.135]) {
    const pad = box(spec, "gear", 0.085, 0.042, 0.105, deeper, node, sx, shoulderY + 0.005, 0);
    pad.rotation.z = sx > 0 ? -0.3 : 0.3;
  }

  // head: faceted bone mask in a dark cowl + swept glowing crest
  const headY = 0.485;
  boneMaskHead(spec, node, headY);
  crystalCrest(spec, node, headY + 0.075, glowMat);

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
  nerivaneWaveEmblem(spec, node, 0.28, 0.235, 1.25, glowMat);

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
    // Nerivane rider: abstract aquatic mount per the locked spec
    const seat = NERI && t === "rider" ? aquaticMount(spec, node, opts?.finMat) : mount(spec, node);
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
      if (NERI) return nerivaneWarriorV3(spec, node, opts?.finMat);
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      spear(spec, node, rig.shoulderY);
      return rig;
    }
    case "archer": {
      // v3: Nerivane archer on the shared locked skeleton
      if (NERI) return nerivaneArcherV3(spec, node, opts?.finMat);
      const rig = buildRig(spec, node);
      buildHeadgear(spec, node, rig.headY);
      bow(spec, node, rig.shoulderY);
      return rig;
    }
    case "defender": {
      // v3: Nerivane defender on the shared locked skeleton
      if (NERI) return nerivaneDefenderV3(spec, node, opts?.finMat);
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
      // v42 locked cue: flared robe, tall crest, trident to ~1.3H
      const rig = buildRig(spec, node, { robe: true, bulk: 1.05, mask: true });
      // extra flare skirt under the rig's robe cone — silhouette widens at the base
      cyl(spec, "robe", 0.3, 0.42, 0.1, 8, darken(spec.color, 0.7), node, 0, 0.06, 0);
      wedgeFinCrest(spec, node, rig.headY, true, opts?.finMat); // tall 3-plane crest (unique-unit privilege)
      dropletSigil(spec, node, rig.shoulderY - 0.07, 0.13, 1.2);
      longTrident(spec, node, opts?.finMat); // extends to ~1.3H
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
