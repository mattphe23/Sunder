// Interruption audit — how many times per match the game stops the player or
// waves a toast at them, per surface. Counted per-SEAT over AI-vs-AI games
// (every seat is a stand-in for the human seat): city level-up reward choices,
// hero level-up perk choices, hero-fallen cards, world-event toasts by kind.
// Peace offers are skipped — they only fire when an AI is clearly losing to a
// human, which needs a human seat.   pnpm tsx scripts/interruption-audit.mts [games] [size]
import { game } from "../client/src/game/core/state";
import { seedRandom } from "./_rng.mts";
import { TRIBE_DEFS } from "../client/src/game/core/types";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
  pending.push(fn);
  return 0;
};

const GAMES = parseInt(process.argv[2] ?? "48", 10);
const SIZE = parseInt(process.argv[3] ?? "13", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;

let cityLevelUps = 0;
let heroLevelUps = 0;
let heroFallenCards = 0;
const toastByKind = new Map<string, number>();
let totalTurns = 0;
let gamesDone = 0;

for (let g = 0; g < GAMES; g++) {
  const preset = PRESETS[g % PRESETS.length];
  const seed = 81000 + g;
  const roster = [0, 1, 2, 3].map((d) => (d + g) % TRIBE_DEFS.length);
  pending.length = 0;
  seedRandom(seed);

  const prevCityLevels = new Map<number, number>();
  const prevHeroLevel = new Map<number, number>();
  const seenHeroFallen = new Set<number>();
  const seenWorldEvents = new Set<string>();

  const unsub = game.subscribe(() => {
    const s = game.state;
    for (const c of s.cities) {
      if (c.tribe === null) continue;
      const prev = prevCityLevels.get(c.id) ?? c.level;
      if (c.level > prev) cityLevelUps += c.level - prev;
      prevCityLevels.set(c.id, c.level);
    }
    for (const u of s.units) {
      if (!u.hero) continue;
      const prev = prevHeroLevel.get(u.id) ?? (u.level ?? 1);
      if ((u.level ?? 1) > prev) heroLevelUps += (u.level ?? 1) - prev;
      prevHeroLevel.set(u.id, u.level ?? 1);
    }
    if (s.heroFallen && !seenHeroFallen.has(s.turn * 100 + (s.heroFallen.wasHuman ? 1 : 0) + s.tribes.findIndex(t => t.name === s.heroFallen!.tribeName))) {
      seenHeroFallen.add(s.turn * 100 + (s.heroFallen.wasHuman ? 1 : 0) + s.tribes.findIndex(t => t.name === s.heroFallen!.tribeName));
      heroFallenCards++;
    }
    for (const w of s.worldEvents ?? []) {
      const key = `${w.kind}:${w.turn}:${w.x},${w.y}:${w.text.slice(0, 30)}`;
      if (!seenWorldEvents.has(key)) {
        seenWorldEvents.add(key);
        toastByKind.set(w.kind, (toastByKind.get(w.kind) ?? 0) + 1);
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
  if (game.state.phase === "playing") continue;
  gamesDone++;
  totalTurns += game.state.turn;
}

const seats = gamesDone * 4;
console.log(`\n=== INTERRUPTION AUDIT — ${gamesDone} games, size ${SIZE} ===\n`);
console.log(`avg match length:              ${(totalTurns / gamesDone).toFixed(1)} turns`);
console.log(`city reward choices / seat:    ${(cityLevelUps / seats).toFixed(1)}  (each one blocks end-turn)`);
console.log(`hero perk choices / seat:      ${(heroLevelUps / seats).toFixed(1)}  (each one blocks end-turn)`);
console.log(`hero-fallen cards / seat:      ${(heroFallenCards / seats).toFixed(2)}`);
console.log(`\nworld-event toasts (per game, all seats share the world):`);
const toastTotal = [...toastByKind.values()].reduce((a, b) => a + b, 0);
[...toastByKind.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, c]) =>
  console.log(`  ${k.padEnd(18)} ${(c / gamesDone).toFixed(1)}/game  (${((c / toastTotal) * 100).toFixed(0)}%)`)
);
