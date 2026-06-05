import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const row = await prisma.resultadoEscatologico.findFirst({
      orderBy: { dataReferencia: "desc" },
    });
    if (!row) {
      return NextResponse.json({ error: "Nenhum resultado disponível" }, { status: 404 });
    }

    const payload = row.jsonAnaliseIa as Record<string, unknown>;
    const b64 = payload.relatorio_pdf_b64 as string | undefined;
    if (b64) {
      const buf = Buffer.from(b64, "base64");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="relatorio-escatologico.pdf"',
        },
      });
    }

    return NextResponse.redirect(new URL("/historico", request.url));
  } catch (error) {
    console.error("[db/relatorio/pdf]", error);
    return NextResponse.json({ error: "PDF indisponível" }, { status: 503 });
  }
}
