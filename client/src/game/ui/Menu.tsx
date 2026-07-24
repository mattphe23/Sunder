// Sunder: The Living Forge — main menu & game-over. Isoglow field-HUD: luminous board glow,
// edge-framed layout, tribe-color accents, four-point spark motifs, faceted separators.
import { useState } from "react";
import { useGame } from "../useGame";
import { game, loadHall, HallEntry } from "../core/state";
import { TRIBE_DEFS, PREMIUM_TRIBES, Difficulty } from "../core/types";
import { MAP_PRESETS, MapPreset } from "../core/mapgen";
import { Button } from "@/components/ui/button";
import { Swords, Star, Play, Trophy, ChevronDown, Crown } from "lucide-react";
import { Users, User } from "lucide-react";
import { Award, Shield, Flag, Zap, Landmark, Skull, Coins, Flame, Lock } from "lucide-react";
import { ACHIEVEMENTS, loadAchievements, AchievementDef } from "../core/achievements";
import { dailyChallenge, weeklyChallenge, currentScore, ChallengeSetup, buildResultCard } from "../core/challenges";
import { readFriendChallengeFromUrl, friendChallengeUrl, FriendChallenge } from "../core/challenges";
import { CalendarDays, Repeat } from "lucide-react";
import { Link2, Check, X, Swords as SwordsIcon, ClipboardCopy } from "lucide-react";
import { LORE_TEASERS } from "./FactionIntro";
import { MuteButton } from "./MuteButton";
import { sound } from "../sound";
import { ReplayViewer } from "./Replay";
import { TribeForge } from "./TribeForge";
import { loadCustomTribe, CustomTribeConfig, CUSTOM_DEF_INDEX } from "../core/customTribe";
import { Hammer } from "lucide-react";
import { loadProfile, setProfileName, PlayerProfile } from "../core/profile";
import { UserCircle, Pencil } from "lucide-react";
import { OnlinePanel } from "../online/OnlinePanel";
import { LeaderboardPanel, LeaderboardSubmit } from "../online/Leaderboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { SkinsPanel, initActiveSkins } from "./SkinsPanel";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { FlaskConical } from "lucide-react";
import { Sparkles, Paintbrush, BookOpen } from "lucide-react";
import { EpilogueCard, epilogueSeen, markEpilogueSeen } from "./Epilogue";
import { missionById } from "@shared/story";
import { MAP_PACKS, CuratedMap } from "@shared/mapPacks";
import { Map as MapIcon } from "lucide-react";

/** Admin-only entry to the AI Playtest Lab; renders nothing for everyone else. */
function AdminLabLink() {
  const { user } = useAuth();
  if (user?.role !== "admin") return null;
  return (
    <Link href="/playtest-lab">
      <span className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[12px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/20">
        <FlaskConical className="h-3.5 w-3.5" />
        AI Playtest Lab
        <span className="text-[10px] font-normal text-amber-200/60">admin</span>
      </span>
    </Link>
  );
}

/** Premium curated maps — seed-locked boards sold in packs. Owned packs expand
 *  into a playable map list; unowned ones deep-link to the store. */
function CuratedMapsSection({ onPlay }: { onPlay: (m: CuratedMap) => void }) {
  const ent = useEntitlements();
  const [open, setOpen] = useState(false);
  const ownedCount = MAP_PACKS.filter((p) => ent.has(p.key)).length;
  return (
    <div className="mt-4 w-full">
      <button
        onClick={() => { sound.play("click"); setOpen((o) => !o); }}
        className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <MapIcon className="h-3 w-3 text-violet-300" /> Curated maps
          <span className="rounded bg-violet-400/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-violet-200">
            {ownedCount}/{MAP_PACKS.length} packs
          </span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {MAP_PACKS.map((pack) => {
            const owned = ent.has(pack.key);
            return (
              <div key={pack.key} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <span className="font-display text-[11px] font-extrabold uppercase tracking-wide text-slate-200">{pack.name}</span>
                  {!owned && (
                    <Link href="/store">
                      <span className="flex cursor-pointer items-center gap-1 rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-300 hover:bg-amber-400/25">
                        <Lock className="h-2.5 w-2.5" /> Unlock in Store
                      </span>
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {pack.maps.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { if (owned) onPlay(m); else { sound.play("click"); window.location.href = "/store"; } }}
                      title={m.blurb}
                      className={`rounded-md border px-2 py-1.5 text-left transition-colors ${owned ? "border-violet-400/30 bg-violet-400/10 hover:bg-violet-400/20 active:scale-[0.97]" : "border-white/10 bg-white/5 opacity-60 hover:bg-white/10"}`}
                    >
                      <span className={`block truncate font-display text-[11px] font-bold ${owned ? "text-violet-100" : "text-slate-400"}`}>
                        {owned ? m.name : <><Lock className="mr-1 inline h-2.5 w-2.5" />{m.name}</>}
                      </span>
                      <span className="block truncate text-[9px] leading-tight text-slate-400">{m.size}×{m.size} · {m.preset}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";

const MENU_BG = "/manus-storage/menu-bg_b1164e9a.png";
const LOGO = "/manus-storage/sunder-mark_d1dbf156.png";
const WORDMARK = "/manus-storage/sunder-wordmark_36e4517b.png";

/** Four-point spark — Sunder's signature motif */
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [daily] = useState(() => dailyChallenge());
  const [weekly] = useState(() => weeklyChallenge());
  const [friend, setFriend] = useState<FriendChallenge | null>(() => readFriendChallengeFromUrl());
  const dailyBest = currentScore("daily");
  const weeklyBest = currentScore("weekly");
  const [slot, setSlot] = useState(() => game.activeSlot);
  const slots = game.slotSummaries();
  const [forgeOpen, setForgeOpen] = useState(false);
  const [custom, setCustom] = useState<CustomTribeConfig | null>(() => loadCustomTribe());
  const [skinsOpen, setSkinsOpen] = useState(false);
  const ent = useEntitlements();
  // apply saved skin selections (validated against ownership) to the renderer
  useEffect(() => {
    if (!ent.loading) initActiveSkins(ent.keys);
  }, [ent.loading, ent.keys.join(",")]);
  /** premium tribe defs are locked until the entitlement (or ultimate) is owned */
  const tribeLocked = (i: number) => i in PREMIUM_TRIBES && !ent.has(PREMIUM_TRIBES[i]);
  const tribe = faction === CUSTOM_DEF_INDEX && custom
    ? { name: custom.name, color: custom.color }
    : TRIBE_DEFS[Math.min(faction, TRIBE_DEFS.length - 1)];
  const saved = game.savedSummary();
  const hallCount = (["easy", "normal", "hard", "impossible"] as Difficulty[]).reduce((n, d) => n + (hall[d]?.length ?? 0), 0);
  const pickSlot = (n: 1 | 2 | 3) => {
    sound.play("click");
    setSlot(n);
    game.setActiveSlot(n);
  };
  const togglePlayer = (i: number) => {
    setPlayers((prev) => {
      if (prev.includes(i)) return prev.length > 2 ? prev.filter((p) => p !== i) : prev; // keep ≥2
      return prev.length < 4 ? [...prev, i] : prev;
    });
  };
  const startGame = () => {
    sound.play("click");
    // Roster: 4 of the 6 tribes play a match. Humans keep their picked defs;
    // AI slots are filled from remaining defs at random for match variety.
    const humanDefs = mode === "hotseat" ? [...players] : [faction];
    // AI opponents draw from the 6 standard tribes only — premium tribes stay
    // player-exclusive so an unlock feels special (and unowned ones never appear).
    const rest = TRIBE_DEFS.map((_, i) => i).filter((i) => !humanDefs.includes(i) && i !== CUSTOM_DEF_INDEX && !(i in PREMIUM_TRIBES));
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    // custom tribe (defIndex CUSTOM_DEF_INDEX) occupies a roster slot; its def is injected in newGame
    const roster = [...humanDefs, ...rest].slice(0, 4).map((d) => (d === CUSTOM_DEF_INDEX ? 0 : d));
    const customSlot = [...humanDefs, ...rest].slice(0, 4).indexOf(CUSTOM_DEF_INDEX);
    const humanSlots = humanDefs.map((d) => [...humanDefs, ...rest].slice(0, 4).indexOf(d)).sort((a, b) => a - b);
    const customOpt = customSlot >= 0 && custom ? { slot: customSlot, config: custom } : undefined;
    if (mode === "hotseat") {
      g.newGame({ size, humanTribe: humanSlots[0], difficulty, preset, humanTribes: humanSlots, roster, custom: customOpt });
    } else {
      g.newGame({ size, humanTribe: humanSlots[0], difficulty, preset, roster, custom: customOpt });
    }
  };
  const startChallenge = (c: ChallengeSetup) => {
    sound.play("click");
    g.newGame({
      size: c.size, humanTribe: c.faction, difficulty: c.difficulty,
      seed: c.seed, preset: c.preset, challenge: c.kind,
    });
  };
  const startFriendChallenge = () => {
    if (!friend) return;
    sound.play("click");
    // rebuild the exact same match: same seed/preset/size/difficulty, and the
    // challenger's tribe def leads the roster so you play the identical seat
    const rest = TRIBE_DEFS.map((_, i) => i).filter((i) => i !== friend.tribe && i !== CUSTOM_DEF_INDEX);
    const roster = [friend.tribe, ...rest].slice(0, 4);
    g.newGame({
      size: friend.size, humanTribe: 0, difficulty: friend.difficulty,
      seed: friend.seed, preset: friend.preset as MapPreset, roster,
      friendChallenge: { name: friend.name, score: friend.score },
    });
  };
  const dismissFriend = () => {
    setFriend(null);
    try { window.history.replaceState({}, "", window.location.pathname); } catch { /* noop */ }
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
        <img src={LOGO} alt="" className="mb-3 h-24 w-24 drop-shadow-[0_0_36px_rgba(255,150,40,0.5)]" />
        <h1 className="m-0">
          <img
            src={WORDMARK}
            alt="SUNDER"
            className="h-14 w-auto max-w-[320px] object-contain drop-shadow-[0_2px_18px_rgba(226,98,43,0.35)] sm:h-16"
          />
        </h1>
        <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.35em] text-amber-300/90">
          — The Living Forge —
        </p>
        <p className="mt-3 text-center font-display text-sm font-black uppercase tracking-[0.14em]">
          <span className="text-slate-100">Build.</span>{" "}
          <span className="text-orange-400">Conquer.</span>{" "}
          <span className="text-teal-300">Reforge.</span>
        </p>
        <p className="mt-1.5 text-center text-[13px] font-medium text-slate-300">
          Outthink rival powers in the Shatterlands — a world split apart, waiting to be forged anew.
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
                onClick={() => {
                  if (tribeLocked(i)) { sound.play("click"); window.location.href = "/store"; return; }
                  mode === "solo" ? setFaction(i) : togglePlayer(i);
                }}
                className={`group relative overflow-hidden rounded-md border-l-4 p-3 text-left transition-all duration-150 active:scale-[0.97] ${(mode === "solo" ? faction === i : players.includes(i)) ? "bg-white/10" : "bg-white/[0.04] hover:bg-white/10"}`}
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
                {i in PREMIUM_TRIBES && (
                  <span
                    className="absolute right-2 top-2 flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: `${t.color}26`, color: t.color }}
                  >
                    {tribeLocked(i) ? <Lock className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
                    {tribeLocked(i) ? "Store" : "Premium"}
                  </span>
                )}
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-3 w-3 rotate-45" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                  <span className={`font-display text-sm font-extrabold tracking-wide ${tribeLocked(i) ? "text-slate-400" : "text-white"}`}>{t.name}</span>
                </div>
                <p className="text-[11px] leading-snug text-slate-300">{t.passiveDesc}</p>
                {/* v19: lore teaser — slides in on hover/focus (desktop); harmless on touch */}
                <span
                  className="pointer-events-none absolute inset-0 flex flex-col justify-center bg-[#0d0d24]/95 px-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: t.color }}>
                    {LORE_TEASERS[i]?.title}
                  </span>
                  <span className="mt-0.5 text-[10.5px] italic leading-snug text-indigo-100/85">
                    {LORE_TEASERS[i]?.teaser}
                  </span>
                </span>
              </button>
            ))}
            {/* Tribe Forge — custom tribe card */}
            {custom ? (
              <button
                onClick={() => (mode === "solo" ? setFaction(CUSTOM_DEF_INDEX) : togglePlayer(CUSTOM_DEF_INDEX))}
                className={`relative overflow-hidden rounded-md border-l-4 p-3 text-left transition-all duration-150 active:scale-[0.97] ${(mode === "solo" ? faction === CUSTOM_DEF_INDEX : players.includes(CUSTOM_DEF_INDEX)) ? "bg-white/10" : "bg-white/[0.04] hover:bg-white/10"}`}
                style={{
                  borderLeftColor: custom.color,
                  boxShadow: (mode === "solo" ? faction === CUSTOM_DEF_INDEX : players.includes(CUSTOM_DEF_INDEX)) ? `0 0 18px ${custom.color}44, inset 0 0 0 1px ${custom.color}66` : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                {(mode === "solo" ? faction === CUSTOM_DEF_INDEX : players.includes(CUSTOM_DEF_INDEX)) && (
                  <Spark className="absolute right-2 top-2 h-3 w-3" style={{ color: custom.color }} />
                )}
                {mode === "hotseat" && players.includes(CUSTOM_DEF_INDEX) && (
                  <span className="absolute bottom-2 right-2 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">P{players.indexOf(CUSTOM_DEF_INDEX) + 1}</span>
                )}
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-3 w-3 rotate-45" style={{ background: custom.color, boxShadow: `0 0 8px ${custom.color}` }} />
                  <span className="font-display text-sm font-extrabold tracking-wide text-white">{custom.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); sound.play("click"); setForgeOpen(true); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setForgeOpen(true); } }}
                    className="ml-auto rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"
                    aria-label="Edit custom tribe"
                  >
                    <Hammer className="h-3 w-3" />
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-slate-300">Forged — your custom tribe</p>
              </button>
            ) : (
              <button
                onClick={() => { sound.play("click"); setForgeOpen(true); }}
                className="relative flex flex-col items-start justify-center gap-1 rounded-md border border-dashed border-amber-400/40 bg-amber-400/[0.06] p-3 text-left transition-all duration-150 hover:bg-amber-400/10 active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <Hammer className="h-3.5 w-3.5 text-amber-300" />
                  <span className="font-display text-sm font-extrabold tracking-wide text-amber-200">Tribe Forge</span>
                </div>
                <p className="text-[11px] leading-snug text-slate-400">Create your own tribe — pick a passive, signature unit & banner</p>
              </button>
            )}
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                <span className="h-1 w-1 rotate-45 bg-amber-400" /> Difficulty
              </p>
              <div className="flex gap-1">
                {(["easy", "normal", "hard", "impossible"] as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    title={d === "impossible" ? "A ruthless AI brain: threat maps, coordinated strikes, no mercy. It gets NO resource cheats — it simply plays better." : undefined}
                    className={`flex-1 rounded-md border px-2 py-1.5 font-display text-xs font-bold capitalize transition-colors ${difficulty === d ? (d === "impossible" ? "border-red-400 bg-red-400/20 text-red-200 shadow-[0_0_12px_rgba(248,113,113,0.3)]" : "border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(255,185,56,0.25)]") : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
                    {d === "impossible" ? "☠ Imposs." : d}
                  </button>
                ))}
              </div>
              {difficulty === "impossible" && (
                <p className="mt-1.5 text-[10px] leading-snug text-red-300/90">
                  ☠ The Impossible AI hunts with threat maps and strikes in coordinated war
                  parties. No cheats — it just plays better. Few survive.
                </p>
              )}
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

          {/* Curated map packs — premium seed-locked boards */}
          <CuratedMapsSection
            onPlay={(m) => {
              sound.play("click");
              const humanDefs = mode === "hotseat" ? [...players] : [faction];
              const rest = TRIBE_DEFS.map((_, i) => i).filter((i) => !humanDefs.includes(i) && i !== CUSTOM_DEF_INDEX && !(i in PREMIUM_TRIBES));
              for (let i = rest.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rest[i], rest[j]] = [rest[j], rest[i]];
              }
              const roster = [...humanDefs, ...rest].slice(0, 4).map((d) => (d === CUSTOM_DEF_INDEX ? 0 : d));
              const customSlot = [...humanDefs, ...rest].slice(0, 4).indexOf(CUSTOM_DEF_INDEX);
              const humanSlots = humanDefs.map((d) => [...humanDefs, ...rest].slice(0, 4).indexOf(d)).sort((a, b) => a - b);
              const customOpt = customSlot >= 0 && custom ? { slot: customSlot, config: custom } : undefined;
              g.newGame({
                size: m.size, humanTribe: humanSlots[0], difficulty, seed: m.seed,
                preset: m.preset, roster, custom: customOpt,
                ...(mode === "hotseat" ? { humanTribes: humanSlots } : {}),
              });
            }}
          />
        </div>

        <Button
          size="lg"
          onClick={startGame}
          className="mt-5 w-full gap-2 rounded-lg bg-amber-400 py-6 font-display text-lg font-black tracking-widest text-[#1b1b3f] shadow-[0_0_40px_rgba(255,185,56,0.4)] transition-transform hover:bg-amber-300 active:scale-[0.98]"
        >
          <Swords className="h-5 w-5" /> {mode === "solo" ? "BEGIN CONQUEST" : `BEGIN — ${players.length} PLAYERS${players.length < 4 ? ` + ${4 - players.length} AI` : ""}`}
        </Button>
        {/* Save slots — three named files so solo and hot-seat campaigns coexist */}
        <div className="mt-2.5 grid w-full grid-cols-3 gap-1.5">
          {([1, 2, 3] as const).map((n) => {
            const info = slots[n - 1];
            const active = slot === n;
            return (
              <button
                key={n}
                onClick={() => pickSlot(n)}
                className={`min-h-[52px] rounded-lg border px-2 py-1.5 text-left transition-colors active:scale-[0.97] ${active ? "border-amber-400/70 bg-amber-400/10 shadow-[0_0_14px_rgba(255,185,56,0.2)]" : "border-white/10 bg-white/[0.04] hover:bg-white/10"}`}
              >
                <span className={`block font-display text-[10px] font-bold uppercase tracking-widest ${active ? "text-amber-300" : "text-slate-400"}`}>
                  Slot {n}
                </span>
                {info ? (
                  <span className="block truncate text-[10px] leading-tight text-slate-300">
                    {info.hotseat ? `${info.players}P · ` : ""}{info.tribeName}
                    <span className="text-slate-500"> · T{info.turn}</span>
                  </span>
                ) : (
                  <span className="block text-[10px] italic leading-tight text-slate-500">Empty</span>
                )}
              </button>
            );
          })}
        </div>
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
          {/* v16: friend challenge — arrived via a shared ?c= link */}
          {friend && (
            <button
              onClick={startFriendChallenge}
              className="relative mb-1.5 block w-full overflow-hidden rounded-lg border-2 border-amber-400/60 bg-amber-400/10 p-3 text-left shadow-[0_0_24px_rgba(255,185,56,0.2)] transition-colors hover:bg-amber-400/20 active:scale-[0.98]"
            >
              <span
                onClick={(e) => { e.stopPropagation(); dismissFriend(); }}
                className="absolute right-2 top-2 cursor-pointer text-slate-400 hover:text-slate-200"
                aria-label="Dismiss challenge"
              >
                ✕
              </span>
              <span className="flex items-center gap-1.5 font-display text-xs font-black uppercase tracking-wider text-amber-300">
                <SwordsIcon className="h-4 w-4" /> {friend.name} challenges you!
              </span>
              <span className="mt-1 block text-[11px] leading-tight text-slate-200">
                Beat their score of <span className="font-mono font-bold text-amber-300">{friend.score}</span
                > on the same map — {TRIBE_DEFS[friend.tribe]?.name ?? "?"} · {friend.preset} {friend.size}×{friend.size} · {friend.difficulty}
                {friend.won ? ` · they won in ${friend.turns} turns` : " · they fell short of victory"}
              </span>
              <span className="mt-1.5 inline-block rounded bg-amber-400 px-2 py-0.5 font-display text-[10px] font-black tracking-widest text-[#1b1b3f]">
                ACCEPT THE DUEL
              </span>
            </button>
          )}
          {/* Challenges — shared seeded maps: daily sprint & weekly optimization */}
          <div className="mb-1 grid w-full grid-cols-2 gap-1.5">
            {([
              [daily, dailyBest, CalendarDays, "text-cyan-300", "border-cyan-400/30", "Daily Challenge"],
              [weekly, weeklyBest, Repeat, "text-violet-300", "border-violet-400/30", "Weekly Challenge"],
            ] as const).map(([c, best, Icon, iconCls, borderCls, title]) => (
              <button
                key={c.kind}
                onClick={() => startChallenge(c)}
                className={`rounded-lg border ${borderCls} bg-white/[0.04] p-2.5 text-left transition-colors hover:bg-white/10 active:scale-[0.97]`}
              >
                <span className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  <Icon className={`h-3.5 w-3.5 ${iconCls}`} /> {title}
                </span>
                <span className="mt-1 block text-[10px] leading-tight text-slate-400">
                  {c.label} · {TRIBE_DEFS[c.faction].name} · {c.preset} {c.size}×{c.size} · {c.difficulty}
                </span>
                <span className="mt-1 flex items-center justify-between text-[10px]">
                  <span className={best ? "font-mono font-bold text-amber-300" : "text-slate-500"}>
                    {best ? `Best ${best.score}${c.kind === "weekly" ? ` · ${best.attempts} tries` : ""}` : "Not attempted"}
                  </span>
                  <span className="text-slate-500">resets {c.resetsIn}</span>
                </span>
              </button>
            ))}
          </div>
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
                {(["easy", "normal", "hard", "impossible"] as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setHallTab(d)}
                    className={`flex-1 rounded-md border px-2 py-1 font-display text-[11px] font-bold capitalize transition-colors ${hallTab === d ? (d === "impossible" ? "border-red-400 bg-red-400/20 text-red-200" : "border-amber-400 bg-amber-400/20 text-amber-200") : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                    {d === "impossible" ? "☠" : d} {(hall[d]?.length ?? 0) > 0 && <span className="font-mono text-[9px] opacity-70">({hall[d]!.length})</span>}
                  </button>
                ))}
              </div>
              {(hall[hallTab]?.length ?? 0) === 0 ? (
                <p className="py-3 text-center text-[11px] text-slate-400">
                  No victories on {hallTab} yet — the Shatterlands await a conqueror.
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

        {/* v17: Commander's Record — persistent local profile with lifetime stats */}
        <div className="mt-2 w-full">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-white/10 active:scale-[0.98]"
          >
            <UserCircle className="h-3.5 w-3.5 text-amber-400" />
            Commander&apos;s Record
            {profile.games > 0 && (
              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                {profile.wins}W / {profile.games}G
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
          </button>
          {profileOpen && (
            <div className="mt-2 rounded-lg border border-white/10 bg-[#10102c]/85 p-3 backdrop-blur-md">
              {/* name row */}
              <div className="mb-2.5 flex items-center justify-between gap-2">
                {editingName ? (
                  <form
                    className="flex flex-1 items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setProfile(setProfileName(nameDraft || "Commander"));
                      setEditingName(false);
                    }}
                  >
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={20}
                      placeholder="Your commander name"
                      className="w-full flex-1 rounded-md border border-amber-400/40 bg-white/5 px-2 py-1 font-display text-sm font-bold text-slate-100 outline-none placeholder:text-slate-500"
                    />
                    <button type="submit" className="rounded bg-amber-400 px-2 py-1 font-display text-[10px] font-black tracking-widest text-[#1b1b3f] active:scale-95">SAVE</button>
                  </form>
                ) : (
                  <>
                    <span className="font-display text-sm font-black tracking-wide text-amber-200">
                      {profile.name || "Unnamed Commander"}
                      <span className="ml-2 font-sans text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">since {profile.createdAt}</span>
                    </span>
                    <button
                      onClick={() => { setNameDraft(profile.name); setEditingName(true); }}
                      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:bg-white/10 active:scale-95"
                    >
                      <Pencil className="h-3 w-3" /> {profile.name ? "Rename" : "Set name"}
                    </button>
                  </>
                )}
              </div>
              {profile.games === 0 ? (
                <p className="py-2 text-center text-[11px] text-slate-400">
                  No campaigns on record yet — your legend begins with the first march.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    ["Games", String(profile.games)],
                    ["Victories", String(profile.wins)],
                    ["Win rate", `${Math.round((profile.wins / profile.games) * 100)}%`],
                    ["Best score", String(profile.bestScore)],
                    ["Fastest win", profile.fastestWin ? `T${profile.fastestWin}` : "—"],
                    ["Duels won", String(profile.duelsWon)],
                    ["Battles won", String(profile.kills)],
                    ["Camps razed", String(profile.campsRazed)],
                    ["Heroes lost", String(profile.heroesLost)],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded-md bg-white/[0.05] px-2 py-1.5 text-center" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
                      <span className="block font-mono text-sm font-bold text-slate-100">{value}</span>
                      <span className="block text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* v18: Online Duels — sign in, create/join async 1v1 matches */}
        <OnlinePanel faction={faction} />

        {/* v19: global daily/weekly challenge leaderboard */}
        <LeaderboardPanel />

        {/* v21: admin-only AI playtest lab entry */}
        <AdminLabLink />

        {/* v27: store + skins entries */}
        <div className="mt-3 flex w-full gap-2">
          <Link href="/story" className="flex-1">
            <span className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.12]">
              <BookOpen className="h-3.5 w-3.5 text-rose-300" />
              Story
            </span>
          </Link>
          <Link href="/store" className="flex-1">
            <span className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.12]">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Store
            </span>
          </Link>
          <button
            onClick={() => { sound.play("click"); setSkinsOpen(true); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.12]"
          >
            <Paintbrush className="h-3.5 w-3.5 text-teal-300" />
            Skins
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-slate-300">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          Capture all rival capitals — or lead in score when turn 30 ends. Every faction is free and fair.
        </p>
      </div>
      {forgeOpen && (
        <TribeForge
          onClose={() => { setForgeOpen(false); setCustom(loadCustomTribe()); if (!loadCustomTribe()) { if (faction === CUSTOM_DEF_INDEX) setFaction(0); setPlayers((p) => p.filter((x) => x !== CUSTOM_DEF_INDEX).length >= 2 ? p.filter((x) => x !== CUSTOM_DEF_INDEX) : [0, 1]); } }}
          onSaved={(c) => { setCustom(c); setForgeOpen(false); if (mode === "solo") setFaction(CUSTOM_DEF_INDEX); }}
        />
      )}
      <SkinsPanel open={skinsOpen} onClose={() => setSkinsOpen(false)} />
    </div>
  );
}

export function GameOver() {
  const g = useGame();
  const s = g.state;
  const [replayOpen, setReplayOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const winner = s.winner !== null ? s.tribes[s.winner] : null;
  const hotseat = (s.humanTribes?.length ?? 1) > 1;
  const won = hotseat
    ? s.winner !== null && (s.humanTribes ?? []).includes(s.winner)
    : s.winner === s.humanTribe;
  const ranked = [...s.tribes].sort((a, b) => b.score - a.score);
  const friendRes = game.friendResult;
  const storyRes = game.storyMissionResult;
  const storyMissionDef = storyRes ? missionById(storyRes.missionId) : null;
  // Chapter II epilogue: plays once, right after the campaign finale is won
  const [epilogueOpen, setEpilogueOpen] = useState(
    () => storyRes?.missionId === "ch2-m5" && storyRes.accomplished && !epilogueSeen(),
  );
  const [, navigate] = useLocation();
  const canShare = !hotseat && s.tribes[s.humanTribe]?.defIndex !== undefined && s.tribes[s.humanTribe].defIndex !== CUSTOM_DEF_INDEX;
  const shareRun = async () => {
    sound.play("click");
    let name = "";
    try { name = localStorage.getItem("polyforge-player-name") ?? ""; } catch { /* noop */ }
    if (!name) {
      name = window.prompt("Your name (shown to your rival):", "")?.trim() ?? "";
      if (name) try { localStorage.setItem("polyforge-player-name", name); } catch { /* noop */ }
    }
    const url = friendChallengeUrl({
      name: name || "A rival",
      score: game.shareScore(),
      seed: s.seed,
      preset: s.preset,
      size: s.size,
      difficulty: s.difficulty,
      tribe: s.tribes[s.humanTribe].defIndex,
      won,
      turns: Math.max(1, s.turn),
    });
    const text = `I scored ${game.shareScore()} in Sunder: The Living Forge — beat me on the same map: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your challenge link:", url);
    }
  };
 // v19: Wordle-style result card for daily/weekly challenge runs
 const copyResult = async () => {
   sound.play("click");
   if (!s.challenge) return;
   const setup = s.challenge === "daily" ? dailyChallenge() : weeklyChallenge();
   const best = currentScore(s.challenge);
   const myScore = game.shareScore();
    // pair with the v16 friend-challenge link: same seed/preset/size, your score to beat.
    // Custom-forge tribes can't be encoded, so fall back to the plain site URL.
    let shareUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined;
    if (canShare) {
      let name = "";
      try { name = localStorage.getItem("polyforge-player-name") ?? ""; } catch { /* noop */ }
      shareUrl = friendChallengeUrl({
        name: name || "A rival",
        score: myScore,
        seed: s.seed,
        preset: s.preset,
        size: s.size,
        difficulty: s.difficulty,
        tribe: s.tribes[s.humanTribe].defIndex,
        won,
        turns: Math.max(1, s.turn),
      });
    }
   const text = buildResultCard({
     kind: s.challenge,
     label: setup.label,
     factionName: s.tribes[s.humanTribe]?.name ?? "Unknown",
     score: myScore,
     won,
     turns: Math.max(1, s.turn),
     attempts: best?.attempts ?? 1,
     isBest: game.newChallengeBest,
      url: shareUrl,
   });
    try {
      await navigator.clipboard.writeText(text);
      setResultCopied(true);
      setTimeout(() => setResultCopied(false), 2500);
    } catch {
      window.prompt("Copy your result:", text);
    }
  };
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
      {epilogueOpen && (
        <EpilogueCard onClose={() => { markEpilogueSeen(); setEpilogueOpen(false); }} />
      )}
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg border-2 bg-[#10102c] p-6 text-center shadow-2xl"
        style={{ borderColor: won ? "#ffb93877" : "rgba(255,255,255,0.12)", boxShadow: won ? "0 0 60px rgba(255,185,56,0.25)" : undefined }}
      >
        <div className="mb-2 flex justify-center"><Spark className={`h-5 w-5 ${won ? "text-amber-400" : "text-slate-500"}`} /></div>
        <h2 className={`font-display text-4xl font-black tracking-wide ${won ? "text-amber-400 drop-shadow-[0_0_20px_rgba(255,185,56,0.5)]" : "text-slate-300"}`}>
          {hotseat && won && winner ? `${winner.name.toUpperCase()} WINS` : won ? "VICTORY" : "DEFEAT"}
        </h2>
        {storyRes && storyMissionDef && (
          <div className={`mx-auto mt-3 max-w-md rounded-lg border p-3 text-left text-xs leading-relaxed ${storyRes.accomplished ? "border-emerald-400/30 bg-emerald-950/30 text-emerald-100" : "border-rose-400/30 bg-rose-950/30 text-rose-100"}`}>
            <p className="mb-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
              {storyRes.accomplished ? `Mission complete — ${storyMissionDef.title}` : `Mission failed — ${storyMissionDef.title}`}
            </p>
            {storyRes.accomplished ? storyMissionDef.victoryText : "The Shatterlands do not forgive — but they do forget. Regroup and try again."}
            {storyRes.accomplished && storyRes.starResult && (
              <div className="mt-2.5 border-t border-white/10 pt-2.5">
                <div className="mb-1.5 flex justify-center gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${i <= storyRes.starResult!.stars ? "fill-amber-400 text-amber-300 drop-shadow-[0_0_8px_rgba(255,185,56,0.6)]" : "fill-transparent text-slate-600"}`}
                    />
                  ))}
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <p className="flex items-center gap-1.5 text-emerald-200"><Check className="h-3 w-3" /> Objective complete</p>
                  <p className={`flex items-center gap-1.5 ${storyRes.starResult.underPar ? "text-emerald-200" : "text-slate-400"}`}>
                    {storyRes.starResult.underPar ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Finish by turn {storyRes.starResult.parTurns + 1}
                  </p>
                  <p className={`flex items-center gap-1.5 ${storyRes.starResult.noCityLost ? "text-emerald-200" : "text-slate-400"}`}>
                    {storyRes.starResult.noCityLost ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Lose no city
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {winner && (
          <p className="mt-2 text-sm text-slate-300">
            <span style={{ color: winner.color }} className="font-bold">{winner.name}</span> rules the Shatterlands.
          </p>
        )}
        {s.winPath && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-200">
            <Crown className="h-3 w-3" /> {s.winPath.pathName} victory
          </p>
        )}
        {s.winPath && (
          <p className="mt-1.5 text-xs italic text-slate-400">{s.winPath.flavor}</p>
        )}
        {won && game.newHallEntry && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-[11px] font-bold text-amber-300">
            <Trophy className="h-3 w-3" /> New Hall of Conquest record!
          </p>
        )}
        {s.challenge && (
          <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${game.newChallengeBest ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300" : "border-white/15 bg-white/5 text-slate-300"}`}>
            {s.challenge === "daily" ? <CalendarDays className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
            {game.newChallengeBest
              ? `New ${s.challenge} challenge best: ${currentScore(s.challenge)?.score ?? "—"}!`
              : `${s.challenge === "daily" ? "Daily" : "Weekly"} score: below your best (${currentScore(s.challenge)?.score ?? "—"})`}
          </p>
        )}
        {/* v19: post this run to the global board (no-op unless signed in) */}
        {s.challenge && (
          <LeaderboardSubmit kind={s.challenge} score={game.shareScore()} won={won} turns={Math.max(1, s.turn)} />
        )}
        {friendRes && (
          <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${friendRes.beaten ? "border-amber-400/60 bg-amber-400/15 text-amber-300" : "border-white/15 bg-white/5 text-slate-300"}`}>
            <SwordsIcon className="h-3 w-3" />
            {friendRes.beaten
              ? `You beat ${friendRes.name}! ${friendRes.myScore} vs ${friendRes.theirScore}`
              : `${friendRes.name} still leads — ${friendRes.myScore} vs ${friendRes.theirScore}`}
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
        <div className="mt-5 flex gap-2">
          {(s.replay?.length ?? 0) > 0 && (
            <Button
              variant="secondary"
              onClick={() => { sound.play("click"); setReplayOpen(true); }}
              className="flex-1 border border-cyan-400/40 bg-cyan-400/10 font-display font-bold tracking-wide text-cyan-200 hover:bg-cyan-400/20"
            >
              Watch Replay
            </Button>
          )}
          {storyRes && (
            <Button
              onClick={() => { sound.play("click"); g.toMenu(); navigate("/story"); }}
              className="flex-1 bg-rose-400 font-display font-black tracking-wider text-[#1b1b3f] hover:bg-rose-300"
            >
              {storyRes.accomplished ? "Continue Campaign" : "Back to Campaign"}
            </Button>
          )}
          <Button onClick={() => g.toMenu()} className="flex-1 bg-amber-400 font-display font-black tracking-wider text-[#1b1b3f] shadow-[0_0_24px_rgba(255,185,56,0.35)] hover:bg-amber-300">
            Play Again
          </Button>
        </div>
        {canShare && (
          <Button
            variant="secondary"
            onClick={shareRun}
            className="mt-2 w-full gap-1.5 border border-amber-400/40 bg-amber-400/10 font-display text-xs font-bold tracking-wide text-amber-200 hover:bg-amber-400/20"
          >
            {copied ? <><Check className="h-3.5 w-3.5" /> Link copied — send it to a rival!</> : <><Link2 className="h-3.5 w-3.5" /> Challenge a friend — share this run</>}
          </Button>
        )}
        {s.challenge && (
          <Button
            variant="secondary"
            onClick={copyResult}
            className="mt-2 w-full gap-1.5 border border-cyan-400/40 bg-cyan-400/10 font-display text-xs font-bold tracking-wide text-cyan-200 hover:bg-cyan-400/20"
          >
            {resultCopied ? <><Check className="h-3.5 w-3.5" /> Result copied — paste it anywhere!</> : <><ClipboardCopy className="h-3.5 w-3.5" /> Copy result — share your score</>}
          </Button>
        )}
      </div>
      <ReplayViewer open={replayOpen} onClose={() => setReplayOpen(false)} />
    </div>
  );
}
