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

export interface InstantiatedBoardModel {
  root: TransformNode;
  meshes: AbstractMesh[];
}

type QueuedLoad = {
  modelUrl: string;
  resolve: (container: AssetContainer) => void;
  reject: (error: unknown) => void;
};

class CacheDisposedError extends Error {
  constructor() {
    super("Board model cache was disposed before the model could be attached.");
    this.name = "CacheDisposedError";
  }
}

const MAX_CONCURRENT_LOADS = 2;

const defaultLoader: ModelContainerLoader = (modelUrl, scene) =>
  SceneLoader.LoadAssetContainerAsync(modelUrl, "", scene);

function disposeQuietly(value: { dispose(): void } | null | undefined) {
  try {
    value?.dispose();
  } catch {
    // A scene may have already released this resource during its own disposal.
  }
}

/**
 * Per-renderer cache for review-only imported unit GLBs.
 *
 * Containers deliberately remain off-scene. Each call clones the container with
 * independent mesh transforms and materials. Babylon material clones retain the
 * template texture references, so geometry/decoded texture resources stay
 * shared while caller effects such as hit flashes cannot leak across units.
 */
export class BoardModelCache {
  private readonly loadPromises = new Map<string, Promise<AssetContainer>>();
  private readonly containers = new Map<string, AssetContainer>();
  private readonly failures = new Map<string, unknown>();
  private readonly queuedLoads: QueuedLoad[] = [];
  private readonly cloneRoots = new Set<TransformNode>();
  private readonly sceneDisposeObserver: Observer<Scene>;
  private activeLoads = 0;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    private readonly loader: ModelContainerLoader = defaultLoader,
  ) {
    this.sceneDisposeObserver = scene.onDisposeObservable.add(() => this.dispose());
  }

  /**
   * Clones a reviewed model under a stable procedural-unit parent.
   *
   * `null` is a cancellation result: the cache/scene or the destination parent
   * was disposed while the model was waiting to load. Decode/load/model errors
   * are intentionally rejected so the renderer can retain procedural children.
   */
  async instantiate(
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
    for (const queued of this.queuedLoads.splice(0)) queued.reject(cancellation);

    for (const root of Array.from(this.cloneRoots)) disposeQuietly(root);
    this.cloneRoots.clear();

    for (const container of Array.from(new Set(this.containers.values()))) {
      disposeQuietly(container);
    }
    this.containers.clear();
    this.loadPromises.clear();
    this.failures.clear();
  }

  private getContainer(modelUrl: string): Promise<AssetContainer> {
    if (this.disposed) return this.rejected(new CacheDisposedError());

    const knownFailure = this.failures.get(modelUrl);
    if (knownFailure) return this.rejected(knownFailure);

    const existing = this.loadPromises.get(modelUrl);
    if (existing) return existing;

    if (!modelUrl.startsWith("/manus-storage/") || !modelUrl.endsWith(".glb")) {
      const error = new Error(`Imported model URL must be a /manus-storage/*.glb path: ${modelUrl}`);
      this.failures.set(modelUrl, error);
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
    this.loadPromises.set(modelUrl, promise);
    this.queuedLoads.push({ modelUrl, resolve: resolveLoad, reject: rejectLoad });
    this.drainLoadQueue();
    return promise;
  }

  private drainLoadQueue() {
    while (
      !this.disposed &&
      this.activeLoads < MAX_CONCURRENT_LOADS &&
      this.queuedLoads.length > 0
    ) {
      const queued = this.queuedLoads.shift();
      if (!queued) return;
      this.activeLoads += 1;
      void this.runLoad(queued);
    }
  }

  private async runLoad(queued: QueuedLoad) {
    try {
      const container = await this.loader(queued.modelUrl, this.scene);
      if (this.disposed) {
        disposeQuietly(container);
        queued.reject(new CacheDisposedError());
        return;
      }

      // LoadAssetContainerAsync normally already does this. Calling it here is
      // intentional defensive ownership: a cached template must never render.
      container.removeAllFromScene();
      this.containers.set(queued.modelUrl, container);
      queued.resolve(container);
    } catch (error) {
      if (!this.disposed) this.failures.set(queued.modelUrl, error);
      queued.reject(error);
    } finally {
      this.activeLoads -= 1;
      this.drainLoadQueue();
    }
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

    // Invalid decoded content is permanently unusable for this scene. Releasing
    // it now avoids retaining a template that no future call is allowed to use.
    const container = this.containers.get(modelUrl);
    if (container) {
      this.containers.delete(modelUrl);
      disposeQuietly(container);
    }
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
