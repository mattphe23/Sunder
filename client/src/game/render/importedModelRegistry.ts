import type { UnitType } from "../core/types";

export interface ImportedModelCandidate {
  name: string;
  assetId: string;
  modelUrl: string;
  vertices: number;
  triangles: number;
  runtimePrimitives: number;
  sourceBytes: number;
  textureResolution: number;
  decision: "approved-target" | "review-candidate" | "rejected-study";
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

export const NERIVANE_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Archer v1",
  assetId: "asset_dZ5ekBi5ta4RuMv642v4kEwg",
  modelUrl: "/manus-storage/nerivane-archer-tripo-p2-v1_6578b495.glb",
  vertices: 7_011,
  triangles: 4_797,
  runtimePrimitives: 1,
  sourceBytes: 2_788_280,
  textureResolution: 2_048,
  decision: "approved-target",
};

export const NERIVANE_DEFENDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Defender v1",
  assetId: "asset_TPq7DNz9t2ndxB7mWrgGWZBf",
  modelUrl: "/manus-storage/nerivane-defender-tripo-p2-v1_5c6aee77.glb",
  vertices: 6_751,
  triangles: 5_247,
  runtimePrimitives: 1,
  sourceBytes: 3_042_840,
  textureResolution: 2_048,
  decision: "approved-target",
};

export const NERIVANE_RIDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Rider v1",
  assetId: "asset_hppRhFGzZxpLErL7XoyyV6r8",
  modelUrl: "/manus-storage/nerivane-rider-tripo-p2-v1_4f4ceb63.glb",
  vertices: 6_034,
  triangles: 5_427,
  runtimePrimitives: 1,
  sourceBytes: 2_608_272,
  textureResolution: 2_048,
  decision: "rejected-study",
};

export const NERIVANE_RIDER_AQUATIC_V2: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Rider aquatic v2",
  assetId: "asset_kLxCjo8ZUZRUuFvkYtKYCwoP",
  modelUrl: "/manus-storage/nerivane-rider-tripo-p2-v2_b6bf26e0.glb",
  vertices: 5_973,
  triangles: 4_987,
  runtimePrimitives: 1,
  sourceBytes: 2_785_372,
  textureResolution: 2_048,
  decision: "approved-target",
};

export const NERIVANE_TIDECALLER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Tidecaller v1",
  assetId: "asset_ts7XdES84Kv4U3w9YKRVkJ8S",
  modelUrl: "/manus-storage/nerivane-tidecaller-tripo-p2-v1_7816d57c.glb",
  vertices: 3_876,
  triangles: 5_184,
  runtimePrimitives: 1,
  sourceBytes: 2_217_220,
  textureResolution: 2_048,
  decision: "approved-target",
};

export const NERIVANE_NERETH_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Nereth v1",
  assetId: "asset_VPV6Feg41fyc1si5xKTdwZXG",
  modelUrl: "/manus-storage/nerivane-nereth-tripo-p2-v1_0847ff85.glb",
  vertices: 6_178,
  triangles: 4_566,
  runtimePrimitives: 1,
  sourceBytes: 3_124_068,
  textureResolution: 2_048,
  decision: "approved-target",
};

/** First cross-tribe P2 pilot; visual direction remains unapproved pending the complete lineup review. */
export const AUREN_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Auren Warrior v1",
  assetId: "asset_wiR5LFhSSf5bEMUYttpSSPZt",
  modelUrl: "/manus-storage/auren-warrior-tripo-p2-v1_75223405.glb",
  vertices: 6_301,
  triangles: 4_353,
  runtimePrimitives: 1,
  sourceBytes: 3_073_496,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** First-pass Archer study. Only the explicit review route loads this GLB. */
export const AUREN_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Auren Archer v1",
  assetId: "asset_eNPksMqxoZUYdAcncHHYBxjG",
  modelUrl: "/manus-storage/auren-archer-tripo-p2-v1_d0a2631a.glb",
  vertices: 7_697,
  triangles: 4_812,
  runtimePrimitives: 1,
  sourceBytes: 3_191_580,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** First-pass Defender study; only the explicit development preview can load this GLB. */
export const AUREN_DEFENDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Auren Defender v1",
  assetId: "asset_rzu3ZxDAeW6MZ6CDm4KBKMyN",
  modelUrl: "/manus-storage/auren-defender-tripo-p2-v1_7a2eaa5e.glb",
  vertices: 6_791,
  triangles: 4_553,
  runtimePrimitives: 1,
  sourceBytes: 3_463_632,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Auren's mounted first-pass study; gameplay remains procedural outside the opt-in preview. */
export const AUREN_RIDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Auren Rider v1",
  assetId: "asset_r2PMcxBsrzmPB96StyVZ6BoC",
  modelUrl: "/manus-storage/auren-rider-tripo-p2-v1_127d9a50.glb",
  vertices: 7_311,
  triangles: 4_880,
  runtimePrimitives: 1,
  sourceBytes: 3_543_656,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Auren's distinct staff-and-lens unique unit; kept opt-in until the full roster review. */
export const AUREN_ARCANIST_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Auren Arcanist v1",
  assetId: "asset_58PE3HsUFbcBsPvT8sxrFuJh",
  modelUrl: "/manus-storage/auren-arcanist-tripo-p2-v1_bccc218f.glb",
  vertices: 6_767,
  triangles: 4_686,
  runtimePrimitives: 1,
  sourceBytes: 3_328_668,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Auren's Maelis hero; a first-pass visual study only, not the default hero model. */
export const AUREN_MAELIS_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Auren Maelis v1",
  assetId: "asset_GWe6ZsbiKvpS9YsQ46goLMsf",
  modelUrl: "/manus-storage/auren-maelis-tripo-p2-v1_443cbc66.glb",
  vertices: 7_382,
  triangles: 5_105,
  runtimePrimitives: 1,
  sourceBytes: 3_476_540,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Dravok's first-pass stone infantry study; only an explicit review route imports this GLB. */
export const DRAVOK_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Dravok Warrior v1",
  assetId: "asset_5BXDnyUni43NVPN2tRTpsRwT",
  modelUrl: "/manus-storage/dravok-warrior-tripo-p2-v1_881c5daf.glb",
  vertices: 5_270,
  triangles: 3_593,
  runtimePrimitives: 1,
  sourceBytes: 3_162_552,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Dravok's first-pass stone bow infantry; ordinary matches remain procedural. */
export const DRAVOK_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Dravok Archer v1",
  assetId: "asset_SGhUdcFdjyUUneqUaAdw6GwZ",
  modelUrl: "/manus-storage/dravok-archer-tripo-p2-v1_36b23044.glb",
  vertices: 7_055,
  triangles: 4_841,
  runtimePrimitives: 1,
  sourceBytes: 2_861_332,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Dravok's first-pass tower-shield Defender; ordinary gameplay stays procedural. */
export const DRAVOK_DEFENDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Dravok Defender v1",
  assetId: "asset_TcpQiTL2ENqZanWhsCAeLYvY",
  modelUrl: "/manus-storage/dravok-defender-tripo-p2-v1_f9f69e23.glb",
  vertices: 5_177,
  triangles: 3_200,
  runtimePrimitives: 1,
  sourceBytes: 3_246_060,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Vessari's first-pass cavalry-border infantry; not a gameplay-default model. */
export const VESSARI_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Vessari Warrior v1",
  assetId: "asset_bWQmtZAKzZQNpGRuDv72oTka",
  modelUrl: "/manus-storage/vessari-warrior-tripo-p2-v1_88434b73.glb",
  vertices: 7_376,
  triangles: 5_176,
  runtimePrimitives: 1,
  sourceBytes: 3_035_204,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Vessari's first-pass bow infantry; ordinary matches remain procedural. */
export const VESSARI_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Vessari Archer v1",
  assetId: "asset_TBuK3UTJKU9ztSs3T1EiWL9v",
  modelUrl: "/manus-storage/vessari-archer-tripo-p2-v1_a629c752.glb",
  vertices: 6_630,
  triangles: 4_627,
  runtimePrimitives: 1,
  sourceBytes: 3_340_612,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Vessari's first-pass spear-and-shield Defender; never loaded without an explicit review route. */
export const VESSARI_DEFENDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Vessari Defender v1",
  assetId: "asset_2YedqmFoW12sJYZtTFCzWdL6",
  modelUrl: "/manus-storage/vessari-defender-tripo-p2-v1_333cf8da.glb",
  vertices: 6_891,
  triangles: 4_878,
  runtimePrimitives: 1,
  sourceBytes: 3_163_676,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Valkyra's storm infantry first pass; ordinary matches remain procedural. */
export const VALKYRA_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Valkyra Warrior v1",
  assetId: "asset_FWzXYDdh2CP2CN4zBJo7UmJe",
  modelUrl: "/manus-storage/valkyra-warrior-tripo-p2-v1_051262b9.glb",
  vertices: 3_652,
  triangles: 4_612,
  runtimePrimitives: 1,
  sourceBytes: 3_039_560,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Valkyra's first-pass bow infantry; only an explicit review route requests this GLB. */
export const VALKYRA_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Valkyra Archer v1",
  assetId: "asset_w7FQvv7yUNsXbzRtg1rAzWV4",
  modelUrl: "/manus-storage/valkyra-archer-tripo-p2-v1_616c7c8e.glb",
  vertices: 6_212,
  triangles: 4_639,
  runtimePrimitives: 1,
  sourceBytes: 3_068_676,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Valkyra's first-pass shield unit; only the explicit development route requests this GLB. */
export const VALKYRA_DEFENDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Valkyra Defender v1",
  assetId: "asset_D3DLdcPWMhHRRq8T1PxunKWd",
  modelUrl: "/manus-storage/valkyra-defender-tripo-p2-v1_02d56868.glb",
  vertices: 6_391,
  triangles: 4_655,
  runtimePrimitives: 1,
  sourceBytes: 3_652_184,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Mycelon's spore infantry first pass; ordinary matches remain procedural. */
export const MYCELON_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Mycelon Warrior v1",
  assetId: "asset_xvpEHJBy5FW2BPCKRjh1QapM",
  modelUrl: "/manus-storage/mycelon-warrior-tripo-p2-v1_786024e4.glb",
  vertices: 3_523,
  triangles: 4_518,
  runtimePrimitives: 1,
  sourceBytes: 2_504_068,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Mycelon's first-pass mushroom bow unit; ordinary matches remain procedural. */
export const MYCELON_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Mycelon Archer v1",
  assetId: "asset_QXDWHvq8529Q9MEc6u6Marsb",
  modelUrl: "/manus-storage/mycelon-archer-tripo-p2-v1_8fa3590e.glb",
  vertices: 6_249,
  triangles: 4_336,
  runtimePrimitives: 1,
  sourceBytes: 3_452_104,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Mycelon's first-pass spore-shield Defender; ordinary gameplay stays procedural. */
export const MYCELON_DEFENDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Mycelon Defender v1",
  assetId: "asset_rDVB52yVEAHL2D473tqdi56L",
  modelUrl: "/manus-storage/mycelon-defender-tripo-p2-v1_225e0a80.glb",
  vertices: 6_443,
  triangles: 4_968,
  runtimePrimitives: 1,
  sourceBytes: 3_056_332,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Sunwei's first-pass solar infantry; only the explicit development route imports it. */
export const SUNWEI_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Sunwei Warrior v1",
  assetId: "asset_pef1PPu7X8gmcLFEeifiXhq8",
  modelUrl: "/manus-storage/sunwei-warrior-tripo-p2-v1_af991702.glb",
  vertices: 7_259,
  triangles: 4_858,
  runtimePrimitives: 1,
  sourceBytes: 3_171_352,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Sunwei's first-pass bow infantry; only an explicit review route requests this GLB. */
export const SUNWEI_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Sunwei Archer v1",
  assetId: "asset_pCbHBgedxLF7KxE8gPsHrseU",
  modelUrl: "/manus-storage/sunwei-archer-tripo-p2-v1_580bcfff.glb",
  vertices: 7_661,
  triangles: 5_006,
  runtimePrimitives: 1,
  sourceBytes: 2_811_944,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Sunwei's first-pass polehammer-and-shield Defender; explicit review routes only. */
export const SUNWEI_DEFENDER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Sunwei Defender v1",
  assetId: "asset_qPrvb3YcC2sD4MzhYV5BV4Hs",
  modelUrl: "/manus-storage/sunwei-defender-tripo-p2-v1_e386fdc1.glb",
  vertices: 7_163,
  triangles: 4_551,
  runtimePrimitives: 1,
  sourceBytes: 3_072_148,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Kharzul's first-pass infantry, reconstructed from three original views and a repaired right profile. */
export const KHARZUL_WARRIOR_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Kharzul Warrior v1",
  assetId: "asset_dbYL3ACetv23YrHQ8NProoWX",
  modelUrl: "/manus-storage/kharzul-warrior-tripo-p2-v1_0dfbcc82.glb",
  vertices: 6_526,
  triangles: 4_411,
  runtimePrimitives: 1,
  sourceBytes: 3_368_484,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Kharzul's short-crest Archer first pass; ordinary matches remain procedural. */
export const KHARZUL_ARCHER_PILOT: ImportedModelCandidate = {
  name: "Scenario Tripo P2 Kharzul Archer v1",
  assetId: "asset_gFTUWnhneufVBjVATNDdcWWU",
  modelUrl: "/manus-storage/kharzul-archer-tripo-p2-v1_8ff6d78c.glb",
  vertices: 7_103,
  triangles: 4_772,
  runtimePrimitives: 1,
  sourceBytes: 3_330_404,
  textureResolution: 2_048,
  decision: "review-candidate",
};

/** Approved targets and first-pass studies remain separate; only cataloged entries get review routes. */
export interface CrossTribeModelPilot {
  slug: string;
  tribeIndex: number;
  unitType: UnitType;
  candidate: ImportedModelCandidate;
}

export const CROSS_TRIBE_P2_PILOTS: readonly CrossTribeModelPilot[] = [
  { slug: "auren-warrior", tribeIndex: 0, unitType: "warrior", candidate: AUREN_WARRIOR_PILOT },
  { slug: "auren-archer", tribeIndex: 0, unitType: "archer", candidate: AUREN_ARCHER_PILOT },
  { slug: "auren-defender", tribeIndex: 0, unitType: "defender", candidate: AUREN_DEFENDER_PILOT },
  { slug: "auren-rider", tribeIndex: 0, unitType: "rider", candidate: AUREN_RIDER_PILOT },
  { slug: "auren-arcanist", tribeIndex: 0, unitType: "arcanist", candidate: AUREN_ARCANIST_PILOT },
  { slug: "auren-maelis", tribeIndex: 0, unitType: "hero", candidate: AUREN_MAELIS_PILOT },
  { slug: "dravok-warrior", tribeIndex: 5, unitType: "warrior", candidate: DRAVOK_WARRIOR_PILOT },
  { slug: "dravok-archer", tribeIndex: 5, unitType: "archer", candidate: DRAVOK_ARCHER_PILOT },
  { slug: "dravok-defender", tribeIndex: 5, unitType: "defender", candidate: DRAVOK_DEFENDER_PILOT },
  { slug: "vessari-warrior", tribeIndex: 3, unitType: "warrior", candidate: VESSARI_WARRIOR_PILOT },
  { slug: "vessari-archer", tribeIndex: 3, unitType: "archer", candidate: VESSARI_ARCHER_PILOT },
  { slug: "vessari-defender", tribeIndex: 3, unitType: "defender", candidate: VESSARI_DEFENDER_PILOT },
  { slug: "valkyra-warrior", tribeIndex: 6, unitType: "warrior", candidate: VALKYRA_WARRIOR_PILOT },
  { slug: "valkyra-archer", tribeIndex: 6, unitType: "archer", candidate: VALKYRA_ARCHER_PILOT },
  { slug: "valkyra-defender", tribeIndex: 6, unitType: "defender", candidate: VALKYRA_DEFENDER_PILOT },
  { slug: "mycelon-warrior", tribeIndex: 7, unitType: "warrior", candidate: MYCELON_WARRIOR_PILOT },
  { slug: "mycelon-archer", tribeIndex: 7, unitType: "archer", candidate: MYCELON_ARCHER_PILOT },
  { slug: "mycelon-defender", tribeIndex: 7, unitType: "defender", candidate: MYCELON_DEFENDER_PILOT },
  { slug: "sunwei-warrior", tribeIndex: 2, unitType: "warrior", candidate: SUNWEI_WARRIOR_PILOT },
  { slug: "sunwei-archer", tribeIndex: 2, unitType: "archer", candidate: SUNWEI_ARCHER_PILOT },
  { slug: "sunwei-defender", tribeIndex: 2, unitType: "defender", candidate: SUNWEI_DEFENDER_PILOT },
  { slug: "kharzul-warrior", tribeIndex: 1, unitType: "warrior", candidate: KHARZUL_WARRIOR_PILOT },
  { slug: "kharzul-archer", tribeIndex: 1, unitType: "archer", candidate: KHARZUL_ARCHER_PILOT },
];

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
