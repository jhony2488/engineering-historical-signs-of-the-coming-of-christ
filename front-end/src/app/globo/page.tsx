"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Header } from "@/components/ui/Header";
import { fetchAmeacaDetail, fetchAmeacasPaises, fetchProvenanceDay } from "@/lib/api";
import type {
  AmeacaPais,
  AmeacaPaisDetail,
  HistoricalEchoMatch,
  ProvenanceDayResponse,
} from "@/lib/types";

const ThreatGlobe = dynamic(
  () => import("@/components/globo/ThreatGlobe").then((m) => m.ThreatGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,640px)] items-center justify-center rounded-lg border border-ink-700/50 bg-ink-950/40">
        <p className="text-sm text-slate-500">Carregando globo…</p>
      </div>
    ),
  },
);

function riskColor(score: number): string {
  if (score >= 0.7) return "text-red-400";
  if (score >= 0.45) return "text-amber-400";
  return "text-emerald-400";
}

function CountryDrawer({
  detail,
  onClose,
  loading,
  onVerify,
  verifyLoading,
  verifyResult,
}: {
  detail: AmeacaPaisDetail | null;
  onClose: () => void;
  loading: boolean;
  onVerify: () => void;
  verifyLoading: boolean;
  verifyResult: ProvenanceDayResponse | null;
}) {
  if (!detail && !loading) return null;
  const ameaca = detail?.ameaca;
  const echo = (ameaca?.historical_echo || {}) as HistoricalEchoMatch;
  const metrics = ameaca?.metrics ?? {};
  const prescriptions = ameaca?.prescriptions ?? {};
  const adv = detail?.adversarial;
  const recs = detail?.recomendacoes ?? [];
  const prov = detail?.provenance;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-ink-700/70 bg-ink-950/95 shadow-2xl backdrop-blur-xl animate-fade-in-up"
      role="dialog"
      aria-label="Detalhe do país"
    >
      <div className="flex items-start justify-between gap-3 border-b border-ink-700/60 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold-400/80">Ameaça por país</p>
          <h2 className="font-display text-xl text-white">
            {loading ? "Carregando…" : ameaca?.country_name}
          </h2>
          {ameaca && (
            <p className={`mt-1 text-sm font-medium ${riskColor(ameaca.risk_score)}`}>
              Risco {(ameaca.risk_score * 100).toFixed(0)}%
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-ink-600 px-2 py-1 text-xs text-slate-400 hover:text-white"
          aria-label="Fechar painel"
        >
          Fechar
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm text-slate-300">
        {loading && <p className="text-slate-500">Buscando L10–L15…</p>}

        {ameaca && (
          <>
            <section>
              <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                Métricas (L10)
              </h3>
              <ul className="space-y-1.5">
                {Object.entries(metrics).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span className="text-slate-400">{k.replaceAll("_", " ")}</span>
                    <span className="tabular-nums text-slate-200">
                      {typeof v === "number" ? (v * 100).toFixed(0) + "%" : String(v)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {echo.titulo && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Eco histórico (L11)
                </h3>
                <p className="text-gold-200/90">{echo.titulo}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Similaridade {echo.similarity_percentage?.toFixed(0)}% · {echo.pattern_phase}
                </p>
                {echo.projected_cycle_duration && (
                  <p className="mt-1 text-xs text-slate-500">
                    Ciclo projetado: {echo.projected_cycle_duration.min_months}–
                    {echo.projected_cycle_duration.max_months} meses
                  </p>
                )}
              </section>
            )}

            {detail?.abm && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Simulação ABM (L12)
                </h3>
                <p className="text-xs text-slate-400">
                  Fragilidade{" "}
                  <span className="tabular-nums text-slate-200">
                    {((detail.abm.fragility_index ?? 0) * 100).toFixed(0)}%
                  </span>
                  {detail.abm.runs != null && (
                    <span className="text-slate-500">
                      {" "}
                      · {detail.abm.runs} runs × {detail.abm.horizon_months ?? 24} meses
                    </span>
                  )}
                </p>
                {detail.abm.probabilistic_outcomes && (
                  <ul className="mt-2 space-y-1.5">
                    {Object.entries(detail.abm.probabilistic_outcomes).map(([k, v]) => (
                      <li key={k}>
                        <div className="mb-0.5 flex justify-between text-xs">
                          <span className="text-slate-400">{k.replaceAll("_", " ")}</span>
                          <span className="tabular-nums text-slate-200">
                            {(v * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded bg-ink-800">
                          <div
                            className="h-full rounded bg-cyan-600/70"
                            style={{ width: `${Math.min(100, Math.max(0, v * 100))}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {Array.isArray(detail.abm.critical_trigger_points) &&
                  detail.abm.critical_trigger_points.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Gatilhos críticos (mês):{" "}
                      {detail.abm.critical_trigger_points.slice(0, 3).join(", ")}
                    </p>
                  )}
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Distribuição probabilística — a moda não é previsão determinística.
                </p>
              </section>
            )}

            {ameaca.joshua && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Joshua Project
                </h3>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li className="flex justify-between">
                    <span>Escala média</span>
                    <span className="text-slate-200">
                      {ameaca.joshua.avg_joshua_scale?.toFixed(1) ?? "—"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Expansão</span>
                    <span className="text-emerald-300">
                      {((ameaca.joshua.expansion_score ?? 0) * 100).toFixed(0)}%
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Contração</span>
                    <span className="text-amber-300">
                      {((ameaca.joshua.contraction_score ?? 0) * 100).toFixed(0)}%
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Povos</span>
                    <span className="text-slate-200">{ameaca.joshua.peoples_count ?? 0}</span>
                  </li>
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                Prescrições
              </h3>
              {(["physical", "financial", "spiritual"] as const).map((axis) => (
                <div key={axis} className="mb-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">{axis}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
                    {(prescriptions[axis] ?? []).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {recs.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Triggers adaptativos (L15)
                </h3>
                {recs.map((r, i) => (
                  <div
                    key={`${r.country_code}-${i}`}
                    className="mb-2 rounded border border-ink-700/60 bg-ink-900/40 px-3 py-2"
                  >
                    <p className="text-xs uppercase tracking-wider text-amber-400/90">
                      Urgência: {r.urgency}
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-xs text-slate-400">
                      {(r.actions ?? []).slice(0, 3).map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {adv && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                  Validação adversarial (L13)
                </h3>
                {adv.resilience_score != null && (
                  <p className="text-xs text-slate-400">
                    Resiliência{" "}
                    <span
                      className={
                        adv.resilience_score < 0.5 ? "text-amber-300" : "text-emerald-300"
                      }
                    >
                      {(adv.resilience_score * 100).toFixed(0)}%
                    </span>
                  </p>
                )}
                {(adv.counter_thesis || adv.counter_hypothesis || adv.interpretation) && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {adv.counter_thesis || adv.counter_hypothesis || adv.interpretation}
                  </p>
                )}
                {adv.fragile_premises && adv.fragile_premises.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-400">
                    {adv.fragile_premises.slice(0, 4).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
                {adv.recommendation && (
                  <p className="mt-2 text-[11px] text-slate-500">{adv.recommendation}</p>
                )}
              </section>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {adv?.resilience_score != null && (
                <span
                  className={`rounded border px-2 py-1 text-[11px] uppercase tracking-wider ${
                    adv.resilience_score < 0.5
                      ? "border-amber-500/40 text-amber-300"
                      : "border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  Resiliência L13 {(adv.resilience_score * 100).toFixed(0)}%
                </span>
              )}
              {prov?.integrity_ok && (
                <span className="rounded border border-cyan-500/40 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-300">
                  Integridade L14
                </span>
              )}
              <button
                type="button"
                onClick={onVerify}
                disabled={verifyLoading}
                className="rounded border border-ink-600 px-2 py-1 text-[11px] uppercase tracking-wider text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200 disabled:opacity-50"
              >
                {verifyLoading ? "Verificando…" : "Verificar integridade"}
              </button>
            </div>

            {verifyResult && (
              <section className="rounded border border-ink-700/60 bg-ink-900/50 px-3 py-2 text-xs">
                <p
                  className={
                    verifyResult.verification.ok ? "text-emerald-300" : "text-amber-300"
                  }
                >
                  {verifyResult.verification.ok
                    ? "Cadeia de custódia OK"
                    : `Falha: ${verifyResult.verification.reason ?? "integridade comprometida"}`}
                </p>
                <p className="mt-1 text-slate-500">
                  Estágios: {verifyResult.verification.stages ?? verifyResult.entries.length}
                  {verifyResult.verification.merkle_root
                    ? ` · Merkle ${verifyResult.verification.merkle_root.slice(0, 12)}…`
                    : ""}
                </p>
                <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto text-slate-400">
                  {verifyResult.entries.slice(0, 12).map((e, i) => (
                    <li key={`${e.stage}-${i}`}>
                      {e.stage}: {(e.result_hash || e.source_hash || "").slice(0, 10)}…
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

export default function GloboPage() {
  const [ameacas, setAmeacas] = useState<AmeacaPais[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AmeacaPaisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ProvenanceDayResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAmeacasPaises().then((res) => {
      if (cancelled) return;
      setAmeacas(res.data);
      setIsMock(res.isMock);
      setFromCache(res.fromCache);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSelect = useCallback(async (code: string) => {
    setSelected(code);
    setDetailLoading(true);
    setVerifyResult(null);
    const res = await fetchAmeacaDetail(code);
    setDetail(res.data);
    setDetailLoading(false);
  }, []);

  const onVerify = useCallback(async () => {
    const day =
      detail?.ameaca.data_referencia ||
      ameacas[0]?.data_referencia ||
      new Date().toISOString().split("T")[0];
    setVerifyLoading(true);
    const res = await fetchProvenanceDay(day);
    setVerifyResult(res.data);
    setVerifyLoading(false);
  }, [detail, ameacas]);

  const points = useMemo(
    () =>
      ameacas
        .filter((a) => typeof a.lat === "number" && typeof a.lng === "number")
        .map((a) => ({
          lat: a.lat as number,
          lng: a.lng as number,
          size: 0.35 + a.risk_score * 0.9,
          color:
            a.risk_score >= 0.7 ? "#ef4444" : a.risk_score >= 0.45 ? "#f59e0b" : "#34d399",
          country_code: a.country_code,
          country_name: a.country_name,
          risk_score: a.risk_score,
        })),
    [ameacas],
  );

  return (
    <>
      <Header isMock={isMock} fromCache={fromCache} />
      <main id="main-content" className="page-main relative">
        <header className="page-hero mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-400/80">Camadas 10–15</p>
          <h1 className="page-title mt-1">Mapa de Ameaças</h1>
          <p className="page-subtitle mt-1 max-w-2xl text-sm">
            Globo com heatmap de risco por país. Clique para ver ecos históricos, prescrições e
            triggers adaptativos.
          </p>
          <Link href="/" className="mt-3 inline-block text-xs text-cyan-400/80 hover:text-cyan-300">
            ← Voltar ao painel
          </Link>
        </header>

        {loading ? (
          <p className="text-slate-500" role="status">
            Carregando ameaças…
          </p>
        ) : (
          <ThreatGlobe
            points={points}
            selectedCode={selected}
            onSelectCountry={onSelect}
          />
        )}

        {(selected || detailLoading) && (
          <CountryDrawer
            detail={detail}
            loading={detailLoading}
            onVerify={onVerify}
            verifyLoading={verifyLoading}
            verifyResult={verifyResult}
            onClose={() => {
              setSelected(null);
              setDetail(null);
              setVerifyResult(null);
            }}
          />
        )}
      </main>
    </>
  );
}
