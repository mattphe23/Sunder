// Harness-only, bounded paired GameStore/AI comparator. No simulated outcomes.
// Usage: ./node_modules/.bin/tsx scripts/victory-unlock-audit.mts --out /absolute/report/path
// Requires the pre-frozen PROTOCOL.json in that directory. Fixed 192 pairs.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import type { GameState } from "../client/src/game/core/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = "a996f6e08b65218c0eb72de4b7a4549ed3ebb932";
const args = process.argv.slice(2);
const outArg = args[args.indexOf("--out") + 1];
if (!args.includes("--out") || !outArg || !isAbsolute(outArg)) throw new Error("--out requires an absolute external report directory");
const OUT = resolve(outArg);
if (!relative(ROOT, OUT).startsWith("..")) throw new Error("Reports must be outside the worktree");
mkdirSync(OUT, { recursive: true });
const protocolText = readFileSync(resolve(OUT, "PROTOCOL.json"), "utf8");
const protocol = JSON.parse(protocolText);
if (protocol.protocolId !== "victory-unlock-20261110-r1" || protocol.sampling.gamesPerArm !== 192 || protocol.execution.maxTurns !== 30) throw new Error("Frozen protocol mismatch");
const hash = (x: string) => createHash("sha256").update(x).digest("hex");
const json = (name: string, data: unknown) => writeFileSync(resolve(OUT, name), JSON.stringify(data, null, 2) + "\n");

interface SeatTelemetry {
  seat: number; definition: number; name: string; firstNearRound: number | null;
  firstDoneRound: number | null; firstNearThreshold: number | null; firstNearCurrent: number | null;
  target: number | null; aliveAtEnd: boolean; finalCurrent: number | null;
}
interface Row {
  pairId: string; block: string; arm: number; seed: number; randomSeed: number;
  roster: number[]; preset: string; difficulty: string; size: number; maxTurns: number;
  openingOrder: number[]; turns: number; displayedEndTurn: number; phase: string;
  winnerSeat: number | null; winnerDefinition: number | null; winnerName: string | null;
  path: string | null; reason: string; cappedOut: boolean; callbacks: number;
  failures: string[]; firstNearRoundsPerSeat: SeatTelemetry[]; earlyCompletedBeforeUnlock: number[];
  winningPathRound: number | null; warningRoundIndexLead: number | null;
  warningFullRoundLead: number | null; warningMissing: boolean; observations: number;
}

// Same invariants as the existing non-exported scripts/balance-paired.mts
// validateRealCoreState; local replication avoids modifying allowed-out-of-scope files.
function validate(s: GameState): string | null {
  if (s.tiles.length !== s.size * s.size) return `tile count ${s.tiles.length} != ${s.size}²`;
  const occupied = new Set<string>(), ids = new Set<number>();
  for (const u of s.units) {
    if (!Number.isInteger(u.x) || !Number.isInteger(u.y) || u.x < 0 || u.y < 0 || u.x >= s.size || u.y >= s.size) return `unit#${u.id} out of bounds`;
    const location = `${u.x},${u.y}`;
    if (occupied.has(location)) return `multiple live units at ${location}`;
    occupied.add(location);
    if (!Number.isInteger(u.id) || ids.has(u.id)) return `duplicate/invalid unit id ${u.id}`;
    ids.add(u.id);
    if (!Number.isFinite(u.hp) || !Number.isFinite(u.maxHp) || u.hp <= 0 || u.hp > u.maxHp) return `invalid HP unit#${u.id} ${u.hp}/${u.maxHp}`;
  }
  for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i].x !== i % s.size || s.tiles[i].y !== Math.floor(i / s.size)) return `tile[${i}] misindexed`;
  return null;
}

async function worker(arm: number) {
  const { GameStore } = await import("../client/src/game/core/state");
  const { TRIBE_DEFS } = await import("../client/src/game/core/types");
  const { victoryProgress, victoryPathStartTurn } = await import("../client/src/game/core/victory");
  const { seedRandom } = await import("./_rng.mts");
  if (TRIBE_DEFS.length !== 8 || victoryPathStartTurn() !== arm) throw new Error("Roster or arm mismatch");
  const started = Date.now();
  const original = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, random: Math.random };
  const globals = globalThis as unknown as Record<string, unknown>;
  const savedWindow = Object.getOwnPropertyDescriptor(globals, "window");
  const savedStorage = Object.getOwnPropertyDescriptor(globals, "localStorage");
  const pending: number[] = [], timers = new Map<number, () => void>();
  let timerId = 0;
  globals.window = undefined;
  const values = new Map<string, string>();
  globals.localStorage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, String(v)), removeItem: (k: string) => values.delete(k), clear: () => values.clear() };
  globals.setTimeout = (fn: (...a: unknown[]) => void, _ms?: number, ...rest: unknown[]) => {
    if (typeof fn !== "function") throw new Error("Only function timers supported");
    const id = ++timerId; timers.set(id, () => fn(...rest)); pending.push(id); return id;
  };
  globals.clearTimeout = (id: number) => timers.delete(Number(id));
  const rows: Row[] = [];
  const rawFile = resolve(OUT, `arm-${arm}.jsonl`);
  if (existsSync(rawFile)) throw new Error(`Refusing to overwrite existing arm evidence ${rawFile}`);
  writeFileSync(rawFile, "");
  let generalSaved = false, nerivaneSaved = false;
  try {
    for (const block of protocol.sampling.independentSeedBlocks) {
      for (let g = 0; g < 96; g++) {
        const seed = block.seedBase + g;
        const preset = protocol.sampling.presets[g % 4];
        const difficulty = protocol.sampling.difficulties[Math.floor(g / 4) % 3];
        const roster = [0, 1, 2, 3].map(d => (d + g) % 8);
        const game = new GameStore();
        pending.length = 0; timers.clear(); values.clear();
        const seats: SeatTelemetry[] = roster.map((definition, seat) => ({ seat, definition, name: TRIBE_DEFS[definition].name, firstNearRound: null, firstDoneRound: null, firstNearThreshold: null, firstNearCurrent: null, target: null, aliveAtEnd: true, finalCurrent: null }));
        const firstNearSnapshots = new Map<number, string>();
        let observations = 0;
        const observe = () => {
          const s = game.state;
          if (s.phase !== "playing" && s.phase !== "gameover") return;
          observations++;
          for (const t of s.tribes) {
            const p = victoryProgress(s, t.index), record = seats[t.index];
            if (!p || !record) continue; // dead progress is null, never called complete
            const threshold = Math.max(1, Math.floor(2 * p.target / 3));
            record.target = p.target;
            if (record.firstNearRound === null && p.current >= threshold) {
              record.firstNearRound = s.turn; record.firstNearThreshold = threshold; record.firstNearCurrent = p.current;
              if (arm === 11 && s.phase === "playing" && ((!generalSaved) || (t.defIndex === 4 && p.target === 2 && !nerivaneSaved))) firstNearSnapshots.set(t.index, JSON.stringify(s));
            }
            if (record.firstDoneRound === null && p.done) record.firstDoneRound = s.turn;
          }
        };
        const unsubscribe = game.subscribe(observe);
        // Harness-local observer around the exact round-start check, including
        // streak/score/world progression before the engine can immediately end.
        const observedStore = game as unknown as { checkVictoryPaths: () => void };
        const originalCheck = observedStore.checkVictoryPaths.bind(game);
        observedStore.checkVictoryPaths = () => { observe(); originalCheck(); observe(); };
        const failures: string[] = [];
        let callbacks = 0;
        seedRandom(seed); // immediately before newGame, resets every independent world
        game.newGame({ size: 11, humanTribe: -1, seed, preset, difficulty, roster });
        game.state.maxTurns = 30;
        observe();
        const openingOrder = [...(game.state.turnOrder ?? [])];
        const setupFailure = validate(game.state);
        if (setupFailure) failures.push(`invariant setup: ${setupFailure}`);
        while (game.state.phase === "playing" && !failures.length) {
          if (callbacks >= 200000) { failures.push("callback cap"); break; }
          if (Date.now() - started >= 420000) { failures.push("arm deadline"); break; }
          let callback: (() => void) | undefined;
          while (pending.length && !callback) {
            const id = pending.shift()!; callback = timers.get(id); timers.delete(id);
          }
          if (!callback) { failures.push("stalled callback queue"); break; }
          observe();
          try { callback(); } catch (e) { failures.push(`exception: ${String(e)}`); }
          callbacks++;
          observe();
          const invalid = validate(game.state);
          if (invalid) failures.push(`invariant after callback ${callbacks}: ${invalid}`);
        }
        observe(); unsubscribe();
        const s = game.state;
        seats.forEach(record => { record.aliveAtEnd = s.tribes[record.seat].alive; record.finalCurrent = victoryProgress(s, record.seat)?.current ?? null; });
        const path = s.winPath?.pathId ?? null;
        const firstNear = s.winner === null ? null : seats[s.winner]?.firstNearRound ?? null;
        const lead = path && firstNear !== null ? s.turn - firstNear : null;
        const row: Row = {
          pairId: `${block.id}-${g}`, block: block.id, arm, seed, randomSeed: seed, roster, preset, difficulty,
          size: s.size, maxTurns: s.maxTurns, openingOrder, turns: s.turn, displayedEndTurn: s.turn + 1,
          phase: s.phase, winnerSeat: s.winner, winnerDefinition: s.winner === null ? null : s.tribes[s.winner].defIndex,
          winnerName: s.winner === null ? null : s.tribes[s.winner].name,
          path, reason: s.phase !== "gameover" ? "incomplete" : path ? "path" : s.turn >= s.maxTurns ? "turn-cap-score" : s.tribes.filter(t => t.alive).length === 1 ? "elimination" : "other-score",
          cappedOut: s.turn >= s.maxTurns, callbacks, failures, firstNearRoundsPerSeat: seats,
          earlyCompletedBeforeUnlock: seats.filter(t => t.firstDoneRound !== null && t.firstDoneRound < arm).map(t => t.seat),
          winningPathRound: path ? s.turn : null, warningRoundIndexLead: lead,
          warningFullRoundLead: lead === null ? null : Math.max(0, lead - 1), warningMissing: !!path && lead === null, observations,
        };
        rows.push(row);
        writeFileSync(rawFile, JSON.stringify(row) + "\n", { flag: "a" });
        if (arm === 11 && path && s.winner !== null && firstNearSnapshots.has(s.winner)) {
          const isTwoPort = row.winnerDefinition === 4 && seats[s.winner].target === 2;
          const kind = isTwoPort && !nerivaneSaved ? "nerivane-two-port" : !generalSaved ? "general" : null;
          if (kind) {
            writeFileSync(resolve(OUT, `first-near-${kind}.state.json`), firstNearSnapshots.get(s.winner)! + "\n");
            json(`first-near-${kind}.metadata.json`, { label: "Actual all-AI audit state at winning seat first warning; NOT an ordinary human match", arm, seed, pairId: row.pairId, preset, difficulty, roster, viewerSeat: s.winner, observedNear: seats[s.winner], eventualWinningPath: path, eventualWinningRound: s.turn, stateMutationsForSnapshot: "none" });
            if (kind === "general") generalSaved = true; else nerivaneSaved = true;
          }
        }
        if (rows.length % 10 === 0) console.error(`unlock ${arm}: ${rows.length}/192 completed=${rows.filter(r => r.phase === "gameover").length} failures=${rows.filter(r => r.failures.length).length}`);
        if (failures.includes("arm deadline")) throw new Error("Bounded arm deadline; retained raw rows");
      }
    }
    json(`arm-${arm}.json`, { arm, games: rows.length, durationMs: Date.now() - started, protocolSha256: hash(protocolText), rows });
    console.error(`unlock ${arm}: finished ${rows.length} games in ${Date.now() - started}ms`);
  } finally {
    globalThis.setTimeout = original.setTimeout; globalThis.clearTimeout = original.clearTimeout; Math.random = original.random;
    if (savedWindow) Object.defineProperty(globals, "window", savedWindow); else delete globals.window;
    if (savedStorage) Object.defineProperty(globals, "localStorage", savedStorage); else delete globals.localStorage;
    pending.length = 0; timers.clear();
  }
}

function sourceEvidence() {
  const git = (...a: string[]) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
  const files = git("ls-files", "client/src/game/core", "shared/story.ts").trim().split("\n");
  const identities = files.map(path => {
    const before = git("show", `${BASELINE}:${path}`), after = readFileSync(resolve(ROOT, path), "utf8");
    return { path, baselineSha256: hash(before), candidateSha256: hash(after), unchanged: before === after };
  });
  const victoryPath = "client/src/game/core/victory.ts";
  const before = git("show", `${BASELINE}:${victoryPath}`), after = readFileSync(resolve(ROOT, victoryPath), "utf8");
  const marker = "/**\n * Check all living tribes for a completed faction path.";
  const baselineTargets = before.slice(0, before.indexOf(marker)), candidateTargets = after.slice(0, after.indexOf(marker));
  const functionMarker = "export function victoryProgress";
  const nonUnlockFilesUnchanged = identities.filter(x => x.path !== victoryPath).every(x => x.unchanged);
  const targetsUnchanged = baselineTargets === candidateTargets;
  const normalizedCheckUnchanged = before.slice(before.indexOf("export function checkPathVictory")).replace("s.turn < VICTORY_PATH_START_TURN", "s.turn < victoryPathStartTurn()") === after.slice(after.indexOf("export function checkPathVictory"));
  const evidence = {
    baselineCommit: BASELINE, worktreeHead: git("rev-parse", "HEAD").trim(), protocolSha256: hash(protocolText),
    targetsUnchanged, nonUnlockFilesUnchanged, normalizedCheckUnchanged, goalChanges: targetsUnchanged ? 0 : "UNKNOWN",
    targetsBaselineSha256: hash(baselineTargets), targetsCandidateSha256: hash(candidateTargets),
    victoryProgressBaselineSha256: hash(baselineTargets.slice(baselineTargets.indexOf(functionMarker))),
    victoryProgressCandidateSha256: hash(candidateTargets.slice(candidateTargets.indexOf(functionMarker))),
    sourceFiles: identities, scopedDiff: git("diff", "--", victoryPath, "server/victory-unlock.test.ts"),
    subprocessControl: "Same candidate module and default targets/AI/maps in both subprocesses; all inherited SUNDER_* variables removed, explicit SUNDER_VICTORY_PATH_START_TURN=8 or 11 only",
  };
  json("source-identity.json", evidence);
  if (!targetsUnchanged || !nonUnlockFilesUnchanged || !normalizedCheckUnchanged) throw new Error("Unexpected non-unlock source difference; refusing measurement");
  return evidence;
}
function median(values: number[]) { const a = [...values].sort((x, y) => x - y); return (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2; }
function summarize(rows: Row[]) {
  const pathRows = rows.filter(r => r.path);
  const bins = (field: "warningRoundIndexLead" | "warningFullRoundLead") => ({ zero: pathRows.filter(r => r[field] === 0).length, one: pathRows.filter(r => r[field] === 1).length, twoPlus: pathRows.filter(r => (r[field] ?? -1) >= 2).length, neverObserved: pathRows.filter(r => r[field] === null).length });
  return {
    n: rows.length, completed: rows.filter(r => r.phase === "gameover").length, failureRows: rows.filter(r => r.failures.length).length,
    invariantFailures: rows.filter(r => r.failures.some(x => x.startsWith("invariant"))).length,
    meanTurns: rows.reduce((a, r) => a + r.turns, 0) / rows.length, medianTurns: median(rows.map(r => r.turns)),
    caps: rows.filter(r => r.cappedOut).length, capRate: rows.filter(r => r.cappedOut).length / rows.length,
    pathWins: pathRows.length, pathWinsBefore11: pathRows.filter(r => r.turns < 11).length,
    eliminationWins: rows.filter(r => r.reason === "elimination").length, earlyEliminationBefore11: rows.filter(r => r.reason === "elimination" && r.turns < 11).length,
    pathIds: Object.fromEntries([...new Set(pathRows.map(r => r.path!))].map(p => [p, pathRows.filter(r => r.path === p).length])),
    pathEndRounds: Object.fromEntries([...new Set(pathRows.map(r => r.turns))].sort((a, b) => a - b).map(t => [t, pathRows.filter(r => r.turns === t).length])),
    warningRoundIndexLead: bins("warningRoundIndexLead"), warningConservativeFullRoundLead: bins("warningFullRoundLead"),
    completedBeforeUnlockAppearances: rows.reduce((a, r) => a + r.earlyCompletedBeforeUnlock.length, 0),
    tribes: Array.from({ length: 8 }, (_, definition) => {
      const appearances = rows.filter(r => r.roster.includes(definition)).length, wins = rows.filter(r => r.winnerDefinition === definition).length;
      const seat = rows.flatMap(r => r.firstNearRoundsPerSeat).find(t => t.definition === definition);
      return { definition, name: seat?.name, appearances, wins, perAppearanceWinRate: wins / appearances };
    }),
  };
}
async function compare() {
  const evidence = sourceEvidence();
  const cleanEnv = { ...process.env };
  for (const key of Object.keys(cleanEnv)) if (key.startsWith("SUNDER_")) delete cleanEnv[key];
  for (const arm of [8, 11]) {
    await new Promise<void>((ok, fail) => {
      const child = spawn(resolve(ROOT, "node_modules/.bin/tsx"), [fileURLToPath(import.meta.url), "--out", OUT, "--worker", String(arm)], { cwd: ROOT, env: { ...cleanEnv, SUNDER_VICTORY_PATH_START_TURN: String(arm) }, stdio: "inherit" });
      const deadline = setTimeout(() => { child.kill("SIGTERM"); fail(new Error(`arm ${arm} subprocess timeout`)); }, 430000);
      child.on("error", e => { clearTimeout(deadline); fail(e); });
      child.on("exit", (code, signal) => { clearTimeout(deadline); if (code === 0) ok(); else fail(new Error(`arm ${arm} exited ${code}/${signal}`)); });
    });
  }
  const baseline: Row[] = JSON.parse(readFileSync(resolve(OUT, "arm-8.json"), "utf8")).rows;
  const candidate: Row[] = JSON.parse(readFileSync(resolve(OUT, "arm-11.json"), "utf8")).rows;
  const mismatches: string[] = [];
  for (let i = 0; i < baseline.length; i++) {
    const fields = ["pairId", "seed", "randomSeed", "roster", "preset", "difficulty", "size", "maxTurns", "openingOrder"] as const;
    if (fields.some(k => JSON.stringify(baseline[i][k]) !== JSON.stringify(candidate[i]?.[k]))) mismatches.push(baseline[i].pairId);
  }
  const a = summarize(baseline), b = summarize(candidate);
  const tribeChanges = a.tribes.map((t, i) => ({ ...t, candidateWins: b.tribes[i].wins, candidateWinRate: b.tribes[i].perAppearanceWinRate, deltaPercentagePoints: 100 * (b.tribes[i].perAppearanceWinRate - t.perAppearanceWinRate) }));
  const gates = {
    exactSampleAndPairing: baseline.length === 192 && candidate.length === 192 && !mismatches.length,
    completeWithoutFailures: a.completed === 192 && b.completed === 192 && a.failureRows === 0 && b.failureRows === 0,
    noEarlyCandidatePathWins: b.pathWinsBefore11 === 0,
    aggregateMeanNotShorter: b.meanTurns >= a.meanTurns,
    aggregateMedianNotShorter: b.medianTurns >= a.medianTurns,
    capIncreaseWithin10pp: 100 * (b.capRate - a.capRate) <= 10,
    noTribeDropGreater10pp: tribeChanges.every(t => t.deltaPercentagePoints >= -10),
    targetsAndOtherCoreUnchanged: evidence.targetsUnchanged && evidence.nonUnlockFilesUnchanged && evidence.normalizedCheckUnchanged,
  };
  const deltas = candidate.map((r, i) => r.turns - baseline[i].turns);
  const summary = {
    protocolId: protocol.protocolId, protocolSha256: hash(protocolText), pairingMismatches: mismatches,
    baseline: a, candidate: b, blocks: protocol.sampling.independentSeedBlocks.map((block: { id: string }) => ({ block: block.id, baseline: summarize(baseline.filter(r => r.block === block.id)), candidate: summarize(candidate.filter(r => r.block === block.id)) })),
    tribeChanges, pairedRoundChanges: { longer: deltas.filter(x => x > 0).length, same: deltas.filter(x => x === 0).length, shorter: deltas.filter(x => x < 0).length, mean: deltas.reduce((x, y) => x + y, 0) / deltas.length, median: median(deltas) },
    capIncreasePercentagePoints: 100 * (b.capRate - a.capRate), gates,
    recommendation: Object.values(gates).every(Boolean) ? "RECOMMEND displayed 12, conditional on UI/compatibility verification" : "HOLD: one or more frozen gates failed",
    interpretation: "192 paired scenarios, 384 actual GameStore AI executions. Two independent seed blocks; descriptive AI-only comparison, not proof of human fun or response opportunity. Global warning telemetry is not fog-aware. Conservative full-round lead excludes partial warning round. No sensitivity run.",
  };
  json("SUMMARY.json", summary);
  const line = (name: string, av: unknown, bv: unknown) => `| ${name} | ${av} | ${bv} |`;
  writeFileSync(resolve(OUT, "SUMMARY.md"), `# Victory unlock audit\n\n**${summary.recommendation}**\n\nInternal unlock 8 / displayed 9 versus internal 11 / displayed 12. Targets changed: **0**; all other core files unchanged. 192 matched scenarios, not 384 independent observations.\n\n| Metric | Baseline 8 | Candidate 11 |\n|---|---:|---:|\n${line("Completed / total", `${a.completed}/192`, `${b.completed}/192`)}\n${line("Failure rows / invariants", `${a.failureRows}/${a.invariantFailures}`, `${b.failureRows}/${b.invariantFailures}`)}\n${line("Mean internal end round", a.meanTurns.toFixed(3), b.meanTurns.toFixed(3))}\n${line("Median internal end round", a.medianTurns, b.medianTurns)}\n${line("Turn-cap games", a.caps, b.caps)}\n${line("Path wins", a.pathWins, b.pathWins)}\n${line("Path wins before internal 11", a.pathWinsBefore11, b.pathWinsBefore11)}\n${line("Elimination wins", a.eliminationWins, b.eliminationWins)}\n${line("Early elimination allowed", a.earlyEliminationBefore11, b.earlyEliminationBefore11)}\n\nCap change: ${summary.capIncreasePercentagePoints.toFixed(3)} percentage points. Paired end-round changes: ${summary.pairedRoundChanges.longer} longer, ${summary.pairedRoundChanges.same} unchanged, ${summary.pairedRoundChanges.shorter} shorter.\n\n## Frozen gates\n\n${Object.entries(gates).map(([k, v]) => `- ${k}: **${v ? "PASS" : "FAIL"}**`).join("\n")}\n\n## Per-appearance tribe wins\n\n| Tribe | Baseline wins/appearances | Candidate wins/appearances | Change (pp) |\n|---|---:|---:|---:|\n${tribeChanges.map(t => `| ${t.name} | ${t.wins}/${t.appearances} | ${t.candidateWins}/${t.appearances} | ${t.deltaPercentagePoints.toFixed(3)} |`).join("\n")}\n\n## Warning lead among path winners\n\nWarning threshold is max(1,floor(2*target/3)); 2-port paths warn at 1 port.\n\n| Measure | Baseline bins 0 / 1 / 2+ / missing | Candidate bins 0 / 1 / 2+ / missing |\n|---|---:|---:|\n${line("Round-index difference", Object.values(a.warningRoundIndexLead).join(" / "), Object.values(b.warningRoundIndexLead).join(" / "))}\n${line("Conservative complete-round lead", Object.values(a.warningConservativeFullRoundLead).join(" / "), Object.values(b.warningConservativeFullRoundLead).join(" / "))}\n\nComplete-round lead excludes the partly elapsed warning round. Neither lead guarantees a human response opportunity or visibility. Dead seats' progress is null, never treated as completion. Missing means never observed, not zero.\n\n## Evidence and caveats\n\n- Raw rows: arm-8.json, arm-11.json, and incremental JSONL files. Each records seeds, actual roster, reason, cap, per-seat first-near/done, observed target, callbacks and failures.\n- SOURCE: source-identity.json proves unchanged victoryProgress/targets and other core files against the baseline. PROTOCOL.json and PROTOCOL.md were frozen before execution.\n- Optional retained first-near snapshots are unmodified actual all-AI GameStates from planned candidate games; metadata discloses seed/viewer and eventual result. They are not ordinary human matches.\n- Size 11 only; balanced marginal preset/difficulty/roster coverage, not complete factorial coverage; no adaptive extra run. AI-only descriptive results cannot establish human fun or warning comprehension.\n`);
  console.log(JSON.stringify({ recommendation: summary.recommendation, gates, baseline: { mean: a.meanTurns, paths: a.pathWins, earlyPaths: a.pathWinsBefore11, caps: a.caps }, candidate: { mean: b.meanTurns, paths: b.pathWins, earlyPaths: b.pathWinsBefore11, caps: b.caps } }, null, 2));
}
const workerIndex = args.indexOf("--worker");
if (workerIndex >= 0) {
  const arm = Number(args[workerIndex + 1]);
  if ((arm !== 8 && arm !== 11) || process.env.SUNDER_VICTORY_PATH_START_TURN !== String(arm)) throw new Error("Worker requires controlled explicit arm 8 or 11");
  await worker(arm);
} else await compare();
