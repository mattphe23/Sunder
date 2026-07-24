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

/** a mission is playable when all previous missions in its chapter are done */
export function missionUnlocked(m: StoryMission, chapterId: string): boolean {
  const ch = STORY_CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return false;
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
