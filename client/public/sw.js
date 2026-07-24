// Sunder service worker — offline-first app shell for solo play.
// Network-first for navigations and API (online duels need freshness),
// cache-first for hashed static assets (immutable by content hash).
const CACHE = "sunder-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  // never intercept API/auth/storage traffic
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/manus-storage/")) return;

  // navigations: network first, fall back to cached shell for offline solo play
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // static assets: cache first (Vite hashes filenames), network fallback + backfill
  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ||
        fetch(event.request).then((res) => {
          if (res.ok && (url.pathname.startsWith("/assets/") || /\.(js|css|png|svg|woff2?|mp3|ogg)$/.test(url.pathname))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
    )
  );
});
