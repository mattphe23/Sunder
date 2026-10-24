// Bounded paired AI audit for tribe, nominal turn-slot, and map-preset effects.
//
// This is report-only harness code. It invokes GameStore.newGame with the
// existing all-AI humanTribe:-1 pattern, then drains only GameStore-scheduled
// AI callbacks. It does not inject tactical/economy/research actions, alter
// balance values, or construct a roster outside the disclosed newGame setup.
//
// Usage:
//   PLAYTEST_OUT=/absolute/output/path ./node_modules/.bin/tsx scripts/balance-paired.mts
//   PLAYTEST_OUT=/absolute/output/path ./node_modules/.bin/tsx scripts/balance-paired.mts --matches 16 --turns 12
//
// Environment alternatives: PLAYTEST_SEED, PLAYTEST_MATCHES, PLAYTEST_TURNS,
// PLAYTEST_TIME_LIMIT_MS. Output is deliberately required outside this worktree.

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  balancedFourTribeFamilies,
  buildPairedScenarioMatrix,
  installScopedHeadlessRuntime,
  ROTATIONS_PER_ROSTER,
  type PairedScenario,
} from "./lib/balancePaired";

type Preset = "continents" | "archipelago";
type Difficulty = "normal";
type FailureKind =
  | "callback_cap"
  | "deadline"
  | "stalled_callback_queue"
  | "unexpected_phase"
  | "invariant"
  | "exception";

interface Config {
  seedBase: number;
  matches: number;
  blocks: number;
  turns: number;
  size: number;
  timeLimitMs: number;
  outDir: string;
  worktreeRoot: string;
}

interface TribeOutcome {
  nominalSeat: number;
  openingTurnPosition: number | null;
  definitionIndex: number;
  name: string;
  passive: string;
  alive: boolean;
  score: number;
  stars: number;
  cities: number;
  units: number;
  techs: number;
  battlesWon: number;
  citiesCaptured: number;
}

interface AuditFailure {
  kind: FailureKind;
  detail: string;
  callback?: number;
}

interface AuditRow {
  scenarioId: string;
  seedBlock: number;
  worldSeed: number;
  randomSeed: number;
  preset: Preset;
  rosterId: string;
  rosterOriginalIndices: number[];
  rosterRemappedIndices: number[];
  rotation: number;
  openingTurnOrderNominalSeats: number[];
  size: number;
  difficulty: Difficulty;
  humanTribe: -1;
  turnCap: number;
  callbackCap: number;
  callbacksDrained: number;
  durationMs: number;
  phase: string;
  turnsReached: number;
  turnCapReached: boolean;
  winnerSeat: number | null;
  winnerDefinitionIndex: number | null;
  winnerName: string | null;
  victoryPath: string | null;
  outcome: "gameover" | "incomplete" | "failed";
  failures: AuditFailure[];
  tribes: TribeOutcome[];
}

interface Report {
  version: 1;
  lane: "paired_balance_audit";
  status: "completed_with_observation_warnings" | "completed_with_failures";
  generatedAt: string;
  sourceSha: string;
  sourceDirty: boolean;
  sourceDirtyPaths: string[];
  config: {
    seedBase: number;
    matches: number;
    blocks: number;
    turns: number;
    boardSize: number;
    timeLimitMs: number;
    presets: readonly Preset[];
    rosterFamilies: Array<{ id: string; originalRoster: number[] }>;
    rotationsPerRoster: number;
    allAiSetup: "newGame({ humanTribe: -1 })";
  };
  rows: AuditRow[];
  summary: {
    requestedMatches: number;
    observedMatches: number;
    gameoverMatches: number;
    incompleteMatches: number;
    failureRows: number;
    totalCallbackCount: number;
    observedByPreset: Record<string, number>;
    observedByDefinition: Array<{
      definitionIndex: number;
      name: string;
      appearances: number;
      wins: number;
      winRatePercent: number | null;
      averageScore: number | null;
      seatAppearances: number[];
      seatWins: number[];
    }>;
  };
  limitations: string[];
}

const DEFAULT_SEED_BASE = 6_707_978;
const DEFAULT_MATCHES = 160;
const DEFAULT_TURNS = 30;
const DEFAULT_TIME_LIMIT_MS = 300_000;
const BOARD_SIZE = 11;
const MAX_MATCHES = 160;
const MAX_TURNS = 60;
const MIN_TIME_LIMIT_MS = 1_000;
const MAX_TIME_LIMIT_MS = 300_000;
const PRESETS: readonly Preset[] = ["continents", "archipelago"];
const DIFFICULTY: Difficulty = "normal";
const NO_HUMAN = -1 as const;

function usage(): string {
  return [
    "Usage: PLAYTEST_OUT=/absolute/output/path ./node_modules/.bin/tsx scripts/balance-paired.mts [--seed N] [--matches N] [--turns N] [--time-limit-ms N]",
    "Environment alternatives: PLAYTEST_SEED, PLAYTEST_MATCHES, PLAYTEST_TURNS, PLAYTEST_TIME_LIMIT_MS.",
    `Matches must be a multiple of 16 (one full paired block) and are bounded to 16-${MAX_MATCHES}; turns are bounded to 1-${MAX_TURNS}; time limit is bounded to ${MIN_TIME_LIMIT_MS}-${MAX_TIME_LIMIT_MS}ms.`,
  ].join("\n");
}

function cliArgs(argv: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  const legal = new Set(["--seed", "--matches", "--turns", "--time-limit-ms"]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!legal.has(key))
      throw new Error(`Unexpected argument: ${key}\n${usage()}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}\n${usage()}`);
    }
    parsed.set(key.slice(2), value);
    index += 1;
  }
  return parsed;
}

function readInteger(
  name: string,
  raw: string | undefined,
  fallback: number
): number {
  if (raw === undefined || raw === "") return fallback;
  if (!/^-?\d+$/.test(raw)) {
    throw new Error(
      `${name} must be an integer; received ${JSON.stringify(raw)}.`
    );
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new Error(
      `${name} must be a safe integer; received ${JSON.stringify(raw)}.`
    );
  }
  return value;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function configFromEnvironment(): Config {
  const args = cliArgs(process.argv.slice(2));
  const seedBase = readInteger(
    "seed",
    args.get("seed") ?? process.env.PLAYTEST_SEED,
    DEFAULT_SEED_BASE
  );
  const matches = readInteger(
    "matches",
    args.get("matches") ?? process.env.PLAYTEST_MATCHES,
    DEFAULT_MATCHES
  );
  const turns = readInteger(
    "turns",
    args.get("turns") ?? process.env.PLAYTEST_TURNS,
    DEFAULT_TURNS
  );
  const timeLimitMs = readInteger(
    "time-limit-ms",
    args.get("time-limit-ms") ?? process.env.PLAYTEST_TIME_LIMIT_MS,
    DEFAULT_TIME_LIMIT_MS
  );
  if (seedBase < 0) throw new Error("seed must be non-negative.");
  if (
    matches < 16 ||
    matches > MAX_MATCHES ||
    matches % (PRESETS.length * ROTATIONS_PER_ROSTER * 2) !== 0
  ) {
    throw new Error(
      `matches must be a multiple of 16 between 16 and ${MAX_MATCHES}; received ${matches}.`
    );
  }
  if (turns < 1 || turns > MAX_TURNS) {
    throw new Error(
      `turns must be between 1 and ${MAX_TURNS}; received ${turns}.`
    );
  }
  if (timeLimitMs < MIN_TIME_LIMIT_MS || timeLimitMs > MAX_TIME_LIMIT_MS) {
    throw new Error(
      `time-limit-ms must be between ${MIN_TIME_LIMIT_MS} and ${MAX_TIME_LIMIT_MS}; received ${timeLimitMs}.`
    );
  }
  const suppliedOut = process.env.PLAYTEST_OUT;
  if (!suppliedOut) {
    throw new Error(
      "PLAYTEST_OUT is required so audit artifacts remain external to the source worktree."
    );
  }
  const worktreeRoot = resolve(git(["rev-parse", "--show-toplevel"]));
  const outDir = resolve(suppliedOut);
  const fromWorktree = relative(worktreeRoot, outDir);
  if (
    fromWorktree === "" ||
    (!fromWorktree.startsWith("..") && !fromWorktree.includes("../"))
  ) {
    throw new Error("PLAYTEST_OUT must be outside the source worktree.");
  }
  const pairedBlockSize = PRESETS.length * ROTATIONS_PER_ROSTER * 2;
  return {
    seedBase,
    matches,
    blocks: matches / pairedBlockSize,
    turns,
    size: BOARD_SIZE,
    timeLimitMs,
    outDir,
    worktreeRoot,
  };
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: AuditRow[]): string {
  const headers = [
    "scenario_id",
    "seed_block",
    "world_seed",
    "random_seed",
    "preset",
    "roster_id",
    "roster_original_indices",
    "roster_remapped_indices",
    "rotation",
    "opening_turn_order_nominal_seats",
    "size",
    "difficulty",
    "human_tribe",
    "turn_cap",
    "callback_cap",
    "callbacks_drained",
    "duration_ms",
    "phase",
    "turns_reached",
    "turn_cap_reached",
    "winner_seat",
    "winner_definition_index",
    "winner_name",
    "victory_path",
    "outcome",
    "failures_json",
    "tribes_json",
  ];
  const lines = rows.map(row =>
    [
      row.scenarioId,
      row.seedBlock,
      row.worldSeed,
      row.randomSeed,
      row.preset,
      row.rosterId,
      JSON.stringify(row.rosterOriginalIndices),
      JSON.stringify(row.rosterRemappedIndices),
      row.rotation,
      JSON.stringify(row.openingTurnOrderNominalSeats),
      row.size,
      row.difficulty,
      row.humanTribe,
      row.turnCap,
      row.callbackCap,
      row.callbacksDrained,
      row.durationMs,
      row.phase,
      row.turnsReached,
      row.turnCapReached,
      row.winnerSeat,
      row.winnerDefinitionIndex,
      row.winnerName,
      row.victoryPath,
      row.outcome,
      JSON.stringify(row.failures),
      JSON.stringify(row.tribes),
    ]
      .map(csvCell)
      .join(",")
  );
  return `${headers.join(",")}\n${lines.join("\n")}\n`;
}

function validateRealCoreState(state: {
  size: number;
  tiles: Array<{ x: number; y: number }>;
  units: Array<{ id: number; x: number; y: number; hp: number; maxHp: number }>;
}): string | null {
  if (state.tiles.length !== state.size * state.size) {
    return `tile length ${state.tiles.length} does not equal ${state.size}²`;
  }
  const occupied = new Set<string>();
  const unitIds = new Set<number>();
  for (const unit of state.units) {
    if (
      !Number.isInteger(unit.x) ||
      !Number.isInteger(unit.y) ||
      unit.x < 0 ||
      unit.y < 0 ||
      unit.x >= state.size ||
      unit.y >= state.size
    ) {
      return `unit#${unit.id} is out of bounds at (${unit.x},${unit.y})`;
    }
    const location = `${unit.x},${unit.y}`;
    if (occupied.has(location))
      return `multiple live units occupy (${location})`;
    occupied.add(location);
    if (!Number.isInteger(unit.id) || unitIds.has(unit.id)) {
      return `unit id ${unit.id} is duplicate or invalid`;
    }
    unitIds.add(unit.id);
    if (
      !Number.isFinite(unit.hp) ||
      !Number.isFinite(unit.maxHp) ||
      unit.hp <= 0 ||
      unit.hp > unit.maxHp
    ) {
      return `unit#${unit.id} has invalid HP ${unit.hp}/${unit.maxHp}`;
    }
  }
  for (let index = 0; index < state.tiles.length; index += 1) {
    const tile = state.tiles[index];
    if (
      tile.x !== index % state.size ||
      tile.y !== Math.floor(index / state.size)
    ) {
      return `tile[${index}] coordinates (${tile.x},${tile.y}) do not match its board index`;
    }
  }
  return null;
}

function reproduceCommand(config: Config, scenario: PairedScenario): string {
  return `PLAYTEST_OUT=${config.outDir} PLAYTEST_SEED=${scenario.worldSeed} PLAYTEST_MATCHES=16 PLAYTEST_TURNS=${config.turns} ./node_modules/.bin/tsx scripts/balance-paired.mts`;
}

function markdown(report: Report, config: Config): string {
  const { summary } = report;
  const lines = [
    "# Paired Tribe / Seat / Map AI Audit",
    "",
    `- **Status:** ${report.status}`,
    `- **Source SHA:** \`${report.sourceSha}\``,
    `- **Source dirty at start:** ${report.sourceDirty ? "yes" : "no"}`,
    `- **Requested bound:** ${config.matches} matches (${config.blocks} seed blocks × ${PRESETS.length} presets × 2 four-tribe rosters × ${ROTATIONS_PER_ROSTER} rotations), ${config.turns} turns/match, ${config.timeLimitMs}ms process budget.`,
    `- **Observed:** ${summary.observedMatches}/${summary.requestedMatches} seeded AI-vs-AI runs; ${summary.gameoverMatches} reached gameover; ${summary.incompleteMatches} incomplete; ${summary.failureRows} rows recorded failures.`,
    "",
    "## Design",
    "",
    "For each seed block, each canonical four-tribe roster is run on continents and archipelago. Each canonical roster gets four cyclic assignments to nominal engine slots. Therefore every definition in a roster visits every nominal seat once for the same seed/preset group. The output preserves both canonical/original roster indices and the remapped indices supplied to `newGame`.",
    "",
    "Every match uses the existing all-AI `newGame({ humanTribe: -1 })` pattern. The harness only queues and iteratively drains GameStore's own scheduled AI callbacks; it does not issue human turns or tactical/economy/research moves. Occupancy, unit ID, board coordinate, and HP invariants are checked at setup and after each real GameStore callback.",
    "",
    "## Observed rows by map preset",
    "",
    "| Preset | Rows |",
    "| --- | ---: |",
    ...Object.entries(summary.observedByPreset).map(
      ([preset, count]) => `| ${preset} | ${count} |`
    ),
    "",
    "## Observed tribe outcomes",
    "",
    "| Tribe | Def | Appearances | Wins | Observed win rate | Avg score | Seat appearances [0..3] | Seat wins [0..3] |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...summary.observedByDefinition.map(
      tribe =>
        `| ${tribe.name} | ${tribe.definitionIndex} | ${tribe.appearances} | ${tribe.wins} | ${tribe.winRatePercent === null ? "n/a" : `${tribe.winRatePercent.toFixed(1)}%`} | ${tribe.averageScore === null ? "n/a" : tribe.averageScore.toFixed(1)} | [${tribe.seatAppearances.join(", ")}] | [${tribe.seatWins.join(", ")}] |`
    ),
    "",
    "## Warnings and interpretation limits",
    "",
    ...report.limitations.map(limitation => `- ${limitation}`),
    "",
    "## Raw artifacts",
    "",
    "- `balance-paired.json` is the full versioned report, including per-scenario IDs, seeds, rosters, outcomes, and failures.",
    "- `balance-paired.csv` contains one raw observed match row per scenario; nested outcome details are retained as JSON columns.",
    "",
  ];
  return lines.join("\n");
}

const config = configFromEnvironment();
const sourceSha = git(["rev-parse", "HEAD"]);
const dirtyPaths = git(["status", "--porcelain"])
  .split("\n")
  .filter(Boolean)
  .map(line => line.slice(3));
const runtime = installScopedHeadlessRuntime();
const startedAt = Date.now();
const rows: AuditRow[] = [];

try {
  // Import after installing the scoped process shims. This is still the real
  // store and its scheduler; only browser storage, timers, and Math.random are
  // made deterministic for this audit process and restored in finally.
  const [{ game }, { TRIBE_DEFS }] = await Promise.all([
    import("../client/src/game/core/state"),
    import("../client/src/game/core/types"),
  ]);
  const observedFamilies = balancedFourTribeFamilies(TRIBE_DEFS.length);
  const scenarios = buildPairedScenarioMatrix({
    seedBase: config.seedBase,
    blocks: config.blocks,
    presets: PRESETS,
    rosterFamilies: observedFamilies,
  });
  if (scenarios.length !== config.matches) {
    throw new Error(
      `Matrix created ${scenarios.length} scenarios; expected ${config.matches}.`
    );
  }

  for (const scenario of scenarios) {
    const matchStarted = Date.now();
    const failures: AuditFailure[] = [];
    const callbackCap = Math.max(
      100,
      config.turns * ROTATIONS_PER_ROSTER * 8 + 32
    );
    let callbacksDrained = 0;
    let openingTurnOrderNominalSeats: number[] = [];
    runtime.clear();
    runtime.setRandomSeed(scenario.randomSeed);

    try {
      game.newGame({
        size: config.size,
        humanTribe: NO_HUMAN,
        difficulty: DIFFICULTY,
        seed: scenario.worldSeed,
        preset: scenario.preset,
        roster: scenario.rosterRemappedIndices,
      });
      // This is the sole test configuration change: it places the requested
      // bound on the ordinary GameStore score-ending path.
      game.state.maxTurns = config.turns;
      openingTurnOrderNominalSeats = [...(game.state.turnOrder ?? [])];
      const setupFailure = validateRealCoreState(game.state);
      if (setupFailure)
        failures.push({ kind: "invariant", detail: `setup: ${setupFailure}` });

      while (
        game.state.phase === "playing" &&
        callbacksDrained < callbackCap &&
        Date.now() - startedAt < config.timeLimitMs
      ) {
        const callback = runtime.pending.shift();
        if (!callback) {
          failures.push({
            kind: "stalled_callback_queue",
            detail:
              "GameStore callback queue emptied while the match was still playing.",
            callback: callbacksDrained,
          });
          break;
        }
        callback();
        callbacksDrained += 1;
        const invariantFailure = validateRealCoreState(game.state);
        if (invariantFailure) {
          failures.push({
            kind: "invariant",
            detail: `after callback ${callbacksDrained}: ${invariantFailure}`,
            callback: callbacksDrained,
          });
          break;
        }
      }
      if (game.state.phase === "playing" && callbacksDrained >= callbackCap) {
        failures.push({
          kind: "callback_cap",
          detail: `Callback cap ${callbackCap} reached while the match was still playing.`,
          callback: callbacksDrained,
        });
      }
      if (
        game.state.phase === "playing" &&
        Date.now() - startedAt >= config.timeLimitMs
      ) {
        failures.push({
          kind: "deadline",
          detail: `Process audit deadline of ${config.timeLimitMs}ms reached while this match was still playing.`,
          callback: callbacksDrained,
        });
      }
      if (game.state.phase !== "playing" && game.state.phase !== "gameover") {
        failures.push({
          kind: "unexpected_phase",
          detail: `Expected playing or gameover, found ${game.state.phase}.`,
          callback: callbacksDrained,
        });
      }
    } catch (error) {
      failures.push({
        kind: "exception",
        detail:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
        callback: callbacksDrained,
      });
    }

    const state = game.state;
    const tribes: TribeOutcome[] = state.tribes.map(tribe => ({
      nominalSeat: tribe.index,
      openingTurnPosition: openingTurnOrderNominalSeats.indexOf(tribe.index),
      definitionIndex: tribe.defIndex,
      name: tribe.name,
      passive: tribe.passive,
      alive: tribe.alive,
      score: tribe.score,
      stars: tribe.stars,
      cities: state.cities.filter(city => city.tribe === tribe.index).length,
      units: state.units.filter(unit => unit.tribe === tribe.index).length,
      techs: tribe.techs.length,
      battlesWon: state.stats[tribe.index]?.battlesWon ?? 0,
      citiesCaptured: state.stats[tribe.index]?.citiesCaptured ?? 0,
    }));
    const winner = state.winner === null ? null : state.tribes[state.winner];
    const reachedGameover = state.phase === "gameover";
    rows.push({
      scenarioId: scenario.id,
      seedBlock: scenario.seedBlock,
      worldSeed: scenario.worldSeed,
      randomSeed: scenario.randomSeed,
      preset: scenario.preset,
      rosterId: scenario.rosterId,
      rosterOriginalIndices: scenario.rosterOriginalIndices,
      rosterRemappedIndices: scenario.rosterRemappedIndices,
      rotation: scenario.rotation,
      openingTurnOrderNominalSeats,
      size: config.size,
      difficulty: DIFFICULTY,
      humanTribe: NO_HUMAN,
      turnCap: config.turns,
      callbackCap,
      callbacksDrained,
      durationMs: Date.now() - matchStarted,
      phase: state.phase,
      turnsReached: state.turn,
      turnCapReached: state.turn >= config.turns,
      winnerSeat: state.winner,
      winnerDefinitionIndex: winner?.defIndex ?? null,
      winnerName: winner?.name ?? null,
      victoryPath: state.winPath?.pathId ?? null,
      outcome:
        failures.length > 0
          ? "failed"
          : reachedGameover
            ? "gameover"
            : "incomplete",
      failures,
      tribes,
    });

    console.error(
      `[${rows.length}/${scenarios.length}] ${scenario.id} -> ${state.phase} turn=${state.turn}/${config.turns} winner=${winner?.name ?? "-"} callbacks=${callbacksDrained} failures=${failures.length}`
    );
    if (Date.now() - startedAt >= config.timeLimitMs) break;
  }

  const observedByPreset: Record<string, number> = Object.fromEntries(
    PRESETS.map(preset => [
      preset,
      rows.filter(row => row.preset === preset).length,
    ])
  );
  const observedByDefinition = TRIBE_DEFS.map((definition, definitionIndex) => {
    const appearances = rows.flatMap(row =>
      row.tribes.filter(tribe => tribe.definitionIndex === definitionIndex)
    );
    const wins = rows.filter(
      row => row.winnerDefinitionIndex === definitionIndex
    ).length;
    const seatAppearances = Array.from(
      { length: ROTATIONS_PER_ROSTER },
      (_, seat) =>
        appearances.filter(tribe => tribe.nominalSeat === seat).length
    );
    const seatWins = Array.from(
      { length: ROTATIONS_PER_ROSTER },
      (_, seat) =>
        rows.filter(
          row =>
            row.winnerDefinitionIndex === definitionIndex &&
            row.winnerSeat === seat
        ).length
    );
    return {
      definitionIndex,
      name: definition.name,
      appearances: appearances.length,
      wins,
      winRatePercent:
        appearances.length === 0 ? null : (wins / appearances.length) * 100,
      averageScore:
        appearances.length === 0
          ? null
          : appearances.reduce((sum, tribe) => sum + tribe.score, 0) /
            appearances.length,
      seatAppearances,
      seatWins,
    };
  });
  const failureRows = rows.filter(row => row.failures.length > 0).length;
  const incompleteMatches = rows.filter(
    row => row.outcome === "incomplete"
  ).length;
  const report: Report = {
    version: 1,
    lane: "paired_balance_audit",
    status:
      failureRows > 0 || rows.length < config.matches
        ? "completed_with_failures"
        : "completed_with_observation_warnings",
    generatedAt: new Date().toISOString(),
    sourceSha,
    sourceDirty: dirtyPaths.length > 0,
    sourceDirtyPaths: dirtyPaths,
    config: {
      seedBase: config.seedBase,
      matches: config.matches,
      blocks: config.blocks,
      turns: config.turns,
      boardSize: config.size,
      timeLimitMs: config.timeLimitMs,
      presets: PRESETS,
      rosterFamilies: observedFamilies.map(family => ({
        id: family.id,
        originalRoster: family.originalRoster,
      })),
      rotationsPerRoster: ROTATIONS_PER_ROSTER,
      allAiSetup: "newGame({ humanTribe: -1 })",
    },
    rows,
    summary: {
      requestedMatches: config.matches,
      observedMatches: rows.length,
      gameoverMatches: rows.filter(row => row.outcome === "gameover").length,
      incompleteMatches,
      failureRows,
      totalCallbackCount: rows.reduce(
        (sum, row) => sum + row.callbacksDrained,
        0
      ),
      observedByPreset,
      observedByDefinition,
    },
    limitations: [
      "This is a bounded sample of normal-difficulty, 11×11, four-tribe, all-AI runs. It reports observed outcomes; it does not establish or prove fairness.",
      "The matrix separates canonical roster identity, nominal slot rotation, and the two named map presets in its rows, but four-player interactions and stochastic AI decisions still interact with those factors.",
      "Each paired group resets the fresh-world seed and scoped Math.random seed. That makes setup and the AI random stream reproducible, but different roster-to-seat assignments naturally cause different decisions and later turn states; same fresh-world RNG seed does not ensure identical future turn states.",
      "The all-AI humanTribe:-1 setup intentionally does not exercise human input, human decision quality, UI pacing, city-reward/perk choice behavior for a human, accessibility, rendering, browser behavior, networking, saves/resumes, or entitlement flows.",
      "The test process temporarily patches Math.random, setTimeout, window, and localStorage only to make headless callback execution reproducible. The original globals are restored in finally before process exit.",
      "A row with callback, deadline, queue, exception, or invariant failures remains in raw output and should not be treated as a normal completed outcome.",
    ],
  };

  const jsonPath = resolve(config.outDir, "balance-paired.json");
  const csvPath = resolve(config.outDir, "balance-paired.csv");
  const reportPath = resolve(config.outDir, "REPORT.md");
  await mkdir(config.outDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(csvPath, rowsToCsv(rows), "utf8");
  await writeFile(reportPath, markdown(report, config), "utf8");

  console.log(
    `Paired balance audit ${report.status}: ${rows.length}/${config.matches} observed run(s) -> ${jsonPath}`
  );
  if (report.status === "completed_with_failures") process.exitCode = 1;
} finally {
  runtime.restore();
}
