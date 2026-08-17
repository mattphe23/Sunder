// Who currently owns the screen.
//
// This exists because of a bug that only showed up on screenshots: the
// match-ending fatality — the single most important one, the blow that wins the
// game — was being played underneath the victory screen. `GameOver` renders as
// a sibling of the canvas the instant `phase` flips to "gameover", and the
// engine flips it before the cinematic has drawn a frame. The most
// screenshot-worthy moment in the game was buried by a modal every time.
//
// Deferring the phase change in the engine would have been the wrong fix: the
// match really IS over at that point, and making game state wait on an
// animation is how a skipped animation turns into a stuck game. So the state
// change stands and the *presentation* yields instead — anything that would
// cover the board asks here first.
//
// Module-level rather than context because the two components are siblings with
// no shared owner, and following the same singleton shape as sound.ts.
import { useSyncExternalStore } from "react";
import type { FatalitySpec } from "../core/fatality";

let active: FatalitySpec | null = null;
const listeners = new Set<() => void>();

export const cinema = {
  get current(): FatalitySpec | null {
    return active;
  },
  /** null clears it; called from the cinematic's own completion callback */
  set(spec: FatalitySpec | null) {
    if (active === spec) return;
    active = spec;
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

const snapshot = () => active;

/** Non-null while a cinematic is on screen. Anything that would cover the board
 *  should hold off until this is null. */
export function useCinema(): FatalitySpec | null {
  return useSyncExternalStore(cinema.subscribe, snapshot, snapshot);
}
