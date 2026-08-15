// Is the difficulty ladder actually a ladder?
//
// Sunder has four tiers built from exactly two levers: which brain runs the
// turn (standard for easy/normal/hard, the "pro" brain for impossible) and a
// flat star bonus per turn (easy +0, normal +1, hard +2, impossible +0). Note
// that easy and impossible draw the SAME income — the top tier is meant to win
// on play quality alone. Whether it does is an empirical question, and one that
// already had a wrong answer once: before v47 the pro brain lost head to head
// to the standard one.
//
// All four tiers play in the same match, one seat each, with the tier-to-seat
// mapping rotated per game so tier and turn order are not confounded. A ladder
// is healthy when win rate rises monotonically from easy to impossible.
//
//   pnpm tsx scripts/ai-ladder.mts [games] [size] [seedBase]
import { game } from "../client/src/game/core/state";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => { pending.push(fn); return 0; };

const GAMES = parseInt(process.argv[2] ?? "200", 10);
const SIZE = parseInt(process.argv[3] ?? "11", 10);
const SEED_BASE = parseInt(process.argv[4] ?? "13000", 10);
const TIERS = ["easy", "normal", "hard", "impossible"] as const;
type Tier = (typeof TIERS)[number];
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;

/**
 * Difficulty is global state, so it has to be retargeted per acting seat. Two
 * places read it and they fire at different moments: runAiTurn picks the brain
 * when the queued callback runs, while aiBonus pays income inside beginTurn —
 * which happens at the TAIL of the previous seat's callback. Setting it in only
 * one of those places pays the wrong seat's bonus, so beginTurn is wrapped too.
 */
const store = game as unknown as { beginTurn: (i: number) => void; state: { difficulty: string; currentTribe: number } };
const origBeginTurn = store.beginTurn.bind(game);

const wins = new Map<Tier, number>();
const seats = new Map<Tier, number>();
const score = new Map<Tier, number>();
const cities = new Map<Tier, number>();
const battles = new Map<Tier, number>();
let decisive = 0;

for (let g = 0; g < GAMES; g++) {
  // Tier rotates every game, the roster only every 4 — otherwise both are
  // functions of the same counter and each tier ends up locked to a fixed
  // subset of tribes, so the table measures tribe strength as much as tier.
  const tierOf = (tribe: number): Tier => TIERS[(tribe + g) % TIERS.length];
  store.beginTurn = (i: number) => { store.state.difficulty = tierOf(i); origBeginTurn(i); };

  pending.length = 0;
  game.newGame({
    size: SIZE, humanTribe: -1, difficulty: tierOf(0), seed: SEED_BASE + g,
    preset: PRESETS[g % PRESETS.length],
    roster: [0, 1, 2, 3, 4, 5].slice(0, 4).map((d) => (d + Math.floor(g / TIERS.length)) % 6),
  });

  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 200000) {
    if (!pending.length) break;
    store.state.difficulty = tierOf(store.state.currentTribe);
    pending.shift()!();
  }

  const s = game.state;
  if (s.winner !== null) { decisive++; wins.set(tierOf(s.winner), (wins.get(tierOf(s.winner)) ?? 0) + 1); }
  for (const t of s.tribes) {
    const tier = tierOf(t.index);
    seats.set(tier, (seats.get(tier) ?? 0) + 1);
    score.set(tier, (score.get(tier) ?? 0) + t.score);
    cities.set(tier, (cities.get(tier) ?? 0) + s.cities.filter((c) => c.tribe === t.index).length);
    battles.set(tier, (battles.get(tier) ?? 0) + (s.stats[t.index]?.battlesWon ?? 0));
  }
  if ((g + 1) % 25 === 0) console.error(`  ...${g + 1}/${GAMES}`);
}
store.beginTurn = origBeginTurn;

console.log(`\n=== DIFFICULTY LADDER — ${GAMES} games, all four tiers per match ===\n`);
console.log(`  decisive games  ${((decisive / GAMES) * 100).toFixed(0)}%   (each tier holds one of four seats, so 25% is parity)\n`);
console.log("  tier          win%   avg score   cities   battles won");
const rates: number[] = [];
for (const tier of TIERS) {
  const n = seats.get(tier) ?? 1;
  const w = ((wins.get(tier) ?? 0) / n) * 100;
  rates.push(w);
  console.log(
    `  ${tier.padEnd(12)} ${w.toFixed(0).padStart(4)}%   ${((score.get(tier) ?? 0) / n).toFixed(0).padStart(9)}   ` +
    `${((cities.get(tier) ?? 0) / n).toFixed(2).padStart(6)}   ${((battles.get(tier) ?? 0) / n).toFixed(1).padStart(11)}`
  );
}
const monotonic = rates.every((r, i) => i === 0 || r >= rates[i - 1] - 1e-9);
const inversions = rates.flatMap((r, i) => (i > 0 && r < rates[i - 1] ? [`${TIERS[i - 1]} > ${TIERS[i]}`] : []));
console.log(`\n  monotonic: ${monotonic ? "YES" : "NO — " + inversions.join(", ")}`);
console.log(`  easy -> impossible spread: ${(rates[3] - rates[0]).toFixed(0)} points\n`);
