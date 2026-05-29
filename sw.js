const CACHE = 'smartfarm-v6';

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

  // Ignorăm complet scheme non-http (chrome-extension, data, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Supabase, tile-uri hartă, favicon — network only
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.pathname.includes('favicon')
  ) return;

  // index.html — mereu din rețea
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Restul — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && !response.bodyUsed) {
          try {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          } catch(e) {}
        }
        return response;
      }).catch(() => {});
    })
  );
});
