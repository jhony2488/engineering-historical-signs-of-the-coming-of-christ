interface BeastScoresProps {
  bestaMar: number;
  bestaTerra: number;
}

function Bar({ label, value, color, labelId }: { label: string; value: number; color: string; labelId: string }) {
  const pct = Math.min(100, Math.round(value * 1000) / 10);

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span id={labelId} className="text-slate-400">
          {label}
        </span>
        <span className="text-white tabular-nums">{pct.toFixed(1)}%</span>
      </div>
      <div
        className="h-3 rounded-full bg-ink-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby={labelId}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function BeastScores({ bestaMar, bestaTerra }: BeastScoresProps) {
  return (
    <section className="card-interactive" aria-labelledby="beast-scores-title">
      <h2 id="beast-scores-title" className="card-title">
        Consolidação das Bestas
      </h2>
      <div className="space-y-5">
        <Bar
          label="Besta do Mar — controle político e financeiro"
          value={bestaMar}
          color="bg-blue-500/80"
          labelId="beast-mar-label"
        />
        <Bar
          label="Besta da Terra — narrativa e coerção cultural"
          value={bestaTerra}
          color="bg-purple-500/80"
          labelId="beast-terra-label"
        />
      </div>
    </section>
  );
}
