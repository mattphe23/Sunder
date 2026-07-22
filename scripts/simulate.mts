// Headless simulation: run full AI-vs-AI games to validate the game loop.
import { game } from "../client/src/game/core/state";

// stub timers so AI runs synchronously
(globalThis as any).window = undefined;
const origSetTimeout = globalThis.setTimeout;
(globalThis as any).setTimeout = (fn: () => void) => { fn(); return 0 as any; };

let ok = true;
for (let trial = 0; trial < 5; trial++) {
  game.newGame({ size: 11, humanTribe: 0, difficulty: "hard", seed: 1000 + trial });
  // human idles: just end turn repeatedly; AIs play. Game must terminate.
  let guard = 0;
  while (game.state.phase === "playing" && guard < 400) {
    if (game.state.currentTribe === game.state.humanTribe && !game.state.aiThinking) {
      game.endTurn();
    }
    guard++;
  }
  const s = game.state;
  const aiTechs = s.tribes.filter((t) => !t.isHuman).map((t) => t.techs.length);
  const aiUnits = s.tribes.filter((t) => !t.isHuman).map((t) => s.units.filter((u) => u.tribe === t.index).length);
  const aiCities = s.tribes.filter((t) => !t.isHuman).map((t) => s.cities.filter((c) => c.tribe === t.index).length);
  console.log(`trial=${trial} phase=${s.phase} turn=${s.turn} winner=${s.winner} aiTechs=${aiTechs} aiUnits=${aiUnits} aiCities=${aiCities}`);
  if (s.phase !== "gameover") { console.error("FAIL: game did not terminate"); ok = false; }
  if (aiTechs.every((n) => n <= 1)) { console.error("FAIL: AI never researched"); ok = false; }
  if (aiCities.every((n) => n <= 1)) console.warn("WARN: no AI expanded this trial");
}
console.log(ok ? "SIMULATION OK" : "SIMULATION FAILED");
process.exit(ok ? 0 : 1);
