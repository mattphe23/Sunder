import { describe, expect, it } from "vitest";
import {
  AUREN_ARCANIST_PILOT,
  AUREN_ARCHER_PILOT,
  AUREN_DEFENDER_PILOT,
  AUREN_MAELIS_PILOT,
  AUREN_RIDER_PILOT,
  AUREN_WARRIOR_PILOT,
  CROSS_TRIBE_P2_PILOTS,
  DRAVOK_ARCHER_PILOT,
  DRAVOK_BULWARK_PILOT,
  DRAVOK_DEFENDER_PILOT,
  DRAVOK_RIDER_PILOT,
  DRAVOK_WARRIOR_PILOT,
  IMPORTED_MODEL_PILOT_LIMITS,
  KHARZUL_ARCHER_PILOT,
  KHARZUL_BERSERKER_PILOT,
  KHARZUL_DEFENDER_PILOT,
  KHARZUL_RIDER_PILOT,
  KHARZUL_WARRIOR_PILOT,
  MYCELON_ARCHER_PILOT,
  MYCELON_DEFENDER_PILOT,
  MYCELON_RIDER_PILOT,
  MYCELON_WARRIOR_PILOT,
  NERIVANE_ARCHER_PILOT,
  NERIVANE_DEFENDER_PILOT,
  NERIVANE_RIDER_AQUATIC_V2,
  NERIVANE_RIDER_PILOT,
  NERIVANE_TIDECALLER_PILOT,
  NERIVANE_NERETH_PILOT,
  NERIVANE_WARRIOR_GOLDEN_V2,
  NERIVANE_WARRIOR_PILOT,
  SUNWEI_ARCHER_PILOT,
  SUNWEI_DEFENDER_PILOT,
  SUNWEI_RIDER_PILOT,
  SUNWEI_SUNWARDEN_PILOT,
  SUNWEI_WARRIOR_PILOT,
  VALKYRA_ARCHER_PILOT,
  VALKYRA_DEFENDER_PILOT,
  VALKYRA_RIDER_PILOT,
  VALKYRA_WARRIOR_PILOT,
  VESSARI_ARCHER_PILOT,
  VESSARI_DEFENDER_PILOT,
  VESSARI_RAIDER_PILOT,
  VESSARI_RIDER_PILOT,
  VESSARI_WARRIOR_PILOT,
  passesImportedModelPilotBudget,
  type ImportedModelCandidate,
} from "../client/src/game/render/importedModelRegistry";

describe("imported model pilot registry", () => {
  it("keeps the Nerivane Warrior candidate deployment-safe and within the review budget", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_WARRIOR_PILOT)).toBe(true);
    expect(NERIVANE_WARRIOR_PILOT.decision).toBe("approved-target");
    expect(NERIVANE_WARRIOR_PILOT.modelUrl).toMatch(
      /^\/manus-storage\/.+\.glb$/
    );
  });

  it("keeps the authored golden unit far below the geometry and file-size budgets", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_WARRIOR_GOLDEN_V2)).toBe(
      true
    );
    expect(NERIVANE_WARRIOR_GOLDEN_V2.triangles).toBeLessThan(1_000);
    expect(NERIVANE_WARRIOR_GOLDEN_V2.sourceBytes).toBeLessThan(100 * 1024);
    expect(NERIVANE_WARRIOR_GOLDEN_V2.runtimePrimitives).toBe(3);
    expect(NERIVANE_WARRIOR_GOLDEN_V2.textureResolution).toBe(0);
    expect(NERIVANE_WARRIOR_GOLDEN_V2.decision).toBe("rejected-study");
  });

  it("keeps the approved Archer target inside the same mobile budget", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_ARCHER_PILOT)).toBe(true);
    expect(NERIVANE_ARCHER_PILOT.decision).toBe("approved-target");
    expect(NERIVANE_ARCHER_PILOT.assetId).toBe(
      "asset_dZ5ekBi5ta4RuMv642v4kEwg"
    );
    expect(NERIVANE_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(NERIVANE_ARCHER_PILOT.triangles).toBeLessThan(5_000);
  });

  it("keeps the approved Defender target inside the same mobile budget", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_DEFENDER_PILOT)).toBe(true);
    expect(NERIVANE_DEFENDER_PILOT.decision).toBe("approved-target");
    expect(NERIVANE_DEFENDER_PILOT.assetId).toBe(
      "asset_TPq7DNz9t2ndxB7mWrgGWZBf"
    );
    expect(NERIVANE_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(NERIVANE_DEFENDER_PILOT.triangles).toBeLessThan(6_000);
  });

  it("retains Rider v1 as a non-production benchmark inside the mobile budget", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_RIDER_PILOT)).toBe(true);
    expect(NERIVANE_RIDER_PILOT.decision).toBe("rejected-study");
    expect(NERIVANE_RIDER_PILOT.assetId).toBe("asset_hppRhFGzZxpLErL7XoyyV6r8");
    expect(NERIVANE_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(NERIVANE_RIDER_PILOT.triangles).toBeLessThan(6_000);
  });

  it("locks aquatic Rider v2 as the approved target inside the mobile budget", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_RIDER_AQUATIC_V2)).toBe(
      true
    );
    expect(NERIVANE_RIDER_AQUATIC_V2.decision).toBe("approved-target");
    expect(NERIVANE_RIDER_AQUATIC_V2.assetId).toBe(
      "asset_kLxCjo8ZUZRUuFvkYtKYCwoP"
    );
    expect(NERIVANE_RIDER_AQUATIC_V2.runtimePrimitives).toBe(1);
    expect(NERIVANE_RIDER_AQUATIC_V2.triangles).toBeLessThan(5_000);
  });

  it("locks Tidecaller P2 v1 as the approved target inside the mobile budget", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_TIDECALLER_PILOT)).toBe(
      true
    );
    expect(NERIVANE_TIDECALLER_PILOT.decision).toBe("approved-target");
    expect(NERIVANE_TIDECALLER_PILOT.assetId).toBe(
      "asset_ts7XdES84Kv4U3w9YKRVkJ8S"
    );
    expect(NERIVANE_TIDECALLER_PILOT.runtimePrimitives).toBe(1);
    expect(NERIVANE_TIDECALLER_PILOT.triangles).toBeLessThan(6_000);
  });

  it("locks Nereth P2 v1 as the approved target inside the pilot budget", () => {
    expect(passesImportedModelPilotBudget(NERIVANE_NERETH_PILOT)).toBe(true);
    expect(NERIVANE_NERETH_PILOT.decision).toBe("approved-target");
    expect(NERIVANE_NERETH_PILOT.assetId).toBe(
      "asset_VPV6Feg41fyc1si5xKTdwZXG"
    );
    expect(NERIVANE_NERETH_PILOT.modelUrl).toMatch(
      /^\/manus-storage\/.+\.glb$/
    );
    expect(NERIVANE_NERETH_PILOT.runtimePrimitives).toBe(1);
    expect(NERIVANE_NERETH_PILOT.triangles).toBeLessThan(5_000);
  });

  it("keeps the Auren Warrior first-pass GLB within budget and explicitly review-only", () => {
    expect(passesImportedModelPilotBudget(AUREN_WARRIOR_PILOT)).toBe(true);
    expect(AUREN_WARRIOR_PILOT.decision).toBe("review-candidate");
    expect(AUREN_WARRIOR_PILOT.assetId).toBe("asset_wiR5LFhSSf5bEMUYttpSSPZt");
    expect(AUREN_WARRIOR_PILOT.modelUrl).toMatch(/^\/manus-storage\/.+\.glb$/);
    expect(AUREN_WARRIOR_PILOT.runtimePrimitives).toBe(1);
    expect(AUREN_WARRIOR_PILOT.triangles).toBeLessThan(5_000);
  });

  it("keeps Auren Archer review-only and its generated GLB within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(AUREN_ARCHER_PILOT)).toBe(true);
    expect(AUREN_ARCHER_PILOT.decision).toBe("review-candidate");
    expect(AUREN_ARCHER_PILOT.assetId).toBe("asset_eNPksMqxoZUYdAcncHHYBxjG");
    expect(AUREN_ARCHER_PILOT.modelUrl).toBe("/manus-storage/auren-archer-tripo-p2-v1_d0a2631a.glb");
    expect(AUREN_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(AUREN_ARCHER_PILOT.triangles).toBeLessThan(5_000);
    expect(AUREN_ARCHER_PILOT.sourceBytes).toBe(3_191_580);
  });

  it("keeps the first-pass Auren Defender model budgeted and review-only", () => {
    expect(passesImportedModelPilotBudget(AUREN_DEFENDER_PILOT)).toBe(true);
    expect(AUREN_DEFENDER_PILOT.decision).toBe("review-candidate");
    expect(AUREN_DEFENDER_PILOT.assetId).toBe("asset_rzu3ZxDAeW6MZ6CDm4KBKMyN");
    expect(AUREN_DEFENDER_PILOT.modelUrl).toBe("/manus-storage/auren-defender-tripo-p2-v1_7a2eaa5e.glb");
    expect(AUREN_DEFENDER_PILOT.vertices).toBe(6_791);
    expect(AUREN_DEFENDER_PILOT.triangles).toBe(4_553);
    expect(AUREN_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(AUREN_DEFENDER_PILOT.sourceBytes).toBe(3_463_632);
  });

  it("keeps the first-pass Auren Rider review-only and within the GLB budget", () => {
    expect(passesImportedModelPilotBudget(AUREN_RIDER_PILOT)).toBe(true);
    expect(AUREN_RIDER_PILOT.decision).toBe("review-candidate");
    expect(AUREN_RIDER_PILOT.assetId).toBe("asset_r2PMcxBsrzmPB96StyVZ6BoC");
    expect(AUREN_RIDER_PILOT.modelUrl).toBe("/manus-storage/auren-rider-tripo-p2-v1_127d9a50.glb");
    expect(AUREN_RIDER_PILOT.vertices).toBe(7_311);
    expect(AUREN_RIDER_PILOT.triangles).toBe(4_880);
    expect(AUREN_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(AUREN_RIDER_PILOT.sourceBytes).toBe(3_543_656);
  });

  it("keeps Auren Arcanist's first-pass model reviewed, budgeted, and separate from the hero", () => {
    expect(passesImportedModelPilotBudget(AUREN_ARCANIST_PILOT)).toBe(true);
    expect(AUREN_ARCANIST_PILOT.decision).toBe("review-candidate");
    expect(AUREN_ARCANIST_PILOT.assetId).toBe("asset_58PE3HsUFbcBsPvT8sxrFuJh");
    expect(AUREN_ARCANIST_PILOT.modelUrl).toBe("/manus-storage/auren-arcanist-tripo-p2-v1_bccc218f.glb");
    expect(AUREN_ARCANIST_PILOT.vertices).toBe(6_767);
    expect(AUREN_ARCANIST_PILOT.triangles).toBe(4_686);
    expect(AUREN_ARCANIST_PILOT.runtimePrimitives).toBe(1);
    expect(AUREN_ARCANIST_PILOT.sourceBytes).toBe(3_328_668);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "auren-arcanist")?.unitType).toBe("arcanist");
  });

  it("keeps Auren's true hero Maelis a budgeted, opt-in review candidate", () => {
    expect(passesImportedModelPilotBudget(AUREN_MAELIS_PILOT)).toBe(true);
    expect(AUREN_MAELIS_PILOT.decision).toBe("review-candidate");
    expect(AUREN_MAELIS_PILOT.assetId).toBe("asset_GWe6ZsbiKvpS9YsQ46goLMsf");
    expect(AUREN_MAELIS_PILOT.modelUrl).toBe("/manus-storage/auren-maelis-tripo-p2-v1_443cbc66.glb");
    expect(AUREN_MAELIS_PILOT.vertices).toBe(7_382);
    expect(AUREN_MAELIS_PILOT.triangles).toBe(5_105);
    expect(AUREN_MAELIS_PILOT.runtimePrimitives).toBe(1);
    expect(AUREN_MAELIS_PILOT.sourceBytes).toBe(3_476_540);
    expect(AUREN_MAELIS_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "auren-maelis")).toMatchObject({
      tribeIndex: 0,
      unitType: "hero",
      candidate: AUREN_MAELIS_PILOT,
    });
  });

  it("keeps Dravok Warrior's first-pass GLB opt-in and within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(DRAVOK_WARRIOR_PILOT)).toBe(true);
    expect(DRAVOK_WARRIOR_PILOT.decision).toBe("review-candidate");
    expect(DRAVOK_WARRIOR_PILOT.assetId).toBe("asset_5BXDnyUni43NVPN2tRTpsRwT");
    expect(DRAVOK_WARRIOR_PILOT.modelUrl).toBe("/manus-storage/dravok-warrior-tripo-p2-v1_881c5daf.glb");
    expect(DRAVOK_WARRIOR_PILOT.vertices).toBe(5_270);
    expect(DRAVOK_WARRIOR_PILOT.triangles).toBe(3_593);
    expect(DRAVOK_WARRIOR_PILOT.runtimePrimitives).toBe(1);
    expect(DRAVOK_WARRIOR_PILOT.sourceBytes).toBe(3_162_552);
    expect(DRAVOK_WARRIOR_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "dravok-warrior")).toMatchObject({
      tribeIndex: 5,
      unitType: "warrior",
      candidate: DRAVOK_WARRIOR_PILOT,
    });
  });

  it("keeps Dravok Archer's first-pass GLB budgeted, opt-in and mapped to the bow role", () => {
    expect(passesImportedModelPilotBudget(DRAVOK_ARCHER_PILOT)).toBe(true);
    expect(DRAVOK_ARCHER_PILOT.decision).toBe("review-candidate");
    expect(DRAVOK_ARCHER_PILOT.assetId).toBe("asset_SGhUdcFdjyUUneqUaAdw6GwZ");
    expect(DRAVOK_ARCHER_PILOT.modelUrl).toBe("/manus-storage/dravok-archer-tripo-p2-v1_36b23044.glb");
    expect(DRAVOK_ARCHER_PILOT.vertices).toBe(7_055);
    expect(DRAVOK_ARCHER_PILOT.triangles).toBe(4_841);
    expect(DRAVOK_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(DRAVOK_ARCHER_PILOT.sourceBytes).toBe(2_861_332);
    expect(DRAVOK_ARCHER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "dravok-archer")).toMatchObject({
      tribeIndex: 5,
      unitType: "archer",
      candidate: DRAVOK_ARCHER_PILOT,
    });
  });

  it("keeps Dravok Defender's audited tower-shield GLB opt-in for the correct tribe and role", () => {
    expect(passesImportedModelPilotBudget(DRAVOK_DEFENDER_PILOT)).toBe(true);
    expect(DRAVOK_DEFENDER_PILOT.decision).toBe("review-candidate");
    expect(DRAVOK_DEFENDER_PILOT.assetId).toBe("asset_TcpQiTL2ENqZanWhsCAeLYvY");
    expect(DRAVOK_DEFENDER_PILOT.modelUrl).toBe("/manus-storage/dravok-defender-tripo-p2-v1_f9f69e23.glb");
    expect(DRAVOK_DEFENDER_PILOT.vertices).toBe(5_177);
    expect(DRAVOK_DEFENDER_PILOT.triangles).toBe(3_200);
    expect(DRAVOK_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(DRAVOK_DEFENDER_PILOT.sourceBytes).toBe(3_246_060);
    expect(DRAVOK_DEFENDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "dravok-defender")).toMatchObject({
      tribeIndex: 5,
      unitType: "defender",
      candidate: DRAVOK_DEFENDER_PILOT,
    });
  });

  it("keeps Dravok Rider's audited ram model budgeted, review-only and mapped to tribe 5 Rider", () => {
    expect(passesImportedModelPilotBudget(DRAVOK_RIDER_PILOT)).toBe(true);
    expect(DRAVOK_RIDER_PILOT.decision).toBe("review-candidate");
    expect(DRAVOK_RIDER_PILOT.assetId).toBe("asset_1v41P7Exr45acZHqYTrLnUzN");
    expect(DRAVOK_RIDER_PILOT.modelUrl).toBe("/manus-storage/dravok-rider-tripo-p2-v1_296fcc0d.glb");
    expect(DRAVOK_RIDER_PILOT.vertices).toBe(2_766);
    expect(DRAVOK_RIDER_PILOT.triangles).toBe(3_558);
    expect(DRAVOK_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(DRAVOK_RIDER_PILOT.sourceBytes).toBe(2_807_708);
    expect(DRAVOK_RIDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "dravok-rider")).toMatchObject({
      tribeIndex: 5,
      unitType: "rider",
      candidate: DRAVOK_RIDER_PILOT,
    });
  });

  it("keeps Dravok's unique Bulwark GLB budgeted, review-only and distinct from its Defender", () => {
    expect(passesImportedModelPilotBudget(DRAVOK_BULWARK_PILOT)).toBe(true);
    expect(DRAVOK_BULWARK_PILOT.decision).toBe("review-candidate");
    expect(DRAVOK_BULWARK_PILOT.assetId).toBe("asset_7VJKCbNncPof23qfcu8LpsyR");
    expect(DRAVOK_BULWARK_PILOT.modelUrl).toBe("/manus-storage/dravok-bulwark-tripo-p2-v1_17deec7d.glb");
    expect(DRAVOK_BULWARK_PILOT.vertices).toBe(6_381);
    expect(DRAVOK_BULWARK_PILOT.triangles).toBe(5_275);
    expect(DRAVOK_BULWARK_PILOT.runtimePrimitives).toBe(1);
    expect(DRAVOK_BULWARK_PILOT.sourceBytes).toBe(3_310_528);
    expect(DRAVOK_BULWARK_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "dravok-bulwark")).toMatchObject({
      tribeIndex: 5,
      unitType: "bulwark",
      candidate: DRAVOK_BULWARK_PILOT,
    });
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "dravok-defender")?.unitType).toBe("defender");
  });

  it("keeps Vessari Warrior's first-pass GLB opt-in and within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(VESSARI_WARRIOR_PILOT)).toBe(true);
    expect(VESSARI_WARRIOR_PILOT.decision).toBe("review-candidate");
    expect(VESSARI_WARRIOR_PILOT.assetId).toBe("asset_bWQmtZAKzZQNpGRuDv72oTka");
    expect(VESSARI_WARRIOR_PILOT.modelUrl).toBe("/manus-storage/vessari-warrior-tripo-p2-v1_88434b73.glb");
    expect(VESSARI_WARRIOR_PILOT.vertices).toBe(7_376);
    expect(VESSARI_WARRIOR_PILOT.triangles).toBe(5_176);
    expect(VESSARI_WARRIOR_PILOT.runtimePrimitives).toBe(1);
    expect(VESSARI_WARRIOR_PILOT.sourceBytes).toBe(3_035_204);
    expect(VESSARI_WARRIOR_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "vessari-warrior")).toMatchObject({
      tribeIndex: 3,
      unitType: "warrior",
      candidate: VESSARI_WARRIOR_PILOT,
    });
  });

  it("keeps Vessari Archer's first-pass GLB opt-in, budgeted and mapped to the Archer role", () => {
    expect(passesImportedModelPilotBudget(VESSARI_ARCHER_PILOT)).toBe(true);
    expect(VESSARI_ARCHER_PILOT.decision).toBe("review-candidate");
    expect(VESSARI_ARCHER_PILOT.assetId).toBe("asset_TBuK3UTJKU9ztSs3T1EiWL9v");
    expect(VESSARI_ARCHER_PILOT.modelUrl).toBe("/manus-storage/vessari-archer-tripo-p2-v1_a629c752.glb");
    expect(VESSARI_ARCHER_PILOT.vertices).toBe(6_630);
    expect(VESSARI_ARCHER_PILOT.triangles).toBe(4_627);
    expect(VESSARI_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(VESSARI_ARCHER_PILOT.sourceBytes).toBe(3_340_612);
    expect(VESSARI_ARCHER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "vessari-archer")).toMatchObject({
      tribeIndex: 3,
      unitType: "archer",
      candidate: VESSARI_ARCHER_PILOT,
    });
  });

  it("keeps Vessari Defender's audited shield model opt-in and mapped to the Defender role", () => {
    expect(passesImportedModelPilotBudget(VESSARI_DEFENDER_PILOT)).toBe(true);
    expect(VESSARI_DEFENDER_PILOT.decision).toBe("review-candidate");
    expect(VESSARI_DEFENDER_PILOT.assetId).toBe("asset_2YedqmFoW12sJYZtTFCzWdL6");
    expect(VESSARI_DEFENDER_PILOT.modelUrl).toBe("/manus-storage/vessari-defender-tripo-p2-v1_333cf8da.glb");
    expect(VESSARI_DEFENDER_PILOT.vertices).toBe(6_891);
    expect(VESSARI_DEFENDER_PILOT.triangles).toBe(4_878);
    expect(VESSARI_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(VESSARI_DEFENDER_PILOT.sourceBytes).toBe(3_163_676);
    expect(VESSARI_DEFENDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "vessari-defender")).toMatchObject({
      tribeIndex: 3,
      unitType: "defender",
      candidate: VESSARI_DEFENDER_PILOT,
    });
  });

  it("keeps Vessari Rider's audited mounted model budgeted, review-only and mapped to tribe 3 Rider", () => {
    expect(passesImportedModelPilotBudget(VESSARI_RIDER_PILOT)).toBe(true);
    expect(VESSARI_RIDER_PILOT.decision).toBe("review-candidate");
    expect(VESSARI_RIDER_PILOT.assetId).toBe("asset_uM254DMFypPTGURMtnCJEWfj");
    expect(VESSARI_RIDER_PILOT.modelUrl).toBe("/manus-storage/vessari-rider-tripo-p2-v1_d1b5684e.glb");
    expect(VESSARI_RIDER_PILOT.vertices).toBe(8_071);
    expect(VESSARI_RIDER_PILOT.triangles).toBe(5_303);
    expect(VESSARI_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(VESSARI_RIDER_PILOT.sourceBytes).toBe(3_519_888);
    expect(VESSARI_RIDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "vessari-rider")).toMatchObject({
      tribeIndex: 3,
      unitType: "rider",
      candidate: VESSARI_RIDER_PILOT,
    });
  });

  it("keeps Vessari's unique mounted Raider budgeted, review-only and distinct from Rider", () => {
    expect(passesImportedModelPilotBudget(VESSARI_RAIDER_PILOT)).toBe(true);
    expect(VESSARI_RAIDER_PILOT.decision).toBe("review-candidate");
    expect(VESSARI_RAIDER_PILOT.assetId).toBe("asset_AqYTZ4dcJfBSoTPyDv5ejHAR");
    expect(VESSARI_RAIDER_PILOT.modelUrl).toBe("/manus-storage/vessari-raider-tripo-p2-v1_1999984e.glb");
    expect(VESSARI_RAIDER_PILOT.vertices).toBe(8_721);
    expect(VESSARI_RAIDER_PILOT.triangles).toBe(5_466);
    expect(VESSARI_RAIDER_PILOT.runtimePrimitives).toBe(1);
    expect(VESSARI_RAIDER_PILOT.sourceBytes).toBe(3_510_336);
    expect(VESSARI_RAIDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "vessari-raider")).toMatchObject({
      tribeIndex: 3,
      unitType: "raider",
      candidate: VESSARI_RAIDER_PILOT,
    });
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "vessari-rider")?.unitType).toBe("rider");
  });

  it("keeps Valkyra Warrior's first-pass GLB opt-in and within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(VALKYRA_WARRIOR_PILOT)).toBe(true);
    expect(VALKYRA_WARRIOR_PILOT.decision).toBe("review-candidate");
    expect(VALKYRA_WARRIOR_PILOT.assetId).toBe("asset_FWzXYDdh2CP2CN4zBJo7UmJe");
    expect(VALKYRA_WARRIOR_PILOT.modelUrl).toBe("/manus-storage/valkyra-warrior-tripo-p2-v1_051262b9.glb");
    expect(VALKYRA_WARRIOR_PILOT.vertices).toBe(3_652);
    expect(VALKYRA_WARRIOR_PILOT.triangles).toBe(4_612);
    expect(VALKYRA_WARRIOR_PILOT.runtimePrimitives).toBe(1);
    expect(VALKYRA_WARRIOR_PILOT.sourceBytes).toBe(3_039_560);
    expect(VALKYRA_WARRIOR_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "valkyra-warrior")).toMatchObject({
      tribeIndex: 6,
      unitType: "warrior",
      candidate: VALKYRA_WARRIOR_PILOT,
    });
  });

  it("keeps Valkyra Archer's first-pass GLB review-only and within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(VALKYRA_ARCHER_PILOT)).toBe(true);
    expect(VALKYRA_ARCHER_PILOT.decision).toBe("review-candidate");
    expect(VALKYRA_ARCHER_PILOT.assetId).toBe("asset_w7FQvv7yUNsXbzRtg1rAzWV4");
    expect(VALKYRA_ARCHER_PILOT.modelUrl).toBe("/manus-storage/valkyra-archer-tripo-p2-v1_616c7c8e.glb");
    expect(VALKYRA_ARCHER_PILOT.vertices).toBe(6_212);
    expect(VALKYRA_ARCHER_PILOT.triangles).toBe(4_639);
    expect(VALKYRA_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(VALKYRA_ARCHER_PILOT.sourceBytes).toBe(3_068_676);
    expect(VALKYRA_ARCHER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "valkyra-archer")).toMatchObject({
      tribeIndex: 6,
      unitType: "archer",
      candidate: VALKYRA_ARCHER_PILOT,
    });
  });

  it("keeps Valkyra Defender's audited shield model budgeted and strictly opt-in", () => {
    expect(passesImportedModelPilotBudget(VALKYRA_DEFENDER_PILOT)).toBe(true);
    expect(VALKYRA_DEFENDER_PILOT.decision).toBe("review-candidate");
    expect(VALKYRA_DEFENDER_PILOT.assetId).toBe("asset_D3DLdcPWMhHRRq8T1PxunKWd");
    expect(VALKYRA_DEFENDER_PILOT.modelUrl).toBe("/manus-storage/valkyra-defender-tripo-p2-v1_02d56868.glb");
    expect(VALKYRA_DEFENDER_PILOT.vertices).toBe(6_391);
    expect(VALKYRA_DEFENDER_PILOT.triangles).toBe(4_655);
    expect(VALKYRA_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(VALKYRA_DEFENDER_PILOT.sourceBytes).toBe(3_652_184);
    expect(VALKYRA_DEFENDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "valkyra-defender")).toMatchObject({
      tribeIndex: 6,
      unitType: "defender",
      candidate: VALKYRA_DEFENDER_PILOT,
    });
  });

  it("keeps Valkyra Rider's audited ram mount budgeted, review-only and mapped to tribe 6 Rider", () => {
    expect(passesImportedModelPilotBudget(VALKYRA_RIDER_PILOT)).toBe(true);
    expect(VALKYRA_RIDER_PILOT.decision).toBe("review-candidate");
    expect(VALKYRA_RIDER_PILOT.assetId).toBe("asset_y2kpW68gPiYkmmmwGpUkrZtg");
    expect(VALKYRA_RIDER_PILOT.modelUrl).toBe("/manus-storage/valkyra-rider-tripo-p2-v1_16fb5bf0.glb");
    expect(VALKYRA_RIDER_PILOT.vertices).toBe(7_791);
    expect(VALKYRA_RIDER_PILOT.triangles).toBe(4_937);
    expect(VALKYRA_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(VALKYRA_RIDER_PILOT.sourceBytes).toBe(3_377_620);
    expect(VALKYRA_RIDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "valkyra-rider")).toMatchObject({
      tribeIndex: 6,
      unitType: "rider",
      candidate: VALKYRA_RIDER_PILOT,
    });
  });

  it("keeps Mycelon Warrior's first-pass GLB opt-in and within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(MYCELON_WARRIOR_PILOT)).toBe(true);
    expect(MYCELON_WARRIOR_PILOT.decision).toBe("review-candidate");
    expect(MYCELON_WARRIOR_PILOT.assetId).toBe("asset_xvpEHJBy5FW2BPCKRjh1QapM");
    expect(MYCELON_WARRIOR_PILOT.modelUrl).toBe("/manus-storage/mycelon-warrior-tripo-p2-v1_786024e4.glb");
    expect(MYCELON_WARRIOR_PILOT.vertices).toBe(3_523);
    expect(MYCELON_WARRIOR_PILOT.triangles).toBe(4_518);
    expect(MYCELON_WARRIOR_PILOT.runtimePrimitives).toBe(1);
    expect(MYCELON_WARRIOR_PILOT.sourceBytes).toBe(2_504_068);
    expect(MYCELON_WARRIOR_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "mycelon-warrior")).toMatchObject({
      tribeIndex: 7,
      unitType: "warrior",
      candidate: MYCELON_WARRIOR_PILOT,
    });
  });

  it("keeps Mycelon Archer's first-pass GLB review-only, budgeted and mapped to the bow role", () => {
    expect(passesImportedModelPilotBudget(MYCELON_ARCHER_PILOT)).toBe(true);
    expect(MYCELON_ARCHER_PILOT.decision).toBe("review-candidate");
    expect(MYCELON_ARCHER_PILOT.assetId).toBe("asset_QXDWHvq8529Q9MEc6u6Marsb");
    expect(MYCELON_ARCHER_PILOT.modelUrl).toBe("/manus-storage/mycelon-archer-tripo-p2-v1_8fa3590e.glb");
    expect(MYCELON_ARCHER_PILOT.vertices).toBe(6_249);
    expect(MYCELON_ARCHER_PILOT.triangles).toBe(4_336);
    expect(MYCELON_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(MYCELON_ARCHER_PILOT.sourceBytes).toBe(3_452_104);
    expect(MYCELON_ARCHER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "mycelon-archer")).toMatchObject({
      tribeIndex: 7,
      unitType: "archer",
      candidate: MYCELON_ARCHER_PILOT,
    });
  });

  it("keeps Mycelon Defender's audited spore-shield GLB review-only and mapped to tribe 7 Defender", () => {
    expect(passesImportedModelPilotBudget(MYCELON_DEFENDER_PILOT)).toBe(true);
    expect(MYCELON_DEFENDER_PILOT.decision).toBe("review-candidate");
    expect(MYCELON_DEFENDER_PILOT.assetId).toBe("asset_rDVB52yVEAHL2D473tqdi56L");
    expect(MYCELON_DEFENDER_PILOT.modelUrl).toBe("/manus-storage/mycelon-defender-tripo-p2-v1_225e0a80.glb");
    expect(MYCELON_DEFENDER_PILOT.vertices).toBe(6_443);
    expect(MYCELON_DEFENDER_PILOT.triangles).toBe(4_968);
    expect(MYCELON_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(MYCELON_DEFENDER_PILOT.sourceBytes).toBe(3_056_332);
    expect(MYCELON_DEFENDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "mycelon-defender")).toMatchObject({
      tribeIndex: 7,
      unitType: "defender",
      candidate: MYCELON_DEFENDER_PILOT,
    });
  });

  it("keeps Mycelon Rider's audited beetle budgeted, review-only and mapped to tribe 7 Rider", () => {
    expect(passesImportedModelPilotBudget(MYCELON_RIDER_PILOT)).toBe(true);
    expect(MYCELON_RIDER_PILOT.decision).toBe("review-candidate");
    expect(MYCELON_RIDER_PILOT.assetId).toBe("asset_tk6JQ9todKh6wYoQc6BfkYW7");
    expect(MYCELON_RIDER_PILOT.modelUrl).toBe("/manus-storage/mycelon-rider-tripo-p2-v1_2190494a.glb");
    expect(MYCELON_RIDER_PILOT.vertices).toBe(6_948);
    expect(MYCELON_RIDER_PILOT.triangles).toBe(4_853);
    expect(MYCELON_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(MYCELON_RIDER_PILOT.sourceBytes).toBe(3_294_512);
    expect(MYCELON_RIDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "mycelon-rider")).toMatchObject({
      tribeIndex: 7,
      unitType: "rider",
      candidate: MYCELON_RIDER_PILOT,
    });
  });

  it("keeps Sunwei Warrior's first-pass GLB opt-in and within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(SUNWEI_WARRIOR_PILOT)).toBe(true);
    expect(SUNWEI_WARRIOR_PILOT.decision).toBe("review-candidate");
    expect(SUNWEI_WARRIOR_PILOT.assetId).toBe("asset_pef1PPu7X8gmcLFEeifiXhq8");
    expect(SUNWEI_WARRIOR_PILOT.modelUrl).toBe("/manus-storage/sunwei-warrior-tripo-p2-v1_af991702.glb");
    expect(SUNWEI_WARRIOR_PILOT.vertices).toBe(7_259);
    expect(SUNWEI_WARRIOR_PILOT.triangles).toBe(4_858);
    expect(SUNWEI_WARRIOR_PILOT.runtimePrimitives).toBe(1);
    expect(SUNWEI_WARRIOR_PILOT.sourceBytes).toBe(3_171_352);
    expect(SUNWEI_WARRIOR_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "sunwei-warrior")).toMatchObject({
      tribeIndex: 2,
      unitType: "warrior",
      candidate: SUNWEI_WARRIOR_PILOT,
    });
  });

  it("keeps Sunwei Archer's first-pass GLB review-only, budgeted and mapped to the bow role", () => {
    expect(passesImportedModelPilotBudget(SUNWEI_ARCHER_PILOT)).toBe(true);
    expect(SUNWEI_ARCHER_PILOT.decision).toBe("review-candidate");
    expect(SUNWEI_ARCHER_PILOT.assetId).toBe("asset_pCbHBgedxLF7KxE8gPsHrseU");
    expect(SUNWEI_ARCHER_PILOT.modelUrl).toBe("/manus-storage/sunwei-archer-tripo-p2-v1_580bcfff.glb");
    expect(SUNWEI_ARCHER_PILOT.vertices).toBe(7_661);
    expect(SUNWEI_ARCHER_PILOT.triangles).toBe(5_006);
    expect(SUNWEI_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(SUNWEI_ARCHER_PILOT.sourceBytes).toBe(2_811_944);
    expect(SUNWEI_ARCHER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "sunwei-archer")).toMatchObject({
      tribeIndex: 2,
      unitType: "archer",
      candidate: SUNWEI_ARCHER_PILOT,
    });
  });

  it("keeps Sunwei Defender's audited shield model review-only and mapped to Defender", () => {
    expect(passesImportedModelPilotBudget(SUNWEI_DEFENDER_PILOT)).toBe(true);
    expect(SUNWEI_DEFENDER_PILOT.decision).toBe("review-candidate");
    expect(SUNWEI_DEFENDER_PILOT.assetId).toBe("asset_qPrvb3YcC2sD4MzhYV5BV4Hs");
    expect(SUNWEI_DEFENDER_PILOT.modelUrl).toBe("/manus-storage/sunwei-defender-tripo-p2-v1_e386fdc1.glb");
    expect(SUNWEI_DEFENDER_PILOT.vertices).toBe(7_163);
    expect(SUNWEI_DEFENDER_PILOT.triangles).toBe(4_551);
    expect(SUNWEI_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(SUNWEI_DEFENDER_PILOT.sourceBytes).toBe(3_072_148);
    expect(SUNWEI_DEFENDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "sunwei-defender")).toMatchObject({
      tribeIndex: 2,
      unitType: "defender",
      candidate: SUNWEI_DEFENDER_PILOT,
    });
  });

  it("keeps Sunwei Rider's audited pack mount budgeted, review-only and mapped to tribe 2 Rider", () => {
    expect(passesImportedModelPilotBudget(SUNWEI_RIDER_PILOT)).toBe(true);
    expect(SUNWEI_RIDER_PILOT.decision).toBe("review-candidate");
    expect(SUNWEI_RIDER_PILOT.assetId).toBe("asset_LspM7h5PKh5maxNp8kUH7y8R");
    expect(SUNWEI_RIDER_PILOT.modelUrl).toBe("/manus-storage/sunwei-rider-tripo-p2-v1_ccc4c855.glb");
    expect(SUNWEI_RIDER_PILOT.vertices).toBe(8_017);
    expect(SUNWEI_RIDER_PILOT.triangles).toBe(5_294);
    expect(SUNWEI_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(SUNWEI_RIDER_PILOT.sourceBytes).toBe(3_600_564);
    expect(SUNWEI_RIDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "sunwei-rider")).toMatchObject({
      tribeIndex: 2,
      unitType: "rider",
      candidate: SUNWEI_RIDER_PILOT,
    });
  });

  it("keeps Sunwei Sunwarden's audited GLB budgeted, opt-in and mapped to tribe 2 Warden", () => {
    expect(passesImportedModelPilotBudget(SUNWEI_SUNWARDEN_PILOT)).toBe(true);
    expect(SUNWEI_SUNWARDEN_PILOT.decision).toBe("review-candidate");
    expect(SUNWEI_SUNWARDEN_PILOT.assetId).toBe("asset_Bm98ibq6UYW9UMSsmwJznFgQ");
    expect(SUNWEI_SUNWARDEN_PILOT.modelUrl).toBe("/manus-storage/sunwei-sunwarden-tripo-p2-v1_53de92df.glb");
    expect(SUNWEI_SUNWARDEN_PILOT.vertices).toBe(7_766);
    expect(SUNWEI_SUNWARDEN_PILOT.triangles).toBe(5_008);
    expect(SUNWEI_SUNWARDEN_PILOT.runtimePrimitives).toBe(1);
    expect(SUNWEI_SUNWARDEN_PILOT.sourceBytes).toBe(3_852_780);
    expect(SUNWEI_SUNWARDEN_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "sunwei-sunwarden")).toMatchObject({
      tribeIndex: 2,
      unitType: "warden",
      candidate: SUNWEI_SUNWARDEN_PILOT,
    });
  });

  it("keeps Kharzul Warrior's repaired-view GLB review-only and within the mobile budget", () => {
    expect(passesImportedModelPilotBudget(KHARZUL_WARRIOR_PILOT)).toBe(true);
    expect(KHARZUL_WARRIOR_PILOT.decision).toBe("review-candidate");
    expect(KHARZUL_WARRIOR_PILOT.assetId).toBe("asset_dbYL3ACetv23YrHQ8NProoWX");
    expect(KHARZUL_WARRIOR_PILOT.modelUrl).toBe("/manus-storage/kharzul-warrior-tripo-p2-v1_0dfbcc82.glb");
    expect(KHARZUL_WARRIOR_PILOT.vertices).toBe(6_526);
    expect(KHARZUL_WARRIOR_PILOT.triangles).toBe(4_411);
    expect(KHARZUL_WARRIOR_PILOT.runtimePrimitives).toBe(1);
    expect(KHARZUL_WARRIOR_PILOT.sourceBytes).toBe(3_368_484);
    expect(KHARZUL_WARRIOR_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "kharzul-warrior")).toMatchObject({
      tribeIndex: 1,
      unitType: "warrior",
      candidate: KHARZUL_WARRIOR_PILOT,
    });
  });

  it("keeps Kharzul Archer's short-crest model budgeted and query-gated for the correct role", () => {
    expect(passesImportedModelPilotBudget(KHARZUL_ARCHER_PILOT)).toBe(true);
    expect(KHARZUL_ARCHER_PILOT.decision).toBe("review-candidate");
    expect(KHARZUL_ARCHER_PILOT.assetId).toBe("asset_gFTUWnhneufVBjVATNDdcWWU");
    expect(KHARZUL_ARCHER_PILOT.modelUrl).toBe("/manus-storage/kharzul-archer-tripo-p2-v1_8ff6d78c.glb");
    expect(KHARZUL_ARCHER_PILOT.vertices).toBe(7_103);
    expect(KHARZUL_ARCHER_PILOT.triangles).toBe(4_772);
    expect(KHARZUL_ARCHER_PILOT.runtimePrimitives).toBe(1);
    expect(KHARZUL_ARCHER_PILOT.sourceBytes).toBe(3_330_404);
    expect(KHARZUL_ARCHER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "kharzul-archer")).toMatchObject({
      tribeIndex: 1,
      unitType: "archer",
      candidate: KHARZUL_ARCHER_PILOT,
    });
  });

  it("keeps Kharzul Defender's audited shield model budgeted, review-only and mapped to tribe 1 Defender", () => {
    expect(passesImportedModelPilotBudget(KHARZUL_DEFENDER_PILOT)).toBe(true);
    expect(KHARZUL_DEFENDER_PILOT.decision).toBe("review-candidate");
    expect(KHARZUL_DEFENDER_PILOT.assetId).toBe("asset_R2vBuw2Z4atCcgmt6aBsVKPw");
    expect(KHARZUL_DEFENDER_PILOT.modelUrl).toBe("/manus-storage/kharzul-defender-tripo-p2-v1_15e05ad1.glb");
    expect(KHARZUL_DEFENDER_PILOT.vertices).toBe(3_746);
    expect(KHARZUL_DEFENDER_PILOT.triangles).toBe(4_842);
    expect(KHARZUL_DEFENDER_PILOT.runtimePrimitives).toBe(1);
    expect(KHARZUL_DEFENDER_PILOT.sourceBytes).toBe(2_881_528);
    expect(KHARZUL_DEFENDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "kharzul-defender")).toMatchObject({
      tribeIndex: 1,
      unitType: "defender",
      candidate: KHARZUL_DEFENDER_PILOT,
    });
  });

  it("keeps Kharzul Rider's audited boar model budgeted, review-only and mapped to tribe 1 Rider", () => {
    expect(passesImportedModelPilotBudget(KHARZUL_RIDER_PILOT)).toBe(true);
    expect(KHARZUL_RIDER_PILOT.decision).toBe("review-candidate");
    expect(KHARZUL_RIDER_PILOT.assetId).toBe("asset_hru9LsudGhfU6FJk2ZzU2koe");
    expect(KHARZUL_RIDER_PILOT.modelUrl).toBe("/manus-storage/kharzul-rider-tripo-p2-v1_2b25fb34.glb");
    expect(KHARZUL_RIDER_PILOT.vertices).toBe(7_327);
    expect(KHARZUL_RIDER_PILOT.triangles).toBe(4_889);
    expect(KHARZUL_RIDER_PILOT.runtimePrimitives).toBe(1);
    expect(KHARZUL_RIDER_PILOT.sourceBytes).toBe(3_616_972);
    expect(KHARZUL_RIDER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "kharzul-rider")).toMatchObject({
      tribeIndex: 1,
      unitType: "rider",
      candidate: KHARZUL_RIDER_PILOT,
    });
  });

  it("keeps Kharzul Berserker's dual-axe GLB budgeted, review-only and mapped only to tribe 1 Berserker", () => {
    expect(passesImportedModelPilotBudget(KHARZUL_BERSERKER_PILOT)).toBe(true);
    expect(KHARZUL_BERSERKER_PILOT.decision).toBe("review-candidate");
    expect(KHARZUL_BERSERKER_PILOT.assetId).toBe("asset_Dq81oqMB2WMgcBSVTHS77qVT");
    expect(KHARZUL_BERSERKER_PILOT.modelUrl).toBe("/manus-storage/kharzul-berserker-tripo-p2-v1_dac5bf8a.glb");
    expect(KHARZUL_BERSERKER_PILOT.vertices).toBe(7_036);
    expect(KHARZUL_BERSERKER_PILOT.triangles).toBe(4_596);
    expect(KHARZUL_BERSERKER_PILOT.runtimePrimitives).toBe(1);
    expect(KHARZUL_BERSERKER_PILOT.sourceBytes).toBe(3_623_140);
    expect(KHARZUL_BERSERKER_PILOT.textureResolution).toBe(2_048);
    expect(CROSS_TRIBE_P2_PILOTS.find(p => p.slug === "kharzul-berserker")).toMatchObject({
      tribeIndex: 1,
      unitType: "berserker",
      candidate: KHARZUL_BERSERKER_PILOT,
    });
  });

  it("keeps every cross-tribe pilot unique, budgeted and review-only", () => {
    const slugs = CROSS_TRIBE_P2_PILOTS.map(pilot => pilot.slug);
    const roles = CROSS_TRIBE_P2_PILOTS.map(pilot => `${pilot.tribeIndex}:${pilot.unitType}`);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(roles).size).toBe(roles.length);
    for (const pilot of CROSS_TRIBE_P2_PILOTS) {
      expect(pilot.slug).toMatch(/^[a-z]+-[a-z]+$/);
      expect(pilot.tribeIndex).toBeGreaterThanOrEqual(0);
      expect(pilot.tribeIndex).toBeLessThanOrEqual(7);
      expect(pilot.tribeIndex).not.toBe(4);
      expect(pilot.candidate.decision).toBe("review-candidate");
      expect(passesImportedModelPilotBudget(pilot.candidate)).toBe(true);
    }
    expect(CROSS_TRIBE_P2_PILOTS[0]?.candidate).toBe(AUREN_WARRIOR_PILOT);
  });

  it("rejects candidates that exceed the triangle budget", () => {
    const oversized: ImportedModelCandidate = {
      ...NERIVANE_WARRIOR_PILOT,
      triangles: IMPORTED_MODEL_PILOT_LIMITS.maxTriangles + 1,
    };
    expect(passesImportedModelPilotBudget(oversized)).toBe(false);
  });

  it("rejects repository-relative binary paths so large media stays out of the web bundle", () => {
    const bundled: ImportedModelCandidate = {
      ...NERIVANE_WARRIOR_PILOT,
      modelUrl: "/models/nerivane-warrior.glb",
    };
    expect(passesImportedModelPilotBudget(bundled)).toBe(false);
  });
});
