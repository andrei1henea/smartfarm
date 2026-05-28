const CACHE = 'smartfarm-v4';

// Assets care se cachează (nu index.html!)
const STATIC_ASSETS = [
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
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

  // Supabase — network only
  if (url.hostname.includes('supabase.co')) return;

  // Tile-uri hartă — network only
  if (url.hostname.includes('google.com') || url.hostname.includes('arcgisonline.com')) return;

  // index.html — ÎNTOTDEAUNA din rețea, niciodată din cache
  if (e.request.mode === 'navigate' || 
      url.pathname.endsWith('index.html') || 
      url.pathname === '/' || 
      url.pathname.endsWith('/smartfarm') ||
      url.pathname.endsWith('/smartfarm/')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Restul (CSS, JS extern, fonturi) — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          caches.open(CACHE).then(cache => cache.put(e.request, response.clone()));
        }
        return response;
      });
    })
  );
});
