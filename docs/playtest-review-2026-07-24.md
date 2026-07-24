# Playtest Lab Review — 4 Runs (Jul 24, 2026)

All four runs completed cleanly (no errors, no bug reports filed by the model). The LLM chose
its own actions almost every turn — 85 LLM actions vs. 3 scripted fallbacks across all runs —
so the reports reflect genuine play, not fallback noise.

## Run overview

| Run | Map | LLM tribe | Turns | Balance | Clarity | Fun | Pacing |
|-----|-----|-----------|-------|---------|---------|-----|--------|
| 1 | Continents 13×13 (seed 841758) | Auren | 16 | 6 | 8 | 7 | 7 |
| 2 | Archipelago 13×13 (seed 437396) | Auren | 19 | **4** | 7 | 6 | **5** |
| 3 | Archipelago 13×13 (seed 657569) | Kharzul | 19 | 6 | 7 | 7 | 6 |
| 4 | Continents 13×13 (seed 146213) | Kharzul | 19 | 6 | 7 | 7 | 7 |

## Cross-run findings (the signal, not the noise)

### 1. Snowballing is the #1 recurring complaint — flagged in ALL four runs
Every report describes one tribe pulling far ahead with no way for trailing tribes to catch up:
- Run 1: Vessari 1390 pts vs. next-best 970 (Plunder King ruins/stars snowball, 64★ hoard)
- Run 2: Sunwei dominant; Auren dead-ended at 1 city / 0 units after 16 turns
- Run 3: Sunwei 1170 vs. 670–860; Kharzul & Vessari stuck at 2 units each
- Run 4: Auren 1495 / 6 cities / 13 units vs. Kharzul 960 / 4 / 6

All four reports independently suggest a comeback/catch-up mechanic. The AI-vs-AI coalition
pacts fire correctly (leader gets ganged up on in runs 1–4) but do not actually stop the leader.

### 2. Auren underperforms when played straight (runs 1 & 2)
Both Auren runs ended with Auren far behind (465 and 440 pts, one city). Two hypotheses:
- The Scholars passive (cheap tech) pays off too late vs. Kharzul aggression or Vessari plunder.
- The LLM plays a greedy tech opening that scripted AIs punish. (Kharzul runs scored 670–960 —
  mid-pack — so part of this is playstyle, but the pattern is consistent.)

### 3. Ruins/plunder economy may be over-tuned (run 1)
Vessari's Plunder King path hit 64★ via Great Ruins + plunder while others held 17–35★.
Worth checking ruin star payouts and the plunder-per-city amount.

### 4. Riding tech looks under-priced (run 4)
Flagged at 7★ vs. ~11★ peers — early cavalry tempo may explain some early snowballs too.

### 5. Log/event clarity nits (run 2)
- "The ancient Guardian stirs" fires twice in a row with no location context.
- Repeated generic barbarian messages ("grows bolder…") don't say WHICH camp/where.

### What's landing well
Dynamic world events (storms, barbarian camps, guardians), veteran-warrior ruin rewards, hero
promotions, pacts vs. the leader, and the Plunder King objective were all called out as fun.
Clarity scored 7–8 across the board.

## Recommended actions (proposed, not yet implemented)

1. **Anti-snowball package** (addresses the universal finding):
   - Rubber-band world events: barbarian camps spawn nearer / raid the score leader harder.
   - Make coalition pacts bite: pact members get a small combat bonus vs. the common enemy.
   - Optional: leader's city income tapers slightly above a large score lead.
2. **Riding cost 7★ → 9–10★** (cheap targeted fix).
3. **Auren early game**: bump starting stars +2 or make the first tech discount larger up front.
4. **Ruin economy**: cap or taper star payouts from consecutive Great Ruins claims.
5. **Log clarity**: attach map coordinates/direction to guardian + barbarian messages and
   de-duplicate repeated identical world-event lines in the same turn.
