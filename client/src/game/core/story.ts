// Story Mode client progress layer — localStorage-persisted mission completion
// plus objective evaluation at game over. Mission scripts live in shared/story.ts.
import { STORY_CHAPTERS, missionById, StoryMission } from "@shared/story";
import { GameState } from "./types";

const KEY = "sunder-story-v1";

export interface StoryProgress {
  /** missionId → completed */
  done: Record<string, boolean>;
  /** missionId → best star rating earned (1..3); absent for legacy completions */
  stars?: Record<string, number>;
  /** missionId → fewest turns on a winning run; absent for legacy completions */
  turns?: Record<string, number>;
}

export function loadStoryProgress(): StoryProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as StoryProgress;
      if (p && typeof p.done === "object") return p;
    }
  } catch { /* noop */ }
  return { done: {} };
}

export function markMissionDone(id: string) {
  const p = loadStoryProgress();
  p.done[id] = true;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* noop */ }
}

/** record a star rating for a completed mission, keeping the best across runs */
export function recordMissionStars(id: string, stars: number, turns?: number) {
  const p = loadStoryProgress();
  p.done[id] = true;
  p.stars ??= {};
  p.stars[id] = Math.max(p.stars[id] ?? 0, Math.max(1, Math.min(3, stars)));
  if (typeof turns === "number" && turns > 0) {
    p.turns ??= {};
    p.turns[id] = Math.min(p.turns[id] ?? Infinity, turns);
  }
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* noop */ }
}

/** best stars earned for a mission (0 = not completed or legacy pre-star completion) */
export function bestStars(id: string): number {
  const p = loadStoryProgress();
  return p.stars?.[id] ?? 0;
}

/** fewest turns on a winning run (null = unknown/legacy) */
export function bestTurns(id: string): number | null {
  const p = loadStoryProgress();
  const t = p.turns?.[id];
  return typeof t === "number" && isFinite(t) ? t : null;
}

// ── Star-gated chapter rewards ──────────────────────────────────────────────

export interface ChapterReward {
  chapterId: string;
  /** exclusive Tribe Forge banner color */
  banner: { hex: string; name: string };
  /** player title shown on the Story page once earned */
  title: string;
  /** stars required (all missions at 3★) */
  starsRequired: number;
}

export const CHAPTER_REWARDS: ChapterReward[] = [
  {
    chapterId: "ch1",
    banner: { hex: "#38bdf8", name: "Dawnforged" },
    title: "Shardbreaker",
    starsRequired: 15,
  },
  {
    chapterId: "ch2",
    banner: { hex: "#fbbf24", name: "Crucible Gold" },
    title: "Worldsmith",
    starsRequired: 15,
  },
];

/** total best-stars earned across a chapter's missions */
export function chapterStars(chapterId: string): number {
  const ch = STORY_CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return 0;
  const p = loadStoryProgress();
  return ch.missions.reduce((sum, m) => sum + (p.stars?.[m.id] ?? 0), 0);
}

/** reward earned when every mission in the chapter is at 3★ */
export function rewardEarned(r: ChapterReward): boolean {
  return chapterStars(r.chapterId) >= r.starsRequired;
}

/** all earned rewards, in chapter order */
export function earnedRewards(): ChapterReward[] {
  return CHAPTER_REWARDS.filter(rewardEarned);
}

/** highest earned title (later chapters outrank earlier), or null */
export function playerTitle(): string | null {
  const earned = earnedRewards();
  return earned.length ? earned[earned.length - 1].title : null;
}

// ── Campaign stats summary ──────────────────────────────────────────────────

export interface CampaignStats {
  missionsDone: number;
  missionsTotal: number;
  totalStars: number;
  starsTotal: number;
  /** sum of best (fewest) turns across missions with a recorded time */
  totalBestTurns: number;
  /** fastest single mission: id, title, turns — or null when nothing recorded */
  fastest: { id: string; title: string; turns: number } | null;
  perChapter: { chapterId: string; label: string; stars: number; starsMax: number; done: number; total: number }[];
}

export function campaignStats(): CampaignStats {
  const p = loadStoryProgress();
  let missionsDone = 0, missionsTotal = 0, totalStars = 0, totalBestTurns = 0;
  let fastest: CampaignStats["fastest"] = null;
  const perChapter: CampaignStats["perChapter"] = [];
  for (const c of STORY_CHAPTERS) {
    let chStars = 0, chDone = 0;
    for (const m of c.missions) {
      missionsTotal++;
      if (p.done[m.id]) { missionsDone++; chDone++; }
      chStars += p.stars?.[m.id] ?? 0;
      const t = p.turns?.[m.id];
      if (typeof t === "number" && isFinite(t)) {
        totalBestTurns += t;
        if (!fastest || t < fastest.turns) fastest = { id: m.id, title: m.title, turns: t };
      }
    }
    totalStars += chStars;
    perChapter.push({ chapterId: c.id, label: c.title, stars: chStars, starsMax: c.missions.length * 3, done: chDone, total: c.missions.length });
  }
  return { missionsDone, missionsTotal, totalStars, starsTotal: missionsTotal * 3, totalBestTurns, fastest, perChapter };
}

/** first not-yet-completed mission in a chapter (null = chapter complete) */
export function nextMission(chapterId: string): StoryMission | null {
  const ch = STORY_CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return null;
  const p = loadStoryProgress();
  for (const m of ch.missions) if (!p.done[m.id]) return m;
  return null;
}

/** a chapter is playable when every mission of every earlier chapter is done */
export function chapterUnlocked(chapterId: string): boolean {
  const idx = STORY_CHAPTERS.findIndex((c) => c.id === chapterId);
  if (idx < 0) return false;
  const p = loadStoryProgress();
  return STORY_CHAPTERS.slice(0, idx).every((c) => c.missions.every((m) => p.done[m.id]));
}

/** first not-yet-completed mission across the whole campaign (null = campaign complete) */
export function nextCampaignMission(): StoryMission | null {
  for (const c of STORY_CHAPTERS) {
    if (!chapterUnlocked(c.id)) return null; // shouldn't happen (earlier chapter has the gap)
    const m = nextMission(c.id);
    if (m) return m;
  }
  return null;
}

/** a mission is playable when its chapter is unlocked and all previous missions in the chapter are done */
export function missionUnlocked(m: StoryMission, chapterId: string): boolean {
  const ch = STORY_CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return false;
  if (!chapterUnlocked(chapterId)) return false;
  const p = loadStoryProgress();
  return ch.missions.every((x) => x.index >= m.index || p.done[x.id]);
}

/**
 * Evaluate a finished match against its mission objective.
 * Returns true when the mission is accomplished.
 */
export function evaluateMission(s: GameState): boolean {
  if (!s.storyMission || s.phase !== "gameover") return false;
  const m = missionById(s.storyMission);
  if (!m) return false;
  const won = s.winner === s.humanTribe;
  switch (m.objective.kind) {
    case "survive":
      // outlast the clock: alive at the score screen counts, and outright wins count too
      return (s.tribes[s.humanTribe]?.alive ?? false) && (won || s.turn >= m.objective.turns - 1);
    case "domination":
    case "capital":
    default:
      return won;
  }
}

/** per-criterion breakdown for the game-over screen */
export interface StarBreakdown {
  stars: 1 | 2 | 3;
  underPar: boolean;
  noCityLost: boolean;
  parTurns: number;
}

/**
 * Star rating for an accomplished mission:
 *   1★ objective complete · 2★ also finished by parTurns · 3★ also lost no city.
 * The two bonus criteria are independent — but stars are cumulative in spirit,
 * so 3★ requires both (speed alone or a clean board alone still reads as 2★).
 */
export function computeMissionStars(s: GameState): StarBreakdown | null {
  if (!s.storyMission) return null;
  const m = missionById(s.storyMission);
  if (!m || !evaluateMission(s)) return null;
  const underPar = s.turn <= m.parTurns;
  const noCityLost = (s.stats?.[s.humanTribe]?.citiesLost ?? 0) === 0;
  const stars = (1 + (underPar ? 1 : 0) + (noCityLost ? 1 : 0)) as 1 | 2 | 3;
  return { stars, underPar, noCityLost, parTurns: m.parTurns };
}
