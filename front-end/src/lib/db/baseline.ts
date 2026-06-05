import { prisma } from "@/lib/prisma";
import type {
  ArquivoProfeticoItem,
  BaselineAtualizacao,
  BaselineHistorico,
} from "@/lib/types";

function mapBaseline(row: {
  versao: string;
  estatisticas: unknown;
  overview: unknown;
  categorias: unknown;
  profeciasPendentes: unknown;
  sinaisGerais: unknown;
  atualizacoes: unknown;
}): BaselineHistorico {
  const stats = row.estatisticas as BaselineHistorico["estatisticas"];
  const taxa = stats?.taxa_cumprimento_eventos ?? 0.97;
  return {
    versao: row.versao,
    estatisticas: stats,
    overview: row.overview as BaselineHistorico["overview"],
    categorias: (row.categorias as BaselineHistorico["categorias"]) ?? [],
    profecias_pendentes: (row.profeciasPendentes as BaselineHistorico["profecias_pendentes"]) ?? [],
    sinais_gerais: (row.sinaisGerais as BaselineHistorico["sinais_gerais"]) ?? [],
    atualizacoes: (row.atualizacoes as BaselineAtualizacao[]) ?? [],
    marco_zero_deslocamento: Math.round(Math.max(0, Math.min(1, 1 - taxa)) * 10000) / 10000,
  };
}

export async function getBaselineHistorico(): Promise<BaselineHistorico | null> {
  const row = await prisma.baselineEscatologico.findUnique({ where: { id: "global" } });
  if (!row) return null;
  return mapBaseline(row);
}

export async function getBaselineArquivo(
  status?: "cumprida" | "parcial" | "pendente",
  limit = 100,
): Promise<ArquivoProfeticoItem[]> {
  const rows = await prisma.arquivoProfetico.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { titulo: "asc" }],
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    status: r.status as ArquivoProfeticoItem["status"],
    categoria: r.categoria,
    referencias: (r.referencias as string[]) ?? [],
    periodo_cumprimento: r.periodoCumprimento ?? undefined,
    fase_escatologica: r.faseEscatologica ?? undefined,
    energia: (r.energia as ArquivoProfeticoItem["energia"]) ?? undefined,
    dimensao: (r.dimensao as ArquivoProfeticoItem["dimensao"]) ?? undefined,
    descricao: r.descricao ?? undefined,
    cumprida_em: r.cumpridaEm?.toISOString().split("T")[0],
    dados: (r.dados as Record<string, unknown>) ?? {},
  }));
}

export async function getBaselineAtualizacoes(limit = 20): Promise<BaselineAtualizacao[]> {
  const row = await prisma.baselineEscatologico.findUnique({
    where: { id: "global" },
    select: { atualizacoes: true },
  });
  if (!row) return [];
  const list = (row.atualizacoes as unknown as BaselineAtualizacao[]) ?? [];
  return list.slice(0, limit);
}
