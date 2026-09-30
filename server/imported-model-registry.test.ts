import { describe, expect, it } from "vitest";
import {
  IMPORTED_MODEL_PILOT_LIMITS,
  NERIVANE_ARCHER_PILOT,
  NERIVANE_DEFENDER_PILOT,
  NERIVANE_RIDER_AQUATIC_V2,
  NERIVANE_RIDER_PILOT,
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
