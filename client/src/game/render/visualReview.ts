import type { Unit, UnitType } from "../core/types";
import {
  CROSS_TRIBE_P2_PILOTS,
  NERIVANE_ARCHER_PILOT,
  NERIVANE_DEFENDER_PILOT,
  NERIVANE_NERETH_PILOT,
  NERIVANE_RIDER_AQUATIC_V2,
  NERIVANE_TIDECALLER_PILOT,
  NERIVANE_WARRIOR_PILOT,
  passesImportedModelPilotBudget,
  type ImportedModelCandidate,
} from "./importedModelRegistry";

export interface VisualRosterEntry {
  tribeIndex: number;
  unitType: UnitType;
  candidate: ImportedModelCandidate;
}

/** Integration catalog, NOT an approval ledger or a production preset. */
export const VISUAL_REVIEW_ROSTER: readonly VisualRosterEntry[] = [
  ...CROSS_TRIBE_P2_PILOTS.map(({ tribeIndex, unitType, candidate }) => ({ tribeIndex, unitType, candidate })),
  { tribeIndex: 4, unitType: "warrior", candidate: NERIVANE_WARRIOR_PILOT },
  { tribeIndex: 4, unitType: "archer", candidate: NERIVANE_ARCHER_PILOT },
  { tribeIndex: 4, unitType: "defender", candidate: NERIVANE_DEFENDER_PILOT },
  { tribeIndex: 4, unitType: "rider", candidate: NERIVANE_RIDER_AQUATIC_V2 },
  { tribeIndex: 4, unitType: "tidecaller", candidate: NERIVANE_TIDECALLER_PILOT },
  { tribeIndex: 4, unitType: "hero", candidate: NERIVANE_NERETH_PILOT },
];

/** Exact opt-in + development + explicit review context; false in every native production build. */
export function visualReviewEnabled(search: string, development: boolean): boolean {
  if (!development) return false;
  const query = new URLSearchParams(search);
  return query.has("devgame") && query.get("visual-review") === "roster-v1";
}

/** defIndex is designed identity, NOT a game slot. Custom tribes, boats and unmodeled roles stay procedural. */
export function visualRosterCandidate(
  defIndex: number,
  unit: Pick<Unit, "type" | "hero" | "boat" | "guardian">,
  enabled: boolean,
): ImportedModelCandidate | null {
  if (!enabled || unit.boat || unit.guardian || (unit.type === "hero" && !unit.hero)) return null;
  const entry = VISUAL_REVIEW_ROSTER.find(item => item.tribeIndex === defIndex && item.unitType === unit.type);
  if (!entry || entry.candidate.decision === "rejected-study" || !passesImportedModelPilotBudget(entry.candidate)) return null;
  return entry.candidate;
}
