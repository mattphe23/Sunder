import type { ImportedModelCandidate } from "./importedModelRegistry";
import { AUREN_MAELIS_PILOT } from "./importedModelRegistry";
import type { BetaVisualCandidate } from "./betaVisualCandidate";
import {
  NERIVANE_SWORDSMAN_P2_ADVANCED_BETA,
  SUNWEI_KNIGHT_P1_ADVANCED_BETA,
} from "./betaAdvancedRoleRevisions";
import {
  AUREN_SWORDSMAN_ADVANCED_BETA,
  BETA_SWORDSMAN_VISUAL_HOLDS,
} from "./betaAdvancedVisuals";
import { TRIBE_SWORDSMAN_ADVANCED_BETA } from "./betaAdvancedTribeVisuals";
import { BETA_VISUAL_MODELS } from "./betaVisualModels";
import { BETA_MODEL_PUBLIC_ORIGIN } from "./betaModelUrl";
import { NEUTRAL_OATH_GUARDIAN_BETA } from "./betaWorldVisuals";

/**
 * A separately generated, audited beta revision. The original 46-model map,
 * development review and original Maelis provenance remain unchanged.
 * This record is considered only after explicit New visuals opt-in and normal
 * roster eligibility. Review-candidate is not owner aesthetic approval.
 */
export const MAELIS_BETA_REVISION = Object.freeze({
  id: "auren-maelis-shoulder-mantle-r2",
  replacesOriginalModelUrl: AUREN_MAELIS_PILOT.modelUrl,
  originalModelUrl:
    "/manus-storage/auren-maelis-shoulder-mantle-r2-p2_bc1b24cd.glb",
  sourceImageSha256:
    "8f784178d14f347f03660efcb2113859a2ff92e5b4b99f3b87adad859d5aeb07",
  originalModelSha256:
    "933cb418d47fb7dfe6d81bc31898485f267fd97cd4db618010f14a2418c017f6",
  derivativeSha256:
    "d984fda7e841e7e31180400fafd7f413473ce07bfe6925157a3aee4e90cdc2a6",
  originalSourceBytes: 3_089_472,
  model: "image/P2-20260801",
  faceLimitRequested: 5_000,
  derivativeProcess: "embedded-textures-contain-resized-to-512px",
  geometryMaterialIntegrity: "independently-verified-unchanged",
  candidate: Object.freeze({
    name: "Auren Maelis shoulder-and-mantle r2",
    assetId: "job_m_b47c17d928167d232bf3",
    modelUrl:
      "/manus-storage/auren-maelis-shoulder-mantle-r2-p2-beta-512_fc894858.glb",
    originalModelUrl:
      "/manus-storage/auren-maelis-shoulder-mantle-r2-p2_bc1b24cd.glb",
    vertices: 6_084,
    triangles: 4_013,
    runtimePrimitives: 1,
    sourceBytes: 686_164,
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
    decision: "review-candidate",
  } satisfies BetaVisualCandidate),
} as const);

/** Only the eligible original Maelis slot may choose this separately named revision. */
export function betaVisualRevisionFor(
  original: ImportedModelCandidate
): BetaVisualCandidate | null {
  if (
    original.modelUrl !== AUREN_MAELIS_PILOT.modelUrl ||
    original.assetId !== AUREN_MAELIS_PILOT.assetId ||
    original.decision === "rejected-study"
  )
    return null;
  return { ...MAELIS_BETA_REVISION.candidate };
}

const textureEstimates = new Map<string, number>(
  Object.values(BETA_VISUAL_MODELS).map(model => [
    model.modelUrl,
    model.textureBytesEstimated,
  ])
);
textureEstimates.set(
  MAELIS_BETA_REVISION.candidate.modelUrl,
  MAELIS_BETA_REVISION.candidate.textureBytesEstimated
);
textureEstimates.set(
  NEUTRAL_OATH_GUARDIAN_BETA.candidate.modelUrl,
  NEUTRAL_OATH_GUARDIAN_BETA.candidate.textureBytesEstimated
);
textureEstimates.set(
  AUREN_SWORDSMAN_ADVANCED_BETA.candidate.modelUrl,
  AUREN_SWORDSMAN_ADVANCED_BETA.candidate.textureBytesEstimated
);
textureEstimates.set(
  NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate.modelUrl,
  NERIVANE_SWORDSMAN_P2_ADVANCED_BETA.candidate.textureBytesEstimated
);
textureEstimates.set(
  SUNWEI_KNIGHT_P1_ADVANCED_BETA.candidate.modelUrl,
  SUNWEI_KNIGHT_P1_ADVANCED_BETA.candidate.textureBytesEstimated
);
for (const [defIndex, candidate] of Object.entries(
  TRIBE_SWORDSMAN_ADVANCED_BETA
)) {
  if (BETA_SWORDSMAN_VISUAL_HOLDS[Number(defIndex)]) continue;
  textureEstimates.set(candidate.modelUrl, candidate.textureBytesEstimated);
}

/** Exact canonical or allow-listed native URLs only; originals have no admission entry. */
export function betaVisualTextureBytesForUrl(url: string): number {
  const canonical = url.startsWith(`${BETA_MODEL_PUBLIC_ORIGIN}/manus-storage/`)
    ? url.slice(BETA_MODEL_PUBLIC_ORIGIN.length)
    : url;
  const bytes = textureEstimates.get(canonical);
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0)
    throw new Error("No audited beta texture estimate for this model.");
  return bytes;
}
