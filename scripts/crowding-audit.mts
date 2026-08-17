// Crowding audit — measures, per game turn:
//   - per-tribe star income and treasury (star accumulation pacing)
//   - total units standing on the board (army size trajectory)
//   - land tiles, and units per 100 land tiles (board density)
//   - "clump" fraction: share of units with 3+ other units in their
//     8-neighbourhood (the visual-soup proxy — a unit you cannot isolate
//     at a glance is a unit that reads as a colour field, not a piece)
// Answers the felt report: board gets crowded mid/late game, art blends.
//   pnpm tsx scripts/crowding-audit.mts [games] [size] [seedBase]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import { TRIBE_DEFS } from "../client/src/game/core/types";
import { starIncome } from "../client/src/game/core/rules";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};
const NO_HUMAN = -1;

function drive(maxSteps = 200000) {
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < maxSteps) {
    if (!pending.length) break;
    pending.shift()!();
  }
}

const GAMES = parseInt(process.argv[2] ?? "48", 10);
const SIZE = parseInt(process.argv[3] ?? "11", 10);
const SEED_BASE = parseInt(process.argv[4] ?? "42000", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard"] as const;

// turn -> bucket accumulators
interface Sample {
  income: number; // mean per-tribe income this turn
  treasury: number; // mean per-tribe banked stars AFTER income
  units: number; // total units on the board
  tribalUnits: number; // mean per-LIVING-tribe units
  landTiles: number;
  clumpFrac: number; // share of units in a 3+ unit 8-neighbourhood
}
const byTurn = new Map<number, { s: Sample; n: number }>();

function sampleTurn() {
  const s = game.state;
  if (s.phase !== "playing") return;
  const t = s.turn;
  const alive = s.tribes.filter((x) => x.alive);
  const land = s.tiles.filter((x) => x.terrain !== "ocean" && x.terrain !== "water").length;
  const units = s.units.filter((u) => u.tribe >= 0);
  // 8-neighbourhood clump count
  const pos = new Map<string, number>();
  for (const u of units) pos.set(`${u.x},${u.y}`, 1);
  let clumped = 0;
  for (const u of units) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (pos.has(`${u.x + dx},${u.y + dy}`)) n++;
      }
    if (n >= 3) clumped++;
  }
  const smp: Sample = {
    income: alive.reduce((a, x) => a + starIncome(s, x.index), 0) / Math.max(1, alive.length),
    treasury: alive.reduce((a, x) => a + x.stars, 0) / Math.max(1, alive.length),
    units: units.length,
    tribalUnits: alive.reduce((a, x) => a + units.filter((u) => u.tribe === x.index).length, 0) / Math.max(1, alive.length),
    landTiles: land,
    clumpFrac: units.length ? clumped / units.length : 0,
  };
  const cur = byTurn.get(t) ?? { s: { income: 0, treasury: 0, units: 0, tribalUnits: 0, landTiles: 0, clumpFrac: 0 }, n: 0 };
  cur.s.income += smp.income;
  cur.s.treasury += smp.treasury;
  cur.s.units += smp.units;
  cur.s.tribalUnits += smp.tribalUnits;
  cur.s.landTiles += smp.landTiles;
  cur.s.clumpFrac += smp.clumpFrac;
  cur.n++;
  byTurn.set(t, cur);
}

let stalled = 0;
let peakUnits = 0;
let peakTurn = 0;
for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % PRESETS.length];
  const difficulty = DIFFS[Math.floor(g / PRESETS.length) % DIFFS.length];
  const seed = SEED_BASE + g;
  const roster = [0, 1, 2, 3].map((d) => (d + g) % TRIBE_DEFS.length);

  pending.length = 0;
  seedRandom(seed);
  let lastTurn = -1;
  const unsub = game.subscribe(() => {
    if (game.state.turn !== lastTurn) {
      lastTurn = game.state.turn;
      sampleTurn();
      // track peak density per game
      const u = game.state.units.filter((x) => x.tribe >= 0).length;
      if (u > peakUnits) { peakUnits = u; peakTurn = game.state.turn; }
    }
  });
  game.newGame({ size: SIZE, humanTribe: NO_HUMAN, difficulty, seed, preset, roster });
  drive();
  unsub();
  if (game.state.phase === "playing") stalled++;
}

console.log(`\n=== SUNDER CROWDING / ECONOMY AUDIT — ${GAMES} games, size ${SIZE} ===`);
if (stalled) console.log(`!! ${stalled}/${GAMES} matches stalled`);
console.log(`peak board load seen: ${peakUnits} units at once (game turn ${peakTurn})\n`);
console.log("turn |  inc/trb | bank/trb | units | units/100 land | clump%");
for (const t of [...byTurn.keys()].sort((a, b) => a - b)) {
  const { s, n } = byTurn.get(t)!;
  if (n < GAMES * 0.25) break; // tail is a handful of long games — noisy
  const land = s.landTiles / n;
  console.log(
    `${String(t).padStart(4)} | ${(s.income / n).toFixed(1).padStart(8)} | ${(s.treasury / n).toFixed(1).padStart(8)} | ${(s.units / n).toFixed(1).padStart(5)} | ${((s.units / n / land) * 100).toFixed(1).padStart(9)} | ${((s.clumpFrac / n) * 100).toFixed(0).padStart(4)}%   (n=${n})`
  );
}
console.log("\nReading: inc/trb = mean star income per living tribe that turn;");
console.log("bank/trb = mean banked stars per living tribe;");
console.log("clump% = share of units with 3+ units in their 8-neighbourhood.");
