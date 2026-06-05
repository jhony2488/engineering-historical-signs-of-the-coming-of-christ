interface BeastScoresProps {
  bestaMar: number;
  bestaTerra: number;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white tabular-nums">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-3 rounded-full bg-ink-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function BeastScores({ bestaMar, bestaTerra }: BeastScoresProps) {
  return (
    <div className="card-interactive">
      <h2 className="card-title">Consolidação das Bestas</h2>
      <div className="space-y-5">
        <Bar
          label="Besta do Mar — controle político e financeiro"
          value={bestaMar}
          color="bg-blue-500/80"
        />
        <Bar
          label="Besta da Terra — narrativa e coerção cultural"
          value={bestaTerra}
          color="bg-purple-500/80"
        />
      </div>
    </div>
  );
}
