// Service worker dédié aux notifications push (pas de cache, pas d'offline).
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

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
