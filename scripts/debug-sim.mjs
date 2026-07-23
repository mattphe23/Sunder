// headless sim debug v3: track hero lifecycles across a match.
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
globalThis.setTimeout = () => 0;

const { game } = await import("../client/src/game/core/state.ts");
const { runAiTurn } = await import("../client/src/game/core/ai.ts");

for (const seed of [7, 12, 23]) {
  game.newGame({ size: 9, seed, difficulty: "normal", preset: "continents", humanTribe: seed % 4 });
  game.state.showIntro = false;
  let guard = 0;
  let lastHeroes = game.state.units.filter((u) => u.hero).length;
  console.log(`--- seed ${seed}: heroes at start = ${lastHeroes}`);
  while (game.state.phase === "playing" && guard < 600) {
    guard++;
    const s = game.state;
    s.aiThinking = false;
    if (s.pendingPerk) {
      const hero = s.units.find((u) => u.id === s.pendingPerk);
      if (hero) {
        const c = game.perkChoices(hero);
        if (c.length) game.choosePerk(c[0]); else s.pendingPerk = null;
      } else s.pendingPerk = null;
    }
    if (s.tribes[s.currentTribe]?.alive) runAiTurn(game, s.currentTribe);
    const now = game.state.units.filter((u) => u.hero).length;
    if (now !== lastHeroes) {
      console.log(`  turn=${game.state.turn} heroes ${lastHeroes} -> ${now} (fell: ${game.state.tribes.filter(t=>t.heroFell).map(t=>t.name).join(",")})`);
      lastHeroes = now;
    }
    if (game.state.phase !== "playing") break;
    game.endTurn();
  }
  console.log(`  END turn=${game.state.turn} phase=${game.state.phase} heroes=${game.state.units.filter((u) => u.hero).length} tribesAlive=${game.state.tribes.filter(t=>t.alive).length}`);
}
