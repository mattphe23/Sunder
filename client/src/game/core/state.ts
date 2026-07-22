// Polyforge central game state store — framework-agnostic, event-emitting.
// React subscribes via getSnapshot/subscribe; Babylon render layer listens to events.

import { generateMap, claimBorders, rng } from "./mapgen";
import {
  GameState, Tribe, Unit, UnitType, UNIT_STATS, TRIBE_DEFS, TechId,
  Difficulty, idx, PORT_COST, TECHS, RecapEntry,
} from "./types";
import {
  reachableTiles, attackableUnits, previewCombat, techCost, canResearch,
  canHarvest, harvestCost, starIncome, tileAt, unitAt, cityAt, trainableUnits,
  POP_PER_LEVEL, canBuildPort,
} from "./rules";
import { runAiTurn } from "./ai";

export type GameEvent =
  | { type: "changed" }
  | { type: "unitMoved"; unitId: number; fromX: number; fromY: number; toX: number; toY: number }
  | { type: "combat"; attackerId: number; defenderId: number; dmg: number; retaliation: number; defenderDied: boolean; attackerDied: boolean; ax: number; ay: number; dx: number; dy: number }
  | { type: "captured"; cityId: number; tribe: number }
  | { type: "turnStarted"; tribe: number };

type Listener = (e: GameEvent) => void;

const SAVE_KEY = "polyforge-save-v1";

/** Battle preview shown before committing an attack. */
export interface PendingAttack {
  attackerId: number;
  defenderId: number;
  dmg: number;
  retaliation: number;
  defenderDies: boolean;
  attackerDies: boolean;
  dx: number;
  dy: number;
}

class GameStore {
  state: GameState = emptyState();
  /** Non-persisted UI state: attack awaiting confirmation. */
  pendingAttack: PendingAttack | null = null;
  private listeners = new Set<Listener>();
  private snapshotVersion = 0;

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = () => this.snapshotVersion;

  emit(e: GameEvent) {
    if (e.type === "changed" || true) this.snapshotVersion++;
    this.listeners.forEach((fn) => fn(e));
    if (e.type === "changed") this.autoSave();
  }

  // ---------- persistence ----------

  private autoSave() {
    const s = this.state;
    try {
      if (s.phase === "playing") {
        localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      } else if (s.phase === "gameover" || s.phase === "menu") {
        localStorage.removeItem(SAVE_KEY);
      }
    } catch {
      // storage unavailable (private mode/quota) — play without persistence
    }
  }

  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  /** Peek at saved metadata for the Continue button label. */
  savedSummary(): { turn: number; tribeName: string; difficulty: string } | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as GameState;
      return { turn: s.turn + 1, tribeName: s.tribes[s.humanTribe]?.name ?? "?", difficulty: s.difficulty };
    } catch {
      return null;
    }
  }

  continueGame(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw) as GameState;
      if (!s || s.phase !== "playing" || !Array.isArray(s.tiles) || s.tiles.length === 0) return false;
      s.selectedUnitId = null;
      s.selectedCityId = null;
      s.aiThinking = false;
      this.state = s;
      this.pendingAttack = null;
      this.emit({ type: "changed" });
      // if the save happened mid-AI-round, resume AI turns
      if (s.currentTribe !== s.humanTribe) {
        const tribe = s.tribes[s.currentTribe];
        if (tribe && !tribe.isHuman && tribe.alive) {
          this.state.aiThinking = true;
          setTimeout(() => {
            runAiTurn(this, this.state.currentTribe);
            this.state.aiThinking = false;
            if (this.state.phase === "playing") this.endTurn();
          }, 350);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  // ---------- lifecycle ----------

  newGame(opts: { size: number; humanTribe: number; difficulty: Difficulty; seed?: number }) {
    const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
    const { tiles, cities } = generateMap(opts.size, seed, TRIBE_DEFS.length);
    const tribes: Tribe[] = TRIBE_DEFS.map((d, i) => ({
      index: i,
      name: d.name,
      color: d.color,
      colorName: d.colorName,
      passive: d.passive,
      passiveDesc: d.passiveDesc,
      isHuman: i === opts.humanTribe,
      stars: 5,
      techs: [d.startTech],
      alive: true,
      score: 0,
    }));
    const units: Unit[] = [];
    let nextUnitId = 1;
    for (const c of cities) {
      if (c.tribe === null) continue;
      units.push(makeUnit(nextUnitId++, "warrior", c.tribe, c.x, c.y));
    }
    this.state = {
      ...emptyState(),
      phase: "playing",
      size: opts.size,
      seed,
      difficulty: opts.difficulty,
      tribes,
      tiles,
      cities,
      units,
      nextUnitId,
      humanTribe: opts.humanTribe,
      currentTribe: 0,
    };
    this.exploreAround();
    this.beginTurn(0);
    this.emit({ type: "changed" });
  }

  toMenu() {
    this.state = emptyState();
    this.pendingAttack = null;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
    this.emit({ type: "changed" });
  }

  // ---------- turn flow ----------

  beginTurn(tribeIdx: number) {
    const s = this.state;
    s.currentTribe = tribeIdx;
    const tribe = s.tribes[tribeIdx];
    if (!tribe.alive) { this.nextTribe(); return; }
    // turn replay: show what rivals did while the human waited
    if (tribe.isHuman && s.recap.length > 0) {
      s.showRecap = true;
    }
    tribe.stars += starIncome(s, tribeIdx) + this.aiBonus(tribeIdx);
    for (const u of s.units) {
      if (u.tribe === tribeIdx) { u.moved = false; u.attacked = false; }
    }
    this.updateScore(tribeIdx);
    this.emit({ type: "turnStarted", tribe: tribeIdx });
    this.emit({ type: "changed" });
  }

  private aiBonus(tribeIdx: number): number {
    const s = this.state;
    const t = s.tribes[tribeIdx];
    if (t.isHuman) return 0;
    return s.difficulty === "easy" ? 0 : s.difficulty === "normal" ? 1 : 2;
  }

  endTurn() {
    const s = this.state;
    if (s.phase !== "playing") return;
    s.selectedUnitId = null;
    s.selectedCityId = null;
    this.pendingAttack = null;
    this.nextTribe();
  }

  private nextTribe() {
    const s = this.state;
    let next = s.currentTribe + 1;
    if (next >= s.tribes.length) {
      next = 0;
      s.turn++;
      if (s.turn >= s.maxTurns) { this.endByScore(); return; }
    }
    this.beginTurn(next);
    const tribe = s.tribes[next];
    if (!tribe.isHuman && tribe.alive && s.phase === "playing") {
      s.aiThinking = true;
      this.emit({ type: "changed" });
      // slight delay so the player sees AI turns happen
      setTimeout(() => {
        runAiTurn(this, next);
        s.aiThinking = false;
        if (this.state.phase === "playing") this.endTurn();
      }, 350);
    }
  }

  private endByScore() {
    const s = this.state;
    for (const t of s.tribes) this.updateScore(t.index);
    const alive = s.tribes.filter((t) => t.alive);
    alive.sort((a, b) => b.score - a.score);
    s.winner = alive[0]?.index ?? null;
    s.phase = "gameover";
    this.emit({ type: "changed" });
  }

  updateScore(tribeIdx: number) {
    const s = this.state;
    const t = s.tribes[tribeIdx];
    const cities = s.cities.filter((c) => c.tribe === tribeIdx);
    const units = s.units.filter((u) => u.tribe === tribeIdx);
    t.score =
      cities.length * 100 +
      cities.reduce((a, c) => a + c.level * 50, 0) +
      units.length * 10 +
      t.techs.length * 40;
  }

  // ---------- selection ----------

  selectUnit(unitId: number | null) {
    const s = this.state;
    s.selectedCityId = null;
    s.selectedUnitId = unitId;
    this.pendingAttack = null;
    this.emit({ type: "changed" });
  }

  selectCity(cityId: number | null) {
    const s = this.state;
    s.selectedUnitId = null;
    s.selectedCityId = cityId;
    this.pendingAttack = null;
    this.emit({ type: "changed" });
  }

  /** Stage an attack: compute the preview and wait for confirmation. */
  stageAttack(attackerId: number, defenderId: number) {
    const s = this.state;
    const a = s.units.find((q) => q.id === attackerId);
    const d = s.units.find((q) => q.id === defenderId);
    if (!a || !d) return;
    if (!attackableUnits(s, a).some((e) => e.id === defenderId)) return;
    const r = previewCombat(s, a, d);
    this.pendingAttack = {
      attackerId, defenderId,
      dmg: r.damageToDefender,
      retaliation: r.damageToAttacker,
      defenderDies: d.hp - r.damageToDefender <= 0,
      attackerDies: a.hp - r.damageToAttacker <= 0,
      dx: d.x, dy: d.y,
    };
    this.emit({ type: "changed" });
  }

  confirmAttack() {
    const p = this.pendingAttack;
    if (!p) return;
    this.pendingAttack = null;
    this.attack(p.attackerId, p.defenderId);
  }

  cancelAttack() {
    if (!this.pendingAttack) return;
    this.pendingAttack = null;
    this.emit({ type: "changed" });
  }

  /** record a recap entry when the acting tribe is not the human player */
  private recordRecap(entry: RecapEntry) {
    const s = this.state;
    if (s.tribes[entry.tribe]?.isHuman) return;
    s.recap.push(entry);
    if (s.recap.length > 12) s.recap.shift();
  }

  dismissRecap() {
    const s = this.state;
    s.showRecap = false;
    s.recap = [];
    this.emit({ type: "changed" });
  }

  /** roll and grant a ruin reward for the unit that stepped on a ruin */
  private exploreRuin(u: Unit) {
    const s = this.state;
    const t = tileAt(s, u.x, u.y);
    if (!t.ruin) return;
    t.ruin = false;
    const tribe = s.tribes[u.tribe];
    const roll = rng(s.seed + s.turn * 97 + u.x * 13 + u.y * 31)();
    let msg: string;
    if (roll < 0.5) {
      const stars = 5 + Math.floor(roll * 10); // 5–9 stars
      tribe.stars += stars;
      msg = `${tribe.name} found ${stars} stars in ancient ruins!`;
    } else if (roll < 0.8) {
      const unknown = TECHS.filter((q) => !tribe.techs.includes(q.id) && (q.requires === null || tribe.techs.includes(q.requires)));
      if (unknown.length > 0) {
        const pick = unknown[Math.floor(roll * 100) % unknown.length];
        tribe.techs.push(pick.id);
        msg = `${tribe.name} learned ${pick.name} from ancient ruins!`;
      } else {
        tribe.stars += 6;
        msg = `${tribe.name} found 6 stars in ancient ruins!`;
      }
    } else {
      // free unit on or near the ruin
      const spot = this.freeSpotNear(u.x, u.y);
      if (spot) {
        const nu = makeUnit(s.nextUnitId++, "warrior", u.tribe, spot.x, spot.y);
        s.units.push(nu);
        msg = `A veteran Warrior joined ${tribe.name} at the ruins!`;
      } else {
        tribe.stars += 6;
        msg = `${tribe.name} found 6 stars in ancient ruins!`;
      }
    }
    s.log.unshift(msg);
    this.recordRecap({ kind: "ruin", text: msg, tribe: u.tribe });
    this.exploreAround();
  }

  private freeSpotNear(x: number, y: number): { x: number; y: number } | null {
    const s = this.state;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) continue;
        const t = s.tiles[idx(nx, ny, s.size)];
        if (t.terrain === "water" || t.terrain === "ocean" || t.terrain === "mountain") continue;
        if (!unitAt(s, nx, ny)) return { x: nx, y: ny };
      }
    }
    return null;
  }

  // ---------- actions ----------

  moveUnit(unitId: number, x: number, y: number) {
    const s = this.state;
    const u = s.units.find((q) => q.id === unitId);
    if (!u || u.moved) return;
    const legal = reachableTiles(s, u).some((t) => t.x === x && t.y === y);
    if (!legal) return;
    const fromX = u.x, fromY = u.y;
    u.x = x; u.y = y;
    u.moved = true;
    // naval: embark when entering water (port required by rules), disembark on land
    const destTerrain = tileAt(s, x, y).terrain;
    if (destTerrain === "water" || destTerrain === "ocean") {
      if (!u.boat) s.log.unshift(`${UNIT_STATS[u.type].name} embarked at the port.`);
      u.boat = true;
    } else if (u.boat) {
      u.boat = false;
      s.log.unshift(`${UNIT_STATS[u.type].name} came ashore.`);
    }
    const stats = UNIT_STATS[u.type];
    if (!stats.dash) u.attacked = true;
    if (u.boat) u.attacked = true; // boats cannot attack
    this.exploreRuin(u);
    this.exploreAround();
    this.emit({ type: "unitMoved", unitId, fromX, fromY, toX: x, toY: y });
    this.emit({ type: "changed" });
  }

  attack(attackerId: number, defenderId: number) {
    const s = this.state;
    const a = s.units.find((q) => q.id === attackerId);
    const d = s.units.find((q) => q.id === defenderId);
    if (!a || !d) return;
    if (!attackableUnits(s, a).some((e) => e.id === defenderId)) return;
    const result = previewCombat(s, a, d);
    const ax = a.x, ay = a.y, dxp = d.x, dyp = d.y;
    d.hp -= result.damageToDefender;
    a.hp -= result.damageToAttacker;
    a.attacked = true;
    a.moved = true;
    let defenderDied = false, attackerDied = false;
    if (d.hp <= 0) {
      s.units = s.units.filter((q) => q.id !== d.id);
      a.kills++;
      defenderDied = true;
    }
    if (a.hp <= 0) {
      s.units = s.units.filter((q) => q.id !== a.id);
      attackerDied = true;
    }
    this.emit({
      type: "combat", attackerId, defenderId,
      dmg: result.damageToDefender, retaliation: result.damageToAttacker,
      defenderDied, attackerDied, ax, ay, dx: dxp, dy: dyp,
    });
    // recap: rival combat involving the player or visible to them
    if (a.tribe !== s.humanTribe) {
      const aName = UNIT_STATS[a.type].name, dName = UNIT_STATS[d.type].name;
      const target = d.tribe === s.humanTribe ? `your ${dName}` : `${s.tribes[d.tribe].name}'s ${dName}`;
      const outcome = defenderDied ? "destroyed" : `hit (−${result.damageToDefender})`;
      this.recordRecap({ kind: "combat", text: `${s.tribes[a.tribe].name} ${aName} ${outcome} ${target}`, tribe: a.tribe });
    }
    this.checkElimination();
    this.emit({ type: "changed" });
  }

  buildPort(x: number, y: number) {
    const s = this.state;
    const tribeIdx = s.currentTribe;
    const t = tileAt(s, x, y);
    if (!canBuildPort(s, tribeIdx, t)) return;
    if (s.tribes[tribeIdx].stars < PORT_COST) return;
    s.tribes[tribeIdx].stars -= PORT_COST;
    t.port = tribeIdx;
    s.log.unshift(`${s.tribes[tribeIdx].name} built a port.`);
    this.emit({ type: "changed" });
  }

  captureCity(unitId: number) {
    const s = this.state;
    const u = s.units.find((q) => q.id === unitId);
    if (!u || u.moved || u.attacked) {
      // capture consumes the whole action; require fresh unit standing on city
    }
    if (!u) return;
    const city = cityAt(s, u.x, u.y);
    if (!city || city.tribe === u.tribe) return;
    const wasCapital = city.isCapital;
    const prevOwner = city.tribe;
    city.tribe = u.tribe;
    if (city.level === 0) city.level = 1;
    claimBorders(s.tiles, s.size, city);
    u.moved = true; u.attacked = true;
    s.log.unshift(`${s.tribes[u.tribe].name} captured ${city.name}!`);
    this.emit({ type: "captured", cityId: city.id, tribe: u.tribe });
    if (u.tribe !== s.humanTribe) {
      const kind: RecapEntry["kind"] = prevOwner === s.humanTribe ? "cityLost" : "capture";
      const suffix = prevOwner === s.humanTribe ? " — it was yours!" : "";
      this.recordRecap({ kind, text: `${s.tribes[u.tribe].name} captured ${city.name}${suffix}`, tribe: u.tribe });
    }
    if (wasCapital && prevOwner !== null) this.checkElimination();
    this.checkDominationWin();
    this.emit({ type: "changed" });
  }

  harvest(x: number, y: number) {
    const s = this.state;
    const tribeIdx = s.currentTribe;
    const t = tileAt(s, x, y);
    if (!canHarvest(s, tribeIdx, t)) return;
    s.tribes[tribeIdx].stars -= harvestCost(s, tribeIdx);
    const city = s.cities[t.ownerCityId!];
    t.resource = null;
    city.population++;
    if (city.population >= POP_PER_LEVEL) {
      city.population = 0;
      city.level++;
      s.log.unshift(`${city.name} grew to level ${city.level}!`);
    }
    this.emit({ type: "changed" });
  }

  research(tech: TechId) {
    const s = this.state;
    const tribeIdx = s.currentTribe;
    if (!canResearch(s, tribeIdx, tech)) return;
    s.tribes[tribeIdx].stars -= techCost(s, tribeIdx, tech);
    s.tribes[tribeIdx].techs.push(tech);
    this.emit({ type: "changed" });
  }

  train(cityId: number, type: UnitType) {
    const s = this.state;
    const city = s.cities[cityId];
    const tribeIdx = s.currentTribe;
    if (city.tribe !== tribeIdx) return;
    if (!trainableUnits(s, tribeIdx).includes(type)) return;
    const stats = UNIT_STATS[type];
    if (s.tribes[tribeIdx].stars < stats.cost) return;
    if (unitAt(s, city.x, city.y)) return;
    s.tribes[tribeIdx].stars -= stats.cost;
    const u = makeUnit(s.nextUnitId++, type, tribeIdx, city.x, city.y);
    u.moved = true; u.attacked = true; // freshly trained units act next turn
    s.units.push(u);
    this.exploreAround();
    this.emit({ type: "changed" });
  }

  // ---------- helpers ----------

  exploreAround() {
    const s = this.state;
    for (const u of s.units) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = u.x + dx, y = u.y + dy;
          if (x < 0 || y < 0 || x >= s.size || y >= s.size) continue;
          s.tiles[idx(x, y, s.size)].explored[u.tribe] = true;
        }
      }
    }
    for (const c of s.cities) {
      if (c.tribe === null) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = c.x + dx, y = c.y + dy;
          if (x < 0 || y < 0 || x >= s.size || y >= s.size) continue;
          s.tiles[idx(x, y, s.size)].explored[c.tribe] = true;
        }
      }
    }
  }

  checkElimination() {
    const s = this.state;
    for (const t of s.tribes) {
      if (!t.alive) continue;
      const hasCapital = s.cities.some((c) => c.tribe === t.index && c.isCapital);
      const hasAnyCity = s.cities.some((c) => c.tribe === t.index);
      if (!hasCapital && !hasAnyCity) {
        t.alive = false;
        s.units = s.units.filter((u) => u.tribe !== t.index);
        s.log.unshift(`${t.name} has fallen!`);
        this.recordRecap({ kind: "fallen", text: `${t.name} has fallen!`, tribe: t.index });
      }
    }
    this.checkDominationWin();
  }

  checkDominationWin() {
    const s = this.state;
    const alive = s.tribes.filter((t) => t.alive);
    if (alive.length === 1) {
      s.winner = alive[0].index;
      s.phase = "gameover";
    }
    const human = s.tribes[s.humanTribe];
    if (!human.alive && s.phase === "playing") {
      // player eliminated: game over immediately
      const best = alive.sort((a, b) => b.score - a.score)[0];
      s.winner = best?.index ?? null;
      s.phase = "gameover";
    }
  }
}

function makeUnit(id: number, type: UnitType, tribe: number, x: number, y: number): Unit {
  const stats = UNIT_STATS[type];
  return { id, type, tribe, x, y, hp: stats.hp, maxHp: stats.hp, moved: false, attacked: false, kills: 0, boat: false };
}

function emptyState(): GameState {
  return {
    phase: "menu",
    size: 11,
    seed: 0,
    turn: 0,
    maxTurns: 30,
    difficulty: "normal",
    currentTribe: 0,
    tribes: [],
    tiles: [],
    cities: [],
    units: [],
    nextUnitId: 1,
    selectedUnitId: null,
    selectedCityId: null,
    winner: null,
    log: [],
    humanTribe: 0,
    aiThinking: false,
    recap: [],
    showRecap: false,
  };
}

export const game = new GameStore();

// dev/testing convenience: expose the singleton store
if (typeof window !== "undefined") {
  (window as any).__polyforge = game;
}
