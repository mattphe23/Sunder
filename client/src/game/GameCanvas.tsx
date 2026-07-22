// Polyforge board canvas — hosts the Babylon renderer, routes picks to game logic.
// Isoglow: canvas is the hero; deep indigo void background.
import { useEffect, useRef } from "react";
import { BoardRenderer } from "./render/scene";
import { game } from "./core/state";
import { unitAt, cityAt, reachableTiles, attackableUnits } from "./core/rules";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = new BoardRenderer(canvas);
    rendererRef.current = r;

    const refresh = () => {
      const s = game.state;
      if (s.phase !== "playing" && s.phase !== "gameover") return;
      r.buildBoard(s);
      r.syncUnits(s);
      r.showHighlights(s);
    };
    refresh();

    const unsub = game.subscribe(() => {
      const s = game.state;
      if (s.phase === "menu") return;
      r.buildBoard(s);
      r.syncUnits(s);
      r.showHighlights(s);
    });

    r.onPick = ({ x, y }) => {
      const s = game.state;
      if (s.phase !== "playing" || s.currentTribe !== s.humanTribe || s.aiThinking) return;
      const selected = s.units.find((u) => u.id === s.selectedUnitId);
      const clickedUnit = unitAt(s, x, y);

      if (selected && selected.tribe === s.humanTribe) {
        // attack?
        if (clickedUnit && clickedUnit.tribe !== s.humanTribe) {
          if (attackableUnits(s, selected).some((e2) => e2.id === clickedUnit.id)) {
            game.attack(selected.id, clickedUnit.id);
            return;
          }
        }
        // move?
        if (!clickedUnit && reachableTiles(s, selected).some((t) => t.x === x && t.y === y)) {
          game.moveUnit(selected.id, x, y);
          return;
        }
      }

      // select own unit
      if (clickedUnit && clickedUnit.tribe === s.humanTribe) {
        game.selectUnit(clickedUnit.id === s.selectedUnitId ? null : clickedUnit.id);
        return;
      }
      // select city
      const city = cityAt(s, x, y);
      if (city && city.tribe === s.humanTribe) {
        game.selectCity(city.id);
        return;
      }
      game.selectUnit(null);
    };

    return () => {
      unsub();
      r.dispose();
      rendererRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full outline-none" style={{ touchAction: "none" }} />;
}
