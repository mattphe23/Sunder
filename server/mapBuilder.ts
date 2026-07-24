// Sunder — AI map builder. Generates candidate boards across seeds, measures
// objective fairness/variety metrics with the headless engine, then has the
// LLM rank the candidates and write designer notes for the best ones. Output
// feeds the curated premium map packs.
import { generateMap, MapPreset } from "../client/src/game/core/mapgen";
import { invokeLLM } from "./_core/llm";

export interface MapCandidate {
  seed: number;
  preset: MapPreset;
  size: number;
  metrics: MapMetrics;
}

export interface MapMetrics {
  landPct: number;        // share of walkable land tiles
  resourcePct: number;    // share of land carrying a resource
  capitalSpreadMin: number; // min pairwise capital distance (fairness floor)
  capitalResourceStdev: number; // stdev of resources within 2 tiles of capitals
  mountainPct: number;
  waterPct: number;
}

/** objective metrics for one generated board */
export function measureMap(seed: number, preset: MapPreset, size: number): MapMetrics {
  const { tiles, cities } = generateMap(size, seed, 4, preset);
  const land = tiles.filter((t) => t.terrain !== "water" && t.terrain !== "ocean");
  const withRes = land.filter((t) => t.resource);
  const mountains = tiles.filter((t) => t.terrain === "mountain");
  const water = tiles.filter((t) => t.terrain === "water" || t.terrain === "ocean");
  const capitals = cities.filter((c) => c.isCapital);
  // min pairwise capital distance (Chebyshev — matches movement)
  let minDist = Infinity;
  for (let i = 0; i < capitals.length; i++) {
    for (let j = i + 1; j < capitals.length; j++) {
      const d = Math.max(Math.abs(capitals[i].x - capitals[j].x), Math.abs(capitals[i].y - capitals[j].y));
      minDist = Math.min(minDist, d);
    }
  }
  // resources near each capital (within 2 tiles) — stdev measures start fairness
  const near = capitals.map((c) =>
    tiles.filter((t) => Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y)) <= 2 && t.resource).length,
  );
  const mean = near.reduce((a, b) => a + b, 0) / Math.max(1, near.length);
  const stdev = Math.sqrt(near.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, near.length));
  return {
    landPct: Math.round((land.length / tiles.length) * 100) / 100,
    resourcePct: Math.round((withRes.length / Math.max(1, land.length)) * 100) / 100,
    capitalSpreadMin: minDist === Infinity ? 0 : minDist,
    capitalResourceStdev: Math.round(stdev * 100) / 100,
    mountainPct: Math.round((mountains.length / tiles.length) * 100) / 100,
    waterPct: Math.round((water.length / tiles.length) * 100) / 100,
  };
}

export interface MapBuilderResult {
  candidates: MapCandidate[];
  picks: {
    seed: number;
    preset: string;
    size: number;
    name: string;
    blurb: string;
    reasoning: string;
  }[];
  notes: string;
}

/** Survey `count` random candidates on the requested preset/size, then have
 *  the LLM pick the most interesting fair boards and name them. */
export async function runMapBuilder(opts: {
  preset: MapPreset;
  size: number;
  count?: number;
  brief?: string;
}): Promise<MapBuilderResult> {
  const count = Math.min(24, Math.max(6, opts.count ?? 12));
  const candidates: MapCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.floor(Math.random() * 2 ** 31);
    candidates.push({ seed, preset: opts.preset, size: opts.size, metrics: measureMap(seed, opts.preset, opts.size) });
  }
  // prefilter: drop clearly unfair boards (tiny spread or lopsided starts)
  const fair = candidates.filter((c) => c.metrics.capitalSpreadMin >= Math.floor(opts.size / 3) && c.metrics.capitalResourceStdev <= 2.5);
  const pool = fair.length >= 3 ? fair : candidates;

  const schema = {
    type: "object",
    properties: {
      picks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            seed: { type: "number" },
            name: { type: "string" },
            blurb: { type: "string" },
            reasoning: { type: "string" },
          },
          required: ["seed", "name", "blurb", "reasoning"],
          additionalProperties: false,
        },
      },
      notes: { type: "string" },
    },
    required: ["picks", "notes"],
    additionalProperties: false,
  } as const;

  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a map designer for Sunder, a Polytopia-style 4X strategy game. You are given candidate procedurally generated boards with objective metrics. Pick the 3 best candidates that are FAIR (capitals far apart, similar resources near each start) and INTERESTING (distinctive terrain mix for the world type). Give each pick an evocative two-or-three-word name prefixed with 'The' where natural, a one-line blurb (max 12 words), and one sentence of reasoning grounded in the metrics.",
      },
      {
        role: "user",
        content:
          `World type: ${opts.preset}, size ${opts.size}x${opts.size}.` +
          (opts.brief ? ` Designer brief: ${opts.brief}.` : "") +
          `\nCandidates (JSON):\n${JSON.stringify(pool.map((c) => ({ seed: c.seed, ...c.metrics })))}\n\nReply with JSON.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "map_picks", strict: true, schema: schema as unknown as Record<string, unknown> },
    },
  });
  const raw = res.choices?.[0]?.message?.content;
  const parsed = JSON.parse(typeof raw === "string" ? raw : "{}") as {
    picks: { seed: number; name: string; blurb: string; reasoning: string }[];
    notes: string;
  };
  return {
    candidates,
    picks: (parsed.picks ?? [])
      .filter((p) => candidates.some((c) => c.seed === p.seed))
      .map((p) => ({ ...p, preset: opts.preset, size: opts.size })),
    notes: parsed.notes ?? "",
  };
}
