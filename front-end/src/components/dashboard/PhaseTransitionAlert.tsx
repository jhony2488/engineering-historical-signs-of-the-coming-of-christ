import { getFase } from "@/lib/phases";
import type { TransicaoFase } from "@/lib/types";

interface PhaseTransitionAlertProps {
  transicao: TransicaoFase;
}

export function PhaseTransitionAlert({ transicao }: PhaseTransitionAlertProps) {
  if (!transicao.transicao_entre_fases) return null;

  const dom = getFase(transicao.fase_dominante);
  const sec = getFase(transicao.fase_secundaria);

  return (
    <div className="card-interactive border-violet-500/40 bg-violet-500/5 animate-glow-pulse hover:border-violet-400/50">
      <h2 className="card-title flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
        Zona de Transição entre Fases
      </h2>
      <p className="text-sm text-violet-200/90 mb-4">
        O sistema detectou proximidade estatística entre duas eras adjacentes — a humanidade
        não está firmemente em uma única fase.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-4">
        <div className="flex-1 rounded-lg border border-signal-phase/40 bg-signal-phase/10 p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Mais próxima</p>
          <p className="text-sm font-semibold text-white">{dom.titulo}</p>
          <p className="text-lg font-bold text-gold-400 tabular-nums mt-1">
            {(transicao.pontuacao_dominante * 100).toFixed(1)}%
          </p>
        </div>

        <div className="flex items-center justify-center px-2">
          <div className="flex flex-col items-center gap-1">
            <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-signal-phase via-violet-400 to-violet-500" />
            <span className="text-xs text-violet-400 font-medium">
              Δ {(transicao.margem_fases * 100).toFixed(1)}%
            </span>
            <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-violet-500 via-violet-400 to-violet-400/60" />
          </div>
        </div>

        <div className="flex-1 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Segunda mais próxima</p>
          <p className="text-sm font-semibold text-white">{sec.titulo}</p>
          <p className="text-lg font-bold text-violet-300 tabular-nums mt-1">
            {(transicao.pontuacao_secundaria * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{transicao.descricao}</p>
      <p className="text-xs text-slate-600 mt-2 tabular-nums">
        Proximidade relativa: {(transicao.proximidade_secundaria * 100).toFixed(0)}% da fase dominante
      </p>
    </div>
  );
}
