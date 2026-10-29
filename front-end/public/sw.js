/* Service worker do dashboard — runtime cache, zero dependências.
 * Estratégias: navegação network-first → offline.html; estático cache-first;
 * /api/db/* stale-while-revalidate; /models/* cache-first (self-host IA);
 * CDNs de modelos (Hugging Face) passam direto — o engine cacheia no IDB/Cache.
 * Push notifications: recebe notificações do servidor via Web Push API.
 * Background sync: fila de requisições pendentes quando offline. */

const SHELL_CACHE = "esh-shell-v2";
const RUNTIME_CACHE = "esh-runtime-v2";
const MODELS_CACHE = "esh-models-v1";
const SYNC_QUEUE_NAME = "esh-sync-queue";

const SHELL_ASSETS = [
  "/offline.html",
  "/favicon.svg",
  "/site.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

const CRITICAL_PAGES = [
  "/",
  "/painel",
  "/rankings",
  "/historico",
  "/globo",
  "/profecias",
];

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
      .then((cache) =>
        // best-effort por asset: um 404 não pode abortar o install inteiro
        Promise.allSettled([...SHELL_ASSETS, ...CRITICAL_PAGES].map((a) => cache.add(a))),
      )
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
      .then(() => self.clients.claim())
      .then(() => {
        // Sync pending push subscription if exists
        return syncPendingPushSubscription();
      }),
  );
});

async function syncPendingPushSubscription() {
  try {
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      // Notify clients to check for pending subscription
      client.postMessage({ type: "SYNC_PENDING_SUBSCRIPTION" });
    }
  } catch (error) {
    console.error("Error syncing pending subscription:", error);
  }
}

function putSafe(cache, request, res) {
  if (res.ok) cache.put(request, res.clone()).catch(() => {});
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    putSafe(cache, request, res);
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
  putSafe(cache, request, res);
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      putSafe(cache, request, res);
      return res;
    })
    .catch(async (err) => {
      // Se offline e é requisição de API, enfileirar para background sync
      if (request.url.includes("/api/db/")) {
        await queueRequest(request);
        // Registrar sync para quando voltar online
        await self.registration.sync.register(SYNC_QUEUE_NAME);
      }
      return null;
    });
  if (cached) return cached;
  const res = await network;
  if (res) return res;
  throw new TypeError("Failed to fetch (sem cache e sem rede)");
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

  if (url.pathname.startsWith("/models/") || url.pathname === "/local-ai.worker.js") {
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

/* ==================== Push Notifications ==================== */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "Nova atualização disponível",
    icon: "/favicon.svg",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
    tag: data.tag || "sinais-update",
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Sinais Históricos", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Se já tiver uma janela aberta, foca nela
        for (const client of clientList) {
          if (client.url === new URL(url, self.location.origin).href && "focus" in client) {
            return client.focus();
          }
        }
        // Se não, abre uma nova janela
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});

self.addEventListener("notificationclose", (event) => {
  // Opcional: tracking de fechamento de notificação
  // Pode enviar analytics para o backend
  const data = event.notification.data;
  console.log("Notification closed:", data);
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Renovação automática de subscription
  // O browser renova a subscription periodicamente; precisamos atualizar no backend
  event.waitUntil(
    (async () => {
      const newSubscription = event.newSubscription;
      const oldSubscription = event.oldSubscription;

      if (newSubscription) {
        // Enviar nova subscription para o backend
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: newSubscription.toJSON(),
            oldSubscription: oldSubscription?.toJSON(),
          }),
        });
      }
    })(),
  );
});

/* ==================== Background Sync ==================== */

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_QUEUE_NAME) {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const cache = await caches.open(RUNTIME_CACHE);
  const queueCache = await caches.open(SYNC_QUEUE_NAME);
  const queuedRequests = await queueCache.keys();

  for (const request of queuedRequests) {
    try {
      // Reenviar requisição
      const response = await fetch(request);
      if (response.ok) {
        // Se sucesso, remover da fila
        await queueCache.delete(request);
        // Atualizar cache com resposta nova
        await putSafe(cache, request, response);
      }
    } catch (error) {
      // Se falhar, manter na fila para próxima sync
      console.error("Sync failed for request:", request.url, error);
    }
  }
}

async function queueRequest(request) {
  const queueCache = await caches.open(SYNC_QUEUE_NAME);
  await queueCache.put(request, new Response("queued"));
}
