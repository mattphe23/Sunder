// Tribe Forge audit — is a hand-built tribe stronger than a designed one?
//
// This matters for pricing. The six standard tribes each pair a FIXED passive
// with a FIXED signature unit and start tech, and those pairings were balanced
// together. The Forge lets a player pick one of six passives, one of six units
// and one of six start techs freely — 216 combinations, a strict superset of
// the six shipped pairings. If cherry-picking beats the fixed tribes, then
// putting the Forge behind a paywall sells an advantage, which is the same
// objection that applies to selling a premium tribe, only sharper.
//
// The counterweight is that a forged tribe gets the GENERIC victory path
// (Ascendance — reach a score target) instead of a tuned faction path, so it
// trades a tailored win condition for flexibility. Which effect dominates is an
// empirical question, so measure it.
//
// Control matters: seat 0 is not necessarily a neutral slot, so every candidate
// is compared against a standard tribe playing the same seat on the same seeds.
//
//   pnpm tsx scripts/forge-audit.mts [gamesPerBuild] [size] [seedBase]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import type { CustomTribeConfig } from "../client/src/game/core/customTribe";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

const NO_HUMAN = -1;
const GAMES = parseInt(process.argv[2] ?? "60", 10);
const SIZE = parseInt(process.argv[3] ?? "11", 10);
const SEED_BASE = parseInt(process.argv[4] ?? "7700", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard", "impossible"] as const;

/** candidate forges — the four shipped presets, plus cross-pairings a player
 *  optimising rather than theming would reach for */
const BUILDS: { label: string; config: CustomTribeConfig }[] = [
  { label: "Emberguard  (preset)", config: { name: "Emberguard", color: "#f97316", passive: "forgeborn", uniqueUnit: "berserker", startTech: "hunting" } },
  { label: "Mistveil    (preset)", config: { name: "Mistveil", color: "#6366f1", passive: "scholars", uniqueUnit: "arcanist", startTech: "organization" } },
  { label: "Saltborn    (preset)", config: { name: "Saltborn", color: "#06b6d4", passive: "tideborn", uniqueUnit: "tidecaller", startTech: "sailing" } },
  { label: "Greenwardens(preset)", config: { name: "Greenwardens", color: "#84cc16", passive: "outriders", uniqueUnit: "raider", startTech: "riding" } },
  // cross-pairings: strongest-looking passive welded to a unit it does not ship with
  { label: "scholars+berserker ", config: { name: "Optimum A", color: "#e2b007", passive: "scholars", uniqueUnit: "berserker", startTech: "organization" } },
  { label: "forgeborn+raider   ", config: { name: "Optimum B", color: "#f43f5e", passive: "forgeborn", uniqueUnit: "raider", startTech: "riding" } },
  { label: "forgeborn+bulwark  ", config: { name: "Optimum C", color: "#d946ef", passive: "forgeborn", uniqueUnit: "bulwark", startTech: "hunting" } },
  { label: "outriders+berserker", config: { name: "Optimum D", color: "#10b981", passive: "outriders", uniqueUnit: "berserker", startTech: "riding" } },
  { label: "stonebound+bulwark ", config: { name: "Optimum E", color: "#6366f1", passive: "stonebound", uniqueUnit: "bulwark", startTech: "shields" } },
];

/** run one block of games; custom===null plays the standard def in seat 0 */
function run(config: CustomTribeConfig | null): { wins: number; games: number } {
  let wins = 0;
  for (let g = 0; g < GAMES; g++) {
    const preset = PRESETS[g % PRESETS.length];
    const difficulty = DIFFS[Math.floor(g / PRESETS.length) % DIFFS.length];
    // Seat 0 is the tribe under test. The other three rotate so it is not
    // always facing the same opponents.
    const roster = [0, 1 + (g % 5), 1 + ((g + 1) % 5), 1 + ((g + 2) % 5)];
    pending.length = 0;
    seedRandom(SEED_BASE + g);
    game.newGame({
      size: SIZE, humanTribe: NO_HUMAN, difficulty, seed: SEED_BASE + g, preset, roster,
      ...(config ? { custom: { slot: 0, config } } : {}),
    });
    let steps = 0;
    while (game.state.phase === "playing" && steps++ < 400000) {
      if (!pending.length) break;
      pending.shift()!();
    }
    if (game.state.winner === 0) wins++;
  }
  return { wins, games: GAMES };
}

console.log(`\n=== TRIBE FORGE AUDIT — ${GAMES} games per build, size ${SIZE}, seeds ${SEED_BASE}+ ===\n`);
console.log("Seat 0 win rate. Four tribes, so 25% is parity.\n");

const control = run(null);
const controlPct = (control.wins / control.games) * 100;
console.log(`  ${"CONTROL — standard tribe in seat 0".padEnd(24)} ${controlPct.toFixed(1).padStart(5)}%  (${control.wins}/${control.games})\n`);

const results: { label: string; pct: number; wins: number }[] = [];
for (const b of BUILDS) {
  const r = run(b.config);
  const pct = (r.wins / r.games) * 100;
  results.push({ label: b.label, pct, wins: r.wins });
  const delta = pct - controlPct;
  const sign = delta >= 0 ? "+" : "";
  console.log(`  ${b.label.padEnd(24)} ${pct.toFixed(1).padStart(5)}%  (${String(r.wins).padStart(2)}/${r.games})   ${sign}${delta.toFixed(1)} vs control`);
}

const best = results.reduce((a, b) => (b.pct > a.pct ? b : a));
console.log(`\n  best forge: ${best.label.trim()} at ${best.pct.toFixed(1)}%, control ${controlPct.toFixed(1)}%`);
console.log(`  verdict: a forged tribe is ${best.pct > controlPct + 8 ? "MEASURABLY STRONGER" : best.pct < controlPct - 8 ? "measurably weaker" : "within noise of"} a designed one.\n`);
