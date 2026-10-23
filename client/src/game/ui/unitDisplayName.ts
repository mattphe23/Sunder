import { UNIT_STATS, type Unit } from "../core/types";

/** UI identity only: Guardians retain their canonical Swordsman combat stats. */
export function unitDisplayName(unit: Pick<Unit, "type" | "guardian">): string {
  return unit.guardian ? "Guardian" : UNIT_STATS[unit.type].name;
}
