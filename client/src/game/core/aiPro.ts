// Sunder v21 — the "Impossible" AI brain. No resource cheats: it wins by
// playing better. Built on four pillars:
//   1. Threat map — enemy reach & max damage per tile; units refuse bad fights
//      and retreat when standing in lethal squares.
//   2. Task forces — attackers rally near a shared target city and strike
//      together instead of trickling in one by one.
//   3. Hold-the-prize lookahead — before committing to a capture, check the
//      city can be held against next-turn counterattack.
//   4. Economic optimizer — value-per-star scoring for research, harvest,
//      training, ports and walls.
import {
  reachableTiles, attackableUnits, previewCombat, canResearch, canHarvest,
  trainableUnits, techCost, cityAt, unitAt, canBuildPort, tileAt, uniqueUnitOf,
  starIncome, harvestCost, portCost, wallCost,
} from "./rules";
import { GameState, TECHS, UNIT_STATS, UnitType, Unit, TechId, idx } from "./types";
import { atPeace, setPeace, aiWantsPeaceWith, markDiploUsed, diploUsed, strengthOf, PEACE_TREATY_TURNS } from "./diplomacy";
import { victoryProgress } from "./victory";
import { commonEnemy, inCoalition, claimCoalitionTarget, maybeBetray } from "./coalition";

interface StoreLike {
  state: GameState;
  research(t: TechId): void;
  harvest(x: number, y: number): void;
  train(cityId: number, type: UnitType): void;
  moveUnit(id: number, x: number, y: number): void;
  attack(a: number, d: number): void;
  captureCity(id: number): void;
  buildPort(x: number, y: number): void;
  buildWalls(cityId: number): void;
}

const cheb = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

/* ------------------------------- threat map ------------------------------- */

/**
 * For each tile: the summed potential damage hostile units could deal to a
 * defender standing there next turn (movement + range approximated by
 * chebyshev distance ≤ movement + range).
 */
export function buildThreatMap(s: GameState, tribeIdx: number): Float32Array {
  const threat = new Float32Array(s.size * s.size);
  for (const e of s.units) {
    if (e.tribe === tribeIdx) continue;
    if (e.tribe >= 0 && atPeace(s, tribeIdx, e.tribe)) continue;
    if (e.guardian && !e.awake) continue; // dormant guardians never chase
    const st = UNIT_STATS[e.type];
    const reach = st.movement + st.range;
    const dmg = st.attack * (e.hp / e.maxHp) * 4.5; // rough expected damage
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = e.x + dx, y = e.y + dy;
        if (x < 0 || y < 0 || x >= s.size || y >= s.size) continue;
        threat[idx(x, y, s.size)] += dmg;
      }
    }
  }
  return threat;
}

/* ---------------------------- economic optimizer ---------------------------- */

/** value-per-star research pick: unit unlocks valued by tempo, economy techs by income */
function pickResearch(s: GameState, tribeIdx: number): TechId | null {
  const available = TECHS.filter((t) => canResearch(s, tribeIdx, t.id));
  if (available.length === 0) return null;
  const stars = s.tribes[tribeIdx].stars;
  const rivalsWalled = s.cities.some((c) => c.tribe !== null && c.tribe !== tribeIdx && c.walls);
  const path = victoryProgress(s, tribeIdx);
  let best: TechId | null = null, bestV = -Infinity;
  for (const t of available) {
    const cost = techCost(s, tribeIdx, t.id);
    if (cost > stars) continue;
    let value = 10;
    // economy techs compound early
    if (["organization", "hunting", "climbing", "mining"].includes(t.id)) value += s.turn < 12 ? 14 : 6;
    // unit unlocks are tempo
    const unlocks = (Object.keys(UNIT_STATS) as UnitType[]).find((u) => UNIT_STATS[u].tech === t.id && (UNIT_STATS[u].faction === undefined || UNIT_STATS[u].faction === s.tribes[tribeIdx].defIndex));
    if (unlocks) value += 10;
    if (t.id === "mathematics" && rivalsWalled) value += 18;
    if (t.id === "sailing" || t.id === "navigation") {
      const waterTiles = s.tiles.filter((tl) => tl.terrain === "water" || tl.terrain === "ocean").length;
      value += waterTiles > s.size * s.size * 0.3 ? 10 : -6;
    }
    // enlightenment path: every tech is progress
    if (path?.def.id === "enlightenment") value += 8;
    const v = value / Math.max(1, cost);
    if (v > bestV) { bestV = v; best = t.id; }
  }
  return best;
}

/* -------------------------------- task forces -------------------------------- */

/** choose the tribe's shared strike target: weakest reachable enemy city */
function chooseWarTarget(s: GameState, tribeIdx: number): { x: number; y: number; cityId: number } | null {
  const myUnits = s.units.filter((u) => u.tribe === tribeIdx && u.type !== "hero");
  if (myUnits.length === 0) return null;
  const cx = myUnits.reduce((a, u) => a + u.x, 0) / myUnits.length;
  const cy = myUnits.reduce((a, u) => a + u.y, 0) / myUnits.length;
  let best: { x: number; y: number; cityId: number } | null = null, bestV = -Infinity;
  for (const c of s.cities) {
    if (c.tribe === tribeIdx) continue;
    if (c.tribe !== null && atPeace(s, tribeIdx, c.tribe)) continue;
    const dist = cheb(cx, cy, c.x, c.y);
    // garrison strength around the city (2-tile radius)
    let garrison = 0;
    for (const e of s.units) {
      if (e.tribe !== c.tribe) continue;
      if (cheb(e.x, e.y, c.x, c.y) <= 2) garrison += UNIT_STATS[e.type].attack * (e.hp / e.maxHp);
    }
    const v = (c.tribe === null ? 60 : c.isCapital ? 80 : 55) + (c.walls ? -12 : 0) - garrison * 6 - dist * 4;
    if (v > bestV) { bestV = v; best = { x: c.x, y: c.y, cityId: c.id }; }
  }
  return best;
}

/** hold-the-prize check: can we keep the city if we take it this turn? */
function canHoldCity(s: GameState, tribeIdx: number, cityX: number, cityY: number): boolean {
  let friendly = 0, hostile = 0;
  for (const u of s.units) {
    const d = cheb(u.x, u.y, cityX, cityY);
    if (d > 3) continue;
    const w = UNIT_STATS[u.type].attack * (u.hp / u.maxHp);
    if (u.tribe === tribeIdx) friendly += w;
    else if (u.tribe >= 0 && !atPeace(s, tribeIdx, u.tribe)) hostile += w;
  }
  // taking with local superiority (city defense bonus counts for us after capture)
  return friendly >= hostile * 0.8;
}

/* --------------------------------- main turn --------------------------------- */

export function runProAiTurn(store: StoreLike, tribeIdx: number) {
  const s = store.state;
  if (s.phase !== "playing") return;
  const me = s.tribes[tribeIdx];

  // diplomacy: same social layer as the standard brain
  for (const h of s.humanTribes ?? [s.humanTribe]) {
    if (!s.tribes[h]?.alive) continue;
    if (!s.incomingOffer && aiWantsPeaceWith(s, tribeIdx, h)) {
      markDiploUsed(s, tribeIdx, h);
      s.incomingOffer = { from: tribeIdx, to: h };
      break;
    }
  }
  // coalition seed vs runaway leader (shared with standard brain)
  const leader = s.tribes.filter((t) => t.alive).sort((a, b) => b.score - a.score)[0];
  if (leader && leader.index !== tribeIdx) {
    const myStr = strengthOf(s, tribeIdx);
    const leadStr = strengthOf(s, leader.index);
    if (leadStr > myStr * 1.5) {
      for (const ally of s.tribes) {
        if (!ally.alive || ally.isHuman || ally.index === tribeIdx || ally.index === leader.index) continue;
        if (atPeace(s, tribeIdx, ally.index) || diploUsed(s, tribeIdx, ally.index)) continue;
        if (leadStr > strengthOf(s, ally.index) * 1.5) {
          markDiploUsed(s, tribeIdx, ally.index);
          setPeace(s, tribeIdx, ally.index, s.turn + PEACE_TREATY_TURNS);
          s.log.unshift(`${me.name} and ${ally.name} formed a pact against ${leader.name}!`);
        }
      }
    }
  }

  // economy: research by value-per-star (up to twice if flush with stars)
  for (let i = 0; i < 2; i++) {
    const pick = pickResearch(s, tribeIdx);
    if (!pick) break;
    const cost = techCost(s, tribeIdx, pick);
    // keep a training reserve: don't burn every star on tech
    if (me.stars < cost + (s.turn < 6 ? 2 : 5)) break;
    store.research(pick);
  }

  // harvest: economy compounding — always worth it while cheap
  for (const t of s.tiles) {
    if (me.stars < harvestCost(s, tribeIdx) + 2) break;
    if (canHarvest(s, tribeIdx, t)) store.harvest(t.x, t.y);
  }

  // ports: only on water-heavy maps or tidemastery path
  const path = victoryProgress(s, tribeIdx);
  const waterFrac = s.tiles.filter((tl) => tl.terrain === "water" || tl.terrain === "ocean").length / (s.size * s.size);
  if (me.stars > portCost(s, tribeIdx) + 6 && (waterFrac > 0.28 || path?.def.id === "tidemastery")) {
    const site = s.tiles.find((t) => canBuildPort(s, tribeIdx, t));
    if (site) store.buildPort(site.x, site.y);
  }

  // walls: protect the capital when threatened, or chase unbrokenwall path
  const threat = buildThreatMap(s, tribeIdx);
  if (me.stars > wallCost(s, tribeIdx) + 4) {
    const wallable = s.cities
      .filter((c) => c.tribe === tribeIdx && c.level >= 3 && !c.walls)
      .sort((a, b) => (threat[idx(b.x, b.y, s.size)] - threat[idx(a.x, a.y, s.size)]) || (Number(b.isCapital) - Number(a.isCapital)));
    if (wallable.length > 0 && (threat[idx(wallable[0].x, wallable[0].y, s.size)] > 4 || path?.def.id === "unbrokenwall")) {
      store.buildWalls(wallable[0].id);
    }
  }

  // training: economic optimizer — counter-compose vs the human's army
  trainArmy(store, tribeIdx);

  // shared war target for the task force
  let target = chooseWarTarget(s, tribeIdx);
  // coalition war council: a claimed leader city (distinct per pact member)
  // overrides the solo pick; betray once the common enemy is broken
  if (inCoalition(s, tribeIdx)) {
    const enemy = commonEnemy(s);
    if (enemy !== null && enemy !== tribeIdx) {
      const claimed = claimCoalitionTarget(s, tribeIdx, enemy);
      if (claimed) target = claimed;
    } else {
      maybeBetray(s, tribeIdx);
    }
  }

  // unit actions with threat awareness (freshest threat per unit is fine at this scale)
  for (const u of [...s.units.filter((q) => q.tribe === tribeIdx)]) {
    if (!s.units.includes(u)) continue;
    proUnitAction(store, u, tribeIdx, target, buildThreatMap(s, tribeIdx));
  }
}

/* --------------------------------- training --------------------------------- */

function trainArmy(store: StoreLike, tribeIdx: number) {
  const s = store.state;
  const me = s.tribes[tribeIdx];
  const myCities = s.cities.filter((c) => c.tribe === tribeIdx);
  const myUnits = () => s.units.filter((u) => u.tribe === tribeIdx);
  const cap = myCities.length * 3 + 1; // slightly larger army than standard AI
  // composition intel: what does the strongest hostile field?
  const hostiles = s.units.filter((u) => u.tribe >= 0 && u.tribe !== tribeIdx && !atPeace(s, tribeIdx, u.tribe));
  const ranged = hostiles.filter((u) => UNIT_STATS[u.type].range > 1).length;
  const cavalry = hostiles.filter((u) => UNIT_STATS[u.type].movement > 1).length;
  for (const city of myCities) {
    if (myUnits().length >= cap) break;
    if (unitAt(s, city.x, city.y)) continue;
    const options = trainableUnits(s, tribeIdx).filter((ut) => UNIT_STATS[ut].cost <= me.stars);
    if (options.length === 0) continue;
    let best: UnitType = options[0], bestV = -Infinity;
    for (const ut of options) {
      const st = UNIT_STATS[ut];
      let value = st.attack * 2 + st.defense * 1.5 + st.hp * 0.3 + st.movement * 1.2 + st.range * 2;
      // counters: shields vs ranged-heavy foes, defenders vs cavalry, knights vs catapults
      if (ranged > cavalry && (ut === "defender" || ut === "bulwark" || ut === "warden")) value += 4;
      if (cavalry > ranged && (ut === "defender" || ut === "swordsman")) value += 3;
      // faction pride: unique units synergize with the passive
      if (ut === uniqueUnitOf(s, tribeIdx)) value += 5;
      // capital garrison: keep one defender-class at home
      const v = value / Math.max(1, st.cost);
      if (v > bestV) { bestV = v; best = ut; }
    }
    store.train(city.id, best);
  }
}

/* -------------------------------- unit action -------------------------------- */

function proUnitAction(store: StoreLike, u: Unit, tribeIdx: number, target: { x: number; y: number; cityId: number } | null, threat: Float32Array) {
  const s = store.state;
  const st = UNIT_STATS[u.type];

  // hero care (stronger than standard brain): retreat under 65% HP
  const isHero = !!u.hero;
  if (isHero && u.hp <= u.maxHp * 0.65 && !u.moved) {
    retreatToward(store, u, tribeIdx);
    return;
  }

  // capture if standing on capturable city — but only if we can hold it
  const here = cityAt(s, u.x, u.y);
  if (here && here.tribe !== tribeIdx && !u.moved) {
    if (canHoldCity(s, tribeIdx, here.x, here.y) || here.tribe === null) {
      store.captureCity(u.id);
      return;
    }
  }

  // attack selection with threat-adjusted scoring
  const targets = attackableUnits(s, u);
  if (targets.length > 0) {
    let best = targets[0], bestScore = -Infinity;
    for (const t of targets) {
      const r = previewCombat(s, u, t);
      let score = r.damageToDefender * 1.1 + (r.defenderDies ? 16 : 0) - r.damageToAttacker * 1.4 - (r.attackerDies ? 30 : 0);
      if (t.guardian) score += r.defenderDies ? 20 : 4;
      if (u.type === "catapult") {
        const dc = cityAt(s, t.x, t.y);
        if (dc && dc.walls && dc.tribe === t.tribe) score += 12;
      }
      if (u.type === "berserker" && t.hp < t.maxHp) score += 6;
      if (u.type === "raider" && r.defenderDies) score += 6;
      if (u.type === "tidecaller" && tileAt(s, u.x, u.y).terrain === "water") score += 4;
      // threat context: surviving on a lethal tile is a loss even if we win the trade
      const after = u.hp - r.damageToAttacker;
      if (!r.defenderDies && after > 0 && threat[idx(u.x, u.y, s.size)] > after) score -= 12;
      if (isHero) {
        if (r.attackerDies || r.damageToAttacker >= u.hp) score -= 120;
        else if (u.hp - r.damageToAttacker <= u.maxHp * 0.4) score -= 35;
        else score += ((u.level ?? 1) - 1) * 4;
      }
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (bestScore > 2) { // higher bar than standard brain: refuse marginal trades
      store.attack(u.id, best.id);
      return;
    }
  }

  if (u.moved) return;

  // retreat: wounded units standing in lethal threat pull back
  const myThreat = threat[idx(u.x, u.y, s.size)];
  if (u.hp <= u.maxHp * 0.4 && myThreat >= u.hp) {
    retreatToward(store, u, tribeIdx);
    return;
  }

  // garrison: keep one defensive unit on the capital when threatened
  const capital = s.cities.find((c) => c.tribe === tribeIdx && c.isCapital);
  if (capital && threat[idx(capital.x, capital.y, s.size)] > 6) {
    const garrisoned = s.units.some((q) => q.tribe === tribeIdx && q.id !== u.id && q.x === capital.x && q.y === capital.y);
    const iAmClosestDefensive = st.defense >= 2 && cheb(u.x, u.y, capital.x, capital.y) <= 3;
    if (!garrisoned && iAmClosestDefensive && !(u.x === capital.x && u.y === capital.y)) {
      stepToward(store, u, capital.x, capital.y, threat, s);
      return;
    }
    if (!garrisoned && iAmClosestDefensive) return; // hold the capital
  }

  // task force rally: gather 2 tiles off the shared target, strike when 3+ ready
  if (target && !isHero) {
    const dist = cheb(u.x, u.y, target.x, target.y);
    const comrades = s.units.filter((q) => q.tribe === tribeIdx && q.id !== u.id && !q.hero && cheb(q.x, q.y, target.x, target.y) <= 3).length;
    const strike = comrades >= 2 || dist <= 1; // enough force assembled (3 total incl. self)
    if (dist > 2 || strike) {
      // ruins still tempt scouts en route
      const ruin = nearestRuin(s, u);
      if (ruin && cheb(u.x, u.y, ruin.x, ruin.y) <= 3 && !strike) {
        stepToward(store, u, ruin.x, ruin.y, threat, s);
        return;
      }
      stepToward(store, u, target.x, target.y, threat, s, strike ? 0 : 2);
      return;
    }
    return; // in rally position, wait for the force
  }

  // no target: expand toward ruins/neutral villages
  const ruin = nearestRuin(s, u);
  if (ruin) { stepToward(store, u, ruin.x, ruin.y, threat, s); return; }
}

function nearestRuin(s: GameState, u: Unit): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null, bd = Infinity;
  for (const t of s.tiles) {
    if (!t.ruin && !t.greatRuin) continue;
    const d = cheb(u.x, u.y, t.x, t.y);
    if (d < bd) { bd = d; best = { x: t.x, y: t.y }; }
  }
  return bd <= 8 ? best : null;
}

/** step toward (tx,ty), preferring low-threat tiles; stop at `standoff` distance */
function stepToward(store: StoreLike, u: Unit, tx: number, ty: number, threat: Float32Array, s: GameState, standoff = 0) {
  const reach = reachableTiles(s, u);
  if (reach.length === 0) return;
  const cur = cheb(u.x, u.y, tx, ty);
  let best: { x: number; y: number } | null = null, bestV = -Infinity;
  for (const r of reach) {
    const d = cheb(r.x, r.y, tx, ty);
    if (d < standoff) continue; // hold the rally ring
    const th = threat[idx(r.x, r.y, s.size)];
    const v = -(d * 10) - Math.min(th, u.hp) * 0.8;
    if (v > bestV) { bestV = v; best = r; }
  }
  if (!best) return;
  const nd = cheb(best.x, best.y, tx, ty);
  if (nd >= cur && standoff === 0) return; // no progress
  store.moveUnit(u.id, best.x, best.y);
  // opportunistic post-move attack when favorable
  const after = attackableUnits(s, u);
  if (after.length > 0) {
    const r0 = previewCombat(s, u, after[0]);
    if (r0.damageToDefender > r0.damageToAttacker * 1.2 && !(u.hero && (r0.attackerDies || r0.damageToAttacker >= u.hp))) {
      store.attack(u.id, after[0].id);
    }
  }
}

/** pull back toward the nearest friendly city, favoring low-threat tiles */
function retreatToward(store: StoreLike, u: Unit, tribeIdx: number) {
  const s = store.state;
  const havens = s.cities.filter((c) => c.tribe === tribeIdx);
  if (havens.length === 0) return;
  const nearest = havens.sort((a, b) => cheb(a.x, a.y, u.x, u.y) - cheb(b.x, b.y, u.x, u.y))[0];
  if (u.x === nearest.x && u.y === nearest.y) return;
  const threat = buildThreatMap(s, tribeIdx);
  const reach = reachableTiles(s, u);
  if (reach.length === 0) return;
  let best: { x: number; y: number } | null = null, bestV = -Infinity;
  for (const r of reach) {
    const d = cheb(r.x, r.y, nearest.x, nearest.y);
    const th = threat[idx(r.x, r.y, s.size)];
    const v = -(d * 10) - th;
    if (v > bestV) { bestV = v; best = r; }
  }
  const cur = cheb(u.x, u.y, nearest.x, nearest.y);
  if (best && cheb(best.x, best.y, nearest.x, nearest.y) < cur) store.moveUnit(u.id, best.x, best.y);
}

// keep starIncome import referenced (used for future tuning hooks)
void starIncome;
