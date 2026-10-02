import {
  probeDeviceCapabilities,
  requestPersistentStorage,
  type DeviceProfile,
} from "./capabilities";
import {
  getLocalAiManifest,
  putLocalAiManifest,
  type LocalAiManifest,
} from "./model-store";
import {
  LOCAL_MODEL_TIERS,
  nextTier,
  selfHostProbeFile,
  type LocalModelCandidate,
  type LocalModelTier,
  type LocalModelTierId,
} from "./models";
import type { WorkerInMessage, WorkerOutMessage } from "./local-ai.worker";

export type LocalAiStatus =
  | "idle"
  | "probing"
  | "opt_in_required"
  | "downloading"
  | "loading"
  | "ready"
  | "unsupported"
  | "error";

export interface LocalAiState {
  status: LocalAiStatus;
  tier: LocalModelTierId | null;
  modelLabel: string | null;
  /** 0–100 durante o download dos pesos. */
  progressPct: number | null;
  downloadingFile: string | null;
  approxBytes: number | null;
  /** saveData/3g → precisa de opt-in explícito antes de baixar. */
  autoDownloadBlocked: boolean;
  persisted: boolean;
  error: string | null;
}

const INITIAL_STATE: LocalAiState = {
  status: "idle",
  tier: null,
  modelLabel: null,
  progressPct: null,
  downloadingFile: null,
  approxBytes: null,
  autoDownloadBlocked: false,
  persisted: false,
  error: null,
};

/** Bumb para invalidar manifest de modelo quando o catálogo mudar. */
export const LOCAL_AI_CACHE_VERSION =
  process.env.NEXT_PUBLIC_LOCAL_AI_CACHE_VERSION?.trim() || "1";

const LOCAL_AI_DISABLED = process.env.NEXT_PUBLIC_LOCAL_AI === "off";
const MODEL_BASE_OVERRIDE = process.env.NEXT_PUBLIC_LOCAL_AI_MODEL_BASE?.trim();
const FORCE_TIER = process.env.NEXT_PUBLIC_LOCAL_AI_FORCE_TIER?.trim() as
  | LocalModelTierId
  | undefined;

export interface GenerateRequest {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  maxNewTokens?: number;
}

interface EngineDeps {
  probe: () => Promise<DeviceProfile>;
  createWorker: () => WorkerLike;
  headFetch: (url: string) => Promise<boolean>;
  getManifest: (version: string) => Promise<LocalAiManifest | null>;
  putManifest: (m: Omit<LocalAiManifest, "key">) => Promise<void>;
  requestPersist: () => Promise<boolean>;
}

interface WorkerLike {
  postMessage(msg: WorkerInMessage): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<WorkerOutMessage>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

function defaultDeps(): EngineDeps {
  return {
    probe: probeDeviceCapabilities,
    createWorker: () =>
      new Worker(new URL("./local-ai.worker.ts", import.meta.url), {
        type: "module",
      }) as unknown as WorkerLike,
    headFetch: async (url) => {
      try {
        const res = await fetch(url, { method: "HEAD", cache: "no-store" });
        return res.ok;
      } catch {
        return false;
      }
    },
    getManifest: getLocalAiManifest,
    putManifest: putLocalAiManifest,
    requestPersist: requestPersistentStorage,
  };
}

/** Modelo já baixado antes → nenhum download será necessário (cache hit). */
function isCached(
  manifest: Omit<LocalAiManifest, "key"> | null,
  candidate: LocalModelCandidate,
) {
  return manifest !== null && manifest.modelId === candidate.modelId;
}

export function createLocalAiEngine(deps: EngineDeps = defaultDeps()) {
  let state: LocalAiState = { ...INITIAL_STATE };
  const listeners = new Set<(s: LocalAiState) => void>();
  let worker: WorkerLike | null = null;
  let profile: DeviceProfile | null = null;
  let manifest: Omit<LocalAiManifest, "key"> | null = null;
  let genSeq = 0;
  const pending = new Map<
    number,
    {
      resolve: (out: string) => void;
      reject: (err: Error) => void;
      onToken?: (text: string) => void;
    }
  >();

  const emit = () => listeners.forEach((fn) => fn(state));
  const set = (patch: Partial<LocalAiState>) => {
    state = { ...state, ...patch };
    emit();
  };

  async function probeLocalPublic(candidate: LocalModelCandidate): Promise<boolean> {
    const base = MODEL_BASE_OVERRIDE || "/models";
    return deps.headFetch(`${base}/${candidate.slug}/${selfHostProbeFile(candidate)}`);
  }

  function spawnWorker(
    candidate: LocalModelCandidate,
    device: string,
    useLocal: boolean,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      worker?.terminate();
      worker = deps.createWorker();
      let settled = false;

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "progress") {
          set({
            status: "downloading",
            progressPct: Math.max(0, Math.min(100, Math.round(msg.progress))),
            downloadingFile: msg.file || null,
          });
          return;
        }
        if (msg.type === "ready") {
          if (!settled) {
            settled = true;
            resolve();
          }
          return;
        }
        if (msg.type === "token") {
          pending.get(msg.id)?.onToken?.(msg.text);
          return;
        }
        if (msg.type === "done") {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          p?.resolve(msg.output);
          return;
        }
        if (msg.type === "error") {
          if (msg.id !== undefined) {
            const p = pending.get(msg.id);
            pending.delete(msg.id);
            p?.reject(new Error(msg.message));
          }
          if (msg.fatal && !settled) {
            settled = true;
            reject(new Error(msg.message));
          }
        }
      };
      worker.onerror = (e) => {
        if (!settled) {
          settled = true;
          reject(new Error(e.message || "worker error"));
        }
      };

      worker.postMessage({
        type: "init",
        impl: candidate.engine,
        modelId:
          candidate.engine === "onnx" && useLocal
            ? candidate.slug
            : candidate.modelId,
        device,
        dtype: candidate.dtype,
        localBase: useLocal ? MODEL_BASE_OVERRIDE || "/models" : null,
        wasmLibFile: useLocal ? (candidate.wasmLib ?? null) : null,
        localSlug: candidate.slug,
      });
    });
  }

  /** Tenta um candidato: self-host (public/models) antes do CDN HF. */
  async function tryCandidate(
    tier: LocalModelTier,
    candidate: LocalModelCandidate,
  ): Promise<boolean> {
    const alreadyCached = isCached(manifest, candidate);
    const useLocal = await probeLocalPublic(candidate);
    set({
      tier: tier.id,
      modelLabel: candidate.label,
      approxBytes: candidate.approxBytes,
      progressPct: alreadyCached ? null : 0,
      status: alreadyCached ? "loading" : "downloading",
    });

    const devices = tier.devices.filter((d) =>
      profile ? profile.backends.includes(d) || d === "wasm" : true,
    );
    for (const device of devices.length ? devices : ["wasm"]) {
      try {
        await spawnWorker(candidate, device, useLocal);
        manifest = {
          tier: tier.id,
          modelId: candidate.modelId,
          slug: candidate.slug,
          dtype: candidate.dtype,
          source: useLocal ? "public" : "huggingface",
          downloadedAt: Date.now(),
          approxBytes: candidate.approxBytes,
          version: LOCAL_AI_CACHE_VERSION,
        };
        void deps.putManifest(manifest);
        return true;
      } catch {
        // próximo backend/candidato
      }
    }
    return false;
  }

  async function loadCascade(startTier: LocalModelTierId) {
    let tierId: LocalModelTierId | null = startTier;
    while (tierId) {
      const tier = LOCAL_MODEL_TIERS[tierId];
      for (const candidate of tier.candidates) {
        if (await tryCandidate(tier, candidate)) {
          set({ status: "ready", progressPct: null, downloadingFile: null });
          return;
        }
      }
      tierId = nextTier(tierId);
    }
    set({ status: "unsupported", error: "nenhum tier carregou" });
  }

  async function init() {
    if (LOCAL_AI_DISABLED || state.status !== "idle") return;
    set({ status: "probing" });

    profile = await deps.probe();
    manifest = await deps.getManifest(LOCAL_AI_CACHE_VERSION);

    if (!profile.supported || !profile.tier) {
      set({ status: "unsupported", error: profile.reasons.join(",") || null });
      return;
    }

    const startTier = FORCE_TIER ?? profile.tier;
    const hasCached = manifest !== null;

    if (profile.meteredConnection && !hasCached) {
      set({
        status: "opt_in_required",
        autoDownloadBlocked: true,
        tier: startTier,
        persisted: profile.persisted,
      });
      return;
    }

    set({ persisted: profile.persisted });
    void deps.requestPersist().then((p) => set({ persisted: p }));
    await loadCascade(startTier);
  }

  /** Chamado pelo botão de opt-in quando a conexão é limitada. */
  async function enableAndDownload() {
    if (state.status !== "opt_in_required") return;
    set({ autoDownloadBlocked: false });
    void deps.requestPersist().then((p) => set({ persisted: p }));
    await loadCascade(state.tier ?? "c");
  }

  function generate(
    req: GenerateRequest,
    onToken?: (text: string) => void,
  ): Promise<string> {
    if (state.status !== "ready" || !worker) {
      return Promise.reject(new Error("IA local não está pronta"));
    }
    const id = ++genSeq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, onToken });
      worker!.postMessage({
        type: "generate",
        id,
        messages: req.messages,
        maxNewTokens: req.maxNewTokens ?? 220,
      });
    });
  }

  return {
    init,
    enableAndDownload,
    generate,
    getState: () => state,
    subscribe: (fn: (s: LocalAiState) => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** testes/shutdown */
    dispose() {
      worker?.terminate();
      worker = null;
      pending.clear();
      set({ ...INITIAL_STATE });
    },
  };
}

export type LocalAiEngine = ReturnType<typeof createLocalAiEngine>;

let singleton: LocalAiEngine | null = null;
export function getLocalAiEngine(): LocalAiEngine {
  if (!singleton) singleton = createLocalAiEngine();
  return singleton;
}
