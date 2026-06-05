import type { SnapshotPeriodo } from "@/lib/types";

interface SynthesisPanelProps {
  snapshot: SnapshotPeriodo | null;
  hybrid: SnapshotPeriodo | null;
  loading?: boolean;
  motorLabel?: string;
}

function DeltaBlock({ dados }: { dados: Record<string, unknown> }) {
  const delta = dados.delta as Record<string, number | string> | undefined;
  if (!delta) return null;

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mt-4">
      <div>
        <dt className="text-slate-500">Índice início</dt>
        <dd className="text-gold-400 tabular-nums">
          {((delta.indice_inicio as number) * 100).toFixed(1)}%
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">Índice fim</dt>
        <dd className="text-gold-400 tabular-nums">
          {((delta.indice_fim as number) * 100).toFixed(1)}%
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">Variação</dt>
        <dd className="text-violet-400 tabular-nums">
          +{((delta.variacao_indice as number) * 100).toFixed(1)} pp
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">Fase início</dt>
        <dd className="text-slate-300">{(delta.fase_inicio as string).replace("FASE_", "")}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Fase fim</dt>
        <dd className="text-slate-300">{(delta.fase_fim as string).replace("FASE_", "")}</dd>
      </div>
    </dl>
  );
}

function HybridBlock({ dados }: { dados: Record<string, unknown> }) {
  const hibrida = dados.analise_hibrida as Record<string, unknown> | undefined;
  if (!hibrida) return null;

  const raciocinio = hibrida.raciocinio as Record<string, unknown> | undefined;
  const hermeneutica = hibrida.hermeneutica as Record<string, unknown> | undefined;

  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-slate-300 leading-relaxed">{hibrida.panorama as string}</p>
      {raciocinio && (
        <div className="rounded-lg bg-ink-800/60 border border-ink-700 p-3 text-xs space-y-2">
          <p className="text-violet-400">
            Fase emergente: {(raciocinio.fase_emergente as string).replace("FASE_", "")} ·
            convicção {(raciocinio.conviccao_panorama as number).toFixed(2)}
          </p>
          {(raciocinio.padroes_cruzados as string[] | undefined)?.map((p) => (
            <p key={p} className="text-slate-400">
              • {p}
            </p>
          ))}
        </div>
      )}
      {hermeneutica && (
        <p className="text-xs text-slate-500">
          Aderência profética: {((hermeneutica.aderencia_profetica as number) * 100).toFixed(0)}% ·{" "}
          {(hermeneutica.citacoes_rag as string[]).join(", ")}
        </p>
      )}
    </div>
  );
}

export function SynthesisPanel({
  snapshot,
  hybrid,
  loading,
  motorLabel,
}: SynthesisPanelProps) {
  if (loading) {
    return (
      <div className="card-interactive animate-pulse-soft">
        <p className="text-slate-500 text-sm">Carregando síntese do período…</p>
      </div>
    );
  }

  if (!snapshot && !hybrid) {
    return (
      <div className="card-interactive">
        <p className="text-slate-500 text-sm">
          Nenhum snapshot de síntese para esta janela. Execute o batch semanal/mensal ou o seed.
        </p>
      </div>
    );
  }

  const analise = snapshot?.dados.analise_ia as Record<string, unknown> | undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {snapshot && (
        <div className="card-interactive animate-fade-in-up">
          <p className="text-xs uppercase tracking-wider text-gold-400/70">Motor Nível 2</p>
          <h3 className="card-title mt-1">{snapshot.label ?? snapshot.janela}</h3>
          {motorLabel && <p className="text-xs text-slate-500 mb-2">{motorLabel}</p>}
          {analise && (
            <>
              <p className="text-sm text-slate-300">{analise.resumo as string}</p>
              {(analise.padroes as string[] | undefined)?.length ? (
                <ul className="mt-3 space-y-1 text-xs text-slate-400">
                  {(analise.padroes as string[]).map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
          <DeltaBlock dados={snapshot.dados} />
        </div>
      )}

      {hybrid && (
        <div className="card-interactive border-violet-900/40 animate-fade-in-up hover:border-violet-500/50 hover:shadow-[0_8px_32px_-8px_rgba(139,92,246,0.2)]" style={{ animationDelay: "100ms" }}>
          <p className="text-xs uppercase tracking-wider text-violet-400/80">Motor Nível 3</p>
          <h3 className="card-title mt-1">{hybrid.label ?? hybrid.janela}</h3>
          <p className="text-xs text-slate-500">Análise híbrida — panorama cruzado de sub-janelas</p>
          <HybridBlock dados={hybrid.dados} />
        </div>
      )}
    </div>
  );
}
