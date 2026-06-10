const CACHE_PREFIX = "premier-marine-shell";
const CACHE_NAME = `${CACHE_PREFIX}-v2`;
const CORE_ASSETS = ["/", "/manifest.webmanifest", "/icons/premier-marine-mark.svg"];
const IS_LOCALHOST = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  self.skipWaiting();

  if (IS_LOCALHOST) {
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && (IS_LOCALHOST || key !== CACHE_NAME)).map((key) => caches.delete(key))).then(() => self.clients.claim())
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCALHOST) {
    return;
  }

  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put("/", responseClone));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match("/") ?? Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseClone = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});