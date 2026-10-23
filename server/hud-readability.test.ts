import { readFileSync } from "node:fs";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";

const snapshot = vi.hoisted(() => ({ state: {} as any }));
vi.mock("../client/src/game/useGame", () => ({
  useGame: () => ({ state: snapshot.state, getVersion: () => 0 }),
}));

import { LogTicker, SelectionPanel } from "../client/src/game/ui/Hud";
import { GameHudRail } from "../client/src/game/ui/GameHudRail";
import { createVisualReviewState } from "../client/src/game/render/visualReviewFixture";

const source = (path: string) =>
  readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");

// Vitest uses classic JSX for TSX here; production Vite uses its React plugin.
vi.stubGlobal("React", React);
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
