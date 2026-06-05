import { MOCK_RANKING_MAR, MOCK_RANKING_TERRA } from "./mock-rankings";
import type { ResultadoEscatologico } from "./types";

export const MOCK_RESULTADO: ResultadoEscatologico = {
  schema_version: "1.0.0",
  data_referencia: new Date().toISOString().split("T")[0],
  fase_atual: "FASE_II",
  probabilidade_fase: 0.62,
  indice_global: 0.58,
  confianca: 0.71,
  correlacao: {
    indice_global: 0.58,
    fase: "FASE_II",
    confianca: 0.71,
    posterior_bayes: 0.55,
    probabilidade_hmm: {
      FASE_I: 0.08,
      FASE_II: 0.41,
      FASE_III: 0.39,
      FASE_IV: 0.12,
    },
    transicao_fase: {
      transicao_entre_fases: true,
      fase_dominante: "FASE_II",
      fase_secundaria: "FASE_III",
      margem_fases: 0.02,
      proximidade_secundaria: 0.95,
      pontuacao_dominante: 0.41,
      pontuacao_secundaria: 0.39,
      descricao:
        "Zona de transição detectada entre A Grande Apostasia e o Cenário Global e A Manifestação e Tribulação. Margem de apenas 2.0% — os sinais convergem para ambas as fases simultaneamente.",
    },
    fase_scores_consolidados: {
      FASE_I: 0.10,
      FASE_II: 0.42,
      FASE_III: 0.38,
      FASE_IV: 0.10,
    },
    score_llm: 0.68,
    alerta_falso_lider: true,
    score_incongruencia: 0.74,
    score_besta_mar: 0.61,
    score_besta_terra: 0.54,
    justificativa:
      "Alerta: discurso de expansão espiritual com estrutura de contração simultânea.",
    metricas: {
      avg_tension: 0.72,
      avg_impact: 0.65,
      expansao_ratio: 0.35,
      macro_ratio: 0.68,
      score_expansao_discurso: 0.78,
      score_contracao_estrutura: 0.74,
      graph_convergence: 0.42,
    },
  },
  eventos_analisados: [
    {
      evento: "conflito_militar",
      regiao: "oriente_medio",
      grau_tensao: 0.84,
      impacto_global: 0.72,
      energia: "contracao",
      dimensao: "macro",
      descricao: "Intensificação de tensões na região profética.",
    },
    {
      evento: "cbdc_expansao",
      regiao: "global",
      grau_tensao: 0.55,
      impacto_global: 0.68,
      energia: "contracao",
      dimensao: "macro",
      descricao: "Avanço de moedas digitais de bancos centrais.",
    },
    {
      evento: "despertamento_local",
      regiao: "comunidades",
      grau_tensao: 0.2,
      impacto_global: 0.35,
      energia: "expansao",
      dimensao: "micro",
      descricao: "Sinais de vigilância e fidelidade em comunidades locais.",
    },
  ],
  metricas: { tons_analisados: 5, graph_convergence: 0.42 },
  interpretacao: {
    aderencia_profetica: 0.55,
    similaridades: ["Aumento de conflitos regionais", "Centralização tecnológica"],
    divergencias: ["Sem sinais astronômicos definitivos"],
    citacoes: ["Mt 24:6-7", "Ap 13:16-17"],
  },
  ranking_mar: MOCK_RANKING_MAR,
  ranking_terra: MOCK_RANKING_TERRA,
  transicao_fase: {
    transicao_entre_fases: true,
    fase_dominante: "FASE_II",
    fase_secundaria: "FASE_III",
    margem_fases: 0.02,
    proximidade_secundaria: 0.95,
    pontuacao_dominante: 0.42,
    pontuacao_secundaria: 0.38,
    descricao:
      "Zona de transição detectada entre A Grande Apostasia e o Cenário Global e A Manifestação e Tribulação.",
  },
  status: "complete",
};

export function generateMockHistorico(days = 30): ResultadoEscatologico[] {
  const items: ResultadoEscatologico[] = [];
  const base = MOCK_RESULTADO.indice_global;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const drift = (days - i) * 0.003 + Math.sin(i / 5) * 0.02;
    items.push({
      ...MOCK_RESULTADO,
      data_referencia: d.toISOString().split("T")[0],
      indice_global: Math.min(0.95, Math.max(0.2, base - 0.15 + drift)),
      probabilidade_fase: Math.min(0.9, 0.45 + drift),
      confianca: Math.min(0.9, 0.6 + drift * 0.5),
    });
  }
  return items;
}
