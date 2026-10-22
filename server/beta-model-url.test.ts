import { describe, expect, it } from "vitest";
import {
  BETA_MODEL_PUBLIC_ORIGIN,
  resolveBetaModelUrl,
} from "../client/src/game/render/betaModelUrl";

const modelPath = "/manus-storage/nerivane-warrior-tripo-p2-v1_a1ae73c5.glb";

describe("resolveBetaModelUrl", () => {
  it("keeps canonical model paths relative on the web", () => {
    expect(resolveBetaModelUrl(modelPath, false)).toBe(modelPath);
  });

  it("uses only the explicit allow-listed public proxy for Capacitor", () => {
    expect(resolveBetaModelUrl(modelPath, true, BETA_MODEL_PUBLIC_ORIGIN)).toBe(
      `${BETA_MODEL_PUBLIC_ORIGIN}${modelPath}`,
    );
    expect(resolveBetaModelUrl(modelPath, true, `${BETA_MODEL_PUBLIC_ORIGIN}/`)).toBe(
      `${BETA_MODEL_PUBLIC_ORIGIN}${modelPath}`,
    );
  });

  it("does not permit path traversal, query injection, arbitrary hosts, or non-GLB assets", () => {
    for (const unsafePath of [
      "https://attacker.invalid/model.glb",
      "/manus-storage/../../escape.glb",
      "/manus-storage/model.glb?next=https://attacker.invalid",
      "/manus-storage/model.GLb",
      "/other-storage/model.glb",
      "/manus-storage/model.png",
    ]) {
      expect(() => resolveBetaModelUrl(unsafePath, true)).toThrow("canonical");
    }
    expect(() => resolveBetaModelUrl(modelPath, true, "https://attacker.invalid")).toThrow(
      "allow-listed",
    );
    expect(() => resolveBetaModelUrl(modelPath, true, "not a URL")).toThrow("valid HTTPS");
  });
});
