// Per-tribe end-of-match averages — cities, walls, units, kills, and the
// battle ledger.
//
// Win rate says a tribe is weak; this says why. It exists because two sweeps
// aimed at Dravok both failed and the reason was only visible here: Dravok
// held 2.36 cities on average while its Unbroken Wall path asked for 3 WALLED
// ones. You cannot wall cities you do not hold, which is why making walls
// cheaper (3 -> 2 -> 1 stars) moved its win rate not at all.
//
// Read the numbers as censored: they are sampled when the match ends, so a
// tribe that wins early shows the totals it won with, not the totals it would
// have reached. Compare across tribes, not against absolutes. W/L is the one
// column that mostly survives that caveat, since both sides are censored
// together.
//
//   pnpm tsx scripts/tribe-diag.mts [games] [seedBase]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import { TRIBE_DEFS } from "../client/src/game/core/types";
import { unitCapacity, unitCount } from "../client/src/game/core/rules";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard", "impossible"] as const;
const GAMES = parseInt(process.argv[2] ?? "160", 10);
const SB = parseInt(process.argv[3] ?? "6200", 10);

interface Acc {
  cities: number[];
  walls: number[];
  units: number[];
  kills: number[];
  won: number[];
  lost: number[];
  captured: number[];
  cap: number[];
  stars: number[];
}
const acc = new Map<number, Acc>();
const blank = (): Acc => ({ cities: [], walls: [], units: [], kills: [], won: [], lost: [], captured: [], cap: [], stars: [] });

for (let g = 0; g < GAMES; g++) {
  const roster = [0, 1, 2, 3].map((d) => (d + g) % TRIBE_DEFS.length);
  pending.length = 0;
  seedRandom(SB + g);
  game.newGame({
    size: 11, humanTribe: -1, difficulty: DIFFS[Math.floor(g / 4) % 3],
    seed: SB + g, preset: PRESETS[g % 4], roster,
  });
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 400000) {
    if (!pending.length) break;
    pending.shift()!();
  }
  const s = game.state;
  for (const t of s.tribes) {
    if (!acc.has(t.defIndex)) acc.set(t.defIndex, blank());
    const a = acc.get(t.defIndex)!;
    const mine = s.units.filter((u) => u.tribe === t.index);
    const st = (s.stats?.[t.index] ?? {}) as unknown as Record<string, number>;
    a.cities.push(s.cities.filter((c) => c.tribe === t.index).length);
    a.walls.push(s.cities.filter((c) => c.tribe === t.index && c.walls).length);
    a.units.push(mine.length);
    a.kills.push(mine.reduce((n, u) => n + (u.kills || 0), 0));
    a.won.push(st.battlesWon ?? 0);
    a.lost.push(st.unitsLost ?? 0);
    a.captured.push(st.citiesCaptured ?? 0);
    a.cap.push(unitCapacity(s, t.index) - unitCount(s, t.index));
    a.stars.push(t.stars);
  }
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

console.log(`\nEND-OF-MATCH AVERAGES  (${GAMES} games, seeds ${SB}+)\n`);
console.log(
  "tribe".padEnd(11) + "cities".padStart(8) + "walled".padStart(8) + "units".padStart(8) +
  "kills".padStart(8) + "won".padStart(8) + "lost".padStart(8) + "W/L".padStart(8) + "captured".padStart(10) + "spare".padStart(8) + "stars".padStart(8)
);
TRIBE_DEFS.forEach((t, d) => {
  const a = acc.get(d);
  if (!a) return;
  const won = mean(a.won);
  const lost = mean(a.lost);
  console.log(
    t.name.padEnd(11) +
    mean(a.cities).toFixed(2).padStart(8) +
    mean(a.walls).toFixed(2).padStart(8) +
    mean(a.units).toFixed(2).padStart(8) +
    mean(a.kills).toFixed(2).padStart(8) +
    won.toFixed(2).padStart(8) +
    lost.toFixed(2).padStart(8) +
    (lost ? (won / lost).toFixed(2) : "--").padStart(8) +
    mean(a.captured).toFixed(2).padStart(10) +
    mean(a.cap).toFixed(2).padStart(8) +
    mean(a.stars).toFixed(1).padStart(8)
  );
});
console.log("\n  W/L    battles won per unit lost — the trade ratio a tribe gets in a fight");
console.log("  spare  unused unit capacity: if this is positive the cap is NOT what limits the army");
console.log("  stars  treasury sitting unspent at match end\n");
