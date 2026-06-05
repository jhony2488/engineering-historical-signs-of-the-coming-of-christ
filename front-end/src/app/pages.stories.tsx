import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useMemo, useState } from "react";

import {
  EVENTO_CONTRACAO,
  INTERPRETACAO_COMPLETA,
  RANKING_TENDENCIAS,
  SNAPSHOT_NIVEL2,
  TRANSICAO_ATIVA,
} from "@/components/__tests__/fixtures";
import { InsightsDashboard } from "@/components/analytics/InsightsDashboard";
import { ConvictionChart } from "@/components/charts/ConvictionChart";
import { BeastScores } from "@/components/dashboard/BeastScores";
import { EnergyPanel } from "@/components/dashboard/EnergyPanel";
import { EventsList } from "@/components/dashboard/EventsList";
import { FalseLeaderAlert } from "@/components/dashboard/FalseLeaderAlert";
import { InterpretationPanel } from "@/components/dashboard/InterpretationPanel";
import { MacroMicroPanel } from "@/components/dashboard/MacroMicroPanel";
import { PhaseTimeline } from "@/components/dashboard/PhaseTimeline";
import { PhaseTransitionAlert } from "@/components/dashboard/PhaseTransitionAlert";
import { ProximityMeter } from "@/components/dashboard/ProximityMeter";
import { RankingTable } from "@/components/dashboard/RankingTable";
import { CytoscapeGraph } from "@/components/grafo/CytoscapeGraph";
import { SynthesisPanel } from "@/components/historico/SynthesisPanel";
import { ExportPdfButton } from "@/components/ui/ExportPdfButton";
import { PageShell } from "@/components/ui/PageShell";
import { MOCK_CENARIOS, MOCK_NOS_GRAFO, buildGrafoArestas } from "@/lib/mock-cenarios";
import { generateMockHistorico, MOCK_RESULTADO } from "@/lib/mock";
import { MOCK_RANKING_MAR, MOCK_RANKING_TERRA } from "@/lib/mock-rankings";
import { FASES } from "@/lib/phases";
import type { CenarioSimulacao } from "@/lib/types";
import { withAdminLayout, withPublicLayout } from "@/stories/decorators";
import { installMockFetch } from "@/stories/mockFetch";

const BASE_INDICE = 0.58;
const ARESTAS = buildGrafoArestas();

function precondicoesAtendidas(cenario: CenarioSimulacao, ativos: Set<string>) {
  return cenario.precondicoes.every((p) => ativos.has(p));
}

function dependenciasAtendidas(cenario: CenarioSimulacao, ativos: Set<string>) {
  return cenario.dependencias.every((d) => ativos.has(d));
}

function SimuladorDemo() {
  const [ativos, setAtivos] = useState<Set<string>>(new Set(["macro-cbdc"]));

  const cenariosDisponiveis = useMemo(
    () =>
      MOCK_CENARIOS.filter(
        (c) => precondicoesAtendidas(c, ativos) && dependenciasAtendidas(c, ativos),
      ),
    [ativos],
  );

  const impactoTotal = cenariosDisponiveis.reduce((s, c) => s + c.impacto_indice, 0);
  const indiceProjetado = Math.min(0.95, BASE_INDICE + impactoTotal);

  function toggleNo(id: string) {
    setAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <PageShell
      badge="Demo"
      title="Simulador de Cenários"
      subtitle="Árvore de dependências proféticas — composição estática para Storybook."
      actions={<ExportPdfButton />}
    >
      <CytoscapeGraph
        nos={MOCK_NOS_GRAFO}
        cenarios={MOCK_CENARIOS.map((c) => ({ id: c.id, titulo: c.titulo }))}
        arestas={ARESTAS}
        ativos={new Set([...ativos, ...cenariosDisponiveis.map((c) => c.id)])}
        height={360}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="card-interactive lg:col-span-1">
          <h3 className="card-title">Nós do grafo</h3>
          <ul className="space-y-1 mt-3">
            {MOCK_NOS_GRAFO.map((no) => (
              <li key={no.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-2 hover:bg-ink-800/60">
                  <input
                    type="checkbox"
                    checked={ativos.has(no.id)}
                    onChange={() => toggleNo(no.id)}
                    className="rounded border-ink-600 accent-signal-phase"
                  />
                  <span className={no.tipo === "macro" ? "text-gold-400" : "text-emerald-400"}>
                    {no.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-interactive lg:col-span-2">
          <h3 className="card-title">Cenários desbloqueados</h3>
          {cenariosDisponiveis.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">Ative mais nós para desbloquear cenários.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {cenariosDisponiveis.map((c) => (
                <li key={c.id} className="rounded-lg border border-ink-700 bg-ink-800/40 p-3 text-sm">
                  <p className="font-medium text-white">{c.titulo}</p>
                  <p className="text-xs text-violet-400 mt-2">
                    {FASES.find((f) => f.id === c.fase_alvo)?.titulo ?? c.fase_alvo} · +
                    {(c.impacto_indice * 100).toFixed(0)} pp
                  </p>
                </li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-ink-700 text-sm">
            <div className="metric-tile text-center">
              <dt className="text-slate-500 text-xs">Índice base</dt>
              <dd className="text-gold-400 tabular-nums text-lg mt-1">
                {(BASE_INDICE * 100).toFixed(1)}%
              </dd>
            </div>
            <div className="metric-tile text-center">
              <dt className="text-slate-500 text-xs">Índice projetado</dt>
              <dd className="text-violet-400 tabular-nums text-lg mt-1">
                {(indiceProjetado * 100).toFixed(1)}%
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </PageShell>
  );
}

function GrafoDemo() {
  const [ativos, setAtivos] = useState<Set<string>>(new Set(["macro-cbdc", "evt-cbdc-obrigatoria"]));

  const cenariosAtivos = useMemo(
    () =>
      MOCK_CENARIOS.filter(
        (c) =>
          c.precondicoes.every((p) => ativos.has(p)) && c.dependencias.every((d) => ativos.has(d)),
      ),
    [ativos],
  );

  function toggleNo(id: string) {
    setAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <PageShell
      badge="DB + GNN"
      title="Grafo Profético"
      subtitle="Visualização interativa de nós macro/micro e cenários desbloqueados."
    >
      <p className="text-xs text-slate-500 mb-4">Convergência GNN: 87,0%</p>
      <CytoscapeGraph
        nos={MOCK_NOS_GRAFO}
        cenarios={MOCK_CENARIOS.map((c) => ({ id: c.id, titulo: c.titulo }))}
        arestas={ARESTAS}
        ativos={new Set([...ativos, ...cenariosAtivos.map((c) => c.id)])}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card-interactive">
          <h3 className="card-title">Nós ativos</h3>
          <ul className="space-y-1 mt-3">
            {MOCK_NOS_GRAFO.map((no) => (
              <li key={no.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-2 hover:bg-ink-800/60">
                  <input
                    type="checkbox"
                    checked={ativos.has(no.id)}
                    onChange={() => toggleNo(no.id)}
                    className="rounded border-ink-600 accent-signal-phase"
                  />
                  <span className={no.tipo === "macro" ? "text-gold-400" : "text-emerald-400"}>
                    {no.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-interactive">
          <h3 className="card-title">Cenários desbloqueados</h3>
          {cenariosAtivos.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">Nenhum cenário ativo.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {cenariosAtivos.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-ink-700/80 bg-ink-800/30 px-3 py-2 text-slate-300"
                >
                  {c.titulo}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}

const MOCK_REVISAO_UI = [
  {
    id: "rev-1",
    data_referencia: "2026-06-03",
    fase_atual: "FASE_II",
    indice_global: 0.612,
    confianca: 0.74,
    status: "pending_review",
    transicao_fase: {
      transicao_entre_fases: true,
      descricao: "FASE_I → FASE_II com aceleração macro",
    },
  },
];

/**
 * Composições de páginas — espelham o layout de `src/app` sem fetch de API.
 */
const meta: Meta = {
  title: "Pages",
  parameters: { layout: "fullscreen" },
};

export default meta;

export const Painel: StoryObj = {
  name: "Painel (/)",
  decorators: [withPublicLayout],
  render: () => (
    <PageShell
      badge="Monitor diário"
      title="Painel Escatológico"
      subtitle={`Referência ${MOCK_RESULTADO.data_referencia} · dados de demonstração`}
    >
      <div className="grid gap-4 lg:grid-cols-3 stagger-grid">
        <div className="lg:col-span-1">
          <ProximityMeter
            indice={MOCK_RESULTADO.indice_global}
            confianca={MOCK_RESULTADO.confianca}
            posteriorBayes={MOCK_RESULTADO.correlacao.posterior_bayes}
          />
        </div>
        <div className="lg:col-span-2">
          <PhaseTimeline
            faseAtual={MOCK_RESULTADO.fase_atual}
            probabilidade={MOCK_RESULTADO.probabilidade_fase}
            faseScores={MOCK_RESULTADO.correlacao.fase_scores_consolidados}
            transicao={MOCK_RESULTADO.transicao_fase}
          />
        </div>
      </div>
      <div className="mt-4">
        <PhaseTransitionAlert transicao={TRANSICAO_ATIVA} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 mt-4 stagger-grid">
        <FalseLeaderAlert
          alerta
          scoreIncongruencia={0.74}
          justificativa={MOCK_RESULTADO.correlacao.justificativa}
          scoreExpansao={0.78}
          scoreContracao={0.74}
        />
        <EnergyPanel eventos={MOCK_RESULTADO.eventos_analisados} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3 mt-4 stagger-grid">
        <MacroMicroPanel macroRatio={0.68} avgTension={0.72} avgImpact={0.65} />
        <BeastScores bestaMar={0.61} bestaTerra={0.54} />
        <InterpretationPanel interpretacao={INTERPRETACAO_COMPLETA} />
      </div>
      <div className="mt-4">
        <EventsList eventos={[EVENTO_CONTRACAO, ...MOCK_RESULTADO.eventos_analisados]} />
      </div>
    </PageShell>
  ),
};

export const Rankings: StoryObj = {
  name: "Rankings (/rankings)",
  decorators: [withPublicLayout],
  render: () => (
    <PageShell
      badge="Probabilístico"
      title="Ranking Top-10"
      subtitle="Candidatos às bestas do mar e da terra — atualização diária."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable title="Besta do Mar" subtitle="Anticristo / governo global" items={MOCK_RANKING_MAR} />
        <RankingTable title="Besta da Terra" subtitle="Falso profeta / narrativa" items={MOCK_RANKING_TERRA} />
      </div>
      <div className="mt-6">
        <RankingTable title="Tendências (demo)" subtitle="Variação 24h" items={RANKING_TENDENCIAS} />
      </div>
    </PageShell>
  ),
};

export const Historico: StoryObj = {
  name: "Histórico (/historico)",
  decorators: [withAdminLayout],
  render: () => (
    <PageShell
      badge="Área restrita"
      title="Arquivo Cronológico"
      subtitle="Série temporal da convicção escatológica."
      actions={<ExportPdfButton />}
    >
      <div className="card-interactive h-72 mb-6">
        <ConvictionChart historico={generateMockHistorico(30)} />
      </div>
      <SynthesisPanel snapshot={SNAPSHOT_NIVEL2} hybrid={null} motorLabel="Nível 2 — Mensal" />
    </PageShell>
  ),
};

export const Simulador: StoryObj = {
  name: "Simulador (/simulador)",
  decorators: [withAdminLayout],
  render: () => <SimuladorDemo />,
};

export const Grafo: StoryObj = {
  name: "Grafo (/grafo)",
  decorators: [withAdminLayout],
  render: () => <GrafoDemo />,
};

export const Revisao: StoryObj = {
  name: "Revisão (/revisao)",
  decorators: [withAdminLayout],
  render: () => (
    <PageShell
      badge="Humano no loop"
      title="Revisão Humana"
      subtitle="Aprove transições de fase antes da publicação no painel público."
    >
      <ul className="space-y-4">
        {MOCK_REVISAO_UI.map((item) => (
          <li key={item.id} className="card-interactive p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-white font-medium">{item.data_referencia}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {item.fase_atual} · índice {item.indice_global.toFixed(3)} · confiança{" "}
                  {item.confianca.toFixed(3)}
                </p>
                {item.transicao_fase?.transicao_entre_fases && (
                  <p className="text-xs text-amber-300 mt-2">
                    Transição detectada: {item.transicao_fase.descricao}
                  </p>
                )}
              </div>
              <button type="button" className="btn-primary text-sm">
                Aprovar publicação
              </button>
            </div>
          </li>
        ))}
      </ul>
    </PageShell>
  ),
};

export const Insights: StoryObj = {
  name: "Insights (/insights)",
  decorators: [
    withAdminLayout,
    (Story) => {
      useEffect(() => installMockFetch(), []);
      return <Story />;
    },
  ],
  render: () => (
    <PageShell
      badge="Analytics"
      title="Insights de Tráfego"
      subtitle="Métricas GA4 das páginas públicas — dados mockados no Storybook."
    >
      <InsightsDashboard />
    </PageShell>
  ),
};

export const Login: StoryObj = {
  name: "Login (/login)",
  parameters: {
    nextjs: { navigation: { pathname: "/login" } },
  },
  render: () => (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card-interactive w-full max-w-md p-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold-400/80">Área restrita</p>
          <h1 className="font-display text-2xl text-white mt-2">Entrar</h1>
          <p className="text-sm text-slate-500 mt-2">Acesso administrativo ao monitor.</p>
        </div>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block text-sm">
            <span className="text-slate-400">Usuário</span>
            <input
              className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white"
              defaultValue="admin"
              readOnly
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Senha</span>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white"
              defaultValue="••••••••"
              readOnly
            />
          </label>
          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>
        </form>
      </div>
    </main>
  ),
};
