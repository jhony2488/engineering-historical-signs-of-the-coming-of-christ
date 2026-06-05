import type { ResultadoEscatologico } from "@/lib/types";

interface InterpretationPanelProps {
  interpretacao?: ResultadoEscatologico["interpretacao"];
}

export function InterpretationPanel({ interpretacao }: InterpretationPanelProps) {
  if (!interpretacao) return null;

  return (
    <div className="card-interactive">
      <h2 className="card-title">Interpretação Hermenêutica</h2>
      {interpretacao.aderencia_profetica !== undefined && (
        <p className="text-sm mb-4">
          Aderência profética:{" "}
          <span className="text-gold-400 font-medium tabular-nums">
            {(interpretacao.aderencia_profetica * 100).toFixed(0)}%
          </span>
        </p>
      )}
      {interpretacao.similaridades && interpretacao.similaridades.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1">Similaridades</p>
          <ul className="text-sm text-slate-300 list-disc list-inside">
            {interpretacao.similaridades.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {interpretacao.divergencias && interpretacao.divergencias.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1">Divergências</p>
          <ul className="text-sm text-slate-400 list-disc list-inside">
            {interpretacao.divergencias.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {interpretacao.citacoes && interpretacao.citacoes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {interpretacao.citacoes.map((c) => (
            <span
              key={c}
              className="rounded bg-ink-800 px-2 py-1 text-xs text-gold-400/90 border border-gold-500/20"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
