const CACHE_NAME = "staralchemy-shell-v9";
const ASSET_VERSION = "20260427-syncfix1";
const CORE_ASSETS = [
    "./",
    "./index.html",
    `./favicon.ico?v=${ASSET_VERSION}`,
    `./manifest.webmanifest?v=${ASSET_VERSION}`,
    `./css/style.css?v=${ASSET_VERSION}`,
    `./js/app.js?v=${ASSET_VERSION}`,
    `./js/audio.js?v=${ASSET_VERSION}`,
    `./js/pwa.js?v=${ASSET_VERSION}`,
    `./js/firebase-config.js?v=${ASSET_VERSION}`,
    `./js/firebase-auth.js?v=${ASSET_VERSION}`,
    `./js/firebase-save.js?v=${ASSET_VERSION}`,
    "./assets/bg_magic_lab.png",
    "./assets/char_alchemist.png",
    "./assets/icons/coin.png",
    "./assets/icons/star.png",
    "./assets/icons/swirl.png",
    "./assets/icons/potion_blue.png",
    "./assets/icons/potion_green.png",
    "./assets/icons/potion_purple.png",
    "./assets/icons/potion_red.png",
    "./assets/icons/potion_yellow.png",
    "./assets/pwa/apple-touch-icon.png",
    "./assets/pwa/icon-192.png",
    "./assets/pwa/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    const isDocument = request.mode === "navigate";
    const isVersionSensitiveAsset = ["script", "style", "manifest", "worker"].includes(request.destination);

    if (isDocument) {
        event.respondWith(
            fetch(request, { cache: "reload" })
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
                    return response;
                })
                .catch(() => caches.match("./index.html"))
        );
        return;
    }

    if (isVersionSensitiveAsset) {
        event.respondWith(
            fetch(request, { cache: "reload" })
                .then((response) => {
                    if (!response || response.status !== 200) return response;
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
                if (!response || response.status !== 200) return response;
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                return response;
            });
        })
    );
});
