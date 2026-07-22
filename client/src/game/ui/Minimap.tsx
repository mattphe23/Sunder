// Polyforge minimap — Isoglow: canvas overview of explored terrain, cities, units.
// Toggleable; especially useful on 13×13 maps.
import { useEffect, useRef, useState } from "react";
import { useGame } from "../useGame";
import { idx } from "../core/types";
import { isVisibleTo } from "../core/rules";
import { Map as MapIcon, X } from "lucide-react";

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#7ec850",
  forest: "#3e9142",
  mountain: "#b8c4d4",
  water: "#3f8fd4",
  ocean: "#20509c",
};

export function Minimap() {
  const g = useGame();
  const s = g.state;
  const [open, setOpen] = useState(s.size >= 13);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      ctx.fillStyle = TERRAIN_COLORS[t.terrain];
      ctx.fillRect(t.x * px, t.y * px, px, px);
      if (t.port !== null) {
        ctx.fillStyle = "#a97c50";
        ctx.fillRect(t.x * px + px / 4, t.y * px + px / 4, px / 2, px / 2);
      }
    }
    ctx.globalAlpha = 1;
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
      ctx.fillStyle = s.tribes[u.tribe].color;
      ctx.fillRect(u.x * px + px / 3, u.y * px + px / 3, px / 3, px / 3);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.75;
      ctx.strokeRect(u.x * px + px / 3, u.y * px + px / 3, px / 3, px / 3);
    }
  }, [open, s, g.getVersion()]);

  if (s.phase === "menu") return null;

  return (
    <div className="pointer-events-auto absolute right-3 top-14 z-20">
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
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#1b1b3f]/85 px-3 py-2 text-xs text-slate-200 shadow-xl shadow-black/40 backdrop-blur-md hover:bg-[#2a2a55]"
        >
          <MapIcon className="h-4 w-4 text-cyan-300" /> Map
        </button>
      )}
    </div>
  );
}
