const CACHE = 'vpn-v8';
const PRECACHE = ['./home.html', './VPNNEWLOGO-640.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// drop copies saved by older versions so phones never show an old page
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => clients.claim()));
});

self.addEventListener('fetch', e => {
  // videos and audio stream in pieces (range requests); let the browser fetch them directly
  if (e.request.headers.has('range') || /\.(mp4|m4v|webm|mov|mp3|m4a|wav)(\?|$)/i.test(e.request.url)) return;
  // pages always check the server for the latest version; the saved copy is only for offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .catch(() => caches.match(e.request).then(m => m || caches.match('./home.html')))
    );
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
