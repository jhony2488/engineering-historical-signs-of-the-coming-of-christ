import clsx from "clsx";
import { FASES, getFase } from "@/lib/phases";
import type { FaseId, TransicaoFase } from "@/lib/types";

interface PhaseTimelineProps {
  faseAtual: FaseId;
  probabilidade: number;
  distribuicaoHmm?: Record<string, number>;
  transicao?: TransicaoFase;
  faseScores?: Record<string, number>;
}

export function PhaseTimeline({
  faseAtual,
  probabilidade,
  distribuicaoHmm,
  transicao,
  faseScores,
}: PhaseTimelineProps) {
  const atual = getFase(faseAtual);
  const emTransicao = transicao?.transicao_entre_fases ?? false;

  const isHighlighted = (faseId: FaseId) => {
    if (!emTransicao) return faseId === faseAtual;
    return (
      faseId === transicao?.fase_dominante || faseId === transicao?.fase_secundaria
    );
  };

  const isDominante = (faseId: FaseId) =>
    emTransicao && faseId === transicao?.fase_dominante;
  const isSecundaria = (faseId: FaseId) =>
    emTransicao && faseId === transicao?.fase_secundaria;

  return (
    <section className="card-interactive" aria-labelledby="phase-timeline-title">
      <h2 id="phase-timeline-title" className="card-title">Linha do Tempo Escatológica</h2>
      {emTransicao ? (
        <p className="text-sm text-violet-300/90 mb-6">
          <span className="font-medium">Transição ativa</span> entre{" "}
          <span className="text-gold-400">{getFase(transicao!.fase_dominante).titulo}</span>
          {" e "}
          <span className="text-violet-300">{getFase(transicao!.fase_secundaria).titulo}</span>
          {" — margem de "}
          {(transicao!.margem_fases * 100).toFixed(1)}%
        </p>
      ) : (
        <p className="text-sm text-slate-400 mb-6">
          Fase ativa: <span className="text-gold-400 font-medium">{atual.titulo}</span> —{" "}
          {(probabilidade * 100).toFixed(1)}% de convicção
        </p>
      )}

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative list-none p-0 m-0" aria-label="Fases escatológicas">
        {FASES.map((fase, idx) => {
          const highlighted = isHighlighted(fase.id);
          const hmmProb = distribuicaoHmm?.[fase.id];
          const consolidated = faseScores?.[fase.id];
          const showBridge =
            emTransicao &&
            fase.id === transicao?.fase_dominante &&
            idx < FASES.length - 1 &&
            FASES[idx + 1]?.id === transicao?.fase_secundaria;

          return (
            <li
              key={fase.id}
              className="relative"
              aria-current={highlighted ? "step" : undefined}
              aria-label={`${fase.titulo}${isDominante(fase.id) ? ", fase dominante" : ""}${isSecundaria(fase.id) ? ", fase secundária" : ""}`}
            >
              <div
                className={clsx(
                  "rounded-lg border p-4 transition-all h-full",
                  isDominante(fase.id) &&
                    "border-gold-500/60 bg-gold-500/10 ring-1 ring-gold-500/30",
                  isSecundaria(fase.id) &&
                    "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/25",
                  highlighted && !isDominante(fase.id) && !isSecundaria(fase.id) &&
                    "border-signal-phase/60 bg-signal-phase/10",
                  !highlighted && "border-ink-700 bg-ink-800",
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={clsx(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      isDominante(fase.id) && "bg-gold-500 text-ink-950",
                      isSecundaria(fase.id) && "bg-violet-500 text-white",
                      highlighted && !emTransicao && "bg-signal-phase text-ink-950",
                      !highlighted && "bg-ink-700 text-slate-400",
                    )}
                  >
                    {fase.index}
                  </span>
                  <span
                    className={clsx(
                      "text-xs font-medium",
                      highlighted ? "text-white" : "text-slate-500",
                    )}
                  >
                    {fase.subtitulo}
                    {isDominante(fase.id) && " · dominante"}
                    {isSecundaria(fase.id) && " · próxima"}
                  </span>
                </div>
                <h3
                  className={clsx(
                    "text-sm font-semibold mb-1",
                    highlighted ? "text-white" : "text-slate-400",
                  )}
                >
                  {fase.titulo}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                  {fase.descricao}
                </p>
                <div className="mt-2 space-y-0.5">
                  {consolidated !== undefined && (
                    <p className="text-xs text-slate-400 tabular-nums">
                      Score: <span className="text-white">{(consolidated * 100).toFixed(0)}%</span>
                    </p>
                  )}
                  {hmmProb !== undefined && (
                    <p className="text-xs text-slate-500 tabular-nums">
                      HMM: {(hmmProb * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>
              {showBridge && (
                <div
                  className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-gold-500 to-violet-500 z-10"
                  title="Zona de transição"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
