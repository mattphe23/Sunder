// Story Mode — Chapter I validity and campaign-layer behavior.
import { describe, expect, it, beforeEach } from "vitest";
import { CHAPTER_1, STORY_CHAPTERS, missionById } from "../shared/story";
import { PRODUCTS } from "../shared/products";
import { TRIBE_DEFS } from "../client/src/game/core/types";
import { generateMap } from "../client/src/game/core/mapgen";
import { game } from "../client/src/game/core/state";
import {
  loadStoryProgress, markMissionDone, missionUnlocked, nextMission, evaluateMission,
} from "../client/src/game/core/story";

// jsdom-less localStorage shim for the progress layer
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

beforeEach(() => store.clear());

describe("Chapter I mission scripts", () => {
  it("has five ordered missions with unique ids and valid enemy defs", () => {
    expect(CHAPTER_1.missions).toHaveLength(5);
    const ids = new Set(CHAPTER_1.missions.map((m) => m.id));
    expect(ids.size).toBe(5);
    CHAPTER_1.missions.forEach((m, i) => {
      expect(m.index).toBe(i);
      expect(m.enemies.length).toBeGreaterThanOrEqual(1);
      expect(m.enemies.length).toBeLessThanOrEqual(3);
      for (const d of m.enemies) {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(TRIBE_DEFS.length);
      }
      expect(m.intro.length).toBeGreaterThan(0);
      expect(m.victoryText.length).toBeGreaterThan(10);
    });
  });

  it("every mission's seed-locked board spawns one capital per tribe", () => {
    for (const m of CHAPTER_1.missions) {
      const tribeCount = 1 + m.enemies.length;
      const { cities } = generateMap(m.size, m.seed, tribeCount, m.preset);
      const capitals = cities.filter((c) => c.isCapital && c.tribe !== null);
      expect(capitals, `${m.id} capitals`).toHaveLength(tribeCount);
    }
  });

  it("missionById resolves every chapter mission and rejects unknowns", () => {
    for (const m of CHAPTER_1.missions) expect(missionById(m.id)?.title).toBe(m.title);
    expect(missionById("ch9-m9")).toBeNull();
  });

  it("the finale pits the player against both premium tribes", () => {
    const finale = CHAPTER_1.missions[4];
    expect(finale.enemies).toContain(6);
    expect(finale.enemies).toContain(7);
  });
});

describe("campaign progression", () => {
  it("only mission 1 is unlocked at the start", () => {
    const [m1, m2] = CHAPTER_1.missions;
    expect(missionUnlocked(m1, "ch1")).toBe(true);
    expect(missionUnlocked(m2, "ch1")).toBe(false);
  });

  it("completing missions unlocks the next and advances nextMission", () => {
    markMissionDone("ch1-m1");
    expect(missionUnlocked(CHAPTER_1.missions[1], "ch1")).toBe(true);
    expect(missionUnlocked(CHAPTER_1.missions[2], "ch1")).toBe(false);
    expect(nextMission("ch1")?.id).toBe("ch1-m2");
    expect(loadStoryProgress().done["ch1-m1"]).toBe(true);
  });
});

describe("mission objective evaluation", () => {
  it("domination missions require the human to win", () => {
    const m = CHAPTER_1.missions[0];
    game.newGame({ size: m.size, humanTribe: 0, difficulty: m.difficulty, seed: m.seed, preset: m.preset, roster: [2, ...m.enemies], storyMission: m.id });
    const s = game.state;
    s.phase = "gameover";
    s.winner = s.humanTribe;
    expect(evaluateMission(s)).toBe(true);
    s.winner = 1;
    expect(evaluateMission(s)).toBe(false);
  });

  it("the survive mission passes when the human is alive at the score screen", () => {
    const m = CHAPTER_1.missions[2]; // survive 30 turns
    game.newGame({ size: m.size, humanTribe: 0, difficulty: m.difficulty, seed: m.seed, preset: m.preset, roster: [0, ...m.enemies], storyMission: m.id });
    const s = game.state;
    s.phase = "gameover";
    s.turn = s.maxTurns; // clock ran out
    s.winner = 1; // an enemy leads on score…
    s.tribes[s.humanTribe].alive = true; // …but we survived
    expect(evaluateMission(s)).toBe(true);
    s.tribes[s.humanTribe].alive = false;
    expect(evaluateMission(s)).toBe(false);
  });

  it("non-story games never evaluate as missions", () => {
    game.newGame({ size: 9, humanTribe: 0, difficulty: "easy", seed: 7 });
    const s = game.state;
    s.phase = "gameover";
    s.winner = s.humanTribe;
    expect(evaluateMission(s)).toBe(false);
  });
});

describe("store gating consistency", () => {
  it("chapter 1's entitlement key is sold by a product and by the ultimate pack", () => {
    const sellers = PRODUCTS.filter((p) => p.grants.includes(CHAPTER_1.entitlementKey));
    expect(sellers.length).toBeGreaterThanOrEqual(2);
    expect(sellers.some((p) => p.sku === "bundle_ultimate")).toBe(true);
  });

  it("all story chapters carry entitlement keys", () => {
    for (const ch of STORY_CHAPTERS) expect(ch.entitlementKey).toMatch(/^story\./);
  });
});
