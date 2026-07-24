// AI Playtest Lab routes — admin-only, on-demand.
// start: creates a queued run row and kicks the job asynchronously in-process
//        (fire-and-forget; Autoscale's request window is plenty for one match,
//        and the client polls `get` for status).
// list/get: dashboard reads.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { runPlaytest, DEFAULT_PLAYTEST_MODEL } from "../playtest";
import { runMapBuilder } from "../mapBuilder";

// Serialize runs in-process: the game engine is a module singleton, so two
// concurrent playtests would corrupt each other's state.
let chain: Promise<void> = Promise.resolve();

function enqueue(runId: number, params: { seed: number; size: number; preset: string; llmTribe: number; maxTurns: number; model?: string }) {
  chain = chain
    .then(async () => {
      await db.updatePlaytestRun(runId, { status: "running" });
      try {
        const out = await runPlaytest(params, async (p) => {
          await db.updatePlaytestRun(runId, {
            turnsPlayed: p.turnsPlayed,
            llmActions: p.llmActions,
            fallbackActions: p.fallbackActions,
          });
        });
        await db.updatePlaytestRun(runId, {
          status: "done",
          model: out.model,
          turnsPlayed: out.turnsPlayed,
          llmActions: out.llmActions,
          fallbackActions: out.fallbackActions,
          matchSummary: JSON.stringify(out.matchSummary),
          feedback: out.feedback ? JSON.stringify(out.feedback) : null,
          finishedAt: new Date(),
        });
      } catch (err) {
        await db.updatePlaytestRun(runId, {
          status: "failed",
          error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
          finishedAt: new Date(),
        });
      }
    })
    .catch(() => {});
}

export const playtestRouter = router({
  // AI map builder: survey candidate seeds, measure fairness metrics, LLM
  // ranks and names the best boards. Synchronous — a survey is seconds of
  // generation plus one LLM call, well inside the request window.
  buildMaps: adminProcedure
    .input(
      z.object({
        preset: z.enum(["continents", "archipelago", "highlands", "pangaea"]).default("continents"),
        size: z.union([z.literal(9), z.literal(11), z.literal(13)]).default(11),
        count: z.number().int().min(6).max(24).default(12),
        brief: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return runMapBuilder(input);
    }),

  start: adminProcedure
    .input(
      z.object({
        seed: z.number().int().min(1).max(999999).optional(),
        size: z.union([z.literal(9), z.literal(11), z.literal(13)]).default(11),
        preset: z.enum(["continents", "archipelago", "highlands", "pangaea"]).default("continents"),
        llmTribe: z.number().int().min(0).max(3).default(0),
        maxTurns: z.number().int().min(5).max(30).default(15),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const seed = input.seed ?? Math.floor(Math.random() * 900000) + 1;
      const run = await db.createPlaytestRun({
        requestedByUserId: ctx.user.id,
        seed,
        size: input.size,
        preset: input.preset,
        llmTribe: input.llmTribe,
        maxTurns: input.maxTurns,
        model: DEFAULT_PLAYTEST_MODEL,
      });
      if (!run) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create run" });
      enqueue(run.id, { seed, size: input.size, preset: input.preset, llmTribe: input.llmTribe, maxTurns: input.maxTurns });
      return run;
    }),

  list: adminProcedure.query(async () => {
    const rows = await db.listPlaytestRuns(30);
    // strip heavy JSON blobs from the list payload
    return rows.map(({ matchSummary, feedback, ...rest }) => ({
      ...rest,
      hasReport: !!feedback,
      winnerName: matchSummary ? (JSON.parse(matchSummary) as { winnerName?: string | null }).winnerName ?? null : null,
    }));
  }),

  get: adminProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
    const run = await db.getPlaytestRun(input.id);
    if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
    return run;
  }),
});
