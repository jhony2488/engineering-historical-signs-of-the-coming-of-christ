import { NextResponse } from "next/server";

import { fetchAnalyticsSummary } from "@/lib/analytics/ga-data";

export async function GET() {
  const summary = await fetchAnalyticsSummary(7);
  return NextResponse.json(summary);
}
