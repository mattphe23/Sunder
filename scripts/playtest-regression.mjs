#!/usr/bin/env node
/**
 * Bounded, report-only focused regression runner.
 *
 * Usage:
 *   PLAYTEST_OUT=/absolute/external/output node scripts/playtest-regression.mjs
 *
 * This runner never starts the application, browser, or server. It discovers
 * focused existing Vitest suites, runs each lane in a capped child process, and
 * writes logs plus JSON/Markdown reports only under PLAYTEST_OUT.
 */
import { execFileSync, spawn } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

const REPORT_VERSION = 1;
const LANE = "regression";
const DEFAULT_SUITE_TIMEOUT_MS = 60_000;
const DEFAULT_OUTPUT_CAP_BYTES = 256 * 1024;
const projectRoot = resolve(process.cwd());
const outputRoot = process.env.PLAYTEST_OUT;

if (!outputRoot || !isAbsolute(outputRoot)) {
  console.error("PLAYTEST_OUT must be an absolute external output directory.");
  process.exit(2);
}

const externalOutput = resolve(outputRoot);
if (externalOutput === projectRoot || externalOutput.startsWith(`${projectRoot}/`)) {
  console.error("PLAYTEST_OUT must be outside the source worktree.");
  process.exit(2);
}

const suiteTimeoutMs = boundedInteger(
  process.env.PLAYTEST_SUITE_TIMEOUT_MS,
  DEFAULT_SUITE_TIMEOUT_MS,
  5_000,
  300_000,
);
const outputCapBytes = boundedInteger(
  process.env.PLAYTEST_OUTPUT_CAP_BYTES,
  DEFAULT_OUTPUT_CAP_BYTES,
  8_192,
  1_048_576,
);

mkdirSync(join(externalOutput, "logs"), { recursive: true });

function boundedInteger(raw, fallback, min, max) {
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    console.error(`Invalid bounded integer ${JSON.stringify(raw)}; expected ${min}..${max}.`);
    process.exit(2);
  }
  return parsed;
}

function git(args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function discoverTestFiles(root) {
  const files = [];
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
        files.push(relative(root, path).replaceAll("\\", "/"));
      }
    }
  };
  visit(root);
  return files.sort();
}

function exactFiles(testFiles, expectedNames) {
  const wanted = new Set(expectedNames);
  return testFiles.filter(file => wanted.has(basename(file)));
}

function optionalGuardianFiles(testFiles) {
  return testFiles.filter(file => {
    const name = basename(file).toLowerCase();
    return (
      name === "beta-world-visuals.test.ts" ||
      /beta.*world.*guardian/.test(name) ||
      /beta.*guardian.*world/.test(name) ||
      /guardian.*beta.*world/.test(name) ||
      /world.*beta.*guardian/.test(name)
    );
  });
}

async function runChild({ id, files, seed, note }) {
  const logPath = join(externalOutput, "logs", `${id}.log`);
  const startedAt = new Date().toISOString();
  const commandArgs = ["run", "--reporter=verbose", "--maxWorkers=1", "--minWorkers=1", ...files];
  const command = ["node_modules/.bin/vitest", ...commandArgs];
  const chunks = [];
  let capturedBytes = 0;
  let outputTruncated = false;
  let timedOut = false;
  let processError = null;

  const append = chunk => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    const remaining = outputCapBytes - capturedBytes;
    if (remaining <= 0) {
      outputTruncated = true;
      return;
    }
    if (buffer.length > remaining) {
      chunks.push(buffer.subarray(0, remaining));
      capturedBytes += remaining;
      outputTruncated = true;
      return;
    }
    chunks.push(buffer);
    capturedBytes += buffer.length;
  };

  const result = await new Promise(resolveResult => {
    const child = spawn(command[0], command.slice(1), {
      cwd: projectRoot,
      env: {
        ...process.env,
        CI: "1",
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", error => {
      processError = error instanceof Error ? error.message : String(error);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
    }, suiteTimeoutMs);
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolveResult({ exitCode, signal });
    });
  });

  const finishedAt = new Date().toISOString();
  const logHeader = [
    `id: ${id}`,
    `startedAt: ${startedAt}`,
    `finishedAt: ${finishedAt}`,
    `command: ${command.join(" ")}`,
    `timeoutMs: ${suiteTimeoutMs}`,
    `outputCapBytes: ${outputCapBytes}`,
    `exitCode: ${result.exitCode === null ? "null" : result.exitCode}`,
    `signal: ${result.signal ?? "none"}`,
    `timedOut: ${timedOut}`,
    `outputTruncated: ${outputTruncated}`,
    `spawnError: ${processError ?? "none"}`,
    "",
  ].join("\n");
  const footer = outputTruncated ? "\n[runner output truncated at configured cap]\n" : "";
  writeFileSync(logPath, Buffer.concat([Buffer.from(logHeader), ...chunks, Buffer.from(footer)]));

  const passed = !timedOut && !processError && result.exitCode === 0;
  return {
    id,
    status: passed ? "passed" : "failed",
    seed,
    actions: [
      `Focused existing Vitest child process: ${command.join(" ")}`,
      note,
      `Bounded duration: ${suiteTimeoutMs}ms; bounded combined output: ${outputCapBytes} bytes.`,
    ],
    checks: passed
      ? ["Vitest exited 0; focused suite invariants passed."]
      : [
          timedOut
            ? `Timed out after ${suiteTimeoutMs}ms.`
            : processError
              ? `Child process launch error: ${processError}`
              : `Vitest exited ${result.exitCode ?? "null"}${result.signal ? ` (signal ${result.signal})` : ""}.`,
        ],
    artifacts: [relative(externalOutput, logPath).replaceAll("\\", "/")],
    files,
    startedAt,
    finishedAt,
    durationCapMs: suiteTimeoutMs,
    outputCapBytes,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut,
    outputTruncated,
  };
}

function runGitDiffCheck() {
  try {
    git(["diff", "--check"]);
    return { status: "passed", details: "git diff --check exited 0." };
  } catch (error) {
    const details = String(error.stderr || error.message || error).trim();
    return { status: "failed", details: details || "git diff --check failed." };
  }
}

function binaryAssetAudit() {
  const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);
  const assets = [];
  for (const file of tracked) {
    const absolute = join(projectRoot, file);
    try {
      if (!statSync(absolute).isFile()) continue;
      const mime = execFileSync("file", ["-b", "--mime-type", absolute], {
        encoding: "utf8",
      }).trim();
      if (/^(image|audio|video)\//.test(mime) || mime === "application/octet-stream") {
        assets.push({ path: file, mime });
      }
    } catch {
      // An unreadable/missing path is not a binary rewrite claim; leave audit scoped to readable tracked files.
    }
  }
  return assets.sort((a, b) => a.path.localeCompare(b.path));
}

function reportMarkdown(report) {
  const lines = [
    "# Sunder focused regression report",
    "",
    `- Report version: ${report.version}`,
    `- Lane: ${report.lane}`,
    `- Status: ${report.status}`,
    `- Source SHA: \`${report.sourceSha}\``,
    `- Run started: ${report.startedAt}`,
    `- Run finished: ${report.finishedAt}`,
    `- Per-child duration cap: ${suiteTimeoutMs}ms`,
    `- Per-child combined output cap: ${outputCapBytes} bytes`,
    "",
    "## Cases",
    "",
    "| Case | Status | Seed | Exit code | Artifacts |",
    "| --- | --- | --- | --- | --- |",
    ...report.cases.map(testCase =>
      `| ${testCase.id} | ${testCase.status} | ${testCase.seed} | ${testCase.exitCode ?? "n/a"} | ${testCase.artifacts.map(item => `\`${item}\``).join(", ")} |`,
    ),
    "",
    "## Checks",
    "",
    ...report.cases.flatMap(testCase => testCase.checks.map(check => `- **${testCase.id}:** ${check}`)),
    `- **repository hygiene:** ${report.repositoryChecks.diffCheck.details}`,
    `- **asset binary audit:** ${report.repositoryChecks.binaryAssetAudit.length} readable tracked binary asset(s) enumerated; no asset bytes were changed by this runner.`,
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.flatMap(finding => [
          `- **${finding.severity}: ${finding.summary}**`,
          `  - Reproduction: ${finding.reproSteps}`,
        ])
      : ["- No focused-suite invariant failures were found."]),
    "",
    "## Limitations",
    "",
    ...report.limitations.map(item => `- ${item}`),
    "",
    "## Artifacts",
    "",
    `- Machine-readable JSON: \`playtest-regression.json\``,
    `- Per-child bounded logs: \`logs/*.log\``,
    `- Asset binary audit entries: ${report.repositoryChecks.binaryAssetAudit.length}`,
    "",
  ];
  return lines.join("\n");
}

const startedAt = new Date().toISOString();
const sourceSha = git(["rev-parse", "HEAD"]);
const testFiles = discoverTestFiles(projectRoot);
const suitePlans = [
  {
    id: "difficulty-balance-and-access",
    names: [
      "difficulty-description.test.ts",
      "balance-paired.test.ts",
      "fairness-audit.test.ts",
      "tidecaller-amphibious.test.ts",
      "match-access.test.ts",
    ],
    seed: "deterministic difficulty, paired-matrix, shallow-water and three-user access fixtures",
    note: "Exercises truthful AI-income disclosure, deterministic audit restoration, Tidecaller movement and member-only online reads; not AI strength, ranked security or physical-device evidence.",
  },
  {
    id: "development-naval-and-private-authority",
    names: ["naval-mvp.test.ts", "onlineAuthority.test.ts"],
    seed: "controlled development vessel and request-local private authority fixtures",
    note: "Exercises production-disabled naval gates, legacy/default compatibility, effects-disabled private checkpoints and opaque reference errors; neither feature is publicly activated.",
  },
  {
    id: "ios-safearea",
    names: ["ios-safe-area.test.ts", "hud-readability.test.ts"],
    seed: "deterministic HUD/architecture fixtures; static CSS/native-config contract",
    note: "Exercises safe-area guards, shared Map/notification flow, mobile tool labels and presentation-only city inspection; geometry still requires real browser QA.",
  },
  {
    id: "beta-preference-store-cache-nativeurl",
    names: [
      "beta-visual-preferences.test.ts",
      "beta-visual-store.test.ts",
      "imported-model-cache.test.ts",
      "beta-model-url.test.ts",
      "beta-advanced-visuals.test.ts",
      "beta-advanced-tribes.test.ts",
    ],
    seed: "not-applicable (deterministic unit fixtures)",
    note: "Exercises beta preference/store isolation, unchanged model-cache limits, exact native URL admission and eight independent tribe-owned ordinary-Swordsman eligibility/provenance boundaries.",
  },
  {
    id: "overlaylifecycle",
    names: ["selection-overlay-lifecycle.test.ts"],
    seed: "visual review fixture seed 0; devgame fixture seed 6104",
    note: "Exercises Babylon NullEngine selection/planner cleanup ownership; it is not GPU/RAM evidence.",
  },
  {
    id: "dynamicforest",
    names: ["landscape-unit-lanes.test.ts"],
    seed: "deterministic pure fixtures (8x8 state; coordinate sweep 0..10)",
    note: "Exercises dynamic forest/mountain unit-lane placement, fog visibility, and restoration invariants.",
  },
  {
    id: "city-ruin",
    names: ["city-architecture.test.ts", "ruin-architecture.test.ts"],
    seed: "not-applicable (deterministic architecture plans and NullEngine fixtures)",
    note: "Exercises city/ruin plan and bounded generated-geometry invariants under Babylon NullEngine.",
  },
  {
    id: "resourceaction",
    names: ["resource-action.test.ts"],
    seed: "42 (explicit game fixture seed)",
    note: "Exercises read-only resource action inspection and explicit harvest confirmation mechanics.",
  },
  {
    id: "world-move-and-guardian-identity",
    names: ["world-move-occupancy.test.ts", "unit-display-name.test.ts"],
    seed: "6707986 (original collision); deterministic minimal world-turn fixtures",
    note: "Repeats the confirmed neutral-raider destination collision and display-only Guardian identity regressions.",
  },
  {
    id: "playtest-callback-and-navigation-deadline",
    names: ["ai-playtest-callback.test.ts", "playtest-navigation-deadline.test.ts"],
    seed: "not-applicable (mocked workflow events and controlled navigation promises)",
    note: "Executes exact shipped callback/navigation code with mocked HTTP and timers; no callback, browser navigation, build or upload is initiated.",
  },
];

const cases = [];
const findings = [];
for (const plan of suitePlans) {
  const files = exactFiles(testFiles, plan.names);
  const missing = plan.names.filter(name => !files.some(file => basename(file) === name));
  if (missing.length) {
    const testCase = {
      id: plan.id,
      status: "warning",
      seed: plan.seed,
      actions: ["Discovered focused test filenames before execution.", plan.note],
      checks: [`Coverage warning: expected suite filename(s) absent: ${missing.join(", ")}.`],
      artifacts: [],
      files,
      exitCode: null,
      durationCapMs: suiteTimeoutMs,
      outputCapBytes,
    };
    cases.push(testCase);
    findings.push({
      severity: "warning",
      summary: `${plan.id} focused coverage was unavailable`,
      reproSteps: `At source ${sourceSha}, discover test files and look for: ${missing.join(", ")}.`,
    });
    continue;
  }
  cases.push(await runChild({ ...plan, files }));
}

const guardianFiles = optionalGuardianFiles(testFiles);
if (guardianFiles.length) {
  cases.push(await runChild({
    id: "betaworld-guardian-optional",
    files: guardianFiles,
    seed: "as specified by discovered optional suite",
    note: "Optional beta-world guardian coverage was discovered and run.",
  }));
} else {
  cases.push({
    id: "betaworld-guardian-optional",
    status: "warning",
    seed: "not-applicable (optional suite absent)",
    actions: ["Searched existing server test filenames for beta-world guardian suite patterns."],
    checks: ["Coverage warning: no optional beta-world guardian test suite was found; not treated as a failure."],
    artifacts: [],
    files: [],
    exitCode: null,
    durationCapMs: suiteTimeoutMs,
    outputCapBytes,
  });
  findings.push({
    severity: "warning",
    summary: "Optional beta-world guardian focused suite is absent",
    reproSteps: "Add a matching server test filename containing beta, world, and guardian; rerun this bounded runner.",
  });
}

for (const testCase of cases.filter(testCase => testCase.status === "failed")) {
  findings.push({
    severity: "error",
    summary: `${testCase.id} focused Vitest invariant run failed`,
    reproSteps: `Run PLAYTEST_OUT=${externalOutput} node scripts/playtest-regression.mjs and inspect ${testCase.artifacts.join(", ")}; exitCode=${testCase.exitCode ?? "null"}.`,
  });
}

const diffCheck = runGitDiffCheck();
if (diffCheck.status === "failed") {
  findings.push({
    severity: "error",
    summary: "git diff --check failed",
    reproSteps: diffCheck.details,
  });
}

const report = {
  version: REPORT_VERSION,
  lane: LANE,
  status: cases.some(testCase => testCase.status === "failed") || diffCheck.status === "failed"
    ? "failed"
    : findings.length
      ? "passed-with-warnings"
      : "passed",
  sourceSha,
  startedAt,
  finishedAt: new Date().toISOString(),
  cases,
  findings,
  limitations: [
    "Report-only child-process execution: no browser, server, network request, scheduler, daemon, or renderer UI session was started.",
    "Focused Vitest/NullEngine coverage is not an aesthetic review, native device validation, GPU validation, or native RAM approval claim.",
    "No screenshot pixels were created, inspected, or modified.",
    "Intentional procedural fallback and missing/unloaded model coverage are not classified as crashes; they remain coverage warnings outside these focused suites.",
    "The optional beta-world guardian suite is run only when discoverable by filename; an absent optional suite is reported as a coverage warning.",
  ],
  repositoryChecks: {
    diffCheck,
    binaryAssetAudit: binaryAssetAudit(),
  },
};

writeFileSync(join(externalOutput, "playtest-regression.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(externalOutput, "REPORT.md"), reportMarkdown(report));

console.log(JSON.stringify({
  status: report.status,
  sourceSha: report.sourceSha,
  report: join(externalOutput, "playtest-regression.json"),
  markdown: join(externalOutput, "REPORT.md"),
}, null, 2));

if (report.status === "failed") process.exit(1);
