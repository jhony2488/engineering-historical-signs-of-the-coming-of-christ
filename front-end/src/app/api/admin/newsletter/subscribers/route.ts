import { NextResponse } from "next/server";

import { getNewsletterStats, listActiveSubscribers } from "@/lib/db/newsletter";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, subscribers] = await Promise.all([
      getNewsletterStats(),
      listActiveSubscribers(),
    ]);

    return NextResponse.json({
      stats,
      subscribers: subscribers.map((row) => ({
        email: row.email,
        source: row.source,
        subscribed_at: row.subscribedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[admin/newsletter/subscribers]", error);
    return NextResponse.json({ error: "Erro ao listar inscritos" }, { status: 500 });
  }
}
