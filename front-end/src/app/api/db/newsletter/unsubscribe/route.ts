import { NextResponse } from "next/server";

import { withNewsletterRateLimit } from "@/lib/api-guard";
import { unsubscribeNewsletter } from "@/lib/db/newsletter";
import { newsletterUnsubscribeSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = withNewsletterRateLimit(request);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = newsletterUnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  try {
    const ok = await unsubscribeNewsletter(parsed.data.token);
    if (!ok) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: "unsubscribed" });
  } catch (error) {
    console.error("[db/newsletter/unsubscribe]", error);
    return NextResponse.json({ error: "Não foi possível cancelar a inscrição" }, { status: 500 });
  }
}
