import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import { getHistoricoResultados } from "@/lib/db/resultados";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const { searchParams } = request.nextUrl;
    const desde = searchParams.get("desde") ?? undefined;
    const cookieStore = await cookies();
    const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
    const maxLimit = session ? 365 : 90;
    const limit = Math.min(maxLimit, parseInt(searchParams.get("limit") ?? "90", 10));

    const data = await getHistoricoResultados(desde, limit);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[db/resultado/historico]", error);
    return NextResponse.json({ error: "Erro ao consultar banco" }, { status: 500 });
  }
}
