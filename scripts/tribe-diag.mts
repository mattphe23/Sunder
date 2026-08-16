// Per-tribe end-of-match averages — cities, walls, units, kills.
//
// Win rate says a tribe is weak; this says why. It exists because two sweeps
// aimed at Dravok both failed and the reason was only visible here: Dravok
// holds 2.36 cities on average and its Unbroken Wall path asks for 3 WALLED
// ones. You cannot wall cities you do not hold, which is why making walls
// cheaper (3 -> 2 -> 1 stars) moved its win rate not at all.
//
// Read the numbers as censored: they are sampled when the match ends, so a
// tribe that wins early shows the totals it won with, not the totals it would
// have reached. Compare across tribes, not against absolutes.
//
//   pnpm tsx scripts/tribe-diag.mts [games] [seedBase]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import { TRIBE_DEFS } from "../client/src/game/core/types";
(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => { pending.push(fn); return 0; };
const PRESETS = ["continents","archipelago","highlands","pangaea"] as const;
const DIFFS = ["normal","hard","impossible"] as const;
const GAMES = parseInt(process.argv[2] ?? "160", 10);
const SB = parseInt(process.argv[3] ?? "6200", 10);
const cities = new Map<number, number[]>();
const units = new Map<number, number[]>();
const kills = new Map<number, number[]>();
const walls = new Map<number, number[]>();
for (let g = 0; g < GAMES; g++) {
  const roster = [0,1,2,3].map((d) => (d + g) % TRIBE_DEFS.length);
  pending.length = 0; seedRandom(SB + g);
  game.newGame({ size: 11, humanTribe: -1, difficulty: DIFFS[Math.floor(g/4)%3], seed: SB+g, preset: PRESETS[g%4], roster });
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 400000) { if (!pending.length) break; pending.shift()!(); }
  const s = game.state;
  for (const t of s.tribes) {
    const d = t.defIndex;
    const c = s.cities.filter((ci) => ci.tribe === t.index).length;
    const w = s.cities.filter((ci) => ci.tribe === t.index && ci.walls).length;
    const u = s.units.filter((x) => x.tribe === t.index).length;
    const k = s.units.filter((x) => x.tribe === t.index).reduce((a,x)=>a+(x.kills||0),0);
    if (!cities.has(d)) { cities.set(d,[]); units.set(d,[]); kills.set(d,[]); walls.set(d,[]); }
    cities.get(d)!.push(c); units.get(d)!.push(u); kills.get(d)!.push(k); walls.get(d)!.push(w);
  }
}
const mean = (a: number[]) => a.length ? (a.reduce((x,y)=>x+y,0)/a.length) : 0;
console.log(`\nEND-OF-MATCH AVERAGES  (${GAMES} games, seeds ${SB}+)\n`);
console.log("tribe".padEnd(11) + "cities".padStart(8) + "walled".padStart(8) + "units".padStart(8) + "kills".padStart(8));
TRIBE_DEFS.forEach((t, d) => {
  if (!cities.has(d)) return;
  console.log(t.name.padEnd(11) + mean(cities.get(d)!).toFixed(2).padStart(8) + mean(walls.get(d)!).toFixed(2).padStart(8)
    + mean(units.get(d)!).toFixed(2).padStart(8) + mean(kills.get(d)!).toFixed(2).padStart(8));
});
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import { TRIBE_DEFS } from "../client/src/game/core/types";
(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => { pending.push(fn); return 0; };
const PRESETS = ["continents","archipelago","highlands","pangaea"] as const;
const DIFFS = ["normal","hard","impossible"] as const;
const GAMES = parseInt(process.argv[2] ?? "160", 10);
const SB = parseInt(process.argv[3] ?? "6200", 10);
const cities = new Map<number, number[]>();
const units = new Map<number, number[]>();
const kills = new Map<number, number[]>();
const walls = new Map<number, number[]>();
for (let g = 0; g < GAMES; g++) {
  const roster = [0,1,2,3].map((d) => (d + g) % TRIBE_DEFS.length);
  pending.length = 0; seedRandom(SB + g);
  game.newGame({ size: 11, humanTribe: -1, difficulty: DIFFS[Math.floor(g/4)%3], seed: SB+g, preset: PRESETS[g%4], roster });
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 400000) { if (!pending.length) break; pending.shift()!(); }
  const s = game.state;
  for (const t of s.tribes) {
    const d = t.defIndex;
    const c = s.cities.filter((ci) => ci.tribe === t.index).length;
    const w = s.cities.filter((ci) => ci.tribe === t.index && ci.walls).length;
    const u = s.units.filter((x) => x.tribe === t.index).length;
    const k = s.units.filter((x) => x.tribe === t.index).reduce((a,x)=>a+(x.kills||0),0);
    if (!cities.has(d)) { cities.set(d,[]); units.set(d,[]); kills.set(d,[]); walls.set(d,[]); }
    cities.get(d)!.push(c); units.get(d)!.push(u); kills.get(d)!.push(k); walls.get(d)!.push(w);
  }
}
const mean = (a: number[]) => a.length ? (a.reduce((x,y)=>x+y,0)/a.length) : 0;
console.log(`\nEND-OF-MATCH AVERAGES  (${GAMES} games, seeds ${SB}+)\n`);
console.log("tribe".padEnd(11) + "cities".padStart(8) + "walled".padStart(8) + "units".padStart(8) + "kills".padStart(8));
TRIBE_DEFS.forEach((t, d) => {
  if (!cities.has(d)) return;
  console.log(t.name.padEnd(11) + mean(cities.get(d)!).toFixed(2).padStart(8) + mean(walls.get(d)!).toFixed(2).padStart(8)
    + mean(units.get(d)!).toFixed(2).padStart(8) + mean(kills.get(d)!).toFixed(2).padStart(8));
});
