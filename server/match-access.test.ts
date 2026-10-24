// Match access boundary tests: invite previews must never disclose game snapshots.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mem, getLatestSnapshot } = vi.hoisted(() => {
  const mem = {
    matches: new Map<string, any>(),
    snapshots: new Map<string, string>(),
  };
  const getLatestSnapshot = vi.fn(async (matchId: string) => {
    const state = mem.snapshots.get(matchId);
    return state === undefined ? undefined : { matchId, state };
  });
  return { mem, getLatestSnapshot };
});

vi.mock("./db", () => ({
  getMatch: async (id: string) => mem.matches.get(id),
  getLatestSnapshot,
  updateMatch: async (id: string, set: any) => {
    Object.assign(mem.matches.get(id), set);
  },
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function ctxFor(id: number | null): TrpcContext {
  return {
    user:
      id === null
        ? null
        : {
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
  };
}

const host = () => appRouter.createCaller(ctxFor(1));
const guest = () => appRouter.createCaller(ctxFor(2));
const outsider = () => appRouter.createCaller(ctxFor(3));
const anonymous = () => appRouter.createCaller(ctxFor(null));

function match(status: "open" | "active" | "finished" | "abandoned") {
  return {
    id: `m-${status}`,
    hostUserId: 1,
    guestUserId: status === "open" ? null : 2,
    hostName: "Kael",
    guestName: status === "open" ? null : "Mira",
    seed: 42,
    preset: "continents",
    size: 11,
    hostTribe: 0,
    guestTribe: 1,
    status,
    turnNumber: status === "open" ? 0 : 4,
    currentUserId: status === "active" ? 1 : null,
    winnerUserId: status === "finished" ? 1 : null,
    resultText: status === "finished" ? "Kael rules the Shatterlands" : null,
  };
}

beforeEach(() => {
  mem.matches.clear();
  mem.snapshots.clear();
  getLatestSnapshot.mockClear();
});

describe("match access boundary", () => {
  it("keeps match.get protected for unauthenticated callers", async () => {
    await expect(anonymous().match.get({ matchId: "m-open" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(anonymous().match.status({ matchId: "m-open" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns open invite metadata only to an authenticated outsider without reading a snapshot", async () => {
    const open = match("open");
    const serializedState = '{"currentPlayerUserId":1,"hiddenInfo":"secret"}';
    mem.matches.set(open.id, open);
    mem.snapshots.set(open.id, serializedState);

    const response = await outsider().match.get({ matchId: open.id });

    expect(response).toEqual({
      match: {
        id: open.id,
        hostName: "Kael",
        preset: "continents",
        size: 11,
        hostTribe: 0,
        guestTribe: 1,
        status: "open",
        seatAvailable: true,
      },
      state: null,
    });
    expect(getLatestSnapshot).not.toHaveBeenCalled();
    expect(response.match).not.toHaveProperty("seed");
    expect(response.match).not.toHaveProperty("hostUserId");
    expect(response.match).not.toHaveProperty("guestUserId");
    expect(response.match).not.toHaveProperty("currentUserId");
    expect(response.match).not.toHaveProperty("turnNumber");
    expect(response.match).not.toHaveProperty("winnerUserId");
    expect(response.match).not.toHaveProperty("resultText");
  });

  it("denies outsiders match.get and match.status for active, finished and abandoned matches", async () => {
    for (const status of ["active", "finished", "abandoned"] as const) {
      const stored = match(status);
      mem.matches.set(stored.id, stored);
      mem.snapshots.set(
        stored.id,
        `{"status":"${status}","hiddenInfo":"secret"}`
      );

      await expect(
        outsider().match.get({ matchId: stored.id })
      ).rejects.toThrow(/Not your match/);
      await expect(
        outsider().match.status({ matchId: stored.id })
      ).rejects.toThrow(/Not your match/);
    }
    expect(getLatestSnapshot).not.toHaveBeenCalled();
  });

  it("denies outsider status for an open invite as well", async () => {
    const open = match("open");
    mem.matches.set(open.id, open);

    await expect(outsider().match.status({ matchId: open.id })).rejects.toThrow(
      /Not your match/
    );
  });

  it("preserves the exact stored snapshot for existing host and guest members", async () => {
    const active = match("active");
    const serializedState = '{"turn":4,"fog":["private"],"units":[1,2]}';
    mem.matches.set(active.id, active);
    mem.snapshots.set(active.id, serializedState);

    const hostResponse = await host().match.get({ matchId: active.id });
    const guestResponse = await guest().match.get({ matchId: active.id });

    expect(hostResponse.match).toBe(active);
    expect(guestResponse.match).toBe(active);
    expect(hostResponse.state).toBe(serializedState);
    expect(guestResponse.state).toBe(serializedState);
  });

  it("allows an invitee to join and then retrieve the member snapshot", async () => {
    const open = match("open");
    const serializedState = '{"turn":0,"fog":["private"]}';
    mem.matches.set(open.id, open);
    mem.snapshots.set(open.id, serializedState);

    await expect(
      host().match.join({ matchId: open.id, guestName: "Kael" })
    ).resolves.toEqual({
      id: open.id,
      rejoined: true,
    });
    await expect(
      guest().match.join({ matchId: open.id, guestName: "Mira" })
    ).resolves.toEqual({
      id: open.id,
      rejoined: false,
    });

    const response = await guest().match.get({ matchId: open.id });
    expect(response.match).toBe(open);
    expect(response.state).toBe(serializedState);
  });
});
