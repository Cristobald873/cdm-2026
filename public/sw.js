// Service worker v2 — notifications push uniquement.
// IMPORTANT: aucun handler `fetch` afin de NE JAMAIS intercepter les requêtes
// réseau (Supabase, API, navigation). Cela évite que l'app installée (PWA)
// reste bloquée en mode standalone.
const SW_VERSION = "v2-2026-05-23";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // Purge tout cache hérité d'une version antérieure
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch {}
    await self.clients.claim();
  })());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Pronos CdM 26", body: event.data?.text() || "" }; }
  const title = data.title || "Pronos CdM 26";
  const options = {
    body: data.body || "",
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    for (const w of wins) { if (w.url.includes(url) && "focus" in w) return w.focus(); }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});

// Permet à la page de demander un skipWaiting immédiat
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
