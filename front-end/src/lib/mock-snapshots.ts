import type { JanelaTemporal, SnapshotPeriodo } from "./types";

const TODAY = new Date().toISOString().split("T")[0];

function nivel2(janela: JanelaTemporal, label: string, days: number): SnapshotPeriodo {
  return {
    janela,
    data_referencia: TODAY,
    motor: "nivel_2",
    label,
    dados: {
      motor: "nivel_2",
      window: janela,
      label,
      count: days,
      periodo: { inicio: TODAY, fim: TODAY },
      delta: {
        fase_inicio: "FASE_I",
        fase_fim: "FASE_II",
        indice_inicio: 0.41,
        indice_fim: 0.58,
        variacao_indice: 0.17,
        prob_inicio: 0.38,
        prob_fim: 0.62,
      },
      analise_ia: {
        padroes: [
          "Correlação Oriente Médio ↔ convicção Fase III",
          "Aceleração de CBDCs em ciclos de 14 dias",
        ],
        aceleracao_fase: janela !== "weekly",
        resumo: `Síntese ${label}: deriva positiva do índice global com convergência macro/micro.`,
      },
      provider: "mock",
    },
  };
}

function nivel3(janela: string, label: string, window: JanelaTemporal): SnapshotPeriodo {
  return {
    janela,
    data_referencia: TODAY,
    motor: "nivel_3",
    label,
    dados: {
      motor: "nivel_3",
      window,
      janela_out: janela,
      label,
      historico_agregado: {
        count: 90,
        resumo: {
          indice_medio: 0.49,
          indice_min: 0.38,
          indice_max: 0.61,
          prob_media: 0.54,
          fase_mais_frequente: "FASE_II",
          fase_inicio: "FASE_I",
          fase_fim: "FASE_II",
        },
      },
      analise_hibrida: {
        panorama:
          "O panorama híbrido indica deslocamento gradual em direção à Fase II–III, " +
          "com padrões cruzados entre centralização geopolítica e retórica de restauração moral.",
        raciocinio: {
          aceleracao_transicao: true,
          fase_emergente: "FASE_II",
          conviccao_panorama: 0.64,
          padroes_cruzados: [
            "Semanal alinha com mensal na subida do índice",
            "Trimestral confirma margem estreita Fase II/III",
          ],
          marco_zero_deslocamento: 0.19,
        },
        hermeneutica: {
          aderencia_profetica: 0.57,
          citacoes_rag: ["Mt 24:6-7", "Ap 13:11-12", "2 Ts 2:7-8"],
        },
      },
      providers: { reasoning: "mock", hermeneutics: "mock" },
    },
  };
}

const MOCK_SNAPSHOTS: Record<string, SnapshotPeriodo> = {
  weekly: nivel2("weekly", "Semanal (Tática)", 7),
  monthly: nivel2("monthly", "Mensal (Estratégica)", 30),
  quarterly: nivel2("quarterly", "Trimestral (Ciclos)", 90),
  semiannual: nivel2("semiannual", "Semestral (Ciclos)", 180),
  annual: nivel2("annual", "Anual (Panorama)", 365),
  quarterly_hybrid: nivel3("quarterly_hybrid", "Trimestral (Híbrido)", "quarterly"),
  semiannual_hybrid: nivel3("semiannual_hybrid", "Semestral (Híbrido)", "semiannual"),
  annual_hybrid: nivel3("annual_hybrid", "Anual (Panorama Híbrido)", "annual"),
};

export function getMockSnapshot(janela: string): SnapshotPeriodo | null {
  return MOCK_SNAPSHOTS[janela] ?? null;
}
