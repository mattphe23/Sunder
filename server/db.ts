import { desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, profiles, matches, matchTurns, InsertMatch } from "../drizzle/schema";
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
