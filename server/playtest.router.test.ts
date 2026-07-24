// Admin gating tests for the playtest routes (no DB writes — non-admin callers
// must be rejected before any db access happens).
import { describe, it, expect, vi } from "vitest";
import type { inferProcedureInput } from "@trpc/server";

vi.mock("./playtest", () => ({
  runPlaytest: vi.fn(async () => ({ turnsPlayed: 0, llmActions: 0, fallbackActions: 0, matchSummary: {}, feedback: null, model: "m" })),
  DEFAULT_PLAYTEST_MODEL: "test-model",
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function ctxFor(role: "user" | "admin" | null): TrpcContext {
  return {
    user: role
      ? ({ id: 1, openId: "u1", name: "T", email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as TrpcContext["user"])
      : null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("playtest route gating", () => {
  it("rejects anonymous callers", async () => {
    const caller = appRouter.createCaller(ctxFor(null));
    await expect(caller.playtest.list()).rejects.toThrow();
  });

  it("rejects signed-in non-admin callers", async () => {
    const caller = appRouter.createCaller(ctxFor("user"));
    await expect(caller.playtest.list()).rejects.toThrow();
    const input: inferProcedureInput<typeof appRouter.playtest.start> = { size: 9, preset: "continents", llmTribe: 0, maxTurns: 5 };
    await expect(caller.playtest.start(input)).rejects.toThrow();
    await expect(caller.playtest.get({ id: 1 })).rejects.toThrow();
  });
});

