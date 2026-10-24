import { AI_INCOME_BONUS } from "../core/state";
import type { Difficulty } from "../core/types";

/** Presentation only: read the live gameplay settings; never change the ladder. */
export function difficultyDescription(difficulty: Difficulty) {
  const bonus = AI_INCOME_BONUS[difficulty] ?? 0;
  const income =
    bonus === 0
      ? "AI receives no extra income each turn."
      : `AI receives ${bonus > 0 ? "+" : ""}${bonus} extra ${Math.abs(bonus) === 1 ? "star" : "stars"} each turn.`;
  const detail = `${income} All difficulties currently use the same tactical AI.`;
  return { extraIncome: bonus, detail, title: detail };
}
