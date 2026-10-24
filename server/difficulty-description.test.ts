import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AI_INCOME_BONUS } from "../client/src/game/core/state";
import type { Difficulty } from "../client/src/game/core/types";
import { difficultyDescription } from "../client/src/game/ui/difficultyDescription";

const tiers: Difficulty[] = ["easy", "normal", "hard", "impossible"];

describe("accurate difficulty disclosure", () => {
  it.each(tiers)("reads the gameplay income setting for %s", tier => {
    const result = difficultyDescription(tier);
    expect(result.extraIncome).toBe(AI_INCOME_BONUS[tier]);
    expect(result.detail).toContain("same tactical AI");
    if (result.extraIncome === 0) {
      expect(result.detail).toContain("no extra income");
    } else {
      expect(result.detail).toContain(`${result.extraIncome} extra`);
    }
    expect(result.title).toBe(result.detail);
    expect(result.detail).not.toMatch(
      /no cheats|threat maps|simply plays better/i
    );
  });

  it("does not hardcode the Impossible bonus independently of gameplay", () => {
    const previous = AI_INCOME_BONUS.impossible;
    try {
      AI_INCOME_BONUS.impossible = 5;
      expect(difficultyDescription("impossible").detail).toContain(
        "+5 extra stars"
      );
    } finally {
      AI_INCOME_BONUS.impossible = previous;
    }
  });

  it("uses singular star for Normal and discloses all selected tiers on screen", () => {
    expect(difficultyDescription("normal").detail).toContain(
      "+1 extra star each turn"
    );
    const menu = readFileSync(
      new URL("../client/src/game/ui/Menu.tsx", import.meta.url),
      "utf8"
    );
    expect(menu).toContain('id="difficulty-description"');
    expect(menu).toContain('aria-live="polite"');
    expect(menu).toContain("difficultyDescription(difficulty).detail");
    expect(menu).toContain("title={difficultyDescription(d).title}");
    expect(menu).toContain("aria-pressed={difficulty === d}");
    expect(menu).not.toMatch(
      /NO resource cheats|No cheats|hunts with threat maps/
    );
  });

  it("keeps gameplay bonus application and standard AI routing untouched", () => {
    const state = readFileSync(
      new URL("../client/src/game/core/state.ts", import.meta.url),
      "utf8"
    );
    const ai = readFileSync(
      new URL("../client/src/game/core/ai.ts", import.meta.url),
      "utf8"
    );
    expect(state).toContain("if (t.isHuman) return 0;");
    expect(state).toContain("return AI_INCOME_BONUS[s.difficulty] ?? 0;");
    expect(ai).not.toMatch(/import\s+.*from\s+["']\.\/aiPro/);
  });
});
