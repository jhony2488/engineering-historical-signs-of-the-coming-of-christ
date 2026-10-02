import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import { getAmeacasPaises } from "@/lib/db/ameacas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const data = searchParams.get("data") ?? undefined;
    const rows = await getAmeacasPaises(data);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[db/ameacas]", error);
    return NextResponse.json({ error: "Erro ao consultar ameaças" }, { status: 500 });
  }
}
