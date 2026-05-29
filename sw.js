const CACHE = 'smartfarm-v5';

const STATIC_ASSETS = [
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase — network only, nu cache niciodată
  if (url.hostname.includes('supabase.co')) return;

  // Tile-uri hartă — network only, nu cache (evită clone errors)
  if (
    url.hostname.includes('google.com') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.pathname.includes('/vt/') ||
    url.pathname.includes('MapServer/tile')
  ) return;

  // index.html — ÎNTOTDEAUNA din rețea
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('index.html') ||
    url.pathname === '/' ||
    url.pathname.match(/\/smartfarm\/?$/)
  ) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // favicon — network only dacă 404 nu îl cachăm
  if (url.pathname.includes('favicon')) return;

  // Restul — cache first, dar clone corect
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // clonăm ÎNAINTE să consumăm, și doar pentru responses valide
        if (
          response &&
          response.status === 200 &&
          response.type !== 'opaque' &&
          !response.bodyUsed
        ) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {});
    })
  );
});
