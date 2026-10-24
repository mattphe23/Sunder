import { seedRandom } from "../_rng.mts";

/**
 * Shared, harness-only helpers for the paired balance audit.
 *
 * Nothing in this module is imported by game code. The runtime patch deliberately
 * stays small and reversible: it supplies a deterministic Math.random(), a
 * trampoline timer queue for the GameStore's own scheduled AI callbacks, and
 * in-memory storage for the existing local-save calls.
 */

export const ROTATIONS_PER_ROSTER = 4;

export interface RosterFamily {
  id: string;
  /** Definition indices in their canonical/original roster order. */
  originalRoster: number[];
}

export interface PairedScenario {
  id: string;
  seedBlock: number;
  worldSeed: number;
  randomSeed: number;
  preset: string;
  rosterId: string;
  rosterOriginalIndices: number[];
  /** Definitions assigned to the engine's nominal slots for this run. */
  rosterRemappedIndices: number[];
  /** Cyclic remap of the original roster into nominal engine slots. */
  rotation: number;
}

export interface ScenarioMatrixOptions {
  seedBase: number;
  blocks: number;
  presets: readonly string[];
  rosterFamilies: readonly RosterFamily[];
}

/**
 * Split every currently selectable tribe into canonical, four-tribe rosters.
 * A non-multiple of four is rejected rather than silently dropping a tribe.
 */
export function balancedFourTribeFamilies(
  definitionCount: number
): RosterFamily[] {
  if (!Number.isInteger(definitionCount) || definitionCount < 4) {
    throw new Error(
      `Expected at least four tribe definitions; received ${definitionCount}.`
    );
  }
  if (definitionCount % ROTATIONS_PER_ROSTER !== 0) {
    throw new Error(
      `Cannot make balanced four-tribe rosters from ${definitionCount} definitions; refusing to omit a tribe.`
    );
  }
  const families: RosterFamily[] = [];
  for (let start = 0; start < definitionCount; start += ROTATIONS_PER_ROSTER) {
    families.push({
      id: `roster-${String(families.length + 1).padStart(2, "0")}`,
      originalRoster: Array.from(
        { length: ROTATIONS_PER_ROSTER },
        (_, offset) => start + offset
      ),
    });
  }
  return families;
}

/** Place each original definition in a different nominal slot on every rotation. */
export function remapRoster(
  originalRoster: readonly number[],
  rotation: number
): number[] {
  if (originalRoster.length !== ROTATIONS_PER_ROSTER) {
    throw new Error(
      `Expected exactly ${ROTATIONS_PER_ROSTER} roster entries; received ${originalRoster.length}.`
    );
  }
  if (
    !Number.isInteger(rotation) ||
    rotation < 0 ||
    rotation >= originalRoster.length
  ) {
    throw new Error(
      `rotation must be in [0, ${originalRoster.length - 1}]; received ${rotation}.`
    );
  }
  if (new Set(originalRoster).size !== originalRoster.length) {
    throw new Error("Roster definitions must be unique for seat rotation.");
  }
  return originalRoster.map(
    (_, seatIndex) =>
      originalRoster[(seatIndex + rotation) % originalRoster.length]
  );
}

/**
 * Build paired scenarios. Within one {seed, preset, canonical roster} group,
 * the four rows have identical fresh-world/random seeds and differ only in the
 * declared cyclic assignment of roster identities to nominal seats.
 */
export function buildPairedScenarioMatrix(
  options: ScenarioMatrixOptions
): PairedScenario[] {
  const { seedBase, blocks, presets, rosterFamilies } = options;
  if (!Number.isSafeInteger(seedBase) || seedBase < 0) {
    throw new Error(
      `seedBase must be a non-negative safe integer; received ${seedBase}.`
    );
  }
  if (!Number.isInteger(blocks) || blocks < 1) {
    throw new Error(`blocks must be a positive integer; received ${blocks}.`);
  }
  if (presets.length === 0)
    throw new Error("At least one map preset is required.");
  if (rosterFamilies.length === 0)
    throw new Error("At least one roster family is required.");

  const ids = new Set<string>();
  const scenarios: PairedScenario[] = [];
  for (let seedBlock = 0; seedBlock < blocks; seedBlock += 1) {
    const worldSeed = seedBase + seedBlock;
    for (const preset of presets) {
      for (const family of rosterFamilies) {
        if (family.originalRoster.length !== ROTATIONS_PER_ROSTER) {
          throw new Error(
            `${family.id} does not contain four tribe definitions.`
          );
        }
        for (let rotation = 0; rotation < ROTATIONS_PER_ROSTER; rotation += 1) {
          const id = [
            `pair-b${String(seedBlock + 1).padStart(2, "0")}`,
            `seed${worldSeed}`,
            preset,
            family.id,
            `r${rotation}`,
          ].join("-");
          if (ids.has(id))
            throw new Error(`Duplicate paired scenario id: ${id}`);
          ids.add(id);
          scenarios.push({
            id,
            seedBlock,
            worldSeed,
            randomSeed: worldSeed,
            preset,
            rosterId: family.id,
            rosterOriginalIndices: [...family.originalRoster],
            rosterRemappedIndices: remapRoster(family.originalRoster, rotation),
            rotation,
          });
        }
      }
    }
  }
  return scenarios;
}

type GlobalRecord = Record<string, unknown>;

interface SavedGlobal {
  hadOwnProperty: boolean;
  value: unknown;
}

function saveGlobal(target: GlobalRecord, name: string): SavedGlobal {
  return {
    hadOwnProperty: Object.prototype.hasOwnProperty.call(target, name),
    value: target[name],
  };
}

function restoreGlobal(
  target: GlobalRecord,
  name: string,
  saved: SavedGlobal
): void {
  if (saved.hadOwnProperty) target[name] = saved.value;
  else delete target[name];
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
  };
}

export interface HeadlessRuntime {
  readonly pending: Array<() => void>;
  readonly storage: Storage;
  setRandomSeed(seed: number): void;
  clear(): void;
  restore(): void;
}

/**
 * Install process-local shims for one audit process. Call restore() in finally.
 * Timers are not executed automatically: the caller drains pending callbacks
 * iteratively, so the GameStore itself still owns AI turn scheduling.
 */
export function installScopedHeadlessRuntime(): HeadlessRuntime {
  const target = globalThis as unknown as GlobalRecord;
  const savedSetTimeout = saveGlobal(target, "setTimeout");
  const savedWindow = saveGlobal(target, "window");
  const savedLocalStorage = saveGlobal(target, "localStorage");
  const originalRandom = Math.random;
  const pending: Array<() => void> = [];
  const storage = memoryStorage();
  let restored = false;

  target.window = undefined;
  target.localStorage = storage;
  target.setTimeout = ((
    callback: TimerHandler,
    _delay?: number,
    ...args: unknown[]
  ) => {
    if (typeof callback !== "function") {
      throw new Error(
        "The paired audit only supports function timer callbacks."
      );
    }
    pending.push(() => callback(...args));
    return pending.length as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout;

  return {
    pending,
    storage,
    setRandomSeed(seed: number) {
      if (!Number.isSafeInteger(seed) || seed < 0) {
        throw new Error(
          `random seed must be a non-negative safe integer; received ${seed}.`
        );
      }
      seedRandom(seed);
    },
    clear() {
      pending.length = 0;
      storage.clear();
    },
    restore() {
      if (restored) return;
      restored = true;
      pending.length = 0;
      Math.random = originalRandom;
      restoreGlobal(target, "setTimeout", savedSetTimeout);
      restoreGlobal(target, "window", savedWindow);
      restoreGlobal(target, "localStorage", savedLocalStorage);
    },
  };
}
