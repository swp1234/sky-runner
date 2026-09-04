const CACHE_NAME = 'sky-runner-v5';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './assets/ship-opt.png',
    './assets/space-bg-opt.jpg',
    './js/game.js',
    './js/i18n.js',
    './js/sound-engine.js',
    './js/skins-data.js',
    './js/titles-data.js',
    './js/obstacles-data.js',
    './js/themes-data.js',
    './js/locales/ko.json',
    './js/locales/en.json',
    './js/locales/ja.json',
    './js/locales/zh.json',
    './js/locales/hi.json',
    './js/locales/ru.json',
    './js/locales/es.json',
    './js/locales/pt.json',
    './js/locales/id.json',
    './js/locales/tr.json',
    './js/locales/de.json',
    './js/locales/fr.json',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg'
];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin || !event.request.url.startsWith(self.registration.scope)) return;
    event.respondWith(
        fetch(event.request).then(response => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            }
            return response;
        }).catch(() => caches.match(event.request))
    );
});
