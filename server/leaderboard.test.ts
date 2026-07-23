// v19 — leaderboard router tests: key validation, period gating, keep-best flow.
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the db layer so tests don't need a live database.
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    submitLeaderboardScore: vi.fn(async () => ({ improved: true })),
    getLeaderboardTop: vi.fn(async () => [
      { id: 1, userId: 7, challengeKey: "daily:x", commanderName: "Kael", score: 300, won: 1, turns: 22, updatedAt: new Date() },
      { id: 2, userId: 9, challengeKey: "daily:x", commanderName: "Mira", score: 250, won: 0, turns: 30, updatedAt: new Date() },
    ]),
    getLeaderboardRank: vi.fn(async () => ({
      rank: 1,
      entry: { id: 1, userId: 7, challengeKey: "daily:x", commanderName: "Kael", score: 300, won: 1, turns: 22, updatedAt: new Date() },
    })),
  };
});

import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

function ctxFor(userId: number | null): TrpcContext {
  const user = userId === null ? null : ({
    id: userId,
    openId: `open-${userId}`,
    email: null,
    name: "Test",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as NonNullable<TrpcContext["user"]>);
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

/** Server-side current period keys, mirrored from routers.ts. */
function currentDailyKey(): string {
  return `daily:${new Date().toISOString().slice(0, 10)}`;
}
function currentWeeklyKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `weekly:${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

beforeEach(() => vi.clearAllMocks());

describe("leaderboard.submit", () => {
  it("accepts a score for the current daily period", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    const res = await caller.leaderboard.submit({
      challengeKey: currentDailyKey(),
      commanderName: "Kael",
      score: 300,
      won: true,
      turns: 22,
    });
    expect(res).toEqual({ improved: true });
    expect(db.submitLeaderboardScore).toHaveBeenCalledWith(7, currentDailyKey(), "Kael", 300, true, 22);
  });

  it("accepts the current weekly period (zero-padded key)", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    await expect(
      caller.leaderboard.submit({
        challengeKey: currentWeeklyKey(),
        commanderName: "Kael",
        score: 100,
        won: false,
        turns: 30,
      }),
    ).resolves.toEqual({ improved: true });
  });

  it("rejects a past period", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    await expect(
      caller.leaderboard.submit({
        challengeKey: "daily:2020-01-01",
        commanderName: "Kael",
        score: 300,
        won: true,
        turns: 22,
      }),
    ).rejects.toThrow(/period has ended/i);
  });

  it("rejects malformed keys", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    await expect(
      caller.leaderboard.submit({
        challengeKey: "daily:not-a-date" as string,
        commanderName: "Kael",
        score: 300,
        won: true,
        turns: 22,
      }),
    ).rejects.toThrow();
  });

  it("requires sign-in", async () => {
    const caller = appRouter.createCaller(ctxFor(null));
    await expect(
      caller.leaderboard.submit({
        challengeKey: currentDailyKey(),
        commanderName: "Kael",
        score: 300,
        won: true,
        turns: 22,
      }),
    ).rejects.toThrow();
  });
});

describe("leaderboard.top", () => {
  it("returns ranked rows and marks the caller's entry", async () => {
    const caller = appRouter.createCaller(ctxFor(7));
    const res = await caller.leaderboard.top({ challengeKey: currentDailyKey() });
    expect(res.top).toHaveLength(2);
    expect(res.top[0]).toMatchObject({ rank: 1, commanderName: "Kael", you: true });
    expect(res.top[1]).toMatchObject({ rank: 2, commanderName: "Mira", you: false });
    expect(res.me).toEqual({ rank: 1, score: 300 });
  });

  it("is public — works signed out, with no personal rank", async () => {
    const caller = appRouter.createCaller(ctxFor(null));
    const res = await caller.leaderboard.top({ challengeKey: currentDailyKey() });
    expect(res.top).toHaveLength(2);
    expect(res.top.every(r => r.you === false)).toBe(true);
    expect(res.me).toBeNull();
  });
});
