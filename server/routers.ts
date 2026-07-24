import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { playtestRouter } from "./routers/playtest";
import { storeRouter } from "./routers/store";

// challengeKey format: "daily:2026-07-23" | "weekly:2026-W30" (server-checked)
const challengeKeyShape = z
  .string()
  .regex(/^(daily:\d{4}-\d{2}-\d{2}|weekly:\d{4}-W\d{1,2})$/, "Bad challenge key");

/** The server derives its own current period keys so clients can't post into past/future boards. */
function currentChallengeKeys(): string[] {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  // ISO week (UTC): Thursday-based algorithm
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  // week number is zero-padded (W07, W30) to match the client's ISO week key
  return [`daily:${day}`, `weekly:${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`];
}

const statsShape = {
  commanderName: z.string().trim().min(1).max(40).optional(),
  games: z.number().int().min(0).optional(),
  wins: z.number().int().min(0).optional(),
  bestScore: z.number().int().min(0).optional(),
  duelsWon: z.number().int().min(0).optional(),
  campsRazed: z.number().int().min(0).optional(),
  battlesWon: z.number().int().min(0).optional(),
  heroesLost: z.number().int().min(0).optional(),
  highestHeroLevel: z.number().int().min(0).optional(),
};

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  playtest: playtestRouter,
  store: storeRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ── Cloud profile (Commander's Record) ────────────────────────────────────
  profile: router({
    get: protectedProcedure.query(({ ctx }) => db.getProfile(ctx.user.id)),
    sync: protectedProcedure
      .input(z.object(statsShape))
      .mutation(({ ctx, input }) => db.upsertProfile(ctx.user.id, input)),
  }),

  // ── Global challenge leaderboard (v19) ────────────────────────────────────
  leaderboard: router({
    submit: protectedProcedure
      .input(
        z.object({
          challengeKey: challengeKeyShape,
          commanderName: z.string().trim().min(1).max(40),
          score: z.number().int().min(0).max(1_000_000),
          won: z.boolean(),
          turns: z.number().int().min(0).max(500),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!currentChallengeKeys().includes(input.challengeKey)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge period has ended" });
        }
        return db.submitLeaderboardScore(
          ctx.user.id,
          input.challengeKey,
          input.commanderName,
          input.score,
          input.won,
          input.turns,
        );
      }),

    // Public — anyone can view the board; rank included when signed in.
    top: publicProcedure
      .input(z.object({ challengeKey: challengeKeyShape }))
      .query(async ({ ctx, input }) => {
        const rows = await db.getLeaderboardTop(input.challengeKey, 50);
        const top = rows.map((r, i) => ({
          rank: i + 1,
          commanderName: r.commanderName,
          score: r.score,
          won: r.won === 1,
          turns: r.turns,
          you: ctx.user != null && r.userId === ctx.user.id,
        }));
        let me: { rank: number; score: number } | null = null;
        if (ctx.user) {
          const mine = await db.getLeaderboardRank(ctx.user.id, input.challengeKey);
          if (mine) me = { rank: mine.rank, score: mine.entry.score };
        }
        return { top, me };
      }),
  }),

  // ── Async online matches ──────────────────────────────────────────────────
  match: router({
    create: protectedProcedure
      .input(
        z.object({
          seed: z.number().int(),
          preset: z.string().max(20),
          size: z.number().int().min(9).max(13),
          hostTribe: z.number().int().min(0).max(6),
          guestTribe: z.number().int().min(0).max(6),
          hostName: z.string().trim().min(1).max(40),
          initialState: z.string().max(4_000_000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = nanoid(10);
        await db.createMatch({
          id,
          hostUserId: ctx.user.id,
          hostName: input.hostName,
          seed: input.seed,
          preset: input.preset,
          size: input.size,
          hostTribe: input.hostTribe,
          guestTribe: input.guestTribe,
          status: "open",
          turnNumber: 0,
          currentUserId: ctx.user.id,
        });
        await db.saveTurnSnapshot(id, 0, ctx.user.id, input.initialState);
        return { id };
      }),

    join: protectedProcedure
      .input(z.object({ matchId: z.string().max(12), guestName: z.string().trim().min(1).max(40) }))
      .mutation(async ({ ctx, input }) => {
        const m = await db.getMatch(input.matchId);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        if (m.hostUserId === ctx.user.id) return { id: m.id, rejoined: true };
        if (m.status === "open" && !m.guestUserId) {
          await db.updateMatch(m.id, { guestUserId: ctx.user.id, guestName: input.guestName, status: "active" });
          return { id: m.id, rejoined: false };
        }
        if (m.guestUserId === ctx.user.id) return { id: m.id, rejoined: true };
        throw new TRPCError({ code: "FORBIDDEN", message: "Match already has two players" });
      }),

    get: protectedProcedure
      .input(z.object({ matchId: z.string().max(12) }))
      .query(async ({ ctx, input }) => {
        const m = await db.getMatch(input.matchId);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        if (m.hostUserId !== ctx.user.id && m.guestUserId !== ctx.user.id && m.status !== "open") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your match" });
        }
        const snap = await db.getLatestSnapshot(m.id);
        return { match: m, state: snap?.state ?? null };
      }),

    // Lightweight poll — no snapshot payload, safe to call on an interval.
    status: protectedProcedure
      .input(z.object({ matchId: z.string().max(12) }))
      .query(async ({ input }) => {
        const m = await db.getMatch(input.matchId);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        return {
          status: m.status,
          turnNumber: m.turnNumber,
          currentUserId: m.currentUserId,
          guestName: m.guestName,
          resultText: m.resultText,
        };
      }),

    submitTurn: protectedProcedure
      .input(
        z.object({
          matchId: z.string().max(12),
          turnNumber: z.number().int().min(0),
          state: z.string().max(4_000_000),
          finished: z.boolean().optional(),
          resultText: z.string().max(200).optional(),
          winner: z.enum(["me", "opponent", "draw"]).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const m = await db.getMatch(input.matchId);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        if (m.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Match is not active" });
        if (m.currentUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your turn" });
        }
        if (input.turnNumber !== m.turnNumber + 1) {
          throw new TRPCError({ code: "CONFLICT", message: "Turn number out of sync — refresh the match" });
        }
        await db.saveTurnSnapshot(m.id, input.turnNumber, ctx.user.id, input.state);
        const opponentId = m.hostUserId === ctx.user.id ? m.guestUserId : m.hostUserId;
        if (input.finished) {
          const winnerUserId =
            input.winner === "me" ? ctx.user.id : input.winner === "opponent" ? (opponentId ?? null) : null;
          await db.updateMatch(m.id, {
            turnNumber: input.turnNumber,
            status: "finished",
            winnerUserId,
            resultText: input.resultText ?? null,
            currentUserId: null,
          });
        } else {
          await db.updateMatch(m.id, { turnNumber: input.turnNumber, currentUserId: opponentId ?? null });
        }
        return { ok: true } as const;
      }),

    myMatches: protectedProcedure.query(async ({ ctx }) => {
      const list = await db.listMatchesForUser(ctx.user.id);
      return list.map(m => ({
        id: m.id,
        role: m.hostUserId === ctx.user.id ? ("host" as const) : ("guest" as const),
        opponentName: m.hostUserId === ctx.user.id ? m.guestName : m.hostName,
        status: m.status,
        turnNumber: m.turnNumber,
        yourTurn: m.status === "active" && m.currentUserId === ctx.user.id,
        youWon: m.winnerUserId != null && m.winnerUserId === ctx.user.id,
        resultText: m.resultText,
        updatedAt: m.updatedAt,
        preset: m.preset,
        size: m.size,
      }));
    }),

    abandon: protectedProcedure
      .input(z.object({ matchId: z.string().max(12) }))
      .mutation(async ({ ctx, input }) => {
        const m = await db.getMatch(input.matchId);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        if (m.hostUserId !== ctx.user.id && m.guestUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your match" });
        }
        const opponentId = m.hostUserId === ctx.user.id ? m.guestUserId : m.hostUserId;
        await db.updateMatch(m.id, {
          status: m.status === "open" ? "abandoned" : "finished",
          winnerUserId: m.status === "active" ? (opponentId ?? null) : null,
          resultText: m.status === "active" ? "Opponent conceded" : "Match abandoned",
          currentUserId: null,
        });
        return { ok: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
