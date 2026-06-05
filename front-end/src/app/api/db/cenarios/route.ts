import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import { getCenariosFromDb } from "@/lib/db/grafo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const data = await getCenariosFromDb();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[db/cenarios]", error);
    return NextResponse.json({ error: "Erro ao consultar cenários" }, { status: 500 });
  }
}
