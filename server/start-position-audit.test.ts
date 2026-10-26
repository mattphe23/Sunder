import { describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size;
  },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { game } from "../client/src/game/core/state";
import { reachableTiles } from "../client/src/game/core/rules";
import {
  START_POSITION_EXPECTED_MATCHES,
  START_POSITION_PRIOR_SEED_RANGE,
  START_POSITION_PROTOCOL_SHA256,
  analyzeDirectedTopology,
  buildFrozenStartPositionScenarioMatrix,
  frozenProtocolSha256,
  measureStartPositions,
  readStartPositionProtocol,
  type DirectedTopology,
} from "../scripts/lib/startPositionAudit";
import {
  START_POSITION_R2_EXPECTED_MATCHES,
  START_POSITION_R2_PROTOCOL_SHA256,
  analyzeStartPositionAuditR2,
  buildFrozenStartPositionAuditR2ScenarioMatrix,
  frozenR2ProtocolSha256,
  readStartPositionAuditR2Protocol,
  verifyR2ScenarioMatrix,
  type R2AuditRow,
  type R2InitialPlacement,
} from "../scripts/lib/startPositionAuditR2";

const protocolPath = resolve(
  import.meta.dirname,
  "fixtures/start-position-audit-r1.json"
);

const r2ProtocolPath = resolve(
  import.meta.dirname,
  "fixtures/start-position-audit-r2.json"
);

function topology(input: {
  adjacency: Record<string, string[]>;
  starts: string[];
  physical: Record<string, string>;
  targets: Array<{ id: string; nodeKeys: string[]; physicalKey: string }>;
}): DirectedTopology {
  return {
    adjacency: new Map(Object.entries(input.adjacency)),
    startNodeKeys: input.starts,
    physicalKeyByNode: new Map(Object.entries(input.physical)),
    targets: input.targets,
  };
}

describe("frozen start-position protocol", () => {
  it("predeclares 32 new independent worlds and 512 rotated outcomes without calling rotations independent", () => {
    const protocol = readStartPositionProtocol(protocolPath);
    const raw = readFileSync(protocolPath, "utf8");
    const matrix = buildFrozenStartPositionScenarioMatrix(protocol);

    expect(raw).toContain("frozen_pending_independent_parent_review");
    expect(frozenProtocolSha256(protocolPath)).toBe(
      START_POSITION_PROTOCOL_SHA256
    );
    expect(protocol.authorizationGate.observedSampleMayRun).toBe(false);
    expect(matrix).toHaveLength(START_POSITION_EXPECTED_MATCHES);
    expect(new Set(matrix.map(scenario => scenario.id)).size).toBe(512);
    expect(new Set(matrix.map(scenario => scenario.worldClusterId)).size).toBe(
      32
    );
    expect(new Set(matrix.map(scenario => scenario.randomSeed)).size).toBe(32);
    expect(
      matrix.every(
        scenario =>
          scenario.worldSeed < START_POSITION_PRIOR_SEED_RANGE[0] ||
          scenario.worldSeed > START_POSITION_PRIOR_SEED_RANGE[1]
      )
    ).toBe(true);

    for (const clusterId of new Set(
      matrix.map(scenario => scenario.worldClusterId)
    )) {
      const members = matrix.filter(
        scenario => scenario.worldClusterId === clusterId
      );
      expect(members).toHaveLength(16);
      expect(new Set(members.map(scenario => scenario.rosterId)).size).toBe(4);
      expect(
        new Set(members.map(scenario => scenario.nominalRotation)).size
      ).toBe(4);
    }
  });
});

describe("frozen start-position protocol R2", () => {
  it("rebuilds the exact SHA-counter 128-world / 512-match matrix and proves static balance without generating a map", () => {
    const protocol = readStartPositionAuditR2Protocol(r2ProtocolPath);
    const matrix = buildFrozenStartPositionAuditR2ScenarioMatrix(protocol);
    const balance = verifyR2ScenarioMatrix(matrix);

    expect(frozenR2ProtocolSha256(r2ProtocolPath)).toBe(
      START_POSITION_R2_PROTOCOL_SHA256
    );
    expect(protocol.authorizationGate.observedSampleMayRun).toBe(false);
    expect(matrix).toHaveLength(START_POSITION_R2_EXPECTED_MATCHES);
    expect(new Set(matrix.map(scenario => scenario.worldClusterId)).size).toBe(
      128
    );
    expect(new Set(matrix.map(scenario => scenario.worldSeed)).size).toBe(128);
    expect(balance.passed).toBe(true);
    expect(balance.errors).toEqual([]);

    for (const clusterId of new Set(matrix.map(scenario => scenario.worldClusterId))) {
      const group = matrix.filter(scenario => scenario.worldClusterId === clusterId);
      expect(group).toHaveLength(4);
      expect(new Set(group.map(scenario => scenario.rosterId)).size).toBe(1);
      expect(group.map(scenario => scenario.nominalRotation).sort()).toEqual([0, 1, 2, 3]);
    }
    for (let definition = 0; definition < 8; definition += 1) {
      for (let nominalSeat = 0; nominalSeat < 4; nominalSeat += 1) {
        expect(balance.nominalSeatDefinitionCounts[`${definition}/${nominalSeat}`]).toBe(64);
      }
    }
  });
});

function syntheticPlacement(
  cluster: number,
  nominalSeat: number,
  definitionIndex: number,
  openingTurnPosition: number
): R2InitialPlacement {
  const terrain = {
    ocean: cluster % 2,
    water: (cluster + nominalSeat) % 3,
    grass: 4 + nominalSeat,
    forest: definitionIndex % 3,
    mountain: cluster % 4,
  };
  const access = {
    targetCount: 2 + (cluster % 2),
    accessibleTargetCount: 1 + (nominalSeat % 2),
    inaccessibleTargetCount: 1 - (nominalSeat % 2) + (cluster % 2),
    nearestTargetManhattan: 2 + nominalSeat,
    nearestLegalFullTurnHops:
      cluster % 7 === 0 && nominalSeat === 0 ? null : 1 + nominalSeat,
    chokepointTileCount: cluster % 3,
    targetClass: "neutral_village" as const,
    chokepointTileKeys: [],
  };
  return {
    nominalSeat,
    openingTurnPosition,
    definitionIndex,
    tribeName: `definition-${definitionIndex}`,
    capital: { x: nominalSeat, y: 0 },
    initialStars: 5 + nominalSeat,
    initialTechs: ["organization"],
    initialTechSignature: "organization",
    passive: "scholars",
    harvestCost: 2,
    startingOwnedTerrain: terrain,
    capitalAdjacentTerrain: terrain,
    ownedResources: { fruit: nominalSeat, animal: definitionIndex % 2, mineral: cluster % 2 },
    ownedResourceTotal: nominalSeat + (definitionIndex % 2) + (cluster % 2),
    immediatelyHarvestableOwnedResources: nominalSeat % 2,
    firstTurnLegalReachableTileCount: 3 + nominalSeat,
    firstTurnLegalNeutralExpansionTileCount: 2 + (cluster % 2),
    firstTurnLegalNeutralVillageCount: cluster % 2,
    firstTurnLegalReachableTerrain: terrain,
    initialUnits: [],
    lawfulAccess: {
      neutralVillage: access,
      opponentCapitalApproach: {
        ...access,
        targetClass: "opponent_capital_approach",
      },
      targets: [],
    },
  };
}

function syntheticR2Row(cluster: number, options?: { openingEqualsSeat?: boolean; withPlacements?: boolean; rotation?: number }): R2AuditRow {
  const rosters = [
    [0, 1, 4, 5],
    [2, 3, 6, 7],
    [0, 2, 5, 7],
    [1, 3, 4, 6],
  ];
  const original = rosters[cluster % rosters.length];
  const rotation = options?.rotation ?? Math.floor(cluster / rosters.length) % 4;
  const roster = original.map((_, seat) => original[(seat + rotation) % 4]);
  // Each roster appears in both preset strata in R2. Keep this synthetic
  // fixture crossed rather than making preset a deterministic roster proxy.
  const preset = Math.floor(cluster / rosters.length) % 2 === 0
    ? "continents"
    : "archipelago";
  // turnOrder is map-seed/world specific. It is held constant across the four
  // roster-seat rotations in a world, just as the frozen R2 runner records it.
  const openingOffset = options?.openingEqualsSeat ? 0 : (cluster + 1) % 4;
  return {
    scenarioId: `synthetic-${cluster}-r${rotation}`,
    worldClusterId: `synthetic-world-${cluster}`,
    worldStratumId: `synthetic-${preset}`,
    worldSeed: 100_000 + cluster,
    randomSeed: 100_000 + cluster,
    preset,
    rosterId: `mixed-0${(cluster % 4) + 1}`,
    rosterOriginalIndices: original,
    rosterRemappedIndices: roster,
    nominalRotation: rotation,
    attemptStage: "complete",
    allAiInitialized: true,
    initialMeasurementComplete: options?.withPlacements ?? false,
    initialAiStatePath: null,
    legalInitialSavePath: null,
    legalSaveValidated: true,
    terrainFingerprint: null,
    mapLayoutFingerprint: null,
    openingTurnOrderNominalSeats: [0, 1, 2, 3],
    initialPlacements: options?.withPlacements
      ? roster.map((definitionIndex, nominalSeat) =>
          syntheticPlacement(
            cluster,
            nominalSeat,
            definitionIndex,
            (nominalSeat + openingOffset) % 4
          )
        )
      : null,
    callbackCap: 100,
    callbacksDrained: 10,
    durationMs: 1,
    phase: "gameover",
    turnsReached: 30,
    turnCapReached: true,
    winnerSeat: cluster % 4,
    winnerDefinitionIndex: roster[cluster % 4],
    winnerName: `synthetic-${cluster % 4}`,
    victoryPath: "synthetic",
    outcome: "gameover",
    failures: [],
    tribes: roster.map((definitionIndex, nominalSeat) => ({
      nominalSeat,
      openingTurnPosition: (nominalSeat + openingOffset) % 4,
      definitionIndex,
      name: `definition-${definitionIndex}`,
      alive: true,
      score: nominalSeat,
      stars: 5 + nominalSeat,
      cities: 1,
      units: 2,
      techs: 1,
      battlesWon: 0,
      citiesCaptured: 0,
      win: nominalSeat === cluster % 4,
    })),
  };
}

describe("R2 analysis fail-closed behavior", () => {
  it("records a singular primary design as inconclusive with every requested bootstrap replicate invalid", () => {
    const rows = Array.from({ length: 16 }, (_, cluster) =>
      syntheticR2Row(cluster, { openingEqualsSeat: true })
    );
    const analysis = analyzeStartPositionAuditR2(rows, {
      plannedClusterIds: rows.map(row => row.worldClusterId),
      bootstrapReplicates: 37,
      bootstrapSeed: 987,
    });

    expect(analysis.primary.status).toBe("inconclusive");
    expect(analysis.primary.pointFit?.singular).toBe(true);
    expect(analysis.primary.bootstrap).toMatchObject({
      requestedReplicates: 37,
      identifiedReplicates: 0,
      invalidReplicates: 37,
      complete: false,
    });
    expect(analysis.primary.nominalSeatContrasts).toEqual([]);
  });

  it("uses bounded static diagnostics to expose the frozen capability bundle's exact redundant columns rather than silently dropping them", () => {
    const rows = Array.from({ length: 8 }, (_, cluster) => syntheticR2Row(cluster));
    const analysis = analyzeStartPositionAuditR2(rows, {
      plannedClusterIds: rows.map(row => row.worldClusterId),
      bootstrapReplicates: 3,
    });

    expect(analysis.capabilityCollinearity.status).toBe("structurally_collinear");
    expect(analysis.capabilityCollinearity.techSignatureByPassiveIsOneToOne).toBe(true);
    expect(analysis.capabilityCollinearity.harvestCostIsFunctionOfPassive).toBe(true);
    expect(
      analysis.capabilityCollinearity
        .initialStarsIsDeterministicallyEncodedBySeatAndOpeningPosition
    ).toBe(true);
    expect(analysis.capabilityMetrics[0].status).toBe("inconclusive");
  });

  it("emits finite/null cluster summaries and separate seat/order contrasts from shared complete cluster-bootstrap draws", () => {
    // Synthetic data only. 128 clusters satisfy R2's predeclared finite-world
    // threshold without constructing any R2 map or running an observed match.
    const rows = Array.from({ length: 128 }, (_, cluster) =>
      Array.from({ length: 4 }, (_, rotation) =>
        syntheticR2Row(cluster, { withPlacements: true, rotation })
      )
    ).flat();
    const analysis = analyzeStartPositionAuditR2(rows, {
      plannedClusterIds: rows.map(row => row.worldClusterId),
      bootstrapReplicates: 23,
      bootstrapSeed: 441_010,
    });
    const legalHops = analysis.physicalMetrics.find(
      metric => metric.metricId === "neutral_village_nearest_legal_full_turn_hops"
    );

    expect(legalHops).toMatchObject({
      status: "estimated",
      finiteWorldClusters: 128,
      nullRowCount: 76,
      bootstrap: {
        requestedReplicates: 23,
        identifiedReplicates: 23,
        invalidReplicates: 0,
        complete: true,
      },
    });
    expect(legalHops?.clusterMeans).toHaveLength(128);
    expect(legalHops?.nominalSeatContrasts).toHaveLength(6);
    expect(legalHops?.openingTurnPositionContrasts).toHaveLength(6);
    expect(legalHops?.nominalSeatContrasts.every(contrast => contrast.ci95 !== null)).toBe(true);
    expect(analysis.accessTargetTotals[0].rawTargetCount).toBeGreaterThan(0);
    expect(
      analysis.accessTargetTotals[0].rawTargetCount
    ).toBe(
      analysis.accessTargetTotals[0].rawAccessibleTargetCount +
        analysis.accessTargetTotals[0].rawInaccessibleTargetCount
    );
  });
});

describe("directed lawful-access chokepoint definition", () => {
  it("identifies a sole mandatory transit tile and keeps target tiles out of the chokepoint set", () => {
    // Synthetic topology only: verifies the metric definition, not an observed map.
    const result = analyzeDirectedTopology(
      topology({
        starts: ["u@0,0"],
        adjacency: {
          "u@0,0": ["u@1,0"],
          "u@1,0": ["u@2,0"],
          "u@2,0": [],
        },
        physical: {
          "u@0,0": "0,0",
          "u@1,0": "1,0",
          "u@2,0": "2,0",
        },
        targets: [{ id: "village", nodeKeys: ["u@2,0"], physicalKey: "2,0" }],
      })
    );

    expect(result.targetResults).toEqual([
      {
        id: "village",
        reachable: true,
        legalFullTurnHops: 2,
        mandatoryTransitPhysicalKeys: ["1,0"],
      },
    ]);
    expect(result.chokepointPhysicalKeys).toEqual(["1,0"]);
  });

  it("does not label a tile a chokepoint when another lawful route remains", () => {
    // Synthetic topology only: parallel routes must defeat a false chokepoint.
    const result = analyzeDirectedTopology(
      topology({
        starts: ["u@0,0"],
        adjacency: {
          "u@0,0": ["u@1,0", "u@0,1"],
          "u@1,0": ["u@1,1"],
          "u@0,1": ["u@1,1"],
          "u@1,1": [],
        },
        physical: {
          "u@0,0": "0,0",
          "u@1,0": "1,0",
          "u@0,1": "0,1",
          "u@1,1": "1,1",
        },
        targets: [{ id: "village", nodeKeys: ["u@1,1"], physicalKey: "1,1" }],
      })
    );

    expect(result.targetResults[0]).toMatchObject({
      reachable: true,
      legalFullTurnHops: 2,
      mandatoryTransitPhysicalKeys: [],
    });
    expect(result.chokepointPhysicalKeys).toEqual([]);
  });

  it("reports an unreachable target as null rather than fabricating a geometric path", () => {
    // Synthetic topology only: a candidate target with no graph-layer node is inaccessible.
    const result = analyzeDirectedTopology(
      topology({
        starts: ["u@0,0"],
        adjacency: { "u@0,0": [] },
        physical: { "u@0,0": "0,0" },
        targets: [{ id: "blocked-village", nodeKeys: [], physicalKey: "2,0" }],
      })
    );

    expect(result.targetResults[0]).toEqual({
      id: "blocked-village",
      reachable: false,
      legalFullTurnHops: null,
      mandatoryTransitPhysicalKeys: [],
    });
  });
});

describe("generated-state lawful access measurements", () => {
  it("uses a non-protocol sanity seed, preserves GameStore state, and retains the shipped first-turn endpoints", () => {
    // TEST-ONLY seed: 7,300,001 is outside every frozen observed block.
    storage.clear();
    game.newGame({
      size: 13,
      humanTribe: 0,
      difficulty: "normal",
      seed: 7_300_001,
      preset: "continents",
      roster: [0, 1, 4, 5],
    });
    const before = JSON.stringify(game.state);
    const measurements = measureStartPositions(game.state);

    expect(JSON.stringify(game.state)).toBe(before);
    expect(measurements).toHaveLength(4);
    expect(measurements.map(measurement => measurement.nominalSeat)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(
      measurements
        .map(measurement => measurement.openingTurnPosition)
        .sort((a, b) => a! - b!)
    ).toEqual([0, 1, 2, 3]);

    for (const measurement of measurements) {
      const shippedFirstTurn = new Set<string>();
      for (const unit of game.state.units.filter(
        unit => unit.tribe === measurement.nominalSeat
      )) {
        for (const tile of reachableTiles(game.state, unit)) {
          shippedFirstTurn.add(`${tile.x},${tile.y}`);
        }
      }
      expect(measurement.firstTurnLegalReachableTileCount).toBe(
        shippedFirstTurn.size
      );
      expect(measurement.initialUnits.length).toBeGreaterThan(0);
      expect(
        measurement.lawfulAccess.neutralVillage.inaccessibleTargetCount +
          measurement.lawfulAccess.neutralVillage.accessibleTargetCount
      ).toBe(measurement.lawfulAccess.neutralVillage.targetCount);
      expect(
        measurement.lawfulAccess.opponentCapitalApproach
          .inaccessibleTargetCount +
          measurement.lawfulAccess.opponentCapitalApproach.accessibleTargetCount
      ).toBe(measurement.lawfulAccess.opponentCapitalApproach.targetCount);
      for (const target of measurement.lawfulAccess.targets) {
        expect(Number.isInteger(target.manhattanFromCapital)).toBe(true);
        if (target.legalFullTurnHops === null) {
          expect(target.mandatoryTransitTileKeys).toEqual([]);
        } else {
          expect(target.legalFullTurnHops).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
