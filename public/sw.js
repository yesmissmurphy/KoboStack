// Minimal service worker: lets Stackt install as an app and shows a friendly
// page if the network drops. Pages are always fetched fresh when online.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request).catch(
      () =>
        new Response(
          "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:Georgia,serif;background:#17302a;color:#f4ead5;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px'><div><h1>Stackt</h1><p>You are offline. Your reads are safe on your Kobo, and this page will be back when you are online.</p></div>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    )
  );
});
