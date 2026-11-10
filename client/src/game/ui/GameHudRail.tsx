import { LogTicker } from "./Hud";
import { Minimap } from "./Minimap";
import { WorldEventCards } from "./WorldEvents";

/** Share layout space instead of stacking independently positioned HUD panels.
 * Paths and warnings precede world cards in one column. On phones the Map
 * follows that fully wrapped stack; wider screens reserve a separate column.
 * Neither layout writes preferences or match/save state.
 */
export function GameHudRail() {
  return (
    <div className="safe-t-offset safe-x pointer-events-none absolute inset-x-0 z-20 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <LogTicker />
        <WorldEventCards />
      </div>
      <Minimap />
    </div>
  );
}
