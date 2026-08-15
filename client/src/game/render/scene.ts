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
import { buildCharacter, skinFor, tribeGlow } from "./characters";

/**
 * How large a figure stands on its tile.
 *
 * The rigs were authored and reviewed in the Model Lab, which shows one figure
 * alone against a dark ground — and at that size and contrast they read
 * perfectly. On the actual board they were about a fifth of a tile, so the
 * terrain dominated every frame and the classes blurred into identical
 * silhouettes at play distance. The Model Lab acceptance test is necessary and
 * it is not sufficient; this is the correction for the difference.
 */
const UNIT_SCALE = 1.34;
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
import { GameState, Tile, Unit, idx } from "../core/types";
import { game } from "../core/state";
import { reachableTiles, attackableUnits, cityAt, isVisibleTo, plannerSites, tradeRouteTiles, raidedRoadTiles } from "../core/rules";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { PALETTE, darken, biomeFor, BiomePalette } from "./palette";

const TILE = 1.02;
const TERRAIN_H: Record<string, number> = {
  grass: 0.3, forest: 0.34, mountain: 0.85, water: 0.14, ocean: 0.08,
};
// v33 diorama: land slabs extrude a fixed skirt below their logical base so
// cliffs read chunky where land meets water or the void. Water stays thin.
const LAND_SKIRT = 0.34;
// v33 diorama: one shared drop-shadow plane per tile, floating in the void
// beneath the board — sells the "island floating over the abyss" look.
const SHADOW_Y = -0.78;

/** flat triangular prism (fins, sails, shards) — a 3-tess cone, z-squashed */
function wedgeMesh(scene: Scene, name: string, w: number, h: number, d: number): Mesh {
  const m = MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: w, height: h, tessellation: 3 }, scene);
  m.scaling.z = d / w;
  m.isPickable = false;
  return m;
}

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
  private pulseMeshes: Mesh[] = [];
  private pulseObs: any = null;
  private mats = new Map<string, StandardMaterial>();
  private fxMeshes: Mesh[] = [];
  private disposed = false;
  private cameraInitialized = false;
  private cameraGameSig = "";
  private shadowGen: ShadowGenerator | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;
  private lowQuality = false;
  private waterMats: StandardMaterial[] = [];
  private shimmerT = 0;
  /** sea life + surface motion: bobbing fish, drifting glints, cloud puffs */
  private seaMotion: { m: Mesh; y0: number; amp: number; sp: number; ph: number; spin: number }[] = [];
  private ambientMeshes: Mesh[] = [];
  private ambientObs: any = null;
  private forestSpots: { x: number; z: number }[] = [];
  private boardHalf = 5; // half-extent of the board in world units (set in buildBoard)
  /** signature of the last built board — rebuilds are skipped when nothing
   *  the board actually draws has changed (see computeBoardSig) */
  private boardSig = "";
  /** active biome palette — resolved from s.preset on every buildBoard */
  private bio: BiomePalette = biomeFor("continents");
  onPick: ((p: PickInfo) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { antialias: true, stencil: false, alpha: true });
    this.scene = new Scene(this.engine);
    // The sky is painted in CSS behind a transparent clear (see GameCanvas).
    // A flat clear color left the opening frame with a large slab of dead
    // background wherever the diorama did not reach the edge of the viewport;
    // a gradient costs no draw calls and gives the void some depth.
    this.scene.clearColor = new Color4(0, 0, 0, 0);
    // dev/perf harness hook: lets tooling read live scene statistics
    if (typeof window !== "undefined") (window as unknown as Record<string, unknown>).__sunderScene = this.scene;
    this.setupCameraLights(canvas);
    this.setupPipeline();
    this.root = new TransformNode("root", this.scene);

    // water shimmer: gentle emissive pulse + hue drift on shared water materials
    this.scene.onBeforeRenderObservable.add(() => {
      this.shimmerT += this.engine.getDeltaTime() / 1000;
      const p = (Math.sin(this.shimmerT * 1.6) + 1) / 2; // 0..1 slow swell
      const q = (Math.sin(this.shimmerT * 2.7 + 1.3) + 1) / 2; // offset ripple
      // sea life + cloud drift: cheap per-frame transform nudges, no physics
      if (this.seaMotion.length) {
        const tt = this.shimmerT;
        for (const e of this.seaMotion) {
          if (e.m.isDisposed()) continue;
          e.m.position.y = e.y0 + Math.sin(tt * e.sp + e.ph) * e.amp;
          if (e.spin) e.m.rotation.y += e.spin * this.engine.getDeltaTime() / 1000;
        }
      }
      for (const wm of this.waterMats) {
        const deep = wm.name.includes("ocean");
        // Stage 1: flat unlit water — the whole color IS the emissive channel,
        // so shimmer is a gentle brightness pulse around the palette value.
        const base = Color3.FromHexString(deep ? this.bio.terrain.ocean.top : this.bio.terrain.water.top);
        const amp = deep ? 0.05 : 0.08;
        const k = 1 + amp * (0.6 * p + 0.4 * q) - amp / 2;
        wm.emissiveColor.set(Math.min(1, base.r * k), Math.min(1, base.g * k), Math.min(1, base.b * k));
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

  /**
   * The opening shot — the first frame a player ever sees of the board.
   *
   * Aiming the camera squarely at the human capital looks right on paper and
   * frames badly in practice: capitals often spawn near an edge, so the board
   * falls into one corner and up to 40% of the screen is empty void past the
   * diorama's rim. Pulling the target back toward the middle of the board keeps
   * the capital comfortably in frame while filling the shot with world.
   */
  private frameOpeningShot(s: GameState, c: number) {
    const cap = s.cities.find((ci) => ci.isCapital && ci.tribe === s.humanTribe);
    if (!cap) {
      this.camera.target = Vector3.Zero();
      this.camera.radius = 13;
      return;
    }
    // board centre is the origin, so scaling the capital offset pulls toward it
    const PULL = 0.45;
    this.camera.target = new Vector3((cap.x - c) * (1 - PULL), 0, (cap.y - c) * (1 - PULL));
    this.camera.radius = 13;
  }

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
    // Stage 1 flat shading: terrain and decor are unlit (emissive-only), so
    // this light only matters for the few remaining lit materials (units keep
    // a whisper of shading until Stage 2 replaces them). Kept dim and neutral.
    hemi.intensity = 0.62;
    hemi.diffuse = Color3.FromHexString("#ffffff");
    hemi.groundColor = Color3.FromHexString("#6f6a90");
    hemi.specular = Color3.Black();
    const sun = new DirectionalLight("sun", new Vector3(-0.55, -1, 0.42), this.scene);
    sun.intensity = 0.72;
    sun.diffuse = Color3.FromHexString("#fff3e0");
    sun.specular = Color3.Black();
    sun.position = new Vector3(8, 14, -6);
    // Stage 1: no shadow generator — Polytopia-style flat boards get depth
    // from palette value steps, not shadow maps. Blob shadows land in Stage 3.
    this.shadowGen = null;
  }

  /** post-processing: bloom for glows, FXAA, filmic tone mapping, slight contrast */
  private setupPipeline() {
    const pipe = new DefaultRenderingPipeline("polyfx", true, this.scene, [this.camera]);
    this.pipeline = pipe;
    pipe.fxaaEnabled = true;
    pipe.bloomEnabled = true;
    // Stage 1: bloom trimmed to true accents only (crystals, fires, ruin
    // glows). Flat unlit tile tops are bright, so the threshold must sit
    // above them or the whole board hazes over.
    pipe.bloomThreshold = 0.88;
    pipe.bloomWeight = 0.22;
    pipe.bloomKernel = 32;
    pipe.bloomScale = 0.5;
    pipe.imageProcessingEnabled = true;
    if (pipe.imageProcessing) {
      // flat colors are hand-picked — filmic tone mapping would re-grade them
      pipe.imageProcessing.toneMappingEnabled = false;
      pipe.imageProcessing.contrast = 1.04;
      pipe.imageProcessing.exposure = 1.0;
      pipe.imageProcessing.vignetteEnabled = true;
      pipe.imageProcessing.vignetteWeight = 1.2;
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
      // Stage 1 flat shading: UNLIT. The color lives in emissive; diffuse is
      // black so no light gradient ever crosses a face. Every mesh face shows
      // exactly the hand-picked palette value.
      m.emissiveColor = Color3.FromHexString(hex);
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.disableLighting = true;
      this.mats.set(hex, m);
    }
    return m;
  }

  /**
   * v47 sculpted props: LIT material with a high ambient floor. Terrain slabs
   * keep their hand-picked unlit value steps, but freestanding props (units,
   * trees, rocks, buildings) need real directional shading or they read as
   * stacked flat blocks instead of carved figurines. floor + diffuse * lights
   * lands near 1.0 so lit faces hit the intended palette color.
   */
  litMat(hex: string): StandardMaterial {
    const key = "lit:" + hex;
    let m = this.mats.get(key);
    if (!m) {
      const base = Color3.FromHexString(hex);
      m = new StandardMaterial("m" + key, this.scene);
      m.emissiveColor = base.scale(0.46);
      m.diffuseColor = base.scale(0.62);
      m.specularColor = Color3.Black();
      m.disableLighting = false;
      m.maxSimultaneousLights = 2; // key + fill only: smaller shader on mobile
      this.mats.set(key, m);
    }
    return m;
  }

  /**
   * Crisp per-face shading. Babylon's default fragment shader computes a
   * geometric normal from screen-space derivatives whenever the NORMAL
   * attribute is absent, so dropping normals gives exact flat shading with
   * NO vertex duplication — convertToFlatShadedMesh() un-indexes the mesh and
   * inflated our vertex count ~4.5x for the same picture.
   */
  private facet(m: Mesh) {
    m.removeVerticesData(VertexBuffer.NormalKind);
  }

  /** fog-of-war variant of a tile color: desaturated and washed toward deep indigo */
  private foggedMat(hex: string): StandardMaterial {
    const key = "fog:" + hex + this.bio.fogWash;
    let m = this.mats.get(key);
    if (!m) {
      const base = Color3.FromHexString(hex);
      const grey = (base.r + base.g + base.b) / 3;
      const desat = Color3.Lerp(base, new Color3(grey, grey, grey), 0.6);
      const washed = Color3.Lerp(desat, Color3.FromHexString(this.bio.fogWash), 0.55);
      m = new StandardMaterial("m" + key, this.scene);
      m.emissiveColor = washed;
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.disableLighting = true;
      this.mats.set(key, m);
    }
    return m;
  }

  /** dedicated animated material for water tiles (kept out of the shared cache) */
  private waterMat(deep: boolean): StandardMaterial {
    const hex = deep ? this.bio.terrain.ocean.top : this.bio.terrain.water.top;
    const name = (deep ? "water-ocean" : "water-shallow") + hex;
    let m = this.mats.get(name);
    if (!m) {
      m = new StandardMaterial(name, this.scene);
      // Stage 1: flat unlit water. The shimmer loop animates a small additive
      // emissive pulse on top of the flat base color (see onBeforeRender).
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.disableLighting = true;
      m.emissiveColor = Color3.FromHexString(hex);
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

  /**
   * Stage 1: slab material with hand-picked top + darker side walls.
   * Babylon boxes UV-map all faces to the same texture, so instead of a
   * MultiMaterial we build TWO stacked meshes: a thin top plate carrying the
   * top color and the slab body carrying the side color. Cheaper than
   * per-face submeshes and keeps the picking metadata on the body.
   */
  private buildSlab(name: string, x: number, z: number, h: number, topHex: string, sideHex: string, fogged: boolean): Mesh {
    const topMat = fogged ? this.foggedMat(topHex) : this.mat(topHex);
    const sideMat = fogged ? this.foggedMat(sideHex) : this.mat(sideHex);
    // v33 diorama: extend the slab body downward by a fixed skirt so land
    // cliffs read chunky above water and the void — the "board game piece" look.
    const bodyH = h + LAND_SKIRT;
    // The cliff face is two-tone like a cut of turf: a shallow band of the
    // terrain's own side color at the top, exposed earth below. This is what
    // makes the board read as a slab of world floating in the void rather
    // than a green plate.
    const soilMat = fogged ? this.foggedMat(this.bio.soil) : this.mat(this.bio.soil);
    const body = MeshBuilder.CreateBox(name, { width: TILE * 0.96, depth: TILE * 0.96, height: bodyH }, this.scene);
    // top face must stay at the original y (= h - 0.4), so center sits lower
    body.position = new Vector3(x, h - 0.4 - bodyH / 2, z);
    body.material = soilMat;
    const turfH = 0.13;
    const turf = MeshBuilder.CreateBox(name + "-turf", { width: TILE * 0.962, depth: TILE * 0.962, height: turfH }, this.scene);
    turf.position = new Vector3(0, bodyH / 2 - turfH / 2, 0);
    turf.material = sideMat;
    turf.parent = body;
    const cap = MeshBuilder.CreateBox(name + "-cap", { width: TILE * 0.965, depth: TILE * 0.965, height: 0.03 }, this.scene);
    cap.position = new Vector3(0, bodyH / 2 + 0.001, 0);
    cap.material = topMat;
    cap.parent = body;
    return body;
  }

  /** v33: soft blob drop shadow floating in the void beneath a tile. One flat
   *  translucent quad per tile, slightly offset toward the light's opposite,
   *  merged visually into a single island shadow by overlap. */
  private addDropShadow(parentTile: Mesh, x: number, z: number, terrain: string) {
    const isWater = terrain === "water" || terrain === "ocean";
    const sh = MeshBuilder.CreatePlane("tshadow", { size: TILE * (isWater ? 1.02 : 1.12) }, this.scene);
    sh.rotation.x = Math.PI / 2;
    // world position: parent to the tile so disposal is automatic, but undo the
    // tile's own y so the shadow sits on the fixed void plane
    sh.parent = parentTile;
    const invY = SHADOW_Y - parentTile.position.y;
    sh.position = new Vector3(0.09, invY, -0.09);
    let m = this.mats.get("tile-shadow");
    if (!m) {
      m = new StandardMaterial("tile-shadow", this.scene);
      m.emissiveColor = Color3.FromHexString("#08081c");
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.disableLighting = true;
      m.alpha = 0.42;
      this.mats.set("tile-shadow", m);
    }
    sh.material = m;
    sh.isPickable = false;
  }

  center(size: number) {
    return (size - 1) / 2;
  }

  /** v29 QoL: smoothly pan the camera to a tile (used by "next unit" cycling). */
  focusTile(s: GameState, x: number, y: number) {
    const c = this.center(s.size);
    const target = new Vector3(x - c, 0, y - c);
    const cam = this.camera;
    const fps = 60;
    const anim = new Animation("camPan", "target", fps, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([
      { frame: 0, value: cam.target.clone() },
      { frame: 14, value: target },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    anim.setEasingFunction(ease);
    cam.animations = [anim];
    this.scene.beginAnimation(cam, 0, 14, false);
  }

  /** full rebuild of static board (called on new game / capture) */
  /**
   * Compact fingerprint of everything the board's static geometry depends on.
   * Unit positions are deliberately excluded — units are separate meshes kept
   * in sync by syncUnits(), so moving one must not rebuild the world.
   */
  private computeBoardSig(s: GameState): string {
    const h = s.humanTribe;
    const out: string[] = [String(s.size), String(s.preset ?? ""), String(h)];
    for (const t of s.tiles) {
      out.push(
        t.terrain,
        t.explored[h] ? "1" : "0",
        isVisibleTo(s, h, t.x, t.y) ? "1" : "0",
        t.ownerCityId === null ? "-" : String(t.ownerCityId),
        t.cityId === null ? "-" : String(t.cityId),
        t.resource ?? "-",
        t.building ?? "-",
        t.road ? "r" : "-",
        t.ruin ? "u" : "-",
        t.greatRuin ? "U" : "-",
        t.port === null ? "-" : String(t.port),
      );
    }
    for (const ci of s.cities) {
      out.push(`${ci.id}:${ci.tribe ?? "n"}:${ci.level}:${ci.walls ? 1 : 0}:${ci.isCapital ? 1 : 0}`);
    }
    for (const tr of s.tribes) out.push(tr.color);
    return out.join("|");
  }

  buildBoard(s: GameState) {
    // The game notifies on every action, so this is called after each move,
    // attack and turn end. Rebuilding ~1000 meshes (with flat-shading
    // conversions) each time caused real hitches on phones; skip when the
    // world is unchanged and let syncUnits handle the moving pieces.
    const sig = this.computeBoardSig(s);
    if (sig === this.boardSig && this.tileMeshes.size > 0) {
      // The world is unchanged, but road raiding depends on where units are
      // standing, which is deliberately not part of the signature — so the
      // trade pulse still has to be refreshed on the skipped path.
      this.rebuildTradePulse(s);
      return;
    }
    this.boardSig = sig;

    this.bio = biomeFor(s.preset);
    this.unfreezeMaterials();
    this.seaMotion = [];
    this.tileMeshes.forEach((m) => m.dispose());
    this.tileMeshes.clear();
    this.decorMeshes.forEach((arr) => arr.forEach((m: Mesh) => m.dispose()));
    this.decorMeshes.clear();

    const c = this.center(s.size);
    const human = s.humanTribe;
    for (const t of s.tiles) {
      if (!t.explored[human]) {
        // unexplored: render a dark "cloud" slab so the map's extent stays legible
        // (tiles simply not existing read as a rendering bug, not as fog)
        this.buildFogTile(s, t, c);
        continue;
      }
      this.buildTile(s, t, c);
    }
    if (!this.cameraInitialized) {
      this.frameOpeningShot(s, c);
      this.cameraInitialized = true;
      this.cameraGameSig = `${s.seed}:${s.humanTribe}:${s.size}`;
    } else {
      // A different game started within the same renderer session (e.g. Play Again
      // straight into a new match) — recenter on the new capital.
      const sig = `${s.seed}:${s.humanTribe}:${s.size}`;
      if (this.cameraGameSig !== sig) {
        this.frameOpeningShot(s, c);
        this.cameraGameSig = sig;
      }
    }

    // ---- static-board optimization (matters on phones) ----
    // The board is thousands of small unlit meshes that never move. Freezing
    // their world matrices stops Babylon recomputing them every frame, and
    // freezing the unlit materials skips per-frame shader dirty checks.
    // Meshes registered for sea motion are skipped — they animate.
    this.freezeStaticBoard();

    // ambient life: rebuild cloud shadows + bird spawn spots for this board
    this.boardHalf = s.size / 2 + 1;
    this.forestSpots = s.tiles
      .filter((t) => t.explored[human] && t.terrain === "forest")
      .map((t) => ({ x: t.x - c, z: t.y - c }));
    this.setupAmbientLife();
    // v39 trade pulse: gold flecks drifting along live trade routes toward the
    // capital, plus a rose warning glow on raided road links
    this.rebuildTradePulse(s);
  }

  /** v39: animated gold pulse on connected roads + rose halo on raided links */
  private rebuildTradePulse(s: GameState) {
    for (const m of this.pulseMeshes) { if (m.material?.name.startsWith("trade-pulse-i") || m.material?.name === "raidedm") m.material.dispose(); m.dispose(); }
    this.pulseMeshes = [];
    if (this.pulseObs) { this.scene.onBeforeRenderObservable.remove(this.pulseObs); this.pulseObs = null; }
    const human = s.humanTribe;
    const c = this.center(s.size);
    // raided links: a rose halo over any road tile squatted by a hostile —
    // reads as "this link is cut" at a glance
    for (const r of raidedRoadTiles(s, human)) {
      const t = s.tiles[idx(r.x, r.y, s.size)];
      if (!t.explored[human] || !isVisibleTo(s, human, r.x, r.y)) continue;
      const h = TERRAIN_H[t.terrain];
      const halo = MeshBuilder.CreateTorus("raided", { diameter: 0.62, thickness: 0.05, tessellation: 18 }, this.scene);
      halo.position = new Vector3(r.x - c, h - 0.4 + 0.09, r.y - c);
      const hm = new StandardMaterial("raidedm", this.scene);
      hm.emissiveColor = Color3.FromHexString("#f43f5e");
      hm.diffuseColor = Color3.Black();
      hm.specularColor = Color3.Black();
      hm.disableLighting = true;
      hm.alpha = 0.85;
      halo.material = hm;
      halo.isPickable = false;
      halo.parent = this.root;
      this.pulseMeshes.push(halo);
    }
    // live routes: one small gold coin per road tile, sliding toward the capital
    const routes = tradeRouteTiles(s, human).filter((r) => s.tiles[idx(r.x, r.y, s.size)].explored[human]);
    if (routes.length === 0 || this.lowQuality) return;
    const coins: { mesh: Mesh; x: number; z: number; dx: number; dz: number; y: number; offset: number }[] = [];
    for (const r of routes) {
      const t = s.tiles[idx(r.x, r.y, s.size)];
      const h = TERRAIN_H[t.terrain];
      const coin = MeshBuilder.CreateCylinder("pulse", { diameter: 0.11, height: 0.03, tessellation: 8 }, this.scene);
      const mat = new StandardMaterial("trade-pulse-i", this.scene);
      mat.emissiveColor = Color3.FromHexString("#ffd76a");
      mat.diffuseColor = Color3.Black();
      mat.specularColor = Color3.Black();
      mat.disableLighting = true;
      coin.material = mat;
      coin.isPickable = false;
      coin.parent = this.root;
      coins.push({
        mesh: coin,
        x: r.x - c, z: r.y - c,
        dx: r.dx, dz: r.dy,
        y: h - 0.4 + 0.075,
        offset: ((r.x * 7 + r.y * 13) % 10) / 10, // desync neighboring coins
      });
      this.pulseMeshes.push(coin);
    }
    let t0 = 0;
    this.pulseObs = this.scene.onBeforeRenderObservable.add(() => {
      t0 += this.engine.getDeltaTime() / 1000;
      for (const p of coins) {
        if (p.mesh.isDisposed()) continue;
        // each coin loops from tile center toward the capital-side edge (~2.2s cycle)
        const phase = (t0 * 0.45 + p.offset) % 1;
        const slide = phase * 0.5; // half a tile of travel per loop
        p.mesh.position.set(p.x + p.dx * slide, p.y, p.z + p.dz * slide);
        // fade in at the start of the run, fade out at the end
        const alpha = phase < 0.15 ? phase / 0.15 : phase > 0.8 ? (1 - phase) / 0.2 : 1;
        (p.mesh.material as StandardMaterial).alpha = alpha * 0.9;
      }
    });
  }

  /** ambient micro-motion: drifting cloud shadows + occasional birds over forests.
   *  Deliberately sparse — stillness should feel intentional, not dead. */
  private setupAmbientLife() {
    for (const m of this.ambientMeshes) m.dispose();
    this.ambientMeshes = [];
    if (this.ambientObs) { this.scene.onBeforeRenderObservable.remove(this.ambientObs); this.ambientObs = null; }
    if (this.lowQuality) return; // skip ambient extras on struggling devices

    // --- drifting cloud shadows: 3 soft dark discs sliding slowly across tile tops
    let cloudMat = this.mats.get("cloud-shadow");
    if (!cloudMat) {
      cloudMat = new StandardMaterial("cloud-shadow", this.scene);
      cloudMat.emissiveColor = Color3.FromHexString("#0c0c26");
      cloudMat.diffuseColor = Color3.Black();
      cloudMat.specularColor = Color3.Black();
      cloudMat.disableLighting = true;
      cloudMat.alpha = 0.1;
      this.mats.set("cloud-shadow", cloudMat);
    }
    const clouds: { mesh: Mesh; speed: number; drift: number; offset: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const disc = MeshBuilder.CreateDisc(`cloudshadow${i}`, { radius: 1.6 + i * 0.5, tessellation: 10 }, this.scene);
      disc.rotation.x = Math.PI / 2;
      disc.scaling.x = 1.5; // elongated blob
      disc.position.y = 0.62; // just above tile tops, below units' heads
      disc.material = cloudMat;
      disc.isPickable = false;
      disc.parent = this.root;
      clouds.push({ mesh: disc, speed: 0.14 + i * 0.05, drift: 0.05 + i * 0.02, offset: i * 7.3 });
      this.ambientMeshes.push(disc);
    }

    // --- occasional birds: tiny dark chevrons that glide across, then despawn.
    // A flock spawns every ~14-24s only if forest tiles exist.
    let birdMat = this.mats.get("bird");
    if (!birdMat) {
      birdMat = new StandardMaterial("bird", this.scene);
      birdMat.emissiveColor = Color3.FromHexString("#2c2c52");
      birdMat.diffuseColor = Color3.Black();
      birdMat.specularColor = Color3.Black();
      birdMat.disableLighting = true;
      this.mats.set("bird", birdMat);
    }
    type Bird = { mesh: Mesh; vx: number; vz: number; t: number; flap: number };
    let birds: Bird[] = [];
    let nextFlock = 6 + Math.random() * 8;
    let aT = 0;

    this.ambientObs = this.scene.onBeforeRenderObservable.add(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      aT += dt;
      const half = this.boardHalf;
      // clouds: slow diagonal drift, wrapping around the board bounds
      for (const cl of clouds) {
        if (cl.mesh.isDisposed()) continue;
        const range = half + 4;
        const px = ((aT * cl.speed + cl.offset) % (range * 2)) - range;
        cl.mesh.position.x = px;
        cl.mesh.position.z = Math.sin(aT * cl.drift + cl.offset) * half * 0.7;
      }
      // birds: spawn a flock of 2-3 over a random forest tile, glide off-board
      nextFlock -= dt;
      if (nextFlock <= 0 && this.forestSpots.length > 0 && birds.length === 0) {
        nextFlock = 14 + Math.random() * 10;
        const spot = this.forestSpots[(Math.random() * this.forestSpots.length) | 0];
        const ang = Math.random() * Math.PI * 2;
        const n = 2 + ((Math.random() * 2) | 0);
        for (let i = 0; i < n; i++) {
          // chevron = two thin boxes joined at an angle
          const wing = MeshBuilder.CreateBox(`bird${i}`, { width: 0.16, depth: 0.03, height: 0.015 }, this.scene);
          wing.material = birdMat!;
          wing.isPickable = false;
          wing.parent = this.root;
          wing.position = new Vector3(spot.x + (i - 1) * 0.25, 1.7 + i * 0.08, spot.z + (i % 2) * 0.2 - 0.1);
          wing.rotation.y = ang;
          birds.push({ mesh: wing, vx: Math.cos(ang) * 0.9, vz: Math.sin(ang) * 0.9, t: 0, flap: Math.random() * 6 });
          this.ambientMeshes.push(wing);
        }
      }
      // move birds; despawn once well off the board
      if (birds.length) {
        const alive: Bird[] = [];
        for (const b of birds) {
          if (b.mesh.isDisposed()) continue;
          b.t += dt;
          b.mesh.position.x += b.vx * dt;
          b.mesh.position.z += b.vz * dt;
          // wing flap: scale pulse + slight bob
          b.mesh.scaling.z = 1 + Math.sin(b.t * 14 + b.flap) * 0.5;
          b.mesh.position.y += Math.sin(b.t * 14 + b.flap) * 0.003;
          const off = Math.abs(b.mesh.position.x) > half + 5 || Math.abs(b.mesh.position.z) > half + 5;
          if (off || b.t > 30) {
            b.mesh.dispose();
          } else {
            alive.push(b);
          }
        }
        birds = alive;
      }
    });
  }

  /** unexplored tile: Polytopia-style cloud bank — puffy blobs hovering at
   *  land height over a shaded pick slab, instead of a dark hole in the map */
  private buildFogTile(s: GameState, t: Tile, c: number) {
    const key = idx(t.x, t.y, s.size);
    // shaded underside slab: keeps the board footprint legible between puffs
    // and gives clicks a reliable pick target. Sits low and dim so the puffs
    // above it carry the read.
    const box = MeshBuilder.CreateBox("t" + key, { width: TILE * 0.96, depth: TILE * 0.96, height: 0.1 }, this.scene);
    box.position = new Vector3(t.x - c, -0.36, t.y - c);
    box.material = this.mat(this.bio.cloudShade);
    box.metadata = { tile: true, x: t.x, y: t.y };
    box.parent = this.root;
    this.tileMeshes.set(key, box);
    // Deterministic puff cluster. A new player's opening board is almost all
    // fog, so this is the first thing anyone sees: it has to read as soft
    // cloud cover, not as unrendered tiles. Rounder spheres, more of them,
    // varied heights, and a shaded underside give the bank real volume.
    const j = ((t.x * 31 + t.y * 17) % 7) / 7;
    const j2 = ((t.x * 13 + t.y * 29) % 5) / 5;
    const j3 = ((t.x * 7 + t.y * 43) % 11) / 11;
    const decor: Mesh[] = [];
    const puffs: [number, number, number, number][] = [
      // [offX, offZ, radius, heightLift]
      [(j - 0.5) * 0.26, (j2 - 0.5) * 0.26, 0.33 + j * 0.07, 0.06],
      [(0.5 - j2) * 0.34, (j - 0.5) * 0.28, 0.26 + j2 * 0.07, 0.0],
      [(j2 - 0.2) * 0.3, (0.42 - j) * 0.34, 0.22 + j3 * 0.07, 0.03],
      [(j3 - 0.5) * 0.4, (j2 - 0.6) * 0.3, 0.18 + j * 0.05, -0.02],
    ];
    // Fog covers most of the board early, so this is the heaviest thing the
    // renderer draws. Build the puffs, then MERGE them per tile per material:
    // 8 meshes/tile becomes 2, which is the difference between ~750 and ~190
    // draw calls on an opening board.
    const tops: Mesh[] = [];
    const bellies: Mesh[] = [];
    for (const [ox, oz, r, lift] of puffs) {
      const puff = MeshBuilder.CreateIcoSphere("cloud", { radius: r, subdivisions: 2 }, this.scene);
      puff.position = new Vector3(t.x - c + ox, -0.2 + r * 0.4 + lift, t.y - c + oz);
      puff.scaling.y = 0.58;
      tops.push(puff);
      const belly = MeshBuilder.CreateIcoSphere("cloud", { radius: r * 0.92, subdivisions: 1 }, this.scene);
      belly.position = new Vector3(puff.position.x, puff.position.y - r * 0.2, puff.position.z);
      belly.scaling.y = 0.42;
      bellies.push(belly);
    }
    const bank: [Mesh[], string][] = [[tops, this.bio.cloud], [bellies, this.bio.cloudShade]];
    for (const [group, hex] of bank) {
      const merged = Mesh.MergeMeshes(group, true, true);
      if (!merged) continue;
      merged.name = "cloud";
      merged.material = this.mat(hex);
      merged.metadata = { tile: true, x: t.x, y: t.y };
      merged.parent = this.root;
      decor.push(merged);
      // Merged geometry is baked around the world origin, so spinning it would
      // swing the whole bank across the board. Vertical drift only.
      this.seaMotion.push({ m: merged, y0: merged.position.y, amp: 0.024, sp: 0.45 + j * 0.3, ph: (t.x + t.y) * 0.7, spin: 0 });
    }
    this.decorMeshes.set(key, decor);
  }

  /** freeze world matrices of non-animated board meshes + freeze materials */
  private freezeStaticBoard() {
    const moving = new Set(this.seaMotion.map((e) => e.m));
    const freeze = (m: Mesh) => {
      if (moving.has(m)) return;
      m.freezeWorldMatrix();
      m.doNotSyncBoundingInfo = true;
    };
    this.tileMeshes.forEach((m) => {
      freeze(m);
      m.getChildMeshes().forEach((cm) => freeze(cm as Mesh));
    });
    this.decorMeshes.forEach((arr) => arr.forEach(freeze));
    // water materials are mutated every frame by the shimmer loop — freezing
    // them would pin the emissive uniform and kill the animation
    const animated = new Set<StandardMaterial>(this.waterMats);
    this.mats.forEach((mat) => { if (!animated.has(mat)) mat.freeze(); });
  }

  /** undo material freezing so a later rebuild can recolor safely */
  private unfreezeMaterials() {
    this.mats.forEach((mat) => mat.unfreeze());
  }

  private buildTile(s: GameState, t: Tile, c: number) {
    const key = idx(t.x, t.y, s.size);
    const h = TERRAIN_H[t.terrain];
    const visible = isVisibleTo(s, s.humanTribe, t.x, t.y);
    const fogged = !visible;
    let box: Mesh;
    if (t.terrain === "water" || t.terrain === "ocean") {
      // water: flat slab, single animated material; side gets its own darker flat
      const deep = t.terrain === "ocean";
      box = MeshBuilder.CreateBox("t" + key, { width: TILE * 0.96, depth: TILE * 0.96, height: h }, this.scene);
      box.position = new Vector3(t.x - c, h / 2 - 0.4, t.y - c);
      box.material = fogged
        ? this.foggedMat(deep ? this.bio.terrain.ocean.top : this.bio.terrain.water.top)
        : this.waterMat(deep);
    } else {
      // land: top plate carries the palette top step, slab body the darker side step
      const topHex = this.tileColor(s, t);
      const swatch = this.bio.terrain[t.terrain];
      // owned-border tint shifts the top; derive the side from the tinted top
      const sideHex = topHex === swatch?.top && swatch ? swatch.side : darken(topHex);
      box = this.buildSlab("t" + key, t.x - c, t.y - c, h, topHex, sideHex, fogged);
      // shallow-water shore band: pale trim on land edges that touch water
      const shoreMat = fogged ? this.foggedMat(this.bio.shore) : this.mat(this.bio.shore);
      // v34 coastal variation: sandy band + stepped rock ledge on cliff faces
      const sandMat = fogged ? this.foggedMat(this.bio.sand) : this.mat(this.bio.sand);
      const ledgeHex = darken(this.bio.soil, 0.78);
      const ledgeMat = fogged ? this.foggedMat(ledgeHex) : this.mat(ledgeHex);
      const dirs: [number, number, number][] = [[1, 0, 0], [-1, 0, Math.PI], [0, 1, Math.PI / 2], [0, -1, -Math.PI / 2]];
      for (const [dx, dy] of dirs) {
        const nx = t.x + dx, ny = t.y + dy;
        if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) continue;
        const nb = s.tiles[idx(nx, ny, s.size)];
        if (nb.terrain !== "water" && nb.terrain !== "ocean") continue;
        const band = MeshBuilder.CreateBox("shore", {
          width: dx !== 0 ? 0.09 : TILE * 0.98,
          depth: dy !== 0 ? 0.09 : TILE * 0.98,
          height: 0.05,
        }, this.scene);
        band.position = new Vector3(
          dx * (TILE * 0.96) / 2,
          -h / 2 + TERRAIN_H[nb.terrain] - 0.028,
          dy * (TILE * 0.96) / 2
        );
        band.material = shoreMat;
        band.isPickable = false;
        band.parent = box;
        // sandy band: a warm strip on the cliff face just under the waterline —
        // reads as a beach line where the island meets the sea
        const sand = MeshBuilder.CreateBox("sand", {
          width: dx !== 0 ? 0.045 : TILE * 0.975,
          depth: dy !== 0 ? 0.045 : TILE * 0.975,
          height: 0.09,
        }, this.scene);
        sand.position = new Vector3(
          dx * (TILE * 0.96) / 2 + dx * 0.005,
          -h / 2 + TERRAIN_H[nb.terrain] - 0.1,
          dy * (TILE * 0.96) / 2 + dy * 0.005
        );
        sand.material = sandMat;
        sand.isPickable = false;
        sand.parent = box;
        // stepped cliff: on roughly half the coastal faces (seeded), a rock
        // ledge juts out below the sand line for silhouette variety
        const stepSeed = (t.x * 13 + t.y * 7 + dx * 3 + dy * 5) & 3;
        if (stepSeed < 2) {
          const ledge = MeshBuilder.CreateBox("ledge", {
            width: dx !== 0 ? 0.1 : TILE * (0.5 + stepSeed * 0.2),
            depth: dy !== 0 ? 0.1 : TILE * (0.5 + stepSeed * 0.2),
            height: 0.12,
          }, this.scene);
          ledge.position = new Vector3(
            dx * ((TILE * 0.96) / 2 + 0.03) + (dy !== 0 ? (stepSeed - 0.5) * 0.3 : 0),
            -h / 2 + TERRAIN_H[nb.terrain] - 0.26,
            dy * ((TILE * 0.96) / 2 + 0.03) + (dx !== 0 ? (stepSeed - 0.5) * 0.3 : 0)
          );
          ledge.material = ledgeMat;
          ledge.isPickable = false;
          ledge.parent = box;
        }
      }
    }
    box.metadata = { tile: true, x: t.x, y: t.y };
    box.getChildMeshes().forEach((m) => { m.metadata = { tile: true, x: t.x, y: t.y }; });
    box.parent = this.root;
    // v33 diorama: soft blob drop shadow floating in the void beneath the tile
    this.addDropShadow(box, t.x - c, t.y - c, t.terrain);
    // fog of war depth: explored but not currently visible → dimmed
    if (!visible) {
      box.visibility = 0.75;
      box.getChildMeshes().forEach((m) => (m.visibility = 0.75));
    }
    this.tileMeshes.set(key, box);

    const decor: Mesh[] = [];
    const top = h - 0.4;
    if (t.road) {
      // v38 roads: sandy paving — a center disc plus strips reaching toward each
      // 4-adjacent road tile or friendly-city tile, so paths read as connected
      const roadMat = this.mat("#c9a86a");
      const hub = MeshBuilder.CreateCylinder("road", { diameter: 0.34, height: 0.045, tessellation: 10 }, this.scene);
      hub.position = new Vector3(t.x - c, top + 0.025, t.y - c);
      hub.material = roadMat;
      hub.metadata = { tile: true, x: t.x, y: t.y };
      hub.parent = this.root;
      decor.push(hub);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = t.x + dx, ny = t.y + dy;
        if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) continue;
        const nb = s.tiles[ny * s.size + nx];
        const links = nb.road || nb.cityId !== null;
        if (!links) continue;
        const strip = MeshBuilder.CreateBox("roadStrip", { width: dx !== 0 ? 0.5 : 0.16, height: 0.04, depth: dy !== 0 ? 0.5 : 0.16 }, this.scene);
        strip.position = new Vector3(t.x - c + dx * 0.33, top + 0.022, t.y - c + dy * 0.33);
        strip.material = roadMat;
        strip.metadata = { tile: true, x: t.x, y: t.y };
        strip.parent = this.root;
        decor.push(strip);
      }
    }
    if (t.port !== null) {
      // port: wooden pier + mast with a tribe-colored triangular sail (reads as "harbor")
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
      // sail: flattened cone reads as a triangular sail from the game camera
      const sail = MeshBuilder.CreateCylinder("sail", { diameterTop: 0, diameterBottom: 0.3, height: 0.34, tessellation: 3 }, this.scene);
      sail.position = new Vector3(t.x - c + 0.02, top + 0.34, t.y - c);
      sail.scaling.z = 0.25;
      sail.material = this.mat("#f2ead8");
      sail.metadata = { tile: true, x: t.x, y: t.y };
      sail.parent = this.root;
      decor.push(sail);
    }
    if (t.terrain === "forest") {
      // per-biome tree silhouettes: the forest's SHAPE changes with the map
      // preset, not just its color (conifer / pine / palm / acacia)
      const kind = this.bio.treeKind;
      const md = { tile: true, x: t.x, y: t.y };
      const treeCount = (kind === "palm" || kind === "acacia" ? 2 : 3) + ((t.x * 7 + t.y * 11) % 2);
      for (let i = 0; i < treeCount; i++) {
        const px = t.x - c + (i === 3 ? 0.08 : (i - 1) * 0.26);
        const pz = t.y - c + (i === 3 ? -0.32 : ((i * 7) % 3 - 1) * 0.24);
        const seed = (i * 13 + t.x * 5 + t.y * 3) % 3;
        const leafHex = i === 1 ? this.bio.tree.canopyB : i === 0 ? this.bio.tree.canopyA : this.bio.tree.canopyLight;
        if (kind === "palm") {
          // palm: tall leaning bare trunk + radiating frond blades
          const th = 0.34 + seed * 0.07;
          const trunk = MeshBuilder.CreateCylinder("trk", { diameterTop: 0.05, diameterBottom: 0.075, height: th, tessellation: 5 }, this.scene);
          trunk.position = new Vector3(px, top + th / 2, pz);
          trunk.rotation.z = (seed - 1) * 0.16;
          trunk.material = this.litMat(this.bio.tree.trunk); this.facet(trunk);
          trunk.metadata = md; trunk.parent = this.root; decor.push(trunk);
          const crownY = top + th + 0.02;
          for (let f = 0; f < 5; f++) {
            const frond = MeshBuilder.CreateCylinder("tr", { diameterTop: 0, diameterBottom: 0.11, height: 0.24, tessellation: 3 }, this.scene);
            frond.position = new Vector3(px + Math.cos(f * 1.256 + seed) * 0.1 + (seed - 1) * 0.05, crownY + 0.03, pz + Math.sin(f * 1.256 + seed) * 0.1);
            frond.rotation.z = Math.cos(f * 1.256 + seed) * 1.15;
            frond.rotation.x = -Math.sin(f * 1.256 + seed) * 1.15;
            frond.scaling.z = 0.4;
            frond.material = this.litMat(f % 2 ? this.bio.tree.canopyB : leafHex); this.facet(frond);
            frond.metadata = md; frond.parent = this.root; decor.push(frond);
          }
          // coconut cluster
          const nut = MeshBuilder.CreateIcoSphere("tr", { radius: 0.035, subdivisions: 1 }, this.scene);
          nut.position = new Vector3(px + (seed - 1) * 0.05, crownY - 0.01, pz + 0.03);
          nut.material = this.litMat(this.bio.tree.trunk); this.facet(nut);
          nut.metadata = md; nut.parent = this.root; decor.push(nut);
        } else if (kind === "acacia") {
          // acacia: short trunk under a wide flat-topped umbrella canopy
          const th = 0.2 + seed * 0.05;
          const trunk = MeshBuilder.CreateCylinder("trk", { diameterTop: 0.06, diameterBottom: 0.1, height: th, tessellation: 5 }, this.scene);
          trunk.position = new Vector3(px, top + th / 2, pz);
          trunk.material = this.litMat(this.bio.tree.trunk); this.facet(trunk);
          trunk.metadata = md; trunk.parent = this.root; decor.push(trunk);
          const umbrella = MeshBuilder.CreateCylinder("tr", { diameterTop: 0.42, diameterBottom: 0.2, height: 0.1, tessellation: 6 }, this.scene);
          umbrella.position = new Vector3(px, top + th + 0.05, pz);
          umbrella.material = this.litMat(leafHex); this.facet(umbrella);
          umbrella.metadata = md; umbrella.parent = this.root; decor.push(umbrella);
          const crownTop = MeshBuilder.CreateCylinder("tr", { diameterTop: 0.3, diameterBottom: 0.44, height: 0.05, tessellation: 6 }, this.scene);
          crownTop.position = new Vector3(px, top + th + 0.12, pz);
          crownTop.material = this.litMat(this.bio.tree.canopyB); this.facet(crownTop);
          crownTop.metadata = md; crownTop.parent = this.root; decor.push(crownTop);
        } else {
          // conifer / pine: trunk + stacked cone skirts (pine gets a taller,
          // narrower, three-tier silhouette; conifer keeps the classic cone)
          const tiers = kind === "pine" ? 3 : 1;
          const th = (kind === "pine" ? 0.44 : 0.4) + seed * 0.09;
          const trunk = MeshBuilder.CreateCylinder("trk", { diameter: 0.09, height: 0.22, tessellation: 5 }, this.scene);
          trunk.position = new Vector3(px, top + 0.11, pz);
          trunk.material = this.litMat(this.bio.tree.trunk); this.facet(trunk);
          trunk.metadata = md; trunk.parent = this.root; decor.push(trunk);
          for (let k = 0; k < tiers; k++) {
            const frac = k / tiers;
            const w = (kind === "pine" ? 0.32 : 0.3) * (1 - frac * 0.42);
            const h = th / (tiers === 1 ? 1 : 1.9);
            const cone = MeshBuilder.CreateCylinder("tr", { diameterTop: 0, diameterBottom: w, height: h, tessellation: 6 }, this.scene);
            cone.position = new Vector3(px, top + 0.2 + frac * th * 0.42 + h / 2, pz);
            cone.material = this.litMat(k === 0 ? leafHex : k === 1 ? this.bio.tree.canopyB : this.bio.tree.canopyLight); this.facet(cone);
            cone.metadata = md; cone.parent = this.root; decor.push(cone);
          }
        }
      }
    }
    if (t.terrain === "grass" && !t.resource && !t.building && !t.ruin && !t.greatRuin && !t.road && t.cityId === null) {
      // micro-decor: seeded tufts + the odd pebble so bare plains aren't empty
      const g = (t.x * 53 + t.y * 97) % 10;
      if (g < 4) {
        const md = { tile: true, x: t.x, y: t.y };
        const spots: [number, number][] = [[0.28 - (g % 3) * 0.24, -0.3 + (g % 4) * 0.18], [-0.24 + (g % 2) * 0.4, 0.26 - (g % 3) * 0.14]];
        for (let i = 0; i <= (g & 1); i++) {
          const tuft = MeshBuilder.CreateCylinder("tuft", { diameterTop: 0, diameterBottom: 0.1, height: 0.1, tessellation: 4 }, this.scene);
          tuft.position = new Vector3(t.x - c + spots[i][0], top + 0.05, t.y - c + spots[i][1]);
          tuft.rotation.y = g * 0.7 + i;
          tuft.material = this.mat(this.bio.tree.canopyLight);
          tuft.metadata = md; tuft.parent = this.root; decor.push(tuft);
        }
        if (g === 3) {
          const pebble = MeshBuilder.CreateIcoSphere("pebble", { radius: 0.045, subdivisions: 1 }, this.scene);
          pebble.position = new Vector3(t.x - c - spots[0][0] * 0.7, top + 0.028, t.y - c - spots[0][1] * 0.7);
          pebble.scaling.y = 0.6;
          pebble.material = this.mat(this.bio.rock.shadow);
          pebble.metadata = md; pebble.parent = this.root; decor.push(pebble);
        }
      }
    }
    if (t.terrain === "water" && !fogged && t.port === null) {
      // fish: ~45% of shallow tiles carry a dark fin + tail breaking the
      // surface (Polytopia's shallow-water life rule), gently bobbing
      const f = (t.x * 37 + t.y * 59) % 100;
      if (f < 45) {
        const md = { tile: true, x: t.x, y: t.y };
        const surf = TERRAIN_H[t.terrain] - 0.4;
        const fx = t.x - c + ((f % 5) - 2) * 0.12;
        const fz = t.y - c + ((f % 7) - 3) * 0.1;
        const body = darken(this.bio.terrain.ocean.top, 0.55);
        const fin = wedgeMesh(this.scene, "fish", 0.17, 0.15, 0.06);
        fin.position = new Vector3(fx, surf + 0.045, fz);
        fin.rotation.y = (f % 9) * 0.6;
        fin.material = this.mat(body);
        fin.metadata = md; fin.parent = this.root; decor.push(fin);
        this.seaMotion.push({ m: fin, y0: surf + 0.045, amp: 0.018, sp: 1.6 + (f % 5) * 0.2, ph: f, spin: 0 });
        const tail = wedgeMesh(this.scene, "fish", 0.12, 0.1, 0.045);
        tail.position = new Vector3(fx - Math.cos((f % 9) * 0.6) * 0.11, surf + 0.025, fz - Math.sin((f % 9) * 0.6) * 0.11);
        tail.rotation.y = (f % 9) * 0.6;
        tail.rotation.z = 0.5;
        tail.material = this.mat(body);
        tail.metadata = md; tail.parent = this.root; decor.push(tail);
        this.seaMotion.push({ m: tail, y0: surf + 0.025, amp: 0.014, sp: 1.6 + (f % 5) * 0.2, ph: f + 0.8, spin: 0 });
      }
    }
    if ((t.terrain === "water" || t.terrain === "ocean") && !fogged) {
      // wave glints: thin pale dashes on ~1/3 of water tiles — the flat sea
      // gets sparkle without any texture work
      const w = (t.x * 23 + t.y * 41) % 9;
      if (w < 3) {
        const md = { tile: true, x: t.x, y: t.y };
        const surf = TERRAIN_H[t.terrain] - 0.4 + 0.012;
        for (let k = 0; k <= (w & 1); k++) {
          const arc = MeshBuilder.CreateBox("waveglint", { width: 0.17 - k * 0.05, height: 0.014, depth: 0.022 }, this.scene);
          arc.position = new Vector3(
            t.x - c - 0.28 + ((w * 7 + k * 13) % 9) * 0.07,
            surf,
            t.y - c - 0.24 + ((w * 5 + k * 7) % 8) * 0.07
          );
          arc.rotation.y = (w + k) * 0.5;
          arc.material = this.mat(this.bio.shore);
          arc.metadata = md; arc.parent = this.root; decor.push(arc);
          this.seaMotion.push({ m: arc, y0: surf, amp: 0.01, sp: 1.1 + k * 0.4, ph: w * 1.7 + k, spin: 0 });
        }
      }
    }
    if (t.terrain === "mountain") {
      // Mountain massif: a wide rocky base skirt blends the rock into the tile
      // (fixes "cone sitting on a flat square") + main peak, snow cap, shoulder,
      // and a couple of scree boulders scattered at the foot.
      const seed = (t.x * 31 + t.y * 17) % 7;
      const yaw = seed * 0.37;
      const md = { tile: true, x: t.x, y: t.y };
      // 1. base skirt: broad, low frustum nearly spanning the tile — its rim
      //    sinks slightly INTO the tile top so there is no hard 90° seam
      const skirt = MeshBuilder.CreateCylinder("pkbase", { diameterTop: 0.55, diameterBottom: 0.98, height: 0.2, tessellation: 7 }, this.scene);
      skirt.position = new Vector3(t.x - c, top + 0.06, t.y - c);
      skirt.rotation.y = yaw;
      skirt.material = this.litMat(this.bio.rock.shadow); this.facet(skirt);
      skirt.metadata = md; skirt.parent = this.root; decor.push(skirt);
      // 2. main massif — silhouette family varies per biome
      const rk = this.bio.rockKind;
      if (rk === "mesa") {
        // mesa: flat-topped stepped butte (arid / island volcanic plateau)
        const tier1 = MeshBuilder.CreateCylinder("pk", { diameterTop: 0.5, diameterBottom: 0.66, height: 0.3, tessellation: 6 }, this.scene);
        tier1.position = new Vector3(t.x - c, top + 0.26, t.y - c);
        tier1.rotation.y = yaw + 0.3;
        tier1.material = this.litMat(this.bio.rock.body); this.facet(tier1);
        tier1.metadata = md; tier1.parent = this.root; decor.push(tier1);
        const tier2 = MeshBuilder.CreateCylinder("pk", { diameterTop: 0.3, diameterBottom: 0.44, height: 0.24, tessellation: 6 }, this.scene);
        tier2.position = new Vector3(t.x - c + 0.04, top + 0.52, t.y - c - 0.03);
        tier2.rotation.y = yaw - 0.4;
        tier2.material = this.litMat(this.bio.rock.shadow); this.facet(tier2);
        tier2.metadata = md; tier2.parent = this.root; decor.push(tier2);
        const capm = MeshBuilder.CreateCylinder("snow", { diameterTop: 0.26, diameterBottom: 0.3, height: 0.05, tessellation: 6 }, this.scene);
        capm.position = new Vector3(t.x - c + 0.04, top + 0.66, t.y - c - 0.03);
        capm.rotation.y = yaw - 0.4;
        capm.material = this.litMat(this.bio.rock.snow); this.facet(capm);
        capm.metadata = md; capm.parent = this.root; decor.push(capm);
      } else if (rk === "crag") {
        // crag: steep twin spires with heavy snow — alpine
        const spire = MeshBuilder.CreateCylinder("pk", { diameterTop: 0.06, diameterBottom: 0.5, height: 0.66, tessellation: 5 }, this.scene);
        spire.position = new Vector3(t.x - c - 0.03, top + 0.42, t.y - c + 0.02);
        spire.rotation.y = yaw + 0.3;
        spire.rotation.z = 0.05;
        spire.material = this.litMat(this.bio.rock.body); this.facet(spire);
        spire.metadata = md; spire.parent = this.root; decor.push(spire);
        const snowC = MeshBuilder.CreateCylinder("snow", { diameterTop: 0, diameterBottom: 0.17, height: 0.2, tessellation: 5 }, this.scene);
        snowC.position = new Vector3(t.x - c - 0.03, top + 0.75, t.y - c + 0.02);
        snowC.rotation.y = yaw + 0.3;
        snowC.material = this.litMat(this.bio.rock.snow); this.facet(snowC);
        snowC.metadata = md; snowC.parent = this.root; decor.push(snowC);
        const sub = MeshBuilder.CreateCylinder("pk", { diameterTop: 0.04, diameterBottom: 0.28, height: 0.42, tessellation: 5 }, this.scene);
        sub.position = new Vector3(t.x - c + 0.24, top + 0.3, t.y - c - 0.16);
        sub.rotation.y = yaw - 0.6;
        sub.material = this.litMat(this.bio.rock.shadow); this.facet(sub);
        sub.metadata = md; sub.parent = this.root; decor.push(sub);
        const subSnow = MeshBuilder.CreateCylinder("snow", { diameterTop: 0, diameterBottom: 0.1, height: 0.11, tessellation: 5 }, this.scene);
        subSnow.position = new Vector3(t.x - c + 0.24, top + 0.53, t.y - c - 0.16);
        subSnow.material = this.litMat(this.bio.rock.snow); this.facet(subSnow);
        subSnow.metadata = md; subSnow.parent = this.root; decor.push(subSnow);
      } else {
        const rock = MeshBuilder.CreateCylinder("pk", { diameterTop: 0.1, diameterBottom: 0.58, height: 0.46, tessellation: 6 }, this.scene);
        rock.position = new Vector3(t.x - c, top + 0.34, t.y - c);
        rock.rotation.y = yaw + 0.3;
        rock.material = this.litMat(this.bio.rock.body); this.facet(rock);
        rock.metadata = md; rock.parent = this.root; decor.push(rock);
        const snow = MeshBuilder.CreateCylinder("snow", { diameterTop: 0, diameterBottom: 0.2, height: 0.22, tessellation: 6 }, this.scene);
        snow.position = new Vector3(t.x - c, top + 0.66, t.y - c);
        snow.rotation.y = rock.rotation.y;
        snow.material = this.litMat(this.bio.rock.snow); this.facet(snow);
        snow.metadata = md; snow.parent = this.root; decor.push(snow);
      }
      // 3. shoulder peak growing out of the skirt edge (classic only — the
      //    mesa and crag families carry their own secondary mass)
      if (rk === "classic") {
        const shx = 0.22 - (seed % 2) * 0.44, shz = -0.16 + (seed % 3) * 0.14;
        const shoulder = MeshBuilder.CreateCylinder("pk2", { diameterTop: 0, diameterBottom: 0.34, height: 0.34, tessellation: 5 }, this.scene);
        shoulder.position = new Vector3(t.x - c + shx, top + 0.24, t.y - c + shz);
        shoulder.rotation.y = yaw + 1.1;
        shoulder.material = this.litMat(this.bio.rock.body); this.facet(shoulder);
        shoulder.metadata = md; shoulder.parent = this.root; decor.push(shoulder);
      }
      // 4. scree boulders at the foot for a natural transition
      for (const [bx, bz, br] of [[0.34, 0.3, 0.07], [-0.32, 0.26, 0.055]] as const) {
        const boulder = MeshBuilder.CreateIcoSphere("scree", { radius: br, subdivisions: 1 }, this.scene);
        boulder.position = new Vector3(t.x - c + bx, top + br * 0.7, t.y - c + bz);
        boulder.scaling.y = 0.75;
        boulder.material = this.litMat(this.bio.rock.shadow); this.facet(boulder);
        boulder.metadata = md; boulder.parent = this.root; decor.push(boulder);
      }
    }
    if (t.resource) {
      // distinct silhouettes per resource type (was one tiny ambiguous orb)
      const rx = t.x - c + 0.3, rz = t.y - c + 0.3;
      const md = { tile: true, x: t.x, y: t.y };
      if (t.resource === "fruit") {
        // fruit: leafy bush studded with bright berries
        const bush = MeshBuilder.CreateIcoSphere("res", { radius: 0.16, subdivisions: 1 }, this.scene);
        bush.position = new Vector3(rx, top + 0.12, rz);
        bush.scaling.y = 0.8;
        bush.material = this.mat("#3f9e46");
        bush.metadata = md; bush.parent = this.root; decor.push(bush);
        for (const [bx, bz, by] of [[-0.08, 0.06, 0.2], [0.1, -0.02, 0.16], [0, 0.1, 0.1]] as const) {
          const berry = MeshBuilder.CreateIcoSphere("berry", { radius: 0.055, subdivisions: 1 }, this.scene);
          berry.position = new Vector3(rx + bx, top + by, rz + bz);
          berry.material = this.mat("#ff5a3c");
          berry.metadata = md; berry.parent = this.root; decor.push(berry);
        }
      } else if (t.resource === "animal") {
        // animal: little brown critter — body, head, two ears
        const body = MeshBuilder.CreateBox("res", { width: 0.24, depth: 0.16, height: 0.14 }, this.scene);
        body.position = new Vector3(rx, top + 0.08, rz);
        body.material = this.mat("#a5713d");
        body.metadata = md; body.parent = this.root; decor.push(body);
        const head = MeshBuilder.CreateBox("head", { width: 0.11, depth: 0.11, height: 0.11 }, this.scene);
        head.position = new Vector3(rx + 0.15, top + 0.16, rz);
        head.material = this.mat("#b8834e");
        head.metadata = md; head.parent = this.root; decor.push(head);
        for (const ez of [-0.035, 0.035]) {
          const ear = MeshBuilder.CreateBox("ear", { width: 0.03, depth: 0.03, height: 0.07 }, this.scene);
          ear.position = new Vector3(rx + 0.15, top + 0.25, rz + ez);
          ear.material = this.mat("#8a5c30");
          ear.metadata = md; ear.parent = this.root; decor.push(ear);
        }
      } else {
        // mineral: glinting crystal shard cluster
        let crysMat = this.mats.get("crystal");
        if (!crysMat) {
          crysMat = new StandardMaterial("crystal", this.scene);
          // bloom accent: bright emissive above the 0.88 threshold
          crysMat.emissiveColor = Color3.FromHexString("#9fe8ff");
          crysMat.diffuseColor = Color3.Black();
          crysMat.specularColor = Color3.Black();
          crysMat.disableLighting = true;
          this.mats.set("crystal", crysMat);
        }
        for (const [sx, sz, sh, rot] of [[0, 0, 0.34, 0], [0.11, -0.06, 0.2, 0.5], [-0.09, 0.08, 0.16, -0.4]] as const) {
          const shard = MeshBuilder.CreateCylinder("res", { diameterTop: 0, diameterBottom: 0.12, height: sh, tessellation: 4 }, this.scene);
          shard.position = new Vector3(rx + sx, top + sh / 2, rz + sz);
          shard.rotation.z = rot * 0.3;
          shard.material = crysMat;
          shard.metadata = md; shard.parent = this.root; decor.push(shard);
        }
      }
    }
    if (t.building) {
      // v35 economy buildings — small structures replacing the harvested look
      const bx = t.x - c, bz = t.y - c;
      const md = { tile: true, x: t.x, y: t.y };
      if (t.building === "hut") {
        // lumber hut: timber cabin with a dark gable roof
        const base = MeshBuilder.CreateBox("bld", { width: 0.34, depth: 0.28, height: 0.18 }, this.scene);
        base.position = new Vector3(bx + 0.05, top + 0.09, bz + 0.05);
        base.material = this.mat("#8a6642");
        base.metadata = md; base.parent = this.root; decor.push(base);
        const roof = MeshBuilder.CreateCylinder("bldroof", { diameterTop: 0, diameterBottom: 0.42, height: 0.16, tessellation: 4 }, this.scene);
        roof.position = new Vector3(bx + 0.05, top + 0.26, bz + 0.05);
        roof.rotation.y = Math.PI / 4;
        roof.material = this.mat("#6e4f31");
        roof.metadata = md; roof.parent = this.root; decor.push(roof);
      } else if (t.building === "farm") {
        // farm: golden crop rows + tiny shed
        for (const dz of [-0.14, 0, 0.14]) {
          const row = MeshBuilder.CreateBox("bld", { width: 0.46, depth: 0.09, height: 0.09 }, this.scene);
          row.position = new Vector3(bx, top + 0.045, bz + dz);
          row.material = this.mat("#d8b84a");
          row.metadata = md; row.parent = this.root; decor.push(row);
        }
        const shed = MeshBuilder.CreateBox("bldshed", { width: 0.13, depth: 0.13, height: 0.14 }, this.scene);
        shed.position = new Vector3(bx + 0.3, top + 0.07, bz - 0.28);
        shed.material = this.mat("#8a6642");
        shed.metadata = md; shed.parent = this.root; decor.push(shed);
      } else if (t.building === "mine") {
        // mine: dark tunnel mouth into a rock mound + support beams
        const mound = MeshBuilder.CreateIcoSphere("bld", { radius: 0.24, subdivisions: 1 }, this.scene);
        mound.position = new Vector3(bx, top + 0.1, bz);
        mound.scaling.y = 0.75;
        mound.material = this.mat(PALETTE.rock.body);
        mound.metadata = md; mound.parent = this.root; decor.push(mound);
        const mouth = MeshBuilder.CreateBox("bldmouth", { width: 0.14, depth: 0.06, height: 0.14 }, this.scene);
        mouth.position = new Vector3(bx, top + 0.07, bz + 0.21);
        mouth.material = this.mat("#1b1b30");
        mouth.metadata = md; mouth.parent = this.root; decor.push(mouth);
        for (const sx of [-0.09, 0.09]) {
          const beam = MeshBuilder.CreateBox("bldbeam", { width: 0.03, depth: 0.03, height: 0.16 }, this.scene);
          beam.position = new Vector3(bx + sx, top + 0.08, bz + 0.23);
          beam.material = this.mat("#6e4f31");
          beam.metadata = md; beam.parent = this.root; decor.push(beam);
        }
      } else if (t.building === "sawmill") {
        // v36 sawmill: open timber frame + big circular saw blade + log pile
        const frame = MeshBuilder.CreateBox("bld", { width: 0.36, depth: 0.24, height: 0.16 }, this.scene);
        frame.position = new Vector3(bx, top + 0.08, bz);
        frame.material = this.mat("#8a6642");
        frame.metadata = md; frame.parent = this.root; decor.push(frame);
        const roof = MeshBuilder.CreateBox("bldroof", { width: 0.42, depth: 0.3, height: 0.05 }, this.scene);
        roof.position = new Vector3(bx, top + 0.2, bz);
        roof.rotation.z = 0.12;
        roof.material = this.mat("#6e4f31");
        roof.metadata = md; roof.parent = this.root; decor.push(roof);
        const blade = MeshBuilder.CreateCylinder("bldblade", { diameter: 0.18, height: 0.02, tessellation: 12 }, this.scene);
        blade.position = new Vector3(bx + 0.16, top + 0.14, bz + 0.14);
        blade.rotation.x = Math.PI / 2;
        blade.material = this.mat("#b9bdd4");
        blade.metadata = md; blade.parent = this.root; decor.push(blade);
        for (let i = 0; i < 3; i++) {
          const log = MeshBuilder.CreateCylinder("bldlog", { diameter: 0.07, height: 0.26, tessellation: 6 }, this.scene);
          log.position = new Vector3(bx - 0.22, top + 0.04 + (i === 2 ? 0.06 : 0), bz - 0.12 + (i % 2) * 0.08);
          log.rotation.z = Math.PI / 2;
          log.material = this.mat("#a07a4e");
          log.metadata = md; log.parent = this.root; decor.push(log);
        }
      } else if (t.building === "windmill") {
        // v36 windmill: tapered tower + four cream sails on a hub
        const tower = MeshBuilder.CreateCylinder("bld", { diameterBottom: 0.24, diameterTop: 0.16, height: 0.36, tessellation: 6 }, this.scene);
        tower.position = new Vector3(bx, top + 0.18, bz);
        tower.material = this.mat("#a89a86");
        tower.metadata = md; tower.parent = this.root; decor.push(tower);
        const cap = MeshBuilder.CreateCylinder("bldcap", { diameterTop: 0, diameterBottom: 0.2, height: 0.1, tessellation: 6 }, this.scene);
        cap.position = new Vector3(bx, top + 0.41, bz);
        cap.material = this.mat("#6e4f31");
        cap.metadata = md; cap.parent = this.root; decor.push(cap);
        for (let i = 0; i < 4; i++) {
          const sail = MeshBuilder.CreateBox("bldsail", { width: 0.05, depth: 0.015, height: 0.2 }, this.scene);
          const ang = (Math.PI / 2) * i + Math.PI / 4;
          sail.position = new Vector3(bx + Math.cos(ang) * 0.11, top + 0.34 + Math.sin(ang) * 0.11, bz + 0.13);
          sail.rotation.z = ang;
          sail.material = this.mat("#efe6d2");
          sail.metadata = md; sail.parent = this.root; decor.push(sail);
        }
      } else if (t.building === "market") {
        // v37 market: awning stall with striped canopy + crates + a gold coin marker
        const stall = MeshBuilder.CreateBox("bld", { width: 0.34, depth: 0.26, height: 0.12 }, this.scene);
        stall.position = new Vector3(bx, top + 0.06, bz);
        stall.material = this.mat("#8a6642");
        stall.metadata = md; stall.parent = this.root; decor.push(stall);
        // striped canopy: alternating cream / crimson slats
        for (let i = 0; i < 4; i++) {
          const slat = MeshBuilder.CreateBox("bldawning", { width: 0.1, depth: 0.34, height: 0.03 }, this.scene);
          slat.position = new Vector3(bx - 0.15 + i * 0.1, top + 0.24, bz);
          slat.rotation.z = 0.1;
          slat.material = this.mat(i % 2 === 0 ? "#efe6d2" : "#c8553d");
          slat.metadata = md; slat.parent = this.root; decor.push(slat);
        }
        // corner posts
        for (const [px, pz] of [[-0.15, -0.12], [0.15, -0.12], [-0.15, 0.12], [0.15, 0.12]] as const) {
          const post = MeshBuilder.CreateBox("bldpost", { width: 0.03, depth: 0.03, height: 0.2 }, this.scene);
          post.position = new Vector3(bx + px, top + 0.12, bz + pz);
          post.material = this.mat("#6e4f31");
          post.metadata = md; post.parent = this.root; decor.push(post);
        }
        // crates beside the stall
        const crate = MeshBuilder.CreateBox("bldcrate", { size: 0.1 }, this.scene);
        crate.position = new Vector3(bx + 0.24, top + 0.05, bz + 0.1);
        crate.rotation.y = 0.4;
        crate.material = this.mat("#a07a4e");
        crate.metadata = md; crate.parent = this.root; decor.push(crate);
        // gold coin marker: reads "star economy" at a glance
        const coin = MeshBuilder.CreateCylinder("bldcoin", { diameter: 0.12, height: 0.03, tessellation: 12 }, this.scene);
        coin.position = new Vector3(bx - 0.22, top + 0.16, bz - 0.1);
        coin.rotation.x = Math.PI / 2.6;
        coin.material = this.mat("#ffd76a");
        coin.metadata = md; coin.parent = this.root; decor.push(coin);
      }
    }
    if (t.ruin) {
      // Ancient ruin: a weathered temple remnant — cracked stone plinth, a ring
      // of broken columns at varying heights, a leaning obelisk, scattered
      // rubble, and a glowing amber relic hovering at the center.
      const md = { tile: true, x: t.x, y: t.y };
      const stoneA = "#8f93b8", stoneB = "#767a9e", stoneC = "#5f6386";
      // cracked plinth: two offset slabs read as broken paving
      const slabA = MeshBuilder.CreateBox("ruinplinth", { width: 0.55, depth: 0.4, height: 0.07 }, this.scene);
      slabA.position = new Vector3(t.x - c - 0.06, top + 0.035, t.y - c + 0.04);
      slabA.rotation.y = 0.12;
      slabA.material = this.mat(stoneB);
      slabA.metadata = md; slabA.parent = this.root; decor.push(slabA);
      const slabB = MeshBuilder.CreateBox("ruinplinth2", { width: 0.34, depth: 0.3, height: 0.06 }, this.scene);
      slabB.position = new Vector3(t.x - c + 0.22, top + 0.03, t.y - c - 0.16);
      slabB.rotation.y = -0.3;
      slabB.material = this.mat(stoneC);
      slabB.metadata = md; slabB.parent = this.root; decor.push(slabB);
      // broken column ring: three stumps of differing heights, slightly tilted
      for (const [px, pz, h, tilt] of [[-0.24, -0.14, 0.34, 0.1], [0.2, 0.18, 0.22, -0.14], [-0.1, 0.26, 0.14, 0.08]] as const) {
        const col = MeshBuilder.CreateCylinder("ruincol", { diameterTop: 0.11, diameterBottom: 0.13, height: h, tessellation: 6 }, this.scene);
        col.position = new Vector3(t.x - c + px, top + 0.07 + h / 2, t.y - c + pz);
        col.rotation.z = tilt;
        col.material = this.mat(stoneA);
        col.metadata = md; col.parent = this.root; decor.push(col);
        // broken top: small angled cap slab on the tallest stump
        if (h > 0.3) {
          const cap2 = MeshBuilder.CreateBox("ruincap2", { width: 0.16, depth: 0.16, height: 0.05 }, this.scene);
          cap2.position = new Vector3(t.x - c + px, top + 0.1 + h, t.y - c + pz);
          cap2.rotation.y = 0.4; cap2.rotation.x = 0.12;
          cap2.material = this.mat(stoneB);
          cap2.metadata = md; cap2.parent = this.root; decor.push(cap2);
        }
      }
      // leaning obelisk — the ruin's landmark silhouette
      const obelisk = MeshBuilder.CreateCylinder("ruin", { diameterTop: 0.07, diameterBottom: 0.17, height: 0.5, tessellation: 4 }, this.scene);
      obelisk.position = new Vector3(t.x - c + 0.08, top + 0.3, t.y - c - 0.02);
      obelisk.rotation.y = Math.PI / 5;
      obelisk.rotation.z = -0.18;
      obelisk.material = this.mat(stoneA);
      obelisk.metadata = md; obelisk.parent = this.root; decor.push(obelisk);
      // scattered rubble stones
      for (const [rx2, rz2, rr] of [[0.3, -0.28, 0.05], [-0.32, 0.08, 0.045], [0.02, -0.3, 0.04]] as const) {
        const rub = MeshBuilder.CreateIcoSphere("rubble", { radius: rr, subdivisions: 1 }, this.scene);
        rub.position = new Vector3(t.x - c + rx2, top + rr * 0.6, t.y - c + rz2);
        rub.scaling.y = 0.6;
        rub.material = this.mat(stoneC);
        rub.metadata = md; rub.parent = this.root; decor.push(rub);
      }
      // glowing relic hovering over the plinth center
      const cap = MeshBuilder.CreateIcoSphere("ruincap", { radius: 0.075, subdivisions: 1 }, this.scene);
      cap.position = new Vector3(t.x - c - 0.06, top + 0.3, t.y - c + 0.04);
      let capMat = this.mats.get("ruin-glow");
      if (!capMat) {
        capMat = new StandardMaterial("ruin-glow", this.scene);
        capMat.emissiveColor = Color3.FromHexString("#ffe08a");
        capMat.diffuseColor = Color3.Black();
        capMat.disableLighting = true;
        this.mats.set("ruin-glow", capMat);
      }
      cap.material = capMat;
      cap.metadata = { tile: true, x: t.x, y: t.y };
      cap.parent = this.root;
      decor.push(cap);
    }
    if (t.greatRuin) {
      // GREAT RUIN: golden twin obelisks flanking a floating radiant core
      let goldMat = this.mats.get("greatruin-gold");
      if (!goldMat) {
        goldMat = new StandardMaterial("greatruin-gold", this.scene);
        goldMat.emissiveColor = Color3.FromHexString("#e8c766");
        goldMat.diffuseColor = Color3.Black();
        goldMat.disableLighting = true;
        this.mats.set("greatruin-gold", goldMat);
      }
      let coreMat = this.mats.get("greatruin-core");
      if (!coreMat) {
        coreMat = new StandardMaterial("greatruin-core", this.scene);
        coreMat.emissiveColor = Color3.FromHexString("#fff3c4");
        coreMat.diffuseColor = Color3.Black();
        coreMat.disableLighting = true;
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
      const col = isNeutral ? PALETTE.city.neutral : s.tribes[city.tribe!].color;
      // Polytopia-style settlement: a paved town square with a tribe-color
      // border frame, filled by a seeded building cluster that grows with
      // city level. Villages are two modest huts on a smaller sand plaza.
      const md = { tile: true, x: t.x, y: t.y };
      const n = isNeutral ? 2 : Math.min(7, 2 + city.level + (city.isCapital ? 1 : 0));
      const pw = isNeutral ? 0.72 : 0.9;
      const plaza = MeshBuilder.CreateBox("cityplate", { width: pw, depth: pw, height: 0.06 }, this.scene);
      plaza.position = new Vector3(t.x - c, top + 0.03, t.y - c);
      plaza.material = this.mat(isNeutral ? "#cfc2a4" : "#cfc8b8");
      plaza.metadata = md; plaza.parent = this.root; decor.push(plaza);
      // Ownership edging: a low kerb around the plaza in a deepened owner
      // color. Kept thin and dark — a bright full-saturation frame reads as a
      // UI selection box rather than part of the world.
      const bh = pw / 2 - 0.015;
      const kerb = darken(col, 0.72);
      for (const [fx, fz, fw, fd] of [[0, -bh, pw, 0.035], [0, bh, pw, 0.035], [-bh, 0, 0.035, pw], [bh, 0, 0.035, pw]] as const) {
        const edge = MeshBuilder.CreateBox("cityedge", { width: fw, depth: fd, height: 0.045 }, this.scene);
        edge.position = new Vector3(t.x - c + fx, top + 0.05, t.y - c + fz);
        edge.material = this.mat(kerb);
        edge.metadata = md; edge.parent = this.root; decor.push(edge);
      }
      // corner posts in the full owner color: small, bright, unambiguous
      for (const [cx, cz] of [[-bh, -bh], [bh, -bh], [-bh, bh], [bh, bh]] as const) {
        const post = MeshBuilder.CreateBox("cityedge", { width: 0.075, depth: 0.075, height: 0.075 }, this.scene);
        post.position = new Vector3(t.x - c + cx, top + 0.065, t.y - c + cz);
        post.material = this.litMat(col); this.facet(post);
        post.metadata = md; post.parent = this.root; decor.push(post);
      }
      // seeded cluster: center building tallest, satellites around it
      const js = (t.x * 7 + t.y * 13) % 4;
      const SLOTS: [number, number][] = [[0, 0], [0.26, -0.12], [-0.25, 0.14], [0.08, 0.27], [-0.23, -0.23], [0.27, 0.19], [-0.04, -0.31]];
      for (let i = 0; i < n; i++) {
        const slot = SLOTS[i === 0 ? 0 : 1 + ((i - 1 + js) % (SLOTS.length - 1))];
        const bw = i === 0 ? (isNeutral ? 0.22 : 0.3) : 0.17 + ((i * 17 + js) % 3) * 0.03;
        const bhh = i === 0 ? (isNeutral ? 0.24 : 0.4 + city.level * 0.02) : 0.2 + ((i * 11 + js) % 3) * 0.05;
        const house = MeshBuilder.CreateBox("cty", { width: bw, depth: bw, height: bhh }, this.scene);
        house.position = new Vector3(t.x - c + slot[0], top + 0.06 + bhh / 2, t.y - c + slot[1]);
        house.material = this.litMat(PALETTE.city.house); this.facet(house);
        house.metadata = md; house.parent = this.root; decor.push(house);
        if (i === 0 && city.isCapital && city.tribe !== null) {
          // capital: the gold spire crowns the central tower
          const spire = MeshBuilder.CreateCylinder("cap", { diameterTop: 0, diameterBottom: 0.22, height: 0.5, tessellation: 4 }, this.scene);
          spire.position = new Vector3(t.x - c + slot[0], top + 0.06 + bhh + 0.24, t.y - c + slot[1]);
          spire.rotation.y = Math.PI / 4;
          spire.material = this.litMat("#ffd76a"); this.facet(spire);
          spire.metadata = md; spire.parent = this.root; decor.push(spire);
        } else if ((i + js) % 2 === 0) {
          // pitched pyramid roof in the owner color
          const roof = MeshBuilder.CreateCylinder("roof", { diameterTop: 0, diameterBottom: bw * 1.2, height: 0.14 + bw * 0.2, tessellation: 4 }, this.scene);
          roof.position = new Vector3(t.x - c + slot[0], top + 0.06 + bhh + (0.14 + bw * 0.2) / 2, t.y - c + slot[1]);
          roof.rotation.y = Math.PI / 4;
          roof.material = this.litMat(darken(col, 0.85)); this.facet(roof);
          roof.metadata = md; roof.parent = this.root; decor.push(roof);
        } else {
          // flat slab roof with an owner-color trim cap for variety
          const slab = MeshBuilder.CreateBox("roof", { width: bw * 1.08, depth: bw * 1.08, height: 0.035 }, this.scene);
          slab.position = new Vector3(t.x - c + slot[0], top + 0.06 + bhh + 0.018, t.y - c + slot[1]);
          slab.material = this.litMat(col); this.facet(slab);
          slab.metadata = md; slab.parent = this.root; decor.push(slab);
        }
      }
      if (city.walls) {
        // city walls: stone rampart ring with four corner towers
        let wallMat = this.mats.get("city-wall");
        if (!wallMat) {
          wallMat = new StandardMaterial("city-wall", this.scene);
          wallMat.emissiveColor = Color3.FromHexString(PALETTE.city.wall);
          wallMat.diffuseColor = Color3.Black();
          wallMat.specularColor = Color3.Black();
          wallMat.disableLighting = true;
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
    if (!visible) {
      // fogged decor: dim AND wash toward indigo so bright meshes (snow caps,
      // white houses) don't punch through the fog-of-war read
      decor.forEach((m) => {
        m.visibility = 0.6;
        const cur = m.material as StandardMaterial | null;
        if (cur && cur.emissiveColor) {
          // unlit materials carry their color in emissive
          m.material = this.foggedMat(cur.emissiveColor.toHexString());
        }
      });
    }
    decor.forEach((m) => this.addShadows(m));
    this.decorMeshes.set(key, decor);
  }

  private tileColor(s: GameState, t: Tile): string {
    let base = this.bio.terrain[t.terrain].top;
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
        b.position.y = -0.02; // just under the rig's base puck
        b.material = this.mat("#8a6642");
        b.parent = node;
        b.isPickable = false;
      } else if (!u.boat && hull) {
        hull.dispose();
      }
      const h = TERRAIN_H[s.tiles[idx(u.x, u.y, s.size)].terrain];
      // Stage 2 rig stands on y=0 (feet/puck at the node origin) — sit on the tile top
      const target = new Vector3(u.x - c, h - 0.4 + 0.02, u.y - c);
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
      fireMat.emissiveColor = Color3.FromHexString("#ff8c3d");
      fireMat.diffuseColor = Color3.Black();
      fireMat.disableLighting = true;
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
      cloudMat.emissiveColor = Color3.FromHexString("#2a2d45");
      cloudMat.diffuseColor = Color3.Black();
      cloudMat.disableLighting = true;
      cloudMat.alpha = 0.82;
      this.mats.set("storm-cloud", cloudMat);
    }
    let boltMat = this.mats.get("storm-bolt");
    if (!boltMat) {
      boltMat = new StandardMaterial("storm-bolt", this.scene);
      boltMat.emissiveColor = Color3.FromHexString("#b8ccff");
      boltMat.diffuseColor = Color3.Black();
      boltMat.disableLighting = true;
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

  /**
   * A soft dark disc on the ground under a figure.
   *
   * Without it the units read as stickers hovering over the tile rather than
   * standing on it — the board is unlit and flat-shaded, so nothing else in the
   * scene casts anything. This is the cheapest possible grounding cue: one
   * shared unlit material, one 8-sided disc, no shadow map.
   */
  private addContactShadow(parent: TransformNode, radius = 0.30) {
    let m = this.mats.get("contact-shadow");
    if (!m) {
      m = new StandardMaterial("contact-shadow", this.scene);
      m.diffuseColor = Color3.Black();
      m.emissiveColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.disableLighting = true;
      m.alpha = 0.26;
      this.mats.set("contact-shadow", m);
    }
    const disc = MeshBuilder.CreateDisc("shadow", { radius, tessellation: 8 }, this.scene);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 0.012; // clear of the tile top without floating visibly
    disc.material = m;
    disc.parent = parent;
    disc.isPickable = false;
    disc.receiveShadows = false;
    return disc;
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
        eyeMat.emissiveColor = Color3.FromHexString(u.awake ? "#ff5d4d" : "#ffc851");
        eyeMat.diffuseColor = Color3.Black();
        eyeMat.disableLighting = true;
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
    // Stage 2: shared procedural character rig, dressed per class + faction
    const defIndex = u.tribe < 0 ? -1 : s.tribes[u.tribe].defIndex;
    // tribe skins may restyle the costume color; base puck keeps the true tribe color
    const skin = u.tribe < 0 ? undefined : skinFor(defIndex);
    const col = u.tribe < 0 ? "#5a4a52" : (skin?.unitColor ?? s.tribes[u.tribe].color);
    // named accent materials the rig needs (bloom-visible glow accents)
    let orbMat = this.mats.get("arcanist-orb");
    if (!orbMat) {
      orbMat = new StandardMaterial("arcanist-orb", this.scene);
      (orbMat as StandardMaterial).emissiveColor = Color3.FromHexString("#9fe4ff");
      (orbMat as StandardMaterial).diffuseColor = Color3.Black();
      (orbMat as StandardMaterial).disableLighting = true;
      this.mats.set("arcanist-orb", orbMat);
    }
    // per-tribe emissive accent (was a single fixed tide-fin aqua)
    const glowHex = tribeGlow(defIndex);
    const glowKey = "tribe-glow-" + glowHex;
    let finMat = this.mats.get(glowKey);
    if (!finMat) {
      finMat = new StandardMaterial(glowKey, this.scene);
      (finMat as StandardMaterial).emissiveColor = Color3.FromHexString(glowHex);
      (finMat as StandardMaterial).diffuseColor = Color3.Black();
      (finMat as StandardMaterial).disableLighting = true;
      this.mats.set(glowKey, finMat);
    }
    const rig = buildCharacter(
      { scene: this.scene, mat: (hex) => this.litMat(hex), color: col, defIndex, type: u.type },
      node,
      { orbMat, finMat },
    );
    // crisp facets so the figurine reads as carved, not smoothed
    for (const cm of node.getChildMeshes()) this.facet(cm as Mesh);
    // arcanist: bob the rune orb
    if (u.type === "arcanist" && rig.orb) {
      const bob = new Animation("orbBob", "position.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
      const y0 = rig.orb.position.y;
      bob.setKeys([{ frame: 0, value: y0 }, { frame: 45, value: y0 + 0.07 }, { frame: 90, value: y0 }]);
      rig.orb.animations = [bob];
      this.scene.beginAnimation(rig.orb, 0, 90, true);
    }
    // hero: floating molten crown + level pips above the rig's head
    if (u.type === "hero") {
      const crownY = rig.headY + 0.16;
      let hm = this.mats.get("hero-crown");
      if (!hm) {
        hm = new StandardMaterial("hero-crown", this.scene);
        (hm as StandardMaterial).emissiveColor = Color3.FromHexString("#ffca5a");
        (hm as StandardMaterial).diffuseColor = Color3.Black();
        (hm as StandardMaterial).disableLighting = true;
        this.mats.set("hero-crown", hm);
      }
      // v42: Nerivane's Nereth wears a built geometric crown (locked spec — no
      // floating torus); other tribes keep the legacy floating crown until their pass.
      if (defIndex !== 4) {
        const crown = MeshBuilder.CreateTorus("crown", { diameter: 0.2, thickness: 0.04, tessellation: 6 }, this.scene);
        crown.position.y = crownY;
        crown.material = hm;
        crown.isPickable = false;
        crown.parent = node;
        const spin = new Animation("crownSpin", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        spin.setKeys([{ frame: 0, value: 0 }, { frame: 120, value: Math.PI * 2 }]);
        crown.animations = [spin];
        this.scene.beginAnimation(crown, 0, 120, true);
      }
      const lvl = Math.min(4, u.level ?? 1);
      for (let i = 1; i < lvl; i++) {
        const pip = MeshBuilder.CreatePolyhedron("pip", { type: 1, size: 0.035 }, this.scene);
        const ang = (i / 3) * Math.PI * 2;
        pip.position = new Vector3(Math.cos(ang) * 0.14, crownY, Math.sin(ang) * 0.14);
        pip.material = hm;
        pip.isPickable = false;
        pip.parent = node;
      }
    }
    if (u.hero) node.metadata = { ...(node.metadata ?? {}), heroLevel: u.level ?? 1 };
    // veteran crest: golden rotating diamond floating above the unit
    if (u.veteran) {
      const crest = MeshBuilder.CreatePolyhedron("crest", { type: 1, size: 0.07 }, this.scene);
      crest.position.y = u.type === "catapult" ? 0.42 : 0.55;
      let cm = this.mats.get("vet-crest");
      if (!cm) {
        cm = new StandardMaterial("vet-crest", this.scene);
        (cm as StandardMaterial).emissiveColor = Color3.FromHexString("#ffcf5e");
        (cm as StandardMaterial).diffuseColor = Color3.Black();
        (cm as StandardMaterial).disableLighting = true;
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
    // after the caster pass: the ground disc stands in for a shadow, it must
    // not cast one of its own
    this.addContactShadow(node);
    node.scaling.setAll(UNIT_SCALE);
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
    // Squash & stretch: stretch tall mid-hop, squash on landing, settle back.
    // Keyed as multiples of UNIT_SCALE rather than as absolutes. These values
    // are written straight onto the node, and every unit animates at least once
    // (it is built at the origin and hops to its tile), so absolute keys
    // silently reset each figure to its unscaled size on the first frame.
    const k = (w: number, h: number) => new Vector3(UNIT_SCALE * w, UNIT_SCALE * h, UNIT_SCALE * w);
    const sq = new Animation("sq", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    sq.setKeys([
      { frame: 0, value: k(1, 1) },
      { frame: 4, value: k(0.92, 1.12) },
      { frame: 8, value: k(0.95, 1.08) },
      { frame: 16, value: k(1.1, 0.85) },
      { frame: 22, value: k(1, 1) },
    ]);
    node.animations = [anim, sq];
    this.scene.beginAnimation(node, 0, 22, false, 1, () => {
      // v33: landing dust puff — three tiny discs that expand and fade fast
      if (this.disposed) return;
      this.spawnDustPuff(target);
    });
  }

  /** v33: small dust puff at a landing position — expands + fades ~250ms */
  private spawnDustPuff(at: Vector3) {
    let m = this.mats.get("dust-puff");
    if (!m) {
      m = new StandardMaterial("dust-puff", this.scene);
      m.emissiveColor = Color3.FromHexString("#d8d2c0");
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.disableLighting = true;
      m.alpha = 0.5;
      this.mats.set("dust-puff", m);
    }
    const puffs: Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + 0.6;
      const p = MeshBuilder.CreateIcoSphere("dust", { radius: 0.05, subdivisions: 1 }, this.scene);
      p.position = new Vector3(at.x + Math.cos(ang) * 0.12, at.y + 0.04, at.z + Math.sin(ang) * 0.12);
      p.scaling.y = 0.5;
      p.material = m;
      p.isPickable = false;
      p.parent = this.root;
      puffs.push(p);
      const drift = new Animation("dustDrift", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
      drift.setKeys([
        { frame: 0, value: p.position.clone() },
        { frame: 15, value: p.position.add(new Vector3(Math.cos(ang) * 0.16, 0.05, Math.sin(ang) * 0.16)) },
      ]);
      const grow = new Animation("dustGrow", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
      grow.setKeys([
        { frame: 0, value: new Vector3(1, 0.5, 1) },
        { frame: 15, value: new Vector3(2.2, 1.1, 2.2) },
      ]);
      const fade = new Animation("dustFade", "visibility", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
      fade.setKeys([
        { frame: 0, value: 0.9 },
        { frame: 15, value: 0 },
      ]);
      p.animations = [drift, grow, fade];
      this.scene.beginAnimation(p, 0, 15, false);
    }
    setTimeout(() => puffs.forEach((p) => p.dispose()), 320);
  }

  /** v34: directional knockback nudge — the struck unit recoils away from the attacker and snaps back */
  knockback(unitId: number, fromX: number, fromY: number, toX: number, toY: number) {
    const node = this.unitMeshes.get(unitId);
    if (!node) return;
    const dirX = toX - fromX, dirZ = toY - fromY;
    const len = Math.hypot(dirX, dirZ) || 1;
    const push = 0.18;
    const base = node.position.clone();
    const shoved = base.add(new Vector3((dirX / len) * push, 0.02, (dirZ / len) * push));
    const anim = new Animation("kb", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([
      { frame: 0, value: base },
      { frame: 4, value: shoved },
      { frame: 12, value: base },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    anim.setEasingFunction(ease);
    node.animations = [anim];
    this.scene.beginAnimation(node, 0, 12, false);
  }

  /** v36 colossus knockback: hurl the surviving defender a full tile — arc slide to its new home */
  slideUnit(s: GameState, unitId: number, fromX: number, fromY: number, toX: number, toY: number) {
    const node = this.unitMeshes.get(unitId);
    if (!node) return;
    const c = this.center(s.size);
    const hFrom = TERRAIN_H[s.tiles[idx(fromX, fromY, s.size)].terrain];
    const hTo = TERRAIN_H[s.tiles[idx(toX, toY, s.size)].terrain];
    const start = new Vector3(fromX - c, node.position.y, fromY - c);
    const end = new Vector3(toX - c, node.position.y + (hTo - hFrom), toY - c);
    const mid = Vector3.Lerp(start, end, 0.5).add(new Vector3(0, 0.45, 0));
    const anim = new Animation("hurl", "position", 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
    anim.setKeys([
      { frame: 0, value: start },
      { frame: 8, value: mid },
      { frame: 16, value: end },
    ]);
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    anim.setEasingFunction(ease);
    node.animations = [anim];
    this.scene.beginAnimation(node, 0, 16, false);
  }

  /** v36 colossus wall-crush: grey masonry burst as the ramparts shatter */
  wallCrushBurst(s: GameState, x: number, y: number) {
    const c = this.center(s.size);
    const h = TERRAIN_H[s.tiles[idx(x, y, s.size)].terrain];
    const emitter = new Vector3(x - c, h - 0.4 + 0.35, y - c);
    const ps = new ParticleSystem("wallcrush", 80, this.scene);
    const size = 64;
    const dt = new DynamicTexture("rubble", { width: size, height: size }, this.scene, false);
    dt.hasAlpha = true;
    const ctx = dt.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, "rgba(235,230,220,1)");
    grad.addColorStop(0.5, "rgba(168,160,150,0.9)");
    grad.addColorStop(1, "rgba(110,104,96,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    dt.update();
    ps.particleTexture = dt as unknown as Texture;
    ps.emitter = emitter;
    ps.minEmitBox = new Vector3(-0.35, 0, -0.35);
    ps.maxEmitBox = new Vector3(0.35, 0.25, 0.35);
    ps.minSize = 0.1; ps.maxSize = 0.28;
    ps.minLifeTime = 0.4; ps.maxLifeTime = 0.85;
    ps.emitRate = 320;
    ps.direction1 = new Vector3(-1.2, 1.0, -1.2);
    ps.direction2 = new Vector3(1.2, 2.2, 1.2);
    ps.minEmitPower = 1.0; ps.maxEmitPower = 2.4;
    ps.gravity = new Vector3(0, -6, 0);
    ps.color1 = new Color4(0.85, 0.82, 0.76, 1);
    ps.color2 = new Color4(0.6, 0.57, 0.52, 1);
    ps.colorDead = new Color4(0.45, 0.42, 0.38, 0);
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ps.targetStopDuration = 0.3;
    ps.disposeOnStop = true;
    ps.start();
  }

  /** v37 Colossus Quake: camera shake + expanding shockwave ring at the epicenter */
  quakeFx(s: GameState, x: number, y: number) {
    if (this.disposed) return;
    const c = this.center(s.size);
    const h = TERRAIN_H[s.tiles[idx(x, y, s.size)].terrain];
    // shockwave ring — a flat torus scaling outward while fading
    const ring = MeshBuilder.CreateTorus("quakering", { diameter: 0.6, thickness: 0.09, tessellation: 48 }, this.scene);
    ring.position = new Vector3(x - c, h - 0.4 + 0.06, y - c);
    const rm = new StandardMaterial("quakeringmat", this.scene);
    rm.emissiveColor = new Color3(1.0, 0.62, 0.25);
    rm.disableLighting = true;
    rm.alpha = 0.95;
    ring.material = rm;
    ring.isPickable = false;
    const start = performance.now();
    const dur = 620;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      const sc = 1 + e * 5.5;
      ring.scaling.set(sc, 1, sc);
      rm.alpha = 0.95 * (1 - e);
      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(obs);
        rm.dispose();
        ring.dispose();
      }
    });
    // camera shake — quick decaying jitter on the camera target
    const cam = this.camera;
    const baseTarget = cam.target.clone();
    const shakeStart = performance.now();
    const shakeDur = 480;
    const shakeObs = this.scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - shakeStart) / shakeDur);
      const amp = 0.14 * (1 - t);
      cam.target = baseTarget.add(new Vector3((Math.random() - 0.5) * amp, 0, (Math.random() - 0.5) * amp));
      if (t >= 1) {
        this.scene.onBeforeRenderObservable.remove(shakeObs);
        cam.target = baseTarget;
      }
    });
  }

  /** v34: shatter death — clone the unit's pieces, burst them with impulse + spin + gravity + fade */
  shatterUnit(unitId: number, fromX?: number, fromY?: number, toX?: number, toY?: number) {
    const node = this.unitMeshes.get(unitId);
    if (!node || this.disposed) return;
    // push direction: away from the attacker when known, else pure radial burst
    let pushX = 0, pushZ = 0;
    if (fromX !== undefined && fromY !== undefined && toX !== undefined && toY !== undefined) {
      const dx = toX - fromX, dz = toY - fromY;
      const l = Math.hypot(dx, dz) || 1;
      pushX = dx / l; pushZ = dz / l;
    }
    const pieces: { m: Mesh; vel: Vector3; spin: Vector3 }[] = [];
    for (const child of node.getChildMeshes()) {
      const src = child as Mesh;
      if (!src.geometry) continue;
      const shard = src.clone(src.name + "-shard", null);
      if (!shard) continue;
      shard.setParent(null);
      shard.position = src.getAbsolutePosition().clone();
      shard.rotationQuaternion = null;
      shard.isPickable = false;
      // clone the material so fading never leaks into the shared cache
      const srcMat = src.material as StandardMaterial | null;
      if (srcMat) {
        const pm = srcMat.clone(srcMat.name + "-shardmat");
        pm.alpha = 1;
        shard.material = pm;
      }
      const ang = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 0.8;
      pieces.push({
        m: shard,
        vel: new Vector3(
          Math.cos(ang) * speed * 0.6 + pushX * 1.0,
          1.5 + Math.random() * 1.1,
          Math.sin(ang) * speed * 0.6 + pushZ * 1.0,
        ),
        spin: new Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
      });
    }
    if (pieces.length === 0) return;
    // hide the source immediately; the next engine sync disposes it for real
    node.setEnabled(false);
    const groundY = node.position.y;
    const start = performance.now();
    const DURATION = 700;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, this.scene.getEngine().getDeltaTime() / 1000);
      const t = (performance.now() - start) / DURATION;
      for (const p of pieces) {
        p.vel.y -= 6.5 * dt; // gravity
        p.m.position.addInPlace(p.vel.scale(dt));
        if (p.m.position.y < groundY && p.vel.y < 0) {
          p.m.position.y = groundY;
          p.vel.y *= -0.35; // small bounce, heavy damping
          p.vel.x *= 0.6; p.vel.z *= 0.6;
        }
        p.m.rotation.addInPlace(p.spin.scale(dt));
        const pm = p.m.material as StandardMaterial | null;
        if (pm && t > 0.5) pm.alpha = Math.max(0, 1 - (t - 0.5) * 2);
      }
      if (t >= 1 || this.disposed) {
        this.scene.onBeforeRenderObservable.remove(obs);
        for (const p of pieces) {
          p.m.material?.dispose();
          p.m.dispose();
        }
      }
    });
  }

  /** highlight reachable tiles / attackable enemies for the selected unit */
  showHighlights(s: GameState) {
    this.highlightMeshes.forEach((m) => m.dispose());
    this.highlightMeshes = [];
    // v37/v38 city planner: a live planning mode — the overlay persists while a
    // city panel is open (chips re-render after every build via the store's
    // "changed" event), but defers to movement rings when a unit is selected
    if (s.plannerOpen && s.selectedUnitId === null && s.currentTribe === s.humanTribe && !s.aiThinking) {
      this.showPlanner(s);
      return;
    }
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
    // v42 designer spec: the glowing fissure is a TILE-LEVEL overlay (selection /
    // active-unit state), not part of any unit. Jagged crack segments in the
    // acting tribe's accent color radiate across the selected tile.
    const accent = u.tribe >= 0 ? "#9ffaef" : "#ffd76a";
    const sm = new StandardMaterial("selm", this.scene);
    sm.emissiveColor = Color3.FromHexString(accent);
    sm.diffuseColor = Color3.Black();
    sm.disableLighting = true;
    // deterministic per-tile crack layout so the fissure doesn't jitter between frames
    let rnd = (u.x * 73 + u.y * 151) % 97;
    const rand = () => ((rnd = (rnd * 61 + 17) % 97) / 97);
    const segs = 5;
    let px = -0.32, pz = (rand() - 0.5) * 0.3;
    for (let i = 0; i < segs; i++) {
      const nx = px + 0.64 / segs;
      const nz = Math.max(-0.34, Math.min(0.34, pz + (rand() - 0.5) * 0.3));
      const len = Math.hypot(nx - px, nz - pz);
      const seg = MeshBuilder.CreateBox("sel", { width: len * 1.1, height: 0.015, depth: 0.045 - i * 0.004 }, this.scene);
      seg.position = new Vector3(u.x - c + (px + nx) / 2, h - 0.4 + 0.085, u.y - c + (pz + nz) / 2);
      seg.rotation.y = -Math.atan2(nz - pz, nx - px);
      seg.material = sm;
      seg.isPickable = false;
      seg.parent = this.root;
      this.highlightMeshes.push(seg);
      // small branch crack every other segment
      if (i % 2 === 1) {
        const b = MeshBuilder.CreateBox("sel", { width: 0.16, height: 0.014, depth: 0.03 }, this.scene);
        b.position = new Vector3(u.x - c + nx, h - 0.4 + 0.083, u.y - c + nz);
        b.rotation.y = -Math.atan2(nz - pz, nx - px) + (rand() > 0.5 ? 0.9 : -0.9);
        b.material = sm;
        b.isPickable = false;
        b.parent = this.root;
        this.highlightMeshes.push(b);
      }
      px = nx; pz = nz;
    }
    // faint tile edge glow keeps the "which tile" read unambiguous at any zoom
    const rim = MeshBuilder.CreateBox("sel", { width: TILE * 0.92, depth: TILE * 0.92, height: 0.012 }, this.scene);
    rim.position = new Vector3(u.x - c, h - 0.4 + 0.078, u.y - c);
    const rimM = new StandardMaterial("selrim", this.scene);
    rimM.emissiveColor = Color3.FromHexString(accent);
    rimM.diffuseColor = Color3.Black();
    rimM.disableLighting = true;
    rimM.alpha = 0.18;
    rimM.disableDepthWrite = true;
    rim.material = rimM;
    rim.isPickable = false;
    rim.parent = this.root;
    this.highlightMeshes.push(rim);
  }

  /**
   * v37 city planner overlay: dims every tile and floats projected adjacency
   * values over buildable sites — emerald "+N" for population (mills/farms),
   * amber "+N★" for market income — so placement reads at a glance.
   */
  private showPlanner(s: GameState) {
    const c = this.center(s.size);
    // dim pane: one big translucent quad above the board
    const dim = MeshBuilder.CreateGround("plannerdim", { width: s.size + 2, height: s.size + 2 }, this.scene);
    dim.position = new Vector3(0, 1.35, 0);
    const dm = new StandardMaterial("plannerdimm", this.scene);
    dm.diffuseColor = Color3.FromHexString("#0a0a20");
    dm.emissiveColor = Color3.FromHexString("#0a0a20");
    dm.alpha = 0.38;
    dm.disableDepthWrite = true;
    dim.material = dm;
    dim.isPickable = false;
    dim.parent = this.root;
    this.highlightMeshes.push(dim as unknown as Mesh);
    for (const site of plannerSites(s, s.humanTribe)) {
      const h = TERRAIN_H[s.tiles[idx(site.x, site.y, s.size)].terrain];
      // glow pad marking the buildable tile
      const pad = MeshBuilder.CreateBox("plannerpad", { width: TILE * 0.86, depth: TILE * 0.86, height: 0.02 }, this.scene);
      pad.position = new Vector3(site.x - c, h - 0.4 + 0.09, site.y - c);
      const pm = new StandardMaterial("plannerpadm", this.scene);
      const hex = site.kind === "stars" ? "#ffd76a" : "#5ee0a0";
      pm.diffuseColor = Color3.FromHexString(hex);
      pm.emissiveColor = Color3.FromHexString(hex);
      pm.alpha = site.value > 0 ? 0.4 : 0.15;
      pm.disableDepthWrite = true;
      pm.zOffset = -2;
      pad.material = pm;
      // v38 live planner: pads keep tile metadata so clicking one selects the
      // owning city (opening its build panel) without leaving planner mode
      pad.metadata = { tile: true, x: site.x, y: site.y };
      pad.parent = this.root;
      this.highlightMeshes.push(pad);
      // floating value label
      const size = 256;
      const dt = new DynamicTexture("plannerlbl", { width: size, height: size }, this.scene, false);
      dt.hasAlpha = true;
      const text = site.kind === "stars" ? `+${site.value}\u2605` : `+${site.value}`;
      dt.drawText(text, null, 150, "bold 96px Fredoka, sans-serif", hex, "transparent", true);
      const plane = MeshBuilder.CreatePlane("plannerlblp", { size: 0.8 }, this.scene);
      const lm = new StandardMaterial("plannerlblm", this.scene);
      lm.diffuseTexture = dt;
      lm.emissiveColor = Color3.White();
      lm.useAlphaFromDiffuseTexture = true;
      lm.disableDepthWrite = true;
      lm.backFaceCulling = false;
      plane.material = lm;
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      plane.position = new Vector3(site.x - c, h - 0.4 + 0.75, site.y - c);
      plane.isPickable = false;
      plane.parent = this.root;
      this.highlightMeshes.push(plane);
    }
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
