// v42 Path 2 — portrait standard (designer production spec).
// Renders unit portraits DIRECTLY from the same procedural Babylon meshes the
// board uses, eliminating drift between board units and portraits.
//
// Locked spec:
//   * orthographic three-quarter camera matching the game's neutral view
//   * transparent 1024×1024 PNG master
//   * runtime WebP exports at 512 / 256 / 128 / 64 px
//   * unit fills ~80% of the frame with a shared feet baseline
//   * no baked background, labels, or painterly lighting
//   * the fractured plinth stays a separate composable UI layer (not baked in)
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { buildCharacter, tribeGlow } from "./characters";
import { TRIBE_DEFS, type UnitType } from "../core/types";

export const PORTRAIT_MASTER_SIZE = 1024;
export const PORTRAIT_EXPORT_SIZES = [512, 256, 128, 64] as const;

/** Shared vertical window so every portrait shares the same feet baseline:
 *  feet (y=0) sit 10% above the frame bottom; a standard 1.0H unit (~0.58
 *  local + headgear) fills ~80% of the frame height. Taller silhouettes
 *  (Tidecaller trident ~0.79) intentionally reach nearer the top edge. */
const FRAME_H = 0.72;
const FRAME_BOTTOM = -0.1 * FRAME_H; // world y at the frame's bottom edge

export interface PortraitResult {
  /** 1024×1024 transparent PNG master */
  masterPng: string; // data URL
  /** WebP exports keyed by pixel size */
  webp: Record<number, string>; // data URLs
}

/**
 * A reusable offscreen portrait session: one engine + one scene, any number of
 * (unit, yaw) captures. Dispose when done.
 */
export function createPortraitSession() {
  const canvas = document.createElement("canvas");
  canvas.width = PORTRAIT_MASTER_SIZE;
  canvas.height = PORTRAIT_MASTER_SIZE;
  let engine: Engine;
  try {
    engine = new Engine(canvas, true, { alpha: true, antialias: true, preserveDrawingBuffer: true }, false);
  } catch {
    return null;
  }
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0); // transparent — no baked background

  // orthographic three-quarter camera matching the board's neutral view.
  // ArcRotateCamera pointed at the unit's mid-height: with an orthographic
  // camera the window is centered on the target, so a symmetric window puts
  // the figure dead-center with feet on the shared baseline.
  const midY = FRAME_BOTTOM + FRAME_H / 2;
  const cam = new ArcRotateCamera("cam", Math.PI / 4, 1.15, 3, new Vector3(0, midY, 0), scene);
  cam.mode = Camera.ORTHOGRAPHIC_CAMERA;
  cam.orthoTop = FRAME_H / 2;
  cam.orthoBottom = -FRAME_H / 2;
  cam.orthoLeft = -FRAME_H / 2;
  cam.orthoRight = FRAME_H / 2;
  cam.minZ = 0.05;
  cam.maxZ = 20;

  // unlit flat material cache — identical recipe to the board renderer's mat()
  const mats = new Map<string, StandardMaterial>();
  const mat = (hex: string) => {
    let m = mats.get(hex);
    if (!m) {
      m = new StandardMaterial("p" + hex, scene);
      m.emissiveColor = Color3.FromHexString(hex);
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.disableLighting = true;
      mats.set(hex, m);
    }
    return m;
  };
  // one emissive accent material per tribe glow color (cached)
  const glows = new Map<string, StandardMaterial>();
  const glowFor = (defIndex: number) => {
    const hex = tribeGlow(defIndex);
    let g = glows.get(hex);
    if (!g) {
      g = new StandardMaterial("glow" + hex, scene);
      g.emissiveColor = Color3.FromHexString(hex);
      g.diffuseColor = Color3.Black();
      g.disableLighting = true;
      glows.set(hex, g);
    }
    return g;
  };

  let root: TransformNode | null = null;
  let warmedUp = false;

  const capture = async (defIndex: number, type: UnitType, opts?: { yaw?: number; color?: string; sizes?: readonly number[] }): Promise<PortraitResult> => {
    // drop previous unit's meshes but PRESERVE the shared cached materials —
    // dispose(_, true) would kill them and later units would render invisible
    root?.dispose(false, false);
    root = new TransformNode("root", scene);
    const color = opts?.color ?? TRIBE_DEFS[defIndex]?.color ?? "#888888";
    const glow = glowFor(defIndex);
    buildCharacter({ scene, mat, color, defIndex, type }, root, { finMat: glow, orbMat: glow });
    root.rotation.y = opts?.yaw ?? Math.PI / 5; // 3/4 pose
    // readiness barrier on every capture: newly created meshes may still be
    // compiling effects; whenReadyAsync resolves immediately once the pipeline
    // is warm, so steady-state cost is negligible (no rAF — those throttle to
    // a crawl in hidden tabs).
    await scene.whenReadyAsync(true);
    if (!warmedUp) {
      // absorb first-frame GPU state churn once per session
      scene.render();
      await new Promise((r) => setTimeout(r, 30));
      await scene.whenReadyAsync(true);
      warmedUp = true;
    }
    scene.render();
    scene.render();
    const masterPng = canvas.toDataURL("image/png");
    const webp: Record<number, string> = {};
    for (const size of opts?.sizes ?? PORTRAIT_EXPORT_SIZES) {
      const c2 = document.createElement("canvas");
      c2.width = size;
      c2.height = size;
      const ctx = c2.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, size, size);
        webp[size] = c2.toDataURL("image/webp", 0.92);
      }
    }
    return { masterPng, webp };
  };

  const dispose = () => {
    scene.dispose();
    engine.dispose();
  };

  return { capture, dispose };
}

/** One-shot convenience wrapper around a session. */
export async function renderUnitPortrait(defIndex: number, type: UnitType, opts?: { yaw?: number; color?: string }): Promise<PortraitResult | null> {
  const s = createPortraitSession();
  if (!s) return null;
  try {
    return await s.capture(defIndex, type, opts);
  } finally {
    s.dispose();
  }
}

/** The six Nerivane classes covered by the v42 acceptance test. */
export const NERIVANE_PORTRAIT_SET: UnitType[] = ["warrior", "archer", "defender", "rider", "tidecaller", "hero"];
