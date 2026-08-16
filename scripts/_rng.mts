// Deterministic Math.random for batch runs.
//
// newGame() seeds the map generator, so the BOARD is reproducible — but the AI
// is not. client/src/game/core/ai.ts makes nine Math.random() calls per turn
// deciding whether to build, wall, port and which unit to train, and those read
// the global generator. Two identical batch runs therefore disagree: measured
// on 16 games at a fixed seed, average match length came out 23.25, 23.50 and
// 25.25 on three runs of the same config.
//
// That is fatal for a sweep. Comparing two candidate constants means comparing
// two numbers whose difference is smaller than the noise between two runs of
// the SAME number, and the winner is then whichever config drew the luckier
// dice — the overfitting failure this project has already been bitten by once.
//
// Stubbing the generator with a seeded PRNG makes a batch run a pure function
// of its seeds. The distribution the AI sees is unchanged; only its
// reproducibility is. Call seedRandom(seed) immediately before each newGame so
// every match starts from a known state regardless of how much randomness the
// previous match consumed.
//
// Harness-only: nothing here is imported by the game.

/** mulberry32 — small, fast, and good enough for gameplay dice */
export function seedRandom(seed: number): void {
  let state = seed >>> 0 || 1;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
