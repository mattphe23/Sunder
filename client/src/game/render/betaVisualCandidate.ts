import type { Unit } from "../core/types";
import type { ImportedModelCandidate } from "./importedModelRegistry";
import { betaAdvancedVisualCandidate } from "./betaAdvancedVisuals";
import { betaVisualModelFor } from "./betaVisualModels";
import { visualRosterCandidate } from "./visualReview";
import { betaVisualRevisionFor } from "./betaVisualRevisions";

export interface BetaVisualCandidate extends ImportedModelCandidate {
  readonly originalModelUrl: string;
  readonly textureBytesEstimated: number;
}

/** Explicit display choice only. Never substitute an unaudited original GLB. */
export function betaVisualCandidate(
  defIndex: number,
  unit: Pick<Unit, "type" | "hero" | "boat" | "guardian" | "raider">,
  enabled: boolean,
  customOrSkinned = false
): BetaVisualCandidate | null {
  if (!enabled || customOrSkinned) return null;
  const advanced = betaAdvancedVisualCandidate(defIndex, unit);
  if (advanced) return advanced;
  const original = visualRosterCandidate(defIndex, unit, true);
  if (!original) return null;
  const revision = betaVisualRevisionFor(original);
  if (revision) return revision;
  const derivative = betaVisualModelFor(original.modelUrl);
  if (
    !derivative ||
    derivative.textureResolution > 512 ||
    derivative.textureBytesEstimated <= 0
  )
    return null;
  return {
    ...original,
    originalModelUrl: original.modelUrl,
    modelUrl: derivative.modelUrl,
    sourceBytes: derivative.sourceBytes,
    textureResolution: derivative.textureResolution,
    textureBytesEstimated: derivative.textureBytesEstimated,
  };
}

/** Template textures only, including mipmaps. This is not total native RAM. */
export const BETA_MODEL_CACHE_LIMITS = Object.freeze({
  maxTextureBytes: 64 * 1024 * 1024,
  maxModels: 16,
  loadTimeoutMs: 15_000,
});
