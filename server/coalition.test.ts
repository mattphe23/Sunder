// v21 coalition coordination unit tests — pure state-level checks, no engine loop.
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubGlobal("localStorage", {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
});

import { commonEnemy, claimCoalitionTarget, maybeBetray, inCoalition, _resetClaims } from "../client/src/game/core/coalition";
import { setPeace } from "../client/src/game/core/diplomacy";
import type { GameState } from "../client/src/game/core/types";

/** minimal fake state: 4 tribes, leader tribe 0 dominant when requested */
function fakeState(leaderDominant: boolean): GameState {
  const mkTribe = (i: number, score: number, isHuman = false) => ({
    index: i, name: `T${i}`, alive: true, isHuman, score, stars: 5, defIndex: i,
  });
  const mkUnit = (tribe: number, x: number, y: number, hp = 10) => ({
    id: tribe * 10 + x, tribe, x, y, hp, maxHp: 10, type: "warrior", moved: false, attacked: false,
  });
  const s = {
    turn: 10, size: 9, phase: "playing",
    tribes: [
      mkTribe(0, leaderDominant ? 300 : 100),
      mkTribe(1, 80), mkTribe(2, 70), mkTribe(3, 60),
    ],
    units: [
      // leader gets a big army when dominant so strengthOf() reflects the lead
      ...(leaderDominant ? [mkUnit(0, 1, 1), mkUnit(0, 2, 1), mkUnit(0, 3, 1), mkUnit(0, 4, 1), mkUnit(0, 5, 1)] : [mkUnit(0, 1, 1)]),
      mkUnit(1, 7, 7), mkUnit(2, 7, 8), mkUnit(3, 8, 8),
    ],
    cities: [
      // when dominant, tribe 0 holds two developed cities; otherwise everyone
      // holds one similar city so strengths are comparable
      { id: 1, x: 1, y: 1, tribe: 0, isCapital: true, level: leaderDominant ? 4 : 1, walls: false },
      ...(leaderDominant ? [{ id: 2, x: 3, y: 2, tribe: 0, isCapital: false, level: 3, walls: false }] : []),
      { id: 3, x: 7, y: 7, tribe: 1, isCapital: true, level: 1, walls: false },
      { id: 4, x: 6, y: 8, tribe: 2, isCapital: true, level: 1, walls: false },
      { id: 5, x: 8, y: 6, tribe: 3, isCapital: true, level: 1, walls: false },
    ],
    tiles: [], log: [], peaceUntil: {}, grudges: [],
  } as unknown as GameState;
  return s;
}

describe("v21 coalition coordination", () => {
  beforeEach(() => _resetClaims());

  it("detects a dominant common enemy", () => {
    expect(commonEnemy(fakeState(true))).toBe(0);
    expect(commonEnemy(fakeState(false))).toBeNull();
  });

  it("pact members claim distinct leader cities (no overlapping targets)", () => {
    const s = fakeState(true);
    setPeace(s, 1, 2, 20);
    const c1 = claimCoalitionTarget(s, 1, 0);
    const c2 = claimCoalitionTarget(s, 2, 0);
    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();
    expect(c1!.cityId).not.toBe(c2!.cityId);
  });

  it("inCoalition reflects live AI pacts only", () => {
    const s = fakeState(true);
    expect(inCoalition(s, 1)).toBe(false);
    setPeace(s, 1, 2, 20);
    expect(inCoalition(s, 1)).toBe(true);
    expect(inCoalition(s, 3)).toBe(false);
  });

  it("no betrayal while the common enemy still stands", () => {
    const s = fakeState(true);
    setPeace(s, 1, 2, 20);
    expect(maybeBetray(s, 1)).toBeNull();
  });

  it("the stronger partner betrays the weaker once the enemy is broken", () => {
    const s = fakeState(false); // no dominant leader anymore
    setPeace(s, 1, 2, 20);
    // make tribe 1 clearly stronger: extra units
    (s.units as unknown[]).push(
      { id: 91, tribe: 1, x: 6, y: 6, hp: 10, maxHp: 10, type: "warrior", moved: false, attacked: false },
      { id: 92, tribe: 1, x: 6, y: 5, hp: 10, maxHp: 10, type: "warrior", moved: false, attacked: false },
      { id: 93, tribe: 1, x: 5, y: 5, hp: 10, maxHp: 10, type: "warrior", moved: false, attacked: false },
    );
    const betrayed = maybeBetray(s, 1);
    expect(betrayed).toBe(2);
    // peace ended now
    expect((s.peaceUntil as Record<number, Record<number, number>>)[1][2]).toBe(s.turn);
    expect(s.log[0]).toContain("betrayed");
  });
});
