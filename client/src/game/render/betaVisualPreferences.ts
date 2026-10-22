import { useSyncExternalStore } from "react";

export interface BetaVisualPreferences {
  newVisuals: boolean;
  landscape: boolean;
}

export const BETA_VISUAL_PREFERENCE_KEY = "sunder-beta-visuals-v1";
export const DEFAULT_BETA_VISUALS: Readonly<BetaVisualPreferences> =
  Object.freeze({ newVisuals: false, landscape: false });

/** Display preferences are independent of game saves, purchases and review URLs. */
export function parseBetaVisualPreferences(
  raw: string | null
): Readonly<BetaVisualPreferences> {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (!value || value.version !== 1) return DEFAULT_BETA_VISUALS;
    return {
      newVisuals: value.newVisuals === true,
      landscape: value.landscape === true,
    };
  } catch {
    return DEFAULT_BETA_VISUALS;
  }
}

let current: Readonly<BetaVisualPreferences> | undefined;
const listeners = new Set<() => void>();

export function getBetaVisualPreferences(): Readonly<BetaVisualPreferences> {
  if (current) return current;
  try {
    current = parseBetaVisualPreferences(
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(BETA_VISUAL_PREFERENCE_KEY)
    );
  } catch {
    current = DEFAULT_BETA_VISUALS;
  }
  return current;
}

function notify() {
  for (const listener of Array.from(listeners)) listener();
}

export function setBetaVisualPreferences(
  patch: Partial<BetaVisualPreferences>
) {
  const previous = getBetaVisualPreferences();
  current = {
    newVisuals: patch.newVisuals ?? previous.newVisuals,
    landscape: patch.landscape ?? previous.landscape,
  };
  try {
    window.localStorage.setItem(
      BETA_VISUAL_PREFERENCE_KEY,
      JSON.stringify({ version: 1, ...current })
    );
  } catch {
    // Storage may be restricted; the current session can still switch back safely.
  }
  notify();
}

function onStorage(event: StorageEvent) {
  if (event.key !== BETA_VISUAL_PREFERENCE_KEY && event.key !== null) return;
  current = parseBetaVisualPreferences(
    event.key === null ? null : event.newValue
  );
  notify();
}

export function subscribeBetaVisualPreferences(
  listener: () => void
): () => void {
  if (listeners.size === 0 && typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined")
      window.removeEventListener("storage", onStorage);
  };
}

export function useBetaVisualPreferences() {
  return useSyncExternalStore(
    subscribeBetaVisualPreferences,
    getBetaVisualPreferences,
    () => DEFAULT_BETA_VISUALS
  );
}
