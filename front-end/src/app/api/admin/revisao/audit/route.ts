import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.resultadoEscatologico.findMany({
      orderBy: { dataReferencia: "desc" },
      take: 40,
    });

    const audited = rows
      .map((r) => {
        const p = r.jsonAnaliseIa as Record<string, unknown>;
        const status = String(p.status ?? "");
        if (!["complete", "rejected", "reverted"].includes(status) && p.revisao_humana !== true) {
          return null;
        }
        if (status === "pending_review") return null;
        return {
          id: r.id,
          data_referencia: r.dataReferencia.toISOString().slice(0, 10),
          fase_atual: r.faseAtual,
          status: status || (p.revisao_humana ? "complete" : "unknown"),
          revisao_aprovada_em: p.revisao_aprovada_em,
          revisao_rejeitada_em: p.revisao_rejeitada_em,
          revisao_motivo: p.revisao_motivo,
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return NextResponse.json(audited);
  } catch (error) {
    console.error("[admin/revisao/audit]", error);
    return NextResponse.json({ error: "Erro ao listar auditoria" }, { status: 500 });
  }
}
