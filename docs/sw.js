// Кэш: оболочка открывается мгновенно (stale-while-revalidate), каталог всегда обновляется в фоне.
const V = 'mb-v3', SHELL = ['./', 'index.html', 'css/style.css', 'css/market.css', 'js/core.js', 'js/i18n.js', 'js/store.js', 'config.js', 'mark-t.png', 'products.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('admin')) return;
  e.respondWith(caches.open(V).then(c => c.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
