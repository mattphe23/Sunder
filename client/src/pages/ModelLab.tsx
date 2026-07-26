// v42 Model Lab — the designer's acceptance harness.
// "Every model must pass at 40px in color, grayscale, and eight rotational
// views before its portraits are exported."
// Renders the six Nerivane classes straight from the board meshes via the
// portrait pipeline and lays out the acceptance grid. Dev/review tool — linked
// from nowhere; visit /model-lab directly.
import { useEffect, useState } from "react";
import { createPortraitSession, NERIVANE_PORTRAIT_SET, PORTRAIT_EXPORT_SIZES } from "@/game/render/portraits";
import { Button } from "@/components/ui/button";
import type { UnitType } from "@/game/core/types";

const LABELS: Record<string, string> = {
  warrior: "Warrior", archer: "Archer", defender: "Defender",
  rider: "Rider", tidecaller: "Tidecaller", hero: "Nereth (Hero)",
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

  useEffect(() => {
    // stagger renders so the tab stays responsive
    let cancelled = false;
    (async () => {
      const session = createPortraitSession();
      if (!session) { setFailed(true); return; }
      // throwaway warm-up capture: compiles the pipeline so every real
      // capture (including the first class's angle sweep) reads back solid
      await session.capture(4, "warrior", { sizes: [64] });
      const out: Row[] = [];
      for (const type of NERIVANE_PORTRAIT_SET) {
        await new Promise((r) => setTimeout(r, 10));
        if (cancelled) { session.dispose(); return; }
        const master = await session.capture(4, type);
        const angles: string[] = [];
        for (const yaw of ANGLES) {
          const p = await session.capture(4, type, { yaw, sizes: [128] });
          angles.push(p.webp[128] ?? "");
        }
        out.push({ type, master: master.masterPng, angles, exports: master.webp });
        if (!cancelled) setRows([...out]);
      }
      session.dispose();
    })();
    return () => { cancelled = true; };
  }, []);

  if (failed) return <div className="p-8 text-red-400">WebGL unavailable — portraits cannot render in this browser.</div>;

  return (
    <div className="min-h-screen bg-[#141433] text-slate-100 p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Model Lab — Nerivane v42 acceptance</h1>
        <p className="text-sm text-slate-400">
          Rendered live from the board meshes via the portrait pipeline (orthographic 3/4, transparent,
          shared feet baseline). Pass criteria: class identity must survive at 40px in color, grayscale,
          and all eight rotational views.
        </p>
      </header>
      {!rows && <div className="text-slate-400">Rendering models…</div>}
      {rows?.map((r) => (
        <section key={r.type} className="rounded-xl bg-[#1c1c46] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{LABELS[r.type]}</h2>
            <div className="flex gap-2">
              {PORTRAIT_EXPORT_SIZES.map((s) => (
                <a key={s} href={r.exports[s]} download={`nerivane-${r.type}-${s}.webp`}>
                  <Button variant="outline" size="sm">{s}px</Button>
                </a>
              ))}
              <a href={r.master} download={`nerivane-${r.type}-1024.png`}>
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
