// Zamzam Field Operations Service Worker
const CACHE_NAME = 'zamzam-field-v1.1';
const DYNAMIC_CACHE = 'zamzam-dynamic-v1.1';

// Critical shell assets to precache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/assets/images/Picture1-1789308473747.png',
];

// Install Event - Precache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial error (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is for Google Fonts or external CDN
function isExternalFont(url) {
  return url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
}

// Helper: Check if request is an image or icon
function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  );
}

// Fetch Event - Dynamic caching & offline resilience
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST, PUT, DELETE should be handled by application sync queue)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (HTML pages) - Network-first with instant fallback to cached shell / index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const indexFallback = await caches.match('/index.html');
          if (indexFallback) return indexFallback;
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Zamzam Offline</title></head><body style="background:#0A1A0F;color:#D0E8F0;font-family:sans-serif;padding:24px;text-align:center;"><h2>Zamzam Field is Offline</h2><p>Your field data is safely stored on this device. Reconnect to resume sync.</p><button onclick="window.location.reload()" style="background:#00C46A;color:#0A1A0F;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer;">Retry</button></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Google Fonts & CDN resources - Cache-first with 30-day cache
  if (isExternalFont(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Static scripts, styles, and images - Stale-while-revalidate
  if (isStaticAsset(url) || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. API health checks - Network first with graceful offline mock
  if (url.pathname === '/api/health') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            status: 'offline_cached',
            aiAvailable: false,
            timestamp: new Date().toISOString(),
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 5. Default - Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Service Unavailable (Offline)' });
      })
  );
});

// Background Sync - trigger queued records synchronization when connection is re-established
self.addEventListener('sync', (event) => {
  if (event.tag === 'zamzam-sync-queue' || event.tag === 'sync-field-data') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_TRIGGERED_BY_SW', timestamp: Date.now() });
        });
      })
    );
  }
});

// PostMessage communication with main app
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'PING') {
    if (event.source) {
      event.source.postMessage({ type: 'PONG', version: CACHE_NAME });
    }
  }
});
