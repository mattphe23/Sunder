import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canHarvest, reachableTiles } from "../../client/src/game/core/rules";
import type { GameState, Tile, Unit } from "../../client/src/game/core/types";
import type { MapPreset } from "../../client/src/game/core/mapgen";
import { remapRoster } from "./balancePaired";

/**
 * Tooling-only start-position measurements.
 *
 * This module deliberately does not implement terrain passability, movement
 * costs, technology gates, or path-finding rules. Every state-derived edge is
 * obtained from the shipped `reachableTiles` predicate after placing a real
 * initial unit at a candidate position in an otherwise frozen initial state.
 */

export const START_POSITION_PROTOCOL_ID =
  "start-position-access-audit-20261025-r1";
export const START_POSITION_PROTOCOL_VERSION = 1;
export const START_POSITION_BASELINE_SHA =
  "1db1a102cb361ec0bf0a8579833fdbc7e3eaf94b";
/** SHA-256 of the independently reviewable external protocol at freeze. */
export const START_POSITION_PROTOCOL_SHA256 =
  "89b272313badd104e8b9c3037a3d7ae69022c8f086776168a808b76f82486262";
export const START_POSITION_EXPECTED_MATCHES = 512;
export const START_POSITION_TURN_CAP = 30;
export const START_POSITION_BOARD_SIZE = 13;
export const START_POSITION_PROCESS_CAP_MS = 1_800_000;
export const START_POSITION_APPROVAL_VALUE = "approved-by-parent";
export const START_POSITION_PRIOR_SEED_RANGE = [8_194_401, 8_194_416] as const;

const FROZEN_SEED_BLOCKS = [
  {
    id: "continents-9273001-9273016",
    preset: "continents",
    firstSeed: 9_273_001,
  },
  {
    id: "archipelago-9274001-9274016",
    preset: "archipelago",
    firstSeed: 9_274_001,
  },
] as const;

const FROZEN_MIXED_ROSTERS = [
  { id: "mixed-01", definitionIndices: [0, 1, 4, 5] },
  { id: "mixed-02", definitionIndices: [2, 3, 6, 7] },
  { id: "mixed-03", definitionIndices: [0, 2, 5, 7] },
  { id: "mixed-04", definitionIndices: [1, 3, 4, 6] },
] as const;

export interface TerrainCounts {
  ocean: number;
  water: number;
  grass: number;
  forest: number;
  mountain: number;
}

export interface ResourceCounts {
  fruit: number;
  animal: number;
  mineral: number;
}

export type AccessTargetClass = "neutral_village" | "opponent_capital_approach";

export interface AccessTargetResult {
  /** Stable target identity scoped to a tribe placement. */
  id: string;
  targetClass: AccessTargetClass;
  x: number;
  y: number;
  /** Geometric comparator only; never a legal-path substitute. */
  manhattanFromCapital: number;
  /** Null means no initial unit has a lawful path in the frozen-state graph. */
  legalFullTurnHops: number | null;
  /** Physical transit tiles that are mandatory across all real initial units. */
  mandatoryTransitTileKeys: string[];
}

export interface AccessClassSummary {
  targetClass: AccessTargetClass;
  targetCount: number;
  accessibleTargetCount: number;
  inaccessibleTargetCount: number;
  /** Null only when this target class has no candidates. */
  nearestTargetManhattan: number | null;
  /** Null when candidates exist but none is lawfully reachable. */
  nearestLegalFullTurnHops: number | null;
  /** Union of mandatory physical transit tiles for targets in this class. */
  chokepointTileKeys: string[];
  chokepointTileCount: number;
}

export interface InitialUnitAccess {
  unitId: number;
  unitType: string;
  start: { x: number; y: number };
  /** Node count in this unit's lawful full-turn layer. */
  legalGraphNodeCount: number;
}

export interface StartPositionMetrics {
  nominalSeat: number;
  openingTurnPosition: number | null;
  definitionIndex: number;
  tribeName: string;
  capital: { x: number; y: number };
  initialStars: number;
  initialTechs: string[];
  startingOwnedTerrain: TerrainCounts;
  capitalAdjacentTerrain: TerrainCounts;
  ownedResources: ResourceCounts;
  ownedResourceTotal: number;
  immediatelyHarvestableOwnedResources: number;
  /** Direct union of the real units' shipped one-turn legal endpoints. */
  firstTurnLegalReachableTileCount: number;
  firstTurnLegalNeutralExpansionTileCount: number;
  firstTurnLegalNeutralVillageCount: number;
  firstTurnLegalReachableTerrain: TerrainCounts;
  initialUnits: InitialUnitAccess[];
  lawfulAccess: {
    neutralVillage: AccessClassSummary;
    opponentCapitalApproach: AccessClassSummary;
    targets: AccessTargetResult[];
  };
}

export interface FrozenSeedBlock {
  id: string;
  preset: MapPreset;
  worldSeeds: number[];
}

export interface FrozenMixedRoster {
  id: string;
  definitionIndices: number[];
}

export interface StartPositionProtocol {
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
    freshSeedBlocks: FrozenSeedBlock[];
    knownPriorObservedSeedRangeExcluded: [number, number];
    expectedCounts: {
      uniqueRngSeeds: number;
      seedPresetWorlds: number;
      matchesPerWorld: number;
      totalMatches: number;
    };
    mixedRosters: FrozenMixedRoster[];
    nominalSeatRotations: number[];
  };
  analysisPlan: {
    inference: string;
  };
  decisionRuleBeforeMeasurement: {
    signalThreshold: string;
    inconclusive: string;
  };
  evidenceRetention: {
    externalOutputRequired: string;
    noReplacement: string;
  };
}

export interface StartPositionScenario {
  id: string;
  seedBlockId: string;
  worldClusterId: string;
  worldSeed: number;
  randomSeed: number;
  preset: MapPreset;
  rosterId: string;
  rosterOriginalIndices: number[];
  rosterRemappedIndices: number[];
  nominalRotation: number;
}

export interface DirectedTopologyTarget {
  id: string;
  /** Nodes that occupy the physical target; empty means inaccessible. */
  nodeKeys: string[];
  /** A physical key lets one tile removal affect multiple unit layers. */
  physicalKey: string;
}

export interface DirectedTopology {
  /** One or more start nodes, normally one per actual initial unit. */
  startNodeKeys: string[];
  adjacency: ReadonlyMap<string, readonly string[]>;
  /** Maps every graph-layer node to its physical board tile. */
  physicalKeyByNode: ReadonlyMap<string, string>;
  targets: DirectedTopologyTarget[];
}

export interface DirectedTopologyTargetResult {
  id: string;
  reachable: boolean;
  legalFullTurnHops: number | null;
  mandatoryTransitPhysicalKeys: string[];
}

export interface DirectedTopologyAnalysis {
  targetResults: DirectedTopologyTargetResult[];
  chokepointPhysicalKeys: string[];
}

interface LawfulLayer {
  unit: Unit;
  startNodeKey: string;
  nodeCount: number;
}

function emptyTerrainCounts(): TerrainCounts {
  return { ocean: 0, water: 0, grass: 0, forest: 0, mountain: 0 };
}

function emptyResourceCounts(): ResourceCounts {
  return { fruit: 0, animal: 0, mineral: 0 };
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function nodeKey(unitId: number, x: number, y: number): string {
  return `${unitId}@${tileKey(x, y)}`;
}

function manhattan(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function isChebyshevAdjacent(
  from: { x: number; y: number },
  to: { x: number; y: number }
): boolean {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  return Math.max(dx, dy) === 1;
}

function coordinateFromTileKey(key: string): { x: number; y: number } {
  const [rawX, rawY] = key.split(",");
  return { x: Number(rawX), y: Number(rawY) };
}

function inBounds(state: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.size && y < state.size;
}

function sortedKeys(keys: Iterable<string>): string[] {
  return [...keys].sort((left, right) => {
    const a = coordinateFromTileKey(left);
    const b = coordinateFromTileKey(right);
    return a.y - b.y || a.x - b.x;
  });
}

function cloneRelocatedState(
  state: GameState,
  template: Unit,
  x: number,
  y: number
): { state: GameState; unit: Unit } {
  // Retain all real initial blockers, terrain, ports, technologies and weather.
  // Only the template unit itself moves between graph nodes and is refreshed for
  // a hypothetical next full turn; no game state is mutated.
  const unit = { ...template, x, y, moved: false, attacked: false };
  return {
    state: {
      ...state,
      units: state.units
        .filter(candidate => candidate.id !== template.id)
        .concat(unit),
    },
    unit,
  };
}

function buildLawfulTopology(
  state: GameState,
  tribeIndex: number
): {
  topology: DirectedTopology;
  layers: LawfulLayer[];
} {
  const initialUnits = state.units.filter(unit => unit.tribe === tribeIndex);
  const adjacency = new Map<string, readonly string[]>();
  const physicalKeyByNode = new Map<string, string>();
  const startNodeKeys: string[] = [];
  const layers: LawfulLayer[] = [];

  for (const unit of initialUnits) {
    const start = nodeKey(unit.id, unit.x, unit.y);
    startNodeKeys.push(start);
    const queue: Array<{ x: number; y: number }> = [{ x: unit.x, y: unit.y }];
    const seen = new Set<string>([tileKey(unit.x, unit.y)]);
    let cursor = 0;

    while (cursor < queue.length) {
      const current = queue[cursor++];
      const currentNode = nodeKey(unit.id, current.x, current.y);
      physicalKeyByNode.set(currentNode, tileKey(current.x, current.y));
      const relocated = cloneRelocatedState(state, unit, current.x, current.y);
      const endpoints = reachableTiles(relocated.state, relocated.unit);
      const nextNodes: string[] = [];
      for (const endpoint of endpoints) {
        const endpointNode = nodeKey(unit.id, endpoint.x, endpoint.y);
        nextNodes.push(endpointNode);
        physicalKeyByNode.set(endpointNode, tileKey(endpoint.x, endpoint.y));
        const endpointKey = tileKey(endpoint.x, endpoint.y);
        if (!seen.has(endpointKey)) {
          seen.add(endpointKey);
          queue.push({ x: endpoint.x, y: endpoint.y });
        }
      }
      adjacency.set(currentNode, nextNodes);
    }
    layers.push({ unit, startNodeKey: start, nodeCount: seen.size });
  }

  return {
    topology: { startNodeKeys, adjacency, physicalKeyByNode, targets: [] },
    layers,
  };
}

function reachableNodes(
  topology: DirectedTopology,
  blockedPhysicalKey?: string
): Map<string, number> {
  const distances = new Map<string, number>();
  const queue: string[] = [];
  for (const start of topology.startNodeKeys) {
    if (topology.physicalKeyByNode.get(start) === blockedPhysicalKey) continue;
    distances.set(start, 0);
    queue.push(start);
  }
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor++];
    const currentDistance = distances.get(current)!;
    for (const next of topology.adjacency.get(current) ?? []) {
      if (topology.physicalKeyByNode.get(next) === blockedPhysicalKey) continue;
      if (distances.has(next)) continue;
      distances.set(next, currentDistance + 1);
      queue.push(next);
    }
  }
  return distances;
}

function targetDistance(
  target: DirectedTopologyTarget,
  distances: ReadonlyMap<string, number>
): number | null {
  const candidates = target.nodeKeys
    .map(key => distances.get(key))
    .filter((distance): distance is number => distance !== undefined);
  return candidates.length === 0 ? null : Math.min(...candidates);
}

/**
 * Analyze a supplied directed topology. This narrow pure helper is intentionally
 * testable with synthetic graphs; observed audit rows never construct topology
 * by hand and instead call buildLawfulTopology above.
 */
export function analyzeDirectedTopology(
  topology: DirectedTopology
): DirectedTopologyAnalysis {
  const baseline = reachableNodes(topology);
  const baselineTargetDistances = new Map(
    topology.targets.map(target => [
      target.id,
      targetDistance(target, baseline),
    ])
  );
  const originPhysicalKeys = new Set(
    topology.startNodeKeys
      .map(key => topology.physicalKeyByNode.get(key))
      .filter((key): key is string => key !== undefined)
  );
  const targetPhysicalKeys = new Set(
    topology.targets.map(target => target.physicalKey)
  );
  const candidatePhysicalKeys = new Set(topology.physicalKeyByNode.values());
  const mandatoryByTarget = new Map<string, Set<string>>(
    topology.targets.map(target => [target.id, new Set<string>()])
  );

  for (const candidate of candidatePhysicalKeys) {
    if (originPhysicalKeys.has(candidate) || targetPhysicalKeys.has(candidate))
      continue;
    const blocked = reachableNodes(topology, candidate);
    for (const target of topology.targets) {
      if (baselineTargetDistances.get(target.id) === null) continue;
      if (targetDistance(target, blocked) === null) {
        mandatoryByTarget.get(target.id)!.add(candidate);
      }
    }
  }

  const targetResults = topology.targets.map(target => ({
    id: target.id,
    reachable: baselineTargetDistances.get(target.id) !== null,
    legalFullTurnHops: baselineTargetDistances.get(target.id) ?? null,
    mandatoryTransitPhysicalKeys: sortedKeys(
      mandatoryByTarget.get(target.id) ?? []
    ),
  }));
  const chokepointPhysicalKeys = sortedKeys(
    targetResults.flatMap(target => target.mandatoryTransitPhysicalKeys)
  );
  return {
    targetResults,
    chokepointPhysicalKeys: [...new Set(chokepointPhysicalKeys)],
  };
}

function targetsForTribe(
  state: GameState,
  tribeIndex: number,
  capital: { x: number; y: number },
  topology: DirectedTopology
): Array<AccessTargetResult & { physicalKey: string }> {
  const nodeKeysByPhysicalKey = new Map<string, string[]>();
  for (const [node, physicalKey] of topology.physicalKeyByNode) {
    const nodes = nodeKeysByPhysicalKey.get(physicalKey) ?? [];
    nodes.push(node);
    nodeKeysByPhysicalKey.set(physicalKey, nodes);
  }
  const occupied = new Set(state.units.map(unit => tileKey(unit.x, unit.y)));
  const neutralVillageTiles = state.tiles.filter(tile => {
    const city = tile.cityId === null ? null : state.cities[tile.cityId];
    return city?.tribe === null;
  });
  const opponentCapitals = state.cities.filter(
    city => city.tribe !== null && city.tribe !== tribeIndex && city.isCapital
  );
  const approachTiles = new Map<string, Tile>();
  for (const opponentCapital of opponentCapitals) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const x = opponentCapital.x + dx;
        const y = opponentCapital.y + dy;
        if (!inBounds(state, x, y) || occupied.has(tileKey(x, y))) continue;
        const tile = state.tiles[y * state.size + x];
        approachTiles.set(tileKey(x, y), tile);
      }
    }
  }

  const topologyTargets: Array<
    DirectedTopologyTarget & {
      targetClass: AccessTargetClass;
      x: number;
      y: number;
      manhattanFromCapital: number;
    }
  > = [
    ...neutralVillageTiles.map(tile => ({
      id: `neutral-village-${tileKey(tile.x, tile.y)}`,
      targetClass: "neutral_village" as const,
      x: tile.x,
      y: tile.y,
      physicalKey: tileKey(tile.x, tile.y),
      nodeKeys: nodeKeysByPhysicalKey.get(tileKey(tile.x, tile.y)) ?? [],
      manhattanFromCapital: manhattan(capital, tile),
    })),
    ...[...approachTiles.values()].map(tile => ({
      id: `opponent-capital-approach-${tileKey(tile.x, tile.y)}`,
      targetClass: "opponent_capital_approach" as const,
      x: tile.x,
      y: tile.y,
      physicalKey: tileKey(tile.x, tile.y),
      nodeKeys: nodeKeysByPhysicalKey.get(tileKey(tile.x, tile.y)) ?? [],
      manhattanFromCapital: manhattan(capital, tile),
    })),
  ];
  const analysis = analyzeDirectedTopology({
    ...topology,
    targets: topologyTargets,
  });
  const byId = new Map(
    analysis.targetResults.map(result => [result.id, result])
  );
  return topologyTargets.map(target => {
    const result = byId.get(target.id)!;
    return {
      id: target.id,
      targetClass: target.targetClass,
      x: target.x,
      y: target.y,
      physicalKey: target.physicalKey,
      manhattanFromCapital: target.manhattanFromCapital,
      legalFullTurnHops: result.legalFullTurnHops,
      mandatoryTransitTileKeys: result.mandatoryTransitPhysicalKeys,
    };
  });
}

function summarizeAccessClass(
  targetClass: AccessTargetClass,
  targets: readonly AccessTargetResult[]
): AccessClassSummary {
  const inClass = targets.filter(target => target.targetClass === targetClass);
  const accessible = inClass.filter(
    target => target.legalFullTurnHops !== null
  );
  const chokepoints = sortedKeys(
    new Set(accessible.flatMap(target => target.mandatoryTransitTileKeys))
  );
  return {
    targetClass,
    targetCount: inClass.length,
    accessibleTargetCount: accessible.length,
    inaccessibleTargetCount: inClass.length - accessible.length,
    nearestTargetManhattan:
      inClass.length === 0
        ? null
        : Math.min(...inClass.map(target => target.manhattanFromCapital)),
    nearestLegalFullTurnHops:
      accessible.length === 0
        ? null
        : Math.min(
            ...accessible.map(target => target.legalFullTurnHops as number)
          ),
    chokepointTileKeys: chokepoints,
    chokepointTileCount: chokepoints.length,
  };
}

/**
 * Measure an actual fresh GameStore state without mutation. Geometric fields
 * are explicitly labelled Manhattan; every legal-access result originates from
 * shipped reachableTiles and preserves the real tribe/unit constraints.
 */
export function measureStartPositions(
  state: GameState
): StartPositionMetrics[] {
  const openingOrder =
    state.turnOrder ?? state.tribes.map(tribe => tribe.index);

  return state.tribes.map(tribe => {
    const capital = state.cities.find(
      city => city.tribe === tribe.index && city.isCapital
    );
    if (!capital) {
      throw new Error(`Missing capital for nominal seat ${tribe.index}.`);
    }

    const startingOwnedTerrain = emptyTerrainCounts();
    const capitalAdjacentTerrain = emptyTerrainCounts();
    const ownedResources = emptyResourceCounts();
    let immediatelyHarvestableOwnedResources = 0;

    for (const tile of state.tiles) {
      if (tile.ownerCityId === capital.id) {
        startingOwnedTerrain[tile.terrain] += 1;
        if (tile.resource) {
          ownedResources[tile.resource] += 1;
          if (canHarvest(state, tribe.index, tile)) {
            immediatelyHarvestableOwnedResources += 1;
          }
        }
      }
      if (isChebyshevAdjacent(capital, tile)) {
        capitalAdjacentTerrain[tile.terrain] += 1;
      }
    }

    const firstTurnReachable = new Set<string>();
    for (const unit of state.units) {
      if (unit.tribe !== tribe.index) continue;
      for (const tile of reachableTiles(state, unit)) {
        firstTurnReachable.add(tileKey(tile.x, tile.y));
      }
    }
    const firstTurnLegalReachableTerrain = emptyTerrainCounts();
    let firstTurnLegalNeutralExpansionTileCount = 0;
    let firstTurnLegalNeutralVillageCount = 0;
    for (const key of firstTurnReachable) {
      const point = coordinateFromTileKey(key);
      const tile = state.tiles[point.y * state.size + point.x];
      firstTurnLegalReachableTerrain[tile.terrain] += 1;
      if (tile.ownerCityId === null) {
        firstTurnLegalNeutralExpansionTileCount += 1;
        const city = tile.cityId === null ? null : state.cities[tile.cityId];
        if (city?.tribe === null) firstTurnLegalNeutralVillageCount += 1;
      }
    }

    const { topology, layers } = buildLawfulTopology(state, tribe.index);
    const targets = targetsForTribe(state, tribe.index, capital, topology);
    const ownedResourceTotal = Object.values(ownedResources).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      nominalSeat: tribe.index,
      openingTurnPosition: openingOrder.indexOf(tribe.index),
      definitionIndex: tribe.defIndex,
      tribeName: tribe.name,
      capital: { x: capital.x, y: capital.y },
      initialStars: tribe.stars,
      initialTechs: [...tribe.techs],
      startingOwnedTerrain,
      capitalAdjacentTerrain,
      ownedResources,
      ownedResourceTotal,
      immediatelyHarvestableOwnedResources,
      firstTurnLegalReachableTileCount: firstTurnReachable.size,
      firstTurnLegalNeutralExpansionTileCount,
      firstTurnLegalNeutralVillageCount,
      firstTurnLegalReachableTerrain,
      initialUnits: layers.map(layer => ({
        unitId: layer.unit.id,
        unitType: layer.unit.type,
        start: { x: layer.unit.x, y: layer.unit.y },
        legalGraphNodeCount: layer.nodeCount,
      })),
      lawfulAccess: {
        neutralVillage: summarizeAccessClass("neutral_village", targets),
        opponentCapitalApproach: summarizeAccessClass(
          "opponent_capital_approach",
          targets
        ),
        targets,
      },
    };
  });
}

/** Actual terrain only: no resources/cities/units or generated identities. */
export function terrainFingerprint(state: Pick<GameState, "tiles">): string {
  return sha256(
    JSON.stringify(state.tiles.map(tile => [tile.x, tile.y, tile.terrain]))
  );
}

/** Full generated map layout, excluding transient unit state and outcomes. */
export function mapLayoutFingerprint(
  state: Pick<GameState, "tiles" | "cities">
): string {
  return sha256(
    JSON.stringify({
      tiles: state.tiles.map(tile => [
        tile.x,
        tile.y,
        tile.terrain,
        tile.resource,
        tile.cityId,
        tile.ownerCityId,
        tile.port,
        tile.ruin,
        tile.greatRuin,
        tile.building ?? null,
        tile.road ?? false,
      ]),
      cities: state.cities.map(city => [
        city.id,
        city.x,
        city.y,
        city.tribe,
        city.level,
        city.population,
        city.isCapital,
        city.borderRadius ?? null,
      ]),
    })
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isMapPreset(value: unknown): value is MapPreset {
  return (
    value === "continents" ||
    value === "archipelago" ||
    value === "highlands" ||
    value === "pangaea"
  );
}

function protocolError(detail: string): never {
  throw new Error(`Invalid frozen start-position protocol: ${detail}`);
}

/** Refuse a protocol whose reviewed, external bytes have changed. */
export function frozenProtocolSha256(path: string): string {
  const digest = sha256(readFileSync(path, "utf8"));
  if (digest !== START_POSITION_PROTOCOL_SHA256) {
    throw new Error(
      `Frozen protocol SHA-256 mismatch: expected ${START_POSITION_PROTOCOL_SHA256}, received ${digest}. Create and independently review a new protocol rather than modifying this sample.`
    );
  }
  return digest;
}

/** Read and validate the externally frozen protocol before an observed run. */
export function readStartPositionProtocol(path: string): StartPositionProtocol {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object")
    protocolError("root must be an object");
  const protocol = parsed as StartPositionProtocol;
  if (
    protocol.protocolVersion !== START_POSITION_PROTOCOL_VERSION ||
    protocol.protocolId !== START_POSITION_PROTOCOL_ID
  ) {
    protocolError("unexpected protocol id or version");
  }
  if (protocol.status !== "frozen_pending_independent_parent_review") {
    protocolError("unexpected frozen status");
  }
  if (
    protocol.sourceIdentityAtFreeze?.requiredBaselineCommit !==
    START_POSITION_BASELINE_SHA
  ) {
    protocolError(
      "required baseline commit differs from the reviewed protocol"
    );
  }
  if (protocol.authorizationGate?.observedSampleMayRun !== false) {
    protocolError(
      "protocol must remain frozen with observedSampleMayRun=false"
    );
  }
  if (
    protocol.ordinaryMatchConfiguration?.boardSize !==
      START_POSITION_BOARD_SIZE ||
    protocol.ordinaryMatchConfiguration?.difficulty !== "normal" ||
    protocol.ordinaryMatchConfiguration?.turnCap !== START_POSITION_TURN_CAP ||
    protocol.ordinaryMatchConfiguration?.processCapMs !==
      START_POSITION_PROCESS_CAP_MS ||
    protocol.ordinaryMatchConfiguration?.allAiSetupForObservedOutcome !== -1 ||
    protocol.ordinaryMatchConfiguration?.humanSetupForUserLoadableSave !== 0
  ) {
    protocolError(
      "ordinary match configuration differs from the frozen protocol"
    );
  }
  if (
    !Array.isArray(protocol.sampling?.freshSeedBlocks) ||
    protocol.sampling.freshSeedBlocks.length !== FROZEN_SEED_BLOCKS.length ||
    !Array.isArray(protocol.sampling?.mixedRosters) ||
    protocol.sampling.mixedRosters.length !== FROZEN_MIXED_ROSTERS.length ||
    !Array.isArray(protocol.sampling?.nominalSeatRotations) ||
    protocol.sampling.nominalSeatRotations.join(",") !== "0,1,2,3"
  ) {
    protocolError("expected two seed blocks, four rosters, and four rotations");
  }
  const seenSeeds = new Set<number>();
  for (const [index, block] of protocol.sampling.freshSeedBlocks.entries()) {
    const expected = FROZEN_SEED_BLOCKS[index];
    if (
      !isMapPreset(block.preset) ||
      block.id !== expected.id ||
      block.preset !== expected.preset ||
      block.worldSeeds.length !== 16 ||
      block.worldSeeds.some(
        (seed, offset) => seed !== expected.firstSeed + offset
      )
    ) {
      protocolError(
        `seed block ${block.id} must contain 16 known-preset seeds`
      );
    }
    for (const seed of block.worldSeeds) {
      if (!Number.isSafeInteger(seed) || seed < 0 || seenSeeds.has(seed)) {
        protocolError(`seed ${seed} is invalid or reused`);
      }
      seenSeeds.add(seed);
      if (
        seed >= START_POSITION_PRIOR_SEED_RANGE[0] &&
        seed <= START_POSITION_PRIOR_SEED_RANGE[1]
      ) {
        protocolError(`seed ${seed} overlaps the known prior observed block`);
      }
    }
  }
  if (seenSeeds.size !== 32)
    protocolError("expected exactly 32 unique RNG seeds");
  for (const [index, roster] of protocol.sampling.mixedRosters.entries()) {
    const expected = FROZEN_MIXED_ROSTERS[index];
    if (
      roster.id !== expected.id ||
      roster.definitionIndices.length !== 4 ||
      new Set(roster.definitionIndices).size !== 4 ||
      roster.definitionIndices.some(
        (definitionIndex, rosterIndex) =>
          !Number.isInteger(definitionIndex) ||
          definitionIndex !== expected.definitionIndices[rosterIndex]
      )
    ) {
      protocolError(
        `roster ${roster.id} is not a four-member 0–7 mixed roster`
      );
    }
  }
  if (
    protocol.sampling.maximumMatches !== START_POSITION_EXPECTED_MATCHES ||
    protocol.sampling.matchesPlanned !== START_POSITION_EXPECTED_MATCHES ||
    protocol.sampling.expectedCounts?.totalMatches !==
      START_POSITION_EXPECTED_MATCHES ||
    protocol.sampling.expectedCounts?.seedPresetWorlds !== 32 ||
    protocol.sampling.expectedCounts?.uniqueRngSeeds !== 32 ||
    protocol.sampling.expectedCounts?.matchesPerWorld !== 16
  ) {
    protocolError(
      "sample-size declarations do not describe 32 worlds × 16 matches"
    );
  }
  return protocol;
}

/** Build all and only the externally predeclared scenarios. */
export function buildFrozenStartPositionScenarioMatrix(
  protocol: StartPositionProtocol
): StartPositionScenario[] {
  const scenarios: StartPositionScenario[] = [];
  const ids = new Set<string>();
  for (const block of protocol.sampling.freshSeedBlocks) {
    for (const worldSeed of block.worldSeeds) {
      for (const roster of protocol.sampling.mixedRosters) {
        for (const nominalRotation of protocol.sampling.nominalSeatRotations) {
          const id = [
            `start-${block.id}`,
            `seed${worldSeed}`,
            roster.id,
            `r${nominalRotation}`,
          ].join("-");
          if (ids.has(id))
            throw new Error(`Duplicate frozen scenario id: ${id}`);
          ids.add(id);
          scenarios.push({
            id,
            seedBlockId: block.id,
            worldClusterId: `${block.preset}/seed${worldSeed}`,
            worldSeed,
            randomSeed: worldSeed,
            preset: block.preset,
            rosterId: roster.id,
            rosterOriginalIndices: [...roster.definitionIndices],
            rosterRemappedIndices: remapRoster(
              roster.definitionIndices,
              nominalRotation
            ),
            nominalRotation,
          });
        }
      }
    }
  }
  if (scenarios.length !== START_POSITION_EXPECTED_MATCHES) {
    throw new Error(
      `Frozen matrix has ${scenarios.length} scenarios, expected ${START_POSITION_EXPECTED_MATCHES}.`
    );
  }
  return scenarios;
}
