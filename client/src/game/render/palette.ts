// Sunder flat-shading palette — Stage 1 of the Polytopia-level graphics plan.
//
// Every terrain gets 2-3 HAND-PICKED value steps (top / side / accent) instead
// of letting Babylon's lights compute gradients. Depth comes from these value
// steps: tile tops are the brightest, slab side walls a fixed darker step,
// decor uses its own picked accents. Materials built from this palette are
// UNLIT (emissive-only), so the board reads as a flat painted quilt.
//
// Mood: Sunder keeps its darker forge-fantasy identity — richer, moodier hues
// than Polytopia's pastel toys, but the same flat clarity.

export interface TerrainSwatch {
  top: string; // tile top face
  side: string; // slab side walls (fixed darker step, does the "depth" work)
}

export const PALETTE = {
  terrain: {
    // v33 unification: one tight ramp per hue family, tuned against the
    // indigo void (#141433). Grass slightly desaturated from neon lime;
    // mountain top pulled toward mossy slate so peaks (not plates) read gray.
    grass: { top: "#84c95e", side: "#47823a" },
    forest: { top: "#4a9e4e", side: "#2c6b34" }, // forest floor under trees
    mountain: { top: "#9aad8f", side: "#47823a" }, // mossy slate top, land-family side
    water: { top: "#3fa0e8", side: "#2b6fb0" }, // shallow / coastal
    ocean: { top: "#2458b8", side: "#193f8a" }, // deep
  } as Record<string, TerrainSwatch>,

  // pale band ringing land where it meets water — the Polytopia "coast" read
  shore: "#8fd8f2",

  // decor accents (flat, hand-picked; no lighting will touch these)
  tree: { trunk: "#6d4a2f", canopyA: "#2f8a3d", canopyB: "#256e31", canopyLight: "#3da34c" },
  rock: { body: "#8b98ac", shadow: "#71809a", snow: "#f6f9ff" },
  fruit: { bush: "#3f9e46", berry: "#ff5a3c" },
  animal: { body: "#a5713d", head: "#b8834e", ear: "#8a5c30" },
  crystal: { body: "#7fd4ef", glow: "#2c86ac" },
  ruin: { stone: "#8f93b8", stoneDark: "#767a9e", glow: "#ffd76a", glowEmissive: "#c79a34" },
  city: { house: "#efe9db", houseSide: "#cfc7b4", neutral: "#c9b896", spire: "#ffd76a", wall: "#a8a5b8" },
  port: { pier: "#a97c50", sail: "#f2ead8" },
  // v33: fog bank darkened toward the void so the island silhouette pops
  fog: { cloud: "#191940", mist: "#232350" },
  unit: { skin: "#f5e6cf", wood: "#8a6a42", steel: "#c9cbd8", bone: "#e6e0d2", dark: "#3a3450" },
} as const;

/* ---------- biome palettes (per map preset) ----------
 * Polytopia's boards read differently per tribe homeland; Sunder's read
 * differently per MAP PRESET. Each biome swaps the terrain ramp, coast
 * colors, tree/rock accents, and the fog wash — same geometry, new skin.
 * `continents` is byte-for-byte the classic Isoglow palette above.
 */
export interface BiomePalette {
  terrain: Record<string, TerrainSwatch>;
  shore: string; //  pale rim where land meets water
  sand: string; //   beach strip on the cliff face under the waterline
  tree: { trunk: string; canopyA: string; canopyB: string; canopyLight: string };
  rock: { body: string; shadow: string; snow: string };
  fogWash: string; // fog-of-war desaturation wash target
  cloud: string; //   unexplored cloud-bank puffs
  cloudShade: string; // cloud underside / pick slab
}

export const BIOMES: Record<string, BiomePalette> = {
  // temperate — the classic Sunder look (unchanged)
  continents: {
    terrain: {
      grass: { top: "#84c95e", side: "#47823a" },
      forest: { top: "#4a9e4e", side: "#2c6b34" },
      mountain: { top: "#9aad8f", side: "#47823a" },
      water: { top: "#3fa0e8", side: "#2b6fb0" },
      ocean: { top: "#2458b8", side: "#193f8a" },
    },
    shore: "#8fd8f2",
    sand: "#d9c58f",
    tree: { trunk: "#6d4a2f", canopyA: "#2f8a3d", canopyB: "#256e31", canopyLight: "#3da34c" },
    rock: { body: "#8b98ac", shadow: "#71809a", snow: "#f6f9ff" },
    fogWash: "#262650",
    cloud: "#6f74a4",
    cloudShade: "#4e5384",
  },
  // tropics — turquoise shallows, azure deeps, white-gold beaches, vivid canopy
  archipelago: {
    terrain: {
      grass: { top: "#8fd463", side: "#4a8a3c" },
      forest: { top: "#4fae55", side: "#2f7a3c" },
      mountain: { top: "#a1a98c", side: "#4a8a3c" },
      water: { top: "#3fbce0", side: "#2b84a8" },
      ocean: { top: "#1f60c0", side: "#164694" },
    },
    shore: "#b2eef5",
    sand: "#eeda9e",
    tree: { trunk: "#7a5a38", canopyA: "#3aa04c", canopyB: "#2c8440", canopyLight: "#52bc60" },
    rock: { body: "#98a08e", shadow: "#7c8474", snow: "#f4eed8" },
    fogWash: "#24304e",
    cloud: "#7881b2",
    cloudShade: "#565e92",
  },
  // alpine — sage meadows, dark pines, glacial water, bright snow on cold slate
  highlands: {
    terrain: {
      grass: { top: "#79a86e", side: "#41663c" },
      forest: { top: "#3f8a4c", side: "#265939" },
      mountain: { top: "#a7b2c0", side: "#5a6b78" },
      water: { top: "#52a4d8", side: "#3a72a4" },
      ocean: { top: "#1e4aa0", side: "#153678" },
    },
    shore: "#bce6f4",
    sand: "#b5b0a2",
    tree: { trunk: "#59412f", canopyA: "#226b3a", canopyB: "#1a5430", canopyLight: "#2f7f46" },
    rock: { body: "#a2adbd", shadow: "#7e8898", snow: "#ffffff" },
    fogWash: "#232a52",
    cloud: "#7d88b8",
    cloudShade: "#5a6494",
  },
  // savanna — olive-gold plains, acacia greens, ochre rock, sun-bleached caps
  pangaea: {
    terrain: {
      grass: { top: "#aebf5e", side: "#647436" },
      forest: { top: "#6b9a44", side: "#40632c" },
      mountain: { top: "#b2a288", side: "#647436" },
      water: { top: "#3f9cd4", side: "#2b6ca2" },
      ocean: { top: "#2254a8", side: "#183c7e" },
    },
    shore: "#a5e2e5",
    sand: "#e5c98e",
    tree: { trunk: "#7a5636", canopyA: "#5c8a38", canopyB: "#48702c", canopyLight: "#71a044" },
    rock: { body: "#a89681", shadow: "#837360", snow: "#ecdfc0" },
    fogWash: "#292648",
    cloud: "#77709f",
    cloudShade: "#544e7e",
  },
};

/** resolve a biome palette from a map preset id (curated/legacy strings fall
 *  back to the classic continents palette) */
export function biomeFor(preset?: string | null): BiomePalette {
  return (preset && BIOMES[preset]) || BIOMES.continents;
}

/** slab side darkening ratio (multiplied onto the top color when a side
 *  swatch is not hand-picked) — one fixed step, applied everywhere */
export const SIDE_DARKEN = 0.62;

/** darken a hex color by a fixed ratio (for auto-derived side walls) */
export function darken(hex: string, ratio = SIDE_DARKEN): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * ratio);
  const g = Math.round(((n >> 8) & 255) * ratio);
  const b = Math.round((n & 255) * ratio);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
