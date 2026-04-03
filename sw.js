// Service Worker for PWA
const CACHE_NAME = 'whitenoise-pro-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/timer.js',
    '/styles.css',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/sounds/rain.mp3',
    '/sounds/ocean.mp3',
    '/sounds/forest.mp3',
    '/sounds/cafe.mp3',
    '/sounds/thunder.mp3',
    '/sounds/wind.mp3',
    '/sounds/fireplace.mp3'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});