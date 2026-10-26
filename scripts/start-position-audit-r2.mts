// Frozen R2 start-position access audit runner.
//
// This file must not be run for the observed R2 matrix before a second,
// independent review approves the immutable external R2 protocol. The approval
// check is intentionally the first operation in main: without it the script
// neither creates output nor reads a frozen scenario into the game engine.
//
// Post-review command only:
// START_POSITION_AUDIT_APPROVED=approved-by-parent \
// START_POSITION_AUDIT_PROTOCOL=/home/ubuntu/sunder-team/roster-fairness-20261025/fairness/START-POSITION-AUDIT-PROTOCOL-R2.json \
// START_POSITION_AUDIT_OUT=/home/ubuntu/sunder-team/roster-fairness-20261025/fairness/observed-start-position-audit-r2 \
// ./node_modules/.bin/tsx scripts/start-position-audit-r2.mts

import { execFileSync } from "node:child_process";
import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { TRIBE_DEFS } from "../client/src/game/core/types";
import { game } from "../client/src/game/core/state";
import {
  R2_APPROVED_DIRTY_PATHS,
  R2_OUTCOME_RELEVANT_SOURCE_PATHS,
  START_POSITION_R2_APPROVAL_VALUE,
  START_POSITION_R2_EXPECTED_MATCHES,
  START_POSITION_R2_PROCESS_CAP_MS,
  START_POSITION_R2_TURN_CAP,
  analyzeStartPositionAuditR2,
  buildFrozenStartPositionAuditR2ScenarioMatrix,
  enrichR2InitialPlacements,
  frozenR2ProtocolSha256,
  r2PrimaryTriageSignal,
  readStartPositionAuditR2Protocol,
  verifyR2ScenarioMatrix,
  type AttemptStage,
  type R2Analysis,
  type R2AuditFailure,
  type R2AuditRow,
  type R2TribeOutcome,
  type StartPositionAuditR2Protocol,
  type StartPositionAuditR2Scenario,
} from "./lib/startPositionAuditR2";
import {
  mapLayoutFingerprint,
  measureStartPositions,
  terrainFingerprint,
} from "./lib/startPositionAudit";
import { installScopedHeadlessRuntime } from "./lib/balancePaired";

// This is deliberately separate from R2_OUTCOME_RELEVANT_SOURCE_PATHS: that
// array mirrors the immutable JSON field byte-for-byte. R2 reuses this R1
// graph-measurement implementation, so the runtime manifest records its hash
// as an additional imported dependency rather than leaving an outcome-relevant
// dirty allowed file unidentified.
const IMPORTED_MEASUREMENT_SOURCE_PATHS = [
  "scripts/lib/startPositionAudit.ts",
] as const;

type SourcePolicy = {
  passed: boolean;
  approvedDirtyPathAllowlist: string[];
  dirtyPaths: string[];
  disallowedDirtyPaths: string[];
};

interface SourceManifest {
  baselineRequired: string;
  headSha: string;
  policy: SourcePolicy;
  hashes: Record<string, string>;
  protocolPath: string;
  protocolSha256: string;
  runtime: {
    nodeExecutable: string;
    nodeVersion: string;
    platform: NodeJS.Platform;
    architecture: string;
  };
  lockfile: {
    path: "pnpm-lock.yaml";
    sha256: string;
  };
}

interface FailureStratum {
  preset: string;
  rosterId: string;
  worldClusterId: string;
  nominalSeat: number | null;
  openingTurnPosition: number | null;
  attemptStage: AttemptStage;
  outcome: R2AuditRow["outcome"];
  failureKinds: string[];
  rows: number;
}

interface FingerprintSummary {
  attemptedWorldClusters: number;
  worldsWithAllAiInitialization: number;
  worldsWithCompleteInitialMeasurement: number;
  fullyVerifiedWorldClusters: number;
  nonemptyUniqueTerrainFingerprints: number;
  nonemptyUniqueFullLayoutFingerprints: number;
  crossWorldFullLayoutDuplicateGroups: Array<{
    mapLayoutFingerprint: string;
    worldClusterIds: string[];
  }>;
}

interface R2Disposition {
  value: "INCONCLUSIVE" | "TRIAGE_SIGNAL_REQUIRES_SEPARATE_DIAGNOSIS";
  passedIntegrityAndCoverage: boolean;
  primarySignal: boolean;
  capabilityDiagnosticAvailable: boolean;
  accessDiagnosticsAvailable: boolean;
  reasons: string[];
  thresholds: {
    eligiblePrimaryWorldClusters: { actual: number; minimum: number; passed: boolean };
    fullyVerifiedWorldClusters: { actual: number; minimum: number; passed: boolean };
    nonemptyFullLayoutFingerprints: { actual: number; minimum: number; passed: boolean };
    failedOrIncompleteAttemptRows: { actual: number; maximum: number; passed: boolean };
    distinctWorldClustersWithFailedOrIncompleteRows: { actual: number; maximum: number; passed: boolean };
    crossWorldFullLayoutDuplicateGroups: { actual: number; maximum: number; passed: boolean };
    primaryBootstrap: { requested: number; identified: number; invalid: number; passed: boolean };
  };
}

interface AuditReport {
  version: 2;
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
    matrixBalance: ReturnType<typeof verifyR2ScenarioMatrix>;
    allAiSetup: "newGame({ humanTribe: -1 })";
    legalSaveSetup: "newGame({ humanTribe: 0 })";
  };
  rows: R2AuditRow[];
  summary: {
    requestedMatches: number;
    observedMatches: number;
    failureRows: number;
    gameoverMatches: number;
    incompleteMatches: number;
    legalSaveFixturesValidated: number;
    totalCallbackCount: number;
    fingerprints: FingerprintSummary;
    failureStrata: FailureStratum[];
    analysis: R2Analysis;
    disposition: R2Disposition;
  };
  limitations: string[];
}

function git(args: string[], encoding: BufferEncoding = "utf8"): string {
  return execFileSync("git", args, { encoding }).trim();
}

function sourceHash(path: string): string {
  return execFileSync("sha256sum", [path], { encoding: "utf8" })
    .trim()
    .split(/\s+/)[0];
}

function approvalGate(): void {
  if (process.env.START_POSITION_AUDIT_APPROVED !== START_POSITION_R2_APPROVAL_VALUE) {
    throw new Error(
      "Observed R2 sample is blocked pending the required second independent review. START_POSITION_AUDIT_APPROVED must equal approved-by-parent; no frozen scenario was constructed."
    );
  }
}

function protocolPath(): string {
  const supplied = process.env.START_POSITION_AUDIT_PROTOCOL;
  if (!supplied)
    throw new Error("START_POSITION_AUDIT_PROTOCOL is required and must name the independently reviewable frozen R2 JSON.");
  return resolve(supplied);
}

function outputDir(protocol: StartPositionAuditR2Protocol): string {
  const supplied = process.env.START_POSITION_AUDIT_OUT;
  if (!supplied)
    throw new Error("START_POSITION_AUDIT_OUT is required so evidence remains outside the source worktree.");
  const out = resolve(supplied);
  const required = resolve(protocol.evidenceRetention.externalOutputRequired);
  if (out !== required)
    throw new Error(`START_POSITION_AUDIT_OUT must equal R2's exact external path: ${required}`);
  const worktree = resolve(git(["rev-parse", "--show-toplevel"]));
  const fromWorktree = relative(worktree, out);
  if (fromWorktree === "" || (!fromWorktree.startsWith("..") && !fromWorktree.includes("../")))
    throw new Error("START_POSITION_AUDIT_OUT must remain outside the source worktree.");
  return out;
}

async function assertOutputUnused(outDir: string): Promise<void> {
  try {
    const existing = await stat(outDir);
    if (existing.isDirectory())
      throw new Error(`Refusing to append, replace, or selectively rerun R2 evidence at ${outDir}. A later sample requires a new protocol.`);
    throw new Error(`START_POSITION_AUDIT_OUT exists and is not a directory: ${outDir}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

function dirtyWorktreePaths(): string[] {
  const raw = execFileSync("git", ["status", "--porcelain=v1", "-z"], {
    encoding: "utf8",
  });
  const fields = raw.split("\0");
  const paths: string[] = [];
  for (let index = 0; index < fields.length - 1; index += 1) {
    const field = fields[index];
    if (!field) continue;
    const status = field.slice(0, 2);
    paths.push(field.slice(3));
    // With -z rename/copy records carry an additional old pathname. Both names
    // must be on the frozen allowlist, not just the new one.
    if ((status.includes("R") || status.includes("C")) && index + 1 < fields.length - 1) {
      paths.push(fields[++index]);
    }
  }
  return [...new Set(paths)].sort();
}

function enforceSourcePolicy(): SourcePolicy {
  const dirtyPaths = dirtyWorktreePaths();
  const allowed = new Set<string>(R2_APPROVED_DIRTY_PATHS);
  const disallowedDirtyPaths = dirtyPaths.filter(path => !allowed.has(path));
  const policy: SourcePolicy = {
    passed: disallowedDirtyPaths.length === 0,
    approvedDirtyPathAllowlist: [...R2_APPROVED_DIRTY_PATHS],
    dirtyPaths,
    disallowedDirtyPaths,
  };
  if (!policy.passed) {
    throw new Error(
      `R2 source policy rejected dirty/untracked path(s) outside the exact frozen allowlist: ${disallowedDirtyPaths.join(", ")}`
    );
  }
  return policy;
}

function validateRealCoreState(state: {
  size: number;
  tiles: Array<{ x: number; y: number }>;
  units: Array<{ id: number; x: number; y: number; hp: number; maxHp: number }>;
}): string | null {
  if (state.tiles.length !== state.size * state.size)
    return `tile length ${state.tiles.length} does not equal ${state.size}²`;
  const occupied = new Set<string>();
  const unitIds = new Set<number>();
  for (const unit of state.units) {
    if (!Number.isInteger(unit.x) || !Number.isInteger(unit.y) || unit.x < 0 || unit.y < 0 || unit.x >= state.size || unit.y >= state.size)
      return `unit#${unit.id} is out of bounds at (${unit.x},${unit.y})`;
    const key = `${unit.x},${unit.y}`;
    if (occupied.has(key)) return `multiple live units occupy (${key})`;
    occupied.add(key);
    if (!Number.isInteger(unit.id) || unitIds.has(unit.id))
      return `unit id ${unit.id} is duplicate or invalid`;
    unitIds.add(unit.id);
    if (!Number.isFinite(unit.hp) || !Number.isFinite(unit.maxHp) || unit.hp <= 0 || unit.hp > unit.maxHp)
      return `unit#${unit.id} has invalid HP ${unit.hp}/${unit.maxHp}`;
  }
  for (let index = 0; index < state.tiles.length; index += 1) {
    const tile = state.tiles[index];
    if (tile.x !== index % state.size || tile.y !== Math.floor(index / state.size))
      return `tile[${index}] coordinates (${tile.x},${tile.y}) do not match its board index`;
  }
  return null;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: readonly R2AuditRow[]): string {
  const headers = [
    "scenario_id", "world_cluster_id", "world_stratum_id", "world_seed", "random_seed", "preset", "roster_id",
    "roster_original_indices", "roster_remapped_indices", "nominal_rotation", "attempt_stage", "all_ai_initialized",
    "initial_measurement_complete", "initial_ai_state_path", "legal_initial_save_path", "legal_save_validated",
    "terrain_fingerprint", "map_layout_fingerprint", "opening_turn_order_nominal_seats", "initial_placements_json",
    "callback_cap", "callbacks_drained", "duration_ms", "phase", "turns_reached", "turn_cap_reached", "winner_seat",
    "winner_definition_index", "winner_name", "victory_path", "outcome", "failures_json", "tribes_json",
  ];
  const lines = rows.map(row => [
    row.scenarioId, row.worldClusterId, row.worldStratumId, row.worldSeed, row.randomSeed, row.preset, row.rosterId,
    JSON.stringify(row.rosterOriginalIndices), JSON.stringify(row.rosterRemappedIndices), row.nominalRotation, row.attemptStage,
    row.allAiInitialized, row.initialMeasurementComplete, row.initialAiStatePath, row.legalInitialSavePath, row.legalSaveValidated,
    row.terrainFingerprint, row.mapLayoutFingerprint, JSON.stringify(row.openingTurnOrderNominalSeats), JSON.stringify(row.initialPlacements),
    row.callbackCap, row.callbacksDrained, row.durationMs, row.phase, row.turnsReached, row.turnCapReached, row.winnerSeat,
    row.winnerDefinitionIndex, row.winnerName, row.victoryPath, row.outcome, JSON.stringify(row.failures), JSON.stringify(row.tribes),
  ].map(csvCell).join(","));
  return `${headers.join(",")}\n${lines.join("\n")}\n`;
}

function failureStrata(rows: readonly R2AuditRow[]): FailureStratum[] {
  const counts = new Map<string, FailureStratum>();
  for (const row of rows) {
    if (row.failures.length === 0 && row.outcome === "gameover") continue;
    const states = row.tribes && row.tribes.length > 0
      ? row.tribes.map(tribe => ({ nominalSeat: tribe.nominalSeat, openingTurnPosition: tribe.openingTurnPosition }))
      : [{ nominalSeat: null, openingTurnPosition: null }];
    for (const state of states) {
      const key = [row.preset, row.rosterId, row.worldClusterId, state.nominalSeat, state.openingTurnPosition, row.attemptStage, row.outcome, row.failures.map(failure => failure.kind).sort().join("|")].join("/");
      const current = counts.get(key) ?? {
        preset: row.preset,
        rosterId: row.rosterId,
        worldClusterId: row.worldClusterId,
        nominalSeat: state.nominalSeat,
        openingTurnPosition: state.openingTurnPosition,
        attemptStage: row.attemptStage,
        outcome: row.outcome,
        failureKinds: [...new Set(row.failures.map(failure => failure.kind))].sort(),
        rows: 0,
      };
      current.rows += 1;
      counts.set(key, current);
    }
  }
  return [...counts.values()].sort((left, right) =>
    left.preset.localeCompare(right.preset) || left.rosterId.localeCompare(right.rosterId) || left.worldClusterId.localeCompare(right.worldClusterId) ||
    (left.nominalSeat ?? -1) - (right.nominalSeat ?? -1) || (left.openingTurnPosition ?? -1) - (right.openingTurnPosition ?? -1)
  );
}

function fingerprintSummary(rows: readonly R2AuditRow[], scenarios: readonly StartPositionAuditR2Scenario[]): FingerprintSummary {
  const planned = new Set(scenarios.map(scenario => scenario.worldClusterId));
  const byCluster = new Map<string, R2AuditRow[]>();
  for (const row of rows) {
    const group = byCluster.get(row.worldClusterId) ?? [];
    group.push(row);
    byCluster.set(row.worldClusterId, group);
  }
  const allAi = [...byCluster.values()].filter(group => group.some(row => row.allAiInitialized)).length;
  const measured = [...byCluster.values()].filter(group => group.some(row => row.initialMeasurementComplete)).length;
  const fullyVerified = [...planned].filter(clusterId => {
    const group = byCluster.get(clusterId) ?? [];
    return group.length === 4 && group.every(row =>
      row.allAiInitialized && row.initialMeasurementComplete && row.outcome === "gameover" && row.failures.length === 0 &&
      row.terrainFingerprint !== null && row.mapLayoutFingerprint !== null && row.legalSaveValidated === true
    );
  }).length;
  const terrain = new Set(rows.map(row => row.terrainFingerprint).filter((value): value is string => !!value));
  const layouts = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.mapLayoutFingerprint) continue;
    const group = layouts.get(row.mapLayoutFingerprint) ?? new Set<string>();
    group.add(row.worldClusterId);
    layouts.set(row.mapLayoutFingerprint, group);
  }
  const duplicateGroups = [...layouts.entries()]
    .filter(([, clusters]) => clusters.size > 1)
    .map(([mapLayoutFingerprint, clusters]) => ({ mapLayoutFingerprint, worldClusterIds: [...clusters].sort() }))
    .sort((left, right) => left.mapLayoutFingerprint.localeCompare(right.mapLayoutFingerprint));
  return {
    attemptedWorldClusters: byCluster.size,
    worldsWithAllAiInitialization: allAi,
    worldsWithCompleteInitialMeasurement: measured,
    fullyVerifiedWorldClusters: fullyVerified,
    nonemptyUniqueTerrainFingerprints: terrain.size,
    nonemptyUniqueFullLayoutFingerprints: layouts.size,
    crossWorldFullLayoutDuplicateGroups: duplicateGroups,
  };
}

function disposition(rows: readonly R2AuditRow[], analysis: R2Analysis, fingerprints: FingerprintSummary): R2Disposition {
  const failedOrIncomplete = rows.filter(row => row.outcome !== "gameover");
  const failedClusters = new Set(failedOrIncomplete.map(row => row.worldClusterId)).size;
  const primaryBootstrap = analysis.primary.bootstrap;
  const thresholds = {
    eligiblePrimaryWorldClusters: {
      actual: analysis.primary.finiteWorldClusters,
      minimum: 120,
      passed: analysis.primary.finiteWorldClusters >= 120,
    },
    fullyVerifiedWorldClusters: {
      actual: fingerprints.fullyVerifiedWorldClusters,
      minimum: 120,
      passed: fingerprints.fullyVerifiedWorldClusters >= 120,
    },
    nonemptyFullLayoutFingerprints: {
      actual: fingerprints.nonemptyUniqueFullLayoutFingerprints,
      minimum: 120,
      passed: fingerprints.nonemptyUniqueFullLayoutFingerprints >= 120,
    },
    failedOrIncompleteAttemptRows: {
      actual: failedOrIncomplete.length,
      maximum: 8,
      passed: failedOrIncomplete.length <= 8,
    },
    distinctWorldClustersWithFailedOrIncompleteRows: {
      actual: failedClusters,
      maximum: 8,
      passed: failedClusters <= 8,
    },
    crossWorldFullLayoutDuplicateGroups: {
      actual: fingerprints.crossWorldFullLayoutDuplicateGroups.length,
      maximum: 0,
      passed: fingerprints.crossWorldFullLayoutDuplicateGroups.length === 0,
    },
    primaryBootstrap: {
      requested: primaryBootstrap.requestedReplicates,
      identified: primaryBootstrap.identifiedReplicates,
      invalid: primaryBootstrap.invalidReplicates,
      passed: primaryBootstrap.complete && primaryBootstrap.identifiedReplicates === 10_000,
    },
  };
  const capabilityDiagnosticAvailable = analysis.capabilityMetrics.every(metric => metric.status === "estimated");
  const accessDiagnosticsAvailable = analysis.physicalMetrics.every(metric => metric.status === "estimated");
  const reasons: string[] = [];
  for (const [name, threshold] of Object.entries(thresholds)) {
    if (!threshold.passed) reasons.push(`R2 ${name} threshold did not pass.`);
  }
  if (!capabilityDiagnosticAvailable)
    reasons.push("The frozen capability/affordability model is unavailable or singular; R2 requires INCONCLUSIVE rather than changing covariates after measurement.");
  if (!accessDiagnosticsAvailable)
    reasons.push("At least one prespecified physical/access/chokepoint metric is unavailable; R2 requires INCONCLUSIVE.");
  const primarySignal = r2PrimaryTriageSignal(analysis.primary);
  if (!primarySignal) reasons.push("No nominal-seat primary contrast satisfies the predeclared estimate and complete-bootstrap CI triage rule.");
  const passedIntegrityAndCoverage = Object.values(thresholds).every(threshold => threshold.passed);
  const triage = passedIntegrityAndCoverage && capabilityDiagnosticAvailable && accessDiagnosticsAvailable && primarySignal;
  return {
    value: triage ? "TRIAGE_SIGNAL_REQUIRES_SEPARATE_DIAGNOSIS" : "INCONCLUSIVE",
    passedIntegrityAndCoverage,
    primarySignal,
    capabilityDiagnosticAvailable,
    accessDiagnosticsAvailable,
    reasons: triage ? ["All frozen R2 coverage, integrity, diagnostic-availability, and primary triage requirements passed. No gameplay change is authorized."] : reasons,
    thresholds,
  };
}

function format(value: number | null, digits = 2): string {
  return value === null ? "n/a" : value.toFixed(digits);
}

function percent(value: number | null): string {
  return value === null ? "n/a" : `${format(value * 100)}%`;
}

function contrastTable(contrasts: readonly { left: number; right: number; estimate: number; ci95: [number, number] | null }[]): string[] {
  return contrasts.length === 0
    ? ["| n/a | n/a | n/a |"]
    : contrasts.map(contrast => `| ${contrast.left} → ${contrast.right} | ${percent(contrast.estimate)} | ${contrast.ci95 ? `${percent(contrast.ci95[0])} to ${percent(contrast.ci95[1])}` : "n/a"} |`);
}

function metricMarkdown(metric: R2Analysis["physicalMetrics"][number]): string[] {
  return [
    `### ${metric.label}`,
    "",
    `- **Status:** ${metric.status}; ${metric.reason}`,
    `- **Raw pointer:** \`${metric.rawRowPointer}\`; finite rows ${metric.finiteRowCount}; null rows ${metric.nullRowCount}; finite world clusters ${metric.finiteWorldClusters}; overall finite mean ${format(metric.overallFiniteMean)} ${metric.units}.`,
    `- **Bootstrap:** ${metric.bootstrap.identifiedReplicates}/${metric.bootstrap.requestedReplicates} identified; invalid ${metric.bootstrap.invalidReplicates}; complete ${metric.bootstrap.complete ? "yes" : "no"}.`,
    "",
    "| Nominal-seat contrast (right − left) | Estimate | 95% cluster-bootstrap CI |",
    "| --- | ---: | --- |",
    ...contrastTable(metric.nominalSeatContrasts),
    "",
    "| Opening-position contrast (right − left) | Estimate | 95% cluster-bootstrap CI |",
    "| --- | ---: | --- |",
    ...contrastTable(metric.openingTurnPositionContrasts),
    "",
  ];
}

function markdown(report: AuditReport): string {
  const { analysis, disposition: finalDisposition, fingerprints } = report.summary;
  return [
    "# Frozen start-position access audit — R2",
    "",
    `- **Execution status:** ${report.status}`,
    `- **Machine-readable disposition:** **${finalDisposition.value}**`,
    `- **Protocol:** \`${report.protocol.id}\` v${report.protocol.version}, SHA-256 \`${report.protocol.sha256}\``,
    `- **Source HEAD:** \`${report.source.headSha}\`; required baseline \`${report.source.baselineRequired}\`; source policy ${report.source.policy.passed ? "passed" : "failed"}.`,
    `- **Matches:** ${report.summary.observedMatches}/${report.summary.requestedMatches}; 128 planned independent seed/preset worlds; four roster-seat rotations per world (not independent maps).`,
    "",
    "## Coverage, failures, and fingerprints",
    "",
    `- attempted clusters ${fingerprints.attemptedWorldClusters}; all-AI initialized ${fingerprints.worldsWithAllAiInitialization}; complete initial measurement ${fingerprints.worldsWithCompleteInitialMeasurement}; fully verified ${fingerprints.fullyVerifiedWorldClusters}.`,
    `- nonempty terrain fingerprints ${fingerprints.nonemptyUniqueTerrainFingerprints}; nonempty full-layout fingerprints ${fingerprints.nonemptyUniqueFullLayoutFingerprints}; cross-world duplicate layout groups ${fingerprints.crossWorldFullLayoutDuplicateGroups.length}. Empty/null fingerprints are excluded from counts.`,
    `- failure/incomplete attempt rows ${finalDisposition.thresholds.failedOrIncompleteAttemptRows.actual}; distinct affected world clusters ${finalDisposition.thresholds.distinctWorldClustersWithFailedOrIncompleteRows.actual}.`,
    "",
    "## Primary outcome: adjusted win probability",
    "",
    `- **Status:** ${analysis.primary.status}; ${analysis.primary.reason}`,
    `- finite eligible world clusters ${analysis.primary.finiteWorldClusters}; finite tribe rows ${analysis.primary.finiteRowCount}; bootstrap ${analysis.primary.bootstrap.identifiedReplicates}/${analysis.primary.bootstrap.requestedReplicates} identified, invalid ${analysis.primary.bootstrap.invalidReplicates}.`,
    "",
    "| Nominal-seat contrast (right − left) | Estimate | 95% complete-cluster-bootstrap CI |",
    "| --- | ---: | --- |",
    ...contrastTable(analysis.primary.nominalSeatContrasts),
    "",
    "| Opening-position contrast (right − left) | Estimate | 95% complete-cluster-bootstrap CI |",
    "| --- | ---: | --- |",
    ...contrastTable(analysis.primary.openingTurnPositionContrasts),
    "",
    "## Physical generated-map, lawful-access, and chokepoint diagnostics",
    "",
    "Each metric retains field-level finite/null denominators and per-world cluster means in `start-position-audit-r2.json`; target totals are separately summed from raw targets, without imputing null legal distances.",
    "",
    ...analysis.physicalMetrics.flatMap(metricMarkdown),
    "## State-dependent capability / affordability diagnostic",
    "",
    `- **Structural collinearity:** ${analysis.capabilityCollinearity.status}. ${analysis.capabilityCollinearity.explanation}`,
    `- **initialStars bounded diagnostic:** ${analysis.capabilityCollinearity.observedInitialStarsDiagnostic.status}; ${analysis.capabilityCollinearity.observedInitialStarsDiagnostic.explanation}`,
    "",
    ...analysis.capabilityMetrics.flatMap(metricMarkdown),
    "## Final frozen decision rule",
    "",
    `**${finalDisposition.value}**`,
    "",
    ...finalDisposition.reasons.map(reason => `- ${reason}`),
    "",
    "A triage signal (if all gates were met) would authorize only a separate diagnosis/review. It does not authorize a buff, nerf, initial-star change, AI change, rule change, map-generation change, online change, naval change, or causal conclusion.",
    "",
    "## Artifacts",
    "",
    "- `frozen-matrix.json`: exact scenario schedule, balance self-check, written before any match.",
    "- `source-manifest.json`: source-policy result, source/lockfile hashes, protocol digest, and Node runtime identity.",
    "- `raw-rows.ndjson`, `start-position-audit-r2.json`, and `.csv`: every attempted row, including explicit null/unavailable fields for pre-initialization failures.",
    "- `initial-saves/`: `humanTribe:0` fixtures validated by `loadOnlineSnapshot`; `initial-ai-states/`: all-AI evidence only.",
    "",
    "## Limitations",
    "",
    ...report.limitations.map(item => `- ${item}`),
    "",
  ].join("\n");
}

async function runScenario(options: {
  scenario: StartPositionAuditR2Scenario;
  outDir: string;
  saveDir: string;
  aiStateDir: string;
  runtime: ReturnType<typeof installScopedHeadlessRuntime>;
  startedAt: number;
  protocol: StartPositionAuditR2Protocol;
}): Promise<R2AuditRow> {
  const { scenario, outDir, saveDir, aiStateDir, runtime, startedAt, protocol } = options;
  const matchStarted = Date.now();
  const failures: R2AuditFailure[] = [];
  let attemptStage: AttemptStage = "not_started";
  let allAiInitialized = false;
  let initialMeasurementComplete = false;
  let legalInitialSavePath: string | null = null;
  let initialAiStatePath: string | null = null;
  let legalSaveValidated: boolean | null = null;
  let observedTerrainFingerprint: string | null = null;
  let observedMapLayoutFingerprint: string | null = null;
  let openingTurnOrderNominalSeats: number[] | null = null;
  let initialPlacements: R2AuditRow["initialPlacements"] = null;
  let callbackCap: number | null = null;
  let callbacksDrained: number | null = null;
  let legalMapLayout: string | null = null;

  const failure = (kind: R2AuditFailure["kind"], detail: string, callback?: number): void => {
    failures.push({ kind, detail, ...(callback === undefined ? {} : { callback }), stage: attemptStage });
  };

  try {
    // User-loadable initial fixture: independently retained, never substituted
    // for the all-AI observed initial state.
    runtime.clear();
    runtime.setRandomSeed(scenario.randomSeed);
    game.newGame({
      size: protocol.ordinaryMatchConfiguration.boardSize,
      humanTribe: protocol.ordinaryMatchConfiguration.humanSetupForUserLoadableSave,
      difficulty: "normal",
      seed: scenario.worldSeed,
      preset: scenario.preset,
      roster: scenario.rosterRemappedIndices,
    });
    attemptStage = "legal_save_initialized";
    const legalSave = game.serializeState();
    legalMapLayout = mapLayoutFingerprint(game.state);
    const legalPath = resolve(saveDir, `${scenario.id}.json`);
    await writeFile(legalPath, `${legalSave}\n`, "utf8");
    legalInitialSavePath = relative(outDir, legalPath);
    legalSaveValidated = game.loadOnlineSnapshot(
      legalSave,
      protocol.ordinaryMatchConfiguration.humanSetupForUserLoadableSave
    );
    if (!legalSaveValidated)
      failure("save_fixture", "The regular initial GameStore save was rejected by loadOnlineSnapshot.");

    // Actual observed state. Reset the scoped AI stream again before each game.
    runtime.clear();
    runtime.setRandomSeed(scenario.randomSeed);
    game.newGame({
      size: protocol.ordinaryMatchConfiguration.boardSize,
      humanTribe: protocol.ordinaryMatchConfiguration.allAiSetupForObservedOutcome,
      difficulty: "normal",
      seed: scenario.worldSeed,
      preset: scenario.preset,
      roster: scenario.rosterRemappedIndices,
    });
    allAiInitialized = true;
    attemptStage = "all_ai_initialized";
    game.state.maxTurns = protocol.ordinaryMatchConfiguration.turnCap;
    observedTerrainFingerprint = terrainFingerprint(game.state);
    observedMapLayoutFingerprint = mapLayoutFingerprint(game.state);
    if (legalMapLayout !== observedMapLayoutFingerprint)
      failure("save_fixture", "User-loadable and all-AI initial setups differed in full generated map layout.");
    openingTurnOrderNominalSeats = [...(game.state.turnOrder ?? [])];
    initialPlacements = enrichR2InitialPlacements(game.state, measureStartPositions(game.state));
    initialMeasurementComplete = true;
    attemptStage = "initial_measurement_complete";
    const statePath = resolve(aiStateDir, `${scenario.id}.json`);
    await writeFile(statePath, `${game.serializeState()}\n`, "utf8");
    initialAiStatePath = relative(outDir, statePath);
    const setupFailure = validateRealCoreState(game.state);
    if (setupFailure) failure("invariant", `setup: ${setupFailure}`);

    callbackCap = Math.max(100, START_POSITION_R2_TURN_CAP * 4 * 8 + 32);
    callbacksDrained = 0;
    while (
      game.state.phase === "playing" &&
      callbacksDrained < callbackCap &&
      Date.now() - startedAt < START_POSITION_R2_PROCESS_CAP_MS
    ) {
      const callback = runtime.pending.shift();
      if (!callback) {
        failure("stalled_callback_queue", "GameStore callback queue emptied while the match was still playing.", callbacksDrained);
        break;
      }
      callback();
      callbacksDrained += 1;
      const invariantFailure = validateRealCoreState(game.state);
      if (invariantFailure) {
        failure("invariant", `after callback ${callbacksDrained}: ${invariantFailure}`, callbacksDrained);
        break;
      }
    }
    if (game.state.phase === "playing" && callbacksDrained >= callbackCap)
      failure("callback_cap", `Callback cap ${callbackCap} reached while the match was still playing.`, callbacksDrained);
    if (game.state.phase === "playing" && Date.now() - startedAt >= START_POSITION_R2_PROCESS_CAP_MS)
      failure("deadline", `Process deadline ${START_POSITION_R2_PROCESS_CAP_MS}ms reached while the match was still playing.`, callbacksDrained);
    if (game.state.phase !== "playing" && game.state.phase !== "gameover")
      failure("unexpected_phase", `Expected playing or gameover, found ${game.state.phase}.`, callbacksDrained);
    attemptStage = "outcome_execution_complete";
  } catch (error) {
    failure("exception", error instanceof Error ? (error.stack ?? error.message) : String(error), callbacksDrained ?? undefined);
  }

  // Never consult singleton game.state after a failure before all-AI setup: it
  // could be the preceding scenario. Such rows retain only planned scenario
  // identity plus explicit null/unavailable state fields.
  if (!allAiInitialized) {
    return {
      scenarioId: scenario.id,
      worldClusterId: scenario.worldClusterId,
      worldStratumId: scenario.worldStratumId,
      worldSeed: scenario.worldSeed,
      randomSeed: scenario.randomSeed,
      preset: scenario.preset,
      rosterId: scenario.rosterId,
      rosterOriginalIndices: scenario.rosterOriginalIndices,
      rosterRemappedIndices: scenario.rosterRemappedIndices,
      nominalRotation: scenario.nominalRotation,
      attemptStage,
      allAiInitialized: false,
      initialMeasurementComplete: false,
      initialAiStatePath,
      legalInitialSavePath,
      legalSaveValidated,
      terrainFingerprint: null,
      mapLayoutFingerprint: null,
      openingTurnOrderNominalSeats: null,
      initialPlacements: null,
      callbackCap: null,
      callbacksDrained: null,
      durationMs: Date.now() - matchStarted,
      phase: null,
      turnsReached: null,
      turnCapReached: null,
      winnerSeat: null,
      winnerDefinitionIndex: null,
      winnerName: null,
      victoryPath: null,
      outcome: "failed",
      failures,
      tribes: null,
    };
  }

  const state = game.state;
  const tribes: R2TribeOutcome[] = state.tribes.map(tribe => ({
    nominalSeat: tribe.index,
    openingTurnPosition: openingTurnOrderNominalSeats?.indexOf(tribe.index) ?? null,
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
  if (reachedGameover && failures.length === 0) attemptStage = "complete";
  return {
    scenarioId: scenario.id,
    worldClusterId: scenario.worldClusterId,
    worldStratumId: scenario.worldStratumId,
    worldSeed: scenario.worldSeed,
    randomSeed: scenario.randomSeed,
    preset: scenario.preset,
    rosterId: scenario.rosterId,
    rosterOriginalIndices: scenario.rosterOriginalIndices,
    rosterRemappedIndices: scenario.rosterRemappedIndices,
    nominalRotation: scenario.nominalRotation,
    attemptStage,
    allAiInitialized,
    initialMeasurementComplete,
    initialAiStatePath,
    legalInitialSavePath,
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
    turnCapReached: state.turn >= START_POSITION_R2_TURN_CAP,
    winnerSeat: state.winner,
    winnerDefinitionIndex: winner?.defIndex ?? null,
    winnerName: winner?.name ?? null,
    victoryPath: state.winPath?.pathId ?? null,
    outcome: failures.length > 0 ? "failed" : reachedGameover ? "gameover" : "incomplete",
    failures,
    tribes,
  };
}

async function main(): Promise<void> {
  approvalGate();
  const frozenProtocolPath = protocolPath();
  const protocolSha256 = frozenR2ProtocolSha256(frozenProtocolPath);
  const protocol = readStartPositionAuditR2Protocol(frozenProtocolPath);
  const outDir = outputDir(protocol);
  await assertOutputUnused(outDir);
  const headSha = git(["rev-parse", "HEAD"]);
  if (headSha !== protocol.sourceIdentityAtFreeze.requiredBaselineCommit)
    throw new Error(`HEAD ${headSha} does not equal R2's required baseline ${protocol.sourceIdentityAtFreeze.requiredBaselineCommit}.`);
  if (TRIBE_DEFS.length !== 8)
    throw new Error(`R2's frozen roster schedule expects exactly 8 tribe definitions; found ${TRIBE_DEFS.length}.`);
  const sourcePolicy = enforceSourcePolicy();
  const scenarios = buildFrozenStartPositionAuditR2ScenarioMatrix(protocol);
  const matrixBalance = verifyR2ScenarioMatrix(scenarios);
  if (!matrixBalance.passed) throw new Error(`R2 matrix balance failed: ${matrixBalance.errors.join("; ")}`);
  const source: SourceManifest = {
    baselineRequired: protocol.sourceIdentityAtFreeze.requiredBaselineCommit,
    headSha,
    policy: sourcePolicy,
    hashes: Object.fromEntries(
      [...R2_OUTCOME_RELEVANT_SOURCE_PATHS, ...IMPORTED_MEASUREMENT_SOURCE_PATHS].map(path => [path, sourceHash(path)])
    ),
    protocolPath: frozenProtocolPath,
    protocolSha256,
    runtime: {
      nodeExecutable: process.execPath,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    lockfile: { path: "pnpm-lock.yaml", sha256: sourceHash("pnpm-lock.yaml") },
  };

  // No directory exists until approval, frozen-protocol bytes, source policy,
  // baseline, source identity, and static matrix balance have all passed.
  await mkdir(outDir, { recursive: false });
  const saveDir = resolve(outDir, "initial-saves");
  const aiStateDir = resolve(outDir, "initial-ai-states");
  await Promise.all([mkdir(saveDir, { recursive: true }), mkdir(aiStateDir, { recursive: true })]);
  await writeFile(resolve(outDir, "frozen-matrix.json"), `${JSON.stringify({
    protocolId: protocol.protocolId,
    protocolSha256,
    generatedBeforeMatchExecution: true,
    matrixBalance,
    scenarios,
  }, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "source-manifest.json"), `${JSON.stringify(source, null, 2)}\n`, "utf8");
  const rawRowsPath = resolve(outDir, "raw-rows.ndjson");
  await writeFile(rawRowsPath, "", { flag: "wx" });

  const runtime = installScopedHeadlessRuntime();
  const startedAt = Date.now();
  const rows: R2AuditRow[] = [];
  try {
    for (const scenario of scenarios) {
      const row = await runScenario({ scenario, outDir, saveDir, aiStateDir, runtime, startedAt, protocol });
      rows.push(row);
      await appendFile(rawRowsPath, `${JSON.stringify(row)}\n`, "utf8");
      console.error(`[${rows.length}/${scenarios.length}] ${scenario.id} -> ${row.outcome}; stage=${row.attemptStage}; failures=${row.failures.length}`);
      if (Date.now() - startedAt >= START_POSITION_R2_PROCESS_CAP_MS) break;
    }
  } finally {
    runtime.restore();
  }

  const plannedClusterIds = [...new Set(scenarios.map(scenario => scenario.worldClusterId))].sort();
  const fingerprints = fingerprintSummary(rows, scenarios);
  const analysis = analyzeStartPositionAuditR2(rows, { plannedClusterIds });
  const finalDisposition = disposition(rows, analysis, fingerprints);
  const failureRows = rows.filter(row => row.failures.length > 0).length;
  const report: AuditReport = {
    version: 2,
    lane: "start_position_access_audit",
    protocol: {
      id: protocol.protocolId,
      version: protocol.protocolVersion,
      path: frozenProtocolPath,
      sha256: protocolSha256,
      frozenStatus: protocol.status,
    },
    status: failureRows > 0 || rows.length !== START_POSITION_R2_EXPECTED_MATCHES ? "completed_with_failures" : "completed",
    generatedAt: new Date().toISOString(),
    source,
    frozenMatrix: {
      expectedMatches: START_POSITION_R2_EXPECTED_MATCHES,
      actualMatchLimit: START_POSITION_R2_EXPECTED_MATCHES,
      turnLimit: START_POSITION_R2_TURN_CAP,
      processTimeLimitMs: START_POSITION_R2_PROCESS_CAP_MS,
      independentWorldClusters: 128,
      uniqueRngSeedsPlanned: 128,
      matrixPath: "frozen-matrix.json",
      matrixBalance,
      allAiSetup: "newGame({ humanTribe: -1 })",
      legalSaveSetup: "newGame({ humanTribe: 0 })",
    },
    rows,
    summary: {
      requestedMatches: START_POSITION_R2_EXPECTED_MATCHES,
      observedMatches: rows.length,
      failureRows,
      gameoverMatches: rows.filter(row => row.outcome === "gameover").length,
      incompleteMatches: rows.filter(row => row.outcome === "incomplete").length,
      legalSaveFixturesValidated: rows.filter(row => row.legalSaveValidated === true).length,
      totalCallbackCount: rows.reduce((sum, row) => sum + (row.callbacksDrained ?? 0), 0),
      fingerprints,
      failureStrata: failureStrata(rows),
      analysis,
      disposition: finalDisposition,
    },
    limitations: [
      "This finite 13×13, normal-difficulty, four-tribe, legacy-generation all-AI sample is diagnostic evidence only; it does not establish player-facing, human-strategy, online, other-board-size, or causal fairness.",
      "The 512 matches comprise 128 independent seed/preset world clusters with four repeated cyclic roster-seat rotations each. Rotations and fingerprints never increase the independent-world denominator.",
      "The scoped deterministic AI RNG makes the frozen scenarios reproducible but does not separately estimate AI random-stream variability.",
      "Lawful access and chokepoints are frozen-initial-state, single-unit graph diagnostics using shipped reachableTiles. They exclude discovery, later technology, captures, movement/cooperation, combat, policy, visibility, and future state.",
      "Manhattan distance is a labelled geometric comparator only. A null lawful distance is never replaced or imputed with Manhattan distance.",
      "The capability metric is state-dependent action affordability, not pure map-resource quality. Its frozen full covariate bundle is checked for structural collinearity and is not selectively altered after measurement.",
      "Failed and incomplete rows remain retained raw evidence; they are never converted to losses, replaced, selectively rerun, or appended.",
    ],
  };
  await writeFile(resolve(outDir, "start-position-audit-r2.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "start-position-audit-r2.csv"), rowsToCsv(rows), "utf8");
  await writeFile(resolve(outDir, "REPORT.md"), markdown(report), "utf8");
  console.log(`R2 start-position audit ${report.status}; disposition=${finalDisposition.value}; ${rows.length}/${START_POSITION_R2_EXPECTED_MATCHES} attempted matches.`);
  if (report.status === "completed_with_failures" || finalDisposition.value === "INCONCLUSIVE") process.exitCode = 1;
}

void main();
