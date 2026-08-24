// 문장 서랍 — minimal offline app-shell cache.
// Bump CACHE_NAME whenever index.html/manifest/icons change so old caches are dropped,
// and so the browser's byte-comparison of this file actually detects an update.
var CACHE_NAME = "sentence-drawer-v3";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // Fetch with cache:"no-store" so the very first cache fill can't be
      // poisoned by a stale HTTP-cached copy of index.html from GitHub Pages/CDN.
      return Promise.all(APP_SHELL.map(function(url){
        return fetch(url, { cache: "no-store" }).then(function(res){
          if(res && res.ok) return cache.put(url, res);
        }).catch(function(){ /* offline on first install: ignore, app still installs */ });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Same-origin GET requests: serve from cache immediately if present, and
// refresh the cache in the background from the network. Cross-origin
// requests (Google Fonts) are left alone — go straight to the network.
self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if(url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      // cache:"no-store" bypasses the browser's own HTTP cache, so this always
      // asks GitHub Pages for the real latest bytes instead of a stale disk-cached copy.
      var network = fetch(event.request, { cache: "no-store" }).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
