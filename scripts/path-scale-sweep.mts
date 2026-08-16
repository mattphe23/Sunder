// Board-scaling sweep — one (alpha, size) config per process, one JSON line out.
//
// The defect being fixed: every victory target except Tide Mastery is a flat
// constant swept on 11x11, so a bigger board is a shorter game (16.9 turns at
// 15x15 against 23.3 at 11x11). victory.ts now multiplies those targets by
// (land-per-tribe / 23.8) ^ alpha. This measures what alpha should be.
//
// One config per process because the alpha is read from the environment and a
// single node process would have to re-import the module graph to change it.
// The driver loops; this just runs and reports.
//
//   SUNDER_PATH_SCALE_ALPHA=0.5 pnpm tsx scripts/path-scale-sweep.mts <size> <games> <seedBase>
import { game } from "../client/src/game/core/state";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

const NO_HUMAN = -1;
const SIZE = parseInt(process.argv[2] ?? "11", 10);
const GAMES = parseInt(process.argv[3] ?? "48", 10);
const SEED_BASE = parseInt(process.argv[4] ?? "5100", 10);
const ALPHA = Number(process.env.SUNDER_PATH_SCALE_ALPHA ?? 0);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard", "impossible"] as const;

let turns = 0;
let capped = 0;
let decisive = 0;
let stalled = 0;
const paths = new Map<string, number>();
/** per TRIBE_DEFS index: games appeared in, games won */
const appear = new Map<number, number>();
const won = new Map<number, number>();

for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % PRESETS.length];
  const difficulty = DIFFS[Math.floor(g / PRESETS.length) % DIFFS.length];
  const roster = [0, 1, 2, 3].map((d) => (d + g) % 6);

  pending.length = 0;
  game.newGame({ size: SIZE, humanTribe: NO_HUMAN, difficulty, seed: SEED_BASE + g, preset, roster });

  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 400000) {
    if (!pending.length) break;
    pending.shift()!();
  }
  if (game.state.phase === "playing") stalled++;

  const s = game.state;
  turns += s.turn;
  if (s.turn >= s.maxTurns) capped++;
  if (s.winner !== null) decisive++;
  const path = s.winPath?.pathId ?? (s.winner === null ? "none" : "score/domination");
  paths.set(path, (paths.get(path) ?? 0) + 1);
  for (const d of roster) appear.set(d, (appear.get(d) ?? 0) + 1);
  if (s.winner !== null) {
    const d = s.tribes[s.winner]?.defIndex;
    if (d !== undefined) won.set(d, (won.get(d) ?? 0) + 1);
  }
}

// Balance spread: sum of |win% - 25| across the six standard tribes, measured
// per APPEARANCE since the roster rotates and a tribe is not in every game.
let spread = 0;
for (const [d, a] of appear) {
  if (!a) continue;
  spread += Math.abs(((won.get(d) ?? 0) / a) * 100 - 25);
}

console.log(JSON.stringify({
  alpha: ALPHA,
  size: SIZE,
  games: GAMES,
  seedBase: SEED_BASE,
  avgTurns: +(turns / GAMES).toFixed(2),
  cappedPct: +((capped / GAMES) * 100).toFixed(1),
  decisivePct: +((decisive / GAMES) * 100).toFixed(1),
  balanceSpread: +spread.toFixed(1),
  distinctPaths: [...paths.keys()].filter((p) => p !== "none").length,
  paths: Object.fromEntries([...paths.entries()].sort((a, b) => b[1] - a[1])),
  stalled,
}));
