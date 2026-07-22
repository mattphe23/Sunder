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

    // combat juice: FX driven by game events
    const unsubFx = game.subscribe((e) => {
      const s = game.state;
      if (s.phase === "menu") return;
      if (e.type === "combat") {
        r.lungeUnit(s, e.attackerId, e.dx, e.dy);
        // slight delay so numbers appear at impact
        setTimeout(() => {
          r.showDamageNumber(s, e.dx, e.dy, e.dmg, "#ff6b6b");
          if (e.retaliation > 0) r.showDamageNumber(s, e.ax, e.ay, e.retaliation, "#ffd76a");
        }, 120);
      }
      if (e.type === "captured") {
        const city = s.cities[e.cityId];
        r.starBurst(s, city.x, city.y, s.tribes[e.tribe].color);
      }
    });

    r.onPick = ({ x, y }) => {
      const s = game.state;
      if (s.phase !== "playing" || s.currentTribe !== s.humanTribe || s.aiThinking) return;
      const selected = s.units.find((u) => u.id === s.selectedUnitId);
      const clickedUnit = unitAt(s, x, y);

      if (selected && selected.tribe === s.humanTribe) {
        // attack? First click stages a preview; clicking the same target again confirms.
        if (clickedUnit && clickedUnit.tribe !== s.humanTribe) {
          if (attackableUnits(s, selected).some((e2) => e2.id === clickedUnit.id)) {
            const p = game.pendingAttack;
            if (p && p.attackerId === selected.id && p.defenderId === clickedUnit.id) {
              game.confirmAttack();
            } else {
              game.stageAttack(selected.id, clickedUnit.id);
            }
            return;
          }
        }
        // clicking elsewhere cancels a staged attack
        if (game.pendingAttack) game.cancelAttack();
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
      unsubFx();
      r.dispose();
      rendererRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full outline-none" style={{ touchAction: "none" }} />;
}
