/** Persistência local da IA on-device — IndexedDB `esh-local-ai`.
 *  Best-effort (estilo spline-scene-cache): falhas de IDB viram null. */

export interface LocalAiManifest {
  key: "current";
  tier: string;
  modelId: string;
  slug: string;
  dtype: string;
  source: "public" | "huggingface";
  downloadedAt: number;
  approxBytes: number;
  version: string;
}

export interface CachedAiOutput {
  hash: string;
  kind: string;
  output: string;
  modelId: string;
  createdAt: number;
}

const DB_NAME = "esh-local-ai";
const DB_VERSION = 1;
const MANIFEST_STORE = "manifest";
const OUTPUTS_STORE = "outputs";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MANIFEST_STORE)) {
          db.createObjectStore(MANIFEST_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(OUTPUTS_STORE)) {
          db.createObjectStore(OUTPUTS_STORE, { keyPath: "hash" });
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

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(storeName, mode);
      const request = run(tx.objectStore(storeName));
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

export async function getLocalAiManifest(
  expectedVersion: string,
): Promise<LocalAiManifest | null> {
  const record = await withStore(MANIFEST_STORE, "readonly", (s) => s.get("current"));
  if (!record) return null;
  const manifest = record as LocalAiManifest;
  return manifest.version === expectedVersion ? manifest : null;
}

export async function putLocalAiManifest(
  manifest: Omit<LocalAiManifest, "key">,
): Promise<void> {
  await withStore(MANIFEST_STORE, "readwrite", (s) =>
    s.put({ ...manifest, key: "current" } satisfies LocalAiManifest),
  );
}

export async function getCachedAiOutput(hash: string): Promise<CachedAiOutput | null> {
  const record = (await withStore(OUTPUTS_STORE, "readonly", (s) =>
    s.get(hash),
  )) as CachedAiOutput | null;
  return record ?? null;
}

const OUTPUTS_CAP = 150;

export async function putCachedAiOutput(
  output: Omit<CachedAiOutput, "createdAt">,
): Promise<void> {
  await withStore(OUTPUTS_STORE, "readwrite", (s) =>
    s.put({ ...output, createdAt: Date.now() }),
  );
  // Evicção best-effort: outputs acumulam por dia/modelo — manter ~150 mais novos
  try {
    const all = (await withStore(OUTPUTS_STORE, "readonly", (s) =>
      s.getAll(),
    )) as CachedAiOutput[];
    if (all.length > OUTPUTS_CAP) {
      const oldest = all
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        .slice(0, all.length - OUTPUTS_CAP);
      await withStore(OUTPUTS_STORE, "readwrite", (s) => {
        for (const rec of oldest.slice(0, -1)) s.delete(rec.hash);
        return s.delete(oldest[oldest.length - 1].hash);
      });
    }
  } catch {
    // eviction é opcional — falha nunca quebra o fluxo
  }
}
