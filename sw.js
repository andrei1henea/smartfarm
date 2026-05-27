const CACHE = 'smartfarm-v1';
const OFFLINE_ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Instalare — cache assets principale
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        OFFLINE_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// Activare — curăță cache vechi
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache first pentru assets, network first pentru Supabase
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase API — sempre network, niciodată cache
  if (url.hostname.includes('supabase.co')) {
    return; // lasă browser-ul să gestioneze normal
  }

  // Google Maps tiles — network only
  if (url.hostname.includes('google.com') || url.hostname.includes('googleapis.com') && url.pathname.includes('vt')) {
    return;
  }

  // Pentru restul — cache first cu fallback network
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
        // offline și nu e în cache — returnăm index.html pentru navigare
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
