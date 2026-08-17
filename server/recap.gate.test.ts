// Recap triage — the modal is an alarm, not a newsletter. It opens only when
// the round contained something that changes the player's situation; routine
// combat/capture/ruin entries stay quiet. (scripts/recap-audit.mts: 93% of
// turns used to open it, 82% of entries were routine combat.)
import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

import { game } from "../client/src/game/core/state";
import { recapHasHighSignal, RECAP_HIGH_SIGNAL, type RecapEntry } from "../client/src/game/core/types";

const entry = (kind: RecapEntry["kind"]): RecapEntry => ({ kind, text: "x", tribe: 1 });

describe("recapHasHighSignal", () => {
  it("flags only the kinds worth interrupting for", () => {
    expect(recapHasHighSignal([entry("combat"), entry("capture"), entry("ruin")])).toBe(false);
    expect(recapHasHighSignal([entry("combat"), entry("cityLost")])).toBe(true);
    expect(recapHasHighSignal([entry("treatyBroken")])).toBe(true);
    expect(recapHasHighSignal([entry("fallen")])).toBe(true);
    expect(recapHasHighSignal([entry("greatRuin")])).toBe(true);
    expect(recapHasHighSignal([])).toBe(false);
  });
});

describe("the beginTurn gate", () => {
  beforeEach(() => {
    game.newGame({ seed: 777, size: 11, humanTribe: 0, difficulty: "normal", preset: "continents" });
  });

  it("a combat-only round does not open the modal", () => {
    const s = game.state;
    s.recap = [entry("combat"), entry("capture"), entry("ruin")];
    s.showRecap = false;
    game.beginTurn(s.humanTribe);
    expect(s.showRecap).toBe(false);
  });

  it("a lost city opens the modal", () => {
    const s = game.state;
    s.recap = [entry("combat"), entry("cityLost")];
    s.showRecap = false;
    game.beginTurn(s.humanTribe);
    expect(s.showRecap).toBe(true);
  });

  it("a broken treaty opens the modal", () => {
    const s = game.state;
    s.recap = [entry("treatyBroken")];
    s.showRecap = false;
    game.beginTurn(s.humanTribe);
    expect(s.showRecap).toBe(true);
  });

  it("routine kinds are not in the high-signal set", () => {
    for (const k of ["combat", "capture", "ruin"] as const) {
      expect(RECAP_HIGH_SIGNAL.has(k)).toBe(false);
    }
  });
});
