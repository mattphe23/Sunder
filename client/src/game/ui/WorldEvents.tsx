// Sunder — v17 living map UI: world-event ticker cards + the Fallen Commander drama card.
// Style: Isoglow — indigo glass panels, amber accents, tribe-color leans.
import { useEffect, useState } from "react";
import { useGame } from "../useGame";
import { Flame, CloudLightning, Eye, Swords, Skull, X } from "lucide-react";

const EVENT_ICON: Record<string, React.ReactNode> = {
  campSpawned: <Flame className="h-4 w-4 text-orange-400" />,
  campGrew: <Flame className="h-4 w-4 text-orange-300" />,
  campRaid: <Swords className="h-4 w-4 text-red-400" />,
  campRazed: <Flame className="h-4 w-4 text-emerald-400" />,
  stormFormed: <CloudLightning className="h-4 w-4 text-sky-400" />,
  stormMoved: <CloudLightning className="h-4 w-4 text-sky-300" />,
  stormFaded: <CloudLightning className="h-4 w-4 text-slate-400" />,
  guardianWoke: <Eye className="h-4 w-4 text-red-400" />,
  guardianMoved: <Eye className="h-4 w-4 text-red-300" />,
};

/** Toast-like stack of world events, shown at the start of the human's turn and auto-fading. */
export function WorldEventCards() {
  const g = useGame();
  const s = g.state;
  const [shown, setShown] = useState<{ kind: string; text: string; turn: number; id: number }[]>([]);

  useEffect(() => {
    if (s.phase !== "playing") return;
    if (s.currentTribe !== s.humanTribe) return;
    const evs = g.drainWorldEvents();
    if (evs.length === 0) return;
    // hide the noisy drift entries; keep the meaningful beats
    const keep = evs.filter((e) => e.kind !== "stormMoved" && e.kind !== "guardianMoved");
    if (keep.length === 0) return;
    const stamped = keep.map((e, i) => ({ ...e, id: Date.now() + i }));
    setShown((prev) => [...prev, ...stamped].slice(-4));
    const timer = setTimeout(() => {
      setShown((prev) => prev.filter((p) => !stamped.some((q) => q.id === p.id)));
    }, 6500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.turn, s.currentTribe, s.phase]);

  if (s.phase !== "playing" || shown.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-40 flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2">
      {shown.map((e) => (
        <div
          key={e.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-[#141433]/92 px-3.5 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <span className="mt-0.5 shrink-0">{EVENT_ICON[e.kind] ?? <Flame className="h-4 w-4 text-amber-400" />}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400/80">The world stirs</div>
            <div className="text-[13px] leading-snug text-slate-200">{e.text}</div>
          </div>
          <button
            className="ml-auto shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:text-slate-300"
            onClick={() => setShown((prev) => prev.filter((p) => p.id !== e.id))}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Full drama card when a commander falls — the stakes made visible. */
export function HeroFallenCard() {
  const g = useGame();
  const s = g.state;
  const hf = s.heroFallen;
  if (!hf || s.phase !== "playing") return null;
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl border bg-[#10102a] shadow-2xl animate-in zoom-in-95 duration-300"
        style={{ borderColor: `${hf.tribeColor}55` }}
      >
        <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-7 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-2"
            style={{ borderColor: hf.tribeColor, backgroundColor: `${hf.tribeColor}18` }}
          >
            <Skull className="h-8 w-8" style={{ color: hf.tribeColor }} />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400/90">
            {hf.wasHuman ? "Your commander has fallen" : "A rival commander falls"}
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-100">
            {hf.heroName} <span className="text-slate-400">of {hf.tribeName}</span>
          </h2>
          <p className="text-sm italic leading-relaxed text-slate-400">{hf.taunt}</p>
          <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300">
            {hf.wasHuman ? "−40 score · your legend is wounded" : `${hf.tribeName} suffers −40 score`}
          </div>
          <button
            className="mt-1 w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-[#141433] transition-transform active:scale-[0.97] hover:bg-amber-400"
            onClick={() => g.dismissHeroFallen()}
          >
            {hf.wasHuman ? "Avenge them" : "Press the advantage"}
          </button>
        </div>
      </div>
    </div>
  );
}
