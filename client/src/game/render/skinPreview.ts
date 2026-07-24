// Store skin previews — a tiny standalone Babylon scene that renders the
// shared character rig wearing a given store skin, on a slow turntable.
// Deliberately minimal: no post-processing, no shadows, one scene per canvas,
// disposed on unmount. Uses the same unlit flat-shaded material style as the
// main renderer so the preview matches in-game looks.
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { buildCharacter, setActiveSkins, SKINS } from "./characters";
import { loadActiveSkins } from "../ui/SkinsPanel";
import { TRIBE_DEFS, type UnitType } from "../core/types";

/** classes that read well in a tight portrait crop, cycled per skin for variety */
const PREVIEW_TYPES: UnitType[] = ["warrior", "archer", "swordsman", "rider", "defender", "warrior"];

export interface SkinPreviewHandle {
  dispose: () => void;
}

/**
 * Mounts a rotating rig preview for `skinKey` into `canvas`.
 * Returns null when WebGL is unavailable (caller shows a static fallback).
 */
export function mountSkinPreview(canvas: HTMLCanvasElement, skinKey: string): SkinPreviewHandle | null {
  const skin = SKINS.find((s) => s.key === skinKey);
  if (!skin) return null;

  let engine: Engine;
  try {
    engine = new Engine(canvas, true, { alpha: true, antialias: true }, false);
  } catch {
    return null;
  }

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0); // transparent — card bg shows through

  // orbiting camera: slight top-down, framing head-to-puck
  const cam = new ArcRotateCamera("cam", Math.PI / 3, 1.15, 1.55, new Vector3(0, 0.3, 0), scene);
  cam.minZ = 0.05;
  // no user input — pure turntable

  // unlit material cache, same recipe as the main renderer's mat()
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

  // apply the previewed skin via the shared costume override, then restore the
  // user's saved selection so a store visit never leaks into an in-progress game
  setActiveSkins({ [skin.tribe]: skin.key });
  const root = new TransformNode("root", scene);
  const type = PREVIEW_TYPES[skin.tribe % PREVIEW_TYPES.length];
  const color = skin.unitColor ?? TRIBE_DEFS[skin.tribe]?.color ?? "#888888";
  buildCharacter({ scene, mat, color, defIndex: skin.tribe, type }, root);
  setActiveSkins(loadActiveSkins());

  let t = 0;
  const render = () => {
    t += engine.getDeltaTime() / 1000;
    root.rotation.y = t * 0.7; // slow turntable
    root.position.y = Math.sin(t * 1.6) * 0.012; // gentle idle bob
    scene.render();
  };
  engine.runRenderLoop(render);

  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize);

  return {
    dispose: () => {
      window.removeEventListener("resize", onResize);
      engine.stopRenderLoop(render);
      scene.dispose();
      engine.dispose();
    },
  };
}
