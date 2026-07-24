// Chapter II — The Reforging: mission definitions, cross-chapter gating, and
// campaign-wide progression. Chapter II ships under the same story.ch1
// entitlement (one purchase = whole campaign).
import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

import { CHAPTER_1, CHAPTER_2, STORY_CHAPTERS, missionById } from "../shared/story";
import {
  chapterUnlocked, markMissionDone, missionUnlocked, nextCampaignMission, nextMission,
} from "../client/src/game/core/story";
import { PRODUCTS } from "../shared/products";

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

const finishChapter1 = () => { for (const m of CHAPTER_1.missions) markMissionDone(m.id); };

describe("Chapter II definitions", () => {
  it("has 5 well-formed, unique, seed-locked missions", () => {
    expect(CHAPTER_2.missions).toHaveLength(5);
    const ids = new Set(CHAPTER_2.missions.map((m) => m.id));
    expect(ids.size).toBe(5);
    CHAPTER_2.missions.forEach((m, i) => {
      expect(m.index).toBe(i);
      expect(m.id).toBe(`ch2-m${i + 1}`);
      expect(m.seed).toBeGreaterThan(0);
      expect(m.intro.length).toBeGreaterThanOrEqual(2);
      expect(m.victoryText.length).toBeGreaterThan(20);
      expect(m.enemies.length).toBeGreaterThan(0);
      // enemy defs must be valid TRIBE_DEFS indices (0..7)
      for (const e of m.enemies) expect(e).toBeGreaterThanOrEqual(0), expect(e).toBeLessThan(8);
    });
    // no seed collisions with Chapter I
    const ch1Seeds = new Set(CHAPTER_1.missions.map((m) => m.seed));
    for (const m of CHAPTER_2.missions) expect(ch1Seeds.has(m.seed)).toBe(false);
  });

  it("is registered and reachable by id", () => {
    expect(STORY_CHAPTERS.map((c) => c.id)).toEqual(["ch1", "ch2"]);
    for (const m of CHAPTER_2.missions) expect(missionById(m.id)?.title).toBe(m.title);
  });

  it("shares the story.ch1 entitlement and a store product sells it", () => {
    expect(CHAPTER_2.entitlementKey).toBe("story.ch1");
    const sellers = PRODUCTS.filter((p) => p.grants.includes(CHAPTER_2.entitlementKey));
    expect(sellers.length).toBeGreaterThanOrEqual(2); // story SKU + ultimate bundle
  });
});

describe("cross-chapter gating", () => {
  it("locks Chapter II until every Chapter I mission is done", () => {
    expect(chapterUnlocked("ch1")).toBe(true);
    expect(chapterUnlocked("ch2")).toBe(false);
    expect(missionUnlocked(CHAPTER_2.missions[0], "ch2")).toBe(false);
    // 4/5 of ch1 isn't enough
    for (const m of CHAPTER_1.missions.slice(0, 4)) markMissionDone(m.id);
    expect(chapterUnlocked("ch2")).toBe(false);
    markMissionDone(CHAPTER_1.missions[4].id);
    expect(chapterUnlocked("ch2")).toBe(true);
    expect(missionUnlocked(CHAPTER_2.missions[0], "ch2")).toBe(true);
    expect(missionUnlocked(CHAPTER_2.missions[1], "ch2")).toBe(false);
  });

  it("advances mission-by-mission inside Chapter II", () => {
    finishChapter1();
    markMissionDone("ch2-m1");
    expect(missionUnlocked(CHAPTER_2.missions[1], "ch2")).toBe(true);
    expect(missionUnlocked(CHAPTER_2.missions[2], "ch2")).toBe(false);
    expect(nextMission("ch2")?.id).toBe("ch2-m2");
  });

  it("nextCampaignMission walks ch1 then ch2 then null", () => {
    expect(nextCampaignMission()?.id).toBe("ch1-m1");
    finishChapter1();
    expect(nextCampaignMission()?.id).toBe("ch2-m1");
    for (const m of CHAPTER_2.missions) markMissionDone(m.id);
    expect(nextCampaignMission()).toBeNull();
  });
});
