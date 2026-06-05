import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.resultadoEscatologico.findMany({
      orderBy: { dataReferencia: "desc" },
      take: 30,
    });

    const pending = rows.filter((r) => {
      const p = r.jsonAnaliseIa as Record<string, unknown>;
      return p.status === "pending_review" || p.revisao_humana === false;
    });

    return NextResponse.json(
      pending.map((r) => ({
        id: r.id,
        data_referencia: r.dataReferencia.toISOString().slice(0, 10),
        fase_atual: r.faseAtual,
        indice_global: r.indiceGlobal,
        confianca: r.confianca,
        status: (r.jsonAnaliseIa as Record<string, unknown>).status,
        transicao_fase: (r.jsonAnaliseIa as Record<string, unknown>).transicao_fase,
      })),
    );
  } catch (error) {
    console.error("[admin/revisao/pending]", error);
    return NextResponse.json({ error: "Erro ao listar pendências" }, { status: 500 });
  }
}
