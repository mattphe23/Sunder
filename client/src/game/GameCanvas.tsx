// Sunder board canvas — hosts the Babylon renderer, routes picks to game logic.
// Isoglow: canvas is the hero; deep indigo void background.
import { useEffect, useRef, useState } from "react";
import { BoardRenderer } from "./render/scene";
import { game } from "./core/state";
import { sound } from "./sound";
import { unitAt, cityAt, reachableTiles, attackableUnits } from "./core/rules";

const LOGO = "/manus-storage/sunder-mark_d1dbf156.png";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const [booting, setBooting] = useState(true);

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
    // brand splash: hold one beat after the first build so the reveal feels intentional
    const bootTimer = setTimeout(() => setBooting(false), 700);

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
        const atk = s.units.find((u) => u.id === e.attackerId);
        sound.play(atk?.type === "catapult" ? "catapult" : "attack");
        // slight delay so numbers appear at impact
        setTimeout(() => {
          // v34 impact FX: survivors flash + recoil; kills shatter into pieces
          if (e.defenderDied) {
            r.shatterUnit(e.defenderId, e.ax, e.ay, e.dx, e.dy);
          } else if (e.knockback) {
            // v36 colossus: the survivor is hurled a full tile — slide the rig to its new home
            r.hitFlash(e.defenderId);
            r.slideUnit(s, e.defenderId, e.dx, e.dy, e.knockback.x, e.knockback.y);
          } else {
            r.hitFlash(e.defenderId);
            r.knockback(e.defenderId, e.ax, e.ay, e.dx, e.dy);
          }
          // v36 colossus: masonry burst when the walls come down
          if (e.wallCrushed) r.wallCrushBurst(s, e.wallCrushed.x, e.wallCrushed.y);
          if (e.retaliation > 0) {
            if (e.attackerDied) r.shatterUnit(e.attackerId, e.dx, e.dy, e.ax, e.ay);
            else r.hitFlash(e.attackerId);
          }
          r.showDamageNumber(s, e.dx, e.dy, e.dmg, "#ff6b6b");
          if (e.retaliation > 0) r.showDamageNumber(s, e.ax, e.ay, e.retaliation, "#ffd76a");
        }, 120);
      }
      if (e.type === "captured") {
        const city = s.cities[e.cityId];
        r.starBurst(s, city.x, city.y, s.tribes[e.tribe].color);
        if (e.tribe === s.humanTribe) sound.play("capture");
      }
      if (e.type === "turnStarted" && e.tribe === s.humanTribe && s.turn > 0) sound.play("turn");
      if (e.type === "focusTile") r.focusTile(s, e.x, e.y);
      if (e.type === "sfx") {
        sound.play(e.name);
        if (e.name === "heal" && e.x !== undefined && e.y !== undefined) r.healSparkle(s, e.x, e.y);
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
      clearTimeout(bootTimer);
      r.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="h-full w-full outline-none" style={{ touchAction: "none" }} />
      {/* v16 brand splash — covers Babylon's first-frame flash, fades out via CSS */}
      <div
        className={`pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#141433] transition-opacity duration-500 ${booting ? "opacity-100" : "opacity-0"}`}
        aria-hidden={!booting}
      >
        <img src={LOGO} alt="" className="h-24 w-24 animate-pulse drop-shadow-[0_0_30px_rgba(255,140,31,0.45)]" />
        <p className="font-display text-xs font-black uppercase tracking-[0.35em] text-amber-300/90">
          Outthink. Outforge. Outlast.
        </p>
        <div className="mt-1 h-0.5 w-24 overflow-hidden rounded bg-white/10">
          <div className="h-full w-1/2 animate-[splash-sweep_0.9s_ease-in-out_infinite] rounded bg-amber-400" />
        </div>
      </div>
    </>
  );
}
