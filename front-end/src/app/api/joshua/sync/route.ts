import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api-guard";
import {
  fetchJoshuaFromApi,
  getJoshuaSeedRecords,
  upsertJoshuaRecords,
} from "@/lib/db/joshua";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || request.headers.get("x-joshua-sync-token");
  const expected = process.env.JOSHUA_SYNC_TOKEN || process.env.ADMIN_API_KEY;
  if (!expected) return process.env.NODE_ENV !== "production";
  return Boolean(token && token === expected);
}

export async function GET(request: Request) {
  const limited = withRateLimit(request);
  if (limited) return limited;

  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const apiKey = process.env.JOSHUA_API_KEY || "";
    let records = apiKey ? await fetchJoshuaFromApi(apiKey) : [];
    let source: "api" | "seed" = "api";
    if (!records.length) {
      records = getJoshuaSeedRecords();
      source = "seed";
    }
    const { upserted } = await upsertJoshuaRecords(records);
    return NextResponse.json({
      ok: true,
      source,
      upserted,
      collected_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[joshua/sync]", error);
    try {
      const { upserted } = await upsertJoshuaRecords(getJoshuaSeedRecords());
      return NextResponse.json({
        ok: true,
        source: "seed_fallback",
        upserted,
        warning: "API Joshua falhou; seed local aplicado",
      });
    } catch (e2) {
      console.error("[joshua/sync fallback]", e2);
      return NextResponse.json({ error: "Erro na sincronização Joshua" }, { status: 500 });
    }
  }
}
