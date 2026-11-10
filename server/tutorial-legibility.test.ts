import { readFileSync } from "node:fs";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, Tile, Tribe } from "../client/src/game/core/types";
import { emptyStats, TRIBE_DEFS } from "../client/src/game/core/types";
import { victoryProgress, VICTORY_PATH_START_TURN } from "../client/src/game/core/victory";
import { tutorialEndTurnBody, tutorialWelcomeBody } from "../client/src/game/ui/tutorialContent";

const snapshot = vi.hoisted(() => ({ state: null as GameState | null }));
vi.mock("../client/src/game/useGame", () => ({
  useGame: () => ({ state: snapshot.state }),
}));

/** Fabricated UNIT fixture only; not a generated board or a playable engine save. */
function unitState(humanDefIndex = 0, overrides: Partial<GameState> = {}): GameState {
  const tribes: Tribe[] = [1, 3, humanDefIndex, 5].map((defIndex, index) => {
    const def = TRIBE_DEFS[defIndex] ?? TRIBE_DEFS[0];
    return {
      index, defIndex, name: defIndex >= TRIBE_DEFS.length ? "Forged unit fixture" : def.name,
      color: def.color, colorName: def.colorName, passive: def.passive,
      passiveDesc: def.passiveDesc, isHuman: index === 2, stars: 5,
      techs: [def.startTech], alive: true, score: 0,
    };
  });
  return {
    phase: "playing", size: 11, seed: 0, preset: "unit-fixture", turn: 0,
    maxTurns: 50, difficulty: "normal", currentTribe: 2, humanTribe: 2,
    humanTribes: [2], tribes, tiles: [], resourceEndowment: 30, cities: [], units: [],
    nextUnitId: 0, selectedUnitId: null, selectedCityId: null, winner: null,
    log: [], aiThinking: false, recap: [], showRecap: false, scoreHistory: [],
    stats: tribes.map(() => emptyStats()), ...overrides,
  };
}

/** Only shallow-water count matters for these unit tests, not map generation. */
function shallowTiles(count: number): Tile[] {
  return Array.from({ length: count }, (_, x) => ({
    x, y: 0, terrain: "water", resource: null, cityId: null, ownerCityId: null,
    explored: [true, true, true, true], port: null, ruin: false, greatRuin: false,
  }));
}

const storage = new Map<string, string>();
const tutorialSource = readFileSync(new URL("../client/src/game/ui/Tutorial.tsx", import.meta.url), "utf8");
// Vitest's classic JSX transform needs React; production Vite supplies its plugin.
vi.stubGlobal("React", React);
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
});
const { Tutorial, isTutorialDone } = await import("../client/src/game/ui/Tutorial");
beforeEach(() => {
  storage.clear();
  snapshot.state = unitState();
});
afterAll(() => vi.unstubAllGlobals());

const identities = [...TRIBE_DEFS.map((def, defIndex) => ({ name: def.name, defIndex })),
  { name: "Forge", defIndex: TRIBE_DEFS.length }];

describe("state-derived tutorial victory wording", () => {
  it.each(identities)("names $name's own live path and goal on small/default/large boards", ({ defIndex }) => {
    for (const size of [9, 11, 15]) {
      const state = unitState(defIndex, { size, tiles: shallowTiles(24) });
      const before = JSON.stringify(state);
      const progress = victoryProgress(state, state.humanTribe)!;
      const body = tutorialWelcomeBody(state);
      expect(body).toContain(`Your path — ${progress.def.name}: ${progress.def.goal}.`);
      expect(body).toContain("last tribe alive by taking all rival cities");
      expect(body).toContain(`Checked at round start from turn ${VICTORY_PATH_START_TURN + 1}.`);
      expect(body).toContain(`highest score among living tribes when turn ${state.maxTurns} ends`);
      expect(body.split("\n")).toHaveLength(3);
      expect(body.trim().split(/\s+/).length).toBeLessThanOrEqual(100);
      expect(body).not.toMatch(/instantly|immediately|every rival capital|turn 30|Colossus|level-up/i);
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it("uses the actual coast, resource endowment, area scaling, and Forge goal rather than static definitions", () => {
    const dry = unitState(4, { tiles: shallowTiles(4) });
    const wet = unitState(4, { tiles: shallowTiles(24) });
    expect(tutorialWelcomeBody(dry)).toContain("Hold 2 ports on the open water");
    expect(tutorialWelcomeBody(wet)).toContain("Hold 4 ports on the open water");
    const lean = unitState(2, { resourceEndowment: 14 });
    const lush = unitState(2, { resourceEndowment: 40 });
    expect(victoryProgress(lush, 2)!.target).toBeGreaterThan(victoryProgress(lean, 2)!.target);
    expect(tutorialWelcomeBody(lean)).not.toBe(tutorialWelcomeBody(lush));
    const small = unitState(1, { size: 9 });
    const large = unitState(1, { size: 15 });
    expect(victoryProgress(large, 2)!.target).toBeGreaterThan(victoryProgress(small, 2)!.target);
    expect(tutorialWelcomeBody(small)).not.toBe(tutorialWelcomeBody(large));
    const forge = unitState(TRIBE_DEFS.length);
    expect(tutorialWelcomeBody(forge)).toContain(`Ascendance: Reach ${victoryProgress(forge, 2)!.target} score`);
    expect(tutorialWelcomeBody(forge)).not.toContain("Reach 900 score");
  });

  it.each([30, 50, 17])("uses actual maxTurns %i without adding one to the cap", (maxTurns) => {
    const body = tutorialWelcomeBody(unitState(0, { turn: 0, maxTurns }));
    expect(body).toContain(`when turn ${maxTurns} ends`);
    expect(body).not.toContain(`when turn ${maxTurns + 1} ends`);
  });

  it("keeps the round-start check explicit even when progress is already complete", () => {
    const state = unitState(8, { turn: VICTORY_PATH_START_TURN });
    state.tribes[2].score = victoryProgress(state, 2)!.target;
    expect(victoryProgress(state, 2)!.done).toBe(true);
    expect(tutorialWelcomeBody(state)).toContain(`Checked at round start from turn ${VICTORY_PATH_START_TURN + 1}.`);
    expect(tutorialWelcomeBody(state)).not.toMatch(/instantly|already won|immediately/i);
  });

  it.each(["missing", "eliminated", "negative definition", "invalid definition", "no living tribes"])(
    "handles a %s human without borrowing a rival's path or crashing", (kind) => {
      const state = unitState();
      if (kind === "missing") state.humanTribe = -1;
      if (kind === "eliminated") state.tribes[2].alive = false;
      if (kind === "negative definition") state.tribes[2].defIndex = -1;
      if (kind === "invalid definition") state.tribes[2].defIndex = Number.NaN;
      if (kind === "no living tribes") state.tribes.forEach(tribe => { tribe.alive = false; });
      const body = tutorialWelcomeBody(state);
      expect(body).toContain("Faction paths: meet your tribe's goal.");
      expect(body).not.toContain("Your path —");
      expect(body.split("\n")).toHaveLength(3);
    }
  );

  it("counts living rivals in the actual roster and handles singular/zero cases", () => {
    const state = unitState();
    expect(tutorialEndTurnBody(state)).toContain("There are 3 rival powers still in play");
    expect(tutorialEndTurnBody(state)).toContain("Turn order changes each round");
    expect(tutorialEndTurnBody(state)).not.toContain("before your next turn");
    state.tribes[0].alive = false;
    expect(tutorialEndTurnBody(state)).toContain("There are 2 rival powers still in play");
    state.tribes[1].alive = false;
    expect(tutorialEndTurnBody(state)).toContain("There is 1 rival power still in play");
    state.tribes[3].alive = false;
    expect(tutorialEndTurnBody(state)).toContain("No rival powers remain");
    expect(tutorialEndTurnBody(state)).toMatch(/^Tap End Turn/);
  });
});

describe("tutorial-only UI and onboarding regressions", () => {
  it("derives rival counts for duel and six-tribe unit rosters", () => {
    const duel = unitState();
    duel.tribes = [duel.tribes[2], duel.tribes[3]];
    expect(tutorialEndTurnBody(duel)).toContain("There is 1 rival power still in play");
    const larger = unitState();
    larger.tribes.push({ ...larger.tribes[0], index: 4 }, { ...larger.tribes[1], index: 5 });
    expect(tutorialEndTurnBody(larger)).toContain("There are 5 rival powers still in play");
  });

  it("renders the three-line live welcome with phone-sized controls and safe-area guards", () => {
    const html = renderToStaticMarkup(createElement(Tutorial));
    expect(html).toContain("Enlightenment: Research all");
    expect(html).toContain("when turn 50 ends");
    expect(html).toContain("whitespace-pre-line");
    expect(html).toContain("pointer-events-none absolute");
    expect(html).toContain("pointer-events-auto");
    expect(html).toContain("overflow-y-auto");
    for (const edge of ["left", "right", "top", "bottom"]) {
      expect(html).toContain(`safe-area-inset-${edge}`);
    }
    const buttons = html.match(/<button\b[^>]*>/g)!;
    expect(buttons).toHaveLength(3);
    for (const button of buttons) expect(button).toContain("min-h-[44px] min-w-[44px]");
  });

  it("retains existing caller/storage keys, completion suppression, and economy-only entry", () => {
    expect(isTutorialDone()).toBe(false);
    storage.set("polyforge-tutorial-done", "1");
    expect(isTutorialDone()).toBe(true);
    const economy = renderToStaticMarkup(createElement(Tutorial));
    expect(economy).toContain("Feed your cities");
    expect(economy).toContain("Tap your capital");
    expect(economy).not.toContain("Welcome, Commander");
    storage.set("polyforge-tutorial-econ-done", "1");
    expect(renderToStaticMarkup(createElement(Tutorial))).toBe("");
    expect(tutorialSource.match(/localStorage\.setItem\([^\n]+/g)).toEqual([
      'localStorage.setItem(DONE_KEY, "1");',
      'localStorage.setItem(ECON_DONE_KEY, "1");',
    ]);
  });

  it("does not render in hot-seat or outside play", () => {
    snapshot.state = unitState(0, { humanTribes: [0, 2] });
    expect(renderToStaticMarkup(createElement(Tutorial))).toBe("");
    snapshot.state = unitState(0, { phase: "gameover" });
    expect(renderToStaticMarkup(createElement(Tutorial))).toBe("");
  });

  it("removes only the tutorial reward beat and keeps the original guided/skip flow", () => {
    const stepIds = [...tutorialSource.matchAll(/^    id: "([^"]+)",/gm)].map(match => match[1]);
    expect(stepIds).toEqual(["welcome", "select", "move", "capture", "research", "harvest", "build", "endturn"]);
    expect(tutorialSource).not.toMatch(/\bGift\b|Colossus|id: "reward"|cur\.id === "reward"/);
    const bodies = [...tutorialSource.matchAll(/body: "([^"]*)"/g)].map(match => match[1]);
    expect(bodies.join(" ")).not.toMatch(/\bClick\b/);
    expect(bodies.join(" ")).toContain("Tap the small figure");
    expect(bodies.join(" ")).toContain("Tap any highlighted ring");
    expect(tutorialSource).toContain('u && u.tribe === s.humanTribe');
    expect(tutorialSource).toContain('u.x !== posRef.current.x || u.y !== posRef.current.y');
    expect(tutorialSource).toContain('cur === "research" && s.tribes[s.humanTribe]?.techs.length > 1');
    expect(tutorialSource).toContain('s.selectedCityId !== null');
    expect(tutorialSource).toContain('cur === "endturn" && s.turn > 1');
    expect(tutorialSource).toContain('aria-label="Skip tutorial"');
    expect(tutorialSource).toContain('onClick={finish}');
  });

  it("keeps faction opening path hints free of stale fixed victory counts", () => {
    const intro = readFileSync(new URL("../client/src/game/ui/FactionIntro.tsx", import.meta.url), "utf8");
    expect(intro).not.toContain("four living veterans");
    expect(intro).not.toContain("Spread to 5 cities");
    expect(intro).toContain("Build surviving veteran units toward Storm Legend — check Paths for the live goal.");
    expect(intro).toContain("Expand your city network toward Overgrowth — check Paths for the live goal.");
  });
});
