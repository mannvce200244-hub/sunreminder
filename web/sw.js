const CACHE = 'sunreminder-shell-v3-4';
const SHELL = ['./','./index.html','./styles.css','./app.js','./engine.js','./data.js','./analytics.js','./sharing.js','./profile.js','./profile-ui.js','./user-account.js','./usage.js','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./manifest.webmanifest'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))));
// Updates activate after all old windows close, never halfway through a focus session.
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sunreminder-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e => {
  const url=new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== self.location.origin || /\/(api|admin)(\/|\.|-|$)/.test(url.pathname)) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});

