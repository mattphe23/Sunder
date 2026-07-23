// Sunder — Tribe Forge. Players assemble a custom tribe from balanced,
// battle-tested building blocks: one passive, one unique unit, one start tech,
// a name and a banner color. Persisted locally; injected as a 7th TRIBE_DEF
// at runtime so all existing systems (rules, AI, intros) work unchanged.
import { FactionPassive, TechId, UnitType, TRIBE_DEFS } from "./types";

const KEY = "polyforge-custom-tribe-v1";
export const CUSTOM_DEF_INDEX = TRIBE_DEFS.length; // 6 — slot appended at runtime

export interface CustomTribeConfig {
  name: string;
  color: string;
  passive: FactionPassive;
  uniqueUnit: UnitType; // one of the six faction units
  startTech: TechId;
}

/** balanced building blocks the forge offers (all already tuned in live play) */
export const FORGE_PASSIVES: { id: FactionPassive; label: string; desc: string }[] = [
  { id: "scholars", label: "Scholars", desc: "Technologies cost 20% less" },
  { id: "forgeborn", label: "Forgeborn", desc: "Units deal +15% attack damage" },
  { id: "harvesters", label: "Harvesters", desc: "Harvesting resources costs 1 less star" },
  { id: "outriders", label: "Outriders", desc: "All units gain +1 movement on grass" },
  { id: "tideborn", label: "Tideborn", desc: "Ports cost 1 star and boats move +1" },
  { id: "stonebound", label: "Stonebound", desc: "Walls cost 2 less; city defenders +10% defense" },
];

export const FORGE_UNITS: UnitType[] = [
  "arcanist", "berserker", "warden", "raider", "tidecaller", "bulwark",
];

export const FORGE_TECHS: { id: TechId; label: string }[] = [
  { id: "organization", label: "Organization" },
  { id: "hunting", label: "Hunting" },
  { id: "climbing", label: "Climbing" },
  { id: "riding", label: "Riding" },
  { id: "sailing", label: "Sailing" },
  { id: "shields", label: "Shields" },
];

export const FORGE_COLORS: { hex: string; name: string }[] = [
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#f97316", name: "Ember" },
  { hex: "#84cc16", name: "Moss" },
  { hex: "#10b981", name: "Jade" },
  { hex: "#06b6d4", name: "Lagoon" },
  { hex: "#6366f1", name: "Iris" },
  { hex: "#d946ef", name: "Orchid" },
  { hex: "#e2b007", name: "Gilded" },
];

export function loadCustomTribe(): CustomTribeConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CustomTribeConfig;
    if (!c?.name || !c.passive || !c.uniqueUnit || !c.startTech || !c.color) return null;
    return c;
  } catch { return null; }
}

export function saveCustomTribe(c: CustomTribeConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* noop */ }
}

export function deleteCustomTribe() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

/** Build a TRIBE_DEFS-shaped def from the forge config. */
export function customTribeDef(c: CustomTribeConfig) {
  const p = FORGE_PASSIVES.find((x) => x.id === c.passive);
  return {
    name: c.name,
    color: c.color,
    colorName: "Forged",
    passive: c.passive,
    passiveDesc: `${p?.label ?? c.passive} — ${p?.desc ?? ""}`,
    startTech: c.startTech,
  };
}
