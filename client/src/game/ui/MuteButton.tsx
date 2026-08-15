// Sunder — Isoglow. Mute toggle: glassy pill, persists via sound engine.
// Sized to 44x44: the iOS Human Interface Guidelines minimum tap target, and
// this ships as an App Store wrapper build.
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sound } from "../sound";

export function MuteButton({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => {
    const off = sound.onChange(() => setMuted(sound.muted));
    return () => { off(); };
  }, []);
  return (
    <button
      onClick={() => { sound.toggleMuted(); if (!sound.muted) sound.play("click"); }}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      title={muted ? "Unmute sound" : "Mute sound"}
      className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#1b1b3f]/80 text-slate-300 backdrop-blur transition-all duration-150 hover:border-amber-400/40 hover:text-amber-300 active:scale-[0.94] ${className}`}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}
