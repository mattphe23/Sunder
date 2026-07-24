// v28 balance verification: re-run the user's four playtest configurations
// (identical seed/size/preset/tribe/turns/model) against the patched engine.
// Usage: npx tsx scripts/rerun-v28.ts [runIndex]   (no arg = all four, sequential)
import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { runPlaytest } from "../server/playtest";

const RUNS = [
  { id: 1, seed: 841758, size: 13, preset: "continents", llmTribe: 0, maxTurns: 15, model: "gemini-2.5-flash" },
  { id: 2, seed: 437396, size: 13, preset: "archipelago", llmTribe: 0, maxTurns: 15, model: "gemini-2.5-flash" },
  { id: 3, seed: 657569, size: 13, preset: "archipelago", llmTribe: 1, maxTurns: 15, model: "gemini-2.5-flash" },
  { id: 4, seed: 146213, size: 13, preset: "continents", llmTribe: 1, maxTurns: 15, model: "gemini-2.5-flash" },
];

const outDir = "docs/v28-reruns";
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const arg = process.argv[2] ? Number(process.argv[2]) : null;
const targets = arg ? RUNS.filter((r) => r.id === arg) : RUNS;

for (const r of targets) {
  const t0 = Date.now();
  console.log(`\n=== Re-run ${r.id}: seed ${r.seed} ${r.preset} tribe ${r.llmTribe} ===`);
  try {
    const out = await runPlaytest(
      { seed: r.seed, size: r.size, preset: r.preset, llmTribe: r.llmTribe, maxTurns: r.maxTurns, model: r.model },
      (p) => process.stdout.write(`\r  turn ${p.turnsPlayed} (llm ${p.llmActions} / fb ${p.fallbackActions})   `),
    );
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`\n  done in ${secs}s | turns ${out.turnsPlayed} | llm ${out.llmActions} | fallback ${out.fallbackActions}`);
    const fb = out.feedback as { scores?: Record<string, number> } | null;
    if (fb?.scores) console.log(`  scores: ${JSON.stringify(fb.scores)}`);
    console.log(`  final: ${out.matchSummary.tribeScores.map((t) => `${t.name}:${t.score}`).join(" ")}`);
    writeFileSync(`${outDir}/rerun-${r.id}.json`, JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`  FAILED: ${(e as Error).message}`);
    writeFileSync(`${outDir}/rerun-${r.id}.json`, JSON.stringify({ error: String(e) }, null, 2));
  }
}
console.log("\nAll requested re-runs complete.");
