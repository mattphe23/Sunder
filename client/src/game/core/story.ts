// Story Mode client progress layer — localStorage-persisted mission completion
// plus objective evaluation at game over. Mission scripts live in shared/story.ts.
import { STORY_CHAPTERS, missionById, StoryMission } from "@shared/story";
import { GameState } from "./types";

const KEY = "sunder-story-v1";

export interface StoryProgress {
  /** missionId → completed */
  done: Record<string, boolean>;
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
