// v31 — Mission star ratings: 1★ objective, 2★ under par turns, 3★ + no city lost.
// Best rating persists across runs; legacy completions (pre-star) read as 0 stars.
import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

import { CHAPTER_1, CHAPTER_2, STORY_CHAPTERS, missionById } from "../shared/story";
import {
  bestStars, computeMissionStars, loadStoryProgress, markMissionDone, recordMissionStars,
} from "../client/src/game/core/story";
import { emptyStats, type GameState } from "../client/src/game/core/types";

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

/** minimal GameState for star computation: a won domination mission */
function wonState(missionId: string, opts: { turn: number; citiesLost: number }): GameState {
  const m = missionById(missionId)!;
  const stats = [emptyStats(), emptyStats()];
  stats[0].citiesLost = opts.citiesLost;
  return {
    storyMission: missionId,
    phase: "gameover",
    humanTribe: 0,
    winner: 0,
    turn: opts.turn,
    maxTurns: 30,
    stats,
    tribes: [{ name: "P" }, { name: "E" }],
    _m: m, // unused, keeps ts quiet about m
  } as unknown as GameState;
}

describe("parTurns definitions", () => {
  it("every mission has a sane par (5..30)", () => {
    for (const ch of STORY_CHAPTERS) for (const m of ch.missions) {
      expect(m.parTurns).toBeGreaterThanOrEqual(5);
      expect(m.parTurns).toBeLessThanOrEqual(30);
    }
  });
});

describe("computeMissionStars", () => {
  const id = CHAPTER_1.missions[0].id; // domination, par 14
  const par = CHAPTER_1.missions[0].parTurns;

  it("3★ when under par and no city lost", () => {
    const r = computeMissionStars(wonState(id, { turn: par, citiesLost: 0 }));
    expect(r).toMatchObject({ stars: 3, underPar: true, noCityLost: true, parTurns: par });
  });
  it("2★ when only under par (a city was lost)", () => {
    const r = computeMissionStars(wonState(id, { turn: par - 2, citiesLost: 1 }));
    expect(r).toMatchObject({ stars: 2, underPar: true, noCityLost: false });
  });
  it("2★ when only clean board (over par)", () => {
    const r = computeMissionStars(wonState(id, { turn: par + 1, citiesLost: 0 }));
    expect(r).toMatchObject({ stars: 2, underPar: false, noCityLost: true });
  });
  it("1★ when neither bonus criterion holds", () => {
    const r = computeMissionStars(wonState(id, { turn: par + 5, citiesLost: 2 }));
    expect(r).toMatchObject({ stars: 1 });
  });
  it("null when the mission was not accomplished", () => {
    const s = wonState(id, { turn: 5, citiesLost: 0 });
    (s as { winner: number | null }).winner = 1; // enemy won → objective failed
    expect(computeMissionStars(s)).toBeNull();
  });
  it("null when not a story run", () => {
    const s = wonState(id, { turn: 5, citiesLost: 0 });
    (s as { storyMission?: string }).storyMission = undefined;
    expect(computeMissionStars(s)).toBeNull();
  });
});

describe("star persistence", () => {
  const id = CHAPTER_2.missions[0].id;

  it("recordMissionStars marks done and stores the rating", () => {
    recordMissionStars(id, 2);
    expect(loadStoryProgress().done[id]).toBe(true);
    expect(bestStars(id)).toBe(2);
  });
  it("keeps the best rating across runs (no downgrade)", () => {
    recordMissionStars(id, 3);
    recordMissionStars(id, 1);
    expect(bestStars(id)).toBe(3);
  });
  it("clamps ratings into 1..3", () => {
    recordMissionStars(id, 7);
    expect(bestStars(id)).toBe(3);
  });
  it("legacy completions (markMissionDone only) read as done with 0 stars", () => {
    markMissionDone(id);
    expect(loadStoryProgress().done[id]).toBe(true);
    expect(bestStars(id)).toBe(0);
    // and upgrading later works
    recordMissionStars(id, 2);
    expect(bestStars(id)).toBe(2);
  });
});
