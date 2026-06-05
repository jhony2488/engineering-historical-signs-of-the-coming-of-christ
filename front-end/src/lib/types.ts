export type FaseId = "FASE_I" | "FASE_II" | "FASE_III" | "FASE_IV";

export interface EventoEstruturado {
  evento: string;
  regiao: string;
  grau_tensao: number;
  impacto_global: number;
  energia: "expansao" | "contracao";
  dimensao: "macro" | "micro";
  descricao?: string;
}

export interface RankingCandidato {
  posicao: number;
  candidato_id: string;
  nome: string;
  personagem: "besta_mar" | "besta_terra";
  probabilidade_atual: number;
  tendencia_24h: number;
  fator_principal: string;
  scores_criterio?: Record<string, number>;
}

export interface TransicaoFase {
  transicao_entre_fases: boolean;
  fase_dominante: FaseId;
  fase_secundaria: FaseId;
  margem_fases: number;
  proximidade_secundaria: number;
  pontuacao_dominante: number;
  pontuacao_secundaria: number;
  descricao: string;
}

export interface Correlacao {
  indice_global?: number;
  fase?: FaseId;
  confianca?: number;
  posterior_bayes?: number;
  probabilidade_hmm?: Record<FaseId, number>;
  score_llm?: number;
  alerta_falso_lider?: boolean;
  score_incongruencia?: number;
  score_besta_mar?: number;
  score_besta_terra?: number;
  justificativa?: string;
  transicao_fase?: TransicaoFase;
  fase_scores_consolidados?: Record<FaseId, number>;
  metricas?: {
    avg_tension?: number;
    avg_impact?: number;
    expansao_ratio?: number;
    macro_ratio?: number;
    score_expansao_discurso?: number;
    score_contracao_estrutura?: number;
    graph_convergence?: number;
  };
}

export interface ResultadoEscatologico {
  schema_version: string;
  data_referencia: string;
  fase_atual: FaseId;
  probabilidade_fase: number;
  indice_global: number;
  confianca: number;
  correlacao: Correlacao;
  transicao_fase?: TransicaoFase;
  eventos_analisados: EventoEstruturado[];
  metricas: Record<string, number>;
  linha_temporal?: Record<string, unknown>;
  interpretacao?: {
    aderencia_profetica?: number;
    similaridades?: string[];
    divergencias?: string[];
    citacoes?: string[];
  };
  ranking_mar: RankingCandidato[];
  ranking_terra: RankingCandidato[];
  revisao_humana?: boolean;
  status?: "complete" | "partial" | "reverted";
}

export type JanelaTemporal = "weekly" | "monthly" | "quarterly" | "semiannual" | "annual";

export type SnapshotMotor = "nivel_2" | "nivel_3";

export interface SnapshotPeriodo {
  janela: string;
  data_referencia: string;
  motor: SnapshotMotor;
  label?: string;
  dados: Record<string, unknown>;
}

export interface CenarioSimulacao {
  id: string;
  titulo: string;
  descricao: string;
  precondicoes: string[];
  fase_alvo: FaseId;
  impacto_indice: number;
  dependencias: string[];
}
