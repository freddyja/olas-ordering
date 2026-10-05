const CACHE_NAME = "olas-ordering-v5";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./order.js",
  "./app.js",
  "./qr-code.js",
  "./manifest.webmanifest",
  "./icons/ola-192.png",
  "./icons/ola-512.png",
  "./sw.js"
];

function freshRequest(path) {
  return new Request(path, { cache: "reload", credentials: "same-origin" });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(APP_SHELL.map((path) =>
      fetch(freshRequest(path)).then((response) => {
        if (!response.ok) throw new Error("Could not cache " + path);
        return cache.put(path, response);
      })
    )))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

function networkRequest(request) {
  if (request.mode === "navigate") {
    return new Request(request.url, { cache: "reload", credentials: "same-origin", redirect: "follow" });
  }
  return new Request(request, { cache: "reload" });
}

function fromCache(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    if (request.mode === "navigate") {
      return caches.match("./index.html").then((index) => index || caches.match("./"));
    }
    return undefined;
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(networkRequest(event.request)).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, copy));
      }
      return response;
    }).catch(() => fromCache(event.request).then((cached) => {
      if (cached) return cached;
      return Promise.reject(new Error("offline"));
    }))
  );
});


self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
