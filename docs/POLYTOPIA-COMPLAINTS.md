# What Polytopia players complain about — and where Sunder stands

Sunder is aimed squarely at people who have played Polytopia. That makes its
review pages unusually valuable: they are a list, written by the exact audience
we want, of what that audience will forgive and what it will not.

This is a survey of Steam negative reviews, App Store critical reviews, and
Steam community discussion, sorted by how loud each complaint is and what it
would cost us to be better. Each entry says what players actually said, what
Sunder does today, and what I think we should do.

Sources are listed at the end. Where a complaint is a single reviewer's opinion
rather than a recurring theme, it says so — a loud minority is not a signal.

---

## 1. Selling tribes is the loudest complaint, and we do it too

**What they say.** This is the most repeated theme in Steam's negative reviews.
"Selling multiple tribes as dlc is so anti consumer and makes the game way to
overpriced." Several reviewers call the base price unjustifiable next to games
of similar complexity; one with 63.7 hours is angry at having to buy the DLC
twice because mobile and PC use separate accounts.

**What Sunder does today.** `shared/products.ts` sells two premium tribes at
$3.99, and both carry mechanical advantages rather than cosmetic ones:

| Tribe | Perk |
|---|---|
| Valkyra | enemy retaliation against your attacks is **halved** |
| Mycelon | units recover **+2 extra HP** resting in friendly territory |

Halved retaliation is not a flavour difference. It changes the arithmetic of
every trade in the game, and in an online duel it is a purchased edge.

**Recommendation — and this is the one I feel strongest about.** Move both
tribes into the free roster and keep the money in the places where paying
cannot win a match: the six $1.99 skins, the two $2.99 map packs, and the $4.99
campaign. That set is already the majority of the catalog and none of it touches
the balance sheet of a duel.

If premium tribes stay, the minimum defensible version is to make their perks
lateral rather than strong — a different playstyle at the same power level,
verified with the batch harness the same way the base six were — and to disable
them in ranked online play. But the clean answer is to stop selling power. It
is the single most-cited reason people give for resenting a game we are
otherwise modelled on, and we are currently doing a sharper version of it.

The cross-platform double-purchase complaint is worth pre-empting too: whatever
we ship on iOS should honour a web purchase for the same account, so nobody buys
the campaign twice.

---

## 2. "All the tribes are pretty much the same" / strategies converge

**What they say.** A detailed Steam critique: "all working strategies are the
same" and "all the tribes are pretty much the same." Others report the game
becoming "massively repetitive" on larger maps, that longer games "just turn
into multi-hour grinds," and that "the early game is interesting enough but it
lacks the variety and complexity to have staying power."

**What Sunder does today.** This is the gap our whole design bets on. Five
victory paths exist and are reachable — domination plus plunder, bloodforge,
harvest and tide mastery — and the last gameplay audit moved them from
decorative to live. Tribes differ by perk *and* by which victory path their perk
pushes them toward.

**And it is working.** Across the same 80 matches, wins came through seven
different conditions:

| Won by | Share |
|---|---|
| score/domination | 25% |
| enlightenment | 23% |
| plunderking | 15% |
| bloodforge | 14% |
| tidemastery | 11% |
| greatharvest | 8% |
| unbrokenwall | 5% |

Set that against the community's own figure for Polytopia — **99% of multiplayer
games are Domination**. Conquest is a quarter of our outcomes, not all of them.
This is the clearest evidence we have that the central design bet is paying off.

**Recommendation.** Keep watching it. The distribution is healthy now, and the
failure mode is drift: one path quietly becoming the efficient answer. It is
already reported by both harnesses, so the only discipline required is running
them after balance changes and looking at the spread rather than only the win
rates.

---

## 3. Winning only by conquest gets old — people want diplomacy

**What they say.** From App Store reviews: "only way to win is to take over
everything and that gets repetitive," and explicit requests for diplomatic
options. Separately, in multiplayer the community reports that **99% of games
are Domination** — the alternative mode, Perfection, is a 30-turn score race
that solved into temple-maxing and is effectively unplayed.

**What Sunder does today.** Treaties, betrayal with a grudge memory, coalitions,
and four non-conquest victory paths. Betrayal has real consequences rather than
being a free action.

**Recommendation.** No change — this is a lead we already hold. Worth making it
visible in store copy, because it is the specific itch these reviewers describe
and they will not discover it from screenshots.

The Perfection lesson is worth internalising though: a scored alternate mode
with a fixed turn limit degenerates into a single optimal build. Our non-conquest
paths are goals inside a normal match rather than a separate scoring mode, which
is the right shape — but each one still needs to be un-solvable, or it becomes
the temple-max of Sunder.

---

## 4. Misclicks with no undo

**What they say.** Recurring in App Store reviews. Misclicking a unit "happens
almost every turn"; there is "no way to accurately select tiles when too much is
going on them"; players "unintentionally move units to wrong places all the time
with no way to revert it."

**What Sunder does today.** One-step undo already exists — `state.ts` keeps a
snapshot of the last human move and the HUD exposes it, restricted to genuinely
reversible moves (nothing that revealed a ruin or entered a city).

**Recommendation.** The mechanic is right; the remaining risk is the second half
of the complaint — *tile selection accuracy when a tile is crowded*. That is a
touch-target problem on a phone, and it is worth a deliberate pass on a real
device before submission: on a 13×13 board zoomed out, a tile carrying a unit, a
resource and a road is a small target with three plausible intents.

---

## 5. The AI is too weak, even at the hardest setting

**What they say.** "Even on highest difficulty with the biggest map... nothing
stops your power from exploding." The AI "has problems developing its cities."
One reviewer explicitly asks for more cheats at the top difficulty. Separately,
an App Store reviewer notes the AI builds temples during domination games — i.e.
it optimises for the wrong thing.

**What Sunder does today.** The ladder was rebuilt last session and now climbs
monotonically: 14% / 23% / 27% / 36% win rates across easy → impossible.

**Recommendation.** 36% at the top is a competent opponent, not a frightening
one, and this complaint says a strategy audience wants to be frightened. The
parked project — keeping the standard brain's expansion behaviour and layering
the threat map, retreat rule and hero-risk model from `aiPro.ts` on top — is
aimed at exactly this and should stay on the list. The "AI builds the wrong
thing for the game mode" observation is a good test for us specifically, since
we have five victory paths: an AI chasing harvest while being overrun is the
same failure in a new costume.

---

## 6. Snowballing: once you are behind, you are done

**What they say.** Once an opponent "has troops in your base you are essentially
doomed." Scout spam is called "the most obnoxious tactic" with "no counter."
The community discusses catch-up mechanics as an open problem.

**What Sunder does today.** No explicit comeback mechanic. Plunder transfers
stars from the victim to the raider, which if anything should accelerate a
snowball.

**So I measured it** — `scripts/snowball-audit.mts`, 80 headless matches, size
11, all four presets and three difficulties, sampling the standings every turn.
The question: if you lead on turn N, do you win? With four tribes, 25% is chance.

| Turn | Leader by cities goes on to win |
|---|---|
| 5 | 34% |
| 10 | 38% |
| 15 | 50% |
| 20 | 55% |
| 25 | 69% |

The city lead only stops changing hands 72% of the way through a match, and
**62% of winners did not hold the city lead on turn 10**. Measured by score
rather than cities the curve is the same shape.

**Sunder does not have Polytopia's snowball problem. It may have the opposite
one.** A turn-20 leader winning 55% of the time is a game where two thirds of
your mid-game barely moves the needle, and an ending that can feel arbitrary
rather than earned. That is a real failure mode, just an unfamiliar one.

**Recommendation: do not add catch-up mechanics.** There is nothing to catch up
from. Before acting on the opposite concern, two caveats have to be cleared:

- This is bot-vs-bot. A human presses an advantage harder than our AI does, so
  the true human curve is steeper than this by an unknown amount. The honest
  claim is an upper bound on how comeback-friendly the game is, not a
  measurement of how it feels to play.
- Matches average 23 turns against a 30-turn cap. A short game gives an
  advantage less time to compound, which flattens the curve on its own.

The way to settle it is the same instrument pointed at real games once there are
some, not more simulation.

---

## 7. Smaller, cheaper things

- **Mechanics that change without warning.** Reviewers were irritated by "cut
  down forest" stars flipping between 1 and 2 across patches, and by roads going
  to 3 stars. The lesson is about *communication*, not balance: a visible
  changelog costs nothing and buys a lot of patience.
- **A treaty that silently disables your units.** One reviewer describes the
  peace treaty system disabling movement "with no warning when broken." Sunder
  computes `breaksTreaty` and surfaces it in the attack preview, so we are ahead
  here — but it is worth checking that every path that can break a treaty warns,
  not just the attack preview.
- **Late-game tedium.** Requests for waypoint movement to speed up long games.
  Real, but it is a late-game quality-of-life feature and can wait.
- **Missing achievements** on Steam. Not applicable to an iOS-first release;
  Game Center is the equivalent and is cheap if we want it.

---

## What I would actually do next, in order

1. **Take the power out of the paid tribes.** One catalog change, and it removes
   the loudest single grievance this audience has — while we still can, before
   anyone has bought one.
2. **Touch-target pass on a real phone**, aimed at crowded tiles specifically.
   This is the one item on the list that cannot be done from here.
3. **Resume the AI project** — the top difficulty is the one a strategy audience
   judges us by, and at 36% it is competent rather than frightening. A stronger
   top AI would also sharpen the snowball curve, since a bot that presses its
   advantage is a better model of a human opponent.

~~Measure when games are decided~~ — done, see §6. The answer inverted the
question, so no catch-up mechanic is warranted.

~~Report victory-path spread~~ — already reported by both harnesses, and the
spread is healthy (§2).

---

## Sources

- [The Battle of Polytopia — Steam negative reviews](https://steamcommunity.com/app/874390/negativereviews/?browsefilter=toprated)
- [The Battle of Polytopia — App Store ratings & reviews](https://apps.apple.com/us/app/the-battle-of-polytopia/id1006393168?see-all=reviews)
- [Steam Community — Balance Suggestions](https://steamcommunity.com/app/874390/discussions/0/4033599336902886572/)
- [Steam Community — Perfection Mode on larger maps](https://steamcommunity.com/app/874390/discussions/0/2952628643858277869/)
- [Steam Community — general discussions](https://steamcommunity.com/app/874390/discussions)
- [Polytopia Wiki — Game Modes](https://polytopia.fandom.com/wiki/Game_Modes)
- [Polytopia Wiki — Strategies and General Observations](https://polytopia.fandom.com/wiki/Strategies/Observations_and_General_Strategies)
