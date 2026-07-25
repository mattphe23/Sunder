// Sunder central game state store — framework-agnostic, event-emitting.
// React subscribes via getSnapshot/subscribe; Babylon render layer listens to events.

import { generateMap, claimBorders, rng, MapPreset } from "./mapgen";
import {
  GameState, Tribe, Unit, UnitType, UNIT_STATS, TRIBE_DEFS, TechId,
  Difficulty, idx, PORT_COST, WALL_COST, TECHS, RecapEntry, GUARDIAN_TRIBE,
  emptyStats, ReplayEntry, HeroPerkId, HERO_PERKS, HERO_PERK_POOL,
  HERO_XP_THRESHOLDS, HERO_MAX_LEVEL, HERO_XP, HERO_NAMES,
  City, CityReward, BuildingType, BUILDINGS, rewardChoicesForLevel, REWARD_INFO,
} from "./types";
import {
  reachableTiles, attackableUnits, previewCombat, combatModifiers, techCost, canResearch,
  canHarvest, harvestCost, starIncome, tileAt, unitAt, cityAt, trainableUnits,
  POP_PER_LEVEL, canBuildPort, portCost, wallCost, canBuild, atUnitCapacity,
  knockbackDestination, adjacencyPop, canQuake, quakeVictims, quakeWallTargets, QUAKE_DAMAGE,
} from "./rules";
import { runAiTurn } from "./ai";
import { evaluateAchievements, AchievementDef } from "./achievements";
import {
  atPeace, setPeace, peaceTurnsLeft, diploUsed, markDiploUsed, addGrudge,
  strengthOf, aiAcceptsPeace, aiPaysTribute, aiWantsPeaceWith, PEACE_TREATY_TURNS, TRIBUTE_AMOUNT,
} from "./diplomacy";
import { ChallengeKind, recordChallengeScore } from "./challenges";
import { CustomTribeConfig, customTribeDef, CUSTOM_DEF_INDEX } from "./customTribe";
import { runWorldPhase, worldUnitIntents, campAt } from "./events";
import { recordGameResult } from "./profile";
import { checkPathVictory } from "./victory";
import { evaluateMission, markMissionDone, computeMissionStars, recordMissionStars, type StarBreakdown } from "./story";
export type GameEvent =
  | { type: "changed" }
  | { type: "unitMoved"; unitId: number; fromX: number; fromY: number; toX: number; toY: number }
  | { type: "combat"; attackerId: number; defenderId: number; dmg: number; retaliation: number; defenderDied: boolean; attackerDied: boolean; ax: number; ay: number; dx: number; dy: number; knockback?: { x: number; y: number }; wallCrushed?: { x: number; y: number } }
  | { type: "quake"; unitId: number; x: number; y: number; victims: { id: number; x: number; y: number; died: boolean }[]; wallsBroken: { x: number; y: number }[] }
  | { type: "captured"; cityId: number; tribe: number }
  | { type: "turnStarted"; tribe: number }
  | { type: "focusTile"; x: number; y: number }
  | { type: "sfx"; name: "plunder" | "heal" | "promote" | "ruin" | "victory" | "defeat" | "catapult" | "treaty" | "levelup"; x?: number; y?: number };

type Listener = (e: GameEvent) => void;
const SAVE_KEY = "polyforge-save-v1";
const SLOT_KEY = "polyforge-active-slot";
export type SaveSlot = 1 | 2 | 3;
const slotKey = (slot: SaveSlot) => (slot === 1 ? SAVE_KEY : `${SAVE_KEY}:slot${slot}`);
/** Metadata shown on the menu's slot picker. */
export interface SlotSummary {
  turn: number;
  tribeName: string;
  difficulty: string;
  hotseat: boolean;
  players: number;
}

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
  modifiers: { text: string; side: "atk" | "def" }[];
}

class GameStore {
  state: GameState = emptyState();
  /** Non-persisted UI state: attack awaiting confirmation. */
  pendingAttack: PendingAttack | null = null;
  /** Which of the three save slots is active. Slot 1 maps to the legacy key. */
  activeSlot: SaveSlot = ((): SaveSlot => {
    try {
      const v = Number(localStorage.getItem(SLOT_KEY));
      return v === 2 || v === 3 ? (v as SaveSlot) : 1;
    } catch { return 1; }
  })();
  setActiveSlot(slot: SaveSlot) {
    if (slot === this.activeSlot) return;
    // leaving a running game: it stays saved in its own slot; reset to menu so the
    // in-memory state can never bleed into the newly selected slot via autoSave
    if (this.state.phase === "playing") {
      this.state = emptyState();
      this.pendingAttack = null;
    }
    this.activeSlot = slot;
    try { localStorage.setItem(SLOT_KEY, String(slot)); } catch { /* noop */ }
    this.snapshotVersion++;
    this.listeners.forEach((fn) => fn({ type: "changed" }));
  }
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
      // online matches live on the server, never in local save slots
      if (s.online) return;
      if (s.phase === "playing") {
        localStorage.setItem(slotKey(this.activeSlot), JSON.stringify(s));
      } else if (s.phase === "gameover") {
        localStorage.removeItem(slotKey(this.activeSlot));
      }
    } catch {
      // storage unavailable (private mode/quota) — play without persistence
    }
  }

  // ---------- v18 online (async multiplayer) ----------

  /** Full-state snapshot sent to the server after each online turn. */
  serializeState(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Load an opponent's submitted snapshot and repoint the local view at
   * `myTribe`. Used when an async match advances to our turn.
   */
  loadOnlineSnapshot(json: string, myTribe: number): boolean {
    try {
      const s = JSON.parse(json) as GameState;
      if (!s || !Array.isArray(s.tiles) || s.tiles.length === 0) return false;
      for (const t of s.tribes) if (t.defIndex === undefined) t.defIndex = t.index;
      s.selectedUnitId = null;
      s.selectedCityId = null;
      s.aiThinking = false;
      s.humanTribe = myTribe;
      // the remote player's pending hand-off is not ours to dismiss visually
      if (s.handoff !== null && s.handoff !== undefined && s.handoff === myTribe) s.handoff = null;
      this.state = s;
      this.pendingAttack = null;
      this.emit({ type: "changed" });
      return true;
    } catch {
      return false;
    }
  }

  hasSave(): boolean {
    try {
      return localStorage.getItem(slotKey(this.activeSlot)) !== null;
    } catch {
      return false;
    }
  }

  /** Peek at saved metadata for the Continue button label. */
  savedSummary(): { turn: number; tribeName: string; difficulty: string } | null {
    try {
      const raw = localStorage.getItem(slotKey(this.activeSlot));
      if (!raw) return null;
      const s = JSON.parse(raw) as GameState;
      return { turn: s.turn + 1, tribeName: s.tribes[s.humanTribe]?.name ?? "?", difficulty: s.difficulty };
    } catch {
      return null;
    }
  }

  /** Metadata for every slot, for the menu's slot picker. */
  slotSummaries(): (SlotSummary | null)[] {
    return ([1, 2, 3] as SaveSlot[]).map((slot) => {
      try {
        const raw = localStorage.getItem(slotKey(slot));
        if (!raw) return null;
        const s = JSON.parse(raw) as GameState;
        if (!s || s.phase !== "playing") return null;
        const humans = s.humanTribes ?? [s.humanTribe];
        return {
          turn: s.turn + 1,
          tribeName: humans.length > 1
            ? humans.map((h) => s.tribes[h]?.name ?? "?").join(" · ")
            : s.tribes[s.humanTribe]?.name ?? "?",
          difficulty: s.difficulty,
          hotseat: humans.length > 1,
          players: humans.length,
        };
      } catch {
        return null;
      }
    });
  }

  continueGame(): boolean {
    try {
      const raw = localStorage.getItem(slotKey(this.activeSlot));
      if (!raw) return false;
      const s = JSON.parse(raw) as GameState;
      if (!s || s.phase !== "playing" || !Array.isArray(s.tiles) || s.tiles.length === 0) return false;
      // legacy saves predate the 6-tribe roster: defIndex mirrors slot index
      for (const t of s.tribes) if (t.defIndex === undefined) t.defIndex = t.index;
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
          }, 150);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  // ---------- lifecycle ----------

  newGame(opts: { size: number; humanTribe: number; difficulty: Difficulty; seed?: number; preset?: MapPreset; humanTribes?: number[]; challenge?: ChallengeKind; roster?: number[]; custom?: { slot: number; config: CustomTribeConfig }; friendChallenge?: { name: string; score: number }; online?: { matchId: string; hostTribe: number; guestTribe: number; hostName: string; guestName: string }; storyMission?: string }) {
    const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
    const preset: MapPreset = opts.preset ?? "continents";
    const humans = opts.humanTribes && opts.humanTribes.length > 0 ? [...opts.humanTribes].sort((a, b) => a - b) : [opts.humanTribe];
    // roster: which of the 6 TRIBE_DEFS play this match (slot i is def roster[i]).
    // Local games use 4 tribes; online 1v1 uses exactly 2 (no AI in async matches);
    // story missions script 2-4 tribes per battle.
    const roster = opts.roster && opts.roster.length >= 2 && opts.roster.length <= 4 ? opts.roster : [0, 1, 2, 3];
    const { tiles, cities } = generateMap(opts.size, seed, roster.length, preset);
    const tribes: Tribe[] = roster.map((di, i) => {
      const isCustom = !!opts.custom && opts.custom.slot === i;
      const d = isCustom ? customTribeDef(opts.custom!.config) : TRIBE_DEFS[di];
      return {
        index: i,
        defIndex: isCustom ? CUSTOM_DEF_INDEX : di,
        customUnique: isCustom ? opts.custom!.config.uniqueUnit : undefined,
        name: d.name,
        color: d.color,
        colorName: d.colorName,
        passive: d.passive,
        passiveDesc: d.passiveDesc,
        isHuman: humans.includes(i),
        // v28 balance: Scholars tribes start +2 stars — playtests showed the tech
        // discount pays off too late against early aggression/plunder economies.
        stars: d.passive === "scholars" ? 7 : 5,
        techs: [d.startTech as TechId],
        alive: true,
        score: 0,
      };
    });
    const units: Unit[] = [];
    let nextUnitId = 1;
    for (const c of cities) {
      if (c.tribe === null) continue;
      units.push(makeUnit(nextUnitId++, "warrior", c.tribe, c.x, c.y));
      // v16: each tribe's levelling Commander marches beside the capital
      const spot = nearestFreeLand(tiles, opts.size, units, c.x, c.y);
      if (spot) {
        const h = makeUnit(nextUnitId++, "hero", c.tribe, spot.x, spot.y);
        h.hero = true; h.xp = 0; h.level = 1; h.perks = [];
        units.push(h);
      }
    }
    // neutral guardians on great ruins: tough stationary defenders
    for (const t of tiles) {
      if (!t.greatRuin) continue;
      const g = makeUnit(nextUnitId++, "swordsman", GUARDIAN_TRIBE, t.x, t.y);
      g.guardian = true;
      g.moved = true;
      g.attacked = true; // guardians never act — they only retaliate
      units.push(g);
    }
    this.state = {
      ...emptyState(),
      phase: "playing",
      size: opts.size,
      seed,
      preset,
      challenge: opts.challenge,
      friendChallenge: opts.friendChallenge ?? null,
      online: opts.online ?? null,
      storyMission: opts.storyMission,
      showIntro: humans.length === 1,
      difficulty: opts.difficulty,
      tribes,
      tiles,
      cities,
      units,
      nextUnitId,
      humanTribe: humans[0],
      humanTribes: humans,
      handoff: humans.length > 1 ? humans[0] : null,
      currentTribe: 0,
    };
    this.state.stats = tribes.map(() => emptyStats());
    this.state.peaceUntil = {};
    this.state.diploUsed = [];
    this.state.grudges = [];
    this.state.incomingOffer = null;
    this.state.replay = [];
    // v17 living map + drama + profile counters
    this.state.camps = [];
    this.state.storms = [];
    this.state.nextEventId = 1;
    this.state.worldEvents = [];
    this.state.heroFallen = null;
    this.state.campsRazedByHuman = 0;
    this.state.winPath = null;
    this.exploreAround();
    this.beginTurn(0);
    this.emit({ type: "changed" });
  }

  toMenu() {
    this.state = emptyState();
    this.pendingAttack = null;
    try { localStorage.removeItem(slotKey(this.activeSlot)); } catch { /* noop */ }
    this.emit({ type: "changed" });
  }

  // ---------- turn flow ----------

  beginTurn(tribeIdx: number) {
    const s = this.state;
    s.currentTribe = tribeIdx;
    const tribe = s.tribes[tribeIdx];
    if (!tribe.alive) { this.nextTribe(); return; }
    // hot-seat: repoint the "viewing human" and block with a hand-off screen
    const hotseat = (s.humanTribes?.length ?? 1) > 1;
    if (hotseat && tribe.isHuman) {
      s.humanTribe = tribeIdx;
      s.handoff = tribeIdx;
      s.recap = []; // recaps are cross-player info leaks in hot-seat
      s.showRecap = false;
    }
    // score history: snapshot all tribes once per game turn (when tribe 0 begins)
    if (tribeIdx === 0) {
      for (const t of s.tribes) this.updateScore(t.index);
      s.scoreHistory[s.turn] = s.tribes.map((t) => (t.alive ? t.score : 0));
      this.recordReplay({ tribe: 0, kind: "turn", text: `Turn ${s.turn + 1} begins` });
      // v17 living map: the world takes its phase before the first tribe acts
      this.runWorldTurn();
      // v20: asymmetric faction victory paths — checked once per game turn
      this.checkVictoryPaths();
      if (s.phase !== "playing") return;
    }
    // turn replay: show what rivals did while the human waited
    if (!hotseat && tribe.isHuman && s.recap.length > 0) {
      s.showRecap = true;
    }
    const income = starIncome(s, tribeIdx) + this.aiBonus(tribeIdx);
    tribe.stars += income;
    this.bumpStat(tribeIdx, "starsEarned", income);
    // v29 siege visibility: tell the owner which cities produced nothing
    if (tribe.isHuman) {
      for (const c of s.cities) {
        if (c.tribe !== tribeIdx) continue;
        const occ = s.units.find((q) => q.x === c.x && q.y === c.y && q.tribe !== tribeIdx && q.tribe >= 0);
        if (occ) s.log.unshift(`${c.name} is under siege — it produced no stars this turn!`);
      }
    }
    for (const u of s.units) {
      if (u.tribe === tribeIdx) { u.moved = false; u.attacked = false; }
    }
    // Auren Arcanist: mends adjacent friendly units +2 HP at the start of the turn
    let healed = false;
    const healedAt: { x: number; y: number }[] = [];
    for (const a of s.units) {
      if (a.tribe !== tribeIdx || a.type !== "arcanist") continue;
      for (const f of s.units) {
        if (f.tribe !== tribeIdx || f.id === a.id || f.hp >= f.maxHp) continue;
        const d = Math.max(Math.abs(f.x - a.x), Math.abs(f.y - a.y));
        if (d === 1) { f.hp = Math.min(f.maxHp, f.hp + 2); healed = true; healedAt.push({ x: f.x, y: f.y }); }
      }
    }
    // v16 hero Mender perk: the commander recovers +3 HP at turn start
    for (const h of s.units) {
      if (h.tribe !== tribeIdx || !h.hero || !(h.perks?.includes("mender"))) continue;
      if (h.hp < h.maxHp) { h.hp = Math.min(h.maxHp, h.hp + 3); healed = true; healedAt.push({ x: h.x, y: h.y }); }
    }
    // Mycelon Sporebound: units resting in friendly territory knit flesh with spores (+2 HP)
    if (tribe.passive === "sporebound") {
      for (const u of s.units) {
        if (u.tribe !== tribeIdx || u.hp >= u.maxHp || u.guardian) continue;
        const t = s.tiles[u.y * s.size + u.x];
        const owner = t.ownerCityId != null ? s.cities.find((c) => c.id === t.ownerCityId) : null;
        if (owner && owner.tribe === tribeIdx) {
          u.hp = Math.min(u.maxHp, u.hp + 2);
          healed = true;
          healedAt.push({ x: u.x, y: u.y });
        }
      }
    }
    if (healed && tribeIdx === s.humanTribe) {
      for (const p of healedAt) this.emit({ type: "sfx", name: "heal", x: p.x, y: p.y });
    }
    this.updateScore(tribeIdx);
    this.emit({ type: "turnStarted", tribe: tribeIdx });
    this.emit({ type: "changed" });
  }

  private aiBonus(tribeIdx: number): number {
    const s = this.state;
    const t = s.tribes[tribeIdx];
    if (t.isHuman) return 0;
    // impossible plays with NO income cheat — it wins by playing better
    return s.difficulty === "easy" ? 0 : s.difficulty === "normal" ? 1 : s.difficulty === "hard" ? 2 : 0;
  }

  /* ---------- v17 living map ---------- */

  /** advance the living world: camps grow/raid, storms drift, guardians wake, hostiles act */
  private runWorldTurn() {
    const s = this.state;
    const events = runWorldPhase(s, (type, tribe, x, y) => makeUnit(s.nextUnitId++, type, tribe, x, y));
    for (const ev of events) {
      s.log.unshift(ev.text);
      s.worldEvents = [...(s.worldEvents ?? []), ev].slice(-8);
      this.recordReplay({ tribe: -1, kind: "turn", text: ev.text });
    }
    // hostile world units act: raiders + awakened guardians step/strike
    for (const u of s.units) {
      if (u.tribe < 0 && (u.raider || u.awake)) { u.moved = false; u.attacked = false; }
    }
    for (const intent of worldUnitIntents(s)) {
      const u = s.units.find((q) => q.id === intent.unit.id);
      if (!u) continue;
      if (intent.targetUnitId !== undefined) {
        const target = s.units.find((q) => q.id === intent.targetUnitId);
        if (target) this.attack(u.id, target.id);
      } else if (intent.move) {
        u.x = intent.move.x;
        u.y = intent.move.y;
      }
    }
  }

  /** world events queued for display; drained by the HUD event cards */
  drainWorldEvents(): NonNullable<GameState["worldEvents"]> {
    const s = this.state;
    const evs = s.worldEvents ?? [];
    s.worldEvents = [];
    return evs;
  }

  endTurn() {
    const s = this.state;
    if (s.phase !== "playing") return;
    if (s.pendingCityReward != null) return; // v35: resolve the level-up choice first
    s.selectedUnitId = null;
    this.lastMove = null;
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
      // v29 QoL: Polytopia complaint — waiting on AI turns drags the pace.
      // 150ms keeps the "rivals are acting" beat readable; when no human is
      // still alive (spectating a wipeout) drop to 60ms to fast-forward.
      const humanAlive = s.tribes.some((t) => t.isHuman && t.alive);
      const delay = humanAlive ? 150 : 60;
      setTimeout(() => {
        runAiTurn(this, next);
        s.aiThinking = false;
        if (this.state.phase === "playing") this.endTurn();
      }, delay);
    }
  }

  private endByScore() {
    const s = this.state;
    for (const t of s.tribes) this.updateScore(t.index);
    const alive = s.tribes.filter((t) => t.alive);
    alive.sort((a, b) => b.score - a.score);
    s.winner = alive[0]?.index ?? null;
    s.phase = "gameover";
    this.recordVictory();
    this.onGameOver();
    this.emit({ type: "sfx", name: s.winner === s.humanTribe ? "victory" : "defeat" });
    this.emit({ type: "changed" });
  }

  /** v20: end the match when a tribe completes its asymmetric faction path */
  private checkVictoryPaths() {
    const s = this.state;
    if (s.phase !== "playing") return;
    for (const t of s.tribes) this.updateScore(t.index); // ascendance path reads score
    const hit = checkPathVictory(s);
    if (!hit) return;
    const { def } = hit.progress;
    s.winner = hit.tribe;
    s.winPath = { pathId: def.id, pathName: def.name, flavor: def.flavor };
    s.phase = "gameover";
    s.log.unshift(`${s.tribes[hit.tribe].name} achieved ${def.name}!`);
    this.recordReplay({ tribe: hit.tribe, kind: "turn", text: `${s.tribes[hit.tribe].name} achieved the ${def.name} victory` });
    this.recordVictory();
    this.onGameOver();
    this.emit({ type: "sfx", name: s.winner === s.humanTribe ? "victory" : "defeat" });
    this.emit({ type: "changed" });
  }

  updateScore(tribeIdx: number) {
    const s = this.state;
    if (tribeIdx < 0) return;
    const t = s.tribes[tribeIdx];
    const cities = s.cities.filter((c) => c.tribe === tribeIdx);
    const units = s.units.filter((u) => u.tribe === tribeIdx);
    t.score =
      cities.length * 100 +
      cities.reduce((a, c) => a + c.level * 50, 0) +
      units.length * 10 +
      t.techs.length * 40 +
      // v29 anti-turtling: offense earns points — every battle won counts, so a
      // camped equal-size empire scores lower than an aggressive one (Polytopia
      // rewards conquest; this is our equivalent lever)
      (s.stats?.[tribeIdx]?.battlesWon ?? 0) * 8 +
      // v17 hero stakes: a living commander earns their keep; a fallen one is a lasting wound
      units.filter((u) => u.hero).reduce((a, u) => a + 15 + ((u.level ?? 1) - 1) * 15, 0) -
      (t.heroFell ? 40 : 0);
  }

  // ---------- selection ----------

  selectUnit(unitId: number | null) {
    const s = this.state;
    s.selectedCityId = null;
    s.selectedUnitId = unitId;
    this.pendingAttack = null;
    this.emit({ type: "changed" });
  }

  /** v29 QoL: ids of the human tribe's units that can still act this turn. */
  unitsWithMoves(): number[] {
    const s = this.state;
    if (s.phase !== "playing" || s.currentTribe !== s.humanTribe) return [];
    return s.units
      .filter((u) => u.tribe === s.humanTribe && !u.guardian && (!u.moved || !u.attacked))
      .map((u) => u.id);
  }

  /** v29 QoL: cycle selection to the next unit with moves left and pan to it. */
  nextUnit() {
    const s = this.state;
    const ids = this.unitsWithMoves();
    if (ids.length === 0) return;
    const cur = s.selectedUnitId;
    const at = cur == null ? -1 : ids.indexOf(cur);
    const nextId = ids[(at + 1) % ids.length];
    s.selectedCityId = null;
    s.selectedUnitId = nextId;
    this.pendingAttack = null;
    this.emit({ type: "changed" });
    const u = s.units.find((q) => q.id === nextId);
    if (u) this.emit({ type: "focusTile", x: u.x, y: u.y });
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
      modifiers: combatModifiers(s, a, d),
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

  /* ---------- v16 heroes: XP, level-ups, perk picks ---------- */

  /** hero display name (flavor by roster def, falls back to Commander) */
  heroName(u: Unit): string {
    const s = this.state;
    const di = s.tribes[u.tribe]?.defIndex ?? -1;
    return (di >= 0 && di < HERO_NAMES.length ? HERO_NAMES[di] : "The Commander");
  }

  /** award XP to a hero; queue perk choices on level-up */
  private grantXp(u: Unit, amount: number) {
    const s = this.state;
    if (!u.hero || s.phase !== "playing") return;
    u.xp = (u.xp ?? 0) + amount;
    let level = u.level ?? 1;
    while (level < HERO_MAX_LEVEL && (u.xp ?? 0) >= HERO_XP_THRESHOLDS[level - 1]) {
      u.xp = (u.xp ?? 0) - HERO_XP_THRESHOLDS[level - 1];
      level++;
      u.level = level;
      const name = this.heroName(u);
      s.log.unshift(`${name} reached level ${level}!`);
      this.emit({ type: "sfx", name: "levelup", x: u.x, y: u.y });
      if (s.tribes[u.tribe]?.isHuman && u.tribe === s.humanTribe) {
        s.pendingPerk = u.id; // human picks from the modal; queue persists across saves
      } else {
        // AI (or off-seat human in hot-seat AI turns) auto-picks a seeded perk
        const opts = this.perkChoices(u);
        if (opts.length > 0) {
          const roll = rng(s.seed + s.turn * 53 + u.id * 19 + level * 7)();
          const pick = opts[Math.floor(roll * opts.length)];
          u.perks = [...(u.perks ?? []), pick];
          if (pick === "titan") { u.maxHp += 6; u.hp = Math.min(u.maxHp, u.hp + 6); }
          if (u.tribe !== s.humanTribe) {
            this.recordRecap({ kind: "combat", text: `${s.tribes[u.tribe]?.name}'s commander grew stronger (${HERO_PERKS[pick].name})`, tribe: u.tribe });
          }
        }
      }
    }
  }

  /** the 3 perk options offered for a hero's pending level-up (seeded, from unpicked pool) */
  perkChoices(u: Unit): HeroPerkId[] {
    const s = this.state;
    const taken = new Set(u.perks ?? []);
    const pool = HERO_PERK_POOL.filter((p) => !taken.has(p));
    // seeded shuffle for determinism (same save → same offer)
    const r = rng(s.seed + (u.level ?? 1) * 101 + u.id * 37);
    const shuffled = [...pool].sort(() => r() - 0.5);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  /** human resolves the pending perk choice */
  choosePerk(perk: HeroPerkId) {
    const s = this.state;
    if (!s.pendingPerk) return;
    const u = s.units.find((q) => q.id === s.pendingPerk);
    s.pendingPerk = null;
    if (u && u.hero && !(u.perks ?? []).includes(perk) && this.perkChoicesCache(u).includes(perk)) {
      u.perks = [...(u.perks ?? []), perk];
      if (perk === "titan") { u.maxHp += 6; u.hp = Math.min(u.maxHp, u.hp + 6); }
      s.log.unshift(`${this.heroName(u)} learned ${HERO_PERKS[perk].name}!`);
      this.emit({ type: "sfx", name: "promote", x: u.x, y: u.y });
    }
    this.emit({ type: "changed" });
  }
  /** validated option list for the pending pick (same seeded derivation) */
  private perkChoicesCache(u: Unit): HeroPerkId[] { return this.perkChoices(u); }

  /* ---------- v17 hero death drama ---------- */

  /** stage the fallen-commander event card when the human is involved (their hero died, or they slew a rival's) */
  private stageHeroFallen(fallen: Unit, killer: Unit) {
    const s = this.state;
    const wasHuman = fallen.tribe === s.humanTribe;
    const humanKilled = killer.tribe === s.humanTribe;
    if (!wasHuman && !humanKilled) return; // AI-vs-AI drama goes through recap only
    const killerName = killer.tribe >= 0 ? s.tribes[killer.tribe].name : "the wilds";
    const taunts = wasHuman
      ? [
          `"Your commander bleeds like any other." — ${killerName}`,
          `"The Shatterlands remember only the victors." — ${killerName}`,
          `"Send another. We will break them too." — ${killerName}`,
        ]
      : [
          `Their banner falls. The ${s.tribes[fallen.tribe].name} host wavers without its commander.`,
          `A rival legend ends at your hand. The Shatterlands take note.`,
          `The forge claims all — even commanders.`,
        ];
    const roll = rng(s.seed + s.turn * 61 + fallen.id * 13)();
    s.heroFallen = {
      heroName: this.heroName(fallen),
      tribeName: s.tribes[fallen.tribe].name,
      tribeColor: s.tribes[fallen.tribe].color,
      killerTribe: killerName,
      wasHuman,
      taunt: taunts[Math.floor(roll * taunts.length)],
    };
    this.emit({ type: "sfx", name: wasHuman ? "defeat" : "victory" });
  }

  dismissHeroFallen() {
    this.state.heroFallen = null;
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

  dismissIntro() {
    this.state.showIntro = false;
    this.emit({ type: "changed" });
  }

  // ---------- replay recording ----------

  /** append a compact entry to the match replay log (capped to protect save size) */
  recordReplay(e: Omit<ReplayEntry, "turn">) {
    const s = this.state;
    if (!s.replay) s.replay = [];
    s.replay.push({ turn: s.turn + 1, ...e });
    if (s.replay.length > 2000) s.replay.splice(0, s.replay.length - 2000);
  }

  // ---------- diplomacy ----------

  /** can the current human take a diplomatic action toward `other` this turn? */
  canDiplo(other: number): boolean {
    const s = this.state;
    if (s.phase !== "playing" || s.currentTribe !== s.humanTribe) return false;
    if (other === s.humanTribe || !s.tribes[other]?.alive) return false;
    if (s.tribes[other].isHuman) return false; // human↔human diplomacy not in scope
    return !diploUsed(s, s.humanTribe, other);
  }

  /** human offers a peace treaty to an AI rival */
  offerPeace(other: number): { accepted: boolean; reason: string } | null {
    const s = this.state;
    if (!this.canDiplo(other)) return null;
    if (atPeace(s, s.humanTribe, other)) return null;
    markDiploUsed(s, s.humanTribe, other);
    const res = aiAcceptsPeace(s, other, s.humanTribe);
    if (res.accept) {
      setPeace(s, s.humanTribe, other, s.turn + PEACE_TREATY_TURNS);
      s.log.unshift(`Peace treaty signed with ${s.tribes[other].name} (${PEACE_TREATY_TURNS} turns).`);
      this.recordReplay({ tribe: s.humanTribe, kind: "diplo", text: `Peace signed: ${s.tribes[s.humanTribe].name} & ${s.tribes[other].name}` });
      this.emit({ type: "sfx", name: "treaty" });
    } else {
      s.log.unshift(`${s.tribes[other].name} rejected the peace offer.`);
      this.recordReplay({ tribe: s.humanTribe, kind: "diplo", text: `${s.tribes[other].name} rejected ${s.tribes[s.humanTribe].name}'s peace offer` });
    }
    this.emit({ type: "changed" });
    return { accepted: res.accept, reason: res.reason };
  }

  /** human demands tribute (stars) from an AI rival */
  demandTribute(other: number): { paid: boolean; amount: number; reason: string } | null {
    const s = this.state;
    if (!this.canDiplo(other)) return null;
    markDiploUsed(s, s.humanTribe, other);
    const res = aiPaysTribute(s, other, s.humanTribe);
    if (res.pay) {
      s.tribes[other].stars -= res.amount;
      s.tribes[s.humanTribe].stars += res.amount;
      this.bumpStat(s.humanTribe, "starsEarned", res.amount);
      s.log.unshift(`${s.tribes[other].name} paid ${res.amount}★ in tribute!`);
      this.recordReplay({ tribe: s.humanTribe, kind: "diplo", text: `${s.tribes[other].name} paid ${res.amount}★ tribute to ${s.tribes[s.humanTribe].name}` });
      this.emit({ type: "sfx", name: "plunder" });
    } else {
      s.log.unshift(`${s.tribes[other].name} refused to pay tribute.`);
      this.recordReplay({ tribe: s.humanTribe, kind: "diplo", text: `${s.tribes[other].name} refused ${s.tribes[s.humanTribe].name}'s tribute demand` });
    }
    this.emit({ type: "changed" });
    return { paid: res.pay, amount: res.amount, reason: res.reason };
  }

  /** human answers an incoming AI peace offer */
  respondToOffer(accept: boolean) {
    const s = this.state;
    const offer = s.incomingOffer;
    if (!offer) return;
    s.incomingOffer = null;
    if (accept) {
      setPeace(s, offer.to, offer.from, s.turn + PEACE_TREATY_TURNS);
      s.log.unshift(`Peace treaty signed with ${s.tribes[offer.from].name} (${PEACE_TREATY_TURNS} turns).`);
      this.recordReplay({ tribe: offer.from, kind: "diplo", text: `Peace signed: ${s.tribes[offer.from].name} & ${s.tribes[offer.to].name}` });
      this.emit({ type: "sfx", name: "treaty" });
    } else {
      s.log.unshift(`You rejected ${s.tribes[offer.from].name}'s peace offer.`);
      this.recordReplay({ tribe: offer.to, kind: "diplo", text: `${s.tribes[offer.to].name} rejected ${s.tribes[offer.from].name}'s peace offer` });
    }
    this.emit({ type: "changed" });
  }

  /** human gifts stars to an AI rival — clears a grudge and warms relations */
  giftStars(other: number, amount = 3): boolean {
    const s = this.state;
    if (!this.canDiplo(other)) return false;
    if (s.tribes[s.humanTribe].stars < amount) return false;
    markDiploUsed(s, s.humanTribe, other);
    s.tribes[s.humanTribe].stars -= amount;
    s.tribes[other].stars += amount;
    // clear any grudge the recipient holds against the giver
    s.grudges = (s.grudges ?? []).filter((g) => !(g.holder === other && g.against === s.humanTribe));
    s.log.unshift(`You gifted ${amount}★ to ${s.tribes[other].name}. Relations warm.`);
    this.recordReplay({ tribe: s.humanTribe, kind: "diplo", text: `${s.tribes[s.humanTribe].name} gifted ${amount}★ to ${s.tribes[other].name}` });
    this.emit({ type: "changed" });
    return true;
  }

  /** UI helpers for the diplomacy panel */
  relationWith(other: number): { atPeace: boolean; turnsLeft: number; strengthRatio: number } {
    const s = this.state;
    return {
      atPeace: atPeace(s, s.humanTribe, other),
      turnsLeft: peaceTurnsLeft(s, s.humanTribe, other),
      strengthRatio: strengthOf(s, other) / Math.max(1, strengthOf(s, s.humanTribe)),
    };
  }

  /** hot-seat: the next player has taken the device and reveals their board */
  confirmHandoff() {
    this.state.handoff = null;
    this.emit({ type: "changed" });
  }

  /** increment a per-tribe match statistic (safe for guardians / legacy saves) */
  private bumpStat(tribeIdx: number, key: keyof ReturnType<typeof emptyStats>, amount = 1) {
    const s = this.state;
    if (tribeIdx < 0) return;
    if (!s.stats) s.stats = s.tribes.map(() => emptyStats());
    if (!s.stats[tribeIdx]) s.stats[tribeIdx] = emptyStats();
    s.stats[tribeIdx][key] += amount;
  }

  /** v28 anti-snowball: star payouts from ruins taper with each ruin a tribe has
   *  already claimed (×0.75 per prior claim, floor 40%) — playtests showed a
   *  ruin-rush economy snowballing one tribe far ahead of the field. */
  private ruinTaper(tribeIdx: number, stars: number): number {
    const claimed = this.state.stats?.[tribeIdx]?.ruinsClaimed ?? 0;
    const mult = Math.max(0.4, Math.pow(0.75, claimed));
    return Math.max(2, Math.round(stars * mult));
  }

  /** roll and grant a ruin reward for the unit that stepped on a ruin */
  private exploreRuin(u: Unit) {
    const s = this.state;
    const t = tileAt(s, u.x, u.y);
    if (t.greatRuin) { this.exploreGreatRuin(u, t); return; }
    if (!t.ruin) return;
    t.ruin = false;
    if (u.tribe === s.humanTribe) this.emit({ type: "sfx", name: "ruin" });
    const tribe = s.tribes[u.tribe];
    const roll = rng(s.seed + s.turn * 97 + u.x * 13 + u.y * 31)();
    let msg: string;
    if (roll < 0.5) {
      const stars = this.ruinTaper(u.tribe, 5 + Math.floor(roll * 10)); // 5–9 stars, tapered
      tribe.stars += stars;
      this.bumpStat(u.tribe, "starsEarned", stars);
      msg = `${tribe.name} found ${stars} stars in ancient ruins!`;
    } else if (roll < 0.8) {
      const unknown = TECHS.filter((q) => !tribe.techs.includes(q.id) && (q.requires === null || tribe.techs.includes(q.requires)));
      if (unknown.length > 0) {
        const pick = unknown[Math.floor(roll * 100) % unknown.length];
        tribe.techs.push(pick.id);
        msg = `${tribe.name} learned ${pick.name} from ancient ruins!`;
      } else {
        const stars = this.ruinTaper(u.tribe, 6);
        tribe.stars += stars;
        msg = `${tribe.name} found ${stars} stars in ancient ruins!`;
      }
    } else {
      // free unit on or near the ruin
      const spot = this.freeSpotNear(u.x, u.y);
      if (spot) {
        const nu = makeUnit(s.nextUnitId++, "warrior", u.tribe, spot.x, spot.y);
        s.units.push(nu);
        msg = `A veteran Warrior joined ${tribe.name} at the ruins!`;
      } else {
        const stars = this.ruinTaper(u.tribe, 6);
        tribe.stars += stars;
        msg = `${tribe.name} found ${stars} stars in ancient ruins!`;
      }
    }
    s.log.unshift(msg);
    this.recordRecap({ kind: "ruin", text: msg, tribe: u.tribe });
    this.bumpStat(u.tribe, "ruinsClaimed");
    if (u.hero) this.grantXp(u, HERO_XP.ruin);
    this.exploreAround();
  }

  /** great ruin: bigger reward, reachable only after the guardian falls */
  private exploreGreatRuin(u: Unit, t: { greatRuin: boolean; x: number; y: number }) {
    const s = this.state;
    t.greatRuin = false;
    const tribe = s.tribes[u.tribe];
    const roll = rng(s.seed + s.turn * 131 + u.x * 17 + u.y * 41)();
    let msg: string;
    if (roll < 0.45) {
      const stars = this.ruinTaper(u.tribe, 12 + Math.floor(roll * 14)); // 12–18 stars, tapered
      tribe.stars += stars;
      this.bumpStat(u.tribe, "starsEarned", stars);
      msg = `${tribe.name} claimed the Great Ruin — a hoard of ${stars} stars!`;
    } else if (roll < 0.75) {
      const unknown = TECHS.filter((q) => !tribe.techs.includes(q.id) && (q.requires === null || tribe.techs.includes(q.requires)));
      if (unknown.length > 0) {
        const pick = unknown[Math.floor(roll * 100) % unknown.length];
        tribe.techs.push(pick.id);
        const stars = this.ruinTaper(u.tribe, 8);
        tribe.stars += stars;
        msg = `${tribe.name} claimed the Great Ruin — ${pick.name} and ${stars} stars!`;
      } else {
        const stars = this.ruinTaper(u.tribe, 15);
        tribe.stars += stars;
        msg = `${tribe.name} claimed the Great Ruin — ${stars} stars!`;
      }
    } else {
      const spot = this.freeSpotNear(u.x, u.y);
      if (spot) {
        const nu = makeUnit(s.nextUnitId++, "swordsman", u.tribe, spot.x, spot.y);
        s.units.push(nu);
        const stars = this.ruinTaper(u.tribe, 5);
        tribe.stars += stars;
        msg = `${tribe.name} claimed the Great Ruin — a veteran Swordsman and ${stars} stars!`;
      } else {
        const stars = this.ruinTaper(u.tribe, 15);
        tribe.stars += stars;
        msg = `${tribe.name} claimed the Great Ruin — ${stars} stars!`;
      }
    }
    s.log.unshift(msg);
    this.recordRecap({ kind: "greatRuin", text: msg, tribe: u.tribe });
    this.bumpStat(u.tribe, "ruinsClaimed");
    if (u.hero) this.grantXp(u, HERO_XP.ruin);
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
    const wasBoat = u.boat;
    const wasAttacked = u.attacked;
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
    // one-step undo: only for the human's own reversible moves (no ruin, no city tile)
    const destTile = tileAt(s, x, y);
    if (
      u.tribe === s.humanTribe &&
      s.currentTribe === s.humanTribe &&
      !destTile.ruin && !destTile.greatRuin && destTile.cityId === null
    ) {
      this.lastMove = { unitId, fromX, fromY, boat: wasBoat, attacked: wasAttacked };
    } else {
      this.lastMove = null;
    }
    this.exploreRuin(u);
    // v17: stepping onto a barbarian camp razes it for loot
    this.razeCampAt(u);
    this.exploreAround();
    this.emit({ type: "unitMoved", unitId, fromX, fromY, toX: x, toY: y });
    this.emit({ type: "changed" });
  }

  /** v17: razing a camp — loot 5★, clear the camp, celebrate */
  private razeCampAt(u: Unit) {
    const s = this.state;
    const camp = campAt(s, u.x, u.y);
    if (!camp || u.tribe < 0) return;
    s.camps = (s.camps ?? []).filter((c) => c.id !== camp.id);
    const tribe = s.tribes[u.tribe];
    tribe.stars += 5;
    this.bumpStat(u.tribe, "starsEarned", 5);
    const msg = `${tribe.name} razed the barbarian camp — 5★ plundered!`;
    s.log.unshift(msg);
    s.worldEvents = [...(s.worldEvents ?? []), { kind: "campRazed", text: msg, turn: s.turn, x: u.x, y: u.y }].slice(-8);
    if (u.tribe === s.humanTribe) s.campsRazedByHuman = (s.campsRazedByHuman ?? 0) + 1;
    if (u.hero) this.grantXp(u, HERO_XP.ruin);
    if (u.tribe === s.humanTribe) this.emit({ type: "sfx", name: "plunder" });
    else this.recordRecap({ kind: "ruin", text: msg, tribe: u.tribe });
    this.recordReplay({ tribe: u.tribe, kind: "capture", text: msg });
  }

  /** snapshot of the last human move for one-step undo */
  private lastMove: { unitId: number; fromX: number; fromY: number; boat: boolean; attacked: boolean } | null = null;

  canUndo(): boolean {
    return this.lastMove !== null && this.state.phase === "playing" &&
      this.state.currentTribe === this.state.humanTribe && !this.state.aiThinking;
  }

  undoMove() {
    if (!this.canUndo()) return;
    const s = this.state;
    const m = this.lastMove!;
    this.lastMove = null;
    const u = s.units.find((q) => q.id === m.unitId);
    if (!u) return;
    u.x = m.fromX; u.y = m.fromY;
    u.moved = false;
    u.boat = m.boat;
    u.attacked = m.attacked;
    s.selectedUnitId = u.id;
    s.log.unshift(`${UNIT_STATS[u.type].name}'s march was recalled.`);
    this.emit({ type: "changed" });
  }

  attack(attackerId: number, defenderId: number) {
    const s = this.state;
    const a = s.units.find((q) => q.id === attackerId);
    const d = s.units.find((q) => q.id === defenderId);
    this.lastMove = null;
    if (!a || !d) return;
    if (!attackableUnits(s, a).some((e) => e.id === defenderId)) return;
    const result = previewCombat(s, a, d);
    const ax = a.x, ay = a.y, dxp = d.x, dyp = d.y;
    let dmgOut = result.damageToDefender;
    // v36 Colossus signature — knockback: a surviving defender in melee is hurled
    // 1 tile along the attack direction; a blocked push (edge/terrain/occupied)
    // becomes +2 bonus damage as the giant grinds them into the obstacle.
    let kbDest: { x: number; y: number } | null = null;
    let kbBlockedBonus = 0;
    const melee = Math.max(Math.abs(ax - dxp), Math.abs(ay - dyp)) === 1;
    if (a.type === "colossus" && melee && d.hp - dmgOut > 0) {
      kbDest = knockbackDestination(s, a, d);
      if (!kbDest) {
        kbBlockedBonus = 2;
        dmgOut += kbBlockedBonus;
      }
    }
    d.hp -= dmgOut;
    a.hp -= result.damageToAttacker;
    a.attacked = true;
    a.moved = true;
    let defenderDied = false, attackerDied = false;
    // v36 Colossus signature — wall-crush: striking a defender garrisoned behind
    // walls tears the fortifications down, whether or not the defender survives.
    let wallCrushed: { x: number; y: number } | undefined;
    if (a.type === "colossus") {
      const dc = cityAt(s, dxp, dyp);
      if (dc && dc.walls && dc.tribe === d.tribe && d.tribe >= 0) {
        dc.walls = false;
        wallCrushed = { x: dc.x, y: dc.y };
        const owner = s.tribes[d.tribe]?.name ?? "the enemy";
        s.log.unshift(`The Colossus crushed the walls of ${owner}'s ${dc.name}!`);
        if (a.tribe !== s.humanTribe || d.tribe === s.humanTribe) {
          this.recordRecap({ kind: "combat", text: `A Colossus crushed the walls of ${dc.name}`, tribe: a.tribe >= 0 ? a.tribe : d.tribe });
        }
        this.recordReplay({ tribe: a.tribe, kind: "combat", text: `${s.tribes[a.tribe]?.name ?? "A"} Colossus crushed the walls of ${dc.name}` });
      }
    }
    if (d.hp <= 0) {
      s.units = s.units.filter((q) => q.id !== d.id);
      a.kills++;
      defenderDied = true;
      this.bumpStat(a.tribe, "battlesWon");
      this.bumpStat(d.tribe, "unitsLost");
      if (a.hero) this.grantXp(a, HERO_XP.kill);
      // hero Plunderer perk: loot 2 stars on every kill
      if (a.hero && (a.perks?.includes("plunderer")) && d.tribe >= 0) {
        const victim = s.tribes[d.tribe];
        const loot = Math.min(2, Math.max(0, victim.stars));
        if (loot > 0) {
          victim.stars -= loot;
          s.tribes[a.tribe].stars += loot;
          this.bumpStat(a.tribe, "starsEarned", loot);
          this.bumpStat(a.tribe, "starsPlundered", loot);
          s.log.unshift(`${this.heroName(a)} plundered ${loot}★ from ${victim.name}!`);
          this.emit({ type: "sfx", name: "plunder" });
        }
      }
      // a fallen commander is gone forever — mark the moment
      if (d.hero && d.tribe >= 0) {
        const dn = this.heroName(d);
        s.tribes[d.tribe].heroFell = true;
        s.log.unshift(`${dn}, commander of ${s.tribes[d.tribe].name}, has fallen in battle!`);
        this.recordRecap({ kind: "fallen", text: `${s.tribes[d.tribe].name}'s commander ${dn} has fallen`, tribe: a.tribe >= 0 ? a.tribe : d.tribe });
        this.recordReplay({ tribe: d.tribe, kind: "combat", text: `Commander ${dn} of ${s.tribes[d.tribe].name} fell in battle` });
        this.stageHeroFallen(d, a);
      }
      this.recordReplay({ tribe: a.tribe, kind: "combat", text: `${s.tribes[a.tribe]?.name ?? "Guardian"} ${UNIT_STATS[a.type].name} destroyed ${s.tribes[d.tribe]?.name ?? "Guardian"} ${UNIT_STATS[d.type].name}` });
      // Vessari Raider: plunders 2 stars from the victim's coffers on every kill
      if (a.type === "raider" && d.tribe >= 0) {
        const victim = s.tribes[d.tribe];
        const loot = Math.min(2, Math.max(0, victim.stars));
        victim.stars -= loot;
        s.tribes[a.tribe].stars += loot;
        if (loot > 0) {
          this.bumpStat(a.tribe, "starsEarned", loot);
          this.bumpStat(a.tribe, "starsPlundered", loot);
          s.log.unshift(`${s.tribes[a.tribe].name}'s Raider plundered ${loot}★ from ${victim.name}!`);
          this.emit({ type: "sfx", name: "plunder" });
        }
      }
      // Veterancy: 3 kills promotes the unit — +5 max HP and a full heal
      if (!a.veteran && !a.guardian && a.kills >= 3) {
        a.veteran = true;
        a.maxHp += 5;
        a.hp = a.maxHp;
        const tn = s.tribes[a.tribe]?.name ?? "A";
        s.log.unshift(`${tn} ${a.type} was promoted to Veteran! (+5 max HP)`);
        if (a.tribe === s.humanTribe) this.emit({ type: "sfx", name: "promote" });
        if (a.tribe !== s.humanTribe) {
          this.recordRecap({ kind: "combat", text: `A ${tn} ${a.type} became a Veteran`, tribe: a.tribe });
        }
      }
      if (d.guardian && a.tribe >= 0) {
        this.bumpStat(a.tribe, "guardiansSlain");
        s.log.unshift(`${s.tribes[a.tribe].name} slew the Guardian of the Great Ruin!`);
        if (a.tribe !== s.humanTribe) {
          this.recordRecap({ kind: "greatRuin", text: `${s.tribes[a.tribe].name} slew a Great Ruin guardian`, tribe: a.tribe });
        }
        // v18: the AWAKENED Guardian carries a relic — a hero who lands the killing blow claims it
        if (d.awake && a.hero && !(a.perks ?? []).includes("relic")) {
          a.perks = [...(a.perks ?? []), "relic"];
          a.maxHp += 4;
          a.hp = Math.min(a.maxHp, a.hp + 4);
          const hn = this.heroName(a);
          s.log.unshift(`${hn} claims the Guardian's Relic! (+15% atk/def, +4 max HP)`);
          this.recordRecap({ kind: "greatRuin", text: `${hn} of ${s.tribes[a.tribe].name} claimed the Guardian's Relic`, tribe: a.tribe });
          if (a.tribe === s.humanTribe) this.emit({ type: "sfx", name: "levelup" });
        }
      }
    }
    if (a.hp <= 0) {
      s.units = s.units.filter((q) => q.id !== a.id);
      attackerDied = true;
      this.bumpStat(d.tribe, "battlesWon");
      this.bumpStat(a.tribe, "unitsLost");
      if (d.hero) this.grantXp(d, HERO_XP.battleWon);
      if (a.hero && a.tribe >= 0) {
        const an = this.heroName(a);
        s.tribes[a.tribe].heroFell = true;
        s.log.unshift(`${an}, commander of ${s.tribes[a.tribe].name}, has fallen in battle!`);
        this.recordRecap({ kind: "fallen", text: `${s.tribes[a.tribe].name}'s commander ${an} has fallen`, tribe: d.tribe >= 0 ? d.tribe : a.tribe });
        this.stageHeroFallen(a, d);
      }
    }
    // apply the knockback after death bookkeeping — only if the defender survived
    let kbApplied: { x: number; y: number } | undefined;
    if (kbDest && !defenderDied) {
      d.x = kbDest.x; d.y = kbDest.y;
      kbApplied = kbDest;
      s.log.unshift(`The Colossus hurled the ${UNIT_STATS[d.type].name} back!`);
    } else if (kbBlockedBonus > 0 && a.type === "colossus") {
      s.log.unshift(`The ${UNIT_STATS[d.type].name} was slammed against the terrain (+${kbBlockedBonus} damage).`);
    }
    this.emit({
      type: "combat", attackerId, defenderId,
      dmg: dmgOut, retaliation: result.damageToAttacker,
      defenderDied, attackerDied, ax, ay, dx: dxp, dy: dyp,
      knockback: kbApplied, wallCrushed,
    });
    // recap: rival combat involving the player or visible to them
    if (a.tribe !== s.humanTribe && d.tribe !== GUARDIAN_TRIBE) {
      const aName = UNIT_STATS[a.type].name, dName = UNIT_STATS[d.type].name;
      const aTribeName = a.tribe >= 0 ? s.tribes[a.tribe].name : (a.raider ? "Barbarian" : "Guardian");
      const target = d.tribe === s.humanTribe ? `your ${dName}` : `${s.tribes[d.tribe].name}'s ${dName}`;
      const outcome = defenderDied ? "destroyed" : `hit (−${dmgOut})`;
      this.recordRecap({ kind: "combat", text: `${aTribeName} ${aName} ${outcome} ${target}`, tribe: a.tribe >= 0 ? a.tribe : d.tribe });
    }
    this.checkElimination();
    this.emit({ type: "changed" });
  }

  /** v37 Colossus signature — once-per-game Quake: slams the ground, hitting every
   * adjacent enemy for flat damage and shattering the walls of adjacent enemy cities.
   * Spends the unit's attack (and move) for the turn. */
  quake(unitId: number) {
    const s = this.state;
    const u = s.units.find((q) => q.id === unitId);
    this.lastMove = null;
    if (!u || !canQuake(s, u)) return;
    const victims = quakeVictims(s, u);
    const wallCities = quakeWallTargets(s, u);
    u.quakeUsed = true;
    u.attacked = true;
    u.moved = true;
    const tn = s.tribes[u.tribe]?.name ?? "A";
    const results: { id: number; x: number; y: number; died: boolean }[] = [];
    for (const v of victims) {
      v.hp -= QUAKE_DAMAGE;
      const died = v.hp <= 0;
      results.push({ id: v.id, x: v.x, y: v.y, died });
      if (died) {
        s.units = s.units.filter((q) => q.id !== v.id);
        u.kills++;
        this.bumpStat(u.tribe, "battlesWon");
        this.bumpStat(v.tribe, "unitsLost");
        if (v.hero && v.tribe >= 0) {
          const vn = this.heroName(v);
          s.tribes[v.tribe].heroFell = true;
          s.log.unshift(`${vn}, commander of ${s.tribes[v.tribe].name}, was crushed by the Quake!`);
          this.recordRecap({ kind: "fallen", text: `${s.tribes[v.tribe].name}'s commander ${vn} fell to a Quake`, tribe: u.tribe });
          this.recordReplay({ tribe: v.tribe, kind: "combat", text: `Commander ${vn} of ${s.tribes[v.tribe].name} was crushed by a Quake` });
          this.stageHeroFallen(v, u);
        }
      }
    }
    // veterancy can trigger off quake kills too
    if (!u.veteran && !u.guardian && u.kills >= 3) {
      u.veteran = true;
      u.maxHp += 5;
      u.hp = u.maxHp;
      s.log.unshift(`${tn} colossus was promoted to Veteran! (+5 max HP)`);
      if (u.tribe === s.humanTribe) this.emit({ type: "sfx", name: "promote" });
    }
    const wallsBroken: { x: number; y: number }[] = [];
    for (const c of wallCities) {
      c.walls = false;
      wallsBroken.push({ x: c.x, y: c.y });
      const owner = c.tribe !== null && c.tribe >= 0 ? s.tribes[c.tribe]?.name ?? "the enemy" : "the enemy";
      s.log.unshift(`The Quake shattered the walls of ${owner}'s ${c.name}!`);
    }
    const killed = results.filter((r) => r.died).length;
    s.log.unshift(
      `${tn} Colossus unleashed a QUAKE — ${victims.length} enem${victims.length === 1 ? "y" : "ies"} struck (−${QUAKE_DAMAGE} HP each)${killed > 0 ? `, ${killed} destroyed` : ""}${wallsBroken.length > 0 ? `, walls shattered` : ""}!`,
    );
    if (u.tribe !== s.humanTribe) {
      this.recordRecap({ kind: "combat", text: `${tn}'s Colossus unleashed a Quake (${victims.length} hit${killed > 0 ? `, ${killed} slain` : ""})`, tribe: u.tribe });
    }
    this.recordReplay({ tribe: u.tribe, kind: "combat", text: `${tn} Colossus unleashed a Quake — ${victims.length} struck${killed > 0 ? `, ${killed} destroyed` : ""}` });
    this.emit({ type: "quake", unitId: u.id, x: u.x, y: u.y, victims: results, wallsBroken });
    this.checkElimination();
    this.emit({ type: "changed" });
  }

  buildPort(x: number, y: number) {
    const s = this.state;
    const tribeIdx = s.currentTribe;
    const t = tileAt(s, x, y);
    if (!canBuildPort(s, tribeIdx, t)) return;
    const cost = portCost(s, tribeIdx);
    if (s.tribes[tribeIdx].stars < cost) return;
    s.tribes[tribeIdx].stars -= cost;
    t.port = tribeIdx;
    s.log.unshift(`${s.tribes[tribeIdx].name} built a port.`);
    this.emit({ type: "changed" });
  }

  /** City walls: level-3+ cities may fortify for a stronger defense bonus */
  buildWalls(cityId: number) {
    const s = this.state;
    const city = s.cities[cityId];
    const tribeIdx = s.currentTribe;
    if (!city || city.tribe !== tribeIdx) return;
    if (city.walls || city.level < 3) return;
    const wcost = wallCost(s, tribeIdx);
    if (s.tribes[tribeIdx].stars < wcost) return;
    s.tribes[tribeIdx].stars -= wcost;
    city.walls = true;
    s.log.unshift(`${city.name} raised city walls!`);
    this.emit({ type: "changed" });
  }

  captureCity(unitId: number) {
    const s = this.state;
    const u = s.units.find((q) => q.id === unitId);
    this.lastMove = null;
    if (!u || u.moved || u.attacked) {
      // capture consumes the whole action; require fresh unit standing on city
    }
    if (!u) return;
    const city = cityAt(s, u.x, u.y);
    if (!city || city.tribe === u.tribe) return;
    // diplomacy: cannot seize cities of a tribe you are at peace with
    if (city.tribe !== null && u.tribe >= 0 && atPeace(s, u.tribe, city.tribe)) return;
    const wasCapital = city.isCapital;
    const prevOwner = city.tribe;
    city.tribe = u.tribe;
    if (city.level === 0) city.level = 1;
    claimBorders(s.tiles, s.size, city);
    u.moved = true; u.attacked = true;
    s.log.unshift(`${s.tribes[u.tribe].name} captured ${city.name}!`);
    this.bumpStat(u.tribe, "citiesCaptured");
    if (wasCapital) this.bumpStat(u.tribe, "capitalsCaptured");
    if (prevOwner !== null && prevOwner >= 0) this.bumpStat(prevOwner, "citiesLost");
    if (u.hero) this.grantXp(u, HERO_XP.capture);
    city.walls = false; // walls are torn down when a city falls
    this.recordReplay({ tribe: u.tribe, kind: "capture", text: `${s.tribes[u.tribe].name} captured ${city.name}` });
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
    this.addPopulation(city, 1);
    this.emit({ type: "changed" });
  }

  /** v35: add population to a city, levelling it up (with reward choice) as thresholds pass */
  addPopulation(city: City, amount: number) {
    const s = this.state;
    city.population += amount;
    while (city.population >= POP_PER_LEVEL) {
      city.population -= POP_PER_LEVEL;
      city.level++;
      s.log.unshift(`${city.name} grew to level ${city.level}!`);
      if (city.tribe === s.humanTribe) {
        // human picks from the modal; queue persists across saves (like hero perks)
        s.pendingCityReward = city.id;
      } else if (city.tribe !== null) {
        this.aiPickCityReward(city);
      }
    }
  }

  /** v35: apply a chosen level-up reward to a city */
  chooseCityReward(cityId: number, reward: CityReward) {
    const s = this.state;
    const city = s.cities[cityId];
    if (!city || city.tribe === null) return;
    const [a, b] = rewardChoicesForLevel(city.level);
    if (reward !== a && reward !== b) return;
    if (s.pendingCityReward === cityId) s.pendingCityReward = null;
    city.rewards = [...(city.rewards ?? []), reward];
    const tribe = city.tribe;
    switch (reward) {
      case "workshop":
        break; // handled in starIncome
      case "explorer": {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const x = city.x + dx, y = city.y + dy;
            if (x < 0 || y < 0 || x >= s.size || y >= s.size) continue;
            s.tiles[idx(x, y, s.size)].explored[tribe] = true;
          }
        }
        break;
      }
      case "wall":
        city.walls = true;
        break;
      case "stars":
        s.tribes[tribe].stars += 5;
        this.bumpStat(tribe, "starsEarned", 5);
        break;
      case "borderGrowth":
        city.borderRadius = 2;
        claimBorders(s.tiles, s.size, city);
        break;
      case "popGrowth":
        this.addPopulation(city, 3);
        break;
      case "park":
        s.tribes[tribe].score += 15;
        break;
      case "superUnit": {
        // spawn on the city tile if free, else the first free adjacent land tile
        let sx = city.x, sy = city.y;
        if (unitAt(s, sx, sy)) {
          outer: for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const x = city.x + dx, y = city.y + dy;
              if (x < 0 || y < 0 || x >= s.size || y >= s.size) continue;
              const tt = s.tiles[idx(x, y, s.size)];
              if ((tt.terrain === "grass" || tt.terrain === "forest") && !unitAt(s, x, y)) { sx = x; sy = y; break outer; }
            }
          }
        }
        if (!unitAt(s, sx, sy)) {
          const u = makeUnit(s.nextUnitId++, "colossus", tribe, sx, sy);
          u.moved = true; u.attacked = true;
          s.units.push(u);
          s.log.unshift(`A Colossus rises in ${city.name}!`);
        } else {
          // no room — fall back to stars so the reward is never lost
          s.tribes[tribe].stars += 5;
        }
        break;
      }
    }
    s.log.unshift(`${city.name} chose ${REWARD_INFO[reward].name}.`);
    this.emit({ type: "changed" });
  }

  /** AI reward policy: frontier cities fortify, others grow the economy */
  aiPickCityReward(city: City) {
    const s = this.state;
    const [a, b] = rewardChoicesForLevel(city.level);
    const tribe = city.tribe!;
    // any enemy unit within 3 tiles → prefer defensive picks
    const threatened = s.units.some((u) =>
      u.tribe >= 0 && u.tribe !== tribe &&
      Math.max(Math.abs(u.x - city.x), Math.abs(u.y - city.y)) <= 3
    );
    let pick: CityReward = a;
    if (city.level === 2) pick = "workshop";
    else if (city.level === 3) pick = threatened && !city.walls ? "wall" : "stars";
    else if (city.level === 4) pick = "popGrowth";
    else pick = threatened ? "superUnit" : "park";
    if (pick !== a && pick !== b) pick = a;
    this.chooseCityReward(city.id, pick);
  }

  /** v35: place a production building on an owned border tile */
  build(x: number, y: number, type: BuildingType) {
    const s = this.state;
    const tribeIdx = s.currentTribe;
    const t = tileAt(s, x, y);
    const def = BUILDINGS.find((b) => b.id === type);
    if (!def || !canBuild(s, tribeIdx, t, def)) return;
    s.tribes[tribeIdx].stars -= def.cost;
    t.building = type;
    const city = s.cities[t.ownerCityId!];
    // v36 adjacency buildings: pop scales with partner neighbors at build time
    const pop = adjacencyPop(s, x, y, def);
    s.log.unshift(`${s.tribes[tribeIdx].name} built a ${def.name} near ${city.name}${def.adjacentTo ? ` (+${pop} pop)` : ""}.`);
    if (pop > 0) this.addPopulation(city, pop);
    // ...and existing adjacency buildings nearby grow when a new partner arrives
    if (!def.adjacentTo) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= s.size || ny >= s.size) continue;
          const nb = tileAt(s, nx, ny);
          const nbDef = nb.building ? BUILDINGS.find((b) => b.id === nb.building) : undefined;
          if (nbDef?.adjacentTo === type && nb.ownerCityId !== null) {
            const nbCity = s.cities[nb.ownerCityId];
            if (nbCity && nbCity.tribe === tribeIdx) {
              this.addPopulation(nbCity, 1);
              s.log.unshift(`${nbDef.name} near ${nbCity.name} grew stronger (+1 pop).`);
            }
          }
        }
      }
    }
    this.emit({ type: "changed" });
  }

  research(tech: TechId) {
    const s = this.state;
    const tribeIdx = s.currentTribe;
    if (!canResearch(s, tribeIdx, tech)) return;
    s.tribes[tribeIdx].stars -= techCost(s, tribeIdx, tech);
    s.tribes[tribeIdx].techs.push(tech);
    this.bumpStat(tribeIdx, "techsResearched");
    this.recordReplay({ tribe: tribeIdx, kind: "tech", text: `${s.tribes[tribeIdx].name} researched ${TECHS.find((t) => t.id === tech)?.name ?? tech}` });
    this.emit({ type: "changed" });
  }

  train(cityId: number, type: UnitType) {
    const s = this.state;
    const city = s.cities[cityId];
    const tribeIdx = s.currentTribe;
    if (city.tribe !== tribeIdx) return;
    if (!trainableUnits(s, tribeIdx).includes(type)) return;
    if (atUnitCapacity(s, tribeIdx)) return; // v35: cities support (level+1) units each
    const stats = UNIT_STATS[type];
    if (s.tribes[tribeIdx].stars < stats.cost) return;
    if (unitAt(s, city.x, city.y)) return;
    s.tribes[tribeIdx].stars -= stats.cost;
    const u = makeUnit(s.nextUnitId++, type, tribeIdx, city.x, city.y);
    u.moved = true; u.attacked = true; // freshly trained units act next turn
    s.units.push(u);
    this.recordReplay({ tribe: tribeIdx, kind: "train", text: `${s.tribes[tribeIdx].name} trained a ${stats.name} in ${city.name}` });
    this.exploreAround();
    this.emit({ type: "changed" });
  }

  // ---------- helpers ----------

  exploreAround() {
    const s = this.state;
    for (const u of s.units) {
      if (u.tribe < 0) continue; // guardians don't explore or reveal
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
    if (s.phase !== "playing") return;
    const alive = s.tribes.filter((t) => t.alive);
    if (alive.length === 1) {
      s.winner = alive[0].index;
      s.phase = "gameover";
      this.recordVictory();
      this.onGameOver();
      this.emit({ type: "sfx", name: s.winner === s.humanTribe ? "victory" : "defeat" });
    }
    const humans = s.humanTribes ?? [s.humanTribe];
    const anyHumanAlive = humans.some((h) => s.tribes[h]?.alive);
    if (!anyHumanAlive && s.phase === "playing") {
      // all human players eliminated: game over immediately
      const best = alive.sort((a, b) => b.score - a.score)[0];
      s.winner = best?.index ?? null;
      s.phase = "gameover";
      this.onGameOver();
      this.emit({ type: "sfx", name: "defeat" });
    }
  }

  /** feats unlocked by the game that just ended (shown on the game-over screen) */
  newAchievements: AchievementDef[] = [];
  /** whether the challenge run that just ended set a new period best */
  newChallengeBest = false;
  /** v16: outcome vs a friend's shared score (null = not a friend-challenge run) */
  friendResult: { name: string; theirScore: number; myScore: number; beaten: boolean } | null = null;
  /** story mode: set when the run that just ended completed its mission objective */
  storyMissionResult: { missionId: string; accomplished: boolean; starResult: StarBreakdown | null } | null = null;
  private onGameOver() {
    this.newAchievements = evaluateAchievements(this.state);
    this.newChallengeBest = false;
    this.friendResult = null;
    this.storyMissionResult = null;
    const s = this.state;
    if (s.storyMission && (s.humanTribes?.length ?? 1) === 1) {
      const accomplished = evaluateMission(s);
      const starResult = accomplished ? computeMissionStars(s) : null;
      if (accomplished) {
        if (starResult) recordMissionStars(s.storyMission, starResult.stars, s.turn);
        else markMissionDone(s.storyMission);
      }
      this.storyMissionResult = { missionId: s.storyMission, accomplished, starResult };
    }
    if (s.challenge && (s.humanTribes?.length ?? 1) === 1) {
      this.updateScore(s.humanTribe);
      const won = s.winner === s.humanTribe;
      // challenge scoring: end-of-match score plus a speed bonus for winning early
      const base = s.tribes[s.humanTribe]?.score ?? 0;
      const speedBonus = won ? Math.max(0, (s.maxTurns - s.turn) * 25) : 0;
      this.newChallengeBest = recordChallengeScore(s.challenge, base + speedBonus, won, Math.max(1, s.turn));
    }
    if (s.friendChallenge && (s.humanTribes?.length ?? 1) === 1) {
      this.updateScore(s.humanTribe);
      const won = s.winner === s.humanTribe;
      const base = s.tribes[s.humanTribe]?.score ?? 0;
      const speedBonus = won ? Math.max(0, (s.maxTurns - s.turn) * 25) : 0;
      const myScore = base + speedBonus;
      this.friendResult = {
        name: s.friendChallenge.name,
        theirScore: s.friendChallenge.score,
        myScore,
        beaten: myScore > s.friendChallenge.score,
      };
    }
    // v17 player profile: lifetime record (solo games only — hot-seat has no single owner)
    if ((s.humanTribes?.length ?? 1) === 1) {
      this.updateScore(s.humanTribe);
      const won = s.winner === s.humanTribe;
      const st = s.stats?.[s.humanTribe];
      recordGameResult({
        won,
        score: s.tribes[s.humanTribe]?.score ?? 0,
        turns: Math.max(1, s.turn),
        kills: st?.battlesWon ?? 0,
        heroLost: !!s.tribes[s.humanTribe]?.heroFell,
        campsRazed: s.campsRazedByHuman ?? 0,
        guardiansSlain: st?.guardiansSlain ?? 0,
        duelWon: this.friendResult?.beaten ?? false,
      });
    }
  }

  /** v16: the score this run would post as a shareable challenge (same formula as challenge boards) */
  shareScore(): number {
    const s = this.state;
    const won = s.winner === s.humanTribe;
    const base = s.tribes[s.humanTribe]?.score ?? 0;
    return base + (won ? Math.max(0, (s.maxTurns - s.turn) * 25) : 0);
  }

  /** Hall of Conquest: persist the human's victory; keep best 5 per difficulty */
  newHallEntry = false;
  private recordVictory() {
    const s = this.state;
    this.newHallEntry = false;
    if (s.winner === null || !(s.humanTribes ?? [s.humanTribe]).includes(s.winner)) return;
    // challenge runs live on their own best-score board, not the Hall ladder
    if (s.challenge) return;
    // hot-seat wins don't enter the solo Hall of Conquest ladder
    if ((s.humanTribes?.length ?? 1) > 1) return;
    s.humanTribe = s.winner;
    this.updateScore(s.humanTribe);
    const entry: HallEntry = {
      difficulty: s.difficulty,
      faction: s.tribes[s.humanTribe].name,
      turns: Math.max(1, s.turn),
      score: s.tribes[s.humanTribe].score,
      mapSize: s.size,
      date: new Date().toISOString().slice(0, 10),
    };
    try {
      const hall = loadHall();
      const list = hall[s.difficulty] ?? [];
      list.push(entry);
      list.sort((a, b) => a.turns - b.turns || b.score - a.score);
      hall[s.difficulty] = list.slice(0, 5);
      localStorage.setItem(HALL_KEY, JSON.stringify(hall));
      this.newHallEntry = hall[s.difficulty].includes(entry);
    } catch {
      // storage unavailable — skip
    }
  }
}

export interface HallEntry {
  difficulty: Difficulty;
  faction: string;
  turns: number;
  score: number;
  mapSize: number;
  date: string;
}

const HALL_KEY = "polyforge-hall";

export function loadHall(): Record<string, HallEntry[]> {
  try {
    const raw = localStorage.getItem(HALL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function makeUnit(id: number, type: UnitType, tribe: number, x: number, y: number): Unit {
  const stats = UNIT_STATS[type];
  return { id, type, tribe, x, y, hp: stats.hp, maxHp: stats.hp, moved: false, attacked: false, kills: 0, boat: false };
}

/** nearest free land tile adjacent to (x,y) for the hero spawn (never on the capital itself) */
function nearestFreeLand(
  tiles: { terrain: string; x: number; y: number }[],
  size: number,
  units: Unit[],
  x: number,
  y: number,
): { x: number; y: number } | null {
  for (let r = 1; r <= 2; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const t = tiles[ny * size + nx];
        if (t.terrain !== "grass" && t.terrain !== "forest") continue;
        if (units.some((u) => u.x === nx && u.y === ny)) continue;
        return { x: nx, y: ny };
      }
    }
  }
  return null;
}

function emptyState(): GameState {
  return {
    phase: "menu",
    size: 11,
    seed: 0,
    preset: "continents",
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
    scoreHistory: [],
    stats: [],
    pendingPerk: null,
    pendingCityReward: null,
    friendChallenge: null,
  };
}

export const game = new GameStore();

// dev/testing convenience: expose the singleton store
if (typeof window !== "undefined") {
  (window as any).__polyforge = game;
  // dev-only visual-verify hook: ?devgame=seed,size,tribeIdx,preset starts a game
  // immediately so headless screenshots can inspect in-game rendering.
  if (import.meta.env.DEV) {
    const dg = new URLSearchParams(window.location.search).get("devgame");
    if (dg) {
      const [seed = "4242", size = "11", tribe = "0", preset = "continents"] = dg.split(",");
      // hide onboarding overlays so screenshots show the raw board
      try { localStorage.setItem("polyforge-tutorial-done", "1"); } catch { /* noop */ }
      const req = Math.max(0, parseInt(tribe, 10) || 0);
      // values 0-3 pick a roster slot on the default roster; larger values are
      // TRIBE_DEFS indices (e.g. 6/7 premium tribes) injected as slot 0
      const roster = req > 3 ? [req, 1, 2, 3] : undefined;
      game.newGame({
        humanTribe: req > 3 ? 0 : req,
        difficulty: "normal",
        size: parseInt(size, 10) || 11,
        seed: parseInt(seed, 10) || 4242,
        preset: preset as MapPreset,
        roster,
      });
      game.state.showIntro = false;
      game.emit({ type: "changed" });
    }
  }
}
