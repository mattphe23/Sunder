// Story Mode — Chapter I: The Sundering. Entitlement-gated campaign screen.
// Missions are seed-locked matches launched into the main game shell (Home).
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { STORY_CHAPTERS } from "@shared/story";
import type { StoryMission } from "@shared/story";
import { loadStoryProgress, missionUnlocked } from "@/game/core/story";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { game } from "@/game/core/state";
import { TRIBE_DEFS } from "@/game/core/types";
import { loadCustomTribe } from "@/game/core/customTribe";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Check, Lock, Play, Sparkles, Swords } from "lucide-react";

const ch = STORY_CHAPTERS[0];

export default function Story() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { has, loading: entLoading } = useEntitlements();
  const [briefing, setBriefing] = useState<StoryMission | null>(null);
  const progress = loadStoryProgress();
  const owned = has(ch.entitlementKey);

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

  const doneCount = ch.missions.filter((m) => progress.done[m.id]).length;

  return (
    <div className="min-h-screen bg-[#0d0d26] text-slate-100" style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white"><ArrowLeft className="mr-1 h-4 w-4" /> Menu</Button>
          </Link>
          {owned && (
            <span className="text-xs text-slate-400">{doneCount}/{ch.missions.length} missions complete</span>
          )}
        </div>

        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-amber-300">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.25em]">Story Mode</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">{ch.title}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{ch.tagline}</p>
        </div>

        {!owned && !entLoading ? (
          <div className="rounded-2xl border border-amber-400/20 bg-[#161638] p-8 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-amber-300" />
            <h2 className="text-lg font-bold text-white">Chapter I is a Store unlock</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Five scripted missions across the Shatterlands — lead your forged tribe (or any tribe you own)
              through the war that reforges the world. Included in the Ultimate Pack.
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
          <ol className="relative space-y-4">
            {ch.missions.map((m) => {
              const done = !!progress.done[m.id];
              const unlocked = owned && missionUnlocked(m, ch.id);
              const enemies = m.enemies.map((d) => TRIBE_DEFS[d]?.name ?? "?").join(", ");
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
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <Swords className="h-3.5 w-3.5 text-red-300" /> {m.objective.text} · vs {enemies} · {m.difficulty}
                      </p>
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

        {doneCount === ch.missions.length && owned && (
          <p className="mt-6 text-center text-sm text-emerald-300">
            Chapter complete. The Forge stirs — Chapter II is being written.
          </p>
        )}
      </div>

      {briefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setBriefing(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-amber-400/25 bg-[#161638] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Mission {briefing.index + 1}</div>
            <h2 className="text-xl font-black text-white">{briefing.title}</h2>
            <div className="mt-3 space-y-2">
              {briefing.intro.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-300">{p}</p>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-black/30 p-3 text-xs text-slate-400">
              <span className="font-bold text-slate-200">Objective:</span> {briefing.objective.text}
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
