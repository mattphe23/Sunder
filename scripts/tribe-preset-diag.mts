// One tribe's win rate and path progress broken down by map preset.
//
// A tribe can look mildly weak on average and actually be a terrain specialist
// with a good half and a bad half. Sunwei is the case that prompted this: 19%
// overall, but 43% on highlands against 17% on pangaea — a 26-point swing that
// the aggregate completely hides, and which no balance constant addresses,
// because the constant is not what varies.
//
//   pnpm tsx scripts/tribe-preset-diag.mts [defIndex] [games] [seedBase]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import { TRIBE_DEFS } from "../client/src/game/core/types";
import { victoryProgress } from "../client/src/game/core/victory";
(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => { pending.push(fn); return 0; };
const PRESETS = ["continents","archipelago","highlands","pangaea"] as const;
const DIFFS = ["normal","hard","impossible"] as const;
const DEF = parseInt(process.argv[2] ?? "2", 10);
const GAMES = parseInt(process.argv[3] ?? "240", 10);
const SB = parseInt(process.argv[4] ?? "6200", 10);
const acc: Record<string, { app: number; win: number; frac: number[]; done: number }> = {};
for (const p of PRESETS) acc[p] = { app: 0, win: 0, frac: [], done: 0 };
for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % 4];
  const roster = [0,1,2,3].map((d) => (d + g) % TRIBE_DEFS.length);
  if (!roster.includes(DEF)) continue;
  pending.length = 0; seedRandom(SB + g);
  game.newGame({ size: 11, humanTribe: -1, difficulty: DIFFS[Math.floor(g/4)%3], seed: SB+g, preset, roster });
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 400000) { if (!pending.length) break; pending.shift()!(); }
  const s = game.state;
  const t = s.tribes.find((x) => x.defIndex === DEF);
  if (!t) continue;
  const a = acc[preset];
  a.app++;
  if (s.winner === t.index) a.win++;
  const p = victoryProgress(s, t.index);
  if (p) { a.frac.push(p.current / p.target); if (p.current >= p.target) a.done++; }
}
console.log(`\n${TRIBE_DEFS[DEF].name.toUpperCase()} BY PRESET  (${GAMES} games, seeds ${SB}+)\n`);
console.log("preset".padEnd(14) + "appears".padStart(9) + "win%".padStart(8) + "path done".padStart(14) + "avg progress".padStart(14));
for (const p of PRESETS) {
  const a = acc[p];
  if (!a.app) continue;
  const avg = a.frac.length ? a.frac.reduce((x,y)=>x+y,0)/a.frac.length : 0;
  console.log(p.padEnd(14) + String(a.app).padStart(9) + ((a.win/a.app*100).toFixed(0)+"%").padStart(8)
    + ((a.done/a.app*100).toFixed(0)+"%").padStart(14) + ((avg*100).toFixed(0)+"%").padStart(14));
}
