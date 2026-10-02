import { SPLINE_CACHE_VERSION } from "@/lib/utils/constants";

const DB_NAME = "esh-spline-cache";
const DB_VERSION = 1;
const STORE_NAME = "scenes";

export interface SplineSceneRecord {
  key: string;
  data: ArrayBuffer;
  version: string;
  etag: string | null;
  lastModified: string | null;
  cachedAt: number;
}

export interface FetchedSplineScene {
  data: ArrayBuffer;
  etag: string | null;
  lastModified: string | null;
}

function openSplineCacheDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Cache é best-effort: qualquer falha de IDB (privado, quota, permissão) vira null. */
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openSplineCacheDb();
  if (!db) return null;

  try {
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = run(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function getSplineScene(url: string): Promise<SplineSceneRecord | null> {
  const record = await withStore("readonly", (store) => store.get(url));
  if (!record || (record as SplineSceneRecord).version !== SPLINE_CACHE_VERSION) {
    return null;
  }
  return record as SplineSceneRecord;
}

export async function putSplineScene(
  url: string,
  data: ArrayBuffer,
  headers: { etag?: string | null; lastModified?: string | null } = {},
): Promise<void> {
  const record: SplineSceneRecord = {
    key: url,
    data,
    version: SPLINE_CACHE_VERSION,
    etag: headers.etag ?? null,
    lastModified: headers.lastModified ?? null,
    cachedAt: Date.now(),
  };
  await withStore("readwrite", (store) => store.put(record));
}

const inflight = new Map<string, Promise<FetchedSplineScene | null>>();

export function fetchSplineScene(url: string): Promise<FetchedSplineScene | null> {
  const pending = inflight.get(url);
  if (pending) return pending;

  const request = (async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return {
        data: await res.arrayBuffer(),
        etag: res.headers.get("etag"),
        lastModified: res.headers.get("last-modified"),
      };
    } catch {
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, request);
  return request;
}

/** HEAD barato para saber se o arquivo em public/ mudou desde que foi cacheado. */
export async function probeSplineSceneChanged(
  url: string,
  record: SplineSceneRecord,
): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!res.ok) return false;

    const etag = res.headers.get("etag");
    if (etag && record.etag) return etag !== record.etag;

    const lastModified = res.headers.get("last-modified");
    if (lastModified && record.lastModified) {
      return lastModified !== record.lastModified;
    }

    const length = res.headers.get("content-length");
    if (length) return Number(length) !== record.data.byteLength;

    return false;
  } catch {
    return false;
  }
}

/** Revalidação em background: se mudou, baixa e atualiza o cache para a próxima visita. */
export async function refreshSplineScene(
  url: string,
  record: SplineSceneRecord,
): Promise<void> {
  const changed = await probeSplineSceneChanged(url, record);
  if (!changed) return;

  const fetched = await fetchSplineScene(url);
  if (fetched) await putSplineScene(url, fetched.data, fetched);
}
