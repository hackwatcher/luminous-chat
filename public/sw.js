/* ════════════════════════════════════════════════════════════
   Service Worker  —  Luminous PWA
════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'luminous-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/icon.png',
  '/manifest.json',
  '/screens/splash.html',
  '/screens/discover.html',
  '/screens/matching.html',
  '/screens/chat.html',
  '/screens/profile.html',
  '/screens/settings.html',
  '/screens/inbox.html',
  '/screens/history.html',
  '/screens/rating.html',
  '/screens/auth.html',
  '/screens/chat_detail.html',
  '/screens/onboarding.html',
  '/screens/premium.html',
  '/screens/admin.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Simple network-first strategy
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
