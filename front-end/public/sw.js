/* Service worker do dashboard — runtime cache, zero dependências.
 * Estratégias: navegação network-first → offline.html; estático cache-first;
 * /api/db/* stale-while-revalidate; /models/* cache-first (self-host IA);
 * CDNs de modelos (Hugging Face) passam direto — o engine cacheia no IDB/Cache. */

const SHELL_CACHE = "esh-shell-v1";
const RUNTIME_CACHE = "esh-runtime-v1";
const MODELS_CACHE = "esh-models-v1";

const SHELL_ASSETS = ["/offline.html", "/favicon.svg", "/site.webmanifest"];

/** Hosts de pesos de modelos — o engine gerencia o próprio cache. */
const MODEL_CDN_HOSTS = [
  "huggingface.co",
  "cdn-lfs.huggingface.co",
  "cas-bridge.xethub.hf.co",
];
/** Runtime WASM do ONNX — pequeno, cache-first para funcionar offline. */
const RUNTIME_CDN_HOSTS = ["cdn.jsdelivr.net"];

const STATIC_EXT = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt)$/i;
const MEDIA_EXT = /\.(?:mp4|mp3|spline|splinecode)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE, MODELS_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || network.then((r) => r || cached);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Pesos de modelo: engine cacheia (Cache Storage/IDB) — não interceptar.
  if (MODEL_CDN_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
    return;
  }

  // Runtime WASM (ORT) — cache-first para uso offline.
  if (RUNTIME_CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  if (!sameOrigin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/offline.html"));
    return;
  }

  if (url.pathname.startsWith("/models/")) {
    event.respondWith(cacheFirst(request, MODELS_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/db/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return; // auth/admin/joshua: sempre rede
  }

  if (MEDIA_EXT.test(url.pathname)) {
    return; // mídia pesada: sem cache
  }

  if (url.pathname.startsWith("/_next/static/") || STATIC_EXT.test(url.pathname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  }
});
