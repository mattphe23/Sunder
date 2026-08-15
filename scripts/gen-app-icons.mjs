// Render the procedural brand mark (client/src/game/ui/Brand.tsx) to the PNGs
// the iOS project needs. No painted asset to go stale, no external dependency.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

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

/** Splash: same world, mark small and centred — iOS scales and crops this. */
const SPLASH = (px) => `
<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">
  ${DEFS}
  <rect width="96" height="96" fill="url(#sky)"/>
  <rect width="96" height="96" fill="url(#hglow)"/>
  <g transform="translate(48 42) scale(0.34) translate(-48 -48)">${SIGIL}</g>
</svg>`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage'],
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
