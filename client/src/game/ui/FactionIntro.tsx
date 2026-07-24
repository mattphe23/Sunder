// Sunder: The Living Forge — Isoglow. Faction intro card: a lore/strategy splash shown once at
// match start. Faction-colored frame, passive + unique unit + opening moves.
// Deep indigo panel, amber star accents, display-font headers.
import { useGame } from "@/game/useGame";
import { UNIT_STATS, UnitType } from "@/game/core/types";
import { Star, Swords, Sparkles, Compass } from "lucide-react";

interface IntroDef {
  lore: string;
  title: string;
  uniqueUnit: UnitType;
  openings: string[];
}

/** per-faction lore + strategy content, indexed by tribe index */
const INTROS: IntroDef[] = [
  {
    title: "The Circle of Auren",
    lore: "From cliff-top libraries above the northern fjords, the Auren read the world as a text to be mastered. Every ruin is a page, every rival a footnote — and knowledge, they say, outlives any wall.",
    uniqueUnit: "arcanist",
    openings: [
      "Your discounted research compounds — buy a cheap tech on turn 1 and never stop.",
      "Field an Arcanist behind your front line; +2 HP mending each turn wins long sieges.",
      "Rush ruins with your first warrior — free techs are worth double to Scholars.",
    ],
  },
  {
    title: "The Kharzul Warhost",
    lore: "Forged in the ash valleys of the burning south, the Kharzul believe every blade owes a debt of blood. Their war-drums do not signal attack — they never stopped beating.",
    uniqueUnit: "berserker",
    openings: [
      "Your +15% attack makes even Warriors trade favorably — fight early and often.",
      "Soften a target with one strike, then send the Berserker to execute the wounded.",
      "Keep Berserkers out of open retaliation range — they hit like siege, defend like paper.",
    ],
  },
  {
    title: "The Sunwei Dynasty",
    lore: "Where others see barren peaks, the Sunwei terraced golden orchards into the mountainsides. Patience is their creed: the empire that harvests fastest never needs to gamble.",
    uniqueUnit: "warden",
    openings: [
      "Cheaper harvesting means faster city levels — spend early stars on fruit and ore.",
      "Post Wardens on mountain chokepoints; they climb free and are near-immovable up high.",
      "Grow two cities to level 3, wall them, and let rivals break against your peaks.",
    ],
  },
  {
    title: "The Vessari Windriders",
    lore: "No banner stays planted where the Vessari ride. Children of the open steppe, they measure wealth not by what they hold — but by what they can take at full gallop.",
    uniqueUnit: "raider",
    openings: [
      "+1 movement on grass makes your scouts the fastest — grab villages before anyone.",
      "Raiders refund themselves: two kills return 4 stars — hunt weak, isolated units.",
      "Strike wide, not deep: raid economies and retreat before slower armies answer.",
    ],
  },
  {
    title: "The Nerivane Tidecourts",
    lore: "Beneath drowned bell-towers the Nerivane hold court, reading omens in the currents. The land-bound call the sea a border; the Tidecourts call it a road that runs everywhere.",
    uniqueUnit: "tidecaller",
    openings: [
      "One-star ports and faster boats — get to sea by turn 3 and own the waves.",
      "Tidecallers swim without boats and strike harder from water; raid coastal cities.",
      "Island-hop for villages other tribes can't reach yet; the sea is your highway.",
    ],
  },
  {
    title: "The Dravok Holdfasts",
    lore: "The Dravok do not build cities — they carve them, grinding halls out of living rock. Their proverb is short, like their patience: what stands behind stone, stands forever.",
    uniqueUnit: "bulwark",
    openings: [
      "Cheap walls and stout garrisons — level a city to 3 fast and fortify it.",
      "Bulwarks shield adjacent allies; anchor your battle line around one.",
      "Let rivals bleed on your defenses, then counterattack with fresh units.",
    ],
  },
  // ── premium tribes (store unlocks) ──
  {
    title: "The Valkyra Stormhost",
    lore: "They descend from the thunder-plateaus where lightning is weather and omen both. A Valkyra charge is not a battle — it is a verdict, delivered before the defense can answer.",
    uniqueUnit: "archer",
    openings: [
      "Retaliation against you is halved — trade blows aggressively; you win attrition.",
      "Open with Archery already known: field ranged cover from the very first turns.",
      "Push for veteran units — four living veterans summon the Storm Legend victory.",
    ],
  },
  {
    title: "The Mycelon Bloom",
    lore: "Beneath the forest floor the Mycelon are one flesh, dreaming a slow green dream. Cut them and they knit; burn them and the spores ride the smoke to somewhere new.",
    uniqueUnit: "defender",
    openings: [
      "Units heal +2 extra HP resting in your territory — defend on home soil and outlast.",
      "Free Spirit is pre-researched: your cities defend strongly from turn 1.",
      "Spread to 5 cities and the Overgrowth victory blooms — expand relentlessly.",
    ],
  },
];

// v19: compact lore teasers for menu faction-card hovers — title + the first
// sentence of each tribe's lore, indexed by defIndex like INTROS.
export const LORE_TEASERS: { title: string; teaser: string }[] = INTROS.map((d) => ({
  title: d.title,
  teaser: d.lore.split(/(?<=[.!?])\s/)[0],
}));

export function FactionIntro() {
  const g = useGame();
  const s = g.state;
  if (s.phase !== "playing" || !s.showIntro) return null;
  const tribe = s.tribes[s.humanTribe];
  const forged = tribe && tribe.defIndex >= INTROS.length; // Tribe Forge custom tribe
  const intro: IntroDef | undefined = forged
    ? {
        title: `The ${tribe.name}`,
        lore: "No chronicle yet tells of this people — you are writing its first page. Forged from chosen strengths, they march under a banner the old powers have never seen.",
        uniqueUnit: (tribe.customUnique ?? "arcanist") as UnitType,
        openings: [
          "Lean on your chosen passive from turn 1 — it is your economy's engine.",
          "Unlock and field your signature unit early; it defines your battle plan.",
          "Scout ruins and villages fast — a young tribe grows on what it claims.",
        ],
      }
    : INTROS[tribe?.defIndex ?? s.humanTribe];
  if (!tribe || !intro) return null;
  const uu = UNIT_STATS[intro.uniqueUnit];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0d0d24]/80 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-[#1a1a3e]/95 shadow-2xl"
        style={{ borderColor: `${tribe.color}66`, boxShadow: `0 0 60px ${tribe.color}33` }}
      >
        {/* header band in faction color */}
        <div className="px-5 pb-4 pt-5" style={{ background: `linear-gradient(135deg, ${tribe.color}2e, transparent 65%)` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: tribe.color }}>
            You command
          </p>
          <h2 className="font-display text-2xl font-bold text-white">{intro.title}</h2>
          <p className="mt-2 text-sm italic leading-relaxed text-indigo-100/80">{intro.lore}</p>
        </div>

        <div className="space-y-3 px-5 pb-3">
          {/* passive */}
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <Sparkles size={16} className="mt-0.5 shrink-0" style={{ color: tribe.color }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Faction passive</p>
              <p className="text-sm text-slate-100">{tribe.passiveDesc}</p>
            </div>
          </div>
          {/* unique unit */}
          <div className="flex items-start gap-3 rounded-lg border border-violet-400/30 bg-violet-400/10 p-3">
            <Swords size={16} className="mt-0.5 shrink-0 text-violet-300" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                Unique unit — {uu.name}
                <span className="ml-2 inline-flex items-center gap-0.5 normal-case text-amber-300">
                  <Star className="h-3 w-3 fill-amber-300" />{uu.cost}
                </span>
              </p>
              <p className="text-sm text-slate-100">{uu.perk}</p>
            </div>
          </div>
          {/* opening moves */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Compass size={13} style={{ color: tribe.color }} /> Opening moves
            </p>
            <ol className="space-y-1.5">
              {intro.openings.map((o, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug text-slate-200">
                  <span className="font-mono font-bold" style={{ color: tribe.color }}>{i + 1}.</span>
                  {o}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-5 pb-5 pt-1">
          <button
            onClick={() => g.dismissIntro()}
            className="w-full rounded-lg py-2.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-[#141433] transition-transform active:scale-[0.97]"
            style={{ background: tribe.color }}
          >
            To battle
          </button>
        </div>
      </div>
    </div>
  );
}
