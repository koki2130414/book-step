// BOOK STEP: 簡易Service Worker
// ホーム画面追加後のオフライン起動を最低限サポートするため、
// 静的アセット(JS/CSS)をキャッシュファーストで返す。
// APIやSupabaseへの通信は常にネットワーク優先(オフラインでデータが古くならないようにする)
const CACHE_NAME = "book-step-cache-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // ナビゲーション(ページ遷移)はネットワーク優先、失敗時はオフライン案内ページ
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // 静的アセットはキャッシュ優先
  if (request.destination === "script" || request.destination === "style" || request.destination === "font") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
  }
});
