import { canHarvest, harvestCost, isVisibleTo, tileAt } from "../core/rules";
import { TECHS, type GameState, type TechId } from "../core/types";

export interface ResourcePosition {
  x: number;
  y: number;
}
export interface ResourceAction {
  title: string;
  label: string;
  cost: number;
  enabled: boolean;
  reason: string | null;
  cityName: string | null;
  requiredTech: TechId;
}

const RESOURCE_ACTIONS = {
  fruit: { title: "Fruit", label: "Harvest fruit", tech: "organization" },
  animal: { title: "Wild animals", label: "Hunt animals", tech: "hunting" },
  mineral: { title: "Mineral deposit", label: "Mine minerals", tech: "mining" },
} as const;

/** Read-only inspector: no selection field is added to GameState or saves. */
export function resourceAction(
  s: GameState,
  position: ResourcePosition
): ResourceAction | null {
  const { x, y } = position;
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= s.size ||
    y >= s.size
  )
    return null;
  const tile = tileAt(s, x, y);
  const tribe = s.humanTribe;
  const me = s.tribes[tribe];
  // Do not expose undiscovered or out-of-current-vision resource information.
  if (
    !me ||
    !tile?.resource ||
    !tile.explored[tribe] ||
    !isVisibleTo(s, tribe, x, y)
  )
    return null;
  const spec = RESOURCE_ACTIONS[tile.resource];
  if (!spec) return null;
  const owner = tile.ownerCityId === null ? null : s.cities[tile.ownerCityId];
  const cost = harvestCost(s, tribe);
  let reason: string | null = null;
  if (s.phase !== "playing" || s.currentTribe !== tribe || s.aiThinking)
    reason = "Wait for your turn.";
  else if (!owner || owner.tribe !== tribe)
    reason = "This resource must be inside a city you own.";
  else if (!me.techs.includes(spec.tech))
    reason = `Research ${TECHS.find(tech => tech.id === spec.tech)?.name ?? spec.tech} to unlock this action.`;
  else if (me.stars < cost)
    reason = `You need ${cost} stars; you have ${me.stars}.`;
  else if (s.pendingCityReward != null || s.pendingPerk != null)
    reason = "Finish the pending reward choice first.";
  const enabled = reason === null && canHarvest(s, tribe, tile);
  return {
    title: spec.title,
    label: spec.label,
    cost,
    enabled,
    reason:
      reason ?? (enabled ? null : "This resource is not available to harvest."),
    cityName: owner?.tribe === tribe ? owner.name : null,
    requiredTech: spec.tech,
  };
}
