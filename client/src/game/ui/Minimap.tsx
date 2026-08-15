// Sunder minimap — Isoglow: canvas overview of explored terrain, cities, units.
// Toggleable; especially useful on 13×13 maps.
import { useEffect, useRef, useState } from "react";
import { useGame } from "../useGame";
import { idx } from "../core/types";
import { isVisibleTo } from "../core/rules";
import { Map as MapIcon, X } from "lucide-react";

import { biomeFor } from "../render/palette";

export function Minimap() {
  const g = useGame();
  const s = g.state;
  const [open, setOpen] = useState(s.size >= 13);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pulseTick, setPulseTick] = useState(0);

  // repaint every 400ms while a raid-ready camp is visible so its red ring pulses
  useEffect(() => {
    if (!open || s.phase === "menu") return;
    const hot = (s.camps ?? []).some(c => c.strength >= 3 && s.tiles[idx(c.x, c.y, s.size)]?.explored[s.humanTribe]);
    if (!hot) return;
    const iv = setInterval(() => setPulseTick(t => t + 1), 400);
    return () => clearInterval(iv);
  }, [open, s, s.phase]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas || s.phase === "menu") return;
    const px = Math.floor(160 / s.size);
    const dim = px * s.size;
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0d0d26";
    ctx.fillRect(0, 0, dim, dim);
    for (const t of s.tiles) {
      if (!t.explored[s.humanTribe]) continue;
      const vis = isVisibleTo(s, s.humanTribe, t.x, t.y);
      ctx.globalAlpha = vis ? 1 : 0.42;
      ctx.fillStyle = biomeFor(s.preset).terrain[t.terrain].top;
      ctx.fillRect(t.x * px, t.y * px, px, px);
      if (t.port !== null) {
        ctx.fillStyle = "#a97c50";
        ctx.fillRect(t.x * px + px / 4, t.y * px + px / 4, px / 2, px / 2);
      }
    }
    ctx.globalAlpha = 1;
    // v18: barbarian camps — orange diamonds; strength 3+ pulses a red threat ring
    for (const camp of s.camps ?? []) {
      const t = s.tiles[idx(camp.x, camp.y, s.size)];
      if (!t?.explored[s.humanTribe]) continue;
      const cx = camp.x * px + px / 2, cy = camp.y * px + px / 2;
      ctx.fillStyle = "#e8843a";
      ctx.beginPath();
      ctx.moveTo(cx, cy - px * 0.4);
      ctx.lineTo(cx + px * 0.4, cy);
      ctx.lineTo(cx, cy + px * 0.4);
      ctx.lineTo(cx - px * 0.4, cy);
      ctx.closePath();
      ctx.fill();
      if (camp.strength >= 3) {
        // raid imminent — pulsing red ring (pulse phase from wall-clock so it animates on redraws)
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 300);
        ctx.strokeStyle = `rgba(255,64,64,${pulse.toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(3, px * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    for (const c of s.cities) {
      const t = s.tiles[idx(c.x, c.y, s.size)];
      if (!t.explored[s.humanTribe]) continue;
      ctx.fillStyle = c.tribe === null ? "#c9b896" : s.tribes[c.tribe].color;
      ctx.beginPath();
      ctx.arc(c.x * px + px / 2, c.y * px + px / 2, Math.max(2.5, px * 0.45), 0, Math.PI * 2);
      ctx.fill();
      if (c.isCapital) {
        ctx.strokeStyle = "#ffd76a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    for (const u of s.units) {
      const t = s.tiles[idx(u.x, u.y, s.size)];
      if (!t.explored[s.humanTribe]) continue;
      if (u.tribe !== s.humanTribe && !isVisibleTo(s, s.humanTribe, u.x, u.y)) continue;
      // world units (raiders/guardians) have no tribe — draw them hostile red
      ctx.fillStyle = u.tribe >= 0 ? s.tribes[u.tribe].color : "#c03030";
      ctx.fillRect(u.x * px + px / 3, u.y * px + px / 3, px / 3, px / 3);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.75;
      ctx.strokeRect(u.x * px + px / 3, u.y * px + px / 3, px / 3, px / 3);
    }
  }, [open, s, g.getVersion(), pulseTick]);

  if (s.phase === "menu") return null;

  return (
    <div className="safe-t-offset pointer-events-auto absolute right-3 z-20">
      {open ? (
        <div className="rounded-xl border border-white/10 bg-[#1b1b3f]/85 p-2 shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Map</span>
            <button onClick={() => setOpen(false)} aria-label="Close minimap">
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
          <canvas ref={canvasRef} className="rounded-md" style={{ imageRendering: "pixelated", width: 160, height: 160 }} />
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#1b1b3f]/85 px-3 py-2 text-xs text-slate-200 shadow-xl shadow-black/40 backdrop-blur-md hover:bg-[#2a2a55]"
        >
          <MapIcon className="h-4 w-4 text-cyan-300" /> Map
        </button>
      )}
    </div>
  );
}
