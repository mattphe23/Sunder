// Polyforge — "Isoglow" design: low-poly flat-shaded minimalism, color as material,
// deep indigo void, amber star accent. Core data types & constants (framework-agnostic).

export type Terrain = "ocean" | "water" | "grass" | "forest" | "mountain";
export type Resource = "fruit" | "animal" | "mineral" | null;

export interface Tile {
  x: number;
  y: number;
  terrain: Terrain;
  resource: Resource;
  /** village or city sits here */
  cityId: number | null;
  /** id of tribe whose city's borders contain this tile (for harvesting) */
  ownerCityId: number | null;
  explored: boolean[]; // per tribe index
  /** naval: a port built on this water tile (tribe index) or null */
  port: number | null;
  /** ancient ruin awaiting exploration (grants a reward, then cleared) */
  ruin: boolean;
  /** rare great ruin — guarded by a neutral guardian; bigger reward once claimed */
  greatRuin: boolean;
}

export interface City {
  id: number;
  x: number;
  y: number;
  name: string;
  tribe: number | null; // null = neutral village
  level: number;
  population: number; // progress toward next level
  isCapital: boolean;
  /** city walls: defenders garrisoned here get a stronger defense bonus */
  walls?: boolean;
  /** unit currently being trained none this scope — training is instant spawn */
}

export type UnitType =
  | "warrior"
  | "archer"
  | "defender"
  | "rider"
  | "swordsman"
  | "knight"
  | "catapult"
  // faction-unique units (v10)
  | "arcanist" // Auren — ranged mystic; adjacent friendly units heal +2 HP at turn start
  | "berserker" // Kharzul — brutal melee; +50% damage vs already-wounded targets, low defense
  | "warden" // Sunwei — mountain sentinel; free mountain movement, strong defense on mountains
  | "raider"; // Vessari — fast cavalry; steals 2 stars from the enemy on every kill

export interface UnitStats {
  name: string;
  cost: number;
  hp: number;
  attack: number;
  defense: number;
  movement: number;
  range: number;
  /** can attack after moving */
  dash: boolean;
  /** melee units retaliate; ranged don't get retaliated at range */
  tech: TechId | null;
  /** faction-unique: only this tribe index may train it */
  faction?: number;
  /** short flavor line describing the unique perk (shown in UI) */
  perk?: string;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  warrior: { name: "Warrior", cost: 2, hp: 10, attack: 2, defense: 2, movement: 1, range: 1, dash: true, tech: null },
  archer: { name: "Archer", cost: 3, hp: 10, attack: 2, defense: 1, movement: 1, range: 2, dash: true, tech: "archery" },
  defender: { name: "Defender", cost: 3, hp: 15, attack: 1, defense: 3, movement: 1, range: 1, dash: false, tech: "shields" },
  rider: { name: "Rider", cost: 3, hp: 10, attack: 2, defense: 1, movement: 2, range: 1, dash: true, tech: "riding" },
  swordsman: { name: "Swordsman", cost: 5, hp: 15, attack: 3, defense: 3, movement: 1, range: 1, dash: true, tech: "smithery" },
  knight: { name: "Knight", cost: 8, hp: 10, attack: 3.5, defense: 1, movement: 3, range: 1, dash: true, tech: "chivalry" },
  catapult: { name: "Catapult", cost: 8, hp: 10, attack: 4, defense: 0, movement: 1, range: 3, dash: false, tech: "mathematics" },
  arcanist: {
    name: "Arcanist", cost: 6, hp: 10, attack: 2, defense: 1, movement: 1, range: 2, dash: true,
    tech: "organization", faction: 0,
    perk: "Mends adjacent allies +2 HP at the start of your turn",
  },
  berserker: {
    name: "Berserker", cost: 5, hp: 12, attack: 3, defense: 0.5, movement: 1, range: 1, dash: true,
    tech: "hunting", faction: 1,
    perk: "+50% damage against wounded enemies; reckless in defense",
  },
  warden: {
    name: "Warden", cost: 5, hp: 15, attack: 2, defense: 3, movement: 1, range: 1, dash: false,
    tech: "climbing", faction: 2,
    perk: "Climbs mountains freely and holds them with iron defense",
  },
  raider: {
    name: "Raider", cost: 6, hp: 10, attack: 2.5, defense: 1, movement: 3, range: 1, dash: true,
    tech: "riding", faction: 3,
    perk: "Plunders 2 stars from the enemy on every kill",
  },
};

export interface Unit {
  id: number;
  type: UnitType;
  tribe: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  moved: boolean;
  attacked: boolean;
  /** set when unit is on a capturable city and may capture next action */
  kills: number;
  /** naval: unit is embarked on a boat */
  boat: boolean;
  /** neutral guardian: never moves, guards a great ruin */
  guardian?: boolean;
  /** veterancy: promoted after 3 kills (+5 max HP) */
  veteran?: boolean;
}

/** pseudo-tribe index for neutral guardian units (not a real tribe) */
export const GUARDIAN_TRIBE = -1;

export type TechId =
  | "hunting"
  | "archery"
  | "organization"
  | "shields"
  | "climbing"
  | "mining"
  | "smithery"
  | "riding"
  | "freeSpirit"
  | "chivalry"
  | "mathematics"
  | "forestry"
  | "sailing"
  | "navigation";

export interface TechDef {
  id: TechId;
  name: string;
  tier: 1 | 2 | 3;
  requires: TechId | null;
  baseCost: number;
  desc: string;
}

export const TECHS: TechDef[] = [
  { id: "organization", name: "Organization", tier: 1, requires: null, baseCost: 4, desc: "Harvest fruit for population." },
  { id: "shields", name: "Shields", tier: 2, requires: "organization", baseCost: 5, desc: "Unlocks the Defender unit." },
  { id: "hunting", name: "Hunting", tier: 1, requires: null, baseCost: 4, desc: "Harvest wild animals in forests." },
  { id: "archery", name: "Archery", tier: 2, requires: "hunting", baseCost: 5, desc: "Unlocks Archers. Forest defense bonus." },
  { id: "forestry", name: "Forestry", tier: 2, requires: "hunting", baseCost: 5, desc: "Move through forests at full speed." },
  { id: "climbing", name: "Climbing", tier: 1, requires: null, baseCost: 4, desc: "Units can climb mountains." },
  { id: "mining", name: "Mining", tier: 2, requires: "climbing", baseCost: 5, desc: "Harvest minerals in mountains." },
  { id: "smithery", name: "Smithery", tier: 3, requires: "mining", baseCost: 6, desc: "Unlocks the Swordsman." },
  { id: "riding", name: "Riding", tier: 1, requires: null, baseCost: 4, desc: "Unlocks the fast Rider unit." },
  { id: "freeSpirit", name: "Free Spirit", tier: 2, requires: "riding", baseCost: 5, desc: "City defense bonus." },
  { id: "chivalry", name: "Chivalry", tier: 3, requires: "freeSpirit", baseCost: 6, desc: "Unlocks the mighty Knight." },
  { id: "mathematics", name: "Mathematics", tier: 3, requires: "forestry", baseCost: 6, desc: "Unlocks the Catapult — siege engine that ignores city walls." },
  { id: "sailing", name: "Sailing", tier: 2, requires: "organization", baseCost: 5, desc: "Build ports; units embark on boats to cross shallow water." },
  { id: "navigation", name: "Navigation", tier: 3, requires: "sailing", baseCost: 6, desc: "Boats can cross deep ocean tiles." },
];

/** cost in stars to build a port on a shallow water tile in your city borders */
export const PORT_COST = 3;

/** cost in stars to build walls in a level-3+ city */
export const WALL_COST = 5;
/** defense multiplier for a defender garrisoned in a walled city (vs 1.5 for unwalled city) */
export const WALL_DEFENSE_BONUS = 2.0;

export type FactionPassive = "scholars" | "forgeborn" | "harvesters" | "outriders";

export interface Tribe {
  index: number;
  name: string;
  color: string; // hex
  colorName: string;
  passive: FactionPassive;
  passiveDesc: string;
  isHuman: boolean;
  stars: number;
  techs: TechId[];
  alive: boolean;
  score: number;
}

export const TRIBE_DEFS = [
  { name: "Auren", color: "#3d7bff", colorName: "Imperial Blue", passive: "scholars" as FactionPassive, passiveDesc: "Scholars — technologies cost 20% less", startTech: "organization" as TechId },
  { name: "Kharzul", color: "#e04747", colorName: "Crimson", passive: "forgeborn" as FactionPassive, passiveDesc: "Forgeborn — units deal +15% attack damage", startTech: "hunting" as TechId },
  { name: "Sunwei", color: "#ffb938", colorName: "Amber", passive: "harvesters" as FactionPassive, passiveDesc: "Harvesters — harvesting resources costs 1 less star", startTech: "climbing" as TechId },
  { name: "Vessari", color: "#9d5ce8", colorName: "Violet", passive: "outriders" as FactionPassive, passiveDesc: "Outriders — all units gain +1 movement on grass", startTech: "riding" as TechId },
] as const;

export type Phase = "menu" | "playing" | "gameover";

export type Difficulty = "easy" | "normal" | "hard";

/** One entry in the start-of-turn recap of what rivals did. */
export interface RecapEntry {
  kind: "combat" | "capture" | "cityLost" | "ruin" | "greatRuin" | "fallen";
  text: string;
  /** tribe responsible (for color accents) */
  tribe: number;
}

/** running per-tribe match statistics, shown on the game-over screen */
export interface TribeStats {
  battlesWon: number;
  unitsLost: number;
  starsEarned: number;
  ruinsClaimed: number;
  citiesCaptured: number;
  techsResearched: number;
}

export const emptyStats = (): TribeStats => ({
  battlesWon: 0,
  unitsLost: 0,
  starsEarned: 0,
  ruinsClaimed: 0,
  citiesCaptured: 0,
  techsResearched: 0,
});

export interface GameState {
  phase: Phase;
  size: number;
  seed: number;
  /** map generation preset id: continents | archipelago | highlands | pangaea */
  preset: string;
  turn: number;
  maxTurns: number;
  difficulty: Difficulty;
  currentTribe: number; // index into tribes
  tribes: Tribe[];
  tiles: Tile[]; // size*size, index = y*size+x
  cities: City[];
  units: Unit[];
  nextUnitId: number;
  selectedUnitId: number | null;
  selectedCityId: number | null;
  winner: number | null;
  /** log messages for the ticker */
  log: string[];
  humanTribe: number;
  aiThinking: boolean;
  /** events since the human's last turn, shown as a recap */
  recap: RecapEntry[];
  /** recap ready to display at the start of the human turn */
  showRecap: boolean;
  /** per-tribe score at the END of each turn: scoreHistory[turn-1][tribeIdx] */
  scoreHistory: number[][];
  /** per-tribe running match statistics (index = tribe index) */
  stats: TribeStats[];
}

export const idx = (x: number, y: number, size: number) => y * size + x;
export const inBounds = (x: number, y: number, size: number) => x >= 0 && y >= 0 && x < size && y < size;

export const VILLAGE_NAMES = [
  "Lirath", "Osmo", "Fenwick", "Talvi", "Brann", "Yoru", "Kelda", "Miro",
  "Sova", "Piru", "Ando", "Vesk", "Norun", "Elba", "Tiko", "Quill",
  "Rasza", "Umbra", "Halon", "Zefi",
];
