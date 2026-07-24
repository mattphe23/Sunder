// Deterministic all-scripted check: does Auren die early on seed 841758 without the LLM?
// @ts-nocheck
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (() => 0) as any;

const { game } = await import("../client/src/game/core/state");
const { runAiTurn } = await import("../client/src/game/core/ai");

game.newGame({ seed: 841758, size: 13, humanTribe: 0, difficulty: "normal" });
const s = game.state;
let guard = 0;
while (s.phase === "playing" && s.turn <= 16 && guard++ < 2000) {
  runAiTurn(game, s.currentTribe);
  game.endTurn();
}
console.log("turn", s.turn, "phase", s.phase, "winner", s.winner);
for (const t of s.tribes) {
  const cities = s.cities.filter((c) => c.tribe === t.index).length;
  console.log(` ${t.name}: score=${t.score} alive=${t.alive} cities=${cities}`);
}
globalThis.setTimeout = realSetTimeout;
process.exit(0);

