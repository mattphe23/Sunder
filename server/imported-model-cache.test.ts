import { AssetContainer } from "@babylonjs/core/assetContainer";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";
import {
  BoardModelCache,
  type ModelContainerLoader,
} from "../client/src/game/render/importedModelCache";
import type { ImportedModelCandidate } from "../client/src/game/render/importedModelRegistry";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function candidate(suffix = "unit"): ImportedModelCandidate {
  return {
    name: `Cache ${suffix}`,
    assetId: "asset_cache_test",
    modelUrl: `/manus-storage/cache-${suffix}.glb`,
    vertices: 8,
    triangles: 12,
    runtimePrimitives: 1,
    sourceBytes: 128,
    textureResolution: 0,
    decision: "review-candidate",
  };
}

function boxContainer(scene: Scene, height = 2): AssetContainer {
  const container = new AssetContainer(scene);
  const mesh = MeshBuilder.CreateBox("template", { width: 2, height, depth: 4 }, scene);
  const material = new StandardMaterial("shared-template-material", scene);
  const texture = RawTexture.CreateRGBATexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    scene,
  );
  material.diffuseTexture = texture;
  mesh.material = material;
  container.meshes.push(mesh);
  container.materials.push(material);
  container.textures.push(texture);
  scene.removeMesh(mesh);
  scene.removeMaterial(material);
  scene.removeTexture(texture);
  return container;
}

function flatContainer(scene: Scene): AssetContainer {
  const container = new AssetContainer(scene);
  // A ground has zero world-space y extent, so it must be rejected as a unit.
  const mesh = MeshBuilder.CreateGround("flat-template", { width: 2, height: 2 }, scene);
  container.meshes.push(mesh);
  scene.removeMesh(mesh);
  return container;
}

function createScene() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  return { engine, scene };
}

const cleanup: Array<() => void> = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()?.();
});

describe("BoardModelCache", () => {
  it("shares one in-flight URL load while giving each unit independent cloned transforms", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const pending = deferred<AssetContainer>();
    let loadCount = 0;
    const loader: ModelContainerLoader = async () => {
      loadCount += 1;
      return pending.promise;
    };
    const cache = new BoardModelCache(scene, loader);
    cleanup.push(() => cache.dispose());
    const firstParent = new TransformNode("first-parent", scene);
    const secondParent = new TransformNode("second-parent", scene);

    const firstPromise = cache.instantiate(candidate(), firstParent);
    const secondPromise = cache.instantiate(candidate(), secondParent);
    await Promise.resolve();
    expect(loadCount).toBe(1);

    pending.resolve(boxContainer(scene));
    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (!first || !second) throw new Error("expected both cloned unit models");

    expect(first.root).not.toBe(second.root);
    expect(first.meshes).toHaveLength(1);
    expect(second.meshes).toHaveLength(1);
    expect(first.meshes[0]).not.toBe(second.meshes[0]);
    expect(first.meshes[0].material).not.toBe(second.meshes[0].material);
    expect(
      (first.meshes[0].material as StandardMaterial).diffuseTexture,
    ).toBe((second.meshes[0].material as StandardMaterial).diffuseTexture);
    expect(first.root.parent).toBe(firstParent);
    expect(second.root.parent).toBe(secondParent);
    expect(first.root.scaling.y).toBeCloseTo(0.31);

    first.meshes[0].position.x = 9;
    expect(second.meshes[0].position.x).not.toBe(9);
    const secondMaterial = second.meshes[0].material as StandardMaterial;
    first.root.dispose();
    expect(second.root.isDisposed()).toBe(false);
    expect(second.meshes[0].material).toBe(secondMaterial);
    expect(secondMaterial.diffuseTexture).toBeTruthy();
  });

  it("limits distinct GLB loads to two concurrent decodes", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const pendings = new Map<string, Deferred<AssetContainer>>();
    const started: string[] = [];
    const loader: ModelContainerLoader = (url) => {
      started.push(url);
      const next = deferred<AssetContainer>();
      pendings.set(url, next);
      return next.promise;
    };
    const cache = new BoardModelCache(scene, loader);
    cleanup.push(() => cache.dispose());
    const candidates = [candidate("one"), candidate("two"), candidate("three")];
    const jobs = candidates.map((model, index) =>
      cache.instantiate(model, new TransformNode(`parent-${index}`, scene)),
    );

    await Promise.resolve();
    expect(started).toEqual([candidates[0].modelUrl, candidates[1].modelUrl]);

    pendings.get(candidates[0].modelUrl)?.resolve(boxContainer(scene));
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(candidates.map((model) => model.modelUrl));

    pendings.get(candidates[1].modelUrl)?.resolve(boxContainer(scene));
    pendings.get(candidates[2].modelUrl)?.resolve(boxContainer(scene));
    await expect(Promise.all(jobs)).resolves.toEqual([
      expect.objectContaining({ root: expect.any(TransformNode) }),
      expect.objectContaining({ root: expect.any(TransformNode) }),
      expect.objectContaining({ root: expect.any(TransformNode) }),
    ]);
  });

  it("pre-reserves texture estimates before decode, sharing one reservation per URL", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const first = deferred<AssetContainer>();
    let loadCount = 0;
    const cache = new BoardModelCache(
      scene,
      () => {
        loadCount += 1;
        return first.promise;
      },
      {
        maxTextureBytes: 100,
        textureBytesForUrl: () => 60,
        maxModels: 2,
      },
    );
    cleanup.push(() => cache.dispose());
    const parentA = new TransformNode("reservation-a", scene);
    const parentB = new TransformNode("reservation-b", scene);
    const firstJob = cache.instantiate(candidate("reserved"), parentA);
    const sharedJob = cache.instantiate(candidate("reserved"), parentB);
    await Promise.resolve();
    expect(loadCount).toBe(1);
    expect(cache.stats.reservedTextureBytes).toBe(60);
    expect(cache.stats.queuedLoads + cache.stats.activeLoads).toBe(1);

    await expect(cache.instantiate(candidate("over-budget"), new TransformNode("over-budget", scene)))
      .rejects.toThrow("reservation exceeds");
    expect(loadCount).toBe(1);
    expect(cache.stats.failedModels).toBe(1);

    first.resolve(boxContainer(scene));
    await expect(Promise.all([firstJob, sharedJob])).resolves.toHaveLength(2);
    expect(cache.stats.reservedTextureBytes).toBe(0);
  });

  it("rejects malformed decoded texture footprints instead of admitting a template", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const malformed = candidate("malformed-footprint");
    const container = boxContainer(scene);
    const texture = container.textures[0] as unknown as {
      getInternalTexture: () => { width: number; height: number; depth: number; generateMipMaps: boolean };
    };
    const originalInternal = texture.getInternalTexture();
    texture.getInternalTexture = () => ({
      ...originalInternal,
      width: Number.NaN,
      height: 1,
      depth: 1,
      generateMipMaps: false,
    });
    const cache = new BoardModelCache(scene, async () => container, {
      maxTextureBytes: 1_000,
      textureBytesForUrl: () => 4,
    });
    cleanup.push(() => cache.dispose());

    await expect(cache.instantiate(malformed, new TransformNode("malformed-parent", scene)))
      .rejects.toThrow("malformed decoded footprint");
    await expect(cache.instantiate(malformed, new TransformNode("second-parent", scene)))
      .rejects.toThrow("malformed decoded footprint");
    expect(cache.stats.loadedModels).toBe(0);
    expect(cache.stats.failedModels).toBe(1);
  });

  it("rejects a negative decoded texture depth instead of treating it as a 2D sentinel", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const container = boxContainer(scene);
    const texture = container.textures[0] as unknown as {
      getInternalTexture: () => { width: number; height: number; depth: number; generateMipMaps: boolean };
    };
    const originalInternal = texture.getInternalTexture();
    texture.getInternalTexture = () => ({
      ...originalInternal,
      width: 1,
      height: 1,
      depth: -1,
      generateMipMaps: false,
    });
    const cache = new BoardModelCache(scene, async () => container, {
      maxTextureBytes: 1_000,
      textureBytesForUrl: () => 4,
    });
    cleanup.push(() => cache.dispose());

    await expect(cache.instantiate(candidate("negative-depth"), new TransformNode("negative-depth-parent", scene)))
      .rejects.toThrow("malformed decoded footprint");
  });

  it("fails closed on timeout, releases callers, and disposes a late container without freeing the physical slot early", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const late = [deferred<AssetContainer>(), deferred<AssetContainer>()];
    let started = 0;
    const cache = new BoardModelCache(
      scene,
      () => {
        const pending = late[started];
        started += 1;
        if (!pending) throw new Error("unexpected third physical decode");
        return pending.promise;
      },
      { loadTimeoutMs: 5, maxTextureBytes: 100, textureBytesForUrl: () => 8 },
    );
    cleanup.push(() => cache.dispose());
    const first = cache.instantiate(candidate("timeout-one"), new TransformNode("timeout-one", scene));
    const second = cache.instantiate(candidate("timeout-two"), new TransformNode("timeout-two", scene));
    const queued = cache.instantiate(candidate("timeout-three"), new TransformNode("timeout-three", scene));

    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(first).rejects.toThrow("timed out");
    await expect(second).rejects.toThrow("fail-closed");
    await expect(queued).rejects.toThrow("fail-closed");
    expect(started).toBe(2);
    expect(cache.stats.activeLoads).toBe(2);
    expect(cache.stats.reservedTextureBytes).toBe(16);
    expect(cache.stats.timedOut).toBe(true);

    const lateContainers = [boxContainer(scene), boxContainer(scene)];
    late[0].resolve(lateContainers[0]);
    late[1].resolve(lateContainers[1]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cache.stats.activeLoads).toBe(0);
    expect(cache.stats.reservedTextureBytes).toBe(0);
    expect(lateContainers[0].meshes).toHaveLength(0);
    expect(lateContainers[1].meshes).toHaveLength(0);
  });

  it("retains active decode accounting after dispose until a late loader settles", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => engine.dispose());
    const late = deferred<AssetContainer>();
    const cache = new BoardModelCache(scene, () => late.promise, {
      maxTextureBytes: 100,
      textureBytesForUrl: () => 12,
    });
    const job = cache.instantiate(candidate("disposed-late"), new TransformNode("disposed-late", scene));
    await Promise.resolve();
    cache.dispose();
    await expect(job).resolves.toBeNull();
    expect(cache.stats.activeLoads).toBe(1);
    expect(cache.stats.reservedTextureBytes).toBe(12);

    const lateContainer = boxContainer(scene);
    late.resolve(lateContainer);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cache.stats.activeLoads).toBe(0);
    expect(cache.stats.reservedTextureBytes).toBe(0);
    expect(lateContainer.meshes).toHaveLength(0);
    scene.dispose();
  });

  it("cancels attachment when the parent or owning scene is disposed during a load", async () => {
    const parentCase = createScene();
    cleanup.push(() => {
      parentCase.scene.dispose();
      parentCase.engine.dispose();
    });
    const parentPending = deferred<AssetContainer>();
    const parentCache = new BoardModelCache(parentCase.scene, () => parentPending.promise);
    cleanup.push(() => parentCache.dispose());
    const parent = new TransformNode("disposed-parent", parentCase.scene);
    const parentJob = parentCache.instantiate(candidate("parent"), parent);
    parent.dispose();
    parentPending.resolve(boxContainer(parentCase.scene));
    await expect(parentJob).resolves.toBeNull();
    expect(parentCase.scene.meshes).toHaveLength(0);

    const sceneCase = createScene();
    cleanup.push(() => {
      sceneCase.scene.dispose();
      sceneCase.engine.dispose();
    });
    const scenePending = deferred<AssetContainer>();
    const sceneCache = new BoardModelCache(sceneCase.scene, () => scenePending.promise);
    const sceneParent = new TransformNode("scene-parent", sceneCase.scene);
    const sceneJob = sceneCache.instantiate(candidate("scene"), sceneParent);
    sceneCase.scene.dispose();
    const template = boxContainer(sceneCase.scene);
    scenePending.resolve(template);
    await expect(sceneJob).resolves.toBeNull();
    expect(template.meshes).toHaveLength(0);
  });

  it("rejects zero-height model bounds once and leaves procedural parent children untouched", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const invalid = candidate("invalid-bounds");
    let loadCount = 0;
    const cache = new BoardModelCache(scene, async () => {
      loadCount += 1;
      return flatContainer(scene);
    });
    cleanup.push(() => cache.dispose());
    const parent = new TransformNode("procedural-parent", scene);
    const proceduralChild = MeshBuilder.CreateBox("procedural-child", { size: 1 }, scene);
    proceduralChild.parent = parent;

    await expect(cache.instantiate(invalid, parent)).rejects.toThrow("invalid bounds");
    await expect(cache.instantiate(invalid, parent)).rejects.toThrow("invalid bounds");
    expect(loadCount).toBe(1);
    expect(proceduralChild.isDisposed()).toBe(false);
  });

  it("memoizes load failures and rejects without touching existing procedural children", async () => {
    const { engine, scene } = createScene();
    cleanup.push(() => {
      scene.dispose();
      engine.dispose();
    });
    const failed = candidate("decode-failure");
    let loadCount = 0;
    const cache = new BoardModelCache(scene, async () => {
      loadCount += 1;
      throw new Error("GLB decode failed");
    });
    cleanup.push(() => cache.dispose());
    const parent = new TransformNode("procedural-parent", scene);
    const proceduralChild = MeshBuilder.CreateBox("procedural-child", { size: 1 }, scene);
    proceduralChild.parent = parent;

    await expect(cache.instantiate(failed, parent)).rejects.toThrow("GLB decode failed");
    await expect(cache.instantiate(failed, parent)).rejects.toThrow("GLB decode failed");
    expect(loadCount).toBe(1);
    expect(proceduralChild.isDisposed()).toBe(false);
  });
});
