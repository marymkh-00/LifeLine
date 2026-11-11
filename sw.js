// sw.js
const CACHE = 'lifeline-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/reset.css',
    './css/theme.css',
    './css/layout.css',
    './css/components.css',
    './lib/dexie.min.js',
    './lib/jalaali.min.js',
    './js/app.js',
    './js/db.js',
    './js/jalali.js',
    './js/router.js',
    './js/utils.js',
    './js/pages/home.js',
    './js/pages/tasks.js',
    './js/pages/calendar.js',
    './js/pages/finance.js',
    './js/pages/more.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Better Fetch Handling (conceptual)
self.addEventListener('fetch', (e) => {
    // For navigation requests, serve the cached index.html as fallback
    if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    } else {
        // For other assets, try cache then network
        e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
    }
});