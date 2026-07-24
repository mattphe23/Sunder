// Story Mode — the campaign screen (Chapters I & II). Entitlement-gated.
// Missions are seed-locked matches launched into the main game shell (Home).
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { STORY_CHAPTERS } from "@shared/story";
import type { StoryChapter, StoryMission } from "@shared/story";
import { bestStars, chapterUnlocked, loadStoryProgress, missionUnlocked } from "@/game/core/story";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { game } from "@/game/core/state";
import { TRIBE_DEFS } from "@/game/core/types";
import { loadCustomTribe } from "@/game/core/customTribe";
import { EpilogueCard, epilogueSeen, markEpilogueSeen } from "@/game/ui/Epilogue";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Check, Lock, Play, Sparkles, Star, Swords } from "lucide-react";

/** three-star row for a mission (0 = completed pre-stars or not completed) */
function StarRow({ n, size = "h-3.5 w-3.5" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" title={`${n}/3 stars`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={`${size} ${i <= n ? "fill-amber-400 text-amber-300" : "fill-transparent text-slate-600"}`} />
      ))}
    </span>
  );
}

export default function Story() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { has, loading: entLoading } = useEntitlements();
  const [briefing, setBriefing] = useState<StoryMission | null>(null);
  const [epilogueOpen, setEpilogueOpen] = useState(false);
  const progress = loadStoryProgress();
  // one Story purchase covers the whole campaign (all chapters share the key)
  const owned = has(STORY_CHAPTERS[0].entitlementKey);

  const launch = (m: StoryMission) => {
    // the player's forged tribe leads the campaign when one exists; else Auren…
    // unless Auren is this mission's antagonist, then fall to the first free def.
    const custom = loadCustomTribe();
    let playerDef = 0;
    while (m.enemies.includes(playerDef)) playerDef++;
    // roster slots hold def indices; the custom tribe overrides slot 0 via `custom`
    game.newGame({
      size: m.size,
      humanTribe: 0,
      difficulty: m.difficulty,
      seed: m.seed,
      preset: m.preset,
      roster: [playerDef, ...m.enemies],
      custom: custom ? { slot: 0, config: custom } : undefined,
      storyMission: m.id,
    });
    navigate("/");
  };

  const allMissions = STORY_CHAPTERS.flatMap((c) => c.missions);
  const doneCount = allMissions.filter((m) => progress.done[m.id]).length;
  const campaignComplete = doneCount === allMissions.length;
  const totalStars = allMissions.reduce((acc, m) => acc + bestStars(m.id), 0);

  const renderChapter = (ch: StoryChapter) => {
    const unlockedChapter = chapterUnlocked(ch.id);
    const chDone = ch.missions.filter((m) => progress.done[m.id]).length;
    return (
      <section key={ch.id} className="mb-10">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-black tracking-tight text-white">{ch.title}</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-slate-400">{ch.tagline}</p>
          <p className="mt-1 text-xs text-slate-500">{chDone}/{ch.missions.length} missions complete</p>
        </div>
        {!unlockedChapter ? (
          <div className="rounded-2xl border border-white/10 bg-[#12122c] p-6 text-center">
            <Lock className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm text-slate-400">Complete the previous chapter's finale to begin {ch.title.split("—")[0].trim()}.</p>
          </div>
        ) : (
          <ol className="relative space-y-4">
            {ch.missions.map((m) => {
              const done = !!progress.done[m.id];
              const unlocked = owned && missionUnlocked(m, ch.id);
              const enemies = m.enemies.map((d) => TRIBE_DEFS[d]?.name ?? "?").join(", ");
              const stars = bestStars(m.id);
              return (
                <li key={m.id} className={`rounded-2xl border p-5 transition-colors ${done ? "border-emerald-400/25 bg-emerald-950/20" : unlocked ? "border-amber-400/25 bg-[#161638]" : "border-white/5 bg-[#12122c] opacity-60"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-400 text-black" : unlocked ? "bg-amber-400 text-black" : "bg-white/10 text-slate-400"}`}>
                          {done ? <Check className="h-3.5 w-3.5" /> : m.index + 1}
                        </span>
                        <h3 className="font-bold text-white">{m.title}</h3>
                        <span className="text-xs text-slate-500">— {m.subtitle}</span>
                        {done && <StarRow n={stars} />}
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <Swords className="h-3.5 w-3.5 text-red-300" /> {m.objective.text} · vs {enemies} · {m.difficulty}
                      </p>
                      {done && stars > 0 && stars < 3 && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          For 3★: finish by turn {m.parTurns + 1} and lose no city
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {unlocked ? (
                        <Button size="sm" className={done ? "bg-white/10 text-slate-200 hover:bg-white/20" : "bg-amber-400 font-bold text-black hover:bg-amber-300"} onClick={() => setBriefing(m)}>
                          <Play className="mr-1 h-3.5 w-3.5" /> {done ? "Replay" : "Begin"}
                        </Button>
                      ) : (
                        <Lock className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#0d0d26] text-slate-100" style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white"><ArrowLeft className="mr-1 h-4 w-4" /> Menu</Button>
          </Link>
          {owned && (
            <span className="flex items-center gap-2 text-xs text-slate-400">
              {doneCount}/{allMissions.length} missions
              <span className="flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 font-bold text-amber-200">
                <Star className="h-3 w-3 fill-amber-400 text-amber-300" /> {totalStars}/{allMissions.length * 3}
              </span>
            </span>
          )}
        </div>

        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-amber-300">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.25em]">Story Mode</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">The Sundering Saga</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Two chapters, ten missions — lead your tribe from the smallest shard to the reforged world.
          </p>
        </div>

        {!owned && !entLoading ? (
          <div className="rounded-2xl border border-amber-400/20 bg-[#161638] p-8 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-amber-300" />
            <h2 className="text-lg font-bold text-white">Story Mode is a Store unlock</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Ten scripted missions across two chapters — lead your forged tribe (or any tribe you own)
              through the war that reforges the world. One purchase unlocks the whole campaign; included in the Ultimate Pack.
            </p>
            {!isAuthenticated && !authLoading ? (
              <Button className="mt-5 bg-amber-400 font-bold text-black hover:bg-amber-300" onClick={() => startLogin()}>
                Sign in to purchase
              </Button>
            ) : (
              <Link href="/store">
                <Button className="mt-5 bg-amber-400 font-bold text-black hover:bg-amber-300">
                  <Sparkles className="mr-1.5 h-4 w-4" /> Unlock in Store
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>{STORY_CHAPTERS.map(renderChapter)}</>
        )}

        {owned && (progress.done["ch2-m5"] || epilogueSeen()) && (
          <div className="mt-6 text-center">
            {campaignComplete && (
              <p className="mb-3 text-sm text-emerald-300">
                Campaign complete. The world is whole — and the next story is being written.
              </p>
            )}
            <Button
              variant="ghost"
              className="border border-violet-400/30 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20"
              onClick={() => setEpilogueOpen(true)}
            >
              <BookOpen className="mr-1.5 h-4 w-4" /> Watch the epilogue
            </Button>
          </div>
        )}
      </div>

      {epilogueOpen && (
        <EpilogueCard onClose={() => { markEpilogueSeen(); setEpilogueOpen(false); }} />
      )}

      {briefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setBriefing(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-amber-400/25 bg-[#161638] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              {briefing.id.startsWith("ch2") ? "Chapter II" : "Chapter I"} · Mission {briefing.index + 1}
            </div>
            <h2 className="text-xl font-black text-white">{briefing.title}</h2>
            <div className="mt-3 space-y-2">
              {briefing.intro.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-300">{p}</p>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-black/30 p-3 text-xs text-slate-400">
              <span className="font-bold text-slate-200">Objective:</span> {briefing.objective.text}
            </div>
            <div className="mt-2 rounded-lg bg-black/30 p-3 text-xs text-slate-400">
              <span className="font-bold text-slate-200">Stars:</span> 1★ complete the objective ·
              2★ finish by turn {briefing.parTurns + 1} · 3★ also lose no city
              {bestStars(briefing.id) > 0 && (
                <span className="ml-1.5 text-amber-300">(best: {bestStars(briefing.id)}★)</span>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" className="text-slate-300" onClick={() => setBriefing(null)}>Not yet</Button>
              <Button className="bg-amber-400 font-bold text-black hover:bg-amber-300" onClick={() => launch(briefing)}>
                <Play className="mr-1 h-4 w-4" /> To battle
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
