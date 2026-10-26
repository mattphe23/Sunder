import { describe, expect, it } from "vitest";
import { betaVisualCandidate } from "../client/src/game/render/betaVisualCandidate";
import { MAELIS_BETA_REVISION } from "../client/src/game/render/betaVisualRevisions";
import { betaAdvancedRoleRevisionFor } from "../client/src/game/render/betaAdvancedRoleRevisions";
import {
  VISUAL_REVIEW_ROSTER,
  visualReviewEnabled,
} from "../client/src/game/render/visualReview";

const warrior = {
  type: "warrior" as const,
  hero: false,
  boat: false,
  guardian: false,
};
describe("beta visual selection", () => {
  it("requires explicit opt-in and never weakens development review gates", () => {
    expect(betaVisualCandidate(4, warrior, false)).toBeNull();
    expect(
      visualReviewEnabled("?devgame=1&visual-review=roster-v1", false)
    ).toBe(false);
  });
  it("uses audited derivatives only and preserves original provenance and decisions", () => {
    expect(VISUAL_REVIEW_ROSTER).toHaveLength(46);
    for (const entry of VISUAL_REVIEW_ROSTER) {
      const before = JSON.stringify(entry.candidate);
      const selected = betaVisualCandidate(
        entry.tribeIndex,
        { ...warrior, type: entry.unitType, hero: entry.unitType === "hero" },
        true
      );
      const advancedRole = betaAdvancedRoleRevisionFor(entry.tribeIndex, {
        type: entry.unitType,
      });
      expect(selected).not.toBeNull();
      if (advancedRole) {
        expect(selected).toBe(advancedRole);
        continue;
      }
      expect(selected?.modelUrl).toMatch(
        /^\/manus-storage\/[a-zA-Z0-9_-]+-beta-512_[a-zA-Z0-9]+\.glb$/
      );
      expect(selected?.modelUrl).not.toBe(entry.candidate.modelUrl);
      const revisedMaelis =
        entry.candidate.modelUrl ===
        MAELIS_BETA_REVISION.replacesOriginalModelUrl;
      expect(selected?.originalModelUrl).toBe(
        revisedMaelis
          ? MAELIS_BETA_REVISION.originalModelUrl
          : entry.candidate.modelUrl
      );
      expect(selected?.assetId).toBe(
        revisedMaelis
          ? MAELIS_BETA_REVISION.candidate.assetId
          : entry.candidate.assetId
      );
      expect(selected?.decision).toBe(entry.candidate.decision);
      expect(selected?.textureResolution).toBeLessThanOrEqual(512);
      expect(JSON.stringify(entry.candidate)).toBe(before);
    }
  });
  it("leaves boats, guardians, unnamed heroes, custom costumes and unmodeled roles procedural", () => {
    for (const unit of [
      { ...warrior, boat: true },
      { ...warrior, guardian: true },
      { ...warrior, type: "hero" as const },
      { ...warrior, type: "catapult" as const },
    ]) {
      expect(betaVisualCandidate(4, unit, true)).toBeNull();
    }
    expect(betaVisualCandidate(4, warrior, true, true)).toBeNull();
    expect(betaVisualCandidate(99, warrior, true)).toBeNull();
    expect(betaVisualCandidate(-1, warrior, true)).toBeNull();
  });
});
