import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, profiles, matches, matchTurns, InsertMatch, leaderboardEntries, playtestRuns, InsertPlaytestRun, purchases, entitlements } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── Sunder v18: profiles ────────────────────────────────────────────────────
export type ProfileStats = {
  commanderName?: string;
  games?: number;
  wins?: number;
  bestScore?: number;
  duelsWon?: number;
  campsRazed?: number;
  battlesWon?: number;
  heroesLost?: number;
  highestHeroLevel?: number;
};

export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0];
}

export async function upsertProfile(userId: number, stats: ProfileStats) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getProfile(userId);
  if (!existing) {
    await db.insert(profiles).values({ userId, ...stats });
  } else {
    // Merge policy: counters take the max of local vs cloud (sync from any device
    // never loses progress); name is a straight overwrite when provided.
    const merged: ProfileStats = {
      commanderName: stats.commanderName ?? existing.commanderName,
      games: Math.max(existing.games, stats.games ?? 0),
      wins: Math.max(existing.wins, stats.wins ?? 0),
      bestScore: Math.max(existing.bestScore, stats.bestScore ?? 0),
      duelsWon: Math.max(existing.duelsWon, stats.duelsWon ?? 0),
      campsRazed: Math.max(existing.campsRazed, stats.campsRazed ?? 0),
      battlesWon: Math.max(existing.battlesWon, stats.battlesWon ?? 0),
      heroesLost: Math.max(existing.heroesLost, stats.heroesLost ?? 0),
      highestHeroLevel: Math.max(existing.highestHeroLevel, stats.highestHeroLevel ?? 0),
    };
    await db.update(profiles).set(merged).where(eq(profiles.userId, userId));
  }
  return getProfile(userId);
}

// ── Sunder v18: matches ─────────────────────────────────────────────────────
export async function createMatch(m: InsertMatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matches).values(m);
  return getMatch(m.id);
}

export async function getMatch(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return rows[0];
}

export async function updateMatch(id: string, set: Partial<InsertMatch>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matches).set(set).where(eq(matches.id, id));
}

export async function listMatchesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matches)
    .where(or(eq(matches.hostUserId, userId), eq(matches.guestUserId, userId)))
    .orderBy(desc(matches.updatedAt))
    .limit(30);
}

export async function saveTurnSnapshot(matchId: string, turnNumber: number, submittedByUserId: number, state: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matchTurns).values({ matchId, turnNumber, submittedByUserId, state });
}

export async function getLatestSnapshot(matchId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(matchTurns)
    .where(eq(matchTurns.matchId, matchId))
    .orderBy(desc(matchTurns.turnNumber), desc(matchTurns.id))
    .limit(1);
  return rows[0];
}

// ── Sunder v19: challenge leaderboard ───────────────────────────────────────
export async function getLeaderboardEntry(userId: number, challengeKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(leaderboardEntries)
    .where(and(eq(leaderboardEntries.userId, userId), eq(leaderboardEntries.challengeKey, challengeKey)))
    .limit(1);
  return rows[0];
}

/** Keep-best upsert: only overwrites when the new score beats the stored one. */
export async function submitLeaderboardScore(
  userId: number,
  challengeKey: string,
  commanderName: string,
  score: number,
  won: boolean,
  turns: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getLeaderboardEntry(userId, challengeKey);
  if (!existing) {
    await db.insert(leaderboardEntries).values({ userId, challengeKey, commanderName, score, won: won ? 1 : 0, turns });
    return { improved: true };
  }
  if (score > existing.score) {
    await db
      .update(leaderboardEntries)
      .set({ commanderName, score, won: won ? 1 : 0, turns })
      .where(eq(leaderboardEntries.id, existing.id));
    return { improved: true };
  }
  // still refresh the display name so renames propagate
  if (commanderName !== existing.commanderName) {
    await db.update(leaderboardEntries).set({ commanderName }).where(eq(leaderboardEntries.id, existing.id));
  }
  return { improved: false };
}

export async function getLeaderboardTop(challengeKey: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.challengeKey, challengeKey))
    .orderBy(desc(leaderboardEntries.score), leaderboardEntries.updatedAt)
    .limit(limit);
}

/** 1-based rank of a user within a challenge period, or null if unranked. */
export async function getLeaderboardRank(userId: number, challengeKey: string) {
  const db = await getDb();
  if (!db) return null;
  const mine = await getLeaderboardEntry(userId, challengeKey);
  if (!mine) return null;
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(leaderboardEntries)
    .where(and(eq(leaderboardEntries.challengeKey, challengeKey), gt(leaderboardEntries.score, mine.score)));
  return { rank: Number(rows[0]?.n ?? 0) + 1, entry: mine };
}

// ── Sunder v21: AI playtest lab ─────────────────────────────────────────────
export async function createPlaytestRun(run: InsertPlaytestRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(playtestRuns).values(run);
  const insertId = Number((res as unknown as [{ insertId: number }])[0]?.insertId ?? 0);
  return getPlaytestRun(insertId);
}

export async function getPlaytestRun(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(playtestRuns).where(eq(playtestRuns.id, id)).limit(1);
  return rows[0];
}

export async function updatePlaytestRun(id: number, set: Partial<InsertPlaytestRun>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(playtestRuns).set(set).where(eq(playtestRuns.id, id));
}

export async function listPlaytestRuns(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playtestRuns).orderBy(desc(playtestRuns.id)).limit(limit);
}

// ── Sunder v27: monetization — purchases + entitlements ─────────────────────
export async function getEntitlementKeys(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ key: entitlements.key }).from(entitlements).where(eq(entitlements.userId, userId));
  return Array.from(new Set(rows.map((r) => r.key)));
}

export async function getPurchases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.id));
}

export async function getPurchaseBySession(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(purchases).where(eq(purchases.stripeSessionId, stripeSessionId)).limit(1);
  return rows[0];
}

export async function recordPurchase(p: { userId: number; sku: string; stripeSessionId: string | null; stripePaymentIntentId: string | null }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(purchases).values(p);
  return Number((res as unknown as [{ insertId: number }])[0]?.insertId ?? 0);
}

/** Grant entitlement keys, skipping ones the user already owns (idempotent). */
export async function grantEntitlements(userId: number, keys: string[], purchaseId: number | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const owned = await getEntitlementKeys(userId);
  const fresh = keys.filter((k) => !owned.includes(k));
  if (fresh.length === 0) return;
  await db.insert(entitlements).values(fresh.map((key) => ({ userId, key, purchaseId })));
}

// ── Account deletion (App Store Guideline 5.1.1(v)) ─────────────────────────
// "If your app supports account creation, you must also offer account deletion
// within the app." Sunder creates an account on OAuth sign-in, so this is a
// hard requirement for review, not a nicety.
//
// Two shapes of data need different handling, and the difference is the whole
// design:
//
//   OWNED   profile, leaderboard entries, entitlements, purchase rows — these
//           are the user's alone and are deleted outright.
//   SHARED  async matches — a match has TWO players. Deleting the leaver's row
//           would destroy a stranger's game and their record of it. Those rows
//           are anonymised instead: the departing side is reassigned to the
//           tombstone id and their display name is replaced.
//
// Purchases are deleted here even though they are financial records, because
// Stripe holds the authoritative copy — payment intents, receipts and refund
// history all live there and are unaffected. What we delete is our own
// user-linked shadow of it. The consequence for the player is real and the UI
// has to say so plainly: deleting the account gives up the entitlements those
// purchases granted.

/** Reserved userId meaning "this account is gone". Real ids autoincrement from 1. */
export const DELETED_USER_ID = 0;
export const DELETED_USER_NAME = "Deleted Commander";

export interface DeletionReport {
  profiles: number;
  leaderboardEntries: number;
  entitlements: number;
  purchases: number;
  matchesAnonymised: number;
}

/**
 * Every column anywhere in the schema that points at a user, and what deletion
 * does to it.
 *
 * This exists to be checked against the live schema by a test. The realistic
 * way this feature breaks is not a bug in the code below — it is someone
 * adding a table six months from now with a `userId` on it and never touching
 * this file. That leaves personal data behind after a deletion the app told
 * the player was complete, which is both a privacy failure and a false claim
 * to App Review. The test fails the moment a new user-linked column appears
 * without a decision recorded here.
 */
export const USER_LINKED_COLUMNS: Record<string, "delete" | "anonymise"> = {
  "users.id": "delete",
  "profiles.userId": "delete",
  "leaderboard_entries.userId": "delete",
  "entitlements.userId": "delete",
  "purchases.userId": "delete",
  "matches.hostUserId": "anonymise",
  "matches.guestUserId": "anonymise",
  "matches.currentUserId": "anonymise",
  "matches.winnerUserId": "anonymise",
  "match_turns.submittedByUserId": "anonymise",
  // Balance-lab runs: engineering records, not player data. The run's report is
  // worth keeping — several shipped balance changes cite one — but the link to
  // whoever pressed the button is not, so the id is tombstoned rather than the
  // row deleted. (This one was missed on the first pass and caught by the
  // schema-coverage test, which is exactly what it is for.)
  "playtest_runs.requestedByUserId": "anonymise",
};

/**
 * Erase a user and everything that identifies them, then delete the account.
 *
 * Ordering matters: the user row goes LAST, so a failure part-way through
 * leaves an account that can sign in and retry rather than orphaned rows with
 * no owner to delete them.
 */
export async function deleteAccount(userId: number): Promise<DeletionReport> {
  // Validate before reaching for the connection: a bad id is a bad id whether
  // or not a database happens to be configured.
  if (!userId || userId === DELETED_USER_ID) throw new Error("Refusing to delete the tombstone user");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const report: DeletionReport = {
    profiles: 0, leaderboardEntries: 0, entitlements: 0, purchases: 0, matchesAnonymised: 0,
  };

  // owned rows — gone
  const owned = await db.select({ id: entitlements.id }).from(entitlements).where(eq(entitlements.userId, userId));
  report.entitlements = owned.length;
  await db.delete(entitlements).where(eq(entitlements.userId, userId));

  const bought = await db.select({ id: purchases.id }).from(purchases).where(eq(purchases.userId, userId));
  report.purchases = bought.length;
  await db.delete(purchases).where(eq(purchases.userId, userId));

  const prof = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId));
  report.profiles = prof.length;
  await db.delete(profiles).where(eq(profiles.userId, userId));

  const board = await db.select({ id: leaderboardEntries.id }).from(leaderboardEntries).where(eq(leaderboardEntries.userId, userId));
  report.leaderboardEntries = board.length;
  await db.delete(leaderboardEntries).where(eq(leaderboardEntries.userId, userId));

  // shared rows — anonymised, because the other player is still playing
  const hosted = await db.select({ id: matches.id }).from(matches).where(eq(matches.hostUserId, userId));
  const joined = await db.select({ id: matches.id }).from(matches).where(eq(matches.guestUserId, userId));
  report.matchesAnonymised = hosted.length + joined.length;
  await db.update(matches)
    .set({ hostUserId: DELETED_USER_ID, hostName: DELETED_USER_NAME, status: "abandoned" })
    .where(eq(matches.hostUserId, userId));
  await db.update(matches)
    .set({ guestUserId: DELETED_USER_ID, guestName: DELETED_USER_NAME, status: "abandoned" })
    .where(eq(matches.guestUserId, userId));
  // "whose turn is it" and "who won" both point at users; neither may outlive one
  await db.update(matches).set({ currentUserId: DELETED_USER_ID }).where(eq(matches.currentUserId, userId));
  await db.update(matches).set({ winnerUserId: DELETED_USER_ID }).where(eq(matches.winnerUserId, userId));
  // turn snapshots are keyed by match, but carry the submitter's id
  await db.update(matchTurns).set({ submittedByUserId: DELETED_USER_ID }).where(eq(matchTurns.submittedByUserId, userId));
  // balance-lab runs: keep the report, drop the requester
  await db.update(playtestRuns).set({ requestedByUserId: DELETED_USER_ID }).where(eq(playtestRuns.requestedByUserId, userId));

  // the account itself, last
  await db.delete(users).where(eq(users.id, userId));
  return report;
}
