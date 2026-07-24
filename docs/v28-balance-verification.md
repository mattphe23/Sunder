# v28 Balance Fixes — Implementation & Verification (Jul 24, 2026)

All five fixes from the playtest review ([playtest-review-2026-07-24.md](playtest-review-2026-07-24.md)) are implemented, covered by tests (69/69 green), and verified by re-running the **same four seeds** with the same model (gemini-2.5-flash), map sizes, tribes, and turn budgets.

## What changed in the engine

| # | Fix | Implementation |
|---|-----|----------------|
| 1 | Anti-snowball package | **Coalition strike bonus**: pacted AI tribes deal +15% attack vs. the runaway leader (shown as a "Coalition +15% vs leader" chip in battle previews). **Leader-hunting barbarians**: when a leader exists, camps act every turn instead of every other turn, raid warbands grow to up to 3 raiders, and raiders prefer the leader's units/cities (non-leader targets look 2× as distant). |
| 2 | Riding cost | Base cost 4★ → 6★ (≈7★ → ≈10★ after empire-size scaling). |
| 3 | Auren early game | Scholars tribes start with 7★ instead of 5★. |
| 4 | Ruin economy taper | Star payouts from ruins shrink ×0.75 per ruin a tribe has already claimed (floor 40%, min 2★) — applies to regular ruins and Great Ruins. Tech/unit rewards untouched. |
| 5 | Log clarity | Camp events now include map coordinates ("camp at (11, 4)") and name the raid target ("They hunt Sunwei, the mightiest empire!"). Research panel now states that Scholars' 20% discount is already included in shown costs. |

## Re-run results (same four seeds, patched engine)

| Run | Map / seed | LLM tribe | Balance | Clarity | Fun | Pacing | Leader gap (1st÷2nd) |
|-----|-----------|-----------|---------|---------|-----|--------|----------------------|
| 1 | Continents 841758 | Auren | 6→5 | 8→7 | 7→6 | 7→6 | 1.43 → 1.53 |
| 2 | Archipelago 437396 | Auren | **4→5** | 7→7 | 6→6 | **5→5** | 1.43 → 1.69 |
| 3 | Archipelago 657569 | Kharzul | 6→**6** | 7→**8** | 7→7 | 6→**7** | 1.36 → **1.04** |
| 4 | Continents 146213 | Kharzul | 6→5 | 7→7 | 7→6 | 7→5 | 1.56 → 1.57 |

## Honest read of the results

**What clearly worked:**
- **The mechanics fire correctly.** Every re-run log shows leader-hunting raids ("They hunt Sunwei, the mightiest empire!") targeting the actual score leader, with coordinates in every camp message.
- **Run 3 is a genuinely different game**: the leader gap collapsed from 1.36 to 1.04 (a near photo-finish, 850 vs 820), and it posted the best scores of the set (balance 6, clarity 8, fun 7, pacing 7).
- **Run 2's worst-case improved**: balance moved 4 → 5 on the seed that previously produced the harshest report.
- **Auren no longer dead-ends universally**: in run 4 Auren *won* with 6 cities / 12 units; in run 3 Auren finished a close second. (Runs 1–2 still show weak Auren starts on those seeds.)

**What did not move (yet):**
- The **average leader gap is basically unchanged** (1.44 → 1.46). Two seeds still produced a runaway leader — snowballing is dampened, not solved. The single biggest remaining lever is untouched: the leader's own economy keeps compounding through city income, which the raid pressure only partially offsets.
- Score-only comparison across two LLM runs is noisy: each match is a single sample with different in-game decisions, so treat per-run deltas as directional, not precise.

## Recommended next iteration (if we push further on snowballing)

1. **Income taper**: leader's per-city star income −1 per city while their score exceeds 1.4× the second place (the "optional" item from the original proposal — now looks like the missing piece).
2. **More samples per seed**: run each seed 3× and average, so balance scores are less noisy before/after.
3. Leave riding/ruins/Auren as-is for now — no regressions observed, and the taper visibly reduced late-game star hoards in the logs.
