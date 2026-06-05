"use client";

import { useCallback, useEffect, useState } from "react";
import { PropheticBaselinePanel } from "@/components/baseline/PropheticBaselinePanel";
import { BeastScores } from "./BeastScores";
import { EnergyPanel } from "./EnergyPanel";
import { EventsList } from "./EventsList";
import { FalseLeaderAlert } from "./FalseLeaderAlert";
import { InterpretationPanel } from "./InterpretationPanel";
import { MacroMicroPanel } from "./MacroMicroPanel";
import { PhaseTimeline } from "./PhaseTimeline";
import { PhaseTransitionAlert } from "./PhaseTransitionAlert";
import { ProximityMeter } from "./ProximityMeter";
import { RankingTable } from "./RankingTable";
import { ConvictionChart } from "@/components/charts/ConvictionChart";
import { Header } from "@/components/ui/Header";
import {
  fetchBaselineAtualizacoesSWR,
  fetchBaselineHistoricoSWR,
  fetchHistorico,
  fetchRanking,
  fetchRankingSWR,
  fetchResultadoAtual,
  fetchResultadoAtualSWR,
  getDataSource,
} from "@/lib/api";
import type {
  BaselineAtualizacao,
  BaselineHistorico,
  RankingCandidato,
  ResultadoEscatologico,
} from "@/lib/types";

export function DashboardClient() {
  const [resultado, setResultado] = useState<ResultadoEscatologico | null>(null);
  const [historico, setHistorico] = useState<ResultadoEscatologico[]>([]);
  const [loading, setLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [dataSource, setDataSource] = useState<"db" | "fastapi">(getDataSource());
  const [rankingMar, setRankingMar] = useState<RankingCandidato[]>([]);
  const [rankingTerra, setRankingTerra] = useState<RankingCandidato[]>([]);
  const [baseline, setBaseline] = useState<BaselineHistorico | null>(null);
  const [baselineUpdates, setBaselineUpdates] = useState<BaselineAtualizacao[]>([]);
  const [baselineLoading, setBaselineLoading] = useState(true);
  const [baselineMock, setBaselineMock] = useState(false);

  const refresh = useCallback(async (skipCache = false) => {
    if (!skipCache && !resultado) setLoading(true);
    if (skipCache) setRevalidating(true);

    try {
      const [atual, hist] = await Promise.all([
        fetchResultadoAtual({ skipCache }),
        fetchHistorico(undefined, 30, { skipCache }),
      ]);
      setResultado(atual.data);
      setHistorico(hist.data);
      setFromCache(atual.fromCache && !skipCache);
      setIsMock(atual.isMock || hist.isMock);
      setDataSource(atual.source);
    } finally {
      setLoading(false);
      setRevalidating(false);
    }
  }, [resultado]);

  useEffect(() => {
    let cancelled = false;

    fetchResultadoAtualSWR().then(async (atual) => {
      if (cancelled) return;
      setResultado(atual.data);
      setFromCache(atual.fromCache);
      setIsMock(atual.isMock);
      setDataSource(atual.source);
      setLoading(false);

      if (atual.revalidating) {
        setRevalidating(true);
        const [fresh, hist] = await Promise.all([
          fetchResultadoAtual({ skipCache: true }),
          fetchHistorico(undefined, 30, { skipCache: true }),
        ]);
        if (!cancelled) {
          setResultado(fresh.data);
          setHistorico(hist.data);
          setFromCache(false);
          setRevalidating(false);
        }
      }
    });

    fetchHistorico(undefined, 30).then((hist) => {
      if (!cancelled) setHistorico(hist.data);
    });

    Promise.all([fetchBaselineHistoricoSWR(), fetchBaselineAtualizacoesSWR(5)]).then(
      ([hist, upd]) => {
        if (cancelled) return;
        setBaseline(hist.data);
        setBaselineUpdates(upd.data);
        setBaselineMock(hist.isMock);
        setBaselineLoading(false);
        if (hist.revalidating || upd.revalidating) {
          Promise.all([
            fetchBaselineHistoricoSWR(),
            fetchBaselineAtualizacoesSWR(5),
          ]).then(([freshHist, freshUpd]) => {
            if (!cancelled) {
              setBaseline(freshHist.data);
              setBaselineUpdates(freshUpd.data);
            }
          });
        }
      },
    );

    Promise.all([fetchRankingSWR("besta_mar"), fetchRankingSWR("besta_terra")]).then(
      ([mar, terra]) => {
        if (cancelled) return;
        setRankingMar(mar.data);
        setRankingTerra(terra.data);
        if (mar.revalidating) {
          fetchRanking("besta_mar", { skipCache: true }).then((fresh) =>
            setRankingMar(fresh.data),
          );
        }
        if (terra.revalidating) {
          fetchRanking("besta_terra", { skipCache: true }).then((fresh) =>
            setRankingTerra(fresh.data),
          );
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !resultado) {
    return (
      <>
        <Header />
        <main id="main-content" className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500" aria-busy="true" aria-live="polite">
          <p role="status">Carregando sinais históricos…</p>
        </main>
      </>
    );
  }

  if (!resultado) {
    return (
      <>
        <Header />
        <main id="main-content" className="mx-auto max-w-7xl px-4 py-16 text-center">
          <p className="text-slate-400" role="status">Nenhum resultado disponível. Execute o batch diário.</p>
          <button
            type="button"
            onClick={() => refresh(true)}
            className="btn-primary mt-4"
            aria-label="Tentar carregar dados novamente"
          >
            Tentar novamente
          </button>
        </main>
      </>
    );
  }

  const corr = resultado.correlacao;
  const metricas = corr.metricas ?? {};
  const transicao = resultado.transicao_fase ?? corr.transicao_fase;

  return (
    <>
      <Header
        dataReferencia={resultado.data_referencia}
        fromCache={fromCache}
        isMock={isMock}
        dataSource={dataSource}
      />
      <main id="main-content" className="page-main" aria-labelledby="dashboard-title">
        <header className="page-hero flex flex-wrap items-center justify-between gap-4">
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400/80">Monitor diário</p>
            <h2 id="dashboard-title" className="page-title mt-1">Painel Escatológico</h2>
            <p className="page-subtitle text-xs mt-1" aria-live="polite">
              Atualização ~04:00 BRT · 1 proc/dia
              {revalidating && " · revalidando em background"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <span className="rounded-full border border-ink-700/70 bg-ink-950/50 px-3 py-1">Camada viva</span>
              <span className="rounded-full border border-signal-phase/20 bg-signal-phase/10 px-3 py-1 text-signal-phase">Relé diário</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refresh(true)}
            disabled={revalidating}
            aria-busy={revalidating}
            aria-label={revalidating ? "Atualizando dados" : "Atualizar dados do painel"}
            className="btn-ghost relative z-10"
          >
            Atualizar dados
          </button>
        </header>

        {transicao?.transicao_entre_fases && (
          <div className="animate-fade-in-up">
            <PhaseTransitionAlert transicao={transicao} />
          </div>
        )}

        <div className="animate-fade-in-up">
          <PropheticBaselinePanel
            baseline={baseline}
            atualizacoes={[
              ...(resultado.baseline_historico?.novas_cumpridas_hoje ?? []),
              ...(resultado.baseline_historico?.atualizacoes_recentes ?? []),
              ...baselineUpdates,
            ]}
            compact
            loading={baselineLoading}
            isMock={baselineMock}
          />
        </div>

        <PhaseTimeline
          faseAtual={resultado.fase_atual}
          probabilidade={resultado.probabilidade_fase}
          distribuicaoHmm={corr.probabilidade_hmm}
          transicao={transicao}
          faseScores={corr.fase_scores_consolidados}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-grid">
          <ProximityMeter
            indice={resultado.indice_global}
            confianca={resultado.confianca}
            posteriorBayes={corr.posterior_bayes}
          />
          <EnergyPanel
            eventos={resultado.eventos_analisados}
            expansaoRatio={metricas.expansao_ratio}
          />
          <MacroMicroPanel
            macroRatio={metricas.macro_ratio}
            avgTension={metricas.avg_tension}
            avgImpact={metricas.avg_impact}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-grid">
          <FalseLeaderAlert
            alerta={corr.alerta_falso_lider ?? false}
            scoreIncongruencia={corr.score_incongruencia ?? 0}
            justificativa={corr.justificativa}
            scoreExpansao={metricas.score_expansao_discurso}
            scoreContracao={metricas.score_contracao_estrutura}
          />
          <BeastScores
            bestaMar={corr.score_besta_mar ?? 0}
            bestaTerra={corr.score_besta_terra ?? 0}
          />
        </div>

        {historico.length > 1 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            <ConvictionChart historico={historico} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-grid">
          <RankingTable
            title="Besta do Mar"
            subtitle="Probabilidade de Alinhamento de Perfil (PAP) — Anticristo"
            items={rankingMar.length ? rankingMar : resultado.ranking_mar}
          />
          <RankingTable
            title="Besta da Terra"
            subtitle="PAP — Falso Profeta / narrativa coercitiva"
            items={rankingTerra.length ? rankingTerra : resultado.ranking_terra}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-grid">
          <EventsList eventos={resultado.eventos_analisados} />
          <InterpretationPanel interpretacao={resultado.interpretacao} />
        </div>
      </main>
    </>
  );
}
