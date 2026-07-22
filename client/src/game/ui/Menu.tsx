// Polyforge main menu & game-over — Isoglow field-HUD: luminous board glow,
// edge-framed layout, tribe-color accents, four-point spark motifs, faceted separators.
import { useState } from "react";
import { useGame } from "../useGame";
import { game, loadHall, HallEntry } from "../core/state";
import { TRIBE_DEFS, Difficulty } from "../core/types";
import { MAP_PRESETS, MapPreset } from "../core/mapgen";
import { Button } from "@/components/ui/button";
import { Swords, Star, Play, Trophy, ChevronDown } from "lucide-react";
import { Users, User } from "lucide-react";
import { Award, Shield, Flag, Zap, Landmark, Skull, Coins, Flame, Lock } from "lucide-react";
import { ACHIEVEMENTS, loadAchievements, AchievementDef } from "../core/achievements";
import { MuteButton } from "./MuteButton";
import { sound } from "../sound";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";

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

const ACH_ICONS: Record<AchievementDef["icon"], React.ComponentType<{ className?: string }>> = {
  trophy: Trophy, shield: Shield, flag: Flag, zap: Zap,
  landmark: Landmark, skull: Skull, coins: Coins, flame: Flame,
};

/** Achievement grid — shared between the menu panel and the game-over screen */
function AchievementGrid({ unlocked }: { unlocked: Set<string> }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ACHIEVEMENTS.map((a) => {
        const got = unlocked.has(a.id);
        const Icon = ACH_ICONS[a.icon];
        return (
          <div
            key={a.id}
            className={`flex items-start gap-2 rounded-md px-2.5 py-2 ${got ? "bg-amber-400/10" : "bg-white/[0.04]"}`}
            style={{ boxShadow: got ? "inset 0 0 0 1px rgba(255,185,56,0.35)" : "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            <span className={`mt-0.5 shrink-0 ${got ? "text-amber-400" : "text-slate-600"}`}>
              {got ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </span>
            <span>
              <span className={`block font-display text-[11px] font-bold ${got ? "text-amber-200" : "text-slate-400"}`}>{a.name}</span>
              <span className={`block text-[10px] leading-tight ${got ? "text-slate-300" : "text-slate-500"}`}>{a.desc}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MainMenu() {
  const g = useGame();
  const [faction, setFaction] = useState(0);
  const [mode, setMode] = useState<"solo" | "hotseat">("solo");
  const [players, setPlayers] = useState<number[]>([0, 1]); // hot-seat: selected tribe indices in seat order
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [size, setSize] = useState(11);
  const [preset, setPreset] = useState<MapPreset>("continents");
  const [hallOpen, setHallOpen] = useState(false);
  const [hallTab, setHallTab] = useState<Difficulty>("normal");
  const [hall] = useState(() => loadHall());
  const [achOpen, setAchOpen] = useState(false);
  const [achievements] = useState(() => loadAchievements());
  const tribe = TRIBE_DEFS[faction];
  const saved = game.savedSummary();
  const hallCount = (["easy", "normal", "hard"] as Difficulty[]).reduce((n, d) => n + (hall[d]?.length ?? 0), 0);
  const togglePlayer = (i: number) => {
    setPlayers((prev) => {
      if (prev.includes(i)) return prev.length > 2 ? prev.filter((p) => p !== i) : prev; // keep ≥2
      return prev.length < 4 ? [...prev, i] : prev;
    });
  };
  const startGame = () => {
    sound.play("click");
    if (mode === "hotseat") {
      g.newGame({ size, humanTribe: Math.min(...players), difficulty, preset, humanTribes: players });
    } else {
      g.newGame({ size, humanTribe: faction, difficulty, preset });
    }
  };

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

      {/* sound toggle */}
      <div className="absolute right-6 top-6 z-30"><MuteButton /></div>

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
            <Spark className="h-3 w-3" /> {mode === "solo" ? "Choose your faction" : "Choose 2–4 player factions"}
          </p>
          {/* game mode: solo vs pass-and-play */}
          <div className="mb-3 flex gap-1">
            {([["solo", "Solo vs AI", User], ["hotseat", "Pass & Play", Users]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 font-display text-xs font-bold transition-colors ${mode === id ? "border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(255,185,56,0.25)]" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TRIBE_DEFS.map((t, i) => (
              <button
                key={t.name}
                onClick={() => (mode === "solo" ? setFaction(i) : togglePlayer(i))}
                className={`relative overflow-hidden rounded-md border-l-4 p-3 text-left transition-all duration-150 active:scale-[0.97] ${(mode === "solo" ? faction === i : players.includes(i)) ? "bg-white/10" : "bg-white/[0.04] hover:bg-white/10"}`}
                style={{
                  borderLeftColor: t.color,
                  boxShadow: (mode === "solo" ? faction === i : players.includes(i)) ? `0 0 18px ${t.color}44, inset 0 0 0 1px ${t.color}66` : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                {(mode === "solo" ? faction === i : players.includes(i)) && (
                  <Spark className="absolute right-2 top-2 h-3 w-3" style={{ color: t.color }} />
                )}
                {mode === "hotseat" && players.includes(i) && (
                  <span className="absolute bottom-2 right-2 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">P{players.indexOf(i) + 1}</span>
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

          {/* World type — map generation preset */}
          <div className="mt-4 w-full">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <span className="h-1 w-1 rotate-45 bg-sky-400" /> World type
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {MAP_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  title={p.blurb}
                  className={`rounded-md border px-2 py-1.5 text-center transition-colors ${preset === p.id ? "border-sky-400 bg-sky-400/20 shadow-[0_0_12px_rgba(56,189,248,0.25)]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                >
                  <span className={`block font-display text-xs font-bold ${preset === p.id ? "text-sky-200" : "text-slate-300"}`}>{p.name}</span>
                  <span className="block text-[9px] leading-tight text-slate-400">{p.blurb}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          size="lg"
          onClick={startGame}
          className="mt-5 w-full gap-2 rounded-lg bg-amber-400 py-6 font-display text-lg font-black tracking-widest text-[#1b1b3f] shadow-[0_0_40px_rgba(255,185,56,0.4)] transition-transform hover:bg-amber-300 active:scale-[0.98]"
        >
          <Swords className="h-5 w-5" /> {mode === "solo" ? "BEGIN CONQUEST" : `BEGIN — ${players.length} PLAYERS${players.length < 4 ? ` + ${4 - players.length} AI` : ""}`}
        </Button>
        {saved && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => game.continueGame()}
            className="mt-2.5 w-full gap-2 rounded-lg border-2 border-emerald-400/60 bg-emerald-400/10 py-5 font-display text-sm font-black tracking-widest text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.2)] transition-transform hover:bg-emerald-400/20 active:scale-[0.98]"
          >
            <Play className="h-4 w-4" /> CONTINUE — {saved.tribeName}, TURN {saved.turn} ({saved.difficulty})
          </Button>
        )}

        {/* Hall of Conquest — best victories per difficulty */}
        <div className="mt-3 w-full">
          <button
            onClick={() => setHallOpen(!hallOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-white/10 active:scale-[0.98]"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Hall of Conquest
            {hallCount > 0 && <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">{hallCount}</span>}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${hallOpen ? "rotate-180" : ""}`} />
          </button>
          {hallOpen && (
            <div className="mt-2 rounded-lg border border-white/10 bg-[#10102c]/85 p-3 backdrop-blur-md">
              <div className="mb-2 flex gap-1">
                {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setHallTab(d)}
                    className={`flex-1 rounded-md border px-2 py-1 font-display text-[11px] font-bold capitalize transition-colors ${hallTab === d ? "border-amber-400 bg-amber-400/20 text-amber-200" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                    {d} {(hall[d]?.length ?? 0) > 0 && <span className="font-mono text-[9px] opacity-70">({hall[d]!.length})</span>}
                  </button>
                ))}
              </div>
              {(hall[hallTab]?.length ?? 0) === 0 ? (
                <p className="py-3 text-center text-[11px] text-slate-400">
                  No victories on {hallTab} yet — the isles await a conqueror.
                </p>
              ) : (
                <div className="space-y-1">
                  {hall[hallTab]!.map((e: HallEntry, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-white/5 px-2.5 py-1.5 text-[11px]" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
                      <span className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] ${i === 0 ? "text-amber-400" : "text-slate-500"}`}>#{i + 1}</span>
                        <span className="font-display font-bold text-slate-200">{e.faction}</span>
                        <span className="text-slate-500">{e.mapSize}×{e.mapSize}</span>
                      </span>
                      <span className="flex items-center gap-2.5 font-mono text-slate-300">
                        <span className="text-emerald-300">T{e.turns}</span>
                        <span>{e.score}</span>
                        <span className="text-[9px] text-slate-500">{e.date}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Achievements — feats of the solo campaign */}
        <div className="mt-2 w-full">
          <button
            onClick={() => setAchOpen(!achOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-white/10 active:scale-[0.98]"
          >
            <Award className="h-3.5 w-3.5 text-amber-400" />
            Achievements
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">{achievements.size}/{ACHIEVEMENTS.length}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${achOpen ? "rotate-180" : ""}`} />
          </button>
          {achOpen && (
            <div className="mt-2 rounded-lg border border-white/10 bg-[#10102c]/85 p-3 backdrop-blur-md">
              <AchievementGrid unlocked={achievements} />
            </div>
          )}
        </div>
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
  const hotseat = (s.humanTribes?.length ?? 1) > 1;
  const won = hotseat
    ? s.winner !== null && (s.humanTribes ?? []).includes(s.winner)
    : s.winner === s.humanTribe;
  const ranked = [...s.tribes].sort((a, b) => b.score - a.score);
  // score trajectory data: one row per recorded turn
  const history = s.scoreHistory ?? [];
  const chartData = history.map((row, turn) => {
    const d: Record<string, number> = { turn: turn + 1 };
    s.tribes.forEach((t, i) => { d[t.name] = row[i] ?? 0; });
    return d;
  });
  // include the final scores as a last point
  if (s.tribes.length > 0) {
    const last: Record<string, number> = { turn: history.length + 1 };
    s.tribes.forEach((t) => { last[t.name] = t.alive ? t.score : 0; });
    chartData.push(last);
  }
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#141433]/90 p-4 backdrop-blur-sm">
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg border-2 bg-[#10102c] p-6 text-center shadow-2xl"
        style={{ borderColor: won ? "#ffb93877" : "rgba(255,255,255,0.12)", boxShadow: won ? "0 0 60px rgba(255,185,56,0.25)" : undefined }}
      >
        <div className="mb-2 flex justify-center"><Spark className={`h-5 w-5 ${won ? "text-amber-400" : "text-slate-500"}`} /></div>
        <h2 className={`font-display text-4xl font-black tracking-wide ${won ? "text-amber-400 drop-shadow-[0_0_20px_rgba(255,185,56,0.5)]" : "text-slate-300"}`}>
          {hotseat && won && winner ? `${winner.name.toUpperCase()} WINS` : won ? "VICTORY" : "DEFEAT"}
        </h2>
        {winner && (
          <p className="mt-2 text-sm text-slate-300">
            <span style={{ color: winner.color }} className="font-bold">{winner.name}</span> rules the isles.
          </p>
        )}
        {won && game.newHallEntry && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-[11px] font-bold text-amber-300">
            <Trophy className="h-3 w-3" /> New Hall of Conquest record!
          </p>
        )}
        {game.newAchievements.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {game.newAchievements.map((a) => {
              const Icon = ACH_ICONS[a.icon];
              return (
                <div key={a.id} className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5">
                  <Icon className="h-4 w-4 text-amber-400" />
                  <span className="font-display text-xs font-bold text-amber-200">Achievement unlocked: {a.name}</span>
                </div>
              );
            })}
          </div>
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
        {chartData.length > 1 && (
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-2 pt-3">
            <p className="mb-1 text-left font-display text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Score trajectory
            </p>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="turn"
                  tick={{ fill: "#8b8fb8", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                  tickLine={false}
                  label={{ value: "turn", position: "insideBottomRight", fill: "#666a94", fontSize: 9, dy: 2 }}
                />
                <YAxis tick={{ fill: "#8b8fb8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{
                    background: "#191940", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8, fontSize: 11, color: "#e2e4f5",
                  }}
                  labelFormatter={(l: unknown) => `Turn ${l}`}
                />
                {s.tribes.map((t) => (
                  <Line
                    key={t.index}
                    type="monotone"
                    dataKey={t.name}
                    stroke={t.color}
                    strokeWidth={t.index === s.humanTribe ? 2.5 : 1.5}
                    dot={false}
                    strokeOpacity={t.index === s.humanTribe ? 1 : 0.75}
                  />
                ))}
            </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {s.stats && s.stats.length > 0 && (
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-2 pt-3">
            <p className="mb-2 text-left font-display text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Match statistics
            </p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-1 text-left font-normal"></th>
                  {s.tribes.map((t) => (
                    <th key={t.index} className="pb-1 text-right font-normal">
                      <span
                        className={`inline-block h-2 w-2 rotate-45 ${t.index === s.humanTribe ? "ring-1 ring-white/60" : ""}`}
                        style={{ background: t.color }}
                        title={t.name}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {([
                  ["Battles won", "battlesWon"],
                  ["Units lost", "unitsLost"],
                  ["Stars earned", "starsEarned"],
                  ["Ruins claimed", "ruinsClaimed"],
                  ["Cities captured", "citiesCaptured"],
                  ["Techs researched", "techsResearched"],
                ] as const).map(([label, key]) => (
                  <tr key={key} className="border-t border-white/5">
                    <td className="py-1 text-left text-slate-400">{label}</td>
                    {s.tribes.map((t) => (
                      <td
                        key={t.index}
                        className={`py-1 text-right font-mono ${t.index === s.humanTribe ? "font-bold text-slate-100" : ""}`}
                      >
                        {s.stats[t.index]?.[key] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button onClick={() => g.toMenu()} className="mt-5 w-full bg-amber-400 font-display font-black tracking-wider text-[#1b1b3f] shadow-[0_0_24px_rgba(255,185,56,0.35)] hover:bg-amber-300">
          Play Again
        </Button>
      </div>
    </div>
  );
}
