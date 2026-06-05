interface FalseLeaderAlertProps {
  alerta: boolean;
  scoreIncongruencia: number;
  justificativa?: string;
  scoreExpansao?: number;
  scoreContracao?: number;
}

export function FalseLeaderAlert({
  alerta,
  scoreIncongruencia,
  justificativa,
  scoreExpansao,
  scoreContracao,
}: FalseLeaderAlertProps) {
  return (
    <section
      className={`card-interactive card-glow transition-colors duration-300 ${alerta ? "border-amber-500/40 bg-amber-950 hover:border-amber-400/50" : "border-ink-700"}`}
      aria-labelledby="false-leader-title"
      role={alerta ? "alert" : "region"}
      aria-live={alerta ? "polite" : undefined}
    >
      <h2 id="false-leader-title" className="card-title flex items-center gap-2">
        {alerta && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.45)]" aria-hidden="true" />}
        Cenário do Falso Líder
      </h2>
      {alerta ? (
        <p className="text-sm text-amber-200/90 mb-3">
          Alerta de engano sistêmico — divergência entre discurso e estrutura de controle.
        </p>
      ) : (
        <p className="text-sm text-slate-400 mb-3">Sem alerta de falso líder neste ciclo.</p>
      )}
      <p className="text-xs text-slate-500 mb-4">{justificativa}</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded border border-ink-700/60 bg-ink-800/80 py-2 transition-transform duration-200 hover:-translate-y-0.5 hover:border-signal-phase/30">
          <p className="text-slate-500">Incongruência</p>
          <p className="text-white font-medium">{(scoreIncongruencia * 100).toFixed(0)}%</p>
        </div>
        {scoreExpansao !== undefined && (
          <div className="rounded border border-ink-700/60 bg-ink-800/80 py-2 transition-transform duration-200 hover:-translate-y-0.5 hover:border-emerald-400/30">
            <p className="text-slate-500">Discurso</p>
            <p className="text-emerald-400 font-medium">{(scoreExpansao * 100).toFixed(0)}%</p>
          </div>
        )}
        {scoreContracao !== undefined && (
          <div className="rounded border border-ink-700/60 bg-ink-800/80 py-2 transition-transform duration-200 hover:-translate-y-0.5 hover:border-red-400/30">
            <p className="text-slate-500">Estrutura</p>
            <p className="text-red-400 font-medium">{(scoreContracao * 100).toFixed(0)}%</p>
          </div>
        )}
      </div>
    </section>
  );
}
