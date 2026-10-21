import { describe, expect, it } from "vitest";
import { TRIBE_DEFS, type UnitType } from "../client/src/game/core/types";
import { NERIVANE_RIDER_AQUATIC_V2, NERIVANE_WARRIOR_PILOT, CROSS_TRIBE_P2_PILOTS } from "../client/src/game/render/importedModelRegistry";
import { VISUAL_REVIEW_ROSTER, visualReviewEnabled, visualRosterCandidate } from "../client/src/game/render/visualReview";
import { createVisualReviewState } from "../client/src/game/render/visualReviewFixture";

const unit = (type: UnitType) => ({ type, boat: false, hero: type === "hero" });
describe("integrated visual review boundary", () => {
  it("requires all three gates and is never a production preset", () => {
    expect(visualReviewEnabled("?devgame=&visual-review=roster-v1", true)).toBe(true);
    for (const search of ["", "?devgame=1", "?visual-review=roster-v1", "?devgame=1&visual-review=1", "?devgame=1&visual-review=roster-v2"])
      expect(visualReviewEnabled(search, true)).toBe(false);
    expect(visualReviewEnabled("?devgame=1&visual-review=roster-v1", false)).toBe(false);
  });
  it("covers the 46 audited breadth-first models and excludes all rejected studies", () => {
    expect(VISUAL_REVIEW_ROSTER).toHaveLength(46);
    expect(new Set(VISUAL_REVIEW_ROSTER.map(e => `${e.tribeIndex}:${e.unitType}`)).size).toBe(46);
    expect(VISUAL_REVIEW_ROSTER.filter(e => e.candidate.decision === "rejected-study")).toHaveLength(0);
    expect(CROSS_TRIBE_P2_PILOTS.every(e => e.candidate.decision === "review-candidate")).toBe(true);
  });
  it.each(TRIBE_DEFS.map((def, index) => [index, def.name] as const))("maps designed tribe %i (%s), not its game slot", (identity) => {
    for (const entry of VISUAL_REVIEW_ROSTER.filter(e => e.tribeIndex === identity)) {
      expect(visualRosterCandidate(identity, unit(entry.unitType), true)).toBe(entry.candidate);
      expect(visualRosterCandidate(identity, unit(entry.unitType), false)).toBeNull();
      expect(visualRosterCandidate(identity, { ...unit(entry.unitType), boat: true }, true)).toBeNull();
    }
  });
  it("retains chosen Nerivane originals and aquatic v2 rather than rejected revisions", () => {
    expect(visualRosterCandidate(4, unit("warrior"), true)).toBe(NERIVANE_WARRIOR_PILOT);
    expect(visualRosterCandidate(4, unit("rider"), true)).toBe(NERIVANE_RIDER_AQUATIC_V2);
  });
  it("falls back for custom tribes, guardians, unmodeled roles and false hero markers", () => {
    expect(visualRosterCandidate(8, unit("warrior"), true)).toBeNull();
    expect(visualRosterCandidate(-1, { ...unit("warrior"), guardian: true }, true)).toBeNull();
    expect(visualRosterCandidate(4, unit("knight"), true)).toBeNull();
    expect(visualRosterCandidate(4, { ...unit("hero"), hero: false }, true)).toBeNull();
    expect(visualRosterCandidate(6, unit("tidecaller"), true)).toBeNull();
  });
});
describe("standalone multi-role preview fixture", () => {
  it.each(TRIBE_DEFS.map((_, index) => index))("builds tribe %i without saves, hidden units or overlapping actors", identity => {
    const first = createVisualReviewState(identity);
    expect(first).toEqual(createVisualReviewState(identity));
    expect(first.tribes[0].defIndex).toBe(identity);
    expect(first.units).toHaveLength(identity >= 6 ? 6 : 7);
    expect(new Set(first.units.map(u => `${u.x},${u.y}`)).size).toBe(first.units.length);
    expect(first.units.filter(u => u.type === "warrior")).toHaveLength(2);
    expect(first.units.every(u => first.tiles[u.y * first.size + u.x].explored[0])).toBe(true);
    expect(first.units.every(u => visualRosterCandidate(identity, u, true))).toBe(true);
    first.units[0].hp = 1;
    expect(createVisualReviewState(identity).units[0].hp).not.toBe(1);
  });
  it("rejects unknown tribe identities rather than inventing an import mapping", () => {
    expect(() => createVisualReviewState(9)).toThrow();
    expect(() => createVisualReviewState(-1)).toThrow();
  });
});
