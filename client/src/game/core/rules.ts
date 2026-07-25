// Sunder rules engine — movement, combat, economy, tech, capture.
// Design amendments: scaling tech costs (late-game fix), ranged units fragile
// (no retaliation at range, low defense), faction passives (asymmetric-but-fair).

import {
  GameState, Tile, Unit, UnitType, UNIT_STATS, City, TechId, TECHS,
  TRIBE_DEFS, WALL_DEFENSE_BONUS, HeroPerkId, BuildingDef, idx, inBounds,
} from "./types";
import { inStorm, campAt } from "./events";
import { commonEnemy } from "./coalition";
import { atPeace } from "./diplomacy";

/** v28 anti-snowball: attacker belongs to an AI pact striking the runaway leader. */
export function coalitionStrikeBonus(s: GameState, attacker: Unit, defender: Unit): boolean {
  if (attacker.tribe < 0 || defender.tribe < 0) return false;
  const enemy = commonEnemy(s);
  if (enemy === null || defender.tribe !== enemy || attacker.tribe === enemy) return false;
  // pacted with at least one other tribe — the coalition war council
  return s.tribes.some((t) => t.alive && t.index !== attacker.tribe && atPeace(s, attacker.tribe, t.index));
}

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
      // Nerivane Tidecaller: swims shallow water freely, no boat or port needed
      if (unit.type === "tidecaller") return 1;
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

/** economy costs with faction passives applied */
export function portCost(s: GameState, tribe: number): number {
  return s.tribes[tribe]?.passive === "tideborn" ? 1 : 3;
}
export function wallCost(s: GameState, tribe: number): number {
  return s.tribes[tribe]?.passive === "stonebound" ? 3 : 5;
}

/* ------------------------------- v16 hero helpers ------------------------------- */

export function heroHasPerk(u: Unit, perk: HeroPerkId): boolean {
  return !!u.hero && (u.perks?.includes(perk) ?? false);
}

/** an adjacent allied hero with the given aura perk (not the unit itself) */
function adjacentHeroWith(s: GameState, u: Unit, perk: HeroPerkId): boolean {
  if (u.tribe < 0) return false;
  return s.units.some((h) =>
    h.hero && h.tribe === u.tribe && h.id !== u.id && (h.perks?.includes(perk) ?? false) &&
    Math.max(Math.abs(h.x - u.x), Math.abs(h.y - u.y)) === 1
  );
}
export const inspiredBy = (s: GameState, u: Unit) => adjacentHeroWith(s, u, "inspiring");
export const wardedBy = (s: GameState, u: Unit) => adjacentHeroWith(s, u, "warding");

/** Dijkstra reachable tiles for a unit with its movement points */
export function reachableTiles(s: GameState, unit: Unit): { x: number; y: number }[] {
  if (unit.moved || (unit.tribe < 0 && !unit.awake && !unit.raider)) return [];
  const stats = UNIT_STATS[unit.type];
  // Nerivane Tideborn: boats ride the currents — +1 movement
  const boatMp = BOAT_MOVEMENT + (s.tribes[unit.tribe]?.passive === "tideborn" ? 1 : 0);
  let mp = unit.boat ? boatMp : stats.movement;
  if (!unit.boat && heroHasPerk(unit, "swift")) mp += 1;
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
        // Polytopia rule: stepping into slow-but-passable terrain (e.g. forest without
        // forestry) is always allowed if the unit has ANY movement left — it just ends
        // the move there. Without this, 1-MP units could never enter cost-2 forest and
        // players got stuck ("fog never lifts"). Impassable (Infinity) stays impassable.
        const nd = Number.isFinite(cost) && cd < mp ? Math.min(cd + cost, mp) : cd + cost;
        if (nd > mp) continue;
        const key = idx(nx, ny, s.size);
        if (dist.has(key) && dist.get(key)! <= nd) continue;
        // cannot pass through or land on any unit
        if (unitAt(s, nx, ny)) continue;
        // v17 living map: storms make water impassable; camps can be entered (razed) but not passed through
        if ((t.terrain === "water" || t.terrain === "ocean") && inStorm(s, nx, ny)) continue;
        dist.set(key, nd);
        // a clamped slow step exhausts movement — don't continue pathing beyond it
        if (!campAt(s, nx, ny) && cd + cost <= mp) frontier.push([nx, ny, nd]);
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
    // diplomacy: tribes at peace cannot attack each other
    if (e.tribe >= 0 && unit.tribe >= 0 && (s.peaceUntil?.[unit.tribe]?.[e.tribe] ?? 0) > s.turn) return false;
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
  let heroMult = 1;
  if (heroHasPerk(defender, "ironskin")) heroMult = 1.3;
  if (heroHasPerk(defender, "relic")) heroMult *= 1.15; // v18 Guardian's Relic
  if (city && city.tribe === defender.tribe) {
    // siege: catapults hurl boulders straight over ramparts — walls give no benefit
    // colossus: the juggernaut simply walks through masonry — walls give no benefit
    const siege = attacker?.type === "catapult" || attacker?.type === "colossus";
    if (city.walls && !siege) return WALL_DEFENSE_BONUS * heroMult; // fortified — strongest static bonus
    let base = hasTech(s, defender.tribe, "freeSpirit") ? 1.6 : 1.3;
    // Dravok Stonebound: defenders in cities gain +10% defense
    if (s.tribes[defender.tribe].passive === "stonebound") base *= 1.1;
    return base * heroMult;
  }
  if (t.terrain === "forest" && hasTech(s, defender.tribe, "archery")) return 1.3 * heroMult;
  // Sunwei Warden: iron defense when holding a mountain
  if (t.terrain === "mountain" && defender.type === "warden") return 1.7;
  if (t.terrain === "mountain") return 1.3 * heroMult;
  return heroMult;
}

/** Dravok Bulwark aura: 20% damage reduction for adjacent allies (not the bulwark itself) */
export function bulwarkShielded(s: GameState, defender: Unit): boolean {
  if (defender.tribe < 0 || defender.type === "bulwark") return false;
  return s.units.some((b) =>
    b.type === "bulwark" && b.tribe === defender.tribe && b.id !== defender.id &&
    Math.max(Math.abs(b.x - defender.x), Math.abs(b.y - defender.y)) === 1
  );
}

export function previewCombat(s: GameState, attacker: Unit, defender: Unit): CombatResult {
  const aStats = UNIT_STATS[attacker.type];
  const dStats = UNIT_STATS[defender.type];
  let atk = aStats.attack;
  if (attacker.tribe >= 0 && s.tribes[attacker.tribe].passive === "forgeborn") atk *= 1.15;
  // v16 hero perks
  if (heroHasPerk(attacker, "warlord")) atk *= 1.25;
  if (heroHasPerk(attacker, "relic")) atk *= 1.15; // v18 Guardian's Relic
  if (inspiredBy(s, attacker)) atk *= 1.15;
  // Kharzul Berserker: smells blood — +50% damage against wounded targets
  if (attacker.type === "berserker" && defender.hp < defender.maxHp) atk *= 1.5;
  // Nerivane Tidecaller: the tide strikes hardest — +30% attack from a water tile
  if (attacker.type === "tidecaller" && tileAt(s, attacker.x, attacker.y).terrain === "water") atk *= 1.3;
  // v28 anti-snowball: coalition members strike the common enemy 15% harder
  if (coalitionStrikeBonus(s, attacker, defender)) atk *= 1.15;
  const attackForce = atk * (attacker.hp / attacker.maxHp);
  const defenseForce = dStats.defense * (defender.hp / defender.maxHp) * defenseBonus(s, defender, attacker);
  const total = attackForce + defenseForce;
  let damageToDefender = Math.round((attackForce / total) * atk * 4.5);
  // Dravok Bulwark: adjacent allies take 20% less damage
  if (bulwarkShielded(s, defender)) damageToDefender = Math.max(1, Math.round(damageToDefender * 0.8));
  // v16 hero Warding aura: adjacent allies take 15% less damage
  if (wardedBy(s, defender)) damageToDefender = Math.max(1, Math.round(damageToDefender * 0.85));
  let damageToAttacker = Math.round((defenseForce / total) * dStats.defense * 4.5);
  // Valkyra Stormborn: strikes land like thunder — retaliation against them is halved
  if (attacker.tribe >= 0 && s.tribes[attacker.tribe].passive === "stormborn") {
    damageToAttacker = Math.floor(damageToAttacker * 0.5);
  }
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

/** Human-readable modifier lines for the battle forecast panel. */
export function combatModifiers(s: GameState, attacker: Unit, defender: Unit): { text: string; side: "atk" | "def" }[] {
  const out: { text: string; side: "atk" | "def" }[] = [];
  // --- attacker modifiers ---
  if (attacker.tribe >= 0 && s.tribes[attacker.tribe].passive === "forgeborn") out.push({ text: "Forgeborn +15% attack", side: "atk" });
  if (heroHasPerk(attacker, "warlord")) out.push({ text: "Warlord +25% attack", side: "atk" });
  if (heroHasPerk(attacker, "relic")) out.push({ text: "Guardian's Relic +15% attack", side: "atk" });
  if (inspiredBy(s, attacker)) out.push({ text: "Inspired +15% attack", side: "atk" });
  if (attacker.type === "berserker" && defender.hp < defender.maxHp) out.push({ text: "Berserker +50% vs wounded", side: "atk" });
  if (attacker.type === "tidecaller" && tileAt(s, attacker.x, attacker.y).terrain === "water") out.push({ text: "Tidecaller +30% from water", side: "atk" });
  if (coalitionStrikeBonus(s, attacker, defender)) out.push({ text: "Coalition +15% vs leader", side: "atk" });
  if (attacker.tribe >= 0 && s.tribes[attacker.tribe].passive === "stormborn") out.push({ text: "Stormborn — retaliation halved", side: "atk" });
  if (attacker.hp < attacker.maxHp) out.push({ text: "Wounded — attack force reduced", side: "atk" });
  // --- defender modifiers (mirrors defenseBonus) ---
  if (bulwarkShielded(s, defender)) out.push({ text: "Bulwark aura −20% damage taken", side: "def" });
  if (wardedBy(s, defender)) out.push({ text: "Warding aura −15% damage taken", side: "def" });
  if (heroHasPerk(defender, "ironskin")) out.push({ text: "Ironskin +30% defense", side: "def" });
  if (heroHasPerk(defender, "relic")) out.push({ text: "Guardian's Relic +15% defense", side: "def" });
  if (defender.boat) { out.push({ text: "Embarked −30% defense", side: "def" }); return out; }
  const t = tileAt(s, defender.x, defender.y);
  if (defender.guardian) { out.push({ text: "Sacred ground +40% defense", side: "def" }); return out; }
  if (defender.tribe < 0) return out;
  const city = cityAt(s, defender.x, defender.y);
  if (city && city.tribe === defender.tribe) {
    const siege = attacker.type === "catapult" || attacker.type === "colossus";
    if (city.walls && !siege) out.push({ text: `Walls ×${WALL_DEFENSE_BONUS} defense`, side: "def" });
    else if (city.walls && siege) out.push({ text: attacker.type === "colossus" ? "Colossus crushes walls" : "Catapult ignores walls", side: "atk" });
    else out.push({ text: hasTech(s, defender.tribe, "freeSpirit") ? "City + Free Spirit +60% defense" : "City +30% defense", side: "def" });
  } else if (t.terrain === "forest" && hasTech(s, defender.tribe, "archery")) {
    out.push({ text: "Forest + Archery +30% defense", side: "def" });
  } else if (t.terrain === "mountain" && defender.type === "warden") {
    out.push({ text: "Warden on mountain +70% defense", side: "def" });
  } else if (t.terrain === "mountain") {
    out.push({ text: "Mountain +30% defense", side: "def" });
  }
  // v36 Colossus signature: survivors are hurled back a tile (blocked = +2 damage)
  if (attacker.type === "colossus") {
    const dist = Math.max(Math.abs(attacker.x - defender.x), Math.abs(attacker.y - defender.y));
    if (dist === 1) out.push({ text: "Colossus — knockback on hit", side: "atk" });
  }
  if (defender.hp < defender.maxHp) out.push({ text: "Wounded — defense force reduced", side: "def" });
  return out;
}

/**
 * v36 Colossus knockback: where a surviving defender gets hurled.
 * The push continues along the attack direction one tile. Returns the landing
 * tile, or null when the push is blocked (map edge, impassable terrain for the
 * defender, or an occupied tile) — a blocked push deals bonus damage instead.
 */
export function knockbackDestination(s: GameState, attacker: Unit, defender: Unit): { x: number; y: number } | null {
  const dx = Math.sign(defender.x - attacker.x);
  const dy = Math.sign(defender.y - attacker.y);
  if (dx === 0 && dy === 0) return null;
  const nx = defender.x + dx, ny = defender.y + dy;
  if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) return null;
  if (unitAt(s, nx, ny)) return null;
  const t = tileAt(s, nx, ny);
  // embarked defenders may be pushed across water; land units need standable ground
  if (defender.boat) {
    if (t.terrain !== "water" && t.terrain !== "ocean") return null;
  } else {
    if (t.terrain === "ocean") return null;
    if (t.terrain === "water" && defender.type !== "tidecaller") return null;
    if (t.terrain === "mountain" && defender.type !== "warden" && !hasTech(s, defender.tribe, "climbing")) return null;
  }
  return { x: nx, y: ny };
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

/** the unique unit a tribe may train: forge override, else keyed by defIndex */
export function uniqueUnitOf(s: GameState, tribe: number): UnitType | undefined {
  const t = s.tribes[tribe];
  if (!t) return undefined;
  if (t.customUnique) return t.customUnique;
  return (Object.keys(UNIT_STATS) as UnitType[]).find((ut) => UNIT_STATS[ut].faction === t.defIndex);
}
export function trainableUnits(s: GameState, tribe: number): UnitType[] {
  const unique = uniqueUnitOf(s, tribe);
  return (Object.keys(UNIT_STATS) as UnitType[]).filter((ut) =>
    ut !== "hero" &&
    ut !== "colossus" && // reward-only super unit — never trainable
    hasTech(s, tribe, UNIT_STATS[ut].tech) &&
    (UNIT_STATS[ut].faction === undefined || ut === unique)
  );
}

/* ---------------------------------- v35 economy ---------------------------------- */

/** each city supports (level + 1) units; capitals support one extra */
export function unitCapacity(s: GameState, tribe: number): number {
  let cap = 0;
  for (const c of s.cities) {
    if (c.tribe !== tribe) continue;
    cap += c.level + 1 + (c.isCapital ? 1 : 0);
  }
  return cap;
}

/** units counting against capacity (heroes are earned, not trained — they are free) */
export function unitCount(s: GameState, tribe: number): number {
  return s.units.filter((u) => u.tribe === tribe && !u.hero).length;
}

export function atUnitCapacity(s: GameState, tribe: number): boolean {
  return unitCount(s, tribe) >= unitCapacity(s, tribe);
}

/** can this tribe place building `b` on tile `t`? */
export function canBuild(s: GameState, tribe: number, t: Tile | undefined, b: BuildingDef): boolean {
  if (!t || t.building || t.resource || t.cityId !== null) return false;
  if (t.terrain !== b.terrain) return false;
  if (t.ownerCityId === null) return false;
  const city = s.cities[t.ownerCityId];
  if (!city || city.tribe !== tribe) return false;
  if (!hasTech(s, tribe, b.tech)) return false;
  // v36 adjacency buildings are unique per city — a second sawmill adds nothing
  if (b.adjacentTo && s.tiles.some((q) => q.ownerCityId === t.ownerCityId && q.building === b.id)) return false;
  return s.tribes[tribe].stars >= b.cost;
}

/**
 * v36: population an adjacency building would generate at tile (x,y) —
 * +1 per neighboring (8-way) tile holding the partner building. Used both for
 * the build action and the projected-gain hint in the build UI.
 */
export function adjacencyPop(s: GameState, x: number, y: number, b: BuildingDef): number {
  if (!b.adjacentTo) return b.pop;
  let pop = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) continue;
      if (tileAt(s, nx, ny).building === b.adjacentTo) pop++;
    }
  }
  return pop;
}

export function starIncome(s: GameState, tribe: number): number {
  let income = 0;
  for (const c of s.cities) {
    if (c.tribe !== tribe) continue;
    // v29 anti-turtling (Polytopia-authentic siege): an enemy unit standing ON
    // the city tile chokes its production entirely. Turtling behind walls no
    // longer preserves your economy once besiegers arrive.
    const occupier = s.units.find((u) => u.x === c.x && u.y === c.y && u.tribe !== tribe && u.tribe >= 0);
    if (occupier) continue;
    income += c.isCapital ? 2 : 1;
    income += Math.max(0, c.level - 1);
    // v35: each Workshop reward adds +1 income for its city
    income += (c.rewards ?? []).filter((r) => r === "workshop").length;
  }
  return income;
}

export const POP_PER_LEVEL = 3;

export function tribeDefs() {
  return TRIBE_DEFS;
}
