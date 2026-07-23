import { int, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Sunder v18: cloud profiles ─────────────────────────────────────────────
// One row per user; mirrors the local Commander's Record so stats roam devices.
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  commanderName: varchar("commanderName", { length: 40 }).notNull().default("Commander"),
  games: int("games").notNull().default(0),
  wins: int("wins").notNull().default(0),
  bestScore: int("bestScore").notNull().default(0),
  duelsWon: int("duelsWon").notNull().default(0),
  campsRazed: int("campsRazed").notNull().default(0),
  battlesWon: int("battlesWon").notNull().default(0),
  heroesLost: int("heroesLost").notNull().default(0),
  highestHeroLevel: int("highestHeroLevel").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ── Sunder v18: async online matches ───────────────────────────────────────
// Authoritative state = serialized GameState snapshot per turn (simple, replayable).
export const matches = mysqlTable("matches", {
  id: varchar("id", { length: 12 }).primaryKey(), // short id used in invite links
  hostUserId: int("hostUserId").notNull(),
  guestUserId: int("guestUserId"), // null until someone joins
  hostName: varchar("hostName", { length: 40 }).notNull(),
  guestName: varchar("guestName", { length: 40 }),
  // match setup
  seed: int("seed").notNull(),
  preset: varchar("preset", { length: 20 }).notNull(),
  size: int("size").notNull(),
  hostTribe: int("hostTribe").notNull(),
  guestTribe: int("guestTribe").notNull(),
  // flow
  status: mysqlEnum("status", ["open", "active", "finished", "abandoned"]).notNull().default("open"),
  turnNumber: int("turnNumber").notNull().default(0),
  currentUserId: int("currentUserId"), // whose turn it is
  winnerUserId: int("winnerUserId"),
  resultText: varchar("resultText", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// Snapshot of the full serialized GameState after each submitted turn.
export const matchTurns = mysqlTable("match_turns", {
  id: int("id").autoincrement().primaryKey(),
  matchId: varchar("matchId", { length: 12 }).notNull(),
  turnNumber: int("turnNumber").notNull(),
  submittedByUserId: int("submittedByUserId").notNull(),
  state: longtext("state").notNull(), // JSON-serialized GameState
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchTurn = typeof matchTurns.$inferSelect;
