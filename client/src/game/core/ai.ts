// Sunder heuristic AI — addresses "AI too easy / never builds advanced units":
// researches its faction path, harvests, trains the full roster, hunts villages
// and enemy capitals, attacks when favorable. Difficulty adds economy bonuses.

import {
  reachableTiles, attackableUnits, previewCombat, canResearch, canHarvest,
  trainableUnits, techCost, cityAt, unitAt, canBuildPort, tileAt, uniqueUnitOf, canBuild, adjacencyPop, marketStars,
  canQuake, quakeVictims, quakeWallTargets, QUAKE_DAMAGE,
  canBuildRoad, roadCost, connectedCityIds,
} from "./rules";
import { GameState, TECHS, UNIT_STATS, UnitType, Unit, TechId, PORT_COST, WALL_COST, BuildingType, BUILDINGS } from "./types";
import { atPeace, setPeace, aiWantsPeaceWith, markDiploUsed, diploUsed, strengthOf, PEACE_TREATY_TURNS } from "./diplomacy";
import { victoryProgress } from "./victory";
import { runProAiTurn } from "./aiPro";
import { commonEnemy, inCoalition, claimCoalitionTarget, maybeBetray } from "./coalition";

// avoid circular type import; structural typing for the store
interface StoreLike {
  state: GameState;
  research(t: TechId): void;
  harvest(x: number, y: number): void;
  train(cityId: number, type: UnitType): void;
  build(x: number, y: number, type: BuildingType): void;
  moveUnit(id: number, x: number, y: number): void;
  attack(a: number, d: number): void;
  captureCity(id: number): void;
  buildPort(x: number, y: number): void;
  buildWalls(cityId: number): void;
  quake(id: number): void;
  buildRoad(x: number, y: number): void;
}

export function runAiTurn(store: StoreLike, tribeIdx: number) {
  const s = store.state;
  if (s.phase !== "playing") return;
  // v21: the Impossible tier runs a smarter brain — no resource cheats
  if (s.difficulty === "impossible") { runProAiTurn(store, tribeIdx); return; }
  // 0. diplomacy — a clearly-losing AI sues for peace with a human (one pending offer at a time)
  for (const h of s.humanTribes ?? [s.humanTribe]) {
    if (!s.tribes[h]?.alive) continue;
    if (!s.incomingOffer && aiWantsPeaceWith(s, tribeIdx, h)) {
      markDiploUsed(s, tribeIdx, h);
      s.incomingOffer = { from: tribeIdx, to: h };
      break;
    }
  }
  // 0b. coalition seed — AIs facing a dominant common enemy truce with each other and gang up
  const leader = s.tribes.filter((t) => t.alive).sort((a, b) => b.score - a.score)[0];
  if (leader && leader.index !== tribeIdx && !s.tribes[tribeIdx].isHuman) {
    const myStr = strengthOf(s, tribeIdx);
    const leadStr = strengthOf(s, leader.index);
    if (leadStr > myStr * 1.5) {
      for (const ally of s.tribes) {
        if (!ally.alive || ally.isHuman || ally.index === tribeIdx || ally.index === leader.index) continue;
        if (atPeace(s, tribeIdx, ally.index) || diploUsed(s, tribeIdx, ally.index)) continue;
        if (leadStr > strengthOf(s, ally.index) * 1.5) {
          markDiploUsed(s, tribeIdx, ally.index);
          setPeace(s, tribeIdx, ally.index, s.turn + PEACE_TREATY_TURNS);
          s.log.unshift(`${s.tribes[tribeIdx].name} and ${ally.name} formed a pact against ${leader.name}!`);
        }
      }
    }
  }
  // 0c. coalition war council — claim a distinct leader city (staggered, no
  // overlapping targets) and betray the pact once the common enemy is broken
  let warTarget: { x: number; y: number; cityId: number } | null = null;
  if (inCoalition(s, tribeIdx)) {
    const enemy = commonEnemy(s);
    if (enemy !== null && enemy !== tribeIdx) {
      warTarget = claimCoalitionTarget(s, tribeIdx, enemy);
    } else {
      maybeBetray(s, tribeIdx);
    }
  }

  // 1. research: pick cheapest available tech, prefer unit-unlocking branches
  const available = TECHS.filter((t) => canResearch(s, tribeIdx, t.id));
  // v20: loose victory-path pursuit — bounded weight nudges only, no hard rails
  const path = victoryProgress(s, tribeIdx);
  const pathId = path?.def.id;
  if (available.length > 0) {
    available.sort((a, b) => techCost(s, tribeIdx, a.id) - techCost(s, tribeIdx, b.id));
    // siege pressure: if rivals hold walled cities, beeline toward Mathematics (catapults)
    const rivalsWalled = s.cities.some((c) => c.tribe !== null && c.tribe !== tribeIdx && c.walls);
    const siegePath = rivalsWalled
      ? available.find((t) => t.id === "mathematics" || t.id === "forestry" || t.id === "hunting")
      : undefined;
    // enlightenment (Auren): research even at a worse price point — grab two if affordable
    if (pathId === "enlightenment") {
      store.research(available[0].id);
      const again = TECHS.filter((t) => canResearch(s, tribeIdx, t.id))
        .sort((a, b) => techCost(s, tribeIdx, a.id) - techCost(s, tribeIdx, b.id));
      if (again.length > 0 && s.tribes[tribeIdx].stars >= techCost(s, tribeIdx, again[0].id) + 4) {
        store.research(again[0].id);
      }
    } else {
      store.research(siegePath ? siegePath.id : available[0].id);
    }
  }

  // 2. harvest affordable resources in own borders
  // v42: dropped the plunderking hoarding rule that halted harvesting past 55%
  // of the treasury target. It starved Vessari's economy to chase a goal it
  // still only reached in 1% of games; Plunder King now counts loot taken, so
  // there is nothing to hoard for.
  for (const t of s.tiles) {
    if (canHarvest(s, tribeIdx, t)) store.harvest(t.x, t.y);
  }

  // 2a. v35 economy: once spare stars accumulate, place a production building
  if (s.tribes[tribeIdx].stars > 8) {
    for (const b of BUILDINGS) {
      // v37 market: permanent income — take it once 2+ partner mills stand together
      if (b.incomeAdjacentTo) {
        const sites = s.tiles.filter((t) => canBuild(s, tribeIdx, t, b));
        let best: { x: number; y: number } | null = null, bestStars = 0;
        for (const t of sites) {
          const v = marketStars(s, t.x, t.y, b);
          if (v > bestStars) { bestStars = v; best = { x: t.x, y: t.y }; }
        }
        if (best && bestStars >= 2 && Math.random() < 0.7) { store.build(best.x, best.y, b.id); break; }
        continue;
      }
      // v36 adjacency buildings: only worth it with 2+ partner neighbors — pick the best site
      if (b.adjacentTo) {
        const sites = s.tiles.filter((t) => canBuild(s, tribeIdx, t, b));
        let best: { x: number; y: number } | null = null, bestPop = 0;
        for (const t of sites) {
          const p = adjacencyPop(s, t.x, t.y, b);
          if (p > bestPop) { bestPop = p; best = { x: t.x, y: t.y }; }
        }
        if (best && bestPop >= 2 && Math.random() < 0.7) { store.build(best.x, best.y, b.id); break; }
        continue;
      }
      const site = s.tiles.find((t) => canBuild(s, tribeIdx, t, b));
      if (site && Math.random() < 0.6) { store.build(site.x, site.y, b.id); break; }
    }
  }

  // 2b. naval: occasionally build a port if it has Sailing and spare stars
  if (s.tribes[tribeIdx].stars > PORT_COST + 4) {
    const site = s.tiles.find((t) => canBuildPort(s, tribeIdx, t));
    // tidemastery (Nerivane): ports are the win condition — build eagerly
    if (site && Math.random() < (pathId === "tidemastery" ? 0.9 : 0.5)) store.buildPort(site.x, site.y);
  }

  // 2b2. v38 roads: pave toward the capital — each connected city is +1★/turn,
  // so a short road pays for itself in a couple of turns
  if (s.tribes[tribeIdx].techs.includes("roads") && s.tribes[tribeIdx].stars > roadCost(s, tribeIdx) + 3) {
    const capital = s.cities.find((c) => c.tribe === tribeIdx && c.isCapital);
    if (capital) {
      const connected = connectedCityIds(s, tribeIdx);
      const target = s.cities
        .filter((c) => c.tribe === tribeIdx && !c.isCapital && !connected.has(c.id))
        .sort((a, b) => (Math.abs(a.x - capital.x) + Math.abs(a.y - capital.y)) - (Math.abs(b.x - capital.x) + Math.abs(b.y - capital.y)))[0];
      if (target && Math.random() < 0.75) {
        // greedy 4-adjacent walk from the city toward the capital; pave the first gap
        let cx = target.x, cy = target.y;
        for (let step = 0; step < s.size * 2; step++) {
          if (cx === capital.x && cy === capital.y) break;
          if (Math.abs(capital.x - cx) >= Math.abs(capital.y - cy) && capital.x !== cx) cx += Math.sign(capital.x - cx);
          else cy += Math.sign(capital.y - cy);
          const t = tileAt(s, cx, cy);
          if (t.road || t.cityId !== null) continue;
          if (canBuildRoad(s, tribeIdx, t)) store.buildRoad(cx, cy);
          break; // one segment per turn; stop if the path is blocked
        }
      }
    }
  }

  // 2c. fortify: wall up high-level cities when stars allow (capital first)
  if (s.tribes[tribeIdx].stars > WALL_COST + 6) {
    const wallable = s.cities
      .filter((c) => c.tribe === tribeIdx && c.level >= 3 && !c.walls)
      .sort((a, b) => Number(b.isCapital) - Number(a.isCapital));
    // unbrokenwall (Dravok): walls are the win condition — raise them eagerly
    if (wallable.length > 0 && Math.random() < (pathId === "unbrokenwall" ? 0.95 : 0.6)) store.buildWalls(wallable[0].id);
  }

  // 3. train: keep army at ~3 units per city, use best affordable unit type
  const myCities = s.cities.filter((c) => c.tribe === tribeIdx);
  const myUnits = () => s.units.filter((u) => u.tribe === tribeIdx);
  const cap = myCities.length * 3;
  for (const city of myCities) {
    if (myUnits().length >= cap) break;
    if (unitAt(s, city.x, city.y)) continue;
    const options = trainableUnits(s, tribeIdx)
      .filter((ut) => UNIT_STATS[ut].cost <= s.tribes[tribeIdx].stars)
      .sort((a, b) => UNIT_STATS[b].cost - UNIT_STATS[a].cost);
    // siege: when a rival city is walled and catapults are unlocked, favor them strongly
    const rivalsWalled = s.cities.some((c) => c.tribe !== null && c.tribe !== tribeIdx && c.walls);
    if (rivalsWalled && options.includes("catapult") && Math.random() < 0.5) {
      store.train(city.id, "catapult");
      continue;
    }
    // faction pride: favor the tribe's unique unit when affordable
    const uniqueType = uniqueUnitOf(s, tribeIdx);
    const unique = options.find((ut) => ut === uniqueType);
    if (unique && Math.random() < 0.45) {
      store.train(city.id, unique);
      continue;
    }
    // mix: 60% best unit, 40% random cheaper for variety
    if (options.length > 0) {
      const pick = Math.random() < 0.6 ? options[0] : options[Math.floor(Math.random() * options.length)];
      store.train(city.id, pick);
    }
  }

  // 4. unit actions
  for (const u of [...myUnits()]) {
    if (!s.units.includes(u)) continue; // may have died in retaliation
    aiUnitAction(store, u, tribeIdx, warTarget);
  }
}

function aiUnitAction(store: StoreLike, u: Unit, tribeIdx: number, warTarget: { x: number; y: number; cityId: number } | null = null) {
  const s = store.state;

  // v20 hero care: a wounded commander is irreplaceable — pull it back toward a
  // friendly city instead of trading; a leveled healthy hero fights up front.
  const heroWounded = !!u.hero && u.hp <= u.maxHp * 0.6;
  if (heroWounded && !u.moved) {
    const havens = s.cities.filter((c) => c.tribe === tribeIdx);
    if (havens.length > 0) {
      const nearest = havens.sort((a, b) =>
        (Math.max(Math.abs(a.x - u.x), Math.abs(a.y - u.y))) - (Math.max(Math.abs(b.x - u.x), Math.abs(b.y - u.y))))[0];
      const already = u.x === nearest.x && u.y === nearest.y;
      if (!already) {
        const reach = reachableTiles(s, u);
        if (reach.length > 0) {
          reach.sort((a, b) => {
            const da = Math.max(Math.abs(a.x - nearest.x), Math.abs(a.y - nearest.y));
            const db = Math.max(Math.abs(b.x - nearest.x), Math.abs(b.y - nearest.y));
            return da - db;
          });
          const dest = reach[0];
          const curDist = Math.max(Math.abs(u.x - nearest.x), Math.abs(u.y - nearest.y));
          const newDist = Math.max(Math.abs(dest.x - nearest.x), Math.abs(dest.y - nearest.y));
          if (newDist < curDist) { store.moveUnit(u.id, dest.x, dest.y); return; }
        }
      }
      return; // hold position in/near the haven; no risky attacks while wounded
    }
  }

  // capture if standing on capturable city
  const here = cityAt(s, u.x, u.y);
  if (here && here.tribe !== tribeIdx && !u.moved) {
    store.captureCity(u.id);
    return;
  }

  // attack best target if favorable or if we outnumber
  const targets = attackableUnits(s, u);
  // v37 colossus: the once-per-game Quake — spend it only for a real payoff:
  // multiple victims, a guaranteed kill, or adjacent enemy walls to shatter
  if (u.type === "colossus" && canQuake(s, u)) {
    const victims = quakeVictims(s, u);
    const kills = victims.filter((v) => v.hp <= QUAKE_DAMAGE).length;
    const walls = quakeWallTargets(s, u).length;
    if (victims.length >= 2 || kills > 0 || walls > 0) {
      store.quake(u.id);
      return;
    }
  }
  if (targets.length > 0) {
    let best = targets[0], bestScore = -Infinity;
    for (const t of targets) {
      const r = previewCombat(s, u, t);
      let score = r.damageToDefender + (r.defenderDies ? 15 : 0) - r.damageToAttacker * 1.2 - (r.attackerDies ? 25 : 0);
      // guardians gate a big reward: worth extra risk when the kill is close
      if (t.guardian) score += r.defenderDies ? 20 : 5;
      // v29 siege awareness: an enemy standing ON one of our cities chokes its
      // income — breaking the siege outweighs an even trade
      const tc = cityAt(s, t.x, t.y);
      if (tc && tc.tribe === tribeIdx) score += r.defenderDies ? 18 : 8;
      // catapults exist to crack fortified garrisons — bonus for hitting walled-city defenders
      if (u.type === "catapult") {
        const dc = cityAt(s, t.x, t.y);
        if (dc && dc.walls && dc.tribe === t.tribe) score += 10;
      }
      // v36 colossus: crushing walls is worth more than the raw damage
      if (u.type === "colossus") {
        const dc = cityAt(s, t.x, t.y);
        if (dc && dc.walls && dc.tribe === t.tribe) score += 14;
      }
      // v39 road raiding: raiders squatting on our roads choke the trade
      // network — clearing them restores +1★/turn per severed city
      {
        const rt = tileAt(s, t.x, t.y);
        if (rt.road && rt.ownerCityId !== null && s.cities[rt.ownerCityId]?.tribe === tribeIdx) {
          score += r.defenderDies ? 10 : 5;
        }
      }
      // berserkers finish wounded prey; raiders chase kills for plunder
      if (u.type === "berserker" && t.hp < t.maxHp) score += 6;
      if (u.type === "raider" && r.defenderDies) score += 6;
      // tidecallers press the advantage from water; bulwarks avoid trading
      if (u.type === "tidecaller" && tileAt(s, u.x, u.y).terrain === "water") score += 4;
      if (u.type === "bulwark") score -= 4;
      // hero risk model: never suicide the commander; leveled heroes press harder
      if (u.hero) {
        if (r.attackerDies || r.damageToAttacker >= u.hp) score -= 100;
        else if (u.hp - r.damageToAttacker <= u.maxHp * 0.35) score -= 30; // don't trade into execute range
        else score += ((u.level ?? 1) - 1) * 4;
      }
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (bestScore > 0) {
      store.attack(u.id, best.id);
      return;
    }
  }

  if (u.moved) return;

  // move toward best objective: capturable city > enemy capital > enemy unit
  const objectives: { x: number; y: number; w: number }[] = [];
  // coalition claim outranks everything: converge on the assigned leader city.
  // heroes are exempt — the commander doesn't lead the siege line.
  if (warTarget && !u.hero) {
    const dist = Math.max(Math.abs(warTarget.x - u.x), Math.abs(warTarget.y - u.y));
    objectives.push({ x: warTarget.x, y: warTarget.y, w: 130 - dist * 4 });
  }
  for (const c of s.cities) {
    if (c.tribe === tribeIdx) continue;
    if (c.tribe !== null && atPeace(s, tribeIdx, c.tribe)) continue; // honor treaties
    const dist = Math.max(Math.abs(c.x - u.x), Math.abs(c.y - u.y));
    const w = (c.tribe === null ? 100 : c.isCapital ? 90 : 70) - dist * 5;
    objectives.push({ x: c.x, y: c.y, w });
  }
  // ancient ruins: strong pull when close (free reward for scouting)
  for (const t of s.tiles) {
    if (!t.ruin && !t.greatRuin) continue;
    const dist = Math.max(Math.abs(t.x - u.x), Math.abs(t.y - u.y));
    if (dist > 6) continue;
    const guarded = t.greatRuin && s.units.some((g) => g.guardian && g.x === t.x && g.y === t.y);
    // unguarded great ruin is the juiciest prize on the map; guarded ones attract strong units
    const base = t.greatRuin ? (guarded ? (UNIT_STATS[u.type].attack >= 3 ? 95 : 50) : 120) : 85;
    objectives.push({ x: t.x, y: t.y, w: base - dist * 6 });
  }
  for (const e of s.units) {
    if (e.tribe === tribeIdx) continue;
    if (e.tribe >= 0 && atPeace(s, tribeIdx, e.tribe)) continue; // honor treaties
    const dist = Math.max(Math.abs(e.x - u.x), Math.abs(e.y - u.y));
    // v29 siege awareness: a besieger on our city tile is a priority target to converge on
    const ec = cityAt(s, e.x, e.y);
    const besieging = ec && ec.tribe === tribeIdx;
    objectives.push({ x: e.x, y: e.y, w: (besieging ? 110 : 40) - dist * 5 });
  }
  if (objectives.length === 0) return;
  objectives.sort((a, b) => b.w - a.w);
  const target = objectives[0];

  const reach = reachableTiles(s, u);
  if (reach.length === 0) return;
  reach.sort((a, b) => {
    const da = Math.max(Math.abs(a.x - target.x), Math.abs(a.y - target.y));
    const db = Math.max(Math.abs(b.x - target.x), Math.abs(b.y - target.y));
    return da - db;
  });
  const dest = reach[0];
  const curDist = Math.max(Math.abs(u.x - target.x), Math.abs(u.y - target.y));
  const newDist = Math.max(Math.abs(dest.x - target.x), Math.abs(dest.y - target.y));
  if (newDist < curDist) {
    store.moveUnit(u.id, dest.x, dest.y);
    // capture or attack after moving
    const nowHere = cityAt(s, u.x, u.y);
    if (nowHere && nowHere.tribe !== tribeIdx) {
      // will capture next turn (capture requires fresh action) — but allow immediate if rules permit
    }
    const afterTargets = attackableUnits(s, u);
    if (afterTargets.length > 0) {
      const r = previewCombat(s, u, afterTargets[0]);
      if (r.damageToDefender > r.damageToAttacker) store.attack(u.id, afterTargets[0].id);
    }
  }
}
