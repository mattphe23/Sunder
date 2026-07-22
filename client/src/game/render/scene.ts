// Polyforge Babylon render layer — Isoglow style: flat-shaded low-poly tiles
// floating in deep indigo void, warm key light, cool fill, gentle idle bob.

import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, MeshBuilder, StandardMaterial, Mesh,
  TransformNode, PointerEventTypes, Animation, EasingFunction, CubicEase,
} from "@babylonjs/core";
import { GameState, Tile, Unit, UnitType, idx } from "../core/types";
import { game } from "../core/state";
import { reachableTiles, attackableUnits, cityAt } from "../core/rules";

const TILE = 1.02;
const TERRAIN_COLORS: Record<string, string> = {
  grass: "#7ec850",
  forest: "#3e9142",
  mountain: "#b8c4d4",
  water: "#3f8fd4",
  ocean: "#20509c",
};
const TERRAIN_H: Record<string, number> = {
  grass: 0.3, forest: 0.34, mountain: 0.85, water: 0.14, ocean: 0.08,
};

export interface PickInfo {
  kind: "tile";
  x: number;
  y: number;
}

export class BoardRenderer {
  engine: Engine;
  scene: Scene;
  camera!: ArcRotateCamera;
  private root!: TransformNode;
  private tileMeshes = new Map<number, Mesh>();
  private decorMeshes = new Map<number, Mesh[]>();
  private unitMeshes = new Map<number, TransformNode>();
  private highlightMeshes: Mesh[] = [];
  private mats = new Map<string, StandardMaterial>();
  private disposed = false;
  private cameraInitialized = false;
  onPick: ((p: PickInfo) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { antialias: true, stencil: false });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color4.FromHexString("#141433ff");
    this.setupCameraLights(canvas);
    this.root = new TransformNode("root", this.scene);

    this.scene.onPointerObservable.add((pi) => {
      if (pi.type !== PointerEventTypes.POINTERTAP) return;
      const hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
      if (hit?.pickedMesh?.metadata?.tile) {
        const { x, y } = hit.pickedMesh.metadata;
        this.onPick?.({ kind: "tile", x, y });
      }
    });

    this.engine.runRenderLoop(() => {
      if (!this.disposed) this.scene.render();
    });
    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = () => this.engine.resize();

  private setupCameraLights(canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      "cam", -Math.PI / 2.6, Math.PI / 3.4, 16, Vector3.Zero(), this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 7;
    this.camera.upperRadiusLimit = 30;
    this.camera.upperBetaLimit = Math.PI / 2.6;
    this.camera.lowerBetaLimit = Math.PI / 8;
    this.camera.wheelPrecision = 30;
    this.camera.panningSensibility = 200;
    this.camera.panningAxis = new Vector3(1, 0, 1);
    (this.camera.inputs.attached as any).pointers.buttons = [0, 1, 2];

    const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, 0.1), this.scene);
    hemi.intensity = 0.75;
    hemi.diffuse = Color3.FromHexString("#dfe8ff");
    hemi.groundColor = Color3.FromHexString("#4a3a70");
    const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, 0.35), this.scene);
    sun.intensity = 0.9;
    sun.diffuse = Color3.FromHexString("#ffe9c4");
  }

  mat(hex: string): StandardMaterial {
    let m = this.mats.get(hex);
    if (!m) {
      m = new StandardMaterial("m" + hex, this.scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = new Color3(0.05, 0.05, 0.08);
      this.mats.set(hex, m);
    }
    return m;
  }

  center(size: number) {
    return (size - 1) / 2;
  }

  /** full rebuild of static board (called on new game / capture) */
  buildBoard(s: GameState) {
    this.tileMeshes.forEach((m) => m.dispose());
    this.tileMeshes.clear();
    this.decorMeshes.forEach((arr) => arr.forEach((m: Mesh) => m.dispose()));
    this.decorMeshes.clear();

    const c = this.center(s.size);
    const human = s.humanTribe;
    for (const t of s.tiles) {
      if (!t.explored[human]) continue;
      this.buildTile(s, t, c);
    }
    if (!this.cameraInitialized) {
      const cap = s.cities.find((ci) => ci.isCapital && ci.tribe === s.humanTribe);
      this.camera.target = cap ? new Vector3(cap.x - c, 0, cap.y - c) : Vector3.Zero();
      this.camera.radius = 13;
      this.cameraInitialized = true;
    }
  }

  private buildTile(s: GameState, t: Tile, c: number) {
    const key = idx(t.x, t.y, s.size);
    const h = TERRAIN_H[t.terrain];
    const box = MeshBuilder.CreateBox("t" + key, { width: TILE * 0.96, depth: TILE * 0.96, height: h }, this.scene);
    box.position = new Vector3(t.x - c, h / 2 - 0.4, t.y - c);
    box.material = this.mat(this.tileColor(s, t));
    box.metadata = { tile: true, x: t.x, y: t.y };
    box.parent = this.root;
    this.tileMeshes.set(key, box);

    const decor: Mesh[] = [];
    const top = h - 0.4;
    if (t.terrain === "forest") {
      for (let i = 0; i < 3; i++) {
        const tree = MeshBuilder.CreateCylinder("tr", { diameterTop: 0, diameterBottom: 0.28, height: 0.45, tessellation: 5 }, this.scene);
        tree.position = new Vector3(t.x - c + (i - 1) * 0.24, top + 0.22, t.y - c + ((i * 7) % 3 - 1) * 0.22);
        tree.material = this.mat("#2c7a34");
        tree.metadata = { tile: true, x: t.x, y: t.y };
        tree.parent = this.root;
        decor.push(tree);
      }
    }
    if (t.terrain === "mountain") {
      const peak = MeshBuilder.CreateCylinder("pk", { diameterTop: 0, diameterBottom: 0.55, height: 0.5, tessellation: 4 }, this.scene);
      peak.position = new Vector3(t.x - c, top + 0.25, t.y - c);
      peak.material = this.mat("#e8eef7");
      peak.metadata = { tile: true, x: t.x, y: t.y };
      peak.parent = this.root;
      decor.push(peak);
    }
    if (t.resource) {
      const rc = t.resource === "fruit" ? "#ff7854" : t.resource === "animal" ? "#c98d4a" : "#9ad7e8";
      const orb = MeshBuilder.CreateIcoSphere("res", { radius: 0.13, subdivisions: 1 }, this.scene);
      orb.position = new Vector3(t.x - c + 0.3, top + 0.14, t.y - c + 0.3);
      orb.material = this.mat(rc);
      orb.metadata = { tile: true, x: t.x, y: t.y };
      orb.parent = this.root;
      decor.push(orb);
    }
    const city = t.cityId !== null ? s.cities[t.cityId] : null;
    if (city) {
      const isNeutral = city.tribe === null;
      const col = isNeutral ? "#c9b896" : s.tribes[city.tribe!].color;
      const n = isNeutral ? 1 : Math.min(4, city.level + 1);
      for (let i = 0; i < n; i++) {
        const house = MeshBuilder.CreateBox("cty", { width: 0.26, depth: 0.26, height: 0.3 + i * 0.05 }, this.scene);
        const ang = (i / n) * Math.PI * 2;
        house.position = new Vector3(
          t.x - c + Math.cos(ang) * 0.22 * (n > 1 ? 1 : 0),
          top + 0.16 + i * 0.02,
          t.y - c + Math.sin(ang) * 0.22 * (n > 1 ? 1 : 0)
        );
        house.material = this.mat(col);
        house.metadata = { tile: true, x: t.x, y: t.y };
        house.parent = this.root;
        decor.push(house);
      }
      if (city.isCapital && city.tribe !== null) {
        const spire = MeshBuilder.CreateCylinder("cap", { diameterTop: 0, diameterBottom: 0.2, height: 0.55, tessellation: 4 }, this.scene);
        spire.position = new Vector3(t.x - c, top + 0.45, t.y - c);
        spire.material = this.mat("#ffd76a");
        spire.metadata = { tile: true, x: t.x, y: t.y };
        spire.parent = this.root;
        decor.push(spire);
      }
    }
    this.decorMeshes.set(key, decor);
  }

  private tileColor(s: GameState, t: Tile): string {
    let base = TERRAIN_COLORS[t.terrain];
    // tint owned borders toward owner color
    if (t.ownerCityId !== null) {
      const owner = s.cities[t.ownerCityId];
      if (owner.tribe !== null && (t.terrain === "grass" || t.terrain === "forest")) {
        const oc = Color3.FromHexString(s.tribes[owner.tribe].color);
        const bc = Color3.FromHexString(base);
        const mixed = Color3.Lerp(bc, oc, 0.22);
        base = mixed.toHexString();
      }
    }
    return base;
  }

  /** sync units to state (create/update/remove + animate moves) */
  syncUnits(s: GameState) {
    const c = this.center(s.size);
    const seen = new Set<number>();
    for (const u of s.units) {
      if (!s.tiles[idx(u.x, u.y, s.size)].explored[s.humanTribe]) continue;
      seen.add(u.id);
      let node = this.unitMeshes.get(u.id);
      if (!node) {
        node = this.buildUnitMesh(s, u);
        this.unitMeshes.set(u.id, node);
      }
      const h = TERRAIN_H[s.tiles[idx(u.x, u.y, s.size)].terrain];
      const target = new Vector3(u.x - c, h - 0.4 + 0.32, u.y - c);
      if (!node.position.equalsWithEpsilon(target, 0.01)) {
        this.animateMove(node, target);
      }
      // dim exhausted units
      const dim = u.moved && u.attacked && u.tribe === s.humanTribe;
      node.getChildMeshes().forEach((m) => (m.visibility = dim ? 0.55 : 1));
    }
    const toRemove: number[] = [];
    this.unitMeshes.forEach((node, id) => {
      if (!seen.has(id)) { node.dispose(); toRemove.push(id); }
    });
    toRemove.forEach((id) => this.unitMeshes.delete(id));
  }

  private buildUnitMesh(s: GameState, u: Unit): TransformNode {
    const node = new TransformNode("u" + u.id, this.scene);
    node.parent = this.root;
    const col = s.tribes[u.tribe].color;
    const shapes: Record<UnitType, () => Mesh> = {
      warrior: () => MeshBuilder.CreateBox("b", { size: 0.3 }, this.scene),
      archer: () => MeshBuilder.CreateCylinder("b", { diameterTop: 0, diameterBottom: 0.3, height: 0.42, tessellation: 6 }, this.scene),
      defender: () => MeshBuilder.CreateBox("b", { width: 0.38, depth: 0.2, height: 0.36 }, this.scene),
      rider: () => MeshBuilder.CreateCapsule("b", { radius: 0.13, height: 0.5, orientation: Vector3.Forward() }, this.scene),
      swordsman: () => MeshBuilder.CreateBox("b", { size: 0.34 }, this.scene),
      knight: () => MeshBuilder.CreateCapsule("b", { radius: 0.16, height: 0.55, orientation: Vector3.Forward() }, this.scene),
      catapult: () => MeshBuilder.CreateCylinder("b", { diameter: 0.36, height: 0.3, tessellation: 8 }, this.scene),
    };
    const body = shapes[u.type]();
    body.material = this.mat(col);
    body.parent = node;
    body.isPickable = false;
    // head dot for humanoid silhouette
    if (u.type !== "catapult") {
      const head = MeshBuilder.CreateIcoSphere("h", { radius: 0.1, subdivisions: 1 }, this.scene);
      head.position.y = 0.3;
      head.material = this.mat("#f5e6cf");
      head.parent = node;
      head.isPickable = false;
    }
    return node;
  }

  private animateMove(node: TransformNode, target: Vector3) {
    const anim = new Animation("mv", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([
      { frame: 0, value: node.position.clone() },
      { frame: 14, value: target },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    anim.setEasingFunction(ease);
    node.animations = [anim];
    this.scene.beginAnimation(node, 0, 14, false);
  }

  /** highlight reachable tiles / attackable enemies for the selected unit */
  showHighlights(s: GameState) {
    this.highlightMeshes.forEach((m) => m.dispose());
    this.highlightMeshes = [];
    const u = s.units.find((q) => q.id === s.selectedUnitId);
    if (!u || u.tribe !== s.humanTribe || s.currentTribe !== s.humanTribe) return;
    const c = this.center(s.size);

    for (const t of reachableTiles(s, u)) {
      const h = TERRAIN_H[s.tiles[idx(t.x, t.y, s.size)].terrain];
      const ring = MeshBuilder.CreateBox("hl", { width: TILE * 0.86, depth: TILE * 0.86, height: 0.02 }, this.scene);
      ring.position = new Vector3(t.x - c, h - 0.4 + 0.08, t.y - c);
      const m = new StandardMaterial("hlm", this.scene);
      m.diffuseColor = Color3.FromHexString("#ffffff");
      m.alpha = 0.35;
      m.emissiveColor = Color3.FromHexString("#8fb7ff");
      m.disableDepthWrite = true;
      m.zOffset = -2;
      ring.material = m;
      ring.metadata = { tile: true, x: t.x, y: t.y };
      ring.parent = this.root;
      this.highlightMeshes.push(ring);
    }
    for (const e of attackableUnits(s, u)) {
      const h = TERRAIN_H[s.tiles[idx(e.x, e.y, s.size)].terrain];
      const ring = MeshBuilder.CreateTorus("atk", { diameter: 0.7, thickness: 0.06, tessellation: 20 }, this.scene);
      ring.position = new Vector3(e.x - c, h - 0.4 + 0.1, e.y - c);
      const m = new StandardMaterial("atkm", this.scene);
      m.emissiveColor = Color3.FromHexString("#ff5d5d");
      m.diffuseColor = Color3.FromHexString("#ff5d5d");
      m.zOffset = -2;
      ring.material = m;
      ring.metadata = { tile: true, x: e.x, y: e.y };
      ring.parent = this.root;
      this.highlightMeshes.push(ring);
    }
    // selected marker
    const h = TERRAIN_H[s.tiles[idx(u.x, u.y, s.size)].terrain];
    const sel = MeshBuilder.CreateTorus("sel", { diameter: 0.8, thickness: 0.05, tessellation: 24 }, this.scene);
    sel.position = new Vector3(u.x - c, h - 0.4 + 0.08, u.y - c);
    const sm = new StandardMaterial("selm", this.scene);
    sm.emissiveColor = Color3.FromHexString("#ffd76a");
    sm.diffuseColor = Color3.FromHexString("#ffd76a");
    sel.material = sm;
    sel.isPickable = false;
    sel.parent = this.root;
    this.highlightMeshes.push(sel);
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener("resize", this.handleResize);
    this.scene.dispose();
    this.engine.dispose();
  }
}
