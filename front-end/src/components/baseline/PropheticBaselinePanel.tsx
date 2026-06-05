"use client";

import Link from "next/link";
import type {
  ArquivoProfeticoItem,
  BaselineAtualizacao,
  BaselineHistorico,
} from "@/lib/types";

interface PropheticBaselinePanelProps {
  baseline: BaselineHistorico | null;
  atualizacoes?: BaselineAtualizacao[];
  arquivo?: ArquivoProfeticoItem[];
  compact?: boolean;
  loading?: boolean;
  isMock?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  cumprida: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  parcial: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  pendente: "text-slate-400 border-ink-700 bg-ink-900/50",
  cumprida_parcial: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric-tile text-center">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="text-lg font-medium text-gold-400 tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function UpdateBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.pendente;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${cls}`}
      role="status"
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}

export function PropheticBaselinePanel({
  baseline,
  atualizacoes = [],
  arquivo = [],
  compact = false,
  loading = false,
  isMock = false,
}: PropheticBaselinePanelProps) {
  if (loading) {
    return (
      <div className="card-interactive animate-pulse p-6" role="status" aria-busy="true" aria-label="Carregando baseline profético">
        <div className="h-4 w-48 bg-ink-700 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-ink-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!baseline) return null;

  const stats = baseline.estatisticas;
  const taxaProf = ((stats.taxa_cumprimento_profecias ?? 0) * 100).toFixed(1);
  const taxaEvt = ((stats.taxa_cumprimento_eventos ?? 0) * 100).toFixed(1);
  const mergedUpdates = [
    ...atualizacoes,
    ...(baseline.atualizacoes ?? []).filter(
      (u) => !atualizacoes.some((a) => a.id === u.id),
    ),
  ].slice(0, compact ? 3 : 8);

  const cumpridas = arquivo.filter((a) => a.status === "cumprida");
  const sampleCumpridas = cumpridas.length
    ? cumpridas.slice(0, compact ? 4 : 8)
    : baseline.categorias
        .filter((c) => c.status === "cumprida" || c.status === "cumprida_parcial")
        .slice(0, compact ? 4 : 6)
        .map((c) => ({ id: c.id, titulo: c.titulo, status: "cumprida" as const, categoria: c.id, referencias: [] }));

  return (
    <section className="card-glow card-interactive space-y-5" aria-labelledby="baseline-panel-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400/80">
            Camada 0 · Baseline histórico
            {isMock && " · demo"}
          </p>
          <h2 id="baseline-panel-title" className="card-title mt-1">{baseline.overview.titulo}</h2>
          {!compact && (
            <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-3xl">
              {baseline.overview.resumo}
            </p>
          )}
        </div>
        <Link href="/profecias" className="btn-ghost text-xs shrink-0" aria-label="Ver arquivo profético completo">
          Ver arquivo completo →
        </Link>
      </div>

      <div
        className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"}`}
        role="group"
        aria-label="Estatísticas do baseline profético"
      >
        <StatTile label="Profecias" value={String(stats.total_profecias_biblicas)} sub="total bíblico" />
        <StatTile
          label="Cumpridas"
          value={String(stats.profecias_cumpridas)}
          sub={`${taxaProf}%`}
        />
        <StatTile label="Pendentes" value={String(stats.profecias_pendentes)} sub="escatológicas" />
        <StatTile
          label="Eventos"
          value={`${stats.eventos_cumpridos}/${stats.eventos_principais_mapeados}`}
          sub={`${taxaEvt}% cumpridos`}
        />
        {!compact && (
          <StatTile
            label="Marco zero"
            value={`${((baseline.marco_zero_deslocamento ?? 0) * 100).toFixed(1)}%`}
            sub="deslocamento"
          />
        )}
        {!compact && baseline.versao && (
          <StatTile label="Versão" value={baseline.versao} sub="seed auditável" />
        )}
      </div>

      {mergedUpdates.length > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4" aria-live="polite">
          <h3 className="text-xs uppercase tracking-[0.18em] text-violet-400 mb-3">
            Atualizações detectadas pelo motor
          </h3>
          <ul className="space-y-2" aria-label="Profecias recém detectadas como cumpridas ou parciais">
            {mergedUpdates.map((upd) => (
              <li
                key={upd.id}
                className="flex flex-wrap items-center gap-2 text-sm border-b border-ink-800/80 pb-2 last:border-0 last:pb-0"
              >
                <UpdateBadge status={upd.status_novo} />
                <span className="text-slate-200">{upd.titulo}</span>
                <span className="text-xs text-slate-500 ml-auto tabular-nums">
                  {upd.data_deteccao}
                  {upd.score_match != null && ` · match ${(upd.score_match * 100).toFixed(0)}%`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
              Categorias mapeadas
            </h3>
            <ul className="space-y-2 text-sm">
              {baseline.categorias.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"
                >
                  <span className="text-slate-300">{cat.titulo}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 tabular-nums">~{cat.eventos_estimados}</span>
                    <UpdateBadge status={cat.status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
              Amostra — já cumpridas
            </h3>
            <ul className="space-y-2 text-sm">
              {sampleCumpridas.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2 text-slate-300"
                >
                  {item.titulo}
                  {"periodo_cumprimento" in item && item.periodo_cumprimento && (
                    <span className="block text-[11px] text-slate-600 mt-0.5">
                      {item.periodo_cumprimento}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {compact && baseline.profecias_pendentes.length > 0 && (
        <p className="text-xs text-slate-500">
          <span className="text-amber-400/90">{stats.profecias_pendentes} pendentes</span>
          {" · "}
          ex.: {baseline.profecias_pendentes[0]?.titulo}
        </p>
      )}
    </section>
  );
}
