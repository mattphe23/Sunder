import { idx, type GameState, type Unit } from "../core/types";
import { isVisibleTo } from "../core/rules";
import { AUREN_SWORDSMAN_ADVANCED_BETA } from "./betaAdvancedVisuals";
import { betaVisualCandidate } from "./betaVisualCandidate";

/**
 * This surface is intentionally narrower than the general beta roster. It is a
 * display-only accommodation for the one independently reported city overlap;
 * it must never become a generic city occupancy signal or model substitution.
 */
export const AUREN_SWORDSMAN_CITY_CLEARANCE_ASSET_ID =
  AUREN_SWORDSMAN_ADVANCED_BETA.candidate.assetId;
export const AUREN_SWORDSMAN_CITY_CLEARANCE_MODEL_URL =
  AUREN_SWORDSMAN_ADVANCED_BETA.candidate.modelUrl;

/** The only central ground volume reserved for the grounded actor's lower read. */
export const CITY_OCCUPANCY_CLEARANCE_CAPSULE_RADIUS = 0.23;
const CITY_OCCUPANCY_HORIZONTAL_SCALE = 0.78;
const CITY_OCCUPANCY_VERTICAL_SCALE = 0.62;
const CITY_OCCUPANCY_CLEARANCE_MARGIN = 0.028;
const CITY_OCCUPANCY_PERIMETER_LIMIT = 0.445;

export type CityVisualMetadata = Readonly<{
  visualBeta?: unknown;
  visualImportState?: unknown;
  visualAssetId?: unknown;
  visualModelUrl?: unknown;
}>;

/**
 * This is deliberately the same visibility admission used by BoardRenderer's
 * syncUnits(): an explored rival is still not drawable without live sight.
 */
export function isDrawableCityClearanceUnit(
  state: GameState,
  unit: Unit
): boolean {
  if (
    !Number.isInteger(unit.x) ||
    !Number.isInteger(unit.y) ||
    unit.x < 0 ||
    unit.y < 0 ||
    unit.x >= state.size ||
    unit.y >= state.size
  )
    return false;
  const tile = state.tiles[idx(unit.x, unit.y, state.size)];
  if (!tile || !tile.explored[state.humanTribe]) return false;
  if (
    !unit.guardian &&
    unit.tribe !== state.humanTribe &&
    !isVisibleTo(state, state.humanTribe, unit.x, unit.y)
  )
    return false;
  return true;
}

/**
 * Exact configured-candidate eligibility before the asynchronous attachment is
 * ready. It only permits allocation of a baseline city-owned group; it does
 * not transform any mesh or reveal the unit. `customOrSkinned` is renderer
 * supplied because active paid skins live outside GameState.
 */
export function isPotentialAurenSwordsmanCityClearanceUnit(
  state: GameState,
  unit: Unit,
  enabled: boolean,
  customOrSkinned = false
): boolean {
  if (!enabled || customOrSkinned || !isDrawableCityClearanceUnit(state, unit))
    return false;
  const tile = state.tiles[idx(unit.x, unit.y, state.size)];
  if (
    !tile ||
    tile.cityId === null ||
    !state.cities[tile.cityId] ||
    tile.terrain === "water" ||
    tile.terrain === "ocean"
  )
    return false;
  const tribe = state.tribes[unit.tribe];
  if (!tribe || tribe.defIndex !== 0 || tribe.customHeadgear) return false;

  // Use the production selection function, then lock this display exception to
  // both immutable candidate identity fields. A different Auren model is not a
  // reason to alter a city.
  const candidate = betaVisualCandidate(tribe.defIndex, unit, true, false);
  return (
    candidate?.assetId === AUREN_SWORDSMAN_CITY_CLEARANCE_ASSET_ID &&
    candidate.modelUrl === AUREN_SWORDSMAN_CITY_CLEARANCE_MODEL_URL &&
    unit.type === "swordsman" &&
    !unit.hero &&
    !unit.boat &&
    !unit.guardian &&
    !unit.raider
  );
}

/** Fresh potential cells are used solely to allocate bounded, baseline decor groups. */
export function potentialAurenSwordsmanCityClearanceCells(
  state: GameState,
  enabled: boolean,
  customOrSkinned: (unit: Unit) => boolean = () => false
): ReadonlySet<number> {
  const cells = new Set<number>();
  if (!enabled) return cells;
  for (const unit of state.units) {
    if (
      isPotentialAurenSwordsmanCityClearanceUnit(
        state,
        unit,
        true,
        customOrSkinned(unit)
      )
    )
      cells.add(idx(unit.x, unit.y, state.size));
  }
  return cells;
}

/** A city compacts only after the exact beta candidate has attached successfully. */
export function isReadyAurenSwordsmanCityClearanceUnit(
  state: GameState,
  unit: Unit,
  metadata: CityVisualMetadata | null | undefined,
  enabled: boolean,
  customOrSkinned = false
): boolean {
  return (
    isPotentialAurenSwordsmanCityClearanceUnit(
      state,
      unit,
      enabled,
      customOrSkinned
    ) &&
    metadata?.visualBeta === true &&
    metadata.visualImportState === "ready" &&
    metadata.visualAssetId === AUREN_SWORDSMAN_CITY_CLEARANCE_ASSET_ID &&
    metadata.visualModelUrl === AUREN_SWORDSMAN_CITY_CLEARANCE_MODEL_URL
  );
}

export type CityStructureBaseline = Readonly<{
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}>;

export type CityStructureTransformInput = Readonly<{
  baseline: CityStructureBaseline;
  cityX: number;
  cityTop: number;
  cityZ: number;
  tileX: number;
  tileY: number;
  /** Half-extent of the individual structure, measured before this transform. */
  footprintRadius: number;
  /** Paving, ownership kerbs, and court trim are never compacted or displaced. */
  preservePlatform: boolean;
  active: boolean;
}>;

/**
 * Pure transform policy for separately-owned city structure meshes. It leaves
 * platforms exactly untouched. Active structures are individually shortened
 * and pushed no closer than the actor-clearance capsule; no terrain/decor
 * batch, unit node, owner marker, or camera transform is ever involved.
 */
export function cityOccupiedStructureTransform(
  input: CityStructureTransformInput
): CityStructureBaseline {
  const baseline = input.baseline;
  if (!input.active || input.preservePlatform) return { ...baseline };

  const dx = baseline.x - input.cityX;
  const dz = baseline.z - input.cityZ;
  const distance = Math.hypot(dx, dz);
  // Center-stacked roof/body/spire parts share one deterministic direction so
  // they remain a recognizable peripheral building rather than separating.
  const centerAngle =
    ((((input.tileX * 17 + input.tileY * 31) % 8) + 8) % 8) * (Math.PI / 4) +
    Math.PI / 8;
  const ux = distance > 0.0001 ? dx / distance : Math.cos(centerAngle);
  const uz = distance > 0.0001 ? dz / distance : Math.sin(centerAngle);
  const compactFootprint =
    Math.max(0.025, input.footprintRadius) * CITY_OCCUPANCY_HORIZONTAL_SCALE;
  const requiredRadius =
    CITY_OCCUPANCY_CLEARANCE_CAPSULE_RADIUS +
    compactFootprint +
    CITY_OCCUPANCY_CLEARANCE_MARGIN;
  const targetRadius = Math.min(
    CITY_OCCUPANCY_PERIMETER_LIMIT,
    Math.max(distance, requiredRadius)
  );

  return {
    x: input.cityX + ux * targetRadius,
    // Scaling around the tile top preserves grounded bases instead of floating
    // the architecture upward while making the lower body/weapon envelope read.
    y:
      input.cityTop +
      (baseline.y - input.cityTop) * CITY_OCCUPANCY_VERTICAL_SCALE,
    z: input.cityZ + uz * targetRadius,
    scaleX: baseline.scaleX * CITY_OCCUPANCY_HORIZONTAL_SCALE,
    scaleY: baseline.scaleY * CITY_OCCUPANCY_VERTICAL_SCALE,
    scaleZ: baseline.scaleZ * CITY_OCCUPANCY_HORIZONTAL_SCALE,
  };
}
