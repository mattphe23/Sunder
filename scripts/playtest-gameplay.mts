// Bounded, report-only gameplay smoke runner.
//
// Runs the existing GameStore scheduler and scripted AI headlessly. It never
// injects player actions, AI policy, balance values, rendering, models, or
// browser/server behavior. Artifacts must live outside this worktree through
// PLAYTEST_OUT.
//
// Usage:
//   PLAYTEST_OUT=/absolute/output/path ./node_modules/.bin/tsx scripts/playtest-gameplay.mts
//   PLAYTEST_OUT=/absolute/output/path PLAYTEST_SEED=6707978 PLAYTEST_MATCHES=16 PLAYTEST_TURNS=30 ./node_modules/.bin/tsx scripts/playtest-gameplay.mts
//   PLAYTEST_OUT=/absolute/output/path ./node_modules/.bin/tsx scripts/playtest-gameplay.mts --seed 6707978 --matches 2 --turns 30

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

type CheckStatus = "pass" | "fail" | "warning";
type FindingSeverity = "error" | "warning";

interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

interface CaseReport {
  id: string;
  seed: number;
  actions: string[];
  checks: Check[];
  artifacts: string[];
}

interface Finding {
  severity: FindingSeverity;
  summary: string;
  reproSteps: string[];
}

interface Report {
  version: 1;
  lane: "gameplay";
  status: "passed_with_coverage_warnings" | "failed";
  sourceSha: string;
  cases: CaseReport[];
  findings: Finding[];
  limitations: string[];
}

interface Config {
  seed: number;
  matches: number;
  turns: number;
  size: number;
  outDir: string;
  worktreeRoot: string;
}

const LANE = "gameplay" as const;
const DEFAULT_SEED = 6_707_978;
const DEFAULT_MATCHES = 16;
const DEFAULT_TURNS = 30;
const BOARD_SIZE = 11;
const MAX_MATCHES = 64;
const MAX_TURNS = 60;
const PRESETS = ["continents", "archipelago", "highlands", "pangaea"] as const;

function usage(): string {
  return [
    "Usage: PLAYTEST_OUT=/absolute/output/path ./node_modules/.bin/tsx scripts/playtest-gameplay.mts [--seed N] [--matches N] [--turns N]",
    "Environment alternatives: PLAYTEST_SEED, PLAYTEST_MATCHES, PLAYTEST_TURNS.",
    `Bounds: 1-${MAX_MATCHES} matches and 1-${MAX_TURNS} turns per match.`,
  ].join("\n");
}

function cliArgs(argv: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--"))
      throw new Error(`Unexpected argument: ${key}\n${usage()}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}\n${usage()}`);
    }
    if (key !== "--seed" && key !== "--matches" && key !== "--turns") {
      throw new Error(`Unknown argument: ${key}\n${usage()}`);
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
  if (!/^-?\d+$/.test(raw))
    throw new Error(
      `${name} must be an integer; received ${JSON.stringify(raw)}.`
    );
  const value = Number(raw);
  if (!Number.isSafeInteger(value))
    throw new Error(
      `${name} must be a safe integer; received ${JSON.stringify(raw)}.`
    );
  return value;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function configFromEnvironment(): Config {
  const args = cliArgs(process.argv.slice(2));
  const seed = readInteger(
    "seed",
    args.get("seed") ?? process.env.PLAYTEST_SEED,
    DEFAULT_SEED
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
  if (seed < 0) throw new Error("seed must be non-negative.");
  if (matches < 1 || matches > MAX_MATCHES) {
    throw new Error(
      `matches must be between 1 and ${MAX_MATCHES}; received ${matches}.`
    );
  }
  if (turns < 1 || turns > MAX_TURNS) {
    throw new Error(
      `turns must be between 1 and ${MAX_TURNS}; received ${turns}.`
    );
  }

  const suppliedOut = process.env.PLAYTEST_OUT;
  if (!suppliedOut) {
    throw new Error(
      "PLAYTEST_OUT is required so reports remain external to the source worktree."
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

  return { seed, matches, turns, size: BOARD_SIZE, outDir, worktreeRoot };
}

function setupHeadlessRuntime() {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
  };
  const pending: (() => void)[] = [];
  const globals = globalThis as unknown as { window?: unknown };
  globals.window = undefined;
  globalThis.localStorage = storage;
  globalThis.setTimeout = ((
    callback: TimerHandler,
    _delay?: number,
    ...args: unknown[]
  ) => {
    if (typeof callback !== "function") {
      throw new Error(
        "The headless gameplay runner only supports function timer callbacks."
      );
    }
    pending.push(() => callback(...args));
    return pending.length as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout;
  return { pending, storage };
}

function check(name: string, failures: string[], successDetail: string): Check {
  return failures.length === 0
    ? { name, status: "pass", detail: successDetail }
    : { name, status: "fail", detail: failures.join("; ") };
}

function formatRoster(
  definitions: readonly { name: string }[],
  roster: number[]
): string {
  return roster
    .map(index => definitions[index]?.name ?? `def#${index}`)
    .join(", ");
}

function reproduceCommand(config: Config, seed: number): string {
  return `PLAYTEST_OUT=${config.outDir} PLAYTEST_SEED=${seed} PLAYTEST_MATCHES=1 PLAYTEST_TURNS=${config.turns} ./node_modules/.bin/tsx scripts/playtest-gameplay.mts`;
}

const runtime = setupHeadlessRuntime();
const config = configFromEnvironment();
const sourceSha = git(["rev-parse", "HEAD"]);
const [{ game }, { seedRandom }, { GUARDIAN_TRIBE, TRIBE_DEFS, UNIT_STATS }] =
  await Promise.all([
    import("../client/src/game/core/state"),
    import("./_rng.mts"),
    import("../client/src/game/core/types"),
  ]);

type State = typeof game.state;

function stateChecks(state: State, stage: string): Check[] {
  const validTribe = (tribe: unknown): tribe is number =>
    typeof tribe === "number" &&
    Number.isInteger(tribe) &&
    tribe >= 0 &&
    tribe < state.tribes.length;
  const inBounds = (x: unknown, y: unknown) =>
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    (x as number) >= 0 &&
    (y as number) >= 0 &&
    (x as number) < state.size &&
    (y as number) < state.size;

  const legalPositionFailures: string[] = [];
  if (state.tiles.length !== state.size * state.size) {
    legalPositionFailures.push(
      `tile length ${state.tiles.length} does not equal ${state.size}²`
    );
  }
  for (let index = 0; index < state.tiles.length; index += 1) {
    const tile = state.tiles[index];
    const expectedX = index % state.size;
    const expectedY = Math.floor(index / state.size);
    if (!inBounds(tile?.x, tile?.y)) {
      legalPositionFailures.push(
        `tile[${index}] has out-of-bounds coordinates (${tile?.x},${tile?.y})`
      );
      break;
    }
    if (tile.x !== expectedX || tile.y !== expectedY) {
      legalPositionFailures.push(
        `tile[${index}] coordinates (${tile.x},${tile.y}) do not match (${expectedX},${expectedY})`
      );
      break;
    }
  }
  const occupied = new Set<string>();
  const unitIds = new Set<number>();
  for (const unit of state.units) {
    if (!inBounds(unit.x, unit.y)) {
      legalPositionFailures.push(
        `unit#${unit.id} is out of bounds at (${unit.x},${unit.y})`
      );
      break;
    }
    if (occupied.has(`${unit.x},${unit.y}`)) {
      legalPositionFailures.push(`multiple units occupy (${unit.x},${unit.y})`);
      break;
    }
    occupied.add(`${unit.x},${unit.y}`);
    if (!Number.isInteger(unit.id) || unitIds.has(unit.id)) {
      legalPositionFailures.push(`unit id ${unit.id} is duplicate or invalid`);
      break;
    }
    unitIds.add(unit.id);
  }

  const hpFailures: string[] = [];
  for (const unit of state.units) {
    if (
      !Number.isFinite(unit.hp) ||
      !Number.isFinite(unit.maxHp) ||
      unit.maxHp <= 0
    ) {
      hpFailures.push(
        `unit#${unit.id} has non-finite or non-positive HP (${unit.hp}/${unit.maxHp})`
      );
      break;
    }
    if (unit.hp <= 0 || unit.hp > unit.maxHp) {
      hpFailures.push(
        `unit#${unit.id} HP ${unit.hp} is outside (0, ${unit.maxHp}]`
      );
      break;
    }
    if (!(unit.type in UNIT_STATS)) {
      hpFailures.push(`unit#${unit.id} has unknown type ${unit.type}`);
      break;
    }
    if (unit.tribe !== GUARDIAN_TRIBE && !validTribe(unit.tribe)) {
      hpFailures.push(`unit#${unit.id} has invalid owner ${unit.tribe}`);
      break;
    }
  }

  const economyFailures: string[] = [];
  if (state.stats.length !== state.tribes.length) {
    economyFailures.push(
      `stats length ${state.stats.length} does not match tribes ${state.tribes.length}`
    );
  }
  for (let tribeIndex = 0; tribeIndex < state.tribes.length; tribeIndex += 1) {
    const tribe = state.tribes[tribeIndex];
    if (tribe.index !== tribeIndex) {
      economyFailures.push(
        `tribe slot ${tribeIndex} reports index ${tribe.index}`
      );
      break;
    }
    if (!Number.isFinite(tribe.stars) || tribe.stars < 0) {
      economyFailures.push(
        `tribe ${tribeIndex} has invalid stars ${tribe.stars}`
      );
      break;
    }
    if (!Number.isFinite(tribe.score)) {
      economyFailures.push(
        `tribe ${tribeIndex} has invalid score ${tribe.score}`
      );
      break;
    }
    if (new Set(tribe.techs).size !== tribe.techs.length) {
      economyFailures.push(`tribe ${tribeIndex} has duplicate technologies`);
      break;
    }
    const stats = state.stats[tribeIndex];
    if (
      !stats ||
      Object.values(stats).some(value => !Number.isFinite(value) || value < 0)
    ) {
      economyFailures.push(`tribe ${tribeIndex} has invalid statistics`);
      break;
    }
  }

  const cityFailures: string[] = [];
  const cityIds = new Set<number>();
  const cityPositions = new Set<string>();
  for (const city of state.cities) {
    if (!Number.isInteger(city.id) || cityIds.has(city.id)) {
      cityFailures.push(`city id ${city.id} is duplicate or invalid`);
      break;
    }
    cityIds.add(city.id);
    if (!inBounds(city.x, city.y)) {
      cityFailures.push(
        `city#${city.id} is out of bounds at (${city.x},${city.y})`
      );
      break;
    }
    const key = `${city.x},${city.y}`;
    if (cityPositions.has(key)) {
      cityFailures.push(`multiple cities occupy (${key})`);
      break;
    }
    cityPositions.add(key);
    if (city.tribe !== null && !validTribe(city.tribe)) {
      cityFailures.push(`city#${city.id} has invalid owner ${city.tribe}`);
      break;
    }
    // A neutral village is deliberately level 0 until its first capture. A
    // captured capital deliberately keeps its capital identity, so neither
    // condition is an ownership failure.
    const expectedMinimumLevel = city.tribe === null ? 0 : 1;
    if (
      !Number.isFinite(city.level) ||
      city.level < expectedMinimumLevel ||
      !Number.isFinite(city.population) ||
      city.population < 0
    ) {
      cityFailures.push(
        `city#${city.id} has invalid level/population ${city.level}/${city.population}`
      );
      break;
    }
    const tile = state.tiles[city.y * state.size + city.x];
    if (tile?.cityId !== city.id) {
      cityFailures.push(
        `city#${city.id} is not referenced by its tile (${tile?.cityId ?? "missing"})`
      );
      break;
    }
  }

  const turnFailures: string[] = [];
  if (state.phase !== "playing" && state.phase !== "gameover") {
    turnFailures.push(`unexpected phase ${state.phase}`);
  }
  if (
    !Number.isInteger(state.turn) ||
    state.turn < 0 ||
    state.turn > state.maxTurns
  ) {
    turnFailures.push(`turn ${state.turn} is outside [0, ${state.maxTurns}]`);
  }
  if (!Number.isInteger(state.maxTurns) || state.maxTurns < 1) {
    turnFailures.push(`maxTurns ${state.maxTurns} is invalid`);
  }
  if (!validTribe(state.currentTribe))
    turnFailures.push(`currentTribe ${state.currentTribe} is invalid`);
  if (
    !Array.isArray(state.turnOrder) ||
    state.turnOrder.length !== state.tribes.length
  ) {
    turnFailures.push("turn order does not cover every tribe");
  } else if (
    new Set(state.turnOrder).size !== state.tribes.length ||
    state.turnOrder.some(tribe => !validTribe(tribe))
  ) {
    turnFailures.push("turn order contains duplicate or invalid tribe indexes");
  }

  return [
    check(
      `${stage}:legal_positions`,
      legalPositionFailures,
      "tiles and unit positions are in-bounds and non-overlapping"
    ),
    check(
      `${stage}:hp`,
      hpFailures,
      "all units have finite positive HP within maxHp"
    ),
    check(
      `${stage}:economy`,
      economyFailures,
      "tribe economy, technologies, scores, and statistics are finite and legal"
    ),
    check(
      `${stage}:city_ownership`,
      cityFailures,
      "cities have valid unique positions and legal ownership"
    ),
    check(
      `${stage}:turn_progress`,
      turnFailures,
      "phase, current tribe, turn cap, and turn order are internally valid"
    ),
  ];
}

function savabilityCheck(
  serialized: string,
  saved: boolean,
  summary: ReturnType<typeof game.savedSummary>,
  loaded: boolean
): Check {
  try {
    const snapshot = JSON.parse(serialized) as {
      phase?: unknown;
      tiles?: unknown;
      tribes?: unknown;
    };
    if (snapshot.phase !== "playing")
      return {
        name: "setup:savability",
        status: "fail",
        detail: "serialized checkpoint was not playing",
      };
    if (!Array.isArray(snapshot.tiles) || !Array.isArray(snapshot.tribes)) {
      return {
        name: "setup:savability",
        status: "fail",
        detail: "serialized checkpoint lacks tiles or tribes",
      };
    }
    if (!saved || !summary || !loaded) {
      return {
        name: "setup:savability",
        status: "fail",
        detail: `save=${saved}, summary=${Boolean(summary)}, continueGame=${loaded}`,
      };
    }
    return {
      name: "setup:savability",
      status: "pass",
      detail: `JSON snapshot (${serialized.length} bytes) parsed and local save resumed at turn ${summary.turn}`,
    };
  } catch (error) {
    return {
      name: "setup:savability",
      status: "fail",
      detail: `snapshot JSON failed to parse: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function driveToTerminal(
  maxCallbacks: number,
  checks: Check[]
): {
  callbacks: number;
  idleEnds: number;
  invariantFailures: Check[];
  stalled: boolean;
  capped: boolean;
} {
  let callbacks = 0;
  let idleEnds = 0;
  const invariantFailures: Check[] = [];
  while (game.state.phase === "playing" && callbacks < maxCallbacks) {
    if (
      game.state.currentTribe === game.state.humanTribe &&
      !game.state.aiThinking
    ) {
      game.endTurn();
      idleEnds += 1;
      const idleFailures = stateChecks(
        game.state,
        `idle_end_${idleEnds}`
      ).filter(result => result.status === "fail");
      invariantFailures.push(...idleFailures);
      continue;
    }
    const callback = runtime.pending.shift();
    if (!callback) {
      return {
        callbacks,
        idleEnds,
        invariantFailures,
        stalled: true,
        capped: false,
      };
    }
    callback();
    callbacks += 1;
    const callbackFailures = stateChecks(
      game.state,
      `callback_${callbacks}`
    ).filter(result => result.status === "fail");
    invariantFailures.push(...callbackFailures);
  }
  checks.push(
    check(
      "scheduled_actions:invariants",
      invariantFailures.map(result => `${result.name}: ${result.detail}`),
      `validated legal positions, HP, economy, city ownership, and turn progress after ${callbacks} scheduled AI callbacks and ${idleEnds} idle human end turns`
    )
  );
  checks.push(...invariantFailures);
  return {
    callbacks,
    idleEnds,
    invariantFailures,
    stalled: game.state.phase === "playing" && runtime.pending.length === 0,
    capped: game.state.phase === "playing" && callbacks >= maxCallbacks,
  };
}

function markdown(report: Report, config: Config): string {
  const lines = [
    "# Gameplay Playtest Report",
    "",
    `- **Lane:** ${report.lane}`,
    `- **Status:** ${report.status}`,
    `- **Source SHA:** \`${report.sourceSha}\``,
    `- **Bounds:** ${config.matches} matches, ${config.turns} turns/match, board size ${config.size}`,
    `- **Seed block:** ${config.seed}–${config.seed + config.matches - 1}`,
    "",
    "## Cases",
    "",
    "| Case | Seed | Existing AI actions | Invariant result |",
    "| --- | ---: | ---: | --- |",
    ...report.cases.map(caseReport => {
      const callbacks =
        caseReport.actions.find(action => action.startsWith("Drained ")) ??
        "not driven";
      const failed = caseReport.checks.filter(
        checkResult => checkResult.status === "fail"
      ).length;
      return `| ${caseReport.id} | ${caseReport.seed} | ${callbacks.replace("Drained ", "").replace(" scheduled callbacks", "")} | ${failed === 0 ? "pass" : `${failed} failure(s)`} |`;
    }),
    "",
    "## Findings",
    "",
    ...report.findings.flatMap(finding => [
      `### ${finding.severity.toUpperCase()}: ${finding.summary}`,
      "",
      ...finding.reproSteps.map(step => `- ${step}`),
      "",
    ]),
    "## Limitations",
    "",
    ...report.limitations.map(limitation => `- ${limitation}`),
    "",
    "## Machine-readable report",
    "",
    "`playtest-gameplay.json` contains the required versioned per-case seeds, actions, checks, artifacts, findings, and limitations.",
    "",
  ];
  return lines.join("\n");
}

const reportPath = resolve(config.outDir, "REPORT.md");
const jsonPath = resolve(config.outDir, "playtest-gameplay.json");
const cases: CaseReport[] = [];
const findings: Finding[] = [
  {
    severity: "warning",
    summary:
      "Headless gameplay coverage does not load the renderer, imported models, browser, or native runtime.",
    reproSteps: [
      "This is a coverage boundary, not a crash result.",
      "Intentional procedural fallbacks and missing imported/native models are not exercised in this lane and must be reported separately if observed elsewhere.",
    ],
  },
];

for (let match = 0; match < config.matches; match += 1) {
  const seed = config.seed + match;
  const preset = PRESETS[seed % PRESETS.length];
  const rosterStart = seed % TRIBE_DEFS.length;
  const roster = Array.from(
    { length: 4 },
    (_, slot) => (rosterStart + slot) % TRIBE_DEFS.length
  );
  const idleHumanTribe = match % roster.length;
  const checks: Check[] = [];
  const actions = [
    `newGame(size=${config.size}, seed=${seed}, preset=${preset}, difficulty=normal, roster=[${formatRoster(TRIBE_DEFS, roster)}], idleHumanTribe=${idleHumanTribe})`,
    "Resumed the GameStore's own local save before play; the designated human only called endTurn, with no tactical, economy, or research action injected.",
    "Drained only the existing GameStore scheduled AI callbacks; no individual tribe research, custom policy, balance setting, renderer, browser, or model was invoked.",
  ];

  runtime.pending.length = 0;
  runtime.storage.clear();
  seedRandom(seed);
  game.newGame({
    size: config.size,
    humanTribe: idleHumanTribe,
    difficulty: "normal",
    seed,
    preset,
    roster,
  });
  game.state.maxTurns = config.turns;
  // newGame writes its default cap as part of its initial auto-save. Emit one
  // ordinary state change after configuring the bounded test cap so continueGame
  // validates the exact run configuration rather than the default save.
  game.emit({ type: "changed" });

  checks.push(...stateChecks(game.state, "setup"));
  const serialized = game.serializeState();
  const saved = game.hasSave();
  const summary = game.savedSummary();
  const loaded = game.continueGame();
  checks.push(savabilityCheck(serialized, saved, summary, loaded));
  checks.push(...stateChecks(game.state, "resumed"));

  const maxCallbacks = Math.max(100, config.turns * roster.length * 8 + 16);
  const driven = driveToTerminal(maxCallbacks, checks);
  actions[2] = `Drained ${driven.callbacks} scheduled AI callbacks and issued ${driven.idleEnds} idle end turns (cap ${maxCallbacks}); terminal phase=${game.state.phase}, turn=${game.state.turn}/${game.state.maxTurns}.`;

  const terminalFailures: string[] = [];
  if (driven.stalled)
    terminalFailures.push(
      "scheduled AI callback queue emptied while game was still playing"
    );
  if (driven.capped)
    terminalFailures.push(
      `callback duration cap ${maxCallbacks} was reached while game was still playing`
    );
  if (game.state.phase !== "gameover")
    terminalFailures.push(
      `expected gameover after bounded run, found ${game.state.phase}`
    );
  if (game.state.turn <= 0)
    terminalFailures.push("match ended without observable turn progress");
  checks.push(
    check(
      "terminal:turn_progress",
      terminalFailures,
      `game reached ${game.state.phase} at turn ${game.state.turn}/${game.state.maxTurns} after ${driven.callbacks} callbacks`
    )
  );
  checks.push(...stateChecks(game.state, "terminal"));

  const caseReport: CaseReport = {
    id: `game-${String(match + 1).padStart(2, "0")}`,
    seed,
    actions,
    checks,
    artifacts: [jsonPath],
  };
  cases.push(caseReport);

  const failed = checks.filter(checkResult => checkResult.status === "fail");
  if (failed.length > 0) {
    findings.push({
      severity: "error",
      summary: `${caseReport.id} hit ${failed.length} gameplay invariant failure(s): ${failed.map(result => result.name).join(", ")}.`,
      reproSteps: [
        "From the source worktree, run:",
        `\`${reproduceCommand(config, seed)}\``,
        `Use the deterministic case parameters: preset=${preset}; roster=[${formatRoster(TRIBE_DEFS, roster)}].`,
        ...failed.map(result => `${result.name}: ${result.detail}`),
      ],
    });
  }
}

const hasInvariantFailure = cases.some(caseReport =>
  caseReport.checks.some(checkResult => checkResult.status === "fail")
);
const report: Report = {
  version: 1,
  lane: LANE,
  status: hasInvariantFailure ? "failed" : "passed_with_coverage_warnings",
  sourceSha,
  cases,
  findings,
  limitations: [
    "Bounded to at most 64 matches and 60 turns per match; this run used the explicit configuration above.",
    "The runner validates only headless core-state invariants and local JSON save/resume behavior using the existing GameStore scheduler and AI.",
    "Browser behavior, rendering, screenshots, imported/native model availability, aesthetic quality, and native RAM are intentionally out of scope; this report makes no approval claim for them.",
    "No screenshot pixels were created, inspected, or modified.",
  ],
};

await mkdir(config.outDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(reportPath, markdown(report, config), "utf8");

console.log(
  `Gameplay playtest ${report.status}: ${cases.length} match(es) -> ${jsonPath}`
);
if (hasInvariantFailure) process.exitCode = 1;
