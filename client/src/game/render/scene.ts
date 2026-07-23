// Sunder Babylon render layer — Isoglow style: flat-shaded low-poly tiles
// floating in deep indigo void, warm key light, cool fill, gentle idle bob.

// Submodule imports (not the "@babylonjs/core" barrel) so tree-shaking can
// drop the unused bulk of the engine — the barrel produced a 6.5MB chunk that
// stalled CI minification during publish.
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Animation } from "@babylonjs/core/Animations/animation";
import { EasingFunction, CubicEase } from "@babylonjs/core/Animations/easing";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
// side-effect registrations the barrel used to pull in implicitly
import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Culling/ray";
// post-process pipeline shaders (image processing, bloom, FXAA) — without
// these the pipeline compiles broken vertex shaders at runtime
import "@babylonjs/core/Shaders/imageProcessing.fragment";
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Shaders/kernelBlur.fragment";
import "@babylonjs/core/Shaders/kernelBlur.vertex";
import "@babylonjs/core/Shaders/fxaa.fragment";
import "@babylonjs/core/Shaders/fxaa.vertex";
import "@babylonjs/core/Shaders/extractHighlights.fragment";
import "@babylonjs/core/Shaders/bloomMerge.fragment";
import "@babylonjs/core/Shaders/depthOfFieldMerge.fragment";
import "@babylonjs/core/Shaders/circleOfConfusion.fragment";
import "@babylonjs/core/Shaders/chromaticAberration.fragment";
import "@babylonjs/core/Shaders/grain.fragment";
import "@babylonjs/core/Shaders/sharpen.fragment";
import "@babylonjs/core/Shaders/particles.fragment";
import "@babylonjs/core/Shaders/particles.vertex";
import "@babylonjs/core/Shaders/shadowMap.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/depthBoxBlur.fragment";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { GameState, Tile, Unit, UnitType, idx } from "../core/types";
import { game } from "../core/state";
import { reachableTiles, attackableUnits, cityAt, isVisibleTo } from "../core/rules";

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
  private campMeshes = new Map<number, TransformNode>();
  private stormMeshes = new Map<number, TransformNode>();
  private highlightMeshes: Mesh[] = [];
  private mats = new Map<string, StandardMaterial>();
  private fxMeshes: Mesh[] = [];
  private disposed = false;
  private cameraInitialized = false;
  private shadowGen: ShadowGenerator | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;
  private lowQuality = false;
  private waterMats: StandardMaterial[] = [];
  private shimmerT = 0;
  onPick: ((p: PickInfo) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { antialias: true, stencil: false });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color4.FromHexString("#141433ff");
    this.setupCameraLights(canvas);
    this.setupPipeline();
    this.root = new TransformNode("root", this.scene);

    // water shimmer: gentle emissive pulse + hue drift on shared water materials
    this.scene.onBeforeRenderObservable.add(() => {
      this.shimmerT += this.engine.getDeltaTime() / 1000;
      const p = (Math.sin(this.shimmerT * 1.6) + 1) / 2; // 0..1 slow swell
      const q = (Math.sin(this.shimmerT * 2.7 + 1.3) + 1) / 2; // offset ripple
      for (const wm of this.waterMats) {
        const deep = wm.name.includes("ocean");
        const base = deep ? 0.045 : 0.085;
        const amp = deep ? 0.03 : 0.05;
        const e = base + amp * (0.6 * p + 0.4 * q);
        wm.emissiveColor.set(e * 0.55, e * 0.85, e * 1.35);
      }
    });

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
    // Mobile touch tuning: smooth, predictable pinch-to-zoom and lighter drift
    const pointers = (this.camera.inputs.attached as any).pointers;
    pointers.pinchPrecision = 60; // higher = slower, more controlled zoom
    pointers.pinchDeltaPercentage = 0.008; // proportional zoom feels natural at any radius
    pointers.multiTouchPanAndZoom = true; // two-finger drag pans while pinching zooms
    pointers.multiTouchPanning = true;
    this.camera.inertia = 0.75; // tighter stop, less drift after flicks
    this.camera.pinchToPanMaxDistance = 20;

    const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, 0.1), this.scene);
    hemi.intensity = 0.75;
    hemi.diffuse = Color3.FromHexString("#dfe8ff");
    hemi.groundColor = Color3.FromHexString("#4a3a70");
    const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, 0.35), this.scene);
    sun.intensity = 0.9;
    sun.diffuse = Color3.FromHexString("#ffe9c4");
    // soft blurred shadows from the warm key light
    sun.position = new Vector3(8, 14, -6);
    const sg = new ShadowGenerator(1024, sun);
    sg.useBlurExponentialShadowMap = true;
    sg.blurKernel = 16;
    sg.darkness = 0.55; // keep shadows soft and readable, not harsh black
    this.shadowGen = sg;
  }

  /** post-processing: bloom for glows, FXAA, filmic tone mapping, slight contrast */
  private setupPipeline() {
    const pipe = new DefaultRenderingPipeline("polyfx", true, this.scene, [this.camera]);
    this.pipeline = pipe;
    pipe.fxaaEnabled = true;
    pipe.bloomEnabled = true;
    pipe.bloomThreshold = 0.62;
    pipe.bloomWeight = 0.35;
    pipe.bloomKernel = 48;
    pipe.bloomScale = 0.5;
    pipe.imageProcessingEnabled = true;
    if (pipe.imageProcessing) {
      pipe.imageProcessing.toneMappingEnabled = true;
      pipe.imageProcessing.toneMappingType = 1; // ACES filmic
      pipe.imageProcessing.contrast = 1.12;
      pipe.imageProcessing.exposure = 1.06;
      pipe.imageProcessing.vignetteEnabled = true;
      pipe.imageProcessing.vignetteWeight = 1.6;
      pipe.imageProcessing.vignetteColor = new Color4(0.05, 0.05, 0.16, 0);
    }
    this.setupAdaptiveQuality();
  }

  /** drop expensive effects on software renderers or sustained low FPS */
  private setupAdaptiveQuality() {
    // 1) immediate: software GL (SwiftShader/llvmpipe) can never afford the full pipeline
    try {
      const gl = this.engine._gl as WebGLRenderingContext | undefined;
      const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
      const renderer = dbg ? String(gl!.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      if (/swiftshader|llvmpipe|software/i.test(renderer)) { this.applyLowQuality(); return; }
    } catch { /* detection unavailable — fall through to FPS monitor */ }
    // 2) reactive: if FPS stays under 24 for ~4 seconds, degrade gracefully
    let slowMs = 0;
    let last = performance.now();
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (dt > 42) slowMs += dt; else slowMs = Math.max(0, slowMs - dt * 0.5);
      if (slowMs > 4000) {
        this.applyLowQuality();
        this.scene.onBeforeRenderObservable.remove(obs);
      }
    });
  }

  private applyLowQuality() {
    if (this.lowQuality) return;
    this.lowQuality = true;
    if (this.pipeline) {
      this.pipeline.bloomEnabled = false;
      if (this.pipeline.imageProcessing) this.pipeline.imageProcessing.vignetteEnabled = false;
    }
    if (this.shadowGen) {
      this.shadowGen.dispose();
      this.shadowGen = null;
    }
    this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio > 1 ? 1.25 : 1));
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

  /** dedicated animated material for water tiles (kept out of the shared cache) */
  private waterMat(deep: boolean): StandardMaterial {
    const name = deep ? "water-ocean" : "water-shallow";
    let m = this.mats.get(name);
    if (!m) {
      m = new StandardMaterial(name, this.scene);
      m.diffuseColor = Color3.FromHexString(deep ? TERRAIN_COLORS.ocean : TERRAIN_COLORS.water);
      m.specularColor = new Color3(0.25, 0.3, 0.45);
      m.specularPower = 32;
      m.alpha = deep ? 0.92 : 0.9;
      this.mats.set(name, m);
      this.waterMats.push(m);
    }
    return m;
  }

  /** register a mesh as a shadow caster (and receiver for tiles) */
  private addShadows(m: Mesh, receiveOnly = false) {
    if (!this.shadowGen) return;
    if (!receiveOnly) this.shadowGen.addShadowCaster(m);
    m.receiveShadows = true;
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
    if (t.terrain === "water" || t.terrain === "ocean") {
      box.material = this.waterMat(t.terrain === "ocean");
    } else {
      box.material = this.mat(this.tileColor(s, t));
    }
    box.metadata = { tile: true, x: t.x, y: t.y };
    box.parent = this.root;
    this.addShadows(box, true); // tiles receive shadows
    // fog of war depth: explored but not currently visible → dimmed
    const visible = isVisibleTo(s, s.humanTribe, t.x, t.y);
    if (!visible) box.visibility = 0.45;
    this.tileMeshes.set(key, box);

    const decor: Mesh[] = [];
    const top = h - 0.4;
    if (t.port !== null) {
      // port: wooden pier ring + mast
      const pier = MeshBuilder.CreateCylinder("port", { diameter: 0.55, height: 0.1, tessellation: 8 }, this.scene);
      pier.position = new Vector3(t.x - c, top + 0.06, t.y - c);
      pier.material = this.mat("#a97c50");
      pier.metadata = { tile: true, x: t.x, y: t.y };
      pier.parent = this.root;
      decor.push(pier);
      const mast = MeshBuilder.CreateCylinder("mast", { diameter: 0.05, height: 0.5, tessellation: 6 }, this.scene);
      mast.position = new Vector3(t.x - c + 0.15, top + 0.3, t.y - c);
      mast.material = this.mat(s.tribes[t.port].color);
      mast.metadata = { tile: true, x: t.x, y: t.y };
      mast.parent = this.root;
      decor.push(mast);
    }
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
      if (!visible) { /* resources still shown dimmed */ }
      const rc = t.resource === "fruit" ? "#ff7854" : t.resource === "animal" ? "#c98d4a" : "#9ad7e8";
      const orb = MeshBuilder.CreateIcoSphere("res", { radius: 0.13, subdivisions: 1 }, this.scene);
      orb.position = new Vector3(t.x - c + 0.3, top + 0.14, t.y - c + 0.3);
      orb.material = this.mat(rc);
      orb.metadata = { tile: true, x: t.x, y: t.y };
      orb.parent = this.root;
      decor.push(orb);
    }
    if (t.ruin) {
      // ancient ruin: weathered obelisk with a glowing amber capstone
      const obelisk = MeshBuilder.CreateCylinder("ruin", { diameterTop: 0.12, diameterBottom: 0.26, height: 0.55, tessellation: 4 }, this.scene);
      obelisk.position = new Vector3(t.x - c, top + 0.28, t.y - c);
      obelisk.rotation.y = Math.PI / 5;
      obelisk.material = this.mat("#8f93b8");
      obelisk.metadata = { tile: true, x: t.x, y: t.y };
      obelisk.parent = this.root;
      decor.push(obelisk);
      const cap = MeshBuilder.CreateIcoSphere("ruincap", { radius: 0.09, subdivisions: 1 }, this.scene);
      cap.position = new Vector3(t.x - c, top + 0.62, t.y - c);
      let capMat = this.mats.get("ruin-glow");
      if (!capMat) {
        capMat = new StandardMaterial("ruin-glow", this.scene);
        capMat.diffuseColor = Color3.FromHexString("#ffd76a");
        capMat.emissiveColor = Color3.FromHexString("#b78a2e");
        this.mats.set("ruin-glow", capMat);
      }
      cap.material = capMat;
      cap.metadata = { tile: true, x: t.x, y: t.y };
      cap.parent = this.root;
      decor.push(cap);
      // low broken pillar beside it
      const stump = MeshBuilder.CreateCylinder("ruinstump", { diameterTop: 0.14, diameterBottom: 0.18, height: 0.18, tessellation: 4 }, this.scene);
      stump.position = new Vector3(t.x - c + 0.26, top + 0.09, t.y - c - 0.2);
      stump.rotation.y = Math.PI / 7;
      stump.material = this.mat("#767a9e");
      stump.metadata = { tile: true, x: t.x, y: t.y };
      stump.parent = this.root;
      decor.push(stump);
    }
    if (t.greatRuin) {
      // GREAT RUIN: golden twin obelisks flanking a floating radiant core
      let goldMat = this.mats.get("greatruin-gold");
      if (!goldMat) {
        goldMat = new StandardMaterial("greatruin-gold", this.scene);
        goldMat.diffuseColor = Color3.FromHexString("#e8c766");
        goldMat.emissiveColor = Color3.FromHexString("#7a5c14");
        this.mats.set("greatruin-gold", goldMat);
      }
      let coreMat = this.mats.get("greatruin-core");
      if (!coreMat) {
        coreMat = new StandardMaterial("greatruin-core", this.scene);
        coreMat.diffuseColor = Color3.FromHexString("#fff3c4");
        coreMat.emissiveColor = Color3.FromHexString("#e0a92e");
        this.mats.set("greatruin-core", coreMat);
      }
      for (const sx of [-0.28, 0.28]) {
        const pillar = MeshBuilder.CreateCylinder("greatruin", { diameterTop: 0.1, diameterBottom: 0.22, height: 0.8, tessellation: 4 }, this.scene);
        pillar.position = new Vector3(t.x - c + sx, top + 0.4, t.y - c - 0.18);
        pillar.rotation.y = Math.PI / 4;
        pillar.material = goldMat;
        pillar.metadata = { tile: true, x: t.x, y: t.y };
        pillar.parent = this.root;
        decor.push(pillar);
      }
      const core = MeshBuilder.CreateIcoSphere("greatruincore", { radius: 0.14, subdivisions: 1 }, this.scene);
      core.position = new Vector3(t.x - c, top + 0.95, t.y - c - 0.18);
      core.material = coreMat;
      core.metadata = { tile: true, x: t.x, y: t.y };
      core.parent = this.root;
      decor.push(core);
      // stone plinth base
      const plinth = MeshBuilder.CreateBox("greatruinbase", { width: 0.7, depth: 0.4, height: 0.12 }, this.scene);
      plinth.position = new Vector3(t.x - c, top + 0.06, t.y - c - 0.18);
      plinth.material = this.mat("#767a9e");
      plinth.metadata = { tile: true, x: t.x, y: t.y };
      plinth.parent = this.root;
      decor.push(plinth);
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
      if (city.walls) {
        // city walls: stone rampart ring with four corner towers
        let wallMat = this.mats.get("city-wall");
        if (!wallMat) {
          wallMat = new StandardMaterial("city-wall", this.scene);
          wallMat.diffuseColor = Color3.FromHexString("#a8a5b8");
          wallMat.specularColor = Color3.Black();
          this.mats.set("city-wall", wallMat);
        }
        const half = 0.44;
        const segs: { w: number; d: number; px: number; pz: number }[] = [
          { w: half * 2, d: 0.08, px: 0, pz: -half },
          { w: half * 2, d: 0.08, px: 0, pz: half },
          { w: 0.08, d: half * 2, px: -half, pz: 0 },
          { w: 0.08, d: half * 2, px: half, pz: 0 },
        ];
        for (const seg of segs) {
          const wall = MeshBuilder.CreateBox("wall", { width: seg.w, depth: seg.d, height: 0.22 }, this.scene);
          wall.position = new Vector3(t.x - c + seg.px, top + 0.11, t.y - c + seg.pz);
          wall.material = wallMat;
          wall.metadata = { tile: true, x: t.x, y: t.y };
          wall.parent = this.root;
          decor.push(wall);
        }
        for (const sx of [-half, half]) {
          for (const sz of [-half, half]) {
            const tower = MeshBuilder.CreateCylinder("walltower", { diameter: 0.16, height: 0.34, tessellation: 6 }, this.scene);
            tower.position = new Vector3(t.x - c + sx, top + 0.17, t.y - c + sz);
            tower.material = wallMat;
            tower.metadata = { tile: true, x: t.x, y: t.y };
            tower.parent = this.root;
            decor.push(tower);
          }
        }
      }
    }
    if (!visible) decor.forEach((m) => (m.visibility = 0.45));
    decor.forEach((m) => this.addShadows(m));
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
      // fog: enemy units only shown when their tile is currently visible
      const explored = s.tiles[idx(u.x, u.y, s.size)].explored[s.humanTribe];
      if (!explored) continue;
      // guardians are stationary landmarks: show once explored; other rivals need live vision
      if (!u.guardian && u.tribe !== s.humanTribe && !isVisibleTo(s, s.humanTribe, u.x, u.y)) continue;
      seen.add(u.id);
      let node = this.unitMeshes.get(u.id);
      if (!node) {
        node = this.buildUnitMesh(s, u);
        this.unitMeshes.set(u.id, node);
      }
      // veterancy: if a unit was promoted after its mesh was built, rebuild to add the crest
      if (u.veteran && !node.getChildMeshes().some((m) => m.name === "crest")) {
        node.dispose();
        node = this.buildUnitMesh(s, u);
        this.unitMeshes.set(u.id, node);
      }
      // hero: rebuild when level changes so the crown pips stay accurate
      if (u.hero && node.metadata?.heroLevel !== undefined && node.metadata.heroLevel !== (u.level ?? 1)) {
        node.dispose();
        node = this.buildUnitMesh(s, u);
        this.unitMeshes.set(u.id, node);
      }
      // v17: guardian awakening — rebuild with the burning red eye the first time we see it awake
      if (u.guardian && u.awake && !node.metadata?.awake) {
        node.dispose();
        node = this.buildUnitMesh(s, u);
        this.unitMeshes.set(u.id, node);
      }
      // naval: show/hide boat hull under the unit
      const hull = node.getChildMeshes().find((m) => m.name === "hull");
      if (u.boat && !hull) {
        const b = MeshBuilder.CreateBox("hull", { width: 0.5, depth: 0.3, height: 0.12 }, this.scene);
        b.position.y = -0.2;
        b.material = this.mat("#8a6642");
        b.parent = node;
        b.isPickable = false;
      } else if (!u.boat && hull) {
        hull.dispose();
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
    this.syncWorld(s);
  }

  /* ---------- v17 living map visuals ---------- */

  private syncWorld(s: GameState) {
    const c = this.center(s.size);
    // barbarian camps: tents + fire glow (visible once tile explored)
    const seenCamps = new Set<number>();
    for (const camp of s.camps ?? []) {
      if (!s.tiles[idx(camp.x, camp.y, s.size)].explored[s.humanTribe]) continue;
      seenCamps.add(camp.id);
      let node = this.campMeshes.get(camp.id);
      if (node && node.metadata?.strength !== camp.strength) { node.dispose(); node = undefined as unknown as TransformNode; this.campMeshes.delete(camp.id); }
      if (!node) {
        node = this.buildCampMesh(camp.strength);
        node.metadata = { strength: camp.strength };
        this.campMeshes.set(camp.id, node);
      }
      const h = TERRAIN_H[s.tiles[idx(camp.x, camp.y, s.size)].terrain];
      node.position = new Vector3(camp.x - c, h - 0.4, camp.y - c);
    }
    this.campMeshes.forEach((node, id) => {
      if (!seenCamps.has(id)) { node.dispose(); this.campMeshes.delete(id); }
    });
    // storms: brooding disc + lightning shard over water
    const seenStorms = new Set<number>();
    for (const st of s.storms ?? []) {
      seenStorms.add(st.id);
      let node = this.stormMeshes.get(st.id);
      if (!node) {
        node = this.buildStormMesh(st.radius);
        this.stormMeshes.set(st.id, node);
      }
      node.position = new Vector3(st.x - c, 0.35, st.y - c);
    }
    this.stormMeshes.forEach((node, id) => {
      if (!seenStorms.has(id)) { node.dispose(); this.stormMeshes.delete(id); }
    });
  }

  private buildCampMesh(strength: number): TransformNode {
    const node = new TransformNode("camp", this.scene);
    node.parent = this.root;
    const tentMat = this.mat("#6b4a32");
    const tents = Math.min(3, strength + 1);
    const offs = [[-0.18, -0.1], [0.2, -0.14], [0.02, 0.2]];
    for (let i = 0; i < tents; i++) {
      const tent = MeshBuilder.CreateCylinder("tent", { diameterTop: 0, diameterBottom: 0.3, height: 0.3, tessellation: 4 }, this.scene);
      tent.position.set(offs[i][0], 0.15, offs[i][1]);
      tent.rotation.y = i * 0.7;
      tent.material = tentMat;
      tent.parent = node;
      tent.isPickable = false;
      this.addShadows(tent);
    }
    // fire: glowing ember sphere
    let fireMat = this.mats.get("camp-fire");
    if (!fireMat) {
      fireMat = new StandardMaterial("camp-fire", this.scene);
      fireMat.diffuseColor = Color3.FromHexString("#ff7b2d");
      fireMat.emissiveColor = Color3.FromHexString("#e85d1a");
      this.mats.set("camp-fire", fireMat);
    }
    const fire = MeshBuilder.CreateIcoSphere("fire", { radius: 0.07, subdivisions: 1 }, this.scene);
    fire.position.set(-0.02, 0.08, 0.02);
    fire.material = fireMat;
    fire.parent = node;
    fire.isPickable = false;
    // skull totem at strength 3 (raid-ready warning)
    if (strength >= 3) {
      const totem = MeshBuilder.CreateCylinder("totem", { diameter: 0.06, height: 0.5 }, this.scene);
      totem.position.set(0.12, 0.25, 0.12);
      totem.material = this.mat("#3a3148");
      totem.parent = node;
      totem.isPickable = false;
      const skull = MeshBuilder.CreateIcoSphere("skull", { radius: 0.07, subdivisions: 1 }, this.scene);
      skull.position.set(0.12, 0.54, 0.12);
      skull.material = this.mat("#d8d3c8");
      skull.parent = node;
      skull.isPickable = false;
    }
    return node;
  }

  private buildStormMesh(radius: number): TransformNode {
    const node = new TransformNode("storm", this.scene);
    node.parent = this.root;
    let cloudMat = this.mats.get("storm-cloud");
    if (!cloudMat) {
      cloudMat = new StandardMaterial("storm-cloud", this.scene);
      cloudMat.diffuseColor = Color3.FromHexString("#2a2d45");
      cloudMat.emissiveColor = Color3.FromHexString("#141628");
      cloudMat.alpha = 0.82;
      this.mats.set("storm-cloud", cloudMat);
    }
    let boltMat = this.mats.get("storm-bolt");
    if (!boltMat) {
      boltMat = new StandardMaterial("storm-bolt", this.scene);
      boltMat.diffuseColor = Color3.FromHexString("#9db8ff");
      boltMat.emissiveColor = Color3.FromHexString("#7d9dff");
      this.mats.set("storm-bolt", boltMat);
    }
    // layered cloud discs
    const span = radius * 2 + 0.8;
    for (let i = 0; i < 3; i++) {
      const puff = MeshBuilder.CreateIcoSphere("puff", { radius: span * (0.28 - i * 0.05), subdivisions: 1 }, this.scene);
      puff.position.set((i - 1) * span * 0.22, 0.1 + i * 0.08, ((i % 2) - 0.5) * span * 0.16);
      puff.scaling.y = 0.45;
      puff.material = cloudMat;
      puff.parent = node;
      puff.isPickable = false;
    }
    // lightning shard
    const bolt = MeshBuilder.CreateCylinder("bolt", { diameterTop: 0.02, diameterBottom: 0.07, height: 0.42, tessellation: 3 }, this.scene);
    bolt.position.set(0.08, -0.18, 0);
    bolt.rotation.z = 0.25;
    bolt.material = boltMat;
    bolt.parent = node;
    bolt.isPickable = false;
    // slow brooding rotation
    const start = performance.now();
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      if (node.isDisposed()) { this.scene.onBeforeRenderObservable.remove(obs); return; }
      const t = (performance.now() - start) / 1000;
      node.rotation.y = t * 0.25;
      const b = node.getChildMeshes().find((m) => m.name === "bolt");
      if (b) b.visibility = (Math.sin(t * 5.5) > 0.82 ? 1 : 0.15);
    });
    return node;
  }

  private buildUnitMesh(s: GameState, u: Unit): TransformNode {
    const node = new TransformNode("u" + u.id, this.scene);
    node.parent = this.root;
    if (u.guardian) {
      // Great Ruin guardian: obsidian sentinel with a glowing amber eye
      const gbody = MeshBuilder.CreateCylinder("b", { diameterTop: 0.16, diameterBottom: 0.4, height: 0.55, tessellation: 5 }, this.scene);
      gbody.material = this.mat("#2b2540");
      gbody.parent = node;
      gbody.isPickable = false;
      const eye = MeshBuilder.CreateIcoSphere("h", { radius: 0.09, subdivisions: 1 }, this.scene);
      eye.position.y = 0.34;
      // v17: an awakened guardian's eye burns red — dormant ones glow amber
      const eyeKey = u.awake ? "guardian-eye-awake" : "guardian-eye";
      let eyeMat = this.mats.get(eyeKey);
      if (!eyeMat) {
        eyeMat = new StandardMaterial(eyeKey, this.scene);
        eyeMat.diffuseColor = Color3.FromHexString(u.awake ? "#ff4d3d" : "#ffb938");
        eyeMat.emissiveColor = Color3.FromHexString(u.awake ? "#e8291a" : "#d98f1f");
        this.mats.set(eyeKey, eyeMat);
      }
      eye.material = eyeMat;
      eye.parent = node;
      eye.isPickable = false;
      for (const sx of [-0.22, 0.22]) {
        const p = MeshBuilder.CreateBox("p", { size: 0.14 }, this.scene);
        p.position.set(sx, 0.18, 0);
        p.material = this.mat("#443c66");
        p.parent = node;
        p.isPickable = false;
      }
      node.metadata = { awake: !!u.awake };
      node.getChildMeshes().forEach((m) => this.addShadows(m as Mesh));
      return node;
    }
    // v17: camp raiders are tribeless — dark iron & bone palette
    const col = u.tribe < 0 ? "#5a4a52" : s.tribes[u.tribe].color;
    const shapes: Record<UnitType, () => Mesh> = {
      warrior: () => MeshBuilder.CreateBox("b", { size: 0.3 }, this.scene),
      archer: () => MeshBuilder.CreateCylinder("b", { diameterTop: 0, diameterBottom: 0.3, height: 0.42, tessellation: 6 }, this.scene),
      defender: () => MeshBuilder.CreateBox("b", { width: 0.38, depth: 0.2, height: 0.36 }, this.scene),
      rider: () => MeshBuilder.CreateCapsule("b", { radius: 0.13, height: 0.5, orientation: Vector3.Forward() }, this.scene),
      swordsman: () => MeshBuilder.CreateBox("b", { size: 0.34 }, this.scene),
      knight: () => MeshBuilder.CreateCapsule("b", { radius: 0.16, height: 0.55, orientation: Vector3.Forward() }, this.scene),
      catapult: () => {
        // siege engine: wooden base frame + angled throwing arm + boulder
        const base = MeshBuilder.CreateBox("b", { width: 0.4, depth: 0.3, height: 0.12 }, this.scene);
        const wood = this.mat("#8a6a42");
        const arm = MeshBuilder.CreateBox("arm", { width: 0.06, depth: 0.42, height: 0.06 }, this.scene);
        arm.position = new Vector3(0, 0.18, -0.05);
        arm.rotation.x = -Math.PI / 5;
        arm.material = wood;
        arm.isPickable = false;
        arm.parent = base;
        const boulder = MeshBuilder.CreateIcoSphere("boulder", { radius: 0.08, subdivisions: 1 }, this.scene);
        boulder.position = new Vector3(0, 0.32, -0.22);
        boulder.material = this.mat("#9a97a8");
        boulder.isPickable = false;
        boulder.parent = base;
        for (const sx of [-0.17, 0.17]) {
          const wheel = MeshBuilder.CreateCylinder("wheel", { diameter: 0.14, height: 0.05, tessellation: 8 }, this.scene);
          wheel.rotation.z = Math.PI / 2;
          wheel.position = new Vector3(sx, -0.04, 0.08);
          wheel.material = wood;
          wheel.isPickable = false;
          wheel.parent = base;
        }
        return base;
      },
      // Auren Arcanist — hooded mystic: tall robe cone with a floating rune orb
      arcanist: () => {
        const robe = MeshBuilder.CreateCylinder("b", { diameterTop: 0.1, diameterBottom: 0.32, height: 0.48, tessellation: 6 }, this.scene);
        const orb = MeshBuilder.CreateIcoSphere("orb", { radius: 0.07, subdivisions: 1 }, this.scene);
        orb.position = new Vector3(0.16, 0.42, 0);
        let om = this.mats.get("arcanist-orb");
        if (!om) {
          om = new StandardMaterial("arcanist-orb", this.scene);
          (om as StandardMaterial).diffuseColor = Color3.FromHexString("#7fd8ff");
          (om as StandardMaterial).emissiveColor = Color3.FromHexString("#4fb6ec");
          this.mats.set("arcanist-orb", om);
        }
        orb.material = om;
        orb.isPickable = false;
        orb.parent = robe;
        const bob = new Animation("orbBob", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        bob.setKeys([{ frame: 0, value: 0.42 }, { frame: 45, value: 0.5 }, { frame: 90, value: 0.42 }]);
        orb.animations = [bob];
        this.scene.beginAnimation(orb, 0, 90, true);
        return robe;
      },
      // Kharzul Berserker — hulking brute: wide slab body with two jutting axe blades
      berserker: () => {
        const body = MeshBuilder.CreateBox("b", { width: 0.4, depth: 0.26, height: 0.34 }, this.scene);
        for (const sx of [-0.26, 0.26]) {
          const blade = MeshBuilder.CreateCylinder("blade", { diameterTop: 0, diameterBottom: 0.14, height: 0.22, tessellation: 4 }, this.scene);
          blade.position = new Vector3(sx, 0.2, 0);
          blade.rotation.z = sx > 0 ? -Math.PI / 7 : Math.PI / 7;
          blade.material = this.mat("#c9c4d4");
          blade.isPickable = false;
          blade.parent = body;
        }
        return body;
      },
      // Sunwei Warden — mountain sentinel: squat stone-flanked tower with a peak cap
      warden: () => {
        const body = MeshBuilder.CreateCylinder("b", { diameterTop: 0.26, diameterBottom: 0.36, height: 0.4, tessellation: 6 }, this.scene);
        const cap = MeshBuilder.CreateCylinder("cap", { diameterTop: 0, diameterBottom: 0.3, height: 0.16, tessellation: 6 }, this.scene);
        cap.position.y = 0.28;
        cap.material = this.mat("#8f8fa3");
        cap.isPickable = false;
        cap.parent = body;
        return body;
      },
      // Vessari Raider — sleek low rider: forward capsule with twin saddle pennants
      raider: () => {
        const body = MeshBuilder.CreateCapsule("b", { radius: 0.12, height: 0.56, orientation: Vector3.Forward() }, this.scene);
        const pennant = MeshBuilder.CreateCylinder("pennant", { diameterTop: 0, diameterBottom: 0.09, height: 0.2, tessellation: 4 }, this.scene);
        pennant.position = new Vector3(0, 0.24, -0.14);
        pennant.material = this.mat("#ffb938");
        pennant.isPickable = false;
        pennant.parent = body;
        return body;
      },
      // Nerivane Tidecaller — sleek swimmer: slim body with a cresting glowing fin
      tidecaller: () => {
        const body = MeshBuilder.CreateCapsule("b", { radius: 0.12, height: 0.46 }, this.scene);
        const fin = MeshBuilder.CreateCylinder("fin", { diameterTop: 0, diameterBottom: 0.18, height: 0.24, tessellation: 3 }, this.scene);
        fin.position = new Vector3(0, 0.32, 0.1);
        fin.rotation.x = -0.55;
        let fm = this.mats.get("tide-fin");
        if (!fm) {
          fm = new StandardMaterial("tide-fin", this.scene);
          (fm as StandardMaterial).diffuseColor = Color3.FromHexString("#7ff0e3");
          (fm as StandardMaterial).emissiveColor = Color3.FromHexString("#1a9e8f");
          this.mats.set("tide-fin", fm);
        }
        fin.material = fm;
        fin.isPickable = false;
        fin.parent = body;
        const trident = MeshBuilder.CreateCylinder("trident", { diameter: 0.035, height: 0.44, tessellation: 5 }, this.scene);
        trident.position = new Vector3(0.15, 0.12, 0);
        trident.material = this.mat("#e8fffb");
        trident.isPickable = false;
        trident.parent = body;
        return body;
      },
      // Dravok Bulwark — living rampart: wide squat body behind a broad stone slab shield
      bulwark: () => {
        const body = MeshBuilder.CreateBox("b", { width: 0.34, depth: 0.24, height: 0.38 }, this.scene);
        const slab = MeshBuilder.CreateBox("slab", { width: 0.46, height: 0.36, depth: 0.07 }, this.scene);
        slab.position = new Vector3(0, 0.04, 0.17);
        slab.material = this.mat("#8a8177");
        slab.isPickable = false;
        slab.parent = body;
        for (const sx of [-0.2, 0.2]) {
          const merlon = MeshBuilder.CreateBox("merlon", { width: 0.08, height: 0.1, depth: 0.07 }, this.scene);
          merlon.position = new Vector3(sx, 0.26, 0.17);
          merlon.material = this.mat("#8a8177");
          merlon.isPickable = false;
          merlon.parent = body;
        }
        return body;
      },
      // v16 Hero Commander — regal figure: caped body, banner spear, floating molten crown
      hero: () => {
        const body = MeshBuilder.CreateCylinder("b", { diameterTop: 0.2, diameterBottom: 0.34, height: 0.46, tessellation: 6 }, this.scene);
        // banner spear with tribe-color pennant
        const pole = MeshBuilder.CreateCylinder("pole", { diameter: 0.03, height: 0.6, tessellation: 5 }, this.scene);
        pole.position = new Vector3(0.18, 0.2, 0);
        pole.material = this.mat("#d9cfc0");
        pole.isPickable = false;
        pole.parent = body;
        const flag = MeshBuilder.CreateBox("flag", { width: 0.02, height: 0.12, depth: 0.18 }, this.scene);
        flag.position = new Vector3(0.18, 0.42, 0.1);
        flag.material = this.mat(col);
        flag.isPickable = false;
        flag.parent = body;
        // floating molten crown — the commander's mark
        const crown = MeshBuilder.CreateTorus("crown", { diameter: 0.2, thickness: 0.04, tessellation: 6 }, this.scene);
        crown.position.y = 0.52;
        let hm = this.mats.get("hero-crown");
        if (!hm) {
          hm = new StandardMaterial("hero-crown", this.scene);
          (hm as StandardMaterial).diffuseColor = Color3.FromHexString("#ffb938");
          (hm as StandardMaterial).emissiveColor = Color3.FromHexString("#ff8c1f");
          this.mats.set("hero-crown", hm);
        }
        crown.material = hm;
        crown.isPickable = false;
        crown.parent = body;
        const spin = new Animation("crownSpin", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        spin.setKeys([{ frame: 0, value: 0 }, { frame: 120, value: Math.PI * 2 }]);
        crown.animations = [spin];
        this.scene.beginAnimation(crown, 0, 120, true);
        // level pips: tiny gems orbiting the crown (level - 1 of them)
        const lvl = Math.min(4, u.level ?? 1);
        for (let i = 1; i < lvl; i++) {
          const pip = MeshBuilder.CreatePolyhedron("pip", { type: 1, size: 0.035 }, this.scene);
          const ang = (i / 3) * Math.PI * 2;
          pip.position = new Vector3(Math.cos(ang) * 0.14, 0.52, Math.sin(ang) * 0.14);
          pip.material = hm;
          pip.isPickable = false;
          pip.parent = body;
        }
        return body;
      },
    };
    const body = shapes[u.type]();
    if (u.type !== "catapult") body.material = this.mat(col);
    else body.material = this.mat(col); // frame carries the tribe color; details stay wood/stone
    body.parent = node;
    body.isPickable = false;
    // head dot for humanoid silhouette
    if (u.type !== "catapult" && u.type !== "warden" && u.type !== "arcanist" && u.type !== "hero") {
      const head = MeshBuilder.CreateIcoSphere("h", { radius: 0.1, subdivisions: 1 }, this.scene);
      head.position.y = 0.3;
      head.material = this.mat("#f5e6cf");
      head.parent = node;
      head.isPickable = false;
    }
    if (u.hero) node.metadata = { ...(node.metadata ?? {}), heroLevel: u.level ?? 1 };
    // veteran crest: golden rotating diamond floating above the unit
    if (u.veteran) {
      const crest = MeshBuilder.CreatePolyhedron("crest", { type: 1, size: 0.07 }, this.scene);
      crest.position.y = u.type === "catapult" ? 0.42 : 0.55;
      let cm = this.mats.get("vet-crest");
      if (!cm) {
        cm = new StandardMaterial("vet-crest", this.scene);
        (cm as StandardMaterial).diffuseColor = Color3.FromHexString("#ffb938");
        (cm as StandardMaterial).emissiveColor = Color3.FromHexString("#e8a41f");
        this.mats.set("vet-crest", cm);
      }
      crest.material = cm;
      crest.parent = node;
      crest.isPickable = false;
      const spin = new Animation("crestSpin", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
      spin.setKeys([{ frame: 0, value: 0 }, { frame: 90, value: Math.PI * 2 }]);
      crest.animations = [spin];
      this.scene.beginAnimation(crest, 0, 90, true);
    }
    node.getChildMeshes().forEach((m) => this.addShadows(m as Mesh));
    return node;
  }

  /** white emissive flash on a struck unit (hit feedback) */
  hitFlash(unitId: number) {
    const node = this.unitMeshes.get(unitId);
    if (!node) return;
    node.getChildMeshes().forEach((m) => {
      const mat = m.material as StandardMaterial | null;
      if (!mat) return;
      // clone so the flash never leaks into the shared material cache
      const flashMat = mat.clone(mat.name + "-flash");
      flashMat.emissiveColor = new Color3(0.95, 0.95, 1);
      m.material = flashMat;
      setTimeout(() => {
        if (!m.isDisposed()) m.material = mat;
        flashMat.dispose();
      }, 130);
    });
  }

  private animateMove(node: TransformNode, target: Vector3) {
    const from = node.position.clone();
    // arc hop: lift at midpoint proportional to distance (capped)
    const dist = Vector3.Distance(from, target);
    const lift = Math.min(0.5, 0.22 + dist * 0.08);
    const mid = Vector3.Lerp(from, target, 0.5);
    mid.y = Math.max(from.y, target.y) + lift;
    const anim = new Animation("mv", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([
      { frame: 0, value: from },
      { frame: 8, value: mid },
      { frame: 16, value: target },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    anim.setEasingFunction(ease);
    // squash & stretch: stretch tall mid-hop, squash on landing, settle back
    const sq = new Animation("sq", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    sq.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 4, value: new Vector3(0.92, 1.12, 0.92) },
      { frame: 8, value: new Vector3(0.95, 1.08, 0.95) },
      { frame: 16, value: new Vector3(1.1, 0.85, 1.1) },
      { frame: 22, value: new Vector3(1, 1, 1) },
    ]);
    node.animations = [anim, sq];
    this.scene.beginAnimation(node, 0, 22, false);
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

  // ---------- combat juice ----------

  /** floating damage number that rises and fades */
  showDamageNumber(s: GameState, x: number, y: number, amount: number, color = "#ff6b6b") {
    if (amount <= 0) return;
    const c = this.center(s.size);
    const h = TERRAIN_H[s.tiles[idx(x, y, s.size)].terrain];
    const size = 256;
    const dt = new DynamicTexture("dmg", { width: size, height: size }, this.scene, false);
    dt.hasAlpha = true;
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, size, size);
    dt.drawText(`-${amount}`, null, 150, "bold 110px Fredoka, sans-serif", color, "transparent", true);
    const plane = MeshBuilder.CreatePlane("dmgp", { size: 0.9 }, this.scene);
    const m = new StandardMaterial("dmgm", this.scene);
    m.diffuseTexture = dt;
    m.emissiveColor = Color3.White();
    m.useAlphaFromDiffuseTexture = true;
    m.disableDepthWrite = true;
    m.backFaceCulling = false;
    plane.material = m;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.position = new Vector3(x - c, h - 0.4 + 0.9, y - c);
    plane.isPickable = false;
    plane.parent = this.root;
    this.fxMeshes.push(plane);

    const rise = new Animation("rise", "position.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    rise.setKeys([
      { frame: 0, value: plane.position.y },
      { frame: 50, value: plane.position.y + 0.85 },
    ]);
    const fade = new Animation("fade", "visibility", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    fade.setKeys([
      { frame: 0, value: 1 },
      { frame: 30, value: 1 },
      { frame: 50, value: 0 },
    ]);
    plane.animations = [rise, fade];
    this.scene.beginAnimation(plane, 0, 50, false, 1, () => {
      plane.dispose();
      dt.dispose();
      this.fxMeshes = this.fxMeshes.filter((q) => q !== plane);
    });
  }

  /** attacker lunges toward the defender and snaps back */
  lungeUnit(s: GameState, attackerId: number, tx: number, ty: number) {
    const node = this.unitMeshes.get(attackerId);
    if (!node) return;
    const c = this.center(s.size);
    const from = node.position.clone();
    const toward = new Vector3(tx - c, from.y, ty - c);
    const mid = Vector3.Lerp(from, toward, 0.45);
    const anim = new Animation("lunge", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([
      { frame: 0, value: from },
      { frame: 6, value: mid },
      { frame: 14, value: from },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    anim.setEasingFunction(ease);
    node.animations = [anim];
    this.scene.beginAnimation(node, 0, 14, false);
  }

  /** amber star-burst particle effect on city capture */
  starBurst(s: GameState, x: number, y: number, colorHex: string) {
    const c = this.center(s.size);
    const h = TERRAIN_H[s.tiles[idx(x, y, s.size)].terrain];
    const emitter = new Vector3(x - c, h - 0.4 + 0.4, y - c);
    const ps = new ParticleSystem("burst", 60, this.scene);
    // procedural spark texture
    const size = 64;
    const dt = new DynamicTexture("spark", { width: size, height: size }, this.scene, false);
    dt.hasAlpha = true;
    const ctx = dt.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,215,106,0.9)");
    grad.addColorStop(1, "rgba(255,185,56,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    dt.update();
    ps.particleTexture = dt as unknown as Texture;
    ps.emitter = emitter;
    ps.minSize = 0.12; ps.maxSize = 0.3;
    ps.minLifeTime = 0.35; ps.maxLifeTime = 0.7;
    ps.emitRate = 400;
    ps.direction1 = new Vector3(-1, 1.5, -1);
    ps.direction2 = new Vector3(1, 2.5, 1);
    ps.minEmitPower = 1.2; ps.maxEmitPower = 2.6;
    ps.gravity = new Vector3(0, -4, 0);
    const col = Color3.FromHexString(colorHex);
    ps.color1 = new Color4(1, 0.84, 0.42, 1);
    ps.color2 = new Color4(col.r, col.g, col.b, 1);
    ps.colorDead = new Color4(1, 0.72, 0.22, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.targetStopDuration = 0.25;
    ps.disposeOnStop = true;
    ps.start();
  }

  /** gentle green rising sparkles when a unit is mended (arcanist heal) */
  healSparkle(s: GameState, x: number, y: number) {
    const c = this.center(s.size);
    const h = TERRAIN_H[s.tiles[idx(x, y, s.size)].terrain];
    const emitter = new Vector3(x - c, h - 0.4 + 0.25, y - c);
    const ps = new ParticleSystem("heal", 30, this.scene);
    const size = 64;
    const dt = new DynamicTexture("healspark", { width: size, height: size }, this.scene, false);
    dt.hasAlpha = true;
    const ctx = dt.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(126,231,168,0.9)");
    grad.addColorStop(1, "rgba(62,196,130,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    dt.update();
    ps.particleTexture = dt as unknown as Texture;
    ps.emitter = emitter;
    ps.minEmitBox = new Vector3(-0.22, 0, -0.22);
    ps.maxEmitBox = new Vector3(0.22, 0.1, 0.22);
    ps.minSize = 0.08; ps.maxSize = 0.2;
    ps.minLifeTime = 0.5; ps.maxLifeTime = 0.9;
    ps.emitRate = 60;
    ps.direction1 = new Vector3(-0.15, 1, -0.15);
    ps.direction2 = new Vector3(0.15, 1.6, 0.15);
    ps.minEmitPower = 0.5; ps.maxEmitPower = 1.0;
    ps.gravity = new Vector3(0, 0.4, 0); // drift upward
    ps.color1 = new Color4(0.55, 0.95, 0.7, 1);
    ps.color2 = new Color4(0.35, 0.85, 0.55, 1);
    ps.colorDead = new Color4(0.5, 0.9, 0.65, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.targetStopDuration = 0.5;
    ps.disposeOnStop = true;
    ps.start();
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener("resize", this.handleResize);
    this.scene.dispose();
    this.engine.dispose();
  }
}
