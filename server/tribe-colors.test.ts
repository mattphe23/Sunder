// Tribe banner colours must stay separable — including for players with
// colour-vision deficiency.
//
// On the board, `buildCharacter` tints a unit by nothing but its tribe colour.
// Ownership is therefore carried by colour alone, which makes CVD a
// playability question rather than a polish one: two tribes that collapse to
// the same swatch are two armies a player cannot tell apart mid-fight.
//
// This exists because the mistake is easy and invisible. A review pass once
// proposed nudging two colours "for colourblindness", measured the pairs in RGB
// distance, and shipped a set that was measurably WORSE: it made protanopia
// worse on the pair it meant to fix, and moved one tribe to ΔE 10.4 from
// another in NORMAL vision — near-identical for everyone, to help no one. RGB
// distance is the trap. It reports Kharzul/Dravok as ~45 apart while a
// deuteranope sees ΔE 4.9.
//
// So: simulate the dichromacies, measure in Lab, and assert a floor.
import { describe, it, expect } from "vitest";
import { TRIBE_DEFS } from "../client/src/game/core/types";

type RGB = [number, number, number];

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const toLinear = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const fromLinear = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const mul = (m: number[][], v: number[]) => [0, 1, 2].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2]);

// Viénot-style LMS pipeline; the standard way to simulate dichromacy.
const RGB2LMS = [[0.31399, 0.63951, 0.04649], [0.15537, 0.75789, 0.08670], [0.01775, 0.10944, 0.87247]];
const LMS2RGB = [[5.47221, -4.6419, 0.16963], [-1.1252, 2.29317, -0.1679], [0.02980, -0.19318, 1.16364]];
const SIM: Record<string, number[][]> = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protanopia: [[0, 1.05118294, -0.05116099], [0, 1, 0], [0, 0, 1]],
  deuteranopia: [[1, 0, 0], [0.9513092, 0, 0.04866992], [0, 0, 1]],
};

function simulate(rgb: RGB, kind: string): RGB {
  const lms = mul(RGB2LMS, rgb.map(toLinear));
  const out = mul(LMS2RGB, mul(SIM[kind], lms));
  return out.map((c) => Math.max(0, Math.min(255, fromLinear(c)))) as RGB;
}

function toLab(rgb: RGB): [number, number, number] {
  const [r, g, b] = rgb.map(toLinear);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

function deltaE(a: RGB, b: RGB): number {
  const A = toLab(a), B = toLab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/**
 * Floor for the closest pair under any simulated vision.
 *
 * The shipped set measures 14.8. Twelve leaves room for a colour to be
 * repainted for art reasons without tripping the test, while still failing long
 * before a pair becomes genuinely confusable — the set this replaced sat at 4.9.
 */
const MIN_DELTA_E = 12;

function closestPair(kind: string) {
  const sims = TRIBE_DEFS.map((t) => simulate(hex(t.color), kind));
  let worst = { a: "", b: "", d: Infinity };
  for (let i = 0; i < TRIBE_DEFS.length; i++) {
    for (let j = i + 1; j < TRIBE_DEFS.length; j++) {
      const d = deltaE(sims[i], sims[j]);
      if (d < worst.d) worst = { a: TRIBE_DEFS[i].name, b: TRIBE_DEFS[j].name, d };
    }
  }
  return worst;
}

describe("tribe colours are separable", () => {
  for (const kind of Object.keys(SIM)) {
    it(`keeps every pair apart under ${kind}`, () => {
      const worst = closestPair(kind);
      // Reported rather than bare-asserted: when this fails you want to know
      // WHICH two tribes collided, not just that something did.
      expect(
        worst.d,
        `${worst.a}/${worst.b} are ΔE ${worst.d.toFixed(1)} apart under ${kind} — below the ${MIN_DELTA_E} floor`,
      ).toBeGreaterThanOrEqual(MIN_DELTA_E);
    });
  }

  it("does not regress normal vision to fix a CVD pair", () => {
    // The specific failure this guards: a previous attempt "fixed" a
    // colourblind pair by moving Valkyra onto Auren, leaving them ΔE 10.4
    // apart for players with ordinary colour vision.
    const worst = closestPair("normal");
    expect(worst.d, `${worst.a}/${worst.b} at ΔE ${worst.d.toFixed(1)}`).toBeGreaterThan(20);
  });

  it("covers every tribe, so a new one cannot be added unmeasured", () => {
    expect(TRIBE_DEFS.length).toBeGreaterThanOrEqual(8);
    for (const t of TRIBE_DEFS) expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
