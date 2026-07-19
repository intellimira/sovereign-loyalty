/**
 * SOVEREIGN LOYALTY — Service Worker
 * FAAW Stage 3: Offline-first PWA
 */

const CACHE_NAME = 'sovereign-loyalty-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/engine.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install — cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// Fetch — cache-first for static, network-first for dynamic
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Google Fonts — cache first
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return cached || fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // QR API — network first (allow fail gracefully)
    if (url.hostname === 'api.qrserver.com') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response('', { status: 404 });
            })
        );
        return;
    }

    // Static assets — cache first
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200) return response;
                const clone = response.clone();
                caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                return response;
            });
        }).catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
                return caches.match('/index.html');
            }
        })
    );
});
