// One-off smoke test: run a real 5-turn playtest against the live built-in LLM.
// Usage: npx tsx scripts/smoke-playtest.ts
import "dotenv/config";
import { runPlaytest } from "../server/playtest";

const t0 = Date.now();
const out = await runPlaytest(
  { seed: 1234, size: 9, preset: "continents", llmTribe: 0, maxTurns: 5 },
  (p) => console.log(`  progress: turn ${p.turnsPlayed}, llm ${p.llmActions}, fallback ${p.fallbackActions}`),
);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s | turns ${out.turnsPlayed} | llmActions ${out.llmActions} | fallback ${out.fallbackActions} | model ${out.model}`);
console.log("notes:", out.matchSummary.turnNotes);
console.log("scores:", out.matchSummary.tribeScores.map((t) => `${t.name}:${t.score}(c${t.cities},u${t.units})`).join(" "));
console.log("feedback:", out.feedback ? JSON.stringify(out.feedback).slice(0, 900) : "NULL");
