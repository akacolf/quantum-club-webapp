/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Kill-switch service worker.
//
// PWA features add no real value in a Telegram Mini App context (users never
// install as PWA; offline mode is moot because Telegram itself must be online
// to load the Mini App). The previous Serwist-based SW also produced a
// "no-response" navigation error on flaky public WiFi that left users with
// a blank webview they couldn't recover from.
//
// This SW exists only to dismantle the previously-installed SW on every
// returning visitor. On activation it deletes all caches, unregisters itself,
// and force-reloads controlled clients so subsequent navigations are
// uncontrolled. A follow-up PR will remove the SW build pipeline entirely
// once most active users have visited and had this run.
//
// No fetch listener is registered: requests are not intercepted, so the
// browser handles all navigation/asset fetches natively while this SW is
// briefly active.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        try {
          await (client as WindowClient).navigate(client.url);
        } catch {
          // Some platforms restrict client.navigate; the unregister + cache
          // clear is what matters. Next user-initiated navigation will be
          // uncontrolled regardless.
        }
      }
    })(),
  );
});
