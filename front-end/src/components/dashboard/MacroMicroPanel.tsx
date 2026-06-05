interface MacroMicroPanelProps {
  macroRatio?: number;
  avgTension?: number;
  avgImpact?: number;
}

export function MacroMicroPanel({ macroRatio = 0.5, avgTension = 0, avgImpact = 0 }: MacroMicroPanelProps) {
  const microRatio = 1 - macroRatio;

  return (
    <div className="card-interactive">
      <h2 className="card-title">Análise Macro vs Micro</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
          <p className="text-xs text-slate-500 mb-1">Macro — Cenário Global</p>
          <p className="text-lg font-semibold text-white tabular-nums">{(macroRatio * 100).toFixed(0)}%</p>
          <p className="text-xs text-slate-500 mt-1">Geopolítica, tecnologia, cultura</p>
        </div>
        <div className="rounded-lg border border-ink-700 bg-ink-800/40 p-3">
          <p className="text-xs text-slate-500 mb-1">Micro — Cenário Local</p>
          <p className="text-lg font-semibold text-white tabular-nums">{(microRatio * 100).toFixed(0)}%</p>
          <p className="text-xs text-slate-500 mt-1">Espiritualidade, fidelidade, alertas</p>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-slate-400">
        <span>Tensão média: <strong className="text-slate-300">{(avgTension * 100).toFixed(0)}%</strong></span>
        <span>Impacto global: <strong className="text-slate-300">{(avgImpact * 100).toFixed(0)}%</strong></span>
      </div>
    </div>
  );
}
