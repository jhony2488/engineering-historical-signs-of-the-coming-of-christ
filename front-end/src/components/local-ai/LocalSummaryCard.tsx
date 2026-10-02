"use client";

import { useCallback, useEffect } from "react";

import { useLocalAI } from "@/hooks/useLocalAI";
import { useLocalSummary } from "@/hooks/useLocalSummary";
import { LOCAL_AI_DISCLAIMER, resumoDiaPrompt } from "@/lib/local-ai/summaries";
import type { ResultadoEscatologico } from "@/lib/types";

interface LocalSummaryCardProps {
  resultado: ResultadoEscatologico | null;
}

/** Resumo do resultado do dia (geração on-device — não mencionar na UI). */
export function LocalSummaryCard({ resultado }: LocalSummaryCardProps) {
  const { status } = useLocalAI();
  const input = resultado
    ? `${resultado.data_referencia}|${resultado.fase_atual}|${resultado.indice_global}|${resultado.ranking_mar[0]?.candidato_id ?? ""}`
    : "";
  const build = useCallback(
    () => (resultado ? resumoDiaPrompt(resultado) : []),
    [resultado],
  );
  const { text, generating, error, fromCache, generate } = useLocalSummary(
    "resumo-dia",
    input,
    build,
  );

  // Gera automaticamente quando o modelo fica pronto e há dados.
  useEffect(() => {
    if (status === "ready" && resultado && text === null && !generating && !error) {
      generate();
    }
  }, [status, resultado, text, generating, error, generate]);

  if (status !== "ready" || !resultado) return null;

  return (
    <section
      className="card-interactive border-violet-900/40"
      aria-labelledby="local-summary-title"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="local-summary-title" className="card-title">
          Resumo do dia
        </h2>
      </div>
      {generating && text === null && (
        <p className="mt-2 animate-pulse text-sm text-slate-500" role="status">
          Gerando resumo…
        </p>
      )}
      {text !== null && (
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-slate-500" role="alert">
          Não foi possível gerar o resumo.
        </p>
      )}
      {text !== null && (
        <p className="mt-3 text-[11px] text-slate-600">
          {LOCAL_AI_DISCLAIMER}
          {fromCache ? " · cache" : ""}
        </p>
      )}
    </section>
  );
}
