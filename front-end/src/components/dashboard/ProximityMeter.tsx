interface ProximityMeterProps {
  indice: number;
  confianca: number;
  posteriorBayes?: number;
}

export function ProximityMeter({ indice, confianca, posteriorBayes }: ProximityMeterProps) {
  const pct = Math.round(indice * 100);
  const rotation = (indice * 180) - 90;

  return (
    <div className="card-glow card-interactive">
      <h2 className="card-title">Medidor de Proximidade Espiritual</h2>
      <div className="flex flex-col items-center py-4">
        <div className="relative w-48 h-24 overflow-hidden">
          <div className="absolute inset-0 rounded-t-full border-[12px] border-ink-700 border-b-0" />
          <div
            className="absolute bottom-0 left-1/2 h-20 w-1 origin-bottom bg-gold-400 rounded-full transition-transform duration-700"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gold-500 border-2 border-ink-900" />
        </div>
        <p className="metric-value text-gold-400 mt-2">{pct}%</p>
        <p className="text-xs text-slate-500 mt-1">Índice global consolidado</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2 text-center text-xs">
        <div className="metric-tile">
          <p className="text-slate-500">Confiança</p>
          <p className="text-white font-medium tabular-nums">{(confianca * 100).toFixed(1)}%</p>
        </div>
        {posteriorBayes !== undefined && (
          <div className="metric-tile">
            <p className="text-slate-500">Bayes</p>
            <p className="text-white font-medium tabular-nums">{(posteriorBayes * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
