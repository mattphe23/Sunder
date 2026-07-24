// Chapter II epilogue — a full-screen illustrated interlude shown once after
// the campaign finale (ch2-m5). Closes the saga and teases what comes next.
// Re-viewable any time from the Story page once earned.
import { useEffect, useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { sound } from "../sound";

export const EPILOGUE_IMG = "/manus-storage/epilogue-ch2_d6106191.png";
const SEEN_KEY = "sunder-epilogue-ch2-seen";

export function epilogueSeen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
export function markEpilogueSeen() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* noop */ }
}

const LINES = [
  "The last banner fell at the Crucible, and for the first time in living memory, the Shatterlands did not shake.",
  "Where the shards knit together, amber seams still glow — scars the world chose to keep, so it would remember what breaking costs.",
  "Your tribe's name is spoken at every hearth on the reunited continent. Not as conquerors. As the ones who finished the reforging.",
  "But far below the new land, in the dark between the old fault lines, something that slept through the Sundering has begun to stir…",
];

/**
 * Full-screen cinematic card. Lines fade in one by one; a final tease line and
 * a single continue button. Parent controls mounting; onClose unmounts.
 */
export function EpilogueCard({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = useState(1);

  // reveal one line every few seconds; clicking advances immediately
  useEffect(() => {
    if (shown >= LINES.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 3200);
    return () => clearTimeout(t);
  }, [shown]);

  const advance = () => {
    if (shown < LINES.length) { setShown((n) => n + 1); return; }
    sound.play("click");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-400/30 bg-[#10102c] shadow-[0_0_80px_rgba(255,185,56,0.15)]" onClick={advance}>
        <div className="relative">
          <img src={EPILOGUE_IMG} alt="The Shatterlands, reforged" className="h-56 w-full object-cover sm:h-72" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10102c] via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">
              <BookOpen className="h-3.5 w-3.5" /> Epilogue
            </p>
            <h2 className="font-display text-2xl font-black tracking-wide text-white drop-shadow-lg">The World, Made Whole</h2>
          </div>
        </div>
        <div className="space-y-3 p-6">
          {LINES.slice(0, shown).map((l, i) => (
            <p
              key={i}
              className={`text-sm leading-relaxed ${i === LINES.length - 1 ? "italic text-violet-300" : "text-slate-300"}`}
              style={{ animation: "epilogue-fade 900ms cubic-bezier(0.23,1,0.32,1) both" }}
            >
              {l}
            </p>
          ))}
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500">
              {shown < LINES.length ? "Click to continue" : "The Sundering Saga — complete"}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); sound.play("click"); onClose(); }}
              className="rounded-md border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-amber-200 transition-all hover:bg-amber-400/20 active:scale-[0.97]"
            >
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> {shown < LINES.length ? "Skip ahead" : "Continue"}</span>
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes epilogue-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
