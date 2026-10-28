const CACHE = 'sakura-pharma-v2';
const FILES = ['./', './index.html', './css/style.css', './js/app.js', './js/seed.js', './js/i18n_en.js', './js/i18n.js', './lib/xlsx.mini.min.js',
  './manifest.webmanifest', './img/logo.png', './img/icon-192.png', './img/icon-512.png', './img/icon-small.png',
  './fonts/HindSiliguri-Regular.ttf', './fonts/HindSiliguri-SemiBold.ttf', './fonts/HindSiliguri-Bold.ttf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match('./index.html'))));
});
