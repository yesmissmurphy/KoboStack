// Service worker: lets Stackt install as an app, keeps opened books and the
// reader scripts for offline reading, and shows a friendly page if the network drops.
const CACHE = "stackt-v2";
const OFFLINE =
  "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:Georgia,serif;background:#17302a;color:#f4ead5;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px'><div><h1>Stackt</h1><p>You are offline. Books you have already opened are still on your shelf, and the rest will be back when you are online.</p></div>";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) {
        if (k.startsWith("stackt-") && k !== CACHE) await caches.delete(k);
      }
      await self.clients.claim();
    })()
  )
);

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

async function networkThenCache(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    return hit || new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  const isBook = url.pathname === "/api/library/file" && !url.searchParams.has("download");
  const isStatic = url.pathname.startsWith("/_next/static/");
  if (isBook || isStatic || url.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(cacheFirst(req));
    return;
  }

  if (req.mode !== "navigate") return;
  if (url.pathname.startsWith("/library")) {
    e.respondWith(networkThenCache(req));
    return;
  }
  e.respondWith(
    fetch(req).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } }))
  );
});
