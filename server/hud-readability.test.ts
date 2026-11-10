import { readFileSync } from "node:fs";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";

const snapshot = vi.hoisted(() => ({
  state: {} as any,
  drainWorldEvents: vi.fn(() => []),
}));
vi.mock("../client/src/game/useGame", () => ({
  useGame: () => ({
    state: snapshot.state,
    getVersion: () => 0,
    drainWorldEvents: snapshot.drainWorldEvents,
  }),
}));

import { LogTicker, SelectionPanel } from "../client/src/game/ui/Hud";
import { createVisualReviewState } from "../client/src/game/render/visualReviewFixture";

const source = (path: string) =>
  readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");

// Vitest uses classic JSX for TSX here; production Vite uses its React plugin.
// WorldEvents creates icons at module scope, so load it only after this shim.
vi.stubGlobal("React", React);
const { GameHudRail } = await import("../client/src/game/ui/GameHudRail");
const { WorldEventCards } = await import("../client/src/game/ui/WorldEvents");
afterAll(() => vi.unstubAllGlobals());

describe("phone HUD readability", () => {
  it("wraps the complete latest event in a status region without absolute positioning or truncation", () => {
    const message =
      "Vessari and Kharzul have formed a pact against Auren. The warning must remain readable while the map is open.";
    snapshot.state = { log: [message] };
    const html = renderToStaticMarkup(createElement(LogTicker));
    expect(html).toContain(message);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Latest game event"');
    expect(html).toContain("break-words");
    expect(html).not.toMatch(/absolute|truncate|line-clamp/);
  });

  it("reserves normal layout space for both the event and Map inside one inset-aware rail", () => {
    snapshot.state = {
      phase: "playing",
      size: 15,
      log: ["A pact has formed."],
    };
    const html = renderToStaticMarkup(createElement(GameHudRail));
    expect(html).toContain("safe-t-offset safe-x");
    expect(html).toContain("flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain('aria-label="Minimap"');
    expect(html.indexOf('aria-label="Latest game event"')).toBeLessThan(
      html.indexOf('aria-label="Minimap"')
    );
    expect(html).toContain('aria-label="Close minimap"');
    expect(html).toContain("min-h-[44px] min-w-[44px]");
    expect(source("game/ui/Minimap.tsx")).not.toContain("absolute");
  });

  it("does not render an empty notification placeholder when there is no event", () => {
    snapshot.state = { log: [] };
    expect(renderToStaticMarkup(createElement(LogTicker))).toBe("");
  });

  it("keeps the Map right-anchored on wide screens even with no latest event", () => {
    snapshot.state = { phase: "playing", size: 15, log: [] };
    const html = renderToStaticMarkup(createElement(GameHudRail));
    expect(html).toContain("sm:justify-end");
    expect(html).toContain('aria-label="Minimap"');
    expect(html).not.toContain('aria-label="Latest game event"');
  });

  it("mounts world cards only in the rail after Paths/warnings and before Map", () => {
    const home = source("pages/Home.tsx");
    const rail = source("game/ui/GameHudRail.tsx");
    expect(home.match(/<GameHudRail\s*\/>/g)).toHaveLength(1);
    expect(home).not.toContain("WorldEventCards");
    expect(home).toContain('import { HeroFallenCard } from "@/game/ui/WorldEvents"');
    expect(home).toContain("<HeroFallenCard />");
    expect(rail.match(/<WorldEventCards\s*\/>/g)).toHaveLength(1);
    expect(rail).toContain('className="flex min-w-0 flex-1 flex-col gap-2"');
    expect(rail.indexOf("<LogTicker />")).toBeLessThan(rail.indexOf("<WorldEventCards />"));
    expect(rail.indexOf("<WorldEventCards />")).toBeLessThan(rail.indexOf("<Minimap />"));
  });

  it("keeps world cards centered in flow with a short-phone scroll cap and touch-size dismissals", () => {
    const world = source("game/ui/WorldEvents.tsx");
    const cards = world.slice(
      world.indexOf("export function WorldEventCards"),
      world.indexOf("export function HeroFallenCard")
    );
    expect(cards).toContain("mx-auto w-full min-w-0 max-w-[380px]");
    expect(cards).toContain("max-h-[16dvh]");
    expect(cards).toContain("overflow-y-auto overscroll-contain");
    expect(cards).toContain("flex shrink-0 items-start");
    expect(cards).toContain("min-w-0 flex-1 break-words");
    expect(cards).toContain("min-h-[44px] min-w-[44px]");
    expect(cards).toContain('aria-label="Dismiss"');
    const classes = [...cards.matchAll(/className="([^"]+)"/g)]
      .map(match => match[1]).join(" ");
    expect(classes).not.toMatch(/\b(?:fixed|absolute|top-\S+|translate-\S+)\b/);
  });

  it("does not drain world events during static rendering, including incomplete HUD mocks", () => {
    snapshot.state = { phase: "playing", size: 15, log: ["A pact has formed."] };
    snapshot.drainWorldEvents.mockClear();
    expect(renderToStaticMarkup(createElement(WorldEventCards))).toBe("");
    const before = JSON.stringify(snapshot.state);
    const html = renderToStaticMarkup(createElement(GameHudRail));
    expect(html).toContain("A pact has formed.");
    expect(html).toContain('aria-label="Minimap"');
    expect(html).not.toContain('aria-label="Paths"');
    expect(snapshot.drainWorldEvents).not.toHaveBeenCalled();
    expect(JSON.stringify(snapshot.state)).toBe(before);
  });

  it("retains the existing world-event filters, four-card queue and 6.5-second lifecycle", () => {
    const world = source("game/ui/WorldEvents.tsx");
    expect(world.match(/g\.drainWorldEvents\(\)/g)).toHaveLength(1);
    expect(world).toContain('if (s.phase !== "playing") return;');
    expect(world).toContain("if (s.currentTribe !== s.humanTribe) return;");
    expect(world).toContain('e.kind !== "stormMoved" && e.kind !== "guardianMoved"');
    expect(world).toContain("[...prev, ...stamped].slice(-4)");
    expect(world).toContain("}, 6500);");
    expect(world).toContain("return () => clearTimeout(timer);");
    expect(world).toContain("[s.turn, s.currentTribe, s.phase]");
  });

  it("retains explicit mobile tool labels and a separately reserved End Turn area", () => {
    const hud = source("game/ui/Hud.tsx");
    const bottom = hud.slice(
      hud.indexOf("export function BottomBar"),
      hud.indexOf("export function SelectionPanel")
    );
    for (const label of ["Research", "Pacts", "Planner", "Undo", "Next"]) {
      expect(bottom).toContain(`>${label}</span>`);
    }
    expect(bottom).toContain('aria-label="Game tools"');
    expect(bottom).toContain("overflow-x-auto");
    expect(bottom).toContain("aria-pressed={s.plannerOpen}");
    expect(bottom).toContain(
      "pointer-events-auto flex shrink-0 flex-col items-end"
    );
    expect(bottom).toContain("End Turn <ChevronRight");
  });

  it("identifies a city under a selected unit without changing units, cities, rules or saves", () => {
    const state = createVisualReviewState(0);
    const city = state.cities[0];
    const warrior = state.units.find(
      unit => unit.type === "warrior" && !unit.hero
    )!;
    warrior.x = city.x;
    warrior.y = city.y;
    state.selectedUnitId = warrior.id;
    state.selectedCityId = null;
    snapshot.state = state;
    const before = JSON.stringify(state);
    const html = renderToStaticMarkup(createElement(SelectionPanel));
    expect(html).toContain(`Inspect city ${city.name} on this tile`);
    expect(html).toContain(`City on this tile: ${city.name}`);
    expect(html).toContain("Tap to inspect city");
    expect(JSON.stringify(state)).toBe(before);
    expect(source("game/ui/Hud.tsx")).toContain(
      "onClick={() => g.selectCity(here.id)}"
    );
  });

  it.each([null, 1])(
    "keeps Capture primary on a neutral/hostile city (owner %s)",
    owner => {
      const state = createVisualReviewState(0);
      const city = state.cities[0];
      city.tribe = owner;
      const warrior = state.units.find(
        unit => unit.type === "warrior" && !unit.hero
      )!;
      warrior.x = city.x;
      warrior.y = city.y;
      state.selectedUnitId = warrior.id;
      state.selectedCityId = null;
      snapshot.state = state;
      const before = JSON.stringify(state);
      const html = renderToStaticMarkup(createElement(SelectionPanel));
      expect(html).not.toContain("Inspect city");
      expect(html).toContain(`Capture ${city.name}`);
      expect(JSON.stringify(state)).toBe(before);
    }
  );
});
