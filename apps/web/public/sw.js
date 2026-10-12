// Petty Tab service worker (plan.md M6): an offline shell and Web Push (spec §12).
// Network first for every page and asset, so nothing is ever served stale while online; the cache is only
// the offline fallback. API calls are never cached: offline, the app says so instead (see Home).
const CACHE = 'shell-v1';

self.addEventListener('install', (event) => {
  // The first visit's page and assets loaded before this worker existed, so fetch the shell once here.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch('/');
      if (!res.ok) return;
      const html = await res.clone().text();
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
      await cache.put('/', res);
      await Promise.all(assets.map((a) => cache.add(a).catch(() => undefined)));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(request);
        if (res.ok && (url.pathname === '/' || url.pathname.startsWith('/_next/static/'))) {
          await cache.put(request, res.clone());
        }
        return res;
      } catch (e) {
        // Offline: any page opens the shell, which shows the offline message.
        const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
        const shell = request.mode === 'navigate' ? await cache.match('/') : undefined;
        if (hit ?? shell) return hit ?? shell;
        throw e;
      }
    })(),
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Petty Tab', {
      body: data.body,
      icon: '/icons/192',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = open.find((c) => new URL(c.url).origin === location.origin);
      if (client) return client.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
