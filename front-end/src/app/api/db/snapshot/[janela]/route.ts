import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { getSnapshotPorJanela } from "@/lib/db/snapshots";

export const dynamic = "force-dynamic";

const VALID = new Set([
  "weekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "quarterly_hybrid",
  "semiannual_hybrid",
  "annual_hybrid",
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ janela: string }> },
) {
  const limited = withRateLimit(_request);
  if (limited) return limited;

  try {
    const { janela } = await params;
    if (!VALID.has(janela)) {
      return NextResponse.json({ error: "janela inválida" }, { status: 400 });
    }

    const data = await getSnapshotPorJanela(janela);
    if (!data) {
      return NextResponse.json({ error: "snapshot não encontrado" }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[db/snapshot]", error);
    return NextResponse.json({ error: "Erro ao consultar snapshot" }, { status: 500 });
  }
}
