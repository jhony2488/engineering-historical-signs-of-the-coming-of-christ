import type {
  EventoEstruturado,
  RankingCandidato,
  ResultadoEscatologico,
  SnapshotPeriodo,
  TransicaoFase,
} from "@/lib/types";

export const TRANSICAO_ATIVA: TransicaoFase = {
  transicao_entre_fases: true,
  fase_dominante: "FASE_II",
  fase_secundaria: "FASE_III",
  margem_fases: 0.02,
  proximidade_secundaria: 0.95,
  pontuacao_dominante: 0.42,
  pontuacao_secundaria: 0.38,
  descricao: "Zona de transição detectada entre fases adjacentes.",
};

export const EVENTO_EXPANSAO: EventoEstruturado = {
  evento: "despertamento_local",
  regiao: "comunidades",
  grau_tensao: 0.2,
  impacto_global: 0.35,
  energia: "expansao",
  dimensao: "micro",
  descricao: "Sinais de vigilância em comunidades locais.",
};

export const EVENTO_CONTRACAO: EventoEstruturado = {
  evento: "conflito_militar",
  regiao: "oriente_medio",
  grau_tensao: 0.84,
  impacto_global: 0.72,
  energia: "contracao",
  dimensao: "macro",
  descricao: "Intensificação de tensões na região profética.",
};

export const RANKING_TENDENCIAS: RankingCandidato[] = [
  {
    posicao: 1,
    candidato_id: "up",
    nome: "Candidato Alta",
    personagem: "besta_mar",
    probabilidade_atual: 70,
    tendencia_24h: 2.5,
    fator_principal: "Destaque em carisma_global",
  },
  {
    posicao: 2,
    candidato_id: "down",
    nome: "Candidato Baixa",
    personagem: "besta_mar",
    probabilidade_atual: 55,
    tendencia_24h: -1.2,
    fator_principal: "Destaque em influencia_unificacao",
  },
  {
    posicao: 3,
    candidato_id: "stable",
    nome: "Candidato Estável",
    personagem: "besta_mar",
    probabilidade_atual: 48,
    tendencia_24h: 0.1,
    fator_principal: "Destaque em centralizacao_estrutural",
  },
];

export const SNAPSHOT_NIVEL2: SnapshotPeriodo = {
  janela: "monthly",
  data_referencia: "2026-06-04",
  motor: "nivel_2",
  label: "Mensal (Estratégica)",
  dados: {
    motor: "nivel_2",
    delta: {
      fase_inicio: "FASE_I",
      fase_fim: "FASE_II",
      indice_inicio: 0.41,
      indice_fim: 0.58,
      variacao_indice: 0.17,
    },
    analise_ia: {
      resumo: "Síntese mensal com deriva positiva do índice global.",
      padroes: ["Padrão A", "Padrão B"],
    },
  },
};

export const SNAPSHOT_NIVEL3: SnapshotPeriodo = {
  janela: "annual_hybrid",
  data_referencia: "2026-06-04",
  motor: "nivel_3",
  label: "Anual (Panorama Híbrido)",
  dados: {
    motor: "nivel_3",
    analise_hibrida: {
      panorama: "Panorama anual com convergência cautelosa entre eras.",
      raciocinio: {
        fase_emergente: "FASE_II",
        conviccao_panorama: 0.64,
        padroes_cruzados: ["Semanal alinha com mensal"],
      },
      hermeneutica: {
        aderencia_profetica: 0.57,
        citacoes_rag: ["Mt 24:6-7", "Ap 13:11-12"],
      },
    },
  },
};

export const INTERPRETACAO_COMPLETA: NonNullable<ResultadoEscatologico["interpretacao"]> = {
  aderencia_profetica: 0.55,
  similaridades: ["Conflitos regionais", "Centralização tecnológica"],
  divergencias: ["Sem sinais astronômicos"],
  citacoes: ["Mt 24:6-7", "Ap 13:16-17"],
};
