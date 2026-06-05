"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LoadingDots } from "@/components/ui/LoadingDots";
import type { AnalyticsSummary } from "@/lib/analytics/ga-data";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card-interactive p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="font-display text-3xl text-white mt-2">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-2">{hint}</p>}
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
        ok
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`} />
      {label}
    </span>
  );
}

export function InsightsDashboard() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AnalyticsSummary;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate-400 py-12">
        <LoadingDots />
        <span>Carregando métricas…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-interactive p-6 text-rose-300">
        Não foi possível carregar os insights: {error ?? "dados indisponíveis"}
      </div>
    );
  }

  const hasMetrics = data.daily.length > 0 || data.totals.pageViews > 0;

  return (
    <div className="space-y-8 stagger-children">
      <section className="flex flex-wrap gap-3">
        <StatusPill
          ok={data.configured.measurementId}
          label={
            data.configured.measurementId
              ? `GA4 ativo (${data.measurementId})`
              : "GA4 não configurado"
          }
        />
        <StatusPill
          ok={data.configured.dataApi}
          label={
            data.configured.dataApi
              ? `Data API (${data.propertyId})`
              : "Data API não configurada"
          }
        />
      </section>

      {data.error && (
        <div className="card-interactive border-amber-500/30 p-5 text-amber-200 text-sm">
          Erro na consulta GA4: {data.error}
        </div>
      )}

      {!data.configured.measurementId && (
        <div className="card-interactive p-6 space-y-3 text-sm text-slate-300">
          <p className="text-white font-medium">1. Rastreamento nas páginas públicas</p>
          <p>
            Crie uma propriedade gratuita em{" "}
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:underline"
            >
              Google Analytics
            </a>{" "}
            e defina <code className="text-gold-300">NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX</code>{" "}
            no ambiente. O tag só carrega em <strong>/</strong> e <strong>/rankings</strong>.
          </p>
        </div>
      )}

      {!data.configured.dataApi && (
        <div className="card-interactive p-6 space-y-3 text-sm text-slate-300">
          <p className="text-white font-medium">2. Insights nesta página (opcional)</p>
          <ol className="list-decimal list-inside space-y-2 text-slate-400">
            <li>Ative a Google Analytics Data API no Google Cloud</li>
            <li>Crie uma service account e baixe a chave JSON</li>
            <li>
              Em GA4 → Admin → Acesso à propriedade, adicione o e-mail da service account como
              Leitor
            </li>
            <li>
              Configure <code className="text-gold-300">GA_PROPERTY_ID</code>,{" "}
              <code className="text-gold-300">GA_CLIENT_EMAIL</code> e{" "}
              <code className="text-gold-300">GA_PRIVATE_KEY</code>
            </li>
          </ol>
          <p>
            Enquanto isso, use o{" "}
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:underline"
            >
              painel oficial do GA4
            </a>
            .
          </p>
        </div>
      )}

      {hasMetrics && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Usuários ativos"
              value={data.totals.activeUsers.toLocaleString("pt-BR")}
              hint={`Últimos ${data.periodDays} dias`}
            />
            <MetricCard
              label="Visualizações"
              value={data.totals.pageViews.toLocaleString("pt-BR")}
              hint="Páginas públicas rastreadas"
            />
            <MetricCard
              label="Sessões"
              value={data.totals.sessions.toLocaleString("pt-BR")}
              hint="Visitas ao site"
            />
          </section>

          {data.daily.length > 0 && (
            <section className="card-interactive p-5">
              <h3 className="text-sm uppercase tracking-[0.15em] text-slate-500 mb-4">
                Visualizações por dia
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9a227" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3142" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
                    <Tooltip
                      contentStyle={{
                        background: "#11141c",
                        border: "1px solid #2a3142",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pageViews"
                      name="Visualizações"
                      stroke="#c9a227"
                      fill="url(#viewsGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {data.topPages.length > 0 && (
            <section className="card-interactive overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-700/60">
                <h3 className="text-sm uppercase tracking-[0.15em] text-slate-500">
                  Páginas mais visitadas
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-ink-700/40">
                    <th className="px-5 py-3 font-medium">Caminho</th>
                    <th className="px-5 py-3 font-medium text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((page) => (
                    <tr
                      key={page.path}
                      className="border-b border-ink-700/30 hover:bg-ink-800/40 transition-colors"
                    >
                      <td className="px-5 py-3 text-slate-200 font-mono text-xs">{page.path}</td>
                      <td className="px-5 py-3 text-right text-gold-300">
                        {page.views.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <p className="text-xs text-slate-600">
            Atualizado em {new Date(data.fetchedAt).toLocaleString("pt-BR")} · Google Analytics 4
            (plano gratuito)
          </p>
        </>
      )}
    </div>
  );
}
