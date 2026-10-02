"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { LocalAiState } from "@/lib/local-ai/engine";

const SERVER_STATE: LocalAiState = {
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

type EngineModule = typeof import("@/lib/local-ai/engine");

let engineModulePromise: Promise<EngineModule> | null = null;
function loadEngine(): Promise<EngineModule> {
  if (!engineModulePromise) engineModulePromise = import("@/lib/local-ai/engine");
  return engineModulePromise;
}

let engineInstance: import("@/lib/local-ai/engine").LocalAiEngine | null = null;

/** Estado do engine de IA local (SSR-safe: idle no servidor). */
export function useLocalAI(): LocalAiState & {
  enableLocalAi: () => void;
} {
  const state = useSyncExternalStore(
    (onStoreChange) => {
      let unsubscribe = () => {};
      let mounted = true;
      loadEngine().then((mod) => {
        if (!mounted) return;
        engineInstance = mod.getLocalAiEngine();
        unsubscribe = engineInstance.subscribe(() => onStoreChange());
        onStoreChange(); // estado já pode ter mudado antes do subscribe
      });
      return () => {
        mounted = false;
        unsubscribe();
      };
    },
    () => engineInstance?.getState() ?? SERVER_STATE,
    () => SERVER_STATE,
  );

  const enableLocalAi = useCallback(() => {
    void engineInstance?.enableAndDownload();
  }, []);

  return { ...state, enableLocalAi };
}

/** Chamado uma vez (LocalAIHost) para disparar probe + download automático. */
export function startLocalAiEngine(): void {
  void loadEngine().then((mod) => {
    engineInstance = mod.getLocalAiEngine();
    void engineInstance.init();
  });
}
