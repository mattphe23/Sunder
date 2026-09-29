export interface ImportedModelCandidate {
  name: string;
  assetId: string;
  modelUrl: string;
  vertices: number;
  triangles: number;
  runtimePrimitives: number;
  sourceBytes: number;
  textureResolution: number;
  decision: "approved-target" | "rejected-study";
}

export const IMPORTED_MODEL_PILOT_LIMITS = {
  maxTriangles: 10_000,
  maxRuntimePrimitives: 8,
  maxSourceBytes: 5 * 1024 * 1024,
  maxTextureResolution: 2_048,
} as const;

export const NERIVANE_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Warrior v1",
  assetId: "asset_S3nV1cxW54UkqNKXcU5Vtdpz",
  modelUrl: "/manus-storage/nerivane-warrior-tripo-p2-v1_a1ae73c5.glb",
  vertices: 6_345,
  triangles: 5_093,
  runtimePrimitives: 1,
  sourceBytes: 2_413_564,
  textureResolution: 2_048,
  decision: "approved-target",
};

export const NERIVANE_WARRIOR_GOLDEN_V2: ImportedModelCandidate = {
  name: "Blender Golden Warrior v2",
  assetId: "asset_S3nV1cxW54UkqNKXcU5Vtdpz",
  modelUrl: "/manus-storage/nerivane-warrior-golden-v2_7b699d63.glb",
  vertices: 1_578,
  triangles: 720,
  runtimePrimitives: 3,
  sourceBytes: 71_032,
  textureResolution: 0,
  decision: "rejected-study",
};

export function passesImportedModelPilotBudget(
  candidate: ImportedModelCandidate
) {
  return (
    candidate.assetId.startsWith("asset_") &&
    candidate.modelUrl.startsWith("/manus-storage/") &&
    candidate.modelUrl.endsWith(".glb") &&
    candidate.vertices > 0 &&
    candidate.triangles > 0 &&
    candidate.triangles <= IMPORTED_MODEL_PILOT_LIMITS.maxTriangles &&
    candidate.runtimePrimitives > 0 &&
    candidate.runtimePrimitives <=
      IMPORTED_MODEL_PILOT_LIMITS.maxRuntimePrimitives &&
    candidate.sourceBytes <= IMPORTED_MODEL_PILOT_LIMITS.maxSourceBytes &&
    candidate.textureResolution <=
      IMPORTED_MODEL_PILOT_LIMITS.maxTextureResolution
  );
}
