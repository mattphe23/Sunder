// Sunder brand assets — procedural, dependency-free.
//
// The hosted build serves painted PNGs from /manus-storage. Those 404 in any
// other environment (local dev, self-hosting, an App Store wrapper bundle),
// which used to leave the very first screen showing broken-image icons. These
// inline-SVG marks always render, so the opening frame is never broken; the
// painted art is layered on top as progressive enhancement when it loads.
import { useEffect, useState } from "react";

/** Mountain-anvil mark with a glowing fissure — the Sunder sigil. */
export function BrandMark({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="sunder-mark-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8c0d8" />
          <stop offset="100%" stopColor="#5d6486" />
        </linearGradient>
        <linearGradient id="sunder-mark-ember" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd76a" />
          <stop offset="55%" stopColor="#ff9b2f" />
          <stop offset="100%" stopColor="#e2622b" />
        </linearGradient>
      </defs>
      {/* left peak (shadow face) */}
      <path d="M8 74 L30 30 L46 60 L38 74 Z" fill="#4a5074" />
      {/* right peak (lit face) */}
      <path d="M38 74 L58 22 L88 74 Z" fill="url(#sunder-mark-stone)" />
      {/* snow cap */}
      <path d="M58 22 L68 40 L58 44 L50 38 Z" fill="#f2f5ff" />
      {/* the sunder — a glowing fissure splitting the massif */}
      <path d="M52 74 L44 52 L54 56 L48 36 L62 60 L53 58 L60 74 Z" fill="url(#sunder-mark-ember)" />
      {/* anvil plinth the mountains stand on */}
      <path d="M4 76 H92 L86 84 H10 Z" fill="#3a4062" />
      <rect x="26" y="84" width="44" height="6" rx="1.5" fill="#2a2f4c" />
    </svg>
  );
}

/** Chiseled SUNDER wordmark: faceted display type with an ember underglow. */
export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 96" className={className} role="img" aria-label="SUNDER">
      <defs>
        <linearGradient id="sunder-word-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6e2" />
          <stop offset="52%" stopColor="#f6c98a" />
          <stop offset="53%" stopColor="#e2914a" />
          <stop offset="100%" stopColor="#c4632a" />
        </linearGradient>
      </defs>
      {/* shadow pass gives the letters carved depth */}
      <text
        x="240" y="66" textAnchor="middle"
        fontFamily="Sora, system-ui, sans-serif" fontSize="72" fontWeight="800"
        letterSpacing="10" fill="#5a2a12" opacity="0.85"
      >
        SUNDER
      </text>
      <text
        x="240" y="63" textAnchor="middle"
        fontFamily="Sora, system-ui, sans-serif" fontSize="72" fontWeight="800"
        letterSpacing="10" fill="url(#sunder-word-face)"
      >
        SUNDER
      </text>
      {/* ember fissure running under the wordmark */}
      <path d="M96 80 L168 76 L214 82 L286 74 L352 80 L384 76" stroke="#ff9b2f" strokeWidth="3" fill="none" opacity="0.9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Procedural menu backdrop: a low-poly island diorama in the game's own
 * palette. Stands in for the painted hero art and, unlike a flat color,
 * still says "this is a strategy game about a shattered world".
 */
export function BrandBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="sunder-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b1b44" />
          <stop offset="60%" stopColor="#232355" />
          <stop offset="100%" stopColor="#141433" />
        </linearGradient>
        <radialGradient id="sunder-glow" cx="0.5" cy="0.95" r="0.7">
          <stop offset="0%" stopColor="#ff9b2f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff9b2f" stopOpacity="0" />
        </radialGradient>
        {/* readability scrim baked in: keeps the centre column legible while
            leaving the flanking shards bright */}
        <linearGradient id="sunder-scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#141433" stopOpacity="0.5" />
          <stop offset="45%" stopColor="#141433" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#141433" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#sunder-sky)" />
      <rect width="1440" height="900" fill="url(#sunder-glow)" />
      {/* A wide, low horizon of floating shards. Everything sits in the bottom
          band and repeats across the full width, so the composition still
          reads if the viewport crops it at any aspect ratio. */}
      {[
        { x: -260, y: 370, s: 1.45, o: 1, peak: 1 },
        { x: -180, y: 190, s: 0.85, o: 0.55, peak: 0 },
        { x: 1010, y: 370, s: 1.45, o: 1, peak: 1 },
        { x: 1080, y: 175, s: 0.85, o: 0.55, peak: 0 },
      ].map((isl) => (
        <g key={`${isl.x}-${isl.y}`} transform={`translate(${isl.x} ${isl.y}) scale(${isl.s})`} opacity={isl.o}>
          {/* slab top + chunky underside — the game's diorama silhouette */}
          <path d="M0 0 L250 0 L280 34 L-30 34 Z" fill="#63d47f" />
          <path d="M-30 34 L280 34 L246 132 L6 132 Z" fill="#358457" />
          {/* shallow sea skirt */}
          <path d="M-96 38 L346 38 L322 74 L-74 74 Z" fill="#3f8fd0" opacity="0.55" />
          {isl.peak ? (
            <>
              <path d="M84 0 L128 -74 L172 0 Z" fill="#96a3ba" />
              <path d="M128 -74 L150 -38 L128 -30 L107 -36 Z" fill="#eef3ff" />
            </>
          ) : null}
          {/* forest cones along the shelf */}
          {[16, 48, 196, 224].map((tx, i) => (
            <g key={tx} transform={`translate(${tx} -2)`}>
              <path d="M0 0 L9 -28 L18 0 Z" fill={i % 2 ? "#2f8a3d" : "#3da34c"} />
              <rect x="7" y="0" width="4" height="7" fill="#6d4a2f" />
            </g>
          ))}
          {/* ember fissure down the shard's face */}
          <path d="M96 38 L120 62 L102 78 L134 106 L116 132" stroke="#ffb146" strokeWidth="4" fill="none" opacity="0.9" strokeLinecap="round" />
        </g>
      ))}
      <rect width="1440" height="900" fill="url(#sunder-scrim)" />
    </svg>
  );
}

/** true until the image at `src` fails to load (used to swap in brand art) */
export function useArtAvailable(src: string): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.onerror = () => { if (live) setOk(false); };
    img.src = src;
    return () => { live = false; };
  }, [src]);
  return ok;
}

/**
 * Renders painted art when it loads, and a procedural fallback when it does
 * not. Prevents the broken-image state on the app's first screen.
 */
export function ArtOrFallback({
  src, alt = "", className, style, fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
