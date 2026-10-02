"use client";

import { useCallback } from "react";

import { useLocalAI } from "@/hooks/useLocalAI";
import { useLocalSummary } from "@/hooks/useLocalSummary";
import { explicaCandidatoPrompt, LOCAL_AI_DISCLAIMER } from "@/lib/local-ai/summaries";
import type { RankingCandidato } from "@/lib/types";

interface CandidateExplainButtonProps {
  candidato: RankingCandidato;
}

/**
 * Botão por linha do ranking: expande explicação gerada por IA.
 * Invisível quando o engine não está pronto.
 */
export function CandidateExplainButton({ candidato }: CandidateExplainButtonProps) {
  const { status } = useLocalAI();
  const input = `${candidato.candidato_id}|${candidato.posicao}|${candidato.probabilidade_atual}|${candidato.tendencia_24h}`;
  const build = useCallback(() => explicaCandidatoPrompt(candidato), [candidato]);
  const { text, generating, error, generate } = useLocalSummary(
    "explica-candidato",
    input,
    build,
  );

  if (status !== "ready") return null;

  const expanded = text !== null || generating || error !== null;
  const panelId = `explain-${candidato.candidato_id}`;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={generate}
        disabled={generating}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="text-[11px] text-violet-400/80 underline-offset-2 hover:text-violet-300 hover:underline disabled:opacity-50"
      >
        {generating ? "Gerando…" : expanded ? "Explicação" : "Explicar"}
      </button>
      {expanded && (
        <p id={panelId} className="mt-1 text-xs leading-relaxed text-slate-400" aria-live="polite">
          {text}
          {error && "Não foi possível explicar agora."}
          {text && (
            <span className="mt-1 block text-[10px] text-slate-600">
              {LOCAL_AI_DISCLAIMER}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
