import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCachedAiOutput,
  getLocalAiManifest,
  putCachedAiOutput,
  putLocalAiManifest,
} from "@/lib/local-ai/model-store";

afterEach(() => vi.unstubAllGlobals());

const MANIFEST = {
  tier: "b",
  modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  slug: "llama-3.2-1b-instruct-mlc",
  dtype: "q4f16",
  source: "public" as const,
  downloadedAt: 1,
  approxBytes: 800,
  version: "test",
};

describe("model-store (IndexedDB)", () => {
  it("salva e lê manifest na versão esperada", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    await putLocalAiManifest(MANIFEST);
    expect(await getLocalAiManifest("test")).toMatchObject({
      modelId: MANIFEST.modelId,
      source: "public",
    });
  });

  it("versão diferente → manifest descartado", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    await putLocalAiManifest(MANIFEST);
    expect(await getLocalAiManifest("outra")).toBeNull();
  });

  it("outputs por hash: put/get round-trip", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    await putCachedAiOutput({
      hash: "abc",
      kind: "resumo-dia",
      output: "texto",
      modelId: "m",
    });
    expect(await getCachedAiOutput("abc")).toMatchObject({ output: "texto" });
    expect(await getCachedAiOutput("zzz")).toBeNull();
  });

  it("IDB indisponível → null (best-effort)", async () => {
    vi.stubGlobal("indexedDB", undefined);
    expect(await getLocalAiManifest("test")).toBeNull();
    await expect(putLocalAiManifest(MANIFEST)).resolves.toBeUndefined();
  });
});
