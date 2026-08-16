// Render the procedural brand mark (client/src/game/ui/Brand.tsx) to the PNGs
// the iOS project needs. No painted asset to go stale, no external dependency.
//
// Playwright resolution is deliberately forgiving: this has to run on a plain
// Mac clone (`pnpm ios:sync` step 2 of the handoff), not just inside the build
// sandbox that happens to carry a global copy. Order: the normal dependency
// resolution first, then known global locations. An absolute path here made
// `pnpm icons` sandbox-only, which meant a fresh clone could not regenerate the
// launch screen at all.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const CANDIDATES = [
  'playwright',
  'playwright-core',
  '/opt/node22/lib/node_modules/playwright/index.mjs',
  '/usr/lib/node_modules/playwright/index.mjs',
  '/usr/local/lib/node_modules/playwright/index.mjs',
];

const loadChromium = async () => {
  const tried = [];
  for (const spec of CANDIDATES) {
    const isPath = spec.startsWith('/');
    if (isPath && !existsSync(spec)) {
      tried.push(`${spec} (not present)`);
      continue;
    }
    try {
      const mod = await import(isPath ? pathToFileURL(spec).href : spec);
      return (mod.chromium ?? mod.default?.chromium);
    } catch (err) {
      tried.push(`${spec} (${err.code ?? err.message})`);
    }
  }
  throw new Error(
    'Could not load Playwright, which this script uses to rasterise the SVG ' +
      'sigil into the icon and launch screen.\n\nInstall it once:\n' +
      '  pnpm add -D playwright && pnpm exec playwright install chromium\n\n' +
      `Tried:\n  ${tried.join('\n  ')}`
  );
};

const chromium = await loadChromium();

// Only pin an executable when that exact build is present (the sandbox image
// ships one); otherwise let Playwright use the browser it installed itself.
const SANDBOX_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// --no-sandbox is required for root/container CI. On macOS it is harmless, but
// there is no reason to pass it when we are not in a container.
const isLinux = process.platform === 'linux';

// the sigil itself, drawn in a 96x96 space
const SIGIL = `
  <path d="M8 74 L30 30 L46 60 L38 74 Z" fill="#5a628c"/>
  <path d="M38 74 L58 22 L88 74 Z" fill="url(#stone)"/>
  <path d="M58 22 L68 40 L58 44 L50 38 Z" fill="#f2f5ff"/>
  <path d="M52 74 L44 52 L54 56 L48 36 L62 60 L53 58 L60 74 Z" fill="url(#ember)"/>
  <path d="M4 76 H92 L86 84 H10 Z" fill="#3f466e"/>
  <rect x="26" y="84" width="44" height="6" rx="1.5" fill="#2a2f4c"/>`;

const DEFS = `
  <defs>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c6cee6"/><stop offset="100%" stop-color="#6a7199"/>
    </linearGradient>
    <linearGradient id="ember" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe08a"/><stop offset="55%" stop-color="#ffa53f"/><stop offset="100%" stop-color="#e2622b"/>
    </linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1d1d47"/><stop offset="55%" stop-color="#272760"/><stop offset="100%" stop-color="#12122e"/>
    </linearGradient>
    <radialGradient id="hglow" cx="0.5" cy="0.86" r="0.62">
      <stop offset="0%" stop-color="#ff9b2f" stop-opacity="0.34"/><stop offset="100%" stop-color="#ff9b2f" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/** App icon: the sigil inset ~12% so iOS's corner mask never clips the plinth. */
const ICON = (px) => `
<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">
  ${DEFS}
  <rect width="96" height="96" fill="url(#sky)"/>
  <rect width="96" height="96" fill="url(#hglow)"/>
  <g transform="translate(48 42) scale(0.78) translate(-48 -48)">${SIGIL}</g>
</svg>`;

/**
 * Splash: the mark on the flat void, small and centred — iOS scales and crops.
 *
 * Deliberately NOT the sky gradient. A 2732x2732 gradient encodes to ~1.6MB of
 * PNG because there are no runs to compress, and three of them blew past a
 * deploy size limit; a flat ground crushes to a few KB. It also reads better as
 * a launch screen: flat void, then the gradient sky arrives with the first
 * rendered frame. Matches capacitor.config.ts's backgroundColor exactly, so
 * there is no seam between the native launch screen and the web view.
 */
const SPLASH = (px) => `
<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">
  ${DEFS}
  <rect width="96" height="96" fill="#141433"/>
  <g transform="translate(48 42) scale(0.34) translate(-48 -48)">${SIGIL}</g>
</svg>`;

const browser = await chromium.launch({
  ...(existsSync(SANDBOX_CHROME) ? { executablePath: SANDBOX_CHROME } : {}),
  ...(isLinux ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}),
});
const shoot = async (svg, px, out) => {
  const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0}svg{display:block}</style>${svg}`);
  await page.screenshot({ path: out });
  await page.close();
  console.log('wrote', out);
};

await shoot(ICON(1024), 1024, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
for (const f of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']) {
  await shoot(SPLASH(2732), 2732, `ios/App/App/Assets.xcassets/Splash.imageset/${f}`);
}
// the PWA icons come from the same source, so home-screen and App Store match
await shoot(ICON(512), 512, 'client/public/icon-512.png');
await shoot(ICON(192), 192, 'client/public/icon-192.png');
await browser.close();
