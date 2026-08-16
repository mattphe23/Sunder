// Density audit — are the boards too small?
//
// "Crowded" is a feel, so this turns it into numbers a decision can rest on:
// how much land each tribe gets, how long before the first blow lands, how much
// of the map is still unclaimed when the match ends, and how often a tribe is
// knocked out entirely.
//
// The signature of a board that is too small is early contact, a high share of
// the map claimed, and eliminations — nobody gets a build-up phase, and the
// game is a knife fight from turn one. The signature of one too big is late
// contact, most of the map still empty at the end, and matches that time out
// without a decision.
//
// Sizes 9/11/13 are what the menu offers; 15 and 17 are included to see what we
// are leaving on the table, since the engine takes any size.
//
//   pnpm tsx scripts/density-audit.mts [gamesPerSize] [seedBase]
import { game } from "../client/src/game/core/state";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

const NO_HUMAN = -1;
const PER_SIZE = parseInt(process.argv[2] ?? "24", 10);
const SEED_BASE = parseInt(process.argv[3] ?? "5100", 10);
const SIZES = [9, 11, 13, 15, 17];
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard", "impossible"] as const;
const LAND = new Set(["grass", "forest", "mountain"]);

interface Row {
  size: number;
  turns: number;
  cappedOut: boolean;
  decisive: boolean;
  landTiles: number;
  tribes: number;
  /** first turn on which any battle had been fought — when the peace ends */
  firstBattle: number | null;
  citiesTotal: number;
  citiesOwned: number;
  unitsAlive: number;
  /** tribes holding no city at the end */
  eliminated: number;
}

const rows: Row[] = [];
let stalled = 0;

for (const size of SIZES) {
  for (let g = 0; g < PER_SIZE; g++) {
    const preset = PRESETS[g % PRESETS.length];
    const difficulty = DIFFS[Math.floor(g / PRESETS.length) % DIFFS.length];
    const roster = [0, 1, 2, 3].map((d) => (d + g) % 6);

    pending.length = 0;
    game.newGame({ size, humanTribe: NO_HUMAN, difficulty, seed: SEED_BASE + g, preset, roster });

    let firstBattle: number | null = null;
    let steps = 0;
    while (game.state.phase === "playing" && steps++ < 400000) {
      if (!pending.length) break;
      pending.shift()!();
      if (firstBattle === null) {
        const fought = (game.state.stats ?? []).reduce(
          (n, t) => n + (Number((t as unknown as Record<string, number>).battlesWon) || 0), 0
        );
        if (fought > 0) firstBattle = game.state.turn;
      }
    }
    if (game.state.phase === "playing") stalled++;

    const s = game.state;
    rows.push({
      size,
      turns: s.turn,
      cappedOut: s.turn >= s.maxTurns,
      decisive: s.winner !== null,
      landTiles: s.tiles.filter((t) => LAND.has(t.terrain)).length,
      tribes: s.tribes.length,
      firstBattle,
      citiesTotal: s.cities.length,
      citiesOwned: s.cities.filter((ci) => ci.tribe !== null).length,
      unitsAlive: s.units.length,
      eliminated: s.tribes.filter((t) => !s.cities.some((ci) => ci.tribe === t.index)).length,
    });
  }
  console.error(`  ...size ${size} done`);
}

/* ---------------- report ---------------- */
console.log(`\n=== SUNDER DENSITY AUDIT — ${PER_SIZE} games per size, seeds ${SEED_BASE}+ ===\n`);
if (stalled) console.log(`!! ${stalled} matches stalled before gameover\n`);

const hdr = [
  "size", "land/tribe", "1st blow", "turns", "capped", "decisive", "map claimed", "units end", "wiped out",
];
console.log(
  hdr[0].padEnd(6) + hdr[1].padStart(11) + hdr[2].padStart(10) + hdr[3].padStart(7) +
  hdr[4].padStart(8) + hdr[5].padStart(10) + hdr[6].padStart(13) + hdr[7].padStart(11) + hdr[8].padStart(11)
);

for (const size of SIZES) {
  const r = rows.filter((x) => x.size === size);
  if (!r.length) continue;
  const avg = (f: (x: Row) => number) => r.reduce((a, x) => a + f(x), 0) / r.length;
  const pct = (f: (x: Row) => boolean) => (r.filter(f).length / r.length) * 100;
  const withBattle = r.filter((x) => x.firstBattle !== null);
  const firstBlow = withBattle.length
    ? (withBattle.reduce((a, x) => a + (x.firstBattle ?? 0), 0) / withBattle.length).toFixed(1)
    : "never";

  console.log(
    `${size}x${size}`.padEnd(6) +
    avg((x) => x.landTiles / x.tribes).toFixed(1).padStart(11) +
    String(firstBlow).padStart(10) +
    avg((x) => x.turns).toFixed(1).padStart(7) +
    (pct((x) => x.cappedOut).toFixed(0) + "%").padStart(8) +
    (pct((x) => x.decisive).toFixed(0) + "%").padStart(10) +
    ((avg((x) => x.citiesOwned) / avg((x) => x.citiesTotal) * 100).toFixed(0) + "%").padStart(13) +
    avg((x) => x.unitsAlive).toFixed(1).padStart(11) +
    avg((x) => x.eliminated).toFixed(2).padStart(11)
  );
}

console.log(`
  land/tribe   land tiles divided by tribes — the build-up room each one gets
  1st blow     average turn the first battle was fought
  map claimed  share of all city sites owned by someone at the end
  wiped out    tribes holding no city when the match ended (out of ${rows[0]?.tribes ?? 4})
`);
