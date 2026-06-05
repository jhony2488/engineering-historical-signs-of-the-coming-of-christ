import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { getUltimoResultado } from "@/lib/db/resultados";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const data = await getUltimoResultado();
    if (!data) {
      return NextResponse.json({ error: "Nenhum resultado disponível" }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[db/resultado/atual]", error);
    return NextResponse.json({ error: "Erro ao consultar banco" }, { status: 500 });
  }
}
