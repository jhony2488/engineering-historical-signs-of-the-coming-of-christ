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
    <div
      className={`card-interactive transition-colors duration-300 ${alerta ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-400/50" : "border-ink-700"}`}
    >
      <h2 className="card-title flex items-center gap-2">
        {alerta && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
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
        <div className="rounded bg-ink-800/60 py-2">
          <p className="text-slate-500">Incongruência</p>
          <p className="text-white font-medium">{(scoreIncongruencia * 100).toFixed(0)}%</p>
        </div>
        {scoreExpansao !== undefined && (
          <div className="rounded bg-ink-800/60 py-2">
            <p className="text-slate-500">Discurso</p>
            <p className="text-emerald-400 font-medium">{(scoreExpansao * 100).toFixed(0)}%</p>
          </div>
        )}
        {scoreContracao !== undefined && (
          <div className="rounded bg-ink-800/60 py-2">
            <p className="text-slate-500">Estrutura</p>
            <p className="text-red-400 font-medium">{(scoreContracao * 100).toFixed(0)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
