const CACHE_NAME = 'blu-shaak-signage-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/display',
  '/display.html',
  '/css/display.css',
  '/js/display.js',
  '/assets/logo.svg',
  '/menu_config.json',
  '/assets/video/promo_screen_1.mp4',
  '/assets/video/promo_screen_2.mp4',
  '/assets/video/promo_screen_3.mp4',
  '/assets/video/promo_screen_4.mp4'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker & Caching Assets...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker Activated.');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore WebSocket requests
  if (event.request.url.includes('/ws')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Offline fallback */});

        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Fallback for html pages
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/display.html');
        }
      });
    })
  );
});
