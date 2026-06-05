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
  personagem: "besta_mar" | "besta_terra" | "falso_lider";
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
  ranking_falso_lider?: RankingCandidato[];
  revisao_humana?: boolean;
  status?: "complete" | "partial" | "reverted";
  baseline_historico?: BaselineHistoricoResumo;
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

export interface BaselineEstatisticas {
  total_profecias_biblicas: number;
  eventos_principais_mapeados: number;
  profecias_cumpridas: number;
  profecias_pendentes: number;
  eventos_cumpridos: number;
  eventos_pendentes: number;
  taxa_cumprimento_profecias: number;
  taxa_cumprimento_eventos: number;
}

export interface BaselineCategoria {
  id: string;
  titulo: string;
  eventos_estimados: number;
  status: string;
  descricao?: string;
}

export interface BaselineProfeciaPendente {
  id: string;
  titulo: string;
  referencias: string[];
  fase_alvo?: string;
  nota?: string;
}

export interface BaselineSinalGeral {
  id: string;
  titulo: string;
  fase?: string;
  periodo?: string;
  status?: string;
  energia?: string;
  dimensao?: string;
}

export interface BaselineAtualizacao {
  id: string;
  profecia_id: string;
  titulo: string;
  status_anterior: string;
  status_novo: "cumprida" | "parcial" | "pendente";
  data_deteccao: string;
  confianca?: number;
  score_match?: number;
  fase?: string;
  evidencia?: string;
}

export interface BaselineHistorico {
  versao?: string;
  estatisticas: BaselineEstatisticas;
  overview: {
    titulo: string;
    resumo: string;
    marco_zero?: string;
    nota_metodologica?: string;
  };
  categorias: BaselineCategoria[];
  profecias_pendentes: BaselineProfeciaPendente[];
  sinais_gerais: BaselineSinalGeral[];
  atualizacoes?: BaselineAtualizacao[];
  marco_zero_deslocamento?: number;
}

export interface ArquivoProfeticoItem {
  id: string;
  titulo: string;
  status: "cumprida" | "parcial" | "pendente";
  categoria: string;
  referencias: string[];
  periodo_cumprimento?: string;
  fase_escatologica?: string;
  energia?: "expansao" | "contracao" | "misto";
  dimensao?: "macro" | "micro" | "misto";
  descricao?: string;
  cumprida_em?: string;
  dados?: Record<string, unknown>;
}

export interface BaselineHistoricoResumo {
  estatisticas?: BaselineEstatisticas;
  overview_resumo?: string;
  marco_zero_deslocamento?: number;
  profecias_pendentes?: number;
  novas_cumpridas_hoje?: BaselineAtualizacao[];
  atualizacoes_recentes?: BaselineAtualizacao[];
}

export type NewsletterSource = "web" | "footer" | "profecias" | "dashboard" | "rankings";

export type NewsletterStatus = "active" | "unsubscribed";

export interface NewsletterSubscribeResponse {
  ok: boolean;
  status: NewsletterStatus;
}

export interface NewsletterUnsubscribeResponse {
  ok: boolean;
  status: "unsubscribed";
}
