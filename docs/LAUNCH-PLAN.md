# Rolling Sunder out

Research pass, 2026-08-17. What the standard mobile-game launch playbook says,
which parts of it apply to a solo-built premium-feeling 4X, and which parts are
written for people with a user-acquisition budget and do not apply to you.

Read alongside `docs/APP-STORE-READINESS.md`, which covers the compliance side,
and `docs/POLYTOPIA-COMPLAINTS.md`, which is where the positioning below comes
from.

---

## The one-paragraph version

Do not "launch". Get a build into TestFlight this week and spend a month with
20–50 real players who did not build the game, because the single most valuable
thing you do not have is evidence that a stranger can learn Sunder without you
in the room. Use that month to fix the first-session experience and to write the
store listing. Then release quietly, seed the two or three communities that
actually contain your audience, and treat the App Store listing as the thing you
iterate on for months rather than the thing you finish before release day.

Everything below is elaboration on that.

---

## 1. Why not a big launch day

The standard playbook — soft launch in tier-2 markets, measure D1/D7/D30
retention, compute LTV against CAC, scale paid acquisition when the ratio works —
assumes you are buying installs. A 60-day soft launch is recommended precisely
because you need 30-day cohorts large enough to be statistically meaningful, and
you get those by paying for them.

You have no acquisition budget, so most of that machinery has nothing to grip.
What survives from it is the part that costs nothing and matters most:

- **Write down the questions before you start**, and what answer would change
  your mind. Otherwise you will read whatever the numbers say as encouraging.
- **Separate the two validations.** Does it work and is the core loop fun (small
  N, close observation) is a different question from does the meta hold people
  and does anyone pay (large N, statistics). You can genuinely answer the first
  one. You cannot answer the second yet, and pretending otherwise wastes the
  month.

So run the alpha half of a soft launch properly and skip the beta half until you
have the players to make it mean something.

## 2. The month before release

### TestFlight is the whole plan

External TestFlight takes up to 10,000 testers via a public link. Beta App
Review applies to the first build of each version — typically around a day —
and subsequent builds of the *same* version usually go through in minutes. The
practical consequence: **stage your iteration under one version number.** Bump
the version only when you want a fresh review.

You do not want 10,000. You want 20–50 people who will actually play and tell
you things, which is a recruiting problem, not a capacity problem.

### The three questions worth answering

Sunder has had a great deal of AI-vs-AI measurement and almost no human testing.
That asymmetry is the risk. The batch harness can tell you Auren wins 32% of
matches; it cannot tell you that a new player never found the tech tree.

1. **Can someone learn this without you?** Watch a first session end to end
   without helping. Where do they stop and stare? Sunder has victory paths,
   a hero with perks, diplomacy, a living world, a Tribe Forge — a lot of
   surface for turn one.
2. **Does the first match end in a win or a bounce?** Instrument nothing fancy:
   ask everyone who tried it whether they finished a game, and if not, which
   turn they quit on.
3. **Do the eight tribes read as different?** The balance work made them
   *statistically* close (32/30/28/25/25/23/21.5/20). Whether they *feel*
   distinct is a separate question and only a human can answer it.

### What to fix with the answers

Reserve the month's engineering for whatever question 1 turns up. Resist adding
features. The most likely outcome is that onboarding needs work, which is both
the least glamorous fix and the highest-leverage one.

## 3. Positioning

You already did this research; it just needs to become copy. `POLYTOPIA-COMPLAINTS.md`
found that selling tribes as DLC is the loudest complaint in Polytopia's negative
reviews — and Sunder's whole roster is now free, with money only where paying
cannot win a match.

**That is the pitch.** Not "like Polytopia but ours". Something closer to:

> Every faction is free. Nothing you can buy will win you a match.

It is true, it is checkable in ten seconds by a skeptic, and it lands directly
on the sorest point in the genre's biggest game. The existing menu line —
"Every faction is free and fair" — is already most of the way there; make it the
store subtitle too.

Corollary: **do not add a purchasable tribe later.** The positioning is worth
more than the SKU, and taking it back would be a story that writes itself badly.

## 4. Pricing

For calibration: Polytopia is free with paid tribes. Premium mobile ports sit
around $9.99 (Slay the Spire, Balatro).

Sunder's current shape — free base game, paid skins/maps/campaign — is the right
structure for the positioning. Two notes:

- The Ultimate bundle at $14.99 is priced above the premium ports it will be
  compared with. It bundles a lot, so it is defensible, but expect it to be the
  thing people screenshot. Consider whether the campaign at $4.99 is the
  friendlier headline purchase.
- Whatever you do, the free tier has to be a complete game, because that is the
  claim. It currently is.

## 5. Where the first players come from

Be realistic: you will get your first hundred players by hand.

**Reddit** is the highest-value channel and the easiest to get wrong. r/Polytopia
is where your audience literally is, and it will be hostile to anything that
reads as a clone marketed at them. Post as a player who made a thing, be
explicit about the differences, and do not lead with a store link. r/iosgaming
and the strategy-game subreddits are more forgiving of a launch post but smaller.

**One correction to the standard advice:** TouchArcade — the usual first
recommendation for iOS launches — shut down operations in September 2024. The
site and forums remain online, but do not build a plan around its coverage.

**Discord** is where retention happens rather than discovery. Worth having
before launch so the people who like it have somewhere to go, not worth much as
an acquisition channel.

**Press.** A solo 4X will not get coverage on release day. It may get coverage on
a hook — "every faction is free" is a hook, and so is the AI-vs-AI balance
methodology, which is genuinely unusual and is the sort of thing a developer
blog post gets read for.

## 6. The store listing is a long-lived asset

Screenshots and icon are the highest-leverage thing you control, and they are
worth testing repeatedly rather than setting once. Two Sunder-specific notes:

- The first screenshot should be the board, mid-match, at the angle the game
  actually looks best from. The recent graphics work — the flat-shaded quilt,
  the emissive sigil, the biome palettes — is the strongest asset you have, and
  a screenshot is where it earns its keep.
- The subtitle carries the positioning from §3. It is indexed for search, so it
  does double duty.

## 7. Sequence

| When | What |
|---|---|
| Tomorrow | Enrol. Sign the Paid Apps agreement + tax forms. Register the bundle id. |
| Then | Seven repo secrets → first CI build → TestFlight internal. |
| Week 1 | Decide monetization (`APP-STORE-READINESS.md` §3). Recommendation: no purchases on iOS in v1. |
| Weeks 1–4 | 20–50 external testers. Answer the three questions. Fix onboarding. |
| Week 4 | Store listing, screenshots, age rating, privacy label. Set the real support contact. |
| Week 5 | Submit. Expect a rejection round; it is normal, not a verdict. |
| Release | Seed communities by hand. Do not buy installs. |
| Ongoing | Iterate the listing. Revisit IAP once you know whether anyone wants it. |

---

## Sources

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App launch strategy playbook, 2026](https://www.applaunchflow.com/blog/app-launch-strategy-2026)
- [Soft launch: what to validate and when to go global](https://blog.playio.co/mobile-game-soft-launch-strategy)
- [TestFlight](https://developer.apple.com/testflight/) and [beta review times](https://ptkd.com/journal/testflight-review-times-guide)
- [Apple Developer Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment)
- [Paid Applications Agreement / tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/)
- [TouchArcade](https://en.wikipedia.org/wiki/TouchArcade) — ceased operations September 2024
- [The Battle of Polytopia](https://en.wikipedia.org/wiki/The_Battle_of_Polytopia) — pricing model
