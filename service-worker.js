/* ZEVA Education GitHub wrapper service worker */
const CACHE_NAME = 'zeva-education-ios-full-height-20261121';
const SHELL_FILES = [
  './',
  './index.html',
  './push-client.js',
  './System/PWA/config.js',
  './manifest.webmanifest',
  './UI/thuong-hieu/icon-192.png',
  './UI/thuong-hieu/icon-512.png',
  './UI/thuong-hieu/icon-512-maskable.png',
  './UI/thuong-hieu/icon-master-1024.png',
  './UI/thuong-hieu/apple-touch-icon.png',
  './UI/thuong-hieu/favicon-32.png',
  './UI/thuong-hieu/favicon-64.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(SHELL_FILES);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys
            .filter(function(key) {
              return key.startsWith('zeva-education-') && key !== CACHE_NAME;
            })
            .map(function(key) {
              return caches.delete(key);
            })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

// No session tokens or private message bodies are sent in a push payload.
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload;try{payload=event.data.json();}catch(_){return;}
    const cache=await caches.open('zeva-push-state-v1');
    const saved=await cache.match(new URL('./__push_binding',self.registration.scope));
    const binding=saved&&await saved.text();
    if(!binding||payload.binding!==binding)return;
    await self.registration.showNotification('ZEVA Education',{
      body:String(payload.body||'Bạn có thông báo mới.').slice(0,180),
      icon:new URL('./UI/thuong-hieu/icon-192.png',self.registration.scope).href,
      tag:'zeva-'+String(payload.tag||'inbox'),data:{binding},renotify:false
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const cache=await caches.open('zeva-push-state-v1');
    const saved=await cache.match(new URL('./__push_binding',self.registration.scope));
    if(!saved||await saved.text()!==event.notification.data?.binding)return;
    const url=new URL('./?zevaNotification=1',self.registration.scope);
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const client=clients.find(c=>c.url.startsWith(self.registration.scope));
    if(client){await client.focus();client.postMessage({type:'ZEVA_PUSH_OPEN'});}
    else await self.clients.openWindow(url.href);
  })());
});

self.addEventListener('fetch', function(event) {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  // Chỉ cache file cùng domain GitHub Pages. Nội dung Apps Script trong iframe
  // là cross-origin và luôn do Google tải trực tiếp.
  if (url.origin !== self.location.origin) return;

  const networkRequest = (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/config.js')
  ) ? new Request(request, { cache: 'no-store' }) : request;

  event.respondWith(
    fetch(networkRequest)
      .then(function(response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
