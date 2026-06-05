import { prisma } from "@/lib/prisma";
import type { RankingCandidato, ResultadoEscatologico } from "@/lib/types";

function mapJsonToResultado(json: unknown): ResultadoEscatologico {
  return json as ResultadoEscatologico;
}

export async function getUltimoResultado(): Promise<ResultadoEscatologico | null> {
  const row = await prisma.resultadoEscatologico.findFirst({
    orderBy: { dataReferencia: "desc" },
  });
  if (!row) return null;
  const payload = mapJsonToResultado(row.jsonAnaliseIa);
  return {
    ...payload,
    data_referencia: row.dataReferencia.toISOString().split("T")[0],
    fase_atual: row.faseAtual as ResultadoEscatologico["fase_atual"],
    probabilidade_fase: row.probabilidadeFase,
    indice_global: row.indiceGlobal,
    confianca: row.confianca,
  };
}

export async function getHistoricoResultados(
  desde?: string,
  limit = 90,
): Promise<ResultadoEscatologico[]> {
  const rows = await prisma.resultadoEscatologico.findMany({
    where: desde ? { dataReferencia: { gte: new Date(desde) } } : undefined,
    orderBy: { dataReferencia: "desc" },
    take: limit,
  });

  return [...rows].reverse().map((row) => {
    const payload = mapJsonToResultado(row.jsonAnaliseIa);
    return {
      ...payload,
      data_referencia: row.dataReferencia.toISOString().split("T")[0],
      fase_atual: row.faseAtual as ResultadoEscatologico["fase_atual"],
      probabilidade_fase: row.probabilidadeFase,
      indice_global: row.indiceGlobal,
      confianca: row.confianca,
    };
  });
}

export async function getRankingDb(
  personagem: "besta_mar" | "besta_terra",
  dataRef?: string,
): Promise<RankingCandidato[]> {
  const latestDate = dataRef
    ? new Date(dataRef)
    : (
        await prisma.rankingProbabilistico.findFirst({
          where: { personagem },
          orderBy: { dataReferencia: "desc" },
          select: { dataReferencia: true },
        })
      )?.dataReferencia;

  if (!latestDate) return [];

  const rows = await prisma.rankingProbabilistico.findMany({
    where: { personagem, dataReferencia: latestDate },
    orderBy: { posicao: "asc" },
    take: 10,
  });

  return rows.map((r) => ({
    posicao: r.posicao,
    candidato_id: r.candidatoId,
    nome: r.nome,
    personagem: r.personagem as RankingCandidato["personagem"],
    probabilidade_atual: r.probabilidadeAtual,
    tendencia_24h: r.tendencia24h,
    fator_principal: r.fatorPrincipal ?? "",
    scores_criterio: (r.scoresCriterio as Record<string, number>) ?? {},
  }));
}
