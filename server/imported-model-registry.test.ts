import { describe, expect, it } from "vitest";
import {
  IMPORTED_MODEL_PILOT_LIMITS,
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
