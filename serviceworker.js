importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyClMhadRcgH-IGmhwcZxCPghxjOVb5OLGY",
    authDomain: "habittracker-45e1d.firebaseapp.com",
    projectId: "habittracker-45e1d",
    storageBucket: "habittracker-45e1d.firebasestorage.app",
    messagingSenderId: "154351030805",
    appId: "1:154351030805:web:2413a81fe953f48844341c",
    measurementId: "G-WYRJ14THMK",
    vapidKey: "BPG6p5LElXTbQ8p5hFEKhKdYoq5pgFzdJcggAJe7RpLYaPlxAnt-WRobfargF2YJc4h-k99wGmLE_OuPb-7UVFc",
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload){
    console.log("[serviceworker.js] Received background message ", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: "/img/icons/OnSyncIcon-192x192.png",
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// serviceworker.js
const CACHE_NAME = "habit-tracker-v6";
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/pages/auth.html",
    "/css/main.css",
    "/css/materialize.min.css",
    "/js/materialize.min.js",
    "/js/ui.js",
    "/js/firebaseDB.js",
    "/js/auth.js",
    "/js/signIn.js",
    "/js/firebaseConfig.js",
    "/img/icons/OnSyncIcon-32x32.png",
    "/img/icons/favicon.ico",
    "/manifest.json",
];

self.addEventListener("install", (event) => {
    console.log("Service worker: Installing...");
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log("Service worker: caching files");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => console.error("Caching failed:", error))
    );
});
  
self.addEventListener("activate", (event) => {
    console.log("Service Worker: Activating...");
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("Service Worker: Deleting old Cache...");
              return caches.delete(cache);
            }
          })
        );
      })
    );
});
  
// Fetch event with async/await
self.addEventListener("fetch", (event) => {
    if (event.request.method === "GET") {
        //Only handle GET requests
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return (
                    cachedResponse ||
                    fetch(event.request)
                        .then((networkResponse) => {
                            return caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                        })
                        .catch((error) => {
                            console.error("Network fetch failed: ", error);
                        })
                );
            })
        );
    }
});

// Listen for messages from ui.js
self.addEventListener("message", (event) => {
    if(event.data && event.data.type === "FCM_TOKEN") {
        const fcmToken = event.data.token;
        console.log("Received FCM token in service worker: ", fcmToken);
    }
    });

    // display notification for the background message
    self.addEventListener("push", (event)=>{
    if(event.data){
        const payload = event.data.json();
        const { title, body, icon } = payload.notification;
        const options = {
            body,
            icon: icon || "/img/icons/OnSyncIcon-192x192.png",
        };
        event.waitUntil(self.registration.showNotification(title, options));
    }
});