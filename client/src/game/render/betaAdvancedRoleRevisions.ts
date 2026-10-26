import type { Unit } from "../core/types";
import type { BetaAdvancedVisualCandidate } from "./betaAdvancedVisuals";
import { betaKnightTribeVisualFor } from "./betaKnightTribeVisuals";

type AuditedRoleRevisionCandidate = BetaAdvancedVisualCandidate & {
  readonly triangleAcceptanceCeiling: number;
  readonly originalBytesUnchanged: true;
  readonly independentIntegrityPassed: true;
  readonly independentGeometryBytesExact: true;
  readonly independentNonBufferJsonExact: true;
  readonly ownerAestheticApproval: false;
  readonly runtimeDecoderValidated: true;
};

/**
 * Independently audited additions for exact ordinary land roles only.
 * These are engineering review candidates, not owner aesthetic approval or a
 * replacement for the original 46-model roster and derivative mapping.
 */
export const NERIVANE_SWORDSMAN_P2_ADVANCED_BETA = Object.freeze({
  id: "nerivane-swordsman-p2",
  candidate: Object.freeze({
    id: "nerivane-swordsman-p2",
    name: "Nerivane ordinary Swordsman p2",
    assetId: "job_m_d01e89731b95e21a6e77",
    generationJobId: "job_m_d01e89731b95e21a6e77",
    modelUrl: "/manus-storage/nerivane-swordsman-p2-beta-512_09c113bf.glb",
    originalModelUrl: "/manus-storage/nerivane-swordsman-p2-p2_f8031397.glb",
    vertices: 6_828,
    triangles: 5_267,
    runtimePrimitives: 1,
    materials: 1,
    sourceBytes: 702_012,
    originalSourceBytes: 3_161_208,
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
    sourceImageSha256:
      "bd37cce1cab867d8b65cbffd453f92bf8c5401ba43e3fb40397e0869e14cf644",
    originalModelSha256:
      "af59a2616daa12c41c8bbc8ef32bf9f94d58b4058239899ff0165ec08e82da9c",
    derivativeSha256:
      "0258958d8d2816e36ae57f1f1fd52f1e16c7587a29c8bf95a9fb17068d5a6995",
    model: "image/P2-20260801",
    faceLimitRequested: 5_000,
    triangleAcceptanceCeiling: 5_500,
    derivativeProcess: "embedded-textures-contain-resized-to-512px",
    geometryMaterialIntegrity: "independently-verified-unchanged",
    originalBytesUnchanged: true,
    independentIntegrityPassed: true,
    independentGeometryBytesExact: true,
    independentNonBufferJsonExact: true,
    ownerAestheticApproval: false,
    runtimeDecoderValidated: true,
    decision: "review-candidate",
  } satisfies AuditedRoleRevisionCandidate),
} as const);

export const SUNWEI_KNIGHT_P1_ADVANCED_BETA = Object.freeze({
  id: "sunwei-knight-p1",
  candidate: Object.freeze({
    id: "sunwei-knight-p1",
    name: "Sunwei ordinary Knight p1",
    assetId: "job_m_745812cd8300ed55be04",
    generationJobId: "job_m_745812cd8300ed55be04",
    modelUrl: "/manus-storage/sunwei-knight-p1-beta-512_2dd6f816.glb",
    originalModelUrl: "/manus-storage/sunwei-knight-p1-p2_dc4fc17f.glb",
    vertices: 7_877,
    triangles: 5_302,
    runtimePrimitives: 1,
    materials: 1,
    sourceBytes: 803_604,
    originalSourceBytes: 3_855_916,
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
    sourceImageSha256:
      "714355b87167ecba1f4a9a5ee81fbacddd28abd6278b904f69183b149e63ba84",
    originalModelSha256:
      "2728c6f6dff9f425d1ae9f2ebc018fc4aa400177c6ea268e792554c466ed74fd",
    derivativeSha256:
      "3041d966a3fc0485b075401f726f07a72009fb5f01d6403a9daf19784461296d",
    model: "image/P2-20260801",
    faceLimitRequested: 5_000,
    triangleAcceptanceCeiling: 5_500,
    derivativeProcess: "embedded-textures-contain-resized-to-512px",
    geometryMaterialIntegrity: "independently-verified-unchanged",
    originalBytesUnchanged: true,
    independentIntegrityPassed: true,
    independentGeometryBytesExact: true,
    independentNonBufferJsonExact: true,
    ownerAestheticApproval: false,
    runtimeDecoderValidated: true,
    decision: "review-candidate",
  } satisfies AuditedRoleRevisionCandidate),
} as const);

/**
 * The caller validates the designed identity and excludes heroes, boats,
 * guardians, and raiders before reaching this exact-role lookup. There is no
 * tribe fallback or cross-role substitution.
 */
export function betaAdvancedRoleRevisionFor(
  defIndex: number,
  unit: Pick<Unit, "type">
): BetaAdvancedVisualCandidate | null {
  if (defIndex === 4 && unit.type === "swordsman")
    return NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate;
  if (defIndex === 2 && unit.type === "knight")
    return SUNWEI_KNIGHT_P1_ADVANCED_BETA.candidate;
  if (unit.type === "knight") return betaKnightTribeVisualFor(defIndex);
  return null;
}
