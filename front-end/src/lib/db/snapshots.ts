import { prisma } from "@/lib/prisma";
import type { SnapshotPeriodo } from "@/lib/types";

function mapRow(dados: unknown, janela: string, dataRef: string): SnapshotPeriodo {
  const payload = (typeof dados === "object" && dados !== null ? dados : {}) as Record<
    string,
    unknown
  >;
  return {
    janela,
    data_referencia: dataRef,
    dados: payload,
    motor: (payload.motor as SnapshotPeriodo["motor"]) ?? "nivel_2",
    label: payload.label as string | undefined,
  };
}

export async function getSnapshotPorJanela(janela: string): Promise<SnapshotPeriodo | null> {
  const row = await prisma.snapshotPeriodo.findFirst({
    where: { janela },
    orderBy: { dataReferencia: "desc" },
  });
  if (!row) return null;
  return mapRow(row.dados, row.janela, row.dataReferencia.toISOString().split("T")[0]);
}

export async function listSnapshotsPorJanela(
  janela: string,
  limit = 12,
): Promise<SnapshotPeriodo[]> {
  const rows = await prisma.snapshotPeriodo.findMany({
    where: { janela },
    orderBy: { dataReferencia: "desc" },
    take: limit,
  });
  return rows.map((r) =>
    mapRow(r.dados, r.janela, r.dataReferencia.toISOString().split("T")[0]),
  );
}
