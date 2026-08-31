/* ZEVA Education GitHub wrapper service worker */
const CACHE_NAME = 'zeva-education-wrapper-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-master-1024.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './favicon-64.png'
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
              return key !== CACHE_NAME;
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

  event.respondWith(
    fetch(request)
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
