"use client";

import { useLocalAI } from "@/hooks/useLocalAI";
import { formatBytes } from "@/lib/local-ai/models";

/**
 * Chip discreto no rodapé: progresso do download dos recursos de análise
 * ou card de opt-in quando a conexão é limitada. `null` fora desses estados.
 */
export function DownloadStatusChip() {
  const { status, progressPct, modelLabel, approxBytes, enableLocalAi } =
    useLocalAI();

  if (status === "opt_in_required") {
    return (
      <div
        role="dialog"
        aria-label="Ativar análises avançadas"
        className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg border border-ink-700 bg-ink-900/95 p-3 shadow-lg backdrop-blur"
      >
        <p className="text-xs text-slate-300">
          Ativar resumos e explicações automáticos
          {approxBytes ? ` (~${formatBytes(approxBytes)} de download único)` : ""}?
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={enableLocalAi}
            className="rounded bg-gold-500/20 px-3 py-1 text-xs font-medium text-gold-400 hover:bg-gold-500/30"
          >
            Ativar
          </button>
        </div>
      </div>
    );
  }

  if (status !== "downloading" && status !== "loading") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/95 px-3 py-1.5 text-xs text-slate-400 shadow-lg backdrop-blur"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold-400" aria-hidden="true" />
      {status === "downloading" ? (
        <span>
          Preparando análises{modelLabel ? ` · ${modelLabel}` : ""} ·{" "}
          {progressPct !== null ? `${progressPct}%` : "…"}
        </span>
      ) : (
        <span>Carregando análises{modelLabel ? ` · ${modelLabel}` : ""}…</span>
      )}
    </div>
  );
}
