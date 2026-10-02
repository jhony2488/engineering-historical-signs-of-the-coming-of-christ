import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import { getProvenanceDay } from "@/lib/db/ameacas";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const limited = withRateLimit(_request);
  if (limited) return limited;

  try {
    const { date } = await context.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "data inválida" }, { status: 400 });
    }
    const data = await getProvenanceDay(date);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[db/provenance]", error);
    return NextResponse.json({ error: "Erro ao verificar proveniência" }, { status: 500 });
  }
}
