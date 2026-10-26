import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TRIBE_DEFS } from "../../client/src/game/core/types";
import type { MapPreset } from "../../client/src/game/core/mapgen";
import { harvestCost } from "../../client/src/game/core/rules";
import { remapRoster } from "./balancePaired";
import type { StartPositionMetrics } from "./startPositionAudit";

/**
 * R2 is a separately frozen protocol.  This module deliberately keeps the
 * scenario schedule and inference code out of the mutable runner so both can
 * be independently checked without constructing any game state.
 */
export const START_POSITION_R2_PROTOCOL_ID =
  "start-position-access-audit-20261025-r2";
export const START_POSITION_R2_PROTOCOL_VERSION = 2;
export const START_POSITION_R2_BASELINE_SHA =
  "1db1a102cb361ec0bf0a8579833fdbc7e3eaf94b";
export const START_POSITION_R2_PROTOCOL_SHA256 =
  "67ca15163fb58eadbfa7ffc27ec4a50adcc47ce4b85adddb94795eec6fbfe17f";
export const START_POSITION_R2_EXPECTED_MATCHES = 512;
export const START_POSITION_R2_WORLD_CLUSTERS = 128;
export const START_POSITION_R2_TURN_CAP = 30;
export const START_POSITION_R2_PROCESS_CAP_MS = 1_800_000;
export const START_POSITION_R2_APPROVAL_VALUE = "approved-by-parent";
export const START_POSITION_R2_BOOTSTRAP_REPLICATES = 10_000;
export const START_POSITION_R2_BOOTSTRAP_SEED = 441_010;
export const START_POSITION_R2_MIN_FINITE_CLUSTERS = 112;

export const R2_APPROVED_DIRTY_PATHS = [
  "docs/START-POSITION-AUDIT.md",
  "scripts/lib/startPositionAudit.ts",
  "scripts/lib/startPositionAuditR2.ts",
  "scripts/start-position-audit.mts",
  "scripts/start-position-audit-r2.mts",
  "server/start-position-audit.test.ts",
] as const;

export const R2_OUTCOME_RELEVANT_SOURCE_PATHS = [
  "scripts/start-position-audit-r2.mts",
  "scripts/lib/startPositionAuditR2.ts",
  "scripts/lib/balancePaired.ts",
  "scripts/_rng.mts",
  "client/src/game/core/ai.ts",
  "client/src/game/core/rules.ts",
  "client/src/game/core/state.ts",
  "client/src/game/core/types.ts",
  "client/src/game/core/mapgen.ts",
  "package.json",
  "pnpm-lock.yaml",
] as const;

const R2_MIXED_ROSTERS = [
  { id: "mixed-01", definitionIndices: [0, 1, 4, 5] },
  { id: "mixed-02", definitionIndices: [2, 3, 6, 7] },
  { id: "mixed-03", definitionIndices: [0, 2, 5, 7] },
  { id: "mixed-04", definitionIndices: [1, 3, 4, 6] },
] as const;

const R2_EXCLUDED_PRIOR_RANGE = [8_194_401, 8_194_416] as const;
const R2_R1_SEEDS = new Set<number>([
  ...Array.from({ length: 16 }, (_, index) => 9_273_001 + index),
  ...Array.from({ length: 16 }, (_, index) => 9_274_001 + index),
]);

export interface R2Roster {
  id: string;
  definitionIndices: number[];
}

export interface R2World {
  worldSeed: number;
  assignedRosterId: string;
}

export interface R2WorldStratum {
  id: string;
  preset: MapPreset;
  acceptedCounterRangeInclusive: [number, number];
  worlds: R2World[];
}

export interface StartPositionAuditR2Protocol {
  protocolVersion: number;
  protocolId: string;
  status: string;
  authorizationGate: {
    observedSampleMayRun: boolean;
    requiredBeforeRun: string;
    runnerRefusalWithoutApproval: boolean;
  };
  sourceIdentityAtFreeze: {
    requiredBaselineCommit: string;
    requiredGenerationVersion: string;
    approvedDirtyPathAllowlist: string[];
    outcomeRelevantSourcePaths: string[];
  };
  ordinaryMatchConfiguration: {
    boardSize: number;
    difficulty: string;
    presets: string[];
    turnCap: number;
    processCapMs: number;
    humanSetupForUserLoadableSave: number;
    allAiSetupForObservedOutcome: number;
  };
  sampling: {
    maximumMatches: number;
    matchesPlanned: number;
    seedSelectionCommitment: {
      algorithm: string;
      domainStringTemplate: string;
      candidateTransform: string;
      counterRule: string;
      exclusions: {
        knownPriorObservedSeedRangeInclusive: [number, number];
        r1ContinentsSeeds: number[];
        r1ArchipelagoSeeds: number[];
      };
    };
    freshWorldStrata: R2WorldStratum[];
    mixedRosters: R2Roster[];
    nominalSeatRotations: number[];
    expectedCounts: Record<string, unknown>;
  };
  observations: Record<string, unknown>;
  analysisPlan: {
    bootstrap: {
      replicates: number;
      bootstrapSeed: number;
      minimumFiniteWorldClustersForMetricInference: number;
      completeReplicateRule: string;
    };
  };
  decisionRuleBeforeMeasurement: Record<string, unknown>;
  evidenceRetention: {
    externalOutputRequired: string;
  };
}

export interface StartPositionAuditR2Scenario {
  id: string;
  worldStratumId: string;
  worldClusterId: string;
  worldSeed: number;
  randomSeed: number;
  preset: MapPreset;
  rosterId: string;
  rosterOriginalIndices: number[];
  rosterRemappedIndices: number[];
  nominalRotation: number;
}

export interface MatrixBalanceCheck {
  passed: boolean;
  errors: string[];
  scenarioCount: number;
  independentWorldClusters: number;
  nominalSeatDefinitionCounts: Record<string, number>;
  rosterWorldCountsByPreset: Record<string, Record<string, number>>;
}

export type AttemptStage =
  | "not_started"
  | "legal_save_initialized"
  | "all_ai_initialized"
  | "initial_measurement_complete"
  | "outcome_execution_complete"
  | "complete";

export interface R2AuditFailure {
  kind:
    | "callback_cap"
    | "deadline"
    | "stalled_callback_queue"
    | "unexpected_phase"
    | "invariant"
    | "exception"
    | "save_fixture";
  detail: string;
  callback?: number;
  stage: AttemptStage;
}

export interface R2InitialPlacement extends StartPositionMetrics {
  initialTechSignature: string;
  passive: string;
  harvestCost: number;
}

export interface R2TribeOutcome {
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

/** One durable record per planned attempted match. Null is evidence, not zero. */
export interface R2AuditRow {
  scenarioId: string;
  worldClusterId: string;
  worldStratumId: string;
  worldSeed: number;
  randomSeed: number;
  preset: string;
  rosterId: string;
  rosterOriginalIndices: number[];
  rosterRemappedIndices: number[];
  nominalRotation: number;
  attemptStage: AttemptStage;
  allAiInitialized: boolean;
  initialMeasurementComplete: boolean;
  initialAiStatePath: string | null;
  legalInitialSavePath: string | null;
  legalSaveValidated: boolean | null;
  terrainFingerprint: string | null;
  mapLayoutFingerprint: string | null;
  openingTurnOrderNominalSeats: number[] | null;
  initialPlacements: R2InitialPlacement[] | null;
  callbackCap: number | null;
  callbacksDrained: number | null;
  durationMs: number;
  phase: string | null;
  turnsReached: number | null;
  turnCapReached: boolean | null;
  winnerSeat: number | null;
  winnerDefinitionIndex: number | null;
  winnerName: string | null;
  victoryPath: string | null;
  outcome: "gameover" | "incomplete" | "failed";
  failures: R2AuditFailure[];
  tribes: R2TribeOutcome[] | null;
}

interface RegressionRow {
  rowKey: string;
  clusterId: string;
  nominalSeat: number;
  openingTurnPosition: number;
  preset: string;
  rosterId: string;
  definitionIndex: number;
  initialStars: number;
  initialTechSignature: string;
  passive: string;
  harvestCost: number;
  value: number;
}

type ModelFamily = "physical" | "primary" | "capability";

export interface StandardizedPrediction {
  value: number;
  ci95: [number, number] | null;
}

export interface PairwiseContrast {
  left: number;
  right: number;
  estimate: number;
  ci95: [number, number] | null;
}

export interface DesignRankDiagnostic {
  featureNames: string[];
  rowCount: number;
  rank: number;
  columnCount: number;
  singular: boolean;
  tolerance: number;
}

export interface MetricInference {
  metricId: string;
  family: "physical_generated_map_access_chokepoint" | "capability_affordability" | "primary_outcome";
  label: string;
  units: string;
  rawRowPointer: string;
  finiteRowCount: number;
  nullRowCount: number;
  finiteWorldClusters: number;
  overallFiniteMean: number | null;
  clusterMeans: Array<{
    worldClusterId: string;
    finiteRowCount: number;
    nullRowCount: number;
    finiteSum: number;
    finiteMean: number | null;
  }>;
  status: "estimated" | "inconclusive";
  reason: string;
  pointFit: DesignRankDiagnostic | null;
  bootstrap: {
    requestedReplicates: number;
    identifiedReplicates: number;
    invalidReplicates: number;
    seed: number;
    complete: boolean;
  };
  standardizedNominalSeat: Array<{ nominalSeat: number; estimate: StandardizedPrediction }>;
  standardizedOpeningTurnPosition: Array<{
    openingTurnPosition: number;
    estimate: StandardizedPrediction;
  }>;
  nominalSeatContrasts: PairwiseContrast[];
  openingTurnPositionContrasts: PairwiseContrast[];
}

export interface AccessTargetTotal {
  targetClass: "neutral_village" | "opponent_capital_approach";
  placementRows: number;
  rawTargetCount: number;
  rawAccessibleTargetCount: number;
  rawInaccessibleTargetCount: number;
  byWorldCluster: Array<{
    worldClusterId: string;
    placementRows: number;
    rawTargetCount: number;
    rawAccessibleTargetCount: number;
    rawInaccessibleTargetCount: number;
  }>;
}

export interface CapabilityCollinearityDiagnostic {
  status: "structurally_collinear" | "not_structurally_collinear";
  checkedDefinitions: number[];
  techSignatureByPassiveIsOneToOne: boolean;
  harvestCostIsFunctionOfPassive: boolean;
  initialStarsIsDeterministicallyEncodedBySeatAndOpeningPosition: boolean;
  explanation: string;
  observedInitialStarsDiagnostic: {
    status: "not_available" | "collinear_in_observed_rows" | "not_collinear_in_observed_rows";
    finiteRows: number;
    rankWithInitialStars: number | null;
    rankWithoutInitialStars: number | null;
    explanation: string;
  };
}

export interface R2Analysis {
  primary: MetricInference;
  physicalMetrics: MetricInference[];
  capabilityMetrics: MetricInference[];
  accessTargetTotals: AccessTargetTotal[];
  capabilityCollinearity: CapabilityCollinearityDiagnostic;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function protocolError(detail: string): never {
  throw new Error(`Invalid frozen R2 start-position protocol: ${detail}`);
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function isMapPreset(value: unknown): value is MapPreset {
  return value === "continents" || value === "archipelago";
}

/** SHA-256-counter-v1 specified in the immutable external R2 protocol. */
export function shaCounterCandidate(preset: string, counter: number): number {
  if (!Number.isInteger(counter) || counter < 0)
    throw new Error(`Counter must be a non-negative integer; received ${counter}.`);
  const domain = `${START_POSITION_R2_PROTOCOL_ID}|sha256-counter-v1|${preset}|${counter}`;
  const digest = createHash("sha256").update(domain).digest();
  return (digest.readUInt32BE(0) % 2_147_483_646) + 1;
}

function excludedR2Seed(seed: number): boolean {
  return (
    (seed >= R2_EXCLUDED_PRIOR_RANGE[0] && seed <= R2_EXCLUDED_PRIOR_RANGE[1]) ||
    R2_R1_SEEDS.has(seed)
  );
}

/** Rebuild acceptance without touching map generation, metrics, or outcomes. */
export function shaCounterAcceptedSeeds(preset: MapPreset, count = 64): number[] {
  const accepted: number[] = [];
  const allAccepted = new Set<number>();
  let counter = 0;
  // A bounded guard makes malformed future protocols fail rather than looping.
  while (accepted.length < count && counter < 1_000_000) {
    const candidate = shaCounterCandidate(preset, counter);
    if (!excludedR2Seed(candidate) && !allAccepted.has(candidate)) {
      accepted.push(candidate);
      allAccepted.add(candidate);
    }
    counter += 1;
  }
  if (accepted.length !== count)
    throw new Error(`Could not derive ${count} SHA-counter candidates for ${preset}.`);
  return accepted;
}

/** Refuse changed external protocol bytes rather than silently adopting them. */
export function frozenR2ProtocolSha256(path: string): string {
  const digest = sha256(readFileSync(path, "utf8"));
  if (digest !== START_POSITION_R2_PROTOCOL_SHA256) {
    throw new Error(
      `Frozen R2 protocol SHA-256 mismatch: expected ${START_POSITION_R2_PROTOCOL_SHA256}, received ${digest}. Create and independently review a new protocol rather than altering R2.`
    );
  }
  return digest;
}

export function readStartPositionAuditR2Protocol(
  path: string
): StartPositionAuditR2Protocol {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object") protocolError("root must be an object");
  const protocol = parsed as StartPositionAuditR2Protocol;
  if (
    protocol.protocolVersion !== START_POSITION_R2_PROTOCOL_VERSION ||
    protocol.protocolId !== START_POSITION_R2_PROTOCOL_ID ||
    protocol.status !== "frozen_pending_independent_parent_review"
  ) {
    protocolError("unexpected protocol id, version, or status");
  }
  if (protocol.authorizationGate?.observedSampleMayRun !== false)
    protocolError("observedSampleMayRun must remain false at freeze");
  if (protocol.sourceIdentityAtFreeze?.requiredBaselineCommit !== START_POSITION_R2_BASELINE_SHA)
    protocolError("required baseline differs from the R2 freeze");
  if (protocol.sourceIdentityAtFreeze?.requiredGenerationVersion !== "legacy-v0 implicit default")
    protocolError("generation version is not the frozen legacy default");
  if (
    !sameStringArray(
      protocol.sourceIdentityAtFreeze?.approvedDirtyPathAllowlist ?? [],
      R2_APPROVED_DIRTY_PATHS
    )
  ) {
    protocolError("approved dirty-path allowlist differs from R2 exactly");
  }
  if (
    !sameStringArray(
      protocol.sourceIdentityAtFreeze?.outcomeRelevantSourcePaths ?? [],
      R2_OUTCOME_RELEVANT_SOURCE_PATHS
    )
  ) {
    protocolError("outcome-relevant source path list differs from R2 exactly");
  }
  const config = protocol.ordinaryMatchConfiguration;
  if (
    config?.boardSize !== 13 ||
    config.difficulty !== "normal" ||
    !sameStringArray(config.presets ?? [], ["continents", "archipelago"]) ||
    config.turnCap !== START_POSITION_R2_TURN_CAP ||
    config.processCapMs !== START_POSITION_R2_PROCESS_CAP_MS ||
    config.humanSetupForUserLoadableSave !== 0 ||
    config.allAiSetupForObservedOutcome !== -1
  ) {
    protocolError("ordinary configuration differs from frozen R2 configuration");
  }
  const sampling = protocol.sampling;
  if (
    sampling?.maximumMatches !== START_POSITION_R2_EXPECTED_MATCHES ||
    sampling.matchesPlanned !== START_POSITION_R2_EXPECTED_MATCHES ||
    (sampling.nominalSeatRotations ?? []).join(",") !== "0,1,2,3"
  ) {
    protocolError("sample limit or nominal rotations differ from R2");
  }
  if (!Array.isArray(sampling.mixedRosters) || sampling.mixedRosters.length !== 4)
    protocolError("expected four mixed rosters");
  for (const [index, roster] of sampling.mixedRosters.entries()) {
    const expected = R2_MIXED_ROSTERS[index];
    if (
      !expected ||
      roster.id !== expected.id ||
      roster.definitionIndices.length !== 4 ||
      !roster.definitionIndices.every((value, i) => value === expected.definitionIndices[i])
    ) {
      protocolError(`mixed roster at index ${index} differs from R2`);
    }
  }
  if (!Array.isArray(sampling.freshWorldStrata) || sampling.freshWorldStrata.length !== 2)
    protocolError("expected two 64-world R2 strata");
  const allSeeds = new Set<number>();
  for (const [stratumIndex, stratum] of sampling.freshWorldStrata.entries()) {
    const expectedPreset: MapPreset = stratumIndex === 0 ? "continents" : "archipelago";
    const expectedId = `${expectedPreset}-sha256-counter-000-063`;
    if (
      !isMapPreset(stratum.preset) ||
      stratum.preset !== expectedPreset ||
      stratum.id !== expectedId ||
      stratum.acceptedCounterRangeInclusive?.join(",") !== "0,63" ||
      stratum.worlds.length !== 64
    ) {
      protocolError(`stratum ${stratumIndex} differs from the SHA-counter R2 schedule`);
    }
    const derived = shaCounterAcceptedSeeds(expectedPreset, 64);
    for (const [worldIndex, world] of stratum.worlds.entries()) {
      const expectedRoster = R2_MIXED_ROSTERS[worldIndex % 4].id;
      if (
        world.worldSeed !== derived[worldIndex] ||
        world.assignedRosterId !== expectedRoster ||
        !Number.isSafeInteger(world.worldSeed) ||
        excludedR2Seed(world.worldSeed) ||
        allSeeds.has(world.worldSeed)
      ) {
        protocolError(`world ${worldIndex} in ${stratum.id} is not the committed schedule`);
      }
      allSeeds.add(world.worldSeed);
    }
  }
  if (allSeeds.size !== START_POSITION_R2_WORLD_CLUSTERS)
    protocolError("R2 must contain 128 globally unique world seeds");
  const expectedCounts = sampling.expectedCounts ?? {};
  const expectedPairs: Array<[string, number]> = [
    ["uniqueRngSeeds", 128],
    ["seedPresetWorlds", 128],
    ["worldsPerPreset", 64],
    ["matchesPerWorld", 4],
    ["rostersPerWorld", 1],
    ["totalMatches", 512],
    ["worldsPerRosterPerPreset", 16],
    ["worldsPerRoster", 32],
    ["definitionOutcomeRows", 256],
    ["definitionNominalSeatRows", 64],
  ];
  for (const [key, value] of expectedPairs) {
    if (expectedCounts[key] !== value) protocolError(`expectedCounts.${key} differs from R2`);
  }
  const bootstrap = protocol.analysisPlan?.bootstrap;
  if (
    bootstrap?.replicates !== START_POSITION_R2_BOOTSTRAP_REPLICATES ||
    bootstrap.bootstrapSeed !== START_POSITION_R2_BOOTSTRAP_SEED ||
    bootstrap.minimumFiniteWorldClustersForMetricInference !== START_POSITION_R2_MIN_FINITE_CLUSTERS
  ) {
    protocolError("bootstrap specification differs from R2");
  }
  return protocol;
}

/** Build all and only the 128 worlds × four cyclic roster-seat rotations. */
export function buildFrozenStartPositionAuditR2ScenarioMatrix(
  protocol: StartPositionAuditR2Protocol
): StartPositionAuditR2Scenario[] {
  const rosters = new Map(protocol.sampling.mixedRosters.map(roster => [roster.id, roster]));
  const scenarios: StartPositionAuditR2Scenario[] = [];
  const ids = new Set<string>();
  for (const stratum of protocol.sampling.freshWorldStrata) {
    for (const world of stratum.worlds) {
      const roster = rosters.get(world.assignedRosterId);
      if (!roster) throw new Error(`Missing assigned roster ${world.assignedRosterId}.`);
      for (const nominalRotation of protocol.sampling.nominalSeatRotations) {
        const id = [
          "start-r2",
          stratum.id,
          `seed${world.worldSeed}`,
          roster.id,
          `r${nominalRotation}`,
        ].join("-");
        if (ids.has(id)) throw new Error(`Duplicate R2 scenario id: ${id}`);
        ids.add(id);
        scenarios.push({
          id,
          worldStratumId: stratum.id,
          worldClusterId: `${stratum.preset}/seed${world.worldSeed}`,
          worldSeed: world.worldSeed,
          randomSeed: world.worldSeed,
          preset: stratum.preset,
          rosterId: roster.id,
          rosterOriginalIndices: [...roster.definitionIndices],
          rosterRemappedIndices: remapRoster(roster.definitionIndices, nominalRotation),
          nominalRotation,
        });
      }
    }
  }
  const balance = verifyR2ScenarioMatrix(scenarios);
  if (!balance.passed) throw new Error(`Invalid R2 matrix: ${balance.errors.join("; ")}`);
  return scenarios;
}

/** Static balance check: it never constructs a generated board or frozen game. */
export function verifyR2ScenarioMatrix(
  scenarios: readonly StartPositionAuditR2Scenario[]
): MatrixBalanceCheck {
  const errors: string[] = [];
  const clusters = new Map<string, StartPositionAuditR2Scenario[]>();
  const nominalSeatDefinitionCounts: Record<string, number> = {};
  const rosterWorldCountsByPreset: Record<string, Record<string, number>> = {};
  for (const scenario of scenarios) {
    const group = clusters.get(scenario.worldClusterId) ?? [];
    group.push(scenario);
    clusters.set(scenario.worldClusterId, group);
    rosterWorldCountsByPreset[scenario.preset] ??= {};
  }
  if (scenarios.length !== START_POSITION_R2_EXPECTED_MATCHES)
    errors.push(`expected ${START_POSITION_R2_EXPECTED_MATCHES} scenarios, found ${scenarios.length}`);
  if (clusters.size !== START_POSITION_R2_WORLD_CLUSTERS)
    errors.push(`expected ${START_POSITION_R2_WORLD_CLUSTERS} world clusters, found ${clusters.size}`);
  for (const [clusterId, group] of clusters) {
    if (group.length !== 4) errors.push(`${clusterId} has ${group.length}, not four rotations`);
    const rosterIds = new Set(group.map(scenario => scenario.rosterId));
    const rotations = new Set(group.map(scenario => scenario.nominalRotation));
    if (rosterIds.size !== 1) errors.push(`${clusterId} uses more than one roster`);
    if (rotations.size !== 4 || ![0, 1, 2, 3].every(rotation => rotations.has(rotation)))
      errors.push(`${clusterId} does not contain all four cyclic rotations`);
    const exemplar = group[0];
    if (exemplar) {
      const counts = rosterWorldCountsByPreset[exemplar.preset];
      counts[exemplar.rosterId] = (counts[exemplar.rosterId] ?? 0) + 1;
    }
    for (const scenario of group) {
      for (const [seat, definition] of scenario.rosterRemappedIndices.entries()) {
        const key = `${definition}/${seat}`;
        nominalSeatDefinitionCounts[key] = (nominalSeatDefinitionCounts[key] ?? 0) + 1;
      }
    }
  }
  for (const preset of ["continents", "archipelago"]) {
    for (const roster of R2_MIXED_ROSTERS) {
      if (rosterWorldCountsByPreset[preset]?.[roster.id] !== 16)
        errors.push(`${preset}/${roster.id} does not have 16 worlds`);
    }
  }
  for (let definition = 0; definition < 8; definition += 1) {
    for (let seat = 0; seat < 4; seat += 1) {
      if (nominalSeatDefinitionCounts[`${definition}/${seat}`] !== 64)
        errors.push(`definition ${definition} seat ${seat} does not have 64 placement rows`);
    }
  }
  return {
    passed: errors.length === 0,
    errors,
    scenarioCount: scenarios.length,
    independentWorldClusters: clusters.size,
    nominalSeatDefinitionCounts,
    rosterWorldCountsByPreset,
  };
}

function stableTechSignature(techs: readonly string[]): string {
  return [...techs].sort().join("|");
}

/** Attach the R2-only state-dependent capability covariates to R1 graph metrics. */
export function enrichR2InitialPlacements(
  state: Parameters<typeof harvestCost>[0],
  measurements: StartPositionMetrics[]
): R2InitialPlacement[] {
  return measurements.map(measurement => {
    const tribe = state.tribes[measurement.nominalSeat];
    if (!tribe) throw new Error(`Missing tribe in nominal seat ${measurement.nominalSeat}.`);
    return {
      ...measurement,
      initialTechSignature: stableTechSignature(measurement.initialTechs),
      passive: tribe.passive,
      harvestCost: harvestCost(state, tribe.index),
    };
  });
}

const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

interface MetricDefinition {
  metricId: string;
  label: string;
  units: string;
  family: "physical_generated_map_access_chokepoint" | "capability_affordability";
  value: (placement: R2InitialPlacement) => number | null;
}

const TERRAIN_KEYS = ["ocean", "water", "grass", "forest", "mountain"] as const;
type TerrainKey = (typeof TERRAIN_KEYS)[number];

function terrainMetricDefinitions(
  prefix: string,
  labelPrefix: string,
  getter: (placement: R2InitialPlacement) => Record<TerrainKey, number>
): MetricDefinition[] {
  return TERRAIN_KEYS.map(terrain => ({
    metricId: `${prefix}_${terrain}`,
    label: `${labelPrefix}: ${terrain} tiles`,
    units: "tiles",
    family: "physical_generated_map_access_chokepoint" as const,
    value: placement => getter(placement)[terrain] ?? null,
  }));
}

/** Every named R2 physical, lawful-access, and chokepoint metric is explicit. */
export const R2_PHYSICAL_METRICS: MetricDefinition[] = [
  {
    metricId: "owned_fruit",
    label: "Owned fruit resources",
    units: "resources",
    family: "physical_generated_map_access_chokepoint",
    value: placement => placement.ownedResources.fruit,
  },
  {
    metricId: "owned_animal",
    label: "Owned animal resources",
    units: "resources",
    family: "physical_generated_map_access_chokepoint",
    value: placement => placement.ownedResources.animal,
  },
  {
    metricId: "owned_mineral",
    label: "Owned mineral resources",
    units: "resources",
    family: "physical_generated_map_access_chokepoint",
    value: placement => placement.ownedResources.mineral,
  },
  {
    metricId: "owned_resource_total",
    label: "Total owned resources",
    units: "resources",
    family: "physical_generated_map_access_chokepoint",
    value: placement => placement.ownedResourceTotal,
  },
  ...terrainMetricDefinitions(
    "owned_terrain",
    "Starting owned terrain",
    placement => placement.startingOwnedTerrain
  ),
  ...terrainMetricDefinitions(
    "capital_adjacent_terrain",
    "Capital-adjacent terrain",
    placement => placement.capitalAdjacentTerrain
  ),
  {
    metricId: "first_turn_reachable_tiles",
    label: "First-turn shipped-reachable tiles",
    units: "tiles",
    family: "physical_generated_map_access_chokepoint",
    value: placement => placement.firstTurnLegalReachableTileCount,
  },
  {
    metricId: "first_turn_neutral_expansion_tiles",
    label: "First-turn shipped-reachable neutral-expansion tiles",
    units: "tiles",
    family: "physical_generated_map_access_chokepoint",
    value: placement => placement.firstTurnLegalNeutralExpansionTileCount,
  },
  {
    metricId: "first_turn_neutral_villages",
    label: "First-turn shipped-reachable neutral villages",
    units: "tiles",
    family: "physical_generated_map_access_chokepoint",
    value: placement => placement.firstTurnLegalNeutralVillageCount,
  },
  ...terrainMetricDefinitions(
    "first_turn_reachable_terrain",
    "First-turn shipped-reachable terrain",
    placement => placement.firstTurnLegalReachableTerrain
  ),
  ...(["neutralVillage", "opponentCapitalApproach"] as const).flatMap(classKey => {
    const snake = classKey === "neutralVillage" ? "neutral_village" : "opponent_capital_approach";
    const label = classKey === "neutralVillage" ? "Neutral-village" : "Opponent-capital-approach";
    const summary = (placement: R2InitialPlacement) => placement.lawfulAccess[classKey];
    return [
      {
        metricId: `${snake}_target_count`,
        label: `${label} target count`,
        units: "targets",
        family: "physical_generated_map_access_chokepoint" as const,
        value: (placement: R2InitialPlacement) => summary(placement).targetCount,
      },
      {
        metricId: `${snake}_accessible_target_count`,
        label: `${label} accessible target count`,
        units: "targets",
        family: "physical_generated_map_access_chokepoint" as const,
        value: (placement: R2InitialPlacement) => summary(placement).accessibleTargetCount,
      },
      {
        metricId: `${snake}_inaccessible_target_count`,
        label: `${label} inaccessible target count`,
        units: "targets",
        family: "physical_generated_map_access_chokepoint" as const,
        value: (placement: R2InitialPlacement) => summary(placement).inaccessibleTargetCount,
      },
      {
        metricId: `${snake}_nearest_target_manhattan`,
        label: `${label} nearest geometric Manhattan comparator`,
        units: "Manhattan tiles",
        family: "physical_generated_map_access_chokepoint" as const,
        value: (placement: R2InitialPlacement) => summary(placement).nearestTargetManhattan,
      },
      {
        metricId: `${snake}_nearest_legal_full_turn_hops`,
        label: `${label} nearest lawful full-turn hops`,
        units: "lawful graph hops",
        family: "physical_generated_map_access_chokepoint" as const,
        value: (placement: R2InitialPlacement) => summary(placement).nearestLegalFullTurnHops,
      },
      {
        metricId: `${snake}_chokepoint_union_count`,
        label: `${label} chokepoint union count`,
        units: "tiles",
        family: "physical_generated_map_access_chokepoint" as const,
        value: (placement: R2InitialPlacement) => summary(placement).chokepointTileCount,
      },
    ];
  }),
];

export const R2_CAPABILITY_METRIC: MetricDefinition = {
  metricId: "immediately_harvestable_owned_resources",
  label: "Immediately harvestable owned resources (state-dependent capability/affordability)",
  units: "resources",
  family: "capability_affordability",
  value: placement => placement.immediatelyHarvestableOwnedResources,
};

function physicalDesign(row: Omit<RegressionRow, "value" | "rowKey" | "clusterId">): number[] {
  const out = [1];
  for (let seat = 1; seat < 4; seat += 1) out.push(row.nominalSeat === seat ? 1 : 0);
  for (let position = 1; position < 4; position += 1)
    out.push(row.openingTurnPosition === position ? 1 : 0);
  out.push(row.preset === "archipelago" ? 1 : 0);
  for (const roster of ["mixed-02", "mixed-03", "mixed-04"])
    out.push(row.rosterId === roster ? 1 : 0);
  for (let definition = 1; definition < TRIBE_DEFS.length; definition += 1)
    out.push(row.definitionIndex === definition ? 1 : 0);
  return out;
}

function capabilityDesign(row: Omit<RegressionRow, "value" | "rowKey" | "clusterId">): number[] {
  const out = [1];
  for (let seat = 1; seat < 4; seat += 1) out.push(row.nominalSeat === seat ? 1 : 0);
  for (let position = 1; position < 4; position += 1)
    out.push(row.openingTurnPosition === position ? 1 : 0);
  out.push(row.preset === "archipelago" ? 1 : 0);
  for (const roster of ["mixed-02", "mixed-03", "mixed-04"])
    out.push(row.rosterId === roster ? 1 : 0);
  out.push(row.initialStars);
  const signatures = allTechSignatures();
  for (const signature of signatures.slice(1)) out.push(row.initialTechSignature === signature ? 1 : 0);
  const passives = allPassives();
  for (const passive of passives.slice(1)) out.push(row.passive === passive ? 1 : 0);
  out.push(row.harvestCost);
  return out;
}

function physicalFeatureNames(): string[] {
  return [
    "intercept",
    "nominalSeat=1",
    "nominalSeat=2",
    "nominalSeat=3",
    "openingTurnPosition=1",
    "openingTurnPosition=2",
    "openingTurnPosition=3",
    "preset=archipelago",
    "roster=mixed-02",
    "roster=mixed-03",
    "roster=mixed-04",
    ...Array.from({ length: TRIBE_DEFS.length - 1 }, (_, index) => `definition=${index + 1}`),
  ];
}

function allTechSignatures(): string[] {
  return [...new Set(TRIBE_DEFS.map(definition => stableTechSignature([definition.startTech])))].sort();
}

function allPassives(): string[] {
  return [...new Set(TRIBE_DEFS.map(definition => definition.passive))].sort();
}

function capabilityFeatureNames(): string[] {
  return [
    "intercept",
    "nominalSeat=1",
    "nominalSeat=2",
    "nominalSeat=3",
    "openingTurnPosition=1",
    "openingTurnPosition=2",
    "openingTurnPosition=3",
    "preset=archipelago",
    "roster=mixed-02",
    "roster=mixed-03",
    "roster=mixed-04",
    "initialStars",
    ...allTechSignatures().slice(1).map(value => `initialTechSignature=${value}`),
    ...allPassives().slice(1).map(value => `passive=${value}`),
    "harvestCost",
  ];
}

function designFor(family: ModelFamily, row: RegressionRow): number[] {
  return family === "capability" ? capabilityDesign(row) : physicalDesign(row);
}

function featureNamesFor(family: ModelFamily): string[] {
  return family === "capability" ? capabilityFeatureNames() : physicalFeatureNames();
}

function zeroMatrix(size: number): number[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function zeroVector(size: number): number[] {
  return Array.from({ length: size }, () => 0);
}

function matrixRank(input: readonly number[][], tolerance = 1e-10): number {
  if (input.length === 0) return 0;
  const matrix = input.map(row => [...row]);
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  let scale = 0;
  for (const row of matrix) for (const value of row) scale = Math.max(scale, Math.abs(value));
  const threshold = Math.max(1, scale) * tolerance;
  let rank = 0;
  for (let column = 0; column < columns && rank < rows; column += 1) {
    let pivot = rank;
    for (let row = rank + 1; row < rows; row += 1) {
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    }
    if (Math.abs(matrix[pivot][column]) <= threshold) continue;
    [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
    const divisor = matrix[rank][column];
    for (let c = column; c < columns; c += 1) matrix[rank][c] /= divisor;
    for (let row = rank + 1; row < rows; row += 1) {
      const factor = matrix[row][column];
      if (factor === 0) continue;
      for (let c = column; c < columns; c += 1) matrix[row][c] -= factor * matrix[rank][c];
    }
    rank += 1;
  }
  return rank;
}

function rankDiagnostic(designs: readonly number[][], featureNames: string[]): DesignRankDiagnostic {
  const rank = matrixRank(designs);
  return {
    featureNames,
    rowCount: designs.length,
    rank,
    columnCount: featureNames.length,
    singular: rank < featureNames.length,
    tolerance: 1e-10,
  };
}

/** Solve X'X B = X'Y for many responses with one pivot sequence. */
function solveMultiRhs(matrix: number[][], rhsColumns: number[][]): number[][] | null {
  const n = matrix.length;
  const responseCount = rhsColumns.length;
  if (n === 0 || rhsColumns.some(column => column.length !== n)) return null;
  const augmented = matrix.map((row, index) => [...row, ...rhsColumns.map(column => column[index])]);
  for (let pivot = 0; pivot < n; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row;
    }
    if (Math.abs(augmented[best][pivot]) < 1e-10) return null;
    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    for (let column = pivot; column < n + responseCount; column += 1)
      augmented[pivot][column] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      if (factor === 0) continue;
      for (let column = pivot; column < n + responseCount; column += 1)
        augmented[row][column] -= factor * augmented[pivot][column];
    }
  }
  return rhsColumns.map((_, response) => augmented.map(row => row[n + response]));
}

function dot(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function quantile(sorted: readonly number[], probability: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return lower === upper
    ? sorted[lower]
    : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
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

/** Shared once across all metrics: no metric-specific RNG or selective resampling. */
export function bootstrapClusterDraws(
  clusterCount: number,
  replicates = START_POSITION_R2_BOOTSTRAP_REPLICATES,
  seed = START_POSITION_R2_BOOTSTRAP_SEED
): Uint16Array[] {
  if (!Number.isInteger(clusterCount) || clusterCount < 1) throw new Error("Bootstrap needs at least one cluster.");
  const random = seededRandom(seed);
  return Array.from({ length: replicates }, () => {
    const draw = new Uint16Array(clusterCount);
    for (let index = 0; index < clusterCount; index += 1)
      draw[index] = Math.floor(random() * clusterCount);
    return draw;
  });
}

function regressionRowsForMetric(
  rows: readonly R2AuditRow[],
  definition: MetricDefinition
): { finite: RegressionRow[]; nullCount: number; clusterNullCounts: Map<string, number> } {
  const finite: RegressionRow[] = [];
  const clusterNullCounts = new Map<string, number>();
  let nullCount = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let placementIndex = 0; placementIndex < (row.initialPlacements?.length ?? 0); placementIndex += 1) {
      const placement = row.initialPlacements![placementIndex];
      const value = definition.value(placement);
      const base = {
        rowKey: `${rowIndex}/${placementIndex}`,
        clusterId: row.worldClusterId,
        nominalSeat: placement.nominalSeat,
        openingTurnPosition: placement.openingTurnPosition ?? -1,
        preset: row.preset,
        rosterId: row.rosterId,
        definitionIndex: placement.definitionIndex,
        initialStars: placement.initialStars,
        initialTechSignature: placement.initialTechSignature,
        passive: placement.passive,
        harvestCost: placement.harvestCost,
      };
      if (!Number.isFinite(value) || placement.openingTurnPosition === null) {
        nullCount += 1;
        clusterNullCounts.set(row.worldClusterId, (clusterNullCounts.get(row.worldClusterId) ?? 0) + 1);
        continue;
      }
      finite.push({ ...base, value: value as number });
    }
  }
  // Rows failed before all-AI initialization have no state placements. Count a
  // single explicit unavailable placement-equivalent in their failure strata,
  // but never manufacture a numeric metric null denominator from it.
  return { finite, nullCount, clusterNullCounts };
}

function primaryRegressionRows(rows: readonly R2AuditRow[]): RegressionRow[] {
  const output: RegressionRow[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (row.outcome !== "gameover" || row.failures.length !== 0 || !row.tribes) continue;
    for (let tribeIndex = 0; tribeIndex < row.tribes.length; tribeIndex += 1) {
      const tribe = row.tribes[tribeIndex];
      if (tribe.openingTurnPosition === null) continue;
      output.push({
        rowKey: `${rowIndex}/${tribeIndex}`,
        clusterId: row.worldClusterId,
        nominalSeat: tribe.nominalSeat,
        openingTurnPosition: tribe.openingTurnPosition,
        preset: row.preset,
        rosterId: row.rosterId,
        definitionIndex: tribe.definitionIndex,
        initialStars: 0,
        initialTechSignature: "",
        passive: "",
        harvestCost: 0,
        value: tribe.win ? 1 : 0,
      });
    }
  }
  return output;
}

function standardizationVectors(
  family: ModelFamily,
  rows: readonly RegressionRow[]
): { nominal: number[][]; opening: number[][] } {
  const featureCount = featureNamesFor(family).length;
  const average = (mutate: (row: RegressionRow) => RegressionRow): number[] => {
    const sum = zeroVector(featureCount);
    for (const row of rows) {
      const design = designFor(family, mutate(row));
      for (let index = 0; index < featureCount; index += 1) sum[index] += design[index];
    }
    return sum.map(value => value / rows.length);
  };
  return {
    nominal: Array.from({ length: 4 }, (_, seat) => average(row => ({ ...row, nominalSeat: seat }))),
    opening: Array.from({ length: 4 }, (_, position) =>
      average(row => ({ ...row, openingTurnPosition: position }))
    ),
  };
}

interface InferenceSpec {
  metricId: string;
  label: string;
  units: string;
  rawRowPointer: string;
  family: ModelFamily;
  resultFamily: MetricInference["family"];
  finite: RegressionRow[];
  nullCount: number;
  clusterNullCounts: Map<string, number>;
}

interface GroupedSpec {
  specs: InferenceSpec[];
  finiteRows: RegressionRow[];
  family: ModelFamily;
}

function groupInferenceSpecs(specs: InferenceSpec[]): GroupedSpec[] {
  const groups = new Map<string, GroupedSpec>();
  for (const spec of specs) {
    const key = `${spec.family}|${spec.finite.map(row => row.rowKey).join(",")}`;
    const current = groups.get(key);
    if (current) current.specs.push(spec);
    else groups.set(key, { specs: [spec], finiteRows: spec.finite, family: spec.family });
  }
  return [...groups.values()];
}

function emptyInference(spec: InferenceSpec, plannedClusters: readonly string[], reason: string): MetricInference {
  const clusterRows = new Map<string, RegressionRow[]>();
  for (const row of spec.finite) {
    const group = clusterRows.get(row.clusterId) ?? [];
    group.push(row);
    clusterRows.set(row.clusterId, group);
  }
  return {
    metricId: spec.metricId,
    family: spec.resultFamily,
    label: spec.label,
    units: spec.units,
    rawRowPointer: spec.rawRowPointer,
    finiteRowCount: spec.finite.length,
    nullRowCount: spec.nullCount,
    finiteWorldClusters: clusterRows.size,
    overallFiniteMean:
      spec.finite.length === 0 ? null : spec.finite.reduce((sum, row) => sum + row.value, 0) / spec.finite.length,
    clusterMeans: plannedClusters.map(worldClusterId => {
      const values = clusterRows.get(worldClusterId) ?? [];
      const sum = values.reduce((total, row) => total + row.value, 0);
      return {
        worldClusterId,
        finiteRowCount: values.length,
        nullRowCount: spec.clusterNullCounts.get(worldClusterId) ?? 0,
        finiteSum: sum,
        finiteMean: values.length === 0 ? null : sum / values.length,
      };
    }),
    status: "inconclusive",
    reason,
    pointFit: null,
    bootstrap: {
      requestedReplicates: START_POSITION_R2_BOOTSTRAP_REPLICATES,
      identifiedReplicates: 0,
      invalidReplicates: 0,
      seed: START_POSITION_R2_BOOTSTRAP_SEED,
      complete: false,
    },
    standardizedNominalSeat: [],
    standardizedOpeningTurnPosition: [],
    nominalSeatContrasts: [],
    openingTurnPositionContrasts: [],
  };
}

/**
 * Fit grouped metrics using per-world X'X/X'Y sufficient statistics. Metrics
 * with exactly the same finite rows share the bootstrap X'X factorization and
 * use a single multi-right-hand-side solve per replicate. This is deliberately
 * not a 10,000 × raw-row × full-model loop per metric.
 */
function inferGrouped(
  grouped: GroupedSpec,
  plannedClusters: readonly string[],
  draws: readonly Uint16Array[],
  options: { bootstrapSeed: number; requestedReplicates: number }
): MetricInference[] {
  const { specs, finiteRows, family } = grouped;
  if (finiteRows.length === 0)
    return specs.map(spec => emptyInference(spec, plannedClusters, "No finite measurement rows; inference is inconclusive."));
  const featureNames = featureNamesFor(family);
  const featureCount = featureNames.length;
  const metricCount = specs.length;
  const diagnostics = rankDiagnostic(finiteRows.map(row => designFor(family, row)), featureNames);
  const clusterIndex = new Map(plannedClusters.map((cluster, index) => [cluster, index]));
  const perClusterXtx = Array.from({ length: plannedClusters.length }, () => zeroMatrix(featureCount));
  const perClusterXty = Array.from({ length: plannedClusters.length }, () =>
    Array.from({ length: metricCount }, () => zeroVector(featureCount))
  );
  const valuesBySpec = specs.map(spec => new Map(spec.finite.map(row => [row.rowKey, row.value])));
  for (const row of finiteRows) {
    const cluster = clusterIndex.get(row.clusterId);
    if (cluster === undefined) continue;
    const design = designFor(family, row);
    for (let left = 0; left < featureCount; left += 1) {
      for (let right = 0; right < featureCount; right += 1)
        perClusterXtx[cluster][left][right] += design[left] * design[right];
      for (let metric = 0; metric < metricCount; metric += 1) {
        const value = valuesBySpec[metric].get(row.rowKey);
        if (value !== undefined) perClusterXty[cluster][metric][left] += design[left] * value;
      }
    }
  }
  const allXtx = zeroMatrix(featureCount);
  const allXty = Array.from({ length: metricCount }, () => zeroVector(featureCount));
  for (let cluster = 0; cluster < plannedClusters.length; cluster += 1) {
    for (let left = 0; left < featureCount; left += 1) {
      for (let right = 0; right < featureCount; right += 1)
        allXtx[left][right] += perClusterXtx[cluster][left][right];
      for (let metric = 0; metric < metricCount; metric += 1)
        allXty[metric][left] += perClusterXty[cluster][metric][left];
    }
  }
  const pointBetas = diagnostics.singular ? null : solveMultiRhs(allXtx, allXty);
  const finiteClustersBySpec = specs.map(spec => new Set(spec.finite.map(row => row.clusterId)).size);
  // Standardization is explicitly to the observed finite-row distribution, not
  // each resample's distribution. Compute those vectors once and reuse them.
  const vectorsBySpec = specs.map(spec => standardizationVectors(family, spec.finite));
  const base = specs.map((spec, metric): MetricInference => {
    const clusterRows = new Map<string, RegressionRow[]>();
    for (const row of spec.finite) {
      const group = clusterRows.get(row.clusterId) ?? [];
      group.push(row);
      clusterRows.set(row.clusterId, group);
    }
    const pointReason = diagnostics.singular
      ? "Prespecified adjustment design is singular; inference is fail-closed and inconclusive."
      : finiteClustersBySpec[metric] < START_POSITION_R2_MIN_FINITE_CLUSTERS
        ? `Only ${finiteClustersBySpec[metric]} finite world clusters; R2 requires ${START_POSITION_R2_MIN_FINITE_CLUSTERS} for metric inference.`
        : "Estimated under the predeclared descriptive model.";
    const vectors = vectorsBySpec[metric];
    const beta = pointBetas?.[metric] ?? null;
    const standardSeat = beta
      ? vectors.nominal.map((vector, nominalSeat) => ({ nominalSeat, estimate: { value: dot(vector, beta), ci95: null } }))
      : [];
    const standardOpening = beta
      ? vectors.opening.map((vector, openingTurnPosition) => ({ openingTurnPosition, estimate: { value: dot(vector, beta), ci95: null } }))
      : [];
    const contrasts = beta
      ? PAIRS.map(([left, right]) => ({ left, right, estimate: dot(vectors.nominal[right], beta) - dot(vectors.nominal[left], beta), ci95: null }))
      : [];
    const openingContrasts = beta
      ? PAIRS.map(([left, right]) => ({ left, right, estimate: dot(vectors.opening[right], beta) - dot(vectors.opening[left], beta), ci95: null }))
      : [];
    return {
      metricId: spec.metricId,
      family: spec.resultFamily,
      label: spec.label,
      units: spec.units,
      rawRowPointer: spec.rawRowPointer,
      finiteRowCount: spec.finite.length,
      nullRowCount: spec.nullCount,
      finiteWorldClusters: finiteClustersBySpec[metric],
      overallFiniteMean: spec.finite.reduce((sum, row) => sum + row.value, 0) / spec.finite.length,
      clusterMeans: plannedClusters.map(worldClusterId => {
        const finite = clusterRows.get(worldClusterId) ?? [];
        const finiteSum = finite.reduce((sum, row) => sum + row.value, 0);
        return {
          worldClusterId,
          finiteRowCount: finite.length,
          nullRowCount: spec.clusterNullCounts.get(worldClusterId) ?? 0,
          finiteSum,
          finiteMean: finite.length === 0 ? null : finiteSum / finite.length,
        };
      }),
      status: diagnostics.singular || finiteClustersBySpec[metric] < START_POSITION_R2_MIN_FINITE_CLUSTERS ? "inconclusive" : "estimated",
      reason: pointReason,
      pointFit: diagnostics,
      bootstrap: {
        requestedReplicates: options.requestedReplicates,
        identifiedReplicates: 0,
        // A point design with deficient rank cannot acquire rank by resampling
        // its rows. Every requested bootstrap replicate is therefore exactly
        // invalid, without spending time solving 10,000 known-singular systems.
        invalidReplicates: diagnostics.singular ? options.requestedReplicates : 0,
        seed: options.bootstrapSeed,
        complete: false,
      },
      standardizedNominalSeat: standardSeat,
      standardizedOpeningTurnPosition: standardOpening,
      nominalSeatContrasts: contrasts,
      openingTurnPositionContrasts: openingContrasts,
    };
  });
  if (!pointBetas || base.some(item => item.status === "inconclusive")) return base;

  const outputCount = 4 + 4 + PAIRS.length + PAIRS.length;
  const bootstrapValues = Array.from({ length: metricCount }, () =>
    Array.from({ length: outputCount }, () => [] as number[])
  );
  let invalidReplicates = 0;
  for (const draw of draws) {
    const xtx = zeroMatrix(featureCount);
    const xty = Array.from({ length: metricCount }, () => zeroVector(featureCount));
    for (const sampledCluster of draw) {
      const cluster = sampledCluster;
      for (let left = 0; left < featureCount; left += 1) {
        for (let right = 0; right < featureCount; right += 1)
          xtx[left][right] += perClusterXtx[cluster][left][right];
        for (let metric = 0; metric < metricCount; metric += 1)
          xty[metric][left] += perClusterXty[cluster][metric][left];
      }
    }
    const betas = solveMultiRhs(xtx, xty);
    if (!betas) {
      invalidReplicates += 1;
      continue;
    }
    for (let metric = 0; metric < metricCount; metric += 1) {
      const vectors = vectorsBySpec[metric];
      const beta = betas[metric];
      let output = 0;
      for (const vector of vectors.nominal) bootstrapValues[metric][output++].push(dot(vector, beta));
      for (const vector of vectors.opening) bootstrapValues[metric][output++].push(dot(vector, beta));
      for (const [left, right] of PAIRS)
        bootstrapValues[metric][output++].push(dot(vectors.nominal[right], beta) - dot(vectors.nominal[left], beta));
      for (const [left, right] of PAIRS)
        bootstrapValues[metric][output++].push(dot(vectors.opening[right], beta) - dot(vectors.opening[left], beta));
    }
  }
  const complete = invalidReplicates === 0 && draws.length === options.requestedReplicates;
  return base.map((result, metric) => {
    result.bootstrap = {
      requestedReplicates: options.requestedReplicates,
      identifiedReplicates: options.requestedReplicates - invalidReplicates,
      invalidReplicates,
      seed: options.bootstrapSeed,
      complete,
    };
    if (!complete) {
      result.status = "inconclusive";
      result.reason = `Bootstrap had ${invalidReplicates} singular replicate(s); R2 requires every requested replicate to be identified.`;
      return result;
    }
    let output = 0;
    for (const estimate of result.standardizedNominalSeat) {
      const sorted = bootstrapValues[metric][output++].sort((a, b) => a - b);
      estimate.estimate.ci95 = [quantile(sorted, 0.025)!, quantile(sorted, 0.975)!];
    }
    for (const estimate of result.standardizedOpeningTurnPosition) {
      const sorted = bootstrapValues[metric][output++].sort((a, b) => a - b);
      estimate.estimate.ci95 = [quantile(sorted, 0.025)!, quantile(sorted, 0.975)!];
    }
    for (const contrast of result.nominalSeatContrasts) {
      const sorted = bootstrapValues[metric][output++].sort((a, b) => a - b);
      contrast.ci95 = [quantile(sorted, 0.025)!, quantile(sorted, 0.975)!];
    }
    for (const contrast of result.openingTurnPositionContrasts) {
      const sorted = bootstrapValues[metric][output++].sort((a, b) => a - b);
      contrast.ci95 = [quantile(sorted, 0.025)!, quantile(sorted, 0.975)!];
    }
    return result;
  });
}

function targetTotals(rows: readonly R2AuditRow[], plannedClusters: readonly string[]): AccessTargetTotal[] {
  return ([
    ["neutralVillage", "neutral_village"],
    ["opponentCapitalApproach", "opponent_capital_approach"],
  ] as const).map(([key, targetClass]) => {
    const byCluster = new Map<string, { placementRows: number; target: number; accessible: number; inaccessible: number }>();
    for (const row of rows) {
      for (const placement of row.initialPlacements ?? []) {
        const summary = placement.lawfulAccess[key];
        const current = byCluster.get(row.worldClusterId) ?? { placementRows: 0, target: 0, accessible: 0, inaccessible: 0 };
        current.placementRows += 1;
        current.target += summary.targetCount;
        current.accessible += summary.accessibleTargetCount;
        current.inaccessible += summary.inaccessibleTargetCount;
        byCluster.set(row.worldClusterId, current);
      }
    }
    const entries = plannedClusters.map(worldClusterId => {
      const current = byCluster.get(worldClusterId) ?? { placementRows: 0, target: 0, accessible: 0, inaccessible: 0 };
      return {
        worldClusterId,
        placementRows: current.placementRows,
        rawTargetCount: current.target,
        rawAccessibleTargetCount: current.accessible,
        rawInaccessibleTargetCount: current.inaccessible,
      };
    });
    return {
      targetClass,
      placementRows: entries.reduce((sum, entry) => sum + entry.placementRows, 0),
      rawTargetCount: entries.reduce((sum, entry) => sum + entry.rawTargetCount, 0),
      rawAccessibleTargetCount: entries.reduce((sum, entry) => sum + entry.rawAccessibleTargetCount, 0),
      rawInaccessibleTargetCount: entries.reduce((sum, entry) => sum + entry.rawInaccessibleTargetCount, 0),
      byWorldCluster: entries,
    };
  });
}

function capabilityDiagnostic(rows: readonly R2AuditRow[]): CapabilityCollinearityDiagnostic {
  const definitions = [...new Set(rows.flatMap(row => row.initialPlacements?.map(placement => placement.definitionIndex) ?? []))].sort((a, b) => a - b);
  const checked = definitions.length > 0 ? definitions : Array.from({ length: TRIBE_DEFS.length }, (_, index) => index);
  const pairs = checked.map(index => {
    const definition = TRIBE_DEFS[index];
    const signature = stableTechSignature([definition.startTech]);
    const passive = definition.passive;
    // harvestCost's shipped rule is exactly passive === harvesters ? 1 : 2.
    const cost = passive === "harvesters" ? 1 : 2;
    return { signature, passive, cost };
  });
  const signatureToPassive = new Map<string, string>();
  const passiveToSignature = new Map<string, string>();
  const passiveToCost = new Map<string, number>();
  let oneToOne = true;
  let costFunction = true;
  for (const pair of pairs) {
    if (signatureToPassive.has(pair.signature) && signatureToPassive.get(pair.signature) !== pair.passive) oneToOne = false;
    if (passiveToSignature.has(pair.passive) && passiveToSignature.get(pair.passive) !== pair.signature) oneToOne = false;
    if (passiveToCost.has(pair.passive) && passiveToCost.get(pair.passive) !== pair.cost) costFunction = false;
    signatureToPassive.set(pair.signature, pair.passive);
    passiveToSignature.set(pair.passive, pair.signature);
    passiveToCost.set(pair.passive, pair.cost);
  }
  if (signatureToPassive.size !== passiveToSignature.size) oneToOne = false;
  const finite = rows.flatMap(row =>
    (row.initialPlacements ?? []).flatMap(placement =>
      Number.isFinite(placement.immediatelyHarvestableOwnedResources) && placement.openingTurnPosition !== null
        ? [{
            rowKey: "diagnostic",
            clusterId: row.worldClusterId,
            nominalSeat: placement.nominalSeat,
            openingTurnPosition: placement.openingTurnPosition,
            preset: row.preset,
            rosterId: row.rosterId,
            definitionIndex: placement.definitionIndex,
            initialStars: placement.initialStars,
            initialTechSignature: placement.initialTechSignature,
            passive: placement.passive,
            harvestCost: placement.harvestCost,
            value: placement.immediatelyHarvestableOwnedResources,
          }]
        : []
    )
  );
  let starsStatus: CapabilityCollinearityDiagnostic["observedInitialStarsDiagnostic"]["status"] = "not_available";
  let rankWith: number | null = null;
  let rankWithout: number | null = null;
  if (finite.length > 0) {
    // Compare the initialStars column to every other column in the *full
    // frozen* capability bundle: nominal seat, opening position, preset,
    // roster, technology signature, passive, and harvest cost.  This is a
    // bounded rank comparison, not a coefficient-selection routine; no column
    // is removed from the actual R2 fit on the basis of its result.
    const initialStarsIndex = capabilityFeatureNames().indexOf("initialStars");
    if (initialStarsIndex < 0) throw new Error("R2 capability design lacks initialStars.");
    const full = finite.map(row => capabilityDesign(row));
    rankWith = matrixRank(full);
    rankWithout = matrixRank(
      full.map(row => row.filter((_, index) => index !== initialStarsIndex))
    );
    starsStatus = rankWith === rankWithout ? "collinear_in_observed_rows" : "not_collinear_in_observed_rows";
  }
  // Static shipped-code check: newGame initializes stars as 5 + nominal seat.
  // It immediately begins exactly the realized opening actor's turn; every
  // all-AI normal-game capital has fixed initial income and the first actor's
  // actPos is zero. Thus recorded initialStars is a deterministic function of
  // nominal seat and openingTurnPosition (the opening actor indicator), before
  // any map metric or outcome is consulted. This does not use it to alter the
  // frozen model; it documents another exact redundancy in that full model.
  const initialStarsEncodedBySeatAndOpeningPosition = true;
  const structurallyCollinear =
    oneToOne || costFunction || initialStarsEncodedBySeatAndOpeningPosition;
  return {
    status: structurallyCollinear ? "structurally_collinear" : "not_structurally_collinear",
    checkedDefinitions: checked,
    techSignatureByPassiveIsOneToOne: oneToOne,
    harvestCostIsFunctionOfPassive: costFunction,
    initialStarsIsDeterministicallyEncodedBySeatAndOpeningPosition:
      initialStarsEncodedBySeatAndOpeningPosition,
    explanation: structurallyCollinear
      ? "The R2-required capability covariate bundle has exact redundant columns: newGame initialStars is deterministically encoded by nominal seat and the realized opening-actor indicator; initial technology signature and passive partition the scheduled definitions one-to-one; and shipped harvestCost is a function of passive. The frozen full capability model is therefore structurally singular; it is retained unchanged and reported INCONCLUSIVE rather than dropping a covariate."
      : "No structural redundancy was found in the checked frozen capability covariate categories.",
    observedInitialStarsDiagnostic: {
      status: starsStatus,
      finiteRows: finite.length,
      rankWithInitialStars: rankWith,
      rankWithoutInitialStars: rankWithout,
      explanation:
        starsStatus === "not_available"
          ? "No finite capability rows are available; the bounded initialStars rank diagnostic was not run."
          : "This is an observed-row rank diagnostic of initialStars against the full remaining frozen capability bundle: intercept, nominal seat, opening position, preset, roster, initial-tech signature, passive, and harvest cost. It does not change the frozen model or convert a structurally singular model into an identified one.",
    },
  };
}

export function analyzeStartPositionAuditR2(
  rows: readonly R2AuditRow[],
  options?: {
    plannedClusterIds?: readonly string[];
    bootstrapReplicates?: number;
    bootstrapSeed?: number;
  }
): R2Analysis {
  const plannedClusters = [...new Set(options?.plannedClusterIds ?? rows.map(row => row.worldClusterId))].sort();
  const replicates = options?.bootstrapReplicates ?? START_POSITION_R2_BOOTSTRAP_REPLICATES;
  const seed = options?.bootstrapSeed ?? START_POSITION_R2_BOOTSTRAP_SEED;
  if (plannedClusters.length === 0) {
    const primarySpec: InferenceSpec = {
      metricId: "win_indicator",
      label: "30-turn all-AI win indicator",
      units: "probability",
      rawRowPointer: "rows[].tribes[]",
      family: "primary",
      resultFamily: "primary_outcome",
      finite: [],
      nullCount: 0,
      clusterNullCounts: new Map(),
    };
    return {
      primary: emptyInference(primarySpec, [], "No planned world clusters supplied; inference is inconclusive."),
      physicalMetrics: R2_PHYSICAL_METRICS.map(definition =>
        emptyInference({
          metricId: definition.metricId,
          label: definition.label,
          units: definition.units,
          rawRowPointer: "rows[].initialPlacements[]",
          family: "physical",
          resultFamily: definition.family,
          finite: [],
          nullCount: 0,
          clusterNullCounts: new Map(),
        }, [], "No planned world clusters supplied; inference is inconclusive.")
      ),
      capabilityMetrics: [emptyInference({
        metricId: R2_CAPABILITY_METRIC.metricId,
        label: R2_CAPABILITY_METRIC.label,
        units: R2_CAPABILITY_METRIC.units,
        rawRowPointer: "rows[].initialPlacements[]",
        family: "capability",
        resultFamily: R2_CAPABILITY_METRIC.family,
        finite: [],
        nullCount: 0,
        clusterNullCounts: new Map(),
      }, [], "No planned world clusters supplied; inference is inconclusive.")],
      accessTargetTotals: targetTotals(rows, []),
      capabilityCollinearity: capabilityDiagnostic(rows),
    };
  }
  const draws = bootstrapClusterDraws(plannedClusters.length, replicates, seed);
  const primaryRows = primaryRegressionRows(rows);
  const primarySpec: InferenceSpec = {
    metricId: "win_indicator",
    label: "30-turn all-AI win indicator",
    units: "probability",
    rawRowPointer: "rows[].tribes[]",
    family: "primary",
    resultFamily: "primary_outcome",
    finite: primaryRows,
    nullCount: 0,
    clusterNullCounts: new Map(),
  };
  const physicalSpecs: InferenceSpec[] = R2_PHYSICAL_METRICS.map(definition => {
    const regression = regressionRowsForMetric(rows, definition);
    return {
      metricId: definition.metricId,
      label: definition.label,
      units: definition.units,
      rawRowPointer: "rows[].initialPlacements[]",
      family: "physical",
      resultFamily: definition.family,
      finite: regression.finite,
      nullCount: regression.nullCount,
      clusterNullCounts: regression.clusterNullCounts,
    };
  });
  const capabilityRegression = regressionRowsForMetric(rows, R2_CAPABILITY_METRIC);
  const capabilitySpec: InferenceSpec = {
    metricId: R2_CAPABILITY_METRIC.metricId,
    label: R2_CAPABILITY_METRIC.label,
    units: R2_CAPABILITY_METRIC.units,
    rawRowPointer: "rows[].initialPlacements[]",
    family: "capability",
    resultFamily: "capability_affordability",
    finite: capabilityRegression.finite,
    nullCount: capabilityRegression.nullCount,
    clusterNullCounts: capabilityRegression.clusterNullCounts,
  };
  const all = [primarySpec, ...physicalSpecs, capabilitySpec];
  const results = groupInferenceSpecs(all).flatMap(group =>
    inferGrouped(group, plannedClusters, draws, { bootstrapSeed: seed, requestedReplicates: replicates })
  );
  const byId = new Map(results.map(result => [result.metricId, result]));
  return {
    primary: byId.get("win_indicator")!,
    physicalMetrics: R2_PHYSICAL_METRICS.map(definition => byId.get(definition.metricId)!),
    capabilityMetrics: [byId.get(R2_CAPABILITY_METRIC.metricId)!],
    accessTargetTotals: targetTotals(rows, plannedClusters),
    capabilityCollinearity: capabilityDiagnostic(rows),
  };
}

export function r2PrimaryTriageSignal(primary: MetricInference): boolean {
  if (primary.status !== "estimated" || !primary.bootstrap.complete) return false;
  return primary.nominalSeatContrasts.some(contrast => {
    if (!contrast.ci95 || Math.abs(contrast.estimate) < 0.1) return false;
    return (contrast.estimate > 0 && contrast.ci95[0] > 0.05) || (contrast.estimate < 0 && contrast.ci95[1] < -0.05);
  });
}
