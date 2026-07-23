// v18 server tests — match lifecycle and profile sync via appRouter with a mocked db layer.
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory fake of the db module so tests run without a live database.
const mem = {
  profiles: new Map<number, any>(),
  matches: new Map<string, any>(),
  turns: [] as any[],
};

vi.mock("./db", () => ({
  getProfile: async (userId: number) => mem.profiles.get(userId),
  upsertProfile: async (userId: number, stats: any) => {
    const existing = mem.profiles.get(userId);
    if (!existing) {
      mem.profiles.set(userId, { userId, commanderName: "Commander", games: 0, wins: 0, bestScore: 0, duelsWon: 0, campsRazed: 0, battlesWon: 0, heroesLost: 0, highestHeroLevel: 0, ...stats });
    } else {
      const merged = { ...existing };
      merged.commanderName = stats.commanderName ?? existing.commanderName;
      for (const k of ["games", "wins", "bestScore", "duelsWon", "campsRazed", "battlesWon", "heroesLost", "highestHeroLevel"]) {
        merged[k] = Math.max(existing[k] ?? 0, stats[k] ?? 0);
      }
      mem.profiles.set(userId, merged);
    }
    return mem.profiles.get(userId);
  },
  createMatch: async (m: any) => {
    mem.matches.set(m.id, { guestUserId: null, guestName: null, winnerUserId: null, resultText: null, ...m });
    return mem.matches.get(m.id);
  },
  getMatch: async (id: string) => mem.matches.get(id),
  updateMatch: async (id: string, set: any) => {
    Object.assign(mem.matches.get(id), set);
  },
  listMatchesForUser: async (userId: number) =>
    [...mem.matches.values()].filter(m => m.hostUserId === userId || m.guestUserId === userId),
  saveTurnSnapshot: async (matchId: string, turnNumber: number, submittedByUserId: number, state: string) => {
    mem.turns.push({ matchId, turnNumber, submittedByUserId, state });
  },
  getLatestSnapshot: async (matchId: string) =>
    mem.turns.filter(t => t.matchId === matchId).sort((a, b) => b.turnNumber - a.turnNumber)[0],
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function ctxFor(id: number): TrpcContext {
  return {
    user: {
      id,
      openId: `user-${id}`,
      email: null,
      name: `User ${id}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

const host = () => appRouter.createCaller(ctxFor(1));
const guest = () => appRouter.createCaller(ctxFor(2));
const stranger = () => appRouter.createCaller(ctxFor(3));

beforeEach(() => {
  mem.profiles.clear();
  mem.matches.clear();
  mem.turns.length = 0;
});

describe("profile.sync", () => {
  it("creates a profile then merges with max() so progress never regresses", async () => {
    await host().profile.sync({ commanderName: "Kael", games: 5, wins: 2, bestScore: 900 });
    // second sync from an "older" device with lower counters but a new name
    const merged = await host().profile.sync({ commanderName: "Kael II", games: 3, wins: 1, bestScore: 1200 });
    expect(merged.commanderName).toBe("Kael II");
    expect(merged.games).toBe(5); // max kept
    expect(merged.wins).toBe(2);
    expect(merged.bestScore).toBe(1200); // higher new value kept
  });
});

describe("match lifecycle", () => {
  const setup = { seed: 42, preset: "continents", size: 11, hostTribe: 0, guestTribe: 1, hostName: "Kael", initialState: '{"turn":0}' };

  it("create → join → alternating submitTurn with server-side turn validation", async () => {
    const { id } = await host().match.create(setup);
    expect(id).toBeTruthy();

    // guest joins an open match
    const joined = await guest().match.join({ matchId: id, guestName: "Mira" });
    expect(joined.rejoined).toBe(false);
    expect((await host().match.status({ matchId: id })).status).toBe("active");

    // host submits turn 1
    await host().match.submitTurn({ matchId: id, turnNumber: 1, state: '{"turn":1}' });
    let st = await host().match.status({ matchId: id });
    expect(st.turnNumber).toBe(1);
    expect(st.currentUserId).toBe(2); // now guest's turn

    // host tries to submit again out of turn → forbidden
    await expect(host().match.submitTurn({ matchId: id, turnNumber: 2, state: "{}" })).rejects.toThrow(/Not your turn/);

    // guest submits with a stale turn number → conflict
    await expect(guest().match.submitTurn({ matchId: id, turnNumber: 1, state: "{}" })).rejects.toThrow(/out of sync/);

    // guest submits correctly
    await guest().match.submitTurn({ matchId: id, turnNumber: 2, state: '{"turn":2}' });
    st = await host().match.status({ matchId: id });
    expect(st.turnNumber).toBe(2);
    expect(st.currentUserId).toBe(1);
  });

  it("third player cannot join a full match, stranger cannot read an active match", async () => {
    const { id } = await host().match.create(setup);
    await guest().match.join({ matchId: id, guestName: "Mira" });
    await expect(stranger().match.join({ matchId: id, guestName: "Eve" })).rejects.toThrow(/two players/);
    await expect(stranger().match.get({ matchId: id })).rejects.toThrow(/Not your match/);
  });

  it("finishing a turn with finished=true records the winner and closes the match", async () => {
    const { id } = await host().match.create(setup);
    await guest().match.join({ matchId: id, guestName: "Mira" });
    await host().match.submitTurn({ matchId: id, turnNumber: 1, state: "{}", finished: true, winner: "me", resultText: "Kael rules the Shatterlands" });
    const st = await host().match.status({ matchId: id });
    expect(st.status).toBe("finished");
    const mine = await host().match.myMatches();
    expect(mine[0].youWon).toBe(true);
    const theirs = await guest().match.myMatches();
    expect(theirs[0].youWon).toBe(false);
  });

  it("abandoning an active match concedes it to the opponent", async () => {
    const { id } = await host().match.create(setup);
    await guest().match.join({ matchId: id, guestName: "Mira" });
    await host().match.abandon({ matchId: id });
    const st = await guest().match.status({ matchId: id });
    expect(st.status).toBe("finished");
    const theirs = await guest().match.myMatches();
    expect(theirs[0].youWon).toBe(true);
  });
});
