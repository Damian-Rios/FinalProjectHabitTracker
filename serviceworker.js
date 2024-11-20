const CACHE_NAME = "habit-tracker-v1";

const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/pages/tracker.html",
    "/pages/progress.html",
    "/pages/settings.html",
    "/css/main.css",
    "/css/materialize.min.css",
    "/js/materialize.min.js",
    "/js/ui.js",
    "/js/firebaseDB.js",
    "/js/db.js",
    "/js/main.js",
    "/js/habitTracker.js",
    "/img/icons/OnSyncIcon-32x32.png",
    "/img/icons/favicon.ico",
    "/manifest.json",
];

// Install event
self.addEventListener('install', event => {
    console.log("Service worker: Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Service Worker: caching files");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log("Service Worker: Activating...");
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if(cache !== CACHE_NAME){
                        console.log("Service Worker: Deleting old cache");
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    console.log("Service Worker: Fetching...");

    // Only handle GET requests
    if (event.request.method !== "GET") {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if(cachedResponse){
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});