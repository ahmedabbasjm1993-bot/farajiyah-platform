const CACHE_NAME = 'farajia-offline-v1';
const APP_SHELL = ['./index.html','./manifest.webmanifest','./service-worker.js'];
const EXTERNAL = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await cache.addAll(APP_SHELL).catch(()=>{});
    for (const url of EXTERNAL) { try { await cache.add(url); } catch(e) {} }
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    event.respondWith(fetch(req).then(res=>{
      const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{}); return res;
    }).catch(()=>caches.match(req).then(r=>r || caches.match('./index.html'))));
    return;
  }
  // Cache external libraries and face-api model files after first successful online request.
  const cacheable = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|gstatic\.com/.test(url.hostname) || /justadudewhohacks\/face-api\.js/.test(url.href);
  if(cacheable){
    event.respondWith(caches.match(req).then(cached=>cached || fetch(req).then(res=>{
      const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{}); return res;
    })));
  }
});
