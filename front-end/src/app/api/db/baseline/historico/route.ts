import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { getBaselineHistorico } from "@/lib/db/baseline";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const data = await getBaselineHistorico();
    if (!data) {
      return NextResponse.json({ error: "Baseline não inicializado" }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[db/baseline/historico]", error);
    return NextResponse.json({ error: "Erro ao consultar baseline" }, { status: 500 });
  }
}
