// Fatalities — the rules that keep them rare.
//
// The cinematic itself cannot be tested here; it is camera work in a headless
// renderer. What CAN be tested is the only thing that decides whether the
// feature is a highlight or an irritation: how often it fires. Every test below
// is a case where it must NOT fire.
//
// The failure mode this guards against is specific. A fatality is three seconds
// long. At one per match it is the moment someone screenshots; at one per
// skirmish it is three seconds of tax on every fight, and the first thing a
// reviewer complains about. There is no middle setting that is fine — the
// budget IS the feature.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { game, GameEvent } from "../client/src/game/core/state";
import { fatalityAllowed, markFatality, FATALITY_BUDGET } from "../client/src/game/core/fatality";
import type { GameState } from "../client/src/game/core/types";

type Fatality = Extract<GameEvent, { type: "fatality" }>;

function fresh(humanTribe = 0) {
  game.newGame({
    size: 11, humanTribe, difficulty: "normal", seed: 31337,
    preset: "continents", roster: [0, 1, 2, 3],
  });
  return game.state;
}

/** collect fatality events emitted by `fn` */
function staged(fn: () => void): Fatality[] {
  const seen: Fatality[] = [];
  const off = game.subscribe((e) => { if (e.type === "fatality") seen.push(e); });
  try { fn(); } finally { off(); }
  return seen;
}

describe("fatality budget", () => {
  beforeEach(() => { fresh(); });

  it("allows the first one", () => {
    const s = game.state;
    expect(fatalityAllowed(s, "commander", 1, 0)).toBe(true);
  });

  it("stops at the budget", () => {
    const s = game.state;
    for (let i = 0; i < FATALITY_BUDGET; i++) {
      expect(fatalityAllowed(s, "capital", 1, 0)).toBe(true);
      markFatality(s, "capital");
      s.turn++; // clear the once-per-turn rule so the BUDGET is what is tested
    }
    expect(fatalityAllowed(s, "capital", 1, 0)).toBe(false);
  });

  it("never plays two in one turn, even under budget", () => {
    // A single assault can drop a commander and take a capital in the same
    // breath. Back to back, that turns a high point into an interruption.
    const s = game.state;
    expect(fatalityAllowed(s, "commander", 1, 0)).toBe(true);
    markFatality(s, "commander");
    expect(fatalityAllowed(s, "capital", 1, 0)).toBe(false);
    s.turn++;
    expect(fatalityAllowed(s, "capital", 1, 0)).toBe(true);
  });

  it("lets the match-ending blow through regardless", () => {
    const s = game.state;
    for (let i = 0; i < FATALITY_BUDGET + 3; i++) { markFatality(s, "capital"); s.turn++; }
    expect(fatalityAllowed(s, "capital", 1, 0)).toBe(false);
    // nothing follows the last one, so it cannot outstay its welcome
    expect(fatalityAllowed(s, "final", 1, 0)).toBe(true);
  });

  it("does not spend budget on the final blow", () => {
    const s = game.state;
    const before = s.fatalitiesPlayed ?? 0;
    markFatality(s, "final");
    expect(s.fatalitiesPlayed ?? 0).toBe(before);
  });

  it("counts against the match, not the session", () => {
    // On GameState, so reloading a save cannot hand out a fresh allowance.
    const s = game.state;
    markFatality(s, "commander");
    const revived = JSON.parse(JSON.stringify(s)) as GameState;
    expect(revived.fatalitiesPlayed).toBe(1);
    expect(fatalityAllowed(revived, "commander", 1, 0)).toBe(false); // same turn
  });
});

describe("fatalities stay out of the way", () => {
  it("never fires on a board with no human in it", () => {
    // Spectating or batch-simulating would otherwise stop dead for three
    // seconds on someone else's kill.
    const s = fresh(-1);
    expect(fatalityAllowed(s, "commander", 1, 2)).toBe(false);
    expect(fatalityAllowed(s, "final", 1, 2)).toBe(false);
  });

  it("never fires on a kill the player is not part of", () => {
    const s = fresh(0);
    expect(fatalityAllowed(s, "commander", 1, 2)).toBe(false);
  });

  it("fires when the player is on the receiving end", () => {
    // Losing your commander to a cinematic is the point, not an exemption.
    const s = fresh(0);
    expect(fatalityAllowed(s, "commander", 0, 1)).toBe(true);
  });

  it("never fires during a challenge run", () => {
    // Dailies are scored on turns and score; a player replaying for a better
    // time should not pay three seconds for the same kill twice.
    const s = fresh(0);
    s.challenge = "daily";
    expect(fatalityAllowed(s, "commander", 1, 0)).toBe(false);
    expect(fatalityAllowed(s, "final", 1, 0)).toBe(false);
  });
});

describe("the player preference", () => {
  const g = globalThis as unknown as { localStorage?: unknown };
  afterEach(() => { delete g.localStorage; });

  it("suppresses the event entirely when turned off", () => {
    // Checked in the engine, not the renderer: a player who turned them off
    // must not silently burn the match's budget on cinematics nobody sees.
    const s = fresh(0);
    g.localStorage = { getItem: () => "0", setItem: () => {} };
    expect(fatalityAllowed(s, "commander", 1, 0)).toBe(false);
    expect(fatalityAllowed(s, "final", 1, 0)).toBe(false);
  });

  it("defaults to on when nothing is stored", () => {
    const s = fresh(0);
    g.localStorage = { getItem: () => null, setItem: () => {} };
    expect(fatalityAllowed(s, "commander", 1, 0)).toBe(true);
  });
});

describe("a capital falling", () => {
  it("stages one, and marks it final when it ends the match", () => {
    const s = fresh(0);
    // Hand the human a unit standing on the last rival's capital, then take it.
    for (let i = 2; i < s.tribes.length; i++) s.tribes[i].alive = false;
    const cap = s.cities.find((c) => c.tribe === 1 && c.isCapital)!;
    const mine = s.units.find((u) => u.tribe === 0)!;
    // clear the tile so the capture path is not blocked by a defender
    s.units = s.units.filter((u) => !(u.x === cap.x && u.y === cap.y));
    mine.x = cap.x; mine.y = cap.y;
    mine.moved = false; mine.attacked = false;
    s.currentTribe = 0;

    const events = staged(() => game.captureCity(mine.id));
    expect(events).toHaveLength(1);
    expect(events[0].spec.victimTribe).toBe(1);
    expect(events[0].spec.killerTribe).toBe(0);
    // taking the last rival capital ends the match, so it is promoted
    expect(events[0].spec.kind).toBe("final");
    expect({ x: events[0].spec.x, y: events[0].spec.y }).toEqual({ x: cap.x, y: cap.y });
  });
});
