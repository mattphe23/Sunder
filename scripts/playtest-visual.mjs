#!/usr/bin/env node
/**
 * Bounded, report-only Sunder visual playtest runner.
 *
 * The caller owns server lifecycle. This runner only drives the ordinary menu,
 * canvas, and HUD; it does not use debug routes, GameStore, fixtures, or state
 * writes. It reads the normal local autosave only to choose and verify visible
 * player actions.
 *
 * Usage:
 *   PLAYTEST_BASE=https://production.example PLAYTEST_OUT=/absolute/output \
 *     node scripts/playtest-visual.mjs
 *
 * HTTP is intentionally limited to loopback development servers. HTTPS is
 * required for every non-loopback origin.
 */
import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const execFile = promisify(execFileCallback);
const VERSION = 2;
const LANE = "visual";
const BASE = validateBase(process.env.PLAYTEST_BASE);
const OUT = path.resolve(process.env.PLAYTEST_OUT || "/tmp/sunder-playtest-visual");
const SOURCE_DIR = path.resolve(process.env.PLAYTEST_SOURCE_DIR || fileURLToPath(new URL("../", import.meta.url)));
const TOTAL_CAP_MS = 4 * 60_000;
const CASE_CAP_MS = 105_000;
const NAVIGATION_CAP_MS = 20_000;
const ACTION_CAP_MS = 12_000;
const BETA_READY_CAP_MS = 18_000;
const CANVAS_TAP_GAP_MS = 650;
const PHONE = { width: 393, height: 852, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const SAVE_KEY = "polyforge-save-v1";
const CANONICAL_GLB_PATH = /^\/manus-storage\/[A-Za-z0-9][A-Za-z0-9._-]*\.glb$/;

/** @typedef {{severity:"info"|"warning"|"error",summary:string,reproSteps:string[]}} Finding */
/** @typedef {{movement:number,harvest:number,harvestSucceeded:number,endTurn:number}} Attempts */
/** @typedef {{seed:number,actions:string[],checks:string[],artifacts:string[],status:"passed"|"warning"|"failed"|"blocked",durationMs:number,attempts:Attempts,notes:string[]}} Case */

const findings = [];
const cases = [];
let invariantFailure = false;
let browser;
let executionBlocked = false;
let suiteTimedOut = false;
let lastCanvasTapAt = 0;

function validateBase(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
    const isLoopback = loopbackHosts.has(url.hostname.toLowerCase());
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
      throw new Error("PLAYTEST_BASE must use HTTPS unless it is exactly a localhost, 127.0.0.1, or ::1 loopback origin");
    }
    if (url.pathname !== "/" && url.pathname !== "") throw new Error("PLAYTEST_BASE must be a full origin, not a route");
    if (url.search || url.hash) throw new Error("PLAYTEST_BASE must not include query or fragment data");
    return url.origin;
  } catch (error) {
    return { invalid: String(error?.message || error) };
  }
}

function addFinding(severity, summary, reproSteps) {
  findings.push({ severity, summary, reproSteps });
  if (severity === "error") invariantFailure = true;
}

function sanitizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    // Canonical managed-storage GLB paths have no credentials or query data and
    // are the only paths that are safe/useful to retain in a network artifact.
    if (CANONICAL_GLB_PATH.test(url.pathname) && !url.search && !url.hash) return url.pathname;
  } catch {
    // The outer sanitizer still removes an unparseable URL-shaped token.
  }
  return "[url omitted]";
}

function safeError(error) {
  // Never serialize response bodies, headers, cookies, signed redirects, or
  // query tokens. Preserve the surrounding browser/error text for diagnosis.
  const message = String(error?.message || error || "unknown error");
  return message
    .replace(/https?:\/\/[^\s)\]}>"']+/gi, sanitizeUrl)
    .replace(/[?&](?:token|signature|sig|expires|x-amz-[^=&\s]+)=[^\s&]+/gi, "[query omitted]")
    .slice(0, 620);
}

function canonicalGlbPath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return CANONICAL_GLB_PATH.test(url.pathname) ? url.pathname : null;
  } catch {
    return null;
  }
}

function slug(value) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "artifact";
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function fnv1a(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function friendChallengeParam({ name, score, seed, preset, size, difficulty, tribe, won, turns }) {
  // Mirrors the public share-link encoding. The real menu still starts the
  // match through its visible ACCEPT THE DUEL control.
  const cleanName = String(name).slice(0, 24).replaceAll("|", "/");
  const body = [cleanName, score, seed >>> 0, preset, size, difficulty, tribe, won ? 1 : 0, turns].join("|");
  const raw = `${body}|${fnv1a(body) % 9973}`;
  return Buffer.from(raw, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function caseUrl(spec) {
  const c = friendChallengeParam({
    name: "Visual Runner",
    score: 0,
    seed: spec.seed,
    preset: spec.preset,
    size: spec.size,
    difficulty: "normal",
    tribe: spec.tribe,
    won: false,
    turns: 30,
  });
  return `${BASE}/?c=${encodeURIComponent(c)}`;
}

async function executableIsAccessible(candidate) {
  try {
    await access(candidate, fsConstants.R_OK | fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function locateChromiumExecutable() {
  if (process.env.PLAYTEST_CHROMIUM_PATH) {
    if (await executableIsAccessible(process.env.PLAYTEST_CHROMIUM_PATH)) return process.env.PLAYTEST_CHROMIUM_PATH;
    throw new Error("PLAYTEST_CHROMIUM_PATH is not a readable and executable Chromium binary.");
  }
  try {
    const bundled = chromium.executablePath();
    if (bundled && await executableIsAccessible(bundled)) return bundled;
  } catch {
    // Fall through to normal system-browser locations.
  }
  for (const candidate of [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ]) {
    if (await executableIsAccessible(candidate)) return candidate;
  }
  return undefined;
}

async function resolveSourceIdentity() {
  const runGit = async (args) => {
    const { stdout } = await execFile("git", ["-C", SOURCE_DIR, ...args], { maxBuffer: 1024 * 1024 });
    return stdout.trim();
  };
  const actualHead = await runGit(["rev-parse", "HEAD"]);
  if (!/^[0-9a-f]{40}$/i.test(actualHead)) throw new Error("Source repository did not return a full Git HEAD SHA.");
  const status = await runGit(["status", "--porcelain=v1"]);
  const dirtyEntries = status ? status.split("\n").filter(Boolean) : [];
  return {
    root: SOURCE_DIR,
    actualHead,
    sourceSha: process.env.PLAYTEST_SOURCE_SHA || actualHead,
    sourceShaOverridden: Boolean(process.env.PLAYTEST_SOURCE_SHA),
    dirty: dirtyEntries.length > 0,
    dirtyEntryCount: dirtyEntries.length,
  };
}

async function capture(page, caseName, label, caseData) {
  const file = path.join(OUT, `${slug(caseName)}-${slug(label)}.png`);
  // Do not request animation freezing: it changes page CSS while capturing.
  await page.screenshot({ path: file, type: "png", fullPage: false });
  const png = await readFile(file);
  caseData.artifacts.push(path.basename(file));
  caseData.checks.push(`Original PNG recorded without capture-time CSS changes: ${path.basename(file)} sha256=${sha256(png)}`);
}

async function artifactJson(caseName, label, value, caseData) {
  const file = path.join(OUT, `${slug(caseName)}-${slug(label)}.json`);
  await writeJson(file, value);
  caseData.artifacts.push(path.basename(file));
}

async function requireVisible(locator, description, timeout = ACTION_CAP_MS) {
  await locator.waitFor({ state: "visible", timeout });
  return locator;
}

function markCoverageWarning(caseData, summary, reproSteps) {
  caseData.status = caseData.status === "passed" ? "warning" : caseData.status;
  caseData.notes.push(summary);
  addFinding("warning", summary, reproSteps);
}

async function dismissOnboarding(page, caseData) {
  const intro = page.getByRole("button", { name: "To battle", exact: true });
  if (await intro.count()) {
    await requireVisible(intro, "faction introduction");
    await intro.click({ timeout: ACTION_CAP_MS });
    caseData.actions.push("Dismissed visible faction introduction with To battle.");
  }
  const skip = page.getByRole("button", { name: "Skip tutorial", exact: true });
  if (await skip.count()) {
    await requireVisible(skip, "tutorial skip");
    await skip.click({ timeout: ACTION_CAP_MS });
    caseData.actions.push("Dismissed visible onboarding with Skip tutorial.");
  }
}

async function configureVisualMode(page, spec, caseData) {
  const options = page.getByRole("region", { name: "Beta visual options" });
  await requireVisible(options, "Beta visual options", NAVIGATION_CAP_MS);
  const newVisuals = options.getByLabel("New visuals (beta)", { exact: true });
  const landscape = options.getByLabel("Landscape improvements (beta)", { exact: true });
  if (!spec.beta) {
    if (await newVisuals.isChecked() || await landscape.isChecked()) {
      throw new Error("Default visual case did not open with both beta visual controls off.");
    }
    caseData.checks.push("The real menu showed both beta visual controls off before match start.");
    return;
  }
  if (!(await newVisuals.isChecked())) await newVisuals.click({ timeout: ACTION_CAP_MS });
  if (!(await landscape.isChecked())) await landscape.click({ timeout: ACTION_CAP_MS });
  if (!(await newVisuals.isChecked()) || !(await landscape.isChecked())) {
    throw new Error("The real menu did not retain both requested beta visual selections.");
  }
  caseData.actions.push("Enabled visible New visuals (beta) and Landscape improvements (beta) menu controls.");
}

async function waitForCanvas(page) {
  const canvas = page.locator("canvas[data-engine]");
  await requireVisible(canvas, "game canvas", NAVIGATION_CAP_MS);
  await page.waitForFunction(() => Boolean(window.__sunderScene), null, { timeout: NAVIGATION_CAP_MS });
  return canvas;
}

async function readSceneDiagnostics(page) {
  return page.evaluate(() => {
    const scene = window.__sunderScene;
    const diagnostics = scene?.metadata?.betaVisualDiagnostics?.() ?? null;
    return {
      diagnostics,
      meshCount: Array.isArray(scene?.meshes) ? scene.meshes.length : null,
      activeCamera: Boolean(scene?.activeCamera),
      importStates: Array.isArray(scene?.transformNodes)
        ? scene.transformNodes
            .filter((node) => /^u\d+$/.test(String(node?.name || "")) && node?.metadata?.visualImportState)
            .map((node) => ({
              name: String(node.name),
              state: String(node.metadata.visualImportState),
              beta: Boolean(node.metadata.visualBeta),
            }))
        : [],
    };
  });
}

async function waitForBetaVisualReadiness(page, caseData) {
  await page.waitForFunction(() => {
    const scene = window.__sunderScene;
    if (!scene?.activeCamera || !Array.isArray(scene.transformNodes)) return false;
    const importStates = scene.transformNodes
      .filter((node) => /^u\d+$/.test(String(node?.name || "")) && node?.metadata?.visualImportState)
      .map((node) => String(node.metadata.visualImportState));
    const terminal = importStates.every((state) => ["ready", "failed", "deferred"].includes(state));
    const activeLoads = scene.metadata?.betaVisualDiagnostics?.()?.cache?.activeLoads ?? 0;
    return terminal && activeLoads === 0;
  }, null, { timeout: BETA_READY_CAP_MS });

  const materialState = await page.evaluate(async () => {
    const scene = window.__sunderScene;
    if (!scene) throw new Error("Scene disappeared before beta visual readiness check.");
    const ready = await Promise.race([
      scene.whenReadyAsync(true).then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 4_000)),
    ]);
    // Render two normal frames after terminal imports so the first shader frame
    // is never the frame recorded by a screenshot. This neither freezes nor
    // edits any visual state.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    scene.render();
    scene.render();
    return {
      sceneReady: Boolean(ready),
      importStates: scene.transformNodes
        .filter((node) => /^u\d+$/.test(String(node?.name || "")) && node?.metadata?.visualImportState)
        .map((node) => ({ name: String(node.name), state: String(node.metadata.visualImportState) })),
    };
  });
  if (!materialState.sceneReady) throw new Error("Beta scene materials did not become ready before the bounded capture window.");
  caseData.checks.push("Beta imports reached ready/failed/deferred terminal state and two normal shader-warm frames rendered before capture.");
  return materialState;
}

function parseNormalSave(raw, context) {
  if (!raw) throw new Error(`${context}: normal local autosave was absent.`);
  let save;
  try {
    save = JSON.parse(raw);
  } catch {
    throw new Error(`${context}: normal local autosave was not valid JSON.`);
  }
  if (!save || typeof save !== "object" || Array.isArray(save) || Object.prototype.hasOwnProperty.call(save, "state")) {
    throw new Error(`${context}: expected the direct normal save object, not a wrapped state payload.`);
  }
  if (!Array.isArray(save.units) || !Array.isArray(save.tiles) || !Array.isArray(save.cities) || !Array.isArray(save.tribes)) {
    throw new Error(`${context}: direct normal save object was missing playable state collections.`);
  }
  return save;
}

async function readNormalSave(page, context) {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);
  return parseNormalSave(raw, context);
}

async function waitForSave(page, description, predicate, timeout = ACTION_CAP_MS) {
  const deadline = Date.now() + timeout;
  let lastSave;
  while (Date.now() < deadline) {
    try {
      const save = await readNormalSave(page, description);
      lastSave = save;
      if (predicate(save)) return save;
    } catch {
      // Startup/AI transitions can briefly precede an autosave. Keep polling
      // only within the documented bounded action window.
    }
    await page.waitForTimeout(120);
  }
  const lastTurn = Number.isFinite(lastSave?.turn) ? lastSave.turn : "unavailable";
  throw new Error(`${description}: expected normal autosave condition was not reached before timeout (last turn ${lastTurn}).`);
}

function saveUnitById(save, unitId) {
  return save.units.find((unit) => unit?.id === unitId) ?? null;
}

function isHumanVisible(save, x, y) {
  const human = save.humanTribe;
  const hasVision = (entry) => entry?.tribe === human && Math.max(Math.abs(entry.x - x), Math.abs(entry.y - y)) <= 2;
  return save.units.some(hasVision) || save.cities.some(hasVision);
}

function harvestCandidatesFromSave(save) {
  const human = save.humanTribe;
  const tribe = save.tribes[human];
  if (!tribe || save.phase !== "playing" || save.currentTribe !== human || save.aiThinking || save.pendingPerk != null || save.pendingCityReward != null) return [];
  const requiredTech = { fruit: "organization", animal: "hunting", mineral: "mining" };
  const label = { fruit: "Harvest fruit", animal: "Hunt animals", mineral: "Mine minerals" };
  const cost = tribe.passive === "harvesters" ? 1 : 2;
  if (!Array.isArray(tribe.techs) || Number(tribe.stars) < cost) return [];
  return save.tiles
    .filter((tile) => {
      const resource = tile?.resource;
      if (!Object.hasOwn(requiredTech, resource)) return false;
      const owner = tile.ownerCityId == null ? null : save.cities[tile.ownerCityId];
      return Boolean(
        owner?.tribe === human &&
        tile.explored?.[human] &&
        isHumanVisible(save, tile.x, tile.y) &&
        tribe.techs.includes(requiredTech[resource]),
      );
    })
    .map((tile) => ({ x: tile.x, y: tile.y, resource: tile.resource, label: label[tile.resource], cost }));
}

/**
 * Project a real renderer node/mesh to CSS canvas pixels. It deliberately
 * avoids picking imported unit or highlight meshes: those are renderer-only.
 * Instead it validates the projected point against a separately picked tile
 * metadata record, which is what GameCanvas uses to find game coordinates.
 */
async function projectRenderedPoint(page, request) {
  return page.evaluate((payload) => {
    const scene = window.__sunderScene;
    const canvas = document.querySelector("canvas[data-engine]");
    const camera = scene?.activeCamera;
    if (!scene || !canvas || !camera) return null;
    const engine = scene.getEngine?.();
    const Vector3 = camera.position?.constructor;
    const Matrix = scene.getTransformMatrix?.()?.constructor;
    if (!engine || typeof Vector3?.Project !== "function" || typeof Matrix?.Identity !== "function") return null;
    const rect = canvas.getBoundingClientRect();
    const renderWidth = engine.getRenderWidth?.();
    const renderHeight = engine.getRenderHeight?.();
    if (!rect.width || !rect.height || !renderWidth || !renderHeight) return null;
    const viewport = camera.viewport?.toGlobal
      ? camera.viewport.toGlobal(renderWidth, renderHeight)
      : { x: 0, y: 0, width: renderWidth, height: renderHeight };
    const matches = (metadata) => metadata?.tile === true && metadata.x === payload.x && metadata.y === payload.y;
    let subject = null;
    if (payload.kind === "unit") {
      const expectedName = `u${payload.unitId}`;
      subject = scene.transformNodes.find((node) => /^u\d+$/.test(String(node?.name || "")) && node.name === expectedName) ?? null;
    } else {
      const names = new Set(payload.preferredNames || []);
      subject = scene.meshes.find((mesh) => {
        if (!mesh || mesh.isDisposed?.() || !mesh.isVisible || !matches(mesh.metadata)) return false;
        return names.size === 0 || names.has(String(mesh.name || ""));
      }) ?? null;
      if (!subject && payload.allowTileFallback) {
        subject = scene.meshes.find((mesh) => mesh && !mesh.isDisposed?.() && mesh.isVisible && matches(mesh.metadata)) ?? null;
      }
    }
    if (!subject || subject.isDisposed?.()) return null;
    const world = subject.getAbsolutePosition?.() ?? subject.absolutePosition ?? subject.position;
    if (!world) return null;
    // Use the runtime Babylon constructors rather than importing a second copy:
    // static Vector3.Project + Matrix.Identity + scene transform matrix gives
    // actual renderer coordinates. Conversion to CSS pixels accounts for the
    // engine render size/hardware scaling before Playwright taps the canvas.
    const projected = Vector3.Project(world, Matrix.Identity(), scene.getTransformMatrix(), viewport);
    const cssX = projected.x * (rect.width / renderWidth);
    const cssY = projected.y * (rect.height / renderHeight);
    if (!Number.isFinite(cssX) || !Number.isFinite(cssY) || cssX < 2 || cssY < 2 || cssX > rect.width - 2 || cssY > rect.height - 2) return null;
    // Babylon's InputManager stores pointerX/Y as canvas-relative CSS pixels.
    // Validate with that exact coordinate space, not the render-buffer values
    // returned by Vector3.Project, before Playwright sends the same CSS tap.
    const tilePick = scene.pick(cssX, cssY, (mesh) => {
      const name = String(mesh?.name || "");
      return Boolean(mesh?.metadata?.tile) && !["hl", "atk", "sel", "sigil"].includes(name);
    });
    if (!matches(tilePick?.pickedMesh?.metadata)) return null;
    return {
      x: cssX,
      y: cssY,
      tile: { x: payload.x, y: payload.y },
      sourceName: String(subject.name || ""),
      hardwareScaling: engine.getHardwareScalingLevel?.() ?? null,
    };
  }, request);
}

async function legalHighlightPoints(page) {
  return page.evaluate(() => {
    const scene = window.__sunderScene;
    const canvas = document.querySelector("canvas[data-engine]");
    const camera = scene?.activeCamera;
    if (!scene || !canvas || !camera) return [];
    const engine = scene.getEngine?.();
    const Vector3 = camera.position?.constructor;
    const Matrix = scene.getTransformMatrix?.()?.constructor;
    if (!engine || typeof Vector3?.Project !== "function" || typeof Matrix?.Identity !== "function") return [];
    const rect = canvas.getBoundingClientRect();
    const renderWidth = engine.getRenderWidth?.();
    const renderHeight = engine.getRenderHeight?.();
    if (!rect.width || !rect.height || !renderWidth || !renderHeight) return [];
    const viewport = camera.viewport?.toGlobal
      ? camera.viewport.toGlobal(renderWidth, renderHeight)
      : { x: 0, y: 0, width: renderWidth, height: renderHeight };
    const points = [];
    for (const mesh of scene.meshes) {
      if (mesh?.name !== "hl" || mesh.isDisposed?.() || !mesh.isVisible || mesh.metadata?.tile !== true) continue;
      const projected = Vector3.Project(mesh.getAbsolutePosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const x = projected.x * (rect.width / renderWidth);
      const y = projected.y * (rect.height / renderHeight);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 2 || y < 2 || x > rect.width - 2 || y > rect.height - 2) continue;
      // The highlight only supplies a visible legal target and its tile metadata.
      // Verify the coordinate against a non-highlight tile pick before tapping.
      const pick = scene.pick(x, y, (candidate) => candidate?.metadata?.tile === true && candidate?.name !== "hl");
      if (pick?.pickedMesh?.metadata?.x !== mesh.metadata.x || pick?.pickedMesh?.metadata?.y !== mesh.metadata.y) continue;
      points.push({ x, y, tile: { x: mesh.metadata.x, y: mesh.metadata.y }, hardwareScaling: engine.getHardwareScalingLevel?.() ?? null });
    }
    return points;
  });
}

async function canvasPointerTap(canvas, point, caseData, description) {
  if (!point) throw new Error(`${description}: no projected, metadata-validated canvas tile was available.`);
  const remaining = CANVAS_TAP_GAP_MS - (Date.now() - lastCanvasTapAt);
  if (remaining > 0) await canvas.page().waitForTimeout(remaining);
  // Locator.click dispatches a real browser pointer sequence to the canvas. The
  // time gap prevents Babylon from interpreting separate player actions as a
  // double tap.
  await canvas.click({ position: { x: point.x, y: point.y }, timeout: ACTION_CAP_MS });
  lastCanvasTapAt = Date.now();
  caseData.checks.push(`${description}: projected world point used CSS coordinates after renderer hardware-scaling conversion.`);
}

async function selectAndMoveOneLegalUnit(page, canvas, caseData) {
  const before = await readNormalSave(page, "before unit selection");
  const human = before.humanTribe;
  const ownUnits = before.units.filter((unit) => unit?.tribe === human && unit?.moved !== true && Number.isInteger(unit?.id));
  if (!ownUnits.length) throw new Error("No unmoved human-controlled unit was present in the normal local save.");

  let chosen;
  for (const unit of ownUnits) {
    const point = await projectRenderedPoint(page, { kind: "unit", unitId: unit.id, x: unit.x, y: unit.y });
    if (!point) continue;
    await canvasPointerTap(canvas, point, caseData, `Selected own unit u${unit.id}`);
    await page.waitForFunction(() => {
      const scene = window.__sunderScene;
      return Array.isArray(scene?.meshes) && scene.meshes.some((mesh) => mesh?.name === "hl" && mesh?.metadata?.tile === true);
    }, null, { timeout: ACTION_CAP_MS });
    chosen = unit;
    break;
  }
  if (!chosen) throw new Error("No projected own-unit root could be validated against a visible tile pick.");

  const targets = await legalHighlightPoints(page);
  if (!targets.length) throw new Error(`Own unit u${chosen.id} exposed no projected, tile-validated legal movement highlight.`);
  const target = targets[0];
  caseData.attempts.movement += 1;
  await canvasPointerTap(canvas, target, caseData, `Moved own unit u${chosen.id} to legal highlight (${target.tile.x},${target.tile.y})`);
  const moved = await waitForSave(
    page,
    `movement of own unit u${chosen.id}`,
    (save) => {
      const unit = saveUnitById(save, chosen.id);
      return Boolean(unit && unit.x === target.tile.x && unit.y === target.tile.y && unit.moved === true);
    },
  );
  if (!saveUnitById(moved, chosen.id)) throw new Error("Moved unit disappeared from the normal autosave.");
  caseData.actions.push(`Moved human-controlled unit u${chosen.id} with a real canvas tap to (${target.tile.x},${target.tile.y}).`);
}

function getCityPanelPopup(page) {
  // Hud.tsx gives the city panel no synthetic test role. This is its actual
  // visible population line and is therefore the stable player-facing popup cue.
  return page.getByText(/^Level \d+ · Pop \d+\/3$/, { exact: true }).first();
}

async function inspectCity(page, canvas, caseData) {
  const save = await readNormalSave(page, "before city inspection");
  const city = save.cities.find((entry) => entry?.tribe === save.humanTribe);
  if (!city) throw new Error("Normal local save has no human-owned city to inspect.");
  const point = await projectRenderedPoint(page, {
    kind: "mesh",
    x: city.x,
    y: city.y,
    preferredNames: ["cityplate", "cityedge"],
    allowTileFallback: true,
  });
  await canvasPointerTap(canvas, point, caseData, `Inspected own city at (${city.x},${city.y})`);
  await requireVisible(getCityPanelPopup(page), "city inspection popup");
  caseData.actions.push("Inspected a visible human-owned city through its normal canvas selection popup.");
}

async function inspectAndHarvestResource(page, canvas, caseData, spec) {
  const save = await readNormalSave(page, "before resource inspection");
  const candidates = harvestCandidatesFromSave(save);
  if (!candidates.length) {
    markCoverageWarning(
      caseData,
      `Coverage-limited in ${spec.name}: normal save exposed no visible, human-owned, tech-and-cost-eligible harvest action.`,
      [`Replay fixed seed ${spec.seed} through the ordinary menu and inspect visible human territory.`, "Do not substitute hidden, enemy, or ineligible resources."],
    );
    return;
  }

  let selected;
  for (const candidate of candidates) {
    const point = await projectRenderedPoint(page, {
      kind: "mesh",
      x: candidate.x,
      y: candidate.y,
      preferredNames: ["res", "berry", "head", "ear", "crystal"],
      // Renderer decor can batch a visible resource mesh under a material
      // batch name. This fallback still requires the exact save-qualified,
      // currently visible, human-owned tile metadata; it never chooses a
      // random bush or a hidden/enemy resource.
      allowTileFallback: true,
    });
    if (point) {
      selected = { ...candidate, point };
      break;
    }
  }
  if (!selected) {
    markCoverageWarning(
      caseData,
      `Coverage-limited in ${spec.name}: eligible owned resource coordinates were not visibly rendered as a projectable resource mesh.`,
      [`Replay fixed seed ${spec.seed} and inspect only the normal visible human-owned resource tiles.`, "Do not use a random bush or a hidden tile as a substitute."],
    );
    return;
  }

  await canvasPointerTap(canvas, selected.point, caseData, `Inspected eligible owned ${selected.resource} resource at (${selected.x},${selected.y})`);
  const panel = page.getByRole("region", { name: "Resource actions" });
  await requireVisible(panel, "Resource actions panel");
  const harvest = panel.getByRole("button", {
    name: new RegExp(`^(?:Harvest fruit|Hunt animals|Mine minerals)\\s+${selected.cost}$`, "i"),
  });
  await requireVisible(harvest, `${selected.label} action with displayed ${selected.cost}-star cost`);
  if (await harvest.isDisabled()) {
    throw new Error(`Visible Resource actions panel offered disabled ${selected.label} despite save-derived ownership, tech, visibility, and cost eligibility.`);
  }
  caseData.attempts.harvest += 1;
  await harvest.click({ timeout: ACTION_CAP_MS });
  await waitForSave(
    page,
    `harvest of ${selected.resource} at (${selected.x},${selected.y})`,
    (after) => {
      const tile = after.tiles.find((entry) => entry?.x === selected.x && entry?.y === selected.y);
      return Boolean(tile && tile.resource == null);
    },
  );
  caseData.attempts.harvestSucceeded += 1;
  caseData.actions.push(`Used the actual Resource actions ${selected.label} button showing ${selected.cost} stars.`);
  caseData.checks.push("Harvest was verified from the direct normal local save after the visible UI action.");
}

function getEndTurnWarning(page) {
  // Hud.tsx intentionally keeps the same End Turn button. The real confirmation
  // UI is the visible nudge text after the first tap.
  return page.getByText(/^\d+ units? can still act — tap again to end$/, { exact: true });
}

async function dismissRecapIfShown(page, caseData) {
  const recap = page.getByRole("button", { name: "Dismiss recap", exact: true });
  if (await recap.isVisible({ timeout: 900 }).catch(() => false)) {
    await recap.click({ timeout: ACTION_CAP_MS });
    caseData.actions.push("Dismissed the visible turn recap before the next human control action.");
  }
}

async function waitForHumanControlsAfterTurn(page, oldTurn, caseData) {
  const after = await waitForSave(
    page,
    `turn advancement after saved turn ${oldTurn}`,
    (save) => Number.isFinite(save.turn) && save.turn > oldTurn && save.phase === "playing" && save.currentTribe === save.humanTribe && !save.aiThinking,
    ACTION_CAP_MS,
  );
  await dismissRecapIfShown(page, caseData);
  await requireVisible(page.getByRole("button", { name: "End Turn", exact: true }), "human End Turn control after turn advancement");
  return after;
}

async function playThreeTurns(page, caseData) {
  const endTurn = page.getByRole("button", { name: "End Turn", exact: true });
  for (let completed = 1; completed <= 3; completed += 1) {
    const before = await readNormalSave(page, `before End Turn ${completed}`);
    const oldTurn = before.turn;
    await requireVisible(endTurn, `End Turn ${completed}`);
    await endTurn.click({ timeout: ACTION_CAP_MS });
    caseData.attempts.endTurn += 1;

    // A second click is legal only if the actual warning rendered after the
    // first one. Never click three times or assume a turn advanced.
    const warning = getEndTurnWarning(page);
    if (await warning.isVisible({ timeout: 700 }).catch(() => false)) {
      await endTurn.click({ timeout: ACTION_CAP_MS });
      caseData.attempts.endTurn += 1;
      caseData.actions.push(`Confirmed End Turn ${completed} through the visible remaining-units warning UI.`);
    }
    const after = await waitForHumanControlsAfterTurn(page, oldTurn, caseData);
    if (!(after.turn > oldTurn)) throw new Error(`End Turn ${completed} did not advance the normal saved turn monotonically.`);
    caseData.actions.push(`Ended turn ${completed}; direct normal autosave advanced from ${oldTurn} to ${after.turn}.`);
  }
}

async function assertSaveAndReload(page, spec, caseData) {
  const save = await readNormalSave(page, "before save/reload verification");
  if (save.seed !== spec.seed) throw new Error("Autosave seed did not match the player-visible fixed seed.");
  await artifactJson(spec.name, "save-readonly", {
    note: "Read-only direct local save summary; full payload intentionally excluded.",
    seed: save.seed,
    turn: save.turn,
    phase: save.phase,
    size: save.size,
    preset: save.preset,
    humanTribe: save.humanTribe,
  }, caseData);
  caseData.checks.push("Read-only direct normal save confirms expected fixed seed and playing snapshot.");

  await page.reload({ waitUntil: "domcontentloaded", timeout: NAVIGATION_CAP_MS });
  const continueButton = page.getByRole("button", { name: /^CONTINUE — .+, TURN \d+ \([^)]+\)$/ });
  await requireVisible(continueButton, "exact visible CONTINUE save control", NAVIGATION_CAP_MS);
  await continueButton.click({ timeout: ACTION_CAP_MS });
  const canvas = await waitForCanvas(page);
  await dismissOnboarding(page, caseData);
  await canvas.waitFor({ state: "visible", timeout: ACTION_CAP_MS });
  const reloaded = await readNormalSave(page, "after save/reload verification");
  if (reloaded.seed !== spec.seed) throw new Error("Reloaded direct normal save no longer matched the fixed seed.");
  caseData.actions.push("Reloaded the saved match through the exact visible CONTINUE control.");
  caseData.checks.push("Visible save/reload preserved the expected seed.");
}

async function probeProductionApi() {
  const endpoint = `${BASE}/api/trpc/auth.me?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: null } }))}`;
  const response = await fetch(endpoint, {
    redirect: "manual",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(NAVIGATION_CAP_MS),
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  const hasJsonEnvelope = Boolean(parsed && (Array.isArray(parsed) || typeof parsed === "object"));
  if (!response.ok || !/application\/json/i.test(contentType) || !hasJsonEnvelope) {
    throw new Error(`auth.me JSON probe rejected: HTTP ${response.status}, content-type ${contentType || "missing"}.`);
  }
  return { status: response.status, contentType: contentType.split(";")[0], envelope: Array.isArray(parsed) ? "array" : "object" };
}

async function attachCanonicalGlbNetworkObserver(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  const byRequestId = new Map();
  const observedPaths = new Set();
  cdp.on("Network.requestWillBeSent", (event) => {
    const pathName = canonicalGlbPath(event?.request?.url || "");
    if (pathName) byRequestId.set(event.requestId, pathName);
  });
  cdp.on("Network.responseReceived", (event) => {
    const pathName = byRequestId.get(event.requestId);
    if (!pathName) return;
    const response = event.response || {};
    // Count only a canonical initial request that received a network response;
    // never retain or count signed redirect destinations, disk-cache-only,
    // prefetch-cache, or service-worker responses.
    if (!response.fromDiskCache && !response.fromPrefetchCache && !response.fromServiceWorker) observedPaths.add(pathName);
  });
  return {
    canonicalGlbNetworkPaths: observedPaths,
    detach: async () => { await cdp.detach().catch(() => {}); },
  };
}

function isExpectedBetaFallback(rawMessage, sawCanonicalGlb) {
  return Boolean(sawCanonicalGlb && /(?:failed to load resource|net::err_|glb|beta unit model unavailable)/i.test(rawMessage));
}

async function runCase(spec) {
  const started = Date.now();
  /** @type {Case} */
  const caseData = {
    seed: spec.seed,
    actions: [],
    checks: [],
    artifacts: [],
    status: "passed",
    durationMs: 0,
    attempts: { movement: 0, harvest: 0, harvestSucceeded: 0, endTurn: 0 },
    notes: [],
  };
  let context;
  let networkObserver;
  try {
    context = await browser.newContext({ viewport: PHONE, screen: PHONE, userAgent: "Sunder visual playtest phone" });
    const page = await context.newPage();
    page.setDefaultTimeout(ACTION_CAP_MS);
    const pageErrors = [];
    const consoleErrors = [];
    const fallbackWarnings = [];
    networkObserver = await attachCanonicalGlbNetworkObserver(page);
    page.on("pageerror", (error) => pageErrors.push(safeError(error)));
    page.on("console", (message) => {
      const raw = message.text();
      if (message.type() === "error") {
        if (spec.beta && isExpectedBetaFallback(raw, networkObserver.canonicalGlbNetworkPaths.size > 0)) {
          fallbackWarnings.push(safeError(raw));
        } else {
          consoleErrors.push(safeError(raw));
        }
      }
      if (message.type() === "warning" && spec.beta && /beta unit model unavailable|procedural actor retained/i.test(raw)) {
        fallbackWarnings.push(safeError(raw));
      }
    });

    await Promise.race([
      page.goto(caseUrl(spec), { waitUntil: "domcontentloaded", timeout: NAVIGATION_CAP_MS }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Case navigation duration cap reached.")), CASE_CAP_MS)),
    ]);
    await configureVisualMode(page, spec, caseData);
    const accept = page.getByText("ACCEPT THE DUEL", { exact: true });
    await requireVisible(accept, "real friend challenge acceptance control", NAVIGATION_CAP_MS);
    await accept.click({ timeout: ACTION_CAP_MS });
    caseData.actions.push(`Started fixed seed ${spec.seed} through the visible ACCEPT THE DUEL menu control.`);

    const canvas = await waitForCanvas(page);
    await dismissOnboarding(page, caseData);
    if (spec.beta) await waitForBetaVisualReadiness(page, caseData);

    await capture(page, spec.name, "opened", caseData);
    const initialDiag = await readSceneDiagnostics(page);
    await artifactJson(spec.name, "scene-open", initialDiag, caseData);
    assertScene(spec, initialDiag, caseData);

    await selectAndMoveOneLegalUnit(page, canvas, caseData);
    await inspectCity(page, canvas, caseData);
    await inspectAndHarvestResource(page, canvas, caseData, spec);
    await playThreeTurns(page, caseData);
    if (spec.beta) await waitForBetaVisualReadiness(page, caseData);
    await capture(page, spec.name, "after-three-turns", caseData);

    const finalDiag = await readSceneDiagnostics(page);
    await artifactJson(spec.name, "scene-final", finalDiag, caseData);
    assertScene(spec, finalDiag, caseData);
    await assertSaveAndReload(page, spec, caseData);
    if (spec.beta) await waitForBetaVisualReadiness(page, caseData);
    await capture(page, spec.name, "reloaded", caseData);

    const glbObservation = {
      canonicalNetworkGlbPaths: [...networkObserver.canonicalGlbNetworkPaths].sort(),
      count: networkObserver.canonicalGlbNetworkPaths.size,
      note: "Canonical initial GLB request paths only; signed redirects and cache-only responses are excluded.",
    };
    await artifactJson(spec.name, "canonical-glb-network", glbObservation, caseData);
    if (!spec.beta && glbObservation.count !== 0) {
      throw new Error(`Default visuals made ${glbObservation.count} actual canonical GLB network request(s); expected 0.`);
    }
    if (!spec.beta) caseData.checks.push("Default visuals made zero actual canonical GLB network requests.");

    if (pageErrors.length) throw new Error(`PAGEERROR: ${pageErrors.join(" | ")}`);
    if (consoleErrors.length) throw new Error(`console.error: ${consoleErrors.join(" | ")}`);
    if (fallbackWarnings.length) {
      markCoverageWarning(
        caseData,
        `Expected beta network fallback console warning in ${spec.name}: ${fallbackWarnings.join(" | ")}`,
        [`Replay fixed seed ${spec.seed} with both visible beta toggles enabled.`, "Confirm the procedural fallback remains playable and inspect the canonical GLB network artifact."],
      );
    }
    if (caseData.attempts.harvest > 0 && caseData.attempts.harvestSucceeded !== caseData.attempts.harvest) {
      throw new Error(`Harvest attempt counter mismatch: attempted ${caseData.attempts.harvest}, verified ${caseData.attempts.harvestSucceeded}.`);
    }
    caseData.checks.push(`Attempt counters verified: movement=${caseData.attempts.movement}, harvest=${caseData.attempts.harvest}/${caseData.attempts.harvestSucceeded}, End Turn clicks=${caseData.attempts.endTurn}.`);
  } catch (error) {
    caseData.status = "failed";
    const message = safeError(error);
    caseData.notes.push(message);
    addFinding("error", `Invariant failure in ${spec.name}: ${message}`, [
      `Run scripts/playtest-visual.mjs with PLAYTEST_BASE set to the same deployment or allowed loopback origin.`,
      `Use fixed seed ${spec.seed} and repeat the recorded player-visible actions.`,
    ]);
  } finally {
    caseData.durationMs = Date.now() - started;
    if (caseData.durationMs > CASE_CAP_MS) {
      caseData.status = "failed";
      addFinding("error", `${spec.name} exceeded its ${CASE_CAP_MS}ms duration cap.`, [`Run the same fixed seed ${spec.seed}; do not extend the cap without review.`]);
    }
    if (networkObserver) await networkObserver.detach();
    if (context) await context.close(); // sequential contexts: never parallel WebGL cases
    cases.push(caseData);
  }
}

function assertScene(spec, scene, caseData) {
  if (!scene?.activeCamera || !Number.isFinite(scene?.meshCount) || scene.meshCount <= 0) {
    throw new Error("Rendered scene diagnostics did not expose an active camera and nonempty mesh set.");
  }
  const diag = scene.diagnostics;
  if (spec.beta) {
    if (diag?.newVisuals !== true || diag?.landscape !== true) throw new Error("The explicit beta visual toggles were not active in renderer diagnostics.");
    const cache = diag?.cache;
    if (cache) {
      if (cache.maxModels !== 16 || cache.maxTextureBytes !== 64 * 1024 * 1024) throw new Error("Beta model cache limits differ from the shipped bounded contract.");
      if (cache.activeLoads > 2 || cache.loadedModels > 16 || cache.totalTextureBytes > cache.maxTextureBytes) throw new Error("Beta visual cache exceeded a bounded-load invariant.");
      caseData.checks.push("Beta cache diagnostics remained within 2 concurrent loads, 16 models, and 64 MiB estimated texture budget.");
    } else {
      markCoverageWarning(
        caseData,
        `No visible beta GLB template was observed in ${spec.name}; this is coverage-limited, not a crash.`,
        [`Replay fixed seed ${spec.seed} with New visuals (beta) and Landscape improvements (beta) enabled.`, "Do not infer coverage for every unit from this bounded match."],
      );
    }
    const missing = scene.importStates.filter((entry) => entry.state !== "ready");
    if (missing.length) {
      markCoverageWarning(
        caseData,
        `Visible beta-model fallback occurred in ${spec.name} (${missing.length} terminal non-ready import state(s)); report as coverage warning only.`,
        [`Replay fixed seed ${spec.seed} with both beta visual controls enabled.`, "Confirm gameplay remains usable with the visible procedural fallback; do not classify missing models as a crash."],
      );
    }
  } else {
    if (diag?.newVisuals !== false || diag?.landscape !== false) throw new Error("Default visual case did not retain both beta visual preferences off.");
    if (diag?.cache !== null) throw new Error("Default visual case created GLB model cache while beta visuals were off.");
    caseData.checks.push("Default case retained zero GLB cache diagnostics with both beta options off.");
  }
}

function reportStatus() {
  if (!BASE || BASE.invalid || executionBlocked) return "blocked";
  if (invariantFailure) return "failed";
  if (cases.some((entry) => entry.status === "warning")) return "warning";
  return "passed";
}

function markdownReport(report) {
  const sourceWorkspace = report.source?.dirty == null
    ? "unresolved"
    : report.source.dirty
      ? `dirty (${report.source.dirtyEntryCount} Git status entr${report.source.dirtyEntryCount === 1 ? "y" : "ies"})`
      : "clean";
  const lines = [
    "# Sunder visual playtest runner report",
    "",
    `- Lane: \`${report.lane}\``,
    `- Status: **${report.status}**`,
    `- Source SHA: \`${report.sourceSha}\`${report.source?.sourceShaOverridden ? " (PLAYTEST_SOURCE_SHA override)" : ""}`,
    `- Source workspace: **${sourceWorkspace}**`,
    `- Source repository: \`${report.source?.root || SOURCE_DIR}\``,
    `- Schema version: ${report.version}`,
    `- Execution: ${report.status === "blocked" ? "not run (preflight blocked)" : "runner result"}`,
    "",
    "## Scope and bounds",
    "",
    "This is a report-only, two-case mobile runner. It neither starts a server nor schedules background work. Each case uses a sequential browser context, an explicit seed, original PNG capture, and a bounded duration. It drives the normal menu, canvas, and HUD; it does not call GameStore, use debug fixtures, inject state, or bypass UI actions.",
    "",
    "## Cases",
    "",
  ];
  for (const entry of report.cases) {
    lines.push(`### Seed ${entry.seed} — ${entry.status}`, "");
    lines.push(`Duration: ${entry.durationMs} ms`, "", `Attempt counters: movement=${entry.attempts.movement}, harvest=${entry.attempts.harvest}/${entry.attempts.harvestSucceeded} verified, End Turn clicks=${entry.attempts.endTurn}`, "", "Actions:");
    for (const action of entry.actions) lines.push(`- ${action}`);
    lines.push("", "Checks:");
    for (const check of entry.checks) lines.push(`- ${check}`);
    if (entry.artifacts.length) {
      lines.push("", "Artifacts (original, unmodified):");
      for (const artifact of entry.artifacts) lines.push(`- \`${artifact}\``);
    }
    if (entry.notes?.length) {
      lines.push("", "Notes:");
      for (const note of entry.notes) lines.push(`- ${note}`);
    }
    lines.push("");
  }
  lines.push("## Findings", "");
  if (!report.findings.length) lines.push("- No runtime findings recorded.");
  for (const finding of report.findings) {
    lines.push(`### ${finding.severity}: ${finding.summary}`, "");
    for (const step of finding.reproSteps) lines.push(`- ${step}`);
    lines.push("");
  }
  lines.push("## Limitations", "");
  for (const limitation of report.limitations) lines.push(`- ${limitation}`);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {
    version: VERSION,
    lane: LANE,
    status: "blocked",
    sourceSha: process.env.PLAYTEST_SOURCE_SHA || "unresolved",
    source: { root: SOURCE_DIR, dirty: null, dirtyEntryCount: 0, sourceShaOverridden: Boolean(process.env.PLAYTEST_SOURCE_SHA) },
    cases,
    findings,
    limitations: [
      "This runner is bounded to two sequential phone-sized matches and a four-minute aggregate cap, not every faction, unit, GLB, device, GPU, or network condition.",
      "Missing or unavailable imported models are recorded as coverage warnings because shipped behavior retains a procedural fallback; they are not classified as crashes.",
      "Cache values are decoded-template texture estimates (not native RAM measurements); this report makes no native-RAM approval claim.",
      "PNG artifacts are original Playwright captures. The runner never edits, annotates, crops, freezes CSS animations, or changes screenshot pixels.",
      "No semantic/aesthetic judgment is made from image metrics. A later human reviewer must inspect original PNGs for visual-quality findings.",
      "Raw redirects, response bodies, cookies, authorization values, signed URLs, and other secrets are intentionally excluded from reports and artifacts.",
      "This invocation does not launch a server. PLAYTEST_BASE must be an externally managed HTTPS origin or an exact localhost/127.0.0.1/::1 HTTP loopback origin whose auth.me endpoint returns JSON.",
    ],
  };

  try {
    report.source = await resolveSourceIdentity();
    report.sourceSha = report.source.sourceSha;
    if (report.source.dirty) {
      findings.push({
        severity: "warning",
        summary: `Source workspace is dirty (${report.source.dirtyEntryCount} Git status entr${report.source.dirtyEntryCount === 1 ? "y" : "ies"}); source SHA alone is not a complete source identity.`,
        reproSteps: ["Review the source repository Git status before treating this run as a clean-commit result.", "Re-run from a clean checkout if a commit-exact visual result is required."],
      });
    }
  } catch (error) {
    executionBlocked = true;
    findings.push({
      severity: "warning",
      summary: `Runner blocked: source identity probe failed: ${safeError(error)}`,
      reproSteps: [`Ensure ${SOURCE_DIR} is the actual source Git worktree, or set PLAYTEST_SOURCE_DIR.`, "Re-run only after Git HEAD and status can be read."],
    });
  }

  if (!executionBlocked && (!BASE || BASE.invalid)) {
    executionBlocked = true;
    findings.push({
      severity: "warning",
      summary: `Runner blocked: ${BASE?.invalid || "PLAYTEST_BASE is required"}`,
      reproSteps: ["Set PLAYTEST_BASE to an HTTPS deployment origin or an exact allowed loopback HTTP origin.", "Re-run the bounded runner; it does not start a server."],
    });
  }

  if (!executionBlocked) {
    try {
      const probe = await probeProductionApi();
      findings.push({ severity: "info", summary: `auth.me JSON probe accepted (${probe.status} ${probe.contentType}; ${probe.envelope} envelope).`, reproSteps: ["Probe /api/trpc/auth.me using the configured deployment or allowed loopback origin."] });
    } catch (error) {
      executionBlocked = true;
      findings.push({
        severity: "warning",
        summary: `Runner blocked: source/API probe failed: ${safeError(error)}`,
        reproSteps: ["Provide a server whose /api/trpc/auth.me endpoint returns JSON rather than a static HTML fallback.", "Re-run only after this preflight probe succeeds; match cases are intentionally not started after a failed probe."],
      });
    }
  }

  if (!executionBlocked) {
    let executablePath;
    try {
      executablePath = await locateChromiumExecutable();
      if (!executablePath) throw new Error("No readable and executable bundled or system Chromium binary was found.");
    } catch (error) {
      executionBlocked = true;
      findings.push({
        severity: "warning",
        summary: `Runner blocked before match execution: ${safeError(error)}`,
        reproSteps: ["Set PLAYTEST_CHROMIUM_PATH to a readable, executable Chromium binary, or install Playwright Chromium.", "Re-run after preflight succeeds; a blocked setup exits with code 2."],
      });
    }

    if (!executionBlocked) {
      const suiteTimer = setTimeout(() => {
        suiteTimedOut = true;
        invariantFailure = true;
        findings.push({
          severity: "error",
          summary: `Visual suite exceeded its ${TOTAL_CAP_MS}ms aggregate duration cap.`,
          reproSteps: ["Repeat only the fixed-seed case that exceeded its documented cap.", "Do not raise the aggregate cap without review."],
        });
        void browser?.close();
      }, TOTAL_CAP_MS);
      try {
        browser = await chromium.launch({ headless: true, executablePath, args: ["--disable-dev-shm-usage"] });
        await runCase({ name: "phone-default", seed: 6707978, preset: "continents", size: 11, tribe: 2, beta: false });
        if (!suiteTimedOut) await runCase({ name: "phone-new-visuals-landscape", seed: 6707979, preset: "archipelago", size: 13, tribe: 0, beta: true });
      } catch (error) {
        if (!suiteTimedOut) {
          executionBlocked = true;
          findings.push({
            severity: "warning",
            summary: `Runner blocked before match execution: ${safeError(error)}`,
            reproSteps: ["Verify the selected Chromium binary can launch in the runner environment.", "Re-run after setup succeeds; a blocked setup exits with code 2."],
          });
        }
      } finally {
        clearTimeout(suiteTimer);
        if (browser) await browser.close().catch(() => {});
      }
    }
  }

  if (!executionBlocked && cases.length === 2 && cases.every((entry) => entry.attempts.harvest === 0)) {
    addFinding("warning", "No legal owned harvest action was attempted across either case; this invocation is coverage-limited and cannot report harvest coverage as passed.", [
      "Replay the same ordinary seeded cases and inspect only visible, human-owned resources that have their required tech and displayed cost.",
      "Do not waive the harvest check or substitute an enemy/hidden resource.",
    ]);
    for (const entry of cases) {
      if (entry.status === "passed") entry.status = "warning";
      entry.notes.push("No verified harvest attempt occurred in either case; global harvest coverage is warning-only.");
    }
  }

  report.status = reportStatus();
  await writeJson(path.join(OUT, "report.json"), report);
  await writeFile(path.join(OUT, "REPORT.md"), markdownReport(report), "utf8");
  console.log(JSON.stringify({ status: report.status, report: path.join(OUT, "report.json"), markdown: path.join(OUT, "REPORT.md") }));
  // Blocked setup/preflight is deliberately non-green. Runtime invariant
  // failures (including pageerror) use 1; preflight/setup blockers use 2.
  process.exitCode = report.status === "blocked" ? 2 : invariantFailure ? 1 : 0;
}

await main();
