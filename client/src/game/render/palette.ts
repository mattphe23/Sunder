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
