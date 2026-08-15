// Sunder — achievements: feats earned across solo campaigns, persisted locally.
// Evaluated once per game at gameover; unlocks are permanent.
import type { GameState, TribeStats } from "./types";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** lucide icon name rendered by the menu panel */
  icon: "trophy" | "shield" | "flag" | "zap" | "landmark" | "skull" | "coins" | "flame";
  /** true if this game earned the feat (only called when the player won, unless loseOk) */
  check: (s: GameState, my: TribeStats) => boolean;
  /** evaluate even on defeat (default: victory required) */
  loseOk?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-win", name: "First Conquest", icon: "trophy",
    desc: "Win your first game.",
    check: () => true,
  },
  {
    id: "flawless", name: "Flawless Campaign", icon: "shield",
    desc: "Win without losing a single unit.",
    check: (_s, my) => my.unitsLost === 0,
  },
  {
    id: "three-capitals", name: "Triple Crown", icon: "flag",
    desc: "Capture all 3 rival capitals in one game.",
    check: (_s, my) => my.capitalsCaptured >= 3,
  },
  {
    id: "blitz", name: "Lightning War", icon: "zap",
    desc: "Win by turn 15.",
    check: (s) => s.turn < 15,
  },
  {
    id: "ruin-hunter", name: "Ruin Hunter", icon: "landmark",
    desc: "Explore 3 ruins in a single game.",
    check: (_s, my) => my.ruinsClaimed >= 3,
    loseOk: true,
  },
  {
    id: "guardian-slayer", name: "Guardian Slayer", icon: "skull",
    desc: "Slay a Great Ruin guardian.",
    check: (_s, my) => my.guardiansSlain >= 1,
    loseOk: true,
  },
  {
    id: "plunderer", name: "Master Plunderer", icon: "coins",
    desc: "Plunder 10★ with Raiders in one game.",
    check: (_s, my) => my.starsPlundered >= 10,
    loseOk: true,
  },
  {
    id: "hard-win", name: "Against All Odds", icon: "flame",
    desc: "Win a game on Hard difficulty.",
    check: (s) => s.difficulty === "hard" || s.difficulty === "impossible",
  },
  {
    id: "impossible-win", name: "The Unmaker", icon: "skull",
    desc: "Win a game on Impossible difficulty — outplay a rival who outspends you.",
    check: (s) => s.difficulty === "impossible",
  },
];

const ACH_KEY = "polyforge-achievements";

export function loadAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveAchievements(set: Set<string>) {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(Array.from(set))); } catch { /* private mode */ }
}

/**
 * Evaluate feats at gameover for the solo player. Returns newly unlocked defs.
 * Hot-seat games are skipped — feats chart the solo campaign.
 */
export function evaluateAchievements(s: GameState): AchievementDef[] {
  if ((s.humanTribes?.length ?? 1) > 1) return [];
  const my = s.stats?.[s.humanTribe];
  if (!my) return [];
  const won = s.winner === s.humanTribe;
  const unlocked = loadAchievements();
  const fresh: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    if (!won && !a.loseOk) continue;
    if (a.check(s, my)) { unlocked.add(a.id); fresh.push(a); }
  }
  if (fresh.length > 0) saveAchievements(unlocked);
  return fresh;
}
