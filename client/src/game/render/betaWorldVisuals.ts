import { GUARDIAN_TRIBE, type Unit } from "../core/types";
import type { BetaVisualCandidate } from "./betaVisualCandidate";

/**
 * Audited, opt-in world visual for the one neutral Great Ruin guardian.
 *
 * This candidate is intentionally outside the 46-record faction roster: it
 * cannot be selected by ordinary swordsmen or by the development-review path.
 * The immutable original is provenance only; the runtime selector exposes only
 * the separately audited 512px derivative.
 */
export interface BetaGuardianCandidate extends BetaVisualCandidate {
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

export const NEUTRAL_OATH_GUARDIAN_BETA = Object.freeze({
  id: "neutral-oathguardian-v1",
  generationJobId: "job_m_5b962ab1fa3cab8d7397",
  candidate: Object.freeze({
    id: "neutral-oathguardian-v1",
    name: "Neutral Oath Guardian v1",
    assetId: "job_m_5b962ab1fa3cab8d7397",
    generationJobId: "job_m_5b962ab1fa3cab8d7397",
    modelUrl: "/manus-storage/neutral-oathguardian-v1-beta-512_68426439.glb",
    originalModelUrl: "/manus-storage/neutral-oathguardian-v1-p2_6ac754ce.glb",
    sourceBytes: 648_572,
    originalSourceBytes: 3_435_992,
    vertices: 3_677,
    triangles: 4_806,
    runtimePrimitives: 1,
    materials: 1,
    textureResolution: 512,
    textureBytesEstimated: 4_194_306,
    sourceImageSha256:
      "e75d55402167394ffa79ac2f242396086f001cc92622cbb380dd14a16adbf350",
    originalModelSha256:
      "364a1e9f492956cd2cbfb24545c415679db122af20276bf90b3663b6694f4f84",
    derivativeSha256:
      "48d51718043fffef40166727ae5a935378a9dc19d98728c9681bfd51a27bc92a",
    model: "image/P2-20260801",
    faceLimitRequested: 5_000,
    derivativeProcess: "embedded-textures-contain-resized-to-512px",
    geometryMaterialIntegrity: "independently-verified-unchanged",
    decision: "review-candidate",
  } satisfies BetaGuardianCandidate),
} as const);

/**
 * The guardian asset has no broad swordsman fallback. It is selected only for
 * the neutral Great Ruin unit under the explicit New visuals preference.
 */
export function betaGuardianCandidate(
  unit: Pick<Unit, "type" | "tribe" | "guardian" | "boat" | "hero" | "raider">,
  enabled: boolean,
): BetaGuardianCandidate | null {
  if (
    !enabled ||
    !unit.guardian ||
    unit.tribe !== GUARDIAN_TRIBE ||
    unit.type !== "swordsman" ||
    unit.boat ||
    unit.hero ||
    unit.raider
  ) {
    return null;
  }
  return NEUTRAL_OATH_GUARDIAN_BETA.candidate;
}
