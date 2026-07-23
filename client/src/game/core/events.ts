// Sunder — the Living Forge. v17 living map engine: the world acts between player turns.
// Deterministic (seeded from match seed + turn) so challenge runs stay fair & reproducible.
// Three systems: barbarian camps (spawn → grow → raid), storms (roaming water squalls that
// block naval movement), and awakening guardians (great-ruin sentinels that stir and roam).
import { GameState, Tile, Unit, GUARDIAN_TRIBE } from "./types";

/* ------------------------------ world event types ------------------------------ */

export type WorldEventKind = "campSpawned" | "campGrew" | "campRaid" | "campRazed" | "stormFormed" | "stormMoved" | "stormFaded" | "guardianWoke" | "guardianMoved";

export interface WorldEvent {
  kind: WorldEventKind;
  text: string;
  turn: number;
  x?: number;
  y?: number;
}

/** a barbarian camp — grows each phase; at strength 3+ it spews raiders at the richest neighbor */
export interface BarbCamp {
  id: number;
  x: number;
  y: number;
  strength: number; // 1..4
  nextActionTurn: number;
}

/** a storm — occupies a cluster of water tiles for a few turns, drifting each world phase */
export interface Storm {
  id: number;
  x: number; // center
  y: number;
  radius: number; // chebyshev radius of affected water tiles
  expiresTurn: number;
}

/** deterministic per-(seed,turn,salt) PRNG */
export function eventRng(seed: number, turn: number, salt: number) {
  let h = (seed ^ Math.imul(turn + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5; h >>>= 0;
    return h / 0xffffffff;
  };
}

/* ------------------------------ tuning ------------------------------ */

export const EVENTS_START_TURN = 5; // let players settle before the world stirs
export const CAMP_SPAWN_CHANCE = 0.4; // per world phase, if under cap
export const CAMP_CAP = 2; // max simultaneous camps
export const CAMP_MIN_CITY_DIST = 3;
export const CAMP_RAID_STRENGTH = 3;
export const STORM_CHANCE = 0.3;
export const STORM_CAP = 1;
export const STORM_LIFETIME = 3; // turns
export const GUARDIAN_WAKE_TURN = 14; // guardians stir late-game

/* ------------------------------ helpers ------------------------------ */

const idx = (s: GameState, x: number, y: number) => y * s.size + x;
const inB = (s: GameState, x: number, y: number) => x >= 0 && y >= 0 && x < s.size && y < s.size;

function unitAtTile(s: GameState, x: number, y: number): Unit | undefined {
  return s.units.find((u) => u.x === x && u.y === y);
}

/** is (x,y) inside any active storm? */
export function inStorm(s: GameState, x: number, y: number): boolean {
  for (const st of s.storms ?? []) {
    if (Math.max(Math.abs(x - st.x), Math.abs(y - st.y)) <= st.radius) {
      const t = s.tiles[idx(s, x, y)];
      if (t && (t.terrain === "water" || t.terrain === "ocean")) return true;
    }
  }
  return false;
}

/** camp occupying (x,y)? */
export function campAt(s: GameState, x: number, y: number): BarbCamp | undefined {
  return (s.camps ?? []).find((c) => c.x === x && c.y === y);
}

/** candidate tiles for a camp: wild land (no city borders, no units), far from cities */
function campSites(s: GameState, rand: () => number): { x: number; y: number }[] {
  const sites: { x: number; y: number }[] = [];
  for (const t of s.tiles) {
    if (t.terrain !== "grass" && t.terrain !== "forest") continue;
    if (t.cityId !== null || t.ownerCityId !== null || t.ruin || t.greatRuin) continue;
    if (unitAtTile(s, t.x, t.y)) continue;
    if (campAt(s, t.x, t.y)) continue;
    const nearCity = s.cities.some((c) => Math.max(Math.abs(c.x - t.x), Math.abs(c.y - t.y)) < CAMP_MIN_CITY_DIST);
    if (nearCity) continue;
    sites.push({ x: t.x, y: t.y });
  }
  return sites.sort(() => rand() - 0.5);
}

/* ------------------------------ world phase ------------------------------ */

/**
 * Advance the living world by one phase. Called once per full game turn
 * (when tribe 0 begins). Mutates state; returns the events that occurred.
 * All spawned units belong to GUARDIAN_TRIBE (-1) — hostile to everyone.
 */
export function runWorldPhase(s: GameState, makeUnit: (type: Unit["type"], tribe: number, x: number, y: number) => Unit): WorldEvent[] {
  const events: WorldEvent[] = [];
  if (s.turn < EVENTS_START_TURN) return events;
  s.camps = s.camps ?? [];
  s.storms = s.storms ?? [];
  s.nextEventId = s.nextEventId ?? 1;

  /* ---- barbarian camps ---- */
  const r1 = eventRng(s.seed, s.turn, 11);
  if (s.camps.length < CAMP_CAP && r1() < CAMP_SPAWN_CHANCE) {
    const site = campSites(s, r1)[0];
    if (site) {
      s.camps.push({ id: s.nextEventId++, x: site.x, y: site.y, strength: 1, nextActionTurn: s.turn + 2 });
      events.push({ kind: "campSpawned", text: "Smoke rises in the wilds — a barbarian camp has appeared!", turn: s.turn, x: site.x, y: site.y });
    }
  }
  for (const camp of [...s.camps]) {
    if (s.turn < camp.nextActionTurn) continue;
    camp.nextActionTurn = s.turn + 2;
    if (camp.strength < CAMP_RAID_STRENGTH) {
      camp.strength++;
      events.push({ kind: "campGrew", text: "The barbarian camp grows bolder…", turn: s.turn, x: camp.x, y: camp.y });
    } else {
      // raid: spawn 1-2 warriors adjacent to the camp aimed at the nearest city
      const r2 = eventRng(s.seed, s.turn, camp.id + 100);
      const spots: { x: number; y: number }[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = camp.x + dx, ny = camp.y + dy;
        if (!inB(s, nx, ny) || (dx === 0 && dy === 0)) continue;
        const t = s.tiles[idx(s, nx, ny)];
        if ((t.terrain === "grass" || t.terrain === "forest") && !unitAtTile(s, nx, ny) && !campAt(s, nx, ny)) spots.push({ x: nx, y: ny });
      }
      const count = Math.min(spots.length, 1 + (r2() < 0.5 ? 1 : 0));
      for (let i = 0; i < count; i++) {
        const u = makeUnit("warrior", GUARDIAN_TRIBE, spots[i].x, spots[i].y);
        u.raider = true;
        s.units.push(u);
      }
      if (count > 0) {
        camp.strength = 1; // spent
        events.push({ kind: "campRaid", text: "Barbarian raiders pour from their camp — guard your villages!", turn: s.turn, x: camp.x, y: camp.y });
      }
    }
  }

  /* ---- storms ---- */
  // expire + drift
  for (const st of [...s.storms]) {
    if (s.turn >= st.expiresTurn) {
      s.storms = s.storms.filter((x) => x.id !== st.id);
      events.push({ kind: "stormFaded", text: "The storm over the sea breaks apart.", turn: s.turn, x: st.x, y: st.y });
      continue;
    }
    const r3 = eventRng(s.seed, s.turn, st.id + 300);
    const dx = Math.floor(r3() * 3) - 1, dy = Math.floor(r3() * 3) - 1;
    const nx = st.x + dx, ny = st.y + dy;
    if (inB(s, nx, ny)) {
      const t = s.tiles[idx(s, nx, ny)];
      if (t.terrain === "water" || t.terrain === "ocean") {
        st.x = nx; st.y = ny;
        events.push({ kind: "stormMoved", text: "The storm drifts across the waves.", turn: s.turn, x: nx, y: ny });
      }
    }
  }
  // form
  const r4 = eventRng(s.seed, s.turn, 7);
  if (s.storms.length < STORM_CAP && r4() < STORM_CHANCE) {
    const waters = s.tiles.filter((t) => t.terrain === "water" || t.terrain === "ocean");
    if (waters.length >= 6) {
      const pick = waters[Math.floor(r4() * waters.length)];
      s.storms.push({ id: s.nextEventId++, x: pick.x, y: pick.y, radius: 1, expiresTurn: s.turn + STORM_LIFETIME });
      events.push({ kind: "stormFormed", text: "Dark clouds gather — a storm rages over the sea. Boats cannot enter it.", turn: s.turn, x: pick.x, y: pick.y });
    }
  }

  /* ---- awakening guardians ---- */
  if (s.turn >= GUARDIAN_WAKE_TURN) {
    for (const g of s.units) {
      if (g.tribe !== GUARDIAN_TRIBE || !g.guardian || g.awake) continue;
      g.awake = true;
      g.moved = false;
      g.attacked = false;
      events.push({ kind: "guardianWoke", text: "The ancient Guardian stirs — it walks the Shatterlands once more!", turn: s.turn, x: g.x, y: g.y });
    }
  }

  return events;
}

/**
 * Move hostile world units (awakened guardians + camp raiders) one step toward
 * the nearest enemy unit or city; attack if adjacent. Runs after the world phase.
 * Returns attacks to resolve: {attacker, target} pairs (resolution stays in state.ts
 * so combat bookkeeping/XP/recap flows through the one true attack path).
 */
export function worldUnitIntents(s: GameState): { unit: Unit; move?: { x: number; y: number }; targetUnitId?: number }[] {
  const intents: { unit: Unit; move?: { x: number; y: number }; targetUnitId?: number }[] = [];
  const hostiles = s.units.filter((u) => u.tribe === GUARDIAN_TRIBE && (u.awake || u.raider));
  for (const h of hostiles) {
    // nearest target: any tribal unit, else nearest city
    let best: { x: number; y: number; unitId?: number } | null = null;
    let bestD = Infinity;
    for (const u of s.units) {
      if (u.tribe === GUARDIAN_TRIBE) continue;
      const d = Math.max(Math.abs(u.x - h.x), Math.abs(u.y - h.y));
      if (d < bestD) { bestD = d; best = { x: u.x, y: u.y, unitId: u.id }; }
    }
    for (const c of s.cities) {
      if (c.tribe === null) continue;
      const d = Math.max(Math.abs(c.x - h.x), Math.abs(c.y - h.y));
      if (d < bestD) { bestD = d; best = { x: c.x, y: c.y }; }
    }
    if (!best) continue;
    if (bestD === 1 && best.unitId !== undefined) {
      intents.push({ unit: h, targetUnitId: best.unitId });
      continue;
    }
    if (bestD <= 6) {
      // step toward target on walkable land
      const sx = Math.sign(best.x - h.x), sy = Math.sign(best.y - h.y);
      const options = [
        { x: h.x + sx, y: h.y + sy },
        { x: h.x + sx, y: h.y },
        { x: h.x, y: h.y + sy },
      ];
      for (const o of options) {
        if (!inB(s, o.x, o.y)) continue;
        const t = s.tiles[idx(s, o.x, o.y)];
        if (t.terrain === "water" || t.terrain === "ocean" || t.terrain === "mountain") continue;
        if (unitAtTile(s, o.x, o.y) || campAt(s, o.x, o.y)) continue;
        intents.push({ unit: h, move: o });
        break;
      }
    }
  }
  return intents;
}
