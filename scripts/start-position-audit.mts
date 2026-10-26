// Frozen, externally evidenced start-position audit runner.
//
// This harness is deliberately approval-gated. It refuses to create observed
// sample output unless the parent independently reviewed the frozen external
// protocol and explicitly supplies START_POSITION_AUDIT_APPROVED.
//
// It changes no gameplay, map generation, AI, statistics, rules, saves,
// online code, or naval behavior. It only instantiates ordinary games and
// preserves raw observations outside the source worktree.
//
// Proposed command after independent approval only:
//   START_POSITION_AUDIT_APPROVED=approved-by-parent \
//   START_POSITION_AUDIT_PROTOCOL=/home/ubuntu/sunder-team/roster-fairness-20261025/fairness/START-POSITION-AUDIT-PROTOCOL.json \
//   START_POSITION_AUDIT_OUT=/home/ubuntu/sunder-team/roster-fairness-20261025/fairness/observed-start-position-audit-r1 \
//   ./node_modules/.bin/tsx scripts/start-position-audit.mts

import { execFileSync } from "node:child_process";
import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { TRIBE_DEFS } from "../client/src/game/core/types";
import { game } from "../client/src/game/core/state";
import {
  START_POSITION_APPROVAL_VALUE,
  START_POSITION_EXPECTED_MATCHES,
  START_POSITION_PROCESS_CAP_MS,
  START_POSITION_TURN_CAP,
  buildFrozenStartPositionScenarioMatrix,
  frozenProtocolSha256,
  mapLayoutFingerprint,
  measureStartPositions,
  readStartPositionProtocol,
  terrainFingerprint,
  type StartPositionProtocol,
  type StartPositionScenario,
} from "./lib/startPositionAudit";
import { installScopedHeadlessRuntime } from "./lib/balancePaired";

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
  win: boolean;
}

interface AuditRow {
  scenarioId: string;
  worldClusterId: string;
  seedBlockId: string;
  worldSeed: number;
  randomSeed: number;
  preset: string;
  rosterId: string;
  rosterOriginalIndices: number[];
  rosterRemappedIndices: number[];
  nominalRotation: number;
  initialAiStatePath: string;
  legalInitialSavePath: string;
  legalSaveValidated: boolean;
  terrainFingerprint: string;
  mapLayoutFingerprint: string;
  openingTurnOrderNominalSeats: number[];
  initialPlacements: ReturnType<typeof measureStartPositions>;
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

interface SourceManifest {
  baselineRequired: string;
  headSha: string;
  dirtyPaths: string[];
  hashes: Record<string, string>;
  protocolPath: string;
  protocolSha256: string;
}

interface RegressionRow {
  clusterId: string;
  nominalSeat: number;
  openingTurnPosition: number;
  preset: string;
  rosterId: string;
  definitionIndex: number;
  win: number;
}

interface ContrastInference {
  leftNominalSeat: number;
  rightNominalSeat: number;
  estimatePercentagePoints: number;
  ci95PercentagePoints: [number, number] | null;
  bootstrapReplicates: number;
  triageSignal: boolean;
}

interface PrimaryInference {
  status: "estimated" | "inconclusive";
  reason: string;
  eligibleWorldClusters: number;
  eligibleMatchRows: number;
  eligibleTribeRows: number;
  standardizedNominalSeatWinPercent: Array<{
    nominalSeat: number;
    winPercent: number;
  }>;
  contrasts: ContrastInference[];
}

interface AuditReport {
  version: 1;
  lane: "start_position_access_audit";
  protocol: {
    id: string;
    version: number;
    path: string;
    sha256: string;
    frozenStatus: string;
  };
  status: "completed" | "completed_with_failures";
  generatedAt: string;
  source: SourceManifest;
  frozenMatrix: {
    expectedMatches: number;
    actualMatchLimit: number;
    turnLimit: number;
    processTimeLimitMs: number;
    independentWorldClusters: number;
    uniqueRngSeedsPlanned: number;
    matrixPath: string;
    allAiSetup: "newGame({ humanTribe: -1 })";
    legalSaveSetup: "newGame({ humanTribe: 0 })";
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
    uniqueRngSeedsObserved: number;
    uniqueSeedPresetWorldsObserved: number;
    uniqueTerrainFingerprintsObserved: number;
    uniqueMapLayoutFingerprintsObserved: number;
    primaryInference: PrimaryInference;
  };
  limitations: string[];
}

const SOURCE_FILES = [
  "scripts/start-position-audit.mts",
  "scripts/lib/startPositionAudit.ts",
  "scripts/lib/balancePaired.ts",
  "client/src/game/core/rules.ts",
  "client/src/game/core/state.ts",
  "client/src/game/core/types.ts",
  "client/src/game/core/mapgen.ts",
] as const;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sourceHash(path: string): string {
  return execFileSync("sha256sum", [path], { encoding: "utf8" })
    .trim()
    .split(/\s+/)[0];
}

function protocolPath(): string {
  const supplied = process.env.START_POSITION_AUDIT_PROTOCOL;
  if (!supplied) {
    throw new Error(
      "START_POSITION_AUDIT_PROTOCOL is required and must name the independently reviewable external frozen protocol."
    );
  }
  return resolve(supplied);
}

function outputDir(protocol: StartPositionProtocol): string {
  const supplied = process.env.START_POSITION_AUDIT_OUT;
  if (!supplied) {
    throw new Error(
      "START_POSITION_AUDIT_OUT is required so all raw evidence remains outside the source worktree."
    );
  }
  const out = resolve(supplied);
  const required = resolve(protocol.evidenceRetention.externalOutputRequired);
  if (out !== required) {
    throw new Error(
      `START_POSITION_AUDIT_OUT must equal the protocol's exact external path: ${required}`
    );
  }
  const worktree = resolve(git(["rev-parse", "--show-toplevel"]));
  const fromWorktree = relative(worktree, out);
  if (
    fromWorktree === "" ||
    (!fromWorktree.startsWith("..") && !fromWorktree.includes("../"))
  ) {
    throw new Error(
      "START_POSITION_AUDIT_OUT must be outside the source worktree."
    );
  }
  return out;
}

async function assertOutputUnused(outDir: string): Promise<void> {
  try {
    const existing = await stat(outDir);
    if (existing.isDirectory()) {
      throw new Error(
        `Refusing to append, replace, or selectively rerun frozen evidence at ${outDir}. Choose a new protocol for a new sample.`
      );
    }
    throw new Error(
      `START_POSITION_AUDIT_OUT exists and is not a directory: ${outDir}`
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    throw error;
  }
}

function approvalGate(): void {
  if (
    process.env.START_POSITION_AUDIT_APPROVED !== START_POSITION_APPROVAL_VALUE
  ) {
    throw new Error(
      "Observed sample is blocked pending independent parent review. Do not run frozen scenarios; START_POSITION_AUDIT_APPROVED must equal approved-by-parent."
    );
  }
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

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: AuditRow[]): string {
  const headers = [
    "scenario_id",
    "world_cluster_id",
    "seed_block_id",
    "world_seed",
    "random_seed",
    "preset",
    "roster_id",
    "roster_original_indices",
    "roster_remapped_indices",
    "nominal_rotation",
    "initial_ai_state_path",
    "legal_initial_save_path",
    "legal_save_validated",
    "terrain_fingerprint",
    "map_layout_fingerprint",
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
      row.worldClusterId,
      row.seedBlockId,
      row.worldSeed,
      row.randomSeed,
      row.preset,
      row.rosterId,
      JSON.stringify(row.rosterOriginalIndices),
      JSON.stringify(row.rosterRemappedIndices),
      row.nominalRotation,
      row.initialAiStatePath,
      row.legalInitialSavePath,
      row.legalSaveValidated,
      row.terrainFingerprint,
      row.mapLayoutFingerprint,
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

function designFor(row: RegressionRow): number[] {
  const out = [1];
  for (let seat = 1; seat < 4; seat += 1)
    out.push(row.nominalSeat === seat ? 1 : 0);
  for (let position = 1; position < 4; position += 1) {
    out.push(row.openingTurnPosition === position ? 1 : 0);
  }
  out.push(row.preset === "archipelago" ? 1 : 0);
  for (const roster of ["mixed-02", "mixed-03", "mixed-04"]) {
    out.push(row.rosterId === roster ? 1 : 0);
  }
  for (
    let definitionIndex = 1;
    definitionIndex < TRIBE_DEFS.length;
    definitionIndex += 1
  ) {
    out.push(row.definitionIndex === definitionIndex ? 1 : 0);
  }
  return out;
}

function zeroMatrix(size: number): number[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
}

function zeroVector(size: number): number[] {
  return Array.from({ length: size }, () => 0);
}

function addOuter(
  target: number[][],
  values: readonly number[],
  multiplier = 1
): void {
  for (let row = 0; row < values.length; row += 1) {
    for (let column = 0; column < values.length; column += 1) {
      target[row][column] += values[row] * values[column] * multiplier;
    }
  }
}

function addScaledMatrix(
  target: number[][],
  source: number[][],
  multiplier = 1
): void {
  for (let row = 0; row < target.length; row += 1) {
    for (let column = 0; column < target.length; column += 1) {
      target[row][column] += source[row][column] * multiplier;
    }
  }
}

function addScaledVector(
  target: number[],
  source: number[],
  multiplier = 1
): void {
  for (let index = 0; index < target.length; index += 1) {
    target[index] += source[index] * multiplier;
  }
}

function solveLinearSystem(
  matrix: number[][],
  vector: number[]
): number[] | null {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let pivot = 0; pivot < n; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot]))
        best = row;
    }
    if (Math.abs(augmented[best][pivot]) < 1e-10) return null;
    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    for (let column = pivot; column <= n; column += 1) {
      augmented[pivot][column] /= divisor;
    }
    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      if (factor === 0) continue;
      for (let column = pivot; column <= n; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }
  return augmented.map(row => row[n]);
}

function quantile(sorted: number[], probability: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function primaryInference(rows: AuditRow[]): PrimaryInference {
  const regressionRows: RegressionRow[] = rows.flatMap(row => {
    if (row.outcome !== "gameover" || row.failures.length > 0) return [];
    return row.tribes.flatMap(tribe =>
      tribe.openingTurnPosition === null
        ? []
        : [
            {
              clusterId: row.worldClusterId,
              nominalSeat: tribe.nominalSeat,
              openingTurnPosition: tribe.openingTurnPosition,
              preset: row.preset,
              rosterId: row.rosterId,
              definitionIndex: tribe.definitionIndex,
              win: tribe.win ? 1 : 0,
            },
          ]
    );
  });
  const clusters = [
    ...new Set(regressionRows.map(row => row.clusterId)),
  ].sort();
  const noInference = (reason: string): PrimaryInference => ({
    status: "inconclusive",
    reason,
    eligibleWorldClusters: clusters.length,
    eligibleMatchRows: regressionRows.length / 4,
    eligibleTribeRows: regressionRows.length,
    standardizedNominalSeatWinPercent: [],
    contrasts: [],
  });
  if (clusters.length < 24) {
    return noInference(
      "Fewer than 24 independent world clusters have eligible gameover rows; the predeclared primary inference is inconclusive."
    );
  }
  const featureCount = designFor(regressionRows[0]).length;
  const perCluster = new Map<string, { xtx: number[][]; xty: number[] }>();
  for (const cluster of clusters) {
    perCluster.set(cluster, {
      xtx: zeroMatrix(featureCount),
      xty: zeroVector(featureCount),
    });
  }
  for (const row of regressionRows) {
    const design = designFor(row);
    const aggregate = perCluster.get(row.clusterId)!;
    addOuter(aggregate.xtx, design);
    for (let index = 0; index < featureCount; index += 1) {
      aggregate.xty[index] += design[index] * row.win;
    }
  }
  const allXtx = zeroMatrix(featureCount);
  const allXty = zeroVector(featureCount);
  for (const cluster of clusters) {
    const aggregate = perCluster.get(cluster)!;
    addScaledMatrix(allXtx, aggregate.xtx);
    addScaledVector(allXty, aggregate.xty);
  }
  const coefficients = solveLinearSystem(allXtx, allXty);
  if (!coefficients)
    return noInference(
      "Prespecified adjustment model is singular; primary inference is inconclusive."
    );

  const standardizedNominalSeatWinPercent = Array.from(
    { length: 4 },
    (_, seat) => {
      const probabilities = regressionRows.map(row => {
        const design = designFor({ ...row, nominalSeat: seat });
        return design.reduce(
          (sum, value, index) => sum + value * coefficients[index],
          0
        );
      });
      return {
        nominalSeat: seat,
        winPercent:
          (probabilities.reduce((sum, probability) => sum + probability, 0) /
            probabilities.length) *
          100,
      };
    }
  );

  const contrasts = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ] as const;
  const pointContrast = (
    left: number,
    right: number,
    betas: number[]
  ): number => {
    const nominalCoefficient = (seat: number) => (seat === 0 ? 0 : betas[seat]);
    return nominalCoefficient(right) - nominalCoefficient(left);
  };
  const bootstrapValues = new Map<string, number[]>(
    contrasts.map(([left, right]) => [`${left}-${right}`, []])
  );
  const random = seededRandom(441_009);
  const requestedReplicates = 10_000;
  for (let replicate = 0; replicate < requestedReplicates; replicate += 1) {
    const xtx = zeroMatrix(featureCount);
    const xty = zeroVector(featureCount);
    for (let draw = 0; draw < clusters.length; draw += 1) {
      const cluster = clusters[Math.floor(random() * clusters.length)];
      const aggregate = perCluster.get(cluster)!;
      addScaledMatrix(xtx, aggregate.xtx);
      addScaledVector(xty, aggregate.xty);
    }
    const bootstrapCoefficients = solveLinearSystem(xtx, xty);
    if (!bootstrapCoefficients) continue;
    for (const [left, right] of contrasts) {
      bootstrapValues
        .get(`${left}-${right}`)!
        .push(pointContrast(left, right, bootstrapCoefficients));
    }
  }
  const inferredContrasts = contrasts.map(([left, right]) => {
    const values = bootstrapValues.get(`${left}-${right}`)!;
    values.sort((a, b) => a - b);
    const low = quantile(values, 0.025);
    const high = quantile(values, 0.975);
    const estimate = pointContrast(left, right, coefficients);
    const ci =
      low === null || high === null
        ? null
        : ([low * 100, high * 100] as [number, number]);
    const estimatePercentagePoints = estimate * 100;
    return {
      leftNominalSeat: left,
      rightNominalSeat: right,
      estimatePercentagePoints,
      ci95PercentagePoints: ci,
      bootstrapReplicates: values.length,
      triageSignal:
        ci !== null &&
        Math.abs(estimatePercentagePoints) >= 10 &&
        ((estimatePercentagePoints > 0 && ci[0] > 5) ||
          (estimatePercentagePoints < 0 && ci[1] < -5)),
    };
  });
  return {
    status: "estimated",
    reason:
      "Cluster-bootstrap adjusted descriptive inference. A triage signal remains a diagnosis trigger, not a causal finding or authorization for a gameplay change.",
    eligibleWorldClusters: clusters.length,
    eligibleMatchRows: regressionRows.length / 4,
    eligibleTribeRows: regressionRows.length,
    standardizedNominalSeatWinPercent,
    contrasts: inferredContrasts,
  };
}

function format(value: number | null, digits = 2): string {
  return value === null ? "n/a" : value.toFixed(digits);
}

function markdown(report: AuditReport): string {
  const inference = report.summary.primaryInference;
  const contrastRows = inference.contrasts.map(contrast => {
    const ci = contrast.ci95PercentagePoints;
    return `| ${contrast.leftNominalSeat} → ${contrast.rightNominalSeat} | ${format(contrast.estimatePercentagePoints)} pp | ${ci ? `${format(ci[0])} to ${format(ci[1])} pp` : "n/a"} | ${contrast.bootstrapReplicates} | ${contrast.triageSignal ? "yes — diagnosis only" : "no"} |`;
  });
  return [
    "# Frozen start-position access audit",
    "",
    `- **Status:** ${report.status}`,
    `- **Protocol:** \`${report.protocol.id}\` v${report.protocol.version}, SHA-256 \`${report.protocol.sha256}\``,
    `- **Source HEAD:** \`${report.source.headSha}\`; required baseline \`${report.source.baselineRequired}\``,
    `- **Actual matches:** ${report.summary.observedMatches}/${report.summary.requestedMatches}; maximum ${report.frozenMatrix.actualMatchLimit}; ${report.frozenMatrix.turnLimit}-turn cap; ${report.frozenMatrix.processTimeLimitMs}ms total process cap.`,
    `- **Independent-world denominator:** ${report.summary.uniqueSeedPresetWorldsObserved} observed seed/preset worlds; ${report.summary.uniqueRngSeedsObserved} unique RNG seeds; ${report.summary.uniqueTerrainFingerprintsObserved} unique terrain fingerprints; ${report.summary.uniqueMapLayoutFingerprintsObserved} unique full-map-layout fingerprints. Rotations are not independent maps.`,
    `- **Save separation:** ${report.summary.legalSaveFixturesValidated}/${report.summary.observedMatches} legal \`humanTribe:0\` initial saves validated; all-AI \`humanTribe:-1\` snapshots remain separate non-user-loadable evidence.`,
    "",
    "## Primary outcome and predeclared decision rule",
    "",
    `- **Inference status:** ${inference.status}; ${inference.reason}`,
    `- **Eligible independent world clusters:** ${inference.eligibleWorldClusters}; eligible match rows ${format(inference.eligibleMatchRows, 0)}; eligible tribe rows ${inference.eligibleTribeRows}.`,
    "- The adjusted linear-probability model controls nominal seat, actual opening-turn position, preset, mixed roster, and tribe definition. Its 95% percentile intervals resample whole seed/preset world clusters (10,000 deterministic bootstrap replicates), never rotated games individually.",
    "- A triage signal requires an absolute estimate of at least 10 percentage points and a 95% CI wholly beyond the −5 to +5 pp practical-equivalence band in the observed direction. A signal does not authorize a gameplay, map-generation, star, or tribe-stat change.",
    "",
    "### Standardized nominal-seat win estimates",
    "",
    "| Nominal seat | Adjusted win estimate |",
    "| ---: | ---: |",
    ...inference.standardizedNominalSeatWinPercent.map(
      estimate =>
        `| ${estimate.nominalSeat} | ${format(estimate.winPercent)}% |`
    ),
    "",
    "### Nominal-seat contrasts",
    "",
    "| Contrast (right − left) | Estimate | Cluster-bootstrap 95% CI | Valid bootstrap reps | Triage signal |",
    "| --- | ---: | --- | ---: | --- |",
    ...(contrastRows.length > 0
      ? contrastRows
      : ["| n/a | n/a | n/a | 0 | no |"]),
    "",
    "## Interpretation constraints",
    "",
    "Nominal seat (capital/staggered-star slot) and actual opening-turn position (`turnOrder.indexOf(nominalSeat)`) are distinct recorded variables. Resource counts and lawful accessibility are initial-state diagnostics. Manhattan columns, where retained in raw access targets, are geometric comparators only—not movement paths.",
    "",
    "The lawful multi-turn graph refreshes each actual initial unit in an otherwise frozen generated state and asks the shipped `reachableTiles` predicate for every edge. It retains actual terrain, ports, tech, passives, unit type, unit blockers, and storm behavior. Null legal distance is reported as inaccessible and never converted to Manhattan distance. A chokepoint is a non-origin/non-target transit tile whose removal disconnects a previously reachable target in that graph; it does not claim an AI or player will traverse it.",
    "",
    "## Artifacts",
    "",
    "- `start-position-audit.json`: complete versioned raw report, including every attempted row, failure, outcome, fingerprint, and initial measurement.",
    "- `start-position-audit.csv`: one attempted match row; nested observations remain JSON columns.",
    "- `raw-rows.ndjson`: durable append-only per-attempt checkpoints written as each row completes.",
    "- `frozen-matrix.json`: exact external predeclared matrix written before match execution.",
    "- `initial-saves/*.json`: legal ordinary initial saves validated through `loadOnlineSnapshot`.",
    "- `initial-ai-states/*.json`: exact all-AI initial states used for outcomes; evidence only, not claimed user-loadable.",
    "- `source-manifest.json`: source and protocol identity plus consulted-file hashes.",
    "",
    "## Limitations",
    "",
    ...report.limitations.map(item => `- ${item}`),
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  approvalGate();
  const frozenProtocolPath = protocolPath();
  const protocolSha256 = frozenProtocolSha256(frozenProtocolPath);
  const protocol = readStartPositionProtocol(frozenProtocolPath);
  const outDir = outputDir(protocol);
  await assertOutputUnused(outDir);
  const headSha = git(["rev-parse", "HEAD"]);
  if (headSha !== protocol.sourceIdentityAtFreeze.requiredBaselineCommit) {
    throw new Error(
      `HEAD ${headSha} does not equal the protocol-required baseline ${protocol.sourceIdentityAtFreeze.requiredBaselineCommit}. Freeze a new protocol rather than mixing source identities.`
    );
  }
  if (TRIBE_DEFS.length !== 8) {
    throw new Error(
      `Frozen mixed roster protocol expects exactly 8 tribe definitions; found ${TRIBE_DEFS.length}.`
    );
  }
  const scenarios = buildFrozenStartPositionScenarioMatrix(protocol);
  if (scenarios.length !== START_POSITION_EXPECTED_MATCHES) {
    throw new Error(
      `Refusing matrix of ${scenarios.length}; protocol cap is ${START_POSITION_EXPECTED_MATCHES}.`
    );
  }

  const dirtyPaths = git(["status", "--porcelain"])
    .split("\n")
    .filter(Boolean)
    .map(line => line.slice(3));
  const source: SourceManifest = {
    baselineRequired: protocol.sourceIdentityAtFreeze.requiredBaselineCommit,
    headSha,
    dirtyPaths,
    hashes: Object.fromEntries(
      SOURCE_FILES.map(path => [path, sourceHash(path)])
    ),
    protocolPath: frozenProtocolPath,
    protocolSha256,
  };

  await mkdir(outDir, { recursive: false });
  const saveDir = resolve(outDir, "initial-saves");
  const aiStateDir = resolve(outDir, "initial-ai-states");
  await Promise.all([
    mkdir(saveDir, { recursive: true }),
    mkdir(aiStateDir, { recursive: true }),
  ]);
  await writeFile(
    resolve(outDir, "frozen-matrix.json"),
    `${JSON.stringify(
      {
        protocolId: protocol.protocolId,
        protocolSha256,
        generatedBeforeMatchExecution: true,
        scenarios,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    resolve(outDir, "source-manifest.json"),
    `${JSON.stringify(source, null, 2)}\n`,
    "utf8"
  );
  const rawRowsPath = resolve(outDir, "raw-rows.ndjson");
  await writeFile(rawRowsPath, "", { flag: "wx" });

  const runtime = installScopedHeadlessRuntime();
  const startedAt = Date.now();
  const rows: AuditRow[] = [];
  try {
    for (const scenario of scenarios) {
      const row = await runScenario({
        scenario,
        outDir,
        saveDir,
        aiStateDir,
        runtime,
        startedAt,
        protocol,
      });
      rows.push(row);
      await appendFile(rawRowsPath, `${JSON.stringify(row)}\n`, "utf8");
      console.error(
        `[${rows.length}/${scenarios.length}] ${scenario.id} -> ${row.phase} turn=${row.turnsReached}/${START_POSITION_TURN_CAP} winner=${row.winnerName ?? "-"} callbacks=${row.callbacksDrained} failures=${row.failures.length}`
      );
      if (Date.now() - startedAt >= START_POSITION_PROCESS_CAP_MS) break;
    }
  } finally {
    runtime.restore();
  }

  const failureRows = rows.filter(row => row.failures.length > 0).length;
  const report: AuditReport = {
    version: 1,
    lane: "start_position_access_audit",
    protocol: {
      id: protocol.protocolId,
      version: protocol.protocolVersion,
      path: frozenProtocolPath,
      sha256: protocolSha256,
      frozenStatus: protocol.status,
    },
    status:
      failureRows > 0 || rows.length !== START_POSITION_EXPECTED_MATCHES
        ? "completed_with_failures"
        : "completed",
    generatedAt: new Date().toISOString(),
    source,
    frozenMatrix: {
      expectedMatches: START_POSITION_EXPECTED_MATCHES,
      actualMatchLimit: START_POSITION_EXPECTED_MATCHES,
      turnLimit: START_POSITION_TURN_CAP,
      processTimeLimitMs: START_POSITION_PROCESS_CAP_MS,
      independentWorldClusters: 32,
      uniqueRngSeedsPlanned: 32,
      matrixPath: "frozen-matrix.json",
      allAiSetup: "newGame({ humanTribe: -1 })",
      legalSaveSetup: "newGame({ humanTribe: 0 })",
    },
    rows,
    summary: {
      requestedMatches: START_POSITION_EXPECTED_MATCHES,
      observedMatches: rows.length,
      failureRows,
      gameoverMatches: rows.filter(row => row.outcome === "gameover").length,
      incompleteMatches: rows.filter(row => row.outcome === "incomplete")
        .length,
      legalSaveFixturesValidated: rows.filter(row => row.legalSaveValidated)
        .length,
      totalCallbackCount: rows.reduce(
        (sum, row) => sum + row.callbacksDrained,
        0
      ),
      uniqueRngSeedsObserved: new Set(rows.map(row => row.randomSeed)).size,
      uniqueSeedPresetWorldsObserved: new Set(
        rows.map(row => row.worldClusterId)
      ).size,
      uniqueTerrainFingerprintsObserved: new Set(
        rows.map(row => row.terrainFingerprint)
      ).size,
      uniqueMapLayoutFingerprintsObserved: new Set(
        rows.map(row => row.mapLayoutFingerprint)
      ).size,
      primaryInference: primaryInference(rows),
    },
    limitations: [
      "This finite 13×13, normal-difficulty, four-tribe all-AI sample is diagnostic evidence, not proof of player-facing fairness or a sufficient basis for a faction/stat/map change.",
      "The 512 outcomes are 32 independent seed/preset world clusters crossed with four mixed rosters and four cyclic nominal-seat rotations. Rotations are repeated within-world observations, not independent maps.",
      "Nominal seat and actual opening-turn position are separate variables. The model controls both but remains descriptive; it does not identify a causal tribe, seat, or order effect.",
      "Legal access is a frozen-initial-state, single-unit diagnostic that reuses the shipped reachableTiles predicate. It is not a forecast of future unit positions, player choices, AI policy, combat, visibility, or multi-unit coordination.",
      "Manhattan distance is retained only as a labelled geometric comparator. A null legal distance is inaccessible under the specified graph and is never imputed as a Manhattan route.",
      "The all-AI observation deliberately uses humanTribe:-1 and cannot pass the production snapshot validator. Matching humanTribe:0 saves are separately retained and validated without being substituted for observed all-AI states.",
      "Rows with callback, deadline, queue, exception, invariant, or save-fixture failure remain in raw evidence and are excluded from eligible primary-outcome inference rather than silently replaced.",
      "A triage signal triggers only an additional diagnosis/review. It does not authorize a buff, nerf, star compensation, rule edit, map-generation edit, or causal claim.",
    ],
  };
  await writeFile(
    resolve(outDir, "start-position-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    resolve(outDir, "start-position-audit.csv"),
    rowsToCsv(rows),
    "utf8"
  );
  await writeFile(resolve(outDir, "REPORT.md"), markdown(report), "utf8");
  console.log(
    `Start-position audit ${report.status}: ${rows.length}/${START_POSITION_EXPECTED_MATCHES} attempted matches -> ${resolve(outDir, "start-position-audit.json")}`
  );
  if (report.status === "completed_with_failures") process.exitCode = 1;
}

async function runScenario(options: {
  scenario: StartPositionScenario;
  outDir: string;
  saveDir: string;
  aiStateDir: string;
  runtime: ReturnType<typeof installScopedHeadlessRuntime>;
  startedAt: number;
  protocol: StartPositionProtocol;
}): Promise<AuditRow> {
  const {
    scenario,
    outDir,
    saveDir,
    aiStateDir,
    runtime,
    startedAt,
    protocol,
  } = options;
  const matchStarted = Date.now();
  const failures: AuditFailure[] = [];
  const legalInitialSavePath = resolve(saveDir, `${scenario.id}.json`);
  const initialAiStatePath = resolve(aiStateDir, `${scenario.id}.json`);
  let legalSaveValidated = false;
  let observedTerrainFingerprint = "";
  let observedMapLayoutFingerprint = "";
  let openingTurnOrderNominalSeats: number[] = [];
  let initialPlacements: ReturnType<typeof measureStartPositions> = [];
  let callbackCap = 0;
  let callbacksDrained = 0;

  try {
    // The ordinary valid-human initial fixture and actual all-AI setup are
    // separate by protocol. Neither is altered after newGame beyond maxTurns.
    runtime.clear();
    runtime.setRandomSeed(scenario.randomSeed);
    game.newGame({
      size: protocol.ordinaryMatchConfiguration.boardSize,
      humanTribe:
        protocol.ordinaryMatchConfiguration.humanSetupForUserLoadableSave,
      difficulty: "normal",
      seed: scenario.worldSeed,
      preset: scenario.preset,
      roster: scenario.rosterRemappedIndices,
    });
    const legalSave = game.serializeState();
    const legalMapLayout = mapLayoutFingerprint(game.state);
    await writeFile(legalInitialSavePath, `${legalSave}\n`, "utf8");
    legalSaveValidated = game.loadOnlineSnapshot(
      legalSave,
      protocol.ordinaryMatchConfiguration.humanSetupForUserLoadableSave
    );
    if (!legalSaveValidated) {
      failures.push({
        kind: "save_fixture",
        detail:
          "The regular initial GameStore save was rejected by loadOnlineSnapshot.",
      });
    }

    runtime.clear();
    runtime.setRandomSeed(scenario.randomSeed);
    game.newGame({
      size: protocol.ordinaryMatchConfiguration.boardSize,
      humanTribe:
        protocol.ordinaryMatchConfiguration.allAiSetupForObservedOutcome,
      difficulty: "normal",
      seed: scenario.worldSeed,
      preset: scenario.preset,
      roster: scenario.rosterRemappedIndices,
    });
    game.state.maxTurns = protocol.ordinaryMatchConfiguration.turnCap;
    observedTerrainFingerprint = terrainFingerprint(game.state);
    observedMapLayoutFingerprint = mapLayoutFingerprint(game.state);
    if (legalMapLayout !== observedMapLayoutFingerprint) {
      failures.push({
        kind: "save_fixture",
        detail:
          "Regular user-loadable initial save and all-AI observation differed in generated map layout.",
      });
    }
    openingTurnOrderNominalSeats = [...(game.state.turnOrder ?? [])];
    initialPlacements = measureStartPositions(game.state);
    await writeFile(initialAiStatePath, `${game.serializeState()}\n`, "utf8");
    const setupFailure = validateRealCoreState(game.state);
    if (setupFailure)
      failures.push({ kind: "invariant", detail: `setup: ${setupFailure}` });

    callbackCap = Math.max(100, START_POSITION_TURN_CAP * 4 * 8 + 32);
    while (
      game.state.phase === "playing" &&
      callbacksDrained < callbackCap &&
      Date.now() - startedAt < START_POSITION_PROCESS_CAP_MS
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
      Date.now() - startedAt >= START_POSITION_PROCESS_CAP_MS
    ) {
      failures.push({
        kind: "deadline",
        detail: `Process audit deadline ${START_POSITION_PROCESS_CAP_MS}ms reached while the match was still playing.`,
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
        error instanceof Error ? (error.stack ?? error.message) : String(error),
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
    win: state.winner === tribe.index,
  }));
  const winner = state.winner === null ? null : state.tribes[state.winner];
  const reachedGameover = state.phase === "gameover";
  return {
    scenarioId: scenario.id,
    worldClusterId: scenario.worldClusterId,
    seedBlockId: scenario.seedBlockId,
    worldSeed: scenario.worldSeed,
    randomSeed: scenario.randomSeed,
    preset: scenario.preset,
    rosterId: scenario.rosterId,
    rosterOriginalIndices: scenario.rosterOriginalIndices,
    rosterRemappedIndices: scenario.rosterRemappedIndices,
    nominalRotation: scenario.nominalRotation,
    initialAiStatePath: relative(outDir, initialAiStatePath),
    legalInitialSavePath: relative(outDir, legalInitialSavePath),
    legalSaveValidated,
    terrainFingerprint: observedTerrainFingerprint,
    mapLayoutFingerprint: observedMapLayoutFingerprint,
    openingTurnOrderNominalSeats,
    initialPlacements,
    callbackCap,
    callbacksDrained,
    durationMs: Date.now() - matchStarted,
    phase: state.phase,
    turnsReached: state.turn,
    turnCapReached: state.turn >= START_POSITION_TURN_CAP,
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
  };
}

void main();
