// Lazy skin preview for Store cards: mounts a tiny Babylon turntable of the
// character rig wearing the skin. Babylon is loaded on demand (dynamic import,
// shares the existing lazy babylon chunk) and only when the card is on screen.
// Falls back to a static two-tone swatch when WebGL/import fails.
import { useEffect, useRef, useState } from "react";

export default function SkinPreview({ skinKey, accent, className = "mb-3" }: { skinKey: string; accent: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);

  // mount the 3D scene only when the card scrolls into view
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let handle: { dispose: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { mountSkinPreview } = await import("@/game/render/skinPreview");
        if (cancelled || !canvasRef.current) return;
        handle = mountSkinPreview(canvasRef.current, skinKey);
        if (!handle) setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; handle?.dispose(); };
  }, [visible, skinKey]);

  return (
    <div ref={wrapRef} className={`${className} h-28 w-full overflow-hidden rounded-lg`} style={{ background: `radial-gradient(ellipse at 50% 80%, ${accent}22, transparent 70%)` }}>
      {failed ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-white/20" style={{ background: accent }} />
        </div>
      ) : (
        <canvas ref={canvasRef} className="h-full w-full" style={{ touchAction: "pan-y" }} aria-label="Skin preview" />
      )}
    </div>
  );
}
