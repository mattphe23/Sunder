import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Sunder — iOS wrapper build.
 *
 * The App Store target is the same web build running in a WKWebView, so this
 * file only has to do the things the web build cannot do for itself. Everything
 * layout-related (safe areas, tap targets, portrait) lives in the app; see the
 * `.safe-*` utilities in client/src/index.css.
 *
 * Run order:
 *   pnpm build            -> dist/public
 *   npx cap sync ios      -> copies the build + plugins into ios/
 *   npx cap open ios      -> Xcode (needed to archive; cannot be done headless)
 */
const config: CapacitorConfig = {
  appId: "com.sunder.livingforge",
  appName: "Sunder",
  // vite emits the client into dist/public; the Express bundle beside it is
  // server-only and must not be shipped inside the app
  webDir: "dist/public",

  ios: {
    // Babylon clears transparent and the sky is a CSS gradient, so the native
    // background shows for exactly one frame at launch. Match the void or the
    // app opens on a white flash.
    backgroundColor: "#141433",
    // We handle insets ourselves with env(safe-area-inset-*) and asked for
    // viewport-fit=cover, so the web view must not also inset the content —
    // otherwise the padding is applied twice.
    contentInset: "never",
    // A strategy board is dragged and pinched constantly; rubber-banding at the
    // edges reads as the map coming loose.
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: true,
  },

  server: {
    // the game is fully offline-capable (solo, hot-seat, and the service worker
    // in dist/public/sw.js); only online duels need the network
    androidScheme: "https",
    iosScheme: "capacitor",
  },
};

export default config;
