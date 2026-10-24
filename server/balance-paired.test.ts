import { describe, expect, it } from "vitest";
import {
  balancedFourTribeFamilies,
  buildPairedScenarioMatrix,
  installScopedHeadlessRuntime,
  remapRoster,
} from "../scripts/lib/balancePaired";

describe("paired balance audit scenario matrix", () => {
  it("covers the eight current definitions in two balanced four-tribe rosters", () => {
    expect(balancedFourTribeFamilies(8)).toEqual([
      { id: "roster-01", originalRoster: [0, 1, 2, 3] },
      { id: "roster-02", originalRoster: [4, 5, 6, 7] },
    ]);
  });

  it("creates the default 160-run matrix with ten seeded paired blocks", () => {
    const matrix = buildPairedScenarioMatrix({
      seedBase: 6_707_978,
      blocks: 10,
      presets: ["continents", "archipelago"],
      rosterFamilies: balancedFourTribeFamilies(8),
    });

    expect(matrix).toHaveLength(160);
    expect(new Set(matrix.map(scenario => scenario.id)).size).toBe(160);
    expect(
      matrix.filter(scenario => scenario.preset === "continents")
    ).toHaveLength(80);
    expect(
      matrix.filter(scenario => scenario.preset === "archipelago")
    ).toHaveLength(80);
    expect(matrix.map(scenario => scenario.worldSeed)).toContain(6_707_978);
    expect(matrix.map(scenario => scenario.worldSeed)).toContain(6_707_987);
  });

  it("uses the same fresh-world/random seed while every roster member visits every nominal seat", () => {
    const [family] = balancedFourTribeFamilies(8);
    const matrix = buildPairedScenarioMatrix({
      seedBase: 42,
      blocks: 1,
      presets: ["continents"],
      rosterFamilies: [family],
    });

    expect(matrix).toHaveLength(4);
    expect(new Set(matrix.map(scenario => scenario.worldSeed))).toEqual(
      new Set([42])
    );
    expect(new Set(matrix.map(scenario => scenario.randomSeed))).toEqual(
      new Set([42])
    );
    expect(matrix.map(scenario => scenario.rosterRemappedIndices)).toEqual([
      [0, 1, 2, 3],
      [1, 2, 3, 0],
      [2, 3, 0, 1],
      [3, 0, 1, 2],
    ]);
    for (const definitionIndex of family.originalRoster) {
      const seats = matrix.map(scenario =>
        scenario.rosterRemappedIndices.indexOf(definitionIndex)
      );
      expect(seats.sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it("rejects roster configurations that would silently omit a tribe", () => {
    expect(() => balancedFourTribeFamilies(6)).toThrow(/refusing to omit/i);
    expect(() => remapRoster([0, 1, 1, 3], 0)).toThrow(/unique/i);
  });
});

describe("paired balance audit headless runtime", () => {
  it("restores Math.random and patched globals after deterministic timer use", () => {
    const originalRandom = Math.random;
    const originalTimeout = globalThis.setTimeout;
    const hadWindow = Object.prototype.hasOwnProperty.call(
      globalThis,
      "window"
    );
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const hadStorage = Object.prototype.hasOwnProperty.call(
      globalThis,
      "localStorage"
    );
    const originalStorage = (globalThis as Record<string, unknown>)
      .localStorage;
    const runtime = installScopedHeadlessRuntime();

    try {
      runtime.setRandomSeed(1234);
      const first = Math.random();
      runtime.setRandomSeed(1234);
      expect(Math.random()).toBe(first);
      let ran = false;
      setTimeout(() => {
        ran = true;
      }, 1);
      expect(ran).toBe(false);
      expect(runtime.pending).toHaveLength(1);
      runtime.pending.shift()!();
      expect(ran).toBe(true);
      globalThis.localStorage.setItem("paired-audit", "ok");
      expect(globalThis.localStorage.getItem("paired-audit")).toBe("ok");
    } finally {
      runtime.restore();
    }

    expect(Math.random).toBe(originalRandom);
    expect(globalThis.setTimeout).toBe(originalTimeout);
    expect(Object.prototype.hasOwnProperty.call(globalThis, "window")).toBe(
      hadWindow
    );
    expect((globalThis as Record<string, unknown>).window).toBe(originalWindow);
    expect(
      Object.prototype.hasOwnProperty.call(globalThis, "localStorage")
    ).toBe(hadStorage);
    expect((globalThis as Record<string, unknown>).localStorage).toBe(
      originalStorage
    );
  });
});
