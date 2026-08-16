# Board scaling — why victory targets move with map size

## The defect

Every victory target except Tide Mastery was a flat constant swept on an 11×11
board with four tribes. Bloodforge 22 battles, Great Harvest 15 city levels,
Unbroken Wall 3 walled cities, Overgrowth 5 cities, Plunder King 8 stars.

A bigger board gives every tribe more land, so it produces more cities, more
city levels and more battles — and a fixed goal line therefore arrives *sooner*.
Measured across 24 games per size, before any fix:

| size | avg turns |
|---|---|
| 11×11 | 23.3 |
| 13×13 | 21.5 |
| 15×15 | **16.9** |

A larger map was a shorter game. That is backwards, and it meant we could not
offer a roomier board without also making it a worse one — the map sizes stopped
at 13×13 for a reason nobody had written down.

Tide Mastery was already immune, because it counts ports as a fraction of the
board's shallow water. It got that treatment for the same reason in miniature: a
flat 4 ports made it an archipelago-only win condition.

## The fix

`boardScale()` in `client/src/game/core/victory.ts` multiplies the seven
board-dependent targets by

```
((size² / tribes) / (11² / 4)) ^ alpha
```

with floors so nothing collapses on a small map:

| path | base | floor |
|---|---|---|
| Bloodforge | 22 battles | 8 |
| Great Harvest | 15 city levels | 6 |
| Plunder King | 8 stars | 4 |
| Unbroken Wall | 3 walled cities | 2 |
| Storm Legend | 4 veterans | 3 |
| Overgrowth | 5 cities | 3 |
| Ascendance | 900 score | 400 |

Enlightenment is untouched — the tech list is a fixed length and does not grow
with the map.

Each scaled path now also rewrites its own goal line, the way Tide Mastery
already did. Without that the HUD would tell a player on a 15×15 to win 22
battles while the engine waited for 27.

### Nominal area, not measured land

The first implementation divided by the land actually generated. It looks more
precise and is worse: land per tribe varies by preset and by seed, so an 11×11
lands *near* a multiplier of 1.0 but never exactly on it — and 11×11 is the one
board whose balance is already validated. Measured that way, its balance spread
moved 43.8 → 50.0 at alpha 0.35 while fixing a problem it does not have.

Nominal area is exactly 1.0 at the reference board by construction. Every
existing sweep stays valid and only larger boards move. Two tests in
`server/balance.v40.test.ts` hold that invariant down.

## Choosing alpha

Swept over 0 / 0.35 / 0.5 / 0.7 / 1.0 at sizes 13 and 15, 48 games each, across
two independent seed blocks — 96 games per point. 11×11 was excluded because it
is provably invariant.

The reference to beat is how 11×11 itself behaves: **23.6 turns, 12.5% turn-cap
rate, 45.3 balance spread.** The goal is not to maximise match length; it is to
make a bigger board play like the tuned one.

| alpha | avg turns | capped | mean spread |
|---|---|---|---|
| 0 | 20.54 | 5.2% | 43.8 |
| **0.35** | **22.55** | **10.9%** | **48.5** |
| 0.5 | 23.21 | 14.6% | 59.4 |
| 0.7 | 23.86 | 21.9% | 71.9 |
| 1.0 | 24.84 | 33.3% | 89.1 |

The trade is monotone: more scaling buys match length and pays for it in games
that time out and in balance spread.

**0.35 wins** because it lands on the reference board's whole character rather
than just its match length — within 1 turn, within 1.6 points of cap rate, and
within 3 points of spread. 0.5 gets match length marginally closer and pays 14
points of spread for it. By 1.0 a third of matches time out.

0.35 is also the most stable across blocks: at size 13 it returned an identical
43.8 spread in both, where 0.5 disagreed 62.5 vs 75.0.

## Result

With alpha 0.35, 24 games per size:

| size | land/tribe | 1st blow | turns | capped | wiped out |
|---|---|---|---|---|---|
| 9×9 | 15.8 | 2.4 | 24.0 | 33% | 0.83 |
| 11×11 | 23.8 | 3.3 | 24.5 | 13% | 0.71 |
| 13×13 | 33.8 | 4.3 | 23.9 | 17% | 0.25 |
| 15×15 | 45.4 | 4.6 | 19.7 | 4% | 0.04 |
| 17×17 | 58.6 | 5.6 | 23.8 | 13% | 0.04 |

Match length no longer slides off with size. 15×15 is now offered in the menu:
it is the size where a tribe gets real build-up room and is almost never wiped
out (0.04 against 0.71 at the default), and it no longer costs a shorter game to
play there.

9×9 remains a knife fight — first blood on turn 2.4 and a tribe eliminated in
most matches. That is a fair mode to offer deliberately, but it is not a normal
game, and it is worth labelling as such.

## A note on the measurements

Every number here comes from a harness with the AI's RNG seeded
(`scripts/_rng.mts`). Before that, batch runs were reproducible in their *boards*
but not their *play* — `ai.ts` makes nine `Math.random()` calls per turn against
the global generator, and three runs of one identical config returned average
match lengths of 23.25, 23.50 and 25.25.

That gap is larger than the difference between adjacent alpha values, so any
sweep run without it is choosing whichever config drew luckier dice. Figures in
this document taken before the seeding change (the pre-fix table at the top) are
directionally right — the effect is much larger than the noise — but should not
be compared digit for digit with the ones after it.

## Reproducing

```bash
# one (alpha, size) point
SUNDER_PATH_SCALE_ALPHA=0.35 pnpm tsx scripts/path-scale-sweep.mts 15 48 5100

# crowding across every size
pnpm tsx scripts/density-audit.mts 24 5100
```
