import type { LocalBackend } from "./capabilities";

export type LocalModelTierId = "a" | "b" | "c";

/** webllm = MLC WebGPU (chat otimizado); onnx = Transformers.js (webnn/wasm). */
export type ModelEngine = "webllm" | "onnx";

export interface LocalModelCandidate {
  engine: ModelEngine;
  /** webllm: id MLC ("…-q4f16_1-MLC"); onnx: repoId HF ("onnx-community/…"). */
  modelId: string;
  /** Repo HF espelhado por scripts/download-local-models.ts. */
  hfRepo: string;
  /** Pasta local em public/models/<slug>/ quando self-hosted. */
  slug: string;
  dtype: string;
  approxBytes: number;
  minQuotaBytes: number;
  label: string;
  /** webllm: arquivo .wasm do model lib (public/models/<slug>/ ou CDN MLC). */
  wasmLib?: string;
}

export interface LocalModelTier {
  id: LocalModelTierId;
  devices: LocalBackend[];
  /** Cascata de candidatos: falha → próximo. Espelha a cascata GGUF do motor. */
  candidates: LocalModelCandidate[];
}

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

export const LOCAL_MODEL_TIERS: Record<LocalModelTierId, LocalModelTier> = {
  a: {
    id: "a",
    devices: ["webgpu"],
    candidates: [
      {
        engine: "webllm",
        modelId: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
        hfRepo: "mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC",
        slug: "qwen2.5-3b-instruct-mlc",
        dtype: "q4f16",
        approxBytes: 1.9 * GIB,
        minQuotaBytes: 4 * GIB,
        label: "Qwen2.5 3B",
        wasmLib: "Qwen2.5-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
      },
      {
        engine: "webllm",
        modelId: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
        hfRepo: "mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC",
        slug: "llama-3.2-3b-instruct-mlc",
        dtype: "q4f16",
        approxBytes: 1.9 * GIB,
        minQuotaBytes: 4 * GIB,
        label: "Llama 3.2 3B",
        wasmLib: "Llama-3.2-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
      },
    ],
  },
  b: {
    id: "b",
    devices: ["webgpu"],
    candidates: [
      {
        engine: "webllm",
        modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        hfRepo: "mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
        slug: "llama-3.2-1b-instruct-mlc",
        dtype: "q4f16",
        approxBytes: 0.8 * GIB,
        minQuotaBytes: 2 * GIB,
        label: "Llama 3.2 1B",
        wasmLib: "Llama-3.2-1B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
      },
      {
        engine: "webllm",
        modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        hfRepo: "mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        slug: "qwen2.5-1.5b-instruct-mlc",
        dtype: "q4f16",
        approxBytes: 1.0 * GIB,
        minQuotaBytes: 2 * GIB,
        label: "Qwen2.5 1.5B",
        wasmLib: "Qwen2.5-1.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
      },
      {
        engine: "webllm",
        modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        hfRepo: "mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        slug: "qwen2.5-0.5b-instruct-mlc",
        dtype: "q4f16",
        approxBytes: 0.45 * GIB,
        minQuotaBytes: 1 * GIB,
        label: "Qwen2.5 0.5B",
        wasmLib: "Qwen2.5-0.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
      },
    ],
  },
  c: {
    id: "c",
    devices: ["webnn", "wasm"],
    candidates: [
      {
        engine: "onnx",
        modelId: "onnx-community/SmolLM2-360M-Instruct",
        hfRepo: "onnx-community/SmolLM2-360M-Instruct",
        slug: "smollm2-360m-instruct",
        dtype: "q8",
        approxBytes: 380 * MIB,
        minQuotaBytes: 1 * GIB,
        label: "SmolLM2 360M",
      },
      {
        engine: "onnx",
        modelId: "onnx-community/SmolLM2-135M-Instruct",
        hfRepo: "onnx-community/SmolLM2-135M-Instruct",
        slug: "smollm2-135m-instruct",
        dtype: "q8",
        approxBytes: 140 * MIB,
        minQuotaBytes: 1 * GIB,
        label: "SmolLM2 135M",
      },
    ],
  },
};

/** Ordem de demote quando um tier falha por completo. */
export const TIER_FALLBACK_ORDER: LocalModelTierId[] = ["a", "b", "c"];

export function nextTier(current: LocalModelTierId): LocalModelTierId | null {
  const idx = TIER_FALLBACK_ORDER.indexOf(current);
  return idx >= 0 && idx < TIER_FALLBACK_ORDER.length - 1
    ? TIER_FALLBACK_ORDER[idx + 1]
    : null;
}

/** Arquivo probado para detectar modelo self-hosted em public/models/<slug>/. */
export function selfHostProbeFile(candidate: LocalModelCandidate): string {
  return candidate.engine === "webllm" ? "mlc-chat-config.json" : "config.json";
}

export function formatBytes(bytes: number): string {
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(1)} GB`;
  return `${Math.round(bytes / MIB)} MB`;
}
