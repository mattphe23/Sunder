// Sunder replay viewer — Isoglow glass; step through the match's chronicle
// from the game-over screen: prev/next/autoplay over the recorded event log.
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../useGame";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Play, Pause, Swords, Flag, FlaskConical, Landmark, Bird, Hammer, Clock } from "lucide-react";
import { ReplayEntry } from "../core/types";

const panel = "rounded-xl border border-white/10 bg-[#1b1b3f]/95 backdrop-blur-md shadow-xl shadow-black/40 text-slate-100";

function kindIcon(kind: ReplayEntry["kind"]) {
  switch (kind) {
    case "combat": return <Swords className="h-3.5 w-3.5 text-red-400" />;
    case "capture": return <Flag className="h-3.5 w-3.5 text-amber-300" />;
    case "tech": return <FlaskConical className="h-3.5 w-3.5 text-cyan-300" />;
    case "train": return <Hammer className="h-3.5 w-3.5 text-slate-300" />;
    case "ruin": return <Landmark className="h-3.5 w-3.5 text-cyan-300" />;
    case "diplo": return <Bird className="h-3.5 w-3.5 text-sky-300" />;
    default: return <Clock className="h-3.5 w-3.5 text-slate-400" />;
  }
}

export function ReplayViewer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const g = useGame();
  const s = g.state;
  const entries = useMemo(() => s.replay ?? [], [s.replay]);
  const [pos, setPos] = useState(0); // index of the last revealed entry
  const [playing, setPlaying] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setPos(Math.min(9, entries.length - 1)); setPlaying(false); }
  }, [open, entries.length]);

  useEffect(() => {
    if (!playing || !open) return;
    const id = window.setInterval(() => {
      setPos((p) => {
        if (p >= entries.length - 1) { setPlaying(false); return p; }
        return p + 1;
      });
    }, 900);
    return () => window.clearInterval(id);
  }, [playing, open, entries.length]);

  useEffect(() => {
    // keep the newest revealed entry in view
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [pos]);

  if (!open) return null;
  if (entries.length === 0) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div className={`${panel} w-full max-w-sm p-5 text-center`} onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-slate-300">No replay was recorded for this match.</p>
          <Button size="sm" className="mt-3 bg-amber-400 font-bold text-[#1b1b3f] hover:bg-amber-300" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const shown = entries.slice(0, pos + 1);
  const curTurn = entries[pos]?.turn ?? 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`${panel} flex max-h-[86vh] w-full max-w-md flex-col p-4`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-sm font-bold tracking-wide text-amber-300">
            Match Chronicle · Turn {curTurn + 1}
          </span>
          <button onClick={onClose} aria-label="Close replay"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="mb-2 h-1 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-amber-400 transition-all" style={{ width: `${((pos + 1) / entries.length) * 100}%` }} />
        </div>
        <div ref={feedRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {shown.map((e, i) => (
            e.kind === "turn" ? (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{e.text}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
            ) : (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-md border-l-4 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 ${i === pos ? "ring-1 ring-amber-400/40" : ""}`}
                style={{ borderLeftColor: `${s.tribes[e.tribe]?.color ?? "#888"}aa` }}
              >
                <span className="mt-0.5 shrink-0">{kindIcon(e.kind)}</span>
                <span>{e.text}</span>
              </div>
            )
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" className="min-h-[40px] border border-white/10 bg-white/10 text-slate-200 hover:bg-white/20"
            disabled={pos <= 0} onClick={() => { setPlaying(false); setPos((p) => Math.max(0, p - 1)); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" className="min-h-[40px] w-28 gap-1.5 bg-amber-400 font-bold text-[#1b1b3f] hover:bg-amber-300"
            onClick={() => setPlaying((p) => !p)}>
            {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Autoplay</>}
          </Button>
          <Button size="sm" variant="secondary" className="min-h-[40px] border border-white/10 bg-white/10 text-slate-200 hover:bg-white/20"
            disabled={pos >= entries.length - 1} onClick={() => { setPlaying(false); setPos((p) => Math.min(entries.length - 1, p + 1)); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-500">{pos + 1} / {entries.length} events</p>
      </div>
    </div>
  );
}
