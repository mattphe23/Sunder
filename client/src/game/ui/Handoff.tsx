// Sunder — Isoglow. Hot-seat hand-off: full-screen blocker so players
// don't see each other's fog of war between turns. Faction-colored.
import { useGame } from "../useGame";
import { game } from "../core/state";
import { sound } from "../sound";
import { Button } from "@/components/ui/button";
import { Eye, Star } from "lucide-react";

export function HandoffScreen() {
  const g = useGame();
  const s = g.state;
  if (s.phase !== "playing" || s.handoff === null || s.handoff === undefined) return null;
  const tribe = s.tribes[s.handoff];
  if (!tribe) return null;
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#0c0c24] px-4">
      {/* solid background — the board must be fully hidden between players */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${tribe.color}33, transparent 65%)` }}
      />
      <div className="relative w-full max-w-sm text-center">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Pass the device to</p>
        <div className="mb-1 flex items-center justify-center gap-3">
          <span className="h-4 w-4 rotate-45" style={{ background: tribe.color, boxShadow: `0 0 14px ${tribe.color}` }} />
          <h2 className="font-display text-4xl font-black tracking-tight text-white">{tribe.name}</h2>
        </div>
        <p className="mb-1 text-sm text-slate-300">{tribe.passiveDesc}</p>
        <p className="mb-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {tribe.stars} stars · Turn {s.turn + 1}/{s.maxTurns}
        </p>
        <Button
          size="lg"
          onClick={() => { sound.play("turn"); game.confirmHandoff(); }}
          className="w-full gap-2 rounded-lg py-6 font-display text-base font-black tracking-widest text-[#10102c] transition-transform hover:brightness-110 active:scale-[0.98]"
          style={{ background: tribe.color, boxShadow: `0 0 32px ${tribe.color}55` }}
        >
          <Eye className="h-5 w-5" /> I AM {tribe.name.toUpperCase()} — SHOW MY TURN
        </Button>
        <p className="mt-3 text-[11px] text-slate-500">Other players, look away — the fog of war is about to lift.</p>
      </div>
    </div>
  );
}
