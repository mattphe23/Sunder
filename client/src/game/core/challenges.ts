// Polyforge challenges — shared seeded runs. Daily: one map per UTC day, one
// scored attempt spirit (best kept anyway); Weekly: one map per ISO week,
// optimize your best score until it resets. Seeds derive deterministically
// from the date so every player worldwide gets the identical map + setup.
import { rng, MapPreset, MAP_PRESETS } from "./mapgen";
import { Difficulty } from "./types";

export type ChallengeKind = "daily" | "weekly";

export interface ChallengeSetup {
  kind: ChallengeKind;
  key: string;        // e.g. "2026-07-22" or "2026-W30"
  label: string;      // human-readable, e.g. "Jul 22, 2026" / "Week 30, 2026"
  seed: number;
  size: number;
  preset: MapPreset;
  faction: number;    // assigned faction (same for everyone)
  difficulty: Difficulty;
  resetsIn: string;   // e.g. "14h" / "3d 2h"
}

export interface ChallengeScore {
  key: string;
  score: number;
  won: boolean;
  turns: number;
  date: string;       // ISO datetime of the scoring run
  attempts: number;
}

const STORE_KEY = "polyforge-challenges-v1";

/** FNV-1a string hash → 32-bit uint, stable across sessions/browsers */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** UTC day key: YYYY-MM-DD */
function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** ISO-8601 week key: YYYY-Www (weeks start Monday) */
function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;              // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);   // nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function fmtCountdown(ms: number): string {
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function msToNextUtcDay(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.getTime() - now.getTime();
}

function msToNextIsoWeek(): number {
  const now = new Date();
  const day = now.getUTCDay() || 7; // Mon=1..Sun=7
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (8 - day)));
  return next.getTime() - now.getTime();
}

/** Deterministically derive the full game setup from the period key. */
function deriveSetup(kind: ChallengeKind, key: string, resetsInMs: number): ChallengeSetup {
  const seed = hash(`polyforge-${kind}-${key}`);
  const roll = rng(seed);
  const presets: MapPreset[] = MAP_PRESETS.map((p) => p.id);
  const preset = presets[Math.floor(roll() * presets.length)];
  const size = kind === "daily" ? 11 : 13;              // weekly = bigger canvas to optimize
  const faction = Math.floor(roll() * 4);               // one of the 4 core tribes
  const difficulty: Difficulty = kind === "daily" ? "normal" : "hard";
  const label = kind === "daily"
    ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : `Week ${key.split("-W")[1]}, ${key.split("-W")[0]}`;
  return { kind, key, label, seed, size, preset, faction, difficulty, resetsIn: fmtCountdown(resetsInMs) };
}

export function dailyChallenge(): ChallengeSetup {
  return deriveSetup("daily", dayKey(), msToNextUtcDay());
}

export function weeklyChallenge(): ChallengeSetup {
  return deriveSetup("weekly", weekKey(), msToNextIsoWeek());
}

// ---------- score persistence ----------

interface ChallengeStore {
  daily?: ChallengeScore;
  weekly?: ChallengeScore;
}

export function loadChallengeScores(): ChallengeStore {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as ChallengeStore;
  } catch {
    return {};
  }
}

/** Current-period score for a kind, or null if none / stale period. */
export function currentScore(kind: ChallengeKind): ChallengeScore | null {
  const store = loadChallengeScores();
  const entry = store[kind];
  const key = kind === "daily" ? dayKey() : weekKey();
  return entry && entry.key === key ? entry : null;
}

/**
 * Record a finished challenge run. Keeps the BEST score within the period
 * (weekly optimization loop; daily also keeps best for fairness).
 * Returns true if this run set a new best.
 */
export function recordChallengeScore(kind: ChallengeKind, score: number, won: boolean, turns: number): boolean {
  const key = kind === "daily" ? dayKey() : weekKey();
  const store = loadChallengeScores();
  const prev = store[kind];
  const attempts = prev && prev.key === key ? prev.attempts + 1 : 1;
  const isBest = !prev || prev.key !== key || score > prev.score;
  store[kind] = isBest
    ? { key, score, won, turns, date: new Date().toISOString(), attempts }
    : { ...prev!, attempts };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* full */ }
  return isBest;
}
