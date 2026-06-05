import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { getBaselineArquivo } from "@/lib/db/baseline";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "cumprida" | "parcial" | "pendente" | null;
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 100)));

  try {
    const data = await getBaselineArquivo(status ?? undefined, limit);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[db/baseline/arquivo]", error);
    return NextResponse.json({ error: "Erro ao consultar arquivo profético" }, { status: 500 });
  }
}
