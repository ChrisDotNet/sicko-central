// Sicko Central service worker: shows push notifications and opens the right page when one
// is tapped. Nothing is cached here.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = { title: "Sicko Central", body: "", url: "/", tag: "sicko", silent: false, goal: false };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {
    /* keep the default */
  }
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      tag: msg.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: msg.url },
      // Quieter alerts (recaps, news, Leafs losses...) show without a sound.
      silent: !!msg.silent,
      // Goals get their own buzz on Android: short, short, long.
      vibrate: msg.goal ? [150, 80, 150, 80, 450] : undefined,
      // Same tag again (an updated alert) still makes its sound, unless it's a quiet one.
      renotify: !msg.silent,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
