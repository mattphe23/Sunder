// Gameplay audit — does each system Sunder adds on top of the Polytopia
// formula actually show up in real matches?
//
// Runs headless AI-vs-AI games and instruments every custom subsystem:
// victory paths, heroes, buildings, roads/trade, diplomacy, world events.
// A mechanic that almost never fires is either dead weight or a bug.
//
//   pnpm tsx scripts/gameplay-audit.mts [games] [size]
import { game } from "../client/src/game/core/state";
import { TRIBE_DEFS, TECHS } from "../client/src/game/core/types";
import { victoryProgress, VICTORY_PATHS } from "../client/src/game/core/victory";

// The engine schedules AI turns with setTimeout. Running them inline recurses
// one stack frame per turn and silently dies mid-match on deep games, so we
// trampoline instead: queue the callbacks and drain them iteratively. Each AI
// turn ends by calling endTurn(), which queues the next one, so an all-AI
// board drives itself — the harness only pumps the queue.
(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

// Seat -1 is nobody, so `isHuman: humans.includes(i)` leaves every seat AI and
// newGame's opening kick fires on its own. Flipping the flags AFTER newGame
// instead (the old approach) broke two ways: seat 0 stayed the humanTribe
// INDEX, so its first city level-up queued a reward modal nothing could answer
// and endTurn() refuses to advance while one is pending; and when seat 0 drew
// the opening slot the kick was skipped entirely, leaving the match un-driven.
const NO_HUMAN = -1;

/** run the match to completion without growing the stack */
function drive(maxSteps = 200000) {
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < maxSteps) {
    if (!pending.length) break; // chain broken — surfaced as a stalled row
    pending.shift()!();
  }
  return steps;
}

const GAMES = parseInt(process.argv[2] ?? "60", 10);
const SIZE = parseInt(process.argv[3] ?? "11", 10);
/** seed block — sweep on one block, then confirm on another to avoid tuning
 *  the constants to a particular set of maps */
const SEED_BASE = parseInt(process.argv[4] ?? "7000", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard", "impossible"] as const;

interface Row {
  seed: number;
  preset: string;
  difficulty: string;
  turns: number;
  winnerDef: number | null;
  path: string;
  cappedOut: boolean;
  buildings: number;
  roads: number;
  heroesAlive: number;
  heroMaxLevel: number;
  peacePairs: number;
  grudges: number;
  camps: number;
  storms: number;
  ruinsClaimed: number;
  battles: number;
  citiesCaptured: number;
  topScore: number;
  /** per-seat: how far each tribe got along ITS OWN faction path, 0..1 */
  pathFrac: { def: number; frac: number; techs: number }[];
}

const rows: Row[] = [];
/** matches whose AI chain broke before reaching gameover — data integrity guard */
let stalled = 0;

for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % PRESETS.length];
  const difficulty = DIFFS[Math.floor(g / PRESETS.length) % DIFFS.length];
  const seed = SEED_BASE + g;
  // rotate which def sits in the human slot so tribe stats are not slot-confounded
  const roster = [0, 1, 2, 3, 4, 5].slice(0, 4).map((d) => (d + g) % 6);

  // clear BEFORE newGame: newGame queues the opening AI turn, and dropping
  // that kick leaves the whole match un-driven
  pending.length = 0;
  game.newGame({ size: SIZE, humanTribe: NO_HUMAN, difficulty, seed, preset, roster });
  drive();
  if (game.state.phase === "playing") stalled++;

  const s = game.state;
  const tiles = s.tiles;
  const peace = s.peaceUntil ?? {};
  let peacePairs = 0;
  for (const a of Object.keys(peace)) {
    for (const b of Object.keys(peace[a as unknown as number] ?? {})) {
      // peaceUntil keeps the expiry turn forever; only count treaties still standing
      if ((peace[a as unknown as number][b as unknown as number] ?? 0) > s.turn) peacePairs++;
    }
  }
  const heroes = s.units.filter((u) => u.hero);
  const stats = s.stats ?? [];
  const sum = (k: keyof (typeof stats)[number]) =>
    stats.reduce((n, t) => n + (Number(t[k]) || 0), 0);

  rows.push({
    seed,
    preset,
    difficulty,
    turns: s.turn,
    winnerDef: s.winner === null ? null : (s.tribes[s.winner]?.defIndex ?? null),
    path: s.winPath?.pathId ?? (s.winner === null ? "none" : "score/domination"),
    cappedOut: s.turn >= s.maxTurns,
    buildings: tiles.filter((t) => t.building).length,
    roads: tiles.filter((t) => t.road).length,
    heroesAlive: heroes.length,
    heroMaxLevel: heroes.reduce((m, u) => Math.max(m, (u as unknown as { level?: number }).level ?? 1), 0),
    peacePairs: peacePairs / 2,
    grudges: (s.grudges ?? []).length,
    camps: (s.camps ?? []).length,
    storms: (s.storms ?? []).length,
    ruinsClaimed: sum("ruinsClaimed" as never),
    battles: sum("battlesWon" as never),
    citiesCaptured: sum("citiesCaptured" as never),
    topScore: Math.max(...s.tribes.map((t) => t.score)),
    pathFrac: s.tribes.map((t) => {
      const p = victoryProgress(s, t.index);
      return {
        def: t.defIndex,
        frac: p ? p.current / p.target : 0,
        techs: t.techs.length,
      };
    }),
  });
  if ((g + 1) % 10 === 0) console.error(`  ...${g + 1}/${GAMES}`);
}

/* ---------------- report ---------------- */
const n = rows.length;
const avg = (f: (r: Row) => number) => (rows.reduce((a, r) => a + f(r), 0) / n).toFixed(2);
const pct = (f: (r: Row) => boolean) => ((rows.filter(f).length / n) * 100).toFixed(0) + "%";

console.log(`\n=== SUNDER GAMEPLAY AUDIT — ${n} games, size ${SIZE} ===\n`);

if (stalled) console.log(`!! ${stalled}/${n} matches stalled before gameover — figures below are unreliable\n`);

console.log("MATCH SHAPE");
console.log(`  avg turns              ${avg((r) => r.turns)}   (30 = cap)`);
console.log(`  hit the turn cap       ${pct((r) => r.cappedOut)}`);
console.log(`  decisive (had winner)  ${pct((r) => r.winnerDef !== null)}`);
console.log(`  avg top score          ${avg((r) => r.topScore)}`);

console.log("\nVICTORY PATHS  (asymmetric paths are a headline feature)");
const paths = new Map<string, number>();
for (const r of rows) paths.set(r.path, (paths.get(r.path) ?? 0) + 1);
[...paths.entries()].sort((a, b) => b[1] - a[1]).forEach(([p, c]) =>
  console.log(`  ${p.padEnd(22)} ${((c / n) * 100).toFixed(0).padStart(3)}%  (${c})`)
);

console.log("\nTRIBE WIN RATE  (roster rotated, so this is not slot-confounded)");
const wins = new Map<number, number>();
const seen = new Map<number, number>();
for (const r of rows) {
  if (r.winnerDef !== null) wins.set(r.winnerDef, (wins.get(r.winnerDef) ?? 0) + 1);
  const roster = [0, 1, 2, 3].map((i) => (i + (r.seed - SEED_BASE)) % 6);
  for (const d of roster) seen.set(d, (seen.get(d) ?? 0) + 1);
}
let spread = 0;
TRIBE_DEFS.slice(0, 6).forEach((t, d) => {
  const s2 = seen.get(d) ?? 0;
  const w = wins.get(d) ?? 0;
  if (s2) spread += Math.abs((w / s2) * 100 - 25);
  console.log(`  ${t.name.padEnd(10)} ${s2 ? ((w / s2) * 100).toFixed(0).padStart(3) : " --"}%   (${w}/${s2} appearances)`);
});
// 4 of 6 tribes play each match, so a perfectly balanced roster wins 25% of the
// games it appears in. This is the single number to minimise when sweeping.
console.log(`  BALANCE SPREAD  ${spread.toFixed(0)}   (sum of |win% - 25|; lower is better)`);

console.log("\nPATH REACHABILITY  (how far each tribe gets along ITS OWN path)");
console.log("  a path that averages near 1.00 is not a goal, it is a side effect of playing");
{
  const acc = new Map<number, { sum: number; n: number; done: number }>();
  for (const r of rows) {
    for (const p of r.pathFrac) {
      const a = acc.get(p.def) ?? { sum: 0, n: 0, done: 0 };
      a.sum += Math.min(1, p.frac); a.n++; if (p.frac >= 1) a.done++;
      acc.set(p.def, a);
    }
  }
  [...acc.entries()].sort((x, y) => y[1].sum / y[1].n - x[1].sum / x[1].n).forEach(([d, a]) => {
    const path = VICTORY_PATHS[Math.min(d, VICTORY_PATHS.length - 1)];
    console.log(
      `  ${(TRIBE_DEFS[d]?.name ?? "?").padEnd(10)} ${path.name.padEnd(14)} avg ${((a.sum / a.n) * 100).toFixed(0).padStart(3)}% of target   completed in ${((a.done / a.n) * 100).toFixed(0).padStart(3)}% of its games`
    );
  });
  const techAvg = rows.flatMap((r) => r.pathFrac).reduce((n, p) => n + p.techs, 0) / (rows.length * 4);
  const techNonAuren = rows.flatMap((r) => r.pathFrac).filter((p) => p.def !== 0);
  console.log(
    `  every tribe ends on ${techAvg.toFixed(1)}/${TECHS.length} techs on average ` +
    `(non-Auren: ${(techNonAuren.reduce((n, p) => n + p.techs, 0) / techNonAuren.length).toFixed(1)})`
  );
}

console.log("\nDO THE ADDED SYSTEMS ACTUALLY FIRE?");
console.log(`  buildings placed / game     ${avg((r) => r.buildings)}      (games with 0: ${pct((r) => r.buildings === 0)})`);
console.log(`  road tiles / game           ${avg((r) => r.roads)}      (games with 0: ${pct((r) => r.roads === 0)})`);
console.log(`  heroes alive at end         ${avg((r) => r.heroesAlive)} of 4   max hero level ${avg((r) => r.heroMaxLevel)}`);
console.log(`  peace treaties standing     ${avg((r) => r.peacePairs)}      (games with 0: ${pct((r) => r.peacePairs === 0)})`);
console.log(`  grudges                     ${avg((r) => r.grudges)}`);
console.log(`  barbarian camps at end      ${avg((r) => r.camps)}      (games with 0: ${pct((r) => r.camps === 0)})`);
console.log(`  sea storms at end           ${avg((r) => r.storms)}`);
console.log(`  ruins claimed               ${avg((r) => r.ruinsClaimed)}`);
console.log(`  battles won (all tribes)    ${avg((r) => r.battles)}`);
console.log(`  cities captured             ${avg((r) => r.citiesCaptured)}`);

console.log("\nBY PRESET");
for (const p of PRESETS) {
  const sub = rows.filter((r) => r.preset === p);
  if (!sub.length) continue;
  const a = (f: (r: Row) => number) => (sub.reduce((x, r) => x + f(r), 0) / sub.length).toFixed(1);
  console.log(`  ${p.padEnd(12)} turns ${a((r) => r.turns).padStart(5)}  roads ${a((r) => r.roads).padStart(5)}  buildings ${a((r) => r.buildings).padStart(5)}  capped ${((sub.filter((r) => r.cappedOut).length / sub.length) * 100).toFixed(0)}%`);
}

console.log("\nBY DIFFICULTY");
for (const d of DIFFS) {
  const sub = rows.filter((r) => r.difficulty === d);
  if (!sub.length) continue;
  const a = (f: (r: Row) => number) => (sub.reduce((x, r) => x + f(r), 0) / sub.length).toFixed(1);
  console.log(`  ${d.padEnd(12)} turns ${a((r) => r.turns).padStart(5)}  battles ${a((r) => r.battles).padStart(5)}  topScore ${a((r) => r.topScore).padStart(7)}`);
}
console.log("");
