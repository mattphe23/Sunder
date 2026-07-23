// Polyforge central game state store — framework-agnostic, event-emitting.
// React subscribes via getSnapshot/subscribe; Babylon render layer listens to events.

import { generateMap, claimBorders, rng, MapPreset } from "./mapgen";
import {
  GameState, Tribe, Unit, UnitType, UNIT_STATS, TRIBE_DEFS, TechId,
  Difficulty, idx, PORT_COST, WALL_COST, TECHS, RecapEntry, GUARDIAN_TRIBE,
  emptyStats, ReplayEntry,
} from "./types";
import {
  reachableTiles, attackableUnits, previewCombat, combatModifiers, techCost, canResearch,
  canHarvest, harvestCost, starIncome, tileAt, unitAt, cityAt, trainableUnits,
  POP_PER_LEVEL, canBuildPort, portCost, wallCost,
} from "./rules";
import { runAiTurn } from "./ai";
import { evaluateAchievements, AchievementDef } from "./achievements";
import {
  atPeace, setPeace, peaceTurnsLeft, diploUsed, markDiploUsed, addGrudge,
  strengthOf, aiAcceptsPeace, aiPaysTribute, aiWantsPeaceWith, PEACE_TREATY_TURNS, TRIBUTE_AMOUNT,
} from "./diplomacy";
import { ChallengeKind, recordChallengeScore } from "./challenges";
import { CustomTribeConfig, customTribeDef, CUSTOM_DEF_INDEX } from "./customTribe";
export type GameEvent =
  | { type: "changed" }
  | { type: "unitMoved"; unitId: number; fromX: number; fromY: number; toX: number; toY: number }
  | { type: "combat"; attackerId: number; defenderId: number; dmg: number; retaliation: number; defenderDied: boolean; attackerDied: boolean; ax: number; ay: number; dx: number; dy: number }
  | { type: "captured"; cityId: number; tribe: number }
  | { type: "turnStarted"; tribe: number }
  | { type: "sfx"; name: "plunder" | "heal" | "promote" | "ruin" | "victory" | "defeat" | "catapult" | "treaty" };

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
      if (s.phase === "playing") {
        localStorage.setItem(slotKey(this.activeSlot), JSON.stringify(s));
      } else if (s.phase === "gameover") {
        localStorage.removeItem(slotKey(this.activeSlot));
      }
    } catch {
      // storage unavailable (private mode/quota) — play without persistence
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
          }, 350);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  // ---------- lifecycle ----------

  newGame(opts: { size: number; humanTribe: number; difficulty: Difficulty; seed?: number; preset?: MapPreset; humanTribes?: number[]; challenge?: ChallengeKind; roster?: number[]; custom?: { slot: number; config: CustomTribeConfig } }) {
    const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
    const preset: MapPreset = opts.preset ?? "continents";
    const humans = opts.humanTribes && opts.humanTribes.length > 0 ? [...opts.humanTribes].sort((a, b) => a - b) : [opts.humanTribe];
    // roster: which 4 of the 6 TRIBE_DEFS play this match (slot i is def roster[i])
    const roster = opts.roster && opts.roster.length === 4 ? opts.roster : [0, 1, 2, 3];
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
        stars: 5,
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
    }
    // turn replay: show what rivals did while the human waited
    if (!hotseat && tribe.isHuman && s.recap.length > 0) {
      s.showRecap = true;
    }
    const income = starIncome(s, tribeIdx) + this.aiBonus(tribeIdx);
    tribe.stars += income;
    this.bumpStat(tribeIdx, "starsEarned", income);
    for (const u of s.units) {
      if (u.tribe === tribeIdx) { u.moved = false; u.attacked = false; }
    }
    // Auren Arcanist: mends adjacent friendly units +2 HP at the start of the turn
    let healed = false;
    for (const a of s.units) {
      if (a.tribe !== tribeIdx || a.type !== "arcanist") continue;
      for (const f of s.units) {
        if (f.tribe !== tribeIdx || f.id === a.id || f.hp >= f.maxHp) continue;
        const d = Math.max(Math.abs(f.x - a.x), Math.abs(f.y - a.y));
        if (d === 1) { f.hp = Math.min(f.maxHp, f.hp + 2); healed = true; }
      }
    }
    if (healed && tribeIdx === s.humanTribe) this.emit({ type: "sfx", name: "heal" });
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
      const stars = 5 + Math.floor(roll * 10); // 5–9 stars
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
    this.bumpStat(u.tribe, "ruinsClaimed");
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
      const stars = 12 + Math.floor(roll * 14); // 12–18 stars
      tribe.stars += stars;
      this.bumpStat(u.tribe, "starsEarned", stars);
      msg = `${tribe.name} claimed the Great Ruin — a hoard of ${stars} stars!`;
    } else if (roll < 0.75) {
      const unknown = TECHS.filter((q) => !tribe.techs.includes(q.id) && (q.requires === null || tribe.techs.includes(q.requires)));
      if (unknown.length > 0) {
        const pick = unknown[Math.floor(roll * 100) % unknown.length];
        tribe.techs.push(pick.id);
        tribe.stars += 8;
        msg = `${tribe.name} claimed the Great Ruin — ${pick.name} and 8 stars!`;
      } else {
        tribe.stars += 15;
        msg = `${tribe.name} claimed the Great Ruin — 15 stars!`;
      }
    } else {
      const spot = this.freeSpotNear(u.x, u.y);
      if (spot) {
        const nu = makeUnit(s.nextUnitId++, "swordsman", u.tribe, spot.x, spot.y);
        s.units.push(nu);
        tribe.stars += 5;
        msg = `${tribe.name} claimed the Great Ruin — a veteran Swordsman and 5 stars!`;
      } else {
        tribe.stars += 15;
        msg = `${tribe.name} claimed the Great Ruin — 15 stars!`;
      }
    }
    s.log.unshift(msg);
    this.recordRecap({ kind: "greatRuin", text: msg, tribe: u.tribe });
    this.bumpStat(u.tribe, "ruinsClaimed");
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
    this.exploreAround();
    this.emit({ type: "unitMoved", unitId, fromX, fromY, toX: x, toY: y });
    this.emit({ type: "changed" });
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
    d.hp -= result.damageToDefender;
    a.hp -= result.damageToAttacker;
    a.attacked = true;
    a.moved = true;
    let defenderDied = false, attackerDied = false;
    if (d.hp <= 0) {
      s.units = s.units.filter((q) => q.id !== d.id);
      a.kills++;
      defenderDied = true;
      this.bumpStat(a.tribe, "battlesWon");
      this.bumpStat(d.tribe, "unitsLost");
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
      if (d.guardian) {
        this.bumpStat(a.tribe, "guardiansSlain");
        s.log.unshift(`${s.tribes[a.tribe].name} slew the Guardian of the Great Ruin!`);
        if (a.tribe !== s.humanTribe) {
          this.recordRecap({ kind: "greatRuin", text: `${s.tribes[a.tribe].name} slew a Great Ruin guardian`, tribe: a.tribe });
        }
      }
    }
    if (a.hp <= 0) {
      s.units = s.units.filter((q) => q.id !== a.id);
      attackerDied = true;
      this.bumpStat(d.tribe, "battlesWon");
      this.bumpStat(a.tribe, "unitsLost");
    }
    this.emit({
      type: "combat", attackerId, defenderId,
      dmg: result.damageToDefender, retaliation: result.damageToAttacker,
      defenderDied, attackerDied, ax, ay, dx: dxp, dy: dyp,
    });
    // recap: rival combat involving the player or visible to them
    if (a.tribe !== s.humanTribe && d.tribe !== GUARDIAN_TRIBE) {
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
  private onGameOver() {
    this.newAchievements = evaluateAchievements(this.state);
    this.newChallengeBest = false;
    const s = this.state;
    if (s.challenge && (s.humanTribes?.length ?? 1) === 1) {
      this.updateScore(s.humanTribe);
      const won = s.winner === s.humanTribe;
      // challenge scoring: end-of-match score plus a speed bonus for winning early
      const base = s.tribes[s.humanTribe]?.score ?? 0;
      const speedBonus = won ? Math.max(0, (s.maxTurns - s.turn) * 25) : 0;
      this.newChallengeBest = recordChallengeScore(s.challenge, base + speedBonus, won, Math.max(1, s.turn));
    }
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
  };
}

export const game = new GameStore();

// dev/testing convenience: expose the singleton store
if (typeof window !== "undefined") {
  (window as any).__polyforge = game;
}
