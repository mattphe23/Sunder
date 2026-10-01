import { describe, expect, it } from "vitest";
import {
  AUREN_ARCANIST_PILOT,
  AUREN_ARCHER_PILOT,
  AUREN_DEFENDER_PILOT,
  AUREN_MAELIS_PILOT,
  AUREN_RIDER_PILOT,
  AUREN_WARRIOR_PILOT,
  CROSS_TRIBE_P2_PILOTS,
  DRAVOK_WARRIOR_PILOT,
  IMPORTED_MODEL_PILOT_LIMITS,
  MYCELON_WARRIOR_PILOT,
  NERIVANE_ARCHER_PILOT,
  NERIVANE_DEFENDER_PILOT,
  NERIVANE_RIDER_AQUATIC_V2,
  NERIVANE_RIDER_PILOT,
  NERIVANE_TIDECALLER_PILOT,
  NERIVANE_NERETH_PILOT,
  NERIVANE_WARRIOR_GOLDEN_V2,
  NERIVANE_WARRIOR_PILOT,
  SUNWEI_WARRIOR_PILOT,
  VALKYRA_WARRIOR_PILOT,
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
