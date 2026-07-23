// Sunder challenges — shared seeded runs. Daily: one map per UTC day, one
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

// ---------- v16: friend challenges (shareable "beat my score" links) ----------

/** everything needed to replay a friend's exact match setup + the score to beat */
export interface FriendChallenge {
  name: string;        // challenger display name (max 24 chars)
  score: number;       // score to beat
  seed: number;
  preset: string;
  size: number;
  difficulty: Difficulty;
  tribe: number;       // defIndex of the faction the challenger played
  won: boolean;        // whether the challenger won their run
  turns: number;       // how many turns their match lasted
}

/** compact pipe-joined payload → URL-safe base64 (with a checksum to catch mangled links) */
export function encodeFriendChallenge(c: FriendChallenge): string {
  const name = c.name.slice(0, 24).replace(/\|/g, "/");
  const body = [name, c.score, c.seed, c.preset, c.size, c.difficulty, c.tribe, c.won ? 1 : 0, c.turns].join("|");
  const sum = hash(body) % 9973;
  const raw = `${body}|${sum}`;
  // URL-safe base64 (unicode-safe via encodeURIComponent)
  return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeFriendChallenge(param: string): FriendChallenge | null {
  try {
    const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    const raw = decodeURIComponent(escape(atob(b64)));
    const parts = raw.split("|");
    if (parts.length !== 10) return null;
    const sum = Number(parts.pop());
    if (hash(parts.join("|")) % 9973 !== sum) return null;
    const [name, score, seed, preset, size, difficulty, tribe, won, turns] = parts;
    if (!["easy", "normal", "hard", "impossible"].includes(difficulty)) return null;
    const c: FriendChallenge = {
      name: name || "A rival",
      score: Math.max(0, Number(score) | 0),
      seed: Number(seed) >>> 0,
      preset,
      size: [9, 11, 13].includes(Number(size)) ? Number(size) : 11,
      difficulty: difficulty as Difficulty,
      tribe: Math.min(5, Math.max(0, Number(tribe) | 0)),
      won: won === "1",
      turns: Math.max(1, Number(turns) | 0),
    };
    if (!Number.isFinite(c.score) || !Number.isFinite(c.seed)) return null;
    return c;
  } catch {
    return null;
  }
}

/** build the full share URL for the current origin */
export function friendChallengeUrl(c: FriendChallenge): string {
  const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  return `${base}?c=${encodeFriendChallenge(c)}`;
}

/** read ?c= from the address bar (once, on menu load) */
export function readFriendChallengeFromUrl(): FriendChallenge | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("c");
  return param ? decodeFriendChallenge(param) : null;
}

// ---------- v19: Wordle-style shareable result card ----------

export interface ResultCardInput {
  kind: ChallengeKind;
  label: string;        // "Jul 23, 2026" / "Week 30, 2026"
  factionName: string;
  score: number;
  won: boolean;
  turns: number;
  attempts: number;
  isBest: boolean;      // this run set a new personal best
  url?: string;         // optional challenge link to append
}

/**
 * Emoji strength bar: score mapped onto 10 slots (about 60 pts per slot).
 * Forge palette 🟧 with ⬛ empties — instantly readable pasted into any chat.
 */
export function scoreBar(score: number): string {
  const slots = Math.max(0, Math.min(10, Math.round(score / 60)));
  return "🟧".repeat(slots) + "⬛".repeat(10 - slots);
}

/** Build the copy-paste result text, Wordle-style. */
export function buildResultCard(r: ResultCardInput): string {
  const title = r.kind === "daily" ? "Daily" : "Weekly";
  const verdict = r.won ? "👑 Victory" : "💀 Defeat";
  const lines = [
    `⚒️ SUNDER ${title} — ${r.label}`,
    `${verdict} · ${r.factionName} · ${r.turns} turns`,
    `${scoreBar(r.score)} ${r.score}`,
    `${r.attempts} attempt${r.attempts === 1 ? "" : "s"}${r.isBest ? " · new best!" : ""}`,
  ];
  if (r.url) lines.push(r.url);
  return lines.join("\n");
}
