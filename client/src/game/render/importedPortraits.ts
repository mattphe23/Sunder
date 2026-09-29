import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Node } from "@babylonjs/core/node";
import "@babylonjs/loaders/glTF";
import {
  NERIVANE_WARRIOR_PILOT,
  type ImportedModelCandidate,
} from "./importedModelRegistry";

export interface ImportedPortraitResult {
  masterPng: string;
  angles: string[];
}

const MASTER_SIZE = 512;
const FRAME_H = 0.72;
const FRAME_BOTTOM = -0.1 * FRAME_H;
const TARGET_MODEL_HEIGHT = 0.64;
const ANGLES = Array.from(
  { length: 8 },
  (_, index) => (index / 8) * Math.PI * 2
);

function canvasToWebp(canvas: HTMLCanvasElement, size: number) {
  const output = document.createElement("canvas");
  output.width = size;
  output.height = size;
  const context = output.getContext("2d");
  if (!context) return "";
  context.drawImage(canvas, 0, 0, size, size);
  return output.toDataURL("image/webp", 0.92);
}

/**
 * Loads the external pilot into an isolated Babylon scene and captures it with
 * the same orthographic framing used by the procedural portrait renderer.
 * This is intentionally a review harness: no live board unit is replaced.
 */
export async function renderImportedModel(
  candidate: ImportedModelCandidate
): Promise<ImportedPortraitResult | null> {
  const canvas = document.createElement("canvas");
  canvas.width = MASTER_SIZE;
  canvas.height = MASTER_SIZE;

  let engine: Engine;
  try {
    engine = new Engine(
      canvas,
      true,
      {
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      },
      false
    );
  } catch {
    return null;
  }

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);

  const hemi = new HemisphericLight(
    "imported-hemi",
    new Vector3(0.25, 1, 0.15),
    scene
  );
  hemi.intensity = 0.72;
  hemi.diffuse = Color3.White();
  hemi.groundColor = Color3.FromHexString("#6f6a90");
  hemi.specular = Color3.Black();

  const key = new DirectionalLight(
    "imported-key",
    new Vector3(-0.55, -1, 0.42),
    scene
  );
  key.intensity = 0.9;
  key.diffuse = Color3.FromHexString("#fff3e0");
  key.specular = Color3.White().scale(0.12);

  const midY = FRAME_BOTTOM + FRAME_H / 2;
  const camera = new ArcRotateCamera(
    "imported-camera",
    Math.PI / 4,
    1.15,
    3,
    new Vector3(0, midY, 0),
    scene
  );
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.orthoTop = FRAME_H / 2;
  camera.orthoBottom = -FRAME_H / 2;
  camera.orthoLeft = -FRAME_H / 2;
  camera.orthoRight = FRAME_H / 2;
  camera.minZ = 0.01;
  camera.maxZ = 20;
  scene.activeCamera = camera;

  try {
    const url = candidate.modelUrl;
    const slash = url.lastIndexOf("/") + 1;
    const imported = await SceneLoader.ImportMeshAsync(
      null,
      url.slice(0, slash),
      url.slice(slash),
      scene
    );
    const root = new TransformNode("imported-warrior-root", scene);
    const importedNodes: Node[] = [
      ...imported.transformNodes,
      ...imported.meshes,
    ];
    const importedNodeSet = new Set(importedNodes);
    for (const node of importedNodes) {
      if (!node.parent || !importedNodeSet.has(node.parent)) node.parent = root;
    }
    for (const mesh of imported.meshes) {
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.computeWorldMatrix(true);
    }

    const visibleMeshes = imported.meshes.filter(
      mesh => mesh.getTotalVertices() > 0
    );
    if (visibleMeshes.length === 0)
      throw new Error("The imported GLB contained no renderable meshes.");

    const minimum = new Vector3(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY
    );
    const maximum = new Vector3(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    );
    for (const mesh of visibleMeshes) {
      mesh.computeWorldMatrix(true);
      const bounds = mesh.getBoundingInfo().boundingBox;
      minimum.minimizeInPlace(bounds.minimumWorld);
      maximum.maximizeInPlace(bounds.maximumWorld);
    }

    const height = maximum.y - minimum.y;
    if (!Number.isFinite(height) || height <= 0)
      throw new Error("The imported GLB had invalid bounds.");
    const scale = TARGET_MODEL_HEIGHT / height;
    root.scaling.setAll(scale);
    root.position.set(
      -((minimum.x + maximum.x) / 2) * scale,
      -minimum.y * scale,
      -((minimum.z + maximum.z) / 2) * scale
    );

    await scene.whenReadyAsync(true);
    scene.render();
    await new Promise(resolve => setTimeout(resolve, 30));

    const capture = (yaw: number, size?: number) => {
      root.rotation.y = yaw;
      scene.render();
      scene.render();
      return size ? canvasToWebp(canvas, size) : canvas.toDataURL("image/png");
    };

    const masterPng = capture(Math.PI / 5);
    const angles = ANGLES.map(yaw => capture(yaw, 128));
    return { masterPng, angles };
  } finally {
    scene.dispose();
    engine.dispose();
  }
}

export function renderNerivaneWarriorPilot() {
  return renderImportedModel(NERIVANE_WARRIOR_PILOT);
}
