import { describe, expect, it } from "vitest";
import {
  AUREN_ARCHER_PILOT,
  AUREN_WARRIOR_PILOT,
  CROSS_TRIBE_P2_PILOTS,
  IMPORTED_MODEL_PILOT_LIMITS,
  NERIVANE_ARCHER_PILOT,
  NERIVANE_DEFENDER_PILOT,
  NERIVANE_RIDER_AQUATIC_V2,
  NERIVANE_RIDER_PILOT,
  NERIVANE_TIDECALLER_PILOT,
  NERIVANE_NERETH_PILOT,
  NERIVANE_WARRIOR_GOLDEN_V2,
  NERIVANE_WARRIOR_PILOT,
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
