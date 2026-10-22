import { AssetContainer } from "@babylonjs/core/assetContainer";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { Material } from "@babylonjs/core/Materials/material";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Observer } from "@babylonjs/core/Misc/observable";
import { Scene } from "@babylonjs/core/scene";
import type { ImportedModelCandidate } from "./importedModelRegistry";

/** A loader seam for headless tests; normal renderers use SceneLoader below. */
export type ModelContainerLoader = (
  modelUrl: string,
  scene: Scene,
) => Promise<AssetContainer>;

/**
 * Optional safeguards for the opt-in imported-model path. Defaults deliberately
 * remain unbounded/no-timeout so the existing development review behavior is
 * unchanged until a caller explicitly enables the beta safeguards.
 */
export interface BoardModelCacheOptions {
  /** Converts a canonical storage path to a load URL (for example, native public proxy URL). */
  resolveUrl?: (path: string) => string;
  /** Maximum decoded texture bytes shared by cached templates plus load reservations. */
  maxTextureBytes?: number;
  /** Returns an inclusive-mipmap texture estimate for a resolved model URL. */
  textureBytesForUrl?: (url: string) => number;
  /** Maximum simultaneously admitted model templates (queued, decoding, or cached). */
  maxModels?: number;
  /** Per-underlying-load deadline. A timeout fail-closes this cache instance. */
  loadTimeoutMs?: number;
}

/** Immutable diagnostic snapshot for renderer tests and beta telemetry. */
export interface BoardModelCacheStats {
  readonly activeLoads: number;
  readonly queuedLoads: number;
  readonly loadedModels: number;
  readonly failedModels: number;
  readonly cloneCount: number;
  readonly reservedTextureBytes: number;
  readonly decodedTextureBytes: number;
  readonly totalTextureBytes: number;
  readonly maxTextureBytes: number;
  readonly maxModels: number;
  readonly timedOut: boolean;
  readonly disposed: boolean;
}

export interface InstantiatedBoardModel {
  root: TransformNode;
  meshes: AbstractMesh[];
}

type QueuedLoad = {
  modelPath: string;
  loadUrl: string;
  resolve: (container: AssetContainer) => void;
  reject: (error: unknown) => void;
  settled: boolean;
  reservationHeldForLateDecode: boolean;
  timeout: ReturnType<typeof setTimeout> | undefined;
};

type TextureProbe = {
  getInternalTexture?: () => unknown;
  getSize?: () => { width: number; height: number };
  noMipmap?: boolean;
};

type InternalTextureProbe = {
  width?: number;
  height?: number;
  depth?: number;
  isCube?: boolean;
  generateMipMaps?: boolean;
};

class CacheDisposedError extends Error {
  constructor() {
    super("Board model cache was disposed before the model could be attached.");
    this.name = "CacheDisposedError";
  }
}

class ModelLoadTimeoutError extends Error {
  constructor(modelUrl: string, timeoutMs: number) {
    super(`Imported model load timed out after ${timeoutMs}ms: ${modelUrl}`);
    this.name = "ModelLoadTimeoutError";
  }
}

class CacheFailClosedError extends Error {
  constructor() {
    super("Imported model cache is fail-closed after a load timeout.");
    this.name = "CacheFailClosedError";
  }
}

const MAX_CONCURRENT_LOADS = 2;
const CANONICAL_MODEL_PATH = /^\/manus-storage\/[A-Za-z0-9][A-Za-z0-9._-]*\.glb$/;

const defaultLoader: ModelContainerLoader = (modelUrl, scene) =>
  SceneLoader.LoadAssetContainerAsync(modelUrl, "", scene);

function disposeQuietly(value: { dispose(): void } | null | undefined) {
  try {
    value?.dispose();
  } catch {
    // A scene may have already released this resource during its own disposal.
  }
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a finite, non-negative safe integer.`);
  }
  return value;
}

function limit(value: number | undefined, name: string, integer = false): number {
  if (value === undefined) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) {
    throw new RangeError(`${name} must be a finite, non-negative${integer ? " integer" : ""}.`);
  }
  return value;
}

/** Returns conservative RGBA8 bytes including every mip level through 1×1. */
export function inclusiveMipmapRgbaBytes(width: number, height = width, depth = 1): number {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    !Number.isSafeInteger(depth) ||
    width <= 0 ||
    height <= 0 ||
    depth <= 0
  ) {
    throw new RangeError("Texture dimensions must be positive safe integers.");
  }

  let total = 0;
  let mipWidth = width;
  let mipHeight = height;
  let mipDepth = depth;
  while (true) {
    total += mipWidth * mipHeight * mipDepth * 4;
    if (!Number.isSafeInteger(total)) {
      throw new RangeError("Texture footprint exceeds the safe integer range.");
    }
    if (mipWidth === 1 && mipHeight === 1 && mipDepth === 1) return total;
    mipWidth = Math.max(1, Math.floor(mipWidth / 2));
    mipHeight = Math.max(1, Math.floor(mipHeight / 2));
    mipDepth = Math.max(1, Math.floor(mipDepth / 2));
  }
}

/**
 * Per-renderer cache for review-only imported unit GLBs.
 *
 * Containers deliberately remain off-scene. Each call clones the container with
 * independent mesh transforms and materials. Babylon material clones retain the
 * template texture references, so geometry/decoded texture resources stay
 * shared while caller effects such as hit flashes cannot leak across units.
 *
 * The bounded beta mode uses a conservative ceiling rather than eviction: a
 * template stays alive until this cache is disposed. This intentionally avoids
 * disposing a template texture that clone materials still reference; when a
 * ceiling is reached callers reject and retain their procedural unit fallback.
 */
export class BoardModelCache {
  private readonly loadPromises = new Map<string, Promise<AssetContainer>>();
  private readonly containers = new Map<string, AssetContainer>();
  private readonly failures = new Map<string, unknown>();
  private readonly queuedLoads: QueuedLoad[] = [];
  private readonly activeRequests = new Set<QueuedLoad>();
  private readonly reservedTextureBytesByPath = new Map<string, number>();
  private readonly cloneRoots = new Set<TransformNode>();
  private readonly sceneDisposeObserver: Observer<Scene>;
  private readonly resolveUrl: (path: string) => string;
  private readonly textureBytesForUrl: ((url: string) => number) | undefined;
  private readonly maxTextureBytes: number;
  private readonly maxModels: number;
  private readonly loadTimeoutMs: number;
  private activeLoads = 0;
  private timedOut = false;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly loader: ModelContainerLoader = defaultLoader,
    options: BoardModelCacheOptions = {},
  ) {
    this.resolveUrl = options.resolveUrl ?? ((path) => path);
    this.textureBytesForUrl = options.textureBytesForUrl;
    this.maxTextureBytes = limit(options.maxTextureBytes, "maxTextureBytes");
    this.maxModels = limit(options.maxModels, "maxModels", true);
    this.loadTimeoutMs = limit(options.loadTimeoutMs, "loadTimeoutMs");
    this.sceneDisposeObserver = scene.onDisposeObservable.add(() => this.dispose());
  }

  /** A frozen read-only snapshot; it does not expose mutable cache internals. */
  get stats(): Readonly<BoardModelCacheStats> {
    const decodedTextureBytes = this.decodedTextureBytes();
    const reservedTextureBytes = this.reservedTextureBytes();
    return Object.freeze({
      activeLoads: this.activeLoads,
      queuedLoads: this.queuedLoads.length,
      loadedModels: this.containers.size,
      failedModels: this.failures.size,
      cloneCount: this.cloneRoots.size,
      reservedTextureBytes,
      decodedTextureBytes,
      totalTextureBytes: decodedTextureBytes + reservedTextureBytes,
      maxTextureBytes: this.maxTextureBytes,
      maxModels: this.maxModels,
      timedOut: this.timedOut,
      disposed: this.disposed,
    });
  }

  /** Alias for test harnesses that prefer a method over a JavaScript accessor. */
  getStats(): Readonly<BoardModelCacheStats> {
    return this.stats;
  }

  /**
   * Clones a reviewed model under a stable procedural-unit parent.
   *
   * `null` is a cancellation result: the cache/scene or the destination parent
   * was disposed while the model was waiting to load. Decode/load/model errors
   * are intentionally rejected so the renderer can retain procedural children.
   */
  instantiate(
    candidate: ImportedModelCandidate,
    parent: TransformNode,
    height = 0.62,
  ): Promise<InstantiatedBoardModel | null> {
    const operation = this.instantiateInternal(candidate, parent, height);
    // Timeouts may occur before an application attaches its renderer fallback
    // handler. Observe the public promise here while preserving its rejection
    // for the caller, avoiding browser/node unhandled-rejection noise.
    void operation.catch(() => undefined);
    return operation;
  }

  private async instantiateInternal(
    candidate: ImportedModelCandidate,
    parent: TransformNode,
    height = 0.62,
  ): Promise<InstantiatedBoardModel | null> {
    if (this.disposed || parent.isDisposed()) return null;

    let parentDisposed = false;
    const parentDisposeObserver = parent.onDisposeObservable.add(() => {
      parentDisposed = true;
    });

    try {
      const knownFailure = this.failures.get(candidate.modelUrl);
      if (knownFailure) throw knownFailure;

      const container = await this.getContainer(candidate.modelUrl);
      if (this.disposed || parentDisposed || parent.isDisposed()) return null;

      // A simultaneous caller can discover malformed content first. Do not
      // instantiate its already-known bad container again.
      const failureAfterLoad = this.failures.get(candidate.modelUrl);
      if (failureAfterLoad) throw failureAfterLoad;

      return this.instantiateContainer(candidate, container, parent, height);
    } catch (error) {
      if (
        error instanceof CacheDisposedError ||
        this.disposed ||
        parentDisposed ||
        parent.isDisposed()
      ) {
        return null;
      }
      throw error;
    } finally {
      parent.onDisposeObservable.remove(parentDisposeObserver);
    }
  }

  /** Releases every active clone and every off-scene GLB template. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.onDisposeObservable.remove(this.sceneDisposeObserver);

    const cancellation = new CacheDisposedError();
    for (const queued of this.queuedLoads.splice(0)) this.settleFailure(queued, cancellation, false);
    for (const active of Array.from(this.activeRequests)) {
      // An in-flight Babylon decode cannot be cancelled. Keep its reservation
      // and activeLoads count until the loader actually settles so a renderer
      // that retires this cache before creating its successor cannot accidentally
      // exceed the physical two-decode cap or its texture budget.
      this.settleFailure(active, cancellation, false, true);
    }

    for (const root of Array.from(this.cloneRoots)) disposeQuietly(root);
    this.cloneRoots.clear();

    for (const container of Array.from(new Set(this.containers.values()))) {
      disposeQuietly(container);
    }
    this.containers.clear();
    this.loadPromises.clear();
    this.failures.clear();
    // Active loads retain their reservations until runLoad's finally block.
    // Queued loads were released above; do not clear the active entries here.
  }

  private getContainer(modelPath: string): Promise<AssetContainer> {
    if (this.disposed) return this.rejected(new CacheDisposedError());

    const knownFailure = this.failures.get(modelPath);
    if (knownFailure) return this.rejected(knownFailure);
    if (this.timedOut) return this.rejected(new CacheFailClosedError());

    const existing = this.loadPromises.get(modelPath);
    if (existing) return existing;

    if (!CANONICAL_MODEL_PATH.test(modelPath)) {
      const error = new Error(`Imported model URL must be a canonical /manus-storage/*.glb path: ${modelPath}`);
      this.failures.set(modelPath, error);
      return this.rejected(error);
    }

    let loadUrl: string;
    try {
      loadUrl = this.resolveUrl(modelPath);
      if (typeof loadUrl !== "string" || loadUrl.length === 0) {
        throw new Error("resolveUrl must return a non-empty URL string.");
      }
    } catch (error) {
      this.failures.set(modelPath, error);
      return this.rejected(error);
    }

    try {
      this.reserveAdmission(modelPath, loadUrl);
    } catch (error) {
      this.failures.set(modelPath, error);
      return this.rejected(error);
    }

    let resolveLoad!: (container: AssetContainer) => void;
    let rejectLoad!: (error: unknown) => void;
    const promise = new Promise<AssetContainer>((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
    });

    // This marks an otherwise-unobserved queued/rejected promise handled while
    // preserving rejection for the instantiate caller that awaits this promise.
    void promise.catch(() => undefined);
    this.loadPromises.set(modelPath, promise);
    this.queuedLoads.push({
      modelPath,
      loadUrl,
      resolve: resolveLoad,
      reject: rejectLoad,
      settled: false,
      reservationHeldForLateDecode: false,
      timeout: undefined,
    });
    this.drainLoadQueue();
    return promise;
  }

  private reserveAdmission(modelPath: string, loadUrl: string) {
    if (this.admittedModelCount() >= this.maxModels) {
      throw new Error(`Imported model template limit reached (${this.maxModels}).`);
    }

    let estimatedBytes = 0;
    if (this.textureBytesForUrl) {
      estimatedBytes = finiteNonNegative(this.textureBytesForUrl(loadUrl), "textureBytesForUrl result");
    } else if (Number.isFinite(this.maxTextureBytes)) {
      // A finite budget without an estimate would permit an unbounded decode
      // before it could be checked. Fail closed rather than guessing low.
      throw new Error("maxTextureBytes requires textureBytesForUrl for pre-decode reservation.");
    }

    if (this.reservedTextureBytes() + this.decodedTextureBytes() + estimatedBytes > this.maxTextureBytes) {
      throw new Error(`Imported model texture reservation exceeds cache budget (${this.maxTextureBytes} bytes).`);
    }
    this.reservedTextureBytesByPath.set(modelPath, estimatedBytes);
  }

  private drainLoadQueue() {
    while (
      !this.disposed &&
      !this.timedOut &&
      this.activeLoads < MAX_CONCURRENT_LOADS &&
      this.queuedLoads.length > 0
    ) {
      const queued = this.queuedLoads.shift();
      if (!queued) return;
      this.activeLoads += 1;
      this.activeRequests.add(queued);
      if (Number.isFinite(this.loadTimeoutMs) && this.loadTimeoutMs > 0) {
        queued.timeout = setTimeout(() => this.timeoutLoad(queued), this.loadTimeoutMs);
      }
      void this.runLoad(queued);
    }
  }

  private async runLoad(queued: QueuedLoad) {
    let container: AssetContainer | undefined;
    try {
      // Do not race this against the deadline. The underlying Babylon decode is
      // not abortable, and treating timeout as a freed slot would permit more
      // than two physical decodes. timeoutLoad rejects callers but retains this
      // active slot until the loader settles; it also rejects the queue so no
      // caller remains offline indefinitely.
      container = await this.loader(queued.loadUrl, this.scene);
      if (this.disposed || this.timedOut || queued.settled) {
        disposeQuietly(container);
        return;
      }

      // LoadAssetContainerAsync normally already does this. Calling it here is
      // intentional defensive ownership: a cached template must never render.
      container.removeAllFromScene();
      const admissionError = this.acceptDecodedContainer(queued.modelPath, container);
      if (admissionError) {
        disposeQuietly(container);
        this.settleFailure(queued, admissionError);
        return;
      }

      queued.settled = true;
      this.clearTimeout(queued);
      queued.resolve(container);
    } catch (error) {
      if (container) disposeQuietly(container);
      if (!queued.settled) this.settleFailure(queued, error);
    } finally {
      this.clearTimeout(queued);
      if (queued.reservationHeldForLateDecode) {
        this.reservedTextureBytesByPath.delete(queued.modelPath);
      }
      this.activeRequests.delete(queued);
      this.activeLoads -= 1;
      this.drainLoadQueue();
    }
  }

  private timeoutLoad(queued: QueuedLoad) {
    if (queued.settled || this.disposed || this.timedOut) return;
    const error = new ModelLoadTimeoutError(queued.loadUrl, this.loadTimeoutMs);
    this.timedOut = true;
    this.settleFailure(queued, error, true, true);

    // Underlying decode promises cannot be cancelled safely. Reject every
    // waiting caller now and fail closed; late containers are disposed by
    // runLoad, while activeLoads remains truthful until each decode settles.
    const failClosed = new CacheFailClosedError();
    for (const waiting of this.queuedLoads.splice(0)) this.settleFailure(waiting, failClosed);
    for (const active of Array.from(this.activeRequests)) {
      if (active !== queued) this.settleFailure(active, failClosed, true, true);
    }
  }

  private acceptDecodedContainer(modelPath: string, container: AssetContainer): Error | null {
    const reservation = this.reservedTextureBytesByPath.get(modelPath) ?? 0;
    const decodedTextureBytes = this.decodedTextureBytes([container]);
    const otherReservations = this.reservedTextureBytes() - reservation;
    if (decodedTextureBytes + otherReservations > this.maxTextureBytes) {
      this.reservedTextureBytesByPath.delete(modelPath);
      return new Error(`Imported model decoded texture footprint exceeds cache budget (${this.maxTextureBytes} bytes).`);
    }

    this.reservedTextureBytesByPath.delete(modelPath);
    this.containers.set(modelPath, container);
    return null;
  }

  private settleFailure(
    queued: QueuedLoad,
    error: unknown,
    remember = true,
    retainReservationUntilDecodeSettles = false,
  ) {
    if (queued.settled) return;
    queued.settled = true;
    this.clearTimeout(queued);
    queued.reservationHeldForLateDecode = retainReservationUntilDecodeSettles;
    if (!retainReservationUntilDecodeSettles) {
      this.reservedTextureBytesByPath.delete(queued.modelPath);
    }
    this.loadPromises.delete(queued.modelPath);
    if (remember && !this.disposed) this.failures.set(queued.modelPath, error);
    queued.reject(error);
  }

  private clearTimeout(queued: QueuedLoad) {
    if (queued.timeout !== undefined) {
      clearTimeout(queued.timeout);
      queued.timeout = undefined;
    }
  }

  private admittedModelCount() {
    return this.containers.size + this.reservedTextureBytesByPath.size;
  }

  private reservedTextureBytes() {
    let total = 0;
    for (const bytes of Array.from(this.reservedTextureBytesByPath.values())) total += bytes;
    return total;
  }

  /**
   * Calculates a conservative RGBA8 footprint across unique *physical* active
   * texture objects. Material wrappers and container texture lists can refer to
   * the same InternalTexture, so object identity is deduplicated globally.
   */
  private decodedTextureBytes(extraContainers: AssetContainer[] = []) {
    const seen = new Set<unknown>();
    let total = 0;
    for (const container of [...Array.from(this.containers.values()), ...extraContainers]) {
      for (const texture of this.activeTextures(container)) {
        const probe = texture as TextureProbe;
        const internal = probe.getInternalTexture?.();
        const identity = internal ?? texture;
        if (seen.has(identity)) continue;
        seen.add(identity);
        total += this.textureFootprintBytes(probe, internal as InternalTextureProbe | null | undefined);
        if (!Number.isSafeInteger(total)) {
          throw new Error("Imported model decoded texture footprint exceeds safe integer range.");
        }
      }
    }
    return total;
  }

  private activeTextures(container: AssetContainer): unknown[] {
    const textures = new Set<unknown>(container.textures);
    const addMaterialTextures = (material: unknown) => {
      const probe = material as { getActiveTextures?: () => unknown[] } | null;
      for (const texture of probe?.getActiveTextures?.() ?? []) textures.add(texture);
    };
    for (const material of container.materials) addMaterialTextures(material);
    for (const mesh of container.meshes) addMaterialTextures(mesh.material);
    return Array.from(textures);
  }

  private textureFootprintBytes(texture: TextureProbe, internal: InternalTextureProbe | null | undefined) {
    const size = texture.getSize?.();
    const width = internal?.width ?? size?.width;
    const height = internal?.height ?? size?.height;
    // Babylon uses depth === 0 as its 2D InternalTexture sentinel (including
    // RawTexture under NullEngine), so treat only absent/zero depth as one
    // slice. Negative and non-finite values remain malformed and are rejected.
    const rawDepth = internal?.depth;
    const depth = rawDepth === undefined || rawDepth === 0 ? 1 : rawDepth;
    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      typeof depth !== "number" ||
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      !Number.isSafeInteger(depth) ||
      width <= 0 ||
      height <= 0 ||
      depth <= 0
    ) {
      throw new Error("Imported model contains a texture with a malformed decoded footprint.");
    }

    const faces = internal?.isCube ? 6 : 1;
    const baseBytes = width * height * depth * faces * 4;
    if (!Number.isSafeInteger(baseBytes)) {
      throw new Error("Imported model texture footprint exceeds safe integer range.");
    }
    if (texture.noMipmap || internal?.generateMipMaps === false) return baseBytes;
    return inclusiveMipmapRgbaBytes(width, height, depth) * faces;
  }

  private instantiateContainer(
    candidate: ImportedModelCandidate,
    container: AssetContainer,
    parent: TransformNode,
    height: number,
  ): InstantiatedBoardModel | null {
    if (!Number.isFinite(height) || height <= 0) {
      const error = new Error(`Imported model target height must be positive and finite: ${height}`);
      this.rememberFailure(candidate.modelUrl, error);
      throw error;
    }

    const root = new TransformNode(this.rootName(candidate), this.scene);
    const cloneMaterials = new Set<Material>();
    root.onDisposeObservable.add(() => {
      this.cloneRoots.delete(root);
      // The clone owns these material objects, but cloned materials retain the
      // template's texture references. Never force texture disposal.
      for (const material of Array.from(cloneMaterials)) {
        try {
          material.dispose(false, false, true);
        } catch {
          // Scene disposal may have released it already.
        }
      }
    });
    try {
      // `doNotInstantiate` gives every unit its own mesh transform. Keep the
      // container instantiation free of Babylon material cloning: it otherwise
      // decodes duplicate texture objects. Materials are made shallowly below.
      const entries = container.instantiateModelsToScene(
        undefined,
        false,
        { doNotInstantiate: true },
      );
      for (const node of entries.rootNodes) node.parent = root;

      const meshes = root
        .getChildMeshes()
        .filter((mesh) => !mesh.isDisposed() && mesh.getTotalVertices() > 0);
      if (meshes.length === 0) {
        throw new Error(`${candidate.name} GLB contained no renderable meshes.`);
      }

      const materialClones = new Map<Material, Material>();
      for (const mesh of meshes) {
        const templateMaterial = mesh.material;
        if (!templateMaterial) continue;
        let cloneMaterial = materialClones.get(templateMaterial);
        if (!cloneMaterial) {
          cloneMaterial = this.cloneMaterialWithSharedTextures(templateMaterial);
          materialClones.set(templateMaterial, cloneMaterial);
          cloneMaterials.add(cloneMaterial);
        }
        mesh.material = cloneMaterial;
      }

      const minimum = new Vector3(
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      );
      const maximum = new Vector3(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      );
      for (const mesh of meshes) {
        mesh.computeWorldMatrix(true);
        const bounds = mesh.getBoundingInfo().boundingBox;
        minimum.minimizeInPlace(bounds.minimumWorld);
        maximum.maximizeInPlace(bounds.maximumWorld);
      }

      const sourceHeight = maximum.y - minimum.y;
      if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) {
        throw new Error(`${candidate.name} GLB had invalid bounds.`);
      }

      // Match scene.ts's former direct-import behavior: center x/z and put the
      // lowest source point at the stable unit parent's local base.
      const scale = height / sourceHeight;
      root.scaling.setAll(scale);
      root.position.set(
        -((minimum.x + maximum.x) / 2) * scale,
        -minimum.y * scale,
        -((minimum.z + maximum.z) / 2) * scale,
      );

      if (this.disposed || parent.isDisposed()) {
        disposeQuietly(root);
        return null;
      }

      root.parent = parent;
      this.cloneRoots.add(root);
      root.onDisposeObservable.add(() => {
        for (const skeleton of entries.skeletons) disposeQuietly(skeleton);
        for (const animationGroup of entries.animationGroups) disposeQuietly(animationGroup);
      });

      // Parent disposal recursively disposes root. This final check closes the
      // tiny synchronous ownership window for callers that dispose in callbacks.
      if (this.disposed || parent.isDisposed() || root.isDisposed()) {
        disposeQuietly(root);
        return null;
      }
      return { root, meshes };
    } catch (error) {
      disposeQuietly(root);
      this.rememberFailure(candidate.modelUrl, error);
      throw error;
    }
  }

  private rememberFailure(modelUrl: string, error: unknown) {
    if (this.failures.has(modelUrl)) return;
    this.failures.set(modelUrl, error);

    // Deliberately do not evict/dispose a decoded template here. Clone materials
    // may still share its texture objects. The conservative ceiling retains it
    // through cache disposal rather than risking a texture disposal race.
  }

  /**
   * Babylon's general-purpose Material.clone() also clones textures. The unit
   * needs an isolated material for hit/selection effects, not duplicate image
   * data, so restore every active template texture onto the clone and release
   * the transient texture clones immediately.
   */
  private cloneMaterialWithSharedTextures(template: Material): Material {
    const clone = template.clone(`Clone of ${template.name}`);
    if (!clone) {
      throw new Error(`Could not clone imported model material: ${template.name}`);
    }
    const templateTextures = new Set(template.getActiveTextures());
    const transientTextures = clone
      .getActiveTextures()
      .filter((texture) => !templateTextures.has(texture));

    this.copyTextureProperties(template, clone, templateTextures);
    for (const texture of transientTextures) disposeQuietly(texture);
    return clone;
  }

  private copyTextureProperties(
    template: Material,
    clone: Material,
    templateTextures: Set<unknown>,
  ) {
    const source = template as unknown as Record<string, unknown>;
    const target = clone as unknown as Record<string, unknown>;
    for (const key of Object.keys(source)) {
      if (templateTextures.has(source[key])) target[key] = source[key];
    }
  }

  private rejected<T>(error: unknown): Promise<T> {
    const promise = Promise.reject<T>(error);
    void promise.catch(() => undefined);
    return promise;
  }

  private rootName(candidate: ImportedModelCandidate) {
    const normalized = candidate.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `${normalized || "imported-model"}-clone`;
  }
}
