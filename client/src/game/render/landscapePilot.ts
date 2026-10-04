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

/** Cap and surface span one world unit in the visible study; hidden/default caps retain their authored gap. */
export function worldSurfaceSpan(original: number, visible: boolean, review: boolean): number {
  return visible && review ? 1 : original;
}

/** Coordinate and game-seed hash. Unlike small modular cycles, adjacent cells have unrelated silhouettes. */
function mistHash(x: number, y: number, seed: number, channel: number): number {
  let h = Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b) ^
    Math.imul(seed | 0, 0xc2b2ae35) ^ Math.imul(channel + 1, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type AshMistPuff = { x: number; z: number; radius: number; lift: number; stretchX: number; stretchZ: number; angle: number };

/** Close to revealed land retain cover; deep inside the opaque fog slab, use sparse broad banks. */
export function ashMistPuffs(x: number, y: number, seed: number, deepFog = false): AshMistPuff[] {
  const density = mistHash(x, y, seed, 0);
  if (deepFog && density < 0.43) return [];
  const count = deepFog ? (density > 0.83 ? 2 : 1) : 2 + Math.floor(density * 3);
  return Array.from({ length: count }, (_, i) => {
    const angle = mistHash(x, y, seed, i * 7 + 1) * Math.PI * 2;
    const distance = 0.025 + mistHash(x, y, seed, i * 7 + 2) * (deepFog ? 0.16 : 0.085);
    return {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      radius: deepFog ? (i === 0 ? 0.53 + mistHash(x, y, seed, 3) * 0.19 : 0.28 + mistHash(x, y, seed, 10) * 0.14)
        : i === 0 ? 0.37 + mistHash(x, y, seed, 3) * 0.07
        : 0.23 + mistHash(x, y, seed, i * 7 + 3) * 0.09,
      lift: -0.025 + mistHash(x, y, seed, i * 7 + 4) * 0.09,
      stretchX: 0.84 + mistHash(x, y, seed, i * 7 + 5) * 0.29,
      stretchZ: 0.84 + mistHash(x, y, seed, i * 7 + 6) * 0.29,
      angle,
    };
  });
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
