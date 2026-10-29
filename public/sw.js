// 오프라인 대비 캐시. 네트워크 우선이라 온라인일 때는 항상 최신 파일을 쓴다.
const CACHE = "nihongo-step-v4";

const SHELL = [
  "/",
  "/app.css",
  "/icon.svg",
  "/icon-512.png",
  "/manifest.webmanifest",
  "/js/main.js",
  "/js/api.js",
  "/js/store.js",
  "/js/ui.js",
  "/js/speech.js",
  "/js/views/nav.js",
  "/js/views/onboarding.js",
  "/js/views/dashboard.js",
  "/js/views/learn.js",
  "/js/views/lesson.js",
  "/js/views/result.js",
  "/js/views/review.js",
  "/js/views/words.js",
  "/js/views/stats.js",
  "/js/views/settings.js",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.addAll(SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API 응답은 캐시하지 않는다 (진도는 항상 최신이어야 함)
  if (url.pathname.indexOf("/api/") === 0 || url.pathname === "/skill") return;

  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy);
          }).catch(function () {});
        }
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (hit) {
          if (hit) return hit;
          if (request.mode === "navigate") return caches.match("/");
          return new Response("", { status: 504 });
        });
      })
  );
});
