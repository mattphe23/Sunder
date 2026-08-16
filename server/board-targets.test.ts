// Board-derived victory targets must not drift during a match.
//
// Great Harvest shipped a version that counted LIVE resource tiles. Harvesting
// sets tile.resource to null, so the goal lowered itself toward whoever was
// chasing it — Sunwei harvests most, so Sunwei shrank its own target fastest,
// and completion jumped from 27% to 60%. A victory condition that moves toward
// the player is not a victory condition.
//
// Three targets read the board rather than a constant, and each is only safe
// because of a property that is easy to break later:
//
//   harvestTarget  resource endowment   resources ARE consumed — hence the
//                                       endowment snapshot taken at generation
//   tideTarget     shallow water        terrain is written only by mapgen
//   boardScale     size and tribe count neither array is mutated in play
//
// This drives a real match and asserts none of them moves. If someone later
// adds terrain-changing world events, or eliminates tribes by splicing the
// array, this is what fails.
import { describe, it, expect } from "vitest";
import { game } from "../client/src/game/core/state";
import { harvestTarget, tideTarget, boardScale } from "../client/src/game/core/victory";

describe("board-derived targets are fixed for the life of a match", () => {
  it("does not move while a full match is played out", () => {
    const pending: (() => void)[] = [];
    const realTimeout = globalThis.setTimeout;
    (globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void) => {
      pending.push(fn);
      return 0;
    };
    try {
      game.newGame({
        size: 11, humanTribe: -1, difficulty: "normal", seed: 4242,
        preset: "continents", roster: [0, 1, 2, 3],
      });
      const s0 = game.state;
      const before = {
        harvest: harvestTarget(s0),
        tide: tideTarget(s0),
        scale: boardScale(s0),
        resources: s0.tiles.filter((t) => t.resource).length,
      };
      // a board worth measuring: it must actually have resources to consume
      expect(before.resources).toBeGreaterThan(10);

      let steps = 0;
      while (game.state.phase === "playing" && steps++ < 200000) {
        if (!pending.length) break;
        pending.shift()!();
      }

      const s1 = game.state;
      // the match really did consume resources, or this proves nothing
      expect(s1.tiles.filter((t) => t.resource).length).toBeLessThan(before.resources);

      expect(harvestTarget(s1)).toBe(before.harvest);
      expect(tideTarget(s1)).toBe(before.tide);
      expect(boardScale(s1)).toBe(before.scale);
    } finally {
      (globalThis as unknown as { setTimeout: unknown }).setTimeout = realTimeout;
    }
  });
});
