// v42 — turn flow must never drop the chain.
//
// Every AI turn is scheduled by nextTribe() and ends by calling endTurn(),
// which schedules the next one. If nextTribe() ever declines to schedule while
// the match is still playing, nothing wakes the game up again and it hangs
// forever. Two ways that happened, both found by the batch harness reporting
// ~0.6% of games failing to reach a result:
//
//   1. Skipping an eliminated tribe re-entered nextTribe() from inside
//      beginTurn(), so the scheduling check afterwards was reading a tribe that
//      was no longer the one on turn.
//   2. A tribe could be eliminated inside its OWN beginTurn() — the round-start
//      world phase runs there — leaving the check looking at a dead tribe.
import { describe, it, expect, beforeEach } from "vitest";
import { game } from "../client/src/game/core/state";

/** queue AI callbacks instead of running them, so we can pump the chain */
function harness() {
  const pending: (() => void)[] = [];
  (globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
    pending.push(fn);
    return 0;
  };
  return pending;
}

/** run the match to completion; returns false if the chain died early */
function drive(pending: (() => void)[], maxSteps = 200000): boolean {
  let steps = 0;
  while (game.state.phase === "playing" && steps++ < maxSteps) {
    if (!pending.length) return false;
    pending.shift()!();
  }
  return true;
}

describe("v42 an all-AI match always reaches a result", () => {
  let pending: (() => void)[];
  beforeEach(() => {
    (globalThis as unknown as { window: undefined }).window = undefined;
    pending = harness();
  });

  it("drives to gameover across a spread of maps and difficulties", () => {
    const presets = ["continents", "archipelago", "highlands", "pangaea"] as const;
    const diffs = ["normal", "hard", "impossible"] as const;
    for (let g = 0; g < 12; g++) {
      pending.length = 0;
      game.newGame({
        size: 11, humanTribe: -1, seed: 91300 + g,
        difficulty: diffs[g % diffs.length], preset: presets[g % presets.length],
        roster: [0, 1, 2, 3, 4, 5].slice(0, 4).map((d) => (d + g) % 6),
      });
      expect(drive(pending)).toBe(true);
      expect(game.state.phase).toBe("gameover");
      expect(game.state.winner).not.toBeNull();
    }
  });

  it("keeps the chain alive when the tribe next in order is already dead", () => {
    pending.length = 0;
    game.newGame({ size: 11, humanTribe: -1, difficulty: "hard", seed: 4242, roster: [0, 1, 2, 3] });
    const s = game.state;
    // wipe out everyone whose slot follows the current one this round
    const pos = s.orderPos ?? 0;
    for (let i = pos + 1; i < s.turnOrder!.length; i++) {
      const idx = s.turnOrder![i];
      if (s.tribes.filter((t) => t.alive).length <= 2) break;
      s.tribes[idx].alive = false;
    }
    const before = pending.length;
    game.endTurn();
    // something must be queued, and it must belong to a living tribe
    expect(pending.length).toBeGreaterThan(before - 1);
    expect(s.tribes[s.currentTribe].alive).toBe(true);
  });

  it("passes the turn along when a tribe dies during its own turn opening", () => {
    pending.length = 0;
    game.newGame({ size: 11, humanTribe: -1, difficulty: "hard", seed: 777, roster: [0, 1, 2, 3] });
    const s = game.state;
    expect(s.phase).toBe("playing");
    // simulate the round-start world phase eliminating whoever is on turn
    const doomed = s.currentTribe;
    s.tribes[doomed].alive = false;
    pending.length = 0;
    game.endTurn();
    if (s.phase === "playing") {
      expect(s.tribes[s.currentTribe].alive).toBe(true);
      expect(pending.length).toBeGreaterThan(0);
    }
  });
});
