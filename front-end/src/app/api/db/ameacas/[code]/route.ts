import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import { getAmeacaPaisDetail } from "@/lib/db/ameacas";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const { code } = await context.params;
    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data") ?? undefined;
    const detail = await getAmeacaPaisDetail(code, data);
    if (!detail) {
      return NextResponse.json({ error: "País não encontrado" }, { status: 404 });
    }
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[db/ameacas/code]", error);
    return NextResponse.json({ error: "Erro ao consultar ameaça" }, { status: 500 });
  }
}
