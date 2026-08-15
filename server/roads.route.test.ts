// v42 — road routing.
//
// A trade link pays nothing until the road actually reaches the capital, so a
// route that gives up at the first obstacle is worth zero. Both AI brains used
// to walk a greedy L-shape and abandon it on any unpavable tile; measured over
// 640 tribe-seats, 0.02 cities per tribe were earning the +1★ trade star.
import { describe, it, expect } from "vitest";
import { game } from "../client/src/game/core/state";
import { roadRouteToCapital, connectedCityIds } from "../client/src/game/core/rules";
import { idx } from "../client/src/game/core/types";

/** flat grass board with the tribe holding a capital and one outlying city */
function twoCityBoard() {
  game.newGame({ size: 11, humanTribe: 0, difficulty: "normal", seed: 5150, roster: [0, 1, 2, 3] });
  const s = game.state;
  s.tribes[0].techs = [...s.tribes[0].techs, "roads"];
  s.tribes[0].stars = 999;
  const capital = s.cities.find((c) => c.tribe === 0 && c.isCapital)!;
  // clear a corridor: everything within 5 tiles of the capital is plain grass
  for (const t of s.tiles) {
    if (Math.abs(t.x - capital.x) <= 5 && Math.abs(t.y - capital.y) <= 5) {
      t.terrain = "grass";
      t.road = false;
      if (t.cityId === null) t.ownerCityId = null;
    }
  }
  // put a second city 4 tiles away, aimed at the board centre so it stays in
  // bounds wherever the capital happened to spawn
  const dir = capital.x < s.size / 2 ? 1 : -1;
  const outpost = s.cities.find((c) => c.tribe === 0 && !c.isCapital)
    ?? s.cities.find((c) => c.tribe === null)!;
  s.tiles[idx(outpost.x, outpost.y, s.size)].cityId = null; // vacate its old tile
  outpost.tribe = 0;
  outpost.x = capital.x + 4 * dir;
  outpost.y = capital.y;
  const ot = s.tiles[idx(outpost.x, outpost.y, s.size)];
  ot.terrain = "grass";
  ot.cityId = outpost.id;
  return { s, capital, outpost, dir };
}

describe("v42 road routing reaches the capital or reports failure", () => {
  it("returns the unpaved tiles of a route to the capital", () => {
    const { s, capital, outpost } = twoCityBoard();
    const route = roadRouteToCapital(s, 0, outpost);
    expect(route.length).toBeGreaterThan(0);
    // every returned tile still needs paving
    for (const t of route) expect(t.road).toBe(false);
    // and paving exactly this route connects the city
    expect(connectedCityIds(s, 0).has(outpost.id)).toBe(false);
    for (const t of route) t.road = true;
    expect(connectedCityIds(s, 0).has(outpost.id)).toBe(true);
    expect(capital.tribe).toBe(0);
  });

  it("routes AROUND an obstacle instead of giving up on it", () => {
    const { s, capital, outpost, dir } = twoCityBoard();
    // wall off the direct line with mountains, leaving a gap one row north
    for (let dy = 0; dy <= 3; dy++) {
      const t = s.tiles[idx(capital.x + 2 * dir, capital.y + dy, s.size)];
      if (t) t.terrain = "mountain";
    }
    const route = roadRouteToCapital(s, 0, outpost);
    expect(route.length).toBeGreaterThan(0);
    for (const t of route) expect(t.terrain).not.toBe("mountain");
    for (const t of route) t.road = true;
    expect(connectedCityIds(s, 0).has(outpost.id)).toBe(true);
  });

  it("returns nothing when the city is genuinely unreachable", () => {
    const { s, capital, outpost } = twoCityBoard();
    // seal the outpost in on all four sides with ocean
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const t = s.tiles[idx(outpost.x + dx, outpost.y + dy, s.size)];
      if (t) t.terrain = "ocean";
    }
    expect(roadRouteToCapital(s, 0, outpost)).toEqual([]);
    expect(capital.isCapital).toBe(true);
  });

  it("never routes through a rival's territory", () => {
    const { s, outpost } = twoCityBoard();
    const rivalCity = s.cities.find((c) => c.tribe !== null && c.tribe !== 0);
    if (!rivalCity) return;
    for (const t of s.tiles) {
      if (Math.abs(t.x - outpost.x) <= 1 && Math.abs(t.y - outpost.y) <= 1 && t.cityId === null) {
        t.ownerCityId = rivalCity.id;
      }
    }
    for (const t of roadRouteToCapital(s, 0, outpost)) {
      const owner = t.ownerCityId === null ? null : s.cities[t.ownerCityId]?.tribe;
      expect(owner === null || owner === 0).toBe(true);
    }
  });
});
