"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLocalAI } from "./useLocalAI";
import type { LocalAiEngine } from "@/lib/local-ai/engine";
import { getCachedAiOutput, putCachedAiOutput } from "@/lib/local-ai/model-store";
import { hashOutputKey } from "@/lib/local-ai/summaries";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export interface LocalSummaryResult {
  /** null = ainda não gerado; string = texto (streaming incluído). */
  text: string | null;
  generating: boolean;
  error: string | null;
  fromCache: boolean;
  /** dispara a geração (ou resolve do cache IDB). */
  generate: () => void;
}

let engineRef: LocalAiEngine | null = null;

/**
 * Geração cache-first: hash(kind + input) → IDB → engine.generate.
 * Chamar `generate()` só quando o usuário pedir ou quando `auto` for usado
 * por um componente que decidiu gerar ao montar.
 */
export function useLocalSummary(kind: string, input: string, build: () => Msg[]): LocalSummaryResult {
  const { status } = useLocalAI();
  const [text, setText] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const runningRef = useRef(false);

  const generate = useCallback(() => {
    if (runningRef.current || status !== "ready") return;
    runningRef.current = true;
    setGenerating(true);
    setError(null);
    setFromCache(false);

    (async () => {
      const engine = engineRef ?? (await import("@/lib/local-ai/engine")).getLocalAiEngine();
      engineRef = engine;
      const key = await hashOutputKey(kind, input);
      const cached = await getCachedAiOutput(key);
      if (cached) {
        setText(cached.output);
        setFromCache(true);
        return;
      }
      let acc = "";
      const output = await engine.generate(
        { messages: build() },
        (token) => {
          acc += token;
          setText(acc);
        },
      );
      const finalText = output.trim() || acc.trim();
      setText(finalText);
      if (finalText) {
        void putCachedAiOutput({
          hash: key,
          kind,
          output: finalText,
          modelId: engine.getState().modelLabel ?? "desconhecido",
        });
      }
    })()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "falha na geração local");
      })
      .finally(() => {
        runningRef.current = false;
        setGenerating(false);
      });
  }, [build, input, kind, status]);

  // Se o engine ficar pronto e já houver cache, resolve sem gerar.
  useEffect(() => {
    if (status !== "ready" || text !== null) return;
    let cancelled = false;
    hashOutputKey(kind, input).then(async (key) => {
      const cached = await getCachedAiOutput(key);
      if (!cancelled && cached) {
        setText(cached.output);
        setFromCache(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, text, kind, input]);

  return { text, generating, error, fromCache, generate };
}
