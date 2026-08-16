// ── Brand asset drift check ──────────────────────────────────────────────────
//
// The icon and splash are rendered from the same procedural sigil as the in-app
// brand mark, so the home screen and the game cannot drift apart — but only if
// the committed PNGs really are what the source renders today. This checks that.
//
// It compares PIXELS, not bytes. A byte comparison looks like it works and then
// fails on the first CI run: two Chromium builds render the same image and
// write it with a couple of bytes' difference in the PNG container (ancillary
// chunk contents, a different zlib), so `git diff --exit-code` after `pnpm
// icons` reports five changed files with "Bin 285755 -> 285753 bytes" and no
// visual difference at all. That is noise, and a check that cries wolf gets
// deleted rather than heeded.
//
// The decoder below is deliberately dependency-free — zlib is in Node, and
// pulling an image library in for this would be a new supply-chain edge on a
// check that exists to protect the brand.
//
// Usage:  node scripts/check-brand-assets.mjs
// Exit 0 = every committed asset matches a fresh render, pixel for pixel.

import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Assets `pnpm icons` writes. Kept in sync with scripts/gen-app-icons.mjs. */
const ASSETS = [
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
  "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png",
  "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png",
  "client/public/icon-512.png",
  "client/public/icon-192.png",
];

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Split a PNG into its chunks. Returns { ihdr, idat } with idat concatenated. */
function readChunks(buf, label) {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${label}: not a PNG`);
  let offset = 8;
  let ihdr = null;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") ihdr = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += 12 + length; // length + type + data + crc
  }
  if (!ihdr) throw new Error(`${label}: no IHDR chunk`);
  return { ihdr, idat: Buffer.concat(idat) };
}

/** Undo one scanline filter in place. See PNG spec §9.2. */
function unfilter(type, row, prev, bpp) {
  switch (type) {
    case 0:
      return;
    case 1: // Sub
      for (let i = bpp; i < row.length; i++) row[i] = (row[i] + row[i - bpp]) & 0xff;
      return;
    case 2: // Up
      for (let i = 0; i < row.length; i++) row[i] = (row[i] + prev[i]) & 0xff;
      return;
    case 3: // Average
      for (let i = 0; i < row.length; i++) {
        const left = i >= bpp ? row[i - bpp] : 0;
        row[i] = (row[i] + ((left + prev[i]) >> 1)) & 0xff;
      }
      return;
    case 4: // Paeth
      for (let i = 0; i < row.length; i++) {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        row[i] = (row[i] + pred) & 0xff;
      }
      return;
    default:
      throw new Error(`unknown PNG filter type ${type}`);
  }
}

/** Decode a PNG into { width, height, pixels } with pixels as raw samples. */
function decode(buf, label) {
  const { ihdr, idat } = readChunks(buf, label);
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];

  // The generator writes 8-bit non-interlaced screenshots; anything else means
  // the generator changed and this decoder needs revisiting rather than
  // silently guessing.
  if (bitDepth !== 8) throw new Error(`${label}: expected 8-bit, got ${bitDepth}`);
  if (interlace !== 0) throw new Error(`${label}: interlaced PNGs are not supported`);
  const bpp = CHANNELS[colorType];
  if (!bpp) throw new Error(`${label}: unsupported colour type ${colorType}`);

  const raw = inflateSync(idat);
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride); // row 0 filters against an implicit zero row

  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const filterType = raw[start];
    const row = raw.subarray(start + 1, start + 1 + stride);
    unfilter(filterType, row, prev, bpp);
    row.copy(pixels, y * stride);
    prev = row;
  }
  return { width, height, bpp, pixels };
}

/** Compare two decoded images. Returns null when identical, else a description. */
function compare(a, b) {
  if (a.width !== b.width || a.height !== b.height)
    return `size ${a.width}x${a.height} vs ${b.width}x${b.height}`;
  if (a.bpp !== b.bpp) return `channel count ${a.bpp} vs ${b.bpp}`;

  let differing = 0;
  let worst = 0;
  for (let i = 0; i < a.pixels.length; i += a.bpp) {
    let pixelDiffers = false;
    for (let c = 0; c < a.bpp; c++) {
      const delta = Math.abs(a.pixels[i + c] - b.pixels[i + c]);
      if (delta > 0) {
        pixelDiffers = true;
        if (delta > worst) worst = delta;
      }
    }
    if (pixelDiffers) differing++;
  }
  if (differing === 0) return null;

  const total = a.width * a.height;
  const pct = ((differing / total) * 100).toFixed(3);
  return `${differing} of ${total} pixels differ (${pct}%), largest channel delta ${worst}`;
}

// ── run ──────────────────────────────────────────────────────────────────────

const repo = path.resolve(import.meta.dirname, "..");
const stash = mkdtempSync(path.join(tmpdir(), "sunder-brand-"));

try {
  // Snapshot what is committed before the generator overwrites the working tree.
  for (const asset of ASSETS) {
    const committed = execFileSync("git", ["show", `HEAD:${asset}`], {
      cwd: repo,
      maxBuffer: 64 * 1024 * 1024,
    });
    const dest = path.join(stash, asset);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, committed);
  }

  console.log("Rendering the sigil…");
  execFileSync("pnpm", ["icons"], { cwd: repo, stdio: "inherit" });

  const failures = [];
  for (const asset of ASSETS) {
    const committed = decode(readFileSync(path.join(stash, asset)), `${asset} (committed)`);
    const fresh = decode(readFileSync(path.join(repo, asset)), `${asset} (fresh)`);
    const problem = compare(committed, fresh);
    if (problem) {
      failures.push(`${asset}: ${problem}`);
      console.log(`  DRIFT  ${asset} — ${problem}`);
    } else {
      console.log(`  ok     ${asset} (${committed.width}x${committed.height})`);
    }
  }

  // The container bytes routinely differ between Chromium builds even when the
  // pixels do not, so leave the tree as it was found either way.
  execFileSync("git", ["checkout", "--", ...ASSETS], { cwd: repo });

  if (failures.length) {
    console.error("");
    console.error("The committed brand assets no longer match what the sigil source renders.");
    console.error("Run `pnpm icons` locally and commit the result.");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("");
  console.log(`All ${ASSETS.length} brand assets match the sigil source, pixel for pixel.`);
} finally {
  rmSync(stash, { recursive: true, force: true });
}
