// Turning a fatality into something that leaves the phone.
//
// The obvious build — record the canvas with MediaRecorder and share an MP4 —
// is the one path that does not work where Sunder ships. WebKit bug 229611:
// MediaRecorder driven by canvas.captureStream() produces a blank video on iOS.
// That is WKWebView, which is the entire iOS app. So video is off the table
// until it is built natively, and the share has to be a still.
//
// The delivery has the same shape of problem: the Web Share API is not
// dependable inside WKWebView either, so the native build goes through
// @capacitor/share and writes the PNG to disk first. See shareShot().
//
// A still is a smaller thing than a clip, but it is not a consolation prize
// here: the cinematic holds on one framing for most of a second, so there is a
// real peak frame to take, and a flat-shaded board survives being a PNG far
// better than a photographic game would.
//
// Two things had to be checked rather than assumed, and both are load-bearing:
//
//  1. The engine runs with `preserveDrawingBuffer: false`, which normally makes
//     canvas.toDataURL() return an empty image. Grabbing inside
//     `onAfterRenderObservable` works anyway, because the drawing buffer is
//     still intact at that point in the frame. Measured: a naive grab came back
//     15KB (blank), the same grab inside the observable came back 134KB.
//
//  2. The canvas is TRANSPARENT. Sunder's sky is a CSS gradient painted behind
//     the canvas, not a clear colour inside it, so a raw grab has no background
//     at all and arrives see-through in whatever app it lands in. The gradient
//     below is the same one GameCanvas paints, and compositing it is not
//     optional.
import type { Scene } from "@babylonjs/core/scene";

/** Same gradient GameCanvas paints behind the transparent canvas. */
function paintVoid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#191940");
  g.addColorStop(0.52, "#262657");
  g.addColorStop(1, "#141433");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // the warm floor glow, so the still matches what was on screen
  const r = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.62);
  r.addColorStop(0, "rgba(255,155,47,0.13)");
  r.addColorStop(1, "rgba(255,155,47,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
}

export interface ShareShot {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Grab the current frame and compose a shareable still: the board over the
 * void, a caption, and the wordmark.
 *
 * The wordmark is not decoration. A screenshot with no name on it is a picture
 * of a game nobody can find — attribution is the only part of this that does
 * any marketing work once the image leaves the device.
 */
export async function captureShareShot(
  scene: Scene,
  canvas: HTMLCanvasElement,
  caption: { eyebrow: string; title: string; sub: string; tint: string },
): Promise<ShareShot | null> {
  const raw = await new Promise<string | null>((resolve) => {
    let settled = false;
    const done = (v: string | null) => { if (!settled) { settled = true; resolve(v); } };
    // If the scene stops rendering (tab hidden, engine disposed) this would
    // otherwise never resolve and the share button would hang forever.
    const timer = setTimeout(() => done(null), 1200);
    scene.onAfterRenderObservable.addOnce(() => {
      clearTimeout(timer);
      try { done(canvas.toDataURL("image/png")); } catch { done(null); }
    });
  });
  if (!raw) return null;

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = raw;
  });
  if (!img) return null;

  const w = img.width;
  const h = img.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  paintVoid(ctx, w, h);
  ctx.drawImage(img, 0, 0);

  // caption block, bottom-left, over a soft scrim so it survives a bright board
  const scale = w / 430; // layout was designed at phone width
  const pad = 22 * scale;
  const scrim = ctx.createLinearGradient(0, h - 200 * scale, 0, h);
  scrim.addColorStop(0, "rgba(10,10,28,0)");
  scrim.addColorStop(0.45, "rgba(10,10,28,0.62)");
  scrim.addColorStop(1, "rgba(10,10,28,0.94)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - 200 * scale, w, 200 * scale);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = caption.tint;
  ctx.font = `900 ${11 * scale}px Fredoka, sans-serif`;
  ctx.letterSpacing = `${3 * scale}px`;
  ctx.fillText(caption.eyebrow.toUpperCase(), pad, h - 118 * scale);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${30 * scale}px Fredoka, sans-serif`;
  ctx.fillText(caption.title, pad, h - 80 * scale);

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = `500 ${14 * scale}px Fredoka, sans-serif`;
  ctx.fillText(caption.sub, pad, h - 56 * scale);

  // attribution — the only part that does marketing work off-device.
  // The tagline is placed by MEASURING the wordmark rather than by a fixed
  // offset: letterSpacing widens the text past any guess, and the first
  // version had the two strings touching.
  ctx.fillStyle = "rgba(255,215,106,0.92)";
  ctx.font = `900 ${13 * scale}px Fredoka, sans-serif`;
  ctx.letterSpacing = `${4 * scale}px`;
  const markW = ctx.measureText("SUNDER").width;
  ctx.fillText("SUNDER", pad, h - 24 * scale);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.font = `500 ${11 * scale}px Fredoka, sans-serif`;
  ctx.fillText("THE LIVING FORGE", pad + markW + 10 * scale, h - 24 * scale);

  return { dataUrl: out.toDataURL("image/png"), width: w, height: h };
}

function dataUrlToFile(dataUrl: string, name: string): File | null {
  try {
    const [head, b64] = dataUrl.split(",");
    const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: mime });
  } catch {
    return null;
  }
}

export type ShareResult = "shared" | "downloaded" | "failed";

const FILE_NAME = "sunder-fatality.png";

/**
 * Native share, via the OS sheet.
 *
 * iOS will not share a data: URL — the sheet needs a real file on disk — so the
 * PNG is written to the cache directory first and shared by URI. Cache rather
 * than Documents on purpose: this is a throwaway the system can reclaim, and
 * anything in Documents shows up in the Files app forever.
 *
 * Everything is imported dynamically so the plugins never enter the web
 * bundle's critical path; on a browser this function is not reached at all.
 */
async function shareNative(shot: ShareShot, text: string): Promise<ShareResult> {
  try {
    const [{ Share }, { Filesystem, Directory }] = await Promise.all([
      import("@capacitor/share"),
      import("@capacitor/filesystem"),
    ]);
    const base64 = shot.dataUrl.split(",")[1];
    await Filesystem.writeFile({ path: FILE_NAME, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: FILE_NAME, directory: Directory.Cache });
    await Share.share({ text, files: [uri] });
    return "shared";
  } catch (e) {
    // Dismissing the sheet rejects on iOS. That is a choice, not a failure, and
    // it must not fall through to a second attempt the player did not ask for.
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|abort|dismiss/i.test(msg)) return "shared";
    return "failed";
  }
}

/**
 * Hand the still to the OS share sheet.
 *
 * Three routes, in order, because no single one covers where this runs:
 *
 *   NATIVE   @capacitor/share. Required, not preferred: inside Capacitor's
 *            WKWebView the Web Share API is not dependable, and the download
 *            fallback below is close to useless on a phone — which is where
 *            this feature is supposed to earn its keep.
 *   WEB      navigator.share with files. `canShare({ files })` is the only
 *            reliable test; several browsers expose `share` but reject files,
 *            and feature-detecting the method alone throws at the point of use
 *            instead of falling back cleanly.
 *   DESKTOP  a download, which is the honest behaviour on a machine with no
 *            share sheet.
 */
export async function shareShot(shot: ShareShot, text: string): Promise<ShareResult> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const res = await shareNative(shot, text);
      // A native failure falls through to the web attempt rather than dead-ending
      if (res !== "failed") return res;
    }
  } catch { /* not a Capacitor build */ }

  const file = dataUrlToFile(shot.dataUrl, FILE_NAME);
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (file && typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch (e) {
      // AbortError means the user dismissed the sheet — not a failure, and it
      // must not fall through to a surprise download.
      if (e instanceof Error && e.name === "AbortError") return "shared";
    }
  }
  try {
    const a = document.createElement("a");
    a.href = shot.dataUrl;
    a.download = FILE_NAME;
    a.click();
    return "downloaded";
  } catch {
    return "failed";
  }
}
