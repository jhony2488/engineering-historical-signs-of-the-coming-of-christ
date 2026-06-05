import type {
  ArquivoProfeticoItem,
  BaselineAtualizacao,
  BaselineHistorico,
} from "./types";

export const MOCK_BASELINE_HISTORICO: BaselineHistorico = {
  versao: "2026.06.05",
  estatisticas: {
    total_profecias_biblicas: 1817,
    eventos_principais_mapeados: 600,
    profecias_cumpridas: 1797,
    profecias_pendentes: 20,
    eventos_cumpridos: 580,
    eventos_pendentes: 20,
    taxa_cumprimento_profecias: 0.989,
    taxa_cumprimento_eventos: 0.967,
  },
  overview: {
    titulo: "Overview geral — promessas e profecias já cumpridas",
    resumo:
      "Antes do primeiro run diário, o motor ancora a linha do tempo na massa de profecias bíblicas já verificadas historicamente. Das ~1.817 profecias ligadas a ~600 eventos principais, restam ~20 eventos escatológicos finais pendentes.",
    marco_zero: "Cumprimento messiânico e era apostólica como pivô de validação profética.",
    nota_metodologica: "Contagens versionadas e auditáveis; catálogo expande via arquivo_profetico.",
  },
  categorias: [
    { id: "messianicas", titulo: "Profecias messiânicas", eventos_estimados: 120, status: "cumprida" },
    { id: "israel_nacoes", titulo: "Israel e nações", eventos_estimados: 95, status: "cumprida_parcial" },
    { id: "igreja_era", titulo: "Era da Igreja", eventos_estimados: 80, status: "cumprida_parcial" },
    { id: "tribulacao_final", titulo: "Tribulação e Dia do Senhor", eventos_estimados: 85, status: "pendente" },
    { id: "reino_milennial", titulo: "Reino e restauração cósmica", eventos_estimados: 70, status: "pendente" },
  ],
  profecias_pendentes: [
    { id: "pend_marca_compra_venda", titulo: "Marca obrigatória para compra e venda", referencias: ["Ap 13:16-17"], fase_alvo: "FASE_III" },
    { id: "pend_paz_falsa_oriente", titulo: "Tratado de paz falsa — Oriente Médio", referencias: ["Dn 9:27"], fase_alvo: "FASE_II" },
    { id: "pend_segunda_vinda", titulo: "Segunda vinda visível de Cristo", referencias: ["Ap 19:11-16"], fase_alvo: "FASE_IV" },
  ],
  sinais_gerais: [
    { id: "sinal_cbdc_piloto", titulo: "Piloto de moedas digitais de banco central", fase: "FASE_II", periodo: "séc. XXI", status: "parcial" },
    { id: "sinal_globalizacao", titulo: "Globalização institucional", fase: "FASE_II", periodo: "séc. XX–XXI" },
  ],
  atualizacoes: [],
  marco_zero_deslocamento: 0.033,
};

export const MOCK_BASELINE_ATUALIZACOES: BaselineAtualizacao[] = [
  {
    id: "upd_demo_cbdc",
    profecia_id: "pend_marca_compra_venda",
    titulo: "Marca obrigatória para compra e venda",
    status_anterior: "pendente",
    status_novo: "parcial",
    data_deteccao: new Date().toISOString().split("T")[0],
    confianca: 0.71,
    score_match: 0.52,
    fase: "FASE_II",
    evidencia: "Piloto CBDC e infraestrutura de pagamento digital em expansão global.",
  },
];

export const MOCK_ARQUIVO_PROFETICO: ArquivoProfeticoItem[] = [
  {
    id: "prof_messias_nascimento",
    titulo: "Nascimento virginal do Messias",
    status: "cumprida",
    categoria: "messianicas",
    referencias: ["Is 7:14", "Mt 1:23"],
    periodo_cumprimento: "~4 a.C.",
    fase_escatologica: "FASE_I",
  },
  {
    id: "pend_marca_compra_venda",
    titulo: "Marca obrigatória para compra e venda",
    status: "parcial",
    categoria: "pendente_escatologico",
    referencias: ["Ap 13:16-17"],
    fase_escatologica: "FASE_III",
    cumprida_em: new Date().toISOString().split("T")[0],
    dados: { origem: "run_diario", detectado_em: new Date().toISOString().split("T")[0] },
  },
  {
    id: "pend_segunda_vinda",
    titulo: "Segunda vinda visível de Cristo",
    status: "pendente",
    categoria: "pendente_escatologico",
    referencias: ["Ap 19:11-16"],
    fase_escatologica: "FASE_IV",
  },
];
