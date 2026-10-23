import { LogTicker } from "./Hud";
import { Minimap } from "./Minimap";

/** Share layout space instead of stacking independently positioned HUD panels.
 * On phones the Map follows the fully wrapped event; wider screens reserve
 * separate columns. Neither layout writes preferences or match/save state.
 */
export function GameHudRail() {
  return (
    <div className="safe-t-offset safe-x pointer-events-none absolute inset-x-0 z-20 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
      <LogTicker />
      <Minimap />
    </div>
  );
}
