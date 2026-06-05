import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HISTORICO_DAYS = 365;

const WEIGHTS_MAR = {
  influencia_unificacao: 0.35,
  carisma_global: 0.25,
  divergencia_valores: 0.2,
  centralizacao_estrutural: 0.2,
} as const;

const WEIGHTS_TERRA = {
  validacao_lider: 0.4,
  monopolio_narrativa: 0.3,
  prodigios_tecnologicos: 0.3,
} as const;

type FaseId = "FASE_I" | "FASE_II" | "FASE_III" | "FASE_IV";
type Personagem = "besta_mar" | "besta_terra";

interface CandidatoSeed {
  id: string;
  nome: string;
  personagem: Personagem;
  scoresCriterio: Record<string, number>;
  regiao?: string;
  descricao?: string;
}

const CANDIDATOS_MAR: CandidatoSeed[] = [
  {
    id: "cand-mar-001",
    nome: "Coalizão de Mediação Global",
    personagem: "besta_mar",
    regiao: "multilateral",
    descricao: "Bloco diplomático com capacidade de mediação em conflitos históricos.",
    scoresCriterio: {
      influencia_unificacao: 0.82,
      carisma_global: 0.71,
      divergencia_valores: 0.58,
      centralizacao_estrutural: 0.74,
    },
  },
  {
    id: "cand-mar-002",
    nome: "Líder de Estabilidade Regional",
    personagem: "besta_mar",
    regiao: "oriente_medio",
    scoresCriterio: {
      influencia_unificacao: 0.68,
      carisma_global: 0.79,
      divergencia_valores: 0.52,
      centralizacao_estrutural: 0.61,
    },
  },
  {
    id: "cand-mar-003",
    nome: "Fórum de Reconciliação do Oriente Médio",
    personagem: "besta_mar",
    regiao: "oriente_medio",
    scoresCriterio: {
      influencia_unificacao: 0.76,
      carisma_global: 0.64,
      divergencia_valores: 0.49,
      centralizacao_estrutural: 0.58,
    },
  },
  {
    id: "cand-mar-004",
    nome: "Bloco de Governança Transnacional",
    personagem: "besta_mar",
    regiao: "global",
    scoresCriterio: {
      influencia_unificacao: 0.71,
      carisma_global: 0.58,
      divergencia_valores: 0.61,
      centralizacao_estrutural: 0.77,
    },
  },
  {
    id: "cand-mar-005",
    nome: "Iniciativa de Paz Unificada",
    personagem: "besta_mar",
    regiao: "global",
    scoresCriterio: {
      influencia_unificacao: 0.65,
      carisma_global: 0.72,
      divergencia_valores: 0.55,
      centralizacao_estrutural: 0.54,
    },
  },
  {
    id: "cand-mar-006",
    nome: "Conselho de Estabilidade Financeira Global",
    personagem: "besta_mar",
    regiao: "global",
    scoresCriterio: {
      influencia_unificacao: 0.59,
      carisma_global: 0.51,
      divergencia_valores: 0.44,
      centralizacao_estrutural: 0.81,
    },
  },
  {
    id: "cand-mar-007",
    nome: "Arquiteto do Novo Ordem Econômica",
    personagem: "besta_mar",
    regiao: "global",
    scoresCriterio: {
      influencia_unificacao: 0.62,
      carisma_global: 0.66,
      divergencia_valores: 0.63,
      centralizacao_estrutural: 0.69,
    },
  },
  {
    id: "cand-mar-008",
    nome: "Mediador de Crises Multilaterais",
    personagem: "besta_mar",
    regiao: "europa",
    scoresCriterio: {
      influencia_unificacao: 0.54,
      carisma_global: 0.68,
      divergencia_valores: 0.47,
      centralizacao_estrutural: 0.48,
    },
  },
  {
    id: "cand-mar-009",
    nome: "Coalizão de Resposta Humanitária Unificada",
    personagem: "besta_mar",
    regiao: "global",
    scoresCriterio: {
      influencia_unificacao: 0.57,
      carisma_global: 0.74,
      divergencia_valores: 0.56,
      centralizacao_estrutural: 0.52,
    },
  },
  {
    id: "cand-mar-010",
    nome: "Eixo de Mediação Euro-Asiático",
    personagem: "besta_mar",
    regiao: "eurasia",
    scoresCriterio: {
      influencia_unificacao: 0.48,
      carisma_global: 0.45,
      divergencia_valores: 0.38,
      centralizacao_estrutural: 0.42,
    },
  },
];

const CANDIDATOS_TERRA: CandidatoSeed[] = [
  {
    id: "cand-terra-001",
    nome: "Plataforma de Narrativa Unificada",
    personagem: "besta_terra",
    descricao: "Infraestrutura de conformidade narrativa e exclusão de dissidentes.",
    scoresCriterio: {
      validacao_lider: 0.74,
      monopolio_narrativa: 0.86,
      prodigios_tecnologicos: 0.68,
    },
  },
  {
    id: "cand-terra-002",
    nome: "Consórcio de IA Global",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.61,
      monopolio_narrativa: 0.72,
      prodigios_tecnologicos: 0.91,
    },
  },
  {
    id: "cand-terra-003",
    nome: "Rede de Verificação de Conteúdo Planetária",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.58,
      monopolio_narrativa: 0.79,
      prodigios_tecnologicos: 0.64,
    },
  },
  {
    id: "cand-terra-004",
    nome: "Instituto de Sincronização Ideológica",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.69,
      monopolio_narrativa: 0.67,
      prodigios_tecnologicos: 0.55,
    },
  },
  {
    id: "cand-terra-005",
    nome: "Aliança de Plataformas Digitais Globais",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.66,
      monopolio_narrativa: 0.81,
      prodigios_tecnologicos: 0.73,
    },
  },
  {
    id: "cand-terra-006",
    nome: "Projeto Sentinela de Conformidade Social",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.52,
      monopolio_narrativa: 0.76,
      prodigios_tecnologicos: 0.58,
    },
  },
  {
    id: "cand-terra-007",
    nome: "Laboratório de Experiências Imersivas Sagradas",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.48,
      monopolio_narrativa: 0.54,
      prodigios_tecnologicos: 0.84,
    },
  },
  {
    id: "cand-terra-008",
    nome: "Hub de Inteligência Narrativa Central",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.71,
      monopolio_narrativa: 0.69,
      prodigios_tecnologicos: 0.62,
    },
  },
  {
    id: "cand-terra-009",
    nome: "Consórcio de Biometria e Identidade Universal",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.55,
      monopolio_narrativa: 0.63,
      prodigios_tecnologicos: 0.77,
    },
  },
  {
    id: "cand-terra-010",
    nome: "Movimento de Unificação Espiritual Sintética",
    personagem: "besta_terra",
    scoresCriterio: {
      validacao_lider: 0.44,
      monopolio_narrativa: 0.58,
      prodigios_tecnologicos: 0.49,
    },
  },
];

const CANDIDATOS = [...CANDIDATOS_MAR, ...CANDIDATOS_TERRA];

const EVENTOS_POOL = [
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
  {
    evento: "tratado_multilateral",
    regiao: "global",
    grau_tensao: 0.45,
    impacto_global: 0.61,
    energia: "contracao",
    dimensao: "macro",
    descricao: "Acordo internacional ampliando governança supranacional.",
  },
  {
    evento: "perseguicao_religiosa",
    regiao: "global",
    grau_tensao: 0.78,
    impacto_global: 0.58,
    energia: "contracao",
    dimensao: "micro",
    descricao: "Restrições a expressões de fé ortodoxa em plataformas digitais.",
  },
  {
    evento: "evangelismo_transcultural",
    regiao: "global_sul",
    grau_tensao: 0.18,
    impacto_global: 0.42,
    energia: "expansao",
    dimensao: "micro",
    descricao: "Expansão documentada do evangelho em regiões não alcançadas.",
  },
  {
    evento: "identidade_digital_obrigatoria",
    regiao: "global",
    grau_tensao: 0.62,
    impacto_global: 0.74,
    energia: "contracao",
    dimensao: "macro",
    descricao: "Piloto de identidade digital vinculada a serviços essenciais.",
  },
  {
    evento: "apostasia_institucional",
    regiao: "europa",
    grau_tensao: 0.51,
    impacto_global: 0.49,
    energia: "contracao",
    dimensao: "macro",
    descricao: "Erosão de doutrina em estruturas religiosas historicamente ortodoxas.",
  },
] as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** Pseudo-aleatório determinístico para seeds reproduzíveis. */
function seededNoise(seed: number, salt = 0): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function toDateOnly(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function weightedScore(
  scores: Record<string, number>,
  weights: Record<string, number>,
): number {
  return clamp(
    Object.entries(weights).reduce((sum, [key, weight]) => sum + weight * (scores[key] ?? 0), 0),
  );
}

function rankCandidates(personagem: Personagem, dayOffset: number) {
  const pool = personagem === "besta_mar" ? CANDIDATOS_MAR : CANDIDATOS_TERRA;
  const weights = personagem === "besta_mar" ? WEIGHTS_MAR : WEIGHTS_TERRA;
  const drift = dayOffset * 0.0015;

  const ranked = pool
    .map((c, idx) => {
      const noise = seededNoise(dayOffset, idx);
      const adjusted = Object.fromEntries(
        Object.entries(c.scoresCriterio).map(([k, v], ki) => [
          k,
          clamp(v + drift * (seededNoise(dayOffset, idx + ki) - 0.5)),
        ]),
      );
      const base = weightedScore(adjusted, weights);
      const pap = clamp(0.7 * base + 0.3 * 0.12) * 100;
      const topKey = Object.entries(adjusted).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "criterio";
      const tendencia = Number(((noise - 0.45) * 4).toFixed(1));
      return {
        candidato_id: c.id,
        nome: c.nome,
        personagem,
        probabilidade_atual: Number(pap.toFixed(1)),
        tendencia_24h: tendencia,
        fator_principal: `Destaque em ${topKey}`,
        scores_criterio: adjusted,
        _sort: pap,
      };
    })
    .sort((a, b) => b._sort - a._sort)
    .slice(0, 10)
    .map((item, index) => ({
      posicao: index + 1,
      candidato_id: item.candidato_id,
      nome: item.nome,
      personagem: item.personagem,
      probabilidade_atual: item.probabilidade_atual,
      tendencia_24h: item.tendencia_24h,
      fator_principal: item.fator_principal,
      scores_criterio: item.scores_criterio,
    }));

  return ranked;
}

function phaseProfile(dayOffset: number): {
  fase: FaseId;
  prob: number;
  indice: number;
  confianca: number;
  hmm: Record<FaseId, number>;
  transicao: boolean;
} {
  const t = (HISTORICO_DAYS - dayOffset) / HISTORICO_DAYS;
  const indice = clamp(0.38 + t * 0.22 + Math.sin(dayOffset / 7) * 0.03);
  const faseII = clamp(0.28 + t * 0.18);
  const faseIII = clamp(0.15 + t * 0.22);
  const faseI = clamp(0.35 - t * 0.2);
  const faseIV = clamp(0.08 + t * 0.05);
  const sum = faseI + faseII + faseIII + faseIV;
  const hmm = {
    FASE_I: faseI / sum,
    FASE_II: faseII / sum,
    FASE_III: faseIII / sum,
    FASE_IV: faseIV / sum,
  };
  const dominant = (Object.entries(hmm).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "FASE_II") as FaseId;
  const secondary = (Object.entries(hmm).sort((a, b) => b[1] - a[1])[1]?.[0] ?? "FASE_III") as FaseId;
  const margem = Math.abs(hmm[dominant] - hmm[secondary]);
  return {
    fase: dominant,
    prob: hmm[dominant],
    indice,
    confianca: clamp(0.58 + t * 0.15),
    hmm,
    transicao: margem < 0.15,
  };
}

function buildResultadoSeed(date: Date, dayOffset: number) {
  const iso = isoDate(date);
  const profile = phaseProfile(dayOffset);
  const rankingMar = rankCandidates("besta_mar", dayOffset);
  const rankingTerra = rankCandidates("besta_terra", dayOffset);
  const eventCount = 3 + (dayOffset % 3);
  const eventos = EVENTOS_POOL.slice(0, eventCount).map((e, i) => ({
    ...e,
    grau_tensao: clamp(e.grau_tensao + (dayOffset % 5) * 0.02 - i * 0.01),
  }));

  const dominant = profile.fase;
  const secondary = (Object.entries(profile.hmm).sort((a, b) => b[1] - a[1])[1]?.[0] ??
    "FASE_III") as FaseId;
  const margem = Math.abs(profile.hmm[dominant] - profile.hmm[secondary]);

  const transicao = profile.transicao
    ? {
        transicao_entre_fases: true,
        fase_dominante: dominant,
        fase_secundaria: secondary,
        margem_fases: Number(margem.toFixed(3)),
        proximidade_secundaria: Number((profile.hmm[secondary] / profile.hmm[dominant]).toFixed(2)),
        pontuacao_dominante: Number(profile.hmm[dominant].toFixed(3)),
        pontuacao_secundaria: Number(profile.hmm[secondary].toFixed(3)),
        descricao: `Zona de transição detectada entre ${dominant} e ${secondary} (seed dia ${iso}).`,
      }
    : {
        transicao_entre_fases: false,
        fase_dominante: dominant,
        fase_secundaria: secondary,
        margem_fases: Number(margem.toFixed(3)),
        proximidade_secundaria: 0.5,
        pontuacao_dominante: Number(profile.hmm[dominant].toFixed(3)),
        pontuacao_secundaria: Number(profile.hmm[secondary].toFixed(3)),
        descricao: `Convicção estável em ${dominant}.`,
      };

  const jsonAnaliseIa = {
    schema_version: "1.0.0",
    data_referencia: iso,
    fase_atual: profile.fase,
    probabilidade_fase: Number(profile.prob.toFixed(3)),
    indice_global: Number(profile.indice.toFixed(3)),
    confianca: Number(profile.confianca.toFixed(3)),
    transicao_fase: transicao,
    correlacao: {
      indice_global: Number(profile.indice.toFixed(3)),
      fase: profile.fase,
      confianca: Number(profile.confianca.toFixed(3)),
      posterior_bayes: Number(clamp(profile.prob - 0.05).toFixed(3)),
      probabilidade_hmm: Object.fromEntries(
        Object.entries(profile.hmm).map(([k, v]) => [k, Number(v.toFixed(3))]),
      ),
      transicao_fase: transicao,
      fase_scores_consolidados: Object.fromEntries(
        Object.entries(profile.hmm).map(([k, v]) => [k, Number(v.toFixed(3))]),
      ),
      score_llm: Number(clamp(0.55 + profile.indice * 0.2).toFixed(3)),
      alerta_falso_lider: profile.indice > 0.5 && dayOffset < 30,
      score_incongruencia: Number(clamp(0.55 + (dayOffset % 10) * 0.02).toFixed(3)),
      score_besta_mar: Number((rankingMar[0]?.probabilidade_atual ?? 60) / 100),
      score_besta_terra: Number((rankingTerra[0]?.probabilidade_atual ?? 55) / 100),
      justificativa:
        "Convergência parcial entre sinais macro de centralização e micro de resistência espiritual.",
      metricas: {
        avg_tension: Number(clamp(0.55 + profile.indice * 0.25).toFixed(3)),
        avg_impact: Number(clamp(0.5 + profile.indice * 0.2).toFixed(3)),
        expansao_ratio: Number(clamp(0.25 + (1 - profile.indice) * 0.2).toFixed(3)),
        macro_ratio: Number(clamp(0.6 + profile.indice * 0.15).toFixed(3)),
        score_expansao_discurso: 0.72,
        score_contracao_estrutura: Number(clamp(0.6 + profile.indice * 0.18).toFixed(3)),
        graph_convergence: Number(clamp(0.3 + profile.indice * 0.2).toFixed(3)),
      },
    },
    eventos_analisados: eventos,
    metricas: {
      tons_analisados: 4 + (dayOffset % 4),
      graph_convergence: Number(clamp(0.3 + profile.indice * 0.2).toFixed(3)),
      documentos_ingeridos: 12 + (dayOffset % 8),
    },
    linha_temporal: {
      periodo: "24h",
      eventos_chave: eventos.map((e) => e.evento),
      comparacao_7d: "Tendência de aumento gradual na tensão geopolítica e digital.",
    },
    interpretacao: {
      aderencia_profetica: Number(clamp(0.42 + profile.indice * 0.25).toFixed(3)),
      similaridades: [
        "Aumento de conflitos regionais",
        "Centralização tecnológica e financeira",
        "Retórica de paz com estrutura de controle",
      ],
      divergencias: [
        "Sem sinais astronômicos definitivos",
        "Despertamentos locais ainda visíveis",
      ],
      citacoes: ["Mt 24:6-7", "Ap 13:16-17", "2 Ts 2:3-4", "Dn 7:23-25"],
    },
    ranking_mar: rankingMar,
    ranking_terra: rankingTerra,
    revisao_humana: false,
    status: "complete",
  };

  return {
    dataReferencia: date,
    faseAtual: profile.fase,
    probabilidadeFase: profile.prob,
    indiceGlobal: profile.indice,
    confianca: profile.confianca,
    jsonAnaliseIa,
  };
}

function buildSnapshots(refDate: Date) {
  const iso = isoDate(refDate);
  const nivel2Windows = [
    { janela: "weekly", label: "Semanal (Tática)", days: 7 },
    { janela: "monthly", label: "Mensal (Estratégica)", days: 30 },
    { janela: "quarterly", label: "Trimestral (Ciclos)", days: 90 },
    { janela: "semiannual", label: "Semestral (Ciclos)", days: 180 },
    { janela: "annual", label: "Anual (Panorama)", days: 365 },
  ] as const;

  return nivel2Windows.map((w) => ({
    janela: w.janela,
    dataReferencia: refDate,
    dados: {
      motor: "nivel_2",
      window: w.janela,
      label: w.label,
      count: Math.min(w.days, HISTORICO_DAYS),
      periodo: { inicio: isoDate(toDateOnly(w.days - 1)), fim: iso },
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
        aceleracao_fase: w.janela !== "weekly",
        resumo: `Síntese ${w.label}: deriva positiva do índice global com convergência macro/micro.`,
      },
      provider: "seed",
    },
  }));
}

function buildHybridSnapshot(
  refDate: Date,
  janela: "quarterly_hybrid" | "semiannual_hybrid" | "annual_hybrid",
  window: string,
  label: string,
) {
  return {
    janela,
    dataReferencia: refDate,
    dados: {
      motor: "nivel_3",
      window,
      janela_out: janela,
      label,
      sub_windows_esperadas: ["weekly", "monthly", "quarterly", "annual"],
      historico_agregado: {
        count: HISTORICO_DAYS,
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
          "O panorama anual indica deslocamento gradual do ponteiro da convicção em direção à Fase II–III, " +
          "com padrões cruzados entre centralização geopolítica e retórica de restauração moral. " +
          "Não há predição de datas; a convergência sugere aceleração cautelosa da transição entre eras.",
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
      providers: { reasoning: "seed", hermeneutics: "seed" },
    },
  };
}

function buildAllHybridSnapshots(refDate: Date) {
  return [
    buildHybridSnapshot(refDate, "quarterly_hybrid", "quarterly", "Trimestral (Híbrido)"),
    buildHybridSnapshot(refDate, "semiannual_hybrid", "semiannual", "Semestral (Híbrido)"),
    buildHybridSnapshot(refDate, "annual_hybrid", "annual", "Anual (Panorama Híbrido)"),
  ];
}

async function seedCandidatos() {
  for (const c of CANDIDATOS) {
    await prisma.candidatoPerfil.upsert({
      where: { id: c.id },
      update: {
        nome: c.nome,
        personagem: c.personagem,
        scoresCriterio: c.scoresCriterio,
        ativo: true,
      },
      create: {
        id: c.id,
        nome: c.nome,
        personagem: c.personagem,
        scoresCriterio: c.scoresCriterio,
      },
    });
  }
  console.log(`  ✓ ${CANDIDATOS.length} candidatos (10 mar + 10 terra)`);
}

async function seedHistorico() {
  const existing = await prisma.resultadoEscatologico.findMany({
    select: { dataReferencia: true },
  });
  const existingDates = new Set(existing.map((r) => isoDate(r.dataReferencia)));
  let created = 0;

  for (let dayOffset = HISTORICO_DAYS; dayOffset >= 0; dayOffset--) {
    const date = toDateOnly(dayOffset);
    const key = isoDate(date);
    if (existingDates.has(key)) continue;

    await prisma.resultadoEscatologico.create({
      data: buildResultadoSeed(date, dayOffset),
    });
    created++;
  }

  console.log(
    created > 0
      ? `  ✓ ${created} resultados escatológicos (${HISTORICO_DAYS + 1} dias alvo)`
      : `  ⊘ resultados já completos (${existing.length} registros)`,
  );
}

async function seedRankings() {
  const latestDates = [0, 1].map(toDateOnly);
  let created = 0;

  for (const refDate of latestDates) {
    const iso = isoDate(refDate);
    const existing = await prisma.rankingProbabilistico.count({
      where: { dataReferencia: refDate },
    });
    if (existing >= 20) continue;

    await prisma.rankingProbabilistico.deleteMany({ where: { dataReferencia: refDate } });

    const dayOffset = Math.round((Date.now() - refDate.getTime()) / 86400000);
    for (const personagem of ["besta_mar", "besta_terra"] as const) {
      const ranked = rankCandidates(personagem, dayOffset);
      for (const row of ranked) {
        await prisma.rankingProbabilistico.create({
          data: {
            dataReferencia: refDate,
            posicao: row.posicao,
            candidatoId: row.candidato_id,
            nome: row.nome,
            personagem: row.personagem,
            probabilidadeAtual: row.probabilidade_atual,
            tendencia24h: row.tendencia_24h,
            fatorPrincipal: row.fator_principal,
            scoresCriterio: row.scores_criterio,
          },
        });
        created++;
      }
    }
    console.log(`  ✓ rankings ${iso} (20 entradas)`);
  }

  if (created === 0) console.log("  ⊘ rankings recentes já existem");
}

async function seedSnapshots() {
  const refDate = toDateOnly(0);
  const snapshots = [...buildSnapshots(refDate), ...buildAllHybridSnapshots(refDate)];
  let created = 0;

  for (const snap of snapshots) {
    const exists = await prisma.snapshotPeriodo.findFirst({
      where: { janela: snap.janela, dataReferencia: refDate },
    });
    if (exists) continue;

    await prisma.snapshotPeriodo.create({
      data: {
        janela: snap.janela,
        dataReferencia: snap.dataReferencia,
        dados: snap.dados,
      },
    });
    created++;
  }

  console.log(
    created > 0
      ? `  ✓ ${created} snapshots período (Nível 2 + híbrido anual)`
      : "  ⊘ snapshots já existem para hoje",
  );
}

async function seedParametrosFase() {
  const paramCount = await prisma.parametroFase.count();
  if (paramCount > 0) {
    console.log(`  ⊘ parâmetros de fase já existem (${paramCount})`);
    return;
  }

  await prisma.parametroFase.create({
    data: {
      versao: 1,
      ativo: true,
      aprovado: true,
      emissoes: {
        FASE_I: { bins: 8, base_prob: 0.35 },
        FASE_II: { bins: 8, base_prob: 0.3 },
        FASE_III: { bins: 8, base_prob: 0.2 },
        FASE_IV: { bins: 8, base_prob: 0.15 },
      },
      transicoes: {
        FASE_I: ["FASE_I", "FASE_II"],
        FASE_II: ["FASE_II", "FASE_III"],
        FASE_III: ["FASE_III", "FASE_IV"],
        FASE_IV: ["FASE_IV"],
      },
    },
  });
  console.log("  ✓ parâmetros de fase HMM v1");
}

async function main() {
  console.log("🌱 Seed Prisma — front-end (detalhado)\n");

  await seedCandidatos();
  await seedHistorico();
  await seedRankings();
  await seedSnapshots();
  await seedParametrosFase();

  console.log("\n✅ Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
