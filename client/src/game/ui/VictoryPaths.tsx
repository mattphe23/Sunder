import { useState } from "react";
import { Crown, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGame } from "../useGame";
import {
  victoryPathPresentation,
  type TribeVictoryPath,
} from "./victoryPathPresentation";

function PathCard({ path, own = false }: { path: TribeVictoryPath; own?: boolean }) {
  return (
    <article className={`min-w-0 rounded-lg border p-3 ${path.near && !own ? "border-amber-300/40 bg-amber-400/10" : "border-white/10 bg-white/5"}`}>
      <div className="mb-1 flex min-w-0 items-start gap-2">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: path.color }} aria-hidden="true" />
        <h3 className="min-w-0 break-words font-display text-sm font-bold text-slate-100">{path.tribeName}</h3>
        <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">{own ? "You" : path.isHuman ? "Player" : "AI"}</span>
      </div>
      <p className="break-words text-sm font-semibold text-amber-200">{path.pathName}</p>
      <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-300">{path.goal}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-slate-100">
        <span>{path.valid ? `${path.current} / ${path.target}` : "— / —"}</span>
        <span className="text-slate-400">{path.valid ? `${path.percent}%` : "Unavailable"}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${path.tribeName}: ${path.pathName}`}
        aria-valuemin={0}
        aria-valuemax={path.valid ? path.target : 1}
        aria-valuenow={path.valid ? path.current : undefined}
        aria-valuetext={path.valid ? `${path.current} of ${path.target}; ${path.status}` : "Progress unavailable"}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className={`h-full rounded-full ${path.near ? "bg-amber-300" : "bg-slate-400"}`} style={{ width: `${path.ratio * 100}%` }} />
      </div>
      <p className={`mt-2 break-words text-[11px] leading-relaxed ${path.ready || path.near ? "text-amber-200" : "text-slate-400"}`}>{path.status}</p>
    </article>
  );
}

/** Mounted with a viewer/seed/handoff key by the HUD. Open state is local and
 * cannot survive a player handoff or new match. Alerts themselves are derived,
 * not dismissed, logged, toasted, sounded, or stored.
 */
export function VictoryPaths() {
  const s = useGame().state;
  const [open, setOpen] = useState(false);
  const { own, rivals, nearRivals, alertText } = victoryPathPresentation(s);
  const warning = alertText !== null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className={`pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-2 rounded-xl border px-2 text-left shadow-xl shadow-black/20 backdrop-blur-md ${warning ? "border-amber-300/40 bg-[#302442]/95" : "border-white/10 bg-[#1b1b3f]/85"}`}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-amber-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"
            aria-label={warning ? "Open victory paths and rivals close to victory" : "Open victory paths"}
            title="Victory paths — your goal and every living rival's progress"
          >
            <Crown className="h-4 w-4" aria-hidden="true" /> Paths
          </button>
        </DialogTrigger>
        {warning && (
          <div role="status" aria-label="Rival victory warning" aria-atomic="true" className="min-w-0 break-words py-2 pr-1 text-xs leading-snug text-amber-100">
            {alertText}
          </div>
        )}
      </div>
      <DialogContent
        showCloseButton={false}
        onKeyDown={event => {
          // BottomBar listens on window for Tab/N to cycle units. Keep these
          // keys inside the panel; Radix still handles focus trapping/Escape.
          if (event.key === "Tab" || event.key.toLowerCase() === "n") event.stopPropagation();
        }}
        className="flex max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] w-[calc(100vw-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)-2rem)] max-w-md flex-col gap-3 overflow-hidden rounded-xl border-white/15 bg-[#151530] p-4 text-slate-100"
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <DialogTitle className="flex items-center gap-2 font-display text-lg"><Crown className="h-5 w-5 text-amber-300" aria-hidden="true" />Victory paths</DialogTitle>
          <DialogClose asChild>
            <button type="button" aria-label="Close victory paths" className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"><X className="h-5 w-5" aria-hidden="true" /></button>
          </DialogClose>
        </div>
        <DialogDescription className="shrink-0 text-xs leading-relaxed text-slate-400">
          Faction paths are checked at the start of each round once unlocked. Progress can jump; “close” does not predict turns remaining.
        </DialogDescription>
        <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain pr-1">
          <section aria-label="Your victory path" className="space-y-2">
            <h2 className="font-display text-xs font-bold uppercase tracking-widest text-slate-400">Your path</h2>
            {own ? <PathCard path={own} own /> : <p className="text-xs text-slate-400">Your tribe is eliminated; no active faction path remains.</p>}
          </section>
          <section aria-label="All living rival victory paths" className="space-y-2">
            <h2 className="font-display text-xs font-bold uppercase tracking-widest text-slate-400">Living rivals · {rivals.length}{nearRivals.length > 0 && <span className="text-amber-200"> · {nearRivals.length} close</span>}</h2>
            {rivals.map(path => <PathCard key={path.tribeIndex} path={path} />)}
            {rivals.length === 0 && <p className="text-xs text-slate-400">No living rivals remain.</p>}
          </section>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Path counters are public global strategic totals, like rival statistics and Diplomacy strength. They do not reveal map locations or hidden units beyond the actual path counter. Other human players are rivals for victory, not an enemy designation.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Warnings start at roughly two-thirds of a goal; short whole-number goals round down for earlier notice. A one-step goal can only warn when ready.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
