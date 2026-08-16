// Snowball audit — when is a match actually decided?
//
// The loudest structural complaint about Polytopia is that it snowballs: once
// someone is ahead you cannot catch them, and once an enemy is in your base you
// are done. Catch-up mechanics are the usual answer, and they are easy to get
// wrong — too generous and a win stops feeling earned.
//
// So measure it before changing anything. This runs headless AI-vs-AI matches,
// samples the score standings every turn, and asks one question: if you are the
// leader on turn N, how often do you go on to win?
//
//   100%  at turn 5  -> the game is over before it starts; players are right
//    25%  at turn 25 -> the standings are noise and the ending is arbitrary
//
// Neither extreme is what we want. A healthy curve starts near chance (25% with
// four tribes) and climbs steadily, crossing ~75% somewhere in the last third.
//
//   pnpm tsx scripts/snowball-audit.mts [games] [size] [seedBase]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";

// Same trampoline as gameplay-audit.mts: the engine schedules AI turns with
// setTimeout, and running them inline recurses one frame per turn and dies mid
// match. Queue the callbacks and drain them iteratively instead.
(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

const NO_HUMAN = -1;
const GAMES = parseInt(process.argv[2] ?? "80", 10);
const SIZE = parseInt(process.argv[3] ?? "11", 10);
const SEED_BASE = parseInt(process.argv[4] ?? "9000", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard", "impossible"] as const;

/** one turn's standings, indexed by tribe seat */
interface Standing {
  score: number[];
  /** cities held — a better proxy for board power than score, which lurches on
   *  capture and counts things a tribe chasing a non-score victory ignores */
  cities: number[];
}

interface Match {
  winner: number | null;
  turns: number;
  /** how the match was won — score/domination vs one of the faction paths */
  path: string;
  /** sparse: only turns the match actually reached */
  standings: Map<number, Standing>;
}

const matches: Match[] = [];
let stalled = 0;

for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % PRESETS.length];
  const difficulty = DIFFS[Math.floor(g / PRESETS.length) % DIFFS.length];
  const seed = SEED_BASE + g;
  const roster = [0, 1, 2, 3].map((d) => (d + g) % 6);

  pending.length = 0;
  seedRandom(seed);
  game.newGame({ size: SIZE, humanTribe: NO_HUMAN, difficulty, seed, preset, roster });

  const standings = new Map<number, Standing>();
  let lastTurn = -1;
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 200000) {
    if (!pending.length) break;
    pending.shift()!();
    const t = game.state.turn;
    if (t !== lastTurn) {
      lastTurn = t;
      // Sample at the START of each turn, before anyone has moved in it, so a
      // checkpoint reflects standings a player could actually have acted on.
      const st = game.state;
      const cities = st.tribes.map(() => 0);
      for (const ci of st.cities) if (ci.tribe !== null && cities[ci.tribe] !== undefined) cities[ci.tribe]++;
      standings.set(t, { score: st.tribes.map((tr) => tr.score), cities });
    }
  }
  if (game.state.phase === "playing") stalled++;

  matches.push({
    winner: game.state.winner,
    turns: game.state.turn,
    path: game.state.winPath?.pathId ?? (game.state.winner === null ? "none" : "score/domination"),
    standings,
  });
  if ((g + 1) % 10 === 0) console.error(`  ...${g + 1}/${GAMES}`);
}

/* ---------------- report ---------------- */

const decisive = matches.filter((m) => m.winner !== null);
const n = decisive.length;

console.log(`\n=== SUNDER SNOWBALL AUDIT — ${matches.length} games, size ${SIZE}, seeds ${SEED_BASE}+ ===\n`);
if (stalled) console.log(`!! ${stalled} matches stalled before gameover — figures below are unreliable\n`);
console.log(`decisive matches       ${n}/${matches.length}`);
console.log(`avg length             ${(matches.reduce((a, m) => a + m.turns, 0) / matches.length).toFixed(1)} turns\n`);

if (!n) {
  console.log("No decisive matches — nothing to measure.");
  process.exit(0);
}

type Metric = "score" | "cities";

/** who led on this turn by one metric, or null if tied / turn never reached */
function leaderAt(m: Match, turn: number, metric: Metric): number | null {
  const st = m.standings.get(turn);
  if (!st) return null;
  const v = st[metric];
  let best = 0;
  for (let i = 1; i < v.length; i++) if (v[i] > v[best]) best = i;
  // A tie at the top is not a lead — treat it as no information.
  return v.filter((x) => x === v[best]).length > 1 ? null : best;
}

const CHECKPOINTS = [3, 5, 8, 10, 12, 15, 18, 20, 25];

function curve(label: string, pool: Match[], metric: Metric) {
  console.log(`\n${label}  (n=${pool.length})`);
  for (const turn of CHECKPOINTS) {
    let held = 0;
    let sampled = 0;
    for (const m of pool) {
      const lead = leaderAt(m, turn, metric);
      if (lead === null) continue;
      sampled++;
      if (lead === m.winner) held++;
    }
    if (sampled < 8) continue; // too few samples to read anything into
    const p = (held / sampled) * 100;
    console.log(
      `  turn ${String(turn).padStart(2)}   ${p.toFixed(0).padStart(3)}%  (${String(sampled).padStart(3)} games)  ${"#".repeat(Math.round(p / 2.5))}`
    );
  }
}

console.log("IF YOU LEAD ON TURN N, DO YOU WIN?");
console.log("  (4 tribes, so 25% is chance and 100% means the match was already over)");

curve("BY SCORE — all decisive matches", decisive, "score");
curve("BY CITIES HELD — all decisive matches", decisive, "cities");

// Score leadership should predict a score/domination win far better than it
// predicts a faction-path win, because four of the five paths do not count
// score at all. Splitting them apart is the difference between "the mid-game
// does not matter" and "the mid-game is measured with the wrong ruler".
const byConquest = decisive.filter((m) => m.path === "score/domination");
const byPath = decisive.filter((m) => m.path !== "score/domination");
if (byConquest.length >= 8) curve("BY CITIES HELD — matches won by score/domination", byConquest, "cities");
if (byPath.length >= 8) curve("BY CITIES HELD — matches won on a faction path", byPath, "cities");

console.log("\nHOW MATCHES WERE WON");
const pathCounts = new Map<string, number>();
for (const m of decisive) pathCounts.set(m.path, (pathCounts.get(m.path) ?? 0) + 1);
[...pathCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([p, c]) => console.log(`  ${p.padEnd(22)} ${((c / n) * 100).toFixed(0).padStart(3)}%  (${c})`));

// The turn after which the lead never changes hands again — how much of the
// match is still genuinely in play.
let lockSum = 0;
let lockCount = 0;
for (const m of decisive) {
  const turns = [...m.standings.keys()].sort((a, b) => a - b);
  let lock = turns[turns.length - 1] ?? 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const lead = leaderAt(m, turns[i], "cities");
    if (lead === null) continue;
    if (lead !== m.winner) break;
    lock = turns[i];
  }
  if (m.turns > 0) {
    lockSum += lock / m.turns;
    lockCount++;
  }
}
console.log(`\nCITY LEAD LOCKS IN AT  ${((lockSum / lockCount) * 100).toFixed(0)}% of the way through the match`);
console.log("  (the point after which the eventual winner never loses the city lead again)");

// Comeback rate: winners who were behind at the one-third mark.
for (const mark of [8, 10, 15]) {
  let comebacks = 0;
  let sampled = 0;
  for (const m of decisive) {
    const lead = leaderAt(m, mark, "cities");
    if (lead === null) continue;
    sampled++;
    if (lead !== m.winner) comebacks++;
  }
  if (sampled) {
    console.log(`COMEBACKS FROM TURN ${String(mark).padStart(2)}  ${((comebacks / sampled) * 100).toFixed(0)}%  (${comebacks}/${sampled} winners did not hold the city lead)`);
  }
}
console.log("");
