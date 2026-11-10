import type { GameState } from "../core/types";
import {
  victoryProgress,
  VICTORY_PATH_START_TURN,
  type VictoryProgress,
} from "../core/victory";

/** Roughly two-thirds, with short integer goals rounded down so a two-port
 * path warns at one port, not after it has already completed. A one-step goal
 * cannot provide a pre-completion warning. Non-integer goals use the fraction.
 */
export function victoryWarningThreshold(target: number): number | null {
  if (!Number.isFinite(target) || target <= 0) return null;
  return Number.isInteger(target)
    ? Math.max(1, Math.floor((target / 3) * 2))
    : (target / 3) * 2;
}

export function presentVictoryProgress(progress: VictoryProgress, turn: number) {
  const valid = Number.isFinite(progress.current)
    && Number.isFinite(progress.target) && progress.target > 0;
  const target = Number.isFinite(progress.target) && progress.target > 0 ? progress.target : 0;
  const current = valid ? Math.max(0, Math.min(progress.current, target)) : 0;
  const ratio = valid ? current / target : 0;
  const warningThreshold = victoryWarningThreshold(progress.target);
  const near = valid && warningThreshold !== null && current >= warningThreshold;
  const ready = valid && current >= target;
  const round = Number.isFinite(turn) ? Math.max(0, Math.floor(turn)) : 0;
  const locked = round < VICTORY_PATH_START_TURN;
  const roundsUntilUnlock = Math.max(0, VICTORY_PATH_START_TURN - round);
  const unlockTurn = VICTORY_PATH_START_TURN + 1;
  const lockText = `opens Turn ${unlockTurn} · ${roundsUntilUnlock} ${roundsUntilUnlock === 1 ? "round" : "rounds"} until unlock`;
  const status = !valid ? "Progress unavailable"
    : ready && locked ? `Ready, but locked · ${lockText}`
    : ready ? "Ready · checked at start of round"
    : locked ? `${near ? "Close to goal" : "Path locked"} · ${lockText}`
    : near ? "Close to goal" : "In progress";

  return {
    pathId: progress.def.id,
    pathName: progress.def.name,
    goal: progress.def.goal,
    current,
    target,
    ratio,
    // Never round a not-yet-complete path up to 100%.
    percent: Math.floor(ratio * 100),
    valid,
    warningThreshold,
    near,
    ready,
    locked,
    unlockTurn,
    roundsUntilUnlock,
    status,
  };
}

export type VictoryPathPresentation = ReturnType<typeof presentVictoryProgress>;
export type TribeVictoryPath = VictoryPathPresentation & {
  tribeIndex: number;
  tribeName: string;
  color: string;
  isHuman: boolean;
};

export function canShowVictoryPaths(s: GameState): boolean {
  return s.phase === "playing" && s.handoff == null && !!s.tribes?.[s.humanTribe]?.isHuman;
}

/** PUBLIC strategic counters: like existing global rival score/statistics and
 * Diplomacy strength, faction-path totals are deliberately not fog-filtered.
 * Only victoryProgress's actual counter/goal is presented (including veterans
 * for Storm Legend); no map coordinates, unit identities, hidden army totals,
 * or explored/visible tiles are returned. This does not alter map fog policy.
 */
export function victoryPathPresentation(s: GameState) {
  const paths: TribeVictoryPath[] = [];
  for (const tribe of s.tribes) {
    if (!tribe.alive) continue;
    const progress = victoryProgress(s, tribe.index);
    if (!progress) continue;
    paths.push({
      ...presentVictoryProgress(progress, s.turn),
      tribeIndex: tribe.index,
      tribeName: tribe.name,
      color: tribe.color,
      isHuman: tribe.isHuman || (s.humanTribes ?? []).includes(tribe.index),
    });
  }
  const own = paths.find(path => path.tribeIndex === s.humanTribe) ?? null;
  // All other living tribes compete for paths, including other hotseat humans.
  // "Rival" is competitive, not an enemy/diplomacy designation.
  const rivals = paths.filter(path => path.tribeIndex !== s.humanTribe);
  const nearRivals = rivals.filter(path => path.near);
  // Announce settled progress when the viewing human can respond, not transient
  // AI intermediate moves or a pass-the-device handoff.
  const canAlert = canShowVictoryPaths(s) && !s.aiThinking && s.currentTribe === s.humanTribe;
  const alertText = !canAlert || nearRivals.length === 0 ? null
    : nearRivals.length === 1 ? `${nearRivals[0].tribeName} close to ${nearRivals[0].pathName}`
    : `${nearRivals.length} rivals close to victory`;
  return { own, rivals, nearRivals, canAlert, alertText };
}
