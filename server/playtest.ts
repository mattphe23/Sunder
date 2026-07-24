// AI Playtest Lab — headless match runner where the built-in LLM plays one
// tribe through a structured action API, with the scripted AI as fallback and
// as the opponent driver. Produces a structured feedback report at the end.
//
// Design notes:
// - The game engine lives in client/src/game/core/* but is pure TS; server
//   tests already drive it headlessly (see engine.sim.test.ts). We reuse the
//   exported singleton `game` store with newGame() per run (server runs are
//   serialized by the in-process job queue below).
// - To bound cost/latency the LLM is consulted once per LLM-tribe turn with a
//   compact state digest + a curated legal-action list (max ~24 options); it
//   picks an ordered plan of up to 4 action ids. The scripted AI then finishes
//   the turn (mop-up economy/moves).
// - Any LLM failure (timeout, malformed output, unknown action id) falls back
//   to the scripted AI for that turn — a run never crashes on LLM flakiness.
import { invokeLLM } from "./_core/llm";
import { game } from "../client/src/game/core/state";
import { runAiTurn } from "../client/src/game/core/ai";
import {
  reachableTiles, attackableUnits, trainableUnits, canResearch, canHarvest,
  techCost, starIncome, tileAt, cityAt,
} from "../client/src/game/core/rules";
import { TECHS, UNIT_STATS, type TechId, type Tile, type Unit, type UnitType } from "../client/src/game/core/types";

type Game = typeof game;

// Node has no localStorage/DOM timers; the store touches both. Shim once.
function ensureHeadlessShims() {
  const g = globalThis as Record<string, unknown>;
  if (!g.localStorage) {
    const store: Record<string, string> = {};
    g.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    };
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PlaytestParams {
  seed: number;
  size: number;
  preset: string;
  llmTribe: number; // 0-3
  maxTurns: number;
  model?: string;
}

export interface PlaytestProgress {
  turnsPlayed: number;
  llmActions: number;
  fallbackActions: number;
}

export interface PlaytestOutcome extends PlaytestProgress {
  matchSummary: MatchSummary;
  feedback: FeedbackReport | null;
  model: string;
}

export interface MatchSummary {
  seed: number;
  size: number;
  preset: string;
  llmTribe: number;
  llmTribeName: string;
  turns: number;
  phase: string;
  winner: number | null;
  winnerName: string | null;
  winPath: string | null;
  tribeScores: { name: string; alive: boolean; cities: number; units: number; stars: number; techs: number; score: number }[];
  logTail: string[];
  turnNotes: string[]; // per-LLM-turn narration from the model
}

export interface FeedbackReport {
  scores: { balance: number; clarity: number; fun: number; pacing: number };
  balance: string[];
  clarity: string[];
  fun: string[];
  bugs: string[];
  suggestions: string[];
  verdict: string;
}

// ---------------------------------------------------------------------------
// Legal action enumeration (curated, compact)
// ---------------------------------------------------------------------------
interface LegalAction {
  id: string;
  desc: string;
  apply: (g: Game) => void;
}

function enumerateActions(g: Game, tribe: number): LegalAction[] {
  const s = g.state;
  const acts: LegalAction[] = [];
  const push = (id: string, desc: string, apply: (gg: Game) => void) => {
    if (acts.length < 24) acts.push({ id, desc, apply });
  };

  // Unit orders: captures, attacks, moves
  for (const u of s.units.filter((x: Unit) => x.tribe === tribe)) {
    const tag = `${u.type}#${u.id}`;
    // capture city if standing on one (requires fresh unit)
    if (!u.moved && !u.attacked) {
      const city = cityAt(s, u.x, u.y);
      if (city && city.tribe !== tribe) {
        push(`cap:${u.id}`, `${tag} CAPTURE ${city.tribe === null ? "village" : "enemy city"} "${city.name}" at (${u.x},${u.y})`, (gg) => gg.captureCity(u.id));
      }
    }
    // attacks
    if (!u.attacked) {
      for (const d of attackableUnits(s, u).slice(0, 3)) {
        push(`atk:${u.id}:${d.id}`, `${tag} attack ${d.type}#${d.id} at (${d.x},${d.y}) hp${d.hp}`, (gg) => gg.attack(u.id, d.id));
      }
    }
    // moves — sample up to 3 reachable tiles spread across the range
    if (!u.moved) {
      const tiles = reachableTiles(s, u);
      const sampled = tiles.length <= 3 ? tiles : [tiles[0], tiles[Math.floor(tiles.length / 2)], tiles[tiles.length - 1]];
      for (const m of sampled) {
        push(`mov:${u.id}:${m.x},${m.y}`, `${tag} move to (${m.x},${m.y})`, (gg) => gg.moveUnit(u.id, m.x, m.y));
      }
    }
  }

  // City production: train affordable units (train uses s.currentTribe internally)
  const trainable = trainableUnits(s, tribe);
  for (const c of s.cities) {
    if (c.tribe !== tribe) continue;
    for (const ut of trainable.slice(0, 3)) {
      const cost = UNIT_STATS[ut].cost;
      if (s.tribes[tribe].stars < cost) continue;
      push(`trn:${c.id}:${ut}`, `train ${ut} in ${c.name} (${cost} stars)`, (gg) => gg.train(c.id, ut));
    }
  }

  // Research affordable techs
  for (const tech of TECHS) {
    if (acts.length >= 24) break;
    if (canResearch(s, tribe, tech.id as TechId)) {
      push(`res:${tech.id}`, `research ${tech.name} (${techCost(s, tribe, tech.id as TechId)} stars) — ${tech.desc}`, (gg) => gg.research(tech.id as TechId));
    }
  }

  // Harvest resources inside owned city borders
  let harvestCount = 0;
  for (let y = 0; y < s.size && harvestCount < 3; y++) {
    for (let x = 0; x < s.size && harvestCount < 3; x++) {
      const t: Tile = tileAt(s, x, y);
      if (t.resource && canHarvest(s, tribe, t)) {
        harvestCount++;
        push(`hrv:${x},${y}`, `harvest ${t.resource} at (${x},${y})`, (gg) => gg.harvest(x, y));
      }
    }
  }

  return acts;
}

// Compact state digest the LLM can reason about cheaply.
function digest(g: Game, tribe: number): string {
  const s = g.state;
  const me = s.tribes[tribe];
  const myCities = s.cities.filter((c) => c.tribe === tribe);
  const myUnits = s.units.filter((u: Unit) => u.tribe === tribe);
  const enemies = s.tribes
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => i !== tribe && t.alive)
    .map(({ t, i }) => {
      const cities = s.cities.filter((c) => c.tribe === i).length;
      const units = s.units.filter((u: Unit) => u.tribe === i).length;
      return `${t.name}: ${cities} cities, ${units} units, score ${t.score}`;
    });
  return [
    `Turn ${s.turn}. You are ${me.name} (passive: ${me.passiveDesc}).`,
    `Stars: ${me.stars} (+${starIncome(s, tribe)}/turn). Cities: ${myCities.map((c) => `${c.name}(lv${c.level}${c.isCapital ? ",capital" : ""})`).join(", ") || "none"}.`,
    `Units: ${myUnits.map((u: Unit) => `${u.type}#${u.id}(${u.hp}hp)`).join(", ") || "none"}.`,
    `Known enemies — ${enemies.join("; ") || "none"}.`,
    `Researched: ${me.techs.join(", ") || "none"}.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// LLM turn: ask for an ordered plan of up to 4 action ids
// ---------------------------------------------------------------------------
async function llmPlanTurn(
  g: Game,
  tribe: number,
  model: string,
  notes: string[],
): Promise<{ chosen: number; fallback: boolean }> {
  const actions = enumerateActions(g, tribe);
  if (actions.length === 0) return { chosen: 0, fallback: false };

  try {
    const res = await invokeLLM({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are playtesting a Polytopia-style 4X strategy game. Play to win: expand early (capture villages), keep units healthy, grow cities, take the fight to weak enemies. Choose up to 4 actions from the list, in execution order. Also record ONE short playtest observation for this turn if anything feels confusing, unbalanced, or delightful — else null.",
        },
        {
          role: "user",
          content: `${digest(g, tribe)}\n\nLegal actions:\n${actions.map((a) => `- ${a.id}: ${a.desc}`).join("\n")}\n\nReply with JSON.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "turn_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              actionIds: { type: "array", items: { type: "string" }, description: "up to 4 action ids from the list, in order" },
              note: { type: ["string", "null"], description: "one short playtest observation or null" },
            },
            required: ["actionIds", "note"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = res.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}") as { actionIds?: string[]; note?: string | null };
    let applied = 0;
    for (const id of (parsed.actionIds ?? []).slice(0, 4)) {
      // re-enumerate so ids stay valid as the state mutates
      const current = enumerateActions(g, tribe);
      const act = current.find((a) => a.id === id);
      if (!act) continue;
      try {
        act.apply(g);
        applied++;
      } catch {
        /* illegal mid-plan (e.g. unit died) — skip */
      }
    }
    // Guard against schema-evading outputs: the model occasionally returns the
    // literal string "null" (or whitespace) instead of JSON null (run3 T9 bug).
    const note = typeof parsed.note === "string" ? parsed.note.trim() : "";
    if (note && note.toLowerCase() !== "null") notes.push(`T${g.state.turn}: ${note}`);
    // let the scripted AI mop up remaining unit moves/economy for the turn
    runAiTurn(g, tribe);
    return applied === 0 ? { chosen: 0, fallback: true } : { chosen: applied, fallback: false };
  } catch {
    runAiTurn(g, tribe);
    return { chosen: 0, fallback: true };
  }
}

// ---------------------------------------------------------------------------
// Feedback report
// ---------------------------------------------------------------------------
async function llmFeedback(summary: MatchSummary, model: string): Promise<FeedbackReport | null> {
  try {
    const res = await invokeLLM({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a senior game-balance analyst reviewing an automated playtest of a Polytopia-style 4X game. Be specific and actionable; cite numbers from the match data. Score 1-10 (10 best). Keep each list item to one sentence; 2-4 items per list (bugs may be empty).",
        },
        { role: "user", content: `Match data:\n${JSON.stringify(summary, null, 1)}\n\nWrite the playtest report as JSON.` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "playtest_report",
          strict: true,
          schema: {
            type: "object",
            properties: {
              scores: {
                type: "object",
                properties: {
                  balance: { type: "integer" },
                  clarity: { type: "integer" },
                  fun: { type: "integer" },
                  pacing: { type: "integer" },
                },
                required: ["balance", "clarity", "fun", "pacing"],
                additionalProperties: false,
              },
              balance: { type: "array", items: { type: "string" } },
              clarity: { type: "array", items: { type: "string" } },
              fun: { type: "array", items: { type: "string" } },
              bugs: { type: "array", items: { type: "string" } },
              suggestions: { type: "array", items: { type: "string" } },
              verdict: { type: "string" },
            },
            required: ["scores", "balance", "clarity", "fun", "bugs", "suggestions", "verdict"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = res.choices?.[0]?.message?.content;
    return JSON.parse(typeof raw === "string" ? raw : "null") as FeedbackReport | null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Run a full playtest match
// ---------------------------------------------------------------------------
export const DEFAULT_PLAYTEST_MODEL = "gemini-2.5-flash";

export async function runPlaytest(
  params: PlaytestParams,
  onProgress?: (p: PlaytestProgress) => void | Promise<void>,
): Promise<PlaytestOutcome> {
  ensureHeadlessShims();
  const model = params.model || DEFAULT_PLAYTEST_MODEL;
  const g = game;
  g.newGame({
    size: params.size,
    seed: params.seed,
    difficulty: "normal",
    preset: params.preset as never,
    humanTribe: params.llmTribe,
  });
  g.state.showIntro = false;

  const notes: string[] = [];
  let llmActions = 0;
  let fallbackActions = 0;
  let guard = 0;

  while (g.state.phase === "playing" && g.state.turn <= params.maxTurns && guard < 800) {
    guard++;
    const s = g.state;
    s.aiThinking = false;
    // auto-resolve hero perk choices
    if (s.pendingPerk) {
      const hero = s.units.find((u: Unit) => u.id === s.pendingPerk);
      if (hero) {
        const choices = g.perkChoices(hero);
        if (choices.length > 0) g.choosePerk(choices[0]);
        else s.pendingPerk = null;
      } else s.pendingPerk = null;
    }
    const tribe = s.currentTribe;
    if (s.tribes[tribe]?.alive) {
      if (tribe === params.llmTribe) {
        const r = await llmPlanTurn(g, tribe, model, notes);
        if (r.fallback) fallbackActions++;
        else llmActions += r.chosen;
        await onProgress?.({ turnsPlayed: s.turn, llmActions, fallbackActions });
      } else {
        runAiTurn(g, tribe);
      }
    }
    if (g.state.phase !== "playing") break;
    g.endTurn();
  }

  const s = g.state;
  // Early-gameover runs used to produce an empty turnNotes array (run1 bug):
  // if the LLM tribe was eliminated (or the match ended) before it recorded any
  // observation, add a synthetic terminal note so the feedback model still has
  // per-run narrative context.
  if (s.phase !== "playing") {
    const llmT = s.tribes[params.llmTribe];
    if (llmT && !llmT.alive) {
      notes.push(`T${s.turn}: [system] ${llmT.name} (LLM tribe) was eliminated — match ended early.`);
    } else if (notes.length === 0) {
      notes.push(`T${s.turn}: [system] match ended (${s.winner != null ? `winner ${s.tribes[s.winner]?.name}` : "no winner"}) before the model recorded observations.`);
    }
  }
  const summary: MatchSummary = {
    seed: params.seed,
    size: params.size,
    preset: params.preset,
    llmTribe: params.llmTribe,
    llmTribeName: s.tribes[params.llmTribe]?.name ?? "?",
    turns: s.turn,
    phase: s.phase,
    winner: s.winner,
    winnerName: s.winner != null ? (s.tribes[s.winner]?.name ?? null) : null,
    winPath: s.winPath?.pathId ?? null,
    tribeScores: s.tribes.map((t, i) => ({
      name: t.name,
      alive: t.alive,
      cities: s.cities.filter((c) => c.tribe === i).length,
      units: s.units.filter((u: Unit) => u.tribe === i).length,
      stars: t.stars,
      techs: t.techs.length,
      score: t.score,
    })),
    logTail: (s.log ?? []).slice(0, 25),
    turnNotes: notes,
  };

  const feedback = await llmFeedback(summary, model);
  return { turnsPlayed: s.turn, llmActions, fallbackActions, matchSummary: summary, feedback, model };
}
