// Polyforge rules engine — movement, combat, economy, tech, capture.
// Design amendments: scaling tech costs (late-game fix), ranged units fragile
// (no retaliation at range, low defense), faction passives (asymmetric-but-fair).

import {
  GameState, Tile, Unit, UnitType, UNIT_STATS, City, TechId, TECHS,
  TRIBE_DEFS, WALL_DEFENSE_BONUS, idx, inBounds,
} from "./types";

export function tileAt(s: GameState, x: number, y: number): Tile {
  return s.tiles[idx(x, y, s.size)];
}

export function unitAt(s: GameState, x: number, y: number): Unit | undefined {
  return s.units.find((u) => u.x === x && u.y === y);
}

export function cityAt(s: GameState, x: number, y: number): City | undefined {
  const t = tileAt(s, x, y);
  return t.cityId !== null ? s.cities[t.cityId] : undefined;
}

function hasTech(s: GameState, tribe: number, tech: TechId | null): boolean {
  if (tech === null) return true;
  return s.tribes[tribe]?.techs.includes(tech) ?? false;
}

/** movement cost to ENTER a tile; Infinity = impassable */
function moveCost(s: GameState, unit: Unit, t: Tile): number {
  const tribe = unit.tribe;
  if (unit.boat) {
    // boats travel water; ocean needs Navigation; may land on coastal land (disembark)
    switch (t.terrain) {
      case "water": return 1;
      case "ocean": return hasTech(s, tribe, "navigation") ? 1 : Infinity;
      case "grass": return 1; // disembark
      case "forest": return 1.5; // disembark into forest
      case "mountain": return Infinity;
    }
  }
  switch (t.terrain) {
    case "ocean": return Infinity;
    case "water":
      // land units can embark at a friendly port
      return t.port === tribe && hasTech(s, tribe, "sailing") ? 1 : Infinity;
    case "mountain":
      // Sunwei Warden: born of the peaks — climbs at no penalty
      if (unit.type === "warden") return 1;
      return hasTech(s, tribe, "climbing") ? 2 : Infinity;
    case "forest": return hasTech(s, tribe, "forestry") ? 1 : 2;
    case "grass": {
      const passive = s.tribes[tribe]?.passive;
      return passive === "outriders" ? 0.5 : 1;
    }
  }
}

export const BOAT_MOVEMENT = 3;

/** Dijkstra reachable tiles for a unit with its movement points */
export function reachableTiles(s: GameState, unit: Unit): { x: number; y: number }[] {
  if (unit.moved || unit.tribe < 0) return [];
  const stats = UNIT_STATS[unit.type];
  let mp = unit.boat ? BOAT_MOVEMENT : stats.movement;
  if (s.tribes[unit.tribe]?.passive === "outriders") mp += 0; // handled via 0.5 grass cost
  const dist = new Map<number, number>();
  const start = idx(unit.x, unit.y, s.size);
  dist.set(start, 0);
  const frontier: [number, number, number][] = [[unit.x, unit.y, 0]];
  const out: { x: number; y: number }[] = [];
  while (frontier.length) {
    frontier.sort((a, b) => a[2] - b[2]);
    const [cx, cy, cd] = frontier.shift()!;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!inBounds(nx, ny, s.size)) continue;
        const t = tileAt(s, nx, ny);
        const cost = moveCost(s, unit, t);
        const nd = cd + cost;
        if (nd > mp) continue;
        const key = idx(nx, ny, s.size);
        if (dist.has(key) && dist.get(key)! <= nd) continue;
        // cannot pass through or land on any unit
        if (unitAt(s, nx, ny)) continue;
        dist.set(key, nd);
        frontier.push([nx, ny, nd]);
        out.push({ x: nx, y: ny });
      }
    }
  }
  return out;
}

/** enemies attackable from current position */
export function attackableUnits(s: GameState, unit: Unit): Unit[] {
  if (unit.attacked) return [];
  const stats = UNIT_STATS[unit.type];
  if (unit.moved && !stats.dash) return [];
  if (unit.boat) return []; // boats cannot attack (transport only)
  return s.units.filter((e) => {
    if (e.tribe === unit.tribe) return false;
    const d = Math.max(Math.abs(e.x - unit.x), Math.abs(e.y - unit.y));
    return d <= stats.range;
  });
}

export interface CombatResult {
  damageToDefender: number;
  damageToAttacker: number;
  defenderDies: boolean;
  attackerDies: boolean;
}

/** defense bonus from terrain/city (Polytopia-style ideas, our tuning) */
function defenseBonus(s: GameState, defender: Unit, attacker?: Unit): number {
  if (defender.boat) return 0.7; // embarked units are vulnerable
  const t = tileAt(s, defender.x, defender.y);
  if (defender.guardian) return 1.4; // guardians hold sacred ground
  if (defender.tribe < 0) return 1;
  const city = cityAt(s, defender.x, defender.y);
  if (city && city.tribe === defender.tribe) {
    // siege: catapults hurl boulders straight over ramparts — walls give no benefit
    const siege = attacker?.type === "catapult";
    if (city.walls && !siege) return WALL_DEFENSE_BONUS; // fortified — strongest static bonus
    return hasTech(s, defender.tribe, "freeSpirit") ? 1.6 : 1.3;
  }
  if (t.terrain === "forest" && hasTech(s, defender.tribe, "archery")) return 1.3;
  // Sunwei Warden: iron defense when holding a mountain
  if (t.terrain === "mountain" && defender.type === "warden") return 1.7;
  if (t.terrain === "mountain") return 1.3;
  return 1;
}

export function previewCombat(s: GameState, attacker: Unit, defender: Unit): CombatResult {
  const aStats = UNIT_STATS[attacker.type];
  const dStats = UNIT_STATS[defender.type];
  let atk = aStats.attack;
  if (attacker.tribe >= 0 && s.tribes[attacker.tribe].passive === "forgeborn") atk *= 1.15;
  // Kharzul Berserker: smells blood — +50% damage against wounded targets
  if (attacker.type === "berserker" && defender.hp < defender.maxHp) atk *= 1.5;
  const attackForce = atk * (attacker.hp / attacker.maxHp);
  const defenseForce = dStats.defense * (defender.hp / defender.maxHp) * defenseBonus(s, defender, attacker);
  const total = attackForce + defenseForce;
  const damageToDefender = Math.round((attackForce / total) * atk * 4.5);
  const damageToAttacker = Math.round((defenseForce / total) * dStats.defense * 4.5);
  const defenderDies = defender.hp - damageToDefender <= 0;
  // retaliation only if defender survives, attacker within defender's range, and attacker adjacent (melee exposure)
  const dist = Math.max(Math.abs(attacker.x - defender.x), Math.abs(attacker.y - defender.y));
  const retaliates = !defenderDies && dist <= dStats.range;
  return {
    damageToDefender,
    damageToAttacker: retaliates ? damageToAttacker : 0,
    defenderDies,
    attackerDies: retaliates && attacker.hp - damageToAttacker <= 0,
  };
}

export function techCost(s: GameState, tribe: number, tech: TechId): number {
  const def = TECHS.find((t) => t.id === tech)!;
  const cityCount = s.cities.filter((c) => c.tribe === tribe).length;
  // Late-game fix: cost scales with empire size
  let cost = def.baseCost + def.tier * Math.max(0, cityCount - 1) * 1.5;
  if (s.tribes[tribe].passive === "scholars") cost *= 0.8;
  return Math.round(cost);
}

export function canResearch(s: GameState, tribe: number, tech: TechId): boolean {
  const tr = s.tribes[tribe];
  const def = TECHS.find((t) => t.id === tech)!;
  if (tr.techs.includes(tech)) return false;
  if (def.requires && !tr.techs.includes(def.requires)) return false;
  return tr.stars >= techCost(s, tribe, tech);
}

export function harvestCost(s: GameState, tribe: number): number {
  return s.tribes[tribe].passive === "harvesters" ? 1 : 2;
}

/** naval: can this tribe build a port on tile t? */
export function canBuildPort(s: GameState, tribe: number, t: Tile): boolean {
  if (t.terrain !== "water" || t.port !== null) return false;
  if (!hasTech(s, tribe, "sailing")) return false;
  if (t.ownerCityId === null) return false;
  if (s.cities[t.ownerCityId].tribe !== tribe) return false;
  return true;
}

/** visibility: tile currently within sight range (2) of any of the tribe's units or cities */
export function isVisibleTo(s: GameState, tribe: number, x: number, y: number): boolean {
  for (const u of s.units) {
    if (u.tribe !== tribe) continue;
    if (Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) <= 2) return true;
  }
  for (const c of s.cities) {
    if (c.tribe !== tribe) continue;
    if (Math.max(Math.abs(c.x - x), Math.abs(c.y - y)) <= 2) return true;
  }
  return false;
}

export function canHarvest(s: GameState, tribe: number, t: Tile): boolean {
  if (!t.resource) return false;
  if (t.ownerCityId === null) return false;
  const owner = s.cities[t.ownerCityId];
  if (owner.tribe !== tribe) return false;
  const techNeeded: Record<string, TechId> = { fruit: "organization", animal: "hunting", mineral: "mining" };
  if (!hasTech(s, tribe, techNeeded[t.resource])) return false;
  return s.tribes[tribe].stars >= harvestCost(s, tribe);
}

export function trainableUnits(s: GameState, tribe: number): UnitType[] {
  return (Object.keys(UNIT_STATS) as UnitType[]).filter((ut) =>
    hasTech(s, tribe, UNIT_STATS[ut].tech) &&
    (UNIT_STATS[ut].faction === undefined || UNIT_STATS[ut].faction === tribe)
  );
}

export function starIncome(s: GameState, tribe: number): number {
  let income = 0;
  for (const c of s.cities) {
    if (c.tribe !== tribe) continue;
    income += c.isCapital ? 2 : 1;
    income += Math.max(0, c.level - 1);
  }
  return income;
}

export const POP_PER_LEVEL = 3;

export function tribeDefs() {
  return TRIBE_DEFS;
}
