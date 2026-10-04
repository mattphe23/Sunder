/** Visual-only, independently comparable landscape variants. */
export type LandscapeVariant = "coast-v1" | "fog-v1" | "vegetation-v1" | "mountain-v1" | "world-v3";

/** Requires a dev build AND an explicit devgame; never alters a normal match. */
export function landscapeVariantEnabled(search: string, dev: boolean, variant: LandscapeVariant): boolean {
  if (!dev) return false;
  const query = new URLSearchParams(search);
  if (!query.has("devgame")) return false;
  const selected = query.get("landscape-pilot");
  return selected === variant || (variant !== "world-v3" && (selected === "review-v2" || selected === "world-v3"));
}

export function coastPilotEnabled(search: string, dev: boolean): boolean {
  return landscapeVariantEnabled(search, dev, "coast-v1");
}

/** Regions may visually join only when both terrain cells are actually visible. */
export function terrainRegionLinked(terrain: string, neighbor: string, bothVisible: boolean, review: boolean): boolean {
  return review && bothVisible && terrain === neighbor && (terrain === "forest" || terrain === "mountain");
}

/** Seeded face fragments, kept away from a grass tile's resource corner. */
export function worldGroundFacets(x: number, y: number, plain: boolean, review: boolean): readonly (readonly [number, number])[] {
  if (!review || !plain) return [];
  const jitter = (((x * 17 + y * 29) % 5) - 2) * 0.018;
  return [[-0.22 + jitter, -0.2], [0.2, 0.02 - jitter]];
}

/** A soft, region-scale material step, never a new biome or fog hint. */
export function worldRegionTone(x: number, y: number, terrain: string, visible: boolean, review: boolean): number {
  if (!review || !visible || (terrain !== "grass" && terrain !== "forest")) return 0;
  const region = (Math.floor((x + 1) / 3) * 11 + Math.floor((y + 2) / 3) * 17) % 5;
  return region === 0 ? -0.07 : region === 3 ? 0.055 : 0;
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

/** Break up repetitive tall peaks without adding meshes or changing tile height. */
export function broadMountainSilhouette(seed: number, review: boolean): boolean {
  return review && seed % 3 !== 0;
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
