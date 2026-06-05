import type { Meta, StoryObj } from "@storybook/react";

import {
  EVENTO_CONTRACAO,
  EVENTO_EXPANSAO,
  INTERPRETACAO_COMPLETA,
  RANKING_TENDENCIAS,
  TRANSICAO_ATIVA,
} from "@/components/__tests__/fixtures";
import { MOCK_RESULTADO } from "@/lib/mock";

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

const meta: Meta = {
  title: "Dashboard/Painéis",
  parameters: { layout: "padded" },
};

export default meta;

export const ProximityMeterStory: StoryObj = {
  name: "ProximityMeter",
  render: () => (
    <div className="max-w-sm">
      <ProximityMeter
        indice={MOCK_RESULTADO.indice_global}
        confianca={MOCK_RESULTADO.confianca}
        posteriorBayes={MOCK_RESULTADO.correlacao.posterior_bayes}
      />
    </div>
  ),
};

export const PhaseTimelineStory: StoryObj = {
  name: "PhaseTimeline",
  render: () => (
    <PhaseTimeline
      faseAtual="FASE_II"
      probabilidade={0.62}
      faseScores={MOCK_RESULTADO.correlacao.fase_scores_consolidados}
      transicao={TRANSICAO_ATIVA}
    />
  ),
};

export const PhaseTransitionAlertStory: StoryObj = {
  name: "PhaseTransitionAlert",
  render: () => <PhaseTransitionAlert transicao={TRANSICAO_ATIVA} />,
};

export const FalseLeaderAlertStory: StoryObj = {
  name: "FalseLeaderAlert",
  render: () => (
    <FalseLeaderAlert
      alerta
      justificativa="Discurso de expansão com estrutura de contração simultânea."
      scoreIncongruencia={0.74}
      scoreExpansao={0.78}
      scoreContracao={0.74}
    />
  ),
};

export const EnergyPanelStory: StoryObj = {
  name: "EnergyPanel",
  render: () => (
    <EnergyPanel eventos={MOCK_RESULTADO.eventos_analisados} expansaoRatio={0.35} />
  ),
};

export const MacroMicroPanelStory: StoryObj = {
  name: "MacroMicroPanel",
  render: () => (
    <MacroMicroPanel macroRatio={0.68} avgTension={0.72} avgImpact={0.65} />
  ),
};

export const BeastScoresStory: StoryObj = {
  name: "BeastScores",
  render: () => (
    <BeastScores bestaMar={0.61} bestaTerra={0.54} />
  ),
};

export const EventsListStory: StoryObj = {
  name: "EventsList",
  render: () => (
    <EventsList eventos={[EVENTO_CONTRACAO, EVENTO_EXPANSAO, ...MOCK_RESULTADO.eventos_analisados]} />
  ),
};

export const RankingTableStory: StoryObj = {
  name: "RankingTable",
  render: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <RankingTable title="Besta do Mar" subtitle="Top-10 probabilístico" items={RANKING_TENDENCIAS} />
      <RankingTable
        title="Besta da Terra"
        subtitle="Top-10 probabilístico"
        items={RANKING_TENDENCIAS.map((r) => ({ ...r, personagem: "besta_terra" as const }))}
      />
    </div>
  ),
};

export const InterpretationPanelStory: StoryObj = {
  name: "InterpretationPanel",
  render: () => <InterpretationPanel interpretacao={INTERPRETACAO_COMPLETA} />,
};
