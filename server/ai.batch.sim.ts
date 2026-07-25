// AI-vs-AI batch simulator — plays full headless matches across a matrix of
// difficulties, map presets, and seeds, and writes per-game results to JSONL
// for balance analysis. Run via: npx tsx server/ai.batch.sim.ts
//
// Reuses the v20 harness pattern (engine.sim.test.ts): setTimeout neutered,
// every tribe driven manually with runAiTurn so the loop is synchronous.
// NOT part of the vitest suite (filename lacks .test.).
import * as fs from "node:fs";
import * as path from "node:path";

// ---- Node environment stubs (engine expects browser globals) ----
const lsStore: Record<string, string> = {};
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => lsStore[k] ?? null,
  setItem: (k: string, v: string) => { lsStore[k] = v; },
  removeItem: (k: string) => { delete lsStore[k]; },
};
const realSetTimeout = globalThis.setTimeout;
(globalThis as Record<string, unknown>).setTimeout = (() => 0) as unknown as typeof setTimeout;

// Deterministic RNG per game (ai.ts uses Math.random in decisions)
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;

import { game } from "../client/src/game/core/state";
import { runAiTurn } from "../client/src/game/core/ai";
import { scoreBreakdown, starIncome } from "../client/src/game/core/rules";

type Difficulty = "easy" | "normal" | "hard" | "impossible";
type Preset = "continents" | "pangaea" | "highlands" | "archipelago";

interface GameRecord {
  seed: number;
  difficulty: Difficulty;
  preset: Preset;
  size: number;
  turns: number;
  phase: string;
  winner: number | null;
  winnerName: string | null;
  winPath: string | null;
  tribes: Array<{
    index: number;
    name: string;
    defIndex: number;
    alive: boolean;
    score: number;
    income: number;
    cities: number;
    roads: number;
    breakdown: ReturnType<typeof scoreBreakdown>;
  }>;
  durationMs: number;
}

function simulate(seed: number, difficulty: Difficulty, preset: Preset, size: number, roster?: number[]): GameRecord {
  Math.random = mulberry32(seed ^ 0xc0ffee);
  const t0 = Date.now();
  game.newGame({ size, seed, difficulty, preset, humanTribe: seed % 4, roster });
  game.state.showIntro = false;
  // v41 measurement fix: newGame requires a "human" tribe, but on normal/hard
  // that tribe skips the AI's per-turn star bonus — silently handicapping one
  // slot (its win rate was ~10% vs 25% expected) and contaminating every
  // slot/tribe statistic in earlier batches. Flip it to AI so all four tribes
  // play under identical rules.
  for (const t of game.state.tribes) t.isHuman = false;
  let guard = 0;
  while (game.state.phase === "playing" && guard < 800) {
    guard++;
    const s = game.state;
    s.aiThinking = false;
    // headless modal auto-resolution (same as engine.sim.test.ts)
    if (s.pendingPerk) {
      const hero = s.units.find((u) => u.id === s.pendingPerk);
      if (hero) {
        const choices = game.perkChoices(hero);
        if (choices.length > 0) game.choosePerk(choices[0]);
        else s.pendingPerk = null;
      } else s.pendingPerk = null;
    }
    if (s.pendingCityReward != null) {
      const city = s.cities[s.pendingCityReward];
      if (city) game.aiPickCityReward(city);
      s.pendingCityReward = null;
    }
    if (s.incomingOffer) s.incomingOffer = null; // decline peace offers silently
    if (s.tribes[s.currentTribe]?.alive) runAiTurn(game, s.currentTribe);
    if (game.state.phase !== "playing") break;
    game.endTurn();
  }
  const s = game.state;
  const rec: GameRecord = {
    seed, difficulty, preset, size,
    turns: s.turn,
    phase: s.phase,
    winner: s.winner,
    winnerName: s.winner != null ? (s.tribes[s.winner]?.name ?? null) : null,
    winPath: s.winPath?.pathId ?? null,
    tribes: s.tribes.map((t) => ({
      index: t.index,
      name: t.name,
      defIndex: (t as unknown as { defIndex?: number }).defIndex ?? t.index,
      alive: t.alive,
      score: t.score,
      income: t.alive ? starIncome(s, t.index) : 0,
      cities: s.cities.filter((c) => c.tribe === t.index).length,
      roads: s.tiles.filter((tl) => tl.road && tl.ownerCityId != null && s.cities[tl.ownerCityId]?.tribe === t.index).length,
      breakdown: scoreBreakdown(s, t.index),
    })),
    durationMs: Date.now() - t0,
  };
  Math.random = realRandom;
  return rec;
}

// ---- Batch matrix ----
const OUT_DIR = "/home/ubuntu/ai-sim";
fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, "results.jsonl");
if (!process.argv.includes("--rotate") && !process.argv.includes("--archi")) fs.writeFileSync(outFile, "");

const difficulties: Difficulty[] = ["easy", "normal", "hard", "impossible"];
const presets: Preset[] = ["continents", "pangaea"];
const seeds = [3, 7, 11, 19, 23, 31, 42, 57, 71, 99];
const size = 11;

// Phase A: default roster [0,1,2,3] across the difficulty/preset matrix.
// Phase B (--rotate): rotated rosters so every tribe def visits every slot —
// separates tribe strength from slot/turn-order advantage. All 6 defs play.
const rotate = process.argv.includes("--rotate");
// Phase C (--archi): v40 Nerivane verification — Nerivane (def 4) placed in
// every slot, run on BOTH archipelago (home turf) and continents (the map
// class where it won 8% pre-v40), so the coastal-income buff's map dependence
// is measurable.
const archi = process.argv.includes("--archi");

let done = 0;
if (archi) {
  const rosters: number[][] = [
    [4, 0, 1, 2], [0, 4, 1, 3], [1, 2, 4, 5], [0, 3, 5, 4],
  ];
  const archSeeds = [3, 7, 11, 19, 23, 31, 42, 57, 71, 99];
  const archPresets: Preset[] = ["archipelago", "continents"];
  const totalC = rosters.length * archSeeds.length * archPresets.length;
  const outC = path.join(OUT_DIR, "results-archi.jsonl");
  fs.writeFileSync(outC, "");
  for (const preset of archPresets) {
    for (const roster of rosters) {
      for (const seed of archSeeds) {
        try {
          const rec = simulate(seed, "hard", preset, size, roster);
          (rec as unknown as { roster: number[] }).roster = roster;
          fs.appendFileSync(outC, JSON.stringify(rec) + "\n");
          done++;
          console.log(`[${done}/${totalC}] ${preset} roster=[${roster}] seed=${seed} → ${rec.phase} t${rec.turns} winner=${rec.winnerName ?? "-"}`);
        } catch (err) {
          done++;
          console.error(`[${done}/${totalC}] ${preset} roster=[${roster}] seed=${seed} FAILED:`, (err as Error).message);
        }
      }
    }
  }
  console.log(`\nArchipelago batch complete: ${done}/${totalC} games → ${outC}`);
  process.exit(0);
}
if (rotate) {
  const rosters: number[][] = [
    [0, 1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 0],
    [4, 5, 0, 1], [5, 0, 1, 2], [3, 2, 1, 0], [5, 4, 3, 2],
  ];
  const rotSeeds = [3, 7, 11, 19, 23, 31, 42, 57, 71, 99];
  const totalR = rosters.length * rotSeeds.length;
  const outR = path.join(OUT_DIR, "results-rotated.jsonl");
  fs.writeFileSync(outR, "");
  for (const roster of rosters) {
    for (const seed of rotSeeds) {
      try {
        const rec = simulate(seed, "hard", "continents", size, roster);
        (rec as unknown as { roster: number[] }).roster = roster;
        fs.appendFileSync(outR, JSON.stringify(rec) + "\n");
        done++;
        console.log(`[${done}/${totalR}] roster=[${roster}] seed=${seed} → ${rec.phase} t${rec.turns} winner=${rec.winnerName ?? "-"}`);
      } catch (err) {
        done++;
        console.error(`[${done}/${totalR}] roster=[${roster}] seed=${seed} FAILED:`, (err as Error).message);
      }
    }
  }
  console.log(`\nRotated batch complete: ${done}/${totalR} games → ${outR}`);
  process.exit(0);
}
const total = difficulties.length * presets.length * seeds.length;
for (const difficulty of difficulties) {
  for (const preset of presets) {
    for (const seed of seeds) {
      try {
        const rec = simulate(seed, difficulty, preset, size);
        fs.appendFileSync(outFile, JSON.stringify(rec) + "\n");
        done++;
        console.log(`[${done}/${total}] ${difficulty}/${preset}/seed=${seed} → ${rec.phase} t${rec.turns} winner=${rec.winnerName ?? "-"} path=${rec.winPath ?? "-"} (${rec.durationMs}ms)`);
      } catch (err) {
        done++;
        console.error(`[${done}/${total}] ${difficulty}/${preset}/seed=${seed} FAILED:`, (err as Error).message);
        fs.appendFileSync(outFile, JSON.stringify({ seed, difficulty, preset, size, error: (err as Error).message }) + "\n");
      }
    }
  }
}
console.log(`\nBatch complete: ${done}/${total} games → ${outFile}`);
void realSetTimeout;
