// Is the "impossible" pro brain actually stronger, or just more passive?
//
// The batch audit showed matches on `impossible` produce ~1/3 the combat of
// `normal` (19 battles vs 54). The pro brain refuses marginal trades by design.
// That is only a good trade-off if it wins; if it does not, the hardest
// difficulty is merely the most passive one, which is the worst of both worlds.
//
// Difficulty is global state, so we retarget it per acting tribe: seats 0 and 2
// think with the pro brain, seats 1 and 3 with the standard one, on the same
// map from the same seed.
import { game } from "../client/src/game/core/state";

(globalThis as unknown as { window: undefined }).window = undefined;
const pending: (() => void)[] = [];
(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => { pending.push(fn); return 0; };

const GAMES = parseInt(process.argv[2] ?? "160", 10);
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;

let proWins = 0, stdWins = 0;
let proScore = 0, stdScore = 0;
let proBattles = 0, stdBattles = 0;
let proCities = 0, stdCities = 0;
let proUnits = 0, stdUnits = 0, proTech = 0, stdTech = 0, proCityCount = 0, stdCityCount = 0;

for (let g = 0; g < GAMES; g++) {
  // alternate which parity of seat gets the pro brain, so seat order and brain
  // are not confounded
  const proParity = g % 2;
  const isPro = (tribe: number) => tribe % 2 === proParity;

  pending.length = 0;
  game.newGame({
    size: 11, humanTribe: -1, difficulty: "hard", seed: 31000 + g,
    preset: PRESETS[g % PRESETS.length],
    roster: [0, 1, 2, 3, 4, 5].slice(0, 4).map((d) => (d + g) % 6),
  });

  let steps = 0;
  while (game.state.phase === "playing" && steps++ < 200000) {
    if (!pending.length) break;
    // the queued callback is the acting tribe's turn — pick its brain first
    const s = game.state as unknown as { currentTribe: number; difficulty: string };
    s.difficulty = isPro(s.currentTribe) ? "impossible" : "hard";
    pending.shift()!();
  }

  const s = game.state;
  if (s.phase !== "playing" && s.winner !== null) {
    if (isPro(s.winner)) proWins++; else stdWins++;
  }
  for (const t of s.tribes) {
    const st = s.stats[t.index];
    const units = s.units.filter((u) => u.tribe === t.index).length;
    const cities = s.cities.filter((c) => c.tribe === t.index).length;
    if (isPro(t.index)) {
      proScore += t.score; proBattles += st?.battlesWon ?? 0; proCities += st?.citiesCaptured ?? 0;
      proUnits += units; proTech += t.techs.length; proCityCount += cities;
    } else {
      stdScore += t.score; stdBattles += st?.battlesWon ?? 0; stdCities += st?.citiesCaptured ?? 0;
      stdUnits += units; stdTech += t.techs.length; stdCityCount += cities;
    }
  }
  if ((g + 1) % 20 === 0) console.error(`  ...${g + 1}/${GAMES}`);
}

const seats = GAMES * 2; // two seats per brain per game
const pc = (n: number) => ((n / (proWins + stdWins)) * 100).toFixed(0) + "%";
console.log(`\n=== PRO BRAIN vs STANDARD BRAIN — ${GAMES} games, 2 seats each ===\n`);
console.log(`  wins            pro ${String(proWins).padStart(3)} (${pc(proWins)})   standard ${String(stdWins).padStart(3)} (${pc(stdWins)})`);
console.log(`  avg score       pro ${(proScore / seats).toFixed(0).padStart(5)}      standard ${(stdScore / seats).toFixed(0).padStart(5)}`);
console.log(`  battles won     pro ${(proBattles / seats).toFixed(1).padStart(5)}      standard ${(stdBattles / seats).toFixed(1).padStart(5)}`);
console.log(`  cities captured pro ${(proCities / seats).toFixed(1).padStart(5)}      standard ${(stdCities / seats).toFixed(1).padStart(5)}`);
console.log(`  units alive     pro ${(proUnits / seats).toFixed(1).padStart(5)}      standard ${(stdUnits / seats).toFixed(1).padStart(5)}`);
console.log(`  cities held     pro ${(proCityCount / seats).toFixed(1).padStart(5)}      standard ${(stdCityCount / seats).toFixed(1).padStart(5)}`);
console.log(`  techs           pro ${(proTech / seats).toFixed(1).padStart(5)}      standard ${(stdTech / seats).toFixed(1).padStart(5)}`);
console.log("");
