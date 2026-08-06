// Model Lab — the designer's acceptance harness.
// "Every model must pass at 40px in color, grayscale, and eight rotational
// views before its portraits are exported."
// Renders each tribe's six board classes straight from the board meshes via the
// portrait pipeline and lays out the acceptance grid. Dev/review tool — linked
// from nowhere; visit /model-lab directly.
import { useEffect, useState } from "react";
import { createPortraitSession, NERIVANE_PORTRAIT_SET, PORTRAIT_EXPORT_SIZES } from "@/game/render/portraits";
import { Button } from "@/components/ui/button";
import { TRIBE_DEFS } from "@/game/core/types";
import type { UnitType } from "@/game/core/types";

const LABELS: Record<string, string> = {
  warrior: "Warrior", archer: "Archer", defender: "Defender",
  rider: "Rider", tidecaller: "Unique Unit", hero: "Hero",
};
const ANGLES = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

interface Row {
  type: UnitType;
  master: string;          // 3/4 master portrait (png data url)
  angles: string[];        // 8 rotational views (128px webp)
  exports: Record<number, string>;
}

export default function ModelLab() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  // which tribe's lineup to render (defIndex into TRIBE_DEFS); Nerivane is the
  // pilot tribe the locked spec was authored against, so it opens first
  // `?tribe=<index>` deep-links a specific lineup (used for review screenshots)
  const [tribe, setTribe] = useState(() => {
    const q = Number(new URLSearchParams(window.location.search).get("tribe"));
    return Number.isInteger(q) && q >= 0 && q < TRIBE_DEFS.length ? q : 4;
  });

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    (async () => {
      const session = createPortraitSession();
      if (!session) { setFailed(true); return; }
      // throwaway warm-up capture: compiles the pipeline so every real
      // capture (including the first class's angle sweep) reads back solid
      await session.capture(tribe, "warrior", { sizes: [64] });
      const out: Row[] = [];
      for (const type of NERIVANE_PORTRAIT_SET) {
        await new Promise((r) => setTimeout(r, 10));
        if (cancelled) { session.dispose(); return; }
        const master = await session.capture(tribe, type);
        const angles: string[] = [];
        for (const yaw of ANGLES) {
          const p = await session.capture(tribe, type, { yaw, sizes: [128] });
          angles.push(p.webp[128] ?? "");
        }
        out.push({ type, master: master.masterPng, angles, exports: master.webp });
        if (!cancelled) setRows([...out]);
      }
      session.dispose();
    })();
    return () => { cancelled = true; };
  }, [tribe]);

  if (failed) return <div className="p-8 text-red-400">WebGL unavailable — portraits cannot render in this browser.</div>;

  const def = TRIBE_DEFS[tribe];
  const slug = def.name.toLowerCase();

  return (
    <div className="min-h-screen bg-[#141433] text-slate-100 p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Model Lab — board-model acceptance</h1>
        <p className="text-sm text-slate-400">
          Rendered live from the board meshes via the portrait pipeline (orthographic 3/4, transparent,
          shared feet baseline). Pass criteria: class identity must survive at 40px in color, grayscale,
          and all eight rotational views. All tribes share the faceted mask face, proportions, camera,
          shading and fractured base; crests, armor geometry and equipment stay tribe-specific.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {TRIBE_DEFS.map((d, i) => (
            <Button
              key={d.name}
              size="sm"
              variant={i === tribe ? "default" : "outline"}
              onClick={() => setTribe(i)}
              style={i === tribe ? undefined : { borderColor: d.color, color: d.color }}
            >
              {d.name}
            </Button>
          ))}
        </div>
      </header>
      <div className="text-sm" style={{ color: def.color }}>
        {def.name} — {def.passiveDesc ?? ""}
      </div>
      {!rows && <div className="text-slate-400">Rendering models…</div>}
      {rows?.map((r) => (
        <section key={r.type} className="rounded-xl bg-[#1c1c46] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{LABELS[r.type]}</h2>
            <div className="flex gap-2">
              {PORTRAIT_EXPORT_SIZES.map((s) => (
                <a key={s} href={r.exports[s]} download={`${slug}-${r.type}-${s}.webp`}>
                  <Button variant="outline" size="sm">{s}px</Button>
                </a>
              ))}
              <a href={r.master} download={`${slug}-${r.type}-1024.png`}>
                <Button size="sm">Master PNG</Button>
              </a>
            </div>
          </div>
          <div className="flex items-end gap-6 flex-wrap">
            {/* master at display size */}
            <img src={r.master} alt="" className="w-40 h-40 bg-[#101030] rounded-lg" />
            {/* 40px acceptance: color + grayscale */}
            <div className="flex flex-col items-center gap-1">
              <img src={r.master} alt="" style={{ width: 40, height: 40 }} className="bg-[#101030] rounded" />
              <span className="text-[10px] text-slate-400">40px color</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <img src={r.master} alt="" style={{ width: 40, height: 40, filter: "grayscale(1)" }} className="bg-[#101030] rounded" />
              <span className="text-[10px] text-slate-400">40px gray</span>
            </div>
            {/* eight rotational views */}
            <div className="flex gap-1 items-end">
              {r.angles.map((a, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <img src={a} alt="" style={{ width: 56, height: 56 }} className="bg-[#101030] rounded" />
                  <span className="text-[10px] text-slate-500">{i * 45}°</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
