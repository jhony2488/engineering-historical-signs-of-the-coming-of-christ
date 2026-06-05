import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { approveReviewSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = approveReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const ref = new Date(parsed.data.data_referencia);
    const row = await prisma.resultadoEscatologico.findFirst({
      where: { dataReferencia: ref },
      orderBy: { createdAt: "desc" },
    });

    if (!row) {
      return NextResponse.json({ error: "Resultado não encontrado" }, { status: 404 });
    }

    const payload = row.jsonAnaliseIa as Record<string, unknown>;
    payload.revisao_humana = true;
    payload.status = "complete";

    await prisma.resultadoEscatologico.update({
      where: { id: row.id },
      data: { jsonAnaliseIa: payload as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      status: "approved",
      data_referencia: parsed.data.data_referencia,
    });
  } catch (error) {
    console.error("[admin/revisao/approve]", error);
    return NextResponse.json({ error: "Erro ao aprovar revisão" }, { status: 500 });
  }
}
