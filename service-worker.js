// ─────────────────────────────────────────────────────────────────────────
// Twist & Roll POS — Service Worker
// Caches static assets for fast loading
// Place at: service-worker.js (root folder, same level as index.php)
// ─────────────────────────────────────────────────────────────────────────

const CACHE_NAME   = 'tnr-pos-v1';
const OFFLINE_URL  = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/assets/index.css',
    '/assets/images/logo.png',
    '/assets/js/main.js',
    '/assets/js/escpos_bluetooth.js',
    '/modules/homepage/homepage.css',
    '/modules/homepage/homepage.js',
    '/modules/orders/orders.css',
    '/modules/orders/orders.js',
    '/modules/served/served.css',
    '/modules/served/served.js',
    '/modules/statistics/statistics.css',
    '/modules/statistics/statistics.js',
    '/modules/profile/profile.css',
    '/modules/profile/profile.js',
    '/offline.html',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
];

// ── INSTALL: cache all static assets ──────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                // Cache what we can, ignore failures (e.g. offline during install)
                return Promise.allSettled(
                    STATIC_ASSETS.map(url =>
                        cache.add(url).catch(err =>
                            console.warn('[SW] Failed to cache:', url, err)
                        )
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ── ACTIVATE: clean up old caches ─────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ── FETCH: serve from cache, fallback to network ──────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and non-http requests
    if (!url.protocol.startsWith('http')) return;

    // ── PHP pages & API calls: Network first, cache fallback ──────────────
    // We always want fresh data from PHP
    if (
        url.pathname.endsWith('.php') ||
        url.pathname === '/' ||
        url.search.includes('page=') ||
        url.search.includes('excel_report') ||
        url.pathname.includes('place_order') ||
        url.pathname.includes('serve_order') ||
        url.pathname.includes('void_order') ||
        url.pathname.includes('update_order')
    ) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // Offline fallback for page navigations
                    if (request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }
                    return new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // ── Static assets: Cache first, network fallback ───────────────────────
    event.respondWith(
        caches.match(request)
            .then(cached => {
                if (cached) return cached;

                return fetch(request).then(response => {
                    // Only cache successful responses
                    if (!response || response.status !== 200 || response.type === 'opaque') {
                        return response;
                    }

                    const toCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
                    return response;
                });
            })
            .catch(() => {
                // For images, return a transparent placeholder
                if (request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            })
    );
});