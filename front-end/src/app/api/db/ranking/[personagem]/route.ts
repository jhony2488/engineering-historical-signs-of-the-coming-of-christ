import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-guard";
import { getRankingDb } from "@/lib/db/resultados";

const VALID = new Set(["besta_mar", "besta_terra", "mar", "terra", "falso_lider"]);

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personagem: string }> },
) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const { personagem } = await params;
    if (!VALID.has(personagem)) {
      return NextResponse.json(
        { error: "personagem deve ser besta_mar, besta_terra ou falso_lider" },
        { status: 400 },
      );
    }

    const key =
      personagem === "mar" || personagem === "besta_mar"
        ? "besta_mar"
        : personagem === "terra" || personagem === "besta_terra"
          ? "besta_terra"
          : "falso_lider";
    const dataRef = request.nextUrl.searchParams.get("data") ?? undefined;
    const data = await getRankingDb(key, dataRef);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[db/ranking]", error);
    return NextResponse.json({ error: "Erro ao consultar banco" }, { status: 500 });
  }
}
