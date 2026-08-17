// Sunder board canvas — hosts the Babylon renderer, routes picks to game logic.
// Isoglow: canvas is the hero; deep indigo void background.
import { useEffect, useRef, useState } from "react";
import { BoardRenderer } from "./render/scene";
import { game } from "./core/state";
import type { FatalitySpec } from "./core/fatality";
import { cinema } from "./render/cinema";
import { shareShot, type ShareShot } from "./render/capture";
import { sound } from "./sound";
import { unitAt, cityAt, reachableTiles, attackableUnits } from "./core/rules";

import { BrandMark, ArtOrFallback } from "./ui/Brand";

const LOGO = "/manus-storage/sunder-mark_d1dbf156.png";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const [booting, setBooting] = useState(true);
  // The fatality currently on screen, and the function that ends it early.
  // Held in a ref as well as state because the event handler that decides
  // whether to suppress the ordinary shatter runs outside React's render.
  const [cinematic, setCinematicState] = useState<FatalitySpec | null>(null);
  // mirrored into the module-level signal so `GameOver` (a sibling with no
  // shared owner) can hold off until the cinematic is done
  const setCinematic = (spec: FatalitySpec | null) => { cinema.set(spec); setCinematicState(spec); };

  /**
   * Start a cinematic, and grab the still a beat after the break — early enough
   * that the shards are still in the air, late enough that the ring has opened.
   * Capture is fire-and-forget: a failed grab must never hold up the animation
   * or the game, it just means no share card this time.
   */
  const runCinematic = (r: BoardRenderer, spec: FatalitySpec) => {
    setCinematic(spec);
    const label = FATALITY_LABEL[spec.kind];
    const grab = setTimeout(() => {
      r.captureShare({
        eyebrow: label.eyebrow,
        title: spec.victimName,
        sub: `${spec.againstHuman ? "taken by" : "broken by"} ${spec.killerName}`,
        tint: label.tint,
      }).then((img) => { if (img) setShot({ img, spec }); }).catch(() => { /* no card */ });
    }, 1320);
    skipRef.current = r.playFatality(game.state, spec, () => {
      skipRef.current = null;
      setCinematic(null);
    });
    return () => clearTimeout(grab);
  };
  const skipRef = useRef<(() => void) | null>(null);
  const pendingFatality = useRef<FatalitySpec | null>(null);
  // The still, offered after the cinematic. Held separately from `cinematic`
  // because it outlives it — the card stays up after the camera has returned.
  const [shot, setShot] = useState<{ img: ShareShot; spec: FatalitySpec } | null>(null);

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
            // A kill that earned a fatality gets the cinematic INSTEAD of the
            // ordinary shatter, never both. The engine emits `fatality` before
            // the `combat` event for the same kill, so by the time we get here
            // the decision has already been made and is sitting in the ref.
            const fat = pendingFatality.current;
            if (fat && fat.unitId === e.defenderId) {
              pendingFatality.current = null;
              runCinematic(r, fat);
            } else {
              r.shatterUnit(e.defenderId, e.ax, e.ay, e.dx, e.dy);
            }
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
      if (e.type === "quake") {
        // v37 Colossus Quake: shockwave + shake at the epicenter, then impact FX per victim
        r.quakeFx(s, e.x, e.y);
        sound.play("catapult");
        setTimeout(() => {
          for (const v of e.victims) {
            if (v.died) r.shatterUnit(v.id, e.x, e.y, v.x, v.y);
            else {
              r.hitFlash(v.id);
              r.knockback(v.id, e.x, e.y, v.x, v.y);
            }
            r.showDamageNumber(s, v.x, v.y, 5, "#ff9b4a");
          }
          for (const w of e.wallsBroken) r.wallCrushBurst(s, w.x, w.y);
        }, 160);
      }
      if (e.type === "turnStarted" && e.tribe === s.humanTribe && s.turn > 0) sound.play("turn");
      if (e.type === "focusTile") r.focusTile(s, e.x, e.y);
      if (e.type === "gain") {
        // Each kind takes the colour its own HUD bar already uses — amber for
        // the XP bar, emerald for the HP bar — so a number that flies past
        // unread still points at the right meter. Stars have no bar; they take
        // the palette's star gold. Amber and star gold are close, but only the
        // hero ever floats XP and only XP carries a word, so the two never
        // have to be told apart at a glance.
        const GAIN = {
          xp: { label: `+${e.amount} XP`, color: "#fbbf24" },
          stars: { label: `+${e.amount}★`, color: "#ffd76a" },
          heal: { label: `+${e.amount}`, color: "#34d399" },
        } as const;
        const g = GAIN[e.kind];
        r.showGainNumber(s, e.x, e.y, g.label, g.color);
      }
      if (e.type === "fatality") {
        if (e.spec.unitId !== undefined) {
          // wait for the combat event so the cinematic starts on impact rather
          // than a frame before the blow lands
          pendingFatality.current = e.spec;
        } else {
          // a capital falling has no unit to break — play it immediately
          runCinematic(r, e.spec);
        }
      }
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
          // treaty partners are targetable: the preview panel warns that the
          // strike breaks the treaty, and the second click is the commitment
          if (attackableUnits(s, selected, true).some((e2) => e2.id === clickedUnit.id)) {
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
      {/* The sky. Babylon clears transparent, so this gradient shows wherever
          the diorama does not fill the frame — which on a first turn is most of
          it. Same palette as the menu backdrop (indigo void, ember horizon), so
          the board and the front screen read as one world. */}
      <canvas
        ref={canvasRef}
        className="h-full w-full outline-none"
        style={{
          touchAction: "none",
          background:
            "radial-gradient(120% 55% at 50% 100%, rgba(255,155,47,0.13), rgba(255,155,47,0) 62%)," +
            "linear-gradient(#191940 0%, #262657 52%, #141433 100%)",
        }}
      />
      {/* v16 brand splash — covers Babylon's first-frame flash, fades out via CSS */}
      <div
        className={`pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#141433] transition-opacity duration-500 ${booting ? "opacity-100" : "opacity-0"}`}
        aria-hidden={!booting}
      >
        <ArtOrFallback
          src={LOGO}
          className="h-24 w-24 animate-pulse drop-shadow-[0_0_30px_rgba(255,140,31,0.45)]"
          fallback={<BrandMark className="h-24 w-24 animate-pulse drop-shadow-[0_0_30px_rgba(255,140,31,0.45)]" />}
        />
        <p className="font-display text-xs font-black uppercase tracking-[0.35em] text-amber-300/90">
          Outthink. Outforge. Outlast.
        </p>
        <div className="mt-1 h-0.5 w-24 overflow-hidden rounded bg-white/10">
          <div className="h-full w-1/2 animate-[splash-sweep_0.9s_ease-in-out_infinite] rounded bg-amber-400" />
        </div>
      </div>
      {/* Fatality overlay — letterbox bars, the line, and a skip.
          Deliberately sparse: the cinematic is the board, and anything drawn
          over it competes with the thing it is meant to frame. The whole
          surface is the skip target, so a player who does not want it never
          has to aim at a button. */}
      {cinematic && (
        <div
          className="absolute inset-0 z-[60] cursor-pointer select-none"
          onPointerDown={() => skipRef.current?.()}
          role="button"
          tabIndex={0}
          aria-label="Skip"
          onKeyDown={(ev) => { if (ev.key === "Escape" || ev.key === "Enter" || ev.key === " ") skipRef.current?.(); }}
        >
          <div className="absolute inset-x-0 top-0 h-[9%] animate-[fat-bar_260ms_ease-out] bg-black/85" />
          <div className="absolute inset-x-0 bottom-0 h-[9%] animate-[fat-bar_260ms_ease-out] bg-black/85" />
          <div className="absolute inset-x-0 top-[11%] flex flex-col items-center gap-1 px-6 text-center">
            <span
              className="font-display text-[10px] font-black uppercase tracking-[0.4em]"
              style={{ color: FATALITY_LABEL[cinematic.kind].tint }}
            >
              {FATALITY_LABEL[cinematic.kind].eyebrow}
            </span>
            <span className="font-display text-xl font-black tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {cinematic.victimName}
            </span>
            <span className="text-[11px] font-medium text-white/60">
              {cinematic.againstHuman ? "taken by" : "broken by"} {cinematic.killerName}
            </span>
          </div>
          <span className="absolute bottom-[11%] right-5 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">
            Tap to skip
          </span>
        </div>
      )}
      {/* The share card — the whole point of the feature. It appears after the
          camera has returned, never during, so it does not compete with the
          thing it is advertising. Dismissed by tapping anywhere off it. */}
      {!cinematic && shot && (
        // z-[60] deliberately: GameOver is z-40 and renders later in the tree,
        // so an equal z-index loses to it and the card was being painted over
        // by the victory screen on the one fatality that matters most. Sitting
        // ABOVE the result is also the better moment to offer a share.
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/45 p-5 pb-24" onPointerDown={() => setShot(null)}>
          <div
            className="w-full max-w-xs animate-[fat-card_220ms_ease-out] overflow-hidden rounded-2xl border border-white/15 bg-[#10102c]/95 shadow-2xl backdrop-blur-md"
            onPointerDown={(ev) => ev.stopPropagation()}
          >
            {/* object-bottom, not object-center: the caption and wordmark live at the
                bottom of the still, and a centre crop hid exactly the part the
                player is about to put their name behind. */}
            <img src={shot.img.dataUrl} alt="" className="block max-h-[40vh] w-full object-cover object-bottom" />
            <div className="flex items-center gap-2 p-3">
              <button
                onClick={async () => {
                  const res = await shareShot(
                    shot.img,
                    `${shot.spec.victimName} fell in Sunder: The Living Forge.`,
                  );
                  if (res !== "failed") setShot(null);
                }}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 font-display text-[12px] font-black uppercase tracking-[0.16em] text-[#1b1b3f] transition-colors hover:bg-amber-300 active:scale-[0.98]"
              >
                Share this kill
              </button>
              <button
                onClick={() => setShot(null)}
                className="min-h-[44px] rounded-lg border border-white/10 px-4 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300 transition-colors hover:bg-white/10 active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Eyebrow copy per trigger. Kept out of the component so the three cases are
 *  readable side by side — they are the only thing that distinguishes them. */
const FATALITY_LABEL: Record<FatalitySpec["kind"], { eyebrow: string; tint: string }> = {
  commander: { eyebrow: "Commander Slain", tint: "#ff8a8a" },
  capital: { eyebrow: "Capital Sundered", tint: "#ffd76a" },
  final: { eyebrow: "The Sundering", tint: "#9fd8ff" },
};
