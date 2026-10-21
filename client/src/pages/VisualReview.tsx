import { useEffect, useRef, useState } from "react";
import { BoardRenderer } from "@/game/render/scene";
import { createVisualReviewState } from "@/game/render/visualReviewFixture";
import { VISUAL_REVIEW_ROSTER } from "@/game/render/visualReview";
import { HERO_NAMES, TRIBE_DEFS, type GameState } from "@/game/core/types";
import { MAP_PRESETS, type MapPreset } from "@/game/core/mapgen";
import { reachableTiles } from "@/game/core/rules";

export default function VisualReview() {
  const initial = new URLSearchParams(window.location.search);
  const [identity, setIdentity] = useState(() => {
    const value = Number(initial.get("tribe") ?? 4);
    return Number.isInteger(value) && value >= 0 && value < 8 ? value : 4;
  });
  const [preset, setPreset] = useState<MapPreset>(() => MAP_PRESETS.some(p => p.id === initial.get("preset")) ? initial.get("preset") as MapPreset : "archipelago");
  const [imported, setImported] = useState(initial.get("units") !== "procedural");
  const [landscape, setLandscape] = useState(initial.get("terrain") !== "original");
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState({ ready: 0, pending: 0, failed: 0, meshes: 0 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<{ renderer: BoardRenderer; state: GameState } | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV || !canvas.current) return;
    const query = new URLSearchParams({ devgame: "", tribe: String(identity), preset,
      units: imported ? "imported" : "procedural", terrain: landscape ? "world-v3" : "original" });
    if (imported) query.set("visual-review", "roster-v1");
    // Occupied lanes are tied to the combined roster flag; the plain terrain toggle still compares authentic world-v3.
    if (landscape) query.set("landscape-pilot", "world-v3");
    window.history.replaceState(null, "", `/visual-review?${query}`);
    const state = createVisualReviewState(identity, 6104, preset);
    const renderer = new BoardRenderer(canvas.current);
    view.current = { renderer, state };
    (window as unknown as Record<string, unknown>).__sunderVisualFixture = state;
    (window as unknown as Record<string, unknown>).__sunderVisualRenderer = renderer;
    renderer.buildBoard(state);
    renderer.syncUnits(state);
    renderer.showHighlights(state);
    renderer.onPick = ({ x, y }) => {
      const unit = state.units.find(u => u.x === x && u.y === y);
      state.selectedUnitId = unit?.id ?? null;
      setSelected(state.selectedUnitId);
      renderer.showHighlights(state);
    };
    const timer = window.setInterval(() => {
      const nodes = renderer.scene.transformNodes.filter(n => /^u\d+$/.test(n.name));
      setStatus({
        ready: nodes.filter(n => n.metadata?.visualRosterPreview).length,
        pending: nodes.filter(n => n.metadata?.visualImportState === "loading").length,
        failed: nodes.filter(n => n.metadata?.visualImportState === "failed").length,
        meshes: renderer.scene.meshes.filter(m => m.getTotalVertices() > 0).length,
      });
    }, 500);
    return () => {
      window.clearInterval(timer);
      renderer.dispose();
      view.current = null;
      delete (window as unknown as Record<string, unknown>).__sunderVisualFixture;
      delete (window as unknown as Record<string, unknown>).__sunderVisualRenderer;
    };
  }, [identity, preset, imported, landscape]);

  const focus = (id: number) => {
    const current = view.current;
    const unit = current?.state.units.find(u => u.id === id);
    if (!current || !unit) return;
    current.state.selectedUnitId = id;
    setSelected(id);
    current.renderer.focusTile(current.state, unit.x, unit.y);
    current.renderer.showHighlights(current.state);
  };
  const hop = () => {
    const current = view.current;
    const unit = current?.state.units.find(u => u.id === current.state.selectedUnitId);
    if (!current || !unit) return;
    const choices = reachableTiles(current.state, unit).filter(t => t.x !== unit.x || t.y !== unit.y);
    const target = choices.sort((a, b) => Math.abs(a.x - unit.x) + Math.abs(a.y - unit.y) - Math.abs(b.x - unit.x) - Math.abs(b.y - unit.y))[0];
    if (!target) return;
    unit.x = target.x; unit.y = target.y;
    for (const tile of current.state.tiles) {
      if (Math.max(Math.abs(tile.x - unit.x), Math.abs(tile.y - unit.y)) <= 2) tile.explored[0] = true;
    }
    current.renderer.buildBoard(current.state);
    current.renderer.syncUnits(current.state);
    current.renderer.showHighlights(current.state);
  };
  const roles = VISUAL_REVIEW_ROSTER.filter(e => e.tribeIndex === identity);
  const button = "min-h-[40px] rounded border border-white/15 bg-[#202044] px-3 py-2 text-xs font-semibold hover:bg-[#303060] focus-visible:outline-2 focus-visible:outline-amber-300";
  if (!import.meta.env.DEV) return null;
  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#141433] text-slate-100">
      <header className="shrink-0 border-b border-white/10 bg-[#10102c] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="font-display text-base font-bold">Sunder · combined visual review</h1><p className="text-[11px] text-amber-200/85">Review candidates only · not TestFlight art · does not save</p></div>
          <a href="/" className={button}>Back to game</a>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select aria-label="Tribe" value={identity} onChange={e => { setSelected(null); setIdentity(Number(e.target.value)); }} className={button}>
            {TRIBE_DEFS.map((tribe, index) => <option key={index} value={index}>{tribe.name}</option>)}
          </select>
          <select aria-label="Landscape preset" value={preset} onChange={e => setPreset(e.target.value as MapPreset)} className={button}>
            {MAP_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button aria-pressed={imported} onClick={() => setImported(value => !value)} className={button}>{imported ? "Units: imported" : "Units: procedural"}</button>
          <button aria-pressed={landscape} onClick={() => setLandscape(value => !value)} className={button}>{landscape ? "Terrain: world-v3" : "Terrain: original"}</button>
          <button onClick={hop} disabled={selected === null} className={`${button} disabled:opacity-40`}>Preview hop</button>
        </div>
      </header>
      <section className="relative min-h-0 flex-1" aria-label="Live Babylon review board">
        <canvas ref={canvas} className="h-full w-full touch-none" style={{ background: "linear-gradient(#191940,#262657 52%,#141433)" }} />
        <div className="pointer-events-none absolute left-3 top-3 max-w-[90%] rounded bg-[#10102c]/85 px-3 py-2 text-[11px] shadow">
          <strong style={{ color: TRIBE_DEFS[identity].color }}>{TRIBE_DEFS[identity].name}</strong> · seed 6104 · {roles.length} original models
          <div aria-live="polite">{imported ? `${status.ready} instances ready · ${status.pending} loading · ${status.failed} fallback` : "Canonical procedural comparison"} · {status.meshes} render meshes</div>
        </div>
      </section>
      <footer className="shrink-0 border-t border-white/10 bg-[#10102c] px-3 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {roles.map((role, index) => <button key={role.unitType} onClick={() => focus(index + 1)} className={`${button} shrink-0 ${selected === index + 1 ? "border-amber-300" : ""}`}>
            {role.unitType === "hero" ? HERO_NAMES[identity] : role.unitType}
          </button>)}
        </div>
        <p className="mt-1 text-[10px] text-slate-400">All eight tribes; 46 audited originals. Unsupported/boat/custom roles remain procedural. Drag to orbit; select a role then preview a hop. Contrast and native device budgets still require review.</p>
      </footer>
    </main>
  );
}
