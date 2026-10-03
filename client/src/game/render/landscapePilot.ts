/** Visual-only, independently comparable landscape variants. */
export type LandscapeVariant = "coast-v1" | "fog-v1" | "vegetation-v1" | "mountain-v1";

/** Requires a dev build AND an explicit devgame; never alters a normal match. */
export function landscapeVariantEnabled(search: string, dev: boolean, variant: LandscapeVariant): boolean {
  if (!dev) return false;
  const query = new URLSearchParams(search);
  if (!query.has("devgame")) return false;
  const selected = query.get("landscape-pilot");
  return selected === variant || selected === "review-v2";
}

export function coastPilotEnabled(search: string, dev: boolean): boolean {
  return landscapeVariantEnabled(search, dev, "coast-v1");
}

/** Clear a visual lane around settlements while retaining biome tree shapes. */
export function forestTreeCount(kind: "conifer" | "pine" | "palm" | "acacia", x: number, y: number, nearSettlement: boolean, review: boolean): number {
  const original = (kind === "palm" || kind === "acacia" ? 2 : 3) + ((x * 7 + y * 11) % 2);
  return review ? (nearSettlement ? 2 : Math.min(original, 3)) : original;
}

/** Keep a more planted forest floor away from settlements, not under units. */
export function forestUnderbrushLimit(nearSettlement: boolean, review: boolean): number {
  return review ? (nearSettlement ? 3 : 11) : 7;
}

/**
 * The terrain body is centred below the logical land cap by half its full
 * height (land slab plus skirt). Convert a world-space waterline offset into
 * that body's local Y; the previous coastal band was mistakenly placed below
 * the water, obscuring the color break it was meant to make visible.
 */
export function coastBandLocalY(
  landHeight: number,
  waterHeight: number,
  landSkirt: number,
  offsetFromWaterSurface: number,
): number {
  const landBodyCenter = landHeight - 0.4 - (landHeight + landSkirt) / 2;
  const waterSurface = waterHeight - 0.4;
  return waterSurface + offsetFromWaterSurface - landBodyCenter;
}
