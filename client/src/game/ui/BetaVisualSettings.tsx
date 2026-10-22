import { Paintbrush } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  setBetaVisualPreferences,
  useBetaVisualPreferences,
} from "../render/betaVisualPreferences";

export function BetaVisualSettings() {
  const preferences = useBetaVisualPreferences();
  return (
    <section
      aria-label="Beta visual options"
      className="rounded-xl border border-violet-300/20 bg-violet-400/[0.06] p-3 text-left"
    >
      <p className="mb-1 font-display text-xs font-bold uppercase tracking-widest text-violet-200">
        Visuals · Beta
      </p>
      <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-100">
        <span>New visuals (beta)</span>
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-violet-400"
          checked={preferences.newVisuals}
          onChange={event =>
            setBetaVisualPreferences({ newVisuals: event.target.checked })
          }
        />
      </label>
      <p className="text-xs leading-relaxed text-slate-400">
        Try the new tribe characters in real matches. Models need internet to
        load; unavailable or over-budget units keep their original appearance.
        Standard costumes only.
      </p>
      <label className="mt-2 flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-100">
        <span>Landscape improvements (beta)</span>
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-violet-400"
          checked={preferences.landscape}
          onChange={event =>
            setBetaVisualPreferences({ landscape: event.target.checked })
          }
        />
      </label>
      <p className="text-xs leading-relaxed text-slate-400">
        Preview connected terrain, quieter mist and clearer unit space. Both
        options start off. You can switch back during a match without changing
        your save or rules.
      </p>
    </section>
  );
}

export function BetaVisualSettingsButton() {
  const preferences = useBetaVisualPreferences();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          aria-label="Visual settings"
          title="Visual settings"
          className={`pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border backdrop-blur-md ${preferences.newVisuals || preferences.landscape ? "border-violet-300/40 bg-violet-400/15 text-violet-200" : "border-white/10 bg-[#1b1b3f]/85 text-slate-300"}`}
        >
          <Paintbrush className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto border-white/15 bg-[#151530] text-slate-100">
        <DialogHeader>
          <DialogTitle>Visual settings</DialogTitle>
          <DialogDescription className="text-slate-400">
            Display changes only. Your match and unlocked content stay the same.
          </DialogDescription>
        </DialogHeader>
        <BetaVisualSettings />
      </DialogContent>
    </Dialog>
  );
}
