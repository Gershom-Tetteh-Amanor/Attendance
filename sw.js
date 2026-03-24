/* QR Attendance System – Service Worker v4 */
const CACHE = 'qratt-v4';
const CORE  = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always network-first for Firebase / Google APIs
  if (url.hostname.includes('google') || url.hostname.includes('firebase')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{"offline":true}', {headers:{'Content-Type':'application/json'}})
      )
    );
    return;
  }
  // Cache-first for app files
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
