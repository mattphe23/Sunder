// Gameplay audit — does each system Sunder adds on top of the Polytopia
// formula actually show up in real matches?
//
// Runs headless AI-vs-AI games and instruments every custom subsystem:
// victory paths, heroes, buildings, roads/trade, diplomacy, world events.
// A mechanic that almost never fires is either dead weight or a bug.
//
//   pnpm tsx scripts/gameplay-audit.mts [games] [size]
import { game } from "../client/src/game/core/state";
import { TRIBE_DEFS } from "../client/src/game/core/types";

// stub timers so AI turns run synchronously
(globalThis as unknown as { window: undefined }).window = undefined;
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => { fn(); return 0; };

const GAMES = parseInt(process.argv[2] ?? "60", 10);
const SIZE = parseInt(process.argv[3] ?? "11", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;
const DIFFS = ["normal", "hard", "impossible"] as const;

interface Row {
  seed: number;
  preset: string;
  difficulty: string;
  turns: number;
  winnerDef: number | null;
  path: string;
  cappedOut: boolean;
  buildings: number;
  roads: number;
  heroesAlive: number;
  heroMaxLevel: number;
  peacePairs: number;
  grudges: number;
  camps: number;
  storms: number;
  ruinsClaimed: number;
  battles: number;
  citiesCaptured: number;
  topScore: number;
}

const rows: Row[] = [];

for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % PRESETS.length];
  const difficulty = DIFFS[Math.floor(g / PRESETS.length) % DIFFS.length];
  const seed = 7000 + g;
  // rotate which def sits in the human slot so tribe stats are not slot-confounded
  const roster = [0, 1, 2, 3, 4, 5].slice(0, 4).map((d) => (d + g) % 6);

  game.newGame({ size: SIZE, humanTribe: 0, difficulty, seed, preset, roster });
  // flip the nominal human to AI so all four seats play (batch-harness fix from v41)
  const st = game.state as unknown as { tribes: { isHuman: boolean }[] };
  st.tribes.forEach((t) => { t.isHuman = false; });

  let guard = 0;
  while (game.state.phase === "playing" && guard < 600) {
    if (game.state.currentTribe === game.state.humanTribe && !game.state.aiThinking) {
      game.endTurn();
    }
    guard++;
  }

  const s = game.state;
  const tiles = s.tiles;
  const peace = s.peaceUntil ?? {};
  let peacePairs = 0;
  for (const a of Object.keys(peace)) {
    for (const b of Object.keys(peace[a as unknown as number] ?? {})) {
      if ((peace[a as unknown as number][b as unknown as number] ?? 0) > 0) peacePairs++;
    }
  }
  const heroes = s.units.filter((u) => u.hero);
  const stats = s.stats ?? [];
  const sum = (k: keyof (typeof stats)[number]) =>
    stats.reduce((n, t) => n + (Number(t[k]) || 0), 0);

  rows.push({
    seed,
    preset,
    difficulty,
    turns: s.turn,
    winnerDef: s.winner === null ? null : (s.tribes[s.winner]?.defIndex ?? null),
    path: s.winPath?.pathId ?? (s.winner === null ? "none" : "score/domination"),
    cappedOut: s.turn >= 30,
    buildings: tiles.filter((t) => t.building).length,
    roads: tiles.filter((t) => t.road).length,
    heroesAlive: heroes.length,
    heroMaxLevel: heroes.reduce((m, u) => Math.max(m, (u as unknown as { level?: number }).level ?? 1), 0),
    peacePairs: peacePairs / 2,
    grudges: (s.grudges ?? []).length,
    camps: (s.camps ?? []).length,
    storms: (s.storms ?? []).length,
    ruinsClaimed: sum("ruinsClaimed" as never),
    battles: sum("battlesWon" as never),
    citiesCaptured: sum("citiesCaptured" as never),
    topScore: Math.max(...s.tribes.map((t) => t.score)),
  });
  if ((g + 1) % 10 === 0) console.error(`  ...${g + 1}/${GAMES}`);
}

/* ---------------- report ---------------- */
const n = rows.length;
const avg = (f: (r: Row) => number) => (rows.reduce((a, r) => a + f(r), 0) / n).toFixed(2);
const pct = (f: (r: Row) => boolean) => ((rows.filter(f).length / n) * 100).toFixed(0) + "%";

console.log(`\n=== SUNDER GAMEPLAY AUDIT — ${n} games, size ${SIZE} ===\n`);

console.log("MATCH SHAPE");
console.log(`  avg turns              ${avg((r) => r.turns)}   (30 = cap)`);
console.log(`  hit the turn cap       ${pct((r) => r.cappedOut)}`);
console.log(`  decisive (had winner)  ${pct((r) => r.winnerDef !== null)}`);
console.log(`  avg top score          ${avg((r) => r.topScore)}`);

console.log("\nVICTORY PATHS  (asymmetric paths are a headline feature)");
const paths = new Map<string, number>();
for (const r of rows) paths.set(r.path, (paths.get(r.path) ?? 0) + 1);
[...paths.entries()].sort((a, b) => b[1] - a[1]).forEach(([p, c]) =>
  console.log(`  ${p.padEnd(22)} ${((c / n) * 100).toFixed(0).padStart(3)}%  (${c})`)
);

console.log("\nTRIBE WIN RATE  (roster rotated, so this is not slot-confounded)");
const wins = new Map<number, number>();
const seen = new Map<number, number>();
for (const r of rows) {
  if (r.winnerDef !== null) wins.set(r.winnerDef, (wins.get(r.winnerDef) ?? 0) + 1);
  const roster = [0, 1, 2, 3].map((i) => (i + (r.seed - 7000)) % 6);
  for (const d of roster) seen.set(d, (seen.get(d) ?? 0) + 1);
}
TRIBE_DEFS.slice(0, 6).forEach((t, d) => {
  const s2 = seen.get(d) ?? 0;
  const w = wins.get(d) ?? 0;
  console.log(`  ${t.name.padEnd(10)} ${s2 ? ((w / s2) * 100).toFixed(0).padStart(3) : " --"}%   (${w}/${s2} appearances)`);
});

console.log("\nDO THE ADDED SYSTEMS ACTUALLY FIRE?");
console.log(`  buildings placed / game     ${avg((r) => r.buildings)}      (games with 0: ${pct((r) => r.buildings === 0)})`);
console.log(`  road tiles / game           ${avg((r) => r.roads)}      (games with 0: ${pct((r) => r.roads === 0)})`);
console.log(`  heroes alive at end         ${avg((r) => r.heroesAlive)} of 4   max hero level ${avg((r) => r.heroMaxLevel)}`);
console.log(`  peace treaties standing     ${avg((r) => r.peacePairs)}      (games with 0: ${pct((r) => r.peacePairs === 0)})`);
console.log(`  grudges                     ${avg((r) => r.grudges)}`);
console.log(`  barbarian camps at end      ${avg((r) => r.camps)}      (games with 0: ${pct((r) => r.camps === 0)})`);
console.log(`  sea storms at end           ${avg((r) => r.storms)}`);
console.log(`  ruins claimed               ${avg((r) => r.ruinsClaimed)}`);
console.log(`  battles won (all tribes)    ${avg((r) => r.battles)}`);
console.log(`  cities captured             ${avg((r) => r.citiesCaptured)}`);

console.log("\nBY PRESET");
for (const p of PRESETS) {
  const sub = rows.filter((r) => r.preset === p);
  if (!sub.length) continue;
  const a = (f: (r: Row) => number) => (sub.reduce((x, r) => x + f(r), 0) / sub.length).toFixed(1);
  console.log(`  ${p.padEnd(12)} turns ${a((r) => r.turns).padStart(5)}  roads ${a((r) => r.roads).padStart(5)}  buildings ${a((r) => r.buildings).padStart(5)}  capped ${((sub.filter((r) => r.cappedOut).length / sub.length) * 100).toFixed(0)}%`);
}

console.log("\nBY DIFFICULTY");
for (const d of DIFFS) {
  const sub = rows.filter((r) => r.difficulty === d);
  if (!sub.length) continue;
  const a = (f: (r: Row) => number) => (sub.reduce((x, r) => x + f(r), 0) / sub.length).toFixed(1);
  console.log(`  ${d.padEnd(12)} turns ${a((r) => r.turns).padStart(5)}  battles ${a((r) => r.battles).padStart(5)}  topScore ${a((r) => r.topScore).padStart(7)}`);
}
console.log("");
