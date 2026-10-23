import type { LocalModelTierId } from "./models";

export type LocalBackend = "webgpu" | "webnn" | "wasm";

export interface DeviceProfile {
  /** false → nenhum tier suportado; toda UI de IA local fica oculta. */
  supported: boolean;
  tier: LocalModelTierId | null;
  /** backends que o dispositivo oferece, na ordem de preferência do tier. */
  backends: LocalBackend[];
  deviceMemoryGb: number | null;
  cores: number;
  quotaBytes: number | null;
  persisted: boolean;
  /** true → não baixar nada sem opt-in explícito do usuário. */
  meteredConnection: boolean;
  reasons: string[];
}

const GIB = 1024 ** 3;

interface NavigatorAi {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
  gpu?: { requestAdapter: () => Promise<{ limits?: { maxBufferSize?: number } } | null> };
  ml?: unknown;
  storage?: {
    estimate?: () => Promise<{ quota?: number; usage?: number }>;
    persisted?: () => Promise<boolean>;
  };
}

/** WebGPU exige contexto seguro + adapter; limites baixos = GPU fraca. */
async function probeWebGpu(
  nav: NavigatorAi,
): Promise<{ ok: boolean; maxBufferMb: number | null }> {
  if (!nav.gpu?.requestAdapter) return { ok: false, maxBufferMb: null };
  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) return { ok: false, maxBufferMb: null };
    const maxBuffer = adapter.limits?.maxBufferSize;
    return { ok: true, maxBufferMb: maxBuffer ? maxBuffer / (1024 ** 2) : null };
  } catch {
    return { ok: false, maxBufferMb: null };
  }
}

function isMetered(nav: NavigatorAi): boolean {
  const conn = nav.connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return ["slow-2g", "2g", "3g"].includes(conn.effectiveType ?? "");
}

/**
 * Detecta capacidade do dispositivo e escolhe o tier de modelo:
 * A = WebGPU + ≥8 GB RAM, B = WebGPU + ≥4 GB, C = WASM/WebNN (qualquer browser).
 * Sem quota suficiente para o menor tier → unsupported.
 */
export async function probeDeviceCapabilities(): Promise<DeviceProfile> {
  const reasons: string[] = [];
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      supported: false, tier: null, backends: [], deviceMemoryGb: null, cores: 0,
      quotaBytes: null, persisted: false, meteredConnection: false, reasons: ["ssr"],
    };
  }

  const nav = navigator as unknown as NavigatorAi;
  const cores = nav.hardwareConcurrency ?? 2;
  const deviceMemoryGb = nav.deviceMemory ?? null;
  const meteredConnection = isMetered(nav);

  const [gpu, quotaBytes, persisted] = await Promise.all([
    probeWebGpu(nav),
    nav.storage?.estimate?.().then((e) => e.quota ?? null).catch(() => null) ?? Promise.resolve(null),
    nav.storage?.persisted?.().catch(() => false) ?? Promise.resolve(false),
  ]);

  const hasWebNn = typeof nav.ml !== "undefined" && nav.ml !== null;
  const quotaKnown = quotaBytes !== null;

  if (gpu.ok) {
    const mem = deviceMemoryGb ?? 4; // FF/Safari não expõem deviceMemory — assume mid
    const strongGpu = mem >= 8 && cores >= 6 && (gpu.maxBufferMb === null || gpu.maxBufferMb >= 2048);
    const tier: LocalModelTierId | null =
      strongGpu && (quotaBytes === null || quotaBytes >= 4 * GIB)
        ? "a"
        : quotaBytes === null || quotaBytes >= 2 * GIB
          ? "b"
          : quotaBytes >= 1 * GIB
            ? "c"
            : null;
    if (tier === null) {
      reasons.push("quota_insuficiente");
      return {
        supported: false, tier: null, backends: [], deviceMemoryGb, cores,
        quotaBytes, persisted, meteredConnection, reasons,
      };
    }
    return {
      supported: true,
      tier,
      backends: ["webgpu", hasWebNn ? "webnn" : "wasm"].filter(Boolean) as LocalBackend[],
      deviceMemoryGb, cores, quotaBytes, persisted, meteredConnection,
      reasons: quotaKnown ? reasons : [...reasons, "quota_desconhecida"],
    };
  }

  if (hasWebNn) reasons.push("webnn_cpu");
  if (quotaBytes !== null && quotaBytes < 1 * GIB) {
    reasons.push("quota_insuficiente");
    return {
      supported: false, tier: null, backends: [], deviceMemoryGb, cores,
      quotaBytes, persisted, meteredConnection, reasons,
    };
  }
  reasons.push("sem_webgpu");
  return {
    supported: true,
    tier: "c",
    backends: hasWebNn ? ["webnn", "wasm"] : ["wasm"],
    deviceMemoryGb, cores, quotaBytes, persisted, meteredConnection,
    reasons,
  };
}

/** Pede storage persistente para o browser não evictar pesos (IndexedDB/Cache). */
export async function requestPersistentStorage(): Promise<boolean> {
  const nav = (typeof navigator !== "undefined" ? navigator : null) as unknown as NavigatorAi | null;
  if (!nav?.storage) return false;
  const persist = (nav.storage as { persist?: () => Promise<boolean> }).persist;
  if (!persist) return false;
  try {
    return await persist.call(nav.storage);
  } catch {
    return false;
  }
}
