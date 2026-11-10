import type { GameState } from "../core/types";
import { victoryProgress, VICTORY_PATH_START_TURN } from "../core/victory";

/** Tutorial copy only: use the same live path goal and turn numbering as the HUD. */
export function tutorialWelcomeBody(state: GameState): string {
  const human = state.tribes[state.humanTribe];
  // Missing/eliminated humans have no path. Malformed identities must not make
  // victoryProgress dereference an invalid path definition in an old snapshot.
  const progress = human && Number.isInteger(human.defIndex) && human.defIndex >= 0
    ? victoryProgress(state, state.humanTribe)
    : null;
  const path = progress
    ? `Your path — ${progress.def.name}: ${progress.def.goal}.`
    : "Faction paths: meet your tribe's goal.";

  return [
    "Win by conquest: be the last tribe alive by taking all rival cities.",
    `${path} Checked at round start from turn ${VICTORY_PATH_START_TURN + 1}.`,
    `Or have the highest score among living tribes when turn ${state.maxTurns} ends.`,
  ].join("\n");
}

export function tutorialEndTurnBody(state: GameState): string {
  const rivals = state.tribes.filter((tribe) => tribe.alive && tribe.index !== state.humanTribe).length;
  const next = rivals === 0
    ? "No rival powers remain."
    : `${rivals === 1 ? "There is" : "There are"} ${rivals} rival ${rivals === 1 ? "power" : "powers"} still in play. Turn order changes each round.`;
  return `Tap End Turn (bottom-right) when your units have acted. ${next} A recap highlights important events. Good hunting, Commander.`;
}
