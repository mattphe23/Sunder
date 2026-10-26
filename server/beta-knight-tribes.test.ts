import { describe, expect, it } from "vitest";
import {
  TRIBE_KNIGHT_ADVANCED_BETA,
  betaKnightTribeVisualFor,
} from "../client/src/game/render/betaKnightTribeVisuals";
import { betaAdvancedRoleRevisionFor, NERIVANE_SWORDSMAN_P2_ADVANCED_BETA } from "../client/src/game/render/betaAdvancedRoleRevisions";
import { betaAdvancedVisualCandidate } from "../client/src/game/render/betaAdvancedVisuals";
import {
  BETA_MODEL_CACHE_LIMITS,
  betaVisualCandidate,
} from "../client/src/game/render/betaVisualCandidate";
import { BETA_MODEL_PUBLIC_ORIGIN } from "../client/src/game/render/betaModelUrl";
import { betaVisualTextureBytesForUrl } from "../client/src/game/render/betaVisualRevisions";
import { BETA_VISUAL_MODELS } from "../client/src/game/render/betaVisualModels";
import { VISUAL_REVIEW_ROSTER } from "../client/src/game/render/visualReview";

const land = { hero: false, boat: false, guardian: false, raider: false };
const allNewKnightIndices = [0, 1, 3, 4, 5, 6, 7] as const;
// Generated from admissions/audits. No external evidence path is read at test time.
const expectedAdmissions = [
  {
    defIndex: 0,
    tribe: "auren",
    candidate: {
      id: "auren-knight-p1",
      name: "Auren ordinary Knight p1",
      assetId: "job_m_8503a56a396827d49dd5",
      generationJobId: "job_m_8503a56a396827d49dd5",
      modelUrl: "/manus-storage/auren-knight-p1-beta-512_84954e8e.glb",
      originalModelUrl: "/manus-storage/auren-knight-p1-p2_2cbc69cf.glb",
      vertices: 8400,
      triangles: 5243,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 829128,
      originalSourceBytes: 3709596,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      sourceImageSha256: "6308fe00237af72838adbae77a002b7671f06fc904f515c7fdb1741368fad1bc",
      originalModelSha256: "c0cbaeef1ac04d1d87efa3c670613600fe10dfedf7b4aa1ef1cabfc0a06e27a3",
      derivativeSha256: "73de3c6f07254f0fca1d0df1e9bcaf1e78a000dd047a74a7531bd3007a1b6373",
      model: "image/P2-20260801",
      faceLimitRequested: 5000,
      triangleAcceptanceCeiling: 5500,
      derivativeProcess: "embedded-textures-contain-resized-to-512px",
      geometryMaterialIntegrity: "independently-verified-unchanged",
      originalBytesUnchanged: true,
      independentIntegrityPassed: true,
      independentGeometryBytesExact: true,
      independentNonBufferJsonExact: true,
      ownerAestheticApproval: false,
      runtimeDecoderValidated: true,
      runtimeValidationStatus: "proven-by-separate-production-qa",
      decision: "review-candidate",
    },
  },
  {
    defIndex: 1,
    tribe: "kharzul",
    candidate: {
      id: "kharzul-knight-p1",
      name: "Kharzul ordinary Knight p1",
      assetId: "job_m_63baa8f9bfbca8e566ba",
      generationJobId: "job_m_63baa8f9bfbca8e566ba",
      modelUrl: "/manus-storage/kharzul-knight-p1-beta-512_c9fb433f.glb",
      originalModelUrl: "/manus-storage/kharzul-knight-p1-p2_caa4811c.glb",
      vertices: 8739,
      triangles: 5361,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 849804,
      originalSourceBytes: 4222724,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      sourceImageSha256: "578da801eec5b72ffaf7311466010fd0561bda232f7d6537be7767377b8118fa",
      originalModelSha256: "0835b3a3d6a04ddcd1166c8533027d7dae35a074d4b6c6e02ec7af6e0873b5bc",
      derivativeSha256: "f7264739b65766895b7185b9a004a1f5a32284ef8ffe3bebc5d0e80a6f22a7bd",
      model: "image/P2-20260801",
      faceLimitRequested: 5000,
      triangleAcceptanceCeiling: 5500,
      derivativeProcess: "embedded-textures-contain-resized-to-512px",
      geometryMaterialIntegrity: "independently-verified-unchanged",
      originalBytesUnchanged: true,
      independentIntegrityPassed: true,
      independentGeometryBytesExact: true,
      independentNonBufferJsonExact: true,
      ownerAestheticApproval: false,
      runtimeDecoderValidated: true,
      runtimeValidationStatus: "proven-by-separate-production-qa",
      decision: "review-candidate",
    },
  },
  {
    defIndex: 3,
    tribe: "vessari",
    candidate: {
      id: "vessari-knight-p4",
      name: "Vessari ordinary Knight p4",
      assetId: "job_m_692810898e259cf4968b",
      generationJobId: "job_m_692810898e259cf4968b",
      modelUrl: "/manus-storage/vessari-knight-p4-beta-512_350ed7ac.glb",
      originalModelUrl: "/manus-storage/vessari-knight-p4-p2_220953d3.glb",
      vertices: 8250,
      triangles: 5488,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 721184,
      originalSourceBytes: 3125028,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      sourceImageSha256: "22a3686cadc484655488c4434c6d9d87ec4de4efe12d7361ae5ed9e1f1c25894",
      originalModelSha256: "8bba7aedd48caa53271a3bdcb504043a4cc810356ce1209c642a66e8311c7738",
      derivativeSha256: "2a861a56f00fa68e33fd2bb739e2a318e124d8643df3d4038e030f57fc21ef07",
      model: "image/P2-20260801",
      faceLimitRequested: 5000,
      triangleAcceptanceCeiling: 5500,
      derivativeProcess: "embedded-textures-contain-resized-to-512px",
      geometryMaterialIntegrity: "independently-verified-unchanged",
      originalBytesUnchanged: true,
      independentIntegrityPassed: true,
      independentGeometryBytesExact: true,
      independentNonBufferJsonExact: true,
      ownerAestheticApproval: false,
      runtimeDecoderValidated: true,
      runtimeValidationStatus: "proven-by-separate-production-qa",
      decision: "review-candidate",
    },
  },
  {
    defIndex: 4,
    tribe: "nerivane",
    candidate: {
      id: "nerivane-knight-p1",
      name: "Nerivane ordinary Knight p1",
      assetId: "job_m_d922f65476eb88802e58",
      generationJobId: "job_m_d922f65476eb88802e58",
      modelUrl: "/manus-storage/nerivane-knight-p1-beta-512_2a5d91b3.glb",
      originalModelUrl: "/manus-storage/nerivane-knight-p1-p2_eefd73fe.glb",
      vertices: 7652,
      triangles: 5176,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 674280,
      originalSourceBytes: 3373672,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      sourceImageSha256: "c15ff1285269df3d482b39839b3fd78acd45dcf059f14ce1c671418357c92628",
      originalModelSha256: "53ec6aff75a2b66789415956d4afb831d92c661b2fe035523c8e4c569c49e33e",
      derivativeSha256: "c3f1af7212a66af1e37914967b4488882eedcbae4dadb7962aad7be2dcc13e75",
      model: "image/P2-20260801",
      faceLimitRequested: 5000,
      triangleAcceptanceCeiling: 5500,
      derivativeProcess: "embedded-textures-contain-resized-to-512px",
      geometryMaterialIntegrity: "independently-verified-unchanged",
      originalBytesUnchanged: true,
      independentIntegrityPassed: true,
      independentGeometryBytesExact: true,
      independentNonBufferJsonExact: true,
      ownerAestheticApproval: false,
      runtimeDecoderValidated: true,
      runtimeValidationStatus: "proven-by-separate-production-qa",
      decision: "review-candidate",
    },
  },
  {
    defIndex: 5,
    tribe: "dravok",
    candidate: {
      id: "dravok-knight-p2",
      name: "Dravok ordinary Knight p2",
      assetId: "job_m_7466acd3b54c25e6331c",
      generationJobId: "job_m_7466acd3b54c25e6331c",
      modelUrl: "/manus-storage/dravok-knight-p2-beta-512_304c8c7d.glb",
      originalModelUrl: "/manus-storage/dravok-knight-p2-p2_30012dc8.glb",
      vertices: 8174,
      triangles: 5294,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 698696,
      originalSourceBytes: 3561552,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      sourceImageSha256: "26c62da6aba164784a4cc222aed820697f2cad44aee33724a56b2d374b82e150",
      originalModelSha256: "508f2353eae69d622382c75e5cc277b542dcd6fcce8d115a44d1da8427f7121a",
      derivativeSha256: "710f3c8eeaf1ee2131c9aad4cce657d11d2167e730759f58d13f6e5898923772",
      model: "image/P2-20260801",
      faceLimitRequested: 5000,
      triangleAcceptanceCeiling: 5500,
      derivativeProcess: "embedded-textures-contain-resized-to-512px",
      geometryMaterialIntegrity: "independently-verified-unchanged",
      originalBytesUnchanged: true,
      independentIntegrityPassed: true,
      independentGeometryBytesExact: true,
      independentNonBufferJsonExact: true,
      ownerAestheticApproval: false,
      runtimeDecoderValidated: true,
      runtimeValidationStatus: "proven-by-separate-production-qa",
      decision: "review-candidate",
    },
  },
  {
    defIndex: 6,
    tribe: "valkyra",
    candidate: {
      id: "valkyra-knight-p3",
      name: "Valkyra ordinary Knight p3",
      assetId: "job_m_98c4b38d35cfc1505e92",
      generationJobId: "job_m_98c4b38d35cfc1505e92",
      modelUrl: "/manus-storage/valkyra-knight-p3-beta-512_e4020ca5.glb",
      originalModelUrl: "/manus-storage/valkyra-knight-p3-p2_3f128141.glb",
      vertices: 7823,
      triangles: 5033,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 761376,
      originalSourceBytes: 3312964,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      sourceImageSha256: "3ebf0495060118451bc8fd32d36fb6d3cc7ca834ec530a92c427550899bdae4c",
      originalModelSha256: "55cac08039f7e5563a6984594b103264bdd65ed028c85923ab78680ecdcd06c4",
      derivativeSha256: "1e10924a63b871c881fc81769338b3a53a13d9320922f6ef555777e49736ffc3",
      model: "image/P2-20260801",
      faceLimitRequested: 5000,
      triangleAcceptanceCeiling: 5500,
      derivativeProcess: "embedded-textures-contain-resized-to-512px",
      geometryMaterialIntegrity: "independently-verified-unchanged",
      originalBytesUnchanged: true,
      independentIntegrityPassed: true,
      independentGeometryBytesExact: true,
      independentNonBufferJsonExact: true,
      ownerAestheticApproval: false,
      runtimeDecoderValidated: true,
      runtimeValidationStatus: "proven-by-separate-production-qa",
      decision: "review-candidate",
    },
  },
  {
    defIndex: 7,
    tribe: "mycelon",
    candidate: {
      id: "mycelon-knight-p1",
      name: "Mycelon ordinary Knight p1",
      assetId: "job_m_05a1852f43ce8101abac",
      generationJobId: "job_m_05a1852f43ce8101abac",
      modelUrl: "/manus-storage/mycelon-knight-p1-beta-512_90227382.glb",
      originalModelUrl: "/manus-storage/mycelon-knight-p1-p2_5974ff88.glb",
      vertices: 4014,
      triangles: 5271,
      runtimePrimitives: 1,
      materials: 1,
      sourceBytes: 606752,
      originalSourceBytes: 3357108,
      textureResolution: 512,
      textureBytesEstimated: 4194306,
      sourceImageSha256: "907121b8d770aaecfdf912cb5dc4c830d6d2cfd76f568500b625ad54eecc6c50",
      originalModelSha256: "758c765abec2ec36f715961c514f8361429c549e5e8f0a8ec33590779b1a049c",
      derivativeSha256: "4148916d47c6f827dc4f752901797c0c3e9636b803540a678884122caaec01b5",
      model: "image/P2-20260801",
      faceLimitRequested: 5000,
      triangleAcceptanceCeiling: 5500,
      derivativeProcess: "embedded-textures-contain-resized-to-512px",
      geometryMaterialIntegrity: "independently-verified-unchanged",
      originalBytesUnchanged: true,
      independentIntegrityPassed: true,
      independentGeometryBytesExact: true,
      independentNonBufferJsonExact: true,
      ownerAestheticApproval: false,
      runtimeDecoderValidated: true,
      runtimeValidationStatus: "proven-by-separate-production-qa",
      decision: "review-candidate",
    },
  }
] as const;
const newKnightIndices = [0, 1, 3, 4, 5, 6, 7] as const;
const unadmittedKnightIndices = allNewKnightIndices.filter(
  index => !newKnightIndices.includes(index as (typeof newKnightIndices)[number])
);

describe("proven final own-tribe ordinary Knight visual admissions", () => {
  it("adds only the admitted frozen records while preserving original registries", () => {
    expect(Object.keys(TRIBE_KNIGHT_ADVANCED_BETA)).toEqual(newKnightIndices.map(String));
    expect(Object.isFrozen(TRIBE_KNIGHT_ADVANCED_BETA)).toBe(true);
    expect(VISUAL_REVIEW_ROSTER).toHaveLength(46);
    expect(Object.keys(BETA_VISUAL_MODELS)).toHaveLength(46);
  });

  for (const expected of expectedAdmissions) {
    it(expected.tribe + ": maps only its ordinary land Knight after affirmative opt-in", () => {
      const candidate = TRIBE_KNIGHT_ADVANCED_BETA[expected.defIndex];
      expect(candidate).not.toBeUndefined();
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(candidate).toMatchObject(expected.candidate);
      expect(candidate.runtimeDecoderValidated).toBe(expected.candidate.runtimeDecoderValidated);
      expect(candidate.runtimeValidationStatus).toBe(expected.candidate.runtimeValidationStatus);
      expect(candidate.ownerAestheticApproval).toBe(false);
      expect(candidate.decision).toBe("review-candidate");
      expect(candidate.faceLimitRequested).toBe(5000);
      expect(candidate.triangleAcceptanceCeiling).toBeLessThanOrEqual(5500);
      expect(candidate.triangles).toBeLessThanOrEqual(candidate.triangleAcceptanceCeiling);
      expect(candidate.vertices).toBeLessThanOrEqual(10000);
      expect(candidate.textureResolution).toBeLessThanOrEqual(512);
      expect(candidate.sourceBytes).toBeLessThan(candidate.originalSourceBytes);
      expect(betaKnightTribeVisualFor(expected.defIndex)).toBe(candidate);
      expect(betaAdvancedRoleRevisionFor(expected.defIndex, { type: "knight" })).toBe(candidate);
      expect(betaAdvancedVisualCandidate(expected.defIndex, { ...land, type: "knight" })).toBe(candidate);
      expect(betaVisualCandidate(expected.defIndex, { ...land, type: "knight" }, false)).toBeNull();
      expect(betaVisualCandidate(expected.defIndex, { ...land, type: "knight" }, true, true)).toBeNull();
      expect(betaVisualCandidate(expected.defIndex, { ...land, type: "knight" }, true)).toBe(candidate);
      for (const wrongRole of ["warrior", "swordsman", "defender", "rider", "hero"] as const) {
        const existingOtherRole = wrongRole === "swordsman" && expected.defIndex === 4
          ? NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate
          : null;
        expect(betaAdvancedRoleRevisionFor(expected.defIndex, { type: wrongRole })).toBe(existingOtherRole);
      }
      for (const excluded of [{ hero: true }, { boat: true }, { guardian: true }, { raider: true }])
        expect(betaAdvancedVisualCandidate(expected.defIndex, { ...land, type: "knight", ...excluded })).toBeNull();
      for (const admittedUrl of [candidate.modelUrl, BETA_MODEL_PUBLIC_ORIGIN + candidate.modelUrl])
        expect(betaVisualTextureBytesForUrl(admittedUrl)).toBe(candidate.textureBytesEstimated);
      for (const rejectedUrl of [
        candidate.originalModelUrl,
        candidate.modelUrl + "?revision=1",
        candidate.modelUrl + "#fragment",
        "https://evil.invalid" + candidate.modelUrl,
        BETA_MODEL_PUBLIC_ORIGIN + ".evil.invalid" + candidate.modelUrl,
        candidate.modelUrl.replace("/manus-storage/", "/manus-storage/../"),
      ])
        expect(() => betaVisualTextureBytesForUrl(rejectedUrl)).toThrow("No audited beta texture estimate");
    });
  }

  it("leaves every unadmitted new Knight procedural without generic or cross-tribe substitution", () => {
    for (const defIndex of unadmittedKnightIndices) {
      expect(betaKnightTribeVisualFor(defIndex)).toBeNull();
      expect(betaAdvancedRoleRevisionFor(defIndex, { type: "knight" })).toBeNull();
      expect(betaAdvancedVisualCandidate(defIndex, { ...land, type: "knight" })).toBeNull();
      expect(betaVisualCandidate(defIndex, { ...land, type: "knight" }, true)).toBeNull();
    }
  });

  it("keeps Sunwei P1 and held Nerivane Swordsman P1 outside this registry", () => {
    for (const invalidIndex of [-1, 2, 8, 99, 0.5, Number.NaN])
      expect(betaKnightTribeVisualFor(invalidIndex)).toBeNull();
    expect(() => betaVisualTextureBytesForUrl("/manus-storage/nerivane-swordsman-p1-beta-512_b5e38e78.glb")).toThrow("No audited beta texture estimate");
  });

  it("retains shared cache ceilings and exact canonical URL admission", () => {
    expect(BETA_MODEL_CACHE_LIMITS).toEqual({
      maxTextureBytes: 64 * 1024 * 1024,
      maxModels: 16,
      loadTimeoutMs: 15000,
    });
    expect(() => betaVisualTextureBytesForUrl("/manus-storage/not-admitted.glb")).toThrow("No audited beta texture estimate");
  });
});
