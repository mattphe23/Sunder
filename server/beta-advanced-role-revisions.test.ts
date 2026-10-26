import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  NERIVANE_SWORDSMAN_P2_ADVANCED_BETA,
  SUNWEI_KNIGHT_P1_ADVANCED_BETA,
  betaAdvancedRoleRevisionFor,
} from "../client/src/game/render/betaAdvancedRoleRevisions";
import {
  BETA_SWORDSMAN_VISUAL_HOLDS,
  betaAdvancedVisualCandidate,
} from "../client/src/game/render/betaAdvancedVisuals";
import { AUREN_SWORDSMAN_ADVANCED_BETA } from "../client/src/game/render/betaAdvancedVisuals";
import { TRIBE_SWORDSMAN_ADVANCED_BETA } from "../client/src/game/render/betaAdvancedTribeVisuals";
import {
  BETA_MODEL_CACHE_LIMITS,
  betaVisualCandidate,
} from "../client/src/game/render/betaVisualCandidate";
import { BETA_MODEL_PUBLIC_ORIGIN } from "../client/src/game/render/betaModelUrl";
import { betaVisualTextureBytesForUrl } from "../client/src/game/render/betaVisualRevisions";
import { BETA_VISUAL_MODELS } from "../client/src/game/render/betaVisualModels";
import {
  VISUAL_REVIEW_ROSTER,
  visualReviewEnabled,
  visualRosterCandidate,
} from "../client/src/game/render/visualReview";

const land = {
  hero: false,
  boat: false,
  guardian: false,
  raider: false,
};

const candidates = [
  {
    defIndex: 4,
    role: "swordsman" as const,
    candidate: NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate,
    expected: {
      id: "nerivane-swordsman-p2",
      generationJobId: "job_m_d01e89731b95e21a6e77",
      modelUrl: "/manus-storage/nerivane-swordsman-p2-beta-512_09c113bf.glb",
      originalModelUrl: "/manus-storage/nerivane-swordsman-p2-p2_f8031397.glb",
      sourceImageSha256:
        "bd37cce1cab867d8b65cbffd453f92bf8c5401ba43e3fb40397e0869e14cf644",
      originalModelSha256:
        "af59a2616daa12c41c8bbc8ef32bf9f94d58b4058239899ff0165ec08e82da9c",
      derivativeSha256:
        "0258958d8d2816e36ae57f1f1fd52f1e16c7587a29c8bf95a9fb17068d5a6995",
      vertices: 6828,
      triangles: 5267,
      sourceBytes: 702012,
      originalSourceBytes: 3161208,
    },
  },
  {
    defIndex: 2,
    role: "knight" as const,
    candidate: SUNWEI_KNIGHT_P1_ADVANCED_BETA.candidate,
    expected: {
      id: "sunwei-knight-p1",
      generationJobId: "job_m_745812cd8300ed55be04",
      modelUrl: "/manus-storage/sunwei-knight-p1-beta-512_2dd6f816.glb",
      originalModelUrl: "/manus-storage/sunwei-knight-p1-p2_dc4fc17f.glb",
      sourceImageSha256:
        "714355b87167ecba1f4a9a5ee81fbacddd28abd6278b904f69183b149e63ba84",
      originalModelSha256:
        "2728c6f6dff9f425d1ae9f2ebc018fc4aa400177c6ea268e792554c466ed74fd",
      derivativeSha256:
        "3041d966a3fc0485b075401f726f07a72009fb5f01d6403a9daf19784461296d",
      vertices: 7877,
      triangles: 5302,
      sourceBytes: 803604,
      originalSourceBytes: 3855916,
    },
  },
] as const;

const swordsmanByDefIndex = [
  AUREN_SWORDSMAN_ADVANCED_BETA.candidate,
  TRIBE_SWORDSMAN_ADVANCED_BETA[1],
  TRIBE_SWORDSMAN_ADVANCED_BETA[2],
  TRIBE_SWORDSMAN_ADVANCED_BETA[3],
  NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate,
  TRIBE_SWORDSMAN_ADVANCED_BETA[5],
  TRIBE_SWORDSMAN_ADVANCED_BETA[6],
  TRIBE_SWORDSMAN_ADVANCED_BETA[7],
] as const;

describe("isolated advanced role revisions", () => {
  it("keeps both audit-backed records immutable review candidates within their requested and accepted budgets", () => {
    for (const { candidate, expected } of candidates) {
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(candidate).toMatchObject(expected);
      expect(candidate.decision).toBe("review-candidate");
      expect(candidate.ownerAestheticApproval).toBe(false);
      expect(candidate.runtimeDecoderValidated).toBe(true);
      expect(candidate.originalBytesUnchanged).toBe(true);
      expect(candidate.independentIntegrityPassed).toBe(true);
      expect(candidate.independentGeometryBytesExact).toBe(true);
      expect(candidate.independentNonBufferJsonExact).toBe(true);
      expect(candidate.model).toBe("image/P2-20260801");
      expect(candidate.faceLimitRequested).toBe(5000);
      expect(candidate.triangleAcceptanceCeiling).toBe(5500);
      expect(candidate.triangles).toBeLessThanOrEqual(
        candidate.triangleAcceptanceCeiling
      );
      expect(candidate.runtimePrimitives).toBe(1);
      expect(candidate.materials).toBe(1);
      expect(candidate.textureResolution).toBe(512);
      expect(candidate.textureBytesEstimated).toBe(4194306);
      expect(candidate.sourceBytes).toBeLessThan(candidate.originalSourceBytes);
      expect(candidate.derivativeProcess).toBe(
        "embedded-textures-contain-resized-to-512px"
      );
      expect(candidate.geometryMaterialIntegrity).toBe(
        "independently-verified-unchanged"
      );
    }
  });

  it("maps all eight designed identities to only their own Swordsman and Knight candidates", () => {
    for (let defIndex = 0; defIndex <= 7; defIndex += 1) {
      for (const role of ["swordsman", "knight"] as const) {
        const roleRevision =
          defIndex === 4 && role === "swordsman"
            ? NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate
            : defIndex === 2 && role === "knight"
              ? SUNWEI_KNIGHT_P1_ADVANCED_BETA.candidate
              : null;
        expect(betaAdvancedRoleRevisionFor(defIndex, { type: role })).toBe(
          roleRevision
        );
        expect(
          betaAdvancedVisualCandidate(defIndex, { ...land, type: role })
        ).toBe(
          role === "swordsman" ? swordsmanByDefIndex[defIndex] : roleRevision
        );
      }
    }
  });

  it("does not route candidates across roles or into heroes, boats, guardians, raiders, or invalid identities", () => {
    for (let defIndex = 0; defIndex <= 7; defIndex += 1)
      for (const type of ["swordsman", "knight"] as const) {
        for (const excluded of [
          { hero: true },
          { boat: true },
          { guardian: true },
          { raider: true },
        ])
          expect(
            betaAdvancedVisualCandidate(defIndex, {
              ...land,
              type,
              ...excluded,
            })
          ).toBeNull();
        expect(
          betaAdvancedRoleRevisionFor(defIndex, { type: "warrior" })
        ).toBeNull();
      }
    for (const invalid of [-1, 8, 2.5, Number.NaN])
      for (const type of ["swordsman", "knight"] as const)
        expect(
          betaAdvancedVisualCandidate(invalid, { ...land, type })
        ).toBeNull();
  });

  it("keeps candidate selection behind affirmative beta preference and custom skin gates", () => {
    for (const { defIndex, role, candidate } of candidates) {
      const unit = { ...land, type: role };
      expect(betaVisualCandidate(defIndex, unit, false)).toBeNull();
      expect(betaVisualCandidate(defIndex, unit, true, true)).toBeNull();
      expect(betaVisualCandidate(defIndex, unit, true)).toBe(candidate);
    }
    expect(
      visualReviewEnabled("?devgame=1&visual-review=roster-v1", false)
    ).toBe(false);
    expect(
      visualRosterCandidate(4, { ...land, type: "swordsman" }, true)
    ).toBeNull();
    expect(
      visualRosterCandidate(2, { ...land, type: "knight" }, true)
    ).toBeNull();
  });

  it("preserves the held Nerivane p1 record and never admits its URL", () => {
    const p1Url = "/manus-storage/nerivane-swordsman-p1-beta-512_b5e38e78.glb";
    expect(Object.keys(BETA_SWORDSMAN_VISUAL_HOLDS)).toEqual(["4"]);
    expect(BETA_SWORDSMAN_VISUAL_HOLDS[4]).toContain("hold");
    expect(() => betaVisualTextureBytesForUrl(p1Url)).toThrow(
      "No audited beta texture estimate"
    );
    expect(betaAdvancedVisualCandidate(4, { ...land, type: "swordsman" })).toBe(
      NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate
    );
  });

  it("admits only exact candidate derivatives on canonical and native forms", () => {
    for (const { candidate } of candidates) {
      for (const admitted of [
        candidate.modelUrl,
        `${BETA_MODEL_PUBLIC_ORIGIN}${candidate.modelUrl}`,
      ])
        expect(betaVisualTextureBytesForUrl(admitted)).toBe(4194306);
      for (const refused of [
        candidate.originalModelUrl,
        `${candidate.modelUrl}?v=1`,
        `${candidate.modelUrl}#fragment`,
        `https://evil.invalid${candidate.modelUrl}`,
        `${BETA_MODEL_PUBLIC_ORIGIN}.evil.invalid${candidate.modelUrl}`,
        candidate.modelUrl.replace("/manus-storage/", "/manus-storage/../"),
      ])
        expect(() => betaVisualTextureBytesForUrl(refused)).toThrow(
          "No audited beta texture estimate"
        );
    }
  });

  it("does not change the original 46 registry/mapping, seven old tribe records, or cache ceilings", () => {
    expect(VISUAL_REVIEW_ROSTER).toHaveLength(46);
    expect(Object.keys(BETA_VISUAL_MODELS)).toHaveLength(46);
    expect(BETA_MODEL_CACHE_LIMITS).toEqual({
      maxTextureBytes: 64 * 1024 * 1024,
      maxModels: 16,
      loadTimeoutMs: 15000,
    });
    const sourceHash = (path: string) =>
      createHash("sha256")
        .update(readFileSync(new URL(path, import.meta.url)))
        .digest("hex");
    expect(
      sourceHash("../client/src/game/render/importedModelRegistry.ts")
    ).toBe("4d16ff02609547fe127356cf5be3700bac5cba2cca051b04ee12db5068eefb44");
    expect(sourceHash("../client/src/game/render/betaVisualModels.ts")).toBe(
      "8d65bec50b80ab7a46b2795cc41d3a12fb50f66914154bcee4b76ca06285b9f0"
    );
    expect(
      sourceHash("../client/src/game/render/betaAdvancedTribeVisuals.ts")
    ).toBe("fbc63639d7d0219ce4c46586297615a60bc3abd324d257dfdfb1053332ae7ae4");
    const tribeSource = readFileSync(
      new URL(
        "../client/src/game/render/betaAdvancedTribeVisuals.ts",
        import.meta.url
      ),
      "utf8"
    );
    expect(tribeSource).toContain('id: "nerivane-swordsman-p1"');
    expect(tribeSource).toContain(
      'modelUrl: "/manus-storage/nerivane-swordsman-p1-beta-512_b5e38e78.glb"'
    );
  });
});
