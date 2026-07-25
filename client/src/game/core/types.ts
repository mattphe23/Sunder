// Sunder — "Isoglow" design: low-poly flat-shaded minimalism, color as material,
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
  /** v35 economy: production building placed on this tile (inside a city's borders) */
  building?: BuildingType | null;
}

/* ---------------------------------- v35 economy ---------------------------------- */

/** buildings convert stars into city population (Polytopia-style) */
export type BuildingType = "hut" | "farm" | "mine" | "sawmill" | "windmill";
export interface BuildingDef {
  id: BuildingType;
  name: string;
  terrain: Terrain;
  cost: number;
  pop: number;
  tech: TechId;
  desc: string;
  /** v36 adjacency building: +1 pop per (8-way) neighboring building of this type; one per city */
  adjacentTo?: BuildingType;
}
export const BUILDINGS: BuildingDef[] = [
  { id: "hut", name: "Lumber Hut", terrain: "forest", cost: 2, pop: 1, tech: "forestry", desc: "A woodcutter's hut among the pines. +1 population." },
  { id: "farm", name: "Farm", terrain: "grass", cost: 4, pop: 2, tech: "organization", desc: "Terraced fields feed the city. +2 population." },
  { id: "mine", name: "Mine", terrain: "mountain", cost: 4, pop: 2, tech: "mining", desc: "Deep shafts of ore and gems. +2 population." },
  // v36 adjacency buildings — the placement-puzzle layer: value scales with neighbors
  { id: "sawmill", name: "Sawmill", terrain: "grass", cost: 5, pop: 0, tech: "forestry", adjacentTo: "hut", desc: "+1 population per adjacent Lumber Hut. One per city." },
  { id: "windmill", name: "Windmill", terrain: "grass", cost: 5, pop: 0, tech: "organization", adjacentTo: "farm", desc: "+1 population per adjacent Farm. One per city." },
];

/** rewards chosen at each city level-up (2 offered, pick 1) */
export type CityReward =
  | "workshop" // +1 star income from this city
  | "explorer" // reveal the land around the city
  | "wall" // free city walls
  | "stars" // +5 stars now
  | "borderGrowth" // borders expand one ring
  | "popGrowth" // +3 population toward the next level
  | "park" // +15 score
  | "superUnit"; // a Colossus super unit spawns at the city

/** the two rewards offered on reaching a given level (first level-up = level 2) */
export function rewardChoicesForLevel(level: number): [CityReward, CityReward] {
  if (level === 2) return ["workshop", "explorer"];
  if (level === 3) return ["wall", "stars"];
  if (level === 4) return ["borderGrowth", "popGrowth"];
  return ["park", "superUnit"];
}

export const REWARD_INFO: Record<CityReward, { name: string; desc: string }> = {
  workshop: { name: "Workshop", desc: "+1 star income from this city, every turn." },
  explorer: { name: "Explorer", desc: "Reveals the land around the city." },
  wall: { name: "City Wall", desc: "Free walls — garrisoned defenders hold far stronger." },
  stars: { name: "Resources", desc: "+5 stars to the treasury, immediately." },
  borderGrowth: { name: "Border Growth", desc: "The city's borders expand one ring outward." },
  popGrowth: { name: "Population Boom", desc: "+3 population toward the next level." },
  park: { name: "Park", desc: "+15 score — a monument to prosperity." },
  superUnit: { name: "Colossus", desc: "A towering super unit rises to defend this city." },
};

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
  /** v35: rewards chosen at level-ups (drives income, score, etc.) */
  rewards?: CityReward[];
  /** v35: border rings claimed (1 = base ring; borderGrowth reward bumps to 2) */
  borderRadius?: number;
}

export type UnitType =
  | "warrior"
  | "archer"
  | "defender"
  | "rider"
  | "swordsman"
  | "knight"
  | "catapult"
  // v35: city level-5 reward super unit
  | "colossus"
  // faction-unique units (v10)
  | "arcanist" // Auren — ranged mystic; adjacent friendly units heal +2 HP at turn start
  | "berserker" // Kharzul — brutal melee; +50% damage vs already-wounded targets, low defense
  | "warden" // Sunwei — mountain sentinel; free mountain movement, strong defense on mountains
  | "raider" // Vessari — fast cavalry; steals 2 stars from the enemy on every kill
  // v14 tribes
  | "tidecaller" // Nerivane — amphibious skirmisher; moves on water without boats, +attack from water
  | "bulwark" // Dravok — living rampart; adjacent friendly units take 20% less damage
  // v16 hero: one levelling commander per tribe, spawns with the capital
  | "hero";

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
  colossus: {
    name: "Colossus", cost: 10, hp: 24, attack: 3, defense: 3, movement: 1, range: 1, dash: true,
    tech: null,
    perk: "City reward super unit — a slow, towering juggernaut. Cannot be trained.",
  },
  hero: {
    name: "Commander", cost: 10, hp: 14, attack: 2.5, defense: 2, movement: 1, range: 1, dash: true,
    tech: null,
    perk: "Your levelling hero — earns XP from battles and conquest, choosing a new perk at each level. Falls forever if slain.",
  },
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
  tidecaller: {
    name: "Tidecaller", cost: 6, hp: 10, attack: 2.5, defense: 1.5, movement: 2, range: 1, dash: true,
    tech: "sailing", faction: 4,
    perk: "Swims shallow water without boats; +30% attack when striking from water",
  },
  bulwark: {
    name: "Bulwark", cost: 6, hp: 18, attack: 1.5, defense: 3, movement: 1, range: 1, dash: false,
    tech: "shields", faction: 5,
    perk: "Adjacent allies take 20% less damage while it stands",
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
  /** v17: awakened guardian — roams and attacks once the late game begins */
  awake?: boolean;
  /** v17: barbarian raider spawned by a camp (hostile to all tribes) */
  raider?: boolean;
  /** veterancy: promoted after 3 kills (+5 max HP) */
  veteran?: boolean;
  /** v16 hero fields (only on type === "hero") */
  hero?: boolean;
  xp?: number;
  level?: number;
  perks?: HeroPerkId[];
}

/** pseudo-tribe index for neutral guardian units (not a real tribe) */
export const GUARDIAN_TRIBE = -1;

/* ---------------------------------- v16 heroes ---------------------------------- */

export type HeroPerkId =
  | "warlord" // +25% attack
  | "ironskin" // +30% defense
  | "swift" // +1 movement
  | "inspiring" // adjacent allies +15% attack
  | "warding" // adjacent allies take 15% less damage
  | "mender" // heals self +3 HP at turn start
  | "plunderer" // +2 stars on every hero kill
  | "titan" // +6 max HP (and heal 6)
  | "relic"; // v18: Guardian's Relic — slay the awakened Guardian: +15% attack & defense, +4 max HP

export interface HeroPerkDef {
  id: HeroPerkId;
  name: string;
  desc: string;
}

export const HERO_PERKS: Record<HeroPerkId, HeroPerkDef> = {
  warlord: { id: "warlord", name: "Warlord", desc: "+25% attack damage" },
  ironskin: { id: "ironskin", name: "Ironskin", desc: "+30% defense" },
  swift: { id: "swift", name: "Swift", desc: "+1 movement" },
  inspiring: { id: "inspiring", name: "Inspiring", desc: "Adjacent allies deal +15% attack damage" },
  warding: { id: "warding", name: "Warding", desc: "Adjacent allies take 15% less damage" },
  mender: { id: "mender", name: "Mender", desc: "Recovers +3 HP at the start of your turn" },
  plunderer: { id: "plunderer", name: "Plunderer", desc: "Plunders 2 stars from the enemy on every kill" },
  titan: { id: "titan", name: "Titan", desc: "+6 max HP, healed immediately" },
  relic: { id: "relic", name: "Guardian's Relic", desc: "Forged from the fallen Guardian's core — +15% attack, +15% defense, +4 max HP" },
};

/** XP needed to reach level N+1 from level N (level is 1-based; max level 4 = 3 perk picks) */
export const HERO_XP_THRESHOLDS = [6, 10, 14];
export const HERO_MAX_LEVEL = HERO_XP_THRESHOLDS.length + 1;

/** XP awards */
export const HERO_XP = { battleWon: 2, kill: 3, capture: 4, ruin: 2 } as const;

/** per-level perk choice pools (3 offered per level-up, drawn seeded from remaining) */
export const HERO_PERK_POOL: HeroPerkId[] = [
  "warlord", "ironskin", "swift", "inspiring", "warding", "mender", "plunderer", "titan",
];
// note: "relic" is never offered on level-up — it is earned only by slaying the awakened Guardian

/** flavor hero names per TRIBE_DEFS index */
export const HERO_NAMES = ["Maelis", "Drukhar", "Wu Jian", "Szara", "Nereth", "Borvak", "Skadi", "Morel"] as const;

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
  // v28 balance: 4 → 6 (playtests flagged early cavalry tempo as under-priced vs tier peers)
  { id: "riding", name: "Riding", tier: 1, requires: null, baseCost: 6, desc: "Unlocks the fast Rider unit." },
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

export type FactionPassive = "scholars" | "forgeborn" | "harvesters" | "outriders" | "tideborn" | "stonebound" | "stormborn" | "sporebound";

export interface Tribe {
  index: number;
  defIndex: number; // index into TRIBE_DEFS (roster identity — matches use 4 of the 6 defs)
  customUnique?: UnitType; // Tribe Forge: overrides the def-keyed unique unit
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
  /** v17: the tribe's commander has fallen (permanent score stake −40) */
  heroFell?: boolean;
}

export const TRIBE_DEFS = [
  { name: "Auren", color: "#3d7bff", colorName: "Imperial Blue", passive: "scholars" as FactionPassive, passiveDesc: "Scholars — technologies cost 20% less", startTech: "organization" as TechId },
  { name: "Kharzul", color: "#e04747", colorName: "Crimson", passive: "forgeborn" as FactionPassive, passiveDesc: "Forgeborn — units deal +15% attack damage", startTech: "hunting" as TechId },
  { name: "Sunwei", color: "#ffb938", colorName: "Amber", passive: "harvesters" as FactionPassive, passiveDesc: "Harvesters — harvesting resources costs 1 less star", startTech: "climbing" as TechId },
  { name: "Vessari", color: "#9d5ce8", colorName: "Violet", passive: "outriders" as FactionPassive, passiveDesc: "Outriders — all units gain +1 movement on grass", startTech: "riding" as TechId },
  { name: "Nerivane", color: "#2dd4bf", colorName: "Tidal Teal", passive: "tideborn" as FactionPassive, passiveDesc: "Tideborn — ports cost 1 star and boats move +1", startTech: "sailing" as TechId },
  { name: "Dravok", color: "#a8763e", colorName: "Ochre", passive: "stonebound" as FactionPassive, passiveDesc: "Stonebound — city walls cost 2 less and defenders in cities gain +10% defense", startTech: "shields" as TechId },
  // ── premium tribes (store unlocks; humans need the entitlement to select) ──
  { name: "Valkyra", color: "#38bdf8", colorName: "Storm Blue", passive: "stormborn" as FactionPassive, passiveDesc: "Stormborn — enemy retaliation against your attacks is halved", startTech: "archery" as TechId },
  { name: "Mycelon", color: "#a3e635", colorName: "Spore Green", passive: "sporebound" as FactionPassive, passiveDesc: "Sporebound — units recover +2 extra HP when resting in friendly territory", startTech: "freeSpirit" as TechId },
] as const;

/** TRIBE_DEFS indices that require a store entitlement for human selection. */
export const PREMIUM_TRIBES: Record<number, string> = {
  6: "tribe.valkyra",
  7: "tribe.mycelon",
};

export type Phase = "menu" | "playing" | "gameover";

export type Difficulty = "easy" | "normal" | "hard" | "impossible";

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
  capitalsCaptured: number;
  guardiansSlain: number;
  starsPlundered: number;
  /** cities this tribe owned that an enemy captured (mission star criterion) */
  citiesLost: number;
}
export const emptyStats = (): TribeStats => ({
  battlesWon: 0,
  unitsLost: 0,
  starsEarned: 0,
  ruinsClaimed: 0,
  citiesCaptured: 0,
  techsResearched: 0,
  capitalsCaptured: 0,
  guardiansSlain: 0,
  starsPlundered: 0,
  citiesLost: 0,
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
  /** hot-seat: all human-controlled tribe indices (solo = [humanTribe]) */
  humanTribes?: number[];
  /** hot-seat: tribe index awaiting the pass-the-device hand-off screen, or null */
  handoff?: number | null;
  /** v18 online: match metadata (null/undefined = local game). Persisted inside snapshots. */
  online?: {
    matchId: string;
    /** tribe index controlled by the host */
    hostTribe: number;
    /** tribe index controlled by the guest */
    guestTribe: number;
    hostName: string;
    guestName: string;
  } | null;
  aiThinking: boolean;
  /** events since the human's last turn, shown as a recap */
  recap: RecapEntry[];
  /** recap ready to display at the start of the human turn */
  showRecap: boolean;
  /** faction intro card shown once at match start (persisted, so reloads mid-intro re-show) */
  showIntro?: boolean;
  /** per-tribe score at the END of each turn: scoreHistory[turn-1][tribeIdx] */
  scoreHistory: number[][];
  /** per-tribe running match statistics (index = tribe index) */
  stats: TribeStats[];
  /** diplomacy: peaceUntil[a][b] = turn until which the pair is at peace (symmetric) */
  peaceUntil?: Record<number, Record<number, number>>;
  /** diplomacy: one diplomatic action per rival per turn */
  diploUsed?: { turn: number; from: number; to: number }[];
  /** diplomacy: broken-treaty grudges — holder refuses all future offers from `against` */
  grudges?: { holder: number; against: number }[];
  /** diplomacy: pending AI→human peace offer awaiting a response, or null */
  incomingOffer?: { from: number; to: number } | null;
  /** replay: compact chronological event log for the replay viewer */
  replay?: ReplayEntry[];
  /** challenge mode: set when this run is a daily/weekly challenge (best-score tracking, no Hall entry) */
  challenge?: "daily" | "weekly";
  /** story mode: mission id when this run is a campaign mission (e.g. "ch1-m3") */
  storyMission?: string;
  /** v16: human hero levelled up — unit id awaiting a perk choice (blocks end turn UI-side) */
  pendingPerk?: number | null;
  /** v35: human city levelled up — city id awaiting a reward choice (blocks end turn UI-side) */
  pendingCityReward?: number | null;
  /** v16: friend challenge — decoded from a shared link (?c=): beat `score` set by `name` */
  /** v16: a friend's shared "beat my score" target — name + score (map setup applied at newGame) */
  friendChallenge?: { name: string; score: number } | null;
  /** v17 living map: active barbarian camps */
  camps?: { id: number; x: number; y: number; strength: number; nextActionTurn: number }[];
  /** v17 living map: active sea storms */
  storms?: { id: number; x: number; y: number; radius: number; expiresTurn: number }[];
  /** v17: id counter for world entities */
  nextEventId?: number;
  /** v17: world events since the human's last turn (shown as event cards) */
  worldEvents?: { kind: string; text: string; turn: number; x?: number; y?: number }[];
  /** v17: fallen-commander drama card awaiting display, or null */
  heroFallen?: { heroName: string; tribeName: string; tribeColor: string; killerTribe: string; wasHuman: boolean; taunt: string } | null;
  /** v17: camps razed by the human this match (profile stat) */
  campsRazedByHuman?: number;
  /** v20: set when the game ended via an asymmetric faction victory path */
  winPath?: { pathId: string; pathName: string; flavor: string } | null;
}

/** one entry in the match replay log */
export interface ReplayEntry {
  turn: number;
  tribe: number;
  kind: "move" | "combat" | "capture" | "train" | "tech" | "ruin" | "diplo" | "turn";
  text: string;
  x?: number;
  y?: number;
}

export const idx = (x: number, y: number, size: number) => y * size + x;
export const inBounds = (x: number, y: number, size: number) => x >= 0 && y >= 0 && x < size && y < size;

export const VILLAGE_NAMES = [
  "Lirath", "Osmo", "Fenwick", "Talvi", "Brann", "Yoru", "Kelda", "Miro",
  "Sova", "Piru", "Ando", "Vesk", "Norun", "Elba", "Tiko", "Quill",
  "Rasza", "Umbra", "Halon", "Zefi",
];
