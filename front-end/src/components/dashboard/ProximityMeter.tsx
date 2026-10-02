interface ProximityMeterProps {
  /** Preferir proximidade_espiritual; fallback = indice_global */
  proximidade?: number;
  indice: number;
  confianca: number;
  posteriorBayes?: number;
  convergenciaDimensao?: number;
  convergenciaEnergia?: number;
  descricao?: string;
}

export function ProximityMeter({
  proximidade,
  indice,
  confianca,
  posteriorBayes,
  convergenciaDimensao,
  convergenciaEnergia,
  descricao,
}: ProximityMeterProps) {
  const score = proximidade ?? indice;
  const pct = Math.round(score * 100);
  const rotation = score * 180 - 90;
  const usingDedicated = proximidade !== undefined;

  return (
    <section className="card-glow card-interactive group" aria-labelledby="proximity-meter-title">
      <h2 id="proximity-meter-title" className="card-title">
        Medidor de Proximidade Espiritual
      </h2>
      <div className="flex flex-col items-center py-4">
        <div
          className="relative w-48 h-24 overflow-hidden transition-transform duration-300 group-hover:scale-[1.01]"
          role="img"
          aria-label={`Proximidade espiritual em ${pct} por cento`}
        >
          <div
            className="absolute inset-0 rounded-t-full border-[12px] border-ink-700 border-b-0 shadow-[0_0_0_1px_rgba(96,165,250,0.05)_inset]"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-1/2 h-20 w-1 origin-bottom rounded-full bg-gradient-to-t from-gold-400 via-signal-phase to-cyan-300 transition-transform duration-700"
            style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-ink-900 bg-gold-500 shadow-[0_0_14px_rgba(212,168,83,0.35)]"
            aria-hidden="true"
          />
        </div>
        <p className="metric-value text-gold-400 mt-2" aria-hidden="true">
          {pct}%
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {usingDedicated ? "Convergência Macro/Micro × Expansão/Contração" : "Índice global (legado)"}
        </p>
        {descricao && <p className="text-xs text-slate-400 mt-2 text-center max-w-xs">{descricao}</p>}
        <div
          className="sr-only"
          role="meter"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Proximidade espiritual"
        />
      </div>
      <dl className="grid grid-cols-2 gap-3 mt-2 text-center text-xs">
        <div className="metric-tile">
          <dt className="text-slate-500">Confiança</dt>
          <dd className="text-white font-medium tabular-nums">{(confianca * 100).toFixed(1)}%</dd>
        </div>
        {posteriorBayes !== undefined && (
          <div className="metric-tile">
            <dt className="text-slate-500">Bayes</dt>
            <dd className="text-white font-medium tabular-nums">{(posteriorBayes * 100).toFixed(1)}%</dd>
          </div>
        )}
        {convergenciaDimensao !== undefined && (
          <div className="metric-tile">
            <dt className="text-slate-500">Macro∩Micro</dt>
            <dd className="text-white font-medium tabular-nums">
              {(convergenciaDimensao * 100).toFixed(0)}%
            </dd>
          </div>
        )}
        {convergenciaEnergia !== undefined && (
          <div className="metric-tile">
            <dt className="text-slate-500">Exp∩Contr</dt>
            <dd className="text-white font-medium tabular-nums">
              {(convergenciaEnergia * 100).toFixed(0)}%
            </dd>
          </div>
        )}
        <div className="metric-tile col-span-2">
          <dt className="text-slate-500">Índice global</dt>
          <dd className="text-white font-medium tabular-nums">{(indice * 100).toFixed(1)}%</dd>
        </div>
      </dl>
    </section>
  );
}
