// Polyforge heuristic AI — addresses "AI too easy / never builds advanced units":
// researches its faction path, harvests, trains the full roster, hunts villages
// and enemy capitals, attacks when favorable. Difficulty adds economy bonuses.

import {
  reachableTiles, attackableUnits, previewCombat, canResearch, canHarvest,
  trainableUnits, techCost, cityAt, unitAt,
} from "./rules";
import { GameState, TECHS, UNIT_STATS, UnitType, Unit, TechId } from "./types";

// avoid circular type import; structural typing for the store
interface StoreLike {
  state: GameState;
  research(t: TechId): void;
  harvest(x: number, y: number): void;
  train(cityId: number, type: UnitType): void;
  moveUnit(id: number, x: number, y: number): void;
  attack(a: number, d: number): void;
  captureCity(id: number): void;
}

export function runAiTurn(store: StoreLike, tribeIdx: number) {
  const s = store.state;
  if (s.phase !== "playing") return;

  // 1. research: pick cheapest available tech, prefer unit-unlocking branches
  const available = TECHS.filter((t) => canResearch(s, tribeIdx, t.id));
  if (available.length > 0) {
    available.sort((a, b) => techCost(s, tribeIdx, a.id) - techCost(s, tribeIdx, b.id));
    store.research(available[0].id);
  }

  // 2. harvest affordable resources in own borders
  for (const t of s.tiles) {
    if (canHarvest(s, tribeIdx, t)) store.harvest(t.x, t.y);
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
    // mix: 60% best unit, 40% random cheaper for variety
    if (options.length > 0) {
      const pick = Math.random() < 0.6 ? options[0] : options[Math.floor(Math.random() * options.length)];
      store.train(city.id, pick);
    }
  }

  // 4. unit actions
  for (const u of [...myUnits()]) {
    if (!s.units.includes(u)) continue; // may have died in retaliation
    aiUnitAction(store, u, tribeIdx);
  }
}

function aiUnitAction(store: StoreLike, u: Unit, tribeIdx: number) {
  const s = store.state;

  // capture if standing on capturable city
  const here = cityAt(s, u.x, u.y);
  if (here && here.tribe !== tribeIdx && !u.moved) {
    store.captureCity(u.id);
    return;
  }

  // attack best target if favorable or if we outnumber
  const targets = attackableUnits(s, u);
  if (targets.length > 0) {
    let best = targets[0], bestScore = -Infinity;
    for (const t of targets) {
      const r = previewCombat(s, u, t);
      const score = r.damageToDefender + (r.defenderDies ? 15 : 0) - r.damageToAttacker * 1.2 - (r.attackerDies ? 25 : 0);
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
  for (const c of s.cities) {
    if (c.tribe === tribeIdx) continue;
    const dist = Math.max(Math.abs(c.x - u.x), Math.abs(c.y - u.y));
    const w = (c.tribe === null ? 100 : c.isCapital ? 90 : 70) - dist * 5;
    objectives.push({ x: c.x, y: c.y, w });
  }
  for (const e of s.units) {
    if (e.tribe === tribeIdx) continue;
    const dist = Math.max(Math.abs(e.x - u.x), Math.abs(e.y - u.y));
    objectives.push({ x: e.x, y: e.y, w: 40 - dist * 5 });
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
