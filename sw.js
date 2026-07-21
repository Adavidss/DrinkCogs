// DrinkCogs — service worker: full offline support.
// Strategy: precache the app shell + database on install; stale-while-revalidate
// at runtime so updates roll in on the next visit.

const VERSION = 'drinkcogs-v3';

// Development kill-switch: on localhost the worker uninstalls itself so the
// dev server is always hit directly. Production (GitHub Pages) is unaffected.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(self.location.hostname);

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/themes.css',
  './css/components.css',
  './css/pages.css',
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/search.js',
  './js/ui.js',
  './js/cards.js',
  './js/bottle-svg.js',
  './js/charts.js',
  './js/map.js',
  './js/recommend.js',
  './js/pages/home.js',
  './js/pages/browse.js',
  './js/pages/bottle.js',
  './js/pages/producers.js',
  './js/pages/places.js',
  './js/pages/category.js',
  './js/pages/explore.js',
  './js/pages/flavors.js',
  './js/pages/cocktails.js',
  './js/pages/collection.js',
  './js/pages/dashboard.js',
  './js/pages/compare.js',
  './js/pages/about.js',
  './data/bottles.json',
  './data/producers.json',
  './data/countries.json',
  './data/regions.json',
  './data/categories.json',
  './data/cocktails.json',
  './data/flavors.json',
  './data/images.json',
  './assets/icons/icon.svg',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

// Nice to have offline, but must not fail the install if missing.
const OPTIONAL = [
  './data/world-map.json',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  if (IS_LOCAL) { self.skipWaiting(); return; }
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    await Promise.allSettled(OPTIONAL.map(u => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (IS_LOCAL) {
      for (const k of await caches.keys()) await caches.delete(k);
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.navigate(c.url));
      return;
    }
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCAL) return; // dev: always hit the network directly
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // SPA navigations: serve the cached shell, refresh in background.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match('./index.html');
      const network = fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) cache.put('./index.html', res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    const network = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
