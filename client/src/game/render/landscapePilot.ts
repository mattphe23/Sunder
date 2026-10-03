/**
 * A visual-only coastline experiment. It cannot activate in ordinary gameplay
 * or a production build, and it never changes Tile terrain or movement rules.
 */
export function coastPilotEnabled(search: string, dev: boolean): boolean {
  if (!dev) return false;
  const query = new URLSearchParams(search);
  return query.has("devgame") && query.get("landscape-pilot") === "coast-v1";
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
