const CACHE = 'smartfarm-v3';
const OFFLINE_ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(OFFLINE_ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting(); // activare imediată fără să aștepte tab-uri vechi
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // preia controlul imediat
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase — network only, niciodată cache
  if (url.hostname.includes('supabase.co')) return;

  // Tile-uri hartă — network only
  if (url.hostname.includes('google.com') || url.hostname.includes('arcgisonline.com')) return;

  // index.html — network first, fallback cache (asigură ultima versiune)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname === '/smartfarm/') {
    e.respondWith(
      fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Restul — cache first cu fallback network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.destination === 'document') return caches.match('./index.html');
      });
    })
  );
});
