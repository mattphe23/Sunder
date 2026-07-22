// Polyforge main menu & game-over — Isoglow field-HUD: luminous board glow,
// edge-framed layout, tribe-color accents, four-point spark motifs, faceted separators.
import { useState } from "react";
import { useGame } from "../useGame";
import { TRIBE_DEFS, Difficulty } from "../core/types";
import { Button } from "@/components/ui/button";
import { Swords, Star } from "lucide-react";

const MENU_BG = "/manus-storage/menu-bg_b1164e9a.png";
const LOGO = "/manus-storage/logo_c79c0f53.png";

/** Four-point spark — Polyforge's signature motif */
function Spark({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
    </svg>
  );
}

/** Faceted diamond separator row */
function FacetRule() {
  return (
    <div className="flex w-full items-center gap-2" aria-hidden>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-amber-400/60" />
      <div className="h-1.5 w-1.5 rotate-45 bg-amber-400/80" />
      <div className="h-1.5 w-1.5 rotate-45 bg-amber-400/40" />
      <div className="h-1.5 w-1.5 rotate-45 bg-amber-400/80" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400/40 to-amber-400/60" />
    </div>
  );
}

export function MainMenu() {
  const g = useGame();
  const [faction, setFaction] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [size, setSize] = useState(11);
  const tribe = TRIBE_DEFS[faction];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#141433] px-4 py-10">
      {/* World art — brightened and saturated so the board reads as luminous, not misty */}
      <img
        src={MENU_BG}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
        style={{ filter: "saturate(1.5) brightness(1.25) contrast(1.08)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#141433]/55 via-[#141433]/20 to-[#141433]/90" />
      {/* Emerald + amber board-glow pools rising from the world below */}
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-emerald-400/20 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/5 h-80 w-80 rounded-full bg-amber-400/25 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/4 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#3d7bff]/15 blur-[120px]" />

      {/* HUD corner brackets — frame the whole screen like an in-game console */}
      <div className="pointer-events-none absolute inset-4 z-10 hidden sm:block" aria-hidden>
        {[
          "left-0 top-0 border-l-2 border-t-2",
          "right-0 top-0 border-r-2 border-t-2",
          "left-0 bottom-0 border-l-2 border-b-2",
          "right-0 bottom-0 border-r-2 border-b-2",
        ].map((pos) => (
          <div key={pos} className={`absolute h-10 w-10 border-amber-400/50 ${pos}`} />
        ))}
        <Spark className="absolute left-1 top-1 h-3 w-3 text-amber-400/90" />
        <Spark className="absolute right-1 top-1 h-3 w-3 text-amber-400/90" />
        <Spark className="absolute bottom-1 left-1 h-3 w-3 text-amber-400/90" />
        <Spark className="absolute bottom-1 right-1 h-3 w-3 text-amber-400/90" />
      </div>

      {/* floating ambient sparks */}
      <Spark className="pointer-events-none absolute left-[12%] top-[18%] h-2.5 w-2.5 animate-pulse text-amber-300/70" />
      <Spark className="pointer-events-none absolute right-[16%] top-[30%] h-2 w-2 animate-pulse text-cyan-300/60" style={{ animationDelay: "0.7s" }} />
      <Spark className="pointer-events-none absolute left-[22%] bottom-[22%] h-2 w-2 animate-pulse text-emerald-300/60" style={{ animationDelay: "1.3s" }} />

      <div className="relative z-20 flex w-full max-w-lg flex-col items-center">
        <img src={LOGO} alt="Polyforge" className="mb-3 h-20 w-20 drop-shadow-[0_0_32px_rgba(255,185,56,0.55)]" />
        <h1 className="font-display text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_18px_rgba(61,123,255,0.35)]">
          POLY<span className="text-amber-400">FORGE</span>
        </h1>
        <p className="mt-2 text-center text-sm font-medium text-slate-200">
          Claim the shattered isles. Outthink three rival powers in a world forged anew.
        </p>

        <div className="my-5 w-full max-w-sm"><FacetRule /></div>

        {/* Setup console — edge-framed HUD panel, tribe color reactive */}
        <div
          className="w-full rounded-lg border-2 bg-[#10102c]/80 p-4 backdrop-blur-md transition-colors duration-300 sm:p-5"
          style={{ borderColor: `${tribe.color}55`, boxShadow: `0 0 40px ${tribe.color}22, inset 0 1px 0 rgba(255,255,255,0.06)` }}
        >
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            <Spark className="h-3 w-3" /> Choose your faction
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TRIBE_DEFS.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setFaction(i)}
                className={`relative overflow-hidden rounded-md border-l-4 p-3 text-left transition-all duration-150 active:scale-[0.97] ${faction === i ? "bg-white/10" : "bg-white/[0.04] hover:bg-white/10"}`}
                style={{
                  borderLeftColor: t.color,
                  boxShadow: faction === i ? `0 0 18px ${t.color}44, inset 0 0 0 1px ${t.color}66` : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                {faction === i && (
                  <Spark className="absolute right-2 top-2 h-3 w-3" style={{ color: t.color }} />
                )}
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-3 w-3 rotate-45" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                  <span className="font-display text-sm font-extrabold tracking-wide text-white">{t.name}</span>
                </div>
                <p className="text-[11px] leading-snug text-slate-300">{t.passiveDesc}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <span className="h-1 w-1 rotate-45 bg-amber-400" /> Difficulty
              </p>
              <div className="flex gap-1">
                {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-md border px-2 py-1.5 font-display text-xs font-bold capitalize transition-colors ${difficulty === d ? "border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(255,185,56,0.25)]" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <span className="h-1 w-1 rotate-45 bg-emerald-400" /> Map size
              </p>
              <div className="flex gap-1">
                {[9, 11, 13].map((sz) => (
                  <button key={sz} onClick={() => setSize(sz)}
                    className={`flex-1 rounded-md border px-2 py-1.5 font-display text-xs font-bold transition-colors ${size === sz ? "border-emerald-400 bg-emerald-400/20 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.25)]" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
                    {sz}×{sz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => g.newGame({ size, humanTribe: faction, difficulty })}
          className="mt-5 w-full gap-2 rounded-lg bg-amber-400 py-6 font-display text-lg font-black tracking-widest text-[#1b1b3f] shadow-[0_0_40px_rgba(255,185,56,0.4)] transition-transform hover:bg-amber-300 active:scale-[0.98]"
        >
          <Swords className="h-5 w-5" /> BEGIN CONQUEST
        </Button>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-slate-300">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          Capture all rival capitals — or lead in score when turn 30 ends. Every faction is free and fair.
        </p>
      </div>
    </div>
  );
}

export function GameOver() {
  const g = useGame();
  const s = g.state;
  const winner = s.winner !== null ? s.tribes[s.winner] : null;
  const won = s.winner === s.humanTribe;
  const ranked = [...s.tribes].sort((a, b) => b.score - a.score);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#141433]/90 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-lg border-2 bg-[#10102c] p-6 text-center shadow-2xl"
        style={{ borderColor: won ? "#ffb93877" : "rgba(255,255,255,0.12)", boxShadow: won ? "0 0 60px rgba(255,185,56,0.25)" : undefined }}
      >
        <div className="mb-2 flex justify-center"><Spark className={`h-5 w-5 ${won ? "text-amber-400" : "text-slate-500"}`} /></div>
        <h2 className={`font-display text-4xl font-black tracking-wide ${won ? "text-amber-400 drop-shadow-[0_0_20px_rgba(255,185,56,0.5)]" : "text-slate-300"}`}>
          {won ? "VICTORY" : "DEFEAT"}
        </h2>
        {winner && (
          <p className="mt-2 text-sm text-slate-300">
            <span style={{ color: winner.color }} className="font-bold">{winner.name}</span> rules the isles.
          </p>
        )}
        <div className="my-4"><FacetRule /></div>
        <div className="space-y-1.5">
          {ranked.map((t, i) => (
            <div
              key={t.index}
              className="flex items-center justify-between rounded-md border-l-4 bg-white/5 px-3 py-1.5 text-sm"
              style={{ borderLeftColor: t.color, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }}
            >
              <span className="flex items-center gap-2 text-slate-200">
                <span className="font-mono text-xs text-slate-500">#{i + 1}</span>
                <span className="h-2.5 w-2.5 rotate-45" style={{ background: t.color }} />
                <span className="font-display font-bold">{t.name}</span>
                {!t.alive && <span className="text-[10px] text-red-400">fallen</span>}
              </span>
              <span className="font-mono text-slate-300">{t.score}</span>
            </div>
          ))}
        </div>
        <Button onClick={() => g.toMenu()} className="mt-5 w-full bg-amber-400 font-display font-black tracking-wider text-[#1b1b3f] shadow-[0_0_24px_rgba(255,185,56,0.35)] hover:bg-amber-300">
          Play Again
        </Button>
      </div>
    </div>
  );
}
