import { useEffect } from "react";
import { Star, X } from "lucide-react";
import { useGame } from "../useGame";
import { game } from "../core/state";
import { resourceAction, type ResourcePosition } from "./resourceAction";

export function ResourceActionPanel({
  position,
  onClose,
}: {
  position: ResourcePosition;
  onClose: () => void;
}) {
  const g = useGame();
  const action = resourceAction(g.state, position);
  const available = action !== null;
  useEffect(() => {
    if (!available) onClose();
  }, [available, onClose]);
  if (!action) return null;
  return (
    <section
      role="region"
      aria-label="Resource actions"
      className="safe-b-offset absolute left-3 z-20 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-[#1b1b3f]/95 p-3 text-slate-100 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold">{action.title}</h2>
        <button
          aria-label="Close resource actions"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-2 text-xs text-slate-300">
        {action.cityName
          ? `+1 population for ${action.cityName}.`
          : "Harvest resources to grow your cities."}
      </p>
      {action.reason && (
        <p
          id="resource-action-reason"
          className="mb-3 text-xs leading-relaxed text-amber-200"
          aria-live="polite"
        >
          {action.reason}
        </p>
      )}
      <button
        disabled={!action.enabled}
        aria-describedby={action.reason ? "resource-action-reason" : undefined}
        onClick={() => {
          // Re-check current state, not the state captured by an earlier render.
          if (!resourceAction(game.state, position)?.enabled) return;
          g.harvest(position.x, position.y);
          onClose();
        }}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-[#1b1b3f] hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>{action.label}</span>
        <span className="flex items-center gap-1">
          <Star aria-hidden="true" className="h-4 w-4 fill-current" />
          {action.cost}
        </span>
      </button>
      <p className="mt-2 text-[11px] text-slate-400">
        Tap the action to spend stars. Selecting this tile costs nothing.
      </p>
    </section>
  );
}
