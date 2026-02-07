const CACHE_NAME = 'sky-runner-v1';
const ASSETS = ['./', './index.html', './css/style.css', './js/game.js', './manifest.json', './icon-192.svg', './icon-512.svg'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); return r; }).catch(() => caches.match(e.request))));
