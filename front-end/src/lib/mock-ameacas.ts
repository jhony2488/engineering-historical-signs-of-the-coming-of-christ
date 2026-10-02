import type { AmeacaPais, AmeacaPaisDetail } from "./types";

export const MOCK_AMEACAS: AmeacaPais[] = [
  {
    country_code: "ISR",
    country_name: "Israel",
    lat: 31.0461,
    lng: 34.8516,
    risk_score: 0.82,
    metrics: {
      juridical_instability: 0.55,
      financial_control_level: 0.48,
      religious_freedom_threat: 0.72,
      conflict_intensity: 0.91,
    },
    prescriptions: {
      physical: ["Reduzir exposição em zonas de conflito ou cerco logístico"],
      financial: ["Preparar alternativas de troca e liquidez física"],
      spiritual: ["Priorizar perseverança e testemunho sob restrição"],
    },
    historical_echo: {
      historical_echo_match: "echo_roma_cerco",
      titulo: "Cerco comercial e controle de subsistência (Império Romano tardio)",
      similarity_percentage: 71.2,
      pattern_phase: "Cerco / Asfixia Econômica",
      projected_cycle_duration: { min_months: 12, max_months: 36 },
    },
    joshua: {
      expansion_score: 0.32,
      contraction_score: 0.58,
      missiological_risk: 0.55,
      avg_joshua_scale: 2.0,
      peoples_count: 1,
    },
  },
  {
    country_code: "USA",
    country_name: "Estados Unidos",
    lat: 37.0902,
    lng: -95.7129,
    risk_score: 0.71,
    metrics: {
      juridical_instability: 0.62,
      financial_control_level: 0.78,
      religious_freedom_threat: 0.58,
      conflict_intensity: 0.45,
    },
    prescriptions: {
      physical: ["Diversificar pontos de encontro e logística comunitária"],
      financial: ["Minimizar dependência de controles financeiros emergentes"],
      spiritual: ["Discernir narrativas de falso líder / incongruência"],
    },
    historical_echo: {
      historical_echo_match: "echo_weimar",
      titulo: "Hiperinflação e congelamento de ativos (Weimar / anos 80-90)",
      similarity_percentage: 64.5,
      pattern_phase: "Asfixia Monetária Pré-Transição",
      projected_cycle_duration: { min_months: 18, max_months: 24 },
    },
  },
  {
    country_code: "BRA",
    country_name: "Brasil",
    lat: -14.235,
    lng: -51.9253,
    risk_score: 0.58,
    metrics: {
      juridical_instability: 0.52,
      financial_control_level: 0.61,
      religious_freedom_threat: 0.48,
      conflict_intensity: 0.38,
    },
    prescriptions: {
      physical: ["Manter rede local de apoio e comunicação segura"],
      financial: ["Reduzir concentração em instrumentos centralizados"],
      spiritual: ["Fortalecer discipulado em pequenos grupos"],
    },
    historical_echo: {
      historical_echo_match: "echo_apostasia",
      titulo: "Esfriamento da fé / acomodação ideológica",
      similarity_percentage: 52.0,
      pattern_phase: "Esfriamento da Fé / Apostasia em Massa",
      projected_cycle_duration: { min_months: 24, max_months: 48 },
    },
  },
  {
    country_code: "CHN",
    country_name: "China",
    lat: 35.8617,
    lng: 104.1954,
    risk_score: 0.76,
    metrics: {
      juridical_instability: 0.7,
      financial_control_level: 0.85,
      religious_freedom_threat: 0.88,
      conflict_intensity: 0.5,
    },
    prescriptions: {
      physical: ["Priorizar redundância de abrigo e abastecimento local"],
      financial: ["Minimizar dependência de controles financeiros emergentes"],
      spiritual: ["Preparar rede pastoral para perseguição e apostasia"],
    },
    historical_echo: {
      historical_echo_match: "echo_totalitarismo",
      titulo: "Centralização e vigilância totalitária (regimes séc. XX)",
      similarity_percentage: 78.0,
      pattern_phase: "Centralização Autoritária",
      projected_cycle_duration: { min_months: 18, max_months: 30 },
    },
  },
  {
    country_code: "RUS",
    country_name: "Rússia",
    lat: 61.524,
    lng: 105.3188,
    risk_score: 0.69,
    metrics: {
      juridical_instability: 0.68,
      financial_control_level: 0.55,
      religious_freedom_threat: 0.6,
      conflict_intensity: 0.8,
    },
    prescriptions: {
      physical: ["Reduzir exposição em zonas de conflito ou cerco logístico"],
      financial: ["Preparar alternativas de troca e liquidez física"],
      spiritual: ["Preservar ortodoxia e comunhão sob pressão cultural"],
    },
    historical_echo: {
      historical_echo_match: "echo_persecucao_xx",
      titulo: "Leis de exceção e perseguição religiosa (séc. XX)",
      similarity_percentage: 66.0,
      pattern_phase: "Erosão da Liberdade e Perseguição",
      projected_cycle_duration: { min_months: 12, max_months: 24 },
    },
  },
];

export function getMockAmeacaDetail(code: string): AmeacaPaisDetail | null {
  const ameaca = MOCK_AMEACAS.find((a) => a.country_code === code.toUpperCase());
  if (!ameaca) return null;
  return {
    ameaca,
    abm: {
      country_code: ameaca.country_code,
      fragility_index: Math.min(0.95, ameaca.risk_score + 0.05),
      probabilistic_outcomes: { estavel: 0.2, fragil: 0.45, colapso_parcial: 0.35 },
      critical_trigger_points: [8, 14, 20],
      runs: 100,
      horizon_months: 24,
    },
    adversarial: {
      country_code: ameaca.country_code,
      resilience_score: ameaca.risk_score > 0.75 ? 0.42 : 0.68,
      fragile_premises: ["Concentração de sinais pode refletir viés de mídia"],
      counter_thesis: "Aceleração pode ser ciclica e não estrutural.",
      recommendation:
        ameaca.risk_score > 0.75
          ? "Manter recomendações condicionais"
          : "Acompanhamento ativo",
    },
    recomendacoes: [
      {
        country_code: ameaca.country_code,
        urgency: ameaca.risk_score >= 0.75 ? "agora" : "semana",
        triggers: [
          {
            rule: `SE conflict_intensity > 0.7 ENTÃO ação em 24 horas`,
            metric: "conflict_intensity",
            value: ameaca.metrics.conflict_intensity,
          },
        ],
        actions: [
          ...(ameaca.prescriptions.physical ?? []).slice(0, 1),
          ...(ameaca.prescriptions.spiritual ?? []).slice(0, 1),
        ],
        payload: { risk_score: ameaca.risk_score },
      },
    ],
    provenance: {
      merkle_root: "demo_merkle_root_abc123",
      integrity_ok: true,
      chain_length: 6,
      stages: ["ingestion", "extraction", "correlation", "threats", "final_report"],
    },
  };
}
