// Bounded nominal-seat fairness audit.
//
// This report-only harness preserves two distinct fresh states per frozen
// scenario outside the worktree:
//   1. A regular local GameStore save (humanTribe: 0) that is successfully
//      parsed through loadOnlineSnapshot, proving the initial fixture is legal.
//   2. The exact all-AI initial state used for the measured match
//      (humanTribe: -1). This captures the real GameStore/AI setup but is not
//      a user-loadable local save because the production snapshot validator
//      correctly rejects a negative humanTribe.
//
// The harness does not alter map generation, default rules, tribes, AI moves,
// economy, or faction stats. It only sets the already-existing game score turn
// cap and drains GameStore-scheduled AI callbacks through a process-local,
// restored timer queue.
//
// Usage:
//   FAIRNESS_AUDIT_OUT=/absolute/external/output \
//     ./node_modules/.bin/tsx scripts/fairness-audit.mts

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  FAIRNESS_EXPECTED_MATCHES,
  FAIRNESS_PRESETS,
  FAIRNESS_SEED_BASE,
  FAIRNESS_SEED_BLOCKS,
  FAIRNESS_TURN_CAP,
  measureInitialPlacements,
  mixedFourTribeFamilies,
  type InitialPlacementMetrics,
} from "./lib/fairnessAudit";
import {
  buildPairedScenarioMatrix,
  installScopedHeadlessRuntime,
  ROTATIONS_PER_ROSTER,
  type PairedScenario,
} from "./lib/balancePaired";

type Preset = (typeof FAIRNESS_PRESETS)[number];
type FailureKind =
  | "callback_cap"
  | "deadline"
  | "stalled_callback_queue"
  | "unexpected_phase"
  | "invariant"
  | "exception"
  | "save_fixture";

interface AuditFailure {
  kind: FailureKind;
  detail: string;
  callback?: number;
}

interface TribeOutcome {
  nominalSeat: number;
  openingTurnPosition: number | null;
  definitionIndex: number;
  name: string;
  alive: boolean;
  score: number;
  stars: number;
  cities: number;
  units: number;
  techs: number;
  battlesWon: number;
  citiesCaptured: number;
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
  initialAiStatePath: string;
  legalInitialSavePath: string;
  legalSaveValidated: boolean;
  mapStateSha256: string;
  openingTurnOrderNominalSeats: number[];
  initialPlacements: InitialPlacementMetrics[];
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

interface SeatOutcomeSummary {
  group: number;
  appearances: number;
  wins: number;
  winRatePercent: number | null;
  averageScore: number | null;
  averageCities: number | null;
}

interface PlacementSummary {
  group: number;
  rows: number;
  uniqueSeedPresetMaps: number;
  meanOwnedResources: number | null;
  meanImmediatelyHarvestableOwnedResources: number | null;
  meanLegalReachableNeutralExpansionTiles: number | null;
  meanNearestNeutralCityManhattan: number | null;
  meanNearestOpponentCapitalManhattan: number | null;
  meanOwnedGrass: number | null;
  meanOwnedForest: number | null;
  meanOwnedMountain: number | null;
  meanOwnedWaterOrOcean: number | null;
}

interface FairnessReport {
  version: 1;
  lane: "nominal_seat_fairness_audit";
  status: "completed" | "completed_with_failures";
  generatedAt: string;
  source: {
    headSha: string;
    dirtyPaths: string[];
    hashes: Record<string, string>;
  };
  frozenMatrix: {
    expectedMatches: number;
    actualMatchLimit: number;
    turnLimit: number;
    seedBase: number;
    seedBlocks: number;
    independentSeeds: number[];
    presets: readonly Preset[];
    rosterFamilies: Array<{ id: string; originalRoster: number[] }>;
    rotationsPerRoster: number;
    matrixPath: string;
    allAiSetup: "newGame({ humanTribe: -1 })";
    legalSaveSetup: "newGame({ humanTribe: 0 })";
    processTimeLimitMs: number;
  };
  rows: AuditRow[];
  summary: {
    requestedMatches: number;
    observedMatches: number;
    failureRows: number;
    gameoverMatches: number;
    incompleteMatches: number;
    legalSaveFixturesValidated: number;
    totalCallbackCount: number;
    nominalSeatOutcomes: SeatOutcomeSummary[];
    openingTurnPositionOutcomes: SeatOutcomeSummary[];
    nominalSeatPlacements: PlacementSummary[];
    openingTurnPositionPlacements: PlacementSummary[];
  };
  limitations: string[];
}

const PROCESS_TIME_LIMIT_MS = 900_000;
const BOARD_SIZE = 11;
const DIFFICULTY = "normal" as const;
const NO_HUMAN = -1 as const;
const SOURCE_FILES = [
  "scripts/fairness-audit.mts",
  "scripts/lib/fairnessAudit.ts",
  "scripts/balance-paired.mts",
  "scripts/lib/balancePaired.ts",
  "client/src/game/core/mapgen.ts",
  "client/src/game/core/state.ts",
  "client/src/game/core/rules.ts",
  "client/src/game/core/types.ts",
] as const;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sourceHash(path: string): string {
  return execFileSync("sha256sum", [path], { encoding: "utf8" })
    .trim()
    .split(/\s+/)[0];
}

function outputDir(): string {
  const supplied = process.env.FAIRNESS_AUDIT_OUT;
  if (!supplied) {
    throw new Error(
      "FAIRNESS_AUDIT_OUT is required so all fairness evidence remains outside the source worktree."
    );
  }
  const worktree = resolve(git(["rev-parse", "--show-toplevel"]));
  const out = resolve(supplied);
  const fromWorktree = relative(worktree, out);
  if (
    fromWorktree === "" ||
    (!fromWorktree.startsWith("..") && !fromWorktree.includes("../"))
  ) {
    throw new Error("FAIRNESS_AUDIT_OUT must be outside the source worktree.");
  }
  return out;
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
    if (occupied.has(location)) return `multiple live units occupy (${location})`;
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

function mapStateDigest(state: {
  tiles: Array<{
    x: number;
    y: number;
    terrain: string;
    resource: string | null;
    cityId: number | null;
    ownerCityId: number | null;
    ruin: boolean;
    greatRuin: boolean;
  }>;
  cities: Array<{ id: number; x: number; y: number; tribe: number | null; isCapital: boolean }>;
}): string {
  return sha256(
    JSON.stringify({
      tiles: state.tiles.map(tile => [
        tile.x,
        tile.y,
        tile.terrain,
        tile.resource,
        tile.cityId,
        tile.ownerCityId,
        tile.ruin,
        tile.greatRuin,
      ]),
      cities: state.cities.map(city => [
        city.id,
        city.x,
        city.y,
        city.tribe,
        city.isCapital,
      ]),
    })
  );
}

function scenarioPreset(scenario: PairedScenario): Preset {
  if (!FAIRNESS_PRESETS.includes(scenario.preset as Preset)) {
    throw new Error(`Unexpected frozen preset ${scenario.preset}.`);
  }
  return scenario.preset as Preset;
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
    "initial_ai_state_path",
    "legal_initial_save_path",
    "legal_save_validated",
    "map_state_sha256",
    "opening_turn_order_nominal_seats",
    "initial_placements_json",
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
      row.initialAiStatePath,
      row.legalInitialSavePath,
      row.legalSaveValidated,
      row.mapStateSha256,
      JSON.stringify(row.openingTurnOrderNominalSeats),
      JSON.stringify(row.initialPlacements),
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

function mean(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function outcomeSummary(
  rows: AuditRow[],
  group: "nominalSeat" | "openingTurnPosition"
): SeatOutcomeSummary[] {
  return Array.from({ length: ROTATIONS_PER_ROSTER }, (_, position) => {
    const appearances = rows.flatMap(row =>
      row.tribes.filter(tribe => tribe[group] === position)
    );
    const wins = rows.filter(row => {
      if (group === "nominalSeat") return row.winnerSeat === position;
      return row.winnerSeat !== null && row.openingTurnOrderNominalSeats.indexOf(row.winnerSeat) === position;
    }).length;
    return {
      group: position,
      appearances: appearances.length,
      wins,
      winRatePercent: appearances.length === 0 ? null : (wins / appearances.length) * 100,
      averageScore: mean(appearances.map(tribe => tribe.score)),
      averageCities: mean(appearances.map(tribe => tribe.cities)),
    };
  });
}

function placementSummary(
  rows: AuditRow[],
  group: "nominalSeat" | "openingTurnPosition"
): PlacementSummary[] {
  return Array.from({ length: ROTATIONS_PER_ROSTER }, (_, position) => {
    const placements = rows.flatMap(row =>
      row.initialPlacements.filter(placement => placement[group] === position)
    );
    const mapIdentity = new Set(
      rows
        .filter(row =>
          row.initialPlacements.some(placement => placement[group] === position)
        )
        .map(row => `${row.worldSeed}/${row.preset}/${row.mapStateSha256}`)
    );
    return {
      group: position,
      rows: placements.length,
      uniqueSeedPresetMaps: mapIdentity.size,
      meanOwnedResources: mean(placements.map(placement => placement.ownedResourceTotal)),
      meanImmediatelyHarvestableOwnedResources: mean(
        placements.map(placement => placement.immediatelyHarvestableOwnedResources)
      ),
      meanLegalReachableNeutralExpansionTiles: mean(
        placements.map(placement => placement.legalReachableNeutralExpansionTiles)
      ),
      meanNearestNeutralCityManhattan: mean(
        placements.flatMap(placement =>
          placement.nearestNeutralCityManhattan === null
            ? []
            : [placement.nearestNeutralCityManhattan]
        )
      ),
      meanNearestOpponentCapitalManhattan: mean(
        placements.flatMap(placement =>
          placement.nearestOpponentCapitalManhattan === null
            ? []
            : [placement.nearestOpponentCapitalManhattan]
        )
      ),
      meanOwnedGrass: mean(placements.map(placement => placement.startingOwnedTerrain.grass)),
      meanOwnedForest: mean(placements.map(placement => placement.startingOwnedTerrain.forest)),
      meanOwnedMountain: mean(placements.map(placement => placement.startingOwnedTerrain.mountain)),
      meanOwnedWaterOrOcean: mean(
        placements.map(
          placement =>
            placement.startingOwnedTerrain.water + placement.startingOwnedTerrain.ocean
        )
      ),
    };
  });
}

function format(value: number | null, digits = 2): string {
  return value === null ? "n/a" : value.toFixed(digits);
}

function markdown(report: FairnessReport): string {
  const nominalOutcomeRows = report.summary.nominalSeatOutcomes.map(summary =>
    `| ${summary.group} | ${summary.appearances} | ${summary.wins} | ${format(summary.winRatePercent, 1)}% | ${format(summary.averageScore)} | ${format(summary.averageCities)} |`
  );
  const openingOutcomeRows = report.summary.openingTurnPositionOutcomes.map(summary =>
    `| ${summary.group} | ${summary.appearances} | ${summary.wins} | ${format(summary.winRatePercent, 1)}% | ${format(summary.averageScore)} | ${format(summary.averageCities)} |`
  );
  const placementRows = (summaries: PlacementSummary[]) => summaries.map(summary =>
    `| ${summary.group} | ${summary.rows} | ${summary.uniqueSeedPresetMaps} | ${format(summary.meanOwnedResources)} | ${format(summary.meanImmediatelyHarvestableOwnedResources)} | ${format(summary.meanLegalReachableNeutralExpansionTiles)} | ${format(summary.meanNearestNeutralCityManhattan)} | ${format(summary.meanNearestOpponentCapitalManhattan)} | ${format(summary.meanOwnedGrass)} | ${format(summary.meanOwnedForest)} | ${format(summary.meanOwnedMountain)} | ${format(summary.meanOwnedWaterOrOcean)} |`
  );
  const matrix = report.frozenMatrix;
  return [
    "# Nominal-Seat Fairness Audit",
    "",
    `- **Status:** ${report.status}`,
    `- **Baseline HEAD:** \`${report.source.headSha}\``,
    `- **Source dirty at run:** ${report.source.dirtyPaths.length ? `yes (${report.source.dirtyPaths.join(", ")})` : "no"}`,
    `- **Actual matches:** ${report.summary.observedMatches}/${report.summary.requestedMatches}; maximum ${matrix.actualMatchLimit}; ${matrix.turnLimit}-turn cap; ${matrix.processTimeLimitMs}ms total process cap.`,
    `- **Frozen sample:** ${matrix.seedBlocks} independent contiguous seeds (${matrix.independentSeeds[0]}–${matrix.independentSeeds.at(-1)}), ${matrix.presets.join(" + ")}, four mixed rosters, four cyclic nominal-seat rotations.`,
    `- **Initial fixture validation:** ${report.summary.legalSaveFixturesValidated}/${report.summary.observedMatches} regular GameStore initial saves were accepted through \`loadOnlineSnapshot\`; all-AI initial state snapshots are preserved separately as the actual observed setup.`,
    "",
    "## Interpretation",
    "",
    "Nominal seat is the engine roster slot used by map capital placement and staggered initial stars. Actual opening-turn position is `turnOrder.indexOf(nominalSeat)` after the seeded opening shuffle. They are intentionally reported as distinct variables. Outcome rows are actual all-AI matches; initial-placement rows are fresh GameStore observations before an AI callback. Repeated roster rotations balance tribe identity across nominal seats but do not make the 512 outcomes independent games.",
    "",
    "## Outcomes by nominal seat",
    "",
    "| Nominal seat | Tribe observations | Wins | Win rate | Mean final score | Mean final cities |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    ...nominalOutcomeRows,
    "",
    "## Outcomes by actual opening-turn position",
    "",
    "| Opening position | Tribe observations | Wins | Win rate | Mean final score | Mean final cities |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    ...openingOutcomeRows,
    "",
    "## Fresh start metrics by nominal seat",
    "",
    "| Nominal seat | Placements | Unique seed/preset maps | Owned resources | Immediately harvestable owned resources | Legal reachable neutral expansion tiles | Nearest neutral city (Manhattan) | Nearest opponent capital (Manhattan) | Owned grass | Owned forest | Owned mountain | Owned water/ocean |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...placementRows(report.summary.nominalSeatPlacements),
    "",
    "## Fresh start metrics by actual opening-turn position",
    "",
    "| Opening position | Placements | Unique seed/preset maps | Owned resources | Immediately harvestable owned resources | Legal reachable neutral expansion tiles | Nearest neutral city (Manhattan) | Nearest opponent capital (Manhattan) | Owned grass | Owned forest | Owned mountain | Owned water/ocean |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...placementRows(report.summary.openingTurnPositionPlacements),
    "",
    "## Frozen roster matrix",
    "",
    ...matrix.rosterFamilies.map(
      family => `- \`${family.id}\`: definition indices [${family.originalRoster.join(", ")}]`
    ),
    "",
    "## Artifacts",
    "",
    "- `fairness-audit.json`: complete versioned raw report, including every observed tribe, initial metric, seed, roster, outcome, and failure.",
    "- `fairness-audit.csv`: one actual match row per frozen scenario; nested observations are preserved as JSON columns.",
    "- `frozen-matrix.json`: exact seed/preset/roster/seat assignment before any match runs.",
    "- `initial-saves/*.json`: regular GameStore initial saves that were round-tripped through production snapshot validation.",
    "- `initial-ai-states/*.json`: exact all-AI initial GameStore states used by the observations; these intentionally retain `humanTribe: -1` and are evidence, not player-loadable saves.",
    "- `source-manifest.json`: baseline identity, dirty paths, and SHA-256 hashes of the runner and core source consulted.",
    "",
    "## Limitations",
    "",
    ...report.limitations.map(item => `- ${item}`),
    "",
  ].join("\n");
}

const outDir = outputDir();
const sourceSha = git(["rev-parse", "HEAD"]);
const dirtyPaths = git(["status", "--porcelain"])
  .split("\n")
  .filter(Boolean)
  .map(line => line.slice(3));
const hashes = Object.fromEntries(SOURCE_FILES.map(path => [path, sourceHash(path)]));
const runtime = installScopedHeadlessRuntime();
const startedAt = Date.now();
const rows: AuditRow[] = [];

try {
  const [{ game }, { TRIBE_DEFS }] = await Promise.all([
    import("../client/src/game/core/state"),
    import("../client/src/game/core/types"),
  ]);
  const rosterFamilies = mixedFourTribeFamilies(TRIBE_DEFS.length);
  const scenarios = buildPairedScenarioMatrix({
    seedBase: FAIRNESS_SEED_BASE,
    blocks: FAIRNESS_SEED_BLOCKS,
    presets: FAIRNESS_PRESETS,
    rosterFamilies,
  });
  if (scenarios.length !== FAIRNESS_EXPECTED_MATCHES) {
    throw new Error(
      `Frozen matrix created ${scenarios.length} scenarios, expected ${FAIRNESS_EXPECTED_MATCHES}.`
    );
  }
  if (scenarios.length > FAIRNESS_EXPECTED_MATCHES) {
    throw new Error("Refusing to exceed the declared 512-match audit limit.");
  }

  const saveDir = resolve(outDir, "initial-saves");
  const aiStateDir = resolve(outDir, "initial-ai-states");
  await Promise.all([mkdir(saveDir, { recursive: true }), mkdir(aiStateDir, { recursive: true })]);
  const matrixPath = resolve(outDir, "frozen-matrix.json");
  const matrixForArtifact = {
    version: 1,
    actualMatchLimit: FAIRNESS_EXPECTED_MATCHES,
    turnLimit: FAIRNESS_TURN_CAP,
    seedBase: FAIRNESS_SEED_BASE,
    seedBlocks: FAIRNESS_SEED_BLOCKS,
    presets: FAIRNESS_PRESETS,
    rosterFamilies,
    rotationsPerRoster: ROTATIONS_PER_ROSTER,
    scenarios,
  };
  await writeFile(matrixPath, `${JSON.stringify(matrixForArtifact, null, 2)}\n`, "utf8");

  for (const scenario of scenarios) {
    const matchStarted = Date.now();
    const failures: AuditFailure[] = [];
    const preset = scenarioPreset(scenario);
    const legalInitialSavePath = resolve(saveDir, `${scenario.id}.json`);
    const initialAiStatePath = resolve(aiStateDir, `${scenario.id}.json`);
    let legalSaveValidated = false;
    let mapStateSha256 = "";
    let openingTurnOrderNominalSeats: number[] = [];
    let initialPlacements: InitialPlacementMetrics[] = [];
    let callbackCap = 0;
    let callbacksDrained = 0;

    try {
      // Produce a real, player-loadable GameStore initial save for this exact
      // seed/preset/roster. Map generation and seeded turn order are unchanged
      // by selecting a valid human slot.
      runtime.clear();
      runtime.setRandomSeed(scenario.randomSeed);
      game.newGame({
        size: BOARD_SIZE,
        humanTribe: 0,
        difficulty: DIFFICULTY,
        seed: scenario.worldSeed,
        preset,
        roster: scenario.rosterRemappedIndices,
      });
      const legalSave = game.serializeState();
      const legalSaveDigest = mapStateDigest(game.state);
      await writeFile(legalInitialSavePath, `${legalSave}\n`, "utf8");
      legalSaveValidated = game.loadOnlineSnapshot(legalSave, 0);
      if (!legalSaveValidated) {
        failures.push({
          kind: "save_fixture",
          detail: "The regular initial GameStore save was rejected by loadOnlineSnapshot.",
        });
      }
      runtime.clear();

      // Make the actual measured all-AI setup separately. No test action is
      // injected; only GameStore's scheduled AI callbacks are drained below.
      runtime.setRandomSeed(scenario.randomSeed);
      game.newGame({
        size: BOARD_SIZE,
        humanTribe: NO_HUMAN,
        difficulty: DIFFICULTY,
        seed: scenario.worldSeed,
        preset,
        roster: scenario.rosterRemappedIndices,
      });
      game.state.maxTurns = FAIRNESS_TURN_CAP;
      mapStateSha256 = mapStateDigest(game.state);
      if (legalSaveDigest !== mapStateSha256) {
        failures.push({
          kind: "save_fixture",
          detail: "Regular initial save and all-AI observation differed in generated map/capital state.",
        });
      }
      openingTurnOrderNominalSeats = [...(game.state.turnOrder ?? [])];
      initialPlacements = measureInitialPlacements(game.state);
      await writeFile(
        initialAiStatePath,
        `${game.serializeState()}\n`,
        "utf8"
      );
      const setupFailure = validateRealCoreState(game.state);
      if (setupFailure) failures.push({ kind: "invariant", detail: `setup: ${setupFailure}` });

      callbackCap = Math.max(
        100,
        FAIRNESS_TURN_CAP * ROTATIONS_PER_ROSTER * 8 + 32
      );
      while (
        game.state.phase === "playing" &&
        callbacksDrained < callbackCap &&
        Date.now() - startedAt < PROCESS_TIME_LIMIT_MS
      ) {
        const callback = runtime.pending.shift();
        if (!callback) {
          failures.push({
            kind: "stalled_callback_queue",
            detail: "GameStore callback queue emptied while the match was still playing.",
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
      if (game.state.phase === "playing" && Date.now() - startedAt >= PROCESS_TIME_LIMIT_MS) {
        failures.push({
          kind: "deadline",
          detail: `Process audit deadline ${PROCESS_TIME_LIMIT_MS}ms reached while the match was still playing.`,
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
        detail: error instanceof Error ? (error.stack ?? error.message) : String(error),
        callback: callbacksDrained,
      });
    }

    const state = game.state;
    const tribes: TribeOutcome[] = state.tribes.map(tribe => ({
      nominalSeat: tribe.index,
      openingTurnPosition: openingTurnOrderNominalSeats.indexOf(tribe.index),
      definitionIndex: tribe.defIndex,
      name: tribe.name,
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
      preset,
      rosterId: scenario.rosterId,
      rosterOriginalIndices: scenario.rosterOriginalIndices,
      rosterRemappedIndices: scenario.rosterRemappedIndices,
      rotation: scenario.rotation,
      initialAiStatePath: relative(outDir, initialAiStatePath),
      legalInitialSavePath: relative(outDir, legalInitialSavePath),
      legalSaveValidated,
      mapStateSha256,
      openingTurnOrderNominalSeats,
      initialPlacements,
      callbackCap,
      callbacksDrained,
      durationMs: Date.now() - matchStarted,
      phase: state.phase,
      turnsReached: state.turn,
      turnCapReached: state.turn >= FAIRNESS_TURN_CAP,
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
      `[${rows.length}/${scenarios.length}] ${scenario.id} -> ${state.phase} turn=${state.turn}/${FAIRNESS_TURN_CAP} winner=${winner?.name ?? "-"} callbacks=${callbacksDrained} failures=${failures.length}`
    );
    if (Date.now() - startedAt >= PROCESS_TIME_LIMIT_MS) break;
  }

  const failureRows = rows.filter(row => row.failures.length > 0).length;
  const report: FairnessReport = {
    version: 1,
    lane: "nominal_seat_fairness_audit",
    status:
      failureRows > 0 || rows.length !== FAIRNESS_EXPECTED_MATCHES
        ? "completed_with_failures"
        : "completed",
    generatedAt: new Date().toISOString(),
    source: { headSha: sourceSha, dirtyPaths, hashes },
    frozenMatrix: {
      expectedMatches: FAIRNESS_EXPECTED_MATCHES,
      actualMatchLimit: FAIRNESS_EXPECTED_MATCHES,
      turnLimit: FAIRNESS_TURN_CAP,
      seedBase: FAIRNESS_SEED_BASE,
      seedBlocks: FAIRNESS_SEED_BLOCKS,
      independentSeeds: Array.from(
        { length: FAIRNESS_SEED_BLOCKS },
        (_, offset) => FAIRNESS_SEED_BASE + offset
      ),
      presets: FAIRNESS_PRESETS,
      rosterFamilies: rosterFamilies.map(family => ({
        id: family.id,
        originalRoster: family.originalRoster,
      })),
      rotationsPerRoster: ROTATIONS_PER_ROSTER,
      matrixPath: "frozen-matrix.json",
      allAiSetup: "newGame({ humanTribe: -1 })",
      legalSaveSetup: "newGame({ humanTribe: 0 })",
      processTimeLimitMs: PROCESS_TIME_LIMIT_MS,
    },
    rows,
    summary: {
      requestedMatches: FAIRNESS_EXPECTED_MATCHES,
      observedMatches: rows.length,
      failureRows,
      gameoverMatches: rows.filter(row => row.outcome === "gameover").length,
      incompleteMatches: rows.filter(row => row.outcome === "incomplete").length,
      legalSaveFixturesValidated: rows.filter(row => row.legalSaveValidated).length,
      totalCallbackCount: rows.reduce((sum, row) => sum + row.callbacksDrained, 0),
      nominalSeatOutcomes: outcomeSummary(rows, "nominalSeat"),
      openingTurnPositionOutcomes: outcomeSummary(rows, "openingTurnPosition"),
      nominalSeatPlacements: placementSummary(rows, "nominalSeat"),
      openingTurnPositionPlacements: placementSummary(rows, "openingTurnPosition"),
    },
    limitations: [
      "This is a finite, normal-difficulty, 11×11, four-tribe, all-AI sample. It is evidence for triage, not proof of player-facing fairness or a sufficient basis for a faction-stat change.",
      "The 512 runs consist of 32 independent seed/preset worlds crossed with four rosters and four cyclic assignments. Rotated outcomes share a world and diverge once roster identities influence AI decisions; they are not 512 independent map draws.",
      "Initial owned-resource and terrain counts are directly generated-map observations. Legal reachable expansion tiles use the shipped reachableTiles predicate for the real initial units, and therefore correctly retain legitimate tribe movement differences while cyclic rotation balances those differences across seats.",
      "Nearest-city and nearest-opponent figures are Manhattan distance from the capital, not a claim of an unobstructed movement path. The raw legal reachable counts are reported separately.",
      "The all-AI setup deliberately uses humanTribe:-1 and so cannot pass the production snapshot validator, which requires a valid human slot. Matching regular user-loadable initial saves are preserved and validated separately without substituting them for the AI observations.",
      "No human decisions, accessibility, renderer, browser/device performance, online state, resumption, entitlement, or physical iPhone behavior is exercised here.",
      "Any row with callback, deadline, queue, exception, invariant, or save-fixture failures remains in the raw report and must not be interpreted as a normal completed outcome.",
    ],
  };

  const jsonPath = resolve(outDir, "fairness-audit.json");
  const csvPath = resolve(outDir, "fairness-audit.csv");
  const reportPath = resolve(outDir, "REPORT.md");
  const sourceManifestPath = resolve(outDir, "source-manifest.json");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(csvPath, rowsToCsv(rows), "utf8");
  await writeFile(reportPath, markdown(report), "utf8");
  await writeFile(
    sourceManifestPath,
    `${JSON.stringify({ headSha: sourceSha, dirtyPaths, hashes }, null, 2)}\n`,
    "utf8"
  );
  console.log(
    `Fairness audit ${report.status}: ${rows.length}/${FAIRNESS_EXPECTED_MATCHES} actual matches -> ${jsonPath}`
  );
  if (report.status === "completed_with_failures") process.exitCode = 1;
} finally {
  runtime.restore();
}
