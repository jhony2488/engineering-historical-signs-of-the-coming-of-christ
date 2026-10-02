import { describe, expect, it, vi } from "vitest";

import {
  createLocalAiEngine,
  type LocalAiEngine,
} from "@/lib/local-ai/engine";
import type { DeviceProfile } from "@/lib/local-ai/capabilities";
import type { LocalAiManifest } from "@/lib/local-ai/model-store";
import { LOCAL_MODEL_TIERS } from "@/lib/local-ai/models";
import type { WorkerInMessage, WorkerOutMessage } from "@/lib/local-ai/local-ai.worker";

const GIB = 1024 ** 3;

class FakeWorker {
  onmessage: ((e: { data: WorkerOutMessage }) => void) | null = null;
  onerror: ((e: { message?: string }) => void) | null = null;
  posted: WorkerInMessage[] = [];
  failInit = false;

  postMessage(msg: WorkerInMessage) {
    this.posted.push(msg);
    if (msg.type === "init") {
      queueMicrotask(() => {
        if (this.failInit) {
          this.onmessage?.({ data: { type: "error", message: "boom", fatal: true } });
        } else {
          this.onmessage?.({ data: { type: "ready", modelId: msg.modelId } });
        }
      });
    } else if (msg.type === "generate") {
      queueMicrotask(() => {
        this.onmessage?.({ data: { type: "token", id: msg.id, text: "oi" } });
        this.onmessage?.({ data: { type: "done", id: msg.id, output: "oi" } });
      });
    }
  }
  terminate() {}
}

function profile(over: Partial<DeviceProfile> = {}): DeviceProfile {
  return {
    supported: true,
    tier: "b",
    backends: ["webgpu"],
    deviceMemoryGb: 8,
    cores: 8,
    quotaBytes: 8 * GIB,
    persisted: false,
    meteredConnection: false,
    reasons: [],
    ...over,
  };
}

function makeDeps(opts: {
  profile?: DeviceProfile;
  manifest?: LocalAiManifest | null;
  headOk?: boolean;
  worker?: FakeWorker;
}) {
  const worker = opts.worker ?? new FakeWorker();
  const putManifest = vi.fn().mockResolvedValue(undefined);
  return {
    deps: {
      probe: () => Promise.resolve(opts.profile ?? profile()),
      createWorker: () => worker as never,
      headFetch: () => Promise.resolve(opts.headOk ?? false),
      getManifest: () => Promise.resolve(opts.manifest ?? null),
      putManifest,
      requestPersist: () => Promise.resolve(true),
    },
    worker,
    putManifest,
  };
}

const CACHED_MANIFEST: LocalAiManifest = {
  key: "current",
  tier: "b",
  modelId: LOCAL_MODEL_TIERS.b.candidates[0].modelId,
  slug: LOCAL_MODEL_TIERS.b.candidates[0].slug,
  dtype: "q4f16",
  source: "huggingface",
  downloadedAt: 1,
  approxBytes: 100,
  version: "1",
};

async function ready(engine: LocalAiEngine) {
  await vi.waitFor(() => expect(engine.getState().status).toBe("ready"));
}

describe("engine de IA on-device", () => {
  it("init → ready com o 1º candidato do tier via CDN", async () => {
    const { deps, worker, putManifest } = makeDeps({});
    const engine = createLocalAiEngine(deps);
    await engine.init();
    await ready(engine);

    const init = worker.posted[0] as Extract<WorkerInMessage, { type: "init" }>;
    expect(init.impl).toBe("webllm");
    expect(init.modelId).toBe(LOCAL_MODEL_TIERS.b.candidates[0].modelId);
    expect(init.localBase).toBeNull();
    expect(putManifest).toHaveBeenCalledOnce();
    expect(engine.getState().modelLabel).toBe(LOCAL_MODEL_TIERS.b.candidates[0].label);
  });

  it("prefere public/models quando self-host está presente (HEAD ok)", async () => {
    const { deps, worker } = makeDeps({ headOk: true });
    const engine = createLocalAiEngine(deps);
    await engine.init();
    await ready(engine);

    const init = worker.posted[0] as Extract<WorkerInMessage, { type: "init" }>;
    expect(init.localBase).toBe("/models");
    expect(init.wasmLibFile).toBe(LOCAL_MODEL_TIERS.b.candidates[0].wasmLib);
  });

  it("unsupported → nada é baixado, nenhum worker criado", async () => {
    const createWorker = vi.fn();
    const engine = createLocalAiEngine({
      ...makeDeps({ profile: profile({ supported: false, tier: null }) }).deps,
      createWorker,
    });
    await engine.init();
    expect(engine.getState().status).toBe("unsupported");
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("rede limitada + sem cache → opt_in_required; enable → ready", async () => {
    const { deps, worker } = makeDeps({
      profile: profile({ meteredConnection: true }),
    });
    const engine = createLocalAiEngine(deps);
    await engine.init();
    expect(engine.getState().status).toBe("opt_in_required");
    expect(worker.posted).toHaveLength(0);

    await engine.enableAndDownload();
    await ready(engine);
  });

  it("rede limitada + manifest cacheado → baixa/carrega sem opt-in", async () => {
    const { deps } = makeDeps({
      profile: profile({ meteredConnection: true }),
      manifest: CACHED_MANIFEST,
    });
    const engine = createLocalAiEngine(deps);
    await engine.init();
    await ready(engine);
  });

  it("candidato falha → demote para o próximo da cascata", async () => {
    const worker = new FakeWorker();
    worker.failInit = true; // 1º candidato falha
    let calls = 0;
    const base = makeDeps({ worker });
    const engine = createLocalAiEngine({
      ...base.deps,
      createWorker: () => {
        const w = new FakeWorker();
        if (calls++ === 0) w.failInit = true;
        return w as never;
      },
    });
    await engine.init();
    await ready(engine);
    expect(engine.getState().modelLabel).toBe(LOCAL_MODEL_TIERS.b.candidates[1].label);
  });

  it("generate resolve com streaming quando ready", async () => {
    const { deps } = makeDeps({});
    const engine = createLocalAiEngine(deps);
    await engine.init();
    await ready(engine);

    const tokens: string[] = [];
    const out = await engine.generate(
      { messages: [{ role: "user", content: "oi" }] },
      (t) => tokens.push(t),
    );
    expect(out).toBe("oi");
    expect(tokens).toEqual(["oi"]);
  });

  it("generate rejeita antes do ready", async () => {
    const { deps } = makeDeps({ profile: profile({ supported: false, tier: null }) });
    const engine = createLocalAiEngine(deps);
    await engine.init();
    await expect(
      engine.generate({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toThrow();
  });
});
