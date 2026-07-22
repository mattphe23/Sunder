// React binding for the Polyforge game store.
import { useSyncExternalStore, useCallback } from "react";
import { game } from "./core/state";

export function useGame() {
  const subscribe = useCallback((cb: () => void) => game.subscribe(() => cb()), []);
  useSyncExternalStore(subscribe, game.getVersion, game.getVersion);
  return game;
}

