// Recap audit — how many "While you were away" entries a turn actually
// carries, split by kind. An all-AI board overcounts slightly (a real solo
// game skips the human's own actions, so 3 of 4 tribes report instead of 4),
// so treat these as an upper bound on modal volume.
//   pnpm tsx scripts/recap-audit.mts [games] [size]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import { TRIBE_DEFS } from "../client/src/game/core/types";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

const GAMES = parseInt(process.argv[2] ?? "24", 10);
const SIZE = parseInt(process.argv[3] ?? "13", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;

const byKind = new Map<string, number>();
let totalEntries = 0;
let totalRounds = 0;
let roundsWithAny = 0;
let roundsOver5 = 0;
let maxInOneRound = 0;
// "would the modal open under a high-signal-only rule?"
const HIGH = new Set(["cityLost", "treatyBroken", "fallen"]);
let roundsWithHigh = 0;

for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % PRESETS.length];
  const seed = 60000 + g;
  const roster = [0, 1, 2, 3].map((d) => (d + g) % TRIBE_DEFS.length);
  pending.length = 0;
  seedRandom(seed);
  let lastTurn = -1;
  const unsub = game.subscribe(() => {
    const s = game.state;
    if (s.turn !== lastTurn) {
      lastTurn = s.turn;
      if (s.phase === "playing" && s.turn > 0) {
        const rec = s.recap ?? [];
        totalRounds++;
        if (rec.length) roundsWithAny++;
        if (rec.length > 5) roundsOver5++;
        if (rec.some((e) => HIGH.has(e.kind))) roundsWithHigh++;
        maxInOneRound = Math.max(maxInOneRound, rec.length);
        totalEntries += rec.length;
        for (const e of rec) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
        s.recap = []; // mimic the player dismissing
      }
    }
  });
  game.newGame({ size: SIZE, humanTribe: -1, difficulty: "normal", seed, preset, roster });
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 200000) {
    if (!pending.length) break;
    pending.shift()!();
  }
  unsub();
}

console.log(`\n=== RECAP AUDIT — ${GAMES} games, size ${SIZE} (upper bound: all 4 tribes report) ===\n`);
console.log(`rounds sampled:        ${totalRounds}`);
console.log(`avg entries / round:   ${(totalEntries / totalRounds).toFixed(1)}`);
console.log(`rounds with any:       ${((roundsWithAny / totalRounds) * 100).toFixed(0)}%`);
console.log(`rounds with >5:        ${((roundsOver5 / totalRounds) * 100).toFixed(0)}%`);
console.log(`max in one round:      ${maxInOneRound}`);
console.log(`rounds with HIGH-signal (cityLost/treaty/hero): ${((roundsWithHigh / totalRounds) * 100).toFixed(0)}%`);
console.log(`\nby kind:`);
[...byKind.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, c]) =>
  console.log(`  ${k.padEnd(14)} ${((c / totalEntries) * 100).toFixed(0).padStart(3)}%  (${c})`)
);
