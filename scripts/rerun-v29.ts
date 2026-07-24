// v29 validation: sanity-check pacing/fun after the QoL + anti-turtling pass.
// Re-runs two of the user's playtest seeds (one continents, one archipelago)
// against the patched engine and saves reports for comparison.
// Usage: npx tsx scripts/rerun-v29.ts
import "dotenv/config";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { runPlaytest } from "../server/playtest";

const RUNS = [
  { id: 1, seed: 841758, size: 13, preset: "continents", llmTribe: 0, maxTurns: 15, model: "gemini-2.5-flash" },
  { id: 3, seed: 657569, size: 13, preset: "archipelago", llmTribe: 1, maxTurns: 15, model: "gemini-2.5-flash" },
];

const outDir = "docs/v29-reruns";
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const r of RUNS) {
  const t0 = Date.now();
  console.log(`\n=== v29 run ${r.id}: seed ${r.seed} ${r.preset} tribe ${r.llmTribe} ===`);
  try {
    const out = await runPlaytest(
      { seed: r.seed, size: r.size, preset: r.preset as any, llmTribe: r.llmTribe, maxTurns: r.maxTurns, model: r.model },
      (p) => process.stdout.write(`\r  turn ${p.turnsPlayed} (llm ${p.llmActions} / fb ${p.fallbackActions})   `),
    );
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`\n  done in ${secs}s | turns ${out.turnsPlayed} | llm ${out.llmActions} | fallback ${out.fallbackActions}`);
    writeFileSync(`${outDir}/run${r.id}.json`, JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`  run ${r.id} FAILED:`, e);
  }
}
console.log("\nALL DONE");
