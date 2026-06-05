const CACHE_NAME = "myapp-cache-v1";

// 오프라인 대비로 미리 저장해 둘 핵심 파일들
const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./app.js",
  "./calc.js",
  "./pad.js",
  "./styles.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 설치: 핵심 파일을 미리 폰에 저장
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES))
  );
});

// 활성화: 예전 버전 캐시 청소
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// 요청 처리: 네트워크 우선 → 실패하면 캐시에서 꺼내 줌
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});