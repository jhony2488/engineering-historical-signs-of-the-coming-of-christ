import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import { queryJoshuaData } from "@/lib/db/joshua";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? undefined;
    const scaleRaw = searchParams.get("scale");
    const limitRaw = searchParams.get("limit");
    const scale = scaleRaw ? Number(scaleRaw) : undefined;
    const limit = limitRaw ? Number(limitRaw) : 50;

    const data = await queryJoshuaData({
      country,
      scale: Number.isFinite(scale) ? scale : undefined,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (error) {
    console.error("[joshua/data]", error);
    return NextResponse.json({ error: "Erro ao consultar Joshua Project" }, { status: 500 });
  }
}
