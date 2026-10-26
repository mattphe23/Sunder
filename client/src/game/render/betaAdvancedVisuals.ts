import type { Unit } from "../core/types";
import type { BetaVisualCandidate } from "./betaVisualCandidate";
import { betaAdvancedRoleRevisionFor } from "./betaAdvancedRoleRevisions";
import { TRIBE_SWORDSMAN_ADVANCED_BETA } from "./betaAdvancedTribeVisuals";

/**
 * Separately audited, opt-in visual for one ordinary Auren Swordsman.
 *
 * This record is intentionally outside importedModelRegistry and the 46-entry
 * development-review roster. It is not a recolor or a cross-tribe substitute:
 * only designed identity 0 and the ordinary land swordsman role may resolve it.
 */
export interface BetaAdvancedVisualCandidate extends BetaVisualCandidate {
  readonly id: string;
  readonly generationJobId: string;
  readonly originalSourceBytes: number;
  readonly sourceImageSha256: string;
  readonly originalModelSha256: string;
  readonly derivativeSha256: string;
  readonly model: string;
  readonly faceLimitRequested: number;
  readonly materials: number;
  readonly derivativeProcess: string;
  readonly geometryMaterialIntegrity: string;
}

export const AUREN_SWORDSMAN_ADVANCED_BETA = Object.freeze({
  id: "auren-swordsman-p1",
  generationJobId: "job_m_66a1f6ee98cbcca58e0a",
  candidate: Object.freeze({
    id: "auren-swordsman-p1",
    name: "Auren ordinary Swordsman p1",
    assetId: "job_m_66a1f6ee98cbcca58e0a",
    generationJobId: "job_m_66a1f6ee98cbcca58e0a",
    modelUrl: "/manus-storage/auren-swordsman-p1-beta-512_d9ac7986.glb",
    originalModelUrl: "/manus-storage/auren-swordsman-p1-p2_3daceace.glb",
    vertices: 6_666,
    triangles: 4_828,
    runtimePrimitives: 1,
    materials: 1,
    sourceBytes: 812_316,
    originalSourceBytes: 3_814_544,
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
    sourceImageSha256:
      "474980346b80d17d67cf0445532ba1b7e3945842ad70fb33652f33070272b42a",
    originalModelSha256:
      "2f16d6aa1e845d997ad4d43d623ed246186be0e0ce802db32af6f49396d0efa9",
    derivativeSha256:
      "98627ba4974ffe729a40e4419de3058cf90d8ba672182abf5d624ddd844f0b0b",
    model: "image/P2-20260801",
    faceLimitRequested: 5_000,
    derivativeProcess: "embedded-textures-contain-resized-to-512px",
    geometryMaterialIntegrity: "independently-verified-unchanged",
    decision: "review-candidate",
  } satisfies BetaAdvancedVisualCandidate),
} as const);

/** Audit completeness is not visual release eligibility; never substitute another tribe. */
export const BETA_SWORDSMAN_VISUAL_HOLDS: Readonly<Record<number, string>> =
  Object.freeze({
    4: "Nerivane p1 contrast/readability hold after shader-ready ordinary-game review",
  });

/**
 * Narrow advanced lookup only. The caller owns the explicit preference and
 * custom/skin gates; this lookup owns designed identity and unit exclusions.
 */
export function betaAdvancedVisualCandidate(
  defIndex: number,
  unit: Pick<Unit, "type" | "hero" | "boat" | "guardian" | "raider">
): BetaVisualCandidate | null {
  if (
    !Number.isInteger(defIndex) ||
    defIndex < 0 ||
    defIndex > 7 ||
    unit.hero ||
    unit.boat ||
    unit.guardian ||
    unit.raider
  ) {
    return null;
  }
  const roleRevision = betaAdvancedRoleRevisionFor(defIndex, unit);
  if (roleRevision) return roleRevision;
  if (BETA_SWORDSMAN_VISUAL_HOLDS[defIndex] || unit.type !== "swordsman")
    return null;
  return defIndex === 0
    ? AUREN_SWORDSMAN_ADVANCED_BETA.candidate
    : (TRIBE_SWORDSMAN_ADVANCED_BETA[defIndex] ?? null);
}
