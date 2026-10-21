import { idx, type GameState } from "../core/types";
import { isVisibleTo } from "../core/rules";

/**
 * A local transform for authored landscape decor. Offsets are tile-relative
 * world coordinates; scale is uniform and deliberately renderer-agnostic.
 */
export type UnitLaneTransform = Readonly<{
  x: number;
  z: number;
  scale: number;
}>;

/** A tree keeps its authored loop index so existing biome/seed choices survive. */
export type UnitLaneTreePlacement = UnitLaneTransform & Readonly<{
  index: number;
}>;

const IDENTITY_TRANSFORM: UnitLaneTransform = Object.freeze({ x: 0, z: 0, scale: 1 });

/**
 * Small coordinate hash used only to make visual lane transforms stable. It is
 * intentionally independent of mutable game state: the same board coordinate
 * always gets the same clearance layout.
 */
function laneHash(x: number, y: number, channel: number): number {
  let h = Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b) ^
    Math.imul(channel + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The existing forest loop's exact authored local positions. */
function authoredForestOffset(index: number): Pick<UnitLaneTransform, "x" | "z"> {
  return {
    x: index === 3 ? 0.08 : (index - 1) * 0.26,
    z: index === 3 ? -0.32 : ((index * 7) % 3 - 1) * 0.24,
  };
}

/**
 * Returns only land cells holding units that syncUnits() is allowed to draw.
 *
 * A neutral guardian is a discovered landmark and therefore needs exploration
 * only; ordinary rivals need both exploration and current human sight. This
 * mirrors syncUnits() exactly and deliberately excludes water/ocean cells,
 * whose embarked units need no vegetation or mountain clearance.
 */
export function visibleUnitLaneCells(s: GameState, review: boolean): ReadonlySet<number> {
  const lanes = new Set<number>();
  if (!review) return lanes;

  const human = s.humanTribe;
  for (const unit of s.units) {
    if (unit.x < 0 || unit.y < 0 || unit.x >= s.size || unit.y >= s.size) continue;
    const cell = idx(unit.x, unit.y, s.size);
    const tile = s.tiles[cell];
    if (!tile || !tile.explored[human]) continue;
    // Keep this condition aligned with syncUnits(): guardians persist once
    // explored, while every non-human non-guardian needs live visibility.
    if (!unit.guardian && unit.tribe !== human && !isVisibleTo(s, human, unit.x, unit.y)) continue;
    if (tile.terrain === "water" || tile.terrain === "ocean") continue;
    lanes.add(cell);
  }
  return lanes;
}

/**
 * The per-cell static-board fingerprint. It obtains a fresh visible lane set
 * from current state so a cached/stale set containing a fogged enemy can never
 * affect geometry. Empty outside the explicit review path.
 */
export function unitLaneCellSignature(s: GameState, cell: number, review: boolean): string {
  if (!review || cell < 0 || cell >= s.tiles.length) return "";
  return visibleUnitLaneCells(s, true).has(cell) ? "unit-lane" : "";
}

/**
 * Tree positions for a forest tile. Outside a visible occupied review cell it
 * reproduces every authored loop index, count, position, and scale exactly.
 * A cleared occupied cell instead retains two smaller biome-native trees at
 * opposite outer corners, leaving the character's centre lane readable.
 */
export function forestUnitLanePlacements(
  x: number,
  y: number,
  authoredCount: number,
  occupied: boolean,
  review: boolean,
): readonly UnitLaneTreePlacement[] {
  if (!review || !occupied) {
    return Array.from({ length: Math.max(0, Math.floor(authoredCount)) }, (_, index) => ({
      index,
      ...authoredForestOffset(index),
      scale: 1,
    }));
  }

  const xDirection = laneHash(x, y, 0) < 0.5 ? -1 : 1;
  const zDirection = laneHash(x, y, 1) < 0.5 ? -1 : 1;
  const xOuter = 0.255 + laneHash(x, y, 2) * 0.035;
  const zOuter = 0.255 + laneHash(x, y, 3) * 0.035;
  return [
    {
      index: 0,
      x: -xDirection * xOuter,
      z: -zDirection * zOuter,
      scale: 0.70 + laneHash(x, y, 4) * 0.05,
    },
    {
      index: 1,
      x: xDirection * xOuter,
      z: zDirection * zOuter,
      scale: 0.70 + laneHash(x, y, 5) * 0.05,
    },
  ];
}

/**
 * Shrinks and nudges a mountain only for a visible occupied review cell. The
 * returned transform is deterministic, has a modest 0.16–0.20 offset on both
 * horizontal axes, and never lets an occupied mountain exceed 0.70 scale.
 */
export function mountainUnitLaneTransform(
  x: number,
  y: number,
  occupied: boolean,
  review: boolean,
): UnitLaneTransform {
  if (!review || !occupied) return IDENTITY_TRANSFORM;

  const xDirection = laneHash(x, y, 6) < 0.5 ? -1 : 1;
  const zDirection = laneHash(x, y, 7) < 0.5 ? -1 : 1;
  return {
    x: xDirection * (0.16 + laneHash(x, y, 8) * 0.04),
    z: zDirection * (0.16 + laneHash(x, y, 9) * 0.04),
    scale: 0.63 + laneHash(x, y, 10) * 0.07,
  };
}
