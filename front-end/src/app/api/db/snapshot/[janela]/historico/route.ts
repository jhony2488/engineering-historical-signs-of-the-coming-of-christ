import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { listSnapshotsPorJanela } from "@/lib/db/snapshots";

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
  request: NextRequest,
  { params }: { params: Promise<{ janela: string }> },
) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const { janela } = await params;
    if (!VALID.has(janela)) {
      return NextResponse.json({ error: "janela inválida" }, { status: 400 });
    }

    const limit = Math.min(
      52,
      Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "12", 10)),
    );
    const data = await listSnapshotsPorJanela(janela, limit);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[db/snapshot/historico]", error);
    return NextResponse.json({ error: "Erro ao consultar histórico de snapshots" }, { status: 500 });
  }
}
