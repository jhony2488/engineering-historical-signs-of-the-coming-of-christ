import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { getBaselineAtualizacoes } from "@/lib/db/baseline";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  try {
    const data = await getBaselineAtualizacoes(limit);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
    });
  } catch (error) {
    console.error("[db/baseline/atualizacoes]", error);
    return NextResponse.json({ error: "Erro ao consultar atualizações" }, { status: 500 });
  }
}
