"use client";

import { useCallback } from "react";

import { useLocalAI } from "@/hooks/useLocalAI";
import { useLocalSummary } from "@/hooks/useLocalSummary";
import { LOCAL_AI_DISCLAIMER, resumeEventosPrompt } from "@/lib/local-ai/summaries";
import type { EventoEstruturado } from "@/lib/types";

interface EventsLocalSummaryProps {
  eventos: EventoEstruturado[];
}

/** Botão "Resumir eventos" — síntese on-device (não mencionar na UI). */
export function EventsLocalSummary({ eventos }: EventsLocalSummaryProps) {
  const { status } = useLocalAI();
  const input = eventos
    .slice(0, 10)
    .map((e) => `${e.evento}|${e.regiao}|${e.grau_tensao}`)
    .join(";");
  const build = useCallback(() => resumeEventosPrompt(eventos), [eventos]);
  const { text, generating, error, generate } = useLocalSummary(
    "resume-eventos",
    input,
    build,
  );

  if (status !== "ready" || eventos.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={generate}
        disabled={generating}
        className="btn-ghost text-xs disabled:opacity-50"
      >
        {generating ? "Resumindo…" : "Resumir eventos"}
      </button>
      {(text !== null || error) && (
        <div className="mt-2 rounded-lg border border-violet-900/40 bg-ink-800 p-3" aria-live="polite">
          {text && <p className="text-xs leading-relaxed text-slate-300">{text}</p>}
          {error && (
            <p className="text-xs text-slate-500" role="alert">
              Não foi possível gerar a síntese local.
            </p>
          )}
          {text && <p className="mt-2 text-[10px] text-slate-600">{LOCAL_AI_DISCLAIMER}</p>}
        </div>
      )}
    </div>
  );
}
