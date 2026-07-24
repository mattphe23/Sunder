// v32 — Star-gated chapter rewards + campaign stats.
// Rewards unlock at 15/15 chapter stars; campaignStats aggregates progress.
import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

import { CHAPTER_1, CHAPTER_2, STORY_CHAPTERS } from "../shared/story";
import {
  CHAPTER_REWARDS, bestTurns, campaignStats, chapterStars, earnedRewards,
  playerTitle, recordMissionStars, rewardEarned,
} from "../client/src/game/core/story";

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

const threeStarChapter = (ch: typeof CHAPTER_1) => {
  for (const m of ch.missions) recordMissionStars(m.id, 3);
};

describe("CHAPTER_REWARDS definitions", () => {
  it("one reward per chapter, requiring all stars, with unique banners/titles", () => {
    expect(CHAPTER_REWARDS.map((r) => r.chapterId)).toEqual(STORY_CHAPTERS.map((c) => c.id));
    for (const r of CHAPTER_REWARDS) {
      const ch = STORY_CHAPTERS.find((c) => c.id === r.chapterId)!;
      expect(r.starsRequired).toBe(ch.missions.length * 3);
      expect(r.banner.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(r.title.length).toBeGreaterThan(2);
    }
    expect(new Set(CHAPTER_REWARDS.map((r) => r.banner.hex)).size).toBe(CHAPTER_REWARDS.length);
    expect(new Set(CHAPTER_REWARDS.map((r) => r.title)).size).toBe(CHAPTER_REWARDS.length);
  });
});

describe("reward gating", () => {
  it("locked with no progress, and with anything short of all 3-stars", () => {
    const r1 = CHAPTER_REWARDS[0];
    expect(rewardEarned(r1)).toBe(false);
    // complete every ch1 mission but one at 3★, last at 2★ → 14/15, still locked
    for (const m of CHAPTER_1.missions.slice(0, -1)) recordMissionStars(m.id, 3);
    recordMissionStars(CHAPTER_1.missions.at(-1)!.id, 2);
    expect(chapterStars("ch1")).toBe(14);
    expect(rewardEarned(r1)).toBe(false);
    expect(earnedRewards()).toEqual([]);
    expect(playerTitle()).toBeNull();
  });

  it("unlocks at 15/15 and improving a run later keeps it unlocked", () => {
    threeStarChapter(CHAPTER_1);
    expect(chapterStars("ch1")).toBe(15);
    expect(rewardEarned(CHAPTER_REWARDS[0])).toBe(true);
    // a later worse run must not downgrade the best rating
    recordMissionStars(CHAPTER_1.missions[0].id, 1);
    expect(rewardEarned(CHAPTER_REWARDS[0])).toBe(true);
  });

  it("ch2 stars never count toward the ch1 reward", () => {
    threeStarChapter(CHAPTER_2);
    expect(chapterStars("ch1")).toBe(0);
    expect(rewardEarned(CHAPTER_REWARDS[0])).toBe(false);
    expect(rewardEarned(CHAPTER_REWARDS[1])).toBe(true);
  });

  it("playerTitle picks the highest-chapter earned title", () => {
    threeStarChapter(CHAPTER_1);
    expect(playerTitle()).toBe(CHAPTER_REWARDS[0].title);
    threeStarChapter(CHAPTER_2);
    expect(playerTitle()).toBe(CHAPTER_REWARDS[1].title);
    expect(earnedRewards()).toHaveLength(2);
  });
});

describe("best turns tracking", () => {
  it("keeps the fewest winning turns across runs and ignores invalid values", () => {
    const id = CHAPTER_1.missions[0].id;
    expect(bestTurns(id)).toBeNull();
    recordMissionStars(id, 2, 12);
    expect(bestTurns(id)).toBe(12);
    recordMissionStars(id, 3, 18); // slower run, better stars — turns stay 12
    expect(bestTurns(id)).toBe(12);
    recordMissionStars(id, 1, 9); // faster run, worse stars — turns improve
    expect(bestTurns(id)).toBe(9);
    recordMissionStars(id, 1, 0); // zero/absent turns are ignored
    expect(bestTurns(id)).toBe(9);
  });
});

describe("campaignStats", () => {
  it("aggregates missions, stars, turns, fastest, and per-chapter rows", () => {
    recordMissionStars("ch1-m1", 3, 10);
    recordMissionStars("ch1-m2", 2, 15);
    recordMissionStars("ch2-m1", 1, 8);
    const st = campaignStats();
    expect(st.missionsTotal).toBe(10);
    expect(st.missionsDone).toBe(3);
    expect(st.totalStars).toBe(6);
    expect(st.starsTotal).toBe(30);
    expect(st.totalBestTurns).toBe(33);
    expect(st.fastest).toMatchObject({ id: "ch2-m1", turns: 8 });
    expect(st.perChapter).toHaveLength(2);
    expect(st.perChapter[0]).toMatchObject({ chapterId: "ch1", stars: 5, starsMax: 15, done: 2, total: 5 });
    expect(st.perChapter[1]).toMatchObject({ chapterId: "ch2", stars: 1, starsMax: 15, done: 1, total: 5 });
  });

  it("empty progress yields zeroes and a null fastest", () => {
    const st = campaignStats();
    expect(st.missionsDone).toBe(0);
    expect(st.totalStars).toBe(0);
    expect(st.totalBestTurns).toBe(0);
    expect(st.fastest).toBeNull();
  });
});
