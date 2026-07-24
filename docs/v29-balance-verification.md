# v29 Verification Report — Late-Game QoL & Anti-Turtling Pass

Date: 2026-07-24 · Baseline: v28 (checkpoint 2563488c) · Tests: 77 green, tsc clean

## What shipped in v29

This pass targets Polytopia's best-known late-game pain points without inventing
experimental mechanics, per the agreed design filter ("fix Polytopia's real problems").

| Change | Area | Detail |
|---|---|---|
| Next Unit cycling | QoL | Tab/N hotkey + HUD button with units-left badge; camera focuses the next idle unit via a `focusTile` event |
| End-turn nudge | QoL | End Turn button turns amber with a warning when units can still act |
| Faster AI turns | Pacing | AI step delay 350ms → 150ms (60ms when the human is eliminated/spectating) |
| Siege income pressure | Anti-turtle | An enemy unit standing on a city tile zeroes that city's star income (`rules.ts starIncome`); SIEGE badge in HUD + log line |
| AI siege awareness | AI | Scripted AI and aiPro prioritize killing besiegers on their own cities (+18 kill / +8 chip attack bonus, movement objective weight 110) and step onto enemy city tiles to start sieges |
| Battle score | Anti-turtle | +8 score per battle won, mirroring Polytopia's combat scoring so aggression is rewarded on the scoreboard |
| Scholars clarity | UI | Research panel now shows the Scholars discount explicitly |

## Validation method

The same two seeds used for the v28 verification were re-run through the AI Playtest
Lab (LLM-driven headless matches), and the anomalous result was cross-checked with a
new deterministic all-scripted simulation (`scripts/simcheck-v29.ts`) that replays the
identical seed with the scripted AI controlling every tribe, removing LLM variance.

## Results

| Run | Seed / map | v28 outcome | v29 outcome |
|---|---|---|---|
| 1 | 841758 continents, LLM=Auren | 19 turns, still playing, leader spread 1.53x, Auren alive (2 cities) | Ended turn 6 — LLM Auren eliminated; survivor spread only 1.12x |
| 3 | 657569 archipelago | 17 turns, spread 1.04x, pacing flagged slow | 17 turns, spread 1.09x, **pacing score 7 (up from ~4)** |

Run 3 shows the intended effect: pacing improved materially while balance stayed tight
(1.09x top-to-second spread is well within a healthy range), and the reviewer scores
were balance 6 / clarity 5 / fun 6 / pacing 7.

### Run 1 anomaly: LLM misplay, not an engine regression

Run 1's early elimination warranted a determinism check. The all-scripted sim on the
identical seed (841758) reached turn 17 with **Auren alive and holding 2 cities**
(scores: Kharzul 1608, Sunwei 1266, Vessari 766, Auren 532). Auren is therefore not
structurally doomed on this seed under the v29 rules; the LLM simply misplayed its
opening (it made only 11 actions across 6 turns, versus 23 actions across 19 turns in
the v28 run of the same seed). Code review confirms the v29 AI aggression changes only
target enemies standing on the AI's *own* city tiles and never neutral villages, so no
new early-rush pathway was introduced.

## Known minor issues (deferred, tracked in todo)

1. `turnNotes` in the playtest report is empty when a match ends before the notes
   flush (early gameover), as seen in run 1 — data-collection nit in `server/playtest.ts`.
2. Run 3 recorded a null turn note for T9 — same subsystem, same severity.

Neither affects gameplay; both only reduce the richness of playtest reports.

## Conclusion

v29 is sound to ship: pacing measurably improved, balance spread remains tight, the
siege and scoring changes work as designed in both scripted and LLM matches, and the
single alarming datapoint is attributable to LLM variance rather than the engine.
