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
    mountain: { top: "#8f98aa", side: "#5b6477" }, // slate rock plate — cool grey-blue so peaks read as peaks, not a third green (colorblind-safe vs grass/forest)
    water: { top: "#3fa0e8", side: "#2b6fb0" }, // shallow / coastal
    ocean: { top: "#2458b8", side: "#193f8a" }, // deep
  } as Record<string, TerrainSwatch>,

  // pale band ringing land where it meets water — the Polytopia "coast" read
  shore: "#8fd8f2",

  // decor accents (flat, hand-picked; no lighting will touch these)
  tree: { trunk: "#6d4a2f", canopyA: "#2f8a3d", canopyB: "#256e31", canopyLight: "#3da34c" },
  rock: { body: "#7b8497", shadow: "#5e6779", snow: "#ecf1fa" },
  fruit: { bush: "#3f9e46", berry: "#ff5a3c" },
  animal: { body: "#a5713d", head: "#b8834e", ear: "#8a5c30" },
  crystal: { body: "#7fd4ef", glow: "#2c86ac" },
  ruin: { stone: "#8f93b8", stoneDark: "#767a9e", glow: "#ffd76a", glowEmissive: "#c79a34" },
  // `neutral` is the plaza and owner stand-in for an unclaimed village; `thatch`
  // is its accent. Villages used to draw every part from `neutral`, so cream
  // huts got beige roofs on a beige plaza inside beige trim and the settlement
  // read as one flat tan square. The accent has to leave the sand family.
  city: { house: "#efe9db", houseSide: "#cfc7b4", neutral: "#c9b896", thatch: "#8a5f38", spire: "#ffd76a", wall: "#a8a5b8" },
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
  /** exposed earth in the cliff cross-section under the turf band */
  soil: string;
  /** tree silhouette family — geometry, not just color */
  treeKind: "conifer" | "palm" | "acacia" | "pine";
  /** mountain silhouette family */
  rockKind: "classic" | "mesa" | "crag";
}

export const BIOMES: Record<string, BiomePalette> = {
  // temperate — the classic Sunder look (unchanged)
  continents: {
    terrain: {
      grass: { top: "#84c95e", side: "#47823a" },
      forest: { top: "#4a9e4e", side: "#2c6b34" },
      mountain: { top: "#79b055", side: "#47823a" },
      water: { top: "#3fa0e8", side: "#2b6fb0" },
      ocean: { top: "#2458b8", side: "#193f8a" },
    },
    shore: "#8fd8f2",
    sand: "#d9c58f",
    tree: { trunk: "#6d4a2f", canopyA: "#2f8a3d", canopyB: "#256e31", canopyLight: "#3da34c" },
    rock: { body: "#7b8497", shadow: "#5e6779", snow: "#ecf1fa" },
    fogWash: "#262650",
    cloud: "#c8cbe6",
    cloudShade: "#8f95c0",
    soil: "#6b5236",
    treeKind: "conifer",
    rockKind: "classic",
  },
  // tropics — turquoise shallows, azure deeps, white-gold beaches, vivid canopy
  archipelago: {
    terrain: {
      grass: { top: "#8fd463", side: "#4a8a3c" },
      forest: { top: "#3f8a43", side: "#296a33" }, // deepened value step — clear grass/forest separation for deutan/protan players
      mountain: { top: "#9aa393", side: "#5f6a5e" }, // olive slate — matches the biome's rock family, off the green ramp
      water: { top: "#3fbce0", side: "#2b84a8" },
      ocean: { top: "#1f60c0", side: "#164694" },
    },
    shore: "#b2eef5",
    sand: "#eeda9e",
    tree: { trunk: "#7a5a38", canopyA: "#3aa04c", canopyB: "#2c8440", canopyLight: "#52bc60" },
    rock: { body: "#98a08e", shadow: "#7c8474", snow: "#f4eed8" },
    fogWash: "#24304e",
    cloud: "#cdd6ea",
    cloudShade: "#94a0ca",
    soil: "#7d6242",
    treeKind: "palm",
    rockKind: "mesa",
  },
  // alpine — sage meadows, dark pines, glacial water, bright snow on cold slate
  highlands: {
    terrain: {
      grass: { top: "#79a86e", side: "#41663c" },
      forest: { top: "#3f8a4c", side: "#265939" },
      mountain: { top: "#8e9bad", side: "#4e5d6b" }, // already slate — the correct alpine rock (unchanged)
      water: { top: "#52a4d8", side: "#3a72a4" },
      ocean: { top: "#1e4aa0", side: "#153678" },
    },
    shore: "#bce6f4",
    sand: "#b5b0a2",
    tree: { trunk: "#59412f", canopyA: "#226b3a", canopyB: "#1a5430", canopyLight: "#2f7f46" },
    rock: { body: "#8d99ab", shadow: "#6c7789", snow: "#f4f8ff" },
    fogWash: "#232a52",
    cloud: "#d5dcee",
    cloudShade: "#9aa5cc",
    soil: "#5c5145",
    treeKind: "pine",
    rockKind: "crag",
  },
  // savanna — olive-gold plains, acacia greens, ochre rock, sun-bleached caps
  pangaea: {
    terrain: {
      grass: { top: "#aebf5e", side: "#647436" },
      forest: { top: "#6b9a44", side: "#40632c" },
      mountain: { top: "#a89b82", side: "#5f5746" }, // ochre slate — savanna rock, off the green ramp
      water: { top: "#3f9cd4", side: "#2b6ca2" },
      ocean: { top: "#2254a8", side: "#183c7e" },
    },
    shore: "#a5e2e5",
    sand: "#e5c98e",
    tree: { trunk: "#7a5636", canopyA: "#5c8a38", canopyB: "#48702c", canopyLight: "#71a044" },
    rock: { body: "#a89681", shadow: "#837360", snow: "#ecdfc0" },
    fogWash: "#292648",
    cloud: "#d2ccdf",
    cloudShade: "#9990b8",
    soil: "#7a5c34",
    treeKind: "acacia",
    rockKind: "mesa",
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

/**
 * Mix a colour toward white. Used to derive a forged tribe's costume accent
 * from the banner colour it already chose, so a custom tribe reads as its own
 * thing instead of borrowing someone else's trim.
 */
export function lighten(hex: string, amount = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** darken a hex color by a fixed ratio (for auto-derived side walls) */
export function darken(hex: string, ratio = SIDE_DARKEN): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * ratio);
  const g = Math.round(((n >> 8) & 255) * ratio);
  const b = Math.round((n & 255) * ratio);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
